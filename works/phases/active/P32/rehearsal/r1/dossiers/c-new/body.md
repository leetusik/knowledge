A publish to this knowledge base is one HTTP request, `POST /api/documents`, and it ends with a `201 Created`. Between those two moments the server checks the request, writes a file, records a database row, makes a git commit, and queues a push to GitHub that it never waits for. This chapter follows that path through `server/main.py` at commit `9978d84`, in the order the code runs it. By the end you should be able to trace a publish yourself, say exactly why the 201 does not wait on the network (and where that promise stops), and know which invariants a change to the write path must keep.

## Background {#background}

> [!SKIP] Skip this if you know how FastAPI runs a plain `def` endpoint
> FastAPI runs a path operation declared with plain `def` (not `async def`) in an external threadpool and awaits it, because calling it directly on the event loop would block the server ([FastAPI docs](#s-r1-practice-01) — fastapi.tiangolo.com). Starlette, underneath, uses `anyio.to_thread.run_sync`, with a default pool of 40 tokens shared with sync dependencies ([Starlette docs](#s-r1-practice-04) — starlette.dev). So two sync requests can run at the same time on two threads. And separate worker processes of one API do not share memory ([FastAPI deployment docs](#s-r1-practice-07) — fastapi.tiangolo.com).

The knowledge base stores its documents as Markdown files under `docs/`, in a git repository. The project treats those files on disk as the canonical store; the SQLite database is a disposable projection that a reindex rebuilds from the files, and the API runs a reindex on boot by default.

The write endpoint, `create_document`, is a sync `def` handler. That matters, because of what the previous callout says: concurrent publishes arrive on different threads of one process. The project's answer is a single process-wide lock, declared just above the push task:

```python title="server/main.py" #write-lock
# → DB → git). Load-bearing invariant: the API runs a SINGLE uvicorn worker, so an
# in-process lock is sufficient; never scale to multiple workers. WAL gives reads
# concurrency regardless.
WRITE_LOCK = threading.Lock()
```

> [!DEFINITION]- Terms this chapter uses
> **Format**: a document is `md`, `html` or `native` (the knowledge base's own Markdown with typed blocks). **Book chapter**: a document placed in a book; the book's **manifest** file lists its chapters. **Version archive**: where the body a new version replaces is copied, so older versions stay readable. **Tenant mode**: the multi-account deployment (`DATABASE_URL` set); without it the API runs in **legacy mode**, one shared knowledge base. **Public root**: the `docs/` tree of the public tenant, the only one the server commits to git.

Hold on to that comment. A `threading.Lock` serializes threads inside one process only, so the whole design rests on there being exactly one uvicorn worker.

## Intuition {#intuition}

> [!IMPORTANT] The key idea
> A publish is split into a **local half** that the caller waits for (validate, then under the lock: write the file, commit the database row, make the git commit) and a **network half** that the caller never waits for (the push to GitHub and the Gemini embedding), which is handed to a background worker as a queue append.

It was not always so. Before phase P24, the handler ran `git fetch`, `git rebase` and `git push` inside the lock and in the request, with no subprocess timeout, and the embedding call also ran before the response. P24 began from an operator report: a client had uploaded documents successfully, yet reported a disconnect. The cause the decomposition recorded: the `/explain` skill posted with `curl --max-time 5`, and the 5 seconds were spent on network stages that ran after the document was already saved but before the 201. The client timed out on a write that had landed.

The fix did not make the push faster; it moved it off the response path. The commit stays in the request, because it is local and fast and keeps `committed` and `commit_sha` truthful; the push and the embed move behind the response; every git subprocess gets a timeout. Commit `b769236` made that change, and it changed the response too: `pushed` became a constant false, `push_error` was removed, and a new field, `push_pending`, was added.

Here is the whole flow, with the line between the halves:

```diagram #publish-flow
kind: flow
title: "The publish path: what the caller waits for, and what it does not"
direction: down
nodes:
  - {id: req, label: "POST /api/documents", shape: pill}
  - {id: check, label: "_check_document", sub: "validate; no lock, no writes"}
  - {id: lock, label: "with WRITE_LOCK", sub: "manifest, archive, assets, file, Recent, DB row, git commit", tone: accent}
  - {id: submit, label: "publish.submit", sub: "queue appends, outside the lock"}
  - {id: resp, label: "201 Created", shape: pill, tone: ok}
  - {id: worker, label: "kb-publish worker", sub: "one thread, FIFO", tone: muted}
  - {id: push, label: "push task", sub: "re-takes WRITE_LOCK; fetch, rebase, push", tone: warn}
  - {id: embed, label: "embed task", sub: "own SQLite connection, no lock", tone: muted}
groups:
  - {id: waited, label: "The caller waits for this", nodes: [check, lock, submit]}
  - {id: after, label: "Runs on the worker; the caller never waits for it", nodes: [worker, push, embed]}
edges:
  - {from: req, to: check}
  - {from: check, to: lock, label: "passed"}
  - {from: lock, to: submit}
  - {from: submit, to: resp}
  - {from: submit, to: worker, label: "queued", style: dashed}
  - {from: worker, to: push}
  - {from: worker, to: embed}
```

## Code {#code}

### Validation, before the lock {#validation}

Authentication comes first, as a FastAPI dependency, `resolve_api_write`. In legacy mode (no `DATABASE_URL`) it lets every request through when `KB_API_TOKEN` is unset, and otherwise demands the exact header `Authorization: Bearer <token>`, answering 401 if it is missing. In tenant mode it resolves the bearer to a tenant, and a missing or unknown bearer is a 401.

The handler's first statement is `_check_document(body, ctx, conn)`, and only after it returns does the handler take `WRITE_LOCK`. Its docstring makes a strong promise: it is the one validation path shared by `POST /api/documents` and the dry run `POST /api/documents/check`, it raises the same errors in the same order, and it "only reads": no lock, no file, no row, no commit. It raises in this order:

1. the field validators (project, tags, date, slug, and so on), each a 422 whose detail is a string;
2. for `md` and `html` only, a 422 with a list of content violations (body size, assets);
3. for a book chapter, the manifest checks: a 409 for a malformed manifest, 422s for an uncreatable book or a conflicting `rel_path`;
4. the version-target checks: a 422 for changing format or project, a 409 for an occupied html-to-native migration target;
5. a 409 when a file or row already exists at the computed path, with a hint to re-publish with `"new_version": true`;
6. a 409 when another document already uses the same file stem;
7. for `native`, one 422 whose detail lists the violations found, by line.

A request that fails several checks gets only the first stage's error. Images are validated in memory in this stage too; their own docstring says "nothing touches disk, so it runs before the write lock".

Is anything written when validation refuses? No document file, asset, manifest, archive or commit. Two narrow exceptions exist: in tenant mode the dependency `ensure_registry_project` may get-or-create a Postgres `projects` row before the handler runs (its docstring says the row "may be created even when the handler then 409s"), and every request's database connection opens and initializes the SQLite file.

The dry run shows the design's payoff. `check_document` takes the same body and the same auth, calls `_check_document`, and for a chapter also builds the manifest with `_place_variant`, all without the lock. It answers 200 with `ok`, the `rel_path` and the version a publish would get. Because both endpoints call one function, they cannot drift.

### Under the lock {#under-the-lock}

Inside `with WRITE_LOCK:` the handler runs these steps, in this order:

1. For a book chapter, settle the manifest with `_place_variant`, re-read under the lock. A conflict here is still a 409 or 422, and it fires before any file is touched.
2. On an html-to-native migration, re-key the database row to the new path.
3. If a previous version's file exists on disk, copy it to the version archive and upsert its version row.
4. Store the images (`store_assets`).
5. Write the document file.
6. For the public root only, create the project landing page if it is missing and update the Recent list in `docs/index.md`.
7. `db.upsert_document`, which commits the SQLite transaction at once.
8. For a chapter, write the manifest and rebuild the book's rows.
9. The scoped git commit.

The commit runs only when the request's `commit` field is true, `KB_GIT_COMMIT` is on (it defaults to true), and the caller writes to the public root. `gitops.add` stages an explicit list of paths (the document, `docs/index.md`, a landing page this write created, the archive, the manifest) and drops any path inside `.assets`, so images are never committed. The message is `docs(<project>): add <slug>` for version 1 and `docs(<project>): update <slug> to v<n>` after that, with a `Co-Authored-By:` trailer added when the request supplies one.

If staging or committing raises a `GitError`, the handler records `commit_error` and leaves `committed` false. The file, the row and the index stay in place: nothing is rolled back, and the request still returns 201. This rule dates from the first write path, commit `207f2ff`.

Every git call made through gitops' `_run` helper is capped by `KB_GIT_TIMEOUT_S`, which defaults to 60 seconds (an unparseable or non-positive value falls back to 60), and a timeout raises `GitError` like any failure.

### Queueing the push {#queueing}

After the lock is released, the handler hands its network work to the publish worker. This is the code that makes the 201 fast:

```python title="server/main.py" #after-response
    pushed = False
    push_pending = False
    if committed and config.git_push_enabled():
        push_pending = True
        publish.submit(f"push {rel}", _push_task(config.kb_root()))
    if config.embeddings_enabled():
        publish.submit(
            f"embed {rel}",
            _embed_task(
                db_file=config.db_path(),
                doc_id=doc_id,
                title=body.title,
                markdown=stored_markdown,
            ),
        )
```

A push is queued only when the commit succeeded and `KB_GIT_PUSH` is on; it defaults to off, and only the hosted deployment opts in. `publish.submit` lazily starts one daemon thread named `kb-publish`, appends the task to a FIFO `queue.Queue` and returns at once. The worker takes tasks one at a time, and logs a failure without dying.

The push task itself re-takes the lock:

```python title="server/main.py" #push-task
    def _task() -> None:
        with WRITE_LOCK:
            gitops.push(root=root)
```

`gitops.push` runs `git fetch origin main`, then `git rebase origin/main`, then `git push origin HEAD:main`, never with `--force`. The order follows git's own advice: by default git refuses a push that is not a fast-forward, and the documented remedy is to rebase the local change onto the updated remote tip and push again ([git-push](#s-r1-criticism-01) — git-scm.com). If the rebase hits a conflict, git stops at the first problematic commit, and `git rebase --abort` resets `HEAD` to the original branch ([git-rebase](#s-r1-criticism-08) — git-scm.com). If any step fails or times out, it runs `git rebase --abort` (ignoring that call's own failure) and re-raises, so the local commit stays. A failed push never reaches the caller: the worker prints a `[kb-api] publish: push <rel> FAILED: <error>` line, with the traceback on stderr, to the container log.

The embed task opens its own SQLite connection, takes no lock, embeds the title and the stored text, and upserts the embedding row.

```diagram #publish-sequence
kind: sequence
title: "One publish, before and after the 201"
actors:
  - {id: client, label: Client}
  - {id: handler, label: create_document}
  - {id: worker, label: kb-publish worker}
  - {id: origin, label: GitHub origin}
steps:
  - {from: client, to: handler, label: "POST /api/documents"}
  - {from: handler, to: handler, label: "validate, then under WRITE_LOCK: file, row, commit"}
  - {from: handler, to: worker, label: "submit push, submit embed", style: dashed}
  - {from: handler, to: client, label: "201, pushed false, push_pending true"}
  - {from: worker, to: worker, label: "take WRITE_LOCK (may start before the 201 is sent)"}
  - {from: worker, to: origin, label: "fetch, rebase, push HEAD:main"}
```

Why a hand-rolled worker and not FastAPI's `BackgroundTasks`, which also run after the response ([FastAPI docs](#s-r1-practice-02) — fastapi.tiangolo.com)? The publish module's docstring gives the reasons: the request thread never waits, pushes stay serialized in submit order, and "the response never waits" becomes a property of the code rather than of the ASGI middleware ordering. The P24.S1 result adds that, with the `BaseHTTPMiddleware` metering in the stack, a background task could run before the body had reached the client. It also names the test that holds the line: a push replaced by one that blocks forever, and a POST that must still return 201 in under a second.

### What the 201 says {#response}

The response always carries `id`, `rel_path`, `url`, `title`, `version`, `previous_version`, `committed`, `commit_sha`, `pushed` and `push_pending`, among others, and `commit_error` only when the commit failed. A native publish adds `assigned_ids`, `warnings` and `migrated_from`.

Two fields surprise newcomers. `pushed` is set to `False` and never reassigned, so it is false on every path; it keeps its documented meaning, "saved; publishes on the next successful push". Whether a push is on its way is `push_pending`, and `push_error` no longer appears in any response. And `commit_sha` is the local commit made before the rebase, which the background rebase may rewrite. The project's rule for every client follows: `pushed: false` is never a failure and never a reason to retry, and a lost response is checked by reading the document back, not by posting again.

## The invariants, and their edges {#invariants}

The project's docs state the two rules a change must keep: a publish task is always submitted from outside `WRITE_LOCK`, because the worker takes the same lock; and there is no network I/O before a write's response, because a new pre-response network call would quietly bring back the timeout bug P24 fixed. Around them sit the older rules: one uvicorn worker, a failed commit never rolls back the save, and every git subprocess is bounded. That bound exists, in the words of the commit that added it, because the push holds `WRITE_LOCK` on the worker, so an unbounded git (a hanging SSH connection) would block every later write.

Read closely, the code also shows where these rules end.

> [!WARNING] "Never waits on the network" means no GitHub or Gemini round-trip in the request
> In tenant mode, the async dependency `ensure_registry_project` awaits Postgres before the handler, and the P24 notes record that the usage-metering middleware's Postgres write happens after the handler returns and before the body reaches the client, a local hop they put at milliseconds.

**A publish can wait behind a push.** Because the push task holds `WRITE_LOCK` around fetch, rebase and push, a new publish arriving meanwhile blocks at `with WRITE_LOCK:` until the push lets go. Each git step is capped at `KB_GIT_TIMEOUT_S`, but no source states a bound for a whole push, or for how long a waiting write may sit. The project's docs disagree with themselves here: `architecture.md` says "everything the caller waits for is local disk + SQLite", while the same document, and the P24.S1 result, say writers and the publish worker are serialized on the lock. The code sides with the second.

**A dropped push is caught up, but only by the next push.** A push carries `HEAD`, and `git push <remote> <src>:<dst>` updates the remote ref to the object `src` names ([git-push](#s-r1-criticism-01) — git-scm.com), so the next successful push publishes everything accumulated. Nothing retries a failed push and nothing pushes at boot: the reindex never runs git. The queue lives in memory: a graceful shutdown drains it for up to 10 seconds, and the operations doc says a container restart drops a not-yet-run push but never a save. A killed process cannot run a handler at all, since SIGKILL cannot be caught ([Python signal](#s-r2-criticism-05) — docs.python.org) and `atexit` handlers do not run when the process is killed by a signal Python does not handle ([Python atexit](#s-r2-criticism-06) — docs.python.org). The operator's check is `git rev-list --count origin/main..HEAD`, which counts the commits reachable from `HEAD` but not from `origin/main` ([git-rev-list](#s-r2-criticism-02) — git-scm.com); the worker's log lines are the only other signal, and `/healthz` carries no publish state. If `rebase --abort` itself fails, the failure is ignored and nothing checks the repository afterwards, and no doc covers that recovery.

**Validation is not re-checked under the lock.** Only the book manifest is re-read inside `WRITE_LOCK`. The "already exists" 409, the stem 409 and the version number are all computed before the lock and trusted afterwards, and the database will not object, since apart from its integer key the only uniqueness constraint on `documents` is `UNIQUE(tenant_id, rel_path)`, which `upsert_document` resolves by updating in place. Traced through the code (not observed in a run), this permits two simultaneous creates of the same path to both pass validation, the second overwriting the first, still at version 1 and without a 409; and two simultaneous new versions of one document to both compute version N+1, the second copying the first's new body over the archived version N. Nothing in the code or the notes mentions this window. The window is old: commit `207f2ff` already checked before taking the lock, and P31.S1 moved that code verbatim.

**The locked section is not a transaction.** It has no `try`/`finally` and no rollback; its only handlers are the defensive 409 before any write and the `GitError` catch. An exception partway through leaves the committed database steps and the written files in place. The reindex rebuilds the database from disk but never touches git, and leftovers can ride into a later commit, because every write stages `docs/index.md` and `git commit -m` commits whatever is staged.

> [!NOTE] One accepted limit
> A P24 review note records the Gemini embed on the publish worker as unbounded: this repository sets no client timeout on it, so a stalled embed blocks the single FIFO queue, and every push behind it, until a restart. The note calls that the availability of the off-box backup, not correctness, since writes stay durable.

## Best practices & next steps {#best-practices}

**Where it aligns.** Doing the slow side effect after the response matches what the framework and cloud docs describe: the FastAPI docs describe background tasks as run after returning a response, for operations the client does not need to wait on ([FastAPI docs](#s-r1-practice-02) — fastapi.tiangolo.com), and Microsoft's guidance describes background jobs as work an application starts while it keeps serving interactive requests, which reduces interactive response times ([Azure Architecture Center](#s-r1-practice-09) — learn.microsoft.com). Committing locally first and publishing later also echoes the transactional outbox, where a service stores the outgoing message in the same transaction as its data and a separate relay sends it later ([microservices.io](#s-r1-practice-05) — microservices.io; [AWS Prescriptive Guidance](#s-r1-practice-06) — docs.aws.amazon.com). Here the git commit plays the outbox, and the next push is the relay that catches up.

**Where it deliberately diverges.** The worker is in-process and in memory, not a durable queue. The FastAPI docs themselves say heavy background work that need not run in the same process may suit bigger tools like Celery, while `BackgroundTasks` suits small tasks that need the app's own objects ([FastAPI docs](#s-r1-practice-02) — fastapi.tiangolo.com). The project's reasoning is that the durable record is the git commit, not the queue: its operations doc says a restart drops a not-yet-run push but never a save, and the next successful push carries the commit anyway. Both outbox sources warn that a relay may send a message more than once, so the receiving side should be idempotent ([microservices.io](#s-r1-practice-05); [AWS](#s-r1-practice-06)), and Microsoft says the same of queued background tasks ([Azure](#s-r1-practice-09)).

**Next steps when you change the write path:**

1. Keep every new network call out of the request and submit it from outside the lock. The test that a hanging push still yields a fast 201 is the guard; extend it for any new task.
2. If you need a check to hold at write time (an "already exists" or a version number), make it again inside `WRITE_LOCK`, or the race above stays open.
3. Treat the single uvicorn worker as a hard constraint: a `threading.Lock` and an in-memory queue exist per process ([FastAPI deployment docs](#s-r1-practice-07) — fastapi.tiangolo.com).
4. When you touch publish health, remember that the only signals are the container log and `git rev-list --count origin/main..HEAD`.

## Quiz {#quiz-section}

```quiz #quiz
title: Check yourself
items:
  - id: q-order
    type: choice
    prompt: "A publish fails with a 409 because a document already exists at its path. Which of these did the server do before refusing?"
    options:
      - {id: a, text: "Wrote the file, then rolled it back"}
      - {id: b, text: "Took WRITE_LOCK and read the database"}
      - {id: c, text: "Ran the checks in `_check_document`, without the lock and without writing a document file"}
      - {id: d, text: "Made a git commit and reverted it"}
    answer: [c]
    explain: "`_check_document` runs before `with WRITE_LOCK:` and only reads; the exists 409 is raised there, so no file, row or commit was made."
  - id: q-pushed
    type: choice
    prompt: "A client gets a 201 with `pushed: false` and `push_pending: true`. What should it do?"
    options:
      - {id: a, text: "Retry the POST, because the push failed"}
      - {id: b, text: "Nothing: the document is saved and committed, and a push is queued"}
      - {id: c, text: "Call `/api/documents/check` to see why the push failed"}
    answer: [b]
    explain: "`pushed` is false on every path since P24; `push_pending: true` means a push was queued. The project's rule is never to retry on `pushed: false`."
  - id: q-outside
    type: recall
    prompt: "Why must `publish.submit` for the push be called outside `WRITE_LOCK`?"
    answer: "Because the push task re-takes `WRITE_LOCK` itself; the project's docs require every publish task to be submitted from outside the locked section, and the code's comment gives the lock's non-reentrancy as the reason."
  - id: q-wait
    type: choice
    prompt: "The background worker is in the middle of a slow `git fetch` for an earlier publish. A new publish arrives. What happens to it?"
    options:
      - {id: a, text: "It returns 201 at once, because pushes run after the response"}
      - {id: b, text: "It blocks at `with WRITE_LOCK:` until the push releases the lock, then completes"}
      - {id: c, text: "It is rejected with a 409"}
    answer: [b]
    explain: "The push task holds `WRITE_LOCK` around fetch, rebase and push, and the new publish needs the same lock for its local write, so it waits. The 201 never waits on its own push, but it can wait on another's."
  - id: q-crash
    type: cloze
    text: "If the API container restarts before a queued push runs, the push is {{dropped|lost}}, but the document is not: it publishes with the {{next successful push|next push}}."
    explain: "The queue lives in memory; the commit is on disk, and the next push of `HEAD` carries every accumulated commit."
```

## Sources {#sources-heading}

```sources #sources
items:
  - id: s-r1-practice-01
    title: "Concurrency and async / await"
    url: https://fastapi.tiangolo.com/async/
    publisher: FastAPI documentation
    accessed: 2026-10-23
  - id: s-r1-practice-02
    title: Background Tasks
    url: https://fastapi.tiangolo.com/tutorial/background-tasks/
    publisher: FastAPI documentation
    accessed: 2026-10-23
  - id: s-r1-practice-04
    title: "Thread Pool - Starlette"
    url: https://starlette.dev/threadpool/
    publisher: Starlette documentation
    accessed: 2026-10-23
  - id: s-r1-practice-05
    title: "Pattern: Transactional outbox"
    url: https://microservices.io/patterns/data/transactional-outbox.html
    publisher: microservices.io (Chris Richardson)
    accessed: 2026-10-23
  - id: s-r1-practice-06
    title: "Transactional outbox pattern - AWS Prescriptive Guidance"
    url: https://docs.aws.amazon.com/prescriptive-guidance/latest/cloud-design-patterns/transactional-outbox.html
    publisher: Amazon Web Services
    accessed: 2026-10-23
  - id: s-r1-practice-07
    title: Deployments Concepts
    url: https://fastapi.tiangolo.com/deployment/concepts/
    publisher: FastAPI documentation
    accessed: 2026-10-23
  - id: s-r1-practice-09
    title: Background jobs
    url: https://learn.microsoft.com/en-us/azure/architecture/best-practices/background-jobs
    publisher: Microsoft Azure Architecture Center
    accessed: 2026-10-23
  - id: s-r1-criticism-08
    title: "git-rebase Documentation"
    url: https://git-scm.com/docs/git-rebase
    publisher: git-scm.com
    accessed: 2026-10-23
  - id: s-r1-criticism-01
    title: "git-push Documentation"
    url: https://git-scm.com/docs/git-push
    publisher: git-scm.com
    accessed: 2026-10-23
  - id: s-r2-criticism-02
    title: "git-rev-list Documentation"
    url: https://git-scm.com/docs/git-rev-list
    publisher: git-scm.com
    accessed: 2026-10-23
  - id: s-r2-criticism-05
    title: "signal — Set handlers for asynchronous events"
    url: https://docs.python.org/3/library/signal.html
    publisher: Python Software Foundation
    accessed: 2026-10-23
  - id: s-r2-criticism-06
    title: "atexit — Exit handlers"
    url: https://docs.python.org/3/library/atexit.html
    publisher: Python Software Foundation
    accessed: 2026-10-23
```
