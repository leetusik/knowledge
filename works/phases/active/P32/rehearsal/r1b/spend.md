# Rehearsal 1b: spend

Cap: **$45** for every `claude -p` run in P32.F1 (raised to **$75** at OQ8, d61: a loop-safety stop, not a budget; the operator: "I don't care about the token spending for now"), summed from each run's last `result` event's
`total_cost_usd` (subagents included); a run stopped by its watchdog counts the watchdog's estimate from the
streamed usage (whichever is higher). No run carries a `--max-budget-usd`; each rewrite runs under
`harness/watchdog2.py` with the threshold below. Running total kept as each run returns.

## Planned runs (before any ran)

| Run | What | Lead | Expected | Watchdog |
|---|---|---|---|---|
| rw-c | C rewritten from its dossier, `resume` at D6: D6–D9 with the critic (Sonnet) and a publish to the F1 scratch API (:8831) | opus | ≈ $8–12 | $14 |
| rw-g | G the same, from S7's scratch dossier (with `pages/`) | opus | ≈ $9–13 | $16 |
| judge ×4 | blind, Sonnet, C and G, both position orders, S7's rubric and judge rubric | sonnet | ≈ $0.6 each | — |
| confirm | `quick` on a Sonnet lead, the `knowledge` CLI off PATH (the §3.9 verifier on another model, the curl `--payload` publish) | sonnet | ≈ $2–3 | $5 |
| confirm-resume | `resume` with no run id, finding the confirm run set back to `stopped` at D9 (the resume lookup) | sonnet | ≈ $0.5–1 | $2 |
| reserve | one more rule revision's rerun of one subject (D6 onward) and its two judges, if a subject misses | opus | ≈ $10–12 | — |

Expected without the reserve ≈ $23–32; with it ≈ $34–44.

## Runs

| # | Run | Lead | `total_cost_usd` | Running total |
|---|---|---|---|---|
| 1 | confirm (first try) | sonnet | **5.05** (watchdog estimate; killed at its $5 threshold, no `result` event) | 5.05 |
| 2 | rw-c (D6–D8; the critic, dispatched in the background, stopped by `claude -p` after 10 idle minutes) | opus | 5.99 reported; **7.17** watchdog estimate (the killed critic is not in `total_cost_usd`) | 12.22 |
| 3 | rw-g (D6–D9: outline, three passes, critic, revision, published) | opus | **11.41** (watchdog estimate 14.15) | 23.63 |
| 4 | judge-G-o1 | sonnet | 0.45 | 24.08 |
| 5 | judge-G-o2 | sonnet | 0.49 | 24.57 |
| 6 | rw-c2 (`resume` at D8: preflight, the critic twice (the first hit its 60-turn limit), revision, publish, D9) | opus | **7.39** (watchdog estimate 10.56) | 31.96 |
| 7 | judge-C-o1 | sonnet | 0.53 | 32.49 |
| 8 | judge-C-o2 | sonnet | 0.55 | 33.04 |
| 9 | rw-c-v2 (C rerun from a fresh copy of its dossier, D6–D9 under rules v2; the critic once, at `maxTurns: 120`; fresh stack :8832) | opus | **7.55** (watchdog estimate 9.41) | 40.59 |
| — | *stopped on OQ8; resumed after the operator's answer (d61)* | | | |
| 10 | judge-C-o1-v2 | sonnet | 0.47 | 41.06 |
| 11 | judge-C-o2-v2 | sonnet | 0.50 | 41.56 |
| 12 | confirm2 (`quick`, the flag set apart; Sonnet lead, the `knowledge` CLI off PATH; verifier on Opus; published by `pagetext.py --payload` + curl to :8835) | sonnet | 2.35 | 43.91 |
| 13 | confirm2-resume (`resume` with no run id; the run set back to `stopped` at D9, a newer finished decoy beside it) | sonnet | 0.51 | 44.42 |
| 14 | rw-g-v2 (G rerun from a fresh copy of S7's dossier, D6–D9 under rules v2: outline, three passes, the critic once in the foreground, one revision, published; fresh stack :8834) | opus | **9.55** (watchdog estimate 11.90) | 53.97 |
| 15 | judge-G-o1-v2 | sonnet | 0.35 | 54.32 |
| 16 | judge-G-o2-v2 | sonnet | 0.40 | 54.72 |

**Total: $54.72 of $75** (completed runs at their `total_cost_usd`; the two runs without one, at the watchdog's
estimate). Every planned run has run; nothing is left to run.

## Notes

- **The first confirm run was wasted ($5.05).** Its prompt (S7's text) ended "…who writes API clients quick". The
  Sonnet lead read "quick" as part of the sentence ("quickly") and ran `full`: five Opus researchers. The watchdog
  stopped it at D2. The next prompt needs the flag set apart, for example "(reader: …) quick".
- **The watchdog overestimates on these runs.** Against `total_cost_usd` it read 1.24× (rw-g), 1.43× (rw-c2) and
  1.25× (rw-c-v2), where S7 saw ≈ 1%. A threshold is therefore conservative. `rw-c` is counted at its estimate
  because its critic was killed and is missing from `total_cost_usd`.
- **Where it stopped.** After rw-c-v2, the leak scan found two hits outside the three known ones. Both are
  transcripts of another project (`~/.claude/projects/-Users-sugang-projects-KRPD-glide-glide-ilab/`, sessions
  of 2026-10-07 and 10-08, cwd `/Users/sugang/projects/glide/glide-ilab`). The directory was created at 10:15
  today, and its files were moved in at 10:26–10:28. None of the rehearsal's runs wrote there. The plan's rule
  says a new hit means stop, so no `claude -p` ran after the scan. The files belong to another project and
  predate this slice, so they were not redacted.
- **The continuation (d61).** The cap went to $75, a loop-safety stop. Runs 10–16 ran in the order d61 set: C v2's
  judges, then the confirm and resume runs (in parallel with G, on their own stack :8835), then G v2 and its judges.
  The watchdog read 1.25× on rw-g-v2 (11.90 against 9.55).
- **A sixth leak-scan hit, after rw-g-v2.** `~/.claude/projects/-Users-sugang-projects-KRPD-glide/0118b617….jsonl`, a
  session of 2026-10-07 with cwd `/Users/sugang/projects/glide/base`; the token is in a tool result at line 275. Every
  file in that folder has a status-change time of 11:16:20 today and a birth time of 2026-10-22 11:23:19 (the
  glide-ilab files' batch): it was moved in by something outside the rehearsal, after the scan that followed the
  resume run (clean) and while only rw-g-v2 was running (its own project folder, `-private-tmp-…-runs-g2-work`,
  is clean). No `claude -p` started after the hit was seen; the two G judges, already
  running, finished, and the final scan found the same six files. Not redacted: another project's file, outside the
  edit scope.
