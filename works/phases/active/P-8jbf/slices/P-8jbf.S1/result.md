# P-8jbf.S1 result: the wide-screen reader rule

- **status:** done
- **route:** mid
- **model:** opus
- **effort:** medium
- **summary:** Added one block to `web/src/app/reader.css`, `@media screen and (min-width: 100rem)` scoped to `.rd-article`. From a 1600px window the reader's column for documents and chapters is 44rem (704px) and each of the five text sizes is ×10/9 (default 20px), with `--rd-k` and `--rd-fs-s` following. Verified live: below 1600px nothing changes, print is pixel-identical, and the book, legacy, book-notes and review pages are identical element for element.
- **files_changed:** `web/src/app/reader.css`; `works/phases/active/P-8jbf/slices/P-8jbf.S1/result.md`; `works/phases/active/P-8jbf/phase.md` (through `phase-section`)
- **validation:**
  - `pnpm --dir web lint`: pass
  - `pnpm --dir web typecheck`: pass
  - `pnpm --dir web build`: pass
  - live check in a dev clone and in the production build (`next start`), both on a scratch API: pass (measurements below)
  - Aside `u1` at 1440 on `:3030`: pass, unchanged
  - headless Chrome on `:3030` at 1599, 1600 and 1920: pass
  - `python3 scripts/workflow.py validate`: pass (only the existing warnings about stale and oversized docs)
- **deviations:**
  1. Most measurements ran on a scratch stack, not on `:3030`. `:3030`'s database has no public chapter and no long document, so I used P30's live-check recipe: a scratch API on `:8961` with database `kb_p8jbf` in `kb-p28s2-pg`, the fixture book, a dev clone of `web/` on `:3963`, and the production build on `:3962`. `:3030` itself was checked with Aside at 1440 and with headless Chrome at 1599, 1600 and 1920 on its public short document.
  2. The "long loose document" was the fixture's `all-blocks.md`, published loose as `long-loose` with a 40-row, 8-column table appended. This was scratch data only, dropped afterwards.
- **doc_impact:** `- product.md, qa.md: the reader's wide-screen step — from a 1600px (100rem) window, documents and chapters (.rd-article) get a 44rem column and every text size ×10/9 (default 18→20px); below 1600px, print and the review, book, book-notes and legacy pages unchanged (P-8jbf.S1)`

## The change

One block after `.rd-article { min-height: 60vh; }`, with a block comment that names the rule:

- `.rd-article { --rd-measure: 44rem; --rd-fs: 1.25rem; --rd-k: 1.25; --rd-fs-s: calc(var(--rd-fs) * 0.8333); }`
- `.rd-size-N .rd-article` sets 1.0416667, 1.1458333, 1.25, 1.3888889 and 1.5277778 (rem for `--rd-fs`, unitless for `--rd-k`), each the signed value ×10/9.
- `.rd-flow`, `.an-rail` and `--qz-nfs` read the article's values by themselves. Nothing else changed.

## Instrument and setup

- **Wide viewports:** headless Chrome 156 over CDP with a throwaway profile, `Emulation.setDeviceMetricsOverride` at DPR 1, and `--disable-features=OverlayScrollbar`, so classic scrollbars are on and "anon" columns sit 7.5px left of the signed-in ones. A second Chrome instance stayed signed out for anonymous pages. `Page.printToPDF` made the print files, and `pdftoppm` turned them into PNGs.
- **Signed in:** one sign-in through the BFF, as the scratch member `p8jbf-member@example.com` (org slug `p8jbf`). I added three block notes per document through `/app/reader/annotations`, so the margin rail renders ("Notes on"). Anonymous means no annotation layer ("Notes off").
- **1440:** Aside `aside repl --account u1` on the operator runtime `:3030`.
- **Before and after:** the "before" run used the dev clone with the original `reader.css`, the "after" run the same clone with the edit. For the non-reader pages I also put the original file back in the clone and compared full element dumps (every element's tag, rect and font-size). The only difference was the Next dev overlay's portal order, which also differs between two runs of the same code.
- **Cleanup:** I stopped the scratch API, the dev clone, `next start` and both Chromes by their PIDs, and dropped `kb_p8jbf`. `:3030` (8452) and `:8766` (66506) were never touched. Screenshots and scripts are in the session scratchpad only.

## Measurements

Column x-range is `.rd-prose` [left, right, width] in px; font-size is computed on `.rd-prose`. Signed in (Notes on), size 3:

| width | before: column / text | after: column / text | after: rail |
|---|---|---|---|
| 1440 | 432–1008, 576 / 18px | 432–1008, 576 / 18px | 1032–1288 |
| 1599 | 511.5–1087.5, 576 / 18px | identical | 1111.5–1367.5 |
| 1600 | 512–1088, 576 / 18px | **448–1152, 704 / 20px** | 1176–1432 |
| 1920 | 672–1248, 576 / 18px | **608–1312, 704 / 20px** | 1336–1592 |
| 2560 | 992–1568, 576 / 18px | **928–1632, 704 / 20px** | 1656–1912 |

- The rail sits 24px right of the column at every width and never overlaps it. At 1600 it measured 1176–1432, as the breakdown predicted.
- Anonymous (Notes off) gives the same widths and sizes with no rail.
- The loose document matches the chapter exactly at every width.
- At 1440 and 1599 the chapter's full-page element fingerprint was the same before and after.

All five sizes at 1920, after (the chapter and the loose document give identical numbers):

| size | text | h2 | title | code | quiz |
|---|---|---|---|---|---|
| 1 | 16.667px (was 15) | 24.17 (21.75) | 40.0 (36) | 13.89 (12.50) | 16.667 |
| 2 | 18.333px (16.5) | 26.58 (23.93) | 44.0 (39.6) | 15.28 (13.75) | 18.333 |
| 3 | 20px (18) | 29 (26.1) | 48 (43.2) | 16.67 (15.0) | 20 |
| 4 | 22.222px (20) | 32.22 (29) | 53.33 (48) | 18.52 (16.67) | 22.222 |
| 5 | 24.444px (22) | 35.44 (31.9) | 58.67 (52.8) | 20.37 (18.33) | 24.444 |

- **Blocks:** at every size and width the code blocks, tables, figure rows and the first diagram start at the column's left edge, and code, tables and figures are exactly the column's width. The count of `.rd-flow` children outside the column was 3 before and after, at every width.
- **Long table:** the 40-row, 8-column table stays in the 704px column and scrolls inside it, with its "Scroll in the table" hint, which is the table's signed behaviour.
- **Diagrams:** diagrams keep their own width inside the column. At size 5 before, the first flow diagram filled the 576px column; after, it is 218px wide at its natural size, because the column now holds 10% more em. It is still inside the column.
- **Text bars:** top bar, chapter bar, Display button and sheets are unchanged in the screenshots. They sit outside `.rd-article`.
- **Production build** (`next start :3962`): the whole battery gave numbers identical to the dev clone's "after" run.
- **Print from a 1920 window:** the chapter and the loose document each printed 9 pages, pixel-identical at 50dpi before and after. The production-build print also matched the dev "before" print.
- **Other pages at 1920:** book (anonymous and signed in), legacy html chapter, book notes (signed in, 3 items) and review (signed in) are identical element for element between the original and the edited CSS. `--rd-measure` reads 36rem on each.
- **`:3030`:** Aside at 1440 on `/@p28s2/research/focus-ring-floor-and-touch-targets` gave 432–1008, 576px, 18px, measure 36rem. Headless Chrome on the same page gave 36rem, 576px and 18px at 1599; 44rem, 704px and 20px at 1600 and 1920.

## Observations for the review (not findings)

- `.kb-ch-table--wide table { min-width: 44rem }` now equals the wide column's 44rem. So at ≥1600px a "wide" table that needed to scroll at 36rem fits the column without a horizontal scroller. This follows from the pinned rule ("they simply get the wider column").
