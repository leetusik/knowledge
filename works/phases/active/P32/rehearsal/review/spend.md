# P32.REVIEW: spend

Cap: **$25** for both runs together, summed from each run's last `result` event's `total_cost_usd` (subagents
included); a run stopped by its watchdog counts the watchdog's estimate (whichever is higher). A loop-safety stop,
not a budget (the operator, d61: "I don't care about the token spending for now"). No run carries a
`--max-budget-usd`; each runs under `watchdog2.py` with the threshold below.

Isolation, as S7/F1/S9: the harness is S9's (`rehearsal/r2/harness/`), copied to the review's scratch folder with
its paths and token changed (token `rv-token`); scratch `XDG_CONFIG_HOME`, `XDG_STATE_HOME`, `KB_ROOT`,
`KB_API_BASE_URL`, `KB_API_TOKEN`, each checked with the skill's §2 resolver before the run (both `ok`: the scratch
API, the scratch token); `--setting-sources project`; `--permission-mode manual --permission-prompts none`; the
deny rules on `//Users/sugang/.config/knowledge-kb/**`; `--plugin-dir plugin`; `--no-session-persistence`; Claude
Code 2.1.309; a scratch stack on **:8851** (legacy mode, no Gemini key, no push). Each cwd is an empty scratch
folder, not a git repository and not a workflow workspace.

## Planned runs (before any ran)

| Run | What | Lead | Expected | Watchdog |
|---|---|---|---|---|
| a | §9.1 outside a workspace: `/knowledge:explain a book on the history of the Roman Empire, … (reader: …) quick`. Under `claude -p` §9.1 never asks: the skill writes the single document and reports the suggestion, so the run carries `quick` (without it, a full research run on a book-sized subject, past the cap). | sonnet | ≈ $2–4 | $6 |
| b | one `quick` single document on a small general subject (HSTS, for a web developer), through the verifier on another model and a publish to :8851 | opus | ≈ $5–12 | $14 |

## Runs

| # | Run | Lead | `total_cost_usd` | Running total |
|---|---|---|---|---|
| 1 | a (§9.1 outside a workspace, `quick`; 40 turns, 233 s; published to :8851; watchdog estimate 0.88) | sonnet | **0.86** | 0.86 |
| 2 | b (one `quick` single document, HSTS; 64 turns, 652 s; verifier `knowledge:verifier` on Sonnet; published to :8851; watchdog estimate 2.72, not triggered) | opus | **3.37** | **4.23** |

**Total: $4.23 of $25.** No run hit its watchdog. After each run the leak scan (`leakcheck/scan.py` over the review's
scratch folder and `~/.claude/projects`) found only the six known files; this folder scans clean. The scratch stack
(PID 40332, :8851) was stopped after run b; the port is free.

Kept here: `a/` (run.md, brief.md, ledger.md, report.md, chapter.md: run a wrote no plan, outline, library, trace or
verify file) and `b/` (run.md, brief.md, outline.md, report.md, chapter.md, verify-r1-b1.md). No `pages/`. No critique:
`quick` skips the critic by design.
