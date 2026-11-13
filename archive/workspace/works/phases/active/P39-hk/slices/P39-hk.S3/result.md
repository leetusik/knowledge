# P39-hk.S3 — result

- status: done
- route: mid
- model: opus
- effort: medium
- summary: Rewrote the explain skill's writing rules. §4 adds visuals first, a stated paragraph bound (80 words a paragraph, at most 3 paragraphs in a row without a break) and typeset formulas, each with a reading and a "where" legend; no stock reader. §4.2 becomes *The outline, from the signed shape*, §4.5 becomes *Next steps, and the quiz* (next steps from `## Open` only, no best practices), and the B5 critic gains the `reading`, `visuals` and `math` checks. All of it is propagated to the parity copies.
- files_changed: plugin/skills/explain/SKILL.md; .agents/skills/explain/SKILL.md; web/public/SKILL.md; plugin/agents/explain-critic.md; works/phases/active/P39-hk/topics/skill-headings.md; works/phases/active/P39-hk/topics/notes-for-later-slices.md (via --to-topic); works/phases/active/P39-hk/phase.md (via phase-section); this result.md
- validation: skills_parity PASS; plugin_parity PASS; pytest tests/test_explain_resolver.py 2 passed; `git status --porcelain .claude/` empty; workflow validate passed; P33-n3 citation check checked=200 missing=81 (count only, vendored route, expected)
- deviations: the critic agent's frontmatter `description` was hand-extended to name the reading checks, which the plan allowed; *Standalone* got one clause and nothing else
- doc_impact: `(P39-hk.S3) product.md: explain's writing rules …` (one line, appended)

## What changed, by heading (`plugin/skills/explain/SKILL.md`)

- **§4 *The prose rules*:**
  - **Lead-in:** a new lead-in: easy reading for §1 *The reader*'s reader, never a stock one.
  - **New bullets:** *Visuals first*, *Short paragraphs, no dense stretch* (the bound is stated once, here), and *Formulas that look good*. The last carries the anti-example, the reading and the "where" legend, tracing through B9, and the forward line "The inline and display forms are in §4.4 once the reader supports them". Until then it gives an interim rule: the relation in words, or the code line in a titled block with its reading and legend as a list.
  - **Rewritten bullets:**
    - *Plain sentences for the stated reader* is now *Plain sentences*.
    - *One idea a paragraph* points at the bound.
    - *Show, then tell* adds the picture and toy data.
    - *Teach, don't report* adds "shown where it can be".
    - *Standalone* adds that a picture is explained in place, never linked.
- **§4.2:** renamed *The outline, from the signed shape*.
  - Its list: In one paragraph, the signed sections (with change- and topic-mode guidance and the SKIP callout), Next steps (when it is signed and `## Open` holds something), Quiz (only when kept, last before Sources), and Sources (`## Sources {#sources-list}`).
  - The old items Background, Intuition, Code, Best practices and "the pages you opened" are gone, along with every general-mode clause.
  - The tone line says "written for the reader §1 named, never a stock one" in place of "novice-friendly by default".
- **§4.5:** renamed *Next steps, and the quiz*. Next steps is a `## Next steps {#next-steps}` with one plain-words item per `O` entry, each traced, with no advice of the writer's and no deferred-job id. When nothing is open, it is cut to `## Not used`. A closing line says there is no best-practices part. The quiz is "only when the shape kept it"; its rules are unchanged.
- **§4.10 step 1:** the critic summary names hard reading, a missing visual and a bare symbol string.
- **B5:**
  - *Inputs* item 8: §4.5 now reads "(next steps and the quiz)".
  - *The reader*: the 100-word clause is gone; length is now `reading`'s.
  - *Clarity*: the paragraph length moved out; "a sentence stacking 3 or more new terms" stays.
  - *How you check*: three new bold checks after *Clarity*:
    - *Hard reading* (`reading`, should-fix);
    - *A missing visual* (`visuals`, should-fix; a picture present but not worth its place stays `diagrams`);
    - *A bare symbol string* (`math`: must-fix for a symbol string in prose; should-fix for a display formula missing its reading or legend; a code-block symbol or a single variable named in passing is exempt).
  - *The rubric*: must-fix and should-fix lists updated, and the category list gains `reading`, `visuals` and `math`.
  - *The file*: the `must_fix:` split lists the three. The return block's `must_fix` is a generic split, so it needed no change.
- **§8 D9 and §9.3:** these name neither best practices nor the fixed outline, so they are untouched.

The chosen bound: **at most 80 words a paragraph, and at most 3 paragraphs in a row without a break**, a break being a visual, list, table, code block, callout or display formula. It tightens the old "about 100 words".

## Propagation

- `.agents/skills/explain/SKILL.md`: the plugin body spliced under its own frontmatter, which has no `argument-hint:` or `allowed-tools:`.
- `web/public/SKILL.md`: `cp`.
- `python3 scripts/skills_parity.py --write-agents` wrote `plugin/agents/explain-critic.md`. The frontmatter `description` then had "how easily it reads (short paragraphs, the visuals it needs, formulas typeset rather than bare symbols)" added; parity still passes.
- No `plugin.json` bump, and nothing under `.claude/`.

## The grep: what is left

`grep -n -i -E "best practice|novice|recommended outline|pages you opened"` finds these hits:

- **L3** is the frontmatter `description:` ("Best practices & next steps"). It is S4's.
- **L201** is §1 *The reader*'s "Never a stock reader ("a novice", …)". That is the rule itself, so it is kept.
- **L220** is §1 *The shape*'s "no "Best practices" part". That is the rule, so it is kept.
- **L922 (§3.4) and L1178 (§4 *No new things*)** each say "never … its best practice". This is the no-outside rule, so both are kept.
- **L2639 (B8) and L2747 (B9's code-researcher text)** are in Part B's B6–B12 range. They are S4's.

Nothing in §4, §4.2, §4.5 or B5 still names best practices, a novice or the old outline.

## Deferred items

There are none. D86-sd's items (the web-search scope, the Sections closing line, W timing, the cost table, quick, translation in §8 and §4.9, the cheap look, the headless note) concern machinery that S3 did not touch. D69 is §1 placement and D85-qk is workspace-side, so neither is settled here.

## Notebook (written through `phase-section`)

- **Decisions:** three gists: *Reading rules (S3)*, *Next steps (S3)* and *The critic's reading checks (S3)*.
- **Notes for later slices:**
  - Removed the consumed `(from S1, for S3)` and `(from S2, for S3)` notes.
  - Moved three older notes to `topics/notes-for-later-slices.md`: DECOMP's merge risk, DECOMP's vendored-route note and R1's build cut. Each leaves a pointer.
  - Appended three: one for S4, one for the skill §4 slice (where the formula forms land: the "until then" clauses in §4 and B5, and the glossary in §4.2's list) and one for S5 (the headings).
  - The section is at 5978 B of 6144.
- **Doc impact:** one line. **Now:** replaced.
- **Headings crosswalk:** three S3 rows appended to `topics/skill-headings.md`.
- **Note:** `phase-section` still suggests moving Decisions entry 5 (D1 signed, which predates this slice). That move is the orchestrator's.
