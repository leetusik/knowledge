# Outline (D6, final map, rewritten 2026-10-23 09:3x): 20261023-0350-free-threaded-cpython
(statuses from ledger.md after D5s, plus D5 batch final-b7 for the 8 newly mapped candidates; partial claims carry their narrower wording; gaps from gaps/final.md)

## Reader's task
- T1 decide whether to try the free-threaded build now, for a web service or a data script → decision table "Try it now if… / Wait if…" (end of #today)
- T2 get a free-threaded interpreter and prove the GIL is really off → the commands block + "First ten minutes" checklist (#trying-it)
- T3 find out whether the dependencies will keep the GIL off → checklist "Before you depend on a package under 3.14t / 3.15t" + the install-and-import diagram (#dependencies)
- T4 know what to change in their own threaded, asyncio and multiprocessing code → checklist "Before you run threaded code without the GIL" + the cache-with-lock example (#your-code)
- T5 test for races before trusting it → the test commands in #next-steps (pytest-run-parallel, pytest-repeat)

## Background {#background} · what the GIL did, and how removal was planned · supports T1
- Q1 answered · Q2 answered · Q19 answered · Q16 thin (not load-bearing; stated as open)
- C-r1-foundations-01 supported · C-r2-evidence-09 supported · C-r2-evidence-10 supported
- C-r1-foundations-30, -02, -31, -32 supported · C-r1-practice-01 supported · C-r1-foundations-33 supported · C-r2-evidence-04 supported (only the "released in October 2024" date; the 20-40% figure is in #today, D-08) · C-r1-foundations-35 supported · C-r1-foundations-36 supported · C-r2-evidence-03 supported (only "for 3.14, from October 2025") · C-r1-practice-05 supported · C-r1-foundations-40, -41 supported
- callout (collapsed) history: C-r1-foundations-38 partial ("…two reference repositories, nogil-3.12 (based on Python 3.12.0a4) and nogil (based on Python 3.9.10)") · C-r1-foundations-43 (speculation, attributed), -44 (estimate, attributed), C-r1-cases-13 (attributed, hedged "suspects")
- diagram timeline-phases: C-r1-foundations-31 (Jul 2023), -30 (Oct 2023), C-r2-evidence-04 (3.13, Oct 2024), C-r1-foundations-35 (Jun 2025), C-r2-evidence-03 (3.14, Oct 2025), C-r1-practice-05 (3.15, 9 Oct 2026); phases C-r1-practice-01, -33, -36, -40

## Intuition {#intuition} · the toy picture: parallel threads, same races · supports T1, T4
- Q1, Q4, Q11 answered
- C-r2-evidence-10, C-r2-evidence-11 supported (default build: one thread at a time; free-threaded: true parallel execution, not by default)
- chart shaw-bench: C-r1-evidence-15 supported (2024, 3.13 beta 1, four cores, attributed via LWN)
- C-r1-criticism-14 (final-b7) · C-r1-criticism-11 supported (attributed to the porting guide) · C-r1-foundations-09 partial (attributed to PEP 703)
- callout IMPORTANT key idea: C-r1-criticism-11, C-r1-foundations-08

## How it works {#how-it-works} · what replaces the GIL · supports T4 (why built-ins don't corrupt, why your logic can still race)
- Q4 answered
- C-r1-foundations-11, -12 ("proposes"), -13, -15, -17, -20, -22, -23, -24, -25, -27, -28 supported · C-r1-foundations-26 (final-b7) · C-r1-foundations-09 partial
- diagram safety-stack (stack): C-r1-foundations-11, -13, -15, -17, -20, -22, -23, -24, -25
- callout (collapsed) PEP vs shipped: C-r1-foundations-12 (proposed design), -28 (3.14 finished, specializer enabled)

## Should you try it today? {#today} · status, costs, evidence of gains, ecosystem · T1 → decision table
- Q3 answered (D-03 version/time: the guide's "experimental" labels) · Q5, Q21 contested (D-01, D-08) · Q8 answered · Q13, Q20 answered (attributed, one speaker) · Q24 answered · Q12 contested (D-05)
- status: C-r1-foundations-36, -37 supported · C-r1-practice-06 supported (scope: does not say python points at it) · C-r2-criticism-11 supported
- costs table: C-r1-evidence-01 (3.13 HOWTO, ~40%) · C-r2-evidence-04 (Wouters 20-40%, D-08) · C-r1-evidence-03 (What's New 3.14, 5-10%) · C-r1-evidence-04 / C-r2-evidence-01 (3.14 and 3.15 HOWTO, 1%–8%, no measurement date) · C-r2-evidence-03 (Wouters 0-10%, ~5% Linux GCC) · C-r1-evidence-05 partial (narrower: PEP 779 ~10%, ~3% macOS; SC target within 10%, up to 15% discussed) · C-r1-evidence-06 partial (narrower: ~15-20% memory; SC below 15%, hard 20%) · C-v4-01 supported · C-r1-criticism-24 supported · C-r2-evidence-18 supported · D-01 open, D-08 open
- gains: C-r2-evidence-17 supported · C-r2-evidence-09 supported · gap G-r1-04 stated ("No independent, dated multi-thread benchmark for the current release was found; the reader should measure their own workload.") · callout (collapsed) Tensogram: C-r1-cases-10, -11 supported (vendor about itself, attributed)
- web: C-r1-cases-01, -02, -03, -05 supported (attributed to the Granian README) · C-r1-cases-04 (final-b7) · C-r1-cases-06 supported · C-r2-criticism-02 partial ("…he attributes the saturation to the GIL") · C-r2-criticism-03 attributed only · gap G-r1-03 stated ("The only measurement found is one speaker's benchmark at FOSDEM 2026; no independent replication was found."); the "2.5x" dropped
- ecosystem: C-r1-evidence-10, -11 (wheel exists, not "works"), -12, -13 (some versions may be projected) supported
- maturity: C-r1-foundations-39 (final-b7, 3.14 JIT) · C-r2-criticism-13 supported · gap G-r1-07 stated ("The 3.15 notes say nothing either way.") · C-r1-criticism-22 supported (D-05: the debugging guide's "no major interpreter crash" vs the HOWTO's f_locals crash) · C-r1-criticism-10 supported (scoped by edition, D-04 resolved-by-scope)
- deliverable decision table T1: C-r2-evidence-10, C-r2-evidence-17, C-r2-evidence-09, C-r2-evidence-07, C-r1-cases-02, C-r1-evidence-11, C-r1-evidence-03/-04, C-r1-evidence-06 (narrower)

## Trying it {#trying-it} · install, check, control the GIL · T2 → commands + checklist
- Q6 answered · Q25 contested (D-09)
- C-r1-practice-11 supported · C-r1-practice-12 partial (the guide's list, pyenv without a free-threading option shown) · C-r1-practice-07 supported · C-r1-practice-08 attributed (D-03) · C-r1-practice-06 supported · C-r1-practice-10 attributed · C-r1-practice-09 (final-b7) · C-r1-foundations-02 supported
- check: C-r1-foundations-07 supported · C-r1-foundations-06 supported (why check after imports; gaps/r3 caution)
- control: C-r3-practice-09 supported · C-r1-foundations-05 supported · C-r3-practice-15 contested (D-09: glossary "must be run with -X gil=0" vs HOWTO and cmdline; never quote "disabled by default")
- deliverable T2: commands (C-r1-practice-12, C-r1-practice-11, C-r1-foundations-07, C-r3-practice-09) · checklist

## Your dependencies {#dependencies} · will a package keep the GIL off · T3 → checklist + diagram
- Q7 answered (D-02 resolved-by-scope) · Q23 answered · Q25 contested (D-09, in #trying-it)
- C-r1-evidence-10 supported (pure-Python wheels work) · C-r1-practice-18 supported · C-r1-foundations-03 supported · C-r1-foundations-10 supported (PEP 703, 3.13)
- import: C-r1-foundations-06 supported · C-r3-practice-07 supported (the warning text, names the module; never "permanently") · C-r1-practice-17 supported · C-r3-practice-10 attributed · C-r2-evidence-08 attributed (Wouters "playing with fire")
- install: C-r3-practice-01, -02 supported · C-r3-practice-12 partial ("…in a section about Python 3.13 … PyYAML 6.0.3+ supports free-threaded Python from 3.14t") · C-r3-practice-13 supported · C-r3-practice-14 attributed · C-r2-practice-20 attributed · C-r2-criticism-07 attributed, hedged
- ABI: C-r2-practice-18 attributed (guide: 3.13/3.14 no Limited API) · C-r2-practice-14 supported · C-r3-practice-04 supported · C-r3-practice-03 supported (filenames, not installers) · C-r2-practice-16, -17, -19 supported · C-r1-practice-19 supported · D-02 resolved-by-scope (callout: the HOWTO's stale sentence)
- diagram install-flow: C-r3-practice-01, -02, C-r1-practice-18, C-r1-foundations-06, C-r3-practice-07, C-r1-practice-17
- deliverable T3 checklist: C-r1-evidence-10, -13, C-r3-practice-13, C-r3-practice-07, C-r1-foundations-07, C-r3-practice-10, C-r3-practice-14

## Your code {#your-code} · threads, asyncio, processes · T4 → checklist + example
### Threads {#threads}
- Q9 answered (D-04 resolved-by-scope; D-06 open, attributed) · Q11, Q18 answered
- C-r1-foundations-08 supported · C-r1-criticism-03, -04, -05, -06 supported · C-r1-criticism-09 (final-b7) · C-r1-criticism-12 supported · C-r1-criticism-13 supported · C-r1-criticism-15 attributed · C-r1-criticism-16 (final-b7) · C-r1-criticism-10 supported · C-r2-practice-21 attributed · C-r2-criticism-08 attributed (D-06 side A, against the docs)
- example cache-with-lock: C-r1-criticism-15 (the race), C-r1-criticism-16 (the lock remedy), C-r1-criticism-06
### asyncio {#asyncio}
- Q10, Q22 answered (D-07 resolved-by-scope)
- C-r2-practice-01 attributed · C-r1-practice-22 attributed ("scaling linearly" is the release notes' wording) · C-r2-practice-02, -03, -04, -05, -07, -08, -09, -10 supported
- diagram loop-per-thread: C-r2-practice-02, -03, -07
### Processes and interpreters {#processes}
- Q11, Q18 answered (attributed)
- C-r1-cases-22 supported · C-r1-evidence-16 partial (attributed to Shaw) · C-r2-evidence-12 attributed · C-r2-evidence-13 partial (attributed) · C-r2-evidence-14 attributed · C-r1-criticism-27 attributed · C-r1-evidence-17 partial (attributed) · C-r1-cases-16, -18 supported · C-r1-cases-20 partial
- deliverable T4 checklist: C-r1-criticism-04, -06, -15, -16, -10, C-r2-practice-03, -07, -08, C-r1-cases-22, C-r2-evidence-14

## Best practices & next steps {#next-steps} · test, then measure · T5
- Q15 answered · Q17 answered
- C-r1-criticism-35, -37, -38, -40 supported (guide, attributed) · C-r1-criticism-36 (final-b7) · C-r1-foundations-08 · C-r1-criticism-11, -13 · C-r3-practice-13 · C-r1-evidence-11 · gap G-r1-04 restated as next step
- aligns: CPython's own advice to lock (C-r1-foundations-08) and the guide's (C-r1-criticism-16); diverges: Granian refuses the GIL (C-r1-cases-04) vs the default warning-and-continue (C-r3-practice-07)

## Quiz
- q-loop tests a single event loop on the free-threaded build: C-r2-practice-02 (explain: -03)
- q-atomic tests the documented guarantees (select all): C-r1-criticism-03, -04, -05
- q-import tests importing an unmarked extension: C-r3-practice-07, C-r1-foundations-06
- q-io tests why I/O-bound threads gain less: C-r2-evidence-09
- q-abi tests which stable-ABI tag a free-threaded 3.15 interpreter recognizes (cloze): C-r3-practice-03, C-r3-practice-04
- q-check (recall) tests the runtime check after imports: C-r1-foundations-07, C-r1-foundations-06

## Not used
- C-r1-cases-07: needs-rewrite (the "2.5x" with no baseline), dropped per gaps/final.md
- C-r2-criticism-04, -05, -09: the 2.5x baseline story and Gevent's 93% — the dropped figure's context and a metric the transcript leaves unclear; no task needs them
- C-r1-foundations-14, -16, -18, -19, -21, -29: header fields, immortal lists, per-thread refcount types — depth no task needs (candidate, unverified)
- C-r1-criticism-17, -21, -28, -31, -32, -33, -34, -39, -41, -42, -43, -44: framing, history and further testing tools covered by the claims used
- C-r1-practice-21, -23: Windows build-backend macro, asyncio pstree — no task needs them
- C-r1-cases-08, -09, -12, -14, -15, -17, -19, -21, -23, -24: subinterpreter detail and Hias's/Wouters's further opinions beyond the claims used
- C-r2-evidence-05, -06, -15, -16, -19: forward-looking or context-only claims
- C-r2-practice-06, -11, -13, -15: run_in_executor detail; the 429 blog pointer; PEP 803's loader rule (C-r3-practice-03 is the current docs' statement of it); the PyModuleDef_Init check ("may be removed")
- C-r1-evidence-02, -07, -08, -09, -14: covered by the claims used, or tuning detail
- C-v5-01: the HOWTO's stale abi3 sentence, mentioned only as D-02's resolution
