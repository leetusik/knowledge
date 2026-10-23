# P32.F2: spend

Cap: **$20** for the runs together, summed from each run's last `result` event's `total_cost_usd` (subagents
included); a run stopped by its watchdog counts the watchdog's estimate (whichever is higher). A loop-safety stop,
not a budget (d61). No run carries a `--max-budget-usd`; each runs under `watchdog2.py` with the threshold below.
At the cap the slice returns `needs_operator`.

Isolation, unchanged from P32.REVIEW: its harness (`scratchpad/review/harness/`), copied to F2's scratch folder
with its paths and token changed (token `f2-token`); scratch `XDG_CONFIG_HOME`, `XDG_STATE_HOME`, `KB_ROOT`,
`KB_API_BASE_URL`, `KB_API_TOKEN`, each checked with the skill's §2 resolver before the run; `--setting-sources
project`; `--permission-mode manual --permission-prompts none`; the deny rules on
`//Users/sugang/.config/knowledge-kb/**`; `--plugin-dir plugin` (the edited skill); `--no-session-persistence`;
Claude Code 2.1.309; a fresh scratch stack on **:8863** (legacy mode, no Gemini key, not a git repo, no push). Each
cwd is an empty scratch folder, not a git repository and not a workflow workspace. No permission-skipping flag.

## Planned runs (before any ran)

| Run | What | Lead | Expected | Watchdog |
|---|---|---|---|---|
| f2a | run a's prompt word for word: `/knowledge:explain a book on the history of the Roman Empire, from the founding of Rome to the fall of Constantinople (reader: a curious adult with no background in history) quick` | sonnet | ≈ $2–4 | $6 |
| f2b | a plain single document on a small general subject, no `book`: `/knowledge:explain what a sourdough starter is and how to keep one alive (reader: a home cook baking their first sourdough loaf) quick` | sonnet | ≈ $2–3 | $6 |
| f2c | optional, only if f2a and f2b pass: a second book request outside a workspace (the branch run a failed on), a different subject | sonnet | ≈ $2–4 | $6 |

## Runs

| # | Run | Lead | `total_cost_usd` | Running total |
|---|---|---|---|---|
| 1 | f2a (run a's prompt; 486 s wall; `path: plugin`, probes A and B on haiku, `plan.md`, findings, library, `knowledge:verifier` on Opus; **stopped at D3v**, `FAILED: permissions`: the lead's dispatch named `tools:` as the explain root, not `<TOOLS>`, so the verifier's converter call fell outside the allow rule; nothing published; watchdog estimate 1.86, not triggered) | sonnet | **1.93** | 1.93 |
| 2 | f2b (sourdough starter, plain single document; 782 s wall; `path: plugin`, probes on haiku, `plan.md`, findings, library, `knowledge:verifier` on Opus, `gaps/final.md`, `outline.md` opening with `## Reader's task` (not in the chapter), `trace.md`, published to :8863; **missed** the count: `run.md` `searches: 2 (probe)` against 14 made (lead 4, probe 1, verifier 9), its mode block left at the preflight's (`verifier: … pending`), and no dossier check before D9; watchdog estimate 2.68) | sonnet | **2.83** | 4.76 |

One revision after runs 1–2 (the plan allows one): §3.2 (a denied call on another folder than `run.md`'s `dossier:`/`tools:` is the dispatch's error: corrected and re-dispatched once, not a stop), B6 (every role's second return line is `searches: <n>`; agents regenerated), §3.3 (`searches` = yours + the probe's one + each return's line), the card's D9 row and §8 (the dossier check first, the mode block brought up to date). Then each case reran once.

| # | Run | Lead | `total_cost_usd` | Running total |
|---|---|---|---|---|
| 3 | f2a2 (f2a rerun, run a's prompt, a fresh stack on **:8864**; 65 s wall; the lead dispatched probes A and B on haiku (the plugin path's preflight), then **stopped at D0b**, `FAILED: permissions`: probe B ran call 3 as `mkdir -p … && curl …`, a form outside the allow rules, so it was denied; nothing written; watchdog estimate 0.47) | sonnet | **0.41** | 5.17 |
| 4 | f2b2 (f2b rerun, sourdough, a plain single document, **:8864**; 572 s wall; `path: plugin`, probes A and B on haiku, `plan.md`, findings, `library.md`, `verify/`, `gaps/final.md`, `outline.md` opening with `## Reader's task` (not in the chapter), `trace.md`, published to :8864 only; **missed** again: `run.md` `searches: 1 (probe)` against 5 made (lead 4, probe 1, verifier 0), no dossier `ls` before D9, and the first `knowledge:verifier` dispatch had no `model` and ran on Sonnet (r1-b1); the lead saw the model in its return and re-ran the batch on Opus (r1-b2), which the ledger cites; watchdog estimate 1.89) | sonnet | **2.04** | **7.21** |

f2c (optional) did not run: its condition (f2a and f2b pass) failed. Both cases missed twice, so the slice returns `needs_operator` with **$7.21 of $20** spent. Both scratch stacks (:8863, :8864) are stopped. Leak scans after every run: the same six known files, nothing new.
