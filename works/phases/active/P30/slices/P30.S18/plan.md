# P30.S18 — Diagrams II (`03-diagrams`)

## Goal

Draw the remaining diagram kinds, as signed:
- *Sequence*;
- *Stack*;
- *Timeline*;
- *Chart*: bar, line, and interval as `[low, high]` or `[low, median, high]`. Since F2, a chart is
  `type: "diagram"` plus `chart: bar|line|interval`.

Then complete *Every state* for all six kinds.

## Read first

- **`works/phases/active/P30/topics/surface-slice-rules.md`: binding.**
- The spec: `docs/reference/design/jobs/03-diagrams/rounds/01-diagrams/build-prompt.md` (the sections above, *Every state*, the
  strings and the values), `judge-01.md`, and the canvas `docs/reference/design/jobs/03-diagrams/rounds/01-diagrams/canvas/project/`.
- S17's diagram code and notes (`topics/notes-later.md`).
- `server/native/README.md`, the grammar for each kind.

## Approach

- Extend S17's server-side SVG drawing with the four kinds, reusing its frame, tones, label-fit and
  text-alternative machinery.
- Charts use a data-table text alternative, as signed.
- **Very-core test:** chart scale and interval geometry. That's the math only.

## Out of scope

- Quiz (S19).

## Dispatch

slice=P30.S18
phase=P30
kind=implementation
risk=low
attempt=1
route=mid
reason=kind implementation rated low
tier=mid
subagent_type=slice-executor-mid
model=sonnet
pass_model=yes
effort=high
pass_effort=yes
attribution=Claude Sonnet 5.5
explore_model=haiku
explore_effort=high
