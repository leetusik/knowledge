"""Listen's backend core (P41-sr.B1) — the core guarantees only.

1. **The queue:** two claims never get the same job (a row another transaction
   holds is skipped, not waited on); an expired lease is claimable again; the third
   failure fails the job and its unit.
2. **The upload:** write-once (the same bytes are idempotent, other bytes a 409),
   and only the holder of a live lease on the part may upload; a project-bound key
   is refused.
3. **The manifest:** editing one section's text changes only the key of the part
   holding it (no Postgres needed).

1 and 2 are Postgres-gated through ``tests/test_documents_api``'s harness, so they
skip without a disposable ``KB_TEST_DATABASE_URL``.
"""

from __future__ import annotations

import hashlib
from pathlib import Path
from types import SimpleNamespace
from uuid import uuid4

import pytest
from sqlalchemy import text

from server import db
from server.listen import manifest_for_source

from tests.test_documents_api import _project, _signup, documents_client  # noqa: F401

FIXTURE = Path(__file__).parent / "fixtures" / "listen" / "doc.md"


def _sha(value: str) -> str:
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


@pytest.fixture
def listen(documents_client, tmp_path, monkeypatch):
    """A member's started Listen on a four-part native document, and an org key."""

    import server.api_auth as api_auth

    monkeypatch.setenv("KB_ROOT", str(tmp_path))
    monkeypatch.delenv("KB_OPERATOR_EMAIL", raising=False)
    monkeypatch.setattr(api_auth, "_tenant_one_cache", None)
    monkeypatch.setenv("KB_LISTEN_PART_CAP_S", "15")
    client, engine = documents_client
    h, tenant = _signup(client, f"listen-{uuid4()}@example.com")
    conn = db.connect()
    try:
        db.upsert_document(
            conn, project="lab", slug="talk", date="2026-01-01", title="Listen fixture",
            tags=[], source_repo=None, rel_path="lab/2026-01-01-talk.md", markdown="Body.",
            format="native", version=1, tenant_id=tenant,
            source=FIXTURE.read_text(encoding="utf-8"),
        )
    finally:
        conn.close()
    key = client.post("/app/credentials", headers=h).json()["key"]
    body = {"org": tenant, "project": "lab", "doc": "2026-01-01-talk"}
    started = client.post("/app/listen/start", headers=h, json=body)
    assert started.status_code == 200, started.text
    return SimpleNamespace(
        client=client, engine=engine, h=h, r={"Authorization": f"Bearer {key}"},
        tenant=tenant, body=body, started=started.json(), root=tmp_path / "tenants" / tenant,
    )


def test_claim_lease_and_requeue(listen):
    c, r = listen.client, listen.r
    st = listen.started
    assert st["state"] == "making" and st["waiting"] is True
    assert st["part"] == {"n": 1, "of": 4, "chapter": None} and st["made"]["of"] == 4

    def claim():
        res = c.post("/api/listen/jobs/claim", headers=r)
        assert res.status_code == 200, res.text
        return res.json()

    # Reading order, and two claims never share a job.
    one, two = claim(), claim()
    assert one["segments"][0] == {"text": "Listen fixture"} and one["voice"] == "ming3-us_emma"
    assert one["job"] != two["job"] and one["part_key"] != two["part_key"]
    with listen.engine.connect() as conn:
        tx = conn.begin()
        held = conn.execute(text(
            "SELECT id FROM listen_jobs WHERE tenant_id = :t AND state = 'queued' "
            "ORDER BY priority LIMIT 1 FOR UPDATE"), {"t": listen.tenant}).scalar_one()
        three = claim()  # SKIP LOCKED: passed over, never waited on
        assert three["job"] not in (str(held), one["job"], two["job"])
        tx.rollback()

    # The Mac slept: an expired lease is claimable again, as a new attempt.
    with listen.engine.begin() as conn:
        conn.execute(text("UPDATE listen_jobs SET lease_until = now() - interval '1 second' "
                          "WHERE id = :j"), {"j": one["job"]})
    again = claim()
    assert again["job"] == one["job"] and again["attempt"] == 2
    assert c.post(f"/api/listen/jobs/{one['job']}/heartbeat", headers=r).status_code == 200

    # A failure re-queues the job until its third attempt; then the job and the unit fail.
    job = two["job"]
    for attempt in (1, 2, 3):
        res = c.post(f"/api/listen/jobs/{job}/fail", headers=r, json={"error": f"boom {attempt}"})
        assert res.status_code == 200, res.text
        assert res.json()["state"] == ("failed" if attempt == 3 else "queued")
        if attempt < 3:
            nxt = claim()
            assert nxt["job"] == job and nxt["attempt"] == attempt + 1
    assert c.post(f"/api/listen/jobs/{job}/heartbeat", headers=r).status_code == 409
    state = c.get("/app/listen/state", headers=listen.h, params=listen.body).json()
    assert state["state"] == "failed" and state["runner_last_seen"] is not None
    assert state["failure"] == {"kind": "voice", "part": {"n": 2, "of": 4}, "message": "boom 3",
                                "chapter": None}


def test_upload_is_write_once_and_needs_the_lease(listen):
    c, r = listen.client, listen.r
    job = c.post("/api/listen/jobs/claim", headers=r).json()
    key = job["part_key"]
    audio = b"\x00\x00\x00\x18ftypM4A " + bytes(range(64))

    def put(part_key, data, headers=r):
        return c.put(
            f"/api/listen/parts/{part_key}", content=data,
            headers={**headers, "Content-Type": "audio/mp4", "X-Audio-Seconds": "3.5",
                     "X-Content-SHA256": hashlib.sha256(data).hexdigest()},
        )

    # No lease, no upload: a part nobody claimed, or the claimed part from another key.
    with listen.engine.connect() as conn:
        unclaimed = conn.execute(text(
            "SELECT part_key FROM listen_jobs WHERE tenant_id = :t AND state = 'queued' LIMIT 1"),
            {"t": listen.tenant}).scalar_one()
    assert put(unclaimed, audio).status_code == 409
    other = c.post("/app/credentials", headers=listen.h).json()["key"]
    assert put(key, audio, headers={"Authorization": f"Bearer {other}"}).status_code == 409
    pid = _project(c, listen.h, "bound")
    bound = c.post(f"/app/projects/{pid}/credentials", headers=listen.h).json()["key"]
    assert c.post("/api/listen/jobs/claim",
                  headers={"Authorization": f"Bearer {bound}"}).status_code == 403

    # Write-once, under the content root's gitignored .audio/.
    first = put(key, audio)
    assert first.status_code == 201, first.text
    assert first.json()["file"] == f"{key}.m4a"
    stored = listen.root / ".audio" / f"{key}.m4a"
    assert stored.read_bytes() == audio
    assert (listen.root / ".audio" / ".gitignore").read_text().splitlines()[-1] == "*"
    assert put(key, audio).status_code == 200  # the same bytes: a success
    assert put(key, audio + b"!").status_code == 409  # other bytes: refused
    assert stored.read_bytes() == audio

    # Finish (seconds from the upload's header): the part is made and the state moves.
    done = c.post(f"/api/listen/jobs/{job['job']}/finish", headers=r, json={})
    assert done.status_code == 200, done.text
    st = c.get("/app/listen/state", headers=listen.h, params=listen.body).json()
    assert (st["made"]["parts"], st["len"], st["so_far"]) == (1, 3.5, True)
    assert st["part"]["n"] == 2


def test_manifest_keys_move_only_where_the_text_did():
    source = FIXTURE.read_text(encoding="utf-8")

    def build(text_: str, cap: float = 15.0):
        return manifest_for_source(text_, title="Listen fixture", lang="en", voice="v",
                                   profile="p", cap_seconds=cap)

    m = build(source)
    sections = [sorted({s["section"] or "" for s in p.segments}) for p in m.parts]
    assert sections == [[""], ["one"], ["two"], ["five", "four", "three"]]
    part = m.parts[1]
    assert part.hashes[0] == _sha(f"{part.segments[0]['text']}\nen\nv\np")
    assert part.key == _sha("\n".join(part.hashes) + "\np")

    edited = build(source.replace("in plain words.", "in plain terms."))
    assert [a == b for a, b in zip(m.keys, edited.keys)] == [True, True, False, True]

    # A section longer than the cap splits at its segments; small neighbours still merge.
    small = build(source, cap=4.0)
    assert [p.first for p in small.parts if p.segments[0]["section"] == "one"] == [3, 4, 5]
    assert sum(len(p.segments) for p in small.parts) == len(small.segments)
    assert sorted({s["section"] for s in small.parts[-1].segments}) == ["five", "four"]
