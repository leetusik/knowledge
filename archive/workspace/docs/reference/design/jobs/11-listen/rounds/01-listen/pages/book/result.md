status: done
pass: page book
job: 11-listen
round: 01-listen
frame_gaps:
- book-G1 the dock's track on the book landing (F7 names only its bottom offset): below 64rem the layout column's two edges, after Contents; from 64rem the side column's (24rem), in that column's second grid row, so it never rides over the head, Continue or the Contents list. Drawn.
- book-G2 a chapter's readiness word while the daily limit holds its making (F11 has Ready / Preparing… / Not prepared yet): the note's state word, "Daily limit". Drawn.
- book-G3 a chapter's audio phrase beside the landing row's signed reading word (F11 is written for the Contents sheet, where audio is the context): on the landing it is its own item in the meta line, after the reading word and apart from it by the meta's gap, and led by "Audio" so it never reads as reading time or readiness: "Audio 38 min", "Audio preparing… · part 2 of 9", "Audio not prepared yet", "Audio held by the daily limit"; the playing chapter leads with Playing / Paused in the rd-ch__now style. Drawn (revised by critique C02; was one span joined with " · ").
- book-G6 a book's first step before chapter 1's first part is ready (F9 gives "Part 1 of 12. You can play once this part is ready." for a document only): after Starting…, the note reads Preparing… "Chapter 1 of 5 · about 2 h left." with its line at the start, the dock "Preparing… · part 1 of 11" under chapter 1's title, nothing playing; once the first part is ready, F10's ready note ("The first 3 min are ready to play; the rest is still preparing." + Play); Play → Chapter 1 · 0:00. The frame's ListenNote has no book sentence for this step; the join may add "Chapter 1 of 5. You can play once its first part is ready." Drawn (critique C01).
- book-G4 the guide's per-chapter part counts are not in F18: the guide's preparing chapter reads "Preparing…" with no part count; changple5's chapter 7 keeps F18's "part 2 of 9". Drawn.
- book-G5 changple5's time left preparing is not in F18: "about 3 h 30 min" (chapters 7–20 hold 7 h 26 min of audio; half that, rounded). Made up, logged.
events:
- on-open-reader { ch, listen }: Listen (ch 1, playing, after "Starting…"), Continue listening (ch 4 · 12:30), Start over and the note's Play (ch 1 · 0:00); also a chapter row (its ch) and Continue reading (ch 3), each with the current Listen unchanged (null when none)
- on-open-player { listen }: the dock's open chevron, when a Listen lives
- on-listen { listen }: every change of the Listen on this page (a preset, the dock's play and pause) when controlled
component_gaps:
- book: non-text-contrast (blocking, WCAG 1.4.11): the playing chapter's row fill, kb-accent-soft on kb-surface, 1.24:1 light / 1.47:1 dark. It is the signed current-row style (rd-ch[aria-current], the Contents sheet, 01-reader) that F11 carries; the state is told by its word (Playing / Paused), never by the fill alone. Logged, not restyled.
open_items:
- book-C03 the signed current-row fill under 3:1 (critique C03, gap): for the operator and the system
- book-OQ1 listening and reading progress are separate as drawn (Continue reading at chapter 3, Continue listening at Chapter 4 · 12:30): does listening a chapter count as reading it? Operator's call
- book-OQ2 "Clear this book's reading data" keeps its signed words; does it also clear the listening position? Operator's call
- book-OQ3 Listen on the landing always plays from chapter 1 (the whole book), not from Continue reading's chapter; the reader's chapter Listen covers "from here on"
- book-A1 two accent buttons in the daily-limit, finished and first-part-ready states (the note's Play / Start over beside Continue reading), as F6 allows (critique C04, frame-owned)
- book-H1 the Page's h (1840) holds every state a click reached in the render; "20 chapters" combined with Phone 320 (two clicks) is taller (about 3000 px) and scrolls in Play but is clipped on the canvas frame
- book-D1 the dark theme of the whole Page was not reached by the render's click budget; dark is checked on BookRowStates and on the frame's Dock and ListenNote boards

## Summary

Page `book`: `Book.dc.html`, the signed 07-book-page landing copied into `Book.css` with its as-built 3:1 and wrap
fixes, plus Listen. Listen sits in
the head under the reading progress: a secondary button with `5 chapters · about 4 h` (or `5 chapters` before it is
made), or `Continue listening` · `Chapter 4 · 12:30` with Start over; once a Listen lives or something stands in its
way the same slot shows the ListenNote (preparing, first part ready, daily limit, offline, finished, playing). Listen
on an unmade book shows Preparing…, then Ready + Play, never playback first (C01). Each row's meta gains one quiet
item, "Audio 38 min" (C02); the playing chapter is marked as in Contents. The dock sits in the side column from
64rem, after Contents below it. Eleven presets plus Desktop / 820 / 390 / 320 and Light / Dark. `BookRow` +
`BookRowStates` show the row's 15 states. Departures: none; frame gaps G1–G6. Open: C03, OQ1–OQ3, A1, H1, D1.

## Build (page `book`)

Canvas-only, never built: the state bar, Part 3 of `Book.css` (`.bk-board`, `.bk-stage*`, `.bk-dev--*`, `.bk-w640`),
the `scene` / `bar` / `dock` props, the sticky dock (the product's slot is `position: fixed`), `href="#top"`.

- **The landing is as built** (`web/src/components/book/book-page.tsx`, `app/book.css`); Listen adds three things and
  reshapes nothing.
- **The head's Listen slot**: in `Head`, after `.bk-prog`, a `div.bk-listen` (`aria-live="polite"`, column, stretch)
  holding one of:
  - `Listen` (F6 block form): `rd-btn rd-btn--secondary` (play mark in accent + "Listen") + `.lx-listen__q`: `N
    chapters · about 4 h` once every chapter is made (F2 sum), else `N chapters`. Pressed: `Starting…` in the rest
    width, then the reader at chapter 1, playing (`from: 1`). Alone on an unmade book (book-G6): `making` (n 1,
    `Chapter 1 of 5 · about 2 h left.`, the dock `Preparing… · part 1 of 11`, nothing playing), then once the first
    part is ready `ready` (`The first 3 min are ready to play; the rest is still preparing.` + Play), Play → `Chapter
    1 · 0:00` playing while chapter 1 is still being prepared ahead;
  - resume (a saved position, no live Listen): "Continue listening" + `Chapter 4 · 12:30`, "Start over" `.lx-over` on
    its own row. Continue → reader at the saved chapter and position; Start over → chapter 1 · 0:00;
  - `ListenNote` (unit book), in this order: a live Listen of this book → `making` (n = the chapter being prepared,
    `Chapter 2 of 5 · about 1 h 30 min left.`, line (n−1)/total) while chapters are still being made, `fail-limit`
    (no action) while held, else its state (Playing / Paused …: `Chapter 4 · 12:30`); offline → `offline-start`;
    held by the daily limit → `fail-limit` with `The first 14 min are ready to play.` and Play; finished → `finished`
    (`You've listened to all 5 chapters.`, Start over).
- **Rows** (`chapter-rows.tsx`): once the book has any audio, the meta gains a second item after the reading word,
  `span.bk-ch__audio` (`kb-secondary`, apart by the meta's gap, no separator): made → `Audio 38 min` (`Audio 1 h 7
  min`, F2); being made → `Audio preparing…` (`· part 2 of 9` when known); not yet → `Audio not prepared yet`; held →
  `Audio held by the daily limit`. The chapter a live Listen is on: `aria-current="true"` on the row link
  and a leading `span.rd-ch__now` "Playing" / "Paused". No audio phrase before a Listen exists for the book.
- **The dock** (F7, `Dock` unit book: chapter title, `Chapter n · m:ss`): shown while a Listen lives; `bottom:
  kb-space-md + safe area`. Its track: below 64rem the layout column (`.bk-layout`, 40rem with the gutters); from 64rem
  the side column (24rem) — `.bk-layout--docked { grid-template-rows: auto 1fr }`, side row 1, body rows 1–2, the slot
  column 1 row 2. The page's end padding grows by the dock + `kb-space-sm`. Open → the player (F8).
- **Beside Hermes** (F22): the slot follows the side column, so a desktop panel that re-centres the layout moves it.
- Data: `guide` and `changple5` from F18; reading progress 2 of 5 (ch 3 at 40%) and 2 of 20 (ch 3 at 65%).

## Intent

- **Book landing (`Book.dc.html`).** The operator, on the landing of "knowledge maintainer guide" (or the 20-chapter
  "changple5 curriculum"), came to start listening to the whole book with the screen off, or to pick it up where they
  left it. First thing they must see: the book, then one Listen that says what it plays (`5 chapters · about 4 h`) or
  where it picks up (`Continue listening` · `Chapter 4 · 12:30`), beside, never instead of, the signed Continue reading.

## Plan (reviewed against the handoff and the bar)

- Boards: `Book.dc.html` (Page, 1440, fill, interactive); `BookRow.dc.html` (the signed chapter row plus its audio
  phrase, mounted per row); `BookRowStates.dc.html` (Components: every row state at 640 and 320, light and dark).
  `Book.css` holds the signed landing's rules copied from 07-book-page (book.css, and from its reader.css `.rd-next`,
  `.rd-end__list*`, `.rd-tag` uses, `.rd-btn--ghost`), the product's as-built fixes (P30.S23: the ghost and clear
  trigger take `--rd-control-edge`; `.rd-next` and `.bk-clear` buttons wrap), and this page's Listen rules.
- Listen sits in the head, under the reading progress line (F6), on the side column's start edge. Nothing is added to
  the top bar or to Continue.
- Readiness per chapter (F11) is one more phrase in each row's existing meta line, secondary text, no colour or icon.
- The dock (F7): see G1.
- Type: only the signed steps plus Listen's 13 / 15 px. Colour: the one accent stays Continue reading's; Listen is
  secondary. The bold move is the player's (F15); this page sits quietly in a signed page.
- Review: a "Listen" section with its own heading under Continue was the default first idea; cut (a heading and a
  second hairline block crowd the landing's actions). A per-chapter Listen on each row was cut too (20 buttons in a
  long list; the reader's chapter Listen covers "from this chapter on").

### Layout (desktop, from 64rem; below it one column: side, then Contents, then the dock)

```
[ state bar (canvas only) ...................................................... ]
[ logo  ‹ Library                     (book title once the head scrolls away)     ]
      | side 24rem                    |  | body 40rem                           |
      | CODEBASE  @quillwork/knowledge|  | Contents                  5 chapters |
      | knowledge maintainer guide    |  | 1  knowledge: what it is …           |
      | 2 of 5 finished               |  |    Finished · 38 min                 |
      | ━━━━━━━━━──────────────       |  | 2  System internals: …               |
      | [▶ Listen]  5 chapters · ~4 h |  |    …                                 |
      | ───────────────────────────── |  | Your reading data                    |
      | CONTINUE · CHAPTER 3          |  | [Clear this book's reading data]     |
      | knowledge's read surfaces: …  |  |                                      |
      | [Continue reading →]          |  |                                      |
      | ───────────────────────────── |  |                                      |
      | Notes in this book →          |  |                                      |
      | (▶ dock: Playing · Ch 1 · …  ⌃)|  |                                      |
```

Alignment: everything in the side column shares its start edge (kind line, title, progress, Listen, its note and line,
Continue, Notes, the dock's capsule edge); the qualifier sits on the button's centre line; rows align first lines
(signed baseline grid); the dock's two edges are the side column's.

## The state bar (canvas only)

`Book landing`: Never listened · Never listened · audio made · Listen pressed · first part preparing · First part
ready · Preparing the book · Left part-way · Listening (docked) ·
Finished · Daily limit · Offline · 20 chapters, preparing; then `View:` Desktop · iPad 820 · Phone 390 · Phone 320 ·
Light · Dark (view switches, kept across presets). Each state preset sets the book, its audio, the saved position,
finished, online and the live Listen. For the join: `scene="<key>"` applies a preset (`new`, `new-made`, `first`, `first-ready`, `preparing`,
`resume`, `listening`, `finished`, `limit`, `offline`, `long`), `bar="off"` hides this bar, `dock="{{ false }}"`
hides this page's dock when the entry draws the one dock.

## Data

Real: the guide's five chapter titles, the changple5 count and minutes, the F18 figures; the landing's words from
`content/book.ts`. Made up: the org `@quillwork` (07-book-page's signed fixture), reading progress, the notes count
(07's "33 items in 4 chapters"), G5's time left, G6's chapter-1 parts (guide 11, changple5 7, about 3.5 min a
part as in F18) and its time left (guide `about 2 h`, changple5 `about 5 h`). Placeholders: `[Chapter n title]`.

## States reached only by interaction

`Starting…` (Listen pressed, 0.9 s, then the reader or, alone, Preparing…, and 2.5 s later Ready; both also presets); the dock's Pause / Play;
hover and focus of every control. Alone, a row, Continue reading and the dock's open chevron emit their events only.

## Render log

- Pass 1 (3 boards, 24 states): reflow at 200 % text (the clear trigger's `nowrap`), the ghost's 1.57:1 edge, the
  current row's fill, page-clip (h 1200), two frame-clips, the note's line shrunk to its sentence, white under short
  states. Fixed: the product's as-built wrap and `--rd-control-edge` rules; `.bk-listen` stretches; `.bk-board`
  min-height; h 1840 / 96 / 920.
- Pass 2 (3 boards, 24 states): `self_check=fail blocking=non-text-contrast:2`, both the signed current-row fill
  (logged above).
- Measured lines: fixed 6 (reflow, the ghost edge, page-clip, 2 frame-clips, the note line); logged as intended 3:
  - `off-centre` 85 / 176 px: the signed top bar runs full width; the content is centred (176 / 176);
  - `align` first-line 1479.5 px on state 08: the docked grid's side column and the dock (row 2) are stacked, not a
    row;
  - `layout-shift` on iPad 820 / Phone 390 / Phone 320: the view switches change the viewport on purpose.
- Pass 3 (critique 01, 3 boards, 28 states): the first-part steps and the row's audio item render as drawn at 1440,
  390 and 320; `self_check=fail blocking=non-text-contrast:2`, the same signed fill (C03). One new advisory line,
  logged as intended: `layout-shift` state 13, Listen at 320 grows row 1 (84 → 106 px) because the row gains its
  audio item when the book's audio starts: content arriving, not a control showing its state; F11 writes no audio
  item before a Listen exists.
- `design-check 11-listen --page book`: OK, 3 boards, 4 files.

## Critique pass 01

- C01 fixed: alone, Listen on an unmade book now goes Starting… → Preparing… (`Chapter 1 of 5 · about 2 h left.`,
  dock `Preparing… · part 1 of 11`, nothing playing) → Ready (`The first 3 min are ready to play…` + Play) → Play →
  `Chapter 1 · 0:00`; the async result is dropped if a preset is pressed mid-way (send id). Two presets reach the
  steps directly. Rows mark Playing / Paused only while the Listen plays or is paused. Logged as book-G6.
- C02 fixed: the audio phrase is its own meta item, led by "Audio" (`Audio 38 min`, `Audio preparing…`, `Audio not
  prepared yet`, `Audio held by the daily limit`), apart from the reading word by the meta's gap; book-G3 revised.
- C03 gap: logged (component_gaps, book-C03); the signed fill is not restyled.
- C04 advisory, frame-owned: unchanged; book-A1 now names the first-part-ready state too.
- C05 advisory, F6's choice: unchanged, for the join or the operator.
- C06 advisory, the frame's `.lx-over`: unchanged, for the join.
