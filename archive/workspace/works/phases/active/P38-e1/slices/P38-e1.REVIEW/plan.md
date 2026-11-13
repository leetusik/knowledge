# P38-e1.REVIEW — review "Right-size explain runs (plugin 0.9.0)"

## What is under review

The phase's boundary is what `python3 scripts/workflow.py phase-scope P38-e1` prints: 12 product files, all the knowledge plugin's surface.
- the explain skill (3 copies) and the 5 agent bodies;
- `plugin/templates/manifest.json`;
- `tests/test_explain_resolver.py`;
- `plugin/.claude-plugin/plugin.json` and `plugin/skills/setup/SKILL.md`;
- `plugin/README.md`;
- `web/src/content/marketing/content.ts`.

Anything outside the boundary is an observation, never a finding.

**The record:** `intent.md`, items 1–11. Items 9–11 are the operator's own words at execution: "not only for the v2 or more, v1 also", "make it easier to understand", "suggest the sections before starting the phase or slice". The slices (`## Slices` in `phase.md`) are DECOMP, S1–S9 and F1. F1 fixed S8's desk-check findings.

**Kind and gate:** a review on the high row. The acceptance gate is **required**, because the confirmation the operator reads changes. The phase runs in **parallel mode** (its own worktree).

## The review, step by step

Follow the `review-phase` skill (`.claude/skills/review-phase/SKILL.md`) and this plan.

1. **Validate all slices together**, from the worktree root:
   - `python3 scripts/skills_parity.py` and `python3 scripts/plugin_parity.py` → PASS;
   - `uv run pytest tests/test_explain_resolver.py -q` → passes;
   - the heading diff against `14e1cbda`: save the base to the session scratchpad and compare the `^#` lines → empty; the Part B marker lines are identical;
   - P33-n3's citation check (`works/phases/active/P33-n3/topics/citations.md` L64–85) → `checked=200 missing=2`, the pre-existing workspace-side baseline;
   - `python3 scripts/workflow.py validate` → passes.
2. **Review against the intent, item by item (1–11).** Read the final `plugin/skills/explain/SKILL.md` sections each item touches; `topics/desk-check.md` §6 has the item map. For each item, say whether the shipped text delivers it, and judge it on these points:
   - **v1 (item 9):** every cost fix except the delta reuse binds a first run.
   - **Plain words (item 10):** the confirmation and the document rules read plainly to a newcomer, without workflow jargon.
   - **Sections up front (item 11):** they are proposed at the confirmation, signed by the yes, and drive D1/D6; for a book, chapters at the confirmation and sections at the one outline gate, with no per-chapter stop.
   - **Internal consistency:** the stage table, §3.3 resume, §3.4 sizing, §3.6–§3.10, §4, §4.10, §5 and §8 agree. Walk one v1 `full` run and one v2 delta, D0 → D9, on paper, and report any contradiction.
   - **No key in a transcript (item 6):** no bearer line left; the resolver test proves it.
3. **The skill's own size.** It grew from 2,793 to 3,347 lines (about +20%). Estimate what that adds to a run: how many lead or critic spans load it, and the extra tokens per load at list price. Weigh that against the projected savings (`topics/desk-check.md`).
   - If the growth materially eats the savings, it is a finding: propose which text can move or shrink, with no heading change.
   - Otherwise, record it as an observation with the numbers.
4. **Open the running product: the plugin's front door, headless.**
   - The front door refuses inside `.claude/worktrees/`, so run it from the main checkout, `/Users/sugang/projects/personal/knowledge`, which is a v86+ workspace: `claude -p --plugin-dir /Users/sugang/projects/personal/knowledge/.claude/worktrees/P38-e1-right-size_explain_runs_plugin_0.9.0/plugin "<request>"`.
   - It is read-only there: it writes nothing but the resolver's `auth.header` in the state dir.
   - Before and after each call, record `git -C /Users/sugang/projects/personal/knowledge status --porcelain`, the `works/phases/active/` listing and `git worktree list`. They must be unchanged.
   - **The calls:**
     - **(a)** the qa line's `quick` form on a small subject;
     - **(b)** a `full` v1 document on a codebase subject: expect `In plain words:`, `Sections`, `Cost:` and the `## Explain` block;
     - **(c)** a book request for a phase id: expect chapters listed and the plain two-stop line;
     - **(d)** a v2: only if the KB lists a prior for some subject. Otherwise say so, and use desk-check §4's rendered v2 sample.
   - Compare each printed confirmation with desk-check §4's samples and with §1 step 7. Any mismatch, or anything created, is a finding.
   - **If `claude -p` cannot run** here (refused, no auth, no plugin load): say so plainly, and walk desk-check §4's samples against the final step 7 instead. Never claim a run you did not make. Name the instrument in `result.md`.
5. **Regression lines inside the boundary** (`docs/current/qa.md` `## Regression Checklist`, about L330–367). Re-run only these:
   - *Explain front door, headless*, *a repeat*, *refusals* and *a book*;
   - *The landing's skill pane* (`wc -l web/public/SKILL.md` = the `content.ts` counts);
   - *Explain skill interface* (the citation check: report `missing=2` as the known baseline; its line says `missing=0`).

   *The verifier's same-model guard* applies only if B4 changed. B4 is unchanged except regeneration, so confirm the body's guard text is unchanged and skip the live call.

   Lines whose expected text this phase changed:
   - the headless line now expects the `In plain words:` / `Sections` / `Cost:` blocks;
   - the book line's stops wording and its title rule.

   Write their replacements as `## Doc impact` notes tagged `(gate section — written at merge)`, and append this phase's headline checks the same way. Write **no** doc version: the phase is in parallel mode.
6. **The `## Doc impact` list:** verify it is complete for what shipped (S1–S9, F1). Append any missing line yourself (`doc_impact_added:`).
7. **Route every Operator Question.**
   - **OQ1** (the critic's model inside explain phases, a workspace-side pin) goes into the walkthrough as a decision.
   - Also list the deferred-job candidates for the orchestrator to file. You do not file them.
     - **A live 0.9.0 trial run:** one v1 `full` document, metered with `dispatch-summary`, to confirm the cost table. It is the operator's to start.
     - **The workspace follow-ups**, one job for the bootstrap repo:
       - the critic-model pin (OQ1);
       - create-phase's own confirmation layout (no sections, plain summary or cost line);
       - `explain-review.md` step 1 against the writer gap's `ledger.md`/`verify/` writes;
       - the `B5 *Your dispatch*` citation;
       - a translation as a write slice;
       - explain reviews on the mid row.
     - Observations outside the boundary, as candidates only (e.g. setup's verify curl with the pasted key on its command line).

## The walkthrough (on a `pass`)

The operator reads this at the gate. Follow the stop rules: about 2k characters plus links, at most about 5 decisions, the rest in one "decided as drawn" list, and one word, "accept", signs it.

- **Show:**
  - the three sample confirmations, as links into `topics/desk-check.md` §4, plus your live front-door outputs if step 4 ran;
  - the projected-cost table (v1 ≈ $31–49 vs the metered $73.97; v2 delta ≈ $25–42 vs $79.22; translation ≈ $3 vs $7.84).
- **The decisions:**
  - OQ1;
  - anything from step 3 or the item review that the operator must choose.
- Say plainly that nothing here was proven by a live explain run. The trial run is a deferred-job candidate.

## Constraints

- Edit no source on a review.
- Never commit, never move workflow state, never run `accept-gate`, never file deferred jobs. Never edit `.claude/skills/**`.
- **A non-passing verdict:**
  - complete validation and judgment first;
  - return `changes_requested` with numbered findings and one proposed fix slice per problem class, each with its case list and a risk rating;
  - a fix to mid-row work is `high`.
- **On a pass:**
  - return `review_verdict: pass`, the `walkthrough`, `doc_impact_added:` and `doc_versions: none — deferred to post-merge consolidation (parallel mode)`;
  - add the fixed pointer `explain: not written — run /knowledge:explain P38-e1 for a document, or ask it for a book`.
- Read and write `phase.md` only through `python3 scripts/workflow.py phase-section`. Rewrite `## Now` under 2,048 B.

## Validation

Every line of step 1, and each front-door call's before/after state from step 4, quoted in `result.md`.

## Dispatch

route=high
reason=kind review
subagent_type=slice-executor
model=opus
pass_model=yes
effort=xhigh
pass_effort=yes
attribution=Claude Opus 5.5
explore_model=haiku
explore_effort=xhigh
