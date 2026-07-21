# P10.S6 — plan (orchestrator → slice-executor-high)

Implement **P10.S6 — Seed tenant #1 + migrate the live corpus + E2E onboarding smoke** in
`/Users/sugang/projects/personal/knowledge`. Read `works/phases/active/P10/phase.md` first — the whole "What S6
consumes from S5" block (~L189–192) and the two hard couplings. This is the **final, high-risk** slice: it seeds
the operator's own tenant #1 so `get_tenant_one_id()` resolves and the live `docs/` corpus re-stamps as tenant #1,
then proves the full SaaS flow + cross-tenant isolation end-to-end. It builds + proves + documents the migration;
the actual live prod cutover is the operator's P10 deploy action (I have no box access, Postgres isn't live on the
box yet) — a runbook, not something you run here.

**Scope:** the seed + the onboarding smoke + config/compose env + the deploy runbook note. Do NOT touch S1–S5
source beyond the two new files + `config.py`/compose. Do NOT commit / transition status / `doc-new-version`.
Write `result.md`, append `phase.md` notes, return a verdict.

## Settled decisions (operator-approved — do not re-litigate)
- **Seed = operator user + tenant #1 + the 4 projects only. NO `vk_` credential** (the `KB_API_TOKEN` master
  bearer already authenticates tenant #1; a seeded `vk_` is redundant).
- **Operator password from `KB_OPERATOR_PASSWORD`** (new config accessor, same `_env` pattern as
  `operator_email()`).
- **Projects derived from the live `docs/` tree, not hardcoded** — reuse `reindex._FILENAME_RE` + `RESERVED_DIRS`;
  the project string is literally `Path(rel).parts[0]` (so `bootstrap_agentic_workspace.sh` keeps its `.sh` — do
  not "clean" it; it must match what the content plane derives). Today's set: `bootstrap_agentic_workspace.sh`,
  `changple5`, `hi2vi`, `hi2vi_web`.
- **Tenant #1 name** = signup's derivation `f"{email.split('@')[0]}'s workspace"`.
- **Seed writes Postgres only** — never rewrites `kb.sqlite3`. The `docs/` re-stamp is the ordinary reindex
  (restart's boot reindex, or `POST /api/reindex` with the master bearer) run *after* the seed.

## 1. `server/config.py` (MODIFY)
Add, mirroring `operator_email()` (L49–58) exactly in style:
```python
def operator_password() -> str | None:
    """Operator's password for the seed (`python -m server.seed`); pairs with KB_OPERATOR_EMAIL."""
    return _env("KB_OPERATOR_PASSWORD")
```

## 2. `server/seed.py` (NEW)
Idempotent operator/tenant/project seed. `python -m server.seed`. Structure:
- Imports: `asyncio`, `sys`, `from pathlib import Path`; `from server import config`; `from server.accounts.service
  import get_accounts_service, DuplicateEmailError`; `from server.accounts.security import hash_password`; `from
  server.accounts.types import CreateUser, CreateProject`; `from server.reindex import _FILENAME_RE, RESERVED_DIRS`;
  `from server.persistence.engine import dispose_engine` (dispose at the end — the CLI is not the app lifespan).
- `def _discover_projects(docs_root: Path) -> list[str]`: walk `docs_root`; for every file whose name matches
  `_FILENAME_RE`, take `rel = file.relative_to(docs_root)`, `project = rel.parts[0]`; skip when `parts[0] in
  RESERVED_DIRS` or when the file is directly at the root (`len(rel.parts) == 1`). Return the sorted distinct set.
  (This is exactly reindex's project-derivation, so the seeded names line up with `documents.project`.)
- `async def main() -> None`:
  - Guard (fail fast with actionable `SystemExit`, not a traceback): `database_url()` unset → exit "set DATABASE_URL
    (the accounts plane is unavailable)"; `operator_email()` unset → exit "set KB_OPERATOR_EMAIL"; `operator_password()`
    unset → exit "set KB_OPERATOR_PASSWORD". Normalize the email `.strip().lower()` (match `/auth/signup`).
  - `service = get_accounts_service()`.
  - User: `user = await service.get_user_by_email(email)`; if `None`: `try: user = await service.create_user(
    CreateUser(email=email, password_hash=hash_password(password))); created_user = True` `except
    DuplicateEmailError: user = await service.get_user_by_email(email); created_user = False` (race-safe). Else
    `created_user = False`.
  - Tenant #1: `tenants = await service.list_tenants_for_user(user.id)`; if empty: `tenant, _ = await
    service.create_tenant_with_owner(user.id, f"{email.split('@')[0]}'s workspace")`; else `tenant = tenants[0]`.
  - Projects: `existing = {p.name for p in await service.list_projects_for_tenant(tenant.id)}`; `discovered =
    _discover_projects(config.docs_root())`; for `name in discovered` not in `existing`: `await
    service.create_project(CreateProject(tenant_id=tenant.id, name=name))`. Track created vs existed.
  - Print a concise summary: `user: created|exists <email>`, `tenant #1: <tenant.id> "<name>"`, `projects:
    created=[…] existed=[…]`. Re-running → user/tenant/all-projects exist, nothing written.
  - `finally: await dispose_engine()`.
- `if __name__ == "__main__": asyncio.run(main())`.

Confirm the exact `AccountsService`/types/security symbol names against the real files before finalizing (they
shipped in S1 — see phase.md L99–116); if `create_tenant_with_owner`'s return shape or a `Create*` field differs,
adapt (don't guess) — `escalate` only if a needed method is genuinely absent.

## 3. `scripts/onboarding_smoke.py` (NEW)
Committed operational smoke, style = this repo's `scripts/site_smoke.py` (module docstring + `argparse` + collect
all failures + exit non-zero or print `PASS`) using `httpx` for HTTP (like vocky `src/vocky/smoke.py`). Args:
`--base-url` (default `http://127.0.0.1:8765`), optional `--master-token` (the `KB_API_TOKEN`, for the tenant-#1
read assertion; skip that check if absent). Sequence (collect failures, don't raise on first):
- **Onboard tenant B (fresh, unique email `onboard-smoke+<token_hex>@example.com`):** `POST /auth/signup` → 201,
  grab `token`. `POST /app/projects` (`{"name":"onboarding-smoke"}`, Bearer session) → 201, grab `project.id`.
  `POST /app/projects/{id}/credentials` → 201, grab `key` (assert `startswith("vk_")`). `POST /api/documents`
  (Bearer `vk_`) with a valid frozen body (`project` = the doc's project string, `title`, `markdown`, a unique
  `slug`, a `date`) → **201**; assert the frozen response shape (the keys the contract guarantees — check against
  `docs/current/api.md` if unsure). `GET /api/search?q=<unique word from B's doc>` + `GET /api/documents` (Bearer
  `vk_`) → B sees its own doc.
- **Isolation:** with tenant B's `vk_`, `GET /api/documents` and `GET /api/search?q=<a word from a tenant-#1 doc>`
  return **none** of tenant #1's docs; `GET /api/documents/by-path/{a real docs/ rel_path}` → **404**. If
  `--master-token` given: that same by-path GET with the master bearer → 200 (tenant #1 sees its own corpus).
- Print `PASS` + a one-line summary, or all collected failures + exit 1.
Keep it terse (high-value assertions only — no scaffolding sprawl; it's a smoke, not a suite).

## 4. `compose.prod.yml` (MODIFY; `compose.yml` optional)
Add `KB_OPERATOR_PASSWORD: ${KB_OPERATOR_PASSWORD}` to the `api`/`knowledge-api` service env (beside
`KB_OPERATOR_EMAIL`), sourced from the box `.env`. In `compose.yml` (local) make it optional
(`${KB_OPERATOR_PASSWORD:-}`) if you add it. Record in `phase.md` that the box `.env` now needs
`KB_OPERATOR_PASSWORD` (a P10 deploy prerequisite alongside `POSTGRES_PASSWORD`/`KB_OPERATOR_EMAIL`).

## Verification (run; report in `result.md`)
1. **Legacy regression:** `unset DATABASE_URL && uv run pytest -q` → **65 pass** (S6 adds only a config accessor +
   two standalone entrypoints; nothing in the legacy path changes).
2. **Seed + migrate + onboard E2E** (ephemeral, like S1–S5): throwaway `postgres:17`; a **temp `KB_ROOT`** whose
   `docs/` holds 2–3 fake project dirs each with one `YYYY-MM-DD-slug.md` (never the real `docs/`/git — set
   `KB_ROOT` to the temp dir, `KB_GIT_COMMIT=false`); `alembic upgrade head`; `KB_OPERATOR_EMAIL` +
   `KB_OPERATOR_PASSWORD` set; a `KB_API_TOKEN` for the master-bearer check.
   - `python -m server.seed` → operator user + tenant #1 + a `projects` row per fake project. **Run it again →
     idempotent** (all-exists, zero new rows — verify project count unchanged).
   - Reindex with tenant #1 resolvable (in-process app boot reindex, or `POST /api/reindex` with the master
     bearer) → assert every temp-`docs/` row's `documents.tenant_id` == tenant #1's UUID (not `''`), e.g. a scoped
     read via the master bearer returns the seeded corpus.
   - `python scripts/onboarding_smoke.py --base-url <app> --master-token <KB_API_TOKEN>` → onboarding passes and
     tenant B is isolated (cross-tenant 404s; B's list/search never leak tenant #1). Tear the stack down (`docker
     … down -v`, remove the temp KB_ROOT).
   - Docker unavailable → don't block: run step 1 + a `python -m server.seed` guard/import sanity (clear
     `SystemExit` messages when DATABASE_URL/email/password are unset, and `_discover_projects(docs/)` returns the
     4 real names) and clearly report the Postgres-dependent E2E as a gap.
3. `python3 scripts/workflow.py validate`.

## Finish
`result.md` (the seed, the smoke, the E2E results incl. **idempotency**, the **tenant-#1 re-stamp**, the
**isolation** checks, the `_discover_projects` output, deviations). Append `phase.md` notes — Doc-impact
one-liners: **operations** (`python -m server.seed` idempotent seed CLI; `KB_OPERATOR_PASSWORD` deploy
prerequisite; the deploy/migration **runbook**: pull → `up -d postgres` → `alembic upgrade head` → set
email/password in `.env` → `docker compose exec api python -m server.seed` → restart api (boot reindex stamps
`docs/` as tenant #1) or `POST /api/reindex` → `scripts/onboarding_smoke.py` to verify; `scripts/onboarding_smoke.py`
as the post-deploy verifier), **backend** (idempotent seed on `AccountsService`; project set derived from the live
tree via reindex's filename rule), **api/security** (E2E proves the signup→project→`vk_`→write→scoped-read
onboarding flow and cross-tenant content isolation on seeded/migrated data). Then note: **this is the last middle
slice — the phase is ready for `P10.REVIEW`**, which validates all of S1–S6 together and consolidates every
S1–S6 doc-impact one-liner into new doc versions. Do **not** run `doc-new-version` (review's job). Return `done`
when the seed is idempotent + the E2E passes + legacy is green; else `escalate`/`blocked`/`needs_operator`.
