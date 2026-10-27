# P-8jbf.DECOMP — plan

Mode: `auto` (the operator's standing word for `/do-whole-phase`, and "rightaway" here).

## Goal

Cut P-8jbf into its middle slices and write `topics/breakdown.md`. Read `intent.md` first:
it pins the whole visual rule (the document reader only; above 100rem / 1600px of app
width the article grows from 64rem toward the 88rem app maximum, the reading column from
42rem to 50rem, body text 16px → 18px; phone, tablet, laptop and print unchanged). **Not a
design phase:** the operator decided the rule in words and declined a design round, so no
`## Design Style` is owed and no `co-work` slice is cut; do not stop to ask a style.

## Read

- `web/src/app/kb-tokens.css` (`--kb-measure`, `--kb-app-read-w`, `--kb-app-max-w`),
  `web/src/app/kb-docview.css` (`.kb-doc`, the `.kb-prose` grid, full view
  `.kb-app[data-kb-view="full"]`, the container queries `kbapp` / `kbmain`),
  `web/src/app/kb-console-responsive.css` (the app-main caps and breakpoints),
  `web/src/app/kb-print.css` (reads the measure; must not change), and the document view's
  components under `web/src/app/(public)/documents/` and `web/src/components/` as far as
  they set widths. Find every place the reader's widths come from, including any Tailwind
  `max-w-[...]` on the document surfaces and the explainer frame, so the cut slice knows
  its full set.
- `docs/current/operations.md` `## Operator Runtime`, for how the reader runs and which
  instrument verifies wide viewports (Aside is pinned at 1440×900; the manifest records a
  headless-Chrome/CDP instrument for other viewports). Read only that section.

## Expected cut (the executor decides)

One implementation slice is the expected shape: `P-8jbf.S1`, the wide-screen rule in the
reader's CSS, verified in a real browser at 1440 (unchanged: below the step), 1920 and
2560px, in the normal and full views, plus a print check that nothing moved. `--kind
implementation --risk low` (mid row): the values are pinned, the approach is a scoped
container query; rate it `high` only for a named trigger you find. `--depends-on none`.
Split only for a real reason, chained with `--depends-on`.

The breakdown's slice block carries goal, set (every file it may touch), risk and trigger,
`spends money: no`, depends on; plus `## Passes` and `## Estimate` (from
`python3 scripts/workflow.py dispatch-summary`'s `means` block).

## Rules for this slice

- `new-slice` bare folders only (no `plan.md`), each declared with `--depends-on`.
- Breakdown in `topics/breakdown.md`; in `phase.md` only gist lines through `phase-section`
  (a `Breakdown (DECOMP): …` line under `## Decisions`, `## Notes for later slices` for S1
  if useful, and `## Now`).
- No `accept-gate`, commit or status moves. The orchestrator declares the gate after
  `finish-slice`: `--require` (an operator-visible surface changes).
- Return `parallel:` as `parallel-plan P-8jbf` prints it.

## Dispatch

route=high
reason=kind decomposition
subagent_type=slice-executor
model=opus
pass_model=yes
effort=xhigh
pass_effort=yes
attribution=Claude Opus 5.5
explore_model=haiku
explore_effort=xhigh
