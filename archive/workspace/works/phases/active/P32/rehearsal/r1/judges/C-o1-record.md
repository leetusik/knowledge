# Record, subject C (pinned commit 9978d84)

## Chapter 1

**R1** All 8 correct.
- M1: "`_check_document` ... is shared with `POST /api/documents/check`... 'only reads ... no lock, no file, no row, no commit'"
- M2: "A `threading.Lock` only excludes threads in one process... The single-worker deployment is part of the design."; the lock "is not reentrant".
- M3: the flow diagram and the "manifest first / archive before overwrite / file before row" text give the order. The archive path, assets and Recent/landing are covered.
- M4: staged-list code block; "`gitops.add` also drops any path inside `.assets/`"; message formats; Co-Authored-By.
- M5: "does not re-raise. It becomes `committed: false` plus `commit_error` in a 201."
- M6: "one daemon thread... FIFO order"; submit is "outside the lock"; failures are logged; `pushed` is hard-coded false.
- M7: fetch, rebase, non-force push; `rebase --abort`; `KB_GIT_TIMEOUT_S` is 60 s and matters because the push holds `WRITE_LOCK`.
- M8: the `/explain` `curl --max-time 5` quote.

**R2** 3 of 4 present.
- E1 present: shutdown drain of 10 s, the next push carries the commit, the startup reindex.
- E2 present: single worker, Celery/RabbitMQ, outbox.
- E3 absent: the fields appear only in the quiz, and there is no "GET before re-POST". It does note `commit_sha` is pre-rebase.
- E4 present: "caller writes the public root".

**R3** n_cited = 9, all checked.
- All supported: FastAPI async, BackgroundTasks, git-push (x2), Celery/RabbitMQ, outbox x2, and the repeats.
- Effective citations: 4 (fastapi async, fastapi bg, git-push, microservices.io).
- No contradictions.

**R4** Load-bearing claims: about 8, all resting on the code, the docstrings and the primary docs (FastAPI, git, microservices.io pattern page). Primary or two-independent: 8 of 8. Aggregator only: 0.

**R5** Entities named: about 30 (functions, files, env vars, the test). All exist.
- Checked 10 code claims: line numbers 1302 and 938, "about 440 lines", the scoped-commit code, push code, `_run` timeout, drain 10 s, the test, `.assets` drop, and the lock location. All match.
- Weak spots:
  - It says the "book cannot be created (422)" refusal is decided under the lock. `_check_document` raises the same 422 first (main.py:1040).
  - Its invariant 7 says "never a bare subprocess.run", while `gitops.push` itself uses one (with a timeout).
- Pass, with those flags.

**R6** Committed: none.

**R7** English: yes. Quiz items: 5. Keys correct: 4 of 5.
- q-validate marks [a,d] correct. d (book cannot be created, 422) is already raised in `_check_document`, so that key is wrong or at best misleading.

**R8** Fail (mild). It declares the in-memory queue and the shutdown drop. But it states "A 4xx leaves no trace" as settled, though `ensure_registry_project` can create a row. It also never mentions that validation is not re-checked under the lock.

**R9** Minor. The invariants checklist repeats earlier points.

## Chapter 2

**R1** All 8 correct.
- M1: `_check_document` is the one validation path; "only reads"; shared with the dry run.
- M2: the WRITE_LOCK code block and "exactly one uvicorn worker". Non-reentrancy appears in the quiz answer and the "(not reentrant)" wording.
- M3: the 9-step list under the lock, in order.
- M4: the staged list, `.assets` dropped, message formats, trailer.
- M5: "nothing is rolled back, and the request still returns 201."
- M6: kb-publish daemon, FIFO, submitted outside the lock, failures logged to the container log, `pushed` is False, `push_pending`.
- M7: fetch / rebase / push HEAD:main, never `--force`, abort, 60 s timeout.
- M8: the `/explain` `curl --max-time 5` story, with commit b769236.

**R2** 4 of 4 present.
- E1: memory queue, 10 s drain, SIGKILL, next push catches up.
- E2: "hard constraint", Celery and outbox.
- E3: the response fields, `commit_sha` pre-rebase, "a lost response is checked by reading the document back".
- E4: public root only.

**R3** n_cited about 19. Checked 14 of the planned 15 (the signal.html page was not re-opened).
- 14 supported: FastAPI async, bg, Starlette (40 tokens), deployment ("normally don't share any memory"), git-push (fast-forward, rebase remedy, src:dst), git-rebase, rev-list, atexit, outbox, AWS, Azure.
- 0 contradicted.
- Effective citations: 11.

**R4** Load-bearing claims: about 9. They rest on the code, the repo docs (architecture.md line 37, verified; a P24 review note, verified) and primary docs. Primary or two-independent: 9 of 9. Aggregator only: 0.

**R5** Entities named: about 35 (`ensure_registry_project`, `_place_variant`, `store_assets`, `resolve_api_write`, `UNIQUE(tenant_id, rel_path)`, commits b769236 and 207f2ff, and others). All exist or verify.
- Checked 10 claims: validation order, the two narrow "writes nothing" exceptions, the race (traced; the UNIQUE constraint is at db.py:45), no try/finally, the embed with no timeout (review note), the architecture.md contradiction, and others. All match.
- Pass.

**R6** Committed: none.

**R7** English: yes. Quiz items: 5. Keys correct: 5 of 5.

**R8** Pass. It has a dedicated section on where the promises stop: waiting behind a push, the unvalidated-under-lock race ("traced, not observed"), the unbounded embed, the doc contradiction, and the absence of any bound on whole-push time.

**R9** None to minor.

## Pairwise

- **Helpfulness: 1.** Chapter 1 shows the real code in order with line numbers, and gives a 9-point invariant checklist plus the pinning test. That serves tracing and changing the path directly. Chapter 2 is more prose-led but strong on edge cases and next steps.
- **Comprehensiveness: 2.** Chapter 2 covers the response contract and the lost-response GET, auth, the dry run, the tenant and registry caveats, the lock-wait behaviour, the race, the unbounded embed and the crash/kill semantics. Chapter 1 omits the response contract and the GET-before-re-POST rule.
- **Insight: 2.** Chapter 2 explains where the "never waits" promise ends and finds a real un-rechecked-validation window. Chapter 1 has good outbox and BackgroundTasks trade-offs but overstates "4xx leaves no trace" and has one wrong quiz key.
- **Readability: 1.** Chapter 1 reads as a clean stepwise walkthrough with a timeline, a sequence diagram and a flow diagram. Chapter 2 is denser, with long paragraphs in the "edges" section.

```json
{"subject": "C",
 "chapters": {
  "1": {"R1": {"correct": 8, "of": 8, "wrong": [], "absent": []},
        "R2": {"present": 3, "of": 4},
        "R3": {"n_cited": 9, "checked": 9, "supported": 9, "partial": 0, "unsupported": 0, "unopenable": 0,
               "contradicted": 0, "effective_citations": 4, "pass": true},
        "R4": {"load_bearing": 8, "primary_or_two": 8, "aggregator_only": 0},
        "R5": {"named": 30, "found": 30, "claims_checked": 10, "claims_match": 10, "pass": true},
        "R6": {"committed": []},
        "R7": {"english": true, "quiz_items": 5, "keys_correct": 4},
        "R8": {"pass": false},
        "R9": {"padding": "minor"}},
  "2": {"R1": {"correct": 8, "of": 8, "wrong": [], "absent": []},
        "R2": {"present": 4, "of": 4},
        "R3": {"n_cited": 19, "checked": 14, "supported": 14, "partial": 0, "unsupported": 0, "unopenable": 0,
               "contradicted": 0, "effective_citations": 11, "pass": true},
        "R4": {"load_bearing": 9, "primary_or_two": 9, "aggregator_only": 0},
        "R5": {"named": 35, "found": 35, "claims_checked": 10, "claims_match": 10, "pass": true},
        "R6": {"committed": []},
        "R7": {"english": true, "quiz_items": 5, "keys_correct": 5},
        "R8": {"pass": true},
        "R9": {"padding": "none"}}},
 "pairwise": {"helpfulness": "1", "comprehensiveness": "2", "insight": "2",
              "readability": "1"}}
```
