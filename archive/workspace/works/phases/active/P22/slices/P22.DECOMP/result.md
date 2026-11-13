# Result — P22.DECOMP

Decomposed phase P22 ("Graph label focus") into a single middle slice and seeded the phase
notebook. No implementation code was written.

## Slice created

```
python3 scripts/workflow.py new-slice --phase P22 --slice P22.S1 \
  --name "Show labels only for the selected node" \
  --kind feature --risk high --order 10 --depends-on P22.DECOMP
→ created slice P22.S1: works/phases/active/P22/slices/P22.S1
```

Bare folder — it holds only `slice.json`; its `plan.md` is left for the orchestrator to write
at the slice's turn.

## Confirming the plan's proposed breakdown

I read the cited code before accepting the single-slice judgment. The plan holds:

- The entire label-visibility policy is one pure function, `labelTarget()`
  (`web/src/app/(app)/graph/graph-canvas.tsx:852`), fed by `ladder()` (`:849`), eased in
  `stepAlphaLabelView()` (`:895`) and consumed in `frame()` (`:970–975`). Nothing else needs
  to change for selected-only labels — not `drawLabel()`, not draw order.
- `ladder()` has exactly one caller (`labelTarget`), so retiring it is self-contained.
- `GraphCanvas` is imported by both `web/src/app/(app)/graph/page.tsx` and
  `web/src/app/(public)/graph/[org]/page.tsx` — one file change covers member and public
  graph views; no second slice for the public surface.
- Selection plumbing (`selectedId`, `select()`/`deselect()`, tap-select, Escape, remount
  restore) already exists, so S1 adds no interaction.

So: one slice, `risk: high` (behavioral logic inside a 1703-line canvas engine whose alpha
pipeline also drives dimming/halo/ring/edges — small diff, real blast radius), no `co-work`
slice (the operator specified the behavior; no new visual language), single decomposition pass.

## Finding that corrects a plan premise

`plan.md` states "the DOM tooltip already covers hover". It does not, in general:
`updateTooltip()` (`:1148`) computes `const lowZoom = displayZoom() < 0.6;` and hides the
tooltip unless the view is zoomed **out** past that. The tooltip is a low-zoom fallback for
unreadable canvas labels; above 0.6× zoom hover shows nothing, and today's ladder labels are
what identify nodes there.

Consequence for P22.S1: a strictly literal "selected node only" rule removes hover-to-identify
at normal zoom (the title is still reachable by clicking — `select()` opens the info panel).
I did **not** decide this unilaterally; I recorded it as the phase's open question with a
recommendation (label the selected node **and** the single hovered/dragged node, never its
neighborhood — the neighborhood saturation in the `focus && keep → 1` branch is the actual
"wall of titles" the operator objected to). Dropping the focus term is a one-token change if
the operator prefers the literal reading.

## phase.md filled

`works/phases/active/P22/phase.md` now carries: Context (shared component, two consumers),
Decomposition (slice table + rationale + S1 scope with line references), Findings & Notes
(4-step label pipeline, tag-label behavior, the low-zoom tooltip finding, existing selection
plumbing), Constraints (tooltip untouched; dimming/keep/halo/ring/edges untouched; label
alpha only), the open question above, and an empty "Doc impact" list for `P22.REVIEW`.

## Validation

| Command | Outcome |
| --- | --- |
| `python3 scripts/workflow.py new-slice --phase P22 --slice P22.S1 ...` | pass — slice created |
| `ls -a works/phases/active/P22/slices/P22.S1` | pass — `slice.json` only, no pre-filled `plan.md` |
| `python3 scripts/workflow.py validate` | pass — "Workflow validation passed." |

## Deviations from plan.md

None in substance. The only departure is the corrected tooltip premise noted above: rather
than have S1 decide "given the DOM tooltip already covers hover", the question is recorded in
`phase.md` with the accurate zoom constraint and a recommendation.

## Doc impact

None — decomposition changed no durable truth.
