# Frame — 10-reading-aids / 01-reading-aids

The shared choices every page draws from. One answer each. A page that needs a choice not here logs a `frame_gaps:`
entry with the answer it drew; the join settles it as a new `F<n>` below. "As built" quotes the repo; everything else
is this frame's answer, and the five open questions of the handoff are answered for drawing only (OQ1–OQ5, still the
operator's).

Files: `canvas/project/frame.css` (Part 1 the signed reader, copied; Part 2 the primitives; Part 3 the reading aids),
`Shell.dc.html`, `Gloss.dc.html`, `MathBlock.dc.html`, and the states boards `GlossStates`, `GlossListStates`,
`MathBlockStates`, `MathInlineStates`, `MarkStates`, `ShellStates`.

## F1 · Words (the glossary of labels)

- Interface copy is English in every chapter (README, *Korean*; the reader's "Sources" stays English in a Korean
  chapter, as built). The term, its aliases, its definitions, the reading and the legend are in the chapter's language.
- The section: **Glossary** (an h2, like "Sources").
- In the window and the sheet: **Close**, **Read more** / **Show less**, **In the glossary →**.
- Under a term: **Also called** + the aliases, comma-joined ("Also called DSR", "Also called 아웃오브샘플, OOS").
- On the entry the reader arrived at: **‹ Back to the text** (the sources list's label and form, as built in
  `web/src/content/chapter.ts` → `sources.back`).
- Over a legend: **where** (Korean chapter **여기서**), lowercase italic, as a mathematician writes it.
- A formula that scrolls sideways is named "Formula, scrolls sideways" (ko "수식, 옆으로 스크롤됩니다").
- The same action keeps its name everywhere: the window's link, the sheet's link and the paper never say "Glossary"
  any other way.

## F2 · The term marker

- **Look:** the text keeps the ink colour; a dotted underline in `kb-secondary`, 0.09em thick, 0.24em below the
  baseline (0.28em in Korean). A link is accent text with a solid line; a highlight is a painted ground: the three never
  read alike, and none is told by colour alone (dots vs a solid line vs a ground).
- **States:** hover → the dots turn `kb-accent`, cursor `help`; open (its window or sheet showing) → a solid 2 px
  `kb-accent` line (`aria-expanded="true"`); focus → the system ring (2 px `kb-accent`, offset 2 px).
- **Inside a member's highlight** (05-annotations' paint, never changed): the dots take `kb-ink`, so they hold on the
  yellow. A tap or click on the term opens the term's window; a tap on the paint outside it opens the annotation
  popover. Opening either closes the other: never two floating things at once.
- **Markup (build):** `<a class="ra-term" id="tm-<id>-<n>" href="#gl-<id>" aria-haspopup="dialog"
  aria-expanded="false" aria-controls="tw-<id>">`. Click, tap, Enter and Space open the window (Space by a key
  handler); without script the link lands on the glossary entry. On canvas boards that hold no glossary the marker is
  drawn without `href` (`role="button" tabindex="0"`); the build always has the glossary in the chapter.
- **A term already opened** (OQ5): unchanged. The marker means "has a definition", which stays true.
- **A term link whose id has no entry** (an author slip): plain text, no marker (the reader's rule for a missing link).
- **On paper:** a 1 px dotted line in the paper's hint grey (`--pp-hint` #6d665a); no control.
- Inline in a sentence, the term is exempt from the 44 px target (WCAG 2.5.8's inline exception); its line box is
  the text's.

## F3 · The window (desktop and iPad: the reader's container 40rem and up)

- **Form:** the annotation popover's box (`an-box`): `kb-surface`, 1 px `kb-border-strong`, `kb-radius`,
  `kb-shadow-raise`; width `min(28rem, the viewport less two gutters)`; `role="dialog"`, labelled by the term.
- **Inside, top to bottom:** the term (Fraunces semibold, the text size) and **Close** on one centre line; "Also
  called …" (13 px, `kb-secondary`); the short definition (Literata, the reader's text size `--rd-fs`, 1.55); the
  foot: **Read more** at the start, **In the glossary →** at the end (a term with no longer definition: the link alone,
  at the end).
- **Placement:** below the term with a `kb-space-xs` gap, its left edge on the term's left edge (the line the term
  starts on when it wraps). If it would cross the column's right edge it shifts left to end on that edge (on a
  narrow column, on the viewport less a gutter). If the space below the term, inside the visible reading area (under
  the top bar), is less than the window's height plus the gap, it opens above the term instead. It never covers the
  term. It is placed hidden and shown once placed (`.ra-float[data-placed]`), so it never jumps.
- **Opening:** hover rests 250 ms on a term (mouse) → opens, focus stays in the text; leaving both the term and the
  window for 200 ms closes it. Click, tap, Enter or Space opens it and moves focus into the window (`tabindex="-1"`).
  Tab walks Read more → In the glossary → Close; Tab past the last closes it and continues in the text. Esc closes
  it and returns focus to the term. A click outside closes it. One window at a time.
- **Motion:** a 0.15 s fade in; none under `prefers-reduced-motion`.

## F4 · The phone form (the reader's container under 40rem) — OQ3

- A **sheet from the bottom**, the reader's sheet anatomy (`rd-sheet`: `kb-surface`, top corners `kb-radius`, a
  `kb-border-strong` top line, `kb-shadow-overlay`), with **no scrim**: the text stays readable above it.
- Head: the term and **Close** (44 px); body: aliases, short, longer; foot: **Read more** / **In the glossary →**
  (44 px), above a hairline. Max height 60 % of the viewport (85 % with the longer one open); the body scrolls inside.
- On open, the page scrolls so the term sits `kb-space-md` above the sheet's top edge; the term shows its open line.
- One tap on a term opens it; **Close**, a tap anywhere outside the sheet, or Esc closes it; focus returns to the
  term. A tap on another term swaps the sheet's content in place.
- Text inside is the reader's text size, never smaller (`--rd-fs`).

## F5 · The longer definition

- Opens **in place**: the window (or sheet) grows; a `kb-border` hairline separates it from the short one. A window
  placed above its term grows upward (anchored at its bottom edge), so the term is never covered.
- The window's body scrolls past `min(32rem, 70vh)` (the annotation popover's cap).
- **Read more** and **Show less** share one box as wide as the longer label (`.ra-swap`), so the toggle never moves
  the foot. `aria-expanded` on the toggle. A term with no longer definition has no toggle at all.

## F6 · The glossary section — OQ1, OQ2

- **Place:** after the chapter's quiz, before its sources (book order: exercises, glossary, references). A chapter
  with no terms has no section.
- **Order:** A to Z in the chapter's language (`Intl.Collator(lang, { sensitivity: "base" })`; Korean is 가나다
  order with Latin terms after).
- **Entry:** term (Fraunces semibold, 1em of the text), "Also called …", the short definition, then the longer one in
  full (Literata, the text size); entries separated by `kb-border` hairlines, the list opened by one. `id="gl-<id>"`.
- **Arrived at** (from a window's link): the entry takes the sources list's `:target` mark (a `kb-surface-sunken`
  ground and a 1 px `kb-border-strong` inset line), is scrolled to under the top bar, receives focus
  (`tabindex="-1"`), and shows **‹ Back to the text** (the `fg-back` link, 44 px), which returns to the very term
  occurrence the reader came from (`#tm-<id>-<n>`) and focuses it. Other entries show no way back.
- Entries bleed `kb-space-md` into the gutter so their text keeps the column's left edge and the target ground has
  room.

## F7 · Formulas

- **Face and size:** STIX Two Math (F8). Inline math at the text's size (`--ra-math-k: 1`: its caps match Literata's
  66.2 vs 65.7 per 100; its x-height is 5 % taller, so it never reads smaller). Display math at 1.5 × the text.
- **Inline:** linear forms only (`÷`, `×`, `√`, powers, subscripts; no stacked fraction in a line); a formula never
  breaks inside (`white-space: nowrap`), the line breaks around it. Single-letter variables italic, words upright
  (`mean`, `sd`, `rate`, `time`), numbers upright. Each `<math>` carries `alttext` in the chapter's language.
- **Display block** (`<figure class="ra-mb">`): a band between two `kb-border` hairlines (the table of contents'
  form; no box, no card). Inside, on the column's left edge: the formula; the **reading**, one plain sentence with no
  symbols in it (Literata, the text size); **where**; the **legend**, a two-column grid: the symbol (math face, text
  size) and its meaning (Literata, the column's small step `--rd-fs-s`), rows sharing the first baseline.
- **Steps:** a formula of several relations is written one relation a row, aligned on the relation sign (left side
  set right, sign centred, right side set left). The canvas sets these as a grid of math cells (Chromium's MathML
  table ignores cell alignment); the engine (R1) must reproduce the look.
- **The legend's symbols are exactly the formula's symbols**, in the order they appear, no more, no fewer.
- **A legend meaning that names a glossary term** marks it like a term in the text, with the same window (OQ4).
- **Too wide:** a row wider than the column scrolls inside the formula's own box (never the page), the side with
  more fades over 2.5rem, and the box becomes a focusable `role="region"` named "Formula, scrolls sideways".
- **Spoken:** the formula's `alttext` (or the steps' `aria-label`) then the figure caption (reading, legend).

## F8 · Faces (as built, plus one)

- Reading: Literata, Hangul in Noto Serif KR (self-hosted in the product, `reader-fonts.css`; the canvas loads both
  from Google Fonts as the signed canvases do). Display: Fraunces. Interface: Source Sans 3. Mono: JetBrains Mono.
- **Math: STIX Two Math** (OFL), new. It is a system face on macOS and iOS; the canvas names it locally (no network
  for it). The build self-hosts it beside Literata, so every device shows it.
- Pretendard is not loaded on the canvas (over the system's font cap, as the README says); Hangul in the interface
  falls back to Apple SD Gothic Neo there.

## F9 · Layout rules

- The reader's one track (as built): the text column `36rem` (44rem from a 1600 px window), gutters 1.05rem /
  1.7rem / 2.4rem; everything in the chapter sits on the column's two edges.
- **One control height: 44 px** (`kb-tap`) for every control in a window, sheet and glossary (Close, Read more,
  In the glossary →, Back to the text). Inline terms are text, not controls.
- Type steps in the column: 18 px text (`--rd-fs`), 15 px small step (`--rd-fs-s`), 27 px display formula, 13 px
  interface small (aliases), 15 px interface (buttons). Headings are the reader's.
- Space: `kb-space-xs / sm / md / lg / xl`, scaled by `--rd-k` inside the column, as built.
- Radii: window `kb-radius` (0.55rem), its buttons `kb-radius-sm` (0.35rem) — concentric. Depth: the window
  `kb-shadow-raise`, the sheet `kb-shadow-overlay`; nothing at rest has a shadow.
- Primitives (frame.css Part 2): `.f-stack`, `.f-cluster` (`--between`, `--end`, `--base`), `.f-sidebar`,
  `.f-center`, `.f-grid`; the gap is `--f-gap`, always a `kb-space` step.

## F10 · Paper (as built, plus the aids)

- The signed paper sheet (09-legacy-and-print, `kb-print.css`): white, the paper palette (`--pp-*`), body 14 px
  (10.5 pt) Literata, the floor 12 px (9 pt), A4 and letter differing only in where the break falls.
- The marker: F2's quiet dotted line. No window, no control, no "Read more".
- A display formula: 21.33 px (16 pt), the reading and the legend 14 px, "where" 12 px; the band kept whole with its
  legend (`break-inside: avoid`), never left-aligned differently from the screen.
- The **glossary appendix**: after the chapter's body and its quiz paper form, before the sources, under an h2
  "Glossary"; every entry whole on its page, longer definitions included, A to Z.

## F11 · Numbers and formats (from the operator's document)

- A share of K: `+0.10 % of K` (a space before %, the sign on gains); Korean `K 대비 +0.10 %`.
- Decimals keep the leading zero: `0.25`, `0.40`. A t-statistic to two places: `2.19`, `1.55`; a bar as written:
  `2.0`, `1.5`. Approximately in a formula: `≈`; in words: "about 2.19" (ko "약 2.19").
- Counts in words in prose ("thirty events"), in figures in formulas and legends (`30`). No dates or money in scope.
- A fact the passages do not give is a visible placeholder in brackets: `[DSR BAR]`, `[TUNING WINDOW]`,
  `[TEST WINDOW]`, `[DRAWDOWN LIMIT]`, `[HAIRCUT]` (ko `[DSR 기준]`, `[조정 구간]`, `[시험 구간]`, `[낙폭 한도]`,
  `[헤어컷]`).

## F12 · The shared fixture

- **The chapter:** "Our bar: performance rule v1" (the book; the Shell's back link), its passages from the brief's
  *Shared data*, verbatim. A Korean chapter is the same chapter in Korean (`lang="ko"`), same ids.
- **The 12 terms** (ids; English term / Korean term; aliases; longer definition yes/no) — the text lives in
  `Gloss.dc.html` (`RA_GLOSS`), the one source; pages mount `Gloss` or copy from it, never rewrite:
  `sharpe` Sharpe ratio / 샤프 비율 (longer) · `dsr` Deflated Sharpe ratio / 디플레이티드 샤프 비율, DSR (longer) ·
  `psr` Probabilistic Sharpe ratio / 확률적 샤프 비율, PSR (longer) · `participation` Participation ratio / 참여 비율,
  "effective number of trials" / 실질 시도 횟수 (longer) · `eigenvalue` Eigenvalue / 고유값 (no longer) ·
  `walkforward` Walk-forward backtest / 워크포워드 백테스트 (longer) · `lookahead` Look-ahead bias / 미래 참조 편향
  (ko alias 룩어헤드 편향; no longer) · `oos` Out-of-sample / 표본 외, OOS (ko also 아웃오브샘플; no longer) ·
  `drawdown` Drawdown / 낙폭 (ko alias 드로다운; longer) · `haircut` Haircut / 헤어컷 (no longer) · `k` K / K, position
  size / 포지션 크기 (no longer) · `tstat` t-statistic / t-통계량, t (longer).
- **The formulas** (ids, in `MathBlock.dc.html`, `RA_FORMULAS`): `tstat` s = mean ÷ sd, t = s × √n · `participation`
  N = (Σᵢ eᵢ)² ÷ Σᵢ eᵢ² · `poisson` λ = rate × time, P(no event) = e^(−λ) · `worked` the four steps t = (mean ÷ sd) ×
  √n = (0.10 ÷ 0.25) × √30 ≈ 0.40 × 5.48 ≈ 2.19 · `chain` the same on one line (for the scrolling case).
- **Inline snippets** (exact markup, `MathInlineStates.dc.html`): `s = mean ÷ sd`, `t = s × √n`, `t ≈ 2.19`,
  `(Σe)² ÷ Σe²`, `λ = rate × time`, `e^(−λ)`.
- **Edge cases, by term:** a long term with its abbreviation → `psr`; an alias → `dsr` ("DSR"); no longer
  definition → `eigenvalue`; a legend term → `eigenvalue`, `participation`, `tstat`, `sharpe`, `k`; a term in a
  highlight → `psr`; Korean → `dsr`.

## F13 · Tone and house style

- English: plain, direct, sentence case, no exclamation marks (README). Korean definitions in 합니다체.
- The back link: "‹" then the book's title (the Shell, as signed); "‹ Back to the text" in the glossary.
- No explainer lines: no subtitle under "Glossary", no hint under the window, no "tap a term" notice.

## F14 · Confirm, notices, empty, loading, error

- None of the aids asks to confirm, sends anything or loads anything: definitions and formulas arrive with the
  chapter. No confirm, no notice, no loading state, no error state. Empty: a chapter with no terms draws no markers
  and no Glossary section; a chapter with no formulas draws none.

## F15 · The page contract

| page | file prefix | props it takes | events it emits |
|---|---|---|---|
| `terms` | `Terms*` | `lang` (en / ko), `theme` (light / dark), `term` (a glossary entry to arrive at, or none), `from` (the page and term occurrence to go back to, or none) | `on-open-print` (no item), `on-back` `{ from }` when the arrived entry's way back leads off this page |
| `formulas` | `Formulas*` | `lang`, `theme` | `on-open-terms` `{ term }` (a window's "In the glossary →" on this page: the glossary lives on `terms`), `on-open-print` |
| `print` | `Print*` | `lang`, `paper` (a4 / letter) | none (paper) |

- Shared across pages: `lang` and `theme` (the join's entry holds them). The Shell takes `lang`, `theme`, `pct` and
  emits `on-lang`, `on-back`, `on-logo`, `on-display`; its back link and logo go outside this job and stay inert
  (`#top`), as the handoff says.
- A link that carries nothing between pages is `href="#to:<slug>"`; the join wires it.
- Every Page's root carries `id="top"`; the Shell, mounted `bare`, adds none.

## F16 · Mounting the frame's parts

- `Shell`: `<dc-import name="Shell" bare="{{ true }}" lang="…" on-lang="…">` inside the page's `.rd-frame`.
- `Gloss`: `form` `window` | `sheet` | `list` | `paper`; `term-id`; `lang`; `long` (with `on-toggle` the page holds it);
  `target`, `back`, `back-href`, `anchors` (list); `gloss-href` (window and sheet; default `#gl-<id>`); `on-close`,
  `on-glossary`, `on-back`; `bare`. The page positions a window inside `.ra-float` (F3) or a sheet fixed to the bottom.
- `MathBlock`: `formula` (tstat | participation | poisson | worked | chain), `lang`, `paper`, `glossary` (true when the
  board holds the glossary: legend terms then link `#gl-<id>`), `open` (the legend term whose window is open),
  `on-term` `(id, element)`, `bare`; mount it inside `.rd-flow.rd-prose` (screen) or `.ra-paper` (paper).

## Settled at the join (F17–F33)

Each entry settles the pages' `frame_gaps:` (and the frame-owned critique gaps) once, with the ids it answers. Where an
entry replaces a line above, the line above is read as replaced. "Applied" names the page files the join edited; the
frame files (frame.css, Gloss, MathBlock, MathInlineStates) were brought in line by the frame's follow-up pass
(join-R1, closed), and the build follows the entry.

## F17 · The glossary's opening line (terms-FG1)

- In the chapter the h2 "Glossary" carries the reader's h2 rule; the list draws no opening hairline of its own. F6's
  "the list opened by one" holds only for the list shown without its h2 (its Components board). Applied: Terms.

## F18 · Tab order in the window and the sheet (terms-FG2, formulas-T1)

- Reading order: **Close**, **Read more**, **In the glossary →** (the head, then the foot). Tab past the last control
  closes it and carries on in the text; Shift+Tab out of the first closes it and returns focus to the term. Replaces
  F3's "Tab walks Read more → In the glossary → Close". Applied: Terms, Formulas, Gloss as built.

## F19 · Hover against a clicked window (terms-FG4)

- A hover opens a window only when none is open or the open one was hover-opened; it never replaces a window opened by
  click, tap or key. Applied: Terms, Formulas (both drew it).

## F20 · No print control (terms-FG5, formulas-FG1)

- The reader prints by the browser (⌘P, signed 09); no page draws a print control, and F15's `on-open-print` is
  withdrawn from `terms` and `formulas`. On the canvas the entry board's foot strip reaches the print page.

## F21 · A phone width on a desktop canvas (terms-FG3, formulas-FG2, formulas-FG3)

- Canvas-only: a viewport box (390 × 844, 320 × 568) with a hairline edge and no device chrome; the sheet docks at the
  box's bottom (a zero-height sticky dock, since `.rd-frame`'s size containment turns `fixed` into `absolute`) and F4's
  60 % / 85 % are of the box. The build keeps F4: the sheet fixed to the viewport.

## F22 · No break at a hyphen (terms-FG6)

- A hyphenated term or name (`t-statistic`, `t-통계량`, `CONDITIONAL-GO`, with a particle after it in Korean) never
  breaks at its hyphen: `white-space: nowrap` on the word; the line breaks before it. Applied: Terms (`.tm-nobr`),
  Formulas (`.fm-keep`), Print (`.pr-nobr`); the frame's `.ra-keep` (Gloss, MathBlock, MathInlineStates).

## F23 · A share is one value (terms-FG7)

- The spaces inside a share are no-break: `+0.10 % of K`, `0.25 %`, `in % of K`; in Korean `K 대비 +0.10 %,` and a
  figure with its particle (`sd 0.25 %이면`) are one unbreakable run (Hangul after `%` is a break chance a no-break
  space does not close). Applied: Terms, Formulas, Print; Gloss, MathBlock, MathInlineStates (`.ra-keep`).

## F24 · The square of a sum, inline (terms-FG8, terms-C03, formulas-C10)

- `(Σe)²` puts the square on the closing paren, the paren hugging the Σ:
  `<mrow><mo stretchy="false">(</mo><mo lspace="0">∑</mo><mi>e</mi><msup><mo stretchy="false">)</mo><mn>2</mn></msup></mrow>`.
  Replaces F12's snippet. Korean `alttext`: "e의 합의 제곱 나누기 e 제곱의 합". Applied: Terms, Formulas, Print.
  MathInlineStates (frame follow-up).

## F25 · Glossary dividers on the column (terms-FG9, terms-C05)

- The hairline between entries runs the column's width (the h2 rule's two edges); only the arrived entry's sunken
  ground and inset line bleed `kb-space-md` into the gutter. Replaces F6's bleeding dividers. Applied: Terms; frame.css
  `.ra-gl__item::after` (Gloss's own boards).

## F26 · Paper measures (print-FG1)

- On paper the display formula band takes the prose's measure (38em, 532 px); the glossary appendix takes the
  colophon's (552 px, 46em of 12 px), so its hairlines end where the colophon's rule does. Applied: Print.

## F27 · One symbol column per chapter (print-FG5, formulas-C07)

- Every "where" legend of a chapter sets its symbol column to one width, the widest legend symbol of the chapter plus
  room (this chapter: 5.25 × the symbol size; P(no event) is about 4.9), so every legend's meanings start on one edge.
  Screen `calc(var(--rd-fs) * 5.25)`, paper 5.25em of 14 px. Replaces F7's `max-content` column. Applied: Formulas,
  Print; frame.css `.ra-legend` (MathBlock's own boards).

## F28 · The paper masthead (print-FG2)

- As signed for a loose document (09): "knowledge · [PROJECT]" over "[ADDRESS] · v[N], [DATE] · Printed [DATE]", the
  chapter's title "Our bar: performance rule v1" (ko "우리의 기준: 성과 규칙 v1") as the h1. Applied: Print.

## F29 · The excerpt's section headings (print-FG3)

- One set on every page: **Scoring a run** / 실행 채점하기 · **Counting the trials** / 시도 횟수 세기 · **When nothing
  happens** / 아무 일도 없을 때. Applied: Terms (the first two, which it shows), Formulas (the Korean third), Print.

## F30 · The chapter's quiz item (print-FG4)

- "Check the bar" / "기준 확인", one question: which bar fifteen events' t clears (key B, CONDITIONAL-GO's 1.5). Terms
  shows it at rest in its web form, Print in its paper form.

## F31 · A formula inside a definition (print-G1)

- A formula in a short or longer definition is inline math (F7), on screen and on paper, never typed as upright text.
  The data shape's `short` and `long` are runs (text | math). Applied: Gloss (`sharpe`, en and ko).

## F32 · Read more and Show less in one box (frame-A1, terms-C04, formulas-A1)

- Both labels start on the swap box's start edge (`.ra-swap > * { text-align: start }`; a button centres its text by
  default), so "Show less" starts where "Read more" did. Applied: Terms, Formulas (a page rule); frame.css `.ra-swap`
  (Gloss's own boards).

## F33 · The way back across a chapter (join wiring)

- F6's "‹ Back to the text" returns to the very occurrence the reader left, a legend term in a display block included:
  the build numbers occurrences across text and legends (`tm-<id>-<n>`). F15 amended: `formulas` takes `from` (the
  occurrence to return to, `formulas:<block>:<term>`); its `on-open-terms` carries `{ term, from, lang, theme }`, and
  `terms`' `on-back` carries `{ from, lang, theme }`.

## F34 · A placeholder share may break inside its brackets (join, critique C05)

- F23 amended for a share whose value is a `[PLACEHOLDER]`: the run kept whole is the placeholder's last word with its
  unit (`[DRAWDOWN LIMIT] of K` keeps `LIMIT] of K`; ko `K의 [낙폭 한도]입니다.` keeps `K의 [낙폭` and `한도]입니다.`), so
  the line can break inside the brackets at 200 % text on a phone and never before the unit. A real figure stays one
  run as F23 says. Applied: Gloss (`drawdown`'s longer definition, en and ko), which every page mounts.

## F35 · The chapter's language and theme carry across its parts (join, critique C02)

- The language and the theme are settings of the chapter, not of one part: whichever way the reader changes them (the
  top bar's language switch; on the canvas, a page's preset), the next part opens in them. F15 amended: each page
  emits `on-state { lang, theme }` (Print: `{ lang }`; paper has no theme) whenever they change. In the product the
  parts are one chapter page, so the build keeps one `lang` and one `theme` per chapter view.

## F36 · A legend meaning never runs past the screen (join, critique C06)

- `.ra-legend dd { overflow-wrap: break-word; }`: at 390 px with 200 % text the meaning column is a few words wide, and
  a word longer than it ("independent") breaks inside rather than running past the screen. At normal sizes no word
  breaks, so nothing changes. Applied: Formulas (beside F27's column rule); the build puts it on `.ra-legend dd`.
