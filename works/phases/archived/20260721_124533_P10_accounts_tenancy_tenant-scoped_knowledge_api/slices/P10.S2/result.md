# P10.S2 — result

Auth surface shipped: the `/auth/*` session endpoints + the reusable `require_user`
guard, a faithful port of vocky's `auth_api.py` + `accounts/auth.py` adapted from
Starlette to FastAPI. Built on S1's `AccountsService` — no persistence/security code
touched. Content plane, write path, and lifespan untouched (only the two wiring lines
in `main.py`). No `/app/*` (S3), no `/api/*` changes (S4), no `documents.tenant_id` (S5),
no seed (S6).

## What was built

**`server/accounts/auth.py` (NEW)** — vocky `accounts/auth.py` ported verbatim, FastAPI
imports (`Request`/`JSONResponse` from FastAPI, which re-export Starlette's):
- `AuthContext(user, tenant)` `@dataclass(slots=True)`, `AuthError(Exception)`.
- `extract_bearer_token(request)` — scheme-insensitive `Bearer`, None on absent/malformed.
- `require_user(request) -> AuthContext` — bearer → `sha256_hex` → `get_active_auth_token_by_hash`
  → best-effort `touch_auth_token_last_used` (logged, never fails auth) → `get_user_by_id` →
  `list_tenants_for_user()[0]`; any miss raises `AuthError`.
- `auth_error_handler(request, exc) -> JSONResponse` — generic `401 {"detail":"Unauthorized"}`
  + `WWW-Authenticate: Bearer`.

**`server/auth_api.py` (NEW)** — vocky `auth_api.py` ported to a FastAPI `APIRouter`:
- `_EmailPasswordInput` (`email` + `password: Field(min_length=8)` + `_normalize_email`
  validator: `strip().lower()`, blank/`@` checks) → `SignupIn`/`LoginIn`.
- `serialize_user`/`serialize_tenant` — hash-free (no `password_hash`/`token_hash`).
- `_mint_token(user_id)` — `generate_opaque_token()` → `create_auth_token(sha256_hex, expires_at=utc_now()+SESSION_TTL)`; `SESSION_TTL = timedelta(days=30)`.
- `POST /auth/signup` (201) — `create_user` (`DuplicateEmailError` → 409), `create_tenant_with_owner`
  with `"<localpart>'s workspace"`, mint token → `{token, user, tenant}` (**singular `tenant`**).
- `POST /auth/login` (200) — `get_user_by_email` + `verify_password`; `None`-or-mismatch → identical
  generic `401 {"detail":"invalid email or password"}`; → `{token, user, tenants:[...]}` (**plural**).
- `POST /auth/logout` (204) — `extract_bearer_token` → `delete_auth_token(sha256_hex)`; idempotent, no auth.
- `GET /auth/me` (200) — `Depends(require_user)` → `{user, tenants:[...]}`.

**`server/main.py` (MODIFY — two wirings only)** — `app.include_router(auth_api.router)` +
`app.add_exception_handler(AuthError, auth_error_handler)` right after `app = FastAPI(...)`.

### Deviations from plan
- **`touch_auth_token_last_used` already present** — S1 shipped it on the service (verified in
  `server/accounts/service.py` L327). Nothing to add; `require_user` calls it as vocky does.
- **`server/accounts/__init__.py` left untouched** — the plan's re-export of `AuthError`/
  `AuthContext`/`require_user` was explicitly optional. Kept the accounts package `__init__`
  FastAPI-free (transport-neutral); S3 imports the guard directly from `server.accounts.auth`
  (exactly what this slice's `auth_api.py` does).
- **`_INVALID_CREDENTIALS`** kept as a bare string (`"invalid email or password"`) fed to
  `HTTPException(401, detail=...)` rather than vocky's `{"detail": ...}` dict, because FastAPI's
  `HTTPException` wraps `detail` into `{"detail": ...}` itself — the wire body is byte-identical.
- **Per-decision, FastAPI-native 422** for body validation (short password, bad email) instead of
  vocky's Starlette 400-single-string — repo consistency with the existing `/api` endpoints.
  Every other behavior ported faithfully. No test file committed (Postgres-dependent smoke was ephemeral).

## Verification

Docker **was** available in-environment, so every Postgres-dependent step ran against a real
`postgres:17`. **No verification gap.**

1. **Import/route/no-DB sanity** (`uv run python`, `DATABASE_URL` unset, `TestClient`): `/auth`
   routes registered (`POST /auth/signup`, `POST /auth/login`, `POST /auth/logout`, `GET /auth/me`),
   `AuthError` handler registered, `SESSION_TTL == 30 days`; app **boots with `DATABASE_URL` unset**
   (`GET /healthz` 200, engine stays lazy); no-DB paths: short-pw signup → **422**, `/auth/me` no
   token → **401 `{"detail":"Unauthorized"}` + `WWW-Authenticate: Bearer`**, logout no token → **204**. **PASS**
2. **`uv run pytest -q`** → **65 passed** (1 pre-existing Starlette/httpx deprecation warning). No
   regression; `/api` untouched. **PASS**
3. **Compose stack + `alembic upgrade head`** — `docker compose up -d --build postgres api`
   (postgres healthy, api up, `/healthz` 200), `alembic upgrade head` applied `0001_accounts_tenancy`. **PASS**
4. **Ephemeral `/auth` HTTP smoke** (httpx script piped into the api container over stdin — not a
   committed test, mirrors S1) — **34/34 checks PASS → `AUTH SMOKE PASSED`.** Every status/body in
   the plan's verification list asserted:
   - signup → **201** `{token, user, tenant}` (**singular** `tenant`), tenant name `"smoke.user's workspace"`, no `password_hash`/`token_hash`.
   - login → **200** `{token, user, tenants:[...]}` (**plural**, len 1).
   - `GET /auth/me` + bearer → **200** (correct user email + `tenants`, no `password_hash`).
   - `/auth/me` no token → **401 `{"detail":"Unauthorized"}` + `WWW-Authenticate: Bearer`**; bad token → **identical 401**.
   - logout → **204** (empty body); `/auth/me` with the same token after logout → **401**; logout again w/o token → **204** (idempotent).
   - dup signup → **409 `{"detail":"a user with this email already exists"}`**.
   - wrong-password → **401 `{"detail":"invalid email or password"}`**; unknown-email → **byte-identical 401** (anti-enumeration proven equal as `(status, body)` tuples).
   - short (`len<8`) password → **422**; mixed-case + whitespace email → normalized, logs in **200**.
5. **`python3 scripts/workflow.py validate`** → "Workflow validation passed." **PASS**

Docker resources created (postgres + api containers, `knowledge_pgdata` volume, `knowledge_default`
network) were torn down afterward (`docker compose down -v`) — `docker compose ps` empty, no
`knowledge-*` containers left. Nothing Postgres-dependent committed to the repo.

## Files changed
- `server/accounts/auth.py` (NEW)
- `server/auth_api.py` (NEW)
- `server/main.py` (two wiring lines: import + `include_router`/`add_exception_handler`)
