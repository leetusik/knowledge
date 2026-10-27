# Handoff: every `/knowledge:explain` runs as its own explain phase

**For:** the session that builds the next workflow version in the bootstrap repo
(`/Users/sugang/projects/personal/bootstrap_agentic_workspace.sh`).
**From:** phase P-9sz6 of the knowledge repo (`/Users/sugang/projects/personal/knowledge`).
**Status of the decisions below:** the operator's, already confirmed (P-9sz6 `intent.md`,
*Confirmed Intent* and *Clarifications Resolved*). This document is the data to build from. It does
not override that repo's own rules (`CLAUDE.md`, its nested workflow, its release process).

**How to read the citations.** `payload/…`, `installer/…`, `tests/…` and `changelog.d/…` are paths in the
bootstrap repo, read at workspace **v83**. `plugin/…` is this repo's knowledge plugin, at **0.6.0**
(`plugin/.claude-plugin/plugin.json`). `L<n>` is a line number located by reading on 2026-10-27;
re-locate by the quoted heading if the files have moved. "Recommend" means the workflow author decides.

---

## 1. Summary

Today the same research-and-write pipeline runs on **two engines**. A single document runs inside the
plugin skill (`plugin/skills/explain/SKILL.md`), with its own state machine (`run.md`, *The run, in
one card* L22), its own resume (§3.3 L459), its own stop rules (L65–101) and its own compaction recovery
(L24–27). A book runs as a workflow **explain phase** (`payload/claude/skills/create-phase/SKILL.md`
*The explain route* L103; `payload/claude/skills/do-whole-phase/reference/explain-*.md`). Each fix to
staging, resuming or stopping has to be made twice, and the two will drift.

After this change there is **one engine: every explain is a phase.** `/knowledge:explain` confirms once
and then creates **and runs** a dedicated explain phase in the current repo's workspace: a standalone
document by default, a book or a chapter only when asked, one phase per publishable unit, in its own
worktree so it never blocks product work, with the workspace required. The plugin keeps the research
method, the writing rules, the critic and the publish API. The workflow owns everything about running.

## 2. Today vs. new

| | Today (v83 + plugin 0.6.0) | New |
|---|---|---|
| Placement default | By subject: a phase goes into the `phases` book (chapter `p<N>`), a slice into the `p<N>` book; everything else is a loose document (plugin §1 *Where it goes* L152–174) | A **standalone document**, always, unless the operator asks for a book or for a chapter in one. A phase or slice subject is *offered* as a chapter at the start; the default is standalone |
| Who asks about a book, and when | The plugin, twice: before §2 when the request names a book, and after D1 when the plan is oversized (§9.1 L1359–1397) | Nobody mid-run. The one confirmation at the start fixes the unit. An oversized topic is scoped down at D1, and the final report suggests a book |
| Where a single document runs | Inside the plugin's own engine (run card L22–101, §3.3) | In an explain phase (`unit: document`) |
| Unit per phase | A book only. "A single chapter is not a phase: that is the operator's own `/knowledge:explain`" (create-phase L31) | One **publishable unit**: a document, a book, one chapter added to a book, or a v2 |
| Worktree | Default stream. A worktree only on the operator's word (`payload/contract.md` L49; `parallel-phase/SKILL.md` L10–20) | Its **own worktree by default**, for explain phases only. Merges back by itself |
| Workspace | Not needed for a document. Needed for a book (§9.1 *No workspace* L1372) | **Required** for every explain. No fallback engine |
| Acceptance gate | `--require` for every explain phase (create-phase L153; `explain-decomposition.md` L77) | Document and chapter: **waived**. Book: **required** |
| Outline sign-off | A book's outline gate is mandatory (`explain-decomposition.md` L73–104). A document has none | Book: kept (the signed outline is why a book is one phase). Document and chapter: **off by default**, `outline sign-off: on` on request |
| Dossier | Document: `~/.local/state/knowledge-kb/explain/<run-id>/`, outside every repo, never committed (§2 *The run's dossier* L261–268). Book: `book/research/` in the phase folder, committed except `pages/` (§9.2 L1405–1408) | Always **inside the phase folder, committed except `pages/`**: `doc/` for a document or chapter, `book/research/` for a book |
| Create vs. run | `create-phase` creates and STOPs. The operator runs `/do-whole-phase` (create-phase L74, L145) | `/knowledge:explain` (or `/create-phase` with an explain request) **creates and runs** after one confirmation |

## 3. The decisions

### 3.1 A standalone document by default; a book or chapter only when asked

- **Rule.** An explain produces one standalone document. A book is created, or a chapter added to an
  existing book, only when the operator asks for it in their own words or at the confirmation. The
  placement is confirmed **once, at the start**. §9.1's after-plan question (b) goes away. When D1 finds
  the topic is over one document (§9.1's size test, L1361–1363: about 25 questions, 7 top-level sections,
  tier 3 on two axes, or more than 10 researchers in wave 1), the run **scopes the document down** to what
  one document carries. It records the cut in `## Decisions` and in the outline's `## Not used`, and the
  closing report suggests a book for the rest. §1's automatic `phases` / `p<N>` placement for phase and
  slice subjects becomes an **offer at the start**, defaulting to standalone.
- **Why.** The operator's words: "explain default is making a document not book. create or update book
  only asked. but agent can confirm at the begining." A mid-run question breaks "runs to publish without
  further stops".
- **What changes.** Workflow: create-phase *The explain route* L105–121 (the route now covers every
  unit, and its field list gains `unit`). Plugin, later (§7): §1 L152–178 and §9.1 L1359–1397.

### 3.2 Every explain is a dedicated explain phase; the workspace is required

- **Rule.** Every explain runs as an explain phase in the **current repo's workspace** (nested or
  at-root). There is no fallback engine outside a workspace: with none, `/knowledge:explain` refuses and
  says how to install one. **General topics** are the operator's own matter: they run them from a
  dedicated repo with its own workspace, and the workflow needs **no special case** for that. `mode:
  general` (the web and the operator's material are the evidence, create-phase L109) still exists
  inside any workspace, for a topic with no code behind it.
- **Why.** "the whole process of creating knowledge documents is based on workflow's phase. dedicated
  one." "workspace required." "the general topics will be asked on dedicated repo. you don't worry
  about it." A second engine is what drifts.
- **What changes.** The plugin loses its out-of-workspace path (§7). On the workflow side, nothing new
  detects "general". The phase marker stays the `## Explain` section (create-phase L140;
  `explain_phase()` in `payload/scripts/workflow.py` L3435–3438). Add a reader for its `unit:` field
  (absent means `book`, so every existing explain phase keeps its meaning).

### 3.3 One phase per publishable unit

- **Rule.** A document is one phase. A book is one phase with chapter slices, unchanged: its shared
  research and its signed outline need one home. One chapter added to an existing book is one phase. A
  **v2** is a new phase whose `## Explain` names the prior document and version (`prior:`, §5).
- **Why.** "one phase per a document." The phase is already the unit of state, review and worktree
  (`parallel-phase/SKILL.md` L27).
- **What changes.** This **reverses** create-phase L31: "A single chapter is not a phase: that is the
  operator's own `/knowledge:explain`." Delete that sentence and say instead that every explain unit is
  a phase. The engine's sequential rule for explain chapters (`workflow.py` L3432–3438, L5195, L5268)
  needs no change, since a document phase has one middle slice.

### 3.4 Its own worktree by default

- **Rule.** An explain phase starts in its own worktree unless the operator says to run it here
  (`worktree: no`). This reverses "a worktree starts only on the operator's word" **for explain phases
  only**. That rule lives in `payload/contract.md` L49; `parallel-phase/SKILL.md` §1 rule 1 L39–43 and
  guardrail L423 ("Never `parallel-start` a phase the operator did not ask about"); create-phase step 4.4
  L67–72 ("Say nothing about worktrees"); and `do-whole-phase/reference/worktree.md` L3 ("Never run
  `parallel-start` on your own initiative"). Each of those gets one sentence: *an explain phase is the
  exception: its confirmation is the operator's word.*
- **Why.** "default by done in it's own worktree. so that it doesn't block anything." Be precise about
  what that buys: **stream isolation**. The default stream's `next` skips a stamped phase
  (`parallel-phase/SKILL.md` §3 L166–169: stream membership is the current branch against the stamped
  `execution.branch`). An explain's `pending` stops (the evidence gate, a critic stop, a book's two gates)
  halt only its own stream (L170–171). Product phases keep flowing on `main`, whether from another session
  or from this one after it exits the worktree at a stop. One session still drives one checkout at a
  time. Document that a long full run is best started in a session of its own.

**The lifecycle, on the real machinery** (`parallel-phase/SKILL.md`):

| Step | Who and what |
|---|---|
| Start | The explain route, right after the intake commit, runs `parallel-start <P>` (§2 L102–139): the stamp commit `chore(works): opt <P> into parallel execution` holds only the phase folder and the five `works/` files (L116–121). Then `EnterWorktree` with the printed path, and `next` prints `stream=phase/P<N>-<slug>` (L134–137) |
| Branch and path | `phase/P<N>-<slug>` at `<repo>/.claude/worktrees/P<N>-<slug>` (§1 rule 2 L44–48). Recommend phase names that start `Explain: <subject>`, so branches read `phase/P-7kq2-explain-<subject>` |
| Default stream | `next` skips it and prints `parallel_phases_elsewhere=<P>:<branch>`. The backlog's `## Streams` table shows it (§3 L166–182) |
| Merge-back | Document or chapter: right after the review's `pass` (gate waived), the explain run integrates it by itself (§5 L246–298): `parallel-gate` → `ExitWorktree keep` → `git merge --no-ff … -m "merge(P<N>): <name>"` → `parallel-merge-finish` → commit → `parallel-teardown` → commit. Book: the same, after the operator's `accept-gate <P> --clear`. A book's `pass` already implies acceptance (§4 L240–244) |
| Cleanup | `parallel-teardown <P>` (L295–298). At root, `git worktree remove` drops the ignored `pages/` silently. In a nested install, teardown refuses ignored files unless `--discard-ignored` (L329–333; `workflow.py` L6357 `_ignored_worktree_files`), so the explain sequence passes it. `pages/` is a cache: every passage used is quoted in the committed findings files and library (plugin B9 L2253–2268) |
| Several at once | Each has its own branch and worktree. Any session can drive any of them. Merges serialize ("never merge two phases into the same quiet point at once", L417–418). `parallel-status` lists them all. Two explain merges can conflict only in the generated files, which are taken from either side and regenerated (L271–276). `works/events.jsonl` merges as `union` and never conflicts (`payload/gitattributes`) |

**Why the automatic merge is safe, and what must stay true.** An explain branch touches only
`works/phases/active/<P>/**` (the notebook, the slices, the dossier, the draft) and the five `works/`
files. That holds only while an explain phase:

- writes **no doc versions**: nothing under `docs/versions/`, `docs/index.json` or `docs/current/`
  (already true; `explain-review.md` L75);
- leaves **no `## Doc impact`** notes and appends **no `## Regression Checklist`** line (create-phase
  L153; `explain-review.md` L70);
- touches **no product file and no other phase's folder**;
- keeps fetched `pages/` ignored (`pages/.gitignore` = `*`, `!.gitignore`; `explain-decomposition.md` L18).

**Three collisions with today's engine** (the workflow author's calls; §9 gives recommendations):

1. **`parallel-gate` refuses while `main` is busy.** It closes when any default-stream phase is
   `in_progress`, `in_review`, `pending` or `blocked` (`workflow.py` L6922–6927; `BUSY_PHASE_STATUSES`
   L469). During product work `main` is nearly always busy, so "merges back by itself" would almost never
   happen. The quiet point protects merges that may conflict with in-flight product work, and an
   explain branch cannot. Recommend an exemption that the engine **checks** rather than assumes: the gate
   skips the busy-main reason when the branch's diff since its merge-base touches only
   `works/phases/active/<P>/**` and the `works/` files. A branch that touched anything else falls back to
   the quiet point.
2. **Every worktree phase owes consolidation, even with zero notes.** `parallel-start` stamps
   `execution.consolidation: "pending"` (`workflow.py` L5764 at root, L6081 nested). `phase_consolidation()`
   falls back to it (L2555–2580), and archiving stays blocked until `parallel-consolidated <P>`
   (`parallel-phase/SKILL.md` L300–306). The review's pass stamps debt only when notes exist (L5388–5400).
   With nothing changed, every explain phase would sit unarchivable. Recommend: a passing review with an
   empty `## Doc impact` flips a worktree phase's `pending` to `done`. That is generic and right for any
   worktree phase that changed no durable truth.
3. **A nested install requires `--host-branch`,** a host branch named by the host's custom and confirmed
   by the operator (`parallel-phase/SKILL.md` §2 *Starting in a nested install* L141–156; `workflow.py`
   L58, L13244). An explain phase makes no host commit, so the name is pure friction. Recommend a
   **detached host worktree** for explain phases: no branch, nothing to name, nothing to integrate on the
   host. It keeps the pair layout that `EnterWorktree` and `python3 workflow/scripts/workflow.py` rely on
   (L66–69). A codebase explain then reads the host code at the HEAD it was cut from, which is what "the
   code as it is now" means.

**Two more things to verify while building.** (a) Manual-mode research permissions live in
`.claude/settings.local.json` (`explain-decomposition.md` L9), which is untracked. An at-root worktree
does not carry it. Confirm a worktree session still sees those rules, or the preflight's `FAILED:
permissions` fires inside the worktree (auto mode needs none). (b) `parallel-start` refuses on a parallel
stream (§2 L108–114). An explain asked from inside a product phase's worktree must not create its phase
on that branch.

### 3.5 `/knowledge:explain` creates **and** runs

- **Rule.** There is **one confirmation at the start**: the topic; the unit (document, book, or a
  chapter of a book); the run (full, quick or no-research); the language; and whatever must-cover or
  reader the request leaves open. It also names the cost and the permissions the research needs, which
  today's plan-gate report carries (`explain-decomposition.md` L9). On the operator's literal yes, the
  explain route creates the phase, starts its worktree and runs it per `do-whole-phase` in **`auto`** to
  publish, without further stops except the quality stops. Those are typed `pending` stops (the stop
  kinds are in `workflow.py` L356–363):
  - the **evidence gate**: `--stop-kind decision`;
  - a **critic stop** (failed twice): `decision`;
  - a **publish failure** (a refusal twice, a rejected key, a public project): `operator-action`.

  The research infrastructure stops stay as `explain-decomposition.md` L68–71 has them: permissions and
  the search limit return `needs_operator`, and a dead web returns `blocked`. A book adds its outline gate
  and its acceptance gate. A sketch of the confirmation:

  ```
  Explain — confirm once; then it runs to publish.
  - unit: document (standalone). Say "a chapter of <book>" or "a book" to change it
  - subject: how a re-explain versions a document in place · mode: codebase
  - run: full (research team, verifier, gap rounds, critic) · or quick / no-research
  - lang: en · reader: a developer new to this repo · must-cover: none
  - project: knowledge (private) · prior: none found
  - runs in its own worktree; stops only for the evidence gate, the critic, or a publish failure
  - cost: tens of research agents; manual permission mode needs the preflight's rules (§3.2)
  Reply yes, or change any line.
  ```
- **Why.** "/knowledge:explain creates and runs" was the recommendation the operator approved. The
  precedent is `/rotate-backlog`: the invocation is the operator's yes, then it creates the phase and
  "continue[s] as `resume`" in `auto` (`rotate-backlog/SKILL.md` L11, `create` branch steps 2–4 L53–55,
  `resume` step 3 L48: "The `/rotate-backlog` invocation is the explicit `auto` that the contract's
  decomposition carve-out requires").
- **What changes.** These places must say it:
  - `payload/contract.md` L19, *Making a phase ≠ executing it*. "The one exception, `/rotate-backlog`"
    becomes two exceptions: rotate-backlog and the explain route, which creates and runs its explain
    phase after one confirmation. L13's exceptions list already lets the agent call `create-phase` "when
    instructed".
  - create-phase: the intro L9; *Who may invoke it* L11, beside rotate-backlog's exception; step 3 L33;
    step 5 L74 ("Commit, then STOP"); and *A confirmed proposal* L142–145, which today ends "commit and
    STOP … Run `/do-whole-phase`".
  - `do-whole-phase/reference/explain-decomposition.md` L3: `auto` comes from the route, so `DECOMP`
    plans inline.

  **Compatibility:** a proposal with no `unit:` field comes from a 0.6.0 plugin, whose §9.1 L1389–1397
  itself stops with "Run `/do-whole-phase`". Create that phase as a book and STOP, as v81 does (§8).

### 3.6 The smaller defaults

- **Acceptance gate.** For a standalone document, `accept-gate <P> --waive --note "standalone explain
  document: published private; a v2 is cheap"`. For a book, `--require` (unchanged). Recommend waived for
  a chapter too (§9). What changes: `do-next-slice/reference/decomposition.md` L7 ("An explain phase …
  always takes `--require`"), `explain-decomposition.md` L77, create-phase L153.
- **Outline sign-off.** Off by default for a document or chapter, and on when `## Explain` says
  `outline sign-off: on`. A book keeps its signed outline: the intent's own reason for a book being one
  phase is "its shared research and signed outline need one home".
- **Dossier.** Committed with the phase except the downloaded pages (the book rule, §9.2 L1405–1408).
  For workspace runs it replaces the out-of-repo `~/.local/state/knowledge-kb/explain/` dossier (§2
  L261–268). In a nested install the dossier lands in the nested repo, never in the host's history. At
  root it lands in the product repo's history, archived with its phase.

## 4. The single-document explain phase

**Recommendation: the `DECOMP` leads the research, then makes a fixed cut.** This is the book's shape
with one chapter. A book's `DECOMP` leads the whole-book research and writes the outline before cutting
(`explain-decomposition.md` L12–62). A document's `DECOMP` leads the document's research run, writes the
reader's path (D6), and then always cuts exactly one write slice. Why this shape:

1. One shape for every unit. `explain-chapter.md` and `explain-review.md` are reused nearly verbatim.
2. The research is the long high-row span anyway. A separate research slice adds a dispatch and a
   findings hop with no isolation gained.
3. The evidence gate stops the run before anything is cut.
4. The acceptance gate is declared at the `DECOMP` boundary, where the contract wants it.

A template cut with no `DECOMP` dispatch would need `new-phase` to special-case a phase (today it creates
only `DECOMP` and `REVIEW`, create-phase L48), and the research would still need a home.

```
P<N> (unit: document)
  DECOMP  decomposition, high row: research lead (D0–D5g) and D6 → doc/outline.md; cuts S1
  S1      implementation, risk high (open design: writes alone from the evidence), undeclared:
          span 1 write and check → span 2 critic (orchestrator) → span 3 revise
  REVIEW  review, high row: check, publish private, prove private, read it back, rule on disputes
```

**Layout.** `works/phases/active/P<N>/doc/` **is** the plugin's single-document dossier, `<DOSSIER>`
(B9 L2253–2268): `brief.md`, `plan.md`, `run.md`, `outline.md`, `findings/`, `library.md`, `ledger.md`,
`verify/`, `gaps/`, `trace.md`, `critique.md`, the draft `body.md`, `assets/`, and `pages/` (ignored).
The draft stays in the dossier, as the plugin's §2 rule (`<tmp>` = `<DOSSIER>`) has it, so §4–§5 paths
need no translation. The critic's `kind: document` dispatch also works unchanged: it reads
`<dossier>/brief.md` and `<dossier>/outline.md` and writes `<dossier>/critique.md` (B5 *Your dispatch* L1815–1824, *Inputs* L1836–1850). Do
not name the folder `explain/`. The installer treats any path with an `explain` component as the
plugin's (`installer/main.py` L1362–1365).

| Today's stage (run card L22–46) | In the phase |
|---|---|
| §1 and §9.1: intake and placement | The one confirmation → `intent.md` `## Explain` |
| §2: KB config | Each executor that calls the KB runs §2's resolver itself |
| D0: brief and prior (§3.1) | `DECOMP`, from `## Explain`. The prior comes from `prior:` or §3.1's lookup |
| D0b: preflight | `DECOMP` (probe agents in the foreground, `explain-decomposition.md` L23) |
| D1–D5s | `DECOMP`. **quick**: the lead alone plus one verifier batch (§3.9 L704). **no-research**: the repository only, with no web probe (§3.9) |
| D5g: evidence gate | Below it, `DECOMP` returns `needs_operator`. The orchestrator sets `<P>.DECOMP pending --stop-kind decision --on-words "trust <source> / drop <item> / narrow the subject: DECOMP resumes from run.md"` and appends the reply as `## Attempt <n>`, as a chapter does today (`explain-chapter.md` L78–81) |
| D6: the reader's path | `DECOMP` writes `doc/outline.md`, then cuts `S1` and records the gist in `## Decisions` |
| Outline sign-off | Only with `on`: S1 waits `pending --stop-kind decision` before span 1. `accept` runs it; feedback re-runs `DECOMP` from `run.md`, as the book gate does (`explain-decomposition.md` L91–104) |
| D7 and §4.8–§4.9: write and check | S1 span 1: `body.md`, `trace.md`, `knowledge check` to exit 0, and the `## Publish` section (`explain-chapter.md` L60–93) |
| D8: critic | S1 span 2: the orchestrator dispatches `knowledge:explain-critic`, `kind: document`, `model: opus`, `same-model: accepted` (`explain-chapter.md` L96–149). **quick** has no critic (§4.10 L1124), so S1 is one span |
| D8: one revision | S1 span 3. No confirm pass (§4.10 L1146–1149): the review rules on a dispute, as for a book |
| §5: publish | REVIEW: check, `save` private, privacy probe. A document's anonymous probe is `GET /app/orgs/<org>/<project>/<slug>` (`server/documents_api.py` L415 in this repo: 404 when private). The control is `/api/documents/by-path/<rel_path>` with the org key |
| Read in the reader | REVIEW, through Aside, when `## Operator Runtime` names an agent account signed in to the reader. A document's gate is waived, so recommend falling back to an API read-back (and saying so) rather than adding a stop. A book keeps the mandatory read (`explain-review.md` L56–65) |
| D9: report (§8) | The orchestrator's closing report after the merge: title, URL, version, run, research counts, critic, gaps, the dossier path, and a book suggestion if the topic was scoped down |

**A v2.** `prior: <rel_path> v<N>`. D0 reads the prior's `source` and carries every surviving id forward
(§3.1 L300–352). The publish uses `--new-version --rel-path` for a loose document, or the same book and
key for a chapter. The dossier is fresh. If the v1's phase folder is still in the repo (active or
archived), its `doc/library.md` and `ledger.md` are **scouting leads** for D1, re-opened before use and
never evidence as they stand.

**Add a chapter.** `unit: chapter` and the existing `book:`, plus `chapter:` (key, title, position). It
runs a fresh single-unit research run with the `doc/` layout. A §9.3 top-up does not fit: the book's
frozen dossier belongs to the original phase and may be archived. D0 reads the book's chapters (`GET
/api/books/<project>/<book>`, §3.1) and, when the book came from a phase in this repo, its
`book/outline.md`, for the defined terms and prerequisites. The publish carries the book and chapter
flags. On 0.6.0 the critic runs `kind: document`, so the order rule (no term used before the chapter
that defines it) is the review's job, reading the book in the reader.

## 5. The `## Explain` section, extended

Today there are eleven fields (create-phase L107–118: subject, mode, book, lang, reader, depth,
must-cover, leave-out, trusted sources, project, visibility). Add:

| Field | Values | Default |
|---|---|---|
| `unit` | `document` \| `book` \| `chapter` | `document`. **Absent reads as `book`**, for back-compat |
| `chapter` | `<key> — "<title>" · position <n>` | `none` (required for `chapter`) |
| `prior` | `none` \| `<rel_path> v<N>` (document) \| `<book>/<key> v<N>` (chapter) | `none`. The intake fills it when a lookup finds one |
| `run` | `full` \| `quick` \| `no-research` | `full`. A book is always `full`. `no-research` only in the operator's words (plugin §1) |
| `outline sign-off` | `off` \| `on` | `off`. A book is `on`, fixed |
| `worktree` | `yes` \| `no` | `yes` |

For a document, `book: none` and `depth: one document`. The "all eleven fields present" checks
(create-phase L143; `explain-decomposition.md` L7) become a required set per unit. `visibility` stays
`private`, always.

```markdown
## Explain

- unit: document
- subject: how a re-explain publishes the next version of the same document
- mode: codebase
- book: none
- chapter: none
- prior: none
- run: full
- lang: en (translations: none)
- reader: a developer new to this repo who knows Python and HTTP, and will touch the publish path
- depth: one document
- must-cover: the 409 → new-version path; why heading and quiz ids survive a version
- leave-out: the web reader's styling
- trusted sources: none
- project: knowledge (private)
- visibility: private
- outline sign-off: off
- worktree: yes
```

```markdown
## Explain

- unit: chapter
- subject: P-9sz6 (every explain runs as a phase)
- mode: codebase
- book: p30 — "P30: native chapters" (exists, 6 chapters, project private)
- chapter: explain-phases — "Explains as phases" · position 7
- prior: none
- run: full
- lang: en (translations: none)
- reader: the book's reader, as its outline states
- depth: one chapter
- must-cover: the document phase's three slices; the automatic merge
- leave-out: the plugin's research roles (chapter 3 teaches them)
- trusted sources: none
- project: team-notes (private)
- visibility: private
- outline sign-off: off
- worktree: yes
```

## 6. Ownership split

| Concern | Owner | Where |
|---|---|---|
| The `## Explain` schema, its validation, the one-confirmation rule, phase creation | workflow | create-phase *The explain route* |
| Drafting the proposal from a `/knowledge:explain` request (flags, subject and mode, prior lookup) | plugin (front door) | plugin §1, rewritten (§7) |
| Lifecycle, state, slices, routing, dispatch, typed stops, the acceptance gate | workflow | `do-whole-phase` and its `explain-*` references, the engine |
| Worktree, branch, merge, teardown, commits | workflow | `parallel-phase`, the contract's Commit Convention |
| Resume after a compaction or a new session | workflow | the SessionStart resume card, `next`, `/do-whole-phase <P>` (it enters a stamped worktree, `reference/worktree.md` L3) |
| In-span resume of a research run | plugin format, workflow trigger | `run.md` (§3.3), re-dispatched from disk (`explain-decomposition.md` L19) |
| Research roles and method, the dossier, ids, support statuses | plugin | §3, Part B, B9 |
| The evidence gate's rule / the stop it causes | plugin / workflow | §3.8 / the typed `pending` |
| The reader's path, chapter grammar, quiz, sources, images | plugin | §3.10, §4 |
| `knowledge check`, the critic agent and rubric / when and on which model it runs | plugin / workflow | §4.9, B5 / `explain-chapter.md` span 2 and *The critic's model* |
| The publish API and the KB config / when, with which key, and the privacy proof | plugin / workflow | §2, §5, §5.1 / `explain-review.md` step 5 |

**The interface.**

1. The plugin's `/knowledge:explain` finds the workspace the way §9.1 L1365–1370 already does (nested:
   `workflow/.agentic-nested.json`; root: `scripts/workflow.py` and `works/`). It drafts the proposal and
   shows the one confirmation. On a literal yes it invokes the workspace's `create-phase` through the
   Skill tool with the request, the proposal (the `## Explain` block, `unit` included) and the reply,
   verbatim. That is today's *A confirmed proposal* (create-phase L142–145), extended to every unit. A
   direct `/create-phase` explain request gets the same confirmation from create-phase itself.
2. The route creates the phase, commits, runs `parallel-start`, enters the worktree and runs
   `do-whole-phase` in `auto`.
3. The executors read the plugin skill **by path**, through the registry
   (`~/.claude/plugins/installed_plugins.json`, `explain-decomposition.md` L8), and cite §2, §3.1–§3.10,
   §4, §4.9–§4.10, §5–§5.1, §9.2–§9.3 and Part B. They dispatch `knowledge:web-researcher`,
   `code-researcher`, `gap-reviewer` and `verifier`. The orchestrator dispatches
   `knowledge:explain-critic`.
4. **Minimum plugin version: 0.6.0**, unchanged. Every section the executors read exists there, so this
   workflow version can ship before the plugin changes. The plugin's front-door release (§7) will in turn
   require the workspace version this work stamps, `v<M>`.

## 7. Plugin-side follow-up (this repo, a later phase; not built now)

- **Goes.**
  - The run card as an engine of its own (L22–101): the compaction header L24–27, the run-level stop
    rules L65–101, and "A repeat is never a new run" L92–99, which becomes the front door checking for a
    live explain phase on the same subject (`parallel-status`) and offering to resume it or make a v2.
  - The `resume` argument (§1 L107) and §3.3's resume steps L495–508: resuming becomes `/do-whole-phase <P>`.
  - §1's automatic book placement L152–174 and *A whole book is a suggestion* L176–178.
  - §2's `KB_EXPLAIN_STATE` dossier and the cwd fallback L261–268.
  - §3.1's unfinished-run lookup L294–299.
  - §7, the `here` copy L1320–1327: the draft is already committed in the phase folder, and an untracked
    file would block a teardown.
  - §9.1's proposal flow L1359–1397, which becomes the front door's single confirmation for every unit.
  - The "No workspace" single-document fallback L1372.
- **Shrinks.**
  - §3.3, to the `run.md` format and the in-span resume from disk.
  - §4.10's confirm pass: the review decides a dispute.
  - §8, to the fields the review and the closing report carry. Item 8 (L1354) stays as "a book suggested
    for a scoped-down topic".
- **`/knowledge:explain` becomes the front door.** It parses the flags (`quick`, `no-research`,
  `book=`, `lang=`), finds the workspace and checks it is ready, drafts and asks the one confirmation, and
  hands off to `create-phase`. With no workspace, or one too old, it refuses and points at the installer
  or `/update-workspace`, never running anything itself. The plugin's description and README say explain
  needs a workflow workspace.
- **Stays.** §2's resolver; §3.1's prior and translation rules; §3.2's preflight; §3.4–§3.10's method;
  §4's grammar and rules; §4.9's check; §5–§6's publish API; Part B; the critic's rubric; `pagetext.py`.
- **Readiness marker.** Today the plugin tests for `## The explain route` and a `must-cover` field (§9.1
  L1365–1370). The front door should test the workspace version `>= v<M>` **and** a `unit` field in the
  route (§9).

## 8. Migration and release notes

- **What `--update` brings an adopter:** the explain route's `unit` field and create-and-run; the contract
  lines (L13, L19, L49); explain phases started in their own worktree; the document path in the
  `explain-*` references; and the engine changes (the gate exemption, the no-notes consolidation, the
  detached nested host). Update the shipped prose that describes today's split:
  - `installer/payloads/doc_bodies/operations.md` L43–59;
  - `README.en.md` L524–538 (the Korean `README.md` has no such section);
  - `installer/main.py` L3092–3093 (the closing message);
  - the review pointer in `review-phase/SKILL.md` L110 and `agents/slice-executor.md` L103, whose text
    "run /knowledge:explain P<N> for one chapter, or create an explain phase for a book" assumes the old
    split.
  - Smoke assertions to revisit: `tests/retrofit_smoke.sh` L199–223 (the pointer string is at L204) and
    L347–362.
- **With an older plugin (0.6.0),** `/knowledge:explain` still writes single documents on its own engine,
  outside any phase, until the plugin's follow-up ships. The workspace cannot stop that. Its book proposal
  (no `unit:`) is created as a book phase and STOPs, matching that plugin's own "Run `/do-whole-phase`".
  The phase path is reachable now through `/create-phase` with an explain request.
- **Explain phases created earlier** read `unit: book` and run as before, on the stream they are on.
  `parallel-start` refuses a phase that is not `planned`, so nothing retrofits a worktree.
- **A draft `**Migration notes.**` line** (fragment format: `changelog.d/README.md`):

  > **Migration notes.** None beyond `--update`. Explain phases now start in their own worktree under
  > `.claude/worktrees/` (already in `.git/info/exclude`) and merge back by themselves; a nested install
  > names no host branch for one. An explain phase created earlier reads `unit: book` and runs as before.
  > Until the knowledge plugin's next release, `/knowledge:explain` still writes single documents on its
  > own; ask `/create-phase` to explain something to use the phase path now. Plugin 0.6.0 or later stays
  > required.

## 9. Open items for the workflow author

1. **Where create-and-run lives.** Recommend inside create-phase's explain route, continuing into
   `do-whole-phase` the way rotate-backlog's `create` branch continues "as `resume`" (L55), rather than a
   new workspace skill.
2. **The merge's quiet point** (§3.4, collision 1). Recommend the checked touched-set exemption over a
   bare `## Explain` test, so the safety is verified, not assumed.
3. **Consolidation with zero notes** (collision 2). Recommend that a no-notes passing review flips a
   worktree phase's `pending` to `done` for every phase, not only explain phases.
4. **Nested host side** (collision 3). Recommend a detached host worktree for explain phases over asking
   for a host branch name in the confirmation.
5. **When the automatic merge cannot run** (staged files on `main`, or uncommitted `works/` files the
   merge touches; `parallel-phase/SKILL.md` L265–271): another session may own that state. Recommend
   leaving the branch done and unmerged, saying so, and having `next` on the default stream print
   `merge_ready=<P>`, so whoever drives `main` merges it at its next slice boundary.
6. **The document `DECOMP` shape** (§4). Recommend research in the `DECOMP` plus a fixed one-slice cut,
   over a separate research slice or an engine-made template.
7. **Asked from inside a phase worktree.** Recommend refusing with "start an explain from the main
   checkout", as rotate-backlog's `rotate=refused` does (L35).
8. **A chapter for a book in a public project.** Publishing would make it public at once, against
   "visibility: always private … never through this phase" (create-phase L118). Recommend keeping that
   rule: the confirmation refuses and offers two choices, making the project private for the run or
   writing a standalone private document.
9. **A chapter's gate.** Recommend waived, like a document (private, and a v2 is cheap).
10. **Section references as an API.** The executors cite plugin sections by number. Recommend citing by
    heading as well (for example "§3.10 D6: the final outline"), so a plugin renumbering cannot silently
    break a phase. The plugin's readiness marker becomes the version plus the `unit` field.
