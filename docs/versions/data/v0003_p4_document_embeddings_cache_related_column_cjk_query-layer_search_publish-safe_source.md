---
doc_id: data
version: v0003
created_at: 2026-07-08T21:52:17+09:00
source: P4.REVIEW
summary: P4: document_embeddings cache, related column, CJK query-layer search, publish-safe source
previous: v0002_sqlite_fts5_document_store_documents_table_external-content_fts_index
---

# Data

## Status

Implemented and validated (Track 2). SQLite + FTS5 backs the document store, with a P4 disposable embedding cache (`document_embeddings`) for hybrid semantic search. `docs/` markdown is the canonical, durable store; the DB — including the embedding cache — is a disposable projection rebuilt from files.

## Storage

- Primary DB: SQLite at `data/kb.sqlite3`, **WAL** mode, idempotent DDL applied at `connect()`. Disposable and **gitignored** — the ignore rule is root-anchored `/data/` (so the `docs/versions/data/` durable-doc subtree stays trackable), and the DB is rebuilt from `docs/` by reindex.
- Cache / object storage: none.

## Entities

### documents

- Purpose: one row per explainer document.
- Columns: `id`, `project`, `slug`, `date` (GLOB-checked `YYYY-MM-DD`), `title`, `tags` (JSON array), `tags_text` (space-joined mirror of `tags` for FTS), `source_repo` (P4: a **publish-safe** basename — sanitized at write time, never an absolute local path), `related` (P4: `TEXT NOT NULL DEFAULT '[]'`, a JSON array of forward-link rel_paths, **not** in `documents_fts`), `rel_path` (= `<project>/<date>-<slug>.md`, relative to `docs/`), `markdown` (body **without** frontmatter, starting at the H1), `created_at`, `updated_at`.
- Constraints: `UNIQUE(rel_path)`, `UNIQUE(project, date, slug)`; a `CHECK` GLOB-validates the date format.
- Upsert keys on `rel_path` (preserves `created_at`, refreshes `updated_at`).

### documents_fts

- **External-content** FTS5 virtual table: `documents_fts(title, tags_text, markdown, content='documents', content_rowid='id', tokenize='porter unicode61')`. The tokenizer is **unchanged in P4** — Korean/CJK searchability is achieved entirely at the query layer (prefix expansion in `build_match_query`), not by switching the index tokenizer.
- Kept in sync with `documents` by an **AFTER INSERT / DELETE / UPDATE trigger trio** (the delete/update paths use the external-content `'delete'` protocol). The P4 `related` base-table column is deliberately excluded — the trigger trio names its columns explicitly (`title, tags_text, markdown`), so it is untouched.
- External-content (not contentless) so `snippet()` / `highlight()` work over `markdown`. Column order `(title, tags_text, markdown)` maps to `bm25` weights `8.0 / 4.0 / 1.0`.

### document_embeddings (P4)

- Purpose: a **disposable cache** of one embedding vector per document for hybrid semantic search.
- Columns: `doc_id` (PK → `documents(id)` **`ON DELETE CASCADE`**), `model`, `content_hash`, `dims`, `vector` (float32 BLOB), `updated_at`.
- Vectors are L2-normalized float32 (the Gemini SDK returns **3072-dim**), keyed by content hash so reindex re-embeds only changed docs; a wiped table just re-embeds. Kept **sqlite-vec-upgradable** — the same `doc_id` keying maps onto a future `vec0` virtual table.
- The FK cascade (with `PRAGMA foreign_keys=ON` at `connect()`) means deleting a document automatically drops its embedding row — the delete path needed no extra cleanup code.

## Indexes / Search

- BM25 keyword search via `documents_fts`, fused in Python with an exp-decay recency signal (P4).
- **CJK/Hangul/Kana** search comes from query-layer prefix expansion, not the index (the tokenizer stays `porter unicode61`).
- **Hybrid semantic search** (P4): a cosine vector ordering over `document_embeddings` is fused with the keyword ordering via RRF in `server/search.py` when a Gemini key is configured; otherwise search degrades to BM25-only.

## Extension Point (sqlite-vec upgrade)

- The formerly-clean `sqlite-vec` seam is now **consumed** by hybrid search, but stored as a plain `document_embeddings` BLOB table + Python cosine (the local python.org macOS venv cannot load SQLite extensions). To adopt `sqlite-vec` later, swap that table for a `vec0` virtual table on the same `doc_id` and replace the Python cosine loop with a vec KNN query — the RRF fusion, signals shape, and `mode` logic are unaffected; nothing else keys off the storage format.

## Migrations

- Tooling: none for the disposable DB. DDL is idempotent and applied at connect.
- P4 added one **in-place** migration for continuity: `init_db` runs `PRAGMA table_info(documents)` and, if the `related` column is absent, `ALTER TABLE documents ADD COLUMN related TEXT NOT NULL DEFAULT '[]'` — idempotent, so a pre-P4 DB upgrades without a rebuild.
- Rule: the DB is disposable and rebuilt from `docs/` — schema changes are applied via new idempotent DDL (+ the occasional in-place `ALTER` for smooth upgrades) + a reindex.

## Reconciliation (reindex)

- Reindex walks `docs/<subdir>/**/*.md` **only** — top-level files (`index.md`, `tags.md`, `README.md`, `index.json`) are never entered, and `RESERVED_DIRS = {"current","versions"}` are excluded entirely.
- Malformed walked files land in `skipped:[{rel_path, reason}]` (filename not `<YYYY-MM-DD>-<slug>.md`, missing/invalid frontmatter, bad date); real explainers are counted in `indexed`.
- Removal is keyed on **file presence**: a DB row whose `rel_path` no longer exists under a non-reserved subdir is removed. Reindex never runs git.

## Retention

- The DB is a disposable projection; `docs/` is the durable store. Reindex reconciles drift (manual edits, API-down fallback writes, git resets).
