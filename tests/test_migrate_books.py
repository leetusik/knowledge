"""The library migration's link preservation (P30.S6) — a core test.

On a small synthetic library (two projects, html and md, a KO/EN pair, one loose
document, and a chapter /explain already placed), ``scripts/migrate_books.py``:

* binds the books as mapped, merging into a book that already exists (its chapter kept);
* keeps every ``/documents/{id}`` and ``/@{org}/{project}/{slug}`` read identical;
* rewrites no document file (every byte hashed before and after; git shows only
  ``docs/.books/`` in the new commits) and never calls the publish endpoint;
* makes no call and no commit on a second ``--apply``;
* refuses, before any write, a map that would rebind a document bound elsewhere.

Postgres-gated like every ``/app/orgs`` read (``KB_TEST_DATABASE_URL``).
"""
from __future__ import annotations

import hashlib
import importlib.util
import subprocess
from pathlib import Path
from uuid import uuid4

import pytest

from tests.test_documents_api import _signup, documents_client  # noqa: F401

_SPEC = importlib.util.spec_from_file_location(
    "migrate_books", Path(__file__).resolve().parents[1] / "scripts" / "migrate_books.py"
)
migrate_books = importlib.util.module_from_spec(_SPEC)
_SPEC.loader.exec_module(migrate_books)

MASTER = "test-master-token"


def _git(root, *args):
    return subprocess.run(
        ["git", "-C", str(root), *args], capture_output=True, text=True, check=True
    ).stdout


def _md(title, project, body, extra=""):
    return (
        f'---\ntitle: "{title}"\ndate: 2026-10-01\n{extra}tags:\n  - t\n  - u\nsource:\n'
        f"  project: {project}\n  repo: {project}\n---\n\n# {title}\n\n{body}\n"
    )


def _html(title, project, body):
    return (
        f'<!--kb\ntitle: "{title}"\ndate: 2026-10-01\ntags:\n  - t\n  - u\nsource:\n'
        f"  project: {project}\n  repo: {project}\n-->\n\n<!DOCTYPE html>\n"
        f'<html lang="en"><head><title>{title}</title></head><body><p>{body}</p></body></html>\n'
    )


LIBRARY = {
    "alpha/2026-10-01-p1-the-start.html": _html("P1: The start", "alpha", "Zebracorn one."),
    "alpha/2026-10-01-p1-the-start-ko.md": _md("P1: 시작", "alpha", "얼룩말 하나.", "lang: ko\n"),
    "alpha/2026-10-01-p2-the-middle.md": _md("P2: The middle", "alpha", "Zebracorn two."),
    "beta/2026-10-01-guide-part-one.md": _md("Guide part one", "beta", "Zebracorn guide."),
    "beta/2026-10-01-a-loose-note.md": _md("A loose note", "beta", "Stays loose."),
}

MAP = {
    "books": {
        "alpha": {"phases": {"title": "alpha, phase by phase", "kind": "codebase", "chapters": [
            {"key": "p1", "position": 1, "source": {"phase": "P1"}, "reason": "phase explainer",
             "variants": {"en": "alpha/2026-10-01-p1-the-start.html",
                          "ko": "alpha/2026-10-01-p1-the-start-ko.md"}},
            {"key": "p2", "position": 2, "variants": {"en": "alpha/2026-10-01-p2-the-middle.md"}},
        ]}},
        "beta": {"guide": {"title": "beta guide", "kind": "codebase", "chapters": [
            {"key": "guide-part-one", "position": 1,
             "variants": {"en": "beta/2026-10-01-guide-part-one.md"}},
        ]}},
    },
    "loose": [{"rel_path": "beta/2026-10-01-a-loose-note.md", "reason": "single note"}],
}


def _file_hashes(docs: Path) -> dict[str, str]:
    return {
        str(p.relative_to(docs)): hashlib.sha256(p.read_bytes()).hexdigest()
        for p in sorted(docs.rglob("*"))
        if p.is_file() and ".books" not in p.relative_to(docs).parts
    }


@pytest.fixture
def library(tmp_path, monkeypatch):
    docs = tmp_path / "docs"
    for rel, text in LIBRARY.items():
        (docs / rel).parent.mkdir(parents=True, exist_ok=True)
        (docs / rel).write_text(text, encoding="utf-8")
    _git(tmp_path, "init", "-q")
    _git(tmp_path, "config", "user.name", "kb-test")
    _git(tmp_path, "config", "user.email", "kb-test@example.com")
    _git(tmp_path, "add", "docs")
    _git(tmp_path, "commit", "-q", "-m", "seed")
    monkeypatch.setenv("KB_ROOT", str(tmp_path))
    monkeypatch.setenv("KB_API_TOKEN", MASTER)
    import server.api_auth as api_auth

    monkeypatch.setattr(api_auth, "_tenant_one_cache", None)
    return tmp_path


def test_migration_binds_books_and_preserves_every_link(library, documents_client, monkeypatch):
    client, _ = documents_client
    root, docs = library, library / "docs"
    email = f"op-{uuid4()}@example.com"
    session_headers, _tenant = _signup(client, email)
    monkeypatch.setenv("KB_OPERATOR_EMAIL", email)
    org = f"org-{uuid4().hex[:10]}"
    assert client.patch("/app/tenant", json={"slug": org}, headers=session_headers).status_code == 200
    bearer = {"Authorization": f"Bearer {MASTER}"}
    assert client.post("/api/reindex", headers=bearer).status_code == 200

    # /explain already placed a chapter in a mapped book: the migration must keep it.
    r = client.post("/api/documents", headers=bearer, json={
        "title": "P3: The end", "markdown": "# P3: The end\n\nZebracorn three.\n",
        "project": "alpha", "tags": ["t", "u"], "source_repo": "alpha", "date": "2026-10-02",
        "slug": "p3-the-end", "book": {"slug": "phases", "kind": "codebase"},
        "chapter": {"key": "p3", "position": 3}, "lang": "en",
    })
    assert r.status_code == 201, r.text
    p3_rel = r.json()["rel_path"]

    calls: list[tuple[str, str]] = []
    client.event_hooks["request"].append(lambda req: calls.append((req.method, req.url.path)))
    api = migrate_books.Api(client, token=MASTER, session=session_headers["Authorization"][7:])
    files_before = _file_hashes(docs)
    head_before = _git(root, "rev-parse", "HEAD").strip()

    dry = migrate_books.run(api, MAP, apply=False, app_checks=True, out=lambda *_: None)
    assert dry["ok"] and not api.puts
    assert {(b["project"], b["book"]): b["action"] for b in dry["books"]} == {
        ("alpha", "phases"): "update", ("beta", "guide"): "create",
    }

    first = migrate_books.run(api, MAP, apply=True, app_checks=True, out=lambda *_: None)
    assert first["ok"], first["failures"]
    assert [p["status"] for p in first["puts"]] == [200, 200]
    # 6 documents x (api, /documents/{id}, its pretty URL) + 1 html raw read, all
    # resolving before and identical after (run() asserts both).
    assert first["checks"] == 6 * 3 + 1

    # No document file was rewritten; the new commits touch only book manifests.
    assert _file_hashes(docs) == files_before
    changed = _git(root, "diff", "--name-only", head_before, "HEAD").split()
    assert changed and all(path.startswith("docs/.books/") for path in changed)
    # The tool only reads and PUTs books: never the publish endpoint.
    assert {m for m, p in calls if not p.startswith(("/api/books/",))} == {"GET"}
    assert all(p.startswith("/api/books/") for m, p in calls if m == "PUT")

    phases = client.get("/api/books/alpha/phases", headers=bearer).json()
    assert [(c["key"], sorted(v["lang"] for v in c["variants"])) for c in phases["chapters"]] == [
        ("p1", ["en", "ko"]), ("p2", ["en"]), ("p3", ["en"]),
    ]
    assert phases["chapters"][2]["variants"][0]["rel_path"] == p3_rel
    guide = client.get("/api/books/beta/guide", headers=bearer).json()
    assert guide["title"] == "beta guide" and len(guide["chapters"]) == 1

    # The second run is a no-op: no PUT, no commit.
    head_after = _git(root, "rev-parse", "HEAD").strip()
    second = migrate_books.run(api, MAP, apply=True, app_checks=True, out=lambda *_: None)
    assert second["ok"] and second["puts"] == []
    assert {b["action"] for b in second["books"]} == {"unchanged"}
    assert _git(root, "rev-parse", "HEAD").strip() == head_after

    # A map that would rebind a document bound elsewhere is refused before any write.
    bad = {"books": {"alpha": {"other": {"title": "x", "kind": "codebase", "chapters": [
        {"key": "p3", "position": 1, "variants": {"en": p3_rel}}]}}}, "loose": []}
    refused = migrate_books.run(api, bad, apply=True, app_checks=True, out=lambda *_: None)
    assert refused["refused"] == "conflicts" and refused["puts"] == []
    assert _git(root, "rev-parse", "HEAD").strip() == head_after
