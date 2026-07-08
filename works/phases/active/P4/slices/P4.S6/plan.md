# Plan — P4.S6: Hybrid semantic search — Gemini embeddings + SQLite vectors + RRF fusion

Orchestrator's native plan, approved by the operator 2026-07-08. You are the slice-executor: implement against this plan, write `result.md`, append notes to `../../phase.md`. You never commit and never transition slice/phase status.

## Context

Operator-approved scope addition (see `../../phase.md` Context). S1 landed keyword quality and left the fusion seam ready: `server/search.py` re-ranks the full match set in Python before pagination and carries a `signals` block. This slice adds the semantic signal. Decisions already made by the operator — do not relitigate:

- **Vectors as BLOBs in SQLite, cosine in Python.** The local venv Python (python.org macOS build) cannot load SQLite extensions, so sqlite-vec is out for now; plain-table float32 BLOBs + Python cosine behave identically at this scale and work everywhere. Keep the schema sqlite-vec-upgradable (vectors keyed by doc id).
- **Gemini embeddings, changple5's exact convention**: library `google-genai`, model `gemini-embedding-2-preview` (env `GEMINI_EMBEDDING_MODEL`), credential `GOOGLE_API_KEY` preferred / `GEMINI_API_KEY` fallback.
- **RRF fusion**; **content-hash embedding cache**; **graceful degradation** to today's exact BM25 behavior when no key / embed failure.

**SECRET HANDLING (hard rule):** for the live smoke you may source the key from `~/projects/personal/changple5/.dev.env` (operator authorized). Never print it, never write it into any file (result.md, phase.md, logs, tests, .env in this repo), never commit it. Presence-check only (`[ -n "$GOOGLE_API_KEY" ]`).

## Changes

**`server/config.py`** — call-time getters in the existing `_env` style: `gemini_api_key()` (GOOGLE_API_KEY → GEMINI_API_KEY fallback; None = disabled), `embedding_model()` (GEMINI_EMBEDDING_MODEL, default `gemini-embedding-2-preview`), `embeddings_enabled()`.

**New `server/embeddings.py`** — the only module that talks to Gemini:
- `embed_texts(texts, *, kind)` via `google-genai`; `kind` distinguishes document vs query embedding (use the API's retrieval task types if the installed lib/model supports them — verify the exact call shape against the installed `google-genai`). Batch where the API allows. L2-normalize; pack as `array('f', v).tobytes()` (no numpy).
- `content_hash(model, title, markdown)` — sha256 over the exact embedded text composition (recommend `title + "\n\n" + markdown`, truncated to the model input limit; document your choice in the module docstring).
- Failures raise a narrow `EmbeddingError`; every caller treats it as non-fatal.

**`server/db.py`** — idempotent DDL addition in `_SCHEMA` style:
```sql
CREATE TABLE IF NOT EXISTS document_embeddings (
  doc_id INTEGER PRIMARY KEY REFERENCES documents(id) ON DELETE CASCADE,
  model TEXT NOT NULL, content_hash TEXT NOT NULL,
  dims INTEGER NOT NULL, vector BLOB NOT NULL, updated_at TEXT NOT NULL
);
```
Helpers: `upsert_embedding`, `get_all_embeddings(conn, model)` (joinable with documents for project/tag filters), `get_embedding(doc_id, model)`. FK cascade + the existing `foreign_keys=ON` covers deletes. DB stays disposable — embeddings are a cache; a deleted DB re-embeds for pennies.

**`server/reindex.py`** — after the docs walk, an embedding-sync step: compute `content_hash` per doc; embed only missing/stale rows (batched); delete orphaned embedding rows. No key → skip, reported. API failure → non-fatal, reported. The report (and CLI output) gains `embeddings: {embedded, cached, removed, skipped_reason?}`.

**`server/main.py`**
- `POST /api/documents`: best-effort embed of the new doc **outside the WRITE_LOCK critical section** — an embed failure never affects the 201 (next reindex catches up).
- `GET /api/search`: response `mode` = `"hybrid"` when the vector signal participated, else `"bm25"`. All additions additive/backward-compatible.

**`server/search.py`** — fusion at the S1 seam:
- When enabled and `raw=False`: embed the query (catch `EmbeddingError`/timeouts → degrade to today's path), load candidate embeddings (respect project/tag filters), cosine-rank.
- RRF: `rrf(d) = Σ_lists 1/(RRF_K + rank_d)`, module constant `RRF_K = 60`, over (a) the keyword ordering (existing bm25+recency composed score) and (b) the vector ordering. Candidate set = union of both lists; vector-only hits have no bm25 → `signals.bm25` absent/null and snippet falls back to a leading-text excerpt.
- Final `score` = rounded RRF; `signals` = `{bm25?, recency, vector?}` (`vector` = cosine similarity). Order: score DESC, date DESC, id DESC. `total` = fused-union size. Pagination slices the final fused ordering (mechanism unchanged).
- `raw=True` stays keyword-only exactly as today.

**`pyproject.toml`** — add `google-genai` (align with changple5's `1.72.0` major line; `uv sync` to lock). **`compose.yml`** — pass to the `api` service: `GOOGLE_API_KEY: ${GOOGLE_API_KEY:-}`, `GEMINI_API_KEY: ${GEMINI_API_KEY:-}`, `GEMINI_EMBEDDING_MODEL: ${GEMINI_EMBEDDING_MODEL:-gemini-embedding-2-preview}` (empty = feature off).

**Tests — terse, NO network ever** (monkeypatch `embeddings.embed_texts` with a deterministic fake that counts calls):
1. Reindex embeds all fixture docs; second reindex embeds none (hash cache); an edited doc re-embeds.
2. Hybrid search: fake vectors make a chosen doc the semantic top hit → returned with `mode: "hybrid"` + `signals.vector`; a vector-only hit gets the fallback snippet.
3. No key → response byte-identical in shape to S1 behavior (`mode: "bm25"`, no vector signal); all existing tests stay green.

## Constraints (from `phase.md`)

- `/explain` POST payload unchanged; no edits outside this repo; never touch `docs/current/` or `docs/versions/`.
- `docs/` canonical / DB disposable; single-worker invariant untouched (no background workers — embeds happen in-request or at reindex).
- Tests terse. Durable docs NOT versioned here — append one-line Doc impact notes to `phase.md` for: `api.md` (mode hybrid, signals.vector), `backend.md` (embeddings module + fusion), `data.md` (document_embeddings table), `architecture.md` (hybrid extension point consumed), `operations.md` (new env vars), `decisions.md` (ADR: BLOB+Python-cosine over sqlite-vec — local Python lacks extension loading; Gemini reuse; RRF).
- Cross-slice note for S3: its reindex refactor must preserve the embedding-sync step; also note the sqlite-vec upgrade path.

## Validation (run these; report results in result.md)

- `uv run pytest -q` — all green.
- Degradation smoke: API on port **8767** (never 8766 — Docker may hold it) with no key → `/api/search?q=창플` matches S1 behavior (`mode: "bm25"`).
- Live smoke (source key from changple5 `.dev.env` without printing it): `uv run python -m server.reindex` → embeddings report shows all 6 real docs embedded; run API with the key; a paraphrase query with no keyword overlap (e.g. a Korean or English paraphrase of the shared-nginx doc's topic) returns the right doc with `mode: "hybrid"` and `signals.vector`; re-run reindex → `embedded: 0, cached: 6`. Kill the server. Grep your written files to confirm no key material anywhere.

## Done means

All changes implemented; tests green; both smoke paths pass; Doc impact + cross-slice notes appended; `result.md` written; structured verdict returned. No commits, no status transitions, no secrets in files.
