# Findings: 20261023-0350-free-threaded-cpython · round 2 · angle practice
- researcher: claude-opus-5-5 · status: partial (hard cap reached; Q22 multi-loop measurement unread because the Quansight blog returned HTTP 429 twice; Q23 pip-without-wheel behaviour and the GIL re-enable warning text not searched) · tool calls: 29

## Questions
- Q22: thin — claims: C-r2-practice-01, C-r2-practice-02, C-r2-practice-03, C-r2-practice-04, C-r2-practice-05, C-r2-practice-06, C-r2-practice-07, C-r2-practice-08, C-r2-practice-09, C-r2-practice-10, C-r2-practice-11, C-r2-practice-21 — note: single loop, multi-loop and thread-safety rules answered from the 3.15.1 docs; the to_thread docs note does not name free-threaded CPython explicitly; no scaling measurement retrieved (the docs point to Kumar Aditya's blog, which returned 429)
- Q23: thin — claims: C-r2-practice-12, C-r2-practice-13, C-r2-practice-14, C-r2-practice-15, C-r2-practice-16, C-r2-practice-17, C-r2-practice-18, C-r2-practice-19, C-r2-practice-20 — note: abi3 vs free-threaded loading, abi3t and PEP 803 status (Final, 30-Mar-2026) answered; what pip does when no cp31Xt wheel exists (sdist build) and the exact warning text on GIL re-enable were not searched within the cap

## Sources

### S-r2-practice-01
- url: https://peps.python.org/pep-0803/ · canonical: peps.python.org/pep-0803/
- title: PEP 803 – "abi3t": Stable ABI for Free-Threaded Builds · authors: Petr Viktorin, Nathan Goldbaum · publisher: Python Software Foundation (peps.python.org)
- date: created 19-Aug-2025; resolution 30-Mar-2026 · version: Status Final, Python-Version 3.15
- accessed: 2026-10-23 · read-via: curl · quote-match: exact · archive: none
- kind: spec · peer-review: n/a (PEP process, Steering Council resolution)
- owner: Python Software Foundation / CPython core developers · upstream: none
- lateral: PEP authors are a CPython core developer (Viktorin) and a Quansight Labs engineer (Goldbaum), who also co-maintains the py-free-threading guide (S-r2-practice-04, -07)
- passages:
  - P1 · § "PEP 803 – “abi3t”: Stable ABI for Free-Threaded Builds": "Status: … Final … Python-Version: … 3.15 … Resolution: … 30-Mar-2026"
  - P2 · § "PEP 803 – “abi3t”: Stable ABI for Free-Threaded Builds": "This PEP is a historical document. The up-to-date, canonical documentation can now be found at Stable Application Binary Interfaces and Migrating to Stable ABI for free threading (abi3t)."
  - P3 · § "Abstract": "In practice, abi3t 3.15 will be compatible with abi3 3.15. Extension authors are encouraged to explicitly compile for both ABIs at once, and signal compatibility using the wheel tag abi3.abi3t."
  - P4 · § "Motivation": "The Stable ABI is currently not available for free-threaded builds. Extensions will fail to build for the Stable ABI on free-threaded Python (that is, when both Py_LIMITED_API and Py_GIL_DISABLED preprocessor macros are defined). Extensions built for GIL-enabled builds of CPython will fail to load (or crash) on free-threaded builds."
  - P5 · § "Check for non-free-threaded ABI in free-threading builds": "Additionally, in free-threaded builds, PyModuleDef_Init() will detect extensions using the non-free-threading Stable ABI, emit an informative message when one is loaded, and raise an exception."
  - P6 · § "The abi3t wheel and filename tags": "On these systems, all builds of CPython – GIL-enabled and free-threaded – will load extensions with the abi3t tag. Free-threaded builds will – unlike in 3.14 – not load extensions with the abi3 tag."
  - P7 · § "The abi3t wheel and filename tags": "python3.15t: ['.cpython-315-x86_64-linux-gnu.so', '.abi3t.so', '.so']"
  - P8 · § "Recommendations for installers": "Package installers should allow abi3t-tagged wheels for free-threaded builds wherever they currently allow abi3-tagged ones for (otherwise equal) non-free-threaded builds."
  - P9 · § "Recommendations for build tools": "For example, a wheel tagged cp315-abi3.abi3t will be compatible with 3.15, 3.16, and later versions; cp317-abi3.abi3t will be compatible with 3.17+."
  - P10 · § "New API": "Implementing this PEP will make it possible to build extensions that can be successfully loaded on free-threaded Python, but not necessarily ones that are thread-safe without a GIL."
  - P11 · § "Backwards and Forwards Compatibility": "As for the existing Stable ABI: abi3 3.x continues to be compatible with GIL-enabled CPython 3.x or above, as promised in PEP 384 and amended in PEP 703."

### S-r2-practice-02
- url: https://docs.python.org/3/library/asyncio-dev.html · canonical: docs.python.org/3/library/asyncio-dev.html
- title: Developing with asyncio · authors: n/a · publisher: Python Software Foundation
- date: n/a · version: Python 3.15.1 documentation
- accessed: 2026-10-23 · read-via: curl · quote-match: exact · archive: none
- kind: official docs · peer-review: n/a
- owner: Python Software Foundation · upstream: none
- lateral: official CPython documentation
- passages:
  - P1 · § "Concurrency and Multithreading": "An event loop runs in a thread (typically the main thread) and executes all callbacks and Tasks in its thread. While a Task is running in the event loop, no other Tasks can run in the same thread."
  - P2 · § "Concurrency and Multithreading": "Almost all asyncio objects are not thread safe, which is typically not a problem unless there is code that works with them from outside of a Task or a callback."
  - P3 · § "Concurrency and Multithreading": "The loop.run_in_executor() method can be used with a concurrent.futures.ThreadPoolExecutor or InterpreterPoolExecutor to execute blocking code in a different OS thread without blocking the OS thread that the event loop runs in."
  - P4 · § "Debug Mode": "Many non-threadsafe asyncio APIs (such as loop.call_soon() and loop.call_at() methods) raise an exception if they are called from a wrong thread."
  - P5 · § "Running Blocking Code": "Blocking (CPU-bound) code should not be called directly. For example, if a function performs a CPU-intensive calculation for 1 second, all concurrent asyncio Tasks and IO operations would be delayed by 1 second."

### S-r2-practice-03
- url: https://docs.python.org/3/library/asyncio-task.html · canonical: docs.python.org/3/library/asyncio-task.html
- title: Coroutines and Tasks · authors: n/a · publisher: Python Software Foundation
- date: n/a · version: Python 3.15.1 documentation
- accessed: 2026-10-23 · read-via: curl · quote-match: exact · archive: none
- kind: official docs · peer-review: n/a
- owner: Python Software Foundation · upstream: none
- lateral: official CPython documentation
- passages:
  - P1 · § "Running in threads": "This coroutine function is primarily intended to be used for executing IO-bound functions/methods that would otherwise block the event loop if they were run in the main thread."
  - P2 · § "Running in threads": "Due to the GIL, asyncio.to_thread() can typically only be used to make IO-bound functions non-blocking. However, for extension modules that release the GIL or alternative Python implementations that don’t have one, asyncio.to_thread() can also be used for CPU-bound functions."

### S-r2-practice-04
- url: https://py-free-threading.github.io/porting/ · canonical: py-free-threading.github.io/porting/
- title: Porting Python Packages to Support Free-Threading · authors: Quansight Labs & open source contributors · publisher: Python Free-Threading Guide
- date: July 10, 2024; updated June 28, 2026 · version: n/a
- accessed: 2026-10-23 · read-via: curl · quote-match: exact · archive: none
- kind: official docs (community guide, not CPython-owned) · peer-review: no
- owner: Quansight Labs and contributors · upstream: none
- lateral: maintained by Quansight Labs engineers who implemented much of the free-threading ecosystem work; not a PSF document
- passages:
  - P1 · § "Dependencies that don't support free-threading": "If one of your package's dependencies does not support free-threading, you might be able to switch to a fork that does."
  - P2 · § "Converting global state to context-local or thread-local state": "A newly spawned thread inherits a copy of the spawning thread's context on the free-threaded build, where PYTHON_THREAD_INHERIT_CONTEXT is enabled by default, but starts from each variable's default on the GIL-enabled build, where it is disabled by default."

### S-r2-practice-06
- url: https://docs.python.org/3/library/asyncio-threading.html · canonical: docs.python.org/3/library/asyncio-threading.html
- title: asyncio and free-threaded Python · authors: n/a · publisher: Python Software Foundation
- date: last updated Oct 22, 2026 · version: Python 3.15.1 documentation
- accessed: 2026-10-23 · read-via: curl · quote-match: exact · archive: none
- kind: official docs · peer-review: n/a
- owner: Python Software Foundation · upstream: none
- lateral: official CPython documentation; the page is linked as "Next topic" from asyncio-dev
- passages:
  - P1 · § "asyncio and free-threaded Python": "It also allows off-loading CPU-bound work to a thread or process pool, but that is still limited by the global interpreter lock in CPython."
  - P2 · § "asyncio and free-threaded Python": "Since Python 3.14, asyncio has first-class support for free-threaded Python, and the implementation of asyncio is safe to use in a multi-threaded environment."
  - P3 · § "asyncio and free-threaded Python": "A single event loop on one core can handle many connections concurrently, but the Python code that runs to handle each one still executes serially."
  - P4 · § "asyncio and free-threaded Python": "by running an event loop per thread, the handling of different requests can run in parallel across multiple CPU cores. It is also useful when you need to run blocking or CPU-bound code from an asyncio application."
  - P5 · § "asyncio and free-threaded Python": "Scaling asyncio on Free-Threaded Python, a blog post by Kumar Aditya which explains the internal changes that make asyncio safe and efficient under free-threaded Python, together with benchmarks of the resulting improvements."
  - P6 · § "Thread safety considerations": "Event loop: Each thread should have its own event loop which should not be shared across threads."
  - P7 · § "Thread safety considerations": "Task management: Tasks and futures created in one thread should not be awaited or manipulated from another thread."
  - P8 · § "Thread safety considerations": "Synchronization: The synchronization primitives provided by asyncio (like asyncio.Lock and asyncio.Event) are not designed to be used across threads. If you need to synchronize between threads, you should use the synchronization primitives from the threading module instead."
  - P9 · § "Producer/consumer across threads": "use a thread-safe primitive such as queue.Queue rather than asyncio.Queue, which is only safe within a single event loop."
  - P10 · § "Using asyncio with threads": "In this example, each thread creates its own event loop with asyncio.run() and runs a coroutine on it. The threads execute concurrently, and in a free-threaded build they can run on separate CPU cores in parallel."
  - P11 · § "Thread safety considerations": "it’s important to use thread-safe APIs provided by asyncio, such as asyncio.run_coroutine_threadsafe() for submitting coroutines to an event loop from another thread."

### S-r2-practice-07
- url: https://py-free-threading.github.io/porting-extensions/ · canonical: py-free-threading.github.io/porting-extensions/
- title: Porting Extension Modules to Support Free-Threading · authors: Quansight Labs & open source contributors · publisher: Python Free-Threading Guide
- date: July 10, 2024; updated October 12, 2026 · version: n/a
- accessed: 2026-10-23 · read-via: curl · quote-match: exact · archive: none
- kind: official docs (community guide, not CPython-owned) · peer-review: no
- owner: Quansight Labs and contributors · upstream: PEP 803 (shares an author, Nathan Goldbaum, with S-r2-practice-01; not independent of it for abi3t claims)
- lateral: same guide as S-r2-practice-04
- passages:
  - P1 · § "Limited API support": "Free-threaded CPython 3.13 and 3.14 do not support the Limited API, so extensions for those interpreters need version-specific wheels. An ordinary abi3 extension remains limited to GIL-enabled builds."
  - P2 · § "Limited API support": "CPython 3.15 adds a separate Stable ABI named abi3t. Extensions that satisfy its restrictions can publish one wheel compatible with both GIL-enabled and free-threaded CPython 3.15 and later."
  - P3 · § "Limited API support": "If an extension cannot target abi3t, build it against the full C API instead and publish version-specific free-threaded wheels."

## Claims

### C-r2-practice-01
- claim: The Python 3.15.1 documentation states that since Python 3.14 asyncio has first-class support for free-threaded Python and that the asyncio implementation is safe to use in a multi-threaded environment.
- kind: behaviour
- questions: Q22 · load-bearing: yes (baseline for what changes for asyncio)
- support: S-r2-practice-06/P2 · rung 1 · fit direct · upstream self
- scope: Python 3.14+ free-threaded builds; attributed to the CPython docs; extends C-r1-practice-22
- confidence: high · flags: vendor-about-itself
- conflicts: none (see the tension with S-r2-practice-02/P2 under Conflicts)

### C-r2-practice-02
- claim: Per the Python 3.15.1 docs, an asyncio event loop runs all its callbacks and Tasks in its own thread, one Task at a time, so on one event loop the Python code handling each connection still executes serially, free-threaded build or not.
- kind: behaviour
- questions: Q22 · load-bearing: yes (a single event loop gains no parallelism)
- support: S-r2-practice-02/P1 · rung 1 · fit direct · upstream self
- support: S-r2-practice-06/P3 · rung 1 · fit direct · upstream self
- scope: Python 3.15.1 docs; "free-threaded build or not" follows from S-r2-practice-06/P3, which is written about free-threaded Python
- confidence: high · flags: none
- conflicts: none

### C-r2-practice-03
- claim: The Python 3.15.1 docs state that running one event loop per thread lets the handling of different requests run in parallel across multiple CPU cores on a free-threaded build, and show each thread starting its own loop with asyncio.run().
- kind: behaviour
- questions: Q22 · load-bearing: yes (the way asyncio gains from free threading)
- support: S-r2-practice-06/P4 · rung 1 · fit direct · upstream self
- support: S-r2-practice-06/P10 · rung 1 · fit direct · upstream self
- scope: free-threaded builds, Python 3.14+
- confidence: high · flags: none
- conflicts: none

### C-r2-practice-04
- claim: The asyncio.to_thread() documentation (3.15.1) says the function is primarily intended for IO-bound functions and that, due to the GIL, it can typically only make IO-bound functions non-blocking, but for extension modules that release the GIL or Python implementations without a GIL it can also be used for CPU-bound functions.
- kind: behaviour
- questions: Q22 · load-bearing: yes (whether to_thread helps CPU-bound work)
- support: S-r2-practice-03/P1 · rung 1 · fit direct · upstream self
- support: S-r2-practice-03/P2 · rung 1 · fit direct · upstream self
- scope: 3.15.1 docs; the note names "alternative Python implementations" and does not mention free-threaded CPython explicitly
- confidence: high · flags: none
- conflicts: none

### C-r2-practice-05
- claim: The 3.15.1 "asyncio and free-threaded Python" page says off-loading CPU-bound work from asyncio to a thread pool is limited by the GIL in CPython, and that combining asyncio with threads on free-threaded Python is useful when blocking or CPU-bound code must run from an asyncio application.
- kind: interpretation
- questions: Q22 · load-bearing: yes (closest documented statement that thread off-loading of CPU-bound work gains parallelism without the GIL)
- support: S-r2-practice-06/P1 · rung 1 · fit partial · upstream self (states the GIL limit)
- support: S-r2-practice-06/P4 · rung 1 · fit partial · upstream self (states the usefulness, not a measured speedup)
- scope: attributed to the CPython docs; no passage says outright that to_thread or run_in_executor runs CPU-bound Python code in parallel on 3.14t/3.15t
- confidence: medium · flags: none
- conflicts: none

### C-r2-practice-06
- claim: loop.run_in_executor() can be used with a concurrent.futures.ThreadPoolExecutor or InterpreterPoolExecutor to run blocking code in a different OS thread without blocking the event loop's thread.
- kind: behaviour
- questions: Q22 · load-bearing: no (context for executors)
- support: S-r2-practice-02/P3 · rung 1 · fit direct · upstream self
- scope: Python 3.15.1 docs (InterpreterPoolExecutor exists from 3.14)
- confidence: high · flags: none
- conflicts: none

### C-r2-practice-07
- claim: Under free threading the Python docs still direct that each thread have its own event loop not shared across threads, that Tasks and futures created in one thread not be awaited or manipulated from another thread, and that cross-thread submission use asyncio.run_coroutine_threadsafe() or loop.call_soon_threadsafe().
- kind: behaviour
- questions: Q22 · load-bearing: yes (thread-safety rules that still apply)
- support: S-r2-practice-06/P6 · rung 1 · fit direct · upstream self
- support: S-r2-practice-06/P7 · rung 1 · fit direct · upstream self
- support: S-r2-practice-06/P11 · rung 1 · fit direct · upstream self
- scope: Python 3.15.1 docs, free-threaded builds
- confidence: high · flags: none
- conflicts: none

### C-r2-practice-08
- claim: The Python docs state that asyncio synchronization primitives such as asyncio.Lock and asyncio.Event are not designed for use across threads, that threading primitives should be used to synchronize between threads, and that asyncio.Queue is only safe within a single event loop, so queue.Queue should be used to hand work between a plain thread and an event loop.
- kind: behaviour
- questions: Q22 · load-bearing: yes (thread-safety rules that still apply)
- support: S-r2-practice-06/P8 · rung 1 · fit direct · upstream self
- support: S-r2-practice-06/P9 · rung 1 · fit direct · upstream self
- scope: Python 3.15.1 docs, free-threaded builds
- confidence: high · flags: none
- conflicts: none

### C-r2-practice-09
- claim: The asyncio developer guide (3.15.1) states that almost all asyncio objects are not thread safe, which matters when code works with them from outside a Task or callback.
- kind: behaviour
- questions: Q22 · load-bearing: yes (thread-safety rules that still apply)
- support: S-r2-practice-02/P2 · rung 1 · fit direct · upstream self
- scope: Python 3.15.1 docs; the passage is not specific to the free-threaded build
- confidence: high · flags: none
- conflicts: S-r2-practice-06/P2 "the implementation of asyncio is safe to use in a multi-threaded environment" (see Conflicts; likely scope: implementation internals vs sharing objects)

### C-r2-practice-10
- claim: In asyncio debug mode, many non-threadsafe asyncio APIs such as loop.call_soon() and loop.call_at() raise an exception when called from the wrong thread.
- kind: behaviour
- questions: Q22 · load-bearing: no (a tool for catching cross-thread misuse)
- support: S-r2-practice-02/P4 · rung 1 · fit direct · upstream self
- scope: Python 3.15.1 docs
- confidence: high · flags: none
- conflicts: none

### C-r2-practice-11
- claim: The Python 3.15.1 docs point to a blog post by Kumar Aditya, "Scaling asyncio on Free-Threaded Python", for the internal changes that make asyncio safe and efficient under free threading and for benchmarks of the improvements.
- kind: fact
- questions: Q22 · load-bearing: no (pointer to the only multi-loop measurement found; its numbers were not retrieved)
- support: S-r2-practice-06/P5 · rung 1 · fit direct · upstream self
- scope: the blog itself (labs.quansight.org) returned HTTP 429 to curl and WebFetch; no benchmark number is claimed here
- confidence: high · flags: none
- conflicts: none

### C-r2-practice-12
- claim: PEP 803, "abi3t": Stable ABI for Free-Threaded Builds, has status Final for Python 3.15, with a resolution dated 30-Mar-2026, and the PEP page marks itself a historical document whose canonical documentation is "Stable Application Binary Interfaces" and "Migrating to Stable ABI for free threading (abi3t)".
- kind: fact
- questions: Q23 · load-bearing: yes (PEP 803 status; bears on D-02)
- support: S-r2-practice-01/P1 · rung 1 · fit direct · upstream self
- support: S-r2-practice-01/P2 · rung 1 · fit direct · upstream self
- scope: as of access 2026-10-23
- confidence: high · flags: none
- conflicts: S-r1-practice-03/P7 "The free-threaded build does not currently support the Limited C API or the stable ABI." (D-02; see Conflicts)

### C-r2-practice-13
- claim: PEP 803 specifies that in 3.15 both GIL-enabled and free-threaded CPython builds load extensions tagged abi3t, while free-threaded builds, unlike in 3.14, do not load extensions with the abi3 filename tag (python3.15t's extension suffixes on x86_64 Linux are .cpython-315-x86_64-linux-gnu.so, .abi3t.so and .so).
- kind: behaviour
- questions: Q23 · load-bearing: yes (can an abi3 extension be used at all on 3.15t)
- support: S-r2-practice-01/P6 · rung 1 · fit direct · upstream self
- support: S-r2-practice-01/P7 · rung 1 · fit direct · upstream self
- scope: PEP 803 specification for systems with tagged .so filenames (Linux, macOS); not checked against importlib.machinery.EXTENSION_SUFFIXES of a real 3.15t
- confidence: high · flags: exceptional ("unlike in 3.14" implies 3.14t did load .abi3.so files)
- conflicts: none

### C-r2-practice-14
- claim: PEP 803 states that, before abi3t, extensions fail to build for the Stable ABI on free-threaded Python and extensions built for GIL-enabled builds of CPython fail to load or crash on free-threaded builds.
- kind: behaviour
- questions: Q23 · load-bearing: yes (what happens with a GIL-build or abi3 binary on a free-threaded interpreter)
- support: S-r2-practice-01/P4 · rung 1 · fit direct · upstream self
- scope: the situation PEP 803 describes for 3.13–3.14 free-threaded builds
- confidence: high · flags: none
- conflicts: none

### C-r2-practice-15
- claim: PEP 803 specifies that, in free-threaded builds, PyModuleDef_Init() detects extensions that use the non-free-threading Stable ABI, prints an informative message when one is loaded, and raises an exception.
- kind: behaviour
- questions: Q23 · load-bearing: yes (what the user sees when an abi3 extension is loaded on 3.15t)
- support: S-r2-practice-01/P5 · rung 1 · fit direct · upstream self
- scope: PEP 803 design for 3.15 free-threaded builds; the PEP says the check relies on internal bit patterns and may be removed later; the message text was not found
- confidence: medium · flags: none
- conflicts: none

### C-r2-practice-16
- claim: PEP 803 encourages extension authors to compile for abi3 and abi3t at once and tag the wheel abi3.abi3t; a wheel tagged cp315-abi3.abi3t is compatible with 3.15, 3.16 and later, and installers should allow abi3t-tagged wheels for free-threaded builds wherever they allow abi3 wheels for non-free-threaded builds.
- kind: behaviour
- questions: Q23 · load-bearing: yes (how abi3t changes dependency installs)
- support: S-r2-practice-01/P3 · rung 1 · fit direct · upstream self
- support: S-r2-practice-01/P9 · rung 1 · fit direct · upstream self
- support: S-r2-practice-01/P8 · rung 1 · fit direct · upstream self
- scope: CPython 3.15+; installer adoption not verified
- confidence: high · flags: none
- conflicts: none

### C-r2-practice-17
- claim: PEP 803 states that the existing Stable ABI abi3 3.x remains compatible with GIL-enabled CPython 3.x or above.
- kind: behaviour
- questions: Q23 · load-bearing: yes (an abi3 wheel serves only GIL-enabled builds)
- support: S-r2-practice-01/P11 · rung 1 · fit direct · upstream self
- scope: PEP 803 (as amended by PEP 703)
- confidence: high · flags: none
- conflicts: none

### C-r2-practice-18
- claim: The Python Free-Threading Guide states that free-threaded CPython 3.13 and 3.14 do not support the Limited API, so their extensions need version-specific wheels and an ordinary abi3 extension stays limited to GIL-enabled builds, while CPython 3.15's abi3t lets a qualifying extension publish one wheel for both GIL-enabled and free-threaded 3.15+; extensions that cannot target abi3t should publish version-specific free-threaded wheels.
- kind: behaviour
- questions: Q23 · load-bearing: yes (abi3 wheels on 3.14t/3.15t)
- support: S-r2-practice-07/P1 · rung 2 · fit direct · upstream PEP 803 (shared author; not independent of S-r2-practice-01)
- support: S-r2-practice-07/P2 · rung 2 · fit direct · upstream PEP 803
- support: S-r2-practice-07/P3 · rung 2 · fit direct · upstream PEP 803
- scope: guide page updated 2026-10-12
- confidence: high · flags: none
- conflicts: none

### C-r2-practice-19
- claim: PEP 803 states that abi3t makes it possible to build extensions that load on free-threaded Python, but not necessarily extensions that are thread-safe without a GIL.
- kind: behaviour
- questions: Q23 · load-bearing: no (caveat on abi3t)
- support: S-r2-practice-01/P10 · rung 1 · fit direct · upstream self
- scope: PEP 803
- confidence: high · flags: none
- conflicts: none

### C-r2-practice-20
- claim: The Python Free-Threading Guide suggests that when a package's dependency does not support free threading, the package may be able to switch to a fork that does.
- kind: behaviour
- questions: Q23 · load-bearing: no (one coping option)
- support: S-r2-practice-04/P1 · rung 1 · fit direct · upstream self (the guide's own advice; attributed)
- scope: guide page updated 2026-06-28; the linked detailed guidance page was not opened
- confidence: medium · flags: none
- conflicts: none

### C-r2-practice-21
- claim: The Python Free-Threading Guide states that a newly spawned thread inherits a copy of the spawning thread's contextvars context on the free-threaded build, where PYTHON_THREAD_INHERIT_CONTEXT is enabled by default, but starts from each variable's default on the GIL-enabled build.
- kind: behaviour
- questions: Q22 · load-bearing: no (a behaviour difference relevant to thread-plus-asyncio code)
- support: S-r2-practice-04/P2 · rung 1 · fit partial · upstream CPython docs (not opened; community guide, so attribute it)
- scope: free-threaded vs GIL-enabled builds, 3.14+
- confidence: medium · flags: none
- conflicts: none

## Conflicts
- C-r2-practice-12 (bears on D-02): S-r2-practice-01/P1 says PEP 803 is "Final" for Python-Version 3.15 with resolution 30-Mar-2026, and S-r2-practice-01/P2 calls the PEP historical, with canonical docs "Migrating to Stable ABI for free threading (abi3t)"; S-r1-practice-03/P7 (3.15.1 C-extension HOWTO) says "The free-threaded build does not currently support the Limited C API or the stable ABI." S-r2-practice-07/P2 (guide, updated 2026-10-12, shares an author with PEP 803) says "CPython 3.15 adds a separate Stable ABI named abi3t." Not settled; the 3.15 C-API docs page "Stable Application Binary Interfaces" was not opened.
- C-r2-practice-09: S-r2-practice-02/P2 says "Almost all asyncio objects are not thread safe"; S-r2-practice-06/P2 says "the implementation of asyncio is safe to use in a multi-threaded environment". Both in the 3.15.1 docs; possibly scope (internal implementation vs sharing objects across threads, which S-r2-practice-06/P6–P8 still forbid); not settled.

## Speculation and flags
- C-r2-practice-13: exceptional, "Free-threaded builds will – unlike in 3.14 – not load extensions with the abi3 tag" implies 3.14t's extension suffixes included .abi3.so, which fits PEP 803's "fail to load (or crash)" wording; needs a second source (3.14 importlib docs or a 3.14t EXTENSION_SUFFIXES listing).
- C-r2-practice-01: vendor-about-itself, "first-class support" is CPython describing its own asyncio.
- C-r2-practice-05: the CPU-bound-off-loading gain is the docs' own framing, not a measurement.

## Unused leads
- https://labs.quansight.org/blog/scaling-asyncio-on-free-threaded-python — Kumar Aditya's post with multi-loop asyncio benchmarks; HTTP 429 to curl and WebFetch; vendor engineering post, attribute it
- https://docs.python.org/3/c-api/stable.html — "Stable Application Binary Interfaces", the canonical abi3t docs that would settle D-02
- the 3.15 HOWTO "Migrating to Stable ABI for free threading (abi3t)" — canonical abi3t migration doc
- py-free-threading.github.io guidance "Handling dependencies that don't support free-threading" (linked from S-r2-practice-04 and -07, URL not resolved) — likely covers pip building from sdist and PYTHON_GIL=0 workarounds
- packaging.python.org platform compatibility tags spec — whether installers (pip) accept abi3 for cp31Xt; not opened

## Queries
- "\"asyncio and free-threaded Python\" docs.python.org" → useful
