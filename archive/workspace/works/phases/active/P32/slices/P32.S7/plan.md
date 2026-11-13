# P32.S7 — Rehearsal 1: the single document, old vs new

## Goal

Find out, on real subjects, whether the new pipeline writes better documents than the old one, and fix the
skill where the runs show a problem. Two subjects, one general and one codebase; each goes through the old
skill (plugin 0.5.0 at `2849ea6`) and the new one (`--plugin-dir plugin`, 0.6.0), and is judged blind on one
rubric. Along the way, prove what is still unproven live: `full` with its critic and confirm pass, D5/D5s, the
`STOPPED`/`FAILED` paths, and S3's open `-p` checks. Quality over efficiency; nothing is published anywhere
real.

## Read first

- `phase.md` `## Notes for later slices`: **Rules for every slice**, the **P32.S7** entry (this slice's spec),
  **(from P32.S5, for P32.S7)** (`claude -p` mechanics) and **(from P32.S6, for P32.S7)** (what S6's runs showed
  and what is still unproven; read every sub-bullet).
- `phase.md` `## Decisions` and `topics/build-decisions.md` only where a line you need points there.
- `topics/research-method.md` §3.13 (the rubric) and §6; `topics/research-evidence.md` §3.14 (the judge) and
  §6 Q1–4; `topics/hosts-and-delivery.md` §6 (open questions).
- `slices/P32.S6/result.md` and `slices/P32.S5/result.md`: the run mechanics that worked.

## Isolation: production must stay out of every run (OQ6)

In S6 a test lead opened the operator's real `~/.config/knowledge-kb/config.json` and loaded the production
token. For every `claude -p` run in this slice:

- scratch `XDG_CONFIG_HOME`, `XDG_STATE_HOME`, `KB_ROOT`, `KB_API_BASE_URL`, checked with §2's resolver first
  (it must print your scratch values, never knowledge.hi2vi.com);
- `--setting-sources project`;
- `--disallowedTools "Read(//Users/sugang/.config/knowledge-kb/**)"` plus deny rules for any Bash form that
  could read that folder (for example `Bash(cat:*)` on it), on every run, both arms, and the judge;
- after each run, check that the token reached no file the run wrote: run
  `python3 -I /private/tmp/claude-502/-Users-sugang-projects-personal-knowledge/c2016e8a-14bf-4ba0-89b3-a899f1c9c55e/scratchpad/leakcheck/scan.py <your run dirs> ~/.claude/projects`
  (it reads the config in memory and prints only file paths and counts, never the value; three older files from
  September and October 13 are known hits and not yours). A new hit stops the slice: redact it, report it,
  return `needs_operator`.
- The publish target is only your own scratch stack (your port, fresh `KB_ROOT`; never `:8766`, `:3030` or
  production; stop only your own PIDs).

## The rehearsal

1. **Before either arm**, write by hand in `rehearsal/r1/`: two subjects (one general; one codebase on a scratch
   clone of this repo at a pinned commit), each with a shared brief, 6–10 must-cover points, 3–5
   expert-expectation points and 3–5 trap points; and the rubric (S1 §3.13, R1–R9).
2. **The arms:**
   - old: `plugin/` at `2849ea6` via `git archive` into the scratchpad;
   - new: `--plugin-dir plugin`, `full` mode (the default); both writers on Opus.
   Same brief, same scratch stack, same budget posture. Never set a `--max-budget-usd` near the real cost.
3. **The judge:** Sonnet, twice per subject with the positions swapped, blind to which arm is which, scoring
   R1–R9 by re-opening sources where the rubric says so; then S1's decision rule for the verdict. Record the
   process too (stages run, stops, resumes, cost and wall time per arm, searches per tier).
4. **S3's `-p` checks:** the preflight without and with the printed rules (and auto mode where `-p` allows it),
   state-dir writes, the converter's exact-match rate, searches used per tier, the effort and `maxTurns`
   values, B6's one-form-per-call rule kept by agents; and S6's open items (the lead keeps `outline.md`, the
   `## Critique` answers in `run.md`, `state: done` and all 8 report items; the `quick`/Sonnet same-model
   verifier case; one `STOPPED` or `FAILED` path; the curl publish via `--payload`).
5. **Fix the skill** where a run shows a problem (all three copies, `--write-agents` for Part B, both guards),
   then one cheap confirming run. A redesign-sized problem goes to `## Now` as a proposed F slice, not fixed
   here.

Spend cap for this slice's `claude -p` runs: **$80**, summed from each run's `total_cost_usd`; plan the runs
first and keep a running total in `rehearsal/r1/spend.md`; at the cap, return `needs_operator`.

## What to keep

`rehearsal/r1/`: subjects and briefs, the rubric, the four chapters, the judge records, a scorecard, the new
arm's dossiers (without `pages/`), `spend.md`. The operator's read of one subject waits for the acceptance
walkthrough; say which one in `## Now`.

## Verification

- The scorecard is complete for both subjects, with the decision rule applied.
- Guards pass after any fix (`skills_parity.py`, `plugin_parity.py`, `claude plugin validate plugin`).
- Every leak-check run is clean (no new hits), your scratch PIDs are gone, and nothing was published anywhere
  real.
- `git diff --stat` stays in the edit scope; `validate` passes.

## Notebook and result

- `phase.md`, one section at a time: remove the S7 entry and the S5/S6 notes for S7; add notes for S8/S9 with
  what the rehearsal teaches the package; `## Decisions` (long material to `topics/build-decisions.md`);
  `## Doc impact` for any fix; `## Now`.
- `result.md`: the verdict block first (`status`, `tier`, `model`, `effort` from `## Dispatch`, `summary`,
  `files_changed`, `validation`, `deviations`, `doc_impact`), then the scorecard summary, the spend, and the
  fixes.
- No commit, no push, no state command.

## Dispatch

slice=P32.S7
phase=P32
kind=qa
risk=high
attempt=1
route=high
reason=risk high (not low)
tier=high
subagent_type=slice-executor-high
model=opus
pass_model=yes
effort=xhigh
pass_effort=yes
attribution=Claude Opus 5.5
explore_model=haiku
explore_effort=high
