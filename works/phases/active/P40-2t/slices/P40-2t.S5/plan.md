# P40-2t.S5 — plugin evidence and critic

Kind `implementation`. A wave slice, started on S1's return and running beside S3. Mode `auto`.

## Goal

Implement change-list A3 and A14–A22 in the canonical `plugin/skills/explain/SKILL.md`, starting
from S1's committed text (`e8fad0e5`):

- **A3.** In the run card, *The evidence*: records include a research phase's findings, whether
  web-sourced or from the operator's own material. A subject explain has no code entries, and the
  writer still does no research.
- **A14.** §3.4 *D1: the evidence*, its opening and steps 2, 3 and 6:
  - a research phase's findings are records;
  - a corpus is read only at cited record ids;
  - with `paths: none` there is no code to read;
  - a finding's outside work is carried as the entry's `source:` and never read;
  - the standing gap covers the outside works that the research read.
- **A15, with OQ1 answered yes.**
  - §4 *The subject, not the records* and §4.6 *Sources*: Sources list the code and the records, and
    research-phase lines name the findings.
  - Sources **also list the outside works that the research read**, each marked "read by the research,
    not by this book".
  - The critic checks only that each listed work appears in a cited finding's `source:`.
- **A16.** §5's publish command: `--book-kind <codebase|subject>`, and `--book-subject "<label>"` for a
  subject book.
- **A17.** §9.2: a book is codebase or subject. Item 3's outline adds the pinned recap lines, names,
  running examples and link ids.
- **A18.** §9.3: a chapter written beside other chapters recaps with the outline's recap lines, links
  only to section ids the outline names, and reports its corrections.
- **A19.** B5 *Inputs*, item 7: earlier chapters are read only as committed (`git show HEAD:<path>`).
  A sibling not at `HEAD` is judged by the outline's taught terms and recap lines.
- **A20.** B5 *How you check*, **Nothing from outside** and *The trace*:
  - a finding that rests on an outside work supports the sentence;
  - check the record line and its `source:`, never the work itself;
  - a gloss beyond the finding is `outside`;
  - attribution comes by the standing gap, or in plain words.
- **A21.** B9's record-entry form gets a `- source: <title, URL> | none` field on a `finding` entry,
  and *What an entry supports* says what a finding entry supports.
- **A22.** B9 *The evidence* paragraph: records include research findings; still nothing is read from
  outside the records.

After the edits:

1. Re-derive the copies the way S1 did (its note under *Notes for later slices*):
   - the `.agents` copy is the plugin body after its frontmatter, under `.agents`' own 4-line
     frontmatter, with the `description:` line taken from the plugin;
   - the web copy is a plain `cp`.
2. Run `python3 scripts/skills_parity.py --write-agents`. Part B changes, so the critic agent is
   regenerated.

## Validation

- `python3 scripts/skills_parity.py --write-agents`, then `python3 scripts/skills_parity.py` and
  `python3 scripts/plugin_parity.py`, all PASS. The Part B markers stay well formed.
- `uv run pytest tests/test_explain_resolver.py -q` passes.
- The heading list is unchanged against `HEAD` (44 headings).
- `python3 works/phases/active/P39-hk/package/checks/cites.py plugin/skills/explain/SKILL.md <files>`
  reports missing 0. The files are: `fdb1151`'s payload create-phase `SKILL.md` and three explain
  references, extracted to the scratchpad, plus S2's committed `package/claude/skills/create-phase/*.md`.
- `git status --porcelain .claude/` shows nothing.

## Risk

`low` (the mid row). There is no trigger: every passage is pinned by change-list §3(b) and (d), and
OQ1 is answered. Its readers (the writer's sections and the critic agent) are inside its own set and
are regenerated together. Return `escalate` if Part B's markers or a critic check need a decision §3
did not make.

## Read first

- **`topics/breakdown.md`**:
  - *Pins for every edit slice (S1–S6)*. No heading is renamed or added, and no cited bold part's
    opening words change. Read the bootstrap only with
    `git -C /Users/sugang/projects/personal/bootstrap_agentic_workspace.sh show fdb1151:<path>` into the
    scratchpad, written literally, one plain command per call. Write no test files.
  - Your own `## P40-2t.S5` block.
- **`topics/change-list.md`**: §3(b) and §3(d), §4, and your rows A3 and A14–A22 in §5. They are the
  contract: implement them, and don't redesign them.
- **`phase.md` *Notes for later slices***, through `phase-section`: S1's note on how the copies were
  made.
- **`intent.md`** *Confirmed Intent*.

## Never

- Write in the bootstrap repo, Note or arb_upbit_1, or anything outside your set. The scratchpad is the
  one exception.
- Commit, move workflow state, or run an engine command that writes.
- Search the web, or spend money.
- Write test files.

## Return

`result.md`, with the structured verdict block first: status, route, model, effort, summary,
files_changed, validation, deviations, doc_impact, notebook. Then the detail.

The `notebook` field carries:
- your block's Doc impact note;
- a Notes-for-later-slices entry for S6: the final line count of the skill, which is for
  `content.ts`, and what parity printed;
- any Decisions gist line;
- any Operator Question.

## Wave

- **Your set.** Edit nothing else; your slice folder's `result.md` is the one exception:
  - `plugin/skills/explain/SKILL.md`
  - `.agents/skills/explain/SKILL.md`
  - `web/public/SKILL.md`
  - `plugin/agents/explain-critic.md`, regenerated
- **Running beside you.** Never touch its set:
  - P40-2t.S3: `works/phases/active/P40-2t/package/claude/skills/do-whole-phase/reference/explain-{decomposition,chapter,review}.md`,
    `works/phases/active/P40-2t/package/patches/workflow.md`
- **Done slices whose commit waits:** none. S1, S2 and S4 are committed.
- **Join-rebuilt artifact:** none.
- **Checks:** only the ones under Validation. A whole-tree check is `deferred: whole-tree`, for S6
  and REVIEW.
- **Notebook:** write no `phase.md`. Return your entries in the verdict's `notebook` field, by section,
  each gist-sized.
- **No engine command that writes.** `validate` and `phase-section` reads are fine.

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
