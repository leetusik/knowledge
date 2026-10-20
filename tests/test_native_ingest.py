"""Native ingest (P30.S5) — the very-core guarantees only.

* A native publish with violations is ONE 422 listing all of them (parser, image and
  reference findings together), with lines in the body as sent.
* A native publish round-trips: the stored file carries the assigned ids, a
  re-publish of the fetched source keeps them, a retired id is never minted again,
  search reads the projection (never an answer key), and reindex derives `native`
  from the header.
* A translation must keep its source's quiz item and option ids.
* `html -> native`: the old version stays readable, the old path still resolves, the
  new version is native, the book binding follows, and a DB rebuild agrees.
* The body limit is enforced per format.
* A private native document's read is a 404 (Postgres-gated).
"""
from __future__ import annotations

import base64
import io
import subprocess
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient
from PIL import Image

from server import db
from server import reindex as reindex_mod

_INDEX = "# Knowledge Base\n\n## Recent\n\n<!-- explain:recent -->\n\n## Browse\n"
_BOOK = {"slug": "guide", "title": "The guide", "kind": "codebase"}


def _git(root, *args):
    return subprocess.run(
        ["git", "-C", str(root), *args], capture_output=True, text=True, check=True
    )


@pytest.fixture
def client(tmp_path, monkeypatch):
    (tmp_path / "docs").mkdir()
    (tmp_path / "docs" / "index.md").write_text(_INDEX, encoding="utf-8")
    _git(tmp_path, "init")
    _git(tmp_path, "config", "user.name", "kb-test")
    _git(tmp_path, "config", "user.email", "kb-test@example.com")
    _git(tmp_path, "add", "docs/index.md")
    _git(tmp_path, "commit", "-m", "seed")
    monkeypatch.setenv("KB_ROOT", str(tmp_path))
    monkeypatch.setenv("KB_DB_PATH", str(tmp_path / "data" / "kb.sqlite3"))
    from server.main import app

    return TestClient(app), tmp_path


def _payload(**over):
    base = {
        "title": "Lanterns",
        "format": "native",
        "markdown": "## Intro\n\nPlain body.\n",
        "project": "lab",
        "tags": ["lanterns", "testing"],
        "source_repo": "acme/repo",
        "date": "2026-10-21",
        "slug": "lanterns",
    }
    base.update(over)
    return base


def _png() -> str:
    buf = io.BytesIO()
    Image.new("RGB", (4, 3), (9, 9, 9)).save(buf, "PNG")
    return base64.b64encode(buf.getvalue()).decode()


def _body(source: str) -> str:
    """A stored native file minus the server's header: what a re-explain re-sends."""
    lines = source.split("\n")
    end = lines.index("---", 1)
    return "\n".join(lines[end + 1:]).lstrip("\n")


def test_native_violations_are_one_422_list(client):
    tc, _ = client
    body = (
        "# A title heading\n"            # line 1: h1 is not allowed
        "\n"
        "Some <b>raw</b> html.\n"         # line 3: raw HTML
        "\n"
        "See [nowhere](#nope).\n"         # line 5: #id miss
        "\n"
        "![a lantern](asset:missing)\n"   # line 7: not one of this publish's assets
    )
    r = tc.post(
        "/api/documents",
        json=_payload(markdown=body, assets=[
            {"name": "bad", "media_type": "image/png", "content_base64": "%%%"},
        ]),
    )
    assert r.status_code == 422, r.text
    found = {(v["code"], v["line"]) for v in r.json()["detail"]}
    assert ("heading-level", 1) in found
    assert ("raw-html", 3) in found
    assert ("ref-missing-id", 5) in found
    assert ("ref-unknown-asset", 7) in found
    assert any(code == "asset-base64" for code, _ in found)
    for v in r.json()["detail"]:
        assert set(v) >= {"line", "col", "code", "message"}


def test_native_round_trip_keeps_ids_and_never_reuses_a_retired_one(client):
    tc, root = client
    body = (
        "## Getting started\n\nLanterns glow.\n\n"
        "## 한국어 절\n\nKorean section.\n\n"
        "See [the next chapter](chapter:guide/ch9).\n\n"
        "```quiz\nitems:\n"
        "  - {id: q1, type: recall, prompt: Why do zephyrlanterns glow, answer: Quokkafire}\n"
        "```\n"
    )
    r = tc.post("/api/documents", json=_payload(markdown=body, summary="A short lede."))
    assert r.status_code == 201, r.text
    out = r.json()
    assigned = {a["id"]: a["line"] for a in out["assigned_ids"]}
    assert assigned == {"getting-started": 1, "s-1": 5, "quiz-1": 11}
    assert [w["code"] for w in out["warnings"]] == ["ref-unresolved"]
    assert out["format"] == "native" and out["migrated_from"] is None

    rel = out["rel_path"]
    stored = (root / "docs" / rel).read_text(encoding="utf-8")
    assert "## Getting started {#getting-started}" in stored
    assert "## 한국어 절 {#s-1}" in stored and "```quiz #quiz-1" in stored
    assert "format: native\nsyntax: 1\n" in stored and 'summary: "A short lede."' in stored

    # The read carries the stored source; search reads the projection, which has the
    # quiz prompt but never its answer key.
    doc = tc.get(f"/api/documents/{out['id']}").json()
    assert doc["source"] == stored and "{#" not in doc["markdown"]
    assert tc.get("/api/search", params={"q": "zephyrlanterns"}).json()["total"] == 1
    assert tc.get("/api/search", params={"q": "quokkafire"}).json()["total"] == 0

    # A re-explain re-sends the fetched source: its ids are kept. The Korean section
    # is dropped and a new one added: its retired id s-1 is never minted again.
    v2_body = _body(doc["source"]).replace(
        "## 한국어 절 {#s-1}\n\nKorean section.", "## 새 절\n\nA new section."
    )
    r2 = tc.post("/api/documents", json=_payload(markdown=v2_body, new_version=True))
    assert r2.status_code == 201, r2.text
    assert r2.json()["version"] == 2 and r2.json()["rel_path"] == rel
    assert [a["id"] for a in r2.json()["assigned_ids"]] == ["s-2"]
    stored2 = (root / "docs" / rel).read_text(encoding="utf-8")
    assert "{#getting-started}" in stored2 and "#quiz-1" in stored2 and "{#s-2}" in stored2

    # Reindex derives `native` (and the source) from the header alone.
    conn = db.connect()
    try:
        conn.execute("UPDATE documents SET format = 'md', source = NULL, markdown = ''")
        conn.commit()
        reindex_mod.reindex(conn)
        row = db.get_document_by_path(conn, rel)
        assert row["format"] == "native" and row["source"] == stored2
        assert "Quokkafire" not in row["markdown"] and "zephyrlanterns" in row["markdown"]
        v1 = db.get_document_version(conn, rel, 1)
        assert v1["format"] == "native" and "{#s-1}" in v1["source"]
    finally:
        conn.close()


def test_translation_keeps_quiz_ids(client):
    tc, _ = client
    quiz = (
        "```quiz #check\nitems:\n"
        "  - id: q1\n    type: choice\n    prompt: Pick one\n"
        "    options:\n      - {id: a, text: A}\n      - {id: b, text: B}\n"
        "    answer: [a]\n    explain: Because.\n```\n"
    )
    chapter = {"key": "ch1", "position": 1}
    en = tc.post("/api/documents", json=_payload(
        markdown="## Intro {#intro}\n\nEnglish.\n\n" + quiz, book=_BOOK, chapter=chapter, lang="en",
    ))
    assert en.status_code == 201, en.text
    ko = dict(
        slug="lanterns-ko", book=_BOOK, chapter=chapter, lang="ko",
        translated_from={"lang": "en", "version": 1},
    )
    bad = tc.post("/api/documents", json=_payload(
        markdown="## 소개 {#intro}\n\n한국어.\n\n" + quiz.replace("{id: b, text: B}", "{id: c, text: B}"),
        **ko,
    ))
    assert bad.status_code == 422
    assert [v["code"] for v in bad.json()["detail"]] == ["translation-quiz-ids"]
    good = tc.post("/api/documents", json=_payload(markdown="## 소개 {#intro}\n\n한국어.\n\n" + quiz, **ko))
    assert good.status_code == 201, good.text
    assert good.json()["warnings"] == []


def test_html_to_native_migration_breaks_no_link(client):
    tc, root = client
    html = "<!DOCTYPE html><html><body><h1>Lanterns</h1><p>Old explainer.</p></body></html>"
    chapter = {"key": "ch1", "position": 1}
    v1 = tc.post("/api/documents", json=_payload(
        format="html", markdown=html, book=_BOOK, chapter=chapter, lang="en",
    ))
    assert v1.status_code == 201, v1.text
    old_rel, doc_id = v1.json()["rel_path"], v1.json()["id"]
    assert old_rel.endswith(".html")

    # The first native publish onto it, by its rel_path and with no book fields: the
    # migration, and the book binding follows the document.
    v2 = tc.post("/api/documents", json=_payload(
        markdown="## Intro\n\nNow native.\n", new_version=True, rel_path=old_rel,
    ))
    assert v2.status_code == 201, v2.text
    out = v2.json()
    new_rel = old_rel[: -len(".html")] + ".md"
    assert (out["id"], out["rel_path"], out["version"]) == (doc_id, new_rel, 2)
    assert out["migrated_from"] == old_rel and out["format"] == "native"
    assert not (root / "docs" / old_rel).exists()
    stem_dir = root / "docs" / ".versions" / old_rel[: -len(".html")]
    assert (stem_dir / "v0001.html").is_file()

    def check(where):
        # The old path still resolves (stem alias), to the native document.
        cur = tc.get(f"/api/documents/by-path/{old_rel}")
        assert cur.status_code == 200, where
        assert (cur.json()["id"], cur.json()["format"]) == (doc_id, "native"), where
        # The old version stays readable at its version route, by either path.
        for path in (old_rel, new_rel):
            hist = tc.get(f"/api/documents/by-path/{path}/versions").json()
            assert (hist["current_version"], [v["version"] for v in hist["versions"]]) == (2, [1]), where
            old = tc.get(f"/api/documents/by-path/{path}/versions/1").json()
            assert old["format"] == "html" and "Old explainer" in old["raw_html"], where
        # The book binding is intact, re-pointed to the document's new path.
        variants = tc.get("/api/books/lab/guide").json()["chapters"][0]["variants"]
        assert [(v["rel_path"], v["doc_id"], v["format"]) for v in variants] == [
            (new_rel, doc_id, "native")
        ], where

    check("after the publish")
    # Disk is canonical: a wiped DB rebuilds the same chain and binding.
    (root / "data" / "kb.sqlite3").unlink()
    conn = db.connect()
    try:
        reindex_mod.reindex(conn)
        doc_id = db.get_document_by_path(conn, new_rel)["id"]
    finally:
        conn.close()
    check("after a rebuild")

    # The commit moved the file and the manifest followed it.
    changed = _git(root, "show", "--no-renames", "--name-status", "--pretty=", "HEAD").stdout
    assert f"D\tdocs/{old_rel}" in changed and f"A\tdocs/{new_rel}" in changed
    assert "docs/.books/lab/guide.json" in changed

    # A chapter publish (book fields) is now an ordinary next version at the .md path;
    # a NEW html document may not take the migrated document's stem.
    v3 = tc.post("/api/documents", json=_payload(
        markdown="## Intro\n\nThird.\n", book=_BOOK, chapter=chapter, lang="en",
    ))
    assert (v3.status_code, v3.json()["rel_path"], v3.json()["version"]) == (201, new_rel, 3)
    clash = tc.post("/api/documents", json=_payload(format="html", markdown=html))
    assert clash.status_code == 409 and clash.json()["detail"]["rel_path"] == new_rel


def test_body_limit_per_format(client):
    tc, _ = client
    kb = 1024

    def post(fmt, size, slug):
        unit = "<p>x</p>\n" if fmt == "html" else "word "
        text = ("## Big\n\n" if fmt == "native" else "") + unit * (size // len(unit) + 1)
        return tc.post("/api/documents", json=_payload(format=fmt, markdown=text, slug=slug))

    for fmt, limit in (("md", 512 * kb), ("native", 512 * kb), ("html", 1024 * kb)):
        over = post(fmt, limit + 10, f"over-{fmt}")
        assert over.status_code == 422, fmt
        assert [v["code"] for v in over.json()["detail"]] == ["body-too-large"], fmt
    # Today's largest html explainer is about 113 KB: 600 KB of html still fits.
    assert post("html", 600 * kb, "fits-html").status_code == 201


# --- the read route (Postgres-gated: the accounts plane decides visibility) ----

from tests.test_documents_api import _project, _signup, documents_client  # noqa: E402,F401


def test_private_native_read_is_404(documents_client):
    client, _ = documents_client
    headers, tenant = _signup(client, f"native-{uuid4()}@example.com")
    _project(client, headers, "closed")  # stays private
    source = "---\ntitle: \"Shut\"\ndate: 2026-01-01\nformat: native\nsyntax: 1\n---\n\n## Hi {#hi}\n\nBody.\n"
    conn = db.connect()
    try:
        doc_id = db.upsert_document(
            conn, project="closed", slug="shut", date="2026-01-01", title="Shut", tags=[],
            source_repo="r", rel_path="closed/2026-01-01-shut.md", markdown="Hi\nBody.",
            format="native", source=source, tenant_id=tenant,
            assets={"fig": {"file": "a" * 64 + ".png", "media_type": "image/png",
                            "width": 1, "height": 1, "animated": False}},
        )
    finally:
        conn.close()

    mine = client.get(f"/app/documents/{doc_id}", headers=headers)
    assert mine.status_code == 200, mine.text
    assert mine.json()["format"] == "native" and mine.json()["source"] == source
    assert set(mine.json()["assets"]) == {"fig"}
    listed = client.get("/app/documents", headers=headers).json()["items"]
    assert listed and "source" not in listed[0]

    anon = client.get(f"/app/documents/{doc_id}")
    missing = client.get("/app/documents/99999999")
    assert anon.status_code == missing.status_code == 404
