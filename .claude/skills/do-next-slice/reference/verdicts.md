# do-next-slice — launching the executor, escalation and the commit

## Before step 1 — a declared phase

`/do-next-slice` never runs a wave, and its commit (step 7) takes all pending changes. So in a declared phase (`next` prints `ready_slices=`) it starts nothing while a wave is unfinished, that is, while:

- a commit waits: `git status --porcelain --untracked-files=all` on the phase's `slices/` folder, in the repo that holds the workflow state, lists the `slice.json` of a `done` slice whose committed copy does not say `done`;
- a slice other than the selected one is `in_progress`, `pending` or `blocked`; or
- the selected slice's `plan.md` carries a `## Wave` section (it ran in a wave).

Then STOP before any `start-slice`, dispatch or commit, and tell the operator to run `/do-whole-phase`, whose *Resume* commits and resumes the wave from disk. Otherwise go on: the slice runs alone, as a wave's lone slice would.

## Step 3 — dispatch

3. Dispatch the executor to implement the slice. Always launch it through the Agent tool **as a background task** (the default — never pass `run_in_background: false`) and wait for its completion notification; never run the executor synchronously inline in the main session. This applies to decomposition, `research`, implementation, `fix`, and review. **`kind: co-work` is the exception, and only in part** — its round runs inline with dispatched spans; *When the selected slice is a design slice* below carries it.

The route table (resolve, pin, dispatch, record, Explore) is in `reference/dispatch.md`.

Give the executor the slice id and folder path; it reads the plan and context, implements, validates, writes `result.md` (verdict block first), edits the phase notebook under its budget — consuming the notes written for it, recording decisions and doc impact — and returns the structured verdict. Do not implement the slice yourself.

## An over-budget notebook — before the next dispatch

When `next` (or the resume card) prints `notebook_over_budget=<P> (<bytes> of 40960 B) -- required before the next dispatch: …`, run each `notebook_move=` line under it, prefixed `python3 scripts/workflow.py` (`phase-section <P> "<Section>" --to-topic <slug> --entry <ranges>`: the entries move verbatim to `topics/<slug>.md` and a gist line stays, so nothing is lost), then re-run `next`, and carry the moved files in this slice's workflow-state commit. Do it on the main thread before `start-slice` (whose `warning: notebook <P> is over budget` line still starts the slice), never while the executor runs, since it writes the notebook itself. Past 3 moves the line says `(+N more moves …)`: re-run `next` for the rest. The **advisory** form (`-- advisory: nothing left to move (…)`, no `notebook_move=` line) asks only for the remedy it names, such as `--resolve` on answered questions. It never blocks a write, a stop or a finish. Executors never act on it.

## Step 4 — an escalation, or a failed or empty return

- `escalate` (returned only by a mid-row dispatch) → escalate instead of stopping: append an `## Escalation: mid → high` section to this slice's `plan.md` carrying the executor's `escalation` findings and what to do differently, then resolve with `executor-route <slice_id> --retry`, pin its lines under that section, re-dispatch the slice **on the high row**, and record the second attempt. In `gate` mode, present the revised plan for the operator's approval first (plan mode, as in step 2); in the default (`auto`) re-dispatch straight away. At most 1 escalation per slice; the slice stays `in_progress` throughout.
- failed or empty return → from a mid-row dispatch, treat it as an `escalate` with no findings (record it `--verdict failed`, note the failed attempt in the escalation section and re-dispatch on the high row through the same `--retry` path); from a high-row dispatch, treat the slice as not done: do not finish, do not commit; report and STOP.

## Step 7 — the commit

7. Commit by default: group the slice's pending changes into focused `type(scope): summary` commit(s) following the Commit Convention. Committing is the orchestrator's job — the executor never commits. In a nested pair commit the host paths first and the workflow state right after, so a `done` slice whose `slice.json` is still uncommitted always marks a commit that waits. **Attribute the slice commit to the model that did the work:** its trailer is `Co-Authored-By: <attribution> <noreply@anthropic.com>`, `<attribution>` being the `attribution=` line of the dispatch that produced the work — equivalently the name for the `model:` its verdict block records; a slice done in two attempts goes to the model that completed it. Commits carrying only your own work (phase creation, a gate declaration alone, a verdict record) are attributed to the session's model as before; never carry over another session's trailer. Do not branch unless the operator asks; never push. A phase the operator asked into a worktree already has its branch — that branch *is* the worktree they asked for, so its slice commits land on `phase/P<N>-<slug>` without asking again; every other phase's land on the current branch. Pushing is separate and still needs asking: the `parallel-phase` integration merges locally by default, and its push → PR variant runs only when the operator asks (each push still goes through the permission prompt).
