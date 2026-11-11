status: done
pass: frame
job: 11-listen
round: 01-listen
frame_gaps: none (this is the frame)
events: none (the frame emits none; the page contract is frame.md F20)
component_gaps:
- frame: the system ships no components; Shell, ChapterBar, Listen, Dock and ListenNote are drawn as markup from the tokens and the product's reader.css (README: "No components ship with this system").
- frame: no media icon set in the system or the product; nine media icons drawn as one stroke set (F5), as the handoff licenses; the build inlines the paths.
- frame: the signed chapter bar (01-reader round 03) centres "Contents / Chapter 2 of 5 · 12%" against the one-line "‹ Previous", a 9.5 px first-line offset (`check=align`, advisory); signed part, logged, not restyled.
open_items:
- frame-OQ1 chapter Listen: drawn as the book from this chapter on ("Chapters 2–5"); no chapter-only choice
- frame-OQ2 table rows read aloud (about 9 of 42 min): nothing drawn
- frame-OQ3 follow along: drawn taken (F12), on by default, switched in the player
- frame-OQ4 preparing ahead: no Prepare action; Listen makes from its chapter on, ahead in order
- frame-OQ5 voice picker: none drawn; none needed
- frame-A1 Listen while reading lives in the bottom slot (an idle pill with the chrome), not the top bar: the signed top bar has no room on a loose document at 390 px (measured: the back link fell to 12.8 px wide with a Listen action added). A departure from "where the Listen control sits" being drawn per page: settled once here (F6)
- frame-P1 the `changple5 curriculum` chapter titles are not in the repo: placeholders `[Chapter n title]`; the loose document's project is `[PROJECT]`

## Summary

The frame of 11-listen: `frame.md` (F1–F22), `frame.css` (the signed reader copied with the chapter bar, sheets,
chapter opening and chapter list; five primitives; Listen), the signed `Shell` and `ChapterBar`, and three shared
components: `Listen` (head control in four forms plus the bottom-slot pill), `Dock` (the docked capsule, 18 states,
column-wide in the reader's bottom slot above the chapter bar, staying put as both bars hide) and `ListenNote` (every
non-playing state: one word, one sentence, the 3 px progress line where it applies, one action). States boards show
each at 390/320/820/1200, light and dark, plus placement windows and the media icon set with the follow-along mark.
The bold move (the opened player's position in 34 px Fraunces) is set as a step for the player page. Departures: the
logo copied to `assets/`; Pretendard loaded from its published source; Listen added nowhere in the signed top bar
(frame-A1). Open: OQ1–OQ5 as drawn, A1, P1. Self-check pass; one signed align line logged.

## Build (the frame's fragment)

Canvas-only, never built: the states boards, Part 4 of `frame.css` (`.lx-board*`, `.lx-w*`, `.lx-pad`, `.lx-demo*`,
`.lx-pillcell`, `.lx-alone`), the `.lx-win` window (the product's chrome is `position: fixed`; the window stands in for
the viewport), the `bare` props, the container-query rewrite of the product's viewport queries, `#top` hrefs.

- **Tokens:** kb-* only. Frame tokens on the reader root: `--lx-ctl` = `kb-tap` (44 px), `--lx-ctl-l` 4rem,
  `--lx-dock-pad` = `kb-space-sm`, `--lx-dock-h` = ctl + 2 × pad + 2 px, `--lx-fs-meta` 0.8125rem, `--lx-fs-ui`
  0.9375rem, `--lx-fs-title` 1.375rem, `--lx-fs-pos` 2.125rem, `--lx-line` 3px; the product's `--rd-bot-h` 3.75rem and
  `--rd-control-edge` (kb-hint) as built.
- **Icons (F5):** nine 24 px paths in `frame.css` (`.lx-i--play` … `.lx-i--open`), stroke 1.75 round, play/pause
  solid; inline as `<svg aria-hidden="true">` in named buttons. Busy: the `kb-appbtn__spin` ring.
- **Listen (F6):** in the chapter opening after `rd-head__meta`: `rd-btn rd-btn--secondary` (play mark in accent +
  "Listen") + `.lx-listen__q` qualifier (`aria-describedby`); resume: "Continue listening" + qualifier, "Start over"
  as `.lx-over` on its own row. Busy: `aria-busy`, "Starting…" in the rest width (`.lx-labels`). The **slot pill**
  (`.lx-pill`): one 44 px button `▶ Listen · 42 min` with `--rd-control-edge` border, `kb-shadow-raise`, centred on the
  column at the bottom slot; shown with the chrome, hidden by `.rd-top-hidden` like `.rd-resume`, deferring to the
  resume pill.
- **Dock (F7):** `<section aria-label="Listen">` grid `44px | 1fr | auto`, `kb-radius-pill`, `kb-border`,
  `kb-shadow-raise`, padding `kb-space-sm`; lead `.lx-round` (accent fill, `--rd-on-accent` glyph; disabled = the
  library's disabled button); text title 15/600 one line ellipsis, status 13 px secondary with the state word in ink
  600 (revoked-ink for failures); end `open` chevron whose `::after` covers the capsule (focus ring drawn on it) or a
  pill `Sign in`. A `role="status"` span announces state and chapter changes. `position: fixed; z-index: 21` in the
  bottom slot on the column's track, `bottom: calc(var(--rd-bot-h) + var(--kb-space-sm) + safe-area)` on a chapter,
  `kb-space-md + safe-area` otherwise; never hides with the chrome. `.rd-page` end padding grows by the dock + sm while
  docked; the slot's pills and toasts stack above it. Strings: frame.md F10.
- **ListenNote (F10):** `.lx-note` stack (gap sm): `.lx-status--{active|idle|revoked}` (dot + word; busy swaps the dot
  for the ring), `.lx-note__text` 15 px (max 34rem), `.lx-prog` (`role="progressbar"`, 3 px), `.lx-note__ref` mono
  12 px, one `rd-btn--primary` action. Every state's words in F10; data in F18.
- **Follow along (F12):** `.lx-follow::before`, a 3 px accent rule at `inset-inline-start: -(kb-space-sm + 3px)`,
  `top/bottom: 0.25em`, on the block whose id the playing segment carries; no scrolling.
- **Language switch:** the product's round-03 rule (accent edge on the chosen option) is what the frame copies; the
  older job-10 copy is not used.
- **Beside Hermes (F22):** the slot is laid on the reading column's track; a modal drawer covers the dock; a
  non-modal bottom drawer lifts the slot like the chapter bar.

## Intent (the frame's parts)

- **Listen control** — the reader at the top of a document, a chapter or the book landing, deciding whether to
  listen; first they see the word Listen and how long it runs (or how far it goes: "Chapters 2–5").
- **Dock** — a listener reading along or walking with the phone; first they see whether it is playing and where.
- **ListenNote** — a listener whose audio is not simply playing; first they see the state word and the one thing
  to do, or that nothing needs doing.
- **Shell / ChapterBar** — the signed reader chrome, unchanged.

## Plan (as reviewed)

- Boards: Shell, ChapterBar, Listen, Dock, ListenNote (alone), and ShellStates, ListenStates, DockStates,
  ListenNoteStates, IconStates.
- Type steps 13 / 15 / 18 / 22 / 34; space xs–xl; controls 44 px, one 64 px; accent only on play/pause, the progress
  fill, the follow mark and the note's one action.
- Revised before building: no progress bar inside the dock (words there; the line where there is room).
- Revised after the first render: the plan put a Listen action in the top bar's end; measured, it crushed the signed
  bar on a loose document at 390 px, so Listen moved to the bottom slot (F6, frame-A1). Dock lines shortened where
  they truncated at 390 (next chapter, daily limit, signed out).

Dock wireframe (phone 390; the column's two edges):

```
| gutter |                 column 356 px                      | gutter |
         ( (▶)  System internals: the content plane, th…   ⌃ )
         (      Playing · Chapter 2 · 12:30                  )
           44     two lines centred as a block              44
```

## Data

Real: the five chapter titles of the maintainer guide and the two document titles and lengths (brief); the signed
reader fixture's prose (01-reader `reader.js`) on the placement windows and marks board; copy precedents from
`content/book.ts`, `content/reader.ts`, `content/dashboard.ts`. Made up, consistent (F18): per-chapter lengths, parts,
positions, clock times. Placeholders: `[PROJECT]`, `[Chapter n title]` (changple5).

## States reached only by interaction

Hover (the dock tints sunken; the pill and secondary buttons take an accent edge) and focus (the ring around the whole
capsule for `open`) are not forced on the boards; pages reach them.

## Render log

- Pass 1 (all 10 boards): 1 blocking pair (the signed language switch, job-10 copy), five frame-clips, the
  visually-hidden live text measured as clipped, 9 px skip numerals, the top-bar Listen crushing "‹ Library" at 390.
  Fixed: the language switch copied from the product's round-03 rule; the hidden text uses `clip-path` alone; skip
  arrows redrawn wider with 11 px numerals; the top-bar Listen removed in favour of the slot pill; board heights set
  from content.
- Pass 2 (5 changed boards): `self_check=pass blocking=none`; remaining: `check=align` first-line 9.5 px in the
  signed chapter bar (ShellStates, DockStates), logged as a signed part.
- Measured lines: fixed 4 (tiny-text, target, clipped ×2 kinds), logged as intended 1 (the signed chapter bar).
- `design-check 11-listen --page frame`: OK, 10 boards, 11 files.
