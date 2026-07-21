# P10.S1 — plan (orchestrator → slice-executor-high)

You are implementing **P10.S1 — Accounts persistence (Postgres + async SQLAlchemy 2.0 + Alembic + accounts
layer)**, the foundational slice of phase P10. Read `works/phases/active/P10/phase.md` first for the phase-wide
context (two-plane architecture, the two hard couplings, decisions). This slice is a **faithful port** of the
sibling `vocky` repo's accounts stack into `server/`.

**Scope boundary — do exactly this and no more:**
- ADD: the Postgres accounts datastore (6 tables), the `AccountsService` layer, Alembic, config + compose wiring.
- DO NOT add any HTTP endpoints (`/auth` is S2, `/app` is S3), do NOT touch `server/main.py`'s content routes or
  write path, do NOT add `documents.tenant_id` (S5), do NOT seed/migrate the live corpus (S6).
- The existing content plane (files + `kb.sqlite3` + `WRITE_LOCK` + single worker) must keep booting **without**
  Postgres and its existing tests must still pass.
- You do NOT commit and do NOT transition slice/phase status. Write `result.md`, append notes to `phase.md`,
  return a verdict. The orchestrator validates, finishes, and commits.

Port targets are under `/Users/sugang/projects/personal/vocky/` — you may Read them directly to copy verbatim.
Below, "PORT" = copy vocky's file with only the adaptation deltas noted; verbatim blocks are given inline.

---

## Decisions already made (do not re-litigate)

- **Async SQLAlchemy 2.0 + psycopg3** (scheme `postgresql+psycopg`, **not** asyncpg). Accounts code is `async`.
- **Lazy engine** — created on first use, disposed in `lifespan`; app boots fine when `DATABASE_URL` is unset.
- **Config in the repo's idiom** — a `database_url()` accessor in `server/config.py` (per-call `_env`), NOT
  pydantic-settings. This is the one substantive deviation from vocky (which uses `get_settings().database_url`):
  everywhere vocky reads `get_settings().database_url`, you read `server.config.database_url()`.
- **Bare deps** in `pyproject.toml` (repo convention; only `google-genai` is pinned) → `uv lock`.
- **Migrations run explicitly** (`alembic upgrade head`), not auto-on-boot.

---

## 1. `server/persistence/base.py` (NEW — verbatim from `vocky/src/vocky/persistence/base.py`)

```python
from sqlalchemy import MetaData
from sqlalchemy.orm import DeclarativeBase

NAMING_CONVENTION = {
    "ix": "ix_%(column_0_label)s",
    "uq": "uq_%(table_name)s_%(column_0_name)s",
    "ck": "ck_%(table_name)s_%(constraint_name)s",
    "fk": "fk_%(table_name)s_%(column_0_name)s_%(referred_table_name)s",
    "pk": "pk_%(table_name)s",
}


class Base(DeclarativeBase):
    metadata = MetaData(naming_convention=NAMING_CONVENTION)
```

## 2. `server/persistence/models.py` (NEW — PORT the SIX accounts tables from `vocky/src/vocky/persistence/models.py`)

Copy **only** `UserModel`, `TenantModel`, `TenantMemberModel`, `ProjectModel`, `ProjectCredentialModel`,
`AuthTokenModel`. **EXCLUDE** the three feedback models and their `JSONB`/`ARRAY`/GIN imports. Keep the
module-level `def utc_now() -> datetime: return datetime.now(UTC)`. Import `Base` from `server.persistence.base`.

Uniform patterns (verbatim):
```python
id: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True, default=uuid4)
created_at: Mapped[datetime] = mapped_column(
    DateTime(timezone=True), nullable=False,
    default=utc_now, server_default=text("CURRENT_TIMESTAMP"),
)
```
Columns per table (all `id`/`created_at` as above):
- **users**: `email` Text NOT NULL unique; `password_hash` Text NOT NULL. (no `__table_args__`)
- **tenants**: `name` Text NOT NULL. (no owner column)
- **tenant_members**: `tenant_id` FK→tenants.id CASCADE NOT NULL; `user_id` FK→users.id CASCADE NOT NULL; `role`
  Text NOT NULL. `__table_args__ = (UniqueConstraint("tenant_id","user_id"), Index("ix_tenant_members_tenant_id",
  "tenant_id"), Index("ix_tenant_members_user_id","user_id"))`.
- **projects**: `tenant_id` FK→tenants.id CASCADE NOT NULL; `name` Text NOT NULL. `__table_args__ =
  (Index("ix_projects_tenant_id","tenant_id"),)`.
- **project_credentials**: `project_id` FK→projects.id CASCADE NOT NULL; `name` Text NULLABLE; `token_prefix`
  Text NOT NULL; `token_hash` Text NOT NULL unique; `last_used_at` DateTime(tz) NULLABLE; `revoked_at`
  DateTime(tz) NULLABLE. `__table_args__ = (Index("ix_project_credentials_project_id","project_id"),)`.
- **auth_tokens**: `user_id` FK→users.id CASCADE NOT NULL; `token_hash` Text NOT NULL unique; `expires_at`
  DateTime(tz) NULLABLE; `last_used_at` DateTime(tz) NULLABLE. `__table_args__ =
  (Index("ix_auth_tokens_user_id","user_id"),)`.

Imports needed: `from sqlalchemy import DateTime, ForeignKey, Index, Text, UniqueConstraint, text` /
`from sqlalchemy.dialects.postgresql import UUID as PG_UUID` / `from sqlalchemy.orm import Mapped, mapped_column`
/ stdlib `datetime`, `UUID`, `uuid4`.

## 3. `server/persistence/engine.py` (NEW — PORT `vocky/src/vocky/db.py`, one delta)

Lazy singletons; the ONLY change from vocky is the URL source:
```python
from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession, async_sessionmaker, create_async_engine
from server import config

_engine: AsyncEngine | None = None
_session_maker: async_sessionmaker[AsyncSession] | None = None

def get_engine() -> AsyncEngine:
    global _engine
    if _engine is None:
        url = config.database_url()
        if not url:
            raise RuntimeError("DATABASE_URL is not set; the accounts plane is unavailable")
        _engine = create_async_engine(url, pool_pre_ping=True)
    return _engine

def get_session_maker() -> async_sessionmaker[AsyncSession]:
    global _session_maker
    if _session_maker is None:
        _session_maker = async_sessionmaker(get_engine(), expire_on_commit=False)
    return _session_maker

async def dispose_engine() -> None:
    global _engine, _session_maker
    if _engine is not None:
        await _engine.dispose()
    _engine = None
    _session_maker = None
```

## 4. `server/accounts/security.py` (NEW — verbatim from `vocky/src/vocky/accounts/security.py`)

```python
import hashlib
import secrets
from argon2 import PasswordHasher
from argon2.exceptions import InvalidHashError, VerifyMismatchError

_password_hasher = PasswordHasher()

def hash_password(password: str) -> str:
    return _password_hasher.hash(password)

def verify_password(password_hash: str, password: str) -> bool:
    try:
        return _password_hasher.verify(password_hash, password)
    except (VerifyMismatchError, InvalidHashError):
        return False

def generate_opaque_token() -> str:
    return secrets.token_urlsafe(32)

def sha256_hex(raw: str) -> str:
    return hashlib.sha256(raw.encode()).hexdigest()
```

## 5. `server/accounts/types.py` (NEW — PORT `vocky/src/vocky/accounts/types.py`)

`@dataclass(slots=True, kw_only=True)` on every one. No ORM types cross this boundary. Fields:
- `CreateUser{email, password_hash}` · `UserRecord{id, email, password_hash, created_at}` (**carries**
  password_hash) · `TenantRecord{id, name, created_at}` · `TenantMemberRecord{id, tenant_id, user_id, role,
  created_at}` · `CreateProject{tenant_id, name}` · `ProjectRecord{id, tenant_id, name, created_at}` ·
  `CreateProjectCredential{project_id, token_prefix, token_hash, name=None}` · `ProjectCredentialRecord{id,
  project_id, name, token_prefix, created_at, last_used_at, revoked_at}` (**omits** token_hash) ·
  `CreateAuthToken{user_id, token_hash, expires_at=None}` · `AuthTokenRecord{id, user_id, created_at, expires_at,
  last_used_at}` (**omits** token_hash). No `CreateTenant`/`CreateTenantMember` (tenant writes take bare args).

## 6. `server/accounts/repository.py` (NEW — PORT `vocky/src/vocky/accounts/repository.py`)

`AccountsRepository(session: AsyncSession)`; every write does `session.add` → `await session.flush()` →
`await session.refresh()` → return a `*Record` via private `_to_*_record` mappers; **never commits**. Port all
methods vocky has (create_user, create_tenant, add_tenant_member, create_project, create_project_credential,
create_auth_token, get_user_by_email, get_user_by_id, get_tenant, get_project, list_tenants_for_user,
list_projects_for_tenant, list_project_credentials, get_active_auth_token_by_hash,
get_active_credential_by_token_hash, revoke_credential, delete_auth_token, touch_*_last_used). The two
scope-critical queries verbatim:
```python
# active session token — NULL expires_at = no expiry
select(AuthTokenModel).where(
    AuthTokenModel.token_hash == token_hash,
    (AuthTokenModel.expires_at.is_(None)) | (AuthTokenModel.expires_at > now),
)
# active credential — non-revoked only
select(ProjectCredentialModel).where(
    ProjectCredentialModel.token_hash == token_hash,
    ProjectCredentialModel.revoked_at.is_(None),
)
```
`list_tenants_for_user` = `select(TenantModel).join(TenantMemberModel, ...).where(user_id==...).order_by(
created_at, id)` → tuple. Import `utc_now` from `server.persistence.models`.

## 7. `server/accounts/service.py` (NEW — PORT `vocky/src/vocky/accounts/service.py`, one delta)

`AccountsService(session_maker: async_sessionmaker[AsyncSession])`. Each method opens `async with
self._session_maker() as session`, builds `AccountsRepository(session)`, `await session.commit()` on writes
(rollback + raise on error), reads rollback + raise on `SQLAlchemyError`. Errors:
`AccountsPersistenceError(RuntimeError)`, `AccountsReadError(RuntimeError)`,
`DuplicateEmailError(AccountsPersistenceError)`. `create_user` catches `IntegrityError` **before**
`SQLAlchemyError` → `DuplicateEmailError`. `create_tenant_with_owner(user_id, name)` is atomic (create_tenant +
add_tenant_member role="owner", one commit) → `tuple[TenantRecord, TenantMemberRecord]`. **Delta:** the factory
reads our engine module:
```python
from server.persistence.engine import get_session_maker
def get_accounts_service() -> AccountsService:
    return AccountsService(get_session_maker())
```

## 8. `server/accounts/__init__.py` (NEW) — re-export the 15 public names

From `service`: `AccountsService, AccountsPersistenceError, AccountsReadError, DuplicateEmailError,
get_accounts_service`. From `types`: `CreateUser, UserRecord, TenantRecord, TenantMemberRecord, CreateProject,
ProjectRecord, CreateProjectCredential, ProjectCredentialRecord, CreateAuthToken, AuthTokenRecord`. `__all__`
lists all 15. Do NOT export `security`/`repository`.

## 9. Alembic (NEW, repo root — PORT vocky's async setup)

- `alembic.ini`: `script_location = %(here)s/alembic`, `prepend_sys_path = .`, placeholder
  `sqlalchemy.url = postgresql+psycopg://placeholder:placeholder@localhost/placeholder`, standard logging.
- `alembic/env.py` (**async**): port `vocky/alembic/env.py` — `async_engine_from_config(..., poolclass=NullPool)`
  + `connection.run_sync(do_run_migrations)` + `asyncio.run(run_async_migrations())`; `compare_type=True`;
  `target_metadata = Base.metadata` from `server.persistence.base`; `import server.persistence.models` (side
  effect, `# noqa: F401`). **Delta:** URL from `config.set_main_option("sqlalchemy.url",
  config_database_url().replace("%","%%"))` where `config_database_url` = `server.config.database_url()` (raise a
  clear error if unset).
- `alembic/script.py.mako` (standard).
- `alembic/versions/0001_accounts_tenancy.py`: `revision="0001_accounts_tenancy"`, `down_revision=None`. Create
  the 6 tables **parent-first** (users → tenants → tenant_members → projects → project_credentials → auth_tokens)
  with named `op.f(...)` constraints matching the naming convention; columns use **generic `sa.UUID()`** (no
  server default on `id`), `created_at` gets `server_default=sa.text("CURRENT_TIMESTAMP")`. `downgrade()` drops
  children-first (auth_tokens → project_credentials → projects → tenant_members → tenants → users), dropping each
  table's indexes first. (Model this on vocky's `20260715_1200_add_accounts_tenancy.py` but with
  `down_revision=None` since this is our first migration.)

## 10. Config + lifespan

- `server/config.py`: add, in the existing per-call style:
  ```python
  def database_url() -> str | None:
      """Async SQLAlchemy URL for the Postgres accounts plane. Unset -> accounts dormant."""
      return _env("DATABASE_URL")
  ```
- `server/main.py` `lifespan`: import `from server.persistence.engine import dispose_engine`; after the `yield`
  add `await dispose_engine()`. Do NOT create the engine at startup (stays lazy) and do NOT run migrations here.

## 11. Deps (`pyproject.toml` + `uv lock`)

Add bare names to `[project].dependencies`: `sqlalchemy`, `psycopg[binary]`, `alembic`, `argon2-cffi`,
`greenlet` (greenlet is a hard async-SQLAlchemy requirement — do not omit). Then run `uv lock` to refresh
`uv.lock`. The Dockerfile needs NO change (generic `uv export --frozen | uv pip install --system`; all wheels).

## 12. Compose

- `compose.yml` (local): add service
  ```yaml
    postgres:
      image: postgres:17
      environment:
        POSTGRES_DB: ${POSTGRES_DB:-kb}
        POSTGRES_USER: ${POSTGRES_USER:-kb}
        POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-kb}
      healthcheck:
        test: ["CMD-SHELL", "pg_isready -U $$POSTGRES_USER -d $$POSTGRES_DB"]
        interval: 5s
        timeout: 5s
        retries: 12
      volumes:
        - pgdata:/var/lib/postgresql/data
      restart: unless-stopped
  ```
  Add a top-level `volumes:` block with `pgdata:` (the file's first). On `api` add
  `depends_on: {postgres: {condition: service_healthy}}` and (map style, matching the file)
  `DATABASE_URL: postgresql+psycopg://kb:kb@postgres:5432/kb`.
- `compose.prod.yml`: add a durable `postgres:17` service — `container_name: knowledge-postgres`, on
  `networks: [changple_shared_network]`, `volumes: [pgdata:/var/lib/postgresql/data]`, `pg_isready` healthcheck,
  `restart: unless-stopped`, password from the gitignored `.env` (`POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}` + add
  `POSTGRES_DB`/`POSTGRES_USER` literals or `.env`). On `api` add `depends_on` + `DATABASE_URL:
  postgresql+psycopg://kb:${POSTGRES_PASSWORD}@knowledge-postgres:5432/kb`. Add a top-level `volumes: {pgdata:}`
  block (the file's first). `.gitignore` unchanged. Record in `phase.md` that the box needs `POSTGRES_PASSWORD`
  in its `.env` (a P10 deployment prerequisite for later slices).

## Verification (run these; report results in `result.md`)

1. `uv lock` succeeds; `uv.lock` gains sqlalchemy/psycopg/alembic/argon2-cffi/greenlet.
2. `docker compose up -d postgres api` → postgres healthy; then `docker compose exec api alembic upgrade head`
   → `docker compose exec postgres psql -U kb -d kb -c '\dt'` shows all six tables + `alembic_version`.
3. **Terse async smoke** with `DATABASE_URL` set (a small standalone `asyncio.run(...)` script, e.g.
   `scripts/accounts_smoke.py`, run inside the api container — avoid adding pytest-asyncio unless you judge a real
   test cheaper): `create_user` → `create_tenant_with_owner` → read back (`get_user_by_email`,
   `list_tenants_for_user`); assert `verify_password` True, duplicate email → `DuplicateEmailError`, and
   `ProjectCredentialRecord`/`AuthTokenRecord` expose no `token_hash`. Keep it minimal.
4. **No regression:** with `DATABASE_URL` unset the app still boots (engine never created), `GET /healthz` 200,
   existing content tests pass. (Run the existing test suite.)
5. `python3 scripts/workflow.py validate`.

## Finish

Write `result.md` (what you built, the verification output incl. `\dt` + smoke result, any deviations). Append
durable notes to `phase.md` — especially: any Doc-impact one-liners (architecture: Postgres control plane added;
backend: async accounts layer; data: 6-table schema; operations: Postgres service + `alembic upgrade head` +
`POSTGRES_PASSWORD` box prerequisite), and anything S2 needs (the exact `AccountsService` method names + the
`get_accounts_service()` entrypoint). Do NOT run `doc-new-version` (that is P10.REVIEW). Return a structured
verdict: `done` when the schema + `AccountsService` exist and verification passes; `escalate`/`blocked`/
`needs_operator` with findings otherwise.
