# Trace: 20261023-0350-post-api-documents-write-path (body.md)

## lede
- ¶1 s1: C-r1-code-validate-01 · s2: C-r1-code-write-10 p, C-r1-code-write-12, C-r1-code-write-18 · s3–s4: framing

## background
- SKIP callout: C-r1-practice-01 · C-r1-practice-03 · framing ("two sync requests…") C-r2-code-validate-10 · C-r1-practice-10
- ¶1: C-r1-history-01
- ¶2: C-r1-code-validate-01 (sync handler) · C-r2-code-validate-10
- code write-lock: server/main.py:L180-L183@9978d84 (C-r1-code-write-01)
- ¶3: C-r1-code-write-01 · C-r1-practice-10

## intuition
- IMPORTANT callout: C-r1-code-write-26 p (handler body), C-r1-code-write-18, -19
- ¶1: C-r1-history-13 · C-r1-history2-02, -03, -04
- ¶1 s3–s4: C-r1-history-14
- ¶2: C-r1-history-15 · C-r1-history2-01, -06
- diagram publish-flow: C-r1-code-validate-08, -25 · C-r1-code-write-10 p (order), -18, -19, -20, -24 · C-r1-history-04

## validation
- ¶1: C-r1-code-validate-02, -03
- ¶2: C-r1-code-validate-08, -25
- list: C-r1-code-validate-30 · -09 · -12 · -15 · -17 p · -18 · -19 · -20 · -22 p, -23 p ("lists the violations found")
- ¶3: C-r1-code-validate-30 · C-r1-code-validate-13
- ¶4: C-r1-code-validate-31 p · C-r1-code-validate-06
- ¶5: C-r1-code-validate-26, -27 · C-r1-history-23

## under-the-lock
- list: C-r1-code-write-10 p (real order) · -02 · C-r2-code-validate-01, -03 · C-r1-code-write-03 p · -05 · -06 · -07 · -08 · -09 · -12
- ¶commit: C-r1-code-write-12, -13, -14, -15
- ¶failure: C-r1-code-write-17 · C-r1-history2-09
- ¶timeout: C-r1-code-write-16 p (via `_run`)

## queueing
- code after-response: server/main.py:L1618-L1632@9978d84 (C-r1-code-write-18)
- ¶1: C-r1-code-write-18, -13, -19
- code push-task: server/main.py:L198-L200@9978d84 (C-r1-code-write-20)
- ¶2: C-r1-code-write-21, -22, -23 p
- ¶3: C-r1-code-write-24
- diagram publish-sequence: C-r1-code-write-18, -19, -20, -21, -30
- ¶4: C-r1-practice-04 · C-r1-code-write-28 (attributed) · C-r1-history2-08 (attributed to the P24.S1 result)

## response
- ¶1: C-r1-code-write-29, -32
- ¶2: C-r1-code-write-30 · C-r1-history-07, -08 · C-r1-history-09

## invariants
- ¶1: C-r1-history2-13 · C-r1-code-write-01 · C-r1-history-02 · C-r1-code-write-16 p · C-r1-history2-05
- ¶2: framing
- WARNING callout: C-r1-history-12 · C-r1-history-05 (scope)
- ¶wait: C-r2-code-write-01, -02, -03 · C-r2-code-write-04 p · D-02 (open, both sides stated)
- ¶catch-up: C-r2-code-write-07, -08 · C-r2-criticism-01 · C-r2-code-write-10 · C-r1-code-write-25 · C-r1-history2-14 · C-r2-criticism-08, -09 · C-r2-criticism-04, -05 · C-r2-code-write-12 p · C-r2-code-write-11 (abort ignored; gaps/final G-r2-04 stated)
- ¶race: C-r2-code-validate-01, -04, -05 p, -07, -08 (code traces, hedged "traced, not observed") · C-r2-code-validate-11
- ¶transaction: C-r2-code-write-13 p, -14, -15 (code reading), -16 p
- NOTE callout: C-r1-history-19 p · C-r1-history2-12

## best-practices
- ¶aligns: C-r1-practice-04 · C-r1-practice-15 · C-r1-practice-13 · analogy (git commit as outbox) marked as the chapter's own framing
- ¶diverges: framing · C-r1-practice-09 (attributed) · C-r1-history2-14 · C-r2-code-write-08 · C-r1-practice-14 p · C-r1-practice-16 · "push of unchanged HEAD harmless" — analogy/inference (flagged for the critic)
- steps: C-r1-history2-13, C-r1-history2-08 · C-r2-code-validate-04 · C-r1-practice-10 · C-r2-code-write-12 p

## quiz
- q-order key: C-r1-code-validate-08, -19, -25 · q-pushed: C-r1-code-write-30, C-r1-history-07, -09 · q-outside: C-r1-history-04, C-r1-history2-13 · q-wait: C-r2-code-write-01 · q-crash: C-r1-history2-14, C-r2-code-write-08
