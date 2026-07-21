# P10.S1 — result

Accounts persistence stood up: Postgres control plane (6 tables) + async SQLAlchemy 2.0
+ Alembic + the vocky-ported accounts layer (security/types/repository/service), wired
into config, the app lifespan, and both compose files. Faithful port of vocky's accounts
stack with only the plan's noted deltas. No HTTP endpoints, no `documents.tenant_id`, no
corpus seed — those are S2–S6.

## What was built

**Persistence (`server/persistence/`)** — new package
- `base.py` — verbatim `NAMING_CONVENTION` + `Base(DeclarativeBase)` (stable Alembic names).
- `models.py` — the SIX accounts tables (`UserModel`, `TenantModel`, `TenantMemberModel`,
  `ProjectModel`, `ProjectCredentialModel`, `AuthTokenModel`) + `utc_now()`. Excluded the
  three vocky feedback tables and all `JSONB`/`ARRAY`/GIN imports. UUID PKs, tz-aware
  `created_at` with `server_default=CURRENT_TIMESTAMP`.
- `engine.py` — lazy async singletons (`get_engine`/`get_session_maker`/`dispose_engine`);
  the only delta from vocky is the URL source: `config.database_url()`. `DATABASE_URL`
  unset → `get_engine()` raises `RuntimeError` (accounts dormant), engine never created.

**Accounts (`server/accounts/`)** — new package
- `security.py` — verbatim: argon2id `hash_password`/`verify_password`,
  `generate_opaque_token` = `secrets.token_urlsafe(32)`, `sha256_hex`.
- `types.py` — `@dataclass(slots=True, kw_only=True)` transport records; `UserRecord`
  carries `password_hash`; `ProjectCredentialRecord`/`AuthTokenRecord` **omit** `token_hash`.
- `repository.py` — sole ORM boundary, `add → flush → refresh → *Record`, never commits.
  Both scope-critical queries ported verbatim (active session token = NULL-or-future
  `expires_at`; active credential = `revoked_at IS NULL`).
- `service.py` — owns transactions + domain errors (`AccountsPersistenceError`,
  `AccountsReadError`, `DuplicateEmailError`); `create_user` catches `IntegrityError`
  before `SQLAlchemyError`; `create_tenant_with_owner` atomic (tenant + owner member, one
  commit). Factory `get_accounts_service()` reads `server.persistence.engine.get_session_maker`.
- `__init__.py` — re-exports the 15 public names (service errors + service + factory + 10
  types); `security`/`repository` intentionally not exported.

**Alembic (repo root)** — new
- `alembic.ini` (placeholder psycopg3 URL, `script_location=%(here)s/alembic`,
  `prepend_sys_path=.`, standard logging), `alembic/env.py` (async; URL from
  `server.config.database_url()`, raises if unset; `compare_type=True`;
  `target_metadata=Base.metadata`; imports models for side-effect), `alembic/script.py.mako`,
  `alembic/versions/0001_accounts_tenancy.py` (`down_revision=None`, 6 tables parent-first,
  named `op.f(...)` constraints, generic `sa.UUID()`, children-first downgrade).

**Wiring**
- `server/config.py` — added `database_url()` (per-call `_env("DATABASE_URL")`).
- `server/main.py` — imported `dispose_engine`; `await dispose_engine()` after the lifespan
  `yield`. No engine created at startup (stays lazy); no migrations on boot.
- `pyproject.toml` — added bare `sqlalchemy`, `psycopg[binary]`, `alembic`, `argon2-cffi`,
  `greenlet`; `uv lock` refreshed.
- `compose.yml` — new `postgres:17` service (kb/kb/kb defaults, `pg_isready` healthcheck,
  `pgdata` volume), `api` gains `depends_on: postgres healthy` +
  `DATABASE_URL: postgresql+psycopg://kb:kb@postgres:5432/kb`, top-level `volumes: {pgdata}`.
- `compose.prod.yml` — durable `postgres:17` (`container_name: knowledge-postgres`, on
  `changple_shared_network`, `pgdata` volume, `pg_isready` healthcheck), `api` gains
  `depends_on` + `DATABASE_URL: postgresql+psycopg://kb:${POSTGRES_PASSWORD}@knowledge-postgres:5432/kb`,
  top-level `volumes: {pgdata}`. Password from the box's gitignored `.env`.

## Verification (all run in-environment; Docker WAS available)

1. **`uv lock`** — resolved 48 packages; added `sqlalchemy 2.0.51`, `psycopg 3.3.4` +
   `psycopg-binary`, `alembic 1.18.5`, `argon2-cffi 25.1.0`, `greenlet 3.5.3` (+ mako,
   markupsafe, tzdata). Confirmed present in `uv.lock`. **PASS**
2. **Import/structural sanity** (`uv run python -c ...`, no DB): 6 tables registered on
   `Base.metadata` (no feedback tables); `accounts.__all__` has 15 names; `database_url()`
   None when unset; `get_engine()` raises `RuntimeError` while dormant; argon2 round-trip
   (True/False) + `sha256_hex` 64 hex + opaque token; `ProjectCredentialRecord`/
   `AuthTokenRecord` have no `token_hash` field. **PASS**
3. **Boot without Postgres** — `TestClient(app)` (full lifespan startup→yield→
   `dispose_engine`) with `DATABASE_URL` unset: `GET /healthz` → 200; engine never created
   (`engine._engine is None` after shutdown), clean dispose. **PASS**
4. **Existing test suite** — `uv run pytest -q` → **65 passed**, 1 pre-existing
   Starlette/httpx deprecation warning. No regression. **PASS**
5. **`docker compose up -d --build postgres api`** — image built (all wheels), postgres
   healthy, api up; `GET :8766/healthz` → 200 with `DATABASE_URL` set (`documents:7`). **PASS**
6. **`docker compose exec api alembic upgrade head`** → applied `0001_accounts_tenancy`;
   `psql -U kb -d kb -c '\dt'` shows all six tables + `alembic_version` (7 relations).
   Downgrade→base drops all 6 children-first (no FK errors, 0 tables) and re-upgrade
   recreates 6 — clean round-trip. **PASS**
7. **Async accounts smoke** (standalone `asyncio.run`, piped into the api container via
   stdin — see Deviations): `create_user` + `verify_password` (True/False),
   `create_tenant_with_owner` (role=owner), `get_user_by_email` + `list_tenants_for_user`,
   duplicate email → `DuplicateEmailError`, project + `vk_` credential and session token
   with active-by-hash lookup, and both records assert-free of `token_hash`. Printed
   `ACCOUNTS SMOKE PASSED`. **PASS**
8. **`docker compose -f compose.prod.yml config`** (temporary dummy `.env`, then removed) —
   VALID; `DATABASE_URL` interpolates the password to
   `postgresql+psycopg://kb:<secret>@knowledge-postgres:5432/kb`; postgres service wired to
   `changple_shared_network`. **PASS**
9. **`python3 scripts/workflow.py validate`** → "Workflow validation passed." **PASS**

**No Postgres-dependent step was gapped** — Docker was available, so alembic upgrade, the
`\dt` schema check, and the async accounts smoke all ran against a real `postgres:17`. Docker
resources I created (postgres + api containers, `knowledge_pgdata` volume) were torn down
afterward; the pre-existing `kb` site container was left untouched.

## Deviations from plan

- **Smoke not left as a repo file.** The plan suggested `scripts/accounts_smoke.py`. To honor
  the "keep test files small / lightweight verification" hard rule I ran the equivalent smoke
  by piping it into the api container over stdin (`docker compose exec -T api python - < smoke.py`)
  rather than committing a throwaway script. The full E2E onboarding smoke is S6's job; nothing
  smoke-related is left in the repo.
- **Migration `Create Date`** is a fixed placeholder (`2026-07-16 00:00:00`) since the file was
  hand-authored, not `alembic revision --autogenerate`.
- **Extra confidence check** (not required by the plan): ran an alembic downgrade→base→upgrade→head
  round-trip to prove the children-first `downgrade()` ordering. No code impact.

Otherwise the port matches the plan exactly (module paths under `server/`, `config.database_url()`
as the sole URL source, bare deps, lazy engine, explicit migrations).
