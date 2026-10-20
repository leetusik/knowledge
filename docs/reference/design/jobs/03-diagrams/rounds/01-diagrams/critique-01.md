# Critique 01: 03-diagrams/01-diagrams

- pass: 01
- mode: critic
- verdict: revise
- confidence: high
- must_fix: 10 (part 1: 3, part 2a: 7)
- gaps: 3
- advisory: 3
- wave: 04-quiz, 1 choice
- escalate: C09, C17
- preview: 374.9s, 136 states
- standard: .claude/agents/design-drafter.md

Evidence paths: `<SCR>` is `/private/tmp/claude-502/-Users-sugang-projects-personal-knowledge/f0010d83-1939-47da-8f62-5ffe37557260/scratchpad/critic-03-diagrams-01`. The render is `<SCR>/pass-01/` (28 PNGs, 136 states, `preview.json`); my crops are in `<SCR>/crops/<Board>/rR_cC.png` and `<SCR>/look/`; the harness outputs are in `<SCR>/t2_out_1440.txt` and `<SCR>/tools/`. Engine totals: `design-preview 03-diagrams --phone-click` gave pngs=28, failed=0, states=136, issues=80, and all 80 are `check=layout-shift` on `header.rd-top` (weighed under bar line 6 in the Scorecard, no finding). There is no contrast, target, clipped, dead-link, overflow, unmounted, runtime-error or unmeasured line. `design-check 03-diagrams`: OK, 27 boards, no `leaves-canvas` or `same-target-list` warning. The 04-quiz sibling was rendered once without `--click` (27 PNGs, 0 issues) for the cross-job look.

## Findings

### C01 · must-fix · part 1 · open
- board: Main.dc.html (also Widths.dc.html) · view: frame · state: 19 (the first of 24)
- finding: The state bar does not show the state it is in: after 24 of Main's 27 content presets (and 17 of Widths' 18) have landed, no content preset reads pressed.
- evidence: Harness at 1440, every preset clicked in turn, `aria-pressed` read after each landing (`<SCR>/t2_out_1440.txt`). Only `Sample diagram · EN v2`, `Sample · EN v1` and `Sample · 한국어 v1` come back pressed. For `No caption`, the six `Flow ·`, `State ·`, both `Sequence ·`, `Stack`, `Stack · nested`, `Timeline`, the seven `Chart ·`, `한국어 labels`, both `Near the limits ·` and `Every tone` (24 in all) the pressed buttons are only `Size 3` and `System`, although each figure did land (about 240 px under the top of the page). On Widths (three identical bars) I clicked the 18 content presets from a fresh load: only `Sample diagram · EN v2` presses, in each of the three bars. Cause, read from the live component state: once the scene lands, the Reader's first scroll report writes progress `started` for the specimen document (`flow.js` `reading`, L187-200) while the preset's own scene carries progress `none` (live `started`, preset `none` for `nocap`, `bar`, `stack`, `map`); `sig()` (L88-94) includes `RD.stateOf(prog, doc)`, so `pressedKey()` (L95-103) matches nothing. The three that press are the scenes that already carry `started`. Drafter file L69: "the pressed preset is the one matching the current state"; bar line 4.
- confidence: high · found_by: critic

### C02 · must-fix · part 1 · open
- board: Main.dc.html (chapter body) · view: frame · state: 29 (Stack); the same caption sits on KindStack.dc.html and Narrow.dc.html
- finding: The stack figure's caption, "Top to bottom, each layer calls only the one under it.", is false for the layers it draws and contradicts the layers drawing on the same page.
- evidence: `dgdata.js` L215-226 (`stack-plain`) stacks Clients, Web app server, The API, Content plane, Accounts plane, Files. The page's own Layers flow (`dgdata.js` L62-91, `fig-layers`) has the web app server calling both planes (`web -> content`, `web -> accounts`), coding agents calling the MCP service (which the stack leaves out), the content plane calling the files and the accounts plane calling Postgres. So the API calls two sibling planes, the Content plane does not call the Accounts plane, and the Accounts plane does not call Files. Seen at `<SCR>/crops/KindStack/r0_c0.png` (caption under the plain stack) and `<SCR>/crops/Narrow/r1_c0.png`. Data rule: a real fact of the product stated wrongly; the same facts are drawn correctly in the Layers flow and the explainer.
- confidence: medium · found_by: critic

### C03 · must-fix · part 1 · open
- board: KindState.dc.html (Card status in light, dark, sepia, 390, size 5) · view: frame · state: 00; Main.dc.html state 26 (chapter body)
- finding: The review-card status diagram gives no way back from Suspended, though the card's status is two-way.
- evidence: `dgdata.js` L158-174 draws Active to Suspended ("the reader suspends it"), Active to itself ("type changed: reset"), Active to Retired and Suspended to Retired, and no edge from Suspended to Active. The P29.S3 contract in `works/phases/active/P29/phase.md` has `status (active|suspended|retired)` (L759), "the reader can **suspend** a card" (L802) and `PATCH /app/reader/review/cards/{id} {status: active|suspended}` (L847), so a suspended card can be made active again. The picture (`<SCR>/crops/KindState/r0_c0.png`) reads as a one-way trap. Data rule: real facts of the product.
- confidence: medium · found_by: critic

### C04 · must-fix · part 2a · open
- board: Main.dc.html (first view, and state 22 Layers), Widths.dc.html, Figure.dc.html, KindFlow.dc.html · view: frame, phone · state: 00
- finding: An edge label's knock-out box straddles a group's border, so it cuts the border and paints a paper-coloured notch into the group's tint.
- evidence: First view of Main (`<SCR>/pass-01/Main.frame.png`, about x 745-757, y 150-205): the label "async dependency, runs before the write lock" overlaps the lane group's right border; the border is broken and a paper strip interrupts the tint (zoom: `<SCR>/look/halo_hero.png`). The same on the Figure board in light, dark and sepia (`<SCR>/crops/Figure/r0_c0.png`, `r3_c0.png`), on Widths in all three frames, and on Layers, where "bearer, server to server" lies across the bottom border of Servers and the top border of "The API: one FastAPI process" (`<SCR>/look/th_fig-layers_Dark.png`, `th_fig-layers_Sepia.png`, `<SCR>/crops/KindFlow/r1_c0.png`). The drafter's own rule (build prompt L280-281) puts the box "in the ground under it (`kb-surface`, or the group's tint)", and L254 asks for 8 px of clear line each side; a single fill cannot match two grounds, and the clear line is kept between nodes, not between a node and a group border. Where the label sits wholly in the gap between two groups (`14 · Diagram`, "201 goes out") it is clean. Craft standard L145-150 (polish); KindFlow's own lead: "each label knocked out of its own line".
- confidence: high · found_by: critic

### C05 · must-fix · part 2a · open
- board: Narrow.dc.html · view: frame · state: 00 (a figure-row item a third of the column wide, "A stack · re-flows")
- finding: When a stack layer's items wrap, the second line opens with the separator dot ("· coding agents over MCP").
- evidence: `<SCR>/crops/Narrow/r1_c0.png` and `<SCR>/look/narrow_stack_third.png`: all six layers wrap and every one starts its second line with "· " (browsers / · coding agents over MCP; sealed-cookie BFF / · bearer to the API; one uvicorn worker / · the write lock; SQLite · FTS5 · WAL / · rebuilt from docs/; Postgres · SQLAlchemy / · Alembic; docs/<project>/<date>- <slug>.md / · a git repository). At 576 and at 390 the dots fall between items on one line (`<SCR>/crops/KindStack/r0_c0.png`, `r1_c0.png`), so it shows only at slot widths where items wrap. KindStack's lead says items follow "after a middle dot, wrapping inside the layer", so the wrap is intended; a line that opens with a separator is not. Craft standard L93 (a mark that separates nothing) and L145-150 (polish).
- confidence: high · found_by: critic

### C06 · must-fix · part 2a · open
- board: KindTimeline.dc.html (Twelve lanes) · view: frame · state: 00; Main.dc.html state 41 (`#limits-lanes`)
- finding: In the twelve-lane timeline the same label, "check", is drawn in two colours, so colour says something the data does not.
- evidence: Computed classes in the live DOM: the eight "check" bars carry `dg-tone-series-3` (plum, line rgb 118,79,108) in Gull Rock, Old Harbour, Heron Bay and Sandpiper Cut, and `dg-tone-series-4` (slate, rgb 68,97,122) in Saltmarsh Quay, Brine Flats, North Mole and Ebb Light; every "re-fit" is `series-2` bronze and every "backfill" is accent. Cause: the generator at `dgdata.js` L428-429 picks the label by `i % 3 === 0` and the tone by `(i % 3) + 2`. In Position writes the tone follows the label (2 s muted, 15 s cap bronze), and the Tones lead says a tone "is never the only sign of anything", so a reader looks for what plum against slate means; there is no legend and no answer. Pictures: `<SCR>/look/th_fig-limits-lanes_Sepia.png`, `th_fig-limits-lanes_Dark.png`, `<SCR>/crops/KindTimeline/r1_c0.png`. Craft standard L93 (visual structure is information, never decoration).
- confidence: high · found_by: critic

### C07 · must-fix · part 2a · open
- board: KindSequence.dc.html (The legacy bridge in light, dark, sepia) · view: frame · state: 00; Main.dc.html state 27 (`#bridge`)
- finding: The legacy-bridge sequence draws two messages that are not replies, "scroll {fraction, anchor}" and "navigate {href}", with the dashed reply stroke.
- evidence: `dgdata.js` L177-190 gives `style: dashed` to steps 2 and 4, both sent by the framed explainer unasked (step 2 repeats, throttled; only step 1 is a request, and nothing answers it). The chapter text over the figure says "A reply is dashed" (`dgdata.js` L493), the KindSequence lead says the same, and the build prompt L304 allows `style: dashed` "for a reply". The cell is titled "a dashed reply, a note and steps to itself" yet draws no reply, and the dashed "scroll" arrow right under "restore" reads as its answer (`<SCR>/crops/KindSequence/r0_c0.png`). The publish sequence draws two true replies ("201", "saved"), so the kind is still shown. Craft standard L93.
- confidence: medium · found_by: critic

### C08 · must-fix · part 2a · open
- board: KindTimeline.dc.html (Position writes, Twelve lanes) · view: frame · state: 00; Main.dc.html states 31 and 41
- finding: Timeline gridlines run behind the bar and mark labels, so hairlines cross text.
- evidence: `<SCR>/look/tl_zoom.png` (zoom of Position writes): the gridlines cross "keeps scrolling", "a short scroll", "15 s cap" and a "PUT" label; in the twelve lanes the 15-day line crosses "backfill" under Saltmarsh Quay (`<SCR>/look/th_fig-limits-lanes_Sepia.png`, `<SCR>/crops/KindTimeline/r1_c0.png`). The flow and sequence kinds knock their labels out of the lines they cross (build prompt L280-281, L303); the timeline does not. The lines are faint and the words stay readable, so this is polish rather than breakage. Craft standard L145-150.
- confidence: medium · found_by: critic

### C09 · must-fix · part 2a · escalated
- board: KindChart.dc.html (Recall by days since the last review, light, dark, sepia) · view: frame · state: 00; Main.dc.html state 34 (`#line`)
- finding: At the line chart's right edge the mean rule's label ("mean 88.6") sits between the series names "Collocations" and "Phrasal verbs", nearer to where the Phrasal verbs line ends than its own name is.
- evidence: `<SCR>/crops/KindChart/r1_c0.png` (light), `r1_c1.png` (sepia): three labels inside about 37 px. Collocations at y 752; "mean 88.6" at y 770, in ink, 8 px from the end of the Phrasal verbs line (y 778); "Phrasal verbs" at y 789, 11 px under its own line end. Series names take their line's colour and a legend row above names all three lines, so the reading is recoverable; this is a near-miss in label placement, not a missing label. Craft standard L150 (no near-misses), L102 (edges align).
- confidence: low · found_by: critic

### C10 · must-fix · part 2a · open
- board: Tones.dc.html · view: frame · state: 00
- finding: The lead says the thirteen tones are "drawn from six hues and two neutrals in the system's own families", but two of the six hues, olive (`ok`, `series-6`) and slate (`store`, `series-4`), are not in the system.
- evidence: `Tones.dc.html` L20 names teal, bronze, brick and plum as the system's own and then calls the whole set "the system's own families". The drafter's own gap log (`result.md`, "Component and token gaps") says "New: slate and olive, the dark and sepia hues the system lacks, the tints, and the light `muted` line". This board is what the operator reads to decide the palette, so the sentence hides that the proposal adds two hue families. Craft standard L131 (copy: real and specific to this product).
- confidence: medium · found_by: critic

### C11 · advisory · part 2b · open
- board: Main.dc.html (phone), Narrow.dc.html, KindState.dc.html · view: phone, frame · state: 00
- finding: Q1's rule (grow, cap at the column, shrink to an 11 px floor, then scroll) costs most at the narrow end.
- evidence: At 390 the hero sample shows its right third behind the fade ("async depen...") under the hint "Scroll sideways to see the whole drawing →" (`<SCR>/pass-01/Main.phone.png`), and the three-state chapter diagram needs the same scroll (`Chapter states · 390` on KindState). In half- and third-column figure-row items the line chart's legend and end labels show as fragments ("Collocati", "Co", "m", "Ph", "Id": `<SCR>/crops/Narrow/r2_c0.png`). This is the signed rule working, not a defect; the trade is legible type everywhere against a small diagram that cannot be taken in at a glance on a phone.
- confidence: medium · found_by: critic

### C12 · advisory · part 2b · open
- board: Main.dc.html (frame and phone), Widths.dc.html · view: frame, phone · state: 00
- finding: Both interactive Pages open scrolled into the chapter, so the state bar is out of view on first sight.
- evidence: First-view bar position, measured: Main y -1647 at 1440 and -2290 at 390; Widths -1997, -1416 and -1465 (three identical bars, one per frame). The signed 01-reader opens with its bar at y 0, and 04-quiz also opens mid-page. Bar rule 1 is met to the letter (the bar is static and scrolls away) and both board leads say where it is. The trade: the hero figure is the first thing seen, against a reviewer who must know to scroll about 1650 px up to find the bar; only the foot strip is in view.
- confidence: medium · found_by: critic

### C13 · advisory · part 2b · open
- board: Tones.dc.html, KindChart.dc.html (six-series sets) · view: frame · state: 00
- finding: `series-5` and `series-6` alias `bad` and `ok`, so in a six-series chart two series read as error and success.
- evidence: `diagram.css` L19-20 (light; dark L34-35, sepia L49-50): series-5 is #a8503f (the `bad` brick) and series-6 is #4d6a2b (the `ok` olive); the Tones rows say "= bad" and "= ok", so nothing is hidden. Only series-3 (plum) is a hue of its own. The trade: six distinguishable hues against a vocabulary where each tone means one thing.
- confidence: medium · found_by: critic

### C14 · gap · part 1 · open
- board: all
- finding: The kb system ships no component bundle and no graph or diagram component, so the diagram renderer (`14 · Diagram`) and the reader's parts are canvas-local markup, not `x-import`ed system components. The drafter logged this.
- evidence: `result.md` "Component and token gaps" ("No components ship with the system", "No graph or diagram component"); `canvas/project/ds/kb/` holds `tokens.css` only. For the operator and the system: the renderer is new and has no home yet.
- confidence: high · found_by: critic

### C15 · gap · part 1 · open
- board: Tones.dc.html, diagram.css
- finding: The system has no diagram tone tokens: 39 custom properties per theme (13 tones, each a line, an ink and a tint) plus print are proposed, with new olive and slate families and a new light `muted` line (#8a8071, because `kb-hint` #8f8676 is 2.97:1 on the sunken surface). The drafter logged this.
- evidence: `diagram.css` L6-67; `result.md` "Component and token gaps" and departure 4. Contrast of every proposed value checked against the board's own table and recomputed: all text 4.5:1 or better on its tint, every line 3:1 or better on the page and its tint.
- confidence: high · found_by: critic

### C16 · gap · part 1 · open
- board: Main.dc.html, KindFlow.dc.html (Korean flows)
- finding: The system's cache carries no Hangul face (Pretendard is named by the face stack but not loaded), so Korean inside a drawing renders in the platform Hangul font (Apple SD Gothic Neo here). The drafter logged this.
- evidence: `result.md` "Component and token gaps"; Korean flows at `<SCR>/crops/KindFlow/r2_c0.png` render and wrap cleanly in the platform face. Real Pretendard widths are untested, and the build prompt says the server measures with the faces' advance widths.
- confidence: high · found_by: critic

### C17 · choice · part 2a · escalated
- board: Main.dc.html state 21 (the "201: saved" and "It is there" nodes), Tones.dc.html · view: frame · state: 00
- wave: 04-quiz/ChoiceStates.dc.html (and Main, Widths: the right and wrong states; `quiz.css`)
- finding: The two jobs draw "good" in two colours: this job's `ok` tone is a new olive, while 04-quiz's "right" answer is the system's teal `kb-status-active`.
- evidence: This job: `diagram.css` L11 `--dg-ok: #4d6a2b` (dark #a3bd6e, sepia #475f22), used for success nodes such as "201: saved" and "It is there"; teal is `accent` and `series-1` here, so it keeps the meaning "the one thing marked". 04-quiz: `quiz.css` L2-3, L50-51 and L77, right is `--kb-status-active` (#0f6f66, sepia #0c6159) and wrong is `--kb-status-revoked` (#a8503f), which equals this job's `bad` exactly. In one chapter a reader meets an olive "fine" in a diagram and a teal "right" in a quiz. Neither side contradicts the system (it has an `active` status but no "ok" colour) or a signed job, so it is an open choice: (a) keep both (olive for diagrams, teal for quizzes; two roles, two colours); (b) this job moves success to `kb-status-active` (one "good" in the reader, but diagrams lose a hue distinct from `accent`); (c) 04-quiz adopts the olive for "right" (one "good", and a new family in the quiz).
- confidence: medium · found_by: critic

## For the judge

- C09: low confidence (a near-miss in label placement, read off the PNG at 1x; the legend and colour coding keep it legible).
- C17: wave choice (the colour of "good": olive `ok` here against teal `kb-status-active` in 04-quiz).

## Scorecard

| Board | Part 1 | Part 2a |
|---|---|---|
| 01 Main (flow) | C01, C02, C03 | C04, C06, C07, C08, C09 |
| 02 Reader (alone) | ok | ok |
| 03 Widths | C01 | C04 |
| 04 Elsewhere | ok | ok |
| 05 Tones | ok | C10 |
| 06 Figure | ok | C04 |
| 07 Flow | ok | C04 |
| 08 State | C03 | ok |
| 09 Sequence | ok | C07 |
| 10 Stack | C02 | ok |
| 11 Timeline | ok | C06, C08 |
| 12 Chart | ok | C09 |
| 13 Narrow | C02 | C05 |
| 14 Diagram (one instance) | ok | ok |
| 15-27 copied parts (one instance each) | ok | ok |

**Component gaps (logged by the drafter, for the operator and the system):** C14 no component bundle and no graph or diagram component; C15 no tone tokens (39 per theme, new olive and slate); C16 no Hangul face in the cache.

**2b notes for the operator:**
- The narrow end pays for Q1's rule: at 390 the hero sample and even the three-state chapter diagram need sideways scrolling, and half- and third-column items show a chart's legend and end labels as fragments; that is the signed rule at work, and the cost is that a small diagram cannot be taken in at a glance on a phone (C11).
- Main and Widths open scrolled to the hero figure, so the state bar is about 1650 px (desktop) or 2300 px (phone) above the first view and a reviewer must scroll up to find it; the operator's rule 1 is met to the letter, and the trade is a first view that leads with the drawing (C12).
- `series-5` and `series-6` alias `bad` and `ok`, so in a six-series chart two series read as error and success; the trade is six distinguishable hues against a vocabulary where each tone means one thing (C13).

**Options:** none asked (`new visual direction: no`; one direction drawn).

**The bar, line by line** (the operator's rule first, then the drafter file's bar):
- Operator's rule 1 (the state bar scrolls away and is never pinned): holds. The bar is static in the reader's scroller; at 1440 and 390 it leaves the viewport with the page (first-view position in C12).
1. Every list item opens its own item: holds. Contents rows and the chapter list each open their own chapter; no `check=same-target`, no `check=same-target-list`.
2. A choice carries: holds. The language switch and the version choice keep the section; Previous and Next carry the position; caption links land on the named state.
3. Search and filters change the data and counts are true: holds (none in scope; the language and version switches change the data and keep the section).
4. The state bar on every interactive Page, listing only that page's states: C01 open. It is on Main (27 content presets plus size and theme) and on Widths (18 plus size and theme, one bar per frame), sunken, dashed, no system component, no brand accent, and every preset lands on its figure; the pressed preset is wrong for 24 and 17 of them.
5. No link leaves the prototype, no `#` placeholder: holds. `design-check` OK; caption links go to in-canvas states and the missing-link style shows.
6. Controls keep their size and the page holds still: holds, after weighing 80 measured `check=layout-shift` lines. All 80 are `header.rd-top` moving by the bar's own height: Main frame y 117 and 3 (41 lines), Main phone y 373 and 3 (31), Widths y 159 and 246 (8). That is the header sticking at the top once a preset lands inside the chapter, against sitting under the bar at the top of the page: the operator's rule 1 itself, as in the signed 01-reader's 02-revise critique and departure 3 here (the drafter counts 59 in its run; the 31 phone lines are the difference). No control changes size and no content reflows, so the reason holds and I raise no finding.
7. The same list header in every filter and search state: holds (no filters in scope).
8. Hover on primary and secondary controls: holds. No `check=hover-contrast`; the caption link's hover changes the underline only (`<SCR>/look/caplink_hover.png`).
9. Back links with the "<" chevron, logo home, centred column, figures side by side aligned: holds ("‹ The knowledge maintainer guide", "‹ Previous"; the 576 px column is centred; the survey's figures are tabular).
10. One direction, no decorative SVG: holds. The diagrams are the job's subject and carry no ornament.
11. The Toss-level lines of the craft standard: open where named, C04 (broken group border at the hero's first view), C05, C06, C07, C08, C09; nothing else fails on the PNGs.

**Holds (must survive the fixes):**
- A clean render: 28 PNGs, 0 failed, 136 states, no contrast, target, clipped, overflow, dead-link, unmounted or script line; all 27 boards load.
- The palette: every tone's text on its tint measures 4.5:1 or better and every line 3:1 or better on the page and its tint in light, dark, sepia and print (my recomputation matches the Tones board's table); the print values are shown on white on the board.
- The scroll box: `tabindex="0" role="region" aria-label="Drawing, scrolls sideways"` only while the drawing overflows (scrollWidth 753 against 576 at 1440, 356 at 390), a visible focus ring, ArrowRight scrolls it, and no sideways page scroll at 390.
- The Q1 size rule across sizes 1, 3 and 5 and the three themes: figures grow with the text and cap at the 576 px column (`<SCR>/look/sz_*.png`, `th_*.png`).
- Caption links (`#id`, `chapter:`, `doc:`) land in-canvas and the missing-link style shows.
- Copy fidelity: 13 copied reader parts and `reader.css` are `cmp`-identical to the signed `jobs/01-reader/canvas/project`.
- Korean flows render and wrap with keep-all (in the platform Hangul face, logged as C16).
- The facts drawn correctly: the write path, the Layers flow, the four reader-state tables, the legacy bridge steps, the chapter states, the position-write cadence (2 s, 15 s cap, a pagehide beacon) and the survey numbers (126 figures in 37 explainers; the bars sum to 126; mean 9.7) agree with the P29 record and the explainer.
- The static, sunken, dashed state bar with no accent; the foot strip with its three board links; board names and order that follow the signed 01-reader (Pages, Foundations, Components, Mounted parts, "Mounted part — X (one instance)").
- One direction, no decorative SVG.

**Not seen:**
- Hover and pressed looks beyond the computed contrast, one caption-link hover screenshot and `aria-pressed` reads; the bar's bold-on-press was not looked at.
- Native pickers and typed edge values (no such control on these Pages); transient states (the reader's loading skeleton and "Try again" are copied from the signed reader).
- The server renderer and real Pretendard widths (not loaded in the cache); print output (only the Tones board's print column is drawn); iPad landscape (no frame, departure 8: the column is 576 px from 40rem up, reasoned and not seen).
- The wave's other jobs (02-figures, 05-annotations; their critics read them) and the live trees of 02 and 05 that the drafter says it did not read, so the seams noted in `result.md` are unchecked here.
- **Wave look, 04-quiz** (rendered once, 27 PNGs, 0 issues): one open choice (C17). Its board titles ("Signed reader, copied — X") and order (Widths as 02, no Foundations board) differ from the signed 01-reader's "Mounted part — X" naming that this job follows; that is 04's side and is not raised here.
