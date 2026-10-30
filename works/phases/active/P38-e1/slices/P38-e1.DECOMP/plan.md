# P38-e1.DECOMP — decompose "Right-size explain runs (plugin 0.9.0)"

## Context

A `/knowledge:explain` v2 run in arb_upbit_1 (P50-4b) cost $79 and used 33 agents, which is more than building its subject did. Its Korean translation (P51-3q) cost about 3.5× what the translation itself needed. `intent.md` records eleven fixes:

- items 1–8 from the creation;
- items 9–11 the operator added at execution:
  - a v1 is cheap too;
  - documents and the confirmation are easier to understand;
  - the sections are proposed in the confirmation before anything is created.

All of it ships as plugin **0.9.0**. This slice cuts the work into slices. It writes no skill text itself.

## The executor's job

High row (decomposition, by kind). From `intent.md` (all 11 items; the operator's words are under *Clarifications Resolved*):

1. **Read the evidence first**, read-only, and write `topics/cost-evidence.md`: where P50-4b's $79 went and the calibration numbers the build slices need. The questions:
   - the claims returned vs used vs verified;
   - the words per section vs the budget;
   - the sources the critic re-opened;
   - the researchers per angle;
   - what the delta could have reused;
   - P51-3q's span split.

   Sources, in `/Users/sugang/projects/personal/arb_upbit_1`:
   - `works/phases/active/P50-4b/doc/{run.md,critique.md,ledger.md,outline.md,trace.md}` and its `slices/*/result.md`;
   - `works/phases/active/P51-3q/`;
   - `python3 scripts/workflow.py dispatch-summary --phase P50-4b` (likewise `--phase P51-3q` and `--phase P42`), run in that repo.

   Do this in the DECOMP itself, so the build slices are pinned and can run on the mid row. Do not cut a separate `research` slice unless the evidence leaves the approach open. If a read is refused, use the intent's numbers and say so.
2. **Locate every passage each item touches** in the canonical `plugin/skills/explain/SKILL.md` (2,793 lines). Known anchors:
   - §1 *The front door, step by step* (L204–325, the confirmation at step 7);
   - §2 resolver (L326+, `print("KB_API_TOKEN=" + token)` at ~L379; curl bearer lines ~L455, ~L1423);
   - §3.1 prior;
   - §3.4 D1 tier sizing ("the highest of three axes", ~L685–730);
   - §3.6 D3v / §3.8 D5 verification;
   - §3.10 D6;
   - §4 writing (budgets, trace);
   - §4.10 D8 critic;
   - §5 publish (loose-document translation);
   - §8 report;
   - §9 book;
   - Part B (B4 verifier, B5 critic, B6–B9).
3. **Cut the middle slices** with `new-slice` as bare folders (never pre-fill a `plan.md`). Write `topics/breakdown.md` in full:
   - `## Passes`;
   - `## Estimate`, from `dispatch-summary`'s `means`;
   - `## Join-rebuilt artifact`;
   - `## Out of scope`;
   - `## Pins for …`;
   - one `## <slice id>` block per slice with its goal, set, risk + trigger, `spends money:` and depends on.

   Add one `Breakdown (DECOMP): …` gist line to `## Decisions`, and notes tagged `(from DECOMP, for <slice>)`. Declare every slice (`--depends-on`).

## Constraints the cut must respect

- **The shipped copies move together.** The canonical skill, `.agents/skills/explain/SKILL.md` (body byte-equal) and `web/public/SKILL.md` (full-file equal) change together. The five `plugin/agents/*.md` bodies are regenerated from Part B with `python3 scripts/skills_parity.py --write-agents`; never hand-edit them. Every slice's validation is `python3 scripts/skills_parity.py` and `python3 scripts/plugin_parity.py` (what `.github/workflows/plugin-ci.yml` runs).
- **The workspace side is out of scope** (`.claude/skills/**`, the bootstrap repo). create-phase's explain route fixes the 17 `## Explain` fields and cites plugin sections by number **and** heading. So:
  - **Keep cited `§` numbers and headings stable.** Add rules inside existing sections, as P35-a4 pinned.
  - **The proposed sections cannot be a new `## Explain` field.** They ride in the confirmation as shown, which create-phase writes verbatim under `intent.md`'s *Original Input*, and the lead reads them there at D0. A book's chapters are proposed the same way; each chapter's sections are signed at the existing outline gate, with no per-chapter stop. If the DECOMP finds this cannot work without a template change, it records an Operator Question and lists the workspace-side change under `## Out of scope` for a workflow-repo follow-up. It does not edit `.claude/skills/**`.
  - `outline sign-off` stays a field. Its meaning in the skill may narrow, since the sections are already signed at the confirmation.
- **v1 and v2.** Every fix except the delta reuse must bind a first run. The breakdown pins a v1 sizing case (P42's bar as a v1) alongside the v2 case (P50-4b).
- **Proving the cut.** Run no live explain run inside P38: it would be an expensive run, and an explain is its own phase. The proof is a desk check:
  - apply the new sizing, claim cap and verify-only-used rules on paper to the v1 and v2 cases, with projected agents and spans;
  - render sample confirmations (a v1 document, a v2 document, a book) to show the sections list, the plain summary and the cost line.

  Name the slice that produces it, or put it in the REVIEW. A live trial run after release is a deferred-job candidate for the operator.
- **Tests:** only for core behavior. The resolver never printing the key is core: if the fix changes executable code (the §2 resolver snippet, or the `cli/`), a tiny test is warranted. Prose rules are not tested.
- **The release** follows P35-a4.S2's shape (commit `364461e7`): `plugin/.claude-plugin/plugin.json` 0.8.0 → 0.9.0, `plugin/skills/setup/SKILL.md`, `web/src/content/marketing/content.ts`, and the plugin README's cost/permissions text.
- **Risk:** mid is the default. Rate `high` only for a named trigger: the sizing rule and the content-checked delta reuse are likely *open design*. The secret-leak fix is located and small, so `low`. Everything edits one file, so expect a chain. Say so in `parallel:`.
- **Spend:** no slice spends money (only the workspace's own dispatches). Write `spends money: no` per slice unless the evidence shows otherwise.
- **The acceptance gate:** recommend `--require`. The confirmation the operator reads changes (sections, plain summary, cost line), and the walkthrough is the desk check's sample confirmations plus the projected-cost table. Precedent: P35-a4 waived, as pure instruction text. The orchestrator declares the gate after `finish-slice`; the executor only recommends.

## Return

The verdict block, then:
- the slice list with risk and triggers;
- `parallel:`;
- the gate recommendation;
- any Operator Questions appended to `phase.md`.

No commits and no state moves beyond the decomposition carve-out.

## After approval (orchestrator)

1. Copy this plan to `slices/P38-e1.DECOMP/plan.md`.
2. Run `start-slice`, then `executor-route P38-e1.DECOMP` and `--explore`, and pin `## Dispatch`.
3. Dispatch `slice-executor` in the background.
4. On return: `record-dispatch`, `finish-slice`, `accept-gate`, `validate`, then commit. Then plan S1 in `auto`.

## Verification

- `python3 scripts/workflow.py validate` passes.
- `parallel-plan P38-e1` shows every middle slice declared.
- `topics/breakdown.md` and `topics/cost-evidence.md` exist.
- `phase-section P38-e1 Decisions` has the breakdown gist.
- Each of intent items 1–11 maps to exactly one slice (or to the REVIEW / desk check) in the breakdown.

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
