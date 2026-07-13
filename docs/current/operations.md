---
doc_id: operations
version: v0006
created_at: 2026-07-14T05:08:17+09:00
source: P6.REVIEW
summary: P6: mkdocs hooks graph.json emitter build and serve extended smoke guard serve-parity confirmed README knowledge-map mention
previous: v0005_p5_site_design_build_asset_set_single_google-fonts_import_deploy-gating_site_smoke.py_guard_local_build_eyeball_workflow
---

# Operations

## Status

Both tracks operational. `docker compose up -d` runs two services over the shared bind-mounted repo (the mkdocs viewer and the FastAPI document API), and Track 1 is published live at <https://leetusik.github.io/knowledge/> via GitHub Pages CI. As of P5 the published site carries the operator-designed "calm editorial library" design (one stylesheet + a single Google-Fonts `@import` + two SVG marks) and browser-only Korean/CJK search, and the deploy pipeline is gated by `scripts/site_smoke.py` between build and artifact upload. As of P6 the build also runs a **mkdocs `hooks:` module** (`scripts/graph_hook.py`) that emits the knowledge map's `graph.json` into `site/` — in both CI `mkdocs build` and local `mkdocs serve`, with **zero `pages.yml` changes** — and the smoke guard was extended to cover the graph data contract + the first vendored custom JS.

## Local Development

- Tooling: uv (`/opt/homebrew/bin/uv`), Python 3.12.
- Install: `uv sync`.
- Test: `uv run pytest -q`.
- Run API (host): `uv run uvicorn server.main:app --port 8766`.
- Reindex (drift repair CLI): `uv run python -m server.reindex` (prints `indexed:/removed:/skipped:/embeddings:/duration_ms:`; never runs git). P4: `uv run python -m server.reindex <rel_path>` reindexes a single path incrementally (reports per-path). The `embeddings:` line reports the content-hash-cached embedding sync (`embedded=… cached=… removed=… skipped_reason=…`).

## Deployment (Docker Compose)

Two services over one bind-mounted repo:

- **`kb`** (viewer): image `squidfunk/mkdocs-material:9.7.6` (exact pin), host port **8765**, command `serve --dev-addr=0.0.0.0:8000 --livereload`. `--livereload` is **explicit and load-bearing** — the flag never arms by default in this image, so without it new pages don't appear until restart. `restart: unless-stopped`.
- **`api`**: `build: .` from `python:3.12-slim` + apt `git` + **`tzdata`** + uv-installed deps (`uv export --frozen --no-dev --no-emit-project` → `uv pip install --system`); host port **8766**; `KB_ROOT=/repo`, `TZ=Asia/Seoul`; **single uvicorn worker**; `restart: unless-stopped`. `tzdata` is required — without it `TZ=Asia/Seoul` silently falls back to UTC and `date.today()` yields wrong file dates near midnight KST. System-level git identity `kb-api` + `git config --system safe.directory /repo` (system-level so the `/repo` bind mount can't shadow them; without both, commits return `committed:false`).
- **Rebuild quirk on this host**: `docker compose up -d --build` panics in compose's *bake* build path (a compose-v2 bug on this host). Rebuild with **`COMPOSE_BAKE=false docker compose up -d --build`**.

## Environment Variables

| Name | Required | Purpose | Notes |
|---|---|---|---|
| `KB_ROOT` | no | repo root (`docs_root` = `KB_ROOT/docs`) | `/repo` in the container |
| `KB_DB_PATH` | no | SQLite path | default `KB_ROOT/data/kb.sqlite3` (gitignored, disposable) |
| `KB_PUBLIC_BASE_URL` | no | viewer origin for response `url`s | default `http://localhost:8765` |
| `KB_API_TOKEN` | no | bearer token for mutating endpoints | unset = localhost open |
| `KB_GIT_COMMIT` | no | enable/skip the write-path commit | default true |
| `KB_STARTUP_REINDEX` | no | run a full reindex on app boot (drift self-heal) | default true; `0/false/no/off` disables (disabled in tests) |
| `GOOGLE_API_KEY` | no | Gemini credential (preferred) for semantic search | empty = feature off → BM25-only |
| `GEMINI_API_KEY` | no | Gemini credential (fallback) | used when `GOOGLE_API_KEY` unset |
| `GEMINI_EMBEDDING_MODEL` | no | Gemini embedding model | default `gemini-embedding-2-preview` |
| `TZ` | no | container timezone | `Asia/Seoul` (needs `tzdata`) |

## Reindex as Drift-Repair Tool

- `python -m server.reindex` (CLI) and `POST /api/reindex` rebuild the DB from `docs/`. Use them to reconcile manual edits, API-down fallback writes (the `/explain` skill writing/committing directly), and git resets. Reindex never commits.
- **Incremental single-path (P4):** `python -m server.reindex <rel_path>` or `POST /api/reindex {"rel_path": "…"}` reindexes just one file (index if present, delete its row if vanished) — cheap for hot-reload / watch-mode workflows.
- **Startup drift self-heal (P4):** with `KB_STARTUP_REINDEX` true (the default), the app runs a full `reindex()` in its FastAPI lifespan **before** it accepts requests, printing `[kb-api] startup reindex: indexed=… removed=… skipped=… embedded=…`. Single-worker + a tiny corpus + the content-hash embedding cache make boot reindex safe and cheap. Set `KB_STARTUP_REINDEX=0` in a production deployment whose state is already validated to skip it.
- **Embedding sync:** every reindex path (full, single-path, startup) runs a best-effort, content-hash-cached embedding sync — it only re-embeds changed docs, clears orphans, and never fails the reindex (no key → skipped; API/429 → per-doc skip, retried next run). `gemini-embedding-2-preview` has a low per-minute quota (~4–5 req/min); reindex embeds per-doc with bounded 429 backoff and persists each success, so a rate-limited run resumes from the cache on the next reindex.

## Auth

- Set / uncomment `KB_API_TOKEN` in `compose.yml` (or pass as env) → `Authorization: Bearer <token>` becomes required on the two mutating endpoints (`POST /api/documents`, `POST /api/reindex`); GETs stay open. Rotate by changing the value and restarting `api`.

## Publishing (GitHub Pages)

Track 1 — the `docs/` tree — is published as a static site at <https://leetusik.github.io/knowledge/>.

- **Pipeline**: `.github/workflows/pages.yml` runs on `push` to `main` (+ `workflow_dispatch`), concurrency group `pages` (`cancel-in-progress: false`). The build job pip-installs `mkdocs-material==9.7.6` → `mkdocs build` (never `--strict`) → **`python3 scripts/site_smoke.py`** (deploy gate, P5) → `actions/upload-pages-artifact`; the deploy job runs `actions/deploy-pages` in the `github-pages` environment.
- **Deploy-gating smoke guard (P5 / P5.S4):** `scripts/site_smoke.py` (stdlib-only, optional `--root`) runs after `mkdocs build` and before the artifact upload — a non-zero exit blocks the deploy. It asserts source invariants (the `<!-- explain:recent -->` marker + bullet contract, `<!-- material/tags -->`, no `nav:`/`strict:`, `theme.font: false`, `plugins.search.lang` includes `en`+`ko`, pin parity) and built-site invariants (`search_index.json` `config.lang` includes `ko`, `lunr.ko`/`lunr.multi` packs shipped, the hero `#__search` toggle + `for="__search"` label, the `#recent + ul` DOM adjacency, the three per-project pages built, `site/versions/` absent, no leaked absolute local home-directory path, no `<script src="http…">` CDN tag). **P6 extended the guard:** the `extra_javascript:`-forbidden assertion was *flipped* to an exact allowlist (`== ["javascripts/graph.js"]`) plus `hooks:` wiring + `graph.md`/`graph.js` presence; new built-site assertions cover `site/javascripts/graph.js`, a `site/graph/index.html` that mounts `.kb-graph`/`data-graph-src`/the script, the landing `.kb-card` link to `graph/`, and a `check_graph` over the emitted `graph.json` (see qa for the full list). The no-CDN + no-`/Users/` invariants still hold. It deliberately asserts **no build *warnings*** — `--strict` was rejected so future `/explain` zero-config page adds are never blocked by warning noise. Extend `check_source`/`check_built` to add invariants; never `--strict`.
- **Site exclusion (P4 / D1; P5):** `mkdocs.yml` sets `exclude_docs: /versions/` (workspace-internal durable-doc history kept out of the built site — pages, nav, search — while `docs/current/` stays published) plus **`/README.md`** (P5.S4 — makes mkdocs' existing auto-exclusion explicit, silencing the standing `README.md`/`index.md` conflict warning; changes nothing published). Use `exclude_docs` **only** — never `nav:`/`strict:` (auto-nav from the `docs/` tree is load-bearing).
- **Pin parity**: the CI pip pin and the `compose.yml` viewer image tag are the same `9.7.6` on purpose — bump them together so the local build stays a faithful CI pre-check. The smoke guard also asserts this parity.
- **Pre-push check (P5)**: `docker compose run --rm kb build` runs the same `mkdocs build` as CI (same 9.7.6), then `python3 scripts/site_smoke.py` runs the same deploy gate CI runs (default root = repo root; run the build first so `site/` is fresh). A clean local build **and** a `PASS` predict a clean, gate-passing deploy.
- **Manual-push-only**: deploys happen only on the operator's manual `git push` — agents, the `/explain` skill, and the API commit locally but never push.
- **Dev-server eyeball (P5)**: `docker compose up -d kb` serves the live site with livereload for visual review before any push. It is served under the `site_url` subpath — open **`http://localhost:8765/knowledge/`** (a bare `http://localhost:8765/` 302-redirects there). The built `site/` artifact itself is path-agnostic. Stop with `docker compose stop kb`. Final visual acceptance of the design is the operator's, done here before pushing.
- **One-time setting**: Settings → Pages → Source = "GitHub Actions" (done 2026-07-02; cannot be automated from this repo).
- **First-publish lesson**: enable Pages *before* the first push, or the `deploy-pages` step fails (the initial push built green but its deploy failed because Pages wasn't enabled yet). Recover without a new push via Actions → "Run workflow" — the workflow re-runs idempotently.

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
  `/Users/` leak), `GET /knowledge/graph/` → 200 (mount + `data-graph-src` + the
  vendored script), and the landing card — the hook's `on_post_build` fires under
  live serve, not only `mkdocs build`. The local dev workflow
  (`docker compose up -d kb` at `http://localhost:8765/knowledge/`) is unchanged;
  `.gitignore` still excludes `site/` (so `graph.json` is untracked build output).
- **Documented in the README** ("How it's built" → a Knowledge-map bullet:
  interactive `/graph/`, `graph.json` emitted at build time by `scripts/graph_hook.py`,
  drawn client-side with vendored no-CDN JS).
- **Determinism guarantee:** two consecutive builds produce a **byte-identical**
  `graph.json` (verified by `cmp`); the payload carries no timestamps.

## Invariant

- Never scale `api` workers: the write lock is in-process (single-worker only). WAL gives read concurrency.
- The knowledge-graph hook writes only to `site_dir`, never into `docs/` — preserving the no-watch-loop property under `mkdocs serve`.
