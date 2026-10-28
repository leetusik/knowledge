"""Private projects never publish (P34-n0.S1) — a core test.

Three things are proved, all with invented project names:

* **the rule** (``server/publish_gate.py``): legacy mode publishes; tenant #1 publishes
  only a ``public`` registry project; a private project, a missing row and a lookup
  that raises do not (the last one says why). A fake accounts service, no Postgres;
* **the guard** (``server/gitops.py``), in a temp git repo: once a project is marked
  in the checkout's ``info/exclude`` block, ``add`` refuses its footprint and a
  ``docs/index.md`` that links into it, while a public path still stages; the block
  round-trips and hides the project's untracked files;
* **the save and delete paths end to end** for tenant #1 (Postgres-gated like
  ``tests/test_documents_api``): a private project's write lands on disk but never
  commits, never touches ``docs/index.md`` and is marked; a public one commits.
"""
from __future__ import annotations

import asyncio
import subprocess
from types import SimpleNamespace
from uuid import uuid4

import anyio
import anyio.to_thread
import pytest

from server import gitops, publish_gate
from server.api_auth import ApiAuthContext
from tests.test_documents_api import _project, _signup, documents_client  # noqa: F401
from tests.test_public_read import _set_public

PRIVATE = "priv-fixture"
PUBLIC = "pub-fixture"
_INDEX = "# Knowledge Base\n\n## Recent\n\n<!-- explain:recent -->\n\n## Browse\n"
MASTER = "test-master-token"


class _FakeAccounts:
    def __init__(self, rows: dict[str, str], *, fail: bool = False):
        self.rows, self.fail, self.calls = rows, fail, 0

    async def get_project_by_name(self, tenant_id, name):
        self.calls += 1
        if self.fail:
            raise RuntimeError("registry down")
        vis = self.rows.get(name)
        return None if vis is None else SimpleNamespace(name=name, visibility=vis)


def _decide(monkeypatch, ctx, project, fake):
    monkeypatch.setattr(publish_gate, "get_accounts_service", lambda: fake)
    return asyncio.run(publish_gate.publish_decision(ctx, project))


def test_the_rule(monkeypatch):
    tenant_one = ApiAuthContext(tenant_id=uuid4(), is_public=True)
    rows = {PUBLIC: "public", PRIVATE: "private"}

    legacy = _FakeAccounts(rows)
    assert _decide(monkeypatch, ApiAuthContext(), PRIVATE, legacy).publishes is True
    assert legacy.calls == 0  # legacy mode never reaches the registry

    assert _decide(monkeypatch, tenant_one, PUBLIC, _FakeAccounts(rows)).publishes is True
    for project, fake in ((PRIVATE, _FakeAccounts(rows)), ("absent", _FakeAccounts(rows))):
        decision = _decide(monkeypatch, tenant_one, project, fake)
        assert decision == publish_gate.PRIVATE and decision.error is None
    failed = _decide(monkeypatch, tenant_one, PUBLIC, _FakeAccounts(rows, fail=True))
    assert failed == publish_gate.UNREADABLE and failed.error  # fail closed, says why

    other = ApiAuthContext(tenant_id=uuid4(), is_public=False)
    assert _decide(monkeypatch, other, PUBLIC, _FakeAccounts(rows)).publishes is False


def test_sync_wrapper_bridges_and_fails_closed(monkeypatch):
    ctx = ApiAuthContext(tenant_id=uuid4(), is_public=True)
    fake = _FakeAccounts({PUBLIC: "public"})
    monkeypatch.setattr(publish_gate, "get_accounts_service", lambda: fake)

    async def from_worker():
        return await anyio.to_thread.run_sync(publish_gate.project_publishes_from_worker, ctx, PUBLIC)

    assert anyio.run(from_worker) is True
    # Outside a worker thread the bridge raises: that, too, counts as private.
    assert publish_gate.publish_decision_from_worker(ctx, PUBLIC) == publish_gate.UNREADABLE


def _git(root, *args):
    return subprocess.run(
        ["git", "-C", str(root), *args], capture_output=True, text=True, check=True
    ).stdout


def _repo(tmp_path):
    (tmp_path / "docs").mkdir()
    (tmp_path / "docs" / "index.md").write_text(_INDEX, encoding="utf-8")
    _git(tmp_path, "init", "-q")
    _git(tmp_path, "config", "user.name", "kb-test")
    _git(tmp_path, "config", "user.email", "kb-test@example.com")
    _git(tmp_path, "add", "docs/index.md")
    _git(tmp_path, "commit", "-q", "-m", "seed")
    return tmp_path


def _write(root, rel, text="body\n"):
    path = root / rel
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text, encoding="utf-8")


def test_the_guard(tmp_path):
    root = _repo(tmp_path)
    # Files committed before the project went private: excludes never stop a TRACKED
    # file, so only the guard keeps their edits from being staged.
    tracked = (f"docs/{PRIVATE}/2026-01-01-a.md", f"docs/.versions/{PRIVATE}/2026-01-01-a/v0001.md")
    for rel in tracked:
        _write(root, rel)
    _git(root, "add", *tracked)
    _git(root, "commit", "-q", "-m", "published before")
    exclude = gitops.exclude_path(root)
    exclude.parent.mkdir(parents=True, exist_ok=True)
    exclude.write_text("# operator line\n*.swp\n", encoding="utf-8")

    assert gitops.mark_private(PRIVATE, root=root) is True
    assert gitops.mark_private(PRIVATE, root=root) is False  # idempotent: nothing written
    assert gitops.private_projects(root) == [PRIVATE]
    text = exclude.read_text(encoding="utf-8")
    assert text.startswith("# operator line\n*.swp\n")  # the operator's lines are kept
    for line in (f"/docs/{PRIVATE}/", f"/docs/.versions/{PRIVATE}/", f"/docs/.books/{PRIVATE}/"):
        assert line in text.splitlines()

    for rel in tracked:
        _write(root, rel, "edited\n")
    _write(root, f"docs/{PRIVATE}/2026-01-02-new.md")
    _write(root, f"docs/{PUBLIC}/2026-01-01-b.md")
    # The block hides the private project's untracked files from `git status`.
    status = _git(root, "status", "--porcelain", "--untracked-files=all")
    assert f"docs/{PRIVATE}/2026-01-02-new.md" not in status and f"docs/{PUBLIC}/" in status

    for rel in (*tracked, f"docs/.versions/{PRIVATE}/2026-01-01-a", "docs", "./docs/"):
        with pytest.raises(gitops.GitError):
            gitops.add([f"docs/{PUBLIC}/2026-01-01-b.md", rel], root=root)
    with pytest.raises(gitops.GitError):
        gitops.remove([tracked[0]], root=root)
    assert _git(root, "diff", "--cached", "--name-only") == ""  # nothing was staged

    bullet = f"- 2026-01-01 · [A]({PRIVATE}/2026-01-01-a.md) — {PRIVATE}\n"
    (root / "docs" / "index.md").write_text(_INDEX + bullet, encoding="utf-8")
    with pytest.raises(gitops.GitError):
        gitops.add(["docs/index.md"], root=root)

    (root / "docs" / "index.md").write_text(_INDEX + "- public bullet\n", encoding="utf-8")
    gitops.add([f"docs/{PUBLIC}/2026-01-01-b.md", "docs/index.md"], root=root)
    assert _git(root, "diff", "--cached", "--name-only").split() == [
        "docs/index.md", f"docs/{PUBLIC}/2026-01-01-b.md",
    ]

    # Rewritten whole: an empty set drops the block and keeps the operator's lines.
    assert gitops.write_private_projects([], root=root) is True
    assert exclude.read_text(encoding="utf-8") == "# operator line\n*.swp\n"
    assert gitops.private_projects(root) == []


def _payload(project, slug):
    return {
        "title": f"Fixture {slug}", "markdown": f"# Fixture {slug}\n\nBody.\n",
        "project": project, "tags": ["t", "u"], "source_repo": project,
        "date": "2026-01-01", "slug": slug,
    }


def test_tenant_one_saves_and_deletes_publish_only_public_projects(
    documents_client, tmp_path, monkeypatch  # noqa: F811
):
    client, _ = documents_client
    root = _repo(tmp_path)
    monkeypatch.setenv("KB_ROOT", str(root))
    monkeypatch.setenv("KB_API_TOKEN", MASTER)
    import server.api_auth as api_auth

    monkeypatch.setattr(api_auth, "_tenant_one_cache", None)
    email = f"op-{uuid4()}@example.com"
    session, _ = _signup(client, email)
    monkeypatch.setenv("KB_OPERATOR_EMAIL", email)
    _set_public(client, session, _project(client, session, PUBLIC))
    bearer = {"Authorization": f"Bearer {MASTER}"}
    head = _git(root, "rev-parse", "HEAD")

    r = client.post("/api/documents", headers=bearer, json=_payload(PRIVATE, "hidden"))
    assert r.status_code == 201, r.text
    b = r.json()
    assert (b["committed"], b["recent_updated"], b["landing_created"]) == (False, False, False)
    assert "commit_error" not in b  # a deliberate skip, not a failure
    assert (root / "docs" / b["rel_path"]).is_file()  # saved on disk all the same
    assert PRIVATE not in (root / "docs" / "index.md").read_text(encoding="utf-8")
    assert not (root / "docs" / PRIVATE / "index.md").exists()
    assert gitops.private_projects(root) == [PRIVATE]
    assert PRIVATE not in _git(root, "status", "--porcelain", "--untracked-files=all")
    assert _git(root, "rev-parse", "HEAD") == head

    gone = client.delete(f"/api/documents/{b['id']}", headers=bearer).json()
    assert gone["deleted"] is True and gone["committed"] is False and "commit_error" not in gone
    assert _git(root, "rev-parse", "HEAD") == head

    r = client.post("/api/documents", headers=bearer, json=_payload(PUBLIC, "shown"))
    assert r.status_code == 201, r.text
    p = r.json()
    assert p["committed"] is True and p["recent_updated"] is True
    assert sorted(_git(root, "show", "--name-only", "--format=", "HEAD").split()) == [
        "docs/index.md", f"docs/{PUBLIC}/2026-01-01-shown.md", f"docs/{PUBLIC}/index.md",
    ]
    removed = client.delete(f"/api/documents/{p['id']}", headers=bearer).json()
    assert removed["committed"] is True
