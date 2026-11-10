# P40-2t.DECOMP2 — cut the edit slices from R1's change list

## Context

R1 (`21b6e12a`) studied Note's P8-x9 and arb_upbit_1's P58-pm → P59-d8, and found **none of your six
points contradicted**:
- points 4 and 6 hold as written;
- points 1, 2, 3 and 5 hold, with changes R1 pinned.

R1 also settled the five open questions and wrote a change list in `topics/change-list.md`. It has
about 50 passages in five groups whose files never overlap:

| Group | What it changes | Where | Size |
|---|---|---|---|
| **A** plugin | front door: a no-code subject goes to research first, `from=P<N>`, v96 test; evidence: research findings as records, a `source:` field, critic rules, parallel-chapter recaps | `plugin/skills/explain/SKILL.md` + its 2 copies + the regenerated critic agent | L (22 passages) |
| **B** create-phase routes | research route: `sources:` (code / web / your own material + privacy rules), runs at once, and **When it passes** calls the explain front door by itself; explain route: subject books, chapters as a wave | `package/claude/skills/create-phase/…` | L |
| **C** references | *Chapters at once (a wave)*: at most 4 in flight, a synthesis chapter last, critics dispatched per chapter; the outline gate holds all chapters; the whole-book consistency read; review → chain step | `package/…/explain-*.md`, `wave.md`, `decomposition.md`, `slice-executor.md`, 2× `review.md` | L |
| **D** engine | remove the explain exemption in `finish-slice` and the "one at a time" note in `parallel-plan`; flip the smoke probe | `package/patches/engine.md` (for `payload/scripts/workflow.py`) | S |
| **E** release (last) | plugin 0.11.0, READMEs, parity, package README/PATCHES/apply checks retargeted to `fdb1151`, release order: bootstrap v96 first, then the plugin | plugin metadata + `package/` | M |

Nothing is written to the bootstrap repo. Everything for it goes into `works/phases/active/P40-2t/package/`
on P39-hk's pattern, and your bootstrap session applies it and releases v96.

## Two things for you at this gate

1. **P59-d8 has not published yet.** At 21:32 it is still on chapter 7 of 8, and its publish waits on
   its own OQ2: the hosted server is older than the plugin's glossary and formula grammar. **Approving
   this plan starts the edits before P59 publishes.** R1's view is that this is fine:
   - nothing in the route design depends on how a published chapter page looks;
   - point 4's per-chapter pages come from explain's existing book publish;
   - P40-2t's REVIEW records P59's result if it exists by then, and otherwise names it in the
     walkthrough as the live test of point 4.
2. **OQ1: should a book's Sources also list the outside works its research read** (papers, web
   pages), each marked "read by the research, not by this book"? **I recommend yes.** A reader new to
   the field can then follow a paper, and the critic only checks that each listed work appears in a
   cited finding. "No" keeps P59-d8's signed form (only research and code). **Approving this plan
   answers OQ1 "yes"** (change A15 turns on). Say "OQ1 no" with your approval to keep it off.

## What the DECOMP2 executor does

Dispatch `slice-executor` on the high row (decomposition). The executor:

1. **Reads** `topics/change-list.md` §4–§7 (the parallel rules, the change list, the suggested cut,
   what waits on P59), `topics/breakdown.md`, and `phase.md`'s Notes for DECOMP2. It removes the
   notes it consumes.
2. **Records OQ1** as the orchestrator relays it in the dispatch prompt: resolve OQ1 with
   `phase-section --resolve OQ1 --pointer …` and add a Decisions gist line.
3. **Cuts the edit slices**, following change-list §6 unless its reading shows a reason not to.
   The suggested shape:
   - **Round 1, a wave, declared `--depends-on none`, disjoint sets:**
     - **A-front:** the plugin front door, A1, A2 and A4–A13;
     - **B:** the create-phase routes;
     - **C:** the explain references, wave, decomposition, executor and review lines;
     - **D:** the engine patch notes and the smoke probe.
   - **Round 2:** **A-evidence** (A3, A14–A22, with A15 per OQ1), declared on A-front, since it uses
     the same 4-file set.
   - **Then E,** the release, declared on every edit slice.
   - Then REVIEW (a barrier).

   Each slice is `--kind implementation`. **Rate by the normal rule** and write each trigger beside
   its rating:
   - D and E are mid (`low`): pinned and small;
   - A-front may be `high` for a **wide blast radius**, because the payload cites the front door by
     section number and heading;
   - C may be `high` if the executor judges *Chapters at once* to be new orchestration of concurrent
     dispatches (a **core invariant**: concurrency);
   - otherwise mid.
4. **Writes each slice's set** in `topics/breakdown.md`, rewritten in place as DECOMP2's pass. The set
   lists every file a slice may touch: its `package/` paths, its `package/patches/<area>.md`, and for
   A the four plugin files plus `plugin/agents/explain-critic.md`, regenerated by
   `scripts/skills_parity.py --write-agents`. Name the **join-rebuilt artifact**: the plugin's
   four-file set, rebuilt once by the orchestrator. Each slice also gets a `spends money: no` line, an
   `## Estimate` from `dispatch-summary`'s means, and a `Breakdown (DECOMP2): …` Decisions line. Each
   slice notes the `## Doc impact` it will owe: the `qa.md` checklist names v94, plus the operations
   doc's explain lines.
5. **Never** runs `new-phase` or `accept-gate`. It never fills a cut slice's `plan.md`, never edits
   the plugin, the package or the bootstrap repo itself (cutting only), and never commits.

No slice spends money. The bootstrap repo, Note and arb_upbit_1 stay read-only throughout the phase.

## After the executor returns (orchestrator)

1. `record-dispatch`, `finish-slice P40-2t.DECOMP2`, `validate` and commit. The acceptance gate is
   already declared `--require`.
2. Relay the `parallel:` rounds. Then run round 1 as a wave in `auto` by `reference/wave.md`, with up
   to 4 executors at once, each plan written inline. Then round 2, then E, then REVIEW.
3. The phase stops at REVIEW's acceptance walkthrough. That walkthrough covers:
   - the route summary and the package;
   - the release order (your bootstrap session applies the package and releases v96; then plugin
     0.11.0; then `/update-workspace` here, in arb_upbit_1 and in Note);
   - a deferred job to deploy the knowledge server with the 0.10.0 grammar, which both books hit.

## Verification

- `python3 scripts/workflow.py validate` passes.
- `parallel-plan P40-2t` shows round 1 with four slices, then A-evidence, then E, then REVIEW.
- `topics/breakdown.md` has one block per slice, with its set, risk and trigger, and `spends money:`.
- OQ1 shows as resolved in `phase-section P40-2t "Operator Questions"`.
- `git status` shows changes only under `works/`.

## Dispatch

route=high
reason=kind decomposition
subagent_type=slice-executor
model=opus
pass_model=yes
effort=xhigh
pass_effort=yes
attribution=Claude Opus 5.5
explore_model=haiku
explore_effort=xhigh

## Operator words at the gate

The operator approved this plan with no change: OQ1 is answered "yes" (a book's Sources also list the outside works its research read, marked "read by the research, not by this book"; change A15 on), and the edits start before P59-d8 publishes.
