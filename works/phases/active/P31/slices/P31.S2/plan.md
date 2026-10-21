# P31.S2 — The explain skill runs `knowledge check` before publishing

## Goal

`/knowledge:explain` (and every parity copy of it) validates the chapter with `knowledge check` (or the curl
`/api/documents/check`) **before** the publish, fixes every listed problem, and only then publishes. The plugin
moves to **0.5.0**.

## Read first

- `phase.md`: the `(from P31.S1, for S2)` and `(from P31.DECOMP, for S2)` notes, which carry the exit codes,
  the output lines, the curl form, the three copies and the gates.
- `plugin/skills/explain/SKILL.md`:
  - §2, the config and how the CLI and curl transports are chosen;
  - §4.8 *Before you publish*;
  - §5 *Publish*, with its 422 branch "fix every listed violation then retry once";
  - §5.1, §6 and §8.

## Approach

1. Add a step to §4.8, or a new §4.9 *Check*, after the read-through:
   - **CLI transport:** `knowledge check <file> <the same flags the publish will use>`.
     - Exit 0: proceed to §5.
     - Exit 1: fix every listed line, then check again. If the same list comes back, STOP and report.
     - Exit 2: if the cause is "no `/api/documents/check`" or a CLI older than 0.2.0 (`knowledge --version`),
       skip the check with one line in the report and rely on §5's 422 branch. If the cause is auth or
       transport, follow the existing failure rules.
   - **curl transport:** the same, with the documented curl form and the publish body.
   - **Offline (§6):** no check is possible. Say so in the report.

   Keep §5's 422 branch as the backstop.
2. Keep it tight. The skill is about 45.9 KB, so add as few bytes as possible, and refer to existing sections
   rather than restating them.
3. Copy the change to `.agents/skills/explain/SKILL.md` (body byte-identical, keeping its own frontmatter) and
   `web/public/SKILL.md` (the whole file identical).
4. Bump `plugin/.claude-plugin/plugin.json` to `0.5.0`. If the plugin's README or CHANGELOG lists versions,
   add one line there too.
5. Don't touch `.claude/skills/explain/`. It's the bootstrap's installed copy.

## Validation

- `python3 scripts/plugin_parity.py` PASS.
- `python3 scripts/skills_parity.py` PASS.
- `python3 scripts/workflow.py validate`.
- `cd cli && uv run pytest -q`, if any CLI guide text changed.
- Live: no browser surface. Run the check commands the skill now prints against a scratch API, following the
  scratch rules in `phase.md`: one valid native chapter and one `err-*` fixture. Confirm the exit codes match
  what the skill says to do. Record the commands in `result.md`.

## Notebook

- `phase.md`:
  - one Doc impact line (`operations.md`: the skill checks before publishing; plugin 0.5.0);
  - S3's note if anything matters for the chapter procedure;
  - `## Now`.
- `result.md`: verdict block first.
- Unattended: settle open choices safely, and record them as `decided:` on `## Operator Questions`.

## Dispatch

slice=P31.S2
phase=P31
kind=implementation
risk=low
attempt=1
route=mid
reason=kind implementation rated low
tier=mid
subagent_type=slice-executor-mid
model=sonnet
pass_model=yes
effort=high
pass_effort=yes
attribution=Claude Sonnet 5.5
explore_model=haiku
explore_effort=high
