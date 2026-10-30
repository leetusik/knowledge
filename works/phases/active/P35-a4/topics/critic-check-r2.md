# Critique: post-api-documents-write-path

- kind: document · slice: none
- draft: works/phases/active/P32/rehearsal/r1/dossiers/c-new/body.md
- verdict: revise
- confidence: high
- must_fix: 5 (facts 0, citations 0, ledger 0, coverage 0, diagrams 0, quiz 0, order 0, reader 5, clarity 0, rules 0)
- should_fix: 9
- notes: 2
- critic_model: claude-sonnet-5-5 · writer_model: claude-opus-5-5
- checked: 0 sources opened, 3 code ranges read for reader/clarity/rules calls, 5 quiz items answered (not judged)
- ledger: not judged in this run (scope: reader, order, clarity, rules only); the trace was not read
- coverage: not judged in this run; the brief's five must-cover items are each present on reading
- skill: plugin/skills/explain/SKILL.md (repo's current copy)
- open_items: C01, C02, C03, C04, C05, C06, C07, C08, C09, C10, C11, C12, C13, C14

Scope of this pass: a rubric check, not a publish critique. Judged fully on `reader`, `order`, `clarity` and `rules` against the skill's §1 title rule, §4 prose rules, §4.1, §4.2 and B5. `facts` and `citations` are under **Not seen**. The stated reader (dossier:brief.md) is a developer who knows Python, FastAPI basics and git and has not read `server/main.py`; their tasks are to trace a publish through the code, explain why the 201 never waits on the network, and change the write path without breaking its invariants. The dossier's `outline.md` has no `## Reader's task` section, so those three tasks, from the brief's `purpose`, are the task list.

The title (`POST /api/documents: the write path from validation to commit and push`) names what the text explains and carries no id: it passes the §1 title rule.

## Findings

### C01 · must-fix · reader
- where: #intuition · line 29
- finding: The history paragraph breaks "The subject, not the records" three ways: "The cause the decomposition recorded", "P24 began from an operator report" (an id as a sentence subject), and "Before phase P24" (an id anchoring the clause, not a trailing mark).
- evidence: Line 29: "Before phase P24, the handler ran `git fetch`…", "P24 began from an operator report: …", "The cause the decomposition recorded: the `/explain` skill posted with `curl --max-time 5`…". SKILL.md §4 *The subject, not the records*: "no sentence takes an id, or a record named as a workspace artifact (a `result.md`, "the P24.S1 result", "the decomposition recorded"), as its subject"; an id appears "at most as a small trailing mark, "(P30)", after the plain-words statement". The chapter also never says what P24 is, so a reader who has not seen the workspace cannot place it.
- fix: State the change in plain words ("before the change that moved push and embed off the response path"; "a client reported a disconnect after a successful upload; the cause was …") and keep "(P24)" at most as a trailing mark.
- confidence: high

### C02 · must-fix · reader
- where: #queueing · line 156
- finding: "The P24.S1 result adds that, with the `BaseHTTPMiddleware` metering in the stack, a background task could run before the body had reached the client" names a work record by id as the subject of the clause, and "It also names the test" continues with the record as subject.
- evidence: Line 156. SKILL.md §4 gives this very sentence as the wrong form: "Not 'The P24.S1 result adds that a background task could run before the body reached the client', but 'A background task could run before the body reached the client, which the change that introduced the worker found (P24)'."
- fix: Say it in the chapter's own voice and put "(P24)" at the end; name the test as the change's own test ("the change's own test holds the line: …").
- confidence: high

### C03 · must-fix · reader
- where: #invariants · line 166 (also lines 177 and 220)
- finding: Phase and slice ids stand as clause subjects, not as a trailing mark: "the timeout bug P24 fixed" (166), "P31.S1 moved that code verbatim" (177), and "false on every path since P24" in the `q-pushed` explain (220).
- evidence: Line 166: "a new pre-response network call would quietly bring back the timeout bug P24 fixed". Line 177: "commit `207f2ff` already checked before taking the lock, and P31.S1 moved that code verbatim". Line 220: "`pushed` is false on every path since P24". SKILL.md §4: an id "appears at most as a small trailing mark, "(P30)", after the plain-words statement".
- fix: "the timeout bug that the change fixed (P24)"; "a later change moved that code unchanged (P31)"; "since the change that moved push off the response path (P24)".
- confidence: high

### C04 · must-fix · reader
- where: #invariants · line 171 (also lines 177 and 182)
- finding: Work records are the subject of clauses: "the P24 notes record that the usage-metering middleware's Postgres write happens…" (171), "A P24 review note records the Gemini embed … as unbounded … The note calls that the availability of the off-box backup" (182), and "Nothing in the code or the notes mentions this window" (177).
- evidence: Lines 171, 182, 177. SKILL.md §4: no sentence may take "a record named as a workspace artifact" as its subject; the permitted form is B7's plain words ("the notes from the change that introduced it report X"), with the id at most as "(P24)". The reader of this chapter also cannot open "the P24 notes", so the sentence asks them to trust a record they cannot see.
- fix: State each fact in the chapter's voice and attribute in plain words only where the reader's trust turns on it ("the change that moved the work off the request recorded the embed call as unbounded (P24)"). Replace "or the notes" at 177 with a statement about what the code does and does not do.
- confidence: high

### C05 · must-fix · reader
- where: #invariants · line 173
- finding: The paragraph reports a disagreement between files ("`architecture.md` says … while the same document, and the P24.S1 result, say …"), putting a file and a work record in subject position instead of saying what the system does.
- evidence: Line 173: "`architecture.md` says "everything the caller waits for is local disk + SQLite", while the same document, and the P24.S1 result, say writers and the publish worker are serialized on the lock." SKILL.md §4: never "`architecture.md` says…" in place of saying what it says; no id or record as a clause subject. A reader who has not opened `architecture.md` learns nothing from "the docs disagree with themselves"; what they need is the behaviour (the publish waits behind the push).
- fix: Drop the which-document-said-what frame and the id; state the two facts (the worker holds the lock during a push; a publish needs the lock) and, if the doc inconsistency matters to the reader, say so in one plain sentence without the file name as subject.
- confidence: high

### C06 · should-fix · rules
- where: #write-lock · lines 12-17
- finding: The first code block starts in the middle of a comment sentence, and the elision is not marked: it opens with "# → DB → git)." with no ellipsis, so the fragment cannot be read.
- evidence: `server/main.py:L179-L183@9978d84` reads "# One process-wide lock serializes the whole write critical section (file → index" / "# → DB → git). Load-bearing invariant: …". The draft's block drops the first line and does not mark the cut. SKILL.md B5 allows an elision only "the text marks". The line that says what the lock is for ("serializes the whole write critical section") is exactly the one dropped.
- fix: Include both comment lines, or mark the cut with an ellipsis and keep a complete sentence.
- confidence: high

### C07 · should-fix · clarity
- where: #write-lock (line 14), #intuition (lines 27, 29), #queueing (lines 137, 156), #invariants (line 171), #validation (line 72)
- finding: Several terms are used without being defined where the reader meets them: "WAL" (inside the comment, line 14); what the Gemini embedding is for (27, 113, 137: the reader is never told why a publish embeds anything); "the `/explain` skill" (29); the "`BaseHTTPMiddleware` metering" / "usage-metering middleware" (156, 171: first met in a clause about ASGI ordering, never placed in the request path); the "Recent list" (42, 92); "html-to-native migration" (72).
- evidence: Each phrase is used as if known. The stated reader knows FastAPI basics and git, not SQLite WAL, the project's embedding feature, its explain skill, or its middleware stack. SKILL.md §4.2: "jargon defined on first use".
- fix: One clause each at first use ("WAL, SQLite's write-ahead-log mode, lets readers run during a write"; "the embedding powers semantic search"; "the project's `/explain` skill, a client that publishes documents").
- confidence: medium

### C08 · should-fix · order
- where: #intuition · lines 27, 50 (qualification arrives at #invariants · line 173)
- finding: The chapter states the central claim unqualified in its summary and diagram, and qualifies it only in the closing caveats section; a reader who takes the Intuition and Queueing sections as the answer to "why the 201 never waits on the network" holds a model that line 173 later corrects.
- evidence: Line 27 (key-idea callout): "a **network half** that the caller never waits for". Line 50 (diagram group): "Runs on the worker; the caller never waits for it", with `push` and `embed` inside it, though line 46 shows the push re-taking `WRITE_LOCK`. Line 173, three sections later: "**A publish can wait behind a push.** … a new publish arriving meanwhile blocks at `with WRITE_LOCK:` until the push lets go". The race on the unchecked "already exists" 409 (177) is likewise found in a section of caveats, not in the "Under the lock" step that has it (line 87 mentions only the manifest being re-read). The intro (line 1) does promise "where that promise stops", which softens this.
- fix: Put the qualification where it changes the reader's picture: one sentence in the Intuition callout (or next to the diagram) that the caller never waits for its own push, but a later publish can wait for the lock behind it; and name the pre-lock-only check in the "Under the lock" step.
- confidence: medium

### C09 · should-fix · reader
- where: #validation · line 67 (also lines 77, 79, 156, 166, 175, 188)
- finding: Facts are reported as who-said-what, again and again: "Its docstring makes a strong promise", "their own docstring says", "its docstring says the row 'may be created…'", "The publish module's docstring gives the reasons", "The project's docs state the two rules", "the operations doc says a container restart drops a not-yet-run push".
- evidence: Lines 67, 77, 79, 156, 166, 175, 188. SKILL.md §4 *Teach, don't report*: "a fact in your own voice … a source or work record named in the sentence only where B8 needs the attributed form … or it changes the reader's trust"; B5 lists "a fact reported as who-said-what" as a should-fix. The reader trips by having to hold "the docstring says X" instead of "the function does X"; the repetition makes the chapter read like an audit of documents.
- fix: Say what the code does in the chapter's voice and keep a quoted docstring only where the exact wording is the point (the "only reads" promise at line 67 earns it).
- confidence: medium

### C10 · should-fix · clarity
- where: #validation · lines 69-75
- finding: The seven-step list of validation errors is written in the code's internal vocabulary, and items 3-4 cannot be followed by the stated reader: "the manifest checks: a 409 for a malformed manifest, 422s for an uncreatable book or a conflicting `rel_path`", "the version-target checks: a 422 for changing format or project, a 409 for an occupied html-to-native migration target".
- evidence: Lines 71-72. Nothing earlier explains a version target, an occupied migration target, or when a `rel_path` conflicts (the collapsed Terms callout defines book chapter and manifest but not these). The reader's task needs the order and the fact that nothing is written, not every error class.
- fix: Keep the order and the common refusals (field validators, exists 409, stem 409, native grammar 422) and move the chapter-and-migration branches to a collapsed callout (SKILL.md §4, *Secondary depth*).
- confidence: medium

### C11 · should-fix · reader
- where: #under-the-lock · lines 85-97 (and intro, line 1)
- finding: The walk the reader is asked to trace carries almost no code or location: the nine under-the-lock steps are prose with no snippet, and the chapter says it follows the path "through `server/main.py`" while its commit, push and queue steps live in other modules (`gitops`, `publish`) that are never named as files.
- evidence: Lines 85-97 name `_place_variant`, `store_assets`, `db.upsert_document` and "The scoped git commit" (the function is not named), but only the lock, the post-response block and the push task are shown as code. Line 97 uses `gitops.add`; lines 101 and 135 use `gitops._run` and `gitops.push`; line 125 uses `publish.submit`; none says which file holds them (`server/publish.py` and `server/gitops.py` per `server/publish.py` docstring). Task T1 ("trace a publish in the code") is served only if the reader can find each step.
- fix: Give the module path once where each helper first appears, and name the commit function; consider a short snippet of the lock body with the nine steps as comments.
- confidence: medium

### C12 · should-fix · reader
- where: #invariants · line 175 (also lines 177, 135, 186, 188, 156)
- finding: Several paragraphs run past 100 words and hold more than one idea, and one step the operator needs is buried in prose: the commit-count check (`git rev-list --count origin/main..HEAD`) sits in the middle of a 185-word paragraph.
- evidence: Line 175 (about 185 words) covers five things: catch-up by the next push, no retry or boot push, the in-memory queue and the shutdown drain, why a kill cannot run a handler, the operator's check and the health endpoint, and a failed `rebase --abort`. Line 177 (about 150) holds two separate races plus their history. Line 135 (about 130) holds the git command order, git's own advice, the conflict case, the failure path and the log line. Lines 186, 188 (about 125 each) each hold two ideas. SKILL.md §4: "One idea a paragraph, about 100 words at most"; B5: "a step buried in prose" is a should-fix.
- fix: Split at the idea boundaries; lift the `rev-list` check into a one-line deliverable ("To see if pushes are behind, run …"); put the SIGKILL/atexit detail in a collapsed callout.
- confidence: medium

### C13 · should-fix · clarity
- where: #invariants · line 166 (also line 192; quiz line 224)
- finding: The rule "a publish task is always submitted from outside `WRITE_LOCK`" is given a reason that does not explain it ("because the worker takes the same lock"), and the real mechanism is never taught, so a reader changing the write path cannot tell why the rule exists or what would break.
- evidence: Line 125 says `publish.submit` "appends the task to a FIFO queue and returns at once", so submitting from inside the lock would not block the handler; the worker would just wait for the lock. The reason is in the code: the `_push_task` docstring in `server/main.py` and the module docstring in `server/publish.py` give it as "`WRITE_LOCK` is NOT reentrant, so tasks are always submitted *outside* it". The chapter never says the lock is non-reentrant. The `q-outside` key (224) then relies on "the code's comment gives the lock's non-reentrancy as the reason", an idea the chapter has not introduced.
- fix: Add the reason (a `threading.Lock` is not reentrant) in the invariants paragraph and the checklist item, with one sentence on what goes wrong.
- confidence: medium

### C14 · should-fix · reader
- where: #best-practices · lines 190-195 (and #invariants · line 166)
- finding: The checklist that is the third task's deliverable guards only some of the invariants the chapter itself names, so a reader following it could break the others.
- evidence: Line 166 names five rules: submit from outside the lock, no network I/O before the response, one uvicorn worker, a failed commit never rolls back the save, every git subprocess is bounded. The four next steps (190-195) guard the first three (items 1 and 3), add the re-check-under-the-lock rule (2) and a note on publish health (4). Nothing in them tells the reader to keep a new git call under `KB_GIT_TIMEOUT_S` or to keep a commit failure non-fatal. A new queued task also joins one FIFO worker, so an unbounded call stalls every push behind it (the chapter's own note at line 182), which the checklist does not carry either. B5 *reader*: a deliverable that does not serve its task.
- fix: Add the missing guards, one line each, in the step they change.
- confidence: medium

### C15 · note · order
- where: #background · lines 19-22
- finding: The collapsed Terms callout sits between the lock's code block and "Hold on to that comment", so the sentence points back across two blocks.
- evidence: Lines 12-17 (code), 19-20 (callout), 22 ("Hold on to that comment. A `threading.Lock` serializes threads inside one process only…").
- fix: Put the callout after that sentence, or open the sentence with "The comment above".
- confidence: low

### C16 · note · rules
- where: #intuition · line 31 (also line 99)
- finding: Commit hashes stand as bare subjects ("Commit `b769236` made that change", "commit `207f2ff`"), which a reader without the repository cannot place; a hash is not a work record, so this is allowed, but plain words would carry more.
- evidence: Lines 31, 99, 177.
- fix: "the commit that moved push and embed off the response path (`b769236`)".
- confidence: low

## Scorecard

- facts: not seen (out of this run's scope)
- citations: not seen (out of this run's scope)
- ledger: not judged in this run
- coverage: not judged in this run; the five must-cover items are present on reading
- diagrams: not judged in this run; read only for agreement with the prose (see C08)
- quiz: not judged in this run; see C13 for the one item whose key leans on an idea the chapter never teaches
- order: C08 (C15 note)
- reader: C01, C02, C03, C04, C05, C09, C11, C12, C14
- clarity: C07, C10, C13
- rules: C06 (C16 note)

**Holds:** the title (names the subject, no id); the opening paragraph, which states what the reader will be able to do and flags "where that promise stops"; the numbered under-the-lock sequence (85-95), which gives the reader an order to hold; code before prose in "Queueing the push" (the `pushed = False` block precedes its explanation); the `pushed` / `push_pending` explanation (162), the clearest passage for the reader's second task; the "traced through the code (not observed in a run)" hedge at line 177; the bold-opening findings in #invariants; the SKIP and collapsed DEFINITION callouts used as the grammar defines them; headings and block ids resolve and no raw HTML appears.

**Not seen:** every `facts` and `citations` check (no source opened, no claim re-verified, per the dispatch); the ledger and trace (not read, so `ledger` and `coverage` are not judged); `## Reader's task` (the dossier's outline has none, so the brief's purpose was the task list); the reader's render of the two diagrams and of the callouts; the quiz as a quiz (items answered, not judged).
