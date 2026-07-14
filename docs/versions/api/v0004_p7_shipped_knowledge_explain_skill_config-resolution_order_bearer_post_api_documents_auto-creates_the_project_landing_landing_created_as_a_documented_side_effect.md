---
doc_id: api
version: v0004
created_at: 2026-07-14T16:21:04+09:00
source: P7.REVIEW
summary: P7: shipped /knowledge:explain skill config-resolution order + bearer; POST /api/documents auto-creates the project landing (landing_created) as a documented side effect
previous: v0003_p4_search_pagination_hybrid_signals_delete_tags_projects_incremental_reindex_related_links
---

# API

## Status

Stable and validated. The Track 2 FastAPI service (compose service `api`, base `http://localhost:8766`) implements the read, search, reindex, and API-owned write contracts below. `docs/` is the canonical store; the SQLite DB is a disposable projection. P4 hardened the surface: search is paginated and hybrid (keyword + optional Gemini vector signal), documents can be deleted, `GET /api/tags` and `GET /api/projects` expose aggregations, reindex accepts a single-path form, and documents carry `related` cross-links — all additive and backward-compatible (the existing `/explain` write payload is unchanged; every new write-contract field is optional). P7 (F1) added one write-path **side effect**: the first document of a **new project** also auto-creates that project's `docs/<project>/index.md` landing page, surfaced as a new `landing_created` response field — additive and backward-compatible (existing projects and payloads unaffected). This API is unchanged for the packaged plugin distribution; the shipped `/knowledge:explain` skill is now the client (config-resolved base URL + optional bearer — see below).

## Auth

`Authorization: Bearer <KB_API_TOKEN>` is required on the **mutating endpoints only** (`POST /api/documents`, `DELETE /api/documents/*`, `POST /api/reindex`) and only when `KB_API_TOKEN` is set (else 401). All `GET` endpoints — including the new `/api/tags` and `/api/projects` aggregations — are always open. Token unset (default) = localhost open.

## Shipped explain-skill client: config resolution + bearer (P7)

The packaged `/knowledge:explain` skill is the API's client and resolves its target
**per key, highest precedence first**: environment (`KB_ROOT` / `KB_API_BASE_URL` /
`KB_API_TOKEN`) → the config file `$XDG_CONFIG_HOME/knowledge-kb/config.json`
(default `~/.config/knowledge-kb/config.json`; nested keys `kb_root`, `api.base_url`,
`api.token`, `site.base_url`) → the legacy `~/projects/personal/knowledge` convention
(keeps the operator's own machines working pre-setup) → **stop** and tell the user to
run `/knowledge:setup`. A present config file is authoritative and does not fall
through to legacy for keys it omits (omitted `api.base_url` defaults to
`http://localhost:8766`; `kb_root` may be legitimately absent = remote-only). When a
token is configured the skill adds `Authorization: Bearer <token>` to the mutating
POST. The API-first branch semantics are unchanged (201/409/422/401); the file+git
fallback fires **only** when config resolves a **local** `kb_root` — a remote
`base_url` that is unreachable is reported, never silently written to disk.

## Contracts

### GET /healthz

- Purpose: liveness + DB reachability + document count.
- Output: `{status:"ok", docs_root, db:"ok", documents:N}`.

### GET /api/documents

- Query: `project`, `tag`, `limit` (1–200, default 50), `offset` (≥0).
- Output: `{total, items:[...]}`, newest-first. Items omit `markdown` and the internal `tags_text` mirror, and each item now carries `related` (the cross-link array, same DB-row pass-through as `tags`).

### GET /api/documents/{id} and GET /api/documents/by-path/{rel_path:path}

- Output: the single document including `markdown`, `source_repo` (publish-safe basename — see write path), and `related` (still no `tags_text`); 404 when missing.
- The `by-path` route is declared before the `{id:int}` route so a path never binds to the id route.

### GET /api/tags

- Purpose: tag aggregation for a tag cloud / browser (added P4 for the P5 web UI). Open read.
- Query: optional `project` — scopes the counts to one project.
- Output: `{tags:[{tag, count}, ...]}`, ordered **count DESC, then tag ASC** for direct display.

### GET /api/projects

- Purpose: project aggregation for a project browser (added P4). Open read.
- Output: `{projects:[{project, count, latest_date}, ...]}`, ordered **project ASC**.

### GET /api/search

- Query: `q` (required), `project`, `tag`, `limit` (1–50, default 10), `offset` (≥0, added P4), `raw` (default false).
- Output: `{query, mode, total, limit, offset, results:[{doc fields, score, snippet, signals}]}`. `total` is the full match/fusion count; `limit`/`offset` echo the page. `mode` is `"bm25"` or `"hybrid"` (see below).
- **Keyword ranking (always present):** `bm25(documents_fts, 8.0, 4.0, 1.0)` (title 8×, tags 4×, body 1×) fused in Python with an exponential-decay recency signal from the doc's `date` — `score = bm25 + RECENCY_WEIGHT·recency` (module constants `HALF_LIFE_DAYS=90`, `RECENCY_WEIGHT=0.5`); ordered score DESC with date DESC then id DESC as tiebreaks. The full match set is re-ranked in Python *before* `offset`/`limit` slice it, so pagination applies to the final composed ordering, not raw bm25 rank. `snippet()` wraps keyword hits in `<mark>…</mark>`.
- **CJK / Hangul / Kana search:** achieved at the query layer, not the index — `build_match_query` prefix-expands any token containing CJK/Hangul/Kana into a `"tok"*` prefix query (`검색` → `검색"*`), so a 2-char proper noun or a stem matches its inflected forms. Pure-ASCII tokens keep exact porter-stemmed matching. (The FTS tokenizer is unchanged — `porter unicode61`.)
- **Hybrid semantic mode:** when a Gemini API key is configured and the query embeds, a vector ordering (cosine similarity over cached embeddings) is fused with the keyword ordering via **Reciprocal Rank Fusion** (`RRF_K=60`). `mode` is then `"hybrid"`, `total` is the fused-union size, and `score` is the (small, e.g. ~0.03) RRF value. `signals` becomes `{bm25?, recency, vector?}`: `bm25` is present only for keyword hits, `vector` (cosine) only when the vector signal participated; a **pure-semantic (vector-only) hit** carries `{recency, vector}` with a leading-text `snippet` (no `<mark>`). With no key, `raw=true`, or an embed failure the search degrades gracefully to `mode:"bm25"` with byte-identical keyword behavior.
- Safety: each whitespace token is individually double-quoted before `MATCH`, so raw FTS5 operator syntax (`NEAR/AND(`, unbalanced parens, `*`) can never 500 — it collapses to harmless quoted phrases. `raw=true` opts into raw FTS5 syntax deliberately (and stays BM25-only); a syntax error then returns **400**. Blank `q` → empty results.
- Note: BM25 IDF collapses toward 0 on a tiny corpus (a term present in every doc), so keyword `bm25` can round toward 0 there — recency is then the effective tiebreak; the snippet and result still return.

### POST /api/reindex

- Rebuild the DB from `docs/`: walk `docs/<subdir>/**/*.md`, upsert by `rel_path`, delete rows for vanished files. **Never commits.**
- Optional body `{"rel_path": "<project>/<file>.md"}` (pydantic `ReindexIn`; null/absent → full reindex unchanged) triggers an **incremental single-path** reindex — index the one file if present, delete its row if vanished — validated against absolute/`..`/reserved/non-`.md` shapes (a `ValueError` → **422**).
- Output (full): `{indexed, removed, skipped:[{rel_path, reason}], embeddings:{embedded, cached, removed, skipped_reason?}, duration_ms}`; single-path: `{rel_path, action, reason?, embeddings:{...}, duration_ms}`. The `embeddings` block reports the content-hash-cached embedding sync (see Data/Backend).

### DELETE /api/documents/{doc_id} and DELETE /api/documents/by-path/{rel_path:path}

- The `POST /api/documents` write path in reverse (added P4), bearer-guarded, run entirely under `WRITE_LOCK`: remove the `docs/` file (`missing_ok` — a DB row without a file is drift, cleaned without erroring), drop the doc's Recent bullet from `docs/index.md`, delete the DB row (the FTS `AFTER DELETE` trigger and the `document_embeddings` FK `ON DELETE CASCADE` clean up automatically), then a scoped git commit.
- Resolves the target row first → **404** when absent. The `by-path` route is declared before the `{doc_id}` route (same collision-avoidance as the GET pair).
- Query: `commit` (default `true`), optional `co_authored_by`. Commit semantics mirror POST exactly — a failed commit surfaces `committed:false` + `commit_error`, never a rollback.
- Output: `{deleted, id, rel_path, title, project, slug, recent_removed, committed, commit_sha, commit_error?}`. `recent_removed` is `false` (idempotent) when the index or bullet was already gone.

### POST /api/documents

The API-owned write path — one call creates the convention file, the Recent bullet, the DB row, and the scoped git commit.

- Required: `title`; `markdown` (body **without** frontmatter, starting at the H1); `project` (`^[A-Za-z0-9][A-Za-z0-9._-]*$`, no `..`/`/`); `tags` (2–5, each `^[a-z0-9]+(-[a-z0-9]+)*$`); `source_repo`.
- Optional: `date` (default today, KST), `slug` (default `slugify(title)`), `related` (added P4 — list of rel_paths, default `[]`; shape-validated only, dead links tolerated, a self-reference is dropped silently), `overwrite` (default false), `commit` (default true), `co_authored_by`.
- **`source_repo` is sanitized at write time** (added P4): a local filesystem path collapses to its basename (`/home/<user>/projects/changple5` → `changple5`), a URL passes through unchanged. The stored file, DB row, and API output are always publish-safe, without any skill change.
- Success: **201** `{id, rel_path, url, title, project, slug, date, tags, related, recent_updated, landing_created, committed, commit_sha}`, where `url = <KB_PUBLIC_BASE_URL>/<project>/<date>-<slug>/`.
- **Auto-landing side effect (P7 / F1):** inside `WRITE_LOCK`, right after writing the doc file, the write path calls `ensure_project_landing(docs_root, project)` — if `docs/<project>/index.md` is **absent** (the first doc of a new project), it writes a minimal landing (H1 = project name + one line, **no frontmatter** so it stays a non-doc) and the response carries `landing_created:true`; the scoped commit then stages a **third** path (`docs/<project>/index.md`) alongside the doc + `docs/index.md`. An existing landing (hand-written or previously auto-created) is **never overwritten** → `landing_created:false`, two-path commit as before. This keeps every project satisfying the per-project `site/<project>/index.html` deploy-gate invariant (mkdocs `navigation.indexes` does not synthesize one). The `/knowledge:explain` skill's file-fallback branch performs the same ensure-landing when the API is unreachable.
- `KB_PUBLIC_BASE_URL` note (P7): its default `http://localhost:8765` is correct for a default-port local viewer, so the scaffold's `compose.yml` deliberately leaves it unset (see security/decisions). A scaffold on **advanced custom ports** would then report a default-port `url` in the 201 body — a cosmetic mismatch in one informational field only (the write, site build, and viewer are all correct); set `KB_PUBLIC_BASE_URL` to the chosen viewer origin if custom ports are used.
- **409** when `rel_path` already exists on disk **or** in the DB and `overwrite` is false — the body names the existing doc: `{message, rel_path, id, existing_title}`.
- **422** on any convention validation error (project/tags/slug/date/frontmatter/`related` shape).
- Commit semantics: a **failed commit never rolls back** the file/DB → still **201** with `committed:false` + `commit_error`. A deliberate skip (`commit:false` in the request, or `KB_GIT_COMMIT=false`) → `committed:false`, **no** `commit_error`. `commit_sha` is `null` in both non-committed cases; git never pushes.
- An `overwrite` re-write suppresses the duplicate Recent bullet (`recent_updated:false`).
