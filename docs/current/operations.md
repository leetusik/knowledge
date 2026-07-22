---
doc_id: operations
version: v0020
created_at: 2026-07-22T15:28:37+09:00
source: P19.REVIEW
summary: P19 public-projects cutover: additive 0004 no mint-window; onboarding_smoke public-link leg; anonymous surface live 401 to 404
previous: v0019_p18_accounts-v2_prod_cutover_0003_migration_makes_ordering_load-bearing_reconcile-_migrate-_recreate_back-to-back_executed_verified_live_onboarding_smoke_gains_an_org-model_leg
---

# Operations

## Status

Both tracks operational, and **as of P9 the whole site — the human web UI *and* the machine API — is self-hosted in production** at <https://knowledge.hi2vi.com>. Two containers run on the box (`knowledge-api` + a `mkdocs serve` **`knowledge-site`** live-serve viewer) behind **two-location edge routing** (`/` → the site, `/api/*`+`/healthz` → the api), with **publish-on-write** — an agent write reaches the public site with no operator action and **no ~65 s Pages lag** (the box serves the doc off the same clone the instant it is written; *fresh-on-write*, proven live at P9.S5). A **manual-dispatch (`workflow_dispatch`) `Production Deploy` GitHub Action** automates the box deploy — reconcile the publish-on-write clone + rebuild/health-gate **both** services + re-apply the edge vhost (see *Automated production deploy* below). **GitHub Pages is retired for this repo's site** (P9); the shipped plugin keeps Pages for downstream users. Locally, `docker compose up -d` still runs two services over the shared bind-mounted repo (the mkdocs viewer and the FastAPI document API). As of P5 the published site carries the operator-designed "calm editorial library" design (one stylesheet + a single Google-Fonts `@import` + two SVG marks) and browser-only Korean/CJK search, and the deploy pipeline is gated by `scripts/site_smoke.py` between build and artifact upload. As of P6 the build also runs a **mkdocs `hooks:` module** (`scripts/graph_hook.py`) that emits the knowledge map's `graph.json` into `site/` — in both CI `mkdocs build` and local `mkdocs serve`, with **zero `pages.yml` changes** — and the smoke guard was extended to cover the graph data contract + the first vendored custom JS. As of P7 the feature is **distributed as a Claude Code plugin** hosted in this repo: a new user installs it and runs `/knowledge:setup` to scaffold their own KB, the deploy gate (`site_smoke.py`) was made **portable** so a fresh scaffold passes its own `pages.yml`, and a **root-only** `.github/workflows/plugin-ci.yml` parity gate keeps the shipped template snapshot in sync with the repo (see *Plugin distribution* below). **As of P10 the box runs a third piece of infrastructure — a `postgres:17` accounts/tenancy control plane** — and gains **two new one-shot deploy steps** (an explicit `alembic upgrade head` migration + an idempotent `python -m server.seed`) plus a committed post-deploy verifier (`scripts/onboarding_smoke.py`). The api stays a **single uvicorn worker**; Postgres sits alongside the content plane, which is untouched in shape (see *P10 cutover* below). **As of P11 the accounts plane gains a second Alembic migration** (`0002_usage_events`, the per-tenant usage event log) — `alembic upgrade head` now applies **both** `0001` and `0002`, so the P10 cutover's migration step is unchanged in shape — and **`scripts/onboarding_smoke.py` is extended with the usage meter→read assertions** (still the committed post-deploy verifier, not part of pytest). **As of P12 the repo also carries an authenticated web app in `web/`** (Next.js) with a **local build/run stub only** — `pnpm install` / `pnpm dev` (`127.0.0.1:3030`) / `pnpm build` (`output: "standalone"`), two server-only env keys (`KB_API_BASE_URL` + `SESSION_SECRET`) via `web/.env.example`; **full production deploy (Dockerfile / compose / edge vhost) is P14** and nothing about the box's current two-service production changes in P12. See *Web app local build/run (P12)* below. **As of P13 the repo also ships a standalone `knowledge` CLI in `cli/`** (its own hatchling package `knowledge-cli`, console script `knowledge`, installed with `uv tool install`) plus one **edge change** (`deploy/knowledge.conf` gains `location /auth/` + `location /app/`, routing the control plane to the API — authored + deployed) and one **server change** (a per-IP throttle on the now-public `/auth/{signup,login}` grant, `KB_AUTH_RATE_LIMIT`/`KB_AUTH_RATE_WINDOW_S`). The **CLI's hosted onboarding is gated on a one-time production cutover of the P10–P12 accounts plane, which was never deployed to prod** — a documented operator follow-up spanning P10–P13, not a P13 gap (see *Knowledge CLI (P13)* and *Hosted accounts-plane cutover (P10–P13)* below). **As of P14 the `web/` app is production-deployable and the box's site topology is reworked to three services.** P14 adds `web/Dockerfile` (multi-stage `node:22-slim`, `output: "standalone"` → `node server.js`) and a **`knowledge-web`** service in `compose.prod.yml` (`expose: 3000`, no host port, `depends_on: api healthy`, `SESSION_SECRET` from the box `.env`, `KB_API_BASE_URL` literal), reworks the edge vhost so `/api/auth/` → the Next BFF and `/` → the Next app (the CLI planes `/api //auth //app /=/healthz` → `knowledge-api` stay unchanged), and **RETIRES the mkdocs `knowledge-site` viewer** from the box + edge (its content lives on as tenant #1's knowledge). Deploy automation now health-gates `knowledge-web` instead of `knowledge-site`, and a **new box secret `SESSION_SECRET`** must be generated. All artifacts are locally validated (a full `docker build` + live container smoke); the **live edge apply is an operator gate** (see *Web app production deploy (P14)* below). This closes the P12-deferred web-deploy items. **As of P15 the box gains a THIRD app container — `knowledge-mcp`, the MCP-over-HTTP retrieval server** — plus one edge change and extended deploy automation. A new `mcp-server/Dockerfile` (self-contained `python:3.12-slim` image, image-native `/healthz` healthcheck) + an `mcp` service in `compose.prod.yml` (`expose: 9000`, `MCP_STATELESS_HTTP=1`, `KB_API_BASE_URL` literal, **no secrets** — it forwards the inbound `vk_` bearer upstream), a **SSE-safe edge `location /mcp`** (`proxy_buffering off` + 3600 s timeouts), a three-service deploy health-gate (`wait_healthy mcp knowledge-mcp`), and a `/mcp` routed-liveness check in the `Production Deploy` external smoke. The service is **dual-reachable** (internal `knowledge-mcp:9000` + public `https://knowledge.hi2vi.com/mcp`). The deploy **requires** `MCP_ALLOWED_HOSTS` (+ `MCP_ALLOWED_ORIGINS`) — FastMCP's localhost-only DNS-rebinding default otherwise returns `421 Invalid Host header` to both the public host and the internal path (P15.F1, below). **The container is now deployed and the public path is verified:** a bare `GET https://knowledge.hi2vi.com/mcp` returns the routed **406** and the authenticated `e2e_smoke.py` E2E PASSes end-to-end against the public edge; the real hi2vi `vk_` provisioning + D13 are the only outstanding follow-ups (see *MCP retrieval service deploy (P15)* below). **As of P17 the long-pending P10–P13 accounts-plane production cutover is EXECUTED and verified live** — Postgres up, migrations `0001`+`0002` applied, seed done, box `.env` secrets present (proven by the migrated `401 invalid email or password` + a healthy `/healthz`) — and **P16 shipped to prod in the same `3ad7bd9` push**, so the hosted skill path (signup → `vk_` → `format:"html"` ingest → sandboxed raw-serve → tenant search → MCP `vk_` read) is proven end to end on `knowledge.hi2vi.com`. P17 adds **no services**; two ops facts: (1) a **second plugin-CI drift gate** `scripts/skills_parity.py` runs alongside `plugin_parity.py` (guarding the shipped explain-skill copies); (2) a **deploy-hygiene fix** in `deploy/deploy.sh` now **force-recreates the bind-mounted `api`** after the build and **self-asserts its process freshness** post-gate — closing the split-deploy gap a GREEN deploy exposed (the api kept running stale pre-P16 code until an operator container restart). See *Explain v2 cutover + deploy-hygiene (P17)* below. **As of P18 the accounts-v2 cutover (org-level keys + get-or-create) is EXECUTED and verified live** on `https://knowledge.hi2vi.com` — unlike P17 this cutover carries a **new migration (`0003`)**, so the order is **load-bearing** (reconcile the box clone → `alembic upgrade head` → force-recreate the api on new code, **back-to-back** — deploying P18 code before `0003` breaks every `vk_`, since the resolver reads the `tenant_id` column `0003` adds). The migration stays **manual** (Production Deploy runs no alembic), and the box's fresh-DB `stop→migrate→seed→up` deadlock does **not** apply (the accounts DB was already migrated+seeded+live since P17). The decisive `GET /app/credentials` **404→401** flip confirmed P18 code is serving, and the extended `onboarding_smoke.py` (now with an org-model leg) passed green against the host. P18 adds **no services** and no edge change. See *P18 accounts-v2 cutover (org-level keys + get-or-create)* below. **As of P19 the public-projects cutover (per-project visibility + the first anonymous read surface + the mode-aware save URL) is EXECUTED and verified live** on `https://knowledge.hi2vi.com` — like P18 it carries a **new migration (`0004_project_visibility`)**, so the order is again reconcile → `alembic upgrade head` → force-recreate the api on new code, **back-to-back** (P19 code SELECTs `projects.visibility` on every project read). Unlike `0003`, `0004` is **purely additive with a server DEFAULT**, so it carries **no mint-window** — the old-code+new-schema overlap is fully safe. Production Deploy runs no alembic (the migration stays a manual on-box step); the decisive `GET /app/graph?org=<random>` **401→404** flip confirmed P19 code is serving, and `scripts/onboarding_smoke.py` gained a **public-link leg** (anonymous doc/`raw`/graph + same-origin web pages, private→public→private round-trip) that passed green against the host. P19 adds **no services** and no edge change. See *P19 public-projects cutover (visibility + anonymous reads + direct URL)* below.

## Local Development

- Tooling: uv (`/opt/homebrew/bin/uv`), Python 3.12.
- Install: `uv sync`.
- Test: `uv run pytest -q`.
- Run API (host): `uv run uvicorn server.main:app --port 8766`.
- Reindex (drift repair CLI): `uv run python -m server.reindex` (prints `indexed:/removed:/skipped:/embeddings:/duration_ms:`; never runs git). P4: `uv run python -m server.reindex <rel_path>` reindexes a single path incrementally (reports per-path). The `embeddings:` line reports the content-hash-cached embedding sync (`embedded=… cached=… removed=… skipped_reason=…`).

## Deployment (Docker Compose)

Two services over one bind-mounted repo:

- **`kb`** (viewer): image `squidfunk/mkdocs-material:9.7.6` (exact pin), host port **8765**, command `serve --dev-addr=0.0.0.0:8000 --livereload`. `--livereload` is **explicit and load-bearing** — the flag never arms by default in this image, so without it new pages don't appear until restart. `restart: unless-stopped`.
- **`api`**: `build: .` from `python:3.12-slim` + apt `git` + **`openssh-client`** + **`tzdata`** + uv-installed deps (`uv export --frozen --no-dev --no-emit-project` → `uv pip install --system`); host port **8766**; `KB_ROOT=/repo`, `TZ=Asia/Seoul`; **single uvicorn worker**; `restart: unless-stopped`. `tzdata` is required — without it `TZ=Asia/Seoul` silently falls back to UTC and `date.today()` yields wrong file dates near midnight KST. System-level git identity `kb-api` + `git config --system safe.directory /repo` (system-level so the `/repo` bind mount can't shadow them; without both, commits return `committed:false`).
- **`openssh-client` is load-bearing and non-obvious (P8.F2).** The apt line uses `--no-install-recommends`, and the `ssh` binary is only a *Recommends* of `git` — so the image shipped **without `ssh`** and the container **could not push over an SSH remote at all**. Because push is best-effort by design, that failed **silently**: every write still returned 201, with `pushed:false` + a `push_error`, and nothing ever reached Pages. It must stay on the apt line. **General rule: a best-effort code path can hide a total infrastructure failure — assert the capability at bring-up** (`docker compose -f compose.prod.yml exec api command -v ssh` → `/usr/bin/ssh`), and make acceptance assert the *capability* (`pushed:true`), never the status code.
- **Rebuild quirk on this host**: `docker compose up -d --build` panics in compose's *bake* build path (a compose-v2 bug on this host). Rebuild with **`COMPOSE_BAKE=false docker compose up -d --build`**.
- **(P10) `postgres:17` service in both compose files.** `compose.yml` adds a local `postgres` (kb/kb/kb defaults, `pg_isready` healthcheck, `pgdata` volume); `compose.prod.yml` adds a durable `knowledge-postgres` (on `changple_shared_network`, `pgdata` volume, password from the box `.env`). The `api` service gains `depends_on: postgres (healthy)` + a `DATABASE_URL` (`postgresql+psycopg://…`). Migrations do **not** run on boot — they are the explicit `alembic upgrade head` step below. Locally `DATABASE_URL` may be left empty to keep accounts dormant (the content plane still works).

## Environment Variables

| Name | Required | Purpose | Notes |
|---|---|---|---|
| `KB_ROOT` | no | repo root (`docs_root` = `KB_ROOT/docs`) | `/repo` in the container |
| `KB_DB_PATH` | no | SQLite path | default `KB_ROOT/data/kb.sqlite3` (gitignored, disposable) |
| `KB_PUBLIC_BASE_URL` | no | viewer origin for response `url`s | default `http://localhost:8765` |
| `KB_API_TOKEN` | no | bearer token for mutating endpoints (and for reads when `KB_REQUIRE_READ_AUTH`) | unset = localhost open |
| `KB_GIT_COMMIT` | no | enable/skip the write-path commit | default true |
| `KB_GIT_PUSH` | no | **(P8)** push the scoped commit to `origin/main` → publish-on-write | **default false** — local/plugin never push; the hosted box sets `true` |
| `KB_REQUIRE_READ_AUTH` | no | **(P8)** put reads/search behind the bearer | **default false** — local/plugin reads stay open; the hosted box sets `true` |
| `KB_STARTUP_REINDEX` | no | run a full reindex on app boot (drift self-heal) | default true; `0/false/no/off` disables (disabled in tests) |
| `GOOGLE_API_KEY` | no | Gemini credential (preferred) for semantic search | empty = feature off → BM25-only |
| `GEMINI_API_KEY` | no | Gemini credential (fallback) | used when `GOOGLE_API_KEY` unset |
| `GEMINI_EMBEDDING_MODEL` | no | Gemini embedding model | default `gemini-embedding-2-preview` |
| `TZ` | no | container timezone | `Asia/Seoul` (needs `tzdata`) |
| `DATABASE_URL` | no (hosted: yes) | **(P10)** async Postgres accounts plane URL (`postgresql+psycopg://…`) | unset → accounts dormant + `/api/*` byte-for-byte pre-P10; set → tenant mode |
| `POSTGRES_PASSWORD` | hosted: yes | **(P10)** prod Postgres password (interpolated into the prod `DATABASE_URL`) | box `.env` only, never committed |
| `KB_OPERATOR_EMAIL` | hosted: yes | **(P10)** operator's signup email — pins `KB_API_TOKEN` → tenant #1 | store **normalized**; F1 makes `get_tenant_one_id()` casing-tolerant, so mixed case now resolves too |
| `KB_OPERATOR_PASSWORD` | seed: yes | **(P10)** operator password, read **only** by `python -m server.seed` | box `.env` only; never read at request time |
| `KB_AUTH_RATE_LIMIT` | no | **(P13)** max `/auth/{signup,login}` attempts per IP per window (server-side per-`(IP,route)` throttle) | default **20**; read per-call; **not yet set in `compose.prod.yml`** — the box runs the code default |
| `KB_AUTH_RATE_WINDOW_S` | no | **(P13)** the throttle window in seconds | default **900** (15 min); `0` limit disables the throttle |
| `SESSION_SECRET` | web, hosted: yes | **(P14)** AES-256-GCM session-cookie key material (`sha256(SESSION_SECRET)`) for the `knowledge-web` BFF | box `.env` only; **operator-generated** (`openssl rand -base64 32`); rotating it re-logs everyone; unset → BFF throws at request time |
| `KB_API_BASE_URL` | web: yes | **(P12/P14)** server-to-server api origin the `knowledge-web` BFF calls | literal `http://knowledge-api:8000` in prod compose; dev default `http://127.0.0.1:8766`; server-only, never `NEXT_PUBLIC_` |
| `NEXT_PUBLIC_APP_URL` | web build: yes | **(P14)** public app origin baked into the client bundle (canonical/OG/sitemap/robots) | a **build arg**, `https://knowledge.hi2vi.com` in prod; a rebuild is needed to change it; safe to commit |
| `MCP_STATELESS_HTTP` | no (box: yes) | **(P15)** run the `knowledge-mcp` Streamable-HTTP transport **stateless** (per-call proxy, no session affinity) | `1` on the box (`compose.prod.yml`); default stateful; both tools are correct either way; stateless chosen for Cloudflare's ~100 s public-path cap |
| `MCP_FETCH_MAX_CHARS` | no | **(P15)** `fetch_document` markdown **character** cap | default **20000**; over-cap → first N chars + a truncation marker + `{truncated, total_chars}` |
| `MCP_HOST` / `MCP_PORT` | no | **(P15)** `knowledge-mcp` bind address | default `0.0.0.0:9000`; the edge + co-tenant agents reach it at `knowledge-mcp:9000`; MCP endpoint at `/mcp` |
| `KB_API_BASE_URL` (mcp) | mcp: yes | **(P15)** server-to-server api origin the MCP tools proxy | literal `http://knowledge-api:8000` in prod compose (same shape as the web BFF); the `vk_` corpus scoping rides the forwarded inbound bearer |
| `MCP_ALLOWED_HOSTS` | box: yes | **(P15.F1)** extra hostnames added to `knowledge-mcp`'s DNS-rebinding `Host` allowlist (comma-separated, read at call time) on top of the built-in localhost defaults | **required on the box** — FastMCP's default localhost-only allowlist otherwise `421`s the public edge host + the internal `knowledge-mcp:9000` path; prod compose sets `"knowledge.hi2vi.com,knowledge-mcp,knowledge-mcp:*"` (non-secret literal). Matching is **exact** OR a `base:*` wildcard, so a **port-less** host needs an exact entry (`knowledge.hi2vi.com`), a port-carrying one uses `:*` (`knowledge-mcp:*`) |
| `MCP_ALLOWED_ORIGINS` | box: yes | **(P15.F1)** extra `Origin` values added to `knowledge-mcp`'s DNS-rebinding allowlist (comma-separated) on top of localhost defaults | prod compose sets `"https://knowledge.hi2vi.com"` (non-secret literal). An **absent** `Origin` passes, so server-side agents (no `Origin` header) are unaffected regardless |

## Reindex as Drift-Repair Tool

- `python -m server.reindex` (CLI) and `POST /api/reindex` rebuild the DB from `docs/`. Use them to reconcile manual edits, API-down fallback writes (the `/explain` skill writing/committing directly), and git resets. Reindex never commits.
- **Incremental single-path (P4):** `python -m server.reindex <rel_path>` or `POST /api/reindex {"rel_path": "…"}` reindexes just one file (index if present, delete its row if vanished) — cheap for hot-reload / watch-mode workflows.
- **Startup drift self-heal (P4):** with `KB_STARTUP_REINDEX` true (the default), the app runs a full `reindex()` in its FastAPI lifespan **before** it accepts requests, printing `[kb-api] startup reindex: indexed=… removed=… skipped=… embedded=…`. Single-worker + a tiny corpus + the content-hash embedding cache make boot reindex safe and cheap. Set `KB_STARTUP_REINDEX=0` in a production deployment whose state is already validated to skip it.
- **Embedding sync:** every reindex path (full, single-path, startup) runs a best-effort, content-hash-cached embedding sync — it only re-embeds changed docs, clears orphans, and never fails the reindex (no key → skipped; API/429 → per-doc skip, retried next run). `gemini-embedding-2-preview` has a low per-minute quota (~4–5 req/min); reindex embeds per-doc with bounded 429 backoff and persists each success, so a rate-limited run resumes from the cache on the next reindex.

## P10 cutover: Postgres migrations + seed + onboarding smoke

Turning the box into the multi-tenant SaaS is a **one-time cutover**, ordered so tenant #1 (the live corpus) never loses its identity. **Seed BEFORE the reindex** — `get_tenant_one_id()` caches on first success, so the operator user + tenant must exist before the boot reindex / master bearer resolve tenant #1 (a reindex that runs before seeding stamps `docs/` with the `''` sentinel and needs a re-reindex). ⚠ On a **fresh** box the steps below cannot use `exec` (step 4/5): with `KB_STARTUP_REINDEX=true` the api crash-loops on the un-migrated DB before `exec` can attach — run migrate + seed as one-off `run --rm` containers with the api stopped instead. See *Hosted accounts-plane cutover (P10–P13)* below for the deadlock-proof command sequence, which is the authoritative first-cutover runbook.

1. Provision the box's gitignored `.env`: add `POSTGRES_PASSWORD`, `KB_OPERATOR_EMAIL` (the operator's signup email), and `KB_OPERATOR_PASSWORD` alongside the existing `KB_API_TOKEN` / `GOOGLE_API_KEY`.
2. `git pull` the box clone.
3. `docker compose -f compose.prod.yml up -d postgres` (wait healthy).
4. `docker compose -f compose.prod.yml exec api alembic upgrade head` — creates the six accounts tables (`0001_accounts_tenancy`) **and (P11) the `usage_events` table (`0002_usage_events`)**; `upgrade head` applies both in order (verified live against `postgres:17` at the P11 review). Migrations never run on boot. On an already-migrated box a re-run applies only the new `0002`.
5. `docker compose -f compose.prod.yml exec api python -m server.seed` — creates the operator user + tenant #1 + a `projects` row per live `docs/` project (derived from the tree). **Idempotent** — safe to re-run (a second run writes zero rows).
6. Restart the api so its boot reindex — with tenant #1 now resolvable — **re-stamps every `docs/` row's `tenant_id` as tenant #1** (path-derived, no file move). Alternatively `POST /api/reindex` with the master bearer.
7. Verify: `python scripts/onboarding_smoke.py --base-url https://knowledge.hi2vi.com --master-token "$KB_API_TOKEN"` → **PASS** (onboards a throwaway tenant B end-to-end and proves cross-tenant isolation on the live data). The live hi2vi content agent needs **zero** changes — `KB_API_TOKEN` still resolves to tenant #1.

`scripts/onboarding_smoke.py` is the committed post-deploy verifier (`site_smoke.py` style: collect-all-failures, exit non-zero or print `PASS`); it self-derives tenant #1's fixtures from the master bearer's own listing (nothing hardcoded). `python -m server.seed` is Postgres-only and never touches `kb.sqlite3`.

**(P11) The smoke now also verifies the usage meter→read chain end-to-end.** After tenant B onboards, writes a doc, and searches (all via its `vk_` key), a new "3. Usage" block asserts with B's session token: `GET /app/usage` shows `totals.documents_created == 1` (an equality, so it doubles as a cross-tenant-isolation check — tenant #1's writes must not leak into B's totals), `totals.searches >= 1`, exactly 30 zero-filled `daily_counts`, and B's project listed; `GET /app/projects/{id}/usage` shows the project's write plus a credential with a non-null `last_used_at` (the `vk_` key did metered work); and `GET /app/projects/<random-uuid>/usage` → **404** (usage is tenant-scoped, no existence leak). This is P11's E2E live-acceptance — run it after `alembic upgrade head` + seed against a live tenant-mode instance, expecting `PASS` (exercised live at the P11 review against a disposable `postgres:17` stack: full PASS, no metering warnings).

## P18 accounts-v2 cutover (org-level keys + get-or-create): 0003 migration + org-model E2E

P18 restructures the accounts plane (org-level `vk_` keys, get-or-create projects). Unlike P17's cutover it carries a **new schema migration (`0003_org_level_credentials`)**, which makes the deploy ordering load-bearing. **Executed and verified live on `https://knowledge.hi2vi.com` (2026-07-22).**

- **Ordering is load-bearing (the whole runbook difference from P17).** The P18 resolver reads `project_credentials.tenant_id`, the column `0003` adds — so **deploying P18 code before `0003` is applied breaks every `vk_` auth** (missing column → 500 on `/api/*`). The order is **reconcile the box clone → `alembic upgrade head` (applies `0003`) → force-recreate the api on new code**, run **back-to-back**. The safe overlap is *old code + new schema* (`0003` only adds a backfilled `tenant_id`, makes `project_id` nullable, and adds `UNIQUE(tenant_id, name)` — none of which old code reads/writes on the existing-key path). ⚠ **Old-code mint-window caveat:** while old code serves between migrate and recreate, a **new key mint** or a **duplicate-name project create** 500s (old code omits the now-NOT-NULL `tenant_id` / hits the new UNIQUE) — keep the window seconds-short; existing keys are unaffected. An ultra-safe alternative inserts `docker compose stop api` before the migrate (trades the mint-window for a brief write outage).
- **The migration is manual; the first-cutover deadlock does not apply.** Production Deploy runs **no** alembic, so `0003` is an on-box manual step (`docker compose -f compose.prod.yml run --rm api alembic upgrade head`, expecting `0002_usage_events -> 0003_org_level_credentials`). Because the accounts DB was already migrated+seeded+live since P17, the P10 fresh-DB `stop→migrate→seed→up` crash-loop deadlock is **not** in play. Seed is an optional idempotent no-op (a fresh-DB seed now uses the `provision_signup` primitive; an existing tenant is never renamed). **Pre-flight (optional, read-only):** `SELECT tenant_id, name, count(*) FROM projects GROUP BY tenant_id, name HAVING count(*)>1;` shows what `0003`'s de-dupe would merge (0 rows on prod → no-op).
- **Verification — the decisive flip.** Unauth `GET /app/credentials` returns **404** pre-cutover (route absent) and **401** post-cutover (route mounted) — the 404→401 flip is the P18-present signal (confirmed live). `GET /healthz` 200, and the login discriminator (nonsense creds with a ≥8-char password) → 401 "invalid email or password" confirms the accounts DB is migrated+live.
- **The committed post-deploy verifier gained an org-model leg.** `scripts/onboarding_smoke.py` keeps its tenant-B isolation/usage checks and adds a **section-4 org-model journey** run in its own fresh tenant (so the existing `documents_created == 1` equalities stay pristine): signup's additive `project == "default"`; **one org key → two never-pre-created project names** (get-or-create proof) with per-named-project usage; revoke → subsequent write **401**; a project-bound key still mints+writes. Proven green against a disposable `postgres:17` tenant-mode stack and **live against prod** (exit 0, without `--master-token` — B-only isolation). `scripts/` is not a plugin `shipped_dir`, so there is no template mirror. Residual: two throwaway tenants with docs under `tenants/<uuid>/` (namespaced, isolated; no delete API — the operator may purge).

## P19 public-projects cutover (visibility + anonymous reads + direct URL): 0004 migration + public-link E2E

P19 adds per-project visibility, the product's first anonymous read surface, and a mode-aware save URL. It carries a **new migration (`0004_project_visibility`)** but — unlike `0003` — a **purely additive** one. **Executed and verified live on `https://knowledge.hi2vi.com` (2026-07-22).**

- **Ordering is load-bearing but the overlap is fully safe.** P19 code (`app_api.py`, `documents_api.py`, `graph_api.py`, dashboard/signup serializers) **SELECTs `projects.visibility` on every project read**, so deploying P19 code before `0004` is applied 500s broadly. Order: **reconcile the box clone → `alembic upgrade head` (applies `0004`) → force-recreate the api on new code**, back-to-back. But `0004` only adds one column with a server `DEFAULT 'private'`, and pre-P19 code neither reads nor writes it, so the *old code + new schema* window is fully safe — **no mint-window** (contrast `0003`, whose NOT-NULL-without-default column 500'd old-code mints during the overlap). No data migration, de-dup, or new constraint — nothing to pre-flight.
- **The migration is manual; no fresh-DB deadlock.** Production Deploy runs **no** alembic, so `0004` is an on-box `docker compose -f compose.prod.yml run --rm api alembic upgrade head` (expecting `0003_org_level_credentials -> 0004_project_visibility`). The accounts DB has been migrated+seeded+live since P17, so the P10 fresh-DB `stop→migrate→seed→up` crash-loop deadlock is not in play; seed is an optional idempotent no-op. `alembic/` stays repo-only (not a plugin `shipped_dir`).
- **Verification — the decisive flip.** Unauth `GET /app/graph?org=<random-uuid>` returns **401** pre-cutover (pre-P19 `/app/graph` is `require_user`, so any anonymous call 401s regardless of `org`) and **404 `{"detail":"graph not found"}`** post-cutover (the optional-identity public-graph path resolves the random org to the public path). The **401→404** flip is the P19-present signal (confirmed live, twice). `/healthz` 200 (public docs count unchanged — throwaway-tenant docs live under `tenants/<uuid>/`, not the public plane).
- **The post-deploy verifier gained a public-link leg.** `scripts/onboarding_smoke.py`'s `_run_public_link_leg` runs inside the section-4 fresh tenant C (before the org-key revoke, so the org key is still live): an org-key **html** write to a fresh `org-smoke-public-{hexid}` project (asserts the 201 `url` **ends `/documents/{id}`** — the S4 mode-aware URL), anonymous 404-while-private, session `PATCH …{"visibility":"public"}`, then the full anonymous surface (`/app/documents/{id}` 200 with no `tenant_id`; `/raw` 200 + the exact P16 `Content-Security-Policy: sandbox allow-scripts; frame-ancestors 'self'`; `/app/graph?org={tenant}` 200 with the doc node; `/app/graph?org={random}` 404), the **same-origin web pages** (`GET {url}` 200, `/graph/{tenant}` 200, a `/login` redirect after toggle-back), and a `PATCH` back to private (the throwaway project ends **private** — private→public→private round-trip). A new **`--skip-web-pages`** flag (default: run web pages) opts out for bare-uvicorn local runs. Ran **live with web pages in scope** (no `--skip-web-pages`) — exit 0, first run, no retries. Residual: two throwaway tenants under `tenants/<uuid>/` (namespaced, isolated; operator may purge).

## Auth

- Set / uncomment `KB_API_TOKEN` in `compose.yml` (or pass as env) → `Authorization: Bearer <token>` becomes required on the mutating endpoints (`POST /api/documents`, `DELETE /api/documents/*`, `POST /api/reindex`); GETs stay open. Rotate by changing the value and restarting `api`. **(P10)** in tenant mode (`DATABASE_URL` set) `KB_API_TOKEN` is additionally the pinned **tenant #1 master bearer** (resolved via `KB_OPERATOR_EMAIL`); `vk_` per-project keys and session tokens are the other `/api/*` credentials.
- **(P8)** Adding `KB_REQUIRE_READ_AUTH=true` **as well** puts the read/search surface behind the same bearer. It defaults **false**, so a local token still guards writes only — reads stay open unless you deliberately opt in. The hosted box sets both. `GET /healthz` stays open either way.

## Publishing: self-hosted live-serve (P9; GitHub Pages retired) — mkdocs `/` route retired in P14

> **P14 update:** the `knowledge-site` mkdocs viewer no longer serves `/` — the Next `web/`
> app took over the domain root, and the `site` service is removed from `compose.prod.yml`
> and the edge (see *Web app production deploy (P14)*). This section describes the P9→P13
> regime (the box's live-serve public site + its fresh-on-write mechanism); it is **history**
> post-P14. Track 1's content is not lost — it lives on as tenant #1's knowledge in the app +
> api. The GitHub Pages retirement below still stands; the shipped plugin still keeps Pages
> for downstream users.

Track 1 — the `docs/` tree — was served **live by the box** at the root of <https://knowledge.hi2vi.com/> (the `knowledge-site` `mkdocs serve --livereload` viewer off `/opt/knowledge`), **no longer GitHub Pages** (P9) — **and, as of P14, no longer at `/` at all** (the Next app serves the root; see above). Because the api writes each doc into the same bind-mounted tree the viewer serves, a published doc is live **the instant it is written** — *fresh-on-write*, which replaces the old ~65 s push→Pages→CDN lag. The git push continues, now **only for off-box backup/history**, not as the publish path.

- **Pages is retired for this repo's site (P9.S1/S5).** `.github/workflows/pages.yml` was reclassified out of the plugin manifest's `identical` set and **neutralized to a build-only CI guard** (`name: site build`): it still runs on `push` to `main` (+ `workflow_dispatch`) and pip-installs `mkdocs-material==9.7.6` → `mkdocs build` → **`python3 scripts/site_smoke.py`**, but the Pages **`deploy` job / `upload-pages-artifact` step / `pages:write`+`id-token:write` permissions / `concurrency: pages`** were removed. So the site build stays a CI guard (catches a broken build/smoke *before* it reaches the box's live-serve) while nothing deploys to Pages. The operator turned repo **Settings → Pages Off** at cutover (Pages API → 404) — done **after** the box was proven live (§ no-gap). The **shipped plugin keeps Pages** for downstream users (`plugin/templates/kb/.github/workflows/pages.yml` untouched, now allowed to diverge since `pages.yml` left the `identical` class).
- **Deploy-gating smoke guard (P5 / P5.S4):** `scripts/site_smoke.py` (stdlib-only, optional `--root`) runs after `mkdocs build` and before the artifact upload — a non-zero exit blocks the deploy. It asserts source invariants (the `<!-- explain:recent -->` marker + bullet contract, `<!-- material/tags -->`, no `nav:`/`strict:`, `theme.font: false`, `plugins.search.lang` includes `en`+`ko`, pin parity) and built-site invariants (`search_index.json` `config.lang` includes `ko`, `lunr.ko`/`lunr.multi` packs shipped, the hero `#__search` toggle + `for="__search"` label, the `#recent + ul` DOM adjacency, the three per-project pages built, `site/versions/` absent, no leaked absolute local home-directory path, no `<script src="http…">` CDN tag). **P6 extended the guard:** the `extra_javascript:`-forbidden assertion was *flipped* to an exact allowlist (`== ["javascripts/graph.js"]`) plus `hooks:` wiring + `graph.md`/`graph.js` presence; new built-site assertions cover `site/javascripts/graph.js`, a `site/graph/index.html` that mounts `.kb-graph`/`data-graph-src`/the script, the landing `.kb-card` link to `graph/`, and a `check_graph` over the emitted `graph.json` (see qa for the full list). The no-CDN + no-user-home-path-leak invariants still hold. It deliberately asserts **no build *warnings*** — `--strict` was rejected so future `/explain` zero-config page adds are never blocked by warning noise. Extend `check_source`/`check_built` to add invariants; never `--strict`. **P7 made the guard portable:** the built-site per-project check no longer hardcodes the operator's three project names — a module-level `discover_projects(root)` derives the project dirs dynamically (sorted non-reserved `docs/` subdirs carrying ≥1 non-`index.md` `*.md`), used by **both** `check_built` (the per-project `site/<project>/index.html` loop) **and** `check_graph`'s filesystem doc-count — one discovery truth so they cannot drift, with a zero-project teeth guard. This is what lets a fresh scaffold with only its seed project pass the same byte-identical guard; on the operator's repo discovery yields exactly the same three projects as before.
- **Site exclusion (P4 / D1; P5):** `mkdocs.yml` sets `exclude_docs: /versions/` (workspace-internal durable-doc history kept out of the built site — pages, nav, search — while `docs/current/` stays published) plus **`/README.md`** (P5.S4 — makes mkdocs' existing auto-exclusion explicit, silencing the standing `README.md`/`index.md` conflict warning; changes nothing published). Use `exclude_docs` **only** — never `nav:`/`strict:` (auto-nav from the `docs/` tree is load-bearing).
- **Pin parity**: the CI pip pin and the `compose.yml` viewer image tag are the same `9.7.6` on purpose — bump them together so the local build stays a faithful CI pre-check. The smoke guard also asserts this parity.
- **Pre-push check (P5)**: `docker compose run --rm kb build` runs the same `mkdocs build` as CI (same 9.7.6), then `python3 scripts/site_smoke.py` runs the same deploy gate CI runs (default root = repo root; run the build first so `site/` is fresh). A clean local build **and** a `PASS` predict a clean, gate-passing deploy.
- **Push policy (revised at P8, refined at P9)**: **locally**, still manual-push-only — agents, the `/knowledge:explain` skill, and the API commit but **never push** (`KB_GIT_PUSH` defaults false). The **one** exception is the hosted production box, which sets `KB_GIT_PUSH=true`. As of P9 the box's live-serve viewer makes the doc **publicly live at write time** (off the shared clone); the push now serves **off-box backup/history** rather than being the publish path (there is no Pages CI to deploy). A **code/image redeploy** (a `server/*`/`Dockerfile`/`compose.prod.yml`/vhost change) reaches production through the **manual-dispatch `Production Deploy`** action (below); a **doc** reaches production the instant the api writes it.
- **Dev-server eyeball (P5)**: `docker compose up -d kb` serves the live site with livereload for visual review before any push. It is served under the `site_url` subpath — open **`http://localhost:8765/knowledge/`** (a bare `http://localhost:8765/` 302-redirects there). The built `site/` artifact itself is path-agnostic. Stop with `docker compose stop kb`. Final visual acceptance of the design is the operator's, done here before pushing.
- **GitHub Pages settings — obsolete (P9).** The former "Settings → Pages → Source = GitHub Actions" one-time setup and the "enable Pages before the first push" lesson no longer apply: Pages is **retired** for this repo's site (turned Off at the P9 cutover), and the box's `knowledge-site` viewer is the sole public site. Kept here only as history.

## Production deployment: knowledge.hi2vi.com + publish-on-write (P8)

The document API is **hosted in production** at <https://knowledge.hi2vi.com>, so the
hi2vi content agent can write research docs and read/search the accumulated corpus
server-to-server. Live since 2026-07-14 and validated end-to-end (see qa).

The mechanics — exact commands, paths, and the operator's provisioning steps — live in
the repo's runbooks, **`deploy/README.md`** (place + bring up) and **`deploy/SECRETS.md`**
(produce + register the credentials). This section records the durable *shape* and the
rules that outlive any one bring-up.

### Shape

- **Its own compose project — services by era.** `compose.prod.yml` (repo root) has evolved:
  pre-P9 **api-only** (the public site was GitHub Pages); P9 added **`site`** (mkdocs
  `knowledge-site` live-serve viewer) for two services; P10 added durable **`postgres`**
  (`knowledge-postgres`) for the accounts plane. **As of P14 the topology is `api` +
  `postgres` + `web` (`knowledge-web`, the Next standalone app), and the `site` service is
  REMOVED** — the Next app serves `/` in its place. All services have **no published host
  port** and are reached only by the edge over the external `changple_shared_network`, by
  container name. (History: the P9 `--livereload` flag was load-bearing for the mkdocs
  viewer's fresh-on-write; that viewer is retired in P14.)
- **Its own clone on the box** (`/opt/knowledge`), not a bind-mount of anyone's working
  tree: the container commits **and pushes** from it, so it needs a real `origin` +
  credential. The clone must be owned by the **invoking (non-root) user** — `docker compose`
  reads `compose.prod.yml` and `.env` **client-side**, so a root-owned mode-600 `.env` is
  unreadable and the bring-up fails. Clone over **HTTPS** (the repo is public, no credential
  needed), then point `origin` at the **SSH** URL so only the *push* path uses the deploy key.
- **Box env:** `KB_GIT_PUSH=true`, `KB_REQUIRE_READ_AUTH=true`,
  `KB_PUBLIC_BASE_URL=https://knowledge.hi2vi.com` (P9 — the site is now served at the
  **domain root** by the box, so the 201 `url` names the live self-hosted doc; pre-P9 this
  was the Pages origin `…/knowledge`), `KB_ROOT=/repo`, `KB_STARTUP_REINDEX=true`, `TZ`.
  Secrets (`KB_API_TOKEN`, `GOOGLE_API_KEY`) come **only** from a gitignored `.env` on the
  box — the repo carries names and paths, never values.

### The edge is declarative host state (P8.F2 — verified live)

The box's public entrypoint is a **dedicated edge**: its own compose project (`edge`, at
`/home/opc/edge`, container `edge-nginx`, `nginx:1.27-alpine`), the sole owner of `:80`/`:443`,
attached to `changple_shared_network`. Its `conf.d/` and `certs/` are **read-only bind mounts
from the host**, which is the property everything else follows from:

- **The edge's config is declarative host state, not container state.** A change is a **host
  file drop + a reload** — `cd /home/opc/edge && ./deploy.sh`, which hard-gates on `nginx -t`
  *inside the running container* and then does a graceful `nginx -s reload`, **never a
  recreate** (a recreate would drop the network attachment). `./validate.sh` is the local
  pre-gate. **Never `docker cp` into the edge, never `docker compose up`/`restart` it.**
- **A co-tenant deploy can no longer wipe us.** This is the end state of the long-standing
  shared-edge fragility (deferred **D2**, cut over 2026-07-02): because the vhost is a host
  file on a read-only mount and the edge project has no `depends_on`/`build`, another site's
  deploy cannot destroy `knowledge.hi2vi.com`. The old "assume knowledge.hi2vi.com is down
  after any co-tenant deploy until a re-apply script runs" rule is **obsolete** — there is no
  re-apply script and none is needed. (The knowledge-base explainer
  `docs/hi2vi_web/2026-07-02-shared-nginx-explained.md` predates this cutover and describes
  the *old* regime: read it as history, not as an operating manual.)
- **Our vhost ships as `deploy/knowledge.conf`** and lands in the edge's `conf.d/`. Its
  routing has grown: P9 made it two-location (`/api/` + `= /healthz` → api, `/` →
  `knowledge-site`); P13 added `/auth/` + `/app/` → api (the CLI control plane). **As of P14
  it has two upstreams:** the CLI/control planes `/api/ //auth/ //app/ /= /healthz` →
  **`knowledge-api`** (unchanged), plus `/api/auth/` (more specific than `/api/`) → the Next
  BFF and `/` (everything else) → **`knowledge-web`** — the mkdocs `knowledge-site` `/` route
  is retired. Both upstreams are `set $var` names re-resolved via Docker-DNS **re-resolution**
  (`resolver 127.0.0.11 valid=30s ipv6=off` + a variable in `proxy_pass`) so the proxy
  survives either container's recreation. The shared proxy headers are **hoisted to server
  level** so both locations inherit them (nginx drops the *entire* inherited `proxy_set_header`
  set the moment a `location` sets one of its own). It terminates TLS with the edge's existing
  Cloudflare Origin CA cert — a **wildcard** covering `*.hi2vi.com`, so a new subdomain needs
  **no cert provisioning at all**. Cloudflare fronts it (proxied DNS record; real-IP restore in
  the vhost). The edge house rules still hold: **no** `default_server`, **no** IPv6
  `listen [::]`, **no** `limit_req_zone`.
- **Two rules a vhost on this edge must obey — they break the *whole* edge, not just one
  site.** (1) The `conf.d/` tree is tested and reloaded **as a unit**, and a `limit_req_zone`
  name is **global across it** — a duplicate is a hard `nginx -t` failure that blocks the
  reload for *every* site on the box (ours declares none). (2) **No IPv6 `listen [::]:…`** —
  no sibling conf listens on v6, so adding it would silently make that vhost the **default
  server for all v6 traffic**. Likewise never `default_server` (the catch-all conf owns it).

### Publish-on-write flow

With `KB_GIT_PUSH=true`, one `POST /api/documents` does the whole publish, **in-request,
inside the write lock**: validate → write the `docs/` file → auto-create the project landing
if this is the project's first doc → Recent bullet → DB row + embedding → **scoped** commit
(`git add --` on the touched paths only, never `-A`) → `git fetch origin main` → rebase onto
`origin/main` → **non-force** `git push origin HEAD:main`.

- **Fresh-on-write replaces the ~65 s Pages SLA (P9).** The doc is written into the same
  bind-mounted `/opt/knowledge` tree the `knowledge-site` viewer serves, so it is **publicly
  live the instant it is written** — cross-container `inotify` over the shared mount fires the
  mkdocs `--livereload` rebuild with **no container restart** (proven at P9.S5: POST → the page
  200s on the site immediately). The pre-P9 chain (push → Pages CI ~46 s → CDN, ~65 s total) is
  gone; the push now serves **off-box backup/history only**.
- **Fetch+rebase-before-push is also the freshness mechanism.** The box catches up on the
  operator's commits at every write, so it always lands on top of the latest remote and can
  never revert operator work — no cron, no webhook, no mirror. The box clone being *behind*
  `origin/main` between writes is normal and self-healing.
- **Push is best-effort and never fails the write** (mirrors commit): a failed push still
  returns 201, with `pushed:false` + `push_error`. Post-P9 the doc is **already publicly live**
  on the box's live-serve regardless of push status — a failed push only delays the **off-box
  backup**, which catches up on the next successful push. Bring-up must still *assert* the push
  capability rather than infer it from a 201 (see the `openssh-client` note above).

## Automated production deploy: manual-dispatch `Production Deploy` (P9)

A code/image/vhost change reaches production through a **manually dispatched** GitHub Action,
mirroring `hi2vi_web`'s three-script split adapted for the publish-on-write clone + two
services. It is **`workflow_dispatch`-only, main-guarded**, and isolated by
`concurrency: knowledge-deploy` — the agent's constant publish-on-write pushes to `main` must
**never** trigger a redeploy. First proven live at P9.S5 (run 29385684066, ~1m17s).

The three-script chain (`.github/workflows/deploy-production.yml` → `deploy/`):

1. **Runner driver — `deploy/github-actions-production-deploy.sh`** (transport only). `umask 077`
   tempdir for the key + `known_hosts`; `ssh -o BatchMode=yes -o StrictHostKeyChecking=yes
   -o UserKnownHostsFile=<pinned> -o IdentitiesOnly=yes` into `opc@140.245.64.173`; `scp`s the
   on-box gate + `TARGET_SHA`/`REPO_PATH=/opt/knowledge`/`REMOTE_ARTIFACT_DIR`, then collects
   artifacts back. It reads the three `ORACLE_SSH_*` repo secrets (see security).
2. **On-box gate — `deploy/oracle-production-deploy-remote.sh`** (opc-safe orchestration). Asserts
   `TARGET_SHA` is 40-hex, hands to `deploy/deploy.sh "$TARGET_SHA"`, then re-applies the edge
   vhost, then collects `compose ps`/`logs` artifacts. It runs **no authoritative git** — that all
   lives in-container (F1, below); its only git is best-effort `git status` captures (non-fatal).
3. **`deploy/deploy.sh`** (the deploy core). Runs the **authoritative** reconcile in a **one-shot
   root container reusing the `api` service** (`docker compose run --rm --entrypoint sh api …`),
   which inherits the `.:/repo` mount, the `/run/secrets` deploy key, `GIT_SSH_COMMAND`, and the
   baked `safe.directory /repo` — so git fetch/rebase over SSH run as **uid 0** against the
   root-owned `.git`. Reconcile-on-`main` (never detach/reset/force): refuse a dirty **tracked**
   worktree (permit ahead/unpushed), wait out `.git/index.lock`, `git fetch --prune origin main`,
   **fail-closed** `TARGET_SHA` ancestor gate (`cat-file -e` + `merge-base --is-ancestor`),
   `merge --ff-only` when behind / `rebase` when ahead / `rebase --abort`+fail on conflict —
   deploying origin/main's **tip**. Then `COMPOSE_BAKE=false docker compose -f compose.prod.yml
   up -d --build` brings up **both** services, **health-gates both** (`docker inspect
   '{{.State.Health.Status}}'`, covering the start_periods), and on failure captures artifacts
   and exits non-zero — **§F v1: gate + fix-forward, no rollback** (the app runs from the bind
   mount, so an image-tag flip cannot revert `server/` code anyway).

- **The authoritative git lives in-container, not opc-side (F1).** The gate's fetch/ancestor check
  originally ran as `opc`, which **cannot authenticate** (SSH origin, root-owned deploy key opc
  can't read, no opc GitHub key) — it would kill every deploy. F1 relocated all authoritative git
  into `deploy.sh`'s root reconcile container (the fail-closed gate always fires on a real deploy)
  and left the on-box gate as pure orchestration. Proven live at S5 (the in-container reconcile
  fetched/authed/ff-merged against the SSH origin).
- **Edge re-apply is layered in the gate after a healthy deploy:** `install -m 0644
  deploy/knowledge.conf /home/opc/edge/conf.d/knowledge.conf` → `( cd /home/opc/edge &&
  ./deploy.sh )` (the edge's own `nginx -t` gate → graceful reload; **never** recreate
  `edge-nginx`). A failed edge `nginx -t` reloads nothing and **fails the deploy loudly**. Skipped
  entirely if the deploy is non-zero (no routing cutover onto unhealthy containers).
- **External smoke, both surfaces:** the workflow curls `https://knowledge.hi2vi.com/healthz`
  **and** `/` — both must 200 under a retry loop — then uploads `production-deploy-artifacts`
  (`if: always()`, **14 d** retention).
- **One-time box-clone bootstrap (first deploy only).** If `/opt/knowledge` predates the P9
  machinery (no `deploy.sh`, old single-service compose/vhost), the first deploy reconciles the
  clone to `origin/main` **once** via the same one-shot api container (S5 did this: `383577e →
  c018571` ff-merge, clean). After that first bootstrap the standard chain applies.

## Site Design Build Assets (P5)

The public site's design (Track 1) is delivered by a small, fixed set of source
files that `mkdocs build` copies into `site/` — no build-time asset pipeline, no
custom step:

- **`docs/stylesheets/extra.css`** — the whole design system (wired via
  `mkdocs.yml` `extra_css:`), built into `site/stylesheets/extra.css`, loaded
  *after* Material's CSS so its overrides win.
- **`docs/assets/logo.svg`** + **`docs/assets/favicon.svg`** — branding marks
  (wired via `theme.logo`/`theme.favicon`), built into `site/assets/`.
- **Fonts** load at runtime from a **single Google-Fonts `@import`** at the top of
  `extra.css` (Fraunces + Source Sans 3 + JetBrains Mono, exact weights). This is
  the site's only webfont request: `theme.font: false` suppresses Material's own
  Google-Fonts request (no Roboto). No other CDN or external asset is fetched.
- **No new CI dependency and no `overrides/` `custom_dir`.** Search is browser-only
  and zero-custom-JS (lunr + the `lunr.ko`/`lunr.multi` packs ship inside the pinned
  9.7.6 image). Social cards were deliberately skipped (would pull the `social`
  plugin + cairosvg/Pillow CI deps).
- **Knowledge-map assets (P6):** `docs/javascripts/graph.js` (the vendored renderer)
  is copied into `site/javascripts/` and wired via `extra_javascript`; `extra.css`
  grew a §10 for the map; and a build-time `hooks:` module emits `site/graph.json`
  (see below). This is the repo's first `extra_javascript`, but it adds **no CI
  dependency and no CDN** — the renderer is self-contained and PyYAML (used by the
  hook) already ships with mkdocs.

## Knowledge-graph build hook (P6)

The knowledge map's data is produced by the repo's **first mkdocs `hooks:` module**,
`scripts/graph_hook.py` (block-listed in `mkdocs.yml` as `- scripts/graph_hook.py`):

- **What it does:** `on_files` reassigns a module-level `{src_uri: File.url}` map;
  `on_post_build` walks `config["docs_dir"]`, parses explainer frontmatter itself
  (PyYAML — **no `server/*` import**, so it never drags the server package into the
  build), and writes a deterministic, publish-safe `graph.json` to
  `config["site_dir"]`. It is fetched client-side like `site/search/search_index.json`.
- **Runs in build *and* serve, zero `pages.yml` wiring.** Because the path is relative
  to `mkdocs.yml`, it resolves under CI, a local venv, and the compose image at
  `/docs`; and because it writes to `site_dir` (a temp dir under serve, **never** into
  `docs/`) and reassigns its URL map each rebuild, `mkdocs serve` gets a live,
  up-to-date `graph.json` with **no watch-rebuild loop** and no stale URLs.
- **Serve parity confirmed (P6.S3).** Against the compose `kb` dev server
  (`mkdocs serve --livereload`, base `http://localhost:8765/knowledge/`), curls
  verified `GET /knowledge/graph.json` → 200 (version 1, 6 doc + 26 tag nodes, no
  user-home path leak), `GET /knowledge/graph/` → 200 (mount + `data-graph-src` + the
  vendored script), and the landing card — the hook's `on_post_build` fires under
  live serve, not only `mkdocs build`. The local dev workflow
  (`docker compose up -d kb` at `http://localhost:8765/knowledge/`) is unchanged;
  `.gitignore` still excludes `site/` (so `graph.json` is untracked build output).
- **Documented in the README** ("How it's built" → a Knowledge-map bullet:
  interactive `/graph/`, `graph.json` emitted at build time by `scripts/graph_hook.py`,
  drawn client-side with vendored no-CDN JS).
- **Determinism guarantee:** two consecutive builds produce a **byte-identical**
  `graph.json` (verified by `cmp`); the payload carries no timestamps.

## Plugin distribution: install, setup, and release (P7)

The feature ships as a Claude Code plugin hosted in this repo. Two user-facing
commands plus a root-only release/parity discipline:

- **Install (any Claude Code user):** `/plugin marketplace add leetusik/knowledge`
  → `/plugin install knowledge@knowledge` (a local path also works for testing:
  `/plugin marketplace add ./`). The E2E proved the non-interactive equivalent in a
  sandbox; the interactive `/plugin marketplace add` is the operator's post-phase QA
  (this env's permission system blocks a nested `claude` install). Both manifests pass
  `claude plugin validate .` and `claude plugin validate ./plugin` (plain **and**
  `--strict`).
- **Setup (`/knowledge:setup`)** scaffolds a new KB into a target dir (default
  `~/knowledge`): interview (site title, optional GitHub owner/repo → `site_url` or
  local-only, TZ from the host, ports 8765/8766 unless "advanced", Gemini key **never**
  collected) → `render.py` renders the 35-file scaffold + a `.kb-scaffold.json` marker
  → `git init` + initial commit → write the config file
  (`~/.config/knowledge-kb/config.json`, chmod 600) → `docker compose up -d` +
  `healthz`/viewer probe, else print the `uv run uvicorn …` alternative → print the
  GitHub Pages enablement steps + a verify checklist. **Idempotent** via the marker:
  marked target → reconfigure / re-render-with-diff / abort; a non-empty **unmarked**
  dir is refused (protects the operator's own `~/projects/personal/knowledge`).
  Degraded modes handled: no Docker, no GitHub (local-only), no Gemini (BM25-only).
- **Scaffold deploy gate:** a rendered scaffold builds under
  `squidfunk/mkdocs-material:9.7.6` and passes its **own** portable `site_smoke.py`
  (`--root <scaffold>`) — the phase's crux acceptance, re-proven at review on a
  non-operator scaffold (Field Notes / America/New_York / ports 9765-9766) that also
  exercises the F1 auto-landing on a second project.
- **Template-sync parity (root-only CI):** `scripts/plugin_parity.py` re-renders the
  `plugin/templates/kb/` snapshot with the operator's real params
  (`plugin/templates/params.operator.json`) and byte-compares against repo root, with
  a completeness rule over fully-shipped dirs (a new `server/*.py` cannot silently miss
  the scaffold). It runs on push via a **new** `.github/workflows/plugin-ci.yml`
  ("plugin parity") — **not** `pages.yml`, which stays a portable shipped template.
  `render.py`, `plugin_parity.py`, and `plugin-ci.yml` all live at repo root and are
  **not** part of the shipped `plugin/` payload.
- **Release discipline:** the plugin `version` lives **only** in
  `plugin/.claude-plugin/plugin.json` (never in the marketplace entry) — installers
  receive updates only on a version bump. **Any change under `plugin/**` pairs with a
  `plugin.json` version bump**, plus parity + both `claude plugin validate` runs + the
  E2E before push. Version stays `0.1.0` at this pre-release. **Never push** from any
  slice; deploys and releases are the operator's manual action.
- **uv pin (reproducible build):** the `Dockerfile` uv stage is pinned to
  `ghcr.io/astral-sh/uv:0.8.14` (the uv that produced `uv.lock`), shipped
  byte-identically in the template; bumping uv is a one-line change in both places.

## Web app local build/run (P12; full deploy = P14)

P12 adds an authenticated Next.js app under `web/`, runnable locally only; its production deploy lands with the P14 landing-page / design-gate phase.

- **Toolchain:** pnpm + Node. `pnpm --dir web install`; `pnpm --dir web dev` serves on **`127.0.0.1:3030`**; `pnpm --dir web build` produces a standalone build (`next.config.ts` `output: "standalone"`). `next build` needs **no** env (the server-only keys are lazy-read), so CI builds clean.
- **Checks (the P12 review re-ran all four, green):** `pnpm --dir web typecheck` · `lint` · `test` (vitest — **54** pure-module tests) · `build`. Backend route coverage is the Postgres-gated `tests/test_{dashboard,documents,graph}_api.py` (see qa/backend): with a reachable DSN the full backend suite is **77 passed, 0 skipped**; the default no-DSN run stays green (**65 passed**, the Postgres-gated suites skip cleanly — no committed creds).
- **Two server-only env keys** (`web/.env.example`, both `import "server-only"`, neither `NEXT_PUBLIC_`): **`KB_API_BASE_URL`** (dev default `http://127.0.0.1:8766`) — the backend origin the BFF calls server-to-server; **`SESSION_SECRET`** — the key material (`sha256(SESSION_SECRET)`) sealing the AES-256-GCM session cookie. Neither is committed; both are lazy-read so `next build` works without them.
- **Deferred to P14 (now delivered):** the app's Dockerfile / compose service / edge vhost (behind the shared edge, `output: "standalone"` like hi2vi_web), the public landing page, and the operator's live-app visual acceptance. P12 changed nothing in the production box; **P14 ships the production deploy** — see *Web app production deploy (P14)* below.

## Web app production deploy (P14): `knowledge-web` + reworked edge + mkdocs retirement

P14 makes the `web/` app production-deployable behind the OCI box's dedicated edge, retires the mkdocs `knowledge-site` viewer, and resolves the Next-BFF-vs-FastAPI `/api/auth/*` collision at the edge. All artifacts were validated locally (`docker compose config`, a full `docker build`, a live container smoke, `bash -n` on the deploy scripts); the **live edge apply is an operator gate** run at the phase review.

### Artifacts

- **`web/Dockerfile` (new)** — multi-stage `node:22-slim`, context `web/`, adapted from hi2vi_web's Next-standalone pattern with the **sharp/@img block dropped** (this app has no `next/image`). Build stage: `corepack prepare pnpm@10.28.2`, `pnpm install --frozen-lockfile`, `ARG NEXT_PUBLIC_APP_URL` + a non-empty assert, `ENV NEXT_PUBLIC_APP_URL`, `pnpm build`; **`NODE_ENV` is NOT set in the build stage** (it would drop devDeps → the build fails). Runtime stage: `NODE_ENV=production PORT=3000 HOSTNAME=0.0.0.0`, copy `.next/standalone`→`./` + `.next/static` + `public`, `USER node`, `EXPOSE 3000`, a fetch-based `HEALTHCHECK`, `CMD ["node","server.js"]`. Plus `web/.dockerignore` (lean context: `node_modules`, `.next`, `design/`, `tests/`, `.env*`, …). Proven: `docker build` clean (408 MB), container boots (`node server.js` → Next on `0.0.0.0:3000`), `GET /` + `/login` → 200, image HEALTHCHECK → `healthy`.
- **`compose.prod.yml` — added `web` (container `knowledge-web`).** `build.context ./web` with `args.NEXT_PUBLIC_APP_URL="https://knowledge.hi2vi.com"` (a **build arg**, baked into the client bundle — a rebuild is needed to change it), `expose: ["3000"]` (no host port), `depends_on: api service_healthy`, `changple_shared_network`, a node-fetch healthcheck. Runtime env: `KB_API_BASE_URL: http://knowledge-api:8000` (literal) and **`SESSION_SECRET: ${SESSION_SECRET}` interpolated** (not `env_file: .env`) — so the api's `KB_API_TOKEN` / `POSTGRES_PASSWORD` / operator creds never enter the web container. `api`, `postgres`, `pgdata`, and the external network are unchanged. **The `site` (mkdocs `knowledge-site`) service was REMOVED entirely.**
- **`deploy/knowledge.conf` — reworked to two upstreams.** `set $knowledge_web_upstream knowledge-web;` beside the existing api upstream; a new **`location /api/auth/` → `knowledge-web:3000`** (MORE SPECIFIC than `/api/`, so longest-prefix wins → the Next BFF's auth routes reach the web app while every other `/api/*` still reaches FastAPI, which has no `/api/auth/*` route); **`location / ` → `knowledge-web:3000`** (was the mkdocs site). `/api/ //auth/ //app/ /= /healthz` → `knowledge-api` **unchanged** (the P13 CLI contract, 120 s). **Every edge invariant preserved:** most-specific wins; server-level `proxy_set_header` hoisted with NO per-location set (the new location sets none either); `resolver 127.0.0.11` + variable `proxy_pass` for the web upstream; no `default_server`/IPv6/`limit_req_zone`; Cloudflare real-IP restore; `client_max_body_size 5m`; api `proxy_read_timeout 120s`. **No live `nginx -t` is claimed here** — that gate is the box's `./deploy.sh` (it needs the full `conf.d/` tree + certs).

### mkdocs retirement + deploy-automation follow-through

- **The mkdocs `knowledge-site` viewer is RETIRED** from the box and the edge (Track 1's `/` was it). Its content is **not lost** — it was the operator's personal KB (tenant #1), which lives on as tenant #1's knowledge in the app (browse/search/read + graph) and the api. `/docs` is **reserved for FUTURE product documentation** (a later effort); P14 does not claim it.
- **Deploy automation now health-gates `knowledge-web`.** `deploy/deploy.sh` health-gated the now-removed `knowledge-site` (`wait_healthy site knowledge-site`), which with the service gone would return non-zero and **fail every automated `Production Deploy` with a false failure** — so the gate + its log/artifact/failure strings were swapped to `knowledge-web`; stale service-name comments in `oracle-production-deploy-remote.sh` and `.github/workflows/deploy-production.yml` were fixed too (their functional smoke — `/healthz` + `/`, both 200 — was already correct since `/` now serves the Next app). This is a necessary consequence of removing the `site` service, beyond the five artifacts above.
- **`KB_PUBLIC_BASE_URL` dead-link caveat (flagged, deliberately NOT changed).** `KB_PUBLIC_BASE_URL` stays `https://knowledge.hi2vi.com`; the api's 201 `url` (`{base}/{project}/{date}-{slug}/`, `server/main.py`) used to render on the mkdocs site at `/`, but the Next app has no such route, so that link no longer resolves to a page. **Cosmetic only** — docs are read by id via the api/app, never this link. Repointing it (to the public `docs/` GitHub-Pages track, or degrading it cleanly) is deferred to the prod cutover / a future docs effort. Flagged in `compose.prod.yml` (a `⚠ CAVEAT` comment) and `deploy/README.md §2`.

### New box secret + operator deploy gate

- **New box secret `SESSION_SECRET`** (the AES-256-GCM session-cookie key material, `sha256(SESSION_SECRET)`): the **operator must generate it** into the box's gitignored `.env` (e.g. `printf 'SESSION_SECRET=%s\n' "$(openssl rand -base64 32)" >> /opt/knowledge/.env`). Rotating it invalidates every live session (all users re-login). An unset/blank value → the BFF throws at request time (`src/lib/env.ts`), though `docker compose config` still passes (a dummy suffices for local validation).
- **Operator box-side steps (run at the review gate — nothing is live yet):** (1) generate `SESSION_SECRET` into `/opt/knowledge/.env`; (2) `COMPOSE_BAKE=false docker compose -f compose.prod.yml up -d --build` then `docker compose -f compose.prod.yml rm -sf site` (retire mkdocs) — expect `knowledge-api + knowledge-web + knowledge-postgres` Up (healthy); (3) `scp deploy/knowledge.conf oracle-cloud:/home/opc/edge/conf.d/knowledge.conf` then `ssh oracle-cloud 'cd /home/opc/edge && ./deploy.sh'` (its `nginx -t` gate → graceful reload; NEVER a recreate); (4) smoke `curl https://knowledge.hi2vi.com/healthz` → 200 and `curl https://knowledge.hi2vi.com/` → 200 (the Next landing). Or dispatch the `Production Deploy` Action, which now builds + health-gates `knowledge-api` + `knowledge-web` and smokes both surfaces.

## Knowledge CLI (P13): install, operate, and the edge change

P13 adds a standalone `knowledge` CLI (`cli/`, package `knowledge-cli`, console script `knowledge`) and the edge routing that lets its onboarding reach the hosted host.

- **Install.** `uv tool install ./cli` (from a repo checkout) is the **proven** form. The documented distribution channel is `uv tool install git+https://github.com/leetusik/knowledge#subdirectory=cli` — **true only once the operator pushes `main`** (during P13 `cli/` was unpushed, `git ls-tree origin/main -- cli` empty; the whole P10–P13 control plane was unpushed with it). Pushing also turns `plugin-ci.yml` red — the pre-existing D9 parity debt (34 issues), accepted; the operator picks the timing. Once `main` is pushed both install forms work.
- **Re-install trap: use `--reinstall`, never `--force`.** `uv tool install ./cli --force` **reuses the cached `0.1.0` wheel** and silently keeps the old binary (a stale `knowledge` cost real live-run time in S2). `uv tool install ./cli --reinstall` actually rebuilds. Bumping the version each change would also work; nothing does that today.
- **The edge change.** `deploy/knowledge.conf` gained `location /auth/` + `location /app/` mirroring `/api/` exactly (same `proxy_pass http://$knowledge_upstream:8000`, same 5 s/120 s timeouts, **no per-location `proxy_set_header`** — the header-inheritance footgun). Deploy it the edge's declarative way — **`scp deploy/knowledge.conf oracle-cloud:/home/opc/edge/conf.d/knowledge.conf` then `ssh oracle-cloud 'cd /home/opc/edge && ./deploy.sh'`** (the hard `nginx -t`-gated graceful reload; optionally `./validate.sh` first) — **never `docker cp`, never a recreate of `edge-nginx`**. This is deployed and verified: `GET https://knowledge.hi2vi.com/auth/me` now returns FastAPI JSON (`401`/`404`), not the old mkdocs `404` HTML.
- **The `/auth` throttle knob is not yet on the box.** `KB_AUTH_RATE_LIMIT`/`KB_AUTH_RATE_WINDOW_S` (default 20/900 s) are read from the environment per-call, but they are **not yet interpolated into `compose.prod.yml`'s api env**, so the box runs the code defaults. To tune the limit on the box, add both to `compose.prod.yml`'s api `environment:` — a small ops follow-up (the default is already safe; `compose.prod.yml` is a plugin-parity byte-drift file, so pair it with a parity check).
- **CLI E2E smoke.** `scripts/cli_smoke.py --base-url http://localhost:8766` drives the *installed* binary through the full lifecycle + the 429 (see qa). It assumes a running local stack (`docker compose up -d postgres api`, migrated **in-container**), an installed CLI (`--reinstall`), and a **fresh** `api` for the throttle assertion (the limiter state is in-process; `docker compose restart api` resets the window).
- **`alembic upgrade head` runs *inside* the container.** Postgres publishes no host port, so the host has no `DATABASE_URL` route — `docker compose exec -T api uv run alembic upgrade head`, never the host form.

## Hosted accounts-plane cutover (P10–P13): the operator follow-up that lights up the hosted CLI

> **✅ EXECUTED and verified live at P17 (2026-07-21).** This runbook is now **history/reference** — the cutover ran during P17.S5. The box is at `3ad7bd9`: Postgres up, migrations `0001`+`0002` applied, seed done, `.env` secrets present (proven live by the migrated `401 invalid email or password` + a healthy `/healthz`). **P16 shipped in the same push.** The first cutover proper ran earlier (the `stop → migrate → seed → up` deadlock-safe order below was proven live 2026-07-17); P17's push was an **already-migrated later redeploy** (no new alembic migration `284fc03`↔`3ad7bd9`; P16's SQLite `format`/`raw_html` columns are added idempotently by `init_db()` on boot), so it took the simple redeploy path — with the deploy-hygiene caveat captured in *Explain v2 cutover + deploy-hygiene (P17)* below. Keep this section as the authoritative **first-cutover** runbook for any fresh box.

**The hosted `knowledge init` cannot complete end-to-end until a one-time production cutover the operator owns.** This is *not* a P13 code defect — every P13 deliverable is complete and proven on localhost, and the edge routing (P13's own deliverable) is deployed and verified. The gap is that the **P10–P12 accounts plane was never deployed to prod**. Verified against the box at the P13 review: **no `knowledge-postgres` container is running**, the **box clone is at pre-P13 code** (no `/auth` routes in the running API — the edge routes `/auth/*` through, but the API behind it has no accounts plane yet), and the **box `.env` is missing** `POSTGRES_PASSWORD` / `KB_OPERATOR_EMAIL` / `KB_OPERATOR_PASSWORD`. So the cutover spans P10 → P13. Run it once, in order:

1. **Push `main`.** Ships `cli/` (makes the git install form real), the accounts plane (P10–P12 code), the P13 throttle, and the edge conf to the remote. Accept that `plugin-ci.yml` goes red (D9 parity debt).
2. **Provision the box `.env`** (gitignored, values never committed): add `POSTGRES_PASSWORD`, `KB_OPERATOR_EMAIL` (the operator's signup email), and `KB_OPERATOR_PASSWORD` beside the existing `KB_API_TOKEN` / `GOOGLE_API_KEY`.
3. **Deploy the code** via the manual-dispatch **`Production Deploy`** GitHub Action (or the equivalent on-box reconcile), which brings the box clone to `origin/main` and rebuilds the api image with the accounts plane. Bring up the durable `knowledge-postgres` service (`docker compose -f compose.prod.yml up -d postgres`, wait healthy).
4. **Migrate, then seed — as one-off `run --rm` containers, in this order.** ⚠ **Boot deadlock (proven live 2026-07-17 on the first real cutover):** the api sets `KB_STARTUP_REINDEX=true`, so at boot it calls `get_tenant_one_id()`, which queries the `users` table. On a fresh DB that table does not exist yet → the query raises `AccountsReadError` → the api **crash-loops** (`Restarting`) before it can serve, so `docker compose exec api …` fails with *"container is restarting, wait until the container is running"*. The naive `exec` form therefore cannot bootstrap a fresh box. Break the deadlock by running migrate + seed as **one-off containers** (they run `alembic`/`seed` *instead of* uvicorn, so the startup hook never fires) while the api is stopped, then start the api last:
   ```
   docker compose -f compose.prod.yml stop api
   docker compose -f compose.prod.yml run --rm api alembic upgrade head    # 0001_accounts_tenancy + 0002_usage_events
   docker compose -f compose.prod.yml run --rm api python -m server.seed    # operator user + tenant #1 (+ a project per live docs/ project); idempotent
   docker compose -f compose.prod.yml up -d api                             # now boots clean: get_tenant_one_id() resolves tenant #1, the boot reindex stamps docs/ rows correctly
   ```
   The ordering is load-bearing: the seed **must** precede the api's boot reindex (`get_tenant_one_id()` caches on first success), which `stop → migrate → seed → up` guarantees. On an **already-migrated** box (a later redeploy, not a fresh cutover) the api boots fine and the simpler `docker compose -f compose.prod.yml exec api alembic upgrade head` applies any new migration in place — the one-off form is specifically the *first*-cutover fix.
5. **Deploy the edge conf** if not already applied in step 3's edge re-apply: `scp deploy/knowledge.conf …` + `./deploy.sh` (see *Knowledge CLI* above). Verify `GET https://knowledge.hi2vi.com/auth/me` → **`401` JSON** (not `404` HTML).
6. **Verify hosted end-to-end.** One real `knowledge init --email … --base-url https://knowledge.hi2vi.com` runs the full lifecycle against the hosted base; and the existing `python scripts/onboarding_smoke.py --base-url https://knowledge.hi2vi.com --master-token "$KB_API_TOKEN"` → **PASS** re-confirms tenant #1 + cross-tenant isolation on the live data. Optionally tune `KB_AUTH_RATE_LIMIT` on the box (step in *Knowledge CLI* above).

Until this cutover runs, the CLI works fully against a **localhost** stack (`--base-url http://localhost:8766`) — which is what every P13 slice validated against — and the hosted flow lights up the moment the cutover completes.

## MCP retrieval service deploy (P15): `knowledge-mcp` + SSE-safe edge + dual reachability

P15 adds a third app container to the box — the **MCP-over-HTTP retrieval server** — and makes it **dual-reachable**. All artifacts were validated locally (a full `docker build`, `docker compose config`, `bash -n` on the deploy scripts, and a first-consumer E2E), and re-validated together at the phase review. **The container is now deployed and the public path is verified** (after the P15.F1 redeploy — see *Transport security* below): a bare `GET https://knowledge.hi2vi.com/mcp` returns the routed **406** (not a gateway `502`/`504` and no longer a `421`), and the authenticated `e2e_smoke.py` E2E PASSes end-to-end against `https://knowledge.hi2vi.com/mcp` (initialize → both tools listed → `search` hits → `fetch_document`). The service is a **thin proxy** that holds **no secrets** — its only credential is the per-request inbound `vk_` bearer it forwards upstream.

### Artifacts

- **`mcp-server/Dockerfile` (new).** `python:3.12-slim`, installs the `knowledge_mcp` package + its `knowledge-mcp` console script (a **self-contained image**, NOT bind-mounted like the api), unprivileged (`uid 10001`), `CMD ["knowledge-mcp"]`, and an **image-native HEALTHCHECK** (python `urllib` GET `/healthz` → 200 — curl is absent in the slim image; reaches `healthy` immediately, no startup reindex). Build `docker build -t knowledge-mcp:test ./mcp-server`; run `docker run -e MCP_STATELESS_HTTP=1 -p 9000:9000 knowledge-mcp:test`.
- **`compose.prod.yml` — added the `mcp` service (container `knowledge-mcp`).** `build.context ./mcp-server`, **`expose: ["9000"]`** (no host port), `depends_on: api service_healthy`, on `changple_shared_network`, `restart: unless-stopped`. Env: `KB_API_BASE_URL: http://knowledge-api:8000` (literal — the upstream it proxies) and **`MCP_STATELESS_HTTP: "1"`**. It carries **no `env_file`/secrets**. `api`, `web`, `postgres`, `pgdata`, and the external network are unchanged.
- **`deploy/knowledge.conf` — added `location /mcp` → `knowledge-mcp:9000`, SSE-safe.** `set $knowledge_mcp_upstream knowledge-mcp;` beside the existing upstreams; the location is MORE SPECIFIC than `/` and disjoint from `/api/`, so longest-prefix routing sends `/mcp` there and everything else stays put. **SSE-safe:** `proxy_buffering off` + `proxy_read_timeout`/`proxy_send_timeout 3600s` (a streamed Streamable-HTTP/SSE response is never buffered or cut), riding the inherited server-level HTTP/1.1 keep-alive (`proxy_http_version 1.1` + `Connection ""`). **Every edge invariant preserved:** variable `proxy_pass` for request-time DNS re-resolution (an mcp-container restart self-heals); **NO per-location `proxy_set_header`** (it inherits the full server-level set — the header-inheritance footgun); no `default_server`/IPv6/`limit_req_zone`. NB: Cloudflare still caps a public origin response at ~100 s — which is why the deployed server runs **stateless** (each tool call is a bounded per-call proxy well under that ceiling; the MCP server also sets `X-Accel-Buffering: no` on its SSE responses, the belt-and-suspenders complement).

### Transport security: DNS-rebinding Host allowlist (P15.F1) — required on the box

The deploy **requires** `MCP_ALLOWED_HOSTS` (+ `MCP_ALLOWED_ORIGINS`). `mcp==1.28.1`'s FastMCP **auto-enables DNS-rebinding protection with a localhost-only `Host` allowlist** (its internal `host` defaults to `127.0.0.1`; `MCP_HOST=0.0.0.0` only sets uvicorn's *bind* address, a different knob), so with no explicit `transport_security` the server returned **`421 Invalid Host header`** — **before the MCP handler ran** — to **both** the public edge host `knowledge.hi2vi.com` **and** the internal dual-reachability path `knowledge-mcp:9000`. This was a post-deploy defect: S4's E2E only ever hit `localhost:9000` (the one allowed host), so it surfaced only against the deployed box.

- **Protection stays ON — the allowlist is widened, env-driven.** `config.allowed_hosts()` / `config.allowed_origins()` return the built-in **localhost defaults + `MCP_ALLOWED_HOSTS` / `MCP_ALLOWED_ORIGINS`** (comma-separated, read at call time), and `server.py` now constructs `FastMCP(...)` with an explicit `TransportSecuritySettings(enable_dns_rebinding_protection=True, allowed_hosts=…, allowed_origins=…)` — which bypasses FastMCP's localhost-only auto-branch while keeping rebinding protection enabled.
- **Matching rule (verified against `mcp/server/transport_security.py`).** `_validate_host` is an **exact** string match **OR** a `base:*` wildcard (`host.startswith(base + ":")`). So a **port-less** host such as `knowledge.hi2vi.com` needs an **EXACT** allowlist entry — a `knowledge.hi2vi.com:*` pattern would **not** match it — while a port-carrying host like `knowledge-mcp:9000` is covered by `knowledge-mcp:*`. An **absent** `Origin` passes, so server-side agents (no `Origin` header) are unaffected regardless.
- **Concrete `compose.prod.yml` values (non-secret literals — no box `.env` change):**
  ```yaml
  MCP_ALLOWED_HOSTS: "knowledge.hi2vi.com,knowledge-mcp,knowledge-mcp:*"
  MCP_ALLOWED_ORIGINS: "https://knowledge.hi2vi.com"
  ```
- **Verified in production after the F1 redeploy:** the public `GET /mcp` now returns the routed **406** (was `421`), and the authenticated `e2e_smoke.py` PASSes against `https://knowledge.hi2vi.com/mcp`. Only additions: `mcp-server/src/knowledge_mcp/{config,server}.py`, the `compose.prod.yml` env, and a terse regression test `mcp-server/tests/test_host_allowlist.py` (suite now **11 passed**). `/api/*` untouched (frozen).

### Deploy machinery + smoke

- **The deploy health-gate now covers three services.** `deploy/deploy.sh` builds + recreates `api + web + mcp` and health-gates **all three** (`wait_healthy mcp knowledge-mcp` added, reading the image-native healthcheck via `docker inspect`); its log/artifact/failure strings and the `oracle-production-deploy-remote.sh` comments were updated to name `knowledge-mcp`.
- **The `Production Deploy` external smoke adds a `/mcp` routed-liveness check.** Because the MCP `/healthz` is **internal-only** (the api owns the public `= /healthz`; the edge does NOT route MCP's healthz), the workflow proves the edge reaches a **live** MCP server via the endpoint itself: a bare `GET https://knowledge.hi2vi.com/mcp` (no `Accept: text/event-stream`) must answer **406** (or 400) with a `jsonrpc` body — a routed MCP-server response, NOT a gateway 502/504. `curl -f` is deliberately NOT used there (a non-2xx 406 IS the success signal). This is a **liveness** gate only — the authenticated tool-call E2E is separate (below), not folded into the workflow.
- **Dual reachability.** Internal `http://knowledge-mcp:9000/mcp` (a co-tenant agent like OpenClaw reaches it by container name over `changple_shared_network`, no edge hop) + public `https://knowledge.hi2vi.com/mcp` (off-box / local-dev agents). Both serve the identical two-tool surface.

### First-consumer E2E verifier + operator post-deploy run

- **`mcp-server/scripts/e2e_smoke.py`** is a committed, path-agnostic OpenClaw-shaped MCP client (not a unit test — the terse behavioral tests live in `mcp-server/tests/`): it `initialize`s, `list_tools()` (asserts both tools), `search` (asserts ≥1 grounded hit in the `{title, snippet, url, id, rel_path}` shape), and `fetch_document(id)` (asserts `markdown`), printing `PASS`/`FAIL` + exit code. The bearer is injected via a **custom `httpx_client_factory` that MERGES the `Authorization` header** (the `mcp==1.28.1` transport's `headers=`/`auth=` are deprecated + ignored — a `partial(create_mcp_http_client, headers=…)` silently drops it; see the script + `CONTRACT.md`).
  - **Direct/local path — proven** (client → mcp → `/api` → grounded hit), re-run green at the P15 review against a scratch legacy-mode api + one POSTed doc.
  - **Public-path run — DONE (P15.F1 redeploy).** After the F1 redeploy the same script was run against the public path and **PASSed** end-to-end (with the master `KB_API_TOKEN`), alongside the bare `GET /mcp` → routed `406` liveness probe. The only remaining consumer step is re-running it with a **real hi2vi `vk_` key** once that key is provisioned (hi2vi P18.S5):
    ```sh
    python mcp-server/scripts/e2e_smoke.py --url https://knowledge.hi2vi.com/mcp --key vk_...
    ```
- **Operator box-side steps (the container is now deployed + the public path verified):** the box was cut over via the `Production Deploy` Action (builds + health-gates `knowledge-api` + `knowledge-web` + `knowledge-mcp` and smokes `/healthz` + `/` + the `/mcp` routed-liveness); a redeploy uses the same Action, **or** on-box `COMPOSE_BAKE=false docker compose -f compose.prod.yml up -d --build` then `scp deploy/knowledge.conf oracle-cloud:/home/opc/edge/conf.d/knowledge.conf && ssh oracle-cloud 'cd /home/opc/edge && ./deploy.sh'` (the edge's `nginx -t`-gated graceful reload; NEVER a recreate). The public-path E2E above has PASSed with the master token. Still outstanding: **D13** (populate `url` via `source_url`; empty `url` today is contract-documented as "no citation link, not an error") and the final hi2vi `vk_` provisioning + OpenClaw `mcp.servers.knowledge` config (hi2vi P18.S5).

## Explain v2 cutover + deploy-hygiene (P17)

P17 shipped the explain-skill upgrade and lit up hosted multi-user ingestion. No new
services, no compose *service-set* change, no `.env` change, no new alembic migration —
but three operations facts outlive the phase:

- **The accounts-plane cutover is done; P16 is live.** The P10–P13 cutover ran (see the
  runbook above, now marked executed). P17's `3ad7bd9` push carried **both** P17 S1–S4
  and the entire P16 HTML-explainer pipeline. Verification is credential-free and
  repeatable: `GET /healthz` → 200, `POST /auth/login` nonsense creds → **401
  `invalid email or password`** (the migrated/live discriminator — a dormant or unmigrated
  DB would 500), and unauth `GET /app/documents/1/raw` → **401** (the P16 route is
  present; a pre-P16 api returns route-absent **404**). The full hosted skill-path E2E
  (`format:"html"` ingest → P16 read shape → sandboxed raw-serve with the four headers →
  tenant FTS → MCP `vk_` `fetch_document`) passed live against a fresh throwaway tenant.
- **The split-deploy trap + the F1 fix (bind-mounted `api`).** A GREEN `Production Deploy`
  (run 29830927799) left `knowledge-api` running **stale pre-P16 code** while
  `knowledge-mcp` (which bakes code into its image) updated — because the api runs
  `server/` from the **bind mount** (`.:/repo`), and `dc up -d --build` recreates a
  container only on an image/config change, which a **code-only** push is not. It took an
  operator container restart to land P16, and the deploy's external smoke (`/healthz`,
  `/`, `/mcp` only) never exercises P16, so GREEN did not prove the api picked up new
  code. **P17.F1 closes this in `deploy/deploy.sh`:** after the build it runs
  `dc up -d --force-recreate --no-deps api` (force-recreates the bind-mounted api;
  `--no-deps` leaves postgres alone), and a post-gate `assert_api_fresh` reads the api
  container's `StartedAt` and **fails the deploy closed** if it predates the deploy run
  (the "bind-mount stale-process trap"; GNU `date -d` on the box, guarded to die loudly on
  a parse failure or missing container). **Arming note:** `deploy.sh` runs from the box
  clone and its own reconcile updates that clone, so the **first** post-F1 dispatch runs
  the old script (arming the fix); the force-recreate + freshness assert **arm from the
  second dispatch onward** — the fix is proven on the next organic deploy. F1 did **not**
  add a P16-discriminating smoke probe (out of scope); that remains a candidate hardening.
- **A second plugin-CI drift gate.** `.github/workflows/plugin-ci.yml` now runs
  `scripts/skills_parity.py` (byte-compares the two shipped explain-skill copy bodies)
  right after `plugin_parity.py`. Both drift gates are green, so an origin push no longer
  reddens plugin-CI on parity. Any future edit to the canonical `plugin/skills/explain/`
  body must re-derive `.agents/skills/explain/` or CI goes red.

**Connect-mode onboarding is operational** (no server/edge change): `/knowledge:setup`
Connect mode writes `~/.config/knowledge-kb/config.json` (`api.base_url`/`token`,
`site.base_url`, **no `kb_root`**) so the explain resolver reports remote-only
(`KB_LOCAL_FALLBACK=no`); a bad/revoked `vk_` → 401 with no fallback. A rendered self-host
**scaffold now boots an unused `postgres` container + `pgdata` volume** (the mirrored
template's `depends_on`), staying dormant single-tenant because `{{KB_DATABASE_URL}}`
renders empty → `DATABASE_URL:` unset (see architecture). D11 (deploy self-upgrade) is
**not** triggered — no compose *service-set* change to `compose.prod.yml`/`deploy/**`
(untouched); postgres already exists in prod.

## Invariant

- Never scale `api` workers: the write lock is in-process (single-worker only). WAL gives read concurrency. **(P13) the same single-worker invariant now also underpins the `/auth` throttle's coherence** — its in-process per-IP counter is atomic only under one worker; scaling workers would give each its own counter and break the throttle.
- The knowledge-graph hook writes only to `site_dir`, never into `docs/` — preserving the no-watch-loop property under `mkdocs serve`.
- Any `plugin/**` change pairs with a `plugin.json` version bump; the shipped template stays byte-in-parity with the repo (`plugin_parity.py` / `plugin-ci.yml`).
- **Any slice touching a shipped-payload path (`server/*`, `tests/*`, `Dockerfile`, …) must run `python3 scripts/plugin_parity.py` as part of its *local* validation** — parity only runs in CI on push, so pytest alone will not catch template drift. It was missed twice in P8 (F1, F2) before this became a rule.
- **The hosted box never force-pushes and never `git add -A`** — the scoped-commit + rebase-onto-remote discipline is what keeps a server-side push from ever clobbering `main`.
- **Both hosted behaviors stay flag-gated off by default** (`KB_GIT_PUSH`, `KB_REQUIRE_READ_AUTH`): a local or plugin user gets open reads and a never-pushing agent, exactly as before P8.
- **Edge changes are host file drops + `./deploy.sh`** — never `docker cp`, never a recreate of the edge container.
- **The production deploy is `workflow_dispatch`-only, main-guarded, `concurrency: knowledge-deploy`** (P9) — publish-on-write pushes to `main` must never trigger a redeploy.
- **The box clone is never detached / `reset --hard` / `--force`d** (P9) — it is also the publish-on-write clone; the deploy reconciles on `main` (ff/rebase) so it can never orphan an unpushed doc.
- **All authoritative git in the deploy runs in-container as root** (P9.F1), never opc-side — opc cannot authenticate the SSH origin against the root-owned deploy key.
- **`knowledge-site`'s `--livereload` was load-bearing** (P9) while the mkdocs viewer served `/` — it armed the watcher for fresh-on-write. **RETIRED in P14** (the Next `web/` app now serves `/`); this invariant is history and the `site` service is gone from `compose.prod.yml`, the edge, and the deploy health-gate.
- **The `web/` app's two secrets are server-only** (P12) — `KB_API_BASE_URL` + `SESSION_SECRET` are `import "server-only"`, never `NEXT_PUBLIC_`, and lazy-read so `next build` needs no env; the backend token lives only in the sealed httpOnly cookie, never in a browser bundle.
- **The web app's production deploy shipped in P14** (was deferred at P12) — `web/Dockerfile` + the `knowledge-web` compose service + the reworked edge vhost; the live edge apply stays an operator gate.
- **The edge routes `/api/auth/` → `knowledge-web` as a MORE-SPECIFIC location than `/api/`** (P14) — longest-prefix wins, so the Next BFF's auth routes reach the web app while every other `/api/*` still reaches FastAPI (which has no `/api/auth/*` route). The CLI planes `/api //auth //app /=/healthz` → `knowledge-api` are unchanged; `/` → the Next app. Never add a per-location `proxy_set_header` (the hoisted server-level set would be dropped — the header-inheritance footgun).
- **`knowledge-mcp` MUST run with `MCP_ALLOWED_HOSTS`/`MCP_ALLOWED_ORIGINS` set** (P15.F1) — FastMCP auto-enables DNS-rebinding protection with a **localhost-only** allowlist, so without these env vars every non-localhost caller (the public edge host AND the internal `knowledge-mcp:9000` path) gets `421 Invalid Host header` before the handler runs; `MCP_HOST=0.0.0.0` is only the uvicorn bind and does not help. Protection stays ON (explicit `TransportSecuritySettings`); a **port-less** allowlist host needs an **exact** entry (a `:*` wildcard only matches port-carrying hosts). Do not remove these from `compose.prod.yml`.
- **`SESSION_SECRET` is a required box secret for `knowledge-web`** (P14), operator-generated into the gitignored `.env` and interpolated (not `env_file`) so the api's secrets never enter the web container; rotating it re-logs every user.
- **`KB_PUBLIC_BASE_URL`'s 201 `url` is a dead link post-P14** (cosmetic; deferred) — the mkdocs page that rendered it is retired; docs are read by id via the api/app. Do not treat it as a defect; repoint or degrade it in a future docs effort.
- **CLI re-install is `--reinstall`, never `--force`** (P13) — `--force` reuses the cached wheel and silently keeps the stale binary; the `cli_smoke.py` E2E and any live CLI run must use `--reinstall`.
- **`cli/` code and tests stay out of `server/` and `tests/`** (P13) — those dirs are parity-guarded (`shipped_dirs`); the CLI package is a separate `cli/` subdirectory package, root `pyproject.toml` untouched (`package = false` / no `[build-system]` is load-bearing for Docker's `uv export --no-emit-project`).
- **The hosted CLI flow is gated on the P10–P13 accounts-plane cutover** (P13) — do not treat a hosted `knowledge init` failure as a P13 defect until that one-time operator cutover has run (see *Hosted accounts-plane cutover*). **As of P17 that cutover is executed and verified live**; a hosted `knowledge init` / connect-mode setup now works against `knowledge.hi2vi.com`.
- **`knowledge-api` runs `server/` from the bind mount, so a code-only push needs a force-recreate** (P17.F1) — `deploy/deploy.sh` force-recreates the `api` service and self-asserts its `StartedAt` postdates the deploy; never remove either step, or a GREEN deploy can silently leave the api on stale code (the split-deploy trap). The fix arms from the **second** post-F1 dispatch (the first runs the pre-F1 script from the box clone).
- **`plugin-ci.yml` runs two drift gates** (P17) — `plugin_parity.py` (template) **and** `skills_parity.py` (the two shipped explain-skill copy bodies); any `plugin/skills/explain/` edit must re-derive `.agents/skills/explain/` or CI goes red, and any `plugin/templates/kb/**` drift (or future `server/**`/`tests/**` growth) re-opens template parity.
