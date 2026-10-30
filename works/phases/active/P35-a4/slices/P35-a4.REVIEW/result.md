# P35-a4.REVIEW — result (round 2)

- status: done
- route: high
- model: opus
- effort: xhigh
- summary: Round 2 (bounded) passes. F1 decides all 13 matrix cases as the matrix says, and no other sentence in the skill contradicts it. Its changes stay inside the plan's file set and add no contradiction with §4, §1 or B7. The critic re-run over the old P32 draft caught every id and workspace-artifact sentence as a `reader` must-fix (5, verdict `revise`), with no over-catch the rule text causes. Every slice's validation passes when run together.
- review_verdict: pass (round 2)
  - Round 1's Finding 1 (the critic let a writer decline the subject, standalone and title rules) is closed by P35-a4.F1. It does not repeat.
  - No new findings. There are two non-blocking notes (N2, N3) and three critic-run observations below. None of them needs a fix slice.
- validation:
  - `python3 scripts/skills_parity.py`: PASS (rc 0)
  - `python3 scripts/plugin_parity.py`: PASS (rc 0)
  - heading diff against `cc53183d`: empty (rc 0)
  - Part B marker diff against `cc53183d`: empty (rc 0)
  - P33-n3 citation check: `citations checked=186 missing=0` (rc 0)
  - `git diff --stat db9861e..HEAD -- .claude/ docs/`: empty. `git status --porcelain .claude/ docs/`: empty
  - landing count: `wc -l web/public/SKILL.md` is 2793, and `content.ts` reads 2,793 at both L251 and L261. The canonical file is also 2793, and `cmp` with the web copy is identical
  - `python3 scripts/workflow.py validate`: passed (only pre-existing warnings, none for P35-a4, no dangling pointer)
- deviations: none from `plan.md`.
- doc_impact_added: none. The list is complete with four lines: S1 product, S1 qa, S2 product, and F1 product, which supersedes S2's 2,771.
- doc_versions: none — deferred to a docs phase
- walkthrough: none (the gate is waived: `acceptance.required: false`)
- explain: not written — run /knowledge:explain P35-a4 for a document, or ask it for a book
- team-rules check: skipped (an at-root install)
- operator questions: none (the section holds only its header), so there is nothing to route.
- outside-the-boundary candidates (Notes for the workflow-repo phase, not jobs): O1 (round 1), F1's critic-dispatch `title:` note, and this round's sharpening of it.

Round 1 (`changes_requested`, Finding 1 with cases 1–13, Note N1) is in git at `e6c87131`
(this file's previous version). This round reuses it for everything F1 did not touch: S2's
release edits, and the S1 rules F1 left alone.

## The boundary

`phase-scope P35-a4`: base `db9861e`, head `e143f03b`, 6 commits, the same 11 product files as
round 1. F1 (`e143f03b`) touched five of them, all in its plan's set:
`plugin/skills/explain/SKILL.md`, `.agents/skills/explain/SKILL.md`, `web/public/SKILL.md`,
`plugin/agents/explain-critic.md` and `web/src/content/marketing/content.ts`. It changed nothing under
`.claude/` or `docs/`. Among the agents, only `explain-critic.md` changed, because B7 and B8 are untouched.

## 1. F1 against its case list

Each case was opened in the canonical `plugin/skills/explain/SKILL.md` at the deciding line
(line numbers are today's; F1's quotes are right, though its numbers sit 1–2 lines early
in places). The file was also grepped for every other sentence on the same matter: `should-fix`,
`trailing mark`, `earlier chapter`, `recap`, `prerequisite`, `chapter:` links, `title`,
`plain words`.

| # | Case | Decided by | Result |
|---|---|---|---|
| 1 | id as a sentence's subject → `reader` must-fix | B5 *The reader* L2111–2114 "every departure … a phase or slice id … anywhere but a sentence's trailing mark"; §4 L973 | holds |
| 2 | id in a heading → must-fix | L2113 "a phase or slice id in a heading"; §4 L976 "never in a heading". A title is not a heading (§4 L943, L1017: "the title is a field") | holds |
| 3 | deferred id anywhere → must-fix | L2114 "a deferred job's id". *What never counts* exempts only a **phase or slice** trailing mark (L2165), so "(D69)" has no escape | holds |
| 4 | record named as a workspace artifact → must-fix; B7's form → never | L2114–2115 "a record named as a workspace artifact as the subject of any clause"; §4 L973–975 gives both sides; *What never counts* L2165–2166; B7 L2334–2336 | holds (boundary below) |
| 5 | lone "see X", or a file or doc in place of what it says → one severity, must-fix | *Order* L2105–2106 and *The reader* L2115–2116, both must-fix. No `should-fix` for it remains anywhere (grep) | holds |
| 6 | an earlier chapter's idea with no recap → must-fix | *Order* L2101–2106 "reading it alone … needs a short recap here … relying on it silently … is a `reader` must-fix"; *The reader* L2110–2111 and L2117 "another chapter or document"; rubric L2140; *Inputs* 6 L2018–2021 | holds |
| 7 | a new title that names the work → must-fix; a kept title → never | L2117–2119 "a new title (`title:`, `book:` included) … even one the spec gives"; `title:` in §4.10 L1319 and B5 L1976; `kept` defined at L1321 and L1979; *What never counts* L2166 | holds (escape check below) |
| 8 | organised by slices or records → must-fix | L2113 | holds |
| 9 | cannot follow without opening a link, file or source → must-fix | L2116–2117 (widened to another chapter or document) | holds |
| 10 | leaning on a `chapter:`/`doc:` link, source or file → must-fix | L2105–2106 | holds |
| 11 | long re-teaching → should-fix | L2106–2107; rubric L2145 | holds |
| 12 | short recap; trailing-mark id → never | L2164–2165 | holds |
| 13 | who-said-what with the content stated → should-fix | L2120–2121; §4 *Teach, don't report* L964–968, unchanged | holds |

**Case 4's boundary: a critic can tell the forms apart from the text alone.** What decides it
is the wording "the change named in plain words is allowed" (§4 L974).

- **Allowed:** B7's form identifies the record **by the change, in plain words** ("the notes *from the change that introduced it* report X").
- **Forbidden:** "the P24 notes record" carries an id that is not a trailing mark, so it fails twice: as an id, and as an artifact.
- **Forbidden:** "the decomposition recorded" is one of §4's own examples (L974), naming a workflow step.
- **Protected:** B7's sentence has a record as its grammatical subject, but §4's own exception and *What never counts* (L2165–2166) protect it. A strict critic has no ground to flag it.

The critic run confirms this. It proposed B7-form rewrites ("the change that moved the work off the
request recorded the embed call as unbounded (P24)") and flagged none.

**Case 7: no published title escapes inside the plugin, and no kept title is flagged.**

- **The plugin's own run:** its dispatch (§4.10) always sends `title:`, with `· kept` for an existing chapter, which §1 keeps (L196–198). *What never counts* exempts it.
- **The phases book:** its title is never judged. A chapter goes to it only when the book exists (L165–173), and `book:` is sent only with a **new** book's chapter.
- **"Even one the spec gives":** this sentence overrides *What never counts*' "following its spec" for titles only. It closes the spec'd "P30: …" hole without loosening anything else.
- **The one remaining reach:** the workspace's dispatch blocks, which are outside the boundary. See N3.

## 2. F1's blast radius

`git diff 364461e..e143f03b -- plugin/skills/explain/SKILL.md plugin/agents/explain-critic.md`
was read hunk by hunk.

- **No new contradiction with §4, §1 or B7.**
  - §4's reworded subject sentence and B7's form now agree. Before, §4 forbade "a record" as a subject.
  - B5's "the subject of any clause" is stricter than §4's "no sentence takes … as its subject". It matches §4's own opening, "never the subject or the structure".
  - The `(P30)` trailing mark in a title (§1) is exempted by *What never counts* L2165, which applies to titles as well as sentences.
  - *Order*'s "used before the chapter introduces it" and its recap rule say the same thing. A recap is the chapter's introduction of the idea.
- **N1's pointers point and do not restate.** `(§4, *The subject, not the records*)` is joined onto the existing short clause at these places, with no rule wording repeated:
  - §3.4 step 3 (L683–684)
  - §3.4 step 5 (L717–718)
  - §3.9 (L884–885)
  - §3.10 step 2 (L903)
  - §4.2 Background (L1041) and Code (L1050–1051)
  - §9.2 step 2 (L1570)

  The other hunks in those paragraphs are rewrapping only.
- **Nothing outside the plan's set changed** (see *The boundary*). `explain-critic.md`'s diff is B5's, and the parity check holds it byte for byte.

**N2 (non-blocking, no fix slice).** *What never counts* now lists "a work record attributed in
B7's plain words" (L2165–2166). §4 *Teach, don't report* still names a work record "only where
B8 needs the attributed form … or it changes the reader's trust" (L964–967). So a *gratuitous*
B7-form attribution reads as never-counts in one place and as a who-said-what should-fix in the other.

This is not a finding: either reading is non-blocking, so no publish outcome can change, and matrix case 4 pinned the exemption. The critic run read it the sensible way (C04's fix: "attribute in plain words only where the reader's trust turns on it"). If a later plugin edit touches the line, "B7's plain words, where *Teach, don't report* calls for attribution" would remove the gap.

**N3 (outside the boundary, a Note, not a job).** B5's fallback ("With no `title:` line, the
spec's publish fields name the draft's", L1980) covers the workspace's chapter block, whose
`plan:` names the publish fields. The workspace's **document** block (`explain-chapter.md`
L216–222, read-only here) sends no `title:` and names no plan. Its spec, `doc/brief.md`, has no
publish fields (§3.1), and B5 may not read the writer's `result.md`. So until the workflow-repo
phase adds `title:`, a workspace document's title is *Not seen*. A re-explained chapter
likewise has no `· kept` signal.

This is not a finding:
- the closing edit lives in `.claude/`, which the operator scoped out of this phase;
- F1's Note already gives that edit;
- nothing regressed, since no title was checked before this phase;
- B5's *Not seen* rule asks the critic to say what it could not check.

This round appended one Note that sharpens F1's: the document block's `title:` closes the larger gap.

## 3. The critic re-run (the orchestrator's span, `topics/critic-check-r2.md`)

The span ran on Sonnet against the current repo skill, over the same scope (`reader`, `order`, `clarity`, `rules`; no web sources) and the same draft (`works/phases/active/P32/rehearsal/r1/dossiers/c-new/body.md`). It was given `title: POST /api/documents: the write path from validation to commit and push`.

It returned `verdict: revise`, with 5 must-fix (all `reader`), 9 should-fix and 2 notes, and it passed the title. Round 1, on the same draft, returned `pass` with 0 must-fix.

**L156, L173 and L177 are each now a must-fix:**

| Line | Must-fix | What it catches |
|---|---|---|
| L156 | C02 | "The P24.S1 result adds that …", §4's own "Not" example |
| L173 | C05 | "and the P24.S1 result, say …" |
| L177 | C03 | "P31.S1 moved that code verbatim" |
| L177 | C04 | "Nothing in the code or the notes mentions this window" |

**No under-catch.** A grep of the draft for phase, slice and deferred ids finds 9 occurrences, at L29 (×2), L156, L166, L171, L173, L177, L182 and L220. Each one falls inside a must-fix (C01–C05). The bare record words "decomposition" (L29) and "the notes" (L177) are caught too.

**No over-catch that the rule text causes.** Each must-fix sentence breaks the text as written:

- **C01 (L29):** "Before phase P24" and "P24 began …" use the id as an anchor and as the subject. "The cause the decomposition recorded" is §4's own example.
- **C02 (L156):** the "Not" example, verbatim. "It also names the test" continues with the record as subject.
- **C03:** "the timeout bug P24 fixed" (L166), "P31.S1 moved" (L177) and "since P24" (L220, a quiz `explain`) are all ids outside the trailing mark.
- **C04:**
  - L171 "the P24 notes record" and L182 "A P24 review note records … The note calls" put an id-named record in the subject.
  - **C04's L177 "the notes" is a record named as a workspace artifact, not B7's form.** The sentence's bare "the notes" names no change. B7's allowed form identifies the record by the change in plain words ("from the change that introduced it"). In context, "the notes" points back at L171's "the P24 notes", the phase notebook, which the reader cannot open. The sentence also reports the research's evidence base rather than the system. A must-fix is the rule's own result. In any case, C04 stands on L171 and L182 alone.
- **C05 (L173):** must-fix on "the P24.S1 result", a record by id as a co-subject.

**Observations on the critic run** (the critic's own readings, not caused by the rule text, so not findings):

- **C05 bundles a should-fix-class element into its must-fix.** "`architecture.md` says '…'" states what the file says, so on its own it is case 13's who-said-what (should-fix). §4 *Standalone* (L987) forbids the file name only "in place of saying what it says". C05's fix line ("without the file name as subject") is a touch stricter than the rule. The finding's severity is still right, because of the P24.S1 result. The same critic put the docstring and docs attributions at L156, L166 and L175 under C09 as should-fixes, so it applied case 13 wherever no work record was mixed in.
- **C16 rates commit hashes as subjects a `note`, and that is right.** A commit is git history, not a workspace record, and §4 does not forbid it.
- **The scope was the plan's,** so `facts`, `citations`, `ledger` and `coverage` were *Not seen*, as in round 1.

## 4. Validation, all slices together

```
$ python3 scripts/skills_parity.py
PASS — explain skill copies are in body parity (web copy byte-identical); the 5 plugin agents match Part B.
rc=0
$ python3 scripts/plugin_parity.py
PASS — plugin templates are in parity with the repo.
rc=0
$ diff <(git show cc53183d:plugin/skills/explain/SKILL.md | grep '^#') <(grep '^#' plugin/skills/explain/SKILL.md)
rc=0   (empty)
$ diff <(git show cc53183d:plugin/skills/explain/SKILL.md | grep -E '^<!-- part-b:(begin|end)') <(grep -E '^<!-- part-b:(begin|end)' plugin/skills/explain/SKILL.md)
rc=0   (empty)
$ python3 - <<'EOF'   # works/phases/active/P33-n3/topics/citations.md L64–85, verbatim, from the repo root
citations checked=186 missing=0
rc=0
$ git diff --stat db9861e..HEAD -- .claude/ docs/
(empty)
$ git status --porcelain .claude/ docs/
(empty)
$ wc -l web/public/SKILL.md plugin/skills/explain/SKILL.md .agents/skills/explain/SKILL.md
    2793 web/public/SKILL.md
    2793 plugin/skills/explain/SKILL.md
    2791 .agents/skills/explain/SKILL.md      (its own frontmatter; body parity checked above)
$ grep -n '2,7[0-9][0-9]' web/src/content/marketing/content.ts
251:  lede: "Saving isn't a form. It's a 2,793-line skill: …
261:    meta: "2,793 lines · yaml + markdown",
$ cmp web/public/SKILL.md plugin/skills/explain/SKILL.md   → identical
$ grep -n '"version"' plugin/.claude-plugin/plugin.json   → 3:  "version": "0.8.0",
$ grep -n plugin_version plugin/skills/setup/SKILL.md      → L341 and L355: 0.8.0
$ python3 scripts/workflow.py validate
Workflow validation passed.  (warnings: unknown kinds on P22/P26 slices, consolidation_owed, stale_docs,
oversized_doc_sections; all pre-existing, none for P35-a4, no dangling pointer)
```

S2's release is unchanged since round 1: still 0.8.0, and `main` is 6 commits ahead of `origin/main`, unpushed.

## 5. The pass-only duties

- **`## Doc impact` is complete:**
  - S1's product.md line (the writing rules);
  - S1's qa.md `## Regression Checklist` line;
  - S2's product line (0.8.0, landing 2,771);
  - F1's product.md line (the critic's must-fixes, `title:`, the recap rule, the landing at 2,793, superseding S2's 2,771).

  `docs/current/` names no line count, no 0.7.0, and no critic dispatch field. Its only stale wording is qa.md L360 ("titled "P<N>: <phase name>""), which S1's qa line already covers. No smoke-suite count changed, and no `decisions.md` entry is reversed. Nothing was appended.
- **The qa `## Regression Checklist` line** (P33-n3's *Explain front door, a book*) stays as its Doc impact note, as round 1 decided. The review writes that section only as a gated phase's stage-4 append, and this gate is waived. No doc version was created.
- **`## Operator Questions`:** empty, so nothing to route.
- **The gate:** waived, so there are no stages and no walkthrough.
- **Notebook against the logs:** every decision is in `## Decisions` with its topic present:
  - DECOMP's *Breakdown* and *Titles*;
  - F1's *Critic severity (F1, superseding DECOMP's)*;
  - S1's *Where S1's rules live*.

  F1's `title:`, `· kept` and `· book:` deviations are carried in that severity line and in F1's Note. No dangling pointer.
- **Team-rules check:** skipped, because this is an at-root install.

## Outside the boundary (Notes for the workflow-repo phase, not jobs)

- **O1 (round 1):** `do-whole-phase/reference/explain-review.md` L104 and its `do-next-slice` copy carry the old sequential order check. Already a Note.
- **F1's note:** the workspace's two critic dispatch blocks lack `title:` (`· kept`, `· book:`). Already a Note.
- **N3 (this round):** the document block's `title:` matters most, because B5's fallback finds no title for a document. Appended as a Note.

## Notebook (written through phase-section)

- `## Notes for later slices`: appended `(from REVIEW round 2, for the workflow-repo phase)` (N3). No note was consumed. The three existing Notes are all for the workflow-repo phase and stay.
- `## Now`: replaced for the round-2 pass.
