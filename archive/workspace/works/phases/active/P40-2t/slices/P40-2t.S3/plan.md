# P40-2t.S3 — explain references, wave, decomposition, executor and review lines

Kind `implementation`, a round-1 wave slice: S1, S2, S3 and S4 run at once. Mode `auto`.

## Goal

Implement change-list C1–C10.

**The three reference files.** Write them whole from `fdb1151`'s copies:
`package/claude/skills/do-whole-phase/reference/explain-{decomposition,chapter,review}.md`.

- **C1:** the `## Explain` check for a subject explain, and the 0.11.0 floor.
- **C2:** *A book*:
  - D1 on research records;
  - the book kind;
  - the outline's pinned recap lines, names, running examples and link ids;
  - the synthesis chapter;
  - the declaration: `--depends-on none`, with the synthesis chapter depending on the chapters it
    draws on;
  - the sets;
  - warming the code environment once;
  - `parallel-plan`.
- **C3:** the outline gate's stop holds every declared chapter.
- **C4:** the new section **Chapters at once (a wave)**:
  - at most 4 chapters in flight;
  - span-1 and critic returns that are not slice returns;
  - a critic per chapter, dispatched as its span 1 returns;
  - usage limits.
- **C5:** span 3's notebook note, and the commit per chapter.
- **C6:** the review's consistency pass.

**The patch file.** `patches/workflow.md` covers:
- `wave.md` (C7);
- `decomposition.md` (C8);
- `payload/claude/agents/slice-executor.md` (C9);
- the chain step in both `review.md` files (C10).

Never put a copy under `package/claude/skills/do-next-slice/`.

## Validation

- Every find in `patches/workflow.md` occurs exactly once at `fdb1151`.
- Scratch copies of `wave.md`, `decomposition.md`, `slice-executor.md` and both `review.md`, with the
  patch applied, keep the smoke suite's pinned literals (`tests/retrofit_smoke.sh` at `fdb1151`, its
  P42 block).
- P39-hk's `checks/cites.py`, run over the three references against the committed plugin skill
  (`git show HEAD:plugin/skills/explain/SKILL.md`), reports missing 0.
- Nothing exists under `package/claude/skills/do-next-slice/`. `payload/contract.md` and the two
  `SKILL.md` cores are untouched.
- Return the smoke-suite literal list.

## Risk

`high`, trigger **core invariant (concurrency)**. *Chapters at once* is new orchestration of
concurrent dispatches. It amends `wave.md`'s rules (an exception to "no cap") and the executor's
carve-out. Write it so that an orchestrator can resume from disk alone after a compaction.

## Read first

- **`topics/breakdown.md`**, *Pins for every edit slice (S1–S6)*. These pins bind:
  - the base is `fdb1151`;
  - read the bootstrap only with
    `git -C /Users/sugang/projects/personal/bootstrap_agentic_workspace.sh show fdb1151:<path>` into
    the scratchpad, written literally, one plain command per call;
  - read the plugin skill only as committed (`git show HEAD:…`), because S1 is editing it beside you;
  - no heading renamed or added;
  - the pinned anchors **When it passes** (S2 writes it; cite it verbatim) and *Chapters at once (a
    wave)* (you write it);
  - the `**Find**` patch form;
  - the byte caps;
  - no test files.

  Also read your own `## P40-2t.S3` block there.
- **`topics/change-list.md`**: §3(c) and §3(d), §4, and your rows C1–C10 in §5. They are the contract:
  implement them, and don't redesign them. If a passage needs a decision §3 did not make, record it as
  an Operator Question, never a guess.
- **`intent.md`**, *Confirmed Intent*. OQ1 is answered **yes**.

## Never

- Write in the bootstrap repo, Note or arb_upbit_1, or anything outside your set (the scratchpad is
  the exception).
- Commit, move workflow state, or run an engine command that writes.
- Search the web, or spend money.
- Write test files.

## Return

`result.md`, with the structured verdict block first: status, route, model, effort, summary,
files_changed, validation, deviations, doc_impact, notebook. The detail follows it.

The `notebook` field carries:
- your block's Doc impact note;
- a Notes-for-later-slices entry for S6, with the smoke-suite literals your edit removes or changes;
- any Decisions gist line;
- any Operator Question.

## Wave

- **Your set.** Edit nothing else, apart from your slice folder's `result.md`:
  - `works/phases/active/P40-2t/package/claude/skills/do-whole-phase/reference/explain-decomposition.md`
  - `works/phases/active/P40-2t/package/claude/skills/do-whole-phase/reference/explain-chapter.md`
  - `works/phases/active/P40-2t/package/claude/skills/do-whole-phase/reference/explain-review.md`
  - `works/phases/active/P40-2t/package/patches/workflow.md`
- **Running beside you.** Never touch their sets:
  - P40-2t.S1: `plugin/skills/explain/SKILL.md`, `.agents/skills/explain/SKILL.md`,
    `web/public/SKILL.md`, `plugin/agents/explain-critic.md`
  - P40-2t.S2: `works/phases/active/P40-2t/package/claude/skills/create-phase/{explain-route.md,research-route.md}`,
    `works/phases/active/P40-2t/package/patches/create-phase.md`
  - P40-2t.S4: `works/phases/active/P40-2t/package/patches/engine.md`
- **Done slices whose commit waits:** none.
- **Join-rebuilt artifact:** none.
- **Checks:** only the ones under Validation. A whole-tree check is `deferred: whole-tree`.
- **Notebook:** write no `phase.md`. Return your entries in the verdict's `notebook` field, by section,
  each one gist-sized.
- **No engine command that writes.** `validate` and `phase-section` reads are fine.

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
