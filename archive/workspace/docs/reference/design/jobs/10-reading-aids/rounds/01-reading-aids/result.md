status: done
pass: join
job: 10-reading-aids
round: 01-reading-aids
boards_written: Main.dc.html (new), canvas.json (new); Terms.dc.html, Formulas.dc.html, Print.dc.html (reconciliation and wiring, logged below); critique pass 01: Main.dc.html, Terms.dc.html, Formulas.dc.html, Print.dc.html, Gloss.dc.html (F34's data only), canvas.json
frame_gaps_settled: terms-FG1..FG9, formulas-FG1..FG3, formulas-T1, print-FG1..FG5, print-G1, frame-A1 -> frame.md F17–F33 (join.json); critique 01 -> F34–F36
critique_answers: critique-01: fixed 6 (C01–C06), gaps logged 2 (C07, C08), advisories C09, C10 left to the operator
open_items:
- frame-OQ1 glossary order (drawn A to Z) — the operator's
- frame-OQ2 glossary place (drawn after the quiz, before the sources) — the operator's
- frame-OQ3 phone form (drawn a bottom sheet, no scrim) — the operator's
- frame-OQ4 a legend symbol that is a term (drawn linked like a term in the text; = formulas-OQ4) — the operator's
- frame-OQ5 an opened term (drawn unchanged) — the operator's
- frame-OQ6 paper body size: the handoff says "body ≥ 12 pt", the signed paper body is 10.5 pt; drawn at the signed sizes — the operator's
- join-R1 closed by the frame's follow-up pass (2026-11-02): frame.css carries F25 (dividers on the column), F27 (one symbol column, screen and paper), F32 (`.ra-swap` start edge) and `.ra-keep` (F22, F23); Gloss's definitions are runs with keeps and the `sharpe` formula as inline math (F22, F23, F31); MathBlock's readings and legends keep their shares and hyphenated terms whole (F22, F23); MathInlineStates takes F24's `(Σe)²` and F22/F23 keeps. F17 needed no board change (the Components board is the list without its h2). See pages/frame/result.md `## Follow-up pass (join-R1)`
- join-G1 signed Shell (01-reader) gaps, the self-check's only blocking lines with join-G2: the language switch's pressed fill 1.24:1 light / 1.47:1 dark (non-text-contrast) and "‹" over "English" at 390 with 200 % text (overprint); the 422 px reflow once logged here was a legend word, fixed by F36; the back link "Book" 43.6 × 44 px and cut to "B…" at 320
- join-G2 the signed 05-annotations popover copied on Terms: "Add note" border 1.57:1 (non-text-contrast)
- join-N1, join-N2 closed by critique pass 01 (C02: F35 `on-state`; C01: the bar reserved at every width)
- join-N3 Main's bar reservation is Terms' bar height measured per width (300–2000 px) in this browser's system face; another face could shift a wrap point by a few px
- critique-01 C09, C10: advisories, the operator's taste
- frame-G1 the engine (R1) sets √ with no trailing space and the steps aligned on the relation, as drawn
- formulas-C08 stepped rows with no gap; formulas-C09 display math 27 px vs the signed h2 26.1 px (frame MathBlock, F9)
- terms-C10, terms-C11, formulas-C11, print-O2: critique advisories, the operator's taste
- terms-D1 the dark presets are not clicked by the preview (the page verified them in a scratch render)
- print-O1 inline math on paper reads a little light at 14 px (R1); print-O3 the document's placeholders ([PROJECT], [ADDRESS], v[N], [DATE], [SOURCE TITLE], [AUTHOR], [YEAR])

## Summary

The joined canvas of 10-reading-aids, 13 boards. 01 `Main.dc.html`, the entry flow: one chapter of "Our bar:
performance rule v1" through its three pages, opening on Formulas. A legend or text term's "In the glossary →" opens
Terms at that entry, marked; its "‹ Back to the text" returns to that very term on Formulas (lang and theme carried).
A canvas-only foot strip moves between the parts (in the product one scrolling chapter, and ⌘P) and links each page
alone. 02–04 the pages, 05–13 the frame's components. Shared choices settled as F17–F36 and applied on the
pages. Departures: Main mounts the pages, not an excerpt of its own, and opens on Formulas; headings unified (F29).
Critique 01: C01–C06 fixed (bar reserved at every width, lang and theme carried, one wording, Terms h, F34 keep, F36).
Open: OQ1–OQ6 (the operator's), join-G1/G2 (signed gaps), join-N3, C09/C10; join-R1 closed.

## Intent

- **The entry (Main):** the operator, reading a hard explain chapter, came to see the reading aids work together; first
  they must see a formula set well with its legend, and that a legend term opens its definition and leads to the
  glossary and back. The pages' own intents stand (pages/*/result.md).

## Plan

- The pages are related: formulas → terms (`on-open-terms`), terms → formulas (`on-back`), and the handoff's entry
  reaches all three, print included. None is unrelated (`join.json`: `unrelated: []`).
- Main is a flow board that mounts one page at a time (`dc-import`, `sc-if`) and holds what a click carries: the page,
  the entry arrived at (`term`), the occurrence to return to (`from` / `back`), `lang`, `theme`. Each page keeps its own
  state bar (only its presets); Main reserves the tallest (Terms, two rows) so the header holds still.
- The product has no control between the terms section, the formulas section and print (one scrolling chapter, ⌘P;
  F20), so a canvas-only foot strip carries the moves, with the each-page-alone links the link graph needs.

```
Main (1440)
[state bar of the page on screen — reserved to the Terms bar's height]
[the page on screen: Formulas | Terms | Print, mounted whole]
[foot strip: Canvas only · the same chapter, its other parts: (Formulas)(Terms and the glossary)(On paper) · Each page alone: Terms Formulas Print]
```

### Plan review

- A Main drawing its own short excerpt (a term, a formula, a print button) would have invented a print control and
  faked a term that navigates; revised to mounting the real pages, so every click is the page's own.
- Opening on Terms buried the strip under 5,300 px and hid the one real cross-page link; revised to opening on
  Formulas, whose glossary link leads to Terms and back.

## Join edits to the pages (each logged)

- **Terms:** headings "How the scorer decides" / "Many trials, one bar" (ko 스코어러가 판단하는 방법 / 시도가 많으면 기준도
  높게) → F29's; `on-back` carries `{ from, lang, theme }` (F33); `.tm-root .ra-swap > * { text-align: start }` (F32).
- **Formulas:** `(Σe)²` markup ×2 and its Korean `alttext` (F24); Korean third heading → 아무 일도 없을 때 (F29);
  `CONDITIONAL-GO’s` / `CONDITIONAL-GO의` kept whole (F22); legend symbol column one width,
  `minmax(max-content, min(calc(var(--rd-fs) * 5.25), 28%))` (F27; bounded so 200 % text keeps room for meanings);
  the swap rule (F32); `on-open-terms` carries `{ term, from, lang, theme }`; new prop `from` scrolls to and focuses
  that term (F33); `gloss-href="#to:terms"` ×2 → `Terms.dc.html` (alone, the link opens the Terms board); frame `h`
  2680 → 2705 (the legend rows rewrapped).
- **Print:** headings → F29's (en and ko); no-break shares (F23) and `CONDITIONAL-GO` kept whole (F22) in the prose
  and the quiz (`.pr-nobr`); `(Σe)²` markup ×2 and its Korean `alttext` (F24).

## Pages, components, directions

- Pages: 01 Main (the flow, 1440 × 6084), 02 Terms (1440 × 5330), 03 Formulas (1440 × 2705), 04 Print (1440 × 5996).
- Components: 05 Term marker, 06 Definition window and phone sheet, 07 Glossary and paper appendix, 08 Inline
  formula, 09 Display formula block, 10 Reader top bar (Shell), 11 Gloss alone, 12 MathBlock alone, 13 Shell alone.
- Directions: none (the operator asked for one).
- Layout: pages on row 1 (y 0, 80 px apart), components on row 2 (y 6204), titles 01–13 in that order.

## Data

The frame's shared fixture (F12) throughout; the join adds none. Headings now one set (F29).

## States reached only by interaction

- The cross-page way: Formulas → a term's window → "In the glossary →" → Terms at the entry → "‹ Back to the text" →
  Formulas at that term. The preview's explorer hits its 48-state cap on Main before reaching it from the default
  state, so it was verified in a scratch render starting at the arrival (`<scratch>/verify`): the entry "Eigenvalue"
  marked with its way back, and "Back to the text" landing on Formulas.

## Render log

- Render 1 (whole job, `--click --contact-sheet --strict`): Main opened on Terms; `page-clip` on Main (Terms' root
  `min-height: 100vh` plus the strip made it always one strip taller than its frame) and on Formulas (2705 > 2680);
  Formulas' new legend column too wide at 200 % text. Fixed: `.mn-stage .tm-root { min-height: 0 }`, Formulas h 2705,
  the bounded column; Main opens on Formulas; the bar reservation.
- Render 2 (`--board Main.dc.html --board Formulas.dc.html`): Main `page-clip` in the Print state (6066) → h 6066
  (no re-render needed: the frame only). Link graph: Main → Terms, Formulas, Print; Formulas → Terms; nothing
  unreachable. `self_check=fail blocking=non-text-contrast:3,reflow:2,overprint:3`: every one the signed Shell or the
  signed 05 popover (join-G1, join-G2), not restyled.
- Verify render (scratch, Main only, a temporary start state, reverted): the cross-page way works both ways.
- Render 3, critique pass 01 (`--board` Main, Terms, Formulas, Print, Gloss, GlossStates, GlossListStates): Terms'
  page-clip gone (h 5330), Terms and Formulas text200 390 px wide; Main page-clip on Print (6084: the bar now reserved
  89 px at 1440) → h 6084, components row y 6204. Render 4 (`--board Main.dc.html`): no page-clip, text200 390 wide;
  `self_check=fail blocking=non-text-contrast:3,overprint:3`, all the signed Shell and 05 popover (join-G1, join-G2).
- `design-check 10-reading-aids`: OK, stage joined; two token-drift warnings on Print and Terms (the signed paper and
  reader values the pages copied and logged).

## Measured lines (each fixed or logged as intended)

- fixed: page-clip ×3 (Main ×2, Formulas), pending-link ×2 (Formulas), token-drift on Main (a raw ground removed).
- intended, on Main as on the pages that logged them: layout-shift (the phone presets' viewport boxes and the
  scrolls that place a window or a sheet), target on inline and legend terms (WCAG 2.5.8 inline, F2), size-count
  (signed quiz and popover sizes, MathML script sizes), tight-leading (inline math raising a line box), cramped-padding
  (05's highlight paint), tiny-text (MathML scripts on paper), ragged-edges (paper), straggler (Korean), align
  first-line and label-ink on math and legend terms (MathML boxes), near-edge 1.9 px (two inline formulas on stacked
  lines at 320).
- gaps: join-G1, join-G2.
- intended (critique pass 01): too-tall on Main, Terms and Formulas at 320 px and 200 % text (a chapter is longer than
  the render's 8,000 px cap; the parts below it were checked by harness, C06).

## Build

What the build slices read. `frame.md` F1–F33 is the rule book (F17–F33 settled at this join and replacing the lines
they name); this section is the build side, assembled from the frame's, each page's and the join's fragments.

**Canvas-only, never built:** every state bar (`data-proto="state-bar"`) and the entry board's foot strip
(`data-proto="screens"`); `Main.dc.html` itself (the flow: in the product the three pages are one scrolling chapter and
print is the browser's ⌘P); the states boards and `.ra-board*` classes; the `bare` / `gloss-href` canvas wiring and
the hrefless `role="button"` markers on boards with no glossary; the phone viewport boxes and the sticky sheet dock
(F21: `.tm-stage`, `.tm-box`, `.tm-scroll`, `.tm-top`, `.fm-stage--phone`, `.fm-box--390/320`, `.fm-dock`); the print
desk, sheets and multi-column cutting (`.pr-root`, `.pr-desk`, `.pr-sheets`, `.pr-slot`, `.pr-box`, `.pr-sheet`,
`.pr-win`, `.pr-mc`, captions); the copies of the signed quiz, sources list and annotation popover on Terms (built by
04-quiz, 02-figures and 05-annotations, unchanged); the `.ra-m msqrt` margin (a Chromium artefact fix);
`TM_PRESETS`, `FM_PRESETS`.

### Tokens and faces

- kb-* tokens only (`tokens.css`). Frame tokens on `.rd-frame`: `--ra-ctl` = `kb-tap` (44 px), `--ra-win-w` 28rem,
  `--ra-math-k` 1, `--ra-display-k` 1.5, `--ra-line` = `kb-secondary`; the highlight's `--an-mark/-2/-edge` as built;
  paper `--pp-*` as built in `kb-print.css`.
- Faces as built (Literata + Noto Serif KR reading, Fraunces display, Source Sans 3 interface, JetBrains Mono). New:
  **STIX Two Math**, self-hosted, as `--font-math` ("STIX Two Math", "Cambria Math", math) (F8).

### Data shapes (per chapter, per language; ids shared)

- Term: `{ id, term, alias[], short, long? }`; `short` and `long` are runs of text and inline math (F31). The 12
  terms of the fixture live in `Gloss.dc.html` (`RA_GLOSS`).
- Formula: `{ id, alt, read, legend: [{ sym, runs: [text | { term: id, text }] }] }`, the MathML language-free
  (`MathBlock.dc.html`, `RA_FORMULAS`). The legend's symbols are exactly the formula's, in order (F7).
- Term occurrences: `tm-<id>-<n>`, numbered across the text and the legends (F33).

### The term marker (F2, F22)

`<a class="ra-term" id="tm-<id>-<n>" href="#gl-<id>" aria-haspopup="dialog" aria-expanded aria-controls="tw-<id>">`,
only where the author wrote a term link. Ink text, dotted 0.09em `kb-secondary` underline at 0.24em (ko 0.28em);
hover: accent dots, cursor `help`; open: solid 2 px accent line; focus: the system ring; inside `mark.an-m`: ink dots.
Click, tap, Enter and Space open it (Space by a key handler); without script the link lands on the entry. An opened
term stays unchanged (OQ5). A link to an id with no entry is plain text. A hyphenated term never breaks at its hyphen.

### The window (container ≥ 40rem; F3, F5, F18, F19, F32)

- One `.ra-float` (absolute in the chapter's positioned wrapper, `width: min(28rem, 100% - 2 × gutter)`) holding the
  open term's window: the annotation popover's box (`kb-surface`, 1 px `kb-border-strong`, `kb-radius`,
  `kb-shadow-raise`), `role="dialog"` labelled by the term, `tabindex="-1"`. Head: the term (Fraunces semibold, text
  size) and **Close** (44 px) on one centre line; "Also called …" (13 px, `kb-secondary`); the short definition
  (Literata, `--rd-fs`, 1.55); the longer one below a `kb-border` hairline when open; foot: **Read more / Show less**
  at the start (`.ra-swap`, both labels start-aligned in one box), **In the glossary →** at the end (alone when there is
  no longer definition).
- Placement: left = the term's first line box left; if it would pass the column's right edge, left = column right −
  width; top = the term's last line bottom + `kb-space-xs`; if the room below inside the visible area (under the top
  bar) is short of the window's height + gap and the room above is enough, anchor by `bottom` at the term's first line
  top − gap (the longer definition then grows upward). Placed hidden (`data-placed="0"`), shown once placed; re-placed
  on resize. Never covers the term.
- Opening: hover rests 250 ms (mouse, `(hover: hover) and (pointer: fine)`) → opens, focus stays in the text; leaving
  term and window for 200 ms closes a hover-opened one; a hover never replaces a clicked window. Click / tap / Enter /
  Space opens and focuses the window; a click on the open term closes it. Tab order Close → Read more → In the
  glossary →; Tab past the last closes and continues in the text; Shift+Tab out of the first closes back to the term.
  Esc closes and focuses the term. A mousedown outside window and terms closes it. One window at a time across text
  and legends. 0.15 s fade in, none under `prefers-reduced-motion`. The body scrolls past `min(32rem, 70vh)`.

### The phone sheet (container < 40rem; F4)

`rd-sheet` anatomy, no scrim, fixed to the bottom: head (term, **Close** 44 px), body (aliases, short, longer), foot
(**Read more / Show less**, **In the glossary →**, 44 px) above a hairline; max height 60 % of the viewport (85 % with
the longer open), the body scrolls. On open and on Read more the page gets bottom padding equal to the sheet's height
and scrolls the term's last line to 1rem above the sheet's top; focus moves into the sheet; Close, Esc or a tap outside
close it and focus the term; a tap on another term swaps the content. Text at `--rd-fs`, never smaller.

### Highlight meets term (F2)

A click on `mark.an-m` outside a term opens the annotation popover (05-annotations, unchanged) and closes the window;
a click on the term inside it opens the window and closes the popover. Never two floating things at once.

### The glossary section (F6, F17, F25, F33)

After the chapter's quiz, before its Sources. `<h2 id="glossary">Glossary</h2>` (English in every chapter), then the
list with no opening hairline of its own; entries A to Z by `Intl.Collator(lang, { sensitivity: "base" })` (Korean 가나다,
Latin after); entry `id="gl-<id>"`: term (Fraunces semibold, 1em), "Also called …", short, then the longer in full;
column-wide hairline dividers, only the arrived entry's ground bleeds `kb-space-md`. "In the glossary →": close the
window, mark the entry (`:target` / `is-target`: `kb-surface-sunken` ground, 1 px `kb-border-strong` inset), scroll it
under the top bar, focus it (`tabindex="-1"`), show **‹ Back to the text** (`fg-back`, 44 px) linking the very
occurrence `#tm-<id>-<n>` (a legend term included); Back scrolls that occurrence to the centre, focuses it and clears
the mark. A chapter with no terms has no section.

### Inline formula (F7, F24)

`math.ra-m` in the sentence: STIX Two Math at 1em, `white-space: nowrap`, linear forms only, single-letter variables
italic, words and numbers upright, `alttext` in the chapter's language. The fixture's snippets: `s = mean ÷ sd`,
`t = s × √n`, `t ≈ 2.19`, `(Σe)² ÷ Σe²` (the square on the closing paren, F24), `λ = rate × time`, `e^(−λ)`. Shares
and figures with their units never break inside (F23); a `[PLACEHOLDER]` share keeps only its last word with its unit
(F34).

### Display formula block (F7, F27)

`figure.ra-mb` after the paragraph that introduces it: a band between two `kb-border` hairlines, all on the column's
left edge. `.ra-mb__eq`: the formula at 1.5 × the text; several relations one a row, aligned on the relation sign
(left side right-aligned, sign centred, right side left-aligned); a row wider than the column scrolls inside its own box
with a 2.5rem mask fade on the side with more and becomes a focusable `role="region"` named "Formula, scrolls
sideways". `figcaption.ra-mb__cap`: the reading (one plain sentence, Literata, text size), "where" (lowercase italic;
ko 여기서, upright), `dl.ra-legend`: symbol (math face, text size) | meaning (Literata, `--rd-fs-s`), first baselines
shared, **one symbol column width for every legend in the chapter** (this chapter 5.25 × the symbol size; F27); a
meaning breaks a word wider than its column (`overflow-wrap: break-word`, F36).
Legend meanings that name a glossary term mark it as a `.ra-term` with the same window (OQ4). Spoken: `alttext`, then
the caption. The fixture's blocks: `tstat` (s = mean ÷ sd, t = s × √n), `worked` (four steps on =, =, ≈, ≈),
`participation` (N = (Σᵢ eᵢ)² ÷ Σᵢ eᵢ², typeset fraction), `poisson` (λ = rate × time, P(no event) = e^(−λ)).

### Paper (F10, F26, F28)

`kb-print.css`, the same DOM, `@page` as signed (`16mm 15mm 18mm`). In order: masthead and title (signed 09; F28) →
the chapter body → the quiz paper form (signed 04/09) → **Glossary** (h2, `break-after: avoid`) → Sources → Answers →
colophon. Marker: ink text, 1 px dotted `--pp-hint` (#6d665a) underline at 0.22em, nothing printed after the link; a
member's highlight does not print. Inline math at 1em of the 14 px text. Display block: formula 21.33 px (16 pt),
reading and legend 14 px, "where" 12 px, `break-inside: avoid`, the lead-in paragraph `break-after: avoid`,
max-width 38em, symbol column 5.25em. Glossary appendix: `.ra-pgl` entries A to Z, term Fraunces 600 14 px, "Also
called" 12 px Source Sans 3 `--pp-sec`, short and longer Literata 14 px / 1.55, a `--pp-border` hairline under each,
each `break-inside: avoid`, max-width 552 px, no "Back to the text". Korean: content in Korean, chrome English as
signed. Rhythm as signed 09 (10 px between blocks, 14 px around a wide block, 24 px above an h2, 28 px above the
colophon).

### Pages and states the build must reach (what the canvas shows)

- **Terms** (`Terms.dc.html`): rest, hover open, focus open, longer open, no longer definition, edge (right and
  bottom, opens above and shifts left), phone 390 and 320 (sheet), term in a highlight, the highlight's note, Korean,
  glossary arrived (with the way back), dark rest / open / glossary.
- **Formulas** (`Formulas.dc.html`): rest (inline formulas, four display blocks), a legend term open, Read more open,
  Korean, dark, dark with a term open, phone 390 (and a term open in the sheet), phone 320 with the long `worked`
  formula scrolling in its own box.
- **Print** (`Print.dc.html`): A4 and letter, English and Korean: the body with markers and inline math, three
  display blocks, the quiz, the glossary appendix, sources, answers, colophon.

### The click-through wiring (the join)

- Formulas' "In the glossary →" (window and sheet, any legend or text term) goes to that term's entry in the
  chapter's glossary (`#gl-<id>`), remembering the occurrence; the entry's "‹ Back to the text" returns to that very
  occurrence, a legend term included (F33). On the canvas: `on-open-terms { term, from, lang, theme }` → Terms at the
  entry; `on-back { from, lang, theme }` → Formulas with `from`, which scrolls to and focuses the term.
- Every page emits `on-state { lang, theme }` (Print `{ lang }`) when its language or theme changes; Main keeps it
  outside its state and opens the next part in it (F35). In the product the parts are one chapter: one `lang`, one
  `theme` per chapter view.
- Canvas-only: Main reserves Terms' state-bar height at every width (media steps 41–269 px), so the header holds.
- Nothing opens print in the product (F20).

## Critique pass 01

Answering `critique-01.md` (scope cross, mode critic: nothing held for a judge). Edits beyond link wiring, each logged:
Main (the bar reservation, `on-state`, h 6066 → 6084, so the components row moves to y 6204), Terms (`on-state`, h 5320
→ 5330), Formulas (`on-state`, F36's rule), Print (`on-state`, one wording), Gloss (F34's data only: two keeps in
`drawdown`'s longer definition; a frame file, edited by the join because the shared fixture's text is where the choice
applies, and logged here for the orchestrator).

- C01 fixed: Main reserves Terms' bar height at every width, not from 1100 px up. Terms' bar is the tallest of the three
  at every width; its heights were measured from 300 to 2000 px (41, 59, 89, 119, 149, 179, 209, 239, 269 px, wrapping
  at 1772, 1579, 809, 613, 433, 403, 364, 310 px) and set as media steps. Harness (`<scratch>/join-c1/flow.py`): the
  header's y on Formulas, Terms and Formulas again is equal at every width tried (44 at 1920, 62 at 1600, 92 at 1440,
  1280, 1024 and 820, 152 at 600, 212 at 390, 242 at 320): it never moves. Logged join-N3 (another system face could
  move a wrap point a few px).
- C02 fixed (F35): each page emits `on-state { lang, theme }` (Print `{ lang }`) whenever they change, by the Shell
  switch or a preset; Main keeps them outside its state (the page is not handed back its own choice) and opens the next
  part in them. Harness: Shell 한국어 on Formulas → foot strip Terms opens in Korean (실행 채점하기, 한국어 pressed) → On
  paper opens 한국어 · A4; Print's English · A4 → Formulas in English; Formulas' Dark preset → Terms in dark.
- C03 fixed: one wording, the frame's (MarkStates, F12) and Terms': Print now reads "Picking the best of many backtests
  flatters it."
- C04 fixed: Terms h 5320 → 5330 (canvas.json, `$preview`, pages/terms/boards.json, Main's hint).
- C05 fixed (F34): `[DRAWDOWN LIMIT] of K` now breaks inside its brackets (`LIMIT] of K` kept whole; ko `K의 [낙폭` and
  `한도]입니다.`). Render at 390 with 200 % text: Terms is 390 px wide (was 500), and with F36 (C06) Main and Formulas
  are 390 too (was 422): no page reflows.
- C06 fixed and logged: the views past 8,000 px were checked by harness (`<scratch>/join-c1/tall.py`): at 320 and at 390
  with 200 % text, the whole document's sideways width, the preview's own overprint script over every text run, and
  screenshots of every part below 8,000 px (`<scratch>/tall-*.png`). Found one thing: at 200 % text a legend meaning's
  long word ("independent") ran past the screen: it was the 422 px the round had put on the Shell; fixed by F36 (`overflow-wrap: break-word`
  on the meanings). Overprint: only the Shell's "‹" over "English" (join-G1). The `too-tall` lines stay, as intended: a
  chapter at 320 px or 200 % text is longer than the render's cap.
- C07, C08 (gaps): logged as join-G1 and join-G2; the signed Shell and 05 popover are not restyled.
- C09, C10 (advisories): left to the operator. C10: the frame holds the tallest state (Print), as the canvas requires.
