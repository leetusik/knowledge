# P32.F5 — The verifier refuses to run on the researchers' model, as the critic does with the writer's

## Goal

Fix round 3's finding (P32.REVIEW `result.md`, round 3).

In `quick`, nothing mechanical keeps the verifier off the researchers' model. In run f4c, a Sonnet lead sent
`knowledge:verifier` without `model: opus`, so Sonnet checked Sonnet's own research. The report called it only
"weaker", and the document was published.

This breaks the intent's "a different model re-opens the sources" and its "loud when it fails". Of 10 Sonnet
`quick` runs that reached the verifier, 8 set the model right the first time. The critic is already guarded
mechanically (B5's `writer_model`); the verifier is the only role whose model split depends on the lead
remembering a parameter.

## Read first

- `phase.md` `## Notes for later slices`:
  - **Rules for every slice**;
  - **(from P32.REVIEW round 3, for P32.F5 and the re-review round 4)**, which is yours.
- P32.REVIEW `result.md`, round 3: the finding, and why the alternatives (an Opus frontmatter, or a second
  agent pinned to Opus) fall short.
- `rehearsal/f4/f4c/` and `rehearsal/review/r3/`.
- `plugin/skills/explain/SKILL.md` by section:
  - B5's `writer_model` guard (≈ lines 1795–1810, and the critic's `blocked` return), which is the pattern to
    copy;
  - B4 (the verifier);
  - §3.3's `verifier:` line;
  - §3.6 D3v;
  - §3.8 D5;
  - §3.9;
  - §4.10, how a `blocked` critic is answered;
  - the card's wait bullet.

## What to change (all three copies; regenerate `plugin/agents/verifier.md` with `--write-agents`)

**(a) B4's dispatch carries `researchers_model: <id>[ · same-model: accepted]`.**

- The verifier compares that id with its own model.
- It returns `status: blocked: same model as the researchers` when they match, or when the field is missing.
- A match is allowed only when the dispatch says `same-model: accepted`.
- Mirror B5's wording and shape; do not invent a second pattern.

**(b) Every dispatch of the verifier fills the field:** §3.6 D3v, §3.8 D5 and §3.9 (`quick`: the lead's own
id), and the book's top-up through §9.3 if it dispatches B4.

- A `blocked` for the model is answered by correcting `model:` and sending once more, as §4.10 does for the
  critic.
- §3.3's `verifier: same model (degraded)` is allowed only under `same-model: accepted`, for example when no
  other model can be dispatched.
- Say when the lead may accept it, in one sentence, using B5's rule.

**(c) The tidy:** the card's wait bullet is scoped to "a background agent". A foreground dispatch (§4.10's
critic, d65's subagent lead) returns in the same turn.

**(d) The landing:** if `wc -l web/public/SKILL.md` moves off 2,622, update `lede` and `pane.meta` in
`web/src/content/marketing/content.ts` to the new count, and change nothing else there.

**Size:** net growth ≤ about 0.8 KB over 156,887 B. Report the new size.

## Verify live

Use round 2's harness at `scratchpad/review2/` (token `rv2-token`; F4's `monitor.py` and `count.py` sit beside
it), under the same isolation:

- a fresh scratch port of your own;
- scratch `XDG_*` and `KB_*`, checked with §2's resolver first;
- `--setting-sources project`, the deny rules on `//Users/sugang/.config/knowledge-kb/**`, `--plugin-dir
  plugin`;
- `watchdog2.py`, never a visible `--max-budget-usd`;
- never a permission-skipping flag.

The runs:

1. **A direct probe of `knowledge:verifier` from a Sonnet main thread,** on 2–3 claims from rv3a's dossier
   (`rehearsal/review/r3/`; re-fetch any page you need into the scratch state only).
   - With `researchers_model: claude-sonnet-5-5` and no `model:`: expect `blocked: same model as the
     researchers`.
   - Then with `model: opus`: expect a verify file written by Opus.
   - With the field missing: expect `blocked`.
2. **One Sonnet-lead `quick` run on a new small subject,** held 15 minutes after `done`. It must show:
   - F2's headline: `path: plugin`, the verifier on a model other than the lead's, and `plan.md`,
     `outline.md` with `## Reader's task`, and `trace.md`;
   - F4's checks: no lead `ScheduleWakeup`, `CronCreate` or `Monitor`, and one run id;
   - `researchers_model:` on every verifier dispatch in the stream.

   If the lead forgot `model:` and the verifier blocked, the stream must show the re-send on Opus. That is a
   pass, and the point of the fix.

A failure of 1 or 2: revise once, then rerun that case once. A second miss returns `needs_operator` with the
evidence.

**Cap: $10** for the runs, in `rehearsal/f5/spend.md`. It is a loop-safety stop (d61). At the cap, return
`needs_operator`.

After each run, run the leak scan:

`python3 -I /private/tmp/claude-502/-Users-sugang-projects-personal-knowledge/c2016e8a-14bf-4ba0-89b3-a899f1c9c55e/scratchpad/leakcheck/scan.py <your run dirs> ~/.claude/projects`

The six known hits are those listed in P32.REVIEW's plan, round 1. Any other hit: redact it if it is yours,
then stop and return `needs_operator`.

- Never use `:8766`, `:3030`, `:8777`, `:8797` or production.
- Stop only your own PIDs, and stop at once any unasked second run.
- Do not persist a session you do not need to resume.

Keep `rehearsal/f5/`: `spend.md`, `evidence.md`, the probe's returns, the run's `run.md`, `report.md` and
file listing. No `pages/`.

## Verification

- `python3 scripts/skills_parity.py`, `python3 scripts/plugin_parity.py` and `claude plugin validate plugin`
  pass.
- The live checks pass as above.
- `git diff --stat` stays within `plugin/`, `.agents/skills/explain/`, `web/public/SKILL.md`,
  `web/src/content/marketing/content.ts` (only if (d) applies) and this phase's folder.
- `python3 scripts/workflow.py validate` passes.
- No command runs in the bootstrap repo.

## Notebook and result

- **`phase.md`, one section at a time:**
  - remove the F5 part of the note, and keep a one-line round-4 note: what F5 changed and which runs to look
    at;
  - `## Decisions` (one line; the detail goes to `topics/build-decisions.md`);
  - `## Doc impact`: architecture.md for B4's `researchers_model` guard, and product.md if the report's
    wording changes;
  - `## Now`.
- **`result.md`:** the verdict block first (`status`, `tier`, `model`, `effort` from `## Dispatch`, `summary`,
  `files_changed`, `validation`, `deviations`, `doc_impact`). Then the edits and the size, each check, and the
  spend.
- No commit, no push, no state command.

## Dispatch

slice=P32.F5
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
