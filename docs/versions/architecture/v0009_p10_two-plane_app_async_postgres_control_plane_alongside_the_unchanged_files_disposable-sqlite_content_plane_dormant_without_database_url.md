---
doc_id: architecture
version: v0009
created_at: 2026-07-16T19:32:55+09:00
source: P10.REVIEW
summary: P10 two-plane app: async Postgres control plane alongside the unchanged files + disposable-SQLite content plane; dormant without DATABASE_URL
previous: v0008_p9_track_1_web_ui_is_now_self-hosted_mkdocs_live-serve_not_github_pages_two_services_knowledge-api_knowledge-site_on_one_box_behind_two-location_edge_routing_-_site_api_healthz_-_api
---

# Architecture

## Status

Both tracks are implemented (Track 2 the DB-backed document API, Track 1 public GitHub Pages publishing). This doc records the stable system shape. As of P4 the previously-documented `sqlite-vec`/RRF extension seam is **consumed**: hybrid semantic search is live, reusing changple5's Gemini embedding setup, with the single-worker invariant untouched. As of P5 the search *boundary* is explicit: the deployed static site searches **entirely in the browser** and is fully decoupled from the local FastAPI hybrid — same corpus, two independent search implementations chosen by deployment target. As of P6 the static site also carries an **interactive knowledge graph** built the same browser-only way: a build-time mkdocs hook emits a `graph.json` static asset and a vendored client-side renderer draws it — no server, no new hosting (see below). As of P7 the whole feature is **packaged as a Claude Code plugin hosted in this same repo**: a repo-root marketplace manifest + an isolated `plugin/` payload ship the `/knowledge:explain` and `/knowledge:setup` skills so any Claude Code user can install it and scaffold their own KB, without changing the system shape below (see *Plugin packaging* section). As of P8 the API is also **deployed hosted** — one codebase, **two deployments** whose differences are two default-off flags — which turns the write path into a **publish path** (see *Two deployments* below). As of P9 **Track 1's public site is self-hosted too**: the human web UI is served **live** by a `mkdocs serve` `knowledge-site` viewer on the box (**not GitHub Pages**, retired), so the box runs **two independent services** (`knowledge-api` + `knowledge-site`) behind **two-location edge routing** — one public domain, `knowledge.hi2vi.com`, for both tracks (see *Self-hosted site* below). As of P10 the FastAPI app is a **two-plane process**: the unchanged content plane now runs alongside a new **async Postgres control plane** (accounts / tenants / projects / credentials), making the deployment a **multi-tenant SaaS** — the live corpus becomes **tenant #1** and every `/api/*` bearer resolves to a tenant (see *Two-plane app* below).

## System Shape

Two containers run side by side over **one** bind-mounted repo:

- **`kb`** — the MkDocs Material viewer (host 8765, repo mounted at `/docs`), auto-nav from the `docs/` tree.
- **`api`** — the FastAPI read/write document service (host 8766, repo mounted at `/repo`), single uvicorn worker.
- **Persistence**: `docs/` markdown is the **canonical** store; SQLite (`data/kb.sqlite3`, FTS5, WAL) is a **disposable projection** rebuilt from files by reindex.

The shared bind mount is what lets a write on the API (8766) live-reload on the viewer site (8765) within ~1s.

## API-Owns-Writes Flow

A single `POST /api/documents`, under one in-process write lock:

1. validate the convention inputs;
2. write `docs/<project>/<YYYY-MM-DD>-<slug>.md` with byte-exact frontmatter;
3. insert the Recent bullet in `docs/index.md` (marker → `## Recent` heading → append ladder);
4. upsert the DB row;
5. make a **scoped** git commit — `git add` only the touched paths (**never `-A`**);
6. **(P8, hosted only)** publish it: fetch → rebase onto `origin/main` → **non-force** push.

A failed commit **never rolls back** the file/DB (`committed:false`); `docs/` stays canonical and `POST /api/reindex` reconciles any drift (manual edits, API-down fallback writes, git resets). A failed **push** likewise never fails the write (`pushed:false` + `push_error`) — the commit simply publishes on the next successful push.

## Two deployments, one codebase (P8)

The same `server/` runs in two places. **The entire difference is two flags, both defaulting
off** — there is no hosted fork, no second code path, and no "prod mode":

| | **Local / plugin** (default) | **Hosted** (`knowledge.hi2vi.com`) |
|---|---|---|
| Reads / search | open | bearer (`KB_REQUIRE_READ_AUTH=true`) |
| Writes | bearer when `KB_API_TOKEN` set | bearer (always — token set) |
| After the scoped commit | **never pushes** | fetch → rebase → non-force push (`KB_GIT_PUSH=true`) |
| Repo it writes to | the user's own working tree (bind mount) | **its own clone on the box** |

Three architectural consequences worth stating plainly:

- **Default-off is the compatibility contract.** Every existing local and plugin user gets the
  pre-P8 behavior *by doing nothing* — the open-read, never-push UX is preserved not by policy
  but by the defaults. A hosted-only capability can never leak into a local install by accident.
- **The write path became the publish path.** Hosted, a single `POST /api/documents` carries a
  document all the way from JSON to a publicly readable page (~1 min): file + landing + Recent
  bullet + DB row + embedding + commit + push → GitHub Pages CI. No operator action, no queue,
  no worker — the whole chain runs **in-request, inside the write lock**. This is what makes
  the single-writer invariant load-bearing rather than incidental: it is what lets a git push
  live safely inside a request handler.
- **The box owns a real clone, not a mount.** Because the hosted API pushes, it needs an
  `origin` and a credential, so it clones the repo rather than bind-mounting a working tree.
  **Fetch+rebase-before-push is therefore both the safety mechanism and the freshness
  mechanism**: the box lands on top of the latest remote at every write, so it can neither
  clobber operator work nor drift stale — no cron, no webhook, no mirror.

The hosted API is a **co-tenant behind a dedicated, declaratively-configured nginx edge** on the
operator's box; as of P9 the **public site is self-hosted on the same box** (no longer GitHub
Pages — see *Self-hosted site* below). Deployment mechanics and the edge's rules live in
**operations**; the auth/credential model in **security**.

## Self-hosted site: two services, one domain, two-location routing (P9)

P9 makes the box the **single public front door** for the whole knowledge site — the human web
UI **and** the machine API — retiring GitHub Pages. Two independent services run side by side on
the box and are routed by path at the edge:

| | **`knowledge-site`** (Track 1, humans) | **`knowledge-api`** (Track 2, agents) |
|---|---|---|
| What | `squidfunk/mkdocs-material:9.7.6` `mkdocs serve --livereload` viewer | the FastAPI read/write document service |
| Serves | the browsable static/client-side site (`/`) | `/api/*` + `/healthz` |
| Reads the API? | **never** — fully static/client-side (lunr + `graph.json`) | n/a |
| Source | the **same** box clone (`/opt/knowledge`), bind-mounted `.:/docs` | the same clone, bind-mounted `.:/repo` |

- **Live-serve, not a static build.** The viewer serves live off the box clone, so a doc the api
  writes into the shared bind-mounted `docs/` surfaces on the site **with no rebuild and no
  restart** (`--livereload` arms the watcher; cross-container `inotify` over the shared mount
  fires it). This is the P9 replacement for Pages' ~65 s push→build→CDN lag — **fresh-on-write**,
  proven live at P9.S5. Serving decision: **live-serve** over static rebuild-on-write or cron
  rebuild (see decisions).
- **The two services are independent and share only the domain.** Because the viewer is
  browser-only and never calls the API, they coexist on one domain purely via **path-based edge
  routing** (`deploy/knowledge.conf`: `/` → `knowledge-site`, `/api/*` + `/healthz` →
  `knowledge-api`). The browser-only search/graph decoupling below is what *lets* them cohabit
  without coupling — same corpus, no runtime dependency between them.
- **One codebase still.** Self-hosting the site adds a compose service + an edge location; it
  changes **no** application code — the viewer is the stock mkdocs image, and the site's content
  is the same `docs/` tree both tracks share.

## Two-plane app: Postgres control plane + content plane (P10)

P10 turns the single-tenant deployment (one shared `KB_API_TOKEN`, no user model) into a **multi-tenant SaaS** by adding a second plane **inside the same FastAPI process** — no new service, still one uvicorn worker:

- **Control plane = Postgres, async, transactional.** `/auth/*` (signup/login/logout/me sessions) and `/app/*` (tenant projects + `vk_` per-project ingest credentials). Six accounts tables (`users`, `tenants`, `tenant_members`, `projects`, `project_credentials`, `auth_tokens`) on async SQLAlchemy 2.0 + psycopg3, migrated by Alembic. Tenant-scoped: every cross-tenant read/write answers **404** so existence never leaks. Ownership is the `tenant_members` join (solo-owner MVP: `require_user` → `tenants[0]`, no tenant switching / invites / roles in P10).
- **Content plane = unchanged in shape.** Files under `docs/` stay **canonical**; `kb.sqlite3` (FTS5 + vectors) is still a disposable projection rebuilt from files on boot. `WRITE_LOCK` + the single uvicorn worker are preserved — Postgres does **not** touch the content write lock. What P10 adds is **tenant scoping**: `documents.tenant_id`, a per-tenant content root, and a tenant filter on every read/search/list/by-id/by-path/delete query.
- **Two roots, one canonical model.** Tenant #1 (the operator / live corpus) keeps `docs/<project>/…` **unchanged** (frozen contract + public mkdocs site intact); every other tenant's content lives under a **namespaced, non-published `<KB_ROOT>/tenants/<uuid>/` root** (a sibling of `docs/`, gitignored, never in the mkdocs build). No invariant inversion, no per-tenant git repos, no per-tenant public sites (P12 territory).
- **Lazy / dormant control plane.** With `DATABASE_URL` **unset** the accounts engine is never created and `/api/*` behaves **byte-for-byte** like the pre-P10 single-`KB_API_TOKEN` deployment (the 65-test legacy regression gates this). Tenant mode switches on only when `DATABASE_URL` is set — the content plane boots either way.
- **Tenant #1 = the live corpus, zero client changes.** `KB_API_TOKEN` is kept as tenant #1's **pinned master bearer** (resolved via `KB_OPERATOR_EMAIL`), so the live hi2vi content agent needs no changes; new tenants use `vk_` keys, and session tokens drive the control plane and own-corpus reads.

**Hard coupling — tenant identity lives in the file path.** Because `kb.sqlite3` is rebuilt from files on every boot, a `tenant_id` stored only in the DB would be wiped on each reindex. So `reindex` **re-derives** `tenant_id` from the content root (`docs/` → tenant #1; `tenants/<uuid>/` → the dir name), and cross-tenant isolation therefore **survives a full disposable-DB rebuild** (verified in the P10 review E2E: deleting `kb.sqlite3` and rebooting re-stamps every row correctly and isolation still holds).

## Boundaries / Constraints

- **Single-writer**: one uvicorn worker + one in-process lock — never scale workers (WAL gives read concurrency). P8 makes this stricter, not looser: the in-request git push lives inside that lock. P10 keeps this exactly: the async Postgres plane sits alongside but never touches `WRITE_LOCK`.
- **Auto-nav preserved**: `mkdocs.yml` has no `nav:` / `strict:` key; the viewer builds its sidebar from the `docs/` tree.
- **Bearer auth** on mutating endpoints always (`KB_API_TOKEN`), and on reads/search too when `KB_REQUIRE_READ_AUTH` is set (hosted). `healthz` is always open; there is **no CORS** — the API has no browser client by design.
- **The API never force-pushes and never `git add -A`** — a scoped, rebase-onto-remote, non-force push is the only way it touches a remote.
- **This repo never edits the `bootstrap_agentic_workspace` repo.**
- **Two search implementations, one corpus (P5)** — see below.

## Search Boundary: browser-only static search vs. the local hybrid (P5)

The knowledge corpus (`docs/`) is searched by **two independent implementations,
selected by deployment target** — they share the source content but no runtime:

- **Published GitHub Pages site (Track 1) — browser-only.** Search runs entirely
  client-side: mkdocs-material's lunr search, configured `plugins.search: lang:
  [en, ko]`, with the `lunr.ko` (Korean trimmer/stopwords) + `lunr.multi` packs
  bundled into the static build from the pinned 9.7.6 image. The static index
  (`site/search/search_index.json`) and worker are the whole system — **no backend
  call**. Korean/CJK matching is achieved by Material's typeahead trailing-wildcard
  riding Korean eojeol spacing (a `관련` query prefix-matches indexed `관련해`), not
  by a segmenter. This is the *only* search the deployed site has; it never
  depends on `server/`.
- **The FastAPI service (Track 2) — server-side hybrid.** `GET /api/search`
  runs BM25 (SQLite FTS5) + recency + Gemini-embedding cosine fused via RRF, with
  query-time CJK prefix expansion (`build_match_query`). It runs against the DB behind
  the API and is **never reachable from the published static site** — a static Pages
  host cannot call it, and the site never tries.

The decoupling is deliberate, and **neither P8 nor P9 weakened it — P9 made it load-bearing**:
the API is reachable from the internet (hosted), and as of P9 the site is served from the **same
box on the same domain** as the API — yet the site *still* never calls it (its search is
browser-only lunr; its graph is a build-time static `graph.json`). That browser-only boundary is
exactly what lets the two services **cohabit one domain behind path routing** with **no CORS** and
no runtime coupling — the only API consumer is still a server-side agent holding a bearer. The deployed site must work with zero backend; the richer hybrid stays an
API-side capability, now available to server-to-server consumers as well as locally. The
same `docs/` corpus feeds both — the API reindexes from files; mkdocs builds its index from
the same files — but a change to one search path never affects the other.

## Knowledge Graph: build-time static data + browser-only rendering (P6)

The interactive knowledge map (Track 1) is a **static-site feature** built on the
same principle as browser-only search — the published Pages site cannot call the
local FastAPI/DB, so the graph is a **build-time static asset drawn client-side**,
not a live query. Two decoupled halves, both self-contained in this repo:

- **Data (build time).** A mkdocs **`hooks:` module** (`scripts/graph_hook.py`,
  PyYAML-only, no `server/*` import) parses the explainer-doc frontmatter and emits
  a deterministic, publish-safe `graph.json` into `site/` at build — fetched
  client-side exactly like Material's own `site/search/search_index.json`. It runs
  in **both** `mkdocs build` (CI/deploy) and `mkdocs serve` (local dev), so it needs
  **zero `pages.yml` wiring** and the local dev server stays a faithful preview
  (writes to `site_dir`, never into `docs/`, so no watch-rebuild loop). The node/edge
  data contract lives in **data**; the hook mechanics live in **operations**.
- **Rendering (browser).** One vendored file (`docs/javascripts/graph.js`) fetches
  `graph.json` and draws the map on `<canvas>` with a hand-rolled force sim — zero
  third-party code, zero CDN (renderer detail in **frontend**). The `/graph/` page
  is reachable from the auto-nav top tab and a landing card.

Why this shape matters architecturally: the whole feature is a **browser-only,
backend-free capability** that adds **no new hosting and no runtime dependency** —
it never touches the Track 2 API/DB boundary. And because the machinery is
**self-contained in `scripts/` + `docs/javascripts/`** with no third-party
dependency, it keeps the P7 `/explain` plugin-packaging path and the SaaS-someday
option open rather than foreclosing them. The build-time API groundwork (`related:`
forward edges from P4) is consumed here read-only: the hook inverts and joins the
frontmatter into nodes/edges without changing the corpus.

## Plugin packaging: marketplace + isolated payload + template-sync (P7)

The knowledge feature is distributed as a **Claude Code plugin hosted in this same
repo** — one repo is both marketplace and plugin. It adds a distribution layer over
the running system without changing the two-container shape, the API, or the site:

- **Two manifests, one payload dir.** Repo-root `.claude-plugin/marketplace.json`
  (marketplace `knowledge`, owner `leetusik`) has a single entry
  `{name: "knowledge", source: "./plugin"}`; the installable payload lives entirely
  under `plugin/` with `plugin/.claude-plugin/plugin.json` (`version` set **here
  only**, `license: MIT`, homepage = the live Pages site). Install path:
  `/plugin marketplace add leetusik/knowledge` → `/plugin install knowledge@knowledge`.
- **Payload isolation is the load-bearing boundary.** A plugin's `source` dir is
  copied **whole** into every installer's cache, so `source: "./"` would ship the
  operator's personal `docs/`, `works/`, `data/`, `.env`, and tokens. Putting the
  payload under `plugin/` and pointing the marketplace at `./plugin` ships **only**
  the templated KB + the two user-facing skills — never the operator's content or the
  workspace machinery (`scripts/workflow.py`, workflow skills, `executors.toml`,
  `CLAUDE.md`/`AGENTS.md`). Skills reach payload dirs at runtime via
  `${CLAUDE_PLUGIN_ROOT}`.
- **Template-sync: a byte-parity snapshot, not a fork.** The scaffold a new user gets
  is a checked-in snapshot under `plugin/templates/kb/` mirroring the repo tree
  path-for-path, declared by ONE manifest (`plugin/templates/manifest.json`) in three
  file classes — **byte-identical** (all of `server/*`, `scripts/graph_hook.py`,
  `scripts/site_smoke.py`, `Dockerfile`, `pyproject.toml`, `uv.lock`, `pages.yml`,
  tests, assets), **parameterized-at-scaffold** (`mkdocs.yml` name/url/copyright,
  `compose.yml` TZ/ports via 7 `{{KB_*}}` placeholders), and **template-only** (a
  generic `docs/index.md` + one seed explainer + generic `Makefile`/`.gitignore`).
  ONE stdlib renderer (`plugin/setup/render.py`, importable `render()`) is shared by
  the setup skill **and** a root-only parity guard (`scripts/plugin_parity.py`) that
  re-renders with the operator's real params and byte-compares against repo root; a
  completeness rule catches a file added on one side but not the other. Drift fails a
  **new root-only** `.github/workflows/plugin-ci.yml` — the parity gate is deliberately
  **not** wired into `pages.yml` (which itself ships as a portable template). This
  keeps the operator's live repo and the shipped scaffold provably in sync without a
  second source of truth.
- **Deploy-gate portability underpins the whole scheme.** For a fresh scaffold to pass
  its own `pages.yml` deploy gate, `scripts/site_smoke.py` was de-hardcoded (P7.S1):
  its per-project checks now derive project dirs **dynamically** from the docs tree,
  so a scaffold with only its seed project passes — the same guard the operator's repo
  runs, shipped byte-identical.

## Extension Points

- **Hybrid semantic search (delivered P4):** the `sqlite-vec`/RRF seam in `server/search.py` is now consumed. Embeddings come from Gemini (`server/embeddings.py`, reusing changple5's `google-genai` convention), are cached by content hash in a plain `document_embeddings` BLOB table (the local venv Python can't load SQLite extensions), and a Python cosine ordering is fused with keyword ranking via RRF. The seam stays **upgrade-ready** — vectors are keyed by `doc_id`, so adopting `sqlite-vec` later touches only `db.py` + `search.py`'s cosine loop; the fusion, signals, and `mode` logic are unaffected. Embeds happen in-request (best-effort, outside the write lock) or at reindex — no background workers, so the single-worker invariant holds. With no key, search degrades gracefully to BM25-only.
- A future personal web UI built on the read API (the P4 aggregations `GET /api/tags`/`GET /api/projects` and `related` cross-links are groundwork for it; the P4 `related:` cross-links were also consumed by the P6 knowledge graph, delivered as a build-time static asset rather than an API call).
- **SaaS-someday** is noted and the architecture is kept from precluding it (out of scope for now).

## Roadmap

- **Track 1 (GitHub Pages publishing) — live and redesigned (P3 → P5)**: published at <https://leetusik.github.io/knowledge/>; P5 added the operator-designed visual system and browser-only CJK search. Deploys stay on the operator's manual `git push`, now gated by `scripts/site_smoke.py`.
- **P6 — Obsidian-like knowledge graph — delivered.** An interactive client-side map of the corpus (docs + tag nodes, `related:` + doc–tag edges) rendered on the published static site, hosting unchanged. Built as a build-time `graph.json` static asset (mkdocs hook) + a vendored no-CDN canvas renderer; consumes the P4 `related:` forward edges (backlinks derived by inverting them at build). See the Knowledge Graph section above.
- **P7 — `/explain` as a Claude Code plugin — delivered.** The feature ships as a plugin hosted in this knowledge repo (marketplace + isolated `plugin/` payload, `/knowledge:explain` + `/knowledge:setup`; see *Plugin packaging* above). This unblocks the bootstrap repo's P7 (retire its embedded `/explain`), which stays exactly as-is until the operator runs that handover — never edited from here.
- **P8 — hosted API + publish-on-write — delivered.** The document API runs in production at <https://knowledge.hi2vi.com> behind a bearer, and an agent write now publishes itself to GitHub Pages with no operator action. Its first real consumer is the **hi2vi content agent** (that repo's P15.S4), which both *writes* daily research docs and *reads/searches* the accumulated corpus for topic dedup and grounding — the API contract it codes against is frozen and published in **api**. See *Two deployments* above.
- **P9 — self-hosted full site + automated production deploy — delivered.** The whole site (web UI + API) is now self-hosted at <https://knowledge.hi2vi.com>: a `mkdocs serve` `knowledge-site` viewer joins `knowledge-api` on the box behind two-location edge routing, **GitHub Pages is retired** for this repo's site (the shipped plugin keeps it), and the write path publishes **fresh-on-write** off the live-serve clone (the ~65 s Pages lag is gone). The box deploy is now a **manual-dispatch (`workflow_dispatch`) `Production Deploy` GitHub Action** mirroring `hi2vi_web`'s three-script split, adapted for the publish-on-write clone (reconcile-on-`main`, never detach/reset/force; all authoritative git in-container; gate + fix-forward, no rollback; edge re-apply in the gate). See *Self-hosted site* above; mechanics in **operations**.
- **`/explain` consumer**: the `/explain` skill (in `bootstrap_agentic_workspace`) becomes the API's client, POSTing documents instead of writing files — delivered via a prepared handover prompt in that other repo (operator action, never edited from here).
- **SaaS-someday** remains noted, and P8 moved it from theory toward practice without committing to it: the codebase already runs hosted, authenticated, and multi-consumer-ready behind one token. What is still missing for real SaaS is multi-tenancy (per-user corpora + auth), not hosting. The browser-only static-search boundary keeps the deployed site backend-free either way.
