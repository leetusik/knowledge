# P39-hk.F2 — result

## Verdict

- **status:** done
- **route:** high
- **model:** opus
- **effort:** xhigh
- **summary:** In native chapters, every hyphenated word of the prose (and each term alias) is now one `.ra-keep`. A Hangul particle written right after an inline formula is bound to that formula in one keep (OQ15, OQ14). A run wider than its room breaks inside, as F1 bounds it.
  - `fitKeeps` now also bounds a run by every box up to the column.
  - It reads the runs with the column clipped sideways, so a phone's sheet keeps its width.
  - It re-fits the runs when a pair's formula box turns on or off.
  - Blocks without a keep render byte-identical to HEAD. F1's matrix, the 12-width sweep and paper are unchanged.
  - A call costs at most 1.7 ms (4.3 ms with the CPU slowed ×4), in one read pass, with no loop.
- **files_changed:**
  - `web/src/lib/native/render.tsx`
  - `web/src/app/reader-aids.css`
  - `web/src/components/reader/math-layer.tsx`
  - `web/tests/native-terms.test.ts`
  - `works/phases/active/P39-hk/slices/P39-hk.F2/result.md`
  - `works/phases/active/P39-hk/phase.md` (through `phase-section` only)
  - `works/phases/active/P39-hk/topics/decisions.md` (Decisions 14–16 moved there with `--to-topic`, and their links fixed)
- **validation:**
  - `pnpm --dir web typecheck`: pass (exit 0)
  - `pnpm --dir web lint`: pass (exit 0)
  - `pnpm --dir web exec vitest run tests/native-render.test.ts tests/native-math.test.ts tests/native-terms.test.ts tests/reader-anchor.test.ts tests/csp.test.ts`: pass, 5 files, 286 tests
  - `pnpm --dir web exec vitest run`: pass, 40 files, 585 tests (583 before: F2 adds 2)
  - the standalone build (`next build`) in scratch copies: exit 0 for `after1`, `after2` and `after3` (the final one, `src/` identical to the worktree), and for the timing copies `timed2` and `timed3`
  - the sweep, before and after, on headless Chrome 156 over CDP and Claude in Chrome (the agent's profile, `c14e5b18-…`, selected first), with paper through `Page.printToPDF`; below
  - `python3 scripts/workflow.py validate`: passed
- **deviations:**
  1. `fitKeeps` also walks the boxes a run sits in, up to the column, stopping at a scroller or a placed window. Without it, a flex item such as a callout title grows with the run and pushes the page to 441–775 px.
  2. `.ra-keep.is-wide` breaks with `overflow-wrap: anywhere`, not `break-word`. A line breaks at the same places; the difference is that a growing box can shrink back.
  3. `fitKeeps` reads with the column clipped sideways (`overflow-x: clip`, inline, only during the read). F1's window matrix found the need on the first build: on a phone, the unbroken read widened the page and with it the fixed sheet, so a window's name ran 28 px into Close.
  4. `MathLayer`'s `ResizeObserver` also watches each pair's formula box. `rocheck` found the need: after a formula got its box, the pair stayed unmarked and its particle ran 1 px past the screen.
  5. A term's aliases are kept as well (F22 says "term or name"), and S9's private `kept()` is gone. A lone ` - ` dash gets no span.
  6. `kb-print.css`, `formula-box.tsx` and `native-render.test.ts` are in the Set but needed no change. The two new cases are in `native-terms.test.ts`.
  7. Three R1 Decisions entries moved to `topics/decisions.md` to stay under budget, as the plan allows.
- **doc_impact:**
  - `(P39-hk.F2)` product, architecture, qa: the keeps reach the whole prose; the particle is bound; the room walk; `anywhere`; paper unchanged; the web suite is 40 files and 585 tests.
  - `(P39-hk.F2, measure)` architecture: the clipped read; the re-fit when a pair's box turns on or off.
- **notebook** (written through `phase-section`; phase.md 37,199 of 40,960 B, every section under its budget):
  - **Decisions:** 38 appended ("Prose keeps and the particle (F2)"); 14–16 moved to the topic.
  - **Doc impact:** 15 and 16 appended.
  - **Notes for later slices:** 13 replaced with "(from F1 and F2, for REVIEW)", which names the scripts.
  - **Now:** rewritten: F2 landed, next is F3.
- **operator_need:** none

## Mechanism (the Decisions entry has the gist)

**Reach (OQ15, F22).** `Renderer.keep` is now on for every native chapter and off for `md`.
- Every text node of every inline run goes through `keepText`, wherever the run sits: paragraphs, list items, quotes, callouts and their titles, table cells, headings, figure and diagram captions and credits, card bodies, a formula's reading and legend meanings, quiz prompts, options, answers, explanations and cloze text, definitions, term words. A term's aliases ("Also called") go through it too, as F22 names "a hyphenated term or name".
- S9's private `kept()` is gone: with the switch always on in a native chapter it was the identity.
- Untouched: code spans and blocks, link targets, every attribute, `alt`, diagram labels (SVG text), and the plain-string titles of cards, diagrams, quizzes and sources.
- `keepText` itself is unchanged but for one case: a dash standing alone (` - `) gets no span, since it holds no break to stop.
- The run is the text's own characters, so no offset moves (the anchor projection is identical, below).

**The particle (OQ14, F22's Korean clause).** In the inline walk (`inline()` and the cloze walk alike), a `math` node followed by a text node that starts with Hangul is rendered as one `span.ra-keep`:
- inside it, the formula's own `InlineFormula` box and the Hangul run up to the first space (`를`, `로,`, `입니다.`);
- the rest of that text node follows as ordinary prose.
- No new component. `InlineFormula` still measures against the paragraph (`lineOf` skips the inline wrapper).

**The bound (F1's, extended).** `fitKeeps` keeps F1's shape: one write (every `is-wide` off), one read pass, one write (`is-wide` on the runs too wide).
- A run is too wide when it is wider than its line's content box (F1), or when it sticks out of any box it sits in, up to the chapter's column (`tooWide`).
  - The walk stops at a box that scrolls or clips (a table's frame: a table grows to its words and scrolls in its own box, the prose kit's §9 rule, as Korean table cells already keep their words whole).
  - It also stops at a box placed out of flow (a definition window, the phone sheet).
  - Each box's style and rect are read once per pass (a `Map`).
- Why the walk: a callout's title is a flex item whose automatic minimum width grows with an unbreakable run. Its "line" then always holds the run, so F1's line test never fires, and the title runs out of the callout and the page (probe below: page 441 at 390/200%).
- **The column clips sideways while the runs are read** (`overflow-x: clip` as an inline style, set in the first write and taken off before the second, with the `style` attribute removed again if it had none).
  - Why: F1 reads every run unbroken, and with F2 some prose runs are, unbroken, far past the screen. Example: the quiz option "CONDITIONAL-GO’s" sits in a 107 px column at 390/200%.
  - On a phone, a page that grows wider widens the layout viewport, and with it a sheet (`position: fixed`). The window's runs were then read against a line the reader never sees. Measured on after1 with the `oos` sheet open at 390/200%: the page went 390 → 577 during the read, the sheet 390 → 577 and the name's line 203 → 390, so "Out-of-sample" (250) read as fitting and ran 28 px into Close.
  - With the column clipped, the page stays 390, the sheet 390 and the line 203 (`winwide3.mjs`).
  - `overflow: clip` makes no scroll container and no formatting context, so no box inside the column moves. The walk treats the column as a bound, never a frame.
  - Found by F1's window matrix on the first F2 build, fixed, and re-run (below).
- **A pair is fitted again when its formula's box turns on or off.** F1's `InlineFormula` boxes a formula wider than its line (`is-over`) on its own clock, after `fitKeeps` may already have read the pair.
  - Found by `rocheck.mjs`'s "long" state in ko at 390/200%. On after2, the `rate` formula grown in place got its box, but the pair (box plus "인") stayed unmarked, and "인" ran 1 px past the screen (page 391). HEAD shows 390 there, because nothing holds the particle (`longko.mjs`).
  - `MathLayer`'s `ResizeObserver` now also observes each pair's `.ra-mi`. That box is 0 px wide until `is-over`, then as wide as the line (`rotest.mjs`: 0 → 323 → 0 px as the formula grows and shrinks), so the change re-fits the runs a frame later.
- `.ra-keep.is-wide` now breaks with `overflow-wrap: anywhere` instead of `break-word`.
  - In a line the two break at the same places, so F1's cases are unchanged.
  - `anywhere` also lets a box that grows with its words shrink back to its line.
  - It is also what Korean prose already uses (`.rd-prose :lang(ko)`), so a wide Korean run behaves as before.
- **Paper** needed no change. Every keep, pairs included, prints whole: `reader-aids.css`'s `nowrap` applies, and F1's paper rule puts a screen-measured `is-wide` back to `nowrap`.

## Tests (core only)

- `web/tests/native-terms.test.ts` gains `describe("kept runs in the prose")`, with two cases:
  - a hyphenated paragraph word renders as one `.ra-keep` (`walk-forward`, `out-of-sample`); a lone ` - ` dash, a code span (`look-ahead`), a link's `href` and an `md` render get none;
  - in Korean, `를` after `$\`x\`$` is bound with the formula's box in one `.ra-keep`, and a formula followed by a space binds nothing.
- No existing expectation changed. `native-render.test.ts` needed no edit and is green.

## Sweep, before and after

**Builds and instruments.**
- *HEAD* is `d9831598` (F1), a standalone build in a scratch copy, on `:3981`.
- *F2, first build* (`after1`, `:3983`) is this tree before the two measurement fixes below.
- *after2* (`:3986`) adds the clipped read.
- *F2, final build* (`after3`, `:3989`) also re-fits a pair whose formula box turns on or off. Its `src/` is byte-identical to the worktree's (`diff -rq` prints nothing).
- The OQ, layout, pixel, probe and paper sweeps below ran on after1. The later builds change only when `fitKeeps` runs and what its read sees. At rest they render every page block for block byte-identical to after1 (*Pixels*). The window matrix, the loop check, the cases, the probes and the timing ran again on the later builds.
- Both read the review's API `:8977` and use its fixtures at `/@p39rv/…`.
- **Headless Chrome 156 over CDP** (`--headless=new`, port 9361, its own scratch profile, `--disable-features=OverlayScrollbar`), one run at a time. Phones are emulated mobile at DPR 2; the text size is the root font size P30's control sets. Paper is `Page.printToPDF`, read with `pdftoppm`/`pdftotext`.
- **Claude in Chrome**: the agent's own profile, `deviceId c14e5b18-f250-45f1-b92e-4a08a31197b5`, selected before any other browser tool. It ran at a true 390×844 viewport through local iframe harnesses (`:3980` → after1, `:3988` → after2, `:3991` → after3), and on the dev runtime `:3982` at the window's own width.
- Pages are reading-aids en and ko (the longest chapter), write-lock en and ko, all-blocks en (no hyphenated word in its prose: the identity check), the loose note `/documents/7`, and the past version `/documents/5/versions/1`.

**OQ15 and OQ14** (`oq.mjs`, `oqsum.mjs` → `oqsum.txt`). Four pages at 1440, 820, 390 and 320, each at 100%, 150% and 200%: 0 flagged, no page errors in either build.
- Every hyphenated word of the prose is a keep. None runs past its line, and every one that breaks is measured wide.
- **HEAD** broke runs that fit their line:
  - "t-statistic" in the worked reading at 1440 (all three text sizes) and at 820/100%;
  - "non-Normal" at 390/200%;
  - "t-통계량은" in the reading at 820/150%, 390/200% and 320/150%;
  - a second "CONDITIONAL-GO의" at 390/150% and at 320/100%.
- **F2** breaks only runs wider than their room, each measured wide: "CONDITIONAL-GO’s"/"…의" on phones at 150–200%, plus "per-event" (legend) and "stitched-together" (glossary) at 320/200%.
- **Pairs.** ko holds 8 formula–particle pairs. HEAD split 8 pair instances across 6 cases:
  - `s = mean ÷ sd와` at 820/150%;
  - `(∑e)² ÷ ∑e²를` at 820/200% and 390/100%;
  - `t = s × √n을` at 390/150%;
  - `λ = rate × time인` at 390/200%;
  - three at 320/200%.
- F2 splits 2, both at 320/200%: `s = mean ÷ sd와` and `λ = rate × time인`. Each pair is wider than the line and measured wide: F1's fallback.
- **Page width** is the same as HEAD's in every case. The 348 at 320/200% is P30's "Back to the book →" (F3). The 397 of write-lock and all-blocks at 200% is their pre-existing "Show answer".

**Layout** (`lay2.mjs` → `lay-all.json`, `laysum.txt`). Every word's line and top relative to its block, for 7 pages at 10 sizes (1728, 1440, 820@150/200, 390@100/150/200, 320@100/150/200).
- **Write-lock, all-blocks and the loose note:** no word moved and no drift, at every size.
- **Reading-aids:** words changed line only in blocks holding a kept run or a pair. The first word that moves is always a kept run or a pair (`t-statistic`, `non-Normal`, `t-통계량은`, `CONDITIONAL-GO의`, `(∑e)²…를`, `λ…인`, `e^(−λ)입니다.`) or, in that same paragraph, a word that `text-wrap: pretty` re-balanced. Example: ko 1440 now ends line 1 at "이벤트 수는" and keeps "평균 λ = rate × time인" together.
- **Other blocks holding a keep:** 0.016–0.031 px of sideways drift (1–2/64 px LayoutUnits from the split text node) and none up or down.
- **The one larger shift** is en 320/200% block 2 (34.9 px): "CONDITIONAL-" alone is 278.6 px against a 252.8 px line. HEAD's prose does not break it, so it runs 26 px past the column. F2 measures it wide and breaks it inside ("CONDITIONA" / "L-GO’s"), within the line. `overflow-wrap: break-word` gives the same break (probed: `cond.mjs`, `lines.mjs`). This is F36's rule doing its job, not a new break.
- **The past version** does not load reader-aids, so its keeps have no `nowrap`: no word moved, sub-pixel drift only.

**Pixels** (`pix2.mjs` → `pix-all.json`, `pixsum.txt`; then `pix3.mjs` → `pix3-a.txt`, `pix3-b.txt`, which captures every block twice per build and calls a block noise only when a build differs from itself).
- **Write-lock en/ko, all-blocks en, loose note**, 7 sizes each: 446 blocks byte-identical, 16 noise (all-blocks' raster image and drawing blocks, `fg-plain`, `fg-fig`, `fg-row` and two diagrams, which differ between two loads of one build), **0 differ**.
- **Reading-aids en and the past version at 1440/100% and 320/200%:** every block without a new keep is byte-identical (68). Every block that differs (12) holds a new keep.
- **The later builds against after1, at rest** (`mx2/pix3-after1-after2.txt`, `mx3/pix3-after2-after3.txt`, `mx3/pix3-recheck.txt`, `mx2/pix3-self.txt`):
  - after2 against after1, over all 7 pages and 7 sizes: 859 blocks identical, 19 noise.
  - 4 blocks differ, all on all-blocks and the loose note. Those two pages hold no keep and no math, so `MathLayer` stops at mount and neither change can run there. A run of after2 against itself shows the same blocks varying.
  - after3 against after2, on the 5 pages with keeps: 529 identical and 3 differ. None of the 3 repeats on a re-run (144 of 144 identical), and after3 against itself is identical.
- **Inside blocks with a new keep**, the difference is either one glyph cluster's antialiasing (max Δ 56/255, a few dozen to a few hundred px) or the moved break above. Where a line was added (ko 820/150%, 390/150% and 390/200%; en 390/200%), the blocks below move down by that line. Their layout is identical (above), so their pixels differ only by the sub-pixel offset.

**F1's matrix.** `matrix.sh` → `mx/` ran HEAD against after1; `matrix2.sh` → `mx2/` re-ran it on after2, and `matrix3.sh` → `mx3/` on after3.
- **Cases 1–7, 9 and the long inline formula 6a–d** (`cases.mjs`), 22 cases:
  - no keep and no formula over its line, no legend term over, and every page width equal to HEAD's;
  - after2's and after3's outputs are identical to after1's;
  - every kept run F2 breaks is measured wide.
- **Narrow quiz option column (pre-existing).** At 390 and 320 with 200% text the option text column is 107 and 37 px. HEAD breaks "CONDITIONAL-GO’s 1.5" into 5 and 16 lines there; F2 breaks it into 4 and 14 (`quiz.mjs`).
- **Windows and sheets** (`sheet2.mjs`): 8 specs × 12 windows, en and ko; `sheetcmp.mjs` compares them.
  - **after1 differed from HEAD in 3 windows at 390/200%.** The names "Out-of-sample" and "Walk-forward" ran 28 and 20 px into Close, and ko `tstat`'s body scrolled 11 px sideways because "CONDITIONAL-GO의" was not measured wide. The cause and the fix are under *Mechanism* (the column clips while it is read).
  - **after2 and after3:** all 96 windows have HEAD's geometry (sheet, size, spacer, gap above, name against Close, body scroll, page width), and no kept run in a window runs past its line.
  - `winwide.mjs` traced the cause: on after1 the name keep never got the class, even after a resize. On after2 it gets it exactly as HEAD's does.
- **Term underline** (`termwide.mjs`): a wide name keeps its dotted underline on every line, en and ko. after2's and after3's outputs are identical to after1's.
- **Annotation paint** (`anchors.mjs` marks, `marks.mjs`): a `mark.an-m` in each of these paints its ground and edge:
  - a term and a glossary entry;
  - a prose keep, one that fits (`non-Normal`) and one that is wide (`CONDITIONAL-GO’s`);
  - a bound particle (`를`), and `와` in a wide pair.
- The keep's lines and wide state are what they were before the mark.
- One value differed between runs: the term line's computed colour (42,37,31 against 40,35,29). It is read during its 0.15 s `text-decoration-color` transition, so the difference is the moment of reading, not the CSS (the same in both builds).
- **Anchor projection** (`anchors.mjs`), en and ko at 1440/100% and 390/200%: 8 containers each, 0 differ, the same character count (1690 / 1070), on after1, after2 and after3.
- **The 12-width sweep and P30's text-size line, light and dark** (`sweep.mjs`): HEAD's, after1's and after3's outputs are byte-identical.
- **No ResizeObserver loop** (`rocheck.mjs`, en and ko): the text size cycles 200 → 150 → 100 → 200%, then a formula grows and shrinks, with no window error and no console error, on after1, after2 and after3, at 390 and 320.
  - **Page widths:** after3 matches HEAD's at every state: 390, or 348/320 at 320 (P30's button at 200%).
  - **after2 differed in one state:** ko's "long" state was 391 against HEAD's 390. This is the stale pair the second fix answers (*Mechanism*).
  - **after3, ko 390/200% (`longko.mjs`):** the grown formula is boxed, the pair is wide and "인" wraps to the next line (33.6–356.4, then 33.6–68.4). The same holds at 320/200% and 390/100%.
- **Formula boxes**, each as F1 recorded (`ring.mjs`, `oq12.mjs`, `symbox.mjs` and `tablefade.mjs` on after1; `winmath.mjs` on all three builds, with the same output):
  - the focus ring is 2 px solid with a 2 px offset, light and dark;
  - the legend symbol box, its fades and its arrow;
  - the inline formula in a sheet is boxed and the sheet's body does not run over;
  - the tables' fades match HEAD's byte for byte.
- **Formula ink** (`clipchk.mjs` via `clip3.sh`, the box on against the box off): every crop is byte-identical between HEAD and after3. The `√` and `∑` crops differ by at most 1 between box on and off, as F1 recorded. The `e^(−λ)` crop differs by up to 222 between on and off in HEAD itself, because the box-off probe reflows that line; it is the same in every build.

**Probes off the fixture** (`probes.mjs` → `probes-after1b.txt`, with the markup scaffolded onto reading-aids so `MathLayer` runs; re-run on after2 and after3, with the same lines for F2: `mx2/probes.txt`, `mx3/probes.txt`).
- **Callout title holding "CONDITIONAL-GO’s walk-forward"**:
  - 390/200%: HEAD overflowed the callout by 2 px. F2 measures "CONDITIONAL-GO’s" wide and the title ends 44 px inside.
  - 320/200%: HEAD's page was 359 (its title past the callout by 72 px). F2's page is 348 (P30's button), with the title 44 px inside.
  - A 1440 and 100% text: unchanged.
  - Without the walk, the title holds the run whole and pushes the page to 441–775 px (seen on the first probe, before the scaffold, when `fitKeeps` did not run); `rule-title.mjs` confirmed the walk is what flags it.
- **A long run "walk-forward-out-of-sample-look-ahead" in the title**: wide on phones, inside its callout; the page equals the viewport (348 at 320/200%).
- **Table cell "walk-forward out-of-sample"**: at 100% both builds fit. At 200% the cell keeps its words whole, so the table scrolls further in its own frame (531 vs 453 px of 321/251 shown); the page is unchanged (§9's rule, as Korean cells already do).
- **Long inline formula in ko followed by "를"** (its TeX ×4): the formula is boxed (`is-over`, `role=region`), the pair is wide, and "를" wraps to the next line as at HEAD; the page is 390 or 320.
- **`rule.mjs`** (`rule-after1.txt`, and `mx2/rule.txt` with the same output): over every case, the walk flags no keep beyond F1's line-only rule, and the live state equals the recomputed rule.

**Cost of `fitKeeps`** (`timing.mjs` on the timing builds: the real code, wrapped by `instrument.py`'s shim, which records each call and forces the relayout its writes leave).
- `timed3` (`:3990`) is after3's source, the final one, and `timed-head` (`:3985`) is HEAD's. The steps on reading-aids at 390: load, the text size to 200%, five resizes (390 ↔ 391), then the same with the chapter's blocks cloned ×10.
- "×4" is `Emulation.setCPUThrottlingRate` 4, a phone's slower CPU.

| | keeps | per call | relayout its writes leave | calls per change | layouts per resize |
|---|---|---|---|---|---|
| HEAD en / ko | 30 / 9 | 0.3–1.0 ms | 0.1–0.5 ms | 2 | 6 / 10 |
| F2 en / ko | 38 / 23 | 0.2–1.7 ms | 0.1–1.1 ms | 2 | 6 / 6 |
| HEAD ×4 | 30 / 9 | 0.1–2.8 ms | 0–1.2 ms | 2 | 6 / 10 |
| F2 ×4 | 38 / 23 | 0.9–4.3 ms | 0–1.4 ms | 2 | 6 / 6 |
| HEAD, cloned ×10 | 300 / 90 | 0.8–2.5 ms | 0.4–1.6 ms | 2 | 6 / 10 |
| F2, cloned ×10 | 380 / 230 | 3.1–5.4 ms | 1.4–2.8 ms | 2 | 6 / 6 |
| HEAD, cloned ×10, ×4 | 300 / 90 | 3.1–10.6 ms | 0.9–4.8 ms | 2 | 6 / 10 |
| F2, cloned ×10, ×4 | 380 / 230 | 8.1–14.9 ms | 2.9–7.0 ms | 2 | 6 / 6 |

- One read pass between two writes, as F1's. The column's clip is one more style write in each write phase.
- The second call per change is the `ResizeObserver` answering the first call's height change, and it settles there. There is no loop: no window error in any run, a clean console, and `rocheck.mjs` above.
- Earlier F2 builds:
  - after1 measured 0.6–1.6 ms a call with 10 layouts per resize in both languages (`timing-f2.txt`). Once the column is clipped, the read no longer widens the page, and the layouts per resize drop to 6.
  - after2 measured 0.7–1.7 ms (`mx2/`).
  - after3's observer on the pairs' boxes adds no call per change.

**Paper** (`paper.mjs`, `papercmp2.sh`, `paperdiff.py`; `paper/`). A4 and Letter, en and ko, HEAD against F2:
- 6 pages each in both builds, with the same first and last line on every page: the page breaks are the same.
- ko is pixel-identical.
- en page 2 differs in one 26×12 px spot at 100 dpi (the legend line "the i-th eigenvalue … correlation"): sub-pixel drift, with identical text.
- Every keep prints `nowrap`. The widest is 141 px (en) and 145 px (ko) of a 552 px glossary column, and pairs print whole.
- A "stale" print (every keep forced `is-wide` and every formula forced `is-over`, as if the screen had measured a phone) is identical to the clean one: F1's paper rule holds for the new keeps.

**Claude in Chrome** (the agent's profile, selected first):
- **after1**, through the harness `:3980`:
  - **ko 100% at 390:** all 7 prose pairs are together, "(∑e)² ÷ ∑e²를 계산하며," is on one line, the page is 390 and `scrollX` is 0.
  - **ko 200%:** "λ = rate × time인" and "e^−λ입니다." are together, "t-통계량은" is on one line, the page is 390.
  - **en 200%:** keeps are whole except the "CONDITIONAL-GO’s" runs measured wide; "non-Normal" is whole.
  - **Dev runtime `:3982` at 1728:** 38 keeps; the worked reading breaks before a whole "t-statistic".
  - Screenshots, from the extension's own folder:
    - `/var/folders/_3/xjzt23013c792mp64_80srbw0000gp/T/claude-chrome-screenshots-34CriX/screenshot-1793859663370-0.png` (ko 100%)
    - `…/screenshot-1793859678979-1.png` (ko 200%)
    - `…/screenshot-1793859694608-2.png` (en 200%)
- **after2 and the final build after3**, through second and third harnesses (`:3988` → `:3986`, `:3991` → `:3989`) at 390×844 with 200% text:
  - en `oos`: the sheet is 390 and "Out-of-sample" is wide on 2 lines, 95 px clear of Close (HEAD's geometry). Shown on both builds.
  - ko `tstat` with "Read more" (after2): "CONDITIONAL-GO의" is wide on 2 lines, the body does not scroll sideways, and the page is 390.
  - ko on after3: all 9 pairs whole at 200%. With the `rate` formula grown in place ×4, the pair is wide, the formula is boxed with its fade, "인" wraps to the next line, and the page is 390.
  - Screenshots:
    - `/var/folders/_3/xjzt23013c792mp64_80srbw0000gp/T/claude-chrome-screenshots-34CriX/screenshot-1793862034257-3.jpg` (after2 oos)
    - `…/screenshot-1793862049719-4.jpg` (after2 tstat)
    - `…/screenshot-1793863453719-5.jpg` (after3, the grown pair)
    - `…/screenshot-1793863467416-6.jpg` (after3 oos)
  - This is desktop Chrome in an iframe, so it shows the window at rest, not the phone's layout-viewport effect. That effect, and its fix, were measured in headless Chrome's mobile emulation (`winwide3.mjs`).
- Every tab I used was closed and its group removed (the last one at the end). No cookie or setting was changed. The text size was set on the frame's own root, not saved.

## Observations outside the boundary (pre-existing, not F2's)

- At 320 with 200% text the quiz's option text column is about 37 px wide.
- The past-version page is 446–447 px wide at 390 and 320 with 200% text (335 at 320/150%).
- Write-lock and all-blocks are 397 px at 200% ("Show answer").
- The 348 at 320/200% is P30's chapter-end button (F3).

## Stack as run

Everything is in `/private/tmp/claude-502/-Users-sugang-projects-personal-knowledge/aba4c78e-665c-427a-9abd-276457679f2d/scratchpad/f2/`.
- **Stack scripts:** `build.sh`, `standalone.sh`, `chrome.sh`, `dev.sh`, `launch.sh` (writes `pids.txt`), `vp_proxy.py`, `cdp-lib.mjs` and `measure.mjs`.
- **F2's probes:** `oq.mjs`, `oqsum.mjs`, `pix2.mjs`, `pixsum.mjs`, `pix3.mjs`, `lay2.mjs`, `laysum.mjs`, `lines.mjs`, `cond.mjs`, `quiz.mjs`, `rule.mjs`, `rule-title.mjs`, `probes.mjs`, `marks.mjs`, `winwide.mjs`, `winwide2.mjs`, `winwide3.mjs`, `sheetcmp.mjs`, `longko.mjs`, `rotest.mjs`, `timing.mjs` (with `instrument.py`), `paper.mjs`, `papercmp2.sh`, `paperdiff.py` and `pngdiff.mjs`.
- **The runners:** `matrix.sh` (HEAD/after1 → `mx/`), `matrix2.sh` (after2 → `mx2/`) and `matrix3.sh` (after3 → `mx3/`).
- **F1's scripts, copied in:** `cases`, `sheet2`, `anchors`, `sweep`, `rocheck`, `termwide`, `ring`, `symbox`, `oq12`, `tablefade`, `clipchk` and `winmath`.
- **My processes:**
  - standalone HEAD `:3981` (78260);
  - standalone after1 `:3983` (88331), after2 `:3986` (4335) and after3 `:3989` (10446);
  - the timing builds `timed-head` `:3985` (4340), `timed2` `:3987` (4337) and `timed3` `:3990` (10448) (the first pair, `:3984`/`:3985`, was stopped earlier);
  - `next dev` `:3982` (91098 → 91107 → 91113);
  - the harnesses `:3980` (91100), `:3988` (4448) and `:3991` (10548);
  - headless Chrome `:9361` (78262).
- All of them were stopped at the end, and only those.
- I never touched `:3030`, `:8766`, `:8977` or `:3978`.
