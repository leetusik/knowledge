# Critique 01: 05-annotations/01-annotations

- pass: 01
- mode: critic
- verdict: revise
- confidence: high
- must_fix: 10 (part 1: 8, part 2a: 2)
- gaps: 0
- advisory: 4
- wave: 02-figures, 03-diagrams, 04-quiz, 2 choices
- escalate: C08, C11, C12
- preview: 379.6s, 141 states
- standard: .claude/agents/design-drafter.md

## Findings

Evidence paths are relative to the scratch root `/private/tmp/claude-502/-Users-sugang-projects-personal-knowledge/f0010d83-1939-47da-8f62-5ffe37557260/scratchpad/critic-05-annotations-01` (`pass-01/` is the engine render, `h/` my harness captures, `wave/` the three sibling renders). The engine stopped at its caps ("state cap 48 reached", "click cap (300 steps or 120s)", 4 list rows skipped), so I also pressed every preset by hand at 1440 and 390 (33 chapter presets, 5 plain-document, 5 book-list, 34 on Widths). Engine totals: 36 PNGs, 0 failed, 101 issues (100 `layout-shift`, 1 `frame-clip`), 141 states. `design-check 05-annotations` printed `OK -- 1 job(s), 1 round(s), 35 board(s)` with no warnings. Engine lists for `contrast`, `target`, `clipped`, `dead-link`, `image`, `name`, `overflow`, `unmounted`, `runtime-error`, `click-error` and `unreachable` are all empty.

### C01 · must-fix · part 1 · open
- board: PopStates.dc.html (08 · Component — Highlight popover) · view: frame · state: 00
- finding: The board is 38 px shorter than its content, so the canvas clips the bottom of it.
- evidence: Measured. `preview.log` line 255: `issue board=PopStates.dc.html view=frame check=frame-clip: content is 2798px tall in a 2760px frame: the canvas clips the rest`. `canvas.json` has `h: 2760` for this board. Drafter file L77: "Size each Components board to hold its states". Raise `h` (and `$preview`) to at least 2798. `pass-01/PopStates.frame.png`.
- confidence: high · found_by: measured

### C02 · must-fix · part 1 · open
- board: Main.dc.html (01 · Page — Reader with marks, the flow) · view: frame and phone · state: 11 (Highlight with a note)
- finding: The popover's "Edit note" button is 5 px wider once it turns into "Save note", so a control changes size when the popover changes mode.
- evidence: Measured, `check=layout-shift` on both views: "clicking 'Edit note' resizes 'Edit note' (now 'Save note') 91.8x44 -> 96.9x44px (a control keeps its size when it shows its state)". `NotePop.dc.html` L20 and L25 draw the two buttons in separate branches, so nothing ties their widths. Drafter file L125 ("Controls never change size or move what is around them when they show state") and bar line 6. Give both one `min-width` (97 px, the longer label), or use the shared-cell pattern the round already has for "Bookmark this position" / "Bookmarked here" (`.an-btn-w`, annot.css L109-111).
- confidence: high · found_by: measured

### C03 · must-fix · part 1 · open
- board: Main.dc.html (page "Notes in this book": states All notes, Bookmarks only, 100 items; the same wiring on Widths) · view: frame and phone · state: -
- finding: Deleting a row on the Notes in this book page removes it with no undo line, while the same Delete in the Notes sheet and in the popover shows "Highlight deleted. Undo".
- evidence: Harness at 1440 and 390: press the Notes preset, click "All notes in this book →", press Delete on the first row. The list goes 33 → 32 rows and the count line reads "32 items in 4 chapters · 2 approximate · 2 unanchored"; no `.an-slot--toast` exists on the page. Pressing Back within 10 s lands on the chapter with "Highlight deleted. Undo" showing there instead, so the undo line follows the reader to the next screen but not to the page where the delete was made. The sheet and the popover show it (Main frame state 16, `pass-01/Main.frame.state-16.png`; `h/sheet_del_390.png`, `h/sheet_del_1440.png`); the page does not (`h/book_del_390.png`, `h/book_del_1440.png`). Cause: `flow.js` `bookProps()` (L512-519) returns no `toast` or `onUndo`; `Main.dc.html` L19 forwards `toast="{{ b.toast }}" on-undo="{{ b.onUndo }}"` (both undefined) although `BookNotes.dc.html` has the slot (L28, `hasToast` L86) and `annot.css` the `.an-slot--page` position. The drafter's own build prompt says "On the per-book list page, the line sits `kb-space-md` from the bottom" (build-prompt L359), and result.md L134 says "press Delete on a Page; the line leaves by itself after ten seconds"; no departure logs the book page as an exception. Handoff L213-214: "a deletion is clear before or as it happens"; L256: orphans in the list are "deletable". Bar line 2 (the act carries to the next screen, not to its own).
- confidence: high · found_by: critic

### C04 · must-fix · part 1 · open
- board: Main.dc.html (01 · Page — Reader with marks) · view: frame and phone · state: 01 (Marks in the text)
- finding: Keyboard focus goes back to the control that opened a margin-note popover only the first time; from the second open and close it is dropped to the page, so a keyboard user loses their place.
- evidence: Harness, three open-and-close rounds with Escape. At 1440 the opener is a margin-note button (`.an-mi`): `document.activeElement` after each close is `BUTTON.an-mi`, then `BODY`, then `BODY`; the same by mouse click and by Enter. At 390 the opener is the "Note on this diagram" row (`.an-row`): `BUTTON.an-row`, `BODY`, `BODY`. The opener node is still connected each time. A plain highlight mark has no tab stop and leaves focus on BODY: that is the Q10 gap the drafter logged and I do not count it. result.md L124-126 says the popover "returns it to the mark (or the control) that opened it when it closes"; the handoff's floor is "every control operable by keyboard" (L391). Where to look (not verified as the cause): `Reader.dc.html` L121-127 stores `document.activeElement` when the popover appears, and `NotePop.dc.html` L72-75 focuses its own box on mount, so what is stored is not reliably the opener. Recording the opener at the opening click or keydown would not depend on that order.
- confidence: high · found_by: critic

### C05 · must-fix · part 1 · open
- board: Widths.dc.html (03 · Page — The reader at 390, 820, 1024 and 1440) · view: frame · state: -
- finding: The state bar's one group, "The reader at four widths", holds presets that put another page on screen in all four stages (the book's list and the legacy chapter), which the bar's recipe forbids.
- evidence: Harness: 'Notes in this book' and 'Notes in this book · 100 items' put the h1 "Notes in this book" in all four stages; 'Legacy chapter · Bookmark' puts "Legacy reader — another job" in all four (`h/w_Notes_in.png`, `h/w_Legacy_chapter.png`; the three buttons are in the bar on `pass-01/Widths.frame.png`). The signed round's Widths bar had 20 presets and every one of them stayed on the Reader (I pressed each). Drafter file L70: "A preset never moves to another page; the page changes only by clicking the prototype itself"; bar line 4 ("lists only that page's states"). Those two pages already have their own groups on Main ("Notes in this book", 5 presets; "Legacy", 2). I read the handoff's "each state drawn at phone, iPad and desktop" (L185-187) as the likely reason for putting them here, but it does not lift the recipe, and departure 2 in result.md does not log this. Keep the Widths bar to the reader's states and show the book list and the legacy chapter at the other widths another way (their own boards); the legacy page also needs a click route on Main (C07).
- confidence: medium · found_by: critic

### C06 · must-fix · part 1 · open
- board: Main.dc.html (groups "Reader · a chapter" and "Reader · a plain Markdown document") and Widths.dc.html · view: frame and phone · state: -
- finding: Some presets do not show as pressed after they land, so the bar does not say which state the page is in.
- evidence: Harness: press each preset exactly from the top of the page, wait 2 s, read the group's `aria-pressed` buttons; repeated at 1440 and 390 with the same result. "Reader · a plain Markdown document": 4 of 5 stay unpressed after landing ('Top of document', 'At a bookmarked position', 'Selecting text', 'Notes'); only 'Signed out · Bookmark' lights up. "Reader · a chapter": 32 of 33 hold; 'Editing a note' leaves `pressed: []` for the whole 5 s I watched, with the edit field on screen. Widths: 'Markdown document · bookmarked position' and 'Markdown document · selecting text' stay unpressed. The 5 presets of "Notes in this book" all hold. In the signed round's Main the plain-document presets (Top of document, Reopened at saved section, End of document, Signed out) all held, so this is new. Drafter file L69: "the pressed preset is the one matching the current state". Where to look (not verified as the cause): `sig()` (flow.js L137-148) includes `RD.stateOf(s.prog, s.doc)` and `in-text`/`at-top`, and `reading()` (L443-458) writes a "started" progress record and a section after the preset has landed, so the state moves off the preset's signature. The preset's `make()` should produce the state `reading()` leaves, or `sig()` should ignore what `reading()` writes.
- confidence: high · found_by: critic

### C07 · must-fix · part 1 · open
- board: Main.dc.html (page "Legacy chapter — legacy-and-print draws the reader") · view: frame and phone · state: -
- finding: No click on Main leads to the Legacy chapter page, so its group ('Legacy chapter · Bookmark', 'Legacy chapter · Bookmarked') and the legacy bookmark state cannot be reached from the bar.
- evidence: The bar lists only the page on screen, so the page must be entered by a click. The only code path in is `openDoc()` with a legacy-format document (flow.js L190-192, `d.format === "legacy"`), and the one legacy document is `tidewater/datums`. No Main control opens it: the chapter's links are `#the-write-path`, `chapter:maintainer-guide/why`, `doc:field-notes/sqlite-wal` and the external URL; the Contents sheet lists the five maintainer-guide chapters; the Book page and Library stand-ins offer Back only (the book stand-in's own line says "Its chapter list opens each chapter here, in the reader."); the plain document has no `data-to` links. I probed all 33 chapter presets for a "Datums" row or a Tidewater link and found none. The signed canvas reached this page from its '20-chapter book · list' preset (a Tidewater chapter with the Contents sheet open, where the "Datums" row opens "Legacy reader — another job"; I clicked it there); this bar has no preset that opens a Tidewater chapter, and departure 2 left the signed reader's presets out. The legacy states are now visible only through the Widths bar (C05) and on boards 13 and 35. The engine's walk tried three pages (chapter, library, book) and never got here. Drafter file L69-70 and bar line 4 ("reaches every handoff state by a click to its page and then its preset"); handoff L198-200 asks the legacy control to be seen working on its stand-in. Give Main one click that lands on it, for example the book stand-in's chapter list opening a chapter, as its own line already says.
- confidence: medium · found_by: critic

### C08 · must-fix · part 1 · escalated
- board: HighlightStates.dc.html (06 · Component — Highlights in the text); the same paint on 01 Main, 02 Reader and 03 Widths · view: frame · state: 00
- finding: A plain highlight (no note) is shown in the passage by its yellow fill alone, at about 1.4:1 against the page, with no line, mark or icon that is not colour.
- evidence: result.md Q2 gives the paint at 1.34-1.51:1 against the page across the three themes. A highlight with a note carries a 2 px bronze underline (annot.css L18); a hover shows it on any highlight (L19, logged as Q12); forced-colors adds an outline (L24). A resting plain highlight has none of these (`pass-01/HighlightStates.frame.png`, `pass-01/Main.frame.png`). Drafter file L112: "State is never told by color alone: add an icon, a label or a shape"; handoff L389: "a state never shown by colour alone". The drafter's reason (Q2: "never the only cue (the `<mark>` element, the popover and the Notes list carry it)") does not hold for a reader looking at the passage: none of the three is visible there. Low confidence because a fill-only highlight is the usual reading-app norm and the handoff's own highlight check tests the text's contrast on the paint only (L204-206); if the operator accepts fill-only, this drops. The paint also appears as quotes in boards 04, 08, 11, 12, 29, 33 and 34, where the quote's text is the cue, and I do not count those.
- confidence: low · found_by: critic

### C09 · must-fix · part 2a · open
- board: 04 BookNotes, 08 PopStates, 11 PanelStates, 34 NotesPanel, and 01 Main and 03 Widths when those parts show · view: frame · state: -
- finding: Two pieces of product text are set at 14 px, between the interface's fixed 13 and 15 px steps, a near-miss of 15 px.
- evidence: Computed styles, every board swept with the state bar excluded, then Main and Widths presets. `.an-box__note--item` (annot.css L278, `font-size: 0.875rem`) is 14 px beside `.an-box__note` at 15 px: the note text in the popover's "Text changed" and other-language lists (08: 3 nodes; Main 'Text changed' and '1 highlight in 한국어'; Widths ×4 stages). `.an-li__main--code` (L191, `0.875rem` mono) is 14 px beside `.an-li__main` at 15 px: a code quote in a note row (11: 9 nodes; 04: 1; 34: 1; Main 'Notes' 1 and 'Notes · 30 in a chapter' 4). Handoff L82: "The interface keeps its fixed 13 and 15 px steps and the 11 px mono label"; drafter file L150: "No near-misses: two values that are almost the same (14 and 15 px, two greys) are one value." Snap both to 13 or 15 (a mono quote can sit at 13). The legacy note's 14 px is part of C10. The canvas stand-in chrome at 14 px (`.an-stand`, `.an-legacy__bar`) is exempt and not counted.
- confidence: high · found_by: critic

### C10 · must-fix · part 2a · open
- board: 35 LegacyBar, 13 LegacyStates, and 03 Widths when 'Legacy chapter · Bookmark' is pressed · view: frame · state: 00
- finding: The paragraph under the legacy bar mixes the canvas's own voice ("This job's control. It keeps your position in the chapter…") with the product line the handoff requires ("Highlights are not available in this document."), in product type at 14 px, with nothing that marks it as canvas annotation.
- evidence: `LegacyBar.dc.html` L19: `<p class="an-legacy__note">` has no `data-proto="stand-in"`, unlike the caption and the crumb beside it. annot.css L287 sets it at 0.875rem (14 px, the near-miss of C09) in the system's body font and secondary ink, so it reads as help text (`pass-01/LegacyBar.frame.png`). The drafter's build prompt lists "its explanatory paragraph ('This job's control. It keeps your position…')" among the stand-ins and says "Only the **button** on the legacy bar is this job's" (build-prompt L25-32), so the canvas contradicts its own build prompt and the build cannot tell which words are product copy. The handoff (L262-263) wants the reader told "Highlights are not available in this document." where they would look for it: that sentence is product copy and belongs in product type at 13 or 15 px, on its own. Split the paragraph: the explanation as a `data-proto="stand-in"` note in the stand-in's look, the product sentence as its own line.
- confidence: medium · found_by: critic

### C11 · choice · part 2b · escalated
- board: HighlightStates.dc.html (06) and the note rows (11, 12), the colour role `--an-edge`
- wave: 03-diagrams/Tones.dc.html (05 · Foundations — The diagram tones (proposed)), `diagram.css` `--dg-warn` and `.dg-note`
- finding: The same bronze family means "a note" in two jobs: this job's reader notes and 03's author-drawn diagram notes, and it is also the system's idle status.
- evidence: This job: `--an-edge` is #8a6a2a (light), #c8a15e (dark), #7d5c1d (sepia) (annot.css L9-11), the same three values as 03's `--dg-warn` (diagram.css L12, L27, L42); note rows and the Notes list sit on the tan notice ground (`kb-status-idle-soft`). 03: `.dg-note` (diagram.css L149) draws a note in the warn tint (#efe6d2 / #3d3524 / #eedcb4) with a warn stroke, and the Tones board calls warn "bronze, the system's idle status · notes". This job's highlight paint against 03's warn tint (CIE76 ΔE): about 13 in dark (#4a3c17 against #3d3524), 27 in sepia, 33 in light. The kb README gives bronze to the idle status and keeps `kb-ink-bronze` for data-viz surfaces, never text or controls. This job's seam note (result.md L188-190) asked the wave to check that its yellow and a near-yellow tone "never meet on one block"; nobody has decided it, and the bronze is the closer match. Version A (05): one bronze family means "a note", the reader's and the author's alike. Version B: the reader's marks take a signal the diagram palette does not use, or 03's note shapes move to another tone. Neither contradicts the system; it is the operator's call (handoff L160-161).
- confidence: medium · found_by: critic

### C12 · choice · part 2b · escalated
- board: BlockStates.dc.html (14 · Component — Notes and bookmarks on typed blocks)
- wave: 02-figures/FigureStates.dc.html (05 · Component — Figure) and 04-quiz/QuizStates.dc.html (05 · Component — Quiz block)
- finding: Whether a figure's caption or a quiz's prompt can be highlighted: this job says no (note and bookmark only; quiz answers take nothing), while the figure and quiz jobs assume their text is ordinary text a highlight can cover.
- evidence: This job: BlockStates 14, result.md L191-196 ("its answers are never highlighted (a highlight there would read as an answer chosen)"; a figure caption "never a highlight") and open question Q4 (L240-242). 02-figures `result.md` L238-242: "a caption's text is ordinary text a highlight could cover". 04-quiz `result.md` L126-128: "a prompt is ordinary reading text, so the annotations job can highlight in it". 03-diagrams `result.md` L299: no annotation control on a diagram (consistent with 05). No sibling draws a highlight, so the conflict is in what each assumes, not on a board. Version A (05): captions and prompts take a note and a bookmark, never a highlight. Version B (02, 04): a highlight in a caption or a prompt like any text. Q4 is already the operator's; this ties it to the siblings' assumptions.
- confidence: medium · found_by: critic

### C13 · advisory · part 2b · open
- board: BookNotes.dc.html (04) · view: phone · state: 00
- finding: At 390 the filter wraps to two rows ("All 33", "Bookmarks 6" / "Highlights and notes 27"), 93 px tall against 48 px on desktop, so the list header grows by 45 px between widths.
- evidence: Harness measure at 390 and 1440. Allowed by "toolbars wrap" (drafter L143). Trade-off: the contract's full labels ("Highlights and notes") against a single row of shorter ones.
- confidence: medium · found_by: critic

### C14 · advisory · part 2b · open
- board: HighlightStates.dc.html (06) · view: frame · state: 00
- finding: The highlight yellow is unmistakably a highlighter, but it is a new hue in a calm teal and bronze system.
- evidence: result.md Q2: light #f5dc8a, dark #4a3c17, sepia #e9cc72, 1.34-1.51:1 against the page. The handoff states no taste for it. The alternative, a bronze-soft ground, would meet the notices and 03's warn tint (C11). Trade-off: instant recognition and a familiar reading-app look against one more colour role the system does not have (logged as a proposed token).
- confidence: medium · found_by: critic

### C15 · advisory · part 2b · open
- board: HighlightStates.dc.html (06, first row "201"); also Main with a selection across inline code · view: frame · state: 00
- finding: A highlight across inline code keeps the chip's pale ground and rim inside the yellow band, so the band reads as three pieces; a code block paints continuously.
- evidence: `h/hl_code_gap.png` ("Answer 201, then hand the push…": the band breaks before and after the chip), `h/real_sel_H.png` (DATABASE_URL in the callout), `h/code_mark_1440.png` (a code block, one continuous band). Trade-off: the chip stays recognisable as code against one unbroken band.
- confidence: medium · found_by: critic

### C16 · advisory · part 2b · open
- board: Main.dc.html (state: a selection in the callout under the diagram) · view: frame · state: -
- finding: Text after a typed block with an id is filed under that block's title: a highlight in the "With DATABASE_URL unset…" callout shows "Diagram · One FastAPI process, two planes" in its popover.
- evidence: `h/real_sel_H.png` shows the popover headed "Diagram · One FastAPI process, two planes" for a highlight in a callout that is not part of the diagram. It follows from departure 4 (a typed block with an id is a section of its own). Trade-off: label by the nearest heading against the nearest id'd block, which is what the anchor uses.
- confidence: medium · found_by: critic

## For the judge

This round's `critique` is `critic`, so there is no judge: the three items below go to the operator at PENDING as they stand, each marked unsure.

- C08: low confidence, and a standoff (the drafter logged its reason for fill-only highlights under Q2; I find the reason does not hold in the passage).
- C11: wave choice (03-diagrams/Tones.dc.html).
- C12: wave choice (02-figures/FigureStates.dc.html, 04-quiz/QuizStates.dc.html).

## Scorecard

| Board | Part 1 | Part 2a |
|---|---|---|
| 01 Main | C02, C03, C04, C06, C07, C08 | C09 |
| 02 Reader | C08 | ok |
| 03 Widths | C05, C06, C08 | C09, C10 |
| 04 BookNotes | ok | C09 |
| 05 Elsewhere | ok | ok |
| 06 HighlightStates | C08 | ok |
| 07 SelectionStates | ok | ok |
| 08 PopStates | C01 | C09 |
| 09 PillStates | ok | ok |
| 10 MarginStates | ok | ok |
| 11 PanelStates | ok | C09 |
| 12 ItemStates | ok | ok |
| 13 LegacyStates | ok | C10 |
| 14 BlockStates | ok | ok |
| 15 ReaderTop | ok | ok |
| 16 ReaderBottom | ok | ok |
| 17 ChapterHead | ok | ok |
| 18 Prose | ok | ok |
| 19 Callout | ok | ok |
| 20 CodeBlock | ok | ok |
| 21 ProseTable | ok | ok |
| 22 ChapterList | ok | ok |
| 23 ChapterEnd | ok | ok |
| 24 SignInToSave | ok | ok |
| 25 DisplayPanel | ok | ok |
| 26 VersionList | ok | ok |
| 27 ReaderState | ok | ok |
| 28 SelBar | ok | ok |
| 29 NotePop | ok | ok |
| 30 PlaceBar | ok | ok |
| 31 Toast | ok | ok |
| 32 MarginNote | ok | ok |
| 33 NoteItem | ok | ok |
| 34 NotesPanel | ok | C09 |
| 35 LegacyBar | ok | C10 |

**Component gaps:** none open. The kb system ships tokens and no components, and every annotation part is markup that the drafter logged as a gap (result.md L265-275); 0 unlogged.

**2b notes for the operator:**
- C11 (wave choice): the reader's note bronze is the same family as 03's diagram-note tone; keep one meaning for "a note" across both jobs, or give one of them its own signal.
- C12 (wave choice): can a figure caption or a quiz prompt carry a highlight? This job says no; the figure and quiz jobs assume yes.
- C13: the book list's filter wraps to two rows at 390 and the header grows by 45 px.
- C14: the highlighter yellow is easy to read as a highlight but is a new hue in a teal and bronze system, and sits at about 1.4:1 on the page.
- C15: a highlight across inline code breaks the band at the chip.
- C16: a highlight in a callout under a diagram is labelled with the diagram's title.

**Options:** none asked; one direction is drawn, as the handoff says.

**The bar:**
1. Every list item opens its own item: holds. Three different rows of the book list opened three different places (chapter 1 "What a document is here", chapter 2 "The two planes", chapter 2 "Answer first…"); each Notes sheet row opens its own mark's passage.
2. A choice carries: C03 (a delete made on the book page shows its undo line on the next screen, not on its own). Otherwise holds: select, Highlight, and the new highlight is in its popover and in Notes under its heading (26 → 27).
3. Search and filters change the data, and the counts are true: holds (33 = 6 + 27; Bookmarks only shows 6; the count line follows a delete, 33 → 32).
4. The state bar: C05, C06, C07. It is on every interactive Page, sunken and dashed, no system component, no brand accent.
5. No link leaves the prototype, no `#` placeholder: holds (`design-check` OK; the external link goes to the in-prototype stand-in).
6. Controls keep their size and the page holds still: C02. The 98 `header.rd-top` lines (Main 64, Widths 34) are not counted: signed departure 31 and the operator's bar ("the state bar scrolls away with the page; it is never pinned").
7. The same list header in every filter and search state: holds (title, count line and filter sit at the same y in All, Bookmarks only and Highlights and notes).
8. Hover on primary and secondary controls: holds (label readable, fill restrained; `h/hov_*.png`).
9. Back chevrons, logo home, centred column, aligned figures, decisive primary action: holds.
10. One direction, no decorative SVG artwork: holds.
11. The Toss-level lines: C08 (colour alone), C09 (near-miss sizes), C10 (canvas voice in product copy).

**Holds (must survive the fixes):**
- `reader.css` and `reader.js` are byte-identical to the signed round; the signed chrome is where it was.
- 33 of 33 chapter presets land at both widths; the Notes in this book presets and the plain-document presets all land (their pressed look is C06).
- Real drag selection shows the bar (Highlight, Add note); pressing H creates the highlight, opens its popover, and puts it in Notes in reading order under its heading.
- A real delete's undo line leaves by itself after about 9 to 10 s in the chapter and in the sheet (a real delete: rows 26 → 25, "Highlight deleted. Undo", gone at 9.1 s).
- Hover is restrained and legible; the focus ring is visible (`h/ring_*.png`); phone views render at 390 with no overflow.
- Data is realistic (the real maintainer-guide chapter titles, Korean variants), no lorem, no secrets; unknown facts are not invented.
- No board is unreachable (Main links to Reader, Widths, BookNotes and Elsewhere); the three sibling renders show no clash on Sign in to save (04-quiz's default copy is identical to 05's).

**Ruled out (not findings):** the 98 `header.rd-top` layout-shift lines (signed departure 31, the operator's bar); the keyboard gaps logged as Q10 (a highlight below 64rem has no keyboard path to its popover); the 'Deleted · undo' preset holding its line without a timer (a preset hold; a real delete expires); hard-coded hex in `--an-*` (annot.css L9-11; logged as a proposed token role); 14 px in canvas stand-in chrome (`.an-stand`, `.an-legacy__bar`); Back from the legacy stand-in landing on the native "Storm surge" chapter (it is the preset's `from`, and `datums` is the legacy chapter).

**Not seen:**
- Pressed and active looks of any control (hover and focus were captured; pressed was not).
- A transient "Saving…" (the engine passed through the timers on 7 controls but never held one).
- The real iOS or Safari selection menu, and a selection made by keyboard (the logged Q10 gap).
- The three sibling boards were rendered once with no clicks, so their states behind a click are unseen.
- The engine's own click walk, which stopped at its caps; I covered it by hand (33 + 5 + 5 presets on Main at two widths, 34 on Widths) but not every control on every state.
- The kb system has tokens and a README and no component API, so each part's API came from the handoff and the bundle.
- The drafter's render log and its critique-pass answers, which I did not read on purpose.
