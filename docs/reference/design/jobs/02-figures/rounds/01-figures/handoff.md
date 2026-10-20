# Handoff — job `02-figures`, round `01-figures` (slice P29.S5)

new visual direction: no

critique: critic

This is the drafter's whole brief and the critic's yardstick for this job's first round. The
orchestrator wrote it on 2026-10-20 from the record:
- the P29 contracts (`works/phases/active/P29/phase.md` → `## Decisions`), chiefly S1 *Images* and S2
  *Figure*, *Figure row*, *Custom SVG*, *Sources*, *Ids*, *References* and *Render model*;
- the signed reader (`## Decisions` → *The signed reader*, and the signed round
  `jobs/01-reader/rounds/02-revise/`);
- the S5 notes (`## Notes for later slices`);
- `works/phases/active/P29/intent.md`;
- the synced design system.

Anything marked REFERENCE is data, not a proposal. No `docs/current/` section is named: experience and
frontend there are STALE, and P28's `## Doc impact` and the code win.

## Product context

- **What knowledge is.** A hosted knowledge base. Coding agents publish documents, mostly explainers
  about a codebase, into an org's library, which is read on the web and over MCP. P29 and P30 turn it
  into a **personal learning library that reads like an e-book**: books of ordered chapters, for
  anything the operator studies (AI, English, Finance, …), with codebase knowledge first-class.
- **Who reads.** The operator, a solo developer, reading their own books on iPhone, iPad and a Mac, in
  long sessions, coming back days later; and anyone reading a public book while signed out.
- **Where this job sits.** Inside a chapter, in the **signed reader**. A native chapter is Markdown plus
  callouts and six typed blocks (S2): `figure`, `figures`, `diagram`, `svg`, `quiz` and `sources`. The
  reader drew the prose kit; wave 2 draws what goes inside a chapter beyond it.
- **This job: images and the blocks around them.** Today's 41 explainers hold no `<img>` at all, and the
  operator asked for "image available, multi column image or diagram input also possible". This job
  draws how a chapter shows an image, a row of two or three items side by side, a hand-drawn SVG, and a
  list of sources with the citations that point at it.

## The operator's bar

From `docs/reference/design/bar.md`, verbatim:

1. **The state bar scrolls away with the page; it is never pinned.** Its size may stay as the page's
   presets need.
   - "prototype state too big. which is fine. but just make it doesn't follow scroll." The operator,
     2026-10-19, at PENDING #1 of `01-reader/01-reader` (P29.S4). Source:
     `jobs/01-reader/rounds/01-reader/feedback.md`.
   - Made a rule for every canvas the same day. Asked "Should this apply to every canvas from now on
     (waves 2 and 3 too)? If yes, I'll add it to your standing design rules so you don't have to
     repeat it.", the operator answered "ok".

The shipped bar (the drafter's *working canvas*, *state bar* and *craft* sections) binds as before.

## The signed reader: locked, and this job's frame

- **Signed on 2026-10-20:** job `01-reader`, round `02-revise`, on the operator's words "everything
  looks good. moveon". Canvas https://claude.ai/artifact/MRzppHqkh5aCqpkBa8QCVY, reviewed at
  `1792405111-eccf`. **Every element of it is locked.**
- **REFERENCE, read as data:**
  - the snapshot `docs/reference/design/jobs/01-reader/rounds/02-revise/canvas/project/` (31 boards:
    the flow, the widths board, the stand-ins, Foundations, the components and their mounted parts);
  - its `build-prompt.md`, the implementation contract, complete on its own;
  - its `result.md`, for the measured contrast and the departures.
- **What this job draws in and never re-litigates** (each detailed in the build prompt):
  - **the faces:** Literata with Noto Serif KR for reading; Fraunces with Noto Serif KR for display;
    Source Sans 3 with Pretendard for the interface (captions included); JetBrains Mono, ligatures off;
  - **one 36rem column** (`--rd-measure`) for text, tables, code, drawings and the diagram slot. The
    article grid is `[full-start] minmax(gut, 1fr) [text-start] min(100% − 2·gut, measure) [text-end]
    minmax(gut, 1fr) [full-end]`, and every signed block sits in `text`. Wider content scrolls in its
    own box, with the scroll fades (§9a);
  - **five text sizes** (`--rd-fs` / `--rd-k`: 15, 16.5, 18 (the default), 20 and 22 px), leading 1.65,
    and the column's small step `--rd-fs-s` (`× 0.8333`). The interface keeps its fixed 13 and 15 px
    steps and the 11 px mono label;
  - **themes:** System, Light, Dark and Sepia. Light and dark are the system's values; sepia is
    reader-scoped (build prompt → *Themes*);
  - **the reader's own chrome** (no app shell, English-only chrome copy), which hides on scroll;
  - **the sheets** (§15) and the **stand-ins** for other jobs' screens (board 04, `Elsewhere.dc.html`:
    Book page, Library, Sign in, Legacy reader and External link);
  - **links** and the "missing link" style (build prompt → *Wiring* and the prose kit, §6);
  - **Hangul runs** inside other-language text, wrapped in `lang="ko"` (§6a).
- **How to use it on this canvas.** To show this job's blocks in a chapter, copy what you need from the
  snapshot into this job's tree, **unchanged in look and behaviour** (`reader.css`, the parts, the
  stand-ins). Extend the canvas-only machinery (`reader.js`, `flow.js`) only so it renders this job's
  blocks. List every copied file in `result.md`. Never write to the snapshot.
- **A change to a signed element is not this job's to make.** If one seems needed, leave the element as
  signed, log the need as a departure and an open question, and the operator decides.

## Scope

### This job: figures and sources, one surface

Everything here is drawn at phone, iPad and desktop, in **light, dark and sepia**, inside a chapter in
the signed reader. Where the text size changes a layout (a row of items, a long caption), show sizes 1,
3 and 5.

1. **The `figure` block** (S2): `src` (an asset **name**, raster only), `alt` (required, non-empty),
   `caption` (inline Markdown, required), `credit?` and `width?: column | wide`.
   - the image **loaded**, **loading** and **missing** (the asset fails to load);
   - `column` and `wide` (open question 1);
   - the caption with inline Markdown (a link, inline code, emphasis) and the credit.
2. **A plain Markdown image,** `![alt](asset:name)`, inside prose.
3. **The `figures` row** (S2): an optional row `caption` (inline Markdown) and **2–3 items**, each one
   of:
   - `{image: <asset name>, alt, caption?}`;
   - `{diagram: <diagram body>, caption?}`;
   - `{svg: <svg source>, label, caption?}`;
   - `{card: {title, body (md), tone?}}`, a side-by-side text card.

   The items sit **side by side at tablet and desktop width and stack on a phone** (S2). The figure row
   is CSS only, with no client script (S2 *Render model*).
4. **The `svg` block** (S2): one `<svg>` plus `label` (required: the text alternative) and an optional
   `caption`. It is drawn only in `none` and `currentColor`, plus the tone classes `kb-fill-<tone>` and
   `kb-stroke-<tone>`; strokes use `vector-effect: non-scaling-stroke`; its text uses the reader's
   faces. The full allowlist is in `phase.md` → S2 *Custom SVG*; samples must stay inside it.
5. **The `sources` block** (S2), ```` ```sources #sources ````, with `items[{id, title, url, publisher?,
   date?, accessed?, note?}]`, and **inline citations**: ordinary links to `#<source id>` in the prose.

**Sizing.** One surface: about 5 Pages or fewer, plus their components. `design-check` warns past 6
Pages or 16 boards. How the Pages divide the states is your call.

### The sibling jobs, drafting beside you (wave 2, P29.S5)

Each writes only its own folder under `docs/reference/design/jobs/`. You may read a sibling's tree; it
is a draft in progress, not signed.

- **`03-diagrams`** (critic+judge): the `diagram` block's six kinds and **the tone palette**.
- **`04-quiz`** (critic): the quiz block (choice, recall, cloze), its saved answers, and signed-out use.
- **`05-annotations`** (critic): bookmarks, highlights, notes, "Review this", the chapter's annotation
  panel and the per-book list.

**Where this job meets them:**
- **The tones** (`default`, `muted`, `accent`, `ok`, `warn`, `bad`, `store`, `series-1` … `series-6`) are
  one palette, and **`03-diagrams` owns it**. This job uses the same names for the `svg` classes and a
  card's `tone`. When `03-diagrams`' tree has its values, take them and say so. Otherwise state
  provisional values in `result.md`, marked **provisional, pending `03-diagrams`**.
- **A row's diagram item** shows the `diagrams` job's look (`phase.md` → *What each job draws*). If
  `03-diagrams`' tree has a finished diagram when you build the row, mirror it read-only and name the
  file. Otherwise draw the item as a canvas-only stand-in that names `03-diagrams` and shows the
  diagram's title and caption. The reader's own grey dashed `.rd-dgm` box is the precedent, and it is
  never built.
- **Annotation controls** (bookmark, highlight, note) on a figure are `05-annotations`'. Draw none.

Say in `result.md` what you assumed at each seam. The critic compares the wave's jobs, and a conflict
between two jobs reaches the operator as a wave choice.

### Not this job

- **`03-diagrams`:** the `diagram` block itself, in the column and in its six kinds.
- **`04-quiz`:** quiz blocks.
- **`05-annotations`:** every bookmark, highlight and note control.
- **The reader (signed):** the chrome, the prose kit, tables, code and the sheets, used as signed.
- **Wave 3 (P29.S6):** `library`, `book-page`, `review`, and `legacy-and-print` (the legacy reader and
  every print sheet: a figure row in print, diagrams and SVG in print).
- **The console, auth, graph and landing** stay unchanged.

## Screens × states

**Prototype first.** Every state below must be reachable on an interactive Page: by a click or, where
no click reaches it, by that page's state bar.

Each state carries a one-line check the critic holds it to. Every state is drawn at phone (390×844),
iPad (820×1180) and desktop (1440×900), in light, dark and sepia; add iPad landscape (1024×768) where
the layout changes there. The critic checks all three themes.

### The figure

- **A column figure, loaded:** a screenshot, with a caption carrying a link and inline code, and a
  credit. Check: the image, caption and credit read as one figure; the caption is never mistaken for
  body text, and the credit reads as a credit.
- **A wide figure (`width: wide`).** Check: it follows your answer to open question 1, stated in
  `build-prompt.md`; the text around it keeps the signed column's edges, and the page never scrolls
  sideways at any width.
- **Loading.** Check: the figure holds its place, so the text below does not jump when the image
  arrives (open question 3), and nothing animates under reduced motion.
- **Missing** (the asset fails to load). Check: the figure still says what it showed, its alt text in
  the image's place, and keeps its caption; nothing looks broken or empty.
- **A tall portrait image** (a phone screenshot, about 1170×2532). Check: it is never cropped or
  stretched, and the most it may grow is stated in `build-prompt.md`.
- **A wide, short image** (a 3:1 chart). Check: never cropped or stretched, at 390 included.
- **A small image** (narrower than the column, about 240 px). Check: its size rule is stated, and it is
  never blurred by scaling up.
- **A light screenshot in dark and sepia.** Check: in each theme it reads as an image with a visible
  edge, and what the theme does to it, if anything, is stated (open question 5).
- **A transparent PNG** (dark lines on no ground). Check: it is legible in light, dark and sepia.
- **A long caption** (four lines or more at 390) **and a Korean caption** in the KO variant. Check: the
  Korean keeps `keep-all` and never breaks mid-word; Hangul renders in the signed faces.
- **A caption with an inline citation.** Check: it goes to that item in the sources list.
- **An animated GIF.** Check: what it does under `prefers-reduced-motion` is stated (open question 6).

### The plain Markdown image

- **`![alt](asset:name)` in a paragraph.** Check: it renders as an image with its alt, without a
  caption; what sets it apart from a `figure` is stated; the page never scrolls sideways.

### The figure row

- **Two images,** each with a caption, and a row caption. Check: side by side at 820 and 1440, stacked
  at 390; each item keeps its caption, and the row caption reads as the whole row's.
- **Three mixed items: an image, an `svg` and a card.** Check: they read as one row at 820 and 1440,
  nothing overflows the row, and the stacking point is stated (open question 2).
- **A row with a diagram item** (the seam above). Check: the diagram's title stays its text
  alternative, and a stand-in never pretends to be the diagram's design.
- **Cards in every tone.** Check: a card's title says what it is, so its tone is never the only signal,
  and its text measures at least 4.5:1 in every tone, in all three themes.
- **Items of unequal height** (a tall image beside a short card). Check: the row stays orderly and
  nothing is clipped.
- **Stacked on a phone.** Check: the items keep their order, each keeps its own caption, and the row
  caption is still read as the row's.
- **Text size 5 at 820, a three-item row with cards.** Check: no sideways scroll, and no card text
  clipped or broken mid-word.

### The `svg` block

- **A UI mock and a 2×2 matrix,** drawn as SVG (the corpus has 4 UI mocks and 3 matrices; S2 sends
  anything outside the six diagram kinds to `svg`). Check: only `currentColor` and tone classes colour
  it; it is legible in all three themes; hairlines stay hairlines at every width.
- **Its text alternative.** Check: `label` is the figure's accessible name, and the caption shows when
  there is one.
- **Korean labels in the SVG.** Check: Hangul renders and is never clipped.
- **A wide SVG at 390.** Check: its labels stay legible, or the stated rule for narrow screens applies
  (open question 2's answer may cover it).

### The sources list and citations

- **A sources list in a subject chapter,** 6–10 items, using every field (`publisher`, `date`,
  `accessed`, `note`) and some with only `title` and `url`. Check: each item shows its fields in one
  stated order, and every URL reads as text and opens the in-canvas note (*Every link*).
- **Inline citations in the prose,** one source cited more than once. Check: each citation goes to its
  item, and how the reader gets back to where they were is stated (open question 7).
- **A long URL** (120 characters). Check: it wraps inside the column, and the page never scrolls
  sideways.
- **A Korean source title** in the KO variant. Check: `keep-all` holds, with no overflow at 390.

### In the chapter

- **A codebase chapter carrying the figures,** read in the signed reader at 390, 820 and 1440. Check:
  the reader's chrome, column, sizes and themes are exactly as signed; only this job's blocks are new.

## Every link and where it goes

Every link stays in the prototype: `design-check` fails `check=leaves-canvas` on an absolute URL.

- **An inline citation** (`#<source id>`) goes to its item in the sources list, on the same Page.
- **A source's URL** is drawn as one, but opens an in-canvas note naming where it would go, like the
  reader's External link stand-in. Never an absolute URL.
- **Links in captions and card bodies** follow the reader's link rules (build prompt → *Wiring*): `#id`
  in the chapter, `chapter:` and `doc:` to a stand-in or a chapter state of this canvas, an unresolvable
  target in the "missing link" style.
- **The reader's chrome** keeps its signed targets: back to the book, the library, sign in and a legacy
  chapter go to the copied stand-ins.

## Data

The design record is committed to this **public** repo, so whatever the canvas shows becomes public
(`phase.md` → `## Decisions` → *Canvas content rule*).

### The chapters

- **A codebase chapter** in the `knowledge` / `maintainer-guide` book: chapter 3, "Knowledge's Read
  Surfaces: Two Front Ends, One Corpus", the real title, with its KO variant for the Korean states. Its
  body is written for the canvas, on the chapter's real subject. For subject matter, read it with
  `git show origin/main:docs/knowledge/2026-08-08-knowledge-s-read-surfaces-two-front-ends-one-corpus.html`
  (read only; never pull or merge). The real chapters hold side-by-side rows (`.two`, `.planes`,
  `.doors`) worth redrawing as `figures`.
- **A subject chapter** in an invented subject book (AI, English or Finance) carrying the sources list,
  since `/explain`'s general mode requires one (S2).

### Images

- **Made for the canvas,** as raster files (`png`, `jpeg`, `webp` or `gif`, S1's formats) under
  `jobs/02-figures/canvas/project/assets/`, linked by relative path. Keep them small; the product's
  limit is 2 MB per image.
- **Ways to make them:** screenshots of the signed reader's snapshot rendered locally with
  `design-preview` (its content is invented or the maintainer guide's), charts drawn locally and
  rasterized (`magick`, `rsvg-convert` and `sips` are installed), and anything else generated on this
  machine.
- **An image you cannot make realistically** (a photograph) is drawn as what it is: a visible,
  labelled placeholder, such as `[PHOTO: a whiteboard sketch]`. Never pass a grey box off as content.
- **Never** a screenshot showing a real project, document or org other than the `knowledge` maintainer
  guide, and **never** `.github/knowledge-graph.png` or the P28 diagnostics screenshots: they may show
  real project names.

### Sources

- **A real publication** is cited only when every field is exact: title, publisher, date and URL. The
  research slices cite real ones you can state exactly (`works/phases/active/P29/slices/P29.S3/result.md`
  → *Sources*, for example the FSRS and W3C Web Annotation references).
- Otherwise write sources for the canvas that read as samples, never as real publications with made-up
  details.

### Copy

- **The system README's content rules:** sentence case, no exclamation marks, no emoji, "…" for
  pending, "→" on links that move you on.
- **The contract's fields are fixed:** `alt`, `caption`, `credit`, `label`, the source fields.
- **Other copy** (a missing image's words, a citation's form, any label) is yours, in English for
  chrome; log every string in `build-prompt.md`.

### Edge cases

- a tall image, a wide one, a small one, a transparent one, an animated GIF;
- a four-line caption, a Korean caption, a caption with a link and inline code;
- a row of 3 with unequal heights; a row at text size 5;
- a 120-character URL; a source cited three times; a Korean source title.

### Never on the canvas

- glide-ilab or base material;
- arb_upbit_1's strategy content;
- secrets, keys, emails or any personal data.

A signed-in reader is an invented name with no email.

## The system inventory

- **Title: `knowledge`**, as the Design System Artifact shows it. Copy it into `canvas.json`'s
  `designSystems` record, pinned at the version below.
  - Namespace: `kb`.
  - Artifact: https://claude.ai/artifact/7qemgwHNsoPNf5kYHEJ4md, version `1792321604-e214`
    (`design.json`).
  - On 2026-10-20 the system's files were read back, and they are byte-identical to the cache. The newer
    version id the system shows is the app saving on open.
- **Cached at `jobs/02-figures/canvas/project/ds/kb/`:** `tokens.css`, `tokens.json`, `README.md` and
  `fonts/` (Fraunces, Source Sans 3, JetBrains Mono). Read the README first: its colour, type, layout,
  states and content rules bind.
- **Components: none.** No bundle ships, so there is no `x-import`. Every component this job needs is a
  **component gap**: draw it as markup on its own board and log it.
- **The reader's values** (Literata, Noto Serif KR, the five sizes, sepia, the reader's motion and
  chrome tokens) are reader-scoped on the canvas, in the snapshot's `reader.css`. They are not in the
  system yet (build prompt → *Values P30 adds to the code*, items 1–8).
- **Known gaps this job meets:**
  - **No tone tokens.** The system has status roles (`kb-status-*`) but no diagram or SVG tones; the
    palette is `03-diagrams`' (*The sibling jobs*).
  - **No image treatment** in the system: no figure, caption or credit style beyond the prose kit's.
  - **No Hangul face in the system cache.** The canvas loads Noto Serif KR from Google Fonts CSS, as
    the reader does, and the interface falls back to the system Hangul fonts.

## Constraints

- **Viewports** (from `## Operator Runtime`): phone 390×844; iPad 820×1180 portrait and 1024×768
  landscape; desktop 1280–1440 wide, with 1440×900 as the reference.
- **Devices:** iPhone and iPad in Safari and Chrome, and Mac Chrome. Respect the safe areas
  (`env(safe-area-inset-*)`).
- **The render model (S2):** the server renders every block; only the quiz is a client island, and the
  figure row is CSS only. No iframe, no raw HTML, no `innerHTML`. Images load from the app's own asset
  relay (same origin, raster only). **No JS widgets** in v1 (Q4's working assumption).
- **Continuous scroll, one fixed column,** with no width setting: the operator's "good. but fixed
  column width."
- **Theme:** follows System by default for every reader, signed-out readers included. Settings are per
  device.
- **The accessibility floor:**
  - text ≥ 4.5:1, and large text and UI ≥ 3:1, in every theme, measured;
  - `kb-hint` never used for body text;
  - the system's focus ring (`kb-focus-w` in `kb-accent`);
  - targets of at least 44 px (`kb-tap`) below 40rem;
  - a state, a type or a tone never shown by colour alone;
  - `prefers-reduced-motion` respected;
  - every control operable by keyboard;
  - every image has its alt text, every SVG its label.
- **Korean (S2):** under `:lang(ko)`, `word-break: keep-all; overflow-wrap: anywhere; line-break:
  strict`, with a Hangul face before the generic fallback; Hangul runs inside English are wrapped in
  `lang="ko"` (§6a).
- **Layout:** the system's breakpoints (40, 64 and 90rem), measured on the reader root `rd`. The page
  never scrolls sideways at any width.
- **No icon set and no emoji** (README). Use words and the text marks `·`, `…` and `→`.

## Locked vs. in play

### Locked

- **The signed reader,** whole (above).
- **The data contracts** (`phase.md` → `## Decisions`, S1–S3): the block fields, the 2–3 items of a
  row, stacking on a phone, the SVG allowlist and its colour rule, the source fields, citations as
  `#id` links, raster-only assets, the render model.
- **The system's structure and brand spirit:** "A calm editorial library: warm paper, charcoal ink, one
  deep teal, and hairlines instead of boxes"; one interactive accent; no icon set.
- **The copy rules and the accessibility floor.**

### In play

- **How a figure, its caption and its credit look**, in three themes.
- **How `wide` works**, within the locked column (open question 1).
- **The figure row's layout,** its gaps and its stacking point.
- **The card,** and the `svg` block's frame.
- **The sources list and the citation's form.**
- **The loading and missing states.**

A value that would change the app's own light or dark tokens outside the reader is logged as a proposed
system change in `result.md` and `build-prompt.md`, never applied silently.

## Collected taste

### The operator's answers to the three taste questions

Asked at P29.S4's opening, on 2026-10-18, quoted literally:

1. The mood wanted for long reading: **"good."**
2. Readers they like (Apple Books, Kindle, Readwise Reader, iA Writer, anything else): **"kindle
   like"**
3. Anything to avoid: **"non"**

**How they read against the record** (the orchestrator's note, not the operator's words): "good." names
no new mood; "kindle like" makes Kindle the one reference for the reading feel, without reopening
continuous scroll or the one fixed column; "non" names nothing to avoid.

### This phase's own words

From `intent.md`, 2026-10-17, verbatim:
- "I want it to be work like E book reader."
- "I want more refined diagrams, mobile, ipad friendly, image available, multi column image or diagram
  input also possible, and more quizs available etc.."
- "good. but fixed column width."

### The reader rounds' words (P29.S4)

- Round 01's feedback, 2026-10-19 (`jobs/01-reader/rounds/01-reader/feedback.md`), the item that bears
  on this job: "make the tables, and text bodies got same width. wide table scroll on mobile is fine."
- Round 01's taste notes (Literata as a fourth face, edge-to-edge bars, near-identical callout grounds)
  were not taken up, so they stay as drawn. Round 02's (the list titles' face, the fixed 2ch hang,
  "Started", the three bars on page 03) were signed as drawn.
- The sign-off, 2026-10-20: "everything looks good. moveon".

### Earlier words

Design memory under `web/design/rounds/`, read only:
- 2026-09-21, `04-console-surfaces/handoff.md:57-58`: "need mobile, tablet, and pc view upgrade".
- 2026-09-21, `06-document-views/SIGNOFF.md:35-36`: every open question in round 06 was answered "decide
  for me". This job still logs its calls as open questions.
- 2026-07-18, `01-landing/SIGNOFF.md:8-17`, a design session's summary that the operator relayed: "It
  extends the calm editorial library (teal-only, warm paper/charcoal, Fraunces/Source Sans/JetBrains
  Mono); no new brand."

### The established look

- The system's character, from its README's opening: "A calm editorial library: warm paper, charcoal
  ink, one deep teal, and hairlines instead of boxes. … Draw every surface as if it were a well-set page
  first and an app second."
- **The signed reader** is now the established look inside a chapter.

## Direction

- **`new visual direction: no`** (the line at the top): this job extends the signed reader and the
  system. From the confirmed intent: "P27's design system went live with P28 and is the starting point,
  not something to replace wholesale. Reader typography and themes are in play." (`intent.md`).
- **One direction.** The operator asked for no options. Draw one, and log the open calls.

## Open questions, posed back

Draw your own answer to each, in the one direction, and log it under `open_questions` for the operator.
Only the operator's words settle them.

1. **What `width: wide` means in a one-column reader.** S2 gives a figure `width?: column | wide`. The
   signed reader has one 36rem column for "text, tables, code, drawings and the diagram slot", with no
   wider track; the operator asked "make the tables, and text bodies got same width", and round 02
   removed the wide lane. A wider figure is what `wide` exists for; one edge for every block is what the
   operator asked of tables and code. Draw your answer and give both sides.
2. **A row of three inside 36rem.** At 820 and 1440 the column is 576 px, so three items get about
   180 px each. Whether a row stays in the column, breaks out of it, or stacks earlier is your call,
   flagged. It meets question 1.
3. **An image's size before it loads.** S1's asset map records a name and a hash, with no width or
   height, so the page cannot know an image's proportions until it loads. Draw the loading state, and
   say in `build-prompt.md` whether it needs the dimensions. If it does, recording them at ingest is an
   additive contract change for P30, which the operator decides.
4. **Opening an image larger.** No contract line covers tapping an image to see it bigger, such as a
   screenshot's small text on a phone. Draw your answer (none, or a viewer), flagged. A viewer is new
   scope, which the operator decides.
5. **Images in dark and sepia.** Whether the reader changes an image in dark or sepia (dimming, a ground
   behind a transparent image, an edge) is your call, flagged.
6. **An animated GIF under reduced motion.** S1 allows GIF. Draw what reduced motion does to it,
   flagged.
7. **Citations and the way back.** The citation's form (a number, a name, a plain link) and how a reader
   returns from a source to the passage they were reading are not in the contract. Draw your answer,
   flagged.

## Paths

- **Runtime:**
  `/private/tmp/claude-502/-Users-sugang-projects-personal-knowledge/f0010d83-1939-47da-8f62-5ffe37557260/scratchpad/artifact-files/616edd17-d700-40dc-a431-4a41316002a3/artifact-type/dc-runtime.js`
- **Type references:**
  `/private/tmp/claude-502/-Users-sugang-projects-personal-knowledge/f0010d83-1939-47da-8f62-5ffe37557260/scratchpad/artifact-files/616edd17-d700-40dc-a431-4a41316002a3/`,
  holding `SKILL.md` and
  `artifact-type/reference/{format,craft,design-system-components,view-state,diagrams}.md`
- **System namespace:** `kb`

## Required output

- **The canvas tree** under `jobs/02-figures/canvas/project/`, passing `design-check 02-figures`.
- **`rounds/01-figures/result.md`**, holding:
  - the intent lines and the plan;
  - what was designed;
  - the data used, every image and how it was made;
  - every file copied from the signed reader;
  - what you assumed at each seam with `03-diagrams` and `05-annotations`;
  - every departure from this handoff;
  - the open questions;
  - the component gaps;
  - the measured contrast of every text and tone colour you add, in light, dark and sepia.
- **`rounds/01-figures/build-prompt.md`**, complete enough to build from without inventing anything:
  - the figure, its caption and credit, `column` and `wide`, loading and missing;
  - the plain Markdown image;
  - the figure row: its layout at each width, its stacking point, each item type, the card and its
    tones;
  - the `svg` block's frame and the tone classes it uses;
  - the sources list and the citation;
  - every state above, and every string you wrote.

  The state bar and every stand-in are canvas-only, never something to build.
