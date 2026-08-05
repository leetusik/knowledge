# Plan — P18.DECOMP: decompose "Accounts v2: user/org/project with org-level keys"

Operator-approved orchestrator plan (2026-07-22). Executor: `slice-executor-high`.

## Goal

Design P18's slice breakdown and materialize it: create the middle slices with `new-slice` (bare folders — never pre-fill their `plan.md`), and seed `phase.md` with the decomposition (breakdown + rationale), the accounts-plane context map below, the phase constraints, and doc-impact expectations. No implementation in this slice.

## What P18 must deliver (confirmed intent — see ../../intent.md)

1. **Signup auto-provisions** a `"default"` org + `"default"` project (replacing `"<localpart>'s workspace"` naming; today signup creates no project at all).
2. **vk_ keys mintable at org level** — makes de-facto behavior honest: schema binds keys to a project (`project_credentials.project_id`) but authorization is already tenant-wide (`server/api_auth.py:154-162` → `ctx.tenant_id`; the binding only drives usage attribution).
3. **Projects are get-or-create by name** on save (today the Postgres registry row exists only via `POST /app/projects` or seed; saves to unregistered names work on the content plane but leave no registry row).
4. **CLI**: keep P13 repo-basename default project, add `--project` override, fall back to `"default"` outside a git repo.

Out of scope (do not create slices for these): org creation + member invites (deferred **D14**), public/private projects (**P19**), landing/hero/onboarding (**P20**).

## Verified current-state map (orchestrator exploration, 2026-07-22 — verify anything you build on)

- **Control plane** (Postgres, tenant mode iff `DATABASE_URL`): `users`, `tenants` (name only; ownership via `tenant_members` role=owner), `projects` (tenant_id, name — **no UNIQUE(tenant_id,name)**), `project_credentials` (project_id FK, token_prefix, token_hash sha256, revoked_at — no expiry/scopes), `auth_tokens`, `usage_events`. ORM `server/persistence/models.py`; migrations `alembic/versions/0001,0002` — applied **manually** in prod (`docker compose exec api alembic upgrade head`, then `python -m server.seed`).
- **Content plane** (disposable SQLite): `documents.tenant_id TEXT DEFAULT ''` sentinel, `UNIQUE(tenant_id, rel_path)`; rebuilt from files on boot; self-migrates in `server/db.py:init_db`.
- **Signup** `server/auth_api.py:215-238`: argon2id, tenant named `f"{email.localpart}'s workspace"` via `create_tenant_with_owner` (`server/accounts/service.py:99-126`), 30-day session token, **no project created**. Per-IP throttle on signup/login.
- **Minting** `server/app_api.py:148-170` `POST /app/projects/{id}/credentials`: `vk_` + `secrets.token_urlsafe(32)`, sha256+12-char prefix stored, plaintext returned once. Web UI `web/src/app/(app)/projects/[projectId]/mint-credential-form.tsx`.
- **Resolver** `server/api_auth.py:130-175`: master `KB_API_TOKEN` → tenant #1 (cached once, `:72-77`); `vk_` → `ctx(tenant_id=project.tenant_id, project_id, credential_id)`; session token → user's first tenant. Context = `ApiAuthContext(tenant_id, project_id, credential_id, is_public)`.
- **Write path** `server/main.py:389-592` `POST /api/documents`: any resolvable credential authorizes (tenant-level); `body.project` free-form name, never checked against the credential; metering `server/usage/metering.py:50-98` resolves project by **name first**, falls back to `ctx.project_id`, else tenant-level NULL.
- **CLI** `cli/src/knowledge_cli/knowledge.py`: `default_project()` (:93-109) = repo-root basename → stored `api.project` → default; project sent as JSON body field (`client.py:282`). **Skill** `plugin/skills/explain/SKILL.md` (~:340,357,370): project = repo dir name verbatim; env `KB_API_BASE_URL`/`KB_API_TOKEN` take precedence. Setup skill `plugin/skills/setup/SKILL.md:48-51`: "one vk_, all repos; the key's own bound project is only how usage is attributed".
- **Parity gates** (P17): SaaS server mirrored in `plugin/templates/kb` (CI `plugin_parity`); shipped skill copies guarded by `skills_parity`. **Any server/skill edit must be mirrored in the same slice to keep CI green.**
- **Web app** (P12 design system): topbar label "Workspace" + tenant name (`web/src/content/app.ts:35`); signup copy "A workspace is created for you automatically" (`web/src/content/auth.ts:73`).
- Invariants: single uvicorn worker (write lock + in-process rate limiter depend on it); frozen public contract `/api/*` + `/auth/*` + `/app/*` — **additive only**; tests pytest (accounts coverage Postgres-gated via `KB_TEST_DATABASE_URL`, else skips); E2E `scripts/onboarding_smoke.py`; prod deploy `deploy/deploy.sh` (api runs from bind mount; schema changes are manual alembic + seed).

## Design stances (deviate only with strong grounds, recorded in phase.md)

1. **No `tenants` → `orgs` rename** in either plane. The tenant id threads through SQLite `documents.tenant_id`, usage_events, resolver, seed, MCP, web BFF; a rename is a huge mechanical diff with prod regression risk and zero behavior change. The tenant row **is** the org; product-facing naming becomes "org" (web copy, docs, skill text). Record this as a decision (decisions-doc impact).
2. **Org-level credentials additively**: suggested shape — add `tenant_id` to `project_credentials` (backfilled from the bound project), make `project_id` nullable; org-level rows have `project_id NULL`; existing project-bound keys keep working unchanged; resolver reads `tenant_id` directly.
3. **Get-or-create requires `UNIQUE(tenant_id, name)` on `projects`** (migration must handle pre-existing dupes defensively).
4. Signup provisions org `"default"` + project `"default"` in one transaction; seed stays idempotent; existing tenants keep their names (labels only) and gain `"default"` lazily via get-or-create.
5. **Prod rollout is its own final middle slice** with operator gates (alembic 0003 + seed + deploy + extended `onboarding_smoke.py`: new signup → default org/project → org key → save via repo-basename / `--project` / outside-repo `"default"` → old project-bound key still works).
6. Web UI follows the **existing P12 design system/components** (keys table + mint modal already exist per-project) — no new visual language, so no Claude Design round. If you conclude a genuinely new-design surface is required, flag it in `phase.md`; do not design it.

## Suggested slice shape (guidance — you own the final breakdown)

~5 middle slices, e.g.: (S1) alembic 0003 + models + signup/seed default-org/default-project provisioning; (S2) resolver + org-level mint endpoint + write-path get-or-create + metering; (S3) web app org-keys surface + workspace→org copy; (S4) CLI `--project`/`"default"` fallback + skill/setup text + parity mirrors; (S5) prod migration + deploy + E2E (operator gates). Mirror parity files **in whichever slice touches them**. Set each slice's `--risk` deliberately (it picks the executor tier — the phase's main cost lever; `low` only for fully mechanical work — nothing here looks `low`). Use explicit `--order` values so REVIEW stays last.

## Deliverables

1. Middle slices created via `python3 scripts/workflow.py new-slice --phase P18 --slice P18.S<n> --name "..." --kind implementation --risk <r> --order <k>` — bare folders only.
2. `phase.md` seeded: Context (the map above, corrected by anything you verify differently), Decomposition (each slice's scope + rationale + risk reasoning), Constraints (parity gates, frozen contract, D14/P19/P20 boundaries, single-worker invariant), Doc impact expectations (which of the 11 docs each slice will likely touch), resolved Open Questions.
3. `result.md` in this slice's folder: what you created, validation outcomes, deviations.
4. Structured verdict per your agent contract.

## Validation

- `python3 scripts/workflow.py validate` passes.
- `python3 scripts/workflow.py next` points at the first middle slice (after this slice is finished by the orchestrator).
- No middle-slice `plan.md` files exist; no source/docs/web changes.
