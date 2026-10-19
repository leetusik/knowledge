# Result — job `01-reader`, round `02-revise` (P29.S4)

This round supersedes `01-reader/01-reader`. It makes the six changes the operator asked for, plus the fixes they forced (each logged as a departure), and nothing else. It is one direction (`new visual direction: no`), and it extends round 01's reader in place under `jobs/01-reader/canvas/project/`. The canvas passes `design-check 01-reader`. Nothing here is signed.

## Intent, one line per Page

The four Pages are round 01's; only 01 and 03 changed how they hold the state bar.

- **01 · Page — Reader (the flow).**
  - Who: the operator, signed in on a phone, iPad or Mac, coming back days later; or a signed-out reader of a public book.
  - The job: read one chapter well, from opening to end, then go on to the next.
  - What they see first: the chapter's title and lede under its book's name. A reopened chapter shows the section they left, with a small note.
  - *Round 02:* the state bar sits at the top of the page and scrolls away with the chapter.
- **02 · Page — Chapter screen alone.**
  - Who: the builder, looking at the chapter screen by itself, as the flow mounts it.
  - What they see first: the chapter opening, as in 01.
- **03 · Page — The reader at 390, 820 and 1440.**
  - Who: the operator checking the three reference sizes side by side, in any theme.
  - *Round 02:* each frame carries the bar at the top of its own page, so it scrolls away with that frame's chapter. A pick in any frame moves all three.
- **04 · Page — Stand-in for another job's screen.**
  - Who: a reader who followed a link to a screen another job draws.
  - What they see first: which job draws it, and the one way back.

## The plan, and its review

### The plan

- **Boards:** the same 31 boards and titles as round 01. No board is added or removed.
- **Type, space and colour:** unchanged, except:
  - the Korean serif in the reading and display stacks;
  - one canvas-only neutral set for the diagram stand-in.
- **The bold move** stays the chapter opening. Nothing this round competes with it.
- **The six changes, and where each lands:**
  1. The bar moves into the reader's own scroller, as its first child: Reader, Elsewhere, Main, Widths, `flow.js`.
  2. One text column for every block, with the box measuring itself: `reader.css`, ProseTable, CodeBlock, Prose.
  3. Diagram fences become the stand-in; a new invented `md` document carries the drawing: `reader.js`, Prose, CodeStates.
  4. Noto Serif KR goes into `--font-reading` and `--font-display` on the reader root: `reader.css`, Foundations.
  5. The parser wraps Hangul runs: `reader.js`, Prose, Callout, ProseTable.
  6. The unread reset and the hold: `flow.js`, Reader, ChapterEnd, EndStates, ListStates.

### What the review changed before building

1. **The stand-in draws no boxes and no arrows.** My first sketch drew the two planes as two boxes inside a frame. That pretends to be the diagram's design, which the handoff forbids. The stand-in is now:
   - a neutral grey dashed box in the canvas chrome's greys and system type, never the reader's tokens;
   - carrying only the kind and the text alternative (title and caption).
2. **The bar does not move out of the reader.** The first idea was to make Main a tall page that scrolls the window. That would need the reader's chrome to watch the window, not its own scroller, and Widths has three frames that can only scroll inside themselves. So the bar went inside each reader's scroller instead. One scroll moves the bar and the chapter together. The product scrolls the window, and the build prompt names it.
3. **The unread word is "Started", not a new word.** A new word ("Unread") would be a fourth state that S3 does not have. The reset leaves the chapter as the server holds it: started, at 0%.

## What changed from round 01

### 1. The state bar scrolls away (bar rule 1)

**Where the bar lives:**
- The bar is no longer drawn by Main above the reader frame.
- Main passes its groups to the mounted screen (a `bar` prop on `Reader` and on `Elsewhere`), which draws the bar as the first thing in its own scroller.
- Scrolling the chapter carries the bar up and out of view; back at the top it is whole and works.
- **Kept:** its size, its presets, its page groups, and C01's reservation (each preset reserves its bold width).

**What else changed with it:**
- **Main's frame** is 1440 × 929 (was 1017), since the bar no longer stacks above a 900 px reader.
- **The reader's chrome** now sits in a sticky wrapper (`.rd-topwrap`) inside the scroller. While the bar is in view, the top bar sits under it. Once scrolled, the top bar sits at the frame's top, under the 3 px progress line, which never moves.
- **The chrome rules are round 01's:**
  - it hides on scrolling down and returns on scrolling up, at the top, at the end, or on a tap;
  - "the top" is counted from under the bar.
- **The scroller starts at the frame's top edge,** like the product's window (departure 4, revised). So:
  - every sticky offset on the canvas is now the product's value;
  - C02's canvas-only offsets are retired;
  - jumps land under the top bar, measured from its real height.
- **Sheets and their scrim start under the visible part of the bar.** The amount is `--rd-barvis`, the bar's height in view, from 88 px down to 0. So the presets stay pressable while a sheet is open. This is canvas only, and is new departure 22.
- **The resume pill** follows the scroller in DOM order (canvas only). It looks and behaves as before.
- **Widths (03).** Each of the three frames draws the bar at the top of its own page:
  - the scenes plus the theme row, as an "extra" group in the same bar;
  - so each scrolls away with its own chapter;
  - a pick in any frame moves all three, as before.
  - The board's lead says so; its frame is 2794 × 1369.
- **Elsewhere (04)** draws the bar at the top of its page when the flow mounts it. The Book page and Library pages keep their one preset and the "only state" note.

### 2. Tables and code blocks take the text column's width

**One column for every block:**
- The wider lane is gone: `--rd-wide` 48rem, `.rd-w`, and the phone's code bleed `.rd-bleed`.
- The article is one track, `--rd-measure` 36rem, at every text size.
- Paragraphs, callouts, the diagram slot, code blocks and every table share its two edges.

**A box that measures itself:**
- Tables and drawings measure whether they are wider than their box, re-measured on resize and when fonts load.
- When they are, they scroll inside their own focusable box at every width, with round 01's fade and hint.
- **The 8-column table** is always wider than the column, so it always scrolls in its box.
- **The long route table:**
  - when it fits the column (text sizes 1–3), it keeps its page-level sticky header;
  - when it is wider (sizes 4 and 5), it takes its own 30rem box, the phone's, with the header row sticky at the box's top and its cells on one line. A sticky cell cannot stick to the page from inside a sideways-scrolling box.

**Long code lines** wrap in the narrower block with the hanging indent, as before.

**Components boards:**
- CodeStates (11), TableStates (12) and the mounted CodeBlock part draw their blocks at the column's width (576 px) on 720 px stages.
- Their captions now say "In the text column · …", and which sizes scroll in the box.
- A standalone frame centres a code block or table at `--rd-measure` (`.rd-standalone > :is(.rd-code, .rd-table)`), so the boards match the reader. This is a forced change, logged as departure 27.

### 3. The native chapter's drawing is a diagram stand-in; ASCII art moves to an `md` document

**The native sample chapter** (`maintainer-guide/internals`, in EN v2, EN v1 and KO v1) now carries a `diagram` fence, `#two-planes`, where the ASCII drawing was.
- **The parser:**
  - reads its top-level `kind`, `title` and `caption` in a native document;
  - draws them as the stand-in;
  - in an `md` document, a `diagram` fence stays a plain code block, since typed fences are inactive there.
- **The stand-in** (`.rd-dgm`, `data-proto="stand-in"`) is a grey dashed box in the text column. It carries:
  - the label "Canvas only · diagram stand-in · the diagrams job (P29.S5)";
  - the line "A `flow` diagram goes here. The diagrams job draws it; this box only holds its place and shows the text a reader gets without the picture.";
  - the diagram's Title and Caption, as a definition list, with Hangul runs wrapped.
- **Its look:** the canvas chrome's neutral greys and system type, in light and sepia alike, with its own dark set. It never takes the reader's tokens, so it never reads as the diagram's design.

**The drawing moves to a new invented `md` document,** `doc/field-notes/wal-files`, "Inside a WAL database: the three files" (EN v1, 14 Mar 2026, format `md`). Its `text` block is a 78-column drawing of the three files of a SQLite WAL database:
- every line is 78 characters;
- every corner and junction meets the stroke above or below it (checked column by column).

The loose document `sqlite-wal` stays native, so its book-less reader states are unchanged.

**The new preset "Plain Markdown · ASCII drawing"** opens it, on the "Reader · a loose document" page of 01, and in 03's bar.

**How the ASCII block holds together:**
- **Line height** `0.93`, just under the ink height of JetBrains Mono's `|` (0.94em), so vertical strokes join from line to line.
- **Alignment:**
  - `white-space: pre`;
  - no ligatures;
  - and `font: inherit` on the inner `code`. The browser's own `code { font-family: monospace }` was setting every code block in Menlo in round 01, which is a forced fix and departure 26.
- **Scrolling.** Wider than the column, it scrolls in its box with a fade and the hint "Scroll sideways to see the whole drawing →", at every width (the fade is new: departure 28).

**Board 11 (CodeStates)** takes its ASCII state from the `md` sample:
- "ASCII drawing in the text column · text sizes 1, 3 and 5 · wider than the column at each, so it scrolls in its box";
- the phone, and dark and sepia.
- Round 01's "fits at 820" caption is gone, because at 576 px nothing 78 columns wide fits.

**Board 09 (ProseStates)** shows the stand-in in its pick of the chapter's blocks, and its lead names it.

### 4. A Korean serif for chapter text

**The faces.** On the reader root:
- `--font-reading` is `"Literata", "Noto Serif KR", "Nanum Myeongjo", "Pretendard", "Apple SD Gothic Neo", "Noto Sans KR", Georgia, serif`;
- `--font-display` is `"Fraunces", "Noto Serif KR", "Nanum Myeongjo", "Pretendard", Georgia, serif`.

**Where Hangul now sets in Noto Serif KR:** wherever round 01 used the reading or display face. That is:
- the body;
- the h2–h4 headings;
- the title and lede;
- callout text and titles;
- the next chapter's title;
- "In this book";
- sheet titles and the Display panel's samples.

**The interface keeps Pretendard:** bars, buttons, sheets' contents, the contents entries, the chapter list, labels and tables.

**Why Noto Serif KR, not the system's Nanum Myeongjo:**
- it is the face the operator accepted;
- it is OFL;
- it is variable from 200 to 900, so headings get a true 600 and `strong` its 650;
- its strokes hold at 15–22 px on screen, where Nanum Myeongjo's hairlines thin out.

Nanum Myeongjo stays next in the stack as a fallback. The choice and its reasons are in `build-prompt.md` (*Faces*). On the canvas, the face loads from Google Fonts CSS with Literata.

**Board 05 (Foundations)** has a new card, "Korean text · Noto Serif KR (new, OFL)", with:
- a Korean sample;
- a mixed English sample with a Hangul run;
- what uses it.

The Literata and Fraunces cards say "Hangul in them sets in Noto Serif KR".

**Two fixes the wider serif forced,** both logged as departures:
- a wrapped inline code chip is now cut open at the line break, so it never overhangs the column (departure 32);
- Korean in a table cell never breaks mid-word (departure 33).

### 5. Hangul runs inside English stay whole

**The run.** The canvas's parser (`reader.js`, `koParts`) wraps each Hangul run inside non-Korean text in `<span lang="ko">`. A run is one Hangul word, or several joined only by spaces: `/\p{Script=Hangul}+(?:[  ]+\p{Script=Hangul}+)*/gu`. So "지식 시스템의 내부" is one run.

**Where it applies:**
- paragraphs and list items;
- emphasis, strong and strikethrough;
- link text;
- headings (h2–h4);
- callout titles and bodies;
- table cells and header cells;
- the diagram's title and caption.

**Where it does not:** inline code and code blocks, and text whose language is already Korean.

The `:lang(ko)` rule (`word-break: keep-all`) then keeps each run whole, and the English around it wraps normally. Boards 09 (Prose kit), 10 (Callout) and the mounted Prose part render the wrapped runs. `build-prompt.md` names the rule (6a).

### 6. A re-read finishes a chapter again

**Mark as unread now resets the chapter:**
- `started`, furthest-read (`max_fraction`) 0, finished cleared, no saved place;
- so it reopens at the top.

**The press is made at the end, so the chapter is held.** Reaching the end does not finish it, and no position is written, until the end has left the view (the reader has gone back into the chapter). Reading to the end again then finishes it, with no press, by round 01's rule. The hold also ends when the view changes (another chapter, language or version). Mark as finished still works at any time.

**The new sentence at the end** is "Marked as unread. Read it to the end again to finish it." It sits in C03's single grid cell, so pressing Mark as unread or Mark as finished moves nothing.

**The chapter list's word is "Started"** with no percentage. It is the state the server holds after the reset: opened, at 0%. "Not started" means never opened. The end ("Not finished"), the chapter list and the Contents sheet agree. The reasoning is in `build-prompt.md` (11).

**Boards:**
- EndStates (14) draws the unread state at 0%, back at the start.
- ListStates (13) adds "Member · the open chapter marked as unread · Started, back at the start".
- The "End · marked unread" preset lands on the reset state.

## Boards

- **Pages:**
  - 01 · Page — Reader (the flow);
  - 02 · Page — Chapter screen alone;
  - 03 · Page — The reader at 390, 820 and 1440;
  - 04 · Page — Stand-in for another job's screen.
- **Foundations:** 05 · Foundations.
- **Components:** 06–18, as round 01:
  - top bar, chapter bar, chapter opening, prose kit, callout;
  - code block, table, chapter list, chapter end;
  - Sign in to save, Display panel, version history;
  - loading, not found and failed.
- **Mounted parts:** 19–31, as round 01.
- **Directions:** none.

**Files changed this round:**
- `Main`, `Reader`, `Widths`, `Elsewhere`;
- `Prose`, `Callout`, `CodeBlock`, `ProseTable`, `ChapterEnd`;
- `CodeStates`, `TableStates`, `ProseStates`, `ListStates`, `EndStates`, `Foundations` (`.dc.html`);
- `canvas.json`, `reader.css`, `reader.js` and `flow.js`.

**canvas.json:**
- Rows are re-stacked to the new heights, at 80 px between frames and 120 between rows. TableStates is 2320 wide, so its three cells stay on one row.
- Every other key and entry is kept.

## Data used

### Real

Round 01's real data stands unchanged:
- the five chapter titles of the `knowledge` maintainer guide and their subjects;
- the route and settings tables modelled on the shipped server;
- the shipped copy from `web/src/content/documents.ts`;
- the contract strings;
- the logo.

### Made up for the canvas

Round 01's made-up data stands:
- the book's title;
- the chapter bodies, Tidewater and its 20 chapters;
- the loose document `sqlite-wal`, the private chapter and the Korean variant;
- every date, version and progress figure, the latency table and the failure reference.

New this round:
- **The `md` document** `doc/field-notes/wal-files`, "Inside a WAL database: the three files" (EN v1, 14 Mar 2026), in the invented `field-notes` project. It carries the 78-column ASCII drawing of `app.db`, `app.db-wal` and `app.db-shm`, written for the canvas on SQLite's documented file layout (header, frames, checkpoint, index). It makes no product claim.
- **The diagram block** `#two-planes`, written for the canvas on the drawing's subject. Its YAML body also names groups and nodes; the stand-in shows only the kind, title and caption.
  - Title "One FastAPI process, two planes". Caption: "The content plane is rebuilt from the files under `docs/` by `reindex()`. The accounts plane keeps users, orgs, keys and sessions in Postgres, and its checks run before the write lock."
  - In KO v1: "FastAPI 프로세스 하나, 평면 둘", with a Korean caption.

### Not on the canvas

- No secret, key, email or person.
- No glide-ilab or base material, and nothing from arb_upbit_1.

**Placeholders:** none.

## Component and token gaps

### Component gaps

The system still ships no component bundle, so every part is markup on its own board, as in round 01. The list is round 01's:
- the top bar and progress line;
- the chapter bar;
- the resume pill;
- the chapter opening;
- the prose kit;
- callouts;
- the code block;
- prose tables;
- the chapter list;
- the chapter end;
- Sign in to save;
- the Display panel;
- version history;
- the sheets and scrim;
- the reading states.

New this round:
- **The diagram slot.** It is not a gap for this job: the `diagrams` job (P29.S5) designs the block. The canvas draws only a canvas-only stand-in.

### Token gaps

These are values P30 adds to the code, reader-scoped (Q8). Nothing is applied to the system.

1. **`--font-reading`:** Literata, then Noto Serif KR for Hangul (*round 02*).
2. **`--font-display` on the reader root** *(round 02)*: the system's stack with Noto Serif KR ahead of Nanum Myeongjo.
3. **The five text sizes** (`--rd-fs`, `--rd-k`, `--rd-lead` 1.65, `--rd-fs-s`).
4. **`--rd-measure` 36rem,** now the one column for every block. `--rd-wide` is removed.
5. **The sepia theme**, under `[data-theme="sepia"]`.
6. **The syntax roles** `--rd-syn-*`.
7. **`--rd-on-accent`.**
8. **Motion:** `--rd-ease`.
9. **Chrome heights:** `--rd-top-h`, `--rd-bot-h`, `--rd-line`.
10. **Noto Serif KR** *(round 02)*: a new self-hosted face, OFL 1.1, variable `wght` 200–900, split into `unicode-range` subsets. It is the fifth face beside the system's three and Literata.

`--rd-barvis` and the `.rd-dgm` greys are canvas-only and are not tokens.

## Measured contrast of the colours this round adds

Only the diagram stand-in adds colours. They are computed with the WCAG formula from the hex values. Light and sepia share one set, and dark has its own. Round 01's table stands for everything else, which is unchanged.

| Pair | Light | Sepia | Dark |
|---|---|---|---|
| Label "Canvas only · …" and the "Title" / "Caption" terms | 8.23 (`#444` on `#ececea`) | 8.23 | 8.00 (`#c4c4c0` on `#2c2c2a`) |
| The "goes here" line | 11.97 (`#2b2b2b` on `#ececea`) | 11.97 | 11.83 (`#ececea` on `#2c2c2a`) |
| Title and caption text | 14.25 (`#1d1d1d` on `#ececea`) | 14.25 | 11.83 |
| The kind chip (`flow`) | 12.26 (`#1d1d1d` on `#dcdcd8`) | 12.26 | 9.21 (`#ececea` on `#3d3d3a`) |
| Dashed border vs the page (UI, 3:1) | 4.27 (`#7a7a75` on `#fffefa`) | 3.67 (on `#f6ecd6`) | 4.69 (`#8a8a86` on `#232019`) |
| Dashed border vs its own box | 3.65 | 3.65 | 4.04 |
| Inner dashed divider (decorative, between the note and the text alternative) | 1.67 | 1.67 | 2.77 |

- **The border was raised in this round's self-check.** At `#8a8a86` it measured 2.95:1 against the sepia page; it is now `#7a7a75`.
- **The inner divider** separates two parts that the label and the terms already name, so it carries no meaning on its own.

**Changed in role, not in colour:**
- the table hint now uses `--font-body`;
- the ASCII fade uses the code block's ground, `--rd-code-bg`.

## Known from round 01

- **The column's small step at text sizes 1 and 2** (12.5 and 13.75 px), close to the 13 px interface step: **unchanged.** No change here touches it.
- **The "→" glyph sits high in Source Sans 3:** **unchanged.**
- **The resume pill briefly covers one line:** **unchanged** in look and behaviour. Its place in the DOM follows the new scroller (canvas only).
- **On a phone, the long table's box shows only a sliver of its second column:** **unchanged on the phone.** The phone keeps its 30rem box, fade and hint, as drawn.
  - **What change 2 did elsewhere:** from 40rem the long table now sits in the 36rem column. At text sizes 1–3 it fits, with its page-level sticky header. At sizes 4 and 5 it is wider, so it takes the same box as the phone.
  - **Row 30 stays readable** at every width. Measured at 820 and 1440, at sizes 4 and 5, row 30's cells start exactly at their header cells' left edges (at 1440 and size 5: 433, 823.7, 907.6 and 1001.9 px). Scrolled to the end of its box, the header row stays at the box's top (81.3 px against the box's 80.3).

## Departures from the handoff

Each is a call the handoff left open, or a place where the canvas differs from what the product will do.

### Round 01's departures that still hold

1. **A fourth face, Literata, for reading text.** It is the answer to "kindle like" (Kindle's Bookerly is proprietary). It is OFL and self-hostable; on the canvas it loads from Google Fonts CSS. The operator did not take up the critic's note on it.
3. **Lines past 75 characters at text sizes 1 and 2.** The column is fixed at 36rem by the operator's "fixed column width".
5. **A reading chrome of its own** for members and the signed-out alike, with no app shell (Q4, settled).
6. **Presets keep the device settings** (theme and size). "Device in dark mode · System" is the one preset that sets the theme.
8. **02 and 04 are fixed 1440 × 900 boards,** not fill pages.
9. **In-text links carry `href="#top"`** and are handled by script, so no link leaves the canvas.
10. **The canvas parses its sample markdown in the browser** (`reader.js`); the product renders on the server (S2). This round the parser also wraps Hangul runs and reads `diagram` fences.
11. **Progress is the scrolled fraction of the chapter,** saved with the section being read. On the canvas the fraction is counted from under the state bar.
12. **Back links use "‹",** and next links "→".
13. **"Sign in" is not in the phone top bar.**
14. **"Version history" shows only with more than one version.**
15. **The chapter's contents show only with at least 2 entries.**
16. **The not-found copy is new** ("Chapter not found …", with "‹ Back to the library").
17. **No "cards below 40rem" for prose tables** (Q2, settled).
19. **Board 22, the Prose mounted part, shows the loose document,** to stay under 8000 px.
20. **The reader's interface type is 13 and 15 px,** with sheet titles at 18 (Q9, settled).

### Revised this round

2. **One column for every block.** Was: a 36rem text column, with code and tables to 48rem. Now text, tables, code, drawings and the diagram slot all take the 36rem column, and wider content scrolls in its own box. The column still departs from `kb-measure` 42rem, as before. `--rd-wide` is gone.
4. **The canvas scrolls inside the reader frame,** as before, while the product scrolls the window. Now the scroller starts at the frame's top edge, like the window, and carries the state bar above the chrome. So:
   - the sticky offsets on the canvas are the product's;
   - round 01's canvas-only long-table offsets (C02's `-1 × --rd-top-h` and `0`) are retired.
7. **The widths board's bar.** It still works on scene and theme at once. Its bar, with a theme row, is now drawn at the top of each of the three frames' pages, so it scrolls away with that frame. It is still a 2794 px interactive board, not a 1280–1440 fill page.
18. **The long table's own box.** Was: on a phone only. Now it is used whenever the table is wider than the column, at any width: on a phone, and from 40rem at text sizes 4 and 5. Its header row sticks at the box's top. From 40rem, a long table that fits keeps its page-level sticky header: flush under the top bar while the chrome shows, under the 3 px line while it hides.

### Retired this round

21. **Hangul inside English breaking between syllables.** Retired by change 5: each run is wrapped in `lang="ko"`.
- **The C02 note that the canvas's sticky offsets differ from the product's.** Retired by the revised departure 4.

### New this round

22. **Sheets and their scrim start under the visible part of the state bar** (`--rd-barvis`, from 88 px to 0 as the bar scrolls away), so the presets stay pressable while a sheet is open. This is canvas only; in the product they start at the progress line as specified.
23. **The resume pill's DOM order follows the canvas's scroller.** This is canvas only, with no change in look or behaviour.
24. **The chapter list's and the Contents' titles stay in the interface face** (Source Sans 3, with Pretendard for Hangul). The handoff's change 4 lists "the chapter list's titles" among the places round 01 sets `--font-reading`. Round 01 in fact sets them in `--font-body`, the interface face, and the handoff also keeps the interface on Pretendard. So I left them as drawn. This is open question 1.
25. **A new invented `md` document carries the ASCII drawing** (`doc/field-notes/wal-files`), with a new preset "Plain Markdown · ASCII drawing" on 01 (the loose-document page) and 03. The loose document `sqlite-wal` stays native.
26. **Code blocks now render in JetBrains Mono, with ligatures off** (forced). Round 01's code blocks rendered in Menlo, because the browser's `code { font-family: monospace }` overrode the mono face (a latent round 01 bug, found when measuring the ASCII strokes). Every code block therefore looks a little different from round 01's published canvas: the system's mono face, as round 01 specified.
    - Ligatures are off so that `->` stays two characters, which code and drawings need (open question 3).
27. **Components boards draw code blocks and tables at the column's width** (forced), centred at 36rem inside their stages. The tables board is 2320 px wide so its three stages stay on one row.
28. **The ASCII block gains a fade.** Round 01's ASCII block showed only its hint, under 40rem. It now shows the same fade as a wide table whenever it is wider than its box, at every width, as change 2 asks ("with round 01's fade and hint"). *(Critique pass 01)* Like the table's, it now shows only on a side where more of the drawing remains (departure 34).
29. **The table hint is set in `--font-body`** (forced). It inherited the reading face before. It now shows at desktop widths too, beside the code hint, which already used `--font-body`.
30. **Hangul in the reader's display face is Noto Serif KR, not Nanum Myeongjo.** The system's `--font-display` names Nanum Myeongjo; the reader root overrides the stack, putting Noto Serif KR ahead of it, so headings and body match. This covers the title, headings, callout titles, the next chapter's title, "In this book", and the sheets' titles, which are display type, while the rest of each sheet keeps Pretendard.
31. **The preview's `layout-shift` lines on the two Pages are left as they are.** They come from bar rule 1 itself (*Render log*): a preset that lands inside the chapter scrolls the page past the bar, so the reader's header moves up by the bar's height. Nothing resizes, and the header holds still while a state shows.
32. **A wrapped inline code chip is cut open at the line break** (`box-decoration-break: slice`, was `clone`). This is forced by change 4. With Noto Serif KR, a Korean list item at 390 broke its chip right at the column's edge, and the chip's cloned end padding and border overhung the column by 5.8 px. Chrome does not count a cloned fragment's end padding when it breaks a line. The fix shows only where a chip wraps, in any language: the piece before the break has no right edge and the piece after it no left edge.
33. **Korean in a table cell never breaks mid-word** (`.rd-t :lang(ko)`: `keep-all` with `overflow-wrap: normal`). This is forced by change 4. The prose rule's `overflow-wrap: anywhere` let narrow Korean cells break inside a word. Round 01 showed this once, "경|로" at size 5. With the wider Korean serif it showed three times at size 5 and once at size 3, at every width. A narrow column now grows to its longest word, and the table scrolls in its box when that makes it wider than the column.
34. **The scroll fades follow the scroll position** *(critique pass 01, C02)*. Round 01's fade was a constant 2rem gradient at the box's right edge, shown whenever the box could scroll, so at the scroll end it still veiled the last 32 px (the drawing's top-right corner, the table's last column). Each scrolling box (a drawing, the 8-column table, a long table in its box) now has a right fade shown only while more remains to the right, and a mirrored left fade shown only once it is scrolled. Both are overlays toggled by `opacity` over `--rd-ease`, so nothing moves. The look at the start of the scroll, the only state the static boards show, is unchanged.

## States reached only by interaction

Round 01's list stands:
- hover, focus and the keyboard;
- the chrome hiding and returning;
- the resume pill;
- the language switch landing on the same section;
- Try again;
- the Contents sheet scrolling to the current chapter;
- opening a started chapter at its saved place.

New this round:
- **The bar scrolling away and back.** Scroll the chapter on 01, or in any frame of 03. At 1440 the bar is 88 px tall; at `scrollTop` 400 it is at −400, out of view, and the chrome hides as before. Back at the top, the bar is whole.
- **A re-read after Mark as unread.**
  1. Press "End · marked unread", or press Mark as unread at a finished chapter's end.
  2. The end reads "Marked as unread. Read it to the end again to finish it."; the chapter list and the Contents read "Started".
  3. Scroll up until the end leaves the view, then back down to the end: the chapter is finished again with no press, and the end reads "Finished".
- **Scrolling a drawing or a wide table with the keyboard.** Both are focusable regions. The 8-column table at size 3 scrolls to its last column (`scrollLeft` 266) with the arrow keys.
- **The scroll fades in the middle and at the end** *(critique pass 01)*. Scroll a drawing, the 8-column table or a long table in its box: in the middle both edges fade; at the end only the left one does, and the last column is at full strength. The static boards show the start, with the right fade only.

## Open questions, for the operator

Each one is drawn as my answer. Only the operator's words settle them.

1. **The chapter list's titles: reading face or interface face?** Change 4 lists "the chapter list's titles" among the reading-face places. Round 01 sets them in the interface face (Source Sans 3 / Pretendard), like every other list in the sheets, and I kept that.
   - **Drawn:** interface face.
   - **The other reading:** set the titles in Literata, with Noto Serif KR for Hangul. A list in a sheet would then look like the text rather than the controls around it.
2. **What a `diagram` block shows if the reader ships before the diagrams job's block.**
   - **Drawn:** the reader builds the slot only, a figure carrying the title as its name and the caption. The build prompt leaves its look to the `diagrams` job.
   - **The question:** if P30 builds the reader first, should the slot show just the caption as plain text, or wait?
3. **Ligatures off in code blocks.** JetBrains Mono draws `->`, `=>` and `!=` as single glyphs by default.
   - **Drawn:** off everywhere in code blocks, because a drawing needs every character as typed, and code is read as typed.
   - **The other reading:** keep them on in code and off only in `text` drawings.

## Render log

Every pass ran as `python3 scripts/workflow.py design-preview 01-reader --runtime <the handoff's runtime> --out <scratch> --click`, into a scratch folder outside the design root. Two passes in all. Between them, I measured with my own scratch scripts in the same throwaway headless browser (`design-preview`'s server and browser, driven over CDP).

### Pass 1

- **Covered:** 32 PNGs and 94 click-through states.
- **Measured:** 64 `issue` lines: 7 × `check=frame-clip` and 57 × `check=layout-shift`.
- **The frame-clips.** Boards whose content grew with the changes:
  - Foundations 2300;
  - ProseStates 6180;
  - CodeStates 2071;
  - TableStates, which wrapped its third stage at 2200;
  - ListStates 2488;
  - EndStates 2341;
  - CodeBlock 429.

  Fixed by syncing each height into `canvas.json` and its `$preview`, widening TableStates to 2320, and re-stacking the rows.
- **The layout-shifts.** Every one is the reader's `header.rd-top` moving from under the bar to the top of the frame (y 91 → 3 on 01; 397, 272 and 246 → 159 on 03's three frames). They come from a preset that lands inside the chapter, which scrolls the page past the bar, as bar rule 1 requires. No control resized, and C01's reservation held.
- **What the PNGs and my measurements showed, and what I fixed:**
  1. **Code was set in Menlo, not JetBrains Mono** (the browser's `code` rule). Fixed with `font: inherit` and no ligatures (departure 26). The drawing is now 78 JetBrains Mono glyphs per line.
  2. **The stand-in's dashed border was 2.95:1 on sepia.** Raised to `#7a7a75`: 3.67 against the sepia page and 3.65 against its own box.
  3. **The Foundations Korean sample broke mid-word** ("에이전/트가"). It now keeps words whole (`keep-all` on that sample).
  4. **Standalone stages of 624 px tripped the phone layout.** The stages are now 720 and the blocks sit at the column's width.
  5. **The table hint was in the reading face** at desktop widths. It is now `--font-body`.
- **Measured after the fixes** (scratch scripts):
  - **Edges.** At 820 and 1440, at text sizes 1, 3, 4 and 5, the paragraphs, a callout, the diagram stand-in, the code block and the wide, numeric and long tables share one left and right edge: 432 / 1008 px at 1440, and 122 / 698 at 820. Nothing scrolls sideways: the document's and the scroller's `scrollWidth` equal their `clientWidth`.
  - **The 8-column table** is 781, 840, 889 and 941 px wide at sizes 1, 3, 4 and 5, in a 574 px box. It is always "over", with the fade and the hint showing. By keyboard it reaches its last column.
  - **The long table** fits at sizes 1–3. It is wider at sizes 4 and 5, where it takes its own box (611 and 662 px in 574, after the post-pass fix below). Its header sits at the box's top, and row 30's cells line up under their headers.
  - **The long table's sticky header** (the C02 check) at 1440, size 3: its top is 3 px while the chrome hides (under the 3 px line) and 59 px while it shows (the top bar's bottom).
  - **The bar.** At the top of the page the bar spans 0–87.6 px and the top bar starts at 90.6. At `scrollTop` 400 the bar is at −400, out of view, the chrome is hidden, and `--rd-barvis` is 0.
  - **The ASCII drawing** at sizes 1, 3 and 5: the font is 12.5, 15 and 18.33 px, and each line is 11.62, 13.95 and 17.05 px tall (0.93em). It is wider than its box at every size (601, 718 and 874 px in 574), with the hint and the fade. It has 13 lines, the vertical strokes join in the screenshots at each size, and the corners meet.
  - **The faces, read from the platform fonts actually used** (`CSS.getPlatformFontsForNode`):
    - a Hangul run in the English chapter: Noto Serif KR (8 glyphs), plus Literata for its spaces;
    - the KO chapter's title: Noto Serif KR (22) and Fraunces (10, Latin and spaces);
    - its h2: Noto Serif KR;
    - a body paragraph: Noto Serif KR (93) and Literata (66, Latin and punctuation).
  - **Baseline.** In a mixed line, a Latin marker and a Hangul marker sit on the same baseline (10077.36 px). The paragraph is exactly three line-heights tall (2.999 × its line height), so no line grows.

### Pass 2

- **Covered:** 32 PNGs and 94 click-through states.
- **Measured:** 57 `issue` lines, every one `check=layout-shift`:
  - 30 on 01: `header.rd-top` y 91 → 3, or 3 → 91;
  - 27 on 03: 397, 272 and 246 → 159, and back.

  Each is the reader's header moving with the bar, as bar rule 1 requires (departure 31). There are no frame-clips: every board's frame equals its `content=` height, and nothing is unmounted and there are no errors on any board. The link graph from `Main.dc.html` reaches Reader, Widths and Elsewhere.
- **What I read:** the PNGs of every changed board:
  - Main, at 1440 and at 390;
  - Widths, Foundations, ProseStates, CodeStates, TableStates, ListStates, EndStates;
  - CodeBlock, Prose, ProseTable, Elsewhere.

  I also read these Main states: Top of chapter, End · marked unread, The two planes (the stand-in), 한국어 · older translation, Chapter list open, Library. And these Widths states: the defaults, Plain Markdown · ASCII drawing, The two planes.
  - **What they show:**
    - the bar scrolls away on a jump, and the sheet starts at the progress line once the bar is gone;
    - the stand-in reads as canvas chrome in all three themes;
    - the drawing's strokes join at sizes 1, 3 and 5;
    - the KO title, lede and body are in the serif, and the contents entries in Pretendard.
- **What I fixed after it.** Each fix was checked by my own scratch measurements and screenshots in the same throwaway browser, not by a third `design-preview` pass; there were at most 2 passes.
  1. **The long table's own box let "write key" wrap** at size 5 (board 12, and the reader at 1440 and 820). The build prompt says its cells stay on one line, as on a phone; the canvas now matches. Re-measured:
     - every row is one line;
     - the table is 611 and 662 px at sizes 4 and 5 in a 574 px box, with the fade and hint showing;
     - row 30's cells line up with their headers;
     - board 12 stays 2788 px tall.
  2. **A code chip overhung the column at 390 in the Korean chapter** (departure 32), by 5.8 px. After the fix, no paragraph, list item, heading, title, lede or diagram text overflows its box. That holds in EN and KO, at 390, 820 and 1440, at text sizes 1, 3 and 5.
  3. **Korean table cells broke mid-word** (departure 33). After the fix, scanning every Hangul text node of the KO chapter for a line break between two Hangul letters finds none at 390, 820 and 1440, at sizes 1, 3 and 5. The KO long table fits at sizes 1 and 3 from 40rem and takes its box at size 5. Nothing scrolls the page sideways.
- **Also measured after the fixes.**
  - **Hangul runs in the English chapter** ("지식 시스템의 내부" and "쓰기 경로") never break between syllables, at 390, 820 and 1440 and at sizes 1, 3 and 5. "지식 시스템의 내부" may wrap at a space between its words, which `keep-all` allows.
  - **Mark as unread.**
    - Pressed at the end, it leaves the chapter Not finished. The button, the status row and the next block keep their exact place and size at 390 and 1440, and pressing Mark as finished puts it back.
    - Scrolled up past the end and back down, the chapter is Finished again, with no press. The chapter list then reads "Finished".
  - **Board heights.** Every fixed board's content height still equals its `canvas.json` height.
  - `design-check 01-reader` passes.
- **Left open:**
  - the 57 `layout-shift` lines (departure 31);
  - the four *Known from round 01* items, as reported above.

## Critique pass 01

Answering `critique-01.md` (mode `critic`, verdict `revise`, 2 must-fix, nothing held for a judge). Both are fixed; nothing is rebutted. The four 2b notes are the operator's and are left as drawn.

- **C01 · Korean chapter title breaks mid-word at 390 ("그리|고 계약")** — fixed:
  - `reader.css`: `.rd-ch__title:lang(ko), .rd-ch__sec:lang(ko) { word-break: keep-all; }`, the same rule the chapter opening, headings, callouts and cells already carry. `overflow-wrap: break-word` stays only as the last resort for one word wider than the row. The same gap existed on the end's next-chapter title and lede, so `.rd-next__title:lang(ko), .rd-next__lede:lang(ko)` get it too.
  - **Board 13 (ListStates)** draws its 한국어 card at 390 (was 420), captioned "Member · reading in 한국어 · sepia · 390 wide", so the wrap is visible there: "지식 시스템의 내부: 콘텐츠 평면, 쓰기 경로, / 그리고 계약". Its lead adds "A Korean title or section wraps only between its words." The board stays 1900 × 2488.
  - **Measured:** on Main, at 390, 820 and 1440 and text sizes 1, 3 and 5, in the KO chapter scrolled to its end and again with the Contents sheet open, a scan of every visible Hangul text node outside code and the state bar (196 and 201 nodes) finds no line break between two Hangul letters. The title takes 2 lines at 390 (in the end's list and the sheet) and 1 at 820 and 1440 in the end's list. Seen: the sheet at 390 and the board's 390 card.
  - `build-prompt.md` §10 and §11 now name `keep-all` for the list's titles and sections and the next chapter's title and lede, with the 390 example; the *Every state* table gains the row.
- **C02 · The fade stays over the last 32 px at the scroll end** — fixed (departure 34, and 28 amended):
  - `CodeBlock` and `ProseTable` read the box's scroll position (a passive `scroll` listener, plus resize and font load) and set `is-more-l` / `is-more-r`. Each box now has two 2rem fades: the right one shows only while more remains to the right, a mirrored left one only once the box is scrolled. Both are overlays shown with `opacity` over `--rd-ease`, so nothing moves; reduced motion drops the transition.
  - **Measured** at 1440, 820 and 390, text sizes 1, 3 and 5, for the 8-column table, the long table in its box and the ASCII drawing, at `scrollLeft` 0, half and max: left/right opacity reads 0/1 at the start, 1/1 in the middle and 1/0 at the end, every time. The long table at sizes 1 and 3 from 820 fits (no box, no fades), as before.
  - **Seen** at the scroll end: the drawing at 1440 in light and dark (the top-right `+`, the right-hand strokes and "the index --+" at full strength, the cut left edge now under a fade), and the 8-column table at 1440 in light and sepia and at 390 ("SINCE" and "P12" at full strength). At the start, the static boards (11, 12, 24, 25) look as before.
  - `build-prompt.md` gains §9a *The scroll fades* (when each shows, its ground, re-reads, no layout); §8 and §9 point to it.
- **2b notes 1–4** (list titles' face, the fixed 2ch hang, "Started", page 03's three bars): taste notes left to the operator; no change. Note 1 is already open question 1.

### Render log, critique pass

- **One `design-preview --click` pass** (pass 3 overall; the round's own two passes are above): 32 PNGs, 94 states, `failed=0`, every board's frame equal to its `content=` height, no unmounted part, no script error. 57 `issue` lines, all `check=layout-shift` on `header.rd-top` (30 on Main, 27 on Widths): the same lines as pass 2, from bar rule 1 (departure 31), which the critic weighed and accepted. No other `check=` line.
- **Read:** ListStates, CodeStates, TableStates, CodeBlock and ProseTable frames; my own captures of the Contents sheet at 390 in Korean, the board's 390 card, and the drawing and the 8-column table at their scroll start and end (1440 and 390; light, dark and sepia).
- **Left open:** the 57 `layout-shift` lines (departure 31); the four *Known from round 01* items, unchanged.
- `design-check 01-reader`: OK, 31 boards.
