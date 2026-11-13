# P32.F3 — Landing: the skill pane's line count matches the served SKILL.md

## Goal

Fix P32.REVIEW's finding 2. The landing's explain-skill section says the skill is 775 lines. The file the landing
serves, `web/public/SKILL.md`, is now **2,608 lines** after P32.F2 (`wc -l`). Change the two strings so they
match it, and nothing else. This widens P32's edit scope by this one file (the orchestrator's call; the landing
would otherwise be wrong as soon as the new skill deploys).

## Read first

- `phase.md` `## Notes for later slices`: **Rules for every slice**, **(from P32.REVIEW, for P32.F3)** (yours).
- `docs/current/operations.md` `## Operator Runtime` (the instrument: Aside `u1`, never `u0`; the repl's
  sharp edges; JPEG screenshots at quality 25).
- `web/src/content/marketing/content.ts`, `FEATURE_SKILL` (≈ lines 245–270).

## The change

In `web/src/content/marketing/content.ts`, `FEATURE_SKILL`:

- `lede`: "It's a 775-line skill:" → "It's a 2,608-line skill:", taking the number from
  `wc -l web/public/SKILL.md` at the time you edit. If it is not 2,608, use what it prints and say so.
- `pane.meta`: "775 lines · yaml + markdown" → "2,608 lines · yaml + markdown", with the same number.

Change no other copy, even where you think it could read better: that is the operator's call. If another
string in `FEATURE_SKILL` is now false because of P32 (for example the ticks), name it in `result.md` as a
candidate for the re-review; do not edit it.

## Verify

- `grep -n '775' web/src/content/marketing/content.ts` prints nothing, and both new strings carry the same
  number as `wc -l web/public/SKILL.md`.
- `pnpm --dir web typecheck` and `pnpm --dir web lint` pass. Run `pnpm --dir web test` only if a test touches
  `content.ts` (`grep -rln 'FEATURE_SKILL' web/src web/tests`); none pins the count today.
- **The rendered pane.** Verify in the production build. **The operator's `next dev` runs on :3030 from
  `web/`.** So never build or start a server in `web/` itself: a `next build` there writes `web/.next` under
  the operator's running dev server. Never touch :3030 or :8766, and never restart them.
  1. Copy `web/` without `node_modules`, `.next` or `.env*` into your scratchpad, and symlink its
     `node_modules` to `web/node_modules`.
  2. Run `pnpm build` there, then `next start` on a fresh port of your own (the landing needs no API for its
     anonymous render; if it does, report it rather than starting the API).
  3. Open `http://127.0.0.1:<port>/` with Aside on the agent account (`aside repl --account u1 "<js>"`, never
     `u0`). Read the skill section's lede and the pane's meta line from the DOM, and take one JPEG screenshot
     of the section at 1440×900.
  4. Stop your own server's PID and delete the scratch copy's `.next`.

  If the scratch build fails for an environmental reason (a symlink or turbopack root complaint), say exactly
  what happened. Then fall back to fetching the rendered HTML of your scratch `next dev` on a fresh port
  (same scratch copy) with `curl`, and grep the two strings. Name the instrument you used in `result.md`.
- `git diff --stat` touches only `web/src/content/marketing/content.ts` and this phase's folder;
  `python3 scripts/workflow.py validate` passes.

## Notebook and result

- `phase.md`, one section at a time (`phase-section`):
  - remove the F3 note;
  - add one line to the re-review note: what F3 changed and the screenshot's path;
  - `## Now`.
  - No `## Doc impact` line: this is copy, not durable truth.
- `result.md`: the verdict block first (`status`, `tier`, `model`, `effort` from `## Dispatch`, `summary`,
  `files_changed`, `validation`, `deviations`, `doc_impact`). Then the before and after strings, the
  instrument and the screenshot path, and any other `FEATURE_SKILL` line that P32 made false.
- No commit, no push, no state command.

## Dispatch

slice=P32.F3
phase=P32
kind=fix
risk=low
attempt=1
route=mid
reason=kind fix rated low
tier=mid
subagent_type=slice-executor-mid
model=sonnet
pass_model=yes
effort=high
pass_effort=yes
attribution=Claude Sonnet 5.5
explore_model=haiku
explore_effort=high
