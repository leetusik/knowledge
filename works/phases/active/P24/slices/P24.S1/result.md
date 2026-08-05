# Result — P24.S1 (server: fast, bounded write response)

## What landed

The two unbounded network stages are off the pre-response path of
`POST /api/documents` (and of the delete path). The request thread now does only
local work: validate → archive → file write → index update → DB upsert → local
`git add` + `git commit` → respond. The push (`git fetch` → `rebase` → `push`) and
the Gemini embed are queued and run after the handler returns.

### Mechanism: a module-level worker thread + FIFO queue (`server/publish.py`)

Chosen over Starlette `BackgroundTasks`, deliberately:

- **The ordering guarantee is in the code, not in the ASGI stack.** `publish.submit()`
  is a `queue.put()` on the request thread and returns immediately; the git/Gemini
  work happens on a separate, always-running daemon thread. So "the response never
  waits on the push" holds regardless of what the `BaseHTTPMiddleware` metering
  wrapper does with the response body — which is exactly the subtlety phase.md
  flagged for `BackgroundTasks` (with `BaseHTTPMiddleware` in the stack a background
  task can run before the body has been streamed to the client, which would have
  reproduced the bug).
- **Pushes stay serialized** across concurrent writes (one worker, FIFO) — never two
  rebases at once, one push per write in submit order. Coalescing (the phase's open
  question) stays open; not needed for the fix.
- **Deterministic in tests.** `publish.drain(timeout)` blocks until the queue is
  empty, so every git side effect is still asserted exactly, with no sleeps.
  (`drain` uses its own counter + `threading.Condition`, not `Queue.unfinished_tasks`,
  so it can honor a timeout without touching CPython internals.)

Ordering proof, concretely: the push task runs on the `kb-publish` thread, whose
only rendezvous with a request is `WRITE_LOCK`. The new test
`test_response_does_not_wait_for_a_hanging_push` pins this — `gitops.push` is
replaced by one that blocks on an `Event`, the POST still returns 201 in **< 1s**
(asserted), the fake push is observed to have started, and only then is it released.
That test fails on the old code by construction.

`WRITE_LOCK` discipline: the push task re-takes `WRITE_LOCK` (a rebase mutates the
work tree and must not race a write's file write), which is why tasks are submitted
**outside** the lock — the lock is not reentrant. `config.kb_root()` / `config.db_path()`
are read at submit time and captured in the closure, never re-read on the worker
(env is call-time config, so a worker read could see another request's/ test's env).

### Timeouts

`gitops._run` now passes `timeout=` to every `subprocess.run`, defaulting to
`config.git_timeout_s()` → **`KB_GIT_TIMEOUT_S`, default 60s** (unparseable or
non-positive falls back to 60s, so the cap can never be switched off). A timeout
kills the child and surfaces as `GitError("… timed out after 60s")` — the same
channel callers already treat as "not published, keep the write". The `rebase
--abort` in `push`'s failure path is bounded too and its own timeout is swallowed,
so it can never mask the real `GitError`. This is what stops a wedged SSH connection
from holding `WRITE_LOCK` — and therefore every subsequent write — forever.

### Response contract (strictly additive)

- **Added** `push_pending: bool` to the 201 of `POST /api/documents` and to the 200
  of `DELETE /api/documents/{id}` / `…/by-path/{rel}`: *a push to origin/main was
  queued and runs right after this response*.
- No field removed, no type changed. `pushed: false` keeps its documented meaning
  ("saved; publishes on the next successful push") and is now false on every path
  when a push is deferred.
- `commit_sha` is the **local** commit this request made — no longer the post-rebase
  published head (flagged for the review; documented in the notes).
- `push_error` is no longer emitted: the push has not happened when the response is
  written. It stays an optional key in the contract; nothing in the repo reads it
  (`scripts/onboarding_smoke.py` only requires `pushed`, still present). Background
  push failures are logged to stdout (`[kb-api] publish: push <rel> FAILED: …`),
  i.e. the container log, and kept in `publish.last_error()` for tests.

### Shutdown

The lifespan shutdown hook drains the queue for up to 10s and logs anything still
pending; best-effort — docs/ on disk is canonical and an undelivered push republishes
on the next one.

## Files changed

- `server/publish.py` **(new)** — the after-response worker (`submit` / `drain` /
  `pending` / `last_error`).
- `server/main.py` — `_push_task` / `_embed_task` factories beside `WRITE_LOCK`;
  create + delete paths queue instead of pushing in-request; embed moved off the
  request path (it opens its own SQLite connection — the request's is closed with
  the response and is thread-bound); `push_pending` in both responses; shutdown drain.
- `server/gitops.py` — `_run(..., timeout=)` + `TimeoutExpired → GitError`; bounded
  `rebase --abort`; docstrings.
- `server/config.py` — `git_timeout_s()` (`KB_GIT_TIMEOUT_S`, default 60).
- `server/documents_api.py` — docstring accuracy only (the `/app` delete no longer
  shells out to a push in its threadpool call).
- `tests/test_api_push.py` — the five `pushed`-in-body assertions now assert
  `push_pending` in the body and the git side effect after `drain()`; fixture drains
  on teardown so no queued push outlives its `tmp_path`; two new cases (see below).
- `plugin/templates/manifest.json` — `server/publish.py` added to `files.identical`.
- `plugin/templates/kb/{server/*,tests/test_api_push.py}` — byte-mirrors of every
  changed `server/**` and `tests/**` file (incl. the new `publish.py`).

## Validation

| Command | Outcome |
|---|---|
| `.venv/bin/python -m pytest` | **PASS** — 83 passed, 32 skipped (was 81 passed; +2 new cases) |
| `python3 scripts/plugin_parity.py` | **PASS** — templates in parity (identical + completeness) |
| `python3 scripts/workflow.py validate` | **PASS** |

New test cases (both in `tests/test_api_push.py`, terse):

- `test_response_does_not_wait_for_a_hanging_push` — the ordering proof above.
- `test_git_subprocess_timeout_surfaces_as_git_error` — `KB_GIT_TIMEOUT_S=0.000001`
  → `gitops.push` raises `GitError` matching `timed out` (also exercises the bounded
  `rebase --abort` in the failure path).

Reworked cases: `test_push_happy_path`, `test_push_rebases_onto_diverged_remote`,
`test_push_conflict_keeps_local_commit_no_rebase_state`, `test_delete_push_enabled`,
`test_push_disabled_by_default`. The diverged-remote case now asserts the published
head equals the **post-rebase local head** (and that both the operator's commit and
ours are on `main`) instead of equalling the response's `commit_sha` — that equality
is precisely what the after-response rebase gives up. The conflict case asserts the
failure surfaced on the worker (`publish.last_error()`), the local commit survived,
no rebase state, clean tree.

## Deviations from plan.md

None in substance. Two judgment calls the plan left open:

1. `push_pending` is emitted **always** (a bool), not only when true — a stable key
   is friendlier for consumers than a conditional one, and it is equally additive.
2. `server/documents_api.py` got a one-sentence docstring correction (it asserted the
   `/app` delete shells out to a push). Not in the plan's file list, but it is a
   statement this slice falsified; mirrored like the rest.

## Residual risks / notes for the review

- The Gemini embed on the worker is still not bounded by a client timeout (out of
  scope here — `server/embeddings.py` sets none). It can no longer delay a response,
  but a stalled embed does delay pushes queued behind it. Worth a follow-up if it
  ever bites; the push in front of it is bounded, the embed is not.
- The background embed opens its own SQLite connection, so it can now race a
  concurrent write for the DB write lock (`db.connect` sets no `busy_timeout`), and
  it can lose its FK target if the document is deleted between write and embed.
  Both fail closed: logged, embedding skipped, next reindex catches up (semantic
  search is a disposable cache).
- Behavior change to flag in the docs: `commit_sha` is the pre-rebase local commit,
  and `push_error` no longer appears in any response.
