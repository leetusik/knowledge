# Plan: 20261023-0350-post-api-documents-write-path
- tier: 2 (breadth 2 · nesting 2 · exploration 2) · wave 1: 5 · per round: ≤ 3
  · budget: 10–20 / 30 tool calls (code: 20–40 / 60) · ceiling: 18
## Scouting
- server/main.py@9978d84: create_document at L1302 (status_code=201), _check_document L938, WRITE_LOCK = threading.Lock() L183, _push_task L186 (gitops.push), _embed_task L205, publish.submit(...) L1622 after commit, comments "Nothing in the pre-response path makes a network round-trip (P24.S1)" L1315; check endpoint L1740 (P31.S1); delete and put_book reuse the push queue.
- history: b769236 "move git push and embed off the write response path" (P24); a36df74 versions; abfa307 books; 373522d native ingest; 7c27519 check endpoint.
- web scouting deferred to researchers (FastAPI BackgroundTasks / sync def threadpool; outbox-style deferred side effects; git push non-fast-forward / fetch+rebase).
## Questions
- Q1 · load-bearing: yes (entry point) · angle: code-validate · from: ask — What does a POST /api/documents request go through before anything is written: auth (require_bearer / tenant), the DocumentIn model, and _check_document's validation (format, native grammar, placement, version target, 409/422)?
- Q2 · load-bearing: yes · angle: code-validate · from: must-cover — What errors can the validation stage return (401, 409, 422, others), and is any file, row or commit made before they are raised?
- Q3 · load-bearing: yes · angle: code-validate · from: ask — How does /api/documents/check reuse the same validation without writing (dry run)?
- Q4 · load-bearing: yes · angle: code-write · from: ask — In execution order, what happens inside WRITE_LOCK: file write, archive of the superseded version, DB row/index, assets, manifest, the scoped git commit?
- Q5 · load-bearing: yes · angle: code-write · from: must-cover — How is the git commit made (gitops: which files are staged, the message, co-authored-by, scoped commit), and what happens when the commit fails (committed/commit_error)?
- Q6 · load-bearing: yes · angle: code-write · from: must-cover — How is the push done: publish.submit, the publish queue/worker, _push_task, gitops.push (fetch + rebase + push), KB_GIT_TIMEOUT_S, git_push_enabled, and the lifespan drain on shutdown?
- Q7 · load-bearing: yes · angle: code-write · from: must-cover — Why does the 201 never wait on the network: what runs before the response, what runs after (push, embedding), and why the push is queued outside WRITE_LOCK?
- Q8 · load-bearing: yes · angle: code-write · from: ask — What does the 201 response contain (url, version, previous_version, committed, commit_error, pushed, push_pending, assigned_ids, warnings, migrated_from) and what each means?
- Q9 · load-bearing: yes · angle: history · from: must-cover — What invariants does the write path hold (disk is canonical, write-before-respond, one writer at a time, no network before 201, pushed false meaning) and where are they stated (comments, docs, phase notes)?
- Q10 · load-bearing: yes · angle: history · from: expert — Why was push/embed moved off the response path (P24): what problem did it solve, what was the earlier design?
- Q11 · load-bearing: no · angle: history · from: expert — How did versions (archive superseded), books/chapters and native format change the write path over time?
- Q12 · load-bearing: yes · angle: practice · from: expert — How do FastAPI/Starlette run a sync `def` endpoint (threadpool) and BackgroundTasks, and how does this compare with this repo's own publish queue?
- Q13 · load-bearing: no · angle: practice · from: expert — What standard patterns describe "commit locally, respond, side-effect later" (outbox / deferred side effects / at-least-once background jobs)?
- Q14 · load-bearing: yes · angle: criticism · from: expert — What are the failure modes of an in-process background queue (work lost on crash/shutdown) and of pushing to a git remote (non-fast-forward rejection, fetch+rebase, hung network, index.lock), and how does each bear on this design?
- Q15 · load-bearing: no · angle: criticism · from: expert — What does git document about concurrent git processes in one repo (index.lock) that motivates a single writer lock?
- Q16 · load-bearing: yes · angle: code-write · from: gap G-r1-01 — While the kb-publish worker holds WRITE_LOCK for a push (fetch, rebase, push, each bounded by KB_GIT_TIMEOUT_S), does a new publish block at `with WRITE_LOCK:`, so the 201 can wait indirectly on the network? Which calls in _push_task and _embed_task run under the lock, and what is the worst-case bound?
- Q17 · load-bearing: yes · angle: code-write (+ criticism for git semantics) · from: gap G-r1-02 — After a failed or dropped push, what brings the remote up to date (does the next push of HEAD:main carry earlier unpushed commits; any retry or startup push), what follows a rebase conflict whose abort fails, does queued work survive a hard crash, and how does an operator see it?
- Q18 · load-bearing: yes · angle: code-validate · from: gap G-r1-03 — Since _check_document runs before the lock, which checks run again inside WRITE_LOCK, and can two concurrent publishes to the same slug/version/chapter both pass validation and both write? Which 409/422 can be raised inside the lock, and where in the order?
- Q19 · load-bearing: yes · angle: code-write · from: gap G-r1-04 — The locked section is a series of separately committed steps, not one transaction: what does a failure partway leave behind, and does "disk is canonical" (reindex) repair it?
## Outline skeleton
- Background: the KB stores docs as files in a git repo; the API is FastAPI (Q9, Q11)
- Intuition: the two halves — the synchronous local write (lock, file, row, commit) and the deferred network work (push, embed) (Q7, Q10)
- Code: request in → validation (Q1, Q2, Q3) → under the lock (Q4, Q5) → queue the push (Q6) → the response (Q8)
- Invariants & changing it safely (Q9, Q14, Q15)
- Best practices & next steps (Q12, Q13, Q14)
- Quiz; Sources
## Angles
- code-validate (code in real order, part 1; code): owns request entry, auth, models, _check_document, check endpoint · not yours: code-write (lock onward), history · questions: Q1, Q2, Q3
- code-write (code in real order, part 2; code): owns WRITE_LOCK section, gitops commit/push, publish queue, embed, response, lifespan drain · not yours: code-validate, history · questions: Q4, Q5, Q6, Q7, Q8
- history (history behind it; code): owns git log/blame, commit messages, docs/ and works/ phase notes on invariants and P24 · not yours: present-day control flow detail · questions: Q9, Q10, Q11
- practice (foundations + how others solve it; web): owns FastAPI/Starlette docs, deferred-side-effect patterns · not yours: failure modes · questions: Q12, Q13
- criticism (criticism + evidence + real cases; web): owns failure modes of in-process queues and git push/locking · not yours: FastAPI mechanics · questions: Q14, Q15
## Query log
