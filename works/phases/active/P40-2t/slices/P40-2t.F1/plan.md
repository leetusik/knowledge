# P40-2t.F1 — offer research first whenever the records lack what the reader needs

This is a `fix` slice with `risk: high`. The defect spans S1 (high), S2 (mid) and S6 (mid). Mid-row
work goes to the high row, and the trigger rule is open design, pinned below. The slice runs alone in
`auto` mode. It answers review round 1's finding F1 (`slices/P40-2t.REVIEW/result.md` § *F1*). It
also takes two minor items from the same review and F2's hand-off.

## The defect

The operator confirmed the arb_upbit_1 shape as the one standard way. That shape starts from a
**codebase subject its code phases already cover** ("performance rule v2 with basic quant
knowledge"), where the reader needs outside basics that no record holds.

Every shipped text offers "research first" only when **no phase covers the subject**. So that case
gets no offer. Worse, an operator who replies "research first" anyway gets nothing, because step 8
creates nothing on any reply other than the literal yes.

The downstream half already handles it. **When it passes** puts the research phase on `phases:`
"beside any phase that covers the code", and §9.2 allows a research phase that recorded outside
basics in a codebase book. Only the way in is missing.

## The rule (pinned by the orchestrator at review round 1)

This follows the operator's confirmed intent: one standard way, and the upbit case is one of the two
cases it was meant to cover. The operator's own words in that case were "you may create phase for
information gathering, and then start the writing".

- **Offer "research first" whenever the records do not carry what the reader needs.** That is
  either:
  - a subject no phase covers, or
  - a covered subject where a drafted section or a must-cover item rests on something no covering
    record states (a field's terms, a formula, outside basics).

  The confirmation names what the records lack, offers "research first" beside "yes", and sets the
  block's `sources:` to match (`web`, plus `code` if wanted).
- **Always honour an operator's "research first"**, or research asked for in their own words,
  whatever the coverage. It is never a reply that creates nothing.
- **What does not change:**
  - the research block's fields (`paths:` names the subject's code; `none` for a no-code subject);
  - the chain and **When it passes**;
  - the redraw. It puts the building phases **and** the research phase on `phases:`, and a covered
    codebase subject keeps book kind `codebase`.
- "Yes" (explain from the records as they are) stays available for a covered subject. The missing
  parts then become stated gaps, as today.

## Files (the review's list, plus the hand-offs)

- **The plugin skill.** In `plugin/skills/explain/SKILL.md`, change:
  - §1 COVERAGE, including **None covers it** and the research block's lead-in;
  - the front door's steps 5–8, wherever "research first" is gated on no coverage;
  - the frontmatter description.

  Then re-derive the `.agents` and web copies the way S1 did (`topics/notes-for-later-slices.md`) and
  run `python3 scripts/skills_parity.py --write-agents`. Rename no heading, and change no cited bold
  part's opening words.
- **The package:**
  - `claude/skills/create-phase/explain-route.md`: *When no phase covers the subject*, *A "research
    first" reply*, and the stale **unit** sentence. That sentence reads "The literal `unit` line is
    what the plugin's front door tests for", but 0.11.0 tests `**sources**` under *The research
    route*.
  - `claude/skills/create-phase/research-route.md`: its opening, "When no phase covers its subject".
  - `patches/create-phase.md` 1c, which edits create-phase step 2 ("no phase covers the subject
    yet").
  - `patches/release.md` §2, §3 and §5: the changelog fragment, `README.en.md`'s block and the seed
    operations doc.
  - `PATCHES.md`'s minor sentence. It says "Two files are edited by two patch files", but only
    `tests/retrofit_smoke.sh` is.
- **The prose:**
  - `plugin/README.md`. Besides the trigger, add F2's permission rule
    `"Bash(git -C <BOOK> show HEAD:./*)"` to *Explain: permissions*, in the skill §3.2's form (F2's
    note in *Notes for later slices*).
  - The root `README.md`.
  - `plugin/skills/setup/SKILL.md`.
  - `plugin/templates/kb/docs/getting-started/{{KB_DATE}}-how-your-knowledge-base-works.md`.
  - The descriptions in `plugin/.claude-plugin/plugin.json` and `.claude-plugin/marketplace.json`.
- **The landing count.** Recount `web/src/content/marketing/content.ts` L251 and L261 to
  `wc -l plugin/skills/explain/SKILL.md` after your edits. It was 2,674 after F2. Change the count
  only, because the lede is OQ2's, for the operator.

## Acceptance matrix: prove each case

| # | Case | Must |
|---|---|---|
| 1 | Code no phase covers, no outside basics | "research first" (sources: code) or "yes" from the code. Still passes. |
| 2 | Code no phase covers, and the reader needs outside basics | research first with `sources: code · web`. Still passes. |
| 3 | A no-code subject with no research phase | research first only (web, the operator's material). Still passes. |
| 4 | A no-code subject a research phase covers (by coverage or `from=P<N>`) | goes on. Still passes. |
| 5 | **Code phases cover, but the reader needs outside basics no covering record states** (P58-pm → P59-d8) | the confirmation names what the records lack and offers "research first" beside "yes"; the chain runs; the redraw puts the building phases and the research phase on `phases:`; the book kind stays `codebase` |
| 6 | **A covered subject, and the operator replies "research first"** (or asks for research in their own words) | it is honoured: the research phase is created |
| 7 | Cases 5–6 through the explain route's own confirmation (a direct "make an explain phase for X") | the same |
| 8 | A v2 of a covered subject that asks for outside material | as case 5 |
| 9 | The research route and create-phase step 2 accept a block for a covered subject (`paths:` its code; `sources:` web, and code if wanted) | both accept it |
| 10 | Every prose description of the trigger agrees: the READMEs, setup, the KB template, the three descriptions, and the release fragment, `README.en.md` block and seed operations doc | all say the new rule; none says "a subject no phase covers" as the only case |
| 11 | The readiness test, the `**sources**` marker, the 44 headings and the citation checks | stay green |

Prove cases 1–9 by tracing each through the new texts. Quote the governing sentence for each step:
the front door, then create-phase, then the research route, then **When it passes**, then the redraw.
Prove case 10 with a grep for the old phrasings across every file in the list, which must find no
sole-trigger left. Prove case 11 with the checks below.

## Validation

- `python3 scripts/skills_parity.py` and `python3 scripts/plugin_parity.py` PASS.
- `uv run pytest tests/test_explain_resolver.py -q` passes.
- The heading list is unchanged (44 headings), and no cited bold part's opening words change.
- `python3 works/phases/active/P40-2t/package/checks/finds.py`: every find occurs exactly once at
  `fdb1151`.
- `checks/apply.py` succeeds on a fresh scratch copy of `fdb1151`. Make the copy with
  `git -C /Users/sugang/projects/personal/bootstrap_agentic_workspace.sh archive -o <scratchpad>/p40-f1.tar fdb1151`,
  then `tar -xf` in the scratchpad. On that copy, rebuild the artifact (`python3 installer/build.py`)
  and run the whole patched `tests/retrofit_smoke.sh`.
- `checks/cites.py` against the 0.11.0 skill reports missing 0.
- `wc -l plugin/skills/explain/SKILL.md` equals `content.ts`'s count.
- `pnpm --dir web typecheck` and `test` pass, because `content.ts` changes.
- `python3 scripts/workflow.py validate` passes.

## Never

- Write in the bootstrap repo, Note or arb_upbit_1. The scratchpad holds the scratch copy.
- Commit, push, or move workflow state.
- Rewrite the landing lede (OQ2).
- Spend money, or write test files.
- Keep commands plain and literal (this worktree session refuses complex git commands).

## Return

`result.md`, with the structured verdict block first, then the acceptance matrix with each case's
evidence. You run alone, so write the notebook through `phase-section`:

- one `## Doc impact` line (`--append`): product.md and decisions.md now say research first is
  offered whenever the records lack what the reader needs, and an operator's "research first" is
  always honoured;
- remove the notes you consume (F2's README note, and the review's note for F1, keeping its REVIEW
  half if one remains);
- replace `## Now`.

## Dispatch

route=high
reason=risk high (not low)
subagent_type=slice-executor
model=opus
pass_model=yes
effort=xhigh
pass_effort=yes
attribution=Claude Opus 5.5
explore_model=haiku
explore_effort=xhigh
