# design-cowork — the design tool, legacy records and cleanup

## Design tool

**`drafter` is the only design tool.** `design-drafter` drafts each co-work slice's one job (a frame,
its pages at once, a join) into the on-disk record under `docs/reference/design/` (schema 2), and you publish
each round of it to that job's Design canvas Artifact, which the operator opens in the Claude app (desktop, web or mobile). The `claude-design` tool (the
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

### Legacy record: a v87 single-drafter round

A round opened before the per-page passes (no `pages` in `round.json`, no `frame.md`) was drafted by
one drafter for the whole canvas. **It finishes as drawn:** its answer pass and any judge pass run as
v87 did (one drafter, the one critique), its read-back, publish and signoff are unchanged, and
nothing is re-cut into pages. The job's next round, if feedback asks for one, is one scoped revise
pass like any superseding round; a round that adds a page opens with `--pages`.

### Legacy record: a multi-job slice

A co-work slice opened before one connected canvas per round may hold several jobs (a wave). **It
finishes as drawn:** each job's next round opens with `design-open --job <job>`, rounds are drafted
and critiqued one at a time, without a cross-job look, and `design-sign --slice` signs the jobs
presented at the stop. A new surface goes to a new co-work slice, or, once every other round of the
slice is closed, into a merged job opened with `--new-job`.

## Cleanup and legacy

- **Built canvases.** At the phase review the walkthrough lists each implemented job's canvas
  ("delete canvas <link>: its design is built and signed in the repo"). You delete one only on the
  operator's yes; `job.json` keeps its url as history. Superseded rounds leave nothing to delete: each
  is a canvas version and a snapshot.
- **`Design tool: claude-design`** in an `intent.md`: the *Legacy rule* above.
- **A v87 single-drafter round** still open: *Legacy record: a v87 single-drafter round* above.
- **A multi-job slice** opened before one connected canvas per round: *Legacy record: a multi-job
  slice* above.
- **`schema1/` and `claude-design/`** are design memory: the drafter and the critic read their
  signoffs and feedback; nobody writes them.
