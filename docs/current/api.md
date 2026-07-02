---
doc_id: api
version: v0002
created_at: 2026-07-02T16:05:54+09:00
source: P2.REVIEW
summary: DB-backed document API: read/list/search/reindex + API-owned write path
previous: v0001_bootstrap
---

# API

## Status

Stable and validated. The Track 2 FastAPI service (compose service `api`, base `http://localhost:8766`) implements the read, search, reindex, and API-owned write contracts below. `docs/` is the canonical store; the SQLite DB is a disposable projection.

## Auth

`Authorization: Bearer <KB_API_TOKEN>` is required on the **two mutating endpoints only** (`POST /api/documents`, `POST /api/reindex`) and only when `KB_API_TOKEN` is set (else 401). All `GET` endpoints are always open. Token unset (default) = localhost open.

## Contracts

### GET /healthz

- Purpose: liveness + DB reachability + document count.
- Output: `{status:"ok", docs_root, db:"ok", documents:N}`.

### GET /api/documents

- Query: `project`, `tag`, `limit` (1–200, default 50), `offset` (≥0).
- Output: `{total, items:[...]}`, newest-first. Items omit `markdown` and the internal `tags_text` mirror.

### GET /api/documents/{id} and GET /api/documents/by-path/{rel_path:path}

- Output: the single document including `markdown` and `source_repo` (still no `tags_text`); 404 when missing.
- The `by-path` route is declared before the `{id:int}` route so a path never binds to the id route.

### GET /api/search

- Query: `q` (required), `project`, `tag`, `limit` (1–50, default 10), `raw` (default false).
- Output: `{query, mode:"bm25", results:[{doc fields, score, snippet, signals:{bm25}}]}`.
- Ranking: `bm25(documents_fts, 8.0, 4.0, 1.0)` (title 8×, tags 4×, body 1×); `score = -bm25` (higher-is-better, rounded to 4, ready for hybrid fusion); `snippet()` wraps hits in `<mark>…</mark>`; a `signals:{bm25}` block is exposed.
- Safety: each whitespace token is individually double-quoted before `MATCH`, so raw FTS5 operator syntax (`NEAR/AND(`, unbalanced parens, `*`) can never 500 — it collapses to harmless quoted phrases. `raw=true` opts into raw FTS5 syntax deliberately; a syntax error then returns **400**. Blank `q` → empty results.
- Note: BM25 IDF collapses toward 0 on a 1–2 doc corpus (a term present in every doc), so `score` can round to `0.0` on the single-doc real repo — correct, not a regression; the snippet and result still return.

### POST /api/reindex

- Rebuild the DB from `docs/`: walk `docs/<subdir>/**/*.md`, upsert by `rel_path`, delete rows for vanished files. **Never commits.**
- Output: `{indexed, removed, skipped:[{rel_path, reason}], duration_ms}`.

### POST /api/documents

The API-owned write path — one call creates the convention file, the Recent bullet, the DB row, and the scoped git commit.

- Required: `title`; `markdown` (body **without** frontmatter, starting at the H1); `project` (`^[A-Za-z0-9][A-Za-z0-9._-]*$`, no `..`/`/`); `tags` (2–5, each `^[a-z0-9]+(-[a-z0-9]+)*$`); `source_repo`.
- Optional: `date` (default today, KST), `slug` (default `slugify(title)`), `overwrite` (default false), `commit` (default true), `co_authored_by`.
- Success: **201** `{id, rel_path, url, title, project, slug, date, tags, recent_updated, committed, commit_sha}`, where `url = <KB_PUBLIC_BASE_URL>/<project>/<date>-<slug>/`.
- **409** when `rel_path` already exists on disk **or** in the DB and `overwrite` is false — the body names the existing doc: `{message, rel_path, id, existing_title}`.
- **422** on any convention validation error (project/tags/slug/date/frontmatter).
- Commit semantics: a **failed commit never rolls back** the file/DB → still **201** with `committed:false` + `commit_error`. A deliberate skip (`commit:false` in the request, or `KB_GIT_COMMIT=false`) → `committed:false`, **no** `commit_error`. `commit_sha` is `null` in both non-committed cases; git never pushes.
- An `overwrite` re-write suppresses the duplicate Recent bullet (`recent_updated:false`).
