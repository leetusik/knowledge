---
doc_id: architecture
version: v0002
created_at: 2026-07-02T16:05:54+09:00
source: P2.REVIEW
summary: Track 2 two-container shape over shared bind-mounted repo
previous: v0001_bootstrap
---

# Architecture

## Status

Track 2 (the DB-backed document API) is implemented. This doc records its stable system shape. Track 1 (public GitHub Pages publishing) is pending as P3.

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

## Extension Points

- Hybrid search: `sqlite-vec` embeddings + RRF fusion in `server/search.py` (clean seam, no embeddings this phase).
- A future personal web UI built on the read API.

## Roadmap

- **P3 — Track 1 (GitHub Pages publishing)**: the remaining track; deploys stay on the operator's manual `git push`.
- **`/explain` consumer**: the `/explain` skill (in `bootstrap_agentic_workspace`) becomes the API's client, POSTing documents instead of writing files — delivered via a prepared handover prompt in that other repo (operator action, never edited from here).
