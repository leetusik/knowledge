# A scratch workspace for a rehearsal (P32.S9)

This folder stands in for an agentic workspace installed at the root, holding one explain phase, `P90`, in
`works/phases/active/P90/`. It is a rehearsal fixture, so four things differ from a real workspace:

- **There is no workflow engine.** `scripts/workflow.py` does not exist. Wherever a reference, a plan or your
  agent file tells you to run `python3 scripts/workflow.py <command>` (or `workflow/scripts/workflow.py`), do not
  run it: append the exact command, with one line on why, to `works/phases/active/P90/engine-log.md`, and go on as
  if it had succeeded. Read and edit `phase.md` with Read and Edit, one section at a time.
- **The do-whole-phase references** an explain phase uses are in `.claude/skills/do-whole-phase/reference/`
  (`explain-decomposition.md`, `explain-chapter.md`, `dispatch.md`, `verdicts.md`).
- **The knowledge plugin is loaded for this session from a folder**, not installed:
  its explain skill is `/Users/sugang/projects/personal/knowledge/plugin/skills/explain/SKILL.md`, version 0.6.0.
- **Nothing is published.** The knowledge base is a scratch one that the environment already configures (the
  skill's §2 resolver prints it).

Commits follow the convention `type(scope): summary` (imperative, no period).
