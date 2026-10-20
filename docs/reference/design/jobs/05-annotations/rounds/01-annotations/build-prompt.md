# Build prompt — annotations in the reader (job `05-annotations`, round `01-annotations`)

**Unsigned draft.** It becomes the contract only when the operator literally signs this round.

This job adds one layer to the signed reader. That layer holds bookmarks, highlights and notes:

- the paint in the text;
- the selection bar;
- the popover;
- the place bar and the undo line;
- the margin;
- the Notes view of the Contents sheet;
- the per-book list;
- the legacy chapter's one control.

The signed reader's own contract (`jobs/01-reader/rounds/02-revise/build-prompt.md`) still holds in full. Nothing
signed moves, is restyled or is dropped. Where this file names a signed part, it says what to **add** to it.

The canvas is `jobs/05-annotations/canvas/project/`. Board numbers below are its titles' numbers.

## Canvas-only (never build)

- **The state bar** (`[data-proto="state-bar"]`) at the top of 01, 03 and 04, and **the foot strip**
  (`[data-proto="screens"]`).
- **The stand-ins** (`data-proto="stand-in"`, dashed grey boxes):
  - the other jobs' screens (05 Elsewhere: book page, library, sign in, legacy reader, external link);
  - the quiz, figure and sources blocks on 14;
  - the signed reader's own diagram stand-in;
  - the legacy reader's bar on 13 and 35, with its caption and its grey canvas note ("Canvas note · the button and
    the line above it are this job's…").

  Only the **button** on the legacy bar and the line **"Highlights are not available in this document."** under it
  are this job's.
- **`annot.js`**, the canvas's engine and seed data. In the product, anchoring and re-anchoring are the server's
  (S3); the page paints what it is given. The rules it encodes (sections, offsets, word snapping, statuses) are
  specified below, and the build follows them.
- **The canvas's sample data:** the seed marks and the invented reader.
- **Component-board scaffolding:** the captions, the frames, `.an-demo`, `.an-board--across`, `.an-cellw`,
  `.an-frame`, `.an-stand*`, `.an-legacy*`, the `.rd-standalone` rules and `.rd-stage--wide`.
- **03 Widths' four frames** are a viewing device. The product is one responsive reader.

## What it is, and where each kind of document stands

| Document | Highlights and notes | Bookmarks |
|---|---|---|
| Native chapter (format ≠ `md`, blocks with S2 ids) | yes | per section (an id'd heading or an id'd typed block), with an optional label |
| Plain Markdown document (`md`, no ids) | no; a selection says "Highlights are not available in this document." | **one per position**: "Bookmark this position" |
| Legacy chapter | no | **one per position**: the same control, on the legacy reader's bar (P29.S6 places it) |
| Signed out | every save action answers with Sign in to save | the same |

## Data the pages need

### Records (S3; P30 owns the API)

```text
highlight   { id, kind: "hl", doc, lang, ver, block_id, quote: { exact, prefix, suffix }, note, review: bool,
              card: "active" | "suspended" | "", snapshot: { text, block_title, chapter_title } }
block note  { id, kind: "bnote", doc, lang, ver, block_id, note, snapshot }
bookmark    { id, kind: "bm", doc, lang, block_id | null, label (≤120 chars), snippet (~140 chars),
              pos?: true, approx?: true, frac?: 0..1 }
```

- **`note`:** plain text, line breaks kept, no Markdown. **Its length cap is open question 17** (recommended: 2,000
  characters, the same on the server and in the field; see the popover). The canvas sets none.
- **`quote`:** `exact` is the snapped selection. `prefix` and `suffix` are up to 32 characters either side, from the
  section's text.
- **A position bookmark** (`pos`) is made in a plain document or a legacy chapter. It holds `frac` (the fraction
  read) and `snippet` (the first text under the top bar, clipped at 140 characters on a word boundary, with "…").
- **A migrated bookmark** (`approx`) comes from an HTML explainer. It holds `frac` and `snippet`, and an optional
  `label`.
- **The per-book list** reads S3's `GET annotations?org=&project=&book=`, orphans included. The chapter's layer uses
  the same records filtered by `doc`: its own language painted, the other languages as markers.

### Sections and offsets: the rule the paint and the server share

- **A section** is an id'd block (an `h2`/`h3`/`h4` with an id, or a typed block with an id: diagram, quiz, figure,
  sources) together with every block after it, up to the next id'd block.
- **A section's text** is its passage containers' text, joined by `"\n"`. The passage containers are:
  - paragraphs;
  - list items;
  - a quote's paragraphs;
  - a callout's title and paragraphs;
  - table cells;
  - a code block, its lines joined by `"\n"`.

  Headings and a typed block's title or caption are containers of kind `head` and `cap`. They take a note or a
  bookmark, never a highlight.
- **Offsets** count the characters of that text. Text that is not the document's is skipped; for example, the
  signed link suffix " · new tab" is marked `data-an-skip`.
- **Word snapping:**
  - a highlight never splits a word, in English or in Korean (an eojeol counts as a word);
  - a word character is `[\p{L}\p{N}_'’-]`;
  - each end extends outward to a word boundary, then leading and trailing spaces are trimmed;
  - a selection that is empty after snapping does nothing.

### Status, for the version and language on screen

| Status | When | Shown as |
|---|---|---|
| anchored | the quote is found in its section; on two hits, the one whose prefix and suffix match best | paint (highlight) or a margin and row marker (block note), and a list item |
| `block` | the section exists, the quote does not | **Text changed**: a marker on the section; never painted |
| `orphan` | the section's id is gone | **Unanchored**: listed at the end of the Notes sheet and in the book's list, the text struck through |
| other | made in another language variant | a marker on the section, "1 highlight in 한국어"; never painted |
| `approx` / `pos` | a position | listed as "Bookmark · approximate" or "Bookmark · position", with "About N% through" |

Nothing is ever deleted or moved automatically.

### Order

- **In the Notes sheet**, items run in reading order: by section, then by offset.
- **Within a section**, the order is the bookmark, then the section's note, then Text changed, then the other
  language, then highlights by offset.
- **A position bookmark** sorts by its fraction.
- **The count** "Notes · N" counts the chapter's items in this language, the other-language items and the
  unanchored ones. At 0 only the count " · N" is hidden: the button still reads **Notes**, so the empty Notes view
  ("Nothing marked in this chapter yet…") stays one tap away.

## Tokens

### One new reader-scoped colour role (proposed; open question 2)

| Token | Light | Dark | Sepia | Use |
|---|---|---|---|---|
| `--an-mark` | `#f5dc8a` | `#4a3c17` | `#e9cc72` | the highlight's paint |
| `--an-mark-2` | `#eccb66` | `#574720` | `#e0bd57` | where two highlights overlap |
| `--an-edge` | `#8a6a2a` (`kb-ink-bronze`) | `#c8a15e` (`kb-ink-bronze-dark`) | `#7d5c1d` | the line along the paint's foot: 1 px on every highlight (so it is never told by colour alone), 2 px when it has a note |

- **The pending selection's tint:** `color-mix(in srgb, var(--kb-accent) 22%, var(--kb-surface))`.
- **Everything else** is the system's `kb-*` or the signed reader's `--rd-*`. The measured ratios are in
  `result.md`; every text pair passes 4.5:1 and every UI pair 3:1 in all three themes.

### Type (nothing new)

| Role | Setting |
|---|---|
| Labels (a mark's kind, a group's title, "Bookmarked") | `--font-mono` 0.6875rem (11 px), 700, `--kb-tracking-label`, uppercase |
| Meta, hints, the bar's message, the margin | 0.8125rem (13 px) |
| Interface text (buttons, notes, list text, the undo line) | 0.9375rem (15 px) |
| Note and label fields | 1rem (16 px), so iOS never zooms |
| Quotes in lists, the popover and the chooser | `--font-reading` (Literata) 0.9375rem |
| Code quotes in lists | `--font-mono` 0.8125rem (13 px) |
| The book list's title | `--font-display`, `calc(var(--rd-fs) * 1.75)`, and `* 2.1` from 40rem |
| A chapter head in the book list | `--font-display` 1.125rem |

### Spacing, radii, elevation, focus

- **Spacing:** `kb-space-xs` .35, `sm` .6, `md` 1, `lg` 1.5, `xl` 2.4 and `2xl` 4rem. Inside the column it is
  multiplied by `--rd-k`, as the signed blocks are.
- **Radii:** `kb-radius` (boxes), `kb-radius-sm` (fields, rows, filter) and `kb-radius-pill` (place bar, undo line).
- **Elevation:** `kb-shadow-raise` on every floating box.
- **Focus:** the system ring (`kb-focus-w` 2 px in `kb-accent`, offset `kb-focus-offset`) on every control. The
  undo line's ring is `kb-surface`.
- **Targets:** at least `kb-tap` (2.75rem, 44 px) on every control at every width.

### Motion

- The switch's track and thumb, and the margin note's background, change over `--rd-ease`.
- Under `prefers-reduced-motion: reduce`, they change at once.
- The place bar fades with the chrome, as the chrome does.

## Placement, per width

The widths are the reader's container (`rd`), as in the signed contract: under 40rem, 40–64rem, and from 64rem.

| Part | Under 40rem (phone) | 40–64rem (iPad portrait) | From 64rem (iPad landscape, Mac) | Adds to |
|---|---|---|---|---|
| Paint | in the text | in the text | in the text | `Prose`, `Callout`, `CodeBlock`, `ProseTable` |
| Selection bar | under the selection, centred on its last line and clamped to the column; 8 px below (28 px on a coarse pointer, clear of the handles); flipped above the selection when there is no room below and there is room above | same | same | `Reader` (the article) |
| Popover | under its anchor, 8 px; 24rem wide, never wider than the column; `max-height: min(32rem, 70vh)`, scrolling inside | same | same | `Reader` |
| A highlight's note | not shown in the text: the edge underline says it exists, and a tap opens it | same | **in the right margin**, beside the highlight's first line, cut at four lines | `Reader` (the rail) |
| Section markers (its note, Text changed, other language) | **rows under the heading or the typed block** | same | in the margin, beside the heading | `Prose` (rows) / `Reader` (rail) |
| "Bookmarked" | a tag in the heading's top margin, right-aligned (no text moves) | same | in the margin, with its label | `Prose` / `Reader` |
| Place bar | the bottom slot, centred, above the chapter bar | same | same | `Reader` (bottom slot) |
| Undo line | the bottom slot, over everything in it | same | same | `Reader` |
| Notes | the Contents sheet, switched from its head (a loose document: "Notes" in the top bar) | same | same | `Reader` (sheet head), `ReaderTop`, `ReaderBottom` |
| Per-book list | a page of its own, in the column | same | same | new |

Exact geometry:

- **The margin rail** sits `kb-space-lg` right of the column. Its width is `min(16rem, the room left before the
  gutter)`.
  - Each margin item's top is its anchor's top minus 4 px, pushed down to stay 8 px clear of the item above.
  - The rail is `role="complementary"`, `aria-label="Notes in the margin"`.
- **The visible band**, used by the selection bar and the popover, runs from 8 px under the top bar to 8 px above
  the chapter bar (64 px reserved), or 8 px from the bottom in a loose document.
- **A popover that opens low** scrolls the page just enough to show it, and never scrolls its anchor out of view.
- **The bottom slot:**
  - it is centred, `bottom: chapter bar height + kb-space-sm + the safe-area inset`;
  - in a loose document it is `kb-space-md` from the bottom;
  - its max width is the frame less two gutters;
  - the undo line sits above sheets and scrims (z 46); the place bar sits under the sheets (z 21).
- **Sign in to save:**
  - from a selection, it is the signed prompt raised, at the selection, at most 30rem wide (480 px);
  - from the place bar, it sits in the bottom slot, `min(30rem, 100% − 2 gutters)` wide.

## The paint

- **Markup:** every highlighted run is a `<mark class="an-m" data-an="<ids>">` around exactly the highlighted
  characters, split where highlights start and end.
- **No padding, no radius, no reflow.** `box-decoration-break: clone`.
- **The variants:**

  | State | Look |
  |---|---|
  | at rest | `--an-mark`, with an inset 1 px line in `--an-edge` along its foot (`box-shadow: inset 0 -1px 0`); the line is the shape that says "highlighted" without colour |
  | overlap | `an-m--2`, the deeper `--an-mark-2` where two or more meet; the 1 px line runs on |
  | has a note | the line at 2 px (`inset 0 -2px 0 var(--an-edge)`) |
  | open (its popover is open, or just reached from a list) | the 2 px line in `kb-accent` |
  | hover | the 2 px `--an-edge` line on any highlight (open question 12) |
  | being selected, not yet saved | `mark.an-pending`, the accent's 22% tint, so it is never mistaken for a highlight |

- **Inside a link,** the text takes `kb-accent-strong` on the paint. The link keeps its underline and still works,
  and a tap on it follows the link rather than opening the highlight.
- **Inside code,** the same paint, on the code's own background.
- **Korean** keeps `word-break: keep-all` unchanged; snapping keeps an eojeol whole.
- **`forced-colors: active`:** a 1 px `CanvasText` outline, with `forced-color-adjust: none`.
- **The text size (1–5)** scales the paint and the markers with the text. Nothing else moves.

### A highlight inside a folded callout (specified, not drawn)

The signed prose kit folds a callout written `[!type]-` (S2) into a `<details>`. The canvas's chapters have none,
and showing this would need new machinery (a rail item anchored to a summary, a fold opened on landing), so it is
specified here only.

- **Anchoring:** a folded callout is a callout. Its title and paragraphs are passage containers whether the fold is
  open or closed, and no offset depends on the fold.
- **Making one:** text inside a closed fold cannot be selected. The reader opens the fold (the signed summary)
  first; inside an open fold everything is as in any callout.
- **Paint:** the marks are always in the body's markup. While the fold is closed they are not seen, and the signed
  summary does not change: no marker and no count are added to it. The Notes sheet and the book's list still list
  the highlight.
- **Its margin note (from 64rem):** while the fold is closed the mark has no box, so the margin item anchors to the
  fold's summary line (its top is the summary's top minus 4 px, in the rail's usual order). Pressing it opens the
  fold, then opens the highlight's popover at the mark. When the fold opens or closes, the rail lays out again, as
  on any reflow. Below 64rem nothing shows on a closed fold.
- **Choosing its row** (the Notes sheet or the book's list): landing opens the fold (`open` on the `<details>`),
  then lands on the mark 32 px under the top bar and shows it open, as any row does. The fold stays open until the
  reader closes it; this job does not save a fold's state.
- **Closing the fold** while a popover on a highlight inside it is open closes the popover, and focus goes to the
  summary.

## The selection flow

### Classifying a selection (all inputs)

Read the selection's start and end containers.

| Where it starts | Result | The bar shows |
|---|---|---|
| A passage container in a section of a native chapter | **passage** | Highlight · Add note |
| The same, but it ends in another section (or past the section's last passage) | **passage, cut** at the end of the section it started in | "Highlights stay inside one section, so this one stops at the end of **{section}**." then Highlight · Add note |
| A heading, or a typed block's title or caption | **block** (that section) | "{Section \| Diagram \| Quiz \| Figure \| Sources} · **{title}**" then Add note · Bookmark / Bookmarked |
| The chapter's title or lede, or text before the first id'd heading | **refused** | "Highlights start at the first section." (open question 5) |
| Anywhere in a plain Markdown document | **none** | "Highlights are not available in this document." then Bookmark this position / Bookmarked here |
| Inside the bar, the popover, the margin, the rows, the chapter end, or a canvas-only strip | ignored | — |

### With a mouse (fine pointer)

- On `mouseup`, wait 10 ms, then read and classify the selection.
- **A passage:**
  - the native selection is replaced by the pending paint, so the range stays visible while focus moves to the bar;
  - the bar opens under it.
- **A block, refused or none:** the native selection stays and the bar opens.
- **A click outside** the bar and the popover closes them. A click on a highlight opens its popover. A click on
  text otherwise toggles the chrome (signed).

### On touch (coarse pointer)

- **Selecting:**
  - a long press makes the native selection;
  - classify on `selectionchange`, debounced 350 ms, and again on `touchend`;
  - the bar opens 28 px under the selection's last line, clear of the handles and of Safari's own menu (which sits
    above a selection);
  - the reader can keep dragging the handles and the bar follows.
- **Highlight** (or Add note) turns the selection into the highlight (or the pending paint) and removes the native
  selection.
- **The canvas difference:** the canvas clears the native selection on `touchend` for a passage, as with a mouse.
  The product keeps it until an action is pressed, so the handles stay usable.
- **A tap on a highlight** opens its popover. **A tap anywhere else** closes an open bar or popover first, and only
  the next tap toggles the chrome.

### By keyboard

- With a selection made (by any means), **H** highlights it and **N** opens a note on it, for a passage only.
- **Escape** closes the popover, else the bar or the sign-in prompt, and clears the selection.
- **The keys are inactive** while focus is in a field, while a sheet is open, or with a modifier held.
- **The bar** is `role="toolbar"`, labelled "Selected text", or "This section" / "This diagram" / "This quiz" /
  "This figure" / "This sources" for a block.
- **Every bar, popover, sheet and list control** is a real `<button>` or `<a>` in tab order.
- **Gap (open question 10):**
  - making a selection by keyboard in read-only text needs caret browsing (F7 in Chrome; none in Safari);
  - a highlight's mark never takes a tab stop, so its popover is reached by keyboard only through a margin item;
    the margin starts at 64rem and lists only highlights with a note. Below 64rem **no** highlight's popover can be
    reached by keyboard, with or without a note (the rows under a heading carry only the section's markers: its
    note, Text changed, another language); from 64rem a highlight **without** a note still cannot. The Notes
    list reaches any highlight and can delete it, but cannot open or edit it.

  The canvas draws no fix. Two options are put to the operator: a "select this paragraph" key on the focused block,
  and a focusable first piece of each highlight.

### What each action does

| Action | From | Result |
|---|---|---|
| Highlight | bar (passage), **H** | saves a highlight (no note, Review this off); the bar closes; **its popover opens** (view), so a note or Review this is one tap away |
| Add note | bar (passage), **N** | the popover opens as a new note ("New highlight"); **Save note** saves the highlight with the note (an empty note saves the highlight alone); **Cancel** closes the editor and returns to the bar |
| Add note | bar (block), place bar | opens that section's note: the existing one in view, or a new one in edit. From the place bar the page first scrolls to the section's heading, so the reader sees what the note is about |
| Bookmark | bar (block), place bar | toggles that section's bookmark; the button reads "Bookmarked" and is pressed; no popover; removing it shows the undo line |
| Bookmark this position | bar (none), place bar (loose), legacy bar | toggles a position bookmark at the current fraction (an existing one within ±2% is removed instead) |
| Any save | signed out | Sign in to save, `what` "highlights and notes" or "bookmarks", at the selection or in the bottom slot |

## The popover (`NotePop`, board 08; one instance on board 29)

- **Role:** `role="dialog"` with the label below.
- **Focus:**
  - in view mode, focus goes to the box (`tabindex="-1"`);
  - in edit mode, focus goes to the field, with the caret at the end;
  - on close, focus returns to the control that opened it (a margin note, a row under a block, a list row). Record
    that control when it is pressed or focused, never by reading the focused element after the popover has taken
    focus. A highlight's mark, with a note or without, has no tab stop, so after one is clicked focus stays where it was
    (open question 10).
- **Escape:** in a field it cancels the edit; elsewhere it closes the popover.
- **Order, top to bottom:**
  1. the head: the kind (mono label) and **Close**;
  2. where: the section's label;
  3. the body;
  4. a rule;
  5. Review this (highlights only);
  6. a rule;
  7. delete, with the line that says what goes with it.

| Mode | Kind label / dialog label | Body |
|---|---|---|
| A highlight, no note | "Highlight" / "Highlight" | **Add note** (secondary button) |
| A highlight with a note | "Highlight · note" / "Highlight" | the note (pre-wrap, line breaks kept, scrolling past 15rem), then **Edit note** |
| Writing a note (new or edit) | "New highlight" (dialog "Note on a new highlight") or "Highlight · note" | label "Note on this highlight" (new) or "Note"; a textarea at 16 px, 6.5–16rem tall, resizable, with placeholder "What do you want to remember about this?"; the hint "⌘ Enter saves · Esc cancels · line breaks are kept" (hidden on a coarse pointer); **Save note** (primary), **Cancel**, and on an existing note **Delete note** at the end |
| A note on a section or diagram | "Note on this section" / "Note on this diagram" (same dialog label) | the note and **Edit note**; editing labels the field "Note on this section/diagram"; delete reads **Delete note**, with no line under it |
| Two or more overlap | "2 highlights" / "Choose a highlight" | "They overlap here. Pick one to open it." then one row per highlight (its quote painted, up to 90 characters; "Highlight" or "Highlight · note"); each opens its own popover |
| Text changed | "Text changed" / "Text changed" | "You made this/these on {Language} v{n}. This version no longer says it/them, so it is/they are not painted here." then each quote (reading face, not painted), its note, and **Delete**; then **Read this section in v{n} →** |
| Other language | "{n} highlight(s) in {endonym}" (dialog the same) | "Highlights belong to their language, so this one is/these are not painted on the {Language} text." then each quote and note, and **Delete**; then **Read this section in {endonym} →** |
| A bookmark | "Bookmark" / "Bookmark" | the label, or "No label. A label says why you kept this place, in the Notes list and the book's list."; **Edit label** or **Add label**, then **Remove bookmark** at the end |
| Writing a label | the same | "Label", a one-line field at 16 px with placeholder "Why this place?" (max 120 characters); **Save label** (primary), **Cancel**; Enter saves and Escape cancels |

- **A note's length (open question 17; not drawn, the canvas's field has no cap).** Recommended: 2,000 characters,
  four times the drawn 500-character note.
  - Near it: from 1,800 characters the hint line under the field ends with the count, "1,850 / 2,000", in the 13 px
    meta step. On a coarse pointer, where the hint is hidden, the hint's row is kept for the count, so nothing moves
    when it appears.
  - At it: the field takes no more (`maxlength`), and the count reads "2,000 / 2,000 · the most a note holds". A
    paste that runs past it is cut at 2,000, and the same line shows. **Save note** stays enabled.
- **Buttons that change in place keep one width.** Add note, Edit note and Save note sit in the same place across
  view and edit, as do Add label, Edit label and Save label: each button stacks all three labels in one grid cell
  (the two not shown are `visibility: hidden` and `aria-hidden`), so the button never resizes and nothing beside it
  moves. Save note and Save label are primary; the others secondary.
- **Review this:**
  - a `role="switch"` with `aria-checked`, its state said in words: "Review this · **On** / **Off**";
  - the line under it reads:

    | State | Line |
    |---|---|
    | On | "It is a card in your reviews." |
    | Off, after being on | "Its card is paused, and keeps its history." |
    | Never on | "Turn on to make it a review card." |

  - Default off. On makes the card (or resumes it); off **suspends** it (open question 7);
  - block notes and bookmarks have no switch.
- **Delete highlight:** in `kb-status-revoked-ink`, with the line beside it or under it:

  | What goes with the highlight | Line |
  |---|---|
  | its note and its review card | "Its note and its review card go with it." |
  | its review card | "Its review card goes with it." |
  | its note | "Its note goes with it." |
  | nothing else | none |

  Pressing it deletes at once and shows the undo line.
- **Saving notes:**
  - saving an empty note on a highlight removes the note and keeps the highlight;
  - saving an empty section note deletes it;
  - **⌘ Enter** (Ctrl Enter) saves.
- **Lists in the popover** (Text changed, other language): each Delete has
  `aria-label="Delete highlight: {quote, ≤60 characters}"`.

## The undo line (`Toast`, board 09; one instance on board 31)

- **Shape:** `role="status"`, a pill in `kb-ink` with `kb-surface` text, and **Undo**.
- **Timing:**
  - it stays **10 seconds** (open question 11);
  - a new deletion replaces it;
  - a timer only clears the line that started it.
- **The text:**

  | What was deleted | Text |
  |---|---|
  | a highlight with a card | "Highlight deleted, and its review card with it." |
  | a highlight with a note and a card | "Highlight, note and review card deleted." |
  | a highlight with a note | "Highlight and its note deleted." |
  | a highlight | "Highlight deleted." |
  | a note (a highlight's note, or a section's note) | "Note deleted." |
  | a bookmark | "Bookmark removed." |

- **Undo** puts back exactly what went, in its place: the highlight, its note, and its review card with its
  history. How it is restored (a delayed delete or a restore) is P30's contract.
- **On the per-book list page**, a delete made there shows the line on that page, `kb-space-md` from the bottom.

## The place bar (`PlaceBar`, board 09; one instance on board 30)

- **Shape:** a pill in the bottom slot.
- **In a native chapter:** the current section's label (bold ink, cut with an ellipsis), a separator, **Add note**,
  and **Bookmark**/**Bookmarked**.
  - The label is the heading's text, or "Diagram · {title}" (likewise Quiz, Figure and Sources).
  - Bookmark is `aria-pressed`. Pressed, it is `kb-accent-soft` with `kb-accent-strong` text.
  - The two labels share one grid cell, so the button never changes width.
  - The group is `aria-label="The section you are reading"`.
- **In a plain document:** **Bookmark this position** / **Bookmarked here**, in a group labelled "This position".
- **The current section** is the last id'd block whose top is above the line 24 px under the top bar.
- **It rides with the chrome:** it hides when the chrome hides (scrolling down), and returns with it (scrolling up,
  or a tap on the text).
- **It is not shown** while any of these holds:
  - a sheet is open;
  - the signed resume pill shows;
  - a selection, a popover, the undo line or a sign-in prompt is up;
  - the chapter's end has come into view;
  - in a native chapter, the reader is above the first id'd heading.

## The margin, the rows and the tag (boards 10 and 06; one instance on board 32)

- **Margin items** (from 64rem) are `<button class="an-mi">`:
  - a mono label ("Note", "Note on this section", "Note on this diagram", "Bookmarked", "Text changed"), or none for
    the other language;
  - then the text, cut at 4 lines.
- **What each item says:**

  | Item | Text |
  |---|---|
  | Note | the note |
  | Note on this section / diagram | the note |
  | Bookmarked | the label, if any; the label is in `kb-accent-strong` |
  | Text changed | "{n} highlight(s) you made no longer match(es) the text" |
  | Other language | "{n} highlight(s) in {endonym}", the endonym in its own `lang` |

- **Margin item states:**
  - hover: `kb-surface-sunken`;
  - the open one: `aria-current="true"`, on `kb-accent-soft`.

  Pressing one opens its popover.
- **Rows** (under 64rem) are `<button class="an-row">` under the heading or the typed block:
  - a sunken fill, at least 44 px tall;
  - the same label and text, cut at 2 lines;
  - the language's endonym in `kb-accent-strong` semibold;
  - they cover the section's note, Text changed and the other language.

  Pressing one opens its popover.
- **"Bookmarked" tag** (under 64rem):
  - mono 11 px in `kb-accent-strong`, right-aligned in the heading's top margin;
  - `aria-hidden`, because the place bar's pressed Bookmark and the lists carry the state;
  - nothing moves when it appears.
- **Typed blocks:**
  - a typed block with an id (diagram, quiz, figure, sources) is a section; its title or caption takes a note and a
    bookmark;
  - its marker and tag sit with it as with a heading;
  - quiz answers are never highlighted;
  - where the blocks are drawn is the block jobs' (`02-figures`, `03-diagrams`, `04-quiz`).

## The Notes sheet (`NotesPanel`, board 11; one instance on board 34)

- **Where:**
  - the signed **Contents sheet** (left, modal, with the signed scrim, focus and Escape, §15) gains a switch in its
    head:

    | View | Sheet head |
    |---|---|
    | Contents | `Contents` (h2), then a quiet **Notes · N** button, then **Close** |
    | Notes | a quiet **Contents** button, then `Notes · N` (h2), then **Close** |

  - the chapter bar's **Contents** opens the sheet on Contents (Notes is one tap away, in its head), closes it when
    either view is open, and reads `aria-expanded="true"` while either view is open;
  - a plain document has no Contents sheet: its top bar gains **Notes** (`aria-haspopup="dialog"`,
    `aria-expanded`), which opens the same sheet with no Contents switch.
- **The sheet is labelled "Notes".** The group is labelled "In this chapter" or "In this document".
- **The groups, in order:**
  1. **The chapter's items:** the lead "In reading order. Choose one to go to its place." then the rows.
  2. **In {endonym}** (other languages): "Highlights belong to their language, so these are not painted here. Choose
     one to read it in {endonym}." Choosing one opens this chapter in that language, at the section.
  3. **Unanchored:** "The text these were made on is no longer in this chapter. They stay until you delete them."
     The rows are not links; they can only be deleted.
- **The foot:** "All notes in this book →", which opens the per-book list. It is not shown in a loose document.
- **Empty:**
  - a chapter: "Nothing marked in this chapter yet: select a passage to highlight it, or bookmark a section from the
    bar at the bottom.";
  - a document: "Nothing marked in this document yet: use Bookmark this position to keep a place.".
- **Signed out:** the signed **Sign in to save** with `what` "highlights and notes", `place` "chapter" or
  "document". Its "Not now" closes the sheet.
- **Many items** (30 in a chapter): the sheet body scrolls inside, and the reading place underneath is kept.
- **Choosing a row:**
  - the sheet closes and the page lands on the mark, 32 px under the top bar, leaving room below;
  - a highlight is shown open (the accent underline);
  - a Text changed item opens its popover at the section;
  - a position or approximate bookmark lands at its fraction;
  - a highlight inside a closed folded callout opens the fold first (see *A highlight inside a folded callout*);
  - opening a label for editing, or deleting, scrolls only the sheet, never the page.

## A row in a list (`NoteItem`, board 12; one instance on board 33)

- **Layout:** a grid of `[the row's button | its actions]`, divided by `kb-border`.
- **The row's button**, top to bottom:
  1. **Kind** (mono label): "Highlight", "Highlight · note", "Note on this section", "Note on this diagram",
     "Bookmark", "Bookmark · approximate", "Bookmark · position", "Text changed" or "Unanchored". A highlight with
     Review this on adds " · Review this · on" in `kb-accent-strong`.
  2. **Main**, one of:
     - the quote, in the reading face and painted with `--an-mark` (mono, unpainted, for a quote from code);
     - for Text changed, the quote unpainted in the reading face;
     - for Unanchored, the snapshot's text struck through (`<del>`) in `kb-secondary`;
     - for a bookmark, its label (semibold), or its snippet (a position), or its section's title.
  3. **The note**, pre-line and cut at 3 lines.
  4. **Meta** in `kb-secondary`, with tabular figures:

     | Item | Meta |
     |---|---|
     | Anchored highlight or note | the section's label |
     | Bookmark with a label | the section's label |
     | Text changed | "Made on {Language} v{n} · this version no longer says it" |
     | Unanchored | "Was in “{block title}” · {chapter title}"; in the book's list, without the chapter |
     | Approximate | "About {n}% through · placed from the HTML version" |
     | Position | "About {n}% through" |

     In the book's list the meta starts with the language's endonym, in semibold ink.
- **Hover:** the main line underlines.
- **Actions** (right, stacked):
  - **Delete**, or **Remove** for a bookmark: quiet, in `kb-secondary`, turning revoked ink on the revoked tint when
    pointed at. Its `aria-label` is "Delete highlight: …", "Delete note: …" or "Remove bookmark: …", up to 60
    characters;
  - a bookmark also has **Add label** / **Edit label**.
- **Label editing inline:** the row opens "Label" (a 16 px field) with **Save label** and **Cancel** under it.
  Enter saves, Escape cancels, and focus goes to the field.

## The per-book list (`BookNotes`, board 04; reached from the Notes sheet's foot)

- **Top bar:** sticky. The logo links to the library; "‹ Back to the chapter" returns to the chapter at the reader's
  section.
- **Head:** the book's title (`kb-secondary`), then h1 "Notes in this book", then the count line, for example
  "26 items in 5 chapters · 2 approximate · 2 unanchored". The noun follows the filter: "items", "bookmarks", or
  "highlights and notes".
- **Filter:** a `role="group"` labelled "Show", of three `aria-pressed` buttons, each with its count:
  **All** N · **Bookmarks** N · **Highlights and notes** N.
  - Pressed: `kb-accent-soft` with `kb-accent-strong` text.
  - The head and filter never move between filter states; only the values change.
- **Body:** by chapter in book order, each headed "Chapter {n}" (mono label) and the chapter's title (h2, in its own
  language). Each language's marks follow in reading order. Rows are as above.
- **Choosing a row** opens that chapter, in the row's language, at the mark (opening a folded callout around it,
  as from the Notes sheet).
- **Empty states:**

  | Filter | Text |
  |---|---|
  | All | "Nothing marked in this book yet: highlights, notes and bookmarks you make in its chapters gather here." |
  | Bookmarks | "No bookmarks in this book yet: use Bookmark in the bar below a chapter’s text." |
  | Highlights and notes | "No highlights or notes in this book yet: select a passage in a chapter to highlight it." |

- **100 items on a phone:** the page scrolls, with no sideways scroll; the rows wrap.
- **Not drawn here:**
  - the page's URL, which the build plan names;
  - its entry on the book page, which is wave 3's.

## Plain Markdown, legacy and signed out

- **A plain document:**
  - no paint and no highlight action;
  - any selection gets "Highlights are not available in this document." with Bookmark this position;
  - the place bar is the position bookmark;
  - the top bar has **Notes**.
- **A legacy chapter:** one control on the legacy reader's bar, **Bookmark this position** / **Bookmarked here**:
  - a secondary button, at least 44 px tall, `aria-pressed`, the two labels sharing one cell;
  - it keeps the reader's fraction and snippet, as in a plain document;
  - under the bar, the line **"Highlights are not available in this document."** in the interface's 13 px meta step
    (`--font-body` 0.8125rem, `kb-secondary`), so a reader looking for highlights is told without making a selection;
  - where the button and the line sit in that bar is P29.S6's;
  - if the legacy reader can observe selections, a selection there gets the plain document's bar ("Highlights are
    not available in this document.").
- **Signed out:**
  - every save answers with the **signed Sign in to save, unchanged but for `what`**: "bookmarks", or "highlights
    and notes";
  - `place` is "chapter", or "document" in a loose document;
  - it opens at the selection (from the bar) or in the bottom slot (from the place bar);
  - **Sign in** goes to sign-in and comes back to the same chapter and section (signed §12);
  - **Not now** closes it and clears the selection;
  - no control is dead.

## Additions to signed parts (nothing signed moves or is restyled)

| Part | Add |
|---|---|
| `Reader` | selection handling on the article (`mouseup`, `touchend`, `selectionchange`); a tap on a mark opens its popover; the floating box (bar, popover, raised Sign in to save); the margin rail from 64rem; the bottom slot's place bar and undo line, both yielding to the signed resume pill; the Contents sheet's switch and the Notes view; keys H, N and Escape; focus return from the popover |
| `Prose` | `<mark>` paint on runs; `data-tx` / `data-sec` / `data-tk` / `data-base` on each text container (or the product's equivalent); the rows under a heading or typed block below 64rem; the "Bookmarked" tag in the heading's top margin |
| `Callout`, `CodeBlock`, `ProseTable` | the same paint and container data; code lines carry their offset |
| `ReaderTop` | **Notes**, shown only for a plain document (`notes` prop) |
| `ReaderBottom` | **Contents** reads as open (`aria-expanded`) while either view of its sheet is open |
| `SignInToSave` | nothing; used with `what` = "bookmarks" or "highlights and notes" |

## Every string this job wrote

**Selection bar:**

- Highlight
- Add note
- Bookmark / Bookmarked
- Bookmark this position / Bookmarked here
- Highlights are not available in this document.
- Highlights start at the first section.
- Highlights stay inside one section, so this one stops at the end of {section}.
- Section · {title} / Diagram · {title} / Quiz · {question} / Figure · {caption} / Sources · {heading}
- toolbar labels: Selected text; This section / This diagram / This quiz / This figure / This sources

**Popover:**

- Close; Add note; Edit note; Save note; Cancel; Delete note; Delete highlight; Delete
- Kinds: Highlight; Highlight · note; New highlight; Note on this section; Note on this diagram; {n} highlights;
  Text changed; {n} highlight(s) in {endonym}; Bookmark
- Dialog labels: Note on a new highlight; Choose a highlight
- Field labels: Note on this highlight; Note
- Placeholder: What do you want to remember about this?
- Editor hint: ⌘ Enter saves · Esc cancels · line breaks are kept
- Proposed with open question 17, not drawn: "{n} / 2,000"; "2,000 / 2,000 · the most a note holds"
- Review this · On / Off
  - It is a card in your reviews.
  - Its card is paused, and keeps its history.
  - Turn on to make it a review card.
- What goes with a delete:
  - Its note and its review card go with it.
  - Its review card goes with it.
  - Its note goes with it.
- Overlap: They overlap here. Pick one to open it.
- Text changed:
  - You made this/these on {Language} v{n}. This version no longer says it/them, so it is/they are not painted here.
  - Read this section in v{n} →
- Other language:
  - Highlights belong to their language, so this one is/these are not painted on the {Language} text.
  - Read this section in {endonym} →
- Bookmark:
  - No label. A label says why you kept this place, in the Notes list and the book's list.
  - Label; Why this place?; Save label; Add label / Edit label; Remove bookmark
- aria: Delete highlight: {quote}

**Place bar:**

- {section label}; Add note; Bookmark / Bookmarked; Bookmark this position / Bookmarked here
- group labels: The section you are reading; This position

**Undo line:**

- Highlight deleted, and its review card with it.
- Highlight, note and review card deleted.
- Highlight and its note deleted.
- Highlight deleted.
- Note deleted.
- Bookmark removed.
- Undo

**Margin and rows:**

- Note; Note on this section; Note on this diagram; Bookmarked; Text changed
- {n} highlight(s) you made no longer match(es) the text
- {n} highlight(s) in {endonym}
- rail label: Notes in the margin

**Contents and Notes sheet:**

- Notes · {n}; Contents; Notes; Close
- In reading order. Choose one to go to its place.
- In {endonym}
- Highlights belong to their language, so these are not painted here. Choose one to read it in {endonym}.
- Unanchored
- The text these were made on is no longer in this chapter. They stay until you delete them.
- All notes in this book →
- Nothing marked in this chapter yet: select a passage to highlight it, or bookmark a section from the bar at the
  bottom.
- Nothing marked in this document yet: use Bookmark this position to keep a place.
- group labels: In this chapter; In this document

**List rows:**

- Kinds: Highlight; Highlight · note; Note on this section; Note on this diagram; Bookmark; Bookmark · approximate;
  Bookmark · position; Text changed; Unanchored; · Review this · on
- Metas:
  - Made on {Language} v{n} · this version no longer says it
  - Was in “{block}” · {chapter}
  - About {n}% through · placed from the HTML version
  - About {n}% through
- Buttons: Delete; Remove; Add label; Edit label; Label; Save label; Cancel
- aria: Delete highlight: …; Delete note: …; Remove bookmark: …

**Per-book list:**

- ‹ Back to the chapter
- Notes in this book
- {n} items / bookmarks / highlights and notes in {n} chapter(s) · {n} approximate · {n} unanchored
- Show; All; Bookmarks; Highlights and notes; Chapter {n}
- Nothing marked in this book yet: highlights, notes and bookmarks you make in its chapters gather here.
- No bookmarks in this book yet: use Bookmark in the bar below a chapter’s text.
- No highlights or notes in this book yet: select a passage in a chapter to highlight it.

**Top bar (plain document):** Notes

**Sign in to save:** the signed text, with `what` = "bookmarks" / "highlights and notes".

**Counts** use "1 item" / "N items". The other-language and Text changed markers name "highlight(s)", "note(s)",
or "highlights and notes" when mixed. Language names are endonyms in their own script and `lang` (English, 한국어).

## Open questions this build waits on

Q1–Q17 in `result.md`. Q2 (the highlight colour), Q5 (text before the first heading), Q7 (Review this off =
suspend), Q10 (keyboard) and Q17 (a note's length) touch P30's contract; Q13 and Q14 are wave choices shared
with 03-diagrams, 02-figures and 04-quiz.
