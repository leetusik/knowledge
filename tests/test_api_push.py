"""Publish-on-write (KB_GIT_PUSH) over a local bare remote — no network/credentials.

Off by default (local never pushes); when enabled the write path fetch+rebases
onto origin/main then non-force pushes, best-effort like the commit: a failed push
never changes the 2xx, and the published HEAD becomes commit_sha.
"""
import subprocess

import pytest
from fastapi.testclient import TestClient

_INDEX = "# Knowledge Base\n\n## Recent\n\n<!-- explain:recent -->\n\n## Browse\n"
_REL = "test-project/2026-07-02-api-smoke-test.md"
_PAYLOAD = {
    "title": "API Smoke Test",
    "markdown": "# API Smoke Test\n\nBody text.\n",
    "project": "test-project",
    "tags": ["testing", "api"],
    "source_repo": "/tmp/test-project",
    "date": "2026-07-02",
    "slug": "api-smoke-test",
}


def _git(root, *args):
    return subprocess.run(
        ["git", "-C", str(root), *args], capture_output=True, text=True, check=True
    )


def _bare_head(bare):
    return _git(bare, "rev-parse", "main").stdout.strip()


@pytest.fixture
def pushable(tmp_path, monkeypatch):
    """A work repo whose origin is a local bare remote. Returns (client, work, bare)."""
    bare = tmp_path / "remote.git"
    _git(tmp_path, "init", "--bare", "-b", "main", str(bare))

    work = tmp_path / "work"
    (work / "docs").mkdir(parents=True)
    (work / "docs" / "index.md").write_text(_INDEX, encoding="utf-8")
    _git(work, "init", "-b", "main")
    _git(work, "config", "user.name", "kb-test")
    _git(work, "config", "user.email", "kb-test@example.com")
    _git(work, "add", "docs/index.md")
    _git(work, "commit", "-m", "seed")
    _git(work, "remote", "add", "origin", str(bare))
    _git(work, "push", "-u", "origin", "main")

    monkeypatch.setenv("KB_ROOT", str(work))
    # DB lives OUTSIDE the work tree so the disposable data/ never dirties git
    # status (this fixture asserts a clean tree after a conflicting push).
    monkeypatch.setenv("KB_DB_PATH", str(tmp_path / "kbdata" / "kb.sqlite3"))
    from server.main import app  # imported after env is set

    return TestClient(app), work, bare


def _operator_clone(tmp_path, bare, name):
    """Clone the bare, identify, return the clone path (a stand-in for the Mac)."""
    clone = tmp_path / name
    _git(tmp_path, "clone", str(bare), str(clone))
    _git(clone, "config", "user.name", "operator")
    _git(clone, "config", "user.email", "operator@example.com")
    return clone


def test_push_disabled_by_default(pushable):
    tc, work, bare = pushable
    before = _bare_head(bare)
    r = tc.post("/api/documents", json=_PAYLOAD)
    assert r.status_code == 201, r.text
    b = r.json()
    assert b["committed"] is True
    assert b["pushed"] is False and "push_error" not in b
    assert _bare_head(bare) == before  # bare remote untouched


def test_push_happy_path(pushable, monkeypatch):
    tc, work, bare = pushable
    monkeypatch.setenv("KB_GIT_PUSH", "true")
    r = tc.post("/api/documents", json=_PAYLOAD)
    assert r.status_code == 201, r.text
    b = r.json()
    assert b["pushed"] is True and "push_error" not in b
    assert _bare_head(bare) == b["commit_sha"]  # published HEAD == commit_sha


def test_push_rebases_onto_diverged_remote(pushable, monkeypatch, tmp_path):
    tc, work, bare = pushable
    clone = _operator_clone(tmp_path, bare, "clone")
    (clone / "unrelated.md").write_text("operator work\n", encoding="utf-8")
    _git(clone, "add", "unrelated.md")
    _git(clone, "commit", "-m", "operator change")
    _git(clone, "push", "origin", "main")
    operator_head = _bare_head(bare)

    monkeypatch.setenv("KB_GIT_PUSH", "true")
    r = tc.post("/api/documents", json=_PAYLOAD)
    assert r.status_code == 201, r.text
    b = r.json()
    assert b["pushed"] is True
    assert _bare_head(bare) == b["commit_sha"]
    # Operator commit preserved as an ancestor — our commit landed on top, no force.
    assert "operator change" in _git(bare, "log", "--pretty=%s", "main").stdout
    anc = subprocess.run(
        ["git", "-C", str(bare), "merge-base", "--is-ancestor", operator_head, "main"]
    )
    assert anc.returncode == 0


def test_push_conflict_keeps_local_commit_no_rebase_state(pushable, monkeypatch, tmp_path):
    tc, work, bare = pushable
    clone = _operator_clone(tmp_path, bare, "clone")
    idx = clone / "docs" / "index.md"
    # Operator edits the same Recent region the API appends to → rebase conflict.
    idx.write_text(
        idx.read_text(encoding="utf-8").replace(
            "<!-- explain:recent -->\n",
            "<!-- explain:recent -->\n- 2026-07-01 · operator bullet\n",
        ),
        encoding="utf-8",
    )
    _git(clone, "add", "docs/index.md")
    _git(clone, "commit", "-m", "operator edits Recent")
    _git(clone, "push", "origin", "main")

    monkeypatch.setenv("KB_GIT_PUSH", "true")
    r = tc.post("/api/documents", json=_PAYLOAD)
    assert r.status_code == 201, r.text  # still 201 — push failure never a 5xx
    b = r.json()
    assert b["committed"] is True
    assert b["pushed"] is False and b["push_error"]  # non-empty error surfaced
    # Local commit survives intact, repo not left mid-rebase, tree clean.
    assert _git(work, "log", "-1", "--pretty=%s").stdout.strip() == (
        "docs(test-project): add api-smoke-test"
    )
    assert not (work / ".git" / "rebase-merge").exists()
    assert not (work / ".git" / "rebase-apply").exists()
    assert _git(work, "status", "--porcelain").stdout.strip() == ""
    assert (work / "docs" / _REL).exists()  # the doc file is still there


def test_delete_push_enabled(pushable, monkeypatch):
    tc, work, bare = pushable
    doc_id = tc.post("/api/documents", json=_PAYLOAD).json()["id"]  # push off here
    monkeypatch.setenv("KB_GIT_PUSH", "true")
    r = tc.delete(f"/api/documents/{doc_id}")
    assert r.status_code == 200, r.text
    b = r.json()
    assert b["pushed"] is True and "push_error" not in b
    assert _bare_head(bare) == b["commit_sha"]  # delete commit published
