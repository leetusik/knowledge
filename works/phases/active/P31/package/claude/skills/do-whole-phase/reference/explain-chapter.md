# do-whole-phase — a chapter slice (explain phase)

An explain phase's decomposition cuts one slice per chapter of the signed `book/outline.md`. A chapter slice
is **multi-span**, like a co-work critique step, because an executor may spawn only `Explore`: the executor
drafts and checks, **you** dispatch `explain-critic`, and the executor revises once. The writing rules are
the knowledge plugin's `skills/explain/SKILL.md`, cited by section and never copied here. This file keeps
only what the loop adds.

- **Where things live.** The slice folder holds only `plan.md` and `result.md`. Everything else is in the
  phase folder `works/phases/active/P<N>/`:
  - the draft: `book/<key>.md`, the body only (it stands in for the skill's `<tmp>/body.md`);
  - images it attaches: `book/assets/<key>/<NAME>.<ext>`, so the review's publish can re-attach them;
  - the critique: `book/critique/<key>.md`, written once by the critic;
  - long research notes: `topics/<key>-research.md`.
- **What `plan.md` names.** The chapter key and its outline entry, the mode (change, topic or general), the
  source (a commit range, a phase, files or a subject), where the explain skill is installed, and the
  publish fields the review's publish will use (project, book, chapter key and position, lang, titles,
  sources). The project is the private one the review publishes into, never tenant #1.

## The three spans

1. **Span 1, the executor** (the slice's route, as `reference/dispatch.md` resolves it; the prompt says
   `span: 1`):
   - research per skill §3 (grounding every claim; the web per its judgment gate);
   - draft per §4 into `book/<key>.md`: the outline's diagrams and figures, callouts, the quiz the outline
     names, sources;
   - read it through per §4.8;
   - run `knowledge check` per §4.9 with the publish's flags and fix it to exit 0. Exit 2 (no route on that
     server, or a CLI before 0.2.0) is skipped with a line in `result.md`, as §4.9 says. The same list twice
     is the executor's two-strike rule: mid escalates, high returns `blocked`;
   - write `result.md`: the verdict block first, then a `## Publish` section with the exact `knowledge check`
     command it ran (the review swaps `check` for `save`), then its log;
   - return `done` with `critic_ready: yes`.

   Any other verdict is handled as usual (`reference/verdicts.md`), and no critic runs.
2. **Span 2, you dispatch `explain-critic`** (the model rule is below). The prompt: `slice: <id>`, the
   phase, the key, the draft and critique paths, `executor_model:` (the `model=` line span 1 ran on), and a
   scratch directory. It writes `book/critique/<key>.md`, with findings by severity (`must-fix`,
   `should-fix`, `note`), confidence and evidence. Read **only its verdict block**. A `blocked` critic
   (a wrong model, a missing outline) is fixed and re-dispatched once; a second `blocked` STOPs.
3. **Span 3, the executor**, resumed with `SendMessage` (`span: 3`, the critique path), or re-dispatched
   from disk on the same route if it is gone (it reads `plan.md`, its own `result.md`, the draft and the
   critique):
   - answer every `must-fix`, and the `should-fix`s it agrees with, in **one** revision;
   - record in `result.md` a `## Critique answers` section, one line per finding:
     `C01 · fixed | disputed | declined · <how, or why not>`;
   - re-read the changed parts per §4.8 and re-run `knowledge check` to exit 0;
   - add a `## Notes for later slices` entry to `phase.md` for later chapters: the terms this chapter
     defines and the heading ids to link to, as corrected;
   - rewrite the verdict block as the final one (`critique: answered`, `disputed: <ids> | none`) and return.

   This span always runs, even on a critic `pass`: it is where the critique is answered and recorded.

**No second critic round.** A `must-fix` the executor disputes stays in `result.md` with its reason, and the
phase review decides it, beside the book.

## The critic's model

The critic always runs on a **model different from the one that drafted the chapter**: a fresh-eyes check
on the same model shares the drafter's blind spots. Compare the critic's frontmatter model (`opus`) with
span 1's `model=` line (from `## Dispatch`, or `## Escalation: mid → high` after an escalation):
- a mid chapter (`sonnet`): dispatch the critic as written;
- a high chapter (`opus`): pass `model: sonnet` on the call, with `effort: high`;
- on a machine where both rows resolve to one model (a loopback proxy): STOP and tell the operator, as
  for the design critic's row conflict.

This needs **no engine change**: the critic has no row in the route table, and the orchestrator applies
the rule per call. A dedicated engine row (a managed agent file, a `--critic`-style form refusing the
executor's model) is a later option, left for the bootstrap to decide.

## Records, limits and the commit

- `record-dispatch` once, after span 3, with its verdict; span 1's `done` is not a slice verdict. The
  critic span is metered from the transcripts, never recorded.
- A usage limit in any span is resumed or re-dispatched per `reference/dispatch.md` (5); it is never a
  verdict.
- An escalation in span 1 or span 3 re-dispatches that span to `slice-executor-high` from disk. If span 1
  is redone on `opus`, the critic runs on `sonnet`.
- Only after span 3 returns `done`: `finish-slice`, then **one commit** carrying the draft, its assets,
  the critique, `result.md` and `phase.md`. Nothing is published: the phase review publishes every chapter.
