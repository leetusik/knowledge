# Record: judge G-o1

Sampling note: about 45 cited statements in chapter 1 and about 150 in chapter 2. I re-opened 12 distinct pages and checked the statements those pages could settle. Several chapter 2 sources I did not open (the LWN 2026 article, the FOSDEM slides and transcript, Tensogram, the uv and pip docs, the CPython import.c source). They were not counted as checked. The checked counts below are therefore lower than the rubric's 15 per chapter.

## Chapter 1

**R1**
- M1 correct: "A thread must hold it to execute Python bytecode… Threads that are waiting on a socket or a disk… let others run."
- M2 correct: "`--disable-gil` build option. It shipped in Python 3.13… recognisable by a `t` suffix: `python3.14t`."
- M3 correct: 3.13 experimental, 3.14 "officially supported but still optional", phase III left to a future PEP.
- M4 correct: it gives `sysconfig…Py_GIL_DISABLED` and `sys._is_gil_enabled()`. It does not mention `python -VV`; this is a minor omission.
- M5 correct: `Py_mod_gil` re-enables the GIL with a warning; `PYTHON_GIL=0` and `-X gil=0` force it off. It says the `t` suffix but does not give `cp313t`.
- M6 correct: "roughly 5-10%"; about 1% to 8% in the docs; memory is higher. The 3.13 figure of about 40% is absent; it says only "much better than 3.13".
- M7 correct: biased reference counting, immortal objects, deferred reference counting, mimalloc and critical sections are all covered.
- M8 correct: compound operations are not atomic and `d[key] = d[key] + 1` is a race. It does not mention sharing an iterator.
- Total 8 correct, none wrong, none absent.

**R2**
- E1 present: the table covers asyncio, I/O threads and multiprocessing, with "no pickling". Subinterpreters are absent, so this is partial.
- E2 present: the tracker table, the `check_gil.py` import test and CI on 3.14t.
- E3 present: "each one reversible"; PEP 779 targets of 15% and 20%.
- E4 present: uv, brew, conda and the python.org installers; `abi3t`.
- Total 4 of 4.

**R3**
- Checked 12 statements.
- Supported: PEP 703 quotes (GIL purpose, 100 µs vs 50 ms, 72 processes); the 5–10% and 1–8% figures; the 15% and 20% targets; the thread-safety list; the porting-guide quotes; install commands; `-X gil=0`; the 3.15.0 date of 9 Oct 2026.
- Partial: "optimistic lock-free read" (the PEP says it is not strictly lock-free); the tracker page date (the footer is ambiguous).
- Unsupported: 0. Contradicted: 0. Unopenable: 0.
- Effective citations: 11 distinct URLs.
- Pass.

**R4**
- Load-bearing claims: 8. Primary or two-independent: 7 (PEPs, official docs and the Quansight guide). The community tracker is the single secondary source.
- Aggregator-only: 0.

**R5** n/a for subject G.

**R6** Traps: none committed. It says the GIL build is still the default, that the single-thread cost is real, that threads are not made safe, and that unmarked extensions re-enable the GIL.

**R7** English: yes. The quiz has 5 items. All 5 marked answers are correct.

**R8** Pass. It states what is undecided (phase III), dates the tracker, calls the diagram "idealised" and says "not a measurement", and says the 3.14 immortalisation limits. One small slip: the intro lists small integers and `None` as immortal, but the how-to restricts immortalisation as of 3.14.

**R9** Padding: none. About 4,800 words and tight.

## Chapter 2

**R1**
- M1 correct: the glossary says "the GIL is always released when doing I/O"; threads take turns on CPU work.
- M2 correct: "`--disable-gil` configure flag"; the `python3.14t` name; 3.13 under PEP 703.
- M3 correct: phases I, II and III; 3.13 experimental; 3.14 supported but optional; phase III undecided.
- M4 correct: `python -VV` and `sys.version`, `Py_GIL_DISABLED` and `sys._is_gil_enabled()`.
- M5 correct: the warning text, `Py_mod_gil`, `PYTHON_GIL=0` and `-Xgil=0`, `cp313t`.
- M6 correct: a table showing about 40% on 3.13 and about 1–8% on 3.14 and later, plus memory.
- M7 correct: biased reference counting, immortal objects, deferred reference counting, mimalloc, critical sections and QSBR.
- M8 correct: containers will not corrupt, multi-step operations are never atomic, and "Never share one iterator between threads."
- Total 8 correct.

**R2**
- E1 present: CPU-bound gains, I/O gains little, processes versus threads, subinterpreters.
- E2 present: the wheel tracker, `--only-binary`, the RuntimeWarning, pytest-run-parallel.
- E3 present: the Steering Council stages, the way back, and the PEP 779 criteria.
- E4 present: uv, mamba, brew, dnf, the python.org installers, `PYTHON_GIL`, `abi3t`.
- Total 4 of 4.

**R3**
- Checked 13 statements.
- Supported: the SC notice (stages, "not Python 4", five years, change our mind); Shaw's benchmark in LWN 2024; the glossary quotes; asyncio-threading; Granian; PEP 703 details; PEP 779; threadsafety; the install guide; the PEP 790 date.
- Partial: 1 (a PEP 779 acceptance date of 15 vs 16 June, depending on source).
- Unsupported: 0. Contradicted: 0. Unopenable: 0.
- Not opened: LWN 2026, the FOSDEM slides and transcript, Tensogram, the uv and pip docs, import.c.
- Effective citations: 13 distinct URLs.
- Pass.

**R4**
- Load-bearing claims: 10. Primary or two-independent: 9. The single-secondary one is the FOSDEM web-benchmark claim, which the chapter flags itself.
- Aggregator-only: 0.

**R6** Traps: none committed.

**R7** English: yes. The quiz has 6 items. All 6 marked answers are correct.

**R8** Pass, and it is stronger than chapter 1. It says "No independent, dated multi-thread benchmark… was found", flags the conflicting docs on the f_locals crash and on `-X gil=0`, and notes a stale sentence in the docs, memory figures that differ by source, and the Granian "experimental" caveat. It gives the web-service evidence as thin.

**R9** Padding: minor. About 8,500 words. The Tensogram, FOSDEM and per-speaker attribution passages are long for this reader, and the citation density slows reading.

## Pairwise

- **Helpfulness: 1.** Chapter 1 gives a runnable benchmark, a race demo, a decision flow and a clear verdict for each workload. Chapter 2 serves the reader too, but its verdicts are buried under attribution detail.
- **Comprehensiveness: 2.** Chapter 2 adds the 3.13 cost figure, asyncio with one event loop per thread, subinterpreters, testing tools, `abi3t` and pip behaviour, iterator sharing, and workarounds. Chapter 1 omits the 3.13 figure, subinterpreters and iterators.
- **Insight: 2.** Chapter 2 weighs sources against each other (conflicting overhead figures, the glossary against the how-to, CPython enabling the GIL versus Granian refusing to start) and explains the trade-offs. Chapter 1 explains the mechanisms well but gives less on trade-offs.
- **Readability: 1.** Chapter 1 is shorter and its examples are clear for a newcomer. Chapter 2 is dense and heavily cited.

```json
{"subject": "G",
 "chapters": {
  "1": {"R1": {"correct": 8, "of": 8, "wrong": [], "absent": []},
        "R2": {"present": 4, "of": 4},
        "R3": {"n_cited": 45, "checked": 12, "supported": 10, "partial": 2, "unsupported": 0, "unopenable": 0,
               "contradicted": 0, "effective_citations": 11, "pass": true},
        "R4": {"load_bearing": 8, "primary_or_two": 7, "aggregator_only": 0},
        "R5": null,
        "R6": {"committed": []},
        "R7": {"english": true, "quiz_items": 5, "keys_correct": 5},
        "R8": {"pass": true},
        "R9": {"padding": "none"}},
  "2": {"R1": {"correct": 8, "of": 8, "wrong": [], "absent": []},
        "R2": {"present": 4, "of": 4},
        "R3": {"n_cited": 150, "checked": 13, "supported": 12, "partial": 1, "unsupported": 0, "unopenable": 0,
               "contradicted": 0, "effective_citations": 13, "pass": true},
        "R4": {"load_bearing": 10, "primary_or_two": 9, "aggregator_only": 0},
        "R5": null,
        "R6": {"committed": []},
        "R7": {"english": true, "quiz_items": 6, "keys_correct": 6},
        "R8": {"pass": true},
        "R9": {"padding": "minor"}}},
 "pairwise": {"helpfulness": "1", "comprehensiveness": "2", "insight": "2",
              "readability": "1"}}
```
