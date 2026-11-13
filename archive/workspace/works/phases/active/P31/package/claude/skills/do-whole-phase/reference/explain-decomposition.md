# do-whole-phase — an explain phase's decomposition and the outline gate

An explain phase is one whose `intent.md` carries an `## Explain` section, written by `create-phase`'s explain route. Its `DECOMP` follows `reference/decomposition.md`: planned at the gate unless the operator said `auto`, dispatched to `slice-executor-high`, with the acceptance gate declared at its boundary. This file adds three things: what that `DECOMP` cuts, the outline stop after it, and how a chapter's `plan.md` is later drawn from the outline. The writing rules are the knowledge plugin's `skills/explain/SKILL.md`, cited by section and never copied here.

## Before you plan it

- **Read `## Explain`.** Check that all eight fields are present (subject, mode, book, lang, reader, depth, project, visibility) and that `visibility` is `private`. A field that is missing or contradicts the rest STOPs you before dispatch: a project the operator says is public, or a subject that does not exist. Set `<P>.DECOMP` `pending` with `--stop-kind decision --on-words "<their answer completes ## Explain, then DECOMP runs>"`, ask by the contract's stop rules, and record the answer in `## Explain`.
- **Locate the explain skill.** It is the installed plugin's `skills/explain/SKILL.md`; `Glob` `~/.claude/plugins/cache/*/knowledge/*/skills/explain/SKILL.md` if you do not know where. Its plugin version, in the `plugin.json` beside it, must be 0.5.0 or later. If it is missing or older, set `<P>.DECOMP` `pending` with `--stop-kind operator-action`: the operator installs or updates the plugin. Name the skill's path in `plan.md`.
- **Estimate from the meter**, as `reference/decomposition.md` says: the number of chapters × the metered mean of a chapter slice (three spans: executor, critic, executor), plus the review.

## What the plan asks the executor to do

1. **Research the subject, read-only**, per the skill's §3:
   - **a phase:** its `intent.md`, `phase.md`, each slice's `result.md` head and `python3 scripts/workflow.py phase-scope <P>` for the commit range and files, then the code itself;
   - **a slice:** that slice's records and its commits;
   - **a free topic:** this repo's code in `codebase` mode, or the web in `general` mode.

   Long notes go to `topics/outline-research.md` in the phase folder; bulky lookups go to `Explore`.
2. **Write `book/outline.md`** in the phase folder (`works/phases/active/P<N>/book/`). The operator signs this file, each chapter's `plan.md` is drawn from it, and `explain-critic` checks every chapter against it. It states:
   - **the book:** slug, title and kind (§1); the private project; the language; the explain skill's path and version;
   - **the reader:** who they are, what they already know, and what they can do after the book;
   - **the order and prerequisites:** the chapters in reading order, each naming the earlier keys it builds on, plus the terms the book defines and the chapter that defines each one, once;
   - **each chapter's entry:**
     - its key: §1's slice key for a chapter shaped like one slice, otherwise a short lowercase-kebab key;
     - its title and position;
     - its goal: what the reader understands after it;
     - its mode, per §1: change, topic or general;
     - its sources: a commit range, files or URLs;
     - its planned diagrams and figures, and what each one shows;
     - its quiz targets: the understanding each item checks, never recall of a detail;
     - its **tags**: 2 to 5, lowercase-kebab, the `--tag` values of its publish;
     - its **research line**, `web research: on | off`, with the reason (skill §3's judgment gate: on for a
       subject with an outside comparison surface, off for repo-private glue), so a missing "Best practices
       & next steps" section is a decision the critic can see, not a gap;
     - its **images**: `none`, or each name and what it shows (the skill's §4.7);
     - a `high:` line naming the trigger, when it has one;

     **Write diagram and quiz targets so that the critic can check them against the code.** Name the exact
     case, not the general one: a *loose document* or a *bound chapter* (they answer differently), a
     placed chapter or not. For a diagram of steps, say that its order is the code's order, and name the
     function it is read from. A target worded "an already-published document" is a different question
     from "an already-published chapter", and the drafter and the critic must not have to guess which;
   - **out of scope:** what the book deliberately leaves out.
3. **Cut one bare chapter slice per chapter**, in reading order:

   ```sh
   python3 scripts/workflow.py new-slice --phase P<N> --slice P<N>.S<k> --name "<key>: <title>" \
     --kind implementation --risk low --order <10k> [--depends-on P<N>.S<j>]
   ```

   - **Risk.** `--risk low` is the mid tier, and the norm for a chapter. Rate `high` only for a named trigger, written on the chapter's `high:` line: a chapter on a core algorithm or invariant, where a subtly wrong explanation would mislead the reader about how the system really behaves.
   - **Bare folders.** Never write a chapter's `plan.md`.
   - **No translation slices.** A translation names the published original's version (§5's `translated_from`), so translations follow the accepted book (`reference/explain-review.md`).
4. **Update `phase.md`:**
   - `## Decisions`: one line for the book (placement, project, chapter count, `book/outline.md`);
   - `## Notes for later slices`: the defined-terms list, tagged for every chapter;
   - `## Now`: the outline awaits the operator's signature.

## The outline gate (yours, after the executor returns)

Right after `finish-slice <P>.DECOMP`, in the same commit:

1. **Declare the gate:** `python3 scripts/workflow.py accept-gate <P> --require`. The operator accepts by reading the book in the real reader; an explain phase never waives.
2. **Stop the first chapter slice in order** (normally `<P>.S1`; after a re-cut, whichever comes first):

   ```sh
   python3 scripts/workflow.py set-slice-status <P>.S1 pending --stop-kind decision \
     --on-words "'accept' signs the outline and the chapters run; feedback re-runs DECOMP"
   ```
3. **Validate, commit, report and STOP.** The report follows the contract's stop rules:
   - about 2k characters, with `book/outline.md` linked;
   - the chapter list: key, title and a one-line goal for each;
   - at most ~5 decisions: those that change what the book teaches, contradict the operator's own words, or are costly to reverse once chapters are written (a reader assumption, a chapter merged or cut, a `high` chapter);
   - the rest in one "decided as drawn" list.

**On the operator's return:**

- **"accept"** (or "moveon"), literally: set that slice to `in_progress`, add a `## Decisions` line ("outline signed, attempt <n>"), and run the chapters (`reference/explain-chapter.md`).
- **Feedback: `DECOMP` runs again.**
  1. Set that slice back to `todo` and `<P>.DECOMP` back to `in_progress`.
  2. Append `## Attempt <n>` to the DECOMP's `plan.md`, with the operator's words verbatim.
  3. Dispatch it again on the high row.
  4. The executor revises `book/outline.md` and re-cuts the slices:
     - a chapter whose key survives keeps its slice, since its `plan.md` is drawn from the outline entry, so a new title needs nothing;
     - a new chapter gets `new-slice` with a fractional `--order`;
     - a chapter the revision drops is listed in the verdict, and you close it with `finish-slice <id> --outcome "dropped: not in the outline, attempt <n>"`. The engine has no delete, and a bare slice closed this way did nothing.
  5. Stop at the gate again (steps 2 and 3; the acceptance gate is already declared).

  Each round is one commit and one stop.

## Each chapter's `plan.md`, later

When a chapter slice comes up, plan it per `reference/explain-chapter.md` (*What `plan.md` names*). Every field is drawn from `book/outline.md`:
- from the chapter's entry: the key, the entry itself, the mode and the source, and its tags, research line and images;
- from the book's header: the skill's path, the reader, and the publish fields (project, book, kind and title, chapter key and position, chapter title, language, sources);
- from the slice's own `## Dispatch`: the `--co-authored-by` attribution. The `--source-repo` is the repo root, and the check's target is "the configured knowledge base" (skill §2), the org the review publishes into. Nothing in a plan names a URL or a key. The summary is written with the draft.

If the outline cannot fill a field, that is a gap in the outline. Ask about it; never invent it in a plan.
