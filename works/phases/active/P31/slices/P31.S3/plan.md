# P31.S3: Package: the explain-critic agent and the chapter-slice procedure

## Goal

The first half of the bootstrap package, written into `works/phases/active/P31/package/` with paths that mirror
the bootstrap's `payload/`:
1. **`package/claude/agents/explain-critic.md`**: the fresh-eyes critic for one drafted chapter.
2. **`package/claude/skills/do-whole-phase/reference/explain-chapter.md`**: the procedure a chapter slice
   follows from draft to done.

What the operator confirmed (`intent.md`): every chapter gets a critic pass, **inside its own slice**, after the
draft and the check, then exactly one revision, before the slice closes, so that later chapters build on
corrected ones.

## Read first

- `intent.md`, and `phase.md`:
  - `## Decisions`;
  - the `for S3` notes in `## Notes for later slices`.
- The bootstrap, **read-only**, at `/Users/sugang/projects/personal/bootstrap_agentic_workspace.sh`:
  - `payload/claude/agents/design-critic.md`: the shape to mirror (frontmatter, Inputs, rubric, the
    critique file, Never, the verdict block);
  - `payload/claude/agents/slice-executor-mid.md`: what an executor may and may not do (it may spawn only
    Explore);
  - `payload/claude/skills/do-whole-phase/reference/co-work.md` and `dispatch.md`: how the orchestrator runs
    a multi-span slice (the drafter, then the critic, then one answer pass), and how resume and SendMessage
    work;
  - `payload/contract.md`: the slice folder holds **exactly two** context files.
- `plugin/skills/explain/SKILL.md`: §3 Research, §4 (4.1–4.9), §5. **Refer to these by section; never copy
  them.**

## Pinned decisions

1. **The critic's model: option (a), with no engine change.**
   - Frontmatter: `model: opus`, `effort: high`, tools `Read, Glob, Grep, Bash, Write, WebFetch, WebSearch`.
     It needs the web to check citations, and it has no Edit.
   - **The rule the orchestrator follows:** the critic always runs on a different model from the chapter's
     executor. For a mid (sonnet) chapter it runs on opus, which is the frontmatter default. For a high (opus)
     chapter the orchestrator passes `model: sonnet` on the call.
   - Write down why: a fresh-eyes check is weaker on the same model, and the engine route table stays
     untouched. Note that a later engine row is possible (option b), and leave it for the bootstrap to decide.
2. **Where things live.** The slice folder keeps only `plan.md` and `result.md`.
   - The draft: `works/phases/active/P<N>/book/<chapter-key>.md`.
   - The critique: `works/phases/active/P<N>/book/critique/<chapter-key>.md`.
   - The research notes, if long: `works/phases/active/P<N>/topics/<chapter-key>-research.md`.
3. **The chapter slice is multi-span**, because executors can't dispatch agents:
   1. **Span 1, executor:**
      - research per skill §3;
      - draft per §4, with diagrams, figures, callouts, the quiz and sources;
      - read it through per §4.8;
      - run `knowledge check` per §4.9 with the flags the REVIEW's publish will use (book, chapter, lang,
        project), and fix it to exit 0;
      - return `done` with `critic_ready: yes`.
   2. **Span 2, the orchestrator dispatches `explain-critic`.** It writes the critique file, with findings
      by severity (`must-fix`, `should-fix`, `note`), confidence and evidence.
   3. **Span 3, the executor**, resumed with SendMessage, or re-dispatched from disk if it has gone:
      - answer every `must-fix`, and the `should-fix`s it agrees with, in **one** revision;
      - record in `result.md` how it answered each finding;
      - re-run `knowledge check`;
      - return the final verdict.

   No second critic round. A `must-fix` the executor disputes goes to `result.md`, and the REVIEW decides it.
4. **What the critic judges:**
   - facts, in code against the real files and diff, in general topics against the cited sources, which it
     opens;
   - every citation resolves and supports its claim;
   - every diagram is correct, labelled, matches the text, and is worth having;
   - the quiz tests understanding, not recall: distractors plausible, the explanation teaches;
   - learning order and prerequisites, given the outline (`book/outline.md`) and the earlier chapters;
   - clarity for the outline's stated reader;
   - the skill's hard rules (§4.1), as a check that `knowledge check` can't fully make.

   It never edits the chapter, publishes, or talks to the operator.
5. **Size:** the critic should be comparable to `design-critic` or smaller, at most about 250 lines. The
   procedure reference should be one focused page.

## Done when

- Both files exist under `package/`, with the paths mirroring `payload/`.
- Neither restates the skill's writing rules: they point to §3, §4.x and §5.
- `package/README.md` exists as a stub listing the files so far and where each goes in the bootstrap's
  `payload/` (S4 completes it).
- `python3 scripts/workflow.py validate` passes.
- No product code is touched. The bootstrap repo is unchanged (`git -C <bootstrap> status --short` is empty,
  as it was before).

## Notebook

- `phase.md`:
  - S4's note: the file names, the critic rule and the span order, which the DECOMP and REVIEW references
    and the route must point at;
  - S5's note: how to dispatch the critic in the rehearsal, as a general-purpose agent told to follow
    `package/claude/agents/explain-critic.md`, on opus;
  - `## Now`.
- `result.md`: verdict block first.
- Unattended: record choices as `decided:` on `## Operator Questions`.

## Dispatch

slice=P31.S3
phase=P31
kind=implementation
risk=high
attempt=1
route=high
reason=risk high (not low)
tier=high
subagent_type=slice-executor-high
model=opus
pass_model=yes
effort=high
pass_effort=yes
attribution=Claude Opus 5.5
explore_model=haiku
explore_effort=high
