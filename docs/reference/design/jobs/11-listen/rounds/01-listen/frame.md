# Frame — 11-listen / 01-listen

The shared choices every page draws from. One answer each. A page that needs a choice not here logs a `frame_gaps:`
entry with the answer it drew; the join settles it as a new `F<n>` below. "As built" quotes the repo; everything else
is this frame's answer. The handoff's five open questions are answered for drawing only (F13), still the operator's.

Files: `canvas/project/frame.css` (Part 1 the signed reader, copied; Part 2 the primitives; Part 3 Listen; Part 4
board layout), `Shell.dc.html` (the top bar, as signed), `ChapterBar.dc.html` (the chapter bar, as signed),
`Listen.dc.html`, `Dock.dc.html`, `ListenNote.dc.html`, and the states boards `ShellStates`, `ListenStates`,
`DockStates`, `ListenNoteStates`, `IconStates`. The logo is copied to `assets/logo.svg` (job 10's copy of the mark).

## F1 · Words (the glossary)

- **Listen** — the feature, its control and the opened player's sheet title. Never "Play audio", "Read aloud".
- **Continue listening** (resume; the book page's "Continue reading" is the precedent) · **Start over** (from the
  start of the unit, also after Finished; never "Restart", "Replay").
- Controls (accessible names, sentence case): **Play**, **Pause**, **Back 15 seconds**, **Forward 15 seconds**,
  **Previous chapter**, **Next chapter**, **Speed**, **Chapters**, **Go to the text**, **Close**, **Follow along**,
  **Stop listening**, **Open the player** (the dock), **Try again**, **Sign in**, **Update audio**.
- State words (the dock's first word; the note's status word): **Waiting**, **Preparing…**, **Ready** / **Ready to
  play**, **Loading…**, **Buffering…**, **Playing**, **Paused**, **Finished**, **Stopped**, **Daily limit**,
  **Signed out**, **Can't be read aloud**, **Offline**, **Earlier version**.
- Pending labels, verb plus "…" (README): Listen → **Starting…**; Update audio → **Updating…**; the making itself is
  **Preparing…** (never "Generating", "Making", "Rendering", "Converting").
- Chapter readiness in a list (F11): **Ready**, **Preparing…**, **Not prepared yet**, and the current one's state
  word (**Playing** / **Paused**) in the list's "Reading now" style.
- The voice runner is named for what it is to the operator: **the Mac** (a prop; never a host or account name).

## F2 · Formats

- **A position**: `m:ss` under an hour (`12:30`, `0:04`), `h:mm:ss` from an hour (`1:02:45`); tabular figures.
  A position with its length: `12:30 of 42:10`; while the rest is still preparing, `2:10 of 9:40 so far`.
  In a book a position is the chapter's: `Chapter 4 · 12:30`. The book's whole position is never shown as a time.
- **A length** (made audio): `42 min` under an hour (whole minutes), `1 h 7 min` from an hour. A unit not yet made
  shows **no length**.
- **A sum over chapters** (a book, "Chapters 2–5"): rounded to the half hour with "about": `about 4 h`,
  `about 3 h 30 min`; shown only once every chapter in the sum is made.
- **Time left preparing**: always "about", rounded (`about 15 min`, `about 1 h 30 min`; under five minutes `under
  5 min`), and never before the first part is done (F9).
- **Clock times**: 24-hour as built (`lib/review/model.ts`, en-GB, h23): `19:55`, `09:00`; a day word when it is not
  today: `09:00 tomorrow`. Dates as built (`lib/reader/date.ts`): `3 Nov 2026`.
- **Speed**: `0.75×`, `1×`, `1.25×`, `1.5×`, `1.75×`, `2×` (the multiplication sign, no space).
- **Counts**: `Part 3 of 12`, `Chapter 2 of 5`, `Chapters 2–5` (en dash), `5 chapters`.

## F3 · Speed

Six values (F2), default `1×`, remembered per listener (not per document). The control is the current value as a
word button (`1×`), never an icon; its choice lists the six with the current one marked (accent-soft row, as the
signed Display options). Speed changes the pace only; positions and lengths stay audio time.

## F4 · Skip

**15 seconds** both ways, the same as the lock screen's (R3). In the page only in the opened player (the dock carries
play/pause alone). The numeral sits inside the arrow (11 px, bold, tabular).

## F5 · The media icons (one set)

The handoff licenses inline stroke SVG for media only (the README has no icon set and keeps words for everything
else). 24 px box, stroke 1.75, round caps and joins, `currentColor`; play and pause solid. Names: `play`, `pause`,
`back` (15 s), `fwd` (15 s), `prev` / `next` (chapter), `again` (Start over), `retry` (Try again), `open` (the dock's
chevron). The busy state is the README's ring spinner, not an icon. Every icon is `aria-hidden` inside a named button.
Paths: `frame.css` Part 3 (`.lx-i--*`); the build inlines the same paths. Speed, Chapters, Close, Go to the text and
Follow along stay words.

## F6 · The Listen control — where it sits and its forms

- **In the head**, under the chapter opening's meta line (`rd-head__meta`), on the column's start edge: a secondary
  button (`rd-btn--secondary`, the play mark in accent, the word Listen) and its qualifier in meta type beside it,
  on the button's centre line. The qualifier is the button's description (`aria-describedby`).
  - document, made: `42 min`; not yet made: nothing;
  - chapter: `Chapters 2–5` (plus `· about 3 h 30 min` once all are made) — the scope says it goes on past this
    chapter (OQ1);
  - book landing: `5 chapters · about 4 h` (or `5 chapters` before it is made);
  - left part-way: **Continue listening** + `Chapter 4 · 12:30` (or `18:05 of 42:10`), with **Start over** as a text
    action on its own row under it, on the column's edge.
- **While reading — the bottom slot.** The top bar is full on a loose document at 390 px (logo, back, language,
  Notes, Display), so Listen adds nothing to it (the signed bar is untouched). Instead, whenever the reader's chrome
  shows (scroll up, a tap, the top), an idle **Listen pill** shows in the reader's bottom slot, where the dock will
  sit: the resume pill's look (`rd-resume`) as one 44 px button, `▶ Listen · 42 min`, centred on the column. It hides
  with the top bar (the `.rd-top-hidden .rd-resume` rule), and gives way to the resume pill while that is up.
- **Pressed** → `Starting…` (busy, rest width kept) until the dock answers, then the control in the head shows the
  dock's state through a ListenNote (the reader page's choice) and the pill becomes the dock.
- Primary or not: Listen is secondary everywhere (reading stays the page's primary; the book landing's "Continue
  reading" stays its one accent button). The note's one action (F10) is the only accent button Listen adds.

## F7 · The dock

- **One component (`Dock`)**, used on `reader` and `book`; present from the first tap until **Stop listening**.
- **Form:** a capsule (`kb-radius-pill`) on `kb-surface`, 1 px `kb-border`, `kb-shadow-raise` — the reader's own
  bottom-slot pills, made column-wide. 64 px tall: 9.6 px padding (`kb-space-sm`) around a 44 px circle, so the
  circle is concentric with the capsule. Grid: **lead** (44 px circle) · **text** (title 15 px semibold, one line,
  ellipsis; status 13 px secondary, state word in ink semibold) · **end** (the 44 px `open` chevron, whose hit area
  stretches over the whole capsule; or the one text action, Sign in).
- **Lead by state**: Play (ready, tap, paused) · Pause (loading, playing, buffering, next chapter preparing, offline
  mid-play) · Start over (finished) · Try again (voice failed, playback error, unreadable) · a disabled Play (waiting,
  preparing, daily limit, offline, signed out). The lead never changes size.
- **Place:** the reader's bottom slot, on the text column's two edges (the slot is the one track, `rd-flow`):
  `bottom: --rd-bot-h + kb-space-sm` on a chapter (above the chapter bar), `kb-space-md` on a loose document and on
  the book landing. It **stays put**: the top bar and the chapter bar hide and return around it; it never follows them.
  `z-index` 21: over the page, under the scrim (35) and every sheet (40), so a sheet or drawer covers it.
- **The page clears it:** while docked, the page's end padding grows by the dock's height plus `kb-space-sm`, so the
  last line and the chapter's end scroll clear of it.
- **The bottom slot stacks:** with the dock up, the resume pill, the undo toast and the save prompt sit above it
  (`dock bottom + dock height + kb-space-xs`).
- **Desktop:** the same capsule, the column's width (36rem; 44rem from 1600 px); no extra controls.
- **Screen readers:** the dock is a region named "Listen"; a polite live region announces state changes and chapter
  changes ("Playing: chapter 3, …"), never the ticking position.

## F8 · The opened player's container

The reader's sheet, as signed: a bottom sheet (max 88 %) below 40rem, the right-hand side sheet (`rd-sheet--right`,
26rem) from 40rem, over `kb-scrim`; head "Listen" (Fraunces 18 px, the signed sheet title) with **Close** at its end.
On desktop the column stays visible, dimmed by the scrim. The dock opens it (`aria-haspopup="dialog"`); Close and
Go to the text return focus to the dock. The player page draws its content on one grid.

## F9 · The preparing progress

- Words always; the line where there is room (the note, the player, the book landing), never in the dock.
- The line is the reading progress line's look: a 3 px `kb-border` track with a `kb-accent` fill, rounded.
- A document: `Part 3 of 12 · about 15 min left.` (fill = parts done / parts). Before the first part is done:
  `Part 1 of 12. You can play once this part is ready.` (no time left yet).
- A book: `Chapter 2 of 5 · about 1 h 30 min left.` (fill = chapters done / chapters); per-chapter words in lists (F11).
- Never a percentage figure, never seconds.

## F10 · Messages (the note's state word, its sentence and its one action)

The `ListenNote` component is the one source; the dock carries the short form.

| state | word (trio) | sentence | action |
|---|---|---|---|
| waiting | Waiting (idle) | Waiting for the Mac, last seen 19:55. Preparing starts by itself when it's on. | — |
| making | Preparing… (idle) | F9 | — |
| ready (first part) | Ready (active) | The first 3 min are ready to play; the rest is still preparing. + line | Play |
| tap | Ready (active) | It's ready. Your phone needs one more tap to start playing. | Play |
| next chapter preparing | Preparing… (idle) | Chapter 3 is still preparing, about 5 min. It plays by itself when it's ready. | — |
| finished | Finished (active) | You've listened to the end. / You've listened to all 5 chapters. | Start over |
| voice failed | Stopped (revoked) | Something on our side stopped preparing this audio at part 4 of 12. + `Error · 502` | Try again |
| daily limit | Daily limit (idle) | The free voice's daily limit is reached. Preparing goes on by itself at 09:00 tomorrow. [The first 14 min are ready to play.] | Play, when part is ready |
| playback error | Stopped (revoked) | The connection dropped, so playback stopped at 12:30. | Try again |
| session expired | Signed out (revoked) | Your session has expired. Sign in again to keep listening. (as built, `content/dashboard.ts`) | Sign in |
| unreadable | Can't be read aloud (revoked) | Something on our side couldn't read this document aloud. + `Error · 422` | Try again |
| offline, before | Offline (idle) | You're offline. Listen can start once you're back online. | — |
| offline, mid-play | Offline (idle) | You're offline. Playing what's loaded: 2:40 left. | — |
| offline, stopped | Offline (idle) | You're offline, so playback stopped at 15:10. Play again once you're back online. | — |
| audio outdated | Earlier version (idle) | The text changed after this audio was made. Until you update it, you hear the earlier version. | Update audio → Updating… |

The status word is the README's trio (dot + word, never colour alone); a pending word shows the ring in place of the
dot. The one action is the note's accent button. The dock's short forms: `Waiting for the Mac · last seen 19:55`,
`Preparing… · part 3 of 12`, `Ready to play · the rest is preparing`, `Ready to play`, `Loading…`, `Playing · 12:30
of 42:10` (book `Playing · Chapter 2 · 12:30`), `Paused · …`, `Buffering… · …`, `Preparing… · Chapter 3`,
`Finished · 42:10` / `Finished · all 5 chapters`, `Preparing stopped · try again`, `Daily limit · resumes 09:00`,
`Playback stopped · connection lost`, `Signed out` (+ Sign in), `Can't be read aloud · try again`, `Offline · starts
when you're back online`, `Offline · 2:40 loaded`, `Offline · stopped at 15:10`, `Earlier version · 12:30 of 42:10`.

## F11 · Chapter readiness in a list

The signed chapter list (`rd-chs` / `rd-ch`): number, title, and in its meta line the length when made (`44 min`)
then one readiness word in `kb-secondary`: **Ready** is not written (a length means ready), **Preparing… · part 2 of
9**, **Not prepared yet**. No colour, no dots, no icons, so a 20-chapter list stays quiet. The current chapter is
`aria-current` (accent-soft row, as signed) and its meta leads with the state word in the "Reading now" style
(`rd-ch__now`).

## F12 · Follow along (OQ3, drawn: taken)

A 3 px `kb-accent` rule in the column's start margin (outside the text by `kb-space-sm`) beside the block being
read. It moves nothing and **never scrolls the page**; **Go to the text** in the player scrolls once, on request.
Told apart by place and shape: the highlight is paint inside the text (05-annotations); the term marker a dotted line
under a word (10-reading-aids); the annotation margin sits on the end side from 64rem. Switched in the opened
player: **Follow along**, on by default (a mark, no motion). Reduced motion: the mark jumps, never slides.

## F13 · The open questions, as drawn

- OQ1 chapter Listen: the book from this chapter on (`Chapters 2–5`); no chapter-only choice drawn.
- OQ2 tables: nothing drawn; the skip lists stay as locked (logged).
- OQ3 follow along: taken (F12).
- OQ4 preparing ahead: no separate Prepare action; Listen starts the making from its chapter, and the following
  chapters are made ahead in order while it plays. The book landing shows that progress (F9).
- OQ5 voice picker: none; nothing in the flow needs one.

## F14 · Faces

As built: Fraunces (titles, the player's position), Source Sans 3 (every control and line), JetBrains Mono (error
references, eyebrows), Literata / Noto Serif KR (the reading column, the signed reader face). Pretendard, the
product's Hangul face, is loaded in `frame.css` from its published source (v1.3.9, as `lib/fonts.ts` ships), so
Korean titles render in the shipped face; Korean titles keep `word-break: keep-all`.

## F15 · Layout rules

- The reader's one track (as built): the text column 36rem (44rem from 1600 px), gutters 1.05 / 1.7 / 2.4rem. The dock,
  the pill, the head's Listen and every note sit on the column's two edges.
- **Control heights:** 44 px (`kb-tap`) for every Listen control at every width; **64 px** (`--lx-ctl-l`) for the
  opened player's play/pause only.
- **Type steps (Listen):** 13 px meta and status, 15 px controls and sentences, 18 px the sheet title (signed),
  22 px the player's title (Fraunces), 34 px the player's position (Fraunces, tabular) — the one bold move.
- Space: `kb-space-xs / sm / md / lg / xl` only. Radii: the capsule and pill `kb-radius-pill`, buttons
  `kb-radius-sm`, sheets as signed. Depth: dock and pill `kb-shadow-raise`, sheets `kb-shadow-overlay`.
- Primitives (frame.css Part 2): `.f-stack`, `.f-cluster` (`--between`, `--end`, `--base`), `.f-sidebar`,
  `.f-center`, `.f-grid`.
- **The window** (`.rd-frame.lx-win`, `--lx-win-w`, `--lx-win-h`): a screen at a device width with its chrome placed
  as the product fixes it: `.lx-win__top` (Shell; `data-hidden` hides the bar), `.lx-win__page` (scrolls; give it
  `tabindex="0"` and a name when it scrolls), `.lx-win__bottom` (ChapterBar; `data-hidden`), `.lx-slot`
  (`--chapter`, `--pill`, with `rd-flow` for the dock). Add `lx-win--chapter` / `lx-win--docked` for the padding.
  The product's viewport queries are container queries here, so a 390 window on a wide board answers to 390.

## F16 · Tone and house style

English interface, sentence case, no exclamation marks, no emoji (README). The back link is the reader's, as
signed ("‹ knowledge maintainer guide", "‹ Book" below 40rem, "‹ Library" on a loose document). No explainer lines:
no subtitle under the sheet title, no hint under a control.

## F17 · Confirm, notices, empty, loading, error

- **No confirm** anywhere: Start over, Stop listening and Update audio lose nothing (the position is kept; the
  earlier audio plays until the update is ready).
- **Notices:** the dock and the note carry state; no toast. Chapter changes are a title change plus the live region.
- **Loading:** the busy ring and its word (`Loading…`, `Buffering…`), never a bare spinner; a list being prepared
  shows its words, no skeleton.
- **Error:** F10, in the README's error voice; the reference line in mono for the two failures on our side.
- **Empty:** a chapter with nothing to read aloud is `fail-unreadable`.

## F18 · The shared fixture

- **`bar`** — "Our bar: performance rule v1", English, a loose document; project shown as `[PROJECT]`; 187 spoken
  segments, made in **12 parts**; length **42:10** (`42 min`), of which about 9 min are table rows; a section
  "Decay". Left part-way at **18:05**. Positions: playing at **12:30**; offline stopped at **15:10**; loaded **2:40**.
- **`bar-ko`** — "우리의 기준: 성과 규칙 v1", Korean (`lang="ko"`), **14 parts**, **50:25** (`50 min`).
- **`guide`** — "knowledge maintainer guide", English, 5 chapters (exact lengths; sum 3:59:30, `about 4 h`):
  1 "knowledge: what it is and how it is used" 38:20 · 2 "System internals: the content plane, the write path and
  the contracts" 1:07:10 · 3 "knowledge's read surfaces: two front ends, one corpus" 44:05 · 4 "Shipping and running
  knowledge: distribution, the edge, security and the gates" 58:40 (the longest title) · 5 "Why knowledge is this way,
  and how to change it" 31:15. `Chapters 2–5 · about 3 h 30 min`. Resume point **Chapter 4 · 12:30**.
- **`changple5`** — "changple5 curriculum", 20 chapters; titles not in the repo, so placeholders `[Chapter 7
  title]`; lengths (min) 24, 31, 28, 36, 22, 40, 33, 27, 45, 30, 26, 38, 29, 34, 25, 41, 32, 28, 35, 23 (sum 10 h 27 min,
  `about 10 h 30 min`). Being prepared: 1–6 made, 7 `Preparing… · part 2 of 9`, 8–20 `Not prepared yet`.
- **Making:** a document part 3 of 12, `about 15 min left`; the first part ready = `3 min`; a book chapter 2 of 5,
  `about 1 h 30 min left`; the next chapter (3) `about 5 min`. Voice failure at part 4 of 12.
- **Clock:** now 21:40; the Mac last seen **19:55**; the daily limit resumes at **09:00 tomorrow**, with **14 min**
  ready.
- No voice names, keys or account names anywhere.

## F19 · The carried Listen and its states

- **`listen`** (the item every page takes; `null` when nothing is docked):
  `{ unit: 'bar'|'bar-ko'|'guide'|'changple5', from: <chapter it started from, 0 for a document>, ch: <current
  chapter, 0 for a document>, pos: '12:30', state: <key>, old: false, soFar: false, speed: '1×', follow: true }`.
- **State keys** (one list for Dock, ListenNote and every page): `waiting`, `making`, `ready`, `tap`, `loading`,
  `playing`, `paused`, `buffering`, `next-waiting`, `finished`, `fail-voice`, `fail-limit`, `fail-play`,
  `fail-session`, `fail-unreadable`, `offline-start`, `offline-play`, `offline-stopped`; `outdated` is the note's
  form of `old: true` (the dock shows "Earlier version" with play or pause).

## F20 · The page contract

| page | file prefix | props it takes | events it emits |
|---|---|---|---|
| `reader` | `Reader*` | `doc` (`bar` / `bar-ko` / `guide`), `ch` (1–5 for `guide`), `listen`, `theme` | `on-open-player` `{ listen }`, `on-listen` `{ listen }` (every change of the Listen: start, play, pause, state), `on-open-book` (the chapter's back link and "Back to the book →") |
| `player` | `Player*` | `listen`, `theme` | `on-close` `{ listen }`, `on-go-to-text` `{ listen }` (to `reader` at `listen.ch`), `on-listen` `{ listen }` (speed, follow, chapter, seek, Stop listening → `null`) |
| `book` | `Book*` | `book` (`guide` / `changple5`), `listen`, `theme` | `on-open-reader` `{ ch, listen }` (Listen, Continue listening and Start over: to `reader` at the starting chapter, playing), `on-open-player` `{ listen }`, `on-listen` `{ listen }` |

- A page is **controlled** when mounted with `listen` and `on-listen` (the join's entry holds the one Listen), and
  holds its own `listen` in state when alone. The Listen survives moving between pages: the join keeps one dock.
- A link that carries nothing is `href="#to:<slug>"`; the join wires it. Contents, Display, Language, Notes, the
  library and sign in are outside the slice: drawn as signed, inert (`#top`), or an in-canvas state.
- Every Page's root carries `id="top"`.

## F21 · Mounting the frame's parts

- `Shell`: `<dc-import name="Shell" bare="{{ true }}" kind="chapter|loose" lang="…" langs="{{ … }}" pct="…">`
  inside the page's `.rd-frame` (or `.lx-win__top`); events `on-back`, `on-logo`, `on-display`, `on-notes`, `on-lang`.
- `ChapterBar`: `n`, `total`, `pct`, `titles`; `on-prev`, `on-next`, `on-contents`, `on-book`; `bare`.
- `Listen`: `form` (`doc` / `chapter` / `book` / `resume`), `q` (the qualifier; `""` for none), `busy`, `slot` (the
  pill); `on-listen`, `on-start-over`; `bare`.
- `Dock`: `state`, `unit` (`doc` / `book`), `title`, `lang`, `n`, `total`, `next`, `pos`, `len`, `so-far`, `old`,
  `part`, `parts`, `runner`, `seen`, `reset`, `loaded`; `on-play`, `on-pause`, `on-retry`, `on-start-over`,
  `on-open`, `on-sign-in`; `bare`. Mount it inside `.lx-slot.rd-flow` (the column's edges).
- `ListenNote`: `state` (F19, plus `outdated`), `unit`, `n`, `total`, `next`, `pos`, `len`, `part`, `parts`, `left`,
  `ready`, `runner`, `seen`, `reset`, `loaded`, `updating`; `on-play`, `on-retry`, `on-start-over`, `on-sign-in`,
  `on-update`; `bare`.

## F22 · Beside Hermes (P36-1s; drawn nowhere)

- **Desktop side panel:** the dock belongs to the column's track, not the window: when a panel opens beside the
  column and the column re-centres in what is left, the dock moves with it and never runs under the panel.
- **Phone and tablet drawer:** a modal drawer is a sheet (z 40 over the scrim) and covers the dock while open. A
  non-modal bottom drawer is bottom chrome: the slot sits above it, as it sits above the chapter bar.
- "Ask Hermes" in the annotation popover is untouched by Listen.

## The join's answers (F23–F33)

Appended by the join. Each settles one page's `frame_gaps:` entry once; "applied" names the page files the join edited
for it (logged in the round's `result.md`). Where a page already drew the answer, nothing changed.

## F23 · The carried Listen, complete (reader-G1, player-G3, player-G4)

F19's object gains: `len` (the made length while `soFar`; the reader's `madeLen`, renamed), `part` (the part being
prepared: 1 on a fresh start, 3 while making, 4 at the voice failure), `made` (a book: the last chapter whose audio is
made; it moves only with the making, never with the chapter listened to; `finished` reads as all made), `offer` (the
player's resume offer; any play, seek or Start over clears it) and `updating` (Update audio pressed). Fixture values:
the first part ready `3:05`, the daily limit's ready part `14:05`, playing while preparing `2:10 of 9:40 so far`.
Applied: reader (`madeLen` → `len`), player (`3:00` → `3:05`, `14:00` → `14:05`).

## F24 · The daily limit with a part ready (reader-G3)

The ready part plays. The dock's lead stays the disabled Play with `Daily limit · resumes 09:00` (F7: the dock says
the making is held); the note keeps its sentence's clause "The first 14 min are ready to play." and its Play (F10),
the one place beside the dock where the note carries the action, because the dock lacks it; in the player that Play is
the round button (player-G1). Value first: 14 minutes are there to hear. Applied: reader (the note's Play and the
clause return on `fail-limit`; the held slot's hidden copy carries them too).

## F25 · The note's one action beside a carrier (reader-G7, player-G1, player-G11)

Where the dock or the player's transport carries an action, the ListenNote shows its word and sentence without its
button. It keeps the button only for what those lack: Update audio (accent beside the dock; secondary in the player,
where the round button is the one accent), Sign in (in the player), and Play on the daily limit beside the dock (F24).
F6's "the note's one action is the only accent button Listen adds" now reads: the note's action shows only where no
carrier has it. Build: ListenNote gains `act` (default true) and `tone` (`primary` default, `secondary`). Applied: book
(first part ready: the note's Play is hidden beside the dock's Play).

## F26 · The compact top bar on a two-language document (reader-G2)

The signed compact chrome (01-reader round 03) wherever the Shell shows a loose document in two languages: under 23rem
the language switch takes a second row (signed: 21rem; one row cut "‹ Library" at 390 with Notes in the bar), from
23rem to 26rem and under 14rem the logo steps aside for "‹ Library". Build: port into Shell as the signed second slot
after Display (Tab order follows the rows). Applied: player (its document windows, `.pl-langs`, the reader's rules).

## F27 · Listen in the head and the slot once started (reader-G4, reader-G5, reader-G6)

As the reader drew them: the head shows this unit's Listen as a ListenNote from the press until Stop listening, in a
slot held at the unit's tallest note; the slot pill shows only once the head's Listen has scrolled under the top bar;
left part-way it reads "Continue listening · 18:05". Build: Listen gains `form=resume` for the pill.

## F28 · The current chapter row (player-G6, book-C03)

The accent-soft row (as signed) plus a 1px `kb-accent` edge, in a border every row carries, so the current row has a
3:1 boundary and nothing moves. One look in the player's chapter list and on the landing's rows. Applied: book
(`Book.css`, `.bk-row .rd-ch`); this settles book-C03's blocking contrast line.

## F29 · The scrim is a surface (player-G7)

Under a sheet `kb-scrim` is an `aria-hidden` surface that closes the sheet on a tap; Close and Escape are the
keyboard's way. Applied: reader (its in-canvas stand-in sheet).

## F30 · The opened player's own parts (player-G2, G5, G8, G9, G10, G12, G13)

As the player drew them, player-only: the trio word alone for the four live states; chapter moves seek inside the one
stream (an unmade chapter is a plain row; Next into it lands on `next-waiting`); no second live region (the dock's);
the head order Go to the text, Close, wrapping at larger text; the rows Speed, Follow along, Chapters; Stop listening at
the foot; one disabled look in the transport; the scroll cue on the modal body.

## F31 · The book landing's Listen (book-G1, G2, G3, G6)

As the book drew them: the dock's track is the layout column below 64rem and the side column from 64rem; a row's audio
is its own meta item led by "Audio" (`Audio 38 min`, `Audio preparing… · part 2 of 9`, `Audio not prepared yet`,
`Audio held by the daily limit`); a book's first step reads Preparing… `Chapter 1 of 5 · about 2 h left.`, the dock
`Preparing… · part 1 of 9`, nothing playing until chapter 1's first part is ready. The same figure on every page: the
chapter's and the player's note read `Chapter 1 of 5 · about 2 h left.` on chapter 1 (applied at critique 01, C04:
reader, PlayerPanel).

## F32 · The fixture's part counts (book-G4, book-G5)

A book chapter is made in **9 parts** on the canvas (every chapter; the reader's and the player's figure); the
preparing chapter sits at `part 2 of 9`. The part being made is the Listen's own `part` everywhere it shows (the dock, the note, the
player); applied at critique 01, C05: `PlayerData.js` (`parts: 9` on the books, the dock's `part` from the Listen),
PlayerPanel. `changple5` has `about 3 h 30 min` left preparing (chapters 7–20). Applied:
book (`firstParts` 11 → 9; the guide's preparing chapter gains `part 2 of 9`).

## F33 · The flow (the join)

One Listen, held by the entry (`Main.dc.html`); each page mounted with `bar="off"` (the entry draws the one state bar
and drives the window and the theme, `win`, `view`, `theme`). The book landing's Listen on a book not yet made opens
the chapter with Preparing… (F31), then Ready after the first part; made, it opens the chapter playing. **The player
opens over the page it was opened on** (the landing or the chapter, drawn as it was, F8's column dimmed behind):
**Close** (and Escape, and a tap on the scrim) reveals that page unchanged; **Go to the text** goes to the reader at
`listen.ch` (or the Listen's document), scrolled once to the block read (F12), or to its head at the start; **Stop
listening** ends the Listen, removes the dock and closes the sheet onto the page under it, as Close does, and keeps the
position (F17): the landing then offers `Continue listening · Chapter 4 · 12:30` and that chapter's head `Continue
listening · 12:30 of 58:40` (a document's: `… of 42:10`) until a Listen starts. Speed and Follow along carry from one
Listen to the next, wherever it starts (F3). (Revised at critique 01, C01, C02, C06: one answer for Close, the
canvas's and the build's.)
