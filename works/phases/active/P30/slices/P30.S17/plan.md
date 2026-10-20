# P30.S17 — Diagrams I (`03-diagrams`)

## Goal

Draw the `diagram` block's flow and state kinds inside S14's diagram slot, as signed:
- *The frame in the slot*;
- *Size* (the drawing and the text sizes);
- *Faces and sizes inside a drawing*;
- *The tones*, including the svg classes, if S16 didn't land them;
- *Flow and state*: placement, node sizing, shapes, gaps, orthogonal edges, groups (lanes and layers), and
  self-loops;
- *Labels that do not fit*;
- *Korean*;
- *The text alternative*.

## Read first

- **`works/phases/active/P30/topics/surface-slice-rules.md`: binding.**
- The spec:
  - `docs/reference/design/jobs/03-diagrams/rounds/01-diagrams/build-prompt.md`, those sections plus *What it is*,
    *Canvas-only*, *Every state* (the flow and state rows), the strings and *Values P30 adds*;
  - `judge-01.md` and `result.md` for the rulings;
  - *Open calls*, which were signed as drawn;
  - the canvas `docs/reference/design/jobs/03-diagrams/rounds/01-diagrams/canvas/project/`, which holds the layout code the
    drafter used. Transcribe its placement and edge-routing logic. Don't invent another layout.
- `server/native/README.md`: the diagram grammar (nodes, edges, groups, kinds).
- `topics/notes-later.md` → *The render pipeline as shipped* (`kb-ch-diagram`, `data-kind`; S12's
  interim structured-text rendering, which this replaces for flow and state).

## Approach

- **Layout:** deterministic layout in TS, computed on the server (in the server component) into React SVG
  elements through the same safe mapping, with no `innerHTML`. Use the canvas's algorithm (placement,
  sizing, orthogonal edges, groups). If the canvas uses a library (for example dagre or elk), pin the same
  library. Otherwise port the canvas code.
- **Text alternative:** follow the signed design exactly. Keep S12's structured text, restyled, as the
  alternative where the design says so.
- **Very-core test:** only layout determinism, where the same source gives the same geometry. Verify the
  look live against the canvas boards.

## Out of scope

- Sequence, stack, timeline and chart (S18).

## Dispatch

slice=P30.S17
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
