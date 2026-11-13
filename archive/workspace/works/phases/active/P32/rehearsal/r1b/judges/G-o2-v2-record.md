# Record, subject G

## Chapter 1 (6888 words)

**R1** All 8 correct.
- M1: "The GIL is always released while a thread does I/O" (Background).
- M2: "second way to compile CPython… `--disable-gil`… `Py_GIL_DISABLED`… executable names like `python3.14t`".
- M3: phases I/II in 3.13/3.14, phase III "undecided".
- M4: -VV, `Py_GIL_DISABLED`, `sys._is_gil_enabled()` all shown with correct roles.
- M5: `Py_mod_gil`, RuntimeWarning, `PYTHON_GIL=0`/`-X gil=0`, `cp313t`.
- M6: "about 40%… specializing adaptive interpreter turned off"; table with 1%–8%; memory 15–20%.
- M7: biased RC, immortal, deferred RC, mimalloc, critical sections, QSBR.
- M8: atomic vs multi-step list; "Sharing one iterator… not thread-safe".

**R2** 4 of 4 present. E1: loop per thread, processes, `concurrent.interpreters`. E2: tracker, `--only-binary`, warning, tests. E3: SC 3-stage notice, rollback, PEP 779 limits. E4: uv/conda/brew/python.org, `PYTHON_GIL`, abi3/abi3t.

**R3** n ≈ 110 cited statements; 15 checked (k≈7). Supported 13, partial 2 (deferred RC "only by cyclic GC": page says "next GC run"; the "scaling linearly" asyncio line was not in the part of the 3.14 What's New I could read). Contradicted 0. Unopenable 0. Effective citations about 13 (PEP 703, PEP 779, SC acceptance, HOWTO, LWN 2024, LWN 2026, asyncio-threading, wheels results.json via redirect, install guide, threadsafety, Tensogram, What's New 3.14, extensions HOWTO). Pass.

**R4** Load-bearing claims (10): GIL purpose (primary), build/ABI (primary), phases (primary), overhead numbers (primary, shown with the disagreement), mechanisms (primary), thread-safety guarantees (primary), asyncio (primary), dependency counts (primary data), web-server evidence (single secondary, flagged as such), import warning (primary, source code). 9 of 10 primary or two-independent; 0 aggregator-only.

**R5** null (subject G).

**R6** None committed. It says the default stays GIL, single-thread is slower, thread safety is the user's job, and unmarked extensions re-enable the GIL.

**R7** English: yes. Quiz: 6 items, 6 keys correct.

**R8** Pass. Declares the conflicting overhead figures, the two disagreeing docs pages, that no independent benchmark exists, that phase III is open, and that the macOS installer label lags. Nothing stated as settled that is not.

**R9** Minor. Some repetition (decision table, best-practices section and overhead table overlap), and the long case-study passages.

## Chapter 2 (4803 words)

**R1** 8 of 8 correct (M4 and M6 lighter).
- M1: "Threads that are waiting on a socket or a disk… let others run".
- M2: "`--disable-gil` build option… shipped in Python 3.13… `t` suffix". M2 is correct, with `Py_GIL_DISABLED` appearing only in the code.
- M3: correct.
- M4: `sysconfig`, `sys._is_gil_enabled()`. `-VV` is not mentioned, so only partly covered; counted correct.
- M5: `Py_mod_gil`, re-enables GIL with a warning, `PYTHON_GIL=0`/`-X gil=0`, wheels with `t`.
- M6: "roughly 5-10%… specialising adaptive interpreter is now enabled", 1–8%, memory. The 3.13 ≈40% figure is not stated.
- M7: all five mechanisms.
- M8: single-op safe, `d[key] = d[key] + 1` a race, iteration not safe. Iterator sharing is not mentioned.

**R2** 3 of 4 present. E1 is partial: multiprocessing yes, subinterpreters absent. E2: tracker, import re-enabling, CI tests. E3: PEP 779 targets, phased, but no conditional-acceptance or rollback story. E4: install routes, `PYTHON_GIL`, `abi3t` mentioned. Counted E1 absent, E3 present.

**R3** n ≈ 45; 15 checked (k=3). Supported 13, partial 2 (PEP 779 "targets: at most 15% slowdown and about 20% memory": the Steering Council acceptance says within 10%, 15% to be discussed, memory below 15% with a hard limit of 20%; tracker version column is unlabelled). Contradicted 0. Effective citations 9. Pass.

**R4** 8 load-bearing claims, 8 primary or two-independent (PEP 703, PEP 779, docs, tracker), 0 aggregator.

**R6** None committed.

**R7** English: yes. Quiz: 5 items, 5 keys correct.

**R8** Pass, but thinner. It flags the tracker as a one-day snapshot and the PYTHON_GIL risk. It does not discuss conflicting overhead figures, and it gives the PEP 779 targets slightly wrongly.

**R9** None.

## Pairwise

**Helpfulness: 1.** Chapter 1 covers asyncio loop-per-thread, processes versus threads, subinterpreters, a concrete package-support check with live counts, and a clear try/wait table. Chapter 2 gives a good decision flow and runnable scripts but skips asyncio and subinterpreters in practice.

**Comprehensiveness: 1.** Chapter 1 adds the decision history, the stable ABI, pip/uv source-build behaviour, testing tools and the web-server evidence. Chapter 2 lacks subinterpreters, the 3.13 slowdown figure, `-VV` and iterator sharing.

**Insight: 1.** Chapter 1 reconciles conflicting overhead figures and sets minority views against the docs. Chapter 2 does explain well why the GIL existed and what the build changes.

**Readability: 2.** Chapter 2 is shorter and tighter, with runnable `check_gil.py`/`scale.py`, a clear key-idea callout and little repetition. Chapter 1 is dense and long, with many inline citations.

```json
{"subject": "G",
 "chapters": {
  "1": {"R1": {"correct": 8, "of": 8, "wrong": [], "absent": []},
        "R2": {"present": 4, "of": 4},
        "R3": {"n_cited": 110, "checked": 15, "supported": 13, "partial": 2, "unsupported": 0, "unopenable": 0,
               "contradicted": 0, "effective_citations": 13, "pass": true},
        "R4": {"load_bearing": 10, "primary_or_two": 9, "aggregator_only": 0},
        "R5": null,
        "R6": {"committed": []},
        "R7": {"english": true, "quiz_items": 6, "keys_correct": 6},
        "R8": {"pass": true},
        "R9": {"padding": "minor"}},
  "2": {"R1": {"correct": 8, "of": 8, "wrong": [], "absent": []},
        "R2": {"present": 3, "of": 4},
        "R3": {"n_cited": 45, "checked": 15, "supported": 13, "partial": 2, "unsupported": 0, "unopenable": 0,
               "contradicted": 0, "effective_citations": 9, "pass": true},
        "R4": {"load_bearing": 8, "primary_or_two": 8, "aggregator_only": 0},
        "R5": null,
        "R6": {"committed": []},
        "R7": {"english": true, "quiz_items": 5, "keys_correct": 5},
        "R8": {"pass": true},
        "R9": {"padding": "none"}}},
 "pairwise": {"helpfulness": "1", "comprehensiveness": "1", "insight": "1",
              "readability": "2"}}
```
