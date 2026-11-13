# Rehearsal 2 spend (P32.S9)

Cap: **$100** for this slice's `claude -p` runs, a loop-safety stop, not a budget (plan decision 4; d61). At the
cap: `needs_operator`. Each run's cost is its last `result` event's `total_cost_usd` (subagents included); a
killed run's cost is `watchdog2.py`'s streamed-usage estimate (it read 1.24–1.43× `total_cost_usd` in F1).

## The runs, planned before the first one

| # | Run | Lead | What it does | Planned | Watchdog (estimate) |
|---|---|---|---|---|---|
| 0 | probes `p1-nest`, `p2-agent` | Haiku | depth-2 nesting, background completions, permission inheritance, deny rules under bypass, transcript layout | ≈ $0.5 | $3 each |
| 1 | `decomp` | Opus xhigh, `--agent slice-executor`, `-p` main thread | §9.2 whole-book research, `book/outline.md`, `summary.md` | $30–50 | $65 |
| 2 | `gate` | Opus, the orchestrator | the outline gate: commit (pages ignored), gate report | $1–3 | $8 |
| 3 | `chapter` | Opus orchestrator (`-p`) → `slice-executor` subagent (Opus xhigh) → research agents (depth 2); critic Sonnet | S1's plan, top-up, D6–D7, check, critic, one revision, freeze check, commit | $20–35 | $45 |
| 4 | `quick` (only if the book is done and the spend allows) | Sonnet | §3.9's D6 fix, one cheap `quick` run | $2–4 | $8 |

Planned total ≈ $55–90.

## Spent

| Run | Cost (USD) | Source | Running total |
|---|---|---|---|
| p1-nest (Haiku) | 0.01 | `total_cost_usd` | 0.01 |
| p2-wave (Haiku) | 0.01 | `total_cost_usd` | 0.02 |
| p3-wave-skip | 0.00 | not run: the auto-mode classifier refused a session with `--allow-dangerously-skip-permissions` | 0.02 |
| p4-agentmain (Haiku) | 0.00 | `total_cost_usd` (0.0025) | 0.03 |
| decomp attempt 1 (Opus xhigh) | 1.46 | `total_cost_usd`; stopped at §2: `FAILED: permissions` on the resolver | 1.49 |
| decomp attempt 2 (Opus xhigh lead; 36 dispatches) | 51.07 | `total_cost_usd` (Opus 37.65, Sonnet 12.41, Haiku 1.01); watchdog estimate read 44.36, so 0.87x: it undercounts here | 52.56 |
| gate (Opus high, orchestrator actor) | 0.54 | `total_cost_usd` | 53.10 |
| chapter (Opus orchestrator, `slice-executor` Opus xhigh at depth 1, research at depth 2, critic Sonnet): stopped by P32.S9 at the cap after the critic returned, as span 3 started | ≈ 48.3 | no `result` event (stopped): priced from the session's transcripts at list prices, 48.01 (executor 27.81, of which span 3's one resumed request 3.44; critic 7.43; depth 2 11.11; orchestrator 1.67), plus ≈ 0.3 for the 13 web searches' fees and their Haiku requests, which the transcripts do not show | ≈ 101.4 |

**Total ≈ $101.4: the cap was passed by ≈ $1.4.** `watchdog4.py` (transcripts plus a $1.5 margin, polled every 20 s,
cap 47.5 for this run) last read 45.85 when the critic returned; the stop came on the orchestrator's next step, by
which time span 3's resumed request had cost 3.44 (one cache write of the executor's whole context). So the
watchdog's margin did not cover a resume. Span 3 (the one revision), the freeze check and the chapter commit did
not run: `needs_operator` (plan decision 4). The `quick` run (#4) was not run.

## What it says about a book's cost

- whole-book research and outline (`DECOMP`, 2 chapters, tier 3, 37 questions, 63 sources, 286 claims, 84 min): **$51.07**;
- the outline gate: $0.54;
- one chapter up to its critique (top-up 1 gap check, 3 researchers, 3 verifier batches; three-pass draft;
  critic): **≈ $48.3**, of which the executor 27.81 and the critic 7.43; the revision (span 3) would add an
  estimated $5–10.
- So a two-chapter book ≈ $160–170, and a six-chapter book with a `DECOMP` of the same tier ≈ $50 + 6 × ($50–58)
  ≈ **$350–400**, at the top of the README's $170–350 estimate (the estimate assumed a chapter ≈ one full
  document, $28–44; a chapter measured more, because the executor's own context grows across the top-up, the
  three passes, D6–D7 and `knowledge check`).
