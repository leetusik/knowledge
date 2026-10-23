# P90.DECOMP — research the book, outline it, cut its chapters

This is an explain phase (`intent.md` carries `## Explain`), so this `DECOMP` follows
`.claude/skills/do-whole-phase/reference/explain-decomposition.md`, *What the plan asks the executor to do*. You
are the **lead** of the book's research run: `slice-executor`'s explain carve-out lets you dispatch the research
agents the skill names, each prompt starting with the line `slice: P90.DECOMP`.

## Checked before planning (the orchestrator)

- `## Explain` has all eleven fields; `visibility: private`; `lang: en`; the project `s9-wal` is private and new.
- **The explain skill:** `/Users/sugang/projects/personal/knowledge/plugin/skills/explain/SKILL.md`, plugin
  version **0.6.0** (this rehearsal loads the plugin from that folder; `installed_plugins.json` is not consulted).
- **Permissions and the search cap:** the research agents run on this session's permissions (its allow rules
  cover the skill's §3.2 list and this workspace, and, since attempt 1 stopped on them, the lead's own calls:
  `Bash(python3 -c *)` for §2's resolver and §3.2's converter copy, `Bash(which pdftotext)`, and §3.1's
  `find <KB_EXPLAIN_STATE> -maxdepth 2 -name run.md`); every web search, the agents' included, counts against
  the session's cap.
- **Attempt 2.** Attempt 1 returned `needs_operator` at §2 (`FAILED: permissions` on the resolver); nothing of
  its run was written, so this run starts at §2.
- **Spends money:** no (the research agents are the workspace's own dispatches).

## What to do

1. **Read the skill** at the path above: its run card, §3 and §9.2, and Part B where they send you.
2. **Lead the whole-book research** per §9.2, into the dossier `works/phases/active/P90/book/research/`:
   - **first**, write `book/research/pages/.gitignore`, two lines, `*` then `!.gitignore`;
   - the run id is `<KB_NOW>-sqlite-wal` (`KB_NOW` from the skill's §2 resolver); `run.md` holds its state (§3.3);
   - the brief (D0) from `## Explain`: subject, mode `general`, reader, depth, must-cover, leave-out, trusted
     sources and `lang: en`, placement `book sqlite-wal`;
   - the evidence: a free topic in `general` mode, so the web;
   - **every prompt you send an agent starts with the line `slice: P90.DECOMP`**, then the dispatch block the
     skill gives: the preflight's probe agents (§3.2) and every researcher, gap reviewer and verifier;
   - the questions, waves, gap rounds and ceiling are §9.2's, then D5–D5s and `gaps/final.md`. There is no gate
     stop: what would fail D5g is a weak spot, reported in the summary.
3. **Write `works/phases/active/P90/book/outline.md`**, drawn from the ledger, in the shape
   `explain-decomposition.md` step 3 gives: the book (slug `sqlite-wal`, title "SQLite's write-ahead log", kind
   `subject` with its subject label), the private project `s9-wal`, `lang`, the skill's path and version, the
   dossier and its run id; the reader; the brief; the order and prerequisites with the defined terms; and each
   chapter's entry with its key, title, position, goal, **reader tasks** (2–4, each with its deliverable), mode,
   sources, questions, claim ids with statuses, declared gaps, **expected top-up**, must-cover items, diagrams and
   figures, quiz targets, tags and images; and what is out of scope. Two chapters, as `depth` says; add the
   optional `sources` chapter only if this reader would use a reading list.
4. **Write `book/research/summary.md`** per §9.2 item 6.
5. **Cut one bare chapter slice per chapter** with `new-slice ... --kind implementation --risk high --order <10k>`
   (no engine here: log the commands, as `CLAUDE.md` says), naming the one trigger in the breakdown.
6. **Update `phase.md`:** `## Decisions` (one line for the book), `## Notes for later slices` (the defined-terms
   list, for every chapter), `## Now` (the outline awaits the operator's signature).
7. **Write `result.md`** in this slice folder, its verdict block first, and return `done` once the outline and
   the summary are written and the slices cut. A research run that stops returns instead, as
   `explain-decomposition.md` step 7 says.

## Validation

- `book/research/pages/.gitignore` is exactly `*` and `!.gitignore`; `git status --short --ignored` shows
  nothing under `pages/` but that file as addable.
- Every claim id the outline names exists in `book/research/ledger.md`; every `S-` id it names in `library.md`.
- `run.md` says where the run stopped and why.

## Dispatch

slice=P90.DECOMP
phase=P90
kind=decomposition
risk=high
attempt=2
route=high
reason=kind decomposition
subagent_type=slice-executor
model=opus
pass_model=yes
effort=xhigh
pass_effort=yes
attribution=Claude Opus 5.5
explore_model=haiku
explore_effort=xhigh
