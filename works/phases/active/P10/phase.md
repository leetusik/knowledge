# Phase P10: Accounts, Tenancy & Tenant-Scoped Knowledge API

_Intent: see [intent.md](intent.md)._

## Objective

Introduce users/tenants/projects with signup/login/session auth and API credentials; scope the knowledge API (write/read/search) per tenant; seed the operator's own tenant and migrate the live knowledge.hi2vi.com corpus in as tenant #1

## Context

**This phase is the foundation of a five-phase SaaS pivot (P10–P14).** It turns a single-tenant deployment (one shared `KB_API_TOKEN`, no user model) into a multi-tenant SaaS with **no paid plan at launch**. Free = knowledge saving + the Claude Code `/explain`-style connection + all web UI features (graph included). Paid = the retriever endpoint for external AI agents — **deferred (D6)**, do not build here. Hosted SaaS is the flagship; the MIT self-host/plugin path stays as the open-core option, not actively extended.

### Two-plane architecture (the mental model every slice works within)

P10 makes the FastAPI app a **two-plane app in one process**:

- **Control plane = Postgres, transactional, async, mirrors vocky.** `/auth/*` (sessions) and `/app/*` (projects + `vk_` credentials). Tenant-scoped; cross-tenant access → 404. New Postgres service in `compose.yml` + `compose.prod.yml`; async SQLAlchemy 2.0 (`Mapped`/`mapped_column`) + Alembic migrations + `argon2-cffi`. **Six tables** ported from vocky (see reference map).
- **Content plane = unchanged.** Files under `docs/` (canonical) plus a **new namespaced, non-published root** for new tenants; disposable `kb.sqlite3` (FTS5 + vectors) rebuilt from files on boot. `WRITE_LOCK` + **single uvicorn worker** preserved — Postgres does **not** touch the content write lock. Both planes live in one FastAPI app (async accounts endpoints alongside the existing sync content endpoints).

**Solo-owner MVP (mirror vocky):** `require_user` resolves `tenants[0]`; no active-tenant switching, no invite/role UI. `tenant_members` is the ownership join (there is **no** owner column on `tenants`).

**Storage decision:** namespaced, `docs/`-canonical. Tenant #1 keeps `docs/<project>/…` **unchanged** (frozen contract + public mkdocs site intact); new tenants' content lives under a separate non-published root excluded from the mkdocs build. **No** invariant inversion (content stays files-canonical + disposable SQLite), **no** per-tenant git repos, **no** per-tenant public sites (P12 owns dashboards; P12 intent owns per-tenant sites if ever).

**Legacy bearer decision:** `KB_API_TOKEN` is kept as **tenant #1's legacy bearer** — it resolves to the operator's tenant #1, so the live hi2vi content agent needs **zero** changes. New tenants use `vk_` keys; session tokens drive the control plane and own-corpus reads.

### Two hard couplings — every downstream slice MUST respect these

1. **Startup-reindex / `docs/`-canonical.** `kb.sqlite3` is rebuilt from files on every boot (`KB_STARTUP_REINDEX=true`; `server/main.py` `lifespan` ~L34–48). A `tenant_id` that lives **only** in the DB is wiped on every reindex unless `server/reindex.py` re-derives it from the file path → **tenant identity must live durably in the file path**, not just in a DB column.
2. **Frozen additive-only `POST /api/documents`.** See `docs/current/api.md` §"Frozen consumer contract (P8)" (~L116–127). No tenant field on the body; `<project>/…` is baked into `url` + `rel_path`; the hi2vi content agent codes against this exact shape → **tenant is derived from the credential, never a body field; namespacing must stay out of tenant #1's client-visible paths; only additive response fields allowed.**

## Decomposition

Six implementation slices, chained S1→S6 (each `--depends-on` its predecessor):

| Slice | Name | Risk | Depends on |
|-------|------|------|-----------|
| P10.S1 | Accounts persistence: Postgres + schema + Alembic + accounts layer | high | — |
| P10.S2 | Auth surface `/auth/*` + `require_user` session guard | high | P10.S1 |
| P10.S3 | Control plane `/app/*`: tenant-scoped projects + `vk_` credentials | **medium** | P10.S2 |
| P10.S4 | `/api/*` credential auth: resolve credential → tenant+project | high | P10.S3 |
| P10.S5 | Content tenant-scoping: `documents.tenant_id` + reindex + namespaced storage | high | P10.S4 |
| P10.S6 | Seed tenant #1 + migrate live corpus + E2E onboarding smoke | high | P10.S5 |

### Scope per slice (authoritative; each slice writes its own `plan.md` at its turn)

- **S1 — Accounts persistence.** Postgres compose service (both compose files) + config (`DATABASE_URL`); async SQLAlchemy models for the 6 tables + a `NAMING_CONVENTION` base; Alembic initial migration (async `env.py`); accounts layer ported from vocky: `security` (argon2id `hash_password`/`verify_password`, `generate_opaque_token` = `secrets.token_urlsafe(32)`, `sha256_hex`), `types` (transport-neutral records; credential/token records omit `token_hash`), `repository` (ORM boundary, no commits), `service` (owns transactions, domain errors incl. `DuplicateEmailError`, `create_tenant_with_owner`). New deps: sqlalchemy, an async pg driver (asyncpg or psycopg), alembic, argon2-cffi. **Resolves Open Question:** async-SQLAlchemy-in-sync-app vs sync-SQLAlchemy+psycopg (an integration-shape call, not a product fork — single worker means no async-throughput driver; pick the simpler clean integration).
- **S2 — Auth surface.** `/auth/*`: `signup` (create user + `create_tenant_with_owner` + mint session → 201 `{token,user,tenant}`), `login` (enumeration-safe generic 401), `logout` (204), `me` (200). `_mint_token`, 30-day TTL, email `strip().lower()` + `@` check, serializers never emit hashes. `require_user(request) -> AuthContext(user,tenant)` guard: bearer → `get_active_auth_token_by_hash(sha256_hex)` → user → `tenants[0]`. Ports vocky `auth_api.py` + `accounts/auth.py`.
- **S3 — Control plane `/app/*`.** `GET /app/tenant`; `GET|POST /app/projects`; `GET /app/projects/{id}`; `POST|GET /app/projects/{id}/credentials`; `DELETE …/credentials/{cid}`. All `require_user`-guarded, scoped to `ctx.tenant.id`; `_load_scoped_project` returns 404 for missing **and** cross-tenant. `vk_` mint: `key=f"vk_{generate_opaque_token()}"`, `token_prefix=key[:12]`, `token_hash=sha256_hex(key)`, raw key returned once. Ports vocky `app_api.py`. The `projects` table becomes the source-of-truth for project→tenant. (Mid risk: this is the one clean mechanical CRUD port.)
- **S4 — `/api/*` credential auth.** Replace `require_bearer`/`require_read_bearer` (`server/main.py` ~L69–107) on `/api/*` with a credential resolver → `(tenant, project?)`: a `vk_` key → its project+tenant; `KB_API_TOKEN` → tenant #1 (legacy); a session token → its user's `tenants[0]` (reads/own-corpus). Preserve every frozen `POST /api/documents` shape (tenant derived, not a body field; `project` must belong to the tenant; 401/409/422 meanings unchanged). Keep localhost-open behavior for local dev where applicable. **Resolves Open Question:** whether session tokens are accepted on `/api/*` reads.
- **S5 — Content tenant-scoping.** Add `documents.tenant_id` (SQLite, via the `db.init_db` idempotent-ALTER pattern, ~L84–97); write path routes tenant #1 → `docs/<project>/…`, other tenants → the namespaced non-published root (touches `server/documents.py rel_path` ~L87, `server/main.py` write path staged/landing paths in `create_document` ~L243–407); `mkdocs.yml` `exclude_docs`/`RESERVED_DIRS` so the namespaced root isn't published; `server/reindex.py` derives `tenant_id` from the path (T1 legacy path → tenant #1; namespaced path → resolve slug→tenant via Postgres); add a tenant filter to **every** read/search/list/by-path/by-id/delete query (`server/db.py` `_filtered` ~L193, `list_tags` ~L249, `list_projects` ~L267, `get_all_embeddings` ~L330, `get_document`/`get_document_by_path` ~L179–190, `delete_document_by_path` ~L238; `server/search.py` `search` ~L193 count/rows/vector arms). Cross-tenant fetch by id/path → 404. **Resolves Open Question:** exact namespaced-root path + mkdocs-exclusion mechanism.
- **S6 — Seed + migrate + smoke.** Seed operator user + tenant #1 + projects + credential; migrate the 4 live projects (`bootstrap_agentic_workspace`, `changple5`, `hi2vi_web`, `hi2vi`) to tenant #1 (create their `projects` rows; ensure reindex assigns their `documents.tenant_id`); E2E onboarding smoke mirroring vocky `smoke.py` (signup → `POST /app/projects` → mint `vk_` key → `POST /api/documents` → scoped `GET /api/search`/documents), asserting a second tenant **cannot** read tenant #1's corpus. No seed/backfill precedent exists in this repo — vocky is the pattern.

### Risk-differentiation rationale

- **S3 = medium (the one cost saving).** `/app` CRUD is a clean mechanical port of vocky `app_api.py` with no frozen-contract surface and no new datastore — the least judgment-heavy slice.
- **Everything else = high.** S1 stands up a whole new datastore + migrations + a security-critical accounts layer; S2 is the auth surface (security-critical, enumeration-safety, session tokens); S4 rewrites the `/api/*` auth against the **frozen** `POST /api/documents` contract; S5 threads tenant scoping through the content plane across the DB-vs-file-path derivation coupling; S6 does a live corpus migration where a mistake is externally visible.
- **S2/S3 split** because auth is security-critical and `/app` isn't — different tiers, different care.
- **S4/S5 split** because credential-resolution (S4) and content-scoping (S5) are the two riskiest frozen-contract-adjacent jobs; keeping them separate keeps each reviewable in isolation.
- **Chain S1→S6:** every slice consumes its predecessor (models → auth → projects → credential auth → content scoping → seed/migrate), so a strict linear dependency is honest.

## Findings & Notes

_Durable findings and cross-slice notes; `DECOMP` seeds this, and each slice appends when it finishes._

### Vocky reference map — `/Users/sugang/projects/personal/vocky` (verified 2026-07-16)

The closest prior art; port from it, do not reinvent. Paths confirmed to exist:

- `src/vocky/persistence/models.py` — the 6 accounts tables we port (UUID PKs): `users` (L170), `tenants` (L186), `tenant_members` (L201), `projects` (L231), `project_credentials` (L252), `auth_tokens` (L283). (Note: this file **also** holds 3 vocky-only feedback tables — `feedback_events`/`_comments`/`_attachments` at L25/L104/L136 — which we do **not** port.)
- `src/vocky/persistence/base.py` — `NAMING_CONVENTION` (L6) + `Base` with `metadata = MetaData(naming_convention=NAMING_CONVENTION)` (L18). Port this named-constraint convention so Alembic autogenerate is stable.
- `src/vocky/accounts/` — `security.py`, `types.py` (transport-neutral records; credential/token records omit `token_hash`), `repository.py` (ORM boundary, **no commits**), `service.py` (owns transactions + domain errors), `auth.py` (`require_user`).
- `src/vocky/auth_api.py` — `/auth/*`; signup provisions user + tenant + owner + session in one transaction.
- `src/vocky/app_api.py` — `/app/*`; `vk_` mint at **L234** (`key = f"vk_{generate_opaque_token()}"`, `token_prefix=key[:12]` L238, `token_hash=sha256_hex(key)` L239); `_load_scoped_project` returns 404 for both missing and cross-tenant. Credential serializer never exposes `token_hash` (L80/L86).
- `src/vocky/auth.py` (root) — `ProjectCredentialAuthMiddleware` is **identity-only** in vocky (no data-plane isolation).
- `alembic/` at the **vocky repo root** (not under `src/vocky/`) — async `alembic/env.py` is the async-migration reference. (The initial accounts-tenancy migration is the shape to mirror.)
- `src/vocky/smoke.py` — the onboarding-over-HTTP sequence S6's E2E smoke mirrors.

**Key divergence — the work vocky never shipped:** vocky **deferred** data-plane tenant isolation (its feedback rows carry no `tenant_id`; its credential middleware is identity-only). Our intent requires content isolation from day one → that is **S4 + S5**, and it has no vocky precedent to copy — it is the phase's genuinely new work.

### Current-backend integration points — `/Users/sugang/projects/personal/knowledge/server/` (line anchors approximate; they will drift as slices edit)

- `main.py` — auth deps `require_bearer` (L69) / `require_read_bearer` (L82), `_public_doc` through ~L107; `WRITE_LOCK` (L57); `lifespan` startup reindex (L34–48); write path `create_document` (~L243–407) incl. publish-on-write; delete path (~L410+). `require_read_bearer` is a no-op unless `KB_REQUIRE_READ_AUTH` **and** `KB_API_TOKEN` are both set; `require_bearer` is a no-op when `KB_API_TOKEN` is unset (localhost-open) — S4 must preserve these open-by-default local semantics.
- `config.py` — env resolved per-call: `docs_root()` (L26), `db_path()` (L31), `api_token()`→`KB_API_TOKEN` (L46), `KB_GIT_PUSH` (L63), `KB_REQUIRE_READ_AUTH` (L77), `KB_STARTUP_REINDEX` (L105, default true). S1 adds `DATABASE_URL` here.
- `db.py` (SQLite content plane) — `_SCHEMA` (L21), `init_db` idempotent-ALTER pattern (L84–93, `executescript`); query builders S5 must tenant-filter: `get_document` (L179), `get_document_by_path` (L184), `_filtered` (L193, used by list/count), `delete_document_by_path` (L238), `list_tags` (L249), `list_projects` (L267), `get_all_embeddings` (L330).
- `documents.py` — `rel_path(project,date,slug)` (L87), `ensure_project_landing` (L342).
- `search.py` — `search` (L193): count / rows / vector arms all need the tenant filter.
- `reindex.py` — `RESERVED_DIRS = {"current","versions"}` (L23); project derived as `Path(rel).parts[0]` (L37); reserved-dir guards at L171/L234. This is where S5 re-derives `tenant_id` from the path (the hard coupling #1).
- `gitops.py` — scoped add/commit/push (publish-on-write).
- Deployment: `compose.yml` (kb + api) and `compose.prod.yml` (knowledge-api + knowledge-site, **single worker**) — S1 adds a Postgres service to both.

### Other notes

- **Solo-owner MVP:** one user = one tenant via `tenant_members`; `require_user` → `tenants[0]`. No tenant switching, invites, or role management in P10.
- **`last_used_at` stamping is optional** on credentials/tokens (vocky deferred it) — leave out unless a slice finds it cheap.
- **Deferred:** D6 (paid-plan retriever endpoint for external AI agents) is this phase's standing deferral — `works/deferred/open/D6`. Do **not** build the paid retriever in P10.

### Doc-impact list (for `P10.REVIEW` to consolidate into versions — do NOT version per slice)

Later slices append one-liners here as they change durable truth; the review slice consolidates each area into a single new doc version. Areas P10 is expected to touch:

- **architecture** — two-plane app (Postgres control plane + unchanged content plane).
- **backend** — accounts layer (security/types/repository/service), async-vs-sync SQLAlchemy integration decision.
- **data** — Postgres accounts schema (6 tables) + `documents.tenant_id` + namespaced storage root.
- **api** — new `/auth/*` and `/app/*` surfaces; `/api/*` credential auth (resolver); frozen `POST /api/documents` contract preserved additively.
- **security** — multi-tenant threat-model shift (real tenant data + PII): argon2id password hashing, sha256 token hashing at rest, cross-tenant isolation.
- **operations** — Postgres service + migrations, seed/backfill runbook, still single-worker.
- **decisions** — ADRs: Postgres-over-SQLite for accounts; namespaced `docs/`-canonical storage; `KB_API_TOKEN` as legacy tenant-#1 bearer.

## Constraints

- **Single uvicorn worker preserved** — the content `WRITE_LOCK` is an in-process lock; never scale to multiple workers. Postgres (async) sits alongside but does not change this.
- **Frozen `POST /api/documents` contract is additive-only** (see api.md §"Frozen consumer contract (P8)"): no new required fields, tenant never a body field, tenant #1's `url`/`rel_path` shapes unchanged, only additive response fields.
- **Content stays files-canonical + disposable SQLite** — no invariant inversion, no per-tenant git repos.
- **No per-tenant public sites in P10** — dashboards are P12; per-tenant published sites are out of scope here.
- **Tenant #1 (live hi2vi corpus) must keep working with zero client changes** — `KB_API_TOKEN` remains valid and resolves to tenant #1.

## Open Questions

- **Async vs sync SQLAlchemy integration shape** — resolve in **S1**. Single worker means no async-throughput requirement; pick the simpler clean integration (async-in-sync-app vs sync+psycopg). Integration-shape call, not a product fork.
- **Exact namespaced-root path + mkdocs exclusion mechanism** — resolve in **S5** (where the non-published tenant root lives on disk and how `mkdocs.yml`/`RESERVED_DIRS` excludes it from the public build).
- **Whether session tokens are accepted on `/api/*` reads** — resolve in **S4** (session token → `tenants[0]` for own-corpus reads vs `vk_`/`KB_API_TOKEN` only).
