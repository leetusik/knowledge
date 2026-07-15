# Plan — P1.REVIEW (phase review + doc consolidation)

## Situation

P1 "Bootstrap Intake" decomposed to DECOMP → REVIEW with **zero middle slices**: the intake it existed for already happened (phases P2/P3 captured the two-track knowledge-store plan with confirmed intents). `P1.DECOMP` is done; `works/phases/active/P1/phase.md` carries the intake evidence and two **Doc impact** notes (`decisions`, `product`) queued for this review. All durable docs are still placeholder `v0001_bootstrap`.

You are the review slice: validate the phase as a whole, review it against its objective, and — only on a passing review — consolidate the Doc impact notes into new durable-doc versions. You write only docs (plus your `result.md` and a `phase.md` note) — never source code.

## Your job

1. **Validate the phase's slices together.** P1 has one completed slice (DECOMP; it recorded no per-slice validation commands). Run `python3 scripts/workflow.py validate`; confirm `P1/slices/` holds exactly `P1.DECOMP` (done, `result.md` present) and `P1.REVIEW`; confirm `phase.md`'s Decomposition / Findings & Notes / Doc impact sections are filled and consistent with `works/phases/active/P2/intent.md` and `works/phases/active/P3/intent.md`.
2. **Review against the objective** (see `P1/intent.md`): "capture the first real task" → satisfied by P2/P3's confirmed intents; "create versioned durable docs" → satisfied by your consolidation below; "replace this placeholder phase with concrete work" → satisfied because the concrete work lives in P2/P3 by explicit operator decision ("real work starts at P2").
3. **On pass, consolidate the Doc impact notes:**
   - `python3 scripts/workflow.py doc-new-version --doc decisions --summary "Two-track knowledge store plan" --source P1.REVIEW`, then edit the printed `edit_path` (`docs/versions/decisions/v0002_*.md`): replace the placeholder body with a real decisions doc containing one **accepted** ADR entry — the two-track knowledge store: Track 1 = `docs/` markdown tree → public GitHub Pages (P3); Track 2 = SQLite + FTS5 document store behind FastAPI (compose service `api`, host port 8766, DB `data/kb.sqlite3` gitignored/disposable, `sqlite-vec` extension point for later hybrid search) (P2). Alternatives considered: Postgres + pgvector — rejected per P2 intent clarifications. Consequences: the API owns the write path (file + Recent marker in `docs/index.md` + DB upsert + scoped git commit, never `-A`, never pushes); `docs/` stays canonical with `POST /api/reindex` as reconciliation; site deploys happen only on the operator's manual `git push`; the `/explain` skill becomes the API's client; this repo never edits the bootstrap_agentic_workspace repo. Source: P1.REVIEW (intake evidence in P1 `phase.md`, P2/P3 `intent.md`).
   - `python3 scripts/workflow.py doc-new-version --doc product --summary "Personal knowledge base with two consumption tracks" --source P1.REVIEW`, then edit `docs/versions/product/v0002_*.md`: replace placeholders with real content — Summary (personal knowledge base: MkDocs Material viewer run via Docker; educational explainer documents written by the `/explain` skill from the bootstrap_agentic_workspace repo); Target users (the operator; coding agents writing via `/explain`); Problem (knowledge scattered across conversations/repos, no durable, browsable, searchable home); Goals (publish `docs/` publicly via GitHub Pages; DB-backed read/write/search API to power a future personal web UI with hybrid search); Non-Goals for Now (the web UI itself, embeddings pipeline, editing the bootstrap repo); keep the existing Terminology section.
   - Run `python3 scripts/workflow.py rebuild-docs` after editing (the engine's auto-snapshot ran before your edits, so `docs/current/` must be refreshed).
   - Never touch `v0001_*` files; never hand-edit `docs/current/*.md`.
4. **Write `result.md`** in this slice folder: review findings, verdict, doc versions created. **Append one close-out line** to `phase.md` → Findings & Notes (e.g. review passed, docs v0002 consolidated).

## Constraints

- You never commit; you never run `review-phase`, `start-slice`, `finish-slice`, or any status transition — the orchestrator records your verdict.
- `doc-new-version` is permitted for you (review slice only). Write only docs + your slice/phase notes.
- If validation or the objective check fails, do NOT create doc versions; return `review_verdict: changes_requested` (with proposed fix slices) or `blocked` (with the impediment) instead.

## Verification (for your verdict)

- `python3 scripts/workflow.py validate` passes.
- `python3 scripts/workflow.py docs` shows `decisions` and `product` latest = `v0002_*`; `docs/current/decisions.md` and `docs/current/product.md` contain the new bodies.
- Keep both new docs tight — durable truth, not prose sprawl.
