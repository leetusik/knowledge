# Plan — P22.DECOMP (decompose phase P22 "Graph label focus")

## Context

P22's objective: stop painting every doc title on the graph; show a title only for the clicked/selected node (hover tooltip stays). Today `web/src/app/(app)/graph/graph-canvas.tsx` uses a "quiet-label ladder": `ladder()` (`:849`) saturates all doc labels once display zoom passes ~1.1–1.35× fit, and `labelTarget()` (`:852`) sets label alpha 1 for every kept node whenever any focus/filter is active. The operator wants labels only on the selected node.

This DECOMP slice creates the phase's middle slices (bare folders) and records the breakdown in `phase.md`. It writes no implementation code.

## Research findings (context for the executor)

- Label pipeline: `labelTarget()` → eased into `n.la` in `stepAlphaLabelView()` (`:895`) → `frame()` draws via `drawLabel()` when `n.al * n.la ≥ 0.02` (`:970–975`).
- Hover tooltip is a separate DOM overlay (`updateTooltip()`, `:1145`) — it must stay untouched.
- Selection exists: `selectedId`, `select()`/`deselect()` (`:1290–1298`), tap-select in `endDrag()`, Escape deselects, selection is restored on remount (`:1632`).
- `currentFocus()` (`:836`) = drag id > `hoverId` > `selectedId`; `computeKeep()` builds the neighborhood/project keep map that also drives node dimming — node dimming/keep behavior is out of scope; only label alpha changes.
- One shared component serves the member page and the public/org graph page — a single-file change covers both.

## Decomposition to create

This is not a design phase: the operator specified the exact behavior (selected-only labels, tooltip stays), and no new visual language is introduced — so no `co-work` slice and a single decomposition pass.

Proposed middle slice (executor may refine, but should stay minimal):

- **P22.S1 — "Show labels only for the selected node"** (`--kind feature --risk high --order 10 --depends-on P22.DECOMP`): replace the zoom-ladder/keep-saturation logic in `labelTarget()` so a label targets 1 only for the selected node (decide and note in `phase.md` whether the dragged/hovered node also earns its canvas label, given the DOM tooltip already covers hover); remove or neutralize `ladder()`; keep tooltip, dimming/keep, halo/ring drawing unchanged; update the file-header comment block (`:17`) that documents the quiet-label ladder. Risk `high` because it edits behavioral logic inside a 1700-line canvas engine, even though the diff is small.

One implementation slice suffices — the change is one file, one concern. The executor records the breakdown + findings in `phase.md` (seeding "Findings & Notes" with the pipeline facts above) and sets each slice's risk deliberately.

## Executor instructions (what the DECOMP executor does)

1. Read `phase.md`, `intent.md`, and skim the label code cited above to confirm the breakdown.
2. `python3 scripts/workflow.py new-slice --phase P22 --slice P22.S1 --name "Show labels only for the selected node" --kind feature --risk high --order 10 --depends-on P22.DECOMP` (bare folder — do not pre-fill its `plan.md`).
3. Fill `phase.md`: Decomposition section (slice table + rationale), Findings & Notes (label-pipeline facts, tooltip separation, shared-component note), any constraints (tooltip stays; dimming/keep untouched).
4. Write `result.md` for P22.DECOMP; return a structured verdict.

## Verification

- `python3 scripts/workflow.py validate` passes; `P22.S1` exists with `slice.json` only; `phase.md` records the breakdown.
