# Handoff — job `08-review`, round `01-review` (slice P29.S6)

new visual direction: no

critique: critic

This is the drafter's whole brief and the critic's yardstick for this job's first round. The
orchestrator wrote it on 2026-10-20 from the record:
- the P29 contracts (`works/phases/active/P29/phase.md` → `## Decisions`), chiefly S3 *Review items*,
  *Algorithm: FSRS*, *Ratings: two buttons*, *Item drift*, *Review data contract*, *Routes and writes*
  and *Privacy*, and S2 *Quiz*;
- the signed reader and the signed wave 2 (`## Decisions` → *The signed reader* and *The signed chapter
  blocks and annotations*), chiefly the quiz and the annotations, which make the cards;
- the S6 notes (`## Notes for later slices`);
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
- **Who reviews.** The operator, a solo developer, on iPhone, iPad and a Mac, coming back each day to
  what they read. Review is for signed-in readers only (`require_user`).
- **Where this job sits.** Spaced review of what the reader has met in their chapters:
  - **every quiz item** enters review **automatically** on its first attempt, and that attempt is the
    card's first review: correct (or "got") → Good, wrong (or "missed") → Again (S3 *Review items*);
  - **a highlight** becomes a card only when the reader turns on **"Review this"** for it (Q7's working
    assumption): a resurfacing card of the quote, its context and the note, which the reader rates;
  - the schedule is **FSRS-6 on the server**, with two ratings, **Again** and **Good**, each showing its
    interval preview (S3 *Algorithm*, *Ratings*).
- **The signed parts that feed it:**
  - the **quiz block** (`04-quiz`) names review only in its save line, "Saved for review" and "Saved ·
    review keeps your first answer", and links nowhere. Its build prompt: "An entry point to review is
    the `review` job's and the operator's call.";
  - the **annotations** (`05-annotations`) give a highlight its "Review this · On / Off" switch, with
    "It is a card in your reviews.", "Its card is paused, and keeps its history." and "Turn on to make
    it a review card.";
  - the **library** (`06-library`, drafting beside you) draws Review's entry point in the app shell.
- **The operator's words:** "more quizs available etc.." (intent, 2026-10-17), and the confirmed intent's
  learning goal for review "from quizzes or highlights", which Q7's working assumption narrowed to
  highlights the reader marks.
- **Review state is private** to its reader (S3 *Privacy*): no owner or org member sees it, and it never
  enters search, analytics or the graph.

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

- **Every element of them is locked.** This job draws a new surface from their parts and never moves,
  restyles or drops a signed element. Where a signed part fits a card unchanged, use it unchanged.
  Where review needs it to differ (a rating in place of "Try again", say), leave the signed part as it
  is, draw review's version, log the difference as a departure and an open question, and the operator
  decides.
- **REFERENCE, read as data:** each signed round's snapshot `canvas/project/` and its `build-prompt.md`
  (the implementation contract, complete on its own), under `docs/reference/design/jobs/`:
  `01-reader/rounds/02-revise/`, `02-figures/rounds/01-figures/`, `03-diagrams/rounds/01-diagrams/`,
  `04-quiz/rounds/01-quiz/` and `05-annotations/rounds/01-annotations/`.
- **What this job draws in and never re-litigates** (each detailed in its build prompt):
  - **the faces:** Literata with Noto Serif KR for reading; Fraunces with Noto Serif KR for display;
    Source Sans 3 with Pretendard for the interface; JetBrains Mono, ligatures off;
  - **themes:** System, Light, Dark and Sepia. Light and dark are the system's values; sepia is
    reader-scoped (reader build prompt → *Themes*). Whether sepia reaches review is open question 1;
  - **the quiz** (`04-quiz` build prompt): the grading margin (the item's number circled when right,
    struck by one slash when wrong, with the tint on a wrong row; "A mark is never the only signal: the
    verdict is always said in words beside the action"); the hints ("Choose one answer.", "Select all
    that apply.", "Answer it in your head, then show the answer.", the cloze hints); the buttons
    ("Check", "Show answer", "I got it", "I missed it"); the verdicts ("Correct", "Incorrect",
    "Incorrect · partly right", "Incorrect · {k} of {N} blanks right", "Got it", "Missed it", "Did you
    get it?"); the option tags ("Your answer · correct", "Your answer · incorrect", "Correct answer");
    the accepted-answer lines; `explain` in the reading face; grading on tap (single `choice`) or on
    Check (multi `choice`, `cloze`), with cloze answers compared after trimming the ends,
    case-folding and NFC;
  - **the highlight** (`05-annotations`): the warm yellow paint with a 1px bronze line along its foot,
    2px with a note (C08), "Review this", and the note's look;
  - **the reader's loading, not found and failed states** (§16), and its sheets (§15), as the patterns
    the reader already set;
  - **the stand-ins** for other jobs' screens (`Elsewhere.dc.html` in the reader's snapshot): copy it
    and add the kinds this job needs. A stand-in is canvas-only.
- **Copy what you need** from the snapshots into this job's tree (the quiz's parts and styles, the
  highlight's paint), unchanged in look and behaviour, and list every copied file in `result.md`. Never
  write to a snapshot.

## Scope

### This job: the review surface, one surface

Everything here is drawn at phone, iPad and desktop, in **light, dark and sepia** (the cut's rule for
every wave-3 job; which theme rule applies at runtime is open question 1). It is one route for a
signed-in reader; the guard sends a signed-out visitor to sign in.

1. **The queue header** (S3 *Review data contract*): `counts: {due, new_highlights, done_today,
   by_book: [{org, project, book?, book_title, due, new}]}`, the `day` (`{start, end, time_zone}`) and
   `next_due_at?`.
   - **Due** = `due <= end of today`, in the reader's local day, which starts at `day_starts_at_hour`
     (default 4). Order: overdue relearning first, then by due.
   - **Limits:** `max_reviews_per_day` (default 200), and `new_highlights_per_day` (default 20) for
     highlight cards never reviewed. Quiz cards are seeded by an answer, so they are never "new".
2. **A card's front and back**, per type (S3 *Review data contract*; markdown fields arrive rendered by
   the native pipeline, and the key ships with the card):
   - **`choice`,** single and multi: front `{prompt, options[{id, text}], multi}`, back `{answer[ids],
     explain}`. Re-asked and graded as in the reader; the grade is shown, and **Next** rates it
     (correct → Good, wrong → Again).
   - **`cloze`:** front `{text with blanks, blanks}`, back `{accepted[[…]], explain?}`. Typed, graded as
     in the reader; **Next** rates it.
   - **`recall`:** front `{prompt}`, back `{answer, explain?}`. Revealed, then self-graded `missed` or
     `got` (→ Again or Good).
   - **A highlight:** front `{quote, block_title, note?}`, and **no back**. Rated Again ("show sooner")
     or Good ("got it").
   - **Every card** also carries `{card_id, source, item_type, state, reps, lapses, due, where: {org,
     project, book?, book_title?, chapter_key?, chapter_title, doc, lang, version, href}, previews:
     {again: {due, interval}, good: {due, interval}}}`.
3. **Again and Good with their interval previews** (S3 *Ratings*: "Each button shows its interval
   preview"), and **Next** for the graded types.
4. **Suspend** a card (`PATCH /app/reader/review/cards/{id}` `{status: active|suspended}`).
5. **Done for today** (with `next_due_at`) and **empty** (no cards yet: "answer a quiz or mark a
   highlight", S3).
6. **The link back into the chapter:** `where.href` deep-links to the card's block.
7. **Rating** (`POST /app/reader/review/cards/{id}/review` with `{rating: again|good, response?,
   review_id}` → `{card: {due, interval, state}, counts}`): pending, saved, and failed. Reviews are
   idempotent by `review_id`, and the server's clock decides.
8. **Drift and language** (S3 *Item drift*): a card renders in the reader's last-used language for its
   unit, else any readable variant; an item whose type changed resets its card (history kept); a
   retired item's card leaves the queue; a card whose chapter the reader can no longer read never
   appears, in no count and no payload.
9. **Loading and failed** for the queue.

**Sizing.** One surface: about 5 Pages or fewer, plus their components. `design-check` warns past 6
Pages or 16 boards. How the Pages divide the states is your call.

### The sibling jobs, drafting beside you (wave 3, P29.S6)

Each writes only its own folder under `docs/reference/design/jobs/`. You may read a sibling's tree; it
is a draft in progress, not signed.

- **`06-library`** (critic+judge): the member's library, the public org library, the app shell's
  Library and **Review entry points**, and "clear all reading data" (which takes review cards with it).
- **`07-book-page`** (critic): the book page, member and public, and "clear this book's reading data"
  (which takes that book's review cards with it).
- **`09-legacy-and-print`** (critic): the legacy reader for HTML documents, and every print sheet.

**Where this job meets them:**
- **The entry point is `06-library`'s; this page is yours.** If the entry shows a count, it reads
  `counts.due`.
- **The page frame.** Whether review sits in the app shell, in the reader's chrome, or in a frame of
  its own (open question 2) is the same question for the library and the book page. A conflict reaches
  the operator as a wave choice.
- **By book.** `07-book-page` may show a book's cards due (its open question 9); the queue route takes
  only `limit` (open question 7). Say what you assumed.
- **Legacy chapters make no cards** (S3: a legacy chapter keeps no quiz results and no highlights).

Say in `result.md` what you assumed at each seam. The critic compares the wave's jobs.

### Not this job

- **The quiz block and the annotations in the reader** (signed): the first answer, the save line, the
  "Review this" switch.
- **`06-library`, `07-book-page`, `09-legacy-and-print`** (above), the Review entry point in the shell
  included.
- **Statistics or a review history screen:** not in the cut. `review_logs` are kept for a later
  per-user optimisation (S3), not shown.
- **The console, auth, graph and landing:** unchanged.

## Screens × states

**Prototype first.** Every state below must be reachable on an interactive Page: by a click or, where
no click reaches it, by that page's state bar. Answering, revealing and rating work on the canvas.

Each state carries a one-line check the critic holds it to. Every state is drawn at phone (390×844),
iPad (820×1180) and desktop (1440×900), in light, dark and sepia; add iPad landscape (1024×768) where
the layout changes there. The critic checks all three themes.

### The queue

- **Cards due:** the header with due, new highlights, done today, and by book. Check: each count reads
  in words and numbers; the counts change as each card is rated, as S3's reply returns them.
- **Loading** and **failed.** Check: the skeleton mirrors a card at that width and is still under
  reduced motion; the failure follows the system's error rule ("Something on our side stopped
  reading.", one action, a mono reference line).
- **Done for today,** with the next card's time. Check: it says when the next card is due, in the
  reader's own time, and nothing looks broken.
- **Done because a daily limit was reached** (200 reviews, or 20 new highlights). Check: it says why,
  and what is left for tomorrow.
- **Empty: no cards yet.** Check: it says what makes a card (answering a quiz, or turning on "Review
  this" on a highlight) and offers the one way there.

### Cards

- **`choice`, one answer:** asked, answered right, answered wrong. Check: graded exactly as the signed
  quiz grades (the circle or the slash, the tags, the words); Next rates Good when right and Again when
  wrong, and says so before it is pressed.
- **`choice`, select all that apply:** Check first, then the grade; partly right. Check: the signed
  quiz's words ("Incorrect · partly right").
- **`cloze`,** one blank and three blanks; right; wrong, with the accepted forms. Check: the field is
  16 px; Enter checks; a wrong blank shows "You wrote “…”." and "Accepted: …" as the quiz does.
- **`recall`:** the prompt; the answer shown; self-graded. Check: the two choices rate Again and Good,
  and each shows its interval preview (open question 3 for the words).
- **A highlight,** with a note and without one. Check: the quote reads as the reader's highlight (the
  signed paint), with its section's title; Again and Good each show its interval preview.
- **The interval previews,** short (10 minutes), days, months and years. Check: readable at 390, and
  they follow open question 4.
- **A card in 한국어** (the reader last read that chapter in Korean). Check: the card carries
  `lang="ko"`, `keep-all` and the Hangul face; the interface stays English.
- **A long card:** a prompt with code, six options and a long explanation. Check: nothing scrolls
  sideways, and the rating stays reachable on a phone.
- **A card from a loose document** (no book). Check: `where` names the document and its project, not a
  book.
- **Rating:** pending, saved, failed. Check: a rating is never lost silently; trying again sends the
  same `review_id`, so it is never counted twice.
- **Suspend,** and the card suspended. Check: it says what suspending does; it follows open question 5;
  the queue moves on.
- **The way back into the chapter.** Check: it names the book and chapter (or the document), opens the
  reader at the card's block, and follows open question 8.
- **Keyboard:** answering, revealing, rating, Next and suspending. Check: each is reachable and
  operable by keyboard, in order, with the system's focus ring.

### Signed out

- **`/review` signed out.** Check: no review data shows; the visitor is sent to sign in (the Sign in
  stand-in) and comes back to review.

## Every link and where it goes

Every link stays in the prototype: `design-check` fails `check=leaves-canvas` on an absolute URL.

- **The way back into a chapter** → the signed reader at the card's block (stand-in: "Reader — signed
  (`01-reader`)", naming the chapter and the block).
- **A card from a loose document** → the reader stand-in, naming the document.
- **The empty state's way** → the library stand-in ("`06-library`") or the reader stand-in, as you
  choose.
- **The app shell's items, if your frame shows them** → stand-ins (the library, "`06-library`"; the
  console, "unchanged").
- **Sign in** → the Sign in stand-in, copied from the signed reader.
- **A book in the header,** if choosing one does something → this canvas.

## Data

The design record is committed to this **public** repo, so whatever the canvas shows becomes public
(`phase.md` → `## Decisions` → *Canvas content rule*).

### The wave's shared sample library

All four wave-3 jobs use these names, so their canvases agree. Every name is invented except
`knowledge` and its book; the signed reader already uses `tidewater` and `field-notes`.

- **The org:** "Quillwork" (`@quillwork`), invented. Never the operator's own handle or org.
- **The books and documents this job draws cards from:**
  - `knowledge` → "The knowledge maintainer guide", 5 chapters with the real titles below, native; the
    one with two languages is chapter 2 (English v2 and v1, 한국어 v1);
  - `tidewater` → "Tidewater, from the inside", 20 chapters, native but for chapter 7;
  - `field-notes` → the loose document "SQLite's write-ahead log, in practice" (native, v2);
  - `lantern` and `orchard` → legacy books, which make **no cards**.
- **The real titles** of `knowledge`'s book, the only real titles allowed:
  1. "Knowledge: What It Is and How It Is Used"
  2. "Knowledge System Internals: The Content Plane, the Write Path, and the Contracts"
  3. "Knowledge's Read Surfaces: Two Front Ends, One Corpus"
  4. "Shipping and Running Knowledge: Distribution, the Edge, Security, and the Gates"
  5. "Why Knowledge Is This Way, and How to Change It"

### The cards

- **Quiz cards:** the signed quiz's own items, as its `reader.js` holds them (the knowledge guide's
  quizzes `#check`, `#try-it` and `#twenty`: `choice`, `cloze` and `recall`, in English and Korean),
  plus invented items in Tidewater's chapters and the SQLite document, realistic and never lorem.
- **Highlight cards:** the signed annotations' seed highlights and notes, as its `annot.js` holds them,
  each with "Review this" on.
- **The queue:** a realistic day, for example 14 due, 3 new highlights and 6 done today, across the
  knowledge guide, Tidewater and the SQLite document. Invent it.
- **The interval previews:** realistic FSRS-6 values for the defaults (`desired_retention` 0.9, one
  10-minute learning and relearning step, fuzzing on): about 10 minutes for Again on a learning card,
  up to months or years for Good on a mature one. Invent them per card.
- **The clock:** fix one, as the quiz's canvas did (`NOW` = 2026-10-20T09:30:00Z), and an invented time
  zone for the reader. The day starts at 4:00 (the default).
- **A signed-in reader** is an invented name with no email.

### Copy

- **The contract's words:** "Again", "Good", "Next", "suspend", "done for today", and S3's glosses for a
  highlight's ratings, "show sooner" and "got it". How each shows is yours (open question 3).
- **The signed quiz's and annotations' strings,** where a card reuses their parts (above).
- **The system README's content rules:** sentence case, no exclamation marks, no emoji, "…" for
  pending, "→" on links that move you on; empty states say what is missing and the one thing that
  fills it.
- **Other copy** is yours, in English (chrome copy is English-only, D36 (4)); log every string in
  `build-prompt.md`.

### Edge cases

- one card left; 200 cards due; a daily limit reached; nothing due today; no cards ever;
- an overdue relearning card first; a card made today;
- a six-option choice; three blanks; a recall with a long answer; a highlight with a 500-character
  note and one with no note;
- a card in 한국어; a card from a loose document;
- a failed rating; a slow one.

### Never on the canvas

- glide-ilab or base material;
- arb_upbit_1's strategy content;
- secrets, keys, emails or any personal data.

## The product today (REFERENCE, read on 2026-10-20)

Data about what exists, never a proposal. Paths are under `web/src/`.

- **No review surface exists.** Nothing in the app schedules or shows cards.
- **The app shell** (`components/app-shell/`, copy in `content/app.ts`): three items, "Dashboard",
  "Documents" and "Graph", words only. A 15rem rail from 64rem (with a fold); a 3.5rem topbar (the
  logo and wordmark, "Org {org name}", the user's email, "Sign out"); below 40rem a bottom bar of three
  equal word links; from 40 to 64rem the same links as a strip under the topbar. `06-library` adds
  Library and Review.
- **The signed-in home** is `/dashboard`. A signed-out visitor to a signed-in page is sent to `/login`,
  which honours a same-origin `?next=`.
- **States** (`components/states/`): `Editorial` (a mono code, a title, a sub line, actions), `Skeleton`,
  `ErrorRef` and a `ToastRegion` nothing uses yet. Copy: "Not found · 404", "Error · 500", "Something on
  our side stopped reading.", "Try again", "Loading…".
- **Themes:** the signed-in app follows the operating system, with no toggle and no sepia.

## The system inventory

- **Title: `knowledge`**, as the Design System Artifact shows it. Copy it into `canvas.json`'s
  `designSystems` record, pinned at the version below.
  - Namespace: `kb`.
  - Artifact: https://claude.ai/artifact/7qemgwHNsoPNf5kYHEJ4md, version `1792321604-e214`
    (`design.json`).
  - On 2026-10-20 the system's files were read back, and they are byte-identical to the cache. The newer
    version id the system shows is the app saving on open.
- **Cached at `jobs/08-review/canvas/project/ds/kb/`:** `tokens.css`, `tokens.json`, `README.md` and
  `fonts/` (Fraunces, Source Sans 3, JetBrains Mono). Read the README first: its colour, type, layout,
  states and content rules bind.
- **Components: none.** No bundle ships, so there is no `x-import`. Every component this job needs is a
  **component gap**: draw it as markup on its own board and log it. Where the product already has one,
  match its values: buttons in `web/src/components/ui/app-button.tsx`, and the quiz's and the
  annotations' parts as signed.
- **The reader's values** (Literata, Noto Serif KR, the five sizes, sepia, the reader's chrome tokens)
  and the quiz's and the highlight's values are reader-scoped on the canvas, in the snapshots' CSS. They
  are not in the system yet (each build prompt → *Values P30 adds to the code*).
- **Known gaps this job meets:**
  - no rating buttons, no interval preview, no card outside the quiz block;
  - no sepia outside the reader;
  - no Hangul face in the system cache (the canvas loads Noto Serif KR from Google Fonts CSS, as the
    reader does; the interface falls back to the system's Hangul fonts).

## Constraints

- **Viewports** (from `## Operator Runtime`): phone 390×844; iPad 820×1180 portrait and 1024×768
  landscape; desktop 1280–1440 wide, with 1440×900 as the reference.
- **Devices:** iPhone and iPad in Safari and Chrome, and Mac Chrome. A keyboard rising for a cloze blank
  must not hide the field or the rating. Respect the safe areas.
- **Signed in only:** every route is `require_user`; another user's card id is the constant 404.
- **The server decides:** the schedule, the intervals and the clock are the server's; the page shows
  what it is given and sends ratings (S3).
- **The accessibility floor:**
  - text ≥ 4.5:1, and large text and UI ≥ 3:1, in every theme, measured;
  - `kb-hint` never used for text a reader needs;
  - the system's focus ring (`kb-focus-w` in `kb-accent`);
  - targets of at least 44 px (`kb-tap`) below 40rem;
  - inputs at 16 px;
  - a state never shown by colour alone (the quiz's rule: the verdict is always said in words);
  - `prefers-reduced-motion` respected;
  - every control operable by keyboard.
- **Korean (S2):** under `:lang(ko)`, `word-break: keep-all; overflow-wrap: anywhere; line-break:
  strict`, with a Hangul face before the generic fallback; Hangul runs inside English wrapped in
  `lang="ko"` (reader §6a).
- **Layout:** the system's breakpoints (40, 64 and 90rem), on whichever container your frame uses. The
  page never scrolls sideways at any width.
- **No icon set and no emoji** (README). Use words and the text marks `·`, `…` and `→`.

## Locked vs. in play

### Locked

- **The signed reader and wave 2,** whole: the quiz's grading, words and parts, the highlight's paint,
  "Review this".
- **The data contracts** (`phase.md` → S3): two ratings with interval previews; Next rating the graded
  types; recall self-graded; a highlight card with no back; the queue's counts, order and limits;
  suspend; done for today and empty; drift; the server's clock; privacy.
- **The system's structure and brand spirit:** "A calm editorial library: warm paper, charcoal ink, one
  deep teal, and hairlines instead of boxes"; one interactive accent; no icon set.
- **The copy rules and the accessibility floor.**

### In play

- The page's layout and frame, the header, the card, the ratings and their previews.
- Suspend, done for today, empty, and the way back into the chapter.
- How review's version of a signed part differs, when it must (logged).

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
- Wave 2's sign-off, 2026-10-20: "accept", which settled every open item as drawn, among them the
  quiz's grading margin and the highlight's colour.

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
- **The signed quiz and annotations** are the established look of a question and a highlight, and this
  job's frame.

## Direction

- **`new visual direction: no`** (the line at the top): this job extends the signed reader, wave 2 and
  the system. From the confirmed intent: "P27's design system went live with P28 and is the starting
  point, not something to replace wholesale. Reader typography and themes are in play." (`intent.md`).
- **One direction.** The operator asked for no options. Draw one, and log the open calls.

## Open questions, posed back

Draw your own answer to each, in the one direction, and log it under `open_questions` for the operator.
Only the operator's words settle them.

1. **The theme rule for review,** a signed-in surface. The signed-in app follows the operating system,
   with no toggle and no sepia; the signed reader follows its own setting (System, Light, Dark, Sepia).
   The cut asks every wave-3 job to draw light, dark and sepia. Draw all three, and say which rule
   applies at runtime. Flagged.
2. **The page's frame:** the app shell, the reader's chrome, or a focused frame of its own for a
   session. Flagged; the same question stands for `06-library` and `07-book-page`.
3. **The rating words per type.** The contract's ratings are Again and Good; the quiz's self-grade
   words are "I missed it" and "I got it"; S3 glosses a highlight's as "show sooner" and "got it"; a
   graded `choice` or `cloze` rates through Next. Which words each type shows. Flagged.
4. **The interval preview's form:** how "10 minutes", "3 days" or "4 months" read, and where they sit.
   Flagged.
5. **Suspend:** where it sits on a card, whether it can be undone there, and how a suspended card is
   found and resumed later (S3 allows `{status: active}`; no job draws a list of suspended cards;
   turning "Review this" off also suspends a highlight's card). Flagged.
6. **The review settings** (S3 `PATCH /app/reader/profile`: the time zone, taken from the browser on
   the first write and "editable", `max_reviews_per_day` and `new_highlights_per_day`): whether this
   page carries them, and where. Flagged.
7. **By book:** S3's counts carry `by_book`, but the queue route takes only `limit`. Whether the header
   lists the books, and whether choosing one narrows the queue (a contract addition for P30). Flagged.
8. **The way back into the chapter:** where it sits (front, back, or both), and whether review keeps its
   place when the reader returns. Flagged.
9. **What done for today offers** beyond the next card's time. Flagged.
10. **An entry to review from the reader or the quiz.** The signed quiz links nowhere, and its build
    prompt leaves an entry point to review to this job and the operator. Draw your answer only as a
    flagged proposal (on a stand-in or a copy), never as a change to a signed part. Flagged.

## Paths

- **Runtime:**
  `/private/tmp/claude-502/-Users-sugang-projects-personal-knowledge/f0010d83-1939-47da-8f62-5ffe37557260/scratchpad/artifact-files/2b6493f4-c4bb-4fd9-ab1a-2396dd8a3de3/artifact-type/dc-runtime.js`
- **Type references:**
  `/private/tmp/claude-502/-Users-sugang-projects-personal-knowledge/f0010d83-1939-47da-8f62-5ffe37557260/scratchpad/artifact-files/2b6493f4-c4bb-4fd9-ab1a-2396dd8a3de3/`,
  holding `SKILL.md` and
  `artifact-type/reference/{format,craft,design-system-components,view-state,diagrams,print}.md`
- **System namespace:** `kb`

## Required output

- **The canvas tree** under `jobs/08-review/canvas/project/`, passing `design-check 08-review`.
- **`rounds/01-review/result.md`**, holding:
  - the intent lines and the plan;
  - what was designed;
  - the data used;
  - every file copied from a signed round, and every signed part review's version differs from, with
    the difference;
  - what you assumed at each seam with the sibling jobs;
  - every departure from this handoff;
  - the open questions;
  - the component gaps;
  - the measured contrast of every text and state colour you add, in light, dark and sepia.
- **`rounds/01-review/build-prompt.md`**, complete enough to build from without inventing anything:
  - the page at each width: the header, the card, the ratings, Next, suspend;
  - each card type's front and back, and every grading state;
  - done for today, empty, loading, failed, the signed-out redirect;
  - rating's pending, saved and failed states;
  - the view model each part needs, mapped to S3's queue and card payloads and routes;
  - every string you wrote.

  The state bar and every stand-in are canvas-only, never something to build.
