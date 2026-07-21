# P10.S4 — plan (orchestrator → slice-executor-high)

Implement **P10.S4 — `/api/*` credential auth (resolve credential → tenant)** in
`/Users/sugang/projects/personal/knowledge`. Read `works/phases/active/P10/phase.md` first (esp. the two hard
couplings + the "what S4 consumes" note from S3). This slice is **high-risk**: it touches the **frozen `POST
/api/documents` contract** and the auth of the whole content plane. There is **no vocky precedent** — this is our
own design. Follow this plan precisely; if the current code differs from what's inlined here, verify against the
real files and adapt carefully (don't break the frozen contract or the existing tests).

**Scope boundary:** ADD the `/api/*` credential resolver + swap the guards. Do NOT add `documents.tenant_id`, do
NOT change storage/queries/reindex, do NOT scope reads/writes to a tenant yet — **that is all S5**. The handlers
*accept* the resolved context but do not use it for storage in S4. Do NOT touch `/auth`, `/app`, the write-path
body logic, or the response shapes. Do NOT commit / transition status / `doc-new-version`. Write `result.md`,
append `phase.md` notes, return a verdict.

## Settled decisions (operator-approved — do not re-litigate)
- **Two-mode resolver**, switched on `config.database_url()` (accounts plane present ⇔ tenancy on).
- **`KB_API_TOKEN` = pinned master → tenant #1** (un-revokable special-case), tenant #1 identified by config
  `KB_OPERATOR_EMAIL`. Not a DB credential.
- Resolution is **tenant-scoped** (the body `project` field stays free within the tenant — S5 handles it).

## Current guards to replicate in legacy mode (verbatim, `server/main.py` L74–99)

```python
def require_bearer(authorization: Optional[str] = Header(default=None)) -> None:
    token = config.api_token()
    if token is None:
        return
    if authorization != f"Bearer {token}":
        raise HTTPException(status_code=401, detail="missing or invalid bearer token")

def require_read_bearer(authorization: Optional[str] = Header(default=None)) -> None:
    if not config.require_read_auth_enabled():
        return
    require_bearer(authorization)
```
Leave these two functions in place (reindex + the legacy branch reuse them). The legacy branch of the new
resolvers must reproduce these semantics **byte-for-byte** (the existing bearer tests depend on it).

## 1. `server/config.py` (MODIFY)

Add, in the per-call style:
```python
def operator_email() -> str | None:
    """Operator's signup email — pins the KB_API_TOKEN master bearer to tenant #1 (tenant mode)."""
    return _env("KB_OPERATOR_EMAIL")
```

## 2. `server/api_auth.py` (NEW)

```python
from dataclasses import dataclass
from uuid import UUID
from fastapi import Request, HTTPException
from server import config
from server.accounts.auth import extract_bearer_token
from server.accounts.security import sha256_hex
from server.accounts.service import get_accounts_service

@dataclass(slots=True)
class ApiAuthContext:
    tenant_id: UUID | None = None      # None => legacy/single-tenant (today's behavior)
    project_id: UUID | None = None     # set only for vk_ credentials

_LEGACY = ApiAuthContext()  # tenant_id=None, project_id=None

def _tenant_mode() -> bool:
    return config.database_url() is not None

async def _resolve_tenant_bearer(token: str) -> ApiAuthContext | None:
    """Tenant mode: map a bearer to a tenant. Returns None if unresolvable."""
    service = get_accounts_service()
    # 1. Pinned master: exact KB_API_TOKEN -> tenant #1 (operator's tenant via KB_OPERATOR_EMAIL).
    api_token = config.api_token()
    if api_token is not None and token == api_token:
        email = config.operator_email()
        if email:
            user = await service.get_user_by_email(email)
            if user is not None:
                tenants = await service.list_tenants_for_user(user.id)
                if tenants:
                    return ApiAuthContext(tenant_id=tenants[0].id)
        return None  # misconfigured (no email / operator not seeded) -> unresolvable
    token_hash = sha256_hex(token)
    # 2. vk_ / any project credential -> its project's tenant.
    cred = await service.get_active_credential_by_token_hash(token_hash)
    if cred is not None:
        project = await service.get_project(cred.project_id)
        if project is not None:
            return ApiAuthContext(tenant_id=project.tenant_id, project_id=project.id)
        return None
    # 3. session token -> user's tenant.
    auth_token = await service.get_active_auth_token_by_hash(token_hash)
    if auth_token is not None:
        user = await service.get_user_by_id(auth_token.user_id)
        if user is not None:
            tenants = await service.list_tenants_for_user(user.id)
            if tenants:
                return ApiAuthContext(tenant_id=tenants[0].id)
    return None

def _unauth() -> HTTPException:
    return HTTPException(status_code=401, detail="missing or invalid bearer token",
                         headers={"WWW-Authenticate": "Bearer"})

async def resolve_api_write(request: Request) -> ApiAuthContext:
    if not _tenant_mode():
        # LEGACY: identical to require_bearer.
        token = config.api_token()
        if token is None:
            return _LEGACY
        if request.headers.get("Authorization") != f"Bearer {token}":
            raise _unauth()
        return _LEGACY
    token = extract_bearer_token(request)
    if token is None:
        raise _unauth()
    ctx = await _resolve_tenant_bearer(token)
    if ctx is None:
        raise _unauth()
    return ctx

async def resolve_api_read(request: Request) -> ApiAuthContext:
    if not _tenant_mode():
        # LEGACY: identical to require_read_bearer (open unless KB_REQUIRE_READ_AUTH & token).
        if not config.require_read_auth_enabled():
            return _LEGACY
        token = config.api_token()
        if token is None:
            return _LEGACY
        if request.headers.get("Authorization") != f"Bearer {token}":
            raise _unauth()
        return _LEGACY
    # TENANT: reads need a resolvable credential (a tenant is required to scope in S5).
    token = extract_bearer_token(request)
    if token is None:
        raise _unauth()
    ctx = await _resolve_tenant_bearer(token)
    if ctx is None:
        raise _unauth()
    return ctx
```
Notes: the legacy `_unauth()` detail preserves today's `"missing or invalid bearer token"` string (the existing
tests assert on the 401 status, not the body — keep the string to be safe). Confirm the exact `AccountsService`
method names against `server/accounts/service.py` (`get_user_by_email`, `list_tenants_for_user`,
`get_active_credential_by_token_hash`, `get_project`, `get_active_auth_token_by_hash`, `get_user_by_id`) — all
were shipped in S1; if one is missing, `escalate`.

## 3. `server/main.py` (MODIFY — swap guards only)

- Import: `from server.api_auth import ApiAuthContext, resolve_api_read, resolve_api_write`.
- **6 GET reads** (`/api/documents`, `/api/tags`, `/api/projects`, `/api/documents/by-path/{...}`,
  `/api/documents/{doc_id}`, `/api/search`): replace `_: None = Depends(require_read_bearer)` with
  `ctx: ApiAuthContext = Depends(resolve_api_read)`.
- **`POST /api/documents` + the 2 DELETEs**: replace `_: None = Depends(require_bearer)` with
  `ctx: ApiAuthContext = Depends(resolve_api_write)`.
- **`POST /api/reindex`**: leave on `Depends(require_bearer)` (global operator op, not tenant-scoped).
- The handlers now take `ctx` but must **not** use it for storage/queries in S4 (S5 does). The `DocumentIn` model,
  the write path, and every response shape stay **exactly** as they are.

## 4. Compose (MODIFY)
Add `KB_OPERATOR_EMAIL` to the `api` env in `compose.prod.yml` (the operator's real signup email) and optionally
`compose.yml` (local can leave it unset — legacy mode locally). Record in `phase.md` that the box env needs
`KB_OPERATOR_EMAIL` set (a P10 deployment prerequisite alongside `POSTGRES_PASSWORD`).

## Verification (run; report in `result.md`)

1. **Legacy-mode regression (critical):** `DATABASE_URL` unset → `uv run pytest -q` all 65 pass, **especially**
   `test_bearer_auth_on_mutating`, `test_reads_open_by_default_even_with_token`,
   `test_read_auth_gates_reads_when_flag_and_token_set`, `test_read_auth_noop_without_token`. If any fails, the
   legacy branch diverges from the old guards — fix until byte-identical.
2. **Tenant-mode resolution smoke** (compose + Postgres + `alembic upgrade head`; ephemeral, like S1–S3): container
   env `KB_OPERATOR_EMAIL=operator@test` + a `KB_API_TOKEN=<something>`. Via the HTTP API: signup `operator@test`
   (→ tenant #1), signup `other@test` (→ tenant #2), mint a `vk_` key under a project of each. Assert `POST
   /api/documents` (a valid frozen body) returns the **201** frozen shape for: (a) `Authorization: Bearer
   <KB_API_TOKEN>` (master → tenant #1), (b) a `vk_` key, (c) a session token; and **401** for a bad/absent
   bearer. Assert a GET read resolves (200) with a valid credential and 401 without. **Do not** assert cross-tenant
   isolation (that's S5). Tear down the stack after.
3. `python3 scripts/workflow.py validate`.
If Docker is unavailable, don't block: run the legacy regression (step 1, no Postgres) + import/route sanity, and
clearly report that the tenant-mode smoke (step 2) couldn't run in-environment.

## Finish
`result.md` (the resolver, the guard swaps, the two verification results incl. which credential types resolved to
which tenant, deviations). Append `phase.md` notes: Doc-impact one-liners (api: `/api/*` now resolves bearer →
tenant in tenant mode — `KB_API_TOKEN` pinned master via `KB_OPERATOR_EMAIL`, `vk_` → its tenant, session → user's
tenant; legacy single-bearer preserved when `DATABASE_URL` unset; frozen 201 shape intact; reindex stays
operator-only; security: pinned un-revokable master bearer, generic 401; operations: `KB_OPERATOR_EMAIL` box
prerequisite) and **what S5 consumes**: `ApiAuthContext(tenant_id, project_id)` from `resolve_api_write`/
`resolve_api_read` — `tenant_id is None` ⇒ legacy single-tenant path, else scope storage+queries to `tenant_id`;
the write path's body `project` is the project name to select/create under `tenant_id`. Return `done` when the
resolver works (both modes) + verification passes; else `escalate`/`blocked`/`needs_operator` with findings.
