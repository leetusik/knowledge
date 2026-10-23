# Rehearsal 1: the rubric

S1 §3.13's draft rubric, with S2 §3.14's additions, as P32.S7 applies it. Written before either arm ran.

## The arms

- **old:** `plugin/` at `2849ea6` (0.5.0), extracted with `git archive`, loaded with `--plugin-dir`.
- **new:** `--plugin-dir plugin` (0.6.0), RUN `full` (the default).
- Both: `claude -p --model opus`, the same shared brief (`subjects.md`), the same permission rules (the new
  skill's printed rules for that run's paths), the same isolation (scratch `XDG_*`/`KB_*`,
  `--setting-sources project`, the config deny rules), `CLAUDE_CODE_MAX_WEB_SEARCHES_PER_SESSION=300`, and a
  `--max-budget-usd` backstop far above the expected cost. Each arm publishes to its own fresh scratch API
  (same build, same settings), so neither run sees the other's document as a prior version.

## Absolute checks, binary, per chapter

| Id | Check | Kind | Who checks it |
|---|---|---|---|
| R1 | Each must-cover point is present **and** correct (`subjects.md`) | mandatory | judge |
| R2 | Each expert-expectation point is present | optional | judge |
| R3 | Citation accuracy: 15 cited statements sampled uniformly (all if fewer); each cited page re-opened; supported / partial / unsupported / **contradicted** → a percentage; effective citations counted. Any contradicted statement fails | mandatory (no contradiction) + metric | judge |
| R4 | Source quality: the share of load-bearing claims resting on a primary source or on two independent ones; a load-bearing claim resting on a content farm or aggregator alone fails | metric + negative | judge |
| R5 | Code truth (subject C): every repository entity named (file, function, constant, env var, response field) exists at the pinned commit; 10 sampled code claims match the code | mandatory | judge |
| R6 | Each trap committed | negative | judge |
| R7 | Instructions: English; `knowledge check` exits 0; a quiz of about 5 items whose keys are correct | mandatory | `check`: P32.S7 (both chapters, same scratch API); English and quiz keys: judge |
| R8 | Declared gaps: what the chapter does not know is said, not glossed over | mandatory (new arm) | judge, both chapters; for the new arm P32.S7 also checks that every `gaps/final.md` line is honoured as its disposition says |
| R9 | Length guard: word count reported; padding or repetition is a negative; length is not merit | negative | word counts: P32.S7; padding: judge |

**New-arm checks (S2 §3.14), done by P32.S7 from the dossier, outside the blind judge:**

- R3's sampled statements traced in `trace.md`; untraceable checkable sentences counted.
- R4 read from `ledger.md`'s statuses, then spot-checked against the judge's re-opened pages.
- The evidence gate's decision and the counter-evidence outcomes go in the process record.

## Pairwise

Helpfulness, Comprehensiveness, Insight (why and trade-offs, not only what), Readability for the stated
reader. The judge sees both chapters unlabelled as "Chapter 1" and "Chapter 2", with nothing that names an
arm; it runs **twice per subject with the positions swapped**, each time in a fresh `claude -p` session on
Sonnet (the writers are both Opus, S2 §3.14). A win counts only when both orders give it to the same
chapter; otherwise it is a tie. The judge is told that length is not merit.

## Process record (reported, not scored)

Per arm and subject: wall time, cost (`total_cost_usd`, subagents included), the lead's tool calls,
researcher / gap-reviewer / verifier / critic dispatches, rounds and the stop reason, searches used, failures
and re-dispatches, the duplicate-query rate across researchers, and (new arm) the gate's counts and the
counter-evidence outcomes.

## Decision rule (S1 §3.13)

The new arm is better when all of these hold on **both** subjects:

1. it has no mandatory failure (R1, R3 contradiction, R5, R7, R8) that the old arm lacks;
2. its citation accuracy (R3) is at least the old arm's;
3. it wins or ties the pairwise judgment on Comprehensiveness **and** Helpfulness in both orders;
4. the operator's read agrees (waits for the acceptance walkthrough).

Until the operator reads one subject, the verdict is provisional on rule 4.
