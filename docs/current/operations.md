---
doc_id: operations
version: v0011
created_at: 2026-07-16T19:33:06+09:00
source: P10.REVIEW
summary: P10 postgres:17 in both compose files; explicit alembic upgrade head; python -m server.seed + KB_OPERATOR_EMAIL/KB_OPERATOR_PASSWORD prereqs; deploy/migration runbook; onboarding_smoke verifier; still single-worker
previous: v0010_p9_self-hosted_two-service_site_knowledge-api_knowledge-site_live-serve_manual-dispatch_production_deploy_fresh-on-write_replaces_the_65s_pages_sla_pages_retired
---

# Operations

## Status

Both tracks operational, and **as of P9 the whole site — the human web UI *and* the machine API — is self-hosted in production** at <https://knowledge.hi2vi.com>. Two containers run on the box (`knowledge-api` + a `mkdocs serve` **`knowledge-site`** live-serve viewer) behind **two-location edge routing** (`/` → the site, `/api/*`+`/healthz` → the api), with **publish-on-write** — an agent write reaches the public site with no operator action and **no ~65 s Pages lag** (the box serves the doc off the same clone the instant it is written; *fresh-on-write*, proven live at P9.S5). A **manual-dispatch (`workflow_dispatch`) `Production Deploy` GitHub Action** automates the box deploy — reconcile the publish-on-write clone + rebuild/health-gate **both** services + re-apply the edge vhost (see *Automated production deploy* below). **GitHub Pages is retired for this repo's site** (P9); the shipped plugin keeps Pages for downstream users. Locally, `docker compose up -d` still runs two services over the shared bind-mounted repo (the mkdocs viewer and the FastAPI document API). As of P5 the published site carries the operator-designed "calm editorial library" design (one stylesheet + a single Google-Fonts `@import` + two SVG marks) and browser-only Korean/CJK search, and the deploy pipeline is gated by `scripts/site_smoke.py` between build and artifact upload. As of P6 the build also runs a **mkdocs `hooks:` module** (`scripts/graph_hook.py`) that emits the knowledge map's `graph.json` into `site/` — in both CI `mkdocs build` and local `mkdocs serve`, with **zero `pages.yml` changes** — and the smoke guard was extended to cover the graph data contract + the first vendored custom JS. As of P7 the feature is **distributed as a Claude Code plugin** hosted in this repo: a new user installs it and runs `/knowledge:setup` to scaffold their own KB, the deploy gate (`site_smoke.py`) was made **portable** so a fresh scaffold passes its own `pages.yml`, and a **root-only** `.github/workflows/plugin-ci.yml` parity gate keeps the shipped template snapshot in sync with the repo (see *Plugin distribution* below). **As of P10 the box runs a third piece of infrastructure — a `postgres:17` accounts/tenancy control plane** — and gains **two new one-shot deploy steps** (an explicit `alembic upgrade head` migration + an idempotent `python -m server.seed`) plus a committed post-deploy verifier (`scripts/onboarding_smoke.py`). The api stays a **single uvicorn worker**; Postgres sits alongside the content plane, which is untouched in shape (see *P10 cutover* below).

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

## Reindex as Drift-Repair Tool

- `python -m server.reindex` (CLI) and `POST /api/reindex` rebuild the DB from `docs/`. Use them to reconcile manual edits, API-down fallback writes (the `/explain` skill writing/committing directly), and git resets. Reindex never commits.
- **Incremental single-path (P4):** `python -m server.reindex <rel_path>` or `POST /api/reindex {"rel_path": "…"}` reindexes just one file (index if present, delete its row if vanished) — cheap for hot-reload / watch-mode workflows.
- **Startup drift self-heal (P4):** with `KB_STARTUP_REINDEX` true (the default), the app runs a full `reindex()` in its FastAPI lifespan **before** it accepts requests, printing `[kb-api] startup reindex: indexed=… removed=… skipped=… embedded=…`. Single-worker + a tiny corpus + the content-hash embedding cache make boot reindex safe and cheap. Set `KB_STARTUP_REINDEX=0` in a production deployment whose state is already validated to skip it.
- **Embedding sync:** every reindex path (full, single-path, startup) runs a best-effort, content-hash-cached embedding sync — it only re-embeds changed docs, clears orphans, and never fails the reindex (no key → skipped; API/429 → per-doc skip, retried next run). `gemini-embedding-2-preview` has a low per-minute quota (~4–5 req/min); reindex embeds per-doc with bounded 429 backoff and persists each success, so a rate-limited run resumes from the cache on the next reindex.

## P10 cutover: Postgres migrations + seed + onboarding smoke

Turning the box into the multi-tenant SaaS is a **one-time cutover**, ordered so tenant #1 (the live corpus) never loses its identity. **Seed BEFORE the reindex** — `get_tenant_one_id()` caches on first success, so the operator user + tenant must exist before the boot reindex / master bearer resolve tenant #1 (a reindex that runs before seeding stamps `docs/` with the `''` sentinel and needs a re-reindex).

1. Provision the box's gitignored `.env`: add `POSTGRES_PASSWORD`, `KB_OPERATOR_EMAIL` (the operator's signup email), and `KB_OPERATOR_PASSWORD` alongside the existing `KB_API_TOKEN` / `GOOGLE_API_KEY`.
2. `git pull` the box clone.
3. `docker compose -f compose.prod.yml up -d postgres` (wait healthy).
4. `docker compose -f compose.prod.yml exec api alembic upgrade head` — creates the six accounts tables (`0001_accounts_tenancy`). Migrations never run on boot.
5. `docker compose -f compose.prod.yml exec api python -m server.seed` — creates the operator user + tenant #1 + a `projects` row per live `docs/` project (derived from the tree). **Idempotent** — safe to re-run (a second run writes zero rows).
6. Restart the api so its boot reindex — with tenant #1 now resolvable — **re-stamps every `docs/` row's `tenant_id` as tenant #1** (path-derived, no file move). Alternatively `POST /api/reindex` with the master bearer.
7. Verify: `python scripts/onboarding_smoke.py --base-url https://knowledge.hi2vi.com --master-token "$KB_API_TOKEN"` → **PASS** (onboards a throwaway tenant B end-to-end and proves cross-tenant isolation on the live data). The live hi2vi content agent needs **zero** changes — `KB_API_TOKEN` still resolves to tenant #1.

`scripts/onboarding_smoke.py` is the committed post-deploy verifier (`site_smoke.py` style: collect-all-failures, exit non-zero or print `PASS`); it self-derives tenant #1's fixtures from the master bearer's own listing (nothing hardcoded). `python -m server.seed` is Postgres-only and never touches `kb.sqlite3`.

## Auth

- Set / uncomment `KB_API_TOKEN` in `compose.yml` (or pass as env) → `Authorization: Bearer <token>` becomes required on the mutating endpoints (`POST /api/documents`, `DELETE /api/documents/*`, `POST /api/reindex`); GETs stay open. Rotate by changing the value and restarting `api`. **(P10)** in tenant mode (`DATABASE_URL` set) `KB_API_TOKEN` is additionally the pinned **tenant #1 master bearer** (resolved via `KB_OPERATOR_EMAIL`); `vk_` per-project keys and session tokens are the other `/api/*` credentials.
- **(P8)** Adding `KB_REQUIRE_READ_AUTH=true` **as well** puts the read/search surface behind the same bearer. It defaults **false**, so a local token still guards writes only — reads stay open unless you deliberately opt in. The hosted box sets both. `GET /healthz` stays open either way.

## Publishing: self-hosted live-serve (P9; GitHub Pages retired)

Track 1 — the `docs/` tree — is served **live by the box** at the root of <https://knowledge.hi2vi.com/> (the `knowledge-site` `mkdocs serve --livereload` viewer off `/opt/knowledge`), **no longer GitHub Pages** (P9). Because the api writes each doc into the same bind-mounted tree the viewer serves, a published doc is live **the instant it is written** — *fresh-on-write*, which replaces the old ~65 s push→Pages→CDN lag. The git push continues, now **only for off-box backup/history**, not as the publish path.

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

- **Its own compose project, TWO services (P9).** `compose.prod.yml` (repo root) ships
  **`api`** (container `knowledge-api`) **and** **`site`** (container `knowledge-site`, image
  `squidfunk/mkdocs-material:9.7.6`, `command: serve --dev-addr=0.0.0.0:8000 --livereload`,
  the same `.:/docs` bind mount, a python-based healthcheck with `start_period: 40s`). Both
  have **no published host port** and are reached only by the edge, over the external
  `changple_shared_network`, by container name. Pre-P9 it shipped api-only (the public site
  was GitHub Pages); P9 added the live-serve viewer so the box serves the whole site. The
  `--livereload` flag is **load-bearing** — it is what arms the mkdocs watcher so an api write
  surfaces on the site with no restart (fresh-on-write; see the flow below).
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
- **Our vhost ships as `deploy/knowledge.conf`** and lands in the edge's `conf.d/`. As of P9
  it is **two-location** (was a single `location /` → api): `location /api/` + `location =
  /healthz` → `knowledge-api`, and `location /` → **`knowledge-site`** (the mkdocs viewer).
  Both upstreams are `set $var` names re-resolved via Docker-DNS **re-resolution**
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

## Invariant

- Never scale `api` workers: the write lock is in-process (single-worker only). WAL gives read concurrency.
- The knowledge-graph hook writes only to `site_dir`, never into `docs/` — preserving the no-watch-loop property under `mkdocs serve`.
- Any `plugin/**` change pairs with a `plugin.json` version bump; the shipped template stays byte-in-parity with the repo (`plugin_parity.py` / `plugin-ci.yml`).
- **Any slice touching a shipped-payload path (`server/*`, `tests/*`, `Dockerfile`, …) must run `python3 scripts/plugin_parity.py` as part of its *local* validation** — parity only runs in CI on push, so pytest alone will not catch template drift. It was missed twice in P8 (F1, F2) before this became a rule.
- **The hosted box never force-pushes and never `git add -A`** — the scoped-commit + rebase-onto-remote discipline is what keeps a server-side push from ever clobbering `main`.
- **Both hosted behaviors stay flag-gated off by default** (`KB_GIT_PUSH`, `KB_REQUIRE_READ_AUTH`): a local or plugin user gets open reads and a never-pushing agent, exactly as before P8.
- **Edge changes are host file drops + `./deploy.sh`** — never `docker cp`, never a recreate of the edge container.
- **The production deploy is `workflow_dispatch`-only, main-guarded, `concurrency: knowledge-deploy`** (P9) — publish-on-write pushes to `main` must never trigger a redeploy.
- **The box clone is never detached / `reset --hard` / `--force`d** (P9) — it is also the publish-on-write clone; the deploy reconciles on `main` (ff/rebase) so it can never orphan an unpushed doc.
- **All authoritative git in the deploy runs in-container as root** (P9.F1), never opc-side — opc cannot authenticate the SSH origin against the root-owned deploy key.
- **`knowledge-site`'s `--livereload` is load-bearing** (P9) — it arms the watcher that makes fresh-on-write work; dropping it means new docs need a container restart.
