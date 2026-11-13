# P10.S4 result — `/api/*` credential auth (resolve credential → tenant)

**Status: done.** The `/api/*` content plane now resolves a bearer to a tenant in
tenant mode, while legacy single-bearer behavior is byte-for-byte preserved when
`DATABASE_URL` is unset. The frozen `POST /api/documents` contract is untouched
(only the dependency swapped). No storage/query scoping was added — that is S5.

## What was built

### 1. Two-mode resolver — `server/api_auth.py` (NEW)
`ApiAuthContext(tenant_id: UUID | None, project_id: UUID | None)` + two FastAPI
dependencies, switched per-call on `config.database_url()` (`_tenant_mode()`):

- **`resolve_api_write(request)`** — guards the mutating `/api/*` endpoints.
  - *Legacy* (`DATABASE_URL` unset): identical to the old `require_bearer` — no-op
    when `KB_API_TOKEN` is unset (localhost-open); else exact `Authorization:
    Bearer <token>` match, 401 otherwise. Returns the shared `_LEGACY`
    (`tenant_id=None`).
  - *Tenant*: `extract_bearer_token` → `_resolve_tenant_bearer` → `ApiAuthContext`;
    a missing/unresolvable bearer → generic 401.
- **`resolve_api_read(request)`** — guards the read/search endpoints.
  - *Legacy*: identical to the old `require_read_bearer` — open unless
    `KB_REQUIRE_READ_AUTH` **and** `KB_API_TOKEN` are both set, then delegates to
    the same exact-match bearer check. Returns `_LEGACY`.
  - *Tenant*: reads require a resolvable credential (a tenant is needed to scope in
    S5); no/bad bearer → 401.
- **`_resolve_tenant_bearer(token)`** — the tenant-mode resolution chain:
  1. **Pinned master:** exact `KB_API_TOKEN` → the tenant owned by
     `config.operator_email()` (`get_user_by_email` → `list_tenants_for_user()[0]`).
     Un-revokable special-case, **not** a DB credential. Master set but no
     email/operator not seeded → `None` (unresolvable, not silently accepted).
  2. **`vk_` project credential:** `sha256_hex(token)` →
     `get_active_credential_by_token_hash` → `get_project(cred.project_id)` →
     `ApiAuthContext(tenant_id=project.tenant_id, project_id=project.id)`.
  3. **Session token:** `sha256_hex(token)` → `get_active_auth_token_by_hash` →
     `get_user_by_id` → `list_tenants_for_user()[0]` (own-corpus reads/writes,
     `project_id=None`).
  4. Otherwise `None`.
- `_unauth()` keeps today's `"missing or invalid bearer token"` detail (existing
  tests assert on the 401 status, not the body) and adds an additive
  `WWW-Authenticate: Bearer` challenge header.

All reused `AccountsService` methods (`get_user_by_email`, `list_tenants_for_user`,
`get_active_credential_by_token_hash`, `get_project`, `get_active_auth_token_by_hash`,
`get_user_by_id`), plus `sha256_hex` and `extract_bearer_token`, were confirmed
present with the exact signatures the plan inlined — no escalation needed.

### 2. `server/config.py` — `operator_email()` (per-call `_env("KB_OPERATOR_EMAIL")`).

### 3. `server/main.py` — guard swaps only (verified via route→dependency inspection)
- Import `ApiAuthContext, resolve_api_read, resolve_api_write`.
- **6 GET reads** (`/api/documents`, `/api/tags`, `/api/projects`,
  `/api/documents/by-path/{…}`, `/api/documents/{doc_id}`, `/api/search`):
  `_: None = Depends(require_read_bearer)` → `ctx: ApiAuthContext =
  Depends(resolve_api_read)`.
- **`POST /api/documents` + the 2 DELETEs**: `_: None = Depends(require_bearer)` →
  `ctx: ApiAuthContext = Depends(resolve_api_write)`.
- **`POST /api/reindex` unchanged** — still `Depends(require_bearer)` (operator-only,
  not tenant-scoped). The `require_bearer` / `require_read_bearer` functions stay in
  place (reindex + the legacy branch's semantics reference).
- Handlers now accept `ctx` but do **not** use it for storage/queries (S5). The
  `DocumentIn` model, the write path, and every response shape are unchanged.

### 4. Compose
- `compose.prod.yml`: added `KB_OPERATOR_EMAIL: ${KB_OPERATOR_EMAIL}` to the `api`
  `environment:` and documented it in the `env_file` comment block. **Deviation
  from the plan's literal wording** (see below): sourced from the box's gitignored
  `.env` rather than hardcoded, so the pin can't silently drift from the S6-seeded
  operator email and break the master bearer.
- `compose.yml` (local): added `KB_OPERATOR_EMAIL: ${KB_OPERATOR_EMAIL:-}`
  (optional; empty locally = master-bearer shortcut off, `vk_`/session still work).

## Verification

### 1. Legacy-mode regression (primary gate) — PASS
`DATABASE_URL` unset → `uv run pytest -q` → **65 passed**. Ran the four named
critical tests explicitly → **4 passed**: `test_bearer_auth_on_mutating`,
`test_reads_open_by_default_even_with_token`,
`test_read_auth_gates_reads_when_flag_and_token_set`, `test_read_auth_noop_without_token`.
Route→dependency inspection confirmed the exact guard wiring (6 reads →
`resolve_api_read`; POST documents + 2 DELETEs → `resolve_api_write`; reindex →
`require_bearer`).

### 2. Tenant-mode resolution smoke — PASS (real Postgres + real HTTP path)
Ephemeral `postgres:17` container + `alembic upgrade head` (real 6-table schema);
app driven in-process via `TestClient` with `DATABASE_URL` set,
`KB_OPERATOR_EMAIL=operator@test`, `KB_API_TOKEN=master-secret-xyz`; content plane
sandboxed to a temp `KB_ROOT` (no git, no reindex). Signed up `operator@test`
(tenant #1) + `other@test` (tenant #2) via `/auth/signup`, minted a `vk_` key under
a project of each via `/app/*`. Results — **all pass**:

| Credential | `POST /api/documents` | Resolved to |
|---|---|---|
| `KB_API_TOKEN` master | **201** (frozen shape) | tenant #1, `project_id=None` |
| `vk_` (operator's project) | **201** (frozen shape) | tenant #1 + that project id |
| session token (operator) | **201** (frozen shape) | tenant #1, `project_id=None` |
| `vk_` (other's project) | — (resolver-checked) | tenant #2 + that project id |
| bad bearer | **401** | `None` |
| absent bearer | **401** | `None` |

Reads: `GET /api/documents` → **200** with the `vk_` key and with the master token,
**401** with a bad/absent bearer. `POST /api/reindex` → **200** with `KB_API_TOKEN`,
**401** with a `vk_` key (confirmed still operator-only, not tenant-scoped). The
frozen 201 response key set was asserted intact for all three write credential
types. Cross-tenant isolation was deliberately **not** asserted (that is S5). Stack
torn down after.

### 3. `python3 scripts/workflow.py validate` — PASS ("Workflow validation passed.")

Also verified both compose files parse (`docker compose config`) and
`KB_OPERATOR_EMAIL` wires into the `api` service env.

## Deviations from plan.md
- **`compose.prod.yml` `KB_OPERATOR_EMAIL` sourced from `.env`, not a hardcoded
  literal.** The plan said "add … (the operator's real signup email)". I did not
  have an authoritative value for the hosted operator's signup email (it is what
  S6 seeds), and a wrong literal would silently make the `KB_API_TOKEN` master
  bearer unresolvable — a regression on the frozen-contract auth of the live hi2vi
  agent. Wiring it via `${KB_OPERATOR_EMAIL}` from the box's gitignored `.env`
  keeps a single source of truth on the box, makes it a documented deploy
  prerequisite alongside `POSTGRES_PASSWORD` (exactly as the plan's phase.md note
  requests), and keeps `docker compose config` valid. Behavior is identical once
  the box sets the value; unset → the master bearer is unresolvable (the safe
  misconfigured state the resolver already codes for).
- No other deviations. Resolver code, guard swaps, and scope boundary follow the
  plan exactly.
