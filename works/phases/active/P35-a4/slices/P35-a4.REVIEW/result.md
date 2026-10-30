# P35-a4.REVIEW — result (round 1)

- status: done
- route: high
- model: opus
- effort: xhigh
- summary: Every slice's validation passes when run together: parity, headings, Part B markers, the 186-citation check, nothing changed under `.claude/` or `docs/`, the landing count equals `wc -l`, and `validate` passes. The phase lands the rules, the titles and the reversed link rule. One class falls short of the intent's "so that this holds for every document and chapter": the critic holds a draft to §4's two new rules only partly. The sentence-level cases are declinable should-fixes, so the critic check passed the old P32 draft with 0 must-fix. A book chapter that relies on an earlier chapter without a recap is not a finding at all. A title is never checked.
- review_verdict: changes_requested
  - Finding 1, one class: the critic does not hold a document to §4 *The subject, not the records*, §4 *Standalone* and §1's title rule. Failing cases 1–7, passing cases 8–13 (below). One fix slice is proposed: P35-a4.F1, kind `fix`, risk `high` (it repairs S1, `route: mid`, and reverses DECOMP's *Critic severity* decision).
  - Note N1, non-blocking: six local clauses restate the subject rule with no `§4` pointer. F1 may take it, since it edits the same file.
- validation:
  - `python3 scripts/skills_parity.py`: PASS
  - `python3 scripts/plugin_parity.py`: PASS
  - heading diff against `cc53183d`: empty (rc 0)
  - Part B marker diff against `cc53183d`: empty (rc 0)
  - P33-n3 citation check (`topics/citations.md`, from the repo root): `citations checked=186 missing=0` (rc 0)
  - `git diff --stat db9861e..HEAD -- .claude/ docs/`: empty
  - landing count: `wc -l web/public/SKILL.md` = 2771, and `content.ts` L251 and L261 both read 2,771; the canonical file is also 2771, and `cmp` with the web copy is identical
  - `python3 scripts/workflow.py validate`: passed (pre-existing warnings only, none for P35-a4)
- deviations: none from `plan.md`. The verdict is `changes_requested`, so the pass-only doc duties did not run: no Doc impact append and no qa checklist version.
- doc_impact_added: none. The list is complete for the phase's changes so far (below). Appending was not run, since it is pass-only.
- doc_versions: none — deferred to a docs phase
- walkthrough: none (gate waived, `acceptance.required: false`)
- explain: not written — run /knowledge:explain P35-a4 for a document, or ask it for a book
- team-rules check: skipped (an at-root install; `nested-repos` refuses: "not a nested personal install")
- operator questions: none (the section holds only its header). Nothing to route.
- deferred-job candidates: O1, an addition to the workflow-repo phase, not a job of its own. O2: no job recommended.

## The boundary

`phase-scope P35-a4`: base `db9861e`, head `364461e`, 4 commits, 11 product files, all modified:
`.agents/skills/explain/SKILL.md`, `plugin/.claude-plugin/plugin.json`, the five
`plugin/agents/*.md`, `plugin/skills/explain/SKILL.md`, `plugin/skills/setup/SKILL.md`,
`web/public/SKILL.md` and `web/src/content/marketing/content.ts`. These are what was judged.
Anything else is listed under *Observations*.

## 1. Validation, all slices together

```
$ python3 scripts/skills_parity.py
PASS — explain skill copies are in body parity (web copy byte-identical); the 5 plugin agents match Part B.
$ python3 scripts/plugin_parity.py
PASS — plugin templates are in parity with the repo.
$ diff <(git show cc53183d:plugin/skills/explain/SKILL.md | grep '^#') <(grep '^#' plugin/skills/explain/SKILL.md)
(empty, rc=0)
$ diff <(git show cc53183d:plugin/skills/explain/SKILL.md | grep -E '^<!-- part-b:(begin|end)') <(grep -E '^<!-- part-b:(begin|end)' plugin/skills/explain/SKILL.md)
(empty, rc=0)
$ python3 - <<'EOF'   # P33-n3 topics/citations.md L64–85, verbatim, from the repo root
citations checked=186 missing=0        (rc=0)
$ git diff --stat db9861e..HEAD -- .claude/ docs/
(empty)
$ wc -l web/public/SKILL.md plugin/skills/explain/SKILL.md .agents/skills/explain/SKILL.md
    2771 web/public/SKILL.md
    2771 plugin/skills/explain/SKILL.md
    2769 .agents/skills/explain/SKILL.md      (its own frontmatter; body parity is checked above)
$ grep -n '2,7[0-9][0-9]' web/src/content/marketing/content.ts
251:  lede: "Saving isn't a form. It's a 2,771-line skill: …
261:    meta: "2,771 lines · yaml + markdown",
$ cmp web/public/SKILL.md plugin/skills/explain/SKILL.md   → identical
$ python3 scripts/workflow.py validate
Workflow validation passed.  (warnings: unknown kinds on P22/P26 slices, consolidation_owed, stale_docs,
oversized_doc_sections; all pre-existing, none for P35-a4, no dangling pointer)
```

S2's release is checked too. `plugin.json` and setup's `plugin_version` are 0.8.0 at L341 and L355. The 0.8.0
commits are not pushed (`main` is 4 ahead of `origin/main`), and the installed cache tops out at
0.7.0, so a fix can still ship inside 0.8.0 without another version bump.

## 2. The rules against the intent (fresh eyes)

| Intent part | Delivered? | Where |
|---|---|---|
| The subject, not the records: structure | yes | §4 *The subject, not the records* (L965–974), written in full. It is applied in §3.1, §3.4 steps 3 and 5, §3.9, §3.10, §4.2, §9.2. The critic makes a slice-organised document a `reader` must-fix (L2094–2095). |
| The subject: ids at most a small mark, deferred ids never | **rule yes, enforcement no** | §4 says "no sentence takes a record or an id as its subject … a deferred job's id never appears". B5 makes each of these a **should-fix** (L2095–2098), which §4.10 step 2 lets the writer decline (L1320–1321). Finding 1, cases 1–4. |
| Standalone: links, files, sources | yes for links, **partly** for "see X" | §4 *Standalone* (L975–981) is in full. §4.1's links bullet points to it. Leaning on a link where the reader needs the idea is a must-fix (Order, L2087–2088). A "lone 'see X'" is a should-fix in *The reader* (L2098), so the same sentence gets two severities. Finding 1, case 5. |
| Standalone: book chapters recap rather than "see chapter 2" | **no, for the silent case** | Order still walks "as the outline's stated reader who has read only the earlier chapters". It accepts "an idea … an earlier one introduces" (L2085–2087), and so does the must-fix list ("here or in an earlier chapter", L2119). A chapter that relies on chapter 2 with no recap and no link passes. Finding 1, case 6. |
| Titles say what the text explains; keys and slugs stay; nothing published changes | rule yes, **check no** | §1 *The title rule* (L192–199), front-door step 6, §5 `title` (L1341). A chapter or book title is in the confirmation the operator reads. A loose document's title (the default unit) is chosen at §5 after the confirmation, and no check sees it: the critic's dispatch carries no title, and B5 never judges one. Finding 1, case 7. |
| The critic's old link-over-recap rule reversed everywhere | yes, in the plugin | The Order paragraph and the should-fix list are rewritten, and `explain-critic.md` is regenerated. The workspace copies are out of scope (the workflow-repo phase), and O1 adds a missed place there. |
| Each rule written once in full, pointers elsewhere; no contradiction left | **mostly** | The full forms are in §4 (×2), §1 and B7. The left-over contradictions are case 6 (Order's premise) and case 4's wording conflict: §4 says "no sentence takes a record … as its subject", while B7's allowed form is "the notes from the change that introduced it report X". Six local clauses lack a pointer (N1). |
| Headings and `§` numbers unchanged | yes | The heading and Part B diffs are empty, and the citation check finds 0 missing. |

## 3. The critic check (orchestrator's span, `topics/critic-check.md`)

The critic ran on Sonnet with the new brief and was scoped to reader, order, clarity and rules. It returned `pass`: 0 must-fix, 13 should-fix, 4 notes. It read §4's prose rules,
which shows that S1's change to *Inputs* item 7 works.

- **L156** ("The P24.S1 result adds that …", the near-verbatim "Not" example in §4): caught by
  **C04** (an id or record as the sentence subject), and by **C05** for "The publish module's docstring gives the reasons".
- **L173** ("… and the P24.S1 result, say …", "`architecture.md` says …", "no source states a
  bound"): caught by **C04** (the P24.S1 result) and **C05** (the architecture.md dispute, and the research process leaking into the chapter). C09 also places its hazard at the wrong step.
- **L177** ("commit `207f2ff` already checked …, and P31.S1 moved that code verbatim"): caught
  by **C04**. C05's evidence also names L177's "Nothing in the code or the notes", although L177 is not in its
  `where:` line. C07 (151 words) and C09 also apply.

All three are caught, **but every catch is a should-fix, and the verdict is `pass`.** §4.10
step 2 tells the writer: "Fix every must-fix or remove its sentence, and the should-fixes you
agree with", and `declined · <why>` is a valid answer. So the writer could decline C04 and
C05 and publish L156 as it stands, and that sentence is the one §4 prints as the example of
what not to write. The intent asks that ids "appear at most as a small, unobtrusive mark …
never the topic", with the rules refined "so that this holds for every document and chapter".
The operator's own words were "I don't care about the phase numbers and defer numbers … I don't
asking for what s3 does". A rule the writer may decline does not make that hold, so it is
Finding 1. The structural half (a document organised by slices) and the half about leaning on
a link are must-fixes and do hold.

## Finding 1: the critic does not hold a document to the subject, standalone and title rules

**The rule that failed.** The intent says the critic checks these rules "so that this holds
for every document and chapter". The critic (B5) and the writer's answer (§4.10 step 2) are the
only checks between the draft and publishing. §4.8 and `knowledge check` cover the hard rules only.

**Failing cases** (each with what decides it today):

1. A phase or slice id as a sentence's subject (L156 "The P24.S1 result adds that …"): a
   should-fix (B5 *The reader*, L2096), declinable, so the critic check returned `pass`.
2. An id in a `##`/`###` heading (§4: "never in a heading"): a should-fix, declinable.
3. A deferred job's id anywhere (§4: "never appears"): a should-fix, declinable.
4. A work record named where plain words would do ("The cause the decomposition recorded", "A P24
   review note records", L29 and L182): a should-fix, declinable. A wording conflict sits beside it: §4 says "no sentence
   takes a record or an id as its subject", while B7's allowed attribution (L2312–2314), "the
   notes from the change that introduced it report X", makes a record the subject. Once the
   severity rises, a strict critic would flag a B7-compliant sentence.
5. A lone "see X", or a file or doc named in place of saying what it says (§4 *Standalone*: never "see
   `X` §4"): a should-fix in *The reader* (L2098), but a `reader` must-fix in *Order* ("leaning on
   a link … where the reader needs the idea", L2087–2088). One sentence, two severities.
6. A book chapter that uses an idea only an earlier chapter teaches, with no recap and no link: not
   a finding. Order walks "as the outline's stated reader who has read only the earlier
   chapters" and accepts "an earlier one introduces it" (L2085–2087). The must-fix list says
   "an idea used before it is introduced, here or in an earlier chapter" (L2119–2120). *The
   reader*'s must-fix names "a link, a file or a source" but not another chapter or document, which §4
   *Standalone* names. So the silent dependency, which is worse than "see chapter 2", passes.
7. A new book's, chapter's or loose document's title that names the work ("P30: <phase name>"):
   no check reads it. A loose document's title is chosen at §5 after the confirmation. The
   critic's dispatch (§4.10 L1307–1310, B5 L1960–1964) carries no title, and B5 has no
   title rule.

**Passing cases checked** (these must survive the fix):

8. A document or chapter organised by slices or work records: a `reader` must-fix (L2094–2095).
9. A reader who cannot follow without opening a link, a file or a source: a must-fix (L2095).
10. Leaning on a `chapter:` or `doc:` link, a source or a file where the reader needs the idea: a must-fix
    (L2087–2088).
11. Long re-teaching where a short recap would do: a should-fix (L2089, L2124).
12. A short recap, and an id used only as the trailing mark: never a finding (L2143–2144).
13. Who-said-what about a source whose content the sentence does state (§4 *Teach, don't
    report*): a should-fix, unchanged.

### Proposed fix slice: P35-a4.F1

- **Name:** Hold every explain document to the subject, standalone and title rules.
- **Kind / risk:** `fix` / `high`. It repairs S1's work (`route: mid`), and it replaces the
  `## Decisions` line *Critic severity (DECOMP)* with the new severities (`--entry K --replace`).
- **The simplest rule that closes the class:** every departure from §4 *The subject, not the
  records* and §4 *Standalone*, and a title that names the work, is a `reader` must-fix. The
  trailing mark, B7's plain-words attribution and a short recap never count. A must-fix costs
  one rewording in the single revision and needs no new evidence, so it never stops a writer who
  is willing to fix it. It only removes the option to decline. If the orchestrator would rather
  keep should-fix, it is the operator's call, because that reads against "holds for every document". The
  alternative is to keep the severities and exempt these findings from "the should-fixes you agree with"
  in §4.10 step 2, but then the critic returns `pass` with a finding open that the writer must fix, which is less clean.
- **Files (the rule's family):** `plugin/skills/explain/SKILL.md`, in these places:
  - B5 *Order and prerequisites*;
  - B5 *The reader*;
  - the rubric's must-fix and should-fix lists, and *What never counts*;
  - B5's dispatch block, and §4.10 step 1's dispatch block (a `title:` line);
  - B5 *Inputs* item 6, if Order's premise changes;
  - §4 *The subject, not the records*, its "as its subject" wording reconciled with B7.

  Then:
  - regenerate the copies with `python3 scripts/skills_parity.py --write-agents`: `.agents/skills/explain/SKILL.md`, `web/public/SKILL.md` and `plugin/agents/explain-critic.md`, plus the other four agents only if B7 or B8 change;
  - set both counts in `web/src/content/marketing/content.ts` to the new `wc -l web/public/SKILL.md`.

  The version stays 0.8.0, since it is unpushed. Headings, `§` numbers and Part B markers stay byte for byte. N1 can be picked up here.
- **Acceptance matrix:** cases 1–7 each become a finding at the stated severity (1–6
  must-fix; 7 must-fix for a new title, never for an existing chapter's kept title). Case 4's B7
  form is not a finding. Cases 8–13 are unchanged.
- **Validation:** both parity checks, the heading and Part B diffs (empty), the citation check
  (`missing=0`), an empty `git diff -- .claude/ docs/`, the landing count equal to `wc -l`, and `validate`. Also a
  case-by-case read of the matrix against the new text, quoting the deciding line for each case. Recommended:
  the orchestrator re-runs the same critic span over the P32 `c-new` draft, and C04's class should
  come back must-fix with verdict `revise`.
- **spends money:** no.
- **Doc impact:** a product.md line (the critic holds the subject, standalone and title rules as
  must-fixes; a chapter recaps what it uses from an earlier chapter).

### Note N1 (non-blocking)

The Decisions line *Where S1's rules live* says every other place "points at" the full rules.
Four places do: front-door step 6, §3.1, §4.1 and §5. Six restate a short clause with no pointer: §3.4 step 3
(L683), §3.4 step 5 (L715), §3.9 (L882), §3.10 (L899), §4.2 Background and Code (L1035, L1043)
and §9.2 step 2 (L1559). None of them contradicts the rule. Adding `(§4, *The subject, not the records*)`
would make a later wording change a one-place edit.

## 4. Doc impact, gate sections, questions

- **Doc impact** is complete for what the phase changed. It has the product.md writing rules (S1), the qa
  checklist line that expects `"P<N>: <phase name>"` (S1) and the product.md 0.8.0 release with
  the landing count (S2). `docs/current/` names no 2,729 and no 0.7.0, and no `decisions.md`
  entry records the old link or title rules. No smoke-suite count changed. Nothing was appended.
- **The qa `## Regression Checklist` line** (P33-n3's *Explain front door, a book*,
  `docs/current/qa.md` L358–362) stays as its Doc impact note. First, this round is `changes_requested`, which skips the pass-only doc writes. Second, the skill defines the review's qa write as the gate's stage-4 append, and gate stages run only when `acceptance.required` is `true`. This phase's gate is waived, so on the re-review's pass the line still goes to the docs phase through that note.
- **Gate:** waived (`required: false`). There are no stages and no walkthrough.
- **Operator Questions:** empty, so nothing to route.
- **Notebook against the logs:** DECOMP's three decisions (*Breakdown*, *Titles*, *Critic
  severity*) and S1's (*Where S1's rules live*) are in `## Decisions` with their topic present. S2's
  release facts are in `## Now` and Doc impact. No decision was dropped, and `validate` shows no
  dangling pointer.
- **Team-rules check:** an at-root install, so it is skipped.

## Observations outside the boundary (deferred-job candidates)

- **O1:** an addition to the workflow-repo phase, not a job of its own. Title: *also align explain-review's
  chapter order check*. Reason: `.claude/skills/do-whole-phase/reference/explain-review.md` L104
  and its `do-next-slice` copy still say the earlier chapters' bodies "define every term it uses
  without defining it" and that a term "taught twice" is a finding. That is the old sequential premise,
  and the DECOMP note lists only L24 of that file. Trigger: when the orchestrator creates the workflow-repo phase.
- **O2:** no job. `plugin/templates/kb/server/books.py` L23 (a docstring example) and
  `plugin/templates/kb/tests/test_books.py` use "P8: The reader" titles. They are API fixtures, not
  writing rules.

## Notebook (written through phase-section)

- `## Notes for later slices`: removed the consumed `(from DECOMP, for REVIEW)` note. Added
  `(from REVIEW, for F1)` and `(from REVIEW, for the workflow-repo phase)` (O1).
- `## Now`: replaced (round 1 is `changes_requested`, F1 is proposed).
