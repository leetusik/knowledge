# P6.F2 — graph overlays cannot be hidden: `[hidden]` loses to the overlays' display rules

## Why (operator-reported, browser QA)

The operator loaded `/knowledge/graph/` in a real browser (the first human browser QA of
the map) and the loading overlay — "Laying out the map… 지도를 배치하는 중 — settles in
~0.6s." — **never disappears**. Root cause (diagnosed, verified in the committed CSS; this
is a LATENT S2 bug surfaced now, not a P6.F1 regression):

- `docs/javascripts/graph.js` hides overlays by setting the `hidden` attribute
  (`elEmpty.hidden = true` in `showEmpty('none')`; `elTooltip.hidden = true` when leaving
  low-zoom hover).
- The only rule honoring it is `docs/stylesheets/extra.css:794`
  `.kb-graph [hidden] { display: none; }` — specificity **(0,1,1)**.
- But three overlays carry their own author `display` at **(0,2,0)**, which OUTRANKS it:
  `.kb-graph .kb-graph-empty` (`display: grid`, extra.css:910), `.kb-graph .kb-graph-zoom`
  (`display: flex`), `.kb-graph .kb-graph-tooltip` (`display: inline-flex`).
- Consequence: the empty/loading layer (absolute, `inset: 0`, `z-index: 1`) stays painted
  over the canvas forever AND swallows every canvas pointer event (hover/drag/wheel feel
  dead; the legend/zoom/panel still work — they are `z-index: 2`). The tooltip, once shown
  at low zoom, can also never hide, and the empty zoom stack is visible as a border sliver
  before boot.

## The fix (exact, one hunk — no JS change)

In `docs/stylesheets/extra.css`, replace line 794:

```css
.kb-graph [hidden] { display: none; }
```

with:

```css
/* [hidden] must outrank the overlays' own display rules (.kb-graph .kb-graph-empty
   is (0,2,0) grid, zoom flex, tooltip inline-flex — all beat .kb-graph [hidden] at
   (0,1,1)), or JS can never hide them. */
.kb-graph [hidden],
.kb-graph .kb-graph-empty[hidden],
.kb-graph .kb-graph-zoom[hidden],
.kb-graph .kb-graph-tooltip[hidden],
.kb-graph .kb-graph-legend[hidden],
.kb-graph .kb-graph-panel[hidden] { display: none; }
```

(Each class+attribute combo is (0,2,1) and beats its (0,2,0) display rule. Legend and
panel have no own display rule today; they are included so a future display addition
cannot re-open this trap.)

Touch NOTHING else: no JS, no other CSS sections, no graph.md, no guard, no mkdocs.yml.

## Verification (lean)

1. `git diff --stat` shows exactly one file (`docs/stylesheets/extra.css`), one hunk.
2. Pinned venv (`pip install mkdocs-material==9.7.6`), `mkdocs build`; then confirm the
   built stylesheet carries the fix: `grep -c 'kb-graph-empty\[hidden\]'
   site/stylesheets/extra.css` → 1.
3. `python3 scripts/site_smoke.py` → expect exactly **1** violation, the KNOWN pre-existing
   `/Users/` prose leak in `docs/current/*` pages (out of scope here — the P6 re-review
   owns it; recorded in `phase.md`). Any OTHER violation → stop and escalate. All
   graph-related assertions must PASS.
4. If the compose `kb` server is already running (do NOT start/stop it):
   `curl -s http://localhost:8765/knowledge/stylesheets/extra.css | grep -c 'kb-graph-empty\[hidden\]'`
   → 1 (live-reload rebuilt). If the server is down, skip silently.
5. No browser here: final visual confirmation (overlay disappears after settle, canvas
   hover/drag/wheel work) is the operator's refresh — say so in result.md.

## Executor duties (contract)

- Apply the fix, run the verification, write `result.md` beside this plan.
- Append to `works/phases/active/P6/phase.md`: a short "P6.F2" section (the trap + fix,
  so later slices don't reintroduce it) and ONE Doc-impact line:
  - `qa` (P6.F2): operator browser QA found the graph overlays could never hide —
    `.kb-graph [hidden]` (0,1,1) lost to overlay display rules (0,2,0); fixed with
    class+attribute selectors (0,2,1) in §10c; JS untouched. Lesson: attribute-toggle
    visibility needs a specificity check against every rule that sets display.
- Never commit; never transition slice/phase status; no doc-new-version.
- Any surprise (the CSS lines don't match this plan, smoke shows a different violation,
  anything unexpected) → return `escalate` with findings; do not improvise.
