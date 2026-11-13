---
doc_id: architecture
version: v0004
created_at: 2026-07-12T14:34:15+09:00
source: P5.REVIEW
summary: P5: browser-only static-search boundary vs local FastAPI hybrid — same corpus, two implementations by deployment target
previous: v0003_p4_sqlite-vec_rrf_seam_consumed_as_hybrid_semantic_search
---

# Architecture

## Status

Both tracks are implemented (Track 2 the DB-backed document API, Track 1 public GitHub Pages publishing). This doc records the stable system shape. As of P4 the previously-documented `sqlite-vec`/RRF extension seam is **consumed**: hybrid semantic search is live, reusing changple5's Gemini embedding setup, with the single-worker invariant untouched. As of P5 the search *boundary* is explicit: the deployed static site searches **entirely in the browser** and is fully decoupled from the local FastAPI hybrid — same corpus, two independent search implementations chosen by deployment target.

## System Shape

Two containers run side by side over **one** bind-mounted repo:

- **`kb`** — the MkDocs Material viewer (host 8765, repo mounted at `/docs`), auto-nav from the `docs/` tree.
- **`api`** — the FastAPI read/write document service (host 8766, repo mounted at `/repo`), single uvicorn worker.
- **Persistence**: `docs/` markdown is the **canonical** store; SQLite (`data/kb.sqlite3`, FTS5, WAL) is a **disposable projection** rebuilt from files by reindex.

The shared bind mount is what lets a write on the API (8766) live-reload on the viewer site (8765) within ~1s.

## API-Owns-Writes Flow

A single `POST /api/documents`, under one in-process write lock:

1. validate the convention inputs;
2. write `docs/<project>/<YYYY-MM-DD>-<slug>.md` with byte-exact frontmatter;
3. insert the Recent bullet in `docs/index.md` (marker → `## Recent` heading → append ladder);
4. upsert the DB row;
5. make a **scoped** git commit — `git add` only the two touched paths (**never `-A`**), **never push**.

A failed commit **never rolls back** the file/DB (`committed:false`); `docs/` stays canonical and `POST /api/reindex` reconciles any drift (manual edits, API-down fallback writes, git resets).

## Boundaries / Constraints

- **Single-writer**: one uvicorn worker + one in-process lock — never scale workers (WAL gives read concurrency).
- **Auto-nav preserved**: `mkdocs.yml` has no `nav:` / `strict:` key; the viewer builds its sidebar from the `docs/` tree.
- **Optional bearer auth** on mutating endpoints only (`KB_API_TOKEN`).
- **This repo never edits the `bootstrap_agentic_workspace` repo.**
- **Two search implementations, one corpus (P5)** — see below.

## Search Boundary: browser-only static search vs. the local hybrid (P5)

The knowledge corpus (`docs/`) is searched by **two independent implementations,
selected by deployment target** — they share the source content but no runtime:

- **Published GitHub Pages site (Track 1) — browser-only.** Search runs entirely
  client-side: mkdocs-material's lunr search, configured `plugins.search: lang:
  [en, ko]`, with the `lunr.ko` (Korean trimmer/stopwords) + `lunr.multi` packs
  bundled into the static build from the pinned 9.7.6 image. The static index
  (`site/search/search_index.json`) and worker are the whole system — **no backend
  call**. Korean/CJK matching is achieved by Material's typeahead trailing-wildcard
  riding Korean eojeol spacing (a `관련` query prefix-matches indexed `관련해`), not
  by a segmenter. This is the *only* search the deployed site has; it never
  depends on `server/`.
- **Local FastAPI service (Track 2) — server-side hybrid.** `POST /api/search`
  runs BM25 (SQLite FTS5) + recency + Gemini-embedding cosine fused via RRF, with
  query-time CJK prefix expansion (`build_match_query`). It runs only against the
  local DB behind the API and is **never reachable from the published static
  site** — a static Pages host cannot call it.

The decoupling is deliberate: the deployed site must work with zero backend, and
the richer hybrid stays a local/SaaS-someday capability. The same `docs/` corpus
feeds both — the API reindexes from files; mkdocs builds its index from the same
files — but a change to one search path never affects the other.

## Extension Points

- **Hybrid semantic search (delivered P4):** the `sqlite-vec`/RRF seam in `server/search.py` is now consumed. Embeddings come from Gemini (`server/embeddings.py`, reusing changple5's `google-genai` convention), are cached by content hash in a plain `document_embeddings` BLOB table (the local venv Python can't load SQLite extensions), and a Python cosine ordering is fused with keyword ranking via RRF. The seam stays **upgrade-ready** — vectors are keyed by `doc_id`, so adopting `sqlite-vec` later touches only `db.py` + `search.py`'s cosine loop; the fusion, signals, and `mode` logic are unaffected. Embeds happen in-request (best-effort, outside the write lock) or at reindex — no background workers, so the single-worker invariant holds. With no key, search degrades gracefully to BM25-only.
- A future personal web UI built on the read API (the P4 aggregations `GET /api/tags`/`GET /api/projects` and `related` cross-links are groundwork for it and the P6 knowledge graph).
- **SaaS-someday** is noted and the architecture is kept from precluding it (out of scope for now).

## Roadmap

- **Track 1 (GitHub Pages publishing) — live and redesigned (P3 → P5)**: published at <https://leetusik.github.io/knowledge/>; P5 added the operator-designed visual system and browser-only CJK search. Deploys stay on the operator's manual `git push`, now gated by `scripts/site_smoke.py`.
- **P6 — Obsidian-like knowledge graph** (not built here): the P4 `related:` forward-edge frontmatter is the groundwork; P5 left graph/backlink work untouched for P6 to consume.
- **P7 — `/explain` as a Claude Code plugin**: the plugin lives in this knowledge repo; the bootstrap repo then retires its embedded `/explain`.
- **`/explain` consumer**: the `/explain` skill (in `bootstrap_agentic_workspace`) becomes the API's client, POSTing documents instead of writing files — delivered via a prepared handover prompt in that other repo (operator action, never edited from here).
- **SaaS-someday** remains noted; the architecture is kept from precluding it (the browser-only static-search boundary keeps the deployed site backend-free without foreclosing a hosted hybrid later).
