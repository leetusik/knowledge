status: done
pass: page reader
job: 11-listen
round: 01-listen
boards: Reader.dc.html
frame_gaps:
- reader-G1 the carried Listen (F19) also carries `part` (the part being prepared: 1 on a fresh start, 3 making, 4 at the voice failure) and `madeLen` (the length made so far, shown while `soFar`: `3:05`, `14:05`). Drawn as fields of the `listen` object; the join should add them to F19 or derive them.
- reader-G2 (revised in critique pass 01, C06) the signed compact top bar (01-reader round 03, "Compact chrome": a two-language document's language switch takes a second row of the bar under 21rem; Display's sides tighten; below 14rem the logo steps aside for "‹ Library") is not in the frame's Shell. Without it the loose document's bar overprints at 320 px and at 200% text (blocking `overprint`, measured in pass 1). Drawn as a CSS-only copy in Reader's style (`.rx-langs`, `.rx-loose`); the signed bar moves the switch into a second slot after Display, so its Tab order follows the rows. The join or the frame should port the signed second slot into Shell. Pass 01: one row cut "‹ Library" to "‹ Li…" at 390 (Notes is in the bar now), so the second row starts under 23rem (signed: 21rem) and from 23rem to 26rem the logo steps aside for "‹ Library" (the signed rule's own trade, at the width that needs it).
- reader-G3 F7 gives the dock a disabled Play on `fail-limit`, while F10 gives the note a Play when part is ready ("The first 14 min are ready to play"). Drawn (pass 01, C05) to F7: nothing plays on the daily limit, and the note drops its "ready to play" clause, so the screen says one thing. The join decides whether the dock's Play should play the ready part (then the clause returns).
- reader-G4 the head's Listen once a Listen exists: F6 leaves it to this page. Drawn: the head shows the ListenNote for every state of this unit's Listen, playing and paused included (so the head never empties and the text under it does not jump), and the Listen button busy ("Starting…") while `loading`. Pass 01 (C02): from the press on, the slot holds the height of this unit's tallest note (hidden copies of `fail-voice`, `fail-limit` and `offline-stopped` / `next-waiting` in one grid cell), so the text moves once, at the reader's press, and never on a change they did not ask for; `outdated` (known on arrival) and its Update audio may exceed it. A Listen of another unit (English playing, the Korean version open) leaves this page's own Listen idle in the head; the dock keeps the playing one.
- reader-G5 (pass 01, C04, C09) the slot's Listen pill shows only once the head's Listen has scrolled under the top bar (F6 also shows it at the top). At the top the head is the one Listen; while reading on, the pill. Drawn: `past` measured on scroll.
- reader-G6 (pass 01, C04) left part-way, the pill says F1's resume word: "▶ Continue listening · 18:05". The frame's Listen pill has no resume form, so it is drawn as markup on the frame's `.lx-pill` classes; the frame should add `form=resume` to the pill.
- reader-G7 (pass 01, C05) beside the dock, the head's note carries the why and the dock the one action: the note's button is hidden (board CSS on the frame's ListenNote) except Update audio, which the dock lacks. F6 ("the note's one action is the only accent button Listen adds") and F7 (an accent lead) disagree; the frame should give ListenNote an `act` prop and settle F6.
events:
- `on-listen` `{ listen }` on every change of the Listen (start, play, pause, retry, start over, update, every preset)
- `on-open-player` `{ listen }` from the dock's Open the player (alone: an in-canvas stand-in sheet "Listen")
- `on-open-book` (no payload) from the chapter's back link and the chapter bar's "Back to the book"; both also carry `href="#to:book"` when no handler is given
component_gaps:
- reader: none new; the page uses the frame's Shell, ChapterBar, Listen, Dock and ListenNote. The signed head's Version history link and the In this chapter list are copied from 01-reader round 03 `reader.css` into the board's style (the frame does not carry them).
open_items:
- reader-G1 to reader-G7 above (frame gaps for the join)
- reader-M1 the measured lines answered in `## Measured lines` (layout-shift by class, size-count, cramped-padding), logged as intended
- reader-T1 the held head slot leaves room under a short note (about 50 px at desktop, 80 px at 390 under "Playing"): the price of no unasked jump; an operator taste call
- reader-D1 dark is reached by the Theme preset; the click-through does not screenshot it (a theme change changes no text, so it reads as the same state). Dark contrast of the dock, the note and the pill is measured on the frame's states boards; the reader's own parts are the signed reader's values. Not re-measured on this board (the render cap of two passes).

## Summary

`Reader.dc.html`, one interactive Page: the signed reader in a device window (Desktop 1440×900, iPad 820×1180, Phone
390×844, Phone 320×844; Light / Dark), switched in its state bar like the signed reader's window row. The page scrolls
inside the window: down hides the top bar and the chapter bar, up brings them back, the dock stays put. The chapter
opening is the signed one; F6's Listen sits under its meta line ("42 min", none before made, "Chapters 2–5 · about 3 h
30 min", Continue listening + Start over); once started the head shows the ListenNote's why in a slot held at its
tallest note (no unasked jump), and the dock carries the one action; the slot pill shows only once the head's Listen
is out of view; follow along marks the title at the start, then the block read. 35 presets (24 document, 11
chapter). Critique 01: fixed 7, rebutted 1 (C07, already logged; now in its own section). Departures: none from the
handoff; frame gaps G1–G7. Self-check pass.

## Build (the reader page's fragment)

Canvas-only, never built: the state bar, the stage and the window (`.rx-stage`, `.lx-win`: the product's chrome is
`position: fixed` to the viewport), the in-canvas stand-in sheets ("Listen" for the player, "Sign in"), the presets'
programmatic scroll, the fixture.

- **The head** (`ChapterHead`, as built), after `rd-head__meta`: a `.rx-listen` block, `margin-top: calc(kb-space-md ×
  --rd-k)`, on the column's start edge, holding exactly one of:
  - no Listen of this unit: the frame's Listen (F6) — chapter `form=chapter`, `q` "Chapters n–5 · about …" (sum of
    chapters n..5, F2; the last chapter "Chapter 5 · 31 min"); document `form=doc`, `q` the length when made, else
    none; left part-way `form=resume`, `q` "18:05 of 42:10", with Start over;
  - this unit's Listen `loading`: the same Listen with `busy` ("Starting…");
  - this unit's Listen in any other state: the ListenNote (F10) with the dock's data; `outdated` when `old` and playing
    or paused. Its action button is not shown beside the dock (the dock's lead or Sign in is the one action), except
    Update audio (reader-G7). On the daily limit the note has no "ready to play" clause (reader-G3).
  - from the press until Stop listening the slot's height is held at this unit's tallest note at the current width
    (build: measure the tallest F10 sentence for the unit, or stack hidden copies in one grid cell as drawn), so only
    the press and Update audio move the text (reader-G4). Build also keeps the browser's scroll anchoring on, so a head
    change above the viewport never moves the line being read.
- **The bottom slot**: no Listen, the chrome shown and the head's Listen scrolled under the top bar → the slot pill
  (F6; reader-G5), hidden with the top bar; left part-way it reads "Continue listening · 18:05" (reader-G6); a Listen →
  the Dock (F7) on the column's track, `bottom` above the chapter bar on a chapter, `kb-space-md` on a document; the
  page's end padding grows by the dock (the frame's `--lx-page-b`). The pill is not drawn while a sheet is open.
- **Follow along (F12)**: `.lx-follow` on the title while the voice reads the opening (the spoken script starts with
  it), then on the block whose id the playing segment carries, only while this unit's
  Listen is playing, paused, buffering or offline-playing, `follow` on, and (a book) its chapter is the page's. It
  never scrolls; "Next chapter starts" changes the dock's title and leaves the page where it is.
- **Data shapes**: the page takes `doc` (`bar` / `bar-ko` / `guide`), `ch` (1–5), `listen` (F19 + `part`, `madeLen`),
  `theme`. Controlled when given `listen` and `on-listen`; else it holds its own. Prop changes of `doc`/`ch` reset the
  scroll to the top and show the chrome.
- **Clicks**: Listen → `loading` → `playing` (a send id drops a stale result); Continue listening → from 18:05; Start
  over → from 0:04 at `from`; Listen on an unmade document → `making`, part 1; dock/note Play → `playing` (from
  `ready` / daily limit, `soFar`); Pause → `paused`; Try again → `making` (voice, unreadable) or reload (playback);
  Sign in → the product's sign-in, back to `loading`; Update audio → "Updating…" then `old: false`; the language
  switch moves between `bar` and `bar-ko` and leaves the dock's Listen playing.
- **The compact top bar** for a two-language document: as signed in 01-reader round 03, its second row from under 23rem
  and the logo stepping aside for "‹ Library" from 23rem to 26rem (reader-G2).
- **Beside Hermes (F22)**: nothing page-specific; the dock follows the column's track.
- **Tokens**: kb-* and the frame's `--lx-*` only; type steps are the signed reader's plus the frame's 13 / 15.

## Intent

- **Reader with Listen** — the operator, reading a long explain document or a book chapter on a phone, iPad or Mac,
  who wants to hear it instead (or as well); first they see the title and, right under its meta line, Listen with how
  long it runs; once it plays, the dock at the bottom says whether it plays and where, and the text stays theirs.

## Plan (reviewed against the handoff and the bar before building)

- Boards: one interactive Page, `Reader.dc.html`. No page-local component: Listen, Dock, ListenNote, Shell and
  ChapterBar are the frame's.
- The window: the frame's `.lx-win` at the brief's device sizes, switched in the bar like the signed reader's window
  row (01-reader round 03), with Light / Dark beside it. The page scrolls inside the window; the chrome hides and
  returns as built; the dock stays put.
- Inside: the signed chapter opening (book line, title, lede, meta with Version history, the In this chapter list),
  F6's Listen under the meta line, then the prose.
- Type, space, colour: the frame's steps and kb tokens; no new accent use. The bold move is the frame's (the player's
  position); this page stays the reader's own quiet page.
- Revised before building: the head's note shows in every non-idle state, playing included, so the head slot never
  empties and the text under it does not jump when Listen starts (reader-G4).
- Revised after pass 1: the window and theme presets moved to the front of the bar so the click-through reaches them;
  the desktop window keeps the same top edge as the device windows.

Wireframe (phone 390, a chapter, playing; everything on the column's two edges, left-aligned):

```
|  ‹ Book                                   Display |   top bar (hides on scroll down)
|  CHAPTER 2 OF 5   knowledge maintainer guide      |
|  System internals: the content plane, …           |
|  Where a document actually lives, …               |
|  v2 · Published 12 Oct 2026 · Version history     |
|  ● Playing                                        |   ListenNote, column start edge
|  Chapter 2 · 12:30                                |
|  IN THIS CHAPTER …                                |
| ▍The process runs two planes at once …            |   follow-along rule in the start margin
|  ( (II)  System internals: the con…   ⌃ )         |   dock, the column's two edges
|  ‹ Previous     Contents 2 of 5     Next →        |   chapter bar (hides with the top bar)
```

## Data

- Real: the guide's five chapter titles (F18), their summaries, versions, dates, headings and opening paragraphs from
  the signed reader fixture (01-reader round 03 `reader.js`, the product's own maintainer guide); the two document
  titles and lengths (brief); the heading "Decay".
- Made up: the loose document's lede and paragraphs in English and Korean (generic sentences, so the document's real
  text stays off the canvas); the document's version and date (v1, 3 Nov 2026); per-chapter lengths and every
  position and clock time (F18); which block a position falls in (12:30 and 18:05 of 42:10 in "Decay") and that the
  spoken script opens with the title (assumed from P41-sr.S1, not checked against its output).
- Placeholders: `[PROJECT]`.

## Measured lines (answered; critique C01, C07, C08)

Each measured line of the last render, by class, logged as intended:
- `layout-shift`, the window presets (iPad 820, Phone 390, Phone 320): canvas-only stage controls that resize the device
  window; the window and the controls inside it change size because the window does. Phone 320's 'Notes' 59.4 → 53 px
  is the signed compact bar tightening its buttons' sides under 21rem. The 390 cut of "Library" is fixed (C06).
- `layout-shift`, the contents links (Scoring a run, Decay): an in-page anchor the reader clicked scrolls the reading
  window, as built.
- `layout-shift`, the language switch (English, 한국어): switching the document opens the other version at its top, as
  signed (01-reader).
- `layout-shift`, the reading-on presets (Reading on idle / bars hidden, Left part-way reading on, Idle reading on,
  Follow along off, Next chapter starts): the preset sets a reading position, so the window's page scrolls; the
  chrome does not move.
- `layout-shift`, 'Continue listening · 18:05' from reading on (main y −279 → −272): the press swaps the head's
  resume form for the held note above the viewport; the reader asked, and the build's scroll anchoring keeps the line
  in view still.
- `size-count` 7 sizes (11, 13, 15, 18, 21, 26, 43): the signed reader's own steps (mono label 11, meta 13, UI 15, body
  18, lede 21, h2 26, title 43); Listen adds none.
- `cramped-padding` "Shipping and runnin…" 3.8 px: measured on the untruncated title run inside its `overflow: hidden`
  box. On `Reader.frame.state-36.png` the visible ellipsis ends at x≈939, 14 px before the chevron's 44 px box and
  about 69 px from the capsule's right edge. The frame's Dock, unchanged.

## States reached only by interaction

Hover (the dock tints, the Listen button takes an accent edge, TOC links underline) and focus (the ring on the whole
capsule for Open the player) are reached by using the page. Scroll-driven hiding of the bars is reached by scrolling
the window (and by the "Reading on, bars hidden" preset). "Starting…" lasts about a second after Listen. The stand-in
sheets open from the dock's Open the player (alone) and from Sign in.

## Render log

- Pass 1 (Reader, `--click`): 47 states. Blocking `overprint` ×2: the loose document's top bar at 320 px and at 200%
  text ("‹ Library" crushed to 12.8 px under the language switch, also `target`). The "bars hidden" presets left the
  bars showing (the programmatic scroll's event undid them). The stage left a white band under the desktop window.
  Dark was never clicked (the state cap).
- Fixed: the signed compact top bar copied (reader-G2); the programmatic scroll ignores its own scroll events for
  400 ms; the root fills the board on the paper; window and theme presets moved first; `h` 1360 from the iPad window.
- Pass 2: `self_check=pass blocking=none`. Bars hide and the dock stays put; 320 bar wraps to two rows; follow mark
  in the start margin. Dark still not screenshotted (reader-D1).
- Measured lines, logged as intended (5 kinds, 0 fixed beyond the blocking ones):
  - `size-count` 7 sizes (11, 13, 15, 18, 21, 26, 43): the signed reader's own steps (mono label, meta, UI, body,
    lede, h2, title); Listen adds none.
  - `layout-shift` on Window presets: switching the device window resizes the window and its bar's controls by
    design (the signed reader's window row does the same); not a control showing state.
  - `layout-shift` on "Reading on", "Follow along off", "Next chapter starts": those presets set the scroll position
    (reading on); the window's page scrolls, the chrome does not move.
  - `layout-shift` on the In this document / chapter links: an in-page anchor scrolls the reading window, as built.
  - `cramped-padding` "Shipping and runnin…" 3.8 px: the dock's one-line title ends in an ellipsis at its text box's
    edge, the frame's Dock by design (the chevron follows).
- `design-check 11-listen --page reader`: OK, 1 board, 1 file.
- Critique pass 01, render 1 (`--page reader`, `--click`): 47 states; held head slot, deduped actions, logo aside at
  390, title follow mark, the new presets all as drawn; `page-clip` 1377 > 1360 on the iPad states (the bar grew a row
  with three presets). Fixed: `h` 1400. Render 2 (`--board Reader.dc.html`): no page-clip; `self_check=pass
  blocking=none`; advisory size-count and cramped-padding only, answered above.

## Critique pass 01

- C01 fixed: every layout-shift class answered in `## Measured lines` (and `open_items` reader-M1); the 390 'Library'
  resize is gone with C06.
- C02 fixed: from the press on, the head slot holds this unit's tallest note (hidden copies in one grid cell); preparing
  finishing, a dropped connection or the daily limit no longer move the text (desktop TOC at y 712 in Playing and in
  Daily limit alike). The press itself moves it once (asked); Update audio may too. Cost logged as reader-T1.
- C03 fixed: the fixture's 12:30 of 42:10 block is now in "Decay" (rx-b-5, below the fold at the top), and at the start
  (0:04) the mark sits on the title the voice is reading, so pressing Listen never puts the heard sentence under the
  dock. Where the reader scrolls is theirs (F12 never scrolls).
- C04 fixed: at the top only the head's "Continue listening" shows (reader-G5); reading on, the pill reads "Continue
  listening · 18:05" (reader-G6).
- C05 fixed: the dock carries the one action; the head's note shows its why without its button (reader-G7), except
  Update audio, which the dock lacks. Daily limit: no Play anywhere, as F7 has it (reader-G3). The head's "Playing"
  status is text, not a second action, and stays as the held slot's content.
- C06 fixed: at 390 the logo steps aside and "‹ Library" shows whole; the two-row bar starts under 23rem (reader-G2).
- C07 rebutted: it was logged in the render log ("size-count 7 sizes … the signed reader's own steps; Listen adds
  none"); now also in `## Measured lines`. The seven are the signed reader's.
- C08 fixed (answered): measured on the PNG in `## Measured lines`; the visible title ends 14 px before the chevron.
- C09 (advisory) addressed by reader-G5. C10, C11, C12 (advisory): the signed head and face, kept as signed; G4's
  one book-wide Listen, for the operator.
