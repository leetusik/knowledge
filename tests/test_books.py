"""Books and chapters (P30.S2): the core invariants only.

* a chapter publish places the variant, and the manifest, the derived tables and
  search agree (and the manifest rides in the chapter's own commit);
* reindex from an empty DB reproduces the book tables exactly;
* PUT refuses a binding to a document that does not exist or is in another project;
* a loose publish that sends no new field is byte-for-byte today's;
* a public book route on a private project is a 404 (Postgres-gated);
* a slug-less tenant's book is addressed on its tenant id (P30.S11, OQ26).
"""
from __future__ import annotations

import json
import subprocess
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient

from server import db, reindex

_INDEX = "# Knowledge Base\n\n## Recent\n\n<!-- explain:recent -->\n\n## Browse\n"


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
        "title": "P8: The reader",
        "markdown": "# P8: The reader\n\nZebracorn chapter body.\n",
        "project": "knowledge",
        "tags": ["reader", "books"],
        "source_repo": "knowledge",
        "date": "2026-10-01",
        "slug": "p8-the-reader",
    }
    base.update(over)
    return base


_BOOK = {"slug": "phases", "title": "knowledge, phase by phase", "kind": "codebase"}


def _dump_book_tables(conn):
    return {
        t: [tuple(r) for r in conn.execute(f"SELECT * FROM {t} ORDER BY 1, 2, 3, 4").fetchall()]
        for t in ("books", "chapters", "chapter_variants")
    }


def test_chapter_publish_places_variant_and_index_agrees(client):
    tc, root = client
    r = tc.post(
        "/api/documents",
        json=_payload(
            book=_BOOK,
            chapter={"key": "p8", "position": 8, "source": {"phase": "P8"}},
            lang="en",
        ),
    )
    assert r.status_code == 201, r.text
    en = r.json()
    assert (en["book"], en["chapter_key"], en["lang"]) == ("phases", "p8", "en")
    assert en["book_created"] is True and en["chapter_created"] is True
    assert en["manifest_path"] == ".books/knowledge/phases.json"
    # The manifest travels in the chapter's own scoped commit.
    names = set(
        _git(root, "diff-tree", "--no-commit-id", "--name-only", "-r", "HEAD").stdout.split()
    )
    assert f"docs/{en['manifest_path']}" in names and f"docs/{en['rel_path']}" in names

    # A second language joins the same chapter as its own document.
    r = tc.post(
        "/api/documents",
        json=_payload(
            title="P8: 리더",
            slug="p8-the-reader-ko",
            book=_BOOK,
            chapter={"key": "p8"},
            lang="ko",
            translated_from={"lang": "en", "version": 1},
        ),
    )
    assert r.status_code == 201, r.text
    ko = r.json()
    assert ko["chapter_created"] is False and ko["book_created"] is False
    ko_file = (root / "docs" / ko["rel_path"]).read_text(encoding="utf-8")
    assert "\nlang: ko\n" in ko_file and "translated_from:\n  lang: en\n  version: 1\n" in ko_file

    # Re-publishing (book, key, lang) is that variant's next version: same rel_path,
    # whatever date/slug the request computes, with no new_version flag.
    r = tc.post(
        "/api/documents",
        json=_payload(date="2026-10-05", slug="renamed", book=_BOOK, chapter={"key": "p8"}, lang="en"),
    )
    assert r.status_code == 201, r.text
    assert r.json()["rel_path"] == en["rel_path"] and r.json()["version"] == 2

    manifest = json.loads((root / "docs" / en["manifest_path"]).read_text(encoding="utf-8"))
    assert manifest == {
        "slug": "phases",
        "title": "knowledge, phase by phase",
        "kind": "codebase",
        "subject": None,
        "description": None,
        "chapters": [
            {
                "key": "p8",
                "position": 8,
                "variants": {"en": en["rel_path"], "ko": ko["rel_path"]},
                "source": {"phase": "P8"},
            }
        ],
    }

    # The derived tables (via the route) agree with the manifest.
    book = tc.get("/api/books/knowledge/phases").json()
    assert [c["key"] for c in book["chapters"]] == ["p8"]
    variants = {v["lang"]: v for v in book["chapters"][0]["variants"]}
    assert {k: v["rel_path"] for k, v in variants.items()} == manifest["chapters"][0]["variants"]
    assert variants["en"]["doc_id"] == en["id"] and variants["en"]["version"] == 2
    assert variants["ko"]["translated_from"] == {"lang": "en", "version": 1}
    assert tc.get("/api/books", params={"project": "knowledge"}).json()["items"][0]["chapter_count"] == 1

    # Search hits carry the binding; a loose document carries nulls.
    tc.post("/api/documents", json=_payload(title="Loose zebracorn", slug="loose", date="2026-09-01"))
    hits = {h["slug"]: h for h in tc.get("/api/search", params={"q": "zebracorn"}).json()["results"]}
    assert (hits["p8-the-reader"]["book"], hits["p8-the-reader"]["chapter_key"], hits["p8-the-reader"]["lang"]) == ("phases", "p8", "en")
    assert (hits["loose"]["book"], hits["loose"]["chapter_key"], hits["loose"]["lang"]) == (None, None, None)


def test_reindex_from_empty_db_reproduces_book_tables(client, tmp_path):
    tc, root = client
    for lang, slug in (("en", "a-en"), ("ko", "a-ko")):
        r = tc.post(
            "/api/documents",
            json=_payload(slug=slug, book=_BOOK, chapter={"key": "a", "title": "A"}, lang=lang),
        )
        assert r.status_code == 201, r.text
    r = tc.post("/api/documents", json=_payload(slug="b", book=_BOOK, chapter={"key": "b", "position": 2.5}))
    assert r.status_code == 201, r.text

    conn = db.connect()
    before = _dump_book_tables(conn)
    conn.close()
    assert len(before["chapter_variants"]) == 3

    db_file = tmp_path / "data" / "kb.sqlite3"
    for suffix in ("", "-wal", "-shm"):
        (db_file.parent / (db_file.name + suffix)).unlink(missing_ok=True)
    report = reindex.reindex()
    assert report["books_indexed"] == 1 and report["books_removed"] == 0

    conn = db.connect()
    assert _dump_book_tables(conn) == before
    conn.close()

    # A manifest removed from disk takes its rows with it on the next reindex.
    (root / "docs" / ".books" / "knowledge" / "phases.json").unlink()
    report = reindex.reindex()
    assert report["books_removed"] == 1
    conn = db.connect()
    assert all(rows == [] for rows in _dump_book_tables(conn).values())
    conn.close()


def test_put_refuses_missing_or_foreign_documents(client):
    tc, _root = client
    mine = tc.post("/api/documents", json=_payload(slug="mine")).json()
    other = tc.post("/api/documents", json=_payload(slug="theirs", project="elsewhere")).json()

    def put(variants):
        return tc.put(
            "/api/books/knowledge/guide",
            json={"title": "Guide", "kind": "codebase",
                  "chapters": [{"key": "one", "position": 1, "variants": variants}]},
        )

    # A document that does not exist is refused, and nothing is written.
    r = put({"en": "knowledge/2026-10-01-nope.md"})
    assert r.status_code == 422, r.text
    assert r.json()["detail"]["missing"] == ["knowledge/2026-10-01-nope.md"]
    # A document of another project is refused before anything else (a book never
    # spans projects).
    assert put({"en": other["rel_path"]}).status_code == 422
    assert tc.get("/api/books/knowledge/guide").status_code == 404

    r = put({"en": mine["rel_path"]})
    assert r.status_code == 200, r.text
    assert r.json()["created"] is True
    assert r.json()["chapters"][0]["variants"][0]["doc_id"] == mine["id"]
    # The same document cannot join a second book.
    r = tc.put(
        "/api/books/knowledge/other",
        json={"title": "Other", "kind": "codebase",
              "chapters": [{"key": "x", "position": 1, "variants": {"en": mine["rel_path"]}}]},
    )
    assert r.status_code == 409, r.text


def test_loose_publish_without_new_fields_is_unchanged(client):
    """The regression pin: no book field -> the pre-P30 file, commit and response."""
    tc, root = client
    r = tc.post("/api/documents", json=_payload(slug="plain"))
    assert r.status_code == 201, r.text
    body = r.json()
    assert set(body) == {
        "id", "rel_path", "url", "title", "project", "slug", "date", "tags", "related",
        "format", "version", "previous_version", "archived_path", "recent_updated",
        "landing_created", "committed", "commit_sha", "pushed", "push_pending",
    }
    assert (root / "docs" / body["rel_path"]).read_text(encoding="utf-8") == (
        "---\n"
        'title: "P8: The reader"\n'
        "date: 2026-10-01\n"
        "tags:\n  - reader\n  - books\n"
        "source:\n  project: knowledge\n  repo: knowledge\n"
        "---\n\n"
        "# P8: The reader\n\nZebracorn chapter body.\n"
    )
    names = set(
        _git(root, "diff-tree", "--no-commit-id", "--name-only", "-r", "HEAD").stdout.split()
    )
    assert names == {f"docs/{body['rel_path']}", "docs/index.md", "docs/knowledge/index.md"}
    assert not (root / "docs" / ".books").exists()


# --- the public book route (Postgres-gated, like every /app/orgs read) ----------

from tests.test_documents_api import _project, _signup, documents_client  # noqa: E402,F401


def _seed_books(tenant: str) -> None:
    conn = db.connect()
    try:
        for project in ("shelf", "secret"):
            rel = f"{project}/2026-01-01-ch1.md"
            db.upsert_document(
                conn, project=project, slug="ch1", date="2026-01-01", title="Chapter one",
                tags=[], source_repo="r", rel_path=rel, markdown="body", tenant_id=tenant,
            )
            db.replace_book(
                conn, tenant_id=tenant, project=project,
                manifest={"slug": "intro", "title": "Intro", "kind": "codebase",
                          "subject": None, "description": None,
                          "chapters": [{"key": "ch1", "position": 1, "variants": {"en": rel}}]},
                manifest_path=f".books/{project}/intro.json",
            )
    finally:
        conn.close()


def _tenant_with_books(client) -> tuple[dict[str, str], str]:
    headers, tenant = _signup(client, f"books-{uuid4()}@example.com")
    pub = _project(client, headers, "shelf")
    _project(client, headers, "secret")  # stays private
    assert client.patch(
        f"/app/projects/{pub}", json={"visibility": "public"}, headers=headers
    ).status_code == 200
    _seed_books(tenant)
    return headers, tenant


def test_public_book_route_is_404_on_a_private_project(documents_client):
    client, _ = documents_client
    headers, tenant = _tenant_with_books(client)
    org = f"org-{uuid4().hex[:10]}"
    assert client.patch("/app/tenant", json={"slug": org}, headers=headers).status_code == 200

    # Anonymous: the public project's book reads; the private one is the same 404
    # as a book that does not exist (never a 403).
    ok = client.get(f"/app/orgs/{org}/shelf/books/intro")
    assert ok.status_code == 200, ok.text
    assert ok.json()["chapters"][0]["variants"][0]["title"] == "Chapter one"
    assert "tenant_id" not in ok.json()
    priv = client.get(f"/app/orgs/{org}/secret/books/intro")
    missing = client.get(f"/app/orgs/{org}/secret/books/nope")
    assert priv.status_code == missing.status_code == 404
    assert priv.json() == missing.json()

    # The member reads their own private book.
    assert client.get(f"/app/orgs/{org}/secret/books/intro", headers=headers).status_code == 200
    assert client.get("/app/books/secret/intro", headers=headers).status_code == 200


def test_slugless_tenant_book_is_addressed_on_its_tenant_id(documents_client):
    """P30.S11 (OQ26): `org` is the slug, or the tenant id when there is none."""

    client, _ = documents_client
    headers, tenant = _tenant_with_books(client)

    # No slug: the member read names the tenant-id path, and that path resolves,
    # still gated (the private project is the same 404 as a missing book).
    member = client.get("/app/books/shelf/intro", headers=headers)
    assert member.json()["canonical_path"] == f"/@{tenant}/shelf/books/intro"
    ok = client.get(f"/app/orgs/{tenant}/shelf/books/intro")
    assert ok.status_code == 200, ok.text
    assert ok.json()["canonical_path"] == f"/@{tenant}/shelf/books/intro"
    priv = client.get(f"/app/orgs/{tenant}/secret/books/intro")
    assert priv.status_code == 404
    assert priv.json() == client.get(f"/app/orgs/{uuid4()}/shelf/books/intro").json()

    # Once the org claims a slug, the id path still resolves and names the slug.
    org = f"org-{uuid4().hex[:10]}"
    assert client.patch("/app/tenant", json={"slug": org}, headers=headers).status_code == 200
    again = client.get(f"/app/orgs/{tenant}/shelf/books/intro")
    assert again.json()["canonical_path"] == f"/@{org}/shelf/books/intro"
