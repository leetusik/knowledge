# Critique: 20261023-0350-post-api-documents-write-path

- kind: document · slice: none
- draft: dossier:body.md
- verdict: revise
- confidence: medium
- must_fix: 3 (facts 0, citations 0, ledger 2, coverage 0, diagrams 0, quiz 1, order 0, reader 0, clarity 0, rules 0)
- should_fix: 8
- notes: 6
- critic_model: claude-sonnet-5-5 · writer_model: claude-opus-5-5
- checked: 14 sources opened, about 45 code claims grepped or read at 9978d84, 5 quiz items answered
- ledger: about 60 claims checked against code or pages (of about 95 traced), 0 untraceable, 14 sources re-opened
- coverage: 16/16 load-bearing questions answered or declared; must-cover 5/5
- skill: plugin/skills/explain/SKILL.md (read §3.10, §4.1, §4.2, §4.4, §4.5, §4.6 and Part B, B5 to B9)
- open_items: C01, C02, C03, C04, C05, C06, C07, C08, C09, C10, C11

The chapter is strong on the code: every excerpt matches its file range at `9978d84`, the error-stage table matches the real raise order in `_check_document`, both diagrams' steps match the code, and every web citation I re-opened says what it is cited for. What blocks it is one overclaim that contradicts the chapter's own central finding, one sentence broader than its ledger entry allows, and one cloze item with a second correct answer.

## Findings

### C01 · must-fix · ledger
- where: lede, `#intuition` · line 1, line 22
- finding: The lede says the chapter "explains why the answer never waits for GitHub or for the embedding service", and the Intuition says "Only the first half stands between the request and its `201`". Both state the docs' side of the open disagreement D-02 in the chapter's own voice. The chapter's own `#waits` section then shows the code makes a publish wait at `with WRITE_LOCK:` behind a push that is talking to GitHub.
- evidence: `dossier:ledger.md` `## Disagreements` D-02, status open: side B is `architecture.md` L37 "Everything the caller waits for is local disk + SQLite"; side A is `server/main.py:L198-L200` (`_task` holds `WRITE_LOCK` around `gitops.push`) with `server/main.py:L1374` (`with WRITE_LOCK:`, plain blocking). The draft's own `q-wait` explain calls this "the one way the 201 can still wait on the network, indirectly". B8 says a contested claim is never stated in the chapter's own voice. The reader's task T2 in `dossier:outline.md` is "why the 201 never waits on the network, and the one way it still can", so the exception belongs next to the headline.
- fix: Say what is true in both places: the request never waits for its own push or embed, and `#waits` shows the one way it can wait behind an earlier push. Add a forward link to `#waits`.
- confidence: medium

### C02 · must-fix · ledger
- where: `#invariants` · line 323
- finding: "apart from the integer primary key, its only uniqueness constraint is `UNIQUE (tenant_id, rel_path)`" is written about "the database", but the ledger entry covers only the `documents` table, and the sentence is false for the database as a whole.
- evidence: `dossier:verify/r2-b2.md` V-C-r2-code-validate-05-1 (verdict partial) narrower claim: "the `documents` table's only uniqueness constraint is `UNIQUE (tenant_id, rel_path)`". `server/db.py:L101` has `UNIQUE (tenant_id, rel_path, version)` in `document_versions`, and `server/db.py:L145` has `CREATE UNIQUE INDEX IF NOT EXISTS chapter_variants_doc`. The `document_versions` constraint is the very one race 2 hits: `upsert_document_version` is `ON CONFLICT(tenant_id, rel_path, version) DO UPDATE` (`server/db.py:L732`), so the conclusion "the database will not catch either one" stands, but its stated reason does not.
- fix: Scope the sentence: the `documents` table has only `UNIQUE (tenant_id, rel_path)` and `document_versions` has `UNIQUE (tenant_id, rel_path, version)`, and both writes are upserts that update in place on conflict.
- confidence: high

### C03 · must-fix · quiz
- where: `q-crash` · lines 393-396
- finding: Blank 1 `{{push}}` has a second correct answer, `embed`, which the grader would mark wrong. The item also tests a remembered phrase ("never a save") rather than reasoning.
- evidence: The sentence reads "a container restart can drop a queued {{push}}, but never a {{save|write|document}}". The draft's own Step 5 says the same in-memory queue also holds the `embed` task (`server/main.py:L1623-L1632`, `server/publish.py:L43` `_QUEUE`), and `q-crash`'s `explain` says "only the after-response work is in the queue". A reader who types `embed` (or `task`) is right and is marked wrong. `dossier:outline.md` says this item tests "what a restart loses", which the key does not pin to one answer.
- fix: Accept `push|embed|task` for blank 1, or reword so only one answer fits (for example "…can drop a queued push to {{GitHub|origin}}…"). Consider a predict-style item ("a restart hits while a push is queued: what does the client's document look like afterwards?").
- confidence: medium

### C04 · should-fix · diagrams
- where: `#flow-halves` · lines 24-46
- finding: The diagram groups the worker under "After the 201 (network)" and draws no edge from the worker back to the `WRITE_LOCK` section, so it shows the docs' picture and hides the mechanism by which the 201 can wait. `seq-publish` does show the re-take, so the two diagrams disagree on what matters most.
- evidence: `server/main.py:L198-L200` (the push task takes `WRITE_LOCK`); draft `seq-publish` step "the push task re-takes WRITE_LOCK" against `flow-halves` edges `worker → origin` and `worker → gemini` only.
- fix: Add a dashed `worker → locked` edge labelled "re-takes the lock (push only)", so the first diagram agrees with the second and with `#waits`.
- confidence: medium

### C05 · should-fix · reader
- where: lede, `#code` and the step headings · line 1, lines 54-77
- finding: The lede promises "Every line reference is to commit `9978d84`", but the draft gives exactly one line range (L179–L183, at line 312). The reader's task T1 deliverable in `dossier:outline.md` is "each step with its code range". A new developer who has not read `server/main.py` has to search for each excerpt.
- evidence: `dossier:trace.md` holds the ranges (`server/main.py:L1371-L1374`, `L1566-L1596`, `L1618-L1632`, `server/gitops.py:L124-L143`, `server/publish.py:L58-L67`), but none reaches the chapter.
- fix: Put the range in a sentence under each step's code block (for example "`server/main.py` L1371–L1374"). A range in the block title could break `knowledge check`'s title-to-file match.
- confidence: medium

### C06 · should-fix · order
- where: first uses at lines 56, 94, 105, 128, 144
- finding: Project terms the reader cannot know are used and never defined: book, chapter, manifest, placement, the `native` and `html` formats, the Recent index/bullet, the landing page. Background never says documents come in three formats or can be bound into books.
- evidence: Line 94 lists `format` as "`md`, `html` or `native`" with no gloss. Line 105 uses "chapter placement" and "the book's manifest". Step 3's list uses "the book manifest" (item 1) and "the Recent index (`docs/index.md`)" (item 6). The stated reader "has not read server/main.py" (`dossier:brief.md`).
- fix: Add a short Background paragraph or a collapsed `[!DEFINITION]-` primer (documents are md, html or native; a chapter is a document placed in a book, whose manifest lives in `docs/`; the Recent index and landing page). Keep it to a few lines, since these are side branches of the write path.
- confidence: medium

### C07 · should-fix · facts
- where: `#step-validate` · line 119
- finding: "returns the violations it collected in one sorted list" is true only of the parser's own batch. The final 422 list is concatenated in stage order.
- evidence: `server/native/errors.py:L40` sorts only `NativeFormatError.violations` by `(line, col, code)`. In `server/main.py:L1273-L1274` `violations` is first seeded from `body_limit_violations` and asset violations (L997-L1012), then the parser's sorted batch is `extend`ed (L1227), then unknown-asset, reference (L1250) and translation (L1270) errors are appended. `remap_lines` (`server/native_ingest.py:L68`) does not sort. `dossier:ledger.md` C-r1-code-validate-23 (partial) narrower claim: sorted "violations collected up to the stage that failed", per the parser.
- fix: Say "one list: the parser's violations sorted by line and column, followed by the reference and translation findings".
- confidence: medium

### C08 · should-fix · facts
- where: `#step-queue` line 211; `#invariants` line 331; `q-outside` lines 379-382
- finding: The chapter says the lock "is not reentrant" and that "is why it must be queued from outside the lock". `publish.submit` only appends to a queue, and the worker is a different thread, so a non-reentrant lock cannot deadlock on submit. The worker would just block until the handler releases. The real hazard is anything that waits for the task while holding the lock.
- evidence: `server/publish.py:L86-L96`: `submit` does `_ensure_worker()`, bumps a counter, `_QUEUE.put(...)`, with no wait. `server/publish.py:L105-L111` (`drain`): "never while holding `WRITE_LOCK` — a queued push takes that lock". Reentrancy matters only to the same thread, and the task runs on `kb-publish`. The comment at `server/main.py:L1371-L1373` and `docs/current/backend.md` L136 do say "self-deadlock", and the chapter partly attributes this. But the bold sentence and the quiz key present it as the chapter's own mechanism. My reading here comes from the code, not from any dossier narrative.
- fix: Attribute the rule to the project, and give the mechanism that holds: queueing from inside would not by itself deadlock, but the rule keeps the lock section free of anything that waits on the worker (`drain`, or a future inline run), and keeps the lock short. Align the `q-outside` answer.
- confidence: medium

### C09 · should-fix · reader
- where: lines 92, 105, 250, 291, 295, 305, 325, 341, 343
- finding: Several paragraphs run past about 100 words or hold two or three ideas, against §4's one-idea-a-paragraph rule. The reader trips where a mechanism and a caveat share a paragraph.
- evidence: Line 291 (about 150 words) holds three ideas: git's rebase remedy, the definition of a fast-forward, and why unpushed commits travel. Line 250 (about 150 words) holds the per-step timeout, the unknown total bound, and the docs' self-contradiction. Line 325 (about 150 words) holds non-transactional steps, what each failure leaves, and what reindex does. Line 92 mixes legacy and tenant auth modes. Lines 341 and 343 (about 150-170 words each) carry three citations each.
- fix: Split each at the idea boundary. Lines 250 and 325 are the ones to split first, since they sit in the T2 and T3 deliverable sections.
- confidence: medium

### C10 · should-fix · facts
- where: `#invariants` checklist · line 330, against line 248
- finding: The checklist rule "No network call anywhere before the response: not in the handler, not in a dependency" contradicts the chapter's own description of the existing code. `ensure_registry_project` is an async dependency that awaits Postgres before the handler, and the metering middleware writes to Postgres before the body is sent. A reader who obeys the rule will think the current code already breaks it.
- evidence: draft line 248 ("The 'no network before the 201' promise covers GitHub and Gemini only. In tenant mode, `ensure_registry_project` awaits Postgres before the handler runs…") against checklist line 330. `server/main.py:L815-L844`: `await get_accounts_service().get_or_create_project(...)`. `docs/current/backend.md` L137 states the rule as "no network I/O before a write's response" and then in the same breath names only "GitHub or Gemini".
- fix: Scope the rule: no call to a remote service whose latency the caller cannot bound (GitHub, Gemini, anything new). Name the Postgres dependency as the existing, local-container exception and say why it is accepted.
- confidence: medium

### C11 · should-fix · facts
- where: `#invariants`, race 1 · line 320
- finding: "the first body vanishes from the history without any error" is ambiguous. On the public root with commit enabled, the first request's local git commit still holds its body, so the body survives in git history and is gone from the KB's version archive.
- evidence: `dossier:verify/r2-b2.md` V-C-r2-code-validate-07-1 scope note ("git commit per request on the public root keeps the first body there"). `server/main.py:L1566-L1596`: each request commits its own write. The second request has `prev_version=None`, so L1419 skips the archive.
- fix: Write "vanishes from the KB's version archive (on the public root the first request's git commit still holds it)".
- confidence: medium

### C12 · note · facts
- where: `#step-validate` · line 119
- finding: "The 409 of row 5 carries a hint…" holds only when a database row exists at the path. A file with no row gets the 409 without `hint`, `id` or `existing_title`.
- evidence: `server/main.py:L1135-L1147`: the hint is set inside `if existing_row is not None:`.

### C13 · note · clarity
- where: `#best-practices` · line 341
- finding: The outbox analogy is labelled, which is right, but it does not say where the analogy breaks. In the outbox pattern the message is stored in the same transaction as the data and a durable relay retries. Here the "record" is a git commit written after the SQLite commit, and the relay is an in-memory queue that never retries.
- evidence: `dossier:` source pages for microservices.io ("Message outbox … stores the messages to be sent") and AWS (the outbox row is updated "in the same transaction"). The chapter's own `#push-failures` (line 293) says nothing re-queues a failed push. The following "diverges" paragraph partly covers this; one clause here would close it.

### C14 · note · coverage
- where: `#waits` · line 250
- finding: The worst case a write waits behind one push is derivable from the code and could be stated as routine arithmetic, even though the gap is declared "stated" and honoured. The push makes at most four sequential `_run` calls (fetch, rebase, push, then `rev-parse` on success), or three plus `rebase --abort` on failure, each capped at `KB_GIT_TIMEOUT_S` (default 60 s), so about four times that per push.
- evidence: `server/gitops.py:L124-L143`; `server/config.py:L106-L122`. Python's `threading.Lock` is not fair, so queued pushes behind it are a separate question.

### C15 · note · reader
- where: `#invariants` checklist · line 335
- finding: The checklist cites `python3 scripts/plugin_parity.py` but never says why it matters: `server/*` and `tests/*` are byte-mirrored into `plugin/templates/kb/`, so a write-path change needs the same edit there.
- evidence: `plugin/templates/kb/server/main.py` and `plugin/templates/kb/server/publish.py` exist; `docs/current/operations.md` L632.

### C16 · note · ledger
- where: `#step-validate` · line 121, line 124
- finding: "Because the two endpoints share one function, they cannot drift apart" rests on `C-r1-history-23`, which the ledger still holds as `candidate`. I confirmed the `_check_document` docstring ("so the two cannot drift") at `server/main.py:L938-L948`, so there is no ledger finding. The sentence is stronger than the code: the check handler also calls `_place_variant` itself (L1768) and skips `ensure_registry_project`.
- evidence: `server/main.py:L1740-L1793`.

## Scorecard

- facts: C07, C08, C10, C11 (notes C12, C14)
- citations: holds. All 14 sources resolve and say what they are cited for (details under Holds).
- ledger: C01, C02 (notes C13, C16)
- coverage: holds. 16/16 load-bearing questions answered or declared; must-cover 5/5; Q16 and G-r2-01 and G-r2-04 stated as declared; G-r2-02 and Q15 dropped and not asserted. Note C14.
- diagrams: C04
- quiz: C03
- order: C06
- reader: C05, C09 (note C15)
- clarity: holds, apart from C09 and C06
- rules: holds. No raw HTML (every `<` is in backticks), `##` and `###` headings only, ids unique, all `#s-…` links resolve to the `sources` block, YAML strings quoted, citations end their sentences.

**Holds** (keep through the revision):
- The code excerpts: `#write-lock`, `#handler-signature`, `#check-first`, `#lock-open`, `#commit-step`, `#queue-step`, `#worker-loop`, `#push-task`, `#gitops-push` and `#test-hanging-push` all match `9978d84` exactly, with elisions marked.
- The error-stage table's order and statuses match `_check_document` (`server/main.py:L950-L1274`).
- The numbered list of the locked section matches the real order at L1374-L1597, and "no `HTTPException` from the archive step onward" holds.
- `#waits`: the before/after table, the honest statement that the docs disagree with themselves, and the note on what `test_response_does_not_wait_for_a_hanging_push` does not test (single POST; the stand-in holds the lock). This is the most useful passage for T2.
- `#push-failures`: the operator check, the "nothing retries" finding, the in-memory-queue caveat and the two declared open edges. All are backed by `server/gitops.py`, `server/publish.py` and the operations doc.
- The invariants list, the checklist (apart from C10) and the "No test guards the two races" statement (no concurrency idiom in `tests/`).
- `q-refused`, `q-pushed` and `q-wait`: keys are right and each has a single defensible answer. `q-refused`'s "legacy-mode" framing correctly avoids the tenant-mode registry row.
- `seq-publish`: order of events agrees with the code.
- History claims checked against `b769236`'s diff and the P24 phase notes: pre-P24 push in-lock with no timeout, embed outside the lock but before the response, `push_pending` added, `pushed` fixed at false.

**Not seen:**
- The reader's render of the diagrams, quiz and callouts.
- `knowledge check`: I did not run it. I read the hard rules by hand (§4.1) and found no violation.
- The 14 web pages were fetched and converted into the critic scratch folder by an earlier, interrupted attempt. I did not re-fetch them. I confirmed each page's title line matches its source id and re-read the passages behind every cited sentence, but not the whole pages. No `WebSearch` was needed.
- Python docs pages show "3.15.1"; the URLs use `/3/`. I judged the cited statements version-independent.
- I did not run the code or the test suite. The race and partial-failure paragraphs are code traces ("the code permits") and the chapter labels them so; I re-traced both against `server/main.py`, `server/documents.py` and `server/db.py`, not by execution.
- I opened `run.md` in error while looking for the verifier records. I did not use it, and no finding above depends on it. Every finding rests on code, git history, the docs, the ledger, the verify records or the pages.
- `docs/current/api.md` L43 and `architecture.md` L39 were re-read for the "never retry on `pushed:false`" rule and match. I did not read the rest of those docs.
