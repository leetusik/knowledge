# Handoff — job `06-library`, round `02-control-border` (slice P29.S6, driven by P30.S1)

brief: waves/P30.S1/brief.md

new visual direction: no

critique: critic

This round supersedes the signed `01-library` (signed 2026-10-20 on "accept"). The canvas is edited in
place. **Every board and every element stays as signed except the item below.** No board was edited by the
operator since the signoff (read back on 2026-10-21: every board is byte-identical to the signed
snapshot).

## Scope: C11, the library's control borders at 3:1

- **The defect**, from `jobs/06-library/rounds/01-library/critique-01.md` C11:
  - the system's `kb-border-strong` borders the grouping control and the secondary buttons;
  - it measures 1.58:1 on the surface (1.56 dark, 1.64 sepia), under the 3:1 floor for the boundary of a
    UI control.
  - The pressed state adds a fill and a 4.8:1 inset ring, so state never rests on the border alone. The
    resting boundary is still under 3:1.
- **The controls in scope:**
  - the grouping control ("By project / By subject");
  - the secondary buttons, including "Clear all reading data" and its confirmation's buttons;
  - any other bordered control on this canvas whose boundary is the only cue to its extent. Name each one.
- **Out of scope:** structural hairlines are not controls and stay. These are row rules, card edges and
  dividers.
- **What to draw:** a ≥ 3:1 resting boundary for those controls in light, dark and sepia (the library has
  no sepia of its own today, so measure where the canvas draws one), with a measured contrast table in
  `result.md`. Keep hover, pressed and focus distinct.
- **The scope choice, posed back (Q1):**
  - (a) a library-scoped role, which changes only the library's controls;
  - (b) raising the `kb` token itself, which would widen the change to every console page that uses it.
    Deferred jobs D44 (the app shell under large text) and D45 (the `kb` sync after P30) own the console
    side.

  Draw (a) unless you find a reason it cannot hold, and log (b)'s trade-off.
- **Wave seam:** `01-reader` draws the same 3:1 boundary for the reader's controls in this wave. Use the
  same value where the library's grounds allow it. You cannot read that job's live canvas, so state the
  value you drew in `## Build`. The critic compares the two, and any mismatch goes to the operator as a
  wave choice.
- **States to reach:** the existing presets suffice. Add one only if a control's rest, hover, pressed and
  focus states are not all reachable.
- **Checks:**
  - every in-scope control measures ≥ 3:1 at rest in each theme, and the table shows the numbers;
  - no structural hairline changed;
  - the shell's structure is untouched.

## Not this job

- `01-reader` (this wave): C07 and the reader's controls.
- `05-annotations` (this wave).
- `library` C04 (the shell's topbar under large text): deferred job D44, not this round.
- Every other library item: signed, locked.

## Links

No new destinations.

## The required output

- The canvas tree passing `design-check 06-library`.
- One `result.md`:
  - the verdict block, with `open_items:`;
  - a `## Summary` of 1 KB or less;
  - a `## Build` that holds only this round's delta on the signed round's build prompt, with the contrast
    table and the role's values.
