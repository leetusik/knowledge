# Record, subject C

## Chapter 1
- R1: M1–M8 all correct, 8/8. Examples: "`_check_document` is the whole validation stage, and it only reads"; "`WRITE_LOCK` is not reentrant"; "A failed commit is reported, not rolled back"; "`pushed` is always `false`"; KB_GIT_PUSH default off, `KB_GIT_TIMEOUT_S` 60 s, `rebase --abort`; /explain `curl --max-time 5`.
- R2: E1 present (in-memory queue, 10 s drain, next push carries commits); E2 present, partly (single worker, outbox pattern; no file/DB-lock alternative); E3 present ("Check by reading the document back; never re-post blindly", `commit_sha` pre-rebase); E4 present (public root only). 4/4.
- R3: about 15 cited statements; all checked. All supported: FastAPI async, concepts, Starlette threadpool and background, FastAPI background tasks, git-push, rev-list, threading, signal, responses.py, microservices.io, AWS (at-least-once, idempotent), Azure (response times; at-least-once). 0 contradicted. Effective citations 13. Pass.
- R4: load-bearing claims are mostly code and the repo's own docs (primary); web claims rest on official docs. About 9 of 10 primary or two-independent. No aggregators.
- R5: named entities all found (create_document, _check_document, _place_variant, WRITE_LOCK, publish.submit/drain/last_error, gitops._run/add/commit/push, _push_task, KB_GIT_*, tests, docs/current files, Dockerfile quote, ensure_registry_project docstring). 10 claims checked, all match. The two races are flagged as traced, not observed. Pass.
- R6: not committed.
- R7: English. Quiz 6 items, keys all correct.
- R8: pass. Declares the indirect wait behind the lock, unbounded total push time, races as untraced, the SDK default not checked, and the stale docs.
- R9: minor (some repetition across the invariants and checklist). 5881 words.

## Chapter 2
- R1: 8/8 correct. Examples: "`_check_document` ... only reads"; "`threading.Lock` is not reentrant"; the scoped-commit block and "never `git add -A`"; "A `GitError` ... does not re-raise"; `pushed` hard-coded false; `KB_GIT_PUSH` defaults false; `KB_GIT_TIMEOUT_S` 60 s; /explain `curl --max-time 5`.
- R2: E1 present (shutdown drops after 10 s, next push carries, reindex); E2 present, partly (Celery and a job queue, outbox); E3 absent (it gives the commit_sha caveat but never says to verify with a GET before re-POSTing, and omits archived_path); E4 present (public root only). 3/4.
- R3: about 8 cited statements. All supported (FastAPI async, background tasks, git-push, outbox). Effective citations 4. Pass.
- R4: the main claims are code-backed. 8 of 8 primary or two-independent.
- R5: entities all found, including main.py:1302 and :938, test_api_write.py and test_api_push.py. 10 claims checked, all match. Small caveat: it says the book-binding refusal "can only be decided under the lock", but `_check_document` also checks placement. Also "embeddings refilled by reindex" is plausible (`_sync_embeddings`). Pass.
- R6: not committed.
- R7: English. Quiz 5 items, keys correct (a, d is defensible because `_place_variant` also runs under the lock).
- R8: partial pass. It says little about the indirect wait behind a push holding the lock, and implies "nothing networked before the 201" without qualification. It does state the crash and shutdown limits.
- R9: none or minor. 4118 words.

## Pairwise
- Helpfulness: 1. Chapter 1 gives the full ordered 422/409 list, the indirect lock wait that qualifies "never waits", the race and rollback gaps, and a fuller change checklist. Chapter 2 is clear but omits the lock-wait caveat.
- Comprehensiveness: 1. It covers the response fields, the verify-by-GET advice, the failure modes, the tenant-mode dependency and three more sources.
- Insight: 1. It explains why the lock must be re-taken, why the queue was chosen over BackgroundTasks, the outbox contrast, and the honest limits of the "201 never waits" claim.
- Readability: 2. Chapter 2 is shorter, with a timeline, a sequence diagram and a tight checklist. Chapter 1 is longer but well structured.

```json
{"subject": "C",
 "chapters": {
  "1": {"R1": {"correct": 8, "of": 8, "wrong": [], "absent": []},
        "R2": {"present": 4, "of": 4},
        "R3": {"n_cited": 15, "checked": 15, "supported": 15, "partial": 0, "unsupported": 0, "unopenable": 0,
               "contradicted": 0, "effective_citations": 13, "pass": true},
        "R4": {"load_bearing": 10, "primary_or_two": 9, "aggregator_only": 0},
        "R5": {"named": 30, "found": 30, "claims_checked": 10, "claims_match": 10, "pass": true},
        "R6": {"committed": []},
        "R7": {"english": true, "quiz_items": 6, "keys_correct": 6},
        "R8": {"pass": true},
        "R9": {"padding": "minor"}},
  "2": {"R1": {"correct": 8, "of": 8, "wrong": [], "absent": []},
        "R2": {"present": 3, "of": 4},
        "R3": {"n_cited": 8, "checked": 8, "supported": 8, "partial": 0, "unsupported": 0, "unopenable": 0,
               "contradicted": 0, "effective_citations": 4, "pass": true},
        "R4": {"load_bearing": 8, "primary_or_two": 8, "aggregator_only": 0},
        "R5": {"named": 28, "found": 28, "claims_checked": 10, "claims_match": 10, "pass": true},
        "R6": {"committed": []},
        "R7": {"english": true, "quiz_items": 5, "keys_correct": 5},
        "R8": {"pass": false},
        "R9": {"padding": "minor"}}},
 "pairwise": {"helpfulness": "1", "comprehensiveness": "1", "insight": "1", "readability": "2"}}
```
