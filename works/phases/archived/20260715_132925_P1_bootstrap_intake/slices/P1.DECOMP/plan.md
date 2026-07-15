# Plan — P1.DECOMP (decompose phase)

## Situation

P1 "Bootstrap Intake" is the installer's placeholder phase; its `intent.md` says "no operator request captured yet." Since then the real work was captured as two proper phases with confirmed intents:

- **P2 — Track 2: DB-backed document API** (`works/phases/active/P2/intent.md`)
- **P3 — Track 1: GitHub Pages publishing** (`works/phases/active/P3/intent.md`)

Both record the operator decision: *"Placeholder P1? — Leave untouched; real work starts at P2."* The operator has now confirmed (this session): close P1 out through its own DECOMP → REVIEW, then run P2. P1's objective — "capture the first real task, create versioned durable docs, and replace this placeholder phase with concrete work" — is already substantively met by P2/P3's creation; what remains is to record that in the phase notebook so P1.REVIEW can consolidate the two-track decision into the durable docs (currently all placeholder `v0001_bootstrap`).

## Your job (decomposition slice)

Decide and record the slice breakdown for P1. The intended outcome, unless you find evidence otherwise:

1. **Create no middle slices.** Intake already happened — P2 and P3 exist with confirmed, clarified intents. There is no implementation work left inside P1. (You may run `new-slice` if you genuinely find remaining P1-scoped work; the expectation is you won't.)
2. **Update `works/phases/active/P1/phase.md`:**
   - **Decomposition** section: the breakdown decision (DECOMP → REVIEW only, zero middle slices) and the rationale (first real task captured as P2/P3 via phase creation; nothing left in P1 scope).
   - **Findings & Notes** section: the durable intake evidence —
     - The two-track knowledge-store plan: Track 1 = `docs/` markdown tree published as a public GitHub Pages site (P3); Track 2 = SQLite + FTS5 document store behind a FastAPI service (compose service `api`, host port 8766) for a future personal web UI with hybrid search (P2).
     - Key operating decisions from the intents: the API owns the write path (file + Recent marker + DB upsert + scoped git commit); `docs/` stays canonical with `/api/reindex` as reconciliation; deploys happen only on the operator's manual `git push`; the `/explain` skill (bootstrap_agentic_workspace repo) becomes the API's client — this repo never edits that repo; real work starts at P2.
     - Pointer: a fully detailed, operator-approved implementation plan exists at `~/.claude/plans/make-up-phases-for-precious-fairy.md`; P2.DECOMP should mine it (SQLite DDL, exact API contract, Dockerfile/compose, edge cases, verification, handover prompt).
   - **Doc impact** — add a `## Doc impact` section (or append under Findings if you prefer a single list) with one-liners for P1.REVIEW to consolidate:
     - `decisions` — record the two-track knowledge-store plan and its operating decisions as durable truth.
     - `product` — describe what this repo actually is: a personal knowledge base (MkDocs Material viewer, Docker), two consumption tracks (public Pages site, DB/API for a future web UI), written to by the `/explain` skill.
3. **Write `result.md`** in this slice folder: what you decided, why zero middle slices, and what you handed to P1.REVIEW.

## Constraints

- You never commit and never change slice/phase status; the orchestrator does both.
- `new-slice` is permitted for you (decomposition slice) but expected to go unused here.
- Do not touch source code, `docs/`, or other phases' folders (reading their `intent.md` is fine and expected).
- Do not pre-fill any other slice's `plan.md` (including P1.REVIEW's).
- Keep `phase.md` additions tight and durable — this is the phase notebook later slices read.

## Verification (for your verdict)

- `python3 scripts/workflow.py validate` passes (state integrity).
- `works/phases/active/P1/slices/` still contains only `P1.DECOMP` and `P1.REVIEW` (unless you deliberately created slices — explain why in that case).
- `phase.md` Decomposition + Findings + Doc impact filled; `result.md` written.
