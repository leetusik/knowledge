# Plan — P18.S2: Org-level keys — resolver + mint endpoint + write-path get-or-create + metering

Operator-approved orchestrator plan (2026-07-22). Executor: `slice-executor-high` (risk: high). Read `../../phase.md` (Context, Findings — including S1's notes) and `../../intent.md` first; re-verify anchors before editing. S1 landed the schema: `project_credentials.tenant_id` NOT NULL (backfilled), `project_id` nullable, `UNIQUE(tenant_id,name)` on projects, `provision_signup`, and dataclasses already carry `tenant_id` + optional `project_id`.

## Goal

Make org-level `vk_` keys real (mint/list/revoke + resolver) and projects get-or-create by name on save. S1 flagged: **S2 owns serializer/resolver NULL-safety** for `project_id NULL` rows.

## Two verified constraints that shape the design

- `POST /api/documents` (`server/main.py:389-592`) is a **sync** handler under `WRITE_LOCK` — it cannot await Postgres. Get-or-create lives in an **async FastAPI dependency** on that route (FastAPI shares the parsed `DocumentIn` body between dependency and handler; `resolve_api_write` is per-request cached, so it runs once).
- S1's UNIQUE made duplicate-name `POST /app/projects` a **latent 500** (`IntegrityError` → `AccountsPersistenceError` → 500). Fix here via get-or-create.

## Implementation

### 1. Resolver — `server/api_auth.py` `_resolve_tenant_bearer` step 2 (~:153-164)

Read `cred.tenant_id` uniformly. Bound rows (`project_id` set): keep the `get_project` existence guard; return `ApiAuthContext(tenant_id=cred.tenant_id, project_id=cred.project_id, credential_id=cred.id)`. Org rows (`project_id NULL`): `ApiAuthContext(tenant_id=cred.tenant_id, credential_id=cred.id)` — no project query. Master-token + session paths untouched. Update module + dataclass docstrings.

### 2. Service/repository — `server/accounts/{service,repository}.py`

- `get_or_create_project(tenant_id, name) -> ProjectRecord`: `get_project_by_name` first; else create, catching `IntegrityError` → re-read (race-safe under UNIQUE).
- `list_org_credentials(tenant_id)`: credentials `WHERE tenant_id = ... AND project_id IS NULL`, oldest-first (mirror `list_project_credentials`).

### 3. Org credential endpoints — `server/app_api.py` (additive to frozen `/app/*`)

- `POST /app/credentials` (201): mint org key — `CreateProjectCredential(tenant_id=ctx.tenant.id, project_id=None, token_prefix=key[:12], token_hash=sha256_hex(key), name=body.name)`; reuse `CreateCredentialInput`; show-once `{credential, key}`.
- `GET /app/credentials`: `{credentials: [...]}` from `list_org_credentials`.
- `DELETE /app/credentials/{credential_id}` (204): 404 unless the id is in the caller's org-level list (same anti-probe pattern as `delete_credential`).
- `serialize_credential`: NULL-safe `project_id` (`str(...)` or `None`).
- `POST /app/projects` → `get_or_create_project` (dupe name → 201, existing row, same response shape).

### 4. Write-path get-or-create — `server/main.py`

Async dependency `ensure_registry_project(body: DocumentIn, ctx=Depends(resolve_api_write)) -> UUID | None`: legacy (`ctx.tenant_id is None`) → None; validate the name with `documents_mod.validate_project`, swallowing `ConventionError` (the handler's own 422 wins); else `get_or_create_project(ctx.tenant_id, name)` and return its id. Wire into `create_document`; stash `project_id=registry_id or ctx.project_id` in the `UsageHint` (:585-591). Row-before-409 is fine (idempotent). DELETE/search paths unchanged; `server/usage/metering.py` unchanged (name-first lookup now always finds the row).

### 5. Tests — one terse Postgres-gated file (e.g. `tests/test_org_credentials.py`, skip-clean pattern)

(a) org mint → 201, `credential.project_id` null; org key authorizes `POST /api/documents`; project then visible in `/app/projects` (get-or-create proof). (b) project-bound key still writes (regression). (c) revoked org key → 401. (d) duplicate `POST /app/projects` → 201 same id (no 500).

### 6. Parity (same slice)

Mirror all `server/**` + `tests/**` edits into `plugin/templates/kb/`; add new test to `plugin/templates/manifest.json`; both parity scripts exit 0.

## Out of scope

Web/BFF (S3), CLI/skills (S4), prod (S5), org creation/invites (D14), MCP (no change — forwards bearers). Do NOT fix the pre-existing `test_documents_api.py` `format`-key failure (flagged for review).

## Validation (run and record in result.md)

1. `pytest` legacy (`.venv/bin/python -m pytest -q`) — green.
2. Disposable `postgres:17` (S1's pattern): `KB_TEST_DATABASE_URL=... pytest` — new file + gated suites green (pre-existing documents_api failure excepted).
3. `python3 scripts/plugin_parity.py` → 0; `python3 scripts/skills_parity.py` → 0.
4. `python3 scripts/workflow.py validate`.

## Wrap-up

`result.md` (what changed, validation outcomes, deviations); `phase.md` cross-slice notes (anything S3/S4/S5 must know — e.g. final endpoint paths for S3's BFF) + one-line Doc impact entries (expect: api, backend, security, decisions, qa). No commits, no status transitions, no doc versioning.
