# Critique 01: 01-reader/03-chapter-bar-and-border

- pass: 01
- mode: critic
- verdict: revise
- confidence: medium
- must_fix: 2 (part 1: 2, part 2a: 0)
- gaps: 2
- advisory: 3
- wave: 06-library/02-control-border, 05-annotations/02-keyboard-and-back-link, 1 choice
- escalate: C02 (low confidence), C03 (wave choice)
- preview: 255.8s, 94 states
- standard: .claude/agents/design-drafter.md
- open_items: C01, C02, C03, G1, G2

## Findings

### C01 · must-fix · part 1 · open
- board: TopStates.dc.html · view: frame · state: 00
- finding: The "Phone 390 · text 150%" cell draws the chosen language option with a boundary that the preview measures as a 1.24:1 fill with border width 0, so the D1 accent edge does not register on that cell. This contradicts the result's claim that no `non-text-contrast` line names `rd-lang`.
- evidence:
  - `preview.json` → TopStates frame `measured.ntc`: `button.rd-lang__o… "English"`, part fill, 1.24:1 (#dbe9e4 on #fffefa), width 0. The same pair is in `ntc_also` for Reader, Widths and TopStates. The result's "Control edge" section says the opposite.
  - My probe of the board's `.rd-lang__opt` elements: every 100% cell reads a `1px` rgb(15,111,102) border. The 150% cell (CSS `zoom` row) reads `0.666667px`, which the check rounds to 0.
  - The 200% cell passes. The 150% cell is the only one that does not.
  - The large-text rows on 06 and 07 are canvas-only, so a defect that comes from the `zoom` technique is the drafter's to fix, in markup.
- confidence: medium · found_by: measured

### C02 · must-fix · part 1 · open
- board: Main.dc.html · view: frame · state: 25 (Phone 320), 24 (Phone 390 · text 200%)
- finding: In the compact top bar (under 21rem), keyboard order and visual order disagree. Tab goes logo, back, language (row 2), then Display (row 1), so focus drops to row 2 and jumps back up. The result logs this as "carries no meaning" and ships it.
- evidence:
  - Result `## Build` §2: "Tab order stays the DOM's: skip, logo, back, language, Display. Under 21rem the language row sits below Display, so focus steps down to row 2 and back up".
  - `.preview/01-reader/03-chapter-bar-and-border/Main.frame.state-25.png` and `…state-24.png` show Display at the top right and the switch on row 2.
  - This is a focus order that does not follow the reading order (WCAG 2.4.3, 1.3.2). The craft standard's usability line is the nearest, and the preview's `keyboard` check does not test order, so only a person sees it.
  - Reordering the DOM so the switch follows Display in compact only, or keeping the switch in row 1, are both the drafter's to propose.
- confidence: low · found_by: critic

### C03 · choice · part 2a · open
- board: TopStates.dc.html, DisplayStates.dc.html · view: frame · state: 00
- wave: 05-annotations/BookNotes (`.an-filter`), 06-library/GroupingStates (`.lib-seg`)
- finding: The same segmented-switch pattern is drawn two ways in this wave. Neither side contradicts the system or a signed job on its own, so it is an open choice.
- evidence:
  - 01 `.rd-lang`: a rest outline in `--rd-control-edge` (kb-hint, 3.56:1), and the chosen option takes accent-soft plus a 1px `kb-accent` edge (D1).
  - 06 `.lib-seg`: a rest outline in `--lib-control-edge`, which is also kb-hint, and a selected option with accent-soft plus an inset 1px `kb-accent` ring. The look is the same as 01's, so these two agree.
  - 05 `.an-filter` in `annot.css` (drawn on BookNotes): the outline is still `kb-border-strong` (1.58:1) and the selected option has the fill only, with no edge. The result's O1 notes the same outline in `08-review`.
  - The two role names differ (`--rd-control-edge`, `--lib-control-edge`) but resolve to one value. That is for D45, and it is a gap, not a conflict.
  - Option A: 05 and 08 take the edge and the accent ring as 01 and 06 draw them. Option B: 01 and 06 keep fill-only, which fails at 1.24:1 as measured.
  - I did not render 05's canvas. This is read from `annot.css` and the sheet list.
- confidence: medium · found_by: critic

## For the judge

- C02: low confidence. Under `critic` alone this goes to the operator as unsure.
- C03: wave choice. Under `critic` alone this goes to the operator.

## Scorecard

| Board | Part 1 | Part 2a |
|---|---|---|
| 01 Main | C02 | ok |
| 02 Reader | ok | ok |
| 03 Widths | ok (S1 signed, see Holds) | ok |
| 04 Elsewhere | ok | ok |
| 05 Foundations | ok | ok |
| 06 TopStates | C01 | ok |
| 07 BottomStates | ok | ok |
| 16 DisplayStates | ok | ok |
| 19 ReaderTop, 20 ReaderBottom | ok | ok |
| Other 22 boards (merged, unchanged) | ok | ok |

- **Component gaps:**
  - G1: no control-edge token in the system. `--rd-control-edge` is reader-scoped and equals kb-hint. A control on light `kb-surface-sunken` reaches only 2.97:1. D45 decides.
  - G2: `kb-accent-soft` selected tint is 1.24 / 1.47 / 1.25:1. It marks the current chapter row (`a.rd-ch`), Display open and Contents open. It is logged, and it is the system's own rule, so it is not the drafter's to restyle.
- **2b notes for the operator:**
  - **N1.** The chosen language option now shows its accent edge right beside the switch's grey outline. At 150–200% (`.preview/01-reader/03-chapter-bar-and-border/Main.frame.state-24.png`) the two lines read as a near double border. The trade-off is clarity of "chosen" against a quieter switch. Fill-only fails 3:1.
  - **N2.** At 200% on a two-language chapter the sticky chrome is 208 px plus 120 px, which is 328 of 844 px (39%). The second row has an empty left half, with the switch right-aligned. This is the recommended "marks" direction's cost, and Q1 already names it. The alternatives cost more.
  - **N3.** Under 14rem a loose document drops the logo and keeps "‹ Library". The home link is then the back link only, which trades the logo's home link for a whole label.
- **Direction:** one direction (the marks), with the alternatives logged in Q1. This matches the handoff (no options asked).
- **The bar, line by line:**
  - 1 holds. Lists and rows are unchanged from signed.
  - 2 holds.
  - 3 holds.
  - 4 holds. Main and Widths carry the 150%, 200% and 320 presets, and every one lands. Widths' three bars are signed S1 (see Holds).
  - 5 holds. No new links; the preview link graph shows Main to Elsewhere, Reader and Widths only.
  - 6: holds apart from C01's measured cell. The size and width presets resize bars by design (L1), which is the thing demonstrated.
  - 7 holds.
  - 8 holds. The preview measured no `hover-contrast`.
  - 9 holds, with N3 noted.
  - 10 holds.
  - 11 holds. No 2a defects found on the render.
- **Holds:**
  - Chapter bar at 150% and 200% on 390 (my own probe, 5 scenes: top, last chapter, 한국어, signed-out, chrome back): no label overlap, no clipped text, targets 88×88, one row. The same at 320 and 100%.
  - Top bar at 150%, 200% and 320: no overlap in all scenes probed, and "‹ Book" and "Display" are whole at 320.
  - At a real 390 viewport with the root at 200%, `scrollWidth` equals `clientWidth` in 5 scenes, so there is no horizontal scroll from the visually hidden labels.
  - At 100% on 360, 390, 414, 820 and 1440, the chapter bar is byte-identical to the signed `HEAD` render. The top bar is identical at 820 and 1440. At 360–414 it differs only at the chosen language option (D1, logged).
  - The control-edge role holds at 3.56 / 3.58 / 3.62:1 on `kb-surface` and is shown on Foundations. No `non-text-contrast` is named for `rd-btn--secondary` or `rd-opt`.
  - 06 and 07 rows read cleanly on the sheets, and 03's size row reaches 150%, 200% and 320 in all three frames.
  - S1 (three state bars on 03) is signed in 02-revise, and the drafter did not move it.
  - G3: the scrim's 2.54:1 on 03 is a canvas-only reading of a viewport-wide scrim, signed since 02-revise, and the logged reason holds. I do not count it.
  - `design-check 01-reader` is OK.
- **Not seen:**
  - Hovered and pressed looks of the new edge, by eye. I relied on the measured table and `hover-contrast` being clean.
  - 08-review and 04-quiz boards (their downstream read is the drafter's O1 and downstream note).
  - The Display sheet at 200% on a phone. My probe shot showed only its header at the fold, which may be my scroll and not the board, and it is a signed element.
  - Dark and sepia at 200% for the top bar, beyond the 06 row.
  - 05-annotations and 06-library canvases were not re-rendered. The cross-job look is read from `annot.css`, `library.css` and the round files.
