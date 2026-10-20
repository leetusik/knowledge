"""FastAPI read/search surface over the S1 library.

Reads (list/get/by-path, by-path version history, search, tags, projects) are open
by default. The bearer
dependency (``require_bearer``) guards mutating endpoints and is a no-op when
``KB_API_TOKEN`` is unset. The hosted box additionally gates the read/search
surface behind the same bearer by setting ``KB_REQUIRE_READ_AUTH=true`` — then
``require_read_bearer`` requires the token on reads too (both the flag AND a token
must be set). ``GET /healthz`` always stays open (edge/uptime probes). There is no
CORS: the consumer is server-to-server (the hi2vi agent runs server-side; the
public Pages site searches browser-only via lunr and never calls this API). A
fresh ``db.connect()`` is opened per request (a dependency) so config stays
env-at-call-time: tests retarget ``KB_ROOT``/``KB_DB_PATH`` via env, and the
container injects config through compose ``environment:``. Nothing is cached at
import time.
"""
from __future__ import annotations

import datetime
import threading
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Literal, Optional
from uuid import UUID

from fastapi import Depends, FastAPI, Header, HTTPException, Query, Request
from pydantic import BaseModel, ConfigDict

from server import app_api
from server import assets as assets_mod
from server import auth_api
from server import books as books_mod
from server import books_api
from server import config, db
from server import dashboard_api
from server import documents_api
from server import graph_api
from server import usage_api
from server import documents as documents_mod
from server import embeddings as embeddings_mod
from server import gitops
from server import native_ingest
from server import publish
from server import reindex as reindex_mod
from server import search as search_mod
from server.accounts.auth import AuthError, auth_error_handler
from server.native import NativeFormatError, parse_chapter, search_text
from server.accounts.service import get_accounts_service
from server.api_auth import (
    ApiAuthContext,
    get_tenant_one_id,
    resolve_api_read,
    resolve_api_write,
)
from server.persistence.engine import dispose_engine
from server.usage import (
    EVENT_DOCUMENT_CREATED,
    EVENT_DOCUMENT_DELETED,
    EVENT_SEARCH,
)
from server.usage.metering import UsageHint, record_usage


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup drift self-heal: docs/ is canonical, the DB is disposable — a full
    # reindex on boot cures manual edits, fallback writes, and git resets. The
    # embedding sync inside is content-hash cached, so a clean boot is ~free.
    if config.startup_reindex_enabled():
        # Tenant mode: resolve tenant #1's id so the docs/ walk stamps the
        # operator's tenant; namespaced tenants/<uuid>/ roots are re-derived from
        # their paths. Legacy mode -> None -> the '' sentinel (byte-identical).
        tenant_one_id = await get_tenant_one_id()
        report = reindex_mod.reindex(tenant_one_id=tenant_one_id)
        emb = report.get("embeddings", {})
        print(
            f"[kb-api] startup reindex: indexed={report['indexed']} "
            f"removed={report['removed']} skipped={len(report['skipped'])} "
            f"embedded={emb.get('embedded', 0)}",
            flush=True,
        )
    yield
    # Give the after-response publish worker a bounded chance to finish its
    # queued push/embed work before the process goes away (P24.S1). Best-effort:
    # anything still pending is dropped, and the doc publishes on the next
    # successful push — docs/ on disk is canonical either way.
    if not publish.drain(timeout=10.0):
        print(
            f"[kb-api] shutdown: {publish.pending()} publish task(s) still pending",
            flush=True,
        )
    # Dispose the async accounts engine if it was ever created. Lazy: when
    # DATABASE_URL is unset the engine never exists and this is a no-op, so the
    # content plane still shuts down cleanly without Postgres.
    await dispose_engine()


app = FastAPI(title="kb-api", version="0.1.0", lifespan=lifespan)


@app.middleware("http")
async def usage_metering(request: Request, call_next):
    """Best-effort per-tenant metering (P11.S2), driven off ``request.state.usage``.

    A metered content handler (create/delete document, search) stashes a
    ``UsageHint`` on its success path; this async middleware — running in the event
    loop, so it *can* ``await`` the Postgres write the sync handler cannot — records
    the event + stamps credential recency after the response is produced. It records
    only when a hint is present, the response is 2xx, AND ``tenant_id`` is set, so:
    error responses (401/404/409/422) are never metered (they raise before the
    stash), and legacy mode (``tenant_id is None``) is fully inert — no engine is
    ever created. ``record_usage`` swallows all errors; metering never changes the
    response, which is returned unchanged in every path.
    """

    response = await call_next(request)
    hint = getattr(request.state, "usage", None)
    if (
        hint is not None
        and hint.tenant_id is not None
        and 200 <= response.status_code < 300
    ):
        await record_usage(hint)  # best-effort; never raises
    return response


# Control-plane auth surface: the /auth/* session endpoints (signup/login/
# logout/me) and the shared generic-401 handler for require_user's AuthError.
# Mounted outside /api/* so the content-plane bearer guards never touch it.
app.include_router(auth_api.router)
app.add_exception_handler(AuthError, auth_error_handler)

# Control-plane app surface: the /app/* routes (tenant, projects, and per-project
# vk_ credentials), all require_user-guarded and scoped to the caller's tenant.
# Reuses the same AuthError handler above (no new wiring needed).
app.include_router(app_api.router)

# Usage read surface (P11.S3): the /app/usage + /app/projects/{id}/usage
# derive-on-read aggregate the P12 dashboard consumes. Same require_user guard and
# tenant scoping as app_api (cross-tenant project → 404).
app.include_router(usage_api.router)

# Dashboard aggregate (P12.S3): the tenant-scoped, unmetered GET /app/dashboard
# rollup (per-project usage/credential state + lifecycle activity feed) the web
# app's post-login home reads in one round-trip. Same require_user guard; pure reads.
app.include_router(dashboard_api.router)

# Documents read/search (P12.S5): the tenant-scoped, UNMETERED /app/documents +
# /app/search read routes the web app's knowledge viewer codes against. Reuses the
# S1 content store/search as-is (scoped by tenant_id), bridges the control-plane
# project UUID to the content-plane project name, and never sets request.state.usage
# — so web-UI browsing/search moves no usage counter (unlike the metered /api/*).
app.include_router(documents_api.router)

# Knowledge graph (P12.S6): the tenant-scoped, UNMETERED GET /app/graph the web
# app's in-app graph reads. A server-side twin of scripts/graph_hook.py's inversion
# run over the content store (db.list_documents scoped by tenant_id), emitting the
# same {version, projects, nodes, edges} contract with each doc node's url = the S5
# read route /documents/{id}. Same require_user guard; never sets request.state.usage.
app.include_router(graph_api.router)

# Books (P30.S2): the session-guarded member reads /app/books… and the public,
# project-gated /app/orgs/{org}/{project}/books/{book}. Unmetered like every /app
# route. The bearer /api/books routes live below with the rest of /api.
app.include_router(books_api.router)

# One process-wide lock serializes the whole write critical section (file → index
# → DB → git). Load-bearing invariant: the API runs a SINGLE uvicorn worker, so an
# in-process lock is sufficient; never scale to multiple workers. WAL gives reads
# concurrency regardless.
WRITE_LOCK = threading.Lock()


def _push_task(root: Path):
    """Build the after-response publish task for one write (P24.S1).

    ``root`` is captured at submit time (never re-read from the env in the
    worker). The task re-takes ``WRITE_LOCK`` — the rebase mutates the work tree
    and must not race another write's file write — which is exactly why it is
    submitted from OUTSIDE the lock (``WRITE_LOCK`` is not reentrant) and why
    every git subprocess is bounded by ``KB_GIT_TIMEOUT_S``: a wedged network
    must never hold the process's write lock. A ``GitError`` propagates to the
    worker, which logs it; the local commit stays and publishes on the next push.
    """

    def _task() -> None:
        with WRITE_LOCK:
            gitops.push(root=root)

    return _task


def _embed_task(*, db_file: Path, doc_id: int, title: str, markdown: str):
    """Build the after-response embed task for one write (P24.S1).

    The Gemini call is a network round-trip whose result never appears in the
    response, so it belongs behind it. It cannot reuse the request's SQLite
    connection (closed with the response, and single-thread bound), so it opens
    its own against the db path captured at submit time. Semantic search is a
    disposable cache: a failure is logged and the next reindex catches up.
    """

    def _task() -> None:
        model = config.embedding_model()
        vec = embeddings_mod.embed_texts(
            [embeddings_mod.document_input(title, markdown)], kind="document"
        )[0]
        conn = db.connect(db_file)
        try:
            db.upsert_embedding(
                conn,
                doc_id=doc_id,
                model=model,
                content_hash=embeddings_mod.content_hash(model, title, markdown),
                dims=len(vec),
                vector=embeddings_mod.pack_vector(vec),
            )
        finally:
            conn.close()

    return _task


def get_conn():
    """Per-request SQLite connection (closed after the response)."""
    conn = db.connect()
    try:
        yield conn
    finally:
        conn.close()


def require_bearer(authorization: Optional[str] = Header(default=None)) -> None:
    """Guard for mutating endpoints (reused by S3's POST /api/documents).

    No-op when ``KB_API_TOKEN`` is unset (localhost-open); otherwise require an
    exact ``Authorization: Bearer <token>`` header, else 401.
    """
    token = config.api_token()
    if token is None:
        return
    if authorization != f"Bearer {token}":
        raise HTTPException(status_code=401, detail="missing or invalid bearer token")


def require_read_bearer(authorization: Optional[str] = Header(default=None)) -> None:
    """Guard for the read/search surface on the hosted deployment only.

    No-op unless ``KB_REQUIRE_READ_AUTH`` is true AND ``KB_API_TOKEN`` is set —
    both must hold. Local/plugin default (flag unset) leaves reads open even when
    a token is set (a set token guards only writes there). When the flag is on the
    check delegates to ``require_bearer``, so a flag-on-but-tokenless deployment is
    still a no-op (same both-must-hold philosophy) and the bearer check is byte-for-
    byte identical to the write path. healthz is never gated (edge/uptime probes).
    """
    if not config.require_read_auth_enabled():
        return
    require_bearer(authorization)


# tags_text is an internal FTS denormalization (space-joined mirror of tags,
# already exposed as a list), so it never leaves the API. raw_html is an internal
# viewer-only column (served only by the /app raw route), never in /api JSON — but
# `format` IS exposed (additive). markdown is dropped from list payloads and kept on
# single-doc fetches; so is `source` (P30.S5: the stored native file, null for every
# other format), which is what a re-explain reads its ids back from.
_INTERNAL = {"tags_text", "raw_html"}


def _public_doc(doc: dict, *, include_markdown: bool) -> dict:
    drop = set(_INTERNAL)
    if not include_markdown:
        drop |= {"markdown", "source"}
    return {k: v for k, v in doc.items() if k not in drop}


# A document_versions row's `id` is an internal autoincrement on a DISPOSABLE table
# (reindex rebuilds every row from the .versions files on disk, so the number is not
# stable across a rebuild and nothing may key off it) and `tenant_id` is the scoping
# column — neither leaves the JSON. Version identity is (rel_path, version).
_VERSION_INTERNAL = {"id", "tenant_id"}


def _public_version(row: dict, *, include_body: bool) -> dict:
    """Project one archived-version row for the /api plane.

    The index shape (``include_body=False``) drops both bodies so a long history
    stays a light payload; a single-version fetch keeps ``markdown`` and — unlike
    the document surface, where ``raw_html`` never leaves /api — the archived
    ``raw_html`` for an html version, since that superseded body is otherwise
    unreadable by an agent (the file lives under the un-served ``.versions/`` tree).
    ``raw_html`` is always dropped for a non-html version (it is NULL there).
    """
    drop = set(_VERSION_INTERNAL)
    if not include_body:
        drop |= {"markdown", "raw_html", "source"}
    elif row.get("format") != "html":
        drop.add("raw_html")
    return {k: v for k, v in row.items() if k not in drop}


# --- Tenant routing (S5) --------------------------------------------------
# Three views of the caller's tenant, derived from the resolved ApiAuthContext:
#   _tenant_root   -> the content root ON DISK  (docs/ for public; tenants/<id>/ else)
#   _tenant_db_id  -> the value STAMPED on writes ('' legacy sentinel, else the uuid)
#   _tenant_filter -> the value used to SCOPE reads (None = no filter in legacy mode)
# Legacy mode (ctx.tenant_id is None) keeps today's behavior byte-for-byte: writes
# land in docs/ + stamp '', reads add no tenant filter.


def _tenant_root(ctx: ApiAuthContext) -> Path:
    """The caller's content root on disk. Public callers (legacy + tenant #1) use
    the canonical, git-published ``docs/``; every other tenant uses a namespaced,
    non-published ``<KB_ROOT>/tenants/<uuid>/`` sibling that mkdocs never serves."""
    if ctx.is_public:
        return config.docs_root()
    return config.kb_root() / "tenants" / str(ctx.tenant_id)


def _tenant_db_id(ctx: ApiAuthContext) -> str:
    """The ``documents.tenant_id`` value to stamp on a write: the uuid string in
    tenant mode, the ``''`` sentinel in legacy mode."""
    return str(ctx.tenant_id) if ctx.tenant_id is not None else ""


def _tenant_filter(ctx: ApiAuthContext) -> Optional[str]:
    """The tenant scoping value for reads / scoped lookups: the uuid string in
    tenant mode, ``None`` in legacy mode (no filter -> today's un-scoped reads)."""
    return str(ctx.tenant_id) if ctx.tenant_id is not None else None


@app.get("/healthz")
def healthz(conn=Depends(get_conn)):
    return {
        "status": "ok",
        "docs_root": str(config.docs_root()),
        "db": "ok",
        "documents": db.count_documents(conn),
    }


@app.get("/api/documents")
def list_documents(
    project: Optional[str] = None,
    tag: Optional[str] = None,
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    ctx: ApiAuthContext = Depends(resolve_api_read),
    conn=Depends(get_conn),
):
    tid = _tenant_filter(ctx)
    total = db.count_documents(conn, project=project, tag=tag, tenant_id=tid)
    items = db.list_documents(
        conn, project=project, tag=tag, limit=limit, offset=offset, tenant_id=tid
    )
    return {"total": total, "items": [_public_doc(d, include_markdown=False) for d in items]}


@app.get("/api/tags")
def list_tags(
    project: Optional[str] = None,
    ctx: ApiAuthContext = Depends(resolve_api_read),
    conn=Depends(get_conn),
):
    return {"tags": db.list_tags(conn, project=project, tenant_id=_tenant_filter(ctx))}


@app.get("/api/projects")
def list_projects(
    ctx: ApiAuthContext = Depends(resolve_api_read),
    conn=Depends(get_conn),
):
    return {"projects": db.list_projects(conn, tenant_id=_tenant_filter(ctx))}


# --- Version history reads (P23.S2) ---------------------------------------
#
# Declared BEFORE the bare by-path route on purpose: `{rel_path:path}` is greedy,
# so `/api/documents/by-path/p/2026-01-01-x.md/versions` would otherwise match it
# with rel_path="p/2026-01-01-x.md/versions" (Starlette matches in declaration
# order). Both routes gate on the CURRENT document — 404 when it is missing or
# another tenant's — and then read the archive by its rel_path, because
# document_versions is identity-keyed by (tenant_id, rel_path, version), never by
# documents.id. Reads only: no write, and no usage event (F4).


@app.get("/api/documents/by-path/{rel_path:path}/versions")
def list_document_versions(
    rel_path: str,
    ctx: ApiAuthContext = Depends(resolve_api_read),
    conn=Depends(get_conn),
):
    """A document's superseded versions, newest first, without their bodies.

    ``{rel_path, current_version, total, versions}``. Only ARCHIVED bodies are
    listed — the current version is the document itself, so ``current_version``
    (from ``documents.version``) is what completes the chain: a v3 document
    answers ``current_version: 3`` with v2 and v1 in ``versions``. An
    unversioned document answers ``current_version: 1`` and an empty list.
    """
    doc = db.get_document_by_path_or_alias(conn, rel_path, tenant_id=_tenant_filter(ctx))
    if doc is None:
        raise HTTPException(status_code=404, detail=f"no document at rel_path {rel_path!r}")
    # The chain is keyed by the document's CURRENT rel_path (P30.S5: an old .html
    # path reaches a migrated document through the stem alias).
    rows = db.list_document_versions(conn, doc["rel_path"], tenant_id=_tenant_filter(ctx))
    return {
        "rel_path": doc["rel_path"],
        "current_version": int(doc.get("version") or 1),
        "total": len(rows),
        "versions": [_public_version(r, include_body=False) for r in rows],
    }


@app.get("/api/documents/by-path/{rel_path:path}/versions/{version}")
def get_document_version(
    rel_path: str,
    version: int,
    ctx: ApiAuthContext = Depends(resolve_api_read),
    conn=Depends(get_conn),
):
    """One superseded version with its body (``markdown``, plus ``raw_html`` for
    an html version). The CURRENT version is not addressable here — it is the
    document, so ``GET /api/documents/by-path/{rel_path}`` serves it; asking for
    it here is a 404, exactly like a version that never existed."""
    doc = db.get_document_by_path_or_alias(conn, rel_path, tenant_id=_tenant_filter(ctx))
    if doc is None:
        raise HTTPException(status_code=404, detail=f"no document at rel_path {rel_path!r}")
    row = db.get_document_version(conn, doc["rel_path"], version, tenant_id=_tenant_filter(ctx))
    if row is None:
        raise HTTPException(
            status_code=404, detail=f"no version {version} of document {rel_path!r}"
        )
    return _public_version(row, include_body=True)


# Declared before /api/documents/{doc_id} (and doc_id is an int) so the by-path
# route never collides with the id route.
@app.get("/api/documents/by-path/{rel_path:path}")
def get_document_by_path(
    rel_path: str,
    ctx: ApiAuthContext = Depends(resolve_api_read),
    conn=Depends(get_conn),
):
    # P30.S5: a miss falls back to the document sharing the path's stem, so the old
    # `<stem>.html` of a document migrated to native keeps resolving (MCP included).
    doc = db.get_document_by_path_or_alias(conn, rel_path, tenant_id=_tenant_filter(ctx))
    if doc is None:
        raise HTTPException(status_code=404, detail=f"no document at rel_path {rel_path!r}")
    return _public_doc(doc, include_markdown=True)


@app.get("/api/documents/{doc_id}")
def get_document(
    doc_id: int,
    ctx: ApiAuthContext = Depends(resolve_api_read),
    conn=Depends(get_conn),
):
    doc = db.get_document(conn, doc_id, tenant_id=_tenant_filter(ctx))
    if doc is None:
        raise HTTPException(status_code=404, detail=f"no document with id {doc_id}")
    return _public_doc(doc, include_markdown=True)


@app.get("/api/search")
def search(
    request: Request,
    q: str,
    project: Optional[str] = None,
    tag: Optional[str] = None,
    limit: int = Query(10, ge=1, le=50),
    offset: int = Query(0, ge=0),
    raw: bool = False,
    ctx: ApiAuthContext = Depends(resolve_api_read),
    conn=Depends(get_conn),
):
    try:
        out = search_mod.search(
            conn, q, project=project, tag=tag, limit=limit, offset=offset, raw=raw,
            tenant_id=_tenant_filter(ctx),
        )
    except search_mod.SearchQueryError as exc:
        raise HTTPException(status_code=400, detail=f"invalid FTS query: {exc}")
    # Meter a successful search (best-effort, via the middleware). project may be
    # None -> tenant-level attribution. Inert in legacy mode (tenant_id None).
    request.state.usage = UsageHint(
        tenant_id=ctx.tenant_id,
        event_type=EVENT_SEARCH,
        project_name=project,
        project_id=ctx.project_id,
        credential_id=ctx.credential_id,
    )
    return {
        "query": q,
        # "hybrid" when the Gemini vector signal fused in, else "bm25" (no key / raw /
        # embed failure -> graceful BM25 + recency degradation).
        "mode": out.get("mode", "bm25"),
        "total": out["total"],
        "limit": limit,
        "offset": offset,
        "results": out["results"],
    }


class ReindexIn(BaseModel):
    """Optional POST /api/reindex body for single-path reindex."""
    rel_path: Optional[str] = None


@app.post("/api/reindex")
async def reindex(
    body: Optional[ReindexIn] = None,
    _: None = Depends(require_bearer),
):
    # Operator-global op (stays on require_bearer: a vk_ key gets 401 here). In
    # tenant mode, resolve tenant #1's id so the docs/ walk stamps the operator's
    # tenant; namespaced tenants/<uuid>/ roots re-derive their id from the path.
    # Legacy mode -> None -> the '' sentinel (byte-identical to before).
    tenant_one_id = await get_tenant_one_id()
    # No body or rel_path null -> full reindex (unchanged, backward compatible).
    # With rel_path -> single-path reindex. ValueError -> 422.
    if body is None or body.rel_path is None:
        return reindex_mod.reindex(tenant_one_id=tenant_one_id)
    try:
        return reindex_mod.reindex_path(body.rel_path, tenant_one_id=tenant_one_id)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))


class BookRefIn(BaseModel):
    """``book`` on a chapter publish (P30.S2; P29 *Phase or slice → chapter*).

    The fields seed a NEW book's manifest (``kind`` is then required; ``title``
    defaults to the slug). For a book that already exists the manifest is
    authoritative and these are ignored: ``PUT /api/books/{project}/{book}`` is how a
    book's own fields change."""

    model_config = ConfigDict(extra="forbid")

    slug: str
    title: Optional[str] = None
    kind: Optional[str] = None
    subject: Optional[str] = None
    description: Optional[str] = None


class ChapterRefIn(BaseModel):
    """``chapter`` on a chapter publish (P30.S2). ``position``/``title``/``source``
    seed a NEW chapter (no ``position`` = appended at max + 1); an existing chapter
    keeps its manifest entry."""

    model_config = ConfigDict(extra="forbid")

    key: str
    position: Optional[float] = None
    title: Optional[str] = None
    source: Optional[dict[str, str]] = None


class TranslatedFromIn(BaseModel):
    model_config = ConfigDict(extra="forbid")

    lang: str
    version: int


class AssetIn(BaseModel):
    """One image on a publish (P30.S4; P29.S1 *Images*). Validated, stripped and
    stored by ``server/assets.py``; the body references it by ``name``."""

    model_config = ConfigDict(extra="forbid")

    name: str
    media_type: str
    content_base64: str


class DocumentIn(BaseModel):
    """POST /api/documents request. `markdown` is the body WITHOUT frontmatter,
    starting at the H1 — the API generates the convention-exact frontmatter."""

    title: str
    markdown: str
    project: str
    tags: list[str]
    source_repo: str
    date: Optional[str] = None
    slug: Optional[str] = None
    related: list[str] = []
    # Additive (default "md" — existing callers unchanged). "html" ingests a
    # self-contained explainer: the `markdown` field carries the raw HTML body, and
    # a bad value gets a free 422 from the Literal. Pydantic v2 forbids by default.
    # "native" (P30.S5) is a native chapter: `markdown` carries its body WITHOUT a
    # header (the server writes the header, adding `format: native` / `syntax: 1`);
    # the body is parsed and validated, and every violation is one 422 list.
    format: Literal["md", "html", "native"] = "md"
    # P30.S5: a native chapter's optional lede, written into its header (P29 *Header*).
    summary: Optional[str] = None
    overwrite: bool = False
    # Versioned re-publish (P23, additive — both default to today's behavior).
    # `new_version: true` republishes an EXISTING document as its next version:
    # the current body is archived under <root>/.versions/ and the new body is
    # written at the SAME rel_path, so the document's identity (id, URL, graph
    # edges) never moves. `rel_path` names the target explicitly; without it the
    # server resolves the newest document matching (project, slug) for the tenant.
    # No target found ⇒ a plain v1 create (never an error), so an agent needs no
    # 404 dance.
    new_version: bool = False
    rel_path: Optional[str] = None
    commit: bool = True
    co_authored_by: Optional[str] = None
    # Books and chapters (P30.S2, additive — all default to "absent", which is
    # today's loose document exactly). `book` + `chapter` place the document as the
    # `lang` variant of a chapter (P29 *Server placement*); `lang` and
    # `translated_from` go into the header; `subject` is a loose document's
    # by-subject label, stored with it.
    book: Optional[BookRefIn] = None
    chapter: Optional[ChapterRefIn] = None
    lang: Optional[str] = None
    translated_from: Optional[TranslatedFromIn] = None
    subject: Optional[str] = None
    # Images (P30.S4, additive). The version's asset map is written into its header
    # and stored under <root>/.assets/<project>/<date>-<slug>/; never committed.
    assets: Optional[list[AssetIn]] = None


def _uses_book_fields(body: DocumentIn) -> bool:
    """Whether a write carries any P30.S2 field (else it is byte-for-byte today's)."""
    return any(
        v is not None
        for v in (body.book, body.chapter, body.lang, body.translated_from, body.subject)
    )


def _validated_placement(body: DocumentIn) -> Optional[dict]:
    """The validated chapter placement of a write, or ``None`` for a loose document.

    Raises ``ConventionError`` (-> 422): ``book`` and ``chapter`` go together; slug,
    key, kind, subject, title, position and source follow ``server/books.py``.
    """
    if body.book is None and body.chapter is None:
        return None
    if body.book is None or body.chapter is None:
        raise documents_mod.ConventionError(
            "book and chapter go together: send both to place a chapter, or neither "
            "for a loose document"
        )
    b, c = body.book, body.chapter
    kind = books_mod.validate_kind(b.kind) if b.kind is not None else None
    subject = books_mod.validate_subject(b.subject)
    if kind == "subject" and subject is None:
        raise documents_mod.ConventionError("a subject book needs book.subject")
    return {
        "book": {
            "slug": books_mod.validate_book_slug(b.slug),
            "title": books_mod.validate_text(b.title, "book.title", required=False),
            "kind": kind,
            "subject": subject,
            "description": books_mod.validate_text(
                b.description, "book.description", required=False
            ),
        },
        "chapter": {
            "key": books_mod.validate_chapter_key(c.key),
            "position": (
                books_mod.validate_position(c.position) if c.position is not None else None
            ),
            "title": books_mod.validate_text(c.title, "chapter.title", required=False),
            "source": books_mod.validate_source(c.source),
        },
        "lang": books_mod.validate_lang(body.lang) if body.lang is not None else books_mod.DEFAULT_LANG,
    }


def _read_manifest_or_409(root: Path, project: str, slug: str) -> Optional[dict]:
    """The book's current manifest (``None`` = no such book yet); a malformed one on
    disk is a 409 — the write refuses to build on a manifest it cannot read."""
    try:
        return books_mod.read_manifest(root, project, slug)
    except documents_mod.ConventionError as exc:
        raise HTTPException(
            status_code=409,
            detail=f"book manifest {books_mod.manifest_rel_path(project, slug)} is invalid: {exc}",
        )


def _place_variant(
    conn,
    *,
    root: Path,
    project: str,
    tid: str,
    placement: dict,
    rel: str,
    replaces: Optional[str] = None,
) -> tuple[dict, bool, bool]:
    """Build the manifest that binds ``rel`` as the placement's variant (no write).

    Runs INSIDE ``WRITE_LOCK``, before any file is touched, so every refusal leaves
    nothing behind: it re-reads the manifest (the authoritative copy) and 409s when
    this ``(chapter, lang)`` is already bound to a different document, or when ``rel``
    already belongs to a different chapter — in this book or, through the index, in
    another (P29: a document is in at most one chapter). A new book needs
    ``book.kind`` (422). Returns ``(manifest, book_created, chapter_created)``.

    ``replaces`` (P30.S5) is the document's old rel_path on an ``html -> native``
    migration: the same document under its previous name, so a binding to it counts
    as this document's own and is re-pointed to ``rel``.
    """
    book, chapter, lang = placement["book"], placement["chapter"], placement["lang"]
    manifest = _read_manifest_or_409(root, project, book["slug"])
    book_created = manifest is None
    if manifest is None:
        if book["kind"] is None:
            raise HTTPException(
                status_code=422,
                detail=f"book {book['slug']!r} does not exist yet: book.kind is required to create it",
            )
        manifest = {
            "slug": book["slug"],
            "title": book["title"] or book["slug"],
            "kind": book["kind"],
            "subject": book["subject"],
            "description": book["description"],
            "chapters": [],
        }
    else:
        manifest = {**manifest, "chapters": [dict(c, variants=dict(c["variants"])) for c in manifest["chapters"]]}

    conflict = {"rel_path": rel, "book": book["slug"], "chapter_key": chapter["key"], "lang": lang}
    bound_here = books_mod.find_binding(manifest, rel)
    if bound_here is None and replaces is not None:
        bound_here = books_mod.find_binding(manifest, replaces)
    if bound_here is not None and bound_here != (chapter["key"], lang):
        raise HTTPException(
            status_code=409,
            detail={
                **conflict,
                "message": (
                    f"{rel} is already chapter {bound_here[0]!r} ({bound_here[1]}) of book "
                    f"{book['slug']!r}; a document belongs to at most one chapter"
                ),
            },
        )
    elsewhere = db.find_chapter_binding(conn, rel, tid)
    if elsewhere is None and replaces is not None:
        elsewhere = db.find_chapter_binding(conn, replaces, tid)
    if elsewhere is not None and (elsewhere["project"], elsewhere["book"]) != (project, book["slug"]):
        raise HTTPException(
            status_code=409,
            detail={
                **conflict,
                "message": (
                    f"{rel} is already chapter {elsewhere['chapter_key']!r} of book "
                    f"{elsewhere['book']!r}; a document belongs to at most one chapter"
                ),
            },
        )

    ch = books_mod.find_chapter(manifest, chapter["key"])
    chapter_created = ch is None
    if ch is None:
        ch = {
            "key": chapter["key"],
            "position": (
                chapter["position"]
                if chapter["position"] is not None
                else books_mod.next_position(manifest)
            ),
            "variants": {},
        }
        if chapter["title"] is not None:
            ch["title"] = chapter["title"]
        if chapter["source"] is not None:
            ch["source"] = chapter["source"]
        manifest["chapters"].append(ch)
    current = ch["variants"].get(lang)
    # A binding whose document is gone (drift) is simply re-pointed; a live one is
    # never silently replaced.
    if (
        current is not None
        and current not in (rel, replaces)
        and db.get_document_by_path(conn, current, tenant_id=tid) is not None
    ):
        raise HTTPException(
            status_code=409,
            detail={
                **conflict,
                "message": (
                    f"chapter {chapter['key']!r} ({lang}) of book {book['slug']!r} is "
                    f"bound to {current}, not {rel}"
                ),
            },
        )
    ch["variants"][lang] = rel
    try:
        manifest = books_mod.normalize_manifest(manifest, project=project)
    except documents_mod.ConventionError as exc:
        raise HTTPException(status_code=422, detail=str(exc))
    return manifest, book_created, chapter_created


async def ensure_registry_project(
    body: DocumentIn,
    ctx: ApiAuthContext = Depends(resolve_api_write),
) -> UUID | None:
    """Get-or-create the Postgres registry project for a write's project name.

    An **async** dependency because the ``create_document`` handler is sync (it holds
    ``WRITE_LOCK`` over a sqlite critical section and cannot ``await`` Postgres), yet
    the ``projects`` row must exist by the time the write lands so an unregistered
    name stops leaving the registry blank. FastAPI shares the parsed ``DocumentIn``
    body with the handler and caches ``resolve_api_write`` per request, so this runs
    exactly once, before the handler.

    Legacy mode (``ctx.tenant_id is None``) -> ``None`` (no Postgres). The project
    name is validated with the same ``validate_project`` the handler uses, but a
    ``ConventionError`` is swallowed here so the handler's own 422 stays the single
    source of the shape error; a valid name is get-or-created race-safely against
    ``UNIQUE(tenant_id, name)``. The row may be created even when the handler then
    409s (target already exists) — harmless and idempotent. Returns the registry
    project id, or ``None`` (legacy mode / an invalid name the handler will 422).
    """

    if ctx.tenant_id is None:
        return None
    try:
        project = documents_mod.validate_project(body.project)
    except documents_mod.ConventionError:
        return None
    record = await get_accounts_service().get_or_create_project(ctx.tenant_id, project)
    return record.id


async def resolve_org_slug(
    ctx: ApiAuthContext = Depends(resolve_api_write),
) -> str | None:
    """The writing tenant's public org slug, or ``None``. Feeds the 201 save ``url``.

    An **async** dependency for the same reason ``ensure_registry_project`` is one:
    ``create_document`` is sync (it holds ``WRITE_LOCK`` over a sqlite critical
    section) and cannot ``await`` Postgres, yet the response URL needs the accounts
    plane. FastAPI caches ``resolve_api_write`` per request, so this adds one
    read — not a second auth resolution — and runs before the handler.

    ``None`` in legacy/single-tenant mode (no Postgres at all) and for a tenant that
    has not claimed a slug yet — both keep exactly today's URL (P25.S2).
    """

    if ctx.tenant_id is None:
        return None
    tenant = await get_accounts_service().get_tenant(ctx.tenant_id)
    return None if tenant is None else tenant.slug


def _resolve_version_target(
    conn,
    ctx: ApiAuthContext,
    body: DocumentIn,
    *,
    project: str,
    slug: str,
) -> Optional[dict]:
    """The document a ``new_version: true`` write supersedes, or ``None`` (P23).

    Two resolution modes, both tenant-scoped (a version bump can never reach
    another tenant's document):

    * **Explicit** — ``rel_path`` in the request names the target directly. It is
      looked up as-is; a miss (no such document) is NOT an error, it simply falls
      back to a plain v1 create at the request's own computed rel_path, so an agent
      that guessed wrong still publishes instead of 404ing.
    * **By identity** — otherwise the NEWEST document matching ``(project, slug)``
      wins (``db.find_latest_document_by_slug``: ``date DESC, id DESC``). This is
      the convenience path for an agent re-publishing on a later date, whose
      computed ``<project>/<today>-<slug>`` would otherwise silently become a new
      post. Note the slug defaults to ``slugify(title)``: a v2 with a **retitled**
      document must pass ``slug`` or ``rel_path`` explicitly, or it resolves to no
      target and creates a new document.

    ``None`` whenever ``new_version`` is not set, so every existing caller keeps
    today's behavior exactly.
    """

    if not body.new_version:
        return None
    tenant = _tenant_filter(ctx)
    if body.rel_path:
        # The stem alias (P30.S5): naming a migrated document by its old .html path
        # still finds it.
        return db.get_document_by_path_or_alias(conn, body.rel_path, tenant_id=tenant)
    return db.find_latest_document_by_slug(conn, project, slug, tenant_id=tenant)


@app.post("/api/documents", status_code=201)
def create_document(
    body: DocumentIn,
    request: Request,
    ctx: ApiAuthContext = Depends(resolve_api_write),
    registry_project_id: UUID | None = Depends(ensure_registry_project),
    org_slug: str | None = Depends(resolve_org_slug),
    conn=Depends(get_conn),
):
    """Own the whole write path: convention-exact docs/ file + Recent bullet + DB
    upsert + scoped LOCAL git commit, all under WRITE_LOCK. docs/ stays canonical — a
    failed commit never rolls back the file/DB (responds 201, committed:false).

    Nothing in the pre-response path makes a network round-trip (P24.S1): the push
    to origin/main and the Gemini embed are queued on the publish worker and run
    after the 201 is written, so a caller's timeout budget only ever covers local
    work (see step 4b)."""
    # 1. Validate (S1 validators). ConventionError -> 422. Defaults: date=today,
    #    slug=slugify(title).
    try:
        project = documents_mod.validate_project(body.project)
        tags = documents_mod.validate_tags(body.tags)
        date = (
            documents_mod.validate_date(body.date)
            if body.date
            else datetime.date.today().isoformat()
        )
        slug = documents_mod.validate_slug(
            body.slug if body.slug else documents_mod.slugify(body.title)
        )
        related = documents_mod.validate_related(body.related)
        # P30.S2 (additive): chapter placement + the optional header fields. All
        # None for a write that sends none of them -> today's loose path exactly.
        placement = _validated_placement(body)
        header_lang = (
            books_mod.validate_lang(body.lang) if body.lang is not None else None
        )
        subject = books_mod.validate_subject(body.subject)
        translated_from = books_mod.validate_translated_from(
            body.translated_from.model_dump() if body.translated_from is not None else None
        )
        if translated_from is not None and translated_from["lang"] == (
            header_lang or books_mod.DEFAULT_LANG
        ):
            raise documents_mod.ConventionError(
                "translated_from.lang must differ from the document's own lang"
            )
        if body.summary is not None and body.format != "native":
            raise documents_mod.ConventionError(
                "summary is a native chapter's header field: send it with format \"native\""
            )
        if body.summary is not None and not body.summary.strip():
            raise documents_mod.ConventionError("summary must be a non-empty string")
    except documents_mod.ConventionError as exc:
        raise HTTPException(status_code=422, detail=str(exc))

    # 1-. Content violations, collected into ONE 422 list (P29 *Ingest*; S3's shape:
    #     {line, col, code, message}). The body limit applies to every format
    #     (P30.S5). Images (P30.S4) are validated, stripped and hashed here, before
    #     the lock (the decode is CPU work). Only a native chapter may carry images
    #     (P30.S5, OQ14): a legacy html explainer runs in an opaque-origin sandbox and
    #     can reference none, and plain md has no `asset:` resolution. A native body
    #     is parsed further down, once its version (hence its header) is known, and
    #     its violations join this list.
    violations: list[dict] = native_ingest.body_limit_violations(body.format, body.markdown)
    body_too_large = bool(violations)
    prepared_assets: list = []
    if body.assets:
        if body.format != "native":
            violations.append({
                "line": 0, "col": 0, "code": "asset-format",
                "message": f"only a native chapter can carry assets, not an {body.format} document",
            })
        else:
            try:
                prepared_assets = assets_mod.prepare_assets(
                    [a.model_dump() for a in body.assets]
                )
            except assets_mod.AssetError as exc:
                violations.extend(exc.to_detail())
    if violations and body.format != "native":
        raise HTTPException(status_code=422, detail=violations)
    asset_map = assets_mod.asset_map(prepared_assets)

    rel = documents_mod.rel_path(project, date, slug, fmt=body.format)
    # Sanitize source_repo: local paths → basename, URLs pass through unchanged.
    source_repo = documents_mod.sanitize_source_repo(body.source_repo)

    # Route by tenant: public callers (legacy + tenant #1) write the canonical,
    # git-published docs/ tree unchanged; every other tenant writes its namespaced
    # tenants/<uuid>/ root and stamps documents.tenant_id with its uuid.
    root = _tenant_root(ctx)
    tid = _tenant_db_id(ctx)

    # 1b. Version target (P23). `new_version: true` re-publishes an EXISTING
    #     document: the target's rel_path — hence its original date and slug — is
    #     kept, so identity never moves and the request's date/slug are ignored for
    #     a resolved target (`updated_at` is what moves). A miss falls through to a
    #     plain v1 create at the computed rel_path.
    # 1a. Chapter placement (P30.S2; P29 *Server placement*). The chapter key replaces
    #     list-and-match: when `(project, book, key, lang)` is already bound, this
    #     publish IS that document's next version (same rel_path), whatever
    #     `new_version` says. Otherwise the usual resolution below runs and whatever
    #     document it writes becomes the variant (bound under the lock, step 3).
    target = None
    if placement is not None:
        existing = _read_manifest_or_409(root, project, placement["book"]["slug"])
        if existing is None and placement["book"]["kind"] is None:
            raise HTTPException(
                status_code=422,
                detail=(
                    f"book {placement['book']['slug']!r} does not exist yet: "
                    "book.kind is required to create it"
                ),
            )
        ch = (
            books_mod.find_chapter(existing, placement["chapter"]["key"])
            if existing is not None
            else None
        )
        bound = ch["variants"].get(placement["lang"]) if ch is not None else None
        if bound is not None:
            if body.rel_path and body.rel_path != bound:
                raise HTTPException(
                    status_code=422,
                    detail=(
                        f"rel_path {body.rel_path} conflicts with chapter "
                        f"{placement['chapter']['key']!r} ({placement['lang']}), "
                        f"which is bound to {bound}"
                    ),
                )
            # A binding whose document row is gone (drift) resolves to nothing and
            # falls through to a fresh create, which is then re-bound.
            target = db.get_document_by_path_or_alias(
                conn, bound, tenant_id=_tenant_filter(ctx)
            )
    if target is None:
        target = _resolve_version_target(conn, ctx, body, project=project, slug=slug)
    # P30.S5: the one format migration. The first native publish onto an html
    # document is that document's next version, moved from <stem>.html to <stem>.md
    # (P29 *Legacy -> native re-explain*); `migrated_from` is its old rel_path.
    migrated_from: Optional[str] = None
    if target is not None:
        # The project may not change across a version chain, and neither may the
        # format, with two exceptions (P29): md -> native is an ordinary next version
        # (same rel_path), and html -> native is the format migration. Every other
        # change is a 422 rather than a silent coercion — the caller wants a NEW
        # document.
        target_format = target.get("format") or "md"
        if target_format != body.format and (target_format, body.format) not in (
            ("md", "native"), ("html", "native"),
        ):
            raise HTTPException(
                status_code=422,
                detail=(
                    f"cannot change format of {target['rel_path']} "
                    f"({target_format}) to {body.format} in a new "
                    "version — publish it as a new document instead"
                ),
            )
        if target["project"] != project:
            raise HTTPException(
                status_code=422,
                detail=(
                    f"cannot move {target['rel_path']} from project "
                    f"{target['project']!r} to {project!r} in a new version — "
                    "publish it as a new document instead"
                ),
            )
        rel = target["rel_path"]
        date = target["date"]
        slug = target["slug"]
        if target_format == "html" and body.format == "native":
            migrated_from = rel
            rel = f"{db.rel_path_stem(rel)}.md"
            # The native file's place must be free: another document (or a stray
            # file) at <stem>.md would otherwise be overwritten.
            occupant = db.get_document_by_path(conn, rel, tenant_id=_tenant_filter(ctx))
            if (occupant is not None and occupant["id"] != target["id"]) or (
                occupant is None and (root / rel).exists()
            ):
                raise HTTPException(
                    status_code=409,
                    detail={
                        "message": (
                            f"cannot migrate {migrated_from} to native: {rel} is "
                            "already taken"
                        ),
                        "rel_path": rel,
                    },
                )

    # Self-reference dropped silently (a doc can't be related to itself).
    related = [r for r in related if r != rel]

    # 2. 409 if the target exists on disk OR in the DB (this tenant) and not
    #    overwrite. Skipped for a resolved version target: replacing that document
    #    is the point of the request.
    if not body.overwrite and target is None:
        existing_row = db.get_document_by_path(conn, rel, tenant_id=_tenant_filter(ctx))
        if (root / rel).exists() or existing_row is not None:
            detail = {"message": f"document already exists at {rel}", "rel_path": rel}
            if existing_row is not None:
                detail["id"] = existing_row["id"]
                detail["existing_title"] = existing_row["title"]
                # P23 hint: an existing DB row is versionable, so the caller can
                # re-publish additively instead of reaching for destructive
                # overwrite. Purely additive to the detail dict — `message`,
                # `rel_path`, `id` and `existing_title` are unchanged, so the CLI's
                # 409 explainer keeps working.
                detail["version"] = existing_row.get("version") or 1
                detail["hint"] = (
                    "re-publish as the next version: POST again with "
                    f'"new_version": true, "rel_path": "{rel}"'
                )
            raise HTTPException(status_code=409, detail=detail)

    # 2a. One document per file stem (P30.S5). The archive and asset directories are
    #     keyed by `<project>/<date>-<slug>`, and an old `.html` path resolves to its
    #     migrated `.md` through that stem, so a NEW document may not take a stem
    #     another document of a different extension already owns (overwrite
    #     replaces only its own rel_path). Re-publishing that document is the way.
    if target is None:
        stem = db.rel_path_stem(rel)
        for other in db.find_documents_by_stem(conn, stem, tenant_id=_tenant_filter(ctx)):
            if other["rel_path"] == rel:
                continue
            raise HTTPException(
                status_code=409,
                detail={
                    "message": (
                        f"{other['rel_path']} already uses the file stem {stem}; "
                        "a document's stem is its identity across formats"
                    ),
                    "rel_path": other["rel_path"],
                    "id": other["id"],
                    "existing_title": other["title"],
                    "version": other.get("version") or 1,
                    "hint": (
                        "re-publish it as the next version: POST again with "
                        f'"new_version": true, "rel_path": "{other["rel_path"]}"'
                    ),
                },
            )

    # 2b. Which body (if any) this write supersedes, and at which version number.
    #     `target` covers new_version; overwrite supersedes whatever sits at `rel`.
    #     A file with no DB row (drift) is still archived — its version comes from
    #     the file's own frontmatter and the next reindex derives the row from the
    #     archived file, since disk is canonical.
    superseded = target
    if superseded is None and body.overwrite:
        superseded = db.get_document_by_path(conn, rel, tenant_id=_tenant_filter(ctx))
    if superseded is not None:
        prev_version: Optional[int] = int(superseded.get("version") or 1)
    elif body.overwrite:
        prev_version = documents_mod.read_document_version(root, rel)
    else:
        prev_version = None
    doc_version = prev_version + 1 if prev_version is not None else 1

    # 2c. A native chapter (P30.S5; P29 *Ingest*): compose the file (the server's
    #     header + the body), parse and validate it, resolve its references, check a
    #     translation's ids, and fail with ONE 422 that lists every violation, the
    #     image ones included. Ids the document's earlier native versions used are
    #     never minted again. Lines are mapped back to the body as sent.
    native = None
    native_warnings: list[dict] = []
    native_assigned: list[dict] = []
    if body.format == "native":
        content, offset = documents_mod.native_file_content(
            title=body.title,
            date=date,
            tags=tags,
            project=project,
            source_repo=source_repo,
            body=body.markdown,
            related=related,
            version=doc_version,
            lang=header_lang,
            subject=subject,
            translated_from=translated_from,
            assets=asset_map,
            summary=body.summary,
        )
        reserved = (
            native_ingest.retired_ids(conn, superseded, tenant_id=_tenant_filter(ctx))
            if superseded is not None
            else set()
        )
        if not body_too_large:
            try:
                native = parse_chapter(content, reserved_ids=reserved)
            except NativeFormatError as exc:
                violations.extend(native_ingest.remap_lines(exc.to_detail(), offset))
                violations.extend(native_ingest.remap_lines(
                    native_ingest.unknown_assets(
                        native_ingest.failed_parse_asset_uses(exc),
                        {a.name for a in body.assets or []},
                    ),
                    offset,
                ))
        if native is not None:
            self_chapter = (
                (project, placement["book"]["slug"], placement["chapter"]["key"])
                if placement is not None
                else None
            )
            errors, warns = native_ingest.resolve_refs(
                conn,
                native,
                asset_names={a.name for a in body.assets or []},
                project=project,
                tenant_id=_tenant_filter(ctx),
                self_chapter=self_chapter,
                self_slug=(project, slug),
            )
            violations.extend(native_ingest.remap_lines(errors, offset))
            native_warnings.extend(native_ingest.remap_lines(warns, offset))
            if translated_from is not None:
                source_rel = None
                if placement is not None:
                    manifest_now = _read_manifest_or_409(root, project, placement["book"]["slug"])
                    ch_now = (
                        books_mod.find_chapter(manifest_now, placement["chapter"]["key"])
                        if manifest_now is not None
                        else None
                    )
                    if ch_now is not None:
                        source_rel = ch_now["variants"].get(translated_from["lang"])
                errors, warns = native_ingest.translation_findings(
                    conn,
                    native.tree,
                    source_rel_path=source_rel,
                    translated_from=translated_from,
                    tenant_id=_tenant_filter(ctx),
                )
                violations.extend(errors)
                native_warnings.extend(warns)
            native_assigned = native_ingest.remap_lines(native.assigned_ids, offset)
        if violations:
            raise HTTPException(status_code=422, detail=violations)

    # 3. Locked critical section: archive -> file write -> index update -> DB upsert
    #    -> LOCAL git add/commit. (WRITE_LOCK is NOT reentrant — nothing called in
    #    here may retake it, which is why the push is queued outside it in 4b.)
    with WRITE_LOCK:
        # 3-. Chapter placement (P30.S2): settle the manifest FIRST, before any file
        #     is touched, so a binding conflict (409) or a book that cannot be created
        #     (422) leaves nothing behind. Re-read under the lock: it is the
        #     authoritative copy.
        new_manifest = None
        book_created = chapter_created = False
        if placement is not None:
            new_manifest, book_created, chapter_created = _place_variant(
                conn, root=root, project=project, tid=tid, placement=placement, rel=rel,
                replaces=migrated_from,
            )
        elif migrated_from is not None:
            # P30.S5: the book binding follows a migrated document. The manifest that
            # binds its old rel_path is re-pointed to the new one (same chapter, same
            # lang); a binding the index knows but the manifest lacks is drift, and
            # the next reindex settles it.
            binding = db.find_chapter_binding(conn, migrated_from, tid)
            if binding is not None:
                bound_manifest = _read_manifest_or_409(root, binding["project"], binding["book"])
                if bound_manifest is not None:
                    chapters = []
                    for c in bound_manifest["chapters"]:
                        variants = {
                            lang: (rel if r == migrated_from else r)
                            for lang, r in c["variants"].items()
                        }
                        chapters.append(dict(c, variants=variants))
                    try:
                        new_manifest = books_mod.normalize_manifest(
                            {**bound_manifest, "chapters": chapters}, project=binding["project"]
                        )
                    except documents_mod.ConventionError as exc:  # pragma: no cover - defensive
                        raise HTTPException(status_code=409, detail=str(exc))
        # 3a. Archive the body about to be replaced, BEFORE it is overwritten, to
        #     <root>/.versions/<project>/<date>-<slug>/vNNNN.<ext>. `None` when
        #     there is nothing on disk to keep (a fresh create, or a DB row whose
        #     file vanished).
        archive_path = None
        if migrated_from is not None:
            # P30.S5: the document's row (and its archived versions) take the new
            # rel_path in place, so its id, URL and version chain carry over.
            db.rekey_document(
                conn, tenant_id=tid, old_rel_path=migrated_from, new_rel_path=rel
            )
        if prev_version is not None:
            # The body being replaced still sits at its own path: the old `.html` on
            # a migration, archived as vNNNN.html in the same stem-keyed directory.
            archive_path = documents_mod.archive_document_file(
                docs_root=root, rel_path=migrated_from or rel, version=prev_version
            )
            if archive_path is not None and superseded is not None:
                archived_source = None
                if superseded.get("format") == "native":
                    # The archived file itself (its `version:` line stamped), exactly
                    # what reindex re-derives from disk.
                    archived_source = (root / archive_path).read_text(encoding="utf-8")
                db.upsert_document_version(
                    conn,
                    rel_path=rel,
                    version=prev_version,
                    archive_path=archive_path,
                    title=superseded["title"],
                    date=superseded["date"],
                    tags=superseded.get("tags") or [],
                    markdown=superseded.get("markdown") or "",
                    format=superseded.get("format") or "md",
                    raw_html=superseded.get("raw_html"),
                    tenant_id=tid,
                    # The archived file keeps its own `assets:` header verbatim, so
                    # the old version keeps rendering its own images (P29.S1).
                    assets=superseded.get("assets"),
                    source=archived_source,
                )
        # 3a+. Store this version's images (P30.S4) under
        #      <root>/.assets/<project>/<date>-<slug>/, before the body that names
        #      them. Content-addressed: identical bytes are stored once, and files an
        #      older version references are never touched. Never staged in git.
        assets_mod.store_assets(root, rel, prepared_assets)
        # `stored_body` is the on-disk body minus its frontmatter — the raw markdown
        # for an md doc, the raw HTML for an html doc. The body rule then derives what
        # each plane stores: the DB `markdown` column always holds the readable text
        # (extracted plain text for html), `raw_html` holds the HTML only for html.
        native_source = None
        if native is not None:
            # P30.S5: the parser's normalized source (assigned ids written in) is the
            # stored file; the DB keeps it whole in `source` and its search
            # projection in `markdown` (FTS + embeddings).
            documents_mod.write_raw_document_file(
                docs_root=root, rel_path=rel, content=native.source
            )
            native_source = native.source
            raw_html = None
            stored_markdown = search_text(native.tree)
            if migrated_from is not None:
                (root / migrated_from).unlink(missing_ok=True)
        else:
            stored_body = documents_mod.write_document_file(
                docs_root=root,
                rel_path=rel,
                title=body.title,
                date=date,
                tags=tags,
                project=project,
                source_repo=source_repo,
                body=body.markdown,
                related=related,
                fmt=body.format,
                version=doc_version,
                lang=header_lang,
                subject=subject,
                translated_from=translated_from,
                assets=asset_map,
            )
            if body.format == "html":
                raw_html = stored_body
                stored_markdown = documents_mod.extract_html_text(stored_body)
            else:
                raw_html = None
                stored_markdown = stored_body
        # Public landing + Recent index are mkdocs-publish concerns, so only the
        # public root gets them. Non-#1 tenants keep a minimal tree (their content
        # is never served in P10) — skip both and report them as not created.
        if ctx.is_public:
            # Auto-create the project landing on a project's first document, so
            # mkdocs builds site/<project>/index.html and the deploy gate stays
            # green. Never overwrites an existing (hand-written or auto) landing.
            landing_created = documents_mod.ensure_project_landing(root, project)
            if migrated_from is not None:
                # The migrated document keeps its Recent bullet; only its link moves.
                documents_mod.replace_recent_link(root, migrated_from, rel)
            recent_updated = documents_mod.update_recent_index(
                root,
                date=date,
                title=body.title,
                rel_path=rel,
                project=project,
            )
        else:
            landing_created = False
            recent_updated = False
        doc_id = db.upsert_document(
            conn,
            project=project,
            slug=slug,
            date=date,
            title=body.title,
            tags=tags,
            source_repo=source_repo,
            rel_path=rel,
            markdown=stored_markdown,
            related=related,
            format=body.format,
            raw_html=raw_html,
            version=doc_version,
            tenant_id=tid,
            lang=header_lang,
            subject=subject,
            translated_from=translated_from,
            assets=asset_map,
            source=native_source,
        )

        # 3b. Bind the variant (P30.S2): write the manifest, then rebuild the book's
        #     derived rows from it — the same replace_book reindex runs.
        manifest_rel = None
        if new_manifest is not None:
            manifest_project = project
            if placement is None and migrated_from is not None:
                manifest_project = binding["project"]
            manifest_rel = books_mod.write_manifest(root, manifest_project, new_manifest)
            db.replace_book(
                conn, tenant_id=tid, project=manifest_project, manifest=new_manifest,
                manifest_path=manifest_rel,
            )

        # 4. Git only when requested AND enabled. A failed commit is NOT rolled
        #    back — the file/DB stay written; report committed:false + commit_error.
        committed = False
        commit_sha = None
        commit_error = None
        # Git publish is a public-root concern only: non-#1 tenants' content lives
        # under the gitignored tenants/ tree and is never committed/pushed.
        if body.commit and config.git_commit_enabled() and ctx.is_public:
            try:
                staged = [f"docs/{rel}", "docs/index.md"]
                if landing_created:
                    # Only staged when this write created it — keeps the scoped
                    # commit to exactly the paths this write touched.
                    staged.append(f"docs/{project}/index.md")
                if archive_path is not None:
                    # The superseded body travels with the repo (public root only),
                    # so tenant #1's version history is in git too.
                    staged.append(f"docs/{archive_path}")
                if manifest_rel is not None:
                    # The book manifest rides in the chapter's own scoped commit.
                    staged.append(f"docs/{manifest_rel}")
                gitops.add(staged, root=config.kb_root())
                if migrated_from is not None:
                    # The old .html file is gone from the work tree (P30.S5).
                    gitops.remove([f"docs/{migrated_from}"], root=config.kb_root())
                message = (
                    f"docs({project}): add {slug}"
                    if doc_version == 1
                    else f"docs({project}): update {slug} to v{doc_version}"
                )
                commit_sha = gitops.commit(
                    message,
                    root=config.kb_root(),
                    co_authored_by=body.co_authored_by,
                )
                committed = True
            except gitops.GitError as exc:
                commit_error = exc.stderr or str(exc)

    # 4b. AFTER-RESPONSE publish work (P24.S1). Everything above is durable: the
    #     file is on disk, the DB transaction is committed, the local commit is
    #     made. What remains — the push to origin/main (fetch + rebase + push:
    #     two SSH round-trips) and the Gemini embed — is publish/side-effect work
    #     whose result never appears in the response, so it must not spend the
    #     caller's timeout budget. Both are queued on the single publish worker
    #     (FIFO, serialized) and run after this handler returns; submitting is a
    #     queue append, and it happens OUTSIDE WRITE_LOCK because the push task
    #     re-takes that lock (it is not reentrant).
    #     `pushed` therefore stays false on every path now — it keeps its
    #     documented "saved, publishes on the next successful push" meaning, and
    #     `push_pending` says whether that push is already on its way. A failed
    #     background push is logged (container log), not reported here: the
    #     response is long gone by then, so `push_error` no longer appears.
    pushed = False
    push_pending = False
    if committed and config.git_push_enabled():
        push_pending = True
        publish.submit(f"push {rel}", _push_task(config.kb_root()))
    if config.embeddings_enabled():
        publish.submit(
            f"embed {rel}",
            _embed_task(
                db_file=config.db_path(),
                doc_id=doc_id,
                title=body.title,
                markdown=stored_markdown,
            ),
        )

    # 5. Response.
    # Mode-aware direct URL. Tenant mode (`ctx.tenant_id is not None`) points at the
    # web app's doc page (`KB_PUBLIC_BASE_URL` is the app origin on prod); shareable
    # when the project is public. Legacy/single-tenant mode keeps the mkdocs site
    # URL, which still exists in the dormant template stack. Branch on
    # `ctx.tenant_id`, never `is_public` — tenant #1's mkdocs URL is equally broken.
    #
    # P25.S2: a tenant that has claimed an org slug gets the PRETTY, durable URL
    # `/@{org}/{project}/{slug}` — built from `project`/`slug` (which, on a version
    # bump, are the TARGET's, so the pretty URL never moves either) and never from
    # the disposable `doc_id`. A slug-less tenant keeps `/documents/{id}` exactly as
    # before. The URL is pretty regardless of the project's visibility: the resolver
    # is optional-identity, so it resolves for the author either way, and consulting
    # visibility here would buy a lookup for nothing — a private doc's URL is
    # shareable only once the project is public, exactly like `/documents/{id}`.
    #
    # P25.F1: the pretty path is dateless ("the newest document under this title"),
    # so hand it back only when it ROUND-TRIPS to the row we just wrote. A backdated
    # publish under an existing slug (no `new_version`) inserts an older duplicate
    # whose pretty path belongs to the newer row — returning it would point the
    # author at a DIFFERENT document. One SQLite read on the connection already in
    # hand, the same primitive the resolver route uses; no accounts-plane work.
    if ctx.tenant_id is not None:
        canonical = None
        if org_slug:
            latest = db.find_latest_document_by_slug(
                conn, project, slug, tenant_id=_tenant_filter(ctx)
            )
            if latest is not None and latest["id"] == doc_id:
                canonical = f"{config.public_base_url()}/@{org_slug}/{project}/{slug}"
        url = canonical or f"{config.public_base_url()}/documents/{doc_id}"
    else:
        url = f"{config.public_base_url()}/{project}/{date}-{slug}/"
    resp = {
        "id": doc_id,
        "rel_path": rel,
        "url": url,
        "title": body.title,
        "project": project,
        "slug": slug,
        "date": date,
        "tags": tags,
        "related": related,
        "format": body.format,
        # Versioning (P23, additive). `version` is what this write published;
        # `previous_version`/`archived_path` describe the body it superseded (both
        # null on a plain create). `date`/`slug` above are the TARGET's on a version
        # bump, not the request's — the rel_path never moves.
        "version": doc_version,
        "previous_version": prev_version,
        "archived_path": archive_path,
        "recent_updated": recent_updated,
        "landing_created": landing_created,
        "committed": committed,
        # The LOCAL commit this request made. Since P24 the rebase happens after
        # the response, so this is no longer necessarily the published (post-
        # rebase) head — see `push_pending`.
        "commit_sha": commit_sha,
        # Unchanged meaning ("saved; publishes on the next successful push"), and
        # now always false when a push was deferred rather than skipped.
        "pushed": pushed,
        # Additive (P24): a push to origin/main was QUEUED and runs right after
        # this response. The document is already durably saved either way.
        "push_pending": push_pending,
    }
    if commit_error is not None:
        resp["commit_error"] = commit_error
    # P30.S5, additive: only a native publish gets these keys. `assigned_ids` lists the
    # ids the server wrote into the stored file and `warnings` the non-fatal findings
    # (an unresolved chapter:/doc: link, a translation's id drift), both with lines
    # in the body as sent; `migrated_from` is the old rel_path of an html -> native
    # migration (null otherwise).
    if body.format == "native":
        resp["assigned_ids"] = native_assigned
        resp["warnings"] = native_warnings
        resp["migrated_from"] = migrated_from
    # P30.S4, additive: only a write that sent assets gets the stored map back.
    if body.assets:
        resp["assets"] = asset_map
    # P30.S2, additive: only a write that sent a book field gets these keys, so a
    # plain loose publish answers exactly the pre-P30 shape.
    if _uses_book_fields(body):
        resp["book"] = placement["book"]["slug"] if placement else None
        resp["chapter_key"] = placement["chapter"]["key"] if placement else None
        resp["lang"] = placement["lang"] if placement else header_lang
        resp["translated_from"] = translated_from
        resp["subject"] = subject
        resp["book_created"] = book_created
        resp["chapter_created"] = chapter_created
        resp["manifest_path"] = manifest_rel
    # Meter the created document (best-effort, via the middleware). Attributed to
    # `project` (the write's project name) -> tenant project UUID. Inert in legacy
    # mode (tenant_id None -> the middleware skips).
    request.state.usage = UsageHint(
        tenant_id=ctx.tenant_id,
        event_type=EVENT_DOCUMENT_CREATED,
        project_name=project,
        # The registry row now always exists (get-or-create above), so metering's
        # name-first lookup resolves it; the id here is the fallback, preferring the
        # just-ensured registry project over the vk_ caller's bound project.
        project_id=registry_project_id or ctx.project_id,
        credential_id=ctx.credential_id,
    )
    return resp


def _delete_document(
    conn,
    doc: dict,
    ctx: ApiAuthContext,
    *,
    commit: bool,
    co_authored_by: Optional[str],
) -> dict:
    """Own the whole delete path: the POST write path in reverse (file -> Recent
    bullet -> DB -> scoped git commit), all under WRITE_LOCK. Routes by tenant like
    the write path: public callers touch docs/ + Recent + git; non-#1 tenants touch
    only their namespaced tenants/<uuid>/ file + DB row. docs/ row deletion is
    missing_ok — a DB row without a file is drift, still cleaned up. A failed
    commit never rolls back the removal (responds with committed:false). Like the
    write path, the push runs after the response (P24.S1)."""
    rel = doc["rel_path"]
    root = _tenant_root(ctx)
    with WRITE_LOCK:
        (root / rel).unlink(missing_ok=True)
        # Deleting a document deletes its history with it (P23): the whole
        # .versions/<project>/<date>-<slug>/ dir goes, so no readable body of a
        # deleted document survives on disk (or in the public git tree), and the
        # derived rows go with it.
        versions_removed = documents_mod.remove_archive_dir(root, rel)
        db.delete_document_versions_by_path(conn, rel, tenant_id=_tenant_filter(ctx))
        # P30.S4: its images go too — the whole .assets/<project>/<date>-<slug>/
        # dir, which only this document's versions (all deleted above) reference.
        # Never in git, so nothing to stage.
        assets_removed = assets_mod.remove_asset_dir(root, rel)
        # Recent index is a public-root concern; non-#1 tenants have none to update.
        if ctx.is_public:
            recent_removed = documents_mod.remove_from_recent_index(root, rel)
        else:
            recent_removed = False
        # FTS row cleaned by the AFTER DELETE trigger; any embedding cascades
        # via ON DELETE CASCADE (document_embeddings.doc_id -> documents.id). Scoped
        # to this tenant so a delete can never cross tenants.
        db.delete_document_by_path(conn, rel, tenant_id=_tenant_filter(ctx))

        committed = False
        commit_sha = None
        commit_error = None
        # Git publish is a public-root concern only (see create_document).
        if commit and config.git_commit_enabled() and ctx.is_public:
            try:
                staged = [f"docs/{rel}", "docs/index.md"]
                if versions_removed:
                    # Stage the removed archive dir so the deletion of the history
                    # lands in the same scoped commit as the document's.
                    staged.append(f"docs/{documents_mod.archive_dir_rel_path(rel)}")
                gitops.add(staged, root=config.kb_root())
                commit_sha = gitops.commit(
                    f"docs({doc['project']}): remove {doc['slug']}",
                    root=config.kb_root(),
                    co_authored_by=co_authored_by,
                )
                committed = True
            except gitops.GitError as exc:
                commit_error = exc.stderr or str(exc)

    # After-response publish of the delete commit — same mechanism and semantics
    # as the POST path (see create_document 4b): KB_GIT_PUSH-gated, off by
    # default, queued on the publish worker outside WRITE_LOCK (the task retakes
    # it), never spends the caller's timeout budget.
    pushed = False
    push_pending = False
    if committed and config.git_push_enabled():
        push_pending = True
        publish.submit(f"push delete {rel}", _push_task(config.kb_root()))

    resp = {
        "deleted": True,
        "id": doc["id"],
        "rel_path": rel,
        "title": doc["title"],
        "project": doc["project"],
        "slug": doc["slug"],
        "recent_removed": recent_removed,
        # P23: whether this document had an on-disk version archive to remove.
        "versions_removed": versions_removed,
        # P30.S4: whether it had an image directory to remove.
        "assets_removed": assets_removed,
        "committed": committed,
        # The local delete commit; not necessarily the published head (P24).
        "commit_sha": commit_sha,
        "pushed": pushed,
        # Additive (P24): the push of this delete commit was queued.
        "push_pending": push_pending,
    }
    if commit_error is not None:
        resp["commit_error"] = commit_error
    return resp


# Declared before /api/documents/{doc_id} (same collision rule as the GETs).
@app.delete("/api/documents/by-path/{rel_path:path}")
def delete_document_by_path(
    rel_path: str,
    request: Request,
    commit: bool = True,
    co_authored_by: Optional[str] = None,
    ctx: ApiAuthContext = Depends(resolve_api_write),
    conn=Depends(get_conn),
):
    doc = db.get_document_by_path(conn, rel_path, tenant_id=_tenant_filter(ctx))
    if doc is None:
        raise HTTPException(status_code=404, detail=f"no document at rel_path {rel_path!r}")
    resp = _delete_document(conn, doc, ctx, commit=commit, co_authored_by=co_authored_by)
    # Meter the deletion (best-effort, via the middleware) — only reached when the
    # doc was found. Attributed to the deleted doc's project. Inert in legacy mode.
    request.state.usage = UsageHint(
        tenant_id=ctx.tenant_id,
        event_type=EVENT_DOCUMENT_DELETED,
        project_name=doc["project"],
        project_id=ctx.project_id,
        credential_id=ctx.credential_id,
    )
    return resp


@app.delete("/api/documents/{doc_id}")
def delete_document(
    doc_id: int,
    request: Request,
    commit: bool = True,
    co_authored_by: Optional[str] = None,
    ctx: ApiAuthContext = Depends(resolve_api_write),
    conn=Depends(get_conn),
):
    doc = db.get_document(conn, doc_id, tenant_id=_tenant_filter(ctx))
    if doc is None:
        raise HTTPException(status_code=404, detail=f"no document with id {doc_id}")
    resp = _delete_document(conn, doc, ctx, commit=commit, co_authored_by=co_authored_by)
    # Meter the deletion (best-effort, via the middleware) — only reached when the
    # doc was found. Attributed to the deleted doc's project. Inert in legacy mode.
    request.state.usage = UsageHint(
        tenant_id=ctx.tenant_id,
        event_type=EVENT_DOCUMENT_DELETED,
        project_name=doc["project"],
        project_id=ctx.project_id,
        credential_id=ctx.credential_id,
    )
    return resp


# --- Books (P30.S2) -----------------------------------------------------------
#
# The bearer plane of P29's book model. A book is a manifest on disk
# (<root>/.books/<project>/<book>.json, server/books.py) mirrored into the derived
# books / chapters / chapter_variants tables. Reads are tenant-scoped like
# /api/documents; PUT is the one way to edit a book's own fields, its order and its
# bindings, and is how existing documents are bound into books (S6's migration).


def _public_book(book: dict) -> dict:
    """The /api book shape: the derived row minus the internal ``tenant_id``."""
    return {k: v for k, v in book.items() if k != "tenant_id"}


@app.get("/api/books")
def list_books(
    project: Optional[str] = None,
    ctx: ApiAuthContext = Depends(resolve_api_read),
    conn=Depends(get_conn),
):
    """The caller's books (optionally one project's) with their chapter counts."""
    items = db.list_books(conn, tenant_id=_tenant_filter(ctx), project=project)
    return {"total": len(items), "items": [_public_book(b) for b in items]}


@app.get("/api/books/{project}/{book}")
def get_book(
    project: str,
    book: str,
    ctx: ApiAuthContext = Depends(resolve_api_read),
    conn=Depends(get_conn),
):
    """One book: its fields and ordered chapters, each with its live variants
    ``{lang, doc_id, rel_path, title, slug, version, format, updated_at,
    translated_from}``. 404 when the book does not exist for this tenant."""
    found = db.get_book(conn, project=project, slug=book, tenant_id=_tenant_filter(ctx))
    if found is None:
        raise HTTPException(status_code=404, detail=f"no book {book!r} in project {project!r}")
    return _public_book(found)


class BookPutIn(BaseModel):
    """``PUT /api/books/{project}/{book}``: the whole manifest, replacing the old one.

    ``chapters[]`` entries are manifest chapters: ``{key, position, title?, source?,
    variants: {<lang>: <rel_path>}}``. ``slug`` is optional and must equal the path's.
    """

    model_config = ConfigDict(extra="forbid")

    slug: Optional[str] = None
    title: str
    kind: str
    subject: Optional[str] = None
    description: Optional[str] = None
    chapters: list[dict] = []
    commit: bool = True
    co_authored_by: Optional[str] = None


@app.put("/api/books/{project}/{book}")
def put_book(
    project: str,
    book: str,
    body: BookPutIn,
    ctx: ApiAuthContext = Depends(resolve_api_write),
    conn=Depends(get_conn),
):
    """Replace (or create) a book's manifest: its title, order and bindings.

    Validation, all before anything is written:

    * the manifest itself (``books.normalize_manifest``) -> 422: slug/key/lang
      syntax, kind, a subject book's subject, unique keys, one binding per document,
      every variant inside this project;
    * every bound rel_path must be an existing document of this tenant in this
      project -> 422 naming the missing ones (a document of another project or
      another tenant is "missing" here: it is not readable in this project);
    * a document another book already binds -> 409 (P29: at most one chapter).

    Then, under ``WRITE_LOCK``: the manifest is written atomically, the derived rows
    rebuilt, and — for the public root — the manifest committed alone
    (``docs(<project>): update book <slug>``), pushed after the response like a
    document write. Bound documents are never rewritten. Unmetered.
    """
    try:
        documents_mod.validate_project(project)
        books_mod.validate_book_slug(book)
        if body.slug is not None and body.slug != book:
            raise documents_mod.ConventionError(
                f"body slug {body.slug!r} does not match the path's {book!r}"
            )
        manifest = books_mod.normalize_manifest(
            {
                "slug": book,
                "title": body.title,
                "kind": body.kind,
                "subject": body.subject,
                "description": body.description,
                "chapters": body.chapters,
            },
            project=project,
        )
    except documents_mod.ConventionError as exc:
        raise HTTPException(status_code=422, detail=str(exc))

    tenant = _tenant_filter(ctx)
    missing = []
    for ch in manifest["chapters"]:
        for rel in ch["variants"].values():
            doc = db.get_document_by_path(conn, rel, tenant_id=tenant)
            if doc is None or doc["project"] != project:
                missing.append(rel)
    if missing:
        raise HTTPException(
            status_code=422,
            detail={
                "message": "every bound document must exist in this project",
                "missing": missing,
            },
        )

    root = _tenant_root(ctx)
    tid = _tenant_db_id(ctx)
    with WRITE_LOCK:
        for ch in manifest["chapters"]:
            for lang, rel in ch["variants"].items():
                other = db.find_chapter_binding(conn, rel, tid)
                if other is not None and (other["project"], other["book"]) != (project, book):
                    raise HTTPException(
                        status_code=409,
                        detail={
                            "message": (
                                f"{rel} is already chapter {other['chapter_key']!r} of book "
                                f"{other['book']!r}; a document belongs to at most one chapter"
                            ),
                            "rel_path": rel,
                            "book": other["book"],
                            "chapter_key": other["chapter_key"],
                        },
                    )
        manifest_file = root / books_mod.manifest_rel_path(project, book)
        created = not manifest_file.is_file()
        before = None if created else manifest_file.read_bytes()
        manifest_rel = books_mod.write_manifest(root, project, manifest)
        changed = before != manifest_file.read_bytes()
        db.replace_book(
            conn, tenant_id=tid, project=project, manifest=manifest, manifest_path=manifest_rel
        )

        committed = False
        commit_sha = None
        commit_error = None
        # An unchanged manifest has nothing to commit (git would refuse the empty
        # commit), so a no-op PUT reports committed:false with no error.
        if changed and body.commit and config.git_commit_enabled() and ctx.is_public:
            try:
                gitops.add([f"docs/{manifest_rel}"], root=config.kb_root())
                commit_sha = gitops.commit(
                    f"docs({project}): update book {book}",
                    root=config.kb_root(),
                    co_authored_by=body.co_authored_by,
                )
                committed = True
            except gitops.GitError as exc:
                # Reported, never rolled back, like a document write.
                commit_error = exc.stderr or str(exc)

    push_pending = False
    if committed and config.git_push_enabled():
        push_pending = True
        publish.submit(f"push book {manifest_rel}", _push_task(config.kb_root()))

    found = db.get_book(conn, project=project, slug=book, tenant_id=tid)
    resp = {
        **_public_book(found or {}),
        "created": created,
        "manifest_path": manifest_rel,
        "committed": committed,
        "commit_sha": commit_sha,
        "pushed": False,
        "push_pending": push_pending,
    }
    if commit_error is not None:
        resp["commit_error"] = commit_error
    return resp
