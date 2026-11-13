---
doc_id: operations
version: v0004
created_at: 2026-07-08T21:52:17+09:00
source: P4.REVIEW
summary: P4: Gemini embedding env, startup reindex self-heal, mkdocs exclude_docs
previous: v0003_github_pages_publishing_pipeline_live_pinned_mkdocs-material_ci_manual-push_deploys
---

# Operations

## Status

Both tracks operational. `docker compose up -d` runs two services over the shared bind-mounted repo (the mkdocs viewer and the FastAPI document API), and Track 1 is published live at <https://leetusik.github.io/knowledge/> via GitHub Pages CI.

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

- **Pipeline**: `.github/workflows/pages.yml` runs on `push` to `main` (+ `workflow_dispatch`), concurrency group `pages` (`cancel-in-progress: false`). The build job pip-installs `mkdocs-material==9.7.6` → `mkdocs build` (never `--strict`) → `actions/upload-pages-artifact`; the deploy job runs `actions/deploy-pages` in the `github-pages` environment.
- **Site exclusion (P4 / D1):** `mkdocs.yml` sets `exclude_docs: /versions/` so the workspace-internal `docs/versions/` durable-doc history is kept out of the built site (pages, nav, and search) while `docs/current/` (the latest durable docs) stays published. Use `exclude_docs` **only** — never `nav:`/`strict:` (auto-nav from the `docs/` tree is load-bearing). The versioned-doc history stays in git, just not on the public site.
- **Pin parity**: the CI pip pin and the `compose.yml` viewer image tag are the same `9.7.6` on purpose — bump them together so the local build stays a faithful CI pre-check.
- **Pre-push check**: `docker compose run --rm kb build` runs the same `mkdocs build` as CI (same 9.7.6); a clean local build predicts a clean deploy.
- **Manual-push-only**: deploys happen only on the operator's manual `git push` — agents, the `/explain` skill, and the API commit locally but never push.
- **One-time setting**: Settings → Pages → Source = "GitHub Actions" (done 2026-07-02; cannot be automated from this repo).
- **First-publish lesson**: enable Pages *before* the first push, or the `deploy-pages` step fails (the initial push built green but its deploy failed because Pages wasn't enabled yet). Recover without a new push via Actions → "Run workflow" — the workflow re-runs idempotently.

## Invariant

- Never scale `api` workers: the write lock is in-process (single-worker only). WAL gives read concurrency.
