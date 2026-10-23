# P32.F4: evidence

Five Sonnet-lead sessions under `claude -p` (Claude Code 2.1.309, `CLAUDE_CODE_PRINT_BG_WAIT_CEILING_MS=0`, so a
session stays open while anything is pending, as an interactive one does), the plugin from this working tree, a
scratch stack on :8891. The isolation is in `spend.md`. The streams (lead and every agent) are
`scratchpad/f4/runs/<run>/out.jsonl` in this slice's session scratchpad; `scratchpad/f4/count.py` counts them and
`scratchpad/f4/monitor.py` watched each run (its log, `runs/<run>/monitor.txt`, is quoted below).

## The wait rule (a): lead calls to `ScheduleWakeup`, `CronCreate`, `Monitor`, `RemoteTrigger`

| Run | Prompt | Lead calls | Agents sent (all in the background) | Turns (ended to wait) | Run ids | After the run |
|---|---|---|---|---|---|---|
| rv2a (round 2, the old text) | rv2a's | **5 `ScheduleWakeup`** | 2 probes, 3 verifier batches | 5 | 2 (the second unasked) | a wakeup re-sent the request 8 min after `done` |
| f4a | rv2a's, word for word | **0** | 2 haiku probes, `knowledge:verifier` `model: opus` | 4 | 1 | `state: done` 01:50:54; process ended 01:51:03; nothing until 02:06:03 |
| f4c | ETags, `quick` | **0** | 2 haiku probes, `knowledge:verifier` (no model named) | 4 | 1 | published 02:20; process ended 02:20:07; nothing until 02:35:23 |
| f4e | Bloom filter, `quick` | **0** | 2 haiku probes, `knowledge:verifier` `model: opus` | 4 | 1 | `state: done` and process end 02:30:32; nothing until 02:45:42 |

In each F4 run the lead's turn ended at each wait ("Waiting for probe A's notification.", "The verifier batch is
running on Opus. I'll wait for its notification before applying statuses.") and the agent's notification started
the next. With nothing scheduled, each `claude -p` process exited with its last turn (f4a 9 s after `state: done`,
f4e the same second); under rv2a, the pending wakeup had kept the process open. The scratch stack held v1 of each
document throughout.

## The repeat guard (b): the same words again in the same session (`--resume <session id>`)

- **f4b** (f4a's session, on the guard's first wording, "brought to `state: done`"): one turn, 9 s, no tool call:

      PUBLISHED (quick) — How a French Press Brews Coffee, and How to Make a Good Cup
      http://localhost:8765/coffee/2026-10-24-how-a-french-press-brews-coffee-and-how-to-make-a-good-cup/ · v1

      This request repeats one that already finished in this session, so I started no new run. A re-explain (a v2)
      needs new instructions from you.

- **f4f** (f4e's session, on the shipped wording, "finished (its report given or `state: done`)"): one turn, 14 s,
  no tool call:

      PUBLISHED (quick) — Bloom filters: what they are and when to use one
      http://localhost:8765/data-structures/2026-10-24-bloom-filters-what-they-are-and-when-to-use-one/ · v1

      This request is word for word the one I already finished this session, so I haven't started a new run. Do you
      want a re-explain, which would publish a v2 of the same document, or nothing further? If you want a v2, say
      what should change, …

  It asks in prose, which under `claude -p` nobody answers; it ran nothing and the process ended.

No new run id and no new version in either session.

## A deliberate re-explain still runs (f4d)

f4a's session resumed with new words: `…, again as a v2 that pins down the water temperature quick`. The lead ran
§2, read the prior v1 (`prior: coffee/…-good-cup.md v1 (native; ids carried forward)` in its brief), sent both
probes again (D0b), and wrote run `20261024-0212-french-press-v2` (`f4d/brief.md`, `f4d/run.md`). I stopped it at
that run id (02:13:23), by design, before any publish; the stack kept v1. 0 wakeups.

## F2's headline in run 1 (f4a)

F2's `check.py`: 12 of 14 pass. `path: plugin`; the two haiku probes; `knowledge:verifier` sent with
`model: opus`, ran on `claude-opus-5-5`; `plan.md`, `findings/r1-lead.md`, `library.md`, `verify/r1-b1.md`,
`gaps/final.md`, `trace.md`; `outline.md` opening `## Reader's task`, absent from the published source; publish to
:8891 only. The two misses are F2's routed ones (D72): `run.md` says `searches: 3` against 7 WebSearch calls, and
no dossier line. f4e: the same 12 of 14.

## Observations (not F4's pass lines)

- **f4c sent `knowledge:verifier` without `model: opus`,** so it ran on `claude-sonnet-5-5`, the lead's own model,
  which in `quick` is the researcher's. §3.9 asks for `model: opus` there, and §4.9 calls this a defect. The
  report said "it ran on the same model as me, so this check is weaker", but not that it was a defect. f4a and
  f4e sent it correctly. `check.py`: 11 of 14 (the verifier, the dossier line, and the chapter check, which could
  not find the document without `report.md`; the published source has no `## Reader's task`).
- **f4c wrote no `report.md`** and left `run.md` at `state: running`. It printed its report (`f4c/report-printed.md`).
  This is why the repeat guard's trigger was widened to "its report given or `state: done`".
- **The plan is still written after the research** on Sonnet: f4a's `plan.md` 01:46:47, its findings file 01:46:25
  (round 2's observation).
- **f4d's lead searched while probe A ran** (two WebSearch calls before probe B), not after the preflight.
