# Record

## Chapter 1
- R1: 8/8 correct. M1 "calls `_check_document`… 'only reads'"; M2 "not reentrant… single uvicorn worker"; M3 nine-step list; M4 staged list, `.assets` dropped, messages, Co-Authored-By; M5 "still answers 201"; M6 queue/FIFO/outside lock/pushed false; M7 KB_GIT_PUSH off, fetch/rebase/push HEAD:main, abort, KB_GIT_TIMEOUT_S 60; M8 `curl --max-time 5`.
- R2: E1 present (10 s drain, crash, reindex); E2 present but weak (Celery/RabbitMQ, outbox; no file/DB lock named); E3 present ("Verify by reading the document back; never re-POST blind"); E4 present (`is_public`). 4/4.
- R3: n=16, checked statements 1–15 (k=1). All 15 supported. Effective citations: 14 (fastapi concepts, async, starlette threadpool, git-rebase, git-push, threading, signal, atexit, rev-list, fastapi bg, azure, ms.io, aws, starlette bg). No contradiction. Pass.
- R4: load-bearing claims ~8 (single-worker lock, validate-first, order in lock, no rollback, queue/push, timeout, races, in-memory); all primary (source code/project docs) with external primary docs. 8/8 primary; 0 aggregator.
- R5: ~45 entities named, all found (WRITE_LOCK, _check_document, _push_task, _embed_task, _place_variant, ensure_registry_project, prepare_assets, archive_document_file, upsert_document_version, publish.submit/drain, gitops._run/add/commit/push, tests, Dockerfile quote, plugin_parity, line ranges). 10 claims checked, 10 match (lock order, staged list, race analysis, ensure_registry_project docstring, doc quotes, tests). Pass.
- R6: none committed.
- R7: English yes. Quiz 5 items, 5 keys correct.
- R8: pass. Declares lock-wait bound unknown, races "traced but never observed", docs/code disagreement, rebase-abort-failure edge.
- R9: minor (long; some restatement in invariants/next steps).

## Chapter 2
- R1: 8/8 correct. M1 "shared with POST /api/documents/check… only reads"; M2 "threading.Lock only excludes threads in one process"; M3 flow diagram + prose; M4 staged list, `.assets/` dropped, message, co_authored_by; M5 "does not re-raise… 201"; M6 "after the `with WRITE_LOCK:` block", FIFO; M7 default false, fetch/rebase/no force/abort, 60 s; M8 curl --max-time 5.
- R2: E1 present (in memory, 10 s drop, reindex); E2 present but weak (lock per process; Celery contrast); E3 partial: commit_sha pre-rebase, version, committed; no previous_version/archived_path, no GET-verify advice → absent; E4 present (public root, tenants gitignored). 3/4.
- R3: n≈7, all checked. All supported, one near-quote slightly loose ("doesn't need to wait" vs "doesn't really have to be waiting") counted partial. Supported 6, partial 1. Effective citations: 4. No contradiction. Pass.
- R4: ~7 load-bearing claims, all primary (code/docs). 7/7.
- R5: ~35 entities all found. 10 claims checked, all match (stage list, push task, drain deadlock, images only native chapter, test asserts, 10 s drain). Pass.
- R6: none committed.
- R7: English yes. Quiz 5 items, 5 keys correct (q-validate [a,d] correct).
- R8: pass but thinner; omits that a publish can wait behind a push on the lock and the concurrency races; states "a 4xx leaves no trace" as settled (ignores registry row in tenant mode).
- R9: none.

## Pairwise
- Helpfulness: 1. Ch1 adds the lock-wait-behind-push nuance, races, response-field table, GET-verify advice, ordered change checklist; ch2 is clear but misses the one way the 201 can wait.
- Comprehensiveness: 1. Ch1 covers auth, error ordering table, tenants, response fields, durability, and gaps; ch2 omits several.
- Insight: 1. Ch1 explains why the lock rule exists, outbox analogy limits, races, partial-failure; ch2 has good timeline and "disk leads" framing.
- Readability: 2. Ch2 shorter, tighter, steps clear; ch1 long and dense.

```json
{"subject": "C",
 "chapters": {
  "1": {"R1": {"correct": 8, "of": 8, "wrong": [], "absent": []},
        "R2": {"present": 4, "of": 4},
        "R3": {"n_cited": 16, "checked": 15, "supported": 15, "partial": 0, "unsupported": 0, "unopenable": 0,
               "contradicted": 0, "effective_citations": 14, "pass": true},
        "R4": {"load_bearing": 8, "primary_or_two": 8, "aggregator_only": 0},
        "R5": {"named": 45, "found": 45, "claims_checked": 10, "claims_match": 10, "pass": true},
        "R6": {"committed": []},
        "R7": {"english": true, "quiz_items": 5, "keys_correct": 5},
        "R8": {"pass": true},
        "R9": {"padding": "minor"}},
  "2": {"R1": {"correct": 8, "of": 8, "wrong": [], "absent": []},
        "R2": {"present": 3, "of": 4},
        "R3": {"n_cited": 7, "checked": 7, "supported": 6, "partial": 1, "unsupported": 0, "unopenable": 0,
               "contradicted": 0, "effective_citations": 4, "pass": true},
        "R4": {"load_bearing": 7, "primary_or_two": 7, "aggregator_only": 0},
        "R5": {"named": 35, "found": 35, "claims_checked": 10, "claims_match": 10, "pass": true},
        "R6": {"committed": []},
        "R7": {"english": true, "quiz_items": 5, "keys_correct": 5},
        "R8": {"pass": true},
        "R9": {"padding": "none"}}},
 "pairwise": {"helpfulness": "1", "comprehensiveness": "1", "insight": "1",
              "readability": "2"}}
```
