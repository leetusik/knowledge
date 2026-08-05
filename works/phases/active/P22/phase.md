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

### P22.S1 implementation notes (2026-08-05)

- `labelTarget()` rewritten as above; `ladder()` deleted (it had no other caller).
  `displayZoom()` survives — `updateTooltip()` (`:1148`) and the zoom controls still use it,
  so nothing else went orphaned. Zoom no longer influences canvas labels at all.
- The file-header comment block now carries an explicit **"DELIBERATE DEVIATION from the
  port"** paragraph replacing the "quiet-label ladder" phrase, so the next reader does not
  mistake the missing ladder for port drift from `docs/javascripts/graph.js`.
- Untouched exactly as constrained: node alpha `aT` in `stepAlphaLabelView`, `computeKeep()`,
  `neighborhood()`, halo/ring/edge activation, `drawLabel()`, `updateTooltip()`. The change is
  label alpha only; `n.la` easing (`EASE_ALPHA`) still gives the fade in/out for free.
- Interaction subtlety worth knowing: when a node is selected with no hover, `currentFocus()`
  already returns `selectedId`, so `keep = neighborhood(selectedId)` — the surrounding cluster
  stays *undimmed* (unchanged P22 behavior) but now only the focused node is *titled*. Hidden
  nodes never reach the label pass (`frame()` `:971` skips them), so no guard was needed for a
  selected-then-hidden node.
- Both graph surfaces (member `/graph`, public `/graph/[org]`) render this one component, so
  the change lands on both with no second edit.

## Constraints

- The hover tooltip (`updateTooltip()`) stays exactly as-is.
- Node dimming / `computeKeep()` neighborhood behavior stays as-is — P22 changes **label
  alpha only**, not node alpha, halo, ring, or edge activation.
- Do not hand-edit `docs/current/*.md`; if this phase changes durable truth, append a
  "Doc impact" line below and let `P22.REVIEW` consolidate.
- No new dependency and no new interaction affordance; the change should stay inside
  `graph-canvas.tsx`.

## Open Questions

- **RESOLVED (P22.S1, 2026-08-05) — does the hovered/dragged node earn its own canvas label,
  or strictly the selected node only?** Answer: **the selected node AND the single
  hovered/dragged node** (`currentFocus()`), never a neighborhood. Implemented rule, the whole
  of `labelTarget()`:

  ```ts
  if (keep && !keep[n.id]) return 0;                    // lens/neighborhood-dimmed → no label
  if (n.id === selectedId || n.id === focus) return 1;  // selected + hovered/dragged only
  return 0;
  ```

  Rationale: the tooltip is a low-zoom fallback (`updateTooltip()` bails above 0.6× zoom), so
  a strictly-literal "selected only" rule would leave hover with no identification at normal
  zoom. At rest at most one title is painted, which is what the operator asked for.
  **Operator validation at review:** if the literal reading is wanted ("only the clicked
  one"), drop the `|| n.id === focus` term — a one-token change, no other edit needed.

## Doc impact

_One line per durable-truth change; `P22.REVIEW` consolidates these into doc versions._

- `frontend` (P22.S1): the **web app** `GraphCanvas` (`app/(app)/graph`, also serving
  `(public)/graph/[org]`) no longer follows the ported quiet-label ladder (Strategy A′: all
  doc titles fading in above ~110% fit zoom, hover lighting a whole neighborhood of titles).
  Labels are now selection-driven — a canvas title paints only for the selected node and the
  single hovered/dragged node, at most one at rest — a deliberate, documented deviation from
  the faithful `docs/javascripts/graph.js` port (the mkdocs-site graph itself is unchanged).
  Node dimming/lens, halo/ring/edge activation and the low-zoom hover tooltip are unchanged.
  Review to judge whether `experience` ("Read the map (quiet labels, Strategy A′)", `:154`)
  and `decisions` (the Strategy-A′ label lock, `:333`/`:955`) also need a version for the
  app-surface divergence.
  - **Consolidated at P22.REVIEW** into **four** versions: `frontend` v0012, `experience`
    v0013, `decisions` v0019, and `qa` v0012 (the fourth is the review's own call — see the
    review notes below).

## P22.REVIEW notes (2026-08-05)

**Verdict: `pass`.** Validation run together: `workflow.py validate` (green, before and after
consolidation), `web` `npm run typecheck` (exit 0), `npm run lint` (exit 0), and `npm test`
(**10 files / 69 tests**, added by the review as a regression net — it was not in the S1 plan).
The commit diff (`f82372e`) is exactly the header block + `ladder()` deletion + `labelTarget()`
rewrite; `grep -rn "ladder" web/src/` leaves only the two new comment mentions.

Durable notes for whoever touches the graph next:

- **`selectedId` is read live inside `labelTarget()`** — it is a `let` in the same engine
  closure (`:345`), not a React state capture, so the rule reacts to `select()`/`deselect()`
  without a re-render. Any future refactor that lifts selection into React state must keep the
  canvas reading a live value.
- **Correction to `P22.S1/result.md`:** the claim "still at most one at a time" while hovering
  is wrong. If the selected node sits **inside** the hovered node's neighborhood, `keep` passes
  it and **two** titles paint (hovered + selected). That is the right behavior — the selection
  should not lose its title because the pointer moved next door — and the header comment's "at
  most one **at rest**" is accurate. The consolidated docs state "one at rest, at most two in
  transit"; the historical `result.md` was left as written.
- **There is no port-parity gate** between `docs/javascripts/graph.js` and `graph-canvas.tsx`
  (`site_smoke.py` only asserts the mkdocs wiring; `plugin_parity.py`/`skills_parity.py` do not
  cover `web/`). Nothing in CI would catch a future "fix" that reinstates the ladder — the
  DELIBERATE DEVIATION paragraph in the component header is the only guard. Recorded in
  frontend + ADR D-P22-1.
- **The intent widening stands, but the operator decides.** The rule is one token wider than
  "only the clicked one" (the hovered/dragged node also titles), on the verified premise that
  `updateTooltip()` bails above 0.6× zoom. Rather than leave that call in a phase folder that
  archives, it is written into the **qa** doc's new manual mission as an explicit open call:
  drop `|| n.id === focus` for the literal reading, no other edit.
- **Why `qa` got a version (beyond the Doc impact line).** The qa doc's "Knowledge map" mission
  is headed P6 but reads as generic; leaving it alone would assert the now-wrong "quiet labels
  A′ / titles past ~110% zoom" expectation over the app map too. It is now scoped to the mkdocs
  surface, and a new *In-app graph label focus (P22)* mission carries the owed eyeball (idle map
  titleless at any zoom; click → one title; hover → one; hovering a selected node's neighbor →
  two, never a cluster; lens-excluded nodes stay titleless; dimming/ring/panel/tooltip
  unchanged).
- **Consciously not done:** no automated coverage for the label rule (canvas + rAF — the mission
  replaces it, per the workspace's test-minimalism rule), and no phase explainer (run
  `/explain` for P22 if one is wanted).
