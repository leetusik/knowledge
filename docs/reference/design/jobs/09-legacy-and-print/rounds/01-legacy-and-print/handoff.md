# Handoff — job `09-legacy-and-print`, round `01-legacy-and-print` (slice P29.S6)

new visual direction: no

critique: critic

This is the drafter's whole brief and the critic's yardstick for this job's first round. The
orchestrator wrote it on 2026-10-20 from the record:
- the P29 contracts (`works/phases/active/P29/phase.md` → `## Decisions`), chiefly S2 *Legacy path*,
  *Print* and *Deferred fates*, and S3 *Resume and progress*, *Bookmarks*, *Highlights and notes*,
  *Language switch* and *Legacy*;
- the signed reader and the signed wave 2 (`## Decisions` → *The signed reader* and *The signed chapter
  blocks and annotations*), chiefly the reader's chrome, the annotations' legacy bar and the blocks a
  native chapter prints;
- the S6 notes (`## Notes for later slices`) and the corpus map in `slices/P29.S1/result.md`;
- `works/phases/active/P29/intent.md`;
- the product's code, read on 2026-10-20 (paths below);
- the synced design system.

Anything marked REFERENCE is data, not a proposal. No `docs/current/` section is named: experience and
frontend there are STALE, and P28's `## Doc impact` and the code win.

## Product context

- **What knowledge is.** A hosted knowledge base. Coding agents publish documents, mostly explainers
  about a codebase, into an org's library, which is read on the web and over MCP. P29 and P30 turn it
  into a **personal learning library that reads like an e-book**: books of ordered chapters, for
  anything the operator studies (AI, English, Finance, …), with codebase knowledge first-class.
- **Who reads.** The operator, a solo developer, on iPhone, iPad and a Mac; and anyone reading a public
  document while signed out.
- **This job has two halves.**
  1. **The legacy reader.** Every document published so far is a self-contained HTML explainer, and
     every `html` document or version keeps opening as one (S2 *Legacy path*) until an agent
     re-explains it in the native format. Today it is framed inline and its height is measured, which
     makes two scrollers fight on a phone. The legacy reader ends that: **the framed document fills the
     screen under a slim reader chrome bar, and the frame is the only scroller.** Nothing measures its
     height.
  2. **Print.** The native reader's **print sheet** (S2 *Print*: an extension of today's print
     stylesheet), and, for a legacy document, the **Print control** that opens the original in a new
     tab plus the **one notice sheet** that ⌘P prints.
- **The signed parts point here:**
  - the reader's build prompt: "Legacy (HTML) chapters keep the legacy path; the `legacy-and-print`
    job draws it." A legacy row in its chapter list carries the tag "ORIGINAL LAYOUT" and "opens the
    legacy reader" (§11);
  - the annotations' build prompt gives a legacy chapter "one control on the legacy reader's bar",
    **Bookmark this position** / **Bookmarked here**, with the line "Highlights are not available in
    this document." under the bar, and says "where the button and the line sit in that bar is
    P29.S6's";
  - the diagrams' build prompt: "Wave 3 draws the print sheet."
- **The operator's words that shaped this job**, verbatim, from the intent (2026-10-17): "I want it to
  be work like E book reader." and "I want more refined diagrams, mobile, ipad friendly, image
  available, multi column image or diagram input also possible, and more quizs available etc.."
- **Reading state is private** to its reader (S3 *Privacy*).

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

## The signed reader and wave 2: locked, and this job draws around them

- **The reader**, signed on 2026-10-20: job `01-reader`, round `02-revise`, on the operator's words
  "everything looks good. moveon". Canvas https://claude.ai/artifact/MRzppHqkh5aCqpkBa8QCVY, reviewed
  at `1792405111-eccf`.
- **Wave 2**, signed on 2026-10-20 on the operator's word "accept":

  | Job | Round | Canvas |
  |---|---|---|
  | `02-figures` | `01-figures` | https://claude.ai/artifact/ATLFkU6eqggy8Z4qBF8BT7 |
  | `03-diagrams` | `01-diagrams` | https://claude.ai/artifact/D2poE9aVsGxNZAdrNCvpav |
  | `04-quiz` | `01-quiz` | https://claude.ai/artifact/75iqVgCcFXQFrkPyM6dDW2 |
  | `05-annotations` | `01-annotations` | https://claude.ai/artifact/FJTQP73ZHxMkDyKywJ3zmj |

- **Every element of them is locked.** This job draws the legacy reader from the reader's parts, and
  the print sheet from the signed blocks, and never moves, restyles or drops a signed element **on
  screen**. Where a signed part fits unchanged, use it unchanged. Where the legacy reader needs it to
  differ (a bar slimmer than the reader's, say), leave the signed part as it is, draw the legacy
  version, and log the difference as a departure and an open question. **On paper**, the signed
  blocks are yours to set for print within S2 *Print* and the values their build prompts already give
  for print (the diagrams' print tones).
- **REFERENCE, read as data:** each signed round's snapshot `canvas/project/` and its `build-prompt.md`
  (the implementation contract, complete on its own), under `docs/reference/design/jobs/`:
  `01-reader/rounds/02-revise/`, `02-figures/rounds/01-figures/`, `03-diagrams/rounds/01-diagrams/`,
  `04-quiz/rounds/01-quiz/` and `05-annotations/rounds/01-annotations/`.
- **What this job draws in and never re-litigates:**
  - **the faces:** Literata with Noto Serif KR for reading; Fraunces with Noto Serif KR for display;
    Source Sans 3 with Pretendard for the interface; JetBrains Mono, ligatures off;
  - **themes:** System, Light, Dark and Sepia, the reader's own setting in its Display sheet (§13).
    Light and dark are the system's values; sepia is reader-scoped (build prompt → *Themes*);
  - **the reader's chrome** (§1–§4 and *Behaviour → The chrome*): the 3px progress line that never
    hides; the top bar (the logo, 44×44, to the library; the back link, "‹" and the book title from
    40rem, "Book" below, "Library" for a loose document; from 40rem on an older version the tag "Older
    version · vN"; the language switch "English" / "한국어"; "Display"; "Sign in" for the signed-out);
    the chapter bar ("‹ Previous", "Contents" over "Chapter N of M · P%", "Next →", "Back to the book
    →" on the last chapter); the resume pill ("Picked up where you left off · <section>", "From the
    top"); the hide-and-show rules; the skip button "Show reading controls";
  - **the sheets** (§15): Contents with the chapter list (§11), Display (§13) and Version history
    (§14), with their words ("vN", "Current", "Published <date>", "Translated from English v1",
    "Reading now", "View");
  - **the chapter list's words** (§11), "ORIGINAL LAYOUT" on a legacy row among them;
  - **the version notices** (§5): "OLDER VERSION" / "You're reading v1 of this chapter. It was
    superseded — the current version is v2." / "Read v2 →", and "OLDER TRANSLATION" / "Translated from
    English v1. English has been updated since: it is at v2." / "Read English v2 →". Where they sit in
    a legacy document is open question 5;
  - **the chapter end's status words** (§10), if you use them for open question 3;
  - **Sign in to save** (§12), changing only its `what`: "bookmarks" here, `place` "chapter" or
    "document";
  - **the reader's loading, not found and failed states** (§16);
  - **the annotations' legacy bar parts** (`05-annotations` → `LegacyBar.dc.html`, `LegacyStates.dc.html`,
    and its build prompt → *Plain Markdown, legacy and signed out*): **Bookmark this position** /
    **Bookmarked here**, a secondary button at least 44 px tall, `aria-pressed`, both labels sharing
    one cell, keeping the reader's fraction and snippet; and the line **"Highlights are not available
    in this document."** in the 13 px meta step (`--font-body` 0.8125rem, `kb-secondary`), under the
    bar. Their words and look are signed; their place in the bar is yours;
  - **the blocks a native chapter prints:** figures and figure rows, the `svg` block and `sources`
    (`02-figures`), the six diagram kinds and their print tones (`03-diagrams`: "`break-inside: avoid`;
    `print-color-adjust: exact`; no fades, no hint, no scroll (`overflow: visible`); the SVG prints at
    100% of the column. The tones switch to their print values"), the quiz (`04-quiz`), and the prose
    kit, callouts, code and tables (`01-reader`);
  - **the stand-ins** for other jobs' screens (`Elsewhere.dc.html` in the reader's snapshot): copy it
    and add the kinds this job needs. A stand-in is canvas-only.
- **Settled already, not to reopen:** the native reader's chrome carries **no Copy link and no Print
  control** (round `01-reader/02-revise`, Q3, signed); a member reads in **the reader's own chrome, with
  no app shell** (Q4, signed). Native printing is the browser's own Print command on the reader page.
- **Copy what you need** from the snapshots into this job's tree, unchanged in look and behaviour, and
  list every copied file in `result.md`. Never write to a snapshot.

## Scope

### This job: the legacy reader and print, one surface

The legacy reader is drawn at phone, iPad and desktop, in **light, dark and sepia** (the cut's rule
for every wave-3 job). The print sheets are paper, drawn on A4 and US Letter.

**The legacy reader** (S2 *Legacy path*):

1. **The layout:** a page that never scrolls (`height: 100dvh`, falling back to `100vh`; `overflow:
   hidden; overscroll-behavior: none`), a **slim reader chrome bar**, and under it the frame, `flex: 1;
   min-height: 0; border: 0`, **the only scroller**. `viewport-fit=cover`, with the chrome padded by
   `env(safe-area-inset-top/left/right)`. Nothing measures the document's height.
2. **The chrome bar's contents** (S2): back to the book, the chapter title, previous and next, the
   chapter list, the KO/EN switch, versions, and Print; plus the signed bookmark control and line
   (above). **"Theme, text size and highlights do not reach inside, and the bar says so plainly."**
   How it relates to the reader's two bars is open question 1.
3. **The document's own look, kept as authored** (D36 (9)): a light `#fbfbfa` page in system-ui; 18
   of the 41 explainers switch to their own dark scheme with the operating system.
4. **The bridge** (S2: about 1 KB, injected by the relay; it does exactly three things):
   - it posts `{kb: "legacy", v: 1, type: "scroll", fraction, anchor}`, throttled, where `anchor` is
     the nearest preceding element id;
   - on load it honours a parent `{type: "restore", anchor? | fraction?}`;
   - it intercepts link clicks: an `http(s)` link opens a new tab with `noopener`; a same-app path posts
     `{type: "navigate", href}`, which the parent validates and routes; an `#anchor` link stays in the
     frame.

   It reports **no taps**. The chrome's hiding and its progress come from the scroll messages.
5. **Resume, progress and bookmarks** (S3): a legacy position is the bridge's `{anchor, fraction}`;
   restore by `anchor` when it exists, else by `fraction`; the finished rule is the same as native
   (`max_fraction ≥ 0.95`, or **Mark as finished**); a bookmark is the current position. **No
   highlights, no notes and no quiz results** in a legacy document.
6. **Languages and versions** (S1, S3): the KO/EN switch maps the position by anchor id, else the
   nearest preceding id, else `fraction`; each language keeps its own version chain; an older version
   opens by `?v=`, through the version relay.
7. **Links out of the frame:** an external link (a new tab), a same-app link (routed by the parent),
   an in-document `#` link (stays in the frame).
8. **Keyboard** (S2): the frame is in the tab order; on desktop it takes focus after load, so Space,
   PageDown and the arrow keys scroll it; a **"skip to document"** link focuses it.
9. **Loading, relay failure and not found.**
10. **Signed out:** a public legacy document reads in full; saving a bookmark answers with Sign in to
    save.

**Print** (S2 *Print*):

11. **The native sheet** (the reader's print stylesheet, extending `kb-print.css`): chrome hidden; the
    light palette whatever the screen theme; a figure row stays side by side when it fits the paper
    column, each item `break-inside: avoid`; diagrams and SVG in their print tones; code wraps, in
    grayscale; **quizzes print their prompts and options, with an answer key of answers and
    explanations at the end of the chapter**; links print their href.
12. **The legacy Print control:** it opens the raw relay (`…/raw` or `…/versions/{v}/raw`) top-level
    in a new tab, where the document prints its own layout (the bridge does nothing when it is not
    framed).
13. **⌘P on the legacy reader:** prints **one notice sheet** that names that address.

**Sizing.** One surface: about 5 Pages or fewer, plus their components. `design-check` warns past 6
Pages or 16 boards. How the Pages divide the states is your call; the print sheets may share one Page.
Read the type's `print.md` for how a canvas draws paper.

### The sibling jobs, drafting beside you (wave 3, P29.S6)

Each writes only its own folder under `docs/reference/design/jobs/`. You may read a sibling's tree; it
is a draft in progress, not signed.

- **`06-library`** (critic+judge): the member's library, the public org library, the app shell's
  Library and Review entry points, and "clear all reading data".
- **`07-book-page`** (critic): the book page, member and public, and "clear this book's reading data".
- **`08-review`** (critic): the review surface.

**Where this job meets them:**
- **A legacy row on the book page opens the legacy reader** (`07-book-page`, "ORIGINAL LAYOUT"); the
  legacy reader's back link returns to that book page.
- **A loose legacy document in the library opens the legacy reader** (`06-library`); its back link
  returns to the library.
- **Legacy chapters make no review cards** (S3), so `08-review` never links here.
- **The frame.** The library, the book page and review each pose whether they sit in the app shell or
  the reader's chrome. The legacy reader is the reader's family (S2: "a slim reader chrome bar"), so
  its frame is the reader's; how slim, and which items it keeps, is yours (open question 1).

Say in `result.md` what you assumed at each seam. The critic compares the wave's jobs.

### Not this job

- **The signed reader** and **wave 2's blocks and annotations** on screen.
- **`06-library`, `07-book-page`, `08-review`** (above).
- **Restyling a legacy document.** Its look is kept as authored (D36 (9)); the reader never injects
  styles into it.
- **Print sheets for the library, the book page or review:** no contract asks for one. If you think
  one is needed, log it as an open question.
- **Export PDF and its print blocks** on the legacy path: S2 retires them, and the Print control
  replaces them. Today's Full width view and Copy link have no line in S2's legacy chrome (the frame
  already fills the screen); if you keep either, log it as a departure and an open question. Delete
  stays on the console's document list.
- **The console, auth, graph and landing:** unchanged.

## Screens × states

**Prototype first.** Every state below must be reachable on an interactive Page: by a click or, where
no click reaches it, by that page's state bar. Scrolling the frame works on the canvas, and the page
around it never scrolls.

Each state carries a one-line check the critic holds it to. Every screen state is drawn at phone
(390×844), iPad (820×1180) and desktop (1440×900), in light, dark and sepia; add iPad landscape
(1024×768) where the layout changes there. The critic checks all three themes. Paper states are drawn
on A4 (794 px wide) and US Letter (816 px) where the layout differs.

### The legacy reader

- **A legacy chapter in a native book:** Tidewater's chapter 7, "Datums: Chart Datum, Mean Sea Level,
  and the Conversions Between Them", between native chapters 6 and 8. Check: the page itself never
  scrolls, the frame is the only scroller, and nothing scrolls sideways at 390; previous and next go to
  the reader at chapters 6 and 8.
- **A chapter in an all-legacy book** (`orchard`'s guide). Check: previous and next stay in the legacy
  reader; the chapter list follows §11, with "ORIGINAL LAYOUT" on every row.
- **A loose legacy document** (no book). Check: back goes to the library, as the reader's "Library"
  does; no previous, next or chapter list, and no dead control.
- **The chrome hiding and showing** as the frame scrolls. Check: the rule follows your answer to open
  question 1; the progress line stays; a hidden bar can be brought back by touch and by keyboard.
- **Restored on open, and the resume pill** (a member returning to a started legacy chapter). Check:
  it opens at the saved place, by anchor, else by fraction, and follows open question 4.
- **Progress in the chrome.** Check: the fraction the bridge reports drives what the reader's progress
  line and "Chapter N of M · P%" would show, or your answer to open question 4.
- **Finished:** reached by scrolling to the end, by **Mark as finished**, and **Mark as unread**.
  Check: S3's rule holds (`max_fraction ≥ 0.95`); the words are the reader's (§10, §11); it follows open
  question 3.
- **Bookmark this position / Bookmarked here,** and the line "Highlights are not available in this
  document." Check: the signed words and look, at 44 px; placed per open question 2; the line is
  visible without making a selection.
- **The note that theme, text size and highlights don't apply here.** Check: it is said plainly, in
  English, and never covers the document; beside the signed line it follows open question 2.
- **The KO/EN switch** on `lantern`'s P8 (legacy English v2, legacy 한국어 v1). Check: the reader's
  switch, in each language's own `lang`; it opens the other language at the same place (anchor, then
  fraction).
- **Versions:** the history of a legacy loose document at v2, and its v1 open. Check: the reader's
  Version history sheet (§14); an older version says so per open question 5, and links to the current
  one.
- **An older translation,** if a legacy translation records `translated_from` (draw it if you include
  the case). Check: the reader's words (§5), placed per open question 5.
- **The document's own look**, light-only, and self-darkening, under each reader theme. Check: the
  document is never restyled; the bar's theme follows open question 6; the seam between bar and frame
  reads as deliberate in every pairing.
- **Links:** an external link, a same-app link, an in-document `#` link. Check: each goes where S2 says
  (above); nothing navigates the top page from inside the frame.
- **Keyboard:** the skip link, the bar's controls, then the frame. Check: every control is reachable in
  order, with the system's focus ring; on desktop the frame has focus after load and Space scrolls it.
- **Phone:** safe areas and the home-indicator strip at 390×844. Check: the bar clears the notch, and
  any bar at the bottom clears the home indicator; every control is at least 44 px; nothing scrolls
  sideways.
- **Loading,** including a slow relay. Check: the bar shows at once; the frame's area says it is loading
  and is still under reduced motion; one consistent pattern (the reader's §16 or the system's, stated).
- **Relay failure:** the body's file is missing, and the relay could not load it. Check: says what
  happened and the one thing to do; the bar stays usable. How the page learns of the failure is P30's
  build.
- **Not found:** a missing document and a private one's address read the same (404-never-403).

### Signed out

- **A public legacy document, signed out.** Check: it reads in full; no progress, no state words;
  "Sign in" as the reader's top bar has it; Bookmark answers with the signed Sign in to save
  (`what` = "bookmarks").

### Print

- **The native sheet:** the knowledge guide's chapter 2 in English (v2), carrying the wave-2 blocks: a
  figure row, a diagram, a callout, a code block, a table, the quiz and the `sources` block. Check: no
  chrome; the light palette even when the screen was dark or sepia; the figure row side by side when it
  fits, else as you show it; the diagram in its print tones at 100% of the column; code wrapped; links
  with their href; nothing cut at a page edge that `break-inside: avoid` should keep whole.
- **The answer key** at the chapter's end: `choice` single and multi, `cloze` with accepted forms,
  `recall`. Check: each answer is findable from its question by its number; S2's "answers and
  explanations" both print.
- **Long content on paper:** a table that breaks across pages, a long code line, an ASCII drawing
  wider than the paper column, a collapsed callout. Check: nothing is lost off the paper; each follows
  your answer to open question 7.
- **The Korean sheet:** the chapter's 한국어 v1. Check: `lang="ko"`, `keep-all` and the Hangul face on
  paper.
- **An older version printed,** and **a loose native document printed** ("SQLite's write-ahead log, in
  practice"). Check: the sheet says which version it is and where the current one lives.
- **The legacy Print control,** and where it leads (a stand-in for the original in a new tab). Check:
  the control says what it does before it is pressed; the hint follows open question 8.
- **⌘P on the legacy reader:** the one notice sheet. Check: it names the address to print from, in
  full, and nothing else of the page prints.

## Every link and where it goes

Every link stays in the prototype: `design-check` fails `check=leaves-canvas` on an absolute URL.

- **Back** → the book page stand-in ("`07-book-page`") for a chapter, or the library stand-in
  ("`06-library`") for a loose document; the console's Documents list only if open question 10 lands
  there (a stand-in, "console, unchanged").
- **The logo** → the library stand-in.
- **Previous and next** → the legacy reader on this canvas for a legacy chapter, or the reader stand-in
  ("Reader — signed (`01-reader`)", naming the chapter) for a native one.
- **A chapter in the chapter list** → the same rule.
- **A version or a language** → this canvas.
- **An external link inside the document** → a stand-in "Opens in a new tab: <address>".
- **A same-app link inside the document** → the stand-in for where it routes (the reader, a book page).
- **Print** → a stand-in "The original document, in a new tab" (it prints its own layout).
- **Sign in** → the Sign in stand-in, copied from the signed reader.

## Data

The design record is committed to this **public** repo, so whatever the canvas shows becomes public
(`phase.md` → `## Decisions` → *Canvas content rule*).

### The wave's shared sample library

All four wave-3 jobs use these names, so their canvases agree. Every name is invented except
`knowledge` and its book; the signed reader already uses `tidewater` and `field-notes`.

- **The org:** "Quillwork" (`@quillwork`), invented. Never the operator's own handle or org.
- **The shape mirrors the real library** (`slices/P29.S1/result.md`, read from `origin/main`): 42
  documents, 4 codebase books of 20, 5, 4 and 4 chapters (33 chapters), 8 loose documents, one KO/EN
  pair, a preface-like chapter, no subject book; 4 documents with version history; 3 projects with no
  documents.

| Project | Book (kind) | Chapters | Loose documents |
|---|---|---|---|
| `knowledge` | "The knowledge maintainer guide" (`maintainer-guide`, codebase) | 5, the real titles below; native as the signed reader draws them | — |
| `tidewater` | "Tidewater, from the inside" (codebase) | 20, titled in the reader's `reader.js`; chapter 7 legacy; chapter 20 "Reading guide: how to use this book", the preface-like chapter at position 20 | — |
| `lantern` | "lantern, phase by phase" (`phases`, codebase; S1's title form) | 4, all legacy, at positions 8, 9, 17 and 24: keys `p8`, `p9`, `p17-p18` (one explain of two phases) and `p24`; titles "P8: …", "P9: …", one naming both P17 and P18, "P24: …" | 2, legacy, one at v2 |
| `orchard` | "The orchard maintainer guide" (`maintainer-guide`, codebase) | 4, legacy, v1 | — |
| invented | — | — | 3, legacy, that read like a series but declare none (S1); one at v3 |
| invented | — | — | 1, legacy, English with Korean terms |
| `field-notes` | — | — | 2, the signed reader's: "SQLite's write-ahead log, in practice" (native, v2) and "Inside a WAL database: the three files" (`md`, v1) |
| 3 invented | — | — | none (each holds only an index today) |

- **The real titles** of `knowledge`'s book, the only real titles allowed:
  1. "Knowledge: What It Is and How It Is Used"
  2. "Knowledge System Internals: The Content Plane, the Write Path, and the Contracts"
  3. "Knowledge's Read Surfaces: Two Front Ends, One Corpus"
  4. "Shipping and Running Knowledge: Distribution, the Edge, Security, and the Gates"
  5. "Why Knowledge Is This Way, and How to Change It"
- **The KO/EN pairs.** The real library's one pair is legacy (English v2 and 한국어 v1); `lantern`'s P8
  stands for it. The signed reader also drew a native pair on the knowledge guide's chapter 2. Wave 3
  keeps both, so its canvases agree with the signed reader.
- **Formats.** Today every chapter is legacy HTML except one `md` document. The canvases show a library
  partway through P30's re-explains, as the signed reader does: the knowledge guide native, Tidewater
  native but for chapter 7, `lantern` and `orchard` still legacy.

### This job's documents, in detail

- **Tidewater's chapter 7**, "Datums: Chart Datum, Mean Sea Level, and the Conversions Between Them",
  legacy, v1 (3 Oct 2026); chapter 6 "Caching predictions by day" and chapter 8 "The public tide-table
  API", both native. In the signed reader's progress the reader has finished chapters 1–10, so chapter
  7 is finished; draw a started legacy chapter elsewhere.
- **`orchard`'s guide:** four legacy chapters at v1; invent the titles.
- **`lantern`'s P8:** English v2 and v1, 한국어 v1, all legacy; a translation lags its original (S1).
  Invent the phase name.
- **A legacy loose document at v2** (one of `lantern`'s two): invent its title and dates.
- **The framed documents.** Draw each as invented content in the **authored look** (REFERENCE, *The
  product today*), realistic and never lorem: a title, sections with ids, prose, a code block, a table,
  a hand-drawn ASCII diagram, the explainer's own interactive quiz (radio options, a check button and
  its green and red feedback), a sources list, an in-document `#` link, an external link and a same-app
  link. One is **light-only**; one **switches to its own dark scheme** with the operating system. The
  English-with-Korean-terms document carries Korean runs in English text (the system fallback fonts
  give them glyphs; the reader never restyles it). How the canvas draws the frame is yours, within the
  format (`format.md`) and `design-check`'s rules.
- **The native sheet:** the knowledge guide's chapter 2 as the signed reader holds it (English v2, 12
  Oct 2026; 한국어 v1, 20 Aug 2026, titled "지식 시스템의 내부: 콘텐츠 평면, 쓰기 경로, 그리고 계약"), with
  wave-2 blocks taken from the signed canvases' own samples: a figure row (`02-figures`), a diagram
  (`03-diagrams`), the quiz items (`04-quiz`'s `reader.js`: `choice`, `cloze`, `recall`), and a
  `sources` block (`02-figures`).
- **Printed addresses:** the path in S1's form (`/@quillwork/knowledge/books/maintainer-guide/<key>`,
  with the signed reader's keys), and a visible placeholder `[host]` for the host. The legacy relay's
  address in the same way (`…/raw`, `…/versions/{v}/raw`).
- **Dates:** fix a print date, 20 Oct 2026, as the canvases' clock.
- **Visibility:** `knowledge` and `tidewater` are public on this canvas (the signed-out view uses
  Tidewater's chapter 7). Use a private project of your choice for the not-found state, and say which.
- **A signed-in reader** is an invented name with no email.

### Copy

- **The contract's and the signed parts' words:** the reader's chrome, sheets, notices and progress
  words; "ORIGINAL LAYOUT"; "Bookmark this position", "Bookmarked here" and "Highlights are not
  available in this document."; Sign in to save.
- **The note that theme, text size and highlights do not apply,** the ⌘P notice sheet, the Print
  control's label and hint, the answer key's heading, and the sheet's masthead and colophon: yours, in
  English (chrome copy is English-only, D36 (4)). Today's strings are REFERENCE below.
- **The system README's content rules:** sentence case, no exclamation marks, no emoji, "…" for
  pending, "→" on links that move you on; empty states say what is missing and the one thing that
  fills it.
- **Log every string you write** in `build-prompt.md`.

### Edge cases

- a legacy chapter between native ones; an all-legacy book; a loose legacy document;
- a document shorter than the screen; a very long one (a 20-minute read);
- a self-darkening document under the sepia theme; a light-only one under dark;
- a legacy pair with a lagging translation; an older version; a document at v3;
- an anchor missing in the other language (the position falls back to the nearest preceding id, else
  the fraction);
- the longest real title in the bar at 390; a Korean title in the bar;
- a slow relay; a missing body; a private document's address;
- on paper: a figure row that does not fit the column; a table across two pages; a long unbreakable
  line of code; a wide ASCII drawing; a collapsed callout; a chapter with twenty quiz items.

### Never on the canvas

- glide-ilab or base material;
- arb_upbit_1's strategy content;
- secrets, keys, emails or any personal data.

## The product today (REFERENCE, read on 2026-10-20)

Data about what exists, never a proposal. Paths are under `web/src/`; copy is in
`content/documents.ts`.

- **The document view** (`app/(public)/documents/[id]/document-view.tsx`), reached at `/documents/{id}`
  and the pretty URL `/@{org}/{project}/{slug}`:
  - **members** see it inside the app shell, under a bar of "All documents" (back), Copy link, Export
    PDF, Full width and, on the id route, Delete;
  - **the signed-out** see it in the public shell (the logo and "Sign in", **forced light**), with only
    Export PDF and Full width;
  - the head: a mono project eyebrow, the title, a mono date, and a meta strip of Project, Date, Source
    and Tags.
- **The explainer frame** (`explainer-frame.tsx`, with `lib/explainer-height.ts`): `sandbox="allow-scripts"`,
  `referrerPolicy="no-referrer"`; the document reports its height and the frame grows to it, in tiers of
  26, 32 and 40rem while it waits; a frame that never reports is held at 70rem and scrolls inside,
  with "This explainer didn't report its height, so it scrolls inside its frame. Open it full width for
  the whole page." This is the scroll fight S2 ends.
- **Loading:** "Loading explainer…".
- **Relay failures**, inside the frame's box: "Not found · 404" / "This explainer's file couldn't be
  found. Its metadata is above; the body may have been removed from the content plane."; "Error · 502"
  / "The explainer couldn't be loaded right now. Reload the page to try again." with "Reload".
- **Full width** (`?view=full`, `full-width-exit.tsx`): the chrome-less view, with the floating pill
  "Exit full width" and an Esc chip.
- **The raw relay** (`app/api/documents/[id]/raw/route.ts` and `…/versions/[v]/raw/route.ts`):
  `Content-Type: text/html; charset=utf-8`; `Content-Security-Policy: sandbox allow-scripts;
  frame-ancestors 'self'`; `X-Frame-Options: SAMEORIGIN`; `nosniff`; `no-store`.
- **An older version** (`documents/[id]/versions/[v]/page.tsx`): the title "Document version"; the
  notice "You're reading v{n} of this document. It was superseded — the current version is v{m}." with
  "Current version"; a strip of Version, Date, Superseded, Archive and Tags. The history panel's
  failure: "Couldn't load this document's history. The document itself is fine — reload to try again."
- **Not found:** by id, "Document not found" / "This document doesn't exist, or it isn't part of your
  org." / "Back to documents"; by pretty URL, "Document not found" / "This link doesn't point at a
  shared document. It may have moved, been unshared, or never existed." / "Go to knowledge".
- **Print today** (`app/kb-print.css`, `print-blocks.tsx`, `export-pdf-button.tsx`):
  - `@page { size: auto; margin: 16mm 15mm 18mm; }`; browsers do not number pages or run a header from
    it;
  - a light palette on white: paper `#ffffff`, sunken `#f4f1ea`, border `#c9c2b3`, ink `#1b1714`,
    secondary `#4a433a`, hint `#6d665a`, accent `#0a544e`;
  - chrome hidden; prose at 10.5pt / 1.5; the title at 20pt; code at 8.5pt, wrapped; headings never
    break from what follows; tables repeat their header row;
  - links print " (href)" in mono 7.5pt, except bare and `#` links;
  - **the masthead:** "knowledge", the address, "v{n}", "Printed {date}", in mono 7.5pt capitals over
    a rule;
  - **the colophon:** "knowledge · {title} · v{n} · {address}", then "Printed {date} from the knowledge
    console. The version above was current on that date; check the link for the live document." On an
    older version: "Printed {date}. This is an archived body. The current version is v{m}.";
  - under a framed explainer, on paper only: "This explainer is interactive on screen. Its quiz and
    controls do not work on paper; read it at the address above.";
  - **Export PDF** opens the print dialog ("Preparing…" while it does), with the hints "Choose Save as
    PDF as the destination. Keep headers and footers on if you want page numbers." (desktop) and "Print
    goes to the share sheet — choose Save to Files." (iOS); on failure "Couldn't open the print dialog.
    Use your browser's Print command instead — ⌘P, or Ctrl+P."
  - S2 retires `print-blocks.tsx`, `export-pdf-button.tsx` and the frame's print pinning from the
    legacy path; P30 deletes `lib/explainer-height.ts` and the parent half of `explainer-frame.tsx`.
- **The authored look** of today's explainers (the explain skill's template, `plugin/skills/explain/
  SKILL.md`): `:root { color-scheme: light dark }`; the body at most 46rem wide, `margin: 2rem auto`,
  `padding: 0 1rem`; system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; boxes on `#f4f4f4`;
  quiz feedback on `#d6f5d6` (correct) and `#f7d6d6` (incorrect). S2 measured a light `#fbfbfa` page
  across the corpus, with 18 of 41 documents switching to their own dark scheme.
- **Themes:** the signed-in app follows the operating system, with no toggle and no sepia; the public
  shell stays light. The signed reader follows its own setting.

## The system inventory

- **Title: `knowledge`**, as the Design System Artifact shows it. Copy it into `canvas.json`'s
  `designSystems` record, pinned at the version below.
  - Namespace: `kb`.
  - Artifact: https://claude.ai/artifact/7qemgwHNsoPNf5kYHEJ4md, version `1792321604-e214`
    (`design.json`).
  - On 2026-10-20 the system's files were read back, and they are byte-identical to the cache. The newer
    version id the system shows is the app saving on open.
- **Cached at `jobs/09-legacy-and-print/canvas/project/ds/kb/`:** `tokens.css`, `tokens.json`,
  `README.md` and `fonts/` (Fraunces, Source Sans 3, JetBrains Mono). Read the README first: its
  colour, type, layout, states and content rules bind.
- **Components: none.** No bundle ships, so there is no `x-import`. Every component this job needs is a
  **component gap**: draw it as markup on its own board and log it. Where the product already has one,
  match its values: buttons in `web/src/components/ui/app-button.tsx`, and the reader's and wave 2's
  parts as signed.
- **The reader's values** (Literata, Noto Serif KR, the five sizes, sepia, the reader's chrome tokens)
  and the blocks' values are reader-scoped on the canvas, in the snapshots' CSS. They are not in the
  system yet (each build prompt → *Values P30 adds to the code*).
- **Known gaps this job meets:**
  - no legacy chrome bar and no framed full-screen layout;
  - no print sheet for the reader's blocks (the diagrams' print tones are the one signed print value);
  - no sepia outside the reader;
  - no Hangul face in the system cache (the canvas loads Noto Serif KR from Google Fonts CSS, as the
    reader does; the interface falls back to the system's Hangul fonts).

## Constraints

- **Viewports** (from `## Operator Runtime`): phone 390×844; iPad 820×1180 portrait and 1024×768
  landscape; desktop 1280–1440 wide, with 1440×900 as the reference.
- **Devices:** iPhone and iPad in Safari and Chrome, and Mac Chrome. The frame as the only scroller
  under `100dvh` (with the URL bar shown and hidden), momentum scrolling in it, the home-indicator
  strip, and print to PDF from Safari and Chrome are named P30 device checks (D36 (7)); draw for them.
- **The sandbox** (S2): `allow-scripts allow-popups allow-popups-to-escape-sandbox`, never
  `allow-same-origin` and no top navigation. The parent sees only the bridge's messages: it cannot read
  the document, its selection, its taps or its colours.
- **The accessibility floor:**
  - text ≥ 4.5:1, and large text and UI ≥ 3:1, in every theme, measured;
  - `kb-hint` never used for text a reader needs;
  - the system's focus ring (`kb-focus-w` in `kb-accent`);
  - targets of at least 44 px (`kb-tap`) below 40rem;
  - a state never shown by colour alone;
  - `prefers-reduced-motion` respected;
  - every control operable by keyboard, the frame included.
- **Korean (S2):** under `:lang(ko)`, `word-break: keep-all; overflow-wrap: anywhere; line-break:
  strict`, with a Hangul face before the generic fallback, on screen and on paper.
- **Layout:** the system's breakpoints (40, 64 and 90rem), on the reader's size container. The page
  never scrolls sideways at any width.
- **No icon set and no emoji** (README). Use words and the text marks `·`, `…` and `→`.

## Locked vs. in play

### Locked

- **The signed reader and wave 2,** whole, on screen: the reader's chrome parts and their words, the
  sheets, the notices, the chapter list, Sign in to save, the legacy bookmark control and its line.
- **The data contracts** (`phase.md` → S2 and S3): the frame as the only scroller; nothing measured;
  the sandbox; the bridge's three messages; the legacy position, restore and finished rule; bookmarks
  as positions; no highlights, notes or quiz results in a legacy document; the native sheet's rules;
  the Print control opening the original in a new tab; the ⌘P notice sheet.
- **The legacy document's own look** (D36 (9)).
- **The system's structure and brand spirit:** "A calm editorial library: warm paper, charcoal ink, one
  deep teal, and hairlines instead of boxes"; one interactive accent; no icon set.
- **The copy rules and the accessibility floor.**

### In play

- The legacy chrome bar: what it holds, how slim, how it hides and returns, where the bookmark control,
  its line and the "doesn't apply here" note sit.
- Progress, resume and finishing in the legacy reader; the version and translation notices there.
- The loading and failure states inside the frame's area.
- The native print sheet: the masthead, the colophon, the answer key, the blocks on paper.
- The legacy Print control's hint and the ⌘P notice sheet.

A value that would change the app's own light or dark tokens is logged as a proposed system change in
`result.md` and `build-prompt.md`, never applied silently.

## Collected taste

### The operator's answers to the three taste questions

Asked at P29.S4's opening, on 2026-10-18, quoted literally:

1. The mood wanted for long reading: **"good."**
2. Readers they like (Apple Books, Kindle, Readwise Reader, iA Writer, anything else): **"kindle
   like"**
3. Anything to avoid: **"non"**

**How they read against the record** (the orchestrator's note, not the operator's words): "good." names
no new mood; "kindle like" makes Kindle the one reference for the reading feel; "non" names nothing to
avoid.

### This phase's own words

From `intent.md`, 2026-10-17, verbatim:
- "I want it to be work like E book reader."
- "I want more refined diagrams, mobile, ipad friendly, image available, multi column image or diagram
  input also possible, and more quizs available etc.."

### The rounds' words (P29.S4, P29.S5)

- The reader's sign-off, 2026-10-20: "everything looks good. moveon".
- Wave 2's sign-off, 2026-10-20: "accept", which settled every open item as drawn.

### Earlier words

Design memory under `web/design/rounds/`, read only:
- 2026-09-21, `04-console-surfaces/handoff.md:57-58`: "need mobile, tablet, and pc view upgrade".
- 2026-09-21, `06-document-views/SIGNOFF.md:35-36`: every open question in round 06 was answered "decide
  for me". This job still logs its calls as open questions.
- **Paraphrased only, not the operator's words:** round 06's handoff (`06-document-views/handoff.md:56-58`)
  records that the operator asked for the chrome-less HTML view and Export PDF that today's document
  view ships. On the legacy path, S2's full-screen frame and its Print control take their place.
- 2026-07-18, `01-landing/SIGNOFF.md:8-17`, a design session's summary that the operator relayed: "It
  extends the calm editorial library (teal-only, warm paper/charcoal, Fraunces/Source Sans/JetBrains
  Mono); no new brand."

### The established look

- The system's character, from its README's opening: "A calm editorial library: warm paper, charcoal
  ink, one deep teal, and hairlines instead of boxes. … Draw every surface as if it were a well-set page
  first and an app second."
- **The signed reader's chrome** is the established look of reading, and this job's frame.

## Direction

- **`new visual direction: no`** (the line at the top): this job extends the signed reader, wave 2 and
  the system. From the confirmed intent: "P27's design system went live with P28 and is the starting
  point, not something to replace wholesale. Reader typography and themes are in play." (`intent.md`).
- **One direction.** The operator asked for no options. Draw one, and log the open calls.

## Open questions, posed back

Draw your own answer to each, in the one direction, and log it under `open_questions` for the operator.
Only the operator's words settle them.

1. **The legacy bar against the reader's two bars.** S2 asks for one slim bar holding back, the title,
   previous and next, the chapter list, the language switch, versions and Print; the signed reader has a
   top bar and a chapter bar. Which bars the legacy reader keeps, what hides while the frame scrolls,
   and how a hidden bar comes back when the bridge reports no taps (adding a message to the bridge is a
   contract change; log it as a departure if you draw one). Flagged.
2. **Where the bookmark control, its signed line and the "doesn't apply here" note sit,** and how the
   note and the signed line read together. The signed line's words do not change. Flagged.
3. **Mark as finished and Mark as unread** in a legacy document, which has no chapter end of the
   reader's: where they live and what they say. Flagged.
4. **The resume pill, the restored position and progress** in the legacy reader (the reader's progress
   line and "Chapter N of M · P%" are driven by the window's scroll; here the bridge's fraction is the
   only signal). Flagged.
5. **The older-version and older-translation notices** without a chapter opening to hold them (the
   reader's §5 places them there), and the "Older version · vN" tag. Flagged.
6. **The bar's theme over the document's own look.** A light-only document under the dark or sepia
   bar; a self-darkening one under a reader theme that differs from the operating system's. Whether
   the reader's Light or Dark choice should steer a self-darkening document through the frame's
   `color-scheme` (choosing between the document's own two looks, never restyling it; whether browsers
   honour it is a P30 device check, D36 (7)), or the document always follows the operating system. And
   what the Display sheet offers here. Flagged.
7. **The native sheet:**
   - the masthead and colophon (today's say "from the knowledge console", and the reader is not the
     console);
   - the answer key's place, form and contents;
   - whether a member's saved quiz answers, highlights and notes print (S2 is silent);
   - a collapsed callout, a wide table, a wide ASCII drawing, a figure row at paper width;
   - the faces and sizes on paper (today's sheet sets prose at 10.5pt / 1.5 and the title at 20pt).

   Flagged.
8. **The ⌘P notice sheet's words, and the Print control's label and hint** (today's Export PDF hints
   are REFERENCE). Flagged.
9. **A legacy document opened from the console** (`/documents/{id}`, a member's Documents list): does
   it open in the legacy reader's chrome, and where does Back go — the book, the library, or the
   console's list? Flagged.

## Paths

- **Runtime:**
  `/private/tmp/claude-502/-Users-sugang-projects-personal-knowledge/f0010d83-1939-47da-8f62-5ffe37557260/scratchpad/artifact-files/2b6493f4-c4bb-4fd9-ab1a-2396dd8a3de3/artifact-type/dc-runtime.js`
- **Type references:**
  `/private/tmp/claude-502/-Users-sugang-projects-personal-knowledge/f0010d83-1939-47da-8f62-5ffe37557260/scratchpad/artifact-files/2b6493f4-c4bb-4fd9-ab1a-2396dd8a3de3/`,
  holding `SKILL.md` and
  `artifact-type/reference/{format,craft,design-system-components,view-state,diagrams,print}.md`
  (`print.md` for drawing paper)
- **System namespace:** `kb`

## Required output

- **The canvas tree** under `jobs/09-legacy-and-print/canvas/project/`, passing
  `design-check 09-legacy-and-print`.
- **`rounds/01-legacy-and-print/result.md`**, holding:
  - the intent lines and the plan;
  - what was designed;
  - the data used;
  - every file copied from a signed round, and every signed part the legacy reader's version differs
    from, with the difference;
  - what you assumed at each seam with the sibling jobs;
  - every departure from this handoff;
  - the open questions;
  - the component gaps;
  - the measured contrast of every text and state colour you add, in light, dark, sepia and print.
- **`rounds/01-legacy-and-print/build-prompt.md`**, complete enough to build from without inventing
  anything:
  - the legacy page's layout at each width, the bar and every control in it, the hide-and-show rules,
    the safe areas;
  - the bridge messages each part reads or sends, mapped to S2;
  - resume, progress, finishing, bookmarks, languages and versions, mapped to S3;
  - loading, relay failure, not found, signed out;
  - the native print stylesheet: every block on paper, the answer key, the masthead and colophon, page
    breaks, the Korean sheet;
  - the legacy Print control and the ⌘P notice sheet;
  - every string you wrote.

  The state bar and every stand-in are canvas-only, never something to build.
