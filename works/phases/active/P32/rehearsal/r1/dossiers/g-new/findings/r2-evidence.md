# Findings: 20261023-0350-free-threaded-cpython · round 2 · angle evidence
- researcher: claude-opus-5-5 · status: partial (no rung-1/2 multi-thread speedup measurement on 3.14/3.15 found; Quansight NumPy post unreachable: HTTP 429 to curl and WebFetch, no Wayback snapshot) · tool calls: 30

## Questions
- Q18: thin — claims: C-r2-evidence-07, C-r2-evidence-08, C-r2-evidence-10, C-r2-evidence-12, C-r2-evidence-13, C-r2-evidence-14, C-r2-evidence-17, C-r2-evidence-18, C-r2-evidence-19 — note: rung-1 docs cover GIL re-enabling by unmarked extensions and memory; Wouters (LWN, June 2026) gives attributed views on process overhead/memory and shared-object contention; no rung-1/2 source on crash isolation as such (only that ProcessPoolExecutor reports an abruptly terminated child, C-19); no current threads-vs-processes measurement.
- Q19: answered — claims: C-r2-evidence-09, C-r2-evidence-10, C-r2-evidence-15, C-r2-evidence-16 — note: glossary states the GIL is always released during I/O and that some extensions release it for compression or hashing; threading docs call threads appropriate for I/O-bound tasks under the GIL.
- Q21: thin — claims: C-r2-evidence-01, C-r2-evidence-03, C-r2-evidence-04, C-r2-evidence-05, C-r2-evidence-06 — note: single-thread overhead now has a 3.15 doc figure (1% macOS aarch64 to 8% x86-64 Linux, page updated 22 Oct 2026, measurement date not printed) and an independent-venue attributed figure for 3.14 (0-10%, ~5% Linux/GCC); multi-thread CPU-bound speedup for 3.14/3.15 found only in rung-3 blogs and forum posts; NumPy-style scaling not reached.

## Sources

### S-r2-evidence-01
- url: https://docs.python.org/3.15/howto/free-threading-python.html · canonical: docs.python.org/3.15/howto/free-threading-python.html
- title: Python support for free threading · authors: n/a · publisher: Python Software Foundation (docs.python.org)
- date: "Last updated on Oct 22, 2026 (18:46 UTC)" · version: page header says "Python 3.15.1 documentation"
- accessed: 2026-10-23 · read-via: curl · quote-match: exact · archive: none
- kind: official docs · peer-review: n/a
- owner: Python Software Foundation / CPython core developers · upstream: none
- lateral: official CPython documentation built from the CPython repository; same text as the 3.14 HOWTO for the overhead figure (S-r1-evidence-01/P1), so not an independent measurement.
- passages:
  - P1 · § "Single-threaded performance": "The free-threaded build has additional overhead when executing Python code compared to the default GIL-enabled build. The amount of overhead depends on the workload and hardware. On the pyperformance benchmark suite, the average overhead ranges from about 1% on macOS aarch64 to 8% on x86-64 Linux systems."
  - P2 · § "Python support for free threading": "Some third-party packages, in particular ones with an extension module, may not be ready for use in a free-threaded build, and will re-enable the GIL."
  - P3 · § "The global interpreter lock in free-threaded Python": "The GIL may also automatically be enabled when importing a C-API extension module that is not explicitly marked as supporting free threading. A warning will be printed in this case."
  - P4 · § "Python support for free threading": "While not all software will benefit from this automatically, programs designed with threading in mind will run faster on multi-core hardware."
  - P5 · § "Non-GC objects have a larger object header": "For example, on the AMD64 platform, None uses 32 bytes on the free-threaded build vs 16 bytes for the default build. GC objects (such as dicts and lists) are the same size for both builds since the free-threaded build does not use additional space for the GC info."
  - P6 · page footer: "Last updated on Oct 22, 2026 (18:46 UTC)."

### S-r2-evidence-02
- url: https://docs.python.org/3.15/whatsnew/3.15.html · canonical: docs.python.org/3.15/whatsnew/3.15.html
- title: What’s new in Python 3.15 · authors: Editor: Hugo van Kemenade · publisher: Python Software Foundation (docs.python.org)
- date: release stated as 9 October 2026 · version: Python 3.15 (header "3.15.1 documentation")
- accessed: 2026-10-23 · read-via: curl · quote-match: exact · archive: none
- kind: official docs (release notes) · peer-review: n/a
- owner: Python Software Foundation / CPython core developers · upstream: none
- lateral: official release notes; editor is the 3.14/3.15 release manager.
- passages:
  - P1 · § "What’s new in Python 3.15": "Python 3.15 was released on 9 October 2026."
  - P2 · § "Summary – Release highlights": "PEP 803, 820, 793: Stable ABI for free-threaded builds and related C API"
  - P3 · § "Summary – Release highlights": "The official macOS binaries now install free-threading support by default"
  - P4 · § "concurrent.futures": "Improved error reporting when a child process in a concurrent.futures.ProcessPoolExecutor terminates abruptly. The resulting traceback will now tell you the PID and exit code of the terminated process."

### S-r2-evidence-03
- url: https://docs.python.org/3/glossary.html · canonical: docs.python.org/3/glossary.html
- title: Glossary · authors: n/a · publisher: Python Software Foundation (docs.python.org)
- date: not read (current /3/ docs as served 2026-10-23; /3/ pages served as 3.15.1 per S-r2-evidence-04) · version: current (/3/)
- accessed: 2026-10-23 · read-via: curl · quote-match: exact · archive: none
- kind: official docs · peer-review: n/a
- owner: Python Software Foundation / CPython core developers · upstream: none
- lateral: official CPython documentation.
- passages:
  - P1 · § "global interpreter lock": "The mechanism used by the CPython interpreter to assure that only one thread executes Python bytecode at a time."
  - P2 · § "global interpreter lock": "However, some extension modules, either standard or third-party, are designed so as to release the GIL when doing computationally intensive tasks such as compression or hashing. Also, the GIL is always released when doing I/O."

### S-r2-evidence-04
- url: https://docs.python.org/3/library/threading.html · canonical: docs.python.org/3/library/threading.html
- title: threading — Thread-based parallelism · authors: n/a · publisher: Python Software Foundation (docs.python.org)
- date: not read · version: header "Python 3.15.1 documentation"
- accessed: 2026-10-23 · read-via: curl · quote-match: exact · archive: none
- kind: official docs · peer-review: n/a
- owner: Python Software Foundation / CPython core developers · upstream: none
- lateral: official CPython documentation.
- passages:
  - P1 · § "threading — Thread-based parallelism": "CPython implementation detail: In CPython, due to the Global Interpreter Lock, only one thread can execute Python code at once (even though certain performance-oriented libraries might overcome this limitation). If you want your application to make better use of the computational resources of multi-core machines, you are advised to use multiprocessing or concurrent.futures.ProcessPoolExecutor. However, threading is still an appropriate model if you want to run multiple I/O-bound tasks simultaneously."
  - P2 · § "GIL and performance considerations": "However, the GIL limits the performance gains of threading when it comes to CPU-bound tasks, as only one thread can execute Python bytecode at a time."
  - P3 · § "GIL and performance considerations": "As of Python 3.13, free-threaded builds can disable the GIL, enabling true parallel execution of threads, but this feature is not available by default (see PEP 703)."

### S-r2-evidence-05
- url: https://lwn.net/SubscriberLink/1078367/eaa511915870fdb2/ · canonical: lwn.net/Articles/1078367/
- title: Free-threaded Python: past, present, and future · authors: Jake Edge · publisher: LWN.net (Eklektix, Inc.)
- date: June 22, 2026 · version: talk covers 3.13, 3.14 and the then-upcoming 3.15
- accessed: 2026-10-23 · read-via: curl · quote-match: exact · archive: none
- kind: news (edited reporting of Thomas Wouters's PyCon US 2026 talk) · peer-review: no (editorial control: yes)
- owner: LWN.net · upstream: Thomas Wouters's PyCon US 2026 talk (video https://www.youtube.com/watch?v=PZu6LyiZVbM, per an LWN editor comment)
- lateral: LWN is independent edited reporting; Wouters is a CPython core developer, steering council member, PEP 779 co-author and works for Meta on the free-threaded interpreter (stated in the article), so his figures and evaluations carry a stake. Same LWN author as S-r1-evidence-08, but a different talk and speaker.
- note: passages with quotation marks inside are split with " … " around the inner quotes.
- passages:
  - P1 · § "Status": "For 3.14, from October 2025, free-threaded Python was … with a 0-10% slowdown for single-threaded workloads."
  - P2 · § "Status": "On Linux using GCC, it's usually around 5%, though it can go up to 10%, particularly with older compilers."
  - P3 · § "Status": "Python 3.13, which was released in October 2024, had experimental free-threading support. … relatively slow, with 20-40% slowdown on single-threaded workloads … It had thread-safety issues and some scalability problems, where adding more threads could make things go slower."
  - P4 · § "Status": "There are also a lot of scalability improvements for free threading coming in 3.15."
  - P5 · § "Motivation": "The same benefit can come from using multiple processes, but there is more overhead and the address spaces are not shared."
  - P6 · § "Motivation": "There are other options, such as using multiple processes, but that typically requires more memory and copying data between the processes."
  - P7 · § "Motivation": "Without the GIL, multi-threaded solutions to those things can offer higher throughput, lower memory use, and lower latency."
  - P8 · § "Status": "Having many threads accessing the same objects is a problem that Python cannot solve directly. … Sharing objects between threads is still problematic for performance. … There are some possible solutions, including the ft_utils package, which has some scalable container types."
  - P9 · § "Future": "Wouters said that modules without support for free threading will currently cause the interpreter to emit a warning and re-enable the GIL. That can be worked around with a flag to always disable the GIL, … but that is playing with fire, so you probably only want to do that for testing"
  - P10 · § "Motivation": "For example, continuing to execute the main program while calling into blocking APIs or when interacting with a third-party library that requires using threads to access it, … commonly databases"
  - P11 · § "Motivation": "He is a big proponent of asyncio and thinks it is the best way to do network I/O, … where threads can easily lead you wrong"
  - P12 · § "Status": "Making Python code scale well may require more extensive changes."

## Claims

### C-r2-evidence-01
- claim: The Python 3.15 free-threading HOWTO (last updated 22 October 2026) states that the free-threaded build's overhead depends on workload and hardware and that on the pyperformance suite the average overhead ranges from about 1% on macOS aarch64 to 8% on x86-64 Linux; the page prints no measurement date.
- kind: number · questions: Q21 · load-bearing: yes (the current release's own figure, bearing on D-01)
- support: S-r2-evidence-01/P1 · rung 1 · fit direct · upstream self
- support: S-r2-evidence-01/P6 · rung 1 · fit direct (date of page, not of measurement) · upstream self
- scope: CPython 3.15 docs as served 2026-10-23; pyperformance average; text identical to the 3.14 HOWTO (S-r1-evidence-01/P1), so it may be a carried-over figure rather than a 3.15 re-measurement
- confidence: medium (version of the measurement unclear) · flags: none
- conflicts: S-r1-evidence-04/P1 "roughly 5-10%, depending on the platform and C compiler used" (D-01)

### C-r2-evidence-03
- claim: Thomas Wouters, in his PyCon US 2026 talk as reported by LWN (22 June 2026), said that free-threaded Python 3.14 has a 0-10% slowdown on single-threaded workloads, usually around 5% on Linux with GCC and up to 10% particularly with older compilers.
- kind: number · questions: Q21 · load-bearing: yes (independent-venue figure dated 2026)
- support: S-r2-evidence-05/P1 · rung 2 · fit direct · upstream Wouters's talk
- support: S-r2-evidence-05/P2 · rung 2 · fit direct · upstream Wouters's talk
- scope: CPython 3.14; attributed to Wouters (Meta, PEP 779 co-author); no benchmark suite named; the article also quotes him attributing the 0% end to Arm hardware
- confidence: medium · flags: vendor-about-itself (a free-threading implementer on his own project)
- conflicts: S-r2-evidence-01/P1 "from about 1% on macOS aarch64 to 8% on x86-64 Linux" (compatible in range, different upper bound)

### C-r2-evidence-04
- claim: Thomas Wouters (LWN, June 2026) described the 3.13 free-threaded build as having a 20-40% single-threaded slowdown and scalability problems in which adding more threads could make things slower.
- kind: number · questions: Q21 · load-bearing: no (history; 3.13 baseline is C-r1-evidence-01)
- support: S-r2-evidence-05/P3 · rung 2 · fit direct · upstream Wouters's talk
- scope: CPython 3.13 (October 2024)
- confidence: medium · flags: none
- conflicts: S-r1-evidence-02/P1 "In 3.13, this overhead is about 40% on the pyperformance suite" (single figure vs range)

### C-r2-evidence-05
- claim: Thomas Wouters (LWN, June 2026, before the 3.15 release) said that a lot of scalability improvements for free threading were coming in Python 3.15; the report gives no figures.
- kind: prediction · questions: Q21 · load-bearing: no (unquantified)
- support: S-r2-evidence-05/P4 · rung 2 · fit direct · upstream Wouters's talk
- scope: stated May 2026 about the then-upcoming 3.15
- confidence: medium · flags: speculation (forward-looking), vendor-about-itself
- conflicts: none

### C-r2-evidence-06
- claim: The release-highlights summary of What's New in Python 3.15 (released 9 October 2026) lists, for free threading, a stable ABI for free-threaded builds (PEP 803, 820, 793) and official macOS binaries installing free-threading support by default; the highlights list gives no free-threading performance figure.
- kind: fact · questions: Q21 · load-bearing: no (negative evidence for D-01: no newer official overhead figure in the 3.15 highlights)
- support: S-r2-evidence-02/P1 · rung 1 · fit direct · upstream self
- support: S-r2-evidence-02/P2 · rung 1 · fit direct · upstream self
- support: S-r2-evidence-02/P3 · rung 1 · fit direct · upstream self
- scope: highlights list and table of contents only; the full page was not read line by line
- confidence: medium (absence inferred from the summary and TOC) · flags: none
- conflicts: none

### C-r2-evidence-07
- claim: The Python 3.15 free-threading HOWTO states that some third-party packages, in particular ones with an extension module, may not be ready for the free-threaded build and will re-enable the GIL, and that importing a C-API extension module not explicitly marked as supporting free threading may automatically enable the GIL, with a warning printed.
- kind: behaviour · questions: Q18 · load-bearing: yes (a dependency can remove the gain)
- support: S-r2-evidence-01/P2 · rung 1 · fit direct · upstream self
- support: S-r2-evidence-01/P3 · rung 1 · fit direct · upstream self
- scope: CPython 3.15 docs
- confidence: high · flags: none
- conflicts: none

### C-r2-evidence-08
- claim: Thomas Wouters (LWN, June 2026) said that a module without free-threading support makes the interpreter emit a warning and re-enable the GIL, and that forcing the GIL off with a flag is "playing with fire" and probably only for testing.
- kind: evaluation · questions: Q18 · load-bearing: no (attributed advice; behaviour is C-07)
- support: S-r2-evidence-05/P9 · rung 2 · fit direct · upstream Wouters's talk
- scope: attributed; 2026
- confidence: medium · flags: none
- conflicts: none

### C-r2-evidence-09
- claim: The Python glossary states that the GIL assures only one thread executes Python bytecode at a time, but that some standard or third-party extension modules release the GIL during computationally intensive tasks such as compression or hashing, and that the GIL is always released when doing I/O.
- kind: behaviour · questions: Q19 · load-bearing: yes (what threads could already do under the GIL)
- support: S-r2-evidence-03/P1 · rung 1 · fit direct · upstream self
- support: S-r2-evidence-03/P2 · rung 1 · fit direct · upstream self
- scope: current CPython docs (/3/), default GIL build; "some extension modules" only
- confidence: high · flags: none
- conflicts: none

### C-r2-evidence-10
- claim: The threading module documentation (3.15) notes that in CPython, because of the GIL, only one thread can execute Python code at once, advises multiprocessing or ProcessPoolExecutor to use multi-core machines better, and calls threading still an appropriate model for running multiple I/O-bound tasks simultaneously.
- kind: behaviour · questions: Q19, Q18 · load-bearing: yes (the official baseline advice the free-threaded build changes)
- support: S-r2-evidence-04/P1 · rung 1 · fit direct · upstream self
- support: S-r2-evidence-04/P2 · rung 1 · fit direct · upstream self
- scope: CPython default (GIL) build; docs labelled 3.15.1
- confidence: high · flags: none
- conflicts: none

### C-r2-evidence-11
- claim: The threading module documentation (3.15) states that since Python 3.13 free-threaded builds can disable the GIL for true parallel execution of threads, but that this feature is not available by default.
- kind: fact · questions: Q18 · load-bearing: no (context)
- support: S-r2-evidence-04/P3 · rung 1 · fit direct · upstream self
- scope: docs labelled 3.15.1
- confidence: high · flags: none
- conflicts: none

### C-r2-evidence-12
- claim: Thomas Wouters (LWN, June 2026) said that using multiple processes instead of threads has more overhead, does not share address spaces, and typically requires more memory and copying data between the processes.
- kind: interpretation · questions: Q18 · load-bearing: yes (why threads can replace processes)
- support: S-r2-evidence-05/P5 · rung 2 · fit direct · upstream Wouters's talk
- support: S-r2-evidence-05/P6 · rung 2 · fit direct · upstream Wouters's talk
- scope: attributed; general, no measurement
- confidence: medium · flags: vendor-about-itself (implementer's view)
- conflicts: none (consistent with Shaw, C-r1-evidence-16: different talk and speaker, same LWN author; independence is partial)

### C-r2-evidence-13
- claim: Thomas Wouters (LWN, June 2026) said that without the GIL, multi-threaded solutions can offer higher throughput, lower memory use and lower latency than the alternatives he listed (multiple processes, subinterpreters, asyncio).
- kind: evaluation · questions: Q18 · load-bearing: yes (attributed form only)
- support: S-r2-evidence-05/P7 · rung 2 · fit direct · upstream Wouters's talk
- scope: attributed; "can" (conditional); no measurement
- confidence: medium · flags: speculation ("can"), vendor-about-itself
- conflicts: none direct (PEP 779's 15-20% higher memory use, S-r1-evidence-03/P2, is per-interpreter cost, not threads vs processes)

### C-r2-evidence-14
- claim: Thomas Wouters (LWN, June 2026) said that sharing objects between threads is still problematic for performance on free-threaded Python, that many threads accessing the same objects is a problem Python cannot solve directly, that making code scale well may require more extensive changes, and pointed to the ft_utils package's scalable container types.
- kind: interpretation · questions: Q18 · load-bearing: yes (contention on shared objects)
- support: S-r2-evidence-05/P8 · rung 2 · fit direct · upstream Wouters's talk
- support: S-r2-evidence-05/P12 · rung 2 · fit direct · upstream Wouters's talk
- scope: attributed; 2026
- confidence: medium · flags: none (an implementer conceding a limit)
- conflicts: none

### C-r2-evidence-15
- claim: Thomas Wouters (LWN, June 2026) gave reasons beyond performance for threads in Python: keeping the main program running while calling blocking APIs, and using third-party libraries that require threads, commonly databases.
- kind: interpretation · questions: Q19 · load-bearing: no (context for I/O use of threads)
- support: S-r2-evidence-05/P10 · rung 2 · fit direct · upstream Wouters's talk
- scope: attributed
- confidence: medium · flags: none
- conflicts: none

### C-r2-evidence-16
- claim: Thomas Wouters (LWN, June 2026) said he thinks asyncio is the best way to do network I/O, "where threads can easily lead you wrong".
- kind: evaluation · questions: Q19 · load-bearing: no (attributed opinion; asyncio belongs to practice)
- support: S-r2-evidence-05/P11 · rung 2 · fit direct · upstream Wouters's talk
- scope: attributed
- confidence: medium · flags: superlative ("best")
- conflicts: none

### C-r2-evidence-17
- claim: The Python 3.15 free-threading HOWTO states that not all software will benefit from free threading automatically, but programs designed with threading in mind will run faster on multi-core hardware.
- kind: behaviour · questions: Q18 · load-bearing: no (same text as S-r1-evidence-01/P6 for 3.14)
- support: S-r2-evidence-01/P4 · rung 1 · fit direct · upstream self
- scope: CPython 3.15 docs; no figure
- confidence: high · flags: none
- conflicts: none

### C-r2-evidence-18
- claim: The Python 3.15 free-threading HOWTO states that on AMD64 the object None uses 32 bytes on the free-threaded build versus 16 bytes on the default build, while GC objects such as dicts and lists are the same size on both builds.
- kind: number · questions: Q18 · load-bearing: no (memory detail)
- support: S-r2-evidence-01/P5 · rung 1 · fit direct · upstream self
- scope: AMD64; non-GC objects only
- confidence: high · flags: none
- conflicts: none

### C-r2-evidence-19
- claim: What's New in Python 3.15 states that when a child process in a concurrent.futures.ProcessPoolExecutor terminates abruptly, the resulting traceback now gives the PID and exit code of the terminated process.
- kind: behaviour · questions: Q18 · load-bearing: no (fit partial for crash isolation: shows the pool reports a dead worker, not a general isolation guarantee)
- support: S-r2-evidence-02/P4 · rung 1 · fit partial · upstream self
- scope: Python 3.15
- confidence: high · flags: none
- conflicts: none

## Conflicts
- C-r2-evidence-01 / C-r2-evidence-03 (extends D-01): S-r2-evidence-01/P1 (3.15 HOWTO, updated 22 Oct 2026) says the average overhead ranges "from about 1% on macOS aarch64 to 8% on x86-64 Linux systems"; S-r2-evidence-05/P1-P2 (Wouters via LWN, June 2026, about 3.14) says "a 0-10% slowdown for single-threaded workloads" and "usually around 5%, though it can go up to 10%" on Linux with GCC; S-r1-evidence-04/P1 (What's New 3.14) says "roughly 5-10%". Not settled; the 3.15 HOWTO text is word-for-word the 3.14 HOWTO's, so it is not clearly a 3.15 measurement.
- C-r2-evidence-04: S-r2-evidence-05/P3 says 3.13 had "20-40% slowdown"; S-r1-evidence-02/P1 says "about 40%". Not settled (range vs single figure).

## Speculation and flags
- S-r2-evidence-05 (Wouters): works for Meta on the free-threaded interpreter and co-authored PEP 779; his figures and evaluations (C-03, C-12, C-13) are an implementer speaking about the project.
- C-r2-evidence-05: forward-looking ("coming in 3.15"), no numbers.
- C-r2-evidence-13: "can offer" (conditional, no measurement).
- C-r2-evidence-16: superlative ("the best way").
- S-r2-evidence-01/02/04: the docs header reads "Python 3.15.1 documentation" although What's New says 3.15 was released 9 October 2026; possibly a docs build label for the 3.15 branch. Surprising; not resolved.
- S-r2-evidence-03 (glossary, current docs) says that after building with --disable-gil code "must be run with -X gil=0 or after setting the PYTHON_GIL=0 environment variable", which reads at odds with the HOWTO (GIL disabled by default, re-enabled optionally); not used; for the foundations or practice angle.

## Unused leads
- https://labs.quansight.org/blog/scaling-numpy-on-free-threaded-python — HTTP 429 to curl (r2) and WebFetch; Wayback has no snapshot; still the best lead for NumPy-style threads-vs-processes (Q18/Q21).
- https://discuss.python.org/t/slower-performance-with-disable-gil-on-threaded-nearest-neighbor-benchmark-10m-points/95365 — forum report (rung 3) that a threaded benchmark was slower with the GIL disabled, traced to reference-count contention; pointer for Q18 contention.
- https://discuss.python.org/t/about-free-threading-performance/54604 — forum thread with user speedup reports (rung 3).
- https://github.com/ArtInt-Research-Org/python314-free-threading — benchmark repository for 3.14t (unknown owner; not opened).
- https://www.youtube.com/watch?v=PZu6LyiZVbM — Wouters's PyCon US 2026 talk video, the upstream of S-r2-evidence-05.
- S-r2-evidence-05 § "Future" — Wouters predicts free threading becomes the default sometime after 3.16 and before 3.20, and says more than 50% of the top 360 binary wheels support it (cases / Q8).

## Queries
- "Python 3.14t free-threaded benchmark scaling cores CPU-bound pure Python" → nothing new (rung-3 blogs only)
- "free-threaded Python 2025 benchmark threads speedup" (domains: lwn.net, py-free-threading.github.io, docs.python.org, peps.python.org, discuss.python.org) → useful (LWN 2026 article)
- direct fetches: docs.python.org 3.15 HOWTO, What's New 3.15, /3/ glossary, /3/ threading → useful; labs.quansight.org scaling-numpy → HTTP 429 (curl and WebFetch), Wayback unavailable
