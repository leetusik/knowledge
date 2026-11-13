# P38-e1.S3 — a team sized by the document, and a claim cap (intent items 2 and 9)

## Goal

Today §3.4 D1 sizes a run by "the highest of three axes", so any rich subject gets 7–10 researchers. P48-q4, a metered v1, used 9 researchers ($73.97); P50-4b, a v2, used 10. After this slice:
- a **document or chapter** is sized by its word budget `W` (the signed sections' budgets, S2) and by where the evidence lives;
- a document gets at most **4** researchers (codebase: 2 code + 2 web);
- claims are capped at `C = W ÷ 25`;
- the dispatch ceiling is **8**.

The tier table stays only for a **book**. This binds a **v1** run as much as a v2 (the operator: "not only for the v2 or more, v1 also"). A v2's further cut is S5's delta; S3 only states the hook.

## The approach (pinned; decide nothing new)

Follow `works/phases/active/P38-e1/topics/breakdown.md` **`## P38-e1.S3`** exactly, together with **`## The shipped set`** and **`## Pins for every rule slice`**. The numbers are calibrated in `topics/cost-evidence.md` §1, §3 and §5. The points:

1. **`W`** is the sum of the signed sections' budgets: 3,000–5,000 for a document, and 4,800 when unstated.
2. **Wave 1 for a document or chapter:** `W ≤ 2,000` → 2 researchers; `≤ 3,500` → 3; above → **4** (the cap).
3. **Where the evidence lives:**
   - **Codebase:** code researchers take the merged repo angles: *code in real order* + *history* is one researcher, *applied* + *branches/real cases* another. Web researchers take the outside angles, merged into at most 2. At W > 3,500 that is 2 code + 2 web.
   - **General:** all web, each researcher a merge of §3.4 step 5's angle list.
4. **A prior:** one sentence states the hook, "a v2 with a usable prior is sized by §3.1's delta". S5 writes the delta.
5. **Gap rounds** for a document take at most 2 researchers a round. The ceiling is **8** dispatches, gap reviews included and verifier batches not. The 3-round loop bound stays; the ceiling binds first.
6. **The claim cap** `C = W ÷ 25` (≈ 190 at 4,800):
   - It is split across the wave by each researcher's share of the questions, and sent on each dispatch as `claims: ≤ <n>`.
   - B1 and B2 stop adding claims at the cap, load-bearing first, and return `partial` only if a load-bearing question is left open by it.
   - Gap-round researchers draw on what is left.
   - `quick` keeps its lead-only shape, with its claims capped by the same `C`.
7. **The tier table** (§3.4 step 4) stays for a **book** (§9.2's "tier usually 3"). The "highest of three axes" sentence no longer applies to a document. Write the document rule first and the book table second, inside the same step.
8. **`plan.md`'s header line** for a document becomes `size: W <n> words → <r> researchers (<c> code · <w> web) · claims ≤ <C> · ceiling 8`. `run.md`'s `tier:` field reads `size` for a document, and §3.3's template shows both forms.
9. **§9.1(b)**: "tier 3 on two or more axes, or over 10 researchers in wave 1" becomes "over about 25 questions, more than 6 content sections, or W over ~6,000". **Keep S2's clause that the size test reads the signed sections** (S2's note), here and in §3.4's closing paragraph.
10. **§3.5:** step 1's dispatch carries `claims: ≤ <n>`; step 2's wave limit of 10 stays as a host limit.
11. **B1 and B2:**
    - Their *Your dispatch* blocks gain `claims: ≤ <n>`.
    - Their stop rules stop at it.
    - Then run `python3 scripts/skills_parity.py --write-agents`.
12. **The v1 check (item 9):** write the rule so that P42's bar as a v1 (codebase, W ≈ 4,800, no prior) gives **4 researchers (2 code + 2 web), C ≈ 190, ceiling 8**.

## Constraints

- Keep the run card's "Never skip or shorten a stage…" rule: the rule changes what a stage is sized to, never lets a lead cut one.
- **Headings, `§` numbers and Part B marker lines** (and their `with=` lists) stay byte for byte. New text goes inside existing sections. No new `## Explain` field and no new `run:` value.
- **The set** (touch nothing else):
  - the canonical `plugin/skills/explain/SKILL.md`;
  - `.agents/skills/explain/SKILL.md`: the canonical file minus the `argument-hint:` and `allowed-tools:` lines, body byte-equal;
  - `web/public/SKILL.md`: a full `cp`;
  - the five `plugin/agents/*.md`, regenerated only.
- **Never** edit `.claude/skills/**`, commit, or move workflow state.
- **The notebook:**
  - Leave a `## Doc impact` note through `phase-section P38-e1 "Doc impact" --append`: `product.md`: explain research is sized by the document (at most about 4 researchers, a claim cap, the top tier for books only) (P38-e1.S3).
  - Remove the consumed S2 note's S3 part only if nothing else in it is still needed. Otherwise leave it.
  - Update `## Now`.

## Validation

- `python3 scripts/skills_parity.py` → PASS
- `python3 scripts/plugin_parity.py` → PASS
- **The heading diff against `14e1cbda`** → empty. The sandbox refuses `<(…)`, so save `git show 14e1cbda:plugin/skills/explain/SKILL.md` to the session scratchpad and diff the `^#` lines, as S2 did. The Part B marker lines must be identical too.
- P33-n3's citation check (`works/phases/active/P33-n3/topics/citations.md` L64–85) → `checked=200 missing=2`, no worse
- `uv run pytest tests/test_explain_resolver.py -q` → passes
- **A hand-run in `result.md`**, applying the written rule to two cases:
  - P42's bar as a v1 → 4 researchers (2 code + 2 web), C ≈ 190, ceiling 8;
  - P48-q4 (codebase, W 4,800, a v1) → 4, not its metered 9.
- `git status --porcelain .claude/` → nothing of this slice's

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
