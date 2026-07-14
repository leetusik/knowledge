"""Write path (POST /api/documents) over a temp git repo: 201 shape + scoped
commit, 409 -> overwrite, commit:false skips git, invalid tags -> 422."""
import subprocess

import pytest
from fastapi.testclient import TestClient

_INDEX = "# Knowledge Base\n\n## Recent\n\n<!-- explain:recent -->\n\n## Browse\n"
_REL = "test-project/2026-07-02-api-smoke-test.md"
_PAYLOAD = {
    "title": "API Smoke Test: Colons & Quotes",
    "markdown": "# API Smoke Test: Colons & Quotes\n\nBody text about testing.\n",
    "project": "test-project",
    "tags": ["testing", "api"],
    "source_repo": "/tmp/test-project",
    "date": "2026-07-02",
    "slug": "api-smoke-test",
}
# Byte-exact frontmatter the serializer must emit (title via json.dumps).
# Note: source_repo is sanitized at write time (absolute paths -> basename).
_EXPECTED_FM = (
    '---\n'
    'title: "API Smoke Test: Colons & Quotes"\n'
    'date: 2026-07-02\n'
    'tags:\n  - testing\n  - api\n'
    'source:\n  project: test-project\n  repo: test-project\n'
    '---\n'
)


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
    from server.main import app  # imported after env is set

    return TestClient(app), tmp_path


def test_happy_path_shape_and_scoped_commit(client):
    tc, root = client
    r = tc.post(
        "/api/documents",
        json={**_PAYLOAD, "co_authored_by": "Tester <t@example.com>"},
    )
    assert r.status_code == 201, r.text
    b = r.json()
    assert b["committed"] is True and b["commit_sha"]
    assert b["rel_path"] == _REL and b["recent_updated"] is True
    assert b["url"].endswith("/test-project/2026-07-02-api-smoke-test/")

    content = (root / "docs" / _REL).read_text(encoding="utf-8")
    assert content.startswith(_EXPECTED_FM)  # byte-exact frontmatter head

    lines = (root / "docs" / "index.md").read_text(encoding="utf-8").split("\n")
    m = lines.index("<!-- explain:recent -->")
    assert lines[m + 1] == (
        "- 2026-07-02 · [API Smoke Test: Colons & Quotes]"
        "(test-project/2026-07-02-api-smoke-test.md) — test-project"
    )

    names = set(
        _git(root, "diff-tree", "--no-commit-id", "--name-only", "-r", "HEAD")
        .stdout.split()
    )
    # First doc of a fresh project → scoped commit also carries the auto-created
    # landing (3 paths); a later doc into the same project stays 2 (see below).
    assert names == {f"docs/{_REL}", "docs/index.md", "docs/test-project/index.md"}
    assert _git(root, "log", "-1", "--pretty=%s").stdout.strip() == (
        "docs(test-project): add api-smoke-test"
    )
    assert "Co-Authored-By: Tester <t@example.com>" in (
        _git(root, "log", "-1", "--pretty=%b").stdout
    )


def test_repeat_409_then_overwrite(client):
    tc, root = client
    assert tc.post("/api/documents", json=_PAYLOAD).status_code == 201
    dup = tc.post("/api/documents", json=_PAYLOAD)
    assert dup.status_code == 409 and _REL in dup.text  # names the existing doc

    ow = tc.post(
        "/api/documents",
        json={
            **_PAYLOAD,
            "overwrite": True,
            "markdown": "# API Smoke Test: Colons & Quotes\n\nUpdated body.\n",
        },
    )
    assert ow.status_code == 201 and ow.json()["recent_updated"] is False
    idx = (root / "docs" / "index.md").read_text(encoding="utf-8")
    assert idx.count("test-project/2026-07-02-api-smoke-test.md") == 1  # no dup bullet
    got = tc.get(f"/api/documents/by-path/{_REL}").json()
    assert "Updated body." in got["markdown"]  # DB row updated


def test_commit_false_skips_git(client):
    tc, root = client
    before = _git(root, "rev-list", "--count", "HEAD").stdout.strip()
    r = tc.post("/api/documents", json={**_PAYLOAD, "commit": False})
    assert r.status_code == 201
    b = r.json()
    assert b["committed"] is False and b["commit_sha"] is None
    assert "commit_error" not in b  # skipped by flag, not a failure
    assert _git(root, "rev-list", "--count", "HEAD").stdout.strip() == before
    assert (root / "docs" / _REL).exists()  # file still written (docs/ canonical)


def test_post_with_related(client):
    tc, root = client
    other_rel = "other-project/2026-06-01-other-doc.md"  # dead link, tolerated
    r = tc.post("/api/documents", json={**_PAYLOAD, "related": [other_rel, other_rel]})
    assert r.status_code == 201, r.text
    b = r.json()
    assert b["related"] == [other_rel]  # deduped, echoed in the 201 response

    content = (root / "docs" / _REL).read_text(encoding="utf-8")
    assert f"related:\n  - {other_rel}\n" in content
    assert content.index("related:") < content.index("source:")

    got = tc.get(f"/api/documents/by-path/{_REL}").json()
    assert got["related"] == [other_rel]  # GET echoes it too


def test_post_with_self_reference_related_dropped(client):
    tc, _ = client
    r = tc.post("/api/documents", json={**_PAYLOAD, "related": [_REL]})
    assert r.status_code == 201, r.text
    assert r.json()["related"] == []  # self-reference dropped silently


def test_post_without_related_unchanged(client):
    tc, root = client
    r = tc.post("/api/documents", json=_PAYLOAD)
    assert r.status_code == 201
    assert r.json()["related"] == []
    content = (root / "docs" / _REL).read_text(encoding="utf-8")
    assert content.startswith(_EXPECTED_FM)  # byte-exact, no related: block


def test_post_absolute_source_repo_sanitized(client):
    """POST with absolute source_repo -> sanitized (basename) in both file and DB."""
    tc, root = client
    # POST with an absolute path in source_repo.
    payload = {**_PAYLOAD, "source_repo": "/Users/sugang/projects/personal/test-project"}
    r = tc.post("/api/documents", json=payload)
    assert r.status_code == 201, r.text
    doc_id = r.json()["id"]

    # File frontmatter must have sanitized basename (publish-safe).
    content = (root / "docs" / _REL).read_text(encoding="utf-8")
    assert "repo: test-project\n" in content
    assert "/Users/" not in content

    # GET by id returns sanitized source_repo.
    got = tc.get(f"/api/documents/{doc_id}").json()
    assert got["source_repo"] == "test-project"

    # GET by path also returns sanitized source_repo.
    got_by_path = tc.get(f"/api/documents/by-path/{_REL}").json()
    assert got_by_path["source_repo"] == "test-project"


# Auto-created project landing (docs/<project>/index.md) — the deploy-gate
# invariant: every project mkdocs discovers must ship site/<project>/index.html.
_LANDING = (
    "# test-project\n\nExplainers about `test-project`, kept in this knowledge base.\n"
)


def test_first_doc_creates_project_landing(client):
    tc, root = client
    r = tc.post("/api/documents", json=_PAYLOAD)
    assert r.status_code == 201, r.text
    assert r.json()["landing_created"] is True

    landing = root / "docs" / "test-project" / "index.md"
    assert landing.read_text(encoding="utf-8") == _LANDING  # minimal, no frontmatter

    names = set(
        _git(root, "diff-tree", "--no-commit-id", "--name-only", "-r", "HEAD")
        .stdout.split()
    )
    # 3-path scoped commit — landing joins only on the project's first doc.
    assert names == {f"docs/{_REL}", "docs/index.md", "docs/test-project/index.md"}


def test_second_doc_leaves_landing_untouched(client):
    tc, root = client
    assert tc.post("/api/documents", json=_PAYLOAD).status_code == 201
    landing = root / "docs" / "test-project" / "index.md"
    before = landing.read_text(encoding="utf-8")

    r = tc.post("/api/documents", json={
        **_PAYLOAD,
        "slug": "second-note",
        "title": "Second Note",
        "markdown": "# Second Note\n\nMore body.\n",
    })
    assert r.status_code == 201 and r.json()["landing_created"] is False
    assert landing.read_text(encoding="utf-8") == before  # not recreated/modified

    names = set(
        _git(root, "diff-tree", "--no-commit-id", "--name-only", "-r", "HEAD")
        .stdout.split()
    )
    # Back to a 2-path commit — the existing landing is not re-staged.
    assert names == {"docs/test-project/2026-07-02-second-note.md", "docs/index.md"}


def test_existing_landing_never_overwritten(client):
    tc, root = client
    landing = root / "docs" / "test-project" / "index.md"
    landing.parent.mkdir(parents=True, exist_ok=True)
    handwritten = "# My Project\n\nHand-written landing — keep me verbatim.\n"
    landing.write_text(handwritten, encoding="utf-8")

    r = tc.post("/api/documents", json=_PAYLOAD)
    assert r.status_code == 201 and r.json()["landing_created"] is False
    assert landing.read_text(encoding="utf-8") == handwritten  # preserved

    names = set(
        _git(root, "diff-tree", "--no-commit-id", "--name-only", "-r", "HEAD")
        .stdout.split()
    )
    assert names == {f"docs/{_REL}", "docs/index.md"}  # landing not staged


def test_invalid_tags_422(client):
    tc, _ = client
    assert tc.post("/api/documents", json={**_PAYLOAD, "tags": ["only-one"]}).status_code == 422
    assert tc.post("/api/documents", json={**_PAYLOAD, "tags": ["UPPER", "case"]}).status_code == 422


def test_delete_happy_path(client):
    tc, root = client
    doc_id = tc.post("/api/documents", json=_PAYLOAD).json()["id"]

    r = tc.delete(f"/api/documents/{doc_id}")
    assert r.status_code == 200, r.text
    b = r.json()
    assert b["deleted"] is True and b["id"] == doc_id and b["rel_path"] == _REL
    assert b["recent_removed"] is True
    assert b["committed"] is True and b["commit_sha"]

    assert not (root / "docs" / _REL).exists()  # file gone
    assert _REL not in (root / "docs" / "index.md").read_text(encoding="utf-8")  # bullet gone

    assert tc.get(f"/api/documents/{doc_id}").status_code == 404
    assert tc.get(f"/api/documents/by-path/{_REL}").status_code == 404

    names = set(
        _git(root, "diff-tree", "--no-commit-id", "--name-only", "-r", "HEAD")
        .stdout.split()
    )
    assert names == {f"docs/{_REL}", "docs/index.md"}  # scoped delete commit
    assert _git(root, "log", "-1", "--pretty=%s").stdout.strip() == (
        "docs(test-project): remove api-smoke-test"
    )


def test_delete_404(client):
    tc, _ = client
    assert tc.delete("/api/documents/9999").status_code == 404
    assert tc.delete("/api/documents/by-path/no/such/path.md").status_code == 404


def test_delete_requires_bearer(client, monkeypatch):
    tc, _ = client
    doc_id = tc.post("/api/documents", json=_PAYLOAD).json()["id"]
    monkeypatch.setenv("KB_API_TOKEN", "secret")
    assert tc.delete(f"/api/documents/{doc_id}").status_code == 401
    assert tc.delete(
        f"/api/documents/{doc_id}", headers={"Authorization": "Bearer secret"}
    ).status_code == 200
