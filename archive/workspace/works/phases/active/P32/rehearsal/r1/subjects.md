# Rehearsal 1: the two subjects

Written by hand by P32.S7 before either arm ran (S1 §3.13). Each subject has one **shared brief**: the exact
request both arms receive. The must-cover, expert-expectation and trap points are the **judge's hidden
checklist** (as in ResearchRubrics, A22): neither arm sees them, so R1 measures what the research found for
this reader without being told.

---

## G. Free-threaded CPython (general subject)

**Run from:** an empty scratch folder outside any git repository (general mode), on 2026-10-23.

**The shared brief (the request, verbatim, after `/knowledge:explain `):**

> Free-threaded CPython, the build without the GIL: what it is, how it works, and whether I should use it
> today. I am a Python developer who writes web services and data-processing scripts, uses threads, asyncio
> and multiprocessing, and knows the GIL only as "one thread runs Python at a time". I have never tried the
> free-threaded build. Afterwards I want to decide whether and how to try it, and know what changes for my
> code and my dependencies.

**Must-cover (8)**, each present **and** correct:

- **G-M1 The GIL.** One thread executes Python bytecode at a time, so CPU-bound threads do not run in
  parallel; blocking I/O releases it, which is why threads already help I/O-bound code.
- **G-M2 A separate build.** Free threading is a separate CPython build (`--disable-gil`, `Py_GIL_DISABLED`),
  installed beside the default one (for example `python3.13t` / `python3.14t`), introduced in 3.13 by PEP 703.
  It is not a switch on the default build.
- **G-M3 Status by version.** 3.13: experimental (PEP 703's phase I). 3.14: officially supported but optional
  (PEP 779, phase II). The default build still has the GIL; making free threading the default (phase III) is
  undecided.
- **G-M4 Detecting it.** `sys._is_gil_enabled()` says whether the GIL is off in the running process;
  `sysconfig.get_config_var("Py_GIL_DISABLED")` says whether the build supports it; `python -VV` /
  `sys.version` say "free-threading build".
- **G-M5 C extensions.** Importing an extension not marked as supporting free threading (`Py_mod_gil`, or
  `PyUnstable_Module_SetGIL`) re-enables the GIL, with a warning; `PYTHON_GIL=0` or `-X gil=0` forces it off.
  Extensions need wheels built for the free-threaded ABI (the `t` tag, e.g. `cp313t`).
- **G-M6 The cost.** Single-threaded code runs slower: about 40% on pyperformance in 3.13, mostly because the
  specializing adaptive interpreter (PEP 659) was disabled there; much lower from 3.14 (the current docs say
  about 1% on macOS aarch64 to 8% on x86-64 Linux). Memory use is higher too.
- **G-M7 How it works.** At least three of: biased reference counting, immortal objects, deferred reference
  counting, the mimalloc allocator, per-object locks ("critical sections") in built-in containers.
- **G-M8 Thread safety is still the programmer's.** Built-in containers stay internally consistent, but
  compound operations are not atomic, code that relied on the GIL for atomicity can now race, and sharing one
  iterator across threads is not safe.

**Expert expectations (4)**, present:

- **G-E1 Who gains.** CPU-bound pure-Python work spread over threads; I/O-bound and asyncio code gains
  little; compared with multiprocessing (no pickling or IPC, shared memory) and subinterpreters
  (`concurrent.interpreters`, PEP 734, 3.14).
- **G-E2 Checking dependencies.** How to see whether a package supports free threading (cp3XXt wheels, a
  compatibility tracker, the import warning), and testing the suite under the `t` build.
- **G-E3 How the decision was made.** PEP 703's conditional, phased acceptance with a way back, and PEP 779's
  criteria for phase II (performance and memory bounds).
- **G-E4 Trying it.** A concrete way to install and run it (python.org installers' option, `uv` or `pyenv`
  `3.14t`, conda-forge), plus `PYTHON_GIL` for experiments; the stable ABI (`abi3`) is not available to the
  free-threaded build (PEP 803's `abi3t` addresses it in 3.15).

**Traps (5)**, each committed = a negative:

- **G-T1** "Python 3.13 (or 3.14) removed the GIL" / "the GIL is gone": the default build keeps it.
- **G-T2** "Free threading makes Python faster" with no qualifier: single-threaded code is slower; only
  multithreaded CPU-bound code gains.
- **G-T3** "Without the GIL your code is thread-safe", or "built-in lists and dicts can corrupt the
  interpreter now": both wrong (G-M8).
- **G-T4** "C extensions just work unchanged", or "unported C extensions crash": an unmarked extension
  re-enables the GIL instead (G-M5), unless the user forces it off.
- **G-T5** Conflating free threading with subinterpreters, asyncio or multiprocessing.

---

## C. Publishing a document through the KB API (codebase subject)

**Run from:** a scratch clone of this repository at the pinned commit
`9978d8447ed2c5aaf4a7de2e7e6ed7efc0fae32e` (P32.S6's commit), folder named `knowledge`, clean work tree
(topic mode). Its `.claude/settings.json` is replaced with `{}` (skip-worktree), so the clone's own
permission rules and hooks stay out of the runs.

**The shared brief (the request, verbatim):**

> What happens when a document is published to this knowledge base's API with POST /api/documents: the
> write path from validation to the git commit and the push. I am a developer joining the project who knows
> Python, FastAPI basics and git, and has not read server/main.py. Afterwards I want to trace a publish
> through the code, explain why the 201 never waits on the network, and change the write path without
> breaking its invariants.

**Must-cover (8)**, each present **and** correct (paths at the pinned commit):

- **C-M1 Validation first, shared with the dry run.** `_check_document` is the one validation path shared by
  `POST /api/documents` and `POST /api/documents/check`; it only reads (no lock, file, row or commit) and
  raises the publish's own 422/409s, so a refused publish writes nothing.
- **C-M2 `WRITE_LOCK`.** One process-wide `threading.Lock` serializes the critical section (file, index, DB,
  git); it is not reentrant; it is only correct because the API runs a single uvicorn worker.
- **C-M3 The order inside the lock.** Chapter placement and manifest settled first (a 409/422 leaves nothing
  behind); the replaced body archived to `.versions/<project>/<date>-<slug>/vNNNN.<ext>` before it is
  overwritten; images stored content-addressed under `.assets/`; the file written (native: the normalized
  source with the assigned ids); Recent index and project landing (public root only); the DB upsert; the book
  manifest and rows; then the local git commit.
- **C-M4 The scoped commit.** Only the touched paths are staged (`docs/<rel>`, `docs/index.md`, plus the
  landing, archive and manifest when this write touched them), never `git add -A`; `.assets/` paths are
  dropped before git sees them; the message is `docs(<project>): add <slug>` or `… update <slug> to v<N>`,
  with a `Co-Authored-By` trailer from `co_authored_by`.
- **C-M5 No rollback.** A failed commit leaves the file and the DB row in place; the response is still 201,
  with `committed: false` and `commit_error`. `docs/` on disk is canonical.
- **C-M6 After the response.** The push and the Gemini embed are queued on one daemon worker thread with a
  FIFO queue (`server/publish.py`), submitted outside `WRITE_LOCK` because the push task re-takes it; pushes
  stay serialized; their failures are only logged; `pushed` is always false and `push_pending` says a push
  was queued.
- **C-M7 The push itself.** Only when `KB_GIT_PUSH` is on (default off: local and plugin deployments never
  push); fetch, rebase onto `origin/main`, non-force push; a failure aborts the rebase and keeps the local
  commit; every git subprocess is bounded by `KB_GIT_TIMEOUT_S` (default 60 s), which matters because the
  worker holds `WRITE_LOCK`.
- **C-M8 Why (P24.S1).** Clients with short timeouts (`/explain` posting with `curl --max-time 5`) saw
  transport failures for writes that had already landed, so network work moved behind the response.

**Expert expectations (4)**, present:

- **C-E1 Durability of the queue.** It lives in memory: a crash, or a shutdown past the 10 s drain, drops
  queued pushes; the next successful push carries the local commits; the startup reindex treats `docs/` as
  canonical and the DB as disposable.
- **C-E2 The single-worker limit** as a scaling constraint, and what multiple workers would need instead (a
  file or DB lock, a job queue), set against standard patterns (background tasks, an outbox).
- **C-E3 The response a client relies on.** `version`, `previous_version`, `archived_path`, `committed`,
  `commit_sha` (the pre-rebase local commit), `push_pending`; and that a client which lost the response
  verifies with a GET before re-POSTing.
- **C-E4 Tenants.** The git commit happens only for the public root (`ctx.is_public`); other tenants'
  content is never committed or pushed.

**Traps (5)**, each committed = a negative:

- **C-T1** The push (or the embed) happens before the 201, or `pushed: true` signals a successful publish.
- **C-T2** The server stages with `git add -A`, or ever force-pushes.
- **C-T3** A failed commit or push rolls back the saved file or row, or turns the response into an error.
- **C-T4** The publish worker pushes in parallel, or its queue is persistent.
- **C-T5** `WRITE_LOCK` described as an asyncio or database lock, or as allowing several uvicorn workers.
