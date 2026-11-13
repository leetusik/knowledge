---
doc_id: decisions
version: v0004
created_at: 2026-07-08T21:52:18+09:00
source: P4.REVIEW
summary: P4: CJK query-side search, hybrid RRF, cross-link convention, publish hygiene ADRs
previous: v0003_github_pages_generator_mkdocs-material_9.7.6_re-confirmed_over_hugo
---

# Decisions

## Status

Accepted decisions: the two-track knowledge store; the GitHub Pages generator (mkdocs-material 9.7.6, re-confirmed over Hugo); and the P4 pipeline-hardening set — query-side CJK search (tokenizer unchanged) + recency ranking, hybrid RRF semantic search on Gemini + SQLite BLOB vectors, the `related` cross-link convention, and publish hygiene (`source.repo` basenames + `exclude_docs`).

## Purpose

Use this doc as a lightweight ADR index: important choices, rejected alternatives, tradeoffs, and decision sources.

## Decision Log

### Two-track knowledge store

- Date: 2026-07-02
- Status: accepted
- Context: The first real operator task is a personal knowledge store with two distinct consumption paths — a public, browsable site and a database/API for a future personal web UI with hybrid search. Both are served from this single repo, beside the existing MkDocs Material tree.
- Decision: Serve knowledge through two tracks.
  - **Track 1 — `docs/` markdown tree → public GitHub Pages** (delivered by P3): publish the existing MkDocs tree as a static site.
  - **Track 2 — SQLite + FTS5 document store behind a FastAPI service** (delivered by P2): compose service `api` on host port 8766, DB at `data/kb.sqlite3` (gitignored, disposable, rebuilt from files), with FTS5/BM25 keyword search now and a clean `sqlite-vec` extension point for later hybrid search.
- Alternatives considered: Postgres + pgvector for the store — rejected (per P2 intent clarifications) in favor of SQLite + FTS5 with a `sqlite-vec` extension point.
- Consequences:
  - The API owns the write path: a POST writes the `docs/` file, inserts the Recent marker in `docs/index.md`, upserts the DB row, and makes a scoped git commit (stages only touched files — never `git add -A`; never pushes).
  - `docs/` stays canonical; `POST /api/reindex` rebuilds the DB from files and reconciles any drift.
  - Site deploys happen only on the operator's manual `git push` — no automated push from the API or skills.
  - The `/explain` skill (in the `bootstrap_agentic_workspace` repo) becomes the API's client, POSTing documents instead of writing files directly.
  - This repo never edits the `bootstrap_agentic_workspace` repo; the `/explain` update is handled there via a prepared handover prompt.
- Source: P1.REVIEW — intake evidence in P1 `phase.md`; confirmed intents in P2 and P3 `intent.md`.

### GitHub Pages generator: mkdocs-material 9.7.6

- Date: 2026-07-02
- Status: accepted
- Context: At P3 execution the operator reopened the generator choice ("maybe Hugo") for the Track 1 GitHub Pages site.
- Decision: Keep mkdocs-material, pinned exactly to `9.7.6` to match the local viewer image (`squidfunk/mkdocs-material:9.7.6`), so the local `docker compose run --rm kb build` stays a faithful CI pre-check.
- Alternatives considered: Hugo — rejected (`docs/` is plain markdown without front matter; the local viewer + tags page are material-specific; migration cost with no benefit at this scale).
- Consequences:
  - Version bumps happen in two places together: the `compose.yml` image tag and the `pages.yml` pip pin move as a pair.
  - Design polish is deferred post-launch — publish first with the stock indigo / dark-mode look; tracked as deferred job D2.
- Source: P3.REVIEW — evidence in P3 `intent.md` and `phase.md`.

### CJK search at the query layer (tokenizer unchanged) + recency ranking

- Date: 2026-07-08
- Status: accepted (P4.S1)
- Context: `documents_fts` used `tokenize='porter unicode61'` — English stemming only, so Korean/CJK text was not word-searchable. The corpus includes a real 2-char proper noun (창플) and 2-char prefix queries.
- Decision: **Keep `porter unicode61` (no schema change, no FTS drop/rebuild)** and add query-side CJK prefix expansion — `build_match_query` emits any CJK/Hangul/Kana token as a `"tok"*` prefix query. Also add recency-aware ranking: `score = bm25 + RECENCY_WEIGHT·recency` with exp decay (`HALF_LIFE_DAYS=90`, `RECENCY_WEIGHT=0.5`) over the doc's `date`, plus search pagination (`offset`/`total`).
- Alternatives considered: `trigram` — rejected. An empirical in-memory probe showed `trigram` cannot match anything <3 chars, hard-failing 창플 and every 2-char prefix, at ~3× index size + a forced rebuild; `porter unicode61` + `"tok"*` matched the representative queries.
- Consequences / accepted limitations: mid-word substrings don't match (라클), and a pure-ASCII query won't match inside a mixed token (`changple5` vs `changple5의`). On a tiny corpus BM25 IDF collapses toward 0, so recency becomes the effective tiebreak. Re-ranking runs Python-side over the full match set (SQLite math funcs aren't guaranteed portable, and this is the seam hybrid fusion plugs into).
- Source: P4.S1 `result.md`; P4 `phase.md`.

### Hybrid semantic search: Gemini embeddings + SQLite BLOB vectors + RRF

- Date: 2026-07-08
- Status: accepted (P4.S6 — operator scope addition)
- Context: The operator added semantic search to P4. The P2 ADR (SQLite + a `sqlite-vec` extension seam; pgvector declined) stands.
- Decision:
  - **SQLite float32 BLOB vectors + Python cosine, not the `sqlite-vec` extension** — the local python.org macOS venv cannot load SQLite extensions; plain BLOBs behave identically at this scale and run everywhere. Schema is kept `sqlite-vec`-upgradable (vectors keyed by `doc_id`).
  - **Gemini embeddings**, reusing changple5's convention (`google-genai`, model `gemini-embedding-2-preview`, credential `GOOGLE_API_KEY`/`GEMINI_API_KEY`).
  - **RRF fusion** (`RRF_K=60`) over the keyword and vector orderings at the Python seam.
  - **Content-hash embedding cache** (sha256 of model + `title\n\nbody` truncated to 20000 chars) so reindex re-embeds only changed docs.
  - **Graceful BM25-only degradation** (no key / embed failure / `raw=true`).
- Alternatives considered: `sqlite-vec` now (blocked by the extension-load limitation); pgvector (declined at P2, SaaS can revisit).
- Consequences: the SDK's `embed_content` does not batch and Gemini has no `auto_truncate` (both verified live); `gemini-embedding-2-preview` has a low per-minute quota, handled by per-doc incremental persistence + bounded 429 backoff on the reindex path. Embeds run in-request (outside the write lock) or at reindex — no background workers, single-worker invariant intact.
- Source: P4.S6 `result.md`; P4 `phase.md`.

### Cross-link convention: frontmatter `related:`, forward-only, dead links tolerated

- Date: 2026-07-08
- Status: accepted (P4.S4)
- Context: Zero inter-doc links across the explainer docs — the P6 knowledge graph had no edges.
- Decision: A **frontmatter-only** `related:` list of rel_paths (no `## Related` body-section parsing — fragile/duplicative; the site/UI can render relations from the API). **Dead links tolerated** (shape-validated, existence not required — a related doc may be written later). **Forward links only** (no reverse index; P6 derives backlinks by inverting forward edges across the corpus). Exposed on the list/get API (same pass-through as `tags`); `/api/search` deliberately unchanged.
- Consequences: a small, textually-grounded subgraph backfilled (2 of 6 docs); optional/backward-compatible everywhere (the frozen `/explain` skill still works); P6 treats a `related` entry with no matching doc as a broken edge to surface, not an error.
- Source: P4.S4 `result.md`; P4 `phase.md`.

### Publish hygiene: `source.repo` basenames + `exclude_docs` for versioned docs

- Date: 2026-07-08
- Status: accepted (P4.S5 — resolves deferred job D1)
- Context: Every published doc leaked an absolute local `source.repo` path to the public site, and `docs/versions/` (workspace-internal history) published publicly.
- Decision: **Basename representation for `source.repo`** — sanitize at write time (local path → basename, URL passes through) so the surface stays publish-safe without a skill change and forward-compatibly for P7 plugin URLs. **`mkdocs exclude_docs: /versions/`** to hide versioned-doc history from the built site — never `nav:`/`strict:` (auto-nav is load-bearing).
- Consequences: no filesystem leakage on the public surface; versioned-doc history stays in git but out of CI builds; the server sanitizes regardless of skill input (P7-ready).
- Source: P4.S5 `result.md`; P4 `phase.md`.

## Superseded Decisions

- The P2 "clean `sqlite-vec`/RRF seam, no embeddings this phase" framing is **consumed, not superseded**, by P4.S6: hybrid search is live via SQLite BLOB vectors + Python cosine, with the seam kept `sqlite-vec`-upgradable.
