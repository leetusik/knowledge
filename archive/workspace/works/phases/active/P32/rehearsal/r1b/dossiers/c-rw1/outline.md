# Outline (D6, final, rewritten 2026-10-23 on resume): 20261023-0350-post-api-documents-write-path
- D5g: must-cover 5/5 answered · load-bearing questions 16/16 answered or contested (Q16 contested via D-02) → pass
- code ranges are @9978d84 (clean HEAD)

## Reader's task
- T1 trace a publish through the code → the six-step walk (#code), each step with its code range, and the sequence diagram seq-publish
- T2 explain why the 201 never waits on the network, and the one way it still can → the table "before / after the 201" in #waits
- T3 change the write path without breaking its invariants → the checklist "Before you change the write path" + the tests that guard it (#invariants)
- T4 read a 201 and a failed push correctly → the response-field table (#step-response) and the operator's check command (#push-failures)

## Background {#background} · T1 · what the reader must hold before the code
- Q9 answered · C-r1-history-01 s · C-r1-code-write-01 s · C-r2-code-validate-10 s · C-r1-practice-01 s · C-r1-practice-03 s · C-r1-practice-10 s
- callout (SKIP): FastAPI sync `def` in a threadpool — C-r1-practice-01, -03

## Intuition {#intuition} · T2 · two halves: local and durable before the 201, network after
- Q7, Q10 answered · C-r1-history-14 s · C-r1-history-13 s · C-r1-code-write-27 s (attributed: publish docstring) · C-r1-history-15 s · C-r1-history2-04 s · C-r1-history2-06 s · C-r1-code-write-26 p ("the handler body's work is local … push + embed are queue appends")
- diagram flow-halves: C-r1-code-validate-08, C-r1-code-write-10 p (order), C-r1-code-write-18, -19, -20

## Code {#code} · T1 · the handler, in the order it runs
### Step 1: auth and the request body {#step-auth}
- Q1 · C-r1-code-validate-01 s, -02 s, -03 s, -07 s, -06 s · -31 p ("the registry projects row is the only registry or document write before the handler")
- code: server/main.py:L1303-L1320@9978d84
### Step 2: validate everything, lock nothing {#step-validate}
- Q1, Q2, Q3 · C-r1-code-validate-08 s, -25 s, -09 s, -12 s, -13 s, -15 s, -18 s, -19 s, -20 s, -30 s, -26 s · -22 p, -23 p
- table: the error stages in order (C-r1-code-validate-30)
- callout (collapsed) D-01: docs say validation runs under the lock; the code runs it before (resolved-by-scope)
### Step 3: the locked section {#step-lock}
- Q4 · C-r1-code-write-02 s · C-r2-code-validate-01 s, -02 s · C-r1-code-write-10 p (real order) · -03 p · -05 s · -06 s · -07 s · -08 s · -09 s · C-r2-code-validate-03 s
- code: server/main.py:L1371-L1378@9978d84
### Step 4: the local commit {#step-commit}
- Q5 · C-r1-code-write-12 s, -13 s, -14 s, -15 s, -16 p, -17 s · C-r1-history-02 s
- code: server/main.py:L1566-L1596@9978d84
### Step 5: queue the push and the embed {#step-queue}
- Q6 · C-r1-code-write-18 s, -19 s, -20 s, -21 s, -22 s · C-r1-history-04 s · C-r1-history2-13 s
- code: server/main.py:L1618-L1632@9978d84 · server/main.py:L186-L202@9978d84 · server/gitops.py:L124-L143@9978d84 · server/publish.py:L58-L96@9978d84
- diagram seq-publish: C-r1-code-validate-08, C-r1-code-write-18, -19, -20, -21
### Step 6: the response {#step-response} · deliverable T4: field table
- Q8 · C-r1-code-write-29 s, -30 s, -31 s, -32 s · C-r1-history-07 s, -08 s, -09 s

## What the 201 waits for {#waits} · T2 · deliverable: the before/after table
- Q7, Q16 · C-r1-code-write-26 p · C-r1-history-05 s · C-r1-history-12 s · C-r2-code-write-01 s, -02 s, -03 s, -04 p · D-02 open
- Q16 contested → stated (gaps/final.md) · G-r2-01 stated
- test: tests/test_api_push.py:L181-L201@9978d84

## When the push fails {#push-failures} · T4 · deliverable: the check command
- Q14, Q17 · C-r1-code-write-22 s, -23 p, -25 s · C-r2-code-write-07 s, -08 s, -10 s, -11 s, -12 p · C-r1-history2-14 s · C-r1-criticism-01 s, -03 s, -08 s · C-r2-criticism-01 s, -02 s, -04 s, -05 s · C-r1-criticism-13 s · C-r2-criticism-08 s, -09 s · C-r1-history2-12 s · C-r1-history-19 p
- G-r2-04 stated · G-r2-02 dropped (no claim on what objects travel)

## The invariants, and changing the write path safely {#invariants} · T3 · deliverable: checklist + tests
- Q9, Q18, Q19 · C-r1-history-01 s · C-r1-history-02 s · C-r1-code-write-01 s · C-r2-code-validate-10 s · C-r1-history-04 s · C-r1-history2-13 s · C-r1-history2-05 s
- races (code traces, "the code permits"): C-r2-code-validate-04 s, -07 s, -08 s, -05 p
- partial failure: C-r2-code-write-13 p, -14 s, -15 s (own reading, hedged), -16 p
- tests: tests/test_api_push.py:L181-L201, L204-L209, L135 (name) @9978d84

## Best practices & next steps {#best-practices}
- aligns: C-r1-practice-04 s, -05 s, -06 s, -15 s (attributed) · C-r1-practice-13 s, -14 p (outbox, attributed)
- diverges: C-r1-practice-08 s, C-r1-code-write-28 s (attributed docstring), C-r1-practice-09 s (attributed), C-r1-practice-16 s (attributed), C-r1-criticism-13 s, C-r2-code-write-11 s
- next steps (reasons): C-r2-code-validate-07, -08; C-r2-code-write-12 p; C-r1-history-19 p / C-r1-history2-12; D-02

## Quiz
- q-refused (choice) tests: what a refused publish leaves behind → C-r1-code-validate-08, -25, -19
- q-pushed (choice) tests: reading `pushed`/`push_pending` → C-r1-code-write-30, C-r1-history-07
- q-outside (recall) tests: why the push is submitted outside the lock → C-r1-history-04
- q-wait (choice) tests: a publish during an in-flight push → C-r2-code-write-01
- q-crash (cloze) tests: what a restart loses → C-r1-history2-14

## Not used
- C-r1-history-20 … -24, C-r1-history2-16 … -18, -11: version/book/native history no task needs
- C-r1-code-validate-04, -10, -11, -14, -16, -17, -21, -24, -27, -28, -29: validator detail beyond the error stages (candidate or partial, not needed)
- C-r1-code-write-04, -11, -24, -31, -33: helper internals and url shapes the tasks do not need (-31 stays out to keep the table short)
- C-r1-criticism-02, -04 … -07, -09 … -12, -14 … -16, -20 … -22; C-r2-criticism-03, -06, -07, -10, -11: git/Python detail beyond the design's failure modes
- C-r1-practice-02, -07, -11, -12: duplicate or candidate
- C-r2-code-write-05, -06, -09, -17, -18; C-r2-code-validate-06, -09, -11: candidate or covered by the claims used
- C-r1-history2-01 … -03, -07 … -10, -15; C-r1-history-11, -16 … -18: P24 detail beyond the story told
