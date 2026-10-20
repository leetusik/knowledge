# Handoff — job `01-reader`, round `03-chapter-bar-and-border` (slice P29.S4, driven by P30.S1)

brief: waves/P30.S1/brief.md

new visual direction: no

critique: critic

This round supersedes the signed `02-revise` (signed 2026-10-20 on "everything looks good. moveon").
The canvas is edited in place. **Every board and every element stays as signed except the two items
below.** No board was edited by the operator since the signoff (read back on 2026-10-21: every board is
byte-identical to the signed snapshot).

## Scope: the two A5 items for this job

### 1. C07: the chapter bar under large text and on a narrow phone

- **The defect** (from `jobs/09-legacy-and-print/rounds/01-legacy-and-print/critique-01.md` C07 and P29's
  review): the signed bottom chapter bar (`ReaderBottom.dc.html`, mounted on Main, Reader and Widths) has
  labels that touch at 150% text and overprint at 200%. With the root font size at 200% on the 390 px
  phone, "Contents" (x 88–302) overprints "‹ Previous" (34–161) and "Next →" (270–356). At 150%,
  Previous ends at 120 and Contents begins at 115.
- **Second case:** below 320 px wide, "‹ Book" overprints "Display" in the signed top bar
  (`ReaderTop.dc.html`).
- **What to draw:** the chapter bar and the top bar at 150% and 200% text on the phone, and the top bar at
  320 px, with no overprint and no clipped label. Every target keeps ≥ 44 px, and the bar keeps its signed
  look at 100%. How it adapts (wrapping, dropping a word, a second row, abbreviating) is yours to propose,
  as one direction. Log the rule in `## Build` exactly enough to build without inventing.
- **States to reach:** add presets on the state bar for 150% and 200% text at 390 px, and for 320 px at
  100%, on each interactive Page that shows these bars.
- **Checks:**
  - at 200% on 390 px, no two labels of the chapter bar overlap, measured;
  - at 320 px, "‹ Book" and "Display" do not overlap;
  - at 100% at every viewport, the bars look exactly as signed.

### 2. A 3:1 control boundary for the reader's controls

- **The defect:** the signed reader's controls draw their boundary in `kb-border-strong`, which measures
  about 1.58:1 on `kb-surface` (light 1.58, dark 1.56, sepia 1.64). That is under WCAG 1.4.11's 3:1 for the
  visual boundary of a UI control.
- **The controls in scope:**
  - `rd-btn--secondary`;
  - the language switch's outline (`.rd-lang`);
  - the choice-option look the quiz draws in (`.rd-opt`, or whatever the signed reader names for it);
  - any other bordered control on this canvas whose boundary is the only visual cue to its extent. Name
    each one in `result.md`.
- **Out of scope:** structural `kb-border-strong` lines are not controls and stay. These are table rules,
  the quote rule, card and sheet edges, and swatch chips.
- **What to draw:** a control-boundary role, named for the reader (for example `--rd-control-edge`), that
  measures ≥ 3:1 against its ground in light, dark and sepia. Apply it to the controls above, and draw a
  measured contrast table in `result.md`. Keep the hover, pressed and selected states distinguishable from
  rest, at ≥ 3:1 where they rely on the boundary. Whether the role later becomes a `kb` token is the D45
  sync's call, not this round's: log it as a component gap.
- **Downstream:** `04-quiz` (C09, the option border) and `08-review` (item 12, the rating buttons) draw
  these signed reader parts in. They take the fix from this round in the build and are not redrawn in
  this wave. If you find a quiz or review board that would look wrong with the new role, name it in
  `open_items`, and the orchestrator opens a round on that job.
- **Checks:**
  - each control in scope measures ≥ 3:1 in each theme, and the table in `result.md` shows the numbers;
  - no structural hairline changed;
  - the signed hover, pressed, selected and focus states remain distinct.

## Not this job

- `05-annotations` (this wave): annotations 10 and the per-book list's back link.
- `06-library` (this wave): the library's control borders in the app frame. **Wave seam:** use one value
  for the 3:1 boundary where both jobs can, and `06-library` reads the value from your `result.md`
  (`## Build`). Write it there plainly.
- Every other reader item: signed, locked.

## Links

No new destinations. Every existing link keeps its signed target.

## Open questions, posed back

- **Q1.** How should the chapter bar adapt under 150–200% text: wrap, shorten the labels, or a second
  row? Draw the one you recommend and log the others with their trade-offs.

## The required output

- The canvas tree passing `design-check 01-reader`.
- One `result.md`:
  - the verdict block, with `open_items:`;
  - a `## Summary` of 1 KB or less: what changed, the departures, and the open items;
  - a `## Build` that holds only this round's delta on the signed `02-revise` build prompt, complete
    enough to build without inventing, with the contrast table and the boundary role's values.
