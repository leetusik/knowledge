"""Books on the /app plane (P30.S2): member reads and the public, project-gated read.

Three unmetered routes over the derived book index (``server/db.py`` book helpers;
the manifests in ``server/books.py`` are the truth):

* ``GET /app/books`` — the caller's tenant's books, optionally one project's
  (``project`` is a control-plane project UUID, bridged to its name exactly like
  ``/app/documents``; missing or another tenant's -> 404) -> ``{total, items}``.
* ``GET /app/books/{project}/{book}`` — one of the caller's books by project NAME
  and book slug, with its ordered chapters and their live variants. Member-only
  (``require_user``): another tenant's book, or none, is a 404.
* ``GET /app/orgs/{org}/library`` — an org's library (P30.S22): its books with their
  chapters and variants, and its loose documents, over the projects the caller may read
  (every project for a member, only the public ones for anyone else; ``scope=public``
  narrows a member to the public ones too, for the org's public page).
* ``GET /app/orgs/{org}/{project}/books/{book}`` — the same book addressed by its
  durable public identity, backing the reader URL ``/@{org}/{project}/books/{book}``.
  ``org`` is the org slug, or the tenant id for a tenant without one (P30.S11,
  OQ26 — the graph's and reader state's rule, parsed UUID first).
  Optional-identity: a member of the org reads it whatever the project's
  visibility; anyone else only when the project is **public**. Every miss (legacy
  mode, no such org, no such project or book, a private project) is the one
  identical 404 — never a 403 — exactly like ``/app/orgs/{org}/{project}/{slug}``.
  It is four segments after the org, so it cannot collide with that 3-segment
  document route.

A book belongs to exactly one project, so one project-visibility check covers the
book and every chapter document it lists (each variant's ``doc_id`` is then read
through the existing ``/app/documents/{id}`` routes, which re-check visibility).
Never sets ``request.state.usage``.
"""

from __future__ import annotations

from typing import Literal
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException

from server import config, db
from server.accounts.auth import AuthContext, optional_user, require_user
from server.accounts.service import get_accounts_service
from server.documents_api import _resolve_project_name, get_conn
from server.reader_state import doc_of, org_label

router = APIRouter()

# The ONE 404 every miss on the public book route raises (404-never-403).
_NO_SUCH_BOOK_DETAIL = "no book at that path"


def _no_such_book() -> HTTPException:
    return HTTPException(status_code=404, detail=_NO_SUCH_BOOK_DETAIL)


def _app_book(book: dict) -> dict:
    """The /app book shape: the derived row minus the internal ``tenant_id``."""
    return {k: v for k, v in book.items() if k != "tenant_id"}


def _book_canonical_path(org: str, project: str, book: str) -> str:
    """``/@{org}/{project}/books/{book}`` on ``org_label`` (slug, else tenant id).

    P30.S11: a slug-less tenant's books get a path on the tenant id instead of
    ``None``, so the reader URL (web ``orgSegment``) always resolves back here.
    """

    return f"/@{org}/{project}/books/{book}"


async def _resolve_org(org: str):
    """``org`` as a tenant: a tenant id (UUID first, like ``/app/graph``) or an org slug."""

    try:
        tenant_id = UUID(org)
    except (ValueError, AttributeError, TypeError):
        return await get_accounts_service().get_tenant_by_slug(org)
    return await get_accounts_service().get_tenant(tenant_id)


@router.get("/app/books")
async def list_books(
    project: UUID | None = None,
    ctx: AuthContext = Depends(require_user),
    conn=Depends(get_conn),
) -> dict[str, object]:
    """The caller's tenant's books with chapter counts, project then title order."""

    project_name = (
        await _resolve_project_name(project, ctx) if project is not None else None
    )
    items = db.list_books(conn, tenant_id=str(ctx.tenant.id), project=project_name)
    return {"total": len(items), "items": [_app_book(b) for b in items]}


@router.get("/app/books/{project}/{book}")
async def get_book(
    project: str,
    book: str,
    ctx: AuthContext = Depends(require_user),
    conn=Depends(get_conn),
) -> dict[str, object]:
    """One of the caller's books; another tenant's or a missing one is a 404."""

    found = db.get_book(conn, project=project, slug=book, tenant_id=str(ctx.tenant.id))
    if found is None:
        raise HTTPException(status_code=404, detail=_NO_SUCH_BOOK_DETAIL)
    return {
        **_app_book(found),
        "canonical_path": _book_canonical_path(org_label(ctx.tenant), project, book),
    }


@router.get("/app/orgs/{org}/{project}/books/{book}")
async def resolve_book_by_slug(
    org: str,
    project: str,
    book: str,
    ctx: AuthContext | None = Depends(optional_user),
    conn=Depends(get_conn),
) -> dict[str, object]:
    """One book by org (slug or tenant id) + project + book slug, gated by visibility.

    Resolution: Postgres org slug or tenant id -> tenant -> the tenant-scoped book
    row. ``canonical_path`` names the slug when the tenant has one, so a member who
    arrived on the tenant-id path can be sent on to the pretty one. A member
    of that tenant reads it whatever the project's visibility; any other caller,
    anonymous or cross-org, only when the owning project is ``public``. Every miss
    is the same 404 detail, so a private project and a nonexistent one look
    identical.
    """

    if config.database_url() is None:
        raise _no_such_book()  # legacy/template: no accounts registry, no orgs.
    tenant = await _resolve_org(org)
    if tenant is None:
        raise _no_such_book()
    found = db.get_book(conn, project=project, slug=book, tenant_id=str(tenant.id))
    if found is None:
        raise _no_such_book()
    is_member = ctx is not None and ctx.tenant.id == tenant.id
    if not is_member:
        registry = await get_accounts_service().get_project_by_name(tenant.id, project)
        if registry is None or registry.visibility != "public":
            raise _no_such_book()
    return {
        **_app_book(found),
        "canonical_path": _book_canonical_path(org_label(tenant), project, book),
    }


_NO_SUCH_LIBRARY_DETAIL = "no library at that address"


@router.get("/app/orgs/{org}/library")
async def org_library(
    org: str,
    scope: Literal["all", "public"] = "all",
    ctx: AuthContext | None = Depends(optional_user),
    conn=Depends(get_conn),
) -> dict[str, object]:
    """An org's library: books (with chapters) and loose documents, visibility-gated.

    A member of the org reads every project (``scope=all``, the default) or only the
    public ones (``scope=public``, the org's public page); any other caller, anonymous
    or cross-org, reads the public ones only. Every miss, an unknown org and an org
    that shows a stranger nothing (no public project), is the one identical 404, never
    a 403. A member's response also carries their private projects, flagged by
    ``visibility``; they are the only ones that name it. ``projects`` lists every
    project the response is over, so a project with nothing to read is countable.
    """

    if config.database_url() is None:
        raise HTTPException(status_code=404, detail=_NO_SUCH_LIBRARY_DETAIL)
    tenant = await _resolve_org(org)
    if tenant is None:
        raise HTTPException(status_code=404, detail=_NO_SUCH_LIBRARY_DETAIL)
    member = ctx is not None and ctx.tenant.id == tenant.id
    registry = await get_accounts_service().list_projects_for_tenant(tenant.id)
    if member and scope == "all":
        visible = list(registry)
    else:
        visible = [p for p in registry if p.visibility == "public"]
    if not member and not visible:
        raise HTTPException(status_code=404, detail=_NO_SUCH_LIBRARY_DETAIL)
    names = [p.name for p in visible]
    tid = str(tenant.id)
    label = org_label(tenant)

    books = []
    for row in db.list_books(conn, tenant_id=tid):
        if row["project"] not in names:
            continue
        found = db.get_book(conn, project=row["project"], slug=row["slug"], tenant_id=tid)
        if found is None:
            continue
        books.append(
            {
                "project": found["project"],
                "slug": found["slug"],
                "title": found["title"],
                "kind": found["kind"],
                "subject": found["subject"],
                "chapters": [
                    {
                        "key": ch["key"],
                        "position": ch["position"],
                        "title": ch["title"],
                        "variants": [
                            {
                                "lang": v["lang"],
                                "doc": doc_of(found["project"], v["rel_path"]),
                                "doc_id": v["doc_id"],
                                "title": v["title"],
                                "version": v["version"],
                                "format": v["format"],
                            }
                            for v in ch["variants"]
                        ],
                    }
                    for ch in found["chapters"]
                ],
            }
        )
    documents = [
        {
            "id": d["id"],
            "project": d["project"],
            "slug": d["slug"],
            "doc": doc_of(d["project"], d["rel_path"]),
            "title": d["title"],
            "date": d["date"],
            "format": d["format"] or "md",
            "lang": d["lang"] or "en",
            "version": int(d["version"] or 1),
            "subject": d["subject"],
            "canonical_path": (
                f"/@{tenant.slug}/{d['project']}/{d['slug']}" if tenant.slug else None
            ),
        }
        for d in db.list_loose_documents(conn, tenant_id=tid, projects=names)
    ]
    return {
        "org": {"id": str(tenant.id), "slug": tenant.slug, "name": tenant.name, "label": label},
        "member": member,
        "projects": [{"name": p.name, "visibility": p.visibility} for p in visible],
        "books": books,
        "documents": documents,
    }
