"""Account auth routes: signup, login, logout, and the caller's identity.

Public ``/auth/*`` surface (outside ``/api/*`` so the content-plane bearer
guards never touch it). Signup provisions a user, a tenant, and the owner
membership, then mints an opaque DB-backed bearer token; login re-issues one.
Raw tokens are returned once and stored only as a sha256 hash. Responses never
expose ``password_hash`` or any ``token_hash``.

Ported from vocky ``auth_api.py`` (Starlette → FastAPI): body validation is
FastAPI-native (pydantic model params → standard 422), not vocky's Starlette
400-single-string; every other behavior is preserved verbatim — the identical
generic 401 for unknown-email vs wrong-password (no user enumeration), the 409
duplicate, the 30-day session TTL, the ``"<localpart>'s workspace"`` tenant
default, the singular-``tenant`` signup shape vs plural-``tenants`` login/me
shape, and hash-free serializers.
"""

from __future__ import annotations

from datetime import timedelta
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from pydantic import BaseModel, Field, field_validator

from server.accounts.auth import AuthContext, extract_bearer_token, require_user
from server.accounts.security import (
    generate_opaque_token,
    hash_password,
    sha256_hex,
    verify_password,
)
from server.accounts.service import DuplicateEmailError, get_accounts_service
from server.accounts.types import (
    CreateAuthToken,
    CreateUser,
    TenantRecord,
    UserRecord,
)
from server.persistence.models import utc_now

SESSION_TTL = timedelta(days=30)

# Identical generic 401 for unknown-email vs bad-password (no user enumeration).
_INVALID_CREDENTIALS = "invalid email or password"

router = APIRouter()


class _EmailPasswordInput(BaseModel):
    """Shared email + password shape for signup and login."""

    email: str
    password: str = Field(min_length=8)

    @field_validator("email")
    @classmethod
    def _normalize_email(cls, value: str) -> str:
        normalized = value.strip().lower()
        if not normalized:
            raise ValueError("must not be blank")
        if "@" not in normalized:
            raise ValueError("must be a valid email address")
        return normalized


class SignupIn(_EmailPasswordInput):
    """Signup request body."""


class LoginIn(_EmailPasswordInput):
    """Login request body."""


def serialize_user(record: UserRecord) -> dict[str, object]:
    """Serialize a user for a response (never exposes ``password_hash``)."""

    return {
        "id": str(record.id),
        "email": record.email,
        "created_at": record.created_at.isoformat(),
    }


def serialize_tenant(record: TenantRecord) -> dict[str, object]:
    """Serialize a tenant for a response."""

    return {
        "id": str(record.id),
        "name": record.name,
        "created_at": record.created_at.isoformat(),
    }


async def _mint_token(user_id: UUID) -> str:
    """Mint an opaque bearer token, store its hash, and return the raw token."""

    raw_token = generate_opaque_token()
    await get_accounts_service().create_auth_token(
        CreateAuthToken(
            user_id=user_id,
            token_hash=sha256_hex(raw_token),
            expires_at=utc_now() + SESSION_TTL,
        )
    )
    return raw_token


@router.post("/auth/signup", status_code=201)
async def signup(payload: SignupIn) -> dict[str, object]:
    """Create a user, their tenant, and owner membership; mint a session token."""

    service = get_accounts_service()
    try:
        user = await service.create_user(
            CreateUser(email=payload.email, password_hash=hash_password(payload.password))
        )
    except DuplicateEmailError:
        raise HTTPException(
            status_code=409, detail="a user with this email already exists"
        )

    workspace_name = f"{payload.email.split('@')[0]}'s workspace"
    tenant, _member = await service.create_tenant_with_owner(user.id, workspace_name)
    token = await _mint_token(user.id)

    return {
        "token": token,
        "user": serialize_user(user),
        "tenant": serialize_tenant(tenant),
    }


@router.post("/auth/login")
async def login(payload: LoginIn) -> dict[str, object]:
    """Verify credentials and mint a session token.

    Answers an identical generic 401 for an unknown email and a wrong password
    so callers cannot enumerate registered accounts.
    """

    service = get_accounts_service()
    user = await service.get_user_by_email(payload.email)
    if user is None or not verify_password(user.password_hash, payload.password):
        raise HTTPException(status_code=401, detail=_INVALID_CREDENTIALS)

    token = await _mint_token(user.id)
    tenants = await service.list_tenants_for_user(user.id)

    return {
        "token": token,
        "user": serialize_user(user),
        "tenants": [serialize_tenant(tenant) for tenant in tenants],
    }


@router.post("/auth/logout", status_code=204)
async def logout(request: Request) -> Response:
    """Revoke the presented session token (idempotent; no auth required)."""

    token = extract_bearer_token(request)
    if token is not None:
        await get_accounts_service().delete_auth_token(sha256_hex(token))
    return Response(status_code=204)


@router.get("/auth/me")
async def me(context: AuthContext = Depends(require_user)) -> dict[str, object]:
    """Return the authenticated caller and their tenants."""

    tenants = await get_accounts_service().list_tenants_for_user(context.user.id)

    return {
        "user": serialize_user(context.user),
        "tenants": [serialize_tenant(tenant) for tenant in tenants],
    }
