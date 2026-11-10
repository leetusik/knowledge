# do-whole-phase — an explain phase's decomposition and its gates

An explain phase is one whose `intent.md` carries an `## Explain` section, written by `create-phase`'s explain route. Its `DECOMP` follows `reference/decomposition.md`: dispatched on the high row, with the acceptance gate declared at its boundary. It is planned inline, in `auto`: the route's one confirmation is the explicit `auto` the decomposition carve-out needs (a phase created before the route ran its phase, or one with no `unit` line, plans at the gate unless the operator said `auto`). `next` prints `explain_unit=<document|book|chapter>` (absent reads `book`), which picks the branch of this file:
- **a book:** the evidence `DECOMP` reads over the whole subject before it outlines, what it cuts, the outline stop after it, and how each chapter's `plan.md` is later drawn from the outline (*A book*, below);
- **a document or a chapter:** the book's shape with one chapter. `DECOMP` writes the unit's brief, its evidence and its reader's path into `doc/`, then always cuts exactly one write slice `S1` (*A document or a chapter*, below).

**There is no research run.** An explain is written from records alone: what this repository's code does, from what its phases recorded, or, for a **subject** with no code behind it, from a research phase's findings (a research phase researches, an explain never does: `create-phase`'s *The research route*). The `DECOMP` executor is the knowledge plugin's writer for the stages before the draft, and it reads the code at one commit (none for a subject) and the records of the phases on `## Explain`'s `phases:` line **itself, alone**, and nothing else (no web search, no research agent, no other repository, never an outside work a finding names). It dispatches no agent at all (`slice-executor`'s explain carve-out). The evidence and writing rules are the knowledge plugin's `skills/explain/SKILL.md`, cited by section number **and** heading (so a renumbering cannot silently point a phase at the wrong rule), and never copied here.

## Before you plan it

- **Read `## Explain`.** Check the required set for its unit (`create-phase`, *The explain route*): every unit writes sixteen lines (unit, subject, phases, book, chapter, prior, lang, reader, depth, must-cover, leave-out, trusted sources, project, visibility, outline sign-off, worktree). A document has `book: none`, `chapter: none`, `depth: one document`; a book has `chapter: none`, `outline sign-off: on`; a chapter names an existing `book`, its `chapter` (`<key> — "<title>" · position <n>`) and `depth: one chapter`. Check too that `visibility` is `private`, that `lang` is `en` unless the operator named another language, and that every `phases:` id is a phase of this workspace, active or archived. `must-cover`, `leave-out` and `trusted sources` may be `none`, and so may `phases` (no phase covers the subject, and the operator chose to explain from the code alone). **A subject explain** (the subject is not this repository's code: a field of study, a language, the operator's own words; the plugin's §1 *Resolve the topic, the mode and the placement*) is told from a research phase's findings alone, so its `phases:` line names at least one **research phase** of this workspace (a phase whose *Confirmed Intent* carries the research block's lines and whose slices are `kind: research`), never `none`; a subject book's `book:` line carries its kind and label, `<slug> — "<title>" (kind subject: <label>)`. A field that is missing or contradicts the rest STOPs you before dispatch: a project the operator says is public, a subject that is not this repository's code with no research phase on `phases:`, a chapter's book that does not exist. Set `<P>.DECOMP` `pending` with `--stop-kind decision --on-words "<their answer completes ## Explain, then DECOMP runs>"`, ask by the contract's stop rules, and record the answer in `## Explain`.
- **An older `## Explain` is read, never refused for its age:**
  - **one from v86–v93** has `run:` and `mode:` lines and no `phases:` line. `run:` is ignored: there is one run. `mode: general` (a subject with no code behind it) reads as a **subject explain** when a research phase covers it (found as below, and written on `phases:`), and is otherwise the decision stop above: explain is written from records alone, so the operator narrows the subject to this repository's code, or closes the phase and asks `/knowledge:explain` for research first. With no `phases:` line, find the covering phases yourself by the plugin's §1 *Resolve the topic, the mode and the placement*, *The phases that cover the subject*, write the `phases:` line into `## Explain` (`none` when no phase covers it: the unit is then written from the code alone, and the report says so), and add a `## Decisions` line saying so;
  - **one with no `unit` line** is a book from before the line existed: its eleven fields (subject, mode, book, lang, reader, depth, must-cover, leave-out, trusted sources, project, visibility) are its whole set, read as a book, with `phases:` found as above. A legacy book created before `must-cover`, `leave-out` and `trusted sources` existed: add them as `none` and list them under "decided as drawn" at the outline gate.
- **Locate the explain skill through the plugin registry,** never by searching the plugin cache, which can move: Read `~/.claude/plugins/installed_plugins.json` (in the Claude config folder, `~/.claude` unless `CLAUDE_CONFIG_DIR` moves it). Its `plugins` object lists `knowledge@<marketplace>` (normally `knowledge@knowledge`) as installs, each with `installPath`, `version` and `scope`; a project-scoped install of this repo comes before a user-scoped one. The skill is `<installPath>/skills/explain/SKILL.md`, and the version must be **0.11.0 or later** (its §3 *Gather the evidence* and §9.2 *The evidence for a book (an explain phase)*, the evidence model this file follows: a research phase's findings as records, a finding's outside work as its entry's `source:`, the subject book, and chapters written beside each other). If it is missing or older, set `<P>.DECOMP` `pending` with `--stop-kind operator-action`: the operator installs or updates the plugin. Name the skill's path and version in `plan.md`.
- **Say what the run needs** (in the plan-gate report; in `auto`, in `plan.md`, where a stopped span's report can quote it). The writer reads `SKILL.md` as a file, so the skill's `allowed-tools` grant never covers it: every call runs on the session's permissions (§3.2 *Permissions, and the payload builder*). Interactive Claude Code's default auto mode needs nothing more; manual mode needs the rules that section's block lists, added to `.claude/settings.local.json`, never to the shipped `settings.json`, **with the block's lines for a writer that read the skill by path**: `Bash(python3 -c *)` for the resolver of §2 *Resolve the knowledge base configuration* (it lets any inline Python run; auto mode needs none of this), and the `Read` and `Edit` rules for the unit's folder; a book's chapters also need the block's line for the critic's read of earlier chapters, `Bash(git -C <BOOK> show HEAD:./*)`, with `<BOOK>` the book's folder as the critic's `draft:` writes it. Name those rules, so that the operator adds them before the dispatch and not after a stopped span. The run makes no web search.
- **Estimate time from the meter**, as `reference/decomposition.md` says: the `DECOMP` (one evidence span), plus, for a book, the number of chapters × the metered span-minutes of a chapter slice (three spans: executor, critic, executor), or, for a document or a chapter, one write slice (three spans), plus the review. A book's chapters run at once, so its wall clock is their rounds of at most 4 (`reference/explain-chapter.md`, *Chapters at once (a wave)*), each about one chapter's three spans, plus the synthesis chapter after them, if it has one. Until the meter holds an explain phase's spans, say so and give the order of magnitude: one reading of the subject, then one writer and one critic on a second model for each chapter. Each slice carries its `spends money:` line, normally `no`: the writer and the critic are the workspace's own dispatches.

## A book

### What the plan asks the executor to do

The `DECOMP` executor writes the book's brief, reads its whole subject and outlines it (§9.2 *The evidence for a book (an explain phase)*, *The whole book*), alone: it dispatches no agent, and it writes the dossier and the outline itself.

1. **Read the skill** at the path the plan names: its card (*The run, in one card*), §2 *Resolve the knowledge base configuration* (its *The run's dossier*), §3 *Gather the evidence* through §3.4 *D1: the evidence*, §9.2 *The evidence for a book (an explain phase)*, and B9 *The dossier: files, ids and entries*.
2. **Write the brief and read the evidence** by items 1–2 of §9.2 *The evidence for a book (an explain phase)*, into the dossier `book/research/` in the phase folder (`works/phases/active/P<N>/book/research/`):
   - **first**, write `book/research/pages/.gitignore`, two lines, `*` then `!.gitignore`: `pages/` stays out of git (it holds at most the payload builder's fallback copy, §2 *Resolve the knowledge base configuration*), and the rest of the dossier is committed with the slice;
   - the run id is `<KB_NOW>-<book slug>`. The dossier is the run's state: a span stopped by a usage limit is re-dispatched from disk and goes on at the first stage whose file is missing or unfinished (§3.3 *The record, and resuming a run*), never from scratch;
   - **D0, the brief** (§3.1 *D0: the brief, and the prior version*) comes from `## Explain` (subject, phases, reader, depth, must-cover, leave-out, trusted sources and `lang`), placement `book <slug>`, the commit (`HEAD` at D0), and the chapter list signed at the confirmation, recorded under `intent.md`'s *Original Input (verbatim)*;
   - **D1, the evidence** (§3.4 *D1: the evidence*): every covering phase's records and the code at the commit, into `book/research/evidence.md`, each entry naming the chapters it serves, with its `## Gaps` and `## Open`, closed by its counts line. A phase's records are its `intent.md`, its notebook by section (through `phase-section <P>`, with the `topics/` a gist links) and the `result.md` heads of the slices that built the subject; `python3 scripts/workflow.py phase-scope <P>` gives a phase's commit range and files. The explain phase's own folder is never a record;
   - **a research phase's records** are its findings, read the same way: its `intent.md`, its `## Decisions` gists, the `topics/` they link (the bulk) and its slices' `result.md` heads. A corpus under its `topics/corpus/` is read only at the record ids a finding cites, never whole. A finding that names an outside work (a web page, a paper, a book) carries it in its entry's `source:` field (B9 *The dossier: files, ids and entries*), copied as recorded and never read: the research review re-opened a sample of those works, and the explain never reads the web. Whenever a `source:` entry serves a chapter, `## Gaps` gets the **standing gap** "the outside works behind these findings were read by <P>, not by this book", touching those chapters;
   - **a subject book** (no code behind it) has no code entries (`code 0`): the commit (`HEAD` at D0) pins the records.
3. **Write `book/outline.md`** in the phase folder (`works/phases/active/P<N>/book/`), by item 3 of §9.2 *The evidence for a book (an explain phase)*, drawn from `evidence.md`. The operator signs this file, each chapter's `plan.md` is drawn from it, and the critic checks every chapter against it. It states:
   - **the book:** slug, title and kind (§1 *Resolve the topic, the mode and the placement*, *The unit, and where it goes*): `codebase` when its subject is this repository's code, even where it leans on outside basics a research phase recorded, or `subject` with its short display label, as `## Explain`'s `book:` line gives it; the private project; `lang`; the explain skill's path and version; the dossier, its run id and the commit;
   - **the reader:** who they are, what they already know, what they are new to, and what they can do after the book (§1's *The reader*);
   - **the brief:** must-cover, leave-out and trusted sources, as `## Explain` gives them;
   - **`## Drawn from`**: each chapter and the phases (and slices) it draws from; and **`## Gaps`**: each gap and the chapters it touches. The outline gate shows both;
   - **the order and prerequisites:** the chapters in reading order, each naming the earlier keys it builds on. "Builds on" is a **recap obligation, not a run order**: the chapters are written at once, so a chapter recaps what it builds on from the lines pinned here, never from another chapter's draft;
   - **the pins**, which keep chapters written at once consistent with each other (the review checks them across the book):
     - **the taught terms:** each term the book teaches, the chapter that teaches it, and its **one-line recap**, the line every later chapter uses when it recaps the term;
     - **the names:** the book's one name for each thing (a component, a rule, a quantity), and the other names it does not use;
     - **the running examples:** each example more than one chapter uses, with its inputs and its numbers as the evidence states them;
     - **the link ids:** for each chapter, the heading ids of the sections another chapter may link to (a `chapter:` link); a chapter links to no other id;
   - **the synthesis chapter**, when the book has one: a chapter that builds on every earlier chapter, or walks one case through their ideas, so it needs their finished text and not only the pins. Name it, and the chapters it draws on: it is written after them (step 4);
   - **each chapter's entry:**
     - its key: the slice key of §1 *Resolve the topic, the mode and the placement* for a chapter shaped like one slice, otherwise a short lowercase-kebab key;
     - its title (by §1's title rule) and position;
     - its goal: what the reader understands after it;
     - **the phases (and slices) it draws from**;
     - its **sections**, the chapter's signed shape: each a heading with one line on the question it answers, at most 6 content sections, and the Quiz and Next steps parts only where signed (§1 *Resolve the topic, the mode and the placement*, *The shape*; §4.2 *The outline, from the signed shape*);
     - its **reader tasks**: 2 to 4 things the book's reader comes to this chapter to do, each with its **deliverable**, the thing they will use to do it (a checklist, a decision table, the commands to run, the test that guards a behaviour). The chapter's own map opens with them (the `## Reader's task` of §3.10 *D6: the final outline, the reader's path*), and the critic checks that the chapter serves each one;
     - its mode, per §1 *Resolve the topic, the mode and the placement*: change or topic;
     - its **entry ids**, its **gaps** (gap ids, each `stated` or `dropped`) and its **open items** (open ids, for a signed Next steps part);
     - the must-cover items it carries, if any;
     - its planned diagrams and figures, what each one shows, and the entries each draws;
     - its quiz targets, when its Quiz is signed: the understanding each item checks, never recall of a detail, and only what an entry states;
     - its **tags**: 2 to 5, lowercase-kebab, the `--tag` values of its publish;
     - its **images**: `none`, or each name and what it shows (§4.7 *Images*);

     **Write diagram and quiz targets so that the critic can check them against the code.** Name the exact
     case, not the general one: a *loose document* or a *bound chapter* (they answer differently), a
     placed chapter or not. For a diagram of steps, say that its order is the code's order, and name the
     function it is read from. A target worded "an already-published document" is a different question
     from "an already-published chapter", and the writer and the critic must not have to guess which;
   - **out of scope:** what the book deliberately leaves out: the brief's leave-out, and what the evidence holds that the book will not teach.
4. **Cut and declare one bare chapter slice per chapter**, in reading order. A chapter whose "builds on" the pins serve declares `--depends-on none`:

   ```sh
   python3 scripts/workflow.py new-slice --phase P<N> --slice P<N>.S<k> --name "<key>: <title>" \
     --kind implementation --risk high --order <10k> --depends-on none
   ```

   The synthesis chapter declares `--depends-on P<N>.S<j>` once for each chapter it draws on (all ordered before it), so it starts only once they are `done` and reads them finished.

   - **Risk.** Every chapter is `high`, for one named trigger written once in the breakdown: **open design**, because its executor writes alone from the evidence. §9.3 *A chapter: its evidence, then the draft* is written for that writer, and the critic runs on the other model family (`reference/explain-chapter.md`, *The critic's model*).
   - **Bare folders.** Never write a chapter's `plan.md`.
   - **Declared.** Every chapter is declared, as every middle slice of a decomposition is: `finish-slice <P>.DECOMP` refuses while one is undeclared (`set-slice-deps <slice> --depends-on …` declares one already cut). The declared chapters run as a wave once the outline is signed, at most 4 at once (`reference/explain-chapter.md`, *Chapters at once (a wave)*).
   - **The sets, in `topics/breakdown.md`:** one `## <slice id>` block per chapter (its key and title, the risk and its trigger, `spends money: no`, its declaration) holding its **set**, the files only it writes, each named by its full path under the phase folder `works/phases/active/P<N>/`:
     - `book/<key>.md` and `book/assets/<key>/`;
     - `book/critique/<key>.md`, written by its critic;
     - `book/research/evidence-ch<k>.md`, `outline-ch<k>.md`, `trace-<key>.md` and `answers-<key>.md`;
     - its slice folder.

     The frozen `book/research/brief.md` and `evidence.md` and the signed `book/outline.md` are in no set: every chapter reads them, none writes them. There is no join-rebuilt artifact.
   - **The code environment is a shared runtime resource.** When chapters will re-derive numbers through the code, warm it once now, by the repository's own setup (its `CLAUDE.md` or README: the first run that creates its virtual environment or installs its dependencies), changing no tracked file, and name the command in the breakdown. A chapter never installs or creates one, and `knowledge check` is a read-only call. A subject book with no code has none to warm.
   - **No translation slices.** A translation names the published original's version (the `translated_from` of §5 *Publish via the KB document API*), so translations follow the accepted book (`reference/explain-review.md`).
   - **Run `python3 scripts/workflow.py parallel-plan <P>`** once the chapters are cut and put its rounds in the verdict's `parallel:` field: the chapters together, then the synthesis chapter, then `REVIEW`. The engine prints every ready chapter in one round; the cap of 4 is the orchestrator's.
5. **Update `phase.md`**, entry by entry through `phase-section` (never `Read`, `Edit` or `Write` it):
   - `## Decisions`: one gist line for the book (placement, project, kind, chapter count, the run id, the commit, `evidence.md`'s counts, and the synthesis chapter with the chapters it draws on, or none), linking `book/outline.md`;
   - `## Notes for later slices`: a pointer to the outline's pins (the taught terms with their recap lines, the names, the running examples, the link ids), tagged for every chapter: a chapter recaps and links from them, never from another chapter's draft;
   - `## Now`: the outline awaits the operator's signature.
6. **Return** `done` once the outline is written, the slices cut and declared, and `parallel-plan` run. A run that stops returns instead, with no slice cut (*Run stops*, below).

### The outline gate (yours, after the executor returns)

Right after `finish-slice <P>.DECOMP`, in the same commit (the dossier rides in it; git ignores `pages/`). The chapters are declared, so the moment `DECOMP` is `done`, `next` lists every one of them in `ready_slices=`, and only a stop on disk empties it. **So the finish, the gate and the stop are one command line**, joined with `&&` and run in the turn the executor returned, before `next` or any dispatch: no boundary (a compaction, a session's end) falls between the finish and the stop, and `reference/wave.md`'s *Resume* never finds the chapters ready:

```sh
python3 scripts/workflow.py finish-slice <P>.DECOMP --outcome "<its summary>" \
  && python3 scripts/workflow.py accept-gate <P> --require \
  && python3 scripts/workflow.py set-slice-status <P>.S1 pending --stop-kind decision \
       --on-words "'accept' signs the outline and the chapters run; feedback re-runs DECOMP"
```

1. **Declare the gate** (`accept-gate <P> --require`). The operator accepts a book by reading it in the real reader; a book never waives.
2. **Stop the first chapter slice in order** (normally `<P>.S1`; after a re-cut, whichever comes first). That one stop **holds every declared chapter**: with a stop on disk, `ready_slices=` reads `none -- stopped by …`, so no chapter starts until the operator's word (`reference/wave.md`, *What the engine prints*).
3. **Validate, commit, report and STOP.** The report follows the contract's stop rules:
   - about 2k characters, with `book/outline.md` linked;
   - the chapter list: key, title, a one-line goal and the phases each draws from;
   - how they run, in one line: the chapters at once, at most 4 in flight, then the synthesis chapter (`parallel-plan`'s rounds);
   - the evidence in one line: the covering phases read, and `evidence.md`'s counts (`code <n> · records <n> · gaps <n> · open <n>`);
   - at most ~5 decisions: those that change what the book teaches, contradict the operator's own words, or are costly to reverse once chapters are written (a reader assumption, a chapter merged or cut, a must-cover item the evidence cannot carry, a gap a chapter's section rests on);
   - the rest in one "decided as drawn" list, with the outline's `## Gaps`.

   The signature signs **every chapter's sections at once**: no chapter slice stops for its own.

**On the operator's return:**

- **"accept"** (or "moveon"), literally: set that slice to `in_progress`, add a `## Decisions` line ("outline signed, attempt <n>"), and run the chapters as a wave: that slice and up to three more ready chapters, by `order` (`reference/explain-chapter.md`, *Chapters at once (a wave)*). **The signature freezes the book's evidence:** from then on, `book/research/brief.md` and `evidence.md` are never edited (§9.2 *The evidence for a book (an explain phase)*, item 4), and neither is `book/outline.md`; each chapter writes only the files named for it. The review checks it.
- **Feedback: `DECOMP` runs again.**
  1. Set `<P>.DECOMP` back to `in_progress`, then that slice back to `todo`, in one command line (`set-slice-status <P>.DECOMP in_progress && set-slice-status <P>.S1 todo`): the running barrier holds every chapter before the stop comes off.
  2. Append `## Attempt <n>` to the DECOMP's `plan.md`, with the operator's words verbatim.
  3. Dispatch it again on the high row.
  4. The executor goes on from the dossier (§3.3 *The record, and resuming a run*): it reads more where the feedback asks (new entries appended to `evidence.md`), revises `book/outline.md`, and re-cuts the slices. Nothing is frozen before the signature.
     - a chapter whose key survives keeps its slice, since its `plan.md` is drawn from the outline entry, so a new title needs nothing;
     - a new chapter gets `new-slice` with a fractional `--order`, declared as step 4 of *What the plan asks the executor to do* says, and its set goes in the breakdown;
     - a synthesis chapter whose chapters changed is declared again with `set-slice-deps`;
     - a chapter the revision drops is listed in the verdict, and you close it with `finish-slice <id> --outcome "dropped: not in the outline, attempt <n>"` before you finish `DECOMP`, so the stop goes on the first chapter that survives. The engine has no delete, and a bare slice closed this way did nothing.
  5. Stop at the gate again: the one command line above, with the acceptance gate left out (it is already declared), then step 3.

  Each round is one commit and one stop.

### Each chapter's `plan.md`, later

When a chapter slice comes up, plan it per `reference/explain-chapter.md` (*What `plan.md` names*). Every field is drawn from `book/outline.md`:
- from the chapter's entry: the key and position, the entry itself (its goal, the phases it draws from, its signed sections, **reader tasks**, entry ids, gaps and open items), the mode, its diagrams, figures and quiz targets, and its tags and images;
- from the pins: the recap line of each term it builds on, the names, the running examples it uses, and the link ids it may link to; for the synthesis chapter, the chapters it draws on;
- from the book's header: the skill's path and version, the dossier, its run id and the commit, the reader, the brief, and the publish fields (project, book, kind (and a subject book's label) and title, chapter key and position, chapter title, language, sources);
- from `topics/breakdown.md`: its set, for the `## Wave` section `reference/wave.md` adds when it runs beside other chapters;
- from the slice's own `## Dispatch`: the `--co-authored-by` attribution. The `--source-repo` is the repo root, and the check's target is "the configured knowledge base" (§2 *Resolve the knowledge base configuration*), the org the review publishes into. Nothing in a plan names a URL or a key. The summary is written with the draft.

If the outline cannot fill a field, that is a gap in the outline. Ask about it; never invent it in a plan.

## A document or a chapter

The unit's evidence is one reading by the plugin's §3 *Gather the evidence*, made by the `DECOMP` executor into the phase's own dossier, and its draft is one write slice. A chapter here is a chapter **added** to an existing book: a fresh single-unit run, never the overlay of §9.3 *A chapter: its evidence, then the draft* (the book's frozen dossier belongs to the phase that wrote it, and may be archived).

```
P<N> (unit: document | chapter)
  DECOMP  decomposition, high row: D0 brief, D1 evidence, D6 reader's path → doc/; cuts S1
  S1      implementation, risk high, --depends-on none: write and check → the critic (yours) → revise
  REVIEW  review, high row: check, publish private, prove it private, read it back, rule on disputes
```

### What the plan asks the executor to do

1. **Read the skill** at the path the plan names: its card (*The run, in one card*), §2 *Resolve the knowledge base configuration* (its *The run's dossier*), §3 *Gather the evidence* through §3.10 *D6: the final outline, the reader's path*, and B9 *The dossier: files, ids and entries*.
2. **Write the brief, the evidence and the reader's path** into the dossier `doc/` in the phase folder (`works/phases/active/P<N>/doc/`). It **is** the plugin's `<DOSSIER>` (§2 *Resolve the knowledge base configuration*; its files are B9 *The dossier: files, ids and entries*): `brief.md`, `evidence.md`, `outline.md`, then the write slice's `body.md`, `trace.md`, `critique.md`, `answers.md` and `assets/`. Never name it `explain/`: the installer treats a path with an `explain` component as the plugin's.
   - **first**, write `doc/pages/.gitignore`, two lines, `*` then `!.gitignore`; the rest of the dossier is committed with the slice;
   - the run id is `<KB_NOW>-<slug>`; a stopped span goes on at the first stage whose file is missing or unfinished (§3.3 *The record, and resuming a run*);
   - **D0, the brief** (§3.1 *D0: the brief, and the prior version*) comes from `## Explain`: subject, phases, reader, must-cover, leave-out, trusted sources, `lang`; placement `loose` for a document, `<book>/<key>` for a chapter; the commit (`HEAD` at D0); and the signed sections, from the confirmation recorded under `intent.md`'s *Original Input (verbatim)* (§3.1's *The signed sections*);
   - **the prior** (a v2): from `prior:`, or from §3.1's own lookup when it is `none`. D0 reads the prior's source and carries every surviving id forward. D1 then runs as **the prior plus the phases since** when the prior's explain phase holds an `evidence.md` (§3.4 *D1: the evidence*, *A v2: the prior plus the phases since*); an older dossier (a `ledger.md` and no `evidence.md`) is never carried, and the run reads everything afresh;
   - **a chapter reads its book at D0:** the book's chapters (`GET <KB_API_BASE_URL>/api/books/<project>/<book>` with the org key, as §3.1 *D0: the brief, and the prior version* reads a placement) and, when the book came from a phase in this repo (active or archived), that phase's `book/outline.md`. Write what they give into `doc/outline.md` under `## The book`: the chapter's position, the terms earlier chapters teach (with the chapter that teaches each), so it can recap them, the terms it teaches itself, and the keys it may link to as an extra. The draft and the critic read it there; the review checks the order against the published book;
   - **D1, the evidence** (§3.4 *D1: the evidence*): the records of the phases on `phases:` and the code at the commit, into `doc/evidence.md`, with its `## Gaps` and `## Open`, closed by its counts line, as for a book (step 2 above: a research phase's findings, their `source:` and the standing gap, and a subject's records alone); `phases: none` reads the code alone, and each why it cannot tell is a gap;
   - **D6, the reader's path** (§3.10 *D6: the final outline, the reader's path*): `doc/outline.md`, final, opening with `## Reader's task`, its path the signed sections (one the evidence cannot carry goes to `## Not used`, with its reason), closed by its `D6:` line.
3. **Note a scoped-down topic.** When the signed sections and their evidence are plainly over one document (the test of §9.1 *The book suggestion*, (b)), the run keeps to what one document carries, and the `## Decisions` gist names the part left out: the closing report suggests a book for it.
4. **Cut exactly one write slice, declared:**

   ```sh
   python3 scripts/workflow.py new-slice --phase P<N> --slice P<N>.S1 --name "<the unit's title>" \
     --kind implementation --risk high --order 10 --depends-on none
   ```

   `high` for **open design**: its executor writes alone from the evidence. A bare folder, declared `--depends-on none` (`finish-slice <P>.DECOMP` refuses an undeclared middle slice), and no translation slice, as for a book. With nothing beside it, `S1` runs alone, as before.
5. **Update `phase.md`**, entry by entry through `phase-section`: `## Decisions`, one gist line (the unit, its placement and project, the run id and the commit, the covering phases, `evidence.md`'s counts, any section cut to `## Not used`, a scoped-out part if any), linking `doc/outline.md`; for a chapter, `## Notes for later slices`, the terms earlier chapters teach, so it can recap them, and the keys it may link to as an extra, tagged for S1; `## Now`.
6. **Return** `done` once `doc/outline.md` is final and S1 is cut and declared.

### After the executor returns: the gate, and the outline sign-off

Right after `finish-slice <P>.DECOMP`, in the same commit (the dossier rides in it):

1. **Declare the gate, waived:** a document `accept-gate <P> --waive --note "standalone explain document: published private; a v2 is cheap"`; a chapter `accept-gate <P> --waive --note "explain chapter: published private; a v2 is cheap"`.
2. **The outline sign-off is off** unless `## Explain` says `outline sign-off: on`: then S1 runs at once (`reference/explain-chapter.md`, *A document or a chapter: its one write slice*). With `on`, stop S1 before its first span, in the same command line as the finish, as a book's gate does (S1 is declared, so it is ready the moment `DECOMP` is `done`):

   ```sh
   python3 scripts/workflow.py set-slice-status <P>.S1 pending --stop-kind decision \
     --on-words "'accept' signs the outline and S1 runs; feedback re-runs DECOMP from the dossier"
   ```

   and report as the book's gate does (step 3 of *The outline gate*, with `doc/outline.md` linked and the reader's tasks in place of the chapter list). `accept` runs S1; feedback re-runs `DECOMP` from the dossier as a book's does (no freeze applies: nothing is drawn from the outline but S1's plan).

### S1's `plan.md`, later

Plan it per `reference/explain-chapter.md` (*A document or a chapter: its one write slice*), drawn from `## Explain`, `doc/brief.md`, `doc/outline.md` (its `## The book`, for a chapter) and the `DECOMP`'s `## Decisions` gist: the skill's path and version, the dossier, its run id and the commit, the covering phases, the reader, the brief, the prior, and the publish fields (project, lang, `--source-repo` the repo root, `--co-authored-by` from S1's own `## Dispatch`; a chapter's book, key, position and title; a v2 document's `--new-version --rel-path <rel_path>`). Title, summary and tags are the executor's, by §5 *Publish via the KB document API*. Nothing names a URL or a key.

## Run stops (every unit)

A run that stops returns instead of `done`, with no slice cut, and a re-dispatch goes on from the dossier (§3.3 *The record, and resuming a run*):
- **`FAILED: permissions`** (§3.2 *Permissions, and the payload builder*): `needs_operator`, with the rules block the skill printed; the operator turns on auto mode or adds the rules, and the span goes on from the dossier, or starts again at §2 *Resolve the knowledge base configuration* when it stopped before writing one;
- **the knowledge base unresolved** (§2 *Resolve the knowledge base configuration* printed `unconfigured` or `error`): `needs_operator`; the operator runs `/knowledge:setup`.

Nothing else stops the run. A covering phase `not found` is listed under `evidence.md`'s `## Read`, and the run goes on with the others. What the code and the records do not say is a gap, stated or dropped (§3.4 *D1: the evidence*), and a signed section the evidence cannot carry is cut to `## Not used` (§3.10 *D6: the final outline, the reader's path*): neither is a stop, and there is no evidence gate.
