# do-whole-phase — an explain phase's review: read the book, publish it private, read it in the reader

An explain phase is one whose `intent.md` carries `## Explain`. Its `REVIEW` is a review slice like any other:
- it runs on the high row and is delegated to `slice-executor-high`;
- `reference/review.md` still owns recording the verdict, the acceptance gate, fix slices and archiving.

What differs is the work it reviews, which is a book rather than product code, and so what its `plan.md` asks for. The writing and publish rules are the knowledge plugin's `skills/explain/SKILL.md`, cited by section and never copied here.

**The review's one carve-out in an explain phase: it publishes.** A review normally changes nothing outside `result.md`, `phase.md` and its two gate sections. This one publishes every chapter to the knowledge base, **private**, because a book can be read in the real reader only once it is published: there is no scratch reader. It still edits no source and no chapter (fix slices do that), versions no doc, and runs no state command.

## Plan the review so the executor

1. **Validates the chapters together.** For each chapter slice, read the head of its `result.md`:
   - `status: done`;
   - `critique: answered`;
   - its `disputed:` ids;
   - its `## Publish` section.

   Then run `python3 scripts/workflow.py validate`. A chapter not done is a finding.
2. **Reads the whole book** in the outline's order: `book/<key>.md` against `book/outline.md`. It reads for:
   - the flow between chapters;
   - repetition: a term taught twice, or a diagram drawn twice;
   - a term used before the chapter that defines it;
   - the outline's promises: every chapter's goal met, every planned diagram and figure present, every quiz target tested.
3. **Decides every `disputed` critic finding.** Each `Cnn · disputed` line in a chapter's `## Critique answers` is read beside the finding in `book/critique/<key>.md` and the chapter, then ruled on:
   - **upheld:** it becomes a finding and a fix slice;
   - **overruled:** it gets a line in `result.md` saying why.

   No dispute is left open.
4. **Checks every chapter.** Run its `## Publish` command exactly as written (the skill's §4.9):
   - **exit 1:** a finding; that chapter is not published, and its fix slice publishes it;
   - **exit 2:** the server has no check route; say so, and let §5's 422 be the backstop.
5. **Publishes every chapter, private**, in the outline's order:
   - **The credential** is the operator's org key, the one `/knowledge:setup` wrote and §2 resolves. **Never** use the master token or a tenant #1 key: those publish public by definition. If you are not sure which one you hold, return `needs_operator` before the first publish.
   - **The project** is the one in `## Explain`, which is private. A new name is created private on its first publish.
   - **Each chapter** is published with its `## Publish` command, `check` swapped for `save`, and `--json` added to read the response. Its `book/assets/<key>/` files are re-attached; the command already names them (§4.7, §5). Record each response's `url`, `rel_path` and `version` in a `## Published` table in `result.md`.
   - **After the first chapter, prove it is private.** Fetch its `url`, and `GET <KB_API_BASE_URL>/api/documents/by-path/<rel_path>`, with **no** credential and no cookie. Both must miss (404). If either one reads, stop publishing and return `needs_operator`: the project is public, and the operator fixes its visibility. Never publish the rest into it.
   - **A transport failure** is verified before any retry, per §5.1. Never re-send blind.
   - **A `chapter:` link warning** for a sibling not yet published is expected mid-run; step 6 confirms the link lands.
6. **Reads the book in the real reader.**
   - **The instrument and agent account** come from `## Operator Runtime`: Aside, with `--account <id>` on every call. If the section is absent or still `UNFILLED`, return `needs_operator`.
   - **The sign-in.** A private book shows only to a signed-in member of its org, so the agent's own profile needs that sign-in. If the book page is a 404 there, return `needs_operator` (the operator signs the agent profile into the reader). Never use the operator's own profile.
   - **What to verify.** Open the book page and every chapter at the viewports the manifest names, and check that:
     - every chapter renders, with no error block and no raw block text;
     - every diagram and figure shows, and every image loads;
     - the quiz works: answer an item, and the grading and its `explain` show;
     - the book's order is the outline's;
     - every `chapter:` link lands.
   - **The report.** Name the instrument in `result.md`, and never claim a reading that was not made.
7. **Runs the gate stages** (the `review-phase` skill), mapped onto the book:
   - **stage 1:** the manifest, as in step 6;
   - **stage 2:** steps 5 and 6;
   - **stage 3:** read as the outline's reader, for the first time: whatever is dead, confusing or annoying in the reader;
   - **stage 4:** the phase changes no product file (`phase-scope <P>` shows none), so no `## Regression Checklist` line is inside its boundary, and it appends none. Record that;
   - **stage 5:** route every `## Operator Questions` entry;
   - **stage 6:** the walkthrough (step 8).
8. **Returns:**
   - the `review_verdict`, with findings numbered and a proposed fix slice for each chapter that needs one;
   - `doc_versions: none — deferred to a docs phase`. An explain phase leaves no `## Doc impact` notes and writes no gate section, so the engine stamps no debt;
   - the fixed pointer;
   - on a `pass`, the **walkthrough**:
     - the book's URL: its book page, `<site>/<org>/<project>/books/<book>`, taken from the publish responses;
     - the reading order, and what to read for (the outline's goals);
     - at most ~5 decisions, such as a dispute it overruled that changes what the book teaches;
     - the rest in one "decided as drawn" list;
     - one line: making the book public is the operator's act, after accepting it (the project's visibility, in the reader);
   - a deferred-job candidate for each translation `## Explain` asks for: title "Translate <book> into <lang>", the reason, and the trigger "the book is accepted". You file it; the executor never runs `defer-job`.

## Fix slices republish

A `changes_requested` verdict, or an operator-reported failure at the gate (`review-phase <P> --verdict changes_requested --note "operator-reported: …"`), becomes one fix slice per chapter that needs changes: `<P>.F<n>`, `--kind fix`. Rate it as `reference/review.md` says: `high` when the chapter's `result.md` reads `tier: mid`.

A fix slice:
1. revises `book/<key>.md` and its assets;
2. re-reads the result (§4.8);
3. re-runs `knowledge check` (§4.9) to exit 0;
4. **republishes** the chapter with its `## Publish` command, with `check` swapped for `save`. This is a new version of the same document: the id and URL are kept, and it stays private. Its plan says so; that one publish is the fix slice's carve-out. A chapter that never published (step 4's exit 1) is published by its fix in the same way.

No critic runs again, because the review has already judged the chapter.

The re-review then re-reads the changed chapters, and the chapters that link to them, in the reader.

## After a pass

Follow `reference/review.md`:
1. `accept-gate <P> --open --walkthrough "<walkthrough>"`;
2. file the deferred translation jobs;
3. `validate`, commit, report and STOP.

The operator reads the book. `accept` clears the gate, and you record the pass. The book stays private until the operator makes it public.
