# Findings: 20261023-0350-free-threaded-cpython · round 1 · angle criticism
- researcher: claude-opus-5-5 · status: complete (hard cap of 30 tool calls overrun; see return) · tool calls: 48

## Questions
- Q9: answered — claims: C-r1-criticism-01, -02, -03, -04, -05, -06, -07, -08, -09, -10, -11, -12, -13, -14, -15, -16, -17, -18, -19, -21 — note: rung-1 per-type guarantees from docs.python.org "Thread Safety Guarantees" (3.15.1); "GIL hid races" interpretation has two independent rung-2 sources (Quansight guide; LWN reporting Wouters).
- Q12: answered — claims: C-r1-criticism-10, -20, -22, -23, -24, -25, -26, -27, -28, -29, -30, -31, -32, -33, -34 — note: refcount-contention pitfall rests on rung-1 docs for the mechanism plus rung-2 LWN (attributed) and a rung-3 forum thread for the practical symptom; crash reports are only pointers (unused leads).
- Q15: answered — claims: C-r1-criticism-35, -36, -37, -38, -39, -40, -41, -42, -43, -44 — note: all from the py-free-threading guide (Quansight) and the pytest-run-parallel README; no independent rung-2 evaluation of the tools.

## Sources

### S-r1-criticism-01
- url: https://docs.python.org/3/howto/free-threading-python.html · canonical: docs.python.org/3/howto/free-threading-python.html
- title: Python support for free threading · authors: n/a · publisher: Python Software Foundation (docs.python.org)
- date: last updated Oct 22, 2026 · version: Python 3.15.1 documentation
- accessed: 2026-10-23 · read-via: curl · quote-match: exact · archive: none
- kind: official docs · peer-review: n/a
- owner: Python Software Foundation / CPython core developers · upstream: none
- lateral: official CPython HOWTO; links to PEP 703 and the community guide py-free-threading.github.io.
- passages:
  - P1 · § "Thread safety": "The free-threaded build of CPython aims to provide similar thread-safety behavior at the Python level to the default GIL-enabled build. Built-in types like dict, list, and set use internal locks to protect against concurrent modifications in ways that behave similarly to the GIL."
  - P2 · § "Thread safety": "It's recommended to use the threading.Lock or other synchronization primitives instead of relying on the internal locks of built-in types, when possible."
  - P3 · § "Iterators": "It is generally not thread-safe to access the same iterator object from multiple threads concurrently, and threads may see duplicate or missing elements."
  - P4 · § "Context variables": "In the free-threaded build, the flag thread_inherit_context is set to true by default which causes threads created with threading.Thread to start with a copy of the Context() of the caller of start(). In the default GIL-enabled build, the flag defaults to false so threads start with an empty Context()."
  - P5 · § "Warning filters": "If the flag is true then the warnings.catch_warnings context manager uses a context variable for warning filters. If the flag is false then catch_warnings modifies the global filters list, which is not thread-safe."
  - P6 · § "Frame objects": "It is not safe to access frame.f_locals from a frame object if that frame is currently executing in another thread, and doing so may crash the interpreter."
  - P7 · § "Immortalization": "In the free-threaded build, some objects are immortal. Immortal objects are not deallocated and have reference counts that are never modified. This is done to avoid reference count contention that would prevent efficient multi-threaded scaling."
  - P8 · § "Immortalization": "As of the 3.14 release, immortalization is limited to:"
  - P9 · § "Increased memory usage": "The free-threaded build will typically use more memory compared to the default build. There are multiple reasons for this, mostly due to design decisions."
  - P10 · § "All interned strings are immortal": "This is not the case for the free-threaded build and any interned string will become immortal, surviving until interpreter shutdown."
  - P11 · § "Non-GC objects have a larger object header": "For example, on the AMD64 platform, None uses 32 bytes on the free-threaded build vs 16 bytes for the default build."
  - P12 · § "QSBR can delay freeing of memory": "Running gc.collect() should cause all memory being held by QSBR to be actually freed. Note that even when QSBR frees the memory, the underlying memory allocator may not immediately return that memory to the OS and so the resident set size (RSS) of the process might not decrease."
  - P13 · § "mimalloc allocator vs pymalloc": "The free-threaded build does not use pymalloc and allocates all Python objects using the “mimalloc” allocator."
  - P14 · § "mimalloc allocator vs pymalloc": "You can reduce that delay by setting the environment variable MIMALLOC_PURGE_DELAY to 0. Note that this will likely reduce the performance of the allocator."
  - P15 · § "Per-thread reference counting can delay freeing objects": "To avoid contention on the reference count fields of frequently shared objects, the free-threaded build also uses “per-thread reference counting” for a few selected object types."
  - P16 · § "Per-thread reference counting can delay freeing objects": "Because the per-thread counts must be merged back to the object before it can be deallocated, objects using per-thread reference counting are typically freed later than they would be in the default build."
  - P17 · § "The global interpreter lock in free-threaded Python": "The GIL may also automatically be enabled when importing a C-API extension module that is not explicitly marked as supporting free threading. A warning will be printed in this case."

### S-r1-criticism-02
- url: https://py-free-threading.github.io/porting/ · canonical: py-free-threading.github.io/porting/
- title: Porting Python Packages to Support Free-Threading · authors: not printed (Quansight Labs & open source contributors) · publisher: Python Free-Threading Guide
- date: created July 10, 2024; updated June 28, 2026 · version: n/a
- accessed: 2026-10-23 · read-via: curl · quote-match: exact · archive: none
- kind: official docs (community guide) · peer-review: n/a (edited via GitHub PRs)
- owner: Quansight Labs (funded work on free-threading ecosystem; Meta also funds) · upstream: none
- lateral: linked from docs.python.org HOWTO as the community-maintained installation guide; LWN (S-09) reports Wouters recommending it. Ranked rung 2 for interpretive claims (expert guide by people doing the porting), rung 1 for what it advises. Lead may rank differently.
- passages:
  - P1 · § "Thread Safety of Pure Python Code": "The CPython interpreter protects you from low-level memory unsafety due to data races. It does not protect you from introducing thread safety issues due to race conditions."
  - P2 · § "Multithreaded Python Programming": "Many pure Python operations are not atomic and are susceptible to race conditions, or only appear to be thread-safe in the GIL-enabled build because of details of how CPython releases the GIL in a round-robin fashion to allow threads to run."
  - P3 · § "Dealing with thread-unsafe objects": "In the GIL-enabled build, in many cases, you can get away with mutating a shared object safely. This is true so long as whatever mutation you are attempting to do is fast enough that a thread switch is very unlikely to happen while you are doing work."
  - P4 · § "Dealing with thread-unsafe objects": "On both the free-threaded and GIL-enabled build, you will see the output of this script randomly vary."
  - P5 · § "Dealing with thread-unsafe objects": "If you replace RaceyCounter with SafeCounter in the script above, it will always output 1000."
  - P6 · § "Dealing with mutable global state": "The most common source of thread safety issues in Python packages is use of global mutable state. Many projects use module-level or class-level caches to speed up execution but do not envision filling the cache simultaneously from multiple threads."
  - P7 · § "Dealing with mutable global state": "If do_calculation is called simultaneously in multiple threads, then it is possible for at least two threads to see that global_cache doesn't have the cached key and call _do_expensive_calculation."
  - P8 · § "Converting global state to context-local or thread-local state": "One way to remove a race on mutable global state is to stop sharing it and give each unit of execution its own copy."
  - P9 · § "Locking": "Note that acquiring the same lock recursively leads to deadlocks. Also, in general, it is possible to create a deadlock in any program with more than one lock."
  - P10 · § "Why do projects need updates?": "Failing to produce deterministic results on the free-threaded build, and possibly not being deterministic with the GIL either."
  - P11 · § "Why do projects need updates?": "Crashing the interpreter in multithreaded use if C extensions are involved, in ways that are impossible on the GIL-enabled build."
  - P12 · § "Why do projects need updates?": "This means many codebases have threading bugs that up until now have only been theoretical or present in niche use cases."
  - P13 · § "Copy-on-Write": "This code is thread-safe because the shared global cache is never modified in-place."

### S-r1-criticism-03
- url: https://py-free-threading.github.io/testing/ · canonical: py-free-threading.github.io/testing/
- title: Validating thread safety with testing · authors: not printed · publisher: Python Free-Threading Guide (Quansight Labs & open source contributors)
- date: created March 14, 2025; updated May 14, 2026 · version: n/a
- accessed: 2026-10-23 · read-via: curl · quote-match: exact · archive: none
- kind: official docs (community guide) · peer-review: n/a
- owner: Quansight Labs · upstream: none
- lateral: same owner as S-02, S-05, S-06, S-07 (Quansight also maintains pytest-run-parallel); not independent of them.
- passages:
  - P1 · § "Validating thread safety with testing": "Run the test suite for your project and fix any failures that occur only with the GIL disabled."
  - P2 · § "Validating thread safety with testing": "You can call sys.setswitchinterval before running multithreaded tests to force Python to release the GIL more often than the default configuration. This can expose thread safety issues that the GIL is masking."
  - P3 · § "Validating thread safety with testing": "You can look at pytest-run-parallel as well as pytest-freethreaded, which both offer pytest plugins to enable running tests in an existing pytest test suite simultaneously in many threads, with the goal of validating thread safety. unittest-ft offers similar functionality for running unittest-based tests in parallel."
  - P4 · § "Validating thread safety with testing": "These plugins are useful for discovering issues related to use of global state, but cannot discover issues from multithreaded use of data structures defined by your library."
  - P5 · § "Validating thread safety with testing": "Tests that fail due to thread safety issues are inherently flaky. You should not be surprised to see tests that pass or fail randomly, or even fail a very small percentage of the time."
  - P6 · § "Validating thread safety with testing": "Adding a threading.Barrier before a line of code that you suspect will trigger a race condition is a good way to synchronize workers and increase the chances that an infrequent test failure will trigger."
  - P7 · § "pytest is not thread-safe": "While tests can manage their own threads, you should not assume that functionality provided by pytest is thread-safe."
  - P8 · § "pytest is not thread-safe": "The monkeypatch fixture, since monkeypatching inherently modifies global state in a class or module."
  - P9 · § "Configure timeouts to avoid hanging tests": "With free-threading and pytest-run-parallel deadlocks and hangs are more likely. You can make use of pytest-timeout to set a timeout in your test job."
  - P10 · § "Validating thread safety with testing": "Generally, global mutable state is not safe in the free-threaded build without some form of locking."

### S-r1-criticism-04
- url: https://docs.python.org/3/library/threadsafety.html · canonical: docs.python.org/3/library/threadsafety.html
- title: Thread Safety Guarantees · authors: n/a · publisher: Python Software Foundation (docs.python.org)
- date: last updated Oct 22, 2026 · version: Python 3.15.1 documentation
- accessed: 2026-10-23 · read-via: curl · quote-match: exact · archive: none
- kind: official docs · peer-review: n/a
- owner: Python Software Foundation / CPython core developers · upstream: none
- lateral: official reference page; search results show translations also under /builtins/threadsafety.html and a 3.14 version (ja/3.14), so the page exists at least from 3.14 docs; content checked here is 3.15.1 only.
- passages:
  - P1 · § "Thread Safety Guarantees": "This page documents thread-safety guarantees for built-in types in Python’s free-threaded build. The guarantees described here apply when using Python with the GIL disabled (free-threaded mode). When the GIL is enabled, most operations are implicitly serialized."
  - P2 · § "Thread safety for list objects": "Writing a single item via lst[i] = x is safe to call from multiple threads and will not corrupt the list."
  - P3 · § "Thread safety for list objects": "lst.append(x) # append to the end of the list, no shifting required"
  - P4 · § "Thread safety for list objects": "The sort() method is not atomic. Other threads cannot observe intermediate states during sorting, but the list appears empty for the duration of the sort."
  - P5 · § "Thread safety for list objects": "Operations that involve multiple accesses, as well as iteration, are never atomic. For example:"
  - P6 · § "Thread safety for list objects": "Consider external synchronization when sharing list instances across threads."
  - P7 · § "Thread safety for dict objects": "The following operations and functions are lock-free and atomic."
  - P8 · § "Thread safety for dict objects": "Writing or removing a single item is safe to call from multiple threads and will not corrupt the dictionary:"
  - P9 · § "Thread safety for dict objects": "These operations may compare keys using __eq__(), which can execute arbitrary Python code. During such comparisons, the dictionary may be modified by another thread. For built-in types like str, int, and float, that implement __eq__() in C, the underlying lock is not released during comparisons and this is not a concern."
  - P10 · § "Thread safety for dict objects": "To avoid time-of-check to time-of-use (TOCTOU) issues, use atomic operations or handle exceptions:"
  - P11 · § "Thread safety for dict objects": "To safely iterate over a dictionary that may be modified by another thread, iterate over a copy:"
  - P12 · § "Thread safety for set objects": "Adding or removing a single element is safe to call from multiple threads and will not corrupt the set:"
  - P13 · § "Thread safety for list objects": "lst.insert(idx, item) # shifts elements"
  - P14 · § "Thread safety for list objects": "The following operations may allow lock-free operations to observe intermediate states since they modify multiple elements in place:"
  - P15 · § "Thread safety for list objects": "Reading a single element from a list is atomic:"

### S-r1-criticism-05
- url: https://py-free-threading.github.io/thread_sanitizer/ · canonical: py-free-threading.github.io/thread_sanitizer/
- title: Using Thread Sanitizer to validate and test thread safety · authors: not printed · publisher: Python Free-Threading Guide
- date: not seen on the converted text · version: n/a (instructions target the 3.14 branch)
- accessed: 2026-10-23 · read-via: curl · quote-match: exact · archive: none
- kind: official docs (community guide) · peer-review: n/a
- owner: Quansight Labs · upstream: none
- lateral: same owner as S-02/S-03.
- passages:
  - P1 · § "Using Thread Sanitizer to validate and test thread safety": "Thread Sanitizer specializes in finding data races, a form of undefined behavior that is possible in low-level multithreaded code. While Rust has compile-time guarantees to prevent most data races, C and C++ do not prevent data races from occurring, and in practice many C and C++ extensions exhibit data races while adding support for the free-threaded build."
  - P2 · § "Compile free-threaded CPython with TSan": "CC=/path/to/clang CXX=/path/to/clang++ ./configure --disable-gil --with-thread-sanitizer --prefix"

### S-r1-criticism-06
- url: https://py-free-threading.github.io/debugging/ · canonical: py-free-threading.github.io/debugging/
- title: Debugging thread safety issues · authors: not printed · publisher: Python Free-Threading Guide
- date: created July 25, 2024; updated April 21, 2026 · version: n/a
- accessed: 2026-10-23 · read-via: curl · quote-match: exact · archive: none
- kind: official docs (community guide) · peer-review: n/a
- owner: Quansight Labs · upstream: none
- lateral: same owner as S-02/S-03.
- passages:
  - P1 · § "Debugging thread safety issues": "The new free-threaded model ensures that Python code access originating from other Python code frames is safe and is guaranteed not to produce any major interpreter crash, as opposed to unrestricted C code access, which can present any of the common C thread-safety issues."
  - P2 · § "Repeated test execution": "Given the non-deterministic nature of parallel execution, tests for code that has a concurrency issue may still pass most of the time. In order to more reliably reproduce a test failure under concurrency, we recommend using pytest-repeat, which enables the --count flag in the pytest command:"
  - P3 · § "Repeated test execution": "PYTHON_GIL=0 pytest -x -v --count=100 test_concurrent.py"
  - P4 · § "Using AddressSanitizer to detect thread safety issues": "Since ThreadSanitizer adds significant overhead to both the Python interpreter and any native code compiled under ThreadSanitizer, many projects will be unable to run their full test suite under ThreadSanitizer in CI."

### S-r1-criticism-07
- url: https://github.com/Quansight-Labs/pytest-run-parallel · canonical: github.com/Quansight-Labs/pytest-run-parallel
- title: pytest-run-parallel (repository README) · authors: Quansight Labs · publisher: GitHub
- date: README as of access (no date printed) · version: main branch README, unpinned
- accessed: 2026-10-23 · read-via: curl · quote-match: exact · archive: none
- kind: official docs (project README) · peer-review: n/a
- owner: Quansight Labs · upstream: none
- lateral: plugin maintained by the same organization that writes the guide (S-02/S-03); rung 1 only for what the plugin does.
- passages:
  - P1 · § "pytest-run-parallel": "The main goal of pytest-run-parallel is to discover thread-safety issues that could exist when using C libraries"
  - P2 · § "Features": "--parallel-threads to run a test suite in parallel"
  - P3 · § "Features": "--iterations to run multiple times in each thread"
  - P4 · § "Features": "pytest.mark.thread_unsafe to mark a single test to run in a single thread."
  - P5 · § "Usage": "$ pytest --parallel-threads=10 --iterations=10 tests"

### S-r1-criticism-08
- url: https://discuss.python.org/t/slower-performance-with-disable-gil-on-threaded-nearest-neighbor-benchmark-10m-points/95365 · canonical: discuss.python.org/t/slower-performance-with-disable-gil-on-threaded-nearest-neighbor-benchmark-10m-points/95365
- title: Slower performance with --disable-gil on threaded nearest-neighbor benchmark (10M points) · authors: thread; replies by Thomas Wouters, Neil Schemenauer, Oscar Benjamin, others · publisher: Discussions on Python.org
- date: June 13–16, 2025 · version: Python 3.14.0b2
- accessed: 2026-10-23 · read-via: curl · quote-match: exact · archive: none
- kind: forum · peer-review: no
- owner: Python Software Foundation (forum host); posts are individual · upstream: none
- lateral: Wouters and Schemenauer are CPython core developers (LWN S-09 confirms Wouters' role); still a forum, rung 3: pointer only.
- passages:
  - P1 · § "Environment" (thomas, post 3): "If contention is the issue you’d see very bad scaling (or even negative scaling) as you ramp up threads. I don’t think we have ready to use tools to detect refcount contention at this point, but it’s something that’s being looked at."
  - P2 · § "Firefox Profiler" (nas, post 12): "The Py_DecRefShared is sort of bad news too. It happens when reference counts are being manipulated by multiple threads. This is expected behavior due to how the biased reference counting works but is not optimal if you want best performance. Ideally the hot loops of your code are dealing with thread local data and not data shared with other threads."
  - P3 · § "Results" (basileMarchand, post 1): "Python GIL OFF"

### S-r1-criticism-09
- url: https://lwn.net/Articles/1078367/ · canonical: lwn.net/Articles/1078367/
- title: Free-threaded Python: past, present, and future · authors: Jake Edge · publisher: LWN.net
- date: June 22, 2026 · version: n/a (talk at PyCon US 2026)
- accessed: 2026-10-23 · read-via: curl · quote-match: exact · archive: none
- kind: news · peer-review: n/a (editorial control)
- owner: LWN.net (Eklektix) · upstream: talk by Thomas Wouters, PyCon US 2026
- lateral: LWN is an independent, edited Linux/open-source news outlet; the article reports Wouters, a CPython core developer and steering council member who works at Meta on the free-threaded interpreter (stake noted in the article itself). Claims from it are written attributed to Wouters.
- passages:
  - P1 · § "Motivation": "The GIL does not protect a user's Python code because the user does not have control over when the interpreter releases and reacquires the GIL."
  - P2 · § "Status": "For regular Python code, there is probably not much—or anything—that needs to be done. Unless there are already multi-threading bugs in the code, however, since the free-threaded version will make them more likely to occur."
  - P3 · § article body: "The end result is that … in free-threaded Python, thread semantics are almost the same as in GIL-ful Python"
  - P4 · § article body: "Having many threads accessing the same objects is a problem that Python cannot solve directly. … Sharing objects between threads is still problematic for performance."
  - P5 · § article body: "That can be worked around with a flag to always disable the GIL, … but that is playing with fire, so you probably only want to do that for testing"
  - P6 · § "Status": "It had thread-safety issues and some scalability problems, where adding more threads could make things go slower."
  - P7 · § article body: "Adding some multi-threaded tests is also a good idea, Wouters said; … if you have threading bugs, they will show up, because you no longer have the GIL accidentally protecting you some of the time"

### S-r1-criticism-10
- url: https://docs.python.org/3/faq/library.html · canonical: docs.python.org/3/faq/library.html
- title: Library and Extension FAQ · authors: n/a · publisher: Python Software Foundation (docs.python.org)
- date: current docs at access (3.15.x) · version: Python 3 docs, current
- accessed: 2026-10-23 · read-via: curl · quote-match: exact · archive: none
- kind: official docs · peer-review: n/a
- owner: Python Software Foundation · upstream: none
- lateral: official FAQ; this answer describes the GIL-enabled build (it says "only one thread runs in the Python VM at a time").
- passages:
  - P1 · § "What kinds of global value mutation are thread-safe?": "In practice, it means that operations on shared variables of built-in data types (ints, lists, dicts, etc) that “look atomic” really are."
  - P2 · § "What kinds of global value mutation are thread-safe?": "These aren’t:"
  - P3 · § "What kinds of global value mutation are thread-safe?": "D[x] = D[x] + 1"
  - P4 · § "What kinds of global value mutation are thread-safe?": "When in doubt, use a mutex!"
  - P5 · § "What kinds of global value mutation are thread-safe?": "i = i+1"

### S-r1-criticism-11
- url: https://docs.python.org/3.13/howto/free-threading-python.html · canonical: docs.python.org/3.13/howto/free-threading-python.html
- title: Python experimental support for free threading · authors: n/a · publisher: Python Software Foundation
- date: current 3.13 docs at access · version: Python 3.13.17 documentation
- accessed: 2026-10-23 · read-via: curl · quote-match: exact · archive: none
- kind: official docs · peer-review: n/a
- owner: Python Software Foundation · upstream: none
- lateral: 3.13 edition of S-01; useful for what changed between versions.
- passages:
  - P1 · § "Iterators": "Sharing the same iterator object between multiple threads is generally not safe and threads may see duplicate or missing elements when iterating or crash the interpreter."
  - P2 · § "Single-threaded performance": "The largest impact is because the specializing adaptive interpreter (PEP 659) is disabled in the free-threaded build. We expect to re-enable it in a thread-safe way in the 3.14 release."
  - P3 · § "Python experimental support for free threading": "The free-threaded mode is experimental and work is ongoing to improve it: expect some bugs and a substantial single-threaded performance hit."
  - P4 · § "Frame objects": "This means that sys._current_frames() is generally not safe to use in a free-threaded build."

## Claims

### C-r1-criticism-01
- claim: The Python 3.15.1 documentation says the free-threaded build aims to provide thread-safety behavior at the Python level similar to the GIL-enabled build, with built-in dict, list and set using internal locks against concurrent modification.
- kind: behaviour · questions: Q9 · load-bearing: yes (the baseline guarantee readers rely on)
- support: S-r1-criticism-01/P1 · rung 1 · fit direct · upstream self
- scope: CPython free-threaded build, docs version 3.15.1
- confidence: high · flags: none
- conflicts: none

### C-r1-criticism-02
- claim: The CPython free-threading HOWTO recommends using threading.Lock or other synchronization primitives rather than relying on the internal locks of built-in types, when possible.
- kind: fact · questions: Q9 · load-bearing: yes (when locks are needed)
- support: S-r1-criticism-01/P2 · rung 1 · fit direct · upstream self
- scope: docs version 3.15.1
- confidence: high · flags: none
- conflicts: none

### C-r1-criticism-03
- claim: In the free-threaded build, the Thread Safety Guarantees page documents that reading a single list element (lst[i]) is atomic, that lst.append(x) is atomic, and that writing a single item via lst[i] = x from multiple threads will not corrupt the list.
- kind: behaviour · questions: Q9 · load-bearing: yes
- support: S-r1-criticism-04/P15 · rung 1 · fit direct · upstream self
- support: S-r1-criticism-04/P3 · rung 1 · fit direct · upstream self
- support: S-r1-criticism-04/P2 · rung 1 · fit direct · upstream self
- scope: free-threaded build with the GIL disabled; docs 3.15.1 (S-04/P1 says the guarantees apply with the GIL disabled)
- confidence: high · flags: none
- conflicts: none

### C-r1-criticism-04
- claim: The Thread Safety Guarantees page states that list, dict and set operations that involve multiple accesses (read-modify-write such as lst[i] = lst[i] + 1, check-then-act such as "if key in d: del d[key]") and iteration are never atomic in the free-threaded build, and advises external synchronization when sharing such instances across threads.
- kind: behaviour · questions: Q9 · load-bearing: yes (core "what is not guaranteed")
- support: S-r1-criticism-04/P5 · rung 1 · fit direct · upstream self
- support: S-r1-criticism-04/P6 · rung 1 · fit direct · upstream self
- scope: free-threaded build, docs 3.15.1; the same "never atomic" sentence is repeated for list, dict and set sections
- confidence: high · flags: none
- conflicts: none

### C-r1-criticism-05
- claim: In the free-threaded build, dict reads d[key], d.get(key), key in d and len(d) are documented as lock-free and atomic, and writing or removing a single item (d[key] = value, del d[key], d.pop, d.setdefault) from multiple threads will not corrupt the dictionary.
- kind: behaviour · questions: Q9 · load-bearing: yes
- support: S-r1-criticism-04/P7 · rung 1 · fit direct · upstream self
- support: S-r1-criticism-04/P8 · rung 1 · fit direct · upstream self
- scope: docs 3.15.1, GIL disabled
- confidence: high · flags: none
- conflicts: none

### C-r1-criticism-06
- claim: To avoid time-of-check-to-time-of-use races on a shared dict in the free-threaded build, the docs advise atomic operations such as d.pop(key, None) or handling KeyError, and iterating over a copy (d.copy().items()) when another thread may modify the dict.
- kind: fact · questions: Q9 · load-bearing: yes (practical remedy)
- support: S-r1-criticism-04/P10 · rung 1 · fit direct · upstream self
- support: S-r1-criticism-04/P11 · rung 1 · fit direct · upstream self
- scope: docs 3.15.1
- confidence: high · flags: none
- conflicts: none

### C-r1-criticism-07
- claim: In the free-threaded build, adding or removing a single set element (add, remove, discard, pop) from multiple threads is documented not to corrupt the set.
- kind: behaviour · questions: Q9 · load-bearing: no (detail of C-04/C-05 pattern)
- support: S-r1-criticism-04/P12 · rung 1 · fit direct · upstream self
- scope: docs 3.15.1
- confidence: high · flags: none
- conflicts: none

### C-r1-criticism-08
- claim: The docs warn that dict operations comparing keys with __eq__() can run arbitrary Python code, during which another thread may modify the dictionary; for built-in key types str, int and float, whose __eq__() is implemented in C, the lock is not released and this is not a concern.
- kind: behaviour · questions: Q9 · load-bearing: no (edge case for custom key classes)
- support: S-r1-criticism-04/P9 · rung 1 · fit direct · upstream self
- scope: docs 3.15.1, free-threaded build
- confidence: high · flags: none
- conflicts: none

### C-r1-criticism-09
- claim: In the free-threaded build, list.sort() is documented as not atomic: other threads cannot observe intermediate states, but the list appears empty to them for the duration of the sort; and lst.insert() may let lock-free readers observe intermediate states.
- kind: behaviour · questions: Q9 · load-bearing: no (surprising detail)
- support: S-r1-criticism-04/P4 · rung 1 · fit direct · upstream self
- support: S-r1-criticism-04/P14 · rung 1 · fit direct · upstream self
- support: S-r1-criticism-04/P13 · rung 1 · fit direct · upstream self
- scope: docs 3.15.1
- confidence: high · flags: exceptional (contrasts with the GIL-build FAQ, which lists L.sort() as atomic; different builds, see Conflicts)
- conflicts: S-r1-criticism-10 lists "L.sort()" among atomic operations for the GIL-enabled build (scope difference, not same build; line not quoted as a passage)

### C-r1-criticism-10
- claim: Accessing the same iterator object from multiple threads concurrently is generally not thread-safe in the free-threaded build, and threads may see duplicate or missing elements; the Python 3.13 edition of the HOWTO additionally warned it could crash the interpreter, a warning absent from the 3.15.1 edition.
- kind: behaviour · questions: Q9, Q12 · load-bearing: yes (shared-iterator pitfall)
- support: S-r1-criticism-01/P3 · rung 1 · fit direct · upstream self
- support: S-r1-criticism-11/P1 · rung 1 · fit direct · upstream self
- scope: 3.15.1 docs (duplicates/missing); 3.13.17 docs (also crash)
- confidence: high · flags: none
- conflicts: version/time difference between S-11/P1 and S-01/P3 (see Conflicts)

### C-r1-criticism-11
- claim: The Quansight-maintained free-threading porting guide states that the CPython interpreter protects against low-level memory unsafety from data races but not against race conditions in the user's own code.
- kind: interpretation · questions: Q9 · load-bearing: yes (frames the whole "what changes" answer)
- support: S-r1-criticism-02/P1 · rung 2 · fit direct · upstream self
- scope: free-threaded CPython, pure Python code (guide updated June 2026)
- confidence: high · flags: none
- conflicts: none

### C-r1-criticism-12
- claim: The Python Library FAQ, describing the GIL-enabled build, says operations on built-in types that "look atomic" really are because each bytecode instruction is atomic, but lists i = i+1 and D[x] = D[x] + 1 as not atomic and advises "When in doubt, use a mutex!".
- kind: behaviour · questions: Q9 · load-bearing: yes (shows read-modify-write was never safe even with the GIL)
- support: S-r1-criticism-10/P1 · rung 1 · fit direct · upstream self
- support: S-r1-criticism-10/P2 · rung 1 · fit direct · upstream self
- support: S-r1-criticism-10/P5 · rung 1 · fit direct · upstream self
- support: S-r1-criticism-10/P3 · rung 1 · fit direct · upstream self
- support: S-r1-criticism-10/P4 · rung 1 · fit direct · upstream self
- scope: GIL-enabled CPython; current docs FAQ
- confidence: high · flags: none
- conflicts: none

### C-r1-criticism-13
- claim: Many pure-Python operations only appear thread-safe in the GIL-enabled build because of when CPython happens to switch threads, so the GIL masked races rather than preventing them; free threading makes such latent bugs more likely to show.
- kind: interpretation · questions: Q9 · load-bearing: yes (the "races the GIL hid" point, in the chapter's voice)
- support: S-r1-criticism-02/P2 · rung 2 · fit direct · upstream self
- support: S-r1-criticism-02/P3 · rung 2 · fit partial · upstream self
- support: S-r1-criticism-09/P1 · rung 2 · fit partial · upstream Wouters' PyCon US 2026 talk
- support: S-r1-criticism-09/P2 · rung 2 · fit direct · upstream Wouters' PyCon US 2026 talk
- support: S-r1-criticism-03/P2 · rung 2 · fit partial · upstream self (same owner as S-02; not an independent second source)
- scope: CPython, pure-Python threaded code
- confidence: medium (two independent owners: Quansight guide and LWN reporting a Meta/steering-council developer; the LWN part is a report of one person's view and should stay attributed if the lead judges it not independent enough)
- flags: none
- conflicts: none

### C-r1-criticism-14
- claim: The porting guide's RaceyCounter example (read self.value, sleep, write back) gives randomly varying results on both the free-threaded and GIL-enabled builds, while the same counter guarded by a threading.Lock always outputs 1000.
- kind: behaviour · questions: Q9 · load-bearing: no (illustration)
- support: S-r1-criticism-02/P4 · rung 1 · fit direct · upstream self
- support: S-r1-criticism-02/P5 · rung 1 · fit direct · upstream self
- scope: the guide's example with 1000 increments over 8 workers
- confidence: high · flags: none
- conflicts: none

### C-r1-criticism-15
- claim: The free-threading porting guide names global mutable state, such as module-level or class-level caches filled from several threads, as the most common source of thread-safety issues in Python packages; with a check-then-fill cache, two threads can both miss and both compute the value.
- kind: evaluation · questions: Q9 · load-bearing: yes (most likely bug in reader code)
- support: S-r1-criticism-02/P6 · rung 2 · fit direct · upstream self
- support: S-r1-criticism-02/P7 · rung 1 · fit direct · upstream self
- support: S-r1-criticism-03/P10 · rung 2 · fit partial · upstream self (same owner)
- scope: Python packages, per the guide (June 2026)
- confidence: medium (one owner; keep attributed) · flags: superlative ("most common")
- conflicts: none

### C-r1-criticism-16
- claim: The porting guide offers remedies for shared mutable state in pure Python: give each thread or task its own copy (contextvars.ContextVar or threading.local), copy-on-write replacement of a shared reference, or a threading.Lock, noting that recursive acquisition of a plain Lock deadlocks.
- kind: fact · questions: Q9 · load-bearing: no
- support: S-r1-criticism-02/P8 · rung 1 · fit direct · upstream self
- support: S-r1-criticism-02/P13 · rung 1 · fit direct · upstream self
- support: S-r1-criticism-02/P9 · rung 1 · fit direct · upstream self
- scope: porting guide, June 2026
- confidence: high · flags: none
- conflicts: none

### C-r1-criticism-17
- claim: Thomas Wouters, CPython steering council member, said at PyCon US 2026 that in free-threaded Python "thread semantics are almost the same as in GIL-ful Python".
- kind: interpretation · questions: Q9 · load-bearing: no (attributed framing)
- support: S-r1-criticism-09/P3 · rung 2 · fit direct · upstream Wouters' talk
- scope: as reported by LWN, June 22, 2026
- confidence: high · flags: vendor-about-itself (Wouters works at Meta on free threading)
- conflicts: none

### C-r1-criticism-18
- claim: In the free-threaded build, threads created with threading.Thread start with a copy of the caller's context by default (thread_inherit_context true), whereas in the GIL-enabled build they start with an empty context.
- kind: behaviour · questions: Q9 · load-bearing: no (behaviour difference)
- support: S-r1-criticism-01/P4 · rung 1 · fit direct · upstream self
- scope: docs 3.15.1
- confidence: high · flags: none
- conflicts: none

### C-r1-criticism-19
- claim: In the free-threaded build, warnings.catch_warnings uses a context variable by default (context_aware_warnings true); when that flag is false, as by default in the GIL-enabled build, catch_warnings modifies the global filters list, which is not thread-safe.
- kind: behaviour · questions: Q9, Q15 · load-bearing: no
- support: S-r1-criticism-01/P5 · rung 1 · fit direct · upstream self
- scope: docs 3.15.1
- confidence: high · flags: none
- conflicts: none

### C-r1-criticism-20
- claim: The porting guide lists, among behaviours of packages not yet updated for free threading, non-deterministic results (possibly also with the GIL) and interpreter crashes in multithreaded use when C extensions are involved.
- kind: fact · questions: Q12 · load-bearing: yes (dependency failure modes)
- support: S-r1-criticism-02/P10 · rung 1 · fit direct · upstream self
- support: S-r1-criticism-02/P11 · rung 1 · fit direct · upstream self
- scope: porting guide, June 2026
- confidence: high · flags: none
- conflicts: none

### C-r1-criticism-21
- claim: The porting guide says that because threads gave no speedup under the GIL, many codebases have threading bugs that until now were only theoretical or present in niche use cases.
- kind: interpretation · questions: Q9 · load-bearing: no
- support: S-r1-criticism-02/P12 · rung 2 · fit direct · upstream self
- scope: porting guide, June 2026
- confidence: medium · flags: none
- conflicts: none

### C-r1-criticism-22
- claim: In the free-threaded build, accessing frame.f_locals of a frame that is currently executing in another thread is not safe and may crash the interpreter (3.15.1 docs); the 3.13 docs said sys._current_frames() is generally not safe to use in the free-threaded build.
- kind: behaviour · questions: Q12 · load-bearing: yes (crash-level limitation)
- support: S-r1-criticism-01/P6 · rung 1 · fit direct · upstream self
- support: S-r1-criticism-11/P4 · rung 1 · fit direct · upstream self
- scope: 3.15.1 docs; 3.13.17 docs for the sys._current_frames() sentence
- confidence: high · flags: none
- conflicts: S-r1-criticism-06/P1 (see Conflicts)

### C-r1-criticism-23
- claim: The free-threaded build makes some objects immortal (never deallocated, reference counts never modified) to avoid reference-count contention that would prevent multi-threaded scaling; as of 3.14 this is limited to code constants and strings interned by sys.intern().
- kind: behaviour · questions: Q12 · load-bearing: yes (refcount contention mechanism)
- support: S-r1-criticism-01/P7 · rung 1 · fit direct · upstream self
- support: S-r1-criticism-01/P8 · rung 1 · fit direct · upstream self
- scope: 3.14 and later (docs 3.15.1)
- confidence: high · flags: none
- conflicts: none

### C-r1-criticism-24
- claim: The CPython docs say the free-threaded build typically uses more memory than the default build, giving reasons that include immortal interned strings, a larger header for non-GC objects (None is 32 vs 16 bytes on AMD64), delayed freeing under QSBR, and mimalloc replacing pymalloc.
- kind: behaviour · questions: Q12 · load-bearing: yes (memory use)
- support: S-r1-criticism-01/P9 · rung 1 · fit direct · upstream self
- support: S-r1-criticism-01/P10 · rung 1 · fit direct · upstream self
- support: S-r1-criticism-01/P11 · rung 1 · fit direct · upstream self
- support: S-r1-criticism-01/P12 · rung 1 · fit direct · upstream self
- support: S-r1-criticism-01/P13 · rung 1 · fit direct · upstream self
- scope: docs 3.15.1
- confidence: high · flags: none
- conflicts: none

### C-r1-criticism-25
- claim: In the free-threaded build, gc.collect() frees memory held by QSBR, but the process's resident set size may still not drop because the allocator may not return memory to the OS immediately; setting MIMALLOC_PURGE_DELAY=0 shortens mimalloc's delay at a likely performance cost.
- kind: behaviour · questions: Q12 · load-bearing: no (mitigation detail)
- support: S-r1-criticism-01/P12 · rung 1 · fit direct · upstream self
- support: S-r1-criticism-01/P14 · rung 1 · fit direct · upstream self
- scope: docs 3.15.1
- confidence: high · flags: none
- conflicts: none

### C-r1-criticism-26
- claim: To avoid contention on reference counts of frequently shared objects, the free-threaded build uses per-thread reference counting for a few selected object types, so those objects are typically freed later than in the default build.
- kind: behaviour · questions: Q12 · load-bearing: no
- support: S-r1-criticism-01/P15 · rung 1 · fit direct · upstream self
- support: S-r1-criticism-01/P16 · rung 1 · fit direct · upstream self
- scope: docs 3.15.1 (the page lists heap type objects, code objects and module __dict__; list not quoted as a passage)
- confidence: high · flags: none
- conflicts: none

### C-r1-criticism-27
- claim: Thomas Wouters said at PyCon US 2026 that having many threads access the same objects is a problem Python cannot solve directly and that "sharing objects between threads is still problematic for performance".
- kind: evaluation · questions: Q12 · load-bearing: yes (contention pitfall; attributed)
- support: S-r1-criticism-09/P4 · rung 2 · fit direct · upstream Wouters' talk
- support: S-r1-criticism-08/P1 · rung 3 · fit partial · upstream self (pointer only: same person, forum, 2025)
- support: S-r1-criticism-08/P2 · rung 3 · fit partial · upstream self (pointer only: Neil Schemenauer, forum)
- scope: as reported by LWN, June 2026; forum thread concerns 3.14.0b2
- confidence: medium (one rung-2 report of one person's view; mechanism is rung-1 in C-23/C-26) · flags: vendor-about-itself
- conflicts: none

### C-r1-criticism-28
- claim: In a June 2025 discuss.python.org thread on Python 3.14.0b2, core developer Thomas Wouters wrote that refcount contention on shared objects would show as very bad or even negative scaling as threads increase, and that there were no ready-to-use tools to detect refcount contention at that point.
- kind: fact · questions: Q12 · load-bearing: no (debugging difficulty; rung 3 only, for the lead to weigh)
- support: S-r1-criticism-08/P1 · rung 3 · fit direct · upstream self
- scope: June 2025, 3.14.0b2
- confidence: low (forum; below bar) · flags: none
- conflicts: none

### C-r1-criticism-29
- claim: The free-threaded build may automatically re-enable the GIL, printing a warning, when it imports a C-API extension module not explicitly marked as supporting free threading; Wouters called forcing the GIL off in that case "playing with fire", suitable only for testing.
- kind: behaviour · questions: Q12 · load-bearing: no (overlaps practice angle; failure-mode aspect only)
- support: S-r1-criticism-01/P17 · rung 1 · fit direct · upstream self
- support: S-r1-criticism-09/P5 · rung 2 · fit direct · upstream Wouters' talk
- scope: docs 3.15.1; LWN June 2026
- confidence: high · flags: none
- conflicts: none

### C-r1-criticism-30
- claim: In Python 3.13 the specializing adaptive interpreter (PEP 659) was disabled in the free-threaded build and was the largest source of its single-threaded overhead, with re-enabling expected in 3.14.
- kind: behaviour · questions: Q12 · load-bearing: no (features disabled; overhead numbers belong to the evidence angle; 3.14 re-enablement not verified here)
- support: S-r1-criticism-11/P2 · rung 1 · fit direct · upstream self
- scope: Python 3.13 only
- confidence: high · flags: prediction (the 3.14 expectation)
- conflicts: none

### C-r1-criticism-31
- claim: The Python 3.13 documentation called free-threaded mode experimental and told users to expect some bugs and a substantial single-threaded performance hit.
- kind: fact · questions: Q12 · load-bearing: no
- support: S-r1-criticism-11/P3 · rung 1 · fit direct · upstream self
- scope: Python 3.13
- confidence: high · flags: none
- conflicts: none

### C-r1-criticism-32
- claim: According to Thomas Wouters (reported by LWN, June 2026), the Python 3.13 free-threaded build had thread-safety issues and scalability problems in which adding more threads could make things slower.
- kind: fact · questions: Q12 · load-bearing: no
- support: S-r1-criticism-09/P6 · rung 2 · fit direct · upstream Wouters' talk
- scope: Python 3.13
- confidence: medium · flags: vendor-about-itself
- conflicts: none

### C-r1-criticism-33
- claim: The free-threading guide's TSan page says C and C++ do not prevent data races and that in practice many C and C++ extensions exhibit data races while adding support for the free-threaded build.
- kind: interpretation · questions: Q12, Q15 · load-bearing: no
- support: S-r1-criticism-05/P1 · rung 2 · fit direct · upstream self
- scope: guide page, undated in text
- confidence: medium · flags: none
- conflicts: none

### C-r1-criticism-34
- claim: The free-threading testing guide says tests that fail because of thread-safety issues are inherently flaky and may fail only a very small percentage of the time.
- kind: interpretation · questions: Q12, Q15 · load-bearing: no (debugging difficulty)
- support: S-r1-criticism-03/P5 · rung 2 · fit direct · upstream self
- support: S-r1-criticism-06/P2 · rung 2 · fit partial · upstream self (same owner)
- scope: guide, May 2026
- confidence: medium · flags: none
- conflicts: none

### C-r1-criticism-35
- claim: The free-threading testing guide advises running a project's existing test suite on the free-threaded build first and fixing failures that occur only with the GIL disabled.
- kind: fact · questions: Q15 · load-bearing: no
- support: S-r1-criticism-03/P1 · rung 1 · fit direct · upstream self
- scope: guide, May 2026
- confidence: high · flags: none
- conflicts: none

### C-r1-criticism-36
- claim: When a package cannot run with the GIL disabled, the testing guide suggests calling sys.setswitchinterval with a very small value before multithreaded tests on the GIL-enabled build, to force more frequent GIL switches and expose issues the GIL masks.
- kind: fact · questions: Q15 · load-bearing: no
- support: S-r1-criticism-03/P2 · rung 1 · fit direct · upstream self
- scope: guide, May 2026
- confidence: high · flags: none
- conflicts: none

### C-r1-criticism-37
- claim: The testing guide names pytest-run-parallel and pytest-freethreaded (pytest plugins) and unittest-ft as tools that run existing tests simultaneously in many threads, and says they find issues from global state but cannot find issues from multithreaded use of a library's own data structures.
- kind: fact · questions: Q15 · load-bearing: no
- support: S-r1-criticism-03/P3 · rung 1 · fit direct · upstream self
- support: S-r1-criticism-03/P4 · rung 2 · fit direct · upstream self
- scope: guide, May 2026
- confidence: high · flags: vendor-about-itself (Quansight maintains pytest-run-parallel)
- conflicts: none

### C-r1-criticism-38
- claim: pytest-run-parallel runs a test suite in parallel threads via --parallel-threads, repeats each test in each thread via --iterations, and lets single tests be kept single-threaded with pytest.mark.thread_unsafe; its README states its main goal is discovering thread-safety issues when using C libraries.
- kind: behaviour · questions: Q15 · load-bearing: no
- support: S-r1-criticism-07/P2 · rung 1 · fit direct · upstream self
- support: S-r1-criticism-07/P3 · rung 1 · fit direct · upstream self
- support: S-r1-criticism-07/P4 · rung 1 · fit direct · upstream self
- support: S-r1-criticism-07/P5 · rung 1 · fit direct · upstream self
- support: S-r1-criticism-07/P1 · rung 1 · fit direct · upstream self
- scope: README on main branch at access, unpinned
- confidence: high · flags: none
- conflicts: none

### C-r1-criticism-39
- claim: For hand-written multithreaded tests, the testing guide recommends placing a threading.Barrier before code suspected of racing, to raise the chance that a rare failure triggers.
- kind: fact · questions: Q15 · load-bearing: no
- support: S-r1-criticism-03/P6 · rung 1 · fit direct · upstream self
- scope: guide, May 2026
- confidence: high · flags: none
- conflicts: none

### C-r1-criticism-40
- claim: The free-threading debugging guide recommends pytest-repeat (for example PYTHON_GIL=0 pytest --count=100) because tests for code with a concurrency bug may still pass most of the time.
- kind: fact · questions: Q15 · load-bearing: no
- support: S-r1-criticism-06/P2 · rung 1 · fit direct · upstream self
- support: S-r1-criticism-06/P3 · rung 1 · fit direct · upstream self
- scope: guide, April 2026
- confidence: high · flags: none
- conflicts: none

### C-r1-criticism-41
- claim: The testing guide warns that pytest itself is not thread-safe (fixtures such as monkeypatch modify global state) and that deadlocks and hangs are more likely under free threading and pytest-run-parallel, recommending pytest-timeout.
- kind: fact · questions: Q15 · load-bearing: no
- support: S-r1-criticism-03/P7 · rung 1 · fit direct · upstream self
- support: S-r1-criticism-03/P8 · rung 1 · fit direct · upstream self
- support: S-r1-criticism-03/P9 · rung 1 · fit direct · upstream self
- scope: guide, May 2026
- confidence: high · flags: none
- conflicts: none

### C-r1-criticism-42
- claim: ThreadSanitizer (TSan) detects data races in compiled code, and the free-threading guide shows building free-threaded CPython with it via ./configure --disable-gil --with-thread-sanitizer.
- kind: fact · questions: Q15 · load-bearing: no
- support: S-r1-criticism-05/P1 · rung 1 · fit direct · upstream self
- support: S-r1-criticism-05/P2 · rung 1 · fit direct · upstream self
- scope: guide; instructions target CPython 3.14 branch
- confidence: high · flags: none
- conflicts: none

### C-r1-criticism-43
- claim: The free-threading debugging guide says ThreadSanitizer adds significant overhead to the interpreter and native code, so many projects cannot run their full test suite under it in CI.
- kind: fact · questions: Q15 · load-bearing: no
- support: S-r1-criticism-06/P4 · rung 1 · fit direct · upstream self
- scope: guide, April 2026 (the same section suggests AddressSanitizer for full-suite CI; not quoted)
- confidence: high · flags: none
- conflicts: none

### C-r1-criticism-44
- claim: Thomas Wouters advised adding multithreaded tests, saying threading bugs will show up because there is no longer a GIL "accidentally protecting you some of the time".
- kind: interpretation · questions: Q15, Q9 · load-bearing: no
- support: S-r1-criticism-09/P7 · rung 2 · fit direct · upstream Wouters' talk
- scope: LWN report, June 2026
- confidence: medium · flags: none
- conflicts: none

## Conflicts
- C-r1-criticism-10: S-r1-criticism-11/P1 (3.13 docs) says sharing an iterator may make threads "see duplicate or missing elements when iterating or crash the interpreter"; S-r1-criticism-01/P3 (3.15.1 docs) says only "threads may see duplicate or missing elements". Nature: version/time; not settled.
- C-r1-criticism-22: S-r1-criticism-06/P1 (community debugging guide) says Python code access "is guaranteed not to produce any major interpreter crash"; S-r1-criticism-01/P6 (official 3.15.1 docs) says accessing frame.f_locals of a frame executing in another thread "may crash the interpreter". Nature: scope/factual; not settled.
- C-r1-criticism-09: S-r1-criticism-10 (FAQ, GIL-enabled build) lists L.sort() among atomic operations (line 208 of the saved text, not quoted as a passage); S-r1-criticism-04/P4 (free-threaded build) says "The sort() method is not atomic" and the list appears empty during the sort. Nature: scope (different builds); not settled.

## Speculation and flags
- C-r1-criticism-15: superlative, "The most common source of thread safety issues in Python packages" (one owner, Quansight).
- C-r1-criticism-17, -27, -32: vendor-about-itself; Wouters works at Meta on the free-threaded interpreter and sits on the steering council.
- C-r1-criticism-30: prediction, "We expect to re-enable it in a thread-safe way in the 3.14 release" (not checked against 3.14 What's New).
- C-r1-criticism-37: vendor-about-itself; the guide's owner maintains pytest-run-parallel.
- S-r1-criticism-02/03/05/06/07: all one owner (Quansight Labs); they never count as independent of each other.
- S-r1-criticism-08: forum (rung 3); used only as pointer.

## Unused leads
- https://github.com/python/cpython/issues/126907 — reported segfault/abort calling atexit register/clear from several threads in the free-threaded build (found by fuzzer); concrete crash report, not opened.
- https://github.com/python/cpython/issues/132713 — reported segfault on concurrent repr of list holding typing.Union in free-threaded 3.14; not opened.
- https://github.com/python/cpython/issues/142421 — trio crash on free-threaded 3.14 macOS, duplicate of #133932; not opened.
- https://discuss.python.org/t/pep-779-criteria-for-supported-status-for-free-threaded-python/84319/35 — discussion with a cryptography-library race example (silently incorrect results); not opened.
- https://discuss.python.org/t/please-take-race-conditions-seriously-when-discussing-threading/93339 — forum argument that races become far more common without the GIL; rung 3.
- https://realpython.com/lessons/gil-wont-save-you/ — says 3.10 changed where the GIL is released, hiding a classic increment race; follow upstream if needed.
- https://lwn.net/Articles/1025893/ — LWN "Getting extensions to work with free-threaded Python" (extension angle).
- https://docs.python.org/3.14/whatsnew/3.14.html — would confirm whether the specializing interpreter was re-enabled in 3.14 (C-30's prediction).

## Queries
- "free-threaded Python race conditions hidden by GIL" → useful (pointers only)
- "free-threaded CPython reference count contention shared object scaling" → useful (discuss thread)
- "LWN free-threaded Python thread safety" → nothing new
- "lwn.net free threading Python GIL removal problems" → useful (LWN 1078367)
- "free-threaded Python 3.14 segfault crash issue thread safety bug report" → useful (crash-report leads, not opened)
