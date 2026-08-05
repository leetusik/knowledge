# Plan — P22.S1 "Show labels only for the selected node"

## Context

The graph currently paints every doc title once display zoom passes ~1.35× fit (the "quiet-label ladder"), and any hover/filter lights up a whole neighborhood of titles — the "wall of titles" the operator objected to. P22's intent: show a title only for the clicked/selected node; the hover tooltip stays. All label policy lives in `labelTarget()` in `web/src/app/(app)/graph/graph-canvas.tsx` (shared by the member and public/org graph pages), so this is a one-file change. Phase context: `works/phases/active/P22/phase.md` (verified label-pipeline findings) and `intent.md`.

## Decision on the open question (recommendation, approved with this plan)

`phase.md` records that the DOM tooltip is a **low-zoom fallback** (`updateTooltip()` bails unless `displayZoom() < 0.6`), so a strictly-literal "selected only" rule would leave hover with no identification at normal zoom. **Recommended rule (implement this):** label target 1 for the **selected node** and for the **single hovered/dragged node** (`currentFocus()` already resolves drag > hover > selected), never a neighborhood; 0 for everything else. At rest at most one title is painted — selected-only when idle, and hover still identifies a node transiently. Trade-off: this is slightly more than the literal reading ("only clicked one"); if the operator wants strictly selected-only, the hover term is a one-token drop — flag at review for operator validation.

## Change (single file: `web/src/app/(app)/graph/graph-canvas.tsx`)

1. **Rewrite `labelTarget(n, keep, focus)` (`:852–862`)**: return 0 when `keep && !keep[n.id]` (a lens-dimmed node never keeps a label); return 1 when `n.id === selectedId || n.id === focus`; else 0. This drops the `focus && keep → 1` neighborhood rule and the zoom ladder in one move. Tag and missing nodes follow the same rule (a selected/hovered tag may show its muted label — consistent with the intent; tags otherwise stay quiet as today).
2. **Delete `ladder()` (`:849–851`)** — `labelTarget` was its only caller.
3. **Update the header comment block (`:11–34`)**: replace the "quiet-label ladder" phrase with a note that P22 replaced ladder labels with selected/hovered-node-only labels (a deliberate deviation from the faithful `graph.js` port).
4. Touch nothing else: `stepAlphaLabelView` node alpha (`aT`), `computeKeep()`, halo/ring/edge drawing, `drawLabel()`, and `updateTooltip()` all stay as-is. The existing `n.la` easing gives the fade-in/out for free.

## Constraints (from `phase.md`)

- Hover tooltip untouched; node dimming/keep untouched — label alpha only.
- No new dependency, no new interaction affordance; stay inside `graph-canvas.tsx`.
- Record the answer to the open question in `phase.md` (Open Questions → resolved), and append a one-line **Doc impact** note to `phase.md` (the fullstack docs describe the graph's label ladder — durable truth changes; `P22.REVIEW` consolidates). Never run `doc-new-version`.

## Executor notes

- Append cross-slice notes to `phase.md` (resolved open question, any surprises), write `result.md`, return the structured verdict. No commits, no status transitions.

## Verification

- `cd web && npm run typecheck && npm run lint` (scoped to confirm no type/lint regressions; skip `next build`).
- Static behavior check by reading the new `labelTarget`: idle+no selection → all label targets 0; selection → exactly that node 1; hover → hovered node 1; project lens excludes → 0.
- No new test files (per workspace test-minimalism rule); behavioral validation happens at `P22.REVIEW` and operator eyeball.
