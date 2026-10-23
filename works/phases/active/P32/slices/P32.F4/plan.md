# P32.F4 — explain waits only by ending its turn, never re-runs itself; the verifier-defect clause matches B4

## Goal

Fix round 2's two findings (P32.REVIEW `result.md`, round 2; evidence `rehearsal/review/r2/evidence.md`).

1. **The skill can re-run itself.** In run rv2a, the Sonnet lead called `ScheduleWakeup` five times while it
   waited on its agents, and each call used the skill's own invocation as the prompt. One fired after
   `state: done`. The lead took it for a re-explain and started an unasked v2 run: no D0b, new research, a
   verifier in the background, and another wakeup.

   Run unchecked, that is a spend loop that supersedes the reader's published document with a version nobody
   asked for. The skill says only "end your turn and wait"; it says nothing about wakeups, crons or a request
   re-sent after `done`. In the rehearsal transcripts, 2 of 9 Sonnet leads set wakeups.
2. **F2's §4.9 sentence contradicts B4, D3v and §3.3.** It says "a verifier … on your model while
   `knowledge:verifier` was listed is a defect". That is wrong in `full` on a Sonnet lead: there the researchers
   are Opus, and the verifier is correctly Sonnet, the lead's own model.

## Read first

- `phase.md` `## Notes for later slices`:
  - **Rules for every slice**;
  - **(from P32.REVIEW, for P32.F4)**, which is yours;
  - **(from P32.REVIEW, for the re-review round 3)**.
- P32.REVIEW's `result.md`, round 2 (its findings and candidates 4–6); `rehearsal/review/r2/evidence.md`.
- `plugin/skills/explain/SKILL.md` by section:
  - the card (the D-table, *The run*, *The stop rules*);
  - §3.2 (D0b, probe A's "End your turn and wait", ≈ line 384);
  - §3.5 step 2 (the waves);
  - §4.9 (≈ line 1092);
  - §4.10;
  - §5 (re-explain, superseding: what makes a v2);
  - §9.1;
  - B2 and B6 (the `searches:` return lines).

## What to change (all three copies; `skills_parity.py`, `--write-agents` if Part B changes)

**(a) The wait rule.** State it once, where the card lists the stop rules, and cite it from §3.2 step 3,
§3.5 step 2 and wherever else the skill says "end your turn and wait":

- You wait for an agent only by ending your turn. Its completion notification starts your next one.
- Never schedule your own resumption: no `ScheduleWakeup`, no `CronCreate`, no monitor, and no sleep or poll
  loop.
- A subagent lead waits in the foreground (d65). Keep that rule as it is.

**(b) The repeat guard.**

- A request whose words match a run this session already finished (`state: done`) is never a new run on its
  own:
  - **interactive:** ask the user once whether they want a re-explain (a v2) or nothing;
  - **headless (`claude -p`):** print the done run's report line and the document's URL, then stop.
- A re-explain needs the user's own new words, or their yes to that question.
- Make this the third exception in the card's "ask the user nothing" rule, beside §9.1's book question and
  §5's 409.
- **Do not break a deliberate re-explain.** A user asking for a v2 in their own words (§5's re-explain path)
  still gets one, as today.

**(c) The §4.9 clause.** "or on your model" becomes "or on the researchers' model (in `quick`, yours)". Re-read
B4, D3v and §3.3's `verifier:` line, and check that the four now agree.

**(d) The tidies (round 2's candidates 4–6):**

- B2's `searches:` return line collides with B6's `searches: <n>`. Make them one form.
- §3.2's folder clause must not read as making a code researcher's working-folder `git`, or the critic's
  read of the skill, "the dispatch's error".
- `plugin/README.md`'s `quick` line ("researches alone … one verifier batch") should match §3.9 as F2 left it.

**(e) The landing.** If `wc -l web/public/SKILL.md` moves off 2,608, update `lede` and `pane.meta` in
`web/src/content/marketing/content.ts` to the new count. Change nothing else there. The literal is deferred
(D74).

**Size:** net growth ≤ 1.5 KB over 155,790 B. Report the new size.

## Verify live

Use round 2's harness copy (`scratchpad/review2/harness`, with `CLAUDE_CODE_PRINT_BG_WAIT_CEILING_MS=0` so the
session stays open the way an interactive one would), under the same isolation:

- a fresh scratch port of your own;
- scratch `XDG_*` and `KB_*`, checked with §2's resolver first;
- `--setting-sources project`, the deny rules on `//Users/sugang/.config/knowledge-kb/**`, `--plugin-dir
  plugin`;
- `watchdog2.py`, never a visible `--max-budget-usd`;
- never a permission-skipping flag.

The runs:

1. **rv2a's prompt, word for word, on a Sonnet lead,** held 15 minutes after `state: done`. Pass:
   - the lead's stream has no `ScheduleWakeup` or `CronCreate` call;
   - the dossier holds exactly one run id;
   - the document stays at v1.
2. **The repeat guard under `claude -p`:** after run 1 is `done`, send the same request again in the same
   session (`--resume` with that session's id, as the harness allows). Pass: the lead prints the done run's
   report line and URL, and stops, with no new run id and no new version. If the harness cannot resume a
   session, say so and check (b)'s text instead.
3. **Optional, if 1–2 pass and the cap allows:** a second Sonnet `quick` run on a new small subject, held 15
   minutes after `done`, for a second sample of (a).

The headline from F2 must still hold in run 1: `path: plugin`, the verifier on another model, `plan.md`,
`outline.md` with `## Reader's task`, and `trace.md`. F2's two known misses (the dossier line, the `searches:`
total) are deferred (D72); if they recur, note them but do not count them as failures.

A run that fails (a)'s or (b)'s pass line: revise once, then rerun that case once. A second miss returns
`needs_operator` with the evidence.

**Cap: $12** for the runs, in `rehearsal/f4/spend.md`. It is a loop-safety stop (d61). At the cap, return
`needs_operator`.

After each run, run the leak scan:

`python3 -I /private/tmp/claude-502/-Users-sugang-projects-personal-knowledge/c2016e8a-14bf-4ba0-89b3-a899f1c9c55e/scratchpad/leakcheck/scan.py <your run dirs> ~/.claude/projects`

The six known hits are those listed in P32.REVIEW's plan, round 1. Any other hit: redact it if it is yours,
then stop and return `needs_operator`.

- Never use `:8766`, `:3030`, `:8777`, `:8797` or production.
- Stop only your own PIDs, and stop a run that starts an unasked second run at once.

Keep `rehearsal/f4/`: `spend.md`, each run's `run.md`, `report.md` and file listing, and a short `evidence.md`
with the wakeup/cron count from the stream. No `pages/`.

## Verification

- `python3 scripts/skills_parity.py`, `python3 scripts/plugin_parity.py` and `claude plugin validate plugin`
  pass.
- The live runs pass as above.
- `git diff --stat` stays within `plugin/` (README included), `.agents/skills/explain/`,
  `web/public/SKILL.md`, `web/src/content/marketing/content.ts` (only if (e) applies) and this phase's folder.
- `python3 scripts/workflow.py validate` passes.
- The bootstrap needs no command; run none there.

## Notebook and result

- **`phase.md`, one section at a time:**
  - remove the F4 note;
  - update the round-3 note (what F4 changed, which runs to look at, the landing count if it moved);
  - `## Decisions` (one line; long material goes to `topics/build-decisions.md`);
  - `## Doc impact`: product.md for the wait rule and the repeat guard; architecture.md if B2/B6 change;
  - `## Now`.
- **`result.md`:** the verdict block first (`status`, `tier`, `model`, `effort` from `## Dispatch`, `summary`,
  `files_changed`, `validation`, `deviations`, `doc_impact`). Then the edits and the size, each run's checks,
  and the spend.
- No commit, no push, no state command.

## Dispatch

slice=P32.F4
phase=P32
kind=fix
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
