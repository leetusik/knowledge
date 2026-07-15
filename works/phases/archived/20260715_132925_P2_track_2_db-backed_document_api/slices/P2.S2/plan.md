# Plan — P2.S2 (read/search API)

## Situation

Second implementation slice of P2. Read `works/phases/active/P2/phase.md` first — especially **"S1 landed — interfaces & gotchas"** (the DB/conventions surface you build on) and the **API contract** in Findings & Notes. Full spec: the approved plan at `~/.claude/plans/make-up-phases-for-precious-fairy.md`, "Phase 2" section.

S2 adds the **read surface** over the S1 library. No write path (S3), no Docker (S4). The real repo already has `data/kb.sqlite3` with the one hi2vi_web explainer indexed.

## Create

- **`server/search.py`** — the FTS5 query layer:
  - `build_match_query(q: str) -> str`: split on whitespace; wrap each token in FTS5 double quotes with internal `"` doubled (FTS5 string escaping); join with spaces (implicit AND). By construction, operator syntax like `NEAR/AND(` becomes harmless quoted phrases and can never raise.
  - `search(conn, q, *, project=None, tag=None, limit=10, raw=False) -> list[dict]`:
    - blank/empty q → `[]`.
    - `raw=True` → pass `q` verbatim as the MATCH expression; catch `sqlite3.OperationalError` and re-raise a typed error `main.py` maps to HTTP 400.
    - SQL: `documents_fts MATCH ?` joined to `documents d ON d.id = documents_fts.rowid`; rank with `bm25(documents_fts, 8.0, 4.0, 1.0)` (FTS columns are ordered `title, tags_text, markdown`), `ORDER BY` bm25 ascending; expose `score = -bm25` (higher-is-better) rounded sanely; `snippet(documents_fts, 2, '<mark>', '</mark>', '…', 12)` (column 2 = markdown); optional filters: `d.project = ?`, tag via `EXISTS (SELECT 1 FROM json_each(d.tags) WHERE value = ?)`.
    - Each result: doc fields sans `markdown` (id, project, slug, date, title, tags list, rel_path, source_repo, created_at, updated_at) + `score`, `snippet`, `signals: {"bm25": score}`. Leave a one-line comment marking the future hybrid/RRF extension point.
- **`server/main.py`** — FastAPI app (`app = FastAPI(...)`):
  - `GET /healthz` → `{"status":"ok","docs_root":str(config.docs_root()),"db":"ok","documents":N}` (count via `db.count_documents`).
  - `GET /api/documents` (`project`, `tag`, `limit` 1–200 default 50, `offset` ≥0) → `{total, items}` via `db.list_documents`/`db.count_documents`; items WITHOUT `markdown`.
  - `GET /api/documents/{doc_id}` → full doc incl. `markdown`; 404 `{"detail": ...}` when missing. (Route order: declare `by-path` first or use a path regex so `/api/documents/by-path/...` never binds to `{doc_id}`.)
  - `GET /api/documents/by-path/{rel_path:path}` → same by rel_path.
  - `GET /api/search` (`q` required, `project`, `tag`, `limit` 1–50 default 10, `raw` bool default false) → `{"query": q, "mode": "bm25", "results": [...]}`; raw-mode FTS syntax error → 400.
  - `POST /api/reindex` → `server.reindex.reindex()` → return its `{indexed, removed, skipped, duration_ms}` dict as-is; never runs git.
  - **Bearer dependency** (define once, reuse in S3): when `config.api_token()` is set, require header `Authorization: Bearer <token>` on mutating endpoints (today only `POST /api/reindex`) else 401; no-op when unset. GETs always open.
  - Open a fresh `db.connect()` per request (dependency) — config is env-at-call-time, so tests can retarget via env. Do not cache settings at import time.
- **`tests/test_api_read.py`** — terse (workspace hard rule), TestClient over a temp KB tree seeded via the S1 helpers (follow `tests/test_reindex.py`'s `tmp_path` + `monkeypatch.setenv("KB_ROOT"/"KB_DB_PATH")` pattern; create the TestClient after env is set):
  1. healthz: status ok + correct count.
  2. list: total/items shape, project filter, tag filter, no `markdown` in items.
  3. get by id + by-path (with `/` in path) + 404 for missing.
  4. search: seeded term → ≥1 result, `<mark>` in snippet, `score > 0`, `signals.bm25` present.
  5. `q=NEAR/AND(` → 200, `results == []`.
  6. POST /api/reindex → returns indexed/removed/skipped/duration_ms.
  7. Auth: `KB_API_TOKEN` set → POST reindex bare 401, with bearer 200; GET /healthz stays open.

No `pyproject.toml` changes (fastapi/uvicorn/httpx already there); keep `[tool.uv] package=false` and pytest `pythonpath=["."]` untouched.

## Verification (run all; report in verdict)

1. `uv run pytest -q` — green (S1's 14 + new).
2. Real-repo smoke (then kill the server): `uv run uvicorn server.main:app --port 8766 &` → `curl -s localhost:8766/healthz` (documents: 1) → `curl -s 'localhost:8766/api/search?q=nginx'` (1 result, `<mark>` snippet) → `curl -s 'localhost:8766/api/search?q=NEAR/AND('` (200, empty results) → `curl -s -X POST localhost:8766/api/reindex` (`indexed: 1`).
3. `git status --short` — nothing under `docs/`; `python3 scripts/workflow.py validate` passes.

## Wrap-up (executor)

- Append to `phase.md`: an **"S2 landed"** note (bearer dependency name/location for S3 reuse, search fn signature, anything S3 must know) and **Doc impact** one-liners: `api` (S2) — read contract (healthz, list/get/by-path, search response shape incl. score/snippet/signals, reindex endpoint, bearer on mutating only); `backend` (S2) — `server/main.py` FastAPI app + `server/search.py` quoted-token BM25 layer.
- Write `result.md`.
- Never commit; never transition status; write only `server/main.py`, `server/search.py`, `tests/test_api_read.py`, your slice files, and `phase.md`. Nothing under `docs/`.
