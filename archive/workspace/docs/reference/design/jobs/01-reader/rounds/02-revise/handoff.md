# Handoff — job `01-reader`, round `02-revise` (slice P29.S4)

new visual direction: no

critique: critic+judge

This round **supersedes `01-reader/01-reader`**, which closed on 2026-10-19 on the operator's feedback.
It is the drafter's brief and the critic's yardstick for round 02. The orchestrator wrote it on
2026-10-19.

## Read first

1. **`rounds/01-reader/feedback.md`**: the operator's words, verbatim, with the reading the orchestrator
   put back to them and their "ok". Read it yourself: this handoff restates it, but their words decide.
2. **`rounds/01-reader/handoff.md`**: round 01's brief. **It stands in full, as amended here.** Where
   the two differ, this handoff wins:
   - its *Open questions, posed back* are settled (*Settled by the operator*, below);
   - its *The operator's bar* is replaced by this handoff's.
3. **Round 01's record:** `result.md`, `build-prompt.md` and `critique-01.md` in `rounds/01-reader/`.
   The snapshot taken at close, `rounds/01-reader/canvas/project/`, is immutable; never edit it.

**The canvas.** This round edits the job's canvas **in place**, in `jobs/01-reader/canvas/project/`,
which holds round 01's tree as published (`1792340688-1a72`). The operator made no in-app edits and left
no comments (`feedback.md`), so no board is locked as edited.

**Change only what this handoff asks.** This is the type's craft rule: targeted changes stay targeted.
- Every board, state, value and string not named below stays exactly as round 01 drew it, including
  the answer pass's fixes C01–C05.
- A change asked here may force another, such as a restructured scroller or a re-tuned offset. That
  forced change is in scope; log it.
- Round 01's checks still hold for everything unchanged.

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

## What the feedback asks for

Six changes, each with the check the critic holds it to.
- **Where to check:** phone (390×844), iPad (820×1180, and 1024×768 where the layout changes) and
  desktop (1440×900), in light, dark and sepia.
- **Where to update:** the Pages, the Widths scenes and the component and mounted-part boards,
  wherever a change shows.

### 1. The state bar scrolls away (bar rule 1)

- **Where:** on every interactive Page, `01 · Page — Reader (the flow)` and `03 · Page — The reader at
  390, 820 and 1440`.
- **What:** the state bar is part of the scrolled page. Scrolling the reading content carries it up and
  out of view, and back at the top it shows again.
- **What stays:**
  - its size and its presets;
  - C01's reservation, so pressing a preset never moves anything;
  - the reader's chrome, with round 01's behaviour.
- **Why it is pinned today:** the chapter scrolls inside a frame beneath it (round 01's departure 4).
  How the canvas scrolls is the drafter's call, and revising departure 4 is in play.
- **Check:**
  - with the chapter scrolled down, the state bar is out of view at every width, on both Pages;
  - back at the top it is whole and works;
  - the reader's chrome still hides on scrolling down and returns on scrolling up;
  - the progress line stays, and nothing overlaps the text;
  - the long table's sticky header (C02) sits flush under the top bar while the bar shows, and at the
    reading area's top while it hides.

### 2. Tables and code blocks take the text column's width

The operator: "make the tables, and text bodies got same width. wide table scroll on mobile is fine."
Their confirmed reading covers tables and code blocks both, so every block lines up on one edge.

- **The text column's width** stays as drawn (`--rd-measure`, 36rem) at every text size.
- **Tables** (wide, long and numeric) **and code blocks** (titled, untitled, a long line, the ASCII
  `text` block) sit exactly on the text column. This removes:
  - the wider lane (today `--rd-wide` 48rem, `.rd-w`);
  - the phone's edge-to-edge bleed for code (today `.rd-bleed`).
- **Wider content** scrolls sideways **inside its own box at every width**, with round 01's fade and
  hint. On a phone it stays as drawn. The page never scrolls sideways.
- **Long code lines** wrap within the narrower block, with the hanging indent, as before.
- **Check:**
  - at 820 and 1440, the left and right edges of every table and code block equal the paragraphs'
    edges, at text sizes 1, 3 and 5;
  - the 8-column table at 1440 scrolls inside its box, with the fade and its hint;
  - every column stays reachable, by scrolling and by keyboard;
  - in row 30 of the long table the reader can still tell which column a value belongs to (round 01's
    check), at every width;
  - nothing scrolls the page sideways at any width or size.

### 3. The native chapter's ASCII drawing becomes a diagram placeholder

The operator: "ASCII art you mean the "one FastAPI process, one uvicorn worker" this trash already in
pc". Their confirmed reading:
- in a native chapter, a drawing like this is a `diagram` block;
- plain ASCII art stays only for old Markdown documents.

What to draw:
- **In the native sample chapter** (`maintainer-guide/internals`, in EN v2, EN v1 and KO v1), replace
  the ASCII `text` block with a **placeholder for a `diagram` block**. The placeholder:
  - is a canvas-only stand-in, like the other "another job" stand-ins;
  - names the `diagrams` job (P29.S5);
  - carries the diagram's title and caption, which S2 makes a diagram's text alternative;
  - never pretends to be the diagram's design;
  - takes its size and look from the drafter.
- **Plain ASCII art moves to an old Markdown (`md`) document.** Show the `text` block in an `md`
  sample: the loose document may become one, or add an invented one, and say which. Its drawing must be
  **well-formed**, with every line the same width and every corner meeting. Today's top border is 73
  characters against 74 for every other line, which is why its corner breaks.
- **The ASCII block holds together:**
  - its vertical strokes join from line to line, with no gaps (today's `line-height` of 1.35 leaves
    them);
  - it keeps its alignment;
  - wider than the column, it scrolls inside its own box, with its hint, at every width (change 2).
- **The code block board** keeps an ASCII state, now taken from the `md` sample. Correct any caption the
  width change makes untrue, such as today's "fits at 820".
- **Check:**
  - no ASCII drawing appears in a native chapter;
  - the placeholder reads as a stand-in for another job, never as a finished diagram, in all three
    themes;
  - in the ASCII block, every line is the same width, the corners meet and the vertical strokes join, at
    text sizes 1, 3 and 5;
  - the page never scrolls sideways.

### 4. A Korean serif for chapter text

The operator: "fine" (Q5). That confirmed "a Korean serif such as Noto Serif KR for chapter text, and
Pretendard for buttons and menus".

- **Hangul in the reading face uses a Korean serif.** That covers everywhere round 01 sets
  `--font-reading`: body, headings, the title and lede, callouts, the chapter list's titles and the next
  chapter's title.
- **Choosing the serif:**
  - Noto Serif KR is the example the operator accepted.
  - The system's `--font-display` already names Nanum Myeongjo for Hangul display type, so pick with
    that in mind.
  - Keep Hangul headings and body coherent, and log the choice.
  - It must be free to ship (OFL) and self-hostable. On the canvas it loads from Google Fonts, like
    Literata.
- **The interface** (bars, sheets, buttons, menus, labels) keeps Pretendard for Hangul, as the product
  ships it. The canvas falls back to the system Hangul fonts, as in round 01.
- **Check:**
  - in the KO v1 chapter, the body, headings and title render Hangul in the Korean serif. Confirm the
    face that actually renders, not just the stack;
  - a Hangul run inside English renders in the same serif;
  - where Latin sits beside Hangul in one line (Literata beside the Korean serif), they share a
    baseline, with no jump in line height;
  - the `:lang(ko)` rules hold: keep-all, no mid-word break, no overflow at 390.

### 5. Hangul runs inside English stay whole

The operator: "yes" (Q6).

- **At render time**, each Hangul run inside English text is wrapped in `<span lang="ko">`, so the
  `:lang(ko)` rule keeps it whole. A run includes the spaces between its Hangul words: "지식 시스템의" is
  one run.
- **The canvas's parser does the same**, so the canvas shows the result.
- **`build-prompt.md` names the rule exactly:**
  - what counts as a run;
  - where it applies: prose, headings, callouts, table cells and titles;
  - where it does not: code.
- **Check:** in the English chapter, the Korean term never breaks between its syllables, at 390, 820 or
  1440 and at text sizes 1, 3 and 5. The English around it wraps normally.

### 6. A re-read finishes a chapter again

The operator: "yes" (Q10). That confirmed "reading to the end again finishes the chapter again. In P30,
Mark as unread resets that chapter's progress."

- **Mark as unread resets that chapter's furthest-read mark** (`max_fraction`). This is an exception to
  S3's "only grows", which P30 builds.
- **A fresh read to the end** then marks the chapter finished again, with no press, by round 01's
  finished rule.
- **Pressing Mark as unread at the end never re-finishes it on the spot.** The reader is at the end when
  they press it, and the next position write must not undo the press. `build-prompt.md` defines exactly
  what must happen after the press before reaching the end finishes the chapter again.
- **The unread sentence at the end** is rewritten to say what now happens; the new copy is the
  drafter's. Today it reads "Marked as unread. It stays that way until you mark it finished." Round 01's
  single-grid-cell fix (C03) stays, so changing the sentence moves nothing.
- **The chapter list's word** for a chapter marked unread follows from the reset. Say which word it is,
  and why, in `build-prompt.md`.
- **Check:**
  - pressing Mark as unread at the end leaves the chapter not finished, with the new sentence;
  - nothing on the page moves when it is pressed;
  - the end state, the chapter list and the contents sheet agree on the chapter's state;
  - Mark as finished still works as drawn.

## Settled by the operator

These replace round 01's *Open questions, posed back* and the round's ten open questions. They are
**locked** this round.

| Item | Settled |
|---|---|
| Q1, ASCII art | Change 3. |
| Q2, tables | Change 2. Wide tables keep round 06's scroll box, with the fade and the hint, never cards. |
| Q3, Copy link and Print | Neither appears in the reader's chrome, as drawn. |
| Q4, where a member reads | The reader's own chrome, with no app shell, as drawn. |
| Q5, the Hangul face | Change 4. |
| Q6, Hangul inside English | Change 5. |
| Q7, "Sign in to save" | "Sign in" stays a secondary button, as drawn. |
| Q8, the reader's tokens | They stay reader-scoped on the canvas (`reader.css`). `build-prompt.md` lists them as values P30 adds to the code, and they reach the `kb` system at its next sync from code. Add the Korean serif to the list. |
| Q9, interface type | The reader keeps its own 13 and 15 px steps, as drawn. |
| Q10, Mark as unread | Change 6. |
| The critic's taste notes | Not taken up. Literata, the edge-to-edge bars at 1440 and the callout grounds stay as drawn. |

## Known from round 01, not raised by the operator

The answer pass left these open (`rounds/01-reader/result.md` → *Critique pass 01*):
- at text sizes 1 and 2, the column's small step (12.5 and 13.75 px) sits close to the 13 px interface
  step;
- the "→" glyph sits high in Source Sans 3;
- the resume pill briefly covers one line;
- on a phone, the long table's box shows only a sliver of its second column.

Leave them unless a change here touches them; change 2 touches the long table. Report each one's status
in `result.md`.

## Data

Round 01's *Data* stands, including the canvas content rule: this repo is public, and nothing private
goes on the canvas. Two changes:

- **The `diagram` placeholder's title and caption** are written for the canvas, on the drawing's subject:
  one FastAPI process holding two planes. They make no claim about the diagram's look.
- **The `md` sample's ASCII drawing** is written for the canvas, well-formed, on that document's subject.

## The system inventory

Unchanged from round 01: `knowledge`, namespace `kb`, version `1792321604-e214`, cached at
`jobs/01-reader/canvas/project/ds/kb/`.
- On 2026-10-19 the system's files were read back, and they are byte-identical to the cache.
- The newer version id the system shows (`1792395750-ac17`) is the app saving on open.
- There are still no components.

## Required output

- **The canvas tree**, edited in place under `jobs/01-reader/canvas/project/`, passing
  `design-check 01-reader`.
- **`rounds/02-revise/result.md`**, holding:
  - *What changed from round 01*: each of the six changes and what it touched;
  - the **complete departure list** as it stands after this round: round 01's departures that still
    hold, the ones this round retires (say which), and new ones;
  - the data used;
  - the component and token gaps, updated with the Korean serif;
  - the measured contrast of every colour this round adds or changes, in light, dark and sepia (round
    01's table stands for the rest);
  - the status of each item under *Known from round 01*;
  - any new open question;
  - the render log.
- **`rounds/02-revise/build-prompt.md`**, **complete on its own.** The build reads only the signed
  round's prompt, so this one carries everything from round 01's `build-prompt.md` that still holds,
  plus this round's changes, with nothing left by reference to round 01. It names exactly:
  - the shared block width and the in-box scroll at every width;
  - the ASCII block's rules;
  - the diagram slot left for the `diagrams` job;
  - the reading font stack, with the Korean serif;
  - the Hangul-run wrapping rule;
  - the unread rule, with the server's reset and when a re-read counts;
  - every new string.

  The state bar is canvas-only, never something to build.

## Paths

- **Runtime**, refreshed for this round and unchanged since round 01:
  `/private/tmp/claude-502/-Users-sugang-projects-personal-knowledge/f0010d83-1939-47da-8f62-5ffe37557260/scratchpad/artifact-files/round02/artifact-type/dc-runtime.js`
- **Type references:**
  `/private/tmp/claude-502/-Users-sugang-projects-personal-knowledge/f0010d83-1939-47da-8f62-5ffe37557260/scratchpad/artifact-files/round02/`,
  holding `SKILL.md` and `artifact-type/reference/{format,craft,design-system-components,view-state}.md`
- **System namespace:** `kb`
