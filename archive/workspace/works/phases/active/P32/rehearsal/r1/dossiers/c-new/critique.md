# Critique: 20261023-0350-post-api-documents-write-path

- kind: document · slice: none
- draft: body.md (dossier root)
- verdict: revise
- confidence: medium
- must_fix: 1 (facts 1, citations 0, ledger 0, coverage 0, diagrams 0, quiz 0, order 0, clarity 0, rules 0)
- should_fix: 6
- notes: 4
- critic_model: claude-sonnet-5-5 · writer_model: claude-opus-5-5
- checked: 11 sources opened, 36 code claims grepped or read at 9978d84 (plus b769236's diff, 207f2ff, the P24 phase and result notes, three docs/current files), 5 quiz items answered
- ledger: ~40 claims traced (all load-bearing code, history and doc claims re-read at their locators), 3 untraceable (all in C05), 11 sources re-opened
- coverage: 15/16 load-bearing questions answered or declared (Q14 only partly: C04); must-cover 5/5
- skill: plugin/skills/explain/SKILL.md (read §3 headings, §4.1, §4.2, §4.5, §4.6)
- open_items: C01, C02, C03, C04, C05, C06, C07

## Findings

### C01 · must-fix · facts
- where: #intuition · line 28
- finding: "the response changes only by adding a field" is false: the same commit also removed the `push_error` field and made `pushed` always false.
- evidence: `git show b769236 -- server/main.py` deletes `-    if push_error is not None:` and `-        resp["push_error"] = push_error` from both create and delete responses, and replaces `pushed = True` on success with a constant `pushed = False`. `works/phases/active/P24/phase.md:178`: "`push_error` no longer appears in any response (the push has not run yet)". The current handler (`server/main.py:1699-1700`) emits only `commit_error`. `works/phases/active/P24/slices/P24.S1/result.md:60` says "No field removed", which contradicts phase.md:178 and the diff. The draft follows the plan's "keep the response contract additive" (phase.md:25, :99-110), and the diff shows the plan was not met. The Response section (L157-159) also never mentions that `push_error` is gone, so a reader who knew the old contract is not warned.
- fix: say that P24 added `push_pending`, made `pushed` always false, and dropped `push_error`; add one clause in the Response section.
- confidence: high

### C02 · should-fix · diagrams
- where: #publish-flow (L32-56) and #publish-sequence (L136-151)
- finding: both diagrams, and the group label "Runs after the response", draw the worker's work as sequenced after the 201, which the code does not enforce. The lock node's label is also incomplete and ambiguous.
- evidence: `server/publish.py:96-103`: `submit` does `_QUEUE.put(...)`, and the worker thread is blocked on `_QUEUE.get()`, so it starts the moment the task is queued. `works/phases/active/P24/slices/P24.S1/result.md:15-22` and `:31-32`: the worker "is a separate, always-running daemon thread" whose "only rendezvous with a request is `WRITE_LOCK`". The chapter's own sentence at L153 says the queue makes "the response never waits" a property of the code and not of ordering, so "after the response" is an overclaim; "not waited for by the response" is what the code guarantees. The lock node reads "manifest, archive, assets, file, DB row, git commit". The code (`server/main.py:1382-1594`) settles the manifest first, but writes it and rebuilds the book rows after the DB row (L1548-1552), and the landing/Recent-index step (L1497-1511) is missing. Chapter step 8 (L91) has the right order; the node label does not.
- fix: relabel the group "Not waited for by the response" (and reorder or annotate the sequence so the worker is not drawn strictly after the 201), and write "manifest (settle)" and "manifest (write)" or drop "manifest" from the node.
- confidence: medium

### C03 · should-fix · clarity
- where: #validation (L62-L94), #invariants (L165)
- finding: project terms are used for many sentences without a definition, so a reader who has not read `server/main.py` cannot follow the ordered lists.
- evidence: "legacy mode (no `DATABASE_URL`)" and "tenant mode" (L62), "the public root" (L89, L94), the formats `md`, `html` and `native` (L66, L72), "book chapter", "manifest", "html-to-native migration target" (L68-L70, L84-L86), and "version archive" (L86) all appear before any sentence says what they are; no earlier section introduces them and the brief says the reader "has not read server/main.py". Brief's open items put native-validator depth out of scope, but one sentence each would be enough. Also L165 says the code shows "four places where these rules end", while the section has the WARNING callout, four bold paragraphs and the closing NOTE (six items), and two of them (validation not re-checked, no transaction) are not among the rules listed just before.
- fix: a short "three things to know about a document" paragraph in Background (formats, loose vs book chapter with manifest, versions with archive, public root vs tenant roots), and make the "four places" count match.
- confidence: medium

### C04 · should-fix · coverage
- where: #invariants, paragraph "A dropped push is caught up" (L172); #queueing (L132)
- finding: plan Q14 (load-bearing) asks for the failure modes of pushing to a git remote, including non-fast-forward rejection and fetch+rebase; the chapter never says why `fetch` and `rebase` come before the push, what a non-fast-forward rejection or a rebase conflict does, or that a persistent conflict makes every later push fail.
- evidence: `server/gitops.py:100-122` docstring: "replays our commit(s) onto the latest remote tip — a no-op when it did not move, a clean replay when the operator added commits"; on any failure it aborts the rebase and re-raises, so the same conflict would fail every following push. The ledger holds C-r1-criticism-01 (git refuses a non-fast-forward by default, supported) and the outline's Invariants entry lists it, but the draft cites `s-r1-criticism-01` only for the refspec sentence. L172 says the next push "publishes everything accumulated" without the condition that the rebase must succeed. Not a declared gap in `gaps/final.md`.
- fix: two sentences in Queueing or Invariants: fetch+rebase exist to avoid a non-fast-forward rejection when the operator pushed in the meantime; a conflict fails the push, leaves the local commit, and repeats on the next push until someone resolves it.
- confidence: medium

### C05 · should-fix · ledger
- where: #best-practices (L183, L185)
- finding: three sentences state in the chapter's own voice what the ledger holds only in attributed or inferred form.
- evidence: (1) L183 "Doing the slow side effect after the response is the standard shape" is a consensus claim; the cited FastAPI docs and Azure page describe their own feature and guidance (ledger C-r1-practice-04 and -15 are the attributed forms: "The FastAPI documentation states…", "Microsoft's … guidance describes…"). B7/B8: a vendor's docs are rung 1 for what they do, and "standard" needs two independent rung-2 sources that say so. (2) L185 "The divergence is defensible here because…" is an evaluation with no source. (3) L185 "a git push of an unchanged `HEAD` is naturally harmless to repeat" has no claim id; `trace.md` (best-practices, ¶diverges) marks it "analogy/inference (flagged for the critic)". Each is a behaviour or evaluation in the chapter's voice (§4.5: "a practice stated in your own voice meets B8's bar").
- fix: attribute (1) ("FastAPI's docs and Microsoft's guidance both describe…"), mark (2) as the chapter's own reading of the code, and either hedge (3) as an inference or cite git-push for "Everything up-to-date".
- confidence: medium

### C06 · should-fix · quiz
- where: q-outside (L218-221), and the matching sentence at L163
- finding: the recall answer teaches "the lock is not reentrant" as the reason, which suggests a deadlock the design does not have; the real hazard is different.
- evidence: the push task runs on the `kb-publish` thread, a different thread from the request thread (`server/publish.py:52-70`). If `submit` were called inside `with WRITE_LOCK:`, the worker would only block until the request thread leaves the block; a non-reentrant `threading.Lock` matters only when the same thread takes it twice. The deadlock the code does guard against is a waiter on the worker while holding the lock: `server/publish.py:97-100` says `drain` must never be called "while holding `WRITE_LOCK` — a queued push takes that lock". The project's `docs/current/backend.md:136` says "submitting while holding it would self-deadlock the moment the worker ran", which is what the chapter paraphrases; the chapter attributes the rule to the docs ("require") but the answer's own clause ("and the lock is not reentrant") is in the chapter's voice. The key rests on C-r1-history-04 (docs' rule), so the key is the rule, not the mechanism.
- fix: make the answer state the rule as the project's ("so the worker never waits on a lock its submitter still holds, and nothing may wait for the queue while holding the lock"), or drop the "not reentrant" clause.
- confidence: medium

### C07 · should-fix · quiz
- where: q-crash (L231-234)
- finding: the cloze tests recall of two phrases from the chapter, and its typed-answer slots are narrow.
- evidence: blank 1 accepts "dropped|lost" and blank 2 "next successful push|next push"; a correct reader who types "discarded" or "the following push" is marked wrong, and the item asks for a phrase rather than a prediction. The outline gives this item the claim "memory queue, next push carries the commit" as its test; a `choice` that asks which of three post-restart states results (push lost and doc kept; doc lost; push retried at boot) would test the same understanding, and the retry-at-boot distractor is the common misconception (`server/main.py:71-101`: boot only reindexes).
- fix: convert to a `choice` with a plausible "retried at boot" distractor, or keep the cloze and widen the accepted variants.
- confidence: low

### C08 · note · rules
- where: #write-lock (L12-17)
- finding: the excerpt starts mid-sentence ("# → DB → git). Load-bearing invariant…"), because it begins at `server/main.py:180`; line 179 holds "…(file → index".
- evidence: `server/main.py:179-183`. The lines shown match the file exactly; starting at L179 would make the comment readable.
- confidence: high

### C09 · note · clarity
- where: #intuition (L21-56)
- finding: §4.2 asks for "concrete toy data" in the Intuition; this section has the diagram but no sample request or 201 body, so the reader meets `pushed`, `push_pending` and `commit_sha` only later in prose.
- evidence: SKILL.md §4.2 item 2 (a recommended shape, not a rule). A four-line sample request and response would also anchor the quiz item q-pushed.
- confidence: low

### C10 · note · facts
- where: #validation (L62)
- finding: "answering 401 if it is missing" understates the legacy check: any bearer that is not exactly `Bearer <token>` gets 401.
- evidence: `server/api_auth.py:202-203`: `if request.headers.get("Authorization") != f"Bearer {token}": raise _unauth()`.
- confidence: high

### C11 · note · clarity
- where: #best-practices (L183)
- finding: "the git commit plays the outbox" is hedged as an echo, but the outbox pattern's defining property (the message is stored in the same transaction as the data) is exactly what the commit lacks; the chapter itself says a failed commit leaves the row in place.
- evidence: `server/main.py:1559-1596` (commit after the committed DB upsert, `GitError` caught, nothing rolled back) against the cited S-r1-practice-05 and -06 definitions. A trade-off, not an error: the analogy helps the "relay catches up" point and costs the atomicity point.
- confidence: medium

## Scorecard

- facts: C01 (and note C10)
- citations: holds. All 11 sources open (HTTP 200). Each cited passage was found: FastAPI async ("it is run in an external threadpool that is then awaited, instead of being called directly (as it would block the server)"), Starlette ("The default thread pool size is only 40 tokens", sync dependencies share it), FastAPI background tasks, FastAPI deployment ("multiple processes normally don't share any memory"), the two outbox pages (relay may publish more than once; consumer idempotent), Azure (background jobs "reduces interactive response times"; at-least-once, idempotent), git-push (refspec, `<src>` any SHA-1 expression), git-rev-list (`--count`), Python signal (SIGKILL "cannot be caught, blocked, or ignored") and atexit ("not called when the program is killed by a signal not handled by Python"). Every citation sits on a sentence its source supports.
- ledger: C05 (three own-voice inferences); the rest of the trace matches the code and the documents re-read
- coverage: C04 (Q14 git-push failure modes partly); must-cover 5/5; declared gaps honoured (Q16 stated, G-r2-01 stated, G-r2-02 and Q15 dropped and not asserted, G-r2-04 stated); no leave-out
- diagrams: C02
- quiz: C06, C07 (q-order, q-pushed and q-wait keys are right and rest on supported claims; I answered all five before reading the keys)
- order: holds, except the undefined terms in C03
- clarity: C03 (notes C08, C09, C11)
- rules: holds (`knowledge check` was ok; no raw HTML, headings `##`/`###`, links are `#id`, sources block lists only cited pages)

**Holds:**
- The two-halves framing and the "where the promise stops" structure (WARNING callout plus four edges) land, and the D-02 disagreement is stated as code versus docs, with the code's weight, not as a settled fact.
- The validation order list (7 stages) matches `_check_document` exactly (`server/main.py:950-1273`); the dry-run paragraph matches `check_document` (L1741-1790).
- The 9-step locked order, commit staging, message formats, `KB_GIT_TIMEOUT_S` fallback, the `rebase --abort` handling, the log line and the 10-second drain all match the code; the three code excerpts match their files line for line.
- The race-condition paragraph is correct as traced (`write_text` overwrites, `archive_document_file` overwrites an existing archive, the only other unique key is `UNIQUE(tenant_id, rel_path)`) and is hedged "traced, not observed". Keep it.
- The P24 history (pre-P24 push inside the lock with no timeout, `curl --max-time 5`, embed before the response) matches the diff and `phase.md`; only the "adding a field" clause is wrong (C01).
- The embed-is-unbounded NOTE matches `phase.md:371-375` and `:464-468`.

**Not seen:**
- The reader's render of the `diagram`, `quiz` and callout blocks (I read their sources only).
- Whether the Gemini SDK has a default client timeout (the ledger itself marks it unchecked).
- A live run of the two races or of a blocked publish; all of those are code reads.
- The `WebSearch` check for load-bearing claims without a citation was not needed: the only candidates are the three in C05, none of which is load-bearing.
- Passages of the git-push page beyond the refspec section were not re-read for the "updates the remote ref to the object `src` names" paraphrase; the page says `<dst>` is the ref to update and `<src>` any SHA-1 expression, which supports it.
