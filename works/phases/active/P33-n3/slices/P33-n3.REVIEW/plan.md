# P33-n3.REVIEW — plan

Mode: `auto`. The phase review, high row. The acceptance gate is **required**. The operator asked
for an unattended run ("no blocker. full auto till D-32rc ends"): settle any judgment call by
recommendation and record it; the gate itself stays the operator's.

## The boundary

`phase-scope P33-n3`: range `f3c3994..74fd086`, 4 commits, `product_files=11`: the explain skill's
three copies (`plugin/skills/explain/SKILL.md`, `.agents/skills/explain/SKILL.md`,
`web/public/SKILL.md`), `plugin/agents/explain-critic.md`, both manifests
(`plugin/.claude-plugin/plugin.json`, `.claude-plugin/marketplace.json`), `plugin/README.md`, the root
`README.md`, `plugin/skills/setup/SKILL.md`, the KB template getting-started page, and
`web/src/content/marketing/content.ts`. Re-run only the `## Regression Checklist` lines
(`docs/current/qa.md`) those files feed (the P32 explain-skill lines: parity, the explain runs, the
landing's skill pane), never the whole list. Anything outside is an observation or a deferred-job
candidate, never a finding. Single-repo, at-root install: no team-rules check.

## What to review

1. **Validation:** `python3 scripts/workflow.py validate`; every slice's verdict block and its
   commands (S1: `skills_parity.py`, `plugin_parity.py`, the citation check, `claude plugin validate
   ./plugin`; S2: `json.tool` on both manifests, `claude plugin validate .` and `./plugin`, `pnpm --dir
   web typecheck`, `pnpm --dir web test`, the landing count equal to `wc -l web/public/SKILL.md`).
2. **Against the intent:** read `intent.md` and the accepted handoff
   (`works/phases/active/P-9sz6/handoff.md` §3.5, §6, §7). Every *goes* gone, every *shrinks* shrunk,
   every *stays* intact; the front door does exactly what §7 says (flags, workspace find, readiness
   v86+ and `unit`, one confirmation for every unit, the hand-off to create-phase, refusal with no or
   an old workspace, a repeat offering resume or a v2) and nothing more. Version 0.7.0; the outer
   surface says a workspace v86+ is needed.
3. **The interface:** re-run the citation check in `topics/citations.md` (`missing=0`), and read every
   row whose content S1 changed against its citing text in the installed v86 skills
   (`.claude/skills/create-phase/SKILL.md`, `.claude/skills/do-whole-phase/reference/explain-*.md`,
   `.claude/agents/slice-executor.md`). Check the drafted `## Explain` block's fields against
   create-phase's *The explain route* and *A confirmed proposal*, field by field.
4. **Gate stages — run it yourself**, never on the slices' reports alone. The product here is a skill
   an agent runs, so the "running product" is the front door itself: load the local plugin
   (`claude --plugin-dir ./plugin -p "/knowledge:explain <a small subject>"` headless, which must print
   the one confirmation and stop without creating a phase; and the refusals in scratch folders in the
   session scratchpad — no workspace, a fake v85). **Never let a run reach `create-phase`**: check
   `git status` and `works/phases/active/` before and after every run; a phase created is a finding
   and must be reported, not silently removed. Read the landing's skill pane live (the dev runtime
   `:3030` per `## Operator Runtime`, or a scratch dev/prod build if `:3030` does not serve the new
   file), with the instrument `## Operator Runtime` names; name it in `result.md`. Walk the front door
   once as a first-time operator: is the confirmation clear, does each refusal say what to do?
5. **Regression Checklist:** re-run the in-boundary lines. Three P32 lines test the removed
   single-document engine (a `quick` document under `claude -p`; the 15-minute repeat; `book` under
   `claude -p` outside a workspace): classify them superseded by this phase and, on pass, replace them
   with front-door lines in the review's `## Regression Checklist` write (the qa gate section,
   `doc-new-version` for that section only, per the `review-phase` skill).
6. **Notebook:** `## Doc impact` has S1's and S2's lines; complete it (`doc_impact_added:`).
   `## Operator Questions`: route OQ1 (the landing's two framing lines) into the walkthrough as one
   decision with the recommendation (keep `.agents/` in parity now; reword the two lines in a
   follow-up, in the operator's words), or into a deferred-job candidate — say which. Deferred
   candidates to list (file nothing yourself): deleting the vendored `.claude/skills/explain/`; S2's
   two pre-existing observations (the KB template page §1's straight-to-file fallback; setup skill
   L49's project-name rule in general mode).

Do not edit any source: findings are reported, never silently fixed. On a non-passing verdict, finish
the whole judgment first, then return numbered findings, one proposed fix slice per problem class
(`fix`, its risk; `high` for a defect in S1's high-row work only when the mid row cannot, `high` for a
fix to S2's mid-row work).

## On pass: the walkthrough

By the contract's stop rules: about 2k characters plus links, at most ~5 decisions (OQ1 is one), the
rest in one "decided as drawn" list, and "accept" signs everything. It tells the operator how to try
it before pushing (`claude --plugin-dir ./plugin`, then `/knowledge:explain <subject>` in this repo:
the one confirmation; answer no, or yes on a small subject if they want a real run) and after (push,
then update the installed plugin from `/plugin`). Decided-as-drawn includes S1's recorded calls
(`## Decisions`) that change what the operator sees.

Return `review_verdict`, `doc_versions` (the qa gate section only, or `none`), `doc_impact_added`,
the fixed `explain:` pointer line the review-phase skill names, and the `walkthrough`. `result.md`,
verdict block first. Do not run `accept-gate` or `review-phase`, commit, or move state.

## Dispatch

route=high
reason=kind review
subagent_type=slice-executor
model=opus
pass_model=yes
effort=xhigh
pass_effort=yes
attribution=Claude Opus 5.5
explore_model=haiku
explore_effort=xhigh
