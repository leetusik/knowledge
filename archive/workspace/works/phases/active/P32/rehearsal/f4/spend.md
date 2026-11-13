# P32.F4: spend

Cap: **$12** for every run of this slice together, summed from each run's last `result` event's
`total_cost_usd` (subagents included); a run stopped early counts the watchdog's streamed estimate when it is
higher. A loop-safety stop (d61), not a budget. At the cap: stop and return `needs_operator`. No run carries a
`--max-budget-usd`; each runs under `watchdog2.py` at the threshold below.

Isolation: round 2's harness (`scratchpad/review2/harness`), copied to `scratchpad/f4/` with its paths and token
changed (token `f4-token`, `f4/setup.py`); scratch `XDG_CONFIG_HOME`, `XDG_STATE_HOME`, `KB_ROOT`,
`KB_API_BASE_URL`, `KB_API_TOKEN`, each checked with the skill's §2 resolver before each run;
`--setting-sources project`; `--permission-mode manual --permission-prompts none`; the deny rules on
`//Users/sugang/.config/knowledge-kb/**`; `--plugin-dir plugin` (the F4 text); Claude Code 2.1.309;
`CLAUDE_CODE_PRINT_BG_WAIT_CEILING_MS=0`; a fresh scratch stack on **:8891** (legacy mode, no Gemini key, no
push); no permission-skipping flag. One change from round 2: run 1 keeps its session (no
`--no-session-persistence`), so that run 2 can `--resume` it. Each cwd is an empty scratch folder, not a git
repository and not a workflow workspace.

## Planned runs (before any ran)

| Run | What | Lead | Expected | Watchdog |
|---|---|---|---|---|
| f4a | rv2a's prompt word for word (`/knowledge:explain how a French press brews coffee and how to make a good cup with one (reader: someone using a French press for the first time) quick`), held 15 minutes after `state: done` | sonnet | ≈ $2–4 | $6 |
| f4b | the same request again, `--resume` of f4a's session | sonnet | ≈ $0.3–1 | $2 |
| f4c | optional: a second Sonnet `quick` run on a new small subject, held 15 minutes after `done` | sonnet | ≈ $2–4 | what the cap leaves |

## Runs

| # | Run | Lead | `total_cost_usd` | Running total |
|---|---|---|---|---|
| 1 | f4a (rv2a's prompt; 16 turns in its last segment, 619 s wall; published v1 to :8891; `state: done` 01:50:54, the process ended 01:51:03; held to 02:06:03; watchdog estimate 2.04, counted as the higher) | sonnet | 1.91 | **2.04** |
| 2 | f4b (`--resume` of f4a's session, the same words; 1 turn, 9 s, no tool call; printed the report line and URL, then stopped). Its `total_cost_usd` (2.17) is the resumed session's cumulative figure; this run's own share is 2.17 − 1.91 = 0.26, watchdog estimate 0.27, counted | sonnet | 0.26 | **2.31** |
| 3 | f4d (added: a deliberate re-explain in the user's own new words, `--resume` of f4a's session: "…, again as a v2 that pins down the water temperature quick"; found the prior v1, re-ran D0b, wrote run `20261024-0212-french-press-v2`; stopped by me at that new run id, 02:13:23, before any publish; no `result` event, so the watchdog estimate counts) | sonnet | — | **3.09** (+0.78) |
| 4 | f4c (the optional second sample: `/knowledge:explain how HTTP ETags let a browser revalidate a cached page (reader: a junior web developer) quick`; 353 s wall; published v1 to :8891 at 02:20 and printed its report, but wrote no `report.md` and left `run.md` at `state: running`; the process ended 02:20:07; watchdog estimate 1.44, counted) | sonnet | 1.22 | **4.53** |

**Added after run 4, before running them** (the repeat guard's trigger was widened from "brought to `state: done`"
to "finished (its report given or `state: done`)", because f4c finished without writing `state: done`; these two
runs put the guard's evidence on the shipped wording, and give a third sample of the wait rule):

| Run | What | Lead | Expected | Watchdog |
|---|---|---|---|---|
| f4e | a Sonnet `quick` run on a new small subject, session kept, held 15 minutes after it finishes | sonnet | ≈ $2–3 | $4 |
| f4f | the same request again, `--resume` of f4e's session | sonnet | ≈ $0.3 | $1 |

| # | Run | Lead | `total_cost_usd` | Running total |
|---|---|---|---|---|
| 5 | f4e (`/knowledge:explain what a Bloom filter is and when to use one (reader: a backend developer new to probabilistic data structures) quick`; 17 turns in its last segment, 511 s wall; published v1 to :8891; `state: done` and the process end both 02:30:32; watchdog estimate 2.21, counted) | sonnet | 2.14 | **6.74** |
| 6 | f4f (`--resume` of f4e's session, the same words; 1 turn, 14 s, no tool call; printed the report line and URL, said it started no new run and how to ask for a v2, then stopped). Its `total_cost_usd` (2.40) is cumulative; its own share 2.40 − 2.14 = 0.26, watchdog estimate 0.27, counted | sonnet | 0.26 | **7.01** |

**Total: $7.01 of $12.** No watchdog fired. After each run the leak scan (`leakcheck/scan.py` over `scratchpad/f4/`,
this folder and `~/.claude/projects`) found only the six known files. Runs f4a and f4e kept their sessions (for the
resumes) in `~/.claude/projects/-private-tmp-claude-502-…-scratchpad-f4-runs-f4a-work/` and `…-f4e-work/`; they
carry only the scratch token.
