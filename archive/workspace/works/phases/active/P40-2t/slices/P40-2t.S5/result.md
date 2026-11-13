# P40-2t.S5 — result

- status: done
- route: mid
- model: opus
- effort: medium
- summary: Implemented change-list A3 and A14–A22 in the canonical explain skill. A research phase's findings are now records, and a finding entry carries `source:`, which is never read. There is a standing gap, Sources list the research-read works (OQ1: yes), and the publish gains `--book-kind <codebase|subject>` / `--book-subject`. The book outline pins recaps, names, examples and link ids, and chapters written side by side recap from the outline and report corrections. The critic reads earlier chapters only at `HEAD` and checks findings against their record line and `source:`. The two copies were re-derived and the critic agent regenerated.
- files_changed: plugin/skills/explain/SKILL.md; .agents/skills/explain/SKILL.md; web/public/SKILL.md; plugin/agents/explain-critic.md (regenerated)
- validation:
  - `python3 scripts/skills_parity.py --write-agents`: wrote the agent. Then `python3 scripts/skills_parity.py` PASS and `python3 scripts/plugin_parity.py` PASS. The Part B markers are unchanged (9 marker lines, as at HEAD).
  - `uv run pytest tests/test_explain_resolver.py -q`: 2 passed.
  - Heading list (`grep '^#'`) is identical to HEAD (44 lines).
  - `cites.py`, run on the fdb1151 create-phase SKILL.md, the three explain references (in the scratchpad) and S2's `package/claude/skills/create-phase/*.md`: checked=126, bold parts=17, missing=0.
  - `git status --porcelain .claude/`: empty.
  - deferred: whole-tree (for S6 and REVIEW).
- deviations: none in scope. The plan left three small choices open, and I made them:
  - the critic grades an unattributed `source:` fact, and a Sources outside work that no cited finding names, as `should-fix` (`facts`);
  - the JSON payload form also gets `"kind": "codebase | subject"` and `"subject"`, matching the CLI's `book.subject`;
  - the second Sources example omits its `## Sources` line, so that the heading list stays byte-identical.
- doc_impact: none written to phase.md (wave); the note is in `notebook`
- notebook:
  - Doc impact: `product.md`, `decisions.md` (from P40-2t.S5): a book's evidence includes a research phase's findings, and each finding entry carries `source:` (title, URL), never read. A standing gap covers research-read works. The critic checks the record line and `source:`, never the web. Sources list research-read works marked "read by the research, not by this book" (OQ1: yes). A subject book publishes with `--book-kind subject --book-subject "<label>"`. Chapters at once recap from the outline's pinned lines, and the critic reads siblings only at `HEAD`.
  - Notes for later slices: **(from P40-2t.S5, for P40-2t.S6)** The plugin explain skill is now 2,665 lines (S1 left it at 2,570), so set `web/src/content/marketing/content.ts` to that count. skills_parity PASS ("copies in body parity; web byte-identical; agent matches Part B"), plugin_parity PASS. The critic agent was regenerated (+36/−4). There are 44 headings, unchanged, and cites.py reported missing 0.
  - Notes for later slices: **(from P40-2t.S5, for P40-2t.S3, P40-2t.REVIEW)** The skill's text now pins what a book's outline holds and what a chapter returns. The outline holds, beside its taught terms: each term's one-line recap, one name per thing, the running examples and their numbers, and the linkable section ids (§9.2 item 3). A chapter's return reports the terms it taught, the link ids it used and its corrections (§9.3 *Written beside other chapters*). The payload's explain references should match this.
  - Decisions: Severity choices (S5): an unattributed `source:` fact, and a Sources outside work that no cited finding names, are each `should-fix` (`facts`). A gloss beyond a finding, or an outside fact with no finding under it, is `outside`, a `must-fix`.
  - Operator Questions: none.

## Detail

### Where each change landed (plugin/skills/explain/SKILL.md)

- **A3.** *The run, in one card*, **The evidence**: research findings, whether web-sourced or the operator's own material, are records. A subject explain has no code entries, and the writer still does no research.
- **A14.** §3.4:
  - The opening: findings are records, and their outside work is carried as `source:` and never read. `paths: none` means `code 0`, and the commit pins the records.
  - Step 2: a research phase's `topics/` are the bulk of its evidence. A corpus is read only at cited record ids. A finding that rests on an outside work is a `finding` entry with `source:`.
  - Step 3: with `paths: none` there is no code to read.
  - Step 6: the **standing gap** (one `stated` G line, "read by <P>, not by this book"), or attribution in plain words.
- **A15 (OQ1 yes).**
  - §4 *The subject, not the records*: research findings are listed among the records, and a no-code subject is covered by the opening clause.
  - §4.6: the opening includes findings. *What the work recorded* adds that research-phase lines name the findings. A third list, **What the research read**, holds each work marked "read by the research, not by this book", and only works that a cited finding's `source:` names.
  - The typed `sources` block is still not used.
  - There is a second, no-code example.
- **A16.** §5's CLI form now takes `--book-kind <codebase|subject>` and `[--book-subject "<label>"]`, with a bullet on when to send each. The JSON `book` object gains `subject`.
- **A17.** §9.2:
  - A book is codebase or subject.
  - Item 3's outline pins, beside its taught terms, each term's one-line recap, one name per thing, the running examples and numbers, and the linkable section ids.
- **A18.** §9.3: a new closing paragraph, **Written beside other chapters**. It covers:
  - recaps written from the outline's lines;
  - links only to the section ids the outline names;
  - a return that reports the terms taught, the link ids used and the corrections, which are never fixed in the frozen files.
- **A19.** B5 *Inputs*, item 7: earlier chapters are read only through `git show HEAD:<path>`. A sibling not at `HEAD` is judged by the outline's taught terms and recap lines.
- **A20.** B5 *How you check*:
  - Under **Nothing from outside**, three bullets: a finding resting on an outside work, attribution, and the Sources' outside works.
  - *The trace* item 2: for a `finding` entry, its record line and `source:` are the whole entry.
- **A21.** B9 gets the record-entry form's `- source: <title, URL> | none` line and the rule for it. *What an entry supports* gains **A finding entry**.
- **A22.** B9's *The evidence* paragraph: research findings are records, and still nothing is read from outside the records.

### Copies

- The `.agents` copy is its own 4-line frontmatter plus the plugin body after line 6. The description line is identical to the plugin's.
- The web copy is a `cp`.
- `--write-agents` regenerated `plugin/agents/explain-critic.md`.

### Smoke literals

The plugin skill is not pinned by the bootstrap's `tests/retrofit_smoke.sh`, so this slice owes no smoke literals.
