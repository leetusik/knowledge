"""Reusable user-auth guard for account-scoped routes.

``require_user`` resolves an opaque ``Authorization: Bearer`` token to the
active user plus the tenant the request acts in (``active_tenant``: the
``X-Hi2vi-Org`` header's org, else the user's first), raising ``AuthError`` on any
session miss and a 403 on a header naming an org the user is not in. S3/S4
import ``require_user`` / ``AuthContext`` / ``AuthError`` from here;
``auth_error_handler`` (registered on the app) renders the shared generic 401.
On a successful token resolve it stamps the token's ``last_used_at``
best-effort — a stamping failure is logged and never fails auth.

Ported from vocky ``accounts/auth.py`` (Starlette → FastAPI: ``Request`` and
``JSONResponse`` come from FastAPI, which re-exports Starlette's). Used via
``Depends(require_user)`` on guarded routes — FastAPI injects the ``Request``.
"""

from __future__ import annotations

import logging
from collections.abc import Sequence
from dataclasses import dataclass
from uuid import UUID

from fastapi import HTTPException, Request
from fastapi.responses import JSONResponse

from server.accounts.security import sha256_hex
from server.accounts.service import AccountsPersistenceError, get_accounts_service
from server.accounts.types import TenantRecord, UserRecord

logger = logging.getLogger(__name__)


@dataclass(slots=True)
class AuthContext:
    """The authenticated caller: their user record and active tenant."""

    user: UserRecord
    tenant: TenantRecord


class AuthError(Exception):
    """Raised when a request cannot be authenticated as a user.

    Rendered by ``auth_error_handler`` as a generic 401 so no distinction
    between missing, unknown, and expired tokens leaks to the caller.
    """


def extract_bearer_token(request: Request) -> str | None:
    """Return the bearer token from the ``Authorization`` header, or None.

    Scheme-insensitive on ``Bearer``; returns None when the header is absent or
    not a well-formed bearer credential.
    """

    authorization = request.headers.get("Authorization")
    if not authorization:
        return None

    scheme, separator, token = authorization.partition(" ")
    if not separator or scheme.lower() != "bearer":
        return None

    token = token.strip()
    return token or None


#: The header a signed-in session names its active org with (a tenant id). Read only
#: after a session resolved; ``vk_`` keys and the master bearer never read it.
ORG_HEADER = "X-Hi2vi-Org"


def _not_a_member() -> HTTPException:
    return HTTPException(status_code=403, detail="not a member of that org")


def active_tenant(
    request: Request | None,
    tenants: Sequence[TenantRecord],
) -> TenantRecord:
    """Return the tenant a resolved session acts in for this request.

    ``tenants`` is the user's memberships in the order the user joined them (never
    empty), so joining an older org never moves the first. With no ``X-Hi2vi-Org``
    header (or a blank one) the session acts in its first tenant, exactly as before
    multi-org sessions. A header naming one of ``tenants`` picks
    it; any other value — another org's id, an unknown id or a malformed one — is a
    **403**, never a 404 and never a fallback to another tenant.
    """

    raw = request.headers.get(ORG_HEADER) if request is not None else None
    if raw is None or not raw.strip():
        return tenants[0]
    try:
        wanted = UUID(raw.strip())
    except ValueError:
        raise _not_a_member() from None
    for tenant in tenants:
        if tenant.id == wanted:
            return tenant
    raise _not_a_member()


async def require_user(request: Request) -> AuthContext:
    """Resolve the request's bearer token to an ``AuthContext`` or raise.

    Extract the token, hash it, look up the active session, load the user, and
    pick their active tenant (``active_tenant``: the ``X-Hi2vi-Org`` header's org,
    or the first tenant). A session miss raises ``AuthError`` (generic 401); a
    header naming an org the user is not in raises a 403.
    """

    token = extract_bearer_token(request)
    if token is None:
        raise AuthError("missing bearer token")

    service = get_accounts_service()
    token_hash = sha256_hex(token)
    auth_token = await service.get_active_auth_token_by_hash(token_hash)
    if auth_token is None:
        raise AuthError("invalid or expired token")

    # Best-effort usage stamp (one indexed UPDATE by token_hash); a failure is
    # logged and must never fail auth.
    try:
        await service.touch_auth_token_last_used(token_hash)
    except AccountsPersistenceError:
        logger.warning("failed to stamp last_used_at for auth token", exc_info=True)

    user = await service.get_user_by_id(auth_token.user_id)
    if user is None:
        raise AuthError("token references a missing user")

    tenants = await service.list_tenants_for_user(user.id)
    if not tenants:
        raise AuthError("user has no tenant")

    return AuthContext(user=user, tenant=active_tenant(request, tenants))


async def optional_user(request: Request) -> AuthContext | None:
    """Resolve the request's bearer token to an ``AuthContext``, or ``None``.

    The optional-identity twin of :func:`require_user` (P19.S2): it resolves a
    caller **exactly** as ``require_user`` does — same token extraction, same
    session/user/tenant lookup, same best-effort ``last_used_at`` stamp on a
    successful resolve — but **returns ``None`` instead of raising** on every miss
    path (no header, unknown/expired token, missing user, no tenant). It never
    raises ``AuthError``. Once a session resolved, the active tenant is picked by
    ``active_tenant`` exactly as in ``require_user``, so an ``X-Hi2vi-Org`` naming an
    org the user is not in is a 403 here too (never a silent anonymous read).

    This backs the anonymous-capable read surface: a route depending on it gets a
    full tenant context for a resolvable session (member reads) or ``None`` for an
    anonymous / unresolvable caller (public-only reads). A deliberate consequence
    is that an unresolvable token on a private doc yields the anonymous 404 rather
    than a 401 — that leaks strictly less (no "this id exists" signal) and the BFF
    pre-verifies sessions before relaying anyway.
    """

    token = extract_bearer_token(request)
    if token is None:
        return None

    service = get_accounts_service()
    token_hash = sha256_hex(token)
    auth_token = await service.get_active_auth_token_by_hash(token_hash)
    if auth_token is None:
        return None

    # Best-effort usage stamp (identical to require_user); a failure never fails
    # auth — here it simply never blocks resolving the optional identity.
    try:
        await service.touch_auth_token_last_used(token_hash)
    except AccountsPersistenceError:
        logger.warning("failed to stamp last_used_at for auth token", exc_info=True)

    user = await service.get_user_by_id(auth_token.user_id)
    if user is None:
        return None

    tenants = await service.list_tenants_for_user(user.id)
    if not tenants:
        return None

    # A resolved session naming an org it is not in is refused (403), never
    # downgraded to an anonymous read.
    return AuthContext(user=user, tenant=active_tenant(request, tenants))


async def auth_error_handler(request: Request, exc: Exception) -> JSONResponse:
    """Render ``AuthError`` as a generic 401 with a bearer challenge."""

    return JSONResponse(
        {"detail": "Unauthorized"},
        status_code=401,
        headers={"WWW-Authenticate": "Bearer"},
    )
