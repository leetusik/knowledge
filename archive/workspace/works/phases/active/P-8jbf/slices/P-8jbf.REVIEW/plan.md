# P-8jbf.REVIEW — plan, round 2

Mode: `auto`. The phase review, high row, **round 2** (bounded). The acceptance gate is
**required**. The operator asked for an unattended run ("no blocker. full auto"): settle any
judgment call by recommendation and record it; the gate itself stays the operator's.

Round 1 (commit `00ffd3c`, plan in git history) returned changes_requested with one finding,
Finding 1 (a short 8+ column table got a 2px phantom scroller, hint and fade from 1600px), and
cut **P-8jbf.F1** (committed `fbb13db`). Round 1's `result.md` is the record of everything
else: keep it, moved down unchanged under a `## Round 1 (kept)` heading below round 2's
verdict block, so its references stay valid.

## The boundary

`phase-scope P-8jbf`: range `ec5f3bf..fbb13db`, 7 commits, `product_files=2`:
`web/src/app/reader.css` (S1's `@media screen and (min-width: 100rem)` block on `.rd-article`,
and F1's one rule inside it) and `web/src/components/reader/scroll-box.tsx` (F1: the measure's
`measured` flag; TableBox's `region`). Anything outside it is an observation or a deferred-job
candidate, never a finding. Single-repo, at-root install: no team-rules check.

## What round 2 checks (the review-phase skill's *Re-review rounds are bounded*)

1. **F1 against its full case list**: the 8-case acceptance matrix in
   `slices/P-8jbf.F1/plan.md`, opened yourself in the running product, never passed on F1's
   report alone. At minimum: an 8-column short table at 1600, 1920 and 2560, sizes 1, 3, 5 (no
   overflow, no `is-over`, hint, fade or scrollbar, right border visible, not a region or tab
   stop); the same at 1599, 1440 and 390 (unchanged: scrolls with hint, fade and region); a
   wide table with long cells from 1600 (still scrolls, hint, fade, region); a long table's box
   at every width; print (A4 and Letter, chapter and loose document) unchanged; no layout shift
   on load below 1600.
2. **F1's blast radius**: every reader of the two files it touched. `useBox`'s other users
   (`figure-parts.tsx`, `diagram-figure.tsx`: wide figure and diagram boxes still scroll, hint
   and fade as signed, at 1440 and 1920); TableBox's one consumer `render.tsx`'s `table()` in
   the reader and on the archive page `/documents/{id}/versions/{v}`; `chrome.ts`'s tap filter.
   Judge F1's one decided consequence: from 1600 a wide **and** long table that fits now reads
   page-level with its sticky header (the long table's signed fit form), where it used to sit in
   a phantom-triggered box. If it holds the signed long-table form faithfully, list it in
   decided-as-drawn; if it breaks a signed element, it is a finding.
3. **The validation suite**: `pnpm --dir web lint`, `typecheck`, `build`, and
   `python3 scripts/workflow.py validate`.
4. **Reuse round 1 by reference** for everything F1 did not touch: the pinned values (44rem
   column, five sizes ×10/9, default 20px, `--rd-k`), the rail, code, figures and diagrams in
   the column, the other pages, print of non-table content, and round 1's fresh-eyes walk. Do
   one short wide-screen walk (a book chapter with a table, at 1920) to confirm the whole still
   reads as one, not a full re-walk. A new problem in F1's surface is a finding; a new problem
   elsewhere in the boundary is a finding only when round 1 could not have seen it (say why);
   otherwise a deferred-job candidate. If Finding 1's class fails again, mark it
   `repeat of round 1 finding 1`.

**Instruments**, as round 1 and F1 used them (their `result.md` hold the recipe): `## Operator
Runtime`'s dev runtime `:3030` where its data allows; a scratch stack (scratch API + fixture
book, dev copy, production build) where it does not; headless Chrome (CDP) for wide widths;
Aside `u1` for 1440. Stop every scratch server and Chrome you start and drop any scratch
database you create; never touch `:3030`/`:8766` processes or other sessions' databases
(`kb_s12live` … `kb_s19live`). Name the instrument in `result.md`.

## On pass

- **Regression Checklist** (qa gate section, `doc-new-version` for that section only, per the
  `review-phase` skill): re-run the in-boundary lines round 1 listed as inside, reusing round 1
  where F1 did not reach them; append this phase's headline checks: the wide step (≥1600px:
  44rem column, default text 20px, the five sizes ×10/9; below 1600 unchanged) and the wide
  table (≥1600px: an 8+ column table that fits shows whole, not a region; one wider still
  scrolls with hint and fade).
- **`## Doc impact`**: complete it (round 1 noted frontend.md and decisions.md for the step;
  F1 added its line). Append what is missing yourself and report it under `doc_impact_added:`.
- **`## Operator Questions`**: OQ1 is resolved (collapsed), so it counts as routed.
- **Deferred jobs** already filed: D-pzs7 (archive page), D-19n8 (quiz "Show answer" overflow at
  390/200%), D-6pf9 (a long table's box state depends on resize history, F1's observation).
  File nothing yourself; list any new candidate for the orchestrator.
- **The walkthrough**, by the contract's stop rules: about 2k characters plus links, at most ~5
  decisions, the rest in one "decided as drawn" list, and "accept" signs everything. How to see
  it: open a document or a book chapter in the reader on a screen at least 1600px wide (their
  runtime from `## Operator Runtime`), compare with a narrower window, try the five text sizes
  in Display and Notes on. Decided-as-drawn includes: an 8+ column table that fits the 44rem
  column shows without a scroller, hint or fade (one that does not fit still scrolls); a wide
  and long table that fits reads page-level with its sticky header; and the one S1 flagged (a
  wide table that used to scroll below the step now fits the wider column).
- Rewrite `## Now` (≤15 lines) for the gate.

Do not edit `reader.css`, `scroll-box.tsx` or any source: findings are reported, never silently
fixed. On a non-passing verdict, finish the whole judgment first, then return numbered
findings, one proposed fix slice per problem class.

Return `review_verdict` (`round 2`), `doc_versions` (the qa gate section only, or `none`),
`doc_impact_added`, the fixed
`explain: not written — run /knowledge:explain P-8jbf for one chapter, or create an explain phase for a book`
pointer, and the `walkthrough`. `result.md` titled `round 2`, verdict block first. Do not run
`accept-gate` or `review-phase`, commit, or move state.

## Dispatch

route=high
reason=kind review
subagent_type=slice-executor
model=opus
pass_model=yes
effort=xhigh
pass_effort=yes
attribution=Claude Opus 5.5
explore_model=haiku
explore_effort=xhigh
