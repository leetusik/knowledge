"""Content-plane (`/api/*`) credential resolver: bearer -> tenant (+ project).

Two modes, switched per-call on ``config.database_url()``:

- **Legacy mode** (``DATABASE_URL`` unset — today's single-tenant deployment):
  ``resolve_api_write`` / ``resolve_api_read`` reproduce the old
  ``require_bearer`` / ``require_read_bearer`` guards **byte-for-byte**. They
  return the shared ``_LEGACY`` context (``tenant_id=None``), and every existing
  bearer/read-auth test passes unchanged.
- **Tenant mode** (``DATABASE_URL`` set — the hosted SaaS): a bearer is resolved
  to a tenant via the Postgres accounts plane:
    1. the pinned master ``KB_API_TOKEN`` -> tenant #1 (the operator's tenant,
       identified by ``KB_OPERATOR_EMAIL``) — an un-revokable legacy special-case,
       not a DB credential;
    2. a ``vk_`` project credential -> its project's tenant (+ the project id);
    3. a session token -> the user's first tenant (own-corpus reads/writes).
  An unresolvable bearer (or none) -> a generic 401.

S4 only *resolves* the credential to an ``ApiAuthContext``; it does not scope
storage/queries to the tenant yet — the ``/api/*`` handlers accept ``ctx`` but
do not use it for content storage. Tenant-scoping the content plane is S5.
``POST /api/reindex`` stays on ``require_bearer`` (operator-only), untouched.
"""

from __future__ import annotations

from dataclasses import dataclass
from uuid import UUID

from fastapi import HTTPException, Request

from server import config
from server.accounts.auth import extract_bearer_token
from server.accounts.security import sha256_hex
from server.accounts.service import get_accounts_service


@dataclass(slots=True)
class ApiAuthContext:
    """The resolved caller context for a ``/api/*`` request.

    ``tenant_id`` is ``None`` in legacy/single-tenant mode (today's behavior);
    in tenant mode it is the resolved tenant. ``project_id`` is set only for a
    ``vk_`` project credential (its bound project); it is ``None`` for the master
    bearer and session tokens.

    ``is_public`` marks the caller as the *public* content root — legacy mode
    (``tenant_id is None``) or tenant #1 (the operator's own tenant, resolved via
    ``KB_OPERATOR_EMAIL``). It stays ``True`` by default so legacy contexts are
    public; the resolvers set it to ``False`` for every non-#1 tenant, and S5's
    content plane routes public callers to ``docs/`` (git-published) and non-#1
    tenants to the namespaced ``tenants/<uuid>/`` root.
    """

    tenant_id: UUID | None = None
    project_id: UUID | None = None
    is_public: bool = True


# Shared, immutable-in-practice legacy context (tenant_id=None, project_id=None,
# is_public=True): what both resolvers return whenever the accounts plane is
# dormant. Never mutated (the tenant-mode branches build fresh contexts).
_LEGACY = ApiAuthContext()

# Module-level cache for tenant #1's id (the operator's tenant, per KB_OPERATOR_EMAIL).
# Cache-on-success ONLY: a None resolution (operator not seeded yet at boot, e.g.
# the startup reindex runs before signup) is never cached, so a later request
# re-resolves once the operator exists. Tenant #1's identity is stable for a
# process lifetime, so a successful resolution is safe to memoize forever.
_tenant_one_cache: UUID | None = None


def _tenant_mode() -> bool:
    """Tenant mode is on iff the accounts plane is configured (DATABASE_URL set)."""
    return config.database_url() is not None


async def get_tenant_one_id() -> UUID | None:
    """Resolve tenant #1's id (the operator's first tenant), or ``None``.

    Tenant mode: ``KB_OPERATOR_EMAIL`` -> ``get_user_by_email`` ->
    ``list_tenants_for_user()[0].id``. Legacy mode / no operator email / operator
    not yet seeded -> ``None``. The result is memoized on first success (see
    ``_tenant_one_cache``). Used both by the pinned-master bearer path (to map
    ``KB_API_TOKEN`` -> tenant #1) and by ``is_public`` (to tell tenant #1 apart
    from every other tenant), and by ``reindex`` to stamp tenant #1's ``docs/``
    corpus with the right ``tenant_id``.
    """
    global _tenant_one_cache
    if _tenant_one_cache is not None:
        return _tenant_one_cache
    if not _tenant_mode():
        return None
    email = config.operator_email()
    if not email:
        return None
    service = get_accounts_service()
    user = await service.get_user_by_email(email)
    if user is None:
        return None
    tenants = await service.list_tenants_for_user(user.id)
    if not tenants:
        return None
    _tenant_one_cache = tenants[0].id
    return _tenant_one_cache


def _unauth() -> HTTPException:
    """A generic 401 for the content plane.

    The detail string preserves today's ``require_bearer`` message so the legacy
    branch stays behaviorally identical; the ``WWW-Authenticate: Bearer`` header
    is an additive, standards-friendly challenge (the existing tests assert only
    on the 401 status, never the body).
    """
    return HTTPException(
        status_code=401,
        detail="missing or invalid bearer token",
        headers={"WWW-Authenticate": "Bearer"},
    )


async def _resolve_tenant_bearer(token: str) -> ApiAuthContext | None:
    """Tenant mode: map a raw bearer token to an ``ApiAuthContext``, or None.

    Returns None when the token resolves to nothing (bad key, revoked credential,
    expired session, or a misconfigured master bearer) — the caller turns None
    into a generic 401.
    """
    service = get_accounts_service()

    # 1. Pinned master: an exact KB_API_TOKEN -> tenant #1, the tenant owned by
    #    the operator (looked up by KB_OPERATOR_EMAIL). This is the un-revokable
    #    legacy bearer, NOT a DB credential — so the live hi2vi agent is unchanged.
    api_token = config.api_token()
    if api_token is not None and token == api_token:
        tenant_one = await get_tenant_one_id()
        if tenant_one is not None:
            return ApiAuthContext(tenant_id=tenant_one)
        # Master token set but no email / operator not seeded -> misconfigured;
        # unresolvable rather than silently accepted.
        return None

    token_hash = sha256_hex(token)

    # 2. vk_ (any project credential) -> its project's tenant + the project id.
    cred = await service.get_active_credential_by_token_hash(token_hash)
    if cred is not None:
        project = await service.get_project(cred.project_id)
        if project is not None:
            return ApiAuthContext(tenant_id=project.tenant_id, project_id=project.id)
        # Credential points at a vanished project -> unresolvable.
        return None

    # 3. Session token -> the user's first tenant (own-corpus reads/writes).
    auth_token = await service.get_active_auth_token_by_hash(token_hash)
    if auth_token is not None:
        user = await service.get_user_by_id(auth_token.user_id)
        if user is not None:
            tenants = await service.list_tenants_for_user(user.id)
            if tenants:
                return ApiAuthContext(tenant_id=tenants[0].id)

    return None


async def resolve_api_write(request: Request) -> ApiAuthContext:
    """Guard/resolver for the mutating ``/api/*`` endpoints (POST/DELETE documents).

    Legacy mode: byte-for-byte ``require_bearer`` (no-op when ``KB_API_TOKEN`` is
    unset; else exact-match the bearer, 401 otherwise). Tenant mode: require a
    resolvable credential; the returned tenant scopes storage in S5.
    """
    if not _tenant_mode():
        # LEGACY: identical semantics to require_bearer.
        token = config.api_token()
        if token is None:
            return _LEGACY
        if request.headers.get("Authorization") != f"Bearer {token}":
            raise _unauth()
        return _LEGACY

    # TENANT: any resolvable credential (master / vk_ / session) authorizes a write.
    token = extract_bearer_token(request)
    if token is None:
        raise _unauth()
    ctx = await _resolve_tenant_bearer(token)
    if ctx is None:
        raise _unauth()
    ctx.is_public = (ctx.tenant_id is None) or (ctx.tenant_id == await get_tenant_one_id())
    return ctx


async def resolve_api_read(request: Request) -> ApiAuthContext:
    """Guard/resolver for the read/search ``/api/*`` endpoints (GET documents/tags/…).

    Legacy mode: byte-for-byte ``require_read_bearer`` — open unless
    ``KB_REQUIRE_READ_AUTH`` is on AND ``KB_API_TOKEN`` is set, then it delegates
    to the same exact-match bearer check. Tenant mode: reads require a resolvable
    credential (a tenant is needed to scope reads in S5).
    """
    if not _tenant_mode():
        # LEGACY: identical semantics to require_read_bearer.
        if not config.require_read_auth_enabled():
            return _LEGACY
        token = config.api_token()
        if token is None:
            return _LEGACY
        if request.headers.get("Authorization") != f"Bearer {token}":
            raise _unauth()
        return _LEGACY

    # TENANT: reads need a resolvable credential to know which tenant to scope to.
    token = extract_bearer_token(request)
    if token is None:
        raise _unauth()
    ctx = await _resolve_tenant_bearer(token)
    if ctx is None:
        raise _unauth()
    ctx.is_public = (ctx.tenant_id is None) or (ctx.tenant_id == await get_tenant_one_id())
    return ctx
