---
title: "Publishing a document: the write path from validation to git push"
date: 2026-10-23
format: native
syntax: 1
lang: en
summary: "How POST /api/documents validates, writes, commits and then pushes in the background, so the 201 never waits on the network."
tags:
  - fastapi
  - git
  - write-path
  - background-tasks
source:
  project: knowledge
  repo: knowledge
---

## Background {#background}

This knowledge base keeps its documents in two places. The Markdown files under `docs/` in a git repository are the source of truth. A SQLite database indexes those files for listing, full-text search and embeddings. The code calls the files **canonical** and the database **disposable**: on boot, `server/main.py` runs a full reindex that rebuilds the database from `docs/`, so a database that drifts from the files fixes itself on the next start.

Publishing a document means `POST /api/documents`. One handler, `create_document` in `server/main.py`, owns the whole write. It validates the request, writes the file, updates the index page and the database, makes a **scoped git commit**, and then, without waiting, hands the push to `origin/main` to a background worker. This chapter follows one request through that path. Its goal is to make three of the handler's properties feel inevitable rather than arbitrary: the 201 never waits on the network, a failed commit never undoes a save, and only one writer ever touches the work tree at a time.

> [!SKIP] Skip this if you know how FastAPI runs a plain `def` handler
> FastAPI accepts both `async def` and plain `def` path operations. A plain `def` is "run in an external threadpool that is then awaited" ([FastAPI docs](#src-fastapi-async) — fastapi.tiangolo.com), so blocking work inside it, such as file I/O, SQLite or a `subprocess.run` of git, does not freeze the event loop. `create_document` is a plain `def`. That is why it can call git synchronously, and why it uses a `threading.Lock` (not an asyncio lock) to keep writers apart.

> [!DEFINITION]- Primer: the words this chapter uses
> - **rel_path**: a document's path relative to the docs root, such as `knowledge/2026-10-23-publish-write-path.md`. It is the document's identity on disk.
> - **public root**: tenant #1's `docs/` tree, the only tree that is committed and pushed. Other tenants write under a gitignored `tenants/<uuid>/` tree.
> - **scoped commit**: a commit that stages exactly the paths this write touched (`git add -- <paths>`), never `git add -A`.
> - **publish worker**: one daemon thread with a FIFO queue, in `server/publish.py`, that runs the push and the embedding after the response.

## Intuition {#intuition}

Split the work by one question: **does the caller need the result of this step in the response?**

The caller needs to know that the document was accepted and saved, at which `rel_path`, as which version, and whether it was committed. All of that comes from local work: CPU for validation, a disk write, a SQLite transaction, and `git commit`, which never touches the network. The caller does not need the result of `git push` (two SSH round-trips to GitHub: a fetch, then a push) or of the Gemini embedding call. Those are publishing side effects. If they fail, the document is still saved, and they can be retried later.

So the handler does everything local before it answers and queues everything networked for afterwards. Here is the timing for one publish. The numbers are made up for illustration, not measured:

```diagram #timing
kind: timeline
title: One publish, request thread versus publish worker (illustrative milliseconds)
axis: {unit: ms, from: 0, to: 2600, ticks: [0, 500, 1000, 1500, 2000, 2500]}
lanes:
  - label: Request thread
    bars:
      - {from: 0, to: 40, label: validate, tone: muted}
      - {from: 40, to: 120, label: "locked: file, DB, commit", tone: accent}
      - {from: 120, to: 130, label: enqueue, tone: ok}
    marks:
      - {at: 130, label: 201 sent}
  - label: Publish worker
    bars:
      - {from: 130, to: 1900, label: "push: fetch, rebase, push", tone: warn}
      - {from: 1900, to: 2500, label: embed, tone: series-2}
```

Before P24, both of those network stages ran before the 201. The docstring of `server/publish.py` gives the result: "a client with a short deadline (`/explain` posts with `curl --max-time 5`) saw a transport failure for a write that had already landed." The client thought the publish had failed, even though the document was on disk and committed. A retry would then collide (409) or create an unwanted extra version. Moving the network work behind the response removes that whole class of false failure.

> [!IMPORTANT] The key idea
> Everything before the 201 is **local and durable**: file, database row, local commit. Everything after it is **networked and best-effort**: push, embedding. A failure on the far side of the line never changes a document that has already been saved.

The second idea is about **who may touch the work tree**. A rebase rewrites files in the work tree. A write creates files in it. If both ran at once, git could see a half-written file, or a write could land in the middle of a rebase. So both take the same process-wide `WRITE_LOCK`, and the background push takes it again when it runs. That lock is the reason for most of the ordering rules in the code below.

```diagram #write-sequence
kind: sequence
title: A publish, from request to remote
actors:
  - {id: client, label: Client}
  - {id: handler, label: create_document}
  - {id: lock, label: WRITE_LOCK section}
  - {id: worker, label: Publish worker}
  - {id: origin, label: origin/main}
steps:
  - {from: client, to: handler, label: POST /api/documents}
  - {from: handler, to: handler, label: _check_document, note: "422 / 409 raised here, nothing written"}
  - {from: handler, to: lock, label: "archive, assets, file, index, DB, manifest, commit"}
  - {from: lock, to: handler, label: "committed, commit_sha"}
  - {from: handler, to: worker, label: "submit push + embed (outside the lock)"}
  - {from: handler, to: client, label: "201, pushed false, push_pending true"}
  - {from: worker, to: worker, label: retake WRITE_LOCK}
  - {from: worker, to: origin, label: "fetch, rebase, push (never --force)"}
```

## Code {#code}

The handler is about 440 lines, from `server/main.py:1302` to its `return`, and is split into numbered steps whose comments are worth reading in full. Below, the steps are taken in order.

### Step 0: the signature {#step-signature}

```python title="server/main.py" #create-document-signature
@app.post("/api/documents", status_code=201)
def create_document(
    body: DocumentIn,
    request: Request,
    ctx: ApiAuthContext = Depends(resolve_api_write),
    registry_project_id: UUID | None = Depends(ensure_registry_project),
    org_slug: str | None = Depends(resolve_org_slug),
    conn=Depends(get_conn),
):
```

Four things have already happened by the time the body runs. Pydantic has parsed the request into `DocumentIn`: a wrong `format` value, for instance, gets an automatic 422 from its `Literal["md", "html", "native"]`. `resolve_api_write` has authenticated the bearer token and decided which tenant this caller is, carried in `ctx`. `ensure_registry_project` has got-or-created the project in the accounts registry. `get_conn` has opened a per-request SQLite connection, which is closed after the response. Note again the plain `def`: FastAPI runs this in its threadpool.

### Steps 1–2c: validate everything, write nothing {#step-validate}

The first line delegates all validation:

```python title="server/main.py" #check-call
    # 1-2c. Validate (P31.S1: the one path the dry run shares, `_check_document`).
    checked = _check_document(body, ctx, conn)
```

`_check_document` (at `server/main.py:938`) is shared with `POST /api/documents/check`, the dry run. Its docstring states the contract: it raises "the publish's own `HTTPException`s ... with the same bodies, in the same order", and it "only reads ... no lock, no file, no row, no commit". Because the publish and the dry run share one function, they cannot drift apart. In order, it does this:

1. **Field validators**: `validate_project`, `validate_tags`, `validate_date` (default today), `validate_slug` (default `slugify(title)`), the book placement, `lang`, `subject`, `translated_from`. Any `ConventionError` becomes a **422 with a string detail**.
2. **Content violations, collected into one list**: the body size limit and the images (`assets_mod.prepare_assets` decodes and checks them here, before the lock, "the decode is CPU work"). Only a native chapter may carry images.
3. **Where it goes**: `rel = documents_mod.rel_path(project, date, slug, fmt=body.format)`, and `root = _tenant_root(ctx)`, which is the public `docs/` tree or the tenant's namespaced one.
4. **Which document this replaces, if any**: a chapter whose `(project, book, key, lang)` is already bound is that document's next version. Otherwise `_resolve_version_target` honours `new_version`. A resolved target keeps its own `rel_path`, date and slug, so the document's identity never moves. Changing the project, or the format other than `md`→`native` or `html`→`native`, is a 422.
5. **Collisions**: a plain create onto an existing path, on disk or in the database, is a **409** carrying a `hint` to re-publish with `new_version`. A second 409 guards the file *stem*: one document per `<project>/<date>-<slug>` across extensions.
6. **Version numbers**: `doc_version = prev_version + 1`, or `1` for a fresh document.
7. **Native parse**: the server composes the file (its own header plus your body), parses it, resolves references and checks a translation's ids. Every problem joins **one 422 list** with line numbers mapped back to the body you sent.

Everything that can be refused is refused here, before anything is written. That is the first invariant: **a 4xx leaves no trace**.

### Step 3: the locked critical section {#step-locked}

```python title="server/main.py" #write-lock
# One process-wide lock serializes the whole write critical section (file → index
# → DB → git). Load-bearing invariant: the API runs a SINGLE uvicorn worker, so an
# in-process lock is sufficient; never scale to multiple workers. WAL gives reads
# concurrency regardless.
WRITE_LOCK = threading.Lock()
```

Read that comment twice. A `threading.Lock` only excludes threads in **one process**. With two uvicorn workers there would be two locks, and two writers could interleave their `git add`/`git commit` or race a rebase. The single-worker deployment is part of the design.

Inside `with WRITE_LOCK:` the order is deliberate:

```diagram #locked-steps
kind: flow
title: Inside WRITE_LOCK, in order
direction: down
nodes:
  - {id: manifest, label: Settle the book manifest, sub: "409/422 possible, still nothing written"}
  - {id: archive, label: Archive the replaced body, sub: ".versions/<project>/<stem>/vNNNN"}
  - {id: assets, label: Store images, sub: ".assets/, never committed"}
  - {id: file, label: Write the document file, sub: "docs/<rel_path>"}
  - {id: index, label: Landing page + Recent index, sub: public root only}
  - {id: db, label: DB upsert, sub: "upsert_document commits its transaction"}
  - {id: bind, label: Write manifest + replace_book, sub: placed chapters only}
  - {id: commit, label: "Scoped git add + commit", sub: "failure becomes committed false", tone: accent}
edges:
  - {from: manifest, to: archive}
  - {from: archive, to: assets}
  - {from: assets, to: file}
  - {from: file, to: index}
  - {from: index, to: db}
  - {from: db, to: bind}
  - {from: bind, to: commit}
```

A few of these steps deserve a closer look.

**The manifest comes first.** A book's manifest is re-read *under the lock* (it is "the authoritative copy") and the new binding is computed before any file is touched, "so a binding conflict (409) or a book that cannot be created (422) leaves nothing behind." This is the one refusal that can only be decided under the lock, because a concurrent write might have just bound the same chapter.

**The archive comes before the overwrite.** `archive_document_file` copies the current body to `.versions/` *before* the new file replaces it, and records it with `upsert_document_version`. That is why a version bump never loses the old body.

**The file comes before the row.** The file is written, then `db.upsert_document` inserts or updates the row and calls `conn.commit()` itself. Disk leads and the database follows, which matches "docs/ is canonical": if the process died between the two, the startup reindex would rebuild the row from the file.

Then comes the commit:

```python title="server/main.py" #scoped-commit
        if body.commit and config.git_commit_enabled() and ctx.is_public:
            try:
                staged = [f"docs/{rel}", "docs/index.md"]
                if landing_created:
                    staged.append(f"docs/{project}/index.md")
                if archive_path is not None:
                    staged.append(f"docs/{archive_path}")
                if manifest_rel is not None:
                    staged.append(f"docs/{manifest_rel}")
                gitops.add(staged, root=config.kb_root())
                if migrated_from is not None:
                    gitops.remove([f"docs/{migrated_from}"], root=config.kb_root())
                message = (
                    f"docs({project}): add {slug}"
                    if doc_version == 1
                    else f"docs({project}): update {slug} to v{doc_version}"
                )
                commit_sha = gitops.commit(
                    message,
                    root=config.kb_root(),
                    co_authored_by=body.co_authored_by,
                )
                committed = True
            except gitops.GitError as exc:
                commit_error = exc.stderr or str(exc)
```

Three gates must all be open: the caller did not send `"commit": false`, `KB_GIT_COMMIT` is not off (it defaults to `true` in `server/config.py`), and the caller writes the public root. The staged list is built from **exactly the paths this write touched**. The operator may have their own uncommitted work in the same checkout, and a scoped `add` never sweeps it into a bot commit. `gitops.add` also drops any path inside `.assets/` before git sees it: images live only on the server's disk, and `.assets/` is gitignored as a second guard.

Look at the `except`. A `GitError` (a non-zero exit, a missing identity, "nothing to commit", a timeout) does **not** re-raise. It becomes `committed: false` plus `commit_error` in a 201. The file and the row stay written. The handler's docstring puts it this way: "docs/ stays canonical — a failed commit never rolls back the file/DB." The document is saved. It simply isn't recorded in git yet.

`gitops.commit` adds a second `-m "Co-Authored-By: <value>"` paragraph when `co_authored_by` is sent, and returns `git rev-parse HEAD`. That sha is the response's `commit_sha`.

### Step 4b: queue the network work, outside the lock {#step-queue}

```python title="server/main.py" #queue-publish
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

The indentation matters: this code sits **after** the `with WRITE_LOCK:` block. `publish.submit` only increments a counter and appends to a `queue.Queue`. It "never raises: enqueuing is the only work done on the request thread." The push is queued only if this request actually committed, and only when `KB_GIT_PUSH` is on. That flag defaults to `false`, because "local/plugin deployments never push". So on a laptop install `push_pending` is `false` too, and the commit simply stays local.

`pushed` is hard-coded `false`. Its documented meaning is "saved; publishes on the next successful push", and `push_pending: true` adds "and that push is already queued". A client must treat `pushed: false, push_pending: true` as **success**.

The push task itself is small (docstring omitted):

```python title="server/main.py" #push-task
def _push_task(root: Path):
    def _task() -> None:
        with WRITE_LOCK:
            gitops.push(root=root)

    return _task
```

It **retakes `WRITE_LOCK`**, because the rebase inside `gitops.push` rewrites the work tree. Here is the subtle part: `threading.Lock` is not reentrant. If the handler called `publish.submit` while still holding the lock, nothing would deadlock immediately, since submit only enqueues. But the rule "submit outside the lock" keeps the design simple to reason about. The *real* deadlock is `publish.drain()`: calling it while holding `WRITE_LOCK` would wait forever for a push that is waiting for the same lock. Both docstrings warn against this.

The embed task cannot reuse the request's SQLite connection, which is "closed with the response, and single-thread bound", so it opens its own from `db_file`, which was captured when the task was submitted.

### The worker and the push {#step-worker}

```python title="server/publish.py" #worker-loop
def _loop() -> None:
    global _PENDING, _LAST_ERROR
    while True:
        name, task = _QUEUE.get()
        try:
            task()
        except BaseException as exc:  # noqa: BLE001 — the worker must never die
            _LAST_ERROR = f"{name}: {exc}"
            _log(f"{name} FAILED: {exc}")
            traceback.print_exc()
        finally:
            with _COND:
                _PENDING -= 1
                _COND.notify_all()
```

There is one daemon thread, started lazily on the first submit, and it runs tasks in FIFO order. One worker means pushes are serialized: "never two concurrent rebases". A failing task is logged to stdout (the container log is the operator's view) and kept in `last_error()` for tests. Nothing reaches the client, because the response was sent long before.

```python title="server/gitops.py" #git-push
    try:
        _run(["fetch", remote, branch], root=root)
        _run(["rebase", f"{remote}/{branch}"], root=root)
        _run(["push", remote, f"HEAD:{branch}"], root=root)
    except GitError:
        try:
            subprocess.run(
                ["git", "-C", str(root), "rebase", "--abort"],
                capture_output=True,
                text=True,
                timeout=config.git_timeout_s(),
            )
        except subprocess.TimeoutExpired:
            pass
        raise
```

The push follows a fixed discipline: **fetch, rebase onto the remote, push without force**. If the operator has pushed their own commits to `origin/main` from elsewhere, the rebase replays the server's commit on top of them. On any failure, `rebase --abort` makes sure the repository is never left mid-rebase, and the local commit survives untouched. It is not reset or forced, so it publishes on the next successful push. Because `git push` pushes `HEAD`, the *next* successful push carries every commit an earlier failed push left behind.

Since the rebase can rewrite the commit, the sha that actually lands on `origin/main` may differ from the `commit_sha` in the response. The code comment says so: `commit_sha` is "the LOCAL commit this request made", not necessarily the published head.

Every git subprocess goes through `_run`, which passes `timeout=config.git_timeout_s()` (`KB_GIT_TIMEOUT_S`, default 60 s) to `subprocess.run`. A timeout surfaces as a `GitError` like any other failure. That cap is "load-bearing since P24": the push holds `WRITE_LOCK`, so a hung SSH connection with no timeout would block every later publish in the process.

### Shutdown {#step-shutdown}

The app's `lifespan` gives the queue a bounded chance to finish:

```python title="server/main.py" #shutdown-drain
    if not publish.drain(timeout=10.0):
        print(
            f"[kb-api] shutdown: {publish.pending()} publish task(s) still pending",
            flush=True,
        )
```

Anything still queued after ten seconds is dropped. That is safe for the same reason as everything else: the commit is local and on disk, so the next push publishes it, and embeddings are a cache that the startup reindex refills.

### The test that pins the property {#step-test}

The claim "the 201 never waits on the network" is enforced by a test, `test_response_does_not_wait_for_a_hanging_push` in `tests/test_api_push.py`. It replaces `gitops.push` with a function that blocks on an event, posts a document, and asserts:

```python title="tests/test_api_push.py" #hanging-push-test
    assert r.status_code == 201 and r.json()["push_pending"] is True
    assert elapsed < 1.0, f"201 waited {elapsed:.2f}s on the push"
    assert started.wait(timeout=5.0)  # it really is running, just not in-request
```

If you change the write path, run `tests/test_api_push.py` and `tests/test_api_write.py`. If this test goes red, you have put a network call back in front of the response.

### The invariants, as a checklist {#invariants}

> [!WARNING] Before you change the write path
> 1. **Validation stays in `_check_document`.** New refusals go there, so the dry run reports them too. Nothing in it writes anything.
> 2. **A 4xx leaves no trace.** Anything that can refuse runs before the first file is touched. Under the lock, that means the manifest step comes first.
> 3. **Disk leads, the database follows, git records.** Archive before overwrite, file before row, commit last. A failed commit becomes `committed: false`, never a rollback and never a 5xx.
> 4. **Stage only what you touched.** Add every new path your change writes to `staged`. Never `git add -A`, and never stage `.assets/`.
> 5. **Nothing networked before the 201.** New slow or remote work goes through `publish.submit`, and its result must not be needed in the response.
> 6. **Submit and drain outside `WRITE_LOCK`.** The lock is not reentrant, and the push task retakes it.
> 7. **Every git call is bounded** by `KB_GIT_TIMEOUT_S`. Go through `gitops._run`, never a bare `subprocess.run`.
> 8. **Never `--force`, never reset.** The server only lands its commit on top of the operator's work.
> 9. **One uvicorn worker.** The in-process lock is only correct in a single process.

## Best practices and next steps {#best-practices}

**Where it aligns.** Answering first and doing side-effect work afterwards is the standard shape for work "the client doesn't need to wait for". FastAPI's own `BackgroundTasks` exists to run functions "*after* returning a response" ([FastAPI, Background Tasks](#src-fastapi-bg) — fastapi.tiangolo.com). Refusing to force-push follows git's own default: a branch push allows "only fast-forward updates", and `--force` "can cause the remote repository to lose commits" ([git-push documentation](#src-git-push) — git-scm.com). Rebasing first is what turns a non-fast-forward into a fast-forward. Running blocking git and SQLite calls in a plain `def` handler is what FastAPI recommends for blocking I/O, since such a handler is "run in an external threadpool" ([FastAPI, Concurrency and async](#src-fastapi-async) — fastapi.tiangolo.com).

**Where it deliberately diverges.** The code passes over `BackgroundTasks` and uses its own queue. The `publish.py` docstring explains why: ordering against the `BaseHTTPMiddleware` usage metering "is subtle — a queue makes 'the response never waits' a property of the code, not of the ASGI stack." A single serialized worker also gives "never two concurrent rebases" for free. FastAPI's docs point heavier needs at multi-process tools like Celery with "a message/job queue manager, like RabbitMQ or Redis" ([FastAPI, Background Tasks](#src-fastapi-bg) — fastapi.tiangolo.com). Here that would add infrastructure to solve a problem the design doesn't have: the queue is in memory and can lose tasks on a crash, but the durable record already exists. The local git commit plays the role of an outbox. The transactional-outbox pattern stores each outgoing message in the same transaction as the data, and a relay publishes it later, possibly more than once ([Transactional outbox](#src-outbox) — microservices.io). The unpushed commits on the local branch *are* that outbox, and `git push HEAD` is an idempotent relay.

**Next steps worth considering.**

1. **Make the outbox explicit at startup.** After a crash, unpushed commits wait for the *next* write to trigger a push. Queueing one push on boot when `KB_GIT_PUSH` is on (and the branch is ahead of `origin/main`) would close that gap. This follows the outbox's relay idea ([Transactional outbox](#src-outbox) — microservices.io).
2. **Coalesce pushes.** `publish.py` already names this as "a possible future optimization": since one push publishes every commit, a burst of N writes needs one push, not N.
3. **Surface push health.** A failed background push is visible only in the container log. Exposing `publish.pending()` and `last_error()` on a health endpoint would let the operator see an unpublished backlog without reading logs.

## Quiz {#quiz-section}

```quiz #quiz
title: Check yourself
items:
  - id: q-push-pending
    type: choice
    prompt: "A publish returns **201** with `committed: true`, `pushed: false`, `push_pending: true`. What is the state of the document?"
    options:
      - {id: a, text: "Not saved yet; the client should retry the POST"}
      - {id: b, text: "Saved on disk, indexed, committed locally, and a push to origin/main is queued"}
      - {id: c, text: "Saved, but the push failed and must be retried by hand"}
      - {id: d, text: "Saved only in the database; the file is written by the worker"}
    answer: [b]
    explain: "`pushed` is false on every path since P24; `push_pending: true` means the push was queued after the durable local work. Retrying would collide or create an extra version."
  - id: q-commit-fail
    type: choice
    prompt: "Inside the locked section, `gitops.commit` raises `GitError`. What does the handler do?"
    options:
      - {id: a, text: "Deletes the file and rolls back the DB row, then returns 500"}
      - {id: b, text: "Returns 201 with `committed: false` and `commit_error`, keeping the file and the row"}
      - {id: c, text: Queues the commit on the publish worker}
    answer: [b]
    explain: "docs/ is canonical; a failed commit never rolls back the file or the DB. It is reported, not undone, and no push is queued because `committed` is false."
  - id: q-lock
    type: recall
    prompt: "Why must `publish.submit` and `publish.drain` be called outside `WRITE_LOCK`, and why does the push task take that lock at all?"
    answer: "The push task retakes `WRITE_LOCK` because its rebase rewrites the work tree and must not race a write's file write. The lock is not reentrant, so draining while holding it would wait forever on a push that is waiting for the same lock; submitting is kept outside it by the same rule."
  - id: q-validate
    type: choice
    prompt: "Which refusals can happen **under** `WRITE_LOCK` rather than in `_check_document`? Select all that apply."
    options:
      - {id: a, text: "A book-binding conflict (409) found when the manifest is re-read under the lock"}
      - {id: b, text: "A native body with raw HTML (422 list)"}
      - {id: c, text: "A plain create onto an existing rel_path (409)"}
      - {id: d, text: "A book that cannot be created (422) during placement"}
    answer: [a, d]
    explain: "Everything else is decided in `_check_document`, which writes nothing. The manifest is settled first inside the lock, before any file is touched, so even those refusals leave nothing behind."
  - id: q-timeout
    type: cloze
    text: "Every git subprocess is bounded by {{KB_GIT_TIMEOUT_S}} (default 60 s), because the background push holds {{WRITE_LOCK|the write lock}} and a hung network would otherwise block every later publish."
```

## Sources {#sources-heading}

```sources #sources
items:
  - id: src-fastapi-bg
    title: Background Tasks
    url: https://fastapi.tiangolo.com/tutorial/background-tasks/
    publisher: FastAPI
    accessed: "2026-10-23"
  - id: src-fastapi-async
    title: Concurrency and async / await
    url: https://fastapi.tiangolo.com/async/
    publisher: FastAPI
    accessed: "2026-10-23"
  - id: src-git-push
    title: git-push documentation
    url: https://git-scm.com/docs/git-push
    publisher: Git
    accessed: "2026-10-23"
  - id: src-outbox
    title: "Pattern: Transactional outbox"
    url: https://microservices.io/patterns/data/transactional-outbox.html
    publisher: microservices.io
    accessed: "2026-10-23"
```
