# Plan: 20261023-0350-free-threaded-cpython
- tier: 2 (breadth 2 · nesting 2 · exploration 2) · wave 1: 5 · per round: ≤ 3
  · budget: 10–20 / 30 tool calls · ceiling: 18
## Scouting
- search "free-threaded Python status 3.14": PEP 779 accepted (supported, still opt-in, Phase II) in 3.14; t-suffixed build; ecosystem uneven. Today is 2026-10-23: 3.15 may be out; currency must be checked.
- py-free-threading.github.io ToC: status, install, running with GIL disabled, porting guide, compatibility tracking, testing/debugging, frequent errors.
## Questions
- Q1 · load-bearing: yes (core definition) · angle: foundations · from: ask — What is the GIL and what is the free-threaded build (what is removed, what is kept, how it is built/named)?
- Q2 · load-bearing: yes (the "today" judgment rests on it) · angle: foundations · from: expert — History: PEP 703, its acceptance and the phased plan; 3.13 experimental; PEP 779 and 3.14 supported status.
- Q3 · load-bearing: yes (must-cover: whether to use it today) · angle: practice · from: must-cover — Current official status as of late 2026 (3.14, 3.15 if released): supported/experimental, default or not, plans for becoming default.
- Q4 · load-bearing: yes (must-cover: how it works) · angle: foundations · from: must-cover — How does CPython stay memory-safe without the GIL: biased reference counting, immortal objects, deferred refcounting, mimalloc, per-object locks/critical sections, QSBR, specialization.
- Q5 · load-bearing: yes (decision rests on cost/benefit) · angle: evidence · from: expert — Single-thread overhead and memory overhead of the free-threaded build (3.13 vs 3.14 numbers), and multi-thread speedups on CPU-bound work.
- Q6 · load-bearing: yes (must-cover: how to try it) · angle: practice · from: must-cover — How to install and run it: python.org installers, uv, pyenv/conda, `python3.14t`, PYTHON_GIL / -X gil, checking sys._is_gil_enabled() and Py_GIL_DISABLED.
- Q7 · load-bearing: yes (must-cover: dependencies) · angle: practice · from: must-cover — C extensions: Py_mod_gil, the GIL re-enabled at import of an unmarked extension (and the warning), separate cp3xt wheels/ABI, the stable ABI/abi3 situation, source-build fallback.
- Q8 · load-bearing: yes (must-cover: dependencies) · angle: evidence · from: must-cover — Ecosystem readiness: which major packages ship free-threaded wheels; where to check (tracking sites).
- Q9 · load-bearing: yes (must-cover: changes for the reader's code) · angle: criticism · from: must-cover — What changes for pure-Python threaded code: thread-safety of built-in types (list, dict), what is and is not guaranteed, races that the GIL used to hide, need for locks; concurrent iteration etc.
- Q10 · load-bearing: yes (must-cover: asyncio) · angle: practice · from: ask — What changes for asyncio code under free threading (asyncio is single-threaded; 3.14 asyncio thread-safety work; running multiple event loops in threads; to_thread).
- Q11 · load-bearing: yes (must-cover: multiprocessing) · angle: evidence · from: ask — Threads vs multiprocessing under free threading: when threads can replace processes (shared memory, no pickling), and what still favours processes.
- Q12 · load-bearing: yes (decision) · angle: criticism · from: expert — Known limitations and failure modes: known bugs, performance pitfalls (contention, refcount contention on shared objects), memory, features disabled, debugging difficulties.
- Q13 · load-bearing: yes (reader writes web services) · angle: cases · from: ask — Does free threading help web services (WSGI/ASGI servers, gunicorn/uvicorn/granian), and are there reported results?
- Q14 · load-bearing: no · angle: cases · from: expert — Real-world reports of trying or deploying the free-threaded build (companies, projects), with numbers.
- Q15 · load-bearing: no · angle: criticism · from: expert — How to test code for thread-safety under free threading (pytest-run-parallel, ThreadSanitizer, stress tests).
- Q16 · load-bearing: no · angle: foundations · from: expert — What comes next: Phase III / making it the default, and the criteria.
- Q17 · load-bearing: no · angle: cases · from: expert — Alternatives: subinterpreters (PEP 734, InterpreterPoolExecutor) vs free threading vs multiprocessing.
- Q18 · load-bearing: yes · angle: evidence · from: gap G-r1-01 — On the current release, when can threads replace multiprocessing for CPU-bound data processing, and what still favours processes?
- Q19 · load-bearing: yes · angle: evidence (foundations topic, grouped into r2-evidence) · from: gap G-r1-02 — What did the GIL already allow for I/O-bound threads (released during blocking I/O and in C code), so which part of a service or script gains from its removal?
- Q20 · load-bearing: yes · angle: criticism (cases topic, grouped into r2-criticism) · from: gap G-r1-03 — Does free threading help a typical WSGI/ASGI service today, which servers support it, any measurement beyond one speaker's slides (and the 2.5x baseline)?
- Q21 · load-bearing: yes · angle: evidence · from: gap G-r1-04 — Single-thread overhead and multi-thread speedup on 3.14.x/3.15, dated (settle D-01's dating).
- Q22 · load-bearing: yes · angle: practice · from: gap G-r1-05 — asyncio under free threading: single loop, to_thread/run_in_executor parallelism, asyncio thread-safety rules, multi-loop scaling.
- Q23 · load-bearing: yes · angle: practice · from: gap G-r1-06 — A dependency without a cp31Xt wheel: what pip does, abi3 usability, the GIL re-enable warning text, abi3t/PEP 803 status in 3.15 (D-02).
- Q24 · load-bearing: yes · angle: criticism · from: gap G-r1-07 — Maturity today: open crash classes in 3.14/3.15, unsupported features (JIT), recognising shared-object contention.
- Q25 · load-bearing: yes · angle: practice · from: gap G-r1-06 (gaps/r2.md) — Installing into a 3.14t/3.15t environment when a dependency has no free-threaded wheel: do pip and uv skip abi3 wheels or build from the sdist; the exact warning when an extension re-enables the GIL (does it name the module); the documented workarounds (PYTHON_GIL=0 / -X gil=0, pinning, waiting); and the 3.15 C-API stable ABI page (D-02, second source for C-r2-practice-13).
## Outline skeleton
- Background: Q1, Q2 (the GIL; why it existed; why remove it)
- Intuition: Q1, Q4 (toy example of two threads summing; what the GIL did; what replaces it)
- How it works: Q4
- Status today: Q3, Q16
- Worked examples / trying it: Q6, Q5 (installing, checking, a CPU-bound benchmark shape)
- What changes for your code: Q9, Q10, Q11, Q13
- What changes for your dependencies: Q7, Q8
- Costs and limitations: Q5, Q12
- Best practices & next steps: Q15, Q17, decision
- Quiz
- Sources
## Angles
- foundations (foundations + history; web): owns the GIL, PEP 703 design, internal mechanisms, history, PEP 703/779 phases, future default · not yours: practice (installing, current status of releases, extension API, asyncio); evidence (benchmarks, ecosystem readiness, threads vs processes); criticism (thread-safety of user code, bugs, testing); cases (web services, deployments, subinterpreters) · questions: Q1, Q2, Q4, Q16
- practice (current practice; web): owns current status of releases, installing/running, C-extension API and wheels mechanics, asyncio · not yours: foundations; evidence; criticism; cases · questions: Q3, Q6, Q7, Q10
- evidence (evidence and numbers; web): owns overhead and speedup measurements, ecosystem readiness numbers, threads vs multiprocessing · not yours: foundations; practice; criticism; cases · questions: Q5, Q8, Q11
- criticism (criticism and failure modes; web): owns thread-safety of user code, limitations, bugs, testing tools · not yours: foundations; practice; evidence; cases · questions: Q9, Q12, Q15
- cases (real cases; web): owns web-server results, deployment reports, subinterpreter alternative · not yours: foundations; practice; evidence; criticism · questions: Q13, Q14, Q17
## Query log
- r1 (lead scouting): "free-threaded Python status 3.14"
- r1-foundations: "PEP free-threaded default build phase III"; "discuss.python.org 2026 making free-threaded build the default PEP"
- r1-practice: "Python 3.15.0 released free-threaded"
- r1-evidence: "free-threaded Python 3.14 benchmark multithreaded speedup vs multiprocessing"; "free-threaded build threads instead of multiprocessing scaling measurements"
- r1-criticism: "free-threaded Python race conditions hidden by GIL"; "free-threaded CPython reference count contention shared object scaling"; "LWN free-threaded Python thread safety"; "lwn.net free threading Python GIL removal problems"; "free-threaded Python 3.14 segfault crash issue thread safety bug report"
- r1-cases: "free-threaded Python web server benchmark granian"; "free-threading Python production experience Meta Instagram"; "concurrent.interpreters InterpreterPoolExecutor docs when to use"; "free-threaded Python 3.14 FastAPI Flask benchmark requests per second"; "\"free-threaded\" Python deployment results company blog throughput"; "gunicorn free-threading support gthread Python 3.14t"; "FOSDEM GIL API performance free-threaded future"; "lwn.net Wouters free-threaded Python PyCon US 2026"; "Django free-threaded Python benchmark results talk"; "uvicorn OR gunicorn \"free-threaded\" benchmark WSGI threads 3.14t requests"
- r2-evidence: "Python 3.14t free-threaded benchmark scaling cores CPU-bound pure Python"; "free-threaded Python 2025 benchmark threads speedup" (site-restricted)
- r2-practice: "\"asyncio and free-threaded Python\" docs.python.org"
- r3-practice: "free-threaded wheel missing pip builds from source sdist cp314t"; "uv free-threaded Python docs.astral.sh 3.14t"; "pip no compatible wheel falls back to source distribution build" (site-restricted)
- r2-criticism: "FOSDEM 2026 Ruben Hias GIL API performance benchmark repository"; "uvicorn free-threaded Python 3.14t support changelog"; "gunicorn changelog free-threading python 3.14"; "gunicorn \"free-threaded\" gthread worker 2026 release notes"
