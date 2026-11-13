# Findings: 20261023-0350-post-api-documents-write-path · round 1 · angle history (re-dispatch)
- researcher: claude-opus-5-5 · status: complete · tool calls: 31

This file extends `findings/r1-history.md` (S-r1-history-01, C-r1-history-01 … -24), which read no commit. It does not restate those claims. Each claim below either cites a commit that confirms one of them (named under `conflicts`/`scope` as "confirms C-r1-history-NN") or adds new commit-level evidence. Commit dates are author dates (`git show --format=%ad --date=iso`). Excerpt hashes are the first 16 hex digits of `git show <commit>:<path> | sed -n '<a>,<b>p' | shasum -a 256`. HEAD 9978d84 working tree was clean per the session's gitStatus snapshot; every HEAD range below was hashed from the commit object anyway.

## Questions
- Q9: answered — claims: C-r1-history2-09, -10, -11, -12, -13, -14 — note: adds where the invariants were first stated (207f2ff for lock + no-rollback, P2.S3, 2026-07-02), backend.md L136-L137 and operations.md L248-L262 as further statement sites, and confirms at HEAD that the worker-side embed is still unbounded (embeddings.py untouched since P4.S6).
- Q10: answered — claims: C-r1-history2-01, -02, -03, -04, -05, -06, -07, -08 — note: b769236's message is one line (no body rationale); the "why" lives in its diff comments and in P24.S1 result.md, which the commit itself added. The pre-P24 code at the parent ac29872 shows the push inside `WRITE_LOCK`, the embed before the response, and an untimed `subprocess.run`.
- Q11: answered — claims: C-r1-history2-15, -16, -17, -18 — note: commit messages and dates for P23 (a36df74), P30.S2 (abfa307), P30.S5 (373522d), P31.S1 (7c27519); plus the full main.py timeline in Queries.

## Sources

### S-r1-history2-01
- repo: /private/tmp/claude-502/-Users-sugang-projects-personal-knowledge/c2016e8a-14bf-4ba0-89b3-a899f1c9c55e/scratchpad/s7/runs/new-c/knowledge · commit: 9978d8447ed2c5aaf4a7de2e7e6ed7efc0fae32e · date: HEAD of the run (P32.S6 commit)
- title: the knowledge repository at HEAD · authors: n/a · publisher: n/a
- accessed: 2026-10-23 · read-via: git show <commit>:<path>; Read on the clean tree · quote-match: exact · archive: none
- kind: code (with in-repo docs and slice records) · peer-review: n/a
- owner: the knowledge project (operator leetusik) · upstream: none
- lateral: the project's own repository; rung 1 for what it states and does.
- passages:
  - P1 · works/phases/active/P24/slices/P24.S1/result.md:L15-L36
  - P2 · works/phases/active/P24/slices/P24.S1/result.md:L133-L141
  - P3 · server/embeddings.py:L140-L147
  - P4 · docs/current/backend.md:L113
  - P5 · docs/current/backend.md:L119-L120
  - P6 · docs/current/backend.md:L136-L137
  - P7 · docs/current/operations.md:L248-L262
  - P8 · `git log --format='%h %ad %s' 9978d84 -- server/embeddings.py` → one line: "0138f72 2026-07-08 feat(server): hybrid semantic search with Gemini embeddings and RRF fusion (P4.S6)"

### S-r1-history2-02
- repo: (same) · commit: ac2987243365513cd1abdd37666442e1c45ca3fb (the parent of b769236) · date: 2026-08-05 23:12:07 +0900
- kind: code · peer-review: n/a · owner: the knowledge project · upstream: none
- lateral: the tree immediately before P24.S1; read with `git show ac29872:<path>` and `git grep -n … ac29872`.
- passages:
  - P1 · server/main.py:L669 (`with WRITE_LOCK:` in create_document)
  - P2 · server/main.py:L786-L798 (in-lock push)
  - P3 · server/main.py:L800-L821 (in-request embed, then step 5)
  - P4 · server/gitops.py:L29-L31 (untimed `_run`)

### S-r1-history2-03
- repo: (same) · commit: b7692361c5ab91e5e5b765ac9a2a26b695ebf808 · date: 2026-08-05 23:22:11 +0900 · author: leetusik · trailer: "Co-Authored-By: Claude Fable 5"
- title: "feat(server): move git push and embed off the write response path" (no message body beyond trailers)
- kind: code (commit message + diff) · peer-review: n/a · owner: the knowledge project · upstream: none
- lateral: the P24.S1 slice commit; its stat lists 22 files, 1013 insertions, 183 deletions, including the new server/publish.py (124 lines) and P24.S1 plan.md/result.md.
- passages:
  - P1 · `git show --stat b769236` (message and file list)
  - P2 · `git show b769236 -- server/main.py` hunks @@ -783,40 +847,35 @@, @@ -849,13 +908,19 @@, @@ -909,8 +975,6 @@, @@ -929,15 +993,15 @@
  - P3 · server/config.py:L106-L122@b769236 (`git_timeout_s`)
  - P4 · `git show b769236 -- server/gitops.py` (push docstring hunk @@ -66,13 +81,18 @@)

### S-r1-history2-04
- repo: (same) · commit: 207f2ff5d28acd236dd0b6c3d2240d20d48f5cb9 · date: 2026-07-02 15:33:56 +0900
- title: "feat(api): add API-owned write path with scoped git commits" · kind: code (commit message) · owner: the knowledge project · peer-review: n/a · upstream: none
- lateral: the commit `git log -S 'WRITE_LOCK = threading.Lock()' -- server/main.py` returns; it also adds P2.S3 plan/result.
- passages:
  - P1 · message body: "POST /api/documents writes the convention-exact docs/ file, inserts the Recent bullet (duplicate-suppressed on overwrite), upserts the FTS5 row, and commits staging only the two touched paths (never -A, never push) — all under one process-wide write lock. 409 names the existing doc; a failed commit never rolls back the write (201 with committed:false)."

### S-r1-history2-05
- repo: (same) · commit: 0cfb7033eeade1b9524952d642a7680a98d7c9be · date: 2026-07-14 17:06:46 +0900
- title: "feat(server): publish-on-write — flag-gated git push after the scoped commit (P8.S1)" · kind: code (commit message) · owner: the knowledge project · peer-review: n/a · upstream: none
- lateral: the commit `git log -S 'def push(' -- server/gitops.py` returns.
- passages:
  - P1 · message body: "KB_GIT_PUSH (default false; local/plugin never push). gitops.push(): fetch -> rebase onto origin/main -> non-force push, returns published HEAD; clean abort on conflict. POST + both DELETEs gain pushed/push_error mirroring committed/commit_error; commit_sha is the final pushed HEAD on success. 5 new bare-remote tests; suite 62 passed."

### S-r1-history2-06
- repo: (same) · commit: 0138f72 (full sha not printed; short sha from `git log`) · date: 2026-07-08
- title: "feat(server): hybrid semantic search with Gemini embeddings and RRF fusion (P4.S6)" · kind: code (commit title only) · owner: the knowledge project · peer-review: n/a · upstream: none
- lateral: the only commit `git log -S 'embeddings_mod.embed_texts' 9978d84 -- server/main.py` returns, and the only commit touching server/embeddings.py.
- passages:
  - P1 · log line: "0138f72 2026-07-08 feat(server): hybrid semantic search with Gemini embeddings and RRF fusion (P4.S6)"

### S-r1-history2-07
- repo: (same) · commit: a36df7483ab68ca00f0c5e7b6c75e5501c375584 · date: 2026-08-05 16:32:45 +0900
- title: "feat(server): archive superseded document versions and add version-aware publish" · kind: code (commit message) · owner: the knowledge project · peer-review: n/a · upstream: none
- lateral: P23's server commit (P23 is the version-control phase per C-r1-history-20).
- passages: P1 · subject line as above (body is trailers only)

### S-r1-history2-08
- repo: (same) · commit: abfa307e9c0f8dda295cbe1d4100eeaab5e6f161 · date: 2026-10-21 02:24:19 +0900
- title: "feat(server): P30.S2 books and chapters — manifests, derived tables, placement, book routes" · kind: code (commit message) · owner: the knowledge project · peer-review: n/a · upstream: none
- lateral: trailer "Co-Authored-By: Claude Opus 5.5".
- passages: P1 · subject line as above

### S-r1-history2-09
- repo: (same) · commit: 373522d9c6a295b4480af56b95e4a4b8809718ee · date: 2026-10-21 03:26:15 +0900
- title: "feat(server): P30.S5 native ingest, read routes, MCP and html-to-native migration" · kind: code (commit message) · owner: the knowledge project · peer-review: n/a · upstream: none
- passages: P1 · subject line as above

### S-r1-history2-10
- repo: (same) · commit: 7c275197f97904e25d726bf0ecee4e1de58b43f8 · date: 2026-10-21 19:11:01 +0900
- title: "feat(api): P31.S1 knowledge check, a dry-run validation endpoint and CLI" · kind: code (commit message) · owner: the knowledge project · peer-review: n/a · upstream: none
- passages: P1 · subject line as above

## Claims

### C-r1-history2-01
- claim: Commit b769236 ("feat(server): move git push and embed off the write response path", authored 2026-08-05 23:22 +0900) is the P24.S1 change: it adds `server/publish.py` (124 lines) and changes `server/main.py`, `server/gitops.py`, `server/config.py`, `server/documents_api.py` and `tests/test_api_push.py`, with byte-mirrors under `plugin/templates/kb/`, plus the P24.S1 `plan.md` and `result.md`; its message has no body beyond the trailers.
- kind: fact · questions: Q10 · load-bearing: yes (dates and locates the change the chapter explains)
- support: S-r1-history2-03/P1 · rung 1 · fit direct · upstream self
  excerpt (`git show --stat b769236`, part):
    feat(server): move git push and embed off the write response path
    …
     server/gitops.py                                 |  57 +++++---
     server/main.py                                   | 171 ++++++++++++++++-------
     server/publish.py                                | 124 ++++++++++++++++
     tests/test_api_push.py                           |  79 +++++++++--
    …
     works/phases/active/P24/slices/P24.S1/result.md  | 143 +++++++++++++++++++
  excerpt-sha256: n/a (commit stat)
- scope: confirms the commit-level anchor C-r1-history-13 to -16 lacked
- confidence: high · flags: none · conflicts: none

### C-r1-history2-02
- claim: In the code just before b769236 (its parent ac29872), `create_document` ran `gitops.push` in-request inside `with WRITE_LOCK:`, set `commit_sha` to the published head and `pushed = True` on success or `push_error` on failure, and a comment said the push stayed inside `WRITE_LOCK` so that no concurrent write mutated the tree mid-rebase.
- kind: behaviour · questions: Q10 · load-bearing: yes
- support: S-r1-history2-02 · server/main.py:L669@ac29872 · rung 1 · fit direct · upstream self
  excerpt (L669):
        with WRITE_LOCK:
  excerpt-sha256 (L669-L669, first 16 hex): 1baac36d776ed3a2
- support: S-r1-history2-02 · server/main.py:L786-L798@ac29872 · rung 1 · fit direct · upstream self
  excerpt (L786–L798):
                # 4b. Best-effort publish: push the commit to origin/main when
                #     KB_GIT_PUSH is enabled (hosted box only; off by default so local
                #     never pushes). Mirrors the commit's best-effort semantics — a
                #     failed push never changes the 201; the doc publishes on the next
                #     successful push. A rebase may rewrite the commit, so the PUBLISHED
                #     head becomes the authoritative commit_sha on success. Stays inside
                #     WRITE_LOCK so no concurrent write mutates the tree mid-rebase.
                if committed and config.git_push_enabled():
                    try:
                        commit_sha = gitops.push(root=config.kb_root())
                        pushed = True
                    except gitops.GitError as exc:
                        push_error = exc.stderr or str(exc)
  excerpt-sha256 (L786–L798, first 16 hex): 0252ad1e72ee805f
- scope: pre-P24 code (P8.S1 through ac29872). The 12-space indent places the block inside `with WRITE_LOCK:` (L669, 4-space indent) and inside the `if body.commit …` branch.
- confidence: high · flags: none
- conflicts: none — confirms C-r1-history-13 (lock, in-request) from the code itself, which the first attempt had only second-hand

### C-r1-history2-03
- claim: In the code just before b769236 (ac29872), the Gemini embed ran after the locked section and before step 5 (the response), on the request's own SQLite connection, inside a `try … except Exception: pass` that kept any failure from affecting the 201 but did not keep its latency out of the response.
- kind: behaviour · questions: Q10 · load-bearing: yes
- support: S-r1-history2-02 · server/main.py:L800-L821@ac29872 · rung 1 · fit direct · upstream self
  excerpt (L800–L806, L810–L811, L818–L821):
        # 4b. Best-effort embed of the new doc, OUTSIDE the WRITE_LOCK critical section.
        #     Semantic search is a disposable cache: any failure (no key, API error) is
        #     swallowed — the 201 never depends on it, and the next reindex catches up.
        if config.embeddings_enabled():
            try:
                model = config.embedding_model()
                vec = embeddings_mod.embed_texts(
        …
                db.upsert_embedding(
                    conn,
        …
            except Exception:  # noqa: BLE001 — best-effort; never affects the 201
                pass

        # 5. Response.
  excerpt-sha256 (L800–L821, first 16 hex): 57b06d03e5562258
- scope: pre-P24; "latency in the response" is the plain reading of the order (embed at L806, response at L821), not a separate statement in the code
- confidence: high · flags: none
- conflicts: none — confirms C-r1-history-13 (embed outside the lock, before the response)

### C-r1-history2-04
- claim: Before b769236, `gitops._run` called `subprocess.run(cmd, capture_output=True, text=True)` with no `timeout` argument, so every git subprocess, including the push's fetch and push, was unbounded.
- kind: behaviour · questions: Q10 · load-bearing: yes
- support: S-r1-history2-02 · server/gitops.py:L29-L31@ac29872 · rung 1 · fit direct · upstream self
  excerpt (L29–L31):
    def _run(args: list[str], *, root) -> subprocess.CompletedProcess:
        cmd = ["git", "-C", str(root), *args]
        proc = subprocess.run(cmd, capture_output=True, text=True)
  excerpt-sha256 (L29–L31, first 16 hex): da7aa3abed0bcf22
- scope: pre-P24
- confidence: high · flags: none · conflicts: none — confirms C-r1-history-13 ("no `timeout=` argument at all")

### C-r1-history2-05
- claim: Commit b769236 added `config.git_timeout_s()`, which reads `KB_GIT_TIMEOUT_S` with a default of 60 and falls back to 60 seconds for an unparseable or non-positive value, and whose docstring gives the reason: the push runs on the after-response worker while holding `WRITE_LOCK`, so an unbounded git (a hanging SSH connection to GitHub) would block every later write.
- kind: behaviour · questions: Q10, Q9 · load-bearing: yes
- support: S-r1-history2-03 · server/config.py:L106-L122@b769236 · rung 1 · fit direct · upstream self
  excerpt (L106–L113, L117–L122):
    def git_timeout_s() -> float:
        """Wall-clock cap on EVERY git subprocess (``KB_GIT_TIMEOUT_S``, default 60s).

        Load-bearing since P24: the push (fetch → rebase → push) runs on the
        after-response publish worker while holding ``WRITE_LOCK``, so an unbounded
        ``git`` — a hanging SSH connection to GitHub, say — would block every
        subsequent write in the process. A timeout surfaces as ``GitError`` (the
        subprocess is killed), which the worker logs; the local commit and the
        …
        raw = _env("KB_GIT_TIMEOUT_S", "60")
        try:
            value = float(str(raw))
        except (TypeError, ValueError):
            return 60.0
        return value if value > 0 else 60.0
  excerpt-sha256 (L106–L122, first 16 hex): 1220ae411abb40f4
- scope: added in b769236; config.py at HEAD not re-read
- confidence: high · flags: none · conflicts: none — extends C-r1-history-06 with the config side and the commit

### C-r1-history2-06
- claim: The b769236 diff to `server/main.py` deleted the in-lock push and the in-request embed from `create_document`, replaced them with two `publish.submit(...)` calls placed after the `with WRITE_LOCK:` block (one for `_push_task(config.kb_root())` when the write committed and `KB_GIT_PUSH` is on, one for `_embed_task(...)` when embeddings are enabled), set `pushed = False` unconditionally, added `push_pending` to the response, removed `push_error` from it, and made the same change in the delete path `_delete_document`.
- kind: behaviour · questions: Q10 · load-bearing: yes
- support: S-r1-history2-03/P2 (`git show b769236 -- server/main.py`, hunk @@ -783,40 +847,35 @@) · rung 1 · fit direct · upstream self
  excerpt (added lines, part):
    +    pushed = False
    +    push_pending = False
    +    if committed and config.git_push_enabled():
    +        push_pending = True
    +        publish.submit(f"push {rel}", _push_task(config.kb_root()))
         if config.embeddings_enabled():
    …
    +        publish.submit(
    +            f"embed {rel}",
    +            _embed_task(
    +                db_file=config.db_path(),
- support: S-r1-history2-03/P2 (hunks @@ -849,13 +908,19 @@ and @@ -929,15 +993,15 @@) · rung 1 · fit direct · upstream self
  excerpt (part):
    +        "push_pending": push_pending,
         }
         if commit_error is not None:
             resp["commit_error"] = commit_error
    -    if push_error is not None:
    -        resp["push_error"] = push_error
    …
    +    # After-response publish of the delete commit — same mechanism and semantics
    +    # as the POST path (see create_document 4b): KB_GIT_PUSH-gated, off by
    +    # default, queued on the publish worker outside WRITE_LOCK (the task retakes
    +    # it), never spends the caller's timeout budget.
  excerpt-sha256: n/a (diff hunks; check by content)
- scope: b769236; the `pushed = False` / `push_pending` lines are at 4-space indent, i.e. outside `with WRITE_LOCK:`
- confidence: high · flags: none
- conflicts: none — confirms C-r1-history-04, -07 at commit level and adds that the delete path changed in the same commit

### C-r1-history2-07
- claim: In b769236, the `gitops.push` docstring was changed from "the caller uses it as the authoritative `commit_sha`" to say that, since P24, the returned published head is a log/diagnostic value and no longer the response's `commit_sha`, which is the pre-rebase local commit.
- kind: fact · questions: Q10 · load-bearing: no (confirms C-r1-history-08 at commit level)
- support: S-r1-history2-03/P4 (`git show b769236 -- server/gitops.py`, hunk @@ -66,13 +81,18 @@) · rung 1 · fit direct · upstream self
  excerpt (part):
    -    published** HEAD (the caller uses it as the authoritative ``commit_sha``).
    …
    +    published** HEAD. Since P24 this runs on the after-response publish worker,
    +    so it is a log/diagnostic value, no longer the response's ``commit_sha``
    +    (that is the pre-rebase local commit the request itself made).
  excerpt-sha256: n/a (diff hunk)
- scope: b769236
- confidence: high · flags: none · conflicts: none

### C-r1-history2-08
- claim: The P24.S1 result (added in b769236) says the worker-thread queue was chosen over Starlette `BackgroundTasks` because with `BaseHTTPMiddleware` in the stack a background task can run before the body has been streamed to the client, and that the new test `test_response_does_not_wait_for_a_hanging_push` replaces `gitops.push` with one that blocks on an `Event` and asserts the POST still returns 201 in under 1 s, a test the result says fails on the old code by construction.
- kind: fact · questions: Q10 · load-bearing: no (mechanism choice and its proof; extends C-r1-history-16)
- support: S-r1-history2-01 · works/phases/active/P24/slices/P24.S1/result.md:L15-L36@9978d84 · rung 1 · fit direct · upstream self
  excerpt (L15–L22, L31–L36):
    - **The ordering guarantee is in the code, not in the ASGI stack.** `publish.submit()`
      is a `queue.put()` on the request thread and returns immediately; the git/Gemini
      work happens on a separate, always-running daemon thread. So "the response never
      waits on the push" holds regardless of what the `BaseHTTPMiddleware` metering
      wrapper does with the response body — which is exactly the subtlety phase.md
      flagged for `BackgroundTasks` (with `BaseHTTPMiddleware` in the stack a background
      task can run before the body has been streamed to the client, which would have
      reproduced the bug).
    …
    Ordering proof, concretely: the push task runs on the `kb-publish` thread, whose
    only rendezvous with a request is `WRITE_LOCK`. The new test
    `test_response_does_not_wait_for_a_hanging_push` pins this — `gitops.push` is
    replaced by one that blocks on an `Event`, the POST still returns 201 in **< 1s**
    (asserted), the fake push is observed to have started, and only then is it released.
    That test fails on the old code by construction.
  excerpt-sha256 (L15–L36, first 16 hex): f00968748c2218d3
- scope: P24.S1, as reported by the executor; the test file itself was not read
- confidence: high (for what the result states) · flags: vendor-about-itself (a slice result describing its own work)
- conflicts: none

### C-r1-history2-09
- claim: The single process-wide write lock and the "failed commit never rolls back the write (201 with committed:false)" rule date from the first write-path commit, 207f2ff (P2.S3, 2026-07-02), whose message also says the scoped commit stages only the touched paths, "never -A, never push".
- kind: fact · questions: Q9, Q11 · load-bearing: yes (dates the oldest invariants)
- support: S-r1-history2-04/P1 · rung 1 · fit direct · upstream self
  excerpt (message body): "… commits staging only the two touched paths (never -A, never push) — all under one process-wide write lock. 409 names the existing doc; a failed commit never rolls back the write (201 with committed:false)."
  excerpt-sha256: n/a (commit message)
- scope: `git log -S 'WRITE_LOCK = threading.Lock()' -- server/main.py` returns only 207f2ff, so the lock definition has existed unchanged since that commit
- confidence: high · flags: none · conflicts: none — extends C-r1-history-02, -03 with their origin

### C-r1-history2-10
- claim: The push entered the write path in commit 0cfb703 (P8.S1, 2026-07-14), whose message says `KB_GIT_PUSH` defaults to false so local and plugin installs never push, that `gitops.push` does fetch, rebase onto origin/main and a non-force push, and that `pushed`/`push_error` mirrored `committed`/`commit_error`, with `commit_sha` the final pushed HEAD on success.
- kind: fact · questions: Q10, Q11 · load-bearing: yes (the earlier design Q10 asks about)
- support: S-r1-history2-05/P1 · rung 1 · fit direct · upstream self
  excerpt (message body): "KB_GIT_PUSH (default false; local/plugin never push). gitops.push(): fetch -> rebase onto origin/main -> non-force push, returns published HEAD; clean abort on conflict. POST + both DELETEs gain pushed/push_error mirroring committed/commit_error; commit_sha is the final pushed HEAD on success."
  excerpt-sha256: n/a (commit message)
- scope: P8.S1 to P24.S1 (2026-07-14 to 2026-08-05) is the period the in-request push existed
- confidence: high · flags: none · conflicts: none

### C-r1-history2-11
- claim: The in-request embed call in `server/main.py` was introduced by commit 0138f72 (P4.S6, 2026-07-08, "hybrid semantic search with Gemini embeddings and RRF fusion"), the only commit whose diff changes the count of `embeddings_mod.embed_texts` in that file.
- kind: fact · questions: Q11 · load-bearing: no
- support: S-r1-history2-06/P1 · rung 1 · fit direct · upstream self
- scope: `git log -S` counts occurrences; b769236 moved the call into `_embed_task` without changing its count, so it does not appear
- confidence: medium (inferred from a pickaxe search, the 0138f72 diff was not read) · flags: none · conflicts: none

### C-r1-history2-12
- claim: At HEAD 9978d84 the worker-side Gemini embed is still not bounded by a client timeout: `embeddings.embed_texts` builds `genai.Client(api_key=api_key)` and calls `client.models.embed_content(model=…, contents=…, config=cfg)` with no timeout setting, and `server/embeddings.py` has not changed since commit 0138f72 (P4.S6, 2026-07-08).
- kind: behaviour · questions: Q9, Q10 · load-bearing: yes (settles the open scope of C-r1-history-19)
- support: S-r1-history2-01 · server/embeddings.py:L140-L147@9978d84 · rung 1 · fit direct · upstream self
  excerpt (L140–L147):
        client = genai.Client(api_key=api_key)
        cfg = types.EmbedContentConfig(task_type=task)
        out: list[list[float]] = []
        for text in items:
            attempt = 0
            while True:
                try:
                    resp = client.models.embed_content(model=model, contents=text, config=cfg)
  excerpt-sha256 (L140–L147, first 16 hex): d2e6bc828e7e3738
- support: S-r1-history2-01/P8 (`git log -- server/embeddings.py` → only 0138f72) · rung 1 · fit direct · upstream self
- support: S-r1-history2-01 · docs/current/backend.md:L119-L120@9978d84 · rung 1 · fit direct · upstream self
  excerpt (L120, part):
    … The worker-side Gemini embed has **no client timeout** — it can no longer delay a response, but a stalled embed blocks the single FIFO worker and therefore every push queued behind it until restart (availability of the off-box backup, not correctness; a deferred job). The queue is unbounded. …
  excerpt-sha256 (L119–L120, first 16 hex): 98f5fdd2a939ade4
- scope: HEAD 9978d84; `grep -n -i timeout` on embeddings.py found no timeout setting (only "retries" and a comment); the SDK's own default timeout was not checked (no web)
- confidence: high · flags: none · conflicts: none — confirms C-r1-history-19 still holds at HEAD

### C-r1-history2-13
- claim: `docs/current/backend.md` states two P24 invariants for the write path: a publish task must always be submitted from outside the `WRITE_LOCK` critical section because the worker takes the same lock from a background thread, and there is no network I/O before a write's response, so a new pre-response network call would silently re-introduce the client-timeout bug P24 fixed.
- kind: fact · questions: Q9 · load-bearing: yes (a further statement site for the invariants)
- support: S-r1-history2-01 · docs/current/backend.md:L136-L137@9978d84 · rung 1 · fit direct · upstream self
  excerpt (L136 part, L137 part):
    … **(P24)** the publish worker takes that same one lock from a *background* thread, so a publish task must always be **submitted from outside the critical section** — submitting while holding it would self-deadlock the moment the worker ran.
    - **(P24) No network I/O before a write's response.** Everything between the request and the 201 is local (validate → archive → file write → Recent/landing → DB commit → local `git add`/`commit`); anything that talks to GitHub or Gemini goes on the publish worker. A new pre-response network call would silently re-introduce the client-timeout bug this phase fixed. Corollary: **every git subprocess is bounded** by `KB_GIT_TIMEOUT_S`, because the worker holds `WRITE_LOCK` while it pushes.
  excerpt-sha256 (L136–L137, first 16 hex): 8aa56c551d312cea
- support: S-r1-history2-01 · docs/current/backend.md:L113@9978d84 · rung 1 · fit direct · upstream self
  excerpt (L113, part):
    P24 fixes a client-visible bug with no new dependency and no contract removal: `POST /api/documents` used to run **two unbounded network stages between the durable save and the 201** — `gitops.push` (fetch + rebase + push, two SSH round-trips, and until P24 `subprocess.run` with **no `timeout=` at all**) *inside* `WRITE_LOCK`, and the Gemini embed just after it.
  excerpt-sha256 (L113, first 16 hex): d799708179f0b260
- scope: backend.md current version (its `previous:` line names v0012, the P24 version); "network" means GitHub and Gemini, see C-r1-history-12 for the Postgres hops
- confidence: high · flags: none · conflicts: none

### C-r1-history2-14
- claim: `docs/current/operations.md` states the operator-side consequences of P24: the push outcome is no longer in the response (a failed push appears only as `[kb-api] publish: push <rel_path> FAILED: <err>` in the api container log), the queue is in memory so a container restart drops a not-yet-run push but never a save, and a stalled embed blocks the queue behind it until restart while writes and the live site do not lag.
- kind: fact · questions: Q9 · load-bearing: no (operations view of the invariants)
- support: S-r1-history2-01 · docs/current/operations.md:L248-L262@9978d84 · rung 1 · fit direct · upstream self
  excerpt (L252–L255, L259–L262):
      saved, committed, and live. Now the response never waits on a remote. Operationally this means
      **the push's outcome is no longer in the response at all**: `pushed` is always `false`,
      `push_pending:true` just means "queued", `push_error` is gone, and a failed push appears **only**
      as `[kb-api] publish: push <rel_path> FAILED: <err>` in the api container log. `commit_sha` in
    …
      later write — which is why `KB_GIT_TIMEOUT_S` (default 60 s) bounds every git subprocess. The
      queue is in-memory: a container restart drops any not-yet-run push (never a save), and the next
      successful push publishes everything accumulated. A stalled **embed** blocks the queue behind it
      until restart — semantic search and the off-box backup lag, writes and the live site do not.
  excerpt-sha256 (L248–L262, first 16 hex): f62da564cb1e548c
- scope: operations.md current version
- confidence: high · flags: none
- conflicts: see Conflicts (operations.md L242 places validation inside the write lock)

### C-r1-history2-15
- claim: The P24.S1 result records two further accepted risks of moving the embed onto the worker: the background embed opens its own SQLite connection and can race a concurrent write for the database write lock because `db.connect` sets no `busy_timeout`, and it can lose its foreign-key target if the document is deleted between the write and the embed; the result says both fail closed (logged, embedding skipped, next reindex catches up).
- kind: fact · questions: Q9 · load-bearing: no
- support: S-r1-history2-01 · works/phases/active/P24/slices/P24.S1/result.md:L133-L141@9978d84 · rung 1 · fit direct · upstream self
  excerpt (L137–L141):
    - The background embed opens its own SQLite connection, so it can now race a
      concurrent write for the DB write lock (`db.connect` sets no `busy_timeout`), and
      it can lose its FK target if the document is deleted between write and embed.
      Both fail closed: logged, embedding skipped, next reindex catches up (semantic
      search is a disposable cache).
  excerpt-sha256 (L133–L141, first 16 hex): ad998b1e2d750c7f
- scope: as of P24.S1; whether `db.connect` sets `busy_timeout` at HEAD was not checked (code-write's ground)
- confidence: medium · flags: vendor-about-itself · conflicts: none

### C-r1-history2-16
- claim: P23's versioned re-publish landed in commit a36df74 ("feat(server): archive superseded document versions and add version-aware publish", 2026-08-05 16:32 +0900), about seven hours before P24's b769236 on the same day; the b769236 diff context shows the step-3a archive already inside `with WRITE_LOCK:` before P24 changed the push.
- kind: date · questions: Q11 · load-bearing: no
- support: S-r1-history2-07/P1 · rung 1 · fit direct · upstream self
- support: S-r1-history2-03/P2 (hunk @@ -665,7 +730,8 @@, context lines "with WRITE_LOCK:" then "# 3a. Archive the body about to be replaced, BEFORE it is overwritten, to") · rung 1 · fit direct · upstream self
- scope: dates are author dates
- confidence: high · flags: none · conflicts: none — confirms C-r1-history-20's commit

### C-r1-history2-17
- claim: Books and chapters reached the write path in commit abfa307 ("feat(server): P30.S2 books and chapters — manifests, derived tables, placement, book routes", 2026-10-21 02:24 +0900), and native chapters in commit 373522d ("feat(server): P30.S5 native ingest, read routes, MCP and html-to-native migration", 2026-10-21 03:26 +0900); between them, e912ea3 (P30.S4 chapter image assets) also touched `server/main.py` that day.
- kind: date · questions: Q11 · load-bearing: no
- support: S-r1-history2-08/P1 · rung 1 · fit direct · upstream self
- support: S-r1-history2-09/P1 · rung 1 · fit direct · upstream self
- support: S-r1-history2-01 (`git log --follow -- server/main.py`, line "e912ea3 2026-10-21 feat(server): P30.S4 chapter image assets — validated upload, lossless strip, gated routes, web relay") · rung 1 · fit direct
- scope: author dates; the diffs were not read
- confidence: high · flags: none · conflicts: none — confirms C-r1-history-21, -22, -24 at commit level

### C-r1-history2-18
- claim: The shared pre-lock validation function `_check_document` and the dry-run endpoint landed in commit 7c27519 ("feat(api): P31.S1 knowledge check, a dry-run validation endpoint and CLI", 2026-10-21 19:11 +0900), the most recent commit to touch `server/main.py` before HEAD.
- kind: date · questions: Q11 · load-bearing: no
- support: S-r1-history2-10/P1 · rung 1 · fit direct · upstream self
- support: `git log --follow 9978d84 -- server/main.py` first line "7c27519 2026-10-21 feat(api): P31.S1 …" · rung 1 · fit direct
- scope: author date; diff not read
- confidence: high · flags: none · conflicts: none — confirms C-r1-history-23's commit

## Conflicts
- C-r1-history2-14 (doc vs code, scope): docs/current/operations.md:L242 says "In-request, inside the write lock (all local, no network): validate → write the `docs/` file → …", placing validation inside the lock. The code at HEAD validates in `_check_document` before `with WRITE_LOCK:` (C-r1-history-23), and the b769236 diff context shows step "1. Validate" well before step 3's `with WRITE_LOCK:` already in August. This repeats the architecture.md conflict the first attempt recorded under C-r1-history-05; not settled here (code-validate and code-write own the line-level flow). backend.md L137 lists the same steps as "between the request and the 201" without claiming they are all under the lock, so it does not conflict.

## Speculation and flags
- C-r1-history2-08, -15: the P24.S1 executor's own report of its work (vendor-about-itself); the test file was not read.
- C-r1-history2-11: inferred from `git log -S`, not from reading the 0138f72 diff.
- C-r1-history2-03: "latency counts toward the response" is the order of the code, not a statement in it; backend.md L113 (C-r1-history2-13) states it.

## Unused leads
- works/phases/active/P24/slices/P24.S1/plan.md — not read; result.md covered the mechanism and deviations ("None in substance").
- tests/test_api_push.py@b769236 — would let a verifier confirm the <1 s ordering test of C-r1-history2-08 directly.
- server/db.py `connect` at HEAD — whether `busy_timeout` is still unset (C-r1-history2-15).
- google-genai SDK default HTTP timeout — whether `genai.Client` has an implicit timeout; for a web researcher (C-r1-history2-12 says only that the code sets none).
- Diffs of a36df74, abfa307, e912ea3, 373522d, 7c27519 on server/main.py — only messages and dates were read.

## Queries
- `git show --stat b769236` → useful
- `git show b769236 -- server/main.py` → useful
- `git show b769236 -- server/gitops.py server/config.py` → useful
- `git show --no-patch --format=… a36df74 abfa307 373522d 7c27519` → useful
- `git log -S 'WRITE_LOCK = threading.Lock()' -- server/main.py` → useful (207f2ff)
- `git show --stat … 207f2ff` → useful
- `git log -S 'def push(' -- server/gitops.py` → useful (0cfb703); `git show --no-patch 0cfb703` → useful
- `git log -S 'embeddings_mod.embed_texts' 9978d84 -- server/main.py` → useful (0138f72)
- `git log 9978d84 -- server/embeddings.py` → useful (unchanged since P4.S6)
- `git log --follow 9978d84 -- server/main.py` → useful (full timeline)
- `git log -1 b769236^` → ac29872; `git grep -n … ac29872 -- server/main.py server/gitops.py` → useful
- `grep -n -i 'timeout|http_options|retries' server/embeddings.py` → useful (no timeout)
- `grep -n -i 'embed|publish worker|KB_GIT_TIMEOUT|accepted limit' docs/current/operations.md docs/current/backend.md` → useful
- Read works/phases/active/P24/slices/P24.S1/result.md, server/embeddings.py L38-L167, docs/current/operations.md L232-L267 → useful
- 11 excerpt-hash commands (`git show <c>:<path> | sed -n | shasum -a 256`) → done
