"""Books on the /app plane (P30.S2): member reads and the public, project-gated read.

Three unmetered routes over the derived book index (``server/db.py`` book helpers;
the manifests in ``server/books.py`` are the truth):

* ``GET /app/books`` — the caller's tenant's books, optionally one project's
  (``project`` is a control-plane project UUID, bridged to its name exactly like
  ``/app/documents``; missing or another tenant's -> 404) -> ``{total, items}``.
* ``GET /app/books/{project}/{book}`` — one of the caller's books by project NAME
  and book slug, with its ordered chapters and their live variants. Member-only
  (``require_user``): another tenant's book, or none, is a 404.
* ``GET /app/orgs/{org}/{project}/books/{book}`` — the same book addressed by its
  durable public identity, backing the reader URL ``/@{org}/{project}/books/{book}``.
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

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException

from server import config, db
from server.accounts.auth import AuthContext, optional_user, require_user
from server.accounts.service import get_accounts_service
from server.documents_api import _resolve_project_name, get_conn

router = APIRouter()

# The ONE 404 every miss on the public book route raises (404-never-403).
_NO_SUCH_BOOK_DETAIL = "no book at that path"


def _no_such_book() -> HTTPException:
    return HTTPException(status_code=404, detail=_NO_SUCH_BOOK_DETAIL)


def _app_book(book: dict) -> dict:
    """The /app book shape: the derived row minus the internal ``tenant_id``."""
    return {k: v for k, v in book.items() if k != "tenant_id"}


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
    org_slug = ctx.tenant.slug
    return {
        **_app_book(found),
        "canonical_path": f"/@{org_slug}/{project}/books/{book}" if org_slug else None,
    }


@router.get("/app/orgs/{org}/{project}/books/{book}")
async def resolve_book_by_slug(
    org: str,
    project: str,
    book: str,
    ctx: AuthContext | None = Depends(optional_user),
    conn=Depends(get_conn),
) -> dict[str, object]:
    """One book by org slug + project + book slug, gated by project visibility.

    Resolution: Postgres org slug -> tenant -> the tenant-scoped book row. A member
    of that tenant reads it whatever the project's visibility; any other caller,
    anonymous or cross-org, only when the owning project is ``public``. Every miss
    is the same 404 detail, so a private project and a nonexistent one look
    identical.
    """

    if config.database_url() is None:
        raise _no_such_book()  # legacy/template: no accounts registry, no orgs.
    tenant = await get_accounts_service().get_tenant_by_slug(org)
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
        "canonical_path": f"/@{tenant.slug}/{project}/books/{book}",
    }
