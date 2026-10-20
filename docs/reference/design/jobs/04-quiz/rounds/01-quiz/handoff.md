# Handoff — job `04-quiz`, round `01-quiz` (slice P29.S5)

new visual direction: no

critique: critic

This is the drafter's whole brief and the critic's yardstick for this job's first round. The
orchestrator wrote it on 2026-10-20 from the record:
- the P29 contracts (`works/phases/active/P29/phase.md` → `## Decisions`), chiefly S2 *Quiz*, *Ids* and
  *Render model*, and S3 *Who keeps state*, *Quiz results*, *Review items* and *Item drift*;
- the signed reader (`## Decisions` → *The signed reader*, and the signed round
  `jobs/01-reader/rounds/02-revise/`, chiefly its build prompt's §12, Sign in to save);
- the S2 survey of today's quizzes (`works/phases/active/P29/slices/P29.S2/result.md` → §1.9 and Q5);
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
- **This job: the `quiz` block.** The operator asked for "more quizs available". Today every explainer
  ends with five multiple-choice questions (205 in 41 documents), and nothing scores or saves. S2 adds
  two types, `recall` and `cloze`, and S3 saves a signed-in reader's answers and sends each item into
  spaced review. This job draws the block: answering, grading, retrying, the saved answer on return,
  and the signed-out reader. The review surface itself is wave 3's.

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
- **Sign in to save (build prompt §12), reused as is:** the one reusable pattern. Its props are `what`
  ("finished chapters and your place in each one" | "bookmarks" | "highlights and notes" | "quiz
  answers"), `place` ("chapter" | "document"), `raised`, `onSignIn` and `onDismiss`. Its body reads
  "Signed in, your {what} are kept across your devices. After you sign in, you come back to this
  {place}, at this section." This job uses it with **`what` = "quiz answers"** and changes nothing else.
- **What this job draws in and never re-litigates** (each detailed in the build prompt):
  - **the faces:** Literata with Noto Serif KR for reading; Fraunces with Noto Serif KR for display;
    Source Sans 3 with Pretendard for the interface (buttons and inputs); JetBrains Mono, ligatures off;
  - **one 36rem column** (`--rd-measure`) for every block, with no wider track. Wider content scrolls
    in its own box, with the scroll fades (§9a);
  - **five text sizes** (`--rd-fs` / `--rd-k`: 15, 16.5, 18 (the default), 20 and 22 px), leading 1.65,
    and the column's small step `--rd-fs-s` (`× 0.8333`). The interface keeps its fixed 13 and 15 px
    steps and the 11 px mono label;
  - **themes:** System, Light, Dark and Sepia. Light and dark are the system's values; sepia is
    reader-scoped (build prompt → *Themes*);
  - **the reader's own chrome** (no app shell, English-only chrome copy), which hides on scroll;
  - **the buttons:** the reader's primary, secondary and quiet buttons, and the label on a primary
    button (build prompt → *The label on a primary button*);
  - **the stand-ins** for other jobs' screens (board 04, `Elsewhere.dc.html`: Book page, Library, Sign
    in, Legacy reader and External link);
  - **links** and the "missing link" style (build prompt → *Wiring* and the prose kit, §6);
  - **Hangul runs** inside other-language text, wrapped in `lang="ko"` (§6a).
- **How to use it on this canvas.** To show the quiz in a chapter, copy what you need from the snapshot
  into this job's tree, **unchanged in look and behaviour** (`reader.css`, the parts, Sign in to save,
  the stand-ins). Extend the canvas-only machinery (`reader.js`, `flow.js`) only so it renders this
  job's block. List every copied file in `result.md`. Never write to the snapshot.
- **A change to a signed element is not this job's to make.** If one seems needed, leave the element as
  signed, log the need as a departure and an open question, and the operator decides.

## Scope

### This job: the quiz block, one surface

Everything here is drawn at phone, iPad and desktop, in **light, dark and sepia**, inside a chapter in
the signed reader. Where the text size changes a layout (long options, cloze blanks), show sizes 1, 3
and 5.

The block (S2): ```` ```quiz #id ```` with `title?` and `items` (1–20), each with a required `id` and
`type`:
- **`choice`:** `prompt` (inline Markdown), `options[{id, text (inline Markdown)}]` (2–6), `answer:
  [option ids]` (more than one means "select all that apply") and `explain` (inline Markdown);
- **`recall`:** `prompt`, `answer` and `explain?` (inline Markdown): revealed, then **self-graded** as
  `got` or `missed`;
- **`cloze`:** `text` (inline Markdown) with blanks `{{accepted|alternative}}` (1–5 blanks) and
  `explain?`: typed answers, compared after trimming whitespace, case-folding and NFC normalization.

**Grading is client-side** (the key ships in the page; this is a learning tool). A single-answer
`choice` grades **on tap**; a multi-answer `choice` and a `cloze` grade on **Check**. After grading the
reader shows the right answer and `explain`. **Retry is allowed, but the first attempt is the one that
counts for review.**

States per item (S2): unanswered; answered, correct; answered, wrong (the right answer shown);
revealed (`recall`, before its self-grade); self-graded.

1. **`choice`, single answer:** unanswered, then correct, and wrong with the right answer shown; the
   explanation after grading.
2. **`choice`, multi-answer:** selecting, then **Check**, then correct, and wrong with the right
   answers shown; the explanation.
3. **`recall`:** hidden, revealed, self-graded `got` and `missed`.
4. **`cloze`:** empty, typed, then **Check**, then correct, and wrong with the accepted answers shown.
5. **Retry,** for every type.
6. **On return** (signed in): the latest saved attempt per item ("your answer, v3"), including an
   attempt made on an older version (open question 1).
7. **Signed out:** answerable, not saved, with "Sign in to save".
8. **The block's range:** a quiz with a `title` and without; one item and twenty; two options and six;
   inline Markdown in prompts, options and explanations; a Korean variant; a quiz in a loose document.

**Sizing.** One surface: about 5 Pages or fewer, plus their components. `design-check` warns past 6
Pages or 16 boards. How the Pages divide the states is your call.

### The sibling jobs, drafting beside you (wave 2, P29.S5)

Each writes only its own folder under `docs/reference/design/jobs/`. You may read a sibling's tree; it
is a draft in progress, not signed.

- **`02-figures`** (critic): `figure`, the `figures` row, the `svg` block, `sources` and citations.
- **`03-diagrams`** (critic+judge): the `diagram` block and the tone palette.
- **`05-annotations`** (critic): bookmarks, highlights, notes, "Review this", the annotation panel and
  the per-book list. It reuses Sign in to save with "bookmarks" and "highlights and notes".

**Where this job meets them:**
- **Sign in to save** is shared, unchanged, with `05-annotations`: only `what` differs.
- **Annotation controls** (a bookmark on the quiz block, a highlight inside a prompt) are
  `05-annotations`'. Draw none.
- **The tones** (`ok`, `bad` and the rest) belong to `03-diagrams`. If the quiz's right and wrong
  states use colour, take it from the system's status roles or the reader's values, and say which; a
  shared value with the tones is a seam the critic checks.

Say in `result.md` what you assumed at each seam. The critic compares the wave's jobs, and a conflict
between two jobs reaches the operator as a wave choice.

### Not this job

- **Wave 3 (P29.S6):**
  - **`review`:** the review surface (the queue, the cards, Again and Good). This job draws no card.
  - **`legacy-and-print`:** the legacy reader and every print sheet, including the quiz's printed
    **answer key** at the chapter's end (S2 *Print*).
  - **`library`** and **`book-page`.**
- **`05-annotations`:** every bookmark, highlight and note control.
- **The reader (signed):** the chrome, the prose kit and Sign in to save, used as signed.
- **A legacy (HTML) explainer's own quiz:** it renders inside the legacy frame, untouched.
- **Scoring and analytics:** none exists, and none is in the contracts (open question 7).
- **The console, auth, graph and landing** stay unchanged.

## Screens × states

**Prototype first.** Every state below must be reachable on an interactive Page: by a click or, where
no click reaches it, by that page's state bar. The quiz is the one client island in a chapter (S2), so
on the canvas it answers, grades and retries for real.

Each state carries a one-line check the critic holds it to. Every state is drawn at phone (390×844),
iPad (820×1180) and desktop (1440×900), in light, dark and sepia; add iPad landscape (1024×768) where
the layout changes there. The critic checks all three themes.

### `choice`, single answer

- **Unanswered.** Check: the prompt and every option read clearly, and it is plain that one option is
  to be chosen.
- **Tapped the right option.** Check: it grades at once; "correct" is said in words, never by colour
  alone; the explanation shows.
- **Tapped a wrong option.** Check: the chosen option reads as wrong and the right one as right, each
  in words; the explanation shows.
- **Keyboard.** Check: the options are reachable and choosable by keyboard, with the system's focus
  ring, and the result is announced when it appears.
- **Six options, and two.** Check: both read as the same block; with six, nothing crowds at 390.
- **A long option** (three lines or more at 390), **an option with inline code, and a prompt with a
  link.** Check: the option wraps cleanly inside its target, and the link follows the reader's link
  rules.

### `choice`, multi-answer

- **Selecting.** Check: it is plain that more than one may be chosen ("select all that apply"), each
  selection toggles, and nothing grades until **Check**.
- **Check with every right option and no wrong one.** Check: graded correct, in words.
- **Check with a partly right selection.** Check: graded wrong, since `correct` is one value per item;
  the right answers show; how each option shows is stated (open question 2).
- **Check with nothing selected.** Check: what happens is stated, and the reader is never graded on an
  empty answer without knowing why.

### `recall`

- **Hidden.** Check: the prompt reads as a question to answer in your head, and the way to reveal is
  plain.
- **Revealed.** Check: the answer, and `explain` when present, show; the two self-grades are offered.
- **Self-graded `got`, and `missed`.** Check: the choice is recorded and said in words.
- **A long answer with inline code.** Check: it wraps inside the column.

### `cloze`

- **Empty.** Check: each blank is a field you can type in, at 16 px, at least 44 px tall below 40rem,
  and its length gives nothing away the design does not intend (state your rule).
- **Typed, before Check.** Check: nothing grades yet.
- **Correct,** including an answer that differs only in case or spaces, or matches an alternative
  (`{{PostgreSQL|Postgres}}`). Check: graded correct.
- **Wrong.** Check: each wrong blank shows what was accepted; how a partly right cloze shows is stated
  (open question 2).
- **Five blanks in one sentence,** and **a Korean answer** in the KO variant. Check: the blanks wrap
  with the text at 390 and at size 5, and Korean input compares after NFC normalization.

### Retry

- **Retry after a wrong answer, and after a right one,** for each type. Check: the block returns to an
  answerable state; what the reader is told about which attempt counts is stated (open question 4).

### On return, signed in

- **The latest attempt shown on return** ("your answer, v3"). Check: the block shows that saved answer
  and its grade, and the reader can try again.
- **A saved answer made on an older version of the chapter.** Check: what the reader sees is true:
  which version the answer was made on, when it differs from the one open (open question 1).
- **A saved answer whose item changed since** (S3 *Item drift*: a surviving item id renders the new
  content). Check: the block never shows a selection the reader did not make, nor an answer against
  options it was not made on, without saying so.

### Signed out

- **Answering, signed out.** Check: every type answers and grades exactly as for a member, and nothing
  claims to be saved.
- **"Sign in to save"** (`what` = "quiz answers"; `place` = "chapter", or "document" in a loose
  document). Check: it is the reader's §12 pattern, unchanged but for `what`; it never stops a
  signed-out reader from answering; where and when it shows is stated (open question 6).
- **The sign-in stand-in.** Check: it says the reader comes back to the same chapter and section.

### The block's range

- **A titled quiz and an untitled one.** Check: an untitled quiz still reads as a quiz.
- **A quiz of twenty items.** Check: a reader can keep their place, and nothing on the page moves when
  an item grades.
- **A one-item quiz.** Check: it reads as a quiz, not a stray question.
- **The Korean variant** (`lang="ko"`, the same item and option ids as English). Check: `keep-all`
  holds, never breaking mid-word or overflowing at 390.
- **A quiz in a loose document.** Check: it behaves exactly as in a chapter.
- **Text sizes 1, 3 and 5.** Check: options, blanks and buttons stay usable, with no sideways scroll.

## Every link and where it goes

Every link stays in the prototype: `design-check` fails `check=leaves-canvas` on an absolute URL.

- **Links in prompts, options and explanations** follow the reader's link rules (build prompt →
  *Wiring*): `#id` in the chapter, `chapter:` and `doc:` to a stand-in or a chapter state of this
  canvas, `https:` to the in-canvas External link note, an unresolvable target in the "missing link"
  style. A link inside an option must not be mistaken for choosing that option.
- **"Sign in" in Sign in to save** goes to the copied Sign in stand-in, which says the reader comes back
  to the same chapter and section; **"Not now"** closes the box.
- **The review surface:** if your answer to open question 5 links to it, the link goes to an in-canvas
  "Review — another job (`review`, P29.S6)" stand-in.
- **The reader's chrome** keeps its signed targets: back to the book, the library and sign in go to the
  copied stand-ins.

## Data

The design record is committed to this **public** repo, so whatever the canvas shows becomes public
(`phase.md` → `## Decisions` → *Canvas content rule*).

### Real questions first

- **The `knowledge` maintainer guide's own quizzes** (five chapters, five questions each, four options,
  one right answer, an explanation each) are real and public. Read them with
  `git show origin/main:docs/knowledge/<file>.html` (read only; never pull or merge), for example
  `2026-08-08-knowledge-what-it-is-and-how-it-is-used.html`, whose first question asks what happens
  when a user runs `/knowledge:explain` in a repo with no project by that name. Use them as the
  `choice` items, with their real titles: chapter 1 is "Knowledge: What It Is and How It Is Used".
- **Written for the canvas,** on the maintainer guide's subjects:
  - **multi-answer `choice`:** the corpus has two "either is right" questions, in other projects'
    documents, so the shape is evidence and the content is yours;
  - **`recall`:** the corpus has 16 self-check items, also elsewhere; same rule;
  - **`cloze`:** new, so all of it is yours;
  - **the KO variant:** translated for the canvas, keeping every item and option id (S2: a translation
    must carry the same item and option id sets).
- **A loose document's quiz:** an invented loose document in an invented project (a Finance or English
  note is fine).

### Saved answers

- **A signed-in reader** is an invented name with no email.
- **Saved attempts** follow the S2 payload: `response` is `{selected: [ids]}`, `{blanks: [strings]}` or
  `{self_grade: "got" | "missed"}`, with `correct`, `attempt` (numbered by the server), `version` and
  `answered_at`.

### Copy

- **The contract's words:** **Check** (S2), "select all that apply" (S2), and Sign in to save's text
  (§12). The self-grade values are `got` and `missed`; their button labels are yours.
- **The system README's content rules:** sentence case, no exclamation marks, no emoji, "…" for
  pending, "→" on links that move you on.
- **Other copy** (the result words, the retry control, the saved-answer line) is yours, in English,
  since chrome copy is English-only; log every string in `build-prompt.md`.

### Edge cases

- two options and six; a three-line option; inline code in an option; a link in a prompt;
- a multi-answer with two right options; an empty Check;
- a cloze with five blanks, an alternative, a case-only difference, a Korean answer;
- a recall answer with inline code;
- twenty items; one item; no title; a Korean variant; a loose document;
- a saved answer from an older version; an item that changed since.

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
- **Cached at `jobs/04-quiz/canvas/project/ds/kb/`:** `tokens.css`, `tokens.json`, `README.md` and
  `fonts/` (Fraunces, Source Sans 3, JetBrains Mono). Read the README first: its colour, type, layout,
  states and content rules bind.
- **Components: none.** No bundle ships, so there is no `x-import`. Every component this job needs is a
  **component gap**: draw it as markup on its own board and log it. Where the product already has one,
  match its values: buttons in `web/src/components/ui/app-button.tsx`, and the reader's buttons as
  signed.
- **The reader's values** (Literata, Noto Serif KR, the five sizes, sepia, the reader's motion and
  chrome tokens) are reader-scoped on the canvas, in the snapshot's `reader.css`. They are not in the
  system yet (build prompt → *Values P30 adds to the code*, items 1–8).
- **Known gaps this job meets:**
  - **No quiz component** anywhere in the product: today's quizzes live inside each HTML explainer.
  - **No text-input style for reading**: the system's inputs are the console's forms.
  - **No Hangul face in the system cache.** The canvas loads Noto Serif KR from Google Fonts CSS, as
    the reader does, and the interface falls back to the system Hangul fonts.

## Constraints

- **Viewports** (from `## Operator Runtime`): phone 390×844; iPad 820×1180 portrait and 1024×768
  landscape; desktop 1280–1440 wide, with 1440×900 as the reference.
- **Devices:** iPhone and iPad in Safari and Chrome, and Mac Chrome. Typing a cloze on a phone brings
  up the keyboard, which must not hide the blank being typed. Respect the safe areas.
- **The render model (S2):** the quiz is the chapter's only client island; everything around it renders
  on the server. **No JS widgets** beyond it (Q4's working assumption).
- **Who keeps what (S3):** a signed-in reader, member or not, gets the same features. A signed-out
  reader keeps nothing but the reader-settings cookie; nothing merges on sign-in (Q6's working
  assumption).
- **Continuous scroll, one fixed column,** with no width setting.
- **Theme:** follows System by default for every reader, signed-out readers included.
- **The accessibility floor:**
  - text ≥ 4.5:1, and large text and UI ≥ 3:1, in every theme, measured;
  - `kb-hint` never used for text a reader needs;
  - the system's focus ring (`kb-focus-w` in `kb-accent`);
  - targets of at least 44 px (`kb-tap`) below 40rem;
  - inputs at 16 px;
  - right and wrong never shown by colour alone;
  - `prefers-reduced-motion` respected;
  - every control operable by keyboard, with the result announced when it appears.
- **Korean (S2):** under `:lang(ko)`, `word-break: keep-all; overflow-wrap: anywhere; line-break:
  strict`, with a Hangul face before the generic fallback; Hangul runs inside English are wrapped in
  `lang="ko"` (§6a).
- **Layout:** the system's breakpoints (40, 64 and 90rem), measured on the reader root `rd`. The page
  never scrolls sideways at any width, and nothing on the page moves when an item grades.
- **No icon set and no emoji** (README). Use words and the text marks `·`, `…` and `→`.

## Locked vs. in play

### Locked

- **The signed reader,** whole (above), and Sign in to save as signed, changing only `what`.
- **The data contracts** (`phase.md` → S2 *Quiz*, S3 *Quiz results* and *Review items*): the three
  types and their fields, 1–20 items, 2–6 options, 1–5 blanks, grading on tap and on Check, the right
  answer and `explain` shown after grading, retry with the first attempt counting, the latest attempt
  shown on return, signed-out answering without saving, ids identical across languages.
- **The system's structure and brand spirit:** "A calm editorial library: warm paper, charcoal ink, one
  deep teal, and hairlines instead of boxes"; one interactive accent; no icon set.
- **The copy rules and the accessibility floor.**

### In play

- **The quiz block's look** and every state's: options, selection, Check, right and wrong, the
  explanation.
- **`recall`'s reveal and self-grade,** and **`cloze`'s blanks.**
- **Retry, and the saved answer on return.**
- **Where Sign in to save sits in the block.**

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
- "bookmark(where you left), more easy to another chapter good.  may help."

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
- **The signed reader** is now the established look inside a chapter.
- **Today's quizzes** (REFERENCE, the look this job replaces): the maintainer guide's chapters on
  `origin/main` end with a `## Quiz` section of `div.q` items whose options grade on click and reveal a
  `p.why`; the survey in `slices/P29.S2/result.md` §1.4 and §1.9 lists the variants.

## Direction

- **`new visual direction: no`** (the line at the top): this job extends the signed reader and the
  system. From the confirmed intent: "P27's design system went live with P28 and is the starting point,
  not something to replace wholesale. Reader typography and themes are in play." (`intent.md`).
- **One direction.** The operator asked for no options. Draw one, and log the open calls.

## Open questions, posed back

Draw your own answer to each, in the one direction, and log it under `open_questions` for the operator.
Only the operator's words settle them.

1. **"your answer, v3".** S3 says the reader shows the latest attempt on return, with this label as its
   example. It does not say whether "v3" names the chapter version the answer was made on (each attempt
   stores `version`) or the attempt's number (`attempt`). State your reading, and how a saved answer
   made on an older version shows. Flagged.
2. **A partly right answer.** `correct` is one value per item, so a multi-answer `choice` or a `cloze`
   that is partly right is wrong. Whether each option or blank shows its own right or wrong is your
   call, flagged.
3. **Answers across languages.** The latest attempt is kept per chapter and item, in any language (S3),
   and item and option ids are identical across variants. Whether an answer made in English shows when
   the reader opens the Korean variant is your call, flagged.
4. **Retry and the first attempt.** Whether the block tells the reader that only the first attempt
   counts for review, and what a retry looks like (clearing the item, or answering again from the
   graded state). Flagged.
5. **A review cue.** S3 sends every item into review on its first attempt, and the review surface is
   wave 3's `review`. No contract line says whether the quiz block mentions review. Draw your answer,
   flagged; an entry point to review from here is new scope, which the operator decides.
6. **Sign in to save's place.** Per quiz, per item or once per chapter, and before or after the first
   answer. Flagged. It never stops a signed-out reader from answering.
7. **A tally.** Whether a quiz of several items shows how many are answered or right. Nothing scores
   today, and no contract line asks for it. Flagged; a score is new scope, which the operator decides.

## Paths

- **Runtime:**
  `/private/tmp/claude-502/-Users-sugang-projects-personal-knowledge/f0010d83-1939-47da-8f62-5ffe37557260/scratchpad/artifact-files/616edd17-d700-40dc-a431-4a41316002a3/artifact-type/dc-runtime.js`
- **Type references:**
  `/private/tmp/claude-502/-Users-sugang-projects-personal-knowledge/f0010d83-1939-47da-8f62-5ffe37557260/scratchpad/artifact-files/616edd17-d700-40dc-a431-4a41316002a3/`,
  holding `SKILL.md` and
  `artifact-type/reference/{format,craft,design-system-components,view-state,diagrams}.md`
- **System namespace:** `kb`

## Required output

- **The canvas tree** under `jobs/04-quiz/canvas/project/`, passing `design-check 04-quiz`.
- **`rounds/01-quiz/result.md`**, holding:
  - the intent lines and the plan;
  - what was designed;
  - the data used, and which questions are the maintainer guide's;
  - every file copied from the signed reader;
  - what you assumed at each seam with `03-diagrams` and `05-annotations`;
  - every departure from this handoff;
  - the open questions;
  - the component gaps;
  - the measured contrast of every text and state colour you add, in light, dark and sepia.
- **`rounds/01-quiz/build-prompt.md`**, complete enough to build from without inventing anything:
  - each type's every state, and each transition between them;
  - grading: on tap, on Check, the empty Check, the normalization, the partly right answer;
  - retry, and the saved answer on return, with the version and drift cases;
  - the signed-out reader and Sign in to save's place;
  - keyboard behaviour and what assistive technology hears;
  - every string you wrote.

  The state bar and every stand-in are canvas-only, never something to build.
