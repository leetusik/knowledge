# Findings: 20261023-0350-free-threaded-cpython · round 1 · angle foundations
- researcher: claude-opus-5-5 · status: complete · tool calls: 27

## Questions
- Q1: answered — claims: C-r1-foundations-01, -02, -03, -04, -05, -06, -07, -08, -09, -10 — note: definition, build flag, "t" ABI tag and python3.13t executable, runtime GIL switch, what is kept (per-object locks) all from rung-1 PEP/docs.
- Q2: answered — claims: C-r1-foundations-30, -31, -32, -33, -34, -35, -36, -37, -38 — note: PEP 703 dates, SC July 2023 three-stage plan, 3.13 experimental, PEP 779 criteria and SC acceptance (June 2025), 3.14 phase II. Final SC acceptance post of Oct 2023 not opened; the PEP header gives the resolution date.
- Q4: answered — claims: C-r1-foundations-11 to -29 — note: all mechanisms covered from PEP 703 (design, 2023) and the current howto (implementation); two design-vs-implementation differences recorded under Conflicts.
- Q16: thin — claims: C-r1-foundations-40, -41, -42, -43, -44 — note: rung-1 sources (SC June 2025, 3.14 What's New) say Phase III is undecided; no 2026 PEP or SC decision on Phase III found after 3 queries; search snippets mention only blog estimates (rung 3, not used).

## Sources

### S-r1-foundations-01
- url: https://peps.python.org/pep-0703/ · canonical: peps.python.org/pep-0703/
- title: PEP 703 – Making the Global Interpreter Lock Optional in CPython · authors: Sam Gross · publisher: Python Software Foundation (peps.python.org)
- date: created 09-Jan-2023; resolution 24-Oct-2023 · version: Status Final, Python-Version 3.13
- accessed: 2026-10-23 · read-via: curl · quote-match: exact · archive: none
- kind: spec · peer-review: n/a (PEP process; Steering Council review)
- owner: Python Software Foundation / CPython core team; author Sam Gross (Meta) · upstream: none
- lateral: PEP 703 is the canonical CPython design document for the no-GIL work; the SC notice (S-r1-foundations-03) names Sam Gross (@colesbury) as its author and Meta staff confirm Meta's sponsorship of the implementation.
- passages:
  - P1 · § "Abstract": "CPython’s global interpreter lock (“GIL”) prevents multiple threads from executing Python code at the same time. The GIL is an obstacle to using multi-core CPUs from Python efficiently."
  - P2 · § "Abstract": "This PEP proposes adding a build configuration (--disable-gil) to CPython to let it run Python code without the global interpreter lock and with the necessary changes needed to make the interpreter thread-safe."
  - P3 · § "Build Configuration Changes": "The global interpreter lock will remain the default for CPython builds and python.org downloads. A new build configuration flag, --disable-gil will be added to the configure script that will build CPython with support for running without the global interpreter lock."
  - P4 · § "Build Configuration Changes": "When built with --disable-gil, CPython will define the Py_GIL_DISABLED macro in Python/patchlevel.h. The ABI tag will include the letter “t” (for “threading”)."
  - P5 · § "Overview of CPython Changes": "Removing the global interpreter lock requires substantial changes to CPython internals, but relatively few changes to the public Python and C APIs."
  - P6 · § "Reference Counting": "This PEP proposes a combination of three techniques to address these constraints. The first is a switch from plain non-atomic reference counting to biased reference counting, which is a thread-safe reference counting technique with lower execution overhead than plain atomic reference counting. The other two techniques are immortalization and a limited form of deferred reference counting"
  - P7 · § "Reference Counting": "Biased reference counting (BRC) is a technique first described in 2018 by Jiho Choi, Thomas Shull, and Josep Torrellas [3]. It is based on the observation that most objects are only accessed by a single thread, even in multi-threaded programs. Each object is associated with an owning thread (the thread that created it). Reference counting operations from the owning thread use non-atomic instructions to modify a “local” reference count. Other threads use atomic instructions to modify a “shared” reference count."
  - P8 · § "Reference Counting": "The ob_tid, ob_ref_local, and ob_ref_shared are used by the biased reference counting implementation. The ob_gc_bits field is used store garbage collection flags that were previously stored in PyGC_Head (see Garbage Collection (Cycle Collection)). The ob_mutex field provides a per-object lock in a single byte."
  - P9 · § "Immortalization": "Some objects, such as interned strings, small integers, statically allocated PyTypeObjects, and the True, False, and None objects stay alive for the lifetime of the program."
  - P10 · § "Immortalization": "The Py_INCREF and Py_DECREF macros are no-ops for immortal objects. This avoids contention on the reference count fields of these objects when multiple threads access them concurrently."
  - P11 · § "Deferred Reference Counting": "A few types of objects, such as top-level functions, code objects, modules, and methods, tend to be frequently accessed by many threads concurrently. These objects don’t necessarily live for the lifetime of the program, so immortalization is not a good fit."
  - P12 · § "Deferred Reference Counting": "Typically, the interpreter modifies objects’ reference counts as they are pushed to and popped from the interpreter’s stack. The interpreter skips these reference counting operations for objects that use deferred reference counting."
  - P13 · § "Deferred Reference Counting": "Consequently, objects that use deferred reference counting can only be deallocated during garbage collection cycles."
  - P14 · § "Reference Counting Type Objects": "To address this, heap type reference counts are partially stored in a distributed manner in per-thread arrays."
  - P15 · § "Memory Management": "CPython currently uses an internal allocator, pymalloc, which is optimized for small object allocation. The pymalloc implementation is not thread-safe without the GIL. This PEP proposes replacing pymalloc with mimalloc, a general-purpose thread-safe allocator with good performance, including for small allocations."
  - P16 · § "Memory Management": "First, traversing the internal mimalloc structures allows the garbage collector to find all Python objects without maintaining a linked list. This is described in more detail in the garbage collection section. Second, mimalloc heaps and allocations based on size class enable collections like dict to generally avoid acquiring locks during read-only operations."
  - P17 · § "Stop-the-World": "When running without the GIL, the implementation needs a way to ensure that reference counts remain stable during cycle detection. Threads running Python code must be paused to ensure that references and reference counts remain stable. Once the cycles are identified, other threads are resumed."
  - P18 · § "Thread States": "The ATTACHED and DETACHED states correspond closely to acquiring and releasing the global interpreter lock."
  - P19 · § "Thread States": "The substantial difference is that multiple threads can be in the attached state simultaneously, while previously only one thread could acquire the GIL at a time."
  - P20 · § "Generations": "When compiling without the GIL, the garbage collector will only use a single generation (i.e., it will be non-generational). The primary reason for this change is to reduce the impact of the stop-the-world pauses in multithreaded applications."
  - P21 · § "Container Thread-Safety": "For example, if multiple threads concurrently modify the same list, the GIL ensures that the length of the list (ob_size) accurately matches the number of elements, and that the reference counts of each element accurately reflect the number of references to those elements. Without the GIL — and absent other changes — concurrent modifications would corrupt those fields and likely lead to program crashes."
  - P22 · § "Container Thread-Safety": "The GIL does not necessarily ensure that operations are atomic or remain correct when multiple operations occur concurrently."
  - P23 · § "Container Thread-Safety": "This PEP proposes using per-object locks to provide many of the same protections that the GIL provides. For example, every list, dictionary, and set will have an associated lightweight lock. All operations that modify the object must hold the object’s lock."
  - P24 · § "Container Thread-Safety": "Per-object locks with critical sections provide weaker protections than the GIL. Because the GIL doesn’t necessarily ensure that concurrent operations are atomic or correct, the per-object locking scheme also cannot ensure that concurrent operations are atomic or correct. Instead, per-object locking aims for similar protections as the GIL, but with mutual exclusion limited to individual objects."
  - P25 · § "Python Critical Sections": "Straightforward per-object locking could introduce deadlocks that were not present when running with the GIL."
  - P26 · § "Python Critical Sections": "This PEP proposes a scheme called “Python critical sections” to implicitly release per-object locks to avoid deadlocks."
  - P27 · § "Python Critical Sections": "Instead of immediately suspending locks any time a nested operation begins, locks are only suspended if the thread would block (i.e., would have released the GIL)."
  - P28 · § "Optimistically Avoiding Locking": "A few operations on dict and list optimistically avoid acquiring the per-object locks. They have a fast path operation that does not acquire locks, but may fall back to a slower operation that acquires the dictionary’s or list’s lock when another thread is concurrently modifying that container."
  - P29 · § "Optimistically Avoiding Locking": "This technique requires cooperation from the memory allocator (mimalloc) as well as changes to the list and dictionary objects. The proposed technique is similar to read-copy update (RCU) [5], a synchronization mechanism widely used in the Linux kernel."
  - P30 · § "Optimistic dict and list Access Summary": "The scheme works by placing temporary restrictions on mimalloc page reuse to ensure that objects’ reference count fields remain valid after objects are freed so that conditional reference count increment operations are safe."
  - P31 · § "Mimalloc Changes for Optimistic list and dict Access": "There are therefore three mimalloc heaps for Python objects, one for non-GC objects, one for GC objects with managed dictionaries, and one for GC objects without managed dictionaries."
  - P32 · § "Specializing Interpreter": "Concurrent specializations are prevented by using a mutex. This prevents multiple threads writing to the same inline cache."
  - P33 · § "Specializing Interpreter": "In multi-threaded programs running without the GIL, each bytecode is only specialized once. This prevents a thread from reading a partially written inline cache."
  - P34 · § "Py_mod_gil Slot": "If the slot is not set, the interpreter pauses all threads and enables the GIL before continuing. Additionally, the interpreter will issue a visible warning naming the extension, that the GIL was enabled (and why) and the steps the user can take to override it."
  - P35 · § "PYTHONGIL Environment Variable": "In --disable-gil builds, the user can also override the behavior at runtime by setting the PYTHONGIL environment variable. Setting PYTHONGIL=0, forces the GIL to be disabled, overriding the module slot logic. Setting PYTHONGIL=1, forces the GIL to be enabled."
  - P36 · § "Backwards Compatibility": "CPython builds without the GIL will not be ABI compatible with the standard CPython build or with the stable ABI due to changes to the Python object header needed to support biased reference counting. C-API extensions will need to be rebuilt specifically for this version."
  - P37 · § "Backwards Compatibility": "Destructors and weak reference callbacks for code objects and top-level function objects are delayed until the next cyclic garbage collection due to the use of deferred reference counting."
  - P38 · § "Greg Stein’s Free-Threading Patch": "In 1996, Greg Stein published a patch against Python 1.4 that removed the GIL [21]."
  - P39 · § "Gilectomy": "Gilectomy [18] was a project by Larry Hastings to remove the GIL in CPython."
  - P40 · § "Reference Implementation": "The nogil repository is based on Python 3.9.10."
  - P41 · § "Python Build Modes": "After 2–3 releases, (i.e., in 2026–2027), CPython is released with the GIL controlled by a runtime environment variable or flag. The GIL is enabled by default. There is only a single ABI."
  - P42 · § "Python Build Modes": "After another 2–3 release (i.e., 2028–2030), CPython switches to the GIL being disabled by default. The GIL can still be enabled at runtime via an environment variable or command line flag."
  - P43 · § "PEP 703 – Making the Global Interpreter Lock Optional in CPython": "Created: … 09-Jan-2023 … Python-Version: … 3.13 … Resolution: … 24-Oct-2023"

### S-r1-foundations-02
- url: https://peps.python.org/pep-0779/ · canonical: peps.python.org/pep-0779/
- title: PEP 779 – Criteria for supported status for free-threaded Python · authors: Thomas Wouters, Matt Page, Sam Gross · publisher: Python Software Foundation (peps.python.org)
- date: created 13-Mar-2025; resolution 16-Jun-2025; page last modified 2025-10-06 · version: Status Final, Python-Version 3.14
- accessed: 2026-10-23 · read-via: curl · quote-match: exact · archive: none
- kind: spec · peer-review: n/a (PEP process)
- owner: Python Software Foundation / CPython core team · upstream: PEP 703 acceptance by the SC
- lateral: the PEP itself notes author overlap with the 2023 Steering Council and says the PEP does not come from the SC; the SC accepted it in S-r1-foundations-07.
- passages:
  - P1 · § "Abstract": "Phase I started early in the development of Python 3.13, and includes making the free-threaded (GIL-less) Python build available but explicitly experimental. Phase II would make the free-threaded build officially supported but still optional, and phase III would make the free-threaded build the default."
  - P2 · § "Abstract": "This PEP establishes clear expectations and requirements for moving to Phase II, making the free-threaded Python build officially supported."
  - P3 · § "Specification": "for phase II (not the default flip), we propose 15% as a hard performance target."
  - P4 · § "Specification": "We propose a target of 20% (geometric mean, as measured by pyperformance) for phase II."
  - P5 · § "Specification": "(Note that these are requirements for entering phase II only. The decision to make free-threaded Python the default (phase III) is very different, and we expect it will revolve around community support, willingness, and showing clear benefit. That’s left for a future PEP.)"
  - P6 · § "Rationale": "The implementation details of, for example, lockless list and dict APIs, which rely on QSBR, and deadlock-avoiding critical sections, may be complex and difficult to get right, but gives us easy to use APIs without too many pitfalls."
  - P7 · § "Motivation": "Moving to the “officially supported” stage is an important step towards making free-threaded Python the default build, and eventually the only one."

### S-r1-foundations-03
- url: https://discuss.python.org/t/a-steering-council-notice-about-pep-703-making-the-global-interpreter-lock-optional-in-cpython/30474 · canonical: discuss.python.org/t/a-steering-council-notice-about-pep-703-making-the-global-interpreter-lock-optional-in-cpython/30474
- title: A Steering Council notice about PEP 703 (Making the Global Interpreter Lock Optional in CPython) · authors: Thomas Wouters, "Posting for the whole Steering Council" · publisher: Discussions on Python.org
- date: 2023-07-28 · version: n/a
- accessed: 2026-10-23 · read-via: curl · quote-match: exact · archive: none
- kind: other (official governance statement by the Python Steering Council about its own decision) · peer-review: n/a
- owner: Python Steering Council / PSF · upstream: none
- lateral: PEP 779 (S-r1-foundations-02, P1) cites this acceptance as the source of the three phases; the SC is CPython's elected governing body.
- passages:
  - P1 · § "A Steering Council notice about PEP 703 (Making the Global Interpreter Lock Optional in CPython)": "We intend to accept PEP 703, although we’re still working on the acceptance details."
  - P2 · § "A Steering Council notice about PEP 703 (Making the Global Interpreter Lock Optional in CPython)": "Long-term (probably 5+ years), the no-GIL build should be the only build. We do not want to create a permanent split between with-GIL and no-GIL builds (and extension modules)."
  - P3 · § "A Steering Council notice about PEP 703 (Making the Global Interpreter Lock Optional in CPython)": "We do not want another Python 3 situation, so any changes in third-party code needed to accommodate no-GIL builds should just work in with-GIL builds (although backward compatibility with older Python versions will still need to be addressed). This is not Python 4."
  - P4 · § "A Steering Council notice about PEP 703 (Making the Global Interpreter Lock Optional in CPython)": "We want to be able to change our mind if it turns out, any time before we make no-GIL the default, that it’s just going to be too disruptive for too little gain. Such a decision could mean rolling back all of the work"
  - P5 · § "A Steering Council notice about PEP 703 (Making the Global Interpreter Lock Optional in CPython)": "Short term, we add the no-GIL build as an experimental build mode, presumably in 3.13 (if it slips to 3.14, that is not a problem)."
  - P6 · § "A Steering Council notice about PEP 703 (Making the Global Interpreter Lock Optional in CPython)": "Mid-term, after we have confidence that there is enough community support to make production use of no-GIL viable, we make the no-GIL build supported but not the default (yet), and set a target date/Python version for making it the default."
  - P7 · § "A Steering Council notice about PEP 703 (Making the Global Interpreter Lock Optional in CPython)": "Long-term, we want no-GIL to be the default, and to remove any vestiges of the GIL (without unnecessarily breaking backward compatibility)."
  - P8 · § "A Steering Council notice about PEP 703 (Making the Global Interpreter Lock Optional in CPython)": "We think it may take as much as five years to get to this stage."

### S-r1-foundations-04
- url: https://docs.python.org/3/howto/free-threading-python.html · canonical: docs.python.org/3/howto/free-threading-python.html
- title: Python support for free threading · authors: n/a · publisher: Python Software Foundation
- date: last updated Oct 22, 2026 · version: Python 3.15.1 documentation
- accessed: 2026-10-23 · read-via: curl · quote-match: exact · archive: none
- kind: official docs · peer-review: n/a
- owner: Python Software Foundation · upstream: none
- lateral: official CPython documentation for the current release line (the page header says 3.15.1).
- passages:
  - P1 · § "Python support for free threading": "Starting with the 3.13 release, CPython has support for a build of Python called free threading where the global interpreter lock (GIL) is disabled. Free-threaded execution allows for full utilization of the available processing power by running threads in parallel on available CPU cores."
  - P2 · § "Installation": "When building CPython from source, the --disable-gil configure option should be used to build a free-threaded Python interpreter."
  - P3 · § "The global interpreter lock in free-threaded Python": "Free-threaded builds of CPython support optionally running with the GIL enabled at runtime using the environment variable PYTHON_GIL or the command-line option -X gil."
  - P4 · § "The global interpreter lock in free-threaded Python": "The GIL may also automatically be enabled when importing a C-API extension module that is not explicitly marked as supporting free threading. A warning will be printed in this case."
  - P5 · § "Identifying free-threaded Python": "To check if the current interpreter supports free-threading, python -VV and sys.version contain “free-threading build”. The new sys._is_gil_enabled() function can be used to check whether the GIL is actually disabled in the running process."
  - P6 · § "Identifying free-threaded Python": "The sysconfig.get_config_var("Py_GIL_DISABLED") configuration variable can be used to determine whether the build supports free threading. If the variable is set to 1, then the build supports free threading. This is the recommended mechanism for decisions related to the build configuration."
  - P7 · § "Thread safety": "The free-threaded build of CPython aims to provide similar thread-safety behavior at the Python level to the default GIL-enabled build. Built-in types like dict, list, and set use internal locks to protect against concurrent modifications in ways that behave similarly to the GIL."
  - P8 · § "Thread safety": "It’s recommended to use the threading.Lock or other synchronization primitives instead of relying on the internal locks of built-in types, when possible."
  - P9 · § "Immortalization": "In the free-threaded build, some objects are immortal. Immortal objects are not deallocated and have reference counts that are never modified. This is done to avoid reference count contention that would prevent efficient multi-threaded scaling."
  - P10 · § "Immortalization": "As of the 3.14 release, immortalization is limited to: … Code constants: numeric literals, string literals, and tuple literals composed of other constants. … Strings interned by sys.intern()."
  - P11 · § "QSBR can delay freeing of memory": "In order to safely implement lock-free data structures, a safe memory reclamation (SMR) scheme is used, known as quiescent state-based reclamation (QSBR). This means that the memory backing data structures allowing lock-free access will use QSBR, which defers the free operation, rather than immediately freeing the memory. Two examples of these data structures are the list object and the dictionary keys object."
  - P12 · § "QSBR can delay freeing of memory": "Running gc.collect() should cause all memory being held by QSBR to be actually freed."
  - P13 · § "mimalloc allocator vs pymalloc": "The default build will normally use the “pymalloc” memory allocator for small allocations (512 bytes or smaller). The free-threaded build does not use pymalloc and allocates all Python objects using the “mimalloc” allocator."
  - P14 · § "mimalloc allocator vs pymalloc": "In the free-threaded build, mimalloc manages memory in a number of separate heaps (currently four)."
  - P15 · § "Free-threaded reference counting can cause objects to live longer": "The free-threaded build uses “biased reference counting”, with a fast-path for objects “owned” by the current thread and a slow path for other objects."
  - P16 · § "Free-threaded reference counting can cause objects to live longer": "When deferred reference counting is enabled, references from Python function stacks are not added to the reference count. This scheme reduces the overhead of reference counting, especially for objects used from multiple threads."
  - P17 · § "Free-threaded reference counting can cause objects to live longer": "Deferred reference counting is enabled for the following types: … module objects … module top-level functions … class methods defined in the class scope … descriptor objects … thread-local objects, created by threading.local"
  - P18 · § "Per-thread reference counting can delay freeing objects": "Rather than updating a single shared reference count, each thread maintains its own local reference count array, indexed by a unique id assigned to the object."
  - P19 · § "Per-thread reference counting can delay freeing objects": "Per-thread reference counting is currently used for: … heap type objects (classes created in Python) … code objects … the __dict__ of module objects"
  - P20 · § "Non-GC objects have a larger object header": "For example, on the AMD64 platform, None uses 32 bytes on the free-threaded build vs 16 bytes for the default build."

### S-r1-foundations-05
- url: https://docs.python.org/3/whatsnew/3.13.html · canonical: docs.python.org/3/whatsnew/3.13.html
- title: What’s New In Python 3.13 · authors: n/a (PSF docs) · publisher: Python Software Foundation
- date: n/a (release notes for 3.13, released October 2024) · version: Python 3.13
- accessed: 2026-10-23 · read-via: curl · quote-match: exact · archive: none
- kind: official docs (release notes) · peer-review: n/a
- owner: Python Software Foundation · upstream: none
- lateral: official release notes.
- passages:
  - P1 · § "Free-threaded CPython": "CPython now has experimental support for running in a free-threaded mode, with the global interpreter lock (GIL) disabled. This is an experimental feature and therefore is not enabled by default. The free-threaded mode requires a different executable, usually called python3.13t or python3.13t.exe. Pre-built binaries marked as free-threaded can be installed as part of the official Windows and macOS installers, or CPython can be built from source with the --disable-gil option."
  - P2 · § "Free-threaded CPython": "Free-threaded builds of CPython support optionally running with the GIL enabled at runtime using the environment variable PYTHON_GIL or the command-line option -X gil=1."
  - P3 · § "Free-threaded CPython": "To check if the current interpreter supports free-threading, python -VV and sys.version contain “experimental free-threading build”."
  - P4 · § "Free-threaded CPython": "C-API extension modules need to be built specifically for the free-threaded build. Extensions that support running with the GIL disabled should use the Py_mod_gil slot."
  - P5 · § "Free-threaded CPython": "Importing C extensions that don’t use these mechanisms will cause the GIL to be enabled, unless the GIL was explicitly disabled with the PYTHON_GIL environment variable or the -X gil=0 option."
  - P6 · § "Build Changes": "For example, the free-threaded build generates python-3.13t.pc and the debug build generates python-3.13d.pc."

### S-r1-foundations-06
- url: https://docs.python.org/3/whatsnew/3.14.html · canonical: docs.python.org/3/whatsnew/3.14.html
- title: What’s New In Python 3.14 · authors: n/a (PSF docs) · publisher: Python Software Foundation
- date: n/a (release notes for 3.14) · version: Python 3.14
- accessed: 2026-10-23 · read-via: curl · quote-match: exact · archive: none
- kind: official docs (release notes) · peer-review: n/a
- owner: Python Software Foundation · upstream: none
- lateral: official release notes.
- passages:
  - P1 · § "Free-threaded mode improvements": "CPython’s free-threaded mode (PEP 703), initially added in 3.13, has been significantly improved in Python 3.14. The implementation described in PEP 703 has been finished, including C API changes, and temporary workarounds in the interpreter were replaced with more permanent solutions. The specializing adaptive interpreter (PEP 659) is now enabled in free-threaded mode"
  - P2 · § "Free-threaded Python is officially supported": "The free-threaded build of Python is now supported and no longer experimental. This is the start of phase II where free-threaded Python is officially supported but still optional."
  - P3 · § "Free-threaded Python is officially supported": "Any decision to transition to phase III, with free-threading as the default or sole build of Python is still undecided, and dependent on many factors both within CPython itself and the community. This decision is for the future."
  - P4 · § "Binary releases for the experimental just-in-time compiler": "Free-threaded builds do not support JIT compilation."

### S-r1-foundations-07
- url: https://discuss.python.org/t/pep-779-criteria-for-supported-status-for-free-threaded-python/84319/123 · canonical: discuss.python.org/t/pep-779-criteria-for-supported-status-for-free-threaded-python/84319/123
- title: PEP 779: Criteria for supported status for free-threaded Python (post #123) · authors: Donghee Na, "on behalf of the Steering Council" · publisher: Discussions on Python.org
- date: 2025-06-15 (post notes it was later updated to clarify terminology) · version: n/a
- accessed: 2026-10-23 · read-via: curl · quote-match: exact · archive: none
- kind: other (official Steering Council acceptance statement) · peer-review: n/a
- owner: Python Steering Council / PSF · upstream: none
- lateral: PEP 779's header note links "the acceptance" for the phase II requirements; 3.14 What's New links "PEP 779’s acceptance".
- passages:
  - P1 · § "PEP 779: Criteria for supported status for free-threaded Python": "The Steering Council (SC) approves PEP 779, with the effect of removing the “experimental” tag from the free-threaded build of Python 3.14."
  - P2 · § "PEP 779: Criteria for supported status for free-threaded Python": "The Steering Council also expects that Stable ABI for free-threading should be prepared and defined for Python 3.15."
  - P3 · § "PEP 779: Criteria for supported status for free-threaded Python": "New experimental projects within CPython must be compatible with, and should be based on the free-threading build."
  - P4 · § "PEP 779: Criteria for supported status for free-threaded Python": "While the official target is to stay within 10% performance degradation, any changes expected to cause a slowdown of up to 15% should be discussed with the SC in advance."
  - P5 · § "PEP 779: Criteria for supported status for free-threaded Python": "Memory usage increases must stay below 15% compared to the GIL build. Similarly, any changes expected to increase memory above 15% (with a hard limit of 20%) should be discussed with the SC in advance."
  - P6 · § "PEP 779: Criteria for supported status for free-threaded Python": "The Python core team should begin considering and proposing higher-level concurrency primitives that users can use safely and effectively, without requiring a deep understanding of the underlying threading mechanism."
  - P7 · § "PEP 779: Criteria for supported status for free-threaded Python": "we as the Python developer community should broadly advertise that free-threading is a supported Python build option now and into the future, and that it will not be removed without following a proper deprecation schedule."
  - P8 · § "PEP 779: Criteria for supported status for free-threaded Python": "we recommend officially removing the “experimental” tag from the CPython free-threading build with the 3.14 beta 3 release."
  - P9 · § "PEP 779: Criteria for supported status for free-threaded Python": "Keep in mind that any decision to transition to Phase III, with free-threading as the default or sole build of Python is still undecided, and dependent on many factors both within CPython itself and the community. We leave that decision for the future."

## Claims

### C-r1-foundations-01
- claim: CPython's global interpreter lock (GIL) prevents multiple threads from executing Python code at the same time, which PEP 703 calls an obstacle to using multi-core CPUs efficiently.
- kind: definition
- questions: Q1 · load-bearing: yes (the chapter's starting definition)
- support: S-r1-foundations-01/P1 · rung 1 · fit direct · upstream self
- scope: CPython (default build), as described in PEP 703 (2023)
- confidence: high · flags: none
- conflicts: none

### C-r1-foundations-02
- claim: PEP 703 proposed a CPython build configuration, the --disable-gil configure flag, that runs Python code without the GIL together with the changes needed to make the interpreter thread-safe, while the GIL build remains the default for CPython builds and python.org downloads.
- kind: definition
- questions: Q1 · load-bearing: yes (what the free-threaded build is)
- support: S-r1-foundations-01/P2 · rung 1 · fit direct · upstream self
- support: S-r1-foundations-01/P3 · rung 1 · fit direct · upstream self
- support: S-r1-foundations-04/P2 · rung 1 · fit direct · upstream self (current docs: --disable-gil configure option builds the free-threaded interpreter)
- scope: PEP 703 (proposal, 2023); current docs (3.15.1) confirm the flag
- confidence: high · flags: none
- conflicts: none

### C-r1-foundations-03
- claim: A CPython built with --disable-gil defines the Py_GIL_DISABLED macro, and its ABI tag includes the letter "t" (for "threading").
- kind: fact
- questions: Q1 · load-bearing: yes (naming: the "t" suffix)
- support: S-r1-foundations-01/P4 · rung 1 · fit direct · upstream self
- support: S-r1-foundations-05/P6 · rung 1 · fit partial · upstream self (3.13: the free-threaded build generates python-3.13t.pc)
- scope: PEP 703 specification; 3.13 build output
- confidence: high · flags: none
- conflicts: none

### C-r1-foundations-04
- claim: In Python 3.13 the free-threaded mode requires a different executable, usually called python3.13t (python3.13t.exe on Windows), available from the official Windows and macOS installers or by building CPython from source with --disable-gil.
- kind: fact
- questions: Q1 · load-bearing: yes (how the build is named and obtained)
- support: S-r1-foundations-05/P1 · rung 1 · fit direct · upstream self
- scope: Python 3.13 release notes
- confidence: high · flags: none
- conflicts: none

### C-r1-foundations-05
- claim: Free-threaded builds of CPython can optionally run with the GIL enabled at runtime, using the PYTHON_GIL environment variable or the -X gil command-line option (-X gil=1 enables it, -X gil=0 disables it).
- kind: behaviour
- questions: Q1 · load-bearing: yes (what is kept: the GIL as a runtime option)
- support: S-r1-foundations-04/P3 · rung 1 · fit direct · upstream self
- support: S-r1-foundations-05/P2 · rung 1 · fit direct · upstream self
- support: S-r1-foundations-05/P5 · rung 1 · fit direct · upstream self
- scope: CPython 3.13 and later free-threaded builds
- confidence: high · flags: none
- conflicts: S-r1-foundations-01/P35 "setting the PYTHONGIL environment variable" (PEP 703 proposal named it PYTHONGIL; the shipped docs name it PYTHON_GIL — design vs implementation)

### C-r1-foundations-06
- claim: In a free-threaded build, importing a C-API extension module that is not explicitly marked as supporting free threading can automatically enable the GIL, and a warning is printed.
- kind: behaviour
- questions: Q1 · load-bearing: yes (why a "free-threaded" process may still have a GIL)
- support: S-r1-foundations-04/P4 · rung 1 · fit direct · upstream self
- support: S-r1-foundations-05/P5 · rung 1 · fit direct · upstream self
- support: S-r1-foundations-01/P34 · rung 1 · fit direct · upstream self (PEP 703 design: Py_mod_gil slot; interpreter pauses threads, enables GIL, warns)
- scope: CPython 3.13+ free-threaded builds
- confidence: high · flags: none
- conflicts: none

### C-r1-foundations-07
- claim: To tell a free-threaded interpreter apart, python -VV and sys.version contain "free-threading build" (in 3.13: "experimental free-threading build"), sys._is_gil_enabled() reports whether the GIL is actually disabled in the running process, and sysconfig.get_config_var("Py_GIL_DISABLED") set to 1 is the recommended check for whether the build supports free threading.
- kind: behaviour
- questions: Q1 · load-bearing: yes (how to identify the build)
- support: S-r1-foundations-04/P5 · rung 1 · fit direct · upstream self
- support: S-r1-foundations-04/P6 · rung 1 · fit direct · upstream self
- support: S-r1-foundations-05/P3 · rung 1 · fit direct · upstream self (3.13 wording)
- scope: current docs (3.15.1); 3.13 release notes for the "experimental" wording
- confidence: high · flags: none
- conflicts: none

### C-r1-foundations-08
- claim: The free-threaded build aims to provide thread-safety behaviour at the Python level similar to the default GIL build: built-in types such as dict, list and set use internal locks to protect against concurrent modification, but the docs recommend using threading.Lock or other synchronization primitives rather than relying on those internal locks.
- kind: behaviour
- questions: Q1 · load-bearing: yes (what is kept for Python code)
- support: S-r1-foundations-04/P7 · rung 1 · fit direct · upstream self
- support: S-r1-foundations-04/P8 · rung 1 · fit direct · upstream self
- scope: current docs (3.15.1)
- confidence: high · flags: none
- conflicts: none

### C-r1-foundations-09
- claim: According to PEP 703, the GIL never guaranteed that concurrent operations are atomic or correct, and the per-object locks that replace it provide weaker protections than the GIL, aiming for similar protection with mutual exclusion limited to individual objects.
- kind: interpretation
- questions: Q1, Q4 · load-bearing: yes (corrects the reader's mental model of what the GIL guaranteed)
- support: S-r1-foundations-01/P22 · rung 1 · fit direct · upstream self
- support: S-r1-foundations-01/P24 · rung 1 · fit direct · upstream self
- scope: PEP 703 design (attributed form; rung 1 for the design's own statement)
- confidence: high · flags: none
- conflicts: none

### C-r1-foundations-10
- claim: PEP 703 states that CPython builds without the GIL are not ABI compatible with the standard build or with the stable ABI, because the object header changes for biased reference counting, so C-API extensions must be rebuilt for the free-threaded build.
- kind: fact
- questions: Q1 · load-bearing: yes (what changes for dependencies)
- support: S-r1-foundations-01/P36 · rung 1 · fit direct · upstream self
- support: S-r1-foundations-05/P4 · rung 1 · fit direct · upstream self (3.13: extensions "need to be built specifically for the free-threaded build")
- scope: PEP 703 (2023) and 3.13; the SC expected a free-threaded Stable ABI for 3.15 (C-r1-foundations-35), not verified here
- confidence: high · flags: none
- conflicts: none

### C-r1-foundations-11
- claim: In the free-threaded design, threads move between ATTACHED and DETACHED states where they previously acquired and released the GIL, and multiple threads can be attached at the same time, whereas only one thread could hold the GIL at a time.
- kind: behaviour
- questions: Q4 · load-bearing: yes (what "removing the GIL" means mechanically)
- support: S-r1-foundations-01/P18 · rung 1 · fit direct · upstream self
- support: S-r1-foundations-01/P19 · rung 1 · fit direct · upstream self
- scope: PEP 703 design
- confidence: high · flags: none
- conflicts: none

### C-r1-foundations-12
- claim: PEP 703 makes reference counting thread-safe with three techniques: biased reference counting (cheaper than plain atomic reference counting), immortalization, and a limited form of deferred reference counting.
- kind: fact
- questions: Q4 · load-bearing: yes (overview of the memory-safety mechanisms)
- support: S-r1-foundations-01/P6 · rung 1 · fit direct · upstream self
- scope: PEP 703 design
- confidence: high · flags: none
- conflicts: none

### C-r1-foundations-13
- claim: Biased reference counting, first described in 2018 by Jiho Choi, Thomas Shull and Josep Torrellas, gives each object an owning thread that updates a "local" reference count with non-atomic instructions, while other threads update a separate "shared" count with atomic instructions, based on the observation that most objects are accessed by only one thread.
- kind: definition
- questions: Q4 · load-bearing: yes
- support: S-r1-foundations-01/P7 · rung 1 · fit direct · upstream self
- support: S-r1-foundations-04/P15 · rung 1 · fit partial · upstream self (current docs: fast path for objects owned by the current thread, slow path for others)
- scope: PEP 703 design; current implementation per docs
- confidence: high · flags: none
- conflicts: none

### C-r1-foundations-14
- claim: In PEP 703's object header, the fields ob_tid (owning thread), ob_ref_local and ob_ref_shared serve biased reference counting, and the ob_mutex field provides a per-object lock in a single byte.
- kind: fact
- questions: Q4 · load-bearing: no (detail)
- support: S-r1-foundations-01/P8 · rung 1 · fit direct · upstream self
- scope: PEP 703 proposed struct
- confidence: high · flags: none
- conflicts: none

### C-r1-foundations-15
- claim: Immortal objects are never deallocated and their reference counts are never modified (Py_INCREF and Py_DECREF are no-ops on them), which avoids reference-count contention when many threads use the same objects.
- kind: behaviour
- questions: Q4 · load-bearing: yes
- support: S-r1-foundations-01/P10 · rung 1 · fit direct · upstream self
- support: S-r1-foundations-04/P9 · rung 1 · fit direct · upstream self
- scope: free-threaded build
- confidence: high · flags: none
- conflicts: none

### C-r1-foundations-16
- claim: PEP 703 lists interned strings, small integers, statically allocated type objects, and True, False and None as objects that live for the whole program and are marked immortal; the current docs say that, as of 3.14, immortalization in the free-threaded build is limited to code constants (numeric, string and constant-tuple literals) and strings interned by sys.intern().
- kind: fact
- questions: Q4 · load-bearing: no (detail; scope differs between design and docs)
- support: S-r1-foundations-01/P9 · rung 1 · fit direct · upstream self
- support: S-r1-foundations-04/P10 · rung 1 · fit direct · upstream self
- scope: PEP 703 (2023) vs docs "as of the 3.14 release"; the docs list appears to describe the extra immortalization specific to the free-threaded build, not singletons like None (not stated outright; leave the two lists attributed)
- confidence: medium · flags: none
- conflicts: see Conflicts (scope)

### C-r1-foundations-17
- claim: With deferred reference counting, the interpreter skips reference-count updates for references held on Python function stacks for selected objects that many threads touch, so such objects can only be freed by the cyclic garbage collector rather than when their count reaches zero.
- kind: behaviour
- questions: Q4 · load-bearing: yes
- support: S-r1-foundations-01/P11 · rung 1 · fit direct · upstream self
- support: S-r1-foundations-01/P12 · rung 1 · fit direct · upstream self
- support: S-r1-foundations-01/P13 · rung 1 · fit direct · upstream self
- support: S-r1-foundations-04/P16 · rung 1 · fit direct · upstream self
- scope: PEP 703 design; current docs
- confidence: high · flags: none
- conflicts: none

### C-r1-foundations-18
- claim: The current docs list module objects, module top-level functions, class methods defined in the class scope, descriptor objects and threading.local objects as the types that use deferred reference counting in the free-threaded build.
- kind: fact
- questions: Q4 · load-bearing: no
- support: S-r1-foundations-04/P17 · rung 1 · fit direct · upstream self
- scope: current docs (3.15.1)
- confidence: high · flags: none
- conflicts: none

### C-r1-foundations-19
- claim: The free-threaded build also uses per-thread reference counting, in which each thread keeps its own local reference-count array indexed by an id assigned to the object, currently for heap type objects (classes created in Python), code objects and module __dict__ objects.
- kind: behaviour
- questions: Q4 · load-bearing: no
- support: S-r1-foundations-04/P18 · rung 1 · fit direct · upstream self
- support: S-r1-foundations-04/P19 · rung 1 · fit direct · upstream self
- support: S-r1-foundations-01/P14 · rung 1 · fit partial · upstream self (PEP 703: heap type counts in per-thread arrays)
- scope: current docs (3.15.1)
- confidence: high · flags: none
- conflicts: none

### C-r1-foundations-20
- claim: The free-threaded build replaces CPython's pymalloc allocator, which is not thread-safe without the GIL, with mimalloc, a thread-safe general-purpose allocator, for all Python objects.
- kind: fact
- questions: Q4 · load-bearing: yes
- support: S-r1-foundations-01/P15 · rung 1 · fit direct · upstream self
- support: S-r1-foundations-04/P13 · rung 1 · fit direct · upstream self
- scope: PEP 703 design; current docs
- confidence: high · flags: none
- conflicts: none

### C-r1-foundations-21
- claim: PEP 703 uses mimalloc also so that the garbage collector can find all Python objects by walking mimalloc's structures instead of a linked list, and so that collections like dict can usually avoid locks on read-only operations.
- kind: fact
- questions: Q4 · load-bearing: no
- support: S-r1-foundations-01/P16 · rung 1 · fit direct · upstream self
- scope: PEP 703 design
- confidence: high · flags: none
- conflicts: none

### C-r1-foundations-22
- claim: PEP 703 gives every list, dict and set a lightweight per-object lock that all modifying operations must hold, to provide many of the protections the GIL provided.
- kind: behaviour
- questions: Q4 · load-bearing: yes
- support: S-r1-foundations-01/P23 · rung 1 · fit direct · upstream self
- support: S-r1-foundations-04/P7 · rung 1 · fit partial · upstream self (docs: built-in types use internal locks)
- scope: PEP 703 design; current docs
- confidence: high · flags: none
- conflicts: none

### C-r1-foundations-23
- claim: Because nested per-object locking could deadlock where the GIL did not, PEP 703 adds "Python critical sections", which implicitly release (suspend) a thread's per-object locks when the thread would block, i.e. where it would have released the GIL.
- kind: behaviour
- questions: Q4 · load-bearing: yes
- support: S-r1-foundations-01/P25 · rung 1 · fit direct · upstream self
- support: S-r1-foundations-01/P26 · rung 1 · fit direct · upstream self
- support: S-r1-foundations-01/P27 · rung 1 · fit direct · upstream self
- scope: PEP 703 design
- confidence: high · flags: none
- conflicts: none

### C-r1-foundations-24
- claim: Some dict and list read operations (item access and iteration) take an optimistic lock-free fast path and fall back to taking the container's lock only when another thread is modifying it concurrently; the scheme relies on mimalloc and is similar to read-copy update (RCU) in the Linux kernel.
- kind: behaviour
- questions: Q4 · load-bearing: yes
- support: S-r1-foundations-01/P28 · rung 1 · fit direct · upstream self
- support: S-r1-foundations-01/P29 · rung 1 · fit direct · upstream self
- support: S-r1-foundations-01/P30 · rung 1 · fit direct · upstream self
- scope: PEP 703 design
- confidence: high · flags: none
- conflicts: none

### C-r1-foundations-25
- claim: To make lock-free data structures safe, the free-threaded build uses a safe memory reclamation scheme called quiescent state-based reclamation (QSBR), which defers freeing the memory behind structures such as the list object and the dictionary keys object instead of freeing it immediately; gc.collect() should free memory held by QSBR.
- kind: behaviour
- questions: Q4 · load-bearing: yes
- support: S-r1-foundations-04/P11 · rung 1 · fit direct · upstream self
- support: S-r1-foundations-04/P12 · rung 1 · fit direct · upstream self
- support: S-r1-foundations-02/P6 · rung 1 · fit partial · upstream self (PEP 779: lockless list and dict APIs rely on QSBR)
- scope: current docs (3.15.1); PEP 779 (2025)
- confidence: high · flags: none
- conflicts: none

### C-r1-foundations-26
- claim: Without the GIL, the cyclic garbage collector pauses all threads running Python code ("stop-the-world") so that references and reference counts stay stable during cycle detection, and PEP 703 makes the collector non-generational to reduce the impact of those pauses.
- kind: behaviour
- questions: Q4 · load-bearing: no
- support: S-r1-foundations-01/P17 · rung 1 · fit direct · upstream self
- support: S-r1-foundations-01/P20 · rung 1 · fit direct · upstream self
- scope: PEP 703 design
- confidence: high · flags: none
- conflicts: none

### C-r1-foundations-27
- claim: PEP 703 makes the specializing interpreter thread-safe by guarding specialization with a mutex and, in multi-threaded programs running without the GIL, specializing each bytecode only once so that no thread reads a partially written inline cache.
- kind: behaviour
- questions: Q4 · load-bearing: yes
- support: S-r1-foundations-01/P32 · rung 1 · fit direct · upstream self
- support: S-r1-foundations-01/P33 · rung 1 · fit direct · upstream self
- scope: PEP 703 design (2023)
- confidence: high · flags: none
- conflicts: none

### C-r1-foundations-28
- claim: According to the Python 3.14 release notes, the PEP 703 implementation was finished in 3.14, including C API changes, temporary interpreter workarounds were replaced with more permanent solutions, and the specializing adaptive interpreter (PEP 659) is now enabled in free-threaded mode.
- kind: fact
- questions: Q4, Q2 · load-bearing: yes (version boundary between 3.13 and 3.14)
- support: S-r1-foundations-06/P1 · rung 1 · fit direct · upstream self
- scope: Python 3.14; "now enabled" implies it was not enabled in the 3.13 free-threaded build, but the passage does not say so outright
- confidence: high · flags: none
- conflicts: none

### C-r1-foundations-29
- claim: PEP 703 notes Python-visible side effects of the new reference counting: destructors and weak-reference callbacks for code objects and top-level functions are delayed until the next cyclic garbage collection, and the docs note that free-threaded objects such as None take 32 bytes versus 16 bytes in the default build on AMD64.
- kind: behaviour
- questions: Q4 · load-bearing: no
- support: S-r1-foundations-01/P37 · rung 1 · fit direct · upstream self
- support: S-r1-foundations-04/P20 · rung 1 · fit direct · upstream self
- scope: PEP 703 design; current docs, AMD64
- confidence: high · flags: none
- conflicts: none

### C-r1-foundations-30
- claim: PEP 703, "Making the Global Interpreter Lock Optional in CPython", was written by Sam Gross, created on 9 January 2023, targeted Python 3.13, and records a resolution date of 24 October 2023.
- kind: date
- questions: Q2 · load-bearing: yes
- support: S-r1-foundations-01/P43 · rung 1 · fit direct · upstream self
- scope: PEP header (Status: Final)
- confidence: high · flags: none
- conflicts: none

### C-r1-foundations-31
- claim: On 28 July 2023 the Python Steering Council announced its intent to accept PEP 703 and laid out three stages: short term, an experimental no-GIL build mode, presumably in 3.13; mid term, a supported but not yet default build, once community support makes production use viable; long term, no-GIL as the default with any vestiges of the GIL removed.
- kind: fact
- questions: Q2 · load-bearing: yes
- support: S-r1-foundations-03/P1 · rung 1 · fit direct · upstream self
- support: S-r1-foundations-03/P5 · rung 1 · fit direct · upstream self
- support: S-r1-foundations-03/P6 · rung 1 · fit direct · upstream self
- support: S-r1-foundations-03/P7 · rung 1 · fit direct · upstream self
- support: S-r1-foundations-02/P1 · rung 1 · fit direct · upstream S-r1-foundations-03 (PEP 779 restates the three phases)
- scope: SC notice of intent, July 2023
- confidence: high · flags: none
- conflicts: none

### C-r1-foundations-32
- claim: In its July 2023 notice the Steering Council said the no-GIL build should long term (probably 5+ years) be the only build, that it did not want a permanent split between builds or "another Python 3 situation" ("This is not Python 4"), and that it reserved the right to roll the work back before making no-GIL the default if it proved too disruptive for too little gain.
- kind: fact
- questions: Q2 · load-bearing: yes
- support: S-r1-foundations-03/P2 · rung 1 · fit direct · upstream self
- support: S-r1-foundations-03/P3 · rung 1 · fit direct · upstream self
- support: S-r1-foundations-03/P4 · rung 1 · fit direct · upstream self
- scope: SC statement, July 2023
- confidence: high · flags: none
- conflicts: none

### C-r1-foundations-33
- claim: Python 3.13 shipped the free-threaded mode as experimental and not enabled by default (phase I).
- kind: fact
- questions: Q2 · load-bearing: yes
- support: S-r1-foundations-05/P1 · rung 1 · fit direct · upstream self
- support: S-r1-foundations-02/P1 · rung 1 · fit direct · upstream self
- scope: Python 3.13
- confidence: high · flags: none
- conflicts: none

### C-r1-foundations-34
- claim: PEP 779 (Thomas Wouters, Matt Page, Sam Gross; created March 2025) set the criteria for phase II, making the free-threaded build officially supported, including a hard performance target of 15% slowdown and a memory-use target of 20% (geometric mean on pyperformance).
- kind: fact
- questions: Q2 · load-bearing: yes
- support: S-r1-foundations-02/P2 · rung 1 · fit direct · upstream self
- support: S-r1-foundations-02/P3 · rung 1 · fit direct · upstream self
- support: S-r1-foundations-02/P4 · rung 1 · fit direct · upstream self
- scope: PEP 779 as proposed (criteria, not measurements)
- confidence: high · flags: none
- conflicts: none

### C-r1-foundations-35
- claim: The Steering Council approved PEP 779 on 15 June 2025, removing the "experimental" tag from the free-threaded build of Python 3.14 (from 3.14 beta 3), and set phase II requirements including a Stable ABI for free-threading prepared for Python 3.15, an official target of staying within 10% performance degradation (changes up to 15% to be discussed with the SC), and memory increases below 15% (hard limit 20%).
- kind: fact
- questions: Q2, Q16 · load-bearing: yes
- support: S-r1-foundations-07/P1 · rung 1 · fit direct · upstream self
- support: S-r1-foundations-07/P8 · rung 1 · fit direct · upstream self
- support: S-r1-foundations-07/P2 · rung 1 · fit direct · upstream self
- support: S-r1-foundations-07/P4 · rung 1 · fit direct · upstream self
- support: S-r1-foundations-07/P5 · rung 1 · fit direct · upstream self
- scope: SC acceptance post, 15 June 2025 (PEP header gives resolution 16-Jun-2025, likely a timezone difference)
- confidence: high · flags: none
- conflicts: none

### C-r1-foundations-36
- claim: In Python 3.14 the free-threaded build is officially supported and no longer experimental, which is the start of phase II: officially supported but still optional.
- kind: fact
- questions: Q2 · load-bearing: yes
- support: S-r1-foundations-06/P2 · rung 1 · fit direct · upstream self
- scope: Python 3.14
- confidence: high · flags: none
- conflicts: none

### C-r1-foundations-37
- claim: The Steering Council said in June 2025 that free-threading is a supported Python build option now and into the future and will not be removed without following a proper deprecation schedule.
- kind: fact
- questions: Q2 · load-bearing: no
- support: S-r1-foundations-07/P7 · rung 1 · fit direct · upstream self
- scope: SC statement, June 2025
- confidence: high · flags: none
- conflicts: none

### C-r1-foundations-38
- claim: PEP 703 lists earlier GIL-removal efforts, including Greg Stein's 1996 patch against Python 1.4 and Larry Hastings's Gilectomy, and its own reference implementation, the "nogil" fork based on Python 3.9.10.
- kind: fact
- questions: Q2 · load-bearing: no (background history)
- support: S-r1-foundations-01/P38 · rung 1 · fit direct · upstream self
- support: S-r1-foundations-01/P39 · rung 1 · fit direct · upstream self
- support: S-r1-foundations-01/P40 · rung 1 · fit direct · upstream self
- scope: as described in PEP 703 (attributed)
- confidence: high · flags: none
- conflicts: none

### C-r1-foundations-39
- claim: The Python 3.14 release notes say the free-threaded builds do not support the experimental JIT compiler.
- kind: fact
- questions: Q1 · load-bearing: no
- support: S-r1-foundations-06/P4 · rung 1 · fit direct · upstream self
- scope: Python 3.14
- confidence: high · flags: none
- conflicts: none

### C-r1-foundations-40
- claim: As of the Steering Council's PEP 779 acceptance (June 2025) and the Python 3.14 release notes, any decision to move to phase III, with free-threading as the default or sole build, was still undecided and dependent on many factors within CPython and the community.
- kind: fact
- questions: Q16 · load-bearing: no
- support: S-r1-foundations-07/P9 · rung 1 · fit direct · upstream self
- support: S-r1-foundations-06/P3 · rung 1 · fit direct · upstream S-r1-foundations-07 (same wording)
- scope: June 2025 / 3.14; no later rung-1 statement found as of 2026-10-23
- confidence: medium (no 2026 source checked for a change) · flags: none
- conflicts: none

### C-r1-foundations-41
- claim: PEP 779 says the phase III decision (making free-threaded Python the default) is very different from entering phase II, is expected to revolve around community support, willingness and showing clear benefit, and is left for a future PEP.
- kind: fact
- questions: Q16 · load-bearing: no
- support: S-r1-foundations-02/P5 · rung 1 · fit direct · upstream self
- support: S-r1-foundations-02/P7 · rung 1 · fit partial · upstream self (supported status as a step towards default and eventually only build)
- scope: PEP 779 (2025)
- confidence: high · flags: none
- conflicts: none

### C-r1-foundations-42
- claim: The Steering Council required that new experimental projects within CPython be compatible with, and should be based on, the free-threading build, and asked the core team to begin proposing higher-level concurrency primitives that users can use safely without a deep understanding of threading.
- kind: fact
- questions: Q16 · load-bearing: no
- support: S-r1-foundations-07/P3 · rung 1 · fit direct · upstream self
- support: S-r1-foundations-07/P6 · rung 1 · fit direct · upstream self
- scope: SC, June 2025
- confidence: high · flags: none
- conflicts: none

### C-r1-foundations-43
- claim: PEP 703's author sketched, as an open issue rather than a plan, a possible path in which CPython in 2026–2027 controls the GIL with a runtime flag (enabled by default, single ABI) and in 2028–2030 switches to the GIL disabled by default.
- kind: prediction
- questions: Q16 · load-bearing: no
- support: S-r1-foundations-01/P41 · rung 1 · fit direct · upstream self
- support: S-r1-foundations-01/P42 · rung 1 · fit direct · upstream self
- scope: PEP 703 "Open Issues: Python Build Modes" (2023); attributed speculation only
- confidence: low (as a forecast) · flags: speculation
- conflicts: none

### C-r1-foundations-44
- claim: In July 2023 the Steering Council estimated it may take as much as five years to reach the stage where no-GIL is the default.
- kind: prediction
- questions: Q16 · load-bearing: no
- support: S-r1-foundations-03/P8 · rung 1 · fit direct · upstream self
- scope: SC estimate, July 2023
- confidence: low (as a forecast) · flags: speculation
- conflicts: none

## Conflicts
- C-r1-foundations-05: S-r1-foundations-01/P35 (PEP 703) names the runtime override "PYTHONGIL"; S-r1-foundations-04/P3 and S-r1-foundations-05/P2 (docs) name it "PYTHON_GIL" (both quoted above). Nature: version/time (proposal vs shipped implementation); not settled.
- C-r1-foundations-16 / C-r1-foundations-20: S-r1-foundations-01/P31 (PEP 703) says "three mimalloc heaps for Python objects"; S-r1-foundations-04/P14 (docs) says mimalloc manages "separate heaps (currently four)" (both quoted above). Nature: version/time or scope (Python-object heaps vs all heaps); not settled.
- C-r1-foundations-16: S-r1-foundations-01/P9 lists interned strings, small integers, static types, True/False/None as immortal; S-r1-foundations-04/P10 says "As of the 3.14 release, immortalization is limited to" code constants and sys.intern() strings. Nature: scope (likely general immortals vs FT-specific immortalization); not settled.

## Speculation and flags
- C-r1-foundations-43: speculation — PEP 703 "a possible path might look like the following" ("After 2–3 releases, (i.e., in 2026–2027)…"); an author's sketch, not an SC plan.
- C-r1-foundations-44: speculation — SC "We think it may take as much as five years".
- S-r1-foundations-02: PEP 779 authors include Sam Gross (PEP 703 author) and Thomas Wouters (2023 SC member); the PEP itself flags the overlap. Its performance numbers are self-reported targets/measurements (evidence angle).
- S-r1-foundations-01: written by the implementer; its overhead table (6–8%, 2023, nogil-3.12) is vendor-about-itself and superseded — left to the evidence angle.

## Unused leads
- https://discuss.python.org/t/pep-803-round-two-abi3t-stable-abi-for-free-threaded-builds/106181 — PEP 803 "abi3t" Stable ABI for free-threaded builds; search snippet says approved in 2026 (practice angle owns C-API/wheels).
- https://docs.python.org/3/howto/free-threading-python.html § "Single-threaded performance" — current overhead "about 1% on macOS aarch64 to 8% on x86-64 Linux" (evidence angle).
- https://docs.python.org/3/whatsnew/3.14.html § "Free-threaded mode improvements" — "single-threaded code … roughly 5-10%" and thread_inherit_context / context_aware_warnings flags (evidence / practice angles).
- https://peps.python.org/pep-0703/ § "Container Thread-Safety" lists which list/dict operations lock one or two objects; § "Borrowed References" (C-API, practice angle).
- https://discuss.python.org/t/will-the-free-threading-python-build-become-the-default/60036 — community thread on phase III (rung 3 forum, pointer only).
- https://docs.python.org/3/whatsnew/3.15.html — not opened; may state 3.15 free-threading status (practice angle owns current release status).

## Queries
- "PEP free-threaded default build phase III" → nothing new (rung-3 blogs only; restated PEP 779)
- "discuss.python.org 2026 making free-threaded build the default PEP" → nothing new for Phase III (pointer to PEP 803 thread and PEP 779 acceptance post, which was then opened)
- direct fetches of known rung-1 URLs (PEP 703, PEP 779, SC notice, howto, What's New 3.13/3.14) → useful
