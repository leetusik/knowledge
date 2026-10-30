# P35-a4.REVIEW — plan (round 2)

slice: P35-a4.REVIEW · kind: review · round: 2 (bounded) · phase: Explain documents: about the subject, standalone

Round 1 (`result.md` as it stands, verdict `changes_requested`) found one problem class, Finding 1: the critic let a writer decline the subject, standalone and title rules. Fix slice `P35-a4.F1` (`e143f03b`, high row) is done. Follow the `review-phase` skill's bounded re-review (*Findings, fix slices and re-review rounds*). Rewrite `result.md` for round 2, verdict block first, keeping a one-line pointer to round 1's finding.

## Read first

- `intent.md`;
- `slices/P35-a4.F1/plan.md` and `result.md`: the acceptance matrix, cases 1–13, with F1's quoted deciding lines;
- the notebook through `phase-section` only: `Now`, `Decisions`, `Doc impact`, `Operator Questions`, `Notes for later slices`.

## The bounded round

1. **F1 against its case list.** For each of cases 1–13, open the canonical `plugin/skills/explain/SKILL.md` at the line F1 quotes. Confirm that the text decides the case as the matrix says, and that no other sentence in the file contradicts it. Pay particular attention to these:
   - **Case 4's boundary:** B7's plain-words attribution ("the notes from the change that introduced it report X") must not be a finding, while "the P24 notes record" and "the decomposition recorded" must be. Can a critic tell the two apart from the text alone?
   - **Case 7:** F1 added the `title:` line, its optional `· kept` and `· book:` markers, the no-`title:` fallback, and "even one the spec gives". Check that these do not let a published title escape, and do not flag an existing chapter's kept title.
2. **F1's blast radius.** `git diff 364461e..e143f03b -- plugin/skills/explain/SKILL.md plugin/agents/explain-critic.md`. Check:
   - every changed sentence for a new contradiction with §4, §1 or B7;
   - the N1 pointers (`(§4, *The subject, not the records*)`) in §3.4, §3.9, §3.10, §4.2 and §9.2: each points rather than restates;
   - nothing outside the plan's set changed.
3. **The critic re-run (already done by the orchestrator).**
   - Span details: Sonnet, the current repo brief, the same scope as round 1 (`reader`, `order`, `clarity`, `rules`; no web sources), the same old draft `works/phases/active/P32/rehearsal/r1/dossiers/c-new/body.md`, with `title: POST /api/documents: the write path from validation to commit and push`.
   - Its critique: `works/phases/active/P35-a4/topics/critic-check-r2.md`.
   - Its return: `verdict: revise`, 5 must-fix, all `reader`:
     - C01 L29: "the decomposition recorded", "P24 began from…";
     - C02 L156: "The P24.S1 result adds that…";
     - C03 L166, L177, L220: "P31.S1 moved that code", "since P24";
     - C04 L171, L182, L177: "the P24 notes record", "A P24 review note records", "the notes";
     - C05 L173: "`architecture.md` says… and the P24.S1 result".
   - Also: 9 should-fix (C09 who-said-what among them), 2 notes; the title passed.

   Read the critique, and:
   - Confirm that L156, L173 and L177 are each now a must-fix.
   - Judge whether any must-fix over-catches a sentence the rules allow. In particular, decide whether C04's "the notes" is B7's allowed form or a record named as a workspace artifact, from the draft's actual sentence.
   - An over-catch is a finding only if the **text of the rule** causes it. A critic's one-off misreading is an observation.
4. **The validation suite, all slices together** (paste the outputs):
   - `python3 scripts/skills_parity.py` and `python3 scripts/plugin_parity.py`: PASS;
   - the heading diff and the Part B marker diff against `cc53183d` (commands in `slices/P35-a4.S1/plan.md`): empty;
   - P33-n3's citation check: `missing=0`;
   - `git diff --stat db9861e..HEAD -- .claude/ docs/`: empty;
   - the landing count: both counts in `content.ts` equal `wc -l web/public/SKILL.md` (2,793);
   - `python3 scripts/workflow.py validate`.
5. **Reuse round 1** for everything F1 did not touch: S2's release edits, and the S1 rules F1 left alone. Do not re-judge them.

## On a pass (the pass-only duties)

- **`## Doc impact`:** verify it is complete. It should hold S1's product and qa lines, S2's product line, and F1's product line, which supersedes S2's 2,771 count. Append any missing line yourself (`doc_impact_added:`). Return `doc_versions: none — deferred to a docs phase`.
- **The qa `## Regression Checklist` line** from P33-n3 (a book's title): it stays as its Doc impact note, as round 1 decided for a waived gate. Confirm it.
- **`## Operator Questions`:** confirm it is empty.
- **The gate is waived**, so there is no walkthrough.
- **Team-rules check:** skipped, because this is an at-root install.
- **Outside-the-boundary candidates:** carry round 1's O1 and F1's note about the workspace dispatch blocks needing `title:`. Both are already Notes for the workflow-repo phase, so list them, not as jobs.

## Return

`review_verdict: pass | changes_requested | blocked`, with:
- findings, if any, numbered and marked `repeat of round 1 finding 1` when the same class fails again;
- `doc_impact_added`, `doc_versions`;
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
