# P38-e1.S8 — the desk check: prove the cut on paper (intent item 9, and the phase's proof)

## Goal

Prove, with no live explain run, that the rules S1–S7 wrote do what the operator asked:
- a **v1** run is cheap too ("not only for the v2 or more, v1 also");
- a **v2** runs as a delta;
- a translation is one write span;
- the confirmation proposes the sections, opens in plain words and shows an honest cost.

This writes the walkthrough material the REVIEW hands the operator at the acceptance gate.

## What to write

`works/phases/active/P38-e1/topics/desk-check.md` **only**, plus `result.md` and notebook entries. Follow `works/phases/active/P38-e1/topics/breakdown.md` **`## P38-e1.S8`**. It holds:

1. **The v1 case: P42's bar as a v1** (codebase, no prior, sections and budgets as P50-4b's outline, W ≈ 4,800).
   - Apply the final rules one by one, citing the skill line that decides each (`plugin/skills/explain/SKILL.md:<line>`): §3.4's sizing, S3's claim cap, S4's D5p pick then D5, S6's critic sample, S6's writer budget.
   - Give the projected agents, spans and $, using the unit costs in `topics/cost-evidence.md` §5.
   - Set it beside P48-q4's metered $73.97 and 9 researchers.
   - **Pass** when it sizes to about 4 researchers.
2. **The v2 case: P50-4b as a delta.** The prior is the v1 of 2026-10-27. Reuse S5's hand-run from the `(from S5, for S8)` note and S5's `result.md`:
   - what is reused and what is researched;
   - the projected agents, spans and $ beside the metered $79.22.
3. **The translation: P51-3q under S7's rule.** The publish flags, the projected span and the $, beside the metered $7.84.
4. **Three sample confirmations**, rendered exactly per the final §1 step 7, each with its `In plain words:` summary, `Sections` list, `Cost:` line and `## Explain` block:
   - a v1 document (the bar);
   - a v2 document (the bar's next version, as a delta, showing `from scratch`);
   - a book (e.g. the bar and its strategies, with chapters listed).

   Put each in a fenced block exactly as the operator would see it.
5. **A plainness read of the three samples** (item 10). The operator asked for "easier to understand". Read each sample as a newcomer would, and list any line still jargon-heavy or unclear: the words a non-author would not know (e.g. "verifier batch", "gap round", "D5g"), and lines over-long for a confirmation. Each such line is a finding.
6. **The item map:** for each of intent items 1–11, the final skill's section and line that delivers it.
7. **The cost table check:** §1 step 7's *The cost table* against your projections, within ±25%.

## A miss is a finding, never an edit

**S8 never edits the skill**, the cost table included: the `(from S7, …)` note's "S8 corrects the table only" is overridden by the breakdown's rule. These are misses:
- a v1 above about 4 researchers;
- a table off by more than ±25%;
- an item with no line;
- a confirmation line a newcomer cannot follow.

List each miss in `result.md` under `findings:`, with the exact correction you would make (e.g. the table row's new numbers, or the reworded line). Also add one `(from S8, for REVIEW)` note in `## Notes for later slices`. The orchestrator then decides on a fix slice before S9.

## Constraints

- **The set:** `works/phases/active/P38-e1/topics/desk-check.md` only, plus `result.md` and the notebook through `phase-section`.
- Read-only on `/Users/sugang/projects/personal/arb_upbit_1`.
- **Never** edit the skill, `.claude/skills/**` or any product file. Never commit or move workflow state.
- **The notebook:**
  - Rewrite `## Now` under its 2,048 B budget (`--replace`).
  - Remove the consumed `(from S5, for S8)` note, and narrow the others to what remains for S9 and REVIEW.
  - No `## Doc impact` line.

## Validation

- `python3 scripts/skills_parity.py` → PASS (unchanged tree)
- `python3 scripts/plugin_parity.py` → PASS (unchanged tree)
- `git status --porcelain -- plugin .agents web .claude` → empty: the skill is untouched
- Every case in `desk-check.md` cites the skill lines it applied

## Dispatch

route=mid
reason=kind qa rated low
subagent_type=slice-executor
model=opus
pass_model=yes
effort=medium
pass_effort=yes
attribution=Claude Opus 5.5
explore_model=haiku
explore_effort=xhigh
