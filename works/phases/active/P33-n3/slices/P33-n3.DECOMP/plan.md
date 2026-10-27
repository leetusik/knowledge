# P33-n3.DECOMP — plan

Mode: `auto` (the operator's words: "you do it by it's order. no blocker. full auto till D-32rc
ends"). Plan inline, no approval pause; settle judgment calls by recommendation and record them.

## Goal

Cut P33-n3 ("Explain front door") into its middle slices and write `topics/breakdown.md`. Read
`intent.md` first: the scope is the accepted P-9sz6 handoff §7 (`works/phases/active/P-9sz6/handoff.md`
§7, with §3.5's confirmation sketch, §3.6's smaller defaults, §6's interface and §8's release
notes). The v86 workspace side it hands off to is already installed here:
`.claude/skills/create-phase/SKILL.md` (*The explain route*, *A confirmed proposal*) and
`.claude/skills/do-whole-phase/reference/explain-{decomposition,chapter,review}.md`. **Not a design
phase**: no `## Design Style`, no `co-work` slice.

## Read (just what the cut needs)

- `intent.md`, handoff §3.5, §6, §7, §8.
- `plugin/skills/explain/SKILL.md` by its headings (2,635 lines: the run card L22–101, §1 L103,
  §2 L180, §3.1 L282, §3.3 L459, §7 L1320, §8 L1329, §9.1 L1359), not whole; use `Explore` for bulky
  reads.
- **The citation map:** every place the v86 workspace cites this skill's sections or wording
  (`grep -rn "§\|Part B\|knowledge:explain" .claude/skills .claude/agents CLAUDE.md`). List each
  cited section and what the citing text expects to find there, in `topics/citations.md`. This is
  the rewrite's interface contract: every cited heading stays, at the same number, with content that
  still answers the citing text.
- Every other plugin file that names the parts that go (the run card, `resume`, the out-of-repo
  dossier state, `here`, §9.1's proposal, the no-workspace path): `plugin/README.md`,
  `plugin/skills/setup/SKILL.md`, `plugin/agents/*.md` (B5's critic agent), `plugin/templates/kb/…`
  getting-started page, `plugin/.claude-plugin/plugin.json`, `.claude-plugin/marketplace.json`; and
  any repo test or check that reads the plugin's skill or version (`grep -rn "explain/SKILL\|0.6.0"
  tests web scripts .github 2>/dev/null`).

## Expected cut (you decide)

- **`P33-n3.S1`** (already promoted from D-32rc; its folder exists, keep it): the front-door
  rewrite of `plugin/skills/explain/SKILL.md`: the run card and §1 become the front door (flags,
  workspace find and readiness check — workspace v86+ and the route's `unit` field — the single
  confirmation for every unit, the hand-off to `create-phase`, refusal with no or an old workspace,
  a repeat offering resume or a v2); what goes, shrinks and stays per handoff §7; every cited
  heading kept stable per `topics/citations.md`. Rate its risk deliberately: the skill is the
  interface the workspace's executors read by path and cite by section, which may be a **wide
  blast radius** trigger (`high`); say which and why. Re-rate the promoted `--risk low` with
  `set-slice-risk` (or the engine's equivalent) if you rate it high.
- Possibly **`P33-n3.S2`**: the plugin's outer surface: `plugin.json` / `marketplace.json`
  descriptions and the version bump 0.6.0 → 0.7.0, `plugin/README.md` (explain needs a workflow
  workspace v86+; the old one-shot and resume prose goes), the setup skill and the KB template page
  where they describe the old flow; any test or check the version touches. Merge it into S1 if it is
  small; split it if S1's set would otherwise be too big for one executor.
- Declare every middle slice (`--depends-on`); disjoint sets only when truly disjoint.
- In each breakdown block: goal, set (every file it may touch), risk and trigger, `spends money:
  no`, depends on, and how it is verified (no real browser applies: the skill is prose an agent runs;
  verification is a read-through against the citation map and the handoff, a dry run of the front
  door's readiness check and proposal drafting against this workspace **without** creating a phase,
  and any plugin tests). Also `## Passes` and `## Estimate` from `dispatch-summary`'s `means`.

## The acceptance gate (recommend; the orchestrator declares)

This phase changes what the operator sees when they run `/knowledge:explain` (after they push and
update the plugin). Recommend `--require` or `--waive` with a reason in your verdict; the
orchestrator runs `accept-gate` after `finish-slice`.

## Rules for this slice

- `new-slice` bare folders only (no `plan.md`), declared with `--depends-on`. Never edit S1's
  existing `plan.md` (the orchestrator replaces it when it plans S1).
- `phase.md` only through `phase-section`: a `Breakdown (DECOMP): …` gist line under `## Decisions`,
  notes for the slices under `## Notes for later slices` if useful, rewrite `## Now`.
- No `accept-gate`, commit or status moves. Return `parallel:` as `parallel-plan P33-n3` prints it.
- Operator questions only if one contradicts the operator's words or the accepted handoff; anything
  else is decided by recommendation and recorded.

## Dispatch

route=high
reason=kind decomposition
subagent_type=slice-executor
model=opus
pass_model=yes
effort=xhigh
pass_effort=yes
attribution=Claude Opus 5.5
explore_model=haiku
explore_effort=xhigh
