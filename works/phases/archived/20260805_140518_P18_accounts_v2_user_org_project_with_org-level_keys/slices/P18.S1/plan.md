# Plan — P18.S1: Schema 0003 + models + signup/seed "default" org+project provisioning

Operator-approved orchestrator plan (2026-07-22). Executor: `slice-executor-high` (risk: high). Read `../../phase.md` (Context map + Findings + Constraints) and `../../intent.md` first; re-verify line anchors before editing.

## Goal

Control-plane foundation for P18: alembic 0003 (UNIQUE project names per tenant; org-capable credentials), matching ORM models, a shared signup-provisioning primitive (org `"default"` + project `"default"`, atomic), signup + seed on that primitive, mint path populating the new `tenant_id`, terse Postgres-gated tests, template parity kept green.

## Scope

**In:** alembic `0003`; `server/persistence/models.py`; `server/accounts/{service,repository,types}.py`; `server/auth_api.py` signup; `server/seed.py`; minimal `server/app_api.py` mint touch; one terse gated test file; `plugin/templates/kb` mirror.
**Out (do not touch):** resolver `server/api_auth.py`, org-mint endpoint, write-path get-or-create, metering (all S2); web (S3); CLI/skills (S4); prod (S5). No org creation/invites (D14).

## Implementation

### 1. Alembic `alembic/versions/0003_org_level_credentials.py` (style of 0001/0002: `op.f()` names, docstringed upgrade/downgrade)

1. **De-dupe `projects`** per `(tenant_id, name)` first: keep the **oldest** row (matches `get_project_by_name` oldest-wins), re-point `project_credentials.project_id` and `usage_events.project_id` from dupes to the survivor, delete dupes. Pure SQL; no-op when clean.
2. `op.create_unique_constraint(op.f("uq_projects_tenant_id"), "projects", ["tenant_id", "name"])`.
3. `project_credentials.tenant_id`: add nullable UUID → backfill `UPDATE ... FROM projects` → `SET NOT NULL` → FK `tenants.id` `ondelete=CASCADE` → index `ix_project_credentials_tenant_id`.
4. `project_credentials.project_id` → nullable; FK CASCADE stays (bound keys still die with their project; org rows will carry `project_id NULL`).
5. Downgrade mirrors in reverse; delete `project_id IS NULL` rows before restoring NOT NULL (destructive downgrade acceptable — fix-forward repo — comment it).

### 2. ORM `server/persistence/models.py`

- `ProjectModel.__table_args__` += `UniqueConstraint("tenant_id", "name")` (convention auto-names `uq_projects_tenant_id`, matching the migration).
- `ProjectCredentialModel`: add non-nullable `tenant_id` FK (tenants, CASCADE) + index; `project_id` becomes `Mapped[UUID | None]`. Docstring: org-level rows carry `project_id NULL`.
- Gated tests build schema from these models (`Base.metadata.create_all`, `tests/test_dashboard_api.py:71-74`) — they must match the migration exactly.

### 3. Shared provisioning primitive — `server/accounts/service.py`

New method (e.g. `provision_signup(user_id)`): ONE session/transaction inserting tenant `"default"` + `owner` membership + project `"default"`, returning the three records. Reuse `repository.create_tenant` / `add_tenant_member` / `create_project` within the single session. Keep `create_tenant_with_owner` (other callers exist).

### 4. Signup `server/auth_api.py:215-238`

Replace the `workspace_name` derivation + `create_tenant_with_owner` with the primitive. Response: `{token, user, tenant}` **plus additive `project`** (serialized like tenant). Frozen contract — additive only.

### 5. Seed `server/seed.py`

Step 2 → same primitive (fresh DB: tenant #1 `"default"` + `"default"` project), eliminating signup/seed drift; existing DBs hit the idempotent skip and keep their names (prod tenant #1 NOT renamed). Step 3 unchanged, but tolerate the pre-existing `"default"` row. Update the module docstring (it documents the old `"<local-part>'s workspace"` naming and "exactly three things").

### 6. Mint path minimal touch (NOT NULL compels it)

`types.py` `CreateProjectCredential` + `ProjectCredentialRecord` gain `tenant_id`; `repository.py` writes/reads it; `app_api.py:148-170` passes the scoped project's `tenant_id`. No resolver change, no new endpoint.

### 7. Tests (terse; Postgres-gated pattern of `tests/test_dashboard_api.py`; skip-clean without Postgres)

One small file (e.g. `tests/test_accounts_provisioning.py`): (a) signup 201 → `tenant.name == "default"`, `project.name == "default"`, project visible via `/app` routes; (b) minted credential carries `tenant_id`. Recommended if cheap: an alembic `upgrade head` round-trip against a scratch database created via the test DSN (skip-clean if CREATEDB unavailable) — the only pre-prod exercise of the de-dupe/backfill SQL. Grep existing tests for `'s workspace` assumptions and fix.

### 8. Parity (same slice — CI gates)

Mirror every `server/**` and `tests/**` edit into `plugin/templates/kb/` byte-identically; new files added on both sides; check `plugin/templates/manifest.json` file-class lists. `alembic/` stays repo-only. `python3 scripts/plugin_parity.py` and `python3 scripts/skills_parity.py` must exit 0.

## Validation (run and record in result.md)

1. `pytest` — full suite green in legacy mode (no Postgres env).
2. Gated: if you can reach/bring up a disposable Postgres (check repo compose/Makefile; else state plainly you could not), `KB_TEST_DATABASE_URL=... pytest` for the gated suites + the new file.
3. `python3 scripts/plugin_parity.py` → 0; `python3 scripts/skills_parity.py` → 0.
4. Alembic script sanity (`alembic history` parses; import checks).
5. `python3 scripts/workflow.py validate`.

## Wrap-up

- `result.md` in this slice folder: what changed, validation outcomes, deviations, whether Postgres-gated tests actually ran.
- Append cross-slice notes to `phase.md` (anything S2-S5 must know) and one-line **Doc impact** entries (expect: data, backend, api, decisions, qa) under its running list.
- No commits, no status transitions, no doc versioning.
