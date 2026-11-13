# Build prompt — the review surface (job `08-review`, round `01-review`)

This is the implementation contract for `/review`, the spaced-review page for a signed-in reader. It covers the page,
its cards, its ratings and every state it can be in. Three things are built from their own build prompts, unchanged:

- the signed reader's frame, chrome, sheets, themes, sizes, buttons, skeleton and editorial state:
  `jobs/01-reader/rounds/02-revise/build-prompt.md`;
- the quiz's parts: `jobs/04-quiz/rounds/01-quiz/build-prompt.md`;
- the highlight's paint and the undo line: `jobs/05-annotations/rounds/01-annotations/build-prompt.md`.

This round is a draft until the operator signs it. Where this file names an open question (Q1–Q10 in `result.md`),
build the drawn answer unless the operator's signoff says otherwise.

## Canvas-only (never build)

- **The state bar** (`[data-proto="state-bar"]`) at the top of pages 01 and 02, with:
  - its 34 presets;
  - the `· theme:` and `· text size:` rows.

  The bar is the first row of the scrolled page and scrolls away with it (the operator's bar, rule 1).
- **The foot strip** (`[data-proto="screens"]`) under the page, with:
  - its board links;
  - its **Back to the state bar** control (on 02: "Back to the three state bars").
- **The stand-ins** (board 04, `Elsewhere.dc.html`). Each one says where the reader would be; the product goes to the
  real screen:
  - "Reader — signed (01-reader)";
  - "Library — another job (06-library)";
  - "Sign in — another surface".
- **The grey proposal box** on the reader stand-in ("Proposal, not signed · open question 10"). It is a question for
  the operator, not a part to build. See *Open proposal* at the end.
- **The canvas machinery** in `review.js`, all of which the server does in the product:
  - the fixed clock (`NOW` = 2026-10-20T09:30:00Z, the reader in Asia/Kolkata);
  - the invented quiz `#wal-check` injected into the SQLite document;
  - the per-card interval previews;
  - the 900 ms simulated save, and the reply's counts;
  - the forced failed save, failed load and failed settings save;
  - the daily limits applied to the local queue (`applyLimits` in `review.js`: what the server does when it builds the
    queue; see *The queue's other states* and *Data*);
  - `RV.want` / `RV.flush` (a 3-second focus helper standing in for the focus rules below).
- **The Components boards (05–13) and the mounted-part boards (14–20).** Each state is the real part mounted with the
  props that make it, on a plain frame (`.rv-cellbox`, `.rv-solo`). A Components board is a catalogue, not a screen.
- **"200 due"'s by-book rows** (96 / 63 / 41) are static numbers for the canvas.

## What it is, and where it sits

- **The route:** `/review`. It is signed-in only (`require_user`).
  - A signed-out visitor is redirected to the existing `/login?next=/review` before any review data is read or
    rendered.
  - After signing in, `next` brings them back to `/review`.
  - The page renders nothing of the queue for a signed-out request: no counts, no card and no skeleton.
- **The frame (Q2, drawn): a focused frame in the reader's family.** It is not the app shell. It is:
  - the signed reader's `.rd-frame`, with its 3 px progress line and its 3.5rem sticky top bar;
  - one centred 36rem column (`--rd-measure`).

  The review page has no chapter bar at the foot.
- **Review state is private** (S3 *Privacy*): this page reads only the caller's own cards. Nothing on it is shared,
  indexed or sent to analytics.
- **The entry point** to `/review` lives in `06-library`'s app shell. If it shows a number, it reads `counts.due`.

## Tokens

This page adds **no new token**. Every value is one of:
- a `kb-*` system token;
- a signed `--rd-*` reader value;
- a signed `--an-*` highlight value (the paint).

**Themes (Q1, drawn).** Review follows the reader's own Display setting (System, Light, Dark, Sepia) and its text size
(1–5), per device, as the signed reader does. The Display sheet is the signed one, unchanged. Sepia's values are the
reader's (`reader.css`, `[data-theme="sepia"]`). If the operator rules that signed-in surfaces follow the OS
only, then:
- drop the Display button;
- render `data-theme` from `prefers-color-scheme`;
- keep size 3.

**Colour roles.**

| Role | Token | Where |
|---|---|---|
| Text | `kb-ink` | the title, counts' numbers, card text, the note, the book rows, the where-title |
| Secondary text | `kb-secondary` | the count words, the saved line, the card kind and source, interval previews, hints, the where-label and place, the end body |
| Hairlines | `kb-border-strong` (above and below the card, the empty state), `kb-border` (the where-block, the book rows, the settings day line) | structure, never boxes |
| Right / wrong | `kb-status-active(-ink)`, `kb-status-revoked(-ink)` | the signed quiz's marks and words; "Got it" and "Show sooner" / "Missed it" on a failed rating |
| Field error | `kb-status-revoked` (border, plus a 1px inset), `kb-status-revoked-ink` (the message) | settings validation |
| Interactive | `kb-accent` | the primary button (Next, Try again, Save settings, Continue reading), the focus ring, hover borders |

`kb-hint` is never used. Every text pair is measured in `result.md` → *Measured contrast*. All of review's own text is
at least 6.87:1 in every theme.

**Type steps on the page.** They are the signed steps, with no new size:

| Text | Face and size | Weight |
|---|---|---|
| Page title "Review" | Fraunces at `--rd-fs × 1.45`, leading 1.2 | 600 |
| End / limit title | Fraunces at `--rd-fs × 1.18` | 600 |
| Highlight quote | the reading face at `--rd-fs × 1.18`, leading 1.6 (the job's one bold move) | |
| Section title over a quote; empty title | Fraunces at `--rd-fs` | 600 |
| Questions, options, answers, explanations | the reading face at `--rd-fs`, leading 1.65 | |
| The interface | Source Sans 3 at 15 px (counts, buttons, the note, the where-title) and 13 px (sources, previews, hints, sub-lines) | |
| Labels | JetBrains Mono 11 px, uppercase (`QUESTION`, `HIGHLIGHT`, `YOUR NOTE`, `FROM THE CHAPTER`) | 700 |

## Layout

Spacing uses the `kb-space-*` scale. Inside the column it is multiplied by `--rd-k`, as the signed prose kit does; inside
interface rows it is fixed.

- **The frame:**
  - `.rd-frame`, a container named `rd` (inline-size);
  - top bar `.rd-top` at 3.5rem, in a sticky `.rd-topwrap` with the 3 px `.rd-line` above it;
  - content in `main.rd-flow.rv-page` (the signed grid, centring the 36rem column with the phone gutter at the sides;
    `rv-page` adds only the bottom padding, 4rem × `rd-k`);
  - bottom padding `2xl × k`.
- **The top bar:**
  - start: the logo (links to the library) and "‹ Library" (`.rd-back`, the chevron `aria-hidden`);
  - end: **Settings** and **Display**, each a `.rd-tbtn` with `aria-haspopup="dialog"` and `aria-expanded`;
  - the progress line's fill is `done_today ÷ (done_today + due + new_highlights)`.
- **The queue header** (`header.rv-head`): `padding-top: xl × k`, with a `xs` gap between rows.
  1. "Review".
  2. One wrapping row, `space-between`: the counts line (left) and **By book** (right, a `.rd-tbtn`).
  3. The saved line. It is always in the layout (`visibility: hidden` until the first save), so nothing below it
     moves.
  4. The by-book list, when open.
- **The card** (`article.rv-card`):
  - `margin-top: md × k`, between two 1px `kb-border-strong` rules. There is no box, no fill and no radius;
  - the card's head: a wrapping row of the kind label and its state tag (`.rd-tag--plain`);
  - the source line under it;
  - then the body (a quiz item, or a highlight), the foot, and the where-block.
- **A quiz card's body** is the signed quiz item (`.qz-item`), unchanged:
  - the grading margin column (`--qz-hang`) and the body;
  - set in the reading face (`.rv-q`, the prose kit's face, size and leading);
  - `padding-bottom: md × k`.
- **A highlight card's body** (`.rv-hl`):
  - padding `lg × k` above and `md × k` below, with a `sm × k` gap;
  - the section's title, the quote (with the signed paint, `mark.an-m`, plus `an-m--note` when there is a note), and
    "Your note" with the note;
  - the note is in the interface face at 15 px, `pre-wrap`, `text-wrap: pretty`, max 28rem (about 70 characters a
    line; the same measure as the end and empty bodies, `--rv-measure`).
- **The foot:**
  - **Choice and cloze** use the signed foot (`.qz-foot`: status `1fr` | actions `auto`), with one main button.
  - **Recall** (once the answer is shown) **and highlights** use the two-rating foot (`.rv-foot--pair`):
    - below 40rem: one column, the status line above two equal half-width buttons;
    - from 40rem: status | the two buttons side by side, right-aligned.
  - A rating button (`.rv-rate`) stacks its word (15 px semibold) over its interval (13 px, `kb-secondary`), min
    3.25rem tall, left-aligned:
    - below 40rem: `min-width: 0`, padding-inline 0.75rem, so the two halves always share the question's column (on a
      recall card that column sits right of the grading margin: 309.6 px at 390, 301.4 px at text size 5) and never
      overflow it; the interval may wrap to a second line rather than push the pair wider;
    - from 40rem: min 9.75rem wide, padding-inline 0.9rem.
- **The where-block** (`.rv-where`):
  - a `kb-border` rule above it, padding `md` / `md × k`;
  - the label, the chapter's title, the place line;
  - then a wrapping row (`.rv-where__acts`: flex, `justify-content: space-between`, gap `0 md`, `xs` above it) of
    "Open at this … →" (the signed accent link, `.rd-linkbtn.rv-where__link`, left) and "Suspend card" (the signed
    quiet button, `.rd-btn.rd-btn--quiet.rv-suspend`, right; never a `.rd-linkbtn`). Section 5 has the details.
- **The sheets:** the signed right-hand sheet (`.rd-sheet--right`) with its scrim, for Settings and for Display. On a
  phone it is the signed sheet's phone form.
- **The undo line:** the signed `05-annotations` toast, in the page slot (`.an-slot--page`): bottom centre, safe-area
  aware.

**At each width** (the container, not the viewport):
- **390 (phone):**
  - the counts and By book wrap onto two lines when needed;
  - the ratings take the full width, in two halves;
  - the where-row wraps, with Suspend under the link;
  - the sheet covers the width.
- **820 (iPad portrait):** the 36rem column centred, and the paired foot beside the status.
- **1440 (desktop):** the same column, centred; the top bar spans the frame.
- **iPad landscape (1024):** the same as 820. The layout does not change there, so it is not drawn separately.

**Nothing moves when a card changes state.** This is the signed quiz's rule, extended:
- every status sentence the foot can show is stacked in one grid cell, the others `visibility: hidden`;
- the main button holds all four labels (Check, Next, Saving…, Try again) stacked, so it keeps the widest one's width;
- a rating button keeps its word and "Saving…" stacked;
- the pair layer and the retry layer share one cell;
- the where-link is always laid out, and `visibility: hidden` on a quiz card's front;
- the saved line is always laid out;
- the counts and their loading skeleton share one cell.

Two things grow by design:
- a quiz's explanation and accepted answers, once it is graded;
- the recall answer, when it is shown.

A new card scrolls the page back only if the reader is below the card's head. The head then sits under the top bar.

## The parts, their props and their states

### 1. Queue header (`QueueHead`, board 16; states on board 05)

Props: `{due, new_highlights, done_today, by_book[], saved?, loading}`.

- **Counts:** "**{due}** due · **{new}** new highlight(s) · **{done}** done today".
  - The numbers are in `kb-ink` semibold and the words in `kb-secondary`, with tabular figures.
  - "new highlight" is singular at 1.
  - Every count is always shown, 0 included.
  - The counts change on every rating reply: S3's `counts` replace them as they arrive.
- **Loading:** the counts are hidden (`visibility`). A skeleton bar of their width (`.rv-count__sk`) has
  `role="status"` and `aria-label="Loading your cards…"`. **By book** keeps its place, unseen (`visibility: hidden`,
  disabled), while the queue loads or has failed: a dimmed control would read under 4.5:1.
- **By book (Q7, drawn): a read-only disclosure, not a filter.**
  - The button sets `aria-expanded` and `aria-controls` on the list.
  - The list (`aria-label="Due today, by book"`) has one row per `by_book` entry, in the server's order:
    - the title: `book_title`, or for a loose document, the project;
    - its counts, right: "{due} due" and/or "{new} new highlight(s)", joined by " · ", omitting a zero part;
    - its sub-line: "{project} · book", or "Documents not in a book".
  - The rows count **every card still due today**, the ones a daily limit holds for tomorrow included (S3's due is
    "due by the end of today"), so they always add up to the counts line.
  - Then one note, which says what the rows are:
    - while cards are shown: "The queue mixes every book, in the order the cards fell due."; when some new highlights
      are past today's limit, it adds " New highlights past today’s limit wait for tomorrow.";
    - at the reviews limit: "You reached today’s limit of {max_reviews_per_day} review(s), so these wait for tomorrow.";
    - at the new-highlights limit: "You reached today’s limit of {new_highlights_per_day} new highlight(s), so these wait
      for tomorrow.", or, at 0, "New highlights are paused, so these wait."
  - With no rows (done for today, no cards yet): "Nothing is due today in any book." It is never shown while a limit
    holds cards back.
  - Choosing a book does nothing. Narrowing the queue by book needs a contract addition (a `book` parameter on the
    queue route) and is left to the operator (Q7).
- **The saved line** (`role="status"`, always laid out): "**Saved** · Good · next review in {interval}" or
  "**Saved** · Again · next review in {interval}", from the rating reply's `card.interval`.
  - After a settings save: "**Settings saved** · {max} review(s) and {new} new highlight(s) a day".
  - It keeps the last save until the next one.

### 2. Card (`Card`, board 14; states on boards 06–09)

Props: the card payload (S3 *A card*) plus the page's local answer state, `pending` and `failed`.

- **Head:**
  - **The kind label:** `QUESTION` for any quiz type; `HIGHLIGHT` for any highlight card. A never-reviewed highlight
    says "New" once, in its state tag (below), never in the label as well.
  - **The state tag** (`.rd-tag--plain`), from `state`, `reps`, `lapses` and `due`:

    | Card | Tag |
    |---|---|
    | A highlight never reviewed | "New" |
    | A card reset by item drift | "Starts over" |
    | `relearning` and overdue | "Relearning · due {n} days ago" |
    | `relearning` | "Relearning" |
    | `learning`, made today | "Learning · added today" |
    | `review` | no tag |

    A reset card also shows the signed quiz's drift note (`.qz-note`): "This question changed since your last review,
    so its card starts over. Your history is kept."
- **The source line:**
  - "{book_title} · Chapter {n} of {total}" for a book;
  - "{project} · Document" for a loose document;
  - plus " · 한국어" (`lang="ko"`) when the card renders in Korean.
- **A quiz card's body** is the signed quiz item, re-asked:
  - the numeral is the item's number in its quiz;
  - the prompt, the hint, the options or blanks, Show answer, the grading marks, the tags, the words, the accepted
    answers and the explanation are all exactly as `04-quiz` builds them, from the card's `front` and `back`.
- **A highlight card's body:**
  - `front.block_title`, the section;
  - `front.quote`, painted with `mark.an-m`. The paint is not a control here: `cursor: auto`, and it opens nothing;
  - `front.note` under "Your note", when there is one.

  Each part carries the language of its own text (`lang`).
- **Korean:**
  - the card carries `lang="ko"` on the quiz item or on the quote, note and section;
  - under `:lang(ko)`: `word-break: keep-all; overflow-wrap: anywhere; line-break: strict`, with Noto Serif KR in the
    reading and display faces;
  - the interface (labels, buttons, previews) stays English.

### 3. The foot: Next, or the two ratings (`Rating`, board 15; states on board 10)

**Choice and cloze: one main button**, `.rd-btn` + `.qz-act` + `.rv-main` (the signed button's own size: `.rv-main`
names the button and carries no padding of its own). It moves through four phases:

| Phase | Label | Look | Press does |
|---|---|---|---|
| Before grading (multi choice, cloze) | **Check** | `rd-btn--secondary` | grades, as the quiz does |
| Graded | **Next** | `rd-btn--primary` | rates: right → Good, wrong → Again |
| Sending | **Saving…** | primary at full opacity (never the dimmed `:disabled` look), `aria-busy="true"`, disabled | — |
| Failed | **Try again** | primary | resends the same `review_id` |

- **Single choice** grades on tap, so there is no Check. The button keeps its place, unseen (`visibility: hidden`,
  `aria-hidden`, disabled), until the grade.
- **Status cells, one shown at a time:**

  | State | Word | Sub-line |
  |---|---|---|
  | Before grading | none | |
  | Pressed Check with nothing chosen or typed | "Nothing to check yet" | "Choose at least one answer first." or "Fill in at least one blank first." |
  | Right | "Correct" (`kb-status-active-ink`) | "Next rates it Good · in {good interval}" |
  | Wrong | the quiz's own verdict, in `kb-status-revoked-ink`: "Incorrect", "Incorrect · partly right", or "Incorrect · {k} of {N} blanks right" | "Next rates it Again · in {again interval}" |
  | Failed | the verdict word | "Not saved · check your connection" |

  The sub-line says the rating **before** Next is pressed.

**Recall (after Show answer) and highlights: two ratings, Good first** (the signed quiz's order). Each is
`.rd-btn.rd-btn--secondary.rv-rate`:

| | Recall | Highlight |
|---|---|---|
| Good | "**I got it**" over "Good · in {good interval}" | "**Got it**" over "Good · in {good interval}" |
| Again | "**I missed it**" over "Again · in {again interval}" | "**Show sooner**" over "Again · in {again interval}" |
| Status cell | "Did you get it?" | "Did it stay with you?" |

A recall card's front shows no foot until the answer is shown (the signed Show answer). Pressing a rating on a recall
card also records the quiz's self-grade (`got` / `missed`), so the margin marks it as the quiz does.

- **Sending:**
  - the pressed button swaps its word for "Saving…" (`aria-busy="true"`);
  - both buttons are disabled, with the unpressed one's text in `kb-secondary`;
  - Suspend is disabled.
- **Failed:**
  - the status cell says the chosen word ("Got it", "Missed it" or "Show sooner", in its right or wrong colour) over
    "Not saved · check your connection";
  - the pair is replaced, in the same cell, by one **Try again** button.

**Interval previews (Q4, drawn).** They read "in {n} {unit}", from `previews.again.interval` and
`previews.good.interval`:

| Interval | Reads as |
|---|---|
| under 60 minutes | minutes: "in 10 minutes" |
| under a day | whole hours: "in 3 hours" |
| under 60 days | whole days: "in 1 day", "in 23 days" |
| under a year | whole months, days ÷ 30.4: "in 2 months" |
| from a year | years to one decimal, ".0" dropped: "in 1.3 years", "in 2 years" |

Units are singular at 1. The server sends the interval (in days or minutes); the page only formats it.

**Every rating is announced** in a polite live region (`p.rv-vh[aria-live="polite"]`): visually hidden, its 1 px box
`overflow: hidden`, and its sentence in an inner block (`.rv-vh__t`), so a long announcement never widens the page on a
phone. It is review's own class; the signed quiz's `.qz-vh` is left as signed. It says:
- "Saving…";
- then the outcome, or "Not saved · check your connection";
- on a graded card, the verdict and its sub-line.

### 4. The way back into the chapter (in the card; Q8, drawn)

- **The label:** "FROM THE CHAPTER", or "FROM THE DOCUMENT" for a loose document.
- **The title:** `where.chapter_title`, or the document's title, in its language.
- **The place:**
  - "Quiz “{quiz title}” · question {n} of {N}" for a quiz card (with no quiz title: "Quiz · question {n} of {N}");
  - "Section “{block_title}”" for a highlight.
- **The link:** "Open at this question →" or "Open at this highlight →", which goes to `where.href` (the signed reader
  at the card's block).
  - On a quiz card it is shown **on the back only**: after the grade, or after Show answer. It is never shown on the
    front, so the chapter cannot give the answer away.
  - A highlight has no back, so its link shows at once.
- **Review keeps its place:** coming back from the reader (history back, or the entry point), the queue reloads and the
  same card is first if it is still due. The rating that was not yet sent is not kept.

### 5. Suspend (Q5, drawn)

- **The control:** "Suspend card", a `<button type="button">` drawn as the signed quiet button
  (`.rd-btn.rd-btn--quiet`, plus review's `.rv-suspend`), at the right of the where-row, under every card. It is not
  the accent link: only "Open at this … →" is a `.rd-linkbtn`.
  - **Rest:** the signed quiet look: a transparent border and fill, `kb-radius-sm`, the 15 px semibold label in
    `kb-secondary`, min height `kb-tap`, padding-inline 0.75rem.
  - **Hover:** the signed quiet hover: the label turns `kb-ink` on a `kb-surface-sunken` fill.
  - **Focus and press:** the signed focus ring, and the signed 1 px press (`.rd-btn:active`).
  - **Its place:** `.rv-suspend { margin-right: -0.75rem; }` cancels the right padding, so the label's right edge sits
    on the card column's right edge (the same edge as the rating pair and the main button above it).
  - **It stays at the right when the link is not shown** (a quiz card's front): the link keeps its place, unseen
    (`.rv-where__link.is-off { visibility: hidden; }`, with `aria-hidden="true"` and `tabindex="-1"`), never
    `display: none`, so Suspend never jumps left when the answer is shown.
  - **Disabled** (while a rating is sending; section 3):
    `.rv-suspend:disabled { opacity: 1; color: var(--kb-secondary); }`, at full opacity, never the signed dimmed
    `:disabled` look (`kb-secondary` at 0.6 reads 2.77–3.54:1 across the three themes), with the signed `not-allowed`
    cursor. Under the pointer the signed quiet hover's fill still shows; the label stays `kb-secondary`.
- **Pressing it:**
  - sends `PATCH /app/reader/review/cards/{id}` `{status: "suspended"}`;
  - the card leaves at once (optimistic) and the next card shows;
  - `due` (or `new_highlights`) drops by one;
  - focus moves to the next card (or the end state).
- **The undo line** (the signed toast):
  - "Card suspended. It leaves your reviews and keeps its history.";
  - for a highlight card: "Card suspended, and Review this is off on its highlight.";
  - **Undo** sends `{status: "active"}`, puts the card back first with its answer state, and restores the count.
- **The line clears** on the next rating or suspend.
- **Not drawn: a failed suspend.** Build it like the annotations' failed delete:
  - the card comes back;
  - the undo line reads "Not suspended · check your connection", with **Try again**.

  The string is logged below.
- **Finding a suspended card again is not drawn** (Q5). There is no list of suspended cards. A highlight's card comes
  back when "Review this" is turned on again in the reader.

### 6. The queue's other states (`ReviewEnd`, board 17; states on board 11)

- **Done for today** (no cards left, `next_due_at` present):
  - the mark "DONE FOR TODAY" (the signed `.rd-end__mark`, hairlines on both sides);
  - the title "That’s every card due today.";
  - the body "You reviewed {done_today} card(s) today. The next card is due {when}, your time.", where `{when}` is
    "today at HH:MM", "tomorrow at HH:MM" or "on D Mon at HH:MM", in `day.time_zone`, 24-hour;
  - then the continue-reading block (Q9, drawn): the signed `.rd-next`, with "Continue reading", the chapter's title,
    "{book} · Chapter {n} of {N} · {p}% read", and **Continue reading →** (primary). It comes from `GET continue?limit=1`.
    Without a continue pointer, the block is omitted.
- **A daily limit reached.** The cards a limit holds back are **still due today** (S3: due = due by the end of
  today), so the header's counts stay true and are the held numbers: "{due} due · {new} new highlight(s) · {done} done
  today", with no card. The end card says why and what is left:
  - **Reviews** (`done_today` reached `max_reviews_per_day`): title "You reached today’s limit of
    {max_reviews_per_day} review(s)."; body "{due} more card(s) and {new} new highlight(s) are due, and they wait for
    tomorrow. Your next review day starts at {day_starts_at_hour, HH:00}." (a zero part is left out; one thing left
    reads "is due, and it waits").
  - **New highlights** (every due card done, and today's new highlights used up): title "Your reviews are done, and
    so are today’s {new_highlights_per_day} new highlight(s)."; body "{new} more new highlight(s) wait(s) for tomorrow.
    Your next review day starts at 04:00."
  - **New highlights paused** (`new_highlights_per_day` is 0): title "Your reviews are done. New highlights are
    paused."; body "{new} new highlight(s) wait(s). They join your reviews when New highlights a day is above 0."
  - All three add "Change your daily limits →" (opens Settings) and the continue-reading block.
  - **How the page knows:** the queue returns no card while `counts.due + counts.new_highlights > 0`. Which limit it
    is comes from the profile (`done_today >= max_reviews_per_day` is the reviews limit; otherwise new highlights).
    See *Data* → the proposed `limit_reached` field, which says it outright.
  - **The limits apply in the session:** a rating that brings `done_today` to the limit ends the session there (the
    reviews limit, with the cards left held); saving a lower limit in Settings does the same at once; raising it
    brings them back.
- **No cards yet:**
  - the title "No review cards yet";
  - the body "A card is made when you answer a quiz question in a chapter, or turn on Review this on a highlight. It
    comes back here when it is due.";
  - **Open the library →** (primary), to the library.
- **Loading:**
  - the header's counts skeleton;
  - a card-shaped skeleton (`.rv-sk`): the kind, the source, two question lines (95% and 70%), a hint and four option
    bars of `kb-tap` height, indented by the grading margin;
  - the signed `.rd-skel`, which is still under `prefers-reduced-motion`.
- **Failed to load:** the signed editorial state (`.rd-ed`):
  - "Error · 500";
  - "Something on our side stopped reading.";
  - "Your cards did not load. Try again — and if it keeps failing, the reference below tells us where it stopped.";
  - **Try again** (primary), which re-fetches the queue;
  - the mono reference "ref · {request id}".

### 7. Review settings (`ReviewSettings`, board 18; states on board 13; Q6, drawn)

These open from **Settings** in the top bar, in the right-hand sheet, titled "Review settings" with **Close**. The sheet
holds one form, for `PATCH /app/reader/profile`:

1. The lead: "These apply to all your cards, on every device."
2. **Time zone:**
   - a `<select>` of IANA zones, labelled "Time zone";
   - the hint "Your review day and every due time follow it. It was taken from this browser on your first review.";
   - each option reads "{IANA id} · UTC±HH:MM".
3. **Reviews a day:**
   - a numeric text field (`inputmode="numeric"`, 16 px), labelled "Reviews a day";
   - the hint "The most cards you review in one day. The rest wait for tomorrow.";
   - the error "Enter a whole number from 1 to 999.", which takes the hint's place in one grid cell (`.rv-msg`).
4. **New highlights a day:**
   - the same kind of field, labelled "New highlights a day";
   - the hint "Highlights you have not reviewed yet that join your reviews each day. 0 pauses new ones.";
   - the error "Enter a whole number from 0 to 999.", in the same kind of cell.
5. The day line: "Your review day starts at 04:00, so a review after midnight still counts for the day before."
   (`day_starts_at_hour` is not editable in S3.)
6. The actions: **Save settings** (primary; "Saving…" while sending; "Try again" after a failure) and **Cancel**
   (quiet).

The states:
- **Edit.**
- **Invalid:** on Save, each bad field gets the revoked border, `aria-invalid="true"` and its error, and nothing is
  sent. **Nothing below the field moves:** the hint and the error are stacked in one grid cell (`.rv-msg`, both laid
  out, the one not shown `visibility: hidden`), so the cell keeps the taller one's height and the error simply takes
  the hint's place. `aria-describedby` names the error first, then the hint. Focus goes to the first invalid field.
- **Saving:** "Saving…" in Save settings' place, at full opacity (`aria-busy="true"`, disabled); the dimmed `:disabled`
  look reads under 4.5:1 on the accent fill.
- **Failed:** "Not saved · check your connection" (`role="status"`) above the buttons, with the draft kept.

On success the sheet closes, focus returns to Settings, and the saved line says "Settings saved · …". The queue
re-fetches, because the limits change what is shown today: a limit lowered to today's reviews or under ends the
session at once (the limit state), and a limit raised again brings the held cards back, in order.

The bounds 1–999 and 0–999 are this canvas's invention. Use the server's validation if it differs, and keep the
messages' form.

### 8. Display (the signed `DisplayPanel`, board 19)

The signed Display sheet, unchanged: theme and text size, "Saved on this device. Your other devices keep their own."

## Behaviour

### The queue

- **Load:** `GET /app/reader/review/queue?limit=…` (a page size the server chooses; the canvas holds the whole day).
  Show the first card. When the page has
  rated or suspended its way to the last loaded card and `counts.due + new_highlights > 0`, fetch again.
- **Order:** as the server sends it. S3 puts overdue relearning first, then by due. The canvas puts **new highlights
  after the due cards**: an assumption the server should confirm.
- **Again comes back today.** A card rated Again with an interval inside today's day goes to the end of the local
  queue. It stays counted in `due`, as the reply's `counts` say.
- **The counts are the server's:** each rating reply's `counts` replace the header's. Nothing is counted on the client.
- **Drift and readability:** the server's. The page renders what the queue holds:
  - a reset card shows "Starts over" and the drift note;
  - a retired card and an unreadable chapter's card never arrive.

### Rating

1. The reader presses **Next** (graded types), or a rating (recall and highlight).
2. The page makes a `review_id` (UUID) for this rating of this card and sends `POST
   /app/reader/review/cards/{id}/review` `{rating, response?, review_id}`. The `response` is the quiz answer: the
   chosen ids, the typed blanks, or `got` / `missed`.
3. **Pending:** "Saving…" in place, and every control on the card disabled.
4. **Saved:** the reply `{card: {due, interval, state}, counts}` arrives. The saved line says "Saved · {Good|Again} ·
   next review in {interval}", the counts update, the next card shows, and focus moves to the next card's article.
5. **Failed** (a network error or 5xx):
   - "Not saved · check your connection" and **Try again**;
   - the card stays, with its answer;
   - **Try again sends the same `review_id`**, so a rating that did reach the server is never counted twice. A rating is
     never dropped silently.
6. **A reply that arrives late** applies only to the rating that sent it. A new `review_id` ignores an older reply.

### Focus and keyboard

- **The tab order** follows the page:
  1. the top bar;
  2. By book;
  3. the card (options or blanks, Show answer, the main button or the ratings);
  4. the where-link;
  5. Suspend card.
- **The system's focus ring** is `kb-focus-w` in `kb-accent`: the reader's `:focus-visible` rule.
- **Choice and cloze** use the signed quiz's keyboard rules: options are buttons in the tab order, and Enter or
  Space chooses (single) or toggles (multi); in a blank, Enter is Check, and Tab moves between blanks and on to Check.
- **After grading,** focus moves to **Next**. After Show answer, it moves to the answer.
- **After a save or a suspend,** focus moves to the next card's article (`tabindex="-1"`, labelled by its kind), or to
  the end state's section.
- **A sheet:**
  - opening one moves focus to its **Close**;
  - Escape or the scrim closes it;
  - focus returns to the button that opened it.

### Motion

- The skeleton's pulse is the signed `.rd-skel`, held still under `prefers-reduced-motion`.
- Nothing else animates beyond the signed sheet and toast transitions, which reduced motion also stills.

### Keyboard rising on a phone

The cloze field is 16 px, so iOS does not zoom. The card scrolls the focused blank into view above the keyboard; the
foot follows the blanks, so Check stays reachable. Respect `env(safe-area-inset-*)` on the frame and the toast slot,
as the signed reader does.

## Wiring

| Control | Goes to |
|---|---|
| Logo, "‹ Library" | the library (`06-library`'s route) |
| Open at this question / highlight → | `where.href`: the signed reader at the block, in `where.lang` and `where.version` |
| Continue reading → | the continue pointer's chapter, at its position |
| Open the library → (empty) | the library |
| Change your daily limits → | opens the Settings sheet |
| Signed out | a redirect to `/login?next=/review` |

## Data the page needs

**The queue route** (S3), and what the page reads from it:

| Field | The page shows |
|---|---|
| `counts.due`, `counts.new_highlights`, `counts.done_today` | the counts line; the progress line |
| `counts.by_book[]` `{org, project, book?, book_title, due, new}` | the by-book rows |
| `day.{start, end, time_zone}` | the time zone for every "today at" or "tomorrow at" |
| `next_due_at` | "The next card is due {when}, your time." |
| `cards[]` | the card, in order |
| `card.source`, `item_type`, `state`, `reps`, `lapses`, `due` | the kind label and the state tag |
| `card.where.*` | the source line, the where-block, the link |
| `card.front`, `card.back` | the body (the quiz parts, or the highlight) |
| `card.previews.again.interval`, `card.previews.good.interval` | the interval previews and the Next sub-line |

**The profile:**
- `time_zone`, `day_starts_at_hour`, `max_reviews_per_day`, `new_highlights_per_day`;
- read with the queue (or `GET /app/reader/profile`), for the settings form and the limit states.

**A proposed contract addition, for P30.** The limit states read what is held for tomorrow from S3's own counts:
a card a limit holds back is still due today, so it stays in `counts.due` (or `counts.new_highlights`) and in
`counts.by_book[]`, while `cards[]` leaves it out. The one thing the page cannot be told for certain is which limit
emptied the queue, so it asks for:
- `limit_reached: "reviews" | "new_highlights" | null`.

Without it, the page infers the limit from the profile (above). The server must keep held cards in the counts: if it
counted only the cards it returns, the limit state would say "0 due" beside a body that names the cards left, and by
book would say nothing is due.

**A quiz card's numbering** ("question {n} of {N}", the quiz's title) needs `where.block_title` (the quiz's title),
`where.item_index` and `where.item_count`. They are not in S3's `where`. This is another proposed addition, or the server
renders the place line.

**The canvas's sample data** (invented, never real personal data):
- the reader "Ari Han (invented; no email)", in Asia/Kolkata;
- 14 due, 3 new highlights and 6 done today;
- cards from "The knowledge maintainer guide" (the real chapter titles), "Tidewater, from the inside" and the loose
  document "SQLite's write-ahead log, in practice".

## Every state, and the board that shows it

| State | Prototype preset (01, 02) | Components board |
|---|---|---|
| Cards due (the header with every count) | Cards due | 05 Queue header |
| By book open; 200 due; one card left; loading counts; saved line | By book open; 200 due; One card left; Loading; Saved, next card | 05 |
| Choice, one answer: asked, right, wrong | Cards due; Choice · right; Choice · wrong | 06 Choice card |
| Select all: partly right | Select all · partly right | 06 |
| Six options; long card with code; loose document | Six options; Long card · document | 06 |
| Changed question (reset); card made today; relearning, overdue | Changed question; Card made today; Cards due | 06 |
| Quiz card in 한국어 | Quiz card in 한국어 | 06 |
| Cloze: one blank; three blanks, wrong with accepted forms; right | Cloze · one blank; Cloze · three blanks, wrong | 07 Cloze card |
| Recall: prompt; answer shown; long answer | Recall · prompt; Recall · long answer | 08 Recall card |
| Highlight: with note; 한국어; new, no note; 500-character note | Highlight · with note; Highlight · 한국어; Highlight · new, no note; Highlight · long note | 09 Highlight card |
| Ratings, Next, the interval forms (minutes to years), at 640 and 390 | (each card) | 10 Ratings |
| Rating: saving; failed | Rating · saving; Rating · failed | 10 |
| Done for today; limit (reviews); limit (new highlights); no cards; loading; failed | Done for today; Limit · 200 reviews; Limit · new highlights; No cards yet; Loading; Failed to load | 11 |
| Suspended, with undo | Suspended | 12 |
| Settings: edit; invalid; saving; not saved | Settings open; Settings · not saved | 13 |
| Display open | Display open | 19 |
| Signed out | Signed out (the Sign in stand-in) | 04 |

## Every string written for review

(The quiz's and the annotations' own strings are in their build prompts and are used unchanged.)

- **Top bar:** "Library" (after "‹"), "Settings", "Display", logo `aria-label` "knowledge library".
- **Header:**
  - "Review"
  - "{n} due · {n} new highlight / new highlights · {n} done today"
  - "By book"
  - "Loading your cards…" (`aria-label`)
  - "Due today, by book" (`aria-label`)
  - "{n} due", "{n} new highlight(s)"
  - "{project} · book", "Documents not in a book"
  - "The queue mixes every book, in the order the cards fell due."
  - " New highlights past today’s limit wait for tomorrow."
  - "You reached today’s limit of {n} review(s), so these wait for tomorrow."
  - "You reached today’s limit of {n} new highlight(s), so these wait for tomorrow."
  - "New highlights are paused, so these wait."
  - "Nothing is due today in any book."
  - "Saved · Good · next review in {interval}", "Saved · Again · next review in {interval}"
  - "Settings saved · {max} review(s) and {new} new highlight(s) a day"
- **Card:**
  - Labels: "Question", "Highlight", "Your note".
  - Tags: "New", "Starts over", "Relearning", "Relearning · due {n} days ago", "Learning · added today".
  - Source: "{book} · Chapter {n} of {N}", "{project} · Document", " · 한국어".
  - Drift note: "This question changed since your last review, so its card starts over. Your history is kept."
- **Foot:**
  - Main button: "Check", "Next", "Saving…", "Try again".
  - Status: "Nothing to check yet", "Choose at least one answer first.", "Fill in at least one blank first.".
  - Sub-lines: "Next rates it Good · in {interval}", "Next rates it Again · in {interval}", "Not saved · check your
    connection".
  - Recall: "Did you get it?", "I got it", "I missed it".
  - Highlight: "Did it stay with you?", "Got it", "Show sooner".
  - Previews: "Good · in {interval}", "Again · in {interval}".
  - Interval units: "minute(s)", "hour(s)", "day(s)", "month(s)", "year(s)".
- **Where:**
  - "From the chapter", "From the document"
  - "Quiz “{title}” · question {n} of {N}", "Quiz · question {n} of {N}", "Section “{title}”"
  - "Open at this question →", "Open at this highlight →"
  - "Suspend card"
- **Suspend:**
  - "Card suspended. It leaves your reviews and keeps its history."
  - "Card suspended, and Review this is off on its highlight."
  - "Undo"
  - Not drawn: "Not suspended · check your connection", "Try again".
- **End states:**
  - Done:
    - "Done for today"
    - "That’s every card due today."
    - "You reviewed {n} card(s) today. The next card is due {today|tomorrow|on D Mon} at HH:MM, your time."
  - Limits:
    - "You reached today’s limit of {n} review(s)."
    - "{n} more card(s) and {n} new highlight(s) are due, and they wait for tomorrow. Your next review day starts at
      HH:00." (one thing left: "is due, and it waits")
    - "Your reviews are done, and so are today’s {n} new highlight(s)."
    - "{n} more new highlight(s) wait(s) for tomorrow. Your next review day starts at HH:00."
    - "Your reviews are done. New highlights are paused."
    - "{n} new highlight(s) wait(s). They join your reviews when New highlights a day is above 0."
    - "Change your daily limits →"
  - Continue reading: "Continue reading", "{book} · Chapter {n} of {N} · {p}% read", "Continue reading →".
  - Empty:
    - "No review cards yet"
    - "A card is made when you answer a quiz question in a chapter, or turn on Review this on a highlight. It comes
      back here when it is due."
    - "Open the library →"
  - Failed:
    - "Error · 500"
    - "Something on our side stopped reading."
    - "Your cards did not load. Try again — and if it keeps failing, the reference below tells us where it stopped."
    - "Try again"
    - "ref · {id}"
- **Settings:**
  - "Review settings", "Close"
  - "These apply to all your cards, on every device."
  - Time zone:
    - "Time zone"
    - "Your review day and every due time follow it. It was taken from this browser on your first review."
  - Reviews a day:
    - "Reviews a day"
    - "The most cards you review in one day. The rest wait for tomorrow."
    - "Enter a whole number from 1 to 999."
  - New highlights a day:
    - "New highlights a day"
    - "Highlights you have not reviewed yet that join your reviews each day. 0 pauses new ones."
    - "Enter a whole number from 0 to 999."
  - "Your review day starts at 04:00, so a review after midnight still counts for the day before."
  - "Save settings", "Saving…", "Try again", "Cancel", "Not saved · check your connection"
  - Zone option form: "{IANA id} · UTC±HH:MM".

## Open proposal (Q10): an entry to review from the quiz

The signed quiz's save line links nowhere, and stays so until the operator decides. The proposal, drawn only on the
reader stand-in, is that the line could end with a link that names what is due: "Saved for review · Review 13 cards
due today →". Build nothing for it unless the operator signs it.

## Values P30 adds to the code

- **Review's parts** (`review.css`): the queue header, the card frame, the two-rating foot, the where-block, the end
  states, the card skeleton and the settings form. All are built from `kb-*` and signed `--rd-*` values, with no new
  token.
- **Reused unchanged:** the signed reader's frame, sheet, buttons, `.rd-skel`, `.rd-ed`, `.rd-next` and
  `.rd-end__mark`; the quiz's item, foot and swap; the annotations' paint, field and toast.
- **Contract additions proposed above:** `limit_reached` (with held cards kept in S3's counts), and the quiz place
  fields in `where`.
