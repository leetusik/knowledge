# Phase P1: Bootstrap Intake

_Intent: see [intent.md](intent.md)._

## Objective

Capture the first real task, create versioned durable docs, and replace this placeholder phase with concrete work.

## Context

Initial bootstrap phase. Use `P1.DECOMP` to create concrete implementation slices before coding starts.

## Decomposition

**Breakdown: DECOMP → REVIEW only — zero middle slices.**

Rationale: P1's objective (capture the first real task, create versioned durable docs, replace this placeholder with concrete work) is already substantively met. The first real operator task — the two-track knowledge-store plan — was captured through proper phase creation into two confirmed, clarified phases:

- **P2 — Track 2: DB-backed document API** (`works/phases/active/P2/intent.md`)
- **P3 — Track 1: GitHub Pages publishing** (`works/phases/active/P3/intent.md`)

Both phases explicitly record the operator decision *"Placeholder P1? — Leave untouched; real work starts at P2."* No implementation work remains inside P1's scope: the intake is done and the concrete work lives in P2/P3. The only thing left for P1 is to record that intake in this notebook so **P1.REVIEW** can consolidate the two-track decision into the durable docs (currently all placeholder `v0001_bootstrap`). Hence no `new-slice` calls were made.

## Findings & Notes

**Intake evidence (durable) — the first real operator task, captured as P2/P3.**

- **Two-track knowledge-store plan** (single operator request, split by consumption track):
  - **Track 1 — `docs/` markdown tree → public GitHub Pages site** (P3). The existing MkDocs Material tree is published via `.github/workflows/pages.yml` to `https://leetusik.github.io/knowledge/`.
  - **Track 2 — SQLite + FTS5 document store behind a FastAPI service** (P2). Compose service `api` on host port 8766, repo bind-mounted; DB at `data/kb.sqlite3` (gitignored, disposable, rebuilt from files). BM25 keyword search now with a clean `sqlite-vec` extension point for later hybrid search. Powers a future personal web UI (web UI itself out of scope).
- **Key operating decisions (durable) from the confirmed intents:**
  - **The API owns the write path**: a POST creates the `docs/<project>/<date>-<slug>.md` file with convention-exact frontmatter, inserts the Recent marker bullet in `docs/index.md`, upserts the DB row, and makes a scoped git commit itself (stages only touched files, never `-A`; never pushes).
  - **`docs/` stays canonical**; `POST /api/reindex` rebuilds the DB from files and reconciles any drift (manual edits, API-down fallback writes, git resets).
  - **Deploys happen only on the operator's manual `git push`** — the `/explain` skill and the P2 API commit locally but never push.
  - **The `/explain` skill (in the bootstrap_agentic_workspace repo) becomes the API's client** — it will POST documents instead of writing files. Updating that skill happens in the *other* repo via a prepared handover prompt; **this repo's phases must never edit the bootstrap repo.**
  - **Real work starts at P2**; P1 is left untouched as intake-only.
- **Pointer — operator-approved detailed plan:** a fully detailed implementation plan exists at `~/.claude/plans/make-up-phases-for-precious-fairy.md` (SQLite DDL sketch, exact API contract with JSON examples, Dockerfile/compose details, edge-case handling, verification steps, and the self-contained `/explain` handover prompt). **P2.DECOMP should mine it**; P3's CI details are in its "Phase 5 — GitHub Pages CI" section.
- **[P1.REVIEW close-out]** Review **passed**: `validate` clean, notebook consistent with P2/P3 intents, objective met. Consolidated the two Doc impact notes into `decisions/v0002_two-track_knowledge_store_plan` and `product/v0002_personal_knowledge_base_with_two_consumption_tracks`; `rebuild-docs` refreshed `docs/current`.

## Doc impact

_Durable-truth changes for P1.REVIEW to consolidate into new doc versions (all docs are currently placeholder `v0001_bootstrap`)._

- **`decisions`** — Record the two-track knowledge-store plan and its operating decisions as durable truth: Track 1 (`docs/` → public GitHub Pages), Track 2 (SQLite+FTS5 store behind FastAPI, `sqlite-vec` extension point later); API owns the write path (file + Recent marker + DB upsert + scoped git commit, never pushes); `docs/` canonical with `/api/reindex` as reconciliation; deploys only on the operator's manual `git push`; `/explain` becomes the API client and this repo never edits the bootstrap repo.
- **`product`** — Describe what this repo actually is: a personal knowledge base (MkDocs Material viewer, Docker) with two consumption tracks — a public GitHub Pages site (Track 1) and a DB/API for a future personal web UI with hybrid search (Track 2) — written to by the `/explain` skill from the bootstrap_agentic_workspace repo.

## Constraints

- Keep `works/backlog.md` lean.
- Store detailed slice context inside each slice folder.
- Create new doc versions for durable doc changes.
- Record the review with `review-phase`; phases stay in `active/` after passing and are archived manually later (`archive-all`, `rotate-backlog`, or `archive-phase`).

## Open Questions

-
