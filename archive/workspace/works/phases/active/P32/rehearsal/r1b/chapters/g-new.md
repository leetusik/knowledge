---
title: "Free-threaded CPython: what it is, how it works, and whether to use it today"
date: 2026-10-23
format: native
syntax: 1
lang: en
subject: "Python"
summary: "Python can now run threads in parallel without the GIL. What the free-threaded build is, how CPython stays safe without the lock, what it costs, and what changes for your code and your dependencies."
tags:
  - python
  - free-threading
  - gil
  - concurrency
source:
  project: python
  repo: work
---

Free-threaded CPython is a build of Python in which threads can run Python code on several CPU cores at once. This chapter is for someone who writes web services and data scripts, uses threads, asyncio or multiprocessing, and knows the GIL as "one thread runs Python at a time". By the end you should be able to decide whether to try the build now, install it and prove the GIL is really off, check whether your dependencies keep it off, and know what to change in your own code.

## Background {#background}

> [!SKIP] Skip this if you already know threads, processes and race conditions
> A **thread** is a line of execution inside one process; all threads of a process share its objects. A **process** is a separate program instance; Thomas Wouters, a CPython core developer, points out that processes do not share address spaces, so data has to be copied between them ([LWN, 2026](#s-r1-criticism-09)). In this chapter a **race condition** means a result that depends on how two threads' steps happen to interleave.

### What the GIL did {#the-gil}

CPython's global interpreter lock (GIL) prevents multiple threads from executing Python code at the same time, and PEP 703 calls it an obstacle to using multi-core CPUs efficiently ([PEP 703](#s-r1-foundations-01)). Four threads doing pure-Python arithmetic therefore take turns rather than running at once.

**For a service that mostly waits on the network or a database, the GIL was never the whole story.** The Python glossary says the GIL is always released when doing I/O, and that some extension modules release it during computationally intensive tasks such as compression or hashing ([Glossary](#s-r2-evidence-03)). That is why the threading documentation still calls threads an appropriate model for running many I/O-bound tasks at once, while advising `multiprocessing` or `ProcessPoolExecutor` to make better use of multi-core machines ([threading docs](#s-r2-evidence-04)).

### How its removal was planned {#plan}

The design is PEP 703, "Making the Global Interpreter Lock Optional in CPython", written by Sam Gross, created on 9 January 2023 and resolved on 24 October 2023 ([PEP 703](#s-r1-foundations-01)). It proposed a build configuration, the `--disable-gil` configure flag, that runs Python code without the GIL along with the changes needed to make the interpreter thread-safe, while the GIL build stays the default for CPython builds and python.org downloads ([PEP 703](#s-r1-foundations-01)).

In July 2023 the Python Steering Council announced that it intended to accept PEP 703 and set out three stages: an experimental no-GIL build, then a supported but not yet default build, then no-GIL as the default ([Steering Council notice](#s-r1-foundations-03)). It added that it did not want a permanent split between the two builds or "another Python 3 situation" ("This is not Python 4"), and that it could roll the work back before the default changed if it proved too disruptive for too little gain ([Steering Council notice](#s-r1-foundations-03)).

PEP 779 names those stages phases: phase I makes the build available but explicitly experimental, phase II makes it officially supported but still optional, and phase III makes it the default ([PEP 779](#s-r1-foundations-02)). Python 3.13 shipped phase I, experimental and not enabled by default ([What's New in 3.13](#s-r1-foundations-05)). The Steering Council approved PEP 779 on 15 June 2025, removing the "experimental" tag for Python 3.14 ([SC acceptance](#s-r1-foundations-07)), and in 3.14 the build is officially supported, the start of phase II ([What's New in 3.14](#s-r1-foundations-06)). Python 3.15 was released on 9 October 2026 ([What's New in 3.15](#s-r1-practice-05)).

```diagram #timeline-phases
kind: timeline
title: From PEP 703 to Python 3.15
caption: Decisions above, releases below. Phase III (free threading as the default) has no date; it is undecided.
axis:
  unit: year
  from: 2023
  to: 2027
  ticks: [2023, 2024, 2025, 2026, 2027]
lanes:
  - label: Decisions
    bars: []
    marks:
      - {at: 2023.57, label: "Steering Council intends to accept PEP 703 (Jul 2023)"}
      - {at: 2023.81, label: "PEP 703 resolved (Oct 2023)"}
      - {at: 2025.45, label: "Steering Council accepts PEP 779 (Jun 2025)"}
  - label: Releases
    bars:
      - {from: 2024.79, to: 2025.79, label: "Phase I: 3.13, experimental", tone: muted}
      - {from: 2025.79, to: 2026.77, label: "Phase II starts: 3.14, supported but optional", tone: accent}
    marks:
      - {at: 2024.79, label: "3.13 (Oct 2024)"}
      - {at: 2025.79, label: "3.14 (Oct 2025)"}
      - {at: 2026.77, label: "3.15 (9 Oct 2026)"}
```

Whether and when phase III comes is open. The Steering Council's acceptance and the 3.14 release notes both say the move to free threading as the default or sole build is still undecided and depends on many factors in CPython and the community ([SC acceptance](#s-r1-foundations-07), [What's New in 3.14](#s-r1-foundations-06)), and PEP 779 leaves it to a future PEP, expected to turn on community support, willingness and showing clear benefit ([PEP 779](#s-r1-foundations-02)).

> [!NOTE]- Earlier attempts, and forecasts that are not decisions
> PEP 703 lists earlier GIL-removal efforts, including Greg Stein's 1996 patch against Python 1.4 and Larry Hastings's Gilectomy, and points to two reference repositories, nogil-3.12 (based on Python 3.12.0a4) and nogil (based on Python 3.9.10) ([PEP 703](#s-r1-foundations-01)).
>
> Three forecasts are often repeated. PEP 703's author sketched, as an open issue rather than a plan, a path with a runtime flag in 2026–2027 (GIL enabled by default) and the GIL disabled by default in 2028–2030 ([PEP 703](#s-r1-foundations-01)). The Steering Council estimated in 2023 that reaching the default could take as much as five years ([Steering Council notice](#s-r1-foundations-03)). Wouters said in 2026 that he suspects Linux distributors such as Red Hat and Debian, and companies like Meta, will enable free threading as the default before the Python project does ([LWN, 2026](#s-r1-criticism-09)).

## Intuition {#intuition}

Here is the picture to keep in mind: one CPU-bound job, four threads.

```python title="toy: four threads, one CPU-bound job each"
import threading

def count_primes(limit):
    found = 0
    for n in range(2, limit):
        if all(n % d for d in range(2, int(n ** 0.5) + 1)):
            found += 1
    return found

threads = [threading.Thread(target=count_primes, args=(200_000,)) for _ in range(4)]
for t in threads:
    t.start()
for t in threads:
    t.join()
```

On the default build only one of these threads can execute Python code at once, so the four take turns ([threading docs](#s-r2-evidence-04)). A free-threaded build can disable the GIL, which lets the threads execute in true parallel; the threading documentation adds that this is not available by default ([threading docs](#s-r2-evidence-04)).

One dated measurement shows the shape. In Anthony Shaw's PyCon US 2024 benchmark, computing pi to 2,000 digits on a four-core machine with Python 3.13 beta 1, the threaded version went from 2.41 s with the GIL to 0.75 s without it, while the multiprocessing version went from 1.2 s to 1.57 s ([LWN, 2024](#s-r1-evidence-08)). That is a pre-release interpreter from 2024; how much the single-thread cost has changed since is in [Should you try it today?](#today).

```diagram #shaw-bench
kind: chart
title: Pi to 2,000 digits on four cores, Python 3.13 beta 1 (Shaw, PyCon US 2024)
caption: Seconds, lower is better. Threads got about three times faster without the GIL; multiprocessing got slower. One micro-benchmark on a pre-release interpreter, as reported by LWN.
type: bar
x:
  label: Approach
  categories: [Threads, Multiprocessing]
y:
  label: Seconds
  min: 0
series:
  - {name: With the GIL, values: [2.41, 1.2], tone: series-1}
  - {name: Without the GIL, values: [0.75, 1.57], tone: series-2}
```

**Parallel threads do not make shared state safe.** The porting guide in the community-maintained Python Free-Threading Guide (written by Quansight Labs and open-source contributors, not by CPython) has a `RaceyCounter` example that reads a shared value, sleeps, and writes it back from several threads; its output varies randomly on both the free-threaded and the GIL-enabled build, while the same counter guarded by a `threading.Lock` always prints 1000 ([porting guide](#s-r1-criticism-02)). The guide puts it plainly: the interpreter protects you from low-level memory unsafety caused by data races, but not from race conditions in your own code ([porting guide](#s-r1-criticism-02)). PEP 703 makes the same point about the past: the GIL does not necessarily ensure that concurrent operations are atomic or correct ([PEP 703](#s-r1-foundations-01)).

> [!IMPORTANT] The key idea
> Free threading changes *when* your threads run, not what your code means. Built-in `dict`, `list` and `set` still use internal locks so that concurrent changes do not corrupt them, much as the GIL did, according to CPython's own free-threading HOWTO ([free-threading HOWTO](#s-r1-foundations-04)), but a multi-step operation of yours is no more atomic than it was ([porting guide](#s-r1-criticism-02)).

## How it works {#how-it-works}

Without the GIL, something else has to protect the interpreter's own data. In PEP 703's design a thread is either *attached* or *detached*, the states that correspond to holding and releasing the GIL, and the difference is that many threads can be attached at the same time where only one could hold the GIL ([PEP 703](#s-r1-foundations-01)). Everything below is how CPython stays memory-safe when they are. Where a paragraph cites PEP 703 it describes the 2023 design; the HOWTO describes the build as shipped.

### Reference counts {#refcounts}

PEP 703 proposes three techniques to make reference counting thread-safe: biased reference counting, immortalization, and a limited form of deferred reference counting ([PEP 703](#s-r1-foundations-01)).

- **Biased reference counting** rests on the observation that most objects are only touched by one thread. Each object has an owning thread that updates a "local" count with cheap non-atomic instructions; other threads update a separate "shared" count with atomic ones ([PEP 703](#s-r1-foundations-01)).
- **Immortal objects** are never freed and their counts are never changed, which avoids contention when many threads use the same objects ([free-threading HOWTO](#s-r1-foundations-04)).
- **Deferred reference counting** skips count updates for references held on Python function stacks, for a few kinds of objects that many threads touch, such as top-level functions and modules; such objects can then only be freed by the cyclic garbage collector ([PEP 703](#s-r1-foundations-01)).

### Memory and containers {#containers}

The free-threaded build replaces CPython's small-object allocator, pymalloc, which is not thread-safe without the GIL, with mimalloc, a thread-safe general-purpose allocator, for all Python objects ([free-threading HOWTO](#s-r1-foundations-04)).

Every `list`, `dict` and `set` gets a lightweight lock of its own that every modifying operation must hold ([PEP 703](#s-r1-foundations-01)). Locking objects one at a time could deadlock where the GIL never did, so PEP 703 adds "Python critical sections", which release a thread's per-object locks when the thread would block, at exactly the points where it would have released the GIL ([PEP 703](#s-r1-foundations-01)).

Reads take a shortcut. Some `dict` and `list` reads use an optimistic lock-free path and fall back to taking the container's lock only when another thread is changing it, a scheme PEP 703 compares to read-copy update in the Linux kernel ([PEP 703](#s-r1-foundations-01)). To make lock-free structures safe, the build uses quiescent state-based reclamation (QSBR), which delays freeing the memory behind structures such as list objects and dictionary keys; `gc.collect()` should free what QSBR holds ([free-threading HOWTO](#s-r1-foundations-04)).

### The interpreter itself {#interpreter}

PEP 703 makes the specializing interpreter (PEP 659) thread-safe by guarding specialization with a mutex and, without the GIL, specializing each bytecode only once, so that no thread reads a half-written inline cache ([PEP 703](#s-r1-foundations-01)). The cyclic garbage collector pauses every thread running Python code while it finds cycles ("stop-the-world"), and PEP 703 makes it non-generational to reduce the impact of those pauses ([PEP 703](#s-r1-foundations-01)). The 3.14 release notes say the PEP 703 implementation was finished in 3.14 and that the specializing adaptive interpreter is now enabled in free-threaded mode ([What's New in 3.14](#s-r1-foundations-06)).

```diagram #safety-stack
kind: stack
title: What replaces the GIL, from your code down
caption: Each layer is a mechanism named in PEP 703 or the free-threading HOWTO. Only the top layer is your responsibility.
layers:
  - label: Your code
    items: ["multi-step logic: your locks"]
    tone: warn
  - label: Built-in containers
    items: ["per-object locks", "critical sections", "lock-free reads + QSBR"]
    tone: accent
  - label: Object lifetime
    items: ["biased reference counting", "immortal objects", "deferred reference counting"]
    tone: default
  - label: Memory
    items: ["mimalloc allocator"]
    tone: store
  - label: Threads
    items: ["many threads attached at once"]
    tone: muted
```

## Should you try it today? {#today}

### Where it stands {#status}

In Python 3.14 and later the free-threaded build is officially supported and no longer experimental, but it is still optional ([What's New in 3.14](#s-r1-foundations-06)). The Steering Council said in June 2025 that it is a supported build option now and into the future and will not be removed without a proper deprecation schedule ([SC acceptance](#s-r1-foundations-07)). Python 3.15 added a stable ABI for free-threaded builds, and its official macOS binaries now install free-threading support by default ([What's New in 3.15](#s-r1-practice-05)); the release notes do not say that `python` itself then points at the free-threaded interpreter.

### What it costs {#costs}

**Expect to pay something on single-threaded code, and measure your own.** The project's own figures disagree, and the newest page gives no measurement date. Several are averages over pyperformance, a suite of Python benchmarks:

| Release | Who says | Single-thread slowdown |
|---|---|---|
| 3.13 | 3.13 HOWTO | about 40% on the pyperformance suite |
| 3.13 | Wouters, PyCon US 2026 | 20–40% |
| 3.14 | What's New in 3.14 | roughly 5–10%, by platform and C compiler |
| 3.14 (2025) | PEP 779 | around 10%, about 3% on macOS |
| 3.14 | Wouters, PyCon US 2026 | 0–10%, usually about 5% on Linux with GCC |
| 3.14 and 3.15 | each version's HOWTO | about 1% (macOS aarch64) to 8% (x86-64 Linux), pyperformance average |

The rows come, in order, from the 3.13 HOWTO, Wouters as reported by LWN, the 3.14 release notes, PEP 779 and the 3.14 and 3.15 HOWTOs ([3.13 HOWTO](#s-r1-evidence-02), [LWN, 2026](#s-r1-criticism-09), [What's New in 3.14](#s-r1-foundations-06), [PEP 779](#s-r1-foundations-02), [3.14 HOWTO](#s-r1-evidence-01), [3.15 HOWTO](#s-r2-evidence-01)). For 3.14 and later every figure falls between about 0% and 10%, and none of them is your workload.

Memory costs more too. PEP 779 reported in 2025 that the free-threaded build used about 15–20% more memory (the geometric mean, a kind of average, across pyperformance) and proposed 20% as the phase II target ([PEP 779](#s-r1-foundations-02)); the Steering Council's acceptance instead says memory increases must stay below 15%, with a hard limit of 20% ([SC acceptance](#s-r1-foundations-07)). The HOWTO lists the reasons: every interned string becomes immortal, non-GC objects have a larger header (`None` takes 32 bytes instead of 16 on AMD64), QSBR delays freeing, and mimalloc replaces pymalloc ([free-threading HOWTO](#s-r1-foundations-04)). GC objects such as dicts and lists are the same size on both builds ([3.15 HOWTO](#s-r2-evidence-01)).

### What it gains {#gains}

**The gain is for CPU-bound Python code that is already split across threads.** The HOWTO says not all software benefits automatically, but programs designed with threading in mind will run faster on multi-core hardware ([3.15 HOWTO](#s-r2-evidence-01)). Threads that mostly wait on I/O already overlapped their waits under the GIL, which is released for I/O ([Glossary](#s-r2-evidence-03)), so for them only the Python work between waits is newly parallel.

No independent, dated multi-thread benchmark for the current releases (3.14 or 3.15) was found for this chapter; the shape in [Shaw's chart](#shaw-bench) is from a 2024 pre-release, so measure your own workload.

> [!NOTE]- One library's own numbers: cost and gain in the same table
> ECMWF publishes paired benchmarks of its Tensogram library, measured by its own authors on Linux x86_64 with 20 cores. Decoding 1M float32 values with 8 threads reached 1,841 op/s on 3.14t, 4.65 times its single-thread rate of 396 op/s, against 293 op/s on 3.14 with the GIL, 0.72 times its own single-thread 408 op/s ([Tensogram docs](#s-r1-cases-05)). For small messages, a single thread managed 12,951 op/s on 3.14t against 20,174 on 3.14, but 16 threads reached 168,786 op/s on 3.14t (13.03 times) against 23,369 (1.16 times) ([Tensogram docs](#s-r1-cases-05)).

### Web services {#web}

**For web services the evidence is thin.** The one server found with documented support is Granian. Its README says it has supported free-threaded Python since version 2.0, with free-threaded wheels published separately, and warns that this support is still experimental and highly discouraged in production ([Granian README](#s-r1-cases-01)). On the free-threaded build Granian's workers are threads in one interpreter, and for ASGI each worker runs its own asyncio event loop in its thread ([Granian README](#s-r1-cases-01)). The README says GIL-related limits are "theoretically absent" for WSGI, that there is not yet enough data to recommend worker and thread settings, and that Granian refuses to start if the GIL gets enabled ([Granian README](#s-r1-cases-01)).

The only measurement found is one speaker's benchmark at FOSDEM 2026; no independent replication was found.

Ruben Hias of TechWolf tested an API with 80% I/O and 20% CPU work at 1 to 32 threads or workers, comparing Gunicorn and Granian threads, Uvicorn and Granian ASGI, Gevent, Python 3.14t with threads, and a multi-process baseline ([FOSDEM slides](#s-r1-cases-02)).

In the talk he showed Gunicorn gthread and Granian on the GIL build rising roughly linearly and then saturating, with an ASGI framework capping at the same point, and he attributes the saturation to the GIL ([FOSDEM transcript](#s-r2-criticism-02)). He says free-threaded Gunicorn broke through that ceiling of about 400 requests per second and came "very close" to the multi-process line, and that free-threaded Granian matched it ([FOSDEM transcript](#s-r2-criticism-02)).

### Your packages {#packages}

Hugo van Kemenade's tracker follows the 360 most-downloaded PyPI packages with compiled extensions ([Free-Threaded Wheels](#s-r1-evidence-05)). In its data updated on 22 October 2026, 219 of the 360 had free-threaded wheels on PyPI; that counts wheels that exist, not packages tested to work ([tracker data](#s-r1-evidence-07)). NumPy, SciPy, pandas, lxml and pydantic-core had them; orjson, psycopg-binary and grpcio did not ([tracker data](#s-r1-evidence-07)). The guide's tracking table lists the first version with free-threading support for each project, for example NumPy 2.1.0, pandas 2.2.3, SciPy 1.15.0, cryptography 46.0.0 and PyTorch 2.6.0, and warns that a version without a release checkmark is a projected release ([tracking table](#s-r1-evidence-06)).

### Rough edges {#rough-edges}

A few limits are documented. The 3.14 release notes say free-threaded builds do not support the JIT compiler ([What's New in 3.14](#s-r1-foundations-06)); the 3.15 notes still call the JIT experimental and say nothing either way about the free-threaded build ([What's New in 3.15](#s-r1-practice-05)). Sharing one iterator object between threads is not thread-safe: the 3.15.1 HOWTO says threads may see duplicate or missing elements, and the 3.13 edition also warned of crashes ([free-threading HOWTO](#s-r1-foundations-04), [3.13 HOWTO](#s-r1-evidence-02)).

Two documents disagree on crashes. The HOWTO says reading `frame.f_locals` of a frame that is executing in another thread may crash the interpreter ([free-threading HOWTO](#s-r1-foundations-04)), while the guide's debugging page says access from other Python code frames is guaranteed not to produce any major interpreter crash ([debugging guide](#s-r1-criticism-06)). Treat cross-thread frame inspection (profilers, debuggers) as the place to be careful.

### The decision {#decision}

| If this describes you | Try it now? | Why |
|---|---|---|
| Your hot path is CPU-bound Python you run, or could run, in threads | Yes, in a test environment | Under the GIL only one thread runs Python at once; the free-threaded build removes that limit ([threading docs](#s-r2-evidence-04)) |
| Your service mostly waits on the network or a database | Less to gain; measure | The GIL is already released during I/O, so only the Python work between waits becomes parallel ([Glossary](#s-r2-evidence-03)); the one web benchmark found is in [Web services](#web) |
| A dependency you need has no free-threaded wheel, or does not declare support | Test only | Without a wheel it is built from source ([pip user guide](#s-r3-practice-12)); an undeclared extension re-enables the GIL when imported ([3.15 HOWTO](#s-r2-evidence-01)) |
| You would serve production traffic with Granian on it | Wait | Its own README calls the support experimental and highly discouraged in production ([Granian README](#s-r1-cases-01)) |
| Single-thread latency or memory is your tight budget | Measure first | Reported costs are up to about 10% slower and 15–20% more memory ([What's New in 3.14](#s-r1-foundations-06), [PEP 779](#s-r1-foundations-02)) |

## Trying it {#trying-it}

### Getting an interpreter {#install}

One route is uv. Its documentation says it discovers and installs free-threaded CPython 3.13 and later; for 3.13 only when you ask (`3.13t`), and for 3.14 and later it may use a free-threaded interpreter without being asked but still prefers the GIL build, for example for `uv python install 3.14` ([uv docs](#s-r1-practice-08)). The community Python Free-Threading Guide lists these commands, among others ([installation guide](#s-r1-practice-04)):

```bash title="Get a free-threaded interpreter (pick one)"
uv venv --python 3.14t
mamba create -n nogil -c conda-forge python-freethreading
brew install python-freethreading
sudo dnf install python3.14-freethreading
```

The python.org installers for macOS and Windows have optionally installed free-threaded binaries since 3.13 ([free-threading HOWTO](#s-r1-foundations-04)). To build from source, configure with `--disable-gil` ([free-threading HOWTO](#s-r1-foundations-04)). For the installers, the guide gives these details:

- **Windows:** tick "Download free-threaded binaries" under "Advanced Options" ([installation guide](#s-r1-practice-04)).
- **macOS:** tick the "Free-threaded Python [experimental]" option on the Customize screen ([installation guide](#s-r1-practice-04)). The guide still labels it experimental, although the 3.14 release notes say the build is no longer experimental ([What's New in 3.14](#s-r1-foundations-06)). The 3.15 macOS binaries install free-threading support by default ([What's New in 3.15](#s-r1-practice-05)).
- **Both builds on one Windows machine:** installing both builds of 3.13 or later with the python.org installer makes them share one `site-packages` folder, which can quickly break environments ([installation guide](#s-r1-practice-04)).

Whichever route you take, the interpreter is named with a `t`: `python3.14t` for 3.14, `python3.14t.exe` on Windows, and whether plain `python` points at it depends on how you installed it ([running guide](#s-r1-practice-07)).

### Checking it {#check}

There are three checks, and the last one matters most. `python -VV` and `sys.version` contain "free-threading build"; `sysconfig.get_config_var("Py_GIL_DISABLED")` is 1 on a build that supports free threading; and `sys._is_gil_enabled()` reports whether the GIL is actually disabled in the running process ([free-threading HOWTO](#s-r1-foundations-04)).

```python title="check_ft.py"
import sys
import sysconfig

print(sys.version)                                   # contains "free-threading build"
print(sysconfig.get_config_var("Py_GIL_DISABLED"))   # 1 on a free-threaded build

# import the packages your program uses here, then:
print(sys._is_gil_enabled())                         # False: the GIL is really off
```

Run the last line after your imports, not before: importing a C extension that is not marked as supporting free threading can turn the GIL back on ([free-threading HOWTO](#s-r1-foundations-04)).

### Controlling the GIL {#control}

The command-line reference says `-X gil=0` and `PYTHON_GIL=0` force the GIL off and work only in builds configured with `--disable-gil`, `-X gil=1` and `PYTHON_GIL=1` force it on, and the `-X` option takes precedence over the variable ([command line docs](#s-r3-practice-05)).

One page of the documentation reads differently. The glossary's entry for the GIL says that after building with `--disable-gil`, code "must be run with -X gil=0 or after setting the PYTHON_GIL=0 environment variable" ([Glossary](#s-r2-evidence-03)), while the HOWTO describes free threading as a build where the GIL is disabled that supports optionally running with it enabled ([free-threading HOWTO](#s-r1-foundations-04)). Do not settle it by reading: `sys._is_gil_enabled()` tells you what your process is doing.

**Your first ten minutes**, as a checklist:

1. Create a separate environment for the free-threaded interpreter, for example `uv venv --python 3.14t`.
2. Confirm that `python -VV` says "free-threading build".
3. Install your dependencies, import them, and confirm `sys._is_gil_enabled()` prints `False`.
4. If a `RuntimeWarning` about the GIL appears, go to [Your dependencies](#dependencies).

## Your dependencies {#dependencies}

**Pure-Python packages need nothing; packages with compiled extensions need a free-threaded build of their own.** Pure-Python wheels can already be used on free-threaded builds, but wheels with extensions need to be updated ([Free-Threaded Wheels](#s-r1-evidence-05)). C extensions must be built specifically for the free-threaded build, and their wheels, shared libraries and binaries carry a `t` suffix ([extension HOWTO](#s-r1-practice-03)), as in the ABI tag `cp313t` ([Free-Threaded Wheels](#s-r1-evidence-05)).

### At install time {#at-install}

pip prefers wheels where they exist and, if no satisfactory wheel is found, falls back to source archives ([pip user guide](#s-r3-practice-12)); uv likewise tries to build the source distribution when no matching wheel exists ([uv docs](#s-r3-practice-11)). So a package without a free-threaded wheel gets built from source on your machine, if a source archive exists. The guide's FAQ, in a section about Python 3.13, reports that `pip install jupyter` can fail without a compilation environment because dependencies such as PyYAML did not ship free-threaded binaries; its dependencies page says PyYAML 6.0.3 and later support free-threaded Python from 3.14t ([guide FAQ](#s-r3-practice-08), [dependencies guide](#s-r3-practice-06)).

If you would rather find out than compile, `pip install --only-binary :all:` refuses source packages, so a package without a binary distribution fails to install instead ([pip install](#s-r3-practice-09)).

### At import time {#at-import}

**An extension that has not declared free-threading support turns the GIL back on, and says so.** Importing such a module enables the GIL and prints a warning ([free-threading HOWTO](#s-r1-foundations-04)). In CPython's source the warning is a `RuntimeWarning` that names the module ([CPython import.c](#s-r3-practice-07)):

```text title="The warning text in Python/import.c (3.15 branch); %U is the module name"
The global interpreter lock (GIL) has been enabled to load module '%U', which has not declared that it can run safely without the GIL. To override this behavior and keep the GIL disabled (at your own risk), run with PYTHON_GIL=0 or -Xgil=0.
```

Extension authors make the declaration with a `{Py_mod_gil, Py_MOD_GIL_NOT_USED}` slot, or `PyUnstable_Module_SetGIL()` for single-phase initialization ([extension HOWTO](#s-r1-practice-03)). The override in the message exists, but the two sources that discuss it treat it as a testing tool: the guide presents `PYTHON_GIL=0` as skipping the runtime check, for when you do not control the extension or want to test anyway ([guide FAQ](#s-r3-practice-08)), and Wouters called forcing the GIL off "playing with fire", probably only for testing ([LWN, 2026](#s-r1-criticism-09)).

```diagram #install-flow
kind: flow
title: What happens to one compiled dependency on a free-threaded interpreter
direction: down
nodes:
  - {id: install, label: pip or uv install, shape: pill}
  - {id: wheel, label: "Wheel for this interpreter?", sub: "a t tag, or abi3t on 3.15"}
  - {id: sdist, label: Build from source, sub: needs a compiler}
  - {id: imp, label: import the module, shape: pill}
  - {id: declared, label: "Declares Py_mod_gil support?"}
  - {id: off, label: GIL stays off, tone: ok}
  - {id: on, label: GIL enabled + RuntimeWarning, tone: warn}
edges:
  - {from: install, to: wheel}
  - {from: wheel, to: imp, label: "yes"}
  - {from: wheel, to: sdist, label: "no", style: dashed}
  - {from: sdist, to: imp, label: if it builds, style: dashed}
  - {from: imp, to: declared}
  - {from: declared, to: off, label: "yes"}
  - {from: declared, to: on, label: "no"}
```

### abi3 and abi3t {#abi}

Some packages ship one "stable ABI" (abi3) wheel for several Python versions, and that wheel does not serve the free-threaded build: such packages must also build separate free-threaded wheels ([extension HOWTO](#s-r1-practice-03)). The guide says free-threaded 3.13 and 3.14 do not support the Limited API, so their extensions need version-specific wheels, and an ordinary abi3 extension stays limited to GIL-enabled builds ([extension porting guide](#s-r2-practice-07)); PEP 803 adds that, before abi3t, extensions built for GIL-enabled builds fail to load or crash on free-threaded ones ([PEP 803](#s-r2-practice-01)).

Python 3.15 adds a second stable ABI. Its documentation describes abi3, compatible with non-free-threaded builds, and abi3t, introduced in 3.15, compatible with free-threaded builds and with stricter API limits ([stable ABI docs](#s-r3-practice-01)). On platforms that tag extension files, free-threaded interpreters recognize only the abi3t tag, while GIL builds prefer abi3 and fall back to abi3t ([stable ABI docs](#s-r3-practice-01)).

PEP 803 encourages authors to build for both at once and tag the wheel `abi3.abi3t`, so that a `cp315-abi3.abi3t` wheel serves 3.15, 3.16 and later ([PEP 803](#s-r2-practice-01)). Loading is not the same as being thread-safe: PEP 803 says abi3t makes extensions loadable on free-threaded Python, not necessarily thread-safe without a GIL ([PEP 803](#s-r2-practice-01)).

> [!NOTE]- A stale sentence in the docs
> The C-extension HOWTO in the 3.15.1 documentation still says the free-threaded build "does not currently support the Limited C API or the stable ABI" ([extension HOWTO](#s-r1-practice-03)). That is true of 3.13 and 3.14; for 3.15 the release notes and the stable-ABI page describe abi3t ([What's New in 3.15](#s-r1-practice-05), [stable ABI docs](#s-r3-practice-01)).

### Workarounds {#workarounds}

The guide keeps a list of dependency-specific fixes: CFFI 2.1.1 or newer for free-threaded 3.15 (2.0.0 for 3.14), PyYAML 6.0.3 or newer on 3.14t or the PyYAML-ft fork on 3.13t, a pure-Python build of a mypyc-compiled package when no compiled build exists, and Python 3.14's `compression.zstd` or `backports.zstd` in place of the `zstandard` package ([dependencies guide](#s-r3-practice-06)). For other cases it suggests that a fork with free-threading support may exist ([porting guide](#s-r1-criticism-02)). For asyncio services, Hias said in his talk that he thinks some libraries still have issues, naming uvloop implementations ([FOSDEM transcript](#s-r2-criticism-02)).

**Before you depend on a package under 3.14t or 3.15t:**

1. Look it up on the wheel tracker and the guide's tracking table ([Free-Threaded Wheels](#s-r1-evidence-05), [tracking table](#s-r1-evidence-06)).
2. Install with `--only-binary :all:` once, to see which packages would otherwise be compiled.
3. Import everything, watch for the `RuntimeWarning`, and check `sys._is_gil_enabled()`.
4. For a package that re-enables the GIL, check the guide's dependencies page for a fix before reaching for `PYTHON_GIL=0`, and use that only to test.

## Your code {#your-code}

### Threads {#threads}

**The built-in containers will not corrupt, but your multi-step operations were never atomic.** The HOWTO says the free-threaded build aims for thread-safety at the Python level similar to the GIL build, with `dict`, `list` and `set` using internal locks, and recommends `threading.Lock` or other synchronization primitives over relying on those internal locks ([free-threading HOWTO](#s-r1-foundations-04)). The Thread Safety Guarantees page spells out what is safe with the GIL disabled ([thread-safety guarantees](#s-r1-criticism-04)):

- **Safe:** reading `lst[i]`, `lst.append(x)` and writing `lst[i] = x` from several threads; reading `d[key]`, `d.get(key)`, `key in d` and `len(d)`, which are lock-free and atomic; writing or removing one dict item.
- **Never atomic:** operations with several accesses, such as `lst[i] = lst[i] + 1` or `if key in d: del d[key]`, and iteration.
- **Instead:** use `d.pop(key, None)` or catch `KeyError`, and iterate over a copy such as `d.copy().items()` when another thread may change the dict.
- **A surprise:** `list.sort()` is not atomic; other threads cannot see intermediate states, but the list appears empty to them while it sorts.

None of this is new. The Python FAQ, describing the GIL build, already lists `i = i+1` and `D[x] = D[x] + 1` as not atomic and says "When in doubt, use a mutex!" ([Library FAQ](#s-r1-criticism-10)). The porting guide says many pure-Python operations only appear thread-safe under the GIL because of when CPython happens to switch threads ([porting guide](#s-r1-criticism-02)), and Wouters says free threading makes existing threading bugs more likely to occur ([LWN, 2026](#s-r1-criticism-09)).

The guide names the most common source of thread-safety issues in Python packages: global mutable state, such as module-level or class-level caches filled from several threads, where two threads can both miss and both compute ([porting guide](#s-r1-criticism-02)). Its remedies are a lock, giving each thread its own copy (`threading.local` or a `ContextVar`), or copy-on-write replacement of a shared reference ([porting guide](#s-r1-criticism-02)):

```python title="A module-level cache, made safe with a lock"
import threading

_cache = {}
_cache_lock = threading.Lock()

def lookup(key):
    with _cache_lock:
        if key not in _cache:
            _cache[key] = expensive_calculation(key)
        return _cache[key]
```

This version puts correctness first: because the lock is held during `expensive_calculation`, only one thread fills the cache at a time. The guide also warns that acquiring the same plain `Lock` again from the same thread deadlocks ([porting guide](#s-r1-criticism-02)). One more difference: on the free-threaded build a new thread starts with a copy of its creator's `contextvars` context, while on the GIL build it starts from each variable's default ([porting guide](#s-r1-criticism-02)).

> [!NOTE]- "Pure Python code doesn't need to care"
> You may hear this. Answering a question at FOSDEM 2026, Hias said the main race-condition concern is for C-extension authors and that developers writing pure Python "shouldn't need to care about this" ([FOSDEM transcript](#s-r2-criticism-02)). The CPython documentation and the porting guide say otherwise: multi-access operations are never atomic ([thread-safety guarantees](#s-r1-criticism-04)), and the interpreter does not protect you from race conditions ([porting guide](#s-r1-criticism-02)). This chapter follows the documentation.

### asyncio {#asyncio}

**One event loop is still one thread.** An event loop runs all its callbacks and Tasks in its own thread, one Task at a time, so on one loop the Python code handling each connection still runs serially, free-threaded build or not ([asyncio dev guide](#s-r2-practice-02), [asyncio and free threading](#s-r2-practice-06)). The documentation says that since 3.14 asyncio has first-class support for free-threaded Python and its implementation is safe to use in a multi-threaded environment ([asyncio and free threading](#s-r2-practice-06)).

To use more cores, run one event loop per thread, which lets different requests be handled in parallel on a free-threaded build ([asyncio and free threading](#s-r2-practice-06)). The 3.14 release notes say this scales linearly with the number of threads; that is the project's own description, and no independent measurement was found ([What's New in 3.14](#s-r1-foundations-06)).

```python title="One event loop per thread"
import asyncio
import threading

async def serve(worker_id):
    ...  # this worker's own server, tasks and connections

def run_worker(worker_id):
    asyncio.run(serve(worker_id))   # each thread creates its own loop

workers = [threading.Thread(target=run_worker, args=(i,)) for i in range(4)]
for w in workers:
    w.start()
```

```diagram #loop-per-thread
kind: flow
title: One event loop per thread, and how threads talk
direction: right
nodes:
  - {id: t1, label: Thread 1, sub: own loop and tasks}
  - {id: t2, label: Thread 2, sub: own loop and tasks}
  - {id: q, label: queue.Queue, shape: store, tone: store}
  - {id: worker, label: Plain worker thread}
edges:
  - {from: worker, to: q, label: put}
  - {from: q, to: t1, label: get, style: dashed}
  - {from: t2, to: t1, label: run_coroutine_threadsafe, style: dashed}
```

The thread-safety rules stay strict. Each thread should have its own loop, not shared; Tasks and futures created in one thread should not be awaited or changed from another; work goes to another thread's loop through `asyncio.run_coroutine_threadsafe()` or `loop.call_soon_threadsafe()` ([asyncio and free threading](#s-r2-practice-06)). `asyncio.Lock` and `asyncio.Event` are not for use across threads, and `asyncio.Queue` is safe only within one loop, so hand work between a plain thread and a loop with `queue.Queue` ([asyncio and free threading](#s-r2-practice-06)).

The asyncio developer guide also says almost all asyncio objects are not thread safe ([asyncio dev guide](#s-r2-practice-02)). That does not contradict the "safe implementation" above: one statement is about asyncio's internals, the other about sharing your objects between threads. Debug mode helps, because many non-thread-safe APIs such as `loop.call_soon()` raise an exception when called from the wrong thread ([asyncio dev guide](#s-r2-practice-02)).

What about `asyncio.to_thread()`? Its documentation says it is mainly for IO-bound functions and, because of the GIL, typically only makes those non-blocking, though it can also be used for CPU-bound functions in extensions that release the GIL or in Python implementations without one ([asyncio tasks](#s-r2-practice-03)). The asyncio and free-threading page says off-loading CPU-bound work to a thread or process pool is limited by the GIL in CPython, and that combining asyncio with threads on the free-threaded build helps when blocking or CPU-bound code has to run ([asyncio and free threading](#s-r2-practice-06)); it gives no measured speedup.

### Processes and interpreters {#processes}

**Free-threaded threads are worth trying for CPU-heavy work that splits cleanly and shares little.** Two speakers point that way, each against different alternatives. In 2024 Anthony Shaw said free threading will be a better choice than subinterpreters for CPU-heavy tasks that can be easily segmented and need only a "quick data exchange between them" ([LWN, 2024](#s-r1-evidence-08)). In 2026 Wouters said that where the alternatives (rewriting in C or Rust, multiple processes, subinterpreters, asyncio) do not give the performance needed, multi-threaded solutions without the GIL can offer higher throughput, lower memory use and lower latency ([LWN, 2026](#s-r1-criticism-09)).

The reasons are the costs of processes. `ProcessPoolExecutor` uses `multiprocessing`, so only picklable objects can be executed and returned ([concurrent.futures docs](#s-r1-cases-06)); Shaw said multiprocessing has the largest start-up time of the options he compared, and LWN likens parcelling out work to the serialization (for example with pickle) it needs ([LWN, 2024](#s-r1-evidence-08)); Wouters said processes have more overhead, do not share address spaces, and typically need more memory and copying ([LWN, 2026](#s-r1-criticism-09)).

The catch is sharing. Wouters also said sharing objects between threads is still problematic for performance, that many threads accessing the same objects is a problem Python cannot solve directly, that making code scale well may need more extensive changes, and pointed to the `ft_utils` package's scalable containers ([LWN, 2026](#s-r1-criticism-09)). That leaves threads that each work on their own data as the case that fits best.

> [!NOTE]- And subinterpreters?
> Interpreters do not share the GIL, so threads combined with several interpreters have given full multi-core parallelism since Python 3.12 ([interpreters docs](#s-r1-cases-03)). By default most objects passed to another interpreter are copied with pickle, and `InterpreterPoolExecutor` pickles the callable and its arguments ([interpreters docs](#s-r1-cases-03), [concurrent.futures docs](#s-r1-cases-06)). The documentation's trade-off: concurrent code for several interpreters can take extra effort, since mutable data cannot be shared and copies must be synchronized by hand, in exchange for avoiding race conditions ([concurrent.futures docs](#s-r1-cases-06)).

**Before you run threaded code without the GIL:**

1. Find every module-level or class-level mutable object your threads touch, caches first, and guard it with a lock or give each thread its own copy.
2. Replace check-then-act on shared dicts with `d.pop(key, None)` or `try`/`except KeyError`, and iterate over copies.
3. Never share one iterator between threads.
4. In asyncio code, run one loop per thread, keep Tasks and asyncio primitives inside their loop, and cross threads with `run_coroutine_threadsafe()` or `queue.Queue`.
5. Where you use processes for CPU-bound work, try threads that each own their slice of the data, and measure; if you keep processes, only picklable objects can cross to them.

## Best practices & next steps {#next-steps}

**Where the advice agrees.** CPython's HOWTO recommends `threading.Lock` and other synchronization primitives over relying on the built-in types' internal locks ([free-threading HOWTO](#s-r1-foundations-04)), and the community porting guide gives the same remedies for shared state: a lock, a per-thread copy, or copy-on-write ([porting guide](#s-r1-criticism-02)). The guide sums up the division of labour: the interpreter protects you from low-level memory unsafety, not from race conditions in your logic ([porting guide](#s-r1-criticism-02)).

**Where projects choose differently.** CPython's default, when an undeclared extension is imported, is to enable the GIL, warn, and keep running ([CPython import.c](#s-r3-practice-07)). Granian takes the opposite choice and refuses to start if the GIL gets enabled ([Granian README](#s-r1-cases-01)). The trade-off is plain: CPython keeps the program running at the cost of its parallelism, and Granian declines to run without it.

**Test for races before you trust it.** The guide's testing page says to run your existing test suite on the free-threaded build first and fix failures that appear only with the GIL disabled ([testing guide](#s-r1-criticism-03)). It names pytest-run-parallel and pytest-freethreaded, pytest plugins, and unittest-ft, which run existing tests in many threads at once; they find problems with global state but not with multithreaded use of your own data structures ([testing guide](#s-r1-criticism-03)).

Because a racy test may pass most of the time, the debugging page recommends pytest-repeat ([debugging guide](#s-r1-criticism-06)). When a package cannot yet run with the GIL disabled, the testing page suggests calling `sys.setswitchinterval` with a very small value on the GIL build so the GIL switches more often and masked issues show ([testing guide](#s-r1-criticism-03)).

```bash title="Two ways to shake out races (plugins installed)"
pytest --parallel-threads=10 --iterations=10 tests
PYTHON_GIL=0 pytest -x -v --count=100 test_concurrent.py
```

The first runs each test in 10 threads, 10 times per thread, with pytest-run-parallel ([pytest-run-parallel](#s-r1-criticism-07)); the second is the debugging page's pytest-repeat example ([debugging guide](#s-r1-criticism-06)).

**Next steps:**

1. Make a throwaway environment with `uv venv --python 3.14t` and run `check_ft.py` with your real imports ([installation guide](#s-r1-practice-04), [free-threading HOWTO](#s-r1-foundations-04)).
2. Check your compiled dependencies on the trackers and with `--only-binary :all:` ([Free-Threaded Wheels](#s-r1-evidence-05), [pip install](#s-r3-practice-09)).
3. Run your tests under pytest-run-parallel and pytest-repeat ([testing guide](#s-r1-criticism-03)).
4. Time your own CPU-bound path on both builds, with 1 thread and with as many threads as cores; no independent, dated multi-thread benchmark for the current releases was found for this chapter.

## Quiz {#quiz-section}

```quiz #quiz
title: Check yourself
items:
  - id: q-loop
    type: choice
    prompt: "An asyncio web app runs **one** event loop on free-threaded Python 3.14. One handler does 200 ms of pure-Python CPU work. What happens to the other requests on that loop meanwhile?"
    options:
      - {id: a, text: "They keep running on other cores, because the build is free-threaded"}
      - {id: b, text: "They wait, because a loop runs one Task at a time in its own thread"}
      - {id: c, text: "They keep running, because asyncio now spreads one loop's Tasks across threads"}
      - {id: d, text: "Only requests that are waiting on I/O keep making progress in Python code"}
    answer: [b]
    explain: "An event loop runs its callbacks and Tasks in one thread, one at a time, on any build. To use more cores, run one event loop per thread."
  - id: q-atomic
    type: choice
    prompt: "Several threads share a dict `hits` and a list `log` on a build with the GIL disabled. Which of these lines are safe without your own lock, by the Thread Safety Guarantees page? Select all that apply."
    options:
      - {id: a, text: "`log.append(event)`"}
      - {id: b, text: "`hits[url] = 0`"}
      - {id: c, text: "`hits[url] = hits.get(url, 0) + 1`"}
      - {id: d, text: "`for url in hits: total += hits[url]` while other threads add keys"}
    answer: [a, b]
    explain: "Appending and single-item writes will not corrupt the container. The counter line reads and then writes, which is several accesses, and iteration is never atomic either: use a lock, or iterate over a copy such as `hits.copy().items()`."
  - id: q-import
    type: choice
    prompt: "On free-threaded Python 3.15 you import a C extension that was built for the free-threaded build but does not declare free-threading support, and you set neither `PYTHON_GIL` nor `-X gil`. What happens?"
    options:
      - {id: a, text: The import fails with ImportError}
      - {id: b, text: "The GIL is enabled to load it, and a RuntimeWarning names the module"}
      - {id: c, text: It loads and the GIL stays off}
      - {id: d, text: The interpreter exits}
    answer: [b]
    explain: "An undeclared extension makes CPython enable the GIL and warn, naming the module; `PYTHON_GIL=0` or `-Xgil=0` overrides that at your own risk."
  - id: q-io
    type: recall
    prompt: "Why does a thread pool that mostly waits on HTTP calls gain little from the free-threaded build?"
    answer: "The GIL is always released during I/O, so those threads already waited in parallel; only the Python work between the waits was serialized."
  - id: q-abi
    type: cloze
    text: "On Python 3.15, a free-threaded interpreter only recognizes the {{abi3t}} stable-ABI tag; an extension built only for {{abi3}} is compatible with GIL-enabled builds."
    explain: "abi3 serves non-free-threaded builds; abi3t, new in 3.15, serves free-threaded ones. A wheel tagged abi3.abi3t serves both."
  - id: q-check
    type: recall
    prompt: "Why call `sys._is_gil_enabled()` after your imports rather than only at start-up?"
    answer: "Importing an extension not marked as supporting free threading can enable the GIL at runtime; the function reports whether the GIL is actually disabled in the running process right now."
```

## Sources {#sources-heading}

```sources #sources
items:
  - id: s-r1-foundations-01
    title: "PEP 703 – Making the Global Interpreter Lock Optional in CPython"
    url: https://peps.python.org/pep-0703/
    publisher: Python Software Foundation
    date: "2023-01-09"
    accessed: "2026-10-23"
  - id: s-r1-foundations-02
    title: "PEP 779 – Criteria for supported status for free-threaded Python"
    url: https://peps.python.org/pep-0779/
    publisher: Python Software Foundation
    date: "2025-03-13"
    accessed: "2026-10-23"
  - id: s-r1-foundations-03
    title: A Steering Council notice about PEP 703 (Making the Global Interpreter Lock Optional in CPython)
    url: https://discuss.python.org/t/a-steering-council-notice-about-pep-703-making-the-global-interpreter-lock-optional-in-cpython/30474
    publisher: Discussions on Python.org
    date: "2023-07-28"
    accessed: "2026-10-23"
  - id: s-r1-foundations-07
    title: "PEP 779: Criteria for supported status for free-threaded Python (Steering Council acceptance, post 123)"
    url: https://discuss.python.org/t/pep-779-criteria-for-supported-status-for-free-threaded-python/84319/123
    publisher: Discussions on Python.org
    date: "2025-06-15"
    accessed: "2026-10-23"
  - id: s-r1-foundations-04
    title: Python support for free threading (HOWTO, 3.15.1 documentation)
    url: https://docs.python.org/3/howto/free-threading-python.html
    publisher: Python Software Foundation
    date: "2026-10-22"
    accessed: "2026-10-23"
  - id: s-r2-evidence-01
    title: Python support for free threading (HOWTO, 3.15 documentation)
    url: https://docs.python.org/3.15/howto/free-threading-python.html
    publisher: Python Software Foundation
    date: "2026-10-22"
    accessed: "2026-10-23"
  - id: s-r1-evidence-01
    title: Python support for free threading (HOWTO, 3.14 documentation)
    url: https://docs.python.org/3.14/howto/free-threading-python.html
    publisher: Python Software Foundation
    accessed: "2026-10-23"
  - id: s-r1-evidence-02
    title: Python experimental support for free threading (HOWTO, 3.13 documentation)
    url: https://docs.python.org/3.13/howto/free-threading-python.html
    publisher: Python Software Foundation
    accessed: "2026-10-23"
  - id: s-r1-foundations-05
    title: What's New In Python 3.13
    url: https://docs.python.org/3/whatsnew/3.13.html
    publisher: Python Software Foundation
    accessed: "2026-10-23"
  - id: s-r1-foundations-06
    title: What's New In Python 3.14
    url: https://docs.python.org/3/whatsnew/3.14.html
    publisher: Python Software Foundation
    accessed: "2026-10-23"
  - id: s-r1-practice-05
    title: What's New In Python 3.15
    url: https://docs.python.org/3.15/whatsnew/3.15.html
    publisher: Python Software Foundation
    accessed: "2026-10-23"
  - id: s-r2-evidence-03
    title: Glossary
    url: https://docs.python.org/3/glossary.html
    publisher: Python Software Foundation
    accessed: "2026-10-23"
  - id: s-r2-evidence-04
    title: threading — Thread-based parallelism
    url: https://docs.python.org/3/library/threading.html
    publisher: Python Software Foundation
    accessed: "2026-10-23"
  - id: s-r1-criticism-04
    title: Thread Safety Guarantees
    url: https://docs.python.org/3/library/threadsafety.html
    publisher: Python Software Foundation
    date: "2026-10-22"
    accessed: "2026-10-23"
  - id: s-r1-criticism-10
    title: Library and Extension FAQ
    url: https://docs.python.org/3/faq/library.html
    publisher: Python Software Foundation
    accessed: "2026-10-23"
  - id: s-r1-practice-03
    title: C API Extension Support for Free Threading
    url: https://docs.python.org/3/howto/free-threading-extensions.html
    publisher: Python Software Foundation
    date: "2026-10-22"
    accessed: "2026-10-23"
  - id: s-r3-practice-01
    title: C API and ABI Stability (Stable Application Binary Interfaces)
    url: https://docs.python.org/3.15/c-api/stable.html
    publisher: Python Software Foundation
    accessed: "2026-10-23"
  - id: s-r3-practice-05
    title: Command line and environment
    url: https://docs.python.org/3/using/cmdline.html
    publisher: Python Software Foundation
    accessed: "2026-10-23"
  - id: s-r2-practice-01
    title: "PEP 803 – \"abi3t\": Stable ABI for Free-Threaded Builds"
    url: https://peps.python.org/pep-0803/
    publisher: Python Software Foundation
    date: "2025-08-19"
    accessed: "2026-10-23"
  - id: s-r2-practice-02
    title: Developing with asyncio
    url: https://docs.python.org/3/library/asyncio-dev.html
    publisher: Python Software Foundation
    accessed: "2026-10-23"
  - id: s-r2-practice-03
    title: Coroutines and Tasks
    url: https://docs.python.org/3/library/asyncio-task.html
    publisher: Python Software Foundation
    accessed: "2026-10-23"
  - id: s-r2-practice-06
    title: asyncio and free-threaded Python
    url: https://docs.python.org/3/library/asyncio-threading.html
    publisher: Python Software Foundation
    date: "2026-10-22"
    accessed: "2026-10-23"
  - id: s-r1-cases-03
    title: concurrent.interpreters — Multiple interpreters in the same process
    url: https://docs.python.org/3/library/concurrent.interpreters.html
    publisher: Python Software Foundation
    accessed: "2026-10-23"
  - id: s-r1-cases-06
    title: concurrent.futures — Launching parallel tasks
    url: https://docs.python.org/3/library/concurrent.futures.html
    publisher: Python Software Foundation
    accessed: "2026-10-23"
  - id: s-r3-practice-07
    title: Python/import.c (CPython, 3.15 branch, commit 88b0f7d)
    url: https://github.com/python/cpython/blob/88b0f7da77b44631e2750a8eae6277e54a7ac3cd/Python/import.c
    publisher: python/cpython on GitHub
    accessed: "2026-10-23"
  - id: s-r1-practice-04
    title: Installing Free-Threaded Python
    url: https://py-free-threading.github.io/installing-cpython/
    publisher: Python Free-Threading Guide (Quansight Labs and contributors)
    date: "2026-04-21"
    accessed: "2026-10-23"
  - id: s-r1-practice-07
    title: Running Python with the GIL Disabled
    url: https://py-free-threading.github.io/running-gil-disabled/
    publisher: Python Free-Threading Guide (Quansight Labs and contributors)
    date: "2026-04-21"
    accessed: "2026-10-23"
  - id: s-r1-criticism-02
    title: Porting Python Packages to Support Free-Threading
    url: https://py-free-threading.github.io/porting/
    publisher: Python Free-Threading Guide (Quansight Labs and contributors)
    date: "2026-06-28"
    accessed: "2026-10-23"
  - id: s-r2-practice-07
    title: Porting Extension Modules to Support Free-Threading
    url: https://py-free-threading.github.io/porting-extensions/
    publisher: Python Free-Threading Guide (Quansight Labs and contributors)
    date: "2026-10-12"
    accessed: "2026-10-23"
  - id: s-r3-practice-06
    title: Handling dependencies that don't support free-threading
    url: https://py-free-threading.github.io/dependencies/
    publisher: Python Free-Threading Guide (Quansight Labs and contributors)
    date: "2026-09-25"
    accessed: "2026-10-23"
  - id: s-r3-practice-08
    title: Frequently seen errors and how to fix them
    url: https://py-free-threading.github.io/faq/
    publisher: Python Free-Threading Guide (Quansight Labs and contributors)
    date: "2026-09-25"
    accessed: "2026-10-23"
  - id: s-r1-criticism-03
    title: Validating thread safety with testing
    url: https://py-free-threading.github.io/testing/
    publisher: Python Free-Threading Guide (Quansight Labs and contributors)
    date: "2026-05-14"
    accessed: "2026-10-23"
  - id: s-r1-criticism-06
    title: Debugging thread safety issues
    url: https://py-free-threading.github.io/debugging/
    publisher: Python Free-Threading Guide (Quansight Labs and contributors)
    date: "2026-04-21"
    accessed: "2026-10-23"
  - id: s-r1-evidence-06
    title: Compatibility Status Tracking
    url: https://py-free-threading.github.io/tracking/
    publisher: Python Free-Threading Guide (Quansight Labs and contributors)
    accessed: "2026-10-23"
  - id: s-r1-criticism-07
    title: pytest-run-parallel (README)
    url: https://github.com/Quansight-Labs/pytest-run-parallel
    publisher: Quansight Labs on GitHub
    accessed: "2026-10-23"
  - id: s-r1-evidence-05
    title: Free-Threaded Wheels
    url: https://hugovk.github.io/free-threaded-wheels/
    publisher: Hugo van Kemenade
    accessed: "2026-10-23"
  - id: s-r1-evidence-07
    title: Free-Threaded Wheels data (results.json)
    url: https://hugovk.github.io/free-threaded-wheels/results.json
    publisher: Hugo van Kemenade
    date: "2026-10-22"
    accessed: "2026-10-23"
  - id: s-r1-practice-08
    title: Python versions (uv documentation)
    url: https://docs.astral.sh/uv/concepts/python-versions/
    publisher: Astral
    accessed: "2026-10-23"
  - id: s-r3-practice-11
    title: Build failures (uv documentation)
    url: https://docs.astral.sh/uv/reference/troubleshooting/build-failures/
    publisher: Astral
    accessed: "2026-10-23"
  - id: s-r3-practice-12
    title: pip User Guide
    url: https://pip.pypa.io/en/stable/user_guide/
    publisher: Python Packaging Authority
    accessed: "2026-10-23"
  - id: s-r3-practice-09
    title: pip install
    url: https://pip.pypa.io/en/stable/cli/pip_install/
    publisher: Python Packaging Authority
    accessed: "2026-10-23"
  - id: s-r1-evidence-08
    title: Python subinterpreters and free-threading
    url: https://lwn.net/Articles/985041/
    publisher: LWN.net
    date: "2024-08-20"
    accessed: "2026-10-23"
  - id: s-r1-criticism-09
    title: "Free-threaded Python: past, present, and future"
    url: https://lwn.net/Articles/1078367/
    publisher: LWN.net
    date: "2026-06-22"
    accessed: "2026-10-23"
  - id: s-r1-cases-01
    title: Granian (README)
    url: https://github.com/emmett-framework/granian/blob/master/README.md
    publisher: emmett-framework on GitHub
    accessed: "2026-10-23"
  - id: s-r1-cases-02
    title: "The GIL and API Performance: The Past, Present, and Free-Threaded Future (slides)"
    url: https://fosdem.org/2026/events/attachments/ABJMWD-the_gil_and_api_performance_past_present_and_free-threaded_future/slides/266979/the_gil_a_fw7etsx.pdf
    publisher: FOSDEM 2026
    date: "2026-01-31"
    accessed: "2026-10-23"
  - id: s-r2-criticism-02
    title: "The GIL and API Performance (talk recording subtitles, machine-generated)"
    url: https://video.fosdem.org/2026/ua2220/ABJMWD-the_gil_and_api_performance_past_present_and_free-threaded_future.vtt
    publisher: FOSDEM 2026
    date: "2026-01-31"
    accessed: "2026-10-23"
  - id: s-r1-cases-05
    title: Free-Threaded Python (Tensogram documentation)
    url: https://sites.ecmwf.int/docs/tensogram/main/guide/free-threaded-python.html
    publisher: ECMWF
    accessed: "2026-10-23"
```
