# P10.S2 — plan (orchestrator → slice-executor-high)

Implement **P10.S2 — Auth surface `/auth/*` + `require_user` session guard** in
`/Users/sugang/projects/personal/knowledge`. Read `works/phases/active/P10/phase.md` first (phase context). This
is a **faithful logic port** of vocky's auth surface (`/Users/sugang/projects/personal/vocky/src/vocky/auth_api.py`
+ `accounts/auth.py`), adapted from Starlette to **FastAPI**. It builds on S1's `AccountsService`.

**Scope boundary:** ADD the `/auth/*` endpoints + the reusable `require_user` guard only. Do NOT touch content
routes / the write path / lifespan (except the two wiring lines in `main.py` below). No `/app/*` (S3), no `/api/*`
changes (S4), no `documents.tenant_id` (S5), no seed (S6). Do NOT commit / transition status / `doc-new-version`.
Write `result.md`, append `phase.md` notes, return a verdict.

## Decisions (settled — do not re-litigate)
- **FastAPI-native body binding + standard 422** for validation (repo consistency with the existing `/api`
  endpoints), NOT vocky's Starlette 400-single-string. Port every *other* behavior faithfully.
- **Port `AuthError` + register a handler** (`app.add_exception_handler`) — keep `require_user` a reusable domain
  guard; centralize the generic 401.
- **`server/auth_api.py` `APIRouter`** mounted via `app.include_router` — don't bloat `main.py`.

## 1. `server/accounts/auth.py` (NEW — port vocky `accounts/auth.py` verbatim; it's already FastAPI-compatible)

```python
from dataclasses import dataclass
from fastapi import Request
from fastapi.responses import JSONResponse

from server.accounts.security import sha256_hex
from server.accounts.service import AccountsPersistenceError, get_accounts_service
from server.accounts.types import TenantRecord, UserRecord
# ... logging

@dataclass(slots=True)
class AuthContext:
    user: UserRecord
    tenant: TenantRecord

class AuthError(Exception):
    """Raised when a request cannot be authenticated as a user."""

def extract_bearer_token(request: Request) -> str | None:
    authorization = request.headers.get("Authorization")
    if not authorization:
        return None
    scheme, separator, token = authorization.partition(" ")
    if not separator or scheme.lower() != "bearer":
        return None
    token = token.strip()
    return token or None

async def require_user(request: Request) -> AuthContext:
    token = extract_bearer_token(request)
    if token is None:
        raise AuthError("missing bearer token")
    service = get_accounts_service()
    token_hash = sha256_hex(token)
    auth_token = await service.get_active_auth_token_by_hash(token_hash)
    if auth_token is None:
        raise AuthError("invalid or expired token")
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
    return AuthContext(user=user, tenant=tenants[0])

async def auth_error_handler(request: Request, exc: Exception) -> JSONResponse:
    return JSONResponse(
        {"detail": "Unauthorized"},
        status_code=401,
        headers={"WWW-Authenticate": "Bearer"},
    )
```
If S1 did not port `touch_auth_token_last_used` onto the repository/service, add it (idempotent `last_used_at`
stamp) — it's cheap and vocky's `require_user` calls it. If adding it is non-trivial, `escalate` rather than
silently dropping it. Optionally re-export `AuthError`, `AuthContext`, `require_user` from
`server/accounts/__init__.py`.

## 2. `server/auth_api.py` (NEW — port vocky `auth_api.py` to FastAPI)

Models (the `field_validator` + `Field(min_length=8)` port unchanged; FastAPI binds them as body params):
```python
from fastapi import APIRouter, Request, Response, HTTPException
from pydantic import BaseModel, Field, field_validator

class _EmailPasswordInput(BaseModel):
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

class SignupIn(_EmailPasswordInput): ...
class LoginIn(_EmailPasswordInput): ...
```
Constants + helpers (verbatim from vocky):
```python
SESSION_TTL = timedelta(days=30)

def serialize_user(record) -> dict:
    return {"id": str(record.id), "email": record.email, "created_at": record.created_at.isoformat()}
def serialize_tenant(record) -> dict:
    return {"id": str(record.id), "name": record.name, "created_at": record.created_at.isoformat()}

async def _mint_token(user_id) -> str:
    raw_token = generate_opaque_token()
    await get_accounts_service().create_auth_token(
        CreateAuthToken(user_id=user_id, token_hash=sha256_hex(raw_token), expires_at=utc_now() + SESSION_TTL)
    )
    return raw_token
```
Handlers on `router = APIRouter()`:
- **`@router.post("/auth/signup", status_code=201)` `async def signup(payload: SignupIn)`**:
  `service = get_accounts_service()`; `try: user = await service.create_user(CreateUser(email=payload.email,
  password_hash=hash_password(payload.password)))` `except DuplicateEmailError: raise HTTPException(409, "a user
  with this email already exists")`; `workspace_name = f"{payload.email.split('@')[0]}'s workspace"`;
  `tenant, _ = await service.create_tenant_with_owner(user.id, workspace_name)`; `token = await
  _mint_token(user.id)`; return `{"token": token, "user": serialize_user(user), "tenant":
  serialize_tenant(tenant)}` — **singular `tenant`**.
- **`@router.post("/auth/login")` `async def login(payload: LoginIn)`**: `user = await
  service.get_user_by_email(payload.email)`; `if user is None or not verify_password(user.password_hash,
  payload.password): raise HTTPException(401, "invalid email or password")`; `token = await _mint_token(user.id)`;
  `tenants = await service.list_tenants_for_user(user.id)`; return `{"token": token, "user": serialize_user(user),
  "tenants": [serialize_tenant(t) for t in tenants]}` — **plural `tenants`**.
- **`@router.post("/auth/logout", status_code=204)` `async def logout(request: Request)`**: `token =
  extract_bearer_token(request); if token is not None: await get_accounts_service().delete_auth_token(
  sha256_hex(token))`; `return Response(status_code=204)`. Idempotent; no auth required.
- **`@router.get("/auth/me")` `async def me(context: AuthContext = Depends(require_user))`**: `tenants = await
  get_accounts_service().list_tenants_for_user(context.user.id)`; return `{"user": serialize_user(context.user),
  "tenants": [serialize_tenant(t) for t in tenants]}`. (Using `Depends(require_user)` is the FastAPI-idiomatic way
  to invoke the guard; `require_user` takes `request: Request` which FastAPI injects.)

Imports from S1: `from server.accounts.security import generate_opaque_token, sha256_hex, hash_password,
verify_password`; `from server.accounts.service import get_accounts_service, DuplicateEmailError`; `from
server.accounts.types import CreateUser, CreateAuthToken`; `from server.persistence.models import utc_now` (or
wherever `utc_now` lives); `from server.accounts.auth import AuthContext, extract_bearer_token, require_user`.

## 3. `server/main.py` (MODIFY — two wirings only)

```python
from server import auth_api
from server.accounts.auth import AuthError, auth_error_handler
# ... after app = FastAPI(...):
app.include_router(auth_api.router)
app.add_exception_handler(AuthError, auth_error_handler)
```
Nothing else in `main.py` changes (content routes, write path, lifespan untouched).

## Verification (run; report in `result.md`)

1. **HTTP smoke against compose** (Postgres up + `alembic upgrade head`; ephemeral httpx/curl, not a committed
   Postgres-dependent test — mirror S1's stdin-piped approach): signup→201 (token + singular `tenant`);
   login→200 (token + plural `tenants`); `GET /auth/me` + bearer→200; `/auth/me` no/bad token→401
   `{"detail":"Unauthorized"}` (+ `WWW-Authenticate: Bearer`); logout→204; `/auth/me` after logout→401; dup
   signup→409 `{"detail":"a user with this email already exists"}`; wrong-password & unknown-email→**identical**
   401 `{"detail":"invalid email or password"}`; `password` len<8→422.
2. **No regression:** `uv run pytest -q` still passes (the existing 65; `/auth` untested there, `/api`
   untouched). App still boots with `DATABASE_URL` unset (engine lazy). A single small `DATABASE_URL`-guarded
   `TestClient` auth test is OPTIONAL — keep test files small; S6 owns the durable E2E.
3. `python3 scripts/workflow.py validate`.

## Finish

`result.md` (endpoints built, the smoke output showing the status codes/bodies above, any deviations). Append
`phase.md` notes: Doc-impact one-liners (api: `/auth/*` session surface — signup/login/logout/me, 30-day bearer,
anti-enumeration 401, singular-vs-plural tenant shapes; security: session tokens sha256-hashed, generic 401,
argon2 login verify; backend: `server/auth_api.py` router + `server/accounts/auth.py` `require_user` guard) and
what S3 needs (`require_user`/`AuthContext` are the guard S3's `/app/*` reuses; `get_accounts_service()` is the
entrypoint). Return `done` when the four endpoints + guard work and verification passes; else
`escalate`/`blocked`/`needs_operator` with findings.
