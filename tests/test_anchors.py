"""Re-anchoring (P30.S9) — core test 3 (P29 *S3 build inputs*) and its write-back guarantee.

1. **The ladder** over a two-version fixture (``tests/fixtures/anchors/``): exact,
   fuzzy (a hit at >= 0.8 and a miss below it), moved, ``block`` and ``orphan``;
   and language mapping by id with the nearest-preceding fallback. Pure: no DB.
2. **The write-back** (Postgres-gated): a read of the current version writes back
   ``anchor_status``/``anchored_version`` for the reader's own rows only; it never
   deletes a row, never rewrites the captured anchor, never changes another user's
   row, writes nothing on an old-version read, and is idempotent. Orphans come
   back in their own group; other-language marks map onto the variant by id; a
   legacy bookmark is approximate and restores by id after ``html -> native``.
"""

from __future__ import annotations

import json
from pathlib import Path
from uuid import uuid4

import pytest
from sqlalchemy import text

from server import anchors, db
from server.native import parse_chapter, sections

from tests.test_documents_api import _project, _signup, documents_client  # noqa: F401
from tests.test_reader_state import _key, reader  # noqa: F401

FIXTURES = Path(__file__).parent / "fixtures" / "anchors"


def _source(name: str) -> str:
    return (FIXTURES / name).read_text(encoding="utf-8")


def _sections(name: str) -> list[dict]:
    return sections(parse_chapter(_source(name)).tree)


def _capture(secs: list[dict], block_id: str, exact: str) -> dict:
    """The anchor the browser captures: the quote plus up to 32 characters either side."""

    body = next(s["text"] for s in secs if s["id"] == block_id)
    start = body.index(exact)
    end = start + len(exact)
    return {"exact": exact, "prefix": body[max(0, start - 32):start],
            "suffix": body[end:end + 32], "start": start, "end": end}


CASES = json.loads((FIXTURES / "cases.json").read_text(encoding="utf-8"))


@pytest.mark.parametrize("case", CASES["cases"], ids=lambda c: c["name"])
def test_ladder_across_a_version(case):
    old, new = _sections(CASES["from"]), _sections(CASES["to"])
    quote = _capture(old, case["block_id"], case["exact"]) if case["exact"] else None

    # On the version it was made on, an anchor is exact, at the same offsets.
    same = anchors.resolve(case["block_id"], quote, old)
    assert same.status == "anchored" and same.block_id == case["block_id"]
    if quote:
        assert (same.method, same.start, same.end) == ("exact", quote["start"], quote["end"])

    got = anchors.resolve(case["block_id"], quote, new)
    want = case["expect"]
    assert (got.status, got.method, got.block_id) == (want["status"], want["method"], want["block_id"])
    if "text" in want:
        body = next(s["text"] for s in new if s["id"] == got.block_id)
        assert body[got.start:got.end] == want["text"]
    else:
        assert got.start is None and got.end is None
    assert anchors.resolve(case["block_id"], quote, new) == got  # deterministic


def test_fuzzy_threshold_is_point_eight_on_quote_and_context():
    secs = [{"id": "s", "text": "lead abcdeXXhij tail"}]
    # 2 edits in 10 characters: exactly 0.8 on the quote, more with the context: a hit.
    hit = anchors.resolve("s", {"exact": "abcdefghij", "prefix": "lead ", "suffix": " tail"}, secs)
    assert (hit.method, secs[0]["text"][hit.start:hit.end]) == ("fuzzy", "abcdeXXhij")
    assert anchors.similarity("abcdefghij", "abcdeXXhij") == anchors.THRESHOLD
    # 3 edits in 10: 0.7, a miss, so the annotation stays on its section as `block`.
    secs = [{"id": "s", "text": "lead abcdXXXhij tail"}]
    miss = anchors.resolve("s", {"exact": "abcdefghij", "prefix": "lead ", "suffix": " tail"}, secs)
    assert (miss.status, miss.block_id) == ("block", "s")
    # The context alone cannot carry a short, changed quote onto other words.
    secs = [{"id": "s", "text": "the same long context on the left XYZ the same long context on the right"}]
    quote = {"exact": "abc", "prefix": "the same long context on the left ",
             "suffix": " the same long context on the right"}
    assert anchors.resolve("s", quote, secs).status == "block"


@pytest.mark.parametrize("case", CASES["language"]["cases"], ids=lambda c: c["name"])
def test_language_maps_by_id_with_nearest_preceding_fallback(case):
    lang = CASES["language"]
    source = [s["id"] for s in _sections(lang["source"])]
    target = [s["id"] for s in _sections(lang["target"])]
    assert anchors.map_id(case["block_id"], source, target) == tuple(case["expect"])


# -- the write-back through the API (Postgres-gated) ------------------------------------


def _doc(tenant, project, slug, source, *, version=1, lang=None, fmt="native") -> tuple[int, str]:
    date = "2026-02-01"
    conn = db.connect()
    try:
        doc_id = db.upsert_document(
            conn, project=project, slug=slug, date=date, title=slug, tags=[], source_repo=None,
            rel_path=f"{project}/{date}-{slug}.{'html' if fmt == 'html' else 'md'}",
            markdown="x", format=fmt, version=version, tenant_id=tenant, lang=lang,
            source=source if fmt == "native" else None,
            raw_html="<p>x</p>" if fmt == "html" else None,
        )
    finally:
        conn.close()
    return doc_id, f"{date}-{slug}"


def _publish_v2(tenant, project, doc, source_v1, source_v2):
    """A new version: archive v1, make v2 current (what S5's write path leaves behind)."""

    rel = f"{project}/{doc}.md"
    conn = db.connect()
    try:
        db.upsert_document_version(
            conn, rel_path=rel, version=1, archive_path=f".versions/{doc}.v1.md", title=doc,
            date="2026-02-01", tags=[], markdown="x", format="native", tenant_id=tenant,
            source=source_v1,
        )
        conn.execute(
            "UPDATE documents SET version = 2, source = ? WHERE rel_path = ? AND tenant_id = ?",
            (source_v2, rel, tenant),
        )
        conn.commit()
    finally:
        conn.close()


def _annotate(client, h, key, secs, block_id, exact=None, note=None) -> str:
    body = {"id": str(uuid4()), **key, "block_id": block_id, "note": note}
    if exact:
        body["quote"] = _capture(secs, block_id, exact)
    r = client.post("/app/reader/annotations", headers=h, json=body)
    assert r.status_code == 201, r.text
    return body["id"]


def _rows(engine, tenant, doc) -> dict[str, tuple]:
    with engine.connect() as conn:
        rows = conn.execute(text(
            "SELECT id, anchor_status, anchored_version, block_id, quote, updated_at "
            "FROM reader_annotations WHERE tenant_id = :t AND doc = :d"), {"t": tenant, "d": doc}
        ).all()
    return {str(r.id): tuple(r[1:]) for r in rows}


def test_writeback_is_own_rows_only_and_never_deletes(reader):
    client, engine = reader
    a, tenant = _signup(client, f"aa-{uuid4()}@example.com")
    b, _ = _signup(client, f"ab-{uuid4()}@example.com")
    pid = _project(client, a, "pub")
    assert client.patch(f"/app/projects/{pid}", json={"visibility": "public"}, headers=a).status_code == 200
    v1, v2 = _source("chapter-v1.md"), _source("chapter-v2.md")
    secs = _sections("chapter-v1.md")
    _, doc = _doc(tenant, "pub", "lantern", v1)
    key = _key(tenant, "pub", doc)

    ids = {
        "exact": _annotate(client, a, key, secs, "overview", "flame behind thin glass"),
        "moved": _annotate(client, a, key, secs, "fuel", "Kerosene replaced it after 1860"),
        "block": _annotate(client, a, key, secs, "fuel", "Whale oil burned bright but smelled of the sea"),
        "orphan": _annotate(client, a, key, secs, "lenses", "Fresnel lens bends the light", note="keep me"),
    }
    theirs = _annotate(client, b, key, secs, "lenses", "Fresnel lens bends the light")
    bm = client.post("/app/reader/bookmarks", headers=a,
                     json={"id": str(uuid4()), **key, "anchor": {"block_id": "lenses"}, "snippet": "s"})
    assert bm.status_code == 201, bm.text
    before = _rows(engine, tenant, doc)

    _publish_v2(tenant, "pub", doc, v1, v2)
    got = client.get(f"/app/reader/docs/{tenant}/pub/{doc}", headers=a)
    assert got.status_code == 200, got.text
    body = got.json()
    by_id = {x["id"]: x for x in body["annotations"] + body["unanchored"]}
    assert {k: by_id[v]["anchor"]["method"] for k, v in ids.items()} == {
        "exact": "exact", "moved": "moved", "block": "block", "orphan": "orphan"}
    assert [x["id"] for x in body["unanchored"]] == [ids["orphan"]]  # kept, in its own group
    assert body["unanchored"][0]["note"] == "keep me"
    assert by_id[ids["moved"]]["anchor"]["block_id"] == "keepers"
    # The bookmark's retired section falls back to the nearest preceding one.
    assert body["bookmarks"][0]["place"] == {"block_id": "fuel", "exact": False,
                                             "fraction": None, "section_index": 1}

    after = _rows(engine, tenant, doc)
    assert set(after) == set(before)  # nothing deleted
    status = {k: after[v][:2] for k, v in ids.items()}
    assert status == {"exact": ("anchored", 2), "moved": ("anchored", 2),
                      "block": ("block", 1), "orphan": ("orphan", 1)}
    for rid, row in after.items():  # the captured anchor and updated_at never change
        assert row[2:] == before[rid][2:]
    assert after[theirs][:2] == ("anchored", 1)  # another user's row is untouched

    # Idempotent: a second read writes nothing new.
    client.get(f"/app/reader/docs/{tenant}/pub/{doc}", headers=a)
    assert _rows(engine, tenant, doc) == after
    # An old-version read resolves for v1 (all exact again) and writes nothing.
    old = client.get(f"/app/reader/docs/{tenant}/pub/{doc}?v=1", headers=a).json()
    assert {x["anchor"]["method"] for x in old["annotations"]} == {"exact"} and old["unanchored"] == []
    assert _rows(engine, tenant, doc) == after
    # The loose document's list: the same statuses, the orphan apart; B's row still untouched.
    listed = client.get(f"/app/reader/annotations?org={tenant}&project=pub&doc={doc}", headers=a).json()
    assert [x["id"] for x in listed["unanchored"]] == [ids["orphan"]]
    assert len(listed["annotations"]) == 3
    assert _rows(engine, tenant, doc)[theirs][:2] == ("anchored", 1)


def test_other_language_marks_map_by_id_and_legacy_bookmarks_are_approximate(reader):
    client, _ = reader
    a, tenant = _signup(client, f"al-{uuid4()}@example.com")
    _project(client, a, "lab")
    bearer = {"Authorization": f"Bearer {client.post('/app/credentials', headers=a).json()['key']}"}
    secs = _sections("chapter-v1.md")
    _, en = _doc(tenant, "lab", "lantern", _source("chapter-v1.md"), lang="en")
    _, ko = _doc(tenant, "lab", "lantern-ko", _source("chapter-ko.md"), lang="ko")
    manifest = {"title": "Lights", "kind": "codebase", "commit": False, "chapters": [
        {"key": "ch1", "position": 1, "variants": {"en": f"lab/{en}.md", "ko": f"lab/{ko}.md"}}]}
    assert client.put("/api/books/lab/lights", json=manifest, headers=bearer).status_code in (200, 201)
    en_key = _key(tenant, "lab", en)
    _annotate(client, a, en_key, secs, "lenses", "Fresnel lens bends the light")
    _annotate(client, a, en_key, secs, "overview", "flame behind thin glass")
    r = client.put("/app/reader/positions", headers=a, json={**en_key, "fraction": 0.6, "anchor_id": "lenses"})
    assert r.status_code == 200, r.text

    chapter = client.get(f"/app/reader/chapters/{tenant}/lab/lights/ch1?lang=ko", headers=a).json()
    assert chapter["annotations"] == [] and chapter["unanchored"] == []  # never painted on ko
    marks = chapter["other_languages"]["annotations"]
    assert [(m["lang"], m["section"]["block_id"], m["section"]["exact"]) for m in marks] == [
        ("en", "overview", True), ("en", "fuel", False)]
    assert all(m["other_language"] and m["anchor"]["status"] == "anchored" for m in marks)
    assert chapter["resume"]["block_id"] == "fuel" and chapter["resume"]["exact"] is False

    # A legacy chapter's bookmarks, after html -> native: approximate, restored by id when present.
    doc_id, legacy = _doc(tenant, "lab", "old-light", None, fmt="html")
    lkey = _key(tenant, "lab", legacy)
    for anchor in ({"fraction": 0.3, "anchor": "fuel"}, {"fraction": 0.7, "anchor": "gone"}):
        r = client.post("/app/reader/bookmarks", headers=a,
                        json={"id": str(uuid4()), **lkey, "anchor": anchor, "snippet": "s"})
        assert r.status_code == 201, r.text
    conn = db.connect()
    try:
        conn.execute(
            "UPDATE documents SET format = 'native', rel_path = ?, source = ?, version = 2 WHERE id = ?",
            (f"lab/{legacy}.md", _source("chapter-v1.md"), doc_id),
        )
        conn.commit()
    finally:
        conn.close()
    marks = client.get(f"/app/reader/docs/{tenant}/lab/{legacy}", headers=a).json()["bookmarks"]
    assert [(m["approx"], m["place"]["block_id"], m["place"]["fraction"]) for m in marks] == [
        (True, "fuel", 0.3), (True, None, 0.7)]
