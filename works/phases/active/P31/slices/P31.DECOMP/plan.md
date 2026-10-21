# P31.DECOMP — decompose "Explain phase route"

## Context

The operator wants explaining to run as a **workflow phase**, not one prompt making one document. The phase
would research, write an outline the operator signs, then build one slice per chapter (draft, validate, a
fresh-eyes critic, one revision), then review the whole book, publish it **private**, and pass an acceptance
gate where the operator reads it. `intent.md` records this verbatim.

P31 **prepares** everything in this repo. The operator relays it to the bootstrap (workflow) agent, which
applies it. This slice only cuts P31 into slices. It writes no product code.

What exploration found:
- **No validate-only path exists.** `POST /api/documents` (`server/main.py` `create_document`, L906–1247)
  runs every check before the locked write at L1249:
  - conventions L925–960 (a string 422);
  - body limits and assets L970–987;
  - native `parse_chapter`, `unknown_assets`, `resolve_refs`, `translation_findings` L1172–1247 (one list
    422).

  The checks read the DB (`retired_ids`, placement), so a check has to be server-side. The CLI can't
  import `server/` (it depends only on httpx, `cli/pyproject.toml`).
- **The CLI** (`cli/src/knowledge_cli/knowledge.py`) already has `cmd_save` (L503), `_prepare_body`
  (L615) and `native.rejected_message`. `knowledge check` reuses them.
- **In the bootstrap:**
  - phase routes are **prose only** in `payload/claude/skills/create-phase/SKILL.md` (docs-phase L71,
    QA-sweep L92); `workflow.py` has no route concept, so an explain route needs **no engine change**;
  - agents are `payload/claude/agents/*.md`, registered through `installer/build.py`
    (`FIXED_LIVE_FILES` L54–71, `EXPECTED_SKILL_COUNT`) and `installer/main.py` (managed list L186–199,
    `NESTED_AGENTS` L642, install writes L1492, summary L1822);
  - `design-critic.md` (323 lines) is the shape to mirror for an explain-critic.

## Proposed cut (the executor decides the final one and justifies it)

| Slice | Kind / risk | Trigger | Does |
|---|---|---|---|
| **S1** `knowledge check` | implementation, **high** | core invariant: a check that must never write; it shares `create_document` (wide blast radius) | Factor the validation in `create_document` (L923–1247) into one function both paths call. Add a **dry run** (`POST /api/documents/check`, or `check: true`) that returns `{ok, violations}` with the real 422 shapes and **never takes the lock or writes**. Add a CLI `knowledge check FILE` with `save`'s flags, printing through `rejected_message`; exit 0 on ok, 1 on violations. Core tests: (1) a check writes nothing (no row, no file, no commit); (2) a check and a real POST give the same violation list for the error fixtures. |
| **S2** skill uses it | implementation, low | — | `plugin/skills/explain/SKILL.md` §4.8: run `knowledge check` before publishing, with the curl equivalent. Keep the three parity copies in step, bump the plugin to 0.5.0, and pass `plugin_parity` and `skills_parity`. |
| **S3** explain-critic agent and chapter procedure | implementation, **high** | open design: a new agent and a new procedure | Write into `works/phases/active/P31/package/`, mirroring the bootstrap's `payload/` paths: `claude/agents/explain-critic.md`, modelled on `design-critic` (reads, never edits; judges facts and citations, whether diagrams are correct, whether the quiz tests understanding, against the plugin skill's rules; one critique file; severity and evidence), and the **chapter-slice procedure**: draft to `works/phases/active/P<N>/book/<key>.md`, `knowledge check`, critic, one revision, done. |
| **S4** the route and references | implementation, **high** | open design | In the package: the **explain route** section for `create-phase`; the explain **DECOMP reference** (research, then the book outline as `book/outline.md`, then an outline `pending` gate the operator signs, then one bare chapter slice each); the explain **REVIEW reference** (whole-book read, `knowledge check` on every chapter, publish every chapter **private**, open it in the reader, pass, then the walkthrough); and the patch notes for `build.py`, `main.py`, the skill count and the review pointer `/knowledge:explain`. |
| **S5** rehearsal | qa, low | — | Use the package as written to make **one sample chapter** in the scratchpad, never published and never a real book: draft, `knowledge check` against a scratch API, the explain-critic, one revision. Report where the procedure was unclear, and fix the package text. This proves the loop works before the bootstrap gets it. |
| **S6** handoff | docs, low | — | Update `handoff-explain.md`: keep the retire-and-pointer steps, and add "apply the package", file by file into `payload/`, with the build and install registration, tests and CHANGELOG. |
| **REVIEW** | review, high | — | Gated: the operator checks `knowledge check` on a real chapter, then reads the package and the handoff. |

**Estimate** (dispatch-summary means): 6 slices plus REVIEW, about $55–70 and about 4 span-hours.
- High implementation slices cost about $8–10 each.
- The mid and qa slices cost about $4–14.
- The review costs about $13.

**Production:** S1 needs a deploy before the explain route can use `knowledge check` against
knowledge.hi2vi.com. The deploy waits for the operator's word at the gate.

## A decision I'm making, flagged for you

You confirmed: "the review renders it in the reader, **then** publishes". Outside this repo there is no
scratch reader to render into, so the package has the REVIEW **publish first (private), then read it in the
real reader**. Fixes after that are republished as new versions. Private means only you see it. If you'd
rather keep the original order, the review would check the files only and you'd be the first to see the
render.

## What the DECOMP executor does (`slice-executor-high`)

1. **Read just in time:**
   - P31's `intent.md`;
   - `works/phases/active/P30/handoff-explain.md`;
   - `plugin/skills/explain/SKILL.md` (§1, §4.8, §5);
   - `server/main.py` L906–1250 and `cli/src/knowledge_cli/knowledge.py` L500–660;
   - from the bootstrap, read only: `create-phase/SKILL.md` L71–end, `agents/design-critic.md`, and
     `do-whole-phase/reference/decomposition.md` and `review.md`.
2. Cut the slices with `new-slice` as **bare folders**, with `--risk` as rated above and each trigger
   written beside its slice.
3. **`phase.md`:**
   - `## Decisions`: the cut and why, plus the publish-first-then-read decision;
   - the breakdown with estimates;
   - `## Notes for later slices`: the package layout (paths mirror `payload/`); the bootstrap is
     **read-only**; D22 (no prettier); the parity gates; the scratch-stack rules (never `:8766` or `:3030`);
     a check endpoint must never write;
   - `## Now`.
4. **Validate** with `python3 scripts/workflow.py validate`, then return a structured verdict. No commit and
   no state moves beyond `new-slice`.

## After the executor returns (orchestrator)

- `record-dispatch`, `finish-slice P31.DECOMP`, and `accept-gate P31 --require`, in one commit.
- Continue straight through in auto, as you said ("/do-whole-phase right away"). The middle slices plan
  inline. It stops at the review's gate.

## Verification

- `validate` passes.
- `next` points at S1.
- No middle slice has a `plan.md`.
- The product diff is empty (`git diff --stat -- web/ server/ cli/ plugin/`).

## Dispatch

slice=P31.DECOMP
phase=P31
kind=decomposition
risk=high
attempt=1
route=high
reason=kind decomposition
tier=high
subagent_type=slice-executor-high
model=opus
pass_model=yes
effort=high
pass_effort=yes
attribution=Claude Opus 5.5
explore_model=haiku
explore_effort=high
