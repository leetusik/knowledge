# Record (subject C)

## Chapter 1

**R1** (8/8 correct)
- M1 correct: "the one validation path shared by POST /api/documents and the dry run ... 'only reads': no lock, no file, no row, no commit."
- M2 correct: "A threading.Lock serializes threads inside one process only, so the whole design rests on there being exactly one uvicorn worker." Non-reentrancy is in the quiz and the invariants section.
- M3 correct: the numbered nine-step list. It matches main.py 1374-1596, including the migration re-key and `.assets` storage.
- M4 correct: "gitops.add stages an explicit list of paths ... drops any path inside .assets"; message formats; Co-Authored-By trailer.
- M5 correct: "nothing is rolled back, and the request still returns 201"; `commit_error` and `committed` false.
- M6 correct: single `kb-publish` daemon thread, FIFO, submitted outside the lock, failures logged, `pushed` always false, `push_pending`.
- M7 correct: `KB_GIT_PUSH` default off; fetch, rebase, push `HEAD:main`, never `--force`; `rebase --abort`; `KB_GIT_TIMEOUT_S` 60 s and why.
- M8 correct: "/explain skill posted with curl --max-time 5".

**R2** (4/4 present)
- E1 present: in-memory queue, 10 s drain, next push carries commits. Startup reindex treats docs as canonical.
- E2 present: "single uvicorn worker as a hard constraint"; Celery and outbox comparison. It does not name file or DB lock alternatives.
- E3 present: field list; `commit_sha` is pre-rebase; "a lost response is checked by reading the document back".
- E4 present: "Public root ... the only one the server commits to git."

**R3** (n ≈ 24 cited statements; checked 15)
- Supported: FastAPI async, Starlette threadpool (via the pool-size sentence), FastAPI concepts (hedged "normally" in the page), Background Tasks, Azure background jobs, microservices.io outbox, AWS outbox (duplicates and idempotency), git-rebase, git-push, git-rev-list (range semantics; `--count` inferred), signal, atexit.
- Partial: 1 (git-push remedy is `pull --rebase`; the chapter says "rebase and push again").
- Effective citations: 12. No contradictions. Pass.

**R4** Load-bearing claims: 8. Most rest on the code or the repository docs (primary). The external claims rest on official docs. 8/8 primary or two-independent; 0 aggregator.

**R5** Named entities: about 30 (`create_document`, `_check_document`, `check_document`, `_place_variant`, `ensure_registry_project`, `WRITE_LOCK`, `publish.submit`, `gitops.add`, `gitops.push`, `_run`, `store_assets`, `db.upsert_document`, `KB_GIT_PUSH`, `KB_GIT_TIMEOUT_S`, `KB_GIT_COMMIT`, `commit_error`, `push_pending`, ...). All found, apart from `resolve_api_write` and commit `207f2ff`, which I did not confirm. `b769236` found.
- Code claims checked: 10; 10 matched. This includes the order in the lock, the commit gating, the push-task lock, the `pushed` constant, the UNIQUE(tenant_id, rel_path) race analysis and the no-recheck-under-lock claim (verified in `_check_document` vs `create_document`).
- Pass.

**R6** C-T1 to C-T5: none committed.

**R7** English: yes. Quiz: 5 items. Keys correct: 5/5.

**R8** Pass. It flags the publish waiting behind a push, the unbounded embed, and the validation-race window ("traced, not observed"). It notes that the project docs disagree with themselves.

**R9** Minor. The background callout and the best-practices section repeat some material.

## Chapter 2

**R1** (8/8 correct)
- M1 correct: "shared with POST /api/documents/check ... 'only reads ... no lock, no file, no row, no commit'"; "a 4xx leaves no trace".
- M2 correct: the WRITE_LOCK comment, "With two uvicorn workers there would be two locks", and "WRITE_LOCK is not reentrant".
- M3 correct: the flow diagram and the notes (manifest first, archive before overwrite, file before row). The migration re-key is omitted; minor.
- M4 correct: the staged list, `.assets` dropped, never `-A`, message formats, the Co-Authored-By paragraph.
- M5 correct: "does not re-raise. It becomes committed: false plus commit_error in a 201."
- M6 correct: worker loop, FIFO, outside the lock, logged failures, `pushed` hard-coded false, `push_pending`.
- M7 correct: `KB_GIT_PUSH` default false; fetch, rebase, push; abort; `KB_GIT_TIMEOUT_S` 60 s and why.
- M8 correct: the publish.py docstring quote on `/explain` and `curl --max-time 5`.

**R2** (3/4 present)
- E1 present: queue lost on crash, 10 s drain, next push carries commits, embeddings refilled by reindex.
- E2 partial-present: "one uvicorn worker" listed as an invariant, and Celery, RabbitMQ and Redis named. It does not discuss what multiple workers would need.
- E3 partial: `commit_sha` pre-rebase, `push_pending` and the retry hazard. It has no GET-verify advice and does not list `version`, `archived_path` and `previous_version` as a response contract. I count it absent.
- E4 present: "public root ... the only tree committed and pushed".
- Count: E1, E2, E4 present = 3.

**R3** (n ≈ 9 cited statements; all checked)
- All supported: FastAPI async, Background Tasks (incl. Celery), git-push (fast-forward only, `--force` loses commits), microservices.io outbox.
- Effective citations: 4. No contradictions. Pass.

**R4** Load-bearing claims: 7, all on code or official docs. 7/7 primary or two-independent; 0 aggregator.

**R5** Named entities: about 28 (`create_document`, `_check_document` at line 938, `gitops._run`, `publish.drain`, `test_response_does_not_wait_for_a_hanging_push`, `tests/test_api_push.py`, `archive_document_file`, `upsert_document_version`, `_push_task`, `_embed_task`, ...). All found. "About 440 lines from 1302" verified (436).
- Code claims checked: 10; 10 matched.
- Pass.

**R6** C-T1 to C-T5: none committed.

**R7** English: yes. Quiz: 5 items. Keys correct: 5/5. q-validate (a, d) is defensible, because `_check_document` also raises the book 422 and the 409 on a binding conflict; the `_place_variant` re-read under the lock is the authoritative check.

**R8** Pass, mostly. It marks the timings as illustrative, not measured. It does not discuss the race between pre-lock validation and the locked write, or waits behind the push holding the lock. Fewer declared gaps than chapter 1.

**R9** None to minor.

## Pairwise

- **Helpfulness: 2.** Chapter 2 gives a step-ordered trace with the actual code and a numbered invariants checklist ("Before you change the write path"). It also points to `tests/test_api_push.py` as the guard. That serves "trace, explain, change without breaking invariants" directly. Chapter 1 is also strong, and adds the verified race and wait-behind-push caveats, but it is denser and lighter on a change checklist.
- **Comprehensiveness: 1.** Chapter 1 covers E3 (GET before re-POST and the full response fields), the push-holds-the-lock wait, the unrechecked validation, the non-transactional lock section and the unbounded embed. Chapter 2 covers the step code and shutdown in more detail, but misses E3 and the multi-worker discussion.
- **Insight: 1.** Chapter 1 finds the real trade-offs and gaps in the code: the pre-lock validation race, publishes blocking behind a push, the lock section as not a transaction, and the project docs contradicting themselves. Chapter 2's insight is good (disk leads, outbox analogy, explicit startup-push suggestion) but less critical.
- **Readability: 2.** Chapter 2 is step-by-step with annotated code and a checklist, and a timeline diagram. Chapter 1 is clear but heavier with prose and caveats.

```json
{"subject": "C",
 "chapters": {
  "1": {"R1": {"correct": 8, "of": 8, "wrong": [], "absent": []},
        "R2": {"present": 4, "of": 4},
        "R3": {"n_cited": 24, "checked": 15, "supported": 14, "partial": 1, "unsupported": 0, "unopenable": 0,
               "contradicted": 0, "effective_citations": 12, "pass": true},
        "R4": {"load_bearing": 8, "primary_or_two": 8, "aggregator_only": 0},
        "R5": {"named": 30, "found": 29, "claims_checked": 10, "claims_match": 10, "pass": true},
        "R6": {"committed": []},
        "R7": {"english": true, "quiz_items": 5, "keys_correct": 5},
        "R8": {"pass": true},
        "R9": {"padding": "minor"}},
  "2": {"R1": {"correct": 8, "of": 8, "wrong": [], "absent": []},
        "R2": {"present": 3, "of": 4},
        "R3": {"n_cited": 9, "checked": 9, "supported": 9, "partial": 0, "unsupported": 0, "unopenable": 0,
               "contradicted": 0, "effective_citations": 4, "pass": true},
        "R4": {"load_bearing": 7, "primary_or_two": 7, "aggregator_only": 0},
        "R5": {"named": 28, "found": 28, "claims_checked": 10, "claims_match": 10, "pass": true},
        "R6": {"committed": []},
        "R7": {"english": true, "quiz_items": 5, "keys_correct": 5},
        "R8": {"pass": true},
        "R9": {"padding": "none"}}},
 "pairwise": {"helpfulness": "2", "comprehensiveness": "1", "insight": "1",
              "readability": "2"}}
```
