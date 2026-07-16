# P10.S6 result — Seed tenant #1 + migrate the live corpus + E2E onboarding smoke

**Verdict: done.** Seed is idempotent, the onboarding + cross-tenant isolation E2E passes,
and the legacy regression is green (65). This is the last middle slice — the phase is ready
for `P10.REVIEW`.

## What changed

- **`server/config.py`** — added `operator_password()` (reads `KB_OPERATOR_PASSWORD`, same
  `_env` pattern as `operator_email()`; docstring notes it is read only by the seed CLI,
  never at request time). Additive; nothing else touched.
- **`server/seed.py`** (NEW) — idempotent operator/tenant/project seed, `python -m server.seed`,
  Postgres-only (never touches `kb.sqlite3`). Guards fail fast with actionable `SystemExit`
  (not tracebacks) on unset `DATABASE_URL` / `KB_OPERATOR_EMAIL` / `KB_OPERATOR_PASSWORD`.
  Normalizes the email `.strip().lower()` (matches `/auth/signup`). Creates the operator user
  (argon2id hash via `hash_password`, race-safe on `DuplicateEmailError`), tenant #1 via
  `create_tenant_with_owner(user.id, f"{local}'s workspace")` (the signup naming derivation),
  and a `projects` row per **live `docs/` project derived from the tree** (`_discover_projects`
  reuses `reindex._FILENAME_RE` + `RESERVED_DIRS`; project string = `rel.parts[0]` verbatim).
  **No `vk_` credential is seeded** (operator decision — the `KB_API_TOKEN` master bearer already
  authenticates tenant #1). Disposes the async engine in a `finally`.
- **`scripts/onboarding_smoke.py`** (NEW) — committed operational smoke, `site_smoke.py` style
  (argparse + collect-all-failures + exit-non-zero-or-PASS) over `httpx`. `--base-url`
  (default `http://127.0.0.1:8765`), optional `--master-token`. Onboards a fresh tenant B
  (`signup → /app/projects → vk_ mint → POST /api/documents → scoped GET /api/search + list`),
  asserts the frozen 201 key set, then proves isolation (B never sees tenant #1's corpus via
  list/search/by-path-404; master bearer sees it 200). Tenant-#1 fixtures (a real rel_path + a
  title word) are **auto-derived from the master bearer's own listing** — nothing about tenant
  #1's content is hardcoded; without `--master-token` the tenant-#1-specific checks are skipped
  and B-only isolation still runs.
- **`compose.prod.yml`** — added `KB_OPERATOR_PASSWORD: ${KB_OPERATOR_PASSWORD}` to the `api`
  service env (+ the `.env` prerequisite comment). **`compose.yml`** — added the optional
  `KB_OPERATOR_PASSWORD: ${KB_OPERATOR_PASSWORD:-}` beside `KB_OPERATOR_EMAIL`.

## `_discover_projects` output (against the real `docs/` tree)

```
['bootstrap_agentic_workspace.sh', 'changple5', 'hi2vi', 'hi2vi_web']
```

Exactly the 4 live projects, matching the plan. `bootstrap_agentic_workspace.sh` keeps its
literal `.sh` (it is `parts[0]` verbatim — the directory is named `bootstrap_agentic_workspace.sh`,
and reindex derives the same string for `documents.project`, so they line up). All live dated
`*.md` files sit at depth 2 (`<project>/<file>.md`); no dated file lives at the docs root or in
a reserved dir, so the discovery set is clean.

## Verification

### 1. Legacy regression (critical) — PASS

`env -u DATABASE_URL uv run pytest -q` → **65 passed** (baseline and post-change identical).
S6 added only a config accessor + two standalone entrypoints; nothing in the legacy path changed.

### 2. Seed + migrate + onboard E2E (ephemeral) — PASS

Docker **was** available, so the full E2E ran against a throwaway `postgres:17` (host port 55440)
+ a **temp `KB_ROOT`** (`scratchpad/kbroot`, never the real `docs/`/git) holding 3 fake project
dirs (`alpha`/`bravo`/`charlie`), each with one `YYYY-MM-DD-slug.md`; `KB_GIT_COMMIT=false`,
Gemini keys unset (BM25-only, no network). Sequence: `alembic upgrade head` → seed ×2 → app boot
(boot reindex) → assertions → onboarding smoke → `docker … rm -f` + temp-root removal.

- **Seed run 1:** `user: created`, `tenant #1: created <uuid> "operator's workspace"`,
  `projects: created=['alpha','bravo','charlie']`.
- **Seed run 2 (idempotency):** `user: exists`, `tenant #1: exists <same uuid>`,
  `projects: created=[] existed=['alpha','bravo','charlie']` — **zero new rows**.
  DB invariants confirmed independently via `AccountsService`: `user_count=1`, `tenant_count=1`,
  `project_count=3` (unchanged across the second run).
- **Tenant-#1 re-stamp:** app booted with the operator already seeded, so the boot reindex
  resolved tenant #1 on first try (`get_tenant_one_id` caches on success). Startup log:
  `startup reindex: indexed=3 removed=0 skipped=0`. Every `documents` row's `tenant_id` was then
  the tenant-#1 UUID (not `''`) — verified directly against `kb.sqlite3`:
  ```
  OK  alpha/2026-01-01-alpha-doc.md    tenant_id=<t1-uuid>
  OK  bravo/2026-01-02-bravo-doc.md    tenant_id=<t1-uuid>
  OK  charlie/2026-01-03-charlie-doc.md tenant_id=<t1-uuid>
  ```
  This is the path-derived re-stamp (no file move): `docs/` → tenant #1 via `KB_OPERATOR_EMAIL`.
- **Onboarding + isolation smoke:** `python scripts/onboarding_smoke.py --base-url <app>
  --master-token <KB_API_TOKEN>` → **PASS**. Tenant B onboarded end-to-end
  (signup → project → `vk_` → `POST /api/documents` 201 with the frozen key set → B finds its own
  doc via search + list). Isolation vs tenant #1 verified: B's list/search never leak a tenant-#1
  rel_path, B's `GET /api/documents/by-path/<t1 rel_path>` → **404**, and the master bearer's same
  by-path GET → **200** (tenant #1 sees its own corpus). Tenant B's write landed under
  `tenants/<uuid>/` (non-public, no git), tenant #1's under `docs/`.

### 3. `python3 scripts/workflow.py validate` — PASS ("Workflow validation passed.")

Compose sanity: `docker compose -f compose.yml config` valid; `compose.prod.yml config` valid
against a throwaway (immediately removed) `.env` (the real box `.env` is gitignored/box-only).

## Deviations from `plan.md`

- **None in deliverables.** All four artifacts were built exactly as specified (seed shape,
  method/type names confirmed against the real S1 files, no `vk_` seeded, projects derived from
  the tree, compose env added).
- **One finding surfaced during testing (not a deviation, flagged for REVIEW):** an initial E2E
  run with a deliberately **mixed-case** `KB_OPERATOR_EMAIL` (`Operator@Example.com`) left the
  master bearer unresolvable and `docs/` stamped `''`. Root cause: the seed normalizes the email
  (`.strip().lower()`, per plan, so `/auth/login` — which also normalizes — finds the operator),
  but `server/api_auth.py::get_tenant_one_id()` (S5 source, **out of S6 scope**) looks up
  `KB_OPERATOR_EMAIL` **verbatim**. The two agree only when `KB_OPERATOR_EMAIL` is already
  normalized (lowercase, no surrounding whitespace) — which a real deploy naturally satisfies.
  Re-running with a lowercase email made the whole chain pass. **Operational caveat recorded in
  `phase.md`:** `KB_OPERATOR_EMAIL` must be set in normalized (lowercase, trimmed) form; a
  possible follow-up is to normalize inside `get_tenant_one_id()` for robustness (a REVIEW call —
  not changed here, as it is S5 source).

## For `P10.REVIEW`

`phase.md` now carries the S6 doc-impact one-liners (operations / backend / api-security), the
deploy/migration runbook, the normalization caveat, and the note that the phase is ready for
review. Docs were **not** versioned here (`doc-new-version` is REVIEW's job). No commit / status
transition performed.
