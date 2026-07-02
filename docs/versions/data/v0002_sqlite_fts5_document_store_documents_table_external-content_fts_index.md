---
doc_id: data
version: v0002
created_at: 2026-07-02T16:05:54+09:00
source: P2.REVIEW
summary: SQLite FTS5 document store: documents table + external-content FTS index
previous: v0001_bootstrap
---

# Data

## Status

Implemented and validated (Track 2). SQLite + FTS5 backs the document store. `docs/` markdown is the canonical, durable store; the DB is a disposable projection rebuilt from files.

## Storage

- Primary DB: SQLite at `data/kb.sqlite3`, **WAL** mode, idempotent DDL applied at `connect()`. Disposable and **gitignored** — the ignore rule is root-anchored `/data/` (so the `docs/versions/data/` durable-doc subtree stays trackable), and the DB is rebuilt from `docs/` by reindex.
- Cache / object storage: none.

## Entities

### documents

- Purpose: one row per explainer document.
- Columns: `id`, `project`, `slug`, `date` (GLOB-checked `YYYY-MM-DD`), `title`, `tags` (JSON array), `tags_text` (space-joined mirror of `tags` for FTS), `source_repo`, `rel_path` (= `<project>/<date>-<slug>.md`, relative to `docs/`), `markdown` (body **without** frontmatter, starting at the H1), `created_at`, `updated_at`.
- Constraints: `UNIQUE(rel_path)`, `UNIQUE(project, date, slug)`; a `CHECK` GLOB-validates the date format.
- Upsert keys on `rel_path` (preserves `created_at`, refreshes `updated_at`).

### documents_fts

- **External-content** FTS5 virtual table: `documents_fts(title, tags_text, markdown, content='documents', content_rowid='id', tokenize='porter unicode61')`.
- Kept in sync with `documents` by an **AFTER INSERT / DELETE / UPDATE trigger trio** (the delete/update paths use the external-content `'delete'` protocol).
- External-content (not contentless) so `snippet()` / `highlight()` work over `markdown`. Column order `(title, tags_text, markdown)` maps to `bm25` weights `8.0 / 4.0 / 1.0`.

## Indexes / Search

- BM25 keyword search via `documents_fts`; `score = -bm25` exposed higher-is-better.

## Extension Point (future, not this phase)

- A `sqlite-vec` `document_chunks_vec` table + RRF fusion in `server/search.py` for hybrid search. The seam is left clean; no embeddings pipeline in this phase.

## Migrations

- Tooling: none. DDL is idempotent and applied at connect.
- Rule: the DB is disposable and rebuilt from `docs/` — no migration story is needed; schema changes are applied via new idempotent DDL + a full reindex.

## Reconciliation (reindex)

- Reindex walks `docs/<subdir>/**/*.md` **only** — top-level files (`index.md`, `tags.md`, `README.md`, `index.json`) are never entered, and `RESERVED_DIRS = {"current","versions"}` are excluded entirely.
- Malformed walked files land in `skipped:[{rel_path, reason}]` (filename not `<YYYY-MM-DD>-<slug>.md`, missing/invalid frontmatter, bad date); real explainers are counted in `indexed`.
- Removal is keyed on **file presence**: a DB row whose `rel_path` no longer exists under a non-reserved subdir is removed. Reindex never runs git.

## Retention

- The DB is a disposable projection; `docs/` is the durable store. Reindex reconciles drift (manual edits, API-down fallback writes, git resets).
