# P40-2t.F1 result

- **status:** done
- **route:** high
- **model:** opus
- **effort:** xhigh
- **summary:** "Research first" is now offered whenever the records lack what the reader needs: a subject no phase covers (code or not), a covered subject whose sections or must-cover items rest on what no covering record states, or a request that asks for research. An operator's "research first", offered or not, is always honoured. The plugin skill (§1 COVERAGE, front-door steps 5–8, the intro and the description), its copies, the package's two route texts and patches (create-phase 1c, release §2/§3/§5), PATCHES.md, the READMEs, setup, the KB template and both manifests now say so. All 11 matrix cases are proven, and the landing count is 2,722.
- **files_changed:**
  - plugin/skills/explain/SKILL.md
  - .agents/skills/explain/SKILL.md
  - web/public/SKILL.md
  - works/phases/active/P40-2t/package/claude/skills/create-phase/explain-route.md
  - works/phases/active/P40-2t/package/claude/skills/create-phase/research-route.md
  - works/phases/active/P40-2t/package/patches/create-phase.md
  - works/phases/active/P40-2t/package/patches/release.md
  - works/phases/active/P40-2t/package/PATCHES.md
  - works/phases/active/P40-2t/package/README.md
  - plugin/README.md
  - README.md
  - plugin/skills/setup/SKILL.md
  - plugin/templates/kb/docs/getting-started/{{KB_DATE}}-how-your-knowledge-base-works.md
  - plugin/.claude-plugin/plugin.json
  - .claude-plugin/marketplace.json
  - web/src/content/marketing/content.ts
  - works/phases/active/P40-2t/phase.md (through `phase-section` only)
  - works/phases/active/P40-2t/slices/P40-2t.F1/result.md
- **validation:**
  - `python3 scripts/skills_parity.py --write-agents`, then `python3 scripts/skills_parity.py`: PASS. Part B is untouched, so the critic agent is unchanged.
  - `python3 scripts/plugin_parity.py`: PASS.
  - `uv run pytest tests/test_explain_resolver.py -q`: 2 passed.
  - The heading list (`grep "^#"`) is identical to the pre-edit file: 44 headings. Of the 411 bold runs, none is gone and 4 are new.
  - `checks/finds.py <bootstrap> fdb1151`: finds checked=33, not-exactly-once=0.
  - `checks/apply.py` on a fresh scratch copy of `fdb1151` (`git -C <bootstrap> archive`, then `tar -xf` in the scratchpad): applied finds=33; smoke explain block lines 211–316 passed; caps hold (12,285 / 8,185 / 8,180 B); skill count 21; create-phase core 53,667 B.
  - On that copy, `python3 installer/build.py` then `--check`: OK. `bash tests/retrofit_smoke.sh`, the whole patched suite: 504 PASS, 0 FAIL, "ALL RETROFIT SMOKE TESTS PASSED", exit 0.
  - `checks/cites.py plugin/skills/explain/SKILL.md` over the package's route texts, the three references and the four patch files: 120 citations, 19 bold parts, missing=0. Over the patched copy's `payload/claude/**/*.md` and seed operations doc: 126 checked, missing=0.
  - `wc -l plugin/skills/explain/SKILL.md` = 2,722, which equals `content.ts` L251 and L261.
  - `pnpm --dir web typecheck`: clean. `pnpm --dir web test`: 41 files, 589 tests passed.
  - `python3 scripts/workflow.py validate`: "Workflow validation passed." Its warnings are the standing ones (consolidation owed, stale docs, oversized doc sections) and two pre-existing long Decisions entries (14, 16).
- **deviations:**
  - Four files outside the plan's list, each for the same rule:
    - `package/README.md`: its first bullet still said "When no phase covers an explain's subject", and its create-phase byte count was stale (50,681 → 53,667 B).
    - `patches/create-phase.md` 1e's *Why* summary: it said "research first" "for both cases".
    - The explain route's **phases** line now says "beside the phases that built the code".
    - The skill's **A redrawn confirmation** now says the `Built by:` line names the research phase "beside any phase that built the code".
  - The explain route's own bold part, **When no phase covers the subject,**, is renamed **When the records lack what the reader needs,**. The research route's **When no phase covers its subject** becomes **When the records lack what its reader needs**. Neither is a plugin heading or a cited bold part, and no smoke pin, `apply.py` assert or citation names either. The skill's bold parts all keep their opening words.
- **doc_impact:** one line appended (§ Notebook).

## The rule as built

The orchestrator pinned the rule. Each place that carries it:

| Where | What it now says |
|---|---|
| Skill frontmatter `description:` | "whenever the records lack what the reader needs (a subject no phase covers, one with no code in this repo, or a covered subject whose reader needs outside basics no record states), it offers a research phase first …, it always honours your own "research first" whatever the coverage" |
| Skill intro (L16–20) | the same rule, in one sentence |
| §1 COVERAGE, **None covers it** (L272) | kept for the uncovered case. The research-phase description moves to the new **Research first** paragraph. |
| §1 COVERAGE, new **Covered, but the records lack what the reader needs** (L278) | the covered case: the confirmation names what the records lack and offers "research first" beside `yes`. `yes` explains from the records as they are, with gaps stated. A v2 that asks for outside material is this case too. |
| §1 COVERAGE, new **Research first** (L287) | offered in both cases, and whenever the request asks for research. It is **always honoured**, offered or not. The redraw puts the research phase on `phases:` beside any phase that built the code. Then the research block's lead-in. |
| The block's fill rule (L308) | `paths:` names a covered subject's code all the same; `question:` is what the records lack; `sources:` is `web`, plus `code` only if wanted, for a covered subject. An unoffered "research first" takes its question and sources from the operator's words. |
| Step 5, **With `from=P<N>`** (L409–413) | "The coverage still runs over the subject's paths, so a covered subject keeps the phases that built its code on `phases:` beside it, and a book of it stays kind `codebase`" |
| Step 6, new "Then check **what the records lack**" (L460) | one Grep over the covering phases' `intent.md`, `phase.md` and `topics/`, outside the 10 reads. A request that asks for research is offered it whatever this finds. |
| Step 7, **When no phase covers the subject** (L506, opening kept) | the closing paragraph now covers all three triggers. A new third template (L527) is for a covered subject, with "yes" kept. |
| Step 8 (L631, L634) | "Anything but a literal yes, a changed line, a picked shape or a "research first" (below) creates nothing". **On "research first"**, whatever the coverage: research asked for in the operator's own words counts the same, and a confirmation that offered none fills the block now. |

**Nothing else changed:** the research block's six fields and their order, the chain, **When it passes**, the readiness test (`**sources**`), the headings, Part B (so the critic agent is unchanged) and the book-kind rule (§1 already says `codebase` "even when it leans on outside basics a research phase recorded").

## Acceptance matrix

Each case is traced through the new texts in this order: the front door (skill), then create-phase step 2 (patch 1c as applied), then the research route, then **When it passes**, then the redraw. "Skill" means `plugin/skills/explain/SKILL.md`, "ER" the package's `explain-route.md`, and "RR" its `research-route.md`. The applied step-2 text was read back from the patched scratch copy.

| # | Case | Result | Evidence (governing sentences, in route order) |
|---|---|---|---|
| 1 | Code no phase covers, no outside basics | pass | **Front door.** Skill L272: "**None covers it** — the code is there, but no phase built or recorded it … offers to **create a research phase first**. For code no phase covers, the operator may instead say `yes` to explain from the code alone". L311: `sources:` is "`code` when the subject has paths no phase covers". Step 7's first template: "reads <its sources: the code[, the web]> … or "yes" to explain from the code alone". **create-phase step 2:** "no phase covers the subject yet, whether it is this repository's code …" → *The research route*. **RR L3:** "when no phase covers its subject (code no phase built or recorded …)". **When it passes:** RR L87, `/knowledge:explain <subject> from=<P>`. **Redraw:** step 5, "that phase is covering, whatever the Grep finds". |
| 2 | Code no phase covers, and the reader needs outside basics | pass | As case 1, with `sources:` `web` added. L312: "`web` when the reader needs outside basics the code and the records do not state". The template's `[, the web]` covers it, and step 2 and RR accept the block unchanged. |
| 3 | A no-code subject with no research phase | pass | **Front door.** MODE L153: "With none, the confirmation offers only **"research first"**". Step 7 L520: "For a subject with no code behind it, there is no "yes from the code alone"", with sources "the web, your own material". **ER:** "A subject with no code behind it and no research phase has no code to explain from, so "research first" is its only way on". **create-phase step 2:** "or a subject with no code behind it". **RR L3:** "a subject with no code behind it". |
| 4 | A no-code subject a research phase covers (by coverage or `from=P<N>`) | pass | **Front door.** MODE L151: "With one (named by `from=P<N>`, or found by COVERAGE), the front door goes on as for any other". **ER** *A confirmed proposal*: "the subject … covered by a research phase on `phases:`". It can still offer "research first" beside `yes` only if step 6 finds a section its records do not carry, which is case 5's rule. "Goes on" stays available. |
| 5 | **Code phases cover, but the reader needs outside basics no covering record states** (P58-pm → P59-d8) | pass | **The offer.** Step 6 L460: "Then check **what the records lack** … What none of them states (a field's terms, a formula, outside basics the reader is new to) is what step 7's closing paragraph names". COVERAGE L278 is that case. Step 7 L506: "when the covering phases' records lack what the reader needs (step 6) … the `Built by:` line … names the phases that do". Template L527: "<The covering phases> built <the subject>, but their records do not state <what …>" … "Reply "research first" … reads <its sources: the web[, the code]> … or "yes" to explain from the records as they are". **The hand-off.** Step 8 L634: "**On "research first"**, whatever the coverage". **create-phase step 2** (applied): "or phases cover it but none of their records states what the reader needs, such as a field's terms or a formula … A covered subject's block is accepted like any other: `paths:` names its code, `sources:` the web". **RR L3:** "when phases cover it, but a drafted section or a must-cover item rests on something none of their records states". RR **sources**: "A covered subject's block is accepted like any other". **The chain.** RR **When it passes**: "with `P<N>` on `phases:` beside any phase that covers the code". **The redraw.** Step 5 L411: "The coverage still runs over the subject's paths, so a covered subject keeps the phases that built its code on `phases:` beside it, and a book of it stays kind `codebase`". §1 L193: the kind is "`codebase` when the subject is this repository's code, even when it leans on outside basics a research phase recorded". Skill **A redrawn confirmation**: "`Built by:` … names the research phase and what it found, beside any phase that built the code". ER *A confirmed proposal* checks "that research phase among its `phases:`". §9.2 L2062: "(a research phase that recorded outside basics included)". |
| 6 | **A covered subject, and the operator replies "research first"** (or asks for research in their own words) | pass | **Front door.** Step 8 L631: "Anything but a literal yes, a changed line, a picked shape or a "research first" (below) creates nothing". L634: "**On "research first"**, whatever the coverage: offered or not, and research asked for in the operator's own words … counts the same; it is never a reply that creates nothing … A confirmation that offered no research has no block yet: fill it now by COVERAGE's rules". COVERAGE L287: "It is **always honoured**". **create-phase step 2:** "and honoured whenever the operator asks for it, whatever the coverage". **RR L3:** "An operator's "research first", or research asked for in their own words, is honoured whatever the coverage, offered or not". RR step 2 creates and runs the phase. |
| 7 | Cases 5–6 through the explain route's own confirmation (a direct "make an explain phase for X") | pass | **ER step 1:** a direct request "is drafted here the way the front door drafts it … *The front door, step by step*, steps 4–6", which includes step 6's lack check. **ER L32:** "**When the records lack what the reader needs,** the confirmation says so and offers "research first" … in three cases: no phase covers the subject; phases cover it, but … (§1 …, *Covered, but the records lack what the reader needs*) …; or the request itself asks for research". **ER** *A "research first" reply*: "the front door's, or this route's own confirmation's … honoured **whatever the coverage**, offered or not … When this route drew the confirmation itself and it offered no research, fill the block first". From there it follows case 5's chain and redraw. |
| 8 | A v2 of a covered subject that asks for outside material | pass | COVERAGE L285: "A v2 that asks for outside material is this case too; its research phase is then one of the phases since (§3.4 *A v2*)". The offer, hand-off and chain are case 5's. On the redraw, step 5's prior lookup still fills `prior:`. §3.4 *A v2* step 2 (L1122) reads "the brief's covering phases the prior did not read", which is the research phase. |
| 9 | The research route and create-phase step 2 accept a block for a covered subject (`paths:` its code; `sources:` web, and code if wanted) | pass | **create-phase step 2** (applied at L35 of the patched copy): "A covered subject's block is accepted like any other: `paths:` names its code, `sources:` the web, and the code too if wanted". **RR** **paths**: "A subject that phases already cover still names its code here". RR **sources**: "A covered subject's block is accepted like any other: its `sources:` is usually `web` …, plus `code` when the operator wants its code read again". Nothing in RR's steps or `DECOMP` cut gates on coverage. |
| 10 | Every prose description of the trigger agrees | pass | All 15 files below were grepped for `no phase covers`, `no phase recorded`, `none covers`, `covers only this` and `nothing your workspace recorded`. Each hit is one of: the new rule listing the uncovered case beside the covered one; the `Built by:` template's uncovered alternatives; **None covers it** (the uncovered case, kept); or the `fdb1151` **Find** texts and *Why* lines that quote the old wording in order to replace it. None says "a subject no phase covers" as the only case. Files: skill (+2 copies), plugin README, root README, setup SKILL.md, KB template, plugin.json, marketplace.json, ER, RR, patches/create-phase.md, patches/release.md (§2 README.en.md block, §3 seed operations doc, §5 changelog fragment), package README. A `git grep` over the rest of the repo, outside `works/phases`, finds no other description. |
| 11 | The readiness test, the `**sources**` marker, the 44 headings and the citation checks stay green | pass | Step 2's readiness test is unchanged. RR keeps `- **sources**:`, which the patched suite pins, so the apply.py explain block passes. There are 44 headings, identical text. `cites.py` reports missing 0, both on the package and on the patched payload. finds: 33/33. Whole patched suite: 504 PASS, 0 FAIL. |

## The two minor review items

- **explain-route.md, under unit:** "The literal `unit` line is what the plugin's front door tests for" was stale (0.11.0 tests `**sources**`). It now reads: "The literal `unit` line is what *A confirmed proposal* (below) tells a current proposal by, what `DECOMP` reads the unit from, and what the plugin's front door reads to find a live explain phase on the same subject (its step 4), so it is always written (the front door's readiness test is another line, *The research route*'s `**sources**` field)". The suite's pin "The literal `unit` line" is kept, and the apply.py explain block passes.
- **PATCHES.md:** "Two files are edited by two patch files" was wrong. `finds.py` lists `tests/retrofit_smoke.sh` under engine.md (3 finds) and release.md (4 finds), and `slice-executor.md` under workflow.md only (2 finds). It now reads: "One file is edited by two patch files … `tests/retrofit_smoke.sh` … Every other file is edited by one patch file only, among them `payload/claude/agents/slice-executor.md` (`patches/workflow.md`, two finds)."

## F2's hand-off

`plugin/README.md` *Explain: permissions* now lists `"Bash(git -C <BOOK> show HEAD:./*)"` for a book's chapter, matching §3.2's block ("A book's chapter also needs …, the critic's read of earlier chapters"). It adds that `<BOOK>` is the book's folder exactly as the critic's `draft:` path writes it.

## The landing count

`wc -l plugin/skills/explain/SKILL.md` = **2,722** (2,674 after F2; F1 added 48 lines). `content.ts` L251 ("It's a 2,722-line skill") and L261 ("2,722 lines · yaml + markdown") now carry it. Only the number changed: the lede's "cite every line to the code" is OQ2's, for the operator.

## Notebook

- **Decisions** (appended): "**Research-first trigger (F1):**" gist line → this file.
- **Doc impact** (appended): "product.md, decisions.md (P40-2t.F1): "research first" is offered whenever the records lack what the reader needs (a subject no phase covers, code or not, or a covered subject whose reader needs outside basics no record states), and an operator's "research first", or research asked for in their own words, is always honoured, whatever the coverage; the earlier "only when no phase covers it" wording is superseded."
- **Notes for later slices:** removed F2's note for F1 (consumed). The review's note for F1, F2 and REVIEW is cut to its REVIEW half.
- **Now:** replaced.

## For the review (round 2)

- `docs/current/qa.md`'s front-door lines still name the old count. The walkthrough's "check the count" is now **2,722**.
- The scratch copy used here is `/private/tmp/claude-502/-Users-sugang-projects-personal-knowledge/2d64ceca-9a02-4312-a9cd-5ec758f37364/scratchpad/f1/copy` (fdb1151 plus the package, rebuilt). Nothing was written in the bootstrap repo, Note or arb_upbit_1.
