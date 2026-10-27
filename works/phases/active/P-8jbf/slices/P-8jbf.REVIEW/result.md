# P-8jbf.REVIEW result: phase review of "Wide reader on big screens"

- **status:** done
- **route:** high
- **model:** opus
- **effort:** xhigh
- **summary:** Reviewed P-8jbf, whose only product change is one rule in `web/src/app/reader.css`. In the operator runtime, the production build and the dev runtime, every value the intent pins holds, and lint, typecheck, build and validate all pass. One problem class fails. From 1600px the 44rem column is exactly as wide as the wide-table `min-width: 44rem`, so an 8+ column table whose cells fit gets a 2px scroller, a "Scroll sideways" hint and a fade over its last column. Verdict: changes_requested, with fix slice P-8jbf.F1 (risk high).
- **files_changed:** `works/phases/active/P-8jbf/slices/P-8jbf.REVIEW/result.md`; `works/phases/active/P-8jbf/phase.md` (through `phase-section` only: `## Now` replaced, one entry appended to `## Notes for later slices`)
- **validation:**
  - `python3 scripts/workflow.py validate`: pass (only the existing warnings about stale and oversized docs)
  - `pnpm --dir web lint`: pass (exit 0)
  - `pnpm --dir web typecheck`: pass (exit 0)
  - `pnpm --dir web build`: pass (exit 0)
  - S1's verdict-block commands (lint, typecheck, build) were re-run above. DECOMP's command (`validate`) was re-run above.
  - Live, in the operator runtime: Aside `u1` at 1440 on `:3030`, and headless Chrome 156 (CDP) on `:3030` at 1440, 1599, 1600, 1920 and 2560. Result: pass.
  - Live, on a scratch stack: production build `:3972` and dev `:3973`, fixture book and loose documents, anonymous and signed in. Every pinned value passes. **Finding 1 fails** (the wide table).
- **deviations:** none. The scratch stack is the one the plan allows where `:3030` lacks data. All scratch servers and Chromes are stopped and `kb_p8jbfrv` is dropped. `:3030` and `:8766` were never touched.
- **review_verdict:** changes_requested
  1. **Finding 1: the 8+ column ("wide") table code assumes a wide table always overflows the reader column. From 1600px that is false.**
     - **Cause:** `.kb-ch-table--wide table { min-width: 44rem }` (`reader.css:716`) is now exactly the column width (704px). The box's 1px borders (`.kb-ch-table__scroll`, `reader.css:706`) leave 702px inside it.
     - **Failing case (observed):** an 8-column table with short cells, at 1600, 1920 and 2560, sizes 1, 3 and 5, in the production build and in dev. The box is client 702 / scroll 704 and gets `is-over is-more-r`. The hint "Scroll sideways for all 8 columns →" shows, a fade covers column H, and a 2px horizontal scrollbar appears (`shots/wide-short-1920.png`, scratchpad).
     - **Latent case (appears once the first is fixed):** a wide table that fits still renders `role=region`, `tabindex=0` and `aria-label="Table, 8 columns, scrolls sideways"`. The cause is `const box = wide || long || m.over` (`web/src/components/reader/scroll-box.tsx:116`). The result is a false announcement and a tab stop that does nothing.
     - **Cases that already pass and must stay:** the same table below 1600 (574/704: scrolls, hint, fade, region); a 9-column table with long cells at 1600 and up (702/739, scrolls legitimately); the long-table box (more than 20 rows).
     - S1's observation (its `result.md`, line 76) says such a table "fits the column without a horizontal scroller". That is false.
     - **Proposed fix slice:** **P-8jbf.F1**: `--kind fix --risk high` (it repairs mid-row work; S1 ran on `route: mid`). Files: `web/src/app/reader.css` (inside the existing `@media screen and (min-width: 100rem)` block only) and `web/src/components/reader/scroll-box.tsx`. The acceptance matrix is below.
- **doc_versions:** none — deferred to a docs phase. The verdict is changes_requested, so the pass-only gate sections (the `## Regression Checklist` append) were not written.
- **doc_impact_added:** none (pass-only; see "For the orchestrator")
- **walkthrough:** none. The verdict is not a pass, so the gate opens only after a passing re-review. The stage-3 fresh-eyes notes are recorded below for the re-review to reuse.
- **explain:** not written — run /knowledge:explain P-8jbf for one chapter, or create an explain phase for a book

## Finding 1 in detail, and F1's acceptance matrix

**Class:** the wide-table rules (CSS `min-width: 44rem`; TableBox `box = wide || …`) were written for a column that is never wider than 36rem, where an 8+ column table always overflows. The phase's 44rem step breaks that assumption. Below 1600px the assumption still holds.

**Evidence** (fixture `wide-short`, 8 columns, short cells, same numbers in prod `:3972` and dev `:3973`):

| window | sizes | box client / scroll | classes | hint | aria-label |
|---|---|---|---|---|---|
| 1440, 1599 | 1, 3, 5 | 574 / 704 | `is-over is-more-r` | shown | "Table, 8 columns, scrolls sideways" (true) |
| 1600, 1920, 2560 | 1, 3, 5 | **702 / 704** | `is-over is-more-r` | **shown** | "…scrolls sideways" (a 2px scroll) |

Long cells (fixture `wide-loose`, 9 columns): 574/739 below 1600, 702/739 from 1600. The table really scrolls there, which is correct.

**Proposed approach** (F1's plan decides the exact values):
- **CSS:** under the existing step, let a wide table's minimum fit inside the box, e.g. `.rd-article .kb-ch-table--wide table { min-width: 0 }` or `100%`. A table whose cells need more room still grows and scrolls through measurement.
- **TableBox:** for a wide table that is not long, make the region role, the tab stop and the "scrolls sideways" label follow measurement once it is known. Keep today's server-rendered default, because below 1600 a wide table always overflows. Dropping `wide` from `box` outright would make the hint `<p>` and region attributes appear only after hydration (a layout shift below the step).

**F1 acceptance matrix:**
1. 8-column short table at 1600, 1920 and 2560, sizes 1, 3 and 5: no overflow (scroll width ≤ client width), no `is-over`, no hint, no fade, no scrollbar, right border visible.
2. The same table at 1599, 1440 and 390: unchanged (scrolls, hint, fade, region, label).
3. A wide table with long cells at 1600 and up (`wide-loose`, 9 columns) still scrolls, with its hint and fade.
4. A long table (more than 20 rows, 8 columns): its designed box and "Scroll in the table" behaviour at every width.
5. A wide table that fits is not announced as "scrolls sideways" and is not a tab stop. A wide table that scrolls keeps both. No layout shift on load below 1600 (the server-rendered markup there is unchanged).
6. Print: A4 and Letter, chapter and loose document, pixel-identical to today.
7. Review, book, book-notes and legacy pages unchanged. Every TableBox consumer is checked.
8. `pnpm --dir web lint`, `typecheck` and `build` pass; `validate` passes.

## Instruments and setup

- **Manifest:** `## Operator Runtime` in `docs/current/operations.md` is filled, with no `UNFILLED` marker. It records dev `:3030`, the production-build check, Aside `--account u1` fixed at 1440×900, and headless Chrome over CDP for other viewports.
- **Aside `u1`** (`aside repl --account u1`), 1440 on `:3030` (`/@p28s2/research/focus-ring-floor-and-touch-targets`):
  - viewport 1440, `--rd-measure` 36rem, prose 432–1008 (576px), 18px, h1 43.2px;
  - the wide rule is loaded in the CSSOM and does not match; no horizontal scroll.
- **Headless Chrome 156 on `:3030`:**
  - 1440 and 1599: 576px, 18px, with a fingerprint identical to the page with the rule deleted from the CSSOM;
  - 1600, 1920 and 2560: 44rem, 704px, 20px, h1 48px, line-height 33px.
- **Scratch stack** (`:3030`'s database has no public chapters or fixtures):
  - API on `:8971` (the repo's uvicorn) on database `kb_p8jbfrv` in container `kb-p28s2-pg`;
  - a web clone running as a production build (`next start`, `:3972`) and as dev (`:3973`);
  - three headless Chromes: signed in, anonymous, and a second organisation's member;
  - fixtures published through the CLI under org `p8rv`: the book `fixture-guide` (chapters `all-blocks`, `write-lock`, `legacy`, plus KO), and the loose documents `compound-growth`, `wide-loose` and `wide-short`.
- **Before/after method:** "before" is the same page with the `@media (min-width: 100rem)` rule deleted from the CSSOM. That is the signed pre-phase state, without a second build.
- **Cleanup:** API, dev, prod and the three Chromes stopped. `DROP DATABASE kb_p8jbfrv` done (count 0 afterwards). `:3030` (node 8452) and `:8766` (66506) still listening and untouched. The repo tree is unchanged apart from the orchestrator's own state files and this result.

## Pinned values (every one holds)

Production build, chapter `all-blocks`, the loose documents and KO, anonymous and signed in:

| window | column | `--rd-measure` | prose | h1 / h2 | code, table | outside column | page h-scroll | vs. rule removed |
|---|---|---|---|---|---|---|---|---|
| 1440 | 576 (424.5–1000.5) | 36rem | 18px | 43.2 / 26.1 | 15px | 0 | 0 | identical |
| 1599 | 576 (504–1080) | 36rem | 18px | 43.2 / 26.1 | 15px | 0 | 0 | identical |
| 1600 | 704 (440.5–1144.5) | 44rem | 20px | 48 / 29 | 16.67px | 0 | 0 | changed (intended) |
| 1920 | 704 (600.5–1304.5) | 44rem | 20px | 48 / 29 | 16.67px | 0 | 0 | changed (intended) |
| 2560 | 704 (920.5–1624.5) | 44rem | 20px | 48 / 29 | 16.67px | 0 | 0 | changed (intended) |

- **Five sizes at 1920:**
  - prose 16.667 / 18.333 / 20 / 22.222 / 24.444px (= 15 / 16.5 / 18 / 20 / 22 ×10/9; at 1599 they stay 15 / 16.5 / 18 / 20 / 22);
  - line-height, h1/h2/h3, code, table and quiz text follow `--rd-k` / `--rd-fs`;
  - the column stays 704 at every size.
- **Diagrams:** the first diagram is 218–224px wide at 1920 for every size. At 1599 it is about 180px for sizes 1–4, and fills the 576px column at size 5. That is the diagram's own em-relative narrow mode: 576/22 = 26.2em switches it, while 704/24.44 = 28.8em does not. At 1600 and up it behaves as it does at 1599 sizes 1–4, inside the column.
- **Rail** (signed in, with a highlight and a note):
  - 256px wide, 24px from the column at 1599, 1600, 1920 and 2560;
  - room on its right 224 / 160.5 / 320.5 / 640.5px; it never overlaps.
  - The highlight, the note ("A review note written at 1920.") and a section bookmark persist across a reload.
- **Display panel at 1920:** it sits outside `.rd-article` (16px chrome) and switches sizes live (size 5 → 24.444px, size 1 → 16.667px, size 3 → 20px); the column stays 704.
- **Old version** `?v=1`: 704px, 20px, "OLDER VERSION" banner and "Read v2 →".
- **Not-found chapter state:** sits in `.rd-article`, so it takes the step, as intended.
- **Print from a 1920 window:**
  - `--rd-fs` 14px and `--rd-measure` 36rem (the step is `screen` only);
  - PDFs rasterised and compared, pixel-identical with and without the rule: chapter A4 8 pages, Letter 9; loose A4 10, Letter 11;
  - masthead, "Answers" key and colophon present.
- **DPR 2 with classic scrollbars, 1600–2560:**
  - no inner vertical scroller;
  - no horizontal scroller except the 9-column long-cell table's box (463/1317), which also scrolls at 1440.
- **Unchanged pages at 1600, 1920 and 2560** (book anonymous and signed in, legacy, book-notes, review, archive `/documents/1/versions/1`, library, public `/@p8rv`):
  - zero `.rd-article` on any of them, `--rd-measure` 36rem;
  - fingerprint identical with and without the rule.
- **Nothing restyled beyond the rule:** the diff is the one 14-line block (`git diff ec5f3bf..679a144 -- web/`).

## Gate stages (acceptance required)

1. **Manifest:** filled; see "Instruments and setup".
2. **Opened the running product myself:** Aside `u1` at 1440 on `:3030`, Chrome on `:3030` at 1440–2560, plus the scratch production build and dev. The headline claims (column, sizes, rail, print, unchanged pages) were spot-checked and hold. S1's wide-table claim was spot-checked and does not hold (Finding 1).
3. **Fresh-eyes walk of the reader at 1600 and up** (a first-time reader: the library → the book → a chapter → Display → the notes rail → an old version → a bad link):
   - The wider column with 20px text reads comfortably. At 2560 the column sits centred with wide empty margins, as drawn.
   - Dead or annoying: **the phantom 2px scroller on 8-column tables**, with its "Scroll sideways" hint pointing at nothing (Finding 1).
   - Not caused by this phase: the fixture's inline image renders as a block with a dangling "." on the next line. This is width-independent and predates the phase.
   - Nothing else was dead or confusing.
4. **Regression Checklist** (`docs/current/qa.md`; L<n> = the n-th line of the section). Results are in the table below.
5. **Operator Questions:** OQ1 is resolved and collapsed to its pointer, so it counts as routed. No open entries. This review raised none (it settled F1's approach by recommendation, per "full auto").
6. **Walkthrough:** not returned, because the verdict is changes_requested. On the passing re-review, the plan's "S1's wide-table consequence" belongs in decided-as-drawn as F1 lands it: "an 8+ column table that fits the 44rem column shows without a scroller, hint or fade; one that does not fit still scrolls".

### Regression Checklist: inside / outside

Boundary: `phase-scope P-8jbf` lists one product file, `M web/src/app/reader.css` (range `ec5f3bf..679a144`, 5 commits).

`reader.css` is imported by `reader-frame.tsx`, `book-frame.tsx`, `book-notes.tsx`, `legacy-reader.tsx`, `review-static.tsx` and `review-app.tsx`. Inside lines are therefore every line whose surface is a reader, book, book-notes, legacy or review page. **Inside: 14 lines. Outside: 20 lines.**

| line | surface | result |
|---|---|---|
| L12 reader chapter on a 390 phone | chapter | pass: page width 390 signed in with the quiz answered; Contents sheet 0–390 × 115–844, fits. The Notes sheet result was not captured by the probe. At 390 the step cannot match (`100rem` is 1600px). |
| L13 quiz shows one foot sentence | chapter | pass at 1920 in light, dark and sepia: 1 of 2 `.qz-st` visible |
| L14 no inner vertical scroller, DPR 2 | chapter, loose | pass at 1600–2560: no inner vertical scroller. The only horizontal box is the long-cell table (designed). The 2px wide-table box is Finding 1 (horizontal, so outside this line's wording). |
| L15 legacy frame is the only scroller | legacy | pass at 390, 820, 1024, 1440, 1600, 1920 and 2560: page `scrollHeight` = `innerHeight`. The links, Bookmark and resume pill were not re-run: the legacy page has no `.rd-article`, and its fingerprint is identical with and without the rule. |
| L16 deep link lands under the top bar | chapter | pass at 1920, fresh load anonymous and signed in: `#code` heading top 72, bar bottom 59. The sign-in round trip was not re-run (same anchor code). |
| L19 resume | chapter | pass at 1920: lands at y 4300 vs 4351 saved, with "Picked up where you left off". "From the top" goes to y 0 and clears the pill. |
| L20 quiz save | chapter | pass: "Your answer from 27 Oct 2026" after a reload. Signed out shows "Sign in to save" and saves nothing. |
| L21 annotations persist | chapter | pass for persistence at 1920 (highlight, note, section bookmark). Re-anchoring after a new version was not re-run: it is server-side and width-independent, and the Notes sheet is outside `.rd-article`. |
| L22 review cards | review | not re-run as a flow. The rule cannot reach it: zero `.rd-article`, fingerprint identical with and without the rule at 1600, 1920 and 2560. |
| L23 visibility | chapter, book, document | pass: private chapter, book and document give the same not-found as missing ones, signed out and as the other org's member. The chapter state renders in the 704px column. Visibility was restored. |
| L24 print | chapter | pass: A4 and Letter pixel-identical with and without the rule, with masthead, answers and colophon. The legacy notice sheet was not re-run (no `.rd-article`, and print is excluded by `screen`). |
| L25 text size 150%/200% at 390 and 820 | chapter, book, review | **not a clean pass.** Book and review pass at every combination. The chapter fails at 390/200%: page 397 vs 390, caused by `BUTTON.rd-btn.rd-btn--secondary` "Show answer" in `.qz-card--hidden`. Identical with the rule removed, and the step cannot match at 390, so it **predates this phase**. It is an observation and a deferred-job candidate, not a finding. |
| L26 reader chrome | chapter | pass at 1440 and 1920, the same sequence at both: open shown/shown; down hides both; a small up shows nothing; a deliberate up shows the top bar only; a tap shows both; a second tap hides both; the bottom bar shows at the end. Not re-run: 390 and 820 (below the step) and the legacy chapter (no `.rd-article`). |
| L27 Next opens at the top | chapter | pass at 1920: Next from the middle opens `write-lock` at y 0, API state `started`. (A tap on a code block is designed not to toggle, so the probe tapped a paragraph.) |

Outside (20): L1–L11 (site build and smoke, the explain marker, validate, graph, the console's project, document, print and 390 views, login return), L17 old links (server redirects), L18 library (imports only `reader-fonts.css`), and L28–L34 (CLI, skills, explain sessions, landing). The proof is the diff: none of those surfaces imports `reader.css`. The library and the archive document page were measured anyway: zero `.rd-article`, fingerprint identical with and without the rule.

## Notebook cross-check

- `## Decisions` holds the breakdown gist and the scope/step gist, both linking `topics/breakdown.md`. No decision recorded in DECOMP's or S1's `result.md` is missing. `validate` reports no dangling-pointer warning.
- `## Operator Questions`: OQ1 is resolved and collapsed, so it counts as routed.
- `## Doc impact`: S1's product.md/qa.md line is there. Completing the list is pass-only work, so it waits for the re-review; see "For the orchestrator".
- DECOMP's deferred candidate, the orphaned `/documents/{id}/versions/{v}`, is already filed as D-pzs7.

## Deferred-job candidates (for the orchestrator to file; I file nothing)

1. **"Quiz Show answer button overflows a 390 phone at 200% root text."**
   - Reason: L25 fails on the chapter at 390/200% (page 397 vs 390), caused by `.rd-btn--secondary` "Show answer" in `.qz-card--hidden`. Identical without P-8jbf's rule, so it predates this phase.
   - Trigger: the next reader/quiz phase, or an operator QA sweep.
2. (Low value, optional) **"An inline image renders as a block, leaving the following '.' on its own line."**
   - Reason: seen in the fixture chapter at every width; it predates this phase.
   - Trigger: the next reader-content phase.

## For the orchestrator (notes, not findings)

- **Stale objective:** the objective in `phase.json` and in `phase.md` `## Objective` still states the superseded rule ("article grows from 64rem toward 88rem… paragraph 42→50rem… body ~18px"). The confirmed intent is 36→44rem at 1600px or more, ×10/9, default 20px. I recommend correcting it before the re-review, so the gate's walkthrough and the archive quote the rule that shipped.
- **Doc impact to complete at the passing re-review:**
  - S1's line names product.md and qa.md. P30 recorded the reader shell's CSS rules in frontend.md (P30 `topics/doc-impact-detail.md`). A line likely belongs there and in decisions.md: the 1600px step is an operator-worded exception to the signed `01-reader`; it is `@media screen and (min-width: 100rem)` on `.rd-article` only, with `--rd-fs-s` re-declared and never on `.rd-root`, `.rd-size-N` or `.rd-page`; a later fidelity pass must not undo it.
  - F1 should add its own wide-table line.
- **Scratch databases from other sessions:** `kb_s12live` … `kb_s19live` sit in `kb-p28s2-pg`. They are not mine, and I did not touch them.
- **Scratchpad leftovers:** files from one mis-launched Chrome profile remain in this session's scratchpad (my removal command was denied). They are harmless and session-only.
- **Team rules:** n/a (at-root install).
