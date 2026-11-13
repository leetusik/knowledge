PUBLISHED (full) — Free-threaded CPython: Python without the GIL, and whether to use it today
- url: http://localhost:8765/python/2026-10-23-free-threaded-cpython-python-without-the-gil-and-whether-to-use-it-today/ · v1 (new document)

## Mode
mode: parallel · agents: plugin · wave: 10 · verifier: claude-sonnet-5-5 · critic: claude-sonnet-5-5 · quote-match: exact (one tracker data source approximate) · caps: agent · searches: about 60, limit hit: no
- Degraded: none. Resumed three times (budget stop at D2 r2; P32.F1 reset to D6); D0b re-run and passed each time.

## Research
- tier 2 · 5 researchers in wave 1, 3 in round 2, 1 in round 3 · 2 gap rounds · stop: complete (12 of 18 dispatches)
- 51 sources, 208 claims; load-bearing claims verified on Sonnet; D5 counter-evidence on 25 main claims (2 counter-sources: the SC acceptance post refining PEP 779's targets; a stale HOWTO sentence, D-02)
- disagreements: D-01 overhead figures differ, open (shown as an attributed table) · D-02 abi3t, resolved by version · D-03 installer "[experimental]" label, open (attributed) · D-04 iterator crash, resolved by version · D-05 frame access, open · D-06 "pure Python needn't care" (one speaker) vs the docs, open (attributed) · D-07 asyncio safety, resolved by scope · D-08 3.13 overhead 20–40% vs 40%, open · D-09 glossary vs HOWTO on the default, open (attributed, with a runtime check) · D-10 PyYAML, resolved by version
- gate: must-cover 6/6 · load-bearing questions 21/21 answered or contested → pass

## Declared gaps
- G-r1-04 no independent dated multi-thread benchmark for the current release → stated
- G-r1-03 web services rest on one FOSDEM talk → stated; the "2.5x" figure dropped
- G-r1-07 whether the 3.15 JIT works on the free-threaded build → stated (the 3.15 notes say nothing either way)

## Critic
- verdict revise · confidence medium · must-fix 2 · should-fix 12 · notes 6
- all fixed in one revision except C16 (declined: rests on an unverified candidate claim); no confirm pass
- check after revision: OK

## Where it landed
- loose document · project python · subject Python · lang en · committed 3ef4750 · pushed: false, push_pending: false (no background push is scheduled: this KB probably has no remote configured) · no warnings

## Dossier
/private/tmp/claude-502/-Users-sugang-projects-personal-knowledge/c2016e8a-14bf-4ba0-89b3-a899f1c9c55e/scratchpad/f1/runs/g2/state/knowledge-kb/explain/20261023-0350-free-threaded-cpython
