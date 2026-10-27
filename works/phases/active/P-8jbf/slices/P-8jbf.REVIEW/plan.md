# P-8jbf.REVIEW — plan

Mode: `auto`. The phase review, high row. The acceptance gate is **required**. The
operator has asked for an unattended run ("no blocker. full auto"): settle any judgment call
by recommendation and record it; the gate itself stays the operator's.

## The boundary

`phase-scope P-8jbf`: range `ec5f3bf..679a144`, 5 commits, `product_files=1`:
`web/src/app/reader.css` (one `@media screen and (min-width: 100rem)` block scoped to
`.rd-article`). Re-run only the `## Regression Checklist` lines (`docs/current/qa.md`) whose
surface that file feeds — the reader's document and chapter view, its sizes, its margin
notes, its print — never the whole list. Anything noticed outside the boundary is an
observation or a deferred-job candidate, never a finding. Single-repo, at-root install: no
team-rules check.

## What to review

1. **Validation:** `python3 scripts/workflow.py validate`; both slices' verdict blocks;
   `pnpm --dir web lint`, `pnpm --dir web typecheck`, `pnpm --dir web build`.
2. **Against the intent:** read `intent.md` (the re-targeted *Confirmed Intent*; the
   *Superseded* subsection is history) and the diff. Every pinned value holds: ≥1600px
   window, `--rd-measure` 44rem, the five sizes ×10/9 (default 20px), `--rd-k` following,
   blocks in the one column, rail following; unchanged below 1600px, print, Display panel
   controls, bars, sheets, and the review, book, book-notes, legacy and archive pages.
   Nothing restyled beyond the rule (RESPECT THE DESIGN).
3. **Gate stages — open the running product yourself** (never pass on S1's report alone),
   per `## Operator Runtime` (`docs/current/operations.md`, that section only): Aside `u1`
   at 1440 on the operator's runtime, and headless Chrome (`--window-size` / CDP, the
   manifest's wide-viewport instrument) at 1599, 1600, 1920 and 2560. Spot-check the
   headline claims: column width and computed body font size at each width; a code block,
   table, figure or diagram staying in the column; the margin-notes rail beside the column
   (signed-in, Notes on; mind the login limiter); print unchanged; one of the review / book /
   book-notes / legacy pages unchanged. Use the operator's `:3030` runtime where its data
   allows, and a scratch stack per S1's `result.md` recipe where it does not; stop every
   scratch server you start and drop any scratch database. Walk the reader once as a
   first-time user on a wide screen.
4. **Regression Checklist:** re-run the in-boundary lines; append this phase's headline
   check(s) (the wide step's measure and sizes at ≥1600px, unchanged below) through the
   review's `## Regression Checklist` write (the qa gate section, `doc-new-version` for that
   section only, per the `review-phase` skill).
5. **Notebook:** `## Doc impact` has S1's line (product, qa); verify it is complete
   (`doc_impact_added:` if a line is missing). `## Operator Questions`: OQ1 is resolved
   (collapsed with a pointer), so it counts as routed. File nothing yourself; list deferred
   candidates for the orchestrator (the archive-page job D-pzs7 is already filed).

Do not edit `reader.css` or any source: findings are reported, never silently fixed. On a
non-passing verdict, finish the whole judgment first, then return numbered findings, one
proposed fix slice per problem class (`fix`, its risk; `high` for a defect in this mid-row
work).

## On pass: the walkthrough

By the contract's stop rules: about 2k characters plus links, at most ~5 decisions, the rest
in one "decided as drawn" list, and "accept" signs everything. It tells the operator how to
see it: open a document or a book chapter in the reader on a PC screen at least 1600px wide
(their runtime from `## Operator Runtime`), compare with a narrower window, try the text
sizes in the Display panel and Notes. Include the one consequence S1 flagged (a wide table
that used to scroll now fits the wider column at ≥1600px) in decided-as-drawn.

Return `review_verdict`, `doc_versions` (the qa gate section only, or `none`),
`doc_impact_added`, the fixed
`explain: not written — run /knowledge:explain P-8jbf for one chapter, or create an explain phase for a book`
pointer, and the `walkthrough`. `result.md`, verdict block first. Do not run `accept-gate`
or `review-phase`, commit, or move state.

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
