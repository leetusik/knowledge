# Plan — P19.S1 "Backend visibility core: projects.visibility migration + PATCH toggle"

Operator-approved 2026-07-22 (do-whole-phase, manual gate). Executor tier: `slice-executor-mid` (risk `medium`).

Read `works/phases/active/P19/phase.md` first (Findings & Notes carry the phase's design stances; Constraints carry the parity rules). This slice is the data foundation for P19: per-project visibility in **Postgres only**, plumbed through the accounts layer, plus a session-gated toggle endpoint. It does NOT touch the SQLite content plane, any anonymous/optional-identity path, the graph, the web app, or the save-url — those are later slices.

## Changes (decisions pinned; follow the cited idioms)

1. **Migration `alembic/versions/0004_project_visibility.py`**
   - `revision = "0004_project_visibility"`, `down_revision = "0003_org_level_credentials"`; imports/structure copied from `0003_org_level_credentials.py` (`from collections.abc import Sequence`, `import sqlalchemy as sa`, `from alembic import op`).
   - Upgrade: single-step `op.add_column("projects", sa.Column("visibility", sa.Text(), nullable=False, server_default=sa.text("'private'")))` — constant default, so 0003's two-phase backfill pattern is unnecessary. Downgrade: `op.drop_column("projects", "visibility")`.
   - **No DB CHECK constraint** — codebase pattern is app-layer validation (see `UsageEventModel` docstring `server/persistence/models.py:191-194`; no `create_check_constraint` exists in any migration).
   - Root-only: `alembic/` is not mirrored in the plugin template (absent from `plugin/templates/manifest.json`).

2. **Model — `server/persistence/models.py` (`ProjectModel`, :87-108)**
   - Add `visibility: Mapped[str] = mapped_column(Text, nullable=False, default="private", server_default=text("'private'"))`.
   - Python-side `default` so ORM inserts get it; `server_default` so the tests' `Base.metadata.create_all` schema matches the migration.

3. **Types — `server/accounts/types.py` (:53-68)**
   - `CreateProject` gains `visibility: str = "private"` (defaulted — `provision_signup` at `service.py:156-158` and `get_or_create_project` stay untouched and keep creating private rows).
   - `ProjectRecord` gains `visibility: str` (required; its only constructor `_to_project_record` is updated below).

4. **Repository — `server/accounts/repository.py`**
   - `create_project` (:114-121): pass `visibility=payload.visibility` into `ProjectModel(...)`.
   - `_to_project_record` (:341-347): map `visibility=model.visibility`.
   - New `async def set_project_visibility(self, project_id: UUID, visibility: str) -> ProjectRecord | None` modeled on the `revoke_credential` load-mutate-flush-refresh idiom (:231-244); return `None` when the row is missing; no commit (service owns the transaction).

5. **Service — `server/accounts/service.py`**
   - New `set_project_visibility` wrapper copying the `revoke_credential` envelope (:357-374): `async with self._session_maker() as session`, commit, `SQLAlchemyError → AccountsPersistenceError`.

6. **API — `server/app_api.py`**
   - `serialize_project` (:66-74): add `"visibility": record.visibility`.
   - New `SetProjectVisibilityInput(BaseModel)` with `visibility: Literal["private", "public"]` (precedent: `format: Literal["md","html"]` in `server/main.py:385`; import `Literal` as needed).
   - New `@router.patch("/app/projects/{project_id}")` (first PATCH route in the codebase — fine): `project_id: UUID`, `payload: SetProjectVisibilityInput`, `ctx: AuthContext = Depends(require_user)`; reuse `_load_scoped_project` (:99-109) for the 404-never-403 cross-tenant guard; call the service; return `{"project": serialize_project(updated)}`. Invalid values → FastAPI's built-in 422.
   - Check `server/auth_api.py` (signup response; `serialize_tenant` is at :195): if the signup body serializes the project through its own dict rather than `serialize_project`, add the `visibility` key there too for consistency.

7. **Tests — terse, in `tests/test_accounts_provisioning.py`** (modeled on `test_org_credentials.py:155-164` signup→act→assert; suites are Postgres-gated per-file via `KB_TEST_DATABASE_URL`/`DATABASE_URL`, skip cleanly otherwise; schema comes from `create_all`, no alembic run in tests):
   1. After signup, `/app/projects` and `GET /app/projects/{id}` show `visibility: "private"`.
   2. `PATCH /app/projects/{id}` → `{"visibility": "public"}` returns 200 with `visibility: "public"`; PATCH back to private works.
   3. PATCH a random UUID → 404.
   4. PATCH an invalid value → 422.

8. **Parity (CI-gated)** — byte-mirror every non-migration edit to `plugin/templates/kb/<same relative path>`: `server/persistence/models.py`, `server/accounts/types.py`, `server/accounts/repository.py`, `server/accounts/service.py`, `server/app_api.py`, `tests/test_accounts_provisioning.py`, plus `server/auth_api.py` if touched (verify its manifest entry; the server tree is mirrored). Then `python3 scripts/plugin_parity.py` must print `PASS — plugin templates are in parity with the repo.`

## Validation (run, report honestly in result.md)

- `python3 scripts/plugin_parity.py` → the PASS line.
- `pytest tests/test_accounts_provisioning.py tests/test_org_credentials.py` — attempt a real run: if no Postgres DSN is set, look for the dev Postgres (root `compose.yml` / `make dev`) and set `KB_TEST_DATABASE_URL` accordingly; if genuinely unavailable, report the suites as SKIPPED explicitly (never claim green) and at minimum run `python3 -c "import server.app_api, server.accounts.service, server.accounts.repository"` and `python3 -m py_compile alembic/versions/0004_project_visibility.py`.
- Do not run `alembic upgrade` against any live database — prod migration is P19.S5's operator-gated job.

## Wrap-up

- Append to `works/phases/active/P19/phase.md` under Findings & Notes: a one-line cross-slice note that `ProjectRecord`/`serialize_project` now carry `visibility` (S2 reads it for the public-name set; S3 surfaces it), plus a one-line **Doc impact** note (api.md/backend.md: `/app/projects` gains `visibility` + `PATCH /app/projects/{project_id}`; projects default private).
- Write `works/phases/active/P19/slices/P19.S1/result.md` from scratch: what changed (files), validation outcomes (exact), deviations.
- Return the structured verdict. Never commit; never transition slice/phase status; never touch `docs/`.
