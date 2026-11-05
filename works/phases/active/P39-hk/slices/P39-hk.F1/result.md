# P39-hk.F1 — result

## Verdict

- **status:** needs_operator
- **route:** high
- **model:** opus
- **effort:** xhigh
- **summary:** Bounded the phase's no-wrap runs to their line. A kept hyphenated run (`.ra-keep`) wider than its whole line is measured on the page and breaks inside (F36's rule). An inline formula sits in a measured box of its own and, when wider than its line, scrolls inside it (F7's rule: region, label, fades, a visible ring). Every run that fits renders pixel-identical, and paper prints unchanged. F1's cases 1–9 pass. One added case of the class still fails: a legend symbol wider than the whole legend. It needs a look the record never drew, and markup outside this slice's set: OQ19, one decision.
- **files_changed:**
  - `web/src/app/reader-aids.css`
  - `web/src/app/kb-print.css`
  - `web/src/lib/native/render.tsx`: `inlineMath` wraps the formula in `InlineFormula`; `keepText` changed in its doc comment only
  - `web/src/components/reader/formula-box.tsx`: `InlineFormula`, `lineOf`, `lineWidth`
  - `web/src/components/reader/math-layer.tsx`: `fitKeeps` and its triggers
  - `works/phases/active/P39-hk/slices/P39-hk.F1/result.md`
  - `works/phases/active/P39-hk/phase.md`, written only through `phase-section`
- **validation:**
  - `pnpm --dir web typecheck`: pass
  - `pnpm --dir web lint`: pass
  - `pnpm --dir web exec vitest run tests/native-render.test.ts tests/native-math.test.ts tests/native-terms.test.ts tests/reader-anchor.test.ts tests/csp.test.ts`: pass (5 files, 284 tests). The full suite also passes (40 files, 583 tests).
  - The standalone `next build` in a scratch copy: pass (exit 0). It served on `:3963`.
  - The sweep: pass for F1's matrix (cases 1–9 and every side-effect check). The added case, the legend symbol, fails (OQ19).
  - `python3 scripts/workflow.py validate`: pass
- **deviations:**
  1. `math-layer.tsx` and `formula-box.tsx` carry the keeps' measurement (`fitKeeps`, `lineOf`, `lineWidth`). The plan's set lists these files "only if the inline box needs the measurement". The keeps needed one as well. Every CSS-only bound I tried broke a side effect the plan protects (see *Mechanism*), and no other file in the set can measure.
  2. Added case of the class: the legend `dt`. It is not closed here: the fix needs a look the record never drew, and markup outside the set (`render.tsx`'s `formula()`).
  3. Cases 2 and 3: the runs stay in their column, but the page at 320 with 200% text is 348, not 320. P30's chapter-end "Back to the book →" button causes it. That surface lies outside the phase's boundary. The keeps' 401 and 390 hid it before; it measures the same on the build before F1.
- **doc_impact:** `**(P39-hk.F1)** product.md, architecture.md, qa.md: a kept hyphenated run wider than its whole line breaks inside (measured on the page, `is-wide`), and an inline formula wider than its line scrolls in its own box (`InlineFormula`, region "Formula, scrolls sideways"); paper prints both unchanged. qa: P30's text-size line passes on the chapter again (ko 390 @ 200%: 401 → 390).`
- **notebook:** written through `phase-section`:
  - Decisions: "No-wrap runs bounded (F1)"
  - Operator Questions: OQ18 (the fallback, built as listed unless the operator objects) and OQ19 (the legend symbol)
  - Doc impact: the line above
  - Notes for later slices: one note for REVIEW (the stack and the observations outside the boundary)
  - Now: rewritten
- **operator_need:** Decide OQ19, one decision. A legend symbol wider than the whole legend still pushes the page sideways. It shows only in a DOM probe: no fixture symbol, and no symbol any chapter publishes today, reaches it.
  - **(a) Follow-up job (recommended).** F1 is then complete as delivered. The orchestrator files the job, resolves OQ19 to it and finishes F1, with no further executor work.
  - **(b) Fix it in F1 now.** That widens F1's set to `render.tsx`'s `formula()` and the legend grid in `reader-aids.css`. It also needs the look: recommended, F7's rule, where the symbol scrolls in its own box (the inline box's region, label, fades and ring) inside the symbol column's signed maximum (`min(5.25 em, 28%)`), and every legend that fits stays unchanged.

## Mechanism (Decisions has the gist)

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

## Acceptance matrix (F1's table, before → after)

**Instrument and method:**
- Headless Chrome 142 over CDP (`--disable-features=OverlayScrollbar`): mobile emulation, DPR 2, touch, the root font set as P30's line says.
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

## The rest of the sweep

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

## Observations outside the boundary (deferred-job candidates, not F1)

1. **"Back to the book →" at 320 with 200% text.** P30's chapter-end `.rd-btn` is `nowrap` and 315 px wide, so its right edge sits at 348 and the page is 348. It measures the same on the build before F1. The file that renders it and `reader.css` are not in `phase-scope`.
   - Title: "Chapter-end button wider than a 320 px phone at 200% text".
   - Trigger: the next P30 reader pass, or the review's pre-existing-overflow job, which it joins (the book page's tag at 448 and write-lock's "Show answer" at 397).
2. **The reader's loading skeleton at 390 with 200% text is 418 wide** (`rd-top` 418, `rd-tbtn` at 404, `rd-sk__meta`). I saw it only when a headless tab loaded in the background beside another, so the chapter had not rendered. A visible tab never showed it, so it is noted only.

## Validation log

| Command | Outcome |
|---|---|
| `pnpm --dir web typecheck` | pass |
| `pnpm --dir web lint` | pass |
| `pnpm --dir web exec vitest run tests/native-render.test.ts tests/native-math.test.ts tests/native-terms.test.ts tests/reader-anchor.test.ts tests/csp.test.ts` | 5 files, 284 tests pass |
| `pnpm --dir web exec vitest run` | 40 files, 583 tests pass |
| `next build` (standalone) in a scratch copy of `web/` (APFS clone), served as the image does on `:3963` | exit 0; serves 200 |
| `python3 scripts/workflow.py validate` | pass (warnings pre-existing) |

## Stack as run (all stopped at the end)

- **Started by me:**
  - dev `next dev` on `:3962`
  - standalone before `:3961` and after `:3963` (scratch copies)
  - headless Chrome on CDP `:9341`
  - the iframe harness proxy on `:3960`
- **Never touched:** `:3030`, `:8766`, the review's `:8977` (read only) and `:3978`.
- **Claude in Chrome:** `list_connected_browsers`, then `select_browser c14e5b18-f250-45f1-b92e-4a08a31197b5` first. It drove one tab of my own, closed at the end. I set no cookie and changed no setting, so the profile is as I found it.
- **Scripts (data, not deliverables):** `/private/tmp/claude-502/-Users-sugang-projects-personal-knowledge/aba4c78e-665c-427a-9abd-276457679f2d/scratchpad/f1/`: `cases.mjs`, `pixel.mjs`, `clipchk.mjs`, `sheet2.mjs`, `winsum.mjs`, `termwide.mjs`, `winmath.mjs`, `anchors.mjs`, `sweep.mjs`, `sweep2.mjs`, `paper.mjs`, `papercmp.sh`, `dtwide.mjs`, `rocheck.mjs`, and their JSON and PNG outputs.
