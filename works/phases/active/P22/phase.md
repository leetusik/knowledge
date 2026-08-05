# Phase P22: Graph label focus

_Intent: see [intent.md](intent.md)._

## Objective

Stop painting every doc title on the graph; show a title only for the clicked/selected node (hover tooltip stays), replacing the zoom-ladder behavior that saturates all labels.

## Context

All graph label behavior lives in one client component, `web/src/app/(app)/graph/graph-canvas.tsx`
(1703 lines — a faithful port of the docs' `graph.js` canvas engine). It is rendered by both
`web/src/app/(app)/graph/page.tsx` (member view) and `web/src/app/(public)/graph/[org]/page.tsx`
(public/org view), so a single-file change covers both surfaces.

## Decomposition

| Slice | Name | Kind | Risk | Order | Depends on |
| --- | --- | --- | --- | --- | --- |
| `P22.S1` | Show labels only for the selected node | feature | high | 10 | `P22.DECOMP` |

**Rationale.** One implementation slice suffices: the change is one file and one concern —
rewrite `labelTarget()` so canvas label alpha is driven by selection instead of the zoom
ladder, and retire/neutralize `ladder()`. Splitting it would only add handoff cost.

Not a design phase: the operator specified the exact behavior (labels only on the clicked
node, tooltip stays) and no new visual language is introduced — hence no `co-work` slice and
a single decomposition pass.

Risk `high` (→ `slice-executor-high`) even though the diff is small: it edits behavioral
logic inside a large canvas engine whose alpha pipeline feeds node dimming, halo, ring, and
edge drawing, and a careless edit there degrades the whole view.

**P22.S1 scope**
- Rewrite `labelTarget()` (`:852`) so a doc/missing label targets 1 only for the selected node
  (see the open question below on hover/drag), 0 otherwise.
- Remove or neutralize `ladder()` (`:849`) — nothing else calls it.
- Leave node alpha (`aT` in `stepAlphaLabelView`, `:902`), `computeKeep()`, halo, ring, and
  edge-activation logic untouched.
- Leave the DOM hover tooltip (`updateTooltip()`, `:1145`) untouched.
- Update the file-header comment block (`:11–34`) which advertises "the quiet-label ladder"
  as part of the ported draw grammar.

## Findings & Notes

_Durable findings and cross-slice notes; `DECOMP` seeds this, and each slice appends when it finishes._

### Label pipeline (verified against the code, 2026-08-05)

1. `currentFocus()` (`:836`) = dragged node id > `hoverId` > `selectedId`, filtered for
   existence and hidden state.
2. `computeKeep(focus)` (`:842`) = `neighborhood(focus)` when focused, else the active
   project lens (`projectKeep`), else `null`. This same `keep` map drives **node dimming**
   (`aT = keep ? (keep[n.id] ? 1 : T.dim) : 1`, `:902`) — out of scope for P22.
3. `labelTarget(n, keep, focus)` (`:852`) currently:
   - `keep && !keep[n.id]` → 0
   - `focus && keep` → **1 for every node in the focus neighborhood** (this is why hovering
     one node lights up a cluster of titles)
   - doc → `keep ? 1 : ladder()`; missing → `ladder() * 0.9`; tag → 0
   - `ladder()` = `clamp((displayZoom() - 1.1) / 0.25)` → every doc title saturates once
     display zoom passes ~1.35× fit.
4. `stepAlphaLabelView()` (`:895`) eases the target into `n.la`; `frame()` (`:970–975`) draws
   a label when `n.al * n.la ≥ 0.02`, via `drawLabel()` (`:1094`).

So the whole label-visibility policy is expressible in `labelTarget()` alone — no draw-order
or `drawLabel()` change is needed.

### Tag labels

Tag nodes already return 0 from the type branch; they only ever get labeled through the
`focus && keep` rule. Selected-only labeling therefore also quiets tag labels on hover,
which is consistent with the intent.

### Hover tooltip is a LOW-ZOOM fallback, not a general hover affordance

**This corrects a premise in `P22.DECOMP/plan.md`** ("the DOM tooltip already covers hover").
`updateTooltip()` (`:1145`) bails out unless `displayZoom() < 0.6`:

```
const lowZoom = displayZoom() < 0.6;
if (!n || !lowZoom || isHidden(n)) { elTooltip.hidden = true; return; }
```

It exists precisely *because* canvas labels are unreadable when zoomed out. At normal/high
zoom there is **no** hover tooltip — today the ladder's canvas labels serve that role. A
strict "selected node only" rule therefore leaves hover with no title at all above 0.6× zoom.
Clicking still surfaces the title in the info panel (`select()` → `openPanel()`, `:1290–1296`),
so nothing becomes unreachable, but hover-to-identify would be gone.

### Selection already exists

`selectedId` (`:334`), `select()`/`deselect()` (`:1290–1303`), tap-to-select in `endDrag()`
(`:1506`), Escape deselects, and selection is restored on remount (`:1631`). P22.S1 needs no
new interaction — only a new label rule keyed off state that is already there.

## Constraints

- The hover tooltip (`updateTooltip()`) stays exactly as-is.
- Node dimming / `computeKeep()` neighborhood behavior stays as-is — P22 changes **label
  alpha only**, not node alpha, halo, ring, or edge activation.
- Do not hand-edit `docs/current/*.md`; if this phase changes durable truth, append a
  "Doc impact" line below and let `P22.REVIEW` consolidate.
- No new dependency and no new interaction affordance; the change should stay inside
  `graph-canvas.tsx`.

## Open Questions

- **Does the hovered/dragged node earn its own canvas label, or strictly the selected node
  only?** P22.S1 decides and records the answer here. Given the finding above (no tooltip
  above 0.6× zoom), the DECOMP recommendation is: label target 1 for `selectedId` **and** for
  `currentFocus()` — i.e. the single hovered/dragged node itself, never its neighborhood —
  and 0 for everything else. That kills the "wall of titles" the operator complained about
  (at rest, at most one title is painted) while keeping hover-to-identify at normal zoom. If
  the operator wants the literal reading ("only the clicked one"), drop the focus term — a
  one-token change — and flag it for operator validation at the review.

## Doc impact

_One line per durable-truth change; `P22.REVIEW` consolidates these into doc versions._

- (none yet)
