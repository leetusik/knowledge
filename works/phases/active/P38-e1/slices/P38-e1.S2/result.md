# Result: P38-e1.S2

- status: done
- route: mid
- model: opus
- effort: medium
- summary: The explain front door now drafts the document's sections after a cheap look (at most 10 reads; a v2 reads the prior's headings) and shows them as a signed `Sections` block in the confirmation; D0 reads them from `intent.md`'s Original Input, D1's skeleton and D6's path are them, an uncarriable section is cut and reported (never a stop), D5g counts the remaining sections, §8 reports signed vs delivered, and a book signs chapters at the confirmation and each chapter's sections at its outline gate.
- files_changed: plugin/skills/explain/SKILL.md, .agents/skills/explain/SKILL.md, web/public/SKILL.md, works/phases/active/P38-e1/phase.md (via phase-section), works/phases/active/P38-e1/slices/P38-e1.S2/result.md
- validation:
  - `python3 scripts/skills_parity.py` → PASS
  - `python3 scripts/plugin_parity.py` → PASS
  - heading diff against `14e1cbda` → empty (run via a scratchpad copy of `git show 14e1cbda:…`, same comparison)
  - P33-n3 citation check → `citations checked=200 missing=2` (the two pre-existing `B5 *Your dispatch*` misses), no worse
  - `uv run pytest tests/test_explain_resolver.py -q` → 2 passed
  - `git status --porcelain .claude/` → empty
  - `python3 scripts/workflow.py validate` → passed (stale-docs and oversized-section warnings only, pre-existing)
  - read-through → consistent (below)
- deviations: none in scope. Two glosses the plan implied but did not spell out, noted for the review: (1) "a section the evidence cannot carry" is glossed as one whose load-bearing questions are neither `answered` nor `contested` and that holds no must-cover item; a section holding a must-cover item is never cut (that is what keeps D5g's must-cover rule standing). (2) The brief template gains a `- sections:` line so D1/D6 read the signed list from `brief.md`; the `run.md` D6 record gains `(signed <n> · cut <n>)`.
- doc_impact:
  - `product.md`: the explain confirmation proposes the document's sections (a book: its chapters), the operator's yes signs them, and the run researches and writes only for them; a section the evidence cannot carry is cut and reported, never a stop (P38-e1.S2).
  - `qa.md` `## Regression Checklist`: the explain front-door lines (headless, and a book) expect the `Sections (your yes signs them; change any line):` block in the confirmation (P38-e1.S2).

## What changed, by section (canonical `plugin/skills/explain/SKILL.md`)

- **§1 *The front door, step by step*, preamble:** "your only other calls" now names the one added call: a read of the prior itself for its headings when the lookup finds one.
- **§1 step 5:** a closing paragraph, *the cheap look*: at most 10 reads, no agents, no web search; repo modes read the subject's files (a phase or slice: `intent.md`, `phase.md`'s `## Now` and `## Decisions`, the heads of its slices' `result.md`); a v2 reads the prior's `##`/`###` headings via `knowledge … read <PRIOR_REL_PATH> --source` or the `-H @<KB_AUTH_HEADER>` curl; general mode uses the request and the ordinary map, no search. Nothing it reads is evidence.
- **§1 step 6:** the `outline sign-off` field text now says the sections are signed at the confirmation whatever the field says; `on` for a document or chapter means also signing D6's final outline (claims and budgets) before the write; a book's outline gate signs each chapter's sections, no stop per chapter. A new paragraph drafts the **sections** (not a field): numbered `<n>. <Heading> — <what it answers>` in §4.2's order, at most 6 content sections, Quiz and Sources implied; plain-word headings; v2 marks `kept`/`renamed`/`dropped`/`new`, ids carried; a book lists chapters; a new chapter of an existing book lists its own sections.
- **§1 step 7:** the layout gains the `Sections (your yes signs them; change any line):` block right under the title line, with the v2 marks and the "Quiz and Sources close it" clause; a book's `Sections` lists chapters and its stops line says each chapter's sections are signed at the outline gate with no stop per chapter; a changed section line folds in like any other. The `- cost: …` bullet is untouched (S7's).
- **§3.1 D0:** brief gains `- sections: signed: … | not signed up front`; the signed sections are read from the last confirmation under `intent.md`'s *Original Input (verbatim)*, with the reply's changed lines folded in; with none, D1 drafts them and §8 says so.
- **§3.4 D1 step 3:** the skeleton is the signed sections in order and wording; each question in exactly one signed section; must-cover folds into its section; no question for an unsigned section. Closing paragraph: the size test reads the signed sections; a signed section scoped out is a cut section.
- **§3.8 D5g:** two-thirds counted over the remaining sections; a cut section never fails the gate on its own; must-cover rule stands, so a section holding a must-cover item is never cut.
- **§3.10 D6 step 2:** the path is the signed sections, in order and wording; ids from headings, v2 carries ids; per-section word budgets summing to the document's; an uncarriable section is cut, its claims to `## Not used`, reported in §8, never a stop. Step 4's "lands on the path" excepts a cut section's. The `run.md` D6 line gains `(signed <n> · cut <n>)`.
- **§8 item 3:** `sections: <n> signed · <m> delivered` with each cut section and why, or `sections: not signed up front`.
- **§9.1(b):** the size test reads the signed sections (thresholds untouched; S3 owns them).
- **§9.2 step 2:** the book's D1 skeleton is the chapter list signed at the confirmation (a draft list when none). **Step 5:** `book/outline.md` gains, per chapter, its sections (heading + one line, §4.2 order, at most 6 content sections); the outline gate signs them all at once, no stop per chapter slice.
- **§9.3 step 5:** a chapter's D6 path is its sections signed in `book/outline.md`.

Not touched: every heading and `§` number, Part B (so the five agents need no regeneration; `skills_parity.py` confirms they still match), the run card's "Never skip or shorten a stage" rule, the `- cost:` bullet, S6's plain-words line. `.agents/skills/explain/SKILL.md` is the canonical file minus its `argument-hint:` and `allowed-tools:` lines; `web/public/SKILL.md` is a `cp`.

## Read-through (signed sections, end to end)

- §1 steps 5–7: the look (step 5) sizes the list; step 6 drafts it under the same rules the layout shows; step 7 shows it under the title and the yes signs it. Agree.
- D0 → D1 → D5g → D6 → §8: D0 reads the signed list into `brief.md` (or records "not signed up front"); D1's skeleton is that list; D5g counts over remaining sections and never fails on a cut one; D6's path is that list with ids and budgets, cutting only an uncarriable section without must-cover; §8 reports signed vs delivered and each cut, or "not signed up front". Agree; the §3.4 size-test cut feeds the same §3.10/§8 reporting.
- §9.2/§9.3: chapters signed at the confirmation (D0) become §9.2's D1 skeleton; each chapter's sections are written into `book/outline.md` and signed at the one outline gate; §9.3's D6 path is them, under §3.10's rules. Matches step 6's `outline sign-off` text and step 7's book stops line. Agree.

## Notebook

- `## Doc impact`: the two lines above (appended).
- `## Notes for later slices`: one note for S3, S6 and S7 (where their text goes relative to the `Sections` block; S3 keeps the size test's signed-sections clause).
- `## Now`: rewritten with S2's landing.
