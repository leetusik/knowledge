# Slice brief — P41-sr.D1, Listen

Written by the orchestrator on 2026-11-11 from the record:
- the phase's intent (`works/phases/active/P41-sr/intent.md`, *Confirmed Intent* and *Scope Added at Execution* A);
- the cut (`works/phases/active/P41-sr/topics/breakdown.md` → `## Build inventory`, `## P41-sr.D1`);
- the research (`works/phases/active/P41-sr/topics/phone-playback.md`, `voice-apis.md`, `voice-models.md`) and the spoken script (`server/spoken.py`, P41-sr.S1);
- the reader's code (`web/src/components/reader/reader-frame.tsx`, `web/src/content/reader.ts`, `web/src/components/book/`);
- the signed jobs 01–10 under `docs/reference/design/jobs/`.

## Product context

- **What knowledge is.** A hosted knowledge base that reads like an e-book. Coding agents publish documents
  and books of chapters into an org's library, and the operator reads them on the web. A chapter is written
  in a "native" Markdown grammar that the reader draws: callouts, diagrams, figures, charts, formulas, a quiz,
  sources and a glossary.
- **Who listens.** The operator, a solo developer, reads long explain documents about their own code on
  iPhone, iPad and a Mac. Documents come in English and Korean.
- **Why this job.** The operator wants to **listen** to a document, or to a whole book chapter after chapter,
  on their iPhone **with the screen off**. In their words (2026-11-10, `intent.md`): a Listen control in the
  reader that reads a document, or a book from a chapter onward, aloud, in a free AI voice they choose by
  ear.
- **What Listen reads** (the spoken script, built in P41-sr.S1; locked). It reads, in reading order:
  - the title, the summary and the headings;
  - prose, list items, quotes and callouts;
  - each table row as "header: cell; header: cell";
  - a figure's, diagram's or svg's text alternative and its caption;
  - a formula's alt text, its plain-words reading and its "where" legend.

  It **skips** code, quizzes, sources, the glossary and rules. Every spoken segment knows the block it came
  from (its id), which makes a "follow along" highlight possible.
- **How the audio reaches the phone** (research, P41-sr.R3; this shapes the states, not the look):
  - one continuous audio stream per Listen. A book from a chapter onward is one stream, and moving between
    chapters is a seek inside it;
  - the iPhone's lock screen shows the title (the chapter), the album (the book or document) and artwork, with
    ±15 s skip buttons. **The OS draws the lock screen**, so it is not a canvas surface;
  - the first play needs the reader's own tap;
  - the player must survive moving between pages of the reader, so it lives in a part of the page that
    persists, docked;
  - a full page load stops the audio.
- **Audio is made on demand.** It starts at the first Listen, in reading order, and is cached afterwards.
  Preparing can be long:
  - a document of about 34,000 characters is about 42 minutes of speech;
  - a book is 2.5–6 hours, and making all of it takes roughly 1–3.5 hours or more, depending on the voice;
  - playback can start once the first part is ready, while the rest is still being made;
  - a free API can hit a daily limit;
  - with the Mac as the voice runner (the operator's fallback), a job waits until the Mac is on.
- **The voice** is chosen once by the operator at this round's stop, one per language, from a separate samples
  page. **No voice picker is in scope** unless the drafter sees a need: pose that back as a question.

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

## The system inventory

- **Title: `knowledge`**, as the Design System Artifact shows it. Namespace `kb`. Artifact
  https://claude.ai/artifact/7qemgwHNsoPNf5kYHEJ4md, version `1792321604-e214` (`design.json`).
  - **This login cannot open that Artifact.** So the canvas installs the system from the **local cache** at
    `jobs/11-listen/canvas/project/ds/kb/`. That cache is byte-identical across jobs 01–09, at that version.
    P39-hk.D1 did the same.
- **Cached at `jobs/11-listen/canvas/project/ds/kb/`:** `tokens.css`, `tokens.json`, `README.md`, `fonts/`
  (Fraunces, Source Sans 3, JetBrains Mono).
- **The README's rules bind:**
  - one accent (`kb-accent`), and hairlines instead of boxes;
  - `kb-hint` never for body text;
  - no emoji, and sentence case;
  - a pending label is the verb plus "…";
  - Pretendard for Hangul, with `word-break: keep-all` on Korean headings;
  - interface copy in English.
- **The product's source of truth** is `web/src/app/kb-tokens.css`:
  - light is `[data-md-color-scheme="default"]`, warm ivory paper;
  - dark is `[data-md-color-scheme="slate"]`, warm charcoal.
- **Precedents in the reader** (what exists; documentation, not a decision):
  - **No audio UI exists anywhere in the product.** There is no `<audio>`, no Media Session, no player
    component, and no media icon set.
  - **The reader's top bar** is `header.rd-top` (`web/src/components/reader/reader-frame.tsx`).
    - Its actions sit in `.rd-top__end`: Language, Display, and Contents for a chapter or Notes for a loose
      document (labels in `web/src/content/reader.ts`, `top`).
    - It **hides on scroll** and comes back on scroll up.
    - Signed in job `01-reader`.
  - **A chapter's bottom nav** (Previous · Contents · Next; `reader.ts` `bottom`, label "Chapters") sits under
    the chapter.
  - **The reader's sheets** (Contents, Display, Notes) are signed in jobs `01-reader` and `05-annotations`.
    They are the precedent for a panel that opens over the page on a phone.
  - **The book landing** (`web/src/components/book/book-page.tsx`, `book-top.tsx`) is signed in job
    `07-book-page`.
  - **Status vocabulary:** the README's three status trios (active, idle, revoked), and its pending-label rule.
- **The signed look** is jobs 01–10. Their closed round snapshots (`jobs/<job>/rounds/*/canvas/project/`)
  are the vocabulary to extend.

## Constraints

- **Viewports:** phone 390×844, plus the narrow phone at 320 px; iPad 820×1180 portrait; desktop 1440×900
  as the reference.
- **Themes:** light and dark, both drawn for every surface. Listen has no print form.
- **Input:** touch, mouse and keyboard.
  - Every player control is reachable by Tab and works with Enter or Space.
  - A seek bar is operable with the arrow keys.
  - A global key shortcut is not in scope.
- **The accessibility floor:**
  - text ≥ 4.5:1; large text and UI ≥ 3:1; in light and dark, measured;
  - the system's focus ring;
  - targets ≥ 44 px on a phone;
  - a state never shown by colour alone;
  - `prefers-reduced-motion` respected (no essential meaning in motion);
  - the playing state and its changes announced to a screen reader;
  - icon-only buttons carry an accessible name.
- **The canvas plays no real audio.** Draw playback as states the state bar reaches; a moving position is
  drawn, not timed.

## Locked vs. in play

- **Locked:**
  - the `kb` system's structure and token meanings;
  - the reader's signed layout, top bar, sheets and book landing (jobs 01–10), which Listen joins and never
    reshapes;
  - the copy voice (the README's *Content fundamentals*);
  - the accessibility floor;
  - what Listen reads and skips (above);
  - one continuous stream per Listen, with chapters as seeks;
  - the lock screen itself, an OS surface that is not drawn (R3 recommends ±15 s there; a build item);
  - the first play from the reader's tap.
- **In play:**
  - where the Listen control sits on a document, a chapter and the book landing, and its form;
  - the docked player's form and placement on phone and desktop, and how it sits with the hiding top bar,
    the chapter bottom nav and the reading column;
  - the opened player's form: a sheet, a panel or another form;
  - how preparing, partial readiness, waiting, failures, offline, finished, resume and "audio outdated" read;
  - speed and skip controls in the page;
  - chapter navigation inside the player;
  - whether a "follow along" highlight of the block being read is offered, and how it looks and is switched.

## Collected taste, never invented

- The operator's own words, from `intent.md`: a Listen control; a free voice; English and Korean; playable
  with the screen off; quizzes, code and source lists skipped; a visual's alt text read.
- The established look, from the README: "A calm editorial library: warm paper, charcoal ink, one deep teal,
  and hairlines instead of boxes … Draw every surface as if it were a well-set page first and an app second."

## Shared data

Real titles and lengths from the operator's own knowledge base. Nothing on the canvas is secret or personal.
Use titles and lengths, never document text beyond a heading or a short sentence.

- **A loose English document:** "Our bar: performance rule v1".
  - 187 spoken segments, about **42 min** of speech, of which about 9 min are table rows.
  - Its sections include the heading "Decay".
- **Its Korean version:** "우리의 기준: 성과 규칙 v1", about **50 min**.
- **A book: "knowledge maintainer guide",** 5 chapters, English. The chapter titles, from their keys:
  1. "knowledge: what it is and how it is used"
  2. "System internals: the content plane, the write path and the contracts"
  3. "knowledge's read surfaces: two front ends, one corpus"
  4. "Shipping and running knowledge: distribution, the edge, security and the gates"
  5. "Why knowledge is this way, and how to change it"

  Per-chapter lengths are not measured. Use plausible ones (each 25–70 min, the book about 4 h) and keep them
  consistent across pages.
- **Edge cases:**
  - the longest chapter title on a 320 px phone;
  - a Korean title;
  - a book of 20 chapters (the operator's "changple5 curriculum" has 20);
  - a resume point deep in a book ("Chapter 4 · 12:30");
  - a document that is still preparing when the reader taps Listen;
  - the next chapter still preparing while the current one ends;
  - a free voice's daily limit reached, with a retry time;
  - the voice runner (the Mac) off.
- **Not on the canvas:** API keys, account names, or any private document text beyond the titles above.

## One direction

The operator asked for no options. Draw one direction and log open questions.

## The three paths

- The runtime: `docs/reference/design/.type/artifact-type/dc-runtime.js`.
- The type references: `docs/reference/design/.type/` (`SKILL.md`, `artifact-type/reference/format.md`,
  `craft.md`, `design-system-components.md`, `view-state.md`).
- The system namespace `kb`, cached at `jobs/11-listen/canvas/project/ds/kb/`.
