# design-cowork — the design tool, legacy records and cleanup

## Design tool

**`drafter` is the only design tool.** `design-drafter` drafts each job into the on-disk record under
`docs/reference/design/` (schema 2), and you publish each job to its own Design canvas Artifact,
which the operator opens in the Claude app (desktop, web or mobile). The `claude-design` tool (the
operator designing in Claude Design) and its viewer were retired in P36.

**Legacy rule.** A phase whose `intent.md` still says `Design tool: claude-design` was created for the
retired tool: it is not run on it, and it is never silently switched mid-round. At its **first design
slice**, set the slice `pending` (`--stop-kind decision`) and ask the operator to re-confirm the phase on `drafter`; record
their
answer by editing that line under `## Design Style` to `Design tool: drafter`. **An absent `Design
tool:` line reads as `drafter`**, and so does an absent `## Design Style` section; `/create-phase` no
longer asks it.

### Legacy record: schema1/

`schema1/` holds a v47 card record (numbered `cards/`, root `tokens.css`, `rounds/`), moved there by
`python3 scripts/workflow.py design-migrate --to 2` (a dry run; then `--apply`, and commit the
renames). It refuses while a schema-1 round is open. Read it as design memory; never write it.

### Legacy record: claude-design/

`docs/reference/design/claude-design/` holds the retired tool's rounds and their `SIGNOFF.md`. Read it
as history and design memory; **never write it**. **`claude-design/` is outside schema 2**, and so is
`schema1/`: the engine never reads either. A repo whose design root still holds the pre-v47 layout
(`rounds/` without `round.json`, a root `SIGNOFF.md`, `grounding/`) moves it there with
`python3 scripts/workflow.py design-migrate`, a dry run, then
`python3 scripts/workflow.py design-migrate --apply`, and commits the renames, before `design-init`.

## Cleanup and legacy

- **Built canvases.** At the phase review the walkthrough lists each implemented job's canvas
  ("delete canvas <link>: its design is built and signed in the repo"). You delete one only on the
  operator's yes; `job.json` keeps its url as history. Superseded rounds leave nothing to delete: each
  is a canvas version and a snapshot.
- **`Design tool: claude-design`** in an `intent.md`: the *Legacy rule* above.
- **`schema1/` and `claude-design/`** are design memory: the drafter and the critic read their
  signoffs and feedback; nobody writes them.
