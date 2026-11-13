---
doc_id: decisions
version: v0003
created_at: 2026-07-02T17:04:53+09:00
source: P3.REVIEW
summary: GitHub Pages generator: mkdocs-material 9.7.6 re-confirmed over Hugo
previous: v0002_two-track_knowledge_store_plan
---

# Decisions

## Status

Two accepted decisions are recorded: the two-track knowledge store, and the GitHub Pages generator (mkdocs-material 9.7.6, re-confirmed over Hugo).

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

## Superseded Decisions

- None yet.
