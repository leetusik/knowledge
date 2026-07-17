"""FastAPI read/search surface over the S1 library.

Reads (list/get/by-path, search, tags, projects) are open by default. The bearer
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
from typing import Optional

from fastapi import Depends, FastAPI, Header, HTTPException, Query, Request
from pydantic import BaseModel

from server import app_api
from server import auth_api
from server import config, db
from server import dashboard_api
from server import usage_api
from server import documents as documents_mod
from server import embeddings as embeddings_mod
from server import gitops
from server import reindex as reindex_mod
from server import search as search_mod
from server.accounts.auth import AuthError, auth_error_handler
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

# One process-wide lock serializes the whole write critical section (file → index
# → DB → git). Load-bearing invariant: the API runs a SINGLE uvicorn worker, so an
# in-process lock is sufficient; never scale to multiple workers. WAL gives reads
# concurrency regardless.
WRITE_LOCK = threading.Lock()


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
# already exposed as a list), so it never leaves the API. markdown is dropped
# from list payloads and kept on single-doc fetches.
_INTERNAL = {"tags_text"}


def _public_doc(doc: dict, *, include_markdown: bool) -> dict:
    drop = set(_INTERNAL)
    if not include_markdown:
        drop.add("markdown")
    return {k: v for k, v in doc.items() if k not in drop}


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


# Declared before /api/documents/{doc_id} (and doc_id is an int) so the by-path
# route never collides with the id route.
@app.get("/api/documents/by-path/{rel_path:path}")
def get_document_by_path(
    rel_path: str,
    ctx: ApiAuthContext = Depends(resolve_api_read),
    conn=Depends(get_conn),
):
    doc = db.get_document_by_path(conn, rel_path, tenant_id=_tenant_filter(ctx))
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
    overwrite: bool = False
    commit: bool = True
    co_authored_by: Optional[str] = None


@app.post("/api/documents", status_code=201)
def create_document(
    body: DocumentIn,
    request: Request,
    ctx: ApiAuthContext = Depends(resolve_api_write),
    conn=Depends(get_conn),
):
    """Own the whole write path: convention-exact docs/ file + Recent bullet + DB
    upsert + scoped git commit, all under WRITE_LOCK. docs/ stays canonical — a
    failed commit never rolls back the file/DB (responds 201, committed:false)."""
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
    except documents_mod.ConventionError as exc:
        raise HTTPException(status_code=422, detail=str(exc))

    rel = documents_mod.rel_path(project, date, slug)
    # Self-reference dropped silently (a doc can't be related to itself).
    related = [r for r in related if r != rel]
    # Sanitize source_repo: local paths → basename, URLs pass through unchanged.
    source_repo = documents_mod.sanitize_source_repo(body.source_repo)

    # Route by tenant: public callers (legacy + tenant #1) write the canonical,
    # git-published docs/ tree unchanged; every other tenant writes its namespaced
    # tenants/<uuid>/ root and stamps documents.tenant_id with its uuid.
    root = _tenant_root(ctx)
    tid = _tenant_db_id(ctx)

    # 2. 409 if the target exists on disk OR in the DB (this tenant) and not overwrite.
    if not body.overwrite:
        existing_row = db.get_document_by_path(conn, rel, tenant_id=_tenant_filter(ctx))
        if (root / rel).exists() or existing_row is not None:
            detail = {"message": f"document already exists at {rel}", "rel_path": rel}
            if existing_row is not None:
                detail["id"] = existing_row["id"]
                detail["existing_title"] = existing_row["title"]
            raise HTTPException(status_code=409, detail=detail)

    # 3. Locked critical section: file write -> index update -> DB upsert -> git.
    with WRITE_LOCK:
        stored_markdown = documents_mod.write_document_file(
            docs_root=root,
            rel_path=rel,
            title=body.title,
            date=date,
            tags=tags,
            project=project,
            source_repo=source_repo,
            body=body.markdown,
            related=related,
        )
        # Public landing + Recent index are mkdocs-publish concerns, so only the
        # public root gets them. Non-#1 tenants keep a minimal tree (their content
        # is never served in P10) — skip both and report them as not created.
        if ctx.is_public:
            # Auto-create the project landing on a project's first document, so
            # mkdocs builds site/<project>/index.html and the deploy gate stays
            # green. Never overwrites an existing (hand-written or auto) landing.
            landing_created = documents_mod.ensure_project_landing(root, project)
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
            tenant_id=tid,
        )

        # 4. Git only when requested AND enabled. A failed commit is NOT rolled
        #    back — the file/DB stay written; report committed:false + commit_error.
        committed = False
        commit_sha = None
        commit_error = None
        pushed = False
        push_error = None
        # Git publish is a public-root concern only: non-#1 tenants' content lives
        # under the gitignored tenants/ tree and is never committed/pushed.
        if body.commit and config.git_commit_enabled() and ctx.is_public:
            try:
                staged = [f"docs/{rel}", "docs/index.md"]
                if landing_created:
                    # Only staged when this write created it — keeps the scoped
                    # commit to exactly the paths this write touched.
                    staged.append(f"docs/{project}/index.md")
                gitops.add(staged, root=config.kb_root())
                commit_sha = gitops.commit(
                    f"docs({project}): add {slug}",
                    root=config.kb_root(),
                    co_authored_by=body.co_authored_by,
                )
                committed = True
            except gitops.GitError as exc:
                commit_error = exc.stderr or str(exc)

            # 4b. Best-effort publish: push the commit to origin/main when
            #     KB_GIT_PUSH is enabled (hosted box only; off by default so local
            #     never pushes). Mirrors the commit's best-effort semantics — a
            #     failed push never changes the 201; the doc publishes on the next
            #     successful push. A rebase may rewrite the commit, so the PUBLISHED
            #     head becomes the authoritative commit_sha on success. Stays inside
            #     WRITE_LOCK so no concurrent write mutates the tree mid-rebase.
            if committed and config.git_push_enabled():
                try:
                    commit_sha = gitops.push(root=config.kb_root())
                    pushed = True
                except gitops.GitError as exc:
                    push_error = exc.stderr or str(exc)

    # 4b. Best-effort embed of the new doc, OUTSIDE the WRITE_LOCK critical section.
    #     Semantic search is a disposable cache: any failure (no key, API error) is
    #     swallowed — the 201 never depends on it, and the next reindex catches up.
    if config.embeddings_enabled():
        try:
            model = config.embedding_model()
            vec = embeddings_mod.embed_texts(
                [embeddings_mod.document_input(body.title, stored_markdown)],
                kind="document",
            )[0]
            db.upsert_embedding(
                conn,
                doc_id=doc_id,
                model=model,
                content_hash=embeddings_mod.content_hash(model, body.title, stored_markdown),
                dims=len(vec),
                vector=embeddings_mod.pack_vector(vec),
            )
        except Exception:  # noqa: BLE001 — best-effort; never affects the 201
            pass

    # 5. Response.
    url = (
        f"{config.public_base_url().rstrip('/')}/{project}/{date}-{slug}/"
    )
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
        "recent_updated": recent_updated,
        "landing_created": landing_created,
        "committed": committed,
        "commit_sha": commit_sha,
        "pushed": pushed,
    }
    if commit_error is not None:
        resp["commit_error"] = commit_error
    if push_error is not None:
        resp["push_error"] = push_error
    # Meter the created document (best-effort, via the middleware). Attributed to
    # `project` (the write's project name) -> tenant project UUID. Inert in legacy
    # mode (tenant_id None -> the middleware skips).
    request.state.usage = UsageHint(
        tenant_id=ctx.tenant_id,
        event_type=EVENT_DOCUMENT_CREATED,
        project_name=project,
        project_id=ctx.project_id,
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
    commit never rolls back the removal (responds with committed:false)."""
    rel = doc["rel_path"]
    root = _tenant_root(ctx)
    with WRITE_LOCK:
        (root / rel).unlink(missing_ok=True)
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
        pushed = False
        push_error = None
        # Git publish is a public-root concern only (see create_document).
        if commit and config.git_commit_enabled() and ctx.is_public:
            try:
                gitops.add(
                    [f"docs/{rel}", "docs/index.md"], root=config.kb_root()
                )
                commit_sha = gitops.commit(
                    f"docs({doc['project']}): remove {doc['slug']}",
                    root=config.kb_root(),
                    co_authored_by=co_authored_by,
                )
                committed = True
            except gitops.GitError as exc:
                commit_error = exc.stderr or str(exc)

            # Best-effort publish of the delete commit — same semantics as the POST
            # path (see create_document 4b): KB_GIT_PUSH-gated, off by default, a
            # failed push never changes the 200, published head becomes commit_sha.
            if committed and config.git_push_enabled():
                try:
                    commit_sha = gitops.push(root=config.kb_root())
                    pushed = True
                except gitops.GitError as exc:
                    push_error = exc.stderr or str(exc)

    resp = {
        "deleted": True,
        "id": doc["id"],
        "rel_path": rel,
        "title": doc["title"],
        "project": doc["project"],
        "slug": doc["slug"],
        "recent_removed": recent_removed,
        "committed": committed,
        "commit_sha": commit_sha,
        "pushed": pushed,
    }
    if commit_error is not None:
        resp["commit_error"] = commit_error
    if push_error is not None:
        resp["push_error"] = push_error
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
