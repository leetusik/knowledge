"""Per-tenant documents read + delete — the web app's knowledge-viewer surface (P12.S5).

Nine session-guarded, tenant-scoped, **unmetered** ``/app`` routes the web app's
documents surface codes against — eight reads and one delete:

* ``GET /app/documents`` — the tenant's documents, newest-first, optional project/tag
  filter + offset pagination → ``{total, items}``.
* ``GET /app/documents/{doc_id}`` — one document (with ``markdown``) → 404 when it is
  missing or belongs to another tenant (cross-tenant ids never leak). Optional-identity
  since P19.S2: also readable anonymously when it belongs to a public project.
* ``GET /app/orgs/{org}/{project}/{slug}`` — the same document, addressed by its
  DURABLE public identity instead of the disposable row id (P25.S2): the Postgres
  org slug, the project name, and the doc slug. Same optional-identity trust gate,
  same indistinguishable 404 for every miss. Backs the pretty share URL
  ``/@{org}/{project}/{slug}``.
* ``GET /app/documents/{doc_id}/raw`` — one HTML explainer's raw HTML for the sandboxed
  viewer (same optional-identity rule).
* ``GET /app/documents/{doc_id}/versions`` — the document's superseded versions,
  newest first and body-less, plus its ``current_version`` (P23.S2; same
  optional-identity rule).
* ``GET /app/documents/{doc_id}/versions/{version}`` — one archived version with its
  ``markdown`` body.
* ``GET /app/documents/{doc_id}/versions/{version}/raw`` — an archived HTML version's
  raw HTML, with the ``/raw`` route's sandbox headers repeated verbatim.
* ``DELETE /app/documents/{doc_id}`` — hard-delete one of the caller's **own** documents
  (P21.S1): member-only (``require_user``, **no** public fallback), 204 on success.
* ``GET /app/search`` — full-text/hybrid search over the tenant's documents →
  ``{query, mode, total, limit, offset, results}``.

These reuse the S1 content-store/search layer **as-is** (``server/db.py`` +
``server/search.py``), scoped with ``tenant_id=str(ctx.tenant.id)`` from
``require_user``. They are **unmetered by construction**: metering is opt-in per
handler via ``request.state.usage`` (recorded by the ``server/main.py`` HTTP
middleware), and these handlers never set it — so web-UI browsing/search moves no
usage counter, exactly like the S3 ``/app/dashboard`` precedent. Keeping web browsing
out of the metered ``searches`` figure is deliberate: that metric stays billable
agent/API retriever usage, and every web-UI feature is free. The P21 delete route
holds that line too: it reuses ``server/main.py``'s ``_delete_document`` *logic* (where
no metering lives) rather than the metered ``DELETE /api/documents/{id}`` *route*, so a
UI click never bills an ``EVENT_DOCUMENT_DELETED``.

**The project UUID -> name bridge.** Documents key off the project *name* string, but
the web app works in control-plane project **UUIDs**. When ``project`` (a UUID) is
supplied, it is resolved with ``AccountsService.get_project`` scoped to the caller's
tenant (mirrors ``server/app_api.py::_load_scoped_project``: missing OR cross-tenant
-> 404), and the resolved *name* is what the store/search filter on.

The ``/app`` projector drops the internal ``tags_text`` FTS denormalization AND the
``tenant_id`` scoping column (the ``/api`` projector leaks ``tenant_id``; this one must
not), plus ``markdown`` on the list. Search result items already exclude
``markdown``/``tenant_id`` (``server/search.py::_finalize``), so they pass through
unchanged. The two DETAIL reads additionally carry ``canonical_path`` (P25.S2) —
injected at their call sites, never inside the shared projector, so the list route
never pays the tenant lookup it costs.
"""

from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Response
from starlette.concurrency import run_in_threadpool

from server import config
from server import db
from server import search as search_mod
from server.accounts.auth import AuthContext, optional_user, require_user
from server.accounts.service import get_accounts_service
from server.api_auth import ApiAuthContext, get_tenant_one_id

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
# already exposed as a list); tenant_id is the internal scoping column; raw_html is
# the viewer-only raw-HTML column served solely by the /raw route below. None of the
# three leaves the /app JSON surface (`format` does — additive). markdown is dropped
# from list rows and kept on a single document fetch.
_DROP = {"tags_text", "tenant_id", "raw_html"}


def _app_doc(doc: dict, *, include_markdown: bool) -> dict:
    """Project a stored document row to the /app read shape."""

    drop = set(_DROP)
    if not include_markdown:
        drop.add("markdown")
    return {k: v for k, v in doc.items() if k not in drop}


# An archived version row (P23.S2). `id` is an internal autoincrement on a
# DISPOSABLE table (reindex rebuilds every row from the .versions files on disk,
# so it is not stable and nothing may key off it), `tenant_id` is the scoping
# column, and `raw_html` is viewer-only — like the document surface, the raw
# bytes leave this plane through the /raw route alone, never in JSON.
_VERSION_DROP = {"id", "tenant_id", "raw_html"}


def _app_version(row: dict, *, include_markdown: bool) -> dict:
    """Project one archived-version row to the /app read shape."""

    drop = set(_VERSION_DROP)
    if not include_markdown:
        drop.add("markdown")
    return {k: v for k, v in row.items() if k not in drop}


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


async def _is_publicly_readable(doc: dict) -> bool:
    """Whether ``doc`` may be served to a caller who is **not** its owner (P19 gate).

    The public half of the trust boundary, extracted from ``_resolve_readable_doc``
    (P25.S2) so the slug resolver lands on the *same* predicate instead of
    re-deriving it. Three ordered guards, every one of them a plain ``False`` (the
    caller renders an indistinguishable 404 — never a 403):

    * **Legacy-mode guard** — ``DATABASE_URL`` unset ⇒ ``False`` before touching the
      (absent) accounts service, so the single-tenant template stack never 500s and
      never exposes a public path.
    * **Registry-less owner** — an empty/legacy ``''`` sentinel or an unparseable
      UUID ⇒ ``False``; such rows are never public.
    * **Visibility** — the owner tenant's project (resolved by *name*) must exist and
      be ``visibility == "public"``.

    Costs one Postgres round trip, so callers must keep it off the member fast-path.
    """

    if config.database_url() is None:
        return False  # legacy/template mode: no accounts registry ⇒ never public.
    owner = doc.get("tenant_id")
    if not owner:
        return False  # '' legacy sentinel / NULL: registry-less rows are never public.
    try:
        owner_uuid = UUID(str(owner))
    except (ValueError, TypeError):
        return False
    project = await get_accounts_service().get_project_by_name(owner_uuid, doc["project"])
    return project is not None and project.visibility == "public"


async def _resolve_readable_doc(
    conn, doc_id: int, ctx: AuthContext | None
) -> dict | None:
    """Resolve a document for a possibly-anonymous caller, or ``None`` (⇒ 404).

    The trust boundary for the P19 anonymous read surface. Two ordered gates:

    1. **Member fast-path.** With a resolved ``ctx``, try today's tenant-scoped
       fetch (``get_document(..., tenant_id=<caller>)``). A hit is served exactly as
       before — member behavior is **byte-preserved**, including legacy ``''``-row
       semantics — and the accounts service is never consulted.
    2. **Public path** (no ``ctx``, or a scoped miss — which covers anonymous *and*
       cross-org callers). An unscoped lookup gated by ``_is_publicly_readable``
       (legacy-mode guard, registry-less-owner guard, then the owner project's
       ``visibility == "public"``); a missing row ⇒ ``None`` too.

    Every miss returns ``None`` so the caller renders an indistinguishable 404:
    private and nonexistent look identical (404-never-403), and no private doc or
    cross-org existence ever leaks anonymously.
    """

    if ctx is not None:
        doc = db.get_document(conn, doc_id, tenant_id=str(ctx.tenant.id))
        if doc is not None:
            return doc
        # scoped miss: fall through to the public path (covers cross-org callers).

    if config.database_url() is None:
        return None  # legacy/template mode: no accounts registry ⇒ never public.

    doc = db.get_document(conn, doc_id)
    if doc is None:
        return None
    return doc if await _is_publicly_readable(doc) else None


# --- Canonical (pretty) share path (P25.S2) --------------------------------
#
# ``/@{org-slug}/{project}/{doc-slug}`` — the document's durable public URL,
# assembled from the Postgres org slug plus the two content-plane parts of the
# document's rel_path identity. Nothing here keys off ``documents.id`` (a
# disposable SQLite rowid). It is emitted on the DETAIL shape only — deliberately
# NOT inside ``_app_doc``, which is a pass-through key filter the LIST route uses
# too, and injecting it there would add a per-row Postgres lookup to every list.


# The ONE 404 every miss on the slug resolver raises. A single constant detail
# (echoing nothing back) is what makes "no such org", "no such project", "no such
# document" and "that project is private" literally indistinguishable — the id
# route's own detail embeds the requested id, so it cannot be shared verbatim.
_NO_SUCH_PATH_DETAIL = "no document at that path"


def _no_such_path() -> HTTPException:
    """A fresh 404 with the resolver's single, constant detail (404-never-403)."""

    return HTTPException(status_code=404, detail=_NO_SUCH_PATH_DETAIL)


def _canonical_path(org_slug: str | None, doc: dict) -> str | None:
    """The document's pretty public path, or ``None`` when the owner has no slug.

    A slug-less tenant simply has no pretty URL yet (``tenants.slug`` is nullable
    with no backfill), and every consumer falls back to ``/documents/{id}``.
    """

    if not org_slug:
        return None
    return f"/@{org_slug}/{doc['project']}/{doc['slug']}"


async def _document_canonical_path(doc: dict, ctx: AuthContext | None) -> str | None:
    """Resolve ``doc``'s canonical path for this caller — free on the member path.

    The owner's slug is already loaded on ``AuthContext.tenant`` when the caller IS
    the owner, so a member's detail read stays **Postgres-free**, exactly as
    ``_resolve_readable_doc``'s member fast-path is today. Only the anonymous /
    cross-org path pays a tenant lookup — that branch already makes a Postgres call
    for the visibility gate. Legacy mode, a registry-less owner and a slug-less
    owner all answer ``None``.
    """

    owner = str(doc.get("tenant_id") or "")
    if ctx is not None and owner == str(ctx.tenant.id):
        return _canonical_path(ctx.tenant.slug, doc)
    if config.database_url() is None or not owner:
        return None
    try:
        owner_uuid = UUID(owner)
    except (ValueError, TypeError):
        return None
    tenant = await get_accounts_service().get_tenant(owner_uuid)
    return None if tenant is None else _canonical_path(tenant.slug, doc)


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
    ctx: AuthContext | None = Depends(optional_user),
    conn=Depends(get_conn),
) -> dict[str, object]:
    """One document by id, with ``markdown`` — member-scoped **or** public (P19.S2).

    Optional-identity: a resolved caller gets their own tenant's document exactly as
    before (member behavior byte-preserved); an anonymous or cross-org caller gets
    the document only when it belongs to a **public** project (``_resolve_readable_doc``).
    A missing id, another tenant's *private* id, and a nonexistent id are all
    indistinguishable **404**s (404-never-403; private/nonexistent never leak).

    Carries the additive ``canonical_path`` (P25.S2): the document's pretty
    ``/@{org}/{project}/{slug}`` URL, or ``null`` when the owner tenant has no org
    slug (or in legacy mode). Built here, once, in the backend — no consumer
    assembles a pretty URL itself.
    """

    doc = await _resolve_readable_doc(conn, doc_id, ctx)
    if doc is None:
        raise HTTPException(status_code=404, detail=f"no document with id {doc_id}")
    return {
        **_app_doc(doc, include_markdown=True),
        "canonical_path": await _document_canonical_path(doc, ctx),
    }


@router.get("/app/orgs/{org}/{project}/{slug}")
async def resolve_document_by_slug(
    org: str,
    project: str,
    slug: str,
    ctx: AuthContext | None = Depends(optional_user),
    conn=Depends(get_conn),
) -> dict[str, object]:
    """One document by its DURABLE public identity: org slug + project + doc slug.

    The backend half of the pretty share URL ``/@{org}/{project}/{slug}`` (P25.S2).
    The ``@`` is a web-plane convention: this route takes the **bare** slug, and the
    BFF strips the prefix before calling. Resolution is Postgres org slug → tenant →
    ``db.find_latest_document_by_slug`` (``date DESC, id DESC``, tenant-scoped), so
    a dateless pretty URL means "the newest document under this title" and nothing
    durable keys off the disposable ``documents.id``.

    Same trust semantics as ``GET /app/documents/{doc_id}``, reached by the same
    predicate rather than a re-derivation: legacy-mode guard first, then a member
    fast-path (a caller who owns the tenant reads it whatever its visibility), then
    ``_is_publicly_readable``. **Every** miss — legacy mode, an unknown/malformed/
    reserved org slug (``get_tenant_by_slug`` normalizes and answers ``None`` with
    no DB round trip), a project or doc slug that does not exist, a private project
    — raises the one identical 404, so nonexistent and forbidden stay
    indistinguishable (404-never-403).

    The response is the ordinary detail projection, so it carries ``id`` and the
    ``/versions*`` + ``/raw`` reads stay id-keyed and untouched. ``canonical_path``
    is always non-null here: resolution came *through* the slug.
    """

    if config.database_url() is None:
        raise _no_such_path()  # legacy/template: no accounts registry, no orgs.
    tenant = await get_accounts_service().get_tenant_by_slug(org)
    if tenant is None:
        raise _no_such_path()
    doc = db.find_latest_document_by_slug(conn, project, slug, tenant_id=str(tenant.id))
    if doc is None:
        raise _no_such_path()
    is_member = ctx is not None and ctx.tenant.id == tenant.id
    if not is_member and not await _is_publicly_readable(doc):
        raise _no_such_path()
    return {
        **_app_doc(doc, include_markdown=True),
        "canonical_path": _canonical_path(tenant.slug, doc),
    }


@router.get("/app/documents/{doc_id}/raw")
async def get_document_raw(
    doc_id: int,
    ctx: AuthContext | None = Depends(optional_user),
    conn=Depends(get_conn),
) -> Response:
    """Serve one HTML explainer's raw HTML as ``text/html`` for the sandboxed viewer.

    Optional-identity like ``GET /app/documents/{id}`` (P19.S2): a resolved caller
    reads their own tenant's raw HTML exactly as before (member behavior
    byte-preserved), and an anonymous or cross-org caller reads it only when it
    belongs to a **public** project (``_resolve_readable_doc``). A missing id,
    another tenant's *private* id, a non-HTML doc (``format != "html"``), or an empty
    ``raw_html`` all answer **404** (private/nonexistent existence never leaks). The
    response carries the sandbox headers that make it safe to frame the untrusted
    explainer in an opaque-origin iframe AND privilege-strip a direct top-level
    visit (defense in depth): ``Content-Security-Policy: sandbox allow-scripts;
    frame-ancestors 'self'`` applies the sandbox to the top-level document too, and
    the ``X-Frame-Options: SAMEORIGIN`` here overrides the global ``DENY`` so only
    the same-origin app may frame it. ``no-store`` keeps the raw bytes uncached and
    ``nosniff`` pins the content type. This route is unmetered (``/app``) — no usage
    stash. The served bytes are the raw body (no comment-frontmatter), so the
    document starts at ``<!DOCTYPE html>`` with no quirks-mode prefix.
    """

    doc = await _resolve_readable_doc(conn, doc_id, ctx)
    if doc is None or doc.get("format") != "html" or not doc.get("raw_html"):
        raise HTTPException(status_code=404, detail=f"no HTML document with id {doc_id}")
    return Response(
        content=doc["raw_html"],
        media_type="text/html; charset=utf-8",
        headers={
            "Content-Security-Policy": "sandbox allow-scripts; frame-ancestors 'self'",
            "X-Frame-Options": "SAMEORIGIN",
            "X-Content-Type-Options": "nosniff",
            "Cache-Control": "no-store",
        },
    )


# --- Version history (P23.S2) ---------------------------------------------
#
# Three optional-identity reads over a document's archived versions. Each one
# resolves the CURRENT document first (``_resolve_readable_doc`` — member
# fast-path, then the public-project fallback; every miss a 404, never a 403),
# then reads the archive by that document's ``rel_path``: ``document_versions``
# is identity-keyed by ``(tenant_id, rel_path, version)``, never by
# ``documents.id``, so an id-keyed route must go through the document row. The
# archive is scoped to the OWNING document's ``tenant_id`` (not the caller's), so
# an anonymous reader of a public document sees that document's history and can
# never reach across tenants. Unmetered like every other /app route (F4): none of
# them sets ``request.state.usage``.


def _archive_tenant(doc: dict) -> str:
    """The tenant scope for a document's archived rows: the owner's, verbatim.

    Version rows are stamped with the same ``tenant_id`` as the document they
    belong to (the ``''`` legacy sentinel included), so passing the owner's value
    through — rather than the caller's, which is absent for an anonymous public
    read — scopes the read exactly to that document's own history.
    """

    return str(doc.get("tenant_id") or "")


@router.get("/app/documents/{doc_id}/versions")
async def list_document_versions(
    doc_id: int,
    ctx: AuthContext | None = Depends(optional_user),
    conn=Depends(get_conn),
) -> dict[str, object]:
    """One document's superseded versions, newest first, without their bodies.

    ``{rel_path, current_version, total, versions}`` — the same shape the ``/api``
    plane serves. Only ARCHIVED bodies are listed: the current version *is* the
    document, so ``current_version`` (``documents.version``, already on the
    document read) completes the chain — a v3 document answers
    ``current_version: 3`` with v2 and v1 in ``versions``. An unversioned document
    answers ``current_version: 1`` and an empty list, so the UI can render "no
    history" without a second call.
    """

    doc = await _resolve_readable_doc(conn, doc_id, ctx)
    if doc is None:
        raise HTTPException(status_code=404, detail=f"no document with id {doc_id}")
    rows = db.list_document_versions(conn, doc["rel_path"], tenant_id=_archive_tenant(doc))
    return {
        "rel_path": doc["rel_path"],
        "current_version": int(doc.get("version") or 1),
        "total": len(rows),
        "versions": [_app_version(r, include_markdown=False) for r in rows],
    }


@router.get("/app/documents/{doc_id}/versions/{version}")
async def get_document_version(
    doc_id: int,
    version: int,
    ctx: AuthContext | None = Depends(optional_user),
    conn=Depends(get_conn),
) -> dict[str, object]:
    """One superseded version with its ``markdown`` body, for the past-version view.

    The CURRENT version is not addressable here — it is the document itself
    (``GET /app/documents/{doc_id}``) — so asking for it is an ordinary **404**,
    exactly like a version that never existed or a document the caller may not
    read. An html version's readable text is served here too (``markdown`` holds
    the extracted plain text); its rendered body comes from the ``/raw`` twin
    below.
    """

    doc = await _resolve_readable_doc(conn, doc_id, ctx)
    row = (
        None
        if doc is None
        else db.get_document_version(
            conn, doc["rel_path"], version, tenant_id=_archive_tenant(doc)
        )
    )
    if row is None:
        raise HTTPException(
            status_code=404, detail=f"no version {version} of document {doc_id}"
        )
    return _app_version(row, include_markdown=True)


@router.get("/app/documents/{doc_id}/versions/{version}/raw")
async def get_document_version_raw(
    doc_id: int,
    version: int,
    ctx: AuthContext | None = Depends(optional_user),
    conn=Depends(get_conn),
) -> Response:
    """An archived HTML version's raw HTML — the ``/raw`` route's version-aware twin.

    Identical contract to ``GET /app/documents/{doc_id}/raw``, pointed at an
    archived body instead of the current one: same optional-identity resolution,
    and a missing document, an unreadable one, a missing version, a non-HTML
    version (``format != "html"``) or an empty ``raw_html`` all answer the same
    indistinguishable **404**. The sandbox headers are repeated verbatim from that
    route — ``Content-Security-Policy: sandbox allow-scripts; frame-ancestors
    'self'`` sandboxes the top-level document as well as the iframe,
    ``X-Frame-Options: SAMEORIGIN`` overrides the global ``DENY`` so only the
    same-origin app may frame it, ``nosniff`` pins the type and ``no-store`` keeps
    the bytes uncached — because an archived explainer is exactly as untrusted as
    the current one. Unmetered (``/app``).
    """

    doc = await _resolve_readable_doc(conn, doc_id, ctx)
    row = (
        None
        if doc is None
        else db.get_document_version(
            conn, doc["rel_path"], version, tenant_id=_archive_tenant(doc)
        )
    )
    if row is None or row.get("format") != "html" or not row.get("raw_html"):
        raise HTTPException(
            status_code=404, detail=f"no HTML version {version} of document {doc_id}"
        )
    return Response(
        content=row["raw_html"],
        media_type="text/html; charset=utf-8",
        headers={
            "Content-Security-Policy": "sandbox allow-scripts; frame-ancestors 'self'",
            "X-Frame-Options": "SAMEORIGIN",
            "X-Content-Type-Options": "nosniff",
            "Cache-Control": "no-store",
        },
    )


def _delete_owned_document(doc_id: int, api_ctx: ApiAuthContext) -> bool:
    """Look up + hard-delete one document, in a worker thread. ``False`` ⇒ 404.

    Runs **entirely off the event loop** (``run_in_threadpool``): the delete is
    synchronous, takes ``server/main.py``'s process-wide ``threading`` ``WRITE_LOCK``,
    and — for a public-root caller — shells out to git for a local commit (the push,
    when ``KB_GIT_PUSH`` is on, is queued on the after-response publish worker since
    P24 and no longer runs here). Blocking the loop on that would stall every other
    request.

    Two consequences shape this function:

    * **Its own SQLite connection, opened here.** SQLite forbids using a connection
      from a thread other than the one that created it, and this module's ``get_conn``
      dependency deliberately opens its connection on the event-loop thread (see its
      docstring), so it must not be handed across. The connection is opened and closed
      inside the worker.
    * **A deferred import of ``_delete_document``.** ``server/main.py`` imports this
      module at load to mount the router, so a module-level ``import server.main`` here
      would be circular. At request time ``main`` is fully loaded, so a function-level
      import is safe — and it keeps exactly **one** ``WRITE_LOCK`` object in the process
      (the lock is taken inside ``_delete_document`` itself; this function must not wrap
      the call in it — it is not reentrant).

    The lookup is tenant-scoped, so another tenant's id is simply a miss (⇒ 404,
    never 403) and the delete can never cross tenants.
    """

    from server.main import _delete_document  # deferred: main imports this module.

    conn = db.connect()
    try:
        doc = db.get_document(conn, doc_id, tenant_id=str(api_ctx.tenant_id))
        if doc is None:
            return False
        _delete_document(conn, doc, api_ctx, commit=True, co_authored_by=None)
        return True
    finally:
        conn.close()


@router.delete("/app/documents/{doc_id}", status_code=204, response_class=Response)
async def delete_document(
    doc_id: int,
    ctx: AuthContext = Depends(require_user),
) -> Response:
    """Hard-delete one of the caller's own documents — **204**, unmetered (P21.S1).

    The web app's delete. Member-only and **without** the P19 public fallback the GET
    routes carry: a document is deletable only through a tenant-scoped lookup, so an
    anonymous caller gets 401 and another tenant's (or a nonexistent) id is an
    indistinguishable **404** — reading a public document never implies deleting it.

    Reuses ``server/main.py``'s ``_delete_document`` — file unlink, public Recent-index
    bullet, DB row (FTS row via the AFTER DELETE trigger, embeddings via
    ``ON DELETE CASCADE``), then the scoped git commit/push for the public root — so the
    web plane and the ``/api`` plane delete identically, including the non-transactional
    ordering (the file goes first; a failed commit never restores it). What it does *not*
    reuse is the ``/api`` route, which meters ``EVENT_DOCUMENT_DELETED``: this handler
    never sets ``request.state.usage``, keeping the ``/app`` plane free.

    ``_delete_document`` wants an ``ApiAuthContext``, so the session ``AuthContext`` is
    bridged to one: the caller's tenant, no project/credential (a session has neither),
    and ``is_public`` by the same rule ``resolve_api_write`` applies — tenant #1 is the
    public ``docs/`` root, every other tenant its namespaced ``tenants/<uuid>/`` one.
    Getting that flag right decides which root the file is unlinked from and whether the
    Recent index and git commit run, so it is resolved here (an ``await``) before the
    worker thread starts.

    Success is **204 No Content**: ``_delete_document``'s result dict (commit sha, push
    state, …) is machine-plane reporting the UI has no use for.
    """

    tenant_one_id = await get_tenant_one_id()
    api_ctx = ApiAuthContext(
        tenant_id=ctx.tenant.id,
        project_id=None,
        credential_id=None,
        # resolve_api_write's rule, minus its legacy branch: the /app plane only exists
        # when the accounts plane is configured, so tenant_id is never None here.
        is_public=ctx.tenant.id == tenant_one_id,
    )
    deleted = await run_in_threadpool(_delete_owned_document, doc_id, api_ctx)
    if not deleted:
        raise HTTPException(status_code=404, detail=f"no document with id {doc_id}")
    return Response(status_code=204)


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
