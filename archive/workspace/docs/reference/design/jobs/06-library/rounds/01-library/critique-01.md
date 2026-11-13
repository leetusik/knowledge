# Critique 01: 06-library/01-library

- pass: 01
- mode: critic
- verdict: revise
- confidence: high
- must_fix: 10 (part 1: 8, part 2a: 2)
- gaps: 1
- advisory: 4
- wave: 07-book-page, 08-review, 5 choices
- escalate: C05, C12, C13, C14, C15, C16
- preview: 324.5s, 141 states
- standard: .claude/agents/design-drafter.md

Evidence paths that start `pass-01/`, `hx/`, `crops2/`, `crops3/`, `crops4/`, `crops5/` or `wave/` are under the scratch directory
`/private/tmp/claude-502/-Users-sugang-projects-personal-knowledge/f0010d83-1939-47da-8f62-5ffe37557260/scratchpad/critic-06-01/`.
`pass-01/` is the `design-preview --phone-click` output (19 PNGs, 141 states, `preview.json`); `hx/` and `crops*/` are my own
harness shots and measurements (the engine's in-page checks re-run per theme, hover, focus, text size, reduced motion);
`wave/` holds the two sibling renders. State numbers are the `n=` of `preview.json`; on the phone view the numbering sits one
below the desktop one from 'Rail folded' on, because that preset adds no state at 390 px.

`design-check 06-library`: OK (1 job, 1 round, 18 boards). The render measured 19 issues: 18 `check=layout-shift` lines (Main 8,
Widths 10) and one `check=frame-clip`; no `contrast`, `target`, `clipped`, `dead-link`, `unreachable`, `page-clip`,
`same-target` or `hover-contrast` line on any board.

## Findings

### C01 · must-fix · part 1 · open
- board: PublicLibrary.dc.html · view: frame · state: 00
- finding: The board's frame is 7 px shorter than its content, so the canvas clips the bottom of the page.
- evidence: `issue ... check=frame-clip: content is 1017px tall in a 1010px frame: the canvas clips the rest`
  (`preview.json` boards/PublicLibrary.dc.html/views/frame/issues[0]; `canvas.json` `h` 1010; `pass-01/PublicLibrary.frame.png`).
  The lost 7 px is the page's bottom padding under the last row. Drafter line 50: `h` is the real height at `w`, over-tall
  beats clipped.
- confidence: high · found_by: measured

### C02 · must-fix · part 1 · open
- board: Main.dc.html (frame and phone) and Widths.dc.html · view: frame, phone · state: 00 (presets 'Continue · one item', 'Continue · 한국어 first')
- finding: The Continue presets resize the Continue lead card, a link target, by more than 4 px, so the page does not hold still
  across states (bar line 6; drafter line 125).
- evidence: measured lines, all `check=layout-shift`:
  - Main frame, 'Continue · one item': 'Chapter 2 of 5 The knowledge ma…' 604.8x279 -> 1024x244px;
  - Main frame, 'Continue · 한국어 first': 604.8x279 -> 604.8x244px; Main phone, same preset: 356.4x299 -> 356.4x245.5px;
  - Widths, the same two presets: 604.8x279 -> 1024x244px, 604.8x279 -> 604.8x244px, and at 820 px 775.2x243.1 -> 775.2x208.6px.

  The cause is content, not a control state: one item makes the lead span the whole 1024 px column (`pass-01/Main.frame.state-03.png`,
  with the right half of the card empty), and the Korean title wraps to two lines against the English title's three. The
  lone lead stretching across the column also contradicts the drafter's own departure 5, where a lone book card keeps the
  column width (`auto-fill`) so that it does not stretch. If the drafter holds that a lead sized by its content is by design,
  it can rebut the Korean line; the full-width lone lead is the stronger defect.
- confidence: medium · found_by: measured

### C03 · must-fix · part 1 · open
- board: Main.dc.html · view: phone · state: 00 -> 13
- finding: At 390 px the bottom nav jumps 44 px up when the page shows the failed state and 44 px back on Try again, because the
  short state does not fill the frame (bar line 6; drafter line 125, header, nav or main moved).
- evidence: `check=layout-shift: clicking 'Failed to load' moves the page: nav.kb-navbar y 785->741` and
  `clicking 'Try again' moves the page: nav.kb-navbar y 741->785`. In `pass-01/Main.phone.state-13.png` the bar floats at
  y 741-800 with about 70 px of empty page between the ref line and the bar, sitting on the foot strip, where in every long state
  it rests at the foot of the frame (`pass-01/Main.phone.state-12.png`). The shell root should fill the frame so the bar keeps one
  y in a short state.
- confidence: high · found_by: measured

### C04 · must-fix · part 1 · open
- board: Main.dc.html and Widths.dc.html · view: frame · state: 00 and 10 (Main), 00 (Widths)
- finding: Folding the rail ('Rail folded' preset, 'Navigation' toggle) moves main and re-flows the lead and rows, and the round's
  gap log does not list it, so the build is not told.
- evidence: measured lines: `clicking 'Rail folded' moves the page: main#main-content x 240->16, header.lib-head x 328->208`
  (the same for 'Navigation', and back 16->240 at state 10); on Widths the lead 729.6x241.5 -> 572.2x279px, the 'Chapter 11 of 20'
  row 729.6x88.6 -> 381.5x88.6px, main x 1567->1327. The fold is the locked shell's own behaviour (handoff REFERENCE: a fold
  toggle at the topbar's far left hides the rail; the shell's structure, including the fold, is not this job), so the drafter
  may not redesign it; the work is to log it under Component and token gaps and in `build-prompt.md`: "the shell's fold
  re-centres main and re-flows the lead and rows". `result.md`'s gap list does not mention the fold, and the build prompt says only
  "Folded, the rail is gone and main takes the width" (lines 139-141). An unlogged gap is a Part 1 must-fix (the log feeds the build).
- confidence: medium · found_by: measured

### C05 · must-fix · part 1 · escalated
- board: Main.dc.html (and Widths.dc.html) · view: frame, phone · state: 16, 17, 18, 19 (phone 15-18), the four 'Clear all' presets
- finding: The four 'Clear all' presets set the state but leave the page at the top, so the confirmation, the clearing button, the
  cleared line and the failure sit 1,170 to 2,190 px below the first screen and nothing visible happens when the preset is
  pressed (bar line 4; drafter line 69: a preset lands exactly where clicking would).
- evidence: harness, after each preset, `scrollY` 0 and the state's element not in view:
  - Main at 1440x900: confirming and clearing panel y 2462-2801, cleared line y 2072-2094, failure line y 2479-2541;
  - Main at 390x844: panel y 3030-3459, cleared line y 2332-2382, failure line y 3047-3131;
  - Widths at its own 3866 px: the four frames stay at scrollTop 0 and the panel or line sits 2,099 to 3,713 px down frames that are
    770 to 1,182 px tall, in view in none.

  `hx/inter/preset-clear-confirm-1440.png` and `hx/inter/preset-clear-confirm-390.png` show the top of the page unchanged but for
  the pressed button. Clicking the trigger at the foot opens the panel in view. The drafter chose this and says so ("A preset never
  scrolls: it lands at the page's top, so the clear's presets leave the clear at the foot of the page", `result.md`, What was designed).

  The obvious fix is not free, which is why this is low confidence. Scrolling the page to the panel trips the engine: the shell's
  topbar is `position: sticky`, so a scroll reads as the header moving. I ran the engine's own state snapshot and
  `design_preview_shifts` on Main, pressed 'Clear all · confirming' and scrolled to the panel: `clicking 'Clear all · confirming' moves
  the page: header.kb-topbar y 88->1978`, a measured `check=layout-shift`. A dialog does not fit either: the handoff's REFERENCE says
  destructive confirmations are "inline and two-step, never a modal". So this is bar line 4 against bar line 6, and the drafter cannot
  settle both alone. Inside both lines: a short note in the bar's group while a clear preset is pressed ("the confirmation is at the
  foot of the page"), which narrows the gap and leaves the page still. Otherwise the operator rules which line yields.
- confidence: low · found_by: critic

### C06 · must-fix · part 1 · open
- board: Widths.dc.html, PublicLibrary.dc.html and Main.dc.html · view: frame · state: 20-26 (Widths)
- finding: The public org library is not an interactive page: its board is one static frame, its states live only on the Widths sheet
  inside one 32-button bar that also carries the member library's presets (two 'Loading', two 'Failed to load'), and a public
  preset moves the sheet to a different screen (bar line 4; drafter lines 62-70: only that page's presets, and a preset never moves
  to another page).
- evidence:
  - Widths bar dump (`hx/widthsbar.py`): one group named 'The library at four widths' with 32 buttons = 20 member-library presets,
    9 public ones ('Signed out' ... 'Failed to load') and 3 themes; duplicate labels 'Loading' and 'Failed to load'. Pressing
    'Signed out' replaces the member library with /@quillwork in all four frames (`pass-01/Widths.frame.state-20.png`), and
    any member preset puts the library back (checked at the board's own 3866 px: all 20 member presets land from the public
    screen, each lighting its own button, the first 'Loading' and 'Failed to load' included).
  - `preview.json`: PublicLibrary.dc.html `is_interactive` false, 0 states (`pass-01/PublicLibrary.frame.png` shows the signed-out
    state only).
  - Main.dc.html carries the group 'Public library · /@quillwork' (12 presets) and the four stand-in groups reached from it ('Book
    page, public view', 'Sign in', 'Home', 'Library — Larkspur'), but no click on the member library reaches the public page
    (29 controls listed; the org crumb is plain text and the wordmark stays on the library), so those five groups never show on
    the flow board.

  The states are reachable on Widths, so nothing is lost; the bar there lists two screens as one page. A bar per page (the
  public library as its own interactive Page, or Main given a way in) keeps each bar to its page.
- confidence: medium · found_by: critic

### C07 · must-fix · part 1 · open
- board: StateStates.dc.html · view: frame · state: 00
- finding: The Loading frames draw the skeleton at a column width the page never has: 432 px in the 1064 px desktop frame and in the
  776 px iPad frame, 192 px in the 390 px phone frame and in the 1064 px public frame, with the cards stacked in one column,
  while the board's own text says the skeleton "mirrors the page at that width".
- evidence: harness (the union of the skeleton blocks in each frame):
  - 'Loading · desktop main column' frame 1064, column 432 (x 316-748);
  - 'Loading · iPad portrait' frame 776, column 432 (x 172-604);
  - 'Loading · phone' frame 390, column 192 (x 99-291);
  - 'Loading · the public library' frame 1064, column 192 (x 436-628).

  The page's own Loading fills its column: 1024 px with a wide lead and three card columns at 1440 (`hx/dsk-13.png`), about 776 px
  with two card columns at 820 (`crops4/widths-820-loading2.png`), about 356 px at 390 (`pass-01/Main.phone.state-12.png`). The
  narrow column shows in `pass-01/StateStates.frame.png` (rows one and two, and the dark and sepia desktop frames) and at native
  size in `crops2/state-desk-native.png`. The board shows a layout the page never draws, so its Loading state is not the page's
  (Toss line, drafter line 138: loading shows the real structure).
- confidence: high · found_by: critic

### C08 · must-fix · part 1 · open
- board: Main.dc.html (phone view; the same shell on Library.dc.html and the Widths phone frame) · view: phone · state: 00
- finding: Larger text does not hold at phone width: at 175% text the page scrolls sideways because the five-item bottom bar
  outgrows 390 px, and at 200% the grouping control overflows too (bar line 11; drafter line 139 "larger text still hold", line 143
  "nothing overflows sideways").
- evidence: harness, root font size set on a 390x844 viewport, `By project · today`:
  - 150% holds (`scrollWidth` 390);
  - 175%: `scrollWidth` 445, Graph spans x 380-445;
  - 200%: `scrollWidth` 508, Documents x 301-434, Graph x 434-508, the 'By project | By subject' control ends at x 410 against 358 available.
  `crops4/bigtext-200-bar.png` shows 'Dashboard Docume…' cut at the right edge with Graph off screen. At a 360 px viewport the bar already
  overflows at 150% (`scrollWidth` 381). The five-item bar is the drafter's drawn answer to open question 3 (its own trade-off
  line names 78 px columns); the handoff's check, no label cut at 390, holds at 100%. The 480 px account menu at 200% is the locked
  shell's and is not charged.
- confidence: medium · found_by: critic

### C09 · must-fix · part 2a · open
- board: Main.dc.html (frame; the same CSS on Library.dc.html) · view: frame · state: 00
- finding: The library's own type has seven sizes where the standard asks for about four to six, with two pairs that are not visibly
  different steps: 11 px and 12 px mono caps, and 26.4 px and 30.4 px display.
- evidence: harness (computed font size of every visible text node in main, 1440 px): sans 13 and 15; mono 11 (tags, chapter labels,
  `.lib-label`) and 12 (group names, `.lib-group__name`); serif 18.4 (group titles), 26.4 (the page title 'Library') and 30.4 (the
  Continue lead's title). The locked shell adds 11.2, 11.52, 13.6, 13.76 and 14.4 px, which are not charged. Fails drafter line 107
  (about 4-6 sizes, each step visibly different) and line 150 (two values almost the same are one value). In
  `pass-01/Main.frame.png` the lead's title outsizes the page's own title by 4 px, a step too small to read as a decision, and the
  mono caps at 11 and 12 px sit side by side in one line (a group's name beside its tag: 'FIELD-NOTES · 2 documents · PUBLIC',
  `crops5/main-groups.png`). One mono-caps size, and a display step that is decisively larger or the same, would close it.
- confidence: medium · found_by: critic

### C10 · must-fix · part 2a · open
- board: ShellStates.dc.html · view: frame · state: 00
- finding: Several frames end with a hard cut through a line of text, with no fade or ellipsis, so the crop reads as an accident
  (drafter line 149: deliberate crops, never by accident).
- evidence: `pass-01/ShellStates.frame.png`:
  - 'Desktop · the rail, Library current' (light, dark and sepia) cuts 'Left off at The write path · 38%' through its x-height;
  - 'Desktop · the rail folded' cuts the lead title's third line ('Path, and the Contracts') and the first row's meta line;
  - 'Desktop · over 99 due in the rail' and 'Signed in on /@quillwork, not a member' cut a text line at the bottom edge.

  The board says "Each frame is the live page, cropped", so the crop is on purpose, but it ends neither on a block edge nor in a
  fade. The iPad and phone frames end cleanly.
- confidence: medium · found_by: critic

### C11 · gap · part 1 · open
- board: Main.dc.html (every board with a bordered control) · view: frame · state: 00
- finding: The system's `kb-border-strong`, the border of the grouping control and of the secondary buttons, measures 1.58:1 on the
  surface, below the 3:1 floor for UI parts (drafter line 113).
- evidence: `result.md` Measured contrast: 1.58, 1.56 and 1.64 in light, dark and sepia; the README names `kb-border-strong` for
  inputs. Each control is named by its label and the pressed state adds a fill and a 4.8:1 inset ring, so state never rests on the
  border alone. The drafter logged it as a system observation under the contrast table, not in the Component and token gaps
  list that feeds the build; it belongs there. For the operator and the system, not the drafter's to restyle.
- confidence: high · found_by: critic

### C12 · choice · part 2b · escalated
- board: Main.dc.html · view: frame, phone · state: -
- wave: 07-book-page/Main.dc.html and 08-review/Main.dc.html
- finding: The family is framed two ways: this job puts the library in the app shell, while the book page and the review sit in the
  reader's slim chrome with a '‹ Library' back link, so following that link changes the chrome from calm to dense.
- evidence:
  - this job: `pass-01/Main.frame.png` (topbar with wordmark, 'Org Quillwork', user and Sign out; a rail with a Reading and an Org group;
    a five-item bottom bar at phone, `pass-01/Main.phone.png`);
  - 07: `wave/07-book-page/Main.frame.png` (open-book mark and '‹ Library' in a slim bar, no rail, no org topbar; its result open question 2);
  - 08: `wave/08-review/Main.frame.png` (the same slim bar plus Settings and Display; its open question 2 says the frame is "a wave choice").

  Each drafter drew its own answer and logged the conflict (this job's open question 2 says the same). Neither side contradicts the
  system or a signed job. Trade-off: the shell keeps console and library one step apart but is denser than "kindle like"; the reader's
  chrome is calmer but the app's other places are one step further.
- confidence: medium · found_by: critic

### C13 · choice · part 2b · escalated
- board: Main.dc.html · view: frame, phone · state: -
- wave: 07-book-page/Main.dc.html and 08-review/Main.dc.html
- finding: The theme rule differs across the family: this job follows the operating system with no sepia, while the book page and the
  review follow the reader's Display setting.
- evidence:
  - this job: `/library` and a signed-in `/@{org}` follow the OS light or dark, no toggle, no sepia; the signed-out public page stays light
    (result open question 1; dark and sepia are drawn on every board so the operator can pick the other rule);
  - 07: "the reader's Display setting, for every reader, signed out included" (System, Light, Dark, Sepia from the reader-settings cookie;
    its result lines 257-263);
  - 08: the reader's Display setting and text size through the signed Display sheet (its result lines 219-223).

  Consequence: a reader in sepia leaves a book page or a review card and arrives at a library in the OS theme, a visible jump; carrying
  the setting into the library brings a reader-scoped theme, and its fourth option, into the app. The handoff's own open question 1
  states the same split, so no side contradicts a signed job.
- confidence: medium · found_by: critic

### C14 · choice · part 2b · escalated
- board: ClearStates.dc.html, ClearAll.dc.html · view: frame · state: 00
- wave: 07-book-page/ClearStates.dc.html and 07-book-page/ClearData.dc.html
- finding: The two "clear reading data" confirmations are one pattern drawn two ways, in wording and in form.
- evidence: `pass-01/ClearStates.frame.png` against `wave/07-book-page/ClearStates.frame.png`:
  - trigger: a neutral secondary button 'Clear all reading data' against a red-text ghost button 'Clear this book's reading data';
  - confirmation: 'Clear all reading data?' with a five-item list against 'Clear your reading data for this book?' with a three-item list;
  - keep line: "It can't be undone." against "You can't undo this.";
  - confirm button: 'Yes, clear all reading data' against 'Clear reading data' (both red, both 'Clearing…');
  - while clearing: Cancel stays, dimmed and disabled, against Cancel removed;
  - failed: a banner above the title ('Nothing was cleared. Something on our side stopped, so your reading data is as it was. Try again.')
    with 'ref · clr-5e81b0d4', against one inline line under the buttons ('Couldn't clear this book's reading data. Nothing was cleared. Try
    again.') with no ref;
  - cleared: 'All reading data cleared. Every book is back to Not started.' with the trigger still showing, against 'Reading data cleared. Every
    chapter of this book reads Not started, and there's no place to continue from.' with the trigger gone.

  The product's own delete confirmation, quoted in the handoff's REFERENCE, reads 'Delete permanently? This can't be undone.' /
  'Cancel' / 'Yes, delete' / 'Deleting…', inline, the button replaced by the prompt, an autofocused Cancel. This job's wording sits
  closer to it (a 'Yes, …' confirm, 'It can't be undone.'); 07's drops the 'Yes,' and rewords the keep line; both replace the trigger
  while confirming and both follow the inline two-step pattern. The `kb` README states no rule for the wording.

  This job's result assumed 07's per-book clear would use the same form and says a difference is the critic's wave choice. A search of
  the signed boards finds no 'Clear' wording and no 'Yes, ...' confirm label to follow, so neither side contradicts a signed job or the
  system; the REFERENCE pattern is data that leans toward this job's version.
- confidence: medium · found_by: critic

### C15 · choice · part 2b · escalated
- board: BookCardStates.dc.html, Main.dc.html · view: frame · state: -
- wave: 07-book-page/Main.dc.html (BookHead)
- finding: Book progress is drawn two ways for the same book: the bar sits above its label on the card and below it on the book page,
  and a book with nothing opened reads 'Not started · N chapters' on the card but '0 of N finished' on the book page.
- evidence:
  - this job: the card draws a 3 px bar, then '1 of 6 finished' under it (`pass-01/Main.frame.state-02.png`); an unopened book reads
    'Not started · 8 chapters' (`pass-01/BookCardStates.frame.png`), which is the handoff's own card state ("not started; started
    (X of M finished)");
  - 07: the head draws '2 of 5 finished' over its bar (`wave/07-book-page/Main.frame.png`) and, for a member, always `done of total finished`,
    zero included (`book.js` line 223; `BookHead.dc.html` line 21), the same rule the signed reader's chapter end uses.

  The handoff asks the card to match the reader's 'X of M finished' for the same book. The started and finished cases agree in words;
  the zero case and the bar order do not. Trade-off: 'Not started' says more than '0 of 8 finished' on a card, but one fact worded one way
  on both screens is easier to learn. No signed word is contradicted: the signed chapter end never shows a zero.
- confidence: medium · found_by: critic

### C16 · choice · part 2b · escalated
- board: ContinueStates.dc.html, Main.dc.html · view: frame · state: -
- wave: 07-book-page/Continue.dc.html and 08-review/Main.dc.html
- finding: The resume action and the offer of the next chapter are worded three ways across the family.
- evidence:
  - this job (`ContinueReading.dc.html`): place line 'Left off at {section} · {pct}%', lead button 'Continue →'; after a finished chapter the
    eyebrow 'Up next · you finished chapter 2' with 'Start chapter 3 →';
  - 07 (`Continue.dc.html`): 'You stopped at {section}, {pct}% of the way in.', button 'Continue reading →'; eyebrows 'CONTINUE · CHAPTER 2'
    and 'NEXT · CHAPTER 3', buttons 'Read next', 'Read chapter N', 'Read chapter N again';
  - 08 (`review.js` line 424): 'Continue reading →' as the way on at the end of the queue.

  The signed reader's resume line is 'Picked up where you left off', closer to this job's 'Left off at'; 07's 'You stopped at' is the outlier on
  that phrase, which is for 07's own critic. What stays open is one name for the action ('Continue' or 'Continue reading') and for the
  next-chapter offer ('Start chapter 3' or 'Read next'). The handoff names "Continue reading" as the contract's word.
- confidence: medium · found_by: critic

## For the judge

- C05: low confidence (the one fix that lands the state, a scroll, trips `check=layout-shift` on the shell's sticky topbar, and a dialog is
  against the REFERENCE's inline two-step rule; the judge says whether bar line 4 or line 6 yields, or whether a bar note settles it).
- C12: wave choice (frame: app shell against the reader's slim chrome).
- C13: wave choice (theme rule: OS and no sepia against the reader's Display setting).
- C14: wave choice (the two clear-reading-data confirmations differ in wording and form).
- C15: wave choice (book progress: bar and label order, and the zero-state wording).
- C16: wave choice (resume and next-chapter wording).

Under `critic+judge` the judge rules on these six: the one low-confidence must-fix (C05) and the five wave choices. No other must-fix is below medium confidence and no `pass` is on offer.

## Scorecard

| Board | Part 1 | Part 2a |
|---|---|---|
| 01 Main.dc.html (flow) | C02, C03, C04, C05, C08 | C09 |
| 02 Library.dc.html | C08 (the shell's phone bar) | C09 |
| 03 PublicLibrary.dc.html | C01, C06 | ok |
| 04 Widths.dc.html | C02, C04, C05, C06, C08 | ok |
| 05 Elsewhere.dc.html | ok | ok |
| 06 ShellStates.dc.html | ok | C10 |
| 07 BookCardStates.dc.html | ok | ok |
| 08 DocRowStates.dc.html | ok | ok |
| 09 ContinueStates.dc.html | ok | ok |
| 10 GroupingStates.dc.html | ok | ok |
| 11 ClearStates.dc.html | ok | ok |
| 12 StateStates.dc.html | C07 | ok |
| 13-18 Mounted parts (BookCard, DocRow, ContinueReading, Grouping, ClearAll, LibraryState) | ok | ok |

**Component gaps**
- C11: `kb-border-strong` at 1.58:1 as the control border (the system's own value; logged by the drafter only as an observation).
- The `kb` system ships no component bundle, so every part is markup in its own file and none is mounted through `x-import`; the
  drafter logged this as the handoff says (Book card, Loose document row, Continue reading, Grouping control, Clear all reading
  data, Library states, the shell's entry points). Not a finding.
- The shell's fold re-centres main and re-flows the lead and rows: not yet in the gap log (C04).

**2b notes for the operator**
- Dark and sepia are drawn in full on the Book card, Loose document row, Grouping control and State boards, but only for key states on
  the Shell entry points, Continue reading and Clear all boards; every state in every theme is reachable on Main and Widths through the
  theme row.
- Under a subject heading, a card or row whose project shares the subject's name (the sample's AI, English and Finance) repeats the
  heading as its small label; hiding a label that equals its heading would read cleaner. The handoff's sample data causes it.
- The rail's Review entry reads 12 here (3 for a visitor) while 08-review's queue opens on 14 due; one figure for the shared sample day
  would keep the family consistent. This is sample data, not style.
- Books are bordered white cards and documents are hairline rows. The system's character is "hairlines instead of boxes", and the
  references are "kindle like" and "good.", which points the other way (a Kindle library is a grid of book objects). Cards give a book
  its own object and a progress bar at a glance; hairline rows with the same 3 px bar would sit closer to a well-set page, at the cost of
  the grid. A taste call.

One direction, as the handoff asks (`new visual direction: no`, the operator asked for no options); no options to rank.

**The bar** (the operator's line, then the shipped bar; drafter-file lines in brackets)
1. Every list item opens its own item [57]: holds (two different rows of each list open two different stand-ins; no `same-target`).
2. A choice carries [53-55]: holds (the book picked and the grouping chosen are the ones shown next).
3. Search and filters change the data, counts true [58]: holds ('4 books · 8 documents' by project; '6 books · 11 documents' with
   subjects; the shelf counts sum to the head's).
4. The state bar on every interactive Page, only that page's states, every handoff state reached, visibly outside the design [62-75]:
   open, C05, C06. (Operator rule that the bar scrolls away and is never pinned: holds on Main and on each Widths frame.)
5. No link leaves the prototype; no unexplained `#` [60]: holds (`design-check` OK; the `#top` handlers are named in the build prompt).
6. Controls keep their size and the page holds still [125]: open, C02, C03; C04 (to log).
7. The same list header in every filter and search state [119]: holds.
8. Hover on primary and secondary controls [126]: holds (a tint and an underline; no `hover-contrast` line).
9. Back links with a chevron, logo home, centred column, aligned figures, decisive primary [115-121]: holds.
10. One direction, no decorative SVG [165-167, 161]: holds (icons of 24 px or less only).
11. The Toss-level lines [133-139]: open, C08 (larger text) and C07 (the Loading structure drawn wrongly on its board); the rest hold
    (one primary action, a reason for every destructive step, Korean `keep-all`, long titles).

**Holds** (must survive the fixes)
- Every screen and state the handoff lists is reachable: on Main both groupings, a one-article subject as a loose document, Continue
  reading in each form (one item, 한국어 first, just finished a chapter, nothing opened, everything finished), long and many, loading,
  failed, empty, the four clear states, the folded rail, the Review count at 0, 12 and 99+; on Widths the public library's outcomes.
- All three themes at 1440 and 390 on every library preset: 0 contrast, target and clipped problems (the engine's in-page checks
  re-run per theme, `hx/themes/`). Dark and sepia look coherent.
- The clear flow: Cancel takes the focus, Escape cancels, 'Clearing…' keeps the button's width, the cleared line appears and Continue
  reading goes, and the failure says nothing was cleared (`hx/inter/`).
- Keyboard: a 2 px accent ring with a 2 px offset on every stop (5.39:1 light, 7.96:1 dark), every target 44 px.
- Reduced motion: the skeleton shimmer and the spinner animation are `none`, transitions `0s`.
- Phone: the longest real title wraps at 390, the Korean title wraps with `keep-all`, 'Show all 20 documents' folds, and nothing
  scrolls sideways at default text.
- The state bar scrolls away with the page, reserves the tallest height (88 px on Main), shows an 'only state' note on the stand-ins,
  and its pressed preset matches the state.
- BookCardStates, DocRowStates and GroupingStates are complete in all three themes; the six mounted parts are logged and required
  by drafter line 38 (every `.dc.html` is a board).
- `design-check` OK; no `leaves-canvas` or `same-target-list` warning.

**Not seen**
- Hover, focus and pressed looks as pictures: hover only through the engine's contrast measure, focus through the computed outline and
  a Tab walk; no native picker exists on this canvas.
- The engine skipped 58 Main and 26 Widths row clicks (it samples three per list); I clicked a sample of rows and all three Continue
  rows myself, not every row.
- The iPad 820 and 1024 widths beyond the Widths sheet (no click run there), and text above 200%, OS forced-colours and a screen reader.
- The real `DELETE state?scope=all` call: the clear is simulated on the canvas.
- 09-legacy-and-print: its drafter had not returned, so it is not in `wave:` and was not rendered; the legacy chapter and document
  stand-ins here are this job's own.
- No component bundle exists for `kb`, so no README props could be checked; `ds/kb/README.md` was read for the tokens and content rules.
- Widths is drawn for a 3866 px board. Opened in a window narrower than that (my first pass used 1440), its four frames overlap and
  cover each other's bar rows; at 3866 nothing is covered and every bar button is clickable (checked for all four bars). All Widths
  claims above rest on the 3866 px render, the engine's own, or the DOM listing.
- The drafter's render log was not read on purpose. Two keyword searches of `result.md` printed five lines of it by accident: three on
  the rail fold and two on the clear presets' scrolling (they say it once scrolled those presets and stopped). No finding rests on
  them. C04 rests on the handoff's REFERENCE and my own measured lines; C05's finding rests on my own preset measurements, taken before
  I saw those two lines, and its sticky-topbar conflict is my own run of the engine's functions (above), not taken from the log.
