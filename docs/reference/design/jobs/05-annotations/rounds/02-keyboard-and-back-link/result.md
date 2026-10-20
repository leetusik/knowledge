# Result — job `05-annotations`, round `02-keyboard-and-back-link` (P29.S5, driven by P30.S1)

- status: done
- job: 05-annotations
- round: 05-annotations/02-keyboard-and-back-link
- render_loop: done: 3 renders, 3 fixes (presets moved to a one-piece highlight; board 06 reverted to signed; critique pass: focus after a pick in the chooser); self_check=fail on logged lines only (R02-1, R02-2, R02-4, R02-5)
- design_check: design-check: OK -- 1 job(s), 2 round(s), 35 board(s), open rounds: 05-annotations/02-keyboard-and-back-link, 3 warning(s)
- critique_answers: critique-01: fixed 0, rebutted 4 (C01–C04), 1 wave choice left to the orchestrator (C05); plus one self-found keyboard fix
- open_items: C01 = R02-1, C02 = R02-2, C03 = R02-3 (rebutted with measures, the operator's call); C04 (rebutted); C05 (wave choice); R02-4, R02-5, R02-6, R02-7 (pre-existing lines on signed parts, outside this round)

## Summary

Two A5 items drawn; everything else as signed.

- **`annotations` 10, option (a), recommended (Q1):** a highlight's first piece is a tab stop. It takes the system
  ring; Enter or Space opens what a tap there opens; Escape returns focus to it. Every width, with or without a
  note; pointer and touch see nothing new. Presets on 01 and 03. (b) is logged with its trade-off; the
  keyboard-selection gap stays open.
- **`book-page` 7:** from the book page the list's back link reads "‹ Back to the book" and goes to the book-page
  stand-in; from a chapter it is unchanged. Preset: "Opened from the book page".
- **Critique 01:** C01–C04 rebutted with measures (C04: the ring is one joined outline); C01–C03 stay the
  operator's call. Fixed on re-check: a pick in the overlap's chooser now keeps keyboard focus.
- **Departures:** the stand-in's "Notes in this book →"; NotePop's `kbd` prop (both canvas-only).
- **Open:** Q1; C01–C03 (R02-1…3), C05; R02-4…7.

## Build

This round's delta on `rounds/01-annotations/build-prompt.md`. Everything there holds unless replaced here.

### 1. Keyboard reach to a highlight's popover (`annotations` 10, option a)

**Replaces:**
- the second bullet of *By keyboard → Gap*;
- in *The popover → Focus*, the sentence "A highlight's mark, with a note or without, has no tab stop…".

The first gap (making a selection by keyboard needs caret browsing) stays as written.

- **The stop.** Each painted highlight's first piece, in reading order, is its stop. The paint splits a highlight at
  run edges, overlaps and code tokens; the first piece is the one holding the highlight's start offset. It is:
  `<mark class="an-m …" data-an="<ids>" tabindex="0" role="button" aria-haspopup="dialog" aria-describedby="<id>">`.
  - A first piece inside a link (`<a>`) or under the pending tint never takes the stop. The stop moves to the
    highlight's next piece outside the link. A highlight wholly inside a link has no stop: a tap there follows the
    link, as signed, and its margin item and the lists still reach it.
  - Two highlights that start on the same piece share one stop.
  - Only painted highlights take one: anchored, in the language and version on screen. Text changed, another
    language and unanchored marks are reached as signed (rows, margin, lists).
  - The other pieces of a highlight are unchanged (no tabindex, no role).
- **Name and description.**
  - The name is the piece's own words: no `aria-label`, so the text reads in place.
  - `aria-describedby` points at one of three lines the reader renders once, hidden (`display: none`), with ids
    unique per reader:

    | The piece | Line |
    |---|---|
    | one highlight, no note | "Highlight" |
    | one highlight with a note | "Highlight with a note" |
    | two or more highlights | "Highlights overlap here" |

- **Keys on a stop.** Enter or Space opens what a tap on that piece opens: its popover, or the chooser where
  highlights overlap. Space does not scroll the page. H, N and Escape keep their signed behavior.
- **Focus look.** The system ring on `:focus-visible`:
  - `outline: var(--kb-focus-w) solid var(--kb-accent); outline-offset: var(--kb-focus-offset)` (reader.css already
    applies it to every `[tabindex]` in the frame);
  - in forced colours, the same ring in `Highlight`, over the paint's signed 1 px `CanvasText` line;
  - the ring sits on the focused piece only, so a highlight split by inline code or a link shows it on its first
    words;
  - a piece that wraps takes one outline joined across its lines, as Chromium draws an inline's outline (seen at
    390 in light, dark and sepia), never a closed box per line; check the same in iOS WebKit, the operator's iPhone
    and iPad runtime;
  - nothing else changes: at rest, on hover and when open, the paint is as signed;
  - measured (light / dark / sepia; 3:1 needed), the ring against what is around it:
    - the page: 5.97 / 7.31 / 6.23;
    - a code block: 4.98 / 6.77 / 5.41;
    - the Important callout: 4.82 / 4.99 / 4.98;
    - the warning callout: 4.74 / 5.59 / 5.30;
    - `--an-mark`, where pieces meet: 4.44 / 4.84 / 4.65.
- **Opening and closing.**
  - The popover takes focus as signed: the box in view mode, the field in edit mode.
  - On close (Escape, Close, a tap outside), focus returns to the stop that opened it. Record the stop when it is
    focused or pressed, as for every other opener.
  - If the paint was redrawn while the popover was open, find the stop again by its highlight id.
  - A pick in the chooser (Enter or Space on its row, or a tap) swaps the box's content: focus moves into the box
    again, as when it opens, once the box is shown in its new place. A pointer pick shows no ring (`:focus-visible`).
  - A popover opened from the chooser returns focus to the stop that opened the chooser.
  - Deleting the highlight from its popover: as signed.
- **Tab order.** Stops sit in the text's order, among its links. The margin rail and the rows under headings keep
  their signed place. On the canvas's chapter, the article's tab stops go from 41 to 55 (+14), and from 39 to 64 (+25)
  with 30 marks.
- **Pointer and touch: nothing visible changes.**
  - A tap still opens the popover, and a pointer press shows no ring (`:focus-visible`).
  - One difference a pointer reader never sees: focus now rests on the piece after its popover closes. The signed
    text said it "stays where it was".
- **Additions to signed parts** (the table in *Additions to signed parts*):
  - `Prose`, `Callout`, `CodeBlock`, `ProseTable`: the stop's attributes on a highlight's first piece;
  - `Reader`: Enter and Space on a stop, the three hidden descriptions, and the stop as the popover's opener;
  - `NotePop`: after a pick in the chooser, focus goes into the box.

### 2. The per-book list's back link (`book-page` 7)

**Replaces:** *The per-book list → Top bar*, and its "Not drawn here: its entry on the book page".

- **Where the list was opened from** is a property of the list (`from`: `chapter` | `book`).
  - The opening link carries it. Recommended: a `from=book` query parameter, so a reload keeps the right label.
  - Without it, the list assumes a chapter.
- **Opened from the book page** (07-book-page's "Notes in this book →"): the back link reads **"‹ Back to the
  book"** (the `‹` `aria-hidden`, as signed) and returns to that book's page.
- **Opened from a chapter** (the Notes sheet's foot): **"‹ Back to the chapter"**, returning to the chapter at the
  reader's section, as signed.
- Nothing else in the head, the filter or the body changes.

### Strings added

"Back to the book"; "Highlight", "Highlight with a note", "Highlights overlap here" (descriptions, never shown).

### Canvas-only (never build)

- The flow's `kf` state, the `is-kf` class and its rules in `annot.css`, and NotePop's `kbd` prop with `.an-pop.is-kf`.
  These draw the ring a keyboard would draw after a preset, which is pressed with the pointer, and on 03's frames
  that do not hold focus.
- The presets "Keyboard · focus on a highlight", "Keyboard · popover opened with Enter" and "Opened from the book page".
- The book stand-in's "Notes in this book →" button and its copy.
- As before: the state bar (`[data-proto="state-bar"]`) and the foot strip (`[data-proto="screens"]`).

## Intent, one line per Page touched

- **01 · Page — Reader with marks (the flow), `Main.dc.html`.** The operator reading on a Mac, or an iPad or iPhone
  with a keyboard, who wants to open a highlight they can see without the pointer; first seen: the highlight under
  focus with the system ring, and Enter opens its popover where it is.
- **03 · Page — The reader at 390, 820, 1024 and 1440, `Widths.dc.html`.** The same keyboard state at the four
  widths, so the operator can see that a highlight without a note opens below 64rem (no margin) and from 64rem.
- **04 · Page — Notes in this book, `BookNotes.dc.html`.** The reader who came from the book page and wants to go
  back there; first seen: "‹ Back to the book" in the head, where "‹ Back to the chapter" sits when they came from a
  chapter.

## The plan, and its review

- **Q1, recommended: option (a)**, drawn as the one direction. (b) is weighed below.
- **No new look and no new token.** The focus state is the system ring that reader.css already gives every
  `[tabindex]` in the frame.
- **Boards changed:**
  - 01 Main and 03 Widths: the new presets, and the new props wired through;
  - 04 BookNotes: `from`;
  - 05 Elsewhere: the book stand-in's way into the list;
  - 18–21: the paint's markup takes the stop's attributes;
  - 02 Reader and 29 NotePop: keyboard handling, and the canvas-only ring for the presets;
  - `annot.js`, `annot.css`, `flow.js`: the engine, the rules and the presets behind them.

  Nothing else moves. The board list, the titles and `canvas.json` are unchanged.
- **Reviewed against the handoff and the bar.** The first idea was a visible "open" marker after each highlight's last
  word. It reads like any annotation tool, and it would change the signed paint for pointer readers, which the
  handoff rules out. **Revised:** the stop is the highlight's own first piece, invisible until focused, so the only
  new pixel is the ring. The state bar keeps rule 1 (it scrolls away with the page). The bold move stays the signed
  margin notebook.

## Q1 — (a) or (b), weighed (the operator decides)

| | (a) a focusable first piece (drawn) | (b) choosing a highlight in the Notes list opens its popover |
|---|---|---|
| Tab order | One stop per painted highlight, in reading order, among the text's links: +14 on the canvas's chapter, +25 with 30 marks. The Notes list stays the short route to any one. | Unchanged. |
| The phone (no margin) | Works at every width: the stop is in the text, with no margin needed. That includes an iPad or iPhone with a keyboard (Full Keyboard Access, or iPadOS Tab). | Works at every width, in three steps: Contents, then Notes, then the row. The reader leaves the text to open a highlight they are looking at. |
| Screen reader | Met where it is read: its words, "button" (pop-up), then "Highlight" / "Highlight with a note" / "Highlights overlap here". In the rotor's buttons list. | The rows already announce well ("Highlight · …, button"). After the sheet closes, focus jumps into a popover over the text, and Escape has no row to return to (the sheet is closed). It would need the mark to be focusable anyway, or the sheet to reopen. |
| Signed drawing changed | No pixel at rest, on hover or on a tap. Adds the focus ring, and focus returning to the piece. | The row's signed action changes for every reader: a pointer or touch reader would get the popover over the text instead of landing on the open highlight. Limiting it to the keyboard means telling a key press from a tap, which is fragile (VoiceOver's double tap reads as a click with no pointer). |
| v61's measured keyboard check | Clears the click-only line on the highlights' first pieces. Continuation pieces still read as click-only (R02-2). | The check stays as it is: every highlight's paint is a pointer-only control. |

**Recommendation: (a) alone.** It reaches every highlight from where it is read, at every width, and changes nothing a
pointer reader sees. (b) on top of (a) adds no reach a keyboard reader lacks, and costs the signed row behavior.
Neither closes the first gap (making a selection by keyboard).

**Decided as drawn (say so to change):**
- the ring sits on the focused piece only, not on every piece of the highlight;
- Space opens the popover like Enter does;
- an overlap's stop opens the chooser, as a tap there does.

## What was drawn

### Pages

- **01 Main (the flow).** "Reader · a chapter" gains two presets, both on a3 ("Disk is canonical; the database is a
  projection.", no note, Review this on):
  - **Keyboard · focus on a highlight:** the page lands on a3 and its first piece takes focus with the ring;
  - **Keyboard · popover opened with Enter:** a3's popover is open, its box holding focus with the ring; Escape
    returns focus to a3.

  Both are also reached by keyboard alone: Tab through the text, Enter, Escape. "Notes in this book" gains
  **Opened from the book page**, which can also be clicked: "‹ The knowledge maintainer guide" (top bar), then
  "Notes in this book →" on the stand-in. From there, "‹ Back to the book" returns to the stand-in. Theme and text
  size carry across presets, so the ring can be checked in dark and sepia: Display, then the preset again.
- **03 Widths.** The same two keyboard presets in its reader group. At 390, 820, 1024 and 1440 the same highlight
  shows the ring, below 64rem (no margin) and from 64rem. Light, Dark and Sepia sit in the same bar. The book's group
  carries "Opened from the book page".
- **04 BookNotes (alone)** and **05 Elsewhere (alone)** render their signed defaults. The new state is reached on 01
  and 03.

### Components

None added or changed. Keyboard focus is a state no prop forces on a Components board, so it is reached on 01 and 03
(the "Keyboard ·" presets, or Tab), as signed for hover. Board 06 is byte-identical to the signed one.

### States reached only by interaction

- **Tab** through the text on 01 or 03: each highlight's first piece takes the ring in turn, between the links.
- **Enter or Space** on a focused piece opens its popover; on an overlap ("Since P24 … load-bearing"), the chooser.
- **Escape** (or Close) returns focus to the piece.
- **In the chooser**, Tab to a row and Enter: that highlight's box opens with focus in it (its ring), and Escape
  returns focus to the overlap's stop.
- **A pointer press** on a highlight opens it with no ring. Closing it returns focus to the piece, with no ring.

Checked in headless Chrome by a scratch script (Tab, Enter, Escape and the pointer case at 1440, 820 and 390; the
book-page round trip). Every check held; see the render log.

## Data used

The signed seeds, unchanged (`annot.js` → `base()`, `heavy`, `many`). The presets use a3. Nothing personal, no
secrets.

## Departures from the handoff

1. **The book stand-in gained "Notes in this book →"** and names `07-book-page` in its copy, so the round trip can
   be clicked as well as reached by the preset. Canvas-only.
2. **NotePop gained a canvas-only `kbd` prop** (`.an-pop.is-kf`). It shows the ring the popover's box gets when opened
   from the keyboard, after a preset pressed with the pointer.

## Component and token gaps

None new. The highlight's stop is drawn as markup on this job's own paint, which the system does not ship.

## Measured lines left open (each with its evidence)

- **R02-1 · `non-text-contrast` on `mark.an-m` (the stops; blocking).**
  - The tool reads the paint's fill as the stop's boundary: 1.12–1.80:1, the signed highlighter tint.
  - The boundary that identifies a highlight is the bronze line along its foot (signed C08). It is drawn as an inset
    box-shadow, which the tool does not see.
  - That line, measured on all 14 stops on 01 (page, callouts, code block, table; light / dark / sepia): at least
    3.18 / 3.74 / 3.38 against the paint (the overlap's deeper paint included) and 3.95 / 4.56 / 4.17 against the
    surface around it. A text link is identified by its underline the same way, and the tool exempts links. The
    tool's own help names the blind spot: "Not seen: box-shadow or outline boundaries".
  - Changing the line to a border would restyle the signed paint for every reader: on an unpadded inline a border
    sits outside the content box, so every highlight would grow by the line's width.
- **R02-2 · `keyboard` click-only on continuation pieces (blocking).**
  - These are a highlight's pieces after its first: past an inline code chip, a code token, or the overlap's tail.
    The signed paint gives every piece a pointer cursor.
  - What each one opens is reached from its highlight's stop, or by choosing it in the overlap's chooser.
    WCAG 2.1.1 asks for the function, not for every element. Measured on 01 at 1440 and 390 (critique pass 01): for
    each of the five pieces, a click on it and Enter on its highlight's stop open the same box (`delete_rows_not_in`
    and `(seen)` from a4's stop, `201` and ", then hand the push…" from a8's); the overlap's tail (a6) opens from the
    a5/a6 stop's chooser, Tab, Tab, Enter, as a tap on that stop does.
  - Taking the pointer cursor off them would change the signed paint for a mouse reader, and a click there would
    still open the box.
  - A stop per piece would put up to one stop per code token on a single highlight.
- **R02-3 · `target` on the stops.** WCAG 2.5.8's inline exception: a target in a sentence is sized by the line. The
  tool exempts only links (its inline-run rule matches `a[href]` and `[role=link]`). Tapping a highlight is signed as
  it was: the same element and the same box. A 44 px box on a 29.7 px line (390) would reach about 7 px into the
  lines above and below, and take taps from their words and links. The brief's floor ("targets ≥ 44 px below
  40rem") against the inline exception is the operator's call.

## Pre-existing lines on signed parts (outside this round; not changed)

- **R02-4 · the reader's copied parts** (`non-text-contrast` on `rd-btn`, the language switch's option, `rd-scrim`
  inside 03's small frames; `overprint` of the chapter bar at 200% text). These are 01-reader's items in this wave
  (C07 and the 3:1 boundary). The handoff says not to re-sync them here; the build takes them from `01-reader`.
- **R02-5 · this job's signed controls under v61's 3:1 boundary check:** `button.an-row` (the rows under a heading,
  a sunken fill 1.15–1.19:1), and the legacy control and the bar's "Bookmarked" (`rd-btn`, its border). Locked by
  the handoff. They are candidates for the wave's 3:1 boundary decision (01-reader / 06-library) to cover; for the
  orchestrator.
- **R02-6 · `state-bar` on 03 Widths:** a bar inside each of its four frames, as signed. v61 wants one bar above all
  windows. Left as signed under the handoff's lock; changing it touches only 03's chrome.
- **R02-7 · `layout-shift` on presets that land inside the chapter:** the signed round's departure 3 (the page
  scrolls past the state bar). The two new presets do the same.

## Render log

- **Pass 1 (all 35 boards, `--click --contact-sheet --strict`).**
  - 38 PNGs, 94 states, 0 errors, 0 unmounted.
  - Read: Main states 15, 16 (keyboard), 37 (the book stand-in with "Notes in this book →"), 45 (the list opened from
    the book page, "‹ Back to the book", the preset pressed); Widths state 07 (the ring on a3 at all four widths).
  - Main's keyboard presets were still on a8 in this pass: a8's first piece is "Answer" before an inline `201`, so
    the ring sat on one word. Switched to a3, a one-piece highlight, before pass 2.
  - My lead line on 06 wrapped one line more (frame-clip 4446 > 4430). Reverted: 06 is the signed board again.
  - `self_check=fail blocking=non-text-contrast:24,overprint:1,keyboard:2`: R02-1, R02-2, R02-4, R02-5 above.
- **Scratch checks** (headless Chrome, driven through the engine's own server and browser; output in `<scratch>/`,
  outside the record):
  - Main at 1440, 820 and 390: the focus preset puts real focus on a3 (`:focus-visible`, the 2 px accent ring).
    Enter opens the popover with focus in its box; Escape returns focus to a3; Tab goes to the next stop (a4, in the
    code block), then to the callout's summary.
  - A pointer press on a8 opens it with no ring, and Close returns focus to a8 with no ring.
  - The book-page round trip: "Opened from the book page" reads "‹ Back to the book" and is pressed. Back goes to the
    stand-in, where "Book page" is pressed. "Notes in this book →" leads back to the list with the same back link,
    and "All" shows "‹ Back to the chapter".
  - Widths in dark and sepia: the ring is on a3 in all four frames, and the popover's box ring is on all four.
  - No script errors and no missing files.
- **Pass 2 (`--board` Main, Widths, HighlightStates).**
  - 6 PNGs, 94 states, 0 errors.
  - Main state 15: the ring on a3, inside the Important callout. Main 16 and Widths 07 / 08 as in pass 1, now on a3.
    06 is back to 4430 (no frame-clip).
  - `self_check=fail blocking=non-text-contrast:24,overprint:1,keyboard:2`. Every blocking line is R02-1, R02-2,
    R02-4 or R02-5 above.
  - Non-blocking lines left: `target` on the stops (R02-3), `state-bar` on 03 (R02-6), `layout-shift` (R02-7).
  - Main's exploration reaches the 48-state cap. The book-page entry is its state 45 (reached by clicking the
    stand-in's "Notes in this book →"), so the preset reads as the same state.
- **design-check:** OK. Three warnings, none new: 03's `state-bar` (R02-6) and two absolute paths in the signed round's
  `handoff.md` and `critique-01.md`, which this round does not write.
- **Pass 3, critique pass 01 (`--board` Main, Widths, Reader, NotePop, PopStates).**
  - 8 PNGs, 94 states, 0 errors, 0 unmounted. PopStates' sheet reads as before; the change is a focus move, never a
    pixel at rest.
  - `self_check=fail blocking=non-text-contrast:24,overprint:1,keyboard:2`: the same lines as pass 2 (R02-1, R02-2,
    R02-4, R02-5). Main's issue lines are identical to pass 2's. On 03, only the sampled `layout-shift` and
    `state-bar` lines differ (R02-6, R02-7: the click exploration took other paths).
- **Scratch checks, critique pass 01** (headless Chrome, the engine's own server; `<scratch>/cp1/`):
  - the wrapped ring: one joined outline at 390 in light, dark and sepia (`<scratch>/cp1/E-current-390.png`,
    `wrap-390dark.png`, `wrap-390sepia.png`); the critic's own `esc390.png`, enlarged 3x, the same
    (`<scratch>/cp1/critcrop3.png`);
  - each continuation piece against its stop (C02) and the foot line on all 14 stops (C01): see R02-1 and R02-2;
  - the overlap chooser by keyboard, at 390: before the fix, a pick opened the right box but dropped focus to the
    page, so Escape did nothing. After it, focus is in the box with its ring, and Escape returns it to the a5/a6 stop.
    A pointer pick moves focus into the box with no ring (`<scratch>/cp1/pointerpick.png`).
- **design-check:** OK, the same three warnings.

## Critique pass 01

Mode `critic`: nothing held for a judge. Every must-fix answered.

- **C01** (`non-text-contrast` on the stops) · rebutted: measured. The boundary that identifies a highlight is its
  foot line (signed C08). On all 14 stops it measures at least 3.18 / 3.74 / 3.38 against the paint and 3.95 / 4.56 /
  4.17 against the surface around it (light / dark / sepia). The tool reads only a border or the fill, and its help
  says "Not seen: box-shadow or outline boundaries". A border in its place adds the line's width to every highlight,
  a change to the signed paint for every reader that the handoff rules out ("nothing signed changes for a mouse or
  touch reader"). It stays R02-1, the operator's call.
- **C02** (`keyboard` click-only on continuation pieces) · rebutted: measured. For each of the five pieces, a click on
  it and Enter on its highlight's stop open the same box, at 1440 and 390; the overlap's tail opens from the a5/a6
  stop's chooser, as a tap there does. Taking the pointer cursor off them changes the signed paint for a mouse
  reader (the handoff's check), and a click there would still open the box. A stop per piece adds up to one stop
  per code token. It stays R02-2, the operator's call.
- **C03** (`target` on the stops) · rebutted: a signed element. The stop's tap target is the signed highlight's
  (the same element, the same box). A 44 px box on a 29.7 px line reaches about 7 px into the lines around it and
  takes their taps. WCAG 2.5.8 exempts a target in a sentence, and the tool exempts only inline links. The brief's
  44 px floor against that exception is the operator's call (R02-3).
- **C04** (the ring on a wrapped highlight) · rebutted: measured. The ring is one outline joined across the lines,
  not a box per line: the critic's own `esc390.png` enlarged 3x (`<scratch>/cp1/critcrop3.png`) shows a single
  stepped outline with no edge between lines, and the same holds in dark and sepia. Its left edge sits 4 px
  outside the column because the system ring has a 2 px offset and a 2 px width, the same as every focusable
  element in the signed reader. `## Build` now names the joined outline and asks for the same check in iOS WebKit.
- **C05** (wave choice: a 3:1 resting edge for every product control, or only the library's) · not answered here:
  a wave choice for the orchestrator and the operator. The handoff keeps this canvas's copied reader parts unsynced
  (R02-4) and `an-row` signed (R02-5); they follow the wave's answer.
- **Found on re-check, fixed** (no critic id): Enter on an overlap's stop opened the chooser, but a pick there
  dropped keyboard focus to the page, so Escape could not close the box or return to the stop. NotePop now moves
  focus into the box after a pick, once the reader has placed it (`NotePop.dc.html`, `componentDidUpdate`). The
  build line is in `## Build` → *Opening and closing*.
