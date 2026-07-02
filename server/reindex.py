"""Rebuild the SQLite document store from the canonical docs/ tree.

docs/ is the source of truth; the DB is disposable. This is also the drift-repair
tool — manual edits, API-down fallback writes, and `git reset`s are all cured by a
full rebuild. Run as `python -m server.reindex`. It NEVER runs git.
"""
from __future__ import annotations

import datetime
import re
import sqlite3
import time
from pathlib import Path
from typing import Optional

from server import config, db, documents

# Generated agentic-workspace internals that live inside the MkDocs content root
# (docs/current/*.md, docs/versions/**/*.md). They carry no explainer frontmatter,
# so their whole subtree is excluded from the walk — this keeps reindex output
# clean: `indexed` counts only real explainers and `skipped[]` stays signal, not
# noise. See phase.md "Discovered consideration".
RESERVED_DIRS = {"current", "versions"}

# '<YYYY-MM-DD>-<slug>.md'
_FILENAME_RE = re.compile(r"^(\d{4}-\d{2}-\d{2})-(.+)\.md$")


def _index_file(
    conn: sqlite3.Connection, root: Path, path: Path, rel: str
) -> tuple[bool, Optional[str]]:
    """Upsert one walked file. Returns (indexed, skip_reason)."""
    m = _FILENAME_RE.match(path.name)
    if not m:
        return False, "filename not <YYYY-MM-DD>-<slug>.md"
    date_from_name, slug_from_name = m.group(1), m.group(2)
    project = Path(rel).parts[0]

    try:
        text = path.read_text(encoding="utf-8")
    except (OSError, UnicodeDecodeError) as exc:
        return False, f"unreadable: {exc}"

    try:
        meta, body = documents.parse_frontmatter(text)
    except documents.FrontmatterError as exc:
        return False, f"missing/invalid frontmatter: {exc}"

    title = meta.get("title")
    if not isinstance(title, str) or not title.strip():
        return False, "missing/invalid frontmatter: no title"

    date_val = meta.get("date")
    if isinstance(date_val, datetime.date):
        date_val = date_val.isoformat()
    date_val = str(date_val) if date_val else date_from_name
    try:
        documents.validate_date(date_val)
    except documents.ConventionError:
        return False, "missing/invalid frontmatter: bad date"

    raw_tags = meta.get("tags")
    tags = [str(t) for t in raw_tags] if isinstance(raw_tags, list) else []

    source = meta.get("source")
    source_repo = None
    if isinstance(source, dict) and source.get("repo") is not None:
        source_repo = str(source.get("repo"))

    try:
        db.upsert_document(
            conn,
            project=project,
            slug=slug_from_name,
            date=date_val,
            title=title,
            tags=tags,
            source_repo=source_repo,
            rel_path=rel,
            markdown=body.lstrip("\n"),
        )
    except sqlite3.Error as exc:
        return False, f"db error: {exc}"
    return True, None


def reindex(
    conn: Optional[sqlite3.Connection] = None,
    docs_root: Optional[Path] = None,
) -> dict:
    """Walk docs/<subdir>/**/*.md, upsert valid explainers, delete vanished rows.

    Returns {indexed, removed, skipped:[{rel_path, reason}], duration_ms}. Reserved
    top-level dirs and top-level files never enter the walk.
    """
    start = time.monotonic()
    own_conn = conn is None
    if conn is None:
        conn = db.connect()
    root = Path(docs_root) if docs_root is not None else config.docs_root()

    indexed = 0
    skipped: list[dict] = []
    disk_rel_paths: set[str] = set()

    if root.is_dir():
        for sub in sorted(root.iterdir()):
            if not sub.is_dir():
                continue  # top-level files (index.md, tags.md, README.md, ...) are never walked
            if sub.name in RESERVED_DIRS:
                continue  # reserved internals: silently excluded
            for path in sorted(sub.rglob("*.md")):
                if not path.is_file():
                    continue
                rel = path.relative_to(root).as_posix()
                disk_rel_paths.add(rel)
                ok, reason = _index_file(conn, root, path, rel)
                if ok:
                    indexed += 1
                else:
                    skipped.append({"rel_path": rel, "reason": reason})

    # Delete DB rows whose file vanished from disk (drift repair).
    removed = 0
    for row in conn.execute("SELECT rel_path FROM documents").fetchall():
        if row["rel_path"] not in disk_rel_paths:
            db.delete_document_by_path(conn, row["rel_path"])
            removed += 1

    duration_ms = int((time.monotonic() - start) * 1000)
    if own_conn:
        conn.close()
    return {
        "indexed": indexed,
        "removed": removed,
        "skipped": skipped,
        "duration_ms": duration_ms,
    }


def _main() -> int:
    result = reindex()
    print(f"indexed: {result['indexed']}")
    print(f"removed: {result['removed']}")
    print(f"skipped: {len(result['skipped'])}")
    for item in result["skipped"]:
        print(f"  - {item['rel_path']}: {item['reason']}")
    print(f"duration_ms: {result['duration_ms']}")
    return 0


if __name__ == "__main__":
    raise SystemExit(_main())
