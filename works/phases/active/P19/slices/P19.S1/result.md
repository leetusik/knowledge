# Result — P19.S1 "Backend visibility core: projects.visibility migration + PATCH toggle"

Status: **done**. Executed to plan; no deviations that change the design.

## What changed

Per-project visibility (`"private"` default / `"public"`) plumbed through the accounts
layer in Postgres, plus a session-gated toggle endpoint. No SQLite content plane,
anonymous/optional-identity path, graph, web, or save-url touched (those are later slices).

**Migration (root-only, not mirrored):**
- `alembic/versions/0004_project_visibility.py` — new. `revision = "0004_project_visibility"`,
  `down_revision = "0003_org_level_credentials"`. Upgrade: single-step
  `op.add_column("projects", sa.Column("visibility", sa.Text(), nullable=False, server_default=sa.text("'private'")))`
  (constant default → no two-phase backfill). Downgrade: `op.drop_column`. No DB CHECK
  (app-layer validation, matching the `usage_events` convention). **Not applied to any
  database** — prod apply is P19.S5's operator-gated `alembic upgrade head`.

**Mirrored server/test edits (repo + `plugin/templates/kb/<same path>`, byte-identical):**
- `server/persistence/models.py` — `ProjectModel.visibility` (`Mapped[str]`, `Text`, `nullable=False`,
  `default="private"`, `server_default=text("'private'")`).
- `server/accounts/types.py` — `CreateProject.visibility: str = "private"` (defaulted, so
  `provision_signup`/`get_or_create_project` stay untouched and keep creating private rows);
  `ProjectRecord.visibility: str` (required).
- `server/accounts/repository.py` — `create_project` passes `visibility=payload.visibility`;
  `_to_project_record` maps `visibility=model.visibility`; new
  `async def set_project_visibility(project_id, visibility) -> ProjectRecord | None`
  (revoke_credential load-mutate-flush-refresh idiom; no commit; `None` when missing).
- `server/accounts/service.py` — new `set_project_visibility` wrapper (revoke_credential
  envelope: session, commit, `SQLAlchemyError → AccountsPersistenceError`).
- `server/app_api.py` — `serialize_project` gains `"visibility"`; imports `Literal`; new
  `SetProjectVisibilityInput(visibility: Literal["private","public"])`; new
  `@router.patch("/app/projects/{project_id}")` — `require_user`, reuses `_load_scoped_project`
  (404 missing/cross-tenant), calls the service, returns `{"project": serialize_project(updated)}`.
  Invalid value → 422 from the `Literal`.
- `server/auth_api.py` — its mirrored `serialize_project` (byte-mirror of app_api's) gains
  `"visibility"` too, so the signup response's `project` carries it.
- `tests/test_accounts_provisioning.py` — four terse cases added (below).

## Validation (exact outcomes)

Ran against a **disposable** throwaway Postgres 17 container (`localhost:55432`, DB reset to a
clean schema); the model's `server_default` makes `Base.metadata.create_all` byte-equal to the
migration, so no alembic run was needed (and none was performed — per the hard rule).

- `python3 scripts/plugin_parity.py` → **PASS** (`PASS — plugin templates are in parity with the repo.`).
- `python3 -m py_compile alembic/versions/0004_project_visibility.py` → **OK**.
- `python3 -c "import server.app_api, server.accounts.service, server.accounts.repository"` → **OK**.
- `pytest tests/test_accounts_provisioning.py tests/test_org_credentials.py`
  (`.venv/bin/python`, `KB_TEST_DATABASE_URL=postgresql://kb:kb@localhost:55432/kb`)
  → **10 passed, 1 warning** (the pre-existing httpx StarletteDeprecationWarning; unrelated).
  - Pre-existing 6 (signup provisioning, org credentials) still green — regression clean.
  - New 4: `test_new_project_defaults_private` (create response + list + get all show
    `visibility: "private"`), `test_patch_visibility_toggles_both_ways` (200 →public, 200 →private),
    `test_patch_visibility_missing_project_is_404` (random UUID → 404),
    `test_patch_visibility_invalid_value_is_422` (`"unlisted"` → 422).
- Schema check: `information_schema.columns` for `projects.visibility` →
  `text | NOT NULL | 'private'::text` — matches the migration's intended shape.

Baseline (before edits) was confirmed green (6 passed) on the same DB, then the schema was
dropped/recreated to a clean state before the post-edit run (see the gotcha below).

## Deviations from plan.md

None material.
- The plan offered a SKIPPED fallback if no Postgres was available; a real run was achievable, so
  I ran the suites for real against a disposable container (10/10 green) rather than reporting skips.
- On the first post-edit run all 10 tests failed with `AccountsPersistenceError` because the
  disposable DB still held the pre-`visibility` `projects` table from the baseline run and
  `create_all(checkfirst=True)` skips existing tables (never adds the new column). Resetting the
  schema (`DROP SCHEMA public CASCADE; CREATE SCHEMA public;`) fixed it — a test-DB-state artifact,
  not a code issue. Recorded as a gotcha in `phase.md` for anyone re-running on a reused DB.

## Doc impact

Appended to `works/phases/active/P19/phase.md` (for the P19 review to consolidate; no docs
versioned this slice): `api.md` + `backend.md` — `/app/projects` responses (list, get, signup)
gain a `visibility` field; new `PATCH /app/projects/{project_id}` visibility toggle (session-only,
404 cross-tenant, 422 invalid); new projects default `private`.
