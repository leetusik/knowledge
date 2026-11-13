# Outline (D6, final, rewritten on resume): 20261023-0350-post-api-documents-write-path
- D5g: must-cover 5/5 answered · load-bearing questions 16/16 answered or contested (Q16 contested via D-02) → pass
- repo commit: 9978d84 (clean; code ranges read from the working tree at HEAD)

## Reader's task
- T1 trace a publish through the code → the step-by-step walk (validate → lock → queue → respond), each step with its code, and the sequence diagram
- T2 explain why the 201 never waits on the network, and the one way it still can → the two-sentence answer at the end of #no-network, and the test that guards it (tests/test_api_push.py:L181-L201)
- T3 change the write path without breaking its invariants → the checklist "Before you change the write path" (#checklist)

## Background {#background} · T1 · what the reader must hold before the walk · ~350 words
- Q9 answered · C-r1-history-01 s · C-r1-code-write-01 s · C-r2-code-validate-10 s · C-r1-practice-01 s
- callout (collapsed) sync-def primer: C-r1-practice-01, C-r1-practice-03 s, C-r1-practice-10 s
- code: server/main.py:L179-L183@9978d84

## Intuition {#intuition} · T1, T2 · the two halves and why they split · ~450 words
- Q7, Q10 answered · C-r1-history-14 s · C-r1-history-13 s · C-r1-history2-04 s · C-r1-history-15 s · C-r1-code-write-27 s (attributed to the docstring) · C-r1-code-write-26 p ("handler body's work is local; push + embed are queue appends; tenant-mode Postgres awaits remain", C-r1-history-12)
- toy timeline: 5 s client budget (C-r1-history-14) — no invented durations; the diagram is ordinal
- diagram flow-halves: C-r1-code-validate-08, C-r1-code-write-10 p (real order), C-r1-code-write-18, C-r1-code-write-19, C-r1-code-write-20

## The publish, step by step {#code} · T1 · in the order it runs · ~1,500 words
### Step 1: validate, before the lock {#validate}
- Q1–Q3 answered · C-r1-code-validate-01 s, -02 s, -03 s (tenant mode, one sentence), -06 s, -08 s, -09 s, -12 s, -13 s, -15 s, -19 s, -20 s, -22 p ("ref/asset errors only after a successful parse"), -25 s, -26 s, -30 s, -31 p (registry row is the only write before the handler) · D-01 (resolved-by-scope: older docs say validation runs under the lock; the code is current)
- code: server/main.py:L1302-L1320@9978d84
### Step 2: inside WRITE_LOCK {#locked}
- Q4, Q5 answered · C-r2-code-validate-01 s, -02 s · C-r1-code-write-03 p ("archive only when a file exists; version row only when archive_path and superseded set"), -05 s, -06 s, -07 s, -08 s, -09 s, -10 p (real order), -12 s, -14 s, -15 s, -17 s · C-r1-history-02 s
- code: server/main.py:L1559-L1596@9978d84 (the commit step)
### Step 3: queue the network work, outside the lock {#queue}
- Q6 answered · C-r1-code-write-18 s, -19 s, -20 s, -21 s, -22 s, -16 p ("abort via bare subprocess.run, same timeout, failure swallowed"), -23 p (stdout line + traceback to stderr) · C-r1-history-04 s · C-r1-history2-13 s
- code: server/main.py:L1618-L1632@9978d84 · server/main.py:L186-L202@9978d84 · server/gitops.py:L124-L143@9978d84
### Step 4: the response {#response}
- Q8 answered · C-r1-code-write-29 s, -30 s, -32 s · C-r1-history-07 s, -08 s, -09 s
- diagram seq-publish: C-r1-code-validate-08, C-r1-code-write-18, -19, -20, -21 (order)

## Why the 201 does not wait on the network {#no-network} · T2 · ~450 words
- Q7, Q16 · C-r1-code-write-26 p · C-r1-history-05 s · C-r1-history-12 s · C-r2-code-write-01 s, -02 s, -03 s, -04 p ("docs state serialization; no doc states how long a write may wait behind a bounded push") · D-02 (open: architecture.md L37 vs the code) · G-r2-01 stated
- deliverable T2: the two-sentence answer + tests/test_api_push.py:L181-L201@9978d84 (posts once; does not cover a second publish behind a held lock — read from the code)

## Invariants, and changing the write path safely {#invariants} · T3 · ~1,000 words
### What can go wrong after the 201 {#after-201}
- Q14, Q17 · C-r2-code-write-07 s, -08 s, -10 s (G-r2-04 stated), -11 s, -12 p · C-r1-history2-14 s · C-r1-code-write-25 s · C-r1-criticism-01 s, -03 s · C-r2-criticism-04 s, -05 s
- callout (collapsed) daemon thread and hard kill: C-r1-criticism-13 s, C-r2-criticism-08 s, C-r2-criticism-09 s
### What can go wrong inside the lock {#inside-lock}
- Q18, Q19 · C-r2-code-validate-04 s, -07 s (code trace: "the code permits"), -08 s (same), -05 p, C-r2-code-validate-11 s · C-r2-code-write-13 p, -14 s, -16 p · C-r1-code-write-17 s · staged-leftover: server/gitops.py:L93-L96 + server/main.py:L1568 (code range)
### Before you change the write path {#checklist} · deliverable T3
- C-r2-code-validate-10 · C-r1-history-04 · C-r1-history2-13 · C-r1-code-write-16 p · C-r1-history-15 · C-r1-history-09 · C-r2-code-write-01 · C-r2-code-validate-07, -08 · C-r2-code-write-13 p · test code range

## Best practices & next steps {#best-practices} · T3 · ~550 words
- aligns: C-r1-practice-04 s, -05 s, -06 s; C-r1-practice-15 s (attributed to Microsoft)
- diverges: C-r1-code-write-28 s (attributed to the docstring); C-r1-practice-13 s, -14 p (narrower), -16 s (attributed); C-r2-code-write-07 s
- next steps: bound the embed (C-r1-history-19 p narrower); a test for a second publish behind a held push (D-02, C-r2-code-write-01); re-check the exists/version under the lock (C-r2-code-validate-07, -08); expose push state (C-r2-code-write-12 p)

## Quiz
- q-order tests the order of validation vs lock: C-r1-code-validate-08 s, C-r2-code-validate-01 s
- q-pushed tests the meaning of pushed/push_pending: C-r1-code-write-30 s, C-r1-history-07 s
- q-outside tests that the push task re-takes WRITE_LOCK, so a push and a write never overlap: C-r1-code-write-20 s (narrowed at revision: the "not reentrant" reason is kept attributed in the prose, not quizzed)
- q-commit-fail tests what a failed local commit returns and keeps: C-r1-code-write-17 s, C-r1-history-02 s
- q-wait tests the indirect wait: C-r2-code-write-01 s
- q-crash tests what a crash loses: C-r2-code-write-11 s, C-r1-history2-14 s

## Not used
- C-r1-code-validate-04, -05, -07, -10, -11, -14, -16, -17, -18, -21, -23, -24, -27, -28, -29: field-level and tenant-helper detail no task needs (the validation order -30 carries the walk)
- C-r1-code-write-04, -11, -24, -31, -33: helper internals, reader-unit sync, URL shapes and metering; no task changes with them
- C-r1-history-10, -11, -16, -18, -20 … -24 and C-r1-history2-01 … -03, -05 … -12, -15 … -18: commit-by-commit history; the P24 story (-13, -14, -15) is the part the reader needs
- C-r1-practice-02, -07, -08, -09, -11, -12: framework detail beyond the comparison the best-practices section makes
- C-r1-criticism-02, -04 … -12, -14 … -22: git and Python detail the design never meets (force-push, hooks, Popen, executors)
- C-r2-criticism-01 … -03, -06, -07, -10, -11: git/Python manual detail beyond the checks the chapter names
- C-r2-code-write-05, -06, -09, -15, -17, -18 and C-r2-code-validate-03, -06, -09: unverified (not lb) or covered by the claims kept
