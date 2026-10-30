# P35-a4.F1 — plan

slice: P35-a4.F1 · kind: fix · risk: high · repairs P35-a4.S1 (route mid) · review round 1, Finding 1

## Why

The intent (`intent.md`) says the new rules hold "for every document and chapter". Round 1 found that the critic (B5) and the writer's answer rule (§4.10 step 2, "Fix every must-fix … and the should-fixes you agree with") still let a writer decline them:
- the subject and standalone breaches are should-fixes;
- a book chapter silently relying on an earlier chapter passes;
- no check reads a title.

The critic span over the old P32 draft proved it: every id-as-subject catch was a should-fix, and the verdict was `pass`. The full finding is in `slices/P35-a4.REVIEW/result.md` § *Finding 1* and § *Proposed fix slice*. Read both.

## The rule (pinned, the review's recommendation, taken)

- **Every departure from §4 *The subject, not the records* and §4 *Standalone* is a `reader` must-fix**, and so is a **new** title that names the work instead of what the text explains.
- **Never a finding:** the trailing mark ("(P30)"), B7's plain-words attribution, and a short recap.
- A must-fix costs the writer one rewording in the single revision and needs no new evidence. It removes only the option to decline.
- **Order:** a chapter that uses an idea from an earlier chapter must give a short recap of it, with a link optional as an extra. A silent dependency is a must-fix.
- **The critic receives the title:** a `title:` line in both dispatch blocks (B5's *Your dispatch* and §4.10 step 1). B5 judges it against §1's title rule. An existing chapter's kept title is never a finding.
- **Reconcile §4's wording with B7.** §4 currently says "no sentence takes a record or an id as its subject", while B7 allows "the notes from the change that introduced it report X". Reword §4 so that what is forbidden is an **id**, or a **record named as a workspace artifact** (a `result.md`, "the P24.S1 result", "the decomposition recorded"), as the subject or the structure. A plain-words reference to the change is allowed: it is B7's form. After the fix, a B7-compliant sentence must not be a finding.

## Edits (canonical file `plugin/skills/explain/SKILL.md`)

- **B5:**
  - *Order and prerequisites*;
  - *The reader*;
  - the rubric's must-fix and should-fix lists, and *What never counts*;
  - *Your dispatch* (`title:`);
  - *Inputs* item 6, if Order's premise changes;
  - add a sentence where the critic judges the title.

  Remove the double severity on a lone "see X" (case 5): it is one must-fix.
- **§4.10 step 1's dispatch block:** `title: <the title §5 will publish>`.
- **§4 *The subject, not the records*:** the B7 reconciliation above.
- **N1 (take it):** add the pointer `(§4, *The subject, not the records*)` to the six local clauses that restate the subject rule without one:
  - §3.4 step 3 and step 5;
  - §3.9;
  - §3.10;
  - §4.2 Background and Code;
  - §9.2 step 2.

  The round-1 result lists their lines. The pointer joins each clause or replaces it, never repeating the rule.
- **Afterwards:**
  - run `python3 scripts/skills_parity.py --write-agents`, which regenerates `.agents/skills/explain/SKILL.md`, `web/public/SKILL.md` and `plugin/agents/explain-critic.md`, plus the other four agents only if B7 or B8 change;
  - set both counts in `web/src/content/marketing/content.ts` (`lede`, `pane.meta`) to the new `wc -l web/public/SKILL.md`, formatted `2,7xx`.
- **The version stays 0.8.0**, since nothing is pushed.
- **Headings, `§` numbers and Part B marker lines stay byte for byte.**
- **Shorter wins:** rewrite the old severity sentences rather than adding caveats beside them.

Edit nothing else: nothing under `.claude/` or `docs/`, and write no test files.

## Acceptance matrix (prove each case in `result.md`, quoting the deciding line of the new text)

Failing today, each must become a finding at the stated severity:
1. A phase or slice id as a sentence's subject ("The P24.S1 result adds that …"): a `reader` must-fix.
2. An id in a `##`/`###` heading: must-fix.
3. A deferred job's id anywhere: must-fix.
4. A work record named as a workspace artifact where plain words would do ("The cause the decomposition recorded", "A P24 review note records"): must-fix. **B7's plain-words form ("the notes from the change that introduced it report X") is not a finding.**
5. A lone "see X", or a file or doc named in place of saying what it says: one severity, must-fix, in both *Order* and *The reader*.
6. A book chapter that uses an idea only an earlier chapter teaches, with no recap: must-fix. *The reader* also names "another chapter or document" beside link, file and source.
7. A new book's, chapter's or loose document's title that names the work ("P30: <phase name>"): must-fix. An existing chapter's kept title: never a finding.

Passing today, each must stay unchanged:

8. A document organised by slices or work records: `reader` must-fix.
9. A reader who cannot follow without opening a link, file or source: must-fix.
10. Leaning on a `chapter:` or `doc:` link, a source or a file where the reader needs the idea: must-fix.
11. Long re-teaching where a short recap would do: should-fix.
12. A short recap, and an id used only as the trailing mark: never a finding.
13. Who-said-what about a source whose content the sentence does state (§4 *Teach, don't report*): should-fix.

## Validation (paste the outputs)

- `python3 scripts/skills_parity.py` and `python3 scripts/plugin_parity.py`: PASS.
- Heading diff and Part B marker diff against `cc53183d`: both empty. The commands are in `slices/P35-a4.S1/plan.md`.
- P33-n3's citation check: `missing=0`.
- `git status --porcelain .claude/ docs/`: empty.
- Both landing counts equal `wc -l web/public/SKILL.md`.
- `python3 scripts/workflow.py validate`.

## Notebook (through `phase-section` only)

- **`## Decisions`:** replace the *Critic severity (DECOMP)* entry (`--entry K --replace`) with the new severities, noting "(F1, superseding DECOMP's)".
- **`## Doc impact`:** one line. Product: the critic holds the subject, standalone and title rules as must-fixes, and a chapter recaps what it uses from an earlier chapter.
- Remove the consumed `(from REVIEW, for F1)` note.
- Update `## Now` for review round 2.

## Return

`done`, with `files_changed`, the matrix proven case by case, the validation outputs and the new line count. Never commit or move workflow state.

## Dispatch

route=high
reason=risk high (not low)
subagent_type=slice-executor
model=opus
pass_model=yes
effort=xhigh
pass_effort=yes
attribution=Claude Opus 5.5
explore_model=haiku
explore_effort=xhigh
