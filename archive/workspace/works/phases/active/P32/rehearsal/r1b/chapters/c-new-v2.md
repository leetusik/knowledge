---
title: "What happens when you publish: the POST /api/documents write path"
date: 2026-10-23
format: native
syntax: 1
lang: en
summary: "One publish traced through the knowledge server, from validation to the git push: why the 201 never waits on GitHub or Gemini, the one way it still can, and the rules to keep when you change it."
tags:
  - write-path
  - fastapi
  - git
  - background-jobs
source:
  project: knowledge
  repo: knowledge
---

This chapter follows one `POST /api/documents` through the knowledge server, in the order the code runs it, at commit `9978d84`. By the end you should be able to do three things: trace a publish from the request to the git push, explain why the 201 does not wait on the network (and the one way it still can), and change the write path without breaking the rules it depends on.

## Background {#background}

**The files on disk are the knowledge base; everything else is derived from them.** The project treats the files under `docs/` as the canonical store. The SQLite database is a disposable projection that a reindex can rebuild from those files, and by default the API runs a full reindex on every boot to fix any drift. Git sits on top: the knowledge base is a git repository, and a publish ends in a local commit, which a background worker later pushes to GitHub on the hosted box (the only place pushing is turned on).

A few terms recur below. The server runs in **legacy mode** (one owner) or in **tenant mode** (several accounts, switched on by a Postgres `DATABASE_URL`). The **public root** is `docs/`, where the operator's own documents live; other tenants write under `tenants/<uuid>/`, which is never committed. A document's **format** is `md`, `html` or `native`, the typed chapter format this page is written in, and a native chapter can be **placed** in a book under a chapter key. Names like P24 or P31.S1 are the project's work phases and slices; the commits and notes that made each change carry them.

```python title="server/main.py" #write-lock
# One process-wide lock serializes the whole write critical section (file → index
# → DB → git). Load-bearing invariant: the API runs a SINGLE uvicorn worker, so an
# in-process lock is sufficient; never scale to multiple workers. WAL gives reads
# concurrency regardless.
WRITE_LOCK = threading.Lock()
```

**There is one server process, and inside it, one lock that every writer takes.** `WRITE_LOCK` is an ordinary `threading.Lock`. It is enough only because the API runs a single uvicorn worker, and the Dockerfile says so directly: "Never add --workers — multiple workers would break the single-writer invariant". Two worker processes would each have their own lock, because worker processes of one program normally do not share memory ([FastAPI deployment concepts](#s-r1-practice-07)).

So why does a single process need a lock at all? `create_document` is a plain `def` handler, not `async def`. FastAPI runs such a handler in an external threadpool and awaits it, so that it does not block the event loop ([FastAPI: Concurrency and async](#s-r1-practice-01)). Two publishes that arrive together run on two threads of the same process, and the lock is what keeps their writes from interleaving.

> [!DEFINITION]- Primer: how many publishes can be in the handler at once?
> Starlette runs synchronous endpoints with `anyio.to_thread.run_sync`, and its documentation gives the default thread pool as 40 tokens, so at most 40 sync calls run at the same time. FastAPI's sync dependencies share that limit ([Starlette: Thread Pool](#s-r1-practice-04)). Any number of those threads can be validating at once, but only one at a time can hold `WRITE_LOCK`.

## Intuition {#intuition}

**A publish has two halves: local work the client waits for, and network work it does not.** The local half validates the request, writes the file, commits the database row and makes a local git commit. The network half pushes that commit to GitHub and asks Gemini for a search embedding. Since phase P24, the server answers 201 between the two halves.

```diagram #flow-halves
kind: flow
title: The two halves of a publish
caption: Everything left of the 201 is local. The worker on the right runs on its own thread, after the handler has queued the work.
direction: right
nodes:
  - {id: req, label: POST /api/documents, shape: pill}
  - {id: check, label: _check_document, sub: "validate, no lock"}
  - {id: lock, label: WRITE_LOCK section, sub: "file, DB row, local commit", tone: accent}
  - {id: submit, label: publish.submit, sub: queue append}
  - {id: resp, label: "201", shape: pill, tone: ok}
  - {id: worker, label: kb-publish worker, sub: "one thread, FIFO"}
  - {id: push, label: push to GitHub, sub: re-takes WRITE_LOCK, tone: warn}
  - {id: embed, label: Gemini embed, sub: no lock, tone: warn}
groups:
  - {id: local, label: Before the 201, nodes: [req, check, lock, submit, resp]}
  - {id: network, label: Behind the response, nodes: [worker, push, embed]}
edges:
  - {from: req, to: check}
  - {from: check, to: lock}
  - {from: lock, to: submit}
  - {from: submit, to: resp}
  - {from: submit, to: worker, label: queued, style: dashed}
  - {from: worker, to: push}
  - {from: worker, to: embed}
```

The split came from a real failure. An operator reported that documents uploaded to the production knowledge base were saved, yet the client that sent them reported a disconnect. The cause was that the `/explain` skill posted with `curl --max-time 5`, and those five seconds were spent on network stages that ran after the document was already saved but before the 201. The client timed out on a write that had landed.

Before P24, the handler ran the whole push inside `WRITE_LOCK` and inside the request: `git fetch origin main`, `git rebase origin/main`, `git push origin HEAD:main`, which is two SSH round-trips to GitHub plus a rebase. The Gemini embed ran after the lock but still before the response. None of the git subprocesses had a timeout.

**P24 did not make the push faster; it moved it out of the request.** The local commit stayed in the request, because it is fast and it keeps `committed` and `commit_sha` truthful. The push and the embed moved behind the response, and every git subprocess got a timeout. The response gained `push_pending`, kept `pushed` (now always false), and lost `push_error`, since a push that fails after the response has nothing left to report it in. The publish worker's own docstring states the result: the module "moves that work behind the response".

## The publish, step by step {#code}

This section walks the handler in the order it runs. Each step names the code, what it does, and what it can refuse.

### Step 1: validate, before the lock {#validate}

```python title="server/main.py" #create-document-head
@app.post("/api/documents", status_code=201)
def create_document(
    body: DocumentIn,
    request: Request,
    ctx: ApiAuthContext = Depends(resolve_api_write),
    registry_project_id: UUID | None = Depends(ensure_registry_project),
    org_slug: str | None = Depends(resolve_org_slug),
    conn=Depends(get_conn),
):
    # … docstring elided …
    # 1-2c. Validate (P31.S1: the one path the dry run shares, `_check_document`).
    checked = _check_document(body, ctx, conn)
```

**Before the handler's first line, FastAPI has already run its dependencies.** `resolve_api_write` is the authentication. In legacy mode it lets every request through when `KB_API_TOKEN` is unset; when the token is set, it requires the exact header `Authorization: Bearer <token>` and answers 401 otherwise. In tenant mode it resolves the bearer to a tenant, and a missing or unknown bearer is a 401.

**One dependency can write, even for a publish that is then refused.** In tenant mode, `ensure_registry_project` get-or-creates the tenant's Postgres `projects` row before the handler runs; its docstring warns that "the row may be created even when the handler then 409s". That registry row is the only write a refused publish can leave behind.

**`_check_document` is the whole validation stage, and it only reads.** Its docstring calls it the one validation path shared by `POST /api/documents` and its dry run, and says it takes "no lock, no file, no row, no commit". It raises its errors in a fixed order, so a request that fails several checks sees only the first stage's error:

1. a 422 from the field validators (project, tags, date, slug, related, placement, `lang`, `subject`, `translated_from`, `summary`);
2. for `md` and `html` only, a 422 listing the content violations (size, assets);
3. the chapter placement's 409 and 422s, read from the book manifest;
4. a 422 when a new version changes its target's format or project, and the 409 for a migration whose new path is taken;
5. a 409 when a file or row already exists at the path and neither `new_version` nor `overwrite` was sent; its detail carries the `existing_title`, the `version` and a hint to re-publish with `"new_version": true`;
6. a 409 when another document already uses the same file stem, `<project>/<date>-<slug>`, under a different path, even with `overwrite: true`;
7. for `native`, one 422 listing every size, asset, grammar, reference and translation violation together.

A placed chapter whose `(book, chapter, lang)` is already bound becomes that document's next version, whatever `new_version` says. In a native body, the `chapter:` and `doc:` reference checks run only once the body has parsed.

**The dry run is the same function without the lock and the write.** `POST /api/documents/check` takes the same body and the same `resolve_api_write` auth, calls `_check_document` (and, for a chapter, `_place_variant`) outside `WRITE_LOCK`, and answers 200 with `ok: true`, the `rel_path`, the `version` it would write and the `previous_version`. Because both endpoints call one function, they cannot drift apart.

> [!NOTE]- Older docs say validation runs under the lock
> `docs/current/architecture.md` and `docs/current/operations.md` describe validation as running inside the write lock. Those doc versions predate P31.S1, which gathered the pre-lock code into `_check_document`. The code at `9978d84` validates first and takes the lock afterwards; trust the code.

### Step 2: inside WRITE_LOCK {#locked}

**Everything that touches disk happens under one lock, in a fixed order.** The handler takes `WRITE_LOCK` only after `_check_document` has returned. Inside, the real order is:

1. **Settle the book manifest first** (a placed chapter, or an html-to-native migration). The comment says this happens "FIRST, before any file is touched", re-reading the manifest under the lock because "it is the authoritative copy". `_place_variant` can still raise a 409 (a malformed manifest, a path or language slot bound to another document) or a 422 (a missing book with no `kind`), and since no file has been written yet, it leaves nothing behind.
2. **Re-key the row** on a migration, so the document keeps its id.
3. **Archive the body being replaced**, when a file exists on disk, to `.versions/`, and upsert a version row for it.
4. **Store the images** under `.assets/`, before the body that names them.
5. **Write the document file**: for `native`, the parser's normalized source with the server's ids written in.
6. **For the public root only**, create the project landing page if it is missing and update the Recent list in `docs/index.md`.
7. **Upsert the document row**, which commits its SQLite transaction at once.
8. **Write the book manifest** and rebuild the book's rows, when a chapter was placed.
9. **Make the local git commit**.

```python title="server/main.py" #commit-step
        # 4. Git only when requested AND enabled. A failed commit is NOT rolled
        #    back — the file/DB stay written; report committed:false + commit_error.
        committed = False
        commit_sha = None
        commit_error = None
        # … comment elided …
        if body.commit and config.git_commit_enabled() and ctx.is_public:
            try:
                staged = [f"docs/{rel}", "docs/index.md"]
                # … the landing, archive and manifest paths are appended when this write made them …
                gitops.add(staged, root=config.kb_root())
                # … a migration also stages the removal of the old .html …
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

**The commit stages exactly the paths this write touched, and it never pushes.** It runs only when the request's `commit` is true, `KB_GIT_COMMIT` is on (the default) and the caller writes to the public root. `gitops.add` runs `git add -- <paths>` on the given list and drops any path inside `.assets/`, so images are never committed. `gitops.commit` runs `git commit -m <message>`, adds a second `-m "Co-Authored-By: …"` when the request names a co-author, and returns the new `HEAD`.

**A failed commit is reported, not rolled back.** A `GitError` from staging or committing is caught: `committed` stays false and `commit_error` carries git's message, while the file, the row and the Recent list stay written. The request still answers 201. Because the files are canonical, the publish counts as saved even when git refused it.

### Step 3: queue the network work, outside the lock {#queue}

```python title="server/main.py" #submit
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

**After the lock is released, the handler only appends two tasks to a queue.** A push is queued only when the commit succeeded and `KB_GIT_PUSH` is on, which is off by default; only the hosted box turns it on. An embed is queued whenever embeddings are configured. `publish.submit` starts the single daemon worker thread `kb-publish` if none is alive, adds the task to a FIFO `queue.Queue` and returns without waiting. The worker takes tasks one at a time, runs each one, and logs any exception without dying.

```python title="server/main.py" #push-task
def _push_task(root: Path):
    # … docstring elided …
    def _task() -> None:
        with WRITE_LOCK:
            gitops.push(root=root)

    return _task
```

**The push task takes `WRITE_LOCK` again, on the worker thread.** A rebase rewrites files in the work tree, so it must not run while a write is writing files. The code's comments give this as the reason the handler queues the push only after leaving the `with WRITE_LOCK:` block: the push task takes that lock again, and `WRITE_LOCK` is not reentrant. `docs/current/backend.md` states it as a rule of the write path: a publish task is always submitted from outside the critical section.

```python title="server/gitops.py" #gitops-push
    try:
        _run(["fetch", remote, branch], root=root)
        _run(["rebase", f"{remote}/{branch}"], root=root)
        _run(["push", remote, f"HEAD:{branch}"], root=root)
    except GitError:
        # … comment elided …
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
    return _run(["rev-parse", "HEAD"], root=root).stdout.strip()
```

**The push lands the box's commits on top of whatever is on GitHub, and it never forces.** It fetches `origin main`, rebases the local commits onto it and pushes `HEAD:main`. The rebase is there because git refuses by default to update a remote branch with a commit that is not a descendant of its current tip ([git-push](#s-r1-criticism-01)), and the git-push documentation names rebasing onto the new tip as one remedy. Every git call made through `_run` has a timeout of `KB_GIT_TIMEOUT_S` (60 seconds by default), and both a timeout and a non-zero exit raise `GitError`.

When the fetch, rebase or push fails, `gitops.push` runs `git rebase --abort` through a bare `subprocess.run` with the same timeout, ignores whether that worked, and re-raises the original error. The local commit stays. The error reaches the worker, which prints `[kb-api] publish: push <rel> FAILED: <error>` to the container log, writes the traceback to stderr and keeps it as `last_error()`. The client is never told: its response was sent long before.

### Step 4: the response {#response}

**The 201 says what is durable now, not what the network did.** It always carries `id`, `rel_path`, `url`, `title`, `version`, `previous_version`, `committed`, `commit_sha`, `pushed` and `push_pending`, plus `commit_error` when the commit failed. A native publish adds `assigned_ids` (the ids the server wrote into the stored file), `warnings` and `migrated_from`.

Three fields are easy to misread:

- **`pushed` is always `false`.** The handler sets it to false and never changes it. It keeps its documented meaning, "saved; publishes on the next successful push", and `push_pending: true` says a push was queued.
- **`commit_sha` is the local commit, before the rebase.** The background rebase may rewrite that commit, so the sha on GitHub can differ.
- **`push_error` no longer appears.** It existed before P24; a client that still reads it will never find it.

The project's docs turn this into a rule for every client: `pushed: false` is never a failure and never a reason to retry, and a lost or timed-out response is not evidence of failure either. Check by reading the document back; never re-post blindly.

```diagram #seq-publish
kind: sequence
title: One publish, from request to push
caption: The handler's work ends at the 201. The worker runs on its own thread and the handler does not wait for it, so the worker may pick up the push before or after the 201 reaches the client; the code does not order the two.
actors:
  - {id: client, label: Client}
  - {id: handler, label: create_document}
  - {id: lock, label: WRITE_LOCK}
  - {id: queue, label: publish queue}
  - {id: worker, label: kb-publish worker}
  - {id: origin, label: GitHub origin}
steps:
  - {from: client, to: handler, label: POST /api/documents}
  - {from: handler, to: lock, label: acquire after _check_document, note: "file, DB row, local commit"}
  - {from: handler, to: lock, label: release}
  - {from: handler, to: queue, label: submit push and embed}
  - {from: handler, to: client, label: "201, push_pending true"}
  - {from: worker, to: queue, label: take the push task}
  - {from: worker, to: lock, label: acquire}
  - {from: worker, to: origin, label: "fetch, rebase, push HEAD:main"}
  - {from: worker, to: lock, label: release}
```

## Why the 201 does not wait on the network {#no-network}

**Before the 201, the handler never talks to GitHub or Gemini.** The file write, the SQLite commit and the git commit are local, and the push and the embed are queue appends. The `create_document` docstring makes the same promise: the push and the embed "run after the 201 is written, so a caller's timeout budget only ever covers local work".

That promise covers GitHub and Gemini, not every hop. In tenant mode, Postgres is still on the path. The `ensure_registry_project` dependency awaits a Postgres call before the handler starts. When a write binds a chapter, the handler's best-effort reader-unit sync, after the lock is released, runs a Postgres write on the app's event loop and waits for it. And the P24 notes record that the usage-metering middleware writes to Postgres after the handler returns and before the body reaches the client; they describe that as a local-container hop of milliseconds.

**There is one way a publish can still wait on GitHub: behind the lock.** The handler opens its critical section with a plain `with WRITE_LOCK:`, with no timeout. The push task holds that same lock while it runs `git fetch`, `git rebase` and `git push`. So a publish that arrives while the worker is pushing validates, then waits at `with WRITE_LOCK:` until the push releases the lock. Until then it writes nothing and sends no 201. The embed task takes no lock, so it never causes this wait.

How long can that wait be? Each git subprocess has its own `KB_GIT_TIMEOUT_S` cap, 60 seconds by default. The code and the P24 notes state the bound only per subprocess; no source states a bound for the whole push, or for how long a waiting write may sit behind one. The project's docs say both things without connecting them: `architecture.md` says "Everything the caller waits for is local disk + SQLite", and the same docs say writers and the publish worker are serialized on the lock. Read as code, the second statement means the first is not always true.

The test that guards the main promise is in `tests/test_api_push.py`:

```python title="tests/test_api_push.py" #hanging-push-test
def test_response_does_not_wait_for_a_hanging_push(pushable, monkeypatch):
    """The bug this phase fixes: a stalled push must not delay the 201."""
    tc, work, bare = pushable
    monkeypatch.setenv("KB_GIT_PUSH", "true")
    release = threading.Event()
    started = threading.Event()

    def _hanging_push(**kwargs):
        started.set()
        assert release.wait(timeout=30.0)
        return "deadbeef"

    monkeypatch.setattr(gitops, "push", _hanging_push)
    t0 = time.monotonic()
    r = tc.post("/api/documents", json=_PAYLOAD)
    elapsed = time.monotonic() - t0
    assert r.status_code == 201 and r.json()["push_pending"] is True
    assert elapsed < 1.0, f"201 waited {elapsed:.2f}s on the push"
    assert started.wait(timeout=5.0)  # it really is running, just not in-request
    release.set()
    assert publish.drain(timeout=30.0)
```

It posts once and checks that the 201 arrives in under a second while the push is still hanging. It does not post a second document while the first push holds the lock, so the indirect wait above is not tested.

> [!IMPORTANT] The answer, in two sentences
> The 201 does not wait on GitHub or Gemini because the handler finishes all its local work (file, database row, local commit) under `WRITE_LOCK` and only queues the push and the embed for the `kb-publish` worker. It can still wait indirectly: a publish that arrives while the worker holds `WRITE_LOCK` for a push blocks at the lock until that push finishes or each git step hits `KB_GIT_TIMEOUT_S`.

## Invariants, and changing the write path safely {#invariants}

The write path depends on a few rules that are easy to break by accident. This section shows what goes wrong when they fail, then gathers them into a checklist.

### What can go wrong after the 201 {#after-201}

**A failed push loses nothing, but nothing retries it either.** The worker runs each task once. Nothing pushes at startup: the startup hook runs a reindex, and the reindex never runs git. Push tasks come only from three handlers: a publish, a delete and a book change. Unpushed commits therefore wait on the box until the next committed public-root write while `KB_GIT_PUSH` is on, or until someone pushes by hand. When that next push succeeds, it rebases the local commits and pushes `HEAD:main`, so the earlier commits go with it; the docs say the next successful push "publishes everything accumulated".

**A failed `rebase --abort` is not noticed.** Its exit status is ignored and its timeout swallowed, and nothing afterwards checks whether a rebase is still in progress. No document in `docs/current` covers recovering from that state.

**The queue lives only in memory.** On a graceful shutdown the app waits at most 10 seconds for queued tasks to finish, then prints how many are still pending and drops them. A hard crash loses every queued and in-flight task. The project's docs state the consequence: a restart can lose a push, never a save, and the next successful push publishes the commits that piled up.

> [!NOTE]- Why a crash cannot be drained
> The worker is a daemon thread, and Python stops daemon threads abruptly at interpreter shutdown ([threading](#s-r1-criticism-03)). A process killed with `SIGKILL` cannot catch the signal ([signal](#s-r2-criticism-05)), so no shutdown code runs at all, the lifespan's drain included. The 10-second drain helps only on a graceful shutdown.

**An operator sees a failed push only in the log.** The only signal is the `FAILED` line in the container log. `publish.last_error()` is not exposed by any route, and `/healthz` reports no publish state. The documented check is this command, which should print `0`:

```bash title="Unpushed commits on the box"
git rev-list --count origin/main..HEAD
```

`origin/main..HEAD` means the commits reachable from `HEAD` but not from `origin/main`, and `--count` prints only how many there are ([git-rev-list](#s-r2-criticism-02)). A non-zero count means commits are stuck on the box.

### What can go wrong inside the lock {#inside-lock}

**The checks run before the lock, and the lock does not repeat them.** For a loose document, nothing inside `WRITE_LOCK` re-runs the exists 409, the stem 409 or the choice of version target; the locked section uses the `rel`, `prev_version` and `doc_version` that `_check_document` computed earlier. This validate-then-lock order dates from the first write path, and P31.S1 moved that pre-lock code into `_check_document` unchanged.

Combine that with the `documents` table's only uniqueness rule, `UNIQUE(tenant_id, rel_path)`, where a second write at the same path updates the row in place. Reading the code, two races are possible. These come from tracing the code; nobody has observed them happening:

- **Two creates of the same new document** can both pass the exists check. The second to take the lock archives nothing, rewrites the file and updates the same row, both at version 1. The first body is gone from the history, and no 409 was raised.
- **Two new versions of the same document** both compute version N+1. The second one archives the first's N+1 body as `vN`, which overwrites the real `vN` archive, while its version row still holds the original `vN` text. The archive file and the row then disagree.

**A step that fails partway leaves the earlier steps in place.** The locked section has no `try/finally` and no rollback. Its only exception handlers are a defensive 409 in the migration's manifest step, which runs before any file is written, and the `GitError` catch around the commit. Its database work is several separate SQLite commits, not one transaction. If, say, the manifest write fails, the archive, the images, the file and the committed row are already in place.

**Nothing repairs such a half-finished write automatically.** Reindex rebuilds only the database from the files and never runs git, and no doc says it repairs such a write. A leftover change can also end up in a later commit: every public-root write stages `docs/index.md`, and `git commit -m` without a pathspec commits whatever is staged.

### Before you change the write path {#checklist}

Go through this list before you merge a change to `create_document`, `server/publish.py` or `server/gitops.py`:

- **One process.** Keep the single uvicorn worker. `WRITE_LOCK` is an in-process lock and protects nothing across processes.
- **No remote call before the 201.** Add no call to GitHub, Gemini or any other remote service between the request and the response. `backend.md` warns that a new pre-response network call would quietly bring back the timeout bug P24 fixed.
- **Queue outside the lock.** Call `publish.submit` after the `with WRITE_LOCK:` block, never inside it. Never call `publish.drain()` from a request path or while holding `WRITE_LOCK`, because a queued push takes that lock.
- **Bound every git call.** Run git through `gitops._run` so it gets `KB_GIT_TIMEOUT_S`, since the push holds `WRITE_LOCK` while it runs.
- **Keep the lock short.** Anything new under `WRITE_LOCK` (in the handler or in the push task) also delays every publish waiting behind it.
- **Re-check under the lock what another publish can change.** A check in `_check_document` is not repeated under the lock. If your change depends on whether a path, row or version exists, read it again inside the lock.
- **Fail before the first file write.** There is no rollback. Put a new step that can refuse before the archive step, the way the manifest is settled first.
- **Keep the response's meanings.** Do not give `pushed`, `committed` or `commit_sha` a new meaning; clients rely on them. P24 chose to add `push_pending` rather than repurpose an existing field.
- **Run `tests/test_api_push.py`.** If your change affects how long the lock is held, add a case where a second publish arrives while a push holds it.

## Best practices & next steps {#best-practices}

**Where it follows common practice.** Running work the client does not need after the response is what FastAPI's background tasks are for: the FastAPI docs say they run "after returning a response", for operations the client does not need to wait on ([FastAPI: Background Tasks](#s-r1-practice-02)). Starlette documents its background task as running only once the response has been sent ([Starlette: Background Tasks](#s-r1-practice-03)), and its `Response` sends the body before it awaits the task ([starlette/responses.py](#s-r1-practice-08)). Microsoft's guidance on background jobs says that starting work in the background, while the application keeps serving requests, reduces interactive response times ([Azure: Background jobs](#s-r1-practice-09)).

**Where it deliberately departs: its own thread instead of `BackgroundTasks`.** The `publish.py` docstring lists the properties the queue was chosen for. Pushes stay serialized (never two concurrent rebases, one push per write in submit order). And with the `BaseHTTPMiddleware` metering in the stack, the ordering of a Starlette background task against the response is "subtle", whereas a queue makes "the response never waits" a property of the code rather than of the ASGI stack.

**Where it departs: a queue that lives only in memory.** Durable designs store the pending work with the data. In the transactional outbox pattern, the outgoing message is saved in the same database transaction as the business data, and a separate relay sends it later ([microservices.io: Transactional outbox](#s-r1-practice-05)). Both microservices.io and AWS note that the relay may send a message more than once, so the consumer should be idempotent ([AWS: Transactional outbox](#s-r1-practice-06)). Microsoft's guidance likewise says queues deliver at least once and that message-driven background tasks must be idempotent ([Azure: Background jobs](#s-r1-practice-09)).

**Here the pending work is kept differently.** The queue entry is lost on a crash, but the commit it would have pushed stays in the local repository, and the next successful push carries it. The cost of a lost task is delay, until another write comes along or someone pushes by hand.

**Next steps**, each from a gap the research found:

1. **Bound the Gemini embed.** The code sets no timeout on the worker's Gemini call (the SDK's own default was not checked), and a P24 review recorded the consequence as an accepted limit, deferred to a later job: a stalled embed blocks the single queue, and every push behind it, until restart.
2. **Test, and then document, the wait behind a push.** Add a case to `tests/test_api_push.py` where a second publish arrives while a push holds `WRITE_LOCK`, decide what bound you accept, and correct the "local disk + SQLite" sentence in `architecture.md` in a docs phase.
3. **Close the two races.** Re-check the exists 409 and the version target inside `WRITE_LOCK`, so that two concurrent publishes to the same path cannot both write.
4. **Show push health somewhere other than the log.** Today the only signal is the `FAILED` log line and the `rev-list` check. Reporting the unpushed count or the last push error in `/healthz` would make a stuck box visible.

## Quiz {#quiz-section}

```quiz #quiz
title: Check yourself
items:
  - id: q-order
    type: choice
    prompt: A client publishes a loose document to a path that already holds one, with neither `new_version` nor `overwrite`. Where is the 409 raised, and what has been written?
    options:
      - {id: a, text: "Inside WRITE_LOCK, after the old body was archived; the archive stays"}
      - {id: b, text: "In _check_document, before the lock is taken; no file, row or commit was made"}
      - {id: c, text: "Inside WRITE_LOCK, in the first step, when the manifest and paths are settled before any file is touched"}
      - {id: d, text: "In a dependency, before the handler's body runs"}
    answer: [b]
    explain: "`_check_document` runs first and only reads (no lock, no file, no row, no commit). The exists 409 is one of its checks, so a refused publish leaves nothing on disk. The only thing that can come first is the tenant-mode registry row created by a dependency."
  - id: q-pushed
    type: choice
    prompt: "A publish returns 201 with `committed: true`, `pushed: false`, `push_pending: true`. What should the client conclude?"
    options:
      - {id: a, text: "The push failed and the client should retry the POST"}
      - {id: b, text: "The document is saved and committed locally, and a push to GitHub has been queued"}
      - {id: c, text: "The document was not saved because the push did not finish"}
    answer: [b]
    explain: "`pushed` is always false since P24: the push runs after the response. `push_pending: true` says the push was queued. `pushed: false` is never a failure and never a reason to retry."
  - id: q-wait
    type: choice
    prompt: "The `kb-publish` worker is in the middle of `git fetch` for an earlier publish when a new POST arrives. What happens to the new request?"
    options:
      - {id: a, text: "It returns 201 at once, because pushes run behind the response"}
      - {id: b, text: "It validates, then waits at `with WRITE_LOCK:` until the push task releases the lock, then writes and returns 201"}
      - {id: c, text: "It is refused with a 409 while a push is running"}
      - {id: d, text: "It writes without the lock, because the push holds a different lock"}
    answer: [b]
    explain: "The push task holds the same `WRITE_LOCK` around `gitops.push`, and the handler takes it with a plain `with`, without a timeout. So the new publish waits indirectly on the network, for as long as the push holds the lock."
  - id: q-commit-fail
    type: recall
    prompt: "The local `git commit` fails inside the lock (say, git's identity is not configured). What does the client receive, and what stays on disk?"
    answer: "A 201 with `committed: false` and `commit_error` holding git's message. The file, the database row and the Recent list stay written; nothing is rolled back, and no push is queued."
    explain: "The commit step catches `GitError` and records it. Pushing is queued only when `committed` is true."
  - id: q-crash
    type: cloze
    text: "A hard crash with tasks still on the publish queue can lose the {{push|push task|queued push|git push}}, but never the {{save|write|document|commit|local commit|file}}."
    explain: "The queue is in memory and dies with the process, but the file and the local commit were made before the 201, and the next successful push carries the commit."
  - id: q-outside
    type: choice
    prompt: "While the `kb-publish` worker rebases, why can it never rewrite a file that a publish is writing at that moment?"
    options:
      - {id: a, text: "The push task holds WRITE_LOCK around gitops.push, so a push and a write's locked section never overlap"}
      - {id: b, text: "git rebase refuses to run while any file in the work tree is open"}
      - {id: c, text: "The worker only starts after every request has finished"}
      - {id: d, text: "Publishes write to a separate copy of the repository"}
    answer: [a]
    explain: "The push task takes the same `WRITE_LOCK` that the handler's critical section takes, so the two never run at the same time. That is also why a publish can wait behind a push."
```

## Sources {#sources-heading}

```sources #sources
items:
  - id: s-r1-practice-01
    title: Concurrency and async / await
    url: https://fastapi.tiangolo.com/async/
    publisher: FastAPI documentation
    accessed: 2026-10-23
  - id: s-r1-practice-07
    title: Deployments Concepts
    url: https://fastapi.tiangolo.com/deployment/concepts/
    publisher: FastAPI documentation
    accessed: 2026-10-23
  - id: s-r1-practice-04
    title: Thread Pool - Starlette
    url: https://starlette.dev/threadpool/
    publisher: Starlette documentation
    accessed: 2026-10-23
  - id: s-r1-practice-02
    title: Background Tasks
    url: https://fastapi.tiangolo.com/tutorial/background-tasks/
    publisher: FastAPI documentation
    accessed: 2026-10-23
  - id: s-r1-practice-03
    title: Background Tasks - Starlette
    url: https://starlette.dev/background/
    publisher: Starlette documentation
    accessed: 2026-10-23
  - id: s-r1-practice-08
    title: starlette/responses.py at 1a3a401
    url: https://github.com/Kludex/starlette/blob/1a3a401c0d33920b7c8b1541fb89784976a41a96/starlette/responses.py
    publisher: GitHub
    accessed: 2026-10-23
  - id: s-r1-practice-09
    title: Background jobs (Azure Architecture Center)
    url: https://learn.microsoft.com/en-us/azure/architecture/best-practices/background-jobs
    publisher: Microsoft
    accessed: 2026-10-23
  - id: s-r1-practice-05
    title: "Pattern: Transactional outbox"
    url: https://microservices.io/patterns/data/transactional-outbox.html
    publisher: microservices.io (Chris Richardson)
    accessed: 2026-10-23
  - id: s-r1-practice-06
    title: Transactional outbox pattern - AWS Prescriptive Guidance
    url: https://docs.aws.amazon.com/prescriptive-guidance/latest/cloud-design-patterns/transactional-outbox.html
    publisher: Amazon Web Services
    accessed: 2026-10-23
  - id: s-r1-criticism-01
    title: Git - git-push Documentation
    url: https://git-scm.com/docs/git-push
    publisher: git-scm.com
    accessed: 2026-10-23
  - id: s-r2-criticism-02
    title: Git - git-rev-list Documentation
    url: https://git-scm.com/docs/git-rev-list
    publisher: git-scm.com
    accessed: 2026-10-23
  - id: s-r1-criticism-03
    title: threading — Thread-based parallelism
    url: https://docs.python.org/3/library/threading.html
    publisher: Python Software Foundation
    accessed: 2026-10-23
  - id: s-r2-criticism-05
    title: signal — Set handlers for asynchronous events
    url: https://docs.python.org/3/library/signal.html
    publisher: Python Software Foundation
    accessed: 2026-10-23
```
