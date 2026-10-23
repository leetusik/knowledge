# Rehearsal 1: spend

Cap: **$80** for every `claude -p` run in P32.S7, summed from each run's last `result` event's
`total_cost_usd` (subagents included). Running total kept as each run returns.

## Planned runs (before any ran)

| Run | What | Lead | Expected |
|---|---|---|---|
| p0-probe | deny rules, hiding the CLI from PATH | haiku | < $0.05 |
| pf-norules | new skill, no allow rules: the preflight must stop with `FAILED: permissions` | opus | ≈ $0.5–1 |
| pf-auto | new skill, `--permission-mode auto`, no allow rules, stopped after D0b | opus | ≈ $0.5–1.5 |
| new-g, new-c | new arm, `full`, subjects G and C | opus | ≈ $15–25 each |
| old-g, old-c | old arm (0.5.0), subjects G and C | opus | ≈ $2–4 each |
| judge ×4 | Sonnet, twice per subject, positions swapped | sonnet | ≈ $2–4 each |
| fail-publish | `no-research`, a tiny repo, a wrong token: `FAILED: publish` | sonnet | ≈ $0.5–1 |
| confirm | the cheap confirming run after the fixes (`quick`, Sonnet lead, no CLI on PATH: the curl publish and the same-model verifier rule) | sonnet | ≈ $2–4 |

Expected total ≈ $50–70. Backstops (`--max-budget-usd`) are far above each run's expected cost and are
never what stops a run on purpose.

## Runs

| # | Run | Lead | `total_cost_usd` | Running total |
|---|---|---|---|---|
| 1 | p0-probe | haiku | 0.0038 | 0.0038 |
| 2 | pf-norules | opus | 0.7799 | 0.7837 |
| 3 | pf-auto | opus | 0.8520 | 1.6357 |
| 4 | p1-grep | haiku | 0.0084 | 1.6441 |
| 5 | fail-pub | sonnet | 0.5196 | 2.1637 |
| 6 | old-g | opus | 1.5330 | 3.6967 |
| 7 | p2-git | haiku | 0.0074 | 3.7041 |
| 8 | old-c | opus | 2.3127 | 6.0168 |
| 9 | p3-hash | haiku | 0.0051 | 6.0219 |
| 10 | new-g (session 1: D0–D3v r1, then `STOPPED: permissions`) | opus | 11.7052 | 17.7271 |
| 11 | new-g (session 2: resume; D3s r1, D4 r1, D2 r2, then the lead stopped itself on the `--max-budget-usd` backstop) | opus | 10.8956 | 28.6227 |
| 12 | new-c (D0–D9, published) | opus | 27.8300 | 56.4527 |
| 13 | judge-C-o1 (blind; chapter 1 = old) | sonnet | 0.6548 | 57.1075 |
| 14 | judge-C-o2 (blind; chapter 1 = new) | sonnet | 0.5522 | 57.6597 |
| 15 | new-g (session 3: resume; D3 r2 – D7, stopped by P32.S7 at the D8 critic dispatch to hold the cap) | opus | 21.0475 ¹ | 78.7072 |

¹ Killed mid-turn, so the stream's last `result` event (19.4405) misses the critic's first minutes; 21.0475 is
the estimate from every streamed message's usage at list prices, which matched the `result` totals of
new-g-resume (10.85 vs 10.90) and new-c (27.85 vs 27.83). The higher figure is the one counted.

## Where it stopped

**$78.71 of $80.** What is left needs about $6–7 more and waits on the operator (P32.S7's `needs_operator`):

| Left | Expected |
|---|---|
| `resume` new-g from D8 (critic, revision, publish) | ≈ $3–4 |
| the two blind judge sessions for subject G | ≈ $1.2 (C's cost $0.65 and $0.55) |
| the confirming run after the fixes (`quick`, Sonnet lead, CLI hidden: curl `--payload` publish, the verifier on Opus) | ≈ $2–3 |

Why it ran over the plan's ≈ $50–70: new-g took three sessions. Session 1 stopped on a skill defect
(`STOPPED: permissions`, fixed as fix 1); session 2's lead read the harness's `--max-budget-usd` backstop and
stopped itself before it ran out (`STOPPED: budget`), so the backstop was replaced by a watchdog the lead
cannot see; each resume re-ran the preflight and re-read the dossier. The new arm costs ≈ 12–18× the old one
per chapter (C: $27.83 vs $2.31).
