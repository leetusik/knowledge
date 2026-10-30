---
name: do-next-slice
description: Continue the active phase by completing exactly one slice, then stop.
allowed-tools: Bash(python3 scripts/workflow.py:*), Read, Edit, Write, Glob, Grep, Bash, Agent, EnterPlanMode, ExitPlanMode
disable-model-invocation: true
---

# do-next-slice

Run `python3 scripts/workflow.py next` — it prints the current pointer, so never re-read `works/state.json` or `works/backlog.md` — then read `CLAUDE.md`, the selected slice folder, and the phase's `phase.md`: the **bounded phase notebook**, read and written only through `phase-section` (`phase-section <P>` lists its sections, `<P> Now` prints one), never with `Read`, `Edit` or `Write`, your handoff from the last slice — read `Now` and only the sections this slice needs, never the whole file. Read `docs/current/` **sections** just in time, only where this slice's work touches them — never the whole doc set up front, and not `docs/index.json` (version history, not truth). When unsure of the operator's intent, the phase's `intent.md` (linked from `phase.md`) is the confirmed record of what was asked. `next` reports **the current stream's** active phase: on the default stream it skips phases running in their own worktrees (printing `parallel_phases_elsewhere=<P>:<branch>`), and inside a phase worktree it sees only that phase (printing a `stream=` line). `python3 scripts/workflow.py parallel-status` shows every stream.

You are the ORCHESTRATOR (main thread): you plan each slice, verify, commit, move workflow state, and talk to the operator. Every slice — decomposition, `research`, implementation, `fix`, and the phase **review** — is delegated to the `slice-executor` subagent (mid or high row). **One exception: a `co-work` (design) slice runs inline, with dispatched spans (inline → dispatched → inline).** The round's lifecycle and the operator's words stay inline — `design-open`, the handoffs, the read-back, every publish to a job's canvas, `feedback.md`, `SIGNOFF.md`, `design-close` and every commit stay on the main thread — but the **drafting is dispatched to `design-drafter`** (the design subagent, not a slice executor) every round, the **critique to `design-critic`** when a job's critique level asks for it, and the **mockup build is the one span dispatched to a slice executor** (`slice-executor` on the high row, built from the round's record on disk), only when the operator asked for a mockup. See the `design-cowork` skill.

If `next` prints `WAITING ON OPERATOR` (the current slice or phase is `pending`, shown `[~]`), STOP: the work is waiting on operator co-work. Report what is needed and do not start, finish, or advance it. Resume only after the operator clears `pending` back to `in_progress`. When the phase is pending because its **operator acceptance gate** is open (`next` also prints `acceptance_gate=open` and the walkthrough), relay that walkthrough to the operator as-is: it clears with `python3 scripts/workflow.py accept-gate <P> --clear [--note "..."]`, not with `set-phase-status`. (In a phase worktree a `pending` slice or phase halts only its own stream.) Every stop you set is typed: `set-slice-status <slice_id> pending --stop-kind <kind> --on-words "<what the operator's words will do>"`; the kinds are `wave`, `mockup`, `decision` (a question only the operator answers, a `needs_operator`), `operator-action`, `limit` and `other`, and `next` and the resume card print the kind and the words. **A `co-work` design slice stops `pending` once per round — twice when a mockup was requested** — `--stop-kind wave` or `mockup`; in your report say which one this is, and what the operator's words on return will do (step 3).

**After a context compaction** (the `SessionStart` hook has printed `compaction=done source=compact` and the resume card; `next --card` prints it on demand): continue from the card's next action, and read a reference only when that action needs it. An executor dispatched before the compaction is still running (the card lists it under running spans): wait for its completion notification, never re-dispatch. The mode word and any open operator gate are among the summary's kept facts; when in doubt, `intent.md` and `next` are the record.

Work exactly one slice:

1. In a declared phase (`next` prints `ready_slices=`), first read `reference/verdicts.md`'s *Before step 1*: it may STOP you. If `next` prints `notebook_over_budget=`, run its `notebook_move=` lines first (`reference/verdicts.md`). If the selected slice is `todo` or `ready`, run `python3 scripts/workflow.py start-slice <slice_id>`. (In `plan only` mode, skip this — the slice is readied, not started; see step 2.)
2. Plan the slice, then persist the plan to this slice's own `plan.md`.
   - The default is `auto`: plan inline, `Write` the full `plan.md`, dispatch with no approval pause — except a decomposition slice and a slice that spends money, which plan at the gate unless the operator said `auto` explicitly. `gate` (the operator's word) waits for approval of the plan; `plan only` readies one plan and runs nothing; a `ready` (`[r]`) slice skips planning. **Before you plan, read `reference/modes.md`.**
3. Dispatch the executor — one, as a background task, on the engine's route table — and record its return. Do not implement the slice yourself; the executor never commits, and moves no workflow state beyond its own carve-outs. **Before you dispatch, read `reference/dispatch.md` (resolve → pin → dispatch → record → Explore) and `reference/verdicts.md` (launching the executor, escalation, the commit).**
4. Trust the verdict; do not re-run the slice's work. Read the returned verdict and the **head** of `result.md` — its verdict block is that return's durable copy, so reading further is only worth it on a verdict other than `done` (or when you want the detail) — then run `python3 scripts/workflow.py validate` (state integrity only — do **not** re-run the slice's tests; the phase review validates all slices together later). Then act on `status`:
   - `done` → continue to step 5.
   - `needs_operator` → set the slice `pending` (`python3 scripts/workflow.py set-slice-status <slice_id> pending --stop-kind decision --on-words "<what the operator's answer will do>"`; `operator-action` when they must run something), report the `operator_need`, and STOP without finishing.
   - `blocked` → record the blocker in `result.md`, report it, and STOP.
   - `escalate`, or a failed or empty return → from a mid-row dispatch, one re-dispatch on the high row; from a high-row dispatch, the slice is not done: do not finish, do not commit; report and STOP (`reference/verdicts.md`).
5. Mark the slice done with `python3 scripts/workflow.py finish-slice <slice_id> --outcome "<one line>"` only when complete and verified. The outcome is one line, taken from the executor's verdict `summary`; it fills the slice's row in the generated `## Slices` table, where a later slice sees at a glance what this one did.
6. Run `python3 scripts/workflow.py validate`.
7. Commit by default; committing is the orchestrator's job, never the executor's. The commit rule, with its attribution trailer, is in `reference/verdicts.md`.

**Before you plan a special slice, read its reference:**

- a design slice (`kind: co-work`) → `reference/co-work.md`, with the `design-cowork` skill;
- a decomposition (`kind: decomposition`) → `reference/decomposition.md`, which also declares the phase's acceptance gate;
- the phase review (`kind: review`) → `reference/review.md` (the review, the acceptance gate, recording the verdict, the doc debt);
- an explain phase (`## Explain` in `intent.md`): DECOMP → `reference/explain-decomposition.md`, each chapter → `reference/explain-chapter.md`, REVIEW → `reference/explain-review.md`;
- **worktrees:** the phase runs on this checkout unless the operator asked for a worktree (an explain: its confirmation asked). When they asked, the phase already runs in one, or `next` prints `merge_ready=`, read `reference/worktree.md` first.

Stop after one slice. Do not advance to the next slice in the same turn.
