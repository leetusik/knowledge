"""Reindex over a temp docs tree: reserved-dir exclusion, skipped[], removal, FTS smoke."""
from pathlib import Path

import pytest

from server import db, reindex

_EXPLAINER = (
    '---\n'
    'title: "Hello nginx"\n'
    'date: 2026-07-02\n'
    'tags:\n'
    '  - docker\n'
    '  - nginx\n'
    'source:\n'
    '  project: proj\n'
    '  repo: /tmp/proj\n'
    '---\n\n'
    '# Hello nginx\n\nReverse proxy notes.\n'
)


def _write(p: Path, text: str) -> None:
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(text, encoding="utf-8")


def _setup(tmp_path, monkeypatch) -> Path:
    monkeypatch.setenv("KB_ROOT", str(tmp_path))
    monkeypatch.setenv("KB_DB_PATH", str(tmp_path / "data" / "kb.sqlite3"))
    docs = tmp_path / "docs"
    _write(docs / "proj" / "2026-07-02-hello-nginx.md", _EXPLAINER)   # valid
    _write(docs / "current" / "backend.md", "# generated, no frontmatter\n")  # reserved -> never walked
    _write(docs / "proj" / "2026-07-02-broken.md", "no frontmatter here\n")   # malformed -> skipped
    return docs


def test_reindex_index_skip_and_remove(tmp_path, monkeypatch):
    docs = _setup(tmp_path, monkeypatch)

    result = reindex.reindex()
    assert result["indexed"] == 1
    assert result["removed"] == 0
    skipped = {s["rel_path"] for s in result["skipped"]}
    assert "proj/2026-07-02-broken.md" in skipped
    assert not any(p.startswith("current/") for p in skipped)  # reserved dir excluded, not noisy-skipped

    conn = db.connect()
    row = conn.execute(
        "SELECT title FROM documents_fts WHERE documents_fts MATCH 'nginx'"
    ).fetchone()
    assert row["title"] == "Hello nginx"
    conn.close()

    (docs / "proj" / "2026-07-02-hello-nginx.md").unlink()
    result2 = reindex.reindex()
    assert result2["indexed"] == 0
    assert result2["removed"] == 1


# Tests for reindex_path incremental single-path reindex.


def test_reindex_path_edits_file(tmp_path, monkeypatch):
    """reindex_path on an edited file updates just that row."""
    docs = _setup(tmp_path, monkeypatch)

    # Index the valid doc.
    result = reindex.reindex()
    assert result["indexed"] == 1
    conn = db.connect()
    row = conn.execute("SELECT title FROM documents WHERE rel_path = ?",
                      ("proj/2026-07-02-hello-nginx.md",)).fetchone()
    assert row["title"] == "Hello nginx"
    conn.close()

    # Edit the file and reindex_path.
    edited_explainer = _EXPLAINER.replace("Hello nginx", "Hello world")
    _write(docs / "proj" / "2026-07-02-hello-nginx.md", edited_explainer)

    result2 = reindex.reindex_path("proj/2026-07-02-hello-nginx.md")
    assert result2["action"] == "indexed"
    assert "reason" not in result2

    # Verify the row was updated.
    conn = db.connect()
    row = conn.execute("SELECT title FROM documents WHERE rel_path = ?",
                      ("proj/2026-07-02-hello-nginx.md",)).fetchone()
    assert row["title"] == "Hello world"
    conn.close()


def test_reindex_path_removes_file(tmp_path, monkeypatch):
    """reindex_path on a vanished file removes the row."""
    docs = _setup(tmp_path, monkeypatch)

    # Index the valid doc.
    result = reindex.reindex()
    assert result["indexed"] == 1

    # Delete the file and reindex_path.
    (docs / "proj" / "2026-07-02-hello-nginx.md").unlink()
    result2 = reindex.reindex_path("proj/2026-07-02-hello-nginx.md")
    assert result2["action"] == "removed"
    assert "reason" not in result2

    # Verify the row was deleted.
    conn = db.connect()
    row = conn.execute("SELECT id FROM documents WHERE rel_path = ?",
                      ("proj/2026-07-02-hello-nginx.md",)).fetchone()
    assert row is None
    conn.close()


def test_reindex_path_vanished_no_row(tmp_path, monkeypatch):
    """reindex_path on a vanished file with no DB row returns skipped."""
    docs = _setup(tmp_path, monkeypatch)

    # Call reindex_path on a file that never existed in the DB.
    result = reindex.reindex_path("proj/2026-07-02-nonexistent.md")
    assert result["action"] == "skipped"
    assert result["reason"] == "no such document"


def test_reindex_path_invalid_rel_paths(tmp_path, monkeypatch):
    """reindex_path with invalid rel_path raises ValueError."""
    docs = _setup(tmp_path, monkeypatch)

    # Absolute path.
    with pytest.raises(ValueError, match="relative"):
        reindex.reindex_path("/absolute/path.md")

    # Contains ".."
    with pytest.raises(ValueError, match=".."):
        reindex.reindex_path("proj/../../../evil.md")

    # Too few parts.
    with pytest.raises(ValueError, match="at least 2 parts"):
        reindex.reindex_path("onlyfile.md")

    # Reserved top dir.
    with pytest.raises(ValueError, match="reserved dir"):
        reindex.reindex_path("current/some.md")
    with pytest.raises(ValueError, match="reserved dir"):
        reindex.reindex_path("versions/some.md")

    # Non-.md
    with pytest.raises(ValueError, match=".md"):
        reindex.reindex_path("proj/2026-07-02-hello.txt")


def test_reindex_path_api_endpoint(tmp_path, monkeypatch):
    """POST /api/reindex with {"rel_path": ...} returns the incremental report."""
    from fastapi.testclient import TestClient
    from server import main

    docs = _setup(tmp_path, monkeypatch)

    # Full reindex to establish baseline.
    reindex.reindex()

    # Edit a doc.
    edited_explainer = _EXPLAINER.replace("Hello nginx", "Hello updated")
    _write(docs / "proj" / "2026-07-02-hello-nginx.md", edited_explainer)

    # Call the API with rel_path.
    client = TestClient(main.app)
    response = client.post("/api/reindex", json={"rel_path": "proj/2026-07-02-hello-nginx.md"})
    assert response.status_code == 200
    result = response.json()
    assert result["rel_path"] == "proj/2026-07-02-hello-nginx.md"
    assert result["action"] == "indexed"
    assert "embeddings" in result
    assert "duration_ms" in result


def test_reindex_path_api_invalid(tmp_path, monkeypatch):
    """POST /api/reindex with invalid rel_path returns 422."""
    from fastapi.testclient import TestClient
    from server import main

    _setup(tmp_path, monkeypatch)

    client = TestClient(main.app)
    response = client.post("/api/reindex", json={"rel_path": "/absolute/path.md"})
    assert response.status_code == 422


def test_startup_reindex_self_heal(tmp_path, monkeypatch):
    """With KB_STARTUP_REINDEX=1, TestClient app runs startup reindex + heals drift."""
    from fastapi.testclient import TestClient
    from server import main

    monkeypatch.setenv("KB_ROOT", str(tmp_path))
    monkeypatch.setenv("KB_DB_PATH", str(tmp_path / "data" / "kb.sqlite3"))
    monkeypatch.setenv("KB_STARTUP_REINDEX", "1")  # Enable startup reindex.

    # Write a doc file but do NOT add it to the DB (drift).
    docs = tmp_path / "docs"
    _write(docs / "proj" / "2026-07-02-hello-nginx.md", _EXPLAINER)

    # Create the app with TestClient (lifespan runs, startup reindex heals).
    with TestClient(main.app) as client:
        # The startup reindex should have indexed the file.
        response = client.get("/api/documents")
        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 1
        assert data["items"][0]["title"] == "Hello nginx"
