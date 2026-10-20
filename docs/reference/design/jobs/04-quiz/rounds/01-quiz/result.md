# Result — job `04-quiz`, round `01-quiz` (slice P29.S5)

Drafted on 2026-10-20 by the design drafter. A draft until the operator signs it.

## Intent, one line per Page

- **01 · Quiz in a chapter (the flow).** The operator, signed in on an iPhone, iPad or Mac, has just read a chapter of the maintainer guide and wants to check what stuck before moving on; the first thing they must see is the question, with how to answer it, and, once answered, whether they were right, in words.
- **02 · The quiz at 390, 820 and 1440.** The same reader on the three reference devices; what must show first is that options, blanks and buttons stay usable and nothing scrolls sideways at any text size.
- **03 · The chapter screen alone.** The signed chapter screen, now carrying the quiz block where a chapter's `quiz` fence sits; drawn alone it opens at the quiz, so what shows first is the block this job adds, inside the reader's chrome.
- **04 · Stand-ins.** The signed stand-ins, reached from the quiz's links and from "Sign in"; what must show first is where the reader would be and that they come back to the same chapter and section.

## Plan (written before the first board)

**Boards.**
- Row 1, Pages: 01 the flow (`Main`), 02 the three widths (`Widths`), 03 the chapter alone (`Reader`, copied and extended), 04 the stand-ins (`Elsewhere`, copied unchanged).
- Row 2, Components: 05 the quiz block, 06 the choice question (single and multi), 07 the recall question, 08 the cloze question, 09 saved answers, retry and the signed-out reader. Each mounts the real block (`Quiz`) once per state, with the state as props.
- Row 3, mounted parts (the component gaps, drawn as markup): `Quiz`, `QuizChoice`, `QuizRecall`, `QuizCloze`.
- Row 4, the signed reader's parts, copied so the chapter renders: top bar, chapter bar, opening, prose, callout, code block, table, chapter list, chapter end, Sign in to save, display panel, version history, loading states.

**Type steps (all the reader's; nothing new).** In the column: the numeral and the quiz title at the h3 step (`--rd-fs × 1.18`, Fraunces 600); prompts, options, answers and explanations at `--rd-fs` in Literata. In the interface: 15 px semibold for buttons and the verdict word, 13 px for hints, sub-lines and the option tags, the 11 px mono label for "QUIZ · 7 QUESTIONS" and "ANSWER". Four steps on a quiz at the default size (21, 18, 15, 13) plus the label.

**Spacing.** The reader's `--kb-space-*` scale times `--rd-k` inside the column (between items `lg`, prompt to options `md`, between options `sm`; `md` since critique pass 01, C10), fixed `kb-space-*` inside the interface rows.

**Colour roles.** No new colour. The interactive accent (`kb-accent`) for focus, hover and a selection not yet checked, exactly the reader's pressed look. Right and wrong take the system's **status roles**: `kb-status-active` / `-soft` / `-ink` for right, `kb-status-revoked` / `-soft` / `-ink` for wrong, in light, dark and the reader's sepia. Every right and wrong is also said in words and drawn with a shape.

**The one bold move: the grading margin.** Each question's number hangs in its own narrow column in Fraunces, like a workbook. When the question is graded the number is marked the way a teacher marks a page: circled for right, struck with a slash for wrong. Down a twenty-question quiz the margin is a record of where you are and how it went. Everything else in the block is quiet: hairlines between questions, the reader's own buttons, no boxes around the block.

**Review of the plan against the handoff and the bar.**
- *Reads like a default?* The first plan put a coloured verdict banner under each question and a score line ("4 of 7 right") in the block's head. Both are the default quiz look of every learning app, and the score is new scope (open question 7). Revised: the verdict is one word in the status ink beside the action, the head counts only answered questions, and the boldness moved to the margin marks, which come from print, where this reader takes its cues ("kindle like", "a well-set page first").
- *Options as cards?* Options are the one place boxes are used, because they are the targets. They take the signed Display panel's choice look (`.rd-opt`: a 1 px strong border, the accent ring when pressed), so a choice reads the same everywhere in the reader. The block itself has no box.
- *Things that move.* Every mark is a ring (`box-shadow`) or a tag set on the option's top border, so nothing resizes when a question grades; every button that swaps its label keeps its width; every status line holds all its sentences in one cell, the reader's own "it holds still" rule from the chapter end.
- *The bar.* The state bar is the reader's own, at the top of the scrolled page, so it scrolls away (rule 1).
- *Locked.* Sign in to save is mounted as signed with `what` = "quiz answers". No reader file's look changes; the two reader boards that carry the quiz (`Reader`, `Prose`) gain only pass-through props and the `quiz` branch (Departures).

## What was designed

One direction (the handoff's `new visual direction: no`): the signed reader, extended by one block.

**Pages (row 1)**
- **01 · Page — Quiz in a chapter (the flow)** (`Main`, PAGE, interactive). The signed reader carrying the quiz; it
  answers, grades, retries and saves for real, and an answer saved here comes back when the reader leaves the chapter
  (or its language) and returns. It opens on the chapter's quiz; the canvas-only foot strip under the page holds
  **Back to the state bar**, which scrolls the page back to the bar from any state in one press. Its state bar holds
  this job's presets on four pages:
  - chapter: Quiz · unanswered, Single · right / wrong, Multi · selecting / Check with nothing chosen / partly right /
    right, Recall · answer shown / got it / missed it, Cloze · typed / right / partly right, Second attempt, Answer not
    saved, On return · saved answers, 한국어 · saved English answers, 한국어 · cloze with a Korean answer, Signed out ·
    unanswered / answered with Sign in to save / after Not now, One question · untitled, 20 questions · 7 answered;
  - loose document: Quiz in a document, Signed out · Sign in to save;
  - the stand-ins: Book page, Library, Sign in (from the quiz), Legacy chapter (from a quiz link), External link (from
    a quiz).
  The bar also carries `· theme:` (Light, Dark, Sepia, System) and `· text size:` (1, 3, 5).
- **02 · Page — The quiz at 390, 820 and 1440** (`Widths`, interactive). One state drawn at the three reference sizes;
  a click in any frame moves all three. Its bar holds sixteen of 01's presets plus the theme and text-size rows; its
  foot strip holds **Back to the three state bars** and a link to 01.
- **03 · Page — Chapter screen alone (opened at the quiz)** (`Reader`), the signed chapter screen, now able to render
  a `quiz` fence; drawn alone it opens scrolled to the chapter's first quiz.
- **04 · Page — Stand-in for another job's screen** (`Elsewhere`), the signed stand-ins.

**Components (row 2)**, each mounting the real block (`Quiz`) once per state, with the clicks that lead to it:
- **05 · Quiz block:** a loose document's quiz in light, dark and sepia; untitled with one question, titled with
  seven; 390 at sizes 1 and 5 (sepia), and the Korean variant (dark, `keep-all`); signed out with Sign in to save, in a
  document and in a chapter (dark).
- **06 · Choice question:** unanswered, right, wrong; selecting, empty Check, partly right, right; two options and six
  (dark, sepia); a long option with inline code at sizes 1, 3 and 5; a link in the prompt.
- **07 · Recall question:** hidden, shown, got it, missed it; a long answer with inline code at 390 (size 1, size 5
  sepia, dark, Korean).
- **08 · Cloze question:** empty, typed, right (case, spaces, an alternative), partly right, empty Check; five blanks at
  390 (size 3, size 5 sepia, size 1 dark graded); the Korean variant typed in decomposed Hangul, right, partly right.
- **09 · Saved answers, retry and the signed-out reader:** on return made on this version, on v1 unchanged, on v1
  changed (starts fresh); in Korean from an English answer, a cloze answered in English (starts fresh), recall and cloze
  saved; Saving…, Saved for review, after Try again, a second attempt, Not saved, and after Not saved a retry that
  saves (it is the first, "Saved for review"); signed out with Sign in to save, after Not now, recall signed out
  (dark).

**Mounted parts (row 3)**, the component gaps drawn as markup: **10 · Quiz block**, **11 · Choice question**,
**12 · Recall question**, **13 · Cloze question**.

**Copied signed parts (row 4)**, **14–26**, so the chapter renders (list below).

**Directions:** none (the operator asked for none).

## Data

- **Real (the maintainer guide's own quizzes, public, read with `git show origin/main:docs/knowledge/…`):**
  - chapter 2, "Knowledge System Internals: The Content Plane, the Write Path, and the Contracts": questions 1
    (`read-column`), 2 (`publish-in-lock`), 3 (`rel-path`) and 5 (`dormant`), with their options, answers and
    explanations;
  - chapter 1, "Knowledge: What It Is and How It Is Used": question 1 (`explain-new-project`, the `/knowledge:explain`
    question the handoff names), as the one-question untitled quiz.
- **Written for the canvas, on the guide's subjects:** `two-planes` (multi-answer, two right options), `projection`
  (recall, inline code), `write-path` (cloze, four blanks, `{{write lock|WRITE_LOCK}}` and `{{PostgreSQL|Postgres}}`),
  the fifth option of `rel-path` on v2 (so a changed item can be shown), and the Korean v1 translation ("배운 것
  확인하기", the same item and option ids; the cloze accepts 쓰기 잠금 or WRITE_LOCK).
- **Invented:** Tidewater's "Twenty questions on the model" (an invented book: two options and six, multi-answer,
  recall, a five-blank cloze, a link to NOAA as an external link, a link to a legacy chapter); the loose document
  "Compound interest, worked by hand" in an invented `money-notes` project ("Try it": a cloze, a recall whose
  explanation links a missing document, two options, a multi-answer).
- **Saved attempts:** an invented reader, "Ari Han", with no email. Attempts follow the S2 payload (`response`,
  `correct`, `attempt`, `version`, `answered_at`): on the internals chapter, `read-column` wrong on v1 (9 Aug 2026) then
  right on v2 (12 Oct 2026), `publish-in-lock` and `rel-path` on v1, `projection` missed and `write-path` three of four
  blanks right on v2; on Tidewater, seven attempts on 14 Oct 2026. The canvas's clock is fixed at 20 Oct 2026.
- **Placeholders:** none. No glide-ilab or base material, nothing of arb_upbit_1, no secret, key, email or personal
  data.

## Files copied from the signed reader

From `jobs/01-reader/rounds/02-revise/canvas/project/`:
- **Byte-identical:** `reader.css`, `assets/logo.svg`, `ReaderTop`, `ReaderBottom`, `ChapterHead`, `ChapterEnd`,
  `ChapterList`, `SignInToSave`, `ReaderState`, `DisplayPanel`, `VersionList`, `Callout`, `CodeBlock`, `ProseTable`
  (`.dc.html`).
- **Copied and extended (canvas machinery, as the handoff allows):** `reader.js` (the YAML subset and the `quiz` fence,
  `RD.quiz`: grading, an item's states, the block's view model, saved answers and drift; the quiz data, appended to the
  signed chapters' sources), `flow.js` (the quiz's state in the scene, its presets, the quiz action, the 650 ms
  simulated save; changing language or version clears the live quiz state; sign-in returns to the item).
- **Copied and extended (departure 1):** `Reader.dc.html`, `Prose.dc.html`, `Elsewhere.dc.html`, `Main.dc.html`,
  `Widths.dc.html`.
- **Not copied:** the signed Components boards, Foundations and their states; the reader's own states stay on the
  signed canvas.

## The seams with the wave

- **`03-diagrams` (the tones):** the quiz takes the system's **status roles** (`kb-status-active` for right,
  `kb-status-revoked` for wrong, with their `-soft` and `-ink`), never the diagram tones. If the tones land on other
  values, the quiz keeps the status roles; if they land on the same, nothing conflicts.
- **`05-annotations` (Sign in to save and the controls):** Sign in to save is mounted unchanged with `what` = "quiz
  answers"; the shared pattern stays §12's. No bookmark, highlight or note control is drawn on the block; a prompt is
  ordinary reading text, so the annotations job can highlight in it.
- **Not read:** the sibling jobs' live canvases (`02-figures`, `03-diagrams`, `05-annotations`) are unsigned drafts
  written at the same time, so this round never opened them, though the handoff allows it. Consistency across the wave
  is the critic's look.

## Departures from the handoff

1. **Five signed boards carry this job's wiring.** `Reader`, `Prose` and `Elsewhere` gain pass-through props (`quiz`,
   `qview`, `onQuiz`, `onSignIn`), `Prose` gains the `quiz` branch (it mounts `Quiz`), and all three link `quiz.css`;
   `Reader` and `Elsewhere` also accept a second extras row in the bar. `Main` and `Widths` take this job's presets,
   titles and links. Since critique pass 01: `Reader` drawn alone (no flow, no bar) opens at the chapter's first quiz
   (`aloneJump`, C07), and `Main` and `Widths` carry a canvas-only **Back to the state bar** control in their foot strip
   (C05; `Widths` gains a foot strip for it). The handoff allows extending `reader.js` and `flow.js`; these board edits
   go past that. No signed element's look or behaviour changes in the flow.
2. **The state bar holds only the quiz's presets.** The reader's own presets (resume, the sheets, versions, the chapter
   end, loading, …) are left out of 01 and 02; they stay on the signed canvas. The bar gains a `· text size:` row (1,
   3, 5) beside the signed `· theme:` row, because the handoff asks for sizes 1, 3 and 5.
3. **01 opens on the quiz, not the chapter's top.** The bar is the first row of the scrolled page (bar rule 1), so on
   opening it is above the view, about 10,000 px up the real chapter at 1440. Since critique pass 01 the canvas-only
   foot strip under the page (always in the frame, never over the page) holds **Back to the state bar**: one press
   from any state scrolls the page back to the bar and focuses the page's pressed preset, so the next preset is one
   press away, not a long scroll. Opening at the chapter's top instead would show the bar first and the chapter's
   title, not the quiz (C05, left to the operator).
4. **Two states the handoff does not list:** "Saving…" while an attempt is sent and "Not saved · check your
   connection" when it fails, because every graded attempt is now sent (S3).
5. **No iPad landscape (1024 × 768) frame.** The block has no breakpoint of its own and the column is 36rem above
   40rem, so nothing changes at 1024; the handoff asks for it only where the layout changes.
6. **03 and 04 keep the signed boards' flags:** fixed 1440 × 900 frames, not interactive PAGEs, as signed. The
   interactive chapter is 01 and 02.
7. **The preview's `layout-shift` lines on 01 and 02** (critique pass 01's last render: 15 on 01, 15 on 02, every one
   `header.rd-top`) come from bar rule 1, exactly as the signed round's departure 31. The bar is the first row of the
   scrolled page, so the header sits under it (y 117 on 01) whenever the page is at its top (after **Back to the state
   bar**, or opening another chapter from Previous, Next or Contents) and near the frame's top (y 3) once a preset
   scrolls to the quiz. 01 shows them now because its foot-strip control lets the click pass reach the presets. No quiz
   control resizes, and since C04 nothing in the block moves when an item grades.
8. **The option border is the signed `.rd-opt` look**, `kb-border-strong` at 1.58:1 (light), under 3:1. Each option
   is also identified by its key ring (`kb-secondary`, 7.48:1) and its text, so the target is never told by the border
   alone. Left as signed; logged as a gap.

## Open questions, for the operator

1. **"your answer, v3" (Q1).** Drawn: "v3" is the **chapter version** the answer was made on. On return the sub-line
   reads "Your answer from 12 Oct 2026"; when the version differs, ", on v1" is added; when the item's shape changed
   since (options, answer or blank count), the item starts fresh with "You answered a different version of this
   question (v1, 9 Aug 2026), so it starts fresh here." The attempt number never shows.
2. **A partly right answer (Q2).** Drawn: each chosen option and each blank shows its own right or wrong (the tags, the
   struck blank, the accepted answers per wrong blank); the verdict stays one word, "Incorrect", with "· partly right"
   (multi) or "· 2 of 4 blanks right" (cloze). `correct` stays false.
3. **Answers across languages (Q3).** Drawn: a choice or recall answer made in English shows in the Korean variant,
   with ", in English v2"; a cloze answered in another language starts fresh with a note, because typed answers are in
   their language.
4. **Retry and the first attempt (Q4).** Drawn: **Try again** clears the item, and focus goes to its first control.
   The block says which attempt counts only when it matters: the first attempt's line reads "Saved for review", any
   later one "Saved · review keeps your first answer". A failed send is not an attempt (it never reached the server),
   so the next one that saves is the first. Saying the rule at Try again instead is the critic's C14, yours to call.
5. **A review cue (Q5).** Drawn: none beyond the save line. No link to review; an entry point is new scope.
6. **Sign in to save's place (Q6).** Drawn: once per view, under the first item a signed-out reader grades, after the
   answer and never before; **Not now** closes it for the rest of the view.
7. **A tally (Q7).** Drawn: "4 of 7 answered" in the head, shown once something is answered (its line is always
   reserved, so the head never grows), never a score. A score is new scope.
8. **The grading margin (the bold move).** The number is circled when right and struck with a slash when wrong, the
   way a teacher marks a page in Korea. In some Western classrooms a circle marks a mistake and a tick marks a right
   answer. The words beside the action always say which, so the marks are for the eye; keep them, or swap the slash and
   circle for something else? (The critic's C11 asks whether the red tint on a wrong row should go too, leaving the
   strike and the words.)
9. **Where 01 opens (critique C05).** Drawn: 01 opens on the quiz, with the bar about 10,000 px above in the real
   chapter, and the foot strip's **Back to the state bar** is one press back to it. The other choices:
   - open at the chapter's top: the bar is seen first, but the quiz is the same distance away;
   - open on the loose document, a shorter page: less page between the bar and the quiz, but 01 then leads with the
     less common case.
10. **The critic's other taste notes.** C12: the explanation opens inline and pushes later questions down (about
    260 px); a drawer would hold the page still but lose the printed-workbook continuity. C13: a cloze line is about
    55 px against prose's 30, the cost of the 44 px blank. Both are drawn as they are.

## Component and token gaps

- **No quiz component** in the system or the product: `Quiz`, `QuizChoice`, `QuizRecall` and `QuizCloze` are drawn as
  markup (boards 10–13), styled in `quiz.css`.
- **No choice control** (radio or checkbox) style: the options reuse the signed Display panel's `.rd-opt` box and add
  a key mark (a circle for one answer, a square for several).
- **No text input for reading:** the cloze blank is new (an underlined field in the reading face, 44 px tall, at least
  16 px).
- **No Hangul face in the system cache:** the canvas loads Noto Serif KR from Google Fonts CSS, as the reader does.
- **The option border's contrast** (departure 8, critique C09): `kb-border-strong` on `kb-surface` is 1.58:1 in light,
  1.56:1 in dark and 1.64:1 in sepia, under the 3:1 for a UI part's border. Left as signed; for the operator and the
  system: a stronger border token for options, or a hover and selected ring that meets 3:1.
- **No new token.** Two local properties, `--qz-nfs` and `--qz-hang`, are computed from the reader's `--rd-fs`.

## Measured contrast (WCAG ratio, computed from the token values; soft fills composited on `kb-surface`)

| What | Light | Dark | Sepia | Needs |
|---|---|---|---|---|
| Right: "Correct", "Got it", the right tags, the circled numeral, a right blank (`status-active-ink` on `surface`) | 8.70 | 9.51 | 8.90 | 4.5 |
| Wrong: "Incorrect…", "Missed it", the wrong tag, the slashed numeral, a struck blank (`status-revoked-ink` on `surface`) | 7.07 | 7.42 | 7.15 | 4.5 |
| Hints, sub-lines, the label, the count, an unmarked numeral, the accepted list (`secondary` on `surface`) | 7.48 | 7.32 | 6.87 | 4.5 |
| Option text on a right chosen option (`ink` on `status-active-soft`) | 13.30 | 9.18 | 9.86 | 4.5 |
| Option text on a wrong chosen option (`ink` on `status-revoked-soft`) | 12.56 | 9.86 | 10.04 | 4.5 |
| Option text on a selected option before Check (`ink` on `accent-soft`) | 12.75 | 8.79 | 9.42 | 4.5 |
| The letter on a filled right key (`--rd-on-accent` on `status-active`) | 5.76 | 8.32 | 7.00 | 4.5 |
| The letter on a filled wrong key (`--rd-on-accent` on `status-revoked`) | 5.17 | 6.84 | 6.13 | 4.5 |
| The letter on a filled selected key (`--rd-on-accent` on `accent`) | 5.76 | 8.32 | 7.00 | 4.5 |
| The card's label and explanation (`secondary` on `surface-sunken`) | 6.23 | 6.78 | 5.96 | 4.5 |
| The card's answer, a drift note (`ink` on `surface-sunken`) | 13.18 | 11.94 | 10.24 | 4.5 |
| UI: the ring round a right numeral, a right option's ring, a right blank's underline (`status-active`) | 5.97 | 7.31 | 6.23 | 3 |
| UI: the slash, a wrong option's ring, a wrong blank's underline (`status-revoked`) | 5.36 | 6.00 | 5.46 | 3 |
| UI: a blank's underline, the key ring (`secondary`) | 7.48 | 7.32 | 6.87 | 3 |
| UI: the focus ring, a hovered or focused blank (`accent`) | 5.97 | 7.31 | 6.23 | 3 |
| UI: the option border (`border-strong`, signed `.rd-opt`; departure 8) | 1.58 | 1.56 | 1.64 | 3 |

The browser's own contrast check measured every visible text run on every rendered board and state: no `contrast`
issue.

## States reached only by interaction

- **Hover:** an option's border turns `kb-accent`; a blank's underline turns `kb-accent`. Graded options and blanks no
  longer change on hover.
- **Focus and keyboard:** the system's focus ring on options, blanks, the card and buttons; Enter or Space chooses or
  toggles an option; Enter in a blank is Check; focus moves to the first control after Try again, to the answer card
  after Show answer, to Try again after a self-grade, and to the item's main button after Not now.
- **Typing** in a blank (any text; the canvas compares on Check).
- **"Saving…"** shows for 650 ms after a signed-in grade (held still in board 09's first cell).
- **An answer coming back:** answer on 01, then Next and Previous (or 한국어 and back): the item shows that answer,
  graded, with "Your answer from 20 Oct 2026" (", in English v2" in Korean).
- **Back to the state bar** (01's foot strip; 02's "Back to the three state bars"): from any state, the page scrolls
  back to its bar.
- **Following a link inside an option** goes to the link and never chooses the option.
- **Sign in to save → Sign in → back:** the stand-in returns to the same chapter at the item that asked.
- **What assistive technology hears** (the polite live region per item) is in `build-prompt.md`.

## Render log

The round's budget is two render passes; this round made four `design-preview` runs, two of them small, listed here
as made.

- **Pass 1** (`--board`, the four parts and the five Components boards). Seen and fixed: `check=clipped` on the
  visually hidden question line (an `overflow: hidden` sr-only box) → `clip-path: inset(50%)`; `check=dead-link` on the
  standalone boards (`#the-two-planes`, `#the-publish-worker` point at chapter headings not on the board) → links
  inside a block drawn alone point at `#top`, as the reader's own Components boards do; `check=frame-clip` on several
  boards → frames raised.
- **Pass 2** (`--board`, the same boards). No contrast, target, name, clipped or dead-link issue; three frame clips
  left (05, 09, 10) → frames raised. Read ChoiceStates: tags on the borders, filled keys, the circle and the slash, the
  foot holding still; dark and sepia; sizes 1, 3 and 5 wrap at 390.
- **Pass 3** (`--click`, all 26 boards): 27 PNGs, 48 states, 0 unmounted, 0 script errors, 15 issues, every one
  `check=layout-shift` on 02 (departure 7). 01 reached one state: it opens on the quiz with the bar scrolled away
  (departure 3), so the click pass found the presets outside the frame; 02 reached all sixteen of its presets and hit
  the 48-state cap. Every 01-only state is drawn on the Components boards, which this pass rendered. Read every frame
  PNG and 02's preset states. Seen and fixed: in the Korean cloze a particle (에) started a line after its blank →
  whatever touches a blank's end now rides in its no-wrap group (`reader.js`, `QuizCloze`); the Components boards and
  parts had empty bands below their content → each frame set to its measured content height.
- **Pass 4** (`--board`, the five boards the cloze fix touches: 05, 08, 09, 10, 13; 4 s): 0 issues; particles and
  punctuation stay with their blanks. The frames were then shortened to the measured content (from the PNGs), which
  cannot clip; not re-rendered after that.
- **Left open (first draft):** the 15 `layout-shift` lines (departure 7); the option border's contrast (departure 8).
- `design-check 04-quiz`: OK, 26 boards.

### Critique pass 01 (two render passes, plus one scripted probe)

- **Probe** (a scratch script that drives the preview engine's own server and headless Chrome, with a throwaway
  profile, at 1440 × 900; 2794 × 1400 for 02). It checked each fix on the live boards. **C01:** answer A on question 1
  reads "Incorrect · Saved for review"; after Next then Previous it reads "Incorrect · Your answer from 20 Oct 2026";
  in 한국어 it reads "…, in English v2", and the same again back in English. **C02:** "Answer not saved", then
  Try again, then B, reads "Correct · Saved for review". **C04:** the head is 28.98 px tall before and after the first
  answer, and the items' top holds still. **C05:** the foot-strip control sets the scroll to 0, puts the bar's top at
  0 and focuses "Quiz · unanswered". **C06:** the three presets each read pressed on landing and stay pressed after a
  600 px scroll; all 30 presets match themselves. **C08:** graded blanks compute `text-overflow: ellipsis`, and "You
  wrote" keeps the double space. **C03:** the new hint shows. **C07:** board 03's quiz top is at 75 px. **02:** the
  control scrolls all three frames to 0. Script errors: none; missing files: none.
- **Pass 1** (`--click`, all 26 boards, 256 s): 27 PNGs, 94 states, 0 unmounted, 0 script errors, 64 issues:
  - 1 `page-clip` on 01 (935 > 929), and 7 `frame-clip` (02, 05, 06, 08, 09, 10, 11): every frame set to its measured
    content height, with the rows re-laid at 120 px apart;
  - 56 `layout-shift` (41 on 01, 15 on 02). One was not the bar: pressing "Back to the state bar" with the Display
    panel open resized "Close panel" (1440 × 900 → 1440 × 786). The control now closes an open panel first. The rest
    are `header.rd-top`, from bar rule 1 (departure 7).
  01's click pass now reaches its presets through the foot-strip control (the first draft reached one state).
- **Pass 2** (`--click`, all 26 boards, 257 s): 27 PNGs, 94 states, 0 unmounted, 0 script errors, 30 issues. Every
  one is `check=layout-shift` on `header.rd-top` (15 on 01, 15 on 02; departure 7). There are no clip, contrast, target,
  name, dead-link or hover issues, and every frame's `content=` equals its `w × h`. PNGs read:
  - Main: the quiz, with "Back to the state bar" in the foot strip;
  - Reader: opens at the quiz;
  - Widths: the three frames, with the new foot strip;
  - ReturnStates: the new "After Not saved, Try again" cell reads "Saved for review";
  - ChoiceStates: the wider gap, with the tags clear of the option above.
  01 and 02 both hit the engine's 48-state cap, so the presets past it were driven by the probe.
- **Left open:** the 30 `layout-shift` lines (departure 7); the option border's contrast (departure 8, C09).
- `design-check 04-quiz`: OK, 26 boards.

## Critique pass 01

Mode `critic`, nothing held. Must-fix C01–C08, gap C09, advisory C10–C14.

- **C01** (a saved answer never comes back): fixed. `savedState` now reads every attempt in the history, this visit's
  included, and a failed send leaves the history when it settles (`RD.quiz.settleHist`, applied by `RD.quiz.land`). So
  what comes back on return is exactly what the server holds. Driven on 01: the answer comes back after Next and
  Previous, in 한국어 (", in English v2") and back in English. 02 runs the same `flow.js` and `reader.js`.
- **C02** (a failed first attempt still counted as the first): fixed. When a send settles as failed, its attempt is
  dropped from the history. When one saves, "review keeps your first answer" is worked out from the saved attempts
  before it (`earlier`), not from every attempt pushed. "Not saved", then Try again and an answer, reads "Saved for
  review". Board 09 gains the cell "After Not saved, Try again · the next saved answer is the first". The save timer
  also drops a result whose page load is no longer current, so a preset pressed mid-send never receives it.
- **C03** (the hint promises inner spaces don't count): fixed. The copy moves and the grading stays (handoff: trim the
  ends). The hint is now "Fill in the blanks. Capitals and spaces around each answer don't count." ("…around the
  answer…" for one blank). "You wrote" keeps the typed spaces (`white-space: pre-wrap`), so "write  lock" no longer
  looks identical to "Accepted: write lock". `build-prompt.md` has the new strings.
- **C04** (the head grows 3 px on the first answer): fixed. The "N of 7 answered" line is always rendered when the quiz
  has more than one question, held invisible (`visibility: hidden`, `aria-hidden`) until something is answered.
  Measured: the head is 28.98 px tall before and after, and nothing below it moves.
- **C05** (the bar is about 10,000 px above the view): fixed in part, and the rest rebutted, for the operator. Fixed:
  01's foot strip, always in the frame and never over the page, holds **Back to the state bar** (02's: "Back to the
  three state bars"). One press from any state closes an open panel, scrolls the page to its bar and focuses the
  pressed preset, so the next preset is one press away instead of a 14,600 px scroll. Rebutted, opening at the top:
  - 01's intent is that the first thing the reader sees is the question, and the canvas thumbnail shows the quiz;
  - rule 1 (the operator, 2026-10-19: "prototype state too big. which is fine. but just make it doesn't follow
    scroll.") accepts a bar that scrolls away;
  - opening at the top would leave the same distance to the quiz, as the critic's own "unsure" note says.
  The loose document as the default view was not taken: 01 is the quiz in a chapter, the handoff's main case, and the
  loose document is its own page in 01 ("Quiz in a document"). Where 01 opens is open question 9.
- **C06** (three presets land with none pressed): fixed. The key the bar compares (`sig()` in `flow.js`) leaves out
  what moves as soon as the reader reads on: the scroll position, whether the chrome has hidden on scroll, and the
  chapter's reading state. All three presets read pressed on landing and stay pressed after scrolling; all 30 presets
  match themselves.
- **C07** (board 03 shows no quiz): fixed. Board 03, drawn alone (no flow, no bar, no jump), opens at the chapter's
  first quiz (`aloneJump`; quiz top at 75 px in the 1440 × 900 frame). The signed flags stay. The title is now "03 ·
  Page — Chapter screen alone (the signed reader, opened at the quiz)". Logged in departure 1.
- **C08** (a graded blank clips a long answer mid-glyph): fixed. A graded (read-only) blank ends a long answer with an
  ellipsis (`text-overflow: ellipsis`), and the full answer stays in "You wrote". The blank's width is unchanged, so
  its length still gives nothing away.
- **C09** (the `.rd-opt` border at 1.58:1 / 1.56:1): gap logged. The table now also gives sepia (1.64:1). Left as
  signed, for the operator and the system: a stronger border token for options, or a hover and selected ring.
- **C10** (tags clear the option above by about 3 px): taken. The block's spacing is this job's own `quiz.css`, not a
  signed element. The gap between options went from `kb-space-sm` to `kb-space-md`, a token step, so a tag now clears
  the option above by about 8.5 px at every text size.
- **C11** (a wrong choice speaks four ways): left for the operator. It is taste on the round's one bold move, which
  open question 8 already asks about. Nothing changed.
- **C12** (the inline explanation pushes later questions down): left for the operator. It trades printed-workbook
  continuity for a still page. The answered question's own rows hold still, as the handoff asks.
- **C13** (cloze lines are airy): left for the operator. It is the cost of the 44 px blank the handoff asks for; a
  denser paragraph would need a smaller target.
- **C14** (the first-answer rule is told only after a second save): left for the operator, as open question 4.
