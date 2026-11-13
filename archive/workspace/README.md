# Frozen workspace records

This folder is the record of the agentic workspace that developed this repo from its start to commit `1a685682` (workspace engine v89). It is frozen and read-only: never edit it, and no workflow engine runs in this repo.

- `works/`: the phases, slices and deferred jobs, with their plans, results and decisions.
- `docs/`: the versioned durable docs (`current/`, `versions/`, `index.json`) and the design records (`reference/design/`).
- `CLAUDE.archived.md`: the workspace contract this repo ran under, its old root `CLAUDE.md`, renamed so that Claude Code does not load an archived contract as live rules.

On 2026-11-13 the work moved to the hi2vi host's workspace (its `workflow/`, outside this repo). Its open deferred jobs were filed again there, each with a pointer back to its old id here.

Paths inside these records are relative to the old repo root: `works/…` is now `archive/workspace/works/…`, and `docs/current/…` is now `archive/workspace/docs/current/…`. The engine (`scripts/workflow.py`) is not kept; read the files directly.

Two files do not follow that rule: each was renamed from `CLAUDE.md` to `CLAUDE.archived.md`, so that Claude Code does not load it as instructions. The old root `CLAUDE.md` is `archive/workspace/CLAUDE.archived.md`, and the rehearsal record `works/phases/active/P32/rehearsal/r2/harness/ws/CLAUDE.md` is `archive/workspace/works/phases/active/P32/rehearsal/r2/harness/ws/CLAUDE.archived.md`. Records inside the archive still call both by their old name.
