# P32.REVIEW round 2, run rv2a: evidence

One Sonnet-lead `quick` run, `/knowledge:explain how a French press brews coffee and how to make a good cup with one
(reader: someone using a French press for the first time) quick`, in an empty scratch folder (not a git repo, not a
workspace), Claude Code 2.1.309, under round 1's isolation (see `../spend.md`). Its full stream (lead and every
agent) is `scratchpad/review2/runs/rv2a/out.jsonl`, in this review session's scratchpad.

## The headline (the first run, `20261024-0107-french-press`)

`check.py` (F2's checker, copied): 12 of 14 pass.

- `path: plugin`, `agents: plugin`; probes A and B dispatched on haiku, B's six calls `ok`.
- The verifier: `knowledge:verifier` with `model: opus`, two batches (r1-b1, 6 claims; r1-b2, 3 claims), both ran on
  `claude-opus-5-5`; 7 supported, 2 partial.
- Files: `plan.md`, `findings/r1-practice.md`, `findings/r1-manual.md`, `library.md`, `ledger.md`, `verify/r1-b1.md`,
  `verify/r1-b2.md`, `gaps/final.md`, `outline.md` (opens `## Reader's task`, three tasks with deliverables),
  `body.md`, `trace.md`, `report.md`.
- `knowledge check` rejected the first draft (`field-unknown`, `id-duplicate`), passed after the fix; published v1
  to the scratch stack only (:8871). The published source has no `## Reader's task` heading (`chapter.md` here).
- The two F2 misses recurred (routed, not findings): `run.md` kept `searches: 1 (probe)` against 7 WebSearch calls
  in the stream (lead 5, agents 2) and `verifier: pending`; no dossier line in `run.md` or the report.
- New, an observation: `plan.md` was written at 01:10:13, after `findings/r1-practice.md` (01:09:59) and after the
  first verifier dispatch, with 3 questions and one angle (§3.4 asks 8–20). F2's f2b3 wrote its plan first, with 5.

## The unasked second run (finding 1)

`wakeups.py` over the stream:

| When | The lead |
|---|---|
| 01:07–01:15 | four `ScheduleWakeup` calls while it waited on agents (60 s, 120 s, 600 s, 600 s; `noop: true`), each with the run's own invocation as the prompt: `/knowledge:explain how a French press brews coffee …` |
| 01:15:44 | published v1, wrote `report.md`, `run.md` `state: done`; its last turn ended |
| 01:24 | the pending wakeup fired and re-sent `/knowledge:explain …`. The lead: "The same request is already published as v1. I'll treat this as a re-explain and add v2 with the one gap v1 declared, a verified water temperature." |
| 01:24–01:26 | a second run, `20261024-0124-french-press` (`rerun/run.md`, `rerun/brief.md`): D0b **not re-run** ("the previous run's probe … passed 17 minutes earlier"), new research into `findings/r1-nca.md`, a verifier batch in the background, and **another** `ScheduleWakeup` for 01:36 with the same prompt |
| 01:26:29 | stopped by me (SIGTERM to my own PID 65755). Nothing of the second run was published; the stack held v1 only |

The harness ran with `CLAUDE_CODE_PRINT_BG_WAIT_CEILING_MS=0`, so `claude -p` waited for background work instead of
stopping at 10 idle minutes. The wakeup fired 8 minutes after the last turn, inside the default ceiling too, but
whether a default `claude -p` session waits for a scheduled wakeup was not tested. An interactive session fires one
by design.

## Spend

The first run's last `result` event: $2.09. The watchdog's streamed estimate at the stop: **$3.71** (counted).
