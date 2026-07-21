# P10.DECOMP — plan (orchestrator → slice-executor-high)

You are executing the **decomposition slice** for phase **P10 — "Accounts, Tenancy & Tenant-Scoped
Knowledge API."** Your job is to **create the middle slices** and **seed `works/phases/active/P10/phase.md`**.
You write **no source code**, you do **not** pre-fill any middle slice's `plan.md`, and you do **not** run
`doc-new-version` (durable docs are versioned once, at `P10.REVIEW`). Read `works/phases/active/P10/intent.md`
for the operator's confirmed intent; this plan carries the design decisions already confirmed with the operator.

---

## 1. Confirmed design decisions (operator-approved — treat as settled)

1. **Accounts/tenancy canonical store = Postgres** (vocky-parity). A new Postgres service (compose + compose.prod),
   async SQLAlchemy 2.0 (`Mapped`/`mapped_column`) + **Alembic** migrations + `argon2-cffi`, mirroring the vocky
   accounts stack. **Six tables** (from vocky `src/vocky/persistence/models.py`): `users` (email unique, argon2id
   `password_hash`), `tenants` (no owner column — ownership lives in the join), `tenant_members` (`tenant_id`,
   `user_id`, `role`; UNIQUE(tenant_id,user_id)), `projects` (`tenant_id` FK, name), `project_credentials`
   (`project_id` FK, `token_prefix`, `token_hash` UNIQUE, `revoked_at`; the `vk_` keys, sha256 at rest),
   `auth_tokens` (`user_id` FK, `token_hash` UNIQUE, `expires_at`; opaque session tokens, sha256, 30-day TTL).
2. **Corpus storage = namespaced, `docs/`-canonical.** Tenant #1 keeps `docs/<project>/…` **unchanged** (frozen
   contract + public mkdocs site intact). New tenants' content lives under a **separate, non-published root**
   (excluded from the mkdocs build); `server/reindex.py` derives `documents.tenant_id` from the file path so it
   survives DB rebuilds. **No** invariant inversion (content stays files-canonical + disposable SQLite), **no**
   per-tenant git repos, **no** per-tenant public sites (P12 owns that — see P12 intent).
3. **`KB_API_TOKEN` kept as tenant #1's legacy bearer.** It resolves to the operator's tenant #1; the live hi2vi
   content agent needs **zero** changes. New tenants use `vk_` keys; session tokens drive the control plane and
   own-corpus reads.

**Derived architecture (two-plane app):** control plane = Postgres, transactional, async, mirrors vocky
(`/auth/*` sessions + `/app/*` projects/`vk_` credentials, tenant-scoped, cross-tenant → 404). Content plane =
unchanged (files `docs/` + new namespaced root + disposable `kb.sqlite3` FTS5/vectors; `WRITE_LOCK` + **single
uvicorn worker** preserved — Postgres does not touch the content write lock). Both in one FastAPI app (async
accounts endpoints alongside the existing sync content endpoints). **Solo-owner MVP** (mirror vocky):
`require_user` resolves `tenants[0]`, no active-tenant switching. **Frozen-contract survival:** tenant comes from
the credential (never a body field); `project` must belong to the credential's tenant; `rel_path`/`url` shapes
unchanged for tenant #1; only additive response fields.

**Two hard couplings** every downstream slice must respect (put these in phase.md verbatim):
- **Startup-reindex / `docs/`-canonical:** `kb.sqlite3` is rebuilt from files on every boot
  (`KB_STARTUP_REINDEX=true`, `server/main.py` lifespan ~L34–48). A `tenant_id` living only in the DB is wiped
  unless `server/reindex.py` re-derives it → tenant identity must live durably in the **file path**.
- **Frozen additive-only `POST /api/documents`** (`docs/current/api.md` §"Frozen consumer contract (P8)",
  ~L116–127): no tenant field; `<project>/…` baked into `url`+`rel_path`; hi2vi content agent codes against it →
  tenant from credential only; namespacing must stay out of tenant #1's client-visible paths.

## 2. Create these six middle slices (bare folders — no `plan.md`)

Run exactly (adjust nothing but typos); `--kind implementation`, `--order` and `--depends-on` as shown, `--risk`
is the cost lever (S3 mid, rest high):

```
python3 scripts/workflow.py new-slice --phase P10 --slice P10.S1 --name "Accounts persistence: Postgres + schema + Alembic + accounts layer" --kind implementation --risk high   --order 1
python3 scripts/workflow.py new-slice --phase P10 --slice P10.S2 --name "Auth surface /auth/* + require_user session guard"                     --kind implementation --risk high   --order 2 --depends-on P10.S1
python3 scripts/workflow.py new-slice --phase P10 --slice P10.S3 --name "Control plane /app/*: tenant-scoped projects + vk_ credentials"        --kind implementation --risk medium --order 3 --depends-on P10.S2
python3 scripts/workflow.py new-slice --phase P10 --slice P10.S4 --name "/api/* credential auth: resolve credential -> tenant+project"          --kind implementation --risk high   --order 4 --depends-on P10.S3
python3 scripts/workflow.py new-slice --phase P10 --slice P10.S5 --name "Content tenant-scoping: documents.tenant_id + reindex + namespaced storage" --kind implementation --risk high --order 5 --depends-on P10.S4
python3 scripts/workflow.py new-slice --phase P10 --slice P10.S6 --name "Seed tenant #1 + migrate live corpus + E2E onboarding smoke"           --kind implementation --risk high   --order 6 --depends-on P10.S5
```

**Scope per slice** (record in phase.md; do NOT write their `plan.md`):
- **S1** — Postgres compose service + config (`DATABASE_URL`); async SQLAlchemy models for the 6 tables + a
  `NAMING_CONVENTION` base; Alembic initial migration (async `env.py`); accounts layer ported from vocky:
  `security` (argon2id `hash_password`/`verify_password`, `generate_opaque_token` = `secrets.token_urlsafe(32)`,
  `sha256_hex`), `types` (transport-neutral records; credential/token records omit `token_hash`), `repository`
  (ORM boundary, no commits), `service` (owns transactions, domain errors incl. `DuplicateEmailError`,
  `create_tenant_with_owner`). New deps: sqlalchemy, an async pg driver (asyncpg or psycopg), alembic,
  argon2-cffi. **Resolve here:** async-SQLAlchemy-in-sync-app vs sync-SQLAlchemy+psycopg (integration-shape call,
  not a product fork — single worker means no async throughput driver; pick the simpler clean integration).
- **S2** — `/auth/*`: `signup` (create user + `create_tenant_with_owner` + mint session → 201 `{token,user,tenant}`),
  `login` (enumeration-safe generic 401), `logout` (204), `me` (200). `_mint_token`, 30-day TTL, email
  `strip().lower()` + `@` check, serializers never emit hashes. `require_user(request) -> AuthContext(user,tenant)`
  guard (bearer → `get_active_auth_token_by_hash(sha256_hex)` → user → `tenants[0]`). Ports vocky `auth_api.py`
  + `accounts/auth.py`.
- **S3** — `/app/*`: `GET /app/tenant`; `GET|POST /app/projects`; `GET /app/projects/{id}`;
  `POST|GET /app/projects/{id}/credentials`; `DELETE …/credentials/{cid}`. All `require_user`-guarded, scoped to
  `ctx.tenant.id`; `_load_scoped_project` returns 404 for missing AND cross-tenant. `vk_` mint:
  `key=f"vk_{generate_opaque_token()}"`, `token_prefix=key[:12]`, `token_hash=sha256_hex(key)`, raw key returned
  once. Ports vocky `app_api.py`. Projects table becomes the source-of-truth for project→tenant.
- **S4** — Replace `require_bearer`/`require_read_bearer` (`server/main.py` L69–107) on `/api/*` with a
  credential resolver → `(tenant, project?)`: a `vk_` key → its project+tenant; `KB_API_TOKEN` → tenant #1
  (legacy); a session token → its user's `tenants[0]` (for reads/own-corpus). Preserve every frozen
  `POST /api/documents` shape (tenant derived, not a body field; `project` must belong to the tenant; 401/409/422
  meanings unchanged). Keep localhost-open behavior for local dev where applicable.
- **S5** — `documents.tenant_id` (SQLite, via the `db.init_db` idempotent-ALTER pattern, L84–97); write path
  routes tenant #1 → `docs/<project>/…`, other tenants → the namespaced non-published root (touching
  `server/documents.py rel_path` L87, `server/main.py` write path L286–361 staged paths, landing); `mkdocs.yml`
  `exclude_docs`/`RESERVED_DIRS` so the namespaced root isn't published; `server/reindex.py` derives `tenant_id`
  from the path (T1 legacy path → tenant #1; namespaced path → resolve slug→tenant via Postgres); add a tenant
  filter to EVERY read/search/list/by-path/by-id/delete query (`server/db.py` `_filtered` L193, `list_tags`
  L249, `list_projects` L267, `get_all_embeddings` L330, `get_document`/`get_document_by_path` L179–190,
  `delete_document_by_path`; `server/search.py` `search` L193–329 count/rows/vector arms). Cross-tenant fetch by
  id/path → 404.
- **S6** — Seed operator user+tenant #1+projects+credential; migrate the 4 live projects
  (`bootstrap_agentic_workspace.sh`, `changple5`, `hi2vi_web`, `hi2vi`) to tenant #1 (create their `projects`
  rows; ensure reindex assigns their `documents.tenant_id`); E2E onboarding smoke mirroring vocky `smoke.py`
  (signup → `POST /app/projects` → mint `vk_` key → `POST /api/documents` → scoped `GET /api/search`/documents),
  asserting a second tenant cannot read tenant #1's corpus. (No seed/backfill precedent exists in this repo —
  vocky is the pattern.)

## 3. Seed `works/phases/active/P10/phase.md`

Fill its sections (Context, Decomposition, Findings & Notes, Constraints, Open Questions):
- **Context:** the two-plane architecture + the two hard couplings above.
- **Decomposition:** the six-slice table + the risk-differentiation rationale (S3 is the one clean mechanical
  `/app` CRUD port → mid; auth, new datastore, frozen contract, cross-store derivation, live migration → high;
  S2/S3 split because auth is security-critical and `/app` isn't; S4/S5 split because credential-resolution vs
  content-scoping are the two riskiest frozen-contract-adjacent jobs; chain S1→S6).
- **Findings & Notes** (the cross-slice reference every later slice reads at start):
  - **Vocky reference map** (`/Users/sugang/projects/personal/vocky`): `src/vocky/persistence/models.py` (6
    tables, UUID PKs, named-constraint `NAMING_CONVENTION` in `persistence/base.py`); `accounts/`
    (`security.py`, `types.py`, `repository.py` ORM-boundary/no-commit, `service.py` transactions+domain-errors,
    `auth.py` `require_user`); `auth_api.py` (`/auth/*`, signup provisions user+tenant+owner+session);
    `app_api.py` (`/app/*`, `vk_` mint at ~L234, `_load_scoped_project` 404-both); `auth.py` root
    `ProjectCredentialAuthMiddleware` (identity-only in vocky); `alembic/versions/…add_accounts_tenancy.py` +
    async `alembic/env.py`; `smoke.py` onboarding sequence. **Key divergence:** vocky **deferred** data-plane
    tenant isolation (its feedback rows have no tenant_id); our intent requires it from day one → that is S4+S5,
    work vocky never shipped.
  - **Current-backend integration points** (`/Users/sugang/projects/personal/knowledge/server/`): `main.py`
    (auth deps L69–107, write path `create_document` L243–407 incl. `WRITE_LOCK` L286 + publish-on-write
    L355, delete L410–), `config.py` (env resolved per-call; `KB_API_TOKEN` L44, `KB_GIT_PUSH` L55,
    `KB_REQUIRE_READ_AUTH` L67, `KB_STARTUP_REINDEX` L100, `docs_root`/`db_path`), `db.py` (`_SCHEMA` L21,
    `init_db` idempotent-ALTER L84, query builders), `documents.py` (`rel_path` L87, `ensure_project_landing`
    L342), `gitops.py` (scoped add/commit/push), `search.py` (`search` L193), `reindex.py` (project =
    `Path(rel).parts[0]` L37, `RESERVED_DIRS` L23). Deployment: `compose.yml` (kb+api), `compose.prod.yml`
    (knowledge-api + knowledge-site, single worker) — S1 adds a Postgres service to both.
  - **Solo-owner MVP** note; **`last_used_at`** stamping optional (vocky deferred it).
  - **Doc-impact list** (for `P10.REVIEW` to consolidate into versions — do NOT version now): architecture
    (two-plane + Postgres control plane); backend (accounts layer, async/sync split); data (Postgres accounts
    schema + `documents.tenant_id` + namespaced storage); api (`/auth`+`/app` surfaces, `/api/*` credential auth,
    frozen contract preserved additively); security (multi-tenant threat-model shift — real tenant data + PII;
    argon2id, token hashing, cross-tenant isolation); operations (Postgres service, migrations, seed/backfill
    runbook, still single-worker); decisions (ADRs: Postgres-over-SQLite for accounts, namespaced
    `docs/`-canonical storage, `KB_API_TOKEN` as legacy tenant-#1 bearer).
- **Constraints:** single uvicorn worker preserved; frozen `POST /api/documents` contract additive-only; content
  stays files-canonical + disposable SQLite; no per-tenant public sites in P10.
- **Open Questions:** async vs sync SQLAlchemy integration shape (resolve in S1); exact namespaced-root path +
  mkdocs exclusion mechanism (resolve in S5); whether session tokens are accepted on `/api/*` reads (resolve in S4).
- Note **D6** (paid retriever endpoint, `works/deferred/open/D6`) as the phase's standing deferral — do **not**
  create it here.

## 4. Finish

Write `result.md` (what you created, any deviations, the final slice list). Append any durable cross-slice notes
to `phase.md`. Return a structured verdict — `done` when the six slices exist as bare folders and `phase.md` is
seeded. Do **not** commit, do **not** transition phase/slice status, do **not** touch source. The orchestrator
runs `validate`, `finish-slice`, and commits.
