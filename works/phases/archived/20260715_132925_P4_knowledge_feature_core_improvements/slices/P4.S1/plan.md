# Plan — P4.S1: Search quality — CJK-capable matching, recency ranking, search pagination

Orchestrator's native plan, approved by the operator 2026-07-08. You are the slice-executor: implement against this plan, write `result.md`, append notes to `../../phase.md`. You never commit and never transition slice/phase status.

## Context

P4 slice 1 (see `../../phase.md` for the phase audit). Three verified search-quality gaps: Korean/CJK text is not word-searchable, ranking has no recency signal, `/api/search` has no pagination. Groundwork for P5's search UX. A separate hybrid semantic-search slice (`P4.S6`, Gemini + sqlite-vec + RRF) follows this one — keep the `signals` fusion seam intact.

## Key design decision — tokenizer stays, query layer changes (empirically validated by orchestrator)

Probed FTS5 tokenizers in-memory against representative corpus text (`검색을 개선한다. 창플 이야기와 미라클 모닝, … changple5의 지식검색 …`):

| Query | `porter unicode61` (current) | `trigram` |
|---|---|---|
| `검색*` (prefix) | **matches 검색을** | no match (needs ≥3 chars) |
| `창플` (2-char proper noun, in real corpus) | **matches** | **no match** |
| `미라*` | **matches 미라클** | no match |
| `지식검색` | matches | matches |
| `changple5*` | matches mixed token `changple5의` | matches |

`trigram` cannot match anything under 3 characters — it hard-fails the corpus's actual 2-char Korean proper noun (창플) and all 2-char prefix queries, while costing ~3× index size and an FTS rebuild. **Decision: keep `tokenize='porter unicode61'` (NO schema change, NO migration) and add query-side CJK prefix expansion** in `build_match_query`: a token containing CJK/Hangul characters is emitted as `"tok"*` instead of `"tok"`, so 검색 matches inflected 검색을/검색이란 (Korean particles are suffixes — prefix match neutralizes them). Pure-ASCII tokens keep today's exact porter-stemmed behavior (fully backward compatible). Known accepted limitations (record in the Doc impact note for the decisions.md ADR): mid-word substrings (라클) don't match; a pure-ASCII query won't match inside a mixed token (`changple5` vs `changple5의`).

Because the tokenizer is unchanged, DECOMP's "FTS drop/rebuild migration" concern is moot for S1 — append a cross-slice note to `phase.md` that the generic FTS-rebuild path can ride along with S3's reindex work if wanted.

## Changes (this repo only; `/explain` POST payload untouched)

**`server/search.py`**
1. `build_match_query(q)`: detect CJK-containing tokens (Hangul U+AC00–D7AF / U+1100–11FF / U+3130–318F, CJK U+4E00–9FFF, Kana U+3040–30FF — small helper predicate) and emit `"tok"*`; other tokens unchanged. Internal quote-doubling preserved.
2. `search(...)`: add `offset: int = 0` and recency-aware scoring:
   - `recency = exp(-age_days * ln2 / HALF_LIFE_DAYS)` from `d.date` (clamp age ≥ 0); module constants `HALF_LIFE_DAYS = 90`, `RECENCY_WEIGHT = 0.5` (tune if warranted; keep constants named at module top).
   - `score = round(-bm25 + RECENCY_WEIGHT * recency, 4)`; results ordered by final score DESC with date DESC tiebreak (matters because BM25 IDF collapses to 0.0 on tiny corpora).
   - `signals` becomes `{"bm25": <-bm25 rounded>, "recency": <recency rounded>}` — keeps the RRF fusion seam intact for S6.
   - Return `total` for the MATCH+filters (separate `COUNT(*)` query) so the API can paginate. Keep blank-q → empty and `raw=True` semantics exactly as-is.
3. Pagination: offset must apply to the *final* ordering (recency-adjusted score), not raw bm25 rank — order in SQL on the composed score or in Python before slicing, your choice.

**`server/main.py`** — `GET /api/search`: add `offset` query param (≥0, default 0); response gains `total`, `limit`, `offset` beside existing `query`/`mode`/`results` (additive, backward compatible). `mode` stays `"bm25"`.

**Tests (keep small — extend existing files, no fixture sprawl)**
- `build_match_query` unit checks (in `tests/test_api_read.py` or `test_documents.py`): CJK token → `"검색"*`; ASCII token unchanged; internal-quote doubling still works.
- `tests/test_api_read.py`: add one Korean-content doc to the existing corpus fixture; assert (a) query `검색` finds a doc containing only 검색을, (b) 2-char 창플 exact-matches, (c) pagination: `offset` walks results and `total` stays stable, (d) recency: with equal relevance the newer date ranks first.

**Workspace bookkeeping**
- Append one-line Doc impact note(s) to `phase.md` (targets: `api.md` search params/response, `backend.md` search layer, `decisions.md` tokenizer ADR incl. the probe table above, `data.md` no-schema-change note).
- Append durable cross-slice notes to `phase.md` (e.g. the S3 FTS-rebuild note; the `signals` seam status for S6).
- Write `result.md`; return structured verdict.

## Constraints (from `phase.md`)

- No edits to `~/.claude/skills/explain` or the bootstrap repo; `POST /api/documents` payload unchanged.
- `docs/` canonical / DB disposable; single-worker invariant untouched (this is a read-path change).
- Tests stay terse; durable docs are NOT versioned here (Doc impact notes only — the review slice consolidates).

## Validation (run these; report results in result.md)

- `uv run pytest -q` — all green.
- Real-corpus smoke: `uv run python -m server.reindex`, then start the API briefly (`uv run uvicorn server.main:app --port 8767 &` — use 8767 to avoid clashing with the Docker service on 8766) and:
  - `curl 'localhost:8767/api/search?q=창플'` and `?q=미라클` — both should hit changple5 docs (the terms appear inline in the real corpus);
  - `curl 'localhost:8767/api/search?q=nginx&limit=1&offset=1'` — exercises pagination;
  - verify `total` and `signals` fields in responses. Kill the server when done.

## Done means

- All changes above implemented; tests green; smoke checks pass; Doc impact + cross-slice notes appended to `phase.md`; `result.md` written; structured verdict returned. No commits, no status transitions.
