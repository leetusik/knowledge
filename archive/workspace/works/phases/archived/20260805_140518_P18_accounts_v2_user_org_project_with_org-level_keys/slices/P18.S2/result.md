# Result — P18.S2: Org-level keys — resolver + mint endpoint + write-path get-or-create + metering

Executed by `slice-executor-high` on 2026-07-22. All plan sections landed; no deviations of substance (one test-payload fixup, below).

## What changed

### 1. Resolver — `server/api_auth.py`
`_resolve_tenant_bearer` step 2 now reads `cred.tenant_id` uniformly. Org rows (`project_id NULL`) return `ApiAuthContext(tenant_id=cred.tenant_id, credential_id=cred.id)` with **no project query**. Project-bound rows keep the `get_project` existence guard (a vanished bound project stays unresolvable) and return `project_id=cred.project_id` for attribution. Master-token + session paths untouched. Module docstring (mode-2 line), `ApiAuthContext` dataclass docstring (`project_id`/`credential_id`) updated for org-level keys.

### 2. Service / repository — `server/accounts/{service,repository}.py`
- `get_or_create_project(tenant_id, name) -> ProjectRecord` (service): `get_project_by_name` first; else `create_project` + commit, catching `IntegrityError` → rollback → re-read (race-safe under `UNIQUE(tenant_id, name)`; re-raises only if the row still isn't there). Reused by both the write path and `POST /app/projects`.
- `list_org_credentials(tenant_id)` (service + repository): `WHERE tenant_id = ... AND project_id IS NULL`, oldest-first (mirrors `list_project_credentials`).

### 3. Org credential endpoints + get-or-create — `server/app_api.py` (additive to `/app/*`)
- `POST /app/credentials` (201): mints an org key — `CreateProjectCredential(tenant_id=ctx.tenant.id, project_id=None, ...)`; show-once `{credential, key}`.
- `GET /app/credentials`: `{credentials: [...]}` from `list_org_credentials`.
- `DELETE /app/credentials/{credential_id}` (204): 404 unless the id is in the caller's org-level list (same anti-probe pattern as the per-project delete).
- `serialize_credential`: NULL-safe `project_id` (`str(...)` when set, else `None`) — org keys never serialize the literal `"None"`. This serializer is also imported by `usage_api.py`; the change is backward-compatible (project-bound rows still emit the UUID string).
- `POST /app/projects` now routes through `get_or_create_project` — a duplicate name returns the existing row (201, same shape), killing the latent dupe-500 (`IntegrityError` → 500) that S1's UNIQUE introduced.
- Module docstring updated (per-project vs org-level keys, get-or-create projects).

### 4. Write-path get-or-create — `server/main.py`
New **async** dependency `ensure_registry_project(body: DocumentIn, ctx=Depends(resolve_api_write)) -> UUID | None`: legacy (`ctx.tenant_id is None`) → `None`; validates `body.project` with `documents_mod.validate_project`, swallowing `ConventionError` so the sync handler's own 422 stays the single source of the shape error; else `get_or_create_project(ctx.tenant_id, name)` → returns its id. Wired into `create_document` as a new `Depends`; the `UsageHint` at the tail now stashes `project_id=registry_project_id or ctx.project_id`. Added imports `from uuid import UUID` and `get_accounts_service`. DELETE/search paths and `server/usage/metering.py` unchanged (metering's name-first `get_project_by_name` now always finds the row).

**Verified mechanic (empirically, before wiring):** FastAPI parses the `DocumentIn` body once and shares it between the dependency and the sync handler, and caches `resolve_api_write` per request so it runs exactly once across both — a standalone probe confirmed `body` identical + `resolve` called once. This is what lets an async get-or-create sit in front of the sync, `WRITE_LOCK`-holding handler.

### 5. Tests — `tests/test_org_credentials.py` (new, Postgres-gated, terse)
Skip-clean pattern (mirrors `test_accounts_provisioning.py`), plus an on-disk `KB_ROOT` so `POST /api/documents` writes to the namespaced `tenants/<uuid>/` root (git commit is auto-skipped for a non-public tenant). Four cases: (a) org mint → `project_id` null, key authorizes a write, the unregistered project `"alpha"` then appears in `/app/projects` (get-or-create proof); (b) project-bound key still writes (regression); (c) revoked org key → 401; (d) duplicate `POST /app/projects` → 201 same id (no 500).

### 6. Parity (same slice)
All five `server/**` edits + the new test file mirrored byte-identically into `plugin/templates/kb/`; `tests/test_org_credentials.py` added to `manifest.json` `identical`. Both parity gates exit 0.

## Validation

| Command | Outcome |
| --- | --- |
| `.venv/bin/python -m pytest -q` (legacy, no Postgres) | **PASS** — 70 passed, 19 skipped |
| `KB_TEST_DATABASE_URL=… pytest -q tests/test_org_credentials.py` (disposable `postgres:17`) | **PASS** — 4 passed |
| `KB_TEST_DATABASE_URL=… pytest -q` (full gated suite) | **PASS** except the pre-existing `test_documents_api.py::test_documents_list_detail_and_project_bridge` (`format` key) — **88 passed, 1 failed**; confirmed failing on a clean stashed tree, so it predates P18.S2 (S1 already flagged it for review) |
| `python3 scripts/plugin_parity.py` | **PASS** (exit 0) |
| `python3 scripts/skills_parity.py` | **PASS** (exit 0) |
| `python3 scripts/workflow.py validate` | **PASS** |

Disposable Postgres: throwaway `postgres:17` docker container on `127.0.0.1:55433` (S1's pattern); removed after the run.

## Deviations from plan.md

- **Test payload tags:** the plan's test-doc payload needed 2–5 tags (`documents_mod.validate_tags`), so `_doc_payload` uses two tags (`["testing", "orgkey"]`) rather than one. Cosmetic, within the plan's intent for case (a)/(b).
- No other deviations. The pre-existing `documents_api` `format`-key failure was left unfixed per the plan (out of scope; flagged for review).
