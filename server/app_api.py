"""Account-scoped control-plane routes: the caller's tenant, projects, and keys.

User-authenticated ``/app/*`` surface (outside ``/api/*`` so neither the
content-ingest bearer guard nor the read guard touches it). Every handler is
gated by ``Depends(require_user)``; a raised ``AuthError`` is rendered as a
generic 401 by the app-wide handler registered in ``server/main.py``. Project
reads are scoped to the caller's tenant: a project that is missing *or* owned by
another tenant answers **404**, so cross-tenant existence never leaks. Credential
endpoints mint either a per-project ingest key (``/app/projects/{id}/credentials``)
or an org-level key (``/app/credentials``, ``project_id NULL`` — one key authorizes
every project in the org); either way the plaintext ``vk_`` value is returned once
(on create) and never persisted or re-exposed — only its sha256 hash and a short
display prefix are stored. Projects are get-or-create by name (``POST /app/projects``
is idempotent on the tenant's ``UNIQUE(tenant_id, name)``). ``PATCH /app/tenant``
claims the caller's tenant's public **org slug** (the ``{org}`` of a pretty share
URL) — 422 on a malformed/reserved value, 409 when another tenant holds it.

Ported from vocky ``app_api.py`` (Starlette → FastAPI): body binding and path
params are FastAPI-native (malformed UUID / blank name → standard **422**, not
vocky's Starlette 400-single-string), while the 404-both-cases scoping guard is
preserved verbatim. The credential body stays optional — an empty POST still
mints (``name=None``).
"""

from __future__ import annotations

import logging
from typing import Literal
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Response
from pydantic import BaseModel, Field, field_validator
from starlette.concurrency import run_in_threadpool

from server import config, db, publish, write_lock
from server import reconcile as reconcile_mod
from server.accounts.auth import AuthContext, require_user
from server.accounts.security import generate_opaque_token, sha256_hex
from server.accounts.service import DuplicateOrgSlugError, get_accounts_service
from server.accounts.slugs import InvalidOrgSlugError, normalize_org_slug
from server.accounts.types import CreateProject, CreateProjectCredential
from server.api_auth import get_tenant_one_id
from server.auth_api import serialize_tenant

logger = logging.getLogger(__name__)

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


class SetProjectVisibilityInput(BaseModel):
    """Visibility-toggle request body. Any other value gets a free 422 from the Literal."""

    visibility: Literal["private", "public"]


class SetTenantSlugInput(BaseModel):
    """Org-slug request body, validated against the shared rules in ``accounts.slugs``.

    The validator normalizes (trim + lowercase) and rejects a malformed or reserved
    slug by re-raising as a ``ValueError``, which FastAPI renders as a standard 422
    whose message cites the constraint — so the rule is stated in exactly one place
    and the endpoint never has to restate it.
    """

    # The 200-char outer bound is a cheap body guard only (the real 2-40 length rule
    # lives in ``normalize_org_slug``, so an over-long-but-plausible slug still gets
    # the constraint-citing message rather than a bare pydantic length error).
    slug: str = Field(max_length=200)

    @field_validator("slug")
    @classmethod
    def _normalize_slug(cls, value: str) -> str:
        try:
            return normalize_org_slug(value)
        except InvalidOrgSlugError as exc:
            raise ValueError(str(exc)) from exc


def serialize_project(record) -> dict[str, object]:
    """Serialize a project for a response."""

    return {
        "id": str(record.id),
        "name": record.name,
        "tenant_id": str(record.tenant_id),
        "visibility": record.visibility,
        "created_at": record.created_at.isoformat(),
    }


def serialize_credential(record) -> dict[str, object]:
    """Serialize a credential's metadata (never exposes ``token_hash``).

    ``project_id`` is ``None`` for an org-level credential and a UUID string for a
    project-bound one — NULL-safe so org keys never serialize the literal ``"None"``.
    """

    return {
        "id": str(record.id),
        "project_id": str(record.project_id) if record.project_id is not None else None,
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


@router.patch("/app/tenant")
async def set_tenant_slug(
    payload: SetTenantSlugInput,
    ctx: AuthContext = Depends(require_user),
) -> dict[str, object]:
    """Claim the caller's tenant's public org slug; returns the updated tenant.

    Session-only (``require_user``), and scoped implicitly to the caller's own
    tenant — there is no tenant id in the path, so no cross-tenant surface exists.
    A malformed or reserved slug is a **422** from ``SetTenantSlugInput`` (message
    citing the constraint) before any DB work; a slug already held by another tenant
    is a **409** from the translated ``UNIQUE`` violation, never a 500. Re-claiming
    the tenant's own current slug succeeds unchanged.
    """

    try:
        updated = await get_accounts_service().set_tenant_slug(
            ctx.tenant.id, payload.slug
        )
    except InvalidOrgSlugError as exc:  # defense in depth; the body validator ran first
        raise HTTPException(status_code=422, detail=str(exc))
    except DuplicateOrgSlugError:
        raise HTTPException(
            status_code=409, detail="that org slug is already taken"
        )
    if updated is None:  # the session's own tenant vanished mid-request
        raise HTTPException(status_code=404, detail="tenant not found")
    return {"tenant": serialize_tenant(updated)}


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
    """Get-or-create a project by name under the caller's tenant.

    Idempotent on name (``UNIQUE(tenant_id, name)``): a duplicate name returns the
    existing row with the same 201 shape instead of a 500 from the unique violation.
    """

    service = get_accounts_service()
    project = await service.get_or_create_project(ctx.tenant.id, payload.name)
    return {"project": serialize_project(project)}


@router.get("/app/projects/{project_id}")
async def get_project(
    project_id: UUID,
    ctx: AuthContext = Depends(require_user),
) -> dict[str, object]:
    """Return one of the caller's tenant's projects by id (404 if cross-tenant)."""

    project = await _load_scoped_project(project_id, ctx)
    return {"project": serialize_project(project)}


@router.patch("/app/projects/{project_id}")
async def set_project_visibility(
    project_id: UUID,
    payload: SetProjectVisibilityInput,
    ctx: AuthContext = Depends(require_user),
) -> dict[str, object]:
    """Toggle a project's visibility (``private``/``public``); 404 if cross-tenant.

    Session-only (``require_user``); the ``_load_scoped_project`` guard answers 404
    for a missing *or* cross-tenant project, so the toggle never leaks another
    tenant's project existence. An invalid ``visibility`` value gets a 422 from the
    ``Literal`` before any DB work.

    P34-n0.S2: for a tenant #1 project the git tree then follows the new visibility
    (``_mirror_visibility``): Postgres first, git second, so a git failure keeps the
    new visibility and is reported in the added optional ``"publish"`` field. The
    ``"project"`` key is unchanged; other tenants' responses carry no ``"publish"``.
    """

    await _load_scoped_project(project_id, ctx)
    updated = await get_accounts_service().set_project_visibility(
        project_id, payload.visibility
    )
    body: dict[str, object] = {"project": serialize_project(updated)}
    published = await _mirror_visibility(updated)
    if published is not None:
        body["publish"] = published
    return body


# The toggle's error, whatever failed: it names no project and no path (the
# unpublish path must never name one); the stage word says where it stopped.
_MIRROR_FAILED = (
    "the git tree was not reconciled ({stage}); the new visibility is kept. Toggle "
    "again, or run `python -m server.reconcile` while writes are paused"
)


async def _mirror_visibility(record) -> dict[str, object] | None:
    """Make tenant #1's git tree follow one project's new visibility (P34-n0.S2).

    Runs ``reconcile.reconcile(..., only=<name>)`` for a tenant #1 project only (other
    tenants' content is never in git), when git commits are enabled, in a threadpool
    under ``WRITE_LOCK`` (the same lock every write takes; it lives in
    ``server/write_lock.py`` so this module never imports ``server.main``). A commit
    queues the push on the publish worker exactly as a write does (``KB_GIT_PUSH``
    gated, submitted outside the lock). Returns ``None`` when nothing applies, else
    ``{"action", "committed", "commit_sha", "push_pending", "error"}``. Never raises:
    the registry already changed, and re-toggling (or the CLI) is the retry.
    """

    if record is None or not config.git_commit_enabled():
        return None
    try:
        tenant_one = await get_tenant_one_id()
    except Exception:  # noqa: BLE001 - unknown: say the tree may not mirror
        logger.warning("visibility toggle: tenant #1 could not be resolved; git not reconciled")
        return _mirror_result(error=_MIRROR_FAILED.format(stage="read"))
    if tenant_one is None or record.tenant_id != tenant_one:
        return None

    root = config.kb_root()
    name, visibility = record.name, record.visibility

    def _run() -> reconcile_mod.Report:
        with write_lock.WRITE_LOCK:
            conn = db.connect()
            try:
                return reconcile_mod.reconcile(
                    {name: visibility}, kb_root=root, db_conn=conn,
                    tenant_db_id=tenant_one, only=name,
                )
            finally:
                conn.close()

    try:
        report = await run_in_threadpool(_run)
    except Exception as exc:  # noqa: BLE001 - never fail the toggle on git
        logger.warning("visibility toggle: reconcile raised %s", type(exc).__name__)
        return _mirror_result(error=_MIRROR_FAILED.format(stage="reconcile"))

    entry = report.project(name)
    failure = report.error or (entry.error if entry is not None else None)
    if failure:
        stage = reconcile_mod.error_stage(failure) or "reconcile"
        logger.warning("visibility toggle: reconcile stopped at stage %s", stage)
    push_pending = False
    if report.committed and config.git_push_enabled():
        # Outside WRITE_LOCK: the push task re-takes it (not reentrant).
        publish.submit("push visibility reconcile", write_lock.push_task(root))
        push_pending = True
    return _mirror_result(
        action=entry.action if entry is not None else reconcile_mod.NONE,
        committed=report.committed,
        commit_sha=report.commit_sha,
        push_pending=push_pending,
        error=(
            _MIRROR_FAILED.format(stage=reconcile_mod.error_stage(failure) or "reconcile")
            if failure else None
        ),
    )


def _mirror_result(
    *,
    action: str = reconcile_mod.NONE,
    committed: bool = False,
    commit_sha: str | None = None,
    push_pending: bool = False,
    error: str | None = None,
) -> dict[str, object]:
    return {
        "action": action,
        "committed": committed,
        "commit_sha": commit_sha,
        "push_pending": push_pending,
        "error": error,
    }


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


# -- org-level credentials --------------------------------------------------
# One org key (``project_id NULL``) authorizes writes to every project in the org;
# the resolver reads the credential's ``tenant_id`` directly. Additive to the
# frozen ``/app/*`` contract — these routes sit alongside the per-project ones.


@router.post("/app/credentials", status_code=201)
async def create_org_credential(
    ctx: AuthContext = Depends(require_user),
    body: CreateCredentialInput = CreateCredentialInput(),
) -> dict[str, object]:
    """Mint an org-level ingest credential (``project_id NULL``); the plaintext ``vk_``
    key is returned once.

    One org key authorizes writes across every project in the caller's org. Only its
    sha256 hash (and a short display prefix) is persisted — the raw key is never
    recoverable afterward.
    """

    key = f"vk_{generate_opaque_token()}"
    record = await get_accounts_service().create_project_credential(
        CreateProjectCredential(
            tenant_id=ctx.tenant.id,
            project_id=None,
            token_prefix=key[:12],
            token_hash=sha256_hex(key),
            name=body.name,
        )
    )
    return {"credential": serialize_credential(record), "key": key}


@router.get("/app/credentials")
async def list_org_credentials(
    ctx: AuthContext = Depends(require_user),
) -> dict[str, object]:
    """List the caller's org-level credentials (metadata only; includes revoked)."""

    credentials = await get_accounts_service().list_org_credentials(ctx.tenant.id)
    return {
        "credentials": [serialize_credential(record) for record in credentials]
    }


@router.delete("/app/credentials/{credential_id}", status_code=204)
async def delete_org_credential(
    credential_id: UUID,
    ctx: AuthContext = Depends(require_user),
) -> Response:
    """Revoke one of the caller's org-level credentials by id (idempotent soft-revoke).

    Answers 404 when the id is not one of the caller's org-level credentials, so a
    caller cannot revoke or probe another org's — or a project-bound — credential id
    (the same anti-probe pattern as the per-project delete).
    """

    service = get_accounts_service()
    credentials = await service.list_org_credentials(ctx.tenant.id)
    if not any(record.id == credential_id for record in credentials):
        raise HTTPException(status_code=404, detail="credential not found")
    await service.revoke_credential(credential_id)
    return Response(status_code=204)
