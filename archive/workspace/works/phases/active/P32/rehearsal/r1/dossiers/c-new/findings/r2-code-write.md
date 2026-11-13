# Findings: 20261023-0350-post-api-documents-write-path · round 2 · angle code-write
- researcher: claude-opus-5-5 · status: complete (hard cap reached at 52 calls; every question has an answer, and the unhashed ranges are marked) · tool calls: 53

## Questions
- Q16: answered — claims: C-r2-code-write-01, -02, -03, -04, -05, -06 — note: yes. A new publish blocks at a plain `with WRITE_LOCK:` (sync handler, no acquire timeout) while the push task holds the lock. Under the lock run only `gitops.push`: fetch, rebase, push, then `rev-parse` on success or `rebase --abort` on failure. The embed holds no lock. Every source states the bound per git subprocess (KB_GIT_TIMEOUT_S, 60 s); none states a bound for the whole push. The docs acknowledge the indirect wait only for an unbounded (hung) git, never for the bounded wait. architecture.md says the opposite ("Everything the caller waits for is local disk + SQLite").
- Q17: answered — claims: C-r2-code-write-07, -08, -09, -10, -11, -12 — note: `push origin HEAD:main` pushes the whole local tip. The docs say the next successful push publishes everything that has accumulated. There is no retry and no push at boot (reindex "NEVER runs git"), and the deploy reconcile rebases unpushed commits but does not push them. If `rebase --abort` fails, the code neither detects nor repairs the result, and no doc covers that case. Queued work is in-memory: a graceful shutdown drains for 10 s and a hard crash loses it all; the saved document is never lost. The operator sees failures only as stdout lines, plus the `rev-list --count origin/main..HEAD` check. `/healthz` shows no publish state, and `last_error()` is reachable only in-process.
- Q19: answered — claims: C-r2-code-write-13, -14, -15, -16, -17, -18 — note: the locked section has no try/finally, rollback or cleanup. Its only handlers are a defensive 409 before any write and the GitError catch around the git commit. The DB work is several separate commits. The project names reindex as the repair for drift and failed commits, but reindex rebuilds only the DB, never git. No doc speaks to an exception partway through the section.

## Sources

### S-r2-code-write-01
- repo: /private/tmp/claude-502/-Users-sugang-projects-personal-knowledge/c2016e8a-14bf-4ba0-89b3-a899f1c9c55e/scratchpad/s7/runs/new-c/knowledge
- commit: 9978d8447ed2c5aaf4a7de2e7e6ed7efc0fae32e · date: 2026-10-23T03:38:43+09:00 · version: n/a
- accessed: 2026-10-23 · read-via: files at HEAD (the tree was clean and HEAD equals the dispatch commit) · quote-match: exact · archive: none
- kind: code (plus the repository's own docs/current, works/ notes and deploy/ files at the same commit) · peer-review: n/a
- owner: the repository's owner (git user leetusik) · upstream: none
- lateral: n/a (local repository)
- note: this is the same repository and commit as S-r1-code-write-01. The lead may merge the two entries. Ranges already hashed in r1 are reused here under their r1 hashes.
- passages (each range's excerpt is quoted verbatim in the claim that cites it):
  - P1 · server/main.py:L1302-L1310 (create_document signature, sync def) · sha 97ad07fcd71c3e3f
  - P2 · server/main.py:L1371-L1385 (`with WRITE_LOCK:`) · sha 5371877eee1afe37 (r1)
  - P3 · server/main.py:L186-L202 (_push_task) · sha cd20b9420b1a6f86 (r1)
  - P4 · server/main.py:L205-L233 (_embed_task) · sha 0680d552ee4746cd (r1)
  - P5 · server/gitops.py:L37-L51 (_run) · sha 9d9620e9521883b1 (r1)
  - P6 · server/gitops.py:L124-L143 (push body) · sha 203fd94cb2e1894e (r1)
  - P7 · server/gitops.py:L100-L123 (push docstring) · sha 05a5a821ea0bc812
  - P8 · server/gitops.py:L1-L18 (module docstring) · sha 5758a8c11ee3cbd8
  - P9 · server/config.py:L106-L116 (git_timeout_s docstring) · sha 60e33b2bf715de4d
  - P10 · server/main.py:L71-L87 (lifespan: startup reindex) · sha 2b16b588d9067d49
  - P11 · server/main.py:L88-L97 (lifespan: drain) · sha 11e1b90c6f13f860 (r1)
  - P12 · server/reindex.py:L1-L6 (module docstring) · sha ae1e7cf55eebf275
  - P13 · server/main.py:L344-L351 (healthz) · sha fb5f00f8dd7ba2ba
  - P14 · server/publish.py:L3-L31 (module docstring) · sha 20e43dc2f4c64419 (r1)
  - P15 · server/main.py:L1386-L1407 (migration re-point, the only non-git try in the lock) · sha fe937d65f0d4aabb
  - P16 · server/main.py:L1559-L1596 (scoped git commit, GitError catch) · sha 02b2255a1298e611 (r1)
  - P17 · server/main.py:L1598-L1632 (after-response submits) · sha dbec68747b9b9e60 (r1)
  - P18 · server/db.py:L460-L477 (rekey_document) · sha 060b197004e7e7e5
  - P19 · server/db.py:L717-L750 (upsert_document_version, commit) · sha 688d9462626fed72
  - P20 · server/db.py:L915-L971 (replace_book, commit=True) · sha 06888e9fb4a55558
  - P21 · server/main.py:L1537-L1557 (manifest write + replace_book call) · sha ae5d3fb739d96287 (r1)
  - P22 · docs/current/backend.md:L117-L120 (P24 worker bullets) · sha 44397f532fb3f9bd
  - P23 · docs/current/operations.md:L257-L262 (one thread, one write lock) · sha dbb2f6d5f3e4e9ad
  - P24 · docs/current/operations.md:L303-L307 (rev-list check) · sha a3105e88498a53ed
  - P25 · docs/current/architecture.md:L37-L39 (response/publish split; never-rollback) · sha ce633d518fa472b1
  - P26 · works/phases/active/P24/slices/P24.S1/result.md:L50-L53 (timeouts) · sha c60c1e515ca02779
  - P27 · deploy/knowledge.conf:L181-L187 (/api/ proxy timeout comment) · sha d70fbb5b0da8dda8
  - P28 · deploy/deploy.sh:L225-L285 (reconcile: dirty refusal, rebase, no push) · sha 393fccc5893e6156

## Claims

### C-r2-code-write-01
- claim: At 9978d84, create_document is a synchronous `def` handler, and its locked section opens with a plain `with WRITE_LOCK:` (no timeout or non-blocking acquire). The push task takes the same lock object around `gitops.push`. So a publish that arrives while the kb-publish worker runs a push waits at `with WRITE_LOCK:` until the push task releases the lock: it writes nothing and returns no 201 until then.
- kind: behaviour
- questions: Q16 · load-bearing: yes (the indirect network wait the reviewer asked about)
- support: S-r2-code-write-01 · server/main.py:L1302-L1310@9978d84 · rung 1 · fit direct · upstream self
  excerpt (L1302–L1310):
    @app.post("/api/documents", status_code=201)
    def create_document(
        body: DocumentIn,
        request: Request,
        ctx: ApiAuthContext = Depends(resolve_api_write),
        registry_project_id: UUID | None = Depends(ensure_registry_project),
        org_slug: str | None = Depends(resolve_org_slug),
        conn=Depends(get_conn),
    ):
  excerpt-sha256 (L1302–L1310, first 16 hex): 97ad07fcd71c3e3f
- support: S-r2-code-write-01 · server/main.py:L1371-L1385@9978d84 · rung 1 · fit direct · upstream self
  excerpt (L1374):
        with WRITE_LOCK:
  excerpt-sha256 (L1371–L1385, first 16 hex): 5371877eee1afe37
- support: S-r2-code-write-01 · server/main.py:L186-L202@9978d84 · rung 1 · fit direct · upstream self
  excerpt (L198–L200):
        def _task() -> None:
            with WRITE_LOCK:
                gitops.push(root=root)
  excerpt-sha256 (L186–L202, first 16 hex): cd20b9420b1a6f86
- scope: 9978d84. WRITE_LOCK is the single `threading.Lock()` at main.py L183 (C-r1-code-write-01). This is the researcher's reading of the code: no source states it as a sentence about a waiting publish (see C-r2-code-write-04). The same wait applies to the delete and book handlers, which also take WRITE_LOCK (main.py L1833, L2087, found by grep; not read in full).
- confidence: high · flags: none
- conflicts: docs/current/architecture.md L37 "Everything the caller waits for is local disk + SQLite" (quoted in C-r2-code-write-04)

### C-r2-code-write-02
- claim: At 9978d84, the push task holds WRITE_LOCK only while gitops.push runs. Under the lock, gitops.push runs `git fetch origin main`, `git rebase origin/main` and `git push origin HEAD:main`, then `git rev-parse HEAD` on success. If any of the first three fails, it runs `git rebase --abort` instead. Each is a separate subprocess with its own KB_GIT_TIMEOUT_S timeout (default 60 s). The embed task takes no lock at all.
- kind: behaviour
- questions: Q16 · load-bearing: yes
- support: S-r2-code-write-01 · server/gitops.py:L124-L143@9978d84 · rung 1 · fit direct · upstream self
  excerpt (L124–L143):
        try:
            _run(["fetch", remote, branch], root=root)
            _run(["rebase", f"{remote}/{branch}"], root=root)
            _run(["push", remote, f"HEAD:{branch}"], root=root)
        except GitError:
        …
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
  excerpt-sha256 (L124–L143, first 16 hex): 203fd94cb2e1894e
- support: S-r2-code-write-01 · server/gitops.py:L37-L51@9978d84 · rung 1 · fit direct · upstream self
  excerpt (L37–L41):
    def _run(args: list[str], *, root, timeout: Optional[float] = None) -> subprocess.CompletedProcess:
        cmd = ["git", "-C", str(root), *args]
        limit = config.git_timeout_s() if timeout is None else timeout
        try:
            proc = subprocess.run(cmd, capture_output=True, text=True, timeout=limit)
  excerpt-sha256 (L37–L51, first 16 hex): 9d9620e9521883b1
- support: S-r2-code-write-01 · server/main.py:L205-L233@9978d84 · rung 1 · fit direct · upstream self
  excerpt (L215–L220):
        def _task() -> None:
            model = config.embedding_model()
            vec = embeddings_mod.embed_texts(
                [embeddings_mod.document_input(title, markdown)], kind="document"
            )[0]
            conn = db.connect(db_file)
  excerpt-sha256 (L205–L233, first 16 hex): 0680d552ee4746cd
- scope: 9978d84. Arithmetic on this claim, not stated by any source: each path runs at most four bounded subprocesses (fetch, rebase, push, rev-parse on success; fetch, rebase, push, abort on failure). One push can therefore hold the lock for about 4 × KB_GIT_TIMEOUT_S, roughly 240 s at the default, plus spawn overhead. A failure at fetch runs only two subprocesses (fetch and abort).
- confidence: high (the code); medium (the derived 4× bound) · flags: none
- conflicts: none

### C-r2-code-write-03
- claim: At 9978d84, every statement of the push's time bound, in the code docstrings and in the P24.S1 slice result, gives it per git subprocess ("EVERY git subprocess", "Every step", and the `rebase --abort` "bounded too"). None states a bound for the whole push or for the time a waiting write may spend.
- kind: fact
- questions: Q16 · load-bearing: yes
- support: S-r2-code-write-01 · server/config.py:L106-L116@9978d84 · rung 1 · fit direct · upstream self
  excerpt (L106–L112):
    def git_timeout_s() -> float:
        """Wall-clock cap on EVERY git subprocess (``KB_GIT_TIMEOUT_S``, default 60s).

        Load-bearing since P24: the push (fetch → rebase → push) runs on the
        after-response publish worker while holding ``WRITE_LOCK``, so an unbounded
        ``git`` — a hanging SSH connection to GitHub, say — would block every
        subsequent write in the process. A timeout surfaces as ``GitError`` (the
  excerpt-sha256 (L106–L116, first 16 hex): 60e33b2bf715de4d
- support: S-r2-code-write-01 · server/gitops.py:L100-L123@9978d84 · rung 1 · fit direct · upstream self
  excerpt (L115–L116):
        Every step is bounded by ``KB_GIT_TIMEOUT_S`` — a hung fetch/push raises
        ``GitError`` instead of blocking the worker (and its ``WRITE_LOCK``) forever.
  excerpt-sha256 (L100–L123, first 16 hex): 05a5a821ea0bc812
- support: S-r2-code-write-01 · works/phases/active/P24/slices/P24.S1/result.md:L50-L53@9978d84 · rung 1 · fit direct · upstream self
  excerpt (L50–L53):
    channel callers already treat as "not published, keep the write". The `rebase
    --abort` in `push`'s failure path is bounded too and its own timeout is swallowed,
    so it can never mask the real `GitError`. This is what stops a wedged SSH connection
    from holding `WRITE_LOCK` — and therefore every subsequent write — forever.
  excerpt-sha256 (L50–L53, first 16 hex): c60c1e515ca02779
- scope: 9978d84; searched docs/current and works/ (queries below)
- confidence: high · flags: none
- conflicts: none

### C-r2-code-write-04
- claim: At 9978d84, the project's docs and notes acknowledge that a publish can wait behind a push holding WRITE_LOCK only for the unbounded case: a hung git "would block every later write", which they give as the reason for KB_GIT_TIMEOUT_S. None says that a write may wait up to the bounded push time behind a push in flight. docs/current/architecture.md states that "Everything the caller waits for is local disk + SQLite".
- kind: fact
- questions: Q16 · load-bearing: yes (whether a doc acknowledges the indirect wait)
- support: S-r2-code-write-01 · docs/current/operations.md:L257-L262@9978d84 · rung 1 · fit direct · upstream self
  excerpt (L257–L259):
    - **(P24) One background thread, one write lock.** Pushes are serialized on a single FIFO worker
      that **re-takes the process's write lock** while it rebases, so a wedged `git` would block every
      later write — which is why `KB_GIT_TIMEOUT_S` (default 60 s) bounds every git subprocess. The
  excerpt-sha256 (L257–L262, first 16 hex): dbb2f6d5f3e4e9ad
- support: S-r2-code-write-01 · docs/current/backend.md:L117-L120@9978d84 · rung 1 · fit direct · upstream self
  excerpt (L119):
    - **Bounded git is what makes the lock-holding worker safe.** Without `KB_GIT_TIMEOUT_S` a hanging SSH connection would hold `WRITE_LOCK` indefinitely and block *every subsequent write in the process* — worse than the bug being fixed. With it, the subprocess is killed, the task raises `GitError`, the lock is released, and the doc publishes on the next push.
  excerpt-sha256 (L117–L120, first 16 hex): 44397f532fb3f9bd
- support: S-r2-code-write-01 · server/gitops.py:L1-L18@9978d84 · rung 1 · fit direct · upstream self
  excerpt (L15–L17):
    other failure. That cap is load-bearing since P24 — the push runs on the
    after-response publish worker while holding ``WRITE_LOCK``, so an unbounded network
    stage there would wedge every later write in the process.
  excerpt-sha256 (L1–L18, first 16 hex): 5758a8c11ee3cbd8
- support: S-r2-code-write-01 · docs/current/architecture.md:L37-L39@9978d84 · rung 1 · fit direct · upstream self
  excerpt (L37, opening):
    **(P24) The response/publish split is the load-bearing boundary.** Everything the caller waits for is local disk + SQLite; every network round-trip (GitHub over SSH, Gemini over HTTPS) sits behind the response on a single FIFO worker thread.
  excerpt-sha256 (L37–L39, first 16 hex): ce633d518fa472b1
- scope: 9978d84; "none says" rests on the searches listed under Queries (docs/current, works/ and server/)
- confidence: high (what the docs say); medium (the absence) · flags: none
- conflicts: C-r2-code-write-01 (the code makes a write wait for a push in flight; architecture.md L37 says the caller waits only on local work)

### C-r2-code-write-05
- claim: At 9978d84, the edge config's comment on `location /api/` still describes a write as doing "git fetch + rebase + push to GitHub" and the Gemini embed, which is the pre-P24 account. It sets proxy_read_timeout to 120 s and says Cloudflare gives up at about 100 s, returning a 524 to the client.
- kind: fact
- questions: Q16 · load-bearing: no (context for how long a waiting write can take before the client sees an error)
- support: S-r2-code-write-01 · deploy/knowledge.conf:L181-L187@9978d84 · rung 1 · fit direct · upstream self
  excerpt (L181–L187):
            proxy_connect_timeout 5s;
            # A write does git fetch + rebase + push to GitHub and (when GOOGLE_API_KEY
            # is set) a best-effort Gemini embed, and the first request after a boot can
            # wait on KB_STARTUP_REINDEX — so this is far from instant. 120s is the
            # ORIGIN-side ceiling, not a promise: Cloudflare itself gives up at ~100s
            # (a 524 to the client) no matter what nginx allows here.
            proxy_read_timeout 120s;
  excerpt-sha256 (L181–L187, first 16 hex): d70fbb5b0da8dda8
- scope: 9978d84; the ~100 s Cloudflare figure is the comment's statement, not checked
- confidence: high · flags: none
- conflicts: none

### C-r2-code-write-06
- claim: At 9978d84, docs/current/backend.md records that the worker-side Gemini embed has no client timeout. A stalled embed holds no lock but blocks the single FIFO worker, and with it every push queued behind it, until restart. The doc counts this as availability of the off-box backup, not correctness, and as a deferred job.
- kind: fact
- questions: Q16, Q17 · load-bearing: no (affects how late a push runs, not the 201)
- support: S-r2-code-write-01 · docs/current/backend.md:L117-L120@9978d84 · rung 1 · fit direct · upstream self
  excerpt (L120):
    - **Accepted, recorded scope limits.** The queue is **in-memory**: a crash before it drains loses the *push*, never the save, and the next successful push publishes everything accumulated (the app's shutdown hook drains). The worker-side Gemini embed has **no client timeout** — it can no longer delay a response, but a stalled embed blocks the single FIFO worker and therefore every push queued behind it until restart (availability of the off-box backup, not correctness; a deferred job). The queue is unbounded. The metering middleware's Postgres write still happens between the handler returning and the body reaching the client (local container, ms).
  excerpt-sha256 (L117–L120, first 16 hex): 44397f532fb3f9bd
- support: S-r2-code-write-01 · server/main.py:L205-L233@9978d84 · rung 1 · fit direct · upstream self (no WRITE_LOCK in _task; excerpt in C-r2-code-write-02, sha 0680d552ee4746cd)
- scope: 9978d84. The deferred job is works/deferred/open/D23 (brief.md L7, found by grep, not hashed). The embed's retry behaviour inside embeddings.embed_texts was not read.
- confidence: high · flags: none
- conflicts: none

### C-r2-code-write-07
- claim: At 9978d84, gitops.push pushes `HEAD:main` after rebasing "our commit(s)" onto origin/main, so the local commits the box has not yet pushed travel with the next successful push. The code's docstrings and the docs state that a failed push's commit "publishes on the next successful push", and backend.md says the next successful push "publishes everything accumulated".
- kind: behaviour
- questions: Q17 · load-bearing: yes
- support: S-r2-code-write-01 · server/gitops.py:L100-L123@9978d84 · rung 1 · fit direct · upstream self
  excerpt (L100–L106, L118–L122):
    def push(*, root, remote: str = "origin", branch: str = "main") -> str:
        """Publish local commit(s) to ``<remote>/<branch>`` and return the pushed HEAD.

        Discipline (best-effort publish, like ``commit`` is a best-effort record):
        ``git fetch <remote> <branch>`` → ``git rebase <remote>/<branch>`` (replays
        our commit(s) onto the latest remote tip — a no-op when it did not move, a
        clean replay when the operator added commits) → ``git push <remote>
    …
        On any step failing (fetch/rebase/push/timeout): abort an in-progress rebase
        so the repo is never left mid-rebase (its own failure is ignored — nothing to
        abort), then re-raise ``GitError``. The local commit is preserved intact
        (never ``--force``, never a reset) — the caller keeps it and the doc publishes
        on the next successful push.
  excerpt-sha256 (L100–L123, first 16 hex): 05a5a821ea0bc812
- support: S-r2-code-write-01 · server/gitops.py:L124-L143@9978d84 · rung 1 · fit direct · upstream self (`_run(["push", remote, f"HEAD:{branch}"], root=root)`; sha 203fd94cb2e1894e)
- support: S-r2-code-write-01 · docs/current/backend.md:L117-L120@9978d84 · rung 1 · fit direct · upstream self (L120 "the next successful push publishes everything accumulated"; sha 44397f532fb3f9bd)
- support: S-r2-code-write-01 · docs/current/operations.md:L257-L262@9978d84 · rung 1 · fit direct · upstream self
  excerpt (L259–L261):
      later write — which is why `KB_GIT_TIMEOUT_S` (default 60 s) bounds every git subprocess. The
      queue is in-memory: a container restart drops any not-yet-run push (never a save), and the next
      successful push publishes everything accumulated. A stalled **embed** blocks the queue behind it
  excerpt-sha256 (L257–L262, first 16 hex): dbb2f6d5f3e4e9ad
- scope: 9978d84. That pushing a ref sends all of its unpushed ancestors is git's documented behaviour, which belongs to the criticism angle; the repository asserts the outcome.
- confidence: high · flags: none
- conflicts: none

### C-r2-code-write-08
- claim: At 9978d84, nothing retries a failed push and nothing pushes at startup. The worker runs each task once (C-r1-code-write-19). Push tasks are submitted only by the three write handlers, create_document, the delete helper and the book write (main.py L1622, L1884, L2140). The startup lifespan runs a reindex and then yields, and the reindex module "NEVER runs git". Unpushed commits therefore wait for the next committed public-root write, delete or book change while KB_GIT_PUSH is on, or for a manual push.
- kind: behaviour
- questions: Q17 · load-bearing: yes
- support: S-r2-code-write-01 · server/main.py:L71-L87@9978d84 · rung 1 · fit direct · upstream self
  excerpt (L71–L80):
    async def lifespan(app: FastAPI):
        # Startup drift self-heal: docs/ is canonical, the DB is disposable — a full
        # reindex on boot cures manual edits, fallback writes, and git resets. The
        # embedding sync inside is content-hash cached, so a clean boot is ~free.
        if config.startup_reindex_enabled():
            # Tenant mode: resolve tenant #1's id so the docs/ walk stamps the
            # operator's tenant; namespaced tenants/<uuid>/ roots are re-derived from
            # their paths. Legacy mode -> None -> the '' sentinel (byte-identical).
            tenant_one_id = await get_tenant_one_id()
            report = reindex_mod.reindex(tenant_one_id=tenant_one_id)
  excerpt-sha256 (L71–L87, first 16 hex): 2b16b588d9067d49
- support: S-r2-code-write-01 · server/reindex.py:L1-L6@9978d84 · rung 1 · fit direct · upstream self
  excerpt (L1–L5):
    """Rebuild the SQLite document store from the canonical docs/ tree.

    docs/ is the source of truth; the DB is disposable. This is also the drift-repair
    tool — manual edits, API-down fallback writes, and `git reset`s are all cured by a
    full rebuild. Run as `python -m server.reindex`. It NEVER runs git.
  excerpt-sha256 (L1–L6, first 16 hex): ae1e7cf55eebf275
- support: S-r2-code-write-01 · server/main.py:L1598-L1632@9978d84 · rung 1 · fit direct · upstream self (L1620–L1622, the only create-path submit, gated on `committed and config.git_push_enabled()`; sha dbec68747b9b9e60)
- support: S-r2-code-write-01 · server/publish.py:L3-L31@9978d84 · rung 1 · fit direct · upstream self (the module docstring: "a failed push republishes on the next successful one"; sha 20e43dc2f4c64419)
- scope: 9978d84. The call sites come from `git grep -n -e 'gitops.push' -e 'publish.submit'` over server/ and deploy/ and scripts/: `gitops.push` appears only at main.py L200 and `_push_task` is submitted only at L1622, L1884 and L2140. L1884 and L2140 were not hashed.
- confidence: high · flags: none
- conflicts: none

### C-r2-code-write-09
- claim: At 9978d84, the production deploy's reconcile script fetches origin/main and, when the box clone is ahead or diverged ("an unpushed publish-on-write doc"), rebases the local commits onto the fetched tip. It never pushes them. It refuses to run on a dirty tracked worktree, and on a rebase conflict it aborts and fails the deploy.
- kind: behaviour
- questions: Q17, Q19 · load-bearing: no (a second place where unpushed commits are handled, not published)
- support: S-r2-code-write-01 · deploy/deploy.sh:L225-L285@9978d84 · rung 1 · fit direct · upstream self
  excerpt (L225–L231, L276–L285):
    # Refuse a mid-write (dirty TRACKED tree = a doc write in progress); an ahead/unpushed
    # CLEAN tree passes (that is the whole point). Same guard shape as hi2vi's remote gate.
    if ! git diff --quiet || ! git diff --cached --quiet; then
      echo "[reconcile] ERROR: dirty tracked worktree — a doc write may be in progress; refusing"
      git status --short || true
      exit 1
    fi
    …
    else
      # Box ahead/diverged (an unpushed publish-on-write doc) → rebase onto the tip.
      echo "[reconcile] box ahead/diverged — rebasing local commit(s) onto the tip"
      if git rebase "$fetched"; then
        echo "[reconcile] rebase clean"
      else
        echo "[reconcile] ERROR: rebase conflict — aborting (never leave a half-rebased clone)"
        git rebase --abort || true
        exit 1
      fi
  excerpt-sha256 (L225–L285, first 16 hex): 393fccc5893e6156
- scope: 9978d84. "Never pushes" rests on reading the whole reconcile script (L211–L289) and on `git grep -i 'push origin'` over deploy/, which matched only the manual command in deploy/README.md L227.
- confidence: high · flags: none
- conflicts: none

### C-r2-code-write-10
- claim: At 9978d84, when the fetch, rebase or push fails, gitops.push runs `git rebase --abort` through a bare subprocess.run that does not check the exit status: a non-zero exit is ignored and a timeout is swallowed. The code then re-raises the original GitError and never checks whether a rebase is still in progress. Nothing in the code detects or repairs a rebase that the abort failed to clear, and no doc in docs/current covers that case.
- kind: behaviour
- questions: Q17 · load-bearing: yes
- support: S-r2-code-write-01 · server/gitops.py:L124-L143@9978d84 · rung 1 · fit direct · upstream self (excerpt in C-r2-code-write-02, sha 203fd94cb2e1894e)
- support: S-r2-code-write-01 · server/gitops.py:L100-L123@9978d84 · rung 1 · fit direct · upstream self (L118–L119 "abort an in-progress rebase so the repo is never left mid-rebase (its own failure is ignored — nothing to abort)"; sha 05a5a821ea0bc812)
- scope: 9978d84. The docstring assumes a failed abort means "nothing to abort". What a leftover rebase-in-progress does to the next write's `git commit` and the next push is git's behaviour, so it is left to the criticism angle (see Unused leads). The deploy reconcile would refuse a clone that is not on `main` (deploy.sh L219–L223, read, not hashed). The searches for "mid-rebase" and "rebase-in-progress" in docs/current found nothing.
- confidence: high · flags: none
- conflicts: none

### C-r2-code-write-11
- claim: At 9978d84, queued publish work lives only in process memory, on a daemon worker. On a graceful shutdown the lifespan drains for at most 10 seconds and drops whatever is still pending, and a hard crash loses every queued and in-flight task. The docs state that this loses the push, never the save, and that the next successful push publishes the accumulated commits.
- kind: behaviour
- questions: Q17 · load-bearing: yes
- support: S-r2-code-write-01 · server/main.py:L88-L97@9978d84 · rung 1 · fit direct · upstream self
  excerpt (L89–L93):
        # Give the after-response publish worker a bounded chance to finish its
        # queued push/embed work before the process goes away (P24.S1). Best-effort:
        # anything still pending is dropped, and the doc publishes on the next
        # successful push — docs/ on disk is canonical either way.
        if not publish.drain(timeout=10.0):
  excerpt-sha256 (L88–L97, first 16 hex): 11e1b90c6f13f860
- support: S-r2-code-write-01 · docs/current/backend.md:L117-L120@9978d84 · rung 1 · fit direct · upstream self (L120 "The queue is **in-memory**: a crash before it drains loses the *push*, never the save"; sha 44397f532fb3f9bd)
- support: S-r2-code-write-01 · docs/current/operations.md:L257-L262@9978d84 · rung 1 · fit direct · upstream self (L260 "a container restart drops any not-yet-run push (never a save)"; sha dbb2f6d5f3e4e9ad)
- scope: 9978d84. Arithmetic, not stated by a source: the 10 s drain is shorter than one git subprocess's default 60 s cap, so a push still running at shutdown can outlive the drain. What happens to a git child that is mid-rebase when the process exits was not traced.
- confidence: high · flags: none
- conflicts: none

### C-r2-code-write-12
- claim: At 9978d84, an operator sees a failed push only as a `[kb-api] publish: push <rel> FAILED: <err>` line on stdout (the container log). `publish.last_error()` is an in-process value "for tests" that no route exposes, and `/healthz` reports only status, docs_root, db and the document count, with no publish state. The documented positive check is `git rev-list --count origin/main..HEAD`, expected to be 0, where a non-zero count means commits are stranded on the box.
- kind: behaviour
- questions: Q17 · load-bearing: yes
- support: S-r2-code-write-01 · server/main.py:L344-L351@9978d84 · rung 1 · fit direct · upstream self
  excerpt (L344–L351):
    @app.get("/healthz")
    def healthz(conn=Depends(get_conn)):
        return {
            "status": "ok",
            "docs_root": str(config.docs_root()),
            "db": "ok",
            "documents": db.count_documents(conn),
        }
  excerpt-sha256 (L344–L351, first 16 hex): fb5f00f8dd7ba2ba
- support: S-r2-code-write-01 · server/publish.py:L3-L31@9978d84 · rung 1 · fit direct · upstream self (L28–L30: "a task's exception is logged to stdout — the container log is the operator's surface — and kept in ``last_error()`` for tests"; sha 20e43dc2f4c64419)
- support: S-r2-code-write-01 · docs/current/operations.md:L303-L307@9978d84 · rung 1 · fit direct · upstream self
  excerpt (L303–L307):
    git -C /opt/knowledge rev-list --count origin/main..HEAD
    # expect: 0 — every commit the box has made is published on origin/main.
    # Non-zero = commits are stranded on the box. Fix the credential (2a), then the next
    # write publishes all of them at once; or push them by hand through the container:
    #   docker compose -f compose.prod.yml exec api git -C /repo push origin HEAD:main
  excerpt-sha256 (L303–L307, first 16 hex): a3105e88498a53ed
- scope: 9978d84. "No route exposes last_error()" rests on `git grep 'last_error()'` over server/, deploy/ and scripts/, which matched only publish.py. Per the P24 notes (C-r1-history ids), `origin/main` in the rev-list check is the box clone's remote-tracking ref, which only the container's own fetch and push update.
- confidence: high · flags: none
- conflicts: none

### C-r2-code-write-13
- claim: At 9978d84, the locked section of create_document has no try/finally, rollback or cleanup around its archive, asset, file, Recent-index, DB and manifest steps. Its only two exception handlers are a defensive ConventionError-to-409 conversion in the migration's manifest re-point, which runs before any file is written, and the GitError catch around the git commit. An exception from any other step propagates out of `with WRITE_LOCK:`, which releases the lock, and leaves every earlier step's effect in place.
- kind: behaviour
- questions: Q19 · load-bearing: yes
- support: S-r2-code-write-01 · server/main.py:L1386-L1407@9978d84 · rung 1 · fit direct · upstream self
  excerpt (L1386–L1391, L1402–L1407):
            elif migrated_from is not None:
                # P30.S5: the book binding follows a migrated document. The manifest that
                # binds its old rel_path is re-pointed to the new one (same chapter, same
                # lang); a binding the index knows but the manifest lacks is drift, and
                # the next reindex settles it.
                binding = db.find_chapter_binding(conn, migrated_from, tid)
    …
                        try:
                            new_manifest = books_mod.normalize_manifest(
                                {**bound_manifest, "chapters": chapters}, project=binding["project"]
                            )
                        except documents_mod.ConventionError as exc:  # pragma: no cover - defensive
                            raise HTTPException(status_code=409, detail=str(exc))
  excerpt-sha256 (L1386–L1407, first 16 hex): fe937d65f0d4aabb
- support: S-r2-code-write-01 · server/main.py:L1559-L1596@9978d84 · rung 1 · fit direct · upstream self (the `try:` … `except gitops.GitError as exc:` around add/remove/commit; sha 02b2255a1298e611)
- scope: 9978d84. Rests on `grep -n -E 'try:|finally:|except |raise |rollback'` over main.py: within the lock (L1374 to about L1597) the only `try:` lines are L1402 and L1567. Callees (store_assets, write_document_file, update_recent_index, write_manifest) were not read for internal cleanup. The request's SQLite connection is closed by get_conn's `finally: conn.close()` (main.py L236–L242, read, not hashed); the code calls no rollback.
- confidence: high · flags: none
- conflicts: none

### C-r2-code-write-14
- claim: At 9978d84, the DB work inside create_document's lock is several separate SQLite commits, not one transaction. db.rekey_document runs its UPDATEs without committing ("the caller's next upsert commits it"). db.upsert_document_version commits on its own call, and so does db.upsert_document (C-r1-code-write-08). db.replace_book commits by default (`commit: bool = True`), and the write path does not pass `commit`.
- kind: behaviour
- questions: Q19 · load-bearing: yes
- support: S-r2-code-write-01 · server/db.py:L460-L477@9978d84 · rung 1 · fit direct · upstream self
  excerpt (L460–L473):
    def rekey_document(
        conn: sqlite3.Connection, *, tenant_id: str, old_rel_path: str, new_rel_path: str
    ) -> None:
        """Move one document's identity from ``old_rel_path`` to ``new_rel_path`` in place.

        The ``html -> native`` migration (P30.S5): the ``documents`` row keeps its id (so
        ``/documents/{id}``, its embedding and every id-keyed reference survive) and its
        archived versions follow it, so the version chain spans the extension change.
        Not committed here: the caller's next upsert commits it with the new body.
        """
        conn.execute(
            "UPDATE documents SET rel_path = ? WHERE tenant_id = ? AND rel_path = ?",
            (new_rel_path, tenant_id, old_rel_path),
        )
  excerpt-sha256 (L460–L477, first 16 hex): 060b197004e7e7e5
- support: S-r2-code-write-01 · server/db.py:L717-L750@9978d84 · rung 1 · fit direct · upstream self
  excerpt (L717–L720, L750):
        """Record one archived version. Idempotent on ``(tenant_id, rel_path, version)``.

        Called twice over a version's life: by the write path when it archives the body
        it is about to replace, and by every reindex that re-reads the archive file. The
    …
        conn.commit()
  excerpt-sha256 (L717–L750, first 16 hex): 688d9462626fed72
- support: S-r2-code-write-01 · server/db.py:L915-L971@9978d84 · rung 1 · fit direct · upstream self
  excerpt (L915–L923, L970–L971):
    def replace_book(
        conn: sqlite3.Connection,
        *,
        tenant_id: str,
        project: str,
        manifest: dict[str, Any],
        manifest_path: str,
        commit: bool = True,
    ) -> None:
    …
        if commit:
            conn.commit()
  excerpt-sha256 (L915–L971, first 16 hex): 06888e9fb4a55558
- support: S-r2-code-write-01 · server/main.py:L1537-L1557@9978d84 · rung 1 · fit direct · upstream self (the `db.replace_book(conn, tenant_id=tid, project=manifest_project, manifest=new_manifest, manifest_path=manifest_rel,)` call passes no `commit`; sha ae5d3fb739d96287)
- scope: 9978d84. Order inside the lock, from C-r1-code-write-10: rekey, then archive file and version row (commit), assets, document file, landing and Recent index, upsert_document (commit), manifest file and replace_book (commit), then the git add/commit.
- confidence: high · flags: none
- conflicts: none

### C-r2-code-write-15
- claim: From the order (C-r1-code-write-10) and the absence of cleanup (C-r2-code-write-13, -14), an exception partway through the locked section at 9978d84 leaves the earlier steps applied:
  - after the archive and version row but before the document file: an archived copy and a committed version row for a body that is still current on disk;
  - after the document file and Recent index but before upsert_document: a new file and Recent bullet on disk while the DB row still describes the previous version;
  - after upsert_document but before write_manifest or replace_book: a committed row with no manifest binding;
  - in all of these cases, no git commit for any of it.
- kind: interpretation
- questions: Q19 · load-bearing: yes
- support: S-r2-code-write-01 · server/main.py:L1386-L1407, L1559-L1596@9978d84 and server/db.py:L460-L477, L717-L750, L915-L971@9978d84 · rung 1 · fit partial (the code shows the order and the lack of cleanup; the outcomes are the researcher's derivation) · upstream self
- scope: 9978d84. A migration adds a further case. rekey_document's uncommitted UPDATE becomes durable at the next commit, which is upsert_document_version's when a previous version exists. A later failure, for example in write_raw_document_file, would then leave a row re-keyed to a new rel_path whose file was never written, with the old .html still on disk. This was not traced through reindex.
- confidence: medium · flags: speculation (the researcher's derivation from code, not a project statement)
- conflicts: none

### C-r2-code-write-16
- claim: At 9978d84, the project names reindex as the repair for drift: "manual edits, API-down fallback writes, and `git reset`s", and in architecture.md for a failed commit ("a failed commit never rolls back the file/DB … POST /api/reindex reconciles any drift"). Reindex rebuilds only the SQLite store from docs/ and "NEVER runs git". No doc or comment says that reindex repairs a write that raised partway through the locked section, and nothing in the code later stages or commits a file that an earlier write left uncommitted.
- kind: fact
- questions: Q19 · load-bearing: yes
- support: S-r2-code-write-01 · server/reindex.py:L1-L6@9978d84 · rung 1 · fit direct · upstream self (excerpt in C-r2-code-write-08, sha ae1e7cf55eebf275)
- support: S-r2-code-write-01 · docs/current/architecture.md:L37-L39@9978d84 · rung 1 · fit direct · upstream self
  excerpt (L39, opening):
    A failed commit **never rolls back** the file/DB (`committed:false`); `docs/` stays canonical and `POST /api/reindex` reconciles any drift (manual edits, API-down fallback writes, git resets).
  excerpt-sha256 (L37–L39, first 16 hex): ce633d518fa472b1
- support: S-r2-code-write-01 · server/main.py:L71-L87@9978d84 · rung 1 · fit direct · upstream self (L72–L73 "a full reindex on boot cures manual edits, fallback writes, and git resets"; sha 2b16b588d9067d49)
- support: S-r2-code-write-01 · server/main.py:L1386-L1407@9978d84 · rung 1 · fit direct · upstream self (L1389–L1390 "a binding the index knows but the manifest lacks is drift, and the next reindex settles it": the one in-lock comment that names reindex as the repair; sha fe937d65f0d4aabb)
- scope: 9978d84. The search for "non-transactional" found the phrase only for the DELETE path (docs/current/api.md L258, backend.md L94, security.md L274), not for POST. That reindex re-derives every DB row from disk is the docs' statement and was not traced through reindex.py here.
- confidence: high (the statements); medium (the absence) · flags: none
- conflicts: none

### C-r2-code-write-17
- claim: At 9978d84, gitops.commit runs `git commit -m <message>` with no pathspec, and create_document stages its paths with a separate `git add` before committing (C-r1-code-write-12, -15). So if one write's `git add` succeeds but its commit fails, those paths stay staged and are committed by the next write's commit. If a write's `git add` itself fails, its files stay unstaged, and only docs/index.md, which every public-root write stages whole, is picked up by a later write.
- kind: interpretation
- questions: Q19 · load-bearing: no (a consequence for git history; depends on git's index semantics)
- support: S-r2-code-write-01 · server/main.py:L1559-L1596@9978d84 · rung 1 · fit partial (staging list and commit call) · upstream self (sha 02b2255a1298e611)
- support: S-r1-code-write-01 · server/gitops.py:L86-L97@9978d84 · rung 1 · fit partial (`args = ["commit", "-m", message]`, no paths) · upstream self (sha 8e3029570b7365ee)
- scope: 9978d84. That `git commit` without paths commits the whole index, and that `git add <file>` stages the file's whole content, are git's documented semantics, for the criticism angle to confirm.
- confidence: medium · flags: speculation (the researcher's derivation; no project statement)
- conflicts: none

### C-r2-code-write-18
- claim: At 9978d84, the deploy reconcile refuses a dirty tracked worktree, reading it as "a doc write may be in progress". A write that modified a tracked file (such as docs/index.md or an existing document) and then failed before its commit therefore makes the next production deploy refuse until the tree is cleaned or committed.
- kind: interpretation
- questions: Q19 · load-bearing: no (an operational knock-on of a partial write)
- support: S-r2-code-write-01 · deploy/deploy.sh:L225-L285@9978d84 · rung 1 · fit partial (the refusal is direct; linking it to a failed write is the researcher's) · upstream self (excerpt in C-r2-code-write-09, sha 393fccc5893e6156)
- scope: 9978d84. An untracked new document file does not count, because `git diff --quiet` ignores untracked files (git semantics, not checked here).
- confidence: medium · flags: speculation
- conflicts: none

## Conflicts
- C-r2-code-write-01 vs C-r2-code-write-04: server/main.py L1374 with L198–L200 makes a publish wait at `with WRITE_LOCK:` while a push runs. docs/current/architecture.md L37 says "Everything the caller waits for is local disk + SQLite". Both are quoted above. This is a difference between code and doc inside one repository; not settled here.
- C-r2-code-write-05: deploy/knowledge.conf L182–L184 still says a write does fetch, rebase and push, which contradicts the P24 code (C-r1-code-write-26). It reads as a stale pre-P24 comment; not settled here.

## Speculation and flags
- C-r2-code-write-02 scope: the "about 4 × KB_GIT_TIMEOUT_S (about 240 s)" ceiling on one push's lock hold is the researcher's arithmetic. Python's subprocess.run timeout semantics (whether it waits on grandchildren such as ssh after killing git) belong to the criticism angle.
- C-r2-code-write-01 with -05: a publish queued behind a slow push could in principle wait longer than the ~100 s Cloudflare ceiling stated in knowledge.conf. The client would then see a 524 for a write that later lands, which is the P24 bug in an indirect form. This is the researcher's inference; no source states it, and it was not observed.
- threading.Lock is not FIFO-fair, so with several queued pushes a waiting write competes with each push task for the lock. This is an inference from the lock type, not stated by any source and not checked.
- C-r2-code-write-11 scope: the 10 s drain is shorter than one 60 s git cap.
- C-r2-code-write-15, -17, -18: derivations from code order plus git semantics, flagged as speculation.

## Unused leads
- git documentation on `git rebase --abort` failing, and on `git commit` or `git rebase` running while a rebase-merge directory exists: for the criticism angle (what C-r2-code-write-10 leaves open).
- git documentation on `git commit` without pathspec committing the whole index, and `git push <remote> HEAD:<branch>` sending all unpushed ancestors: for the criticism angle (C-r2-code-write-07, -17).
- Python docs, subprocess.run timeout behaviour on POSIX (kill, then wait on the child only): for the criticism angle (C-r2-code-write-02's bound).
- server/embeddings.py embed_texts: whether `_embed_task` (which passes no `retries=`) uses the bounded backoff described at embeddings.py L43–L46 ("Callers on the request path … pass retries=0"). Not read; affects how long an embed occupies the FIFO worker.
- works/deferred/open/D23/brief.md L7: the deferred job for bounding the embed (found by grep, not hashed).
- works/phases/active/P24/phase.md L371–L375: the review's recommendation that became D23 (read, not hashed).
- server/reindex.py: whether a full reindex re-derives a row left re-keyed by a half-done migration (C-r2-code-write-15 scope). Not traced.

## Queries
- git grep -n -e WRITE_LOCK -e _push_task -e _embed_task -e 'def lifespan' -e reindex -e last_error -e 'def create_document' 9978d84 -- server → useful
- Read server/gitops.py (whole), main.py L60–L240, config.py L104–L208 → useful
- git grep -n -i -e WRITE_LOCK -e 'write lock' -e KB_GIT_TIMEOUT_S 9978d84 -- docs/current works → too broad (103 KB)
- git grep -n -i -e 'block.*every.*write' -e 'later write' -e 'subsequent write' -e 'wait.*WRITE_LOCK' -e 'WRITE_LOCK.*wait' -e 'holds WRITE_LOCK' -e 'holding .WRITE_LOCK' -e 'rev-list --count' 9978d84 -- docs/current works → useful (backend.md L119–L120, operations.md L259, P24 notes, D23)
- Read backend.md L108–L123, operations.md L245–L314, P24 phase.md L370–L439, P24.S1 result.md L40–L69, architecture.md L36–L40 → useful
- git grep -n -e gitops.push -e publish.submit -e healthz -e 'last_error()' -e 'NEVER runs git' 9978d84 -- server deploy scripts → useful (no retry, no boot push, healthz has no publish state)
- git grep -n -i -e unpushed -e 'push origin' -e rev-list -e rebase 9978d84 -- deploy → useful (reconcile rebases, never pushes)
- Read deploy/deploy.sh L14–L33 and L200–L294, deploy/knowledge.conf L176–L195 → useful
- grep -n -E 'try:|finally:|except |raise |rollback' server/main.py → useful (only L1402 and L1567 inside the lock)
- grep -n -E '^def |conn.commit\(\)|with conn:|BEGIN|rollback' server/db.py → useful
- Read db.py L238–L248, L460–L479, L700–L751, L905–L972; main.py L1386–L1409, L236–L243, L1303–L1310; reindex.py L1–L8; publish.py L20–L59, L98–L125; embeddings.py L40–L64 → useful
- git grep -n -i -E 'commit_error|committed: ?false|untracked|uncommitted|partial(ly)? (write|failure)|half-written|mid-rebase|rebase-in-progress|reindex (repairs|cures|heals|settles)|self-heal' 9978d84 -- docs/current server/reindex.py server/db.py → useful (architecture.md L39; nothing on mid-rebase)
- git grep -n -i -E 'non-transactional|not (one|a single|atomic) transaction|not atomic|no rollback' 9978d84 -- docs/current server → useful (stated for DELETE only)
- git show 9978d84:<path> | sed -n 'a,bp' | shasum -a 256 for 18 new ranges → hashes
