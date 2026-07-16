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
    conn: sqlite3.Connection, root: Path, path: Path, rel: str, tenant_id: str = ""
) -> tuple[bool, Optional[str]]:
    """Upsert one walked file under ``tenant_id``. Returns (indexed, skip_reason).

    ``tenant_id`` is the owning tenant's id, re-derived from the file's content
    root by the caller (``''`` for the public ``docs/`` root in legacy mode /
    tenant #1; the ``<uuid>`` dir name for a namespaced ``tenants/<uuid>/`` root).
    It is stamped onto ``documents.tenant_id`` so a rebuilt DB re-derives tenant
    identity from the path alone (hard coupling #1)."""
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

    raw_related = meta.get("related")
    related = [str(x) for x in raw_related] if isinstance(raw_related, list) else []

    source = meta.get("source")
    source_repo = None
    if isinstance(source, dict) and source.get("repo") is not None:
        source_repo = documents.sanitize_source_repo(str(source.get("repo"))) or None

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
            related=related,
            tenant_id=tenant_id,
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


def reindex_path(
    rel_path: str,
    conn: Optional[sqlite3.Connection] = None,
    docs_root: Optional[Path] = None,
    tenant_one_id=None,
) -> dict:
    """Index a single path or delete a vanished row — incremental single-path reindex.

    Validate rel_path (raise ValueError on absolute, .., <2 parts, reserved top dir,
    non-.md). If file exists, index via _index_file. If missing, delete from DB.
    Then run _sync_embeddings (best-effort). Returns {rel_path, action, reason?,
    embeddings:{...}, duration_ms}. Action is "indexed"/"skipped" (file exists) or
    "removed"/"skipped" (file missing).

    Stays ``docs/``-scoped (tenant #1 / legacy): ``tenant_one_id`` (set only in
    tenant mode) supplies the ``docs/`` root's tenant_id, so the row is stamped
    for and scoped to tenant #1. Per-tenant single-path reindex isn't needed in
    P10 — a namespaced tenant relies on the full boot reindex.
    """
    start = time.monotonic()
    own_conn = conn is None
    if conn is None:
        conn = db.connect()
    root = Path(docs_root) if docs_root is not None else config.docs_root()
    tenant_id = str(tenant_one_id) if tenant_one_id else ""

    # Validate rel_path.
    if Path(rel_path).is_absolute():
        raise ValueError("rel_path must be relative")
    if ".." in Path(rel_path).parts:
        raise ValueError("rel_path must not contain '..'")
    parts = Path(rel_path).parts
    if len(parts) < 2:
        raise ValueError("rel_path must have at least 2 parts (project/file)")
    if parts[0] in RESERVED_DIRS:
        raise ValueError(f"rel_path top dir cannot be a reserved dir: {parts[0]}")
    if not rel_path.endswith(".md"):
        raise ValueError("rel_path must end with .md")

    # Index or delete.
    action: str
    reason: Optional[str] = None
    full_path = root / rel_path

    if full_path.is_file():
        ok, reason = _index_file(conn, root, full_path, rel_path, tenant_id)
        action = "indexed" if ok else "skipped"
    else:
        # File missing — delete from DB if present (scoped to this root's tenant).
        rowcount = db.delete_document_by_path(conn, rel_path, tenant_id=tenant_id)
        action = "removed" if rowcount >= 1 else "skipped"
        if action == "skipped":
            reason = "no such document"

    # Sync embeddings (content-hash-cached, best-effort).
    embeddings_report = _sync_embeddings(conn)

    duration_ms = int((time.monotonic() - start) * 1000)
    if own_conn:
        conn.close()

    result = {
        "rel_path": rel_path,
        "action": action,
        "embeddings": embeddings_report,
        "duration_ms": duration_ms,
    }
    if reason is not None:
        result["reason"] = reason
    return result


def _walk_root(
    conn: sqlite3.Connection,
    root: Path,
    tenant_id: str,
    disk_by_tenant: dict[str, set[str]],
) -> tuple[int, list[dict]]:
    """Walk one content root (``docs/`` or ``tenants/<uuid>/``), upserting each
    valid ``<subdir>/**/*.md`` explainer under ``tenant_id`` and recording its
    rel_path in ``disk_by_tenant[tenant_id]`` for the tenant-scoped vanished-row
    cleanup. Reserved top-level dirs and top-level files never enter the walk.
    Returns (indexed, skipped)."""
    indexed = 0
    skipped: list[dict] = []
    seen = disk_by_tenant.setdefault(tenant_id, set())
    if not root.is_dir():
        return indexed, skipped
    for sub in sorted(root.iterdir()):
        if not sub.is_dir():
            continue  # top-level files (index.md, tags.md, README.md, ...) are never walked
        if sub.name in RESERVED_DIRS:
            continue  # reserved internals: silently excluded
        for path in sorted(sub.rglob("*.md")):
            if not path.is_file():
                continue
            rel = path.relative_to(root).as_posix()
            seen.add(rel)
            ok, reason = _index_file(conn, root, path, rel, tenant_id)
            if ok:
                indexed += 1
            else:
                skipped.append({"rel_path": rel, "reason": reason})
    return indexed, skipped


def reindex(
    conn: Optional[sqlite3.Connection] = None,
    docs_root: Optional[Path] = None,
    tenant_one_id=None,
) -> dict:
    """Walk every content root, upsert valid explainers, delete vanished rows.

    Two kinds of root, each re-deriving ``tenant_id`` from the path (hard coupling
    #1 — a rebuilt DB re-stamps tenancy from files alone):

    * The **public root** ``docs/`` — tenant #1 in tenant mode (``tenant_one_id``
      supplied) or the ``''`` legacy sentinel when unset. This keeps the live
      hi2vi corpus + legacy single-tenant deployments byte-identical.
    * Each **namespaced non-published root** ``<KB_ROOT>/tenants/<uuid>/`` — a
      sibling of ``docs/`` that mkdocs never serves; the ``<uuid>`` dir name IS
      the tenant_id.

    Returns {indexed, removed, skipped:[{rel_path, reason}], embeddings:{...},
    duration_ms}. The vanished-row cleanup is tenant-scoped: a row is stale only if
    its ``(tenant_id, rel_path)`` isn't on disk, so one tenant's reindex never
    deletes another tenant's rows. The embedding-sync step (content-hash cached)
    runs after the walk; keep it in any future reindex refactor.
    """
    start = time.monotonic()
    own_conn = conn is None
    if conn is None:
        conn = db.connect()
    root = Path(docs_root) if docs_root is not None else config.docs_root()

    indexed = 0
    skipped: list[dict] = []
    # rel_paths present on disk, grouped by tenant_id, for the tenant-scoped
    # vanished-row cleanup.
    disk_by_tenant: dict[str, set[str]] = {}

    # 1. Public root (docs/): tenant #1 in tenant mode, else the '' legacy sentinel.
    public_tid = str(tenant_one_id) if tenant_one_id else ""
    n, s = _walk_root(conn, root, public_tid, disk_by_tenant)
    indexed += n
    skipped += s

    # 2. Namespaced non-published roots: <KB_ROOT>/tenants/<uuid>/. Each dir name
    #    IS the tenant_id (re-derived from the path). Absent when no non-#1 tenant
    #    has written on this box — then this is a no-op (legacy/local stays clean).
    tenants_root = config.kb_root() / "tenants"
    if tenants_root.is_dir():
        for tdir in sorted(tenants_root.iterdir()):
            if not tdir.is_dir():
                continue
            n, s = _walk_root(conn, tdir, tdir.name, disk_by_tenant)
            indexed += n
            skipped += s

    # Delete DB rows whose file vanished from disk (drift repair), tenant-scoped:
    # a row is stale only if its (tenant_id, rel_path) is not on disk for THAT
    # tenant. A tenant with no dir on this box has no disk set -> all its rows are
    # stale and cleared (the DB is disposable; files are canonical).
    removed = 0
    for row in conn.execute("SELECT tenant_id, rel_path FROM documents").fetchall():
        tid = row["tenant_id"]
        rel = row["rel_path"]
        if rel not in disk_by_tenant.get(tid, set()):
            db.delete_document_by_path(conn, rel, tenant_id=tid)
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
    import sys
    if len(sys.argv) > 1:
        # Single-path reindex with optional rel_path argument.
        rel_path = sys.argv[1]
        try:
            result = reindex_path(rel_path)
        except ValueError as exc:
            print(f"error: {exc}", file=sys.stderr)
            return 1
        print(f"rel_path: {result['rel_path']}")
        print(f"action: {result['action']}")
        if "reason" in result:
            print(f"reason: {result['reason']}")
        emb = result.get("embeddings", {})
        print(
            "embeddings: "
            f"embedded={emb.get('embedded', 0)} cached={emb.get('cached', 0)} "
            f"removed={emb.get('removed', 0)}"
            + (f" skipped_reason={emb['skipped_reason']}" if emb.get("skipped_reason") else "")
        )
        print(f"duration_ms: {result['duration_ms']}")
        return 0
    else:
        # Full reindex (unchanged).
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
