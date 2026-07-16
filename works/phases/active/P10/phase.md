# Phase P10: Accounts, Tenancy & Tenant-Scoped Knowledge API

_Intent: see [intent.md](intent.md)._

## Objective

Introduce users/tenants/projects with signup/login/session auth and API credentials; scope the knowledge API (write/read/search) per tenant; seed the operator's own tenant and migrate the live knowledge.hi2vi.com corpus in as tenant #1

## Context

**This phase is the foundation of a five-phase SaaS pivot (P10–P14).** It turns a single-tenant deployment (one shared `KB_API_TOKEN`, no user model) into a multi-tenant SaaS with **no paid plan at launch**. Free = knowledge saving + the Claude Code `/explain`-style connection + all web UI features (graph included). Paid = the retriever endpoint for external AI agents — **deferred (D6)**, do not build here. Hosted SaaS is the flagship; the MIT self-host/plugin path stays as the open-core option, not actively extended.

### Two-plane architecture (the mental model every slice works within)

P10 makes the FastAPI app a **two-plane app in one process**:

- **Control plane = Postgres, transactional, async, mirrors vocky.** `/auth/*` (sessions) and `/app/*` (projects + `vk_` credentials). Tenant-scoped; cross-tenant access → 404. New Postgres service in `compose.yml` + `compose.prod.yml`; async SQLAlchemy 2.0 (`Mapped`/`mapped_column`) + Alembic migrations + `argon2-cffi`. **Six tables** ported from vocky (see reference map).
- **Content plane = unchanged.** Files under `docs/` (canonical) plus a **new namespaced, non-published root** for new tenants; disposable `kb.sqlite3` (FTS5 + vectors) rebuilt from files on boot. `WRITE_LOCK` + **single uvicorn worker** preserved — Postgres does **not** touch the content write lock. Both planes live in one FastAPI app (async accounts endpoints alongside the existing sync content endpoints).

**Solo-owner MVP (mirror vocky):** `require_user` resolves `tenants[0]`; no active-tenant switching, no invite/role UI. `tenant_members` is the ownership join (there is **no** owner column on `tenants`).

**Storage decision:** namespaced, `docs/`-canonical. Tenant #1 keeps `docs/<project>/…` **unchanged** (frozen contract + public mkdocs site intact); new tenants' content lives under a separate non-published root excluded from the mkdocs build. **No** invariant inversion (content stays files-canonical + disposable SQLite), **no** per-tenant git repos, **no** per-tenant public sites (P12 owns dashboards; P12 intent owns per-tenant sites if ever).

**Legacy bearer decision:** `KB_API_TOKEN` is kept as **tenant #1's legacy bearer** — it resolves to the operator's tenant #1, so the live hi2vi content agent needs **zero** changes. New tenants use `vk_` keys; session tokens drive the control plane and own-corpus reads.

### Two hard couplings — every downstream slice MUST respect these

1. **Startup-reindex / `docs/`-canonical.** `kb.sqlite3` is rebuilt from files on every boot (`KB_STARTUP_REINDEX=true`; `server/main.py` `lifespan` ~L34–48). A `tenant_id` that lives **only** in the DB is wiped on every reindex unless `server/reindex.py` re-derives it from the file path → **tenant identity must live durably in the file path**, not just in a DB column.
2. **Frozen additive-only `POST /api/documents`.** See `docs/current/api.md` §"Frozen consumer contract (P8)" (~L116–127). No tenant field on the body; `<project>/…` is baked into `url` + `rel_path`; the hi2vi content agent codes against this exact shape → **tenant is derived from the credential, never a body field; namespacing must stay out of tenant #1's client-visible paths; only additive response fields allowed.**

## Decomposition

Six implementation slices, chained S1→S6 (each `--depends-on` its predecessor):

| Slice | Name | Risk | Depends on |
|-------|------|------|-----------|
| P10.S1 | Accounts persistence: Postgres + schema + Alembic + accounts layer | high | — |
| P10.S2 | Auth surface `/auth/*` + `require_user` session guard | high | P10.S1 |
| P10.S3 | Control plane `/app/*`: tenant-scoped projects + `vk_` credentials | **medium** | P10.S2 |
| P10.S4 | `/api/*` credential auth: resolve credential → tenant+project | high | P10.S3 |
| P10.S5 | Content tenant-scoping: `documents.tenant_id` + reindex + namespaced storage | high | P10.S4 |
| P10.S6 | Seed tenant #1 + migrate live corpus + E2E onboarding smoke | high | P10.S5 |

### Scope per slice (authoritative; each slice writes its own `plan.md` at its turn)

- **S1 — Accounts persistence.** Postgres compose service (both compose files) + config (`DATABASE_URL`); async SQLAlchemy models for the 6 tables + a `NAMING_CONVENTION` base; Alembic initial migration (async `env.py`); accounts layer ported from vocky: `security` (argon2id `hash_password`/`verify_password`, `generate_opaque_token` = `secrets.token_urlsafe(32)`, `sha256_hex`), `types` (transport-neutral records; credential/token records omit `token_hash`), `repository` (ORM boundary, no commits), `service` (owns transactions, domain errors incl. `DuplicateEmailError`, `create_tenant_with_owner`). New deps: sqlalchemy, an async pg driver (asyncpg or psycopg), alembic, argon2-cffi. **Resolves Open Question:** async-SQLAlchemy-in-sync-app vs sync-SQLAlchemy+psycopg (an integration-shape call, not a product fork — single worker means no async-throughput driver; pick the simpler clean integration).
- **S2 — Auth surface.** `/auth/*`: `signup` (create user + `create_tenant_with_owner` + mint session → 201 `{token,user,tenant}`), `login` (enumeration-safe generic 401), `logout` (204), `me` (200). `_mint_token`, 30-day TTL, email `strip().lower()` + `@` check, serializers never emit hashes. `require_user(request) -> AuthContext(user,tenant)` guard: bearer → `get_active_auth_token_by_hash(sha256_hex)` → user → `tenants[0]`. Ports vocky `auth_api.py` + `accounts/auth.py`.
- **S3 — Control plane `/app/*`.** `GET /app/tenant`; `GET|POST /app/projects`; `GET /app/projects/{id}`; `POST|GET /app/projects/{id}/credentials`; `DELETE …/credentials/{cid}`. All `require_user`-guarded, scoped to `ctx.tenant.id`; `_load_scoped_project` returns 404 for missing **and** cross-tenant. `vk_` mint: `key=f"vk_{generate_opaque_token()}"`, `token_prefix=key[:12]`, `token_hash=sha256_hex(key)`, raw key returned once. Ports vocky `app_api.py`. The `projects` table becomes the source-of-truth for project→tenant. (Mid risk: this is the one clean mechanical CRUD port.)
- **S4 — `/api/*` credential auth.** Replace `require_bearer`/`require_read_bearer` (`server/main.py` ~L69–107) on `/api/*` with a credential resolver → `(tenant, project?)`: a `vk_` key → its project+tenant; `KB_API_TOKEN` → tenant #1 (legacy); a session token → its user's `tenants[0]` (reads/own-corpus). Preserve every frozen `POST /api/documents` shape (tenant derived, not a body field; `project` must belong to the tenant; 401/409/422 meanings unchanged). Keep localhost-open behavior for local dev where applicable. **Resolves Open Question:** whether session tokens are accepted on `/api/*` reads.
- **S5 — Content tenant-scoping.** Add `documents.tenant_id` (SQLite, via the `db.init_db` idempotent-ALTER pattern, ~L84–97); write path routes tenant #1 → `docs/<project>/…`, other tenants → the namespaced non-published root (touches `server/documents.py rel_path` ~L87, `server/main.py` write path staged/landing paths in `create_document` ~L243–407); `mkdocs.yml` `exclude_docs`/`RESERVED_DIRS` so the namespaced root isn't published; `server/reindex.py` derives `tenant_id` from the path (T1 legacy path → tenant #1; namespaced path → resolve slug→tenant via Postgres); add a tenant filter to **every** read/search/list/by-path/by-id/delete query (`server/db.py` `_filtered` ~L193, `list_tags` ~L249, `list_projects` ~L267, `get_all_embeddings` ~L330, `get_document`/`get_document_by_path` ~L179–190, `delete_document_by_path` ~L238; `server/search.py` `search` ~L193 count/rows/vector arms). Cross-tenant fetch by id/path → 404. **Resolves Open Question:** exact namespaced-root path + mkdocs-exclusion mechanism.
- **S6 — Seed + migrate + smoke.** Seed operator user + tenant #1 + projects + credential; migrate the 4 live projects (`bootstrap_agentic_workspace`, `changple5`, `hi2vi_web`, `hi2vi`) to tenant #1 (create their `projects` rows; ensure reindex assigns their `documents.tenant_id`); E2E onboarding smoke mirroring vocky `smoke.py` (signup → `POST /app/projects` → mint `vk_` key → `POST /api/documents` → scoped `GET /api/search`/documents), asserting a second tenant **cannot** read tenant #1's corpus. No seed/backfill precedent exists in this repo — vocky is the pattern.

### Risk-differentiation rationale

- **S3 = medium (the one cost saving).** `/app` CRUD is a clean mechanical port of vocky `app_api.py` with no frozen-contract surface and no new datastore — the least judgment-heavy slice.
- **Everything else = high.** S1 stands up a whole new datastore + migrations + a security-critical accounts layer; S2 is the auth surface (security-critical, enumeration-safety, session tokens); S4 rewrites the `/api/*` auth against the **frozen** `POST /api/documents` contract; S5 threads tenant scoping through the content plane across the DB-vs-file-path derivation coupling; S6 does a live corpus migration where a mistake is externally visible.
- **S2/S3 split** because auth is security-critical and `/app` isn't — different tiers, different care.
- **S4/S5 split** because credential-resolution (S4) and content-scoping (S5) are the two riskiest frozen-contract-adjacent jobs; keeping them separate keeps each reviewable in isolation.
- **Chain S1→S6:** every slice consumes its predecessor (models → auth → projects → credential auth → content scoping → seed/migrate), so a strict linear dependency is honest.

## Findings & Notes

_Durable findings and cross-slice notes; `DECOMP` seeds this, and each slice appends when it finishes._

### Vocky reference map — `/Users/sugang/projects/personal/vocky` (verified 2026-07-16)

The closest prior art; port from it, do not reinvent. Paths confirmed to exist:

- `src/vocky/persistence/models.py` — the 6 accounts tables we port (UUID PKs): `users` (L170), `tenants` (L186), `tenant_members` (L201), `projects` (L231), `project_credentials` (L252), `auth_tokens` (L283). (Note: this file **also** holds 3 vocky-only feedback tables — `feedback_events`/`_comments`/`_attachments` at L25/L104/L136 — which we do **not** port.)
- `src/vocky/persistence/base.py` — `NAMING_CONVENTION` (L6) + `Base` with `metadata = MetaData(naming_convention=NAMING_CONVENTION)` (L18). Port this named-constraint convention so Alembic autogenerate is stable.
- `src/vocky/accounts/` — `security.py`, `types.py` (transport-neutral records; credential/token records omit `token_hash`), `repository.py` (ORM boundary, **no commits**), `service.py` (owns transactions + domain errors), `auth.py` (`require_user`).
- `src/vocky/auth_api.py` — `/auth/*`; signup provisions user + tenant + owner + session in one transaction.
- `src/vocky/app_api.py` — `/app/*`; `vk_` mint at **L234** (`key = f"vk_{generate_opaque_token()}"`, `token_prefix=key[:12]` L238, `token_hash=sha256_hex(key)` L239); `_load_scoped_project` returns 404 for both missing and cross-tenant. Credential serializer never exposes `token_hash` (L80/L86).
- `src/vocky/auth.py` (root) — `ProjectCredentialAuthMiddleware` is **identity-only** in vocky (no data-plane isolation).
- `alembic/` at the **vocky repo root** (not under `src/vocky/`) — async `alembic/env.py` is the async-migration reference. (The initial accounts-tenancy migration is the shape to mirror.)
- `src/vocky/smoke.py` — the onboarding-over-HTTP sequence S6's E2E smoke mirrors.

**Key divergence — the work vocky never shipped:** vocky **deferred** data-plane tenant isolation (its feedback rows carry no `tenant_id`; its credential middleware is identity-only). Our intent requires content isolation from day one → that is **S4 + S5**, and it has no vocky precedent to copy — it is the phase's genuinely new work.

### Current-backend integration points — `/Users/sugang/projects/personal/knowledge/server/` (line anchors approximate; they will drift as slices edit)

- `main.py` — auth deps `require_bearer` (L69) / `require_read_bearer` (L82), `_public_doc` through ~L107; `WRITE_LOCK` (L57); `lifespan` startup reindex (L34–48); write path `create_document` (~L243–407) incl. publish-on-write; delete path (~L410+). `require_read_bearer` is a no-op unless `KB_REQUIRE_READ_AUTH` **and** `KB_API_TOKEN` are both set; `require_bearer` is a no-op when `KB_API_TOKEN` is unset (localhost-open) — S4 must preserve these open-by-default local semantics.
- `config.py` — env resolved per-call: `docs_root()` (L26), `db_path()` (L31), `api_token()`→`KB_API_TOKEN` (L46), `KB_GIT_PUSH` (L63), `KB_REQUIRE_READ_AUTH` (L77), `KB_STARTUP_REINDEX` (L105, default true). S1 adds `DATABASE_URL` here.
- `db.py` (SQLite content plane) — `_SCHEMA` (L21), `init_db` idempotent-ALTER pattern (L84–93, `executescript`); query builders S5 must tenant-filter: `get_document` (L179), `get_document_by_path` (L184), `_filtered` (L193, used by list/count), `delete_document_by_path` (L238), `list_tags` (L249), `list_projects` (L267), `get_all_embeddings` (L330).
- `documents.py` — `rel_path(project,date,slug)` (L87), `ensure_project_landing` (L342).
- `search.py` — `search` (L193): count / rows / vector arms all need the tenant filter.
- `reindex.py` — `RESERVED_DIRS = {"current","versions"}` (L23); project derived as `Path(rel).parts[0]` (L37); reserved-dir guards at L171/L234. This is where S5 re-derives `tenant_id` from the path (the hard coupling #1).
- `gitops.py` — scoped add/commit/push (publish-on-write).
- Deployment: `compose.yml` (kb + api) and `compose.prod.yml` (knowledge-api + knowledge-site, **single worker**) — S1 adds a Postgres service to both.

### Other notes

- **Solo-owner MVP:** one user = one tenant via `tenant_members`; `require_user` → `tenants[0]`. No tenant switching, invites, or role management in P10.
- **`last_used_at` stamping is optional** on credentials/tokens (vocky deferred it) — leave out unless a slice finds it cheap.
- **Deferred:** D6 (paid-plan retriever endpoint for external AI agents) is this phase's standing deferral — `works/deferred/open/D6`. Do **not** build the paid retriever in P10.

### S1 completion notes — what S2 (and later slices) consume

**Entrypoint:** `from server.accounts import get_accounts_service` → returns an `AccountsService` bound to the lazy async session maker. Everything the auth surface needs is on that service; do **not** touch the repository/engine directly.

**`AccountsService` methods S2 will use (all `async`):**
- `create_user(CreateUser(email, password_hash)) -> UserRecord` — raises `DuplicateEmailError` on dup email (catch → 409). `UserRecord` carries `password_hash` for login verify.
- `get_user_by_email(email) -> UserRecord | None` — login lookup.
- `get_user_by_id(user_id: UUID) -> UserRecord | None`.
- `create_tenant_with_owner(user_id, name) -> tuple[TenantRecord, TenantMemberRecord]` — signup primitive (atomic tenant + `role="owner"` member).
- `list_tenants_for_user(user_id) -> tuple[TenantRecord, ...]` — oldest-first; `require_user` uses `tenants[0]` (solo-owner MVP).
- `create_auth_token(CreateAuthToken(user_id, token_hash, expires_at=None)) -> AuthTokenRecord` — mint session; caller passes `sha256_hex(raw)`, keeps the raw token to return once. `expires_at=None` = no expiry (S2 sets a 30-day TTL).
- `get_active_auth_token_by_hash(token_hash) -> AuthTokenRecord | None` — bearer resolve (NULL-or-future `expires_at` only). `require_user`: bearer → `sha256_hex` → this → `get_user_by_id` → `list_tenants_for_user()[0]`.
- `delete_auth_token(token_hash) -> bool` — logout (True when a row was removed).
- `touch_auth_token_last_used(token_hash)` — optional stamping (vocky deferred it; skip unless cheap).

**S3 (projects/credentials) methods (already present):** `create_project` / `get_project` / `list_projects_for_tenant`, `create_project_credential` / `list_project_credentials` / `get_active_credential_by_token_hash` / `revoke_credential` / `touch_credential_last_used`. `vk_` mint recipe (S3): `key=f"vk_{generate_opaque_token()}"`, `token_prefix=key[:12]`, `token_hash=sha256_hex(key)`.

**Security helpers:** `from server.accounts.security import hash_password, verify_password, generate_opaque_token, sha256_hex` (not re-exported from the package `__init__` — import from the module).

**Transport invariant:** records never expose `token_hash`; `ProjectCredentialRecord`/`AuthTokenRecord` surface only `token_prefix`/metadata. Keep serializers hash-free.

**Errors to handle:** `AccountsPersistenceError` (write failures), `AccountsReadError` (read failures), `DuplicateEmailError` (subclass of persistence error, → 409). All are `RuntimeError` subclasses under `server.accounts`.

**Dormancy gotcha:** with `DATABASE_URL` unset, the first accounts call raises `RuntimeError("DATABASE_URL is not set; the accounts plane is unavailable")` from `get_engine()`. S2's `/auth/*` handlers should assume Postgres is present in the hosted deployment; local dev without `DATABASE_URL` leaves accounts dormant (content plane still works). No migration runs on boot — `alembic upgrade head` is an explicit deploy step.

### Doc-impact list (for `P10.REVIEW` to consolidate into versions — do NOT version per slice)

Later slices append one-liners here as they change durable truth; the review slice consolidates each area into a single new doc version. Areas P10 is expected to touch:

- **architecture** — two-plane app (Postgres control plane + unchanged content plane).
- **backend** — accounts layer (security/types/repository/service), async-vs-sync SQLAlchemy integration decision.
- **data** — Postgres accounts schema (6 tables) + `documents.tenant_id` + namespaced storage root.
- **api** — new `/auth/*` and `/app/*` surfaces; `/api/*` credential auth (resolver); frozen `POST /api/documents` contract preserved additively.
- **security** — multi-tenant threat-model shift (real tenant data + PII): argon2id password hashing, sha256 token hashing at rest, cross-tenant isolation.
- **operations** — Postgres service + migrations, seed/backfill runbook, still single-worker.
- **decisions** — ADRs: Postgres-over-SQLite for accounts; namespaced `docs/`-canonical storage; `KB_API_TOKEN` as legacy tenant-#1 bearer.

**S1 appended (for REVIEW to consolidate):**
- **architecture** — App is now a two-plane process: unchanged content plane (files + disposable `kb.sqlite3`, single worker, `WRITE_LOCK`) alongside a new **Postgres control plane** (async SQLAlchemy 2.0). Control plane is **lazy/dormant** when `DATABASE_URL` is unset — the content plane still boots without Postgres.
- **backend** — New `server/persistence/` (declarative `Base` + `NAMING_CONVENTION`, 6 ORM models, lazy async engine) and `server/accounts/` (security → types → repository → service). Repository is the sole ORM boundary and never commits; the service owns transactions + domain errors. Engine disposed in the app lifespan (`await dispose_engine()` after `yield`).
- **backend/decision** — **Resolved the async-vs-sync SQLAlchemy Open Question: async SQLAlchemy 2.0 + psycopg3** (scheme `postgresql+psycopg`, not asyncpg). Accounts code is `async`; sits alongside the sync content endpoints in one FastAPI app. Config source is `server.config.database_url()` (per-call `_env`), not pydantic-settings.
- **data** — Postgres accounts schema: **6 tables** (`users`, `tenants`, `tenant_members`, `projects`, `project_credentials`, `auth_tokens`), UUID PKs, tz-aware `created_at`. Ownership via `tenant_members` (no owner column on `tenants`). Only sha256 `token_hash` is stored for credentials/session tokens (raw never persisted). Alembic initial migration `0001_accounts_tenancy`.
- **security** — argon2id password hashing (`argon2-cffi`), sha256-hex token hashing at rest; credential/session **records omit `token_hash`** so hashes never cross the transport boundary. (Cross-tenant data isolation is S4/S5, not yet built.)
- **operations** — New `postgres:17` service in both compose files (local `postgres`, prod `knowledge-postgres` on `changple_shared_network`, `pgdata` volume). Migrations run **explicitly**: `docker compose exec api alembic upgrade head` (not auto-on-boot). **Deployment prerequisite:** the prod box's gitignored `.env` must define `POSTGRES_PASSWORD` (prod `DATABASE_URL` interpolates it) before P10 deploys.

**S2 appended (for REVIEW to consolidate):**
- **api** — New public `/auth/*` session surface (outside `/api/*`, so the content-plane bearer guards never touch it): `POST /auth/signup` → **201** `{token, user, tenant}` (**singular** `tenant`); `POST /auth/login` → **200** `{token, user, tenants:[…]}` (**plural**); `POST /auth/logout` → **204** (idempotent, no auth); `GET /auth/me` → **200** `{user, tenants:[…]}` (`require_user`-guarded). 30-day opaque bearer session tokens. Anti-enumeration: unknown-email and wrong-password return a **byte-identical** `401 {"detail":"invalid email or password"}`; missing/invalid/expired bearer on guarded routes → generic `401 {"detail":"Unauthorized"}` + `WWW-Authenticate: Bearer`. Duplicate signup → `409 {"detail":"a user with this email already exists"}`. Body validation is **FastAPI-native 422** (short password `<8`, malformed email), a deliberate divergence from vocky's Starlette 400-single-string for repo consistency with `/api`. Serializers never emit `password_hash`/`token_hash`.
- **security** — Session bearer tokens are opaque high-entropy (`secrets.token_urlsafe(32)`), stored only as sha256-hex (`auth_tokens.token_hash`); the raw token is returned once at signup/login and never persisted. Login verifies argon2id via `verify_password` (constant-ish, returns False on malformed hash). Generic 401s centralized through `AuthError` + a single app-level `auth_error_handler` so missing/unknown/expired never leak apart. `require_user` best-effort stamps `last_used_at` (failure logged, never fails auth). Content-plane data isolation still deferred to S4/S5.
- **backend** — New `server/auth_api.py` (`APIRouter` mounted via `app.include_router`) + `server/accounts/auth.py` (the reusable `require_user`/`AuthContext`/`AuthError` guard + `extract_bearer_token` + `auth_error_handler`). `server/main.py` gained exactly two wirings after `app = FastAPI(...)`: `include_router(auth_api.router)` and `add_exception_handler(AuthError, auth_error_handler)`. Content routes / write path / lifespan unchanged.

**What S3 (`/app/*`) consumes from S2:**
- Guard: `from server.accounts.auth import require_user, AuthContext, AuthError` — mount S3's routes on an `APIRouter` and gate each handler with `context: AuthContext = Depends(require_user)`, then scope every query to `context.tenant.id`. `require_user` already resolves `tenants[0]` (solo-owner MVP); `AuthError` is already registered on the app (S3 needs **no** new exception handler wiring). FastAPI injects the `Request` into `require_user` automatically under `Depends`.
- Service entrypoint: `from server.accounts.service import get_accounts_service` (call it inside each handler — do **not** cache). S3's project/credential methods already exist on the service (`create_project`, `get_project`, `list_projects_for_tenant`, `create_project_credential`, `list_project_credentials`, `get_active_credential_by_token_hash`, `revoke_credential`, `touch_credential_last_used`).
- `vk_` mint recipe (unchanged from S1 notes): `key=f"vk_{generate_opaque_token()}"`, `token_prefix=key[:12]`, `token_hash=sha256_hex(key)` — return the raw `key` once, persist only the hash. Import these from `server.accounts.security` (not re-exported from the package `__init__`). Keep serializers hash-free.
- Router pattern: don't bloat `main.py` — a `server/app_api.py` `APIRouter` mounted via one `app.include_router(...)` line mirrors S2's `auth_api`. `server/accounts/__init__.py` was left FastAPI-free (the auth guard is imported from `server.accounts.auth` directly), so keep transport imports out of the accounts package `__init__`.

**S3 appended (for REVIEW to consolidate):**
- **api** — New `require_user`-guarded `/app/*` control plane (outside `/api/*`), all scoped to the caller's tenant: `GET /app/tenant` → `{tenant}`; `GET /app/projects` → `{projects:[…]}` (oldest-first); `POST /app/projects` → **201** `{project}` (name required, stripped, non-blank); `GET /app/projects/{project_id}` → `{project}`; `POST /app/projects/{project_id}/credentials` → **201** `{credential, key}` (the raw `vk_` key returned **once** here only); `GET /app/projects/{project_id}/credentials` → `{credentials:[…]}` (metadata only, includes revoked); `DELETE …/credentials/{credential_id}` → **204** (idempotent soft-revoke). Cross-tenant **and** missing project/credential both answer **404** (`"project not found"` / `"credential not found"`) so existence never leaks. Empty credential body still mints (`name=None`). Malformed UUID path / missing / blank project name → FastAPI-native **422**.
- **security** — Per-project ingest credentials are `vk_`-prefixed opaque tokens (`vk_{generate_opaque_token()}`), persisted only as sha256-hex (`project_credentials.token_hash`) + a 12-char display `token_prefix`; the raw key is returned exactly once (on create) and never re-exposed. `serialize_credential` never emits `token_hash`. Cross-tenant project/credential access is denied (404) — the first data-plane-adjacent tenant isolation, though content-plane isolation still lands in S4/S5.
- **backend** — New `server/app_api.py` (`APIRouter` mounted via one `app.include_router(app_api.router)` in `main.py`, mirroring `auth_api`); reuses S2's `require_user` guard + the already-registered `AuthError` handler (no new exception wiring). Built entirely on S1's `AccountsService` (`create_project` / `get_project` / `list_projects_for_tenant` / `create_project_credential` / `list_project_credentials` / `revoke_credential`) — no persistence/security code touched. Content routes / write path / lifespan / `/auth` / `/api` unchanged.

**What S4 (`/api/*` credential auth) consumes from S3:**
- The `projects` table is now the **source-of-truth for project→tenant**: a project row carries `tenant_id`, and `_load_scoped_project` (the 404-both-cases pattern) is the reference guard for tenant-scoped project access to reuse.
- `vk_` keys resolve via `service.get_active_credential_by_token_hash(sha256_hex(key))` → `ProjectCredentialRecord` (active only; revoked/missing → None). The **resolution chain S4 threads onto `/api/*`** is: `vk_` bearer → `sha256_hex` → `get_active_credential_by_token_hash` → `credential.project_id` → `get_project(project_id)` → `project.tenant_id`. That gives S4 both the **tenant** (for content scoping) and the **project** (for the frozen `POST /api/documents` `project` field), derived from the credential — never from a body field.
- Mint recipe is fixed and must match on the resolve side: `token_prefix = key[:12]`, `token_hash = sha256_hex(key)`. Only the hash is stored; S4 resolves against the hash, `KB_API_TOKEN` still maps to tenant #1 (legacy bearer), and session tokens' acceptance on `/api/*` reads remains S4's open question to resolve.

**S4 appended (for REVIEW to consolidate):**
- **api** — `/api/*` now resolves a bearer → tenant in tenant mode (`DATABASE_URL` set): a new `server/api_auth.py` two-mode resolver replaces the read/write guards on the content plane. Tenant mode maps `KB_API_TOKEN` (exact) → the operator's tenant #1 (pinned master, via `KB_OPERATOR_EMAIL`), a `vk_` key → its project's tenant (+project), and a session token → the user's `tenants[0]`; an unresolvable/absent bearer → generic 401 (`WWW-Authenticate: Bearer`). **Legacy mode (`DATABASE_URL` unset) is byte-for-byte the old single-`KB_API_TOKEN` behavior** — `require_bearer`/`require_read_bearer` semantics preserved (open-by-default reads; write no-op when the token is unset). The **frozen `POST /api/documents` 201 shape is unchanged** (only the dependency swapped; `DocumentIn` + response identical). `POST /api/reindex` stays operator-only on `require_bearer` (a `vk_` key gets 401 there), and the read/search surface keeps its `KB_REQUIRE_READ_AUTH` gating in legacy mode.
- **security** — Introduces a pinned, **un-revokable** master bearer (`KB_API_TOKEN` → tenant #1) that is a config special-case, not a DB credential — the tradeoff that keeps the live hi2vi agent working with zero changes; it is unresolvable (401) if `KB_OPERATOR_EMAIL` is unset or the operator user isn't seeded. All tenant-mode 401s are generic (no missing-vs-invalid-vs-unknown leak); tokens are matched by `sha256_hex` at rest (raw never compared to storage except the exact master string). Content-plane cross-tenant data isolation is still **not** built here — the resolver returns the tenant but nothing scopes storage/queries yet (S5).
- **operations** — New deploy prerequisite: `KB_OPERATOR_EMAIL` must be set on the prod box (added to `compose.prod.yml` `api` env, sourced from the box's gitignored `.env` alongside `POSTGRES_PASSWORD`), matching the operator's S6-seeded signup email — otherwise the `KB_API_TOKEN` master bearer is unresolvable. Local `compose.yml` leaves it optional (`${KB_OPERATOR_EMAIL:-}`).

**What S5 (content tenant-scoping) consumes from S4:**
- Every `/api/*` handler now receives `ctx: ApiAuthContext` from `resolve_api_write` (POST/DELETE documents) / `resolve_api_read` (the 6 GET reads). `ApiAuthContext(tenant_id: UUID | None, project_id: UUID | None)`:
  - `ctx.tenant_id is None` ⇒ **legacy single-tenant path** (`DATABASE_URL` unset) — S5 must keep today's un-scoped behavior in this branch (the 65 legacy tests still gate it).
  - `ctx.tenant_id` set ⇒ **tenant mode** — S5 scopes storage + every read/search/list/by-path/by-id/delete query to `tenant_id`, and threads `tenant_id` into `documents.tenant_id` + the namespaced write path + reindex path-derivation (hard coupling #1).
  - `ctx.project_id` is set **only for a `vk_` credential** (its bound project); it is `None` for the master bearer and session tokens. S5 should **not** force the write-path `project` from `ctx.project_id` — the frozen `POST /api/documents` body `project` field stays authoritative and is the project name to select/create **under `ctx.tenant_id`** (S3's `projects` table is the tenant↔project source of truth). `ctx.project_id` is available if S5 wants to cross-check a `vk_` write against its bound project, but the body `project` remains the client-visible contract.
- The resolver is import-only work for S5: `from server.api_auth import ApiAuthContext` is already wired; S5 changes only handler bodies + the content-plane storage/query/reindex layers, never the auth dependency.
- `POST /api/reindex` is intentionally left on `require_bearer` (global operator op); S5 does **not** tenant-scope reindex-the-endpoint, but the reindex **logic** (`server/reindex.py`) must derive `tenant_id` from the file path so a full reindex re-populates `documents.tenant_id` (hard coupling #1).

**S5 appended (for REVIEW to consolidate):**

_Doc-impact one-liners:_
- **data** — `documents` gains `tenant_id TEXT NOT NULL DEFAULT ''` with `UNIQUE (tenant_id, rel_path)` (dropped the old `rel_path UNIQUE` + `UNIQUE(project,date,slug)`); `''` is the legacy / tenant-#1 sentinel, else the tenant UUID. FTS + triggers + `document_embeddings` unchanged (tenant transitive via id/doc_id). A pre-tenancy `kb.sqlite3` is **dropped + recreated** by `init_db` (disposable; the boot reindex repopulates). Non-#1 tenant content lives under a **namespaced `<KB_ROOT>/tenants/<uuid>/` root** (sibling of `docs/`, not published). Reindex re-derives `tenant_id` from the path (docs/ → tenant #1 via `KB_OPERATOR_EMAIL`; `tenants/<uuid>/` → the dir name), so tenant identity survives the disposable-DB rebuild (hard coupling #1 satisfied).
- **architecture/backend** — Per-tenant content root selected in `server/main.py` via `_tenant_root(ctx)` (public → `config.docs_root()`; non-#1 → `tenants/<uuid>/`); `docs_root` is now a per-write parameter, not a constant. Git publish + project landing + Recent index run **only for the public root** (`ctx.is_public`); non-#1 tenants keep a minimal file+DB tree. Bridge additions in `server/api_auth.py`: `ApiAuthContext.is_public` and a cache-on-success `get_tenant_one_id()` (resolves tenant #1 from `KB_OPERATOR_EMAIL`, reused by the master-bearer path, `is_public`, and reindex).
- **api** — Every `/api/*` read/write/search/list/by-path/by-id/delete is tenant-scoped in tenant mode; cross-tenant fetch/delete by id or path → **404**. Legacy mode (`DATABASE_URL` unset) adds **no** filter — byte-identical (65 tests green). The frozen `POST /api/documents` 201 shape is intact for tenant #1. `POST /api/reindex` is now `async` and resolves tenant #1 for the docs/ walk; still operator-only (a `vk_` key → 401).
- **operations** — `/tenants/` added to `.gitignore` (on-box only, never published). `mkdocs.yml` unchanged — the `tenants/` sibling of `docs/` is never in the build. Reindex/boot walk both roots; the vanished-row cleanup is tenant-scoped so one tenant's reindex never deletes another's rows.
- **security** — Content-plane cross-tenant data isolation is now **enforced** (the S4 gap closed): storage, every query, and semantic search are scoped to the resolved tenant; a delete can't cross tenants.

_Known limitation (flag for REVIEW + a deferred job):_ non-#1 tenant content under `tenants/` is **gitignored, on-box-only** — it has **no git backup and no published site** (P10 has no per-tenant sites; P12 owns dashboards). If the box's disk is lost, non-#1 corpora are unrecoverable. **Suggest a deferred backup job** (e.g. periodic off-box snapshot / object-store sync of `tenants/`) before non-#1 tenants carry real data at scale. (Tenant #1 stays safe — its corpus is the git-published `docs/` tree.)

_Open Question resolved (namespaced-root path + mkdocs exclusion):_ the non-published root is **`<KB_ROOT>/tenants/<tenant_uuid>/`**, a sibling of `docs/`. No mkdocs change is needed — the mkdocs `docs_dir` is `docs/`, so a sibling directory is simply never in the build; `RESERVED_DIRS` (a within-`docs/` concept) is untouched. Exclusion mechanism = **physical separation** (different tree) + `.gitignore`, not an mkdocs `exclude_docs` rule.

**What S6 (seed + migrate + smoke) consumes from S5:**
- `get_tenant_one_id()` (in `server/api_auth.py`) resolves tenant #1 from **`KB_OPERATOR_EMAIL` → `get_user_by_email` → `list_tenants_for_user()[0]`**. It caches on first success only, so S6 must **seed the operator user + their tenant before** the `KB_API_TOKEN` master bearer / tenant-#1 reindex is exercised (a boot reindex that runs before seeding stamps `docs/` with `''` and would need a re-reindex after seeding).
- Tenant #1's live corpus already lives in `docs/` unchanged. After S6 seeds the operator user/tenant and creates the 4 live projects' `projects` rows (`bootstrap_agentic_workspace`, `changple5`, `hi2vi_web`, `hi2vi`), a **full reindex with `tenant_one_id` set** (the boot reindex or `POST /api/reindex` once `KB_OPERATOR_EMAIL` resolves) stamps every `docs/` row's `documents.tenant_id` with tenant #1's UUID — no data move, just a re-stamp derived from the path.
- The write/read routing is credential-derived: a tenant-#1 `vk_` (or the master bearer, or the operator's session) is `is_public=True` → writes land in `docs/` and publish via git exactly as today; every other tenant is `is_public=False` → `tenants/<uuid>/`, no git. S6's onboarding smoke should assert a second tenant **cannot** read tenant #1's `docs/` corpus (S5's isolation smoke already proves the mechanism; S6 proves it end-to-end on the seeded/migrated live data).

**S6 completion notes (seed + migrate + smoke shipped — the phase is ready for `P10.REVIEW`):**

- **Delivered:** `server/config.py::operator_password()` (reads `KB_OPERATOR_PASSWORD`, seed-only); NEW `server/seed.py` (`python -m server.seed`, idempotent, Postgres-only, **no `vk_` seeded** — the master bearer covers tenant #1); NEW `scripts/onboarding_smoke.py` (committed post-deploy verifier, `httpx`, `site_smoke.py` collect-all-failures style); `KB_OPERATOR_PASSWORD` env added to `compose.prod.yml` (`${KB_OPERATOR_PASSWORD}`) and `compose.yml` (optional `${KB_OPERATOR_PASSWORD:-}`).
- **Seed shape (confirmed against the real S1 files):** `get_user_by_email` → `create_user(CreateUser(email, password_hash=hash_password(pw)))` (race-safe on `DuplicateEmailError`) → `list_tenants_for_user` / `create_tenant_with_owner(user.id, "<local-part>'s workspace")` (returns `(TenantRecord, TenantMemberRecord)`) → per-project `create_project(CreateProject(tenant_id, name))`. `_discover_projects` = reindex's derivation (`_FILENAME_RE` match, `project = rel.parts[0]`, skip `RESERVED_DIRS` + root-level files); against the real tree it returns exactly `['bootstrap_agentic_workspace.sh', 'changple5', 'hi2vi', 'hi2vi_web']` — `bootstrap_agentic_workspace.sh` keeps its literal `.sh` (matches `documents.project`).
- **E2E proven (ephemeral `postgres:17` + temp `KB_ROOT`, never the real docs/git):** legacy regression **65 pass**; seed **idempotent** (2nd run: user/tenant/all-3-projects "exists", zero new rows, `project_count` unchanged); **tenant-#1 re-stamp** works (seed-first → boot reindex resolved tenant #1 on first try → every `documents.tenant_id` = tenant #1's UUID, path-derived, no file move); **onboarding + isolation smoke PASS** (signup→project→`vk_`→write→scoped-read; tenant B never sees tenant #1 via list/search, by-path→404, master bearer→200). `workflow.py validate` passed.
- **The seed→resolve ordering coupling held in practice:** because the operator user+tenant are seeded **before** the app boots, `get_tenant_one_id()` (cache-on-success-only) resolves tenant #1 on the first boot-reindex call and stamps `docs/` correctly — no re-reindex needed. Seeding *after* a boot would leave `docs/` stamped `''` until the next reindex.

_Doc-impact one-liners (for `P10.REVIEW` to consolidate — do NOT version per slice):_
- **operations** — New idempotent seed CLI `python -m server.seed` (operator user + tenant #1 + a `projects` row per live `docs/` project; Postgres-only, never touches `kb.sqlite3`; **no `vk_`** credential seeded). New deploy prerequisite: the box `.env` must define `KB_OPERATOR_PASSWORD` (alongside `POSTGRES_PASSWORD` / `KB_OPERATOR_EMAIL`), added to `compose.prod.yml` `api` env (optional in local `compose.yml`). `scripts/onboarding_smoke.py` is the committed post-deploy verifier (signup→project→`vk_`→write→scoped-read + cross-tenant isolation). **Deploy/migration runbook (below).**
- **backend** — Idempotent operator/tenant/project seed built on S1's `AccountsService` (`get_user_by_email`/`create_user`/`list_tenants_for_user`/`create_tenant_with_owner`/`list_projects_for_tenant`/`create_project`); tenant #1's project set is **derived from the live `docs/` tree** via reindex's filename rule (`_FILENAME_RE` + `RESERVED_DIRS`, `project = rel.parts[0]`), never hardcoded, so seeded project names line up with `documents.project`. New `config.operator_password()` (seed-only).
- **api / security** — E2E proves the full SaaS onboarding flow (`/auth/signup` → `POST /app/projects` → `vk_` mint → `POST /api/documents` frozen-shape 201 → scoped `GET /api/search`/`/api/documents`) and **cross-tenant content isolation on seeded/migrated data**: a second tenant's `vk_` sees none of tenant #1's corpus (list/search never leak; `by-path` → 404), while the `KB_API_TOKEN` master bearer resolves to tenant #1 and reads its own `docs/` corpus (by-path → 200). The frozen `POST /api/documents` 201 key set is intact.

**Deploy / migration runbook (P10 cutover — the operator's box action; recorded here for `P10.REVIEW` → operations doc):**

1. Provision the box's gitignored `.env`: add `POSTGRES_PASSWORD`, `KB_OPERATOR_EMAIL` (the operator's signup email, **normalized lowercase**), and `KB_OPERATOR_PASSWORD` (new, P10.S6) alongside the existing `KB_API_TOKEN` / `GOOGLE_API_KEY`.
2. `git pull` the box clone.
3. `docker compose -f compose.prod.yml up -d postgres` (wait healthy).
4. `docker compose -f compose.prod.yml exec api alembic upgrade head` (creates the accounts schema; migrations never run on boot).
5. `docker compose -f compose.prod.yml exec api python -m server.seed` (creates the operator user + tenant #1 + the live `docs/` projects; idempotent — safe to re-run).
6. Restart the api (`docker compose -f compose.prod.yml up -d api` / `restart api`) so its boot reindex — with tenant #1 now resolvable — **re-stamps every `docs/` row's `tenant_id` as tenant #1** (a path-derived re-stamp, no file move). Alternatively `POST /api/reindex` with the master bearer. **Seed BEFORE the reindex** (the `get_tenant_one_id` cache-on-success ordering).
7. Verify: `python scripts/onboarding_smoke.py --base-url https://knowledge.hi2vi.com --master-token "$KB_API_TOKEN"` → `PASS` (onboarding + isolation on live data). The live hi2vi content agent needs **zero** changes — `KB_API_TOKEN` still resolves to tenant #1.

_Operational caveat surfaced in S6 testing (flag for `P10.REVIEW`):_ `KB_OPERATOR_EMAIL` **must be set in normalized form (lowercase, no surrounding whitespace).** The seed normalizes the email (`.strip().lower()`, matching `/auth/signup` so the operator can also log in via `/auth/login`), but `server/api_auth.py::get_tenant_one_id()` looks up `KB_OPERATOR_EMAIL` **verbatim** — so a mixed-case/whitespace value leaves the master bearer unresolvable and `docs/` stamped `''` (reproduced in testing with `Operator@Example.com`; fixed by using the lowercase form). A real email is naturally lowercase, so this is a documentation/robustness item, not a blocker. **Possible follow-up (REVIEW's call, not changed in S6 — it is S5 source):** normalize the email inside `get_tenant_one_id()` to make the master-bearer path tolerant of casing.

**P10.F1 (fix, resolves the caveat above):** `get_tenant_one_id()` now normalizes `KB_OPERATOR_EMAIL` (`.strip().lower()`) like the seed / `/auth/signup`, so the `KB_API_TOKEN` master bearer is casing-tolerant (the deploy runbook's "must be lowercase" line becomes a nicety, not a hard requirement) — folds into the existing security/operations doc-impact for `P10.REVIEW`. Verified: 65-test regression green, `workflow.py validate` passed.

**P10 phase status: all six middle slices (S1–S6) complete — the phase is ready for `P10.REVIEW`,** which validates S1–S6 together and consolidates every S1–S6 doc-impact one-liner (architecture / backend / data / api / security / operations / decisions) into new doc versions. `doc-new-version` is REVIEW's job — S6 did not version docs.

## Constraints

- **Single uvicorn worker preserved** — the content `WRITE_LOCK` is an in-process lock; never scale to multiple workers. Postgres (async) sits alongside but does not change this.
- **Frozen `POST /api/documents` contract is additive-only** (see api.md §"Frozen consumer contract (P8)"): no new required fields, tenant never a body field, tenant #1's `url`/`rel_path` shapes unchanged, only additive response fields.
- **Content stays files-canonical + disposable SQLite** — no invariant inversion, no per-tenant git repos.
- **No per-tenant public sites in P10** — dashboards are P12; per-tenant published sites are out of scope here.
- **Tenant #1 (live hi2vi corpus) must keep working with zero client changes** — `KB_API_TOKEN` remains valid and resolves to tenant #1.

## Open Questions

- **Async vs sync SQLAlchemy integration shape** — resolve in **S1**. Single worker means no async-throughput requirement; pick the simpler clean integration (async-in-sync-app vs sync+psycopg). Integration-shape call, not a product fork.
- **Exact namespaced-root path + mkdocs exclusion mechanism** — **RESOLVED (S5):** non-published root is `<KB_ROOT>/tenants/<tenant_uuid>/`, a sibling of `docs/`; excluded by physical separation (outside `docs_dir`) + `/tenants/` in `.gitignore`, so **no `mkdocs.yml`/`RESERVED_DIRS` change is needed**. See the S5-appended block above.
- **Whether session tokens are accepted on `/api/*` reads** — resolve in **S4** (session token → `tenants[0]` for own-corpus reads vs `vk_`/`KB_API_TOKEN` only).
