---
doc_id: backend
version: v0002
created_at: 2026-07-02T16:05:54+09:00
source: P2.REVIEW
summary: server/ FastAPI package: config, db, documents, search, gitops, main
previous: v0001_bootstrap
---

# Backend

## Status

Implemented and validated (Track 2). The `server/` package provides the DB-backed document API. `docs/` is canonical; the SQLite DB is disposable.

## Stack

- Language/runtime: Python 3.12.
- Framework: FastAPI + uvicorn.
- Package manager: uv — **virtual project** (`[tool.uv] package=false`, no `[build-system]`): deps only, never built/installed (matches the container's `--no-emit-project`). `[tool.pytest.ini_options] pythonpath=["."]` lets `import server` resolve without installing.
- Server entrypoint: `server.main:app` (`uvicorn server.main:app`), **single worker** (load-bearing — see invariants).
- Deps: `fastapi`, `uvicorn`, `pyyaml`; dev: `pytest`, `httpx`.

## Module Layout (`server/`)

- **`config`** — env-at-call-time settings (no import-time caching, so tests retarget per call): `KB_ROOT` (default cwd), `docs_root` (=`KB_ROOT/docs`), `KB_DB_PATH` (default `KB_ROOT/data/kb.sqlite3`), `KB_PUBLIC_BASE_URL` (default `http://localhost:8765`, the viewer origin for response `url`s), `KB_API_TOKEN` (unset by default), `KB_GIT_COMMIT` (default true).
- **`db`** — `connect(path=None)` (WAL, `sqlite3.Row` factory, idempotent DDL, creates parent dirs); `upsert_document` (ON CONFLICT(rel_path); preserves `created_at`, refreshes `updated_at`), `get_document`, `get_document_by_path`, `list_documents` (newest-first, tag via `json_each`), `count_documents`, `delete_document_by_path`. Reads JSON-decode `tags` to a list.
- **`documents`** — conventions + write composition: `slugify`; validators `validate_project/tags/slug/date` (raise `ConventionError`; `FrontmatterError` is a subclass — both map to 422); `rel_path`; **hand-rolled byte-exact** `serialize_frontmatter` (title via `json.dumps(ensure_ascii=False)` → a valid YAML double-quoted scalar; bare date; tag list; `source:` map — never PyYAML-dumped) with `parse_frontmatter` using `yaml.safe_load`; `insert_recent_bullet` (pure; marker → `## Recent` heading → append-section fallback ladder); `write_document_file` (writes frontmatter + normalized body, returns the body **exactly as reindex would store it** — no drift); `update_recent_index` (marker ladder + duplicate-bullet suppression).
- **`search`** — `build_match_query(q)` double-quotes each whitespace token (doubling internal `"`) so FTS5 operator syntax can never 500; `search(conn, q, *, project, tag, limit=10, raw=False)` runs weighted BM25 (8/4/1), returns `score=-bm25`, `<mark>` snippet, `signals:{bm25}`; `raw=True` passes `q` verbatim and re-raises `sqlite3.OperationalError` as `SearchQueryError` (→ 400). Clean sqlite-vec/RRF fusion seam.
- **`gitops`** — `GitError(command, stderr)`; `add(paths, *, root)` = `git -C <root> add -- <paths…>` (only the touched paths — **never `-A`**); `commit(msg, *, root, co_authored_by=None)` → `rev-parse HEAD` (optional second `-m` trailer). Every failure (nothing-to-commit, missing identity, unsafe dir) raises `GitError`; **never pushes**.
- **`reindex`** — library fn + `python -m server.reindex` CLI; walks `docs/<subdir>/**/*.md`, upserts present rows, removes vanished ones; `RESERVED_DIRS = {"current","versions"}` excluded; malformed files → `skipped[]`. Never runs git.
- **`main`** — FastAPI `app`; per-request `get_conn()` dependency (fresh `db.connect()`, closed in `finally`); `require_bearer` dependency (no-op when `KB_API_TOKEN` unset, else exact-match bearer or 401); `_public_doc` response shaper (drops `tags_text`; `markdown` only on single-doc fetches); module-level `WRITE_LOCK = threading.Lock()` wrapping the whole file → Recent-index → DB-upsert → git critical section of `POST /api/documents`.

## Invariants

- **Single-writer**: the write lock is **in-process**, so the API must run **one uvicorn worker** — never scale workers. WAL still gives read concurrency.
- **`docs/`-canonical, never-rollback**: a failed git commit leaves the file/DB written (`committed:false`); `docs/` stays canonical and reindex reconciles. Git stages only the touched paths and never pushes.
- **DB/file consistency**: a POST-written document and a later reindex produce identical stored `markdown` — no phantom drift.

## Error Handling

- `ConventionError`/`FrontmatterError` → 422; existing target → 409 (names the doc); FTS5 raw-syntax error → 400 (`SearchQueryError`); git failure → 201 with `committed:false` + `commit_error`.
