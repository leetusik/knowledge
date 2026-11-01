# P38-e1.S8 — result

- status: done
- route: mid
- model: opus
- effort: medium
- summary: The paper desk check passes on the sizing. A v1 of the bar sizes to 4 researchers (2 code + 2 web), against P48-q4's 9, and is projected at ≈ $31–49. P50-4b as a delta sizes to 2 researchers and ≈ $25–42, against $79.22. The translation is one write span at ≈ $3. Every cost-table row with a number is within ±25%, and each of items 1–11 has a skill line. It records 15 findings, each with its exact correction: 7 in the step 7 rules and the table, and 8 confirmation lines a newcomer cannot follow. The skill is untouched.
- files_changed: works/phases/active/P38-e1/topics/desk-check.md (new); works/phases/active/P38-e1/slices/P38-e1.S8/result.md (new); works/phases/active/P38-e1/phase.md (Now, Notes for later slices, through `phase-section`)
- validation:
  - `python3 scripts/skills_parity.py` → PASS
  - `python3 scripts/plugin_parity.py` → PASS
  - `git status --porcelain -- plugin .agents web .claude` → empty (the skill is untouched)
  - every case in `desk-check.md` cites the skill lines it applied (§1–§3 rule tables, §4 rule lines under each sample, §6 item map, §7 table rows): yes, line numbers spot-checked against the file with `awk`
- deviations: none. The plan's six parts plus its item 5, the plainness read, are all in `topics/desk-check.md`. The quick-run projection (≈ $15–25) is my judgment, recorded only to support F2.
- doc_impact: none
- findings:
  1. **F1** L338: the `· cheaper: <delta | quick> ≈ $<c>` clause is shown unconditionally. **Fix:** write it as `[ · cheaper: … ]` and say "only when one applies" at L369–370.
  2. **F2** L380–383 vs L399: a narrow subject's `cheaper: say "quick"` must carry "its cost", but the table says `quick` is "not metered yet". **Fix:** "with its cost, or `not metered yet`" (or give the row a projected `≈ $15–25`).
  3. **F3** L361–364: the required search-cap sentence has no template line. **Fix:** add after the permissions line: `- web searches: every search, the agents' included, counts against this session's limit (200 by default); start a long run in a fresh session`.
  4. **F4** L342 vs L294–295: a book's run line still offers `· or quick / no-research`, which a book never applies. **Fix:** add to L358–360: "its run line drops `· or quick / no-research`".
  5. **F5** L396: the v1 row says "(measured on a codebase subject)", but its figures are projected. **Fix:** `v1 document (a codebase subject; projected from P48-q4)`.
  6. **F6** L390–392, L398: the table leaves out the workspace's phase around the run, which is ~70% of a translation's bill ($5.58 of $7.84). **Fix:** translation row `$3 (the explain phase around it adds ≈ $5 today)`, and L366–369 add "plus the explain phase around it, a few dollars".
  7. **F7** L1800–1812: the `save` synopsis has no `--slug` slot, though L738 and L1822 require one. **Fix:** add `[--slug <source slug>-<xx>] \` above `[--translated-from …]`.
  8. **F8** L342: "quick / no-research" is unexplained. **Fix:** `· or say "quick" (one agent researches alone, no reviewer) or "no-research" (this repository only, no web)`.
  9. **F9** L366–368 and the table's "What it sends" column: "verifier batches, gap round, the critic" are jargon. **Fix:** `4 research agents (2 read the code, 2 search the web), about 14 fact-check batches on a second model, at most 1 extra round to fill gaps, 1 reviewer`; a delta's `a check that v<N>'s sources still say the same`.
  10. **F10** L344: "prior". **Fix:** `earlier version: <none found | v<N>>` in the summary list; the `## Explain` field keeps `prior:`.
  11. **F11** L346: "manual permission mode needs the preflight's rules (§3.2)". **Fix:** `- permissions: if you approve tool calls by hand, add the rules the run prints first (the explain skill's §3.2)`.
  12. **F12** L345: "a reviewer's must-fix cannot be settled". **Fix:** "the reviewer finds an error the run cannot fix".
  13. **F13** L358–360: the book's "outline gate … acceptance gate". **Fix:** `it stops twice for your yes: once to sign every chapter's sections together, once to accept the finished book`.
  14. **F14** L343: with must-cover items, the `lang · reader · must-cover` line runs to ~450 characters. **Fix:** give must-cover its own line (`- must-cover: <n> items, each in a section above`, or numbered).
  15. **F15** L373–375: a delta says `from scratch … ≈ $<v1>` on both the run line and the Cost line. **Fix:** say it once, on the Cost line.

## What was done

Everything is in [topics/desk-check.md](../../topics/desk-check.md):

- §1 the v1 case;
- §2 the delta case;
- §3 the translation;
- §4 three rendered confirmations;
- §5 the plainness read;
- §6 the item map;
- §7 the cost-table check;
- §8 the findings.

This log keeps only what is not there.

- **Sources read:**
  - the final `plugin/skills/explain/SKILL.md`: the card, §1, §2's head, §3.1, §3.4–§3.10, §4's D7 and prose rules, §4.10, §5's publish forms, §8, §9.1–§9.2 and B5's *How you check*;
  - `topics/cost-evidence.md`;
  - `topics/breakdown.md` `## P38-e1.S8`;
  - S5's `result.md`, its verdict and *Hand-run*;
  - read-only in arb_upbit_1: P50-4b's `doc/outline.md` (the budgets 450/800/1,600/800/1,150 and the reader's tasks) and its `intent.md` `## Explain` fields, and P51-3q's DECOMP/S1/REVIEW `result.md` (the publish flags, the slug `our-bar-performance-rule-v1-ko`, the rel_path);
  - `.claude/skills/create-phase/SKILL.md` L130–175, read-only, for the seventeen-field order.
- **Line citations:** these were checked with `awk` against the file. A first draft had six template-line numbers off by one or two (L340–L346). They were corrected before finishing.
- **The ceiling arithmetic:** in a v1, 4 wave-1 researchers, a reviewer, 2 gap-round researchers and a reviewer make 8, the ceiling. So "≤ 1 gap round" in the table is enforced by the rules, not only expected.
- **Sensitivity:** the lead's $5–8 is §6's judgment. Its metered value was $10–13. At that value the v1 high end reaches +20% and the delta's +25% over the table, still within the bound. P48-q4's $15.36 main thread ("cause not established") is the workspace's, outside the table (F6).
- **The delta's verification:** S5 projected ≈ 70–80 checks. I add ≤ 1 swap batch, so 5–7 batches against the table's "~5". That is within ±25% at the midpoint, so it is not a finding.

## Notebook (written through `phase-section`)

- `## Now` replaced: S8 landed, its findings went to the orchestrator before S9, and what comes next.
- `## Notes for later slices`:
  - removed `(from S5, for S8)`, consumed;
  - narrowed the DECOMP, S4 and S7 notes to their remaining audiences (REVIEW; REVIEW; S9);
  - appended `(from S8, for REVIEW)`.
- No `## Doc impact` line, no Decisions entry and no Operator Questions entry.
