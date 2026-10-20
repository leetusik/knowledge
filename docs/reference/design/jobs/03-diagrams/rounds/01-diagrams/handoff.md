# Handoff — job `03-diagrams`, round `01-diagrams` (slice P29.S5)

new visual direction: no

critique: critic+judge

This is the drafter's whole brief and the critic's yardstick for this job's first round. The
orchestrator wrote it on 2026-10-20 from the record:
- the P29 contracts (`works/phases/active/P29/phase.md` → `## Decisions`), chiefly S2 *Diagram*,
  *Custom SVG* (the tone classes), *Ids*, *Render model* and *Print*;
- the signed reader (`## Decisions` → *The signed reader*, and the signed round
  `jobs/01-reader/rounds/02-revise/`, chiefly its build prompt's §8a, the diagram slot);
- the S2 survey of today's figures (`works/phases/active/P29/slices/P29.S2/result.md` → §1.3 and Q3);
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
  reader drew the prose kit and left a slot for the `diagram` block; wave 2 draws what goes inside a
  chapter beyond the prose kit.
- **This job: the `diagram` block, the operator's headline ask.** "I want more refined diagrams" is the
  first thing the operator asked for in this phase. Today's explainers draw their figures by hand: 126
  figures in 37 documents, 59 inline SVGs of which 35 hard-code their colours, and about 30 figures with
  Korean text inside. S2 replaces them with six declarative kinds, laid out from data and coloured only
  by tones, so light, dark, sepia and print all apply.
- **Why it is `critic+judge`:** a wrong call here is costly, because every native chapter's drawings
  use it, and P30 builds a renderer from this job's build prompt.

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
- **The diagram slot (build prompt §8a), locked:** the reader builds a `<figure>` in the text column,
  at the column's width, with `lg×k` space above it like a code block, carrying the block's `id`. The
  `title` is the figure's accessible name and the `caption` its `<figcaption>`, rendered inline like
  prose, with Hangul runs wrapped (§6a). **Everything else is this job's:** the size, the drawing, and
  how the title and caption show. The canvas's grey dashed `.rd-dgm` stand-in ("Canvas only · diagram
  stand-in · the diagrams job (P29.S5)") is never built; this job's diagram takes its place.
- **What this job draws in and never re-litigates** (each detailed in the build prompt):
  - **the faces:** Literata with Noto Serif KR for reading; Fraunces with Noto Serif KR for display;
    Source Sans 3 with Pretendard for the interface; JetBrains Mono, ligatures off;
  - **one 36rem column** (`--rd-measure`) for text, tables, code, drawings and the diagram slot, with no
    wider track. Wider content scrolls in its own box, with the scroll fades (§9a);
  - **five text sizes** (`--rd-fs` / `--rd-k`: 15, 16.5, 18 (the default), 20 and 22 px), leading 1.65,
    and the column's small step `--rd-fs-s` (`× 0.8333`). The interface keeps its fixed 13 and 15 px
    steps and the 11 px mono label;
  - **themes:** System, Light, Dark and Sepia. Light and dark are the system's values; sepia is
    reader-scoped (build prompt → *Themes*, which lists every sepia value);
  - **the reader's own chrome** (no app shell, English-only chrome copy), which hides on scroll;
  - **the stand-ins** for other jobs' screens (board 04, `Elsewhere.dc.html`);
  - **Hangul runs** inside other-language text, wrapped in `lang="ko"` (§6a).
- **How to use it on this canvas.** To show diagrams in a chapter, copy what you need from the snapshot
  into this job's tree, **unchanged in look and behaviour** (`reader.css`, the parts, the stand-ins).
  Extend the canvas-only machinery (`reader.js`, `flow.js`) only so it renders this job's blocks. List
  every copied file in `result.md`. Never write to the snapshot.
- **A change to a signed element is not this job's to make.** If one seems needed, leave the element as
  signed, log the need as a departure and an open question, and the operator decides.

## Scope

### This job: the `diagram` block, one surface

Everything here is drawn at phone, iPad and desktop, in **light, dark and sepia**, inside a chapter in
the signed reader. Where the text size changes a drawing, show sizes 1, 3 and 5.

1. **The block in the reader's slot** (§8a): ```` ```diagram #id ```` with `kind`, `title` (required:
   the short text alternative) and `caption?` (inline Markdown). It replaces the stand-in in the reader's
   sample chapter.
2. **The six kinds, with every feature of each schema** (S2, quoted from `phase.md`):
   - **`flow`:** `nodes[{id, label, sub?, at?: [row, col], shape?: box | pill | store | entity,
     fields?[], tone?}]`, `groups?[{id, label, nodes[]}]` (lanes and layers), `edges[{from, to, label?,
     style?: solid | dashed, tone?}]`, `direction?: down | right`. The author places nodes on a grid
     (`at`); with no `at`, nodes flow in `direction`. Edges are routed orthogonally. It covers
     pipelines, loops, funnels, architecture maps and entity diagrams (`shape: entity` with `fields`);
   - **`state`:** `flow`'s grid layout, plus `initial`, `final` and labelled transitions;
   - **`sequence`:** `actors[{id, label}]` and `steps[{from, to, label, style?, note?}]`: one column per
     actor and one row per step;
   - **`stack`:** `layers[{label, items?[], tone?}]` and `nested?: bool`: fixed rows;
   - **`timeline`:** `axis{unit, from, to, ticks?}` and `lanes[{label, bars[{from, to, label?, tone?}],
     marks?[{at, label}]}]`: fixed rows on a scaled axis;
   - **`chart`:** `type: bar | line | interval`, `x{label, categories? | numeric}`, `y{label, min?,
     max?}`, `series[{name, values[], tone?}]` and `rules?[{at, label}]` (threshold or mean lines).

   "None needs a general graph-layout engine" (S2): layout comes from the data, the grid and fixed rows.
3. **The tones,** one palette: `default`, `muted`, `accent`, `ok`, `warn`, `bad`, `store`, and
   `series-1` … `series-6`, mapped to design-system tokens, in light, dark and sepia, **plus print**
   (S2 *Print*: "diagrams and SVG print with the light tokens"). **This job owns the palette.** The
   `svg` block's classes `kb-fill-<tone>` and `kb-stroke-<tone>` (S2 *Custom SVG*) and a figure row
   card's `tone` use the same names, so the build prompt defines the classes too.
4. **Korean labels:** every label may be Korean (S2), including the KO variant of the reader's sample
   diagram.
5. **The limits:** 60 nodes, 100 edges, 12 lanes and 200 data points (S2). Draw at least one diagram
   near them.
6. **The widest case on a phone:** whether a diagram wider than the column scales or scrolls is your
   call, flagged for the operator (open question 1).
7. **The text alternative:** the title and the caption, as the slot carries them, and what assistive
   technology reads of the drawing itself (open question 4).

**Sizing.** One surface: about 5 Pages or fewer, plus their components. `design-check` warns past 6
Pages or 16 boards. With six kinds and thirteen tones, a Page per kind is too many: group them, and let
component boards carry each kind's states. How the Pages divide the work is your call.

### The sibling jobs, drafting beside you (wave 2, P29.S5)

Each writes only its own folder under `docs/reference/design/jobs/`. You may read a sibling's tree; it
is a draft in progress, not signed.

- **`02-figures`** (critic): `figure`, the `figures` row, the `svg` block, `sources` and citations.
- **`04-quiz`** (critic): the quiz block.
- **`05-annotations`** (critic): bookmarks, highlights, notes, "Review this", the annotation panel and
  the per-book list.

**Where this job meets them:**
- **The tones:** `02-figures` uses your tone names for its `svg` classes and its cards, and takes your
  values once your tree has them. Put the palette where a sibling can read it early (a Foundations or
  tokens board, and a CSS file in your tree), and name the file in `result.md`.
- **A figure row's diagram item:** `02-figures` draws the row, a third or a half of the column wide, and
  its diagram item shows your look. Say how a diagram renders at that width (open question 5).
- **Annotation controls** on a diagram are `05-annotations`'. Draw none.

The critic compares the wave's jobs, and a conflict between two jobs reaches the operator as a wave
choice.

### Not this job

- **`02-figures`:** the `svg` block, the figure row and its cards, images.
- **`04-quiz`:** quiz blocks.
- **`05-annotations`:** every bookmark, highlight and note control.
- **The reader (signed):** the chrome, the prose kit and the slot, used as signed.
- **Wave 3 (P29.S6):** `library`, `book-page`, `review`, and `legacy-and-print`, which draws every print
  sheet. This job supplies the tones' print values; that job draws the sheet.
- **Interactive diagrams:** the server renders every block, and only the quiz is a client island (S2
  *Render model*); no JS widgets in v1 (Q4's working assumption).
- **The console, auth, graph and landing** stay unchanged.

## Screens × states

**Prototype first.** Every state below must be reachable on an interactive Page: by a click or, where
no click reaches it, by that page's state bar.

Each state carries a one-line check the critic holds it to. Every state is drawn at phone (390×844),
iPad (820×1180) and desktop (1440×900), in light, dark and sepia; add iPad landscape (1024×768) where a
drawing changes there. The critic checks all three themes.

### In the reader

- **The sample chapter's diagram,** "One FastAPI process, two planes", in place of the stand-in, in EN
  v2, EN v1 and KO v1 ("FastAPI 프로세스 하나, 평면 둘"). Check: the stand-in is gone; the reader's chrome,
  column and spacing around the slot are exactly as signed; the title and caption read as the
  diagram's.
- **A diagram with no caption.** Check: the figure closes up with no empty gap where the caption would
  be.
- **The diagram at text sizes 1, 3 and 5.** Check: the drawing follows your answer to open question 2,
  stated in `build-prompt.md`, and nothing clips or overlaps at any size.

### `flow`

- **A pipeline** (`direction: right`), with labelled edges. Check: every edge reads from its source to
  its target, and every label sits on its own edge.
- **A loop:** an edge that returns to an earlier node. Check: the way back is unmistakable and crosses
  no node.
- **Groups, as lanes and as layers.** Check: a node's group is clear from its position and the group's
  label, never from colour alone.
- **Every shape:** `box`, `pill`, `store`, and `entity` with `fields` (an ER diagram of several tables).
  Check: each shape is distinct in form, never by colour alone, and an entity's fields stay legible.
- **`sub` lines and long labels,** in English and in Korean. Check: a label wraps inside its node and
  never overflows it; Korean keeps `keep-all`.
- **Dashed and toned edges.** Check: solid and dashed stay distinct at every width, and an edge's tone
  is never its only meaning.
- **No `at`** (auto-flow in `direction: down`). Check: the drawing is as orderly as a placed one.
- **Near the limits:** an architecture map of 40–60 nodes. Check: at 1440 it is legible; at 390 your
  answer to open question 1 applies.

### `state`

- **States with `initial` and `final`, and labelled transitions,** including a transition back to an
  earlier state. Check: the start and the end are unmistakable, and every transition reads in its
  direction with its label.
- **A transition from a state to itself** (`from` = `to`). Check: drawn, or `build-prompt.md` says
  ingest rejects it (open question 6).

### `sequence`

- **Actors and steps,** with a dashed reply and a `note`. Check: the order reads top to bottom, each
  step's direction is unmistakable, and a note reads as a note, not a step.
- **A step from an actor to itself.** Check: drawn, or `build-prompt.md` says ingest rejects it (open
  question 6).
- **Six actors at 390.** Check: your answer to open question 1 applies, and no label is clipped.

### `stack`

- **Plain layers with items and tones.** Check: the order is clear, and each layer's items read as its
  own.
- **Nested (`nested: true`).** Check: what holds what is unmistakable, at 390 included.

### `timeline`

- **Several lanes,** with labelled bars and marks, on a scaled axis with ticks. Check: each bar's start
  and end can be read against the axis, and a mark reads as a moment, not a bar.
- **A short bar whose label does not fit in it,** and **overlapping bars in one lane.** Check: every
  label stays legible and attached to its bar.

### `chart`

- **`bar`,** one series and several (grouped), with a `rules` threshold line. Check: each value can be
  read against the axis; the rule's label is legible; the series are named, never told apart by colour
  alone.
- **`line`,** several series over a numeric `x`, with a `rules` mean line. Check: each line is
  identified by its name, never by colour alone.
- **`interval`.** Check: each interval's ends can be read against the axis, and the value shape you
  drew is stated (open question 3).
- **Negative values** (`y.min` below 0) **and long category labels.** Check: the zero line is clear, and
  no category label overlaps another.
- **200 points** on one line chart. Check: legible at 1440, and at 390 your answer to open question 1
  applies.

### The tones

- **Every tone,** as a node fill, a stroke, an edge, a bar and a line, in light, dark and sepia. Check:
  text on any tone measures at least 4.5:1, and every tone measures at least 3:1 against the page and
  against the diagram's ground, in all three themes, measured and recorded in `result.md`.
- **The print values** (light). Check: stated in `build-prompt.md` for every tone; how they look on a
  page is shown on a board (wave 3 draws the print sheet itself).
- **Dark and sepia.** Check: no tone glows or disappears against the dark or sepia ground.

### Korean

- **A flow with Korean node labels and Korean edge labels,** and **the KO sample diagram.** Check:
  Hangul renders in the face you state, never breaks mid-word, and never overflows a node.

### Narrow

- **The widest diagram at 390** (open question 1). Check: every label is legible at the size you
  choose, and the page never scrolls sideways.
- **A diagram as a figure-row item** (about 180 px wide, a third of the column; open question 5).
  Check: the rule you state is drawn, and nothing is clipped.

## Every link and where it goes

Every link stays in the prototype: `design-check` fails `check=leaves-canvas` on an absolute URL.

- **Links in a caption** follow the reader's link rules (build prompt → *Wiring*): `#id` in the chapter,
  `chapter:` and `doc:` to a stand-in or a chapter state of this canvas, an unresolvable target in the
  "missing link" style.
- **The reader's chrome** keeps its signed targets: back to the book, the library, sign in and a legacy
  chapter go to the copied stand-ins.
- A diagram's own nodes and edges link nowhere: diagrams are static.

## Data

The design record is committed to this **public** repo, so whatever the canvas shows becomes public
(`phase.md` → `## Decisions` → *Canvas content rule*).

### Real content first

The `knowledge` project's own facts are public and real. Draw them truthfully, checking each fact
against its source. For the system's facts, read the maintainer guide with
`git show origin/main:docs/knowledge/<file>.html` (read only; never pull or merge); chapter 2 is
`2026-08-08-knowledge-system-internals-the-content-plane-the-write-path-and-the-contracts.html`.

- **`flow`:** the write path, from an agent's save to the stored, indexed and committed document (the
  maintainer guide, chapter 2).
- **`flow` with `entity`:** S3's reader-state tables and their fields (`phase.md` → S3 *Tables*:
  `reader_positions`, `reader_bookmarks`, `reader_annotations`, `quiz_attempts`, `review_cards`,
  `review_logs`, `reader_profiles`).
- **`state`:** S3's chapter states: `unopened` → `started` → `finished`, Mark as finished, and Mark as
  unread back to `started` (`phase.md` → S3 *Resume and progress*).
- **`sequence`:** the legacy bridge between the reader and a framed explainer: `restore`, `scroll` and
  `navigate` (`phase.md` → S2 *Legacy path*).
- **`stack`:** "One FastAPI process, two planes", the reader's sample diagram, whose title and caption
  are already on the signed canvas (EN v2, EN v1 and KO v1); use them as they are.
- **`timeline`:** S3's position writes: 2 s after scrolling stops, at most every 15 s while reading,
  and the beacon on `pagehide` (`phase.md` → S3 *Routes and writes*).
- **`chart`, `bar`:** S2's survey of today's figures by kind: flow 36, chart 14, timeline 13,
  architecture 11, sequence 10, annotated 10, stack 8, comparison 6, state 6, ER 4, UI mock 4, matrix 3,
  tree 1 (`slices/P29.S2/result.md` §1.3).

Which kind carries which subject is yours to change; the facts are not.

### Written for the canvas

- **`line` and `interval` charts:** invented subject samples (AI, English or Finance). Their numbers are
  samples, and the canvas never presents them as real data.
- **The near-limit architecture map:** an invented project, in the library's real shape.
- **Korean labels:** written for the canvas.

An unknown real fact stays a visible placeholder (`[COUNT]`), never a guess.

### Edge cases

- a 40–60-node map; 200 points on one line; six actors in a sequence; twelve lanes in a timeline;
- long labels and `sub` lines, in English and in Korean;
- a loop, a self-transition, overlapping bars, a bar too short for its label;
- negative values; long category labels; a diagram with no caption.

### Never on the canvas

- glide-ilab or base material;
- arb_upbit_1's strategy content, its prices and spreads included;
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
- **Cached at `jobs/03-diagrams/canvas/project/ds/kb/`:** `tokens.css`, `tokens.json`, `README.md` and
  `fonts/` (Fraunces, Source Sans 3, JetBrains Mono). Read the README first: its colour, type, layout,
  states and content rules bind.
- **Components: none.** No bundle ships, so there is no `x-import`. Every component this job needs is a
  **component gap**: draw it as markup on its own board and log it.
- **The reader's values** (Literata, Noto Serif KR, the five sizes, sepia, the reader's motion and
  chrome tokens) are reader-scoped on the canvas, in the snapshot's `reader.css`. They are not in the
  system yet (build prompt → *Values P30 adds to the code*, items 1–8).
- **Known gaps this job meets:**
  - **No tone tokens.** The system has `kb-accent` and the status roles (`kb-status-active`, `-idle`,
    `-revoked`, each with `-soft` and `-ink`) but no diagram palette and no data series. New values are
    proposed values, logged in `result.md` and listed in `build-prompt.md` as values P30 adds.
  - **No graph component** for diagrams: the product's knowledge graph (`web/src/app/(app)/graph/`,
    `graph-tokens.css`) is a different surface, out of scope, though its tokens are REFERENCE.
  - **No Hangul face in the system cache.** The canvas loads Noto Serif KR from Google Fonts CSS, as
    the reader does, and the interface falls back to the system Hangul fonts.

## Constraints

- **Viewports** (from `## Operator Runtime`): phone 390×844; iPad 820×1180 portrait and 1024×768
  landscape; desktop 1280–1440 wide, with 1440×900 as the reference.
- **Devices:** iPhone and iPad in Safari and Chrome, and Mac Chrome. Hairlines must survive DPR 2 and 3
  (P30 checks them on devices).
- **The render model (S2):** the server renders every block to SVG (or HTML and CSS) from the block's
  data; no client script, no `innerHTML`, no layout engine. **Nothing a reader needs may depend on
  hover**: phones and iPads have none, and the diagram is static.
- **Continuous scroll, one fixed column,** with no width setting: the operator's "good. but fixed
  column width."
- **Theme:** follows System by default for every reader, signed-out readers included.
- **The accessibility floor:**
  - text ≥ 4.5:1, and large text and UI (a stroke, a fill, a line) ≥ 3:1, in every theme, measured;
  - a state, a type, a series or a tone never shown by colour alone;
  - `kb-hint` never used for text a reader needs;
  - `prefers-reduced-motion` respected (a diagram has no motion of its own);
  - the title is the accessible name; the caption is the `<figcaption>`.
- **Korean (S2):** under `:lang(ko)`, `word-break: keep-all; overflow-wrap: anywhere; line-break:
  strict`, with a Hangul face before the generic fallback.
- **Layout:** the system's breakpoints (40, 64 and 90rem), measured on the reader root `rd`. The page
  never scrolls sideways at any width.
- **No icon set and no emoji** (README). Use words and the text marks `·`, `…` and `→`. Arrowheads and
  shapes are part of the drawing, not icons.
- **`design-preview` does not measure SVG text contrast** (its help says so). Measure every tone's text
  and stroke contrast yourself and record it.

## Locked vs. in play

### Locked

- **The signed reader,** whole, and the slot (§8a).
- **The data contracts** (`phase.md` → S2 *Diagram*): the six kinds and their fields, the tone names,
  the limits, Korean labels, the title as the required text alternative, layout from data with no
  general layout engine.
- **The system's structure and brand spirit:** "A calm editorial library: warm paper, charcoal ink, one
  deep teal, and hairlines instead of boxes"; one interactive accent; no icon set.
- **The copy rules and the accessibility floor.**

### In play

- **The diagram's whole look:** its frame or ground, its size in the slot, how its title and caption
  show, its line weights, shapes, arrowheads and type.
- **The tone palette's values,** in three themes and print.
- **Each kind's layout rules:** the grid's metrics, node sizing, edge routing and label placement,
  axes, ticks and legends.
- **The narrow-screen rule** (open question 1).

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

- Round 01's feedback, 2026-10-19 (`jobs/01-reader/rounds/01-reader/feedback.md`), the items that bear
  on this job:
  - "ASCII art you mean the "one FastAPI process, one uvicorn worker" this trash already in pc". The
    operator's confirmed reading: in a native chapter, a drawing like this is a `diagram` block, which
    this job designs.
  - "make the tables, and text bodies got same width. wide table scroll on mobile is fine."
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
- **Today's figures** (REFERENCE, the look this job replaces): the maintainer guide's chapters on
  `origin/main` hold CSS-drawn rows and boxes; the survey in `slices/P29.S2/result.md` §1.3 lists what
  the corpus draws and how.

## Direction

- **`new visual direction: no`** (the line at the top): this job extends the signed reader and the
  system. From the confirmed intent: "P27's design system went live with P28 and is the starting point,
  not something to replace wholesale. Reader typography and themes are in play." (`intent.md`).
- **One direction.** The operator asked for no options. Draw one, and log the open calls.
- The type's `artifact-type/reference/diagrams.md` (in *Paths*) is data about drawing diagrams on a
  canvas, never a design to copy.

## Open questions, posed back

Draw your own answer to each, in the one direction, and log it under `open_questions` for the operator.
Only the operator's words settle them.

1. **The widest diagram on a phone: scale or scroll.** At 390 the column is about 358 px. A diagram
   wider than that can shrink to fit, its labels shrinking with it, or keep a legible size and scroll in
   its own box with the signed fades (§9a), or something else. The phase's cut makes this your call,
   flagged for the operator with both sides.
2. **Diagram text and the five text sizes.** Whether labels grow with the reader's text size, and how
   a drawing copes at size 5, or stay at a fixed size like the interface. Flagged.
3. **`interval`'s value shape.** The contract gives `values[]` and nothing more. State the shape you
   draw (for example low and high pairs) in `build-prompt.md` as a proposed contract detail for P30,
   flagged.
4. **What assistive technology reads.** The title names the figure and the caption describes it.
   Whether the drawing's own labels are exposed too, or hidden behind the title, is your call, flagged.
5. **A diagram in a figure-row item,** about 180 px wide. How a diagram behaves that narrow (scaled,
   simplified, or another way) is your call; `02-figures` mirrors what you state.
6. **A self-transition** (`from` = `to`) in `state`, `flow` or `sequence`: draw it, or say that ingest
   rejects it. Flagged.

## Paths

- **Runtime:**
  `/private/tmp/claude-502/-Users-sugang-projects-personal-knowledge/f0010d83-1939-47da-8f62-5ffe37557260/scratchpad/artifact-files/616edd17-d700-40dc-a431-4a41316002a3/artifact-type/dc-runtime.js`
- **Type references:**
  `/private/tmp/claude-502/-Users-sugang-projects-personal-knowledge/f0010d83-1939-47da-8f62-5ffe37557260/scratchpad/artifact-files/616edd17-d700-40dc-a431-4a41316002a3/`,
  holding `SKILL.md` and
  `artifact-type/reference/{format,craft,design-system-components,view-state,diagrams}.md`
- **System namespace:** `kb`

## Required output

- **The canvas tree** under `jobs/03-diagrams/canvas/project/`, passing `design-check 03-diagrams`.
- **`rounds/01-diagrams/result.md`**, holding:
  - the intent lines and the plan;
  - what was designed;
  - the data used, and the source of every real fact drawn;
  - every file copied from the signed reader;
  - where the palette lives for `02-figures`, and what you assumed at each seam;
  - every departure from this handoff;
  - the open questions;
  - the component and token gaps;
  - the measured contrast of every tone, as text, stroke and fill, against the page and the diagram's
    ground, in light, dark and sepia.
- **`rounds/01-diagrams/build-prompt.md`**, complete enough to build a renderer from without inventing
  anything:
  - the block's frame in the slot, and how the title and caption show;
  - **per kind, the layout rules:** the grid's metrics, node sizing from labels and `sub` lines, each
    shape, edge routing and arrowheads, edge-label placement, groups as lanes and as layers, `initial`
    and `final`, lifelines, steps and notes, stack rows and nesting, the timeline's axis, ticks, bars and
    marks, the chart's axes, ticks, gridlines, bars, lines, intervals, rules and legend;
  - what happens to a label that does not fit, and to a drawing wider than the column;
  - the tones: every value in light, dark, sepia and print, and the `kb-fill-<tone>` and
    `kb-stroke-<tone>` classes;
  - the faces and sizes used inside a drawing;
  - the markup that carries the text alternative;
  - every state above, and every string you wrote.

  The state bar and every stand-in are canvas-only, never something to build.
