# Result — job `03-diagrams`, round `01-diagrams` (slice P29.S5)

Drafted in one direction. The intent lines and the plan were written before the first board; what follows them
was written at hand-back. The implementation contract is `build-prompt.md`.

## Intent, one line per Page

- **01 · Reader with diagrams (the flow).** The operator, reading a chapter on a phone, iPad or Mac, meets a
  drawing in the text column; the first thing they see is the drawing itself, its title above it and its caption
  under it, reading as part of the page, never as an embedded widget.
- **02 · The chapter screen alone.** The same screen without the flow's state, for the link graph.
- **03 · The reader at 390, 820 and 1440.** The operator checks one diagram at three widths at once; the first
  thing they see is how the same drawing fits, shrinks or scrolls at each width.
- **04 · The stand-in for another job's screen.** Copied unchanged, so the reader's chrome links land.

## Plan (written before the first board)

**Boards.** Pages on the first row: `Main` (the reader flow, every diagram state on its state bar), `Reader`
(alone), `Widths` (390, 820, 1440), `Elsewhere` (stand-in). Components on the rows below: `Tones` (the palette,
proposed, as fill, stroke, edge, bar and line in light, dark and sepia, plus print), `Figure` (the frame:
title, caption, no caption, the scroll rule, sizes 1, 3 and 5), one board per kind (`KindFlow`, `KindState`,
`KindSequence`, `KindStack`, `KindTimeline`, `KindChart`) with every state the handoff names, and `Narrow` (the
widest diagram at 390 and the figure-row item at 180 px). One mounted part, `Diagram`, draws every diagram from
the block's own data; the reader's copied parts follow as mounted parts.

**Where the states live in the prototype.** The reader's sample chapter keeps its diagram (EN v2, EN v1, KO v1).
A specimen book, *Diagrams, kind by kind* (written for this canvas, in the library's real shape: one project, an
ordered list of chapters), holds one chapter per kind plus the Korean, near-the-limits and tones chapters, every
drawing built from a real fact of `knowledge` where the handoff names one. The state bar jumps to each.

**Type steps inside a drawing (four).** Node label: interface face (Source Sans 3, Pretendard for Hangul),
600, 15 px at the default size. Small text (sub lines, edge labels, axis ticks, items): 400, 13 px. Group and
lane names: 600, 13 px. Entity fields: JetBrains Mono, 13 px. All four scale with the reader's text size (the
drawing's em is `--rd-fs-s`). The figure's title takes the interface face at `--rd-fs-s`, 600; the caption the
reading face (Literata) at `--rd-fs-s`, in `kb-secondary`.

**Spacing.** The slot's `lg × k` above (as code); `sm × k` between the title and the drawing and between the
drawing and the caption. Inside a drawing: a 44 px column gap and a 40 px row gap at the default size, growing
where a label or a parallel edge needs room; 12 px node padding.

**Colour roles.** The page ground (`kb-surface`) is the diagram's ground: no plate, no frame, hairlines
instead of boxes. Lines in the tone's line value; text in `kb-ink` (labels) and `kb-secondary` (small text);
fills are tints. Teal stays the one accent: the `accent` tone is for the one node or path an author marks.

**The bold move.** The drawing is typeset, not illustrated: it is set in the book's own faces and ink, on the
page itself, at the reader's text size, so it reads as part of the chapter. The one memorable element is the
edge label knocked out of its line, the way a printed figure sets it.

**Review of the plan against the handoff and the bar.**
- A boxed "diagram card" with a header bar (the default for any product) was replaced by the bare figure on the
  page: the system's "hairlines instead of boxes" and the reader's prose column call for it, and a framed card
  around tinted group regions would nest boxes in boxes.
- A per-kind Page set (six Pages) was replaced by one reader flow plus Components boards: the handoff caps the
  surface at about five Pages.
- A thirteen-colour palette with thirteen value sets was cut to two neutrals and six hues: `accent` and
  `series-1` are one teal, `warn` and `series-2` one bronze, `store` and `series-4` one slate, `bad` and
  `series-5` one brick, `ok` and `series-6` one olive, and `series-3` is plum. Near-identical values for one
  hue would be near-misses.
- The state bar scrolls away with the page (the operator's bar rule 1): it stays inside the reader's scroller,
  as signed.

**Changes to the plan while building.**
- The grid gaps were planned at 44 px between columns and 40 px between rows, and built at 40 and 36 px. The tighter
  grid keeps more drawings inside the 576 px column at their natural size and still reads as air between nodes.
  Parallel edges and edge labels still widen a gap where they need room.
- The groups (lanes and layers) are always drawn in the `muted` tone. The schema gives a group no `tone`, and a
  tinted group behind tinted nodes would put two hue grounds on top of each other.
- The bold move is unchanged: the edge label knocked out of its line. The same knock-out now carries a group's name
  where an edge passes under it, and, after pass 2, a sequence step's label where it crosses a lifeline.

## What was designed

**Pages (first row).**
- **01 · Page — Reader with diagrams (the flow)** (`Main.dc.html`, 1440 × 929, fill, interactive). This is the
  signed reader with this job's diagram block in its slot. The state bar reaches every diagram state:
  - the sample diagram in EN v2, EN v1 and KO v1;
  - no caption;
  - flow: pipeline in lanes, a loop, layers and shapes, tables, no node placed, long labels;
  - state: start, end and a transition to itself;
  - sequence: a reply and a note, and six actors;
  - stack: plain and nested;
  - timeline;
  - chart: bar, grouped bars, lines, interval, below zero, long labels, and 200 points;
  - 한국어 labels;
  - near the limits: 60 nodes and 12 lanes;
  - every tone;
  - text sizes 1, 3 and 5, and the themes Light, Dark, Sepia and System;
  - the copied stand-ins.

  Clicks reach the rest: the chapter bar's Previous and Next, Contents, Display, the language switch and the caption
  links.
- **02 · Page — Chapter screen alone** (`Reader.dc.html`). This is the signed board with only its head changed, so
  it loads the diagram files.
- **03 · Page — Diagrams at 390, 820 and 1440** (`Widths.dc.html`, interactive). One state is drawn three times, in
  three frames. Each frame has its own state bar at the top of its page, which scrolls away with the chapter. A
  diagram, text size or theme picked in one frame shows in all three.
- **04 · Page — Stand-in for another job's screen** (`Elsewhere.dc.html`). Copied unchanged.

**Foundations.**
- **05 · Foundations — The diagram tones (proposed)** (`Tones.dc.html`) shows:
  - the 13 tones with their classes, and each tone's line, ink and tint with its lowest measured ratio, in light,
    dark, sepia and print;
  - every tone as a node and an edge, as a layer, as a bar and as a line;
  - the six series as grouped bars, in every theme.

**Components (rows 2 and 3).** Each one is drawn by the one `Diagram` part, from the block's own data.
- **06 · Component — The figure in the slot** shows:
  - the title, drawing and caption;
  - no caption;
  - a caption with a link, and a caption with a missing link;
  - the sample in EN v1 and KO v1;
  - text sizes 1, 3 and 5;
  - a drawing wider than the column, at its start, middle and end (the fades);
  - dark and sepia.
- **07 · Component — Flow** shows:
  - the pipeline in two lanes (light, dark and sepia);
  - a loop;
  - layers with every shape (pill, box and store) and toned edges with labels;
  - tables (entity with fields);
  - no node placed;
  - long labels and sub lines;
  - Korean labels, including long Korean labels with keep-all;
  - the phone at 390.
- **08 · Component — State** shows:
  - the card status (start, end, a transition to the same state, and a pair each way between Active and
    Suspended) in three themes;
  - the chapter states (a way back between neighbours, no end state, no caption) in three themes;
  - 390 and size 5.
- **09 · Component — Sequence** shows:
  - two actors, with notes and steps to itself, in three themes (no message answers another, so none is dashed);
  - six actors, with two dashed replies and a note, in the text column and at 390, at the start and scrolled to the
    end.
- **10 · Component — Stack** shows plain layers with items and tones, and nested layers, in three themes, plus 390
  and size 5.
- **11 · Component — Timeline** shows:
  - lanes, bars and marks, with a short bar and overlapping bars, in three themes;
  - twelve lanes;
  - the position writes and the twelve lanes at 390.
- **12 · Component — Chart** shows:
  - bar: one series, thirteen categories in rows, with a mean rule;
  - grouped bars with a goal rule;
  - lines with a mean rule;
  - interval;
  - below zero;
  - long category names;
  - 200 points;
  - each in light and dark or sepia, and at 390.
- **13 · Component — Narrow** shows:
  - the 60-node map at 390, at the start and in the middle, and in the desktop column;
  - a figure-row item a third of the column wide (about 180 px): a small flow, the pipeline, a bar chart, a stack
    and a timeline;
  - a figure-row item half the column wide (about 280 px): the pipeline, lines and the card status.

**Mounted parts (row 4).**
- **14 · Mounted part — Diagram (one instance)** (`Diagram.dc.html`) is the renderer: one `x-dc` board that draws
  any of the six kinds from a `block` prop. Its props are:
  - `bare`, for inside the reader's slot;
  - `size` and `theme`, `pad`, `lang`, `scroll`;
  - `on-link`.
- **15–27** are the reader's mounted parts, copied from the signed round. Only `Prose` changed: its `.rd-dgm`
  stand-in is replaced by the `Diagram` import, as the handoff asks.

**Directions:** none (one direction; the handoff quotes no request for options).

## The open calls, as drawn (Q1–Q6, for the operator)

1. **The widest diagram on a phone: grow, cap, shrink to a floor, then scroll.**
   - A drawn kind (flow, state, sequence) is `width: clamp(ceil(W × 11/13)px, 100%, W/15 em)`.
   - It shows at its natural size, and never grows past the column.
   - It shrinks with the column until its 13 px small text is 11 px. Below that floor it keeps its size and scrolls
     in its own box, with the signed fades and the hint "Scroll sideways to see the whole drawing →".
   - At 390 the column is about 356 px. A drawing up to 356 px shows whole, up to 421 px shrinks to fit, and a wider
     one scrolls. The six-actor sequence (924 px) and the 60-node map (1351 px since critique pass 01) scroll; the
     pipeline shrinks then scrolls; the card status (427 px) shrinks, then scrolls a little.
   - The other side: shrinking every drawing to fit would show the whole shape at a glance, but the text in the
     six-actor sequence would fall to about 5 px.
2. **Text sizes: the drawing grows with the reader's text size.** Its em is the figure's font size,
   `max(11px, var(--rd-fs-s))`. At sizes 1 to 5 that is 12.5, 13.75, 15, 16.67 and 18.33 px. A wide drawing stops
   growing at the column's width, so at size 5 the sample stays at the column (its default width is already about
   570 px). The row kinds are HTML in em, so they grow and re-flow with the column.
   - The other side: a fixed size, like the interface, would keep every drawing's layout identical across sizes, but
     would break the reader's promise that text grows.
3. **`interval` values:** `[low, high]` or `[low, median, high]` per category. The band runs low to high, the mark is
   the median, and the text under the band reads "4–21 · median 9". This is a proposed contract detail for P30.
4. **What assistive technology reads.** The title is the figure's accessible name and the caption its
   `<figcaption>`. The drawing itself is `aria-hidden`.
   - After the drawing, a visually hidden "The drawing, as text." gives its content once:
     - a list for flow, state and timeline;
     - an `<ol>` for sequence;
     - a `<table>` for charts.
   - A stack is real lists, visible. In a nested stack, a hidden "Inside {outer}: " precedes each inner layer.
   - The other side: hiding everything behind the title is simpler, but the drawing's facts would be unreachable.
5. **A figure-row item** (about 180 or 280 px) follows the same rule as any narrow column, and nothing is simplified.
   - A small flow fits.
   - A bar chart in rows and a stack re-flow and fit.
   - The timeline (18.7em, about 281 px) and wide flows scroll in their own box.
   - `02-figures` mirrors this.
6. **Self-transitions are drawn.**
   - In flow and state: a loop over the node's top, labelled on its top.
   - In sequence: a loop to the right of the lifeline, numbered like any step.
   - Ingest need not reject them.

## Data

**Real facts.** Each was checked against its source, and the canvas is public.
- **The maintainer guide, chapter 2**, on `origin/main`
  (`docs/knowledge/2026-08-08-knowledge-system-internals-…-contracts.html`, read with `git show`). It supplies:
  - the write path: validate the inputs under the write lock, write the file, add the Recent bullet, upsert the row,
    then a scoped git commit; the 201 goes out; then push and embed on the publish worker; re-publish archives the
    current body; the first document creates the landing page;
  - the six-actor publish sequence, ending "The push task takes the same write lock itself.";
  - who talks to whom: the sealed cookie, the bearer server to server, the caller's bearer, the content and accounts
    planes, `docs/` and git, SQLite FTS5 WAL, Postgres;
  - "/api/* is frozen. External consumers code against it." (so a coding agent may call the API directly, which is
    why the plain stack's caption claims no strict layering; critique pass 01, C02);
  - the read-back-before-retry rule;
  - `reindex()`, rebuilding the database from the files;
  - the stack from the reader to the disk, in the Layers flow's four groups (Clients, Servers, the API, Storage);
  - the nested stack: one API container, one uvicorn worker, one FastAPI app, one `WRITE_LOCK`.
- **`phase.md` S2 *Legacy path*:** the legacy bridge (`restore {anchor | fraction}`, `scroll {fraction, anchor}`,
  `navigate {href}`). None of the three answers another, so none is drawn dashed (critique pass 01, C07).
- **`phase.md` S3:**
  - *Tables*: four of the reader-state tables with key fields (`quiz_attempts`, `review_cards`, `review_logs`,
    `reader_annotations`), with "Key fields only" in the caption;
  - *Resume and progress*: the chapter states, and the "Resume, in three steps" row item;
  - the review card's status (active, suspended, retired; a changed type resets), and the way back from suspended:
    `PATCH /app/reader/review/cards/{id} {status: active|suspended}` (S3 *Routes and writes*; critique pass 01, C03);
  - *Routes and writes*: the position writes (2 s after scrolling stops, at most every 15 s, and the `pagehide`
    beacon).
- **`slices/P29.S2/result.md` §1.3:** today's figures by kind (flow 36, chart 14, timeline 13, architecture 11,
  sequence 10, annotated 10, stack 8, comparison 6, state 6, ER 4, UI mock 4, matrix 3, tree 1) and the mean of 9.7
  (126 figures in 37 explainers).
- **The signed reader:**
  - the sample chapter, and its diagram's title and caption in EN v2, EN v1 and KO v1, used as they are;
  - the maintainer guide's chapter list, the WAL document and the stand-ins, all copied.

**Written for this canvas.** Every chart caption says these are sample numbers.
- The specimen book *Diagrams, kind by kind* (project `knowledge`, seven chapters, in the library's real shape).
- English study samples: cards reviewed per week by deck, recall by days since the last review (days 3 to 30), time
  to answer by quiz type, and change in study hours month on month.
- Hours this month against last, by subject, with long names and one Korean name.
- An AI study sample: training loss over 200 steps.
- An invented project, *Tidewater*, near the limits: a 60-node, 85-edge map in six layers, and twelve stations'
  backfill windows on 12 lanes.
- Every Korean label, and the long English and Korean labels.
- The tone specimens.

**Placeholders:** none. No glide-ilab or base material, nothing from `arb_upbit_1`, and no secret, email or personal
data. The signed-in reader stays the signed reader's invented name.

## Files copied from the signed reader (`jobs/01-reader/rounds/02-revise/canvas/project/`)

- **Unchanged** (byte-identical, checked with `cmp` at hand-back):
  - `reader.css`;
  - `Elsewhere.dc.html`, `ReaderTop.dc.html`, `ReaderBottom.dc.html`, `ChapterHead.dc.html`, `Callout.dc.html`,
    `CodeBlock.dc.html`, `ProseTable.dc.html`, `ChapterList.dc.html`, `ChapterEnd.dc.html`,
    `SignInToSave.dc.html`, `DisplayPanel.dc.html`, `VersionList.dc.html`, `ReaderState.dc.html`;
  - `assets/logo.svg`.
- **Copied, then extended** (canvas machinery only, so it renders this job's block):
  - `reader.js`: one line. The parsed diagram block also carries its whole YAML (`spec`) and the Hangul wrap option,
    for the `Diagram` part.
  - `flow.js`:
    - the chapter presets are replaced by the diagram presets (departure 1);
    - the specimen book's address prefix and an `at()` helper that opens a chapter at a block;
    - the size and theme presets on the bar (`device()`).
  - `Main.dc.html`:
    - its title;
    - the diagram files in its head;
    - the foot strip's Widths link text;
    - it opens on the sample diagram.
  - `Reader.dc.html`: the diagram files in its head.
  - `Widths.dc.html`: its title and lead, its preset keys, and the device bar from `flow.js`.
  - `Prose.dc.html`: the diagram files in its head, and the `.rd-dgm` stand-in replaced by
    `<dc-import name="Diagram" block="{{ b }}" bare="{{ true }}" …>`.
  - `canvas.json`: rebuilt for this job's 27 boards. The `designSystems` record is `knowledge`, `kb`, at version
    `1792321604-e214`.
- **New:**
  - `diagram.css` (the tones, the classes and the drawing's styles);
  - `dg.js` (the shared helpers, YAML reading, text measuring and the build);
  - `dggraph.js` (flow, state and sequence layout);
  - `dgrows.js` (stack, timeline and chart);
  - `dgdata.js` (the specimen book and every sample);
  - `Diagram.dc.html`, `Tones.dc.html`, `Figure.dc.html`, `KindFlow.dc.html`, `KindState.dc.html`,
    `KindSequence.dc.html`, `KindStack.dc.html`, `KindTimeline.dc.html`, `KindChart.dc.html`, `Narrow.dc.html`.

## Where the palette lives for `02-figures`, and the seams

- **The palette:** `jobs/03-diagrams/canvas/project/diagram.css`.
  - Its custom properties are `--dg-<tone>` (line), `--dg-<tone>-ink` and `--dg-<tone>-tint`. Light is on `:root`,
    `[data-theme="light"]` and an unthemed `.rd-frame`. Dark and sepia are on `[data-theme="dark"]` and
    `[data-theme="sepia"]`. Print takes the light values.
  - The `svg` classes are `.kb-fill-<tone>` (tint; on `text`/`tspan`, the ink) and `.kb-stroke-<tone>` (the line,
    plus `color`).
  - Board 05 shows them with their measured ratios. The build prompt's *The tones* lists every value.
- **Assumed at the seams:**
  - A figure-row item is a third of the column (about 180 px) or a half (about 280 px), and follows Q5's rule.
  - A figure-row card's `tone` takes the tint as its ground, the line as its border or rule, and the ink for any text
    in the tone.
  - No annotation control is drawn on a diagram (that is `05-annotations`' work).
  - The live trees of `02-figures`, `04-quiz` and `05-annotations` were not read.

## Departures from the handoff

1. **The flow page's state bar carries this job's states, not the signed reader's.**
   - In the copied `flow.js`, the reader's 22 chapter presets and four of its five loose-document presets (Top of
     document stays) are replaced by 27 diagram presets and a size and theme row. The five stand-in presets are
     kept.
   - The reader's own states are unchanged on the signed canvas, and its chrome still works here by click (Display,
     Contents, Previous and Next, the language switch).
   - Reason: a page's bar holds only what that page shows (the shipped bar), and here that is the diagrams. This is
     canvas-only machinery, never built.
2. **The sample "One FastAPI process, two planes" stays a `flow`,** not the `stack` the handoff's Data section
   suggests. It draws as a group holding the two planes, with a store and the `reindex()` edge back.
   - The handoff allows it ("Which kind carries which subject is yours to change").
   - Its signed title and caption are used unchanged.
   - Two stacks carry the same system facts (boards 10 and 13).
3. **The `check=layout-shift` lines are left open:** 59 in pass 2 (41 on Main, 18 on Widths), and 58 in the
   critique pass's last render (40 on Main, 18 on Widths). Each one is the reader's
   `header.rd-top` moving between y 3 and 117 when a preset lands at the chapter's top or inside it. The state bar
   scrolls away (bar rule 1), so the header moves by the bar's height. No control resized. This is the signed
   reader's departure 31, which the operator signed with.
4. **The light `muted` line is a new value, `#8a8071`, not `kb-hint`.** The light `kb-hint` `#8f8676` measures 2.97:1
   on `kb-surface-sunken`, under the 3:1 a line needs. The dark and sepia `muted` lines are their themes' `kb-hint`.
   The value is reader-scoped and changes no app token.
5. **The scroll fades over a diagram fade into `kb-surface`,** where §9a names `--rd-code-bg` for "a drawing". §9a
   says the fade fades into "the block's own ground". The ASCII drawing it was written for sits on a code plate; a
   diagram has no plate and sits on the page. The signed rule is applied, not changed.
6. **Groups are always `muted`** (see *Changes to the plan*). The contract gives a group no tone, so nothing is lost.
7. **The nested-stack lift rule.** In a nested stack, a `muted` layer inside a hue-toned layer draws its border in the
   `default` line. The muted line on a hue tint measures 3.06 (light), 2.55 (dark) and 2.89 (sepia), under 3:1. This
   is a rendering rule; the data is unchanged.
8. **iPad landscape (1024 × 768) has no frame of its own.** The handoff asks for it "where a drawing changes there".
   No drawing changes, because the column is the same 576 px from 40rem up. The build prompt says so.
9. **The component boards wrap each specimen in a canvas-only cell** (`.dg-cell`: `kb-space-lg` by the reader's
   gutter, on the reader's frame), so a light, dark or sepia specimen shows its own page ground. This is never built.

## Component and token gaps

- **No components ship with the system** (no bundle, no `x-import`). The diagram renderer is markup on its own board
  (`14 · Diagram`, mounted by every page and component board). The reader's parts are the signed round's gaps,
  copied.
- **No tone tokens.** These are proposed values: 39 custom properties per theme, and print. They are listed in the
  build prompt as values P30 adds, scoped to the reader.
  - Reused from the system: teal `kb-accent-strong`, the `status-idle` and `status-revoked` families, `kb-ink-plum`,
    and the dark and sepia `kb-hint`.
  - New: slate and olive, the dark and sepia hues the system lacks, the tints, and the light `muted` line.
- **No graph or diagram component.** The product's knowledge graph (`graph-tokens.css`) is a different surface and
  was not used.
- **No Hangul face in the cache.** The interface face stack names Pretendard, but the canvas does not load it, so
  Hangul inside a drawing renders in the system Hangul font (Apple SD Gothic Neo on the Mac). The caption's Noto
  Serif KR loads from Google Fonts CSS, as in the reader.

## States reached only by interaction

- **Keyboard focus on a scrolling drawing's box.** At 390, a wide drawing's box is a focusable region ("Drawing,
  scrolls sideways") with the system's focus ring (`kb-focus-w` in `kb-accent`). Tab to it on 01 or 03.
- **Scrolling a wide drawing.** The fades follow the scroll position: right at the start, both in the middle, left at
  the end. Board 06 draws all three by prop; live, scroll the box.
- **Caption links.** "the maintainer guide, chapter 2" and "the shipping chapter" go to a chapter state or a stand-in
  of this canvas. The missing link shows its signed style.
- **The Display panel and the language switch** are reached by click; the bar's size and theme row reaches the same
  values.
- **No hover state.** A diagram is static, and nothing a reader needs depends on hover.

## Render log

**Before pass 1.** The layout code was checked in node with a text-measuring stub (scratch scripts, not in the tree).
Every sample builds, and the flows and state diagrams have:
- no two edges sharing a segment;
- no edge crossing a node;
- no edge label clashing with another label or a node.

**Pass 1: `design-preview --click`, all 27 boards.** The result was 28 PNGs, 94 states, `failed=0` and 164 `issue`
lines.
- **45 `runtime-error` and 45 `click-error`:** `ChapterList.renderVals()` read `versions` of undefined. The Korean
  specimen chapter existed only in `ko`, and the copied chapter list reads each chapter's `en` variant. Fixed by
  giving that chapter an English variant ("Korean labels").
- **18 `clipped`:** the nested stack's visually hidden "Inside …:" spans measured as clipped text in their 1 px box.
  Fixed by making the hidden block's children blocks.
- **4 `frame-clip`:** board heights raised to their content.
- **52 `layout-shift`:** bar rule 1 (departure 3).
- **Fixed from reading the PNGs:**
  - a toned edge drew in the default line (CSS order);
  - two collinear edges overlapped (ports nudged apart);
  - lifelines moved under every other layer, so a note covers them;
  - rule labels moved past the plot's right end and pushed apart;
  - the size 5 caption;
  - the Tones board's class lines;
  - a lone "·" at a line's end (a separator now binds to the item after it);
  - an empty chapter summary;
  - the board heights.

**Pass 2: `design-preview --click --board …`, the 14 changed boards** (Elsewhere and the copied parts were unchanged
and not re-rendered). The result was 15 PNGs, 94 states, `failed=0` and 60 `issue` lines: 59 `layout-shift`
(departure 3) and 1 `frame-clip` (Tones, 4666 px of content in 4660). Every PNG was read.
- Seen and right:
  - the stand-in is gone, and the reader's chrome, column and spacing around the slot are as signed;
  - every kind in three themes;
  - the 60-node map and the twelve lanes;
  - Korean with keep-all;
  - the phone scrolling with its fades and hint, and the figure-row items;
  - size 5 capping at the column.
- **Fixed after pass 2, not re-rendered.** The two passes were spent, so these were checked in node and by
  `design-check` only:
  1. **Tones `h` 4660 → 4670.** It covers the 6 px frame-clip. The rows below moved down 10 px. Layout is unchanged.
  2. **Sequence step labels crossed by a lifeline.** In the six-actor sequence, steps 5 and 7's labels sat across the
     SQLite lifeline. Each step's number and label is now knocked out of any lifeline it crosses (a `kb-surface`
     rect, 3 px wider each side). Node check: the 2 label crossings are both covered.
  3. **A numeric line axis did not name where it starts** (the first tick was 10 on a 1–30 axis). The axis now adds
     its `from` value when the round ticks start more than 8% in. The recall sample now runs from day 3 to 30, so its
     points sit on whole days. Node check: the ticks read 3, 10, 20, 30; 1, 50, 100, 150, 200; and 1, 2, 4, 6, 8.
  4. **The chart's hidden table.** An interval cell read "4–9–21", and a numeric line's rows were numbered 1, 2, 3…
     rather than by their x value. They now read "4–21, median 9" and the x value (3, 6, 9…).
- **Left open:** the 59 `layout-shift` lines (departure 3). `design-check 03-diagrams` exits 0.

**Before pass 3 (critique pass 01).** The changed layout code was checked again in node with the stub: every sample
builds with no label straddling a group border, no label overlapping a node or another label, and no edge clash. The
natural sizes are now: the 60-node map 1351 × 830, the layers 588 × 551, the hero 653 × 156 and the card status
427 × 232.

**Pass 3: `design-preview --click`, all 27 boards.** The result was 28 PNGs, 94 states, `failed=0` and 61 `issue`
lines: 58 `layout-shift` (departure 3) and 3 `frame-clip` (Tones +16, KindFlow +10 and KindState +37 px, from the
longer Tones lead and the new edge and samples).
- **Fixed after pass 3:**
  - the three heights: Tones 4690, KindFlow 3864 and KindState 1440, with rows 3 and 4 moved down 20 px;
  - the labels of a pair each way now wrap at 96 px, so they hug their own lines and the card status stays 427 px
    wide;
  - **a stack item that wraps lost its first letters on its later lines** to the separator clip: in the third-column
    figure-row stack, "sealed-cookie" read "okie" and "<slug>" read "ug>". The separator now sits in the item's own
    left padding, so a wrapped item's later lines start clear of the clip;
  - **a timeline label's new ground cut its own bar's bottom border** under the label (0.8 px of overlap). The bars
    now paint above the labels (`z-index: 1`).
- **Probed in the browser** (CDP, a throwaway profile):
  - no knock-out box straddles a group border on Main, KindFlow, Figure, Widths or Narrow;
  - every one of Main's 27 diagram presets reads pressed after it lands, at 1440 and at 390;
  - every one of Widths' 18 presets reads pressed, in each of its three frames.

**Pass 4: `design-preview --click --board …`, the 14 boards that load the renderer.** The result was 15 PNGs, 94
states, `failed=0` and 58 `issue` lines, every one a `layout-shift` of `header.rd-top` (departure 3). Every PNG was
read.
- Seen and right:
  - the stacks in three themes, at 390, at size 5 and as the third-column item: no line opens or ends with a dot, and
    every letter of a wrapped item shows;
  - the timeline bars whole under their labels, and no gridline through a word;
  - the card status with the way back from Suspended in three themes, at 390 and at size 5;
  - the layers labels in the corridors between groups;
  - the bridge drawn solid;
  - the Tones lead;
  - Main's stack preset, and the phone's first view.
- **Left open:** the 58 `layout-shift` lines (departure 3). `design-check 03-diagrams` exits 0.

## Measured contrast of every tone

Each value was measured from the hex values (WCAG relative luminance), because `design-preview` does not measure SVG
text. The columns are:
- **line:** the tone's line against the page (`kb-surface`, the diagram's own ground), the app ground (`kb-paper`)
  and the group ground (`kb-surface-sunken`, the muted tint);
- **line on own tint:** a node's border on its own fill;
- **default line on this tint:** an edge meeting a toned node;
- **ink:** text in the tone against the page, the app ground, the group ground and its own tint;
- **tint vs page:** the fill against the page;
- **kb-ink / kb-secondary on tint:** the label and the sub line on the fill.

Lines and UI need 3:1, and text needs 4.5:1. A fill is never a shape's only edge: the line draws it, so the tints'
1.00–1.40 against the page carry no meaning on their own.

**Light** (page `kb-surface` #fffefa, app ground `kb-paper` #f6f2e8, group ground `kb-surface-sunken` #efe9db; `kb-ink` #26211c, `kb-secondary` #5c5347)

| Tone | Line | line on page / paper / sunken | line on own tint | default line on this tint | Ink | ink on page / paper / sunken / own tint | Tint | tint vs page | kb-ink / kb-secondary on tint |
|---|---|---|---|---|---|---|---|---|---|
| `default` | #7c7362 | 4.64 / 4.19 / 3.87 | 4.64 | 4.64 | #26211c | 15.80 / 14.27 / 13.18 / 15.80 | #fffefa | 1.00 | 15.80 / 7.48 |
| `muted` | #8a8071 | 3.85 / 3.47 / 3.21 | 3.21 | 3.87 | #5c5347 | 7.48 / 6.75 / 6.23 / 6.23 | #efe9db | 1.20 | 13.18 / 6.23 |
| `accent` | #0f6f66 | 5.97 / 5.39 / 4.98 | 4.82 | 3.74 | #0a544e | 8.70 / 7.86 / 7.26 / 7.02 | #dbe9e4 | 1.24 | 12.75 / 6.03 |
| `ok` | #4d6a2b | 6.10 / 5.51 / 5.08 | 4.94 | 3.76 | #3b5221 | 8.62 / 7.78 / 7.18 / 6.98 | #e4e8db | 1.23 | 12.81 / 6.06 |
| `warn` | #8a6a2a | 4.98 / 4.50 / 4.15 | 4.05 | 3.77 | #6b5220 | 7.29 / 6.58 / 6.08 / 5.93 | #efe6d2 | 1.23 | 12.85 / 6.08 |
| `bad` | #a8503f | 5.36 / 4.84 / 4.47 | 4.26 | 3.69 | #8f4030 | 7.07 / 6.38 / 5.89 / 5.62 | #f1e1db | 1.26 | 12.56 / 5.94 |
| `store` | #44617a | 6.43 / 5.80 / 5.36 | 5.17 | 3.73 | #33506a | 8.34 / 7.52 / 6.95 / 6.71 | #e3e6e7 | 1.24 | 12.71 / 6.01 |
| `series-1` | #0f6f66 | 5.97 / 5.39 / 4.98 | 4.82 | 3.74 | #0a544e | 8.70 / 7.86 / 7.26 / 7.02 | #dbe9e4 | 1.24 | 12.75 / 6.03 |
| `series-2` | #8a6a2a | 4.98 / 4.50 / 4.15 | 4.05 | 3.77 | #6b5220 | 7.29 / 6.58 / 6.08 / 5.93 | #efe6d2 | 1.23 | 12.85 / 6.08 |
| `series-3` | #764f6c | 6.70 / 6.05 / 5.59 | 5.39 | 3.73 | #5f3d57 | 9.08 / 8.20 / 7.57 / 7.30 | #eae4e5 | 1.24 | 12.70 / 6.01 |
| `series-4` | #44617a | 6.43 / 5.80 / 5.36 | 5.17 | 3.73 | #33506a | 8.34 / 7.52 / 6.95 / 6.71 | #e3e6e7 | 1.24 | 12.71 / 6.01 |
| `series-5` | #a8503f | 5.36 / 4.84 / 4.47 | 4.26 | 3.69 | #8f4030 | 7.07 / 6.38 / 5.89 / 5.62 | #f1e1db | 1.26 | 12.56 / 5.94 |
| `series-6` | #4d6a2b | 6.10 / 5.51 / 5.08 | 4.94 | 3.76 | #3b5221 | 8.62 / 7.78 / 7.18 / 6.98 | #e4e8db | 1.23 | 12.81 / 6.06 |

Every line on the group ground (the muted tint #efe9db): lowest 3.21 (`muted`).
The muted line on a hue's tint: lowest 3.06 (`bad`). A nested stack never draws the muted line on a hue tint (the lift rule, departure 7).

**Dark** (page `kb-surface` #232019, app ground `kb-paper` #1a1815, group ground `kb-surface-sunken` #2a261e; `kb-ink` #ece4d7, `kb-secondary` #b6ad9d)

| Tone | Line | line on page / paper / sunken | line on own tint | default line on this tint | Ink | ink on page / paper / sunken / own tint | Tint | tint vs page | kb-ink / kb-secondary on tint |
|---|---|---|---|---|---|---|---|---|---|
| `default` | #9a9081 | 5.17 / 5.64 / 4.79 | 5.17 | 5.17 | #ece4d7 | 12.88 / 14.04 / 11.94 / 12.88 | #232019 | 1.00 | 12.88 / 7.32 |
| `muted` | #7e7566 | 3.58 / 3.90 / 3.32 | 3.32 | 4.79 | #b6ad9d | 7.32 / 7.97 / 6.78 / 6.78 | #2a261e | 1.08 | 11.94 / 6.78 |
| `accent` | #62bdb2 | 7.31 / 7.96 / 6.77 | 5.20 | 3.68 | #86d4ca | 9.51 / 10.36 / 8.81 / 6.77 | #2e3c35 | 1.40 | 9.18 / 5.21 |
| `ok` | #a3bd6e | 7.79 / 8.49 / 7.22 | 5.66 | 3.76 | #bdd290 | 9.89 / 10.79 / 9.17 / 7.19 | #373927 | 1.38 | 9.37 / 5.32 |
| `warn` | #c8a15e | 6.75 / 7.35 / 6.25 | 5.03 | 3.85 | #d8b673 | 8.40 / 9.16 / 7.79 / 6.27 | #3d3524 | 1.34 | 9.60 / 5.45 |
| `bad` | #d68a76 | 6.00 / 6.54 / 5.56 | 4.60 | 3.96 | #e0a08e | 7.42 / 8.09 / 6.88 / 5.68 | #403128 | 1.31 | 9.86 / 5.60 |
| `store` | #8fb0cc | 7.16 / 7.80 / 6.63 | 5.30 | 3.83 | #aac5dc | 9.08 / 9.89 / 8.41 / 6.72 | #343736 | 1.35 | 9.53 / 5.42 |
| `series-1` | #62bdb2 | 7.31 / 7.96 / 6.77 | 5.20 | 3.68 | #86d4ca | 9.51 / 10.36 / 8.81 / 6.77 | #2e3c35 | 1.40 | 9.18 / 5.21 |
| `series-2` | #c8a15e | 6.75 / 7.35 / 6.25 | 5.03 | 3.85 | #d8b673 | 8.40 / 9.16 / 7.79 / 6.27 | #3d3524 | 1.34 | 9.60 / 5.45 |
| `series-3` | #c99bc0 | 6.91 / 7.54 / 6.41 | 5.12 | 3.83 | #d9b4d2 | 8.83 / 9.62 / 8.18 / 6.54 | #3e3434 | 1.35 | 9.54 / 5.42 |
| `series-4` | #8fb0cc | 7.16 / 7.80 / 6.63 | 5.30 | 3.83 | #aac5dc | 9.08 / 9.89 / 8.41 / 6.72 | #343736 | 1.35 | 9.53 / 5.42 |
| `series-5` | #d68a76 | 6.00 / 6.54 / 5.56 | 4.60 | 3.96 | #e0a08e | 7.42 / 8.09 / 6.88 / 5.68 | #403128 | 1.31 | 9.86 / 5.60 |
| `series-6` | #a3bd6e | 7.79 / 8.49 / 7.22 | 5.66 | 3.76 | #bdd290 | 9.89 / 10.79 / 9.17 / 7.19 | #373927 | 1.38 | 9.37 / 5.32 |

Every line on the group ground (the muted tint #2a261e): lowest 3.32 (`muted`).
The muted line on a hue's tint: lowest 2.55 (`accent`). A nested stack never draws the muted line on a hue tint (the lift rule, departure 7).

**Sepia** (page `kb-surface` #f6ecd6, app ground `kb-paper` #efe2c5, group ground `kb-surface-sunken` #ecdcba; `kb-ink` #382a1b, `kb-secondary` #5f4d37)

| Tone | Line | line on page / paper / sunken | line on own tint | default line on this tint | Ink | ink on page / paper / sunken / own tint | Tint | tint vs page | kb-ink / kb-secondary on tint |
|---|---|---|---|---|---|---|---|---|---|
| `default` | #6b5c47 | 5.51 / 5.04 / 4.78 | 5.51 | 5.51 | #382a1b | 11.81 / 10.79 / 10.24 / 11.81 | #f6ecd6 | 1.00 | 11.81 / 6.87 |
| `muted` | #8b785b | 3.62 / 3.31 / 3.14 | 3.14 | 4.78 | #5f4d37 | 6.87 / 6.28 / 5.96 / 5.96 | #ecdcba | 1.15 | 10.24 / 5.96 |
| `accent` | #0c6159 | 6.23 / 5.70 / 5.41 | 4.98 | 4.40 | #08483f | 8.90 / 8.14 / 7.72 / 7.11 | #d3d7c3 | 1.25 | 9.42 / 5.48 |
| `ok` | #475f22 | 6.11 / 5.59 / 5.30 | 4.95 | 4.46 | #374a19 | 8.30 / 7.59 / 7.20 / 6.72 | #dcd7bb | 1.24 | 9.56 / 5.56 |
| `warn` | #7d5c1d | 5.23 / 4.78 / 4.54 | 4.54 | 4.78 | #614716 | 7.39 / 6.76 / 6.41 / 6.42 | #eedcb4 | 1.15 | 10.25 / 5.97 |
| `bad` | #9a4535 | 5.46 / 4.99 / 4.73 | 4.64 | 4.68 | #833526 | 7.15 / 6.54 / 6.20 / 6.08 | #efd7c6 | 1.18 | 10.04 / 5.84 |
| `store` | #3c5870 | 6.34 / 5.80 / 5.50 | 5.11 | 4.44 | #2e4559 | 8.47 / 7.75 / 7.35 / 6.83 | #dad6c7 | 1.24 | 9.52 / 5.54 |
| `series-1` | #0c6159 | 6.23 / 5.70 / 5.41 | 4.98 | 4.40 | #08483f | 8.90 / 8.14 / 7.72 / 7.11 | #d3d7c3 | 1.25 | 9.42 / 5.48 |
| `series-2` | #7d5c1d | 5.23 / 4.78 / 4.54 | 4.54 | 4.78 | #614716 | 7.39 / 6.76 / 6.41 / 6.42 | #eedcb4 | 1.15 | 10.25 / 5.97 |
| `series-3` | #6b4461 | 6.82 / 6.23 / 5.91 | 5.45 | 4.41 | #56344d | 8.97 / 8.20 / 7.78 / 7.18 | #e1d3c4 | 1.25 | 9.45 / 5.50 |
| `series-4` | #3c5870 | 6.34 / 5.80 / 5.50 | 5.11 | 4.44 | #2e4559 | 8.47 / 7.75 / 7.35 / 6.83 | #dad6c7 | 1.24 | 9.52 / 5.54 |
| `series-5` | #9a4535 | 5.46 / 4.99 / 4.73 | 4.64 | 4.68 | #833526 | 7.15 / 6.54 / 6.20 / 6.08 | #efd7c6 | 1.18 | 10.04 / 5.84 |
| `series-6` | #475f22 | 6.11 / 5.59 / 5.30 | 4.95 | 4.46 | #374a19 | 8.30 / 7.59 / 7.20 / 6.72 | #dcd7bb | 1.24 | 9.56 / 5.56 |

Every line on the group ground (the muted tint #ecdcba): lowest 3.14 (`muted`).
The muted line on a hue's tint: lowest 2.89 (`accent`). A nested stack never draws the muted line on a hue tint (the lift rule, departure 7).

**Print** (the light values on white paper #ffffff)

| Tone | line on white | ink on white | kb-ink #26211c on tint |
|---|---|---|---|
| `default` | 4.68 | 15.95 | 15.80 |
| `muted` | 3.88 | 7.54 | 13.18 |
| `accent` | 6.02 | 8.78 | 12.75 |
| `ok` | 6.15 | 8.70 | 12.81 |
| `warn` | 5.03 | 7.36 | 12.85 |
| `bad` | 5.41 | 7.13 | 12.56 |
| `store` | 6.49 | 8.41 | 12.71 |
| `series-1` | 6.02 | 8.78 | 12.75 |
| `series-2` | 5.03 | 7.36 | 12.85 |
| `series-3` | 6.76 | 9.16 | 12.70 |
| `series-4` | 6.49 | 8.41 | 12.71 |
| `series-5` | 5.41 | 7.13 | 12.56 |
| `series-6` | 6.15 | 8.70 | 12.81 |

## Critique pass 01

Answering `critique-01.md`. C09 and C17 are held for the judge and are not answered here.

- **C01** fixed: the state bar's signature for a preset no longer includes a chapter's progress or whether the chrome
  shows, since reading writes both by itself the moment a preset lands. On Widths it also ignores "in the text or at
  the top", since its three scaled frames report that differently. Probed: all 27 diagram presets on Main read pressed
  at 1440 and at 390, and all 18 on Widths in all three frames.
- **C02** fixed: the plain stack is now the reader-to-disk stack in the Layers flow's four groups. Clients are readers
  in a browser and coding agents. Servers are the web app server (a sealed-cookie BFF) and the MCP service (a thin
  proxy). The API is one FastAPI process. Storage is the files in git, SQLite and Postgres. The caption now reads
  "Read top to bottom, from whoever asks down to the disk. The browser reaches the API only through the web app's
  server.", which is true for both drawings.
- **C03** fixed: the card status gains "the reader unsuspends it" (Suspended → Active), after `PATCH
  /app/reader/review/cards/{id} {status: active|suspended}`. A pair each way between two states is drawn side by
  side, each label wrapped at 96 px beside its own line on the pair's outer side (build prompt, *A pair each way*).
- **C04** fixed: a label now sits on one ground. If its box would cross a group border, come within 2 px of a node or
  meet an earlier label, it slides along its own segment to the nearest clear place. Where there is none, the gap
  grows until the label fits in the corridor between groups. The hero, the layers and the 60-node map are a little
  wider for it (build prompt, *One ground per label*). The node and browser probes find no straddle.
- **C05** fixed: every item carries its dot in its own left padding, and the list is pulled one dot to the left and
  clipped there. A line never opens or ends with a dot, and a wrapped item keeps every letter (the follow-up after
  pass 3).
- **C06** fixed: in the twelve-lane generator the tone now follows the label: every "re-fit" is `series-2` and every
  "check" `series-3`.
- **C07** fixed: in the bridge, `scroll {fraction, anchor}` and `navigate {href}` are solid, because no message there
  answers another. The dashed reply now lives only in the six-actor sequence (the `201`, and *saved*). The section
  text, the chapter summary, the board's row titles and the two presets ("Sequence · notes, to itself" and "Sequence
  · six actors, replies") say so.
- **C08** fixed: a bar's label has a `kb-surface` ground 3 px wider on each side. A mark's label has the ground behind
  its text only, so it does not cover its own line. The bars paint above the labels, so a ground never cuts its own
  bar.
- **C09** held for the judge.
- **C10** fixed: the Tones lead now names four hues as the system's own (teal, bronze, brick, plum) and two as new and
  proposed (olive for ok, slate for store). It also says every tint is new, as are the light muted line and each dark
  and sepia value the system lacks. The role labels read "olive, new" and "slate, new · stores", and the build prompt
  marks both hues "(new)".
- **C11** advisory, left for the operator: this is Q1's rule working as drawn, and its trade-off is in Q1.
- **C12** advisory, left for the operator: both Pages open on the hero figure with the bar scrolled away (bar rule 1).
  Each board's lead says where the bar is. Whether a Page should open at its top instead is the operator's call.
- **C13** advisory, left for the operator: `series-5` and `series-6` share `bad`'s and `ok`'s hues, and the Tones
  rows say so. The choice is six distinguishable hues against one meaning per hue.
- **C14** gap, logged: no component bundle and no diagram component (*Component and token gaps*).
- **C15** gap, logged: no diagram tone tokens (*Component and token gaps*, departure 4).
- **C16** gap, logged: no Hangul face in the cache (*Component and token gaps*).
- **C17** held for the judge.

The palette file for `02-figures` has not moved (*Where the palette lives*). Only the Tones lead and its role labels
changed.

