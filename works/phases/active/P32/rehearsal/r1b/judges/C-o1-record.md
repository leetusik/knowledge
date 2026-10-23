# Record, subject C

## Chapter 1 (4118 words)

**R1** All 8 correct.
- M1 correct: "`_check_document` ... is shared with `POST /api/documents/check`... 'only reads ... no lock, no file, no row, no commit'".
- M2 correct: "A `threading.Lock` only excludes threads in one process... single-worker deployment is part of the design". Not reentrant: covered.
- M3 correct: flow diagram plus "The manifest comes first", "archive comes before the overwrite", assets, Recent index, DB upsert, manifest/rows, commit. Archive path form `.versions/<project>/<stem>/vNNNN`.
- M4 correct: staged list quoted, "never `git add -A`", `.assets/` dropped, commit messages, Co-Authored-By.
- M5 correct: "It becomes `committed: false` plus `commit_error` in a 201. The file and the row stay written."
- M6 correct: queued outside the lock, FIFO daemon worker, pushes serialized, failures logged, `pushed` hard-coded false, `push_pending`.
- M7 correct: `KB_GIT_PUSH` default false, fetch/rebase/non-force push, `rebase --abort`, `KB_GIT_TIMEOUT_S` 60 s and why.
- M8 correct: the `curl --max-time 5` quote.

**R2** 3 of 4 present (E3 only partial).
- E1 present: "the queue is in memory and can lose tasks on a crash"; drain 10 s; next push; reindex.
- E2 present, thinly: "never scale to multiple workers"; Celery/RabbitMQ and outbox are named. No file or DB lock alternative.
- E3 partial. It names `commit_sha` as pre-rebase, plus `pushed` and `push_pending`. It does not list `version`, `previous_version` or `archived_path`. It never says to verify with a GET before re-POSTing ("Retrying would collide").
- E4 present: "public root only", `ctx.is_public`, "Other tenants write under a gitignored tenants/ tree".
- Counted: E1, E2, E4 present; E3 absent as specified.

**R3** n_cited = 7 (four sources). All checked. Supported 7.
- FastAPI async: supported.
- FastAPI background tasks (including the Celery/RabbitMQ/Redis quote): supported.
- git-push ("only fast-forward updates", "--force can cause the remote repository to lose commits"): supported.
- microservices.io outbox: supported.
- The "rebasing first turns non-ff into ff" sentence is uncited.
- Effective citations: 4. No contradictions. Pass.

**R4** Load-bearing claims: 8.
- Files canonical, DB disposable: primary (code).
- Single worker and lock: primary.
- Order inside the lock: primary.
- Scoped commit: primary.
- No rollback: primary.
- Worker and queue: primary.
- Push discipline and timeout: primary.
- P24 rationale: primary (docstring).
- Share primary or two-independent: 8/8. Aggregator-only: 0.

**R5** Named about 40 entities; all exist at 9978d84.
- Entities checked: `create_document`, `_check_document`, `WRITE_LOCK`, `_push_task`, `_embed_task`, `publish.submit/drain/pending/last_error`, `gitops.add/commit/push/_run`, `config.git_push_enabled/git_timeout_s/git_commit_enabled`, `tests/test_api_push.py::test_response_does_not_wait_for_a_hanging_push`.
- 10 code claims checked, all match.
  - Handler starts at 1302 (the decorator) and `_check_document` is at line 938.
  - Staged list, message formats and `GitError` handling match.
  - `pushed` is hard-coded false.
  - Push task retakes the lock.
  - Worker loop matches.
  - Drain 10 s matches.
  - `rebase --abort` matches.
  - `_run` timeout matches.
  - `.assets` is dropped in `gitops.add`.
- Pass.

**R6** Traps: none committed. It says "Never `git add -A`", "Never --force" and "one uvicorn worker".

**R7** English: yes. Quiz: 5 items (3 choice, 1 recall, 1 cloze). Keys correct 5/5. q-validate answers a,d: the manifest settle is under the lock, which matches the code.

**R8** Pass. It flags the in-memory queue and crash loss, and the sha that may differ after a rebase. It marks the numbers in the timeline as illustrative. It does not flag concurrency weaknesses of the pre-lock checks, and it does not mention that the 201 can wait behind a push on the lock. It states "the 201 never waits" without qualification, which is slightly overstated.

**R9** Minor. Background and Intuition partly repeat, and the invariants list restates earlier points.

## Chapter 2 (6395 words)

**R1** All 8 correct.
- M1: "`_check_document` ... 'only reads' ... no lock, no file, no row, no commit", plus the dry run section and an error-order table.
- M2: "single process-wide `threading.Lock` ... sufficient only because ... single uvicorn worker"; the Dockerfile quote; not reentrant.
- M3: the nine-step order inside the lock.
- M4: the scoped commit, with `.assets` dropped and the message formats.
- M5: "still answers 201: the file, the row and the index stay as written".
- M6: two queue appends, FIFO daemon thread, outside the lock, `pushed` always false, `push_pending`.
- M7: `KB_GIT_PUSH` off by default, fetch/rebase/push, never `--force`, abort, `KB_GIT_TIMEOUT_S` 60 s.
- M8: P24, `/explain` with `curl --max-time 5`, operator report.

**R2** 4 of 4 present.
- E1: "Queued work lives only in memory" (drain 10 s, crash, SIGKILL), "Unpushed commits travel with the next push", reindex canonical.
- E2: single worker, "Never add --workers", a second process would have its own lock; Celery/RabbitMQ/Redis. No file or DB lock alternative, but it contrasts with BackgroundTasks and the outbox.
- E3: the response field table, "Verify by reading the document back; never re-POST blind", `commit_sha` before rebase.
- E4: `ctx.is_public` only for tenant #1, "only a public caller's writes are committed to git".

**R3** n_cited about 26. k=1, so statements 1–15 were checked (the later ones cite the same pages).
- Supported 13, partial 2, unsupported 0, contradicted 0, unopenable 0.
- Pages re-opened: FastAPI deployment concepts, FastAPI async, Starlette threadpool (40 tokens), FastAPI background tasks, Starlette background tasks (including the "if one raises, later tasks don't run" claim), microservices.io, AWS outbox, Azure background jobs (the idempotency/restart text), git-push, git-rebase, git-rev-list, Python threading, Python atexit.
- Partial: git-push rebase remedy (the page names `git pull --rebase`, not `git rebase`); Azure ("reduce interactive response times" is present).
- The signal page was not separately re-opened. The atexit and threading pages cover the same text.
- Effective citations: 12. Pass.

**R4** Load-bearing claims: 10.
- Canonical files, single writer, order inside the lock, scoped commit, no rollback, worker and queue, push discipline, P24 cause: all primary (code, docstrings, Dockerfile).
- The 201 can wait behind a push on the lock: primary (code reasoning).
- Two pre-lock races: code reasoning, labelled "traced but never observed".
- Share primary or two-independent: 10/10. Aggregator-only: 0.

**R5** About 55 entities named; all exist.
- Includes `_place_variant`, `ensure_registry_project` and its docstring ("row may be created even when the handler then 409s", line 832), the Dockerfile quote, and three tests in `test_api_push.py`.
- Line references match: signature 1303–1310, check call 1319–1320, lock open 1371–1374, commit step 1566–1596, queue 1616–1632 (actual 1618–1632), `_push_task` 198–200, WRITE_LOCK comment 179–183.
- Claims checked, 10, all match: nine-step order, `publish.submit` bumps a counter and puts on the queue, the `_push_task` retake, the lock-wait behaviour (plain `with WRITE_LOCK`), and the others.
- The race and partial-failure claims are plausible from the code and are flagged as reasoned, not observed.
- Pass.

**R6** Traps: none committed. It states "never `--force`", "Never add --workers", and says the queue is not persistent.

**R7** English: yes. Quiz: 5 items. Keys correct 5/5. q-refused: the 409 comes from `_check_document`, correct. q-wait: b, correct per the code.

**R8** Pass, strongly.
- Declares "How long the lock wait can last is an open question".
- Marks the races as "traced but never observed".
- Notes that the docs disagree with the code on validation and the lock.
- Notes the embed has no timeout.
- Says no test covers the races.
- Says the outbox is an analogy and breaks at the relay.

**R9** Minor. Some repetition between Intuition, the lock-wait section and the invariants. The extra depth is mostly information-bearing.

## Pairwise

- **Helpfulness: 2.** Ch2 is more useful for tracing and changing the path. It has a field table, an error-order table, a dry-run section, and the "Before you change" list tied to the concurrency limits. Ch2 also shows the 201 can wait on `WRITE_LOCK` behind a push. Ch1 is cleaner for a first read, but it leaves the "never waits" claim unqualified.
- **Comprehensiveness: 2.** Ch2 covers the response fields, the GET-before-re-POST guidance, the stranded-commit check, tenants and auth, the pre-lock races, and partial failure. Ch1 covers the core eight points and E1, E2 and E4.
- **Insight: 2.** The lock-wait insight, the "advisory pre-lock check" reasoning, the P24 history (commit b769236) and the outbox analogy with its limits give Ch2 more *why*. Ch1's reasoning on the lock and the outbox is good but shallower.
- **Readability: 1.** Ch1 is shorter and linear, with good diagrams. Ch2 is about 55% longer and denser, with line-number clutter, though well signposted.

```json
{"subject": "C",
 "chapters": {
  "1": {"R1": {"correct": 8, "of": 8, "wrong": [], "absent": []},
        "R2": {"present": 3, "of": 4},
        "R3": {"n_cited": 7, "checked": 7, "supported": 7, "partial": 0, "unsupported": 0, "unopenable": 0,
               "contradicted": 0, "effective_citations": 4, "pass": true},
        "R4": {"load_bearing": 8, "primary_or_two": 8, "aggregator_only": 0},
        "R5": {"named": 40, "found": 40, "claims_checked": 10, "claims_match": 10, "pass": true},
        "R6": {"committed": []},
        "R7": {"english": true, "quiz_items": 5, "keys_correct": 5},
        "R8": {"pass": true},
        "R9": {"padding": "minor"}},
  "2": {"R1": {"correct": 8, "of": 8, "wrong": [], "absent": []},
        "R2": {"present": 4, "of": 4},
        "R3": {"n_cited": 26, "checked": 15, "supported": 13, "partial": 2, "unsupported": 0, "unopenable": 0,
               "contradicted": 0, "effective_citations": 12, "pass": true},
        "R4": {"load_bearing": 10, "primary_or_two": 10, "aggregator_only": 0},
        "R5": {"named": 55, "found": 55, "claims_checked": 10, "claims_match": 10, "pass": true},
        "R6": {"committed": []},
        "R7": {"english": true, "quiz_items": 5, "keys_correct": 5},
        "R8": {"pass": true},
        "R9": {"padding": "minor"}}},
 "pairwise": {"helpfulness": "2", "comprehensiveness": "2", "insight": "2",
              "readability": "1"}}
```
