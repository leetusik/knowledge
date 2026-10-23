# Findings: 20261023-0350-post-api-documents-write-path · round 1 · angle practice
- researcher: claude-opus-5-5 · status: complete · tool calls: 29

## Questions
- Q12: answered — claims: C-r1-practice-01, C-r1-practice-02, C-r1-practice-03, C-r1-practice-04, C-r1-practice-05, C-r1-practice-06, C-r1-practice-07, C-r1-practice-08, C-r1-practice-09, C-r1-practice-10 — note: FastAPI/Starlette docs (rung 1) plus Starlette source at a pinned commit cover threadpool, the 40-token limit, background-after-send, task order, the Celery caveat and per-process memory; the implications for a threading.Lock are left to the writer's reasoning from these facts (no source states them for this exact design).
- Q13: answered — claims: C-r1-practice-11, C-r1-practice-12, C-r1-practice-13, C-r1-practice-14, C-r1-practice-15, C-r1-practice-16 — note: transactional outbox (microservices.io, AWS Prescriptive Guidance) and background-job guidance (Azure Architecture Center) on at-least-once delivery and idempotency.

## Sources

### S-r1-practice-01
- url: https://fastapi.tiangolo.com/async/ · canonical: fastapi.tiangolo.com/async/
- title: Concurrency and async / await · authors: Sebastián Ramírez (tiangolo) and contributors · publisher: FastAPI documentation
- date: not printed on page · version: current docs as of access (2026-10-23)
- accessed: 2026-10-23 · read-via: curl · quote-match: exact · archive: none
- kind: official docs · peer-review: n/a
- owner: FastAPI project (tiangolo) · upstream: none
- lateral: official documentation of the FastAPI framework, maintained in the fastapi/fastapi repository.
- passages:
  - P1 · § "Path operation functions": "When you declare a path operation function with normal def instead of async def, it is run in an external threadpool that is then awaited, instead of being called directly (as it would block the server)."
  - P2 · § "Dependencies": "The same applies for dependencies. If a dependency is a standard def function instead of async def, it is run in the external threadpool."
  - P3 · § "In a hurry?": "If you are using a third party library that communicates with something (a database, an API, the file system, etc.) and doesn't have support for using await, (this is currently the case for most database libraries), then declare your path operation functions as normally, with just def"
  - P4 · § "Other utility functions": "If your utility function is a normal function with def, it will be called directly (as you write it in your code), not in a threadpool"

### S-r1-practice-02
- url: https://fastapi.tiangolo.com/tutorial/background-tasks/ · canonical: fastapi.tiangolo.com/tutorial/background-tasks/
- title: Background Tasks · authors: Sebastián Ramírez (tiangolo) and contributors · publisher: FastAPI documentation
- date: not printed on page · version: current docs as of access (2026-10-23)
- accessed: 2026-10-23 · read-via: curl · quote-match: exact · archive: none
- kind: official docs · peer-review: n/a
- owner: FastAPI project (tiangolo) · upstream: none
- lateral: official documentation of the FastAPI framework.
- passages:
  - P1 · § "Background Tasks": "You can define background tasks to be run after returning a response."
  - P2 · § "Background Tasks": "This is useful for operations that need to happen after a request, but that the client doesn't really have to be waiting for the operation to complete before receiving the response."
  - P3 · § "Dependency Injection": "In this example, the messages will be written to the log.txt file after the response is sent."
  - P4 · § "Technical Details": "The class BackgroundTasks comes directly from starlette.background."
  - P5 · § "Caveat": "If you need to perform heavy background computation and you don't necessarily need it to be run by the same process (for example, you don't need to share memory, variables, etc), you might benefit from using other bigger tools like Celery."
  - P6 · § "Caveat": "They tend to require more complex configurations, a message/job queue manager, like RabbitMQ or Redis, but they allow you to run background tasks in multiple processes, and especially, in multiple servers."
  - P7 · § "Caveat": "But if you need to access variables and objects from the same FastAPI app, or you need to perform small background tasks (like sending an email notification), you can simply just use BackgroundTasks."
  - P8 · § "Create a task function": "It can be an async def or normal def function, FastAPI will know how to handle it correctly."

### S-r1-practice-03
- url: https://starlette.dev/background/ · canonical: starlette.dev/background/
- title: Background Tasks - Starlette · authors: not printed · publisher: Starlette documentation (Kludex/starlette)
- date: not printed on page · version: current docs as of access (2026-10-23)
- accessed: 2026-10-23 · read-via: curl · quote-match: exact · archive: none
- kind: official docs · peer-review: n/a
- owner: Starlette project (Kludex/starlette; maintainer Marcelo Trylesinski) · upstream: none
- lateral: www.starlette.io no longer resolves; the Starlette repo's pyproject.toml lists Documentation = "https://starlette.dev/" (seen in the GitHub commit metadata fetched for S-r1-practice-08), so this is the official docs host.
- passages:
  - P1 · § "Background Tasks": "Starlette includes a BackgroundTask class for in-process background tasks."
  - P2 · § "Background Tasks": "A background task should be attached to a response, and will run only once the response has been sent."
  - P3 · § "BackgroundTasks": "The tasks are executed in order. In case one of the tasks raises an exception, the following tasks will not get the opportunity to be executed."

### S-r1-practice-04
- url: https://starlette.dev/threadpool/ · canonical: starlette.dev/threadpool/
- title: Thread Pool - Starlette · authors: not printed · publisher: Starlette documentation (Kludex/starlette)
- date: not printed on page · version: current docs as of access (2026-10-23)
- accessed: 2026-10-23 · read-via: curl · quote-match: exact · archive: none
- kind: official docs · peer-review: n/a
- owner: Starlette project (Kludex/starlette) · upstream: none
- lateral: same official docs host as S-r1-practice-03.
- passages:
  - P1 · § "Thread Pool": "When you create a synchronous endpoint using def instead of async def"
  - P2 · § "Thread Pool": "When running synchronous background tasks with BackgroundTask"
  - P3 · § "Thread Pool": "To be more precise, Starlette uses anyio.to_thread.run_sync to run the synchronous code."
  - P4 · § "Concurrency Limitations": "The default thread pool size is only 40 tokens. This means that only 40 threads can run at the same time. This limit is shared with other libraries: for example FastAPI also uses anyio to run sync dependencies, which also uses up thread capacity."
  - P5 · § "Thread Pool": "Starlette will run your code in a thread pool to avoid blocking the event loop. This applies for endpoint functions and background tasks you create, but also for internal Starlette code."

### S-r1-practice-05
- url: https://microservices.io/patterns/data/transactional-outbox.html · canonical: microservices.io/patterns/data/transactional-outbox.html
- title: Pattern: Transactional outbox · authors: Chris Richardson · publisher: microservices.io
- date: not printed (copyright 2026) · version: n/a
- accessed: 2026-10-23 · read-via: curl · quote-match: exact · archive: none
- kind: analysis · peer-review: no
- owner: Chris Richardson (consultant; also founder of Eventuate, which the page says implements this pattern) · upstream: Richardson's book Microservices Patterns (Manning)
- lateral: the page footer says the site is created by Chris Richardson, "author of Microservices Patterns"; the book is published by Manning, an editorially controlled publisher, so this is an expert's own writing (rung 2 for the pattern's definition). Stake: he sells consulting and the Eventuate framework that implements the pattern.
- passages:
  - P1 · § "Problem": "How to atomically update the database and send messages to a message broker?"
  - P2 · § "Context": "But without using 2PC, sending a message in the middle of a transaction is not reliable. There’s no guarantee that the transaction will commit. Similarly, if a service sends a message after committing the transaction there’s no guarantee that it won’t crash before sending the message."
  - P3 · § "Solution": "The solution is for the service that sends the message to first store the message in the database as part of the transaction that updates the business entities. A separate process then sends the messages to the message broker."
  - P4 · § "Result context": "Messages are guaranteed to be sent if and only if the database transaction commits"
  - P5 · § "Result context": "The Message relay might publish a message more than once. It might, for example, crash after publishing a message but before recording the fact that it has done so. When it restarts, it will then publish the message again. As a result, a message consumer must be idempotent"

### S-r1-practice-06
- url: https://docs.aws.amazon.com/prescriptive-guidance/latest/cloud-design-patterns/transactional-outbox.html · canonical: docs.aws.amazon.com/prescriptive-guidance/latest/cloud-design-patterns/transactional-outbox.html
- title: Transactional outbox pattern - AWS Prescriptive Guidance · authors: not printed · publisher: Amazon Web Services
- date: not recorded · version: n/a
- accessed: 2026-10-23 · read-via: curl · quote-match: exact · archive: none
- kind: official docs · peer-review: n/a
- owner: Amazon Web Services · upstream: none (does not cite microservices.io for these statements)
- lateral: AWS Prescriptive Guidance is AWS's own architecture guidance series; a vendor, but describing a vendor-neutral pattern; independent owner from S-r1-practice-05.
- passages:
  - P1 · § "Intent": "The transactional outbox pattern resolves the dual write operations issue that occurs in distributed systems when a single operation involves both a database write operation and a message or event notification."
  - P2 · § "Intent": "A dual write operation occurs when an application writes to two different systems; for example, when a microservice needs to persist data in the database and send a message to notify other systems. A failure in one of these operations might result in inconsistent data."
  - P3 · § "Using an outbox table with a relational database": "When the flight table is updated, the outbox table is also updated in the same transaction. Another service (for example, the event processing service) reads from the outbox table and sends the event to Amazon SQS."
  - P4 · § "Issues and considerations": "Duplicate messages: The events processing service might send out duplicate messages or events, so we recommend that you make the consuming service idempotent by tracking the processed messages."

### S-r1-practice-07
- url: https://fastapi.tiangolo.com/deployment/concepts/ · canonical: fastapi.tiangolo.com/deployment/concepts/
- title: Deployments Concepts · authors: Sebastián Ramírez (tiangolo) and contributors · publisher: FastAPI documentation
- date: not printed on page · version: current docs as of access (2026-10-23)
- accessed: 2026-10-23 · read-via: curl · quote-match: exact · archive: none
- kind: official docs · peer-review: n/a
- owner: FastAPI project (tiangolo) · upstream: none
- lateral: official documentation of the FastAPI framework.
- passages:
  - P1 · § "Multiple Processes - Workers": "When you run multiple processes of the same API program, they are commonly called workers."
  - P2 · § "Memory per Process": "And multiple processes normally don't share any memory. This means that each running process has its own things, variables, and memory."

### S-r1-practice-08
- url: https://raw.githubusercontent.com/Kludex/starlette/1a3a401c0d33920b7c8b1541fb89784976a41a96/starlette/responses.py · canonical: github.com/Kludex/starlette/blob/1a3a401c0d33920b7c8b1541fb89784976a41a96/starlette/responses.py
- repo: https://github.com/Kludex/starlette · commit: 1a3a401c0d33920b7c8b1541fb89784976a41a96 · date: 2026-10-21 (main branch head at access)
- title: starlette/responses.py · authors: Starlette contributors · publisher: GitHub
- date: 2026-10-21 · version: Starlette main at commit 1a3a401
- accessed: 2026-10-23 · read-via: curl · quote-match: exact · archive: none
- kind: code · peer-review: n/a
- owner: Starlette project (Kludex/starlette) · upstream: none
- lateral: commit fetched via the GitHub API; the remote file is not in a local git repo, so the excerpt is quoted from the raw file (lines 168-175) instead of hashed with git show.
- passages:
  - P1 · L168-L175: "async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None: … await send({"type": "http.response.start", "status": self.status_code, "headers": self.raw_headers}) … await send({"type": "http.response.body", "body": self.body}) … if self.background is not None: … await self.background()"

### S-r1-practice-09
- url: https://learn.microsoft.com/en-us/azure/architecture/best-practices/background-jobs · canonical: learn.microsoft.com/en-us/azure/architecture/best-practices/background-jobs
- title: Background jobs (Azure Architecture Center) · authors: not recorded · publisher: Microsoft
- date: not recorded · version: n/a
- accessed: 2026-10-23 · read-via: curl · quote-match: exact · archive: none
- kind: official docs · peer-review: n/a
- owner: Microsoft · upstream: none
- lateral: Azure Architecture Center is Microsoft's architecture guidance; vendor guidance, but the passages used state general background-job design principles; independent owner from S-r1-practice-05 and S-r1-practice-06.
- passages:
  - P1 · § "Design for idempotency": "Background jobs are especially prone to running more than once for the same logical work item. Queues deliver messages at least once, schedulers can overlap if a job runs longer than the timer interval, and infrastructure restarts can replay partially completed work."
  - P2 · § "In this article": "Background jobs run without user interaction. The application starts the job and continues to process interactive requests from users. This approach minimizes load on the application UI, which improves availability and reduces interactive response times."
  - P3 · § "Returning results": "Background jobs run asynchronously in a separate process, or even a separate location, from the UI or the process that invoked them."
  - P4 · § "Reliability considerations": "Queues are guaranteed at least once delivery mechanisms, which means that a message can be delivered more than once. If a background task fails after processing a message but before deleting it from the queue, the message becomes available for processing again. All message-driven background tasks must be idempotent."
  - P5 · § "Reliability considerations": "Background tasks must gracefully handle restarts without corrupting data or introducing inconsistency into the application."

## Claims

### C-r1-practice-01
- claim: FastAPI runs a path operation function declared with plain `def` (not `async def`) in an external threadpool and awaits it, instead of calling it directly on the event loop, because calling it directly would block the server.
- kind: behaviour
- questions: Q12 · load-bearing: yes (explains where the publish endpoint's sync code, including its lock, runs)
- support: S-r1-practice-01/P1 · rung 1 · fit direct · upstream self
- support: S-r1-practice-04/P1 · rung 1 · fit direct · upstream self (Starlette lists sync `def` endpoints among the thread-pool cases)
- scope: FastAPI and Starlette documentation as accessed 2026-10-23
- confidence: high · flags: none
- conflicts: none

### C-r1-practice-02
- claim: FastAPI also runs a dependency declared with plain `def` in the external threadpool, while a plain `def` utility function that user code calls directly is called directly, not in a threadpool.
- kind: behaviour
- questions: Q12 · load-bearing: no (detail that helps the reader place helper calls inside the endpoint)
- support: S-r1-practice-01/P2 · rung 1 · fit direct · upstream self
- support: S-r1-practice-01/P4 · rung 1 · fit direct · upstream self
- scope: FastAPI documentation as accessed 2026-10-23
- confidence: high · flags: none
- conflicts: none

### C-r1-practice-03
- claim: Starlette runs synchronous code (sync endpoints and sync background tasks) with `anyio.to_thread.run_sync`, and its documentation states that the default thread pool size is 40 tokens, so only 40 threads can run at the same time, a limit shared with FastAPI's sync dependencies.
- kind: number
- questions: Q12 · load-bearing: yes (shows several sync requests can run concurrently in different threads, which is why an in-process lock is needed around shared state)
- support: S-r1-practice-04/P3 · rung 1 · fit direct · upstream self
- support: S-r1-practice-04/P4 · rung 1 · fit direct · upstream self
- scope: Starlette documentation as accessed 2026-10-23; the default is anyio's default thread limiter
- confidence: high · flags: none
- conflicts: none

### C-r1-practice-04
- claim: The FastAPI documentation states that background tasks are run after returning a response, for operations the client does not need to wait on before receiving the response.
- kind: behaviour
- questions: Q12 · load-bearing: yes (the core timing fact for "the 201 never waits on the side effect")
- support: S-r1-practice-02/P1 · rung 1 · fit direct · upstream self
- support: S-r1-practice-02/P2 · rung 1 · fit direct · upstream self
- support: S-r1-practice-02/P3 · rung 1 · fit direct · upstream self
- scope: FastAPI `BackgroundTasks`, documentation as accessed 2026-10-23
- confidence: high · flags: none
- conflicts: none

### C-r1-practice-05
- claim: FastAPI's `BackgroundTasks` class comes directly from `starlette.background`, and Starlette documents its `BackgroundTask` as an in-process background task that is attached to a response and runs only once the response has been sent.
- kind: behaviour
- questions: Q12 · load-bearing: yes (establishes that FastAPI background tasks are in-process, as an in-process worker is)
- support: S-r1-practice-02/P4 · rung 1 · fit direct · upstream self
- support: S-r1-practice-03/P1 · rung 1 · fit direct · upstream self
- support: S-r1-practice-03/P2 · rung 1 · fit direct · upstream self
- scope: FastAPI and Starlette documentation as accessed 2026-10-23
- confidence: high · flags: none
- conflicts: none

### C-r1-practice-06
- claim: In Starlette's `Response.__call__` at commit 1a3a401 (main, 2026-10-21), the response sends `http.response.start` and then `http.response.body`, and only after those sends awaits `self.background()` if a background task is set.
- kind: behaviour
- questions: Q12 · load-bearing: yes (code-level confirmation of "after the response is sent")
- support: S-r1-practice-08/P1 · rung 1 · fit direct · upstream self
- scope: plain `Response` class (JSONResponse inherits from it) at Starlette commit 1a3a401c0d33920b7c8b1541fb89784976a41a96; streaming and file responses have their own `__call__`
- confidence: high · flags: none
- conflicts: none

### C-r1-practice-07
- claim: Starlette's documentation states that synchronous background tasks (`BackgroundTask` with a plain function) are run in the thread pool, the same thread pool used for sync endpoints.
- kind: behaviour
- questions: Q12 · load-bearing: no (detail: a sync background task competes for the same 40-token pool)
- support: S-r1-practice-04/P2 · rung 1 · fit direct · upstream self
- support: S-r1-practice-04/P5 · rung 1 · fit direct · upstream self
- scope: Starlette documentation as accessed 2026-10-23
- confidence: high · flags: none
- conflicts: none

### C-r1-practice-08
- claim: Starlette's documentation states that background tasks attached to one response are executed in order, and if one task raises an exception the following tasks do not get to run.
- kind: behaviour
- questions: Q12 · load-bearing: no (contrast point with a dedicated worker queue)
- support: S-r1-practice-03/P3 · rung 1 · fit direct · upstream self
- scope: Starlette `BackgroundTasks`, documentation as accessed 2026-10-23
- confidence: high · flags: none
- conflicts: none

### C-r1-practice-09
- claim: The FastAPI documentation advises that heavy background computation that does not need to run in the same process may benefit from bigger tools like Celery, which need a message/job queue manager such as RabbitMQ or Redis but can run background tasks in multiple processes and servers, while `BackgroundTasks` suits small tasks or tasks that need the same app's variables and objects.
- kind: interpretation
- questions: Q12 · load-bearing: yes (the docs' own guidance on when in-process background work stops being enough; attributed to the FastAPI docs)
- support: S-r1-practice-02/P5 · rung 1 · fit direct · upstream self
- support: S-r1-practice-02/P6 · rung 1 · fit direct · upstream self
- support: S-r1-practice-02/P7 · rung 1 · fit direct · upstream self
- scope: attributed form only ("the FastAPI docs advise"); documentation as accessed 2026-10-23
- confidence: high · flags: vendor-about-itself
- conflicts: none

### C-r1-practice-10
- claim: The FastAPI deployment documentation states that multiple worker processes of the same API program normally do not share memory, so each process has its own variables and memory.
- kind: behaviour
- questions: Q12 · load-bearing: yes (a `threading.Lock` and an in-process queue exist per worker process, so they serialize only within one process)
- support: S-r1-practice-07/P1 · rung 1 · fit direct · upstream self
- support: S-r1-practice-07/P2 · rung 1 · fit direct · upstream self
- scope: FastAPI deployment concepts documentation as accessed 2026-10-23; the consequence for a lock is the writer's inference, not stated by the source
- confidence: high · flags: none
- conflicts: none

### C-r1-practice-11
- claim: The transactional outbox pattern addresses the "dual write" problem, in which one operation must both write to a database and send a message or event to another system, and a failure of one of the two writes can leave the data inconsistent.
- kind: definition
- questions: Q13 · load-bearing: no
- support: S-r1-practice-06/P1 · rung 2 · fit direct · upstream self
- support: S-r1-practice-06/P2 · rung 2 · fit direct · upstream self
- support: S-r1-practice-05/P1 · rung 2 · fit partial · upstream self (states the problem as atomically updating the database and sending a message)
- scope: AWS Prescriptive Guidance and microservices.io as accessed 2026-10-23
- confidence: high · flags: none
- conflicts: none

### C-r1-practice-12
- claim: Chris Richardson's description of the transactional outbox states that a service that sends a message after committing its transaction has no guarantee it will not crash before sending the message.
- kind: fact
- questions: Q13 · load-bearing: no
- support: S-r1-practice-05/P2 · rung 2 · fit direct · upstream self
- scope: microservices.io pattern page, accessed 2026-10-23
- confidence: high · flags: none
- conflicts: none

### C-r1-practice-13
- claim: In the transactional outbox pattern, the service stores the outgoing message in the same database transaction that updates the business data, and a separate process (the message relay) later sends the stored messages to the message broker.
- kind: definition
- questions: Q13 · load-bearing: no
- support: S-r1-practice-05/P3 · rung 2 · fit direct · upstream self
- support: S-r1-practice-06/P3 · rung 2 · fit direct · upstream self
- scope: microservices.io and AWS Prescriptive Guidance as accessed 2026-10-23
- confidence: high · flags: none
- conflicts: none

### C-r1-practice-14
- claim: Both microservices.io and AWS Prescriptive Guidance state that an outbox relay may send a message more than once (for example after a crash between publishing and recording that it published), so the consumer should be idempotent.
- kind: behaviour
- questions: Q13 · load-bearing: no
- support: S-r1-practice-05/P5 · rung 2 · fit direct · upstream self
- support: S-r1-practice-06/P4 · rung 2 · fit direct · upstream self
- scope: transactional outbox pattern as described by the two sources, accessed 2026-10-23
- confidence: high · flags: none
- conflicts: none

### C-r1-practice-15
- claim: Microsoft's Azure Architecture Center guidance describes background jobs as work the application starts while it continues serving interactive requests, which reduces interactive response times, and says such jobs run asynchronously in a separate process, or even a separate location, from the process that invoked them.
- kind: interpretation
- questions: Q13 · load-bearing: no
- support: S-r1-practice-09/P2 · rung 2 · fit direct · upstream self
- support: S-r1-practice-09/P3 · rung 2 · fit direct · upstream self
- scope: Azure Architecture Center "Background jobs" as accessed 2026-10-23; attributed to Microsoft's guidance
- confidence: high · flags: none
- conflicts: none

### C-r1-practice-16
- claim: Microsoft's Azure Architecture Center guidance states that queues deliver messages at least once, that infrastructure restarts can replay partially completed work, and that message-driven background tasks must therefore be idempotent.
- kind: behaviour
- questions: Q13 · load-bearing: no
- support: S-r1-practice-09/P1 · rung 2 · fit direct · upstream self
- support: S-r1-practice-09/P4 · rung 2 · fit direct · upstream self
- scope: Azure Architecture Center "Background jobs" as accessed 2026-10-23
- confidence: high · flags: none
- conflicts: none

## Conflicts
- none found. Note for the lead: microservices.io (S-r1-practice-05/P4) says outbox messages are "guaranteed to be sent if and only if the database transaction commits", while the same page (P5) and AWS (S-r1-practice-06/P4) say a message may be sent more than once; these are compatible (at-least-once once committed), not a conflict.

## Speculation and flags
- C-r1-practice-09: vendor-about-itself (FastAPI docs recommending when to use its own feature vs Celery); keep attributed.
- S-r1-practice-05: author has a commercial stake (consulting; Eventuate framework "implements this pattern"); used only for the pattern's definition.
- S-r1-practice-06, S-r1-practice-09: vendor architecture guidance (AWS, Microsoft); passages used are vendor-neutral design statements; service-specific advice (SQS, Service Bus) was not used.
- Q12 implications (not a source claim): that a `threading.Lock` is needed because sync endpoints run concurrently in pool threads (C-r1-practice-01, -03), and that it protects only one worker process (C-r1-practice-10), are inferences for the writer to make explicitly, not statements any source makes about this design.
- Starlette background tasks run inside the same request cycle after the body is sent (C-r1-practice-06); that an in-process background task or queue is lost if the process dies is stated by no source opened here; that failure mode belongs to the criticism angle.

## Unused leads
- https://learn.microsoft.com/en-us/azure/well-architected/reliability/background-jobs — Well-Architected reliability checklist for background jobs.
- https://github.com/aws-samples/transactional-outbox-pattern — AWS sample implementation of the outbox (named on S-r1-practice-06).
- https://github.com/Kludex/starlette/blob/1a3a401c0d33920b7c8b1541fb89784976a41a96/starlette/background.py — would confirm in code that sync background tasks go through run_in_threadpool.

## Queries
- (direct fetch) https://fastapi.tiangolo.com/async/ → useful
- (direct fetch) https://fastapi.tiangolo.com/tutorial/background-tasks/ → useful
- (direct fetch) https://www.starlette.io/background/ and /threadpool/ → host does not resolve; https://starlette.dev/ used instead → useful
- (direct fetch) https://microservices.io/patterns/data/transactional-outbox.html → useful
- (direct fetch) AWS Prescriptive Guidance transactional outbox → useful
- (direct fetch) https://fastapi.tiangolo.com/deployment/concepts/ → useful
- (GitHub API) Kludex/starlette commits/main → useful (pinned commit)
- "Azure architecture background jobs guidance idempotent at least once" → useful (led to the Azure Architecture Center page)
