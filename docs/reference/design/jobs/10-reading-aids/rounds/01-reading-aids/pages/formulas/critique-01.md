# Critique 01: 10-reading-aids/01-reading-aids

- pass: 01
- mode: critic
- scope: page formulas
- verdict: revise
- confidence: high
- must_fix: 2 (part 1: 1, part 2a: 1)
- gaps: 8
- advisory: 1
- escalate: none
- preview: 126.6s, 34 states
- standard: .claude/agents/design-drafter.md
- open_items: C01, C02, C03, C04, C05, C06, C07, C08, C09, C10

## Findings

### C01 · must-fix · part 1 · open
- board: Formulas.dc.html · view: frame · state: 26
- finding: on a phone, pressing Read more in the sheet grows the sheet upward over the legend term that opened it, so the reader loses sight of the term they asked about and its open line, just as the longer text appears.
- evidence: `.preview/10-reading-aids/01-reading-aids/pages/formulas/Formulas.frame.state-26.png` ("Phone 390 · term open > Read more"): the sheet's top edge sits over the "s · the per-event Sharpe ratio" row. Measured with the harness: term top/bottom 563/586 px, sheet top 602 px when it opens (`Formulas.frame.state-06.png`), then 387 px after Read more while the term stays at 563/586 (`<scratch>/harness.py` output). Handoff: a legend term "behaves like a term in the text", and the terms page's check is "the window never covers the term". Frame F4 puts the term `kb-space-md` above the sheet when it opens, and F5 says the longer definition opens "so the term is never covered".
- confidence: medium · found_by: critic

### C02 · must-fix · part 2a · open
- board: Formulas.dc.html · view: frame · state: 05
- finding: at phone width, the page's own prose breaks a figure away from its unit: an English line ends on "+0.10" and the next starts "% of K", and a Korean line starts with the bare particle "인" after "0.25 %". The reader meets a line that opens on a symbol or a particle, and the F11 figure "+0.10 % of K" no longer reads as one value.
- evidence: `.preview/10-reading-aids/01-reading-aids/pages/formulas/Formulas.frame.state-05.png` ("Phone 390") and `Formulas.frame.state-06.png`: "Thirty events averaging +0.10 / % of K with an sd of 0.25 % …". `Formulas.frame.state-23.png` ("Phone 390 > 한국어"): "… sd 0.25 % / 인 이벤트 서른 개면". In the markup, the figure and its unit are joined only by plain spaces (no non-breaking or narrow space anywhere in `Formulas.dc.html`). Standard: Toss-level care, "Long names, two-line labels and larger text still hold". Also Polish, "no widows in short copy". The format is frame F11.
- confidence: high · found_by: critic

### C03 · gap · part 1 · open
- board: Formulas.dc.html · view: frame · state: 00 and 04
- finding: the signed Shell's language switch has no visible boundary for its pressed segment (1.24:1 light, 1.47:1 dark), so the current language is hard to see as a control. This is a blocking WCAG check failing inside a signed part, which the drafter logged and did not restyle.
- evidence: `issue … check=non-text-contrast: button.rd-lang__o… "English" … 1.24:1 against #fffefa` and `state=04 … 1.47:1 against #232019`. Logged under `component_gaps` in the page's result.md.
- confidence: high · found_by: measured

### C04 · gap · part 1 · open
- board: Formulas.dc.html · view: text200 · state: 00
- finding: at 390 px with 200 % text, the signed top bar is 422 px wide and its back chevron overprints "English", so the page scrolls sideways and the two labels collide. This is a signed part, logged.
- evidence: `issue … view=text200 check=reflow: content is 422px wide at 390px` and `check=overprint: span.rd-back__chev "‹" and span.sc-interp "English" overprint … 8x21px`. Logged under `component_gaps`. `Formulas.text200.png` also hits `too-tall` (11174 px; the shot stops at 8000).
- confidence: high · found_by: measured

### C05 · gap · part 2a · open
- board: Formulas.dc.html · view: frame · state: 26
- finding: inside the frame's `Gloss` sheet with the longer definition open, the longer text's box and the foot sit 2.9 px apart. Two edges that nearly meet read as a miss.
- evidence: `issue … state=26 check=align: near-edge 2.9px (div "The average return …" vs div "Show less In the gl…")`, crop `.preview/10-reading-aids/01-reading-aids/pages/formulas/Formulas.state-26.align-01.png`. Logged as formulas-A1 (= frame-A1). The page may not edit `Gloss`.
- confidence: high · found_by: measured

### C06 · gap · part 1 · open
- board: Formulas.dc.html · view: frame · state: 01
- finding: inside the frame's `Gloss` window, Tab walks Close → Read more → In the glossary, against F3's Read more → In the glossary → Close. A keyboard reader meets Close first, before what the window offers.
- evidence: harness on Rest: Enter on "Sharpe ratio" moves focus into `DIV.ra-win`, then Tab ×4 gives `BUTTON.ra-close Close`, `BUTTON.ra-more Read more`, `A.ra-go In the glossary →`, `A.ra-term K` (the window closes and focus goes on into the text, as F3 asks). Logged as formulas-T1. `Gloss` is the frame's part.
- confidence: high · found_by: critic

### C07 · gap · part 2a · open
- board: Formulas.dc.html · view: frame · state: 00
- finding: the frame's `MathBlock` legend sizes its symbol column to each block's widest symbol, so the meanings in the page's four legends start on three different edges down one column. The legends read ragged against each other rather than as one repeated form.
- evidence: `.preview/10-reading-aids/01-reading-aids/pages/formulas/Formulas.frame.png`: the meaning column starts about 59 px past the column edge in the `tstat` and `worked` legends, about 43 px in `participation` and about 105 px in `poisson` (read off the PNG at 1:1; my crops are `<scratch>/rest1.png`, `<scratch>/rest2.png` and `<scratch>/rest3.png`). Standard: Layout and spacing, "Edges align: content shares a small number of left edges". The legend layout is frame F7's; the page only mounts it.
- confidence: medium · found_by: critic

### C08 · gap · part 2a · open
- board: Formulas.dc.html · view: frame · state: 00
- finding: in the frame's stepped formulas, rows sit with no gap between them, so the two "≈" rows of the worked example almost touch and the `tstat` block's two relations crowd each other. The steps read as one packed glyph mass, not as a sequence of rows.
- evidence: `<scratch>/workedx2.png` (2× crop of `Formulas.frame.png`): "≈ 0.40 × 5.48" and "≈ 2.19" stack with their relation signs nearly touching, and row 1's closing parenthesis nearly meets row 2's opening one. The same shows in `Formulas.frame.state-07.png` (Phone 320). Standard: Layout and spacing, "Rhythm: tighter inside a group than between groups". The `worked`/`tstat` steps are the frame's `MathBlock`.
- confidence: medium · found_by: critic

### C09 · gap · part 2a · open
- board: Formulas.dc.html · view: frame · state: 02
- finding: the section heading (26.1 px, the signed reader's h2) and the display formula (27 px, frame F9) are a near-miss pair of sizes on the same page, so neither reads as a step from the other.
- evidence: computed sizes in the harness (`<scratch>/sizes.py`): h2 26.1 px ×3, display math 27 px ×49. Preview `state=02 check=size-count: 7 font sizes … 26px, 27px`. The drafter's logged reason names only the 12.5 and 19 px script sizes. Standard: Polish, "No near-misses: two values that are almost the same … are one value". Neither size is the page's to change.
- confidence: medium · found_by: measured

### C10 · gap · part 2a · open
- board: Formulas.dc.html · view: frame · state: 00
- finding: the inline participation snippet `(Σe)² ÷ Σe²` sets its parentheses apart from their contents and hangs the outer exponent well above the inner one, so in the sentence it reads looser and taller than the type around it.
- evidence: `<scratch>/inline2x2.png` (2× crop of `Formulas.frame.png`, "Counting the trials" paragraph): "( ∑e )" with visible space inside both parentheses, and the outer "2" raised near the line above while "e²" sits low. The page's markup is identical to the frame's `MathInlineStates.dc.html` snippet (F12: "exact markup"), so the fix is the frame's.
- confidence: medium · found_by: critic

### C11 · advisory · part 2b · open
- board: Formulas.dc.html · view: frame · state: 00
- finding: the lead-in "With the thirty events above:" sits between the closing rule of one formula band and the opening rule of the next, so a one-line sentence gets boxed by two hairlines. That makes the worked example's lead-in look like a band of its own, at the cost of separating it from the formula it introduces.
- evidence: `.preview/10-reading-aids/01-reading-aids/pages/formulas/Formulas.frame.png`, between the `tstat` and `worked` blocks (`<scratch>/rest1.png`).
- confidence: medium · found_by: critic

## For the judge

none

## Scorecard

| board | Part 1 | Part 2a |
|---|---|---|
| Formulas.dc.html | C01 | C02 |

**Component gaps** (frame or signed parts; not the page drafter's to fix):
- C03: the signed Shell language switch, non-text-contrast, light and dark (logged).
- C04: the signed Shell top bar, reflow and overprint at 200 % text (logged).
- C05: the frame `Gloss` near-edge of 2.9 px with Show less open (logged A1).
- C06: the frame `Gloss` Tab order against F3 (logged T1).
- C07: the frame `MathBlock` legend columns start on three edges.
- C08: the frame `MathBlock` step rows have no gap.
- C09: the frame F9 display size of 27 px against the signed h2 at 26.1 px.
- C10: the frame inline snippet `(Σe)² ÷ Σe²`.

**2b notes for the operator:**
- C11: the worked example's one-line lead-in sits boxed between two formula rules, which sets it apart as its own band rather than joining it to the formula below.

**The bar:**
1. Every list item opens its own item: holds. The legend terms open their own windows: t-statistic, Sharpe ratio, K, participation ratio and eigenvalue each show their own definition.
2. A choice carries: holds within the page. "In the glossary →" emits `on-open-terms {term}`; the link between pages is the cross scope's.
3. Search and filters: no list here (n/a).
4. State bar: holds. It is on the Page, lists only this page's nine presets and uses the verbatim chrome. The "Dark" preset lands (verified by harness; the click-through deduped it).
5. Links stay in the prototype: holds. `#to:terms` ×2 are the expected page-scope placeholders, and `design-check --page formulas` is OK.
6. Controls keep their size: holds. Read more and Show less share one box, and the `layout-shift` lines are scrolls or the canvas viewport box, logged with reasons that hold.
7. Same list header: no list (n/a).
8. Hover restrained: holds by measurement (no `hover-contrast` line). The hovered term shows accent dots and opens the window.
9. Chevron, logo, centred column, aligned figures: holds. The column is centred and the worked steps align on the relation sign.
10. One direction, no SVG artwork: holds.
11. Toss-level lines: C02 ("Long names, two-line labels and larger text still hold").

**Holds:**
- The inline formulas sit on the line without disturbing the 1.65 pitch, and are not smaller than the text.
- The display blocks have a reading and a legend; each legend's symbol set matches its formula, and the fraction, sums and superscripts are typeset.
- The worked example in steps fits at 320 px with no sideways scroll.
- Legend terms behave like terms in the text: hover intent opens and leaving closes; click, Enter and Space open with focus moved into the window; Esc returns focus to the term; a second click closes. Near the viewport bottom the window flips above the term (window bottom 814 px, term top 820 px).
- The focus ring shows on terms and on the window. The phone sheet opens with the term above it.
- Dark contrast passes, and the Korean chapter renders.
- Logged measured lines with reasons that hold: `target` ×8 and `label-ink` ×2 on inline terms (inline exception), `first-line` on fraction rows (the math axis, seen on `Formulas.align-01.png`), `tight-leading` (the math box, not the paragraph pitch).

**Not seen:**
- `preview.json` was 30 s older than `Formulas.dc.html`, so I re-rendered with `--page formulas --click --contact-sheet`. A first run without `--click` briefly replaced the drafter's shots; the `--click` run restored all 34 states. All cited PNGs are from that run.
- The hovered look of Close, Read more and In the glossary was not screenshotted (only measured).
- The Hangul h2 ("실행 채점하기") looks like a sans face on the PNGs, while the body Hangul renders in Noto Serif KR after a wait. I could not tell a font-loading artifact of the headless render from a real fallback. It is the signed reader's heading.
- The handoff's "formula scrolls sideways" focus state is not on this Page (the drafter moved it to the frame's `MathBlockStates` board, Plan review). Its focus ring and region name were not checked here.
- Screen-reader output (`alttext`, figure captions) was read from the markup only, never heard.
