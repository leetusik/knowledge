# P35-a4.REVIEW — plan

slice: P35-a4.REVIEW · kind: review · phase: Explain documents: about the subject, standalone

Review the phase against what the operator asked for. Follow the `review-phase` skill (`.claude/skills/review-phase/SKILL.md`) for the procedure, the verdict and the findings format.

## Read first

- `works/phases/active/P35-a4/intent.md`: the operator's words, the confirmed intent and every clarification. This includes the two decisions made at the run:
  - the plugin changes only, here;
  - the workflow repo's copies are a later phase, which leaves pointers only, so that from then on a writing-rule change is made in this repo alone.
- `topics/breakdown.md`: the pins and the REVIEW block.
- The notebook through `phase-section` only: `Now`, `Decisions`, `Doc impact`, `Operator Questions`.
- Each slice's `result.md` head: `P35-a4.DECOMP`, `P35-a4.S1`, `P35-a4.S2`.

## The boundary

`python3 scripts/workflow.py phase-scope P35-a4` gives the range `db9861e..364461e` and 11 product files:
- `plugin/skills/explain/SKILL.md`, `.agents/skills/explain/SKILL.md`, `web/public/SKILL.md`;
- the five `plugin/agents/*.md`;
- `plugin/.claude-plugin/plugin.json`, `plugin/skills/setup/SKILL.md`;
- `web/src/content/marketing/content.ts`.

Review those, and nothing outside them. Anything outside is an observation, reported as a deferred-job candidate, never a finding.

## 1. Validate all slices together

Paste each output in `result.md`:
- `python3 scripts/skills_parity.py` and `python3 scripts/plugin_parity.py`: PASS.
- Heading diff: `diff <(git show cc53183d:plugin/skills/explain/SKILL.md | grep '^#') <(grep '^#' plugin/skills/explain/SKILL.md)`: empty.
- Part B marker diff: `diff <(git show cc53183d:plugin/skills/explain/SKILL.md | grep -E '^<!-- part-b:(begin|end)') <(grep -E '^<!-- part-b:(begin|end)' plugin/skills/explain/SKILL.md)`: empty.
- P33-n3's citation check (`works/phases/active/P33-n3/topics/citations.md` L64–85, from the repo root): `missing=0`.
- `git diff --stat db9861e..HEAD -- .claude/ docs/`: empty.
- The landing count: `wc -l web/public/SKILL.md` equals both counts in `content.ts`.
- `python3 scripts/workflow.py validate`.

## 2. Judge the rules against the intent (fresh eyes)

Read the phase's change with `git diff db9861e..HEAD -- plugin/skills/explain/SKILL.md`, then the five agent bodies' diffs. For each part of the intent, say whether the text, as a writer and a critic would follow it, delivers it:
- **The subject, not the records.** A phase or slice subject teaches what the system does. Ids appear at most as a small trailing mark, and deferred ids never. Sections follow ideas, not slices.
- **Standalone.** No sentence depends on opening a link, a source, a file or another document. A link is an extra. Book chapters recap rather than "see chapter 2".
- **Titles.** They say what the text explains. Keys and slugs stay, and nothing published changes.
- **The critic enforces all three**, and its old link-over-recap rule is reversed everywhere it appeared.
- **Each rule is written once in full**, with pointers elsewhere. No contradiction is left between a new rule and an old sentence anywhere in the canonical file: search for them.
- **Headings and `§` numbers are unchanged**, so the workflow repo's later phase can point at them.

## 3. The critic check, already run

The orchestrator ran the critic span (Sonnet, with the repo's new `plugin/agents/explain-critic.md` brief) over the old draft `works/phases/active/P32/rehearsal/r1/dossiers/c-new/body.md`. It was scoped to `reader`, `order`, `clarity` and `rules`, with no web sources re-opened, because that dossier's `tools:` folder is gone.
- **Its critique:** `works/phases/active/P35-a4/topics/critic-check.md`.
- **Its return:** `verdict: pass` with 0 must-fix, 13 should-fix and 4 notes. C04 covers ids and records as sentence subjects, L156 among them. C05 covers who-said-what ("the docs say").

Read the critique, and:
- Confirm whether the L156, L173 and L177 passages are each caught, and by which finding.
- **Judge whether the phase delivers the intent end to end.** Here is how a writer handles a critique, in `plugin/skills/explain/SKILL.md` §4.10 step 2: "Fix every must-fix or remove its sentence, and the should-fixes you agree with." Read that rule together with the severities the rubric now gives the intent's rules. Then decide, against the operator's own words in `intent.md`, whether a published document is held to those rules or a writer may decline them. If the text falls short, that is a finding with a proposed fix slice.

## 4. Doc impact, gate sections, questions

- **Doc impact:** verify that `## Doc impact` is complete for the phase's changes. Append any missing line yourself (`doc_impact_added:`). Return `doc_versions: none — deferred to a docs phase`.
- **The qa `## Regression Checklist` line** from P33-n3, *Explain front door, a book*, expects a `"P<N>: <phase name>"` title, which this phase changes. Fix it in the gate section the review may version, if the `review-phase` skill lets a review with a waived gate do so. Otherwise leave it as the Doc impact note it already is, and say which.
- **The acceptance gate is waived**, so there are no gate stages and no walkthrough.
- **`## Operator Questions`** is empty. Confirm it.
- **Team-rules check:** the workflow runs at the repo root, so this is not a nested install and the check is skipped. Say so.

## Return

`review_verdict: pass | changes_requested | blocked`, with:
- numbered findings and, for each problem class, a proposed fix slice: kind `fix`, and a risk of `high` when the defect is in mid-row work (S1 and S2 were mid);
- deferred-job candidates for anything outside the boundary;
- `doc_versions`;
- the fixed `explain: not written — run /knowledge:explain P35-a4 for a document, or ask it for a book` line.

Never commit or move workflow state, and never edit product source.

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
