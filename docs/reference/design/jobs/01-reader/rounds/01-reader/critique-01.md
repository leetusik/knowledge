# Critique 01: 01-reader/01-reader

- pass: 01
- mode: critic
- verdict: revise
- confidence: high
- must_fix: 5 (part 1: 3, part 2a: 2)
- gaps: 0
- advisory: 3
- wave: none
- escalate: none
- preview: 378s, 141 states
- standard: .claude/agents/design-drafter.md

## Findings

Scratch for every `pass-01/` and `look/` path below: `/private/tmp/claude-502/-Users-sugang-projects-personal-knowledge/f0010d83-1939-47da-8f62-5ffe37557260/scratchpad/critic/01-reader-pass01/` (`pass-01/` is the engine's output, `look/` is my own screenshots).
Engine: `design-preview 01-reader --phone-click`, 32 PNGs, 141 states, 6 issues (all `check=layout-shift`, all on Main in the phone view). `design-check 01-reader`: OK, 31 boards, no `leaves-canvas` or `same-target-list` warning.
The engine's state cap (47 states on Main and Widths) and click cap stopped its own click-through before the loose-document and the later stand-in pages; I drove those, every preset at 390, 820 and 1440, and the controls the engine cannot see by hand.

### C01 · must-fix · part 1 · open
- board: Main.dc.html · view: phone · state: 00 (the engine also reports 17 and 18 coming back)
- finding: At 390 px, pressing either of the two longest state-bar presets, "Signed out · Sign in to save" or "Device in dark mode · System", makes the bar wrap onto one more line and drops the whole reader 26 px.
- evidence: `preview.json` carries six `check=layout-shift` issues, all Main · phone. At state 00, "Signed out · Sign in to save" and "Device in dark mode · System" each give `header.rd-top y 268->294, nav.rd-bottom y 1049->1075`; at states 17 and 18 the next click reports the same 26 px back (294->268). My re-run at 390, every preset pressed from a fresh load: for the other 20 presets the bar is 265 px tall and the header sits at y 268; for these two the bar is 291 px and the header at y 294 (the pressed preset turns bold, its label widens, and the row of presets wraps to a tenth line). At 820 (bar 140 px) and 1440 (bar 88 px) nothing moves. Drafter file L72 ("reserve the tallest page's bar height ... so the product header never moves") and L125 (the `check=layout-shift` rule); bar line 6. This asks that the bar's height hold when a preset is pressed, not that the bar be restyled.
- confidence: high · found_by: measured

### C02 · must-fix · part 1 · open
- board: Main.dc.html (the same table on Widths.dc.html, 820 and 1440 frames) · view: frame · state: 02 and 03, scrolled down to the 34-row route table
- finding: At 820 px and wider, the long table's sticky header floats 56 px (chrome hidden) or 112 px (chrome shown) below the top of the scrolling area, so rows run above it and the row under it is cut by its edge.
- evidence: Measured at 1440: the scroller top is y 91 with `padding-top` 56 px; the header's top is y 147 with the chrome hidden (+56) and y 203 with the chrome shown (+112), while the top bar's bottom is y 147, so 1 row (hidden) or 3 rows (shown) of the table sit above the header. At 820 the numbers are 199 and 255 against a bar bottom of 199. Pictures: `look/a18-d-shown.png` (a row pill peeks out above the header at y 200 and the row below it is cut at y 250), `look/a18-d-hidden.png`, `look/a18-t-shown.png`, `look/a18-t-hidden.png`. Cause: `reader.css` L226 gives `.rd-scroll` `padding-top: var(--rd-top-h)`; Chrome counts a sticky offset from inside that padding, and L411-412 then add the offset again (`top: 0`, or `top: var(--rd-top-h)` while the chrome shows). The drafter's own departure 18 says "from 40rem its header sticks under the top bar as the page scrolls", and the TableStates caption says the header "stays in view while the reader scrolls": the render does not do that. Handoff check for the long table ("in row 30 the reader can still tell which column a value belongs to") holds only loosely: the header is on screen but sits in the middle of the rows. The phone (below 40rem) is fine: its own 30rem box with `top: 0` (`look/a17-p-row30-box.png`).
- confidence: high · found_by: critic

### C03 · must-fix · part 1 · open
- board: Main.dc.html (also EndStates.dc.html and ChapterEnd.dc.html) · view: phone · state: 08 and 09 (End · finished, End · marked unread)
- finding: On a phone, pressing "Mark as finished" or "Mark as unread" moves the pressed button about 50 px up and 188 px right and pulls everything under it up about 51 px, because the status sentence changes length and the row re-wraps.
- evidence: Harness at 390, End · marked unread, then a real click. Before: the button sits at x 17, y 482 below "Marked as unread. It stays that way until you mark it finished."; after: x 205, y 432 beside "Saved to your progress."; "Read next" goes from y 681 to 630 and the first list row from y 820 to 770; pressing again returns all of it (`look/a32-390-before.png`, `look/a32-390-after.png`). Same at 430 px (button y 462 to 412, x 17 to 245). At 600, 820 and 1440 nothing moves: the button holds 168 by 44 px and its y. Cause: `.rd-status` is a wrapping flex row (`reader.css` L432) and the two states carry sentences of different length. Bar line 6 ("the page holds still across states") and drafter file L125 ("Controls never change size or move what is around them when they show state"). The engine's `layout-shift` check watches only the header, nav and main, so it did not see this. This is the handoff's own toggle ("it turns into Mark as unread when pressed"), pressed at the end of every chapter.
- confidence: high · found_by: critic

### C04 · must-fix · part 2a · open
- board: HeadStates.dc.html (loose document, iPad card) and Main.dc.html (loose-document group, "Top of document", at 390 and 1440) · view: frame and phone · state: 00
- finding: The loose document's title breaks inside its compound, "SQLite's write-" over "ahead log, in practice", at all three widths, although a break after "write-ahead" fits.
- evidence: `pass-01/HeadStates.frame.png` (third card at 820), `look/a9-d-top-document.png` (1440), `look/a9b-p-top.png` (390). Measured line widths: at 1440 line one "SQLite's write-" is 292 px and line two "ahead log, in practice" 419 px in a 576 px column, while "SQLite's write-ahead" would be 412 px; at 390 the pair is 198 and 284 px against 279 for the whole compound. `.rd-head__title` sets `text-wrap: balance` (`reader.css` L250) and it takes the hyphen. Standard, Type: "no headline that breaks badly at 390 px". It is the first thing a reader sees on this page, and the term it splits is the one the document is about.
- confidence: medium · found_by: critic

### C05 · must-fix · part 2a · open
- board: ProseStates.dc.html, CalloutStates.dc.html, CodeStates.dc.html, TableStates.dc.html, and the Reading states of Main.dc.html and Widths.dc.html · view: frame · state: -
- finding: One chapter at the default size uses fifteen distinct text sizes, with clusters of near-identical values (13.0, 13.3, 13.9, 14.0, 14.8 and 15.0 px; 16.9, 17.6, 18.0 and 18.4 px).
- evidence: Computed size of every text node of the chapter at size 3 (18 px), 1440 wide, by element: 11.0 eyebrow labels; 13.0 captions, table hint, code title, bar sub-lines; 13.3 and 13.9 inline code; 14.0 code lines and the "new tab" marker; 14.8 table cells and the inline code in them; 15.0 chapter-list titles, contents links, back link, bar labels, status words; 16.9 callout body text; 17.6 callout titles; 18.0 prose, links and h4; 18.4 the "In this book" heading; 21.2 lede and h3; 23.2 next-chapter title; 26.1 h2; 43.2 chapter title (28.8 at 390). Visible together in `pass-01/ProseStates.frame.png` and in `look/a18-d-hidden.png` (callout body at 16.9 under 18.0 prose, table cells at 14.8 above the 15.0 bar). The em ratios of the prose kit (0.74, 0.77, 0.82, 0.94, 0.98 and so on) multiply the five reading sizes, so each element lands a little off its neighbour. Standard, Type: "Few sizes in clear steps (about 4–6 on a screen), each step visibly different"; Polish: "No near-misses: two values that are almost the same (14 and 15 px, two greys) are one value". The drafter logs two interface steps (13 and 15 px, departure 20); the in-between values are not logged.
- confidence: medium · found_by: critic

## For the judge

- none. Every must-fix is `medium` or `high` confidence, none stands against a logged departure whose reason fails, the verdict is `revise`, and no `wave:` was named.

## Scorecard

| Board | Part 1 | Part 2a |
| --- | --- | --- |
| 01 Main (flow) | C01, C02, C03 | C04, C05 |
| 02 Reader (screen alone) | ok | ok |
| 03 Widths | C02 | C04, C05 |
| 04 Elsewhere (stand-in) | ok | ok |
| 05 Foundations | ok | ok |
| 06 TopStates | ok | ok |
| 07 BottomStates | ok | ok |
| 08 HeadStates | ok | C04 |
| 09 ProseStates | ok | C05 |
| 10 CalloutStates | ok | C05 |
| 11 CodeStates | ok | C05 |
| 12 TableStates | ok | C05 |
| 13 ListStates | ok | ok |
| 14 EndStates | C03 | ok |
| 15 SaveStates | ok | ok |
| 16 DisplayStates | ok | ok |
| 17 VersionStates | ok | ok |
| 18 StateStates | ok | ok |
| 19–31 mounted parts (ReaderTop, ReaderBottom, ChapterHead, Prose, Callout, CodeBlock, ProseTable, ChapterList, ChapterEnd, SignInToSave, DisplayPanel, VersionList, ReaderState) | ChapterEnd: C03; the rest ok | ok |

**Component gaps:** none beyond the drafter's own log. The system ships no components, so every part is markup and is logged (16 parts, 9 proposed tokens); I found no gap it did not log.

**2b notes for the operator** (taste, advisory, they never block):
- The reading face is Literata, a fourth family beside Fraunces, Source Sans 3 and JetBrains Mono: it is what gives the page its Kindle-like book feel, and it costs one more font to host in the build (the canvas takes it from Google Fonts CSS, which the drafter file allows).
- On a 1440 screen the top bar and chapter bar run edge to edge (the logo at x 42, Display at x 1400) while the text sits in a 36rem column at x 432 to 1008, about 390 px away; Kindle's own bars run full width, so this matches the reference, and the trade-off is a long reach from the controls to the text against a more book-like page if the chrome lined up with the column.
- Warning, Note, Skip and Definition callouts are four near-identical beige fills in light (Warning #efe6d2; Note, Skip and Definition #efe9db) and in sepia (#eedcb4 against #ecdcba), so only the 11 px mono label tells a Warning from a Note at a glance, while Important (teal) and Caution (rose) stand out; that keeps the page calm at the price of at-a-glance severity.

**Notes for the build and the system** (not findings and not taste; they never block):
- Build: the sheets are `role=dialog` with `aria-modal="true"`, but Tab can leave an open sheet (from the last Display tile it lands on the canvas strip below the stage); the build prompt (section 15) specifies focus-in, Escape, scrim and focus-return, and not containment, so the build should add it or drop `aria-modal`.
- System, for the later jobs: `kb-border-strong` edges measure 1.56:1 (light) and 1.64:1 (sepia) against the paper surface. Here every bordered control (secondary buttons, the language switch, the tiles) also carries a text label, so I did not count them, but quiz answers and notes will bring bare inputs whose edge needs 3:1 (drafter file L113).

**The bar** (the drafter file's lines, in the order of the operator's bar):
1. Every list item opens its own item: holds, on the rows I clicked. In the 5-chapter book, rows 1, 3, 4 and 5 each open their own chapter ("Chapter 1 of 5", "3 of 5", "4 of 5", "5 of 5"); in the 20-chapter book, rows 1, 12 and 20 each open their own ("1 of 20", "12 of 20", "20 of 20"); its row 7, "Datums", opens the stand-in "Legacy reader — another job". All at 1440 and 390. Contents entries 1, 4 and 8 each land on their own heading at 1440 and 390. I sampled rows; I did not click all 20.
2. A choice carries: holds. Size and theme persist across chapters and the loose document; finished counts ("2 of 5", "3 of 5") follow Mark as finished and Mark as unread; the language switch lands on the same section.
3. Search and filters change the data, counts true: holds (the reader has no search or filter; the counts it does have are true).
4. The state bar: holds. It is on Main and Widths, lists only the page it sits on (22 chapter presets, 4 loose-document, 1 each on the stand-ins), reaches every handoff state by a click to its page and then its preset, and is sunken, dashed and neutral. Its height wobble at 390 is C01 under line 6.
5. No link leaves the prototype, no unexplained `#`: holds. In-text links carry `href="#top"` with script handlers (departure 9 names the reason); `design-check` has no `leaves-canvas` warning; the engine found no dead link and no unreachable page.
6. Controls keep their size and the page holds still: C01, C03.
7. The same list header in every state: holds (the chapter list keeps its title and count line in every scene; only values change).
8. Hover on primary and secondary controls: holds. The engine found no `hover-contrast` issue; hovered tiles, rows and buttons take a tint, underline or border, never a flood.
9. Back chevron, logo home, centred column, aligned figures, decisive primary action: holds. Back links carry "‹"; the logo goes to the library stand-in; the column is centred at x 720 on 1440; "Read next →" closes the content it acts on.
10. One direction, no decorative SVG: holds. One direction; no inline `<svg>` anywhere (the logo is a 22 px `<img>` of the system's mark).
11. The Toss-level lines: holds. One primary action per screen; errors say what happened and what to do; loading is the chapter's own skeleton; larger text still holds (size 5 at 390, 820 and 1024 has no sideways scroll). C04 and C05 are the polish and type lines, not these.

**Holds** (must survive the fixes):
- The chapter opening: title, lede and generated contents; the longest title wraps whole at 390; no summary closes the header up; one section draws no contents; reopening lands on the saved section with the pill and "From the top" works at 390 and 1440.
- Reading: the chrome hides and returns by `visibility` with no reflow; the progress line stays; the chrome shows itself while it holds focus, and "Show reading controls" is the first stop when it is hidden.
- Settings and sheets: five sizes (15, 16.5, 18, 20, 22 px) change the text live; Light, Dark, Sepia and System are live and Sepia appears only when chosen; Escape, Close and the scrim close a sheet and return focus to its opener; the 20-chapter Contents sheet holds all 20 rows at 390 and leaves the reading place where it was (scroll 1400 before, with the sheet open, and after Escape).
- Language and versions: the switch names each language in itself and lands on the same section; Korean breaks between words and never overflows at 390; older version, older translation, one version and failed history are all drawn.
- The prose kit is complete: six callouts with and without titles, collapsed and open by click, Enter and Space; code with and without a title, long lines wrapping; the ASCII block and both tables are focusable regions; the 8-column table scrolls in its own box at 390; the numeric table is right-aligned.
- Contrast: every text, link and syntax colour I computed from the token values is at least 4.5:1 in light, dark and sepia, and the focus ring and selected rings at least 3:1; the engine measured no `contrast`, `target`, `clipped`, `image`, `name` or `unreachable` issue. Of the 40 focus stops I tabbed, every one drew the system ring (2 px `kb-accent`, 2 px offset).
- Data and scope: realistic content, no secrets, no lorem; no bookmark, highlight, note, image, diagram or quiz in the chrome or the sample chapters; one direction; every logged departure and every logged gap stands as written.

**Not seen:**
- The engine's own click-through stopped at its caps (47 states per view on Main and Widths; on Main's frame view 88 controls covered by another element and 391 outside the frame went unclicked, counted per state); I covered every preset and the main controls by hand but did not click every control in every theme on Widths.
- Hover and focus pixels beyond the computed styles and the focus screenshots I took; the pressed look of tiles; transient states (the 0.9 s "Try again" skeleton, the chrome fade, sticky `top` transitions).
- Safe-area insets (`env()` resolves to 0 in this render) and anything on a notched iPhone; iOS Safari and touch scrolling of the phone table box.
- The operator's runtime and the Google Fonts load: if `fonts.googleapis.com` is blocked, the reading face falls through the stack (Pretendard, Apple SD Gothic Neo, Noto Sans KR, Georgia), which on a Mac reaches a sans before Georgia and changes every line break.
- The drafter's recorded contrast table (I did not read it, to keep the pass independent); my values were computed from `tokens.css` and `reader.css`.
- The `kb` system ships no component bundle, so `x-import` mounting could not be checked; its README gave the tokens and rules I held the canvas to.
- The long-table header at 1024 (I measured 820 and 1440; the same rules apply from 40rem).
- Print and the legacy reader belong to other jobs and were not looked for.
