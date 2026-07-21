"""Account-scoped control-plane routes: the caller's tenant, projects, and keys.

User-authenticated ``/app/*`` surface (outside ``/api/*`` so neither the
content-ingest bearer guard nor the read guard touches it). Every handler is
gated by ``Depends(require_user)``; a raised ``AuthError`` is rendered as a
generic 401 by the app-wide handler registered in ``server/main.py``. Project
reads are scoped to the caller's tenant: a project that is missing *or* owned by
another tenant answers **404**, so cross-tenant existence never leaks. Credential
endpoints mint a per-project ingest key whose plaintext ``vk_`` value is returned
once (on create) and never persisted or re-exposed — only its sha256 hash and a
short display prefix are stored.

Ported from vocky ``app_api.py`` (Starlette → FastAPI): body binding and path
params are FastAPI-native (malformed UUID / blank name → standard **422**, not
vocky's Starlette 400-single-string), while the 404-both-cases scoping guard is
preserved verbatim. The credential body stays optional — an empty POST still
mints (``name=None``).
"""

from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Response
from pydantic import BaseModel, Field, field_validator

from server.accounts.auth import AuthContext, require_user
from server.accounts.security import generate_opaque_token, sha256_hex
from server.accounts.service import get_accounts_service
from server.accounts.types import CreateProject, CreateProjectCredential
from server.auth_api import serialize_tenant

router = APIRouter()


class CreateProjectInput(BaseModel):
    """Project-creation request body."""

    name: str = Field(min_length=1, max_length=200)

    @field_validator("name")
    @classmethod
    def _strip_name(cls, value: str) -> str:
        stripped = value.strip()
        if not stripped:
            raise ValueError("must not be blank")
        return stripped


class CreateCredentialInput(BaseModel):
    """Credential-creation request body. ``name`` is an optional display label."""

    name: str | None = Field(default=None, max_length=200)

    @field_validator("name")
    @classmethod
    def _strip_name(cls, value: str | None) -> str | None:
        if value is None:
            return None
        return value.strip() or None


def serialize_project(record) -> dict[str, object]:
    """Serialize a project for a response."""

    return {
        "id": str(record.id),
        "name": record.name,
        "tenant_id": str(record.tenant_id),
        "created_at": record.created_at.isoformat(),
    }


def serialize_credential(record) -> dict[str, object]:
    """Serialize a project credential's metadata (never exposes ``token_hash``)."""

    return {
        "id": str(record.id),
        "project_id": str(record.project_id),
        "name": record.name,
        "token_prefix": record.token_prefix,
        "created_at": record.created_at.isoformat(),
        "last_used_at": (
            record.last_used_at.isoformat() if record.last_used_at else None
        ),
        "revoked_at": (
            record.revoked_at.isoformat() if record.revoked_at else None
        ),
    }


async def _load_scoped_project(project_id: UUID, ctx: AuthContext):
    """Resolve ``project_id`` scoped to the caller's tenant.

    Answers **404** both when the project is missing and when it belongs to
    another tenant, so cross-tenant existence never leaks.
    """

    project = await get_accounts_service().get_project(project_id)
    if project is None or project.tenant_id != ctx.tenant.id:
        raise HTTPException(status_code=404, detail="project not found")
    return project


@router.get("/app/tenant")
async def get_tenant(ctx: AuthContext = Depends(require_user)) -> dict[str, object]:
    """Return the authenticated caller's active tenant."""

    return {"tenant": serialize_tenant(ctx.tenant)}


@router.get("/app/projects")
async def list_projects(
    ctx: AuthContext = Depends(require_user),
) -> dict[str, object]:
    """Return the caller's tenant's projects, oldest-first."""

    service = get_accounts_service()
    projects = await service.list_projects_for_tenant(ctx.tenant.id)
    return {"projects": [serialize_project(project) for project in projects]}


@router.post("/app/projects", status_code=201)
async def create_project(
    payload: CreateProjectInput,
    ctx: AuthContext = Depends(require_user),
) -> dict[str, object]:
    """Create a project under the caller's tenant."""

    service = get_accounts_service()
    project = await service.create_project(
        CreateProject(tenant_id=ctx.tenant.id, name=payload.name)
    )
    return {"project": serialize_project(project)}


@router.get("/app/projects/{project_id}")
async def get_project(
    project_id: UUID,
    ctx: AuthContext = Depends(require_user),
) -> dict[str, object]:
    """Return one of the caller's tenant's projects by id (404 if cross-tenant)."""

    project = await _load_scoped_project(project_id, ctx)
    return {"project": serialize_project(project)}


@router.post("/app/projects/{project_id}/credentials", status_code=201)
async def create_credential(
    project_id: UUID,
    ctx: AuthContext = Depends(require_user),
    body: CreateCredentialInput = CreateCredentialInput(),
) -> dict[str, object]:
    """Mint a per-project ingest credential; the plaintext ``vk_`` key is returned once.

    The raw key is emitted only in this response; only its sha256 hash (and a
    short display prefix) is persisted, so it can never be recovered afterward.
    """

    project = await _load_scoped_project(project_id, ctx)
    key = f"vk_{generate_opaque_token()}"
    record = await get_accounts_service().create_project_credential(
        CreateProjectCredential(
            tenant_id=project.tenant_id,
            project_id=project.id,
            token_prefix=key[:12],
            token_hash=sha256_hex(key),
            name=body.name,
        )
    )
    return {"credential": serialize_credential(record), "key": key}


@router.get("/app/projects/{project_id}/credentials")
async def list_credentials(
    project_id: UUID,
    ctx: AuthContext = Depends(require_user),
) -> dict[str, object]:
    """List a project's credentials (metadata only; includes revoked)."""

    project = await _load_scoped_project(project_id, ctx)
    credentials = await get_accounts_service().list_project_credentials(project.id)
    return {
        "credentials": [serialize_credential(record) for record in credentials]
    }


@router.delete("/app/projects/{project_id}/credentials/{credential_id}", status_code=204)
async def delete_credential(
    project_id: UUID,
    credential_id: UUID,
    ctx: AuthContext = Depends(require_user),
) -> Response:
    """Revoke one of a project's credentials by id (idempotent soft-revoke).

    Answers 404 when the credential does not belong to the scoped project, so a
    caller cannot revoke or probe another project's credential ids.
    """

    project = await _load_scoped_project(project_id, ctx)
    service = get_accounts_service()
    credentials = await service.list_project_credentials(project.id)
    if not any(record.id == credential_id for record in credentials):
        raise HTTPException(status_code=404, detail="credential not found")
    await service.revoke_credential(credential_id)
    return Response(status_code=204)
