"""Per-tenant documents read + search — the web app's knowledge-viewer surface (P12.S5).

Three session-guarded, tenant-scoped, **unmetered** ``/app`` read routes the web app's
documents surface codes against:

* ``GET /app/documents`` — the tenant's documents, newest-first, optional project/tag
  filter + offset pagination → ``{total, items}``.
* ``GET /app/documents/{doc_id}`` — one document (with ``markdown``) → 404 when it is
  missing or belongs to another tenant (cross-tenant ids never leak).
* ``GET /app/search`` — full-text/hybrid search over the tenant's documents →
  ``{query, mode, total, limit, offset, results}``.

These reuse the S1 content-store/search layer **as-is** (``server/db.py`` +
``server/search.py``), scoped with ``tenant_id=str(ctx.tenant.id)`` from
``require_user``. They are **unmetered by construction**: metering is opt-in per
handler via ``request.state.usage`` (recorded by the ``server/main.py`` HTTP
middleware), and these handlers never set it — so web-UI browsing/search moves no
usage counter, exactly like the S3 ``/app/dashboard`` precedent. Keeping web browsing
out of the metered ``searches`` figure is deliberate: that metric stays billable
agent/API retriever usage, and every web-UI feature is free.

**The project UUID -> name bridge.** Documents key off the project *name* string, but
the web app works in control-plane project **UUIDs**. When ``project`` (a UUID) is
supplied, it is resolved with ``AccountsService.get_project`` scoped to the caller's
tenant (mirrors ``server/app_api.py::_load_scoped_project``: missing OR cross-tenant
-> 404), and the resolved *name* is what the store/search filter on.

The ``/app`` projector drops the internal ``tags_text`` FTS denormalization AND the
``tenant_id`` scoping column (the ``/api`` projector leaks ``tenant_id``; this one must
not), plus ``markdown`` on the list. Search result items already exclude
``markdown``/``tenant_id`` (``server/search.py::_finalize``), so they pass through
unchanged.
"""

from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query

from server import db
from server import search as search_mod
from server.accounts.auth import AuthContext, require_user
from server.accounts.service import get_accounts_service

router = APIRouter()


async def get_conn():
    """Per-request SQLite connection (closed after the response).

    A local copy of ``server/main.py``'s dependency, but **async** on purpose: these
    handlers are ``async def`` (they ``await`` the accounts service for the project
    UUID->name bridge), so an async generator dependency opens the connection on the
    same event-loop thread the handler uses it from. A sync ``def`` dependency would
    run in FastAPI's threadpool and hand a connection created in another thread —
    which SQLite forbids (``check_same_thread``). Defining it here (rather than
    importing ``main.get_conn``) also avoids a circular import: ``main`` imports this
    module at startup to mount the router.
    """

    conn = db.connect()
    try:
        yield conn
    finally:
        conn.close()


# tags_text is an internal FTS denormalization (a space-joined mirror of the tags,
# already exposed as a list); tenant_id is the internal scoping column. Neither
# leaves the /app surface. markdown is dropped from list rows and kept on a single
# document fetch.
_DROP = {"tags_text", "tenant_id"}


def _app_doc(doc: dict, *, include_markdown: bool) -> dict:
    """Project a stored document row to the /app read shape."""

    drop = set(_DROP)
    if not include_markdown:
        drop.add("markdown")
    return {k: v for k, v in doc.items() if k not in drop}


async def _resolve_project_name(project_id: UUID, ctx: AuthContext) -> str:
    """Bridge a control-plane project UUID to its content-plane *name* string.

    Resolves ``project_id`` scoped to the caller's tenant (mirrors
    ``server/app_api.py::_load_scoped_project``): a project that is missing *or*
    owned by another tenant answers **404**, so cross-tenant existence never leaks.
    Documents filter by the project *name*, so the resolved name is what the store
    and search are scoped with.
    """

    project = await get_accounts_service().get_project(project_id)
    if project is None or project.tenant_id != ctx.tenant.id:
        raise HTTPException(status_code=404, detail="project not found")
    return project.name


@router.get("/app/documents")
async def list_documents(
    project: UUID | None = None,
    tag: str | None = None,
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    ctx: AuthContext = Depends(require_user),
    conn=Depends(get_conn),
) -> dict[str, object]:
    """The caller's tenant's documents, newest-first, with the total match count.

    ``project`` (a control-plane UUID) is bridged to the project name (404 when it is
    missing or another tenant's). ``{total, items}`` where ``total`` is the full
    filtered count and ``items`` is the ``offset``..``offset+limit`` window, each
    projected without ``markdown``/``tags_text``/``tenant_id``.
    """

    tenant_id = str(ctx.tenant.id)
    project_name = (
        await _resolve_project_name(project, ctx) if project is not None else None
    )
    total = db.count_documents(conn, project=project_name, tag=tag, tenant_id=tenant_id)
    items = db.list_documents(
        conn,
        project=project_name,
        tag=tag,
        limit=limit,
        offset=offset,
        tenant_id=tenant_id,
    )
    return {
        "total": total,
        "items": [_app_doc(d, include_markdown=False) for d in items],
    }


@router.get("/app/documents/{doc_id}")
async def get_document(
    doc_id: int,
    ctx: AuthContext = Depends(require_user),
    conn=Depends(get_conn),
) -> dict[str, object]:
    """One of the caller's tenant's documents by id, with ``markdown``.

    A missing id OR another tenant's id both answer **404** (``get_document`` scopes
    by ``tenant_id``, so a cross-tenant id resolves to ``None`` and never leaks).
    """

    doc = db.get_document(conn, doc_id, tenant_id=str(ctx.tenant.id))
    if doc is None:
        raise HTTPException(status_code=404, detail=f"no document with id {doc_id}")
    return _app_doc(doc, include_markdown=True)


@router.get("/app/search")
async def search(
    q: str,
    project: UUID | None = None,
    tag: str | None = None,
    limit: int = Query(10, ge=1, le=50),
    offset: int = Query(0, ge=0),
    ctx: AuthContext = Depends(require_user),
    conn=Depends(get_conn),
) -> dict[str, object]:
    """Full-text/hybrid search scoped to the caller's tenant.

    ``project`` (a control-plane UUID) is bridged to the project name (404 when it is
    missing or another tenant's). Reuses ``server/search.py::search`` as-is (BM25 +
    recency, fused with the Gemini vector signal when embeddings are enabled). Result
    items already exclude ``markdown``/``tenant_id`` and carry ``snippet``/``score``
    for the UI. A malformed raw MATCH is impossible here (tokens are always quoted),
    but ``SearchQueryError`` still maps to **400** to match ``/api/search``.
    """

    tenant_id = str(ctx.tenant.id)
    project_name = (
        await _resolve_project_name(project, ctx) if project is not None else None
    )
    try:
        out = search_mod.search(
            conn,
            q,
            project=project_name,
            tag=tag,
            limit=limit,
            offset=offset,
            tenant_id=tenant_id,
        )
    except search_mod.SearchQueryError as exc:
        raise HTTPException(status_code=400, detail=f"invalid FTS query: {exc}")
    return {
        "query": q,
        # "hybrid" when the Gemini vector signal fused in, else "bm25".
        "mode": out.get("mode", "bm25"),
        "total": out["total"],
        "limit": limit,
        "offset": offset,
        "results": out["results"],
    }
