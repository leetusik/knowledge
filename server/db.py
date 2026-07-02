"""SQLite storage: `documents` + external-content FTS5 index kept in sync by triggers.

The DB (data/kb.sqlite3) is disposable — reindex rebuilds it from the canonical
docs/ tree. WAL mode gives read concurrency; the write path (a later slice) runs
under a single-process lock. External-content FTS5 (not contentless) is chosen so
snippet()/highlight() work over the stored body.
"""
from __future__ import annotations

import datetime
import json
import sqlite3
from pathlib import Path
from typing import Any, Optional

from server import config

# Idempotent schema. The trigger trio mirrors documents into documents_fts using
# the external-content 'delete' protocol (an INSERT of the OLD row values with the
# 'delete' command locates and removes the FTS entry).
_SCHEMA = """
CREATE TABLE IF NOT EXISTS documents (
  id          INTEGER PRIMARY KEY,
  project     TEXT NOT NULL,
  slug        TEXT NOT NULL,
  date        TEXT NOT NULL CHECK (date GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
  title       TEXT NOT NULL,
  tags        TEXT NOT NULL DEFAULT '[]',   -- JSON array
  tags_text   TEXT NOT NULL DEFAULT '',     -- space-joined tags, for FTS
  source_repo TEXT,
  rel_path    TEXT NOT NULL UNIQUE,         -- '<project>/<date>-<slug>.md' relative to docs/
  markdown    TEXT NOT NULL,                -- body WITHOUT frontmatter
  created_at  TEXT NOT NULL,
  updated_at  TEXT NOT NULL,
  UNIQUE (project, date, slug)
);

CREATE VIRTUAL TABLE IF NOT EXISTS documents_fts USING fts5(
  title, tags_text, markdown,
  content='documents', content_rowid='id', tokenize='porter unicode61'
);

CREATE TRIGGER IF NOT EXISTS documents_ai AFTER INSERT ON documents BEGIN
  INSERT INTO documents_fts(rowid, title, tags_text, markdown)
  VALUES (new.id, new.title, new.tags_text, new.markdown);
END;

CREATE TRIGGER IF NOT EXISTS documents_ad AFTER DELETE ON documents BEGIN
  INSERT INTO documents_fts(documents_fts, rowid, title, tags_text, markdown)
  VALUES ('delete', old.id, old.title, old.tags_text, old.markdown);
END;

CREATE TRIGGER IF NOT EXISTS documents_au AFTER UPDATE ON documents BEGIN
  INSERT INTO documents_fts(documents_fts, rowid, title, tags_text, markdown)
  VALUES ('delete', old.id, old.title, old.tags_text, old.markdown);
  INSERT INTO documents_fts(rowid, title, tags_text, markdown)
  VALUES (new.id, new.title, new.tags_text, new.markdown);
END;
"""

# FUTURE EXTENSION POINT (not this phase): add a sqlite-vec virtual table
# document_chunks_vec(embedding float[N], document_id, chunk_ix, ...) beside this
# schema; server/search.py then fuses bm25 + vector signals (RRF). No embeddings
# are computed now — this seam is intentionally left clean.


def _now() -> str:
    return datetime.datetime.now().astimezone().isoformat(timespec="seconds")


def init_db(conn: sqlite3.Connection) -> None:
    """Create tables/triggers if absent (idempotent)."""
    conn.executescript(_SCHEMA)
    conn.commit()


def connect(path: Optional[Path] = None) -> sqlite3.Connection:
    """Open (creating parent dirs), enable WAL + Row factory, ensure schema."""
    db_file = Path(path) if path is not None else config.db_path()
    db_file.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(db_file))
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL;")
    conn.execute("PRAGMA foreign_keys=ON;")
    init_db(conn)
    return conn


def _row_to_dict(row: Optional[sqlite3.Row]) -> Optional[dict[str, Any]]:
    if row is None:
        return None
    d = dict(row)
    try:
        d["tags"] = json.loads(d.get("tags") or "[]")
    except (TypeError, json.JSONDecodeError):
        d["tags"] = []
    return d


def upsert_document(
    conn: sqlite3.Connection,
    *,
    project: str,
    slug: str,
    date: str,
    title: str,
    tags: list[str],
    source_repo: Optional[str],
    rel_path: str,
    markdown: str,
    now: Optional[str] = None,
) -> int:
    """Insert or update by rel_path. Preserves created_at, refreshes updated_at.

    Returns the row id.
    """
    ts = now or _now()
    tags = list(tags)
    tags_json = json.dumps(tags, ensure_ascii=False)
    tags_text = " ".join(tags)
    conn.execute(
        """
        INSERT INTO documents
          (project, slug, date, title, tags, tags_text, source_repo, rel_path,
           markdown, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(rel_path) DO UPDATE SET
          project     = excluded.project,
          slug        = excluded.slug,
          date        = excluded.date,
          title       = excluded.title,
          tags        = excluded.tags,
          tags_text   = excluded.tags_text,
          source_repo = excluded.source_repo,
          markdown    = excluded.markdown,
          updated_at  = excluded.updated_at
        """,
        (project, slug, date, title, tags_json, tags_text, source_repo, rel_path,
         markdown, ts, ts),
    )
    conn.commit()
    row = conn.execute(
        "SELECT id FROM documents WHERE rel_path = ?", (rel_path,)
    ).fetchone()
    return int(row["id"])


def get_document(conn: sqlite3.Connection, doc_id: int) -> Optional[dict[str, Any]]:
    row = conn.execute("SELECT * FROM documents WHERE id = ?", (doc_id,)).fetchone()
    return _row_to_dict(row)


def get_document_by_path(
    conn: sqlite3.Connection, rel_path: str
) -> Optional[dict[str, Any]]:
    row = conn.execute(
        "SELECT * FROM documents WHERE rel_path = ?", (rel_path,)
    ).fetchone()
    return _row_to_dict(row)


def _filtered(sql_head: str, project: Optional[str], tag: Optional[str]):
    """Build a (sql, params) pair applying optional project/tag filters.

    The tag filter joins json_each(documents.tags) so a JSON-array membership test
    stays index-agnostic and correct for any tag.
    """
    sql = sql_head
    params: list[Any] = []
    if tag is not None:
        sql += " JOIN json_each(documents.tags) AS je ON je.value = ?"
        params.append(tag)
    where = []
    if project is not None:
        where.append("documents.project = ?")
        params.append(project)
    if where:
        sql += " WHERE " + " AND ".join(where)
    return sql, params


def list_documents(
    conn: sqlite3.Connection,
    project: Optional[str] = None,
    tag: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
) -> list[dict[str, Any]]:
    """Newest-first (date DESC, id DESC), optional project/tag filters."""
    sql, params = _filtered("SELECT documents.* FROM documents", project, tag)
    sql += " ORDER BY documents.date DESC, documents.id DESC LIMIT ? OFFSET ?"
    params.extend([limit, offset])
    rows = conn.execute(sql, params).fetchall()
    return [d for d in (_row_to_dict(r) for r in rows) if d is not None]


def count_documents(
    conn: sqlite3.Connection,
    project: Optional[str] = None,
    tag: Optional[str] = None,
) -> int:
    sql, params = _filtered("SELECT COUNT(*) AS n FROM documents", project, tag)
    row = conn.execute(sql, params).fetchone()
    return int(row["n"])


def delete_document_by_path(conn: sqlite3.Connection, rel_path: str) -> int:
    """Delete by rel_path (FTS row cleaned by the AFTER DELETE trigger). Returns rowcount."""
    cur = conn.execute("DELETE FROM documents WHERE rel_path = ?", (rel_path,))
    conn.commit()
    return cur.rowcount
