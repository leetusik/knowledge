# Critique 01: 05-annotations/02-keyboard-and-back-link

- pass: 01
- mode: critic
- verdict: revise
- confidence: medium
- must_fix: 4 (part 1: 3, part 2a: 1)
- gaps: 0
- advisory: 1
- wave: 06-library/02-control-border (read from its CSS diff and result.md, not rendered), 1 choice
- escalate: C01, C02, C03 (standoff), C05 (wave choice)
- preview: 253s, 94 states (the drafter's render, read; plus my own interaction harness)
- standard: .claude/agents/design-drafter.md
- open_items: C01, C02, C03, C04, C05

## Findings

### C01 · must-fix · part 1 · escalated
- board: Main.dc.html, Widths.dc.html · view: frame · state: 00
- finding: `non-text-contrast` (a blocking WCAG check) on the highlight's new tab stop, `mark.an-m`.
- evidence: `preview.json` self_check=fail (non-text-contrast 24). The tool reads the paint fill (1.12-1.80:1) as the stop's boundary. The drafter's R02-1 answers that the boundary is the bronze foot line, drawn as an inset box-shadow, and that this line measures 3.19 or more. That is plausible and I did not contradict it; the focus ring itself is clearly visible in light (`.preview/05-annotations/02-keyboard-and-back-link/Main.frame.state-15.png`) and in dark (my shot `<scratch>/dark_f.png`). But the tool counts it as blocking, and a line the tool names is a finding under the bar until the operator accepts it.
- confidence: medium · found_by: measured

### C02 · must-fix · part 1 · escalated
- board: Main.dc.html, Widths.dc.html · view: frame · state: 00
- finding: `keyboard` (a blocking WCAG check): a highlight's continuation pieces still open a dialog on click, with a pointer cursor, but never take keyboard focus.
- evidence: `preview.json`, Main keyboard `click_only`: `mark.an-m` "delete_rows_not_in", "(seen)", ", and that boundary is load…", "201" and ", then hand the push and th…" (+4 more; Widths +19). The drafter's R02-2 says WCAG 2.1.1 asks for the function, which the first piece's stop already gives. That reads as sound. Still, the round's own check is "Check: below 64rem a highlight without a note opens by keyboard alone". That holds (see Holds), but the blocking line stays. Possible fixes are for the drafter: take the pointer cursor off continuation pieces, or make them non-interactive to the check without adding stops.
- confidence: medium · found_by: measured

### C03 · must-fix · part 1 · escalated
- board: Main.dc.html, Widths.dc.html · view: frame · state: 00
- finding: `target` on the new stops. Each `mark.an-m` is under 44x44 (388.6x27, 90x19, 83.8x27, 117.3x21 …), and the signed round had no `target` line on them.
- evidence: `preview.json` Main frame issues (8 target lines); the signed `rounds/01-annotations/result.md` line 373 lists no `target`. The mark was a tap target before, but it is now `role=button` with `tabindex=0`, so the tool counts it. The drafter's R02-3 cites WCAG 2.5.8's inline exception, and that is a fair argument. The operator's bar says 44 px, so this is the operator's call. I give it as must-fix on the measured rule only.
- confidence: medium · found_by: measured

### C04 · must-fix · part 2a · open
- board: Main.dc.html (also Widths.dc.html at 390) · view: phone/frame · state: keyboard focus on a highlight that wraps
- finding: the focus ring on a highlight that wraps draws one closed box per line. At 390 the stacked boxes touch and read as three separate stops.
- evidence: my shot `<scratch>/esc390.png`: "one decision made early and honoured everywhere since" takes three boxes, each with its own side edges, line 1's bottom edge touching line 2's top edge, and the left edge sitting 3 px outside the text column. The drafter's own decision "the ring sits on the focused piece only" is met. The craft line "Focus is visible (a ring with 3:1 contrast)" is met on contrast, but the broken boxes fall below the polish line. A wrapped piece should read as one ring, for example `box-decoration-break: clone` with an offset that leaves the line gap, or a ring drawn on the first and last fragments only.
- confidence: medium · found_by: critic

### C05 · choice · part 2a · wave choice · escalated
- board: Main.dc.html, BookNotes.dc.html · view: frame · state: all
- wave: 06-library/02-control-border (`library.css`)
- finding: a bordered control's resting edge is drawn two ways across the wave. 06-library now gives secondary buttons and ghost buttons a 3:1 edge (`--lib-control-edge` = `kb-hint`, ghost = `kb-secondary`). The reader's copied `rd-btn` and the language switch here keep the signed 1.24:1 border (`#dbe9e4` on `#fffefa`).
- evidence: `preview.json` non-text-contrast lines for `button.rd-btn "Bookmarked"` and `button.rd-lang__o…` (1.24:1); 06's `library.css` diff. The same pattern now reads two ways. The handoff keeps the reader's fix in 01-reader and the library's in 06, so neither drafter decides it. The choice: the 3:1 edge applies to every product control (the reader's, this job's `an-row` too), or only to the library.
- confidence: medium · found_by: critic

## For the judge

- C01: standoff (the drafter logged R02-1 with a reason that is plausible but leaves a blocking line).
- C02: standoff (R02-2).
- C03: standoff (R02-3); also the operator's 44 px bar against WCAG's inline exception.
- C05: wave choice.

## Scorecard

| Board | Part 1 | Part 2a |
|---|---|---|
| 01 Main | C01, C02, C03 | C04 |
| 03 Widths | C01, C02, C03 | C04 |
| 04 BookNotes | ok | ok |
| 05 Elsewhere | ok | ok |
| the other 31 boards | ok (unchanged from signed) | ok |

- Component gaps: none new. The highlight's stop is this job's own markup (the drafter logged it).
- 2b note for the operator: Q1 (option (a), a focusable first piece, over (b)) is weighed fairly, and the recommendation is sound. The cost is one more Tab stop per highlight (+14 on the canvas chapter, +25 with 30 marks), and the Notes list stays the short route. If a long chapter's tab order worries you, ask for (b) on top as an addition, not as a replacement.
- The bar:
  1. Every list item opens its own item: holds (not touched).
  2. A choice carries: holds (the book entry carries "from book" to the right back link).
  3. Search and filters: holds (not touched).
  4. State bar: holds on 01 for the new presets (they sit in "Reader · a chapter" and "Notes in this book"). One open line, pre-existing: 03 Widths has four bars instead of one (`check=state-bar`, design-check warning; R02-6). The handoff keeps it as signed, so I count it as the orchestrator's call.
  5. No link leaves the prototype: holds.
  6. Layout stays still: the 37 `layout-shift` lines on Main (34 on Widths) are the signed round's departure 3 (the page scrolls past the state bar), and the two new presets do the same (R02-7). Not counted against this round.
  7. Same list header in every state: holds (04 "All" and "Opened from the book page" share one head).
  8. Hover: holds (a pointer press and hover on a highlight are unchanged).
  9. Back links: holds ("‹ Back to the book" and "‹ Back to the chapter" both carry the chevron).
  10. One direction: holds.
  11. The craft lines: C04.
- Holds:
  - Keyboard reach, checked with my own harness on 01 at 390 and 1440: Tab reaches a highlight with no note (stop 51 of the page, after the state bar), Enter opens its popover and moves focus into the dialog box, and Escape returns focus to the piece (`<scratch>/enter390.png`, `<scratch>/esc390.png`).
  - The ring is visible in light and dark (`.preview/05-annotations/02-keyboard-and-back-link/Main.frame.state-15.png`, `<scratch>/dark_f.png`). Sepia was not shot.
  - The popover opened by keyboard shows its own ring, at 390, 820, 1024 and 1440 (`Widths.frame.state-08.png`).
  - Book-page entry: the "Opened from the book page" preset shows "‹ Back to the book" (`Main.frame.state-45.png`), and the "All" preset shows "‹ Back to the chapter" (`Main.frame.state-46.png`). The round trip to the stand-in works.
  - Nothing signed changed at rest, on hover or on a tap.
- Not seen:
  - The state cap (48) stopped the render, so the drafter's pass did not click every preset (a click-through of "Opened from the book page" was seen through the click path, not the preset itself).
  - Sepia ring, a screen reader's announcement, and the keyboard selection gap (still open, as the handoff allows).
  - 06-library was read from its CSS diff and `result.md`, not rendered, so the cross-job look is partial. 05-annotations' own system README under `ds/` was not read; the API came from the handoff and `result.md`.
  - Out of scope per the handoff (`Not this job`), and not counted: R02-4 (the reader's copied parts: `rd-btn`, the language switch, `rd-scrim`, `overprint` at 200% text) and R02-5 (`an-row` and the legacy control under the 3:1 boundary). They are the orchestrator's, with the wave's 3:1 decision, and they keep `self_check=fail`.
