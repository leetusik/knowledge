# Critique 01: 06-library/02-control-border

- pass: 01
- mode: critic
- verdict: revise
- confidence: medium
- must_fix: 1 (part 1: 1, part 2a: 0)
- gaps: 0
- advisory: 1
- wave: none (no sibling named in the dispatch; the seam value is unchecked, see Not seen)
- escalate: C01
- preview: drafter's render read (`.preview/06-library/02-control-border/preview.json`), 145 states; no re-render
- standard: .claude/agents/design-drafter.md (craft section and the bar's recipe, read)
- open_items: C01

## Findings

### C01 · must-fix · part 1 · escalated
- board: Main.dc.html (also Library, PublicLibrary, Widths, PublicWidths, ShellStates) · view: frame · state: 00
- finding: the shell's ghost buttons ("Navigation", "Sign out", "Sign in") are bordered controls whose edge is their cue to extent. They still rest at 1.12:1 to 1.35:1, inside the scope item "any other bordered control on this canvas ... Name each one", and the stated reason for leaving them does not hold.
- evidence:
  - `preview.json` `non-text-contrast` on `button.kb-appbtn "Navigation"`: 1px border #e5dcc8 on #efe9db is 1.12:1 (light); 1.20 dark and 1.15 sepia on ShellStates. `ntc_also` lists "Sign in" and "Sign out" on the same pair.
  - `.preview/06-library/02-control-border/Library.frame.png`: the topbar's "Sign out" and the rail toggle still show the faint edge, while the grouping control and "Clear all reading data" lower on the same Page now draw a clear grey edge. The page ends up with two looks for one kind of bordered control.
  - `library.css` lines 92-94 define `.kb-appbtn` and `.kb-appbtn--ghost` inside this canvas (edge `kb-border`; hover `kb-border-strong`). The canvas draws them, so a library-scoped edge is within reach.
  - Handoff scope: "any other bordered control on this canvas whose boundary is the only cue to its extent". The only lock is "the shell's structure is untouched", which is structure, not an edge colour. `result.md` item 5 and G1 cite "the console's shared shell, which the handoff locks".
  - Note for the fix: the topbar ground is `kb-surface-sunken`, where `--lib-control-edge` (`kb-hint`) measures only 2.97:1 light. The same edge cannot be reused there unchanged. Pick a value that reaches 3:1 on the sunken band in all three themes, or move to `kb-secondary` for those buttons, and add it to the contrast table. Keep hover distinct: the ghost hover edge is `kb-border-strong` today, so hover would otherwise read as lighter than rest.
  - If the operator reads the ghost buttons as label-identified and so outside 1.4.11, this stands as the standoff for them to decide.
- confidence: medium · found_by: measured

## For the judge

- C01: standoff. The drafter logged G1 with a reason ("the handoff locks the shell") that I find does not hold; unsure, marked for the operator under `critic` alone.

## Scorecard

| Board | Part 1 | Part 2a |
|---|---|---|
| Main (Page 01 · Library flow) | C01 | ok |
| Library, PublicLibrary, Widths, PublicWidths, ShellStates | C01 (the same shell buttons) | ok |
| Grouping, GroupingStates | ok | ok |
| ClearAll, ClearStates | ok | ok |
| Elsewhere, LibraryState, StateStates | ok | ok |
| ContinueReading, ContinueStates, BookCard, BookCardStates, DocRow, DocRowStates | ok (card edges are out of scope per the handoff) | ok |

- **Component gaps:** none beyond the drafter's G1 to G3. G1 is the C01 finding above. G2 and G3 are signed and out of this round's scope.
- **2b notes for the operator:**
  - The role reuses `kb-hint`, the lightest `kb` token that clears 3:1. It gives a quiet grey edge. The trade-off is a second, non-text use for a text-hint colour (the library keeps `kb-hint` never-text) and a slightly heavier box line than the "hairlines instead of boxes" voice; the alternative, a dedicated token, is D45's call.
- **The bar:**
  1. Every list item opens its own item: holds (unchanged, no markup touched).
  2. A choice carries: holds.
  3. Search and filters change the data: holds (unchanged).
  4. The state bar: holds on the Pages. The Widths and PublicWidths `check=state-bar` warnings are signed boards, logged as G3, not this round.
  5. No link leaves the prototype: holds. `design-check` OK, with warnings only on earlier rounds' absolute paths and the Widths bars.
  6. Controls keep their size and the page holds still: no new shift. The 23 `layout-shift` lines are the rail fold and the Continue toggle, pre-existing (C04, C02). Border colour cannot move layout.
  7. The same list header in every state: holds.
  8. Hover: holds. The secondary hover edge turns `kb-accent`, and the label stays readable.
  9. Back chevron, logo, centred column: holds (unchanged).
  10. One direction, no decorative SVG: holds.
  11. Craft: holds. The change is one value, applied to two rules.
- **Holds (must survive the fixes):**
  - `--lib-control-edge` = `kb-hint` (#8f8676 light, #7e7566 dark, #8b785b sepia). I recomputed it: 3.22 / 3.90 / 3.31 on the page, 3.56 / 3.58 / 3.62 on `kb-surface`, 2.97 light on sunken (the drafter's stated limit).
  - The grouping control and every secondary button ("Clear all reading data", Cancel, not-found actions) use the role. `GroupingStates.sheet.png` and `ClearStates.sheet.png` show it in light, dark and sepia, with the pressed ring and the disabled Cancel distinct.
  - No structural hairline changed: the `library.css` diff is 10 lines, the role plus two rules.
  - Q1 posed with (b)'s trade-off logged. The contrast table is in `result.md`.
- **Not seen:**
  - `01-reader`'s round-03 canvas has no `result.md` yet and no sibling was named for me, so the wave seam (same value for the language switch) is unchecked. The orchestrator should compare `--lib-control-edge` with the reader's value when that job returns, and carry any mismatch as a wave choice.
  - The pressed grouping option: the instrument reports 1.24:1 on its fill (`non-text-contrast`, "By project"), counting the fill and not the inset ring. By the drafter's measure the ring is 4.82 / 4.99 / 4.98 against the fill; I did not re-measure the ring, and the screenshots show it. I treat it as a tool limit, logged as G2, and not a defect.
  - Hover and focus screenshots: I did not run the harness. Only the measured `hover-contrast` check (no issue) and the CSS (hover and focus rules unchanged) back them.
  - Card edges, the phone bar's current item and the text200 reflow (C04, D44): out of scope per the handoff.
  - The ds README for `kb` was not read separately; the tokens in `tokens.css` and `library.css` were used.
