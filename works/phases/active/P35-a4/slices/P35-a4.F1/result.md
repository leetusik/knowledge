# P35-a4.F1 — result

- status: done
- route: high
- model: opus
- effort: xhigh
- summary: The explain critic now holds every document and chapter to the subject, standalone and title rules as `reader` must-fixes, so a writer can no longer decline them. A book chapter must recap any idea it takes from an earlier chapter, and a silent dependency is a must-fix. The critic receives the title (`title:` in both dispatch blocks) and judges it by §1's title rule. §4's subject wording is reconciled with B7's plain-words form, and the six local subject clauses point at §4.
- files_changed:
  - plugin/skills/explain/SKILL.md
  - .agents/skills/explain/SKILL.md (its own frontmatter plus the canonical body)
  - web/public/SKILL.md (a full-file copy)
  - plugin/agents/explain-critic.md (regenerated; B7 and B8 are unchanged, so the other four agents are untouched)
  - web/src/content/marketing/content.ts (`lede` and `pane.meta` set to 2,793)
  - works/phases/active/P35-a4/phase.md (through `phase-section` only)
  - this result.md
- line count: `wc -l` is 2793 for both `plugin/skills/explain/SKILL.md` and `web/public/SKILL.md` (it was 2771). The landing reads 2,793 at L251 and L261.
- validation:
  - `python3 scripts/skills_parity.py`: PASS
  - `python3 scripts/plugin_parity.py`: PASS
  - heading diff against `cc53183d`: empty (rc 0)
  - Part B marker diff against `cc53183d`: empty (rc 0)
  - P33-n3 citation check: `citations checked=186 missing=0` (rc 0)
  - `git status --porcelain .claude/ docs/`: empty
  - both landing counts equal `wc -l web/public/SKILL.md` (2793), and `cmp` with the canonical file is identical
  - `python3 scripts/workflow.py validate`: passed (only pre-existing warnings, none for P35-a4)
- acceptance matrix: all 13 cases are proven below. Cases 1–7 are now must-fixes, case 4's B7 form is not a finding, a kept title is never a finding, and cases 8–13 are unchanged.
- deviations (each one serves the plan's intent):
  1. The `title:` line carries an optional `· kept` in both blocks, and B5's block also carries an optional `· book: <a new book's title>`. Without `kept`, the critic cannot tell an existing chapter's kept title from a new one, so "never a finding" could not be decided. Without `book:`, a new book's title (case 7) never reaches a critic. The slot is sent "with one chapter of a new book", so the book's title is not judged once per chapter.
  2. B5 adds a fallback: with no `title:` line, the critic takes the draft's title from the spec's publish fields. The workspace's two critic dispatch blocks do not send `title:` yet; that is the workflow-repo phase's job (Notes).
  3. The title sentence says "even one the spec gives". Without it, *What never counts*' "following its spec" would excuse a spec'd "P30: …" title.
  4. `--write-agents` regenerates only the agents. I synced the two skill copies by hand, as S1 did.
  5. Lines that S1 had left over-long were rewrapped where a pointer joined them. This is cosmetic, and the wording is unchanged apart from the pointer.
- doc_impact: `- product.md: the explain critic holds the subject, standalone and title rules as reader must-fixes, never declinable should-fixes, and receives the title it judges (title:); a book chapter recaps what it uses from an earlier chapter, a silent dependency being a must-fix; still inside 0.8.0, the landing (content.ts lede, pane.meta) now counts 2,793 lines, superseding S2's 2,771 (P35-a4.F1)`

## The acceptance matrix, case by case

Line numbers are the canonical file's after F1. Quotes are the deciding text.

**Failing before F1, each now a finding at the stated severity**

1. **A phase or slice id as a sentence's subject is a `reader` must-fix.** B5 *The reader* L2111–2114: "So is every departure from the skill's §4, *The subject, not the records* and *Standalone*: … a phase or slice id in a heading, or anywhere but a sentence's trailing mark". §4 L972–973 adds "no sentence takes an id … as its subject". "The P24.S1 result adds that …" uses the id as its subject, so it is a must-fix. The old should-fix sentence is gone.
2. **An id in a `##`/`###` heading is a must-fix.** L2113: "a phase or slice id in a heading". §4 L976: "never in a heading". A heading's "(P24)" is no escape, since the allowed mark is "a sentence's trailing mark" (L2114).
3. **A deferred job's id anywhere is a must-fix.** L2114: "a deferred job's id", listed with no qualifier. §4 L976–977: "a deferred job's id never appears".
4. **A work record named as a workspace artifact is a must-fix.** L2114–2115: "a record named as a workspace artifact as the subject of any clause". §4 L973–974 names "(a `result.md`, "the P24.S1 result", "the decomposition recorded")". "The cause the decomposition recorded" makes the decomposition a clause's subject, and "A P24 review note records" is both an id and an artifact as subject. **B7's form is not a finding.** §4 L974–975: "the change named in plain words is allowed (B7's attributed form)". *What never counts* L2165–2166: "a work record attributed in B7's plain words". So "the notes from the change that introduced it report X" (B7 L2332–2336) passes. The wording conflict is gone: §4 no longer forbids "a record" as a subject, only a record named as a workspace artifact.
5. **A lone "see X", or a file or doc named in place of what it says, has one severity, must-fix, in both places.**
   - *The reader* L2115–2116: "a lone "see X", or a file or doc named in place of what it says", inside the must-fix list.
   - *Order* L2104–2106: "leaning on a link (`chapter:`, `doc:`, a source or a file) where the reader needs the idea, is a `reader` must-fix (below)".
   - The should-fix sentence that gave it a second severity is deleted.
6. **A chapter that uses an earlier chapter's idea with no recap is a must-fix.**
   - *Order* L2101–2106: "walk the chapter as the outline's stated reader, reading it alone (a book's chapter too: the skill's §4, *Standalone*) … An idea an earlier chapter teaches needs a short recap here (a `chapter:` link may follow, as an extra): relying on it silently … is a `reader` must-fix".
   - *The reader* L2110: "opening no link, file, source, or other chapter or document", and L2116–2117: "any passage its reader cannot follow without opening … another chapter or document".
   - The old premise ("who has read only the earlier chapters") and the rubric's "here or in an earlier chapter" are rewritten. L2140 now reads "an idea used before the chapter introduces it".
   - *Inputs* item 6 (L2020–2021) reads earlier chapters as "what this chapter must recap, never what its reader already knows".
7. **A new title that names the work is a must-fix.**
   - L2117–2119: "So is a new title (`title:`, `book:` included) that names the work instead of what the text explains, even one the spec gives (the skill's §1 title rule)".
   - The critic receives the title in §4.10 step 1 (L1319, `title: <the title §5 will publish>[ · kept]`) and in B5 *Your dispatch* (L1976, `title: <the title it will publish>[ · kept][ · book: <a new book's title>]`, defined at L1979–1980).
   - **A kept title is never a finding.** *What never counts* L2166: "a `kept` title". L1321: "`kept` marks an existing chapter's title, which §1's title rule keeps".

**Passing before F1, each unchanged**

8. **A document organised by slices or work records is still a `reader` must-fix.** L2112–2113: "a chapter organised by slices or work records".
9. **A reader who cannot follow without opening a link, file or source is still a must-fix.** L2116–2117: "any passage its reader cannot follow without opening a link, a file, a source, or another chapter or document". It was widened, never weakened.
10. **Leaning on a `chapter:` or `doc:` link, a source or a file is still a must-fix.** L2104–2106: "leaning on a link (`chapter:`, `doc:`, a source or a file) where the reader needs the idea, is a `reader` must-fix".
11. **Long re-teaching is still a should-fix.** L2106–2107: "re-teaching it at length where a short recap would do is a should-fix". The rubric at L2145 still lists "long re-teaching of an earlier chapter where a short recap would do".
12. **A short recap and a trailing-mark id are still never a finding.** L2164–2165: "a short recap of an earlier chapter's idea; a phase or slice id used only as the small trailing mark".
13. **Who-said-what is still a should-fix.** L2120–2121: "a fact reported as who-said-what, a section past its budget: `should-fix`". §4 *Teach, don't report* is unchanged.

## What changed, by place

- **§4 *The subject, not the records*** (L969–980): "no sentence takes a record or an id as its subject" became "no sentence takes an id, or a record named as a workspace artifact (a `result.md`, "the P24.S1 result", "the decomposition recorded"), as its subject; the change named in plain words is allowed (B7's attributed form)". The rest is unchanged, apart from rewrapping.
- **§4.10 step 1:** the `title:` line, and one sentence defining `kept`.
- **B5:**
  - *Your dispatch*: the `title:` line, plus its definition and fallback.
  - *Inputs* item 6: the new premise.
  - *Order and prerequisites*: rewritten. The chapter is read alone, an earlier chapter's idea needs a recap, and a silent dependency or leaned-on link is a `reader` must-fix.
  - *The reader*: rewritten. Every §4 departure and a new work-naming title are must-fixes, and only the prose-craft items stay should-fixes.
  - The rubric's must-fix item: "an idea used before the chapter introduces it".
  - *What never counts*: B7's plain words and a `kept` title added.
- **N1, the six clauses**, each with `(§4, *The subject, not the records*)` joined on:
  - §3.4 step 3 (L683–684);
  - §3.4 step 5's history angle (L717–718);
  - §3.9 (L884–885);
  - §3.10 step 2 (L903);
  - §4.2 Background (L1041) and Code (L1050–1051);
  - §9.2 step 2 (L1570).
- **Self-read:** a grep for `has read only`, `here or in an earlier`, `instead of linking`, `plain words would do` and `record or an id as` finds nothing in the canonical file.

## Validation output

```
$ python3 scripts/skills_parity.py --write-agents
wrote plugin/agents/explain-critic.md
PASS — explain skill copies are in body parity (web copy byte-identical); the 5 plugin agents match Part B.
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
$ git status --porcelain .claude/ docs/
rc=0   (empty)
$ cmp web/public/SKILL.md plugin/skills/explain/SKILL.md
identical
$ python3 - <<'EOF'   # P33-n3 topics/citations.md, verbatim, from the repo root
citations checked=186 missing=0
rc=0
$ wc -l web/public/SKILL.md plugin/skills/explain/SKILL.md .agents/skills/explain/SKILL.md
    2793 web/public/SKILL.md
    2793 plugin/skills/explain/SKILL.md
    2791 .agents/skills/explain/SKILL.md      (its own frontmatter; body parity checked above)
$ grep -n '2,7[0-9][0-9]' web/src/content/marketing/content.ts
251:  lede: "Saving isn't a form. It's a 2,793-line skill: …
261:    meta: "2,793 lines · yaml + markdown",
$ grep -n '"version"' plugin/.claude-plugin/plugin.json
3:  "version": "0.8.0",
$ python3 scripts/workflow.py validate
Workflow validation passed.  (warnings: unknown kinds on P22/P26 slices, consolidation_owed, stale_docs,
oversized_doc_sections; all pre-existing, none for P35-a4)
```

## Notes

- **A dead end along the way:** a final rewrap briefly made the file 2,792 lines. That was after the Doc impact line, which is append-only and refuses `--entry --replace`, had already been written with 2,793. I reverted the rewrap rather than append a correction, so the file, the landing and the note all say 2,793.
- **Recommended for review round 2** (the orchestrator's span, from round 1): re-run the critic over the old P32 `c-new` draft. C04's class (L156 "The P24.S1 result adds that …") should now come back as a `reader` must-fix, with verdict `revise`.

## Notebook (written through phase-section)

- `## Decisions`: entry 3 was replaced with *Critic severity (F1, superseding DECOMP's)*.
- `## Doc impact`: one line appended (above).
- `## Notes for later slices`: the consumed `(from REVIEW, for F1)` note was removed. A `(from F1, for the workflow-repo phase)` note was added: the workspace's two critic dispatch blocks in `explain-chapter.md` and their `do-next-slice` copies should send `title:`.
- `## Now`: replaced for review round 2.
