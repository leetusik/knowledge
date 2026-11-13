# Critique 01: 10-reading-aids/01-reading-aids

- pass: 01
- mode: critic
- scope: cross
- verdict: revise
- confidence: high
- must_fix: 6 (part 1: 6, part 2a: 0)
- gaps: 2
- advisory: 2
- escalate: C02
- preview: 395s, 130 states
- standard: .claude/agents/design-drafter.md
- open_items: C01, C02, C03, C04, C05, C06, C07, C08

The render was taken fresh by this pass (`design-preview --click --contact-sheet`, all 13 boards), since the frame's
follow-up pass (join-R1) changed frame.css, Gloss, MathBlock and MathInlineStates after the join's last render. The
cross-page way there and back was clicked by a harness of my own (shots under `<scratch>/`).

## Findings

### C01 · must-fix · part 1 · open
- board: Main.dc.html · view: frame · state: -
- finding: In the entry flow at the board's own width, the reader's top bar and the whole chapter jump 18 px down when the flow moves from Formulas (or Print) to Terms, and back up on return. The flow's reserved bar height no longer covers the Terms bar, which now wraps to three rows.
- evidence: harness at 1440 and at 1280: state bar 71 px on Formulas and Print, 89 px on Terms; `header.rd-top` y 74 → 92, first h2 "Scoring a run" y 173.2 → 191.2 (`<scratch>/main-top-formulas.png`, `<scratch>/main-top-terms.png`). The Terms bar's rows sit at y 8, 26–32 and 56–62, so the caption sits alone on the first row. Main reserves `min-height: 71px` from 1100 px. join-N2 says the header holds from 1100 px up, and the measurement shows it does not. Bar line 6 (the page holds still across states) and the state-bar rule "reserve the tallest page's bar height … so the product header never moves between pages".
- confidence: high · found_by: critic

### C02 · must-fix · part 1 · escalated
- board: Main.dc.html · view: frame · state: -
- finding: A reader who switches the chapter to Korean (the Shell's own 한국어 switch) or to dark on Formulas, then moves to the chapter's glossary part or to paper, gets the chapter back in English and light. The language choice does not carry across the chapter's parts.
- evidence: harness on Main at 1440: Shell "한국어" on Formulas, so the headings read 실행 채점하기 and the 한국어 switch is pressed. The foot strip's "Terms and the glossary" then opens Terms with "Scoring a run" and "English" pressed, and "On paper" opens Print at "English · A4". The page's own Korean and Dark presets do the same. The round logs this as join-N1 ("a page's own presets and language switch do not report back"), but that names how the flow was built, not a reason it must be so. F15 already has the Shell emit `on-lang`, and the language is one setting of one chapter. Bar line 2 (a choice carries to the next screen). It is a standoff against a logged departure, and since the foot strip is canvas chrome, whether line 2 covers it is a judgement call.
- confidence: medium · found_by: critic

### C03 · must-fix · part 1 · open
- board: Print.dc.html, Terms.dc.html, MarkStates.dc.html · view: frame · state: 00
- finding: The same sentence of the shared chapter reads differently on screen and on paper. On screen it is "Picking the best of many backtests flatters it." and on paper it is "Picking the best of many backtests inflates the result." A reader comparing the printout with the screen sees two texts for one chapter.
- evidence: rendered text, harness: Terms "Counting the trials" paragraph 1 "… flatters it."; Print "Counting the trials" paragraph 1 "… inflates the result."; the frame's MarkStates board (screen and its "Paper" sample) "… flatters it." The Korean text agrees on all three (결과가 부풀려집니다). This is F12's shared fixture: every page shows the same passages. The sentence is not in the brief's *Shared data*, so it is the round's own text and needs one wording.
- confidence: high · found_by: critic

### C04 · must-fix · part 1 · open
- board: Terms.dc.html · view: frame · state: 11
- finding: In the state the cross-page link lands on (the glossary entry arrived at) and in three other states, the Terms page is 10 px taller than its frame, so the canvas cuts off its foot.
- evidence: `issue board=Terms.dc.html view=frame state=11 check=page-clip: content is 5330px tall but the PAGE frame h is 5320px` (also states 20, 21 and 45: "In the glossary →" arrivals). These lines are new in this render, which is the first one taken after the frame follow-up changed Gloss and frame.css (F23, F25). `.preview/10-reading-aids/01-reading-aids/Terms.frame.state-11.png`. A frame `h` fix is the join's to make.
- confidence: high · found_by: measured

### C05 · must-fix · part 1 · open
- board: Terms.dc.html · view: text200 · state: 00
- finding: At 390 px with 200 % text the Terms page scrolls sideways to 500 px, wider than the signed Shell's logged 422 px. The cause is the chapter's own no-break run "[DRAWDOWN LIMIT] of K", which cannot wrap at that size. A reader with large text must scroll sideways to read that line.
- evidence: `issue board=Terms.dc.html view=text200 check=reflow: content is 500px wide at 390px`. The harness used the preview's own text scaling: `span.ra-keep` "[DRAWDOWN LIMIT] of K" runs from x 34 to 489, and the full stop ends at 500. Main and Formulas measure 422 (the Shell, join-G1). The 500 is the F23 keep applied by the frame follow-up, and the round does not log it (join-G1 names only the top bar's 422). This is a blocking WCAG check (reflow).
- confidence: high · found_by: measured

### C06 · must-fix · part 1 · open
- board: Main.dc.html, Terms.dc.html, Formulas.dc.html · view: text200, w320 · state: 00
- finding: The narrow and large-text views of the pages run past the render's 8000 px cap, so the rest of each view is never drawn or checked. Nothing on those lower parts at 320 px or 200 % text has been seen.
- evidence: `check=too-tall` lines: Main text200 11465 px; Terms w320 8307 px and text200 26188 px; Formulas text200 11250 px ("the screenshot stops at 8000px"). The round's `## Measured lines` neither fixes nor logs them.
- confidence: high · found_by: measured

### C07 · gap · part 1 · open
- board: Main.dc.html (and every board that mounts Shell) · view: frame, text200 · state: 00
- finding: The signed reader top bar (01-reader) fails three blocking checks that the drafter may not restyle. The language switch's pressed fill is too faint to show the control's edge, the bar overflows sideways at 390 px with 200 % text, and its "‹" overprints "English" there. Its back link is also 43.6 px wide and cut to "B…" at 320.
- evidence: `check=non-text-contrast` 1.24:1 light (#dbe9e4 on #fffefa) and 1.47:1 dark (#303f38 on #232019); `check=reflow` 422 px; `check=overprint` 8×21 px; `check=target` a.rd-back "Book" 43.6×44. Logged as join-G1.
- confidence: high · found_by: measured

### C08 · gap · part 1 · open
- board: Main.dc.html (Terms mounted) · view: frame · state: 24
- finding: The signed 05-annotations popover's "Add note" button edge is too faint to read as a control.
- evidence: `check=non-text-contrast` button.rd-btn "Add note" border #d8ccb3 on #fffefa, 1.57:1 (needs 3:1). Logged as join-G2.
- confidence: high · found_by: measured

### C09 · advisory · part 2b · open
- board: Main.dc.html · view: frame · state: -
- finding: "‹ Back to the text" returns to the very term, placed mid-screen and focused. For a pointer user, though, the term shows no mark: the arrived glossary entry gets a sunken ground, while the place the reader returns to looks like any other term. The trade-off is that a quiet return keeps the text calm, but the eye must find the term among the others in the legend.
- evidence: `<scratch>/f1-c-back.png`: after Back, the active element is a.ra-term "eigenvalue" at y 439 of 900, with no ring or ground visible. `<scratch>/f1-b-arrived.png`: the arrived entry is marked.
- confidence: medium · found_by: critic

### C10 · advisory · part 2b · open
- board: Main.dc.html · view: frame · state: 00
- finding: The entry board opens on Formulas (2776 px) inside a 6066 px frame sized for Print. On the canvas, the foot strip sits about halfway down, above some 3,290 px of empty ground. The frame keeps the header still across pages, at the cost of a first view that looks unfinished below the fold.
- evidence: `<scratch>/main_overview.png`; harness: foot strip y 2734.6 on Formulas, docH 2776, board h 6066.
- confidence: high · found_by: critic

## For the judge

Under `critique: critic` this list goes to the operator as it stands, each item marked unsure:
- C02: standoff. The finding stands against join-N1, a departure the join logged with a reason I find does not hold. The reading of bar line 2 is also unsure, since the move is made through the canvas-only foot strip.

## Scorecard

| board | Part 1 | Part 2a |
|---|---|---|
| 01 Main | C01, C02, C06 | ok |
| 02 Terms | C03, C04, C05, C06 | not judged (page scope) |
| 03 Formulas | C06 | not judged (page scope) |
| 04 Print | C03 | not judged (page scope) |
| 05 MarkStates | C03 | ok |
| 06 GlossStates | ok | ok |
| 07 GlossListStates | ok | ok |
| 08 MathInlineStates | ok | ok |
| 09 MathBlockStates | ok | ok |
| 10 ShellStates | ok (C07 gap) | ok |
| 11 Gloss | ok | ok |
| 12 MathBlock | ok | ok |
| 13 Shell | ok (C07 gap) | ok |

**Component gaps:** C07, the signed Shell (join-G1); C08, the signed annotation popover (join-G2). Both are logged.

**2b notes for the operator:**
- C09: The way back lands on the exact term but leaves no visible mark on it for a mouse reader; quiet, at the cost of a moment's search.
- C10: The entry board opens on Formulas inside a frame sized for Print, so the canvas shows a long empty stretch under the flow's foot strip.

**The bar:**
1. holds: three different legend terms (eigenvalue, participation ratio, t-통계량) open three different glossary entries, each marked, and the prose and legend occurrences of "participation ratio" return to their own places.
2. C02.
3. holds (no search or filters in scope).
4. holds: the mounted page's own bar is the only bar, with only its presets. Main adds none, and the foot strip is separate canvas chrome.
5. holds: no link leaves the canvas; `#to:terms` is wired to `Terms.dc.html`; the Shell's inert `#top` links are named (F15).
6. C01.
7. holds (no list header that filters).
8. not re-checked here (page scopes).
9. holds: "‹" on the Shell's back link and on "‹ Back to the text". The logo is inert, as F15 names. The column is centred and identical on Terms and Formulas (432–1008 at 1440, 352 at 1280).
10. holds: one direction, no decorative SVG.
11. holds except C01–C03.

**Holds:**
- The entry reaches all three related pages by clicks. Formulas' "In the glossary →" (window, any legend or text term) opens Terms at that entry, sunken and focused, and "‹ Back to the text" returns to the very occurrence, centred and focused. Korean and dark carry along that way: Korean arrival shows 실행 채점하기 and returns on 아무 일도 없을 때's page with t-통계량 focused.
- `join.json` lists no unrelated page, and none exists. `design-check` reports no `pending-link`, `unlinked-page`, `leaves-canvas` or `same-target-list` line, and the link graph is Main → Terms/Formulas/Print and Formulas → Terms.
- One answer per shared choice across the pages: F29's headings on all three pages; `+0.10 % of K`, `0.25 %`, `2.19`, `1.55`, `CONDITIONAL-GO's 1.5` identical in Terms, Formulas and Print. The glossary has the same 12 terms in the same A–Z order on Terms and in Print's appendix, with "Also called" and "In the glossary →" named one way everywhere.
- The shared edges line up between Terms and Formulas: Shell back link x 78.4, language switch x 1206.4, h2 and text column x 432 / 576 wide at 1440, h2 26.1 px and body 18/29.7 px on both.
- Placement holds: the window is one component on both pages, with Close top right, Read more at the foot's start and "In the glossary →" at its end.
- The frame's boards (05–13) render complete after the follow-up, in every state they list: window and sheet in short, longer, no-longer, Korean and dark; the list arrived, dark and Korean; display blocks on screen, phone, dark and paper; F24's `(Σe)²` on the inline board.
- Main's logged advisory lines (first-line and label-ink on MathML, tight-leading, size-count, cramped-padding on the highlight, tiny-text and ragged-edges on paper, near-edge 1.9 px) and its layout-shift lines (F21's viewport boxes, the scrolls that place a window or sheet) are logged with reasons that hold.
- The arrow on "In the glossary →" follows the signed reader's own labels ("Next →", "Back to the book →").

**Not seen:**
- Hover, focus and pressed looks of the window's controls (page scopes' business, not re-rendered here).
- Main's click-through hit the 48-state cap. The cross-page way was verified only by my harness (1440 × 900, English, Korean, dark), not at phone width through the sheet.
- The lower parts of the w320 and text200 views beyond 8000 px (C06).
- The pages' internals, their own critiques and `result.md`s (out of this scope). That covers Print's phone view, where the paper sheet runs past 390 px, and `design-check`'s two token-drift warnings (Print ×34, Terms ×8).
- The system README under `ds/kb/` was not read; no component API question arose in this scope.
- The handoff has no `## The operator's bar` section. I read it as "none beyond the shipped bar".
