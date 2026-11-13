# P40-2t.F2 — critic reads sibling chapters as committed in both layouts

Kind `fix`, `risk: high`. The defect is in mid-row work (S5), so the fix never goes back to that row.
It runs alone. Mode `auto`. Review round 1's finding F2:
`slices/P40-2t.REVIEW/result.md` § *F2*.

## The defect

A19 (plugin B5 *Inputs*, item 7) and C5 (package `explain-chapter.md`, *What a chapter sees of the
others: nothing in flight*) make the critic read an earlier chapter "only as committed,
`git show HEAD:<path>`", with paths from the repo root.

That breaks in a **nested** install (Note is one). There, `workflow/` is its own git repository and
the host excludes it. So `git show HEAD:workflow/works/…` asks the host for a path the host never
tracks, and it always misses. The critic then silently judges every committed sibling by the outline
alone, even in a sequential run. That contradicts the text's claim that a sequential run "changes
nothing".

## The fix (the review's simplest rule)

Read a sibling as `git -C <the draft's folder> show HEAD:./<sibling file>`. `HEAD:./…` resolves
against `-C`'s folder, so the same command reads the nested repo when nested and the host repo at
root. State it once, in words a critic can run as written, in each of these places:

- **`plugin/skills/explain/SKILL.md`, B5 *Inputs* item 7.** Keep the rest: a sibling not at `HEAD` is
  judged by the outline's taught terms and recap lines.
- **The skill's two copies.** Re-derive them the way S1 did (`topics/notes-for-later-slices.md`): the
  `.agents` copy is the plugin body under `.agents`' own 4-line frontmatter, with `description:` from
  the plugin; the web copy is a plain `cp`. Then run `python3 scripts/skills_parity.py --write-agents`,
  which regenerates `plugin/agents/explain-critic.md`.
- **`works/phases/active/P40-2t/package/claude/skills/do-whole-phase/reference/explain-chapter.md`,**
  *What a chapter sees of the others*, and any sentence there or in `explain-review.md` that hands the
  critic a `HEAD:` path from the repo root. Make "a sequential run changes nothing" true in both
  layouts.

**Do not** recount `web/src/content/marketing/content.ts`. F1 runs next and recounts once at its end.

## Acceptance matrix: prove each case

| # | Case | Must |
|---|---|---|
| 1 | At-root install, chapters one at a time | The critic reads each committed earlier chapter. |
| 2 | At-root, a wave | Committed siblings are read at `HEAD`; in-flight ones are judged by the outline. |
| 3 | **Nested install, one at a time** | The critic reads the committed earlier chapters. Before this fix, it failed. |
| 4 | **Nested, a wave** | The same. Before this fix, it failed. |
| 5 | Both layouts | "A sequential run changes nothing" holds. |
| 6 | The review's freeze check (already `git -C workflow`) | Unchanged, still passes. |

Prove cases 1–4 with plain git on a scratch pair in the session scratchpad:
- **The root repo:** a book file committed and one uncommitted.
- **The nested pair:** a host repo, plus a `workflow/` repo the host excludes, holding the same.

Run the exact command the new text prescribes, from the host root as the critic does, and show it
reads the committed file and misses the uncommitted one in both layouts. Prove case 5 by reading the
new text. Prove case 6 by `diff`: `explain-review.md`'s freeze check is unchanged.

## Validation

- `python3 scripts/skills_parity.py` and `python3 scripts/plugin_parity.py` PASS. The critic agent is
  regenerated, and its item 7 carries the new rule.
- `uv run pytest tests/test_explain_resolver.py -q` passes.
- The heading list is unchanged (44 headings). No cited bold part's opening words change.
- `python3 works/phases/active/P40-2t/package/checks/cites.py` against the 0.11.0 skill reports
  missing 0.
- `python3 works/phases/active/P40-2t/package/checks/apply.py` succeeds on a fresh scratch copy of
  `fdb1151`:
  1. `git -C /Users/sugang/projects/personal/bootstrap_agentic_workspace.sh archive -o <scratchpad>/p40-f2.tar fdb1151`
  2. `tar -xf` in the scratchpad.

  Run the patched smoke suite whole if it is quick (S6 took one run), or at least its static Test 0
  block. Report which you ran.
- `python3 scripts/workflow.py validate` passes.

## Never

- Write in the bootstrap repo, Note or arb_upbit_1. The scratchpad holds the scratch repos and copy.
- Commit, push, or move workflow state.
- Touch F1's scope: the research-first trigger, the READMEs, `content.ts`.
- Spend money.
- Write test files. The scratch repos are throwaway proof, not tests.

## Return

`result.md`, with the structured verdict block first, then the acceptance matrix with each case's
evidence.

Write your own notebook entries through `phase-section`, since you run alone:
- one `## Doc impact` line (`--append`): decisions.md, the critic reads committed siblings with
  `git -C <draft folder> show HEAD:./<file>`, so it works at root and nested;
- `## Now`, replaced.

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
