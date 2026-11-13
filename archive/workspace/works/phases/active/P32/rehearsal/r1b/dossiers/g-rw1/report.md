PUBLISHED (full) — Free-threaded CPython: what it is, how it works, and whether to use it today
- url: http://localhost:8765/python/2026-10-23-free-threaded-cpython/ · v1 (new document; no prior)

## Mode
mode: parallel · agents: plugin · wave: 10
verifier: claude-sonnet-5-5 · critic: claude-sonnet-5-5 (writer claude-opus-5-5)
quote-match: exact, except one dataset source (hugovk results.json) that is approximate · caps: agent · searches: about 60; limit hit: no
Degraded: the critic hit its turn limit once and was resumed to write its file. Its dispatch text did not show writer_model to it, but the models differ.

## Research
- tier 2 · 5 researchers in round 1, 3 in round 2, 1 in round 3 · gap rounds: 2 · stop: complete (gaps/r3.md: no load-bearing gaps)
- 12 of 18 dispatches used · verifier batches: r1-b1…b5, r2-b1…b2, r3-b1, final-b1…b7 (final-b7 added at this resume: 8 newly mapped claims, all supported)
- counter-evidence: S-v4-04 (the Steering Council's guard rails narrow PEP 779's targets); S-v5-08 (a stale stable-ABI sentence in the HOWTO, D-02); none found for the rest
- disagreements: D-01 open (single-thread overhead figures by source and date) · D-02 resolved by scope (abi3t exists from 3.15) · D-03 open (the guide's "experimental" installer label) · D-04 resolved by scope (iterator crash: 3.13 edition only) · D-05 open (frame access crash: HOWTO vs debugging guide) · D-06 open (one speaker's "pure Python needn't care" vs the docs) · D-07 resolved by scope (asyncio internals vs objects) · D-08 open (3.13 overhead: 40% vs 20–40%) · D-09 open (glossary "must run with -X gil=0" vs HOWTO) · D-10 resolved by scope (PyYAML, 3.13 vs 3.14t)
- gate: must-cover 6/6 · load-bearing questions 21/21 answered or contested → pass

## Declared gaps
- G-r1-04 stated: no independent, dated multi-thread benchmark for 3.14/3.15; measure your own
- G-r1-03 stated: the only web-service measurement is one FOSDEM 2026 speaker's, unreplicated; the "2.5x" figure was dropped
- G-r1-07 stated: the 3.15 notes say nothing either way about the JIT on the free-threaded build

## Critic
- verdict revise, confidence medium · 3 must-fix, 7 should-fix, 5 notes · 14 fixed, 1 declined (C15: no ledger claim on unchanged multiprocessing behaviour) · no confirm pass

## Where it landed
- loose document, project python, subject Python, lang en · python/2026-10-23-free-threaded-cpython.md · committed 7d50fa9 · pushed: false, push_pending: false (no remote push queued) · warnings: none

## Files
- dossier: /private/tmp/claude-502/-Users-sugang-projects-personal-knowledge/c2016e8a-14bf-4ba0-89b3-a899f1c9c55e/scratchpad/f1/runs/g/state/knowledge-kb/explain/20261023-0350-free-threaded-cpython
