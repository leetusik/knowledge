# P40-2t.S4 — engine patch

Kind `implementation`, a round-1 wave slice: S1 + S2 + S3 + S4 run at once. Mode `auto`.

## Goal

Write change-list D1–D3 as patch notes in `package/patches/engine.md`:

- **`finish_slice`:** drop `and not explain_phase(pdir)` from the v77 forced declaration, and drop the
  comment above it. `explain_phase()` itself stays, for the detached host worktree.
- **`cmd_parallel_plan`:** drop its explain note and its early `return`.
- **`tests/retrofit_smoke.sh`:**
  - flip Test 10d's probe: an explain DECOMP over an undeclared chapter is refused, and passes once
    the chapter is declared;
  - remove the P42 block's comment "explain chapters stay undeclared".

## Validation

- Every find occurs exactly once at `fdb1151`.
- Build a scratch copy of `fdb1151`'s payload, installer and tests, in two plain commands:
  - `git -C /Users/sugang/projects/personal/bootstrap_agentic_workspace.sh archive -o <scratchpad>/p40-s4.tar fdb1151 payload installer tests`
  - `tar -xf` in the scratchpad.
- With the patch applied to that copy:
  - the flipped probe passes. Run the whole patched suite if it finishes in reasonable time;
    otherwise run Test 10d's probe on a scratch install, and say which you ran;
  - `parallel-plan` on an explain phase prints its rounds.
- Report the smoke-suite literal list.

## Risk

`low` (the mid row). There are two deletions, each pinned to its line, and the guard only gets
stricter, never looser. Return `escalate` if the probe does not flip cleanly.

## Read first

- **`topics/breakdown.md`.** Its *Pins for every edit slice (S1–S6)* bind:
  - the base is `fdb1151`;
  - read the bootstrap only with `git -C /Users/sugang/projects/personal/bootstrap_agentic_workspace.sh show fdb1151:<path>`
    or the `archive` command above, written literally, one plain command per call;
  - patches use the `**Find**` form;
  - no test files are written. Editing the suite's probe inside a patch note is a patch to the
    bootstrap's existing suite, not a new test file.

  Also read your own block there, `## P40-2t.S4`.
- **`topics/change-list.md`.** §3(d)'s engine lines and your rows D1–D3 in §5 are the contract.
- **`intent.md`**, *Confirmed Intent*.

## Never

- Write in the bootstrap repo, Note or arb_upbit_1, or anything outside your set. The scratchpad is
  the one exception, and it holds the scratch install.
- Commit, move workflow state, or run an engine command that writes in this repo. The scratch
  install's own commands are fine.
- Search the web or spend money.

## Return

`result.md`, with the structured verdict block first: status, route, model, effort, summary,
files_changed, validation, deviations, doc_impact, notebook. The detail follows it.

The `notebook` field carries:
- your block's Doc impact note;
- a Notes-for-later-slices entry for S6, listing the smoke-suite literals your edit removes or
  changes;
- any Decisions gist line;
- any Operator Question.

## Wave

- **Your set.** Edit nothing else, apart from your slice folder's `result.md`:
  `works/phases/active/P40-2t/package/patches/engine.md`.
- **Running beside you.** Never touch their sets:
  - P40-2t.S1: `plugin/skills/explain/SKILL.md`, `.agents/skills/explain/SKILL.md`,
    `web/public/SKILL.md`, `plugin/agents/explain-critic.md`
  - P40-2t.S2: `works/phases/active/P40-2t/package/claude/skills/create-phase/{explain-route.md,research-route.md}`,
    `works/phases/active/P40-2t/package/patches/create-phase.md`
  - P40-2t.S3: `works/phases/active/P40-2t/package/claude/skills/do-whole-phase/reference/explain-{decomposition,chapter,review}.md`,
    `works/phases/active/P40-2t/package/patches/workflow.md`
- **Done slices whose commit waits:** none.
- **Join-rebuilt artifact:** none.
- **Checks:** only the ones under Validation. A whole-tree check is `deferred: whole-tree`.
- **Notebook:** write no `phase.md`. Return your entries in the verdict's `notebook` field, by section,
  each one gist-sized.
- **No engine command that writes.** `validate` and `phase-section` reads are fine.

## Dispatch

route=mid
reason=kind implementation rated low
subagent_type=slice-executor
model=opus
pass_model=yes
effort=medium
pass_effort=yes
attribution=Claude Opus 5.5
explore_model=haiku
explore_effort=xhigh
