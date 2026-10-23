# Verification: 20261023-0350-post-api-documents-write-path · final-b1
- verifier: claude-sonnet-5-5 · date: 2026-10-23 · claims: 10 · supported 8 · partial 2 · contradicted 0 · not-addressed 0 · passage-not-found 0 · unreachable 0 · needs-rewrite 0

## Records

### V-C-r1-practice-04-1
- claim: C-r1-practice-04
- source S-r1-practice-02 · opened: https://fastapi.tiangolo.com/tutorial/background-tasks/ (curl; saved pages/final-b1/S-r1-practice-02.txt) · quote-match: exact · passage at § "Background Tasks" (P1, P2) and § "Dependency Injection" (P3): found verbatim
- looked first: the page opens with "You can define background tasks to be run after returning a response", gives email notification and "Accepted (HTTP 202)" file processing examples, and has a Caveat section pointing to Celery for heavy work in other processes.
- implied: background tasks run after the response is returned (P1); the use is for operations the client need not wait on before receiving the response (P2); the example's messages are written after the response is sent (P3). Scope: FastAPI BackgroundTasks, current docs.
- verdict: supported · reason: the claim restates P1/P2 almost verbatim; P3 confirms the timing.
- bar: met (rung 1, official docs, descriptive claim) · independence: n/a (single source, the project's own docs) · currency: page undated; the same project's Advanced Dependencies page (S-v1-01) notes version changes (0.106.0, reverted 0.118.0, `scope` in 0.121.0) for yield-dependency exit code relative to the response, not for BackgroundTasks timing itself. No later change to "tasks run after the response".
- counter: none-found ("FastAPI BackgroundTasks BaseHTTPMiddleware response delayed until background task finishes"; "FastAPI background tasks dependencies with yield exit code after response changed version"). Fetched https://fastapi.tiangolo.com/advanced/advanced-dependencies/ (saved pages/final-b1/S-v1-01.txt): § "Dependencies with yield and scope": "Using Depends(scope="function"), the exit code after yield is executed right after the path operation function is finished, before the response is sent back to the client." This concerns dependency exit code, not the timing of background tasks, so it is a version caveat and not a conflict. Search results did not settle whether Starlette BaseHTTPMiddleware delays the response when a background task is attached; it is the very ordering concern the repo's publish.py docstring raises. Not recorded as a counter-source (no quoted passage).

### V-C-r1-practice-13-1
- claim: C-r1-practice-13
- source S-r1-practice-05 · opened: https://microservices.io/patterns/data/transactional-outbox.html (curl) · quote-match: exact · passage P3 at § "Solution": found verbatim
- source S-r1-practice-06 · opened: https://docs.aws.amazon.com/prescriptive-guidance/latest/cloud-design-patterns/transactional-outbox.html (curl) · quote-match: exact · passage P3 at § "Using an outbox table with a relational database": found verbatim
- implied: microservices.io: the sender first stores the message in the database as part of the transaction updating the business entities, then a separate process sends the messages to the broker. AWS: the outbox table is updated in the same transaction as the flight table; another service reads the outbox table and sends the event to Amazon SQS.
- verdict: supported · reason: both pages state the same-transaction store and a separate sender; the AWS example names SQS as the destination rather than "a message broker", which is the same idea.
- bar: met (not load-bearing; two independent sources, rung 2 / rung 1 attributed) · independence: different owners (Richardson/microservices.io vs AWS); AWS page does not cite microservices.io · currency: undated pages, accessed 2026-10-23.
- counter: not run

### V-C-r1-practice-14-1
- claim: C-r1-practice-14
- source S-r1-practice-05 · opened: https://microservices.io/patterns/data/transactional-outbox.html (curl) · quote-match: exact · passage P5 at § "Result context": found verbatim
- source S-r1-practice-06 · opened: https://docs.aws.amazon.com/prescriptive-guidance/latest/cloud-design-patterns/transactional-outbox.html (curl) · quote-match: exact · passage P4 at § "Issues and considerations": found verbatim
- looked first: microservices.io lists "The Message relay might publish a message more than once" under the pattern's issues and adds that consumers usually need to be idempotent anyway; AWS has a "Duplicate messages" consideration and also notes SQS standard queues can deliver more than once.
- implied: microservices.io: relay may publish more than once, e.g. crash after publishing but before recording that it did so; "a message consumer must be idempotent". AWS: "The events processing service might send out duplicate messages or events, so we recommend that you make the consuming service idempotent by tracking the processed messages." The crash-between-publish-and-record example appears only on the microservices.io page; AWS gives no cause. AWS says "we recommend", microservices.io says "must".
- verdict: partial · reason: the core proposition (relay may send more than once, so make the consumer idempotent) is stated by both. The claim's parenthetical crash example, written under "Both ... state", is stated by microservices.io only. · narrower claim: "Both microservices.io and AWS Prescriptive Guidance state that an outbox relay or event-processing service may send a message more than once and that the consuming side should be made idempotent; microservices.io gives the example of a relay crashing after publishing but before recording that it did so."
- bar: met for the narrower claim (descriptive, attributed; two independent sources) · independence: different owners, no citation of one by the other · currency: undated, accessed 2026-10-23.
- counter: none-found ("transactional outbox duplicates not always required idempotent consumer exactly-once limitations"; result set was blog posts that agree the outbox gives atomicity, not single delivery, and left at-least-once as the usual design; these are rung 3 and add no conflict). Currency: no sign of either page being superseded.

### V-C-r1-practice-15-1
- claim: C-r1-practice-15
- source S-r1-practice-09 · opened: https://learn.microsoft.com/en-us/azure/architecture/best-practices/background-jobs (curl) · quote-match: exact · passage P2 at § "In this article": found verbatim; P3 at § "Returning results": found verbatim (the passage is on a line under a different, nearby heading; the text matches)
- implied: P2: background jobs run without user interaction; the application starts the job and continues to process interactive requests; this reduces interactive response times (and improves availability, not in the claim). P3: they run asynchronously in a separate process, or even a separate location, from the UI or the process that invoked them.
- verdict: supported · reason: every element of the claim matches; the claim attributes it to Microsoft's guidance. The page's title is "Best practices for background jobs".
- bar: met (not load-bearing; rung 1 for the attributed form) · independence: n/a · currency: undated page; accessed 2026-10-23.
- counter: not run

### V-C-r1-practice-16-1
- claim: C-r1-practice-16
- source S-r1-practice-09 · opened: https://learn.microsoft.com/en-us/azure/architecture/best-practices/background-jobs (curl) · quote-match: exact · passage P1 at § "Design for idempotency": found verbatim; P4 at § "Reliability considerations": found verbatim
- looked first: the page's idempotency section says jobs are "especially prone to running more than once"; its reliability section gives the fail-before-delete example and the rule.
- implied: P1: queues deliver messages at least once; infrastructure restarts can replay partially completed work. P4: queues are at-least-once delivery mechanisms; a task that fails after processing but before deleting the message sees it again; "All message-driven background tasks must be idempotent." The "therefore" in the claim follows P4's explicit order (at-least-once, then the rule).
- verdict: supported · reason: all three elements and their link are on the page; the claim is attributed to Microsoft's guidance. The page's at-least-once statement is general for "queues"; it does not claim every queue product lacks send-side duplicate detection.
- bar: met (rung 1 for the attributed form; the claim is not stated in the chapter's own voice) · independence: n/a · currency: undated page; no later version found.
- counter: none-found ("Azure Service Bus duplicate detection exactly-once queue idempotency background jobs"). Fetched https://learn.microsoft.com/en-us/azure/service-bus-messaging/duplicate-detection (saved pages/final-b1/S-v1-02.txt), which describes optional sender-side duplicate detection by MessageId within a window, and says "In scenarios where client code can't resubmit a message with the same MessageId as before, design messages that can be safely reprocessed." This limits the products that get duplicates, not Microsoft's guidance as attributed; no conflict.

### V-C-r1-code-write-24-1
- claim: C-r1-code-write-24
- source S-r1-code-write-01 · opened: 9978d84:server/main.py (read from the clean working tree at HEAD 9978d84; checked lines L205-L233 by Read) · quote-match: exact · passage at L215-L231: found verbatim
- implied: `_embed_task` takes `db_file`, `doc_id`, `title`, `markdown`; the task computes `embed_texts([document_input(title, markdown)], kind="document")`, calls `db.connect(db_file)` (its own connection), upserts with `content_hash(model, title, markdown)`, `dims`, packed vector, and closes the connection. The docstring (L206-L213) says it "opens its own against the db path captured at submit time". The call site (main.py L1623-L1632) passes `db_file=config.db_path()`, `title=body.title`, `markdown=stored_markdown`, only when `config.embeddings_enabled()`. No WRITE_LOCK in the task body.
- verdict: supported · reason: each element is in the code, including that the markdown passed is the stored markdown at the call site.
- bar: met (rung 1, code at commit) · independence: n/a · currency: pinned to 9978d84. excerpt-sha256 not recomputed (the allowed Bash forms do not permit a pipe); content matched line by line.
- counter: not run

### V-C-r1-code-write-28-1
- claim: C-r1-code-write-28
- source S-r1-code-write-01 · opened: 9978d84:server/publish.py (git show; L3-L31 checked) · quote-match: exact · passage at L12-L22: found verbatim
- implied: the docstring names "one process-wide daemon worker thread + a FIFO queue" with "Deliberate properties": the request thread never waits (submit only appends); a parenthetical says Starlette BackgroundTasks would also run after the handler but ordering against the BaseHTTPMiddleware metering is "subtle", and a queue makes "the response never waits" a property of the code, not of the ASGI stack; pushes stay serialized (never two concurrent rebases, one push per write in submit order).
- verdict: supported · reason: the claim paraphrases the docstring. The docstring lists these as "deliberate properties" rather than as labelled "reasons"; the BackgroundTasks contrast is a parenthetical, which the claim states faithfully. The claim is attributed to the docstring.
- bar: met (rung 1, code; design rationale attributed to its own docstring) · independence: n/a · currency: pinned to 9978d84. Hash not recomputed (pipe not allowed); line range confirmed by counting.
- counter: not run

### V-C-r1-history2-14-1
- claim: C-r1-history2-14
- source S-r1-history2-01 · opened: 9978d84:docs/current/operations.md (read from clean working tree at HEAD; L244-L262) · quote-match: exact · passage at L252-L262: found verbatim
- implied: "the push's outcome is no longer in the response at all"; `pushed` always false; `push_pending:true` means queued; failed push appears only as `[kb-api] publish: push <rel_path> FAILED: <err>` in the api container log (L253-L255). "The queue is in-memory: a container restart drops any not-yet-run push (never a save)" (L260). "A stalled embed blocks the queue behind it until restart — semantic search and the off-box backup lag, writes and the live site do not." (L261-L262).
- verdict: supported · reason: every element is stated. The doc adds that semantic search and the off-box backup do lag during a stall; the claim says only that writes and the live site do not, which is accurate.
- bar: met (rung 1, a project's own docs; descriptive) · independence: n/a · currency: pinned to 9978d84; the doc's own header says version v0025.
- counter: not run

### V-C-r1-history-17-1
- claim: C-r1-history-17
- source S-r1-history-01 · opened: 9978d84:works/phases/active/P24/phase.md (read from clean working tree at HEAD; L217-L314) · quote-match: exact · passages at L221-L235 and L302-L310: found verbatim
- implied: the skill's new rule: after a transport failure on the publish POST, check `GET /api/documents/by-path/<rel_path>`; "Never loop: one verification, at most one retry" (L229-L230). Publish budget "raised to `--max-time 30`" (L231). CLI: "One verification, zero retries" (L302); `client.WRITE_TIMEOUT = 30` as a per-call override for `document_create` only; reads stay at 15 s (L305-L306); `knowledge.verify_save` verifies (L283). "The two shipped clients now agree" (L309-L310).
- verdict: supported · reason: all parts present; the CLI's "verifies without re-POSTing" matches "zero retries".
- bar: met (rung 1, project's own phase record) · independence: n/a · currency: pinned to 9978d84.
- counter: not run

### V-C-r1-history-19-1
- claim: C-r1-history-19
- source S-r1-history-01 · opened: 9978d84:works/phases/active/P24/phase.md (same clean tree; L464-L468, plus L371-L375 read for context) · quote-match: exact · passage at L464-L468: found verbatim
- implied: the deferred job is to bound the Gemini embed on the publish worker; a stalled embed blocks the single FIFO queue and every push behind it until restart; "availability of the off-box backup, not correctness"; recorded as "an accepted limit" in backend.md, operations.md and qa.md. L371-L375 (an earlier review pass) adds "Writes stay durable and republish on the next successful push".
- verdict: partial · reason: the stall mechanism, the "availability not correctness" framing and the "accepted limit" are stated. Not stated: that this is the only limit P24 left ("left one accepted limit"); the passage says it is "an accepted limit", and the deferred job "from the first pass still stands". The "because writes stay durable" link is in L371-L375, not in the cited L464-L468 range. "No client timeout" is implied by "bound the Gemini embed" rather than stated. · narrower claim: "A P24 review note records as an accepted limit (a deferred job, not a fix slice) that the Gemini embed on the publish worker is unbounded, so a stalled embed blocks the single FIFO queue and every push behind it until restart; the note calls this availability of the off-box backup, not correctness, since writes stay durable and republish on the next successful push."
- bar: met for the narrower claim (rung 1, descriptive) · independence: n/a · currency: pinned to 9978d84.
- counter: not run

## Counter-evidence
No counter-sources recorded. Two fetched pages (S-v1-01 FastAPI Advanced Dependencies; S-v1-02 Azure Service Bus duplicate detection) are context, not conflicts; see the records for C-r1-practice-04 and C-r1-practice-16.

## Leads
- https://fastapi.tiangolo.com/advanced/advanced-dependencies/ — version history of yield-dependency exit code vs response sending (0.106.0, 0.118.0, 0.121.0), if the chapter says anything about dependencies near background tasks.
- https://learn.microsoft.com/en-us/azure/service-bus-messaging/duplicate-detection — send-side duplicate detection, for a caution that "at least once" is a general queue property, not a universal one.
- https://redirect.github.com/tiangolo/fastapi/pull/9636 — a PR thread (not opened) about dependency exit running only after background tasks finish; rung 3.
