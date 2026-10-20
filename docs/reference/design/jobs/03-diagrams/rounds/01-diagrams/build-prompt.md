# Build prompt — the `diagram` block (job `03-diagrams`, round `01-diagrams`)

The implementation contract for P30's diagram renderer. It covers the block's frame inside the signed reader's slot
(the reader's build prompt §8a), the six kinds, the thirteen tones in light, dark, sepia and print, the `svg` block's
tone classes, the text alternative, and every string this round wrote. The signed reader (`01-reader/02-revise`) is
built as signed; nothing here changes it.

**Nothing here is decided until the operator signs the round.** Six calls are flagged for the operator (*Open calls*,
at the end); the rules below draw the drafter's answer to each.

**Where the values live on the canvas.** `canvas/project/diagram.css` holds every value named here (the tones, the
frame, the row kinds). `dg.js`, `dggraph.js` and `dgrows.js` are a plain-JS reference implementation of the layout
rules below: canvas-only, never shipped as client code, but P30 may port them to the server rather than re-derive
them. Where this prompt and those files disagree, this prompt wins.

## Canvas-only (never build)

- **The state bar** (`data-proto="state-bar"`) on Main and Widths, and the **foot strip** (`data-proto="screens"`).
- **The stand-ins** for other jobs' screens (board 04, `Elsewhere.dc.html`), copied unchanged from the signed reader.
- **The specimen book** *Diagrams, kind by kind* (`specimens/…` in `dgdata.js`): a book written for this canvas so the
  prototype can show every kind inside a chapter. Its chapters, prose and samples are canvas data.
- **`dg.js`, `dggraph.js`, `dgrows.js`, `dgdata.js`**: the canvas computes layout in the browser so it can redraw at
  every size and theme; the product renders on the server (S2 *Render model*), with no client script.
- **`Diagram.dc.html`'s canvas props:** `sample`, `theme`, `size`, `width`, `scroll` (opens a wide drawing scrolled to
  its middle or end), `pad`, `paper` (a white print ground), `anchor`, `bare`. A Components cell's padding
  (`.dg-cell`) is canvas chrome.
- **The Tones board's table chrome** (`.dg-tones*`): a grey specimen table, never a product surface.
- **The canvas measures text** with `canvas.measureText` and re-lays out once the faces load. The server measures
  with the font files' advance widths (below) and never needs this.

## What it is

A ```` ```diagram #id ```` fence in a native chapter (S2): YAML with `kind`, `title` (required), `caption?` (inline
Markdown), and the kind's own fields. The server renders it, from its data alone, to SVG (flow, state, sequence) or
to HTML and CSS (stack, timeline, chart), inside the reader's `<figure>` slot. Diagrams are static: no hover, no
script, no link on a node or an edge. Annotation controls on a diagram are `05-annotations`' job, and none is drawn
here.

## The frame in the slot

```html
<figure class="dg dg--{kind}" id="{block id}" aria-labelledby="dg-title-{n}">
  <p class="dg__title" id="dg-title-{n}">{title, Hangul runs wrapped in <span lang="ko">}</p>
  <div class="dg__box">
    <div class="dg__scroll" [tabindex="0" role="region" aria-label="Drawing, scrolls sideways" — only while it overflows]>
      {the drawing: <svg aria-hidden="true" focusable="false"> or the row kind's HTML}
    </div>
    <span class="dg__fade dg__fade--l" aria-hidden="true"></span><span class="dg__fade dg__fade--r" aria-hidden="true"></span>
  </div>
  <p class="dg__hint">Scroll sideways to see the whole drawing →</p>   <!-- shown only while it overflows -->
  {the text alternative, visually hidden (below)}
  <figcaption class="dg__cap">{caption, inline Markdown, reader link rules, Hangul runs wrapped}</figcaption>  <!-- only with a caption -->
</figure>
```

- **No plate, no frame.** The drawing sits on the page itself (`kb-surface`): no card, no border, no background.
  Hairlines and tints inside the drawing do the work, as the system's "hairlines instead of boxes" asks.
- **Space:** `lg × k` (1.5rem × `--rd-k`) above the figure, as the slot specifies; `sm × k` (0.6rem × `--rd-k`) between
  the title and the drawing and between the drawing (or its hint) and the caption. The figure ends at its last
  element: with no caption it ends at the drawing, with no gap left.
- **The figure's font size** is `max(11px, var(--rd-fs-s))`: 12.5, 13.75, 15, 16.67 and 18.33 px at text sizes 1 to 5.
  Every row kind sizes in `em` of it; the drawn kinds scale their SVG by it (below).
- **The title:** `--font-body`, `--rd-fs-s`, weight 600, line height 1.35, `kb-ink`, `text-wrap: balance`. It is the
  figure's accessible name (`aria-labelledby`).
- **The caption:** `--font-reading` (Literata), `--rd-fs-s`, line height 1.55, `kb-secondary`, `text-wrap: pretty`. It
  is inline Markdown: code (`rd-ic`), emphasis, strong, links by the reader's link rules (`#id`, `chapter:`, `doc:`,
  an unresolvable target in the "missing link" style). Korean emphasis is upright and semibold (Hangul has no
  italic), as the reader's 6a.
- **Wider than the column** (overflowing, `scrollWidth > clientWidth + 1`): the box scrolls sideways
  (`overflow-x: auto`, `overscroll-behavior-inline: contain`, thin scrollbar), takes `tabindex="0"`,
  `role="region"` and `aria-label="Drawing, scrolls sideways"`, and shows the hint under it (`--font-body`,
  0.8125rem, `kb-secondary`, `xs` above). The page never scrolls sideways.
- **The fades** follow the reader's §9a exactly (2rem, a side shows only while more remains on it, re-read on scroll,
  resize, text size and font load, `opacity` over `--rd-ease`, none under reduced motion), with one ground:
  `kb-surface`, because the drawing has no plate.
- **Focus:** the scrolling box shows `--kb-focus-w` in `kb-accent`, offset `--kb-focus-offset`, radius `kb-radius-sm`,
  on `:focus-visible`. Arrow keys scroll it (the browser's own behaviour).
- **Print:** `break-inside: avoid`; `print-color-adjust: exact`; no fades, no hint, no scroll (`overflow: visible`); the
  SVG prints at 100% of the column. The tones switch to their print values (below). Wave 3 draws the print sheet.

## Size: the drawing and the text sizes (open calls 1, 2 and 5)

**The drawn kinds (flow, state, sequence)** are laid out in px at the default text size, where a node label is 15 px
and small text 13 px, giving a natural width `W` and height `H`. The SVG carries `viewBox="0 0 W H"` and:

```css
width: clamp(ceil(W × 11 / 13)px, 100%, W / 15 em);   /* em = the figure's font size */
height: auto;
```

- **It grows with the text size** (`W / 15 em`): at size 5 a drawing is 1.22 × its default size, at size 1 0.83 ×.
- **It never grows past the column** (`100%`): a wide drawing at size 5 stays at the column's width.
- **It shrinks with the column, down to a floor** where its 13 px small text has become 11 px (`W × 11 / 13`). Below
  that it keeps the floor and scrolls in its box, with the fades and the hint. At size 1 the floor wins over the
  natural size, so small text never goes under 11 px.
- **What fits where**, at the default size: the column is 576 px from 40rem up (iPad portrait and landscape, desktop),
  so a drawing up to 576 px wide shows at its natural size, up to 680 px shrinks to fit, and wider scrolls. On a
  390 px phone the column is about 356 px: up to 356 shows whole, up to 421 shrinks, wider scrolls. iPad landscape
  (1024) draws exactly as iPad portrait, because the column is fixed.

**The row kinds (stack, timeline, chart)** are HTML in `em`, so they grow with the text size and re-flow with the
column. Each has a minimum width; below it the box scrolls exactly as a drawn kind does.

| Kind | Minimum width | What re-flows |
|---|---|---|
| stack | none | items wrap inside their layer; a nested stack's indents stay 0.75em |
| timeline | 18.7em | from 30em the lane names sit in a column beside the lanes (5–9em, as wide as the longest name); narrower, each name sits above its lane and every other tick label hides when there are more than six |
| chart, vertical bars | `max(18, categories × series × 1.5 + 3)`em, plus the widest rule label + 0.9em | the plot fills the width |
| chart, line | 18em plus the widest end label | the plot fills the width; every other x tick hides under 26em when there are more than six |
| chart, horizontal bars and interval | `max(12, label column + 6)`em | from 30em the category names sit in a column beside the bars (5–11em, as wide as the longest name); narrower, each name sits above its bar |

**A figure-row item** (`02-figures`' row, a third of the column, about 180 px; or a half, about 280 px) is the same
block at a narrower width, with the same rule: a drawn kind shows whole if it fits, shrinks to its floor, then
scrolls in its own box; a row kind re-flows down to its minimum, then scrolls. Nothing is simplified or dropped at
that width. At 180 px and the default size a small flow fits, a bar chart in rows and a stack re-flow and fit, and
the timeline (18.7em = 281 px) and wide flows scroll.

## Faces and sizes inside a drawing

| Role | Face | Size at the default text size | Weight | Line height | Colour |
|---|---|---|---|---|---|
| Node and actor label, entity name | `--font-body` (Source Sans 3; Pretendard for Hangul) | 15 px | 600 | 19 px | `kb-ink` |
| Sub line, edge label, step label, note, axis tick, item | `--font-body` | 13 px | 400 | 17 px | `kb-secondary` (an edge label in a tone: the tone's ink; a note: `kb-ink`) |
| Group, lane and layer name; step number | `--font-body` | 13 px | 600 | 17 px | `kb-secondary` (step number `kb-ink`, tabular) |
| Entity field | `--font-mono` (JetBrains Mono, ligatures off; Pretendard for Hangul) | 13 px | 400 | 18 px | `kb-ink` |

- Drawn kinds: these sizes are inside the SVG and scale with it. Row kinds: names and labels are `1em` (the figure's
  font size, 15 px at the default) and small text is `max(11px, 0.8667em)` (13 px at the default).
- Numbers (ticks, values, step numbers) are `font-variant-numeric: tabular-nums`; a minus sign is `−` (U+2212);
  thousands take a comma (`1,250`); other values keep one decimal at most.
- **Measuring on the server:** use the faces' advance widths from the font files (Source Sans 3 at 600 and 400,
  JetBrains Mono 400, and Pretendard for any Hangul), at the sizes above.

## The tones

Thirteen names, from six hues and two neutrals. Four hues are the system's own (teal, bronze, brick, plum); two are
new, proposed here (olive for `ok`, slate for `store`), because the system has neither. A tone gives a shape three values: a **line** (strokes, edges,
arrowheads, bar outlines, lines), an **ink** (text set in the tone: a toned edge's label, a line's end name) and a
**tint** (fills). Text inside a filled shape stays in `kb-ink` and `kb-secondary`, never the tone's ink.

| Tone | Hue | Role |
|---|---|---|
| `default` | neutral | lines, edges, axes; plain nodes (tint = the page) |
| `muted` | neutral | secondary nodes, every group region, lifelines (tint = `kb-surface-sunken`) |
| `accent` = `series-1` | teal, the system accent | the one node or path an author marks |
| `warn` = `series-2` | bronze, the system's idle status | notes, cautions |
| `series-3` | plum, the system's plum ink | a third series |
| `store` = `series-4` | slate (new) | stores |
| `bad` = `series-5` | brick, the system's revoked status | failures |
| `ok` = `series-6` | olive (new) | success |

An alias is the same three values under two names. An unknown tone name renders as `default` (a series falls back to
`series-<n>` by its position, below). Nothing is told by tone alone: every toned node, edge, bar and line also
carries a label, a pattern or a dash.

### Values

`--dg-<tone>` (line), `--dg-<tone>-ink`, `--dg-<tone>-tint`, on the reader root by theme:

| Tone | Light line / ink / tint | Dark line / ink / tint | Sepia line / ink / tint |
|---|---|---|---|
| `default` | `#7c7362` / `#26211c` / `#fffefa` | `#9a9081` / `#ece4d7` / `#232019` | `#6b5c47` / `#382a1b` / `#f6ecd6` |
| `muted` | `#8a8071` / `#5c5347` / `#efe9db` | `#7e7566` / `#b6ad9d` / `#2a261e` | `#8b785b` / `#5f4d37` / `#ecdcba` |
| `accent`, `series-1` | `#0f6f66` / `#0a544e` / `#dbe9e4` | `#62bdb2` / `#86d4ca` / `#2e3c35` | `#0c6159` / `#08483f` / `#d3d7c3` |
| `ok`, `series-6` | `#4d6a2b` / `#3b5221` / `#e4e8db` | `#a3bd6e` / `#bdd290` / `#373927` | `#475f22` / `#374a19` / `#dcd7bb` |
| `warn`, `series-2` | `#8a6a2a` / `#6b5220` / `#efe6d2` | `#c8a15e` / `#d8b673` / `#3d3524` | `#7d5c1d` / `#614716` / `#eedcb4` |
| `bad`, `series-5` | `#a8503f` / `#8f4030` / `#f1e1db` | `#d68a76` / `#e0a08e` / `#403128` | `#9a4535` / `#833526` / `#efd7c6` |
| `store`, `series-4` | `#44617a` / `#33506a` / `#e3e6e7` | `#8fb0cc` / `#aac5dc` / `#343736` | `#3c5870` / `#2e4559` / `#dad6c7` |
| `series-3` | `#764f6c` / `#5f3d57` / `#eae4e5` | `#c99bc0` / `#d9b4d2` / `#3e3434` | `#6b4461` / `#56344d` / `#e1d3c4` |

- Where a value is the system's, it is the system's: the light and dark `default` ink is `kb-ink`, `muted` ink is
  `kb-secondary`, the tints of `default` and `muted` are `kb-surface` and `kb-surface-sunken`; teal is `kb-accent` /
  `kb-accent-strong` (light) with a 15% tint; bronze and brick are the status-idle and status-revoked families; plum is
  `kb-ink-plum` / `kb-ink-plum-dark`; the dark `muted` line is the dark `kb-hint`, the sepia `muted` line the sepia
  `kb-hint`. Every other value is new (*Values P30 adds*, below).
- **Print** uses the light values, on white: `@media print { :root, [data-theme] { …the light values… } }`.
- **System** theme follows `prefers-color-scheme` to light or dark, as the reader does.
- Measured contrast for every value, on every ground, is in `result.md` (*The tones, measured*): every line is at least
  3:1 on the page, the app ground and the group ground in all three themes; every ink and `kb-ink` / `kb-secondary` on
  every tint at least 4.5:1.

### Where each value is used

- A node: fill = its tone's tint, border = its tone's line (1.25 px). An entity's body is `kb-surface`, its head band
  the tint (for `default`, `kb-surface-sunken`).
- An edge and its arrowhead: the `default` line, or the edge's tone's line. Its label: `kb-secondary`, or the tone's ink.
- A group: always `muted` (tint `kb-surface-sunken`, line 1 px). The contract gives a group no tone.
- A nested stack layer: its tone, except a `muted` layer inside a layer of a hue tone draws its border in the
  `default` line, because the muted line measures under 3:1 on a hue's tint in dark and sepia.
- A bar, an interval and a legend swatch: tint fill, line border, plus the series pattern. A line: the tone's line, 2 px.
- Gridlines, the timeline's lane rules and an entity's field rules: `kb-border`. They are reading aids under labelled
  axes and value labels, never the only carrier of a value.
- An axis and its ticks: the `default` line (1.25 px). The zero line below zero: the `default` ink (1.5 px).
- A rule (threshold or mean) and a timeline mark: `kb-ink`, dashed, 1.5 px.

### The `svg` block's classes (`02-figures` draws with these)

```css
.kb-fill-<tone>                 { fill: var(--dg-<tone>-tint); }
:is(text, tspan).kb-fill-<tone> { fill: var(--dg-<tone>-ink); }
.kb-stroke-<tone>               { stroke: var(--dg-<tone>); color: var(--dg-<tone>); }
```

for all thirteen names. A shape's fill is the tint, a text's fill the ink, a stroke the line; `fill="currentColor"`
under a `kb-stroke-` class paints the line value (a solid dot). A figure-row card's `tone` takes the same three
values (its ground the tint, its border or rule the line, any text in the tone the ink).

## Flow and state

### Placement

- A node with `at: [row, col]` sits in that cell. A node with no `at` takes the next free cell after the previous
  node in the block's `direction` (`right`: the next column in its row; `down`, the next row in its column),
  skipping cells already taken. With no `at` anywhere, the nodes run in one line in their order.
- Every column is as wide as its widest node; every row as tall as its tallest non-entity node. A box, pill, store or
  state stretches to its column's width and its row's height, so a column reads as one width; an entity keeps its own
  height and is centred in its cell.

### Node sizing

| Part | Rule |
|---|---|
| Label | balanced wrap at 132 px (label text), the narrowest width that keeps the greedy line count |
| Sub line | balanced wrap at 140 px (small text), 2 px under the label |
| Padding | 12 px each side (a pill: `max(12, round(height × 0.4))`; a state: 16), 9 px top and bottom (a store: 17 top, 11 bottom) |
| Minimum | 72 × 40 px |
| Entity | its name balanced at 200 px on a head band 8 px above and below; one row per field, wrapped at 204 px in mono, 3 px above and below; width = the widest line + 24; 6 px under the last field |

**Wrapping.** Lines break at spaces. A word wider than the line breaks after `/`, `-`, `_`, `.`, `·` or `(`, or between
letters when it has none of them. A Hangul word never breaks inside itself (keep-all): it moves whole to the next
line, and its node grows to hold it. A lone `·` stays with the word before it, so no line starts with one. Nothing is
ever cut or ellipsised: the node grows.

### Shapes

| Shape | Drawn as |
|---|---|
| `box` | rectangle, radius 4 |
| `pill` | rectangle, radius = half its height (someone acting, a start or an end) |
| `store` | cylinder: straight sides, elliptical top and bottom (radius 6 vertically), the top's front arc drawn as its own line |
| `entity` | rectangle, radius 4, `kb-surface` body; a head band in the tone's tint with a rule in the tone's line under it; a `kb-border` hairline between fields, inset 8 px |
| state (every node of `kind: state`) | rectangle, radius 12 |
| `final` state | a second border inside the first, inset 3.5 px, radius 9, in `kb-ink` (or the node's tone's line) |
| `initial` | a filled `kb-ink` dot (radius 5.5) and a 30 px arrow from it into the initial state, in the flow's direction |

Each shape differs in form (corners, ends, the cylinder's arcs, the head band, the double border), never by colour.

### Gaps

- 40 px between columns, 36 px between rows, 4 px outside the drawing.
- A group adds 12 px of padding on each side, plus a 24 px band above its first row for its name.
- A transition to itself adds the loop's height (22 px), its label's height and 6 px above the node's row.
- `initial` adds 30 + 11 px before the initial state's column (`right`) or row (`down`).
- A gap then grows (up to four passes) until every edge track, every label and every loop label has room: tracks need
  `(n − 1) × 10 + 20` px; a label needs its length plus 8 px of clear line on both sides (plus 7 px for the
  arrowhead on the last segment); a label beside a vertical run needs the gap's breadth for its width + 12; under a
  horizontal run, its height + 10. A label that crosses from one ground to another (below) needs the gap's free
  corridor, outside every group's padding and name band, to be its length + 16 px (+ 7 px on the last segment).

### Edges

- **Orthogonal, from a fixed list of route shapes,** tried in order, the first that crosses no node winning:
  - forward, `direction: right`: straight across → straight down → Z across (a vertical run in a column gap) → L (across, then down) → L (down, then across) → Z down (a horizontal run in a row gap);
  - forward, `direction: down`: straight down → straight across → Z down → L (down, then across) → L (across, then down) → Z across;
  - **the way back** (a target before its source in the flow's direction): between neighbours, straight, unless an edge
    also runs the other way between them; otherwise round the outside: Z down then Z across (`right`), or Z across
    then Z down (`down`), then the two Ls;
  - **U**, always valid: down out of the source into the row gap under it, along to a column gap beside the target, then
    into the target's side.
- **To itself:** a loop over the node's top edge, 22 px tall, its two ends on the top side, its label above it.
- **Ports.** The ends on one side of a node share it evenly, ordered by where their other end lies, inset
  `min(18, length / 4)` from the corners on top and bottom and `min(10, length / 4)` on left and right; a pill's
  left and right ends sit at its middle. A straight edge whose one end is alone on its side moves that end level
  with the other, so it runs straight.
- **Tracks.** Runs that share a gap sit side by side, 10 px apart, centred in the gap's free corridor (outside any
  group's padding and name band). Two edges never share a run: where an end's stub lies on another edge's stub, that
  end's port moves one track along its side, so two edges that must cross cross once, at a point.
- **Line:** 1.5 px, round joins, corners rounded at radius 6; `style: dashed` is `6 4`. The line stops 5.5 px short of
  the tip.
- **Arrowhead:** a filled triangle, 7 px long and 7.2 px wide, in the edge's line, at the target end only.
- **Labels:** small text, balanced at 124 px, on the edge's longest segment, centred on it (on the last segment, moved
  back by half an arrowhead), knocked out of the line by a box 5 px wider and 2 px taller on each side, radius 2, in
  the ground under it (`kb-surface`, or the group's tint). A loop's label sits 4 px above the loop's top.
  - **One ground per label.** A label's box never crosses a group's border: where the centred box would come within
    3 px of a border it slides along its segment, keeping its 8 px of clear line and the arrowhead, to the nearest
    place that lies wholly inside one group or wholly outside every group, and is 2 px clear of every node and every
    label placed before it (labels are placed in the order the edges are written). Where the segment has no such
    place, the gap it crosses grows (above) until it has one. So a label between two groups sits in the corridor
    between them, on the page's ground, and the groups' borders stay whole.
  - **A pair each way.** Two straight edges between the same two neighbours, one each way, run as two parallel lines
    (their ports share each side, ordered as written). Each label then sits beside its own line instead of on it, on
    the pair's outer side, and beside a vertical line it wraps at 96 px rather than 124: for two vertical lines, the left line's label ends 6 px left of it (right-aligned) and the
    right line's label starts 6 px right of it (left-aligned), centred on the run's height; for two horizontal lines,
    the upper label sits 4 px above the upper line and the lower 4 px under the lower line. Neither label covers the
    other line.

### Groups: lanes and layers

- A group is the padded box of its nodes' cells, radius 8. A group whose nodes own whole rows spans every column
  (a **lane**, with `direction: right`, or any direction); one whose nodes own whole columns with `direction: down`
  spans every row (a **layer** across the drawing).
- Its name: 600 small text in `kb-secondary`, balanced at 420 px, at its top left (10 px in, 6 px down), moved right
  past any edge that crosses its name band; where the band has no free room, the name is knocked out of the edge as
  an edge label is.
- A node's group is read from its place inside the region and the region's name, never from colour.

## Sequence

- **Actors:** one column each, in the block's order, a `default` box (radius 4) on top: the label balanced at 128 px,
  12 × 9 px padding, at least 84 px wide. The head row is as tall as the tallest actor (at least 40 px).
- **Spacing:** between neighbouring actors' centres, `max(110, (width A + width B) / 2 + 24)`, widened so each step's
  number and label fit over the columns it spans (label + 18 + 28 px), and, for a step to itself, the loop and its
  label to the right of the lifeline (32 + 8 + 18 + label + 10, + 16).
- **Lifelines:** the `muted` line, 1.25 px, from under each actor to the bottom, drawn under everything else.
- **Steps,** one row each, top to bottom from 22 px under the head row:
  - the number (600, `kb-ink`, tabular) then the label (balanced at 210 px), 18 px apart, centred over the arrow,
    knocked out (a `kb-surface` rect 3 px wider each side, radius 2) of any lifeline it crosses;
  - the arrow 4 px under the label, from lifeline to lifeline, with the arrowhead at the target; `style: dashed` for a
    reply; 14 px to the next step;
  - a step to itself: a loop 32 px wide and 22 px tall on the right of the lifeline, back into it with an arrowhead,
    its number and label (balanced at 150 px) to the loop's right, knocked out the same way.
- **A note** sits under its step, centred between the step's two lifelines (beside the lifeline for a step to
  itself): a card with a folded top-right corner (8 px), filled with the `warn` tint, bordered with the `warn` line,
  its text small, in `kb-ink`, 12 px in and 7 px down, balanced at 220 px. It has no arrow and no number, so it never
  reads as a step; it covers the lifelines under it.

## Stack

- **Plain:** an ordered list of layers, top to bottom, 0.4em apart. Each layer is a row: its tone's tint, a 1.25 px
  border in its tone's line, radius 4, padding 0.55em × 0.8em. In it, the name (1em, 600, `kb-ink`), then the
  items (small text, `kb-secondary`) separated by middle dots (`·`), wrapping inside the layer.
- **The separators never open or close a line.** Every item carries its dot in its own 1.25em left padding, centred
  (`li { position: relative; padding-left: 1.25em }`, `li::before { content: "·" / ""; position: absolute; left: 0;
  width: 1.25em; text-align: center }`, the `/ ""` keeping it out of the accessible text); the item list is a wrapping
  flex row with no gap, pulled 1.25em to the left and clipped there (`margin-left: -1.25em; clip-path: inset(0 0 0
  1.25em)`). Whichever item opens a line has its dot in the clipped strip, so a line never starts with a dot, and no
  line ends with one. An item too long for one line wraps inside its padding, so its later lines start clear of the
  clipped strip (a third-column figure wraps "a sealed-cookie BFF" and keeps every letter).
- **Nested** (`nested: true`): each layer holds the next. Layer *k*'s border encloses every layer after it, inset
  0.75em on the left, right and bottom; its name and items sit in a band at its top, inside its border. Each inner
  layer's fill sits on its parent's.
- Stack text is real text: it re-flows with the column at every width, and never scrolls.

## Timeline

- **Lanes** share one axis. Each lane: a 1 px `kb-border` rule above it (not above the first), 0.5em × 0.55em
  padding, its name (small text, 600, `kb-ink`) in the name column (from 30em) or above the lane (narrower).
- **The axis** runs from `axis.from` to `axis.to`: a 1.25 px `default` line under the lanes, its ticks (`axis.ticks`,
  or about six round values) as 0.3em marks with their labels under them in small `kb-secondary` text; the first and
  last tick labels align to the axis ends. `axis.unit` sits under the axis, right-aligned, in small `kb-secondary`
  text. Each tick also draws a `kb-border` gridline down through the lanes.
- **A bar** runs from its `from` to its `to`: 0.85em tall, tint fill, 1.25 px line border, radius 3, at least 3 px wide.
  A bar with no tone is `accent`. Its label sits under it (small text, `kb-ink`), starting at the bar's start; a
  label that would run past the axis end ends at the bar's end instead. The label belongs to the bar's row, so it
  stays attached however short the bar is.
- **Overlapping bars** (and bars whose labels would collide, measured at the timeline's narrowest track, 280 px at the
  default size) take a second row in the lane, then a third.
- **A mark** is a moment: a filled `kb-ink` diamond (0.7em) on a dashed `kb-ink` line down through its lane, its label
  (small, 600, `kb-ink`) beside it, on the left of the line when it would run past the axis end. Marks that would
  collide take a second row.
- **Labels are knocked out of the lines they cross.** A bar's label has a `kb-surface` ground (the diagram's ground),
  3 px wider on each side, and a mark's label a `kb-surface` ground behind its text only (not its 0.65em gap from the
  mark's own line), so no gridline or mark line runs through a word. Gridlines are drawn first, then marks and
  labels, then the bars above all of them (`z-index: 1`), so a label's ground never cuts its own bar's bottom border.

## Chart

- **Type and layout.** `bar` draws vertical bars unless it has more than seven categories or any category name wider
  than 64 px at small text; then it draws horizontal rows, one per category. `interval` always draws rows. `line`
  draws lines over `x`.
- **The y range:** `y.min` and `y.max` where given; otherwise bars start at 0 (or the lowest negative value), lines
  and intervals at their lowest value, and both ends round out to about five round ticks.
- **Series:** each series takes its `tone`, or `series-1` … `series-6` by its position. Each also has a **pattern**
  (bars, swatches: none, diagonal hatch, horizontal lines, dots, crosshatch, vertical lines) and a **dash** (lines:
  solid, `6 3`, `1.5 3`, `8 3 1.5 3`, `12 4`, `4 2 1.5 2 1.5 2`), by position, so no series is told by colour alone.
- **The key** (more than one series, or any line chart): above the chart, one entry per series, a swatch (a 1.1em ×
  0.8em patterned box, or a 1.8em line in its dash) then the name, in small `kb-ink` text, wrapping.
- **Axis names:** `y.label` above the plot (vertical bars and lines) or under the axis (rows); `x.label` under the plot,
  or as the head of the label column (rows); small, 600, `kb-secondary`.
- **Vertical bars:** a 13em plot, its y tick labels to its left (right-aligned, tabular), `kb-border` gridlines at each
  tick, the axis a 1.25 px `default` line at its foot. Categories share the width; a group of bars takes 6 / series %
  of padding each side. With one series each bar carries its value above it. Category names sit under the plot,
  centred, wrapping.
- **Rows** (horizontal bars and intervals): each category a row with its name beside (from 30em) or above its bar; the
  bar 0.95em tall from the zero line, its value just past its end; gridlines down through every row; the axis with
  its ticks under the last row.
- **Below zero:** bars hang from the zero line, which is drawn in the `default` ink, 1.5 px, darker than the grid, and
  the plot's own foot becomes a gridline; in rows, 3.2em is kept on the left for negative values' labels.
- **Line:** each series a 2 px polyline in its tone's line and dash, round joins, its name (small, 600, the tone's ink)
  past the plot's right end, level with its last value. End names and rule labels are pushed apart top-down so none
  overlaps, then pulled back inside the plot. A numeric `x` takes about five round ticks, plus its first value
  (`from`) when the round ticks start more than 8% of the span in, so the axis always names where it starts; the
  points sit evenly from `from` to `to`. Categories label every point. 200 points draw as one polyline; nothing is sampled away.
- **Interval** (a contract detail proposed below): a 0.7em band from low to high in the series' tint, line border and
  pattern, a 2 px end cap at each end, a 2.5 px mark in the tone's ink at the median when given; under it, the values
  as text, "4–21 · median 9".
- **Rules:** a 1.5 px dashed `kb-ink` line across the plot (or down through every row) at `at`. Its label (small, 600,
  `kb-ink`) sits past the plot's right end, level with the line, for vertical bars and lines; above the first row,
  over the line, for rows (right-aligned to the line past 70% of the axis).

## Labels that do not fit

| Where | What happens |
|---|---|
| A node's label or sub line | wraps (rules above); the node, its column and its row grow; nothing is cut |
| An edge label | wraps at 124 px; the gap it crosses grows until the label has 8 px of clear line on each side and sits on one ground (never across a group's border) |
| A group name | wraps at 420 px; moves right past crossing edges, else is knocked out of them |
| A sequence step label | wraps at 210 px (150 for a step to itself); the actors spread to hold it |
| A note | wraps at 220 px; the drawing widens on the right to hold it |
| A stack item | wraps inside its layer; a single long word breaks anywhere |
| A timeline bar's label | stays on one line under its bar, aligned to its end when it would pass the axis end; a collision takes a new row |
| A lane or category name | wraps in its column, or sits above its lane or bar when narrow |
| A line's end name, a rule's label | one line; the chart's minimum width grows to hold the widest |
| The whole drawing | shrinks to its floor, then scrolls in its box (above); the page never scrolls sideways |

## Korean

- Every label may be Korean. In SVG, Hangul text sets in Pretendard through `--font-body`'s stack (and in the mono
  stack for fields); in HTML, each Hangul text carries `lang="ko"`.
- Under `:lang(ko)`: `word-break: keep-all; overflow-wrap: anywhere; line-break: strict`. The SVG wrap keeps a Hangul
  word whole, as keep-all does.
- In a Korean chapter the figure's `lang` is `ko`; in an English chapter each Hangul run in the title and caption is a
  `<span lang="ko">` (the reader's 6a). The caption's Hangul sets in Noto Serif KR (the reading face); the title and
  the drawing's Hangul in Pretendard (the interface face).

## The text alternative (open call 4)

- The **title** is the figure's accessible name; the **caption** is its `<figcaption>`.
- **Flow, state, sequence and timeline:** the drawing is `aria-hidden`, and a visually hidden block follows it:
  "The drawing, as text." then a list.
  - Flow and state, a `<ul>`, one item per node in reading order (row by row, left to right): "Starts at {initial}."
    first for a state diagram, then "{label} ({sub})", ", in {group}", ", an end state", ". Fields: {f1}, {f2}…" and
    ". Goes to {target}, {edge label}; back to itself, {label}." as they apply.
  - Sequence, an `<ol>`: "{actor} to {actor}: {label}" or "{actor}, to itself: {label}", then ". Note: {note}".
  - Timeline, a `<ul>`, one item per lane: "{lane}: {bar label}, {from}–{to} {unit}; …. Marks: {label} at {at}
    {unit}." ("no bars" for a lane with none).
- **Chart:** the drawing is `aria-hidden`; a visually hidden `<table>` follows, its caption "{y label}, by {x label}"
  ("Values" with no y label), a column per series, a row per category (or per point, labelled by `x.label` or
  "Point"; a numeric `x` names each point's own value, evenly spaced from `from` to `to`), the values formatted as
  drawn; an interval's cell reads "{low}–{high}" or "{low}–{high}, median {median}".
- **Stack:** real lists, not hidden: an `<ol>` of layers, each with its name and a `<ul>` of its items. In a nested
  stack each inner layer's name is preceded by a visually hidden "Inside {outer layer}: ".
- The hidden block uses the standard visually-hidden pattern (`clip-path: inset(50%)`, 1 px), with block children.

## Every state, and the board that shows it

| State | Board, and how to reach it |
|---|---|
| The sample "One FastAPI process, two planes", EN v2, EN v1, KO v1 | 01 Main (state bar: Sample presets), 02, 03, 06, 14 |
| A diagram with no caption | 01 (No caption), 03, 06 |
| Text sizes 1, 3 and 5 | 01 and 03 (state bar: Size 1, 3, 5), 06, 08, 10 |
| Light, dark, sepia (and System) | 01 and 03 (state bar), 05, 06, every kind board |
| Wider than the column: start, middle, end | 01 (scroll it), 06, 09, 13 |
| Caption with a link to a chapter, and a missing link | 01 (click it), 06 |
| Flow: pipeline in lanes; loop; layers and every shape; tables; no node placed; long labels | 01 (Flow presets), 07 |
| Dashed and toned edges | 07 (pipeline, loop, layers), 05 |
| Korean node and edge labels; long Korean labels; the KO chapter | 01 (한국어 labels), 07 |
| State: initial, final, a way back, a transition to itself, a pair each way | 01 (State preset), 08 |
| Sequence: notes and steps to itself (the bridge, no reply); dashed replies and a note with six actors | 01 (Sequence presets), 09 |
| Stack, plain and nested | 01 (Stack presets), 10 |
| Timeline: lanes, bars, marks, a short bar, overlapping bars; twelve lanes | 01 (Timeline, 12 lanes), 11 |
| Chart: bar (13 categories in rows, mean rule), grouped bars (goal rule), lines (mean rule), interval, below zero, long names, 200 points | 01 (Chart presets), 12 |
| Near the limits: 60 nodes and 85 edges; 12 lanes; 200 points | 01, 07, 11, 12, 13 |
| Every tone as node, edge, layer, bar and line, in three themes and print | 01 (Every tone), 05 |
| Phone (390) and a figure-row item (180 and 280) | 03, 07–13 |
| Keyboard focus on a scrolling drawing | 01 and 03, by Tab (interaction only) |

## Every string written for the diagram block

| Where | String |
|---|---|
| The hint under a scrolling drawing | "Scroll sideways to see the whole drawing →" |
| The scrolling box's accessible name | "Drawing, scrolls sideways" |
| The text alternative's lead | "The drawing, as text." |
| Flow and state items | "Starts at {label}." · "{label} ({sub})" · ", in {group}" · ", an end state" · ". Fields: {list}" · ". Goes to {target}, {label}; …" · "back to itself" |
| Sequence items | "{a} to {b}: {label}" · "{a}, to itself: {label}" · ". Note: {note}" |
| Timeline items | "{lane}: {label}, {from}–{to} {unit}; …" · ". Marks: {label} at {at} {unit}" · "no bars" |
| Chart table | caption "{y label}, by {x label}" · "Values" · first column "Point" (numeric x with no label) |
| Nested stack | "Inside {layer}: " |
| Interval values | "{low}–{high} · median {median}" (drawn) · "{low}–{high}, median {median}" (table) |

Every other string on the canvas (the specimen book's titles, prose, captions and labels) is sample content.

## Values P30 adds to the code (reader-scoped, proposed)

1. **The thirteen tones** in light, dark and sepia, and their print values: 39 custom properties per theme
   (`--dg-<tone>`, `--dg-<tone>-ink`, `--dg-<tone>-tint`), on the reader root beside the reader's values. New hex
   values: the light `muted` line `#8a8071` (the light `kb-hint` `#8f8676` measures 2.97:1 on `kb-surface-sunken`, under
   the 3:1 a line needs); the slate and olive hues in every theme; the dark lines and inks of teal, bronze, brick and
   plum beyond the system's; the 15–18% tints; the sepia hues (the sepia status families where they exist).
2. **The `kb-fill-<tone>` and `kb-stroke-<tone>` classes** for the `svg` block.
3. **The figure's metrics:** the layout constants in this prompt (they live in the renderer, not in tokens).

None changes an app light or dark token outside the reader. They reach the `knowledge` system at its next sync from
code, as the reader's values do.

## Proposed contract details (for P30's ingest; flagged)

- **`interval` values:** each category's value is `[low, high]` or `[low, median, high]`; a series' `values` holds one
  such pair or triple per category. (Open call 3.)
- **A transition or step to itself** (`from` = `to`) is valid in `flow`, `state` and `sequence`, and is drawn (open
  call 6).
- **The renderer's fallbacks:** an unknown tone draws as `default` (a chart series as its positional `series-<n>`);
  an unknown `shape` as `box`; an unknown `kind` or `type` as `flow` or `bar`; an edge or step naming an unknown id is
  not drawn. Whether ingest rejects these instead is P30's call (S2's validation).
- The limits (60 nodes, 100 edges, 12 lanes, 200 points) are S2's; every rule above holds up to them.

## Open calls (the drafter's answer is drawn; only the operator's words settle them)

1. **The widest diagram on a phone:** grow with the text, cap at the column, shrink to an 11 px floor, then scroll in
   its own box with the fades and the hint.
2. **Diagram text and the five sizes:** it grows with the reader's text size, to the column's width; at size 5 a wide
   drawing stays at the column and its labels stop growing.
3. **`interval`:** `[low, high]` or `[low, median, high]`.
4. **Assistive technology:** the title names the figure, the caption describes it, and the drawing's own content is
   exposed once, as a hidden list (or a table for charts), the drawing itself hidden; a stack is real lists.
5. **A figure-row item:** the same rule as any narrow column; nothing simplified.
6. **Self-transitions:** drawn.
