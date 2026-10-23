---
title: "The POST /api/documents write path: from validation to the push"
date: 2026-10-23
format: native
syntax: 1
lang: en
summary: "What happens between a publish request and its 201: validation without the lock, the locked local write and commit, and the push and embed handed to a background worker."
tags:
  - knowledge-base
  - fastapi
  - git
  - write-path
  - concurrency
source:
  project: knowledge
  repo: knowledge
---

A publish to this knowledge base is one HTTP call, `POST /api/documents`, and it answers `201 Created` once the document is safe on the server's own disk. This chapter follows that call through `server/main.py` in the order the code runs, explains why the answer never waits for its own push to GitHub or its own embedding, shows [the one way it can still wait behind an earlier push](#waits), and ends with the rules you must keep when you change it. Every line reference is to commit `9978d84`.

## Background {#background}

**The files are the truth; everything else is derived from them.** The project states that the Markdown files under `docs/` are the canonical store and that the SQLite database is a disposable projection, rebuilt from the files by a reindex, which the API also runs on every boot to cure drift. Git sits on top of the files as their history, and a remote on GitHub is the off-box copy. A publish therefore has three things to update, in falling order of importance: the file, the database row, and git.

> [!DEFINITION]- Primer: the project's own terms
> - **Format:** a document is stored as `md`, `html` or `native` (the request's `format` field). A native document is Markdown with typed blocks that the server validates.
> - **Book, chapter, manifest:** documents can be bound into a book. A document placed in a book is a chapter, and the book's manifest is the list of its chapters.
> - **Recent index and landing page:** `docs/index.md` lists recent documents as bullets, and each project has a landing page. A publish to the public root keeps both up to date.
> - **Placement:** where a chapter goes in its book. A request without placement is a loose document.

**There is exactly one writer.** `WRITE_LOCK` is a single process-wide `threading.Lock` that serializes the write critical section, and the comment above it says this is sufficient only because the API runs a single uvicorn worker. The Dockerfile repeats the rule in so many words: "Never add --workers — multiple workers would break the single-writer invariant". The reason is plain: FastAPI's deployment docs say that separate worker processes normally do not share memory, so a second process would have its own lock and the two would not exclude each other ([FastAPI: Deployments Concepts](#s-r1-practice-07) — fastapi.tiangolo.com).

```python title="server/main.py" #write-lock
# One process-wide lock serializes the whole write critical section (file → index
# → DB → git). Load-bearing invariant: the API runs a SINGLE uvicorn worker, so an
# in-process lock is sufficient; never scale to multiple workers. WAL gives reads
# concurrency regardless.
WRITE_LOCK = threading.Lock()
```

> [!SKIP] Skip this if you know how FastAPI runs a plain `def` endpoint
> `create_document` is declared with `def`, not `async def`. FastAPI runs such a path operation in an external threadpool and awaits it, rather than calling it on the event loop, where it would block the server ([FastAPI: Concurrency and async / await](#s-r1-practice-01) — fastapi.tiangolo.com). Starlette, underneath, documents that pool as 40 tokens by default, so at most 40 sync calls run at once ([Starlette: Thread Pool](#s-r1-practice-04) — starlette.dev). For this chapter the consequence is the one that matters: several publishes can be inside the handler at the same moment, each on its own thread, and `WRITE_LOCK` is what lines them up.

## Intuition {#intuition}

**Think of a publish as two halves: a local, durable half that the caller waits for, and a network half that happens after the caller has its answer.** The first half validates the request, takes the lock, writes the file, commits the database, makes a local git commit and releases the lock. The second half pushes that commit to GitHub and computes the document's embedding for semantic search. The request's own second half never stands between it and its `201`. There is one catch: the push re-takes the lock the first half needs, so a new request can wait behind an earlier request's push ([What the 201 waits for](#waits)).

```diagram #flow-halves
kind: flow
title: The two halves of a publish
direction: right
groups:
  - {id: before, label: "Before the 201 (local)", nodes: [check, locked, queue, resp]}
  - {id: after, label: "After the 201 (network)", nodes: [worker, origin, gemini]}
nodes:
  - {id: check, label: _check_document, sub: "validate, no lock"}
  - {id: locked, label: WRITE_LOCK section, sub: "file, DB rows, local commit", tone: accent}
  - {id: queue, label: publish.submit, sub: two queue appends}
  - {id: resp, label: 201 response, shape: pill, tone: ok}
  - {id: worker, label: kb-publish worker, sub: "one thread, FIFO"}
  - {id: origin, label: GitHub origin/main, shape: store, tone: store}
  - {id: gemini, label: Gemini embed, shape: store, tone: store}
edges:
  - {from: check, to: locked}
  - {from: locked, to: queue}
  - {from: queue, to: resp}
  - {from: queue, to: worker, label: queued, style: dashed}
  - {from: worker, to: origin, label: "fetch, rebase, push"}
  - {from: worker, to: gemini, label: embed}
  - {from: worker, to: locked, label: "re-takes the lock (push only)", style: dashed, tone: warn}
```

**It was not always split this way.** Before phase P24, the handler ran the push (`git fetch origin main`, `git rebase origin/main`, `git push origin HEAD:main`: two SSH round-trips plus a rebase) inside `WRITE_LOCK` and before the response, with no subprocess timeout, and the Gemini embed ran outside the lock but still before the response. `gitops._run` called `subprocess.run` with no `timeout` argument at all, so every git step was unbounded.

**The bug that forced the change was a client that timed out on a write that had worked.** P24 started from an operator report: a production client uploaded documents successfully, yet reported a disconnect. The investigation found that the `/explain` skill posted with `curl --max-time 5`, and the five seconds were spent on network stages that ran after the document was durably saved and before the `201`. The publish module's own docstring tells the same story: the client saw a transport failure for a write that had already landed.

**P24 did not make the push faster; it moved it out of the way.** The decomposition kept the commit in the request (it is local and fast, so `committed` and `commit_sha` stay truthful), moved the push and the embed behind the response, gave every git subprocess a timeout, and changed the response only additively. Commit `b769236` did exactly that: it replaced the in-lock push and the in-request embed with two `publish.submit(...)` calls after the `with WRITE_LOCK:` block, set `pushed = False` unconditionally and added `push_pending` to the response.

## Code {#code}

The handler is `create_document`, and its docstring states the contract in two sentences: the file, the Recent bullet, the database upsert and a local commit all happen under `WRITE_LOCK`, and "Nothing in the pre-response path makes a network round-trip". The six steps below follow its body from top to bottom.

```diagram #seq-publish
kind: sequence
title: One publish, in the order the code runs
actors:
  - {id: client, label: Client}
  - {id: api, label: create_document}
  - {id: lock, label: WRITE_LOCK section}
  - {id: worker, label: kb-publish worker}
  - {id: origin, label: origin/main}
steps:
  - {from: client, to: api, label: POST /api/documents}
  - {from: api, to: lock, label: "with WRITE_LOCK:", note: "_check_document has already run, without the lock"}
  - {from: lock, to: api, label: "file, rows, local commit; lock released"}
  - {from: api, to: worker, label: "publish.submit(push), publish.submit(embed)", style: dashed}
  - {from: api, to: client, label: "201: pushed false, push_pending true"}
  - {from: worker, to: lock, label: the push task re-takes WRITE_LOCK}
  - {from: lock, to: origin, label: "fetch, rebase, push HEAD:main"}
```

### Step 1: auth and the request body {#step-auth}

**Before your code runs, FastAPI has already authenticated the caller and parsed the body.** `create_document` is a sync handler with status 201, taking a `DocumentIn` body, the `Request`, and four dependencies: `resolve_api_write` (the auth context), `ensure_registry_project`, `resolve_org_slug` and `get_conn` (a per-request SQLite connection).

```python title="server/main.py" #handler-signature
def create_document(
    body: DocumentIn,
    request: Request,
    ctx: ApiAuthContext = Depends(resolve_api_write),
    registry_project_id: UUID | None = Depends(ensure_registry_project),
    org_slug: str | None = Depends(resolve_org_slug),
    conn=Depends(get_conn),
):
```

The signature is at `server/main.py` L1303–L1310.

`resolve_api_write` has two modes. In legacy mode (no `DATABASE_URL`) it lets the caller through with no check when `KB_API_TOKEN` is unset, and otherwise demands the exact header `Authorization: Bearer <token>`, answering 401 to anything else.

In tenant mode it resolves the bearer to a tenant (the master token to tenant #1, a `vk_` credential to its own tenant, a session token to the user's first tenant), answers 401 to a missing or unknown bearer, and sets `is_public` only for tenant #1. That flag matters later: only a public caller's writes are committed to git.

`DocumentIn` requires `title`, `markdown`, `project`, `tags` and `source_repo`; `format` is one of `md`, `html` or `native` (default `md`), and `commit` defaults to true. One dependency does write: in tenant mode, `ensure_registry_project` get-or-creates the tenant's Postgres `projects` row, and its docstring warns that "the row may be created even when the handler then 409s". That registry row is the only write a refused publish can leave behind.

### Step 2: validate everything, lock nothing {#step-validate}

**The handler's first statement is the whole validation, and it runs before the lock.** `create_document` calls `_check_document(body, ctx, conn)`, which a comment calls "the one path the dry run shares", and takes `WRITE_LOCK` only after it returns. The function's docstring promises that it "only reads": "no lock, no file, no row, no commit".

```python title="server/main.py" #check-first
    # 1-2c. Validate (P31.S1: the one path the dry run shares, `_check_document`).
    checked = _check_document(body, ctx, conn)
```

The call is at `server/main.py` L1319–L1320.

It checks the fields first (project, tags, date, slug, related paths, chapter placement, language, subject), then the content: the body size limit and every image, which `prepare_assets` validates, strips and hashes in memory only, so that nothing touches disk before the lock.

Then it works out where the document goes and which version it will be. For a chapter it reads the book's manifest. A `new_version` request (or a chapter's already-bound variant) supplies a target, and a native publish onto an html document becomes a format migration to `<stem>.md`.

**A refused request gets only the first failing stage's error,** because `_check_document` raises in a fixed order:

| Order | What is checked | Status |
|---|---|---|
| 1 | field validators (project, tags, date, slug, …) | 422, a string |
| 2 | content violations, md and html only (size, assets) | 422, a list |
| 3 | the chapter's book manifest and placement | 409 or 422 |
| 4 | the version target's format and project; the migration's `<stem>.md` | 422; 409 |
| 5 | a file or row already at the path, with no version target | 409 |
| 6 | another document using the same file stem | 409 |
| 7 | native only: size, asset, grammar, reference and translation violations | 422, one list |

When a database row exists at the path, the 409 of row 5 carries a hint for the fix: re-publish with `"new_version": true, "rel_path": "<rel>"`. For a native document, step 7 composes the whole file in memory and parses it. It returns one list: the parser's violations sorted by line and column, followed by the reference and translation findings. The parser stops early on some faults (a NUL byte, the size limit, a bad header or nesting), so a fixed list can still be followed by a new one.

**The dry run is the same function with nothing after it.** `POST /api/documents/check` takes the same body and the same auth, calls `_check_document` (and, for a chapter, `_place_variant`) outside `WRITE_LOCK`, and answers 200 with `ok: true` and the `rel_path` and `version` a real publish would get. Because the two endpoints share one validation function, that function's docstring says the two "cannot drift". That holds for the validation itself, not for the code each handler runs around it.

> [!NOTE]- The docs and the code disagree on where validation runs
> `docs/current/architecture.md` says validation runs "under one in-process write lock", and `operations.md` says it runs "inside the write lock". The code runs it before the lock. Those docs predate P31.S1, which moved the pre-lock code into `_check_document`. The validate-then-lock order itself is older: it dates from the first API write path, commit `207f2ff`. For behaviour, trust the code.

### Step 3: the locked section {#step-lock}

**Inside the lock, anything that can still refuse the write runs first, before a single file changes.** For a chapter, the first step calls `_place_variant` to settle the new book manifest; for an html-to-native migration it re-reads the bound book's manifest. The comment says the manifest is settled "FIRST, before any file is touched" and re-read under the lock because "it is the authoritative copy". Those calls, and one defensive 409 in the same step, are the only `raise` statements reachable inside the block. From the archive step onward, no `HTTPException` is raised.

```python title="server/main.py" #lock-open
    # 3. Locked critical section: archive -> file write -> index update -> DB upsert
    #    -> LOCAL git add/commit. (WRITE_LOCK is NOT reentrant — nothing called in
    #    here may retake it, which is why the push is queued outside it in 4b.)
    with WRITE_LOCK:
```

The lock opens at `server/main.py` L1371–L1374. The comment's list is the short version. The real order inside the lock is:

1. settle the book manifest (chapters only);
2. re-key the database row (an html-to-native migration only);
3. archive the body about to be replaced, and record a version row for it, when a file already exists on disk;
4. store the images;
5. write the document file;
6. for the public root only, create the project landing page if it is missing, and add or update the document's bullet in the Recent index (`docs/index.md`);
7. upsert the `documents` row, keyed by `(tenant_id, rel_path)`, which commits the SQLite transaction at once;
8. write the book manifest and rebuild its database rows (chapters only);
9. `git add` and `git commit`.

### Step 4: the local commit {#step-commit}

**The commit is scoped to exactly the paths this write touched, and a failed commit does not undo the write.** The handler commits only when the request's `commit` is true, `KB_GIT_COMMIT` is enabled (it is by default) and the caller is the public root. It stages an explicit list (the document, `docs/index.md`, the landing page only if this write created it, the archive file, the manifest) and commits with `docs(<project>): add <slug>` for version 1 or `docs(<project>): update <slug> to v<version>` after that.

```python title="server/main.py" #commit-step
        if body.commit and config.git_commit_enabled() and ctx.is_public:
            try:
                staged = [f"docs/{rel}", "docs/index.md"]
                ...
                gitops.add(staged, root=config.kb_root())
                ...
                commit_sha = gitops.commit(
                    message,
                    root=config.kb_root(),
                    co_authored_by=body.co_authored_by,
                )
                committed = True
            except gitops.GitError as exc:
                commit_error = exc.stderr or str(exc)
```

The commit step is `server/main.py` L1566–L1596. `gitops.add` drops any path inside an `.assets` directory, so images are never staged. `gitops.commit` adds a second `-m "Co-Authored-By: <value>"` when the request names one, returns the new HEAD sha, and never pushes. Every git call through `gitops._run` is bounded by `KB_GIT_TIMEOUT_S` (default 60 seconds) and raises `GitError` on a timeout or a non-zero exit.

When that `GitError` arrives, the handler records it as `commit_error`, leaves `committed` false, and still answers 201: the file, the row and the index stay as written. This rule is as old as the write path itself. Commit `207f2ff` (P2.S3) introduced both the single write lock and the "failed commit never rolls back the write" behaviour.

### Step 5: queue the push and the embed {#step-queue}

**After the lock is released, the network work is handed to a background worker as two queue appends.** The handler queues a push only when the commit succeeded and `KB_GIT_PUSH` is on (it is off by default; the config docstring says only the hosted box opts in), setting `push_pending` to true. It queues an embed whenever embeddings are enabled. The push goes in first.

```python title="server/main.py" #queue-step
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

The queueing is `server/main.py` L1616–L1632. `publish.submit` starts one daemon thread named `kb-publish` if none is alive, bumps a pending counter and puts the task on a FIFO `queue.Queue`, then returns without waiting. The worker takes tasks one at a time and runs each. It logs and records any exception without dying.

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
```

The loop is `server/publish.py` L58–L67.

**The push task takes `WRITE_LOCK` again, so the project's rule is to queue it from outside the lock.** A rebase rewrites the work tree, so the push must not overlap any write's locked section. `_push_task` therefore wraps `gitops.push` in `with WRITE_LOCK:` (`server/main.py` L198–L200).

```python title="server/main.py" #push-task
    def _task() -> None:
        with WRITE_LOCK:
            gitops.push(root=root)
```

The comment opening the locked section says the lock is not reentrant and "nothing called in here may retake it, which is why the push is queued outside it". The backend doc states the same rule: a publish task is always submitted from outside the critical section, because the worker takes the same lock from a background thread.

Read the rule for what it guards. `publish.submit` only appends to a queue and returns, and the task runs on the worker thread, so a submit made inside the lock would not by itself deadlock: the worker would wait until the handler let go. What would deadlock is code in the locked section that runs a lock-taking task itself, or waits for one to finish. Submitting outside keeps the section free of any such dependency.
`gitops.push` runs `git fetch origin main`, then `git rebase origin/main`, then `git push origin HEAD:main`, never with `--force`. If any step fails, it runs `git rebase --abort` and re-raises, leaving the local commit in place.

### Step 6: the response {#step-response}

**Read the 201 as a statement about the local save, never about GitHub.** The response always contains `id`, `rel_path`, `url`, `title`, `project`, `slug`, `date`, `tags`, `related`, `format`, `version`, `previous_version`, `archived_path`, `recent_updated`, `landing_created`, `committed`, `commit_sha`, `pushed` and `push_pending`. A native publish adds `assigned_ids`, `warnings` and `migrated_from`, and a chapter adds its book fields. The fields a client most often misreads:

| Field | What it tells you |
|---|---|
| `committed` | the local git commit was made |
| `commit_error` | present only when the commit failed; the document is still saved |
| `commit_sha` | the local commit the request made, before any rebase; the background rebase may rewrite it |
| `pushed` | always `false`: "saved; publishes on the next successful push" |
| `push_pending` | `true` when a push to `origin/main` was queued and runs right after the response |
| `version` | the version written to the file and the row |

The project's docs make two rules out of this for every client: `pushed: false` must never be read as a failure or retried on, and a lost or timed-out response is not evidence of failure either. Verify by reading the document back; never re-POST blind.

## What the 201 waits for {#waits}

**The 201 waits on local disk, SQLite and a local commit, but it can still wait behind a push.** The handler body itself does only local work and two queue appends. Yet `create_document` opens its section with a plain `with WRITE_LOCK:`, without a timeout, and the push task holds that same lock around `gitops.push`. So a publish that arrives while the worker is pushing waits at `with WRITE_LOCK:` until the push lets go. It writes nothing and returns no 201 until then.

| Before the 201 (the caller waits) | After the 201 (the caller does not) |
|---|---|
| validation: local reads | the push: fetch, rebase, push to GitHub |
| tenant mode: a Postgres get-or-create in an async dependency | the Gemini embed |
| the file, the SQLite commits, the local git commit | |
| the queue appends | |
| **waiting for `WRITE_LOCK`, when the worker holds it for a push** | |

The "no network before the 201" promise covers GitHub and Gemini only. In tenant mode, `ensure_registry_project` awaits Postgres before the handler runs, and the P24 notes record that the usage-metering middleware writes to Postgres after the handler returns and before the body reaches the client. The notes call that a local-container hop of milliseconds.

**How long the lock wait can last is an open question.** Each git subprocess is capped at `KB_GIT_TIMEOUT_S`, and the push runs several in a row (fetch, rebase and push, then `rev-parse` on success or `rebase --abort` on failure), each with its own cap. No source in the project states a bound for the whole push, or for a write waiting behind one.

The project's docs disagree with themselves here: `architecture.md` says "Everything the caller waits for is local disk + SQLite", while the same document says writers and the publish worker are serialized on `WRITE_LOCK`. The docs mention a write waiting behind a push only for the unbounded case, a hung git that "would block every later write", which they give as the reason for the timeout.

**One test guards the half of the promise that matters most:** a stalled push must not delay the 201. It replaces `gitops.push` with a function that blocks on an `Event`, posts a document, and asserts the 201 arrives in under a second with `push_pending` true.

```python title="tests/test_api_push.py" #test-hanging-push
def test_response_does_not_wait_for_a_hanging_push(pushable, monkeypatch):
    """The bug this phase fixes: a stalled push must not delay the 201."""
    ...
    monkeypatch.setattr(gitops, "push", _hanging_push)
    t0 = time.monotonic()
    r = tc.post("/api/documents", json=_PAYLOAD)
    elapsed = time.monotonic() - t0
    assert r.status_code == 201 and r.json()["push_pending"] is True
    assert elapsed < 1.0, f"201 waited {elapsed:.2f}s on the push"
```

The test is `tests/test_api_push.py` L181–L198.

Note what it does not test. Its stand-in replaces only `gitops.push`, so `_push_task` still wraps it in `WRITE_LOCK`, and the blocked stand-in holds the lock. The test sends a single POST and never a second one while the push is blocked. That second publish is the one that would wait.

## When the push fails {#push-failures}

**A failed push costs the remote copy, never the save, and the next successful push catches up.** When fetch, rebase or push raises, `gitops.push` runs `git rebase --abort` and re-raises. Git documents `--abort` as resetting HEAD to the original branch, so the box keeps its local commit ([git-rebase](#s-r1-criticism-08) — git-scm.com). The worker prints `[kb-api] publish: push <rel> FAILED: <error>` on stdout and the traceback on stderr, and the caller is never told: its response is long gone.

```python title="server/gitops.py" #gitops-push
    try:
        _run(["fetch", remote, branch], root=root)
        _run(["rebase", f"{remote}/{branch}"], root=root)
        _run(["push", remote, f"HEAD:{branch}"], root=root)
    except GitError:
        ...
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

The push is `server/gitops.py` L124–L142.

The rebase step is git's own remedy for a rejected push. By default `git push` refuses an update that is not a fast-forward, to prevent losing history, and the git-push docs give rebasing the local change onto the updated remote tip, then pushing again, as one remedy ([git-push](#s-r1-criticism-01) — git-scm.com).

**Unpushed commits travel with the next push.** A fast-forward from commit A to commit B means B is a descendant of A, and the refspec `HEAD:main` updates the remote's `main` with whatever commit `HEAD` names ([git-push](#s-r1-criticism-01) — git-scm.com). `gitops.push` rebases "our commit(s)" onto `origin/main` and then pushes `HEAD:main`, so the local commits the box has not yet pushed travel with the next successful push. The project's docs say the same: the next successful push "publishes everything accumulated".

**But nothing makes that next push happen on its own.** The worker runs each task once and never retries. Push tasks are queued only by the three write handlers (a publish, a delete, a book change), and the startup hook runs a reindex, which never runs git. Unpushed commits therefore wait for the next committed public-root write, or for an operator to push by hand.

**Queued work lives only in memory.** On a graceful shutdown the app drains the queue for at most 10 seconds and drops what is left; a hard crash loses every queued and in-flight task. The worker is a daemon thread, and Python stops daemon threads abruptly at shutdown ([threading](#s-r1-criticism-03) — docs.python.org).

A `SIGKILL` cannot be caught at all, and `atexit` handlers do not run when a signal Python does not handle kills the process ([signal](#s-r2-criticism-05), [atexit](#s-r2-criticism-06) — docs.python.org). The project's operations doc states the outcome: a container restart drops a push that has not run yet, never a save.

**To see whether the box has stranded commits, ask git, not the API.** No route exposes the worker's last error, and `/healthz` reports no publish state. The documented check, run in the box's KB clone, is:

```bash title="operator check (the box's KB clone)" #check-stranded
git rev-list --count origin/main..HEAD
```

`origin/main..HEAD` lists the commits reachable from `HEAD` but not from `origin/main`, and `--count` prints only how many ([git-rev-list](#s-r2-criticism-02) — git-scm.com). The expected answer is `0`; anything else is commits waiting on the box. A failed push also leaves the `FAILED` line in the api container's log.

Two edges stay open. If `git rebase --abort` itself fails, the failure is ignored: nothing in the code checks whether a rebase is still in progress afterwards, and no current doc covers recovering from it.

The embed has no client timeout of its own. A stalled embed blocks the single worker, and every push queued behind it, until a restart. Writes and the live site do not lag meanwhile, but the off-box backup does. The P24 review recorded this as an accepted limit and a deferred job.

## The invariants, and changing the write path safely {#invariants}

These are the rules the write path is built on, each with where the project states it:

- **The files are canonical.** SQLite is a projection that a reindex rebuilds (the project's architecture notes).
- **One writer.** One in-process `WRITE_LOCK`, one uvicorn worker (the comment at `server/main.py` L179–L183 and the Dockerfile).
- **A failed commit never rolls back a write.** The answer is 201 with `committed: false` (the `create_document` docstring).
- **No network before the 201.** `docs/current/backend.md` warns that a new pre-response network call would silently bring back the client-timeout bug P24 fixed.
- **Submit from outside the lock.** The worker takes the same lock, and the project keeps the locked section free of anything that depends on it (`backend.md`, and the `_push_task` docstring).
- **Every git subprocess is bounded.** The push holds `WRITE_LOCK`, so a hanging SSH connection to GitHub would block every later write (the `config.git_timeout_s` docstring).

**Two guarantees are thinner than they look, and you should know both before you touch the code.** The first is concurrency. `WRITE_LOCK` serializes the critical sections but not `_check_document`, and nothing inside the lock re-runs the already-exists 409, the stem 409 or the version numbering. Reading the code, it permits two races, traced but never observed:

- Two simultaneous publishes of the same new document can both pass the 409. The second then archives nothing and overwrites the first, both at version 1, so the first body vanishes from the KB's version archive without any error. On the public root, the first request's own git commit still holds it.
- Two simultaneous re-publishes of the same version N can both compute N+1. The second then overwrites the true vN archive with the first one's body, so the vN archive file and the vN database row disagree.

The database will not catch either one. Apart from its integer primary key, the `documents` table's only uniqueness constraint is `UNIQUE (tenant_id, rel_path)`, and `upsert_document` updates the row in place on a conflict. The version row is written the same way: `upsert_document_version` uses `ON CONFLICT … DO UPDATE`, so the second racer's vN row replaces the first's instead of being refused.

The second is partial failure. The locked section is a series of separately committed steps, not one transaction. It has no `try/finally` and no rollback, and its database work is several separate SQLite commits rather than one transaction. Reading the code, an exception partway leaves the earlier steps applied:

- Fail after the archive, and you have a version row for a body that is still current.
- Fail after the file write, and the file is new while the row still describes the old version.

Either way, nothing is committed to git. Reindex rebuilds the database from the files but never runs git, and leftovers can ride into a later write's commit, because every write stages `docs/index.md` and `git commit -m` commits whatever is staged.

> [!IMPORTANT] Before you change the write path
> - **Anything that can refuse the write goes before the first file write:** in `_check_document` if it only reads, or at the top of the locked section if it must see the state under the lock, the way the manifest settle does.
> - **A check that must hold against a concurrent publish goes inside `WRITE_LOCK`.** A pre-lock check is advisory under concurrency (the two races above).
> - **No call to a remote service before the response,** in the handler or in a dependency: not GitHub, not Gemini, nothing new. Such work goes through `publish.submit`. The one existing exception is tenant mode's Postgres, a local-container hop the P24 notes accept.
> - **Never call `publish.submit` from inside the lock, nor anything that takes `WRITE_LOCK` or waits for a task that does.**
> - **Every new git command goes through `gitops._run`,** so that `KB_GIT_TIMEOUT_S` bounds it.
> - **Keep the response additive.** P24 added `push_pending` rather than repurpose `pushed`, which kept `pushed: false` truthful.
> - **Never add `--workers`** to the uvicorn command.
> - **Run the tests:** `uv run pytest -q`. The operations doc also requires `python3 scripts/plugin_parity.py` for any change to a shipped-payload path such as `server/*` or `tests/*`.

The tests in `tests/test_api_push.py` guard the network half: `test_response_does_not_wait_for_a_hanging_push` (the 201 does not wait), `test_git_subprocess_timeout_surfaces_as_git_error` (a git step that runs past `KB_GIT_TIMEOUT_S` raises `GitError`), and `test_push_conflict_keeps_local_commit_no_rebase_state`. No test guards the two races above.

## Best practices & next steps {#best-practices}

**Where it aligns.** Moving the slow side effects behind the response matches what the frameworks document background work for. FastAPI's docs describe background tasks as operations run after returning a response, which the client need not wait on ([FastAPI: Background Tasks](#s-r1-practice-02) — fastapi.tiangolo.com). Microsoft's guidance on background jobs says the same in general terms, that such jobs reduce interactive response times while the application keeps serving requests ([Azure: Background jobs](#s-r1-practice-09) — learn.microsoft.com).

Committing locally first and sending later also has the shape of the transactional outbox: the outgoing message is stored with the data, and a separate relay sends it later ([microservices.io: Transactional outbox](#s-r1-practice-05) — microservices.io; [AWS: Transactional outbox](#s-r1-practice-06) — aws.amazon.com). As an analogy, git plays the outbox here: the unpushed commits are the record of what still has to go out, and the next push is the relay. The analogy breaks at the relay: this one is an in-memory queue that never retries ([When the push fails](#push-failures)).

**Where it deliberately diverges.** It does not use FastAPI's own `BackgroundTasks`. That class comes from Starlette, whose docs describe an in-process task attached to a response that runs only once the response has been sent ([Starlette: Background Tasks](#s-r1-practice-03) — starlette.dev). The publish module's docstring gives its reasons for a single worker with a FIFO queue instead: the request thread never waits, pushes stay serialized (never two rebases at once, one push per write in submit order), and "the response never waits" becomes a property of this code rather than of the ASGI middleware order.

The failure handling differs too. Starlette documents that if one of a response's background tasks raises, the tasks after it do not run ([Starlette: Background Tasks](#s-r1-practice-03) — starlette.dev); this worker logs the failure and moves on to the next task.

It also diverges from the durable queues the guidance assumes. FastAPI's docs point heavier background work to tools like Celery with a broker such as RabbitMQ or Redis, which can run in other processes and servers ([FastAPI: Background Tasks](#s-r1-practice-02) — fastapi.tiangolo.com). Microsoft's guidance warns that infrastructure restarts can replay partly completed work, so message-driven tasks must be idempotent ([Azure: Background jobs](#s-r1-practice-09) — learn.microsoft.com). Here a restart drops the queue outright. The project's docs state the trade: a restart loses the push, never the save, and the next successful push publishes the accumulated commits.

**Next steps**, each from a finding above:

1. **Re-check the 409s and the version number under the lock.** The two races exist because the locked section trusts values `_check_document` computed before it.
2. **Make stranded commits visible.** Today they show only in a log line and the `git rev-list` check; exposing the worker's pending count and last error (for example on `/healthz`) would let monitoring see them.
3. **Bound the embed.** A stalled Gemini call blocks every push behind it; P24 recorded this as an accepted limit and a deferred job.
4. **Correct `architecture.md`.** Its "everything the caller waits for is local disk + SQLite" should name the lock wait behind an in-flight push, and its account of validation under the lock predates P31.S1.

## Quiz {#quiz-section}

```quiz #quiz
title: Check yourself
items:
  - id: q-refused
    type: choice
    prompt: "A legacy-mode publish is refused with a 409 because a file already exists at its path. What has it written?"
    options:
      - {id: a, text: "No file, row, archive or commit: the 409 comes from `_check_document`, before the lock is taken"}
      - {id: b, text: "The file, but not the database row"}
      - {id: c, text: "The file and the row; only the git commit was skipped"}
      - {id: d, text: "An archived copy of the existing document"}
    answer: [a]
    explain: "The already-exists 409 is raised by `_check_document`, which runs first and only reads: no lock, no file, no row, no commit. Archiving is a step inside the lock, which a refused request never reaches."
  - id: q-pushed
    type: choice
    prompt: "A client gets a 201 with `committed: true`, `pushed: false` and `push_pending: true`. What should it conclude?"
    options:
      - {id: a, text: "The push failed and the publish should be retried"}
      - {id: b, text: "The document is saved and committed locally, and a push to origin/main is queued"}
      - {id: c, text: "The document is saved but the commit is still pending"}
      - {id: d, text: "The document reached GitHub; `pushed` is only set later"}
    answer: [b]
    explain: "`pushed` is false on every path since P24; it means \"saved; publishes on the next successful push\". `push_pending: true` says the push was queued. Never retry on `pushed: false`."
  - id: q-outside
    type: recall
    prompt: "Why must `create_document` call `publish.submit` for the push after leaving the `with WRITE_LOCK:` block, not inside it?"
    answer: "The push task takes `WRITE_LOCK` itself, because a rebase changes the work tree. The project keeps the locked section free of anything that depends on that lock: running or waiting for a lock-taking task there would deadlock, so the push is submitted from outside the critical section. The submit alone only appends to the queue; the worker would simply wait for the handler to let go."
  - id: q-wait
    type: choice
    prompt: "The kb-publish worker is running a slow `git fetch` for an earlier publish when a new POST arrives. What happens to the new request?"
    options:
      - {id: a, text: "It writes at once; only its own push waits in the queue"}
      - {id: b, text: "It waits at `with WRITE_LOCK:` until the push task releases the lock, then writes and returns 201"}
      - {id: c, text: "It is refused with a 409 while a push is running"}
      - {id: d, text: "It skips the local commit and returns `committed: false`"}
    answer: [b]
    explain: "The push task holds `WRITE_LOCK` around `gitops.push`, and the handler takes the same lock with a plain blocking `with`. The new publish writes nothing and returns no 201 until the push lets go: the one way the 201 can still wait on the network, indirectly."
  - id: q-crash
    type: cloze
    text: "The publish queue lives in memory, so a container restart can drop queued after-response work, such as a {{push|embed|push or embed}}, but never the saved {{file|document|write}}."
    explain: "The file, the database row and the local commit are all done before the 201; only the after-response work (the push and the embed) is in the queue, and the next successful push publishes the accumulated commits."
```

## Sources {#sources-heading}

```sources #sources
items:
  - id: s-r1-practice-01
    title: Concurrency and async / await
    url: https://fastapi.tiangolo.com/async/
    publisher: FastAPI documentation
    accessed: "2026-10-23"
  - id: s-r1-practice-02
    title: Background Tasks
    url: https://fastapi.tiangolo.com/tutorial/background-tasks/
    publisher: FastAPI documentation
    accessed: "2026-10-23"
  - id: s-r1-practice-07
    title: Deployments Concepts
    url: https://fastapi.tiangolo.com/deployment/concepts/
    publisher: FastAPI documentation
    accessed: "2026-10-23"
  - id: s-r1-practice-03
    title: Background Tasks - Starlette
    url: https://starlette.dev/background/
    publisher: Starlette documentation
    accessed: "2026-10-23"
  - id: s-r1-practice-04
    title: Thread Pool - Starlette
    url: https://starlette.dev/threadpool/
    publisher: Starlette documentation
    accessed: "2026-10-23"
  - id: s-r1-practice-05
    title: "Pattern: Transactional outbox"
    url: https://microservices.io/patterns/data/transactional-outbox.html
    publisher: microservices.io (Chris Richardson)
    accessed: "2026-10-23"
  - id: s-r1-practice-06
    title: Transactional outbox pattern - AWS Prescriptive Guidance
    url: https://docs.aws.amazon.com/prescriptive-guidance/latest/cloud-design-patterns/transactional-outbox.html
    publisher: Amazon Web Services
    accessed: "2026-10-23"
  - id: s-r1-practice-09
    title: Background jobs (Azure Architecture Center)
    url: https://learn.microsoft.com/en-us/azure/architecture/best-practices/background-jobs
    publisher: Microsoft
    accessed: "2026-10-23"
  - id: s-r1-criticism-01
    title: git-push Documentation
    url: https://git-scm.com/docs/git-push
    publisher: git-scm.com
    accessed: "2026-10-23"
  - id: s-r1-criticism-08
    title: git-rebase Documentation
    url: https://git-scm.com/docs/git-rebase
    publisher: git-scm.com
    accessed: "2026-10-23"
  - id: s-r2-criticism-02
    title: git-rev-list Documentation
    url: https://git-scm.com/docs/git-rev-list
    publisher: git-scm.com
    accessed: "2026-10-23"
  - id: s-r1-criticism-03
    title: threading — Thread-based parallelism
    url: https://docs.python.org/3/library/threading.html
    publisher: Python Software Foundation
    accessed: "2026-10-23"
  - id: s-r2-criticism-05
    title: signal — Set handlers for asynchronous events
    url: https://docs.python.org/3/library/signal.html
    publisher: Python Software Foundation
    accessed: "2026-10-23"
  - id: s-r2-criticism-06
    title: atexit — Exit handlers
    url: https://docs.python.org/3/library/atexit.html
    publisher: Python Software Foundation
    accessed: "2026-10-23"
```
