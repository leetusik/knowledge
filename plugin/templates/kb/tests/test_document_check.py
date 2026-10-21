"""`POST /api/documents/check` (P31.S1) — the very-core guarantees only.

* A check writes nothing: no document row, no file, no commit, no asset, no registry
  project and no usage event — and a real publish of the same body still succeeds
  afterwards (Postgres-gated: the registry and the meter live on the accounts plane).
* A check and a publish agree: for every native error fixture, a string 422 and a 409,
  the check answers the publish's own status and body (a body that publishes is a 200
  naming the same rel_path and version).
"""
from __future__ import annotations

import base64
import io
import subprocess
from pathlib import Path
from uuid import uuid4

import pytest
from PIL import Image
from sqlalchemy import text

from server import db
from tests.test_documents_api import _signup, documents_client  # noqa: F401
from tests.test_native_ingest import _body, _payload, client  # noqa: F401

FIXTURES = Path(__file__).parent / "fixtures" / "native"


def _git(root, *args):
    return subprocess.run(
        ["git", "-C", str(root), *args], capture_output=True, text=True, check=True
    ).stdout.strip()


def _files(root: Path) -> set[str]:
    """Every file under the content tree (the SQLite index and .git aside)."""
    return {
        str(p.relative_to(root))
        for p in root.rglob("*")
        if p.is_file() and not ({".git", "data"} & set(p.relative_to(root).parts))
    }


def _png() -> str:
    buf = io.BytesIO()
    Image.new("RGB", (4, 3), (9, 9, 9)).save(buf, "PNG")
    return base64.b64encode(buf.getvalue()).decode()


def test_a_check_writes_nothing(documents_client, tmp_path, monkeypatch):  # noqa: F811
    client, engine = documents_client
    root = tmp_path / "kb"
    (root / "docs").mkdir(parents=True)
    (root / "docs" / "index.md").write_text("# Knowledge Base\n", encoding="utf-8")
    _git(root, "init")
    _git(root, "config", "user.name", "kb-test")
    _git(root, "config", "user.email", "kb-test@example.com")
    _git(root, "add", "docs/index.md")
    _git(root, "commit", "-m", "seed")
    monkeypatch.setenv("KB_ROOT", str(root))
    headers, tenant = _signup(client, f"check-{uuid4()}@example.com")

    def counts() -> tuple[int, int]:
        with engine.connect() as conn:
            projects = conn.execute(
                text("SELECT count(*) FROM projects WHERE tenant_id = :t"), {"t": tenant}
            ).scalar_one()
            usage = conn.execute(
                text("SELECT count(*) FROM usage_events WHERE tenant_id = :t"), {"t": tenant}
            ).scalar_one()
        return projects, usage

    def docs() -> int:
        conn = db.connect()
        try:
            return conn.execute(
                "SELECT count(*) FROM documents WHERE tenant_id = ?", (tenant,)
            ).fetchone()[0]
        finally:
            conn.close()

    body = _payload(
        project=f"new-{uuid4().hex[:8]}",
        markdown="## Intro\n\nA lantern.\n\n![a lantern](asset:fig)\n",
        book={"slug": "guide", "title": "The guide", "kind": "codebase"},
        chapter={"key": "intro"},
        assets=[{"name": "fig", "media_type": "image/png", "content_base64": _png()}],
    )
    before = (_files(root), _git(root, "rev-parse", "HEAD"), counts(), docs())

    r = client.post("/api/documents/check", json=body, headers=headers)
    assert r.status_code == 200, r.text
    out = r.json()
    assert out["ok"] is True and out["version"] == 1 and out["format"] == "native"
    assert (out["book"], out["chapter_key"]) == ("guide", "intro")
    assert out["book_created"] is True and out["chapter_created"] is True

    assert (_files(root), _git(root, "rev-parse", "HEAD"), counts(), docs()) == before

    # The check consumed nothing: the publish lands exactly where it said.
    w = client.post("/api/documents", json=body, headers=headers)
    assert w.status_code == 201, w.text
    assert (w.json()["rel_path"], w.json()["version"]) == (out["rel_path"], 1)
    assert docs() == before[3] + 1 and counts()[0] == before[2][0] + 1


def _fixture_body(path: Path) -> str:
    raw = path.read_text(encoding="utf-8")
    return _body(raw) if raw.startswith("---\n") else raw


def test_check_and_publish_agree(client):  # noqa: F811
    tc, root = client
    cases = [
        (f"fixture-{p.stem}", _payload(markdown=_fixture_body(p), slug=p.stem))
        for p in sorted(FIXTURES.glob("err-*.md"))
    ]
    assert len(cases) >= 10
    cases.append(("bad-tags", _payload(tags=["Bad Tag"], slug="bad-tags")))
    seeded = _payload(slug="taken")
    assert tc.post("/api/documents", json=seeded).status_code == 201
    head = _git(root, "rev-parse", "HEAD")
    cases.append(("exists", seeded))

    seen = set()
    for name, payload in cases:
        checked = tc.post("/api/documents/check", json=payload)
        assert _git(root, "rev-parse", "HEAD") == head, name
        published = tc.post("/api/documents", json=payload)
        seen.add(published.status_code)
        if published.status_code == 201:
            assert checked.status_code == 200, (name, checked.text)
            assert checked.json()["rel_path"] == published.json()["rel_path"], name
            assert checked.json()["version"] == published.json()["version"], name
            head = _git(root, "rev-parse", "HEAD")
        else:
            assert checked.status_code == published.status_code, (name, checked.text)
            assert checked.json() == published.json(), name
    assert {201, 409, 422} <= seen
