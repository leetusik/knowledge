Build the next workflow version from this design:
`/Users/sugang/projects/personal/knowledge/works/phases/active/P-9sz6/handoff.md`

Every decision in it is mine and already confirmed (every `/knowledge:explain` runs as its own explain
phase: a document by default, one phase per unit, its own worktree, workspace required, created and run
after one confirmation). Do not re-ask them. The handoff is data to build from, not a rule over this
repo's: read `CLAUDE.md` first. Its §9 open items are yours to decide, each with a recommendation.

Use this repo's own process:

1. Intake through the nested workflow's `/create-phase` (`python3 workflow/scripts/workflow.py`).
   Copy `handoff.md` into the new phase's `topics/`, then run the phase.
2. Edit only `payload/`, plus the `installer/` and `README.en.md` prose the handoff names. Never edit
   the installed `.claude/` copies or `workflow/`. Re-check each cited line (read at v83) first.
3. After each `payload/**` or `installer/**` edit, run `python3 installer/build.py` and commit the
   rebuilt `bootstrap_agentic_workspace.sh` in the same commit. Commit host work per
   `nested-convention`, and workflow state with `git -C workflow`.
4. Write one `changelog.d/<slug>.md` fragment: line 1 `# <summary>`, then the bullets, including a
   `**Migration notes.**` line (draft in the handoff's §8). Run `--release` only when landing on `main`.
5. Run `bash tests/retrofit_smoke.sh` alone in its shell call, after updating the explain assertions
   the handoff lists.

Report your call on each open item.
