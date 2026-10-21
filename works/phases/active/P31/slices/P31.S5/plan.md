# P31.S5 — Rehearse one sample chapter through the package

## Goal

Before the bootstrap gets the package, prove it works by following it **as written** on a tiny sample. Wherever
the text is unclear, wrong or missing a field, fix the package text and record the fix. **Nothing is published.
No real book is made.**

## Read first

- `phase.md` → `## Notes for later slices`: the three `for S5` notes. They set the scratch-stack rules, how the
  critic is dispatched and what to look for.
- `package/README.md` and `package/claude/skills/do-whole-phase/reference/explain-decomposition.md`
  (*What the plan asks*, *Each chapter's plan.md*).
- `package/claude/skills/do-whole-phase/reference/explain-chapter.md`.
- `plugin/skills/explain/SKILL.md` (0.5.0): the writing rules the chapter follows.

## The rehearsal

Everything sample goes in a scratchpad folder, `REH=<your scratchpad>/p31-rehearsal/`. None of it goes in this
phase's folder.

**Span 1 (you):**
1. Write a tiny `## Explain` block in `$REH/intent.md`:
   - subject `P31.S1` (the `knowledge check` change);
   - mode codebase;
   - 2 chapters;
   - lang en;
   - reader: a developer new to this repo;
   - a private scratch project.
2. Write `$REH/book/outline.md` from the DECOMP reference, with every field it requires. Then write the outline
   gate's stop report as you would have issued it, in `$REH/outline-gate.md`. Do **not** run `new-slice` or
   `set-slice-status`.
3. Write one chapter's plan-equivalent (`$REH/chapter-1-plan.md`) **only** from the outline, following
   *Each chapter's plan.md*. List every field the outline couldn't fill.
4. Run span 1 of `explain-chapter.md` for chapter 1:
   - research the real diff (`git show 7c27519`);
   - draft `$REH/book/<key>.md` per the skill;
   - run the §4.8 read-through;
   - run `knowledge check` against a **scratch API** (your own port, a fresh `KB_ROOT`, legacy mode, no
     Gemini key), fixing until it exits 0.

   Also run the check once against a port with nothing on it, and once in a way that triggers exit 2's "no
   route" path if you can (an older server build is not required; note it if you can't), to confirm the
   procedure's exit-2 handling reads right.
   Write the chapter's `## Publish` command as the procedure asks, in `$REH/chapter-1-result.md`.
5. **Stop and return** `status: done`, `critic_ready: yes`, the `$REH` path and the chapter key. Keep the
   scratch API running only if span 3 needs it; otherwise stop it. Stop only your own PIDs, and never use
   `:8766` or `:3030`.

**Span 2 (the orchestrator):** dispatches the critic as a `general-purpose` agent on opus, told to follow
`package/claude/agents/explain-critic.md` with `executor_model: sonnet`. It writes
`$REH/book/critique/<key>.md`.

**Span 3 (you, resumed):**
1. Answer the critique in one revision, as `explain-chapter.md` says.
2. Re-run `knowledge check`.
3. **Then, the point of this slice:** fix every package text gap the rehearsal exposed, directly in `package/`
   (and in `PATCHES.md` or `README.md` if affected). Check in particular:
   - whether the critic could check the outline's quiz targets and diagrams as written;
   - whether `## Publish` turns into `save` unchanged;
   - whether the exit-2 handling reads right;
   - whether any `## Explain` field was missing.
4. Write `result.md` with:
   - the rehearsal timings;
   - the gaps found and the fix for each;
   - the critique's findings and how they were answered;
   - the scratch commands.

## Validation

- `python3 scripts/workflow.py validate`.
- The bootstrap is unchanged (`git -C … status --short` is empty).
- The scratch API is stopped, and nothing was published anywhere.

## Notebook

- `phase.md`:
  - S6's note, if the apply order or the minimums changed;
  - `## Now`.
- `result.md`: verdict block first.
- Unattended: record choices as `decided:` on `## Operator Questions`.

## Dispatch

slice=P31.S5
phase=P31
kind=qa
risk=low
attempt=1
route=cheap
reason=kind qa rated low
tier=mid
subagent_type=slice-executor-mid
model=sonnet
pass_model=yes
effort=high
pass_effort=yes
attribution=Claude Sonnet 5.5
explore_model=haiku
explore_effort=high
