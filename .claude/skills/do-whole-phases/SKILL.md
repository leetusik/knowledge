---
name: do-whole-phases
description: "Run several phases back to back (the ones you name, or every phase not done), parking each open acceptance gate and halting on any other stop."
allowed-tools: Bash(python3 scripts/workflow.py:*), Read, Edit, Write, Glob, Grep, Bash, Agent, EnterPlanMode, ExitPlanMode
disable-model-invocation: true
---

# do-whole-phases

`/do-whole-phases [phases] [auto|gate|plan only]` runs phases one after another so the operator does not start each one. **Each phase runs by `.claude/skills/do-whole-phase/SKILL.md`: read it first and follow its loop for every slice, unchanged**, with its references (`.claude/skills/do-whole-phase/reference/<x>.md`, read when that skill says to). This skill adds the run's pointer, its stop rules and two overrides. `/do-whole-phase` still runs one phase.

## Arguments

Strip the mode words (`auto`, `gate`, `plan only`) from the operator's words and pass the rest, untouched, to `python3 scripts/workflow.py run-phases <the rest>`: `46, P12 p14 46-k2 7kq2 P-7kq2` (a numbered id with or without its `P`, `46` naming the one P46 or P46-<tail> and refused when two share the number, so type the tail, `46-k2`; a v73 id with or without its `P-`; any case; commas or spaces; order kept, duplicates dropped); none means every phase on this stream not done, in backlog order. **Exit 2: relay each `refused=` line and start nothing** (a range, `worktree` or a typo'd mode word is refused too).

The mode word applies to every phase in the run (`.claude/skills/do-whole-phase/reference/modes.md`). Without an explicit `auto`, each phase's `DECOMP` still waits in the session for the operator to approve its plan: that is a pause, and the run continues after it. `plan only` applies phase by phase, each with its own stop rule, in `queue=` order (the pointer does not advance past a readied slice); it never reaches a review, so it never parks.

## The loop

`run-phases` is the run's pointer. **Run it at the start, after each slice's finish and at each phase boundary**, and work its `target_slice` in its `target_phase` by `do-whole-phase`'s loop (plan, dispatch, verdict, `finish-slice`, `validate`, commit). Its lines: `run=` (the normalized list), `stream=`, `queue=`, `skipped=<P> reason=…`, `parked=<P>`, then one ending: a target, a `halt=` or `run_done=yes`. `target_slice=none`: the phase has no open slice and needs only its review verdict recorded (`.claude/skills/do-whole-phase/reference/review.md`). A `notebook_over_budget=<P>` line for the target phase, with its `notebook_move=` lines, is run before the next dispatch (`.claude/skills/do-whole-phase/reference/verdicts.md`).

**Several slices at once.** For a phase whose `DECOMP` declared its slices, `run-phases` also prints `ready_slices=` and `running_slices=` (after `next_slice=`, and after `halt_reason=` on a halt; none while a barrier runs alone: the phase then reads as an undeclared one). There `.claude/skills/do-whole-phase/reference/wave.md`'s *Resume* runs first at the run's start, after every compaction and before every start or commit, a `halt=` included. When `ready_slices=` lists more than one id, work all of them together by `.claude/skills/do-whole-phase/reference/wave.md` (plan, dispatch, finish, commit and stop), re-running `run-phases` after each slice's finish (its `finish-slice` and notebook writes), not after its commit: at a join, commits wait while starts keep rolling (bar a barrier, and a slice whose set overlaps a waiting commit's set: each starts once that commit is in); `target_slice=` is then only the plain pointer. A `halt=` while spans still run: wait for each, finish and commit it by that file, then report every stop and STOP.

**Only the target phase may hold work in the tree.** Before the first start in each target phase, run the *Resume*'s step 1 on `works/phases/active/` (every phase at once) and read the slices' `slice.json` there: a commit that waits, or a slice `in_progress`, `pending` or `blocked` (a parked phase's `REVIEW` aside), in any other phase on this stream, in the run or left out of it, halts the run before it starts anything. Report it and STOP: this run's commits would take its edits, and `/do-whole-phase` on that phase finishes it first.

`next` still runs for its other lines (the nested-convention gate, the doc debt, `parallel_phases_elsewhere`); relay its `parallel_start_hint`, never act on it. Its `WAITING ON OPERATOR` block for a phase `run-phases` lists as `parked=` is not the run's stop.

**The two overrides, and only these:**

- *"Do not continue into the next phase."* In a run, after a phase's `pass` is recorded, or after it parks, re-run `run-phases` and continue with its target.
- `.claude/skills/do-whole-phase/reference/review.md`'s *"accept-gate --open … STOP the loop"* on a `pass` with a required gate. In a run this becomes **park**: `accept-gate <P> --open --walkthrough "<the executor's walkthrough>"`, file the review's deferred jobs, `validate`, commit, and **continue; do not stop**. A waived or legacy phase records its verdict and continues, as there. If the operator clears a parked gate mid-run, `run-phases` prints `gate_cleared=<P>`: record the pass (`review-phase <P> --verdict pass`) without re-dispatching the review.

**Every halt stops the whole run.** A `halt=` ending: report the item, its `stop_kind=` and `on_words=`, and STOP. A `needs_operator`, `blocked` or failed high-row return, a `blocked` review verdict, or a design wave (`pending`) inside a slice stops it too, exactly as in `do-whole-phase`: set the slice `pending` with a typed stop where that skill says so, report, STOP. Nothing past the halt starts; later phases and parked gates wait.

## The end of the run

`run_done=yes`: report every parked gate with its walkthrough (`accept-gate <P>` prints it; by the stop rules in the contract's `pending` rule), each phase that passed, and each `skipped=` with its reason. Each gate clears with the operator's `accept-gate <P> --clear [--note "..."]`, never `set-phase-status`.

## Streams

A run stays on the stream it starts on. A phase running in another worktree is skipped and named (`reason=other-stream stream=<branch>`): it runs from its own branch. This skill takes no `worktree` word and never runs `parallel-start`; inside a phase worktree it holds only that phase. A worktree phase's `pass` integration follows `.claude/skills/do-whole-phase/reference/worktree.md`, unchanged.

## After a compaction mid-run

Re-run `run-phases` with the `run=` list first (`all` means no arguments). **Its target wins over the resume card's pointer for the whole run**, even when the run leaves out the plain pointer's phase; the card's `run:` line under a parked gate's `stop:` line says the same, and outside a run that stop holds. Keep the mode word, and read `.claude/skills/do-whole-phase/SKILL.md` again if its loop is gone from your context. A span already running on the target phase's slices (the card's `wave:` line lists them): wait for each completion notification, never re-dispatch. In a declared phase, run `.claude/skills/do-whole-phase/reference/wave.md`'s *Resume* before its target: commits that still wait go in first.

## The review boundary in a run

A later phase was usually created before the earlier ones ran, so its `phase-scope <P>` (creation commit to `HEAD`) would fold their commits in. Plan its review with `python3 scripts/workflow.py phase-scope <P> --base <sha>` instead, where `<sha>` is the host commit at `<P>.DECOMP`'s `started_at` (in its `slice.json`): `git rev-list -1 --before=<started_at> HEAD`, run in the host repo for a nested install. Put that command in the review's `plan.md`.
