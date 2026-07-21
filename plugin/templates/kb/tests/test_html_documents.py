"""HTML explainer docs (P16.S1): the write→reindex→read round trip over a temp git
repo, plus the session-guarded /app raw route (Postgres-gated, like test_documents_api).

The core invariant proved here: an html POST lands `.html` on disk with `<!--kb`
comment-frontmatter, the DB `markdown` column holds *extracted text* (script/style
absent) while `raw_html` holds the raw HTML, and a fresh-DB reindex reproduces both
byte-for-byte. Markdown docs stay additive-`format`-only (the existing suites are the
byte-exact regression guard)."""
from __future__ import annotations

import os
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, make_url, text

from server import db

_INDEX = "# Knowledge Base\n\n## Recent\n\n<!-- explain:recent -->\n\n## Browse\n"
_HTML_REL = "explainers/2026-07-21-binary-search.html"
_HTML_BODY = (
    "<!DOCTYPE html>\n"
    "<html><head><title>Quiz</title><style>.q{color:red}</style></head>\n"
    "<body>\n"
    "<h1>Binary Search Explained</h1>\n"
    "<p>Background paragraph about arrays.</p>\n"
    '<div class="quiz">Pick the correct answer.</div>\n'
    "<script>const SECRET_TOKEN='exfiltrate';function grade(){return 42;}</script>\n"
    "</body></html>\n"
)
_HTML_PAYLOAD = {
    "title": "Binary Search Explained",
    "markdown": _HTML_BODY,  # the body field carries the raw HTML for format=html
    "project": "explainers",
    "tags": ["algorithms", "search"],
    "source_repo": "acme/repo",
    "date": "2026-07-21",
    "slug": "binary-search",
    "format": "html",
    "commit": False,  # no git assertions here — the write path itself is not under test
}


@pytest.fixture
def client(tmp_path, monkeypatch):
    (tmp_path / "docs").mkdir()
    (tmp_path / "docs" / "index.md").write_text(_INDEX, encoding="utf-8")
    monkeypatch.setenv("KB_ROOT", str(tmp_path))
    monkeypatch.setenv("KB_DB_PATH", str(tmp_path / "data" / "kb.sqlite3"))
    from server.main import app  # imported after env is set

    return TestClient(app), tmp_path


def test_html_post_disk_db_and_projection(client):
    tc, root = client
    r = tc.post("/api/documents", json=_HTML_PAYLOAD)
    assert r.status_code == 201, r.text
    b = r.json()
    assert b["rel_path"] == _HTML_REL and b["format"] == "html"

    # On disk: comment-frontmatter head, then the raw doc starting at <!DOCTYPE html>.
    content = (root / "docs" / _HTML_REL).read_text(encoding="utf-8")
    assert content.startswith("<!--kb\n")
    assert 'title: "Binary Search Explained"' in content
    assert content.index("-->") < content.index("<!DOCTYPE html>")

    # /api/documents/{id}: `format` exposed, `raw_html` never in the JSON body, and
    # `markdown` is the extracted text — script/style content absent.
    got = tc.get(f"/api/documents/{b['id']}").json()
    assert got["format"] == "html" and "raw_html" not in got
    assert "Binary Search Explained" in got["markdown"]
    assert "Pick the correct answer" in got["markdown"]
    assert "SECRET_TOKEN" not in got["markdown"]
    assert "exfiltrate" not in got["markdown"]
    assert "color:red" not in got["markdown"]

    # DB row per the body rule: raw_html intact (keeps the script), markdown extracted.
    conn = db.connect()
    row = conn.execute(
        "SELECT format, markdown, raw_html FROM documents WHERE id = ?", (b["id"],)
    ).fetchone()
    conn.close()
    assert row["format"] == "html"
    assert row["raw_html"].startswith("<!DOCTYPE html>")
    assert "SECRET_TOKEN" in row["raw_html"]  # raw preserves the untrusted script
    assert "SECRET_TOKEN" not in row["markdown"]


def test_html_fresh_reindex_reproduces_row(client):
    tc, root = client
    doc_id = tc.post("/api/documents", json=_HTML_PAYLOAD).json()["id"]

    conn = db.connect()
    before = conn.execute(
        "SELECT markdown, raw_html FROM documents WHERE id = ?", (doc_id,)
    ).fetchone()
    before_md, before_raw = before["markdown"], before["raw_html"]
    conn.close()

    # Wipe the disposable DB and rebuild purely from disk — proves disk↔DB coherence.
    for suffix in ("", "-wal", "-shm"):
        p = root / "data" / f"kb.sqlite3{suffix}"
        if p.exists():
            p.unlink()
    from server import reindex

    result = reindex.reindex()
    assert result["indexed"] == 1  # the html doc (the auto-created landing index.md is a non-doc skip)
    assert _HTML_REL not in {s["rel_path"] for s in result["skipped"]}

    conn = db.connect()
    after = conn.execute(
        "SELECT format, markdown, raw_html FROM documents WHERE rel_path = ?", (_HTML_REL,)
    ).fetchone()
    conn.close()
    assert after["format"] == "html"
    assert after["markdown"] == before_md  # identical extracted text
    assert after["raw_html"] == before_raw  # identical raw HTML


def test_html_fts_indexes_extracted_text_only(client):
    tc, _ = client
    tc.post("/api/documents", json=_HTML_PAYLOAD)
    # A visible-text term matches (indexed via the extracted `markdown`).
    hit = tc.get("/api/search", params={"q": "background"}).json()
    assert "Binary Search Explained" in [h["title"] for h in hit["results"]]
    # A term that lives only in the <script> is never indexed.
    assert tc.get("/api/search", params={"q": "exfiltrate"}).json()["total"] == 0


def test_markdown_doc_stays_additive_format(client):
    tc, _ = client
    md = {
        "title": "Plain Note",
        "markdown": "# Plain Note\n\nBody text.\n",
        "project": "explainers",
        "tags": ["alpha", "beta"],
        "source_repo": "acme/repo",
        "date": "2026-07-21",
        "slug": "plain-note",
        "commit": False,
    }
    r = tc.post("/api/documents", json=md)
    assert r.status_code == 201
    b = r.json()
    assert b["format"] == "md" and b["rel_path"].endswith(".md")  # default, additive
    got = tc.get(f"/api/documents/{b['id']}").json()
    assert got["format"] == "md" and "raw_html" not in got
    # Bad format value -> free 422 from the Literal.
    bad = tc.post("/api/documents", json={**md, "slug": "plain-note-2", "format": "pdf"})
    assert bad.status_code == 422


def test_validate_related_accepts_html():
    from server import documents

    assert documents.validate_related(["p/2026-01-01-a.html"]) == ["p/2026-01-01-a.html"]
    assert documents.validate_related(["p/2026-01-01-a.md"]) == ["p/2026-01-01-a.md"]
    with pytest.raises(documents.ConventionError):
        documents.validate_related(["p/2026-01-01-a.txt"])


# --- /app raw route: Postgres-gated authed fixture (mirrors test_documents_api) ---

_RAW_DSN = os.environ.get("KB_TEST_DATABASE_URL") or os.environ.get("DATABASE_URL")


def _url(raw: str) -> str:
    return (
        make_url(raw).set(drivername="postgresql+psycopg").render_as_string(hide_password=False)
    )


@pytest.fixture
def documents_client(tmp_path, monkeypatch):
    """A TestClient over a Postgres accounts plane + throwaway SQLite, or skip."""
    if not _RAW_DSN:
        pytest.skip(
            "set KB_TEST_DATABASE_URL (or DATABASE_URL) to a disposable Postgres to "
            "run the /app raw-route test"
        )
    url = _url(_RAW_DSN)
    sync_engine = create_engine(url)
    try:
        with sync_engine.connect() as conn:
            conn.execute(text("SELECT 1"))
    except Exception as exc:  # pragma: no cover - environment dependent
        sync_engine.dispose()
        pytest.skip(f"Postgres at the test DSN is unreachable: {exc}")

    from server.persistence.base import Base
    from server.persistence import models  # noqa: F401 - registers the tables

    Base.metadata.create_all(sync_engine, checkfirst=True)

    monkeypatch.setenv("KB_DB_PATH", str(tmp_path / "data" / "kb.sqlite3"))
    monkeypatch.setenv("DATABASE_URL", url)
    import server.persistence.engine as engine_mod

    engine_mod._engine = None
    engine_mod._session_maker = None
    from server.main import app

    with TestClient(app) as client:
        yield client
    engine_mod._engine = None
    engine_mod._session_maker = None
    sync_engine.dispose()


def _signup(client, email):
    res = client.post("/auth/signup", json={"email": email, "password": "hunter2pass"})
    assert res.status_code == 201, res.text
    body = res.json()
    return {"Authorization": f"Bearer {body['token']}"}, body["tenant"]["id"]


def _seed(tenant_id, *, slug, fmt, raw_html):
    conn = db.connect()
    try:
        return db.upsert_document(
            conn,
            project="explainers",
            slug=slug,
            date="2026-07-21",
            title=f"Doc {slug}",
            tags=["a", "b"],
            source_repo="acme/repo",
            rel_path=f"explainers/2026-07-21-{slug}.{'html' if fmt == 'html' else 'md'}",
            markdown="binary search extracted text",
            related=[],
            format=fmt,
            raw_html=raw_html,
            tenant_id=tenant_id,
        )
    finally:
        conn.close()


def test_raw_route_serves_html_and_404s_for_md(documents_client):
    client = documents_client
    headers, tenant = _signup(client, f"raw-{uuid4()}@example.com")
    html_id = _seed(tenant, slug="html-doc", fmt="html", raw_html=_HTML_BODY)
    md_id = _seed(tenant, slug="md-doc", fmt="md", raw_html=None)

    r = client.get(f"/app/documents/{html_id}/raw", headers=headers)
    assert r.status_code == 200
    assert r.headers["content-type"].startswith("text/html")
    assert r.headers["content-security-policy"] == "sandbox allow-scripts; frame-ancestors 'self'"
    assert r.headers["x-frame-options"] == "SAMEORIGIN"
    assert r.headers["x-content-type-options"] == "nosniff"
    assert r.headers["cache-control"] == "no-store"
    assert "<!DOCTYPE html>" in r.text and "SECRET_TOKEN" in r.text

    # An md doc has no raw HTML -> 404; the detail projection never leaks raw_html.
    assert client.get(f"/app/documents/{md_id}/raw", headers=headers).status_code == 404
    detail = client.get(f"/app/documents/{html_id}", headers=headers).json()
    assert detail["format"] == "html" and "raw_html" not in detail
    # Unauthenticated -> 401 (session-guarded like every /app route).
    assert client.get(f"/app/documents/{html_id}/raw").status_code == 401
