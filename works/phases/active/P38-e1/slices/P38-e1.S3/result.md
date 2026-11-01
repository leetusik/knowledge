# P38-e1.S3 — result

- status: done
- route: mid
- model: opus
- effort: medium
- summary: A document's research is now sized by its word budget W and by where its evidence lives: at most 4 researchers (2 code + 2 web for a codebase), at most 2 a gap round, a ceiling of 8 and a claim cap C = W ÷ 25 that rides each dispatch as `claims: ≤ <n>`. The tier table now applies to books only. B1/B2 stop at the cap, and the agents were regenerated.
- files_changed: plugin/skills/explain/SKILL.md, .agents/skills/explain/SKILL.md, web/public/SKILL.md, plugin/agents/web-researcher.md, plugin/agents/code-researcher.md (regenerated), works/phases/active/P38-e1/phase.md (via phase-section), works/phases/active/P38-e1/slices/P38-e1.S3/result.md
- validation: skills_parity PASS · plugin_parity PASS · heading diff vs 14e1cbda empty · Part B marker lines identical · citation check `checked=200 missing=2` (baseline) · `uv run pytest tests/test_explain_resolver.py -q` 2 passed · `git status --porcelain .claude/` empty · `workflow.py validate` passed (warnings only, pre-existing stale-docs/oversized-section) · hand-run of both cases below: 4 / 4
- deviations: (1) The plan does not set a per-researcher tool-call budget for a document, but §3.5 and B1/B2 still send a `budget:`. I pinned tier 2's budget (web 10–20 / 30, code double), the budget P48-q4 ran on and the run this calibration comes from. The plan header keeps a `budget:` continuation line. (2) Book researchers get `claims: none` (the cap is a document's), so the dispatch field reads `claims: ≤ <n> | none`. (3) In §3.4 step 5, "Merge angles to fit the tier" now reads "…fit the size", and the document's merge comes before the tier merges.
- doc_impact: `product.md`: explain research is sized by the document (at most about 4 researchers, a claim cap, the top tier for books only) (P38-e1.S3).

## What changed (canonical `plugin/skills/explain/SKILL.md`; copies synced)

- **Run card, loop safety:** "the tier's dispatch ceiling" → "the dispatch ceiling (8 for a document, the tier's for a book; §3.4)". "Never skip or shorten a stage…" is untouched.
- **§3.3 `run.md`:** the first line reads `size: W <n> | tier: <n>`, and one sentence says which is a document's and which a book's.
- **§3.4 plan header:** the document's form is `size: W <n> words → <r> researchers (<c> code · <w> web) · claims ≤ <C> · ceiling 8`, continued by `· per round: ≤ 2 · budget: …`. The book's tier line is shown in parentheses as the other form.
- **§3.4 step 4:** the document rule comes first (W; wave 1 at 2/3/4; where the evidence lives; the prior hook "a v2 with a usable prior is sized by §3.1's delta"; gap rounds ≤ 2; ceiling 8, binding before the 3-round bound; budget; claim cap C = W ÷ 25, split by question share, gap rounds draw on what is left, `quick` capped too). A worked example follows. The book's tier rule and table come second, unchanged. The closing sentence says the caps size stages and never let one be skipped.
- **§3.4 step 5:** "Merge angles to fit the size": how a document merges, then the existing tier merges for a book.
- **§3.4 closing paragraph:** untouched, so S2's "reads the signed sections" clause stays.
- **§3.5 step 1:** the dispatch carries the plan's budget and `claims: ≤ <n>`. **Step 2:** the 10/6 wave limit is called a host limit, not a size.
- **§3.7:** per-round number is 2 for a document (the tier's for a book), each with a share of the remaining claims.
- **§3.9 `quick`:** the plan has no team, and its C caps the lead's own claims.
- **§8 item 3:** "the size (a document) or the tier (a book)".
- **§9.1(b):** the test now reads "over about 25 questions, more than 6 content sections, or `W` over ~6,000 words (§3.4 step 4)". S2's signed-sections clause is kept.
- **B1 / B2:** the *Your dispatch* blocks gain `claims: ≤ <n> | none`. The stop rules (B1 step 6, B2 step 5) say to stop adding claims at the cap, load-bearing questions first, and to return `partial` only if the cap leaves a load-bearing question open. `skills_parity.py --write-agents` rewrote `web-researcher.md` and `code-researcher.md`.
- §9.2 and §9.3 are untouched, so a book still says "tier usually 3".

## Validation (commands and outcomes)

- `python3 scripts/skills_parity.py --write-agents`: wrote web-researcher.md and code-researcher.md
- `python3 scripts/skills_parity.py` → `PASS — explain skill copies are in body parity (web copy byte-identical); the 5 plugin agents match Part B.`
- `python3 scripts/plugin_parity.py` → `PASS — plugin templates are in parity with the repo.`
- Heading diff: saved `git show 14e1cbda:plugin/skills/explain/SKILL.md` to the scratchpad, then `diff` of the `^#` lines → empty. The same for `part-b:` marker lines → identical.
- P33-n3 citation check (citations.md L64–85) → `citations checked=200 missing=2`. These are the two pre-existing B5 *Your dispatch* misses, so no worse.
- `uv run pytest tests/test_explain_resolver.py -q` → `2 passed`
- `git status --porcelain .claude/` → empty
- `python3 scripts/workflow.py validate` → `Workflow validation passed.` (pre-existing warnings only)

## Hand-run of the written rule

1. **P42's bar as a v1** (codebase subject, no prior, no stated budget, so W = 4,800 by step 4).
   - The prior hook does not apply (no prior).
   - W > 3,500 → 4 researchers. A codebase gives 2 code ({code in real order + history behind it}, {applied + branches/real cases}) and 2 web (outside angles merged).
   - C = 4,800 ÷ 25 = 192 ≈ 190.
   - Ceiling 8, at most 2 per gap round.
   - → **4 researchers (2 code + 2 web), C ≈ 190, ceiling 8.** ✔
2. **P48-q4** (U10, codebase, W 4,800, a v1, metered 9 researchers at tier 2).
   - The same inputs give the same branch: W > 3,500 → **4 researchers** (2 code + 2 web), not its metered 9 (5 code + 4 web).
   - C = 192, against its 215 claims returned and 171 used.
   - Its 2 gap reviewers plus up to 2 gap researchers still fit under ceiling 8 (4 + 2 + 2 = 8).
   - → **4, not 9.** ✔

## Notebook

- `## Doc impact`: appended the product.md line above.
- `## Notes for later slices`: added `(from S3, for S5 and S7)`, which names the prior hook S5 fills and the header S7's cost line can read. S2's note is left in place because it is also for S6 and S7.
- `## Now`: rewritten with S3's landing.
