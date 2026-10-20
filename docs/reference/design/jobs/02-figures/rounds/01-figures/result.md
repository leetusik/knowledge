# Result — job `02-figures`, round `01-figures` (slice P29.S5)

Drafted by `design-drafter` on 2026-10-20. One direction (`new visual direction: no`): this job extends the signed
reader (`01-reader/02-revise`) and the `knowledge` system, and draws only what goes inside a chapter's column: the
figure, the plain Markdown image, the figure row and its card, the `svg` block, the sources list and the citation.
Nothing here is decided until the operator signs it.

## Intent, one line per Page

- **01 · Page — A chapter with figures and sources (the flow).** The operator, on an iPhone, iPad or Mac, is reading
  chapter 3 of their own maintainer guide to understand how knowledge's read surfaces fit together. What they see first
  is the chapter itself, exactly as signed; the images, rows and drawings read as part of its one column, never as
  something pasted on top. On the same board, the subject chapter ("Models of forgetting", an invented book): a
  learner checking where a claim comes from sees the source's number inside the sentence, and following it and coming
  back is one tap each.
- **02 · Page — The figures at 390, 820 and 1440.** The operator (and the critic) comparing the three devices: the
  same prototype state drawn three times, side by side, so a row that stacks on a phone and sits side by side on an
  iPad is seen in one glance.
- **03 · Page — Chapter screen alone** and **04 · Page — Stand-in for another job's screen**: the signed boards,
  copied unchanged; the flow mounts them.

## The plan, and its review

**Boards.** Pages on row 1: the flow (`Main`), the widths board (`Widths`), the chapter screen alone (`Reader`,
signed) and the stand-ins (`Elsewhere`, signed). Components on row 2: Figure, Plain Markdown image, Figure row, Row
card in every tone, SVG block, Sources list and citations. Their mounted parts on row 3: this job's five parts
(Figure, FigureRow, RowCard, SvgBlock, SourceList), the signed Prose with this job's blocks added, and the signed
parts copied unchanged.

**Type.** No new steps. The reading face at `--rd-fs` stays the body's. Everything this job adds that is not body
text is in the interface face: captions, card bodies, the row caption and the sources list at the column's small step
`--rd-fs-s` (so they follow the five text sizes); the credit, the hints, the still-frame line and the back links at
the system's fixed 13 px; the `CREDIT` and `IMAGE NOT AVAILABLE` labels at the system's 11 px mono label. A card's
title is the one place this job uses the display face (Fraunces, semibold, at the card's own size).

**Spacing.** Only `kb-space-*` steps, scaled by the reader's `--rd-k` inside the column: a block's top margin is `lg`
(as the signed code and tables), a plain image's is `md` (a paragraph's), the image-to-caption gap `sm`, the
caption-to-credit gap `xs`, the row's items `lg` apart when stacked and `md` apart side by side.

**Colour roles.** `kb-ink` (body, card body, a source's title and note), `kb-secondary` (captions, credit, hints,
numbers, the meta line), `kb-accent` (links, back links, the citation), `kb-surface-sunken` (loading, missing, the
followed source), `kb-border` (the row's hairlines), `kb-border-strong` (the image edge, the followed source's box),
`kb-accent-soft` (the citation you came back to). The tones are the 13 names `03-diagrams` owns, with provisional
values (below).

**The one bold move.** The figure row: the only place this job draws a frame, two hairlines that bracket the row with
its caption above the items in semibold ink, so a row reads as one statement made of two or three parts. Everything
else (the image edge, the caption, the sources) stays as quiet as the signed prose kit.

**What the review changed before any board was written** (held against the handoff, the operator's bar and the signed
reader):
- *Figure numbers ("Figure 1")*: cut. S2 has no number field, the signed reader numbers nothing but real sequences,
  and a citation already numbers its sources.
- *A wider track for `width: wide`*: cut. The operator asked "make the tables, and text bodies got same width" and
  round 02 removed the wide lane; `wide` instead keeps the column's edges and refuses to shrink below 36rem
  (open question 1).
- *An italic caption in the reading face*: revised to the interface face in secondary at the small step, so a caption
  is never mistaken for body text (the handoff's check), and it matches the signed table and code captions' role.
- *A card with a coloured left border*: cut as slop; a card is a soft tone ground with the title in the tone's ink.
- *A tap-to-zoom viewer*: cut. It is new scope (open question 4), and the render model has no JS widgets.
- *Dimming images in dark*: cut. Dimming changes what a screenshot says; a hairline edge and a light plate behind
  transparent pixels do the job without touching the pixels (open question 5).
- *Superscript citation numbers*: revised to the author's words plus "[n]" inside one link, so the target is the
  words' size, not a 9 px digit (open question 7).

## What was designed

### Pages

- **01 · Page — A chapter with figures and sources (the flow)** (`Main.dc.html`, 1440 × 929, interactive). The signed
  reader, mounted unchanged, reading three chapters: "Knowledge's Read Surfaces" (the codebase chapter, carrying every
  figure state), "Models of forgetting" (the subject chapter, carrying the chart, the matrix, the citations and the
  sources list) and the signed "Knowledge System Internals" (to show another chapter unchanged). Its state bar has the
  page's presets only, plus the display settings (Light, Dark, Sepia, System, Size 1, 3 and 5), and it scrolls away
  with the page (the operator's bar, rule 1). The foot strip links the widths board, the chapter screen alone and the
  stand-ins.
- **02 · Page — The figures at 390, 820 and 1440** (`Widths.dc.html`, 2794 × 1389, interactive). The signed widths
  board's frame, retitled, carrying 24 of this job's states; a click in any frame moves all three. It is 20 px taller
  than the signed board (1369): its lead runs to three lines (departure 8).
- **03 · Page — Chapter screen alone** (`Reader.dc.html`, signed, unchanged).
- **04 · Page — Stand-in for another job's screen** (`Elsewhere.dc.html`, signed, unchanged): the External link
  stand-in is where a source's URL lands.

### Components

- **05 · Component — Figure** (`FigureStates`): a column figure loaded, loading and missing; a light screenshot in dark
  and sepia; a transparent PNG in all three themes; a tall portrait and a small image at 820 and 390; `width: wide` at
  390 (the chart and a screenshot) beside the same chart as a column figure, and at 820; a long caption at sizes 1, 3
  and 5 and a Korean caption; a caption with a citation; an animated GIF playing and under reduced motion; loading and
  missing at 390 in dark and sepia.
- **06 · Component — Plain Markdown image** (`MdImageStates`): in a paragraph at 820 and 390, in dark and sepia,
  beside a figure (what sets it apart), loading and missing.
- **07 · Component — Figure row** (`RowStates`): two images; three mixed items (an image, an svg and a card, of
  unequal heights); a row with a diagram item (the stand-in); three cards at sizes 1, 3 and 5; two cards, three mixed
  and three cards across the themes; loading; Korean at 390.
- **08 · Component — Row card, every tone (provisional values)** (`CardStates`): the 13 tones in light, dark and sepia.
- **09 · Component — SVG block** (`SvgStates`): a UI mock and a 2×2 matrix at 820 and 390, in dark and sepia, and with
  Korean labels.
- **10 · Component — Sources list and citations** (`SourcesStates`): citations in the text, the citation you came back
  to, the list at 820 and 390, the item a citation led to (py-fsrs, cited three times; the 120-character URL), dark,
  sepia and Korean.

### Mounted parts

11 Figure, 12 Figure row, 13 Row card, 14 SVG block, 15 Sources list, 16 Prose (signed, with this job's blocks and
citations added), and 17–28 the signed parts copied unchanged (Top bar, Chapter bar, Chapter opening, Callout, Code
block, Table, Chapter list, Chapter end, Sign in to save, Display panel, Version history, Loading/not found/failed).

### Directions

None. The operator asked for no options.

## Every state, and where it is reached

On **01 · the flow**, by the state bar (page "Reader · a chapter with figures"):
Top of chapter · Row of two cards · Transparent PNG · SVG · UI mock · Row with a diagram item · Row of two images ·
Column figure · caption and credit · Plain Markdown image · Tall portrait · long caption · Small image · Wide figure ·
Animated GIF · Animated GIF · reduced motion · Row of three · unequal heights · Row of three cards · Images loading ·
Images loading · reduced motion · An image missing · 한국어 · captions.

Page "Reader · a chapter with sources": Top of chapter · Citations in the text · Wide chart · a citation in its
caption · SVG · 2×2 matrix · Sources list · After a citation · its source · Back at the citation · 한국어 · sources.

Page "Reader · another chapter": Another chapter (only state). Pages "Book page — another job", "Library — another
job" and "External link — outside the canvas": one preset each.

**Reached by clicking** (the same states, as a reader gets there):
- a citation in the text (or in the chart's caption) → the sources list, the item marked;
- a back link on that item ("‹ Back to the text", or "‹ a", "‹ b", "‹ c") → the exact citation, marked;
- a source's URL → the External link stand-in, whose "Back to the chapter" returns to the sources list;
- a caption's link to `#the-reader` or `chapter:` → that section or chapter; the chrome's back link, Contents,
  Previous/Next, language and Display controls work as signed;
- the figures chapter → the subject chapter: the link "Models of forgetting" in "The reader, today"
  (`chapter:ml-gently/forgetting`, a link across books, as S2's `chapter:` links allow). Nothing in the subject book
  links back to the maintainer guide, so in Play the way back to the figures chapter is restarting the prototype; every
  state of both pages is also on the state bar;
- the figures chapter ↔ "Another chapter": Previous and Next, as signed.

**Reached only by interaction, never forced on a board:** hover and focus on every link and back link (the signed
`rd-a` hover and the system focus ring); scrolling a wide figure or drawing sideways at 390 (the fades follow the
scroll position, measured).

## Data

### Chapters

- **"Knowledge's Read Surfaces: Two Front Ends, One Corpus"**, chapter 3 of the `knowledge` / `maintainer-guide`
  book (the real title). Its body was written for the canvas on the real chapter's subject, read with
  `git show origin/main:docs/knowledge/2026-08-08-knowledge-s-read-surfaces-two-front-ends-one-corpus.html` (read
  only; nothing pulled or merged). The real chapter's side-by-side rows (`.two`, `.planes`, `.doors`) are redrawn as
  `figures` rows ("Two readers", "One URL, two branches", the handshake row). On the canvas it is published as v2
  (20 Oct 2026) in English, with a Korean v1 written from it; the other four chapters of the book are the signed
  canvas's.
- **"Models of forgetting: how a review scheduler decides"** in **"Machine learning, gently"**, an invented subject
  book of four chapters (chapters 1 and 2 finished), with a Korean variant. It carries the chart, the matrix, the
  citations and the sources list.
- The signed "Knowledge System Internals" chapter, unchanged, as "Another chapter".

### Images (all made on this machine; none shows a project, document or org other than the maintainer guide)

| file | size | how it was made |
|---|---|---|
| `reader-desktop.webp` | 1440 × 900, 51 KB | screenshot of the signed snapshot (the internals chapter, light) rendered locally with the design-preview server in a throwaway browser profile, saved as WebP |
| `reader-contents.jpg` | 1440 × 900, 116 KB | the same, with the Contents sheet open, saved as JPEG (the wide figure) |
| `reader-phone.png` | 1170 × 2532, 260 KB | the same chapter at 390 × 844, device scale 3 (the tall portrait) |
| `end-phone.png` | 780 × 1688, 135 KB | the chapter's end on a phone, device scale 2 |
| `end-signed-in.png`, `end-signed-out.png` | 780 × 400, 23 and 27 KB | crops of the chapter end, signed in and out (no name, no email) |
| `chapter-bar.png` | 780 × 120, 13 KB | a crop of the chapter bar (the plain Markdown image) |
| `lang-switch.png` | 260 × 100, 5 KB | a crop of the language switch (the small image) |
| `bff-sketch.png` | 1192 × 315, 47 KB | a sketch drawn as SVG for the canvas and rasterized with `rsvg-convert`, dark lines on a transparent ground; set `width: wide`, so at 390 it keeps 36rem and scrolls rather than shrinking its labels past reading size |
| `recall-curves.png` | 1500 × 500, 19 KB | a 3:1 chart drawn locally (the FSRS-5 forgetting curve for stabilities of 2, 10 and 30 days), rasterized with `rsvg-convert` |
| `chrome-hides.gif` | 390 × 620, 4 frames, 89 KB | four local screenshots of the reader's chrome hiding on scroll, joined with `magick` |
| `chrome-hides-still.png` | 390 × 620, 70 KB | its first frame (the still a reduced-motion reader gets) |
| `logo.svg` | | copied from the signed canvas |

No photograph was needed, so no placeholder image appears.

### Sources (the subject chapter's list)

- **Real, every field exact** (from `works/phases/active/P29/slices/P29.S3/result.md` → *Sources*):
  [1] py-fsrs · Open Spaced Repetition · https://github.com/open-spaced-repetition/py-fsrs (cited three times);
  [2] Deck Options · Anki Manual · https://docs.ankiweb.net/deck-options.html;
  [3] Web Annotation Data Model · W3C · 23 February 2017 · https://www.w3.org/TR/annotation-model/;
  [6] ts-fsrs · https://github.com/open-spaced-repetition/ts-fsrs (title and URL only).
  Fields not known exactly (a date, an access date) are left out, never guessed.
- **Samples that read as samples**: [4] "Forgetting curves in practice", Example Press (sample), every field;
  [5] "Notes on scheduling reviews for long reading sessions", Example Quarterly (sample), with the 120-character
  URL on `example.com`; [7] "간격 반복 입문: 망각 곡선에서 복습 일정까지", 예시 출판사 (샘플), the Korean title;
  [8] "A sample flashcard deck format", title and URL only, never cited.
- The notes are written for the canvas. The signed-in reader stays the signed canvas's invented reader; no email,
  key or personal data appears anywhere.

### Placeholders

None. Every value shown is either the real one or a sample that says it is a sample.

## Files copied from the signed reader (`01-reader/rounds/02-revise/canvas/project/`)

**Unchanged, byte for byte:** `reader.css`, `Reader.dc.html`, `Elsewhere.dc.html`, `ReaderTop.dc.html`,
`ReaderBottom.dc.html`, `ChapterHead.dc.html`, `Callout.dc.html`, `CodeBlock.dc.html`, `ProseTable.dc.html`,
`ChapterList.dc.html`, `ChapterEnd.dc.html`, `SignInToSave.dc.html`, `DisplayPanel.dc.html`, `VersionList.dc.html`,
`ReaderState.dc.html`, `assets/logo.svg`.

**Extended (canvas-only machinery, so it renders this job's blocks):**
- `reader.js`: the signed file with, added, the typed fences `figure`, `figures`, `svg` and `sources` (YAML bodies),
  an image `![alt](asset:name)` splitting its paragraph, citations (`[words](#source-id)` links numbered by the
  sources list), the SVG allowlist parser, the asset map (name, width, height, transparent, animated, still), the
  `RD.figs` prototype store, and a data blob with this job's chapters. Every signed path is untouched.
- `flow.js`: the signed controller with this job's pages, presets and the prototype conditions (images loaded,
  loading or one missing; reduced motion; the citation target and the citation you came back to).
- `Prose.dc.html`: the signed mounted part with `figures.css` linked, a citation branch added after each of its eight
  link branches, and one branch per new block, each mounting this job's part. Its existing markup and look are
  unchanged, and so is its default document (shown when mounted alone): the signed `doc/field-notes/sqlite-wal`.
- `Main.dc.html` and `Widths.dc.html`: built from the signed boards' Reader and Elsewhere mounts and widths frame,
  retitled for this job.

**New:** `figures.css`, `Figure.dc.html`, `FigureRow.dc.html`, `RowCard.dc.html`, `SvgBlock.dc.html`,
`SourceList.dc.html`, the six Components boards, and the images above.

## The seams

- **`03-diagrams` (the tone palette and the diagram item).** I did not read `03-diagrams`' live tree: it is drafting
  in the same wave, and my contract forbids reading or copying a same-wave sibling's live canvas (a departure from
  the handoff's "You may read a sibling's tree", below). So:
  - the 13 tone names are `03-diagrams`' (`default`, `muted`, `accent`, `ok`, `warn`, `bad`, `store`,
    `series-1` … `series-6`), and their values here are **provisional, pending `03-diagrams`**. When its palette is
    signed, its values replace mine in `figures.css`, and nothing else in this job changes: a card uses
    `--fg-<tone>-ink` for its title and `--fg-<tone>-soft` for its ground; an `svg` uses the same pair through
    `kb-fill-<tone>` and `kb-stroke-<tone>`;
  - I assumed the palette is one pair per tone per theme, an ink for text and strokes (≥ 4.5:1 on the surface) and a
    soft ground (with body ink ≥ 4.5:1 on it). If `03-diagrams` defines more roles (a mid tone, a stroke distinct
    from text), the card keeps ink and soft;
  - a row's diagram item is a canvas-only stand-in in the signed `.rd-dgm` style (grey, dashed), naming
    "the diagrams job (03-diagrams)" and showing the diagram's title, which stays its text alternative. It never
    pretends to be the diagram's design. I assumed a diagram item sits in its row cell like any other item, at the
    cell's width, with its caption under it; if `03-diagrams` needs a minimum width for a kind (a sequence diagram),
    the row's stacking point (open question 2) is where it would apply.
- **`05-annotations`.** No bookmark, highlight or note control is drawn on any figure, row, drawing or source. I
  assumed: every block this job adds has a stable id (`figure`, `figures` and `svg` take the block's `#id`; a source
  item takes its source id; a plain image's wrapper takes `img-<asset name>` in the product, `canvas-img-<name>` on
  the canvas), so annotations can anchor to a whole block; a caption's text is ordinary text a highlight could cover;
  nothing in a figure's box takes a tap that a future control would need.
- **`04-quiz`.** No seam.

## Departures from the handoff

1. **Did not read the sibling trees** (`03-diagrams`, `04-quiz`, `05-annotations`). The handoff says "You may read a
   sibling's tree"; my standing contract says a same-wave job's live canvas is an unsigned draft another drafter is
   writing, never read or copied. So the tones are provisional and the diagram item is a stand-in, as the handoff's
   own fallback describes. The critic's cross-job look is where the two meet.
2. **`Prose.dc.html` is extended, not copied unchanged.** The handoff names `reader.js` and `flow.js` as the
   machinery to extend; the signed Prose part had to grow a branch per new block and a citation branch to show them
   in the chapter. Every signed branch, class and string in it is unchanged; only additions. Its default document
   (shown when the part is mounted alone, on board 16) stays the signed one (`doc/field-notes/sqlite-wal`), so board 16
   looks as signed at its signed size (1440 × 1181).
3. **Citations inside a callout or a table are not drawn.** The signed Callout and Table parts are copied unchanged,
   and their templates have no citation branch, so on this canvas a citation lives in paragraphs, list items and
   captions. In the product a citation is an ordinary link and works everywhere a link does (build prompt).
4. **The iPad in landscape (1024 × 768) is not drawn.** From 40rem up the column is 36rem and every row lays out as at
   820 (the handoff asks for it only where the layout changes there). The widths board says so.
5. **Reduced motion and image loading are prototype states.** A real device sets them; on the canvas the state bar
   sets them (a canvas-only class stands in for the media query), so the critic can see them.
6. **The preview's `layout-shift` lines on the two Pages are left as they are** (57 in pass 2: 23 on Main, 34 on
   Widths), exactly as the signed round's departure 31. Every one is the header moving from y 91 to y 3 when a preset
   lands inside the chapter: the page scrolls past the state bar, which the operator's bar (rule 1) says scrolls away
   and is never pinned. Nothing resizes, and the header holds still while a state shows.
7. **A part drawn alone points its in-chapter links at `#top`.** On boards 05–15 a citation, a back link and a
   caption's `#id` link have no target on the board (the chapter is not there), so the preview named them dead links
   in pass 1. Drawn alone, they point at `#top` and do nothing; in the chapter (boards 01, 02 and 16) they are the real
   `#id`s. Canvas only; the build prompt says so.
8. **Two signed board frames are taller**, the files unchanged: `Widths` 1369 → 1389 (its lead, rewritten for this
   job, is three lines) and `ChapterEnd` (board 24) 869 → 921. ChapterEnd, mounted alone, shows the internals
   chapter's end, whose "Next" card carries chapter 3's summary; chapter 3 is now this job's chapter, and its summary
   runs to two lines. The part is byte for byte the signed one; only its frame grew so nothing clips.

## Open questions (each answered in the one direction; only the operator's words settle them)

1. **`width: wide` in a one-column reader.** *Drawn:* `wide` keeps the column's two edges. From 40rem up it looks
   exactly like a column figure (576 px). What `wide` buys is that the image never shrinks below 36rem: narrower than
   that (a phone), it scrolls sideways in its own box with the signed scroll fades and the hint "Scroll sideways to
   see the whole image →", so a screenshot's small text stays readable. *For:* one edge for every block, as the
   operator asked of tables and code; the page never scrolls sideways; a phone reader can still read a dense
   screenshot. *Against:* on an iPad or a Mac, `wide` changes nothing, so an author who wants a big picture does not
   get one; the alternative is a wider track (for example 48rem from 64rem up), which breaks the signed one-column
   rule and needs the operator's word.
2. **A row of three in 36rem.** *Drawn:* rows stay in the column. Items sit side by side when the reader's frame is
   40rem or wider and each item has room for its text at the reader's size: two items need a 24em grid (true at every
   size), three need 33em of the column's small step (true at sizes 1–4; at size 5 a row of three stacks, even at
   820). Below 40rem every row stacks, in order. Items are top-aligned; a row of cards stretches to equal heights.
   *For:* never breaks the column; three 180 px items still read because their text is measured, not their pixels;
   the stacking point follows the text size, so size 5 never crushes a card. *Against:* three screenshots side by
   side at 180 px are small (the reader pinches); breaking out of the column, or stacking all rows of three, are the
   alternatives. The same rule covers a wide SVG at 390 (it scrolls; below).
3. **An image's size before it loads.** *Drawn:* the loading box is reserved at the image's proportions, on the
   sunken ground with the signed skeleton sheen (none under reduced motion), and the caption is already in place, so
   nothing below moves when the image arrives. *This needs the dimensions:* S1's asset map records a name and a hash;
   recording `width` and `height` at ingest (and `animated` plus a `still` for GIFs, question 6) is an **additive
   contract change for P30**. Without them the fallback is a 16:9 box that may jump once. A missing asset (the server
   knows it is absent) renders the missing box: an "IMAGE NOT AVAILABLE" label over the alt text, the caption kept. When the image
   fails after the page renders (the relay 404s, the network drops), the reader's existing client script (the one
   that already measures the scroll fades) swaps in the same missing box on the image's `error` event, and it ends the
   loading look on `load` (`is-loaded`; build prompt, part 1). Those two listeners are the only script this job adds.
   *Against:* without them, the browser's own alt text shows in the reserved box and the sheen sits under an opaque
   image; the operator may prefer no script at all.
4. **Opening an image larger.** *Drawn:* no viewer in v1. A phone reader pinches to zoom; a wide figure scrolls in its
   box. *For:* the render model has no JS widgets, and a viewer is new scope. *Against:* a screenshot's small text on
   a phone is hard to read; the zero-script alternative is making the image a link to the full-size asset (opens in
   the same tab); a real viewer is new scope the operator decides.
5. **Images in dark and sepia.** *Drawn:* the reader never changes an image's pixels (no dimming, no filters). Every
   image sits on a hairline edge (`kb-border-strong`, inset, taking no layout) in every theme, so a light screenshot
   on a light page and any image on a dark page reads as an image. Behind a transparent image there is a plate: the
   page's own surface in light and sepia, and a light plate (`#ece4d7`) in dark, so dark lines on no ground stay
   legible. *For:* a screenshot keeps its meaning; the edge does the separating. *Against:* a bright screenshot on the
   dark page is bright; dimming it (for example 85% brightness in dark) is the alternative. The plate is a new value
   (token gap).
6. **An animated GIF under reduced motion.** *Drawn:* the image is a `<picture>` whose `<source
   media="(prefers-reduced-motion: reduce)">` points at a still frame the server extracts at ingest, and under the
   caption a line says "Still frame: your device is set to reduce motion." No play button. *For:* no script; the
   reader's device setting is honoured exactly. *Against:* a reduced-motion reader cannot choose to play it; a play
   control would be new scope. This needs the asset map's `animated` flag and a `still` (question 3's contract change).
7. **Citations and the way back.** *Drawn:* a citation keeps the author's words and adds the source's number, inside
   one link: "py-fsrs [1]" (when the words are only a number, the link shows "[1]" alone). It goes to the item in the
   sources list, which is marked (a sunken ground and a hairline box; the product's `:target`). Each item ends with
   its way back: "‹ Back to the text" when cited once, or "Back to the text:" and "‹ a", "‹ b", "‹ c" when cited
   several times, each returning to that exact citation, which is marked with the accent's soft tint. The browser's
   Back also returns. *For:* the words keep the sentence readable; the number tells the reader it is a source, not a
   cross-reference; the target is the size of words, not a superscript. *Against:* a superscript number is the
   academic norm and is quieter in the line; a plain link with no number is quieter still, but then a source and a
   cross-reference look the same.
8. **The tone values** are provisional, pending `03-diagrams` (seams).
9. **`## Sources` and the block id `sources`.** S2's sources fence is ```` ```sources #sources ````; a chapter that
   also has a heading "Sources" gets the heading id `sources` too, and ids must be unique. The canvas writes the
   heading as `## Sources {#sources-list}`. Either the contract states that the heading takes another id, or the
   block's id changes; this is an observation for the S2 contract, not this job's to decide.
10. **English-only chrome inside a Korean chapter.** As signed, chrome copy is English: "Credit", "Image not
    available", "Back to the text", "Accessed", the hints. A Korean chapter therefore shows "CREDIT" over a Korean
    credit. Translating the chrome would be a change to the signed reader's rule.

## Component and token gaps

The system ships no components, so every part this job draws is a component gap, drawn as markup on its own board:
**Figure** (with its media box, loading and missing), **Plain Markdown image**, **Figure row**, **Row card**,
**SVG block** (frame, scroll and text alternative), **Sources list** and **Citation**.

Token gaps (values this job needs that the system lacks):
- **the tone palette**, 13 tones × (ink, soft) × 3 themes: `03-diagrams` owns it; values here provisional;
- **`--fg-plate`**, the ground behind a transparent image: the surface in light and sepia, `#ece4d7` in dark (the
  dark theme's ink colour, used as a ground);
- **`--fg-edge`**, the image edge: an alias of `kb-border-strong`, named so a theme can change it alone;
- **no image treatment** in the system: no figure, caption or credit style; this job's are in `figures.css`,
  reader-scoped.

None of these changes the app's own light or dark tokens outside the reader.

## Measured contrast (WCAG 2 relative luminance; tone grounds composited over the surface)

Theme surfaces: light `#fffefa`, dark `#232019`, sepia `#f6ecd6`.

**This job's text on the page** (secondary: captions, credit, hints, numbers, meta; accent: links, back links,
citations; ink: card body, source title and note):

| pair | light | dark | sepia |
|---|---|---|---|
| secondary on surface | 7.48 | 7.32 | 6.87 |
| accent on surface | 5.97 | 7.31 | 6.23 |
| ink on surface | 15.80 | 12.88 | 11.81 |
| secondary on sunken (missing box label, followed source's number and meta) | 6.23 | 6.78 | 5.96 |
| accent on sunken (followed source's URL and back links) | 4.98 | 6.77 | 5.41 |
| ink on sunken (missing box's alt text, followed source's title) | 13.18 | 11.94 | 10.24 |
| accent on the "came back to" tint (accent-soft over surface: `#dbe9e4`, `#303f38`, `#d3d7c3`) | 4.82 | 4.99 | 4.98 |
| ink on that tint | 12.75 | 8.79 | 9.42 |
| the transparent sketch's ink `#26211c` on its plate | 15.80 | 12.64 | 13.59 |

**The tones** (title = the tone's ink on its soft ground; body = `kb-ink` on the soft ground; link = `kb-accent` on
the soft ground; ink on surface = the tone's ink as an SVG stroke or label on the page). All text pairs ≥ 4.5:1; all
strokes ≥ 3:1.

| tone | light ground · title · body · link · on surface | dark ground · title · body · link · on surface | sepia ground · title · body · link · on surface |
|---|---|---|---|
| default | `#efe9db` · 13.18 · 13.18 · 4.98 · 15.80 | `#2a261e` · 11.94 · 11.94 · 6.77 · 12.88 | `#ecdcba` · 10.24 · 10.24 · 5.41 · 11.81 |
| muted | `#f4efe3` · 6.58 · 13.90 · 5.25 · 7.48 | `#1f1c16` · 7.65 · 13.47 · 7.64 · 7.32 | `#efe2c5` · 6.28 · 10.79 · 5.70 · 6.87 |
| accent | `#dbe9e4` · 7.02 · 12.75 · 4.82 · 8.70 | `#303f38` · 6.49 · 8.79 · 4.99 · 9.51 | `#d3d7c3` · 7.11 · 9.42 · 4.98 · 8.90 |
| ok | `#e6eedb` · 5.37 · 13.38 · 5.05 · 6.35 | `#363c2b` · 7.05 · 9.06 · 5.14 · 10.03 | `#e3e3bd` · 6.17 · 10.55 · 5.57 · 6.91 |
| warn | `#efe6d2` · 5.93 · 12.85 · 4.85 · 7.29 | `#3d3524` · 6.27 · 9.60 · 5.45 · 8.40 | `#eedcb4` · 6.42 · 10.25 · 5.41 · 7.39 |
| bad | `#f1e1db` · 5.62 · 12.56 · 4.74 · 7.07 | `#403128` · 5.68 · 9.86 · 5.59 · 7.42 | `#efd7c6` · 6.08 · 10.04 · 5.30 · 7.15 |
| store | `#f1e6ee` · 5.57 · 13.13 · 4.96 · 6.70 | `#3e3434` · 6.01 · 9.54 · 5.41 · 8.12 | `#ecd9d6` · 5.80 · 10.21 · 5.39 · 6.71 |
| series-1 | `#dcebe7` · 7.14 · 12.97 · 4.90 · 8.70 | `#2d3931` · 7.05 · 9.56 · 5.42 · 9.51 | `#dcdfc4` · 7.66 · 10.16 · 5.36 · 8.90 |
| series-2 | `#f1e7cf` · 5.98 · 12.97 · 4.90 · 7.29 | `#3d3524` · 6.27 · 9.60 · 5.45 · 8.40 | `#eedcb4` · 6.42 · 10.25 · 5.41 · 7.39 |
| series-3 | `#efe3ec` · 5.43 · 12.81 · 4.84 · 6.70 | `#3e3434` · 6.01 · 9.54 · 5.41 · 8.12 | `#ecd9d6` · 5.80 · 10.21 · 5.39 · 6.71 |
| series-4 | `#f4e0d9` · 5.61 · 12.54 · 4.74 · 7.07 | `#403128` · 5.68 · 9.86 · 5.59 · 7.42 | `#efd7c6` · 6.08 · 10.04 · 5.30 · 7.15 |
| series-5 | `#e2eaf3` · 5.37 · 13.14 · 4.96 · 6.46 | `#343838` · 6.44 · 9.41 · 5.34 · 8.82 | `#dfdfd2` · 5.65 · 10.31 · 5.44 · 6.47 |
| series-6 | `#e8ecd2` · 6.03 · 13.18 · 4.98 · 7.23 | `#3a3a26` · 6.91 · 9.18 · 5.21 · 9.69 | `#e4e1bd` · 5.96 · 10.43 · 5.51 · 6.74 |

The tone inks per theme are in `build-prompt.md` → *Tones*. The image edge (`kb-border-strong` on the surface:
1.58, 1.56, 1.64) and the row's hairlines are decorative separators, not UI parts that carry meaning, as the signed
reader's hairlines are.

## Canvas-only notes (never built)

- **The SVG renderer** on the canvas draws `g rect circle ellipse line polyline polygon path text tspan` only. Its
  `use` branch was dropped in pass 1 (no sample uses it, and its `href="{{ … }}"` hole was fetched before the runtime
  filled it); `defs`, `marker`, `title` and `desc` are not drawn either. The product renders the whole S2 allowlist
  (build prompt, *Canvas-only*).
- **Every `<img>` on the canvas is `loading="lazy"`**, which also keeps the browser from fetching the template's
  unfilled `{{ imgSrc }}` before the runtime runs. The product carries `loading="lazy" decoding="async"` for its own
  reason (build prompt, part 1).
- **Parts drawn alone** point their in-chapter links at `#top` (departure 7); **the plain image's id** on the canvas
  is `canvas-img-<name>`; the product's is `img-<name>`.
- **The state bar, the foot strip, the diagram stand-in, the stand-in screens, the widths board's frames and every
  Components board's captions** are canvas chrome (build prompt, *Canvas-only*).
- **The way between the two chapters is one way.** The figures chapter links to the subject chapter ("Models of
  forgetting", in "The reader, today"); the subject book has no reason to link back to the maintainer guide, so in
  Play the way back is restarting the prototype. Every state of both pages is also on the state bar.

## Render log

Every render used `python3 scripts/workflow.py design-preview 02-figures --runtime <the handoff's dc-runtime.js>
--out <scratch> --click` from the repo root, with the preview's throwaway browser profile. Two render passes; one
spot check after them, outside the passes, with the same server and a throwaway profile on a scratch copy of the tree.

**Before pass 1** (scratch screenshots while building, not render passes): a TypeError in the SVG walk and a
generated Prose board that had grown to 56 MB were fixed before the first pass.

### Pass 1: every board, click-through

`preview=done pngs=29 failed=0 issues=84 states=94` (the 28 boards, plus Main at 390; 94 states clicked).

- **frame-clip × 6:** Widths 1389 in 1369; FigureStates 5408 in 4200; RowStates 5829 in 4000; SourcesStates 5111 in
  3800; ChapterEnd 921 in 869; Prose 7175 in 1181 (its default document had become this job's chapter).
- **dead-link × 17 lines** (each "+N more like it") on CardStates, FigureStates, SourcesStates and SourceList: the
  in-chapter links of parts drawn alone (a citation, a back link, a card's `#id` link) had no target on the board.
- **not-found × 4:** `/{{ imgSrc }}` on Figure; `/{{ n.a.href }}`, `/{{ ng.a.href }}`, `/{{ ngg.a.href }}` on SvgBlock:
  the browser fetched a template hole before the runtime filled it.
- **layout-shift × 57** (Main and Widths): every one `header.rd-top y 91->3`, the page scrolling past the state bar
  (departure 6).
- **Seen on the PNGs:** in the row of three cards, the titles "Keep as is: kb-console.css is a copy" and "Never:
  allow-same-origin beside allow-scripts" broke inside the code names; the subject chapter's page had
  no way in by click from the figures chapter (the state bar shows only the current page's presets).

**Fixed:**
- frames set from measured content: Widths 1389, FigureStates 5440, RowStates 5860, SourcesStates 5140, ChapterEnd
  921 (departure 8); Prose's default document back to the signed `doc/field-notes/sqlite-wal`, so 1181 holds;
- parts drawn alone point their in-chapter links at `#top` (departure 7);
- images `loading="lazy"`; the SVG renderer's unused `use` branch dropped;
- the two card titles rewritten so no code name sits in a title: "Keep as is: the copied console stylesheet" and
  "Never: both sandbox flags at once", the code names moved into the bodies (English and Korean);
- a link into the subject chapter added to "The reader, today" ("Models of forgetting", `chapter:ml-gently/forgetting`;
  Korean "망각의 모델");
- `design-check 02-figures`: OK.

### Pass 2: the 15 changed boards, click-through

`--board` for Main, Widths, FigureStates, MdImageStates, RowStates, CardStates, SvgStates, SourcesStates, Figure,
FigureRow, RowCard, SvgBlock, SourceList, Prose and ChapterEnd. `preview=done pngs=16 failed=0 issues=57 states=94`.
Every board's content equals its frame, with `unmounted=0 errors=0 issues=0`; the 57 lines are the layout-shift
lines above (23 on Main, 34 on Widths), each `header.rd-top y 91->3` (departure 6). Link graph from Main: Widths,
Reader, Elsewhere.

I read every board PNG and the click-through states of Main and Widths. Holding as drawn: the column figure, its
loading and missing boxes and caption in all three themes; the transparent sketch on its plate in dark; the tall
portrait stopping at 36rem; the small image at its own size; the wide chart and screenshot scrolling at 390 with the
fade and the hint; the GIF and its still frame with its line; the rows side by side at 820 and stacked at 390 and at
size 5; the 13 tones in three themes; the UI mock and the 2×2 matrix at 820 and 390; citations, the source they lead
to (sunken, hairline box), the way back and the citation you came back to; the 120-character URL wrapping; the Korean
sources and captions; the signed chrome (Contents sheet, Display, Version history, Previous/Next) unchanged.

**Found and fixed after pass 2:**
- the "Never" card's body broke inside `allow-same-origin` at size 3 (the signed inline-code rule lets code break
  anywhere when it must). Reworded so the two code names sit at line starts: "`allow-scripts` with `allow-same-origin`
  lets a framed page remove its own sandbox." The spot check shows it whole at size 3, light and dark;
- `bff-sketch` as a column figure at 390 drew its labels too small to read. It is now `width: wide` (it keeps 36rem
  and scrolls with the hint), the case `wide` exists for (build prompt, part 2);
- the Plain Markdown image board said the image carries "no id"; it carries `img-<name>`, generated, never written by
  an author. The board's lead and row title now say so;
- a source cited once had the back link's `aria-label` "Back to where this source is cited", which does not contain
  its visible text "Back to the text" (label in name). It is now "Back to the text, in “<section>”", as the build
  prompt says.

**Accepted as signed behaviour, not changed:** Korean card titles look lighter than their Latin text (Noto Serif KR
loads 200–900; the signed callout titles in Korean look the same: the signed font pairing); a code chip in a caption
may break at a hyphen at 390 (the signed inline-code wrapping).

### Spot check after pass 2 (not a third pass)

The fixed tree, regenerated into scratch, measured with the preview's server: RowStates 5856 in 5860, CardStates 1658
in 1700, MdImageStates 2090 in 2140, FigureStates 5409 in 5440. I read the CardStates, MdImageStates and RowStates
shots (the three-card rows at size 3, light and dark). Then the real canvas was regenerated and
`design-check 02-figures` printed `design-check: OK -- 1 job(s), 1 round(s), 28 board(s), open rounds:
02-figures/01-figures`.

**Still open:** the 57 layout-shift lines (departure 6, as signed); the one-way link between the two chapters (above).
The Main and Widths click-through was not re-rendered after the four fixes after pass 2; they change copy, one aria
label and one figure's width, and the boards they touch were measured in the spot check.

## Critique pass 01

Answering `critique-01.md` (mode `critic`, verdict `revise`, 1 must-fix, 1 escalated choice, 6 advisory). Nothing
is held for a judge.

- **C01** (must-fix, `SourcesStates.dc.html`, the sources list never drew its target state): fixed. The board's
  `L()` helper put `target: ''` after the cell's own options, so it overwrote every `target` a cell passed. It now
  sets `target: ''` as a default before the cell's options (`Object.assign(K(cap, w, Object.assign({ target: '' }, o)),
  { isA: true, isB: false })`), so the cell's `target` wins. Nothing else on the board, in `SourceList.dc.html` or in
  `figures.css` changed. Re-rendered (`--board SourcesStates.dc.html --click`): `content=2400x5140 unmounted=0
  errors=0 issues=0`, the frame unchanged (the mark is a background and an inset hairline, so no item moves). Seen
  on the PNG: item [1] marked in the "py-fsrs, cited three times · 820" cell and in the Dark · 820 and Sepia · 820
  cells, item [5] (the 120-character URL) marked in the 390 cell; the default 820 and 390 lists, the Korean list and
  the three citation cells carry no mark. Four marked items of 56, as the critique expects.
- **C02** (choice, escalated: the tone palette differs from 03-diagrams' for `store`, `series-4` to `series-6`,
  `default`, and the stroke role): left to the operator, unchanged. It is not a must-fix and not mine to settle: the
  handoff names `03-diagrams` the palette's owner and says its signed values replace this job's, which stay
  provisional (departure 1, *The seams*); this drafter may not read the sibling's live canvas to align them. The
  default, if the operator says nothing else, is the handoff's rule.
- **Advisory 1 to 6** (no image viewer; card measure at sizes 3 and 4; bright images in dark; `wide` equal to a
  column figure from 40rem up; the sample chart's default colours and its "90% target" label touching "S = 30 days";
  the calm source mark): not acted on. Notes 1, 2, 3, 4 and 6 restate open questions 4, 2, 5, 1 and 7, which the
  handoff puts to the operator; each is answered in the one direction with its trade-off above. Note 5 concerns the
  sample data.
  The sample chart stands for an author's image as uploaded and does not change the figure treatment; it can be
  redrawn in the reader's tones with the labels apart if the operator wants it.

Render: one `--board` pass on the one changed board (this round's third render pass; the first two are above).
`design-check 02-figures`: `design-check: OK -- 1 job(s), 1 round(s), 28 board(s), open rounds: 02-figures/01-figures`.

### Read-back

Three points from the orchestrator's read-back. Nothing else changed. The sample data lives in the canvas's
`reader.js`; I regenerated the tree from the build sources. Against the tree before the read-back, only `reader.js`
differs: `canvas.json` and every board are byte-identical.

1. **The Korean `review-outcomes` matrix** (`ml-gently/forgetting`, Korean v1): the warn cell's title "이름", which
   reads as "name", is now "빠름" ("early"). It keeps the short `-음/-ㅁ` form of its neighbours "맞음" and "놓침";
   the line under it still says "너무 이른 복습". Seen on SvgStates (Matrix · Korean · 390).
2. **The `#two-branches` row** (`maintainer-guide/read-surfaces`, English v2 and Korean v1): I reworded it and did
   not re-crop the images.
   - The row caption now says "… Only the status changes." (Korean "… 달라지는 것은 상태뿐입니다."). Both crops
     show the same Mark as finished button; what differs is the status ("Not finished yet" against "Not saved") and
     the line under it.
   - The alts now describe the crops. Signed in: "the status “Not finished yet”, the line “Reaching this point marks
     the chapter finished.”, and a Mark as finished button". Signed out: "the status “Not saved”, the line
     “Signed-out reading isn't saved. Your display settings stay on this device.”, and the same Mark as finished
     button". The Korean alts carry the same content, with the English on-screen words glossed.
   - A longer first wording ("Only the status and the line under it change.") pushed RowStates 17 px past its frame
     (`check=frame-clip`, 5877 in 5860). The final wording is the old caption's length, so the frame and the canvas
     layout stay as they were.
3. **`build-prompt.md` §1, *Loading*:**
   - The server's markup is now given from the first paint: `fg-media fg-media--loading`, with the skeleton
     `<span class="rd-skel fg-media__skel" aria-hidden="true">` **before** the `<picture>`.
   - The rules are stated, the missing `is-loaded` pair included: `.fg-media__pic { position: relative; }`,
     `.fg-media.is-loaded { background: var(--fg-plate); }` and
     `.fg-media.is-loaded > .fg-media__skel { display: none; }`.
   - With these, the `<picture>` (positioned, after the skeleton) paints over the sheen in DOM order, and the
     `::after` edge still paints over both, so "Without the script, an opaque image covers the sheen" holds. The
     prompt now also says that a transparent image shows the sheen through its clear pixels until the script adds
     `is-loaded`.
   - The canvas is unchanged. Its loading box has no `<img>`, so its `figures.css` needs neither rule, and the
     prompt says so.

Render: `--board RowStates.dc.html --board SvgStates.dc.html --click` (both `content` equal to their frames,
`unmounted=0 errors=0 issues=0`) and `--board Main.dc.html --board Widths.dc.html --click` (94 states; no issue
line other than the 57 `header.rd-top` layout-shift lines of departure 6). I read the two Components boards, the
Korean matrix crop, the row at 820 and 390, and the Main states "Row of two images" and "한국어 · captions".
`design-check 02-figures`: `design-check: OK -- 1 job(s), 1 round(s), 28 board(s), open rounds: 02-figures/01-figures`.
