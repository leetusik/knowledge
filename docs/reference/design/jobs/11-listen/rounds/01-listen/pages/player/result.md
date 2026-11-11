status: done
pass: page player
job: 11-listen
round: 01-listen
boards: Player.dc.html (Page), PlayerPanel.dc.html (component), PlayerStates.dc.html (its states); data PlayerData.js
frame_gaps:
- player-G1 the note's action where the transport carries it: in the player the 64 px round button is the one action (Play for ready, tap and the daily limit, Start over when finished, Try again for the three retry failures), so the ListenNote shows its word, sentence, line and reference without its own button. Drawn by mounting ListenNote inside `.pl-zone--noact`, which hides its `.rd-btn`; proposed answer: ListenNote gains `act` (default true; false in the player). Sign in and Update audio stay the note's buttons (they are not transport actions).
- player-G2 the status line for the four live states (playing, paused, loading, buffering) is the frame's trio word alone (`.lx-status`, F1 words, the ring for the two pending ones), not ListenNote, whose sentence for these states repeats the position the player already shows big.
- player-G3 the resume offer in the player (revised in critique pass 01, C05): the zone is the trio word `Paused` (idle) with "Start over" (`.lx-over`) on the row's end; the 64 px accent Play is named "Continue listening" and described by the word. F6's "Continue listening" + `Chapter 4 · 12:30` row is not repeated in the player: the meta line and the 34 px position already say where. The Listen object gains `offer: true` (set when a Listen left part-way is opened; any play, seek or Start over clears it).
- player-G4 the Listen object (F19) also carries `len` (the made length while `soFar`: `3:00`, `9:40`, `14:00`), `updating` (Update audio pressed, "Updating…") and `made` (a book: the last chapter whose audio is made; fixture 3 for the guide started at 2, so 2–3 made, 4 "Preparing… · part 2 of 9", 5 "Not prepared yet"). `made` moves only with the making, never with the listener's chapter (C01); `finished` reads as all made.
- player-G5 chapter moves: a chapter not yet made is a plain row (not a button) whose meta says "Preparing… · part 2 of 9" or "Not prepared yet"; Next chapter (or a pick) into a chapter past `made` lands on `next-waiting` (from chapter 3 in the fixture: chapter 4); Previous chapter in the first seconds of a chapter goes to the one before (within the Listen), otherwise to this chapter's start; Next chapter is disabled on the last chapter.
- player-G6 the current chapter row: the signed accent-soft fill measured 1.24:1 (light) and 1.47:1 (dark) as a button's boundary (1.4.11, blocking); drawn with a 1px `kb-accent` edge in a border every row carries (the round-03 language switch's rule), so nothing moves.
- player-G7 the scrim: the signed reader draws it as a `<button tabindex="-1">`; as a control its kb-scrim fill measures 2.54:1 (blocking). Drawn as an `aria-hidden` surface that closes the sheet on tap; Close and Escape are the keyboard's way. The reader page should match (the join settles).
- player-G8 no live region inside the player: the dock stays mounted under the sheet and its `role="status"` (F7) announces; a second region would announce twice.
- player-G10 one disabled look in the transport (C07): every disabled round button there has no fill and `kb-hint` ink; the 64 px keeps a `kb-border-strong` ring so its slot holds. Overrides frame.css `.lx-round:disabled` (the sunken disc) inside `.pl-transport` only; the dock keeps the frame's look. The disabled Play is described by the note that says why (`aria-describedby` the note's wrapper).
- player-G11 in the player the round button is the one accent (C04): the outdated note's Update audio renders as a secondary button (the `rd-btn--secondary` values), drawn by a page-scoped rule on ListenNote's button; proposed answer: ListenNote gains `tone` (`primary` default, `secondary` in the player's outdated state). Sign in stays accent (the round button is disabled then).
- player-G12 the signed sheet head wraps in the player (C03): at larger text Go to the text and Close wrap under the title, end-aligned, inside the sheet; at default sizes nothing changes. The reader's sheets may want the same (the join settles).
- player-G13 a scroll cue on the modal sheet's body (C06): the classic cover-and-shade background (covers `kb-surface`, attached to the content; shades `kb-border-strong`, 12 px, attached to the box), so a shade shows at an end only while more is there. Not on the inline board.
- player-G9 the player's own controls not named in F8: "Go to the text" sits in the sheet head before Close; Speed, Follow along and Chapters are rows of a hairline list under the transport (Speed and Chapters open in place below their row; opening Chapters scrolls the sheet body to that row); "Stop listening" is a text action at the foot.
events:
- Player: `on-close` `{ listen }`, `on-go-to-text` `{ listen }`, `on-listen` `{ listen }` (null on Stop listening)
- PlayerPanel: the same three, plus `on-panel` (`'speed' | 'chapters' | null`)
component_gaps:
- player: no audio or seek component in the system; the seek bar is a native `<input type="range">` styled on the tokens (4 px track: kb-accent played, `--rd-control-edge` rest; 18 px accent thumb), arrow keys move it 5 s.
- player: frame parts measured in this page's windows, logged, not restyled (frame files): the signed ChapterBar's narrow labels (`rd-bnav__dir`, `rd-bnav__sub`) read as clipped at 320 and at 200 % text (a visually-hidden pattern, `check=clipped`); the signed Shell on a loose document at 320 leaves "‹ Library" 12.8 px wide (`check=target`); the Dock's title is clipped at 200 % text and its long chapter title sits 3.8 px from the chevron (`check=cramped-padding`); the chapter bar's first-line 9.5 px (`check=align`, already logged by the frame).
open_items:
- player-Q1 the player shows the chapters before the one Listen started from (chapter 1 when Listen began at 2) as "Not prepared yet", not selectable; whether picking one should start a new Listen from there is the operator's call.
- player-Q2 the doc stand-in behind the sheet reuses the signed reader fixture's four paragraphs (English) for every unit, the Korean document included (no document text may be shown).

## Summary

`Player.dc.html`: one Listen in three windows (phone 390 × 844, 320 × 568, desktop), the reader behind `kb-scrim`
with the dock, the player in the signed sheet (bottom below 40rem, right 26rem above). `PlayerPanel.dc.html` (also
its own board): meta, title (22 px Fraunces), status word or note, the position (34 px Fraunces, "of 1:07:10"), seek,
transport (chapters on the edges, ±15 s and the 64 px play centred), Speed, Follow along and Chapters rows, Stop
listening. 31 presets reach every handoff state. `PlayerStates.dc.html`: 27 states, light, dark, 320. Frame gaps
G1–G13 (incl. `made` on the Listen, one disabled look, Update audio secondary, wrapping head, scroll cue).
Critique 01: C01–C07 fixed, gaps C08–C09 logged. Open: Q1, Q2. Self-check pass.

## Build (the player page's fragment)

Canvas-only, never built: the state bar, the three windows and the reader stand-in inside them (`.lx-win`, the four
fixture paragraphs), `PlayerStates`, `PlayerData.js` (the fixture), the `bare`/`inline`/`uid` props.

- **Where:** the reader's sheet layer (F8): `rd-sheet rd-sheet--right` (bottom sheet below 40rem, 88 % max; right
  26rem from 40rem, full height under the progress line), over `kb-scrim`, `role="dialog" aria-modal="true"
  aria-label="Listen"`. Opened by the dock's chevron (`aria-haspopup="dialog"`); focus goes to Close; Close, Go to
  the text, Escape and a tap on the scrim close it and return focus to the dock's chevron. The scrim is a surface,
  not a button (G7). The dock stays mounted under it and keeps the one live region (G8).
- **Head:** "Listen" (`rd-sheet__title`), then two `rd-btn--quiet` (the head wraps at larger text, the two buttons
  end-aligned under the title, G12): **Go to the text** (closes, scrolls the reader
  once to the block whose id the playing segment carries, at `listen.ch`) and **Close**.
- **Body** (`rd-sheet__body`, scrolls inside, `overscroll-behavior: contain`, with the scroll cue of G13): a stack,
  gap `kb-space-lg`:
  1. meta 13 px secondary, a book only: `knowledge maintainer guide · Chapter 2 of 5`; title `h3` Fraunces 600 22 px /
     1.25, `text-wrap: balance`; a Korean title in `--font-body` (Pretendard for Hangul) with `keep-all`;
  2. the zone, one of: the trio word (`Playing` active; `Paused` idle; `Loading…`, `Buffering…` idle with the ring);
     ListenNote for every other state (F10 words) without its button when the round button carries it (G1), with it
     for Sign in (accent) and Update audio (secondary, G11; `old: true` while live shows the `outdated` note); the
     resume row, `Paused` + Start over on its end (G3);
  3. the position, only where audio exists (not waiting, making, fail-voice, fail-unreadable, offline-start,
     next-waiting): `12:30` Fraunces 600 34 px tabular lining + `of 1:07:10` (`of 9:40 so far` while making) 15 px
     secondary, one baseline; under it (gap xs) the seek bar, 44 px tall, `aria-label="Position"`,
     `aria-valuetext="12:30 of 1:07:10"`, step 5 s, disabled when nothing plays;
  4. the transport: grid `minmax(44px,1fr) auto minmax(44px,1fr)`: Previous chapter on the start edge, Next chapter on
     the end edge (a book only; no empty slots on a document), between them Back 15 seconds, the 64 px round button,
     Forward 15 seconds (gap `kb-space-md`; F5 icons). The round button by state (the Dock's lead rule): Play (ready,
     tap, paused, daily limit with audio ready; named "Continue listening" on the resume offer), Pause (loading,
     playing, buffering, next-waiting, offline-play), Start over (finished), Try again (fail-voice, fail-play,
     fail-unreadable), disabled Play (waiting, making, signed out, offline-start, offline-stopped), described by the
     note. Skip, seek and chapter buttons are disabled with it; Next chapter also on the last chapter. Disabled, all
     read alike: no fill, `kb-hint` ink, the 64 px keeps a `kb-border-strong` ring (G10);
  5. the rows (`ul`, hairlines `kb-border`), each a full-width 44 px button, label 15/600 on the start edge, value
     15/400 secondary on the end edge: **Speed** `1×` + chevron (`aria-expanded`; opens six `rd-opt` options,
     `0.75×`…`2×`, `aria-pressed`, accent-soft + accent edge on the current, six columns, three below 22rem; choosing
     closes and returns focus to the row); **Follow along** `role="switch"`, `On`/`Off` + a 36 × 22 track (knob end
     and accent fill when on); **Chapters** (a book) `Chapter 2 of 5` + chevron, opens the signed chapter list in
     place (made chapters are buttons with their length; unmade ones plain rows with their readiness, F11; the
     current one `aria-current`, its meta led by `Playing`/`Paused` in `rd-ch__now`, with a 1px accent edge, G6);
  6. **Stop listening** (`.lx-over`), which ends the Listen and removes the dock; no confirm (F17). The reader
     behind stays on the unit and chapter being read (C02).
- **Behaviour:** every change emits the whole Listen (`on-listen`); speed and follow are the listener's; Previous /
  Next / a chapter pick seek inside the one stream (G5); what is made (`listen.made`) comes from the making, never
  from the chapter the listener is on; ±15 s clamps to 0 and the made length.
- **States drawn** (presets): playing, paused, loading, buffering, speed choice, chapters, next chapter preparing,
  finished (book, document), resume offered, long title, 20 chapters, document, Korean, waiting, preparing, first part
  ready, tap to play, playing while preparing, the four failures plus the daily limit, offline ×3, earlier version,
  dark (playing, signed out, chapters).

## Intent

- **Player** — a listener who opened the player from the dock, on the phone with one hand or at the desk; they
  came to see where they are and to move (pause, skip, speed, another chapter). First they see the position,
  big, and the one round button that plays or pauses.

## Plan (reviewed against the handoff and the bar before building)

- Boards: `Player.dc.html` (Page, interactive), `PlayerPanel.dc.html` (the sheet: a page-local component the Page
  and the join can mount), `PlayerStates.dc.html` (its states). Data in `PlayerData.js` (window.PL).
- Type: 13 meta · 15 controls and rows · 18 sheet title (signed) · 22 title · 34 position (the one bold move).
  Space xs/sm/md/lg. Accent only on the round button, the seek, the pressed speed, the switch when on and the
  current chapter.
- Revised before building: a tab pair ("Now playing / Chapters") was cut as template chrome; Chapters and Speed are
  disclosures in the row list. Revised after render 1: the Chapters list was below the fold at 320, so opening it
  scrolls the sheet body to its row; Chapters moved after Follow along so opening it moves nothing below but Stop
  listening.

Wireframe (phone 390, sheet body 356 px; every row on the body's two edges):

```
 Listen                       Go to the text  Close     <- signed sheet head
 ---------------------------------------------------
 knowledge maintainer guide · Chapter 2 of 5          13 secondary
 System internals: the content plane, the             22 Fraunces, wraps
 write path and the contracts
 * Playing                                             trio word, or the note
 12:30  of 1:07:10                                     34 + 15, one baseline
 [======o-----------------------------------]          seek, 44 px tall
 |<        (15)   ( || 64 )   (15)         >|          chapters on the edges
 ---------------------------------------------------
 Speed                                     1×   v
 Follow along                              On  (-o)
 Chapters                      Chapter 2 of 5   v      opens the list here
 ---------------------------------------------------
 Stop listening
```

## Data

Real: the five chapter titles and the two document titles (brief); lengths, parts, positions and clock times from
frame.md F18 (exact chapter lengths 38:20, 1:07:10, 44:05, 58:40, 31:15; `bar` 42:10, `bar-ko` 50:25); copy from F1,
F6, F10. The reader stand-in reuses the signed 01-reader fixture paragraphs (as the frame's boards do). Placeholders:
`[PROJECT]`, `[Chapter n title]` (changple5). Made up on this page: the "part 2 of 9" of the chapter being prepared
(F18's changple5 figure, reused for the guide's chapter 4).

## States reached only by interaction

Hover (rows underline their label; speed options take an accent edge; round buttons tint), focus (the system ring;
the seek bar's ring), the closed sheet with the dock (Close), the reader scrolled to the followed block (Go to the
text), the reader with no dock (Stop listening). The click-through hit its 48-state cap before the three dark presets;
the dark panel is on `PlayerStates`.

## Measured lines

- Fixed (6): non-text-contrast scrim and current chapter row (blocking, G6/G7); overflow of PlayerStates (2302 px) and
  PlayerPanel alone (598 px), both from the live region's unclipped text (removed, G8; the alone board now renders
  inline); frame-clip of PlayerStates (h 7100) and PlayerPanel (h 1180).
- Logged as intended (5): `control-height` 20 px (44 px skip vs the 64 px play, F15's two heights); `flat-type-steps`
  15 → 18 (the signed sheet title); `size-count` 9 on Player (the reader stand-in's signed head sizes at three window
  widths; the player itself uses 11, 13, 15, 18, 22, 34) and 7 on PlayerStates (ListenNote's 12 px mono reference,
  frame); `token-drift` (2 px thumb ring, 1 px thumb edge, 1.5 px switch edge: no token of that meaning).
- Frame parts (logged under component_gaps): clipped chapter-bar labels, the "Library" target at 320, the Dock's
  cramped title and clipped title at 200 %, the chapter bar's first-line 9.5 px.

## Render log

- Pass 1 (Player, PlayerPanel, PlayerStates; --click): self_check fail, blocking non-text-contrast ×3 (scrim, current
  chapter row light and dark); overflow on PlayerStates and PlayerPanel; frame-clip on PlayerStates. Seen on the PNGs:
  the chapter list out of view at 320 when opened. Fixed as above.
- Pass 2 (same boards): `self_check=pass blocking=none`; remaining: the live region measured clipped (removed after
  this pass, R1), PlayerPanel's board too short for the open chapter list (h set, R1), the advisory lines logged above.
- `design-check 11-listen --page player`: OK, 3 boards, 3 files, 1 warning (token-drift, logged).
- Critique pass 01 render (Player, PlayerPanel, PlayerStates; --click, 94 states): `self_check=pass blocking=none`;
  R1 verified (no `lx-sr` clipped line, PlayerPanel 1180 not clipped); seen: C01–C07 fixed on states 08, 13, 27, 34,
  text200 and PlayerPanel 29/32; new `unmeasured` on Player logged as intended. `design-check --page player`: OK.

## Critique pass 01

Answered `pages/player/critique-01.md` (mode critic, nothing held). Render: one pass of the three boards with
`--click` (self_check pass, blocking none); `design-check 11-listen --page player` OK.

- C01 fixed: `made` is a field of the Listen (BASE 3), and `PlayerData.madeTo` reads it instead of `ch + 1`. From
  chapter 2, Next goes to 3 (made) and the list still says 4 "Preparing… · part 2 of 9"; a second Next lands on
  `next-waiting` for chapter 4 (PlayerPanel state 29, 32). Presets that sit past 3 carry their own `made` (Resume
  and Long title 4, Finished 5, 20 chapters 6); "Next chapter preparing" now waits on chapter 4.
- C02 fixed: Player keeps `reading` (unit, chapter) when the Listen goes to null, so Stop listening leaves the reader on
  the chapter being read (state 34: chapter 2 in all three windows); a preset clears it.
- C03 fixed: the sheet head wraps (`flex-wrap`, end cluster pushed to the end, itself wrapping); at 200 % text Go to
  the text and Close sit inside the sheet in every window (Player.text200.png). G12.
- C04 fixed: the outdated note's Update audio is a secondary button in the player, so the round button is the one
  accent (state 27). G11.
- C05 fixed: the bold, untappable "Continue listening" and the repeated `Chapter 4 · 12:30` are gone; the zone is the
  `Paused` trio word with Start over on its end, and the accent Play keeps the name "Continue listening" (state 08). G3.
- C06 fixed (critic marked it low confidence): a scroll cue on the modal sheet body, a 12 px `kb-border-strong`
  shade at an end only while more content is there; at 320 × 568 it sits under the transport (state 08, 13). G13.
- C07 fixed: one disabled look in the transport, no fill and hint ink, the 64 px keeping a ring; the disabled Play is
  `aria-describedby` the note that says why. G10.
- C08 gap, kept as logged under `component_gaps:` (ChapterBar labels, Shell "Library" 12.8 px target at 320, Dock
  title at 200 % and its padding, ChapterBar first-line): frame parts, for the frame or join owner.
- C09 gap, kept as logged (no seek component).
- C10 advisory: for the operator (2b); unchanged.
- New measured line: `unmeasured` on Player (36 text runs, 15 control boundaries on the sheet body): the body's
  background is now `kb-surface` plus the scroll cue's gradients, so contrast is not measured; judged on the PNG, the
  text sits on `kb-surface` exactly as before (the covers are `kb-surface`; the shade lies only at an end). Logged as
  intended. PlayerPanel and PlayerStates (inline, no cue) carry no such line.
