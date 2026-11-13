# Result — P18.S1: Schema 0003 + models + signup/seed default-org/default-project provisioning

Executed by `slice-executor-high` (2026-07-22). Status: **done**.

## What changed

Control-plane foundation for org-level keys + get-or-create projects. All `server/**`
and `tests/**` edits mirrored byte-identically into `plugin/templates/kb/`; `alembic/`
is repo-only (not a shipped_dir).

- **`alembic/versions/0003_org_level_credentials.py`** (new, repo-only) — down_revision
  `0002_usage_events`. Upgrade, in order: (1) **de-dupe** duplicate `(tenant_id, name)`
  projects — oldest-wins by `(created_at, id)` (matches `get_project_by_name`), re-points
  `project_credentials.project_id` and `usage_events.project_id` to the survivor, deletes
  the dead rows (pure SQL, no-op when clean); (2) `UNIQUE(tenant_id, name)` →
  `uq_projects_tenant_id`; (3) `project_credentials.tenant_id` added nullable → backfilled
  `FROM projects` → `SET NOT NULL` → FK `tenants.id` CASCADE → index
  `ix_project_credentials_tenant_id`; (4) `project_credentials.project_id` → nullable.
  Downgrade reverses (deletes `project_id IS NULL` rows before restoring NOT NULL);
  destructive-by-design (de-dupe not un-mergeable), commented as such.
- **`server/persistence/models.py`** — `ProjectModel` gains `UniqueConstraint("tenant_id",
  "name")` (auto-names `uq_projects_tenant_id`, matching the migration).
  `ProjectCredentialModel` gains a non-null `tenant_id` FK + `ix_project_credentials_tenant_id`
  index; `project_id` → `Mapped[UUID | None]`, nullable. Docstring documents org-level
  (`project_id NULL`) vs project-bound rows.
- **`server/accounts/types.py`** — `CreateProjectCredential` + `ProjectCredentialRecord`
  gain `tenant_id`; `project_id` is now `UUID | None` on both (honest with the nullable
  schema; org-mint in S2 sets it `None`).
- **`server/accounts/repository.py`** — `create_project_credential` writes `tenant_id`;
  `_to_credential_record` maps it.
- **`server/accounts/service.py`** — new `provision_signup(user_id)` primitive: tenant
  `"default"` + `owner` membership + project `"default"` in ONE session/transaction,
  returns the three records. New module constants `DEFAULT_ORG_NAME` / `DEFAULT_PROJECT_NAME`
  (both `"default"`). `create_tenant_with_owner` kept (bare-tenant callers).
- **`server/auth_api.py`** — signup uses `provision_signup`; response gains additive
  `project` (serialized like `tenant`). Local `serialize_project` added here (byte-identical
  output to `app_api.serialize_project`) to avoid the `app_api → auth_api` import cycle.
  Module + handler docstrings updated (dropped the `"<localpart>'s workspace"` naming).
- **`server/app_api.py`** — mint path passes `tenant_id=project.tenant_id` into
  `CreateProjectCredential` (the only change; the NOT NULL column compels it).
- **`server/seed.py`** — fresh-DB tenant #1 now via `provision_signup` (`"default"` org +
  project), eliminating signup/seed drift; existing DBs keep their tenant name unchanged
  (prod tenant #1 NOT renamed); step 3's set-membership check already tolerates the
  pre-existing `"default"` project. Module docstring rewritten.
- **`tests/test_accounts_provisioning.py`** (new, mirrored) — terse Postgres-gated file
  (same skip-clean pattern as `test_dashboard_api.py`): (a) signup → `tenant.name ==
  "default"`, `project.name == "default"`, project visible via `/app/projects`; (b) a minted
  credential persists `tenant_id` (read back directly, since the serializer doesn't expose
  it). Added to `plugin/templates/manifest.json` `identical`.
- **`tests/test_dashboard_api.py`** (existing, mirrored) — updated the project-set / activity
  assertions to include the now auto-provisioned `"default"` project (see Deviations).

## Validation — commands & outcomes

Deps live in `.venv`; system `python3` lacks them (used `.venv/bin/python`). A disposable
`postgres:17` Docker container (`:55432`, torn down after) provided the gated exercise.

1. **`.venv/bin/python -m pytest -q`** (legacy, no Postgres) → **70 passed, 15 skipped**
   (the 15 skips are the Postgres-gated suites, incl. the 2 new provisioning cases).
2. **Gated — migration exercise** (`DATABASE_URL=…:55432/…`, disposable PG):
   - `alembic upgrade head` from clean → schema verified: `project_id` nullable=YES,
     `tenant_id` nullable=NO, `uq_projects_tenant_id`, `fk_project_credentials_tenant_id_tenants`,
     `ix_project_credentials_tenant_id` all present.
   - `alembic downgrade 0002 → upgrade head` round-trip → columns/constraint drop and
     re-add cleanly.
   - **De-dupe scenario** (seeded at 0002: two `(tenant, "dup")` projects with credentials +
     usage_events, plus a distinct `"solo"`): after `upgrade head` → **1 survivor** (the
     oldest), both credentials + both usage_events re-pointed to it, `tenant_id` backfilled,
     and the UNIQUE constraint rejects a re-inserted dup. **PASS.**
3. **Gated — `KB_TEST_DATABASE_URL=… pytest`** (fresh DB): `test_accounts_provisioning.py`
   **2 passed**; `test_dashboard_api.py` **3 passed**; full suite **84 passed, 1 failed**.
   The 1 failure is **pre-existing and unrelated** — see Findings.
4. **`python3 scripts/plugin_parity.py`** → **PASS (exit 0)**; **`python3 scripts/skills_parity.py`**
   → **PASS (exit 0)**.
5. **Alembic sanity** — `alembic history` parses (0003 = head), module imports, revision
   chain `0001→0002→0003` correct.
6. **`python3 scripts/workflow.py validate`** → **PASS.**
7. **Import smoke** — `server.main` + `server.usage_api` import cleanly (no circular import);
   `auth_api.serialize_project` and `app_api.serialize_project` produce byte-identical output.

The orchestrator's `validate` re-run will pass; the pre-existing gated failure below is not a
P18.S1 regression.

## Findings (for S2 / review / operator)

- **Pre-existing gated failure, out of scope:** `tests/test_documents_api.py::
  test_documents_list_detail_and_project_bridge` fails with an extra `format` key in the
  document list projection (`_LIST_KEYS` never got `format`, likely added by the P16 HTML-docs
  work). **Confirmed by stashing ALL my changes and re-running against a clean fresh DB — it
  still fails**, so it is not caused by P18.S1. It only surfaces when Postgres-gated tests are
  actually run (default CI has no Postgres). Left unfixed (documents plane, outside this
  slice's accounts scope). Candidate for a tiny fix slice or deferred job; a reviewer should
  decide whether `format` belongs in list items (fix the test) or not (fix the projection).

## Deviations from plan.md

- **`serialize_project` added locally in `auth_api.py` rather than moved.** The plan said
  signup's `project` is "serialized like tenant." `app_api.serialize_project` is the canonical
  serializer and is imported by `usage_api.py`; `app_api` already imports `serialize_tenant`
  from `auth_api`, so importing `serialize_project` back into `auth_api` would be a circular
  import. Lowest-blast choice: a local copy in `auth_api` producing byte-identical output
  (asserted in the import smoke), keeping `app_api` the canonical hub untouched for
  `usage_api`. Documented in both docstrings.
- **`CreateProjectCredential.project_id` / `ProjectCredentialRecord.project_id` made
  `UUID | None`.** The plan (#6) said "gain `tenant_id`"; I also made `project_id` optional so
  the dataclasses are honest with the now-nullable column and S2's org-mint needs no dataclass
  rework. The current (project-bound) mint path is unchanged — it still passes `project_id`
  explicitly. `serialize_credential` still does `str(record.project_id)`; S1 writes no NULL
  rows, so it is never hit — **S2 owns making the serializer/resolver NULL-safe** for org rows.
- **Fixed an existing test (`test_dashboard_api.py`).** Signup now provisioning a `"default"`
  project is a real behavior change that made this existing gated test's exact project-set /
  activity-name assertions stale. Updated them to include `"default"` (still asserting no
  cross-tenant leak). Mirrored into the template. In scope: it is a direct consequence of this
  slice's behavior change, not scope creep.
- **No alembic round-trip pytest shipped.** The plan floated one as "recommended if cheap." A
  test that runs alembic can't be mirrored into the template (no `alembic/` there → parity
  completeness would fail on a repo-only `tests/` file), and the repo's established pattern has
  no alembic-running test. Instead I exercised the migration (incl. the de-dupe/backfill SQL)
  manually against the disposable Postgres and recorded it above — the only pre-prod exercise
  of that SQL, as the plan wanted, without breaking parity.

## Doc impact recorded

Appended to `phase.md`'s running "Doc impact" list (REVIEW consolidates — not versioned here):
data, backend, api, architecture, decisions, qa. See phase.md.

No commits, no status transitions, no doc versioning performed.
