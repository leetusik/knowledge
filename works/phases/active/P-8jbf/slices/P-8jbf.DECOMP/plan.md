# P-8jbf.DECOMP — plan (pass 1 re-run, after OQ1)

Mode: `auto` (the operator's standing word for `/do-whole-phase`, and "rightaway").

Pass 1 halted `needs_operator` on OQ1: the first rule targeted the console `.kb-doc` view,
which renders only an unlinked archive page. The operator answered "as your recommendation";
`intent.md`'s *Confirmed Intent* is now re-targeted to the reader. **Re-read `intent.md`
first**; its *Superseded* subsection is history, not the rule.

## Goal

Cut P-8jbf into its middle slices and rewrite `topics/breakdown.md` in place. The rule
(pinned in `intent.md`, nothing to invent): on the signed `01-reader`
(`web/src/app/reader.css`), loose documents and book chapters, only above 100rem (1600px)
of window width: `--rd-measure` 36rem → 44rem; every one of the five text sizes ×10/9
(default 18 → 20px), with spacing, headings, title and code/table text following through
the reader's existing calc chain; code, tables, figures and diagrams stay in the column; the
margin-notes rail follows the column. Unchanged: below 1600px, print, the Display panel's
controls, the top and chapter bars, and the review, book, book-notes, legacy html reader and
archive pages. **Not a design phase**: the operator decided the rule in words; no
`## Design Style`, no `co-work` slice.

## Read

Your own `topics/reader-surface.md` (the finding, the provisional S1 set and gotchas) and
the notebook's `## Notes for later slices` entry for this re-run (consume it at the end with
`--entry K --remove`). Re-check only what the cut needs: that `.rd-root` / `--rd-measure` are
shared with the review, book, book-notes and legacy roots (so the rule must be scoped to the
document and chapter reader only), and how `.an-rail` is placed from the measure.

## Expected cut (you decide)

One implementation slice, `P-8jbf.S1`: the wide-screen rule in `reader.css`, scoped to the
document and chapter reader, verified in a real browser by the `## Operator Runtime`
instrument for wide viewports (headless Chrome `--window-size`, proven at 1920 in pass 1;
Aside is fixed at 1440×900) at 1440 (unchanged), 1600/1601 boundary, 1920 and 2560, with
Notes on and off, all five text sizes at one width, a book chapter and a loose document,
and a print check that nothing moved; plus a check that the review, book, book-notes and
legacy pages did not change. `--kind implementation --risk low` (mid row) unless you find a
named trigger. `--depends-on none`. In its breakdown block: goal, set (every file it may
touch), risk and trigger, `spends money: no`, depends on. Also `## Passes` (pass 1 halted,
then this re-run) and `## Estimate` from `dispatch-summary`'s `means`.

Put the deferred-job candidate (retire or redirect the orphaned archive page
`/documents/{id}/versions/{v}` to the reader's `?v=N`) in your verdict for the orchestrator
to file; do not file it.

## Rules for this slice

- `new-slice` bare folders only (no `plan.md`), declared with `--depends-on`.
- `phase.md` only through `phase-section`: update the `Breakdown (DECOMP): …` line under
  `## Decisions`, notes for S1 if useful, rewrite `## Now`.
- No `accept-gate`, commit or status moves; the orchestrator declares `--require` after
  `finish-slice`.
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
