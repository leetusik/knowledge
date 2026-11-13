# Handoff — job `06-library`, round `01-library` (slice P29.S6)

new visual direction: no

critique: critic+judge

This is the drafter's whole brief and the critic's yardstick for this job's first round. The
orchestrator wrote it on 2026-10-20 from the record:
- the P29 contracts (`works/phases/active/P29/phase.md` → `## Decisions`), chiefly S1 *Entities*,
  *Book*, *Compatibility* and *Phase or slice → chapter*, and S3 *Who keeps state*, *Resume and
  progress*, *Routes and writes* and *Privacy*;
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
- **Where this job sits.** The library is **the reader's home**. The signed reader's logo goes there
  ("It goes to the library, the reader's home."), and a loose document's "‹ Library" and "‹ Back to the
  library" return there. It is where a reader finds every book and loose document, picks up where they
  left off, and sees how far through each book they are. Its public twin, `/@{org}`, shows an org's
  public books and documents to a visitor who is signed out.
- **Neither exists today.** The nearest things are the console's `/documents` list (a search table) and
  the dashboard's Projects table, and `/@{org}` has no page at all (REFERENCE, *The product today*
  below).
- **The operator's words that shaped this job's scope**, verbatim:
  - From the intent, 2026-10-17: "I want it to be work like E book reader." and "bookmark(where you
    left), more easy to another chapter good.  may help."
  - At wave 2's stop, 2026-10-20: "And how we deal one article subjects? I mean the knowledge is now
    based on book and chapters. but what about 1 chapter lenght explanations and learnings? how we deal
    with it."
  - Then "yes to both" to the two recommendations (entry 12): **a one-article subject is a loose
    document** in its subject's project, carrying a `subject` label, listed by subject beside the
    subject's books; and **this job draws "clear all reading data"**, behind a confirmation.
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

- **Every element of them is locked.** This job draws new surfaces around them and never moves,
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
    reader-scoped (build prompt → *Themes*). Whether sepia reaches this job's surfaces is open question
    1;
  - **the progress words** (build prompt §10 and §11): "Not started", "Started" (with " · N%" only
    above 0), "Finished", the accent tag "UPDATED" (a chapter finished on an older version than its
    newest), the plain tag "ORIGINAL LAYOUT" (a legacy chapter), "Reading now", "X of M finished" and,
    signed out, "M chapters". A chapter marked unread reads "Started";
  - **Sign in to save** (§12), the one reusable pattern: `what` = "finished chapters and your place in
    each one" | "bookmarks" | "highlights and notes" | "quiz answers"; `place` = "chapter" | "document";
    `raised`, `onSignIn`, `onDismiss`. Its body reads "Signed in, your {what} are kept across your
    devices. After you sign in, you come back to this {place}, at this section." Reuse it only where it
    fits unchanged, changing only `what`; where its sentence does not fit (a library is not a chapter),
    log what you use instead as a departure and an open question, and never change §12;
  - **the reader's loading, not found and failed states** (§16), and its sheets (§15), as the pattern
    the reader already set for these;
  - **the stand-ins** for other jobs' screens (`Elsewhere.dc.html` in the reader's snapshot): copy it
    and add the kinds this job needs. A stand-in is canvas-only.
- **Copy what you need** from the snapshots into this job's tree, unchanged in look and behaviour, and
  list every copied file in `result.md`. Never write to a snapshot.

## Scope

### This job: the library, one surface

Everything here is drawn at phone, iPad and desktop, in **light, dark and sepia** (the cut's rule for
every wave-3 job; which theme rule applies at runtime is open question 1).

1. **The member's library, `/library`** (S1 *Compatibility*: "the member's library").
   - **Two groupings** (S1 *Book*, amended at P29.S6):
     - **by project** = `project`: each project's books (codebase books, and a subject project's
       books) plus its loose documents;
     - **by subject** = `book.subject` for a book, and the document's own `subject` for a loose
       document. A subject can hold books and loose articles; **a one-article subject is a loose
       document**. `subject` is required on a subject book and optional on a codebase book.
     - **Today's truth: no subject book exists and nothing carries a subject label**, so the library
       must look right with no subjects at all (S6 notes).
   - **Continue reading, overall** (S3 *Resume and progress*): "the most recent positions across every
     readable book and loose document", a query over positions (`GET continue?limit=`). Absent for a
     reader who has opened nothing.
   - **Book cards with progress** (S3): book progress = finished chapters ÷ **every** chapter in the
     manifest, whatever its format or languages; Updated counts as finished.
   - **Loose documents**, native, plain `md` and legacy; each keeps a position and a state like a
     chapter (S3 keys "a chapter variant and a loose document the same way").
   - **The phone loading skeleton** (D36 (6): P28 left "phone skeleton card blocks" open).
   - **"Clear all reading data"**, behind a confirmation (S3 *Privacy*: the reader can "clear **all**
     reader state (`DELETE state`)"; the route is `DELETE state?scope=all`; entry 12).
2. **The public org library, `/@{org}`** (S1 *Compatibility*: "the org's public library; the route is
   unused today"): an org's **public** projects' books and loose documents, for a visitor who is signed
   out. No reading state is shown to the signed out (S3: an anonymous reader keeps only the
   reader-settings cookie).
3. **Library and Review as entry points in the app shell.** Today's shell has three items (REFERENCE
   below). Console, auth and landing change **only where this forces it** (the cut).

**Sizing.** One surface: about 5 Pages or fewer, plus their components. `design-check` warns past 6
Pages or 16 boards. How the Pages divide the states is your call.

### The sibling jobs, drafting beside you (wave 3, P29.S6)

Each writes only its own folder under `docs/reference/design/jobs/`. You may read a sibling's tree; it
is a draft in progress, not signed.

- **`07-book-page`** (critic): the book page `/@{org}/{project}/books/{book}`, member and public, with
  its chapter list, book progress, its own Continue reading, the entry to the per-book list, and
  "clear this book's reading data".
- **`08-review`** (critic): the review surface (queue header, cards, Again / Good, done for today,
  empty).
- **`09-legacy-and-print`** (critic): the legacy reader for HTML documents, and every print sheet.

**Where this job meets them:**
- **A book card opens the book page.** Book progress reads the same on both: the reader's words, "X of
  M finished". Each book's own Continue reading is `07-book-page`'s; the overall one is yours.
- **The two clears are one family.** Yours clears everything; `07-book-page`'s clears one book. If the
  two confirmations differ in form or words, the critic reports it as a wave choice.
- **The page frame.** Whether the library sits in the app shell or in a reading chrome of its own (open
  question 2) is the same question for the book page and the review page. A conflict between the jobs
  reaches the operator as a wave choice.
- **The Review entry point is yours; the review page is `08-review`'s.** A count on the entry, if you
  draw one, reads S3's `counts.due`.
- **A legacy document or chapter** opens the legacy reader (`09-legacy-and-print`).

Say in `result.md` what you assumed at each seam. The critic compares the wave's jobs.

### Not this job

- **The signed reader** (opening a chapter, or a loose native or `md` document) and **wave 2's blocks
  and annotations**, including the per-book list of notes.
- **`07-book-page`, `08-review`, `09-legacy-and-print`** (above).
- **The console's own pages** (dashboard, documents list, project page, graph): unchanged, except
  where the entry points force a change. Deleting a document stays on the console's documents list.
- **Auth and the landing page:** unchanged, except where this job forces a change (open question 3).

## Screens × states

**Prototype first.** Every state below must be reachable on an interactive Page: by a click or, where
no click reaches it, by that page's state bar.

Each state carries a one-line check the critic holds it to. Every state is drawn at phone (390×844),
iPad (820×1180) and desktop (1440×900), in light, dark and sepia; add iPad landscape (1024×768) where
the layout changes there. The critic checks all three themes.

### The member's library

- **By project, today's library** (the shape under *Data*: 4 codebase books of 20, 5, 4 and 4
  chapters, 8 loose documents, 3 projects with no documents, no subjects). Check: every book and every
  loose document is reachable; the 20-chapter book does not crowd out the rest; empty projects follow
  your answer to open question 6.
- **By subject, today's library** (no subject book and no labels). Check: the view says plainly what
  it holds; it never looks broken or empty by mistake; it follows your answer to open question 4.
- **By subject, a library with subjects** (the invented subjects under *Data*): a subject with a book;
  a subject with a book and two loose articles; **a subject with one loose article and no book**.
  Check: a subject's loose articles sit beside its books; a one-article subject reads as a subject,
  not as a stray document or a one-chapter book.
- **Switching the grouping.** Check: the current grouping is said in words or by a pressed state, not
  by colour alone; it follows your answer to open question 5.
- **Continue reading, overall:** one item; several, most recent first; one in 한국어; a loose document;
  a legacy chapter. Check: each names its book and chapter (or its document and project) and where the
  reader left off, and opens there; it follows your answer to open question 7.
- **No Continue reading** (a reader who has opened nothing). Check: nothing empty is left behind, or
  the empty state says what fills it, in one line.
- **Book cards:** not started; started ("X of M finished"); every chapter finished; finished with an
  Updated chapter; all chapters legacy; native and legacy mixed; a book with a KO/EN pair. Check:
  progress reads in words and numbers, never by colour alone, and matches the reader's "X of M
  finished" for the same book.
- **Two books with the same slug** (`maintainer-guide`) in different projects. Check: the two can never
  be confused.
- **Loose documents:** native, plain `md` and legacy; at v1 and at v3; one in English with Korean
  terms; three that read like a series (no series exists in the model, S1). Check: each opens in the right reader; its
  state reads as a chapter's does; nothing implies a series.
- **Long and many:** the longest real title ("Shipping and Running Knowledge: Distribution, the Edge,
  Security, and the Gates"), a Korean title ("지식 시스템의 내부: 콘텐츠 평면, 쓰기 경로, 그리고 계약"), a
  project with 20 loose documents. Check: no two items read the same after any shortening; Korean wraps
  with `keep-all`; nothing scrolls sideways.
- **Loading,** at every width, the phone's card blocks included (D36 (6)). Check: the skeleton mirrors
  the layout it stands in for at that width, and is still under reduced motion.
- **Failed.** Check: the system's error rule (the shell stays, the content area speaks editorially:
  "Something on our side stopped reading.", one action, a mono reference line).
- **An empty library** (an org with no documents yet). Check: it says what is missing and the one thing
  that fills it.

### Clear all reading data

- **The control,** where you place it (open question 10). Check: it is findable but never next to an
  everyday action, and it says what it does.
- **The confirmation.** Check: it names what goes (S3: positions and progress, bookmarks, highlights
  and notes, quiz answers, review cards) and what stays (the documents themselves; display settings,
  which are a device cookie); the destructive action is never the default focus; nothing is cleared
  without the second press; Escape or Cancel leaves everything as it was.
- **Clearing** (pending), **cleared,** and **failed.** Check: the pending label follows the system's
  rule (the verb plus "…"); once cleared, every book reads "Not started" and Continue reading is gone,
  with a line saying so; a failure says nothing was cleared.

### The public org library, `/@{org}`

- **An org with public projects:** their books and loose documents. Check: no reading state, no
  member-only control, and no private project's name or count shows.
- **Signed in, but not a member,** reading another org's public books (S3 gives them the same
  features). Check: follows your answer to open question 8.
- **An org with nothing public, an unknown org, a private project's address.** Check: follows your
  answer to open question 9; nothing private is revealed (404-never-403).
- **Sign in.** Check: it goes to the Sign in stand-in, and the copy says where the visitor returns.

### The app shell's entry points

- **Desktop rail** (from 64rem), folded and unfolded, with Library and Review. Check: the active item
  keeps the shell's rule (`aria-current="page"`); folding still works.
- **The 40–64rem strip** under the topbar, at 820 portrait. Check: every item fits or the overflow is
  designed.
- **The phone bottom bar** (below 40rem). Check: every target is at least 44 px and no label is cut at
  390 (open question 3).
- **The library's own page frame** (open question 2). Check: a member can reach the console from the
  library and the library from the console, in one step each.

## Every link and where it goes

Every link stays in the prototype: `design-check` fails `check=leaves-canvas` on an absolute URL.

- **A book card** → the book page (stand-in: "Book page — another job (`07-book-page`)").
- **Continue reading, a native chapter or a loose native or `md` document** → the signed reader at
  that place (stand-in: "Reader — signed (`01-reader`)", naming the chapter and section).
- **A legacy chapter or legacy loose document** → the legacy reader (stand-in, "`09-legacy-and-print`").
- **Review** → the review page (stand-in, "`08-review`").
- **Dashboard, Documents, Graph** → a console stand-in ("unchanged").
- **Sign in** (the public page) → the Sign in stand-in, copied from the signed reader.
- **A public book or document** on `/@{org}` → the book page's public view stand-in, or the reader
  stand-in.
- **"Clear all reading data"** → its confirmation, on this canvas.

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
  stands for it. The signed reader also drew a native pair on the knowledge guide's chapter 2 (English
  v2 and v1, 한국어 v1 translated from English v1). Wave 3 keeps both, so its canvases agree with the
  signed reader.
- **Formats.** Today every chapter is legacy HTML except one `md` document. The canvases show a library
  partway through P30's re-explains, as the signed reader does: the knowledge guide native, Tidewater
  native but for chapter 7, `lantern` and `orchard` still legacy.
- **The member's progress:** for the knowledge guide and Tidewater, the signed reader's (its
  `reader.js` → `progress`): the knowledge guide 2 of 5 finished (chapter 5 finished on v2 and Updated
  since, chapter 2 started at 38% in "The write path"); Tidewater 10 of 20 finished (chapter 10
  Updated since), chapters 11 and 12 started; "SQLite's write-ahead log, in practice" started at 20%.
  Invent the rest, realistically.
- **Subjects** (invented, for the library with subjects; S1: a subject's project is named for it,
  `ai`, `english`, `finance`): **AI** with a subject book; **English** with a subject book and two loose
  articles; **Finance** with one loose article and no book. Invent the titles.
- **Visibility.** Some projects public, the rest private; at least one public project with a book and
  a loose document.
- **A signed-in reader** is an invented name with no email.

### Copy

- **The contract's and the signed reader's words:** "Continue reading", the progress words above,
  "UPDATED", "ORIGINAL LAYOUT", "X of M finished", and the subject labels as data.
- **"Clear all reading data"** is the record's name for the action (entry 12); its confirmation's words
  are yours.
- **The system README's content rules:** sentence case, no exclamation marks, no emoji, "…" for
  pending, "→" on links that move you on; empty states say what is missing and the one thing that
  fills it.
- **Other copy** is yours, in English (chrome copy is English-only, D36 (4)); log every string in
  `build-prompt.md`.

### Edge cases

- no subjects at all; a one-article subject; a subject with books and articles;
- two books with the slug `maintainer-guide`; a 20-chapter book; a joint key `p17-p18`;
- a project with 20 loose documents; three projects with no documents;
- the longest real title; a Korean title; a document at v3;
- a reader who has opened nothing; a reader with everything finished; one chapter Updated;
- an org with nothing public; a signed-in reader from another org.

### Never on the canvas

- glide-ilab or base material;
- arb_upbit_1's strategy content;
- secrets, keys, emails or any personal data.

## The product today (REFERENCE, read on 2026-10-20)

Data about what exists, never a proposal. Paths are under `web/src/`.

- **The app shell** (`components/app-shell/`, copy in `content/app.ts`):
  - **Nav items,** in order: "Dashboard" (`/dashboard`), "Documents" (`/documents`), "Graph" (`/graph`).
    Words only, no icons. The active item carries `aria-current="page"`.
  - **The rail** (from 64rem): 15rem, the mono eyebrow "Org", then the three links; nothing else. The
    active link is teal semibold with a 2px teal left border on a soft teal wash. A fold toggle at the
    topbar's far left (aria-label "Navigation"; "Hide navigation" / "Show navigation") hides the rail,
    remembered in the `kb_rail` cookie.
  - **The topbar,** 3.5rem, sticky, at every width: the logo and the "knowledge" wordmark (linking to
    `/dashboard`), a crumb "Org **{org name}**", the user's email, and "Sign out". Below 40rem the
    crumb, email and Sign out move into an avatar menu.
  - **Below 40rem,** a bottom bar of 3.6rem with the same three links in equal columns; **from 40 to
    64rem,** the same links as a sticky strip under the topbar.
  - **Breakpoints** are container queries on `kbapp` and `kbmain`.
- **Signed-in home:** sign-in lands on `/dashboard` (`lib/next-path.ts`).
- **The dashboard's Projects table** (`(app)/dashboard/page.tsx`): Project, Docs, Keys, Visibility
  ("Public" / "Private"), Created, Last used, Open. Empty: "No projects yet. Create your first one to
  get started."
- **The documents list** (`(app)/documents/page.tsx`): search ("Search titles and content…"), a project
  filter ("All projects"), a table of Title, Project, Date, Tags and a danger "Delete", newest first,
  with Previous / Next. Empty: "No documents yet. Ingest documents with an API key to see them here."
- **Tables** drop columns below 64rem and become one card per row below 40rem (`DataTable` with
  per-column priorities).
- **States** (`components/states/`): `Editorial` (a mono code, a title, a sub line, actions; as a page,
  a panel or inline), `Skeleton` (`SkelPageHead`, `SkelTiles`, `SkelPanel`, `SkelTable`), `ErrorRef`
  ("ref {digest} · {time}"), and a `ToastRegion` nothing uses yet. Copy: "Not found · 404", "Error ·
  500", "Something on our side stopped reading.", "Try again", "Loading…".
- **Destructive confirmations today:** inline and two-step, never a modal: the button is replaced by a
  prompt, an autofocused "Cancel" and a danger confirm. Delete document: "Delete permanently? This
  can't be undone." / "Cancel" / "Yes, delete" / "Deleting…". The one modal in the app (a new key's
  one-time reveal) is a `role="dialog"` with a focus trap.
- **Public pages** (`components/public-shell.tsx`): a sticky topbar with the logo and wordmark (linking
  to `/`) and "Sign in"; no rail, no nav, no footer. **Forced light** (`data-md-color-scheme="default"`,
  with no dark scheme hook). `/@{org}/graph` exists; **`/@{org}` and `/@{org}/{project}` do not**.
- **Themes:** the signed-in app follows the operating system (`data-kb-scheme="auto"` and a
  `prefers-color-scheme: dark` block), with no toggle and no sepia.
- **Icons:** the README says there is no icon set. The console uses three lucide glyphs (the rail's
  fold toggle, the documents search field, a plus on "New project" and "New key"); navigation is words.

## The system inventory

- **Title: `knowledge`**, as the Design System Artifact shows it. Copy it into `canvas.json`'s
  `designSystems` record, pinned at the version below.
  - Namespace: `kb`.
  - Artifact: https://claude.ai/artifact/7qemgwHNsoPNf5kYHEJ4md, version `1792321604-e214`
    (`design.json`).
  - On 2026-10-20 the system's files were read back, and they are byte-identical to the cache. The newer
    version id the system shows is the app saving on open.
- **Cached at `jobs/06-library/canvas/project/ds/kb/`:** `tokens.css`, `tokens.json`, `README.md` and
  `fonts/` (Fraunces, Source Sans 3, JetBrains Mono). Read the README first: its colour, type, layout,
  states and content rules bind, its *Space and layout* (the shell) and *States* (loading, errors,
  empty) above all.
- **Components: none.** No bundle ships, so there is no `x-import`. Every component this job needs is a
  **component gap**: draw it as markup on its own board and log it. Where the product already has one,
  match its values: buttons in `web/src/components/ui/app-button.tsx`, the shell in
  `web/src/components/app-shell/`, and the reader's parts as signed.
- **The reader's values** (Literata, Noto Serif KR, the five sizes, sepia, the reader's chrome tokens)
  are reader-scoped on the canvas, in the snapshot's `reader.css`. They are not in the system yet
  (reader build prompt → *Values P30 adds to the code*).
- **Known gaps this job meets:**
  - no book card, no progress bar for a book, no grouping control;
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
- **Privacy (S3):** reading state is never shown to anyone but its reader, and never counted or
  aggregated for an owner.
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
  strict`, with a Hangul face before the generic fallback; Hangul runs inside English wrapped in
  `lang="ko"` (reader §6a).
- **Layout:** the system's breakpoints (40, 64 and 90rem), on the shell's containers (`kbapp`,
  `kbmain`) or the reader's (`rd`). The page never scrolls sideways at any width.
- **No icon set and no emoji** (README). Use words and the text marks `·`, `…` and `→`.

## Locked vs. in play

### Locked

- **The signed reader and wave 2,** whole. Sign in to save as signed, changing only `what`.
- **The data contracts** (`phase.md` → S1 and S3): the two groupings and their keys; a one-article
  subject as a loose document; book progress over every chapter; Continue reading as the most recent
  positions; what "clear all" removes; privacy.
- **The app shell's structure** beyond the entry points: the rail, the topbar, the fold, the active-item
  rule, the containers. **The console's pages, auth and the landing,** except where this job forces a
  change.
- **The system's structure and brand spirit:** "A calm editorial library: warm paper, charcoal ink, one
  deep teal, and hairlines instead of boxes"; one interactive accent; no icon set.
- **The copy rules and the accessibility floor.**

### In play

- The library's layout, its cards and lists, the grouping control, Continue reading.
- The public org library.
- Where the entry points sit, and the library's page frame.
- The clear-all control and its confirmation.

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
- "I want more refined diagrams, mobile, ipad friendly, image available, multi column image or diagram
  input also possible, and more quizs available etc.."
- "good. but fixed column width."

### The rounds' words (P29.S4, P29.S5)

- The reader's sign-off, 2026-10-20: "everything looks good. moveon". Round 01's taste notes were not
  taken up; round 02's were signed as drawn.
- Wave 2's sign-off, 2026-10-20: "accept", which settled every open item as drawn.
- At wave 2's stop, the question that shaped this job, and "yes to both" (*Product context*).

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
  ink, one deep teal, and hairlines instead of boxes. The product is a reading room for documents that
  agents publish, plus a quiet console around it. Draw every surface as if it were a well-set page first
  and an app second."
- **The signed reader and wave 2** are the established look of reading, and this job's frame.

## Direction

- **`new visual direction: no`** (the line at the top): this job extends the signed reader and the
  system. From the confirmed intent: "P27's design system went live with P28 and is the starting point,
  not something to replace wholesale. Reader typography and themes are in play." (`intent.md`).
- **One direction.** The operator asked for no options. Draw one, and log the open calls.

## Open questions, posed back

Draw your own answer to each, in the one direction, and log it under `open_questions` for the operator.
Only the operator's words settle them.

1. **The theme rule for the library and `/@{org}`.** The signed-in app follows the operating system,
   with no toggle and no sepia; public pages stay light; the signed reader follows its own setting
   (System, Light, Dark, Sepia) for every reader, signed out included. The cut asks every wave-3 job to
   draw light, dark and sepia. Draw all three, and say which rule each surface follows at runtime.
   Flagged.
2. **The library's page frame:** inside the app shell (rail, topbar, bottom bar), like the console, or
   a reading chrome of its own, like the signed reader, whose logo already calls the library its home.
   Flagged; the same question stands for `07-book-page` and `08-review`.
3. **Where Library and Review sit in the app shell:** their order in the rail; the phone bottom bar,
   which holds three equal word links today; the 40–64rem strip. And whether the topbar's wordmark and
   the post-sign-in landing (`/dashboard` today) move to the library. Flagged.
4. **The by-subject view with nothing labelled:** how books and loose documents with no subject show
   there (today, all of them). Flagged.
5. **The grouping's memory:** whether by project or by subject is remembered, and where (the URL, the
   device). Flagged.
6. **Projects in the member's view:** whether projects with no documents show, and whether the library
   marks a project's visibility (public or private) as the dashboard does. Flagged.
7. **Continue reading:** how many items, what each shows (the section, the percentage, the language),
   and whether a finished chapter leaves it. Flagged.
8. **Another org's public books:** S3 gives a signed-in reader the same features on any public book.
   Whether `/library` lists the ones they have opened beyond Continue reading, and what `/@{org}` shows
   a signed-in reader. Flagged.
9. **`/@{org}` with nothing public:** an empty public page, or the constant 404 every other miss gets.
   Flagged.
10. **"Clear all reading data":** where it lives (in the library, in an account place, or both); what
    the confirmation says goes and stays; whether the review settings (time zone, daily limits; S3
    `reader_profiles`) go with it. Flagged.
11. **The Review entry's count:** whether it shows the cards due. Flagged.

## Paths

- **Runtime:**
  `/private/tmp/claude-502/-Users-sugang-projects-personal-knowledge/f0010d83-1939-47da-8f62-5ffe37557260/scratchpad/artifact-files/2b6493f4-c4bb-4fd9-ab1a-2396dd8a3de3/artifact-type/dc-runtime.js`
- **Type references:**
  `/private/tmp/claude-502/-Users-sugang-projects-personal-knowledge/f0010d83-1939-47da-8f62-5ffe37557260/scratchpad/artifact-files/2b6493f4-c4bb-4fd9-ab1a-2396dd8a3de3/`,
  holding `SKILL.md` and
  `artifact-type/reference/{format,craft,design-system-components,view-state,diagrams,print}.md`
- **System namespace:** `kb`

## Required output

- **The canvas tree** under `jobs/06-library/canvas/project/`, passing `design-check 06-library`.
- **`rounds/01-library/result.md`**, holding:
  - the intent lines and the plan;
  - what was designed;
  - the data used;
  - every file copied from a signed round;
  - what you assumed at each seam with the sibling jobs;
  - every departure from this handoff;
  - the open questions;
  - the component gaps;
  - the measured contrast of every text and state colour you add, in light, dark and sepia.
- **`rounds/01-library/build-prompt.md`**, complete enough to build from without inventing anything:
  - the library at each width: groupings, Continue reading, cards, loose documents, every state;
  - the public org library and its misses;
  - the entry points in the shell at each width, and the library's frame;
  - the clear-all flow, with every state;
  - the view model each part needs, mapped to S1's and S3's fields and routes;
  - every string you wrote.

  The state bar and every stand-in are canvas-only, never something to build.
