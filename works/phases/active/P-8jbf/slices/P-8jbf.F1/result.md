# P-8jbf.F1 result: a wide table that fits the wide column does not scroll

- **status:** done
- **route:** high
- **model:** opus
- **effort:** xhigh
- **summary:** From the 1600px step, a wide table's minimum width is now the width of its box (`.rd-article .kb-ch-table--wide table { min-width: 100% }`, inside the existing step block) instead of 44rem. An 8+ column table that fits the 44rem column now shows whole, with no scroller, hint or fade, and a table whose content is wider still scrolls. TableBox's region role, tab stop and "scrolls sideways" label now follow the measured overflow for a wide table that is not long. The server-rendered markup is unchanged, so nothing shifts below 1600. Every case in the acceptance matrix passes, in the production build before and after the change and in a dev copy.
- **files_changed:** `web/src/app/reader.css`; `web/src/components/reader/scroll-box.tsx`; `works/phases/active/P-8jbf/slices/P-8jbf.F1/result.md`; `works/phases/active/P-8jbf/phase.md` (through `phase-section` only: one entry appended to each of `## Decisions` and `## Doc impact`, F1's note removed from `## Notes for later slices` and one note for the re-review appended, `## Now` replaced)
- **validation:**
  - `pnpm --dir web lint`: pass (exit 0)
  - `pnpm --dir web typecheck`: pass (exit 0)
  - `pnpm --dir web build`: pass (exit 0)
  - `python3 scripts/workflow.py validate`: pass (only the existing warnings about unknown P26 kinds, owed consolidation, stale docs and oversized doc sections)
  - Live, acceptance matrix cases 1–7: pass (detail below). Headless Chrome 156 (CDP) on a scratch stack: production build before (`:3982`) and after (`:3984`), and a dev copy after (`localhost:3983`). Aside `u1` at 1440 on the scratch production build and on the operator runtime `:3030`.
- **deviations:** none in the approach. One consequence was settled by recommendation (auto mode) and recorded as a decision. From 1600px, a wide **and** long table whose cells fit (8 columns × 30 rows of short cells) now takes the long table's signed "fits the column" form: no box of its own, its header row sticky under the bar. Before F1 it sat in a scrolling box, but only because the 2px phantom overflow set `is-over`, and `is-over` turns on `white-space: nowrap`, which then made the table really overflow (947px). That is the same problem class, hidden behind a real scroll. A long table whose cells do not fit still takes its box at every width.
- **doc_impact:** `- product.md, qa.md, frontend.md: from the 1600px step a wide (8+ column) table that fits the 44rem column shows whole (no scroller, hint or fade; not a region or tab stop), one whose content is wider still scrolls with its hint and fade, and a wide and long table that fits takes the long table's page-level form; TableBox's region follows the measure for a wide, not long, table (P-8jbf.F1)`

## The change

- **`web/src/app/reader.css`**, inside `@media screen and (min-width: 100rem)` only. The new rule, with a two-line comment, is `.rd-article .kb-ch-table--wide table { min-width: 100%; }`. Its specificity (0,2,1) beats `.kb-ch-table--wide table { min-width: 44rem }` (0,1,1). Below the step, the 44rem minimum still holds, so a wide table still always overflows the 36rem column there. The rule is `screen` only, and print already sets `min-width: 0` for wide tables (`kb-print.css:227`).
- **`web/src/components/reader/scroll-box.tsx`**:
  - `useBox`'s measure gains `measured: boolean`. It is false in `NONE`, which is what the server and the first client render use, and it turns true at the first `read()`. `setM` keeps the previous object only once it has been measured.
  - TableBox computes `region = long || m.over || (wide && !m.measured)` and uses it for `tabIndex`, `role` and `aria-label`.
  - The hint `<p>` and the two fade spans still render whenever `box = wide || long || m.over`, exactly as before. CSS shows them only with `is-over`, so the DOM's visible shape does not change on hydration. This is why the server markup and the post-hydration layout below 1600 are byte- and pixel-identical.
  - The other two `useBox` users (`figure-parts.tsx`, `diagram-figure.tsx`) read only `over`/`l`/`r`, so `measured` is invisible to them. They render once more at mount, with the same output.
- **TableBox consumers (grepped):** one, `web/src/lib/native/render.tsx` `table()`, which `NativeChapter` renders in `reader-article.tsx` (the reader) and on the archive page `/documents/{id}/versions/{v}`. Review cards and book notes render no tables. `chrome.ts`'s tap filter still matches `.kb-ch-table`, so a tap on a fitting table still does not toggle the chrome.
- No test was added: the CSS is styling, and the region rule is an accessibility attribute, not core behaviour. Both were verified live instead.

## Acceptance matrix

Fixtures:
- `f1-tables`, mine: t1 8×5 short cells; t2 9×5 long cells; t3 8×30, wide and long, short cells; t4 3×25, long; t5 3×2, plain; t6 5×3 with long code cells, not wide by count but wider than the column; t7 10×4 short cells.
- The review's `wide-short` (8×5) and `wide-loose` (9×5 long cells, 8×30 wide and long).
- The fixture book.

Box numbers are the scroll box's client/scroll width in px. "Bar" is the classic horizontal scrollbar's height (Chrome with `OverlayScrollbar` disabled).

### 1. 8-column short table at 1600, 1920 and 2560, sizes 1, 3 and 5: pass

| | box | classes | hint | fade | bar | table inside box (right border visible) |
|---|---|---|---|---|---|---|
| before (`:3982`) | 702 / 704 | `is-over is-more-r` | shown "Scroll sideways for all 8 columns →" | on | 15px | no |
| after (`:3984`) | **702 / 702** | none | hidden | off | 0 | **yes** |

- These numbers hold for all 9 width × size combinations, for t1, for `wide-short`, and for the 10-column t7.
- Screenshots: `f1/shots/before-wide-short-1920-t1.png` (fade over H, hint, clipped right edge) and `f1/shots/after-wide-short-1920-t1.png` (whole table, rounded right border, no hint).

### 2. The same table at 1599, 1440 and 390: pass, unchanged

- At 1440 and 1599, sizes 1/3/5, and at 390 (DPR 3) the boxes are 574/704 and 339/704: `is-over`, hint, fade, region, label "Table, 8 columns, scrolls sideways".
- Before and after are identical for every table. The whole-page layout fingerprint (every element's rect, font size and display) is **identical** for all 30 below-step runs (3 documents × 1440/1599 × 3 sizes, plus 390).
- Aside `u1` at 1440 on the after build shows the same: 574/704, region, hint `block`, fade opacity 1.
- Screenshot: `f1/shots/after-wide-short-1599-t1.png`.

### 3. A wide table with long cells from 1600: pass, still scrolls

- t2 and `wide-loose`'s 9-column table are 702/739 at sizes 1/3/5: `is-over is-more-r`, hint "Scroll sideways for all 9 columns →", fade on, region and tab stop. Identical before and after.
- t6 (not wide, wider than the column) still becomes a box by measure: 702/913–1263.

### 4. Long tables (more than 20 rows): pass, each in its designed form at every width

- **t4** (3×25, long, fits): page-level, with its header row sticky at y 3 (chrome hidden) at 1440–2560. At 390 it is in the phone box (354×478 of 354×1042), with the header at the box top after an inner scroll of 300px and the hint "Scroll in the table…". Identical before and after at every width.
- **t3** (8×30, wide and long), below 1600 and at 390: in its box (559×463 of 872×1244 at 1440; 354×478 at 390), nowrap cells, header held at the box top through an inner scroll, hint "Scroll in the table for all 30 rows and 8 columns". Identical before and after.
- **t3 from 1600, after:** it fits (702/702), so it takes the signed "a long table that fits the column has no box of its own" form: `overflow: visible`, cells wrap, and the header row sticks at y 59 under the shown top bar. It is still a region named "Table, 8 columns, 30 rows", like every long table. Before, it was a box (687×463 of 947×1317) only through the phantom overflow (see *deviations*).
- **t3 at size 5 from 1600:** its wrapped cells need 1113px, so it stays in its box before and after (687/1113), with nowrap and the hint. A long table that really overflows keeps its box.

### 5. Announcement, tab stop, layout shift: pass

- **Accessibility tree** (CDP `Accessibility.getFullAXTree`):
  - at 1920 after, the regions are only "Table, 9 columns, scrolls sideways", "Table, 8 columns, 30 rows", "Table, 3 columns, 25 rows" and "Table, 5 columns, scrolls sideways". The fitting 8- and 10-column tables are gone, and the hint texts in the tree drop from 5 to 2;
  - at 1440, before and after are identical (6 regions, 5 hint texts).
- **Real Tab walk** through the article (CDP key events):
  - at 1920 after, the table stops are t2, t3, t4, t6, with no stop at t1 or t7;
  - before, and at 1440 after, every box is a stop: t1, t2, t3, t4, t6, t7.
- **Live resize, no reload** (1920 → 1440 → 1920 → 1599 → 1600 → 2560 → 390 → 1920): the fitting wide tables flip to over, region, tab stop and hint below the step, and back to fits with no region from 1600. The measure follows the width both ways.
- **Server markup:** the `<body>` HTML of `f1-tables`, `wide-short` and `wide-loose`, with scripts and nonces removed, is **byte-identical** before and after, with 5, 1 and 3 regions in the server render. Below 1600 the post-hydration DOM is identical too (case 2's fingerprints), so nothing shifts on load. From 1600 the fix removes a shift: before, the hint `<p>` appeared under each phantom table after hydration.

### 6. Print, A4 and Letter, chapter and loose document: pass, pixel-identical

- Printed from a 1920 window (`Page.printToPDF`) before and after, rasterised at 60 dpi, compared with ImageMagick `compare -metric AE`: **0 differing pixels on every page**.
  - Chapter `all-blocks`: A4 8 pages, Letter 9.
  - `f1-tables`: A4 4, Letter 4.
  - `wide-loose`: A4 10, Letter 11.
- The page counts match round 1's.

### 7. Review, book, book-notes, legacy and archive pages, and every TableBox consumer: pass

- **Fingerprints at 1440, 1599, 1600, 1920 and 2560, before vs after:**
  - identical for the book (anonymous and signed in), legacy chapter, book notes, review, library, the loose `compound-growth`, the Korean `write-lock` and the chapter `all-blocks` (anonymous and signed in);
  - the chapter's first hashes differed at some widths. The element dumps show the only difference is the order of Next's streamed `<script>` tags, which also differs between two loads of the same build (after vs after: 22 script lines). With scripts excluded, every one of those runs is identical (1061 elements; 305 for the Korean chapter).
- **The archive page** `/documents/6/versions/1` (the second TableBox consumer; no `.rd-article`, no reader table CSS):
  - pixels are identical before and after at 1440 and 1920 (same fingerprint);
  - the one change is non-visual: a wide table that does not scroll (all 977/977 there) is no longer announced as a scrolling region;
  - its stray visible hint text is unchanged (it predates the phase; the page is D-pzs7's).
- **Operator runtime `:3030`** (Aside `u1`, 1440, `/@p28s2/research/focus-ring-floor-and-touch-targets`): 36rem, 18px, prose 432–1008 (576px), no horizontal scroll, and the new rule is present in the CSSOM (HMR picked it up). The page has no tables (its data has none).

### 8. Checks: pass

`lint`, `typecheck`, `build` and `validate`, as above. The dev copy (`localhost:3983`, the after source) gives the same table state as the production build in all 32 runs: `f1-tables` and `wide-short` at 1440/1599/1600/1920/2560 × sizes 1/3/5, plus 390.

## Instruments and setup

- **Manifest:** `## Operator Runtime` (operations.md) is filled, with no `UNFILLED` marker. It records the dev `:3030`, the production-build check, Aside `--account u1` at 1440, and CDP Chrome for other viewports.
- **Aside `u1`** (`aside repl --account u1`), 1440: the scratch production build (case 2) and `:3030` (case 7).
- **Headless Chrome 156 over CDP:**
  - two throwaway profiles: anonymous on `:9441`, and the scratch member signed in once through the BFF on `:9442`;
  - `Emulation.setDeviceMetricsOverride` at true viewports (390 at DPR 3), with `--disable-features=OverlayScrollbar`;
  - `Page.printToPDF` for paper, `pdftoppm` with `compare` for pixels.
- **Scratch stack**, because `:3030`'s database has no fixtures:
  - API `:8981` (the repo's uvicorn), database `kb_p8jbff1` in `kb-p28s2-pg`, migrated with `alembic upgrade head`, root in the scratchpad;
  - account `p8f1`; the fixture book via `scripts/publish_fixture_book.py`; loose documents `f1-tables` (v1, then a v2 for the archive page), `wide-short`, `wide-loose` and `f1-long`; both fixture projects made public.
- **Before and after:**
  - "before" is round 1's production build of the unchanged source (its clone's `src` is byte-identical to `HEAD`), served on `:3982`;
  - "after" is `pnpm --dir web build` of this change, served on `:3984`;
  - "dev" is an APFS clone of `web/` with the two files copied in, `next dev` on `localhost:3983`;
  - all three run against the same API.
- **Scripts and evidence:** session scratchpad `f1/`: `t.mjs` (table probe), `battery.sh`, `cmp.py`, `lt.mjs` (long tables and sticky header), `rs.mjs` (live resize), `ax.mjs` (AX tree and Tab walk), `pr.mjs` (print), `fpr.mjs`/`dump.mjs`/`ddiff.py` (fingerprints), `arch.mjs` (archive page), results in `f1/out/`, screenshots in `f1/shots/`, PDFs in `f1/pdf/`.
- **Cleanup:**
  - the API, both `next start` servers, the dev server (parent and `next-server` child) and both Chromes are stopped by PID; ports 3982–3984, 8981, 9441 and 9442 are free;
  - `DROP DATABASE kb_p8jbff1` done, count 0 afterwards;
  - `:3030` (node 8452) and `:8766` (66506) were never touched and still listen. The other sessions' `kb_s12live`…`kb_s19live` were not touched;
  - a first Chrome launch got bad arguments (zsh does not word-split `$pair`). I killed it; its profile directory `f1/chrome/` is left in the scratchpad (my removal command was denied). It is harmless and session-only.

## Observations (not F1 findings)

1. **A long table's box state depends on its history after a narrow resize.** This is a property of P30's long-table rule, `.kb-ch-table--long.is-over td { white-space: nowrap }`. Once a long table goes over, its nowrap width keeps it over when the window widens again.
   - It predates the phase. On the **before** build, `f1-long` (5×25, medium cells) loaded at 1440 fits page-level. After a resize to 390 and back to 1440 it stays boxed (559/629). The after build gives the same numbers.
   - With F1, a wide and long table that fits at ≥1600 shows it too: page-level on load, boxed with nowrap (687/947, a real scroll) after an excursion below the step, or after anything that lays the page out narrow for a moment. CDP's `captureBeyondViewport` screenshot does that: it fires a 1×1 resize.
   - Both states are designed states, and the boxed one really scrolls; nothing false is shown. Fixing it means measuring a long table's overflow from its wrapped width. That changes the signed long-table logic, and below 1600 too, so it is outside this phase's "unchanged below 1600".
   - **Deferred-job candidate:** title "A long table's box state depends on history after a narrow resize". Reason: the nowrap-on-overflow rule latches the box. Trigger: the next reader-tables phase or a QA sweep.
2. **The archive page** renders native tables without the reader's CSS. So every wide table shows the "Scroll sideways…" hint as plain text, before and after; this predates the phase (D-pzs7 owns that page). F1 only stops non-scrolling wide tables there from being announced as scrolling regions.

## Notebook

- `## Decisions`: appended "Wide tables from the 1600px step (F1): …", linking this file.
- `## Doc impact`: appended the line in the verdict block.
- `## Notes for later slices`: removed round 1's F1 note (consumed). Appended one note for the re-review, with the decided-as-drawn items and the observations.
- `## Now`: rewritten for the re-review.
- `## Operator Questions`: none raised. The wide-and-long consequence follows the operator's words ("they simply get the wider column") and the signed §9 rule, and it is cheap to reverse, so it is a decision, not a question.
