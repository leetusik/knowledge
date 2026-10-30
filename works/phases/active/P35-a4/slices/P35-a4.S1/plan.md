# P35-a4.S1 — plan

slice: P35-a4.S1 · kind: implementation · risk: low · depends on: none

## Goal

The canonical explain skill, `plugin/skills/explain/SKILL.md`, teaches three things:
- a document is about its subject, not the workspace's work records;
- workflow ids appear at most as a small mark like "(P30)";
- every document and chapter stands alone.

The critic's rubric enforces all three. The two shipped copies and the five generated agent bodies follow the canonical file. The operator's words and the confirmed intent are in `works/phases/active/P35-a4/intent.md`. Read it first.

## Read before editing

- `works/phases/active/P35-a4/topics/breakdown.md`:
  - **§ Pins for S1** holds the decided choices: stable headings, titles, severities;
  - **§ P35-a4.S1** lists every place to edit, by line at `cc53183d`.

  Both are binding. This plan restates the pins in brief and adds the substance of each new rule.

## Hard constraints

1. **No heading, `§` number or Part B marker line changes**: `<!-- part-b:begin … -->`, `<!-- part-b:end … -->` and their `with=` lists stay byte for byte. New rules go inside existing sections, as bullets or sentences, never as new headings. The workflow repo cites these sections by number and heading.
2. **Each new rule is written in full, once,** in the section that owns it. Elsewhere, a short pointer to that section by number and heading. Write no second copy of the rule.
3. **Shorter wins.** The skill is already long, so add the fewest words that state each rule. Where an old sentence contradicts a new rule, rewrite it rather than adding a caveat beside it.
4. **Edit only the files in the set (below).** Nothing under `.claude/` and nothing in `docs/`. Write no test files.

## The rules to write (the substance is pinned; the wording is yours)

### A. The subject, not the records

Its home is a new bullet in §4's prose rules, next to *Teach, don't report*.
- When the subject is a phase, a slice or a change, the reader wants what the system now does and why.
- The workspace's records (a phase's intent and notebook, a slice's `result.md`, a deferred job) are **evidence**, never the subject or the structure:
  - sections follow the system's ideas and flow, never slice order;
  - no sentence takes a record or an id as its subject.
- A phase or slice id appears at most as a small parenthetical mark, "(P30)", after the plain-words statement, and never in a heading.
- A deferred job's id never appears. Say in plain words what is still open.
- A one-line before and after, from a real draft:

  > "The P24.S1 result adds that a background task could run before the body reached the client"
  >
  > → "A background task could run before the body reached the client, which the change that introduced the worker found (P24)"

Then apply it at each place the breakdown lists:
- **§1 placement titles** (phase chapter, slice chapter, phase book):
  - the title says what it explains, with the id at most a trailing mark, e.g. "How a review publishes privately (P30)";
  - slugs, keys and positions stay as they are (`p<N>`, `p<N>-p<M>`, `s1`, `f1`, position `N` or `order`);
  - the `phases` book keeps "<project>, phase by phase"; only its chapter titles change;
  - a title rule binds only a **new** book or chapter (an existing chapter keeps its manifest entry, and a loose v2 keeps its `rel_path`), so nothing already published changes.
- **The front door's step 6** `book:` / `chapter:` lines, the same way.
- **§3.1 brief, §3.4** (step 3's outline skeleton, step 5's *history behind it*), **§3.9** `no-research` change mode, **§3.10** the path: records are evidence, and the reader's path follows the system's ideas.
- **§4.2 Background and Code for a change:** for a phase or slice, walk the system as it now works, grouped by idea, never slice by slice.
- **§5 `title`:** the title says what the document explains, with the id at most a trailing mark.
- **§9.2 step 2**, a book's chapter list: chapters follow the subject's ideas, never one chapter per slice by default.

### B. The attributed form for a work record

A plain-words attribution ("the notes from the change that introduced it report…", "the change's own tests show…"), with the id at most as the mark. Put it where the breakdown suggests, in B7's attributed-form bullet or B8's *In the chapter* paragraph, whichever reads naturally. Make §4's *Teach, don't report* consistent with it.

### C. Standalone

Its home is a new bullet in §4's prose rules.
- The chapter reads complete on its own. No sentence depends on the reader opening a link, a source, a repo file, or another document or chapter. An idea the reader needs is explained in place, briefly when another chapter teaches it at length.
- Citations and the sources block stay, as evidence the reader may check, never as the explanation.
- A repo path is fine as a code block's title, but never "see `X` §4" or "`architecture.md` says…" in place of saying what it says.
- Book chapters too: a short recap of an earlier chapter's idea, not "see chapter 2". A `chapter:` link may be added as an extra.

Then:
- **§4.1's links bullet:** one clause saying a link is an extra, never the explanation, pointing to the §4 bullet. Leave the hard-rule grammar untouched.
- **§4.2:** wherever it implies leaning on a link.
- **§4.10:** change it only if a sentence there restates the old linking rule.

### D. The critic enforces A–C (B5; the categories stay `reader`, `clarity`, `order`, with no new category)

- ***Inputs* item 7:** add §4's own prose rules to what the critic reads.
- ***Order and prerequisites*:** reverse the link rule. Leaning on a link (`chapter:`, `doc:`, a source or a file) where the reader needs the idea is a finding. Re-teaching an earlier chapter **at length**, where a short recap would do, stays one. A short recap is never a fault.
- ***The reader*:** do each task from the chapter alone, without opening any link, file or source.
- **The rubric's severities**, exactly per the pins:
  - **`must-fix`, category `reader`:** a document organised by slices or work records, or one whose reader cannot follow it without opening a link, a file or a source.
  - **`should-fix`:**
    - an id as a sentence's subject or in a heading;
    - a deferred id;
    - a work record named where plain words would do;
    - a lone "see X" in place of an explanation;
    - long re-teaching of an earlier chapter (replacing "re-teaching an earlier chapter instead of linking it").
  - **Never a fault:** a short recap; an id used only as the small mark.

## The set (edit nothing else)

- `plugin/skills/explain/SKILL.md`: the canonical file.
- `.agents/skills/explain/SKILL.md`: the canonical body, byte for byte, below its own frontmatter, which stays as it is.
- `web/public/SKILL.md`: a full-file copy of the canonical file.
- The five `plugin/agents/*.md` (`code-researcher`, `explain-critic`, `gap-reviewer`, `verifier`, `web-researcher`), regenerated by `python3 scripts/skills_parity.py --write-agents`. Never hand-edit them.
- `works/phases/active/P35-a4/phase.md` through `phase-section` only, and this slice's `result.md`.

## Validation (all must pass; paste the outputs in `result.md`)

- `python3 scripts/skills_parity.py`: PASS.
- `python3 scripts/plugin_parity.py`: PASS.
- `diff <(git show cc53183d:plugin/skills/explain/SKILL.md | grep '^#') <(grep '^#' plugin/skills/explain/SKILL.md)`: empty.
- `diff <(git show cc53183d:plugin/skills/explain/SKILL.md | grep -E '^<!-- part-b:(begin|end)') <(grep -E '^<!-- part-b:(begin|end)' plugin/skills/explain/SKILL.md)`: empty.
- P33-n3's citation check (`works/phases/active/P33-n3/topics/citations.md` L64–85, run from the repo root): `citations checked=186 missing=0`.
- `git status --porcelain .claude/ docs/`: empty.
- Report the new `wc -l` of `plugin/skills/explain/SKILL.md` and `web/public/SKILL.md` (S2 writes it into the landing).
- A self-read: grep the canonical file for any surviving sentence that still says to title by `P<N>: `, or to link rather than recap. List each hit and why it stays (for example, a slug or key), or fix it.

## Notebook

- **`## Doc impact`**, two lines:
  - product: the explain skill's writing rules (the subject over the records, ids at most a small mark, standalone, the critic's link rule reversed);
  - qa `## Regression Checklist`: P33-n3's *Explain front door, a book* line expects `"P<N>: <phase name>"` and now gets a subject-led title with the mark.
- Remove the consumed `(from DECOMP, for S1)` note (`--entry K --remove`).
- Update `## Now` for S2.
- Leave a `(from S1, for S2)` note with the final line count.

## Return

`done`, with `files_changed`, the validation outputs and the line count. `escalate` if a pin cannot hold, for example a rule that cannot be stated without a new heading. Never commit, and never move workflow state.

## Dispatch

route=mid
reason=kind implementation rated low
subagent_type=slice-executor
model=opus
pass_model=yes
effort=medium
pass_effort=yes
attribution=Claude Opus 5.5
explore_model=haiku
explore_effort=xhigh
