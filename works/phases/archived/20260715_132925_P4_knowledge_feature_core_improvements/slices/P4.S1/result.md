# Result — P4.S1: Search quality (CJK matching, recency ranking, pagination)

Status: **done**. Implemented against `plan.md`; all tests green; real-corpus smoke checks pass. No commits, no status transitions.

## What changed

**`server/search.py`**
- `build_match_query(q)` now prefix-expands CJK/Hangul/Kana tokens: a token containing Hangul (U+AC00–D7AF / U+1100–11FF / U+3130–318F), CJK ideographs (U+4E00–9FFF), or Kana (U+3040–30FF) is emitted as `"tok"*` (prefix query) so a stem matches its inflected forms (검색 → 검색을/검색이란); pure-ASCII tokens keep exact porter-stemmed behavior. Internal quote-doubling preserved. New helper `_has_cjk`.
- `search(...)` gained `offset: int = 0` and recency-aware scoring. New module constants `HALF_LIFE_DAYS = 90`, `RECENCY_WEIGHT = 0.5` (+ `_LN2`). `recency = exp(-age_days·ln2/HALF_LIFE_DAYS)` from `d.date` (age clamped ≥ 0; helper `_recency`). `score = round(bm25 + RECENCY_WEIGHT·recency, 4)` where `bm25 = round(-rank, 4)` (higher-is-better). `signals` is now `{"bm25", "recency"}`. Results re-ranked in Python over the full match set (score DESC, date DESC, id DESC) then sliced `[offset:offset+limit]`, so `offset` applies to the final composed ordering, not raw bm25 rank. A separate `COUNT(*)` over MATCH+filters provides `total`. Return shape is now `{"results": [...], "total": N}` (was a bare list); blank-q → `{"results": [], "total": 0}`; `raw=True` semantics unchanged (still maps FTS syntax errors to `SearchQueryError`/HTTP 400).

**`server/main.py`**
- `GET /api/search` gained an `offset` query param (`Query(0, ge=0)`); response gains `total`, `limit`, `offset` beside `query`/`mode`/`results` (additive, backward compatible; `mode` stays `"bm25"`).

**`tests/test_api_read.py`** (extended existing file, no new fixture module)
- Added two near-identical Korean docs to the `client` corpus fixture (project `changple5`, dates 2026-07-05 / 2026-07-03, byte-identical searchable content except date) so bm25 is equal across them and recency deterministically decides order. Bodies carry only inflected `검색을` (never the bare stem 검색), the 2-char proper noun `창플`, and a unique ASCII token `sharedprobe`.
- Updated the corpus-count assertions from 3 → 5 (`test_healthz`, `test_list_shape_and_filters`, `test_reindex_endpoint`).
- `test_build_match_query_units`: CJK token → `"검색"*`; ASCII unchanged; internal quote doubled; mixed query.
- `test_search_cjk_recency_and_pagination`: (a) `q=검색` prefix-hits the 검색을-only doc; (b) 2-char `q=창플` → total 2; (c) pagination — `offset` walks the set, `total` stays 2, distinct ids per page; (d) recency — equal-relevance docs return newest date first. Also asserts `signals` carries `{bm25, recency}`.

## Validation

- **`uv run pytest -q`** → **27 passed, 1 warning** (pre-existing Starlette/httpx deprecation warning, unrelated). PASS.
- **Real-corpus smoke** — `KB_ROOT=<repo> uv run python -m server.reindex` → indexed 6, removed 0, skipped 0. Started `uv run uvicorn server.main:app --port 8767 --host 127.0.0.1` (port 8767 per plan; 8766 is held by OrbStack/Docker), `KB_GIT_COMMIT=false`. Killed after checks; port 8767 confirmed free.
  - `GET /api/search?q=창플` (url-encoded) → `total 1`, hits `changple5/2026-07-07-the-prompt-injection-defense-p26-...md`, `signals {bm25: 1.691, recency: 0.9923}`, `score 2.1871`, `limit/offset` present. PASS.
  - `GET /api/search?q=미라클` → `total 1`, same changple5 doc, `signals {bm25, recency}`. PASS.
  - `GET /api/search?q=nginx&limit=1&offset=1` → `total 2`, returned 1, `changple5/…-p39-performance-…md`; offset 0 → `hi2vi_web/2026-07-02-shared-nginx-explained.md`. Pagination walks a stable total-2 set. PASS.
  - `GET /api/search?q=검색` → `total 0` on the real corpus (correct: the only 검색 occurrence is inside the compound `지식검색`, where 검색 is a non-prefix substring; prefix queries match from a token start only — the accepted limitation). Not a required smoke term; noted for clarity.

## Doc impact

Four one-line notes appended to `phase.md` "Doc impact" running list (consolidated at P4.REVIEW): `api.md` (offset param + total/limit/offset + signals shape), `backend.md` (recency-aware fused ranking + pagination + return-shape change), `decisions.md` (tokenizer-stays-porter ADR with probe table + accepted limitations + recency choice), `data.md` (FTS tokenizer unchanged, no schema change/migration). Durable docs NOT versioned here.

## Cross-slice notes

Appended a "Cross-slice notes / From S1" section to `phase.md`: DECOMP's FTS drop/rebuild concern is moot (tokenizer unchanged; optional rebuild can ride along with S3); `signals {bm25, recency}` fusion seam is the Python-side RRF point S6 plugs a vector signal into; `search()` return shape changed to `{results, total}` (only main.py calls it); recency keys off `d.date` (canonical publish date), not `updated_at`.

## Deviations from plan

- **Two Korean docs added instead of one.** The plan said "add one Korean-content doc." A single doc cannot give a clean *equal-relevance* recency test (bm25 differs across heterogeneous bodies, and 창플 has non-zero IDF at 2/5). Two byte-identical (except date) docs make bm25 exactly equal so recency deterministically decides — a faithful, minimal expansion satisfying assertions (a)–(d). No fixture-module sprawl (docs added inline to the existing `client` fixture); adjusted the 3→5 count assertions this entailed.
- **`total` derives from a separate `COUNT(*)` query as planned**, kept even though the Python re-rank materializes the full match set (COUNT is redundant but exactly matches the planned mechanism and decouples `total` from how many rows are fetched). Not a behavioral deviation.
- Chose **Python-side re-ranking** (of the two SQL-vs-Python options the plan left open) — SQLite math funcs are present here but not guaranteed portable, and the RRF fusion seam for S6 is inherently Python-side.
