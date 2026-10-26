# do-whole-phase — an explain phase's decomposition and the outline gate

An explain phase is one whose `intent.md` carries an `## Explain` section, written by `create-phase`'s explain route. Its `DECOMP` follows `reference/decomposition.md`: planned at the gate unless the operator said `auto`, dispatched on the high row, with the acceptance gate declared at its boundary. This file adds four things: the whole-book research that `DECOMP` leads before it outlines, what it cuts, the outline stop after it, and how a chapter's `plan.md` is later drawn from the outline. The research and writing rules are the knowledge plugin's `skills/explain/SKILL.md` (§9.2 for the book's research, §9.3 for a chapter), cited by section and never copied here.

## Before you plan it

- **Read `## Explain`.** Check that all eleven fields are present (subject, mode, book, lang, reader, depth, must-cover, leave-out, trusted sources, project, visibility), that `visibility` is `private`, and that `lang` is `en` unless the operator named another language. `must-cover`, `leave-out` and `trusted sources` may be `none`. A phase created before those three existed: add them as `none` and list them under "decided as drawn" at the outline gate. A field that is missing or contradicts the rest STOPs you before dispatch: a project the operator says is public, or a subject that does not exist. Set `<P>.DECOMP` `pending` with `--stop-kind decision --on-words "<their answer completes ## Explain, then DECOMP runs>"`, ask by the contract's stop rules, and record the answer in `## Explain`.
- **Locate the explain skill through the plugin registry,** never by searching the plugin cache, which can move: Read `~/.claude/plugins/installed_plugins.json` (in the Claude config folder, `~/.claude` unless `CLAUDE_CONFIG_DIR` moves it). Its `plugins` object lists `knowledge@<marketplace>` (normally `knowledge@knowledge`) as installs, each with `installPath`, `version` and `scope`; a project-scoped install of this repo comes before a user-scoped one. The skill is `<installPath>/skills/explain/SKILL.md`, and the version must be **0.6.0 or later** (the book section, §9, and the research agents). If it is missing or older, set `<P>.DECOMP` `pending` with `--stop-kind operator-action`: the operator installs or updates the plugin. Name the skill's path and version in `plan.md`.
- **Say what the research needs, in the plan-gate report.** The research agents run on the session's permissions: interactive Claude Code's default auto mode needs nothing more, and manual mode needs the rules the skill's preflight prints (§3.2), added to `.claude/settings.local.json`, never to the shipped `settings.json`, **with the block's lines for a lead that read the skill by path**: the executor reads `SKILL.md` as a file, so the skill's `allowed-tools` grant never covers it, and its first call, §2's resolver, is a `python3 -c` that only `Bash(python3 -c *)` allows (it lets any inline Python run; auto mode needs none of this). Name those rules in the report, so that the operator adds them before the dispatch and not after a stopped span. Every web search in the session, the agents' included, counts against Claude Code's per-session cap (200 by default): a book's whole-book research alone can pass it. The operator raises `CLAUDE_CODE_MAX_WEB_SEARCHES_PER_SESSION` in their user settings' `env`; you never set it.
- **Estimate time from the meter**, as `reference/decomposition.md` says: the `DECOMP` (one long research span), plus the number of chapters × the metered span-minutes of a chapter slice (three spans: executor, critic, executor), plus the review. Until the meter holds an explain phase's spans, say so and give the order of magnitude: the whole-book research dispatches tens of research agents, and each chapter costs about one full `/knowledge:explain` run. Each slice carries its `spends money:` line, normally `no`: the research agents are the workspace's own dispatches, and a chapter citing paid sources is not spend.

## What the plan asks the executor to do

The `DECOMP` executor is the **lead** of the book's research run (§9.2). `slice-executor`'s explain carve-out lets it dispatch the research agents the skill names (*Delegate reads, never writes*); it writes the dossier's indexes, the outline and the summary itself.

1. **Read the skill** at the path the plan names: its run card, §3 and §9.2, and Part B where they send you.
2. **Lead the whole-book research** per §9.2, into the dossier `book/research/` in the phase folder (`works/phases/active/P<N>/book/research/`):
   - **first**, write `book/research/pages/.gitignore`, two lines, `*` then `!.gitignore`: fetched pages stay out of git, and the rest of the dossier is committed with the slice;
   - the run id is `<KB_NOW>-<book slug>`. `run.md` holds the run's state (§3.3), so a span stopped by a usage limit is re-dispatched from disk and goes on from its recorded stage, D0b first, never from scratch;
   - the brief (D0) comes from `## Explain`: subject, mode, reader, depth, must-cover, leave-out, trusted sources and `lang`, placement `book <slug>`;
   - the evidence, by subject: a **phase** is its records (`intent.md`, its notebook through `phase-section <P>` with its `topics/`, each slice's `result.md` head, and `python3 scripts/workflow.py phase-scope <P>` for the commit range and files) and its code; a **slice** is its records and commits; a **free topic** is this repo in `codebase` mode, or the web in `general` mode. A code researcher's repository is the session's working folder;
   - **every prompt you send an agent starts with the line `slice: <P>.DECOMP (a label for the workspace's meter, not a task)`**, then the dispatch block the skill gives: the preflight's probe agents (§3.2) and every researcher, gap reviewer and verifier. `dispatch-summary` attributes a nested span by that line; the words in brackets keep a general agent (the preflight's probes) from taking it for a slice to execute;
   - **you are a subagent,** so a background agent's completion never reaches you: the probe agent A and every wave go in the foreground, a wave's calls in one message, where they run at once (§3.2, §3.5);
   - the questions, waves, gap rounds and ceiling are §9.2's, then D5–D5s and `gaps/final.md`. There is no gate stop here: what would fail D5g is a weak spot, reported in the summary.
3. **Write `book/outline.md`** in the phase folder (`works/phases/active/P<N>/book/`), drawn from the ledger. The operator signs this file, each chapter's `plan.md` is drawn from it, and the critic checks every chapter against it. It states:
   - **the book:** slug, title and kind (§1); the private project; `lang`; the explain skill's path and version; the dossier and its run id;
   - **the reader:** who they are, what they already know, and what they can do after the book;
   - **the brief:** must-cover, leave-out and trusted sources, as `## Explain` gives them;
   - **the order and prerequisites:** the chapters in reading order, each naming the earlier keys it builds on, plus the terms the book defines and the chapter that defines each one, once;
   - **each chapter's entry:**
     - its key: §1's slice key for a chapter shaped like one slice, otherwise a short lowercase-kebab key;
     - its title and position;
     - its goal: what the reader understands after it;
     - its **reader tasks**: 2 to 4 things the book's reader comes to this chapter to do, each with its **deliverable**, the thing they will use to do it (a checklist, a decision table, the commands to run, the test that guards a behaviour). The chapter's own outline opens with them (§3.10's `## Reader's task`), and the critic checks that the chapter serves each one;
     - its mode, per §1: change, topic or general;
     - its sources: a commit range, files or URLs, and its key sources by `S-` id, rung 1 first;
     - its **questions** (their ids, load-bearing marked), its **claim ids** with their statuses, and its **declared gaps** (gap ids, each to be stated or dropped);
     - its **expected top-up**: what its depth needs that this research only skimmed, or `none` (§9.2);
     - the must-cover items it carries, if any;
     - its planned diagrams and figures, and what each one shows;
     - its quiz targets: the understanding each item checks, never recall of a detail;
     - its **tags**: 2 to 5, lowercase-kebab, the `--tag` values of its publish;
     - its **images**: `none`, or each name and what it shows (the skill's §4.7);

     **Write diagram and quiz targets so that the critic can check them against the code.** Name the exact
     case, not the general one: a *loose document* or a *bound chapter* (they answer differently), a
     placed chapter or not. For a diagram of steps, say that its order is the code's order, and name the
     function it is read from. A target worded "an already-published document" is a different question
     from "an already-published chapter", and the drafter and the critic must not have to guess which;
   - **the optional last chapter, `sources` ("Sources and further reading"),** when the reader would use a reading list: drawn from the book's `library.md` and each chapter's `library-ch<k>.md`, by chapter, rung 1 first. It adds no evidence (its expected top-up is `none`, and its slice skips §9.3's gap check and top-up) and has no quiz; the critic still judges it. It is listed at the gate like any chapter;
   - **out of scope:** what the book deliberately leaves out: the brief's leave-out, and what the research found that the book will not teach.
4. **Write `book/research/summary.md`** per §9.2: key sources, open disagreements, weak spots, expected top-ups. The outline gate links it.
5. **Cut one bare chapter slice per chapter**, in reading order:

   ```sh
   python3 scripts/workflow.py new-slice --phase P<N> --slice P<N>.S<k> --name "<key>: <title>" \
     --kind implementation --risk high --order <10k>
   ```

   - **Risk.** Every chapter is `high`, for one named trigger written once in the breakdown: **open design**, because its executor leads a research run (the chapter's top-up) and writes alone from the evidence. §9.3 is written for that Opus lead, and the critic runs on opus too (`reference/explain-chapter.md`, *The critic's model*).
   - **Bare folders.** Never write a chapter's `plan.md`.
   - **Undeclared.** Cut chapters without `--depends-on`: an explain phase declares nothing, so every chapter runs alone, never in a wave (`reference/wave.md`).
   - **No translation slices.** A translation names the published original's version (§5's `translated_from`), so translations follow the accepted book (`reference/explain-review.md`).
6. **Update `phase.md`**, entry by entry through `phase-section` (never `Read`, `Edit` or `Write` it):
   - `## Decisions`: one gist line for the book (placement, project, chapter count, the research run's id and counts), linking `book/outline.md`;
   - `## Notes for later slices`: the defined-terms list, tagged for every chapter;
   - `## Now`: the outline awaits the operator's signature.
7. **Return** `done` once the outline and the summary are written and the slices cut. A research run that stops returns instead, with no slice cut:
   - `FAILED: permissions` (§3.2): `needs_operator`, with the rules block the skill printed; the operator turns on auto mode or adds the rules, and the span resumes from `run.md`, or starts again at §2 when it stopped before writing one;
   - `failed: search-limit`: `needs_operator`; the operator raises the cap or starts a new session (the cap is per session), and the span resumes from `run.md`;
   - `FAILED: web research unavailable`: `blocked`.

## The outline gate (yours, after the executor returns)

Right after `finish-slice <P>.DECOMP`, in the same commit (the dossier rides in it; git ignores `pages/`):

1. **Declare the gate:** `python3 scripts/workflow.py accept-gate <P> --require`. The operator accepts by reading the book in the real reader; an explain phase never waives.
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

- **"accept"** (or "moveon"), literally: set that slice to `in_progress`, add a `## Decisions` line ("outline signed, attempt <n>"), and run the chapters (`reference/explain-chapter.md`). **The signature freezes the book's research:** from then on, `book/research/library.md`, `ledger.md` and the files they index are never edited (§9.2); each chapter writes only the files named for it. The review checks it.
- **Feedback: `DECOMP` runs again.**
  1. Set that slice back to `todo` and `<P>.DECOMP` back to `in_progress`.
  2. Append `## Attempt <n>` to the DECOMP's `plan.md`, with the operator's words verbatim.
  3. Dispatch it again on the high row.
  4. The executor resumes the research run from `run.md` (D0b again), adds research only within §9.2's ceiling (the dispatches already made count), revises `book/outline.md` and the summary, and re-cuts the slices. Nothing is frozen before the signature.
     - a chapter whose key survives keeps its slice, since its `plan.md` is drawn from the outline entry, so a new title needs nothing;
     - a new chapter gets `new-slice` with a fractional `--order`;
     - a chapter the revision drops is listed in the verdict, and you close it with `finish-slice <id> --outcome "dropped: not in the outline, attempt <n>"`. The engine has no delete, and a bare slice closed this way did nothing.
  5. Stop at the gate again (steps 2 and 3; the acceptance gate is already declared).

  Each round is one commit and one stop.

## Each chapter's `plan.md`, later

When a chapter slice comes up, plan it per `reference/explain-chapter.md` (*What `plan.md` names*). Every field is drawn from `book/outline.md`:
- from the chapter's entry: the key and position, the entry itself (its goal, **reader tasks**, questions, claim ids, declared gaps and expected top-up), the mode and the source, and its tags and images;
- from the book's header: the skill's path, the dossier and its run id, the reader, the brief, and the publish fields (project, book, kind and title, chapter key and position, chapter title, language, sources);
- from the slice's own `## Dispatch`: the `--co-authored-by` attribution. The `--source-repo` is the repo root, and the check's target is "the configured knowledge base" (skill §2), the org the review publishes into. Nothing in a plan names a URL or a key. The summary is written with the draft.

If the outline cannot fill a field, that is a gap in the outline. Ask about it; never invent it in a plan.
