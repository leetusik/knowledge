# P32.F1 — Make the new chapter helpful and easy to read: writing shaped by the reader's task

## Goal

The operator, on rehearsal 1's result: **"make it new one also helpful and reading easy."** (intent.md; Decisions
d56.) On subject C, the blind judges gave the new chapter Comprehensiveness and Insight and the old one Helpfulness
and Readability, in both orders, at the same length (≈ 4,100 words). The old chapter followed the reader's task
(a step-ordered code walk with annotated code and diagrams, ending in a "Before you change the write path"
checklist and the test that pins it); the new one followed the research (its best findings packed into one
"invariants and their edges" section of 150–250-word paragraphs, citations mid-sentence). G's old chapter has a
"Should you use it today?" section answering the brief; the new draft (≈ 2× longer) has none.

The cause is in the skill: the brief records the reader's `purpose` (§3.1), but D6 builds the outline from claims
and questions, D7 writes each section alone from its claim ids, and the critic checks facts, ledger and coverage
but never whether the reader can do their task. Fix the writing stage so the research **supports** a chapter
shaped around the reader's task, then prove it on C and G. The research stage (D0–D5g) does not change.

## Read first

- `intent.md` (the new Confirmed Intent bullet "More thorough must not mean harder to use").
- `phase.md` `## Notes for later slices`: **Rules for every slice**; **(from P32.S7, for P32.S7's continuation,
  on OQ7's yes)** — now yours; **(from P32.S7, for P32.S9)** (the `claude -p` mechanics and the denied forms);
  **(from P32.S7, for P32.REVIEW)**. `## Decisions` d53–d56.
- `slices/P32.S7/result.md` (What ran, Fixes, To finish) and `rehearsal/r1/`: `scorecard.md`, `rubric.md`,
  `judges/` (both C records: what each judge said about Helpfulness and Readability), `harness/` (reuse it),
  `spend.md`. Read `chapters/c-old.md` and `c-new.md` side by side, and skim `g-old.md` and `g-new-draft.md`.
- `plugin/skills/explain/SKILL.md` by section (`grep -n '^#'`): §3.1 (the brief), §3.3 (`run.md`, resume),
  §3.10 D6, §4's opening (D7), §4.2, §4.4's callouts, §4.5, §4.10 D8, §8 D9, §9.3, and B5 (the critic: inputs,
  how you check, the rubric, the categories).

## What to change (all three copies; Part B via `--write-agents`)

1. **D6 starts from the reader's task.** From the brief's `purpose`, write a `## Reader's task` list at the top
   of `outline.md`: the 2–4 things the reader must be able to do afterwards. The sections follow the path the
   reader takes to do them (code: the order it runs; a general subject: the decision or the steps in the order
   the reader meets them); each task gets a section that delivers it. Each research finding is placed in the
   step it changes, not gathered into a caveats section. A claim that serves no task and no must-cover point is
   listed `not used` in `outline.md` and stays out of the chapter. Must-cover points and `stated` gaps always
   land; brevity never drops them.
2. **Each task ends in something the reader can use:** a checklist ("Before you change X"), a decision table
   ("try it if… / wait if…"), the commands to run, the test that guards the behaviour, chosen to fit the task.
3. **Readable prose** (§4.2's tone, D7's rules): short paragraphs with one idea each; the code or the example
   first, then the explanation; a finding opens with one bold sentence saying what it means for the reader, then
   the evidence; secondary depth (extra numbers, history, edge evidence) in collapsed callouts so the main line
   reads fast (check §4.4 for the collapsed form the grammar allows); citations at the end of a sentence, not
   inside it; the research depth is never a reason for length in itself (R9). Keep the rules few and concrete;
   the writer must be able to check its own draft against them.
4. **D7's order:** first a skeleton of the whole reader path (headings, a one-line purpose each, the
   deliverables), then each section from the dossier with `trace.md` as today, then a **reader pass**: re-read
   the whole chapter as the stated reader and fix what slows them, adding no fact (it replaces or absorbs
   today's coherence pass).
5. **The critic (B5) gains a `reader` category:** can the stated reader do each stated task from the chapter,
   and is each task's deliverable there (a stated task the chapter does not serve, or a missing deliverable, is
   a `must-fix`); dense paragraphs, buried steps, caveats that interrupt the main line are `should-fix`. The
   critic gets the brief's purpose / the outline's `## Reader's task` as an input. The fact, ledger and coverage
   checks are unchanged. Keep the critic's other severities consistent with this.
6. **§9.3 (a book chapter)** uses the same rules by citing them, never restating them, so S8's package inherits
   them.
7. **S7's small drift:** the lead keeps `run.md`'s mode block current (new-c left `critic: tbd`, `searches: 1`).
8. **Size:** net growth about 3 KB or less (the skill is 149,280 B; OQ5 accepted ≈ 125–145 KB). Trim elsewhere if
   you need room; report the size and where the bytes went.

Design judgment is yours within these lines: you are reshaping how the writer thinks, so prefer a few rules that
change the outcome over many that describe it. A redesign beyond the writing stage goes to `## Now`, not here.

## Isolation: production stays out of every run (unchanged from S7)

For every `claude -p` run (writer, critic, judge, confirming run):

- scratch `XDG_CONFIG_HOME`, `XDG_STATE_HOME`, `KB_ROOT`, `KB_API_BASE_URL`, checked with §2's resolver first
  (it must print your scratch values, never knowledge.hi2vi.com);
- `--setting-sources project`;
- deny `Read`/`Edit` and Bash forms on `//Users/sugang/.config/knowledge-kb/**`, as S7's harness does;
- after each run:
  `python3 -I /private/tmp/claude-502/-Users-sugang-projects-personal-knowledge/c2016e8a-14bf-4ba0-89b3-a899f1c9c55e/scratchpad/leakcheck/scan.py <your run dirs> ~/.claude/projects`
  (prints paths and counts only; the three known hits are the September 29 changple5 log, the
  `1eb18f1b…/subagents/agent-a5c22e0e39716ea81.jsonl` log and the October 13 bootstrap log). A new hit stops the
  slice: redact it, report it, return `needs_operator`;
- publish only to your own scratch stacks (S7's 8821/8822 from their kept `KB_ROOT`s, or fresh ports of your
  own); never `:8766`, `:3030`, `:8777`, `:8797` or production; stop only your own PIDs;
- no `--max-budget-usd` the lead can see; `harness/watchdog2.py` instead.

## Rehearsal 1b

Work in `rehearsal/r1b/` (copy, never edit, `rehearsal/r1/`; reuse its harness by copying what you change).

1. **Rewrite C and G from their existing dossiers, D6 onward, no new research,** with the fixed skill
   (`--plugin-dir plugin`), through the critic and a publish to the scratch stack. Copy each dossier into a fresh
   scratch state dir; set `run.md` to resume at D6 (stage and state per §3.3), and remove the old `body.md`,
   `trace.md`, `critique*.md`, `report.md`; then `/knowledge:explain resume <run-id>`. Record exactly what you
   reset.
   - C: `rehearsal/r1/dossiers/c-new/` (no `pages/`; re-fetch only what the critic needs).
   - G: `/private/tmp/claude-502/-Users-sugang-projects-personal-knowledge/c2016e8a-14bf-4ba0-89b3-a899f1c9c55e/scratchpad/s7/runs/new-g/state/`
     (with `pages/`). If it is gone, stop and return `needs_operator` (a full G rerun is ≈ $40, outside this cap).
   - Same briefs (`rehearsal/r1/brief-C.txt`, `brief-G.txt`), Opus writer.
2. **Judge blind:** Sonnet, both position orders per subject (4 sessions), the same rubric and judge rubric as
   S7, against the same old chapters (`c-old`, `g-old`; S7's stack-old serves them). Spot-check the judges as S7
   did.
3. **Target (the operator's words):** on both subjects, in both orders, the new chapter **wins or ties
   Helpfulness and Readability**, **keeps its win on Comprehensiveness and Insight**, and has no R1/R3/R5/R7
   failure. If a subject misses: one more revision of the rules, one rerun of that subject's D6 onward, one more
   pair of judges. A miss after that is reported as it is, with the scorecard, and the verdict is
   `needs_operator`.
4. **The confirming run** for S7's run-unconfirmed fixes, cheap: `quick` on a Sonnet lead with the `knowledge`
   CLI off PATH (the §3.9 verifier on another model; the curl `pagetext.py --payload` publish), and the resume
   lookup (`resume` with no run id).

**Spend cap: $45** for this slice's `claude -p` runs, summed from `total_cost_usd` (a killed run: the watchdog's
estimate), kept in `rehearsal/r1b/spend.md`. Plan the runs before you start: the two rewrites ≈ $8–12 each, the
four judges ≈ $2.5, the confirming run ≈ $3, a possible rerun ≈ $10. At the cap, return `needs_operator`.

## Verification

- `python3 scripts/skills_parity.py`, `python3 scripts/plugin_parity.py`, `claude plugin validate plugin` pass.
- The scorecard in `rehearsal/r1b/scorecard.md` is complete for both subjects, the target applied.
- Every leak scan is clean; your PIDs are gone; nothing was published anywhere real.
- `git diff --stat` stays in scope (`plugin/`, `.agents/skills/explain/`, `web/public/SKILL.md`, this phase's
  folder); `python3 scripts/workflow.py validate` passes.

## Keep

`rehearsal/r1b/`: what you reset in each dossier, the four chapters' new versions (`c-new.md`, `g-new.md`), the
judge records and key, the scorecard, `spend.md`, and the new dossiers' `outline.md`, `trace.md`, `critique.md`,
`run.md` and `report.md` (no `pages/`).

## Notebook and result

- `phase.md`, one section at a time: remove **(from P32.S7, for P32.S7's continuation…)**; update the S8 note
  with the rule sections §9.3 now cites, the S9 note if the writing changes what S9 must check, and the REVIEW
  note (which chapters the operator reads at the walkthrough); `## Decisions` (long material to
  `topics/build-decisions.md`); `## Doc impact`; `## Now`.
- `result.md`: the verdict block first (`status`, `tier`, `model`, `effort` from `## Dispatch`, `summary`,
  `files_changed`, `validation`, `deviations`, `doc_impact`), then the scorecard summary (old vs new, both
  subjects, both orders, beside rehearsal 1's C result), the spend, the rule changes, and the skill's size.
- No commit, no push, no state command.

## Continuation (OQ8 answered, Decisions d61)

The operator: "I don't care about the token spending for now." Spend is not the bound for now.

- **The two glide-ilab transcripts** (`~/.claude/projects/-Users-sugang-projects-KRPD-glide-glide-ilab/ac92989b….jsonl`,
  `e1d150e2….jsonl`) join the known hits: five in all. They predate P32. Any other new hit still stops the slice.
- **The cap is now $75** for F1's `claude -p` runs in total, the $40.59 already spent included. It is a stop
  for loop safety, not a budget. Keep `spend.md` current.
- **The order** (the steps are in the Notes entry "(from P32.F1, for P32.F1's continuation, on OQ8's yes)"):
  1. C v2's two judges.
  2. G under rules v2 (D6–D9, from the same dossier reset as `reset-g.md`), then its two judges. Run it
     whatever C v2 shows.
  3. The confirming run, with the `quick` flag set apart so the lead cannot misread it, plus `resume` with no
     run id.
- **If v2 still loses Readability on either subject in either order**, make no further rule revision. Report
  it, with what the judges blamed. The next lever, a firm length limit, trades depth, and that is the
  operator's call. **If v2 wins or ties Readability on both**, keep v2 as the rules, check that Helpfulness,
  Comprehensiveness and Insight still hold, and return `done`.
- **`phase.md` is at 40,025 B**, against a 40,960 B budget. Before adding anything, move long `## Decisions`
  material (d57–d61) into `topics/build-decisions.md`, leaving one line each, and remove the consumed
  continuation note.

## Dispatch

slice=P32.F1
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
