# Record

Method note: n_cited is estimated (chapter 1 about 45 cited statements, chapter 2 about 120). Checks were spread across the distinct pages and made against the re-opened pages. Not every sampled statement was re-fetched individually; the pages were fetched once and several statements checked against each.

## Chapter 1
- R1: M1 correct ("A thread must hold it to execute Python bytecode…waiting on a socket…let others run"). M2 correct ("--disable-gil", `t` suffix, `python3.14t`, 3.13 experimental; Py_GIL_DISABLED via sysconfig). M3 correct (3.13 experimental, 3.14 PEP 779 phase II, phase III left to a future PEP). M4 correct but incomplete (`sys._is_gil_enabled()` and `sysconfig` are covered; `python -VV` is not mentioned). M5 correct (Py_mod_gil, PYTHON_GIL=0, -X gil=0, `t` wheels; `cp313t` is not named). M6 correct but incomplete (5–10%, 1%–8% and the memory figures are given; the 3.13 ~40% figure is not). M7 correct (all five mechanisms). M8 correct (the shared-iterator point is not mentioned). 8 of 8, with the gaps noted.
- R2: E1 present (multiprocessing compared; subinterpreters not covered). E2 present (tracker, import warning, CI). E3 present (PEP 779 targets, phases). E4 present (uv, brew, conda, python.org, PYTHON_GIL, abi3/abi3t). 4 of 4.
- R3: Checked about 15: PEP 779 (15%/20% targets, measured memory, phase III), the HOWTO (1–8%, immortals, None 32 bytes, flags, installers), threadsafety, the 3.14 whatsnew (5–10%), the tracker (all versions match) and PEP 703. All supported or partial. The "5–10%" figure and the 3.15 release date were taken as given. No contradictions.
- R4: Load-bearing claims: GIL role, phases, costs, mechanisms, thread-safety guarantees, extension re-enable, tracker. All primary (PEPs, docs). 7 of 7 primary; no aggregators.
- R5: n/a
- R6: none committed.
- R7: English, yes. 5 quiz items, all keys correct.
- R8: pass. It says phase III is open, tells the reader to treat the tracker as one day's snapshot, and says its "idealised" timeline is not a measurement.
- R9: minor.

## Chapter 2
- R1: M1 correct (GIL released during I/O). M2 correct (--disable-gil, Py_GIL_DISABLED, `t` tag, cp313t, python3.14t). M3 correct (phase table, 3.15 still optional). M4 correct (-VV, sysconfig, `sys._is_gil_enabled()`). M5 correct (Py_mod_gil, RuntimeWarning, PYTHON_GIL=0, -X gil=0, `t` wheels). M6 correct (40% in 3.13 with the specializing interpreter disabled; 1–8% now; memory). M7 correct (all five). M8 correct (iterator sharing, check-then-act, multi-step operations). 8 of 8.
- R2: E1 present (multiprocessing, subinterpreters, asyncio loop per thread). E2 present (wheels tracker, `--only-binary`, warning, pytest-run-parallel). E3 present (SC notice, PEP 779 criteria). E4 present (uv, brew, conda, python.org, abi3t/PEP 803). 4 of 4.
- R3: Checked about 15 across LWN (Shaw numbers match), Tensogram (numbers match), asyncio-threading (supported), SC post (supported), PEP 779, PEP 803 (supported), the HOWTO, threadsafety and the tracker. The PEP 703 and LWN statement "likened his demo…to data serialization" is garbled. The 3.14 whatsnew "scaling linearly" claim was not seen in the portion of the page read (the page was truncated), so it is partial. The hugovk wheel count (219 of 360) could not be checked: the page redirected and was not re-fetched. Counted as unopenable. No contradictions.
- R4: Load-bearing claims mostly rest on primary sources, plus LWN and one conference talk, which the chapter flags as thin. 8 of 9 primary or two-independent; the FOSDEM web-server benchmark claim is single-secondary and says so.
- R5: n/a
- R6: none committed.
- R7: English, yes. 6 quiz items, all keys correct.
- R8: pass. It has explicit open-questions and disagreement callouts (glossary versus HOWTO, labels that lag), and says no independent multi-thread benchmark was found.
- R9: minor (several overlapping source tables and citations).

## Pairwise
- Helpfulness: 2. It adds a section on asyncio (loop per thread, `to_thread`), a concrete dependency check, and testing steps. Chapter 1 has a clear decision flow and runnable scale.py.
- Comprehensiveness: 2. It covers asyncio, subinterpreters, abi3t, the warning text and the criteria detail.
- Insight: 2. It compares measurements across sources, the Wouters trade-offs and the evidence-quality discussion.
- Readability: 1. It is shorter, with a runnable benchmark and worked examples; chapter 2 is denser.

```json
{"subject": "G",
 "chapters": {
  "1": {"R1": {"correct": 8, "of": 8, "wrong": [], "absent": []},
        "R2": {"present": 4, "of": 4},
        "R3": {"n_cited": 45, "checked": 15, "supported": 13, "partial": 2, "unsupported": 0, "unopenable": 0,
               "contradicted": 0, "effective_citations": 7, "pass": true},
        "R4": {"load_bearing": 7, "primary_or_two": 7, "aggregator_only": 0},
        "R5": null,
        "R6": {"committed": []},
        "R7": {"english": true, "quiz_items": 5, "keys_correct": 5},
        "R8": {"pass": true},
        "R9": {"padding": "minor"}},
  "2": {"R1": {"correct": 8, "of": 8, "wrong": [], "absent": []},
        "R2": {"present": 4, "of": 4},
        "R3": {"n_cited": 120, "checked": 15, "supported": 11, "partial": 2, "unsupported": 0, "unopenable": 2,
               "contradicted": 0, "effective_citations": 9, "pass": true},
        "R4": {"load_bearing": 9, "primary_or_two": 8, "aggregator_only": 0},
        "R5": null,
        "R6": {"committed": []},
        "R7": {"english": true, "quiz_items": 6, "keys_correct": 6},
        "R8": {"pass": true},
        "R9": {"padding": "minor"}}},
 "pairwise": {"helpfulness": "2", "comprehensiveness": "2", "insight": "2",
              "readability": "1"}}
```
