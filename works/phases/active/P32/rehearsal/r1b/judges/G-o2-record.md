# Record (subject G)

## Chapter 1 (8561 words)

**R1 Must-cover.** All 8 correct.
- M1: "prevents multiple threads from executing Python code at the same time"; "GIL is always released when doing I/O".
- M2: "`--disable-gil` configure flag"; `python3.14t`; `Py_GIL_DISABLED`.
- M3: "3.13 shipped phase I, experimental"; 3.14 "officially supported... still optional"; phase III "is open".
- M4: `python -VV` and `sys.version` contain "free-threading build"; `Py_GIL_DISABLED`; `sys._is_gil_enabled()`.
- M5: "enables the GIL and prints a warning"; `PYTHON_GIL=0` or `-Xgil=0`; `t` suffix, `cp313t`.
- M6: table gives about 40% (3.13), about 1–8% (3.14/3.15), and memory 15–20%. It mentions the specializing interpreter being enabled in 3.14.
- M7: biased refcounting, immortal objects, deferred refcounting, mimalloc, critical sections.
- M8: "multi-step operation... no more atomic"; shared iterators not thread-safe.

**R2 Expert.** 4 of 4 present.
- E1: processes versus subinterpreters, pickling costs.
- E2: wheel tracker, `--only-binary`, RuntimeWarning, testing plugins.
- E3: SC three stages, rollback, PEP 779 memory limits.
- E4: uv, conda, brew, python.org installers, `PYTHON_GIL`, abi3 versus abi3t.

**R3 Citations.** n is roughly 150 cited statements; I checked 15 spread across sources.
- 13 supported: PEP 703 dates, quotes, techniques and rollout sketch; PEP 779 figures; SC acceptance (15% / 20% / undecided); SC notice; HOWTO; thread safety page; extensions HOWTO; LWN 2024 benchmark; LWN 2026; tracker page; asyncio-threading; uv docs; 3.15 notes; glossary.
- Granian README statements supported.
- Tracker data: page counts 220 where the chapter says 219. The fetch tool called its own tally approximate, so I count it supported.
- Partial: the FOSDEM "free-threaded Granian matched" claim (transcript ambiguous).
- Partial: the "3.14 notes say JIT unsupported" claim (not seen in the portions read).
- 0 unsupported, 0 contradicted.
- Effective citations: about 14.
- Pass.

**R4 Sources.** 9 load-bearing claims; 8 primary (PEPs, docs, SC posts, README, source); 1 single-secondary (FOSDEM benchmark). Aggregator-only: 0.

**R5.** N/A for subject G.

**R6 Traps.** None committed. Caveats are explicit: the default build keeps the GIL, there is a single-thread cost, and extensions re-enable the GIL.

**R7.** English: yes. Quiz: 6 items, all 6 keys correct (loop, atomic a/b, import b, io recall, abi cloze, check recall).

**R8.** Pass. It flags the undecided phase III, disagreeing figures, the stale docs sentence, the glossary contradiction, thin web-service evidence, and that no independent multi-thread benchmark was found.

**R9.** Minor. Long, with some repetition between the decision table, checklists and next steps. Most of the added length carries information.

## Chapter 2 (4803 words)

**R1 Must-cover.** 7 correct. M8 is incomplete.
- M1: "at most one thread runs Python code at any instant"; I/O waits release it.
- M2: `--disable-gil`, `python3.14t`, "installed alongside".
- M3: correct.
- M4: `sysconfig` `Py_GIL_DISABLED` and `sys._is_gil_enabled()` are covered. `-VV` / `sys.version` is not mentioned.
- M5: `Py_mod_gil`, "re-enables the GIL", `PYTHON_GIL=0` / `-X gil=0`, `t` wheels.
- M6: "roughly 5-10%"; "1% ... to 8%"; memory 15–20%. The 3.13 roughly 40% figure is absent, but the cause (specializing interpreter) is explained.
- M7: all five mechanisms.
- M8: containers and compound operations are covered. Shared iterators are not mentioned, so M8 is partial; I do not count it as correct.

**R2 Expert.** 4 of 4 present.
- E1: asyncio and multiprocessing comparison. Subinterpreters are not covered.
- E2: tracker, GIL re-enable warning, CI job.
- E3: phased, "each one reversible", PEP 779 targets.
- E4: uv, brew, conda, python.org, `PYTHON_GIL`, abi3 limits (`abi3t` named).

**R3 Citations.** About 35 cited statements, k=2, 15 checked: all 15 supported.
- Pages: PEP 703 (quote, 100µs/50ms, 72 processes, techniques), PEP 779 (16 Jun, 15% / 20%), PEP 790 date, HOWTO, What's New 3.14, thread safety, tracker, extensions HOWTO.
- Effective citations: 8.
- Pass.

**R4 Sources.** 8 load-bearing claims; 7 primary; 1 community guide (the porting guide's race advice). Aggregator-only: 0.

**R6 Traps.** None committed. "Not yet, and probably not for speed" and "does not make your code thread-safe" are stated.

**R7.** English: yes. Quiz: 5 items, all 5 keys correct.

**R8.** Pass but thinner. It states phase III is undecided and the tracker is a one-day snapshot. It does not flag the 3.13 versus 3.14 cost shift or sources that disagree.

**R9.** None.

## Pairwise
- **Helpfulness: 1.** Chapter 1 gives a decision table, dependency checking (`--only-binary`, tracker, import warning), asyncio loop-per-thread guidance, testing tools and a subinterpreters note. Chapter 2 is practical, with a runnable `scale.py`, but is less complete on dependencies and testing.
- **Comprehensiveness: 1.** Chapter 1 covers 3.15 `abi3t`, the PEP 703/779 history, shared iterators, the cost table across versions and web-server evidence. Chapter 2 omits subinterpreters, iterators and the 3.13 cost.
- **Insight: 1.** Chapter 1 explains trade-offs (CPython warns and continues versus Granian refusing to start) and reconciles contradictory sources. Chapter 2 gives good intuition (GIL protects interpreter state, not program logic) but fewer trade-offs.
- **Readability: 2.** Chapter 2 is shorter and cleaner for this reader, with a clear worked-examples flow. Chapter 1 is dense and very long, with heavy citation clutter.

```json
{"subject": "G",
 "chapters": {
  "1": {"R1": {"correct": 8, "of": 8, "wrong": [], "absent": []},
        "R2": {"present": 4, "of": 4},
        "R3": {"n_cited": 150, "checked": 15, "supported": 13, "partial": 2, "unsupported": 0, "unopenable": 0,
               "contradicted": 0, "effective_citations": 14, "pass": true},
        "R4": {"load_bearing": 9, "primary_or_two": 8, "aggregator_only": 0},
        "R5": null,
        "R6": {"committed": []},
        "R7": {"english": true, "quiz_items": 6, "keys_correct": 6},
        "R8": {"pass": true},
        "R9": {"padding": "minor"}},
  "2": {"R1": {"correct": 7, "of": 8, "wrong": [], "absent": ["G-M8 (shared-iterator part only)"]},
        "R2": {"present": 4, "of": 4},
        "R3": {"n_cited": 35, "checked": 15, "supported": 15, "partial": 0, "unsupported": 0, "unopenable": 0,
               "contradicted": 0, "effective_citations": 8, "pass": true},
        "R4": {"load_bearing": 8, "primary_or_two": 8, "aggregator_only": 0},
        "R5": null,
        "R6": {"committed": []},
        "R7": {"english": true, "quiz_items": 5, "keys_correct": 5},
        "R8": {"pass": true},
        "R9": {"padding": "none"}}},
 "pairwise": {"helpfulness": "1", "comprehensiveness": "1", "insight": "1",
              "readability": "2"}}
```
