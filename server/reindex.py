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

from server import assets as assets_mod
from server import books, config, db, documents, embeddings, native_ingest

# Generated agentic-workspace internals that live inside the MkDocs content root
# (docs/current/*.md, docs/versions/**/*.md). They carry no explainer frontmatter,
# so their whole subtree is excluded from the walk — this keeps reindex output
# clean: `indexed` counts only real explainers and `skipped[]` stays signal, not
# noise. See phase.md "Discovered consideration".
#
# `.versions` (documents.ARCHIVE_DIR, P23) joins them for a different reason: its
# files DO carry explainer frontmatter, so nothing but this exclusion keeps
# superseded bodies out of `documents`, out of FTS/embeddings and out of the graph.
# It is walked separately by _walk_versions into the document_versions table.
# NOTE: Path.rglob does NOT skip dot-dirs — the exclusion must be explicit here and
# in scripts/graph_hook.py + scripts/site_smoke.py.
#
# `.books` (P30.S2) holds the book manifests (JSON, never an explainer); it is walked
# by _walk_books into the books / chapters / chapter_variants tables.
#
# `.assets` (P30.S4) holds chapter images (content-addressed bytes, never an
# explainer). Nothing walks it: each version's asset map lives in its own header.
RESERVED_DIRS = {
    "current", "versions", documents.ARCHIVE_DIR, books.BOOKS_DIR, assets_mod.ASSETS_DIR,
}

# '<YYYY-MM-DD>-<slug>.{md,html}' — group(1) date, group(2) slug, group(3) ext.
_FILENAME_RE = re.compile(r"^(\d{4}-\d{2}-\d{2})-(.+)\.(md|html)$")


def _version_from_meta(meta: dict) -> int:
    """The doc's version number from its frontmatter — absent/garbage ⇒ 1.

    Pre-P23 files carry no ``version:`` field and are implicitly v1, so there is no
    migration: the whole corpus reads back as v1 until something bumps it.
    """
    raw = meta.get("version")
    try:
        value = int(raw)  # type: ignore[arg-type]
    except (TypeError, ValueError):
        return 1
    return value if value >= 1 else 1


def _header_extras(meta: dict) -> dict:
    """The optional P30.S2 header fields, re-derived leniently from frontmatter.

    ``lang`` / ``subject`` / ``translated_from`` are informational: a malformed value
    reads back as absent (``None``) rather than skipping the whole document, which
    stays indexed exactly as before P30.
    """
    out: dict = {"lang": None, "subject": None, "translated_from": None, "assets": None}
    try:
        if meta.get("lang") is not None:
            out["lang"] = books.validate_lang(str(meta.get("lang")))
    except documents.ConventionError:
        pass
    subject = meta.get("subject")
    if isinstance(subject, str) and subject.strip():
        out["subject"] = subject
    try:
        out["translated_from"] = books.validate_translated_from(meta.get("translated_from"))
    except documents.ConventionError:
        pass
    # P30.S4: the version's asset map; malformed entries are dropped, not fatal.
    out["assets"] = assets_mod.parse_asset_map(meta.get("assets"))
    return out


def _body_columns(
    text: str, body: str, meta: dict, is_html: bool
) -> tuple[str, Optional[str], Optional[str], str]:
    """``(markdown, raw_html, source, format)`` for one walked file.

    The body rule, which must match the write path so a fresh-DB rebuild reproduces
    the same rows: the DB ``markdown`` column always holds readable text — the raw
    markdown for an md doc, extracted plain text for an html doc, and the search
    projection for a native chapter — while ``raw_html`` carries the raw HTML only
    for html docs and ``source`` the whole file only for native ones. ``format``
    comes from the header (P29 *Format flag*): a ``.md`` file whose header says
    ``format: native`` is native; the extension alone still means md or html.
    """
    if is_html:
        body_stripped = body.lstrip("\n")
        return documents.extract_html_text(body_stripped), body_stripped, None, "html"
    if documents.is_native_meta(meta):
        source = text.replace("\r\n", "\n").replace("\r", "\n")
        return native_ingest.stored_projection(source), None, source, "native"
    return body.lstrip("\n"), None, None, "md"


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
        return False, "filename not <YYYY-MM-DD>-<slug>.{md,html}"
    date_from_name, slug_from_name = m.group(1), m.group(2)
    is_html = m.group(3) == "html"
    project = Path(rel).parts[0]

    try:
        text = path.read_text(encoding="utf-8")
    except (OSError, UnicodeDecodeError) as exc:
        return False, f"unreadable: {exc}"

    try:
        if is_html:
            meta, body = documents.parse_html_frontmatter(text)
        else:
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

    markdown_val, raw_html_val, source_val, fmt = _body_columns(text, body, meta, is_html)

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
            markdown=markdown_val,
            related=related,
            format=fmt,
            raw_html=raw_html_val,
            version=_version_from_meta(meta),
            tenant_id=tenant_id,
            source=source_val,
            **_header_extras(meta),
        )
    except sqlite3.Error as exc:
        return False, f"db error: {exc}"
    return True, None


def _index_version_file(
    conn: sqlite3.Connection,
    root: Path,
    path: Path,
    arch_rel: str,
    tenant_id: str,
    current_by_stem: Optional[dict[str, set[str]]] = None,
) -> tuple[bool, Optional[str], Optional[str]]:
    """Upsert one archived version file into ``document_versions``.
    Returns ``(indexed, skip_reason, the document rel_path it was keyed under)``.

    The archive tree is canonical (the DB is disposable), so everything is re-derived
    from the file: its rel_path + version from the path
    (``.versions/<project>/<date>-<slug>/vNNNN.<ext>``), its metadata/body from the
    same frontmatter parsers the current-version walk uses, and ``created_at`` from
    the file's mtime (when the body was archived — the write path's own timestamp is
    gone once the DB is wiped). The body rule matches ``_index_file``: ``markdown``
    always holds readable text, ``raw_html`` only the html flavor's raw body.

    The chain is keyed by the CURRENT document's rel_path, found by stem (P30.S5):
    ``current_by_stem`` maps each stem to the current documents on disk, so the
    ``v0001.html`` of a document since migrated to ``<stem>.md`` joins that
    document's chain. A current document with the archive's own extension wins (two
    documents sharing a stem predate S5's one-document-per-stem rule); with no
    current document at all, the archive's own extension names it, as before.
    """
    parsed = documents.parse_archive_rel_path(arch_rel)
    if parsed is None:
        return False, "not a <project>/<date>-<slug>/vNNNN.{md,html} archive path", None
    version = parsed.version
    own = f"{parsed.stem}.{parsed.ext}"
    current = (current_by_stem or {}).get(parsed.stem, set())
    doc_rel = own if (own in current or not current) else sorted(current)[0]
    is_html = parsed.ext == "html"

    try:
        text = path.read_text(encoding="utf-8")
    except (OSError, UnicodeDecodeError) as exc:
        return False, f"unreadable: {exc}", None

    try:
        if is_html:
            meta, body = documents.parse_html_frontmatter(text)
        else:
            meta, body = documents.parse_frontmatter(text)
    except documents.FrontmatterError as exc:
        return False, f"missing/invalid frontmatter: {exc}", None

    title = meta.get("title")
    if not isinstance(title, str) or not title.strip():
        return False, "missing/invalid frontmatter: no title", None

    date_val = meta.get("date")
    if isinstance(date_val, datetime.date):
        date_val = date_val.isoformat()
    date_val = str(date_val) if date_val else ""
    try:
        documents.validate_date(date_val)
    except documents.ConventionError:
        return False, "missing/invalid frontmatter: bad date", None

    raw_tags = meta.get("tags")
    tags = [str(t) for t in raw_tags] if isinstance(raw_tags, list) else []

    markdown_val, raw_html_val, source_val, fmt = _body_columns(text, body, meta, is_html)

    try:
        archived_at = datetime.datetime.fromtimestamp(
            path.stat().st_mtime
        ).astimezone().isoformat(timespec="seconds")
    except OSError:  # pragma: no cover - defensive
        archived_at = None

    try:
        db.upsert_document_version(
            conn,
            rel_path=doc_rel,
            version=version,
            archive_path=arch_rel,
            title=title,
            date=date_val,
            tags=tags,
            markdown=markdown_val,
            format=fmt,
            raw_html=raw_html_val,
            tenant_id=tenant_id,
            created_at=archived_at,
            assets=assets_mod.parse_asset_map(meta.get("assets")),
            source=source_val,
        )
    except sqlite3.Error as exc:
        return False, f"db error: {exc}", None
    return True, None, doc_rel


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
    if not (rel_path.endswith(".md") or rel_path.endswith(".html")):
        raise ValueError("rel_path must end with .md or .html")

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
    valid ``<subdir>/**/*.{md,html}`` explainer under ``tenant_id`` and recording its
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
        # Both doc formats, merged into one deterministic (sorted) order so a rebuild
        # is stable regardless of extension.
        for path in sorted([*sub.rglob("*.md"), *sub.rglob("*.html")]):
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


def _walk_versions(
    conn: sqlite3.Connection,
    root: Path,
    tenant_id: str,
    archives_by_tenant: dict[str, set[tuple[str, str]]],
    current_rels: Optional[set[str]] = None,
) -> tuple[int, list[dict]]:
    """Walk one content root's ``.versions/`` archive tree into ``document_versions``.

    The mirror of ``_walk_root`` for superseded bodies: every
    ``.versions/<project>/<date>-<slug>/vNNNN.{md,html}`` is upserted under
    ``tenant_id`` and its archive rel_path recorded in ``archives_by_tenant`` for the
    tenant-scoped vanished-archive cleanup. Malformed entries are reported as skips
    (same shape as the document walk) rather than guessed at. Archived versions are
    never FTS-indexed, embedded or graphed — this walk touches only
    ``document_versions``. ``current_rels`` (the root's current documents on disk)
    keys each chain by stem (P30.S5). Returns (indexed, skipped)."""
    indexed = 0
    skipped: list[dict] = []
    seen = archives_by_tenant.setdefault(tenant_id, set())
    current_by_stem: dict[str, set[str]] = {}
    for rel in current_rels or ():
        current_by_stem.setdefault(db.rel_path_stem(rel), set()).add(rel)
    archive_root = root / documents.ARCHIVE_DIR
    if not archive_root.is_dir():
        return indexed, skipped
    for path in sorted([*archive_root.rglob("*.md"), *archive_root.rglob("*.html")]):
        if not path.is_file():
            continue
        arch_rel = path.relative_to(root).as_posix()
        ok, reason, doc_rel = _index_version_file(
            conn, root, path, arch_rel, tenant_id, current_by_stem
        )
        if ok:
            # The (document, archive file) pair: a row keyed under a document's OLD
            # rel_path (before an html -> native migration reached this box through
            # git) points at a live file but is no longer the chain's, and goes.
            seen.add((doc_rel, arch_rel))
            indexed += 1
        else:
            skipped.append({"rel_path": arch_rel, "reason": reason})
    return indexed, skipped


def _rebuild_books(
    conn: sqlite3.Connection,
    roots: list[tuple[Path, str]],
    books_by_tenant: dict[str, set[tuple[str, str]]],
) -> tuple[int, int, list[dict]]:
    """Rebuild the book tables from every root's ``.books/`` manifests (P30.S2).

    The third walk. Every ``.books/<project>/<book>.json`` under each ``(root,
    tenant_id)`` is validated (``books.read_manifest``) and its book row, chapters and
    variants written under that tenant; ``(project, slug)`` is recorded in
    ``books_by_tenant`` for the vanished-book cleanup. The rows are a pure function of
    the files, so a wiped DB is rebuilt exactly.

    It runs as ONE transaction: every chapter/variant row is cleared first (so a
    document re-bound from one book to another never collides with its stale row on
    the one-chapter-per-document index) and the walk refills them, so a concurrent
    reader sees the old index or the new one, never an empty one. A malformed
    manifest, one whose slug disagrees with its file name, or one binding a document
    another book already binds is reported as a skip and indexes nothing (a
    savepoint undoes its partial rows; the cleanup then drops its stale book row).
    Returns (indexed, removed, skipped).
    """
    indexed = 0
    removed = 0
    skipped: list[dict] = []
    conn.execute("DELETE FROM chapter_variants")
    conn.execute("DELETE FROM chapters")
    for root, tenant_id in roots:
        seen = books_by_tenant.setdefault(tenant_id, set())
        for project, slug, path in books.iter_manifest_files(root):
            rel = path.relative_to(root).as_posix()
            try:
                manifest = books.read_manifest(root, project, slug)
            except documents.ConventionError as exc:
                skipped.append({"rel_path": rel, "reason": f"invalid book manifest: {exc}"})
                continue
            if manifest is None:  # pragma: no cover - raced away mid-walk
                continue
            conn.execute("SAVEPOINT book")
            try:
                db.replace_book(
                    conn, tenant_id=tenant_id, project=project, manifest=manifest,
                    manifest_path=rel, commit=False,
                )
            except sqlite3.IntegrityError:
                conn.execute("ROLLBACK TO SAVEPOINT book")
                conn.execute("RELEASE SAVEPOINT book")
                skipped.append(
                    {"rel_path": rel, "reason": "binds a document another book already binds"}
                )
                continue
            conn.execute("RELEASE SAVEPOINT book")
            seen.add((project, slug))
            indexed += 1
    # A book row whose manifest is gone (or failed to validate this run) is dropped,
    # tenant-scoped, inside the same transaction.
    for row in conn.execute("SELECT tenant_id, project, slug FROM books").fetchall():
        if (row["project"], row["slug"]) not in books_by_tenant.get(row["tenant_id"], set()):
            conn.execute(
                "DELETE FROM books WHERE tenant_id = ? AND project = ? AND slug = ?",
                (row["tenant_id"], row["project"], row["slug"]),
            )
            removed += 1
    conn.commit()
    return indexed, removed, skipped


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

    Each root is walked twice: once for its current documents (``_walk_root``) and
    once for its ``.versions/`` archive tree (``_walk_versions``), which rebuilds the
    ``document_versions`` table from the superseded bodies on disk. Version history
    therefore survives a DB wipe exactly like documents do. A third walk
    (``_rebuild_books``, P30.S2) then rebuilds the ``books`` / ``chapters`` /
    ``chapter_variants`` rows from every root's ``.books/`` manifests.

    Returns {indexed, removed, skipped:[{rel_path, reason}], versions_indexed,
    versions_removed, books_indexed, books_removed, embeddings:{...},
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
    versions_indexed = 0
    skipped: list[dict] = []
    # rel_paths present on disk, grouped by tenant_id, for the tenant-scoped
    # vanished-row cleanup.
    disk_by_tenant: dict[str, set[str]] = {}
    # The same, for the .versions/ archive tree -> document_versions.
    archives_by_tenant: dict[str, set[tuple[str, str]]] = {}
    # (project, book slug) manifests present on disk, by tenant -> books tables.
    books_by_tenant: dict[str, set[tuple[str, str]]] = {}
    # Every content root walked, for the books walk that runs after the documents.
    roots: list[tuple[Path, str]] = []

    # 1. Public root (docs/): tenant #1 in tenant mode, else the '' legacy sentinel.
    public_tid = str(tenant_one_id) if tenant_one_id else ""
    n, s = _walk_root(conn, root, public_tid, disk_by_tenant)
    indexed += n
    skipped += s
    n, s = _walk_versions(
        conn, root, public_tid, archives_by_tenant, disk_by_tenant.get(public_tid)
    )
    versions_indexed += n
    skipped += s
    roots.append((root, public_tid))

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
            n, s = _walk_versions(
                conn, tdir, tdir.name, archives_by_tenant, disk_by_tenant.get(tdir.name)
            )
            versions_indexed += n
            skipped += s
            roots.append((tdir, tdir.name))

    # 3. Books (P30.S2): the third walk, rebuilding the books / chapters /
    #    chapter_variants rows from every root's .books/ manifests.
    books_indexed, books_removed, s = _rebuild_books(conn, roots, books_by_tenant)
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

    # Same cleanup for the version archive: a document_versions row whose archive
    # file is gone from disk is dropped (the files are canonical, the table derived).
    versions_removed = 0
    for row in conn.execute(
        "SELECT tenant_id, rel_path, version, archive_path FROM document_versions"
    ).fetchall():
        tid = row["tenant_id"]
        if (row["rel_path"], row["archive_path"]) not in archives_by_tenant.get(tid, set()):
            conn.execute(
                "DELETE FROM document_versions "
                "WHERE tenant_id = ? AND rel_path = ? AND version = ?",
                (tid, row["rel_path"], row["version"]),
            )
            versions_removed += 1
    if versions_removed:
        conn.commit()

    embeddings_report = _sync_embeddings(conn)

    duration_ms = int((time.monotonic() - start) * 1000)
    if own_conn:
        conn.close()
    return {
        "indexed": indexed,
        "removed": removed,
        "skipped": skipped,
        # Version archive (P23): superseded bodies rebuilt from <root>/.versions/**
        # into document_versions. Additive keys — `indexed`/`removed` still count
        # current documents only, so an unversioned corpus reports 0/0 here.
        "versions_indexed": versions_indexed,
        "versions_removed": versions_removed,
        # Books (P30.S2): manifests rebuilt from <root>/.books/** into the books /
        # chapters / chapter_variants tables. Additive keys.
        "books_indexed": books_indexed,
        "books_removed": books_removed,
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
        print(
            f"versions: indexed={result['versions_indexed']} "
            f"removed={result['versions_removed']}"
        )
        print(
            f"books: indexed={result['books_indexed']} "
            f"removed={result['books_removed']}"
        )
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
