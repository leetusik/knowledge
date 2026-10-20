# do-next-slice — launching the executor, escalation and the commit

## Step 3 — dispatch

3. Dispatch the executor to implement the slice. Always launch it through the Agent tool **as a background task** (the default — never pass `run_in_background: false`) and wait for its completion notification; never run the executor synchronously inline in the main session. This applies to decomposition, `research`, implementation, `fix`, and review. **`kind: co-work` is the exception, and only in part** — its round runs inline with dispatched spans; *When the selected slice is a design slice* below carries it.

The route table (resolve, pin, dispatch, record, Explore) is in `reference/dispatch.md`.

Give the executor the slice id and folder path; it reads the plan and context, implements, validates, writes `result.md` (verdict block first), edits the phase notebook under its budget — consuming the notes written for it, recording decisions and doc impact — and returns the structured verdict. Do not implement the slice yourself.

## Step 4 — an escalation, or a failed or empty return

- `escalate` (returned only by `slice-executor-mid`) → escalate instead of stopping: append an `## Escalation: mid → high` section to this slice's `plan.md` carrying the executor's `escalation` findings and what to do differently, then resolve with `executor-route <slice_id> --retry`, pin its lines under that section, re-dispatch the slice to **`slice-executor-high`**, and record the second attempt. In `gate` mode, present the revised plan for the operator's approval first (plan mode, as in step 2); in the default (`auto`) re-dispatch straight away. At most 1 escalation per slice; the slice stays `in_progress` throughout.
- failed or empty return → from `slice-executor-mid`, treat it as an `escalate` with no findings (record it `--verdict failed`, note the failed attempt in the escalation section and re-dispatch to `slice-executor-high` through the same `--retry` path); from `slice-executor-high`, treat the slice as not done: do not finish, do not commit; report and STOP.

## Step 7 — the commit

7. Commit by default: group the slice's pending changes into focused `type(scope): summary` commit(s) following the Commit Convention. Committing is the orchestrator's job — the executor never commits. **Attribute the slice commit to the model that did the work:** its trailer is `Co-Authored-By: <attribution> <noreply@anthropic.com>`, `<attribution>` being the `attribution=` line of the dispatch that produced the work — equivalently the name for the `model:` its verdict block records; a slice done in two attempts goes to the model that completed it. Commits carrying only your own work (phase creation, a gate declaration alone, a verdict record) are attributed to the session's model as before; never carry over another session's trailer. Do not branch unless the operator asks; never push. A phase the operator asked into a worktree already has its branch — that branch *is* the worktree they asked for, so its slice commits land on `phase/P<N>-<slug>` without asking again; every other phase's land on the current branch. Pushing is separate and still needs asking: the `parallel-phase` integration merges locally by default, and its push → PR variant runs only when the operator asks (each push still goes through the permission prompt).
