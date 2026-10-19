# Critique 01: 01-reader/02-revise

- pass: 01
- mode: critic
- verdict: revise
- confidence: high
- must_fix: 2 (part 1: 1, part 2a: 1)
- gaps: 0
- advisory: 4
- wave: none
- escalate: none
- preview: 377s, 141 states
- standard: .claude/agents/design-drafter.md

Scratch root for every path below: `/private/tmp/claude-502/-Users-sugang-projects-personal-knowledge/f0010d83-1939-47da-8f62-5ffe37557260/scratchpad/critic/`. The engine's render is in `01-reader-r02-pass01/pass-01/`, my harness captures in `look/`. Paths in the findings are relative to it.

## Findings

### C01 · must-fix · part 1 · open
- board: Main.dc.html · view: phone · state: 14 (the "한국어 · older translation" preset, then the end-of-chapter list or the Contents button). The same on Widths.dc.html, its 390 frame. Hidden on ListStates.dc.html (see the evidence).
- finding: At 390 the Korean chapter title in the chapter list and in the Contents sheet breaks inside a word ("그리|고 계약"), which fails change 4's check ("the `:lang(ko)` rules hold: keep-all, no mid-word break, no overflow at 390") and the Toss-level line "Long names, two-line labels and larger text still hold" (design-drafter.md L139, bar line 11).
- evidence:
  - A scan of every visible Hangul word on the KO chapter page (949 words), at 390 and text sizes 1, 3 and 5, finds exactly one broken word: "그리고" in `.rd-ch__title`. It shows once in the end-of-chapter list and twice with the Contents sheet open. At 820 and 1440 the title fits one line and nothing breaks. Page 03's 390 frame breaks the same way. The English chapter's Korean terms (3 spans, 6 words) stay whole at every width and size, so change 5 is not the issue.
  - Seen: `look/N4-ko-list-390.png` (the end-of-chapter list, row 2: line 1 ends "…쓰기 경로, 그리", line 2 is "고 계약") and `look/N5-ko-sheet-390.png` (the Contents sheet, the same row).
  - Cause: `.rd-ch__title` (reader.css L502) sets `overflow-wrap: break-word` and has no `:lang(ko)` keep-all rule. The chapter opening (L265), the section links (L303), prose (L308), headings (L315), callouts (L322) and table cells (L325) all have one. So the same Korean title wraps at its spaces in the chapter opening and breaks mid-word two screens lower.
  - Why the boards miss it: ListStates (board 13) draws its Korean card at 420 px, where the title fits one line, and no board draws that title at 390. The build prompt's Korean row (build-prompt.md L292, keep-all) and its list-row rule (L417, "the title … in its own `lang`") would have the build ship the break.
  - Departure 24 (the list titles stay in the interface face) is about the face, not the wrapping; it does not cover this.
- expected after the fix: a Korean title in the list and the sheet wraps only at its spaces at 390 and at every text size, and the Chapter list board shows that title at 390 so the check is visible there.
- confidence: high · found_by: critic

### C02 · must-fix · part 2a · open
- board: Main.dc.html · view: frame · state: 00 (the 8-column table, and the ASCII drawing after the "SQLite's write-ahead log, in practice" link and the "Plain Markdown · ASCII drawing" preset), each scrolled to its end. The same on Main's phone view, Widths.dc.html, Reader.dc.html (02), ProseTable.dc.html (25), TableStates.dc.html (12) and CodeStates.dc.html (11).
- finding: The fade over a scrolling table or drawing stays at full strength when the box is scrolled to its end, so the last 32 px of the content (the drawing's top-right `+` corner and right-hand `|` strokes, the table's last column header) is veiled where nothing is cropped any more.
- evidence:
  - ASCII drawing, text size 3, at its scroll end. At 1440 the drawing is 718 px wide in a 574 px box (scrollLeft 144). All 13 lines end at x=1006.5 and the fade spans x=975 to 1007, so the last 32 px of every line sits under a gradient that reaches 98% of the box colour at the edge. The top-right `+` and the right-hand strokes are washed out: `look/G2-art-end-1440.png`, `look/F2-art-right-size3.png`. At 390 (box 354 px, scrollLeft 364) the lines end at 371.3 under a fade of 340 to 372: `look/G2-art-end-390.png`. At size 1 the drawing overflows by only 27 px (601 in 574, CodeStates), so the whole scroll range is shorter than the fade.
  - 8-column table, size 3, at its scroll end. At 1440 (scrollLeft 266 of 840, box 574) 18.6 px of the last header "SINCE" lies under the fade, about 58% veiled at the text's right edge, and 6.3 px of the first row's last cell "P12". At 390 it is 18.3 px and 5.9 px. `look/D2-wide-end.png`.
  - At the scroll end the left edge is cut through glyphs with no cue ("rame 1", "4 B + a page" in `look/G2-art-end-1440.png`): the fade is blind to scroll position in both directions.
  - Standard: design-drafter.md L149 ("Deliberate crops: … cut on purpose, with an ellipsis or a fade, never by accident"). It also undercuts change 3's own check: the confirmed reading names the top-right corner that did not meet, and the reader cannot see that corner meet at the only place it is reached.
  - Cause: `.rd-code__fade` (reader.css L409) and `.rd-table__fade` (L441) are constant gradients over the last 2rem, shown whenever `.is-over` is set (CodeBlock.dc.html L45, ProseTable.dc.html L61, from a width measurement). Nothing reads `scrollLeft`. Round 01's phone table had the same fade, and departure 28 adds it to the ASCII block. The handoff asks for "the fade", not one that stays over the last column at the end; departure 28's reason (the same cue as a wide table) holds at the start of the scroll, not at the end.
- expected after the fix: scrolled to the end, the last column of glyphs, the right border and the last table column are at full strength; the cue shows only on a side where more remains. The same at 390, 820 and 1440, text sizes 1, 3 and 5, in light, dark and sepia.
- confidence: high · found_by: critic

## For the judge

None. There is no low-confidence must-fix, no standoff against a logged departure, no `choice`, and the verdict is `revise`, not a `pass`.

## Scorecard

| Board | Part 1 | Part 2a |
|---|---|---|
| 01 Main.dc.html | C01 | C02 |
| 02 Reader.dc.html | ok | C02 |
| 03 Widths.dc.html | C01 | C02 |
| 04 Elsewhere.dc.html | ok | ok |
| 05 Foundations.dc.html | ok | ok |
| 06 TopStates.dc.html | ok | ok |
| 07 BottomStates.dc.html | ok | ok |
| 08 HeadStates.dc.html | ok | ok |
| 09 ProseStates.dc.html | ok | ok |
| 10 CalloutStates.dc.html | ok | ok |
| 11 CodeStates.dc.html | ok | C02 |
| 12 TableStates.dc.html | ok | C02 |
| 13 ListStates.dc.html | C01 (no Korean title at 390) | ok |
| 14 EndStates.dc.html | ok | ok |
| 15 SaveStates.dc.html | ok | ok |
| 16 DisplayStates.dc.html | ok | ok |
| 17 VersionStates.dc.html | ok | ok |
| 18 StateStates.dc.html | ok | ok |
| 19 ReaderTop.dc.html | ok | ok |
| 20 ReaderBottom.dc.html | ok | ok |
| 21 ChapterHead.dc.html | ok | ok |
| 22 Prose.dc.html | ok | ok |
| 23 Callout.dc.html | ok | ok |
| 24 CodeBlock.dc.html | ok | ok |
| 25 ProseTable.dc.html | ok | C02 |
| 26 ChapterList.dc.html | ok | ok |
| 27 ChapterEnd.dc.html | ok | ok |
| 28 SignInToSave.dc.html | ok | ok |
| 29 DisplayPanel.dc.html | ok | ok |
| 30 VersionList.dc.html | ok | ok |
| 31 ReaderState.dc.html | ok | ok |

**Component gaps:** none. The `kb` system has no components; the reader's parts are canvas markup, as in round 01, and the diagram slot belongs to the `diagrams` job.

**2b notes for the operator** (advisory; none blocks):
1. The chapter list and the Contents sheet keep the interface face for titles (Pretendard for Hangul) while the same title in the chapter opening is Noto Serif KR; the drafter raised this as its open question 1 (departure 24). It trades a list that reads like the rest of the interface against a Korean title that matches the one it points to.
2. Long code lines now wrap often in the 576 px column, and a wrapped line hangs a fixed 2ch from the block's left edge, not from the line's own indent, so on a nested line the continuation sits left of where the line began (the Code block board's caption says "wraps under its own indent"). A fixed hang is simple and always stays inside the column; a hang measured from each line's indent keeps whitespace-significant code legible and needs the renderer to carry one value per line. The handoff said "as before", so this is a trade, not a miss.
3. A chapter marked unread reads "Started" in the list and the Contents, with no percentage, because the reset leaves it opened at 0%. "Not started" is the other plain word: "Started" matches what the server holds and tells the member they have been there, while "Not started" matches what pressing Mark as unread feels like.
4. Page 03 draws the state bar three times, once at the top of each frame, so each scrolls away with its own chapter; the phone frame gives 239 of its 844 px to its bar until it is scrolled off. That is what rule 1 costs on a page with three scrollers; one bar above the frames would not scroll away.

**The bar** (the operator's rule 1 and the shipped bar, line by line):
1. Every list item opens its own item: holds. The engine's clicks on four chapter-list rows and section links land on four different places; no `check=same-target`, and `design-check` has no `same-target-list`.
2. A choice carries: holds. Language, text size and theme carry across the chapter, the loose document and the sheets (the 한국어 choice reaches the Contents sheet); the unread choice reaches the end, the list and the Contents.
3. Search and filters change the data, and the counts are true: holds. The reader has no search or filter; its one count reads "3 of 5 finished", "2 of 5" after Mark as unread and "3 of 5" after Mark as finished, at 1440 and 390.
4. The state bar: holds. It is the first child of the chapter's scroller on Pages 01 and 03 (Page 03: one per frame), above the header, with a sunken neutral fill, a dashed bottom border, caption type, no system component and no brand accent. It lists only that page's presets (the loose document and the library and book-page stand-ins show their own), every preset lands (141 states, no click error), and the handoff states are reached by a click to the page and then its preset (the md sample: the doc link, then "Plain Markdown · ASCII drawing").
5. No link leaves the prototype: holds. `design-check` is OK with no `check=leaves-canvas`; the logo opens "Library — another job" and the back link "Book page — another job", each with a link back, and the `#top` hrefs sit under handlers and resolve (`anchor: ok`).
6. Controls keep their size and the page holds still: holds, after weighing 80 measured `check=layout-shift` lines. All 80 are `header.rd-top` viewport y moving (Page 01 frame 30, Page 01 phone 23, Page 03 27), for example `91 -> 3`, `320 -> 3` and `3 -> 91`. I reproduced them on Page 03: before the first preset the three headers sit at y 397, 272 and 246 under their in-scroller bars; after it the three scrollers sit at scrollTop 5929, 4457 and 4533 with every header stuck at 158.6, and no control changes size and no content reflows. This is the operator's rule 1 itself (the bar leaves the viewport when a preset scrolls the chapter), so departure 31's reason holds and I raise no finding. The end-state press (Mark as unread, 168x44 at the same x/y before and after) moves nothing.
7. The same list header in every state: holds. There is no filter or search; "In this book" keeps its title and count line (member "N of 5 finished", signed out "5 chapters").
8. Hover: holds. Read next, Mark as unread and a list row keep a readable label with a restrained fill (`look/T-*-hover.png`), and the engine's `check=hover-contrast` is clean.
9. Back link, logo, column, figures, primary action: holds. "‹ Book" carries its chevron, the logo links to the library, the column is centred (224 to 800 in 1024), figures use tabular numerals, and the primary action ("Read next →", "Back to the book") sits at the end of what it acts on.
10. One direction, no decorative SVG: holds. The handoff asked for no options, and the only SVG is the 22 px logo.
11. The Toss-level lines: C01 (L139, long names and larger text hold). The other lines hold: the end, unread and sign-in states answer a press at once and say why a state is what it is.

**Holds** (these must survive the fixes):
- Change 1. The bar scrolls away with the chapter on Pages 01 and 03 at 390, 820 and 1440; back at the top it is whole and its presets land; the reader's header hides on scrolling down and returns on scrolling up; the progress line stays; the long table's sticky header sits flush under the top bar while it shows and at the reading area's top while it hides (`look/J-long-*-down.png`, `*-up.png`).
- Change 2. At 820, 1024 and 1440 and text sizes 1, 3 and 5 every table and code block has the paragraphs' two edges (576 px, 224 to 800 at 1024). The one narrower code block sits inside a Warning callout and takes the callout's padding, by design. The 8-column table scrolls inside its box with the hint (840 px in 574). A box is focusable (`tabindex=0`, `role=region`, labelled) only when it scrolls. Row 30 of the long table stays under its column names at 820 and 1440, sizes 4 and 5. No page scrolls sideways (document and scroller `scrollWidth` equal `clientWidth` at 1024; the engine's overflow check is clean).
- Change 3. No ASCII drawing appears in a native chapter. The stand-in is grey and dashed, labelled "Canvas only · diagram stand-in · the diagrams job (P29.S5)", carries the title and caption, and reads as a stand-in in light, dark and sepia (`look/I-dgm-0.png` to `I-dgm-5.png`). The md sample's drawing has 13 lines of one width, corners that meet and strokes that join at sizes 1, 3 and 5 (`look/F2-art-zoom-size*.png`, `look/R-art-1x-size*.png`).
- Change 4. Hangul in the KO chapter's title, headings and body renders in Noto Serif KR (the browser's platform-font query, not the stack), and Hangul inside English uses the same face on the Latin baseline.
- Change 5. The English chapter's Korean terms never break between syllables at 390, 820 and 1440 and sizes 1, 3 and 5; a scan of all 949 Hangul words in the KO chapter finds no other break.
- Change 6. At 1440 and 390: Finished, press Mark as unread, and the end reads "Not finished. Marked as unread. Read it to the end again to finish it." with "Mark as finished"; the list row reads "Reading now · Started" and the count falls from "3 of 5 finished" to "2 of 5". The button keeps its place and size, the scroll position is unchanged, and two seconds later it is still not finished. Mark as finished returns to "Finished", 3 of 5. A fresh read to the end finishes it again (`look/P-*-0-finished.png`, `*-1-unread.png`, `*-2-refinished.png`).
- The engine and the record. 32 PNGs, 141 states, no click error and no contrast, target, clipped, overflow, dead-link or unmounted line; the only measured lines are the 80 `layout-shift` ones weighed under bar line 6. `design-check 01-reader` is OK on 31 boards. The Foundations contrast figures check against the token values, and the stand-in's colours are in the drafter's table.
- Captions and copy that the width change touches are true: the Code block board ("the block is 576 wide", "wider than the column at each, so it scrolls in its box", size 1 overflows by 27 px) and the Table board ("fits, the header sticks on the page" at size 3, "takes its own box" at size 5). No "lane", "bleed" or "pinned" text is left.
- The drafter's logged departures 24, 26, 28 (apart from its end state in C02), 31, 32 and 33 hold. The Known-from-round-01 items are unchanged, as the handoff asked.

**Not seen:**
- Hovered, focused and pressed looks were read only where I captured them: hover on Read next, Mark as unread and a list row, and the keyboard focus ring on a scrolling box. The pressed look of each control and the focus ring on each control were not captured.
- A real touch device: the boxes were scrolled with a desktop emulation of 390x844, never by touch.
- The 20-chapter list: the engine samples its first, second and last rows; the other 17 rows were not clicked.
- 1024x768: block edges and sideways scroll were measured, but no screenshot was read at that size.
- Noto Serif KR and Literata load from Google Fonts, so the render needed the network. I confirmed the rendered Hangul face with the browser's platform-font query; I did not render offline.
- The `kb` system cache has no component README (the system has no components), so the API was taken from the handoff.
