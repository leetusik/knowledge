# P39-hk.F1 — result

## Verdict (final, after round 2)

- **status:** done
- **route:** high
- **model:** opus
- **effort:** xhigh
- **summary:** Bounded the phase's no-wrap runs to their line, in two rounds.
  - **Round 1.** A kept hyphenated run wider than its whole line breaks inside (F36's rule, measured `is-wide`). An inline formula wider than its line scrolls in its own box (F7's rule).
  - **Round 2, the operator's "fix everything now."** A legend symbol wider than the legend's row scrolls in its own box in the symbol column (OQ19, F7's rule). The display formula box's fade is now the tables' overlay instead of a mask, so its focus ring shows (OQ12).
  - Every run that fits renders as before, the display box's fade at rest within 2/255 inside its 2.5rem strip. Paper is unchanged. F1's cases 1–9 and the added legend case pass.
- **files_changed:**
  - `web/src/app/reader-aids.css`
  - `web/src/app/kb-print.css`
  - `web/src/lib/native/render.tsx`: `inlineMath` wraps the formula in `InlineFormula`; `formula()` wraps each legend symbol in `LegendSymbol`; `keepText` changed in its doc comment only
  - `web/src/components/reader/formula-box.tsx`:
    - `FormulaBox` gains its `.ra-mb__box` frame and `Fades`
    - new: `InlineFormula`, `LegendSymbol`, the shared `useFit`, `lineOf`, `lineWidth`
  - `web/src/components/reader/math-layer.tsx`: `fitKeeps` and its triggers; `fitLegends` measures the `math` inside the symbol's box
  - `web/src/components/reader/scroll-box.tsx`: `Fades` (the two fade spans), shared and used by `TableBox` and `ArtBox` with identical output
  - `works/phases/active/P39-hk/slices/P39-hk.F1/result.md`
  - `works/phases/active/P39-hk/phase.md`, written only through `phase-section`
- **validation:**
  - `pnpm --dir web typecheck`: pass
  - `pnpm --dir web lint`: pass
  - `pnpm --dir web exec vitest run tests/native-render.test.ts tests/native-math.test.ts tests/native-terms.test.ts tests/reader-anchor.test.ts tests/csp.test.ts`: pass (5 files, 284 tests). The full suite also passes (40 files, 583 tests).
  - The standalone `next build` in a scratch copy: pass (exit 0). Round 2 served on `:3964`.
  - The sweep: pass. Round 1's whole matrix, re-run on the final build; OQ19 at 390 and 320 with 200%; OQ12 in light and dark; the tables' fades; paper. Instruments: headless Chrome 156 over CDP, and Claude in Chrome through the iframe harness.
  - `python3 scripts/workflow.py validate`: pass
- **deviations:**
  1. **The inline box keeps its mask fade; only the display and symbol boxes take the overlay.**
     - An inline formula sits on any ground: a callout's sunken or translucent one, a table header's, a window's. An overlay paints the page's ground (`--kb-surface`), so it would show a band of the wrong colour there.
     - A display formula, and so its legend, sits only on the page's ground, because the grammar refuses a typed block inside a list, quote or callout.
     - The inline box already shows its ring: round 1 draws it on the outer span, outside the mask. All three boxes now show their ring.
  2. **The symbol box's fade is the display box's 2.5rem, capped at a third of the box (`min(2.5rem, 33%)`).** In the 28% column of a phone at 200% (90 px), an 80 px fade hid the symbol it cues. The display and inline boxes keep their full 2.5rem.
  3. **`math-layer.tsx` and `formula-box.tsx` carry the keeps' measurement**, as in round 1.
  4. **At 320 with 200% text the page is 348, not 320.** P30's chapter-end "Back to the book →" causes it, the same on the build before F1. F3 now bounds it.
- **doc_impact:**
  - round 1: `**(P39-hk.F1)** product.md, architecture.md, qa.md: a kept hyphenated run wider than its whole line breaks inside …; an inline formula wider than its line scrolls in its own box …; qa: P30's text-size line passes on the chapter again (ko 390 @ 200%: 401 → 390).`
  - round 2: `**(P39-hk.F1 round 2)** product.md, architecture.md: a legend symbol wider than the legend's row scrolls in its own box in the symbol column (LegendSymbol, region "Formula, scrolls sideways"), and the display formula box's fade is the tables' overlay (Fades, .ra-mb__box) instead of a mask, so its focus ring shows (OQ12); paper unchanged.`
- **notebook:** written through `phase-section`:
  - Decisions: "No-wrap runs bounded (F1)" (round 1) and "Legend box and overlay fades (F1 round 2)"
  - Operator Questions: OQ18 (round 1). No new question in round 2: OQ12 and OQ19 were already resolved on disk.
  - Doc impact: the round 1 line and the round 2 line
  - Notes for later slices: the F1 note for REVIEW, replaced
  - Now: rewritten, ending "Next: F2"
- **operator_need:** none

## Round 2 (after the operator's "fix everything now.": OQ19 and OQ12)

### Mechanism

- **OQ19, the legend symbol (F7's display rule).** `formula()` puts each `dt`'s formula in `LegendSymbol`, a client box that shares round 1's measurement (`useFit`).
  - **Where the symbol fits** (every fixture symbol, every size), the box is two plain inline spans. The server render has 17 such pairs and no fades.
  - **When the symbol is wider than the legend's row** (the legend's content box, less the gap before the meaning), the box turns `is-over`:
    - it is `display: block; width: 0; min-width: 100%`, so it drops its claim on the `minmax(max-content, …)` track;
    - the column is then what the other symbols and the signed maximum `min(k em, 28%)` make it;
    - the formula scrolls inside a box that wide, with the tables' overlay fades and a scroller that reaches 0.25em past the line;
    - the scroller is `tabindex=0`, `role=region`, labelled "Formula, scrolls sideways" / "수식, 옆으로 스크롤됩니다", with a 2 px accent ring on focus.
  - **`fitLegends`** measures the `math` inside the box, not the box. A box that scrolls is the column's width, and `--ra-sym-k` must not shrink to it.
  - **Paper** resets `.ra-ms` and `.ra-ms__s` to plain inline, beside round 1's `.ra-mi`. The fades are hidden with every screen cue.
- **OQ12, the display box's ring.**
  - `FormulaBox` now renders `div.ra-mb__box` (position: relative) around the unchanged `div.ra-mb__eq`. While the box scrolls, it adds `Fades`, the two `kb-ch-fade` spans, now exported once from `scroll-box.tsx` and used by `TableBox` and `ArtBox` with identical markup.
  - The display box's `mask-image` rules are gone. The overlay takes the mask's 2.5rem width, sits only on the side with more (`.ra-mb__eq.is-more-* ~ .kb-ch-fade--*`), and has square ends.
  - The ring (`.ra-mb__eq:focus-visible`, 2 px accent, 2 px offset) is no longer clipped.
- **The three boxes and their rings:**
  - **display box:** overlay fade, ring on the scroller;
  - **symbol box:** overlay fade (capped at a third of the box), ring on the scroller;
  - **inline box:** round 1's mask, ring on the outer span, outside the mask.
  - All three show their ring (deviation 1).

### Sweep (final build `:3964`; before = HEAD `:3961`, round 1 = `:3963`)

**Round 1's matrix again:**
- Cases 1–9 (`cases.mjs`): identical to round 1's after column.
  - Pages: ko 390 @ 200% is 401 → 390; 320 @ 200% is 348 (P30's button, F3); en 390 @ 200% is 390; ko 320 @ 150% is 320; the long-inline probes 477/477/477/954 → 390/320/390/390, boxed.
  - No keep or formula runs past its line, and no errors.
- Pixel identity where a run fits (`pixel.mjs`, HEAD `:3961` vs `:3964`, 12 sizes):
  - Layout is identical at all 12 sizes, and the PNGs are byte-identical at 8.
  - The 4 others are 320/100% (en, ko) and 390/150% (en, ko), where a display box scrolls. Every differing pixel sits inside the display box's 2.5rem fade strip (x 526–605 and x 610–728 device px), at most 2/255 per channel (`pxcols.mjs`): mask and overlay blend the same ramp with different rounding.

- **Windows and the phone sheet** (`sheet2.mjs`; HEAD vs final; en and ko at 390 with 200% and 150%, 820 with 200%, 1440 with 100%): identical to round 1.
  - At 390/200%, no keep runs past its line or into Close (before: three and two).
  - ko goes from 401 to 390.
  - Window heights, spacers and the 32 px gap are unchanged.
- **Probes, all as in round 1:**
  - a long hyphenated term breaks inside its column, with its dotted underline on every line, and a tap opens its window;
  - an over-wide formula in a closed window boxes when it opens.
- **Anchors and marks:**
  - all 8 containers project identical text before and after (en 1690 and ko 1070 chars, at 1440/100% and 390/200%);
  - an injected `mark.an-m` paints in a keep that fits and in one that breaks.
- **Errors:** `rocheck`, en and ko: no window `error` event, so no ResizeObserver loop, and no console errors.
- **Inline box ink (`clipchk.mjs`):** max delta 1, so no clipping.

**OQ19, the legend symbol** (`symbox.mjs`, DOM probe: the widest symbol `P(no event)` three times over, 530 px, 14.7 em):

| Case | Page | Column (symbol box) | Scroll | Region | Baseline |
|---|---|---|---|---|---|
| en 390 200% light / dark | **390** (before: 624) | 90 px of a 323 px legend (28%); the other four rows 90 | `scrollLeft` 440 of 440, the fade flips to the start; ArrowRight +40; page `scrollX` 0 | `role=region`, "Formula, scrolls sideways", `tabindex=0`; Tab gives `:focus-visible` and a 2 px ring, rgb(15, 111, 102) light, rgb(98, 189, 178) dark | symbol 431.4 = meaning 431.4 |
| ko 390 200% light / dark | **390** | 90 | 440 of 440 | "수식, 옆으로 스크롤됩니다", ring | 430.5 = 430.5 |
| en 320 200% light / dark | 348 (P30's button, F3); the box ends at 104, inside the legend's 286 | 71 of 253 | 459 of 459 | ring | 505.4 = 505.4 |
| ko 320 200% light | 348, as above | 71 | 459 of 459 | ring | 504.6 = 504.6 |
| en 1440 100% | 1425 | the symbol fits: no box, no role | — | — | — |

- Without the probe, at 390/200% the `P(no event)` column is 177 px (its own width), as before.
- The fades are 30 px (23 at 320), a third of the box (deviation 2), and cover the scroller's height (72 px).
- Claude in Chrome (agent profile, `deviceId c14e5b18-…` selected first; iframe harness `:3960 → :3964` at a true 390×844, ko, root font 200%, the same probe):
  - page 390, `scrollX` 0;
  - the box is `is-over` with region and label, in a 90 px column;
  - Tab from the display box above reaches it with `:focus-visible`, and the screenshot shows the ring.

**OQ12, the display box's ring** (`oq12.mjs`, every scrolling display box; light and dark through `prefers-color-scheme`):
- **At rest**, against round 1 (the mask) at 320/100% (`poisson`) and at 390/200% (two boxes), en and ko: every differing pixel sits inside the fade strip (x 501–660 device px at 390/200%), at most 2/255 per channel.
  - Ten crop pairs. Light and dark use the ground `rgb(255, 254, 250)` / `rgb(35, 32, 25)`.
  - The fade spans are 40 px at 100% and 80 px at 200% (2.5rem), with no radius, on the side with more only.
- **Focused:** Tab from the term before reaches the box: `:focus-visible`, outline 2 px solid, rgb(15, 111, 102) light and rgb(98, 189, 178) dark, offset 2 px.
  - The crops show the full ring on round 2 (`r2/r2-en320-100-dark-ring-3.png`), and none on round 1 (`r2/r1-…-ring-3.png`, the mask clipped it).
- **Claude in Chrome** (harness `:3960 → :3964`, 320×844, en): Tab from "probabilistic Sharpe ratio" focuses `poisson`'s box (`mask-image: none`, outline rgb(15, 111, 102) solid 2px), and the zoomed screenshot shows the ring on all four sides.
- **Inline box** (`ring.mjs`, 390, light and dark): `:focus-visible`, the ring on the outer span, 2 px, rgb(15, 111, 102) / rgb(98, 189, 178), offset 2 px.

**Tables' fades unchanged** (`tablefade.mjs`, all-blocks at 320, HEAD vs final):
- The state of every table and drawing box (classes, fade spans, display, opacity, width, radius, gradient) is identical. This holds at rest and with the table widened by a DOM probe, so it scrolls and shows its fades.
- The crops of the drawing and of the widened table are byte-identical.

- **The 12-width sweep and P30's text-size line** (`sweep.mjs`, run alone): reading-aids en and ko, write-lock and `/documents/7`, at 12 widths from 320 to 1920. No inner vertical scroller and no wide page.
  - Text size 150% and 200% at 390 and 820, en and ko, light and dark: the page is 390 at 390 and 805 at 820 in all 16 runs.
  - No errors.

- **Paper** (`paper.mjs` and `papercmp.sh`, HEAD vs final): A4 and Letter, en and ko, 6 pages each, all identical at 100 dpi.
  - A page with every keep `is-wide` and every inline and symbol box forced `is-over` prints identically to the clean one.
  - Widest keep on paper: 141 px (en) and 145 px (ko) of 552; widest inline formula: 89 px.

- **Validation:** typecheck, lint, the five test files (284) and the full suite (583) pass; the standalone build exits 0; `validate` passes.

### Stack as run (round 2; all stopped at the end)

- **Started by me:**
  - headless Chrome on `:9341`
  - standalones: HEAD on `:3961`, round 1 on `:3963`, final on `:3964`
  - `next dev` on `:3962`
  - the harness proxy on `:3960`
- **Never touched:** `:3030`, `:8766`, `:8977` (read only) and `:3978`.
- **Claude in Chrome:** one tab of my own, closed. I set no cookie or setting.
- **New scripts** (in the scratchpad folder above): `oq12.mjs`, `oq12all.sh`, `symbox.mjs`, `symfit.mjs`, `tablefade.mjs`, `pxcols.mjs`, `r2sweep.sh`, and their outputs in `r2/` and `r2px/`.

## Round 1's verdict (superseded)

Round 1 returned `needs_operator` on OQ19, the legend symbol wider than the whole legend; its block is in commit 28a66b82. The operator answered "fix everything now." (`intent.md` § *Added at review*), and round 2 closed OQ19 and OQ12. The sections below are round 1's log, unchanged except for headings and the Chrome version, which is 156, not 142.

## Round 1: mechanism (Decisions has the gist)

**The rule:** a run that fits stays whole, as signed. Only a run wider than its whole line may break or scroll in its own box, and the page never scrolls sideways.

- **Kept runs (F22, bounded by F36's precedent).** `keepText`'s markup is unchanged: one `span.ra-keep { white-space: nowrap }`.
  - `MathLayer`'s new `fitKeeps` runs on hydration, on font load, on a text-size class, a frame after a window resize or a reflow of the chapter (a `ResizeObserver` on `.kb-ch`), and at once when a window, sheet or longer definition shows (a `MutationObserver` on `hidden`).
  - It removes `is-wide` from every run, reads them all in one layout, and puts `is-wide` back on each run wider than its line's content box (`lineOf`: the nearest non-inline ancestor).
  - `.ra-keep.is-wide { white-space: normal; overflow-wrap: break-word; }` lets such a run break at its hyphen first, and inside a word only if a piece is still too wide.
  - A run that fits never gets the class, so nothing about it changes.
- **Rejected, CSS only:**
  - **(C') Joint spans.** `.ra-keep` breakable, with nowrap `.ra-keep__j` joints around each hyphen. The pixel compare showed the term's dotted underline restarting its dot phase at each text-node split, a doubled dot under "t-s|tatistic", plus up to 0.04 px of LayoutUnit drift per item. Reverted.
  - **(A) An inline-block keep** (`max-width: 100%`, `overflow-wrap`). In ko at 1440 the particle 으로 wrapped away from t-통계량: an atomic inline opens break opportunities around itself, which breaks F22. Also, `text-decoration` does not reach into an atomic inline.
  - `hyphens: none` and `word-break: keep-all` do not stop the break after a hyphen. `nowrap` blocks every `overflow-wrap` emergency break.
- **Inline formula (F7's display rule).** `inlineMath` returns `<InlineFormula label="Formula, scrolls sideways">` (ko "수식, 옆으로 스크롤됩니다") around the same `math.ra-m`.
  - It measures the formula against its line on mount, on font load, on resize, through a `ResizeObserver` on the formula and its line block, and on its own scroll.
  - Where the formula fits, it renders two plain inline spans with no class, role or tabindex, and the server render and first client render agree.
  - When the formula is over: the outer span is `inline-flex; max-width: 100%; vertical-align: baseline` (the baseline is kept). The inner span scrolls (`overflow-x: auto`), takes the display box's `is-more-start` / `is-more-end` mask (selectors shared through `:is(.ra-mb__eq, .ra-mi__s)`), and becomes `tabindex=0 role=region` with the label.
  - The scroller reaches 0.25em past the line above and below and gives it back in its margins, so a radical's point and a superscript are not clipped and the line keeps its height.
- **The focus ring (and OQ12).** The ring is drawn on the outer span (`.ra-mi:has(> .ra-mi__s:focus-visible)`: 2 px accent, 2 px offset), outside the mask. So the inline box does **not** inherit OQ12's clipping. OQ12, the display box's own ring, is untouched and stays the operator's question.
- **Paper (`kb-print.css`).** The screen measure does not run for print, so paper resets both states:
  - `.ra-mi` and `.ra-mi__s` are plain inline, unmasked and visible, just as the display box drops its scroll box on paper;
  - `.ra-keep.is-wide` is `nowrap` again.
  - The widest keep on paper is 141 px (en) and 145 px (ko) of the 552 px column, and the widest inline formula is 89 px. A page a phone left in the wide state prints identically to a clean one.
- **Without script:** an over-wide run still overflows, as before F1. Server output is unchanged.

## Round 1: acceptance matrix (F1's table, before → after)

**Instrument and method:**
- Headless Chrome 156 over CDP (`--disable-features=OverlayScrollbar`): mobile emulation, DPR 2, touch, the root font set as P30's line says.
- Before: the standalone build of HEAD, without F1, on `:3961`. After: the standalone build with F1 on `:3963`. Both read the review's API on `:8977`.
- "Line" means the content box of the run's line block.

| # | Case | Before | After |
|---|---|---|---|
| 1 | ko, 390, 200% | page **401**; `CONDITIONAL-GO의` 368 px in a 323 px line (+45) | page **390**; it breaks "CONDITIONAL-" \| "GO의", right edge 44 px inside the line. **Pass.** |
| 2 | ko, 320, 200% | page **401**; +115 | runs in their column (it breaks at the hyphen, 9 px inside). Page **348**, from P30's "Back to the book →" (outside the boundary, deviation 3). **Pass for F1.** |
| 3 | en, 320, 200% | page **390**; `CONDITIONAL-GO’s` +104, `stitched-together` +42 | "CONDITIONA" \| "L-GO’s" ("CONDITIONAL-" alone is wider than 253 px) and "stitched-" \| "together", both inside the line. Page 348, as in case 2. **Pass for F1.** |
| 4 | en, 390, 200% | page 390; the keep runs 34 px into the gutter | page 390; "CONDITIONAL-" \| "GO’s", 44 px inside. **Pass.** |
| 5 | ko, 320, 150% | page 320; +8 | page 320; it breaks at the hyphen, 59 px inside. **Pass.** |
| 6a | a long inline formula (DOM probe: the `λ = rate × time` atom four times over), en, 390, 100% | page **477**; the formula is 460 px in 356 (+104) | page **390**; the formula is boxed, right edge at the column, `role=region`, `tabindex=0`, labelled. **Pass.** |
| 6b | the same, en, 320, 100% | page 477 (+174) | page 320, boxed. **Pass.** |
| 6c | the same, ko, 390, 100% | page 477 | page 390, boxed, labelled "수식, 옆으로 스크롤됩니다". **Pass.** |
| 6d | the same, en, 390, 200% | page **954** (+597) | page 390, boxed, and the keep breaks too. **Pass.** |
| 6e | the same, en, 1440, 100% | page 1425 (it fits) | 1425, no box. **Pass.** |
| 7a–g | en and ko at 100% (320, 390); 150% at 390 (en, ko) and at 320 (en) | pass (page equals the viewport) | the same, nothing wide, nothing boxed. **Pass.** |
| 8 | legend `dt` column, the term window and sheet, paper | pass | pass. Window and sheet: see *Windows*. Paper: see *Paper*. Legend: the fixture's symbols fit at every size, and so does `--ra-sym-k`. |
| 9 | 820 at 150% and 200%, en and ko | 805 of 820 (the classic scrollbar) | 805. **Pass.** |
| **+A** | **added: a legend symbol wider than the whole legend** (DOM probe: `P(no event)` three times over, 14.7 em), 390, 200% | page 624 | **still 624: fails.** The grid's symbol track is `minmax(max-content, …)` and `dt` is `nowrap`. The legend holds 9 em of symbol at 390/200%, 7 em at 320/200% and 10 em at 320/150%. The fixture's widest symbol is 4.9 em, and the same probe at 390/100% fits (page 390). See OQ19. |

## Round 1: the rest of the sweep

- **Pixel identity where a run fits.** I took full-page PNGs and the layout of every keep, formula and `dt` (before `:3961`, after `:3963`) at en and ko × 1440 100%, 1728 100%, 390 100%, 320 100%, 390 150% and 820 200%.
  - All 12 are byte-identical PNGs with identical layout.
  - The keeps are unbroken at 1440 and 1728: t-statistic, walk-forward, out-of-sample, look-ahead, per-event, CONDITIONAL-GO’s, stitched-together; in ko t-통계량, t-통계량으로, CONDITIONAL-GO의.
  - Baselines are unchanged by construction, since the layout is identical. An over box keeps the baseline (inline-flex, its scroller the first-baseline item).
- **Ink in an over box.** The over box and the same formula unboxed, compared:
  - `t = s × √n` and `(∑e)² ÷ ∑e²`: max channel delta 1 (raster noise). The radical's point and the superscript are not clipped.
  - `e^(−λ)`: identical glyphs. The only difference is the previous line re-wrapping under `text-wrap: pretty`.
- **The inline box in use** (Claude in Chrome on the agent's profile, through the iframe harness `vp_proxy.py :3960 → :3963`, a true 390×844 frame; case 6 as a DOM probe):
  - Before focus: `ra-mi is-over`, `ra-mi__s is-more-end`, `role=region`, label "Formula, scrolls sideways", page 390.
  - Tab from the previous term focuses it with `:focus-visible`, and the outer box shows `rgb(15, 111, 102) solid 2px`, visible in the screenshot.
  - A sideways wheel scrolls the box to its end (`scrollLeft` 104 of 104), the fade moves to `is-more-start`, and the page stays at `scrollX` 0, width 390.
  - The extension's ArrowRight key left `scrollLeft` at 0 there. Over CDP, ArrowRight sent to the focused box did scroll it, so the keys reach the region.
  - With text that follows: the comma or a ko particle after an over formula starts the next line, the same class as OQ14.
- **Case 1 in Claude in Chrome** (same harness, ko, root font 200%): page width 390, and a sideways wheel leaves `scrollX` at 0. The zoomed screenshot shows "CONDITIONAL-" | "GO의 1.5에는" inside the column.
- **Windows and the phone sheet.** Each of the 12 terms, opened and expanded (CDP; before vs after): en and ko at 390 with 200% and 150%, 820 with 200%, and 1440 with 100%.
  - en 390/200%, before: three keeps ran past their line (Out-of-sample +47, CONDITIONAL-GO’s +34, Walk-forward +39), and two names ran into Close (+28, +20). After: none. Those three get `is-wide`, and the names break as "Out-of-" | "sample".
  - ko 390/200%: CONDITIONAL-GO의 +34 → none, page 401 → 390.
  - Every window's height, every sheet spacer and the gap above the sheet are identical before and after (32 px, 1rem at 200%).
  - Probes: a too-wide keep put into a closed window gets `is-wide` by the second frame after opening, and the gap stays 32. An over-wide formula put into a closed window turns its box on when the window opens; the page stays 390 on the phone, and at 1440 the box sits inside the window (570–985 in 553–1001).
- **A term with a hyphen** (CDP; probe: t-statistic's kept text lengthened to "t-statistic-of-the-whole-record", ko "t-통계량-전체-기록의-통계량"; 390/200%):
  - The run gets `is-wide` and breaks inside the column (right edge 319 and 260 against 356).
  - The dotted underline continues on every line (computed `underline dotted`; crop `look/termwide-en.png`).
  - A tap opens its window, 32 px below the last line, and the page stays 390.
  - Before F1, the same probe gave a page of 562.
  - In en the greedy line puts "t-" at the end of the line before. That is the normal first break chance once a run may break, and it shows only when the run is wider than the line.
- **Annotation marks.** An injected `mark.an-m` around a keep's text paints the highlight (`rgb(245, 220, 138)`, inset edge) in a term that fits (en 1440, t-statistic) and in a wide, broken glossary keep (ko 390/200%, CONDITIONAL-GO의, on 2 lines). The term's ink and underline colour are unchanged.
- **The anchor projection** (the live page, read by `anchor.ts`'s rules: text nodes, `data-an-skip`, `data-an-len` atoms, `<br>`): all 8 containers give identical text before and after, in en (1690 chars) and ko (1070) at 1440/100% and at 390/200%, where the after build has a wide keep. `reader-anchor.test.ts` stays green, unchanged.
- **The 12-width sweep (P30's no inner scroller):** reading-aids en and ko, write-lock and the loose note `/documents/7`, at 320, 360, 390, 480, 640, 768, 820, 1024, 1280, 1440, 1600 and 1920 (CDP, run alone). No inner vertical scroller and no wide page, after F1 and before it.
- **P30's text-size line** (CDP, run alone; reading-aids en and ko; 390 and 820; 150% and 200%; light and dark through `prefers-color-scheme`, background `rgb(255, 254, 250)` and `rgb(35, 32, 25)`): after, the page is 390 at 390 and 805 at 820 in all 16 runs. Before: ko 390 @ 200% was 401 in light and dark.
- **Paper** (CDP `Page.printToPDF`, rendered at 100 dpi by `pdftoppm`, compared page by page):
  - A4 and Letter, en and ko, before vs after: 6 pages each, every page identical.
  - A page with every keep forced `is-wide` and every inline box forced `is-over`, printed: identical to the clean page.
  - A long inline formula printed (probe: six atoms): it prints inline, with no box and no fade.
  - Widths as above (keeps ≤ 145 px of 552, formulas ≤ 89 px).
- **Console and errors:** no exceptions or console errors on any CDP load.
  - `rocheck`, en and ko at 390: the root font goes 200 → 150 → 100 → 200%, then the long-formula probe is added and removed, then the size is reset.
  - No window `error` event at any step, so no ResizeObserver loop.
  - The states follow, as wide/over/page: 1/0/390, 0/0/390, 0/0/390, 1/0/390; the box on (390), then off (390); after the reset 0/0/390.

## Round 1: observations outside the boundary (deferred-job candidates, not F1)

1. **"Back to the book →" at 320 with 200% text.** P30's chapter-end `.rd-btn` is `nowrap` and 315 px wide, so its right edge sits at 348 and the page is 348. It measures the same on the build before F1. The file that renders it and `reader.css` are not in `phase-scope`.
   - Title: "Chapter-end button wider than a 320 px phone at 200% text".
   - Trigger: the next P30 reader pass, or the review's pre-existing-overflow job, which it joins (the book page's tag at 448 and write-lock's "Show answer" at 397).
2. **The reader's loading skeleton at 390 with 200% text is 418 wide** (`rd-top` 418, `rd-tbtn` at 404, `rd-sk__meta`). I saw it only when a headless tab loaded in the background beside another, so the chapter had not rendered. A visible tab never showed it, so it is noted only.

## Round 1: validation log

| Command | Outcome |
|---|---|
| `pnpm --dir web typecheck` | pass |
| `pnpm --dir web lint` | pass |
| `pnpm --dir web exec vitest run tests/native-render.test.ts tests/native-math.test.ts tests/native-terms.test.ts tests/reader-anchor.test.ts tests/csp.test.ts` | 5 files, 284 tests pass |
| `pnpm --dir web exec vitest run` | 40 files, 583 tests pass |
| `next build` (standalone) in a scratch copy of `web/` (APFS clone), served as the image does on `:3963` | exit 0; serves 200 |
| `python3 scripts/workflow.py validate` | pass (warnings pre-existing) |

## Round 1: stack as run (all stopped at the end)

- **Started by me:**
  - dev `next dev` on `:3962`
  - standalone before `:3961` and after `:3963` (scratch copies)
  - headless Chrome on CDP `:9341`
  - the iframe harness proxy on `:3960`
- **Never touched:** `:3030`, `:8766`, the review's `:8977` (read only) and `:3978`.
- **Claude in Chrome:** `list_connected_browsers`, then `select_browser c14e5b18-f250-45f1-b92e-4a08a31197b5` first. It drove one tab of my own, closed at the end. I set no cookie and changed no setting, so the profile is as I found it.
- **Scripts (data, not deliverables):** `/private/tmp/claude-502/-Users-sugang-projects-personal-knowledge/aba4c78e-665c-427a-9abd-276457679f2d/scratchpad/f1/`: `cases.mjs`, `pixel.mjs`, `clipchk.mjs`, `sheet2.mjs`, `winsum.mjs`, `termwide.mjs`, `winmath.mjs`, `anchors.mjs`, `sweep.mjs`, `sweep2.mjs`, `paper.mjs`, `papercmp.sh`, `dtwide.mjs`, `rocheck.mjs`, and their JSON and PNG outputs.
