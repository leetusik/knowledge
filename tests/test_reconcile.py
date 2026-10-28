"""The tree mirrors project visibility (P34-n0.S2) — a core test.

``server/reconcile.py`` makes tenant #1's git tree match the registry. Proved here in
temp git repos with a temp documents database and invented project names (no
Postgres for the core cases):

* a tracked **private** project is untracked (its files stay on disk), unlisted from
  ``docs/index.md`` and marked, in exactly one commit whose message names no project;
  a second run commits nothing; a ``docs/`` dir that is not in the registry is
  untouched;
* a **marked** project toggled public is unmarked, gets its landing and its bullets
  back from the documents database, and is tracked again in one commit;
* ``--dry-run`` writes nothing, and the CLI refuses, changing nothing, when the
  registry cannot be read (unknown never means "unpublish everything");
* the visibility toggle runs it for a tenant #1 project (Postgres-gated, like
  ``tests/test_private_publish``).
"""
from __future__ import annotations

import hashlib
import subprocess
from uuid import uuid4

from server import db, gitops, reconcile
from tests.test_documents_api import _project, _signup, documents_client  # noqa: F401

PRIVATE = "priv-fixture"
PUBLIC = "pub-fixture"
LOOSE = "loose-fixture"  # a docs/ dir the registry does not know
MASTER = "test-master-token"
_LOOSE_DOC = f"docs/{LOOSE}/2026-01-01-x.md"
_INDEX = (
    "# Knowledge Base\n\n## Recent\n\n<!-- explain:recent -->\n"
    f"- 2026-01-01 · [X]({LOOSE}/2026-01-01-x.md) — {LOOSE}\n\n## Browse\n"
)
_PRIVATE_FILES = (
    f"docs/{PRIVATE}/2026-01-01-a.md",
    f"docs/{PRIVATE}/index.md",
    f"docs/.versions/{PRIVATE}/2026-01-01-a/v0001.md",
    f"docs/.books/{PRIVATE}/book.json",
)


def _git(root, *args):
    return subprocess.run(
        ["git", "-C", str(root), *args], capture_output=True, text=True, check=True
    ).stdout


def _write(root, rel, text="body\n"):
    path = root / rel
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text, encoding="utf-8")


def _repo(root):
    _write(root, ".gitignore", ".assets/\n")
    _write(root, "docs/index.md", _INDEX)
    _write(root, _LOOSE_DOC)
    _git(root, "init", "-q")
    _git(root, "config", "user.name", "kb-test")
    _git(root, "config", "user.email", "kb-test@example.com")
    _git(root, "add", ".gitignore", "docs")
    _git(root, "commit", "-q", "-m", "seed")
    return root


def _published_repo(root):
    """A private project published before P34: its footprint and bullets are in git."""
    _repo(root)
    for rel in _PRIVATE_FILES:
        _write(root, rel)
    bullets = "".join(
        f"- 2026-01-0{i} · [A{i}]({PRIVATE}/2026-01-0{i}-a.md) — {PRIVATE}\n" for i in (1, 2)
    )
    text = _INDEX.replace("<!-- explain:recent -->\n", "<!-- explain:recent -->\n" + bullets)
    _write(root, "docs/index.md", text)
    _git(root, "add", "docs")
    _git(root, "commit", "-q", "-m", "published before")
    return root


def _snapshot(root):
    """Every file under the checkout, ``.git`` included (index, exclude, refs)."""
    return {
        str(p.relative_to(root)): hashlib.sha256(p.read_bytes()).hexdigest()
        for p in sorted(root.rglob("*"))
        if p.is_file()
    }


def _commits_since(root, head):
    return int(_git(root, "rev-list", "--count", f"{head}..HEAD").strip())


def test_private_project_is_untracked_unlisted_and_marked_in_one_commit(tmp_path):
    root = _published_repo(tmp_path / "kb")
    head = _git(root, "rev-parse", "HEAD").strip()
    loose_before = (root / _LOOSE_DOC).read_bytes()

    report = reconcile.reconcile(
        {PRIVATE: "private"}, kb_root=root, db_conn=None, tenant_db_id=None
    )

    pr = report.project(PRIVATE)
    assert report.error is None and pr.action == reconcile.UNPUBLISH
    assert pr.untracked == sorted(_PRIVATE_FILES) and pr.bullets_removed == 2
    assert _commits_since(root, head) == 1
    message = _git(root, "log", "-1", "--format=%B")
    assert PRIVATE not in message and message.startswith("docs: unpublish private projects (1)")
    footprint = gitops.footprint_dirs(PRIVATE)
    assert _git(root, "ls-files", "--", *footprint) == ""
    assert _git(root, "ls-tree", "-r", "--name-only", "HEAD", "--", *footprint) == ""
    assert all((root / rel).is_file() for rel in _PRIVATE_FILES)  # never deleted
    for text in ((root / "docs" / "index.md").read_text(encoding="utf-8"),
                 _git(root, "show", "HEAD:docs/index.md")):
        assert f"]({PRIVATE}/" not in text and f"]({LOOSE}/" in text
    assert gitops.private_projects(root) == [PRIVATE]
    # Hidden and clean: the private files no longer show, nothing else changed.
    assert _git(root, "status", "--porcelain", "--untracked-files=all") == ""
    assert _LOOSE_DOC in _git(root, "ls-files").split()
    assert (root / _LOOSE_DOC).read_bytes() == loose_before

    again = reconcile.reconcile(
        {PRIVATE: "private"}, kb_root=root, db_conn=None, tenant_db_id=None
    )
    assert again.error is None and again.commit_sha is None
    assert again.project(PRIVATE).action == reconcile.NONE
    assert _commits_since(root, head) == 1


def test_marked_project_toggled_public_is_republished(tmp_path):
    root = _repo(tmp_path / "kb")
    tenant = str(uuid4())
    docs_b = f"{PUBLIC}/2026-01-02-b.md"
    docs_c = f"{PUBLIC}/2026-01-03-c.md"
    archive = f"docs/.versions/{PUBLIC}/2026-01-02-b/v0001.md"
    for rel in (f"docs/{docs_b}", f"docs/{docs_c}", archive):
        _write(root, rel)
    gitops.mark_private(PUBLIC, root=root)  # written while private: on disk, hidden
    assert _git(root, "status", "--porcelain", "--untracked-files=all") == ""
    conn = db.connect(tmp_path / "kb.sqlite3")
    # Tenant #1's rows carry its uuid once stamped, '' before that; both count. A row
    # whose file is gone gets no bullet.
    for rel, date, stamp in ((docs_b, "2026-01-02", tenant), (docs_c, "2026-01-03", ""),
                             (f"{PUBLIC}/2026-01-04-gone.md", "2026-01-04", tenant)):
        db.upsert_document(
            conn, project=PUBLIC, slug=rel.split("-", 3)[-1][:-3], date=date,
            title=f"T {date}", tags=[], source_repo=None, rel_path=rel,
            markdown="body", tenant_id=stamp,
        )
    conn.commit()
    head = _git(root, "rev-parse", "HEAD").strip()

    report = reconcile.reconcile(
        {PUBLIC: "public", PRIVATE: "private"}, kb_root=root, db_conn=conn,
        tenant_db_id=tenant, only=PUBLIC,
    )

    pr = report.project(PUBLIC)
    assert report.error is None and pr.action == reconcile.PUBLISH and pr.error is None
    assert pr.bullets_added == 2 and pr.landing_created
    assert gitops.private_projects(root) == []  # unmarked; `only` left the other alone
    index = (root / "docs" / "index.md").read_text(encoding="utf-8")
    assert index.index(f"]({docs_c})") < index.index(f"]({docs_b})") < index.index(f"]({LOOSE}/")
    assert "gone" not in index
    landing = f"docs/{PUBLIC}/index.md"
    assert (root / landing).is_file()
    assert _git(root, "ls-files", "--", *gitops.footprint_dirs(PUBLIC)).split() == sorted(
        [f"docs/{docs_b}", f"docs/{docs_c}", archive, landing]
    )
    assert _commits_since(root, head) == 1
    assert "docs/index.md" in _git(root, "show", "--name-only", "--format=", "HEAD").split()
    assert _git(root, "status", "--porcelain", "--untracked-files=all") == ""

    again = reconcile.reconcile(
        {PUBLIC: "public"}, kb_root=root, db_conn=conn, tenant_db_id=tenant, only=PUBLIC
    )
    assert again.commit_sha is None and again.project(PUBLIC).action == reconcile.NONE
    conn.close()


def test_dry_run_writes_nothing_and_the_cli_refuses_an_unreadable_registry(
    tmp_path, monkeypatch
):
    root = _published_repo(tmp_path / "kb")
    _write(root, f"docs/{PUBLIC}/2026-01-02-b.md")
    gitops.mark_private(PUBLIC, root=root)
    conn = db.connect(tmp_path / "kb.sqlite3")
    db.upsert_document(
        conn, project=PUBLIC, slug="b", date="2026-01-02", title="B", tags=[],
        source_repo=None, rel_path=f"{PUBLIC}/2026-01-02-b.md", markdown="body",
    )
    conn.commit()
    before = _snapshot(root)

    report = reconcile.reconcile(
        {PRIVATE: "private", PUBLIC: "public"}, kb_root=root, db_conn=conn,
        tenant_db_id=None, dry_run=True,
    )
    conn.close()

    assert _snapshot(root) == before  # the tree, the index and the exclude file
    priv, pub = report.project(PRIVATE), report.project(PUBLIC)
    assert priv.action == reconcile.UNPUBLISH and len(priv.untracked) == 4
    assert priv.bullets_removed == 2
    assert pub.action == reconcile.PUBLISH and pub.bullets_added == 1 and pub.landing_created
    assert report.exclude_changed and report.commit_sha is None
    assert report.commit_message and PRIVATE not in report.commit_message

    # The CLI: legacy mode is refused; an unreadable registry is refused. No change.
    monkeypatch.setenv("KB_ROOT", str(root))
    monkeypatch.setenv("KB_DB_PATH", str(tmp_path / "kb.sqlite3"))
    monkeypatch.delenv("DATABASE_URL", raising=False)
    assert reconcile.main([]) == 2
    monkeypatch.setenv("DATABASE_URL", "postgresql+psycopg://nobody@127.0.0.1:1/none")

    async def registry_down():
        raise RuntimeError("registry down")

    monkeypatch.setattr(reconcile, "_read_registry", registry_down)
    assert reconcile.main([]) == 3
    assert _snapshot(root) == before


def test_the_toggle_mirrors_a_tenant_one_project(documents_client, tmp_path, monkeypatch):  # noqa: F811
    client, _ = documents_client
    root = _repo(tmp_path / "kb")
    monkeypatch.setenv("KB_ROOT", str(root))
    monkeypatch.setenv("KB_API_TOKEN", MASTER)
    import server.api_auth as api_auth

    monkeypatch.setattr(api_auth, "_tenant_one_cache", None)
    email = f"op-{uuid4()}@example.com"
    session, _ = _signup(client, email)
    monkeypatch.setenv("KB_OPERATOR_EMAIL", email)
    name = "toggle-fixture"
    pid = _project(client, session, name)

    def toggle(visibility):
        res = client.patch(f"/app/projects/{pid}", json={"visibility": visibility}, headers=session)
        assert res.status_code == 200, res.text
        assert res.json()["project"]["visibility"] == visibility
        return res.json()["publish"]

    assert toggle("public")["action"] == reconcile.NONE  # nothing on disk yet
    r = client.post("/api/documents", headers={"Authorization": f"Bearer {MASTER}"}, json={
        "title": "Shown", "markdown": "# Shown\n\nBody.\n", "project": name,
        "tags": ["t", "u"], "source_repo": name, "date": "2026-01-01", "slug": "shown",
    })
    assert r.status_code == 201 and r.json()["committed"] is True, r.text
    rel = r.json()["rel_path"]

    off = toggle("private")
    assert (off["action"], off["committed"], off["error"]) == (reconcile.UNPUBLISH, True, None)
    assert off["push_pending"] is False  # KB_GIT_PUSH is off
    assert name not in _git(root, "log", "-1", "--format=%B")
    assert _git(root, "ls-files", "--", f"docs/{name}") == ""
    assert (root / "docs" / rel).is_file()
    assert gitops.private_projects(root) == [name]
    assert f"]({name}/" not in (root / "docs" / "index.md").read_text(encoding="utf-8")

    on = toggle("public")
    assert (on["action"], on["committed"], on["error"]) == (reconcile.PUBLISH, True, None)
    assert f"docs/{rel}" in _git(root, "ls-files", "--", f"docs/{name}").split()
    assert f"]({rel})" in _git(root, "show", "HEAD:docs/index.md")  # rebuilt from the DB
    assert gitops.private_projects(root) == []
