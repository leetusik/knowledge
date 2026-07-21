"""Account auth routes: signup, login, logout, and the caller's identity.

Public ``/auth/*`` surface (outside ``/api/*`` so the content-plane bearer
guards never touch it). Signup provisions a user plus a default org (tenant) +
owner membership + default project in one transaction (the ``provision_signup``
primitive), then mints an opaque DB-backed bearer token; login re-issues one.
Raw tokens are returned once and stored only as a sha256 hash. Responses never
expose ``password_hash`` or any ``token_hash``.

Ported from vocky ``auth_api.py`` (Starlette → FastAPI): body validation is
FastAPI-native (pydantic model params → standard 422), not vocky's Starlette
400-single-string; every other behavior is preserved verbatim — the identical
generic 401 for unknown-email vs wrong-password (no user enumeration), the 409
duplicate, the 30-day session TTL, the singular-``tenant`` signup shape vs
plural-``tenants`` login/me shape, and hash-free serializers. Signup's tenant
naming changed in P18: it now provisions a ``"default"`` org + ``"default"``
project (was ``"<localpart>'s workspace"``) and its response gained an additive
``project`` field.
"""

from __future__ import annotations

import time
from datetime import timedelta
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from pydantic import BaseModel, Field, field_validator

from server import config
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
    ProjectRecord,
    TenantRecord,
    UserRecord,
)
from server.persistence.models import utc_now

SESSION_TTL = timedelta(days=30)

# Identical generic 401 for unknown-email vs bad-password (no user enumeration).
_INVALID_CREDENTIALS = "invalid email or password"

router = APIRouter()


# --- in-process per-IP throttle for the unauthenticated grant (P13.S5) --------
#
# WHY HERE, NOT AT THE EDGE. P13.S5 publishes ``/auth/*`` to the internet — an
# unauthenticated password grant (``login``) and open signup — where before the
# only throttle was the Next BFF's 5/IP/15min, which a *direct* API call bypasses
# entirely. nginx would be the usual home for a rate limit, but three facts route
# it here instead: (1) ``deploy/knowledge.conf`` bans ``limit_req_zone`` in this
# vhost (zone names are global across the shared ``conf.d/`` tree, and a duplicate
# is a hard ``nginx -t`` failure that blocks the reload for *every* site on the
# edge); (2) the local stack has no nginx, so an edge throttle could never be
# exercised by the E2E smoke this slice ships — it would be asserted, never
# proven; (3) ``server/main.py`` pins a SINGLE uvicorn worker as a load-bearing
# invariant, so an in-memory per-IP counter has no cross-worker split-state
# problem and is exactly coherent. So the throttle is server-side, in-process, and
# gates ``signup`` + ``login`` only.
#
# TRUST MODEL for the client IP. Keyed on ``X-Real-IP`` (nginx sets it from the
# Cloudflare-restored real visitor IP, ``deploy/knowledge.conf`` real_ip +
# proxy_set_header), then the first ``X-Forwarded-For`` hop, then
# ``request.client.host``. This is only trustworthy because the API container is
# reachable EXCLUSIVELY through the edge (it is not publicly bound), so these
# headers are always edge-set — a directly reachable API could be spoofed. Locally
# (no nginx, direct :8766) there is no such header and it falls back to the peer
# address, which is still a stable per-client key.
#
# GENERIC-401 SAFETY. The check runs before any credential work and keys off the
# IP, never the email, so it cannot leak whether an account exists: unknown-email
# and wrong-password stay byte-identical (both still reach the generic 401); a 429
# is orthogonal and IP-based. The whole function does no ``await``, so under the
# single worker's event loop it runs atomically — no lock is needed.

# key ("<ip>:<path>") -> (window_start_monotonic, count_in_window)
_rate_windows: dict[str, tuple[float, int]] = {}
# Defensive cap so a distributed flood of distinct real IPs cannot grow the dict
# without bound. Well above any plausible legitimate concurrent-client count.
_RATE_MAX_KEYS = 20_000


def _client_ip(request: Request) -> str:
    """The real client IP behind the edge — see the TRUST MODEL note above."""

    real_ip = request.headers.get("X-Real-IP")
    if real_ip:
        return real_ip.strip()
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        first = forwarded.split(",")[0].strip()
        if first:
            return first
    client = request.client
    return client.host if client else "unknown"


def _prune_rate_windows(now: float, window: float) -> None:
    """Bound memory: drop expired windows, and if still capped, the oldest ones.

    Only does work once the dict is large — expired keys are otherwise rolled over
    lazily on access, so this is purely a defensive memory bound, not correctness.
    """

    if len(_rate_windows) < _RATE_MAX_KEYS:
        return
    for key in [k for k, (start, _) in _rate_windows.items() if now - start >= window]:
        del _rate_windows[key]
    if len(_rate_windows) >= _RATE_MAX_KEYS:
        # An active flood from many live IPs. Drop the oldest half; the worst case
        # is a few counters resetting early, which only ever UNDER-counts.
        oldest = sorted(_rate_windows, key=lambda k: _rate_windows[k][0])
        for key in oldest[: _RATE_MAX_KEYS // 2]:
            del _rate_windows[key]


def _enforce_rate_limit(request: Request) -> None:
    """Fixed-window per-IP throttle for ``signup``/``login``; raise 429 when tripped.

    The limit and window are read at call time (``config._env`` pattern) so a test
    or the smoke can force a low value via the env. A tripped request answers 429
    with a generic body and a ``Retry-After`` header (seconds until the window
    resets), never touching the DB or the credential path.
    """

    limit = config.auth_rate_limit()
    if limit <= 0:  # disabled
        return
    window = float(config.auth_rate_window_s())
    now = time.monotonic()
    _prune_rate_windows(now, window)

    key = f"{_client_ip(request)}:{request.url.path}"
    start, count = _rate_windows.get(key, (now, 0))
    if now - start >= window:  # window rolled over
        start, count = now, 0
    count += 1
    _rate_windows[key] = (start, count)

    if count > limit:
        retry_after = max(1, int(window - (now - start)))
        raise HTTPException(
            status_code=429,
            detail="too many requests — please retry later",
            headers={"Retry-After": str(retry_after)},
        )


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


def serialize_project(record: ProjectRecord) -> dict[str, object]:
    """Serialize a project for a response.

    Mirrors ``server.app_api.serialize_project`` (the canonical project serializer)
    byte-for-byte so signup can return its new default project without importing
    ``app_api`` — which imports ``serialize_tenant`` back from this module, so the
    dependency has to point one way.
    """

    return {
        "id": str(record.id),
        "name": record.name,
        "tenant_id": str(record.tenant_id),
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
async def signup(payload: SignupIn, request: Request) -> dict[str, object]:
    """Create a user with a default org + project + owner membership; mint a token.

    The org and project are both named ``"default"`` (``provision_signup``); the
    response carries the new ``project`` alongside the ``tenant`` (additive — the
    ``/auth/*`` contract is frozen, so signup's shape only gains fields).
    """

    _enforce_rate_limit(request)
    service = get_accounts_service()
    try:
        user = await service.create_user(
            CreateUser(email=payload.email, password_hash=hash_password(payload.password))
        )
    except DuplicateEmailError:
        raise HTTPException(
            status_code=409, detail="a user with this email already exists"
        )

    tenant, _member, project = await service.provision_signup(user.id)
    token = await _mint_token(user.id)

    return {
        "token": token,
        "user": serialize_user(user),
        "tenant": serialize_tenant(tenant),
        "project": serialize_project(project),
    }


@router.post("/auth/login")
async def login(payload: LoginIn, request: Request) -> dict[str, object]:
    """Verify credentials and mint a session token.

    Answers an identical generic 401 for an unknown email and a wrong password
    so callers cannot enumerate registered accounts. The per-IP throttle runs
    first and keys off the IP alone, so it never perturbs that generic 401.
    """

    _enforce_rate_limit(request)
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
