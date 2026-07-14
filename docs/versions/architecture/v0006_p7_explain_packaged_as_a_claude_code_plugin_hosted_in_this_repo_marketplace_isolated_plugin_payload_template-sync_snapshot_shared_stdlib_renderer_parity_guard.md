---
doc_id: architecture
version: v0006
created_at: 2026-07-14T16:21:04+09:00
source: P7.REVIEW
summary: P7: /explain packaged as a Claude Code plugin hosted in this repo — marketplace + isolated plugin/ payload, template-sync snapshot + shared stdlib renderer + parity guard
previous: v0005_p6_build-time_knowledge-graph_data_pipeline_mkdocs_hook_to_graph.json_static_asset_plus_browser-only_client-side_rendering_seam
---

# Architecture

## Status

Both tracks are implemented (Track 2 the DB-backed document API, Track 1 public GitHub Pages publishing). This doc records the stable system shape. As of P4 the previously-documented `sqlite-vec`/RRF extension seam is **consumed**: hybrid semantic search is live, reusing changple5's Gemini embedding setup, with the single-worker invariant untouched. As of P5 the search *boundary* is explicit: the deployed static site searches **entirely in the browser** and is fully decoupled from the local FastAPI hybrid — same corpus, two independent search implementations chosen by deployment target. As of P6 the static site also carries an **interactive knowledge graph** built the same browser-only way: a build-time mkdocs hook emits a `graph.json` static asset and a vendored client-side renderer draws it — no server, no new hosting (see below). As of P7 the whole feature is **packaged as a Claude Code plugin hosted in this same repo**: a repo-root marketplace manifest + an isolated `plugin/` payload ship the `/knowledge:explain` and `/knowledge:setup` skills so any Claude Code user can install it and scaffold their own KB, without changing the system shape below (see *Plugin packaging* section).

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
5. make a **scoped** git commit — `git add` only the two touched paths (**never `-A`**), **never push**.

A failed commit **never rolls back** the file/DB (`committed:false`); `docs/` stays canonical and `POST /api/reindex` reconciles any drift (manual edits, API-down fallback writes, git resets).

## Boundaries / Constraints

- **Single-writer**: one uvicorn worker + one in-process lock — never scale workers (WAL gives read concurrency).
- **Auto-nav preserved**: `mkdocs.yml` has no `nav:` / `strict:` key; the viewer builds its sidebar from the `docs/` tree.
- **Optional bearer auth** on mutating endpoints only (`KB_API_TOKEN`).
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
- **Local FastAPI service (Track 2) — server-side hybrid.** `POST /api/search`
  runs BM25 (SQLite FTS5) + recency + Gemini-embedding cosine fused via RRF, with
  query-time CJK prefix expansion (`build_match_query`). It runs only against the
  local DB behind the API and is **never reachable from the published static
  site** — a static Pages host cannot call it.

The decoupling is deliberate: the deployed site must work with zero backend, and
the richer hybrid stays a local/SaaS-someday capability. The same `docs/` corpus
feeds both — the API reindexes from files; mkdocs builds its index from the same
files — but a change to one search path never affects the other.

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
- **`/explain` consumer**: the `/explain` skill (in `bootstrap_agentic_workspace`) becomes the API's client, POSTing documents instead of writing files — delivered via a prepared handover prompt in that other repo (operator action, never edited from here).
- **SaaS-someday** remains noted; the architecture is kept from precluding it (the browser-only static-search boundary keeps the deployed site backend-free without foreclosing a hosted hybrid later).
