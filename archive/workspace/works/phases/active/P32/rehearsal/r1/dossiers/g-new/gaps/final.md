# Final gaps: 20261023-0350-free-threaded-cpython · stop: complete · gap rounds: 2
- Load-bearing questions neither answered nor contested: none (Q1–Q13, Q18–Q25: 21/21 answered or contested).
- Load-bearing gaps still open: none (gaps/r3.md: no load-bearing gaps).
- Downgraded gaps the chapter still treats openly (not load-bearing, recorded for the writer):
  - G-r1-04 · current multi-thread speed-up on 3.14/3.15 · state: not found (rung-3 only) · best source: none · disposition: stated ("No independent, dated multi-thread benchmark for the current release was found; the reader should measure their own workload.")
  - G-r1-03 · web services · state: thin (one speaker) · best source: S-r2-criticism-02 · disposition: stated ("The only measurement found is one speaker's benchmark at FOSDEM 2026; no independent replication was found.") · the "2.5x" figure dropped (no stated baseline)
  - G-r1-07 · whether the 3.15 JIT works on the free-threaded build · state: not found · best source: S-r1-practice-05 · disposition: stated ("The 3.15 notes say nothing either way.")
- Writer cautions (gaps/r3.md G-r3-01, G-r3-02, G-r3-04): never cite C-r3-practice-03 for installer behaviour; never quote "disabled by default" (D-09 open); never write that a re-enabled GIL stays on "permanently"; point the reader to sys._is_gil_enabled() after imports.
