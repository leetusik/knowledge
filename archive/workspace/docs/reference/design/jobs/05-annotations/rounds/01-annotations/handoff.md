# Handoff — job `05-annotations`, round `01-annotations` (slice P29.S5)

new visual direction: no

critique: critic

This is the drafter's whole brief and the critic's yardstick for this job's first round. The
orchestrator wrote it on 2026-10-20 from the record:
- the P29 contracts (`works/phases/active/P29/phase.md` → `## Decisions`), chiefly S3 *Who keeps
  state*, *Keys*, *Bookmarks*, *Highlights and notes*, *Anchors*, *Review items*, *Routes and writes*
  and *Privacy*, and S2 *Ids* and *Format flag and `md`*;
- the signed reader (`## Decisions` → *The signed reader*, and the signed round
  `jobs/01-reader/rounds/02-revise/`, chiefly its build prompt's §12, Sign in to save, and §15, Sheets);
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
- **Where this job sits.** On top of the **signed reader**. The reader keeps the reader's place by
  itself (resume and progress); this job draws what a reader marks on purpose: **bookmarks**,
  **highlights** and **notes**, the "Review this" switch that sends a highlight into spaced review, the
  chapter's annotation panel and a book's list of everything marked.
- **The operator's words:** "bookmark(where you left), more easy to another chapter good.  may help."
  The reader drew "where you left" as resume; bookmarks here are the reader's own marks, kept separately
  (S3).
- **Every annotation is private** to its reader (S3 *Privacy*): no owner, org member or other reader
  ever sees it.

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

## The signed reader: locked, and this job adds to it

- **Signed on 2026-10-20:** job `01-reader`, round `02-revise`, on the operator's words "everything
  looks good. moveon". Canvas https://claude.ai/artifact/MRzppHqkh5aCqpkBa8QCVY, reviewed at
  `1792405111-eccf`. **Every element of it is locked.**
- **This job's licence to add.** The reader's first handoff reserved these controls for this job: "Draw
  no bookmark, highlight or note control in the reader's chrome; that job adds them to the signed
  reader." So this job **adds** controls to the reader: to its chrome, its blocks and its sheets. It
  never moves, restyles or drops a signed element. If an addition cannot fit without changing one,
  leave the signed element as it is, log the need as a departure and an open question, and the
  operator decides.
- **REFERENCE, read as data:**
  - the snapshot `docs/reference/design/jobs/01-reader/rounds/02-revise/canvas/project/` (31 boards:
    the flow, the widths board, the stand-ins, Foundations, the components and their mounted parts);
  - its `build-prompt.md`, the implementation contract, complete on its own;
  - its `result.md`, for the measured contrast and the departures.
- **Sign in to save (build prompt §12), reused as is:** the one reusable pattern. Its props are `what`
  ("finished chapters and your place in each one" | "bookmarks" | "highlights and notes" | "quiz
  answers"), `place` ("chapter" | "document"), `raised`, `onSignIn` and `onDismiss`. Its body reads
  "Signed in, your {what} are kept across your devices. After you sign in, you come back to this
  {place}, at this section." This job uses it with **`what` = "bookmarks"** and **"highlights and
  notes"**, and changes nothing else.
- **What this job draws in and never re-litigates** (each detailed in the build prompt):
  - **the faces:** Literata with Noto Serif KR for reading; Fraunces with Noto Serif KR for display;
    Source Sans 3 with Pretendard for the interface (notes, menus, lists); JetBrains Mono, ligatures
    off;
  - **one 36rem column** (`--rd-measure`) for every block, with no wider track;
  - **five text sizes** (`--rd-fs` / `--rd-k`: 15, 16.5, 18 (the default), 20 and 22 px), leading 1.65,
    and the column's small step `--rd-fs-s` (`× 0.8333`). The interface keeps its fixed 13 and 15 px
    steps and the 11 px mono label;
  - **themes:** System, Light, Dark and Sepia. Light and dark are the system's values; sepia is
    reader-scoped (build prompt → *Themes*);
  - **the reader's own chrome** (the top bar, the progress line and the chapter bar), which hides on
    scroll (build prompt → *The chrome*), and English-only chrome copy;
  - **the sheets** (§15: Contents, Display, Version history): a bottom sheet below 40rem, a side sheet
    from 40rem, focus, Escape and the scrim;
  - **the progress words** ("Not started", "Started", "Finished", "Updated") and **the language switch**
    with its endonyms ("English", "한국어");
  - **the stand-ins** for other jobs' screens (board 04, `Elsewhere.dc.html`: Book page, Library, Sign
    in, Legacy reader and External link);
  - **Hangul runs** inside other-language text, wrapped in `lang="ko"` (§6a).
- **How to use it on this canvas.** Copy what you need from the snapshot into this job's tree,
  **unchanged in look and behaviour** (`reader.css`, the parts, Sign in to save, the sheets, the
  stand-ins), then add this job's controls. Extend the canvas-only machinery (`reader.js`, `flow.js`) so
  it carries annotations. List every copied file in `result.md`, and every signed part you added to.
  Never write to the snapshot.

## Scope

### This job: annotations, one surface

Everything here is drawn at phone, iPad and desktop, in **light, dark and sepia**, in the signed reader.
Where the text size changes a layout (a note, a margin marker), show sizes 1, 3 and 5.

1. **Bookmarks** (S3): explicit, any number per variant, separate from resume: `{anchor: {block_id} |
   {anchor?, fraction} (legacy), label?, snippet}`, where `snippet` is the first ~140 characters of the
   block's text (or the heading). **Toggled per block.**
   - on a native chapter: the per-block toggle, on and off, with an optional label;
   - on a plain `md` document and a legacy chapter: the bookmark is the **current position**
     ("bookmark this position").
2. **Highlights and notes** (S3): one entity, an **annotation**:
   - a **highlight** is an anchor with a quote, optionally carrying a **note**;
   - a **block note** is an anchor with only a `block_id` and a note;
   - **one colour in v1**; **native chapters only** (plain `md` and legacy chapters have none).

   Draw: select text, then highlight; add a note to a highlight; a block note; edit; delete.
3. **"Review this"** on a highlight: a highlight becomes a review card only when the reader turns this
   on (Q7's working assumption; S3 *Review items*). A block note has no quote, so it is never a card.
4. **The chapter's annotation panel:** the chapter's annotations, with the **Unanchored** group at the
   end (S3 *Anchors*: orphans "with the original text struck through (Hypothesis's pattern)", and
   deletable there).
5. **The anchor statuses** (S3's ladder):
   - **anchored:** the quote is found (exactly, fuzzily, or moved within the chapter) and painted;
   - **`block`:** the block exists but the quote does not; "shown as a margin marker on the block with
     the original snapshot";
   - **`orphan`:** the block's id is gone; listed under Unanchored.

   Nothing is ever deleted or moved automatically.
6. **The other language:** "Highlights belong to their language": in the other variant, a highlighted
   block shows a **block marker ("1 highlight in 한국어")** that opens the original quote and note; it
   is never painted onto the translation. Bookmarks map across languages by id.
7. **The per-book list:** every bookmark and note in a book (`GET annotations?org=&project=&book=`,
   orphans included), each with its snippet, label, chapter and language; migrated legacy bookmarks
   show as **approximate**; orphans and language tags shown.
8. **Signed out:** every save action answers with Sign in to save.

**Sizing.** One surface: about 5 Pages or fewer, plus their components. `design-check` warns past 6
Pages or 16 boards. How the Pages divide the states is your call.

### The sibling jobs, drafting beside you (wave 2, P29.S5)

Each writes only its own folder under `docs/reference/design/jobs/`. You may read a sibling's tree; it
is a draft in progress, not signed.

- **`02-figures`** (critic): `figure`, the `figures` row, the `svg` block, `sources` and citations.
- **`03-diagrams`** (critic+judge): the `diagram` block and the tone palette.
- **`04-quiz`** (critic): the quiz block. It reuses Sign in to save with "quiz answers".

**Where this job meets them:**
- **Annotation controls on their blocks are yours.** The block jobs draw none. Where your controls sit
  on a figure, a diagram, a quiz or a sources list is yours to show (open question 4); use the reader's
  own blocks, or a sibling's tree read-only, or a plain stand-in that names the sibling.
- **Sign in to save** is shared, unchanged, with `04-quiz`: only `what` differs.
- **The highlight's colour** is one colour (S3). If it comes from the tone palette, that palette
  belongs to `03-diagrams`; say which value you used.

Say in `result.md` what you assumed at each seam. The critic compares the wave's jobs, and a conflict
between two jobs reaches the operator as a wave choice.

### Not this job

- **The reader's resume and progress** (signed): the resume pill, the progress line, the chapter
  states and Mark as finished.
- **Wave 3 (P29.S6):**
  - **`review`:** the review surface, the highlight card included. This job draws only the switch.
  - **`legacy-and-print`:** the legacy reader and its chrome bar, where the legacy bookmark control
    will sit; and every print sheet.
  - **`book-page`:** the book page, including any entry it gives to the per-book list.
  - **`library`.**
- **The block jobs' blocks:** `02-figures`, `03-diagrams` and `04-quiz` draw them.
- **Clearing one book's state, or all reader state** (S3 *Privacy*: "clear one book's state, or clear
  all reader state"). No job in the cut draws it; it is being raised with the operator at this wave's
  stop. Deleting a single bookmark or annotation **is** this job's.
- **The console, auth, graph and landing** stay unchanged.

## Screens × states

**Prototype first.** Every state below must be reachable on an interactive Page: by a click or, where
no click reaches it, by that page's state bar. Selecting text and highlighting it works on the canvas.

Each state carries a one-line check the critic holds it to. Every state is drawn at phone (390×844),
iPad (820×1180) and desktop (1440×900), in light, dark and sepia; add iPad landscape (1024×768) where
the layout changes there. The critic checks all three themes.

### Bookmarks

- **A block, not bookmarked, and bookmarked.** Check: the state is clear without colour alone; the
  toggle is reachable by keyboard and at least 44 px below 40rem; toggling moves no text.
- **A bookmark given a label, and the label edited.** Check: the label shows where the bookmark is
  listed, at 16 px input size.
- **Several bookmarks in one chapter.** Check: each is findable from the panel or the list (your
  answer to open question 8).
- **A plain `md` document:** "bookmark this position". Check: it saves the current position, with no
  per-block toggles (an `md` document has no ids).
- **A legacy chapter:** the same control, drawn as a component on an in-canvas stand-in of the legacy
  reader's chrome bar ("Legacy reader — another job (`legacy-and-print`, P29.S6)"). Check: it says what
  it does; wave 3 places it.

### Highlights and notes

- **Select text in a paragraph, then highlight.** Check: the action appears beside the selection
  without covering it; the highlighted text measures at least 4.5:1 on the highlight in light, dark and
  sepia; the text does not reflow.
- **On iPhone and iPad.** Check: what you add stays usable beside the system's own selection menu,
  which Safari shows above a selection; where yours sits is stated (open question 1).
- **A note added to a highlight.** Check: the note reads as belonging to its highlight; saving and
  cancelling are plain; the field is 16 px; it works by keyboard.
- **A block note** (on a heading or a typed block). Check: it reads as a note on that block, not on a
  passage.
- **Editing a note, and deleting a highlight or a note.** Check: each is reachable from the passage
  and from the panel; a deletion is clear before or as it happens.
- **"Review this", off and on.** Check: the state is said in words; turning it off follows your answer
  to open question 7.
- **Deleting a highlight with "Review this" on.** Check: the result is S3's (its review card goes with
  it), and how the reader learns that is stated.
- **A highlighted link.** Check: it still reads as a link and still works.
- **Overlapping highlights.** Check: each stays reachable (open question 6).
- **A highlight in the Korean variant.** Check: `keep-all` line breaking is unchanged, and the
  highlight never splits a word.
- **A selection that crosses two blocks.** Check: what happens is shown, never silent (open question
  3).
- **A selection inside code, a table, a callout, a quiz, a figure caption, and the chapter's title and
  lede.** Check: each follows your answer to open question 4, and nothing fails silently.
- **Text before the chapter's first heading.** Check: per open question 5, shown, never silent.
- **Keyboard.** Check: a reader can highlight and annotate by keyboard, or the gap is logged (open
  question 10).

### The chapter's annotation panel

- **Open, with highlights, notes and bookmarks** (whether bookmarks are listed here is yours, open
  question 8). Check: the items are in reading order; each jumps to its place in the chapter; it
  behaves as the reader's sheets do (§15: focus, Escape, the scrim), or the departure is logged.
- **The Unanchored group,** at the end. Check: each orphan shows its original text struck through, with
  its block and chapter titles from the snapshot, and can be deleted there.
- **Empty.** Check: it says what a reader can do, in one line.
- **Many items** (30 in one chapter) on a phone. Check: the list scrolls inside the sheet and the
  reading place is kept.

### Statuses in the chapter

- **A `block`-status annotation.** Check: a margin marker on its block opens the original snapshot (the
  quote and the note); it never paints a highlight on text that no longer says it.
- **The other-language marker** ("1 highlight in 한국어", reading English; and the English endonym when
  reading Korean). Check: it names the language in its own script, opens the original quote and note,
  and paints nothing onto the translation.
- **A bookmark followed into the other language.** Check: it lands on the same block, by id.

### The per-book list

- **A book's list,** across several chapters. Check: each item shows its snippet, its label when it
  has one, its chapter and its language; each opens its place in that chapter.
- **Migrated legacy bookmarks.** Check: each says it is approximate, in words.
- **Orphans in the list.** Check: struck through as in the panel, and deletable.
- **A long list** (100 items) on a phone. Check: it stays usable, with no sideways scroll.
- **Empty.** Check: it says what a reader can do, in one line.

### Not available, and signed out

- **A plain `md` document, and a legacy chapter.** Check: no highlight action is offered, and the
  reader is told "Highlights are not available in this document." where they would look for it.
- **Signed out:** the bookmark toggle and the highlight action. Check: each answers with Sign in to
  save (`what` = "bookmarks", or "highlights and notes"; `place` = "chapter", or "document" in a loose
  document), unchanged but for `what`; no control is dead.
- **The sign-in stand-in.** Check: it says the reader comes back to the same chapter and section.

### Additions to the signed reader

- **Every Page.** Check: each signed element is where it was, as it was; only this job's controls are
  new; the chrome still hides on scrolling down and returns on scrolling up.

## Every link and where it goes

Every link stays in the prototype: `design-check` fails `check=leaves-canvas` on an absolute URL.

- **A panel item, a list item, a margin marker and the other-language marker** go to their place on
  this canvas: the passage, the block, or the original in the other variant.
- **A per-book list item in another chapter** opens that chapter's state on this canvas; the book's
  five real chapter titles each have one.
- **"Sign in"** goes to the copied Sign in stand-in; **"Not now"** closes the box.
- **The legacy chapter** shows the legacy bookmark control on its stand-in (above).
- **The book page and the library** go to the copied stand-ins.

## Data

The design record is committed to this **public** repo, so whatever the canvas shows becomes public
(`phase.md` → `## Decisions` → *Canvas content rule*).

### The book and chapters

- **The book: `knowledge` / `maintainer-guide`,** with its five real chapter titles:
  1. "Knowledge: What It Is and How It Is Used"
  2. "Knowledge System Internals: The Content Plane, the Write Path, and the Contracts"
  3. "Knowledge's Read Surfaces: Two Front Ends, One Corpus"
  4. "Shipping and Running Knowledge: Distribution, the Edge, Security, and the Gates"
  5. "Why Knowledge Is This Way, and How to Change It"
- **The chapter you annotate** is the signed reader's main sample, chapter 2, with its text as the
  snapshot's `reader.js` holds it: English v2, English v1 and Korean v1 (translated from English v1).
- **Migrated legacy bookmarks:** today these chapters are HTML explainers; after the html → native
  migration, bookmarks made on the HTML are positions and show as approximate. Use that as the story.
- **A plain `md` document:** the signed reader's `md` sample, the loose document
  `doc/field-notes/wal-files` in the snapshot's `reader.js`.
- **A legacy chapter:** the snapshot's data marks one, "Datums: Chart Datum, Mean Sea Level, and the
  Conversions Between Them" in the invented 20-chapter book "Tidewater, from the inside".

### Annotations

- **Written for the canvas:** realistic study notes and highlights a reader would make in these
  chapters, in English and in Korean. A signed-in reader is an invented name with no email.
- **Snapshots** follow S3: `{text, block_title, chapter_title}`.
- **The statuses:** at least one `block` status, two orphans, one other-language marker in each
  direction, and two approximate legacy bookmarks.

### Copy

- **The contract's words:** **"Review this"** (S3), **"Unanchored"** (S3), the other-language marker's
  form, a count and the language's endonym ("1 highlight in 한국어", S3), and Sign in to save's text
  (§12).
- **The record's wording**, kept unless you log a departure: "bookmark this position" and "Highlights
  are not available in this document." (`phase.md` → *What each job draws* and the S6 notes).
- **The system README's content rules:** sentence case, no exclamation marks, no emoji, "…" for
  pending, "→" on links that move you on.
- **Other copy** is yours, in English, since chrome copy is English-only; log every string in
  `build-prompt.md`.

### Edge cases

- a 500-character note, a Korean note, a note on a highlight of three words;
- overlapping highlights; a highlighted link; a selection across blocks;
- 30 annotations in one chapter; 100 items in a book's list; an empty panel and an empty list;
- a `block`-status annotation; two orphans; markers in both languages;
- an `md` document; a legacy chapter; a signed-out reader.

### Never on the canvas

- glide-ilab or base material;
- arb_upbit_1's strategy content;
- secrets, keys, emails or any personal data.

## The system inventory

- **Title: `knowledge`**, as the Design System Artifact shows it. Copy it into `canvas.json`'s
  `designSystems` record, pinned at the version below.
  - Namespace: `kb`.
  - Artifact: https://claude.ai/artifact/7qemgwHNsoPNf5kYHEJ4md, version `1792321604-e214`
    (`design.json`).
  - On 2026-10-20 the system's files were read back, and they are byte-identical to the cache. The newer
    version id the system shows is the app saving on open.
- **Cached at `jobs/05-annotations/canvas/project/ds/kb/`:** `tokens.css`, `tokens.json`, `README.md`
  and `fonts/` (Fraunces, Source Sans 3, JetBrains Mono). Read the README first: its colour, type,
  layout, states and content rules bind.
- **Components: none.** No bundle ships, so there is no `x-import`. Every component this job needs is a
  **component gap**: draw it as markup on its own board and log it. Where the product already has one,
  match its values: buttons in `web/src/components/ui/app-button.tsx`, and the reader's buttons and
  sheets as signed.
- **The reader's values** (Literata, Noto Serif KR, the five sizes, sepia, the reader's motion and
  chrome tokens) are reader-scoped on the canvas, in the snapshot's `reader.css`. They are not in the
  system yet (build prompt → *Values P30 adds to the code*, items 1–8).
- **Known gaps this job meets:**
  - **No highlight colour** in the system, nor any selection or annotation style.
  - **No text-field style for reading**: the system's inputs are the console's forms.
  - **No Hangul face in the system cache.** The canvas loads Noto Serif KR from Google Fonts CSS, as
    the reader does, and the interface falls back to the system Hangul fonts.

## Constraints

- **Viewports** (from `## Operator Runtime`): phone 390×844; iPad 820×1180 portrait and 1024×768
  landscape; desktop 1280–1440 wide, with 1440×900 as the reference.
- **Devices:** iPhone and iPad in Safari and Chrome, and Mac Chrome. On touch, text is selected by a
  long press and handles, and the system shows its own menu; a keyboard rising for a note must not hide
  the field. Respect the safe areas.
- **The anchor (S3):** a highlight lives inside **one** block: `{block_id, quote: {exact, prefix,
  suffix}, start?, end?}`, captured in the browser from the selection. Paragraphs, lists, tables, code
  and callouts carry no id; a position inside them anchors to the nearest preceding id'd heading or
  block (S2 *Ids*). Re-anchoring runs on the server; the page only paints what it is given.
- **Who keeps what (S3):** a signed-in reader, member or not, gets the same features. A signed-out
  reader keeps nothing but the reader-settings cookie; nothing merges on sign-in (Q6's working
  assumption).
- **Continuous scroll, one fixed column,** with no width setting.
- **Theme:** follows System by default for every reader, signed-out readers included.
- **The accessibility floor:**
  - text ≥ 4.5:1, and large text and UI ≥ 3:1, in every theme, measured, **highlighted text included**;
  - `kb-hint` never used for text a reader needs;
  - the system's focus ring (`kb-focus-w` in `kb-accent`);
  - targets of at least 44 px (`kb-tap`) below 40rem;
  - inputs at 16 px;
  - a state never shown by colour alone;
  - `prefers-reduced-motion` respected;
  - every control operable by keyboard.
- **Korean (S2):** under `:lang(ko)`, `word-break: keep-all; overflow-wrap: anywhere; line-break:
  strict`, with a Hangul face before the generic fallback; Hangul runs inside English are wrapped in
  `lang="ko"` (§6a).
- **Layout:** the system's breakpoints (40, 64 and 90rem), measured on the reader root `rd`. The page
  never scrolls sideways at any width.
- **No icon set and no emoji** (README). Use words and the text marks `·`, `…` and `→`.

## Locked vs. in play

### Locked

- **The signed reader,** whole; this job only adds to it. Sign in to save as signed, changing only
  `what`.
- **The data contracts** (`phase.md` → S3): bookmarks per block, positions on `md` and legacy, one
  annotation entity, one colour, native chapters only, "Review this" only on highlights, the anchor
  inside one block, the three statuses, the Unanchored group with struck-through text, highlights
  belonging to their language, the per-book list's fields, approximate legacy bookmarks, privacy.
- **The system's structure and brand spirit:** "A calm editorial library: warm paper, charcoal ink, one
  deep teal, and hairlines instead of boxes"; one interactive accent; no icon set.
- **The copy rules and the accessibility floor.**

### In play

- **Where every control sits** in the reader, and how it looks.
- **The highlight colour,** in three themes.
- **Notes:** how they show, how they are written and edited.
- **The annotation panel, the per-book list and the markers.**

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
- "bookmark(where you left), more easy to another chapter good.  may help."
- "good. but fixed column width."

### The reader rounds' words (P29.S4)

- Round 01's taste notes (Literata as a fourth face, edge-to-edge bars, near-identical callout grounds)
  were not taken up, so they stay as drawn. Round 02's (the list titles' face, the fixed 2ch hang,
  "Started", the three bars on page 03) were signed as drawn.
- On Sign in to save, the operator settled "Sign in" as a secondary button, as drawn (round 02's
  handoff → *Settled by the operator*, Q7: "yeah").
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
- **The signed reader** is now the established look of a chapter, and this job's frame.

## Direction

- **`new visual direction: no`** (the line at the top): this job extends the signed reader and the
  system. From the confirmed intent: "P27's design system went live with P28 and is the starting point,
  not something to replace wholesale. Reader typography and themes are in play." (`intent.md`).
- **One direction.** The operator asked for no options. Draw one, and log the open calls.

## Open questions, posed back

Draw your own answer to each, in the one direction, and log it under `open_questions` for the operator.
Only the operator's words settle them.

1. **Where the controls live.** The per-block bookmark toggle, the action beside a selection (and
   beside the system's menu on iPhone and iPad), and the way into the annotation panel from the
   reader's chrome: each is an addition to the signed reader, never a change to it. Flagged.
2. **The highlight colour.** One colour in v1, legible under text in three themes. Flagged.
3. **A selection that crosses blocks.** The anchor lives inside one block. Whether such a selection is
   refused with a word, clipped to one block, or split into several highlights is your call, flagged.
4. **Which blocks take highlights and bookmarks.** Prose, lists, tables, code and callouts anchor to
   the nearest preceding id'd heading (S2). Quiz text, diagram labels, figure captions, a sources list,
   and the chapter's title and lede are open. Draw your answer, flagged.
5. **Text before the first heading.** The opening paragraphs before a chapter's first id'd heading have
   no preceding id to anchor to (S2 *Ids*). Draw what highlighting them does, and flag the gap: closing
   it is a contract change for P30, which the operator decides.
6. **Overlapping highlights,** in one colour. How each stays reachable is your call, flagged.
7. **Turning "Review this" off.** S3 adds a card with `PATCH {review: true}` and lets a card be
   `active` or `suspended`; it does not say what turning the switch off does (suspend the card, or
   remove it). Draw your answer, flagged for P30's contract.
8. **The per-book list's home, and the panel's contents.** Where the list opens from in the reader (the
   book page's entry is wave 3's `book-page`), and whether bookmarks appear in the chapter's panel
   beside highlights and notes. Flagged.
9. **A note's format.** Plain text or inline Markdown: the contract does not say. State yours, flagged.
10. **Highlighting by keyboard.** Selecting with Shift and the arrows, then the highlight action: make
    it reachable, or log the gap with what P30 would need.

## Paths

- **Runtime:**
  `/private/tmp/claude-502/-Users-sugang-projects-personal-knowledge/f0010d83-1939-47da-8f62-5ffe37557260/scratchpad/artifact-files/616edd17-d700-40dc-a431-4a41316002a3/artifact-type/dc-runtime.js`
- **Type references:**
  `/private/tmp/claude-502/-Users-sugang-projects-personal-knowledge/f0010d83-1939-47da-8f62-5ffe37557260/scratchpad/artifact-files/616edd17-d700-40dc-a431-4a41316002a3/`,
  holding `SKILL.md` and
  `artifact-type/reference/{format,craft,design-system-components,view-state,diagrams}.md`
- **System namespace:** `kb`

## Required output

- **The canvas tree** under `jobs/05-annotations/canvas/project/`, passing
  `design-check 05-annotations`.
- **`rounds/01-annotations/result.md`**, holding:
  - the intent lines and the plan;
  - what was designed;
  - the data used;
  - every file copied from the signed reader, and every signed part this job added to, with what was
    added;
  - what you assumed at each seam with the block jobs;
  - every departure from this handoff;
  - the open questions;
  - the component gaps;
  - the measured contrast of every text and highlight colour you add, in light, dark and sepia.
- **`rounds/01-annotations/build-prompt.md`**, complete enough to build from without inventing
  anything:
  - each control's place in the reader, at each width, and what it adds to which signed part;
  - the selection flow on touch and with a mouse, and by keyboard or its logged gap;
  - bookmarks, highlights, notes, "Review this", edit and delete, with every state;
  - the panel, the per-book list, the markers and the statuses;
  - `md`, legacy and the signed-out reader;
  - every string you wrote.

  The state bar and every stand-in are canvas-only, never something to build.
