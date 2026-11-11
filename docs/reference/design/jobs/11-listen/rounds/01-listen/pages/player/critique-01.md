# Critique 01: 11-listen/01-listen

- pass: 01
- mode: critic
- scope: page player
- verdict: revise
- confidence: high
- must_fix: 7 (part 1: 3, part 2a: 4)
- gaps: 2
- advisory: 1
- escalate: C06
- preview: 178s, 94 states
- standard: .claude/agents/design-drafter.md
- open_items: C01, C02, C03, C04, C05, C06, C07, C08, C09

The drafter's `preview.json` (12:05) was older than `PlayerPanel.dc.html` (12:06, its open item player-R1), so the
page was rendered again once (`design-preview 11-listen --page player --click --contact-sheet`). Every PNG cited below
is from that render. `self_check=pass blocking=none`.

## Findings

### C01 · must-fix · part 1 · open
- board: PlayerPanel.dc.html (and Player.dc.html, the same panel) · view: frame · state: 29
- finding: what counts as made moves with the listener. One tap on Next chapter turns chapter 4 from "Preparing… · part 2 of 9" into a ready "59 min", and a second tap plays chapter 4 from 0:00 of 58:40. So the chapter list says something false about what is made, and the drafter's own G5 rule (Next chapter into a chapter still preparing lands on `next-waiting`) is never reached by a click. A listener cannot trust the readiness words.
- evidence: harness on PlayerPanel (`<scratch>/h1.py`). At chapter 2 the Chapters list reads `4 … | Preparing… · part 2 of 9`, `5 … | Not prepared yet`. After Next chapter it reads `4 … | 59 min`, `5 … | Preparing… · part 2 of 9`. After a second Next it reads `knowledge maintainer guide · Chapter 4 of 5`, `0:00 of 58:40`, `Playing`. The renders `.preview/11-listen/01-listen/pages/player/PlayerPanel.frame.state-29.png` ("Next chapter > Next chapter": chapter 4 playing) and `PlayerPanel.frame.state-32.png` show the same. Cause as read: `PlayerData.js` `madeTo` returns `L.ch + 1`, a horizon relative to the current chapter. The handoff's chapter-list check says "a chapter not yet made says so". Bar line 2 says a choice carries.
- confidence: high · found_by: critic

### C02 · must-fix · part 1 · open
- board: Player.dc.html · view: frame · state: 34
- finding: Stop listening moves the reader behind the sheet from the chapter being read to chapter 1. Someone who stops the audio in chapter 2 or 4 lands on a different chapter's opening, and loses their place in the text.
- evidence: `.preview/11-listen/01-listen/pages/player/Player.frame.state-34.png`: from the Playing preset (chapter 2), all three windows show "CHAPTER 1 · knowledge: what it is and how it is used" and the chapter bar says "Chapter 1 of 5". In the harness (`<scratch>/h2.py`), Long title (chapter 4) then Stop listening gives h1 "knowledge: what it is and how it is used" in every window. Bar line 2 (a choice carries); F20 (the page's `listen` survives the move).
- confidence: high · found_by: critic

### C03 · must-fix · part 1 · open
- board: PlayerPanel.dc.html (and the three windows of Player.dc.html) · view: text200 · state: 00
- finding: at larger text the sheet head pushes Close out of the sheet and cuts off Go to the text. A listener who uses large type cannot see or tap the one visible way out of the player; only Escape or a tap on the scrim are left.
- evidence: `.preview/11-listen/01-listen/pages/player/Player.text200.png`: in all three windows the head reads "Listen  Go to th", and Close is not visible. Harness measure (`<scratch>/h4.py`, PlayerPanel, each element's font size scaled): at 320 px and 1.5×, the sheet spans 16–304 px and Close spans 285–363. At 320 px and 2×, Go to the text spans 155–353 and Close 353–449, entirely outside. The preview's `reflow` and `clipped` checks do not name it, because the overflow is clipped by the sheet rather than by the button. Craft, Toss-level care: "Long names, two-line labels and larger text still hold". Part 1: nothing clipped.
- confidence: high · found_by: critic

### C04 · must-fix · part 2a · open
- board: Player.dc.html, PlayerStates.dc.html · view: frame · state: 27
- finding: in the Earlier version state, two accent-filled buttons compete: Update audio and the 64 px Pause. The eye goes back and forth between them, and the screen no longer has one obvious action.
- evidence: `.preview/11-listen/01-listen/pages/player/Player.frame.state-27.png`, the 390 and 320 windows: the "Update audio" filled accent button sits directly above the filled accent Pause. PlayerStates "Earlier version" shows the same. Craft, Hierarchy: "One primary action per screen; secondary actions look secondary". F6: "The note's one action (F10) is the only accent button Listen adds". G1 settles the transport actions, but it does not cover the accent clash for Update audio.
- confidence: medium · found_by: critic

### C05 · must-fix · part 2a · open
- board: Player.dc.html, PlayerPanel.dc.html, PlayerStates.dc.html · view: frame · state: 08
- finding: the resume row reverses the weight of label and action. "Continue listening" is a semibold ink label that cannot be tapped, while the actual button beside it, "Start over", is set quieter in grey. A tap on the bolder words does nothing. The row's qualifier "Chapter 4 · 12:30" also repeats the meta line ("Chapter 4 of 5") just above it and the 34 px "12:30" just below it.
- evidence: `.preview/11-listen/01-listen/pages/player/Player.frame.state-08.png`, the 390 window: "Continue listening  Chapter 4 · 12:30 … Start over", then "12:30 of 58:40". The markup in `PlayerPanel.dc.html` puts "Continue listening" in a `<span class="pl-resume__word">` (semibold, `kb-ink`) inside a `<p>`, and "Start over" in a `button.lx-over` (semibold, `kb-secondary`). Craft, Hierarchy: "secondary actions look secondary". Craft, Copy: "Cut every word and sentence that adds nothing".
- confidence: medium · found_by: critic

### C06 · must-fix · part 2a · escalated
- board: Player.dc.html · view: frame · state: 00
- finding: in the phone 320 × 568 window the sheet's visible end falls exactly on the Speed row's hairline, so the player looks complete. Follow along, Chapters and Stop listening sit below the fold with no sign that more is there.
- evidence: `.preview/11-listen/01-listen/pages/player/Player.frame.png`, the 320 window: the sheet ends at the Speed row and its hairline. Harness: in the 320 window `.rd-sheet__body` has clientHeight 441 and scrollHeight 629 (overflow auto). Craft, Polish: "Deliberate crops … cut on purpose …, never by accident".
- confidence: low · found_by: critic

### C07 · must-fix · part 2a · open
- board: PlayerPanel.dc.html, Player.dc.html, PlayerStates.dc.html · view: frame · state: 13
- finding: one disabled transport row shows two disabled looks. The disabled skips and chapter buttons are faint hint grey with no fill. The disabled 64 px Play is a filled disc with a dark icon, so the largest control on the screen looks available while its neighbours look off. Unlike the enabled Play, the disabled Play also carries no link to the note that explains why it is blocked.
- evidence: harness, Waiting for the Mac preset (`<scratch>/h3.py`): Back 15 seconds is disabled with color `rgb(143,134,118)` on a transparent background; Play is disabled with color `rgb(92,83,71)` on `rgb(239,233,219)` and `aria-describedby` null. The two looks come from `PlayerPanel.dc.html`'s `.pl-transport .lx-round:disabled:not(.lx-round--l)` for the small buttons against frame.css's `.lx-round:disabled` for the large one. Seen on `.preview/11-listen/01-listen/pages/player/Player.frame.state-13.png` and `state-24.png`. Craft, Interaction: "Every interactive element has its states". Craft, Toss-level care: "Explain why an action is needed or blocked (a disabled button says why)".
- confidence: medium · found_by: critic

### C08 · gap · part 1 · open
- board: Player.dc.html · view: frame, w320, text200 · state: 08, 11
- finding: frame parts fail measured lines inside this page's windows, and the page may not restyle them. In the signed ChapterBar, the narrow labels are clipped (`rd-bnav__dir`, `rd-bnav__sub`; a 1×1 visually-hidden pattern) and the first line is off by 9.5 px. In the Shell on a loose document at 320, "‹ Library" is 12.8 × 44 px. The Dock title is clipped at 200 % text and sits 3.8 px from the chevron.
- evidence: the re-render's lines: `check=clipped` span.rd-bnav__dir/rd-bnav__sub (frame, text200), `check=target` a.rd-back "Library" 12.8x44 (state 11), `check=clipped` p.lx-dock__title (text200), `check=cramped-padding` 3.8px (state 08), `check=align` first-line 9.5px. All of these are logged in the page's `component_gaps:`. They are for the frame or join owner; the 12.8 px back-link target is a real target miss.
- confidence: high · found_by: measured

### C09 · gap · part 1 · open
- board: PlayerPanel.dc.html · view: frame · state: 00
- finding: the system has no audio or seek component, so the seek bar is a native range drawn on the tokens.
- evidence: `result.md` `component_gaps:` first line; `input.pl-seek`, 44 px tall, `aria-valuetext="12:30 of 1:07:10"`.
- confidence: high · found_by: critic

### C10 · advisory · part 2b · open
- board: Player.dc.html · view: frame · state: 00
- finding: on desktop the 26rem side sheet covers the right third of the dimmed reading column and the dock's end. The handoff allows this (the column is not hidden entirely, and it is dimmed by the scrim). The trade-off is that the line being read may sit under the sheet, against a player that never covers the text behind it.
- evidence: `.preview/11-listen/01-listen/pages/player/Player.frame.png`, the desktop window: the paragraph lines and the dock run under the sheet at x≈1000.
- confidence: medium · found_by: critic

## For the judge

- C06 · low confidence (critic alone: for the operator, marked unsure). Whether the 320 fold reads as the sheet's end is an eye call, and the fold moves with the title's length.

## Scorecard

| board | Part 1 | Part 2a |
|---|---|---|
| Player.dc.html | C02, C03 (C01 through the panel) | C04, C05, C06, C07 |
| PlayerPanel.dc.html | C01, C03 | C05, C07 |
| PlayerStates.dc.html | ok | C04, C05, C07 |

- **Component gaps:** C08 (frame parts measured in this page: ChapterBar labels, Shell "Library" target at 320, Dock title at 200 % and its padding, ChapterBar first line); C09 (no seek component).
- **2b for the operator:** On desktop the Listen sheet covers about a third of the dimmed reading column, including the line being read and the dock's end. The handoff allows it; the trade-off is a column that stays fully visible behind the player.
- **The bar:**
  1. holds: made chapter rows open their own chapter (rows 2 and 3 picked in the harness: chapter 2 at 0:00 of 1:07:10, chapter 3 at 0:00 of 44:05); unmade rows are not buttons.
  2. C01, C02.
  3. holds where it applies: no search or filters on this page. The readiness words are C01.
  4. holds: the bar is in flow and lists only the Player's 31 presets (sunken, dashed, no accent). Each preset lands; the three dark presets were reached by the harness.
  5. holds: every link is inert `#top` (Shell, ChapterBar), there is no external href, and `design-check --page player` is OK.
  6. holds: no `layout-shift` line. Play, Pause, Start over and Try again keep one 64 px disc. Speed and Chapters open as disclosures that push only the rows below them.
  7. holds where it applies: no list header that filters.
  8. holds: on hover the round button tints darker, the skip button gets a soft disc and the rows underline their label (`<scratch>/c-hover-*.png`).
  9. holds within the page: the back link has its chevron (Shell), and the transport is centred on one grid with the chapters on the body's edges.
  10. holds: one direction; inline SVG only for 24 px media icons (F5).
  11. C03 (larger text), C04 (one primary), C07 (a disabled button says why).
- **Holds** (must survive the fixes):
  - every handoff state is reachable by a preset or a click: playing, paused, buffering, speed choice, chapters, next chapter preparing, finished (book and document), the four failures and the daily limit, three offline states, resume offered, earlier version, a document with no chapter controls, the long title at 320, the Korean title (one line, `keep-all`), and dark.
  - the position is the focal point: 34 px Fraunces with "of 1:07:10" on one baseline, tabular.
  - every control has a name and a target of at least 44 px (no `target` or `name` line on the panel).
  - speed choice: the current value is marked, choosing closes the list, and focus returns to the Speed row (harness: `.pl-speeds` is gone, focus is on "Speed 1.5×").
  - a 20-chapter list scrolls inside the sheet; readiness is told in words, quietly.
  - desktop: the column stays visible, dimmed by `kb-scrim`.
  - dark contrast measured clean on PlayerStates.
  - player-R1 verified by the re-render: no `lx-sr` clipped line, and PlayerPanel at h 1180 is not clipped.
  - frame departures: each one is logged as G1–G9.
  - the advisory measured lines: each is answered with a reason that holds (control-height 44 vs 64 by F15, flat-type-steps from the signed sheet title, size-count from the reader stand-in and the frame's mono reference, token-drift for 1–2 px edges).
- **Not seen:**
  - the seek bar dragged with a pointer or with arrow keys (the native range is not driven by the click pass).
  - focus rings judged by eye beyond the round button.
  - every row of the 20-chapter list clicked (rows 2 and 3 of the guide only).
  - the "Updating…" transient after Update audio.
  - the real behaviour of the reader stand-in's links behind the sheet: they are inert `#top`, and the join's to wire.
  - the system README for the frame parts: their API was read from frame.md F21.
