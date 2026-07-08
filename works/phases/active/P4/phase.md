# Phase P4: Knowledge feature core improvements

_Intent: see [intent.md](intent.md)._

## Objective

Audit and improve the current /explain + KB pipeline — skill contract, document API, indexing, config/portability. Scope deliberately broad: the DECOMP slice investigates and proposes the concrete improvement slices. Groundwork for the web UI and plugin phases.

## Context

First phase of the knowledge-feature roadmap (P4 → P5 web UI → P6 knowledge graph → P7 plugin, then bootstrap P7 retires the embedded /explain). P4 hardens the current /explain + KB pipeline before those phases build on it. Binding operator decisions (from `plan.md` + `intent.md`):

- **All four areas in scope:** search quality, API completeness, cross-link convention, publish hygiene.
- **Skill-side changes are deferred to P7.** P4 touches only this repo (server / API / content / site). The current `/explain` `POST /api/documents` payload must keep working unchanged — anything new in the write contract is optional / backward-compatible. Never edit `~/.claude/skills/explain` or the bootstrap repo.
- **D1 resolved:** keep `docs/current/` on the public site; hide `docs/versions/` from the built site (nav + search) while preserving auto-nav.
- SaaS-someday is noted (keep the architecture from precluding it) but out of scope this phase.
- **Scope addition (operator, 2026-07-08, at the S1 boundary): semantic search.** New slice `P4.S6` (order 1.5, after S1). Operator decisions: vector store = **sqlite-vec** (the P2 extension seam; pgvector declined — the P2 ADR stands, SaaS can revisit); embeddings = **Gemini, reusing changple5's setup** (`google-genai` lib, model `gemini-embedding-2-preview` via `GEMINI_EMBEDDING_MODEL`, credential `GOOGLE_API_KEY` preferred / `GEMINI_API_KEY` fallback); shape = hybrid BM25 + vector via **RRF** at the Python fusion seam in `server/search.py`; embeddings **cached by content hash** so reindex doesn't re-call the API for unchanged docs; **graceful degradation** to BM25-only when no API key is set.

## Decomposition

The DECOMP audit spot-verified the pre-gathered findings against the code (all confirmed — see Findings & Notes). The phase splits into **five middle slices** — four created here as bare folders, plus publish hygiene created by the orchestrator via **D1 promotion** (proposed below, not created by this slice):

| Slice | Area | Kind | Risk | Order | Depends |
|---|---|---|---|---|---|
| `P4.S1` | Search quality — CJK-capable FTS tokenization, recency ranking, pagination | implementation | medium | 1 | — |
| `P4.S6` *(added at S1 boundary — operator scope addition)* | Hybrid semantic search — Gemini embeddings + sqlite-vec + RRF fusion | implementation | medium | 1.5 | P4.S1 |
| `P4.S2` | API completeness — DELETE document, `GET /api/tags`, `GET /api/projects` | implementation | medium | 2 | — |
| `P4.S3` | Reindex robustness — incremental single-path reindex + startup drift self-heal | implementation | low | 3 | P4.S1 |
| `P4.S4` | Cross-link convention — related-docs metadata, API exposure, backfill | implementation | medium | 4 | — |
| `P4.S5` *(proposed — created via D1 promotion)* | Publish hygiene — publish-safe `source` metadata + hide `docs/versions/` | implementation | low | 5 | P4.S4 |

**Rationale**

- **S1 Search quality (medium):** the FTS tokenizer change (`porter unicode61` → CJK-capable, likely `trigram`) is the single riskiest change — it requires dropping/rebuilding `documents_fts` (the schema is `CREATE ... IF NOT EXISTS`, so a tokenizer change never applies to an existing DB without a drop) and shifts match semantics. Recency-aware ranking and search pagination are lower-risk query-layer add-ons bundled here because they are all "search quality" and all touch `server/search.py` + `/api/search`. Kept as one coherent slice; medium risk → xhigh executor.
- **S2 API completeness (medium):** `DELETE` mirrors the existing `POST /api/documents` write path in reverse (remove file + remove Recent bullet + DB delete + scoped commit under `WRITE_LOCK`), so it carries the same write-path risk. `GET /api/tags` + `GET /api/projects` are read-only aggregations the P5 web UI needs. One API-surface slice.
- **S3 Reindex robustness (low):** `_index_file` already indexes a single path, so an incremental/single-path variant is a small extension; startup drift self-heal is a small lifecycle addition with the full-walk rebuild as the safe fallback. `depends_on P4.S1` (advisory): land after S1's FTS-schema/rebuild work so the reindex refactor builds on the settled FTS schema and preserves S1's FTS-rebuild path. Low risk → high-effort variant.
- **S4 Cross-link convention (medium):** introduces the related-docs representation (optional `related:` frontmatter list of rel_paths and/or a `## Related` body section), stores/exposes it via DB + API, and backfills the 6 existing docs — the edge groundwork for the P6 graph. Design decision (representation) delegated to the slice. Must be optional & backward-compatible (skill unchanged until P7). Medium risk (schema/API + forward-looking design) → xhigh.
- **S5 Publish hygiene (low, PROPOSED):** publish-safe `source` metadata (drop absolute local paths; backfill the 6 docs; sanitize at the server write path so it stays safe without a skill change) + hide `docs/versions/` from the built site via mkdocs `exclude_docs` (never `nav:`/`strict:`) + README/config touch-ups. Created by the orchestrator via `promote-deferred D1` so the D1 brief attaches. `depends_on P4.S4` (advisory): both backfill the 6 docs' frontmatter, so S5 lands after S4 for merge cleanliness.

**Ordering logic:** S1 first so the FTS schema is settled before S3 refactors reindex. S2 (independent API additions) slots between. S4 introduces cross-link frontmatter, then S5 (publish) backfills `source` on the same files last. Publish hygiene last as a low-risk polish pass; nothing depends on it.

## Findings & Notes

Verified audit (DECOMP, 2026-07-08) — all pre-gathered findings confirmed against the code.

**Search & indexing**

- FTS tokenizer is `porter unicode61` (`server/db.py:38-41`) — English stemming only; Korean/CJK text is not word-searchable. The schema uses `CREATE VIRTUAL TABLE IF NOT EXISTS`, so a tokenizer change never applies to an existing DB — **S1 must add an FTS-table drop/rebuild (migration) path**; `reindex` rebuilds `documents` from `docs/` but does **not** currently drop/recreate `documents_fts`. Candidate tokenizers: `trigram` (substring match, works for CJK, case/diacritic folding, min token 3, no stemming — pragmatic default; note it changes match semantics and grows the index) vs `unicode61` + external segmentation vs ICU (not bundled). Tokenizer choice is delegated to S1.
- BM25 weights title 8 / tags_text 4 / markdown 1 (`server/search.py:25`). `search()` does `ORDER BY rank ASC` only — **no recency signal**. `db.list_documents` already paginates (`limit`+`offset`), but `/api/search` exposes only `limit` (1–50) — **no offset, no total** → S1 adds search pagination.
- Verified seam: search results already carry a higher-is-better `score` and a `signals` block shaped for future RRF fusion; a `sqlite-vec` vector seam is documented in `db.py`/`search.py` but is explicitly out of scope.

**API surface**

- No HTTP update/delete. `db.delete_document_by_path` exists (`server/db.py:207`) but is unexposed; deletion today = hand-edit `docs/` + reindex, leaving the Recent bullet in `docs/index.md` stale. `POST /api/documents` already owns the full write path (file → Recent bullet via `documents.update_recent_index` → DB → scoped git commit under `WRITE_LOCK`); **S2's DELETE mirrors it in reverse** and reuses `require_bearer`. Update (PUT/PATCH) is out of the audited scope — re-create via overwrite already exists.
- No `GET /api/tags` / `GET /api/projects` aggregations (`server/main.py` has only healthz, list, get-by-id, get-by-path, search, reindex, create). P5 web UI needs them.

**Reindex / drift**

- `reindex()` (`server/reindex.py`, `POST /api/reindex`) is a full `docs/` walk, manual only; `_index_file` already indexes a single path, so an incremental/single-path variant is a small extension. No startup drift self-heal. `RESERVED_DIRS={current, versions}` already keeps workspace internals out of the index.

**Content / graph groundwork**

- Zero inter-doc links across the 6 explainer docs; no `related:` frontmatter (grep-verified) → the P6 graph has no edges. S4 introduces the representation, stores/exposes it, and backfills the 6 docs — optional & backward-compatible.

**Publish hygiene / portability**

- All 6 published docs carry `source.repo` as an absolute local path (e.g. `/Users/sugang/projects/personal/changple5`) in frontmatter, the DB `source_repo` column, and API output — leaking the author's local filesystem to the public site. Fix = publish-safe `source` metadata + backfill; the write path (`POST /api/documents`) receives `source_repo` from the unchanged skill, so the **server should sanitize/normalize at write time** to stay safe going forward without a skill change.
- `docs/versions/` (20 files) publishes publicly → D1 decision: exclude from the built site via mkdocs `exclude_docs`, never adding `nav:`/`strict:` (auto-nav is load-bearing, `mkdocs.yml:25-27`).

## Constraints

- `docs/` is canonical / the DB is disposable — `reindex` rebuilds it from `docs/`.
- Single uvicorn worker; in-process `WRITE_LOCK` serializes the write critical section — never scale to multiple workers. WAL gives read concurrency.
- Scoped `git add` only (never `-A`); never push. The write path uses `server/gitops`.
- Never edit `~/.claude/skills/explain` or the bootstrap repo (skill changes → P7). The `/explain` `POST /api/documents` payload stays backward-compatible — new write-contract fields are optional.
- `mkdocs.yml`: never add `nav:` or `strict:`. Auto-nav from the `docs/` tree is load-bearing.
- Never hand-edit `docs/current/*.md`; never patch `docs/versions/*`. Durable-doc versioning happens only at `P4.REVIEW`; slices append one-line **Doc impact** notes below.
- Keep tests small — prefer running the code, `validate`, and small smoke checks over suites.

## Doc impact (running — consolidated at P4.REVIEW)

_Each implementation/fix slice appends a one-line note here naming the durable doc(s) it changed and what changed; `P4.REVIEW` consolidates these into new doc versions (one per affected doc). Anticipated targets per area (guidance, not yet actual changes):_

- S1 search → `api.md` (search pagination params), `data.md` (FTS tokenizer), `backend.md` (search/ranking), `decisions.md` (tokenizer + recency choice)
- S2 API → `api.md` (DELETE + `/api/tags` + `/api/projects`), `backend.md`, `decisions.md`
- S3 reindex → `operations.md` (reindex + startup self-heal), `backend.md`/`data.md`
- S4 cross-link → `data.md` + `api.md` (related exposure), `product.md`/`architecture.md` (graph groundwork), `decisions.md`
- S5 publish → `operations.md` (mkdocs exclude, publish), `security.md` (no local paths public), `data.md`/`api.md` (source metadata), `decisions.md`

_Actual notes (appended by slices below):_

- **S1 → `api.md`**: `GET /api/search` gains an `offset` query param (≥0, default 0); response gains `total`, `limit`, `offset` fields beside `query`/`mode`/`results` (additive, backward compatible; `mode` stays `"bm25"`). Each result's `signals` block is now `{bm25, recency}` (was `{bm25}`).
- **S1 → `backend.md`**: search layer is now recency-aware and paginated. `server/search.py:search()` fuses two higher-is-better signals in Python — `bm25` (= `-bm25()` distance) + exp-decay `recency = exp(-age_days·ln2/HALF_LIFE_DAYS)` — as `score = bm25 + RECENCY_WEIGHT·recency` (module constants `HALF_LIFE_DAYS=90`, `RECENCY_WEIGHT=0.5`), ordered score DESC with date DESC (then id DESC) tiebreak. Re-rank runs over the full match set so `offset`/`limit` slice the final ordering; a separate `COUNT(*)` provides `total`. `search()` now returns `{"results", "total"}` (was a bare list). `build_match_query` prefix-expands CJK/Hangul/Kana tokens (`"검색"` → `"검색"*`).
- **S1 → `decisions.md`**: ADR — kept `tokenize='porter unicode61'` (NO schema change, NO FTS drop/rebuild) and added query-side CJK prefix expansion instead of switching to `trigram`. Empirical probe (in-memory, representative corpus): `trigram` cannot match anything <3 chars, hard-failing the corpus's real 2-char proper noun 창플 and all 2-char prefix queries, at ~3× index size + a rebuild; `porter unicode61` + `"tok"*` prefix matches 검색을/미라클/창플. Accepted limitations: mid-word substrings (라클) don't match; a pure-ASCII query won't match inside a mixed token (`changple5` vs `changple5의`). Also records the recency-weighted ranking choice (exp decay, half-life 90d, weight 0.5) and that recency is the effective tiebreak when BM25 IDF collapses to 0 on tiny corpora.
- **S1 → `data.md`**: FTS tokenizer is unchanged — `documents_fts` stays `tokenize='porter unicode61'`, no schema change and no migration. CJK searchability is achieved entirely at the query layer (prefix expansion in `build_match_query`), not in the index.

## Cross-slice notes

**From S1 (search quality) — 2026-07-08**

- **Tokenizer stayed `porter unicode61` — DECOMP's "FTS drop/rebuild migration" concern is MOOT for S1.** S1 changed only the query layer (prefix expansion), never the FTS schema, so no `documents_fts` drop/rebuild was needed. If a generic FTS drop/rebuild path is still wanted later, it can ride along with **S3**'s reindex work (S3 depends_on S1) — but it is no longer required by any S1 semantics.
- **`signals` fusion seam is intact and now populated for S6.** Results carry `signals: {bm25, recency}` and a composed higher-is-better `score`; the two-signal fusion happens in Python inside `search()` (not SQL). That Python fusion point is exactly where **S6** (Gemini + sqlite-vec + RRF) adds a third vector signal. Pagination re-ranks the full match set in Python *before* slicing, so a vector signal fuses at the same seam without changing the pagination contract. Chose Python-side re-ranking over SQL `ORDER BY` (SQLite math funcs are available here but not guaranteed portable, and RRF fusion is inherently Python-side).
- **`search()` return shape changed** from `list[dict]` to `{"results": [...], "total": int}`. Only `server/main.py` calls it today (updated). Any future internal caller must adapt.
- **Recency uses `d.date` (the doc's `YYYY-MM-DD` frontmatter date), not `updated_at`.** Deliberate: `date` is the authored/publish date (stable, canonical), whereas `updated_at` churns on every reindex. If a future slice wants "freshness by last edit," that's a separate signal.

## Open Questions

- None blocking. Two design decisions are deliberately delegated to their slices: the CJK tokenizer choice (`trigram` vs alternatives) → S1; the publish-safe `source`-metadata representation (relative path? repo name only? project only?) → S5. All four areas are operator-approved and D1 is resolved.
