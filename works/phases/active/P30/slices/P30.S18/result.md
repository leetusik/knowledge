# P30.S18 result: Diagrams II (`03-diagrams`: sequence, stack, timeline, chart)

- status: done
- tier: mid
- model: sonnet
- effort: high
- summary: Sequence, stack, timeline and chart (bar, line, interval) are drawn from the signed round inside S17's frame: sequence as SVG (a port of the canvas's `layoutSequence`), the other three as server-rendered HTML in `em` with every position a numeric `--dg-*` variable; each has its text alternative (an `ol`, a `ul`, a data table, real lists). All six kinds are now drawn and S12's text bodies are gone.
- files_changed: web/src/lib/native/diagram-sequence.ts (new), diagram-rows.ts (new), diagram-kinds.tsx (new), diagram-layout.ts (exports only), diagram-draw.tsx (`Drawing` takes `W/H/prims`), render.tsx (every diagram through `drawn()`; `isDrawn`, `diagramBody`, `chartTable`, `caption`, `num` removed); web/src/content/chapter.ts (new strings, six dead ones removed); web/src/app/reader.css (last block); web/tests/diagram-rows.test.ts (new); web/tests/native-render.test.ts (minus sign in the style allowance, the chart count); works/phases/active/P30/phase.md, topics/{notes-later,operator-questions-decided,doc-impact-detail}.md
- validation:
  - `pnpm --dir web typecheck` PASS · `lint` PASS · `test` PASS (30 files, 269 tests; 5 new) · `build` PASS
  - `python3 scripts/plugin_parity.py` PASS · `python3 scripts/skills_parity.py` PASS · `python3 scripts/workflow.py validate` PASS (pre-existing warnings only)
  - live check (below): PASS
- deviations: none from the plan. Decisions OQ87-OQ92 (`topics/operator-questions-decided.md`). The server did not change.
- doc_impact: frontend.md, security.md: P30.S18 (one line in `phase.md`; full text `topics/doc-impact-detail.md` → *P30.S18*)

## What was built

- **Sequence** (`diagram-sequence.ts`): `layoutSequence`, the canvas's rule for rule: one column per actor (label balanced at 128, at least 84 wide), spacing widened for each step's number and label, lifelines under everything, a step to itself as a 32 × 22 loop with its label to the right, dashed replies, labels knocked out of lifelines, a folded-corner note in the warn tone. Drawn by S17's `Drawing` (same frame, size clamp, scroll box).
- **Stack, timeline, chart** (`diagram-rows.ts` for the numbers, `diagram-kinds.tsx` for the elements): a port of the canvas's `dgrows.js`. Stack plain and nested (a muted layer inside a hue layer lifts its border); timeline lanes with bar rows, mark rows, ticks, unit, the lane-name column from 30em; chart bar (vertical, or rows past seven categories or a name over 64 px), line (dashes, end names and rules pushed apart, numeric x with its first value), interval (`[low, high]` or `[low, median, high]`), the y range and round ticks, below zero, rules, the legend with patterns and dashes, minimum widths.
- **Text alternatives:** sequence `ol` ("A to B: label", "A, to itself: label", ". Note: ..."), timeline `ul` per lane (bars, marks, "no bars"), chart a hidden `table` (caption "{y}, by {x}", a column per series, interval cells "4–21, median 9"), stack real lists with the hidden "Inside {outer}: ". Drawings are `aria-hidden` where the alternative stands in for them.
- **Style rule kept:** every inline style is a number set as a `--dg-<letters>` custom property; `reader.css` maps it (`left: calc(var(--dg-l) * 1%)`). Verified in the browser: no `style` attribute on any diagram holds anything else.
- **Test (very core only):** `web/tests/diagram-rows.test.ts`: round ticks, bars from zero and their share of the plot, a negative bar hanging from the zero line, the interval's band and median (and its table cell), and the sequence's same-source-same-geometry.

## Live check

Instrument: **Aside** (`aside repl --account u1`) for screenshots, geometry and the real ArrowRight key, through the iframe harness for true 390 and 820 viewports (and 1440); headless Chrome over CDP (throwaway profile) for console and CSP and DOM dumps. Compared by screenshot against the critic's rendered PNGs of the signed canvas (`KindSequence`, `KindStack`, `KindChart`, `KindTimeline` `.frame.png`); the canvas itself needs the design tool.

Runtime: production build `next start` `:3811` and a dev clone `:3813` against a scratch API `:8811` (scratch `KB_ROOT`, scratch database `kb_s18live` in `kb-p28s2-pg`, migrated to `0006`, `KB_GIT_COMMIT=false`, no Gemini keys); the fixture book plus my chapter `diag2` (the canvas's own samples from `dgdata.js`: bridge, publish, both stacks, position-writes, twelve lanes, survey in rows, grouped, line, interval, negative, long names, 200 points; plus a six-actor sequence, no caption, Korean for each kind, two figure rows holding every kind). `fixtures` made public for anonymous reads.

| Check | Result |
|---|---|
| Sequence (notes, steps to itself, dashed reply, six actors) | draws as the board; the six-actor one scrolls in its box |
| Stack plain and nested, tones | as the board: small items, one dot between, none opening a line; nested borders enclose the next |
| Timeline (lanes, bars, marks, overlapping rows, twelve lanes, unit) | as the board; the lane-name column at 576, names above at 356 with every other tick hidden |
| Chart: 13 categories in rows with a mean rule, grouped bars with a goal rule and patterns, lines with dashes and end names, interval with median, below zero, long names in rows, 200 points | as the board; end names and the rule label pushed apart as drawn |
| Themes light, slate (dark), sepia | tones and ink right in all three (screenshots of the sequence, nested stack, timeline, grouped bars, lines) |
| 390 / 820 / 1440: column 356 / 576 / 576 | measured: only the wide drawings overflow (six actors and publish at all widths, grouped bars 442 at 390), each a `role=region`, `tabindex=0`, labelled box with the hint; the page never scrolls sideways at any width |
| Text sizes 1 and 5 (figure font 12.5 and 18.33 px) | the sequence follows `W/15 em` (bridge 272 / 321 / 392 px); at 390 and size 5 five drawings scroll, no page overflow |
| Figure-row items (180 and 280 px) | stack re-flows and fits; a vertical bar chart (min 18em) and the timeline (18.7em) scroll in their own box with fade and hint; a small sequence and an interval fit |
| Keyboard | Tab focus lands on the scrolling box with the 2 px ring; Aside's real ArrowRight scrolled it (0 to 80 px, both fades) |
| Text alternative | present, visually hidden, correct for sequence (note, itself), timeline (no bars, marks), chart table (series, interval cells), nested stack ("Inside ...") and Korean |
| Console and CSP | no errors on the production build; no errors on a fresh dev clone (only the unrelated `/favicon.ico` 404). A long-running dev clone printed a transient "unique key" warning after hot reloads; it vanished on a fresh start with identical code, and the server render raises none |

Not verified: print (CSS transcribed, not printed), real devices, the canvas boards side by side, 1024 wide (same 576 column as 820), the production build in the other browsers.

## Findings

- The canvas's `position-writes` sample has a lane with marks and no `bars`; S2's schema requires `bars` on every lane, so the fixture needs `bars: []` (OQ90). A contract observation for REVIEW, not changed here.
- The reader's `.kb-ch ul/li` rules beat the canvas's bare class selectors; the stack and legend rules carry a `.dg` prefix (OQ88).
- A chart's source key is `type:` (the tree's is `chart`), as S12 noted; my first fixture used `chart:` and S2 refused it.

## Residue

Scratch database `kb_s18live` in `kb-p28s2-pg`; scratch files in the session scratchpad `s18/`. All servers I started (`:8811`, `:3811`, `:3812`, `:3813`, `:3814`, `:3815`) are stopped by PID; the standing `:3030` and `:8766` were not touched. The Aside profile `u1` holds `kb_reader` = size 3, theme light, no session on `127.0.0.1`.
