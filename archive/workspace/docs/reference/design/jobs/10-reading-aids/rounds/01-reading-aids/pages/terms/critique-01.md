# Critique 01: 10-reading-aids/01-reading-aids

- pass: 01
- mode: critic
- scope: page terms
- verdict: revise
- confidence: high
- must_fix: 5 (part 1: 3, part 2a: 2)
- gaps: 4
- advisory: 2
- escalate: C02
- preview: 127.2s, 47 states (the drafter's render, read as is; dark presets and interaction states driven by the critic's own harness)
- standard: .claude/agents/design-drafter.md
- open_items: C01, C02, C03, C05, C06, C04, C07, C08, C09

## Findings

### C01 · must-fix · part 1 · open
- board: Terms.dc.html · view: frame · state: 10
- finding: In the Korean chapter the marked term "t-통계량" breaks after its hyphen, so the first line ends on a lone "t-" and the term continues as "통계량으로" on the next line; the reader meets half a term with a dangling marker, which is the awkward break the handoff's Korean check rules out.
- evidence: `.preview/10-reading-aids/01-reading-aids/pages/terms/Terms.frame.state-10.png`, first paragraph under "스코어러가 판단하는 방법": line 1 ends "그 답을 t-", line 2 starts "통계량으로 냅니다."; handoff *Pages → terms → Korean chapter*: "Check: Pretendard, `keep-all`, no awkward breaks".
- confidence: high · found_by: critic

### C02 · must-fix · part 1 · escalated
- board: Terms.dc.html · view: frame · state: 00, 09, 13–15 (Dark presets)
- finding: The chapter's quiz, its sources and the annotation popover are grey dashed strips naming them instead of the signed blocks, so the operator cannot judge the glossary's place between the real quiz and sources (OQ2 is theirs to settle) or how the term window and the real popover read in a highlight; in the three dark presets the strips become bright light-grey boxes beside the dark glossary, so "Dark: glossary" cannot be judged in context either.
- evidence: `.preview/10-reading-aids/01-reading-aids/pages/terms/Terms.frame.png` (the strips "The chapter's quiz, as signed in 04-quiz." and "The chapter's sources, as signed in 02-figures."); `Terms.frame.state-09.png` ("Annotation popover (05-annotations, unchanged)" with a 24 px canvas button); critic dark shot `<scratch>/dark-pair.png`. Handoff *Scope boundary → Not this slice*: the other blocks are "shown only as they are, around the new aids", and the popover "is drawn here only where a term meets a highlight, and is never changed". The drafter logged the strips as a departure ("Redrawing the quiz and the sources around the glossary would restyle signed blocks"). That reason does not hold: showing a signed block as it is means copying it, the way `frame.css` Part 1 already copies the signed reader and F3 reuses the popover's `an-box`, not restyling it. Standoff.
- confidence: medium · found_by: critic

### C03 · must-fix · part 1 · open
- board: Terms.dc.html · view: frame · state: 00
- finding: The inline participation formula in the second section is typeset loosely: the parentheses stand apart from "∑ e", and the square on the closing parenthesis rides much higher than the square on "e²". The two squares of one formula therefore read as different marks. This is a miss in the frame's inline snippet that shows on this page, and it is not logged among the page's `component_gaps:`, so the build would not learn of it.
- evidence: `.preview/10-reading-aids/01-reading-aids/pages/terms/Terms.frame.png` around x 500–760, y 925–955 ("matrix, ( ∑ e )² ÷ ∑ e² over its eigenvalues"); critic zoom `<scratch>/math.png`; the markup is F12's exact inline snippet (`<msup><mrow><mo>(</mo><mo>∑</mo><mi>e</mi><mo>)</mo></mrow><mn>2</mn></msup>`); result.md `component_gaps:` names only the Shell and frame-A1.
- confidence: medium · found_by: critic

### C04 · gap · part 2a · open
- board: Terms.dc.html · view: frame · state: 03 (and 37)
- finding: When the longer definition is open, "Show less" starts 2.9 px to the right of the window's text edge, where "Read more" sat flush. The shared swap box centres the shorter label, so the foot's first action stops lining up with the text above it. This happens in the desktop window as well as in the phone sheet that frame-A1 names.
- evidence: harness, DSR window at 1440: the definition paragraphs' ink starts at x 577.0, "Read more" at 577.0, "Show less" at 579.9 (`.ra-more` is `text-align: center`, the `.ra-swap` box sized to "Read more"); measured line `state=37 check=align near-edge 2.9px (div "A probability: how …" vs div "Show less In the gl…")`, crop `.preview/10-reading-aids/01-reading-aids/pages/terms/Terms.state-37.align-01.png`; Gloss and `.ra-swap` are frame files the page may not edit. Logged by the page only for the sheet ("frame-A1 again"); the window case should join that entry.
- confidence: high · found_by: measured

### C05 · must-fix · part 2a · open
- board: Terms.dc.html · view: frame · state: 00 (and 11, 15)
- finding: The glossary's rules have two lengths. The h2 rule that now opens the list (terms-FG1) runs on the column, 432–1008. Every divider between entries runs 16 px past it on both sides, 416–1024. The list's dividers therefore stick out of the column the heading draws, and the section has no single right or left edge.
- evidence: `.preview/10-reading-aids/01-reading-aids/pages/terms/Terms.frame.png` y ≈ 1360 (the h2 rule) against y ≈ 1750, 2006, 2220 (the entry dividers); critic zoom `<scratch>/rules.png`. Standard, *Layout and spacing*: "Edges align: content shares a small number of left edges", and "the same step for the same relation everywhere". terms-FG1 logs the removed opening hairline but not this consequence.
- confidence: medium · found_by: critic

### C06 · must-fix · part 2a · open
- board: Terms.dc.html · view: phone · state: 00
- finding: At 390 px the figure "+0.10" ends one line and its unit "% of K" starts the next. The value splits in two, and the new line begins with a bare "%".
- evidence: `.preview/10-reading-aids/01-reading-aids/pages/terms/Terms.phone.png`, the second paragraph: "…Thirty events averaging +0.10" / "% of K with an sd of 0.25 % give t ≈ 2.19"; F11 writes the share as one value, `+0.10 % of K`. Standard, *Toss-level care*: "Long names, two-line labels and larger text still hold"; *Polish*: no widows in short copy.
- confidence: medium · found_by: critic

### C07 · gap · part 1 · open
- board: Terms.dc.html · view: frame · state: 00
- finding: The Shell's pressed language option "English" has a boundary of 1.24:1 against the top bar (1.47:1 in dark), so the current language is barely told apart from the other. This fails a blocking WCAG check. It is a signed 01-reader part in a frame file, and the page has logged it.
- evidence: `self_check=fail non-text-contrast` · `button.rd-lang__o… "English": 1.24:1 against #fffefa, needs 3:1 (its fill #dbe9e4)`; result.md `component_gaps:` line 1.
- confidence: high · found_by: measured

### C08 · gap · part 1 · open
- board: Terms.dc.html · view: text200 · state: 00
- finding: At 390 px with 200 % text, the Shell's back chevron and the language switch print over each other and "한국어" stacks one syllable per line. With large text, the top bar cannot be read. This fails a blocking WCAG check. It is a signed Shell part, and the page has logged it as terms-G1.
- evidence: `self_check=fail overprint` · `span.rd-back__chev "‹" and span.sc-interp "English" overprint at 390px with 200% text: 8x21px`; `.preview/10-reading-aids/01-reading-aids/pages/terms/Terms.text200.png` top; critic crop `<scratch>/t200.png`.
- confidence: high · found_by: measured

### C09 · gap · part 1 · open
- board: Terms.dc.html · view: frame · state: 07
- finding: At 320 px the Shell's back link is 43.6 × 44 px, under the 44 px target, and its label is cut to "B…", so the reader cannot tell where it leads. It is a signed Shell part. The page logged the target size but not the truncated label.
- evidence: `state=7 check=target a.rd-back "Book" is 43.6x44px`; `.preview/10-reading-aids/01-reading-aids/pages/terms/Terms.frame.state-07.png` (the phone box's top bar: "‹ B…").
- confidence: high · found_by: measured

### C10 · advisory · part 2b · open
- board: Terms.dc.html · view: frame · state: 01
- finding: In the 36rem column every window lands at the same x (560), because a 28rem window shifts left for any term that starts past it. When a term wraps (the DSR term ends one line and begins the next), the window sits under neither of the term's two pieces. The trade-off: one steady place for the window, against keeping it visibly next to the word that opened it.
- evidence: `.preview/10-reading-aids/01-reading-aids/pages/terms/Terms.frame.state-01.png`, `Terms.frame.state-02.png`, `Terms.frame.state-04.png` (window left edge at x 560 in each); F3 placement rule.
- confidence: medium · found_by: critic

### C11 · advisory · part 2b · open
- board: Terms.dc.html · view: frame · state: 11
- finding: On the arrived glossary entry, "‹ Back to the text" sits at the entry's end, after the longer definition. A reader who only wanted the short definition has to pass the whole entry to find the way back. The trade-off: reading order, against having the way back in view at once.
- evidence: `.preview/10-reading-aids/01-reading-aids/pages/terms/Terms.frame.state-11.png` (the DSR entry; the back link under the second paragraph); F6.
- confidence: medium · found_by: critic

## For the judge

- C02 · standoff: the drafter logged the stand-ins with a reason ("would restyle signed blocks") that this critique finds does not hold against the handoff's "shown only as they are". Under `critic` alone this goes to the operator, unsure: it is a judgment about how much of the signed neighbours the canvas must show for OQ2.

## Scorecard

| board | Part 1 | Part 2a |
|---|---|---|
| Terms.dc.html | C01, C02, C03 | C05, C06 |

**Component gaps** (frame or signed parts; not the page's to restyle): C04 (Gloss swap box, window and sheet), C07 (Shell language switch contrast), C08 (Shell overprint at 200 % text), C09 (Shell back link at 320).

**2b notes for the operator:**
- C10: Every definition window opens at the same spot in the column, so on a term that wraps over two lines it sits under neither half. That keeps the window steady, but it loosens its tie to the word that opened it.
- C11: The way back from the glossary sits at the end of the arrived entry, after the longer definition. That follows reading order, but it is out of view at first glance.

**The bar:**
1. Every list item opens its own item: holds (t-statistic, K, haircut, DSR, PSR and eigenvalue each opened their own window and their own glossary entry; K and haircut round-tripped to `#gl-k` and `#gl-haircut` and back to `#tm-k-1` and `#tm-haircut-1`).
2. A choice carries: holds (In the glossary → marks and focuses that term's entry; ‹ Back to the text returns focus to the exact occurrence and clears the mark).
3. Search and filters: not in scope (none on this page).
4. State bar: holds (verbatim CSS, in flow, only the 15 Terms presets, sunken, dashed; the three dark presets the preview's dedupe skipped land when clicked, verified by harness).
5. No link leaves: holds (`#top`, `#gl-*`, `#tm-sec-2` only; `design-check --page terms` OK).
6. Controls keep their size: holds (Read more ↔ Show less keep one 88.5 px box). The 14 `layout-shift` lines are logged as intended, and each reason holds: they are the scrolls F4 and F6 call for, the in-page link, the language reflow and the boxed phone views chosen from the state bar.
7. Same list header: not in scope.
8. Hover: holds (Close and Read more take a tint and keep their ink; In the glossary → darkens and underlines; the marker's dots turn accent with a `help` cursor).
9. Back chevron, logo, centred column, decisive actions: holds (the column runs 432–1008 on 1440; "‹ Back to the text"; the window foot puts its two actions at its two ends).
10. One direction, no decorative SVG: holds.
11. Toss-level lines: C06 (a value splits across lines at 390); C08 (large text breaks the top bar, a gap).

**Holds** (must survive the fixes):
- the marker reads "has a definition" as dotted ink, apart from the solid accent link and the yellow highlight, and never by colour alone;
- the window opens below the term, shifts to the column's right edge, flips above at the bottom of the 1440 × 900 box, and never covers the term;
- Tab to a term shows a 2 px accent ring. Enter and Space open the window with focus inside it, Tab walks Close → Read more → In the glossary and closes the window past the last control, and Esc closes it and returns the ring to the term;
- the term window and the popover stand-in never show together (a term click closes the note, a click on the paint closes the window);
- the phone sheet at 390 and 320 has 44 px controls, keeps body-size text and keeps the term above its edge;
- the glossary has 12 entries A to Z, each with its aliases and its longer definition;
- dark contrast, measured by the critic's harness: body 12.9:1, aliases, Close and the back chevron 7.3:1 (6.8:1 on the arrived ground), accent actions 7.3:1;
- the data placeholders are visible ([DSR BAR], [DRAWDOWN LIMIT], [HAIRCUT], [TUNING WINDOW], [TEST WINDOW]), and the page has no lorem and no personal data;
- the advisory measured lines are logged with reasons that hold: `cramped-padding` (the signed highlight), `tight-leading` (paragraph pitch measures about 30 px on the PNG; the 19.8 and 22.8 readings come from the math box), `straggler` (Korean `keep-all`).

**Not seen:**
- Pretendard: F8 does not load it on the canvas, against the handoff's Korean check. That is a frame choice for the cross scope, not judged here.
- The "In the glossary →" arrow and the other shared labels are frame choices. Appended arrows exist on signed 01-reader and 02-figures screens.
- Inline-math line spacing: the participation and t-statistic lines run 2–3 px uneven. This is the formulas page's check, not judged here.
- Touch input: taps were simulated with mouse events, and no screen reader was run.
- Coverage: every term's sheet at 320 was not opened one by one (sampled: PSR, DSR, eigenvalue, haircut, walk-forward, out-of-sample), and the hover window was not tried in the boxed phone views (hover is desktop-only by F3).
- A hover-opened window still closes 200 ms after the pointer leaves, even after Read more was clicked inside it. This is F3's rule as written, not judged as a defect.
