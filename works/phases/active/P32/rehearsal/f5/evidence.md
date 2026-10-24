# P32.F5 evidence: the verifier's `researchers_model` guard, live

The harness and its isolation are in `spend.md`. Both sessions ran with the skill as F5 left it: 157,738 B,
2,635 lines, `plugin/agents/verifier.md` regenerated.

## Run 1: f5p, a direct probe of `knowledge:verifier` from a Sonnet main thread

**Setup.** A scratch dossier (`20261025-f5-probe`) holds a copy of rv3a's `findings/r1-all.md` and
`library.md` (`rehearsal/review/r3/`), and `tools/pagetext.py`. The prompt told the main thread (`--model sonnet`)
to make three foreground `knowledge:verifier` calls on C-r1-all-01, -02 (HyperPhysics) and -05 (the USU handout,
a PDF), each with `counter-evidence ids: none`, and to make no other call. The prompts and the returns, verbatim,
are in `probe-returns.md`.

| Call | `model:` on the call | Dispatch line | Ran on (its model line; the stream) | Return | Expected |
|---|---|---|---|---|---|
| 1 | none (the `sonnet` frontmatter) | `researchers_model: claude-sonnet-5-5` | `claude-sonnet-5-5` | `status: blocked: same model as the researchers`; no tool call, no file | `blocked` · **PASS** |
| 2 | `opus` | `researchers_model: claude-sonnet-5-5` | `claude-opus-5-5` (its model line and its streamed messages) | `status: complete`; `verify/f5-b2.md` written, headed `verifier: claude-opus-5-5`: 3 claims, 3 supported, each source re-fetched into `pages/f5-b2/` | a verify file by Opus · **PASS** |
| 3 | `opus` | none (the line left out) | `claude-opus-5-5` | `status: blocked: same model as the researchers`: "The dispatch … has no `researchers_model:` line … I stop before any check"; no file | `blocked` · **PASS** |

Call 3 runs on Opus on purpose, so that its block comes from the missing line alone and not from the model. The
session's `modelUsage` lists both `claude-sonnet-5-5` and `claude-opus-5-5`. 4 turns, 137 s, $0.54. Calls 1 and 3
made no tool call, so they streamed no subagent message; their model is the return's first line (B6).

## Run 2: f5q, a Sonnet-lead `quick` run on a new subject

`/knowledge:explain how a rice cooker knows when the rice is done and how to get good rice from one (reader:
someone using a basic electric rice cooker for the first time) quick`, in an empty scratch folder.

**The verifier dispatch** (the only one in the stream):

    {'description': 'Verify rice cooker claims', 'subagent_type': 'knowledge:verifier', 'model': 'opus', 'run_in_background': True}
    run: 20261025-0056-rice-cooker · batch: r1-b1 · dossier: <scratch dossier> · tools: <scratch tools>
    output: verify/r1-b1.md · counter-evidence ids: none
    researchers_model: claude-sonnet-5-5
    claims:
      C-r1-lead-01 (<dossier>/findings/r1-lead.md)
      C-r1-lead-02 (same file)
      … (6 claims)

- It ran on `claude-opus-5-5`: its streamed messages, its return's `model:` line and `verify/r1-b1.md`'s header
  (6 claims, 6 supported). The lead set `model: opus` the first time, so the guard had nothing to block. Probe
  call 1 shows the block a missed `model:` would have met.
- `run.md` `## Models`: `r1-b1: claude-opus-5-5` and `lead: claude-sonnet-5-5`. The report: "verifier
  claude-opus-5-5 (knowledge:verifier)".

**F4's hold** (`monitor.py f5q 900 1`):

    00:56:37 start: pid 39363; run ids already present: []
    00:57:57 run ids now: ['20261025-0056-rice-cooker']
    01:05:57 state: done seen ({'20261025-0056-rice-cooker': 'done'}); holding 900s
    01:06:08 process 39363 ended; states {'20261025-0056-rice-cooker': 'done'}
    01:20:59 hold over: 900s since done; process ended; states {'20261025-0056-rice-cooker': 'done'}
    01:20:59 summary: lead ScheduleWakeup/CronCreate/Monitor calls: 0; run ids: ['20261025-0056-rice-cooker']

`count.py`: one session id, 3 result events (the lead ended its turn to wait), and `ScheduleWakeup`, `CronCreate`,
`Monitor` and `RemoteTrigger` at **0** for the lead and for the agents. Its 3 dispatches: probe A (`haiku`,
background), probe B (`haiku`, foreground) and `knowledge:verifier` (`opus`, background). After the hold the stack
held **one document, at `version: 1`**, from one `POST /api/documents`.

**F2's headline** (`tools/check.py`), **13 of 14**:

- PASS: `path: plugin`; the two haiku probes; the verifier agent on a model other than the lead's (`opus`, ran on
  `claude-opus-5-5`); `plan.md`; `findings/r1-lead.md`; `library.md`; `verify/r1-b1.md`; `gaps/final.md`;
  `trace.md`; `outline.md` opening `## Reader's task` (two tasks, each with its deliverable), absent from the
  published chapter; `run.md`'s `searches: 8` equal to the transcript's 8 WebSearch calls; the publish to :8941
  only.
- FAIL: no dossier line in `run.md` (`· dossier: complete`), though the report says "dossier complete". This is
  F2's routed miss (D72).

**Also seen** (bookkeeping, D72's family; not F5's lines):

- `run.md`'s mode block still reads `verifier: opus (knowledge:verifier, pending)`, though its log and
  `## Models` name `claude-opus-5-5`.
- The report says "searches 9", against `run.md`'s 8 and the transcript's 8.
- This time `plan.md` (01:00:13) was written **before** the findings file (01:01:44): `f5q-files.txt`.

## Leak scans

`scratchpad/leakcheck/scan.py`, at the baseline, after f5p and after f5q, over `scratchpad/review2/` (f5p's and
f5q's run folders, `stack5/`, the session temp folders), this folder and `~/.claude/projects`: **the six known
files each time**, and no other hit.
