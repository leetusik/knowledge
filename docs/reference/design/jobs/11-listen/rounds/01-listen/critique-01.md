# Critique 01: 11-listen/01-listen

- pass: 01
- mode: critic
- scope: cross
- verdict: revise
- confidence: high
- must_fix: 8 (part 1: 6, part 2a: 2)
- gaps: 0
- advisory: 1
- escalate: C08
- preview: 475s, 169 states (re-rendered: `Main.dc.html` was newer than the drafter's `preview.json`)
- standard: .claude/agents/design-drafter.md
- open_items: C01, C02, C03, C04, C05, C06, C07, C08

## Findings

### C01 · must-fix · part 1 · open
- board: Main.dc.html · view: frame · state: -
- finding: Stop listening throws away the listener's position across pages. After stopping at Chapter 4 · 12:30, the chapter offers a fresh "Listen · Chapters 4–5" and the book landing a fresh "Listen · 5 chapters · about 4 h", with no "Continue listening · Chapter 4 · 12:30" anywhere, so anyone who stops loses their place.
- evidence: harness (Main): Left part-way → Continue listening → Open the player → Stop listening → reader head "Listen Chapters 4–5 · about 1 h 30 min" → ‹ back link → landing "Listen 5 chapters · about 4 h"; `<scratch>/f2-02-book-after-stop.png`. frame.md F17: "Start over, Stop listening and Update audio lose nothing (the position is kept …)". Main's `onListen(null)` keeps `saved` at the false a started Listen set. Bar line 2 (a choice carries).
- confidence: high · found_by: critic

### C02 · must-fix · part 1 · open
- board: Main.dc.html · view: frame · state: -
- finding: The speed the listener chose is dropped when a new Listen starts in the reader. Set to 1.5×, then Stop listening and Listen again in the chapter, and the player opens at 1×.
- evidence: harness (Main): Listening, docked → chapter row 3 → Open the player → Speed 1.5× → Stop listening → Listen → Open the player → row reads "Speed 1×". frame.md F3 ("remembered per listener (not per document)") and F33 ("Speed and Follow along carry from one Listen to the next"). A Listen started from the landing does carry it; one started from the reader does not. Bar line 2.
- confidence: high · found_by: critic

### C03 · must-fix · part 1 · open
- board: Main.dc.html · view: frame · state: -
- finding: In the flow, when the first part is ready on a book not yet made, the opened player gives the length as "0:00 of 38:20". It claims the whole chapter is made when only the first 3 minutes are, and the reader's note beside it says "The first 3 min are ready to play".
- evidence: harness (Main): Never listened → Listen → wait for Ready → Open the player → `.pl-pos` "0:00 of 38:20"; dock "Ready to play · the rest is preparing". The player alone draws this state as `soFar: true, len: '3:05'` (Player "First part ready" preset). The Listen that Main carries on this path never gets `soFar`/`len` (F23). F2: "A unit not yet made shows no length"; `… of 3:05 so far` is the format. Bar line 2; handoff: "the progress never pretends precision it lacks".
- confidence: high · found_by: critic

### C04 · must-fix · part 1 · open
- board: Main.dc.html · view: frame · state: -
- finding: The same preparing Listen (chapter 1, part 1 of 9) shows two different times left on two pages: "about 2 h left" on the landing and "about 1 h 30 min left" in the chapter and the player. Moving between the two, the estimate jumps.
- evidence: harness: Main Never listened → Listen → reader note "Chapter 1 of 5 · about 1 h 30 min left."; ‹ back → landing "Chapter 1 of 5 · about 2 h left."; Main reader preset "Chapter 1, preparing" → player "Chapter 1 of 5 · about 1 h 30 min left." (`<scratch>/f4-player-preparing.png`). frame.md F31 settles the book's first step as "`Chapter 1 of 5 · about 2 h left.`"; "about 1 h 30 min" is F18's chapter 2 figure. This is one shared fixture figure with two answers.
- confidence: high · found_by: critic

### C05 · must-fix · part 1 · open
- board: Main.dc.html · view: frame · state: -
- finding: Opening the player on a preparing book chapter changes the dock behind the sheet from "Preparing… · part 1 of 9" to "Preparing… · part 3 of 12". The figure belongs to the loose document, so the dock contradicts the reader and the player the moment the sheet opens.
- evidence: harness (Main): reader preset "Chapter 1, preparing": dock "Preparing… · part 1 of 9" → Open the player: the dock behind reads "Preparing… · part 3 of 12" (`<scratch>/f4-player-preparing.png`). frame.md F32: "A book chapter is made in 9 parts … (every chapter; the reader's and the player's figure)"; F23 `part` is carried.
- confidence: high · found_by: critic

### C06 · must-fix · part 1 · open
- board: Main.dc.html · view: frame · state: -
- finding: Close has two answers. On the canvas it moves the reader to the Listen's chapter: from chapter 3 with chapter 4 docked, opening the player swaps the page behind to chapter 4, and Close leaves the reader there. The round's `## Build` says the product's Close "reveals whatever page lies under it (the landing included)". Either the operator signs one behaviour and the build ships the other, or the build has to pick.
- evidence: harness (Main): Listening, docked → row 3 (h1 "knowledge's read surfaces…") → Open the player: the page behind shows chapter 4 (`<scratch>/f3-player-Phone390.png`, "CHAPTER 4") → Close → h1 "Shipping and running knowledge…". `result.md` `## Build`, *The wiring*: "Close returns to the chapter (or document) of the Listen" and, in the same bullet, "Close reveals whatever page lies under it". frame.md F8 ("Close and Go to the text return focus to the dock") and F33. One answer per shared choice.
- confidence: high · found_by: critic

### C07 · must-fix · part 2a · open
- board: Main.dc.html · view: frame · state: 14
- finding: At the Desktop window, the product header shifts between the landing and the chapter. Click from one to the other and the logo and back link jump 10.2 px sideways and the bar drops 4 px, so the shell does not hold still across the flow.
- evidence: harness measurements (Main, Desktop): landing `header.bk-top` y 71, x 0, w 1440, logo x 28.8, back link x 78.4; reader and player `.rd-top` y 75, x 1, w 1438, logo x 18.6, back link x 68.2. At Phone 390 and 320 the logo x is equal (533.2 / 568.2). The reader's window is 1438 px inside its 1 px border, just under `@container rd (min-width: 90rem)`, so it takes `--kb-app-gutter` while the 1440 landing takes `--kb-app-gutter-wide` (frame.css lines 53–54). Craft standard: "Edges align … nothing is off by a few pixels"; the cross scope's shared-edges check.
- confidence: high · found_by: critic

### C08 · must-fix · part 2a · escalated
- board: Main.dc.html · view: frame · state: 25
- finding: Opening the player replaces the page behind the sheet with a different drawing of it. Behind "Our bar: performance rule v1" the column shows the maintainer guide's paragraphs. The chapter head loses "of 5", the published line and the Listen note, and the follow-along mark sits on a paragraph the reader never had. So the "column behind stays readable" the handoff asks for shows text the person was not reading.
- evidence: `<scratch>/f6-doc-player-dark.png` (the document's headline over "knowledge is a hosted library…" paragraphs); `<scratch>/f4-player-preparing.png` ("CHAPTER 1", where the reader at `.preview/11-listen/01-listen/Main.frame.state-14.png` shows "CHAPTER 1 OF 5" and the chapter's contents list). Logged as open item player-Q2 ("uses the signed English fixture paragraphs for every unit"), with no reason that makes it hold in the joined flow, where the operator sees the page change under the sheet. Craft: "Start from context"; handoff player check "the column behind stays readable or dimmed".
- confidence: medium · found_by: critic

### C09 · advisory · part 2b · open
- board: Main.dc.html · view: frame · state: 03
- finding: On desktop the dock sits in the landing's narrow side column (384 px, x 176) and in the reader's centred text column (576 px, x 432). Following the flow, the player you just started moves and changes width as you go into the chapter. F31 chose this, and it trades one dock position for a dock that belongs to each page's own track.
- evidence: harness measurements (Main, Desktop): landing dock [176, 782, 384 w]; reader dock [432, 835, 576 w].
- confidence: medium · found_by: critic

## For the judge

Under `critic` alone this list goes to the operator, marked unsure.
- C08 · standoff: the drafter logged the stand-in as player-Q2. The critic finds the reason does not hold in the joined flow, where the page visibly changes under the sheet.

## Scorecard

| board | Part 1 | Part 2a |
|---|---|---|
| 01 Main.dc.html (the flow) | C01, C02, C03, C04, C05, C06 | C07, C08 |
| 02 Book.dc.html (sheet only) | ok | ok |
| 03 Reader.dc.html (sheet only) | ok | ok |
| 04 Player.dc.html (sheet only) | ok | ok |
| Frame boards (Shell, ShellStates, ChapterBar, Dock, DockStates, ListenNote, ListenNoteStates, Listen, ListenStates, IconStates) | ok | ok |

- Component gaps: none new.
- 2b for the operator: "On desktop the dock sits in the landing's side column and moves to the centred text column when you open the chapter (F31); one place for it would trade away the landing's two-column track." (C09)
- **The bar:**
  1. holds (landing rows 1, 2, 3 and 5 open their own chapter; clicking row 3 leads to chapter 3);
  2. C01, C02, C03, C05;
  3. not applicable (no search or filter);
  4. holds: one bar on Main, only the page on screen's group visible, presets land, Window and Theme carry across pages, chrome exempt;
  5. holds: no link leaves the canvas; "‹ Library" is inert as F20 says;
  6. holds: the layout-shift lines are the Window presets (a device change) and the signed in-chapter contents anchors;
  7. not applicable;
  8. holds: no `hover-contrast` line on any Page;
  9. holds for the chevron back links ("‹ knowledge maintainer guide", "‹ Book", "‹ Library"); the landing's off-centre margins (85 / 176) are its signed two-column layout;
  10. holds: one direction; inline SVG is 24 px media icons only;
  11. C03 (the progress claims precision it lacks), C01 (losing your place).
- **Holds:** the entry reaches every surface by clicks: landing → Listen → chapter playing → Open the player → Close / Go to the text → back in the chapter → ‹ back link → landing. Continue listening opens Chapter 4 at 12:30 and the player says "12:30 of 58:40". Next chapter in the player carries to the reader (chapter 2 on Close). A never-made book goes Preparing… → Ready by itself and the landing shows the same note. The Korean document carries "우리의 기준: 성과 규칙 v1" to the dock and the player with `lang="ko"`. Theme and window carry across pages. Listen controls are 44 px on every page (landing 44, reader 44). The dock's height, lead and chevron are identical on the landing and the reader (65.2 / 44 / 44). The words match F1 everywhere I looked (Continue listening, Start over, Go to the text, Stop listening). The frame boards show every state (DockStates holds all 18 state keys plus outdated and dark). `design-check`: OK, no `pending-link`, no `unlinked-page`, no `leaves-canvas`. `self_check=pass` on all four Pages.
- **Not seen:** the hovered, focused and pressed looks of the flow's controls (not shot); the player's 20-chapter list and the landing's long list beyond the sampled rows; Escape and the scrim tap as ways to close; iPad 820 measured only on the sheets, not with the harness. Out of this scope: `design-check`'s token-drift warning on PlayerPanel (join-W1, page player's file), and each page's own measured lines, which the page critiques own. Main's `cramped-padding` (state 15) I judged on a 2× crop as a measuring artefact: the title box ends 9.6 px before the chevron, with an ellipsis (`<scratch>/f8-dock-desktop-ch4.png`).
