"""Reindex over a temp docs tree: reserved-dir exclusion, skipped[], removal, FTS smoke."""
from pathlib import Path

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
