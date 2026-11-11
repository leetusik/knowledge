status: done
pass: join
job: 11-listen
round: 01-listen
boards: 18 (4 Pages, 14 Components); entry Main.dc.html
open_items:
- frame-OQ1 chapter Listen plays the book from this chapter on ("Chapters 2–5"); a chapter-only choice is not drawn
- frame-OQ2 table rows are read aloud (about 9 of 42 min); no skip drawn
- frame-OQ3 follow along drawn as taken (F12), on by default, switched in the player
- frame-OQ4 no separate Prepare: Listen starts the making, chapters made ahead in order while it plays
- frame-OQ5 no voice picker drawn; nothing in the flow needs one
- frame-A1 Listen while reading lives in the bottom slot, not the signed top bar (no room at 390 on a document)
- frame-P1 placeholders: `[Chapter n title]` (changple5), `[PROJECT]`
- reader-T1 the held head slot leaves room under a short note (about 50 px desktop, 80 px at 390)
- player-Q1 chapters before the one Listen started from are "Not prepared yet", not selectable
- player-Q2 the standalone Player board's reader behind its sheet is a stand-in (signed English paragraphs); in the flow the player now opens over the real page (critique C08)
- book-OQ1 listening and reading progress are separate (Continue reading ch 3, Continue listening ch 4 · 12:30)
- book-OQ2 does "Clear this book's reading data" also clear the listening position
- book-OQ3 the landing's Listen always plays from chapter 1
- book-A1 two accent buttons on the landing in the daily-limit and finished states (the note's action beside Continue reading)
- join-G1 frame parts still to port in the build, drawn per page: ListenNote `act`/`tone` (F25), Shell's compact second slot (F26), Listen `form=resume` for the pill (F27)
- join-G2 measured frame parts, logged not restyled: the signed chapter bar's first-line 9.5 px and its visually-hidden narrow labels; the Dock title at 200 % text
- join-W1 design-check's token-drift warning on PlayerPanel (raw 2px / 1px / 1.5px where trend-line, graph-edge and status-ring tokens exist): page player's file, not a join edit
- C09 (advisory, for the operator) the dock sits in the landing's side column (384 px) and in the reader's text column (576 px) on desktop, as F31 chose

## Summary

The joined canvas of 11-listen: 18 boards. 01 `Main.dc.html` is the flow: the book landing → Listen (or Continue
listening) → the chapter with the docked player → the dock opens the player over that page → Close reveals it, Go
to the text goes to the Listen's chapter; the back link returns to the landing. Its state bar also reaches a document
and its Korean version, at four windows, light and dark. 02–04 are the pages alone; 05–18 the components. Critique
01: C01–C08 fixed (the kept place, speed carried, one length, one time left, part counts, one Close answer with F33
revised, the real page behind the player, the header's x), C07's 3 px of y rebutted (the signed reading line).
Departures: none. Open: the five OQs, A1, P1, T1, player Q1–Q2, book OQ1–OQ3 and A1, join G1–G2, W1, C09.

## Build

Everything the build needs, assembled from the frame's fragment (`pages/frame/result.md`), each page's
(`pages/{reader,player,book}/result.md` → `## Build`), the settled choices (`frame.md` F1–F33) and the wiring below.
Where a page fragment and a later `F<n>` disagree, the `F<n>` wins.

**Canvas-only, never built:** every state bar (`[data-proto="state-bar"]`) and the foot strip
(`[data-proto="screens"]`); `Main.dc.html` itself (the flow board) and the `bar` / `win` / `view` / `theme` / `audio`
/ `saved` / `kept` / `player` / `done` / `at` / `scene` / `dock` props it passes (`kept` stands for the product's
kept position, which is built); the device windows (`.lx-win`, `.rx-stage`,
`.bk-stage*`, `.pl-wins*`: the product's chrome is `position: fixed` to the viewport); the states boards; the
in-canvas stand-ins (the reader's "Listen" and "Sign in" sheets, the player's reader behind its sheet);
`PlayerData.js` and every fixture; `#top` hrefs; Part 4 of `frame.css` and Part 3 of `Book.css`.

### What to build, by part

- **Tokens and faces:** kb-* only, plus the frame's `--lx-*` (frame fragment *Tokens*). Faces as built (F14);
  Pretendard for Hangul (v1.3.9, as `lib/fonts.ts` ships).
- **Icons (F5):** nine 24 px stroke paths (`frame.css` `.lx-i--*`), inline `<svg aria-hidden="true">` in named buttons.
- **Listen control (F6, F27):** the frame fragment's *Listen*; the slot pill gains `form=resume` ("Continue listening
  · 18:05") and shows only once the head's Listen has scrolled under the top bar (reader-G5).
- **Dock (F7):** the frame fragment's *Dock*, one component on the reader and the landing; lead by state (F7); on the
  daily limit the lead stays a disabled Play (F24).
- **ListenNote (F10, F24, F25):** the frame fragment's *ListenNote*, plus two props: `act` (default true; false where
  the dock or the player's transport carries the action) and `tone` (`primary` default; `secondary` for Update audio
  in the player). The note keeps its button for Update audio, Sign in (player), and Play on the daily limit beside
  the dock ("The first 14 min are ready to play.").
- **The reader (page `reader`):** its fragment whole: the head's `.rx-listen` slot (held at the unit's tallest note),
  the bottom slot (pill or dock), follow along (F12), the click results, the compact top bar for a two-language
  document (F26, ported into `Shell` as the signed second slot after Display).
- **The opened player (page `player`):** its fragment whole: the reader's sheet (F8), head Go to the text + Close
  (wrapping), the zone, the position (34 px Fraunces, the one bold move), seek (`<input type="range">`, 5 s steps),
  the transport grid, the Speed / Follow along / Chapters rows, Stop listening; the current chapter row with the 1px
  accent edge (F28); the scrim as an `aria-hidden` surface (F29).
- **The book landing (page `book`):** its fragment whole: the head's `.bk-listen` slot, the rows' "Audio …" meta item
  (F31), the dock's track (layout column below 64rem, side column from 64rem); the playing row with the accent edge
  (F28); first part ready shows one Play, the dock's (F25).
- **The Listen object (F19 + F23):** `{ unit, from, ch, pos, state, old, soFar, len, part, made, offer, updating,
  speed, follow }`; state keys F19. `made` moves only with the making; `len` is the made length while `soFar` (a book's
  first part too: `0:00 of 3:05 so far` in the dock, the note and the player; nothing made shows no length, F2).
  `part` is the part being made, shown as `part n of 9` for a book chapter. Speed and follow along are the
  listener's, kept from one Listen to the next wherever it starts (F3). Beside it, the kept position `{ unit, ch, pos }`
  that Stop listening leaves (F17), cleared when a Listen starts.

### The wiring (one Listen across pages)

- The Listen lives in the persistent part of the page (R3: a full page load stops the audio), above the routes; the
  reader, the landing and the player read it and emit every change (`on-listen`).
- **Landing → reader** (`on-open-reader { ch, listen }`): Listen (chapter 1), Continue listening (the saved chapter
  and position), Start over (chapter 1 · 0:00) and the note's Play open the chapter with the Listen; a chapter row
  and Continue reading open their chapter and leave the Listen as it is. On a book not yet made the reader opens on
  Preparing… (part 1), then Ready once the first part is made; nothing plays before (F9, F31). Made, it opens playing.
- **Landing or reader → player** (`on-open-player { listen }`): the dock's chevron opens the sheet over the page it
  sits on (the landing or the chapter, as it was, dimmed by the scrim); focus to Close.
- **Player → page (F33, one answer):** Close, Escape and a tap on the scrim reveal the page under the sheet unchanged
  (the landing, or the chapter that was open even when the Listen has moved on); focus returns to the dock. Go to the
  text goes to the reader at the Listen's chapter (or document), scrolled once to the block read (F12), or to its head
  at the start. Stop listening ends the Listen, removes the dock and closes the sheet onto the page under it, keeping
  the position (F17): the landing's Listen reads `Continue listening · Chapter 4 · 12:30`, that chapter's head
  `Continue listening · 12:30 of 58:40`, until a Listen starts. The canvas draws this by mounting the opened player
  (PlayerPanel) inside the landing's or the reader's own window; the standalone Player board's reader behind the sheet
  stays a stand-in.
- **Reader → landing:** the chapter's back link ("‹ knowledge maintainer guide", "‹ Book" below 40rem) and the last
  chapter's "Back to the book →". The dock stays docked across the move.
- **Beside Hermes (P36-1s, F22):** the dock belongs to the column's track: a desktop side panel that re-centres the
  column moves the dock with it, never under the panel; a modal drawer (z 40 over the scrim) covers the dock while
  open; a non-modal bottom drawer is bottom chrome and lifts the slot as the chapter bar does. On the landing the dock
  follows the side column. "Ask Hermes" in the annotation popover is untouched.

### Data shapes and fixture

F18 (the shared fixture) with F32: a book chapter is made in 9 parts; the preparing chapter is at part 2 of 9. No
voice names, keys or accounts anywhere.

## Intent and plan (the join)

- **Intent, 01 Main:** the operator, on a phone or a Mac, follows one Listen from the book landing into the chapter
  and the player and back; the first thing they see is the landing's Listen beside its length.
- **Plan:** one flow board holding the one Listen (F33); each page mounted with `bar="off"` so the entry draws one
  state bar (the three pages' groups in one grid cell, the hidden ones `visibility: hidden`, so the product header never
  moves) and drives the window (Desktop, iPad 820, Phone 390, Phone 320) and the theme; the entry opens on "Audio
  made" (Listen → the chapter playing, as the handoff's flow). No unrelated page: all three are one group
  (`join.json`). Layout: Pages on row 1 (Main, Book, Reader, Player in flow order), Components on row 2 grouped by
  part (Listen, Dock, ListenNote, Player, BookRow, Icons, Shell, ChapterBar), 80 px apart, 120 between rows.

## Join edits to page files (each logged)

- **Link wiring:** Reader: `bar` / `win` / `at` props (bar hidden, window and theme from the entry, Go to the text
  opens scrolled once to the block read); the back link and the chapter bar's "Back to the book" `#to:book` →
  `Book.dc.html`. Player: `bar` / `win` props (one window in the flow; the reader's four windows). Book: `view` /
  `audio` / `saved` / `done` props (the entry carries the landing's audio, saved position and finished across pages;
  view and theme from the entry). Main links `Book.css` and `PlayerData.js`, which a mounted board's head does not
  bring.
- **Shared-choice reconciliation:** Reader `madeLen` → `len` (F23), the daily limit's ready part and Play beside the
  dock (F24), the scrim as a surface (F29). Player `len` values `3:05` / `14:05` (F23), the compact top bar on a
  document (F26). Book: one Play when the first part is ready (F25), the current row's accent edge (F28, `Book.css`),
  part counts 9 and `part 2 of 9` (F32).
- **Critique 01 (each a wiring or a shared-choice edit):** Reader and Book mount the opened player (PlayerPanel) inside
  their own window when the flow passes `player` (C06, C08), with `on-close` / `on-go-to-text`, focus to Close and
  back to the dock; the Book takes `saved` as the kept `{ ch, pos }` and the Reader `kept` (C01); the Reader handles
  Go to the text while mounted (`at` `text` / `head`), its book note reads `about 2 h` on chapter 1 (C04) and its
  length uses `len` while `soFar` for a book too (C03); Book.css Part 3 gains `.bk-frame--held` (the landing as a
  window under the sheet, canvas only); PlayerData.js gives the books `parts: 9` and the dock the Listen's `part`, and
  PlayerPanel the Listen's `part` and `about 2 h` on chapter 1 (C04, C05).
- **Frame h fix:** Book `h` 1840 → 1860 (`$preview` and `canvas.json`; `check=page-clip` measured 1846 after F28's
  border).

## Data

F18 throughout (real titles and lengths from the brief; `changple5` chapter titles and `[PROJECT]` placeholders);
F32's part counts are made up. No voice names, keys, accounts or private text.

## Measured lines (render pass 2)

- Blocking: none (`self_check=pass`). Pass 1's `non-text-contrast` (the landing's playing row) and `reflow` (Main at
  200 % text) were Main rendering the landing without `Book.css`; fixed by linking it; F28 also settles the row's edge.
- Logged as intended, all from page or frame parts already logged by their owners: `size-count` (the signed reader's
  seven sizes; the player's position steps), `cramped-padding` (the Dock's long chapter title 3.8 px from the
  chevron, frame part), `align` first-line 9.5 px (the signed chapter bar), `align` control-height 20 px (the player's
  ±15 numeral inside its skip icon vs the icon box: an icon glyph, not a control), `off-centre` (the landing's
  signed two-column layout), `unmeasured` (the player sheet's scroll cue gradient; judged on the PNG, text on
  `kb-surface`), `clipped` `rd-bnav__*` (the chapter bar's visually-hidden narrow labels, signed).
- `layout-shift` on Main: the Window presets change the device (intended, as on the reader page) and the in-chapter
  TOC links scroll the page (an anchor jump, as signed).

## Render log

- Pass 1 (`--board` Main, Reader, Book, Player, `--click`): the flow ran (Listen → chapter playing → player → back);
  the player crashed in Main (`window.PL` missing) and the landing rendered unstyled (no `Book.css`): both linked in
  Main's head. Book `page-clip` 1846 > 1840: h fixed. Reader and Player standalone: no new issue from the join edits;
  Reader's Daily limit shows "The first 14 min are ready to play." with Play beside the dock's disabled Play (F24).
- Pass 2 (`--board` Main, Book): `self_check=pass blocking=none`; 36 Main states (landing, chapter, document, Korean,
  player at four windows, light and dark).
- After pass 2 (not re-rendered, the two-pass cap): Main's CSS drops the reader's desktop window's top gap in the flow
  so the product header sits at the same y on the landing, the reader and the player.
- `design-check 11-listen`: OK, one warning (join-W1).
- Critique pass 01 (`--board` Main, Book, Reader, Player, `--click`): `self_check=pass blocking=none`, 169 states, no
  errors. Main: the player over the chapter (desktop and 390) and over the landing show the real page dimmed behind;
  "Over chapter 1, preparing" reads `Chapter 1 of 5 · about 2 h left.` in the note and the player and `part 1 of 9` in
  the dock. A scratch harness on the preview's browser drove C01, C02, C03 and C06 by clicks (results in the
  critique section). New measured line: Main state 08 `cramped-padding` on the Shell's back label ("‹ knowledge
  maintainer guide", 0.9 px): logged as intended, the signed label box is sized to its text and the 2× crop shows it
  whole. The rest are the lines already logged above (window presets, anchor jumps, the signed chapter bar, the
  ±15 glyph, the side column).

## Critique pass 01

- C01 fixed: Stop listening keeps `{ unit, ch, pos }` in the flow (F17, F33 revised); harness: Left part-way →
  Continue listening → Open the player → Stop listening → the chapter's head reads "Continue listening · 12:30 of
  58:40" with Start over; ‹ back → the landing reads "Continue listening · Chapter 4 · 12:30". Cleared when a Listen
  starts. Reader `kept` prop, Book `saved` as `{ ch, pos }`.
- C02 fixed: a new Listen (none docked, or another unit) takes the listener's speed and follow along wherever it
  starts; harness: chapter 3 → player → 1.5× → Stop listening → Listen → player reads "Speed 1.5×".
- C03 fixed: the never-made Listen carries `soFar` and, at Ready, `len: 3:05` (F23); harness: the player reads "0:00
  of 3:05 so far", the dock "Ready to play · the rest is preparing"; the Reader's dock and note use `len` while
  `soFar` for a book too, so the dock agrees once it plays.
- C04 fixed: chapter 1's first step reads "Chapter 1 of 5 · about 2 h left." on the landing, the chapter and the
  player (Reader `noteLeft`, PlayerPanel `left`; F31 notes it).
- C05 fixed: with the player over the real chapter, the dock behind is the reader's ("part 1 of 9"); PlayerData.js
  also gives the books `parts: 9` and the dock the Listen's `part`, and PlayerPanel the Listen's `part` (F32 notes it).
- C06 fixed: one answer, the overlay's: the player opens over the page it was opened on; Close (Escape, the scrim)
  reveals it unchanged, Go to the text goes to the Listen's chapter. F33 and `## Build` *The wiring* say the same;
  harness: chapter 3 with chapter 4 docked → Open the player → h1 still chapter 3 → Close → chapter 3; Go to the
  text → chapter 4. Added preset "Over the book landing".
- C07 fixed (x), rebutted (3 px of y): in the flow the reader's desktop window drops its 1 px edge, so it is 1440
  wide and takes the wide gutter like the landing; harness: logo x 28.8 and back link x 78.4 on the landing, the
  chapter and the player over it (820: 328.6 / 378.2 on both; 390: 533.2 / 582.8). The bars' y (71 vs 74) differ by
  the signed reader's 3 px reading progress line (`--rd-line`, 01-reader) above its top bar, which the signed landing
  (07-book-page) does not draw; both chromes start at y 71 and neither signed part is restyled.
- C08 fixed: the flow no longer mounts the Player board; the Reader and the Book mount PlayerPanel inside their own
  window over the page as it was (the landing becomes a window the device's height while the sheet is open, canvas
  only), so the column behind is the text the person was reading, dimmed by the scrim (F8). The standalone Player
  board keeps its stand-in (player-Q2, canvas-only).
- C09 advisory: left to the operator (open item C09).

