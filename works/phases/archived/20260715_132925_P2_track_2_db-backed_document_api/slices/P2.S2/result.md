# Result

- Phase ID: P2
- Slice ID: P2.S2
- Slice: Read/search API: healthz, list/get/by-path, BM25 search, reindex endpoint
- Review status: pending
- Next action: proceed to P2.S3 (write path)

## Outcome

Done. Added the read surface over the S1 library:

- **`server/search.py`** — FTS5 query layer. `build_match_query(q)` splits on whitespace and wraps each token in FTS5 double quotes (internal `"` doubled), joined implicitly-AND — so raw operator syntax (`NEAR/AND(`, `*`, unbalanced parens) collapses to harmless quoted phrases and can never raise. `search(conn, q, *, project, tag, limit=10, raw=False)`: blank `q` → `[]`; weighted `bm25(documents_fts, 8.0, 4.0, 1.0)` (title/tags/body) ordered ascending; exposes `score = -bm25` (higher-is-better, `round(…,4)`), `snippet(…, 2, '<mark>','</mark>','…',12)`, `signals:{bm25}`; optional `d.project = ?` and `EXISTS json_each(d.tags)` tag filters. `raw=True` passes `q` verbatim and re-raises `sqlite3.OperationalError` as the typed `SearchQueryError`. Fields returned exclude `markdown`/`tags_text`. sqlite-vec/RRF fusion seam left clean.
- **`server/main.py`** — FastAPI `app`. `GET /healthz` (status/docs_root/db/documents count); `GET /api/documents` (project/tag/limit 1–200 def 50/offset ≥0 → `{total, items}`, items sans markdown+tags_text); `GET /api/documents/by-path/{rel_path:path}` and `GET /api/documents/{doc_id:int}` (by-path declared first; 404 on miss; full doc incl. markdown); `GET /api/search` (q required, project/tag/limit 1–50 def 10/raw → `{query, mode:"bm25", results}`; SearchQueryError → 400); `POST /api/reindex` → `reindex.reindex()` dict as-is (never git). `require_bearer` dependency guards mutating endpoints only (no-op when `KB_API_TOKEN` unset), reused by S3. `get_conn()` opens a fresh `db.connect()` per request (env-at-call-time), closed in finally.
- **`tests/test_api_read.py`** — terse TestClient suite over a temp KB tree (KB_ROOT/KB_DB_PATH via monkeypatch, seeded by `reindex.reindex()`): healthz, list shape + project/tag filters + no markdown/tags_text, get by id/by-path/404, BM25 search (`<mark>`, `score>0`, `signals.bm25`), `q=NEAR/AND(` → 200 empty, reindex report, bearer 401/200 with GET open.

## Deviations from Plan

1. **Test corpus seeded with 3 docs, not the minimal set.** FTS5 bm25 collapses the IDF term to ~0 when a term appears in a 1–2 doc corpus (with N=2, n=1 → `log((N-n+0.5)/(n+0.5)) = log(1) = 0`), so `-bm25` rounds to `0.0` and the plan's `score > 0` assertion cannot hold. Seeding 3 docs (search term present in 1 of 3) yields a meaningfully positive score (~0.49). Inherent BM25 behavior, not a change to the search layer. Consequently on the **real single-doc repo, `score` is `0.0`** — the smoke asserts only 1 result + `<mark>` snippet (not score), so it passes; recorded in phase.md so REVIEW/S3 don't read `0.0` as a regression.
2. **`tags_text` stripped from all API responses** (not only `markdown`). The plan says list items are "without markdown" and enumerates the doc-field set for search results, which omits `tags_text`. `tags_text` is an internal FTS denormalization (space-joined mirror of the already-exposed `tags` list); a `_public_doc(doc, *, include_markdown)` helper drops it everywhere for a clean, consistent public API. get-by-id/by-path still include `markdown`.

Otherwise implemented exactly as `plan.md` specified.

## Validation Run

| # | Command | Result |
|---|---------|--------|
| 1 | `uv run pytest -q` | **PASS** — 21 passed (S1's 14 + 7 new), 1 warning (starlette httpx deprecation, harmless) |
| 2 | Real-repo smoke: `uv run uvicorn server.main:app --port 8766` + curls | **PASS** — `/healthz` `documents:1`; `?q=nginx` → 1 result with `<mark>nginx</mark>` snippet; `?q=NEAR/AND(` → **200**, `results:[]`; `POST /api/reindex` → `{"indexed":1,"removed":0,"skipped":[],...}` |
| 3 | `git status --short` | **PASS** — nothing under `docs/` (new: server/{main,search}.py, tests/test_api_read.py; `data/kb.sqlite3` gitignored) |
| 4 | `python3 scripts/workflow.py validate` | **PASS** — "Workflow validation passed." |

## Files Changed

- `server/search.py` (new)
- `server/main.py` (new)
- `tests/test_api_read.py` (new)
- `works/phases/active/P2/phase.md` (S2 landed note + Doc impact one-liners)
- `works/phases/active/P2/slices/P2.S2/result.md` (this file)

## Doc Versions Created

- None (durable docs are versioned once per phase at P2.REVIEW). Doc-impact one-liners appended to `phase.md`:
  - `api` (S2) — full read contract (healthz, list/get/by-path, search response shape incl. score/snippet/signals, reindex endpoint, bearer on mutating only).
  - `backend` (S2) — `server/main.py` FastAPI app + `server/search.py` quoted-token weighted BM25 layer.

## Roadmap Updates

- None. Next slice per decomposition is P2.S3 (write path: POST /api/documents + Recent marker + scoped git commit); `require_bearer` and `get_conn` are in place for it to build on.

## Retrospective

- The BM25 IDF-zero effect in tiny corpora is the one gotcha worth remembering: a single-doc index reports `score = 0.0`. It is correct, not a bug, and is now documented in `phase.md` for the review.
