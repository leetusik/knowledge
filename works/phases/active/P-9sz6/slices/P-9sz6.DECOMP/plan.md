# P-9sz6.DECOMP — plan

Mode: `auto` (the operator's explicit word: "/do-whole-phase the created phase with automode").

## Goal

Cut P-9sz6 into its middle slices and write `topics/breakdown.md`. The phase's whole
deliverable is two files in the phase folder, `handoff.md` and `prompt.md`, as
`intent.md`'s *Confirmed Intent* describes. Read `intent.md` first; it is the record of
what was asked and the operator's decisions. This phase is not an explain phase (no
`## Explain` section) and not a design phase.

## What the phase must produce (for sizing the cut)

- `works/phases/active/P-9sz6/handoff.md`: the design for the session that builds the new
  workflow version in the bootstrap repo (`/Users/sugang/projects/personal/bootstrap_agentic_workspace.sh`,
  sources under `payload/`, never its installed `.claude/` copies). It carries every
  decision in `intent.md`, why, what differs from today, the workflow/plugin ownership
  split, and a closing list of what the workflow author decides. It should point at the
  real places that change (for example `payload/claude/skills/create-phase/SKILL.md`'s
  *The explain route*, `payload/claude/skills/do-whole-phase/reference/explain-*.md`,
  `payload/contract.md`'s worktree and "making a phase ≠ executing it" rules, and the
  knowledge plugin's `plugin/skills/explain/SKILL.md` §1 placement, §3.3 run state and
  §9.1 book suggestion in this repo), located by reading, not guessed.
- `works/phases/active/P-9sz6/prompt.md`: a short paste-in prompt for a bootstrap-repo
  session that points at `handoff.md` and asks for the new workflow version per that
  repo's own `CLAUDE.md` (changelog fragment, build, release rules).

## Expected cut (the executor decides; this is the orchestrator's expectation)

The work is one coherent writing job over two repos' text, with no product code. One
middle slice is the expected shape: `P-9sz6.S1`, writing both files, `--kind research`
(findings-only: the handoff is the finding; it writes no product code and edits nothing
in either repo outside this phase folder), which routes to the high row by kind. Its
`--depends-on none`. If you find a real reason to split (for example the plugin-side
analysis is large enough to land first), split and chain with `--depends-on`; say why.

Each slice block in `topics/breakdown.md` carries goal, set (the files it writes: the
phase folder's `handoff.md`, `prompt.md`, its own slice folder, `phase.md` via
`phase-section`), risk and trigger, `spends money: no`, depends on. Add `## Passes` and
`## Estimate` (from `python3 scripts/workflow.py dispatch-summary`'s `means` block).

## Rules for this slice

- Create slices with `python3 scripts/workflow.py new-slice` (bare folders, never a
  `plan.md`), each declared with `--depends-on`.
- Write the breakdown to `topics/breakdown.md`; in `phase.md` only gist lines through
  `phase-section` (a `Breakdown (DECOMP): …` line under `## Decisions` linking the topic,
  and rewrite `## Now`).
- Do not run `accept-gate`, commit, or move phase status; the orchestrator declares the
  gate after `finish-slice` (it will be `--require`: the operator reads the handoff
  before it is used, as approved).
- No `## Doc impact` note is expected: the phase changes no durable truth of this repo.
- Return `parallel:` as `parallel-plan P-9sz6` prints it.

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
