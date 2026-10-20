# Build prompt — the quiz block (job `04-quiz`, round `01-quiz`)

The implementation contract for the `quiz` block inside the signed reader. It is complete on its own for the block;
everything around the block (the chrome, the prose kit, the themes, the sizes, Sign in to save) is the signed reader's
build prompt (`jobs/01-reader/rounds/02-revise/build-prompt.md`) and is built from there, unchanged.

A draft until the operator signs it. Where this file names an open question (Q1–Q10 and the C09 border gap in `result.md`), the drawn answer
is what to build unless the operator's signoff says otherwise.

## Canvas-only (never build)

- **The state bar** (`[data-proto="state-bar"]`) at the top of pages 01 and 02, with its presets and the
  `· theme:` and `· text size:` rows, and **the foot strip** (`[data-proto="screens"]`) under the page, with its board
  links and its **Back to the state bar** control (02: "Back to the three state bars"), which scrolls the page back to
  the bar and focuses the page's pressed preset. The bar is part of the scrolled page and scrolls away (the operator's
  bar, rule 1). Nothing in the product corresponds to any of it.
- **The stand-ins** (board 04, `Elsewhere.dc.html`): Book page, Library, Sign in, Legacy reader and External link, copied
  from the signed reader. Each says where the reader would be; the product goes to the real screen.
- **The canvas machinery:** `reader.js` (the Markdown and YAML parsing, the data, the fixed clock `NOW` =
  2026-10-20T09:30:00Z, `RD.quiz.relink`, the focus helper's 3-second window) and `flow.js` (the presets, the
  650 ms simulated save and the forced "failed" outcome). The product parses on the server and saves over the network.
- **The Components boards (05–09) and the mounted-part boards (10–13):** each state is the real block mounted with
  the clicks that lead to it (`steps`), on a plain frame (`.qz-solo`, `.rd-board`). A Components board is a catalogue,
  not a screen.
- **`session: true` and `send`** on an attempt in the canvas's history mark one made in this canvas session and the
  send that carried it; a failed send removes its attempt from the canvas's history. The product has neither field: on
  return it reads the attempts the server holds, and a failed send never reached it.
- **Board 03 opens at the quiz** when drawn alone (the canvas's `aloneJump`), so the frame shows the part this job adds.
  The product opens a chapter as the signed reader does.

## What it is, and where it sits

- **The block:** ```` ```quiz #id ```` (S2), one per fence, in the chapter's one 36rem column (`--rd-measure`), between
  prose blocks, in the reading flow. It is the chapter's **only client island** (S2 *Render model*): the server
  renders the whole chapter, the block included, and the block hydrates to answer, grade, retry and save.
- **Server-rendered first paint.** The server renders the block in the state its view model gives (below): every item
  unanswered for a signed-out reader; for a signed-in reader, each item's latest saved attempt, graded, with its
  provenance line. Hydration attaches the handlers and changes nothing visible, so nothing moves when the island wakes.
  Before hydration the controls are inert; nothing else is needed.
- **The same in a chapter and in a loose document.** Only Sign in to save's `place` differs ("chapter" or
  "document").
- **Grading is client-side** (S2): the key ships in the page.
- **Annotations** (bookmarks, highlights, notes) are `05-annotations`' and draw nothing on the block in this job.

## Tokens

No new token. Every value is a `kb-*` system token or a signed `--rd-*` reader value. The block adds two local custom
properties, computed from the reader's:

| Property | Value | Used for |
|---|---|---|
| `--qz-nfs` | `calc(var(--rd-fs) * 1.18)` | the numeral and the quiz title (the reader's h3 step) |
| `--qz-hang` | `calc(var(--qz-nfs) * 1.75)` | the grading margin's column width |

**Colour roles** (light, dark and sepia take the system's values; sepia is the reader's, in `reader.css`):

| Role | Token | Where |
|---|---|---|
| Interactive, pressed, focus | `kb-accent`, `kb-accent-soft` | hover border, a multi selection before Check, the focus ring, a focused or hovered blank |
| Right | `kb-status-active`, `-soft`, `-ink` | the ring round a right numeral, a right option's border and fill, the right answer's ring, "Correct", "Got it", a right blank |
| Wrong | `kb-status-revoked`, `-soft`, `-ink` | the slash through a wrong numeral, a wrong chosen option, "Incorrect…", "Missed it", a wrong blank |
| Neutral | `kb-ink`, `kb-secondary`, `kb-surface`, `kb-surface-sunken`, `kb-border`, `kb-border-strong` | text, hints, the label, the recall card, the drift note, hairlines |
| Text on a filled key | `--rd-on-accent` (signed) | the letter in a filled key (selected, right or wrong) |

`kb-hint` is never used. Every pair is measured in `result.md` → *Measured contrast*; all text is at least 5.17:1.

**Seam with `03-diagrams`:** right and wrong use the system's **status roles**, not the diagram tones. If the diagram
job's `ok` and `bad` tones settle on other values, the quiz keeps the status roles (one meaning per role across the app:
the console already says "active" and "revoked" with them).

**Type steps** (all signed): the numeral and the quiz title at `--qz-nfs` in Fraunces 600; prompts, options, the recall
answer and explanations at `--rd-fs` in the reading face, leading 1.65 (options 1.5); the interface's fixed 15 px
semibold (buttons, the verdict word) and 13 px (the hint, the sub-line, the option tags, the count); the 11 px mono
label (`QUIZ · 7 QUESTIONS`, `ANSWER`, the blank numbers).

## Layout

All spacing is the `kb-space-*` scale, multiplied by `--rd-k` inside the column (as the signed prose kit does) and
fixed inside the interface rows.

- **The block** (`section.qz`, `aria-label` = "Quiz: {title}" or "Quiz"): `margin-top: xl × k`; a 1 px
  `kb-border-strong` rule above the head and below the last item, `kb-border` hairlines between items. No box, no fill.
  `scroll-margin-top` = the progress line + the top bar + `md`, so a jump to the block or an item clears the chrome.
- **The head:** one wrapping row, `space-between`: the label (left) and the count (right); the title below it.
- **The items:** an `<ol>` of `<li id="{block}--{item}">`, each a two-column grid: the grading margin
  (`--qz-hang`) and the body (`minmax(0, 1fr)`), `column-gap: sm`, `padding-block: lg × k`, baseline-aligned so the
  numeral sits on the prompt's first line.
- **The foot of an item:** a grid `[status (1fr) | actions (auto)]`, `column-gap: md`, `margin-top: md × k`. The status
  cell's top padding centres its first line on the 44 px button.
- **At 390 px:** the same layout; the margin column stays (about 37 px at size 3), options and blanks take the body's
  width, the actions keep their width and the status wraps beside them. Nothing scrolls sideways at sizes 1–5.
- **Nothing moves when an item grades** (the reader's "it holds still" rule): every mark is a `box-shadow` ring, a
  pseudo-element or a tag on a border; every status sentence the item can show is stacked in one grid cell (the others
  `visibility: hidden`); a button that changes its label holds both labels stacked, so it keeps the longer one's width.
  What does grow, by design: the explanation and the accepted answers appear below the foot once graded, and the
  recall card grows when the answer is shown.

## The parts, their props and their states

### 1. The block head (`Quiz`, board 10)

- **Label:** `QUIZ · {N} QUESTION(S)` (written "Quiz · 7 questions", set uppercase), the 11 px mono label in
  `kb-secondary`. It is what makes an untitled or one-item quiz read as a quiz.
- **Count:** "{X} of {N} answered", 13 px, `kb-secondary`, tabular numbers, in every quiz of two or more items. It is
  always in the head and `visibility: hidden` (and `aria-hidden`) until the first item is graded (X = 0 → hidden), so
  the head keeps one height and nothing below it moves when the first answer lands or Try again brings X back to 0.
  A one-item quiz has no count. It counts graded items (a saved answer counts). It never says how many are right (Q7:
  no score).
- **Title** (when `title` is set): the h3 step in Fraunces 600, `text-wrap: balance`, `keep-all` under `:lang(ko)`.
  Not a heading element (a quiz title is not a section of the chapter, and the Contents list stays the chapter's
  headings); the block's `aria-label` carries it.

### 2. The grading margin (the bold move)

- The item's number hangs in its own column in Fraunces 600 at `--qz-nfs`, in a 1.75em circle box, `kb-secondary`,
  `lining-nums tabular-nums`. `aria-hidden`; a visually hidden line carries it for assistive technology (below).
- **Right** (`.qz-n--ok`): the number turns `kb-status-active-ink` and is circled: `box-shadow: inset 0 0 0 2px
  kb-status-active`.
- **Wrong** (`.qz-n--bad`): the number turns `kb-status-revoked-ink` and is struck by one 2 px `kb-status-revoked`
  stroke, `border-radius: 1px`, rotated 38°, centred, `0.1em` past the box at both ends.
- **Recall:** "got" circles, "missed" strikes.
- A mark is never the only signal: the verdict is always said in words beside the action.

### 3. Prompt, hint and note

- **Prompt:** inline Markdown in the reading face (`p.qz-q`, `id="{block}--{item}-q"`). Links follow the reader's link
  rules (signed prose kit §6, *Wiring*).
- **Hint** under it, 13 px `kb-secondary`, one per type (strings below).
- **Note** (only when an attempt could not be carried over, *On return*): 13 px `kb-ink` on `kb-surface-sunken`,
  `kb-radius-sm`, padding `xs sm`, under the hint.

### 4. `choice` (`QuizChoice`, board 11)

- **Options:** a `<ul>` (`aria-label` "Answers to question {n}") in a column with `gap: md` (so a tag on an option's
  top border, half of it above the border, clears the option above), inside a `role="group"`
  labelled by the prompt. Each option is a box in the signed Display panel's choice look (`.rd-opt`): 1 px
  `kb-border-strong`, `kb-radius-sm`, `kb-surface`, `min-height: kb-tap`, padding `0.5rem 0.85rem 0.5rem 0.55rem`;
  a grid `[key | text]`, `column-gap: sm`.
- **The key** (the option's letter, A–F from its position; the option `id` never shows): a 1.75rem
  (28 px) mark, 1.5 px `kb-secondary` ring, 13 px JetBrains Mono 700. **A circle for a single answer, a square
  (`kb-radius-sm`) for "select all that apply"**, so the shape says which kind before the hint is read. Its first line
  centres on the option text's first line.
- **The whole row is the target:** a transparent `<button type="button">` covers the row (`inset: -1px`); the text's
  links sit above it (`z-index: 2`), so following a link never chooses the option.
- **Single answer** (`answer` has one id): grades **on tap**.
  - *Unanswered:* default; hover: border `kb-accent`.
  - *Graded:* the chosen option, if right: border and inset ring `kb-status-active`, fill `kb-status-active-soft`, key
    filled `kb-status-active` with the letter in `--rd-on-accent`, tag "Your answer · correct". If wrong: the same in
    `kb-status-revoked`, tag "Your answer · incorrect"; and the right option: border and ring `kb-status-active`, no
    fill, key ring `kb-status-active` with the letter in `-ink`, tag "Correct answer". Every other option stays as it
    was. The buttons are `aria-disabled="true"`; hover no longer tints.
- **Multi answer** (`answer` has two or more ids): each option toggles; nothing grades until **Check**.
  - *Selected:* border and inset ring `kb-accent`, fill `kb-accent-soft`, key (square) filled `kb-accent`. Each button
    is `role="checkbox"` with `aria-checked`.
  - *Graded* (on Check): each **chosen** option shows right or wrong as above; each **right option not chosen** shows
    "Correct answer"; a wrong option not chosen stays plain. (Q2: each option shows its own right or wrong.)
- **The tag** sits on the option's top border at the right (`right: 0.7rem`, centred on the border), 13 px semibold,
  in `-ink`, on `kb-surface`, `white-space: nowrap`. It takes no layout space.
- **A long option** wraps inside its box at any size; inline code wraps with the signed `.rd-ic` rules.

### 5. `recall` (`QuizRecall`, board 12)

- **Hidden:** under the prompt and hint, the answer card (`kb-surface-sunken`, `kb-radius-sm`) holds the label
  `ANSWER` and the **Show answer** secondary button on one wrapping row (`space-between`). The button has
  `aria-expanded="false"` and `aria-controls` the card.
- **Revealed:** the card grows to hold the label, the answer (reading face, `kb-ink`) and `explain` when present
  (`kb-secondary`), padding `sm md (md × k)`. The card takes focus (`tabindex="-1"`, `role="group"`, `aria-label`
  "Answer to question {n}"). The foot shows "Did you get it?" and two secondary buttons, **I got it** and **I missed
  it**.
- **Self-graded:** the foot shows "Got it" (status-active ink) or "Missed it" (status-revoked ink) with the save line,
  and **Try again** (quiet) in place of the two buttons. The two layers are stacked in one cell (the hidden one
  `visibility: hidden` and `aria-hidden`), so the foot never changes size.

### 6. `cloze` (`QuizCloze`, board 13)

- **The text** is inline Markdown with 1–5 blanks; each blank is an `<input type="text">` inline in the sentence.
- **Every blank is the same width**, `min(7.5em, 100%)`, whatever it accepts, so its length gives nothing away; a
  longer answer scrolls inside the field. Height `kb-tap` (44 px) at every width; no box, a 2 px `kb-secondary`
  underline (7.48:1 in light); the reading face at `max(1rem, 1em)`, so it is never under 16 px (no zoom on iOS).
- **The sentence's line height** is `max(3.25rem, 2.3em)`, so every line holds a 44 px field and a blank never pushes
  its line apart from the next.
- **With two or more blanks** each field is preceded by its number (11 px mono, `kb-secondary`, `aria-hidden`), kept
  on one line with its field (`white-space: nowrap` round the pair); one blank shows no number.
- **What touches a blank's end stays on its line:** the characters that follow a blank with no space between them (a
  comma, a full stop, a Korean particle such as 을 or 에) go inside the same no-wrap group, so a line never starts with
  "," or "에". Only plain characters are taken (up to the first space or Markdown mark).
- **States:** empty; typed (hover and focus: underline `kb-accent`, plus the focus ring); graded: a right blank's
  underline `kb-status-active` and text `-ink`; a wrong blank's underline `kb-status-revoked`, its text `-ink` and
  **struck through** (1.5 px), so wrong is a shape as well as a colour. Graded fields are `readonly` with
  `text-overflow: ellipsis`: a long answer is cut on purpose at the field's fixed width (nothing moves), and a wrong
  blank's whole answer is in its "You wrote" line.
- **Inputs:** `autocomplete`, `autocapitalize` and `autocorrect` off, `spellcheck="false"`, `enterkeyhint="done"`.
  `aria-label` "Blank {n} of {N}".
- **The phone keyboard:** each field has `scroll-margin-block` = the top chrome + `md` and the chapter bar + `md`, so a
  focused blank scrolls clear of the bars and the keyboard (the reader's chrome hides on scroll as signed). Respect the
  safe areas as the reader does.

### 7. The foot: what happened, beside the action

- **Status** (left): a 15 px semibold verdict word and, under it, a 13 px `kb-secondary` sub-line (the save line or the
  provenance). Every sentence the item can show sits in one grid cell, the others `visibility: hidden` and
  `aria-hidden`, so the cell is always as tall as the longest.
- **Actions** (right): one button whose label is **Check** (secondary) before grading and **Try again** (quiet) after;
  both labels are stacked inside it, so it keeps the wider one's width. The reader's quiet and secondary buttons, as
  signed, with `padding-inline: 1rem` on the quiz's own action so a quiet "Try again" reads as a button.
- **When it shows:** single `choice`, once graded; multi `choice` and `cloze`, always (Check); `recall`, once the
  answer is shown.

### 8. After grading: accepted answers and the explanation

- Below the foot, `margin-top: sm × k`:
  - **cloze, wrong:** one line per wrong blank, 15 px `kb-secondary`: "{n}" (mono, only with 2+ blanks), "You wrote
    “{value}”." (the value in `kb-ink`, trimmed at its ends and otherwise as typed, `white-space: pre-wrap`, so
    "write  lock" shows its two spaces) or "Left empty.", then "Accepted: **A** or **B**." (the accepted forms in
    semibold `kb-ink`, joined by ", " and a final " or "). A right blank gets no line.
  - **`explain`** (choice always; cloze when present), in the reading face.
- `recall`'s explanation is inside its card, never here.

### 9. Sign in to save (signed §12, unchanged)

- Mounted as signed with **`what` = "quiz answers"**, `place` = "chapter" (or "document" in a loose document), not
  raised, `onSignIn` and `onDismiss`.
- **Where and when (Q6):** once per view, **under the first item a signed-out reader grades**, inside that item's `<li>`,
  aligned to the body column (`margin-left: --qz-hang + sm`). It opens when the item grades, never before, and never
  blocks answering. **Not now** closes it for the rest of the view (no other item opens it) and moves focus to that
  item's main button. Reloading the chapter shows it again on the next first grade.
- **Sign in** goes to sign-in, which returns the reader to the same chapter, scrolled to that item
  (`#{block}--{item}`); nothing they answered signed out is kept (S3: nothing merges on sign-in).

## Behaviour

### States per item, and the transitions

`state = { phase: open | revealed | graded, selected: [option ids], blanks: [strings], self: got | missed | null,
empty: bool, correct: bool | null, save: null | saving | saved | failed, later: bool, origin: live | saved, note,
provenance }`

| Type | From | Action | To |
|---|---|---|---|
| single `choice` | open | tap an option | graded (selected = [it]); saves (signed in) |
| multi `choice` | open | tap an option | open, the option toggled; `empty` cleared |
| multi `choice` | open | Check, nothing selected | open, `empty` = true ("Nothing to check yet"); not graded, not saved |
| multi `choice` | open | Check, something selected | graded; saves |
| `recall` | open | Show answer | revealed |
| `recall` | revealed | I got it / I missed it | graded (self = got / missed; correct = self is got); saves |
| `cloze` | open | type | open, the blank's value set; `empty` cleared |
| `cloze` | open | Check or Enter in a blank, every blank empty after trimming | open, `empty` = true; not graded, not saved |
| `cloze` | open | Check or Enter, at least one blank filled | graded; saves |
| any | graded | Try again | open, cleared (no selection, no values, no self-grade); a drift note stays |

There is no "un-reveal" for recall; Try again from graded returns it to hidden.

### Grading

- **choice:** `correct` = the selected set equals the `answer` set. **Partly right** (multi only) = not correct and
  at least one right option chosen: the verdict reads "Incorrect · partly right". `correct` stays one value (S3).
- **cloze:** each blank is right when its value, normalized, equals one of its accepted forms, normalized.
  **Normalize:** Unicode NFC → trim leading and trailing whitespace → case-fold (upper then lower case) → NFC.
  Inner spaces count ("write  lock" with two spaces is wrong). An empty blank is wrong. `correct` = every blank
  right. With 2+ blanks and not all right, the verdict reads "Incorrect · {k} of {N} blanks right" (k may be 0).
- **recall:** `correct` = the reader chose "I got it".
- **An empty Check** (multi or cloze): no grade, no attempt, nothing saved; the status reads "Nothing to check yet"
  with the reason, and the next selection or keystroke clears it.

### Saving (signed in) and the first attempt

- Every graded attempt is sent (S3 *Quiz results*): `{response, correct, version, answered_at}`; the server numbers
  `attempt`. The sub-line reads **"Saving…"** while it is in flight, then **"Saved for review"** on the item's first
  attempt or **"Saved · review keeps your first answer"** on any later one (Q4: the block says which attempt counts
  only when it matters, on a retry). Which one follows the `attempt` number in the server's reply (1, or more), never
  a count the page keeps. A failed send reads **"Not saved · check your connection"**; the grade stands. **A failed
  send is not an attempt:** the server never got it, so it never shows on return and the next attempt that saves is
  the item's first ("Saved for review").
- **A send's result lands only on the attempt that started it:** give each send an id; when it returns, drop it if
  that item's current state is no longer that send (the reader retried, or moved on).
- **No review cue beyond that line (Q5).** The block names review only in the save line; it links nowhere. An entry
  point to review is the `review` job's and the operator's call.

### On return, signed in

For each item the block shows the **latest** saved attempt for (chapter, block, item), in any language and version
(S3), unless that answer cannot be shown truthfully. An attempt made earlier in the same visit counts as soon as it is
saved: leaving the chapter, or switching its language or version, and coming back shows it here like any other.

1. **A `cloze` answered in another language:** shown fresh (unanswered), with the note "You answered this in
   {Language} on {date}. Typed answers stay in their language, so it starts fresh here."
2. **The item changed shape since** (S3 *Item drift*): the shape is the type, the option ids and the `answer` set for
   `choice`; the number of blanks for `cloze` (and, in the same language, each blank's accepted set, normalized);
   the type alone for `recall`. A changed shape shows fresh, with the note "You answered a different version of this
   question ({vN} or {Language vN}, {date}), so it starts fresh here." A wording change keeps the shape.
3. **Otherwise** the item shows graded from the saved attempt, as if just answered (marks, tags, struck blanks, the
   explanation), with the provenance line in place of the save line:
   - same language and version: "Your answer from {d Mon yyyy}";
   - same language, another version (Q1: "v3" is the **chapter version** the answer was made on): "Your answer from
     {date}, on v{N}";
   - another language (Q3: a choice or recall answer carries across, since ids are identical): "Your answer from
     {date}, in {Language} v{N}".
   Try again from there starts a new attempt ("Saved · review keeps your first answer" when it grades).
- A note stays on the item through retry and grading in that view, so nothing jumps.
- Dates: `d Mon yyyy` in English (chrome copy is English-only), e.g. "12 Oct 2026". Language names: "English",
  "한국어" (the language's own name, wrapped in `lang="ko"`).

### Signed out

Every type answers, grades, explains and retries exactly as for a signed-in reader. Nothing is sent and no save line
shows (the status cell reserves no sub-line). Sign in to save opens as in *Parts* §9.

### Retry and focus

- **Try again** clears the item and moves focus to its first control: the first option, the first blank, or Show
  answer.
- **Show answer** moves focus to the answer card; **I got it / I missed it** moves focus to Try again.
- **Choosing a single-answer option** keeps focus on the chosen option (now `aria-disabled`); Tab goes on to Try again.
- **Not now** on Sign in to save moves focus to that item's main button.
- Focus never moves on a link, and moving focus never scrolls (`preventScroll`); the moved-to control is already in
  view.

### Keyboard

- Options are buttons in the tab order; Enter or Space chooses (single) or toggles (multi). Graded options stay
  focusable (`aria-disabled`) so the result can be read.
- In a blank, Enter is Check; Tab moves between blanks and on to Check.
- Every control shows the system's focus ring: `kb-focus-w` solid `kb-accent`, offset `kb-focus-offset`.
- `prefers-reduced-motion`: the option and blank transitions (`--rd-ease`) are off, as the reader's are.

### What assistive technology hears

- Each item begins with a visually hidden line: "Question {n} of {N}", plus ", correct", ", incorrect", ", got it" or
  ", missed it" once graded.
- Options: a group labelled by the prompt, a list "Answers to question {n}"; each option button is labelled by its
  key, its text and its tag ("B … Your answer · correct"); multi options are checkboxes.
- Blanks: "Blank {n} of {N}".
- **One polite live region per item** (visually hidden) announces the result when it appears: "{verdict}. {sub-line}"
  ("Correct. Saved for review."), "Nothing to check yet. Choose at least one answer first.", or "Answer shown. Did you
  get it?". Hidden status sentences and hidden action layers are `aria-hidden`.
- The marks in the margin are `aria-hidden`; the words carry the meaning.

### Korean

- Under `:lang(ko)` the block takes the reader's rules (`word-break: keep-all; overflow-wrap: anywhere; line-break:
  strict`) and the Hangul faces. The hint and button copy stay English (chrome copy). A Korean cloze answer compares
  after NFC, so an NFD "쓰기 잠금" from a Korean IME matches.

## Wiring

- **Links in prompts, options and explanations:** the reader's link rules (signed *Wiring*): `#id` scrolls within the
  chapter, `chapter:` and `doc:` open that chapter or document, `https:` opens the External link note, an unresolvable
  target shows in the signed "missing link" style. A link inside an option is above the option's button and never
  chooses it.
- **Sign in** → sign-in, returning to `#{block}--{item}` in this chapter. **Not now** closes the box.
- **Item anchors:** `#{block}--{item}` (`#check--read-column`) for returning from sign-in or a link; the block itself is
  `#{block}`.

## Data the page needs

**The block (S2), parsed on the server:**

```yaml
# ```quiz #check
title: Check what stuck          # optional
items:                           # 1–20
  - id: read-column
    type: choice
    prompt: "inline Markdown"
    options: [{id: a, text: "inline Markdown"}, …]   # 2–6
    answer: [b]                  # 2+ ids = select all that apply
    explain: "inline Markdown"
  - id: projection
    type: recall
    prompt: "…"
    answer: "inline Markdown"
    explain: "…"                 # optional
  - id: write-path
    type: cloze
    text: "… {{write lock|WRITE_LOCK}} … {{SQLite}} …"   # 1–5 blanks; | separates accepted forms
    explain: "…"                 # optional
```

**A saved attempt (S3):** `{doc, lang, version, block_id, item_id, item_type, response, correct, attempt,
answered_at}`, `response` one of `{selected: [ids]}`, `{blanks: [strings]}` (raw, as typed),
`{self_grade: "got" | "missed"}`.

**The view model per block:** `{id, title?, label, count, hasCount, items[]}`; per item: `{domId, n, type, prompt,
hint, note?, marks (nCls), srLabel, status[] (every sentence, one on), live, options[]? (key, text, cls, tag),
answer? (recall), segs[]? (cloze text runs and blanks with value, readOnly, cls), acc[]? (cloze), explain?, showSave,
place}`. `member` (signed in or not), `doc`, `lang`, `version` come from the reader.

## Every state, and the board that shows it

On page **01** (`Main`) by clicking or the state bar; at 390, 820 and 1440 on page **02** (`Widths`); one state per
cell on Components boards **05–09**. Light, dark and sepia, and text sizes 1–5, from the bar's `· theme:` and
`· text size:` rows on 01 and 02, and side by side on the Components boards.

| State | 01 / 02 preset | Components board |
|---|---|---|
| single, unanswered | Quiz · unanswered | 06 |
| single, right / wrong | Single · right / Single · wrong | 06 |
| six options, two options | 20 questions · 7 answered | 06 |
| long option, inline code, a link in the prompt | Quiz · unanswered (q3, q7) | 06 |
| multi selecting, empty Check, partly right, right | Multi · … | 06 |
| recall hidden, shown, got, missed | Recall · … | 07 |
| cloze empty, typed, right (case, spaces, alternative), partly right | Cloze · … | 08 |
| five blanks; Korean answer | 20 questions · 7 answered; 한국어 · cloze, Korean answer | 08 |
| retry after right and after wrong, per type | Second attempt, after Try again (and Try again on any item) | 09 |
| save failed | Answer not saved | 09 |
| save failed, then Try again and a saved answer (the first) | Answer not saved, then Try again and answer | 09 |
| an answer from this visit, on return | answer, then Next and Previous (or 한국어 and back) | — |
| on return: same version, older version, another language, changed item | On return · saved answers; 한국어 · saved English answers | 09 |
| signed out, Sign in to save, after Not now | Signed out · … | 09 |
| titled, untitled one-item, twenty items | Quiz · unanswered; One question · untitled; 20 questions · 7 answered | 05 |
| a loose document | Quiz in a document; Signed out · Sign in to save | 05 |
| Saving… (transient) | any grade, signed in (650 ms on the canvas) | 09 (held) |

## Every string written for the quiz

**Head:** "Quiz · {N} question" / "Quiz · {N} questions" (shown uppercase by the label style); "{X} of {N} answered"
(hidden while X is 0).

**Hints:** "Choose one answer." · "Select all that apply." · "Answer it in your head, then show the answer." · "Fill in
the blank. Capitals and spaces around the answer don't count." · "Fill in the blanks. Capitals and spaces around each
answer don't count." (Only the ends are trimmed: inner spaces count, *Grading*.)

**Buttons:** "Check" · "Try again" · "Show answer" · "I got it" · "I missed it".

**Recall card label:** "Answer".

**Verdicts:** "Correct" · "Incorrect" · "Incorrect · partly right" · "Incorrect · {k} of {N} blanks right" · "Got it" ·
"Missed it" · "Did you get it?" · "Nothing to check yet".

**Empty Check reasons:** "Choose at least one answer first." · "Fill in at least one blank first."

**Option tags:** "Your answer · correct" · "Your answer · incorrect" · "Correct answer".

**Accepted answers:** "You wrote “{value}”." · "Left empty." · "Accepted: {A}." / "Accepted: {A} or {B}." /
"Accepted: {A}, {B} or {C}."; list label "Accepted answer" / "Accepted answers".

**Save line (signed in):** "Saving…" · "Saved for review" · "Saved · review keeps your first answer" · "Not saved ·
check your connection".

**Provenance (on return):** "Your answer from {d Mon yyyy}" · "Your answer from {date}, on v{N}" · "Your answer from
{date}, in {Language} v{N}".

**Drift notes:** "You answered this in {Language} on {date}. Typed answers stay in their language, so it starts fresh
here." · "You answered a different version of this question (v{N}, {date}), so it starts fresh here." ·
"You answered a different version of this question ({Language} v{N}, {date}), so it starts fresh here."

**Assistive technology only:** "Question {n} of {N}" (+ ", correct" / ", incorrect" / ", got it" / ", missed it") ·
"Answers to question {n}" · "Answer to question {n}" · "Blank {n} of {N}" · "Answer shown. Did you get it?" ·
the block's name "Quiz: {title}" / "Quiz".

**Sign in to save:** the signed §12 strings with `what` = "quiz answers".

## Values P30 adds to the code

None beyond the signed reader's list. The quiz's two local properties (`--qz-nfs`, `--qz-hang`) live with the
component. No system token changes.
