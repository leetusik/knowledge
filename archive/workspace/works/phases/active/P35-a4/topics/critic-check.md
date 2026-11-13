# Critique: post-api-documents-write-path

- kind: document · slice: none
- draft: works/phases/active/P32/rehearsal/r1/dossiers/c-new/body.md
- verdict: pass
- confidence: medium
- must_fix: 0 (facts 0, citations 0, ledger 0, coverage 0, diagrams 0, quiz 0, order 0, reader 0, clarity 0, rules 0)
- should_fix: 13
- notes: 4
- critic_model: claude-sonnet-5-5 · writer_model: claude-opus-5-5
- checked: 0 sources opened, 5 code claims read, 5 quiz items answered
- ledger: not judged in this run (scope: reader, order, clarity, rules)
- coverage: not judged against the plan's questions; must-cover 5/5 present by reading (validation, commit, push, why the 201 never waits, invariants)
- skill: plugin/skills/explain/SKILL.md (read §3.10, §4, §4.1, §4.2, §4.4, §4.5, §4.6)
- open_items: C01, C02, C03, C04, C05, C06, C07, C08, C09, C10, C11, C12, C13, C14, C15, C16, C17

Scope of this pass: a rubric check. Judged on `reader`, `order`, `clarity`, `rules`
(§4 prose rules, §4.1, §4.2, B5). `facts`, `citations`, `ledger` and `coverage` are not
judged (no pages opened, no ledger walk). The dossier's `outline.md` has no `## Reader's
task` and no word budgets, so the reader's tasks below are taken from the brief's
`purpose`: (T1) trace a publish through the code, (T2) explain why the 201 never waits on
the network, (T3) change the write path without breaking its invariants. Line numbers are
the draft's.

The draft is sound on structure: it follows the system's flow, not slices; it has no
§4.1 violation I can find (no raw HTML, headings `##`/`###` only, every `#id` link
resolves, one citation per source per paragraph, 5 quiz items of mixed type); and its
Invariants section is the right kind of content. What follows is about how it reads.

## Findings

### C01 · should-fix · clarity
- where: #background · line 10, 20
- finding: The main line leans on collapsed or skippable callouts, and one of them splits the lock thread in two.
- evidence: Line 10 says "That matters, because of what the previous callout says", but that callout is the `[!SKIP]` one a reader who knows FastAPI is told to skip. The terms *tenant mode*, *legacy mode*, *public root*, *book chapter*, *manifest* and *version archive* are defined only in the collapsed `[!DEFINITION]-` callout (line 19-20) and then used in the main line from line 65 on ("In legacy mode", "For the public root only", "the caller writes to the public root"). That same callout sits between the `#write-lock` block (line 12-17) and its explanation, "Hold on to that comment" (line 22), so the comment is read a callout away from its gloss. §4: jargon defined on first use; secondary depth, not the reader's needed terms, goes in a collapsed callout.
- fix: define each term in the sentence that first needs it (or keep the callout open), and move it after the lock paragraph; restate the thread fact on line 10 instead of pointing back.
- confidence: medium

### C02 · should-fix · clarity
- where: #write-lock · line 13
- finding: The first code block opens in the middle of a sentence, so the "comment" the reader is told to hold on to starts as a fragment.
- evidence: The block begins `# → DB → git). Load-bearing invariant: …`. In the repo at the draft's commit, `server/main.py:L179-L183@9978d84` reads `# One process-wide lock serializes the whole write critical section (file → index` on the first line and `# → DB → git). …` on the second. The block drops the first line with no elision mark, so the reader sees `)` closing a parenthesis they never saw opened. The block also uses "WAL" (line 15) with no gloss.
- fix: include the comment's first line (or mark the elision), and gloss WAL in a clause.
- confidence: high

### C03 · should-fix · order
- where: #intuition · line 27, 41-46
- finding: The key-idea box and the first diagram use names the chapter has not introduced, and one of them, the Gemini embedding, is never introduced at all.
- evidence: Line 27 names "the Gemini embedding" as half of the network work. Nothing before line 113 says what is embedded, why, or that it feeds search; line 137 says what the task does ("embeds the title and the stored text, and upserts the embedding row") but not what it is for, yet the NOTE at line 182 depends on the reader weighing a stalled embed. The diagram (lines 36-59) uses `_check_document` (explained line 67), `publish.submit` and `kb-publish worker` (line 125), "Recent" (line 92) and "assets" (never glossed) before any of them is met. A map may run ahead of the walk, but the embed is a term the reader cannot place at all.
- fix: one sentence in Background or Intuition on what the embedding is for; keep the diagram's sub-labels to what the Intuition has already named.
- confidence: medium

### C04 · should-fix · reader
- where: #intuition, #code, #invariants · line 29, 31, 156, 166, 171, 173, 177, 182
- finding: Phase, slice and commit ids and work records are used as sentence subjects, which is the exact shape §4 (*The subject, not the records*) rules out.
- evidence: Line 29: "P24 began from an operator report", "The cause the decomposition recorded". Line 156: "The P24.S1 result adds that, with the `BaseHTTPMiddleware` metering in the stack, a background task could run before the body had reached the client", which is the near-verbatim "Not" example in §4. Line 166: "the timeout bug P24 fixed". Line 171: "the P24 notes record". Line 173: "the P24.S1 result". Line 177: "commit `207f2ff` already checked before taking the lock, and P31.S1 moved that code verbatim". Line 182: "A P24 review note records". Line 31: "Commit `b769236` made that change". "P24" is never glossed in plain words, and the "operator report" and "/explain skill" (line 29) are workspace vocabulary the reader has not met. No id sits in a heading, and no deferred-job id appears.
- fix: say the fact in the chapter's voice and leave the id as a trailing mark, e.g. "A background task could run before the body reached the client, which the change that introduced the worker found (P24)."
- confidence: high

### C05 · should-fix · reader
- where: #validation, #queueing, #invariants · line 67, 77, 79, 156, 166, 173, 175, 188
- finding: Several facts are reported as who-said-what (a docstring, "the project's docs", "the operations doc") where the chapter could state them, and the reader is sometimes handed a documentation dispute instead of the behaviour.
- evidence: "Its docstring makes a strong promise" (67), "their own docstring says" (77), "its docstring says the row" (79), "The publish module's docstring gives the reasons" (156), "The project's docs state the two rules" and "in the words of the commit that added it" (166), "the operations doc says a container restart drops" (175, 188). Line 173 spends its middle on `architecture.md` contradicting itself and the P24.S1 result before saying "The code sides with the second", when the reader needs only the finding already in its bold lead. Line 173 also says "no source states a bound", which is the research process leaking into the chapter (line 177 says "Nothing in the code or the notes" for the same kind of statement). §4 *Teach, don't report* keeps attribution where B8 needs it or it changes trust; most of these do neither.
- fix: state the rule or behaviour directly; keep an attribution only where the claim is below the bar or the source is itself the point; cut the architecture.md dispute to one clause or a collapsed note.
- confidence: medium

### C06 · should-fix · reader
- where: #validation, #under-the-lock · line 79, 97, 101, 29-31
- finding: Secondary depth sits in the main line and slows the trace.
- evidence: Line 79 ("Is anything written when validation refuses?") is two edge cases in tenant mode and SQLite initialisation, in the middle of the validate-then-dry-run thread. Line 97 carries the commit-message templates, the `Co-Authored-By:` trailer and the `.assets` drop in one paragraph with the trigger conditions. Line 101 gives the timeout's fallback rule for unparseable values. Lines 29-31 narrate the incident's history (client, `curl --max-time 5`, what changed in the response) before the diagram. §4: secondary depth (another number, history, edge evidence) goes in a collapsed `> [!NOTE]-` callout; the draft's only collapsed callout is the glossary.
- fix: collapse lines 79 and 101 and the incident narrative; keep one sentence of "why" in the main line.
- confidence: medium

### C07 · should-fix · reader
- where: #queueing, #invariants, #best-practices · line 135, 175, 177, 186, 188 (also 156, 166, 173)
- finding: Five paragraphs run past 120 words and hold several ideas each; the push commands are buried in one of them.
- evidence: Word counts: line 175 is 185 words (a dropped push is caught up by the next one; the in-memory queue and the 10-second drain; SIGKILL and `atexit`; the operator's `git rev-list` check; no push at boot; a failed `rebase --abort`), line 177 is 151 (the missing re-check, why the database will not object, two race scenarios, the age of the window), line 135 is 133, line 186 is 129, line 188 is 123. Lines 156 (107), 166 (108) and 173 (102) are borderline. Line 135 gives the three commands `git fetch origin main`, `git rebase origin/main`, `git push origin HEAD:main` in running prose between a git-docs rationale and the failure path; the only push code shown is the three-line `_task` wrapper, so the reader does not see the steps first and then their meaning (§4, *Show, then tell*). The invariants paragraphs do open with a bold sentence, as §4 asks.
- fix: split 175 and 177 by idea; show the three git commands as a short list or block before the explanation.
- confidence: high

### C08 · should-fix · clarity
- where: #background, #queueing, #invariants · line 8, 15, 156, 171
- finding: Jargon used in the main line is never glossed for the stated reader.
- evidence: "the SQLite database is a disposable projection that a reindex rebuilds" (8; reindex is later said to run on boot and to never touch git, 175, 179, but never explained). "WAL" (15). "the usage-metering middleware" and "`BaseHTTPMiddleware` metering" (156, 171) are brought in as the reason a background task could race the response and as a post-handler Postgres write, but the chapter never says the stack has a metering middleware or what it meters. The reader knows FastAPI basics, not this project's middleware.
- fix: one clause each where the term first appears.
- confidence: medium

### C09 · should-fix · order
- where: #invariants · line 164-182 (against #validation, #under-the-lock, #queueing)
- finding: The findings that qualify a step are collected in a closing section, not placed in the step they change, so a reader walking the path meets each step in its clean form first.
- evidence: Four of the five findings in #invariants belong to a step the walk has already left: "Validation is not re-checked under the lock" (177) to the Validation and Under-the-lock steps, whose list says only that the manifest is "re-read under the lock" (line 87); "The locked section is not a transaction" (179) to #under-the-lock; "A publish can wait behind a push" (173) to #queueing, whose text says the push "re-takes the lock" (127) with no consequence; and the tenant-mode Postgres await (171) to #validation, where `resolve_api_write`, tenant resolution and `ensure_registry_project` are described (65, 79) without being called a network hop. The Intuition box (27) says the caller "never waits for" the network half with no qualifier; the qualifier is 140 lines later. Placing each at its step also gives T3 a checklist line per hazard (§4.2, the Code section follows the reader's path).
- fix: add a sentence at each step pointing at the hazard in plain words; keep #invariants as the place the rules are gathered.
- confidence: medium

### C10 · should-fix · clarity
- where: #queueing, #invariants, #quiz-section · line 175, 188, 236
- finding: The chapter says both that a graceful shutdown drains the queue and that a restart drops an unrun push, and never reconciles them; the cloze item then states only the second.
- evidence: Line 175: "a graceful shutdown drains it for up to 10 seconds, and the operations doc says a container restart drops a not-yet-run push but never a save". In the repo, `server/main.py` at 9978d84 line 93 calls `publish.drain(timeout=10.0)` in the shutdown hook, so a push that finishes within 10 seconds runs. Line 236's cloze says "If the API container restarts before a queued push runs, the push is {{dropped|lost}}". A reader holding the drain sentence can defend "it runs during shutdown". The truth the chapter can state in one sentence: a push is lost only when it is not finished within the drain, or the process is killed.
- fix: one sentence reconciling the two, and word the cloze to the case that is lost (killed, or not drained in time).
- confidence: high

### C11 · should-fix · reader
- where: #best-practices · line 190-195 (and 156, 166)
- finding: The T3 deliverable, the checklist for changing the write path, leaves out two of the five invariants the chapter names and points at a guard test it never names.
- evidence: Line 166 names five rules: one uvicorn worker, a failed commit never rolls back the save, every git subprocess is bounded, publish tasks are submitted from outside `WRITE_LOCK`, and no network I/O before the response. The four next steps (190-195) cover the single worker, the submit-outside-lock/no-network pair, the re-check inside the lock and the publish-health signals; "a failed commit never rolls back the save" and "every git call goes through the bounded helper" are missing, as are the not-a-transaction and unbounded-embed limits (179, 182). Step 1 says "The test that a hanging push still yields a fast 201 is the guard; extend it", but the chapter only describes it (line 156) and never names it; in the repo it is `tests/test_api_push.py::test_response_does_not_wait_for_a_hanging_push`. The checklist also sits in "Best practices & next steps" under a paragraph of outbox comparisons, while #invariants ends on a NOTE (182), not on its deliverable. The deliverable exists, so this is should-fix; it would be must-fix if the checklist were absent.
- fix: a short "Before you change the write path" list with all the rules, each with the step it guards, and the guard test named as a block title or path.
- confidence: medium

### C12 · should-fix · quiz
- where: q-order · line 211
- finding: The `explain` says "no file, row or commit was made", which the chapter's own text contradicts for tenant mode.
- evidence: Line 79 says that in tenant mode `ensure_registry_project` may create a Postgres `projects` row before the handler runs and that the row "may be created even when the handler then 409s". The key (c) is carefully worded ("without writing a document file"); the explain widens it to "row". Options a, b, d are plausible to a half-reader and c is the only defensible answer: b reads the database but does not take the lock.
- fix: "no document file, document row or commit".
- confidence: medium

### C13 · should-fix · quiz
- where: q-outside · line 222-224
- finding: The key rests on an idea the chapter never teaches, so a reader who understood the chapter has no way to arrive at it.
- evidence: The key ends "the code's comment gives the lock's non-reentrancy as the reason". Non-reentrancy appears nowhere else in the draft. Line 125 says `publish.submit` "appends the task to a FIFO queue.Queue and returns at once", and line 166 gives only "because the worker takes the same lock"; from those two sentences, submitting inside the lock looks harmless (the worker would wait, not deadlock). In the repo, `server/publish.py` `submit` is `_ensure_worker()` plus `_QUEUE.put(...)`, and the comment at `server/main.py:L1604-L1612@9978d84` gives "(it is not reentrant)" as the reason. A recall item is meant to be answerable from the chapter; this one tests a phrase the chapter does not contain. The same gap weakens T3: step 1 of the next steps (line 192) tells the reader to submit from outside the lock without the failure it prevents.
- fix: teach the reason in the queueing section (what holding the lock while submitting would risk, in one or two sentences), then the item tests it.
- confidence: medium

### C14 · note · reader
- where: #intuition · line 24-59
- finding: The Intuition has a key idea, history and a diagram but no concrete toy data.
- evidence: §4.2 asks the Intuition for "concrete toy data and a diagram". The 201's fields (`pushed: false`, `push_pending: true`, `commit_sha`) are named in three places before the response section (31, 162, 217) but never shown together as one example request and response. The outline did not ask for it, so this is a taste-level improvement for T2.
- confidence: low

### C15 · note · reader
- where: #publish-flow, #publish-sequence · line 36-59, 140-154
- finding: Two small mismatches between the diagrams and the prose.
- evidence: The flow diagram's `check` node says "validate; no lock, no writes", while line 79 states two narrow writes (the tenant-mode Postgres row, SQLite initialisation). In the sequence diagram the self-step "take WRITE_LOCK (may start before the 201 is sent)" is drawn after the 201 arrow, so its position and its label disagree. The sequence diagram otherwise adds the origin actor and the race with the 201 and earns its place. I could not see the render.
- confidence: low

### C16 · note · reader
- where: #invariants · line 175
- finding: Three citations sit mid-sentence; §4 puts a source at the sentence's end.
- evidence: `([git-push](#s-r1-criticism-01) — git-scm.com), so the next successful push …` and `since SIGKILL cannot be caught ([Python signal](#s-r2-criticism-05) — docs.python.org) and …` end the clause, not the sentence; the `git rev-list` citation ends before a semicolon. Citation support itself was not checked.
- confidence: medium

### C17 · note · reader
- where: #code · line 12, 107, 129
- finding: The code blocks give a path but no line range or commit, so a reader who wants to trace in the file has to search for the function.
- evidence: All three titles read `server/main.py`, for code at `server/main.py:L179-L183`, the `_task` wrapper below `_push_task` (about L198) and the lines just above `publish.submit` (about L1618-L1632), all at the commit named once in the intro (line 1). §4 allows the location once in the block's title; a range in the title would let the T1 reader jump to the code. The `push-task` and `after-response` blocks also start indented, without a mark that they are fragments of a larger function.
- confidence: low

## Scorecard

- facts: not judged (see Not seen)
- citations: not judged (see Not seen)
- ledger: not judged
- coverage: not judged against the plan; must-cover present by reading
- diagrams: holds, bar C15 (notes only)
- quiz: C12, C13 open; the other three items work (q-pushed, q-wait, q-crash apart from C10)
- order: C03, C09
- reader: C04, C05, C06, C07, C11 (notes C14, C15, C16, C17)
- clarity: C01, C02, C08, C10
- rules: holds. No raw HTML, headings are `##` and `###` with unique ids, all twelve `#id` citation links resolve to the sources block and every source is cited, typed blocks are top level, 5 quiz items of three types, 3,003 prose words (inside a single document's 3,000 to 5,000).

**Holds** (must survive the revision):
- The structure follows the system's flow (validate, lock, queue, response, invariants), not slices or records; do not reorder it into the order the work happened.
- The opening paragraph states the three things the reader will be able to do, and the chapter delivers all three in substance.
- The bold-lead findings in #invariants, in particular "A publish can wait behind a push" and "The locked section is not a transaction", and the marked "Traced through the code (not observed in a run)".
- The numbered lists for the validation order (line 69-75) and for the locked steps (line 87-95); the real step order matches the handler (`server/main.py` calls `_place_variant`, archive, `store_assets`, the Recent update, `upsert_document`, `write_manifest`, then `gitops.add` and `gitops.commit`).
- q-wait and q-pushed: the scenario items test understanding, have one defensible answer each and teach why in the `explain`.
- The `#after-response` block followed by its explanation: show, then tell.

**Not seen:**
- `facts` and `citations` were not judged: no source page was opened and no claim was re-verified; the dossier's `tools:` folder no longer exists. Code was read only where a reader, order or clarity finding needed it (the lock comment, the shutdown drain, `publish.submit`, the handler's step order, the guard test's name).
- `ledger` and `coverage` were not run: the trace was not walked and the plan's load-bearing questions were not mapped to the draft.
- The outline has no `## Reader's task` and no word budgets, so reader tasks were taken from the brief's `purpose` and section budgets could not be checked (only the single-document total).
- The reader's render of the callouts, collapsed state and diagrams was not seen.
