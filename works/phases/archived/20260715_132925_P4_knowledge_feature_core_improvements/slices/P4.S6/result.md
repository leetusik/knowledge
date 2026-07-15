# Result — P4.S6: Hybrid semantic search (Gemini + SQLite BLOB vectors + RRF)

Implemented the semantic signal on top of S1's fusion seam. Mechanism is **SQLite
float32 BLOB vectors + Python cosine** (operator-approved; the local venv Python cannot
load SQLite extensions, so sqlite-vec is out — see plan/phase Context), fused with the
keyword ordering via **RRF (RRF_K=60)**. Embeddings are Gemini
(`gemini-embedding-2-preview`, `google-genai==1.72.0`), content-hash cached, with
graceful BM25-only degradation when no key / on embed failure.

## Changes

- **`server/embeddings.py`** (new): the only module that talks to Gemini. `embed_texts(texts, *, kind, retries)`, `document_input`, `content_hash`, `pack_vector`/`unpack_vector`, `cosine`, `EmbeddingError`. L2-normalized float vectors (dims 3072), float32 BLOB packing (no numpy).
- **`server/config.py`**: `gemini_api_key()` (GOOGLE_API_KEY → GEMINI_API_KEY), `embedding_model()` (default `gemini-embedding-2-preview`), `embeddings_enabled()`.
- **`server/db.py`**: idempotent `document_embeddings` table (doc_id PK, FK CASCADE) + `upsert_embedding`, `get_embedding`, `get_embedding_hashes`, `get_all_embeddings` (project/tag-filtered join), `delete_orphan_embeddings`.
- **`server/reindex.py`**: `_sync_embeddings` step — content-hash cache, **per-doc incremental embed+upsert** (mid-run 429 never discards progress), orphan/model-mismatch cleanup. Report gains `embeddings: {embedded, cached, removed, skipped_reason?}`; CLI prints it.
- **`server/search.py`**: RRF fusion at the S1 seam. Keyword ordering (bm25+recency) ∪ vector ordering (query embed + cosine over `get_all_embeddings`). `score` = rounded RRF; `signals` = `{bm25?, recency, vector?}`; `mode` = `hybrid`/`bm25`; `total` = fused-union size. Vector-only hits get a leading-text excerpt snippet (no `<mark>`), no bm25 signal. `raw=True` and no-vector both stay exact S1 BM25 behavior. `search()` return dict gains a `mode` key.
- **`server/main.py`**: `/api/search` reports `out["mode"]`; `POST /api/documents` best-effort embeds the new doc **outside WRITE_LOCK** (any failure swallowed — never affects the 201).
- **`pyproject.toml`**: `google-genai==1.72.0` (changple5's line); `uv sync` locked (`uv.lock`).
- **`compose.yml`**: `GOOGLE_API_KEY` / `GEMINI_API_KEY` / `GEMINI_EMBEDDING_MODEL` passthrough (empty = feature off).
- **`tests/test_embeddings.py`** (new): deterministic fake embedder (monkeypatch, no network) — reindex embed/cache/re-embed; hybrid vector-only + fused hits; no-key BM25 degradation. **`tests/conftest.py`** (new): autouse fixture strips ambient `GOOGLE_API_KEY`/`GEMINI_API_KEY` so the suite never hits the network.

## Validation

- **`uv run pytest -q`** → **30 passed** (27 pre-existing green + 3 new; suite kept terse).
- **`python3 scripts/workflow.py validate`** → passed (state integrity).
- **Degradation smoke** — API on port 8767, no key, real 6-doc corpus: `/api/search?q=창플` → `mode: "bm25"`, total 0 (창플 not in the English corpus); matching queries (`injection`, `ingestion`, `agent`) → `mode: "bm25"`, `signals: {bm25, recency}`, **no vector signal**. Byte-identical to S1 behavior. Server killed; port freed.
- **Live smoke** (key sourced from changple5 `.dev.env`, never printed/written):
  - `reindex #1` → `embeddings: embedded=6 cached=0 removed=0` (all 6 real docs, dims 3072).
  - `reindex #2` → `embedded=0 cached=6` (content-hash cache holds).
  - Korean paraphrase (zero token overlap with the English nginx doc) → `mode: "hybrid"`, **shared-nginx doc ranked #1** with `signals {recency, vector: 0.629}` (vector-only, no bm25) — cross-lingual semantic match.
  - English paraphrase (no nginx/proxy tokens) → `mode: "hybrid"`, shared-nginx #1, vector-only, leading-text excerpt snippet (no `<mark>`).
  - Keyword `injection` → `mode: "hybrid"`, prompt-injection doc #1, **fused `signals {bm25, recency, vector}`**, `<mark>` FTS snippet.
  - Graceful degradation observed live: a transient 429 on one query embed fell back to `mode: "bm25"` (fail-fast on the request path). Server killed; port freed.
- **Secret check**: grepped the whole repo (excl. `.git`/`.venv`) for the literal key value and for `AIza…` prefixes → 0 files; no hardcoded key assignments in `server`/`tests`/`compose`. Scratchpad DBs (embeddings only, no key) removed.

## Deviations from Plan

1. **Embedding batching — the SDK does not batch.** Plan said "batch where the API allows". `google-genai`'s `client.models.embed_content(contents=[...])` returns a **single** embedding regardless of list length (verified live), so batching would silently collapse N docs into one vector. Switched to **one request per text**; the corpus is tiny (6 docs + the query), so this is fine.
2. **`auto_truncate` removed — unsupported in the Gemini API** (Vertex-only; live call raised `ValueError: auto_truncate parameter is not supported in Gemini API`). Rely on `MAX_INPUT_CHARS=20000` (covers every current doc in full; the largest ~18KB doc embeds without truncation) as the request bound.
3. **Added 429 retry/backoff + per-doc incremental persistence (beyond plan).** `gemini-embedding-2-preview` enforces a low per-minute quota (~4-5 req/min); a batch reindex 429s mid-run. `embed_texts` gained a `retries` param (bounded exponential backoff, capped 30s) used **only by reindex** (`_EMBED_RETRIES=6`); the request path (search query, POST) passes `retries=0` and fails fast → degrades. Reindex now embeds **per-doc and upserts each success immediately**, so a mid-run 429 never discards progress and the content-hash cache lets a later reindex finish exactly the missing docs.
4. **Slice name says "sqlite-vec"; actual mechanism is SQLite BLOB + Python cosine** — operator-approved (plan Context + phase Context). Schema is sqlite-vec-upgradable (vectors keyed by doc_id); upgrade path documented in `db.py` and the S3 cross-slice note.

## Files Changed

- `server/embeddings.py` (new), `server/config.py`, `server/db.py`, `server/reindex.py`, `server/search.py`, `server/main.py`
- `pyproject.toml`, `uv.lock`, `compose.yml`
- `tests/test_embeddings.py` (new), `tests/conftest.py` (new)

## Doc Versions Created

- None (per contract, durable docs are versioned once at P4.REVIEW). Doc-impact notes appended to `phase.md`.
