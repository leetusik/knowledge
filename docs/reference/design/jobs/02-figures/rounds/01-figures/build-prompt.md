# Build prompt — figures and sources (job `02-figures`, round `01-figures`)

This is the implementation contract for what the `02-figures` canvas draws inside a chapter. It is a **draft until the
operator signs the round**; build nothing from it before then. Once signed, build exactly this, under RESPECT THE
DESIGN: never drop, simplify, restyle or "improve" an element. Where this file and the canvas disagree, the canvas
wins, and the disagreement is a bug in this file.

**What it adds, and what it leans on.** The reader is signed (`01-reader`, round `02-revise`) and its build prompt
(`docs/reference/design/jobs/01-reader/rounds/02-revise/build-prompt.md`, "the reader's prompt" below) stays the
contract for everything it covers: the faces, the five text sizes (`--rd-fs`, `--rd-k`, `--rd-fs-s`), the themes
(light, dark, sepia), the one 36rem column, the prose kit and its links (§6), the Hangul runs (§6a), the diagram slot
(§8a), the scroll fades (§9a), the chrome and the sheets. This file adds the blocks that go inside a chapter's column,
and nothing in the reader changes:

1. the **figure** (`figure` block): an image, its caption and its credit, `column` or `wide`, loaded, loading and
   missing;
2. the **plain Markdown image** (`![alt](asset:name)`);
3. the **figure row** (`figures` block), its 2–3 items (image, svg, card, diagram) and the **row card** with its tones;
4. the **`svg` block** and the tone classes it may use;
5. the **sources list** (`sources` block) and the **citation**.

The data contracts are P29's (`works/phases/active/P29/phase.md` → `## Decisions`: S1 *Images*, S2 *Figure*,
*Figure row*, *Custom SVG*, *Sources*, *Ids*, *References*, *Render model*). Two additive contract changes this design
needs are listed under *Contract changes for P30*; the operator decides them.

## Canvas-only (never build)

- **The state bar** (`[data-proto="state-bar"]`) at the top of 01 and in each frame of 02, and **the foot strip**
  (`[data-proto="screens"]`). The bar scrolls away with the page (the operator's bar, rule 1). Nothing in the product
  corresponds to it.
- **The diagram stand-in** in a figure row: the grey, dashed box labelled "Canvas only · diagram stand-in · the
  diagrams job (03-diagrams)" (`.rd-dgm.fg-dgm`, `data-proto="stand-in"`). The product builds the row's diagram cell
  as the reader's diagram slot (§8a); the `03-diagrams` job draws what is in it.
- **04, the stand-ins** (`Elsewhere.dc.html`, signed). A source's URL lands on the External link stand-in on the
  canvas; in the product it opens the real page in a new tab (*Wiring*).
- **02, the widths board**: its three device frames, its own bar and its theme row.
- **Every Components board's** titles, captions and grey ground, and the mounted-part boards (11–28) drawn alone.
- **When a part is drawn alone** (boards 05–15), its in-chapter links (`#…`: a citation, a back link, a caption's
  `#id` link) point at `#top`, because their target is not on that board. In the chapter they are the real `#id`s.
- **`reader.js`.** It parses the blocks in the browser (a small YAML reader, the SVG allowlist walk, the citation
  numbering) and holds the sample chapters and the asset map. The product parses and validates on the server (S2
  *Render model*) and reads real data. The canvas's SVG renderer draws `g rect circle ellipse line polyline polygon
  path text tspan` only; the product renders the whole S2 allowlist, `defs`, `marker`, `title`, `desc` and a local
  `use` included.
- **`flow.js`**, and in `reader.js` **`RD.figs`**: the prototype's conditions (images loaded, loading or one missing;
  reduced motion; the citation target and the citation you came back to). The product gets them from the browser:
  the image's own loading, the `prefers-reduced-motion` media query and the URL fragment (`:target`).
- **The canvas-only classes** that stand in for those: `.fg-rm` (reduced motion), `.is-target` on a source item and
  `.fg-cite--here` on a citation (both `:target` in the product), and the wrappers `.fg-pass` and `.fg-solo`.
- **The plain image's id on the canvas**, `canvas-img-<name>`, exists only so a preset can scroll to it. The product's
  id is `img-<name>` (*The plain Markdown image*).
- **The sample content**: the chapter text, alts, captions, credits, card copy, the SVG sources and the source items
  are data written for the canvas (or real, where `result.md` → *Data* says so), never product strings.

## Tokens

Everything resolves to `kb-*` roles and the reader's values (`reader.css`, the reader's prompt → *Tokens*). This job
adds no type step, no spacing step and no radius.

### The roles it uses

| Role | Where |
|---|---|
| `kb-ink` | a card's body, the row caption, a source's title and note, the missing box's alt text |
| `kb-secondary` | captions, the credit, the still-frame line, the hints, a source's number and meta line, the back row's lead and chevron, the missing box's label |
| `kb-accent` | links in captions and cards, a citation, a source's URL, the back links |
| `kb-accent-strong` | a back link's hover (links keep the signed `rd-a` hover) |
| `kb-accent-soft` | the citation the reader came back to |
| `kb-surface-sunken` | the loading box, the missing box, the source item a citation led to |
| `kb-border` | the row's two hairlines; the loading sheen (the signed `.rd-skel`) |
| `kb-border-strong` | the image edge (as `--fg-edge`), the followed source item's hairline box |
| `kb-surface` | the scroll fades' ground, the image plate in light and sepia |
| `kb-tap` (2.75rem) | the back links' and the source URL's target height |
| `kb-radius-sm` | the image box, the scroll box, a source item |
| `kb-radius` | a card |
| `kb-space-xs/sm/md/lg` | every gap (*Spacing*) |
| `kb-focus-w`, `kb-focus-offset`, `kb-accent` | the focus ring, as the reader's (`:is(a, button, summary, [tabindex]):focus-visible`) |
| `kb-tracking-label`, `kb-weight-semibold` | the 11 px mono labels; titles, numbers and back links |

### New values (reader-scoped; listed again under *Values P30 adds*)

- **`--fg-plate`**, the ground behind an image's transparent pixels: `var(--kb-surface)` in light and sepia, **`#ece4d7`**
  in dark (the dark theme's ink, used as a ground), so dark lines on no ground stay legible in every theme.
- **`--fg-edge`**, the image edge: `var(--kb-border-strong)` in every theme, named so a theme can change it alone.
- **The tones**, **provisional, pending `03-diagrams`**, which owns the palette. Each tone is a pair per theme: an
  **ink** (a card's title; an SVG stroke or label) and a **soft** ground (a card's ground; an SVG shape's fill). When
  `03-diagrams`' palette is signed, its values replace these and nothing else here changes.

| tone | light ink · soft | dark ink · soft | sepia ink · soft |
|---|---|---|---|
| `default` | `#26211c` · `#efe9db` | `#ece4d7` · `#2a261e` | `#382a1b` · `#ecdcba` |
| `muted` | `#5c5347` · `#f4efe3` | `#b6ad9d` · `#1f1c16` | `#5f4d37` · `#efe2c5` |
| `accent` | `#0a544e` · `rgba(15,111,102,.15)` | `#86d4ca` · `rgba(98,189,178,.2)` | `#08483f` · `rgba(12,97,89,.15)` |
| `ok` | `#3a6a2c` · `#e6eedb` | `#a9d897` · `rgba(156,207,138,.16)` | `#33591f` · `#e3e3bd` |
| `warn` | `#6b5220` · `#efe6d2` | `#d8b673` · `rgba(200,161,94,.16)` | `#614716` · `#eedcb4` |
| `bad` | `#8f4030` · `#f1e1db` | `#e0a08e` · `rgba(214,138,118,.16)` | `#833526` · `#efd7c6` |
| `store` | `#764f6c` · `#f1e6ee` | `#d4abcb` · `rgba(201,155,192,.16)` | `#6c4562` · `#ecd9d6` |
| `series-1` | `#0a544e` · `#dcebe7` | `#86d4ca` · `rgba(98,189,178,.16)` | `#08483f` · `#dcdfc4` |
| `series-2` | `#6b5220` · `#f1e7cf` | `#d8b673` · `rgba(200,161,94,.16)` | `#614716` · `#eedcb4` |
| `series-3` | `#764f6c` · `#efe3ec` | `#d4abcb` · `rgba(201,155,192,.16)` | `#6c4562` · `#ecd9d6` |
| `series-4` | `#8f4030` · `#f4e0d9` | `#e0a08e` · `rgba(214,138,118,.16)` | `#833526` · `#efd7c6` |
| `series-5` | `#35608f` · `#e2eaf3` | `#a3c2e4` · `rgba(143,179,220,.16)` | `#2f5680` · `#dfdfd2` |
| `series-6` | `#4f5c1c` · `#e8ecd2` | `#c2cf7e` · `rgba(181,196,106,.16)` | `#4c561a` · `#e4e1bd` |

As CSS: under each `[data-theme]`, `--fg-<tone>-ink` and `--fg-<tone>-soft`; a class `.fg-tone-<tone>` sets
`--fg-ink: var(--fg-<tone>-ink); --fg-soft: var(--fg-<tone>-soft)`. An unknown or absent tone is `default`.

**Measured** (WCAG 2; a translucent soft ground composited over the theme's surface; every pair in all three themes;
the full table is in `result.md` → *Measured contrast*): a tone's title on its ground ≥ 5.37:1, `kb-ink` on any ground
≥ 8.79:1, `kb-accent` on any ground ≥ 4.74:1, a tone's ink on the surface ≥ 6.35:1. This job's other text pairs:
secondary on surface ≥ 6.87, accent on surface ≥ 5.97, accent on sunken ≥ 4.98, secondary on sunken ≥ 5.96, accent on
the "came back to" tint ≥ 4.82, the sketch's ink on its plate ≥ 12.64.

### Spacing (every value × `--rd-k` unless marked fixed)

| Where | Value |
|---|---|
| a figure's, a row's and an `svg` block's top margin | `lg` |
| a plain image's top margin | `md` (a paragraph's) |
| image → its caption | `sm` |
| caption → credit → still-frame line | `xs` |
| a row: inside its hairlines (top and bottom padding) | `md` |
| a row: caption → items | `md` |
| a row's items: stacked / side by side | `lg` / `md` |
| a row item: image or drawing → its caption | `sm` |
| a card: padding / title → body / paragraph → paragraph | `md` / `xs` / `sm` |
| the sources list's top margin / between items | `md` / `xs` |
| a source item's padding (fixed), pulled out by the same amount so its text keeps the column's edges | `sm` |
| a source item's number column | `2.4em`, gap `xs` (fixed) |
| the back row's links | gap `xs` (fixed) |

## The parts, their props and their states

Every block sits in the article's `text` track (the reader's prompt → *Article tracks*), with `min-width: 0`, at the
column's two edges. The page never scrolls sideways at any width; anything wider than the column scrolls inside its
own box with the signed fades (§9a).

### 1. The image box (shared by the figure, the plain image and a row's image item; `Figure`, board 11)

The server renders, for a known asset, from the first paint:

```html
<span class="fg-media fg-media--loading" style="--fg-w: 1440; --fg-h: 900">
  <span class="rd-skel fg-media__skel" aria-hidden="true"></span>
  <picture class="fg-media__pic">
    <!-- only for an animated asset -->
    <source media="(prefers-reduced-motion: reduce)" srcset="<still url>">
    <img class="fg-media__img" src="<asset url>" alt="<alt>" width="1440" height="900" loading="lazy" decoding="async">
  </picture>
</span>
```

The skeleton comes **before** the `<picture>`. The loaded look is this same markup with `is-loaded` added to the box
(*Loading*, below); it matches the canvas's loaded box, which draws only the `<picture>`.

- **Size.** `--fg-w` and `--fg-h` are the image's pixel size from the asset map (*Contract changes*). The box is
  ```
  width: min(100%, calc(var(--fg-w) * 1px), calc(var(--fg-cap) * var(--fg-w) / var(--fg-h)));
  aspect-ratio: var(--fg-w) / var(--fg-h);
  --fg-cap: min(36rem, 75svh);
  ```
  so an image is never wider than the column, never larger than one CSS pixel per image pixel (never scaled up by the
  page), and never taller than `min(36rem, 75svh)`. It starts at the column's left edge; a narrower image leaves the
  rest of the line empty. The `<img>` fills the box with `object-fit: contain`, so nothing is cropped or stretched.
  - *A tall portrait* (1170 × 2532): its height stops at 36rem (576 px; at 390 × 844, 576 too), so it is 266 px wide.
  - *A 3:1 chart* (1500 × 500): the column's width, 192 px tall at 576; at 390 it shrinks to the column (or scrolls,
    as `wide`).
  - *A small image* (260 × 100): 260 px wide at every width over 260; never scaled up.
- **Edge.** `.fg-media::after` draws an inset 1px `--fg-edge` hairline over the image, radius `kb-radius-sm`,
  `pointer-events: none`, taking no layout, in every theme. The reader never changes an image's pixels: no dimming,
  no filter, in any theme (open question 5).
- **Plate.** `.fg-media` has `background: var(--fg-plate)`, which shows only through transparent pixels.
- **Loading** (`fg-media--loading`, the markup above). The box is reserved at the image's ratio from the first paint,
  so nothing below it moves when the image arrives. While the image has not loaded, the box shows `kb-surface-sunken`
  with the signed skeleton sheen (`.rd-skel`, 1.4s; still under `prefers-reduced-motion`). These rules set the look
  and the paint order:
  ```css
  .fg-media--loading { background: var(--kb-surface-sunken); }
  .fg-media__skel { position: absolute; inset: 0; border-radius: inherit; }
  .fg-media__pic { position: relative; }
  .fg-media.is-loaded { background: var(--fg-plate); }
  .fg-media.is-loaded > .fg-media__skel { display: none; }
  ```
  Positioned boxes with `z-index: auto` paint in DOM order, so the `<picture>` (positioned, after the skeleton) paints
  over the sheen, and `.fg-media::after` (the edge, the box's last child) still paints over both; no `z-index` is
  needed. The reader's client script (the one that already measures §9a's overflow) adds `is-loaded` on the image's
  `load` event, or on hydrating when `img.complete && img.naturalWidth > 0`; the last two rules remove the sheen and
  the sunken ground and leave the plate. Without the script, an opaque image covers the sheen as soon as it arrives;
  a transparent image shows the sunken ground and the sheen through its clear pixels until the script adds
  `is-loaded`. The canvas draws this state with no `<img>`, so its `figures.css` carries neither the `.fg-media__pic`
  position nor the `is-loaded` rules, and it gives the box `role="img"` and the alt as its `aria-label`; in the
  product the `<img>` and its alt are there from the start, and the box has no role.
- **Missing** (`fg-media--missing`). When the name has no entry in the version's asset map or its file is not in
  storage, the server renders, in the image's place:
  ```html
  <span class="fg-media fg-media--missing" style="--fg-w: …; --fg-h: …">
    <span class="fg-miss__label">Image not available</span>
    <span class="fg-miss__alt"><alt></span>
  </span>
  ```
  a flex column centred vertically, gap `xs`, padding `md`, on `kb-surface-sunken`, `min-height: 6rem`, growing past
  the reserved ratio when the alt needs more room (`overflow: visible`). The label is mono 11 px 700, uppercase,
  `kb-tracking-label`, secondary; the alt is the body face at `--rd-fs-s` / 1.45 in ink, wrapping (`overflow-wrap:
  break-word`, `text-wrap: pretty`), with its Hangul runs wrapped (§6a). The figure keeps its caption and credit. If
  the image fails after the page renders (the relay 404s, the network drops), the same client script swaps the box
  for this markup on the image's `error` event; without script, the browser's own alt text shows in the reserved box.
- **An animated GIF** (`animated: true` in the asset map). The `<source>` above points at the still frame the server
  extracted at ingest; under `prefers-reduced-motion: reduce` the browser shows the still. A figure adds the line
  "Still frame: your device is set to reduce motion." under its caption (2). No play control.
- **Every image** carries `loading="lazy" decoding="async"` and its `width` and `height` attributes.

### 2. The figure (`figure` block; `Figure`, board 11; states on board 05)

**Props:** `id`, `asset` (or none: missing), `alt` (required), `caption` (inline runs, required), `credit?` (inline
runs), `width: "column" | "wide"` (default `column`).

```html
<figure class="fg-fig [fg-fig--wide]" id="<id>">
  <div class="fg-box">
    <div class="fg-box__scroll"> <!-- the image box (1) --> </div>
    <span class="fg-fade fg-fade--l" aria-hidden="true"></span><span class="fg-fade fg-fade--r" aria-hidden="true"></span>
  </div>
  <!-- wide only --><p class="fg-hint">Scroll sideways to see the whole image →</p>
  <figcaption class="fg-figcap">
    <p class="fg-cap"><caption runs></p>
    <!-- credit? --><p class="fg-credit"><span class="fg-credit__label">Credit</span><span class="fg-credit__text"><credit runs></span></p>
    <!-- animated asset only --><p class="fg-still">Still frame: your device is set to reduce motion.</p>
  </figcaption>
</figure>
```

- **The figure:** a flex column, gap `sm × k`, top margin `lg × k`, `scroll-margin-top: calc(var(--rd-line) +
  var(--rd-top-h) + 1rem)`.
- **The caption** (`.fg-cap`): the interface face (`--font-body`) at the column's small step `--rd-fs-s`, line-height
  1.45, in **secondary**, `max-width: 34em`, `text-wrap: pretty`, `overflow-wrap: break-word`. Inline Markdown as the
  prose kit renders it (links, inline code, emphasis, strong), Hangul runs wrapped (§6a), and citations (8). It is
  never mistaken for body text: another face, a smaller step, another colour, tight under the image.
- **The credit** (`.fg-credit`): a wrapping flex line, baseline-aligned, gap `0 sm`, `--font-body` 13 px / 1.45,
  secondary, `max-width: 40rem`. Its label "Credit" is mono 11 px 700 uppercase with `kb-tracking-label`; its text is
  inline Markdown.
- **The still-frame line** (`.fg-still`): 13 px / 1.45 secondary; `display: none`, shown only under
  `@media (prefers-reduced-motion: reduce)`; rendered only for an animated asset.
- **Korean:** under `:lang(ko)`, the reader's Korean rules (`keep-all`, `overflow-wrap: anywhere`, `line-break:
  strict`) apply to the caption and credit; the chrome strings stay English (open question 10).
- **No figure number** and no "Figure" label.

**`width: column`** (the default): the image box (1), no scroll box behaviour; the box never overflows.

**`width: wide`** (open question 1): the figure keeps the column's two edges at every width. Its image box is
```
width: min(max(100%, 36rem), calc(var(--fg-w) * 1px), calc(var(--fg-cap) * var(--fg-w) / var(--fg-h)));
```
so from 40rem up (the column is 36rem) it is exactly a column figure, and narrower (a phone) it keeps 36rem (or its own
width, if smaller) and scrolls sideways inside `.fg-box__scroll` (`overflow-x: auto; overflow-y: hidden;
overscroll-behavior-inline: contain`, radius `kb-radius-sm`). Whether it overflows is **measured** (the box's
`scrollWidth` against its `clientWidth`, re-read on resize, on a text-size change, when fonts load and when the image
loads), never guessed. While it overflows, the figure gets `is-over` and:
- the scroll box gets `tabindex="0"`, `role="region"` and `aria-label="Image, scrolls sideways"` (none of the three
  when it fits), and the arrow keys scroll it;
- the fades (§9a) show, each 2rem wide over the box's height, on `--kb-surface`: the right while more remains on the
  right (`is-more-r`), the left while more remains on the left (`is-more-l`), with `opacity` over `--rd-ease`;
- the hint (`.fg-hint`, 13 px secondary `--font-body`, `margin: 0`) shows under the box.

A `column` figure is never a scroll box.

When an author picks `wide`: an image whose small text would shrink past reading size in a phone's column (a dense
screenshot, a sketch with labels). The canvas's sketch `bff-sketch` (1192 × 315) is `wide` for this reason: as a
column figure at 390 its labels became unreadable (render log, pass 2).

### 3. The plain Markdown image (`![alt](asset:name)`; board 06)

- **What it is:** the image box (1) alone, at a paragraph's spacing (`.fg-plain`, top margin `md × k`), with **no
  caption, no credit and no still-frame line**, and `column` sizing. What sets it apart from a figure: a figure has a
  caption (required) and may have a credit and `wide`; a plain image is an illustration inside the prose.
- **Where it goes:** an image never sits among words. The renderer splits the paragraph that holds it: the text before
  it is a paragraph, the image is its own block, and the text after it is a new paragraph. A paragraph that is only the
  image becomes the image.
- **Id:** the wrapper carries `id="img-<asset name>"` (the canvas uses `canvas-img-<name>`; canvas-only), so S3's
  anchors and a link can reach it. Two plain images of the same asset in one document take `img-<name>-2`, `-3`.
- **States:** loaded, loading and missing exactly as (1); an animated asset shows its still under reduced motion,
  without the line.

### 4. The figure row (`figures` block; `FigureRow`, board 12; states on board 07)

**Props:** `id`, `caption?` (inline runs), `items` (2–3).

```html
<figure class="fg-row fg-row--<2|3> [fg-row--cards]" id="<id>">
  <!-- caption? --><figcaption class="fg-row__cap"><row caption runs></figcaption>
  <div class="fg-row__items">
    <div class="fg-row__grid"> <!-- the items, in order --> </div>
  </div>
</figure>
```

- **The frame (this job's one bold move):** a 1px `kb-border` hairline above and below the row, padding `md × k`
  inside them, no side lines, no ground. The row is a flex column, gap `md × k`, top margin `lg × k`, with the same
  `scroll-margin-top` as a figure.
- **The row caption** (`.fg-row__cap`): above the items, `--font-body` at `--rd-fs-s` / 1.45, **semibold, in ink**,
  `max-width: 34em`, `text-wrap: pretty`. It reads as the whole row's because it sits above all the items and inside
  the hairlines, while each item's own caption sits under its item in secondary.
- **The layout (CSS only; open question 2):**
  ```css
  .fg-row__items { container: fgrow / inline-size; font-size: var(--rd-fs-s); }
  .fg-row__grid  { display: grid; grid-template-columns: minmax(0, 1fr);
                   gap: calc(var(--kb-space-lg) * var(--rd-k)) calc(var(--kb-space-md) * var(--rd-k));
                   align-items: start; }
  .fg-row__grid > * { min-width: 0; }
  @container rd (min-width: 40rem) {
    @container fgrow (min-width: 24em) { .fg-row--2 .fg-row__grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
    @container fgrow (min-width: 33em) { .fg-row--3 .fg-row__grid { grid-template-columns: repeat(3, minmax(0, 1fr)); } }
  }
  .fg-row--cards .fg-row__grid { align-items: stretch; }   /* every item a card: equal heights */
  ```
  The `em` in the inner queries is the items' box font size, the column's small step, so the stacking point follows
  the text size:
  - **below 40rem** (a phone): every row stacks, items in source order, `lg × k` apart, each with its own caption;
  - **from 40rem**, the column is 36rem (576 px): a row of **two** sits side by side at every text size (24em ≤ 576 px
    up to size 5); a row of **three** sits side by side at sizes 1–4 (33em = 413–550 px) and **stacks at size 5**
    (33em = 605 px > 576), even at 820 and 1440;
  - side by side, the items are top-aligned (an image beside a short card: the card does not stretch); a row whose
    items are all cards (`fg-row--cards`) stretches them to the tallest.
  - iPad landscape (1024 × 768) lays out as 820 (the column is 36rem from 40rem up).
- **The items,** each `min-width: 0`:
  - **image** `{image, alt, caption?}`: `<figure class="fg-item">` (a flex column, gap `sm × k`) holding the image box
    (1), sized to the cell, and `<figcaption class="fg-figcap"><p class="fg-cap">…</p></figcaption>` when it has a
    caption. No credit, no `wide`, no still-frame line.
  - **svg** `{svg, label, caption?}`: the `svg` block (6) as an item: `<figure class="fg-item fg-svg fg-svg--item">`,
    scaled to the cell (no minimum width, never a scroll box, no hint), its caption under it.
  - **card** `{card: {title, body, tone?}}`: the row card (5).
  - **diagram** `{diagram, caption?}`: the reader's diagram slot (§8a), sized to the cell, inside a
    `<figure class="fg-item">` with the item's caption under it; the diagram's `title` stays its accessible name. Its
    look is `03-diagrams`'. If a diagram kind needs a minimum width, the row's stacking point is where it applies.
- **Loading and missing** apply to each image item as (1).
- **No client script.** The row is markup and CSS only.

### 5. The row card (`RowCard`, board 13; every tone on board 08)

**Props:** `title` (text), `body` (Markdown: paragraphs split at blank lines, inline Markdown inside each), `tone?`.

```html
<div class="fg-card fg-tone-<tone>">
  <p class="fg-card__title"><title></p>
  <p class="fg-card__p"><paragraph runs></p> …
</div>
```

- A flex column, gap `xs × k`, padding `md × k`, radius `kb-radius`, `background: var(--fg-soft)`. No border, no
  coloured edge, no shadow.
- The title: Fraunces (`--font-display`) semibold at `1em` of the card's size (`--rd-fs-s`), line-height 1.3, in the
  tone's ink (`--fg-ink`), `text-wrap: pretty`, `overflow-wrap: break-word`. It is a paragraph, not a heading (cards
  carry no id; S2 *Ids*).
- The body: `--font-body` at `--rd-fs-s` / 1.45 in **`kb-ink`** (never the tone's colour), paragraphs `sm × k` apart,
  links and inline code as the prose kit.
- **A tone is never the only signal:** the title says what the card is ("Do: …", "Never: …", "Stored: …"); the tone
  only tints. An author's card without such a title is still legible, in ink on a soft ground.
- Korean (`:lang(ko)`): `keep-all`, `overflow-wrap: anywhere`, `line-break: strict`.
- At size 5 in a row of three the row stacks (4), so no card text is clipped or broken mid-word.

### 6. The `svg` block (`SvgBlock`, board 14; states on board 09)

**Props:** `id`, `svg` (the source, validated at ingest against S2's allowlist: **rejected with a 422, never
stripped**), `label` (required), `caption?`.

```html
<figure class="fg-fig fg-svg" id="<id>">
  <div class="fg-box">
    <div class="fg-box__scroll">
      <svg class="fg-svg__svg" viewBox="<viewBox>" role="img" aria-label="<label>"
           style="--fg-vbw: <viewBox width>; --fg-minw: <N>px"> <!-- the author's elements --> </svg>
    </div>
    <span class="fg-fade fg-fade--l" aria-hidden="true"></span><span class="fg-fade fg-fade--r" aria-hidden="true"></span>
  </div>
  <p class="fg-hint">Scroll sideways to see the whole drawing →</p>
  <!-- caption? --><figcaption class="fg-figcap"><p class="fg-cap"><caption runs></p></figcaption>
</figure>
```

- **Size:** `width: min(100%, calc(var(--fg-vbw) * 1px)); height: auto` (never drawn larger than its viewBox), and
  `min-width: var(--fg-minw)`, where `--fg-minw = ceil(viewBox width × 11 / smallest font-size)`, the smallest
  `font-size` attribute in the source (16 if none): the drawing never shrinks so far that its smallest label is under
  11 px. Narrower than that (a phone, for a wide drawing), it scrolls in `.fg-box__scroll` exactly as a wide figure
  (2): measured overflow, `is-over`, `tabindex="0"`, `role="region"`, `aria-label="Drawing, scrolls sideways"`, the
  fades on `--kb-surface` and the hint. In a row it is an item (4) and has no minimum.
- **Colour:** `color: var(--kb-ink)`, so `currentColor` is the theme's ink. Only these colour it:
  ```css
  .fg-svg__svg :where(*) { vector-effect: non-scaling-stroke; }            /* hairlines stay hairlines */
  .fg-svg__svg :where(text:not([fill]), tspan:not([fill])) { fill: currentColor; }
  .fg-svg__svg :where(rect, circle, ellipse, polygon, polyline, path):where(:not([fill])) { fill: none; }
  .fg-svg__svg .kb-fill-<tone> { fill: var(--fg-<tone>-soft); }             /* a shape: the soft ground */
  .fg-svg__svg :is(text, tspan).kb-fill-<tone> { fill: var(--fg-<tone>-ink); }   /* a label: the ink */
  .fg-svg__svg .kb-stroke-<tone> { stroke: var(--fg-<tone>-ink); }
  ```
  for each of the 13 tones. `fill`/`stroke` attributes may only be `none` or `currentColor` (S2).
- **Text:** `font-family: var(--font-body)` (Source Sans 3, Pretendard for Hangul), so Korean labels render in the
  signed interface face. `overflow: visible` on the `<svg>`, so a label at the viewBox's edge is never clipped.
- **Text alternative:** `label` is the `<svg>`'s accessible name (`role="img"`, `aria-label`); the caption shows under
  it when there is one. The author's own `title`/`desc` are kept.
- **Themes:** the same source draws in light, dark and sepia, through `currentColor` and the tone variables.

### 7. The sources list (`sources` block; `SourceList`, board 15; states on board 10)

**Props:** `id` (`sources`), `items[{id, title, url, publisher?, date?, accessed?, note?}]`, and, from the citations
(8), each item's citations in document order with the nearest preceding h2's text.

```html
<ol class="fg-src" id="sources" aria-label="Sources">
  <li class="fg-src__item" id="<source id>">
    <span class="fg-src__n">[1]</span>
    <div class="fg-src__body">
      <p class="fg-src__title"><title></p>
      <!-- any of publisher, date, accessed --><p class="fg-src__meta"><publisher><span aria-hidden="true"> · </span><date><span aria-hidden="true"> · </span>Accessed <accessed></p>
      <p class="fg-src__url"><a class="rd-a fg-src__link" href="<url>" target="_blank" rel="noopener noreferrer"><url><span class="rd-a__ext"> · new tab</span></a></p>
      <!-- note? --><p class="fg-src__note"><note runs></p>
      <!-- the way back (below) -->
    </div>
  </li>
</ol>
```

- **The list:** `list-style: none`, top margin `md × k`, a flex column with items `xs × k` apart; `--font-body` at
  `--rd-fs-s` / 1.45 in ink.
- **One item, in this order:** the number `[n]` (its position in the list, 1-based; semibold, `tabular-nums`,
  secondary, in a 2.4em column) · the **title** (semibold, ink, `text-wrap: pretty`) · the **meta line** (publisher ·
  date · "Accessed <accessed>", each only when present, joined by " · ", secondary, `tabular-nums`; dates shown as
  written) · the **URL** as the link's text · the **note** (inline Markdown, ink) · the **way back**. An item with
  only `title` and `url` shows the number, the title and the URL (and its way back, when cited).
- **The URL** keeps the reader's link look (`rd-a`) and the signed " · new tab" suffix; `display: inline-block`,
  `overflow-wrap: anywhere` (and `word-break: normal` inside Korean), so a 120-character URL wraps inside the column.
  Its box is `kb-tap` tall (`padding-block: calc((kb-tap − 1.45em) / 2)` with the same negative `margin-block`), so the
  lines keep their spacing.
- **The item a citation led to** (`:target`): `kb-surface-sunken` ground and an inset 1px `kb-border-strong` box,
  radius `kb-radius-sm`. Each item has `padding: sm` and `margin-inline: −sm`, so the box frames the text without
  moving it off the column's edges; `scroll-margin-top: calc(var(--rd-line) + var(--rd-top-h) + 1rem)`.
- **The way back** (`.fg-src__back`: a wrapping flex line, items centred, gap `0 xs`, 13 px, secondary, with a bottom
  margin of `(1.45em − kb-tap) / 2` so the 44 px targets do not add space):
  - **cited once:** `<a class="fg-back" href="#cite-<source>-1" aria-label="Back to the text, in “<section>”">` holding
    `<span class="fg-back__chev" aria-hidden="true">‹</span><span>Back to the text</span>`;
  - **cited 2 or more times:** the lead `Back to the text:` then one link per citation, in document order, lettered
    `a`, `b`, `c` … (after `z`: `aa`, `ab`, …): `<a class="fg-back fg-back--letter" href="#cite-<source>-<k>"
    aria-label="Back to citation <letter> of <count>, in “<section>”">‹ <letter></a>`, the chevron `aria-hidden`;
  - **never cited:** no way back;
  - `, in “<section>”` is left out when no h2 precedes the citation.
  - A back link is `inline-flex`, centred, gap 0.3em, `min-height` and `min-width` `kb-tap`, semibold, accent, no
    underline; the chevron in secondary. Hover: `kb-accent-strong` with an underline at 0.2em offset. Focus: the
    reader's ring.
- **Korean:** `keep-all`, `overflow-wrap: anywhere`, `line-break: strict` on the titles, meta and notes; no overflow at
  390. Chrome strings ("Accessed", "Back to the text", " · new tab") stay English.
- **The heading above it:** an author writes `## Sources` before the fence. Its id must not be `sources` (the block's);
  the canvas writes `## Sources {#sources-list}` (*Contract changes*, observation).

### 8. The citation (open question 7)

An inline link whose target is `#<id of a sources item>` in the same document is a citation. The renderer numbers it
from the sources list and gives it an id:

```html
<a class="rd-a fg-cite" id="cite-<source id>-<k>" href="#<source id>">py-fsrs<span class="fg-cite__n">&nbsp;[1]</span></a>
```

- **Form:** the author's words, then a no-break space and the source's number `[n]`, inside **one** link, so the
  target is the size of the words. When the words are only a number (`1` or `[1]`), the link shows `[n]` alone (no
  space). `.fg-cite__n`: `--font-body` at 0.8333em, semibold, `tabular-nums`, `white-space: nowrap`. The rest is the
  signed link (`rd-a`: accent, its underline and hover).
- **Id:** `cite-<source id>-<k>`, where `k` counts that source's citations in document order from 1. It is generated
  at render and never stored.
- **Where:** anywhere an inline link renders: paragraphs, list items, quotes, callouts, table cells, a figure's or an
  item's caption, a card's body, a source's note. (The canvas draws them in paragraphs, list items and captions.)
- **The way there:** following it moves to the item in the list (`:target`, 7). The browser's Back returns.
- **The way back:** a back link (7) goes to `#cite-<source>-<k>`; the citation becomes `:target`:
  `background: var(--kb-accent-soft); box-shadow: 0 0 0 2px var(--kb-accent-soft); border-radius: 2px`, with
  `scroll-margin-top: calc(var(--rd-line) + var(--rd-top-h) + 2rem)`, so it lands below the top bar with a line of
  context.
- A link to `#<id>` that is not a sources item is an ordinary in-chapter link, with no number.

## Behaviour

- **Scroll boxes** (a wide figure, an `svg` block): the overflow and the fades are measured as §9a, by the reader's
  existing client script, on the box's `scroll` (passive), on resize, on a text-size change, when fonts load, and (for
  a figure) when its image loads. A fade takes no layout, so showing or hiding it moves nothing. The hint takes one
  line under the box from the first measure and keeps it; scrolling never toggles it.
- **Images:** `loading="lazy"`; the reserved box means the page's height is final before any image arrives, so a
  jump to `#id`, the reading progress and the saved section stay exact. `is-loaded` and the missing swap are set by
  the same client script (1).
- **Reduced motion:** the sheen is still (signed), the fades' transition is 0s (signed), an animated GIF shows its
  still frame and the figure's line says so.
- **Jumps:** a citation and a back link are plain fragment links. Every target (a source item, a citation, a figure, a
  row, an `svg` block) carries the `scroll-margin-top` above, so it lands below the top bar while the chrome shows.
- **Keyboard:** every link, back link and URL is in the tab order; a scroll box that overflows is focusable and its
  arrow keys scroll it; focus shows the reader's ring (`kb-focus-w` in `kb-accent`, offset `kb-focus-offset`).
- **Annotations:** no control of `05-annotations`' sits on any of these blocks. Every block has a stable id (figure,
  row and `svg` take the block's `#id`; a source item its source id; a plain image `img-<name>`), and captions are
  ordinary text a highlight may cover.

## Wiring

| From | Goes to |
|---|---|
| A citation (`#<source id>`) | that item in the sources list, on this page (`:target`) |
| "‹ Back to the text" / "‹ a", "‹ b", … | that citation, on this page (`:target`) |
| A source's URL | the page, in a new tab (`rel="noopener noreferrer"`); the chapter stays open. On the canvas: the External link stand-in |
| A link in a caption, a credit, a card or a note | the reader's link rules (the reader's prompt → *Wiring*): `#id` on this page, `chapter:` and `doc:` in the reader, `https:` in a new tab, an unresolvable target in the missing-link style |
| An image | nothing: no viewer in v1 (open question 4); a phone reader pinches to zoom |

## Data the page needs (view model)

These extend the reader's `Block` (the reader's prompt → *Data the page needs*). `InlineRun` is the reader's, plus
`cite`; every text run carries its Hangul runs as `lang="ko"` spans (§6a).

```ts
type Tone = "default" | "muted" | "accent" | "ok" | "warn" | "bad" | "store"
          | "series-1" | "series-2" | "series-3" | "series-4" | "series-5" | "series-6";

interface Asset {                        // resolved from the version's asset map (S1)
  url: string;                           // the BFF relay: /app/documents/{id}/assets/{sha256}.{ext}
  width: number; height: number;         // pixels — P30 records them at ingest (contract change 1)
  animated?: boolean; stillUrl?: string; // a GIF with more than one frame, and its first frame (contract change 2)
}

type Block = /* the reader's */ …
  | { kind: "figure"; id: string; asset: Asset | null;      // null: missing
      alt: string; caption: InlineRun[]; credit?: InlineRun[]; width: "column" | "wide" }
  | { kind: "image"; id: string;                            // "img-<name>"; a paragraph is split around it
      name: string; asset: Asset | null; alt: string }
  | { kind: "figures"; id: string; caption?: InlineRun[]; items: RowItem[] }   // 2–3 items
  | { kind: "svg"; id: string; label: string; caption?: InlineRun[];
      svg: SvgNode; viewBoxWidth: number; minFontSize: number }                 // validated server-side
  | { kind: "sources"; id: string; items: SourceItem[] };

type RowItem =
  | { type: "image"; asset: Asset | null; alt: string; caption?: InlineRun[] }
  | { type: "svg"; label: string; caption?: InlineRun[]; svg: SvgNode; viewBoxWidth: number; minFontSize: number }
  | { type: "card"; title: string; body: InlineRun[][]; tone: Tone }            // body: paragraphs
  | { type: "diagram"; diagram: DiagramBlock; caption?: InlineRun[] };          // DiagramBlock: 03-diagrams'

interface SourceItem {
  id: string; n: number;                 // n: its position in the list, from 1
  title: string; url: string; publisher?: string; date?: string; accessed?: string; note?: InlineRun[];
  citations: { citeId: string; section?: string }[];   // document order; section: the nearest preceding h2
}

type InlineRun = /* the reader's */ …
  | { kind: "cite"; to: string; citeId: string; n: number; words: InlineRun[] | null };  // null: the words were only a number

type SvgNode = { tag: string; attrs: Record<string, string>; children: (SvgNode | string)[] };  // the S2 allowlist only
```

## Contract changes for P30 (additive; the operator decides)

1. **An image's size.** The asset map records `width` and `height` (pixels) at ingest, read from the image header.
   The reserved loading box (1) needs them; without them the fallback is a 16:9 box that may jump once when the image
   arrives (open question 3).
2. **An animated GIF.** The asset map records `animated: true` for a GIF of more than one frame, and the server
   extracts its first frame as a PNG at ingest (stored by hash like any asset, as `still`). Reduced motion needs it
   (open question 6).
3. **Observation, S2 *Ids*:** a chapter with a `## Sources` heading and the ```` ```sources #sources ```` block gives
   two `sources` ids. Either the heading takes another id (the canvas uses `sources-list`), or the block's id changes.

## Every state, and the board that shows it

States are reached on 01 by its state bar and by clicking, on 02 at 390, 820 and 1440, and drawn on the Components
boards 05–10. Every state is in light, dark and sepia (01's "· display:" row and 02's theme row; the Components boards
draw the themes side by side).

| State | Where |
|---|---|
| A column figure, loaded: caption with a link, inline code and emphasis, and a credit | 01 "Column figure · caption and credit"; 02; 05 |
| A wide figure: the column's edges at 820 and 1440, scrolling in its box at 390 with the fade and the hint | 01 "Wide figure"; 01 "Wide chart · a citation in its caption"; 02; 05 |
| Loading, and loading under reduced motion | 01 "Images loading", "Images loading · reduced motion"; 02; 05; 06; 07 |
| Missing | 01 "An image missing"; 02; 05; 06 |
| A tall portrait (1170 × 2532) | 01 "Tall portrait · long caption"; 02; 05 |
| A wide, short image (3:1 chart) | 01 "Wide chart · a citation in its caption"; 05 |
| A small image (260 × 100) | 01 "Small image"; 02; 05 |
| A light screenshot in dark and sepia | 01 with "Dark" or "Sepia"; 05 |
| A transparent PNG in three themes | 01 "Transparent PNG"; 02; 05 |
| A long caption (four lines or more at 390) at sizes 1, 3 and 5 | 01 "Tall portrait · long caption" at 390; 02's phone frame; 05 |
| A Korean caption | 01 "한국어 · captions"; 02; 05 |
| A caption with a citation | 01 "Wide chart · a citation in its caption"; 05 |
| An animated GIF, playing and under reduced motion | 01 "Animated GIF", "Animated GIF · reduced motion"; 02; 05 |
| A plain Markdown image in a paragraph, beside a figure, loading and missing | 01 "Plain Markdown image"; 02; 06 |
| A row of two images with a row caption: side by side at 820 and 1440, stacked at 390 | 01 "Row of two images"; 02; 07 |
| A row of two cards | 01 "Row of two cards" (or "Top of chapter", then scroll); 02; 07 |
| A row of three mixed items of unequal heights (an image, an `svg`, a card) | 01 "Row of three · unequal heights"; 02; 07 |
| A row with a diagram item (the stand-in) | 01 "Row with a diagram item"; 02; 07 |
| A row of three cards at sizes 1, 3 and 5 at 820 (stacked at 5) | 01 "Row of three cards" with Size 1, 3, 5; 02; 07 |
| A row stacked on a phone, and in Korean at 390 | 02's phone frame; 01 "한국어 · captions" at 390; 07 |
| Cards in every tone, three themes | 08 |
| An `svg` UI mock and a 2×2 matrix, three themes | 01 "SVG · UI mock", "SVG · 2×2 matrix"; 02; 09 |
| An `svg` with Korean labels | 01 "한국어 · captions" ("SVG · UI mock" in Korean); 09 |
| A wide `svg` at 390, scrolling in its box | 02's phone frame; 09 |
| Citations in the text, one source cited three times | 01 "Citations in the text"; 02; 10 |
| A sources list of 8 items using every field, some with title and URL only, a 120-character URL | 01 "Sources list"; 02; 10 |
| After a citation: its source item marked | 01 "After a citation · its source", or click a citation; 02; 10 |
| Back at the citation: the citation marked | 01 "Back at the citation", or click a back link; 02; 10 |
| A source's URL followed | 01 "A source's URL" (the External link stand-in), or click a URL |
| A Korean source title, sources in Korean | 01 "한국어 · sources"; 02; 10 |
| The figures chapter in the signed reader at 390, 820 and 1440 | 01; 02 |

**Reached only by interaction:** hover and focus on every link, back link and URL; a scroll box scrolled to its
start, middle and end (the fades follow the position).

## Every string written for these blocks

The chrome copy is English only, in every variant (as the reader's).

| String | Where |
|---|---|
| `Image not available` | the missing box's label (shown uppercase by CSS) |
| `Credit` | the credit's label (shown uppercase by CSS) |
| `Still frame: your device is set to reduce motion.` | under an animated figure's caption, under reduced motion |
| `Scroll sideways to see the whole image →` | under a wide figure that scrolls |
| `Scroll sideways to see the whole drawing →` | under an `svg` block that scrolls |
| `Image, scrolls sideways` | aria-label of a wide figure's scroll box, while it scrolls |
| `Drawing, scrolls sideways` | aria-label of an `svg` block's scroll box, while it scrolls |
| `Sources` | aria-label of the sources list |
| `[n]` (with a leading no-break space after words) | a citation's number; a source item's number |
| ` · ` | between the meta line's fields (aria-hidden) |
| `Accessed <accessed>` | the meta line |
| ` · new tab` | after a source's URL (the reader's external-link suffix) |
| `‹` | before a back link's text (aria-hidden) |
| `Back to the text` | the way back, cited once |
| `Back to the text, in “<section>”` | its aria-label (`, in “…”` only when an h2 precedes) |
| `Back to the text:` | the lead of the way back, cited 2 or more times |
| `a`, `b`, `c` … | one back link per citation |
| `Back to citation <letter> of <count>, in “<section>”` | their aria-labels |

**Canvas-only strings** (never built): "Canvas only · diagram stand-in · the diagrams job (03-diagrams)"; "A
<kind> diagram goes here, drawn by 03-diagrams. This box only holds its place and shows the text a reader gets
without the picture."; "Title"; the state bar's caption, page names, presets, "· display:" and "only state"; the
foot strip's "Canvas only ·", "The figures at 390, 820 and 1440", "The chapter screen alone" and "The stand-in for
another job's screen"; the Components boards' titles and captions; the widths board's title and introduction.

## Values P30 adds to the code (reader-scoped)

These stay scoped to the reader root, like the reader's own (the reader's prompt → *Values P30 adds*, items 1–8).
Nothing here is applied to the system by the design round, and none changes an existing light or dark value.

9. **The tone palette**, 13 tones × (ink, soft) × 3 themes, as `--fg-<tone>-ink` / `--fg-<tone>-soft`. **Provisional,
   pending `03-diagrams`**, which owns it; its signed values replace the table above.
10. **`--fg-plate`**: `kb-surface` in light and sepia, `#ece4d7` in dark.
11. **`--fg-edge`**: `kb-border-strong`.
12. **The image treatment** (the figure, caption, credit, missing and loading boxes), the row, the card, the `svg`
    frame, the sources list and the citation, as this file states them.

**Proposed system changes:** none. The system has no figure, caption or tone tokens; when the reader's values reach
the `knowledge` system at its next sync from code, these go with them.
