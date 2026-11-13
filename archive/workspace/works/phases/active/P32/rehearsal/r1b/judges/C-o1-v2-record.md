# Record, subject C (pinned commit 9978d84)

## Chapter 1 (4118 words)

**R1** 8/8 correct.
- M1 "`_check_document` ... is shared with `POST /api/documents/check` ... 'only reads ... no lock, no file, no row, no commit'".
- M2 "A `threading.Lock` only excludes threads in one process ... never scale to multiple workers".
- M3 the flow diagram and the "manifest first / archive before overwrite / file before row" paragraphs.
- M4 "`gitops.add` also drops any path inside `.assets/`"; the message format and `co_authored_by` are covered.
- M5 "does not re-raise. It becomes `committed: false` plus `commit_error` in a 201".
- M6 "publish.submit ... appends to a queue.Queue" and "push task retakes WRITE_LOCK".
- M7 "fetch, rebase, push without force"; `rebase --abort`; `KB_GIT_TIMEOUT_S` default 60 s, load-bearing since the push holds the lock.
- M8 the `/explain` `curl --max-time 5` docstring quote.

**R2** 3/4 present.
- E1 present: 10 s drain; the next push carries commits; reindex.
- E2 present: Celery/RabbitMQ, the outbox, and the single-worker rule.
- E3 absent as a whole: the fields are covered, but there is no "GET before re-POST" advice.
- E4 present: "caller writes the public root".

**R3**
- n_cited is about 8, all checked.
- Supported: FastAPI async, FastAPI background tasks (Celery/RabbitMQ quote), git-push (fast-forward, force), outbox.
- Partial: one statement. The "in a plain def ... recommended" framing is slightly stronger than the page.
- 4 effective citations. No contradictions. Pass.

**R4** Load-bearing claims (7): canonical files, WRITE_LOCK single worker, validation shared, no rollback, queue after the lock, push discipline, why P24. All rest on the source code or its docstrings (primary). 7/7 primary. No aggregators.

**R5** Entities named: about 40 (`create_document`, `_check_document`, `WRITE_LOCK`, `_push_task`, `_embed_task`, `publish.submit/drain/pending`, `gitops.add/commit/push/_run`, `config.git_timeout_s`, `archive_document_file`, `upsert_document_version`, the test name, and others). All found. The "about 440 lines from 1302" claim holds (1302–1737). Claims checked: 10, 10 match. Pass.

**R6** Not committed. It says `pushed` is always false, and never `git add -A`, never force-push.

**R7** English: yes. Quiz: 5 items, 5 keys correct. In q-validate, option (d) as "under the lock" is defensible: `_place_variant` is called under the lock, though the dry run also reads the manifest.

**R8** Fail (marginal). It states as settled that "the 201 never waits on the network" and "a 4xx leaves no trace". The 201 can wait behind a push holding `WRITE_LOCK`, and the tenant-mode registry row can be left behind. It does not mention these. It does note the in-memory queue and the commit_sha caveat.

**R9** Minor. The invariants checklist repeats earlier material.

## Chapter 2 (5881 words)

**R1** 8/8 correct.
- M1 "`_check_document` is the whole validation stage, and it only reads".
- M2 the `WRITE_LOCK` code block, the Dockerfile "Never add --workers" quote, and "not reentrant".
- M3 the 9-step ordered list inside the lock.
- M4 "`git add -- <paths>` ... drops any path inside `.assets/`"; the message and the Co-Authored-By trailer.
- M5 "A failed commit is reported, not rolled back ... still answers 201".
- M6 the queue, the daemon worker, `pushed` always false, and the failure only logged.
- M7 "fetch ... rebase ... never forces"; `KB_GIT_PUSH` off by default; 60 s timeout.
- M8 the `/explain` `curl --max-time 5` story.

**R2** 3/4 present.
- E1 present: 10 s drain, hard crash, next push.
- E2 absent as a scaling analysis: only "keep one worker" and the outbox comparison.
- E3 present: field list, `commit_sha` pre-rebase, "Check by reading the document back; never re-post blindly".
- E4 present: public root only.

**R3**
- n_cited is about 15.
- Checked about 14: FastAPI async, concepts, Starlette threadpool, FastAPI background tasks, Starlette background, Azure, outbox, AWS, git-push, rev-list, threading, signal.
- The Starlette `responses.py` GitHub link was not re-opened; counted as unopenable.
- All opened pages support the statement. Azure "reduces interactive response times" and "must be idempotent" both confirmed.
- 12 effective citations. No contradictions. Pass.

**R4** Load-bearing claims (8): the same core set as chapter 1, plus the lock-wait behind a push, the two races, and the unpushed commits staying stuck. All rest on the source code, which was re-read and matches. 8/8 primary. No aggregators.

**R5** Entities named: about 45. All found, including `ensure_registry_project` (async, line 815), `_place_variant`, `publish.last_error`, and the three `_push_task` submit sites (publish, delete, book). The Dockerfile quote matches. Claims checked: 10, 10 match. The race claims follow from code (`rel`, `prev_version` and `doc_version` come from `_check_document`) and are flagged as inferred, not observed. Pass.

**R6** Not committed.

**R7** English: yes. Quiz: 6 items, 6 keys correct.

**R8** Pass. It flags the lock-wait gap versus the "local disk + SQLite" doc claim, that no bound is stated, the stale `architecture.md`, that the races were traced from code only, that the Gemini SDK default timeout was not checked, and the Postgres hops.

**R9** Minor. Some repetition between the "answer in two sentences" box, the invariants and the checklist.

## Pairwise

- **Helpfulness: 2.** Both let a reader trace the path. Chapter 2 also covers the real exception to "201 never waits" (the lock-wait), the GET-before-re-POST rule, the unpushed-commit check command and the race hazards. These are what a developer needs before editing safely.
- **Comprehensiveness: 2.** Chapter 2 covers the response fields, the registry-row exception, startup behavior, the lock-wait, the races, and dry-run details. Chapter 1 is better on the multi-worker alternatives (Celery/outbox).
- **Insight: 2.** Chapter 2's trade-off analysis is deeper (the lock-wait contradiction, the in-memory queue versus the outbox). Chapter 1 has a good outbox analogy and the `drain` deadlock explanation.
- **Readability: 1.** Chapter 1 is shorter and tighter, with a clear numbered invariants checklist. Chapter 2 is longer but well structured.

```json
{"subject": "C",
 "chapters": {
  "1": {"R1": {"correct": 8, "of": 8, "wrong": [], "absent": []},
        "R2": {"present": 3, "of": 4},
        "R3": {"n_cited": 8, "checked": 8, "supported": 7, "partial": 1, "unsupported": 0, "unopenable": 0,
               "contradicted": 0, "effective_citations": 4, "pass": true},
        "R4": {"load_bearing": 7, "primary_or_two": 7, "aggregator_only": 0},
        "R5": {"named": 40, "found": 40, "claims_checked": 10, "claims_match": 10, "pass": true},
        "R6": {"committed": []},
        "R7": {"english": true, "quiz_items": 5, "keys_correct": 5},
        "R8": {"pass": false},
        "R9": {"padding": "minor"}},
  "2": {"R1": {"correct": 8, "of": 8, "wrong": [], "absent": []},
        "R2": {"present": 3, "of": 4},
        "R3": {"n_cited": 15, "checked": 15, "supported": 14, "partial": 0, "unsupported": 0, "unopenable": 1,
               "contradicted": 0, "effective_citations": 12, "pass": true},
        "R4": {"load_bearing": 8, "primary_or_two": 8, "aggregator_only": 0},
        "R5": {"named": 45, "found": 45, "claims_checked": 10, "claims_match": 10, "pass": true},
        "R6": {"committed": []},
        "R7": {"english": true, "quiz_items": 6, "keys_correct": 6},
        "R8": {"pass": true},
        "R9": {"padding": "minor"}}},
 "pairwise": {"helpfulness": "2", "comprehensiveness": "2", "insight": "2",
              "readability": "1"}}
```
