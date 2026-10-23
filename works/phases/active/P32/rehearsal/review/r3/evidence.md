# P32.REVIEW round 3: evidence

One Sonnet-lead `quick` session under `claude -p`, then one same-words resume of it. The isolation is round 2's
harness, unchanged (`../spend.md`, round 3). The streams are `scratchpad/review2/runs/rv3a/out.jsonl` and
`runs/rv3b/out.jsonl` in this review's session scratchpad. `scratchpad/review2/monitor.py` (F4's, copied) watched
each one and `count.py` (F4's) counted the lead's calls. F2's `tools/check.py` checked the headline.

## rv3a: the run, then a 15-minute hold

Prompt: `/knowledge:explain how a pressure cooker cooks food faster and how to use one safely (reader: someone using
a stovetop or electric pressure cooker for the first time) quick`. This subject was new: no earlier run used it.

`monitor.txt`:

    02:59:11 start: pid 79175; run ids already present: []
    03:00:32 run ids now: ['20261024-0259-pressure-cooker']
    03:07:22 state: done seen ({'20261024-0259-pressure-cooker': 'done'}); holding 900s
    03:07:42 process 79175 ended; states {'20261024-0259-pressure-cooker': 'done'}
    03:22:26 hold over: 900s since done; process ended; states {'20261024-0259-pressure-cooker': 'done'}
    03:22:26 summary: lead ScheduleWakeup/CronCreate/Monitor calls: 0; run ids: ['20261024-0259-pressure-cooker']

`count.py`: one session id; 4 result events (the lead ended its turn to wait); `ScheduleWakeup`, `CronCreate`,
`Monitor` and `RemoteTrigger` at **0** for the lead and for the agents. Its 3 agent dispatches were all in the
background: probes A and B (`haiku`), and `knowledge:verifier` with `model: opus`. The stack held **one document at
`version: 1`** after the hold.

`check.py`, **12 of 14**:

- PASS: `path: plugin`;
- PASS: the two haiku probes;
- PASS: the verifier, `knowledge:verifier`, sent with `model: opus`, ran on `claude-opus-5-5`;
- PASS: `plan.md`, `findings/`, `library.md`, `verify/`, `gaps/final.md` and `trace.md`;
- PASS: `outline.md` opens with `## Reader's task`, and the published source has no such heading;
- PASS: the publish went to :8923 only.
- FAIL, routed (D72): `run.md` says `searches: 3`, against 4 in the transcript (lead 3, probe 1). The report says 5.
- FAIL, routed (D72): `run.md` carries no dossier line. The report says "dossier complete" in prose.

What was the same as before, all routed:

- **The plan came after the research.** `plan.md` is from 03:03:02, and `findings/r1-all.md` from 03:02:44. That
  makes 3 of 3 recent Sonnet runs (rv2a, f4a, rv3a).
- **The mode block was never updated.** `run.md` still reads `verifier: pending (knowledge:verifier on sonnet...
  lead is Sonnet, so opus)` and has an empty `## Log`. Unlike f4c, it did end with `stage: D9 report · state: done`
  and `report.md`.

The chapter has 1,147 words, two reader's tasks (why it is faster, and a safe-use checklist), 4 quiz items and 3
sources. 14 claims were verified on Opus: 10 supported, 3 partial (written in their narrower form) and 1
needs-rewrite (rewritten). `files.txt` lists the dossier's files in the order they were written.

## rv3b: the same words, resumed (`--resume 337b61bd-…`)

It ran 1 turn in 9 s, with no tool call and no agent. `monitor.txt` showed no new run id. The stack still held one
document at `version: 1`. The full text is in `resume-rv3b.txt`:

    PUBLISHED (quick) — How a pressure cooker cooks faster, and how to use one safely
    http://localhost:8765/cooking/2026-10-24-how-a-pressure-cooker-cooks-faster-and-how-to-use-one-safely/ · v1

    This request is word for word the one the run above already finished. I haven't started a new run, because a
    repeat doesn't count as a re-explain.

    If you want a v2, say so in your own words. …

That is the headless branch: the report line and the URL, then a stop. Unlike f4f, it asked no question.

## Leak scan

The scan (`leakcheck/scan.py` over `scratchpad/review2` and `~/.claude/projects`) ran three times: as a baseline,
after rv3a, and after rv3b. Each time it found only the six known files (`leak-*.txt` are diff-identical to
round 2's `leak-baseline.txt`). This folder scans clean. The session was persisted for the resume. It is under
`~/.claude/projects/…-scratchpad-review2-runs-rv3a-work/` and carries only the scratch token.
