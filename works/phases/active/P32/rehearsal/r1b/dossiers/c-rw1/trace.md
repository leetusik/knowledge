# Trace: 20261023-0350-post-api-documents-write-path (D7, written on resume 2026-10-23)
Code ranges are @9978d84 (clean HEAD). ¶ = paragraph under the heading; s = sentence.

## (lede, before Background)
- ¶1 s1: C-r1-code-validate-01 (sync handler, 201); C-r1-code-write-26 p (local work before the 201)
- ¶1 s2: framing · s3: framing (commit named by the run's repo commit)

## background
- ¶1 s1: C-r1-history-01 · s2: C-r1-history-01 · s3: framing (git as history; the remote as off-box copy: C-r1-history2-14 "off-box backup" via C-r1-history-19 p) · s4: framing, ordering derived from C-r1-history-01, C-r1-history-02
- ¶2 s1: C-r1-code-write-01 · s2: C-r2-code-validate-10 (Dockerfile quote) · s3: C-r1-practice-10 + C-r1-code-write-01 (routine inference: an in-process lock is per process)
- code write-lock: server/main.py:L179-L183@9978d84
- SKIP callout s1: C-r1-code-write-01 / C-r2-code-write-01 (sync `def`) · s2: C-r1-practice-01 · s3: C-r1-practice-03 · s4: C-r2-code-validate-10 ("concurrency between publishes is between request threads of one process"); C-r1-code-write-01

## intuition
- ¶1 s1: C-r1-code-write-26 p (narrower: handler body local; push + embed queue appends) · s2: C-r1-code-validate-08, C-r1-code-write-10 p · s3: C-r1-code-write-18, -20, -21 (push), C-r1-code-write-24 not used → embed per C-r1-code-write-18 · s4: C-r1-code-write-26 p
- diagram flow-halves: C-r1-code-validate-08 (check before lock), -25 (no lock); C-r1-code-write-10 p (order); C-r1-code-write-18 (two submits, push first); C-r1-code-write-19 (one thread, FIFO); C-r1-code-write-20, -21 (fetch, rebase, push); C-r1-code-write-18 (embed); 201 → C-r1-code-validate-01
- ¶2 s1: C-r1-history-13 · s2: C-r1-history2-04
- ¶3 s1: framing · s2: C-r1-history-14 · s3: C-r1-history-14 · s4: C-r1-code-write-27 (attributed: the docstring)
- ¶4 s1: C-r1-history-15 · s2: C-r1-history-15 · s3: C-r1-history2-06

## code
- ¶1 s1: server/main.py:L1311-L1318@9978d84 (docstring); C-r1-history-05 · s2: framing
- diagram seq-publish: C-r1-code-validate-08 (note); C-r1-code-write-10 p; C-r1-code-write-18 (submits); C-r1-code-write-30, C-r1-history-07 (pushed false, push_pending true); C-r1-code-write-20 (re-takes the lock); C-r1-code-write-21 (fetch, rebase, push HEAD:main)

## step-auth
- ¶1 s1: framing (dependencies run before the body: C-r1-code-validate-06 "runs before the handler") · s2: C-r1-code-validate-01
- code handler-signature: server/main.py:L1303-L1310@9978d84
- ¶2 s1: C-r1-code-validate-02, -03 · s2: C-r1-code-validate-02 · s3: C-r1-code-validate-03 · s4: C-r1-code-write-12 (public root only)
- ¶3 s1: C-r1-code-validate-07 · s2: C-r1-code-validate-06 · s3: C-r1-code-validate-31 p (narrower: the registry projects row is the only registry or document write before the handler)

## step-validate
- ¶1 s1: C-r1-code-validate-08 · s2: C-r1-code-validate-08 · s3: C-r1-code-validate-25
- code check-first: server/main.py:L1319-L1320@9978d84
- ¶2 s1: C-r1-code-validate-09, -12, -13 · s2: C-r1-code-validate-14 (not used) → framing; C-r1-code-validate-15 (manifest) · s3: C-r1-code-validate-15, -16 p (with new_version) · s4: C-r1-code-validate-18
- ¶3 s1: C-r1-code-validate-30
- table rows 1–7: C-r1-code-validate-30 (order and kinds); row 1: -09; row 2: -12; row 3: -15, -27 (409/422); row 4: -17 p, -18; row 5: -19; row 6: -20; row 7: -22 p
- ¶4 s1: C-r1-code-validate-19 · s2: C-r1-code-validate-22 p, -23 p · s3: C-r1-code-validate-23 p (parser stops early: narrower claim)
- ¶5 s1: framing · s2: C-r1-code-validate-26 · s3: C-r1-history-23 ("so the two cannot drift"); C-r1-code-validate-25
- callout D-01 s1: D-01 side B (architecture.md L28; operations.md L242) · s2: C-r1-code-validate-08 · s3: D-01 nature (docs predate P31.S1); C-r1-history-23 · s4: C-r2-code-validate-11 · s5: D-01 prominence

## step-lock
- ¶1 s1: C-r1-code-write-02; C-r2-code-validate-01 · s2: C-r2-code-validate-01 · s3: C-r2-code-validate-01 (quotes) · s4: C-r2-code-validate-03 (incl. the defensive 409 at L1407) · s5: C-r2-code-validate-03
- code lock-open: server/main.py:L1371-L1374@9978d84
- ¶2 s1: C-r1-code-write-10 p (the comment is the short list)
- list 1–9: C-r1-code-write-10 p (real order); 2: C-r1-code-write-03 p; 3: C-r1-code-write-03 p (archive only when a file exists; version row); 4: C-r1-code-write-05; 5: C-r1-code-write-06; 6: C-r1-code-write-07; 7: C-r1-code-write-08; 8: C-r1-code-write-09; 9: C-r1-code-write-12

## step-commit
- ¶1 s1: C-r1-code-write-12 (explicit list), C-r1-code-write-17 · s2: C-r1-code-write-12, -13 · s3: C-r1-code-write-12
- code commit-step: server/main.py:L1566-L1596@9978d84 (elisions marked)
- ¶2 s1: C-r1-code-write-14 · s2: C-r1-code-write-15 · s3: C-r1-code-write-16 p
- ¶3 s1: C-r1-code-write-17; C-r1-history-02 · s2: C-r1-history2-09 · s3: C-r1-history2-09

## step-queue
- ¶1 s1: C-r1-code-write-18 · s2: C-r1-code-write-18, -13 (docstring: only the hosted box opts into pushing) · s3: C-r1-code-write-18 · s4: C-r1-code-write-18
- code queue-step: server/main.py:L1618-L1632@9978d84
- ¶2 s1: C-r1-code-write-19 · s2: C-r1-code-write-19 · s3: C-r1-code-write-19
- code worker-loop: server/publish.py:L58-L67@9978d84
- ¶3 s1: C-r1-history-04 · s2: C-r1-code-write-20; server/main.py:L190-L192@9978d84 · s3: C-r1-code-write-20 · s4: server/main.py:L1371-L1373@9978d84 (quote); C-r1-history-04 · s5: C-r1-history2-13
- code push-task: server/main.py:L198-L200@9978d84
- ¶4 s1: C-r1-code-write-21 · s2: C-r1-code-write-22

## step-response
- ¶1 s1: C-r1-code-write-30, C-r1-history-07 (framing of the deliverable) · s2: C-r1-code-write-29 · s3: C-r1-code-write-32 · s4: framing
- table: committed C-r1-code-write-12, -17 · commit_error C-r1-code-write-29, -17 · commit_sha C-r1-code-write-30, C-r1-history-08 · pushed C-r1-code-write-30, C-r1-history-07 (quote) · push_pending C-r1-history-07, C-r1-code-write-18 · version C-r2-code-validate-04
- ¶2 s1: C-r1-history-09 · s2: C-r1-history-09

## waits
- ¶1 s1: C-r1-code-write-26 p; C-r2-code-write-01 · s2: C-r1-code-write-26 p · s3: C-r2-code-write-01 · s4: C-r2-code-write-01 · s5: C-r2-code-write-01
- table before: validation C-r1-code-validate-25; tenant Postgres C-r1-history-12, C-r1-code-validate-06; file/SQLite/commit C-r1-code-write-08, -12, -26 p; queue appends C-r1-code-write-26 p, -19; lock wait C-r2-code-write-01 · after: push C-r1-code-write-18, -21; embed C-r1-code-write-18
- ¶2 s1: C-r1-history-12 · s2: C-r1-history-12 · s3: C-r1-history-12 (attributed)
- ¶3 s1: gaps/final.md Q16 (stated), G-r2-01 (stated) · s2: C-r2-code-write-02, -03 · s3: C-r2-code-write-03; G-r2-01 · s4: D-02 (architecture.md L37 quote; L176 per ledger note) · s5: C-r2-code-write-04 p (narrower: docs acknowledge only the hung, unbounded case)
- ¶4 s1: tests/test_api_push.py:L181-L182@9978d84 · s2: tests/test_api_push.py:L185-L198@9978d84
- code test-hanging-push: tests/test_api_push.py:L181-L198@9978d84 (elision marked)
- ¶5 s1: framing · s2: tests/test_api_push.py:L193@9978d84 + server/main.py:L198-L200@9978d84 (the stand-in runs inside _push_task's `with WRITE_LOCK:`) · s3: tests/test_api_push.py:L195@9978d84 (one POST) · s4: C-r2-code-write-01

## push-failures
- ¶1 s1: C-r2-code-write-11 (loses the push, never the save); C-r2-code-write-07 · s2: C-r1-code-write-22 · s3: C-r1-criticism-08; C-r1-code-write-22 (local commit kept) · s4: C-r1-code-write-23 p (narrower: stdout line, stderr traceback; the caller is not told) · s5: server/main.py:L1616-L1617@9978d84 ("the response is long gone by then")
- code gitops-push: server/gitops.py:L124-L142@9978d84 (elision marked)
- ¶2 s1: C-r1-criticism-03 (framing link to the code's rebase: C-r1-code-write-21) · s2: C-r1-criticism-01, -03 · s3: C-r2-criticism-02, -01 · s4: C-r2-code-write-07 · s5: C-r2-code-write-07 (quote "publishes everything accumulated")
- ¶3 s1: C-r2-code-write-08 · s2: C-r2-code-write-08 · s3: C-r2-code-write-08 · s4: C-r2-code-write-08
- ¶4 s1: C-r2-code-write-11 · s2: C-r1-code-write-25; C-r2-code-write-11 · s3: C-r1-code-write-19 (daemon); C-r1-criticism-13 · s4: C-r2-criticism-08, -09 · s5: C-r1-history2-14
- ¶5 s1: C-r2-code-write-12 p · s2: C-r2-code-write-12 p (last_error referenced only in publish.py; /healthz has no publish state) · s3: C-r2-code-write-12 p
- code check-stranded: C-r2-code-write-12 p (the documented check)
- ¶6 s1: C-r2-criticism-04, -05 · s2: C-r2-code-write-12 p (expected 0; non-zero = stranded) · s3: C-r2-code-write-12 p, C-r1-history2-14
- ¶7 s1: framing · s2: C-r2-code-write-10; G-r2-04 (stated) · s3: C-r1-history2-12 · s4: C-r1-history2-14 · s5: C-r1-history2-14; C-r1-history-19 p (off-box backup) · s6: C-r1-history-19 p (narrower: accepted limit, a deferred job)

## invariants
- ¶1: framing
- list 1: C-r1-history-01 · 2: C-r1-code-write-01, C-r2-code-validate-10; server/main.py:L179-L183@9978d84 · 3: C-r1-history-02; server/main.py:L1311-L1313@9978d84 · 4: C-r1-history2-13 · 5: C-r1-history2-13, C-r1-history-04; server/main.py:L190-L192@9978d84 · 6: C-r1-history2-05
- ¶2 s1: framing · s2: C-r2-code-validate-10, -04 · s3: C-r2-code-validate-07, -08 (code traces, hedged "it permits", "traced but never observed")
- bullet 1: C-r2-code-validate-07 · bullet 2: C-r2-code-validate-08
- ¶3 s1: C-r2-code-validate-05 p (narrower)
- ¶4 s1: framing · s2: C-r2-code-write-14 · s3: C-r2-code-write-13 p, -14 · s4: C-r2-code-write-15 (own reading, hedged "Reading the code") · s5: C-r2-code-write-15 · s6: C-r2-code-write-15 · s7: C-r2-code-write-15 · s8: C-r2-code-write-16 p (narrower)
- checklist (reasons for recommendations): 1: C-r1-code-validate-25, C-r1-code-write-02, C-r2-code-validate-01 · 2: C-r2-code-validate-04, -07, -08 · 3: C-r1-history2-13, C-r1-history-12; C-r1-code-write-19 (submit) · 4: C-r1-history-04, C-r1-history2-13 · 5: C-r1-code-write-16 p · 6: C-r1-history-15 · 7: C-r2-code-validate-10 · 8: docs/current/operations.md:L21@9978d84 (`uv run pytest -q`), docs/current/operations.md:L632@9978d84 (plugin_parity rule)
- ¶5 s1: tests/test_api_push.py:L135, L181-L182, L204-L209@9978d84 (names and docstrings) · s2: code search at 9978d84: `git grep -i -l -e concurren -e threading.Thread -e race -- tests` matches only tests/fixtures/book/write-lock.*.md (fixtures, no test); test names from `git grep -n 'def test_' -- tests/test_api_push.py`

## best-practices
- ¶1 s1: framing (attributed) · s2: C-r1-practice-04 · s3: C-r1-practice-15 (attributed) · s4: C-r1-practice-13 (attributed to both) · s5: analogy (marked "As an analogy")
- ¶2 s1: C-r1-code-write-28 · s2: C-r1-practice-05 · s3: C-r1-code-write-28 (attributed: docstring) · s4: C-r1-practice-08 (attributed); C-r1-code-write-19 (the worker logs and goes on)
- ¶3 s1: framing · s2: C-r1-practice-09 (attributed) · s3: C-r1-practice-16 (attributed) · s4: C-r2-code-write-11 · s5: C-r2-code-write-11, C-r1-history2-14 (attributed to the docs)
- next 1: C-r2-code-validate-04, -07, -08 · next 2: C-r2-code-write-12 p · next 3: C-r1-history2-12, C-r1-history2-14, C-r1-history-19 p · next 4: D-02 (would settle it), D-01

## quiz
- q-refused key a: C-r1-code-validate-19 (exists 409 in _check_document), -25 (only reads), -08 (before the lock); legacy mode: C-r1-code-validate-06 (no registry write) · explain: C-r1-code-validate-19, -25, C-r1-code-write-03 p (archive inside the lock) · distractors: exempt
- q-pushed key b: C-r1-code-write-30, C-r1-history-07 · explain: C-r1-history-07, C-r1-history-09
- q-outside answer: C-r1-history-04, C-r1-code-write-20 · server/main.py:L1371-L1373@9978d84
- q-wait key b: C-r2-code-write-01 · explain: C-r2-code-write-01, C-r1-code-write-20
- q-crash blanks: C-r1-history2-14 · explain: C-r1-code-write-26 p, C-r2-code-write-07, -11

## D8 revision (answers to critique.md; these lines supersede the entries above for the sentences named)
- lede s2 (C01): C-r1-code-write-26 p (own push and embed queued after the response); C-r2-code-write-01 (the lock wait behind an earlier push); D-02 now stated as both sides, not the docs' side
- intuition ¶1 s4–s5 (C01): C-r1-code-write-26 p · C-r2-code-write-01, C-r1-code-write-20 (push re-takes WRITE_LOCK)
- diagram flow-halves, new edge worker → locked (C04): C-r1-code-write-20 (server/main.py:L198-L200@9978d84)
- background primer (C06): format values C-r1-code-validate-07 (DocumentIn); native validated by the server C-r1-code-validate-22 p; Recent index and landing page C-r1-code-write-07, C-r1-code-write-10 p (public root only); book, chapter, manifest, placement, loose: terms the chapter defines for itself
- step-auth ¶2 "signature is at" (C05): server/main.py:L1303-L1310@9978d84; ¶2 split into legacy and tenant paragraphs (C09), sentences unchanged
- step-validate "call is at" (C05): server/main.py:L1319-L1320@9978d84 · ¶2 split (C09) · ¶4 s1 "when a database row exists" (C12): C-r1-code-validate-19 · s3 "one list: parser's sorted, then reference and translation" (C07): C-r1-code-validate-23 p (narrower), -22 p · dry-run ¶ s2 (C16): C-r1-history-23 attributed to the docstring; s3: framing (scope of the docstring's claim)
- step-lock "lock opens at" (C05): server/main.py:L1371-L1374@9978d84
- step-commit "commit step is" (C05): server/main.py:L1566-L1596@9978d84
- step-queue "queueing is" (C05): server/main.py:L1616-L1632@9978d84 · "loop is" server/publish.py:L58-L67@9978d84
- step-queue ¶3 (C08) s1: C-r1-history-04, C-r1-code-write-20 (attributed: the project's rule) · s2: C-r1-code-write-20 · s3: C-r1-code-write-20; server/main.py:L198-L200@9978d84
- step-queue ¶4 s1: server/main.py:L1371-L1373@9978d84 (quote) · s2: C-r1-history2-13
- step-queue ¶5 (C08) s1: framing · s2: C-r1-code-write-19 (submit appends and returns; one worker thread), C-r1-code-write-20 — routine inference: a different thread blocks, it does not self-deadlock · s3: same inference from C-r1-code-write-20 · s4: framing
- waits ¶3 split (C09) into "open question" and "docs disagree": sentences unchanged · "test is" (C05): tests/test_api_push.py:L181-L198@9978d84
- push-failures "push is" (C05): server/gitops.py:L124-L142@9978d84 · ¶2 split (C09); new bold s1 "Unpushed commits travel with the next push": C-r2-code-write-07 · ¶4 split at SIGKILL (C09); embed edge split from rebase-abort edge (C09)
- invariants list 5 (C08): C-r1-history2-13, C-r1-history-04 (attributed)
- invariants race 1 (C11): C-r2-code-validate-07 (scope: the public root's git commit keeps the first body)
- invariants ¶3 (C02): C-r2-code-validate-05 p (narrower: the documents table) · s3: C-r2-code-validate-08 (upsert_document_version ON CONFLICT DO UPDATE)
- invariants partial-failure ¶ turned into two bullets (C09): sentences unchanged (C-r2-code-write-15)
- checklist bullet 3 (C10): C-r1-history2-13 (the rule), C-r1-history-12 (tenant Postgres, local-container hop per the P24 notes) · bullet 4 (C08): C-r1-history2-13; inference as step-queue ¶5
- best-practices ¶1 split (C09); new s "analogy breaks at the relay" (C13): C-r2-code-write-08 (never retries), C-r2-code-write-11 (in-memory) · ¶2 split at "The failure handling differs too" (C09): framing
- q-outside answer (C08): C-r1-history-04, C-r1-code-write-20, C-r1-code-write-19
- q-crash blanks (C03): blank 1 C-r1-code-write-18 (push and embed both queued), C-r1-history2-14 · blank 2 C-r1-code-write-26 p · explain: C-r1-code-write-26 p, -18, C-r2-code-write-07, -11

## sources
- every item: library.md entries S-r1-practice-01, -02, -03, -04, -05, -06, -07, -09; S-r1-criticism-01, -03, -08; S-r2-criticism-02, -05, -06 (accessed 2026-10-23 per their entries)
