status: done
pass: page print
job: 10-reading-aids
round: 01-reading-aids
frame_gaps:
- print-FG1 the paper measure of this job's blocks: the display formula band at the prose's 38em (`.pp-p`, 532 px), so its hairlines end where the prose's measure does; the glossary appendix at 552 px (the signed colophon's 46em of 12 px), so its hairlines end where the colophon's rule does on the same sheet (critique C04) and a definition runs about 72 characters a line (at the full 680 px column it ran about 95).
- print-FG5 the legend's symbol column across a chapter's blocks: F7 sets a `max-content` symbol column, so each block's meanings start at its own x (45, 33, 81 px; critique C02). Drawn on paper as one width, 5.25em, the widest symbol's (P(no event), about 4.9em) plus room, so every legend's meanings share one edge (85.5 px from the band's left). Set in Print's own style (`.pr-mc .ra-legend`); the join should make it F7's rule (screen included) or settle another answer.
- print-FG2 what the masthead names: the brief calls "Our bar: performance rule v1" a document and the frame names it as both chapter and book; drawn as the signed loose-document masthead "knowledge · [PROJECT]" over "[ADDRESS] · v[N], [DATE] · Printed [DATE]", with the title "Our bar: performance rule v1" (ko "우리의 기준: 성과 규칙 v1") as the h1.
- print-FG3 the excerpt's section headings: the frame fixes the passages, not the headings around them; drawn "Is the edge real?", "How many trials really ran", "When nothing happens" (ko "우위는 진짜인가", "실제로 몇 번 시도했는가", "아무 일도 없을 때"). The join should give the three pages one set.
- print-FG4 the quiz on paper needs an item: drawn one, from the brief's passage ("Check the bar" / "기준 확인": which bar fifteen events' t clears; key B, CONDITIONAL-GO's 1.5).
events: none (paper; the contract's `print` emits nothing)
component_gaps:
- print-G1 (critique C05) the frame's `Gloss` data (`RA_GLOSS`, `Gloss.dc.html`) types the Sharpe ratio entry's formula as plain upright text ("s = mean ÷ sd"), while F7 sets a formula in a sentence as inline math; on paper the one formula shows in two looks. Frame-owned: for the join (and R1), not changed here.
open_items:
- print-O1 inline math on paper reads a little lighter and smaller than Literata at 14 px (STIX Two Math at 1em, F7); a frame-wide matter for the join and R1, not changed here.
- print-O2 at 390 and 320 px the sheets keep their print size and lie in one row that scrolls sideways in its own box (a focusable region "Sheets, scroll sideways", one sheet a snap stop); the page never scrolls sideways. A sheet is wider than the phone, so only its left part shows at a time (critique C06, advisory, the operator's).
- print-O3 placeholders the operator's document would fill: [PROJECT], [ADDRESS], v[N], [DATE], the one source ([SOURCE TITLE], [AUTHOR], [YEAR]).

## Summary

`Print.dc.html`, one interactive Page: the chapter "Our bar: performance rule v1" on paper, cut into real sheets at
print size (A4 794×1123 or US Letter 816×1056, the signed 60/57/68 px margins), one a row on a desk. The flow is set
once and each sheet shows one column of it, so the breaks fall where `break-inside: avoid` puts them (five sheets each). In order: masthead, title, three short sections with the brief's
passages verbatim (quiet paper marker, inline formulas), three display formulas with reading and legend, the quiz's paper form, **Glossary** (`Gloss form="paper"`, 12 entries A to Z, longer
definitions in full), Sources, Answers, colophon. State bar: language × paper (4 presets). Departures: sheets at print size, one a row, not the signed board's two-up at 85 %; narrower than a sheet
(phone) the sheets lie in one sideways row, one sheet a snap stop. Frame gaps print-FG1–FG5; gap print-G1; open
print-O1–O3. Critique 01: C01–C04 fixed. Self-check pass.

## Build (the print page's fragment)

Canvas-only, never built: the state bar, the desk (`.pr-root`, `.pr-desk`, `.pr-sheets` and its phone row, `.pr-slot`, captions), the
sheet, window and multi-column cutting (`.pr-box`, `.pr-sheet`, `.pr-win`, `.pr-mc`, `inert`), the page-count
measure. The product's print engine cuts the pages; `@page` stays as signed (`16mm 15mm 18mm`).

- **What prints, in order** (`kb-print.css`, `@media print`, the same DOM): masthead and title (signed 09) → the
  chapter body → the quiz paper form (signed 04/09) → **Glossary** (h2, F10) → Sources → Answers → colophon (signed
  09). A chapter with no terms prints no Glossary.
- **The marker on paper:** `.ra-term` as F2: ink text, a 1 px dotted underline in `--pp-hint` #6d665a at 0.22em;
  no window, no control, no "Read more"; the term link prints nothing after it (an in-document `#` link). A
  member's highlight does not print (signed 09 OQ7), so a term in a highlight prints as any other term.
- **Inline formula:** `math.ra-m` at 1em of the 14 px text, nowrap (F7).
- **Display formula:** `figure.ra-mb` with the frame's paper rules (formula 21.33 px, reading and legend 14 px,
  "where" 12 px, `break-inside: avoid`); the paragraph just before it keeps with it (`p:has(+ .ra-mb) { break-after:
  avoid }`, the signed lead-in rule); **max-width 38em** (print-FG1). Legend terms print as the paper marker. The legend's symbol column is **5.25em**
  in every block, so all meanings start on one edge (print-FG5).
- **Glossary appendix:** h2 "Glossary" (English in every chapter, F1; `break-after: avoid`), then `.ra-pgl` entries A
  to Z by `Intl.Collator(lang)`: term (Fraunces 600 14 px), "Also called …" (12 px Source Sans 3, `--pp-sec`), the
  short and the longer definition (Literata 14 px / 1.55), a `--pp-border` hairline under each, each entry
  `break-inside: avoid`; the list at **max-width 552px**, ending with the colophon's rule (print-FG1). No anchors' "Back to the text" on paper.
- **Rhythm on paper (signed 09):** 10 px between blocks, 14 px around a wide block, 24 px above an h2, 28 px above
  the colophon.
- **Korean:** body, title, headings, quiz content and glossary in Korean; chrome stays English (masthead label,
  "Quiz · 1 question", "Choose one answer.", "Glossary", "Sources", "Answers", colophon), as signed (D36 (4)).
- **Data used:** the passages, terms and formulas of the shared fixture (F12); headings and the quiz item from
  print-FG3/FG4.

## Intent

- **print (`Print.dc.html`):** the operator, away from the screen with the printed explain chapter "Our bar:
  performance rule v1"; they came to read it as plain prose on paper; first they must see the text, quiet, with the
  formulas set well and the glossary at the back as a reference list.

## Plan

One Page, `Print.dc.html`: the chapter on paper, cut into real sheets (signed sizes and margins), shown on a desk.
The flow is set once per sheet as a window into one multi-column flow, so the breaks fall where the print engine's
`break-inside: avoid` puts them, and A4 and letter differ only there (F10).

- Sheet content in the signed paper order with the glossary placed by F6/F10 (see *Build*).
- Type steps (paper, signed): title 26.67 px, h2 18.67 px, body 14 px, display formula 21.33 px, labels 12 px.
- Space: the signed paper rhythm; the desk on `kb-space` steps, sheets in an `f-stack` inside an `f-center`.
- Colour: the paper palette (`--pp-*`) on the sheet; the desk `kb-paper`, the sheet's edge `kb-border-strong`.
- Bold move: none new on this page; the frame's display formula, at 16 pt on paper, is the memorable thing.
- Presets: lang × paper, the page contract's props.

Layout: the state bar, then a centred column of sheets, each captioned on its left edge; inside a sheet every block
starts on the 57 px margin, prose, formula band and glossary at the 38em measure.

```
[Prototype only · jump to a state:  Print [English · A4] [English · US Letter] [한국어 · A4] [한국어 · US Letter]]
                 Page 1 of 5 · A4, at print size
                 +-------------------------------+
                 | KNOWLEDGE · [PROJECT]         |
                 | [ADDRESS] · ... ------------- |
                 | Our bar: performance rule v1  |
                 | h2 · prose, dotted terms, math|
                 | ── t = s × √n, reading, where |
                 +-------------------------------+
                 Page 2 … Page 5 (quiz, Glossary A–Z, Sources, Answers, colophon)
```

### Plan review

- The three print checks (a page of text, a display formula, the glossary appendix) are all sheets of one flow, so
  no preset is needed to reach them; A4 and letter are presets as F10 asks.
- The signed Paper board's head with a lead paragraph explaining the sheet is explainer copy: dropped; the state bar
  names the page and each caption says which sheet it is.
- The glossary at the full 680 px column ran ~95 characters a line: revised to 38em, the band with it (print-FG1).

## Data

Real: the brief's passages verbatim (English), the 12 terms and three formulas through the frame's `Gloss` and
`MathBlock` (F12), the signed paper copy ("Quiz · 1 question", "Choose one answer.", "Answers are at the end of this
chapter.", the colophon's sentence). Written here: the Korean passages (합니다체; the DSR sentence as the frame's
MarkStates has it), the three headings, the quiz item and its answer (print-FG3/FG4), the English lead sentence
"Picking the best of many backtests inflates the result." (the frame's Korean sample's English). Placeholders:
print-O3. Nothing secret or personal.

## States reached only by interaction

None: paper has no control. The four presets are the page's states; every sheet of each shows at once.

## Render log

- Pass 1 (two-up, scaled to fit, as the signed Paper board): the cut worked (five A4 sheets), but the scaled sheets
  made the measures report scaled values (a figure's text "6.9 px from its top edge", 8.2 px at print size), and that
  line's excerpt split a math italic, so `design-preview` crashed writing `preview.json` (the frame's tool note).
  Also a script error (the runtime's `componentDidUpdate` has no `prevState`) and dead `#gl-*` links from the
  legends. Fixed: sheets at print size one a row (true measures, legible at true size), the column scrolling in its
  own box below a sheet's width; legends mounted without `glossary`; the update compares its own signature.
- Pass 2: layout right; the script error remained (traced to `componentDidUpdate`'s arguments), fixed.
- Pass 3 (one over the budget, to verify the script fix): `errors=0`, `self_check=pass blocking=none`, every preset
  clean, keyboard 4 Tab stops (the bar) for 0 controls. Tallest state 5995 px (A4, five sheets): `h` 5996.
- `design-check 10-reading-aids --page print`: OK, one warning (token-drift, logged below).
- Critique pass 01 (one render, `--page print`): `too-tall` gone (text200 now 390×1386: the 16 sheets at 200 %
  text lie in the sideways row); every legend's meanings on one edge (sheet 2 seen: λ, rate, time, P(no event), e
  meanings flush); sheet 5's glossary hairlines and colophon rule end together; captions "Page 1 of 5 · A4, at print
  size", then "Page 2 of 5" …; `self_check=pass blocking=none`, errors 0, the same 7 advisory lines as before, each
  logged above (`ragged-edges` still 25 edges: its count is of the five clipped copies of the flow; the visible
  sheet now keeps two text edges, the 57 px margin and the legend's meaning column, plus the signed quiz,
  sources and answers number columns). `design-check --page print`: OK, the token-drift warning as logged.

## Measured lines (each fixed or logged as intended)

- fixed: dead-link ×5 (legend terms), script-error, page-clip (h).
- intended: `align first-line` on formula cells and `tiny-text` (9.8 px math scripts), `tight-leading` (the math
  element's own box), `label-ink` on `.ra-term` (inline text, not a control): all as the frame logged them.
  `size-count` (9 sizes): the signed paper steps (12, 14, 16, 18.67, 21.33, 26.67) plus math scripts (10) and the
  canvas caption (13) and bar; nothing to merge on paper. `ragged-edges` (25 left edges): every sheet holds a copy of
  the whole flow, clipped to its window, so the count multiplies by five; the visible text keeps one 57 px margin and
  one legend meaning column (print-FG5). `too-tall` on text200: fixed in critique pass 01 (the phone row). `token-drift` warning: the
  signed paper's px values (96 px/in, 1 pt = 4/3 px) copied from 09's `paper.css`, where a token match (`14px` =
  `--kb-graph-node-r-max`) would be wrong.

## Critique pass 01

- C01 fixed: narrower than a sheet (`@media (max-width: 56rem)`), the sheets lie in one row that scrolls sideways
  in its own box, one sheet a snap stop; the text200 view is now 390×1386, no `too-tall`. The 1440 frame keeps
  its column of sheets (h 5996 unchanged).
- C02 fixed: the legend's symbol column is one width (5.25em) in every block on paper, so the three legends'
  meanings share one edge; logged as print-FG5 for the join.
- C03 fixed: the size note is said once, on the first caption ("Page 1 of 5 · A4, at print size"); the rest read
  "Page N of 5".
- C04 fixed: the glossary appendix's measure is 552 px, the signed colophon's, so both rules end on one edge
  (print-FG1 updated); the formula band keeps the prose's 38em.
- C05 (gap) logged as print-G1, frame-owned, for the join.
- C06 (advisory) the operator's: the 1440 layout kept; the phone row (C01's fix) shows one sheet at a time with a
  snap stop, the rest as print-O2.
- C07 (advisory) the operator's: the signed lead-in rule kept (`p:has(+ .pp-b--wide) { break-after: avoid }`).
