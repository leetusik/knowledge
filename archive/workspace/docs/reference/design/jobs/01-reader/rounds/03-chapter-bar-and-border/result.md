# Result — job `01-reader`, round `03-chapter-bar-and-border` (P29.S4, driven by P30.S1)

- status: done
- job: 01-reader
- round: 01-reader/03-chapter-bar-and-border
- open_items: C03, G1, G2, G3, S1, L1, Q1, O1

## Summary

Two A5 fixes on the signed reader, nothing else.

- **C07, compact chrome**, by the reader's width in rem. Under 20rem the chapter bar shows ‹ and → in square targets, and Contents over "2 of 5". Under 21rem a two-language chapter's switch takes a second row of the top bar, placed after Display so Tab follows the rows. Under 14rem a loose document's logo steps aside for "‹ Library". At 100% from 390 px the chapter bar is pixel-identical to signed.
- **Control edge** `--rd-control-edge` = `kb-hint` (3.56 / 3.58 / 3.62:1) on the secondary button, the language switch and the display options.
- **Departures:** D1 the chosen language takes a 1px accent edge; D2 the window and size rows on 01 and 03.
- **Critique 01:** C01 and C02 fixed; C03 is the operator's wave choice.
- **Open:** C03; G1 token for D45; G2 the system's accent-soft tint under 3:1; G3 canvas-only scrim; S1, L1 signed canvas behaviour; Q1 posed back; O1 `05-annotations`' filter outline.

## Build

This is the delta on the signed `02-revise` build prompt (`rounds/02-revise/build-prompt.md`). Build everything else exactly as that prompt says; nothing it describes changes at 100% text from 22.5rem up, except the language switch's outline colour and its chosen option's edge (§1).

### Canvas-only additions (never build)

- **The window row** on 01's state bar (chapter and loose-document pages): Fills the window · Phone 390 · Phone 390 · text 150% · Phone 390 · text 200% · Phone 320, with its caption above the window. **The size row** on 03's bar (Text 100% · phone 390 · Text 150% · Text 200% · Phone 320 · text 100%) and 03's captions. Both set the root font size with a `<style>` element; `flow.js` holds the `win` setting.
- **The large-text rows** on boards 06 and 07. Every size in both bars is in rem, so a cell that lays the bar out at 390 px divided by the text size, then scales it up, shows what the root font size does. The 200% cells use CSS `zoom: 2`. The 150% cells lay out at 260 px and scale by 1.5 with a `transform`, in a stage that holds the scaled height, because `zoom: 1.5` snaps a 1px edge to one device pixel that the browser reports as 0.67px (critique C01).
- `.rd-proto__win`, `.rd-proto__cap`, `.rd-widths__phone` and `.rd-stage--narrow` in `reader.css`.

### 1. The control edge: a reader-scoped role

- **Define** `--rd-control-edge: var(--kb-hint)` on the reader root. It resolves in each theme: light `#8f8676`, dark `#7e7566`, sepia `#8b785b`. It is one value, not a new one: a separate hex that cleared 3:1 by the smallest step would sit 1.01:1 from `kb-hint`, a near-miss.
- **Apply it** to the 1px border of:
  - `rd-btn--secondary` at rest (Mark as unread, Read this version, the skip button "Show reading controls", Sign in to save's secondary, and every other secondary button);
  - the language switch's outline (`rd-lang`);
  - the display options (`rd-opt`, the five text sizes and the four themes) at rest.
- **The chosen language** (`rd-lang__opt[aria-pressed="true"]`) also takes a `1px kb-accent` border. Every option always carries a 1px border, transparent unless chosen, and its side padding is `calc(0.6rem - 1px)`, so no option changes size. The fill and label stay as signed (accent-soft, accent-strong). See D1.
- **Unchanged:**
  - every hover (an accent border, and the secondary button's label in accent-strong);
  - the pressed display option (an accent border, a 1px inset accent ring, the accent-soft fill);
  - the focus ring (2px `kb-accent`, offset).
- **Not controls, so unchanged in `kb-border-strong`:** the notices' outline, Sign in to save's card, the blockquote rule, the long table's header line and Foundations' swatch chips. `kb-border` hairlines are unchanged everywhere.
- **Borderless controls have no boundary to fix:** the top bar's text buttons, the chapter bar's links, quiet buttons, the logo, the text links and the callout toggle.
- **Unused:** `rd-btn--ghost` is defined in `reader.css` and used nowhere. The signed prompt names no ghost button, so it is not built.

**Measured contrast** (WCAG 2; the ground is `kb-surface`, which every one of these controls sits on):

| Control · state | What draws the boundary | Light | Dark | Sepia |
|---|---|---|---|---|
| The signed boundary, for reference | `kb-border-strong` | 1.58 | 1.56 | 1.64 |
| Secondary button, language switch, display option · rest | `--rd-control-edge` | **3.56** | **3.58** | **3.62** |
| Secondary button and display option · hover | `kb-accent` border | 5.97 | 7.31 | 6.23 |
| Display option · pressed | `kb-accent` 1px border and 1px inset ring | 5.97 | 7.31 | 6.23 |
| Language · chosen option (new edge) | `kb-accent` border | 5.97 | 7.31 | 6.23 |
| Focus, every control | 2px `kb-accent` ring | 5.97 | 7.31 | 6.23 |
| Rest edge against the hover/pressed accent (they are told apart by hue, by the label's colour and, when pressed, by a 2px ring and a fill) | edge vs accent | 1.68 | 2.04 | 1.72 |
| The same edge on `kb-paper` (for 06-library) | | 3.22 | 3.90 | 3.31 |
| The same edge on `kb-surface-sunken` | | **2.97** | 3.32 | 3.14 |

The render measures every one of these controls at 3:1 or more on every board: after critique C01, no `non-text-contrast` line names `rd-btn--secondary`, `rd-lang` or `rd-opt`. (Pass 2 had named the chosen language on 06's 150% cell, an effect of the canvas-only `zoom: 1.5`; that cell now scales instead.)

**For 06-library (the wave seam):** the 3:1 boundary is `kb-hint`'s value: light `#8f8676`, dark `#7e7566`. It measures 3.56 / 3.58:1 on `kb-surface` and 3.22 / 3.90:1 on `kb-paper`. It does **not** reach 3:1 on `kb-surface-sunken` in light (2.97:1). A control on that ground needs a darker edge, and the reader has none there.

### 2. Compact chrome (C07)

Every threshold is the reader root's container width (`rd`, inline-size) in rem, so the browser's text zoom (the root font size) and a narrow phone get the same answer. Where each one lands:

| | 390 at 100% | 390 at 150% | 390 at 200% | 320 at 100% | 820 at 200% |
|---|---|---|---|---|---|
| Container width | 24.4rem | 16.25rem | 12.2rem | 20rem | 25.6rem |
| Chapter bar compact (under 20rem) | no | yes | yes | no | no |
| Top bar compact (under 21rem) | no | yes | yes | yes | no |
| Loose document's logo steps aside (under 14rem) | no | no | yes | no | no |

**Chapter bar, `@container rd (max-width: 19.99rem)`:**

- **Grid:** `var(--kb-tap) minmax(0, 1fr) var(--kb-tap)`. Contents stays centred whether or not there is a previous chapter, and the bar stays one row at `--rd-bot-h`.
- **Previous, Next and "The book →":**
  - each shows only its mark, centred in a `kb-tap`-wide target the bar's height, with `padding-inline: 0`;
  - the marks: "‹" for Previous, and "→" for Next and for the last chapter's way back to the book;
  - each mark is a new element, `<span class="rd-bnav__mark" aria-hidden="true">`, placed after the signed label, at 15px semibold, line-height 1, in `kb-ink`. "‹" is 1.35 times that size, so it carries the weight "→" does;
  - the mark is `display: none` outside compact.
- **Contents:** `max-width: none`, `padding-inline: kb-space-xs`. "Contents" stays. Under it, a new `<span class="rd-bnav__count" aria-hidden="true">` reads "N of M" in 13px tabular `kb-secondary`, `white-space: nowrap`, and is `display: none` outside compact. The progress line keeps the percentage.
- **The signed labels stay in the DOM, visually hidden** (`position: absolute; width: 1px; height: 1px; margin: -1px; overflow: visible; white-space: nowrap; clip-path: inset(50%)`; never `display: none`). They are `.rd-bnav__dir` in Previous and Next, and Contents' `.rd-bnav__sub`. Every accessible name stays exactly the signed one: "Previous", "Next →", "The book →", "Contents Chapter 2 of 5 · 38%".
- **The signed nodes are not split or rewrapped**, so at 20rem and up the bar is pixel-identical to the signed one. The scratch comparison of the chapter screen at 390, 820, 1024 and 1440 found 0 differing pixels.

**Top bar, `@container rd (max-width: 20.99rem)`:**

- **Display's side padding** becomes `0.5rem`. Its min-height and `kb-tap` target stay.
- **A chapter in two or more languages.** The reader root carries `rd-langs` when the chapter has two or more languages, the same condition that shows the switch.
  - `--rd-top-h` becomes `6.5rem` (on the root's child). Every offset that reads it follows: the sticky wrapper, headings' `scroll-margin-top`, the long table's sticky header.
  - The bar's grid takes rows `repeat(2, minmax(0, 1fr))`.
  - `.rd-top__end` becomes `display: contents`. Display sits in row 1, column 2; the language switch in row 2, `grid-column: 1 / -1`, `justify-self: end`.
- **The switch has two slots, so Tab and reading order follow the rows** (critique C02).
  - The bar's markup carries the one switch in two places: `.rd-lang--bar` before Display (the signed place) and `.rd-lang--row` after Display. Both draw the same options from the same state.
  - `.rd-lang--row` is `display: none`, except under 21rem on a chapter with two or more languages (`.rd-langs`), where `.rd-lang--bar` is `display: none` instead and `.rd-lang--row` takes row 2.
  - Exactly one switch is ever rendered, so one is in the tab order and the accessibility tree. A build may instead move the one node; the order is what binds.
  - Tab order at 21rem and up: skip, logo, back, language, Display (as signed). Under 21rem: skip, logo, back, Display, then the language row.
- **A one-language chapter or a loose document** keeps one row.

**Top bar, `@container rd (max-width: 13.99rem)`:** on a loose document (root class `rd-loose`) the logo is not shown. "‹ Library" goes to the same place, and without the logo the label stays whole at 200%.

**Measured** (scratch probe on 01's window row, x in px inside the 390 window):

- Chapter bar at 200%: ‹ 14–102, Contents 114–276, → 288–376. No two labels overlap. Targets are 88×88.
- Chapter bar at 150%: ‹ 11–77, Contents 85–305, → 313–379.
- Top bar at 200%, row 1: logo 14–102, "‹ Book" 114–223, Display 249–376. The language switch is in row 2, 122–376. A loose document has no logo: "‹ Library" 14–148, Display 249–376.
- Top bar at 150%, row 1: logo 11–77, "‹ Book" 85–167, Display 284–379. The language switch is in row 2, 188–379.
- Top bar at 320 at 100%: "‹ Book" 57–111, Display 249–313. "Book" is whole.
- The preview's WCAG views of 01: `text200` and `w320` name no `overprint`, no `reflow` and no `clipped`.

**Strings:** none new. Under 20rem the visible count is "N of M", while the accessible name keeps "Chapter N of M · P%".

### 3. Where each state shows

- 01 Main: the window row reaches Phone 390, text 150%, text 200% and Phone 320, with every scene preset.
- 03 Widths: the size row reaches the same in all three frames: the iPad at 200% lays out as the phone (25.6rem); the desktop at 200% keeps the wide layout (45rem).
- 06 TopStates: the row "Large text and the narrow phone".
- 07 BottomStates: the row "Large text and the narrow phone".
- 05 Foundations: the control-edge role and its contrast, in each theme.
- 16 DisplayStates: the display options with the new edge. There is no markup change.

## Intent, one line per Page (only what this round changes)

- **01 · Page — Reader (the flow).** The operator reading on a phone with large text (150% or 200%) or on a 320 px phone. They came to read a chapter and move on. First they must see the chapter, with chrome whose every label is whole and none overprints another.
- **03 · Page — The reader at 390, 820 and 1440.** The operator and the builder checking one state at the reference sizes. First they must see the same state in all three frames, now also at 150% and 200% text and with the phone at 320.
- **02 and 04:** unchanged (02 carries the `rd-langs` class; 04's bar renders the second extra row).

## The plan, and its review

- **C07, one rule set, measured on the reader's container in rem.** Chapter bar under 20rem: marks in square `kb-tap` targets, and Contents over the count. Top bar under 21rem: the language switch on a second row. 390 at 100% is 24.4rem and 320 at 100% is 20rem: the chapter bar is untouched at both, and the top bar is untouched at 390.
- **Control edge:** `--rd-control-edge`, the value of `kb-hint` in each theme, on `.rd-btn--secondary`, `.rd-lang` and `.rd-opt`.
- **Prototype:** a window row on 01's bar and a size row on 03's bar. Text size is the root font size, as the browser's text zoom sets it.
- **Components:** 06 and 07 each gain one row; Foundations gains the role.

**What the review changed before and while building:**

- **Rejected a second row for the chapter bar.** At 200% it would make the chrome nearly half the phone, together with the top bar's own second row.
- **Rejected moving the language switch into the Display sheet.** The language belongs to the chapter, not the device, and the sheet says "Saved on this device".
- **Rejected a new hex for the edge** one step off `kb-hint` (1.01:1 from it, a near-miss).
- **Rejected a 44 px logo box under compact.** It fitted only the root-font zoom and broke under page zoom (Safari's text size). The bars are now in rem throughout, and the one case that did not fit (a loose document's "‹ Library" at 200%) steps the logo aside instead.
- **Rejected wrapping the signed labels in spans.** Splitting "Next →" moved its glyphs by a subpixel at 390 (10 px differed). The signed nodes stay whole; compact-only marks are added beside them.

## Pages, Components, Directions

- **Pages:**
  - 01 Main: the window row, the phone window and its caption;
  - 03 Widths: the size row, captions that name the size, and the phone cell held at 390 so nothing moves;
  - 02 Reader: the root class `rd-langs`, and the bar's second extra row;
  - 04 Elsewhere: the bar's second extra row.
- **Components:**
  - 05 Foundations: the control-edge role and its check, in each theme;
  - 06 TopStates and 07 BottomStates: one new row each;
  - 19 ReaderTop: a `loose` prop, the classes `rd-langs` / `rd-loose`, and the language switch's second slot after Display (C02); standalone, its frame now holds the bar in flow, so a two-row bar grows the frame (the same pixels at one row);
  - 20 ReaderBottom: the marks and the count.
- **Directions:** none.

## Data

Unchanged: the signed `reader.js` seeds (the maintainer guide, Tidewater's 20 chapters, the loose documents) and `flow.js`'s scenes. No new data, no placeholders, no personal data.

## Component and token gaps

- **G1, token gap:** the system has no control-edge token. `--rd-control-edge` is reader-scoped and resolves to `kb-hint`. The D45 sync decides whether it becomes a `kb` token, and whether a control on light `kb-surface-sunken` (2.97:1) needs a darker one.
- **G2, the system's selected tint under 3:1** (the preview's blocking `non-text-contrast`). Logged, not restyled.
  - `kb-accent-soft` measures 1.24 / 1.47 / 1.25:1 on surface (light / dark / sepia). It marks Contents open (`rd-bnav[aria-expanded]`), Display open (`rd-tbtn[aria-expanded]`) and the current chapter in the chapter list (`a.rd-ch`).
  - It is the kb README's rule ("a selected row or active pill takes the `kb-accent-soft` tint with `kb-accent-strong` text"), signed here and shared across the product.
  - Each of these states also has another cue: the label's colour, the open sheet, and the current row's own marks.
  - The handoff scopes the 3:1 work to bordered controls, so this goes to D45, beside G1.
- **G3, a canvas-only reading:** the scrim (`button.rd-scrim`, `tabindex="-1"`) measures 2.54 / 2.34:1 on 03 only.
  - In the product it covers the whole viewport, which the check exempts.
  - On 03 it covers one 390 px frame of a 2794 px board, under the check's quarter-viewport exemption.
  - Not a defect.

## States reached only by interaction

- Hover on the secondary button, the display options and the language options (an accent border, a sunken fill).
- Focus rings.
- The 2-row top bar's tab order, by Tab on 01 at Phone 320: logo, back, Display, then the language row.

None needs a prop.

## Departures from the handoff

- **D1:** the chosen language option gains a 1px `kb-accent` border.
  - Its signed accent-soft fill measured 1.24:1, which the preview counts as the option's boundary and blocks on.
  - The handoff puts the language switch's states in play ("pressed and selected states distinguishable … at ≥ 3:1"). This is the smallest change that reaches 3:1, and it matches the display option's pressed look.
  - At rest the switch is pixel-identical to signed except its outline colour.
- **D2:** the window and size rows are canvas chrome, the handoff's "presets" drawn as one extra row per board, like 03's signed theme row. Main also offers "Phone 390" at 100% as the comparison base.

## Open questions, for the operator

- **Q1** (posed back by the handoff): how should the chapter bar adapt at 150–200% text?
  - **Drawn and recommended: shorten to the marks.** ‹ and → in square targets, Contents over "N of M". One row at the same height. Every accessible name is the signed one. The cost: the words "Previous" and "Next" and the percentage are not on screen under 20rem; the progress line shows the percentage.
  - **Wrap** (labels wrap inside their cells): at 200% each side cell is about a quarter-inch wide, so "Previous" breaks mid-word. It does not hold.
  - **A second row** (Previous and Next over Contents): it keeps every word, but doubles the bar to about 240 px of 844 at 200%. With the top bar's second row, the chrome takes close to half the screen whenever it shows.

## Signed canvas behaviour, decided as drawn

- **S1:** 03 keeps a state bar in each frame, as signed in round 02 (its critique's 2b note). `design-check` and the preview name it (`check=state-bar`, one bar above all the windows). This round adds a row to that bar and does not move it.
- **L1:** the preview's `check=layout-shift` lines on 01 and 03 have two sources:
  - **Signed scrolling:** a scene or a jump scrolls the page, and the sticky top bar goes from under the state bar (y 91) to the top (y 3). That is the bar scrolling away (bar rule 1), not a shift.
  - **The device presets:** the window, width and text-size presets change the bars' size by design (Display 70 → 64, Previous 106 → 71).
  - 03's phone cell now keeps 390 px, so Phone 320 no longer moves the iPad and desktop frames.

## Observation for the orchestrator

- **O1:** `05-annotations`' `.an-filter` (`annot.css`, also drawn in `08-review`) has the same 1px `kb-border-strong` outline around a switch (1.58:1). It is not this job's part; it could take `--rd-control-edge` in its own round.
- **Downstream check:** with the new edge, 04-quiz's `.qz-opt` and 08-review's rating buttons (`rd-btn.rv-rate`) were read. Their selected, correct and wrong rings (2px accent, active or revoked) stay distinct from the darker 1px rest edge. Nothing looks wrong, so no round is needed there.

## Render log

- **Pass 1** (all 31 boards, `--click`): 94 states, `self_check=fail blocking=non-text-contrast:5`.
  - Fixed:
    - the frames of 05, 06 and 07 were too short (2352, 1013, 923);
    - the hidden Contents sub read as `clipped`, because it hid its overflow (now `overflow: visible`);
    - the chosen language's 1.24:1 fill (D1);
    - "Phone 390 · text 200%" merged with "text 150%" (a caption now tells them apart);
    - 03's Phone 320 moved the iPad and desktop frames.
  - Left: G2, G3, S1 and L1.
- **Scratch checks** (probe in the session scratchpad, never the record):
  - before and after at 390 (100, 150, 200%) and 320;
  - a pixel comparison with the signed tree at 100%: chapter bar 0 px different at 390, 820, 1024 and 1440; top bar different only on the language outline.
- **Pass 2** (`--board` for Main, Reader, Widths, Foundations, TopStates, BottomStates, DisplayStates, ReaderTop and ReaderBottom, with `--click`). The last line still reads `self_check=fail blocking=non-text-contrast:4`; all 4 are the logged gaps G2 and G3.
  - Every frame's `content=` matches its `h`.
  - The chosen language no longer appears in any line. No `clipped` line remains.
  - Main reaches all four window states (22–25). Its `text200` and `w320` views name no overprint, reflow or clipping.
  - TopStates and BottomStates show every large-text state whole ("11 of 20" included).
  - The 4 that remain: the `kb-accent-soft` fill on the current chapter row, in light, dark and sepia (G2), and 03's scrim (G3).
  - The other check lines: `state-bar` on 03 (S1), and `layout-shift` from the signed scrolling and the device presets (L1).
- **After pass 2:** the window caption on 01 fell back to the browser's serif, because the flow board sets no font. It now takes Source Sans 3 (seen on the pass-3 PNGs).
- **Pass 3, the critique pass** (`--board` for Main, Reader, Widths, TopStates, BottomStates and ReaderTop, with `--click`): 94 states, `self_check=fail blocking=non-text-contrast:4`.
  - The 4 are the logged gaps: `a.rd-ch`'s accent-soft fill in light, dark and sepia (G2) and 03's scrim (G3). The chosen language ("English", 1.24:1) is gone from every line, 06's included.
  - 06 and 07 render the 150% cells as before, nothing clipped, with the stage holding the scaled bar; every frame's `content=` matches its `h`.
  - Main's states 22–25 reach every window preset; their bars and the switch's row 2 sit where pass 2 drew them.
  - A scratch Tab probe on 02 at 390 (100, 150, 200%) and 320: at 100% on 390 the order is logo, back, English, 한국어, Display, as signed; in the three compact cases it is logo, back, Display, English, 한국어, with one switch rendered and no sideways scroll.
- `design-check 01-reader`: OK, 5 warnings: S1, and four absolute paths in the earlier rounds' signed handoffs and critiques, which this round does not write.

## Critique pass 01

Mode `critic`, so nothing was held for a judge.

- **C01** (must-fix, TopStates "Phone 390 · text 150%"): fixed. The chosen language's edge was drawn (one device pixel of `kb-accent`), but `zoom: 1.5` reports a 1px border as 0.67px, so the check measured the fill. The 150% cells on 06 and 07 now lay the bar out at 260 px (16.25rem) and scale it by 1.5 with a `transform`, in a stage that holds the scaled height. The 200% cells keep `zoom: 2`, which measures. Pass 3: no line names `rd-lang` on any board. The result's claim is corrected in `## Build` §1, and the canvas-only note says how the cells are drawn.
- **C02** (must-fix, low confidence, the compact top bar's Tab order): fixed. The switch now has two slots in `ReaderTop`: `.rd-lang--bar` before Display (the signed place) and `.rd-lang--row` after it. Under 21rem on a two-language chapter only the second renders, in row 2, so Tab and reading order are logo, back, Display, then the language row. From 21rem only the first renders, so the signed order, DOM and look are unchanged. The rule is in `## Build` §2.
- **C03** (choice, wave): no change here, and it goes to the operator. 01 and 06 draw option A (a 3:1 outline, and the chosen option takes a 1px accent edge). Fill-only fails at 1.24:1 as measured. `05-annotations`' `.an-filter` is already logged as O1.
- **G1, G2** (gaps): already logged, unchanged.
- **N1–N3** (2b notes): the operator's. N2 and N3 are the costs of Q1's recommendation and the loose document's logo rule, as logged.
