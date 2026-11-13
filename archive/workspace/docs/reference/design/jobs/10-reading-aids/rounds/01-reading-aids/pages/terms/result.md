status: done
pass: page terms
job: 10-reading-aids
round: 01-reading-aids
frame_gaps:
- terms-FG1 glossary opening hairline: the h2 "Glossary" already carries the reader's rule, so the list's own opening hairline (F6) doubled it 20 px below. Drawn: no opening hairline on the list (`.tm-article .ra-gl { border-top: 0 }`); the h2's rule opens it.
- terms-FG2 window Tab order: F3 says Read more → In the glossary → Close; Gloss's markup puts Close first. Drawn as Gloss builds it (Close, Read more, In the glossary); Tab past the last control closes the window and carries on in the text, Shift+Tab out of it closes it and returns to the term.
- terms-FG3 sheet height on the canvas: F4's "60 % (85 %) of the viewport" is measured against the phone box (the simulated viewport) on this board, not the canvas window.
- terms-FG4 hover against a clicked window: F3 says one window at a time; drawn: hovering another term never replaces a window opened by click or keyboard; it replaces only a hover-opened one.
- terms-FG5 on-open-print: F15 lists it for terms, but the chapter excerpt has no product control that opens print (print is the browser's). Drawn: none; the join reaches print from the entry Page.
- terms-FG6 hyphenated words in a line (critique C01): F2/F13 say nothing on breaking. Drawn: a term or name with a hyphen never breaks at it (`t-통계량`, `t-statistic`, `CONDITIONAL-GO`: `white-space: nowrap` on the word, `.tm-nobr`); the line breaks before it.
- terms-FG7 a share as one value (critique C06): F11 writes `+0.10 % of K` with plain spaces. Drawn: the spaces inside a share are no-break (`+0.10 % of K`, `0.25 %`, ko `K 대비 +0.10 %`). Gloss's definitions (a frame file) still use plain spaces: the join should apply it there and in the Formulas and Print pages' prose.
- terms-FG8 the inline `(∑e)²` (critique C03): F12's snippet puts the square on the whole `mrow`, so it rides over the ∑ and the parens stand off. Drawn: `<mrow><mo stretchy="false">(</mo><mo lspace="0">∑</mo><mi>e</mi><msup><mo stretchy="false">)</mo><mn>2</mn></msup></mrow>` (the square on the closing paren, as TeX sets it; no space after the opening paren). The two squares now sit within about 1.5 px; the join should carry it to MathInlineStates and Formulas.
- terms-FG9 glossary dividers on the column (critique C05): F6 bleeds each entry `kb-space-md` into the gutter, so its divider ran 16 px past the h2's rule on each side. Drawn: the divider is a column-wide hairline (`::after`, inset `kb-space-md`), only the arrived entry's sunken ground and box bleed. For the join to fold into Gloss.
events:
- on-back { from }: the arrived glossary entry's "‹ Back to the text" when `from` is not a term occurrence on this page (wired only when the join passes on-back; otherwise that entry shows no way back)
component_gaps:
- terms: the reader's language switch (signed 01-reader, in the frame's Shell) pressed fill 1.24:1 light / 1.47:1 dark against the bar (1.4.11, blocking) — as the frame logged; not restyled.
- terms: the Shell's back link "‹" and the language switch overprint at 390 px with 200 % text (1.4.4, blocking, new on a Page render): signed 01-reader top bar in a frame file; not restyled. For the frame owner / the build.
- terms: the Shell's back link "Book" is 43.6 × 44 px at 320, and its label is cut to "B…" there, so the reader cannot tell where it leads (signed part; critique C09).
- terms: frame-A1 again, "Show less" starts 2.9 px right of the text edge where "Read more" sat flush (the shared swap box centres the shorter label), in the desktop window and in the phone sheet (Gloss `.ra-more` / `.ra-swap`, a frame file; critique C04).
- terms: the inline `(∑e)²` (F12's snippet in MathInlineStates, frame-owned) — redrawn on this page as terms-FG8; the frame's snippet still carries the loose form (critique C03).
open_items:
- terms-FG1..FG9 above, for the join to settle
- terms-C10, terms-C11 (critique advisories, the window's fixed x on a wrapped term; the way back at the entry's end): the operator's taste, left as drawn
- terms-G1 the Shell overprint at 200 % text (blocking self-check line, frame-owned)
- terms-D1 dark presets are not clicked by `design-preview` (it dedupes states by text, and dark repeats Rest/Longer open/Glossary): verified by a one-off dark render in scratch, no contrast line

## Summary

`Terms.dc.html`, one interactive Page (1440 × 5320): the reader as signed with two sections of "Our bar: performance
rule v1" (12 marked terms, a plain link, a highlight), then the quiz (04-quiz, copied at rest), the Glossary (Gloss
`list`) and the Sources (02-figures, copied): F6's place among its real neighbours. Click, Enter or Space on a term
opens Gloss's window placed by F3; hover after 250 ms; Esc returns focus; "In the glossary →" marks the entry, whose
"‹ Back to the text" returns to the term. Under 40rem the phone sheet (F4). 15 presets: rest, hover, focus, longer,
no longer, edge (a 1440 × 900 box), phone 390 and 320 (boxes), highlight, its note (05-annotations' popover, copied),
Korean, glossary, three dark. Critique 01: must-fix C01–C03, C05, C06 fixed; gaps C04, C07–C09 logged. Departure: the
boxed views. Open: terms-FG1..FG9, G1, D1, C10, C11.

## Build (the terms page's fragment)

Canvas-only, never built: the state bar, the copies of the signed quiz, sources list and annotation popover (built by
04-quiz, 02-figures and 05-annotations, unchanged; here only to show the aids among them), the boxed views (`.tm-stage`, `.tm-box`, `.tm-scroll`, the sticky `.tm-top`), `TM_PRESETS`.

- **Where:** inside the reader's chapter (`.rd-flow.rd-prose`); every term link the author wrote becomes F2's marker
  `<a class="ra-term" id="tm-<id>-<n>" href="#gl-<id>" aria-haspopup="dialog" aria-expanded aria-controls="tw-<id>">`.
- **Window (container ≥ 40rem):** one `.ra-float` (absolute, in the chapter's positioned wrapper, `width: min(28rem,
  100% - 2 × gutter)`), holding Gloss `window` for the open term. Placement: left = the term's first line box left; if
  left + width > the column's right, left = column right − width; top = the term's last line bottom + `kb-space-xs`;
  if the room below inside the visible area (the viewport under the top bar) is less than the window's height + gap
  and less than the room above, it anchors by `bottom` at the term's first line top − gap (so the longer definition
  grows upward). Placed hidden (`data-placed="0"`), shown once placed. Hover: 250 ms in, 200 ms out over term and
  window; a hover never replaces a clicked window. Click / Enter / Space: open and focus `#tw-<id>`; click on the
  open term closes it. Esc: close, focus the term. Tab past the last control: close, focus moves on in the text;
  Shift+Tab out: close, focus the term. Mousedown outside window and terms: close. Resize: re-place.
- **Sheet (container < 40rem):** Gloss `sheet`, fixed to the bottom; on open and on Read more the page gets bottom
  padding equal to the sheet's height and scrolls so the term's last line sits 1rem above the sheet's top; focus the
  sheet; Close / Esc / tap outside close it and focus the term; a tap on another term swaps it.
- **Highlight:** a click on `mark.an-m` outside a term opens the annotation popover (05-annotations, unchanged) and
  closes the window; a click on the term inside it opens the window and closes the popover.
- **Glossary:** after the quiz, before the Sources (F6). h2 "Glossary" (`id="glossary"`), then Gloss `list` (no opening
  hairline under the h2, terms-FG1; dividers on the column, only the arrived entry bleeds, terms-FG9).
- **Text:** a hyphenated term or name never breaks at its hyphen (terms-FG6); a share's inner spaces are no-break
  (terms-FG7); the inline `(∑e)²` carries its square on the closing paren (terms-FG8).
  "In the glossary →": close the window, mark `#gl-<id>` (`is-target`), scroll it to the top, focus it, show "‹ Back to
  the text" linking `#tm-<id>-<n>` of the occurrence the reader came from; Back: scroll that term to centre, focus it,
  clear the mark.
- **Props (F15):** `lang` (en / ko: the chapter's text), `theme`, `term` (an entry to arrive at), `from` (the
  occurrence to go back to; any other value goes out through `on-back { from }`).
- **Data:** Gloss's `RA_GLOSS` (F12) and the passages below; nothing new.

## Intent

- **terms (Terms.dc.html):** the operator, mid-chapter in "Our bar: performance rule v1", meets "deflated Sharpe
  ratio (DSR)"; they came to understand the sentence without leaving it; first they must see the term's plain-words
  definition right under the term, the sentence still readable.

## Plan

One board, `Terms.dc.html` (Page, interactive, 1440 wide): the reader as signed (Shell bare, the reading column)
holding two sections of the chapter with 12 marked term occurrences, then the chapter's Glossary section (Gloss
`list`), then the Sources. The window is Gloss `window` placed in a `.ra-float` by F3's rule; the phone form is Gloss
`sheet`. No page-local component: everything shared comes from the frame (F2–F6, F12).

Views (state, not separate boards), so every screen sits on the one Page the operator plays:
- `desk`: the reader fills the board, in flow (the rest, open, glossary, highlight, Korean, dark states);
- `screen`: the same reader in a 1440 × 900 scroll box (the edge state);
- `p390` / `p320`: the reader in a 390 × 844 / 320 × 568 scroll box: the sheet sits on the box's bottom edge.
A plain hairline box hanging from the state bar, no device chrome; the top bar is sticky inside it, as in the
product. The visible area the window measures against is that box under the top bar ∩ the viewport.

Type: the reader's (18 px text, 15 px small, h2 1.45em Fraunces); window and glossary as the frame draws them.
Space: kb-space steps × --rd-k. Colour: ink, secondary, hairlines; accent only on links, the open term and focus.
Bold move: none of the page's own (the frame's is the display formula); this page stays quiet.

```
[ Prototype only · jump to a state:  Terms  Rest  Hover open  Focus open  ...                    ]
[ progress line ]
[ (logo) ‹ Our bar: performance rule v1                              English 한국어   Display ]
                 | How the scorer decides                       (h2, column's left edge)
                 | ... P&L in % of K .... s = mean ÷ sd ...      (marked terms: dotted line)
                 | ... walk-forward backtest ... haircut.
                 | Many trials, one bar
                 | ... The deflated Sharpe ratio (DSR) answers this ...
                 |     +-------------------------------+   left on the term's left edge, or its right
                 |     | Deflated Sharpe ratio   Close |   edge on the column's right edge; below the
                 |     | Also called DSR               |   term, above it when the visible area ends
                 |     | short definition (18 px)      |
                 |     | Read more   In the glossary → |
                 |     +-------------------------------+
                 | ... participation ratio ... eigenvalues e ...
                 | [highlight: The probabilistic Sharpe ratio (PSR) turns ...]
                 | Quiz · 1 question / Check the bar        (04-quiz's block, copied)
                 | Glossary                                       (h2)
                 | entries A to Z, hairlines; the arrived one sunken + ‹ Back to the text
                 | Sources [1] [SOURCE TITLE]               (02-figures' list, copied)
```

Alignment: every text block on the column's left edge; the window's term and Close share one centre line (the
frame's); the foot's actions at its two ends; the glossary's ‹ Back to the text on the entry's left edge.

### Plan review

- A "Tap a term to see its definition" line over the excerpt is the default helper copy: cut (F13).
- First drawn as canvas-only strips naming the quiz and the sources; critique 01 (C02) showed that "shown only as they
  are" means copying the signed blocks, as frame.css Part 1 copies the reader: now copied value for value.
- A modal-looking phone frame (status bar, notch) is device chrome: the phone views are plain hairline boxes.
- A second set of boards per view (a 390 board, a 320 board) would split the one Page the operator plays: views are
  presets of one Page, one state bar above, as the bar rule allows.

## Pages

- `Page — Terms: marked terms, their window and the glossary` (`Terms.dc.html`, 1440 × 5320, fill, interactive).
  Presets (each sets view, theme, lang, open term, its mode, longer, note, glossary target and origin):
  Rest · Hover open (DSR, focus stays in the text) · Focus open (Sharpe ratio, focus in the window) · Longer open
  (DSR) · No longer definition (Eigenvalue: no toggle) · Edge: right and bottom (participation ratio in a 1440 × 900
  box: shifted to the column's right edge and flipped above) · Phone 390 (DSR sheet) · Phone 320 (PSR, the long term)
  · In a highlight (PSR's window over the member's paint) · Highlight's note open (the popover stand-in; the window
  closed) · Korean (DSR, 디플레이티드 샤프 비율) · Glossary: arrived (DSR entry marked, with the way back) · Dark ·
  Dark: open (DSR, longer) · Dark: glossary.

## Data

Real: the passages of the brief's *Shared data*, verbatim (the scorer, DSR, the participation ratio, PSR), and the
inline formulas copied from `MathInlineStates.dc.html`; terms and definitions from Gloss (F12). Written for this page:
two short framing sentences ("The rule asks whether the average gain stands clear of its noise…", "Every figure in
this chapter comes from a walk-forward backtest…"), the two section headings, and the Korean text of the excerpt.
Placeholders: those of F11, inside the definitions. Nothing secret or personal. The quiz ("Check the bar", one
question) and the source (`[SOURCE TITLE]`, `[AUTHOR] · [YEAR]`; ko `[출처 제목]`, `[저자] · [연도]`) are the print page's
fixture, set in their signed web forms; the popover's copy is 05-annotations' own for a highlight with no note.

## States reached only by interaction

The marker's hover (accent dots) and its focus ring (Tab to a term); Tab, Enter and Space on a term; Esc and the
focus return; Tab out of the window; hover-intent close; click outside; swapping the sheet by tapping another term;
the language switch in the Shell (it resets to rest in that language).

## Render log

- Pass 1 (whole page, --click): the phone and screen boxes did not scroll (the scroller's `height: 100%` did not
  resolve through `.rd-in`'s `display: contents`), so the edge state opened below and the box itself scrolled;
  boxed views moved the top bar down 39 px; the list's opening hairline doubled the h2's rule; the annotation stand-in
  copy ran three lines; h 4800 was a guess.
- Pass 2 (--board): boxes made flex columns (the scroller scrolls), the top bar sticky inside them, boxed stages hang
  from the state bar (top bar keeps y), the double hairline removed, the note shortened, h measured (4739 → 4760).
  The edge term moved to the participation ratio (drawdown sat too high in the box to reach the bottom).
- Pass 3 (--board, over the two-pass budget, to confirm the edge flip and h): the edge window shifts and flips above;
  page-clip gone. A one-off dark render (into scratch, initial state forced dark with a window and a target, then
  reverted) showed no contrast line in dark. Pass 4 (--board) after adding F15's props: same lines as pass 3.
- Last line: `self_check=fail blocking=non-text-contrast:1,overprint:1`, both in the frame's Shell (signed 01-reader
  top bar), logged as gaps above.

## Measured lines (each fixed or logged)

- fixed: page-clip ×7 (h 4760), layout-shift on the boxed presets' header y (stage padding, sticky top bar), the
  double hairline (seen on the PNG).
- intended: layout-shift ×14: the Phone 390 / 320 presets move the top bar sideways into the phone box (a canvas view
  chosen from the state bar); every other line is `main` moving under a top bar that holds, from the scrolls the frame
  specifies: F4's scroll that keeps the term above the sheet (open, Read more), F6's scroll to the arrived entry, the
  in-page link to "Many trials, one bar", and the Korean text reflowing on the language switch.
  `cramped-padding` on `mark.an-m` (the signed highlight has no padding). `tight-leading` on the paragraph with inline
  math (the measure reads the math element's box; the paragraph keeps 1.65, as the frame logged) and on the Korean h2
  (the reader's signed h2 line height 1.2). `straggler` on the Korean PSR paragraph at 320 (`keep-all` with `text-wrap:
  pretty`: Chromium does not rebalance keep-all lines; the copy is the chapter's).
- logged as gaps: non-text-contrast (Shell language switch), overprint at 200 % (Shell back link vs language switch),
  target "Book" 43.6 px (Shell), near-edge 2.9 px (Gloss sheet, frame-A1).

## Critique pass 01

Render: two `--board Terms.dc.html --click` passes (`self_check=fail blocking=non-text-contrast:1,overprint:1`, both the
Shell's, as before); `design-check --page terms` OK (one token-drift warning: the copied signed values `1px`, `1.5px`,
`2px` and the divider's 1 px hairline, kept verbatim). h 4760 → 5320 (the tallest state, the arrived glossary, 5301).
One CSS-only line after the last render (05's `.rd-btn--secondary` border on "Add note", missing from frame.css) was
not re-rendered, inside the two-pass budget.

- C01 fixed: `t-통계량` (and `t-statistic`, `CONDITIONAL-GO`) never break at the hyphen (`.tm-nobr`); state 10 shows the
  term whole on its line. terms-FG6.
- C02 fixed: the three stand-ins are gone. The quiz (04-quiz `.qz`, at rest, the print page's "Check the bar"), the
  Sources (02-figures `.fg-src` under h2 "Sources") and the highlight's popover (05-annotations `.an-box.an-pop`:
  Highlight, where, Add note, Review this · Off/On, Delete highlight; 24rem, centred on the highlight, 8 px under it)
  are copied value for value from the signed CSS and rendered DOM; they take the theme's tokens, so the dark presets
  show them dark. Close, Esc and the review switch work; Add note and Delete highlight are 05's flows, drawn and not
  wired; the quiz is shown at rest, not answerable here.
- C03 fixed (and logged): the square now sits on the closing paren and the paren hugs the ∑; the two squares sit within
  about 1.5 px. terms-FG8, plus a component_gaps line for the frame's snippet.
- C04 logged: the window case joins frame-A1 in component_gaps (Gloss, a frame file).
- C05 fixed: the dividers run 432–1008 on 1440, on the h2's rule; only the arrived entry's ground bleeds. terms-FG9.
- C06 fixed: `+0.10 % of K` and `0.25 %` keep one line at 390 (no-break spaces). terms-FG7.
- C07, C08 logged as before (Shell, signed 01-reader). C09: the truncated "B…" label added to its gap line.
- C10, C11 (advisory, 2b): the operator's taste; left as drawn, open.
- Measured lines new this pass: `size-count` 7 sizes (11 px is the copied quiz label and popover kind, 21 px the quiz
  title: signed sizes, logged as intended); `align near-edge 1.9px` math vs math at 320 (state 07: two inline formulas
  on stacked lines, not columns that share an edge; intended). The rest as before.

