# Findings: 20261023-0350-post-api-documents-write-path · round 1 · angle history
- researcher: claude-opus-5-5 · status: failed: permissions (every Bash call was denied, starting with `git -C <repo> show --stat b769236` and `git -C <repo> log --follow -- server/main.py`; so no commit message, diff, log, blame or excerpt hash. Files were read with Read at HEAD 9978d84, whose working tree was clean at session start) · tool calls: 15

**Read this first.** Bash was denied, so none of the git-history entry points ran: b769236, a36df74, abfa307, 373522d and 7c27519 were never opened. Every "why" claim below rests on the repository's own phase notes, slice results, versioned docs and code comments, read as files at HEAD. These are rung 1 for the project's stated intent. No commit sha is cited as support. **No `excerpt-sha256` was computed:** that needs `git show … | sed | shasum`, and Bash was denied. Each range below is marked `excerpt-sha256: not computed` and can be checked by its content only. Line numbers are those of the files at HEAD 9978d84. The dispatch's gitStatus snapshot showed a clean tree, but `git status --porcelain` could not be run to confirm it.

## Questions
- Q9: answered — claims: C-r1-history-01, -02, -03, -04, -05, -06, -07, -08, -09, -10, -11, -12 — note: every invariant is stated in a code comment or docstring and again in docs/current (api.md v0018, architecture.md v0017). C-12 narrows "no network before 201" to GitHub and Gemini, because Postgres hops remain.
- Q10: answered — claims: C-r1-history-13, -14, -15, -16, -17, -18, -19 — note: rests on P24 intent.md and phase.md, the publish.py module docstring and the docs. Commit b769236 itself was not read (Bash denied).
- Q11: answered (from notes and code comments only; the commits were not read) — claims: C-r1-history-20, -21, -22, -23, -24 — note: P23 versions, P30.S2 books, P30.S4 assets, P30.S5 native, P31.S1 check.

## Sources

### S-r1-history-01
- repo: /private/tmp/claude-502/-Users-sugang-projects-personal-knowledge/c2016e8a-14bf-4ba0-89b3-a899f1c9c55e/scratchpad/s7/runs/new-c/knowledge · commit: 9978d8447ed2c5aaf4a7de2e7e6ed7efc0fae32e · date: not read (git denied; HEAD of the run)
- title: the knowledge repository at HEAD · authors: n/a · publisher: n/a
- accessed: 2026-10-23 · read-via: Read tool on working-tree files at HEAD (clean per the session's gitStatus snapshot) · quote-match: exact · archive: none
- kind: code (with in-repo docs: docs/current/*.md and works/phases/active/P2x–P31 notes) · peer-review: n/a
- owner: the knowledge project (operator leetusik) · upstream: none
- lateral: the project's own repository. Its docs/current files are generated from versioned docs, and its works/ phase notes are the workflow's own records. Rung 1 for what the project states and does.
- passages (the claims' ranges; excerpts are quoted in the claims):
  - P1 · server/main.py:L72-L74 (lifespan: docs/ canonical)
  - P2 · server/main.py:L89-L97 (shutdown drain)
  - P3 · server/main.py:L179-L183 (WRITE_LOCK, single worker)
  - P4 · server/main.py:L186-L202 (_push_task)
  - P5 · server/main.py:L205-L213 (_embed_task docstring)
  - P6 · server/main.py:L1311-L1318 (create_document docstring)
  - P7 · server/main.py:L1371-L1378 (step 3, lock and manifest first)
  - P8 · server/main.py:L1408-L1411 (3a archive before overwrite)
  - P9 · server/main.py:L1559-L1560 (step 4, commit not rolled back)
  - P10 · server/main.py:L1604-L1622 (step 4b, after-response work)
  - P11 · server/main.py:L1688-L1697 (response keys commit_sha / pushed / push_pending)
  - P12 · server/publish.py:L1-L35 (module docstring)
  - P13 · server/publish.py:L105-L113 (drain)
  - P14 · server/gitops.py:L13-L17, L37-L46 (git timeout)
  - P15 · docs/current/architecture.md:L22, L26-L39 (API-Owns-Writes Flow)
  - P16 · docs/current/architecture.md:L58-L66 (write path became the publish path)
  - P17 · docs/current/api.md:L43 (P24 status paragraph)
  - P18 · docs/current/api.md:L141-L144 (commit/push semantics)
  - P19 · works/phases/active/P24/intent.md:L13, L19, L27-L28
  - P20 · works/phases/active/P24/phase.md:L43-L117 (confirmed failure mode, fix shape)
  - P21 · works/phases/active/P24/phase.md:L166-L194 (landed in S1)
  - P22 · works/phases/active/P24/phase.md:L221-L234, L305-L310 (client honesty, S2/S3)
  - P23 · works/phases/active/P24/phase.md:L359-L375, L394-L404, L464-L468 (review and F1)
  - P24 · works/phases/active/P23/intent.md:L19, L28
  - P25 · server/main.py:L612-L621 (DocumentIn new_version comment)
  - P26 · docs/current/api.md:L137-L138 (versioned re-publish, overwrite archives)
  - P27 · server/main.py:L709-L716 (_place_variant docstring); L1577-L1579
  - P28 · works/phases/active/P30/slices/P30.S2/result.md:L9, L44
  - P29 · server/main.py:L602-L608 (format native); works/phases/active/P30/slices/P30.S5/result.md:L9, L50-L59
  - P30 · server/main.py:L938-L948 (_check_document); works/phases/active/P31/slices/P31.S1/result.md:L9, L28-L30
  - P31 · server/main.py:L1448-L1452; server/gitops.py:L54-L56 (assets never committed)
  - P32 · server/main.py:L815-L826 (ensure_registry_project); server/main.py:L107-L120 (metering middleware)

## Claims

### C-r1-history-01
- claim: The knowledge project states that the markdown files under `docs/` on disk are the canonical store and that the SQLite database is a disposable projection, rebuilt from the files by a reindex; the API runs a full reindex on boot to cure drift.
- kind: definition · questions: Q9 · load-bearing: yes (the root invariant the write ordering and "never roll back" rest on)
- support: S-r1-history-01 · docs/current/architecture.md:L22@9978d84 · rung 1 · fit direct · upstream self
  excerpt (L22):
    - **Persistence**: `docs/` markdown is the **canonical** store; SQLite (`data/kb.sqlite3`, FTS5, WAL) is a **disposable projection** rebuilt from files by reindex.
  excerpt-sha256: not computed (Bash denied)
- support: S-r1-history-01 · server/main.py:L72-L74@9978d84 · rung 1 · fit direct · upstream self
  excerpt (L72–L74):
    # Startup drift self-heal: docs/ is canonical, the DB is disposable — a full
    # reindex on boot cures manual edits, fallback writes, and git resets. The
    # embedding sync inside is content-hash cached, so a clean boot is ~free.
  excerpt-sha256: not computed (Bash denied)
- scope: content plane (the files and SQLite); architecture.md v0017 (P25.REVIEW); code at HEAD 9978d84
- confidence: high · flags: none
- conflicts: none

### C-r1-history-02
- claim: In `POST /api/documents`, a failed local git commit never rolls back the document file or the DB row: the handler still answers 201, with `committed: false` and a `commit_error`.
- kind: behaviour · questions: Q9 · load-bearing: yes
- support: S-r1-history-01 · server/main.py:L1311-L1313@9978d84 · rung 1 · fit direct · upstream self
  excerpt (L1311–L1313):
    """Own the whole write path: convention-exact docs/ file + Recent bullet + DB
    upsert + scoped LOCAL git commit, all under WRITE_LOCK. docs/ stays canonical — a
    failed commit never rolls back the file/DB (responds 201, committed:false).
  excerpt-sha256: not computed (Bash denied)
- support: S-r1-history-01 · server/main.py:L1559-L1560@9978d84 · rung 1 · fit direct · upstream self
  excerpt (L1559–L1560):
        # 4. Git only when requested AND enabled. A failed commit is NOT rolled
        #    back — the file/DB stay written; report committed:false + commit_error.
  excerpt-sha256: not computed (Bash denied)
- support: S-r1-history-01 · docs/current/api.md:L141@9978d84 · rung 1 · fit direct · upstream self
  excerpt (L141):
    - Commit semantics: the scoped commit is **local and in-request** (fast — no network), and a **failed commit never rolls back** the file/DB → still **201** with `committed:false` + `commit_error`. …
  excerpt-sha256: not computed (Bash denied)
- scope: HEAD 9978d84; api.md v0018
- confidence: high · flags: none
- conflicts: none

### C-r1-history-03
- claim: In `server/main.py`, one process-wide `threading.Lock` named `WRITE_LOCK` serializes the write critical section (file, then index, then DB, then git). A comment calls it load-bearing that the API runs a single uvicorn worker, so the in-process lock is enough, and says never to scale to multiple workers.
- kind: fact · questions: Q9 · load-bearing: yes
- support: S-r1-history-01 · server/main.py:L179-L183@9978d84 · rung 1 · fit direct · upstream self
  excerpt (L179–L183):
    # One process-wide lock serializes the whole write critical section (file → index
    # → DB → git). Load-bearing invariant: the API runs a SINGLE uvicorn worker, so an
    # in-process lock is sufficient; never scale to multiple workers. WAL gives reads
    # concurrency regardless.
    WRITE_LOCK = threading.Lock()
  excerpt-sha256: not computed (Bash denied)
- scope: HEAD 9978d84; P24 phase.md L138-L139 repeats it as a constraint ("Single uvicorn worker + non-reentrant `WRITE_LOCK` … do not introduce a second worker or a lock re-entry")
- confidence: high · flags: none
- conflicts: none

### C-r1-history-04
- claim: `WRITE_LOCK` is not reentrant, and the after-response push task re-takes it because a git rebase mutates the work tree; for that reason `create_document` submits the push task from outside the locked section.
- kind: behaviour · questions: Q9 · load-bearing: yes
- support: S-r1-history-01 · server/main.py:L1371-L1374@9978d84 · rung 1 · fit direct · upstream self
  excerpt (L1371–L1374):
        # 3. Locked critical section: archive -> file write -> index update -> DB upsert
        #    -> LOCAL git add/commit. (WRITE_LOCK is NOT reentrant — nothing called in
        #    here may retake it, which is why the push is queued outside it in 4b.)
        with WRITE_LOCK:
  excerpt-sha256: not computed (Bash denied)
- support: S-r1-history-01 · server/main.py:L186-L202@9978d84 · rung 1 · fit direct · upstream self
  excerpt (L189–L192, L198–L200):
        ``root`` is captured at submit time (never re-read from the env in the
        worker). The task re-takes ``WRITE_LOCK`` — the rebase mutates the work tree
        and must not race another write's file write — which is exactly why it is
        submitted from OUTSIDE the lock (``WRITE_LOCK`` is not reentrant) and why
        …
        def _task() -> None:
            with WRITE_LOCK:
                gitops.push(root=root)
  excerpt-sha256: not computed (Bash denied)
- support: S-r1-history-01 · server/main.py:L1610-L1612@9978d84 · rung 1 · fit direct · upstream self
  excerpt (L1610–L1612):
        #     (FIFO, serialized) and run after this handler returns; submitting is a
        #     queue append, and it happens OUTSIDE WRITE_LOCK because the push task
        #     re-takes that lock (it is not reentrant).
  excerpt-sha256: not computed (Bash denied)
- scope: since P24.S1; HEAD 9978d84
- confidence: high · flags: none
- conflicts: none

### C-r1-history-05
- claim: Since P24.S1, the `create_document` docstring states that nothing in the pre-response path of `POST /api/documents` makes a network round-trip: the push to origin/main and the Gemini embed are queued on the publish worker and run after the 201 is written.
- kind: behaviour · questions: Q9, Q10 · load-bearing: yes
- support: S-r1-history-01 · server/main.py:L1315-L1318@9978d84 · rung 1 · fit direct · upstream self
  excerpt (L1315–L1318):
    Nothing in the pre-response path makes a network round-trip (P24.S1): the push
    to origin/main and the Gemini embed are queued on the publish worker and run
    after the 201 is written, so a caller's timeout budget only ever covers local
    work (see step 4b)."""
  excerpt-sha256: not computed (Bash denied)
- support: S-r1-history-01 · server/main.py:L1604-L1609@9978d84 · rung 1 · fit direct · upstream self
  excerpt (L1604–L1609):
        # 4b. AFTER-RESPONSE publish work (P24.S1). Everything above is durable: the
        #     file is on disk, the DB transaction is committed, the local commit is
        #     made. What remains — the push to origin/main (fetch + rebase + push:
        #     two SSH round-trips) and the Gemini embed — is publish/side-effect work
        #     whose result never appears in the response, so it must not spend the
        #     caller's timeout budget. Both are queued on the single publish worker
  excerpt-sha256: not computed (Bash denied)
- support: S-r1-history-01 · docs/current/architecture.md:L28, L37@9978d84 · rung 1 · fit direct · upstream self
  excerpt (L37, start):
    **(P24) The response/publish split is the load-bearing boundary.** Everything the caller waits for is local disk + SQLite; every network round-trip (GitHub over SSH, Gemini over HTTPS) sits behind the response on a single FIFO worker thread.
  excerpt-sha256: not computed (Bash denied)
- scope: "network" here means GitHub and Gemini; see C-r1-history-12 for the Postgres hops that remain
- confidence: high · flags: none
- conflicts: none

### C-r1-history-06
- claim: Every git subprocess in `server/gitops.py` is bounded by `KB_GIT_TIMEOUT_S` (default 60 s), and a timeout surfaces as `GitError`. The module docstring calls the cap load-bearing since P24, because the push runs on the after-response worker while holding `WRITE_LOCK`, and an unbounded network stage there would wedge every later write.
- kind: behaviour · questions: Q9, Q10 · load-bearing: yes
- support: S-r1-history-01 · server/gitops.py:L13-L17@9978d84 · rung 1 · fit direct · upstream self
  excerpt (L13–L17):
    Every subprocess here is bounded by ``KB_GIT_TIMEOUT_S`` (``config.git_timeout_s``,
    default 60s): a git that exceeds it is killed and surfaces as ``GitError`` like any
    other failure. That cap is load-bearing since P24 — the push runs on the
    after-response publish worker while holding ``WRITE_LOCK``, so an unbounded network
    stage there would wedge every later write in the process.
  excerpt-sha256: not computed (Bash denied)
- support: S-r1-history-01 · server/gitops.py:L37-L46@9978d84 · rung 1 · fit direct · upstream self
  excerpt (L39–L41, L46):
        limit = config.git_timeout_s() if timeout is None else timeout
        try:
            proc = subprocess.run(cmd, capture_output=True, text=True, timeout=limit)
        …
            raise GitError(cmd, f"timed out after {limit:g}s") from exc
  excerpt-sha256: not computed (Bash denied)
- scope: HEAD 9978d84; the default of 60 is stated in the docstring and in P24 phase.md L184; config.py itself was not read
- confidence: high · flags: none
- conflicts: none

### C-r1-history-07
- claim: Since P24, the 201 of `POST /api/documents` carries `pushed: false` on every path. `pushed: false` keeps its documented meaning ("saved; publishes on the next successful push"); the additive `push_pending: true` says a push to origin/main was queued and runs right after the response; and `push_error` no longer appears in any response.
- kind: behaviour · questions: Q9 · load-bearing: yes
- support: S-r1-history-01 · server/main.py:L1613-L1622@9978d84 · rung 1 · fit direct · upstream self
  excerpt (L1613–L1622):
        #     `pushed` therefore stays false on every path now — it keeps its
        #     documented "saved, publishes on the next successful push" meaning, and
        #     `push_pending` says whether that push is already on its way. A failed
        #     background push is logged (container log), not reported here: the
        #     response is long gone by then, so `push_error` no longer appears.
        pushed = False
        push_pending = False
        if committed and config.git_push_enabled():
            push_pending = True
            publish.submit(f"push {rel}", _push_task(config.kb_root()))
  excerpt-sha256: not computed (Bash denied)
- support: S-r1-history-01 · server/main.py:L1692-L1697@9978d84 · rung 1 · fit direct · upstream self
  excerpt (L1692–L1697):
        # Unchanged meaning ("saved; publishes on the next successful push"), and
        # now always false when a push was deferred rather than skipped.
        "pushed": pushed,
        # Additive (P24): a push to origin/main was QUEUED and runs right after
        # this response. The document is already durably saved either way.
        "push_pending": push_pending,
  excerpt-sha256: not computed (Bash denied)
- support: S-r1-history-01 · docs/current/api.md:L144@9978d84 · rung 1 · fit direct · upstream self
  excerpt (L144, part):
    … `push_pending:true` means a push was queued and starts right after this response; `pushed` is then **`false`**, because at the moment the body is written the push has not run. **`push_error` no longer exists in any response** … A `pushed:false` write still **succeeded**: the doc is written + committed locally and publishes on the **next** successful push.
  excerpt-sha256: not computed (Bash denied)
- scope: `push_pending` is true only when the write committed and `KB_GIT_PUSH` is enabled (the hosted box); otherwise false
- confidence: high · flags: none
- conflicts: none

### C-r1-history-08
- claim: Since P24, the `commit_sha` in the 201 of `POST /api/documents` is the local commit the request made (pre-rebase), not the published head, because the rebase happens after the response.
- kind: behaviour · questions: Q9, Q10 · load-bearing: yes
- support: S-r1-history-01 · server/main.py:L1688-L1691@9978d84 · rung 1 · fit direct · upstream self
  excerpt (L1688–L1691):
        # The LOCAL commit this request made. Since P24 the rebase happens after
        # the response, so this is no longer necessarily the published (post-
        # rebase) head — see `push_pending`.
        "commit_sha": commit_sha,
  excerpt-sha256: not computed (Bash denied)
- support: S-r1-history-01 · works/phases/active/P24/phase.md:L111-L112@9978d84 · rung 1 · fit direct · upstream self
  excerpt (L111–L112):
      Flagged behavior change for the review: `commit_sha` can no longer be the *published*
      (post-rebase) HEAD, because the rebase now happens after the response.
  excerpt-sha256: not computed (Bash denied)
- scope: since P24.S1
- confidence: high · flags: none
- conflicts: none

### C-r1-history-09
- claim: The project's docs state, as a rule for every client, that `pushed: false` must never be read as a failure or retried on, and that a lost or timed-out write response is not evidence of failure: the client should verify by reading the document back, never blind-retry.
- kind: fact · questions: Q9 · load-bearing: yes
- support: S-r1-history-01 · docs/current/api.md:L43@9978d84 · rung 1 · fit direct · upstream self
  excerpt (L43, end):
    … **A client must never read `pushed:false` as a failure and must never retry on it.**
  excerpt-sha256: not computed (Bash denied)
- support: S-r1-history-01 · docs/current/architecture.md:L39@9978d84 · rung 1 · fit direct · upstream self
  excerpt (L39, end):
    … The corollary for every client: **a lost or timed-out write response is not evidence of failure** — verify by reading the document back, never blind-retry.
  excerpt-sha256: not computed (Bash denied)
- scope: api.md v0018, architecture.md v0017
- confidence: high · flags: none
- conflicts: none

### C-r1-history-10
- claim: `server/publish.py` (P24.S1) runs after-response work on one process-wide daemon worker thread fed by a FIFO queue, started lazily on the first submit. `submit` only appends to the queue, one worker keeps pushes serialized in submit order, and a failed task is logged to stdout (the container log), never reported to the caller.
- kind: behaviour · questions: Q9, Q10 · load-bearing: yes
- support: S-r1-history-01 · server/publish.py:L12-L31@9978d84 · rung 1 · fit direct · upstream self
  excerpt (L12–L15, L20–L21, L28–L31):
    Shape: **one process-wide daemon worker thread + a FIFO queue**, started lazily on
    the first submit. Deliberate properties:

    * **The request thread never waits on it.** ``submit`` only appends to a queue;
    …
    * **Pushes stay serialized.** One worker, FIFO — never two concurrent rebases,
      and one push per write in submit order (coalescing is a possible future
    …
    * **Failures never reach the caller** (the response is long gone): a task's
      exception is logged to stdout — the container log is the operator's surface —
      and kept in ``last_error()`` for tests. The write itself is already durable;
      a failed push republishes on the next successful one.
  excerpt-sha256: not computed (Bash denied)
- scope: HEAD 9978d84
- confidence: high · flags: none
- conflicts: none

### C-r1-history-11
- claim: `publish.drain()` is the publish worker's only synchronization point: the docstrings forbid calling it from a request path or while holding `WRITE_LOCK`. The app's shutdown hook drains with a 10 s timeout, and any task still pending is dropped; the comment says the document then publishes on the next successful push.
- kind: behaviour · questions: Q9 · load-bearing: no (a detail of the worker's lifecycle)
- support: S-r1-history-01 · server/publish.py:L33-L34, L105-L113@9978d84 · rung 1 · fit direct · upstream self
  excerpt (L33–L34, L108–L110):
    ``drain()`` blocks until the queue is empty (tests, and the app's shutdown hook).
    It is the only synchronization point; nothing in a request path may call it.
    …
        For tests (deterministic assertions on the side effect) and the app's
        shutdown hook. Never call this from a request path, and never while holding
        ``WRITE_LOCK`` — a queued push takes that lock.
  excerpt-sha256: not computed (Bash denied)
- support: S-r1-history-01 · server/main.py:L89-L93@9978d84 · rung 1 · fit direct · upstream self
  excerpt (L89–L93):
        # Give the after-response publish worker a bounded chance to finish its
        # queued push/embed work before the process goes away (P24.S1). Best-effort:
        # anything still pending is dropped, and the doc publishes on the next
        # successful push — docs/ on disk is canonical either way.
        if not publish.drain(timeout=10.0):
  excerpt-sha256: not computed (Bash denied)
- scope: HEAD 9978d84
- confidence: high · flags: none
- conflicts: none

### C-r1-history-12
- claim: The "no network round-trip before the 201" invariant covers GitHub and Gemini only. In tenant mode, an async dependency (`ensure_registry_project`) awaits a Postgres get-or-create before the sync handler runs. The P24 phase notes also record that the metering middleware's Postgres write still happens after the handler returns and before the body reaches the client, and call it a local-container hop of milliseconds.
- kind: behaviour · questions: Q9 · load-bearing: yes (bounds the scope of the headline invariant)
- support: S-r1-history-01 · server/main.py:L815-L826@9978d84 · rung 1 · fit direct · upstream self
  excerpt (L821–L826):
        An **async** dependency because the ``create_document`` handler is sync (it holds
        ``WRITE_LOCK`` over a sqlite critical section and cannot ``await`` Postgres), yet
        the ``projects`` row must exist by the time the write lands so an unregistered
        name stops leaving the registry blank. FastAPI shares the parsed ``DocumentIn``
        body with the handler and caches ``resolve_api_write`` per request, so this runs
        exactly once, before the handler.
  excerpt-sha256: not computed (Bash denied)
- support: S-r1-history-01 · works/phases/active/P24/phase.md:L51, L71-L73, L191-L194@9978d84 · rung 1 · fit direct · upstream self
  excerpt (L51, L71–L73, L193–L194):
    1. `ensure_registry_project` (async dep) — Postgres get-or-create (ms, local container).
    …
    7. The `usage_metering` middleware (`server/main.py:86-109`) is a `BaseHTTPMiddleware`, so
       its `await record_usage(hint)` Postgres write happens **after** the handler returns and
       **before** the response body reaches the client — one more pre-response network hop.
    …
      metering middleware's Postgres write still happens between handler return and the
      body reaching the client (local container, ms).
  excerpt-sha256: not computed (Bash denied)
- scope: tenant mode only (`DATABASE_URL` set); in legacy mode both are inert (main.py L837-L838; L109-L120). `resolve_org_slug` (main.py L847-L865) is a second async Postgres read before the handler, same rationale.
- confidence: high · flags: none
- conflicts: none

### C-r1-history-13
- claim: Before P24, `POST /api/documents` ran `gitops.push` (`git fetch origin main`, then `git rebase origin/main`, then `git push origin HEAD:main`: two SSH round-trips to GitHub plus a rebase) inside `WRITE_LOCK` and in-request, with no subprocess timeout. The Gemini embed ran outside the lock but still before the response. That is how the P24 decomposition recorded the code it found.
- kind: fact · questions: Q10 · load-bearing: yes
- support: S-r1-history-01 · works/phases/active/P24/phase.md:L58-L70@9978d84 · rung 1 · fit direct · upstream self
  excerpt (L58–L63, L68–L70):
    5. **`gitops.push` — the smoking gun** (`server/main.py:793-798`, `server/gitops.py:58-91`).
       Prod runs with `KB_GIT_PUSH: "true"` (`compose.prod.yml:52`), and push is
       `git fetch origin main` → `git rebase origin/main` → `git push origin HEAD:main` —
       **two SSH round-trips to GitHub plus a rebase**, executed **inside `WRITE_LOCK`,
       in-request**. `gitops._run` is `subprocess.run(...)` with **no `timeout=` argument at
       all** (`server/gitops.py:29-36`), so this stage is *unbounded*: …
    …
    6. **Gemini embed** (`server/main.py:803-819` → `server/embeddings.py:108-163`) — one
       `client.models.embed_content` HTTPS call per write, no explicit client timeout,
       `retries=0`. Runs outside the lock but still **before** the response.
  excerpt-sha256: not computed (Bash denied)
- support: S-r1-history-01 · server/publish.py:L3-L7@9978d84 · rung 1 · fit direct · upstream self
  excerpt (L3–L7):
    Why this exists. ``POST /api/documents`` used to do two *network* stages between
    the durable save (file + DB commit) and the 201 it writes: ``gitops.push``
    (``git fetch`` → ``git rebase`` → ``git push`` — two SSH round-trips to GitHub,
    and until P24 with no subprocess timeout at all) and the Gemini embed. Both are
- scope: the pre-P24 code, as described in the P24 notes; the old code was not read directly (git denied). The line numbers inside the excerpt are the pre-P24 ones the note cites.
- confidence: high · flags: none
- conflicts: none

### C-r1-history-14
- claim: P24 started from an operator report: changple5 prod uploaded documents to knowledge prod successfully, but its client reported a disconnect. The decomposition confirmed the cause: the `/explain` skill posted with `curl --max-time 5`, and the 5 s budget was spent on network stages that ran after the document was durably saved and before the 201, so the client timed out on a write that had already landed.
- kind: fact · questions: Q10 · load-bearing: yes
- support: S-r1-history-01 · works/phases/active/P24/intent.md:L13, L19@9978d84 · rung 1 · fit direct · upstream self
  excerpt (L13):
    > 4. changple5 prod successfully connected to the knowledge prod. but reported some callback? is disconnected. even the docuemnt uploading it self is successful.
  excerpt-sha256: not computed (Bash denied)
- support: S-r1-history-01 · works/phases/active/P24/phase.md:L45-L47, L92-L95@9978d84 · rung 1 · fit direct · upstream self
  excerpt (L45–L47, L92–L95):
    The client's 5 s budget is spent on network stages that run **after the document is
    already durably saved** and **before** the 201 is written. Nothing in the path has a
    timeout short enough to protect it.
    …
    Verdict: the operator's hypothesis is **confirmed**, with one refinement — the culprit is
    not "git commit" but the **network** stages (git fetch/rebase/push, and secondarily the
    Gemini embed and the metering write) that sit between the durable save and the 201, none
    of which is bounded by any timeout.
  excerpt-sha256: not computed (Bash denied)
- support: S-r1-history-01 · server/publish.py:L7-L10@9978d84 · rung 1 · fit direct · upstream self
  excerpt (L7–L10):
    publish/side-effect work whose result never appears in the response, yet both
    spent the caller's timeout budget — so a client with a short deadline (``/explain``
    posts with ``curl --max-time 5``) saw a transport failure for a write that had
    already landed. This module moves that work behind the response.
  excerpt-sha256: not computed (Bash denied)
- scope: P24 (intent captured 2026-08-05); the diagnosis was "confirmed from code", not from prod instrumentation (phase.md L35-L38)
- confidence: high · flags: none
- conflicts: none

### C-r1-history-15
- claim: The P24 decomposition chose not to make the push faster but to move it off the response path. The commit stays in-request (local and fast) so `committed` and `commit_sha` stay truthful; the Gemini embed moves behind the response too; every git subprocess gets a timeout; and the response changes only additively (`pushed: false` stays truthful, and a new field such as `push_pending` is added instead of repurposing an existing one).
- kind: fact · questions: Q10 · load-bearing: yes
- support: S-r1-history-01 · works/phases/active/P24/phase.md:L99-L110@9978d84 · rung 1 · fit direct · upstream self
  excerpt (L99–L102, L108–L110):
    - **Do not** try to make the push fast — it is inherently two network round-trips. Move it
      **off the response path**: commit stays in-request (local, fast, keeps `committed` /
      `commit_sha` truthful); push runs after the response.
    - Run the Gemini embed there too (its result never appears in the response).
    …
    - Keep the response **additive**: no field removed, no type changed. `pushed:false` already
      means "saved, publishes on the next successful push" (`docs/current/api.md:139`), so it
      stays truthful; add something like `push_pending: true` rather than repurposing a field.
  excerpt-sha256: not computed (Bash denied)
- scope: P24.DECOMP decision; P24.S1 landed it (phase.md L166-L185)
- confidence: high · flags: none
- conflicts: none

### C-r1-history-16
- claim: P24.S1 chose a module-level worker thread with a queue over Starlette `BackgroundTasks` because, with the `BaseHTTPMiddleware` metering in the stack, ordering against the response is subtle; the publish.py docstring says the queue makes "the response never waits" a property of the code, not of the ASGI stack.
- kind: fact · questions: Q10 · load-bearing: no (explains the mechanism choice)
- support: S-r1-history-01 · server/publish.py:L15-L19@9978d84 · rung 1 · fit direct · upstream self
  excerpt (L15–L19):
    * **The request thread never waits on it.** ``submit`` only appends to a queue;
      the handler returns its 201 immediately. (Starlette ``BackgroundTasks`` would
      also run after the handler, but ordering against the ``BaseHTTPMiddleware``
      metering in the stack is subtle — a queue makes "the response never waits" a
      property of the code, not of the ASGI stack.)
  excerpt-sha256: not computed (Bash denied)
- support: S-r1-history-01 · works/phases/active/P24/phase.md:L113-L117@9978d84 · rung 1 · fit direct · upstream self
  excerpt (L115–L117):
      or Starlette `BackgroundTasks`. **If `BackgroundTasks` is chosen, prove the
      response actually reaches the client first** — with `BaseHTTPMiddleware` in the stack the
      ordering is subtle, and getting it wrong reproduces the bug it is meant to fix.
  excerpt-sha256: not computed (Bash denied)
- scope: P24.S1
- confidence: high · flags: none
- conflicts: none

### C-r1-history-17
- claim: After P24.S1, the two shipped clients were changed to match. The `/explain` skill raised its publish POST to `curl --max-time 30` and verifies with `GET /api/documents/by-path/<rel_path>` after a transport failure (one verification, at most one retry). The `knowledge save` CLI uses a per-call 30 s write timeout and verifies without re-POSTing.
- kind: fact · questions: Q10 · load-bearing: no (client-side consequence)
- support: S-r1-history-01 · works/phases/active/P24/phase.md:L221-L234, L302-L310@9978d84 · rung 1 · fit direct · upstream self
  excerpt (L221–L223, L229–L231, L305–L306):
    - **A transport failure on a mutating call is not evidence of failure.** The rule the
      skill now encodes (its new `§5.1`): after a timeout/transport error on the publish
      POST, ask the API what is at the target `rel_path`
    …
      transport layer is the only route into the local fallback. **Never loop: one
      verification, at most one retry.**
    - **Publish budget raised to `--max-time 30`** for the POST (was 5). Rationale, reusable
    …
    - **Timeout budget:** the save POST gets `client.WRITE_TIMEOUT = 30` as a **per-call**
      override (`document_create` only); reads stay on `DEFAULT_TIMEOUT = 15`. Same number
  excerpt-sha256: not computed (Bash denied)
- scope: P24.S2 (skill), P24.S3 (CLI)
- confidence: high · flags: none
- conflicts: none

### C-r1-history-18
- claim: The first P24 review returned `changes_requested`: P24 had removed the only in-band push-health signal (`pushed` became a constant false and `push_error` unreachable), so a failed background push was visible only as a `[kb-api] publish: … FAILED` container log line. Fix slice P24.F1 replaced the bring-up check with a negative log grep plus `git rev-list --count origin/main..HEAD` == 0.
- kind: fact · questions: Q10 · load-bearing: no (operational consequence)
- support: S-r1-history-01 · works/phases/active/P24/phase.md:L359-L365, L394-L399@9978d84 · rung 1 · fit direct · upstream self
  excerpt (L359–L362, L394–L398):
    - **The one blocking finding: P24 deleted the only in-band push-health signal without
      replacing the procedure that depends on it.** `pushed` is now a constant `false` and
      `push_error` is unreachable, so `deploy/README.md:184-189`'s bring-up instruction
      ("check `pushed:true` on the first write") can never pass, and P8.F2's lesson in
    …
    - **`server/publish.py` logs failures ONLY.** `_log` is called from exactly one place,
      `_loop`'s `except` branch (`publish.py:66`) — there is **no success line**. So
      "grep the log for `publish:`" is a *negative* check (expect no output; `grep` exits
      1 on the healthy box), and the positive assertion has to come from git state:
      `git -C /opt/knowledge rev-list --count origin/main..HEAD` == 0. Both are now in
  excerpt-sha256: not computed (Bash denied)
- scope: P24.REVIEW first pass and P24.F1; the second-pass review passed (phase.md L431)
- confidence: high · flags: none
- conflicts: none

### C-r1-history-19
- claim: P24 left one accepted limit: the Gemini embed on the publish worker has no client timeout, so a stalled embed blocks the single FIFO worker and every push queued behind it until restart. The P24 notes call this availability of the off-box backup, not correctness, because writes stay durable.
- kind: fact · questions: Q10, Q9 · load-bearing: no (a known limit worth a caution in the chapter)
- support: S-r1-history-01 · works/phases/active/P24/phase.md:L464-L468@9978d84 · rung 1 · fit direct · upstream self
  excerpt (L464–L468):
    - **The deferred job from the first pass still stands** (not a fix slice): bound the
      Gemini embed on the publish worker. A stalled embed blocks the single FIFO queue and
      therefore every push behind it until restart — availability of the off-box backup,
      not correctness. It is now recorded as an accepted limit in `backend.md`,
      `operations.md` and `qa.md`; the orchestrator may `defer-job` it.
  excerpt-sha256: not computed (Bash denied)
- scope: as of P24's close. Whether a later phase bounded the embed was not checked: `server/embeddings.py` was not read.
- confidence: medium (may have changed after P24) · flags: none
- conflicts: none

### C-r1-history-20
- claim: P23 (document version control) changed the write path so that a re-publish no longer has to destroy the old body. Before P23, document identity was `UNIQUE(tenant_id, rel_path)` and the only re-publish option was a destructive `overwrite: true`. Since P23, `new_version: true` archives the current body under `<root>/.versions/` and writes the new body at the same rel_path, so the document's id, URL and graph edges never move; `overwrite: true` archives too. The archive is taken inside the lock, before the file is overwritten.
- kind: fact · questions: Q11 · load-bearing: no
- support: S-r1-history-01 · works/phases/active/P23/intent.md:L19@9978d84 · rung 1 · fit direct · upstream self
  excerpt (L19, part):
    Add version control to knowledge documents. Today posts have no version concept — identity is `UNIQUE(tenant_id, rel_path)` and the only re-publish option is a destructive `overwrite: true`. …
  excerpt-sha256: not computed (Bash denied)
- support: S-r1-history-01 · server/main.py:L612-L619@9978d84 · rung 1 · fit direct · upstream self
  excerpt (L612–L616):
        # Versioned re-publish (P23, additive — both default to today's behavior).
        # `new_version: true` republishes an EXISTING document as its next version:
        # the current body is archived under <root>/.versions/ and the new body is
        # written at the SAME rel_path, so the document's identity (id, URL, graph
        # edges) never moves. `rel_path` names the target explicitly; without it the
  excerpt-sha256: not computed (Bash denied)
- support: S-r1-history-01 · server/main.py:L1408-L1411@9978d84 · rung 1 · fit direct · upstream self
  excerpt (L1408–L1411):
            # 3a. Archive the body about to be replaced, BEFORE it is overwritten, to
            #     <root>/.versions/<project>/<date>-<slug>/vNNNN.<ext>. `None` when
            #     there is nothing on disk to keep (a fresh create, or a DB row whose
            #     file vanished).
  excerpt-sha256: not computed (Bash denied)
- support: S-r1-history-01 · docs/current/api.md:L138@9978d84 · rung 1 · fit direct · upstream self
  excerpt (L138, start):
    - **`overwrite: true` now archives the body it replaces (P23)** and bumps the version too (it archives v`N` and publishes v`N+1`, sharing one chain with `new_version`). …
  excerpt-sha256: not computed (Bash denied)
- scope: P23 onward. Commit a36df74 was named in the dispatch but not read (Bash denied).
- confidence: high · flags: none
- conflicts: none

### C-r1-history-21
- claim: P30.S2 (books and chapters) added publish placement to `POST /api/documents`. Inside `WRITE_LOCK`, before any file is touched, the handler settles the book manifest (re-read under the lock as the authoritative copy) so that a binding conflict (409) or an uncreatable book (422) leaves nothing behind. The manifest file is staged in the chapter's own scoped commit, and a re-publish of a bound (book, chapter key, lang) becomes that document's next version.
- kind: fact · questions: Q11 · load-bearing: no
- support: S-r1-history-01 · server/main.py:L1375-L1378@9978d84 · rung 1 · fit direct · upstream self
  excerpt (L1375–L1378):
            # 3-. Chapter placement (P30.S2): settle the manifest FIRST, before any file
            #     is touched, so a binding conflict (409) or a book that cannot be created
            #     (422) leaves nothing behind. Re-read under the lock: it is the
            #     authoritative copy.
  excerpt-sha256: not computed (Bash denied)
- support: S-r1-history-01 · server/main.py:L1577-L1579@9978d84 · rung 1 · fit direct · upstream self
  excerpt (L1577–L1579):
                    if manifest_rel is not None:
                        # The book manifest rides in the chapter's own scoped commit.
                        staged.append(f"docs/{manifest_rel}")
  excerpt-sha256: not computed (Bash denied)
- support: S-r1-history-01 · works/phases/active/P30/slices/P30.S2/result.md:L9@9978d84 · rung 1 · fit direct · upstream self
  excerpt (L9, part):
    … publish placement on `POST /api/documents`: the manifest goes in the same commit as the chapter, and a re-publish of `(book, key, lang)` becomes that variant's next version. … All of it is additive: a loose publish that sends no new field is unchanged.
  excerpt-sha256: not computed (Bash denied)
- scope: P30.S2. Commit abfa307 was named in the dispatch but not read (Bash denied).
- confidence: high · flags: none
- conflicts: none

### C-r1-history-22
- claim: P30.S5 added `format: "native"` to `POST /api/documents`. The server writes the chapter's header, parses and validates the body, and returns every violation in one 422 list. A native re-publish onto an html document is an in-place migration under the write lock: the row is re-keyed (id kept), the html body is archived, the native file is written at `<stem>.md`, and the `.html` file is unlinked and its deletion staged with `git rm`.
- kind: fact · questions: Q11 · load-bearing: no
- support: S-r1-history-01 · server/main.py:L605-L608@9978d84 · rung 1 · fit direct · upstream self
  excerpt (L605–L608):
        # "native" (P30.S5) is a native chapter: `markdown` carries its body WITHOUT a
        # header (the server writes the header, adding `format: native` / `syntax: 1`);
        # the body is parsed and validated, and every violation is one 422 list.
        format: Literal["md", "html", "native"] = "md"
  excerpt-sha256: not computed (Bash denied)
- support: S-r1-history-01 · works/phases/active/P30/slices/P30.S5/result.md:L53-L57@9978d84 · rung 1 · fit direct · upstream self
  excerpt (L53–L57):
    - The migration is triggered by any re-publish that resolves an html target: book placement, `new_version` by slug, or an explicit `rel_path`, the old `.html` path included. Under the write lock:
      - `_place_variant(replaces=old)` treats the old path's binding as this document's. Without book fields, the manifest binding the old path is re-pointed instead.
      - `db.rekey_document` moves the `documents` row (id kept) and its `document_versions` rows to `<stem>.md`.
      - The html body is archived as `.versions/<stem>/vNNNN.html`, and the native file is written at `<stem>.md`.
      - The `.html` file is unlinked, and `gitops.remove` (`git rm --cached --ignore-unmatch`) stages the deletion.
  excerpt-sha256: not computed (Bash denied)
- scope: P30.S5. Commit 373522d was named in the dispatch but not read (Bash denied).
- confidence: high · flags: none
- conflicts: none

### C-r1-history-23
- claim: P31.S1 moved everything `create_document` did before `with WRITE_LOCK` into one function, `_check_document`, which both `POST /api/documents` and the dry run `POST /api/documents/check` call so the two cannot drift. The check takes no lock and writes no file, row or commit; from the lock onward, `create_document` is byte-for-byte the old code.
- kind: fact · questions: Q11 · load-bearing: no
- support: S-r1-history-01 · server/main.py:L938-L948@9978d84 · rung 1 · fit direct · upstream self
  excerpt (L939–L942, L945–L946):
        """Validate a write exactly as ``POST /api/documents`` does, writing nothing (P31.S1).

        The one validation path shared by the publish and its dry run
        (``POST /api/documents/check``), so the two cannot drift: it raises the publish's
        …
        reads (the validators, the manifest on disk, the SQLite index) — no lock, no file,
        no row, no commit, and nothing on the accounts plane, so a project that does not
  excerpt-sha256: not computed (Bash denied)
- support: S-r1-history-01 · works/phases/active/P31/slices/P31.S1/result.md:L28@9978d84 · rung 1 · fit direct · upstream self
  excerpt (L28, part):
    **Server (`server/main.py`).** I moved everything in `create_document` before `with WRITE_LOCK` verbatim into `_check_document(body, ctx, conn) -> _CheckedWrite`, using a scripted cut so nothing was retyped. … `create_document` calls it and unpacks the same 23 locals, so everything from the lock onward is byte-for-byte the old code.
  excerpt-sha256: not computed (Bash denied)
- scope: P31.S1. Commit 7c27519 was named in the dispatch but not read (Bash denied).
- confidence: high · flags: none
- conflicts: none

### C-r1-history-24
- claim: Since P30.S4, the images a publish carries are stored under `<root>/.assets/<project>/<date>-<slug>/`, written before the body that names them and never committed to git: `gitops.add` drops any path inside `.assets/`, and `.assets/` is also gitignored.
- kind: behaviour · questions: Q11 · load-bearing: no
- support: S-r1-history-01 · server/main.py:L1448-L1452@9978d84 · rung 1 · fit direct · upstream self
  excerpt (L1448–L1452):
            # 3a+. Store this version's images (P30.S4) under
            #      <root>/.assets/<project>/<date>-<slug>/, before the body that names
            #      them. Content-addressed: identical bytes are stored once, and files an
            #      older version references are never touched. Never staged in git.
            assets_mod.store_assets(root, rel, prepared_assets)
  excerpt-sha256: not computed (Bash denied)
- support: S-r1-history-01 · server/gitops.py:L54-L56, L59-L66@9978d84 · rung 1 · fit direct · upstream self
  excerpt (L54–L56, L62–L64):
    # Chapter images are never committed (P30 A2): ``.assets/`` holds them under every
    # tenant root, and tenant #1's public repo must never carry one.
    _NEVER_STAGED_DIR = ".assets"
    …
        A path inside an ``.assets/`` tree is dropped before git sees it (P30.S4): the
        images live on the box disk only, whatever a caller passes. ``.assets/`` is also
        gitignored, so this is the second of two guards.
  excerpt-sha256: not computed (Bash denied)
- scope: P30.S4 onward; the .gitignore was not read
- confidence: high · flags: none
- conflicts: none

## Conflicts
- C-r1-history-05 (doc vs code, scope): docs/current/architecture.md:L28 says "Steps 1–5 run **in-request**, under one in-process write lock" and lists validation as step 1. In the code, validation (`_check_document`, main.py:L1320) runs before `with WRITE_LOCK:` (main.py:L1374), and `_check_document`'s docstring (L945-L946) says it takes "no lock". The phase notes agree with the code on the lock boundary (P24 phase.md L53: validation is stage 2 and the locked section is stage 3). Not settled here; for code-validate and code-write to confirm.
- Scope note, not a conflict: api.md is v0018 and architecture.md is v0017, both written at P25.REVIEW (2026-08-07). They predate P30 and P31, whose doc consolidation is marked "pending" in works/index.json. Their write-flow lists omit archiving, books, assets, native and the check route; the code comments at HEAD are newer than the docs for those topics.

## Speculation and flags
- All claims: the excerpt hashes were not computed (Bash denied). Each range must be checked by its content.
- C-r1-history-13: describes pre-P24 code second-hand, from the P24 decomposition note, which cites pre-P24 line numbers. Neither the pre-P24 code nor commit b769236's diff was read.
- C-r1-history-19: an accepted limit as of P24's close; it may have changed since.

## Unused leads
- git commit b769236 ("feat(server): move git push and embed off the write response path"): its message and diff were not read (Bash denied). It would confirm C-13 to C-16 at commit level and give the date.
- git commits a36df74 (versions), abfa307 (books), 373522d (native ingest) and 7c27519 (check endpoint): not read (Bash denied).
- `git log --follow -- server/main.py`: not run (Bash denied). It would give the full timeline, including when WRITE_LOCK and the single-worker comment first appeared (P2/P4?).
- /private/tmp/claude-502/-Users-sugang-projects-personal-knowledge/c2016e8a-14bf-4ba0-89b3-a899f1c9c55e/scratchpad/s7/runs/new-c/knowledge/works/phases/active/P24/slices/P24.S1/result.md and plan.md: not read; they hold S1's own account of the mechanism.
- docs/current/operations.md (*Bring-up: asserting push capability (P24)*) and docs/current/backend.md (the publish worker, gitops timeouts): not read. They state the operator side of the invariants.
- works/phases/active/P30/phase.md and P31/phase.md `## Doc impact`: not read. They hold the pending doc changes for the write path.
- server/embeddings.py: not read. It would show whether the worker-side embed is bounded now (C-19).
- deploy/README.md §2: the operator runbook that P24.F1 changed.

## Queries
- `git -C <repo> show --stat b769236` → denied (Bash permission)
- `git -C <repo> log --follow --format=… -- server/main.py` → denied (Bash permission)
- Read server/main.py L1-L1343, L1344-L1643, L1644-L1753 → useful
- Read server/publish.py → useful
- Read server/gitops.py L1-L70 → useful
- Read works/index.json (to locate phase folders) → useful
- Read works/phases/active/P24/intent.md, phase.md → useful
- Read docs/current/api.md L1-L260 → useful
- Read docs/current/architecture.md L1-L120 → useful
- Read works/phases/active/P23/intent.md → useful
- Read P30.S2, P30.S5 and P31.S1 result.md → useful
