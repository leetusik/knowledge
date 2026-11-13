# Handoff — job `07-book-page`, round `01-book-page` (slice P29.S6)

new visual direction: no

critique: critic

This is the drafter's whole brief and the critic's yardstick for this job's first round. The
orchestrator wrote it on 2026-10-20 from the record:
- the P29 contracts (`works/phases/active/P29/phase.md` → `## Decisions`), chiefly S1 *Book*,
  *Chapter*, *Versions × variants*, *Phase or slice → chapter* and *Compatibility*, and S3 *Who keeps
  state*, *Resume and progress*, *Routes and writes* and *Privacy*;
- the operator's answer to `## Operator Questions` 12, "yes to both" (`## Decisions` → *One-article
  subjects and the two clears*);
- the signed reader and the signed wave 2 (`## Decisions` → *The signed reader* and *The signed chapter
  blocks and annotations*);
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
- **Who reads.** The operator, a solo developer, reading their own books on iPhone, iPad and a Mac, in
  long sessions, coming back days later; and anyone reading a public book while signed out.
- **Where this job sits.** The book page, `/@{org}/{project}/books/{book}` (S1 *Compatibility*: four
  segments, so it never collides with a document's three-segment address). It is where a book is
  seen whole: its chapters in order, how far the reader is through it, where to pick up, each
  chapter's languages and versions, and the way to the reader's notes in it.
  - **The signed reader points here.** Its back link ("‹" and the book title from 40rem, "‹ Book"
    below) and "Back to the book →" on a book's last chapter go to the book page.
  - **The library's book cards** (`06-library`) open it.
  - **Members and the signed-out alike** see it: it is public-gated by its project, like every page of
    a book.
- **No book page exists today.** Today a document opens alone in the console's document view
  (REFERENCE, *The product today*).
- **The operator's words that shaped this job's scope**, verbatim:
  - From the intent, 2026-10-17: "I want it to be work like E book reader." and "bookmark(where you
    left), more easy to another chapter good.  may help."
  - At wave 2's stop, 2026-10-20, to the recommendation that this job draw "clear this book's reading
    data" behind a confirmation (entry 12): "yes to both".
- **Reading state is private** to its reader (S3 *Privacy*): no owner, org member or other reader ever
  sees another reader's progress.

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

- **Every element of them is locked.** This job draws a new surface around them and never moves,
  restyles or drops a signed element. Where a signed part fits this job unchanged, use it unchanged.
  Where it does not fit, leave it as signed, log the need as a departure and an open question, and the
  operator decides.
- **REFERENCE, read as data:** each signed round's snapshot `canvas/project/` and its `build-prompt.md`
  (the implementation contract, complete on its own), under `docs/reference/design/jobs/`:
  `01-reader/rounds/02-revise/`, `02-figures/rounds/01-figures/`, `03-diagrams/rounds/01-diagrams/`,
  `04-quiz/rounds/01-quiz/` and `05-annotations/rounds/01-annotations/`.
- **What this job draws in and never re-litigates** (each detailed in the reader's build prompt):
  - **the faces:** Literata with Noto Serif KR for reading; Fraunces with Noto Serif KR for display;
    Source Sans 3 with Pretendard for the interface; JetBrains Mono, ligatures off;
  - **themes:** System, Light, Dark and Sepia. Light and dark are the system's values; sepia is
    reader-scoped (build prompt → *Themes*). Whether sepia reaches this page is open question 1;
  - **the chapter list** (§11, `ChapterList`): the reader's own list of a book's chapters, in its
    Contents sheet and at a chapter's end. Each row is a number, the title in its own `lang` and a meta
    line: "Not started", "Started · 38%" ("Started" alone at 0%), "Finished", "Finished" with the accent
    tag "UPDATED" (finished on an older version than the newest), a legacy chapter's state with the plain
    tag "ORIGINAL LAYOUT", and "Reading now" on the current chapter. Signed out: no state words and no
    counts. Totals read "X of M finished", or "M chapters" signed out. Whether the book page uses this
    list as signed, or a list of its own in the same words, is yours (open question 5);
  - **the language names** "English" and "한국어", each in its own `lang`; the version words of §5 and
    §14 ("vN", "Current", "Published <date>", "Translated from English v1", "OLDER TRANSLATION");
  - **Sign in to save** (§12), the one reusable pattern: `what` = "finished chapters and your place in
    each one" | "bookmarks" | "highlights and notes" | "quiz answers"; `place` = "chapter" | "document";
    `raised`, `onSignIn`, `onDismiss`. Its body reads "Signed in, your {what} are kept across your
    devices. After you sign in, you come back to this {place}, at this section." Reuse it only where it
    fits unchanged, changing only `what`; a book page is neither a chapter nor a section, so where its
    sentence does not fit, log what you use instead as a departure and an open question, and never
    change §12;
  - **the reader's loading, not found and failed states** (§16), and its sheets (§15);
  - **the per-book list** (`05-annotations` → `BookNotes`, board 04): "Notes in this book", its filter
    and its rows, signed. Its own top bar has the logo (to the library) and "‹ Back to the chapter";
    its build prompt leaves "its entry on the book page" to wave 3. This job draws that entry;
  - **the stand-ins** for other jobs' screens (`Elsewhere.dc.html` in the reader's snapshot): copy it
    and add the kinds this job needs. A stand-in is canvas-only.
- **Copy what you need** from the snapshots into this job's tree, unchanged in look and behaviour, and
  list every copied file in `result.md`. Never write to a snapshot.

## Scope

### This job: the book page, one surface

Everything here is drawn at phone, iPad and desktop, in **light, dark and sepia** (the cut's rule for
every wave-3 job; which theme rule applies at runtime is open question 1).

1. **The book's head** (S1 *Book*): `title`; `kind` (`codebase` | `subject`); `subject`, a display
   label required on a subject book and optional on a codebase book; `description?`; its project, and
   its org on the public view; how many chapters. For a member:
   - **book progress** = finished chapters ÷ **every** chapter in the manifest, whatever its format or
     languages; Updated counts as finished (S3);
   - **this book's Continue reading** = "the most recently updated position among its chapters" (S3),
     a query over positions (`GET books/{org}/{project}/{book}` returns per-chapter state, resume, book
     progress and the continue pointer).
2. **The ordered chapter list** (S1 *Chapter*): in `position` order, ties broken by `key`; each
   chapter's `title` (an override, else the shown variant's document title), its `variants` (`{lang,
   version, format, updated_at, translated_from?}`) and its `source` (`phase`, or `phase` and `slice`);
   for a member, its state (S3: `unopened`, `started`, `finished`, and Updated).
3. **The shapes a book takes** (S1 *Phase or slice → chapter*; the S6 notes):
   - a **codebase guide** (the knowledge guide, 5 chapters);
   - a **20-chapter book with a preface-like chapter at position 20** ("Reading guide: how to use this
     book"). S1: "The book page could promote it to position 0; that is a design call, not a model
     one." The model keeps position 20;
   - a **`phases` book**: key `p<N>`, position N, title "P<N>: <phase name>", `source.phase`, so the
     positions have gaps (8, 9, 17, 24), and **a joint explain** is one chapter keyed `p<N>-p<M>`;
   - a **per-slice book**: book `p<N>`, title "P<N>: <phase name>", keys the slice ids lowercased
     (`s1`, `s2`, `f1`), positions the slices' order, `source.slice`. None exists yet;
   - an **all-legacy book**.
4. **Legacy and native chapters side by side** (S2 *Legacy path*: every `html` chapter opens in the
   legacy reader; the format can differ per variant and per version).
5. **Each chapter's KO/EN variants and versions** (S1 *Versions × variants*: each variant has its own
   version chain; a translation may record `translated_from: {lang, version}`, which flags a stale
   translation).
6. **The member and public views.** The signed-out see the book and its chapters, with no reading
   state (S3: an anonymous reader keeps only the reader-settings cookie).
7. **The per-book list's entry** (`annotations` 8): the way from this page to the signed "Notes in this
   book".
8. **"Clear this book's reading data"**, behind a confirmation (S3 *Privacy*: the reader can "clear
   one book's state"; the route is `DELETE state?scope=book`; entry 12).
9. **Loading, not found and failed.**

**Sizing.** One surface: about 5 Pages or fewer, plus their components. `design-check` warns past 6
Pages or 16 boards. How the Pages divide the states is your call.

### The sibling jobs, drafting beside you (wave 3, P29.S6)

Each writes only its own folder under `docs/reference/design/jobs/`. You may read a sibling's tree; it
is a draft in progress, not signed.

- **`06-library`** (critic+judge): the member's library by project and by subject, Continue reading
  overall, book cards, the public org library `/@{org}`, the app shell's Library and Review entry
  points, and "clear all reading data".
- **`08-review`** (critic): the review surface (queue header, cards, Again / Good, done for today,
  empty).
- **`09-legacy-and-print`** (critic): the legacy reader for HTML documents, and every print sheet.

**Where this job meets them:**
- **The library's book card opens this page.** Book progress reads the same on both: "X of M
  finished". The overall Continue reading is `06-library`'s; this book's is yours.
- **The two clears are one family.** Yours clears one book; `06-library`'s clears everything. If the
  two confirmations differ in form or words, the critic reports it as a wave choice.
- **The page frame.** Whether the book page sits in the reader's chrome, in the app shell (members) and
  the public shell (the signed-out) as today's document view does, or in a frame of its own (open
  question 2) is the same question for the library and the review page. A conflict reaches the
  operator as a wave choice.
- **A legacy chapter** opens the legacy reader (`09-legacy-and-print`), whose back link returns here.
- **This book's review cards** (S3's queue counts carry `by_book`): whether this page shows them is a
  seam with `08-review` (open question 9).

Say in `result.md` what you assumed at each seam. The critic compares the wave's jobs.

### Not this job

- **The signed reader** (opening a chapter) and **wave 2's blocks and annotations**, the per-book list
  itself included; this job draws only its entry.
- **`06-library`, `08-review`, `09-legacy-and-print`** (above).
- **Editing a book.** Manifests are written by publishes and `PUT /api/books/{project}/{book}` (S1);
  no screen edits a book, reorders chapters or binds documents.
- **The console, auth, graph and landing:** unchanged.

## Screens × states

**Prototype first.** Every state below must be reachable on an interactive Page: by a click or, where
no click reaches it, by that page's state bar.

Each state carries a one-line check the critic holds it to. Every state is drawn at phone (390×844),
iPad (820×1180) and desktop (1440×900), in light, dark and sepia; add iPad landscape (1024×768) where
the layout changes there. The critic checks all three themes.

### The member's view

- **The knowledge guide, 2 of 5 finished:** chapter 1 finished, chapter 2 started at 38% in "The write
  path", chapter 5 finished on v2 and Updated since. Check: the head's progress, each row's state and
  Continue reading agree with each other and with the reader's words for the same data.
- **Tidewater, 20 chapters,** 10 finished, with the reading guide at position 20. Check: all 20 rows
  are reachable on a phone without losing the head; the reading guide follows your answer to open
  question 3.
- **`lantern`'s phases book:** all legacy; positions 8, 9, 17 and 24; one chapter for P17 and P18; P8
  in English and 한국어. Check: the numbering follows open question 4; legacy reads as the reader's
  "ORIGINAL LAYOUT", never as broken; the joint chapter reads as one chapter.
- **`lantern`'s per-slice book, `p24`** (S1, S2, S3 and F1). Check: it reads as one phase's slices,
  not as a broken phases book.
- **`orchard`'s guide, all legacy and never opened.** Check: "Not started" everywhere, with nothing
  empty left behind.
- **Variants and versions:** the knowledge guide's chapter 2 (English v2 and v1; 한국어 v1 translated
  from English v1, an older translation), its chapter 5 at v3, and `lantern`'s P8 (legacy English v2
  and 한국어 v1). Check: a reader can tell which languages exist and which is out of date, and can open
  each; it follows open question 5.
- **This book's Continue reading:** started, every chapter finished, and never opened. Check: it opens
  the chapter at its saved section; it follows open question 6.
- **Every chapter finished, one Updated.** Check: the book reads finished, and the Updated chapter can
  be found.
- **The per-book list's entry,** with items and with none. Check: it opens the signed list; it
  follows open question 7.
- **Long titles:** the longest real title, and the Korean title, at 390. Check: titles wrap whole,
  Korean with `keep-all`; nothing scrolls sideways.
- **Loading, not found and failed.** Check: one consistent pattern (the reader's §16 or the system's,
  stated); a missing book and one private to this reader read the same (404-never-403).

### Clear this book's reading data

- **The control,** where you place it (open question 8). Check: it is findable but never next to an
  everyday action, and it says what it does.
- **The confirmation.** Check: it names the book and what goes for it alone (S3: the reader's places
  and progress, bookmarks, highlights and notes, quiz answers and review cards from this book's
  chapters) and what stays (every other book, the documents themselves, display settings on this
  device); the destructive action is never the default focus; nothing is cleared without the second
  press; Escape or Cancel leaves everything as it was.
- **Clearing** (pending), **cleared,** and **failed.** Check: the pending label follows the system's
  rule (the verb plus "…"); once cleared the book reads "Not started" everywhere and its Continue reading
  is gone, with a line saying so; a failure says nothing was cleared.

### The public view

- **A public book, signed out.** Check: no reading state, no clear and no per-book list; the count
  reads "M chapters"; Sign in follows open question 10.
- **A signed-in reader from another org,** on a public book (S3 gives them the same features). Check:
  they see their own progress, and nothing of anyone else's.
- **A private book's address, signed out.** Check: the constant 404, exactly as a missing book.

## Every link and where it goes

Every link stays in the prototype: `design-check` fails `check=leaves-canvas` on an absolute URL.

- **A native chapter** → the signed reader at that chapter (stand-in: "Reader — signed (`01-reader`)",
  naming the chapter, and the section when it resumes).
- **A legacy chapter** → the legacy reader (stand-in, "`09-legacy-and-print`").
- **A language or a version** → the reader stand-in naming `?lang=` or `?v=`, or the legacy reader's
  for a legacy variant.
- **Continue reading** → the reader stand-in at the saved section.
- **The per-book list's entry** → the signed "Notes in this book", copied unchanged from the
  `05-annotations` snapshot, or a stand-in naming it.
- **The library** (the logo, a back link) → the library stand-in ("`06-library`").
- **Sign in** → the Sign in stand-in, copied from the signed reader.
- **"Clear this book's reading data"** → its confirmation, on this canvas.
- **This book's review cards,** if you draw them → the review stand-in ("`08-review`").

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

### This job's books, in detail

- **The knowledge guide**, as the signed reader's `reader.js` holds it: chapter 1 v1 (8 Aug 2026);
  chapter 2 English v2 (12 Oct 2026) and v1 (8 Aug 2026), 한국어 v1 (20 Aug 2026, translated from
  English v1, so an older translation; its title "지식 시스템의 내부: 콘텐츠 평면, 쓰기 경로, 그리고 계약");
  chapters 3 and 4 v1; chapter 5 v3 (14 Oct 2026; v2 2 Sep 2026, v1 8 Aug 2026). A guide series has no
  `source`.
- **Tidewater:** the reader's 20 titles; chapter 7, "Datums: Chart Datum, Mean Sea Level, and the
  Conversions Between Them", legacy; chapter 10 at v2; chapter 20 the reading guide.
- **`lantern`'s phases book:** invent the phase names; `source.phase` P8, P9, P17 (the joint chapter
  covers P17 and P18) and P24; P8's English v2 and 한국어 v1, both legacy.
- **`lantern`'s per-slice book `p24`:** four chapters keyed `s1`, `s2`, `s3` and `f1`, with
  `source.slice` P24.S1, P24.S2, P24.S3 and P24.F1; invent the titles; native.
- **`orchard`'s guide:** four legacy chapters at v1; invent the titles.
- **The member's progress:** the signed reader's for the knowledge guide and Tidewater (its `reader.js`
  → `progress`): the knowledge guide 2 of 5 finished, chapter 2 started at 38% in "The write path",
  chapter 5 finished on v2 and Updated since; Tidewater 10 of 20 finished (chapter 10 Updated since),
  chapter 11 started at 46%, chapter 12 at 12%. Invent the rest, realistically.
- **Visibility:** the knowledge guide's project is public on this canvas, for the public view; at least
  one other project is private.
- **A signed-in reader** is an invented name with no email.

### Copy

- **The contract's and the signed reader's words:** the progress words, "UPDATED", "ORIGINAL LAYOUT",
  "Reading now", "X of M finished", "M chapters", the language names, "Continue reading", and the
  annotations' "Notes in this book".
- **"Clear this book's reading data"** is the record's name for the action (entry 12); its
  confirmation's words are yours.
- **The system README's content rules:** sentence case, no exclamation marks, no emoji, "…" for
  pending, "→" on links that move you on; empty states say what is missing and the one thing that
  fills it.
- **Other copy** is yours, in English (chrome copy is English-only, D36 (4)); log every string in
  `build-prompt.md`.

### Edge cases

- a 20-chapter book on a phone; a preface-like last chapter;
- positions with gaps; a joint chapter; a per-slice book;
- a chapter in two languages with a stale translation; a chapter at v3; a legacy pair;
- every chapter finished; one Updated; never opened;
- the longest real title; a Korean title;
- signed out; a signed-in reader from another org; a private book's address.

### Never on the canvas

- glide-ilab or base material;
- arb_upbit_1's strategy content;
- secrets, keys, emails or any personal data.

## The product today (REFERENCE, read on 2026-10-20)

Data about what exists, never a proposal. Paths are under `web/src/`.

- **No book page and no chapter route exist.** A document opens alone, at `/documents/{id}` or its
  pretty URL `/@{org}/{project}/{slug}`, both through `DocumentView`
  (`app/(public)/documents/[id]/document-view.tsx`).
  - **Members** see it inside the app shell, under a bar of "All documents" (back), Copy link, Export
    PDF, Full width and, on the id route, Delete.
  - **The signed-out** see it in the public shell (a topbar with the logo and "Sign in", **forced
    light**), with only Export PDF and Full width.
- **Version history today** is a panel under the document: a table of Version ("Current" on the live
  row), Title and Superseded, with "View v{n}" on each older row. An older version shows "You're reading
  v{n} of this document. It was superseded — the current version is v{m}." The signed reader replaces
  this for native chapters with its Version history sheet (§14).
- **Destructive confirmations today:** inline and two-step, never a modal: the button is replaced by a
  prompt, an autofocused "Cancel" and a danger confirm. Delete document: "Delete permanently? This
  can't be undone." / "Cancel" / "Yes, delete" / "Deleting…".
- **States** (`components/states/`): `Editorial` (a mono code, a title, a sub line, actions), `Skeleton`
  and `ErrorRef`. Copy: "Not found · 404", "Error · 500", "Something on our side stopped reading.",
  "Try again", "Loading…".
- **Themes:** the signed-in app follows the operating system, with no toggle and no sepia; the public
  shell stays light.

## The system inventory

- **Title: `knowledge`**, as the Design System Artifact shows it. Copy it into `canvas.json`'s
  `designSystems` record, pinned at the version below.
  - Namespace: `kb`.
  - Artifact: https://claude.ai/artifact/7qemgwHNsoPNf5kYHEJ4md, version `1792321604-e214`
    (`design.json`).
  - On 2026-10-20 the system's files were read back, and they are byte-identical to the cache. The newer
    version id the system shows is the app saving on open.
- **Cached at `jobs/07-book-page/canvas/project/ds/kb/`:** `tokens.css`, `tokens.json`, `README.md` and
  `fonts/` (Fraunces, Source Sans 3, JetBrains Mono). Read the README first: its colour, type, layout,
  states and content rules bind.
- **Components: none.** No bundle ships, so there is no `x-import`. Every component this job needs is a
  **component gap**: draw it as markup on its own board and log it. Where the product already has one,
  match its values: buttons in `web/src/components/ui/app-button.tsx`, and the reader's parts as
  signed.
- **The reader's values** (Literata, Noto Serif KR, the five sizes, sepia, the reader's chrome tokens)
  are reader-scoped on the canvas, in the snapshot's `reader.css`. They are not in the system yet
  (reader build prompt → *Values P30 adds to the code*).
- **Known gaps this job meets:**
  - no book head and no book progress outside the reader;
  - no list of variants and versions outside the reader's sheets;
  - no sepia outside the reader;
  - no Hangul face in the system cache (the canvas loads Noto Serif KR from Google Fonts CSS, as the
    reader does; the interface falls back to the system's Hangul fonts).

## Constraints

- **Viewports** (from `## Operator Runtime`): phone 390×844; iPad 820×1180 portrait and 1024×768
  landscape; desktop 1280–1440 wide, with 1440×900 as the reference.
- **Devices:** iPhone and iPad in Safari and Chrome, and Mac Chrome. Respect the safe areas.
- **Who sees what (S3):** a signed-in reader, member or not, gets the same features; a signed-out
  reader keeps only the reader-settings cookie, and nothing merges on sign-in (Q6's working
  assumption).
- **Privacy (S3):** reading state is never shown to anyone but its reader.
- **The accessibility floor:**
  - text ≥ 4.5:1, and large text and UI ≥ 3:1, in every theme, measured;
  - `kb-hint` never used for text a reader needs;
  - the system's focus ring (`kb-focus-w` in `kb-accent`);
  - targets of at least 44 px (`kb-tap`) below 40rem;
  - inputs at 16 px;
  - a state never shown by colour alone;
  - `prefers-reduced-motion` respected;
  - every control operable by keyboard.
- **Korean (S2):** under `:lang(ko)`, `word-break: keep-all; overflow-wrap: anywhere; line-break:
  strict`, with a Hangul face before the generic fallback; each title in its own `lang`; Hangul runs
  inside English wrapped in `lang="ko"` (reader §6a).
- **Layout:** the system's breakpoints (40, 64 and 90rem), on whichever container your frame uses (the
  shell's `kbmain`, or the reader's `rd`). The page never scrolls sideways at any width.
- **No icon set and no emoji** (README). Use words and the text marks `·`, `…` and `→`.

## Locked vs. in play

### Locked

- **The signed reader and wave 2,** whole: its chapter list's words, its sheets, its states, Sign in to
  save (changing only `what`), and the signed per-book list.
- **The data contracts** (`phase.md` → S1 and S3): position order, the chapter's fields, independent
  version chains per variant, `translated_from`, book progress over every chapter, the per-book
  Continue reading, what "clear one book" removes, privacy.
- **The system's structure and brand spirit:** "A calm editorial library: warm paper, charcoal ink, one
  deep teal, and hairlines instead of boxes"; one interactive accent; no icon set.
- **The copy rules and the accessibility floor.**

### In play

- The page's layout and frame, its head, its chapter list, and how variants and versions show.
- The preface-like chapter, and numbering in phases and per-slice books.
- The per-book list's entry, and the clear-this-book control and its confirmation.
- The public view.

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
- "bookmark(where you left), more easy to another chapter good.  may help."
- "good. but fixed column width."

### The rounds' words (P29.S4, P29.S5)

- The reader's sign-off, 2026-10-20: "everything looks good. moveon". Round 01's taste notes were not
  taken up; round 02's were signed as drawn, among them the chapter list's word "Started" for a chapter
  marked unread.
- Wave 2's sign-off, 2026-10-20: "accept", which settled every open item as drawn.
- At wave 2's stop: "yes to both" (*Product context*).

### Earlier words

Design memory under `web/design/rounds/`, read only:
- 2026-09-21, `04-console-surfaces/handoff.md:57-58`: "need mobile, tablet, and pc view upgrade" and
  "need list of documents when clicked a project".
- 2026-09-21, `06-document-views/SIGNOFF.md:35-36`: every open question in round 06 was answered "decide
  for me". This job still logs its calls as open questions.
- 2026-07-18, `01-landing/SIGNOFF.md:8-17`, a design session's summary that the operator relayed: "It
  extends the calm editorial library (teal-only, warm paper/charcoal, Fraunces/Source Sans/JetBrains
  Mono); no new brand."

### The established look

- The system's character, from its README's opening: "A calm editorial library: warm paper, charcoal
  ink, one deep teal, and hairlines instead of boxes. … Draw every surface as if it were a well-set page
  first and an app second."
- **The signed reader and wave 2** are the established look of reading, and this job's frame.

## Direction

- **`new visual direction: no`** (the line at the top): this job extends the signed reader and the
  system. From the confirmed intent: "P27's design system went live with P28 and is the starting point,
  not something to replace wholesale. Reader typography and themes are in play." (`intent.md`).
- **One direction.** The operator asked for no options. Draw one, and log the open calls.

## Open questions, posed back

Draw your own answer to each, in the one direction, and log it under `open_questions` for the operator.
Only the operator's words settle them.

1. **The theme rule for the book page,** member and public. The signed-in app follows the operating
   system, with no toggle and no sepia; public pages stay light; the signed reader follows its own
   setting (System, Light, Dark, Sepia) for every reader, signed out included. The cut asks every
   wave-3 job to draw light, dark and sepia. Draw all three, and say which rule applies at runtime, for
   members and for the signed-out. Flagged.
2. **The page's frame:** the reader's own chrome; the app shell for members and the public shell for
   the signed-out, as today's document view does; or a frame of its own. Flagged; the same question
   stands for `06-library` and `08-review`.
3. **The preface-like chapter at position 20:** shown in place, or promoted to the front of the list
   (S1 calls this a design call; the model keeps position 20). Flagged.
4. **Numbering:** what a row's number shows in a phases book (positions are phase numbers, with gaps
   and a joint chapter) and in a per-slice book (keys are slice ids). The reader counts in manifest
   order ("CHAPTER 2 OF 5"). Flagged.
5. **Variants and versions on the page:** how much each row shows (languages, versions, a stale
   translation), and where choosing a language or a version goes (the reader at `?lang=` or `?v=`).
   And whether the rows are the reader's signed list (§11) or a list of your own in the same words.
   Flagged.
6. **This book's Continue reading:** what it shows, and what takes its place on a finished book and on
   a book never opened. Flagged.
7. **The per-book list's entry:** where it sits, whether it carries a count, and where the signed
   list's "‹ Back to the chapter" returns when the list was opened from here. Flagged, without changing
   the signed list.
8. **"Clear this book's reading data":** where it sits, and what its confirmation says goes and stays.
   Flagged.
9. **This book's review cards:** whether the page shows them (cards due from this book), a seam with
   `08-review`. Flagged.
10. **The public view:** what a signed-out reader sees in place of progress, and where Sign in sits.
    §12's sentence ends "at this section", and a book page has none. Flagged.
11. **The book's description and subject label:** where they show; a codebase book usually has neither.
    Flagged.

## Paths

- **Runtime:**
  `/private/tmp/claude-502/-Users-sugang-projects-personal-knowledge/f0010d83-1939-47da-8f62-5ffe37557260/scratchpad/artifact-files/2b6493f4-c4bb-4fd9-ab1a-2396dd8a3de3/artifact-type/dc-runtime.js`
- **Type references:**
  `/private/tmp/claude-502/-Users-sugang-projects-personal-knowledge/f0010d83-1939-47da-8f62-5ffe37557260/scratchpad/artifact-files/2b6493f4-c4bb-4fd9-ab1a-2396dd8a3de3/`,
  holding `SKILL.md` and
  `artifact-type/reference/{format,craft,design-system-components,view-state,diagrams,print}.md`
- **System namespace:** `kb`

## Required output

- **The canvas tree** under `jobs/07-book-page/canvas/project/`, passing `design-check 07-book-page`.
- **`rounds/01-book-page/result.md`**, holding:
  - the intent lines and the plan;
  - what was designed;
  - the data used;
  - every file copied from a signed round;
  - what you assumed at each seam with the sibling jobs;
  - every departure from this handoff;
  - the open questions;
  - the component gaps;
  - the measured contrast of every text and state colour you add, in light, dark and sepia.
- **`rounds/01-book-page/build-prompt.md`**, complete enough to build from without inventing anything:
  - the page at each width: the head, the chapter list, variants and versions, Continue reading;
  - each book shape (guide, 20 chapters with a preface, phases, per-slice, all legacy);
  - the member and public views, and the misses;
  - the per-book list's entry;
  - the clear-this-book flow, with every state;
  - the view model each part needs, mapped to S1's and S3's fields and routes;
  - every string you wrote.

  The state bar and every stand-in are canvas-only, never something to build.
