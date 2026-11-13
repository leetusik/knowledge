# P40-2t.S2 — create-phase routes

Kind `implementation`. A round-1 wave slice: S1, S2, S3 and S4 run at once. Mode `auto`.

## Goal

Implement change-list B1–B11.

**The two route files.** Write `package/claude/skills/create-phase/explain-route.md` and
`research-route.md`. Together their texts replace `## The explain route` to the end of
`payload/claude/skills/create-phase/SKILL.md` at `fdb1151`; start from that text. They cover:

- **B1–B4:** records only; a subject that a research phase covers; the plugin floor 0.11.0.
- **B5:** a book's chapters run as a wave after the outline gate, at most 4 at once, with a synthesis
  chapter after them.
- **B6:** the research block as a bold field list, with the new **`sources`** field (the v96 marker),
  `paths: … | none` and `then:`.
- **B7:** one confirmation that names the sources. For the operator's material, it also names the
  repository the extract lands in and whether that repository has a git remote. Then the research
  **runs at once in `auto` on the default stream**, as the explain route's own research.
- **B8:** the per-source rules, the eight privacy rules, reader-shaped findings, and the research
  review's sample, verbatim from §3(a).
- **B9:** the new bold part **When it passes**.
- **B10:** the sentence on legacy blocks.

**The patch.** `patches/create-phase.md` covers the intro's one-exception sentence and *Procedure*
step 2 (B11).

## Validation

- Every find in `patches/create-phase.md` occurs exactly once at `fdb1151`. Check it with a scratch
  script based on the logic of P39-hk's `checks/finds.py`, kept in the scratchpad.
- A scratch create-phase `SKILL.md` reads whole, with its headings in order. Build it from
  `fdb1151`'s head plus the two route texts, with the patch applied. Its `## The research route` lists
  the literal `**sources**` field line and the bold part **When it passes**.
- P39-hk's `checks/cites.py`, run over the two texts against the committed plugin skill
  (`git show HEAD:plugin/skills/explain/SKILL.md`), reports missing 0.
- Return the smoke-suite literal list: the strings your edit removes or changes in
  `tests/retrofit_smoke.sh` at `fdb1151`.

## Risk

`low`, on the mid row. Every rule is pinned in change-list §3(a) and (c).

This is the largest mid slice. Return `escalate` if a passage needs a decision §3 did not make,
especially in the rules for the operator's material.

## Read first

- **`topics/breakdown.md`**, *Pins for every edit slice (S1–S6)*. These bind:
  - The base is `fdb1151`.
  - Read the bootstrap only with
    `git -C /Users/sugang/projects/personal/bootstrap_agentic_workspace.sh show fdb1151:<path>` into
    the scratchpad, written literally, one plain command per call.
  - Read the plugin skill only as committed (`git show HEAD:…`): S1 is editing it beside you.
  - No heading is renamed or added.
  - The two pinned anchors are **When it passes** and *Chapters at once (a wave)*.
  - The patch files take the `**Find**` form.
  - Write no test files.

  Read your own `## P40-2t.S2` block there too.
- **`topics/change-list.md`**: §3(a) and §3(c), §4, and your rows B1–B11 in §5. They are the
  contract: implement them, don't redesign them.
- **`intent.md`**, *Confirmed Intent*. OQ1 is answered **yes**.

## Never

- Write in the bootstrap repo, Note or arb_upbit_1, or anything outside your set (the scratchpad
  aside).
- Commit, move workflow state, or run an engine command that writes.
- Search the web, or spend money.
- Write test files.

## Return

`result.md`, with the structured verdict block first: status, route, model, effort, summary,
files_changed, validation, deviations, doc_impact, notebook. Then the detail.

The `notebook` field carries:
- your block's Doc impact note;
- a Notes-for-later-slices entry for S6, with the smoke-suite literals your edit removes or changes;
- any Decisions gist line;
- any Operator Question.

## Wave

- **Your set** (edit nothing else, except your slice folder's `result.md`):
  - `works/phases/active/P40-2t/package/claude/skills/create-phase/explain-route.md`
  - `works/phases/active/P40-2t/package/claude/skills/create-phase/research-route.md`
  - `works/phases/active/P40-2t/package/patches/create-phase.md`
- **Running beside you** (never touch their sets):
  - P40-2t.S1: `plugin/skills/explain/SKILL.md`, `.agents/skills/explain/SKILL.md`,
    `web/public/SKILL.md`, `plugin/agents/explain-critic.md`
  - P40-2t.S3: `works/phases/active/P40-2t/package/claude/skills/do-whole-phase/reference/explain-{decomposition,chapter,review}.md`,
    `works/phases/active/P40-2t/package/patches/workflow.md`
  - P40-2t.S4: `works/phases/active/P40-2t/package/patches/engine.md`
- **Done slices whose commit waits:** none.
- **Join-rebuilt artifact:** none.
- **Checks:** only the ones under Validation. A whole-tree check is `deferred: whole-tree`.
- **Notebook:** write no `phase.md`. Return your entries in the verdict's `notebook` field, by section,
  each gist-sized.
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
