# Result — job `05-annotations`, round `01-annotations` (P29.S5)

One direction, built out fully, on top of the signed reader (`01-reader/02-revise`), which this round only adds
to. `new visual direction: no`: every value is the system's or the signed reader's, except one proposed
reader-scoped colour role, the highlight (`--an-mark`, three values per theme, measured below).

## Intent, one line per Page

- **01 · Page — Reader with marks (the flow), `Main.dc.html`.** The operator, signed in, deep in a long
  chapter on a phone, an iPad or a Mac, came to keep a passage or a place for later; first seen: the passages
  they marked, painted where they left them, and, once they select, the one bar of actions under the
  selection.
- **02 · Page — Chapter screen alone, `Reader.dc.html`.** The chapter screen as one part, taking the marks as
  props; first seen: the chapter, exactly as signed, with nothing of this job's in the way until something is
  marked.
- **03 · Page — The reader at 390, 820, 1024 and 1440, `Widths.dc.html`.** The same prototype state drawn
  four times, so the operator can judge where each control sits on an iPhone, an iPad (portrait and
  landscape) and a Mac, in light, dark, sepia and at text sizes 1, 3 and 5; first seen: the same marks in
  four columns, the margin appearing from 1024.
- **04 · Page — Notes in this book, alone, `BookNotes.dc.html`.** The reader back days later, looking for
  "that note about the write lock" across five chapters; first seen: the count line and the filter, then the
  chapters' items, each with its words, its place and its language.
- **05 · Page — Stand-in for another job's screen, `Elsewhere.dc.html`.** Where a link leaves this job (book
  page, library, sign in, the legacy reader, an external link); first seen: which job draws it, and the way
  back. On the legacy stand-in it carries this job's one control there, "Bookmark this position".

## The plan, as built

**Boards (35):**

1. **Pages, row 1:** 01 Main (the flow, `expand: fill`, interactive), 02 Reader (the chapter screen alone),
   03 Widths (interactive), 04 BookNotes (the per-book list alone), 05 Elsewhere (the stand-ins).
2. **Components, rows 2–3:** 06 Highlights in the text, 07 Selection bar, 08 Highlight popover, 09 Place bar
   / undo line / sign-in prompt, 10 Margin notes, 11 Notes sheet, 12 Note row, 13 Bookmark on a legacy
   chapter, 14 Notes and bookmarks on typed blocks. Each shows every state side by side, in light, dark and
   sepia where the theme changes it.
3. **Mounted parts, rows 4–5:** 15–27 are the signed parts copied (one instance each); 28–35 are this job's
   new parts (Selection bar, Highlight popover, Place bar, Undo line, Margin note, Note row, Notes sheet,
   Legacy bar control), each rendering alone with a sensible default.

**Type:** nothing new. The column's reading face and sizes for text and quotes in lists (Literata, `--rd-fs`);
the interface's fixed 15 px for buttons, notes and list text, 13 px for the margin and meta, the 11 px mono
uppercase label for kinds ("Highlight · note", "Bookmarked", "Unanchored", "Text changed").

**Spacing:** the system's `kb-space-*` steps; inside the column, multiplied by the reader's `--rd-k`, as the
signed blocks are.

**Colour roles:** the reader's tokens, plus the highlight (`--an-mark`, `--an-mark-2` for an overlap,
`--an-edge` for the note underline). The accent stays for the primary action (Save note, Save label), the
current state (Bookmarked, the open highlight's underline, the open margin note, the filter) and links.
Destructive words use the system's `kb-status-revoked-ink`, in the popover; in a list they stay
`kb-secondary` until pointed at.

**The one bold move:** from 64rem the right margin becomes **the reader's notebook**: every note, bookmark
and marker set beside the line it belongs to, like a well-annotated printed book. Everything else (the
paint, the bar, the popover, the sheet, the place bar) stays quiet and borrows the signed reader's parts.

## The plan, reviewed against the handoff and the operator's bar

- *A bookmark toggle beside every heading* was the first idea. It reads as the default any docs site draws,
  it would crowd the signed heading's measure on a phone, and a reader mid-section would have to scroll up
  to find it. **Revised:** a Kindle-like **place bar** in the reader's bottom slot names the section being
  read and holds "Add note" and "Bookmark" for it ("kindle like"); selecting a heading or a typed block's
  caption gives the same two actions. Q1.
- *A "Notes" button in the top bar* does not fit at 390 beside the signed language switch and Display
  without truncating "‹ Book", which is signed. **Revised:** the chapter's Notes open in the **Contents
  sheet**, switched from its head ("Contents | Notes · 26"); the chapter bar's "Contents" opens it. A plain
  Markdown document, which has no Contents sheet and a shorter top bar, gets "Notes" in its top bar. Q1, Q8.
- *Tabs in the sheet* (the first draft's) read as a settings panel. **Revised:** a single switch word in the
  sheet head, the sheet itself unchanged.
- *A place bar pinned on screen at all times* would cover a line of text for the whole session.
  **Revised:** it rides with the signed chrome, as Kindle's controls do: it hides when the chrome hides on
  scrolling down and comes back with it on scrolling up or a tap on the text. It also steps aside for the
  signed resume pill, a selection, a popover, the undo line, a sheet, and at the chapter's end.
- *The state bar* scrolls away with the page (bar rule 1).

## What was designed

### Pages

- **01 Main (the flow).** The signed reader with this job's layer, every state reachable by clicking or by
  the state bar. Pages in its state bar: *Reader · a chapter* (34 presets), *Reader · a plain Markdown
  document* (5), *Notes in this book* (5), and the stand-ins (Book page, Library, Sign in, Legacy chapter
  with its two presets, External link). The legacy chapter is entered by a click: the chapter preset
  *Another book · Contents, with a legacy chapter* opens a Tidewater chapter with its Contents sheet, where the
  "Datums" row (tagged Original layout) opens it, as on the signed canvas. Selecting text with the mouse works on the canvas: drag across a
  paragraph and the bar appears under it; "Highlight" paints it and opens its popover.
- **02 Reader alone.** The chapter screen part (`Reader.dc.html`) with its default marks; the flow mounts it.
- **03 Widths.** Four frames: phone 390×844, iPad 820×1180, iPad landscape 1024×768 ("the margin starts
  here"), desktop 1440×900. A click in any frame moves all four. Its state bar has one group per page, as 01's:
  *The reader at four widths* (25 reader presets, a chapter's and the plain document's, plus Light, Dark, Sepia,
  System and text sizes 1, 3 and 5); *Notes in this book* (5, with the same display choices); and the stand-ins'
  groups. Only the group of the page on screen shows; the book's list (Contents, then Notes, then "All notes in
  this book →") and the legacy chapter (*Another book · Contents…*, then "Datums") are entered by a click in any
  frame.
- **04 BookNotes alone.** The per-book list as a part; the flow mounts it from the Notes sheet's foot.
- **05 Elsewhere.** The signed stand-ins, with this job's legacy control mounted on the legacy one.

### Components

- **06 Highlights in the text:** the paint in three themes; with a note (the 2px bronze underline, a shape);
  an overlap (one step deeper); the open one (accent underline); being selected (the accent's pale tint);
  inside code, inside a link; the markers under a heading below 64rem; Korean, its own paint and the English
  marker; text sizes 1 and 5.
- **07 Selection bar:** a passage; a passage cut at its section's end, saying so; a heading or a typed block's
  caption (Add note, Bookmark / Bookmarked); refused ("Highlights start at the first section."); a plain
  Markdown document ("Highlights are not available in this document." with "Bookmark this position" /
  "Bookmarked here").
- **08 Highlight popover:** no note; a note with Review this on; a 500-character note scrolling in the box;
  Review turned off (the card paused); a Korean note; writing a new note, editing one (with Delete note); a
  note on a selection (the highlight made on Save); a note on a section; a note on a diagram; two overlapping
  highlights (the chooser); Text changed; "1 highlight in 한국어"; a bookmark with a label, without one, and
  writing one; dark and sepia.
- **09 Place bar, undo line, sign-in prompt:** the place bar in a section (three themes), bookmarked, with a
  long title cut by an ellipsis, in a diagram's section, in Korean; the place bar in a plain document; the
  undo line for each kind of delete; Sign in to save with "bookmarks" and "highlights and notes", chapter and
  document.
- **10 Margin notes:** a highlight's note (short, long cut at four lines, Korean, open); beside a heading (a
  section's note, Bookmarked with and without a label, Text changed, another language); dark and sepia.
- **11 Notes sheet:** a chapter in English v2 (light, dark, sepia, writing a label); 한국어 v1 and English v1;
  empty, signed out, a plain document with a position bookmark and without; 30 marks in one chapter.
- **12 Note row:** each kind and status, in the sheet and in the book's list (where it names its language).
- **13 Bookmark on a legacy chapter:** the control on a stand-in of the legacy reader's bar; bookmarked;
  dark; signed out.
- **14 Typed blocks:** the diagram (the reader's own canvas-only stand-in) with a note; quiz, figure and
  sources stand-ins naming their jobs, with a marker and "Bookmarked"; the bar on a diagram's title, a
  quiz's question, and before the first section.

### States reached only by interaction (named, never faked)

- **Hover:** a highlight (the bronze underline shows on any highlight), a margin note (sunken tint), a list
  row (underlined words), Delete (the revoked tint), the place bar's and the bar's buttons. Hover on a
  Page.
- **Focus:** the system ring on every control; the popover takes focus when it opens and, when it closes, returns
  it to the control that opened it (a margin note, a row under a block, a list row), every time; a
  highlight's mark (with a note or without) has no tab stop, so focus stays where it was after one is clicked (Q10).
- **A real text selection** with the mouse on Main or Widths (the presets set a pending selection; a drag
  makes a real one); touch selection is drawn as a state, not as a live long press.
- **Keyboard:** H highlights the current selection, N opens a note on it, Escape closes the bar, the
  popover or the sheet; ⌘ Enter (Ctrl Enter) saves a note; Enter saves a label. Reached by typing on a Page.
- **The undo line's 10 seconds:** press Delete on a Page (in the chapter, the Notes sheet or the book's list,
  which shows the line on its own page); the line leaves by itself after ten seconds.

## Data used

- **Real, from the signed reader's `reader.js` (copied unchanged):** the book `knowledge` /
  `maintainer-guide` with its five real chapter titles; chapter 2 in English v2, English v1 and Korean v1;
  the plain Markdown document `doc/field-notes/wal-files`; the legacy chapter "Datums: Chart Datum, Mean Sea
  Level, and the Conversions Between Them" in the invented book "Tidewater, from the inside".
- **Written for the canvas (`annot.js`'s seed):** study highlights and notes on those chapters, in English
  and Korean, by an invented reader who is never named on the canvas and has no email:
  - `default`: 26 marks in chapter 2 (English v2), with notes, a section note, a diagram note, three
    bookmarks (one labelled "Flags to check before a deploy", one unlabelled, "Route table"), a highlighted
    link, an overlap, a 500-character note, a Korean note, a three-word highlight with a note ("before it
    pushes" → "The whole v2 change, in three words.");
  - **statuses:** two highlights made on English v1 that v2 no longer says (`block`, "Text changed"); two
    orphans whose sections were removed ("Scaling out the writer", "The nightly export"), each with its
    S3 snapshot; Korean highlights shown as a marker in English ("1 highlight in 한국어") and English ones as
    a marker in Korean ("7 highlights in English"); two approximate bookmarks migrated from the HTML
    explainers ("About 42% through · placed from the HTML version") and a position bookmark in the plain
    document;
  - `heavy`: 30 marks in one chapter; `many`: 100 items across the book's five chapters; `empty`.
- **Never on the canvas:** glide-ilab or base material, arb_upbit_1's content, secrets, keys, emails or
  personal data. None used.
- **Placeholders:** none.

## Files copied from the signed reader, and the signed parts this job added to

Copied from `01-reader/rounds/02-revise/canvas/project/`, **unchanged**: `assets/logo.svg`, `reader.css`,
`reader.js`, `ChapterHead`, `ChapterList`, `ChapterEnd`, `SignInToSave`, `DisplayPanel`, `VersionList`,
`ReaderState` (and `ds/kb/`, the system cache, as the round opened it). Not copied: Foundations (no value
changes) and the signed component-state boards, which stay on the signed canvas.

Copied and **added to** (nothing signed moved, restyled or dropped):

| Part | What this job added |
|---|---|
| `Reader.dc.html` | the article's selection and tap handling; the paint (via Prose and the blocks); the margin rail from 64rem; the floating box (selection bar, popover, or the raised Sign in to save); the bottom slot's place bar and undo line, which yield to the signed resume pill; the Contents sheet head's switch to "Notes · N" and the Notes view of that sheet; the keyboard keys H, N and Escape. |
| `Prose.dc.html` | `<mark>` paint on runs; `data-tx`/`data-sec`/`data-tk` on each text container; the markers under a block below 64rem; the "Bookmarked" tag in a heading's top margin. |
| `Callout`, `CodeBlock`, `ProseTable` | the same paint and container attributes; code lines carry their offset. |
| `ReaderTop.dc.html` | a "Notes" button, shown only for a plain Markdown document (`notes` prop). |
| `ReaderBottom.dc.html` | "Contents" reads as open while the Notes view of its sheet is open. |
| `flow.js` | the annotation state (marks, selection, popover, undo line, prompt, label editing, the book list's filter) and its actions; this job's presets. |
| `Main.dc.html` | mounts BookNotes and the legacy stand-in's control; the screens strip links BookNotes. |
| `Widths.dc.html` | a fourth frame, iPad landscape 1024×768, where the margin starts; this job's presets. |
| `Elsewhere.dc.html` | the legacy stand-in mounts this job's LegacyBar control. |

## Where this job meets the block jobs (seams assumed)

No sibling tree was read: the drafter's contract forbids reading a same-wave job's live canvas, so every
block of theirs is a plain stand-in that names its job.

- **`03-diagrams` (the diagram block).** A diagram with an id is a section of its own: its title and caption
  take a note on the diagram and a bookmark, never a highlight. The note sits in the margin from 64rem, or
  in a row under the block below it. The reader's own canvas-only diagram stand-in is used.
- **The highlight colour is not from the tone palette.** It is this job's reader-scoped yellow (`--an-mark`),
  chosen to read as a highlighter in all three themes. If `03-diagrams` puts a near-yellow in its tones, the
  wave should check the two never meet on one block.
- **`04-quiz`.** A quiz's question is its caption: selecting it gives Add note and Bookmark; its answers are
  never highlighted (a highlight there would read as an answer chosen). Sign in to save is shared unchanged:
  the quiz says "quiz answers", this job "bookmarks" and "highlights and notes".
- **`02-figures`.** A figure's caption and a sources list's heading take a note and a bookmark when the block
  carries an id (S2), never a highlight. Citations inside prose are prose: a highlight may cover one, and the
  citation still works as a link.
- **Where the marks sit on their blocks** is this job's: a row under the block (below 64rem) or the margin
  beside its first line (from 64rem), and "Bookmarked" in the block's top margin, right-aligned. Nothing of
  theirs moves.

## Departures from the handoff

1. **02 Reader and 04 BookNotes are not interactive**, following the signed canvas, where the alone boards
   are parts the flow mounts. Every state of both is reachable by clicking on 01 Main (and 03 Widths).
2. **The signed reader's own presets** (resume, display, versions, the chapter end, loading, not found,
   failed and the like) are **not in this canvas's state bar**, which holds only this job's states. The
   signed chrome still works by clicking (Display, Version history, the language switch, Contents, Previous
   and Next); the signed states that need a preset stay on the signed canvas.
3. **The preview's `layout-shift` lines on 01 and 03 are left as they are,** as the signed round left them
   (its departure 31): a preset or a jump that lands inside the chapter scrolls the page past the state bar,
   so the reader's header moves up by the bar's height. That is bar rule 1 itself. No control resized, and
   the header holds still while a state shows.
4. **"Bookmark per block"** is drawn as a bookmark per **id'd block**, which in a native chapter is a
   section (a heading) or a typed block. Paragraphs, lists, tables, code and callouts carry no id (S2), so
   a bookmark made while reading them belongs to their section. No per-paragraph toggle exists.
5. **"Highlights start at the first section."** is a new string, for a selection in the chapter's title,
   lede or the text before its first id'd heading (Q5). The handoff's own wording for unavailable
   highlights ("Highlights are not available in this document.") is kept for plain documents and legacy
   chapters.
6. **The legacy control** is drawn on a stand-in of the legacy bar and on the copied legacy stand-in page,
   as the handoff asks; its place in the real bar is wave 3's.

## Open questions (posed back; only the operator's words settle them)

1. **Where the controls live.** Drawn: the selection bar opens under the selection (above it when there is no
   room; 28px under it on touch, clear of the handles and of Safari's own menu, which sits above); the
   **place bar** in the reader's bottom slot names the current section with Add note and Bookmark; it
   rides with the chrome (hidden while reading down, back on scrolling up or a tap) and steps aside for the
   resume pill, a selection, a popover, the undo line, the sheets and the chapter's end; the chapter's
   **Notes** open in the Contents sheet, switched from its head; a plain document gets "Notes" in its top
   bar; the margin from 64rem. Trade-off: no new top-bar control in a chapter, at the cost of one more tap
   to reach Notes (Contents, then Notes).
2. **The highlight colour.** A warm highlighter yellow, light `#f5dc8a`, dark `#4a3c17`, sepia `#e9cc72`
   (overlap one step deeper; the line along its foot in the system's bronze inks). Reader-scoped, proposed as a
   new role; it never touches the app's own tokens. Trade-off: unmistakably "highlight", but the paint is
   only 1.34–1.51:1 against the page, so since critique 01 (C08) every highlight also carries a 1px bronze line
   along its foot (2px with a note), the shape that says "highlighted" without colour. The fill alone, Kindle's
   look, is the other choice: quieter text, but a highlight then rests on colour alone.
3. **A selection that crosses blocks.** Drawn: cut at the end of the section where it starts, with a line
   saying so, and still offered (Highlight, Add note). Alternative: split into one highlight per section.
4. **Which blocks take what.** Passages (paragraphs, lists, quotes, callouts, tables, code) take highlights
   and notes; headings and typed blocks' titles or captions (diagram, quiz question, figure caption, sources
   heading) take a note on the block and a bookmark; quiz answers, the title and the lede take nothing.
5. **Text before the first heading.** Refused with "Highlights start at the first section." Closing the gap
   needs a virtual top anchor (say `block_id: "_top"`) in P30's contract.
6. **Overlaps.** Painted one step deeper where two meet; a tap there opens a chooser listing both, each
   opening its own popover.
7. **Turning "Review this" off.** Drawn as **suspend**: the card leaves the reviews and keeps its history
   ("Its card is paused, and keeps its history."); on again resumes it. Deleting the highlight deletes the
   card, said beside Delete and in the undo line. For P30's contract.
8. **The per-book list's home, and bookmarks in the panel.** The Notes sheet lists bookmarks beside
   highlights and notes, in reading order; its foot opens **"All notes in this book →"**, the per-book list
   (its entry on the book page is wave 3's).
9. **A note's format.** Plain text, line breaks kept; no Markdown. Its length is Q17.
10. **Keyboard.** Drawn: with a selection made, H highlights it, N opens a note on it, Escape closes; every
    bar, popover, sheet and list control is a real button in tab order. **Gap:** making a selection by
    keyboard in read-only text needs caret browsing (F7 in Chrome; none in Safari). P30 would need a
    "select this paragraph" key on the focused block, or the CSS Custom Highlight API so the page can show a
    keyboard-made range without the native selection. **Second gap:** a highlight's mark never takes a tab stop, so
    its popover is reached by keyboard only through a margin item, and the margin starts at 64rem and lists
    only highlights with a note. Below 64rem **no** highlight's popover can be reached by keyboard, with or
    without a note (the rows under a heading carry only the section's markers: its note, Text changed, another
    language); from 64rem a highlight **without** a note still cannot. The Notes list goes to any highlight
    and deletes it, but does not open it. Options: a focusable first piece of each highlight, or choosing a
    highlight in the Notes list also opening its popover. Not drawn.

Also for the operator: **11.** the undo line's ten seconds; **12.** whether a hovered highlight should show
the same 2px bronze line that marks a note (drawn: yes, as the "you can open this" cue).

Raised by critique 01 (wave and taste notes, drawn as they stand):

13. **One bronze for "a note" across the wave (C11).** This job's `--an-edge` (the line under a highlight, and the
    tan ground of the note rows) is the same bronze family as 03-diagrams' `--dg-warn`, which draws an author's note
    in a diagram, and as the system's idle status. Version A (drawn): one bronze family means "a note", the reader's
    and the author's. Version B: the reader's marks take a signal the diagram palette does not use, or 03's notes
    move to another tone.
14. **Highlights in a figure caption or a quiz prompt (C12, with Q4).** Drawn: a note and a bookmark, never a
    highlight. 02-figures and 04-quiz assume their text is ordinary text a highlight can cover.
15. **What a passage after an id'd typed block is filed under (C16).** S2 anchors a passage to the nearest
    preceding id'd heading or block, so a highlight in the callout under the diagram is headed "Diagram · One
    FastAPI process, two planes". The alternative labels it by the nearest heading, while still anchoring by S2.
16. **Taste notes left as drawn:** the book list's filter wraps to two rows at 390 (C13); the yellow is a new hue
    beside teal and bronze (C14, with Q2); a highlight across inline code breaks its band at the code chip, which
    keeps its own ground (C15).

Raised by the read-back:

17. **A note's length.** Nothing caps a note today: not S3's contract, not the handoff, not the canvas's field (a
    label's cap is 120). Recommended: **2,000 characters**, the same on the server and in the field, four times
    the drawn 500-character note. From 1,800 the hint line under the field ends with the count ("1,850 / 2,000");
    at the cap the field takes no more and the count reads "2,000 / 2,000 · the most a note holds"; a paste past it
    is cut there, and Save stays enabled (build prompt, *The popover*). Trade-off: a cap keeps a note a margin
    thought that the popover and the lists can show, at the cost of cutting the rare long one; a higher cap (or a
    server-only one) never cuts, but a long note then only scrolls inside its box. Touches P30's contract. Not
    drawn.

## Component and token gaps (drawn as markup, never added to the system)

- **Components (the system ships none):** Selection bar, Highlight popover (with its note editor, the
  Review this switch, the chooser and the two lists), Place bar, Undo line, Margin note, Note row, Notes
  sheet view, the per-book list page with its filter, the Legacy bar control, the paint (`mark.an-m`), the
  markers under a block, the "Bookmarked" tag.
- **Tokens:** the highlight role (`--an-mark`, `--an-mark-2`, `--an-edge`) in light, dark and sepia; the
  pending-selection tint (`color-mix(kb-accent 22%, kb-surface)`); a switch (track and thumb) built from
  `kb-secondary`, `kb-accent` and the signed reader's `--rd-on-accent`; a reading text field (16 px, a 1 px
  `kb-secondary` border, `kb-radius-sm`, the accent focus ring), since the system's inputs are the console's.

## Measured contrast (WCAG ratios, computed from the token values)

| Pair | Light | Dark | Sepia | Needs |
|---|---|---|---|---|
| ink on `--an-mark` (highlighted text) | 11.76 | 8.54 | 8.81 | 4.5 |
| ink on `--an-mark-2` (overlap) | 10.10 | 7.15 | 7.65 | 4.5 |
| accent-strong on `--an-mark` (a highlighted link) | 6.48 | 6.30 | 6.64 | 4.5 |
| accent-strong on `--an-mark-2` | 5.56 | 5.28 | 5.77 | 4.5 |
| `--an-edge` on `--an-mark` (the line along every highlight, 1px, 2px with a note; UI) | 3.71 | 4.47 | 3.90 | 3 |
| `--an-edge` on `--an-mark-2` | 3.19 | 3.74 | 3.39 | 3 |
| accent underline (open) on `--an-mark` | 4.44 | 4.84 | 4.65 | 3 |
| ink on the pending tint | 11.44 | 8.34 | 8.43 | 4.5 |
| accent-strong on the pending tint | 6.30 | 6.15 | 6.36 | 4.5 |
| secondary on surface-sunken (marker label) | 6.23 | 6.78 | 5.96 | 4.5 |
| ink on surface-sunken (marker text) | 13.18 | 11.94 | 10.24 | 4.5 |
| accent-strong on surface ("Bookmarked", "Review this · on") | 8.70 | 9.51 | 8.90 | 4.5 |
| ink on accent-soft (the open margin note) | 12.75 | 8.79 | 9.42 | 4.5 |
| accent-strong on accent-soft (pressed Bookmark, filter) | 7.02 | 6.49 | 7.11 | 4.5 |
| surface on ink (the undo line) | 15.80 | 12.88 | 11.81 | 4.5 |
| revoked ink on surface (Delete) | 7.07 | 7.42 | 7.15 | 4.5 |
| revoked ink on revoked-soft (Delete, hovered) | 5.62 | 5.68 | 6.08 | 4.5 |
| secondary on surface (meta, fine print, list Delete; field border and switch track as UI) | 7.48 | 7.32 | 6.87 | 4.5 |
| accent on surface (switch on, focus ring) | 5.97 | 7.31 | 6.23 | 3 |
| on-accent thumb on accent (switch on) | 5.76 | 8.32 | 7.00 | 3 |
| `--an-mark` against the page (the paint itself; informative) | 1.34 | 1.51 | 1.34 | n/a |

The paint against the page is low by nature (a highlighter), so every highlight carries the bronze line along its
foot (3.19:1 or more on the paint in every theme), a shape that does not depend on colour; it is also a `<mark>`
and listed in the Notes sheet. Canvas-only stand-ins: text 14.25 / 11.83,
label 8.23 / 8.00, dashed border 2.93 (light; canvas chrome, never built) / 4.04 (dark).

## Render log

Instrument: `python3 scripts/workflow.py design-preview 05-annotations --runtime <the handoff's dc-runtime.js>
--click`, a throwaway headless profile; every PNG was read. Two passes on the first draft and two on the
critique pass (passes 3 and 4 below), as the contract allows.

**Pass 1 (all 35 boards).** 36 PNGs, 89 states clicked through, 72 `issue` lines: 61 `layout-shift`, 9
`frame-clip`, 1 `click-error`, 1 `contrast`. Fixed:

- `click-error` on 03 Widths (an invalid `[data-tx=…]` selector): the floating box's anchor key was being
  overwritten by its signature string; the signature now has its own name, so the anchor lookup gets the key.
- `contrast` 1.20:1 on 13 Legacy (dark): the stand-in bar's crumb had a fixed near-black; it now inherits
  the theme's ink.
- `frame-clip` on 06, 07, 08, 09, 10, 11, 12, 13, 14: every Components board resized to its measured content;
  11 Notes sheet (12,414 px tall as one column, over the 8000 px frame limit) relaid with its groups side by
  side.
- Seen on the PNGs, not measured: the overlap chooser's quotes used the browser's default `<mark>` yellow
  (now the highlight token); the standalone popover's note collapsed to 0 px (a scrolling flex child shrank;
  children no longer shrink, and the alone board has a complete default); the list's "·" before "Review
  this · on" ran into the kind; a quote from a code block now sets in mono in the Notes list; the alone
  Selection bar, Place bar and Undo line stretched to the frame (now as wide as their content); a list's
  Delete is secondary until pointed at; a row opened from the sheet now scrolls only the sheet, never the
  page.

**Pass 2 (01, 03, 06–14 and the new parts 28–34).** 19 PNGs, 94 states, 69 `issue`
lines: 68 `layout-shift` (34 on 01, 34 on 03) and 1 `frame-clip` (11 Notes sheet, content 4237 in a
4200 frame). No `click-error`, `contrast`, `target`, `dead-link`, `page-clip`, `same-target` or
`hover-contrast` line. Fixed after the pass, not re-rendered (the two-pass cap):

- 11 Notes sheet's frame set to 5200×4280.
- The alone popover (29) ended at the cap of `min(32rem, 70vh)` of a 520 px frame, cutting "Its note and its
  review card go with it."; on an alone board the popover is now uncapped (the cap stays in the reader).
- The code-quote rule lost to the quote rule's specificity in pass 2's Main; its selector is now the more
  specific one.
- 03 Widths' state bar names the long presets in full ("Markdown document · selecting text", "Notes in
  this book · 100 items") instead of the cut labels.

All three are CSS or label changes; the JS check, a headless mount of all 35 boards and `design-check` pass
after them.

**What remains:** the `layout-shift` lines on 01 and 03 (departure 3, bar rule 1: a preset that lands inside
the chapter scrolls the state bar away, so the header moves by the bar's height; no control resizes).
Main's click cap (48 states) is reached before every control is tried; every state of this job is a preset
in the state bar, so none is out of reach. A refused or caption selection is drawn with its bar but without
the native selection's blue (the canvas cannot make one from a preset); a real drag shows it.

**Pass 3 (critique 01, all 35 boards).** 36 PNGs, 94 states, 70 `issue` lines: 65 `layout-shift` (33 on 01,
32 on 03, all of them the header moving by the bar's height, departure 3; no line says a control resizes, so
C02's line is gone), 4 `frame-clip` and 1 `same-target`. Also checked by hand, in a throwaway headless
browser driven over the same engine (`DesignBrowser`): every preset of every group pressed from the top of
its page at 1440 and 390, read back through `aria-pressed` after 2 s (01: 34 chapter, 5 plain-document,
5 book-list, 2 legacy; 03: 25 reader presets and the book list's and legacy chapter's groups, each page
entered by a click); a delete on the book page; three open-and-close rounds of a margin note's popover by
mouse and by Enter; the widths of Edit note / Save note and Edit label / Save label. Fixed after the pass:

- `frame-clip` on 03 Widths (1389 in 1369, the longer lead), 08 Popover (2800 in 2760), 13 Legacy (985 in
  880, the split paragraph) and 35 Legacy bar (232 in 200): frames and `$preview` set to 1392, 2808, 992
  and 236; the rows below the Pages moved down 23 px to keep the 120 px gap.
- `same-target` on 03 Widths: "rows 'Book', 'The knowledge maintainer guide' of one list all open the same
  state". The "list" was the four frames: the engine reads four alike sibling cells as four rows, and the top
  bar's book link (labelled "Book" at 390, the book's title from 820) in two of them opens the one Book
  page stand-in, as it must, since it is one control drawn four times. Each frame cell now carries its size
  (`rd-cell--phone`, `--ipad`, `--wide`, `--desk`; no style is attached), so the four are no longer read as
  one list. Nothing about the links changed.

Seen on the PNGs: the 1px bronze line along every highlight reads in all three themes and at text sizes 1
and 5 (06); the popover's buttons hold one width in each mode (08); the legacy line and the canvas note read
as two things, the product line in the reader's 13 px meta and the note in the stand-in's grey (13, 35);
the *Another book* preset opens the Tidewater Contents with the "Datums · Original layout" row in reach at
every width (01, 03).

**Pass 4 (critique 01: 03, 08, 13, 35 only).** 4 PNGs, 47 states on 03, 27 `issue` lines, all
`layout-shift` of the header kind (departure 3). No `frame-clip` or `same-target`. Every PNG read.

## Critique pass 01

Mode `critic` (no judge): every must-fix answered.

- **C01** (PopStates clipped, 2798 in 2760): fixed: the frame and `$preview` are 2808 tall; pass 4 measures
  2808 in 2808. The same check caught three more boards on pass 3 (03, 13, 35), all resized (render log).
- **C02** (Edit note 91.8 px becomes Save note 96.9 px): fixed: the note and label buttons in `NotePop.dc.html`
  stack all their labels in one grid cell (`.an-btn-w`, the round's own pattern), the hidden ones
  `visibility: hidden` and `aria-hidden`. Measured: Edit note and Save note both 96.94 px, Edit label and
  Save label both 99.78 px; pass 3 and 4 print no `resizes` line.
- **C03** (no undo line on the book page): fixed: `flow.js` `bookProps()` passes `toast` and `onUndo`, so a
  Delete on the book page shows the undo line on that page ("Highlight deleted.", or what went with it, and Undo).
  Checked at 1440 and 390: 33 → 32 items, Undo → 33. The build prompt names the line on the book page.
- **C04** (focus dropped from the second popover close): fixed: `Reader.dc.html` records the opener at the
  press (`pointerdown`, capture) or on `focusin`, ignoring anything inside the popover and the canvas's own
  strips, instead of reading `document.activeElement` after the popover had mounted and taken focus. Checked:
  focus returns to the margin note (`.an-mi`, 1440) or the diagram's row (`.an-row`, 390) on each of 3 mouse
  and 2 Enter rounds.
- **C05** (Widths' one group moved to other pages): fixed: 03's bar now has one group per page, as 01's; only
  the group of the page on screen shows (the others keep their space, `visibility: hidden`). The reader's
  group holds the 25 reader presets and the display choices; the book list and the legacy chapter are
  entered by a click in any frame and then show their own groups. No preset moves the page.
- **C06** (presets not pressed after landing): fixed: the cause was the reading progress in `sig()`: after a
  preset lands, the reader writes "started" (or "finished" when the chapter's end comes into view, as with
  Editing a note), so the state left the preset's signature. Progress is the signed reader's state and never
  one of this bar's axes (departure 2), so `sig()` no longer reads it. On 03 *한국어 · its own highlights* and *Older version · v1*
  also dropped off because a late scroll during landing hid the chrome; the chrome now settles for 1.5 s after a preset.
  Every preset holds at 1440 and 390 on 01 and 03.
- **C07** (no click reaches the legacy chapter): fixed: a chapter preset, *Another book · Contents, with a
  legacy chapter*, opens a Tidewater chapter with its Contents sheet, where the "Datums" row (Original
  layout) opens the legacy page by a click, as on the signed canvas; its two presets then show and press.
- **C08** (a plain highlight told by colour alone, low confidence): fixed: every highlight carries a 1px line in
  `--an-edge` along its foot (2px with a note or on hover; the open one keeps its accent line), 3.19:1 or more on the paint in every
  theme. Whether the fill alone is enough stays the operator's, under Q2.
- **C09** (14 px between the 13 and 15 px steps): fixed: a note inside the popover's lists is 15 px like every
  note (`.an-box__note--item` no longer sets a size); a code quote in a note row is 13 px mono.
- **C10** (product line mixed with canvas words under the legacy bar): fixed: split in two. "Highlights are not
  available in this document." is its own line in the reader's 13 px meta (`.an-legacy__na`); the
  explanation is a `data-proto="stand-in"` canvas note in the stand-in's grey system type, starting "Canvas
  note ·". The board lead and the build prompt say the same: the button and that line are this job's.
- **C11** (one bronze for "a note" across the wave): a choice for the operator, logged as Q13; drawn as A.
- **C12** (highlights in captions and quiz prompts): a choice for the operator, logged as Q14 with Q4; drawn
  as A.
- **C13, C14, C15** (filter wraps at 390; the yellow as a new hue; the band broken at a code chip): advisory,
  left as drawn, logged together as Q16.
- **C16** (a passage after an id'd block filed under that block): advisory; it follows S2's anchoring
  (departure 4), logged as Q15.

## Read-back

1. **The canvas title:** `canvas.json`'s title is now "Annotations", like the wave's other canvases. Nothing else
   in `canvas.json` changed.
2. **Q10's second keyboard gap:** restated as drawn, in Q10, the build prompt's *By keyboard* and the two focus
   lines that repeat it (*What was designed*; the popover's *Focus*). A mark never takes a tab stop and the
   margin lists only highlights with a note, so below 64rem no highlight's popover is reachable by keyboard, with
   or without a note, and from 64rem one without a note is not. The options and the drawing are unchanged.
3. **"Notes · N … hidden at 0":** the build prompt's *Order* now says only the count " · N" is hidden at 0; the
   button still reads Notes, so the empty Notes view stays one tap away (as `Reader.dc.html` draws it).
4. **A highlight inside a folded callout:** decided and specified in the build prompt's new *A highlight inside a
   folded callout*, with a pointer from both lists' *Choosing a row*. Anchoring ignores the fold. Closed text cannot
   be selected. The paint is hidden with the body, and the signed summary is unchanged. From 64rem the margin
   note anchors to the summary line, and pressing it opens the fold, then the popover. Choosing its row in the
   Notes sheet or the book's list opens the fold and lands on the mark. Closing the fold closes a popover inside it.
   **Specified, not drawn:** the canvas's chapters have no folded callout, and showing it needs new machinery
   (the rail anchored to a summary, a fold opened on landing).
5. **A note's length:** posed as Q17, with a recommended 2,000 characters and what the field shows near it and
   at it. Q9 now points to Q17, and the build prompt names it on the record's `note`, in the popover and in its
   strings. It touches P30's contract. Not drawn: the canvas's field still has no cap.

No board was re-rendered: no `.dc.html` changed in this pass, only `canvas.json`'s title.
