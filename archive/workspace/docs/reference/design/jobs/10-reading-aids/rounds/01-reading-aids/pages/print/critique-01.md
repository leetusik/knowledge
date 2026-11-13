# Critique 01: 10-reading-aids/01-reading-aids

- pass: 01
- mode: critic
- scope: page print
- verdict: revise
- confidence: medium
- must_fix: 4 (part 1: 1, part 2a: 3)
- gaps: 1
- advisory: 2
- escalate: C04
- preview: 11.6s, 4 states (re-rendered once: the drafter's preview.json was older than Print.dc.html)
- standard: .claude/agents/design-drafter.md
- open_items: C01, C02, C03, C04, C05

## Findings

### C01 · must-fix · part 1 · open
- board: Print.dc.html · view: text200 · state: 00
- finding: at 200 % text the page runs 18849 px and the render stops at 8000 px, so the 200 % text view is seen only through about sheet 3 of 15; the rest of the page at that size (the glossary appendix, the colophon) goes unchecked.
- evidence: `issue board=Print.dc.html view=text200 check=too-tall: the page is 18849px tall: the screenshot stops at 8000px` (`.preview/10-reading-aids/01-reading-aids/pages/print/Print.text200.png`). The page result logs it as intended ("the sheets multiply at 200 % text"), but `too-tall` is one of the render's own checks, which the critic file makes Part 1 rather than an advisory line that a logged reason can close.
- confidence: high · found_by: measured

### C02 · must-fix · part 2a · open
- board: Print.dc.html · view: frame · state: 00 (and 01–03)
- finding: the three "where" legends start their meanings at three different x positions (45, 33 and 81 px from the formula's left edge), so sheet 2 holds two meaning columns 47 px apart (the participation legend and the Poisson legend). The definitions on the sheet share no edge, and the page's logged reason for `ragged-edges` ("the visible text keeps one 57 px margin and the legend's second column") describes one column where the render shows three.
- evidence: measured in the live page: legend cell x for the `tstat`, `participation` and `poisson` blocks = [380, 425], [1180, 1213], [1180, 1261]. Seen on `<scratch>/en-a4-p1.png` (meanings at x≈107) and `<scratch>/en-a4-p2.png` (meanings at x≈95 and x≈142). The preview line is `check=ragged-edges: 190 headings and paragraphs start at 25 left edges; the three most used hold 47%`. Standard: "Edges align: content shares a small number of left edges", and an advisory line logged as intended "is judged on its reason". The legend is drawn inside the frame's `MathBlock` paper form, which this page does not own, and the page result does not log it as a frame gap.
- confidence: medium · found_by: measured

### C03 · must-fix · part 2a · open
- board: Print.dc.html · view: frame · state: 00 (and 01–03)
- finding: every sheet caption repeats "…, at print size" (five times per state). The same note sits on every row and tells the reader nothing new after the first sheet.
- evidence: captions read "Page 1 of 5 · A4, at print size" … "Page 5 of 5 · A4, at print size" (and the same with "US Letter"), `<scratch>/en-a4-p1.png`–`p5.png`. Standard *Copy*: "Strip explainer copy … a note repeated on every row". The captions are `.pr-slot__cap` and sit outside `[data-proto]`, so the state-bar exemption does not cover them.
- confidence: medium · found_by: critic

### C04 · must-fix · part 2a · escalated
- board: Print.dc.html · view: frame · state: 00
- finding: on the last sheet, the glossary's closing hairline ends 20 px short of the colophon's rule (532 px against 552 px from the margin). The two rules are almost the same length without being equal, so their right ends read as a miss rather than a choice.
- evidence: live page border extents for the glossary entries and `.pp-colo` = 3274→3806 and 3274→3826. Seen on `<scratch>/en-a4-p5.png` (glossary rules end x≈593, colophon rule x≈613). The colophon's 46em is signed (09 `paper.css` line 168). The glossary's 38em is this page's print-FG1. Standard *Polish*: "No near-misses: two values that are almost the same … are one value"; *Layout*: "Every element aligns with something on purpose".
- confidence: low · found_by: critic

### C05 · gap · part 1 · open
- board: Print.dc.html · view: frame · state: 00
- finding: the Sharpe ratio glossary entry types its formula as plain upright text ("The scorer writes it as s = mean ÷ sd."), while the prose on sheet 1 sets the same formula as math (italic *s*, STIX Two Math). On paper the one formula appears in two looks. The text comes from the frame's `Gloss` data (`RA_GLOSS`), which this page mounts as it is.
- evidence: `<scratch>/en-a4-p4.png` (the Sharpe ratio entry, last paragraph) against `<scratch>/en-a4-p1.png` (first paragraph). `Gloss.dc.html` line 91 holds the string as plain text. Frame F7 says each formula in a sentence is inline math. The page result logs `component_gaps: none new`.
- confidence: medium · found_by: critic

### C06 · advisory · part 2b · open
- board: Print.dc.html · view: frame, phone · state: -
- finding: the sheets are shown at print size, one per row, instead of the signed Paper board's two-up layout at 85 %. Every sheet is true to size, but the page becomes a 6000 px scroll, and at 390 and 320 px only the left third of each sheet shows inside its sideways box, with letters cut mid-word at the box's edge.
- evidence: `.preview/10-reading-aids/01-reading-aids/pages/print/Print.sheet.png` (frame, phone, w320 tiles); `<scratch>/phone320-top.png`; the page result's Summary ("Departures: sheets at print size, one a row") and print-O2.
- confidence: medium · found_by: critic

### C07 · advisory · part 2b · open
- board: Print.dc.html · view: frame · state: 00
- finding: the rule that keeps a lead-in paragraph with its display formula leaves about the bottom 30 % of English A4 sheet 1 empty: the paragraph before the participation formula moves to sheet 2 with the formula. Keeping a formula with its lead-in costs a visibly short first page.
- evidence: `<scratch>/en-a4-p1.png` (text ends y≈760 of a text block that runs to y≈1079); the signed lead-in rule `p:has(+ .ra-mb) { break-after: avoid }` quoted in the page's Build.
- confidence: medium · found_by: critic

## For the judge

- C04: low confidence. Under `critic` alone this goes to the operator marked unsure: whether a 20 px difference between two rule lengths on one sheet is a near-miss or an acceptable difference between a signed block and a new one.

## Scorecard

| board | Part 1 | Part 2a |
|---|---|---|
| Print.dc.html | C01 | C02, C03, C04 |

**Component gaps:** C05, the frame's `Gloss` data types the Sharpe formula as plain text on the glossary's paper form (frame-owned; for the join and R1).

**2b notes for the operator:**
- C06: The print page shows each sheet at true size, one per row, instead of the signed two-up view at 85 %. That makes every sheet faithful, but the page is a long scroll, and on a phone only a third of each sheet is visible at a time.
- C07: The rule that keeps a formula with its lead-in paragraph leaves the first A4 page about a third empty in English. It keeps the reading together at the cost of a short first page.

**The bar:**
1. Every list item opens its own item: holds (no lists or controls on paper).
2. A choice carries: holds (nothing carried; the page takes `lang` and `paper`).
3. Search and filters: holds (none on this page).
4. State bar: holds. It is the first element of the root, `position: static` up its ancestor chain, and scrolls away (top −3000 after a 3000 px scroll), as the operator's bar line 1 asks. It lists only Print's four presets. Each lands with its `aria-pressed` matching (pressing "한국어 · US Letter" gives `lang=ko` and Letter captions). The CSS is verbatim.
5. No link leaves the prototype: holds (`design-check --page print` OK; no `leaves-canvas`).
6. Controls hold still: holds (no `layout-shift`; only the sheets change width between A4 and Letter, as they should).
7. Same list header: holds (no list).
8. Hover: holds (no product controls on paper).
9. Back, logo, centred column: holds. The desk centres its column of sheets; paper has no back link or logo.
10. One direction, no decorative SVG: holds.
11. Toss-level lines: hold (one message, plain prose on paper, long text holds at 200 %).

**Holds:**
- The handoff's three print checks hold on all four presets:
  - the marker on paper is a quiet hint-grey dotted line, with no window or control;
  - all three display formulas stay whole with their reading and legend on A4 and Letter in both languages (`break-inside: avoid`);
  - the glossary appendix is a reference list with all 12 entries, A to Z (가나다 in Korean), longer definitions in full, and no entry split across sheets.
- The data is right: t = 0.4 × √30 ≈ 2.19 and 0.4 × √15 ≈ 1.55; the quiz key B (CONDITIONAL-GO's 1.5) is correct.
- The brief's passages are verbatim, including the bold PSR sentence. The placeholders ([PROJECT], [ADDRESS], v[N], [DATE], [SOURCE TITLE], [DSR BAR], [HAIRCUT], …) are visible, and nothing is secret.
- The signed paper is kept: masthead, quiz paper form, Sources, Answers, colophon, `--pp-*` palette, 57 px margins. The Korean chrome stays English, as F1 and signed D36 say.
- Phone: the page itself never scrolls sideways (document width 390 / 320). The sheets scroll in a focusable region named "Sheets, scroll sideways".
- The measured lines logged as intended hold on their reasons:
  - `label-ink` is on inline `.ra-term` text, which is exempt under F2;
  - `first-line` is the frame's step grid;
  - `tight-leading`: the paragraph's computed line-height is 21.7 px (1.55), the visible line pitch is about 22 px, and the inline radical adds about 2 px to the box;
  - `size-count`: the 15 px size is display-math scripts (14.93 px) and the 13 px size is the caption;
  - `tiny-text`: math scripts at 9.8 px;
  - `token-drift`: the signed paper's px values.
- `self_check=pass`, with no blocking WCAG lines, no contrast, target or clipping issues, and no dead links.

**Not seen:**
- The drafter's `preview.json` was older than `Print.dc.html` (by 36 s), so the page was re-rendered once with `--click --contact-sheet`. The findings cite that render.
- The 200 % text view past 8000 px (C01).
- Real paper output (`@media print` through the browser's print engine): the canvas simulates sheets with multi-column windows. Whether the product's print engine breaks in the same places is R1's to verify.
- STIX Two Math is named locally and was present in this headless Chrome on macOS. A machine without it was not tried.
- Outside this page's scope, passed to the cross critique and the join:
  - the handoff's print check reads "legible at print size (body ≥ 12 pt)", while the frame's F10 sets the reading and legend at the signed paper body of 14 px (10.5 pt); the page follows F10;
  - the display formulas space "=" differently (the participation formula's single-row "N =" is tighter than the step grids of `tstat` and `poisson`), inside the frame's `MathBlock`;
  - inline math figures ("t ≈ 2.19") read lighter and smaller than Literata's beside them, already logged as print-O1.
