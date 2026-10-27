# P33-n3.S1 — result: the explain skill becomes the explain-phase front door

## Verdict

- status: done
- route: high
- model: opus
- effort: xhigh
- summary: Rewrote the explain skill (0.6.0, 2,635 lines → 2,729) into the explain phase's front door. `/knowledge:explain` parses `quick|no-research|book=|lang=`, finds and readiness-checks the workspace (v86+ and a literal `**unit**` in create-phase's explain route), refuses early (no workspace, too old, a worktree checkout, a public book), checks for a live explain phase on the same subject, drafts the 17-line `## Explain` proposal and asks one confirmation, then on a literal yes hands it to create-phase through the Skill tool. The run card's engine, `resume`/`here`, the out-of-repo dossier, §9.1's proposal flow and the critic's confirm pass are gone. Every cited heading is kept (186/186), and the copies and the critic agent are regenerated.
- files_changed:
  - plugin/skills/explain/SKILL.md
  - .agents/skills/explain/SKILL.md
  - web/public/SKILL.md
  - plugin/agents/explain-critic.md (regenerated)
  - works/phases/active/P33-n3/slices/P33-n3.S1/result.md
  - works/phases/active/P33-n3/phase.md (through `phase-section` only)
- validation:
  - `python3 scripts/skills_parity.py --write-agents`, then `python3 scripts/skills_parity.py`: PASS, exit 0.
  - `python3 scripts/plugin_parity.py`: PASS, exit 0.
  - The citation check from `topics/citations.md`: `citations checked=186 missing=0`, exit 0, plus a read-through of every row.
  - The grep list and the read-through against handoff §7 and §3.5: done (below).
  - Dry run of the front door against this workspace, stopped before the Skill call: READY; two confirmations drafted (below).
  - Refusals on scratch folders (no workspace, a fake v85, a v86 with no `unit` field): each refuses with its text.
  - `claude plugin validate ./plugin` (Claude Code 2.1.311): `✔ Validation passed`, exit 0. Its only warning is ICON_MISSING, which was there before.
  - `python3 scripts/workflow.py validate`: "Workflow validation passed". Its warnings are the old ones: unknown kinds in P22/P26, consolidation owed, stale docs and oversized sections.
- deviations: none against the plan's intent. The judgment calls made in auto are listed under *Other judgment calls*. The ones the plan did not spell out:
  - The critic's scratch folder moved to `<DOSSIER>/pages/critic`.
  - `<BOOK>` was renamed `<UNIT>` in §3.2's stop block.
  - The card keeps the lead's method rules.
  - §3.1 gained one sentence: in an explain phase the brief comes from `## Explain`.
  - Four front-door details came out of the dry run: the heading-line grep, the literal `prior: none`, the book's kind on its `book:` line, and the no-`unit` wording of the too-old refusal.
- doc_impact: product.md/architecture.md: `/knowledge:explain` is the explain-phase front door. It asks one confirmation and hands off to create-phase's explain route; there is no `resume` or `here`; the dossier is the phase's `doc/` or `book/research/`; the page converter lives at `<KB_EXPLAIN_STATE>/tools/`. Plugin 0.7.0 needs workspace v86+ (P33-n3.S1).

New line count, for S2's landing count: `wc -l web/public/SKILL.md` = **2729**. The canonical file has the same count; `.agents/` has 2727 because its front matter is shorter.

## The eight settled items (the plan's, applied)

1. **Where the front door sits.** The opening routes by how the file was reached:
   - invoked as `/knowledge:explain` → §1, which is the front door, to its end;
   - read by path as an explain phase's lead → *The run, in one card*, then §2 and §3 (a book: §9.2 or §9.3);
   - read as the critic's yardstick → B5's *Inputs*.

   The card keeps its heading, the stage table and the runs, minus the `resume` run. Gone from the card: the compaction header, the run-level stop list and its ask-exceptions, and "A repeat is never a new run". §1 *Resolve the topic, the mode and the placement* now holds:
   - the flags;
   - the MODE rules (unchanged; change and topic map to `mode: codebase`, general to `mode: general`);
   - the placement **offers**: a document by default; a chapter or a book only when asked;
   - `### The front door, step by step`, steps 1–8.

   §1's two `p<N>` rules stand side by side without contradiction: a whole-phase **chapter** goes in the `phases` book under key `p<N>`, and a phase-subject **book** is `p<N>`, titled `"P<N>: <phase name>"` (tailed ids keep their form).
2. **`<TOOLS>`.** §2's resolver is byte-stable. `KB_EXPLAIN_STATE` is now only the converter's shared root: `<TOOLS>` = `<KB_EXPLAIN_STATE>/tools/`, so the `allowed-tools` pattern `*knowledge-kb/explain/tools/pagetext.py *` and the operators' manual rules stay valid. `<DOSSIER>` is the folder the phase names (`doc/` or `book/research/`); `<run-id>` = `<KB_NOW>-<slug>`; `<tmp>` in §4–§6 is `<DOSSIER>`. The dossier is committed except `pages/`, which carries its own `pages/.gitignore` (`*`, `!.gitignore`). Nothing lands untracked outside the dossier. If `<TOOLS>` cannot be written, the fallback is `<DOSSIER>/pages/tools/`, not the cwd.
3. **§7 keeps its number**, as "## 7. No copy in the project": the draft is committed in the phase folder (`doc/body.md` or `book/<key>.md`), nothing else is written, and an untracked file would block teardown.
4. **Headless.** Step 7 asks only in an interactive session (`AskUserQuestion` is among the tools). Under `claude -p` or as a subagent it prints the confirmation, says nothing was created, and stops. The repeat check's offer in step 4 behaves the same. Nothing is created without a literal yes.
5. **The repeat check (step 4)** uses Glob and Grep:
   - Glob `phases/active/*/intent.md`, nested under `workflow/works/`, and Grep for a `## Explain` heading line.
   - Read `- subject:`, `- unit:` and `phase.json`. A worktree-stamped phase keeps its live status at `<worktree>/works/phases/active/<P>/phase.json`.
   - Offer to resume (`/do-whole-phase <P>`) or a new version.

   **No `workflow.py` was added to `allowed-tools`.** Read and Glob can see a worktree phase: create-phase commits the phase folder (with `intent.md`) on the main checkout before `parallel-start`, and `parallel-start` commits the `execution` stamp (`worktree` path included) on the main checkout too (`scripts/workflow.py` L6015–6020). In a nested install, `execution.worktree` is the nested worktree (L6274), so `<worktree>/works/...` holds in both layouts.
6. **Refuse early (step 3)**, matching create-phase's own refusal list, no more:
   - a checkout whose path runs through `.claude/worktrees/` (the route re-checks `stream=`);
   - a book or chapter in a public project. This is refused at the confirmation, offering two ways on: make the project private, or write a standalone private document.
7. **The confirm pass is gone.** In §4.10, step 2 now reads: a must-fix may be disputed with evidence, recorded on its line, and the phase's review decides. Step 3 reads: one revision; a must-fix neither fixed nor disputed → `STOPPED: critic`. Steps 2 and 3 keep their numbers. In B5, `#### Confirm mode` and the dispatch block's `confirm:` line are gone, along with every "confirm pass" mention in *The file*, *Never* and the return block. `plugin/agents/explain-critic.md` was regenerated.
8. **Frontmatter**, all three copies:
   - `description` (980 chars, under the 1,024 limit): every explain is an explain phase; it needs a workflow workspace v86 or later and otherwise refuses; it still triggers ONLY when an explanation is to be persisted.
   - `argument-hint`: `<topic or change-ref> [quick|no-research] [book=<slug>] [lang=<xx>]`.
   - `allowed-tools`: dropped `Bash(python3 -I *.knowledge-explain/tools/pagetext.py *)`, the cwd-dossier converter. Nothing was added. `mktemp -d` stays because B5 and B6 still use it.

   The `.agents/` copy carries only `name` and the same `description`.

## Other judgment calls (auto, by recommendation)

- **The card's method rules stay** as "The lead's rules": fail loudly, ask nobody, loop safety, the wait rule, never skip a stage, English. They are the method §3 needs; only the engine parts went. §3.2 and §3.5 now cite the wait rule as "the card's wait rule".
- **The card's D8 and D9 rows:** D8's who is "you; the critic (B5); the review publishes"; D9 is "the review, then its orchestrator", writing the review's `## Report` and the closing report.
- **The critic's scratch** is `<DOSSIER>/pages/critic`, inside the git-ignored `pages/`, so nothing the critic fetches is committed or left untracked.
- **`<BOOK>` → `<UNIT>`** in §3.2's stop block (`doc/` or `book/`). No workspace text cites `<BOOK>`. In the same block:
  - `<ROOT>` is `<KB_EXPLAIN_STATE>`, the root of `<TOOLS>`; its two rules are dropped on the fallback;
  - the `find <ROOT> -maxdepth 2 -name run.md` rule went with the out-of-repo dossier;
  - "run the same request again" became "resume the run (the phase goes on from `run.md`)".
- **`book=<slug>`** means a chapter of that book if it exists, and a new book of that slug if not. A named-book chapter's default position is next after the book's last chapter.
- **The front door runs §2's resolver plus one §3.1 prior read**, because handoff §6 gives the prior lookup to the front door. It stops on an unconfigured or unreadable KB as §2 says. A KB error is never fatal to the prior lookup.
- **Public-project detection** relies on the operator's words; there is no new API probe. **Worktree detection** goes by the `.claude/worktrees/` path; the route re-checks with `next`.
- **The confirmation's "Why:" line** gives a reason for each chosen value, as create-phase's *A confirmed proposal* expects ("each with its reason").
- **Old habits:** a trailing `here` is dropped with one line. `resume` is answered with the live explain phases and `/do-whole-phase <P>`. Any other use of either word is part of the topic.
- **§3.1:** "In an explain phase the brief's fields come from `intent.md`'s `## Explain`, and its `prior:` line, when it is not `none`, names the prior version; otherwise look for one as below." The unfinished-run lookup is gone.
- **§3.3** keeps its heading and the `run.md` format. "Resuming is the workspace's to trigger" leads into five steps: read `run.md`; run D0b again; continue from the recorded stage; apply the resume note (`trust`/`drop`); record it under `## Resume`.
- **§8** is the eight fields the review's `## Report` and the closing report carry. Item 8 is "A book suggested for a scoped-down topic (§9.1)".
- **§9.1** keeps its heading: (a) the front door proposes `unit: book` when asked; (b) the size test scopes a document down, and the report suggests a book. The proposal flow, the workspace probe and *No workspace* are gone.
- **From the dry run:**
  - Step 4 greps for a `## Explain` **heading line**, because a substring grep hit P32's and P33-n3's prose.
  - Step 5 writes a literal `prior: none` on a miss or an error, with the sketch saying `none found` or `none (the knowledge base did not answer)`. The reason: §3.1 and explain-decomposition L136 test `prior:` against `none`. A new book's slug is checked to be free.
  - A book's `book:` line carries `(kind codebase | subject)`, which DECOMP reads with §1's rules.
  - The too-old refusal names the `unit` line, so a v86 that lacks it does not read "v86 … needs v86".

## Goes / shrinks / stays (read-through against handoff §7, §3.5)

- **Goes:**
  - the card's engine (compaction header, run-level stop rules, "A repeat is never a new run"), which became the front door's step 4;
  - the `resume` argument and §3.3's old resume steps, so resuming is `/do-whole-phase <P>`;
  - §1's automatic placement and *A whole book is a suggestion*, which became offers;
  - §2's `KB_EXPLAIN_STATE` dossier and the cwd fallback;
  - §3.1's unfinished-run lookup;
  - §7's `here` copy;
  - §9.1's proposal flow and *No workspace*.

  All gone (grep below).
- **Shrinks:**
  - §3.3 → the `run.md` format and the in-span resume from disk, heading kept;
  - §4.10 → no confirm pass, steps 2 and 3 numbered;
  - §8 → the report fields, item 8 kept.
- **Stays:**
  - §2's resolver (byte-stable);
  - §3.1's prior and translation rules;
  - §3.2's preflight (wording generalized from "book executor" to "an explain phase's executor");
  - §3.4–§3.10;
  - §4's grammar, §4.9 and §5–§6;
  - Part B and the critic's rubric;
  - `pagetext.py`.
- **The front door** follows handoff §7: flags, workspace, readiness, one confirmation, the hand-off. The confirmation follows §3.5's sketch line for line, plus a Phase line, the `## Explain` block and the "Why:" line that *A confirmed proposal* asks for. The search-cap warning appears for a `full` run.
- **Readiness marker:** the workspace version must be ≥ 86 **and** `**unit**` must appear in `## The explain route`, replacing 0.6.0's `must-cover` test.

## The grep list (canonical file; each remaining hit and why it stays)

- `resume` (8 hits):
  - L132–133: the old-habit answer to the `resume` word;
  - L239: step 4's resume offer (`/do-whole-phase <P>`);
  - L580: the §3.2 stop block, "resume the run (the phase goes on from `run.md`)";
  - L648, L652: §3.3's resume note and its `## Resume` record, which the workspace cites (citations §3.3);
  - L845: §3.8's two ways on, "§3.3's resume note";
  - L1520: §9.2, "`run.md` resumes as §3.3".

  All are the in-span resume from disk or the redirect to `/do-whole-phase`. None is the removed argument.
- `here` (word): L131 is the old-habit line for the dropped flag. Every other hit is ordinary English (L27, 225, 274, 300, 315, 420, 489, 505, 861, 872, 1006, 1013, 1152, 1585, 2081). There is no `here` flag.
- `PROJECT_COPY`: 0.
- `KB_EXPLAIN_STATE` (4 hits): L375 is the resolver's print (byte-stable). L392 defines it as "the plugin's state folder … its `tools/` holds the page converter". L406 is `<TOOLS>` = `<KB_EXPLAIN_STATE>/tools/`. L568 is `<ROOT>` = `<KB_EXPLAIN_STATE>`, the root of `<TOOLS>`. None is a dossier root.
- `.knowledge-explain`: 0. `knowledge-explain` appears only in the curl User-Agent string `Mozilla/5.0 (compatible; knowledge-explain)` (L548 probe, L2511 B11), which stays.
- "§9.1's book question": 0. "a repeat's question": 0. "confirm pass": 0. `Confirm mode`: 0. `confirm:`: 0. `cwd`: 0. `<BOOK>`: 0. "book executor": 0. `report.md`: 0.

## Dry run of the front door (this workspace, by hand, stopped before the Skill call)

**Readiness reads and verdict:**
- Step 1: no `workflow/.agentic-nested.json`; `scripts/workflow.py` and `works/` exist → a workspace at the root.
- Step 2: `works/.workspace-version.json` → `"workspace_version": 86` (≥ 86). `.claude/skills/create-phase/SKILL.md` has `## The explain route` (L106) and `**unit**` (L115).
- Step 3: the checkout `/Users/sugang/projects/personal/knowledge` has no `.claude/worktrees/` in its path → not a worktree. No public project was named.
- **Verdict: READY.** A scratch mirror of steps 1–3 printed: "READY: workspace at root, v86, create-phase skill `create-phase` lists **unit** in ## The explain route".

**Step 4, the repeat check:** Glob `works/phases/active/*/intent.md` → 15 phases. Grep for a `^## Explain$` heading line → 0 hits, so there is no live explain phase. A plain substring grep hits P32 and P33-n3, but only on prose mentions; that is why step 4 now names the heading line.

**Step 5:**
- §2's resolver, run exactly as written: `KB_STATUS=configured`, `KB_API_BASE_URL=https://knowledge.hi2vi.com`, `KB_EXPLAIN_STATE=/Users/sugang/.local/state/knowledge-kb/explain`, `KB_NOW=20261027-2035`. The token was redacted in the dry run's output.
- The read-only prior lookups, with the org key: `GET /api/documents?project=knowledge&limit=200` → 200, 5 items, none on the subject → `prior: none` (sketch: `none found`). `GET /api/books/knowledge/p-8jbf` → 404, "no book 'p-8jbf' in project 'knowledge'", so the slug is free.
- A first attempt with Python's default User-Agent got 403 from the host. That is a client artifact; the skill's calls use `curl`.

**Session:** a subagent, with no `AskUserQuestion` → headless. The front door would print the confirmation and stop, which is where this dry run stops.

### Document request: `/knowledge:explain how parallel-start cuts a phase worktree`

```
Explain — confirm once; then it runs to publish.
Phase: Explain: how parallel-start cuts a phase worktree — one standalone document for a developer new to this repo, researched from its code and work records, published private
- unit: document (standalone). Say "a chapter of <book>" or "a book" to change it
- subject: how parallel-start cuts a phase worktree · mode: codebase
- run: full (research team, verifier, gap rounds, critic) · or quick / no-research
- lang: en · reader: a developer new to this repo who knows git and Python, and will run or debug a parallel phase · must-cover: none
- project: knowledge (private) · prior: none found
- runs in its own worktree; stops only for the evidence gate, the critic, or a publish failure
- cost: tens of research agents; manual permission mode needs the preflight's rules (§3.2); every web search, the agents' included, counts against the session's cap (200 by default), so a long run is best started in a session of its own

## Explain

- unit: document
- subject: how parallel-start cuts a phase worktree
- mode: codebase
- book: none
- chapter: none
- prior: none
- run: full
- lang: en (translations: none)
- reader: a developer new to this repo who knows git and Python, and will run or debug a parallel phase
- depth: one document
- must-cover: none
- leave-out: none
- trusted sources: none
- project: knowledge (private)
- visibility: private
- outline sign-off: off
- worktree: yes

Why: mode — parallel-start is this repository's own code (topic mode); reader — the request names none, so a newcomer to the repo; project — the repository's root folder name (§5), private; prior — the knowledge project holds no document on this subject.
Reply yes, or change any line.
```

### Book request: `/knowledge:explain P-8jbf, as a book`

```
Explain — confirm once; then it runs to publish.
Phase: Explain: P-8jbf — a book on phase P-8jbf (Wide reader on big screens) for a developer new to this repo, researched as a whole, outlined and signed, published private
- unit: book (asked for). Say "a document" to change it
- subject: P-8jbf · mode: codebase
- run: full (research team, verifier, gap rounds, critic) — a book is always full
- lang: en · reader: a developer new to this repo who will change the reader's layout · must-cover: none
- project: knowledge (private) · prior: none (a new book: p-8jbf is free)
- runs in its own worktree; stops only for the evidence gate, the critic, a publish failure, the outline gate and the acceptance gate
- cost: a book is several runs' worth of research agents; manual permission mode needs the preflight's rules (§3.2); every web search, the agents' included, counts against the session's cap (200 by default), so a long run is best started in a session of its own

## Explain

- unit: book
- subject: P-8jbf
- mode: codebase
- book: p-8jbf — "P-8jbf: Wide reader on big screens" (kind codebase)
- chapter: none
- prior: none
- run: full
- lang: en (translations: none)
- reader: a developer new to this repo who will change the reader's layout
- depth: about 3 chapters
- must-cover: none
- leave-out: none
- trusted sources: none
- project: knowledge (private)
- visibility: private
- outline sign-off: on
- worktree: yes

Why: unit — the operator asked for a book; book — a phase subject gets that phase's own book, `p<N>` titled "P<N>: <phase name>", the tailed id kept (`P-8jbf` → `p-8jbf`), kind codebase; depth — the phase has one build slice and one fix (S1, F1) plus its 1600px decision; outline sign-off — a book's is on, fixed; project — the repository's root folder name, private.
Reply yes, or change any line.
```

### The `## Explain` block, field by field, against create-phase's route (L115–131, the required set, *A confirmed proposal*)

| Field (create-phase order) | Document | Book | Route's rule | Holds |
|---|---|---|---|---|
| unit | `document` | `book` | `document` default, `book`, `chapter`; always written | yes |
| subject | free topic | `P-8jbf` (a real phase) | phase id, slice id or free topic | yes |
| mode | `codebase` | `codebase` | `codebase` or `general` | yes |
| book | `none` | slug and title, kind | `none` for a document; a book's slug and title by §1's rules | yes (the kind is extra, consistent with "of kind codebase or subject") |
| chapter | `none` | `none` | `none`, or `<key> — "<title>" · position <n>` | yes |
| prior | `none` | `none` | `none` or `<rel_path> v<N>` / `<book>/<key> v<N>` | yes |
| run | `full` | `full` | default `full`; a book always `full` | yes |
| lang | `en (translations: none)` | same | `en (translations: none)` unless named | yes |
| reader | who, what they know, what they will do | same | the same three parts | yes |
| depth | `one document` | `about 3 chapters` | `one document`; a book about how many chapters | yes |
| must-cover | `none` | `none` | points or `none` | yes |
| leave-out | `none` | `none` | or `none` | yes |
| trusted sources | `none` | `none` | or `none` | yes |
| project | `knowledge (private)` | same | must be private | yes |
| visibility | `private` | `private` | always `private` | yes |
| outline sign-off | `off` | `on` | `off` default; a book `on`, fixed | yes |
| worktree | `yes` | `yes` | `yes` default | yes |

Per-unit required set: the document has `book: none`, `chapter: none` and `depth: one document`; the book has `chapter: none`, `run: full` and `outline sign-off: on`. All seventeen lines are present in create-phase's order, one a line. The sketch joins fields with ` · `, which *A confirmed proposal* already writes one a line. The phase name `Explain: <subject>`, the objective, every field and its reason (the "Why:" line, plus the request's words and the defaults) are all in the proposal.

## Refusals (scratch folders under the session scratchpad, `refuse/`)

The mirror script is `frontdoor_check.py` in the session scratchpad. It applies steps 1–3 as the skill words them.

- **no workspace** (`refuse/nows/`, a folder with only `src/app.py`): "Explain runs as an explain phase in a workflow workspace (v86 or later), and this repository has none. Install one with the agentic workspace bootstrap (`bootstrap_agentic_workspace.sh`), then ask again."
- **a fake v85** (`refuse/v85/`, with `scripts/workflow.py`, `works/.workspace-version.json` = 85, and a create-phase with no explain route): "This workspace (v85) cannot run explain phases from the knowledge plugin: they need v86 or later, whose create-phase explain route writes a `unit` line. Run `/update-workspace`, then ask again."
- **a v86 with no `unit` field** (`refuse/v86nounit/`, an explain route listing only `**subject**`): the same too-old refusal, with "(v86)". This case is why the refusal now names the `unit` line.
- **this workspace:** READY (above).

Nothing was run, created or written in any of them beyond the scratch fixtures.

## Citation read-through

All 186 rows resolve (`missing=0`). Spot-checked against their citing text:
- §1: MODE per chapter; `p<N>` as a phase-subject book and `p<N>` as a `phases`-book chapter key, both stated; the slice key.
- §2: one `python3 -c` call; `<DOSSIER>` = the phase's `doc/`; `<tmp>` is `<DOSSIER>`.
- §3.1: the brief's fields; the prior; the placement's book GET.
- §3.2: probe A in the foreground for a subagent lead; `FAILED: permissions` with the lines for a lead that read the skill by path.
- §3.3: the `run.md` format, D0b first, `trust`/`drop`, the mode block's `dossier: · tools:` line.
- §3.8 and §3.9: unchanged.
- §4.10: the foreground critic on the other family; `quick` goes straight to §5; steps 2 and 3.
- §8: the report fields and item 8.
- §9.1: the size test and the suggestion.
- §9.2 and §9.3: items 1–5 numbered.
- B5: the dispatch block keys (`mode: critique · kind:`, `draft:`, `critique:`, `dossier:`, `skill:`, `scratch:`, `writer_model:`, `same-model: accepted`, `chapter:`), the same-model rule, the severities.
- B9: unchanged.

The unnumbered items hold:
- *The run, in one card* keeps its heading and the map.
- The five agents keep their names; the critic keeps `maxTurns`; the part-b markers are well formed (parity PASS).
- The README heading is S2's.
- *A confirmed proposal* receives exactly what step 8 hands off.

## Notebook

Written through `phase-section P33-n3`:
- a `## Decisions` entry (the eight items) and one for the other calls;
- one `## Doc impact` line;
- the DECOMP note for S1 consumed (`--entry 1 --remove`);
- a note for S2;
- `## Now` rewritten.
