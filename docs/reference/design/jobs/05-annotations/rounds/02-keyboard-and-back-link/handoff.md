# Handoff — job `05-annotations`, round `02-keyboard-and-back-link` (slice P29.S5, driven by P30.S1)

brief: waves/P30.S1/brief.md

new visual direction: no

critique: critic

This round supersedes the signed `01-annotations` (signed 2026-10-20 on "accept"). The canvas is edited in
place. **Every board and every element stays as signed except the two items below.** No board was edited
by the operator since the signoff (read back on 2026-10-21: every board is byte-identical to the signed
snapshot).

## Scope: the two A5 items for this job

### 1. `annotations` 10: keyboard reach to a highlight's popover

- **The gap**, from the signed round's `result.md` item 10:
  - a highlight's mark never takes a tab stop, so its popover is reached by keyboard only through a
    margin item;
  - the margin starts at 64rem and lists only highlights with a note;
  - so below 64rem **no** highlight's popover is reachable by keyboard, and from 64rem a highlight without
    a note is not;
  - the Notes list goes to any highlight and deletes it, but does not open it.
- **The two options the signed round posed:**
  - (a) a focusable first piece of each highlight, so Tab reaches the mark and Enter opens its popover;
  - (b) choosing a highlight in the Notes list also opens its popover in place.
- **What to draw:** the option you recommend, as one direction (see Q1), at phone, iPad and desktop. Draw
  the focus state and the popover opening from the keyboard, and Escape returning focus to where it came
  from. The other option is logged with its trade-off.
- **Also logged, not required:** the signed round's first keyboard gap (making a selection by keyboard in
  read-only text needs caret browsing). Leave it as logged unless your option also closes it. If it does,
  say so.
- **States to reach:** state-bar presets for "focus on a highlight" (or "Notes list item focused") and
  "popover opened by keyboard", on each interactive Page that shows highlights.
- **Checks:**
  - below 64rem, a highlight without a note opens its popover by keyboard alone;
  - from 64rem, the same holds;
  - focus is visible in each theme, with the system's ring;
  - Escape returns focus;
  - nothing signed changes for a mouse or touch reader.

### 2. `book-page` 7: the per-book list's back link from the book page

- **The change**, from `jobs/07-book-page/rounds/01-book-page/result.md` item 7: when the signed per-book
  list (`BookNotes.dc.html`) is opened from the book page ("Notes in this book →"), its back link reads
  "‹ Back to the book" and returns to the book page. Opened from a chapter, it keeps "‹ Back to the
  chapter" as signed.
- **What to draw:** the list's head in both entries, reachable by a state-bar preset ("opened from the book
  page"). The book page is not on this canvas, so its target is an in-canvas "another job" state that
  names the `07-book-page` surface, as the canvas already does for other jobs (`Elsewhere.dc.html`).
- **Check:** in the book-page entry, the link reads exactly "‹ Back to the book" and goes to that stand-in.
  In the chapter entry, it is unchanged.

## Not this job

- `01-reader` (this wave): C07 and the 3:1 control boundary. This canvas carries copies of the reader's
  parts (`reader.css`, `reader.js`, ReaderTop, ReaderBottom); **do not re-sync them in this round**. The
  build takes the reader's fixes from `01-reader`.
- `06-library` (this wave): the library's control borders.
- Every other annotations item: signed, locked.

## Open questions, posed back

- **Q1.** Option (a) or (b) for keyboard reach, or both? Draw the one you recommend. Weigh in `result.md`:
  - tab-order length in a heavily highlighted chapter;
  - the phone, where there is no margin;
  - screen-reader announcement;
  - how much of the signed drawing changes.

## The required output

- The canvas tree passing `design-check 05-annotations`.
- One `result.md`:
  - the verdict block, with `open_items:`;
  - a `## Summary` of 1 KB or less;
  - a `## Build` that holds only this round's delta on the signed round's build prompt, complete enough to
    build without inventing.
