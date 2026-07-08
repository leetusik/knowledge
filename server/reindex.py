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

from server import config, db, documents, embeddings

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


# Per-request 429-backoff retries for the batch embed sync (documents only).
_EMBED_RETRIES = 6


def _sync_embeddings(conn: sqlite3.Connection) -> dict:
    """Content-hash-cached embedding sync over the current documents.

    Embeds only missing/stale rows and persists each one as it succeeds, so a
    mid-run rate-limit never discards progress — the content-hash cache lets a later
    reindex pick up exactly the docs that still lack a current vector. Cache hits are
    untouched; orphaned/model-mismatched vectors are cleared. Every failure is
    non-fatal and reported: no key -> skipped; per-doc API failures are counted and
    surfaced in ``skipped_reason``. Report: {embedded, cached, removed, skipped_reason?}.
    """
    if not config.embeddings_enabled():
        return {"embedded": 0, "cached": 0, "removed": 0, "skipped_reason": "no api key"}

    model = config.embedding_model()
    hashes = db.get_embedding_hashes(conn, model)
    docs = conn.execute("SELECT id, title, markdown FROM documents").fetchall()

    stale: list[tuple[int, str, str]] = []  # (doc_id, content_hash, embed_text)
    cached = 0
    for d in docs:
        h = embeddings.content_hash(model, d["title"], d["markdown"])
        if hashes.get(int(d["id"])) == h:
            cached += 1
        else:
            stale.append(
                (int(d["id"]), h, embeddings.document_input(d["title"], d["markdown"]))
            )

    embedded = 0
    failed = 0
    for doc_id, h, text in stale:
        try:
            vec = embeddings.embed_texts([text], kind="document", retries=_EMBED_RETRIES)[0]
        except embeddings.EmbeddingError:
            failed += 1
            continue  # persisted progress stands; a later reindex retries this doc
        db.upsert_embedding(
            conn, doc_id=doc_id, model=model, content_hash=h,
            dims=len(vec), vector=embeddings.pack_vector(vec),
        )
        embedded += 1

    removed = db.delete_orphan_embeddings(conn, model)
    report = {"embedded": embedded, "cached": cached, "removed": removed}
    if failed:
        report["skipped_reason"] = f"{failed} of {len(stale)} embeds failed (rate limit / API)"
    return report


def reindex(
    conn: Optional[sqlite3.Connection] = None,
    docs_root: Optional[Path] = None,
) -> dict:
    """Walk docs/<subdir>/**/*.md, upsert valid explainers, delete vanished rows.

    Returns {indexed, removed, skipped:[{rel_path, reason}], embeddings:{...},
    duration_ms}. Reserved top-level dirs and top-level files never enter the walk.
    The embedding-sync step (content-hash cached) runs after the docs walk; keep it
    in any future reindex refactor (see phase.md cross-slice note for S3).
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

    embeddings_report = _sync_embeddings(conn)

    duration_ms = int((time.monotonic() - start) * 1000)
    if own_conn:
        conn.close()
    return {
        "indexed": indexed,
        "removed": removed,
        "skipped": skipped,
        "embeddings": embeddings_report,
        "duration_ms": duration_ms,
    }


def _main() -> int:
    result = reindex()
    print(f"indexed: {result['indexed']}")
    print(f"removed: {result['removed']}")
    print(f"skipped: {len(result['skipped'])}")
    for item in result["skipped"]:
        print(f"  - {item['rel_path']}: {item['reason']}")
    emb = result.get("embeddings", {})
    print(
        "embeddings: "
        f"embedded={emb.get('embedded', 0)} cached={emb.get('cached', 0)} "
        f"removed={emb.get('removed', 0)}"
        + (f" skipped_reason={emb['skipped_reason']}" if emb.get("skipped_reason") else "")
    )
    print(f"duration_ms: {result['duration_ms']}")
    return 0


if __name__ == "__main__":
    raise SystemExit(_main())
