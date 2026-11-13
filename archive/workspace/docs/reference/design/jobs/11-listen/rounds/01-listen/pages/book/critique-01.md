# Critique 01: 11-listen/01-listen

- pass: 01
- mode: critic
- scope: page book
- verdict: revise
- confidence: medium
- must_fix: 2 (part 1: 1, part 2a: 1)
- gaps: 1
- advisory: 3
- escalate: none
- preview: 80s, 24 states (the drafter's render, fresh against the canvas; no re-render, plus a critic harness for dark, hover, focus, Starting… and the long list at phone width)
- standard: .claude/agents/design-drafter.md
- open_items: C01, C02, C03

## Findings

### C01 · must-fix · part 1 · open
- board: Book.dc.html · view: frame · state: 00
- finding: On the Page shown alone, pressing Listen on a book whose audio is not made yet lands 0.9 s later on "Playing · Chapter 1 · 12:30", with chapter 1 already made ("Finished · 38 min") and chapter 2 being prepared. Someone who chose to listen from the start sees playback already 12 minutes into chapter 1, and never sees the honest "first part is still preparing" step (F9) between the press and playback.
- evidence: harness, state "Never listened" → Listen: the head reads "Starting… / 5 chapters", then the dock reads "Playing · Chapter 1 · 12:30" and the head reads "Preparing… / Chapter 2 of 5 · about 1 h 30 min left."; `Book.dc.html` `pressListen` applies the `preparing` preset (`live('guide', 1, '12:30', …)`) when alone. With audio made the same press gives "Chapter 1 · 0:00" (correct). Bar line 2 (a choice carries); drafter file *Toss-level care*, "Immediate feedback on press"; frame F9, "Before the first part is done: Part 1 of 12. You can play once this part is ready." The joined path (on-open-reader) goes to `ch 1 · 0:00` and is not affected.
- confidence: medium · found_by: critic

### C02 · must-fix · part 2a · open
- board: Book.dc.html, BookRow.dc.html, BookRowStates.dc.html · view: frame · state: 01, 02, 06, 08 (and every state once the book has audio)
- finding: Each chapter row now joins two unrelated facts with one " · " in one secondary span: the reading word and the audio phrase ("Not started · Not prepared yet", "Finished · Preparing…", "Finished · Daily limit", "Finished · 38 min"). On a landing about reading, nothing says the second half is about audio. "Not prepared yet" can be read as the chapter itself not being ready to read, "Finished · Preparing…" reads as a contradiction, and a bare "38 min" reads as a reading-time estimate. The person cannot tell which phrase is about listening.
- evidence: `.preview/11-listen/01-listen/pages/book/Book.frame.state-08.png` (rows 7–20: "Not started · Preparing… · part 2 of 9", "Not started · Not prepared yet"); `<scratch>/s1819.png` (phone 390 and 320 after Listen: "Finished · Preparing…", "Started · 40% · Not prepared yet"); `<scratch>/dark-limit.png` ("Finished · Daily limit"); `BookRowStates.sheet.png`. F11's words were written for the player's chapter list, where audio is the context; the joining on the landing is this page's own frame gap book-G3. Drafter file *Copy*: "Real and specific … labels say what happens"; *Hierarchy*: "Group by proximity: related things sit closer to each other than to anything else."
- confidence: medium · found_by: critic

### C03 · gap · part 1 · open
- board: Book.dc.html, BookRowStates.dc.html · view: frame · state: 01 (Book), 00 (BookRowStates)
- finding: The playing chapter's row fill (the signed current-row style, `rd-ch[aria-current]`, accent-soft) measures 1.24:1 light and 1.47:1 dark against the page, under the 3:1 non-text bar. The state is also carried by its word (Playing / Paused), so nobody depends on the fill alone. It is a signed style, carried by F11 and logged by the drafter as a component gap, so the drafter does not fix it. It goes to the operator and the system.
- evidence: `preview.json` `self_check=fail blocking=non-text-contrast:2`: `a.rd-ch "1 knowledge: what it is and h…"` fill #dbe9e4 on #fffefa 1.24:1; BookRowStates `a.rd-ch "4 Shipping and running knowle…"` fill #303f38 on #232019 1.47:1; logged in the page result.md `component_gaps:`.
- confidence: high · found_by: measured

### C04 · advisory · part 2b · open
- board: Book.dc.html · view: frame · state: 05, 06
- finding: In Finished and Daily limit the note's filled accent button (Start over, Play) sits directly above the landing's filled "Continue reading", so the column shows two equal-weight primaries. F6/F10 allow this (the note's action is "the only accent button Listen adds"), and the drafter put it to the operator as book-A1. The trade-off: the note's action is reachable in one tap, but the landing loses its one obvious next step in those two states. The frame owns this choice, so the join or the operator settles it.
- evidence: `<scratch>/side-b.png` (Finished: "Start over" filled; Daily limit: "Play" filled; both above "Continue reading" filled); drafter file *Hierarchy*, "One primary action per screen".
- confidence: medium · found_by: critic

### C05 · advisory · part 2b · open
- board: Book.dc.html · view: frame · state: 04, 14
- finding: While a Listen plays, the same fact appears three times on one desktop screen: the head's note ("● Playing / Chapter 4 · 12:30"), the dock ("Playing · Chapter 4 · 12:30") and the Contents row ("Playing"). The head note has no action of its own. The trade-off: the head confirms the state where Listen was pressed, at the cost of a repeated line beside the landing's own Continue block. F6 calls the head note "the reader page's choice", and this page carried it over.
- evidence: `<scratch>/side-a.png` (fourth column), `.preview/11-listen/01-listen/pages/book/Book.frame.state-04.png`; drafter file *Copy*, "Cut every word and sentence that adds nothing".
- confidence: medium · found_by: critic

### C06 · advisory · part 2b · open
- board: Book.dc.html · view: frame · state: 03
- finding: "Start over" under "Continue listening" shows at rest as plain semibold ink text, the same look as body text. Its underline appears only on hover and focus, so at a glance it reads as a label rather than an action. It is the frame's `Listen` component (`.lx-over`), not this page's markup, so the join owns it. It is noted here because this page is where it shows.
- evidence: `.preview/11-listen/01-listen/pages/book/Book.frame.state-03.png` (rest: no underline); `<scratch>/xs.png` rows 3–4 (focus and hover: underlined); computed `BUTTON.lx-over`, 44 px tall.
- confidence: medium · found_by: critic

## For the judge

none (critique level `critic`; no low-confidence must-fix and no standoff)

## Scorecard

| board | Part 1 | Part 2a |
|---|---|---|
| Book.dc.html | C01 (C03 gap) | C02 |
| BookRow.dc.html | ok | C02 |
| BookRowStates.dc.html | ok (C03 gap) | C02 |

- **Component gaps:** C03, the signed current-row fill under 3:1 non-text contrast (light 1.24:1, dark 1.47:1), logged by the drafter.
- **2b notes for the operator:**
  - C04: in Finished and Daily limit the landing shows two filled accent buttons (the note's Start over or Play above Continue reading), as the frame allows; one tap to Listen's action, at the cost of the landing's single obvious next step.
  - C05: while listening, "Playing · Chapter 4 · 12:30" shows in the head note and again in the dock on the same screen; it confirms the state where Listen was pressed, but repeats a line.
  - C06: Listen's "Start over" looks like plain text until hovered or focused; it is the frame's component, for the join.
- **The bar:**
  1. holds within the page (each row emits its own `ch`; the reader link is the join's)
  2. C01
  3. n/a (no search or filters)
  4. holds (on the Page, only the book's presets, sunken and dashed, every preset lands in place)
  5. holds (`design-check --page book` OK; no off-canvas link)
  6. holds (Starting… keeps the button's width; the dock's lead stays 44 px across Play and Pause; the 13 `layout-shift` lines all come from the View switches, which change the viewport, logged by the drafter with a reason that holds)
  7. holds (the Contents header "Contents · N chapters" is the same in every state)
  8. holds (Listen hover is a border and label tint, readable; no `hover-contrast` line over 38 hovered controls)
  9. holds ("‹ Library", logo link, content 176 / 176 px at 1440; the `off-centre` 85 / 176 line is the signed full-width top bar, logged); see C04 for the primary action in two states
  10. holds (one direction; the only SVG is the media icons)
  11. see C01 (feedback on press) and C04 (one primary action, frame-owned)
- **Holds:**
  - Never listened: one secondary Listen with "5 chapters" (or "5 chapters · about 4 h" once made), on the button's centre line. Continue reading stays the one accent, uncrowded.
  - Left part-way: Continue listening is the clear resume, with "Chapter 4 · 12:30". It lands on chapter 4 · 12:30 when pressed. Start over is reachable but not the default.
  - Preparing: "Chapter 2 of 5 · about 1 h 30 min left." with an honest line, and the landing stays usable.
  - Daily limit names its reset time (09:00 tomorrow). Offline says Listen can start once back online.
  - 20 chapters: the per-chapter words stay quiet, with no colour and no icons.
  - The dock's track at desktop (side column, book-G1) and at phone 390 / 320 sits on the column's edges. Playing and Paused differ by icon and word.
  - Dark: desktop Never listened, Listening, Left part-way and Daily limit, plus phone 390 Offline, look right. Text contrast passes 4.5:1 in all nine states, light and dark (critic harness).
  - Keyboard: 11 controls, all reached, focus wraps.
  - The `align` first-line line on state 08 shows no visible miss on its 2× crop.
- **Not seen:**
  - Dark contrast was measured by a critic script, not by `design-preview`. Non-text contrast in dark on the full Page is only the measured BookRowStates line.
  - Every row of the 20-chapter list was not clicked: the render sampled three.
  - The joined behaviour of rows, Continue reading and the dock's open chevron (events only when alone) belongs to the cross scope.
  - 20 chapters at Phone 390 / 320 is taller than the 1840 board (2434 / 2466 px). It scrolls inside the frame with the dock held at the bottom; the drafter logged this as book-H1. The handoff does not name this combination as a state.
  - The signed title breaking mid-word ("maintaine / r guide") at 200% text, 390 px, is the signed 07 landing's, not Listen's.
