# Critique 01: 07-book-page/01-book-page

- pass: 01
- mode: critic
- verdict: revise
- confidence: high
- must_fix: 7 (part 1: 4, part 2a: 3)
- gaps: 0
- advisory: 5
- wave: none
- escalate: none
- preview: 257.8s, 123 states
- standard: .claude/agents/design-drafter.md

## Findings

### C01 · must-fix · part 1 · open
- board: ContinueStates.dc.html, RowStates.dc.html, Main.dc.html · view: frame · state: 00
- finding: "Started at 0%" is drawn nowhere: no Continue cell shows "You've opened it, but not read far yet.", no row shows the bare word "Started", and no Main preset reaches either.
- evidence: handoff.md line 95 lists the row words with `"Started" alone at 0%`, and its rounds' words (lines 488-490) record that the reader's round 02 signed "Started" for a chapter marked unread. The drafter's own build-prompt.md names both (line 144, the Continue table row "Started at 0% (just opened, or marked unread)"; line 189, "Started" at 0%), and the branches exist (`Continue.dc.html` line 21, `book.js` line 181). But every sample position in `book.js` (the `st(...)` calls, lines 117-131) is 12-64%, so no cell, preset or click reaches them. ContinueStates draws 8 light, 4 dark and 4 sepia cells and RowStates 10 light, 4 phone, 3 dark and 3 sepia, none at 0%; the build prompt's "Every state, and the board that shows it" table omits the state too. Fails bar line 4 (a preset reaches every handoff state) and the Components rule (every state of the component). Met when one Continue cell, one row cell and one Main preset (or a 0% chapter in a sample book) show it.
- confidence: high · found_by: critic

### C02 · must-fix · part 1 · open
- board: RowStates.dc.html · view: frame · state: 00
- finding: The cell captioned "Legacy · not started" draws "Finished · ORIGINAL LAYOUT", so the caption is wrong and the legacy-and-unopened row is not on the board.
- evidence: `pass-01/RowStates.frame.png`, first light group, the sixth cell (crop: `shots/rowstates-legacy-cell.png`) reads "7 Datums: Chart Datum, Mean Sea Level, and the Conversions Between Them / Finished · ORIGINAL LAYOUT". `RowStates.dc.html` line 28 builds it as `R('Legacy · not started', 640, 'tidewater', 'datums')` with the default Tidewater progress, where chapters 1-10 are finished (the same row reads "Finished" on Main state 05). "Not started" with the plain tag is a state the handoff checks ("legacy reads as the reader's ORIGINAL LAYOUT, never as broken"; orchard: "Not started everywhere") and the component's board never draws it (only Main state 08 does). Met when the cell is drawn from unopened data (the orchard book's legacy rows) or its caption is corrected and a true "Legacy · not started" cell is added.
- confidence: high · found_by: critic

### C03 · must-fix · part 1 · open
- board: Main.dc.html, Widths.dc.html (the same presets) · view: frame and phone · state: 09, 10, 12 (frame); 02, 09, 10, 12 (phone)
- finding: The presets "Clear · confirming", "Clear · clearing…", "Clear · failed" and (at 390) "Guide · chapter 2's versions open" set their state but leave the part that shows it below the first screen, so pressing one looks like nothing happened.
- evidence: measured with the page scrolled to the top after each preset. At 1440x929 (scroller 900 tall) the confirm actions and the "Clearing…" button start at y=988 (88 px below the fold) and the failure line at y=1041 (141 px). At 820x1180 they are 324 and 377 px below. At 390x914 (fold 844) the versions panel is 411 px below, the confirm actions and "Clearing…" 1108 px, the failure line 1161 px. By pixel diff, the first screens below the bar of Main frame states 09, 10 and 12 are identical to each other (0 differing pixels), and at 390 the first screens of states 02, 09, 10 and 12 are identical to the initial "Guide · 2 of 5 finished" screen (0 differing pixels): `Main.frame.state-09.png` against `Main.frame.state-12.png`, `Main.phone.state-02.png` against `Main.phone.png`. On Widths the confirm actions start 764, 184, 173 and 0 px below the 390, 820, 1024 and 1440 frames' folds. Drafter file line 69: a preset "lands exactly where clicking would", and a click on the trigger happens at the foot of the page, not at the top. Met when each of these presets brings its part into view (a canvas-side scroll), so the state it names is what the first screen shows.
- confidence: medium · found_by: critic

### C04 · must-fix · part 1 · open
- board: Main.dc.html · view: frame · state: 22, 23, 24, 32, 38, 40, 41, 42, 45, 46 (the stand-in pages)
- finding: Each stand-in page's single preset carries a fixed label ("Chapter 2, where you stopped" on the reader, "lantern P9, where you stopped" on the legacy reader) that contradicts the screen under it whenever the click came from another row, book or version.
- evidence: `Main.frame.state-42.png`: the pressed preset reads "Chapter 2, where you stopped" over "The signed reader opens 'Time zones and the daylight-saving hour' … English · v2 (newest) · from the top". `Main.frame.state-38.png`: the same label over Tidewater's "Storm surge: when the model is wrong … at 'Noticing a surge', where you stopped". `Main.frame.state-24.png`: the same label over chapter 5, "from the top". `Main.frame.state-45.png`: "lantern P9, where you stopped" over "P8: Probe scheduling without a thundering herd … from the top". `book.js` lines 319-320 hard-code both labels and `sig()` (line 328) matches an away state by its kind alone. Drafter file line 69: "the pressed preset is the one matching the current state". Met when the label is taken from the destination being shown, or is neutral ("Reader stand-in").
- confidence: medium · found_by: critic

### C05 · must-fix · part 2a · open
- board: Main.dc.html (ClearData; Widths.dc.html mounts the same part) · view: frame and phone · state: 31, 35 (the trigger pressed), and every state after pressing "Clear this book's reading data"
- finding: Opening the confirmation from its trigger puts focus on Cancel while Cancel and "Clear reading data" are below the fold and the page does not scroll (`preventScroll`), so the focus ring and both actions are out of sight.
- evidence: `Main.frame.state-31.png` is what a reviewer sees after the press: the question and the first two bullets at the foot of the frame, no buttons and no focus ring. Harness, trigger pressed: at 1440x929 on the guide the trigger sits at y=811 and afterwards `document.activeElement` is Cancel at y=988-1032 against a 900 px fold (88 px below); on Tidewater (20 rows, page scrolled to its end) Cancel is at y=943 (43 px below). At 390x914 it is y=957 with the trigger centred (113 px below the 844 fold) and y=909 on Tidewater (65 px below); `shots/clr2-390-confirm.png`. The engine's click pass reaches the trigger (states 31, 35) but never presses Cancel or "Clear reading data": its notes list controls "outside the 1440x929 frame". build-prompt.md lines 244-247 chose `preventScroll` on purpose ("the page never scrolls under the reader"); the price is a destructive two-step whose second step cannot be seen. Standard: "Focus is visible … never removed" (line 127); Toss care, "the next step is obvious without reading" (line 134). Met when opening the group leaves its actions in view (a least-distance scroll into view, or the actions placed beside the question).
- confidence: medium · found_by: critic

### C06 · must-fix · part 2a · open
- board: Main.dc.html (ClearData; Widths.dc.html mounts the same part) · view: frame and phone · state: cleared, reached by pressing "Clear reading data" (preset 11 does not exercise it)
- finding: When clearing finishes, the focused "Clearing…" button is removed with the group and focus falls to the document body; nothing takes it, so keyboard and screen-reader users lose their place.
- evidence: harness at 1440x929 and at 390x914 on the guide: while pending, `document.activeElement` is the "Clearing…" button; 1.8 s later it is BODY (y=0), while the `role="status"` line "Reading data cleared. …" sits in the zone (y=720 at 1440, y=700 at 390) with no `tabindex`. build-prompt.md lines 244-247 define focus for open, Escape, Cancel and pending, and say nothing for cleared. Standard line 127 ("Focus is visible … never removed"). Met when, on done, focus moves (with `preventScroll`) to the status line (`tabindex="-1"`) or the section heading.
- confidence: medium · found_by: critic

### C07 · must-fix · part 2a · open
- board: Main.dc.html, RowStates.dc.html ("Per-slice book" cells), ChapterRow.dc.html (the part) · view: frame · state: 07 (Main, "lantern · per-slice book p24")
- finding: In a per-slice row's meta line the same dot has two spacings: the separator after the slice id has 9.6 px either side, while the dot inside the signed "Started · 22%" has 2.6 px.
- evidence: harness on Main state 07 (13 px meta line): "P24.S3" ends at x=723.2, its "·" box spans 732.8-736 and the word starts at 745.6 (9.6 px each side); inside "Started · 22%" the dot sits 2.6 px from "Started" and 2.6 px from "22%". `shots/p24-row-zoom.png` shows it at 4x; `Main.frame.state-07.png` shows it at 1x. `ChapterRow.dc.html` draws the id's separator as its own flex child (gap `0.2rem var(--kb-space-sm)`), while the word is the signed string with a typed " · ". Standard: "the same step for the same relation everywhere" (line 103). Met when one dot spacing runs along the line; the signed word is the fixed side, so the id's separator is the one to change.
- confidence: medium · found_by: critic

## For the judge

none (round critique level is `critic`; no low-confidence must-fix, no standoff, no wave choice).

## Scorecard

| Board | Part 1 | Part 2a |
|---|---|---|
| Main.dc.html (01, the flow) | C01, C03, C04 | C05, C06, C07 |
| BookPage.dc.html (02, the screen alone, static) | ok | ok |
| Widths.dc.html (03) | C03 | ok (mounts the ClearData part: C05, C06 apply when it is operated here; not re-run) |
| Elsewhere.dc.html (04) | ok | ok |
| TopStates.dc.html | ok | ok |
| HeadStates.dc.html | ok | ok |
| ContinueStates.dc.html | C01 | ok |
| NotesStates.dc.html | ok | ok |
| RowStates.dc.html | C01, C02 | C07 |
| ClearStates.dc.html | ok | ok |
| StateStates.dc.html | ok | ok |
| BookTop, BookHead, Continue, NotesEntry, BookState (part boards) | ok | ok |
| ChapterRow.dc.html (part board) | ok | C07 (the separator is in this part's markup) |
| ClearData.dc.html (part board) | ok | C05, C06 are this part's behaviour; its board draws only the idle default |

- **Component gaps:** none new. The system ships tokens and no components, so the drafter logged all seven drawn parts (BookTop, BookHead, Continue, NotesEntry, ChapterRow, ClearData, BookState) in `result.md`; the log is complete and no token change is asked.
- **Options:** none asked. One direction, as the handoff requires; no Direction boards, no decorative artwork.
- **2b notes for the operator:**
  - Signed-out rows keep an empty second line (the state words are absent by design), so each title sits high in a roomy row; the trade is a row height that never changes between signed in and signed out, against a list that looks top-heavy to a signed-out reader.
  - On a 20-chapter book at desktop, Continue reading scrolls away with the head and the slim top bar keeps only the title and progress; set against your "bookmark(where you left), more easy to another chapter", a reader deep in the list scrolls back up for their place. A Continue link in the slim bar would keep it in reach, at the cost of a busier bar.
  - "Versions" is a quiet plain-ink button beside the teal language links, so it reads as a caption until hovered; the trade is a calmer row against a control that is easy to miss.
  - "Clearing…" sets `aria-busy` and shows the pending label but no ring spinner; the system README's Busy line asks for the ring, while the signed reader's own busy button shows none (a progress cursor only), so this round follows the signed reader. Whether the ring joins the reader's look is your call.
  - In an all-legacy book (orchard) every row repeats the "ORIGINAL LAYOUT" tag, four of four; saying it once above the list would be calmer, at the cost of the per-row signal the signed reader's list gives.
- **The bar:**
  1. Every list item opens its own item: holds (37 rows over five books each open their own stand-in).
  2. A choice carries: holds (the stand-in names the chapter, section, language and version; Back returns to the same book).
  3. Search and filters change the data, counts true: holds (the page has no search or filter; head progress, row words, Continue, the notes entry and the clear confirmation's counts agree in the nine signed-in states I read).
  4. The state bar: open C01 (a handoff state no preset reaches), C03 (presets land below the first screen), C04 (stand-in preset label contradicts its screen). It is on every interactive Page, lists only that page's states, is visibly outside the design, and scrolls away with the page (the operator's bar.md rule 1: holds).
  5. No link leaves the prototype, no `#` placeholder: holds (`design-check` OK; every `#top` resolves; 0 dead links).
  6. Controls keep their size, the page holds still: holds (`layout-shift` 0; the Versions toggle is 96.5 x 44 px with both labels; "Clearing…" keeps the button's 151.5 px).
  7. The same list header in every state: holds ("Contents" plus its count in every book and viewer; the phases and per-slice books add one descriptive line by design).
  8. Hover restrained, label readable: holds (at least 5.17:1 in light, dark and sepia; sunken tint and underline only).
  9. Back links "‹", logo home, centred column, primary action: holds.
  10. One direction, no decorative SVG: holds.
  11. Toss-level lines: open C05 (focus and the decisive action out of sight), C06 (focus dropped on done), C07 (one relation, two steps).
- **Holds** (must survive the fixes):
  - The measured baseline: 0 issues, 20 PNGs, 123 states, `design-check` OK. My own sweep of the engine's contrast, target and clipped checks over all 19 book presets in light, dark and sepia at 1440 and 390 (114 runs) found none.
  - Rows, counts and carry as listed under the bar's lines 1 to 3; the versions "View" buttons carry `?lang=` and `?v=`; a private address and a missing book render the same 404 body.
  - Type and polish: no orphans, Korean titles wrap whole (`keep-all`), no sideways overflow from 320 to 1440, a solid 2 px accent focus ring in all three themes, no AI-slop item (no gradient, glow, nested cards or emoji).
  - The clear flow's other parts: Cancel takes focus on open, Escape and a mouse press on Cancel return focus to the trigger, Cancel keeps its place while pending and returns on a failure, the confirmation omits "bookmarks, highlights and notes" when there are none.
  - The Widths board's four frames follow one state bar; the compact top bar keeps title and progress; the stand-in pages reserve the tallest bar height.
  - `reader.css` is byte-identical to `01-reader/rounds/02-revise`; no token change; nothing added to `ds/`.
  - Logged departures accepted: the page's own list (departure 2), Sign in at every width (6), Cancel hidden rather than disabled while Clearing… (8; 2.85:1 measured), the ghost clear trigger (9), the text size fixed at 3 (10).
- **Not seen:**
  - The pressed (active) look of any control, and the in-flight "Clearing…" in dark and sepia (only light was captured live; ClearStates draws it in light and sepia).
  - Screen-reader output of the `role="status"` and `role="alert"` lines, and Enter or Space on Cancel (the harness's synthetic key events do not trigger a button's default action, so only Escape and the mouse were exercised).
  - The engine's click pass stopped at its caps (47 frame states against a cap of 48, 300 click steps, "some controls were not tried", 48 list rows skipped on Main). I covered the rest by hand: 37 rows over five books, every book preset in three themes at two widths (contrast, target and clipped checks only), the clear flow, the versions toggle, the stand-in screens.
  - No text field, picker or typed value exists on this page.
  - The sibling jobs (06-library, 08-review, 09-legacy-and-print were still drafting, `wave` named none) and the other jobs' own screens (only their stand-ins here); no cross-job look was made.
  - The system ships tokens and a README but no components, so there is no component API to check props against; the parts were judged by what they render.
