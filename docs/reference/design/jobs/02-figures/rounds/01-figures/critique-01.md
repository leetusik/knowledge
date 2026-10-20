# Critique 01: 02-figures/01-figures

- pass: 01
- mode: critic
- verdict: revise
- confidence: high
- must_fix: 1 (part 1: 1, part 2a: 0)
- gaps: 0
- advisory: 6
- wave: 03-diagrams, 04-quiz, 1 choice
- escalate: C02
- preview: 376.7s, 141 states
- standard: .claude/agents/design-drafter.md

Scratch root for every path below: `/private/tmp/claude-502/-Users-sugang-projects-personal-knowledge/f0010d83-1939-47da-8f62-5ffe37557260/scratchpad/critic-02-figures-01/`. The engine's render (171 files and `preview.json`) is in `pass-01/`, my harness captures in `h/`, crops in `crops/`, board strips in `strips/`, and the two sibling renders in `wave/`. Paths in the findings are relative to it. The round's `critique` level is `critic`, so no judge rules: what is escalated goes to the operator as it is, marked unsure.

## Findings

### C01 · must-fix · part 1 · open
- board: SourcesStates.dc.html (10 · Component — Sources list and citations) · view: frame · state: 00 (the third section, "After following a citation", and the dark and sepia cells of the fourth)
- finding: The board never draws the Sources list's "the item is the target" state that its own section title names, in light, dark or sepia, because the board's `L()` helper overwrites every `target` a cell passes.
- evidence:
  - The third section's title reads "After following a citation · the item is the target: a sunken ground and a hairline box; back links return to each citation". Its two cells pass `target: 'py-fsrs'` and `target: 'sample-long-sessions'`, and the dark and sepia cells in the fourth section pass `target: 'py-fsrs'`. Measured on the rendered board: 56 `.fg-src__item` and 0 `.is-target` (`h/t30.py`; the board's only marked thing is the one citation in the "Back at the citation" cell, `.fg-cite--here`). Seen: `crops/srcstates-followed.png` (item [1] in the 820 cell and the long-URL item in the 390 cell sit on the bare page like their neighbours) and `strips/SourcesStates-2.png` (the dark and sepia lists, item [1] unmarked).
  - Cause: `SourcesStates.dc.html` line 33, `const L = (cap, w, o) => Object.assign(K(cap, w, o), { isA: true, isB: false, target: '' });`, puts `target: ''` after `o`, so the `target` each cell passes is replaced by an empty string. `SourceList.dc.html` is not at fault: it marks the item whose id equals a non-empty `target` (`cls: 'fg-src__item' + (s.id === target ? ' is-target' : '')`). The other boards' helpers (`K`, `P`, `F`, `T`) all put their defaults before `o` or add keys no cell passes, so this is the one place the order bites.
  - The state itself is fine on the Page: Main → in-text link "Models of forgetting" → "After a citation · its source" marks item [1] with the sunken ground and the 1 px hairline in light, dark and sepia (`h/w1440-srcs-followed.png`, `h/t31-target-light.png`, `h/t31-target-dark.png`, `h/t31-target-sepia.png`); the text inside the marked item measures 4.98:1 at the lowest (accent on the sunken ground, light), 6.77:1 in dark and 5.41:1 in sepia. So the miss is the Components board's, and this board is the one place the state is meant to be seen at 820 and 390 and in three themes.
  - Held to: Part 1, "Every Components board shows all of its component's states"; the handoff's "Every state is drawn at phone, iPad and desktop, in light, dark and sepia … The critic checks all three themes"; and open question 7's drawn answer (the cited item is marked, "a sunken ground and a hairline box"), which the board's own title repeats.
- expected after the fix: the four cells that pass a `target` (820, 390, dark, sepia) each show one marked item, so 4 of the 56 items carry `.is-target`, and the default, Korean and "back at the citation" cells keep none. Putting the helper's defaults before `o` (or letting `o` win) is the whole change.
- confidence: high · found_by: critic

### C02 · choice · part 2b · escalated
- board: CardStates.dc.html (08) and SvgStates.dc.html (09), on every board that draws a tone · view: frame · state: 00
- wave: 03-diagrams/Tones.dc.html (the palette, from `diagram.css`)
- finding: The two drafts give the same 13 tone names different looks (`store`, `series-4` and `series-5` differ in hue and `series-6` in shade, `default` differs in ground, and the two keep a different set of roles per tone), so a tone name or a `kb-fill-*` / `kb-stroke-*` class renders differently in a figure's card or `svg` block than in a diagram.
- evidence:
  - The two versions, light theme, from `figures.css` L10–L22 and `diagram.css` L8–L20; both name the tones `default`, `muted`, `accent`, `ok`, `warn`, `bad`, `store` and `series-1` to `series-6`:
    - `store`: 02 plum, ink `#764f6c` on `#f1e6ee`; 03 slate blue, line `#44617a`, ink `#33506a`, tint `#e3e6e7`.
    - `series-4`: 02 rust, ink `#8f4030` on `#f4e0d9`; 03 slate blue, ink `#33506a` on `#e3e6e7`. `series-5`: 02 blue, `#35608f` on `#e2eaf3`; 03 rust, `#8f4030` on `#f1e1db`. `series-6`: 02 olive-yellow, `#4f5c1c` on `#e8ecd2`; 03 green, `#3b5221` on `#e4e8db`. So an author's `series-4` is red in a card and blue in a diagram.
    - `default`: 02's ground is the warm grey `#efe9db`; 03's tint is near-white `#fffefa` (its `#efe9db` is `muted`).
    - Roles: 02 keeps two per tone, an ink and a soft ground, and its strokes use the ink (`.fg-svg__svg .kb-stroke-store { stroke: var(--fg-store-ink) }`, scoped to its `svg` block). 03 keeps three, a line, an ink and a tint, and its strokes use the mid line (`.kb-stroke-store { stroke: var(--dg-store) }`, global). The same class names therefore draw a darker stroke inside a `svg` block than inside a diagram.
    - The rest agree or sit close: `warn` (`#6b5220` on `#efe6d2`) and `bad` (`#8f4030` on `#f1e1db`) are identical in both, and `accent`, `muted`, `series-1`, `series-2`, `series-3` and `ok` differ by a few steps of lightness or saturation (for example `ok` ink is `#3a6a2c` in 02 and `#3b5221` in 03, and `series-3` ink is `#764f6c` against `#5f3d57`).
  - For 02: the values are declared provisional, pending `03-diagrams` (result.md, *The seams* and departure 1, because the drafter's contract line 27 forbids reading a same-wave sibling's live canvas). Every card tone is contrast-checked in three themes: I measured card titles at 5.37:1 or more, bodies at 8.76:1 or more, links at 4.74:1 or more, and the 158 labels on SvgStates at 5.37:1 or more.
  - For 03: the handoff says it owns the palette ("`03-diagrams` owns it … take them"), and its extra role (a line apart from the text ink) is what a diagram's strokes need. Whether its own values hold is its own round's matter.
  - Neither version contradicts the system or a signed job: the system ships no tone tokens (a logged token gap), and where it has a pair both drafts use it (`warn` and `bad` are `--kb-status-idle-*` and `--kb-status-revoked-*` in `ds/kb/tokens.css`); `ok`, `store` and `series-*` are new in both. So neither drafter decides it; the handoff's rule (03's values replace 02's when 03's are signed) is the default if the operator does not choose otherwise.
- confidence: high · found_by: critic

## For the judge

- C02: wave choice. The round's level is `critic`, so no judge rules on it; it goes to the operator as it is, marked unsure about which palette should stand. The orchestrator copies it onto 03-diagrams, since it is a finding on both jobs.

## Scorecard

| board | Part 1 | Part 2a |
|---|---|---|
| 01 Main.dc.html | ok | ok |
| 02 Widths.dc.html | ok | ok |
| 03 Reader.dc.html | ok | ok |
| 04 Elsewhere.dc.html | ok | ok |
| 05 FigureStates.dc.html | ok | ok |
| 06 MdImageStates.dc.html | ok | ok |
| 07 RowStates.dc.html | ok | ok |
| 08 CardStates.dc.html | ok | ok |
| 09 SvgStates.dc.html | ok | ok |
| 10 SourcesStates.dc.html | C01 | ok |
| 11 Figure.dc.html | ok | ok |
| 12 FigureRow.dc.html | ok | ok |
| 13 RowCard.dc.html | ok | ok |
| 14 SvgBlock.dc.html | ok | ok |
| 15 SourceList.dc.html | ok | ok |
| 16 Prose.dc.html | ok | ok |
| 17 ReaderTop.dc.html | ok | ok |
| 18 ReaderBottom.dc.html | ok | ok |
| 19 ChapterHead.dc.html | ok | ok |
| 20 Callout.dc.html | ok | ok |
| 21 CodeBlock.dc.html | ok | ok |
| 22 ProseTable.dc.html | ok | ok |
| 23 ChapterList.dc.html | ok | ok |
| 24 ChapterEnd.dc.html | ok | ok |
| 25 SignInToSave.dc.html | ok | ok |
| 26 DisplayPanel.dc.html | ok | ok |
| 27 VersionList.dc.html | ok | ok |
| 28 ReaderState.dc.html | ok | ok |

C02 is a wave choice on boards 08 and 09 and never blocks.

**Component gaps:** none to raise. The `kb` system ships no components, so the seven parts this job draws (Figure with its media box, loading and missing; Plain Markdown image; Figure row; Row card; SVG block; Sources list; Citation) are logged gaps drawn as markup on their own boards, and the token gaps (the tone palette, `--fg-plate`, `--fg-edge`, no image treatment) are logged too (result.md, *Component and token gaps*). I checked the log against the code: every literal colour in `figures.css` is a tone value or `--fg-plate`, and nothing is unlogged.

**2b notes for the operator** (advisory; none blocks):
1. The operator's one reference is "kindle like", and this design has no way to open an image larger (open question 4: a phone reader pinches the page). That keeps the reader free of script and new scope, but a screenshot's small text is hard to read at 390 px, so if "kindle like" includes an image viewer, this is where it would change.
2. At text sizes 3 and 4 a row of three cards sets each card's text at about 10 to 17 characters per line on average (14 to 24 at the longest line); a card is 180 px wide and 9 to 11 lines tall, and at size 4 `allow-same-origin` splits at its hyphen (`h/t26-size3.png`, `h/t26-size4.png`). The row stacks only at size 5 (open question 2). Staying in the 36rem column keeps the one shared edge the operator asked for; stacking a row of three cards earlier would give the words room.
3. In dark, a light screenshot keeps full brightness on a hairline edge and a transparent PNG sits on a light plate (`#ece4d7`), which makes both the brightest blocks on the page (`strips/FigureStates-3.png`). Dimming images in dark, the alternative in open question 5, would calm that at the cost of true colours.
4. `width: wide` looks the same as a column figure from 40rem up, so on an iPad or a desktop an author cannot get a bigger picture (open question 1). It fits "good. but fixed column width." and keeps one edge for every block.
5. The 3:1 sample chart is drawn in a default blue, orange and green, and its "90% target" label touches "S = 30 days" (`crops/chart-labels.png`). It is a sample of an author's image, so the figure treatment is unaffected, but it is the loudest colour on the page in every chart cell and could be redrawn in the reader's palette.
6. A landing on a cited source is marked by a sunken ground and a 1 px hairline: 1.2:1, 1.08:1 and 1.15:1 against the page in light, dark and sepia (`h/t31-target-dark.png`). It reads as a calm box and the item lands at the top of the screen, so it is found, but a louder mark would be easier to see at a glance.

**The bar** (the operator's rule 1 and the shipped bar, line by line):
1. Every list item opens its own item: holds. Three different source URLs open three different notes ("github.com/open-spaced-repetition/py-fsrs", "www.w3.org/TR/annotation-model/", "example.com/learning/archive/…", `h/t29.py`); the three back links of source [1] return to three different citations (`h/w1440-srcs-back0.png` to `back2.png`). The engine reports no `check=same-target`, and `design-check` has no `same-target-list`.
2. A choice carries: holds. 한국어, Dark and size 5, set on the figures chapter, are all still set after the in-text link to the sources chapter (`h/t32.py`: Korean title, `rd-theme-dark`, `rd-size-5`). A citation carries to its source (marked) and the back link to the citation (marked).
3. Search and filters change the data, and the counts are true: holds. The reader has no search or filter; the counts it shows are true ("Chapter 3 of 5 · 0%", "Chapter 3 of 4 · 70%" on the sources chapter, and the sources board's "8 items" against 8 items).
4. The state bar: holds. It is the first child of the chapter's scroller (88 px at 1440, `position: static`), sunken neutral fill, dashed bottom edge, caption-size type, no system component and no brand accent (the pressed preset is bold with a dark outline). It lists only the active page's presets (19 on the figures chapter, 8 on the sources chapter, one on the other chapter and one each on the three stand-ins, with the display group on the three reader pages), it scrolls away with the chapter, and every handoff state is reached by a click to its page and then its preset: the sources chapter through the in-text link "Models of forgetting" or the Widths bar, and "A source's URL" by clicking a URL. The engine drove 47 states on Main and 47 on Widths without a click error. C01 is a Components-board miss, not a bar line.
5. No link leaves the prototype: holds. `design-check` is OK on 28 boards, with no `check=leaves-canvas`; 5,830 links measured, 0 external and no dead anchor. A source's URL opens the in-canvas note ("This link leaves the canvas … In the product it opens …") with a back link. Drawn alone, a part's in-chapter links point at `#top` and do nothing, for the reason logged as departure 7.
6. Controls keep their size and the page holds still: holds, after weighing 77 measured `check=layout-shift` lines (Main 43, Widths 34). Every one is `header.rd-top` moving in the viewport as a preset scrolls the chapter past the state bar, for example `91 -> 3`, `320 -> 3`, `522 -> 179` and `3 -> 91`. That is the operator's rule 1 itself (the bar leaves the viewport), so departure 6's reason holds, exactly as the signed critic ruled for departure 31 (01-reader/02-revise, critique-01, bar line 6). No control changes size, the loading box keeps the image's ratio so nothing below it moves, and a theme change in the reader's own Display panel leaves the reading position where it was (the same element at the same place, scrollTop 1900, across Dark, Sepia and Light, `h/t17.py`).
7. The same list header in every filter and search state: holds. No list has a filter or search; "In this book" and the sources list keep their form in every state.
8. Hover: holds. `check=hover-contrast` is clean; a hovered citation, back link and source URL keep their label and take only an underline or tint.
9. Back link, logo, column, figures, primary action: holds. "‹ The knowledge maintainer guide" and "‹ Book" carry their chevron, the logo links to the library stand-in, the column is centred (432 to 1008 in 1440), row items share a top edge, and the chapter's primary actions are the signed ones.
10. One direction, no decorative SVG: holds. The handoff asked for no options. The only SVGs are the two `svg` samples the handoff asks for (a UI mock and a 2×2 matrix, each with a text alternative) and the 22 px logo.
11. The Toss-level lines: holds. Long captions at sizes 1, 3 and 5, a 120-character URL, Korean captions and a Korean source title hold at 390; a row of three stacks at size 5 without clipping; a missing image keeps its alt text and caption; loading shows the real shape of the image.

**Holds** (these must survive the fixes):
- The engine and the record. 141 states, 29 PNGs, no click error and no contrast, target, clipped, overflow, dead-link, image, unmounted or script line; the only measured lines are the 77 `layout-shift` ones weighed under bar line 6. `design-check 02-figures` is OK on 28 boards.
- The signed reader is intact. 15 of the 20 files this canvas shares with the signed snapshot are byte-identical (every signed board file except Main, Widths and Prose, and `reader.css`); `Prose.dc.html`'s diff only inserts (no signed text is deleted), as departure 2 says.
- Contrast. Every card tone in light, dark and sepia is at 4.5:1 or more (titles 5.37 and up, bodies 8.76 and up, links 4.74 and up), and so are the 158 SVG labels (5.37 and up), the marked source's text (4.98 and up) and the missing box's text. The drafter's table in result.md matches what I measured.
- The handoff checks, by group. Figure: caption in the interface face and credit under a CREDIT label read as one figure and never as body text; the wide figure keeps 36rem and scrolls in its box at 390 with the fade and the hint; loading holds its place; missing keeps alt text and caption; the tall portrait stops at 36rem high; the 3:1 chart and the small image are never cropped, stretched or scaled up; a light screenshot has its hairline in dark and sepia; the transparent PNG is legible on its plate in three themes; a long caption and a Korean caption hold at 390 with `keep-all`; the GIF shows its still frame and its line under reduced motion. Plain Markdown image: no caption, no credit, a paragraph's spacing. Row: two images side by side at 820 and 1440 and stacked at 390; three mixed items top-aligned; a diagram item as a canvas-only stand-in that shows its title; 13 tones in three themes with a title that names each; size 5 stacks. `svg` block: only `currentColor` and tone classes colour it, labels measure 11.0 px or more at 390 (11.0 for the UI mock, 11.6 for the matrix), Korean labels render. Sources: every field in one order, a long URL wraps inside the column, a Korean title keeps its words, each citation goes to its item and each back link to its citation.
- Phone: every Page and every preset at 390 has no sideways scroll and no clipped control (47 states at phone on Main, checked by the engine; I read 8 of them), and the wide figure and the UI mock scroll in their own boxes.
- Seams. The tone names, the `kb-fill-*` and `kb-stroke-*` class names and the "Scroll sideways to see the whole drawing →" hint are shared with 03-diagrams as the handoff asks. Captions use the interface face, which the handoff's faces line names ("captions included") and the signed table caption uses. 04-quiz: no conflict found (its `quiz.css` holds no colour literals and it draws no figure, tone or source).

**Not seen:**
- iPad landscape (1024 × 768) is not drawn (departure 4, logged); the layout does not change from 40rem up, which the 36rem column at 820 and at 1440 confirms.
- Hover and focus looks were measured (the engine's `check=hover-contrast`, and the focus ring on a scrolling box at 390, `h/focus-scroller-390.png`) but not screenshotted for every control; the pressed look of the state-bar buttons is canvas chrome and was not judged.
- The engine's 48-state cap stopped Main at 47 states before the sources chapter's presets and the "A source's URL" stand-in; I drove those by hand (`h/t29.py`, `h/t31.py`), and the engine reached every sources preset on Widths.
- Reduced motion is a canvas-only class standing in for the OS setting (departure 5); I did not test a real OS setting. There are no text fields, native pickers or transient "Saving…" states on these boards.
- 03-diagrams and 04-quiz were rendered once for the seam look only (no click-through); their own critics carry the rest. 05-annotations was not in the wave list and was not looked at.
