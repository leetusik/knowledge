# P35-a4.S1 — result

- status: done
- route: mid
- model: opus
- effort: medium
- summary: The canonical explain skill now teaches that a document is about its subject, not the workspace's work records (a phase or slice id appears at most as a trailing "(P30)" mark, and a deferred id never appears), that every document and chapter stands alone, and that titles say what the text explains. B5's critic rubric enforces all three, with its link rule reversed. Both shipped copies and the five agent bodies are regenerated to match.
- files_changed: plugin/skills/explain/SKILL.md, .agents/skills/explain/SKILL.md, web/public/SKILL.md, plugin/agents/code-researcher.md, plugin/agents/explain-critic.md, plugin/agents/gap-reviewer.md, plugin/agents/verifier.md, plugin/agents/web-researcher.md (agents regenerated), works/phases/active/P35-a4/phase.md (via phase-section), works/phases/active/P35-a4/slices/P35-a4.S1/result.md
- validation: skills_parity PASS · plugin_parity PASS · heading diff empty · Part B marker diff empty · P33-n3 citation check `citations checked=186 missing=0` · `git status --porcelain .claude/ docs/` empty · workflow validate passed
- line count: `wc -l` gives 2771 for both `plugin/skills/explain/SKILL.md` and `web/public/SKILL.md` (was 2729)
- deviations: §4.2 has no sentence that implies leaning on a link, so it has no standalone edit (only the change and phase walk was added). §4.10 restates no linking rule, so it is unchanged. The "never a fault" items (a short recap, an id used only as the mark) went into the rubric's *What never counts against the chapter* list, not the Order and Reader paragraphs, so they are stated once.
- doc_impact: product.md: the explain skill's writing rules (subject over records, ids at most a trailing mark, deferred ids never, standalone, subject-led titles, the critic's link rule reversed) (P35-a4.S1) · qa.md `## Regression Checklist`: the *Explain front door, a book* line expects `"P<N>: <phase name>"`; a new phase book is now titled by what it explains (P35-a4.S1)

## Where each rule landed (canonical file)

All new rules sit inside existing sections. No heading, `§` number or Part B marker changed.

- **The subject, not the records** (rule A, written in full): a new §4 prose-rule bullet right after *Teach, don't report*. It carries the before-and-after example from P24.
- **Standalone** (rule C, written in full): a new §4 prose-rule bullet after A.
- **The title rule:** a bold-led paragraph at the end of §1's placement list. It covers book, chapter and loose-document titles, and states that keys, slugs and positions stay unchanged. It also states that the `phases` book keeps its title and that the rule binds new books and chapters only. The three title lines that read `"P<N>: <phase name>"` and the slice's name now point to it.
- **The attributed form (B):** one sentence in B7's attributed-form bullet: the plain-words attribution of a work record, its id at most a mark. *Teach, don't report* was rewritten to name work records and point to that form.
- **Pointers:** front door step 6 (new titles follow §1's title rule), §3.1 (records are evidence), §3.4 step 3 (the skeleton is grouped by idea, never by slice) and step 5 (records are evidence of why, never the structure), §3.9 `no-research`, §3.10 the path (a phase or slice follows the system's ideas, never slice order), §4.1 links (a link is an extra, never the explanation), §4.2 Background and Code (never slice by slice; a phase walks the system as it now works, by idea), §5 `title`, §9.2 step 2 (chapters follow ideas, never one per slice by default).
- **The critic (D):**
  - *Inputs* item 7 now lists §4's prose rules.
  - *Order and prerequisites* now treats leaning on a link where the reader needs the idea as a finding (a `reader` must-fix). Long re-teaching where a short recap would do is still a finding.
  - *The reader* now does each task opening no link, file or source. Its must-fix: a document organised by slices or records, or one that cannot be followed without opening a link, file or source. Its should-fix: an id as a sentence's subject or in a heading, a deferred id, a record named where plain words would do, a lone "see X".
  - In the rubric's should-fix list, "re-teaching an earlier chapter instead of linking it" became "long re-teaching of an earlier chapter where a short recap would do".
  - *What never counts* now includes a short recap and an id used only as the trailing mark.
  - The categories are unchanged.

B7 is a shared extract, so all five agent bodies regenerated. B5 changes only `explain-critic.md`.

## Validation outputs

```
$ python3 scripts/skills_parity.py --write-agents
wrote plugin/agents/web-researcher.md
wrote plugin/agents/code-researcher.md
wrote plugin/agents/gap-reviewer.md
wrote plugin/agents/verifier.md
wrote plugin/agents/explain-critic.md
PASS — explain skill copies are in body parity (web copy byte-identical); the 5 plugin agents match Part B.

$ python3 scripts/skills_parity.py
PASS — explain skill copies are in body parity (web copy byte-identical); the 5 plugin agents match Part B.

$ python3 scripts/plugin_parity.py
PASS — plugin templates are in parity with the repo.

$ diff <(git show cc53183d:plugin/skills/explain/SKILL.md | grep '^#') <(grep '^#' plugin/skills/explain/SKILL.md)
(empty, rc=0)

$ diff <(git show cc53183d:plugin/skills/explain/SKILL.md | grep -E '^<!-- part-b:(begin|end)') <(grep -E '^<!-- part-b:(begin|end)' plugin/skills/explain/SKILL.md)
(empty, rc=0)

$ python3 - <<'EOF'  # P33-n3 topics/citations.md L64–85, from the repo root
citations checked=186 missing=0

$ git status --porcelain .claude/ docs/
(empty)

$ wc -l plugin/skills/explain/SKILL.md web/public/SKILL.md
    2771 plugin/skills/explain/SKILL.md
    2771 web/public/SKILL.md

$ python3 scripts/workflow.py validate
Workflow validation passed. (pre-existing warnings only: P26.S5 kind, consolidation_owed, stale_docs, oversized_doc_sections)
```

`.agents/skills/explain/SKILL.md` was rebuilt as its own frontmatter (unchanged) plus the canonical body. `web/public/SKILL.md` is a full-file copy of the canonical file.

## Self-read

I grepped the canonical file for `P<N>: `, `P46-k2: `, `instead of linking`, `slice's name`, `see chapter`, `see \``, `phase name` and `link to`. The remaining hits stay:
- L194: the title rule's own counter-example ("not "P30: <phase name>"").
- L260: the phase *name* `Explain: <subject>`, a workspace phase name and not a document title.
- L978: the Standalone bullet's own counter-example ("never "see chapter 2"").
- L1017–1018 ("a series may link forward"), L1067, L1426 and L2143: link grammar and warning semantics, not a rule to link instead of recapping.

No sentence still says to title a document by `P<N>: ` or to link rather than recap.

## Notebook (written through phase-section)

- `## Doc impact`: two lines appended (above).
- `## Decisions`: one line, *Where S1's rules live*.
- `## Notes for later slices`: removed the consumed `(from DECOMP, for S1)` note; added `(from S1, for S2)` with the 2,771-line count.
- `## Now`: replaced, handing off to S2.
