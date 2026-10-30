# do-whole-phase — an explain phase's decomposition and its gates

An explain phase is one whose `intent.md` carries an `## Explain` section, written by `create-phase`'s explain route. Its `DECOMP` follows `reference/decomposition.md`: dispatched on the high row, with the acceptance gate declared at its boundary. It is planned inline, in `auto`: the route's one confirmation is the explicit `auto` the decomposition carve-out needs (a phase created before the route ran its phase, or one with no `unit` line, plans at the gate unless the operator said `auto`). `next` prints `explain_unit=<document|book|chapter>` (absent reads `book`), which picks the branch of this file:
- **a book:** the whole-book research `DECOMP` leads before it outlines, what it cuts, the outline stop after it, and how each chapter's `plan.md` is later drawn from the outline (*A book*, below);
- **a document or a chapter:** the book's shape with one chapter. `DECOMP` leads the unit's own research run and writes its reader's path into `doc/`, then always cuts exactly one write slice `S1` (*A document or a chapter*, below).

The research and writing rules are the knowledge plugin's `skills/explain/SKILL.md`, cited by section number **and** heading (so a renumbering cannot silently point a phase at the wrong rule), and never copied here.

## Before you plan it

- **Read `## Explain`.** Check the required set for its unit (`create-phase`, *The explain route*): every unit writes seventeen lines (unit, subject, mode, book, chapter, prior, run, lang, reader, depth, must-cover, leave-out, trusted sources, project, visibility, outline sign-off, worktree). A document has `book: none`, `chapter: none`, `depth: one document`; a book has `chapter: none`, `run: full`, `outline sign-off: on`; a chapter names an existing `book`, its `chapter` (`<key> — "<title>" · position <n>`) and `depth: one chapter`. A section with no `unit` line is a book from before the line existed: its eleven fields (subject, mode, book, lang, reader, depth, must-cover, leave-out, trusted sources, project, visibility) are its whole set. Check too that `visibility` is `private` and `lang` is `en` unless the operator named another language. `must-cover`, `leave-out` and `trusted sources` may be `none`. A legacy book created before those three existed: add them as `none` and list them under "decided as drawn" at the outline gate. A field that is missing or contradicts the rest STOPs you before dispatch: a project the operator says is public, a subject that does not exist, a chapter's book that does not exist. Set `<P>.DECOMP` `pending` with `--stop-kind decision --on-words "<their answer completes ## Explain, then DECOMP runs>"`, ask by the contract's stop rules, and record the answer in `## Explain`.
- **Locate the explain skill through the plugin registry,** never by searching the plugin cache, which can move: Read `~/.claude/plugins/installed_plugins.json` (in the Claude config folder, `~/.claude` unless `CLAUDE_CONFIG_DIR` moves it). Its `plugins` object lists `knowledge@<marketplace>` (normally `knowledge@knowledge`) as installs, each with `installPath`, `version` and `scope`; a project-scoped install of this repo comes before a user-scoped one. The skill is `<installPath>/skills/explain/SKILL.md`, and the version must be **0.6.0 or later** (§9 *A book* and the research agents). If it is missing or older, set `<P>.DECOMP` `pending` with `--stop-kind operator-action`: the operator installs or updates the plugin. Name the skill's path and version in `plan.md`.
- **Say what the research needs** (in the plan-gate report; in `auto`, in `plan.md`, where a stopped span's report can quote it). The research agents run on the session's permissions: interactive Claude Code's default auto mode needs nothing more, and manual mode needs the rules the skill's preflight prints (§3.2 *D0b: the preflight*), added to `.claude/settings.local.json`, never to the shipped `settings.json`, **with the block's lines for a lead that read the skill by path**: the executor reads `SKILL.md` as a file, so the skill's `allowed-tools` grant never covers it, and its first call, the resolver of §2 *Resolve the knowledge base configuration*, is a `python3 -c` that only `Bash(python3 -c *)` allows (it lets any inline Python run; auto mode needs none of this). Name those rules, so that the operator adds them before the dispatch and not after a stopped span. Every web search in the session, the agents' included, counts against Claude Code's per-session cap (200 by default): a book's whole-book research alone can pass it. The operator raises `CLAUDE_CODE_MAX_WEB_SEARCHES_PER_SESSION` in their user settings' `env`; you never set it.
- **Estimate time from the meter**, as `reference/decomposition.md` says: the `DECOMP` (one long research span), plus, for a book, the number of chapters × the metered span-minutes of a chapter slice (three spans: executor, critic, executor), or, for a document or a chapter, one write slice (three spans; one under `run: quick`), plus the review. Until the meter holds an explain phase's spans, say so and give the order of magnitude: a book's whole-book research dispatches tens of research agents, and each of its chapters costs about one full `/knowledge:explain` run; a document or a chapter costs about one run in all. Each slice carries its `spends money:` line, normally `no`: the research agents are the workspace's own dispatches, and a draft citing paid sources is not spend.

## A book

### What the plan asks the executor to do

The `DECOMP` executor is the **lead** of the book's research run (§9.2 *Research for a book (an explain phase)*). `slice-executor`'s explain carve-out lets it dispatch the research agents the skill names (*Delegate reads, never writes*); it writes the dossier's indexes, the outline and the summary itself.

1. **Read the skill** at the path the plan names: its run card (*The run, in one card*), §3 *Research* and §9.2 *Research for a book (an explain phase)*, and Part B *The research roles* where they send you.
2. **Lead the whole-book research** per §9.2 *Research for a book (an explain phase)*, into the dossier `book/research/` in the phase folder (`works/phases/active/P<N>/book/research/`):
   - **first**, write `book/research/pages/.gitignore`, two lines, `*` then `!.gitignore`: fetched pages stay out of git, and the rest of the dossier is committed with the slice;
   - the run id is `<KB_NOW>-<book slug>`. `run.md` holds the run's state (§3.3 *`run.md`, and resuming a run*), so a span stopped by a usage limit is re-dispatched from disk and goes on from its recorded stage, D0b first, never from scratch;
   - the brief (D0) comes from `## Explain`: subject, mode, reader, depth, must-cover, leave-out, trusted sources and `lang`, placement `book <slug>`;
   - the evidence, by subject: a **phase** is its records (`intent.md`, its notebook through `phase-section <P>` with its `topics/`, each slice's `result.md` head, and `python3 scripts/workflow.py phase-scope <P>` for the commit range and files) and its code; a **slice** is its records and commits; a **free topic** is this repo in `codebase` mode, or the web in `general` mode. A code researcher's repository is the session's working folder;
   - **every prompt you send an agent starts with the line `slice: <P>.DECOMP (a label for the workspace's meter, not a task)`**, then the dispatch block the skill gives: the preflight's probe agents (§3.2 *D0b: the preflight*) and every researcher, gap reviewer and verifier. `dispatch-summary` attributes a nested span by that line; the words in brackets keep a general agent (the preflight's probes) from taking it for a slice to execute;
   - **you are a subagent,** so a background agent's completion never reaches you: the probe agent A and every wave go in the foreground, a wave's calls in one message, where they run at once (§3.2 *D0b: the preflight*, §3.5 *D2: a wave*);
   - the questions, waves, gap rounds and ceiling are those of §9.2 *Research for a book (an explain phase)*, then D5–D5s and `gaps/final.md`. There is no gate stop here: what would fail D5g is a weak spot, reported in the summary.
3. **Write `book/outline.md`** in the phase folder (`works/phases/active/P<N>/book/`), drawn from the ledger. The operator signs this file, each chapter's `plan.md` is drawn from it, and the critic checks every chapter against it. It states:
   - **the book:** slug, title and kind (§1 *Resolve the topic, the mode and the placement*); the private project; `lang`; the explain skill's path and version; the dossier and its run id;
   - **the reader:** who they are, what they already know, and what they can do after the book;
   - **the brief:** must-cover, leave-out and trusted sources, as `## Explain` gives them;
   - **the order and prerequisites:** the chapters in reading order, each naming the earlier keys it builds on, plus the terms the book teaches and the chapter that teaches each one, so a later chapter knows what to recap;
   - **each chapter's entry:**
     - its key: the slice key of §1 *Resolve the topic, the mode and the placement* for a chapter shaped like one slice, otherwise a short lowercase-kebab key;
     - its title and position;
     - its goal: what the reader understands after it;
     - its **reader tasks**: 2 to 4 things the book's reader comes to this chapter to do, each with its **deliverable**, the thing they will use to do it (a checklist, a decision table, the commands to run, the test that guards a behaviour). The chapter's own outline opens with them (the `## Reader's task` of §3.10 *D6: the final outline, the reader's path*), and the critic checks that the chapter serves each one;
     - its mode, per §1 *Resolve the topic, the mode and the placement*: change, topic or general;
     - its sources: a commit range, files or URLs, and its key sources by `S-` id, rung 1 first;
     - its **questions** (their ids, load-bearing marked), its **claim ids** with their statuses, and its **declared gaps** (gap ids, each to be stated or dropped);
     - its **expected top-up**: what its depth needs that this research only skimmed, or `none` (§9.2 *Research for a book (an explain phase)*);
     - the must-cover items it carries, if any;
     - its planned diagrams and figures, and what each one shows;
     - its quiz targets: the understanding each item checks, never recall of a detail;
     - its **tags**: 2 to 5, lowercase-kebab, the `--tag` values of its publish;
     - its **images**: `none`, or each name and what it shows (§4.7 *Images*);

     **Write diagram and quiz targets so that the critic can check them against the code.** Name the exact
     case, not the general one: a *loose document* or a *bound chapter* (they answer differently), a
     placed chapter or not. For a diagram of steps, say that its order is the code's order, and name the
     function it is read from. A target worded "an already-published document" is a different question
     from "an already-published chapter", and the drafter and the critic must not have to guess which;
   - **the optional last chapter, `sources` ("Sources and further reading"),** when the reader would use a reading list: drawn from the book's `library.md` and each chapter's `library-ch<k>.md`, by chapter, rung 1 first. It adds no evidence (its expected top-up is `none`, and its slice skips the gap check and top-up of §9.3 *A chapter: its top-up, then the draft*) and has no quiz; the critic still judges it. It is listed at the gate like any chapter;
   - **out of scope:** what the book deliberately leaves out: the brief's leave-out, and what the research found that the book will not teach.
4. **Write `book/research/summary.md`** per §9.2 *Research for a book (an explain phase)*: key sources, open disagreements, weak spots, expected top-ups. The outline gate links it.
5. **Cut one bare chapter slice per chapter**, in reading order:

   ```sh
   python3 scripts/workflow.py new-slice --phase P<N> --slice P<N>.S<k> --name "<key>: <title>" \
     --kind implementation --risk high --order <10k>
   ```

   - **Risk.** Every chapter is `high`, for one named trigger written once in the breakdown: **open design**, because its executor leads a research run (the chapter's top-up) and writes alone from the evidence. §9.3 *A chapter: its top-up, then the draft* is written for that Opus lead, and the critic runs on opus too (`reference/explain-chapter.md`, *The critic's model*).
   - **Bare folders.** Never write a chapter's `plan.md`.
   - **Undeclared.** Cut chapters without `--depends-on`: an explain phase declares nothing, so every chapter runs alone, never in a wave (`reference/wave.md`).
   - **No translation slices.** A translation names the published original's version (the `translated_from` of §5 *Publish via the KB document API*), so translations follow the accepted book (`reference/explain-review.md`).
6. **Update `phase.md`**, entry by entry through `phase-section` (never `Read`, `Edit` or `Write` it):
   - `## Decisions`: one gist line for the book (placement, project, chapter count, the research run's id and counts), linking `book/outline.md`;
   - `## Notes for later slices`: the taught-terms list, so each chapter knows what to recap, tagged for every chapter;
   - `## Now`: the outline awaits the operator's signature.
7. **Return** `done` once the outline and the summary are written and the slices cut. A research run that stops returns instead, with no slice cut (*Research stops*, below).

### The outline gate (yours, after the executor returns)

Right after `finish-slice <P>.DECOMP`, in the same commit (the dossier rides in it; git ignores `pages/`):

1. **Declare the gate:** `python3 scripts/workflow.py accept-gate <P> --require`. The operator accepts a book by reading it in the real reader; a book never waives.
2. **Stop the first chapter slice in order** (normally `<P>.S1`; after a re-cut, whichever comes first):

   ```sh
   python3 scripts/workflow.py set-slice-status <P>.S1 pending --stop-kind decision \
     --on-words "'accept' signs the outline and the chapters run; feedback re-runs DECOMP"
   ```
3. **Validate, commit, report and STOP.** The report follows the contract's stop rules:
   - about 2k characters, with `book/outline.md` and `book/research/summary.md` linked;
   - the chapter list: key, title and a one-line goal for each;
   - the research in one line: researchers, gap rounds, and why it stopped;
   - at most ~5 decisions: those that change what the book teaches, contradict the operator's own words, or are costly to reverse once chapters are written (a reader assumption, a chapter merged or cut, a must-cover item below the evidence gate, an open disagreement the book must take a side on);
   - the rest in one "decided as drawn" list, with the summary's weak spots and expected top-ups.

**On the operator's return:**

- **"accept"** (or "moveon"), literally: set that slice to `in_progress`, add a `## Decisions` line ("outline signed, attempt <n>"), and run the chapters (`reference/explain-chapter.md`). **The signature freezes the book's research:** from then on, `book/research/library.md`, `ledger.md` and the files they index are never edited (§9.2 *Research for a book (an explain phase)*); each chapter writes only the files named for it. The review checks it.
- **Feedback: `DECOMP` runs again.**
  1. Set that slice back to `todo` and `<P>.DECOMP` back to `in_progress`.
  2. Append `## Attempt <n>` to the DECOMP's `plan.md`, with the operator's words verbatim.
  3. Dispatch it again on the high row.
  4. The executor resumes the research run from `run.md` (D0b again), adds research only within the ceiling of §9.2 *Research for a book (an explain phase)* (the dispatches already made count), revises `book/outline.md` and the summary, and re-cuts the slices. Nothing is frozen before the signature.
     - a chapter whose key survives keeps its slice, since its `plan.md` is drawn from the outline entry, so a new title needs nothing;
     - a new chapter gets `new-slice` with a fractional `--order`;
     - a chapter the revision drops is listed in the verdict, and you close it with `finish-slice <id> --outcome "dropped: not in the outline, attempt <n>"`. The engine has no delete, and a bare slice closed this way did nothing.
  5. Stop at the gate again (steps 2 and 3; the acceptance gate is already declared).

  Each round is one commit and one stop.

### Each chapter's `plan.md`, later

When a chapter slice comes up, plan it per `reference/explain-chapter.md` (*What `plan.md` names*). Every field is drawn from `book/outline.md`:
- from the chapter's entry: the key and position, the entry itself (its goal, **reader tasks**, questions, claim ids, declared gaps and expected top-up), the mode and the source, and its tags and images;
- from the book's header: the skill's path, the dossier and its run id, the reader, the brief, and the publish fields (project, book, kind and title, chapter key and position, chapter title, language, sources);
- from the slice's own `## Dispatch`: the `--co-authored-by` attribution. The `--source-repo` is the repo root, and the check's target is "the configured knowledge base" (§2 *Resolve the knowledge base configuration*), the org the review publishes into. Nothing in a plan names a URL or a key. The summary is written with the draft.

If the outline cannot fill a field, that is a gap in the outline. Ask about it; never invent it in a plan.

## A document or a chapter

The unit's research is one run of the plugin's §3 *Research*, led by the `DECOMP` executor in the phase's own dossier, and its draft is one write slice. A chapter here is a chapter **added** to an existing book: a fresh single-unit run, never the top-up of §9.3 *A chapter: its top-up, then the draft* (the book's frozen dossier belongs to the phase that wrote it, and may be archived).

```
P<N> (unit: document | chapter)
  DECOMP  decomposition, high row: research lead (D0–D5g) and D6 → doc/outline.md; cuts S1
  S1      implementation, risk high, undeclared: write and check → the critic (yours) → revise
  REVIEW  review, high row: check, publish private, prove it private, read it back, rule on disputes
```

### What the plan asks the executor to do

1. **Read the skill** at the path the plan names: its run card (*The run, in one card*), §3 *Research* through §3.10 *D6: the final outline, the reader's path*, and Part B *The research roles* where they send you.
2. **Lead the unit's research run** into the dossier `doc/` in the phase folder (`works/phases/active/P<N>/doc/`). It **is** the plugin's `<DOSSIER>` (§2 *Resolve the knowledge base configuration*; its files are B9 *The dossier: files, ids and entries*): `brief.md`, `plan.md`, `run.md`, `outline.md`, `findings/`, `library.md`, `ledger.md`, `verify/`, `gaps/`, then the write slice's `body.md`, `trace.md`, `critique.md` and `assets/`. Never name it `explain/`: the installer treats a path with an `explain` component as the plugin's.
   - **first**, write `doc/pages/.gitignore`, two lines, `*` then `!.gitignore`; the rest of the dossier is committed with the slice;
   - the run id is `<KB_NOW>-<slug>`; `run.md` holds the run's state (§3.3 *`run.md`, and resuming a run*), so a stopped span goes on from its recorded stage, D0b first;
   - **D0, the brief** (§3.1 *D0: the brief, and the prior version*) comes from `## Explain`: subject, mode, run, reader, must-cover, leave-out, trusted sources, `lang`; placement `loose` for a document, `<book>/<key>` for a chapter;
   - **the prior** (a v2): from `prior:`, or from that section's own lookup when it is `none`. D0 reads the prior's source and carries every surviving id forward. If the v1's phase folder is still in this repo (active or archived), its `doc/library.md` and `ledger.md` are **scouting leads** for D1, re-opened before use and never evidence as they stand;
   - **a chapter reads its book at D0:** the book's chapters (`GET <KB_API_BASE_URL>/api/books/<project>/<book>` with the org key, as §3.1 *D0: the brief, and the prior version* reads a placement) and, when the book came from a phase in this repo (active or archived), that phase's `book/outline.md`. Write what they give into `doc/outline.md` under `## The book`: the chapter's position, the terms earlier chapters teach (with the chapter that teaches each), so it can recap them, the terms it teaches itself, and the keys it may link to as an extra. The draft and the critic read it there; the review checks the order against the published book;
   - the evidence by subject, the `slice:` line on every agent prompt (`slice: <P>.DECOMP (a label for the workspace's meter, not a task)`), and probe A and every wave in the foreground: exactly as for a book, step 2 above;
   - **the run, from `run:`** (§3.9 *`quick` and `no-research`*): `full` runs §3.4 *D1: the plan* through §3.8 *D5, D5s and D5g: final verification, and the evidence gate* with its research team; **`quick`** has no research team: the lead researches the angles alone, then one verifier batch on another model, and keeps every file that section lists; **`no-research`** (the operator's words only) reads the repository by mode, with no web probe, no plan, no team and no ledger;
   - **D5g, the evidence gate** (§3.8 *D5, D5s and D5g: final verification, and the evidence gate*), for `full` and `quick`: below it, the run stops before writing (*Research stops*, below), and no slice is cut;
   - **D6, the reader's path** (§3.10 *D6: the final outline, the reader's path*): `doc/outline.md`, final, opening with `## Reader's task`.
3. **Note a scoped-down topic.** When D1's plan is plainly over one document (the test of §9.1 *The book suggestion*, (b)), the run keeps to what one document carries, and the `## Decisions` gist names the part left out: the closing report suggests a book for it.
4. **Cut exactly one write slice:**

   ```sh
   python3 scripts/workflow.py new-slice --phase P<N> --slice P<N>.S1 --name "<the unit's title>" \
     --kind implementation --risk high --order 10
   ```

   `high` for **open design**: its executor writes alone from the evidence. A bare folder, undeclared (no `--depends-on`), and no translation slice, as for a book.
5. **Update `phase.md`**, entry by entry through `phase-section`: `## Decisions`, one gist line (the unit, its placement and project, the run and its id, the research counts and the gate's counts, a scoped-out part if any), linking `doc/outline.md`; for a chapter, `## Notes for later slices`, the terms earlier chapters teach, so it can recap them, and the keys it may link to as an extra, tagged for S1; `## Now`.
6. **Return** `done` once `doc/outline.md` is final and S1 is cut.

### After the executor returns: the gate, and the outline sign-off

Right after `finish-slice <P>.DECOMP`, in the same commit (the dossier rides in it):

1. **Declare the gate, waived:** a document `accept-gate <P> --waive --note "standalone explain document: published private; a v2 is cheap"`; a chapter `accept-gate <P> --waive --note "explain chapter: published private; a v2 is cheap"`.
2. **The outline sign-off is off** unless `## Explain` says `outline sign-off: on`: then S1 runs at once (`reference/explain-chapter.md`, *A document or a chapter: its one write slice*). With `on`, stop S1 before its first span:

   ```sh
   python3 scripts/workflow.py set-slice-status <P>.S1 pending --stop-kind decision \
     --on-words "'accept' signs the outline and S1 runs; feedback re-runs DECOMP from run.md"
   ```

   and report as the book's gate does (step 3 of *The outline gate*, with `doc/outline.md` linked and the reader's tasks in place of the chapter list). `accept` runs S1; feedback re-runs `DECOMP` from `run.md` as a book's does (no freeze applies: nothing is drawn from the outline but S1's plan).

### S1's `plan.md`, later

Plan it per `reference/explain-chapter.md` (*A document or a chapter: its one write slice*), drawn from `## Explain`, `doc/brief.md`, `doc/outline.md` (its `## The book`, for a chapter) and the `DECOMP`'s `## Decisions` gist: the skill's path and version, the dossier and its run id, the run, the reader, the brief, the prior, and the publish fields (project, lang, `--source-repo` the repo root, `--co-authored-by` from S1's own `## Dispatch`; a chapter's book, key, position and title; a v2 document's `--new-version --rel-path <rel_path>`). Title, summary and tags are the executor's, by §5 *Publish via the KB document API*. Nothing names a URL or a key.

## Research stops (every unit)

A research run that stops returns instead of `done`, with no slice cut, and a re-dispatch goes on from `run.md`:
- `FAILED: permissions` (§3.2 *D0b: the preflight*): `needs_operator`, with the rules block the skill printed; the operator turns on auto mode or adds the rules, and the span resumes from `run.md`, or starts again at §2 *Resolve the knowledge base configuration* when it stopped before writing one;
- `failed: search-limit`: `needs_operator`; the operator raises the cap or starts a new session (the cap is per session), and the span resumes from `run.md`;
- `FAILED: web research unavailable`: `blocked`;
- **`STOPPED: evidence gate`** (a document or a chapter only; a book has no gate stop): `needs_operator`, with the failing must-cover items and questions, their best sources and the queries run. Set `<P>.DECOMP` `pending --stop-kind decision --on-words "trust <source> / drop <item> / narrow the subject: DECOMP resumes from run.md"` and STOP: it is one of the run's quality stops. The operator's reply goes verbatim into the DECOMP's `plan.md` as `## Attempt <n>`, and the span resumes from `run.md` (`trust`: one more round on those items; `drop`: out of the must-cover; a narrower subject is recorded in `## Explain` first).
