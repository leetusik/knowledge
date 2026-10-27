# do-whole-phase — an explain phase's review: read it, publish it private, read it back

An explain phase is one whose `intent.md` carries `## Explain`. Its `REVIEW` is a review slice like any other:
- it runs on the high row and is delegated to `slice-executor`;
- `reference/review.md` still owns recording the verdict, the acceptance gate, fix slices and archiving.

What differs is the work it reviews, which is a book, a document or a chapter rather than product code, and so what its `plan.md` asks for, by `next`'s `explain_unit=`: a book (*Plan a book's review*, below), or a document or a chapter added to an existing book (*Plan a document's or a chapter's review*). The writing and publish rules are the knowledge plugin's `skills/explain/SKILL.md`, cited by section number and heading and never copied here.

**The review's one carve-out in an explain phase: it publishes.** A review normally changes nothing outside `result.md`, `phase.md` and its two gate sections. This one publishes, **private**, because a unit can be read in the real reader only once it is published: there is no scratch reader. It still edits no source and no draft (fix slices do that), versions no doc, and runs no state command.

## Plan a book's review so the executor

1. **Validates the chapters together.** For each chapter slice, read the head of its `result.md`:
   - `status: done`;
   - `critique: answered`;
   - its `disputed:` ids;
   - its `## Publish` section.

   Then run `python3 scripts/workflow.py validate`. A chapter not done is a finding.

   **Then check the freeze** (§9.2 *Research for a book (an explain phase)*): the book's research indexes are unedited since the outline's signature. The last `DECOMP` commit is `git log -1 --format=%h -- works/phases/active/P<N>/slices/<P>.DECOMP`. In `git log --format='%h %s' --name-status -- works/phases/active/P<N>/book/research`, every later commit may add or change only files named for one chapter (`ch<k>-…`, `…-ch<k>.md`, `trace-<key>.md`), never `library.md`, `ledger.md` or another file of the whole-book run. (Nested: run both in the nested repo, `git -C workflow …`, with paths relative to it.) One that does is a finding: its chapters were written against indexes that moved.
2. **Reads the whole book** in the outline's order: `book/<key>.md` against `book/outline.md`. It reads for:
   - the flow between chapters;
   - repetition: a term taught twice, or a diagram drawn twice;
   - a term used before the chapter that defines it;
   - the outline's promises: every chapter's goal met, every planned diagram and figure present, every quiz target tested.
   - the reader tasks: each chapter serves the tasks its outline entry names, with their deliverables where the reader needs them;
   - **the optional `sources` chapter** ("Sources and further reading"), when the outline has one: every item it lists is in the book's `library.md` or a chapter's `library-ch<k>.md`, under the id the index gives it, rung 1 first; it lists no source the indexes lack, and leaves out no rung-1 source a chapter's main claims rest on.
3. **Decides every `disputed` critic finding.** Each `Cnn · disputed` line in a chapter's `## Critique answers` is read beside the finding in `book/critique/<key>.md`, the chapter and the evidence it cites in `book/research/` (the frozen indexes and that chapter's overlays), then ruled on:
   - **upheld:** it becomes a finding and a fix slice;
   - **overruled:** it gets a line in `result.md` saying why.

   No dispute is left open.
4. **Checks every chapter.** Run its `## Publish` command from the repo root, with the global `--base-url
   <KB_API_BASE_URL>` (from §2 *Resolve the knowledge base configuration*) put before `check`; the section holds nothing else to change
   (`reference/explain-chapter.md`, *The `## Publish` section*). Then read the exit code (§4.9 *Check*):
   - **exit 1:** a finding; that chapter is not published, and its fix slice publishes it;
   - **exit 2:** read stderr. Only `has no /api/documents/check (HTTP 404 or 405)` and argparse's `invalid choice`
     mean "no check route here": say so, and let the 422 of §5 *Publish via the KB document API* be the backstop. `cannot reach` or `your API key was
     rejected` is no verdict at all: stop and return `blocked` or `needs_operator`, and publish nothing.
5. **Publishes every chapter, private**, in the outline's order:
   - **The credential** is the operator's org key, the one `/knowledge:setup` wrote and §2 *Resolve the knowledge base configuration* resolves. **Never** use the master token or a tenant #1 key: those publish public by definition. If you are not sure which one you hold, return `needs_operator` before the first publish.
   - **The project** is the one in `## Explain`, which is private. A new name is created private on its first publish.
   - **Each chapter** is published with its `## Publish` command from step 4, `check` swapped for `save` and `--json` added to read the response; nothing else changes. Its `book/assets/<key>/` files are re-attached; the command already names them (§4.7 *Images*, §5 *Publish via the KB document API*). Record each response's `url`, `rel_path` and `version` in a `## Published` table in `result.md`.
   - **After the first chapter, prove it is private.** Use the book's anonymous, visibility-gated address. `/api/*` won't do: it answers 401 to any request without a key, private or public, so a 401 is **no evidence**.
     - **The control, with the org key:** `GET <KB_API_BASE_URL>/api/books/<project>/<book>` must answer 200. That proves the book exists under exactly these names. Anything else means the names are wrong, so the probe would prove nothing: return `needs_operator`.
     - **The org:** take it from the first chapter's `url`. If the `url` is `<site>/@<org>/…`, use `<org>`. If it is `<site>/documents/<id>`, the org has claimed no slug: use its tenant id if the operator gave it, or else probe `GET <KB_API_BASE_URL>/app/documents/<id>` (the response's `id`) instead, which reads the same way. A `url` of the form `<site>/<project>/<date>-<slug>/` means a server without orgs. There, every miss on the route is a 404, so return `needs_operator`.
     - **The probe, with no credential and no cookie:** `GET <KB_API_BASE_URL>/app/orgs/<org>/<project>/books/<book>`.
       - **404:** private. Carry on.
       - **200:** the project is **public**. Stop publishing and return `needs_operator`; the operator decides its visibility. Never publish the rest into it.
       - **Anything else** (a 401, a 5xx, a transport failure) is no evidence: return `needs_operator`.
     - **Only for a `/@…` `url`,** also fetch the `url` itself anonymously, as a second probe. It must miss too, and a read is the same `needs_operator`. Never fetch a `/documents/<id>` `url`: that is a console page, and its sign-in redirect proves nothing.
     - **An org key is not a member** on `/app/*`. It reads a private book as a 404 there, like anyone else, so never send it on the probe; the member read is step 6's signed-in profile.
   - **A transport failure** is verified before any retry, per §5.1 *Transport failure on the POST — verify before you report or retry*. Never re-send blind.
   - **A `chapter:` link warning** for a sibling not yet published is expected mid-run; step 6 confirms the link lands.
6. **Reads the book in the real reader.**
   - **The instrument and agent browser** come from `## Operator Runtime`: Claude in Chrome on the agent's own Chrome profile (signed into the reader as an org member, never the operator's own account), selected first with `list_connected_browsers` → `select_browser` on the recorded `Agent's Chrome deviceId:`, never a `name` label (`design-cowork`'s `reference/build.md`). If the section is absent or still `UNFILLED`, or no Chrome tools, no recorded id or no browser with it, return `needs_operator`.
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

## Plan a document's or a chapter's review so the executor

The unit is one draft, `doc/body.md`, written by `S1` from the research `DECOMP` led into `doc/`. Its acceptance gate is waived (published private; a v2 is cheap), so the review publishes, proves it private and reads it back without opening a gate.

1. **Validates `S1`.** Read the head of its `result.md`: `status: done`; `critique: answered`, or `critique: none (quick)` under `run: quick`; its `disputed:` ids; its `## Publish` section. Run `python3 scripts/workflow.py validate`. **Then check that the evidence held:** after the last `DECOMP` commit (as a book's step 1 finds it), `git log --format='%h %s' --name-status -- works/phases/active/P<N>/doc` shows only `body.md`, `trace.md`, `critique.md`, `assets/` and `run.md` added or changed (nested: in the nested repo). A change to `library.md`, `ledger.md`, `findings/`, `verify/` or `gaps/` is a finding.
2. **Reads the draft** against `doc/outline.md` and `doc/brief.md`: every reader task served, with its deliverable; every must-cover item taught; every declared gap of `doc/gaps/final.md` stated or dropped as its disposition says; the planned diagrams and quiz, read against the code. A chapter also against its `## The book`: it uses no term a later chapter defines without defining it, and redefines none an earlier chapter defines; step 6 checks it against the published book.
3. **Decides every `disputed` critic finding**, as a book's step 3 does, against `doc/critique.md` and the evidence in `doc/`. No dispute is left open.
4. **Checks it**, as a book's step 4 does, with the same exit-code rules.
5. **Publishes it, private,** with the same credential and project rules as a book's step 5: its `## Publish` command, `check` swapped for `save`, `--json` added; one `## Published` row (`url`, `rel_path`, `version`).
   - **A v2 document** carries `--new-version --rel-path <rel_path>` in its command (§5 *Publish via the KB document API*); a chapter's next version is the same book, key and `--lang`. A 409 without them means a document already lives at that path: return `needs_operator`, never publish it elsewhere.
   - **Prove a document private**, right after the save, with the same rules of evidence as a book (`/api/*` proves nothing; never send the org key on the probe):
     - **the control, with the org key:** `GET <KB_API_BASE_URL>/api/documents/by-path/<rel_path>` must answer 200; anything else: `needs_operator`;
     - **the probe, with no credential and no cookie:** from a `url` of the form `<site>/@<org>/<project>/<slug>`, `GET <KB_API_BASE_URL>/app/orgs/<org>/<project>/<slug>`. **404:** private. **200:** the project is **public** and the document is already readable: return `needs_operator` at once, first line, and the operator decides its visibility. Anything else is no evidence: `needs_operator`. Then fetch the `/@…` `url` itself anonymously; it must miss too;
     - a `url` of the form `<site>/documents/<id>` (no org slug): probe `GET <KB_API_BASE_URL>/app/documents/<id>` instead, and never fetch the console `url`; a `url` of the form `<site>/<project>/<date>-<slug>/` (a server without orgs): `needs_operator`.
   - **Prove a chapter private** by its book, exactly as a book's step 5 does (the control on `/api/books/<project>/<book>`, the probe on `/app/orgs/<org>/<project>/books/<book>`, and the `/@…` `url`).
   - **A transport failure** is verified before any retry (§5.1 *Transport failure on the POST — verify before you report or retry*).
6. **Reads it back.**
   - **In the reader** when the manifest allows it: `## Operator Runtime` records the agent's Chrome `deviceId`, the session has the Chrome tools and the browser with that id is connected and signed in. Select it first exactly as a book's step 6 does, open the page at the manifest's viewports, and check that it renders with no error block or raw block text, that every diagram, figure and image shows, that the quiz grades and shows its `explain`, and that every `chapter:` and `doc:` link lands.
   - **Otherwise, the API read-back,** with no stop: the gate is waived, so a missing manifest, Chrome tools, browser or sign-in is reported, never a halt. `GET <KB_API_BASE_URL>/api/documents/by-path/<rel_path>` with the org key must return the version just published, its body `doc/body.md`'s. Name it in `result.md` as an API read-back, not a reading; never claim a reader run that was not made.
   - **A chapter's order check** reads its book: in the reader, the book page puts it at its position, and the earlier chapters it links to land; on the read-back, `GET <KB_API_BASE_URL>/api/books/<project>/<book>` lists it at its position, and the earlier chapters' bodies (by their `rel_path`) define every term it uses without defining it. A term used before the chapter that defines it, or taught twice, is a finding.
7. **Routes the questions.** The gate is waived, so no gate stage runs and no `## Regression Checklist` line is appended; every `## Operator Questions` entry is still routed, into the closing report's decisions or a deferred-job candidate.
8. **Returns:**
   - the `review_verdict`, with findings numbered and one proposed fix slice for the draft if it needs one;
   - `doc_versions: none — deferred to a docs phase` (no notes, no gate section, so no debt) and the fixed pointer;
   - `walkthrough: none` (the gate is waived); instead, `result.md` carries a `## Report` section, the facts the orchestrator's closing report needs (§8 *D9: the report*): the title, `url` and version (or the prior it superseded); the run (`full`, `quick` or `no-research`); the research counts and the gate's counts from `doc/run.md`; the critic's verdict and the answers, or `none (quick)`; the declared gaps from `doc/gaps/final.md`; the instrument of step 6; the dossier's path; and, when `DECOMP` recorded a scoped-down topic, the book suggestion (§9.1 *The book suggestion*): the reason and the part left out;
   - a deferred-job candidate for each translation `## Explain` asks for: title "Translate <title> into <lang>", the reason, and the trigger "the original is published".

## Fix slices republish

A `changes_requested` verdict, or an operator-reported failure at the gate (`review-phase <P> --verdict changes_requested --note "operator-reported: …"`), becomes one fix slice per chapter (or for the one draft) that needs changes: `<P>.F<n>`, `--kind fix`. Rate it as `reference/review.md` says: `high` when the draft's `result.md` reads `route: mid` (or a pre-v83 `route: cheap`).

A fix slice:
1. revises the draft (`book/<key>.md`, its assets and `trace-<key>.md`; or `doc/body.md`, `doc/assets/` and `doc/trace.md`), and nothing else in the dossier: it adds no evidence (a fix the indexes cannot support removes the sentence or states the point as open, as §4.10 *D8: the critic, one revision, then publish* says) and dispatches no research agent;
2. re-reads the result (§4.8 *Before you publish*);
3. re-runs `knowledge check` (§4.9 *Check*) to exit 0;
4. **republishes** it with its `## Publish` command (rewritten if a flag changed), with the target added and `check` swapped for `save`. This is a new version of the same document: the id and URL are kept, and it stays private. A chapter re-sends the same book, key and `--lang`; a **loose document** adds `--new-version --rel-path <rel_path>` (from the review's `## Published` row), since a plain re-send is a 409. Its plan says so; that one publish is the fix slice's carve-out. A draft that never published (step 4's exit 1) is published by its fix in the same way, as a first version.

No critic runs again, because the review has already judged the draft.

The re-review then re-reads the changed drafts, and the chapters that link to them, in the reader (or by the read-back, for a waived unit).

## After a pass

Follow `reference/review.md`:
1. **a book:** `accept-gate <P> --open --walkthrough "<walkthrough>"`, file the deferred translation jobs, then `validate`, commit, report and STOP. The operator reads the book. `accept` clears the gate, and you record the pass. The book stays private until the operator makes it public;
2. **a document or a chapter:** the gate is waived, so record the pass with no stop, and file the deferred translation jobs;
3. **then, for any unit run in a worktree,** it merges back by itself, with no stop: `reference/worktree.md` (*An explain phase merges back by itself*) and the `parallel-phase` skill (its §5 section of the same name) carry the gate, the merge, the teardown and the `merge_ready=` fallback. Do not restate them here;
4. **the closing report comes last** (§8 *D9: the report*), after the merge and the teardown, from the default checkout (or from the worktree, with the unmerged note, when the merge could not run): `PUBLISHED (<run>) — <title>`, the `url` and the version; the research and the gate's counts; the critic, or `none (quick)`; the declared gaps; how it was read back; the dossier's path (in a nested install, in the nested repo); and the book suggestion for a scoped-down topic, offered, never acted on: a book is a new explain, created only on the operator's word. Draw it from the review's `## Report` (a book: its walkthrough and `## Published` table). It is shown, not written: the facts are already on disk.
