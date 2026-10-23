"Python threads can't use more than one core" is one of the first things Python developers learn, and for ordinary CPython it holds. Since Python 3.13 there is a second build of CPython that removes the lock behind that rule, and in 3.14 that build stopped being an experiment. This chapter explains what the free-threaded build is, how CPython stays memory-safe without its global lock, where the project stands in October 2026, and what changes for your threads, your asyncio code, your process pools and your dependencies if you try it.

## Background {#background}

> [!DEFINITION]- Primer: threads, processes and the GIL
> A **process** is a running program with its own memory. A **thread** is a separate line of execution inside a process; threads share the process's memory, so they can hand each other data without copying it. The **global interpreter lock (GIL)** is a single lock inside the CPython interpreter: a thread must hold it to run Python code.

CPython's global interpreter lock prevents multiple threads from executing Python code at the same time, which [PEP 703](#s-r1-foundations-01) (peps.python.org) calls an obstacle to using multi-core CPUs efficiently. The [Python glossary](#s-r2-evidence-03) (docs.python.org) is precise about what that does and does not mean. The GIL assures that only one thread executes Python bytecode at a time. But some extension modules release it during computationally intensive work such as compression or hashing, and the GIL is always released when doing I/O.

That second half is why threads were never useless. The [threading module documentation](#s-r2-evidence-04) (docs.python.org) still says that, because of the GIL, only one thread can execute Python code at once. It advises `multiprocessing` or `ProcessPoolExecutor` to make better use of multi-core machines, and it calls threading an appropriate model for running several I/O-bound tasks at once. A thread waiting on a socket or a database has already let go of the lock. What the GIL blocks is several threads *running Python code* at once.

### What the free-threaded build is {#what-it-is}

PEP 703 proposed a CPython build configuration, the `--disable-gil` configure flag, that runs Python code without the GIL, together with the changes needed to make the interpreter thread-safe. The GIL build remains the default for CPython builds and for python.org downloads ([PEP 703](#s-r1-foundations-01)). A CPython built this way defines the `Py_GIL_DISABLED` macro, and its ABI tag (the label compiled extensions and wheels carry) includes the letter "t", for "threading" ([PEP 703](#s-r1-foundations-01)). That "t" is the thread running through everything below: `python3.14t`, `cp314t` wheels, `abi3t`.

So "free-threaded CPython" is not a different language or a fork. It is the same CPython source, compiled with one switch flipped, shipped next to the ordinary build.

### How it got here {#history}

People have tried to remove the GIL before. PEP 703 lists earlier efforts, including Greg Stein's 1996 patch against Python 1.4 and Larry Hastings's Gilectomy. It points to two reference repositories of its own: nogil-3.12, based on Python 3.12.0a4, and nogil, based on Python 3.9.10 ([PEP 703](#s-r1-foundations-01)).

PEP 703, "Making the Global Interpreter Lock Optional in CPython", was written by Sam Gross, created on 9 January 2023, and targeted Python 3.13 ([PEP 703](#s-r1-foundations-01)). On 28 July 2023 the Python Steering Council announced its intent to accept it and laid out three stages ([Steering Council notice](#s-r1-foundations-03), discuss.python.org):
- in the short term, an experimental no-GIL build mode, presumably in 3.13;
- in the mid term, a supported but not yet default build, once community support makes production use viable;
- in the long term, no-GIL as the default, with any vestiges of the GIL removed.

The same notice said the Council did not want a permanent split between builds or "another Python 3 situation" ("This is not Python 4"). It also reserved the right to roll the work back before making no-GIL the default, if it proved too disruptive for too little gain.

```diagram #phases
kind: flow
title: The three phases of free-threaded CPython
direction: right
nodes:
  - {id: p1, label: "Phase I", sub: "3.13: available, experimental", tone: muted}
  - {id: p2, label: "Phase II", sub: "3.14: supported, still optional", tone: accent}
  - {id: p3, label: "Phase III", sub: "default build: not yet decided", tone: muted, shape: pill}
edges:
  - {from: p1, to: p2, label: "PEP 779 accepted"}
  - {from: p2, to: p3, label: "a future decision", style: dashed}
caption: PEP 703's plan in three phases; we are in phase II.
```

Python 3.13 shipped the free-threaded mode as experimental and not enabled by default: phase I ([What's New in 3.13](#s-r1-foundations-05)). PEP 779 then proposed the criteria for leaving the experiment. The Steering Council approved it on 15 June 2025, removing the "experimental" tag from the free-threaded build of Python 3.14 from 3.14 beta 3 ([Steering Council acceptance of PEP 779](#s-r1-foundations-07)). In Python 3.14 the free-threaded build is officially supported and no longer experimental. That is the start of phase II: officially supported, but still optional ([What's New in 3.14](#s-r1-foundations-06)). Python 3.15 followed on 9 October 2026 ([What's New in 3.15](#s-r1-practice-05)).

## Intuition {#intuition}

Imagine two threads, each summing a million numbers in a pure-Python loop. On the ordinary build they take turns. Only the thread holding the GIL runs Python code; the other waits, so the two sums take about as long as doing them one after the other. On the free-threaded build both can run at the same time on two cores.

PEP 703 describes this as a change of states. Where a thread previously acquired and released the GIL, it now moves between "attached" and "detached" states. Several threads can be attached at once, whereas only one thread could hold the GIL at a time ([PEP 703](#s-r1-foundations-01)).

```diagram #toy-timeline
kind: timeline
title: Two CPU-bound threads, with and without the GIL (an illustration, not a measurement)
axis: {unit: "time units", from: 0, to: 40, ticks: [0, 10, 20, 30, 40]}
lanes:
  - label: "GIL build, thread A"
    bars:
      - {from: 0, to: 10, label: "runs", tone: series-1}
      - {from: 20, to: 30, label: "runs", tone: series-1}
  - label: "GIL build, thread B"
    bars:
      - {from: 10, to: 20, label: "runs", tone: series-2}
      - {from: 30, to: 40, label: "runs", tone: series-2}
  - label: "Free-threaded, thread A"
    bars:
      - {from: 0, to: 20, label: "runs", tone: series-1}
  - label: "Free-threaded, thread B"
    bars:
      - {from: 0, to: 20, label: "runs", tone: series-2}
caption: The same 20 units of work per thread. With the GIL the threads interleave; without it they overlap. A toy picture, not real timings.
```

Now change the toy so each thread spends most of its time waiting on a network call. The GIL is always released during I/O ([glossary](#s-r2-evidence-03)), so on the ordinary build the waiting already overlapped. Removing the GIL only speeds up the slices where Python code runs. The 3.15 HOWTO says the same thing: not all software benefits from free threading automatically, but programs designed with threading in mind will run faster on multi-core hardware ([free-threading HOWTO, 3.15](#s-r2-evidence-01)).

> [!IMPORTANT] The key idea
> The free-threaded build removes the one lock that serialized all Python code. It replaces it with many small locks on individual objects, plus new machinery for reference counts and memory. PEP 703 is candid that this is not the same guarantee: the per-object locks provide weaker protections than the GIL, aiming for similar protection with mutual exclusion limited to individual objects ([PEP 703](#s-r1-foundations-01)).

One early, dated measurement shows the shape of the difference. In Anthony Shaw's PyCon US 2024 benchmark, as reported by [LWN](#s-r1-evidence-08) (lwn.net), the task was computing pi to 2,000 digits on a four-core system with Python 3.13 beta 1. The threaded version took 2.41 s with the GIL and 0.75 s without it. Multiprocessing took 1.2 s with the GIL and 1.57 s without it.

```diagram #shaw-bench
kind: chart
type: bar
title: Shaw's 2024 pi benchmark, Python 3.13 beta 1, four cores (as reported by LWN)
x: {label: Approach, categories: [Threads, Multiprocessing]}
y: {label: "Seconds (lower is better)", min: 0}
series:
  - {name: With the GIL, values: [2.41, 1.2], tone: series-1}
  - {name: Without the GIL, values: [0.75, 1.57], tone: series-2}
caption: One micro-benchmark on a 2024 beta, before the single-thread fixes of 3.14. It shows the direction, not the size you will see.
```

Threads went from the slowest option to the fastest. That benchmark ran on a 3.13 beta, and the single-thread costs have changed a great deal since, as [the numbers below](#overhead) show.

## How it works {#how-it-works}

Removing the lock itself is only the start; the rest of the interpreter was written assuming it. PEP 703's changes fall into a few groups: reference counts, memory allocation, built-in containers, and the specializing interpreter.

**Reference counting.** Every CPython object carries a reference count, and an object is normally freed when its count reaches zero ([PEP 703](#s-r1-foundations-01)). Without the GIL, two threads may update the same count at the same moment, so the counts themselves need protecting. PEP 703 proposes three techniques to make reference counting thread-safe: biased reference counting, immortalization, and a limited form of deferred reference counting ([PEP 703](#s-r1-foundations-01)).

- **Biased reference counting** was first described in 2018 by Jiho Choi, Thomas Shull and Josep Torrellas. Each object gets an owning thread, which updates a "local" count with cheap non-atomic instructions; other threads update a separate "shared" count with atomic instructions. It rests on the observation that most objects are only ever touched by one thread ([PEP 703](#s-r1-foundations-01)).
- **Immortal objects** are never deallocated and their counts are never modified (`Py_INCREF` and `Py_DECREF` do nothing to them). That avoids contention when many threads use the same objects ([free-threading HOWTO](#s-r1-foundations-04)).
- **Deferred reference counting** skips count updates for references held on Python function stacks, for selected objects that many threads touch. Such objects can then only be freed by the cyclic garbage collector, not when their count reaches zero ([PEP 703](#s-r1-foundations-01)).

**Memory allocation.** CPython's own allocator, pymalloc, is not thread-safe without the GIL. The free-threaded build replaces it with mimalloc, a thread-safe general-purpose allocator, for all Python objects ([PEP 703](#s-r1-foundations-01)).

**Containers.** PEP 703 gives every list, dict and set a lightweight per-object lock that all modifying operations must hold, to provide many of the protections the GIL provided. Nested per-object locks could deadlock where the GIL did not. So PEP 703 adds "Python critical sections", which suspend a thread's per-object locks when it would block, at the points where it would have released the GIL ([PEP 703](#s-r1-foundations-01)). Some reads of dicts and lists, item access and iteration, take an optimistic lock-free fast path. They fall back to the container's lock only when another thread is modifying it at the same moment. The scheme relies on mimalloc and is similar to read-copy-update (RCU) in the Linux kernel ([PEP 703](#s-r1-foundations-01)).

Lock-free reading creates one more problem: a reader may still be looking at memory that a writer has just replaced. The build therefore uses a safe memory reclamation scheme called quiescent state-based reclamation (QSBR). It defers freeing the memory behind structures such as the list object and the dictionary keys object instead of freeing it at once ([free-threading HOWTO](#s-r1-foundations-04)).

**The specializing interpreter.** CPython's specializing adaptive interpreter (PEP 659) specializes bytecode as a program runs and keeps inline caches beside it. PEP 703 makes this thread-safe by guarding specialization with a mutex. In multi-threaded programs running without the GIL, it specializes each bytecode only once, so no thread reads a partially written inline cache ([PEP 703](#s-r1-foundations-01)). According to the 3.14 release notes, the PEP 703 implementation was finished in 3.14 and the specializing adaptive interpreter is now enabled in free-threaded mode ([What's New in 3.14](#s-r1-foundations-06)). That matters for the overhead figures below.

```diagram #safety-stack
kind: stack
title: What replaces the GIL, layer by layer
layers:
  - {label: "Your Python code", items: ["still needs its own locks for compound operations"], tone: muted}
  - {label: "Built-in containers", items: ["per-object locks", "critical sections", "lock-free reads"], tone: accent}
  - {label: "Reference counts", items: ["biased counting", "immortal objects", "deferred counting"], tone: series-3}
  - {label: "Memory", items: ["mimalloc", "QSBR delayed freeing"], tone: store}
caption: The mechanisms PEP 703 adds, from the code you write down to the allocator.
```

## Status today {#status}

As of October 2026, two release lines carry a supported free-threaded build. In Python 3.14 the free-threaded build is officially supported and no longer experimental, which is phase II ([What's New in 3.14](#s-r1-foundations-06)). Python 3.15 was released on 9 October 2026 ([What's New in 3.15](#s-r1-practice-05)). Its release highlights list a stable ABI for free-threaded builds (PEP 803), and its official macOS binaries install free-threading support by default ([What's New in 3.15](#s-r1-practice-05)). The Steering Council said in June 2025 that free-threading is a supported build option now and into the future, and will not be removed without a proper deprecation schedule ([Steering Council acceptance of PEP 779](#s-r1-foundations-07)).

Not every page uses the same word. The [Python Free-Threading Guide's install page](#s-r1-practice-04) (py-free-threading.github.io, a community guide maintained by Quansight Labs and contributors) still names the macOS installer option "Free-threaded Python [experimental]", while the 3.14 release notes say the build is no longer experimental.

Phase III, the free-threaded build as the default, has not been decided. At the PEP 779 acceptance (June 2025) and in the 3.14 release notes, any move to phase III was still undecided and depended on many factors within CPython and the community ([Steering Council acceptance of PEP 779](#s-r1-foundations-07); [What's New in 3.14](#s-r1-foundations-06)). PEP 779 says that decision will revolve around community support, willingness and showing clear benefit, and leaves it for a future PEP ([PEP 779](#s-r1-foundations-02)). Two older guesses at the timing exist. PEP 703's author sketched, as an open issue rather than a plan, a GIL controlled by a runtime flag in 2026–2027 and the GIL disabled by default in 2028–2030 ([PEP 703](#s-r1-foundations-01)). In July 2023 the Steering Council estimated it might take as much as five years to make no-GIL the default ([Steering Council notice](#s-r1-foundations-03)). Neither is a commitment.

How mature is it? Supported does not mean every corner is finished. The 3.15 notes still call the JIT compiler experimental, and their JIT section does not mention the free-threaded build either way ([What's New in 3.15](#s-r1-practice-05)). Projects on top of CPython are more cautious still. The [Granian README](#s-r1-cases-01) (github.com, the project's own documentation) warns that its free-threaded support is still experimental and highly discouraged in production. Thomas Wouters, a CPython core developer who works on the free-threaded interpreter at Meta, suspects that Linux distributors such as Red Hat and Debian, and large companies like Meta, will enable free threading as the default before the Python project does ([LWN, 2026](#s-r1-criticism-09)). That is his forecast, not a plan.

## Trying it {#trying-it}

### Getting an interpreter {#install}

Since Python 3.13, the official python.org macOS and Windows installers can optionally install free-threaded binaries ([free-threading HOWTO](#s-r1-foundations-04)). The Free-Threading Guide says you must customize the installer to get them. On Windows there is a "Download free-threaded binaries" checkbox under "Advanced Options"; on macOS there is an option on the Customize screen ([install guide](#s-r1-practice-04)). On 3.15, the official macOS binaries install free-threading support by default ([What's New in 3.15](#s-r1-practice-05)).

The guide lists other routes: `uv venv --python 3.14t`, `mamba create -n nogil -c conda-forge python-freethreading`, `brew install python-freethreading`, Fedora's `python3.14-freethreading` package, and python3.14t in the manylinux container images ([install guide](#s-r1-practice-04)). The uv documentation adds a subtlety. uv can install free-threaded CPython 3.13+, and uses the 3.13 variants only when you ask for them explicitly (for example `3.13t`). For 3.14+ it may use a free-threaded interpreter without explicit selection, but still prefers the GIL-enabled build, for example for `uv python install 3.14` ([uv: Python versions](#s-r1-practice-08), docs.astral.sh).

According to the [guide's page on running with the GIL disabled](#s-r1-practice-07), the free-threaded executable always has a version-plus-"t" name: `python3.14t`, or `python3.14t.exe` on Windows. Whether plain `python` points at it depends on how you installed it.

```console title="Trying it with uv"
$ uv venv --python 3.14t
$ source .venv/bin/activate
$ python -VV
```

### Checking what you are running {#check}

There are three checks, and they answer different questions ([free-threading HOWTO](#s-r1-foundations-04)):

- `python -VV` and `sys.version` contain "free-threading build" (in 3.13, "experimental free-threading build"). This tells you which binary you started.
- `sysconfig.get_config_var("Py_GIL_DISABLED")` returns 1 on a build that supports free threading; the docs recommend it for decisions about the build.
- `sys._is_gil_enabled()` reports whether the GIL is actually disabled in the running process right now.

```python title="check_gil.py" #check-gil
import sys
import sysconfig

print("free-threaded build:", sysconfig.get_config_var("Py_GIL_DISABLED") == 1)
print("GIL enabled right now:", sys._is_gil_enabled())
```

The last check matters because the answer can change while your program runs. A free-threaded build can run with the GIL enabled or disabled, chosen through the `PYTHON_GIL` environment variable or the `-X gil` option: `-X gil=1` enables it, `-X gil=0` disables it ([free-threading HOWTO](#s-r1-foundations-04)). The command-line documentation adds that these settings are available only on builds configured with `--disable-gil`, and that `-X gil` takes precedence over `PYTHON_GIL` ([command line and environment](#s-r3-practice-05)). And as [the dependencies section](#dependencies) shows, importing an extension can switch the GIL back on.

> [!WARNING] Two official pages disagree about the default
> The current [glossary](#s-r2-evidence-03) says, under "global interpreter lock", that after building Python with `--disable-gil`, "code must be run with -X gil=0 or after setting the PYTHON_GIL=0 environment variable". The current [free-threading HOWTO](#s-r1-foundations-04) describes free threading as a build "where the global interpreter lock (GIL) is disabled", one that supports "optionally running with the GIL enabled at runtime". Both are 3.15.1 docs, and the [command-line page](#s-r3-practice-05) describes `gil=0` as forcing the GIL off. The pages have not been reconciled. Run the check above instead of relying on either sentence.

### What it costs: single-thread overhead and memory {#overhead}

The free-threaded build runs single-threaded code somewhat slower than the default build. The figures have dropped sharply since 3.13, but the official sources do not agree on one number for the current release, so here they all are, each with its date and source:

| Release | Figure | Source |
|---|---|---|
| 3.13 | about 40% on pyperformance, mostly because the specializing interpreter was disabled | [3.13 HOWTO](#s-r1-evidence-02) |
| 3.13 | a 20–40% slowdown, as Wouters described it in 2026 | [LWN, 2026](#s-r1-criticism-09) |
| March 2025 | around 10%, about 3% on macOS | [PEP 779](#s-r1-foundations-02) |
| 3.14 | roughly 5–10%, depending on platform and C compiler | [What's New in 3.14](#s-r1-foundations-06) |
| 3.14 | 0–10%, usually about 5% on Linux with GCC, more with older compilers (Wouters, as reported by LWN) | [LWN, 2026](#s-r1-criticism-09) |
| 3.14 and 3.15 HOWTO | about 1% on macOS aarch64 to 8% on x86-64 Linux, pyperformance average | [3.14 HOWTO](#s-r1-evidence-01); [3.15 HOWTO](#s-r2-evidence-01) |

Pyperformance is the benchmark suite these figures are measured on. The 3.15 HOWTO page was last updated on 22 October 2026, but it prints no date for the measurement itself, so do not read its 1–8% as a fresh 3.15 measurement. The 3.13-era range from Wouters and the HOWTO's single 3.13 figure measure different things: a range across workloads against a suite average. The direction is clear, though. The 3.13 penalty was large, and on 3.14 the project's own figures sit between about 1% and 10% depending on platform and compiler.

Memory goes the other way. PEP 779 reported about 15–20% higher memory use (geometric mean on pyperformance) and proposed a 20% target for phase II. The Steering Council's acceptance set the bar as memory increases below 15%, with a hard limit of 20%. For speed, its official target was staying within 10% degradation, with slowdowns of up to 15% to be discussed with the Council in advance ([PEP 779](#s-r1-foundations-02); [Steering Council acceptance of PEP 779](#s-r1-foundations-07)). The docs give the reasons for the extra memory: immortal interned strings, a larger header on objects the garbage collector does not track, delayed freeing under QSBR, and mimalloc replacing pymalloc ([free-threading HOWTO](#s-r1-foundations-04)). On AMD64, `None` takes 32 bytes on the free-threaded build against 16 on the default build, while dicts and lists are the same size on both ([3.15 HOWTO](#s-r2-evidence-01)).

What about the other side of the ledger, the multi-core speedup on today's release? This research found no independent, dated multi-thread benchmark for the current release; the published numbers are blog and forum posts. The only fair advice is to measure your own workload, on both builds, with the same code.

```python title="bench_threads.py" #bench
import sys
import time
from concurrent.futures import ThreadPoolExecutor

def work(n):
    total = 0
    for i in range(n):
        total += i * i
    return total

def run(threads, n=2_000_000):
    start = time.perf_counter()
    with ThreadPoolExecutor(max_workers=threads) as pool:
        list(pool.map(work, [n] * threads))
    return time.perf_counter() - start

print("GIL enabled:", sys._is_gil_enabled())
for threads in (1, 2, 4, 8):
    print(threads, "threads:", round(run(threads), 2), "s")
```

Run it under `python3.14` and `python3.14t` and compare how the time changes as threads are added. If the free-threaded run looks no different from the ordinary one, check the first line of output: something may have turned the GIL back on.

### Is the ecosystem ready? {#ecosystem}

Pure-Python packages already work on free-threaded builds. The open question is packages with compiled extensions, which need a wheel built for the "t" ABI (for example `cp313t`) ([Free-Threaded Wheels tracker](#s-r1-evidence-05), hugovk.github.io). That tracker follows the 360 most-downloaded PyPI packages with extensions. In its data updated on 22 October 2026, 219 of the 360 had free-threaded wheels on PyPI ([Free-Threaded Wheels tracker](#s-r1-evidence-05)). A wheel existing is not proof the package is thread-safe, only that it installs. In the same data, numpy, scipy, pandas, lxml and pydantic-core offered free-threaded wheels, while orjson, psycopg-binary, grpcio and protobuf did not yet. The [Free-Threading Guide's tracking table](#s-r1-evidence-06) lists the first supporting versions of several libraries: NumPy 2.1.0, pandas 2.2.3, SciPy 1.15.0, Cython 3.1.0, pydantic-core 2.29.0, lxml 7.0.0, cryptography 46.0.0, Pillow 11.0.0 and PyTorch 2.6.0. It lists no supporting version for orjson or psycopg.

## What changes for your code {#your-code}

### Threads {#threads}

The free-threaded build aims for thread-safety at the Python level similar to the default build. Built-in types such as dict, list and set use internal locks against concurrent modification. Even so, the docs recommend `threading.Lock` or other synchronization primitives rather than relying on those internal locks ([free-threading HOWTO](#s-r1-foundations-04)). The [porting guide](#s-r1-criticism-02) (py-free-threading.github.io) draws the line clearly. The interpreter protects you from low-level memory unsafety caused by data races, but not from race conditions in your own code.

Here is the uncomfortable part. Many pure-Python operations only *appear* thread-safe on the GIL build, because of when CPython happens to switch threads. The GIL masked races rather than preventing them, and free threading makes such latent bugs more likely to show ([porting guide](#s-r1-criticism-02); [LWN, 2026](#s-r1-criticism-09)). Even the old Library FAQ, written for the GIL build, lists `i = i+1` and `D[x] = D[x] + 1` as not atomic and advises "When in doubt, use a mutex!" ([Library FAQ](#s-r1-criticism-10)).

The [Thread Safety Guarantees page](#s-r1-criticism-04) (docs.python.org) now spells out what you can rely on in the free-threaded build:

| Operation | Guarantee |
|---|---|
| `lst[i]` (read one element) | atomic |
| `lst.append(x)` | atomic |
| `lst[i] = x` from several threads | will not corrupt the list |
| `d[key]`, `d.get(key)`, `key in d`, `len(d)` | lock-free and atomic |
| `d[key] = value`, `del d[key]`, `d.pop(...)`, `d.setdefault(...)` from several threads | will not corrupt the dict |
| `lst[i] = lst[i] + 1`, `if key in d: del d[key]`, iteration | never atomic: synchronize externally |

The last row is the one that bites. A "check-then-act" sequence is two operations, and another thread can run between them. The docs suggest single atomic operations instead, such as `d.pop(key, None)` or handling `KeyError`, and iterating over a copy (`d.copy().items()`) when another thread may modify the dict ([Thread Safety Guarantees](#s-r1-criticism-04)):

```python title="check_then_act.py" #check-then-act
# Racy: another thread can delete the key between the check and the delete.
if key in cache:
    del cache[key]

# Safe: one atomic operation.
cache.pop(key, None)

# Safe iteration while other threads may write.
for k, v in cache.copy().items():
    ...
```

Iterators are another trap. Using the same iterator object from several threads at once is generally not thread-safe, and threads may see duplicate or missing elements. The 3.13 edition of the HOWTO also warned that it could crash the interpreter; the 3.15.1 edition no longer does ([free-threading HOWTO](#s-r1-foundations-04); [3.13 HOWTO](#s-r1-evidence-02)). The porting guide names global mutable state as the most common source of thread-safety issues in Python packages. Its example is a module-level or class-level cache filled from several threads, where two threads can both miss and both compute the value ([porting guide](#s-r1-criticism-02)).

One behaviour also differs by default. The guide notes that on the free-threaded build a new thread inherits a copy of the spawning thread's `contextvars` context, while on the GIL build it starts from each variable's default ([porting guide](#s-r1-criticism-02)).

Not everyone frames the risk the same way. Answering a question at FOSDEM 2026, the web-performance speaker Ruben Hias said the main race-condition concern is for authors of C extensions, and that developers writing pure Python "shouldn't need to care about this" ([FOSDEM 2026 talk recording](#s-r2-criticism-02)). The CPython documentation and the porting guide take the opposite position, quoted above. Write your code as though they are right.

### asyncio {#asyncio}

asyncio is where expectations most often go wrong. Since Python 3.14, asyncio has first-class support for free-threaded Python, and its implementation is safe to use in a multi-threaded environment ([asyncio and free-threaded Python](#s-r2-practice-06), docs.python.org). But an event loop runs all its callbacks and Tasks in its own thread, one Task at a time. On one event loop, the Python code handling each connection still runs serially, free-threaded build or not ([asyncio and free-threaded Python](#s-r2-practice-06); [asyncio developer guide](#s-r2-practice-02)). An ordinary single-loop asyncio service gets no parallelism from the new build.

To use several cores, the docs show running one event loop per thread, each thread starting its own loop with `asyncio.run()`. On a free-threaded build, the handling of different requests then runs in parallel across cores ([asyncio and free-threaded Python](#s-r2-practice-06)). The 3.14 release notes describe asyncio's support as enabling parallel execution of event loops in different threads that "scales linearly" with the number of threads ([What's New in 3.14](#s-r1-foundations-06)). That is the project's own description, not a published measurement.

```diagram #loop-per-thread
kind: flow
title: One loop versus one loop per thread
direction: right
groups:
  - {id: single, label: "One event loop", nodes: [l1, t1, t2]}
  - {id: multi, label: "One loop per thread (free-threaded)", nodes: [la, lb, ta, tb]}
nodes:
  - {id: l1, label: "Loop in thread 1", shape: pill}
  - {id: t1, label: "Task A"}
  - {id: t2, label: "Task B"}
  - {id: la, label: "Loop in thread 1", shape: pill, tone: accent}
  - {id: lb, label: "Loop in thread 2", shape: pill, tone: accent}
  - {id: ta, label: "Task A"}
  - {id: tb, label: "Task B"}
edges:
  - {from: l1, to: t1, label: "one at a time"}
  - {from: l1, to: t2, label: "one at a time", style: dashed}
  - {from: la, to: ta, label: "core 1"}
  - {from: lb, to: tb, label: "core 2"}
caption: A single loop still runs one Task at a time; separate loops in separate threads can run on separate cores.
```

The rules for mixing threads and asyncio do not relax. The asyncio developer guide still says almost all asyncio objects are not thread safe ([asyncio developer guide](#s-r2-practice-02)). That is about sharing *objects* across threads, not about the implementation's internal safety mentioned above. Under free threading the docs still say ([asyncio and free-threaded Python](#s-r2-practice-06)):
- each thread has its own event loop, not shared with other threads;
- Tasks and futures created in one thread are not awaited or manipulated from another;
- cross-thread submission goes through `asyncio.run_coroutine_threadsafe()` or `loop.call_soon_threadsafe()`.

asyncio's own primitives, such as `asyncio.Lock` and `asyncio.Event`, are not designed for use across threads, and `asyncio.Queue` is safe only within a single loop. Use `threading` primitives between threads, and `queue.Queue` to hand work from a plain thread to a loop. In debug mode, many non-thread-safe APIs such as `loop.call_soon()` raise an exception when called from the wrong thread ([asyncio developer guide](#s-r2-practice-02)).

What does change is off-loading. The `asyncio.to_thread()` docs say it is mainly meant for I/O-bound functions, and that because of the GIL it can typically only make I/O-bound functions non-blocking. With a Python implementation without a GIL, it can also be used for CPU-bound functions ([asyncio tasks](#s-r2-practice-03)). The asyncio and free-threading page says off-loading CPU-bound work to a thread or process pool is limited by the GIL in CPython. Combining asyncio with threads on free-threaded Python is useful when blocking or CPU-bound code must run from an asyncio application ([asyncio and free-threaded Python](#s-r2-practice-06)).

### Threads instead of processes? {#multiprocessing}

For CPU-bound data processing, `multiprocessing` and `ProcessPoolExecutor` were the standard way around the GIL. They have a cost: the docs say `ProcessPoolExecutor` uses multiprocessing to side-step the GIL, which means only picklable objects can be executed and returned ([concurrent.futures](#s-r1-cases-06)). Wouters, speaking in 2026, added the other costs: processes have more overhead, do not share an address space, and typically need more memory and copying of data between them ([LWN, 2026](#s-r1-criticism-09)). In 2024 Anthony Shaw said multiprocessing has the largest start-up time of the options he compared, and described handing work to other cores as needing data serialization, for example with pickle ([LWN, 2024](#s-r1-evidence-08)). His judgment, as LWN reported it, was that free threading would be the better choice than subinterpreters for CPU-heavy tasks that are easy to split and need only "quick data exchange" between them.

So threads can replace processes when the work splits cleanly and the data is large or awkward to pickle. Wouters said that where the alternatives do not give the performance needed, multi-threaded solutions without the GIL "can" offer higher throughput, lower memory use and lower latency ([LWN, 2026](#s-r1-criticism-09)). Several things still favour processes:

- **A dependency can take the gain away.** Some third-party packages, particularly ones with extension modules, may not be ready for the free-threaded build and will re-enable the GIL ([3.15 HOWTO](#s-r2-evidence-01)). The work then runs serialized again, in one process.
- **Shared objects are slow.** Wouters said that sharing objects between threads is still problematic for performance, and that many threads hitting the same objects is a problem Python cannot solve directly. Making code scale may need more extensive changes; he pointed to the ft_utils package's scalable containers ([LWN, 2026](#s-r1-criticism-09)).
- **A dead worker is visible.** Processes are separate programs, and a pool reports a worker that dies: as of 3.15, when a `ProcessPoolExecutor` child terminates abruptly, the traceback gives its PID and exit code ([What's New in 3.15](#s-r1-practice-05)).

Subinterpreters are the third option. Interpreters do not share the GIL, so threads combined with multiple interpreters already allow full multi-core parallelism, and have since Python 3.12. Interpreters on their own provide little more than isolation; the concurrency comes from combining them with threads ([concurrent.interpreters](#s-r1-cases-03)). Most objects passed between interpreters are copied with pickle. The docs say `InterpreterPoolExecutor` can take extra effort, because it forces you to be deliberate about how interpreters interact and what data they share; mutable data cannot be shared, and changes between copies must be synchronized by hand. In return you avoid thread pain points such as race conditions ([concurrent.futures](#s-r1-cases-06); [concurrent.interpreters](#s-r1-cases-03)).

| | Threads (free-threaded) | Subinterpreters | Processes |
|---|---|---|---|
| Shares Python objects | yes | no: copies, mostly via pickle | no: pickled |
| Parallel Python code | yes | yes, with threads, since 3.12 | yes |
| Your code needs locks | yes | for synchronizing copies | no shared state |

### Web services {#web-services}

A web request mixes waiting, on a database, a cache or another service, with CPU work such as routing, validation and serialization. The GIL is already released during the waiting, so the gain from free threading can only come from the CPU part.

Evidence here is thin. Among servers, this research found documented free-threaded support only for Granian. Its README says it has supported free-threaded Python since Granian 2.0, with separate wheels ([Granian README](#s-r1-cases-01)). On the free-threaded build it runs its workers as threads instead of processes, one interpreter serving all of them, and for ASGI each worker thread runs its own event loop. The README says GIL limits are "theoretically" absent for synchronous protocols such as WSGI. It also says there is not yet enough data to recommend worker and thread settings, so you must experiment. And it calls the support experimental and discourages it in production.

The one measurement this research found is a single talk. At FOSDEM 2026 Ruben Hias benchmarked a mixed I/O-and-CPU API, taking Gunicorn with gthread workers as "the very baseline" ([FOSDEM 2026 talk recording](#s-r2-criticism-02); [talk page](#s-r2-criticism-01), fosdem.org). For the mix of I/O and CPU work, he drew on unnamed research suggesting most production applications spend between 70-30 and 90-10 of their time waiting on I/O versus doing CPU work. On the GIL build, Gunicorn gthread and Granian rose roughly linearly and then saturated, Granian a little later because it does some network I/O in Rust, and an ASGI framework capped at the same point; he attributes the ceiling to the GIL. In his runs, free-threaded Gunicorn broke through a ceiling of about 400 requests per second and came "very close" to the multi-process line, and free-threaded Granian matched the multi-process results. He also reported that a WSGI server with Gevent reached 93% of a full ASGI implementation's performance, and said, hedging, that some libraries such as uvloop still have issues with free threading.

These are one speaker's results, on one machine, from a machine-generated transcript. No independent replication was found. Wouters, for his part, thinks asyncio is the best way to do network I/O, "where threads can easily lead you wrong" ([LWN, 2026](#s-r1-criticism-09)).

## What changes for your dependencies {#dependencies}

Builds without the GIL are not ABI-compatible with the standard build, because the object header changes for biased reference counting, so C-API extensions must be rebuilt for the free-threaded build ([PEP 703](#s-r1-foundations-01)). Free-threaded wheels, shared libraries and binaries carry a "t" suffix, and cibuildwheel builds free-threaded wheels for Python 3.14 and newer ([extension HOWTO](#s-r1-practice-03)).

### When there is no free-threaded wheel {#no-wheel}

When you `pip install`, pip prefers wheels and, if no satisfactory wheel is found, falls back to source archives ([pip user guide](#s-r3-practice-12), pip.pypa.io). uv does the same: if no matching wheel exists in the index, it tries to build the source distribution ([uv: build failures](#s-r3-practice-11)). For a package with a C extension and no `cp314t` wheel, the install becomes a compile, and fails if you have no compiler. The Free-Threading Guide's FAQ gives a 3.13 example: `pip install jupyter` could fail without a compilation environment, because dependencies such as PyYAML did not ship free-threaded binaries. Its dependencies page now says PyYAML 6.0.3+ supports free-threaded Python from 3.14t ([guide FAQ](#s-r3-practice-08); [handling dependencies](#s-r3-practice-06)). If you would rather fail fast than compile, pip's `--only-binary :all:` stops pip from using source packages, so packages without binaries fail to install ([pip install](#s-r3-practice-09)).

```diagram #install-flow
kind: flow
title: Installing and importing a package with a C extension on a free-threaded build
direction: down
nodes:
  - {id: start, label: "pip or uv install", shape: pill}
  - {id: wheel, label: "Matching free-threaded wheel?"}
  - {id: sdist, label: "Build from source", sub: "needs a compiler", tone: warn}
  - {id: fail, label: "Install fails", tone: bad}
  - {id: imp, label: "import the module"}
  - {id: marked, label: "Declares it runs without the GIL?"}
  - {id: ok, label: "GIL stays off", tone: ok}
  - {id: gil, label: "GIL enabled", sub: "RuntimeWarning names the module", tone: warn}
edges:
  - {from: start, to: wheel}
  - {from: wheel, to: imp, label: "yes"}
  - {from: wheel, to: sdist, label: "no"}
  - {from: sdist, to: fail, label: "build error", style: dashed}
  - {from: sdist, to: imp, label: "built"}
  - {from: imp, to: marked}
  - {from: marked, to: ok, label: "yes"}
  - {from: marked, to: gil, label: "no"}
caption: Two separate gates. The installer decides whether you get a binary; the import decides whether the GIL stays off.
```

### When an extension turns the GIL back on {#gil-reenabled}

Getting a package installed is not the end. On a free-threaded build, importing a C-API extension module that is not explicitly marked as supporting free threading can automatically enable the GIL, and a warning is printed ([free-threading HOWTO](#s-r1-foundations-04)). The warning comes from CPython's `Python/import.c`. On the 3.15 branch, at commit 88b0f7d, it is a `RuntimeWarning` that names the module ([CPython import.c](#s-r3-practice-07), github.com):

```text title="The warning (CPython 3.15, Python/import.c)"
RuntimeWarning: The global interpreter lock (GIL) has been enabled to load module '<name>', which has not declared that it can run safely without the GIL. To override this behavior and keep the GIL disabled (at your own risk), run with PYTHON_GIL=0 or -Xgil=0.
```

The warning names the override. `-X gil=0` and `PYTHON_GIL=0` force the GIL off ([command line and environment](#s-r3-practice-05)). The Free-Threading Guide explains that this skips the runtime check for whether extensions support running without the GIL. It presents the override for users who do not control the extension, or who want to test anyway ([running with the GIL disabled](#s-r1-practice-07)). CPython's own wording is "at your own risk", and Wouters called forcing the GIL off "playing with fire", probably only for testing ([LWN, 2026](#s-r1-criticism-09)). Since the GIL can come back on at any import, check `sys._is_gil_enabled()` after your imports, not only at start-up.

The guide also lists dependency-specific fixes ([handling dependencies](#s-r3-practice-06)):
- require CFFI 2.1.1 or newer on free-threaded 3.15 (CFFI 2.0.0 on 3.14);
- use PyYAML 6.0.3+ on 3.14t, or the PyYAML-ft fork on 3.13t;
- use a pure-Python build of a mypyc-compiled package when no compiled build is available;
- replace the `zstandard` package with Python 3.14's `compression.zstd` or `backports.zstd`.

The general pattern, which the [porting guide](#s-r1-criticism-02) also suggests, is that a package may be able to switch to a fork of a dependency that does support free threading.

If you maintain an extension, declaring support is one line. A module using multi-phase initialization adds a `{Py_mod_gil, Py_MOD_GIL_NOT_USED}` slot; one using single-phase initialization calls `PyUnstable_Module_SetGIL()` ([extension HOWTO](#s-r1-practice-03)).

### The stable ABI: abi3 and abi3t {#abi3t}

Many packages ship one "stable ABI" wheel, tagged `abi3`, that works across Python versions. The Python 3.15 docs now describe two stable ABIs ([C API stability, 3.15](#s-r3-practice-01)):
- `abi3`, introduced in Python 3.2, compatible with builds that are not free-threaded;
- `abi3t`, introduced in 3.15 by PEP 803, compatible with free-threaded builds, with stricter API limits than `abi3`.

Free-threaded interpreters only recognize the `abi3t` shared-library tag, while ordinary interpreters prefer `abi3` and fall back to `abi3t`. An extension can be compiled for both at once, which the docs say currently has no downside compared with `abi3t` alone.

What this means for you depends on the version:

- **3.13t and 3.14t** have no stable ABI. The Free-Threading Guide says their extensions need version-specific wheels, and an ordinary `abi3` extension stays limited to GIL-enabled builds ([porting extensions](#s-r2-practice-07)). PEP 803 says that before `abi3t`, extensions built for GIL-enabled CPython fail to load or crash on free-threaded builds ([PEP 803](#s-r2-practice-01)).
- **3.15t** loads `abi3t` extensions. According to PEP 803, unlike 3.14, it does not load extensions with the plain `abi3` filename tag. In free-threaded builds, `PyModuleDef_Init()` detects an extension using the ordinary stable ABI, prints an informative message, and raises an exception; the PEP notes this check may be removed in a future version ([PEP 803](#s-r2-practice-01)). The existing `abi3` stays compatible with GIL-enabled CPython. PEP 803 encourages authors to build for both and tag the wheel `abi3.abi3t`; a `cp315-abi3.abi3t` wheel works on 3.15, 3.16 and later.

One caution: `abi3t` makes an extension *load* on free-threaded Python, not necessarily be thread-safe without a GIL ([PEP 803](#s-r2-practice-01)). And the 3.15.1 extension HOWTO still says the free-threaded build "does not currently support the Limited C API or the stable ABI" ([extension HOWTO](#s-r1-practice-03)). It matches 3.13 and 3.14; for 3.15, the stable ABI page above, which introduces `abi3t`, is the one to follow.

## Costs and limitations {#limitations}

Supported is not the same as bug-free. The porting guide lists what to expect from packages not yet updated for free threading: non-deterministic results, possibly also with the GIL, and interpreter crashes in multi-threaded use when C extensions are involved ([porting guide](#s-r1-criticism-02)). Some debugging tools are touchy too. The 3.15.1 HOWTO says accessing `frame.f_locals` of a frame running in another thread is not safe and may crash the interpreter ([free-threading HOWTO](#s-r1-foundations-04)). The Free-Threading Guide's [debugging page](#s-r1-criticism-06), on the other hand, says Python-level access is "guaranteed not to produce any major interpreter crash". The two pages do not agree; until they do, treat cross-thread frame inspection as unsafe.

Performance has its own limits. To avoid reference-count contention, some objects are immortal, but as of 3.14 that is limited to code constants and strings interned with `sys.intern()` ([free-threading HOWTO](#s-r1-foundations-04)). Wouters said at PyCon US 2026 that having many threads access the same objects is a problem Python cannot solve directly, and that "sharing objects between threads is still problematic for performance" ([LWN, 2026](#s-r1-criticism-09)). And budget for more memory, for the reasons [listed above](#overhead).

## Best practices & next steps {#next-steps}

The practices worth adopting come straight from the people building and porting the free-threaded ecosystem.

**Where the guidance aligns.** Lock your own shared state. The CPython docs recommend `threading.Lock` or other primitives rather than relying on the built-ins' internal locks ([free-threading HOWTO](#s-r1-foundations-04) — docs.python.org). The porting guide names global mutable state as the most common source of problems ([porting guide](#s-r1-criticism-02) — py-free-threading.github.io). Test before you trust: the testing guide advises running your existing test suite on the free-threaded build first, and fixing failures that appear only with the GIL disabled ([testing guide](#s-r1-criticism-03) — py-free-threading.github.io). It names pytest-run-parallel, pytest-freethreaded and unittest-ft as tools that run existing tests in many threads at once. They find issues caused by global state, not issues from multi-threaded use of a library's own data structures. pytest-run-parallel's README says its main goal is finding thread-safety issues when using C libraries ([pytest-run-parallel](#s-r1-criticism-07) — github.com). Because concurrency bugs often pass most of the time, the debugging guide recommends repetition, for example `PYTHON_GIL=0 pytest --count=100` with pytest-repeat ([debugging guide](#s-r1-criticism-06) — py-free-threading.github.io).

**Where you might deliberately diverge.** The free-threaded build is supported, not default, and nothing obliges you to move. Processes still give isolation, and a dependency without a free-threaded wheel can quietly re-enable the GIL ([3.15 HOWTO](#s-r2-evidence-01) — docs.python.org). Staying on the GIL build, or on processes or subinterpreters, is a legitimate choice. So is subinterpreters' explicit sharing instead of shared memory, for code where avoiding race conditions matters more than convenience ([concurrent.futures](#s-r1-cases-06) — docs.python.org).

**Next steps:**
1. **Install a `t` interpreter next to your normal one**, for example `uv venv --python 3.14t`, and run [`check_gil.py`](#check-gil) after importing your real dependencies ([free-threading HOWTO](#s-r1-foundations-04) — docs.python.org).
2. **Check your dependency list against the tracker** before you start, and add `--only-binary :all:` if you want missing wheels to fail fast instead of compiling ([Free-Threaded Wheels tracker](#s-r1-evidence-05) — hugovk.github.io; [pip install](#s-r3-practice-09) — pip.pypa.io).
3. **Run your test suite under pytest-run-parallel** on the free-threaded build, and fix anything that touches global mutable state ([testing guide](#s-r1-criticism-03) — py-free-threading.github.io).
4. **Measure your own workload** with something like [`bench_threads.py`](#bench) on both builds. For asyncio services, remember that a single loop gains nothing; only a loop per thread does ([asyncio and free-threaded Python](#s-r2-practice-06) — docs.python.org).

## Quiz {#quiz-section}

```quiz #quiz
title: Check yourself
items:
  - id: q-loop
    type: choice
    prompt: "Your FastAPI-style service runs on a single asyncio event loop. You switch it to `python3.14t` without changing anything else. What happens to the Python code that handles two concurrent requests?"
    options:
      - {id: a, text: It runs in parallel on two cores because the GIL is gone}
      - {id: b, text: It still runs one Task at a time on the loop's thread}
      - {id: c, text: It crashes because asyncio is not thread-safe}
      - {id: d, text: It runs in parallel only if you call asyncio.to_thread for each request handler}
    answer: [b]
    explain: |
      An event loop runs its callbacks and Tasks in its own thread, one Task at a time, so a single loop still executes the handlers serially on any build. Parallelism needs a loop per thread (or off-loading blocking or CPU-bound work to threads).
  - id: q-abi
    type: choice
    prompt: "On Python 3.15t, which stable-ABI shared-library tag does the interpreter recognize?"
    options:
      - {id: a, text: abi3 only}
      - {id: b, text: abi3t only}
      - {id: c, text: both abi3 and abi3t}
      - {id: d, text: neither; free-threaded builds have no stable ABI}
    answer: [b]
    explain: |
      The 3.15 docs say free-threaded interpreters only recognize the abi3t tag, while ordinary interpreters prefer abi3 and fall back to abi3t. "Neither" was true of 3.13t and 3.14t, not of 3.15t.
  - id: q-atomic
    type: choice
    prompt: "On the free-threaded build, which of these are documented as atomic? Select all that apply."
    options:
      - {id: a, text: "lst.append(x)"}
      - {id: b, text: "d.get(key)"}
      - {id: c, text: "if key in d: del d[key]"}
      - {id: d, text: "lst[i] = lst[i] + 1"}
    answer: [a, b]
    explain: |
      Single operations like `append` and `get` are atomic. Check-then-act and read-modify-write sequences are several operations, and another thread can run between them; they are never atomic and need a lock or a single atomic call such as `d.pop(key, None)`.
  - id: q-import
    type: choice
    prompt: "On a free-threaded build with no PYTHON_GIL setting, you import a C extension that has not declared it can run without the GIL. What happens by default?"
    options:
      - {id: a, text: The import fails with ImportError}
      - {id: b, text: The extension loads and the GIL stays off}
      - {id: c, text: The GIL is enabled and a RuntimeWarning names the module}
      - {id: d, text: The interpreter restarts itself in a GIL-enabled build}
    answer: [c]
    explain: |
      As a precaution the interpreter assumes the extension needs the GIL, enables it, and warns, naming the module and the override (`PYTHON_GIL=0` or `-X gil=0`, at your own risk). That is why you check `sys._is_gil_enabled()` after your imports.
  - id: q-io
    type: recall
    prompt: "A script uses 20 threads that mostly wait on HTTP downloads. Why might it barely speed up on the free-threaded build?"
    answer: |
      Because the GIL is always released while doing I/O, the threads' waiting already overlapped on the ordinary build. Only the short stretches where they run Python code were serialized, and that is all free threading can speed up.
  - id: q-check
    type: cloze
    text: "To learn whether the GIL is actually disabled in the running process, call {{sys._is_gil_enabled()|sys._is_gil_enabled|_is_gil_enabled}}."
    explain: |
      `python -VV` and `sysconfig.get_config_var("Py_GIL_DISABLED")` tell you which build you have; only `sys._is_gil_enabled()` tells you the state right now, which an import can change.
```

## Sources {#sources-heading}

```sources #sources
items:
  - id: s-r1-foundations-01
    title: "PEP 703 – Making the Global Interpreter Lock Optional in CPython"
    url: https://peps.python.org/pep-0703/
    publisher: Python Software Foundation
    accessed: 2026-10-23
  - id: s-r1-foundations-02
    title: "PEP 779 – Criteria for supported status for free-threaded Python"
    url: https://peps.python.org/pep-0779/
    publisher: Python Software Foundation
    accessed: 2026-10-23
  - id: s-r1-foundations-03
    title: A Steering Council notice about PEP 703 (Making the Global Interpreter Lock Optional in CPython)
    url: https://discuss.python.org/t/a-steering-council-notice-about-pep-703-making-the-global-interpreter-lock-optional-in-cpython/30474
    publisher: Python Steering Council (discuss.python.org)
    date: 2023-07-28
    accessed: 2026-10-23
  - id: s-r1-foundations-07
    title: "PEP 779: Criteria for supported status for free-threaded Python (Steering Council acceptance)"
    url: https://discuss.python.org/t/pep-779-criteria-for-supported-status-for-free-threaded-python/84319/123
    publisher: Python Steering Council (discuss.python.org)
    date: 2025-06-15
    accessed: 2026-10-23
  - id: s-r1-foundations-04
    title: Python support for free threading
    url: https://docs.python.org/3/howto/free-threading-python.html
    publisher: Python documentation (3.15.1)
    accessed: 2026-10-23
  - id: s-r2-evidence-01
    title: Python support for free threading (HOWTO, 3.15)
    url: https://docs.python.org/3.15/howto/free-threading-python.html
    publisher: Python documentation
    date: 2026-10-22
    accessed: 2026-10-23
  - id: s-r1-evidence-01
    title: Python support for free threading (HOWTO, 3.14)
    url: https://docs.python.org/3.14/howto/free-threading-python.html
    publisher: Python documentation
    accessed: 2026-10-23
  - id: s-r1-evidence-02
    title: Python experimental support for free threading (HOWTO, 3.13)
    url: https://docs.python.org/3.13/howto/free-threading-python.html
    publisher: Python documentation
    accessed: 2026-10-23
  - id: s-r1-foundations-05
    title: What's New In Python 3.13
    url: https://docs.python.org/3/whatsnew/3.13.html
    publisher: Python documentation
    accessed: 2026-10-23
  - id: s-r1-foundations-06
    title: What's New In Python 3.14
    url: https://docs.python.org/3/whatsnew/3.14.html
    publisher: Python documentation
    accessed: 2026-10-23
  - id: s-r1-practice-05
    title: What's New In Python 3.15
    url: https://docs.python.org/3.15/whatsnew/3.15.html
    publisher: Python documentation
    accessed: 2026-10-23
  - id: s-r2-evidence-03
    title: Glossary
    url: https://docs.python.org/3/glossary.html
    publisher: Python documentation
    accessed: 2026-10-23
  - id: s-r2-evidence-04
    title: "threading — Thread-based parallelism"
    url: https://docs.python.org/3/library/threading.html
    publisher: Python documentation
    accessed: 2026-10-23
  - id: s-r1-criticism-04
    title: Thread Safety Guarantees
    url: https://docs.python.org/3/library/threadsafety.html
    publisher: Python documentation
    accessed: 2026-10-23
  - id: s-r1-criticism-10
    title: Library and Extension FAQ
    url: https://docs.python.org/3/faq/library.html
    publisher: Python documentation
    accessed: 2026-10-23
  - id: s-r2-practice-06
    title: asyncio and free-threaded Python
    url: https://docs.python.org/3/library/asyncio-threading.html
    publisher: Python documentation
    accessed: 2026-10-23
  - id: s-r2-practice-02
    title: Developing with asyncio
    url: https://docs.python.org/3/library/asyncio-dev.html
    publisher: Python documentation
    accessed: 2026-10-23
  - id: s-r2-practice-03
    title: Coroutines and Tasks
    url: https://docs.python.org/3/library/asyncio-task.html
    publisher: Python documentation
    accessed: 2026-10-23
  - id: s-r1-cases-03
    title: "concurrent.interpreters — Multiple interpreters in the same process"
    url: https://docs.python.org/3/library/concurrent.interpreters.html
    publisher: Python documentation
    accessed: 2026-10-23
  - id: s-r1-cases-06
    title: "concurrent.futures — Launching parallel tasks"
    url: https://docs.python.org/3/library/concurrent.futures.html
    publisher: Python documentation
    accessed: 2026-10-23
  - id: s-r3-practice-05
    title: Command line and environment
    url: https://docs.python.org/3/using/cmdline.html
    publisher: Python documentation
    accessed: 2026-10-23
  - id: s-r1-practice-03
    title: C API Extension Support for Free Threading
    url: https://docs.python.org/3/howto/free-threading-extensions.html
    publisher: Python documentation (3.15.1)
    accessed: 2026-10-23
  - id: s-r3-practice-01
    title: C API and ABI Stability
    url: https://docs.python.org/3.15/c-api/stable.html
    publisher: Python documentation
    accessed: 2026-10-23
  - id: s-r2-practice-01
    title: "PEP 803 – \"abi3t\": Stable ABI for Free-Threaded Builds"
    url: https://peps.python.org/pep-0803/
    publisher: Python Software Foundation
    accessed: 2026-10-23
  - id: s-r3-practice-07
    title: CPython Python/import.c at commit 88b0f7d
    url: https://github.com/python/cpython/blob/88b0f7da77b44631e2750a8eae6277e54a7ac3cd/Python/import.c
    publisher: CPython (GitHub)
    accessed: 2026-10-23
  - id: s-r1-practice-04
    title: Installing Free-Threaded Python
    url: https://py-free-threading.github.io/installing-cpython/
    publisher: Python Free-Threading Guide (Quansight Labs and contributors)
    accessed: 2026-10-23
  - id: s-r1-practice-07
    title: Running Python with the GIL Disabled
    url: https://py-free-threading.github.io/running-gil-disabled/
    publisher: Python Free-Threading Guide
    accessed: 2026-10-23
  - id: s-r1-criticism-02
    title: Porting Python Packages to Support Free-Threading
    url: https://py-free-threading.github.io/porting/
    publisher: Python Free-Threading Guide
    accessed: 2026-10-23
  - id: s-r2-practice-07
    title: Porting Extension Modules to Support Free-Threading
    url: https://py-free-threading.github.io/porting-extensions/
    publisher: Python Free-Threading Guide
    date: 2026-10-12
    accessed: 2026-10-23
  - id: s-r3-practice-06
    title: "Handling dependencies that don't support free-threading"
    url: https://py-free-threading.github.io/dependencies/
    publisher: Python Free-Threading Guide
    accessed: 2026-10-23
  - id: s-r3-practice-08
    title: Frequently seen errors and how to fix them
    url: https://py-free-threading.github.io/faq/
    publisher: Python Free-Threading Guide
    date: 2026-09-25
    accessed: 2026-10-23
  - id: s-r1-criticism-03
    title: Validating thread safety with testing
    url: https://py-free-threading.github.io/testing/
    publisher: Python Free-Threading Guide
    accessed: 2026-10-23
  - id: s-r1-criticism-06
    title: Debugging thread safety issues
    url: https://py-free-threading.github.io/debugging/
    publisher: Python Free-Threading Guide
    accessed: 2026-10-23
  - id: s-r1-evidence-06
    title: Compatibility Status Tracking
    url: https://py-free-threading.github.io/tracking/
    publisher: Python Free-Threading Guide
    accessed: 2026-10-23
  - id: s-r1-evidence-05
    title: Free-Threaded Wheels
    url: https://hugovk.github.io/free-threaded-wheels/
    publisher: Hugo van Kemenade
    date: 2026-10-22
    accessed: 2026-10-23
  - id: s-r1-criticism-07
    title: pytest-run-parallel
    url: https://github.com/Quansight-Labs/pytest-run-parallel
    publisher: Quansight Labs (GitHub)
    accessed: 2026-10-23
  - id: s-r1-practice-08
    title: Python versions
    url: https://docs.astral.sh/uv/concepts/python-versions/
    publisher: uv documentation (Astral)
    accessed: 2026-10-23
  - id: s-r3-practice-11
    title: Build failures
    url: https://docs.astral.sh/uv/reference/troubleshooting/build-failures/
    publisher: uv documentation (Astral)
    accessed: 2026-10-23
  - id: s-r3-practice-12
    title: User Guide
    url: https://pip.pypa.io/en/stable/user_guide/
    publisher: pip documentation
    accessed: 2026-10-23
  - id: s-r3-practice-09
    title: pip install
    url: https://pip.pypa.io/en/stable/cli/pip_install/
    publisher: pip documentation
    accessed: 2026-10-23
  - id: s-r1-evidence-08
    title: Python subinterpreters and free-threading
    url: https://lwn.net/Articles/985041/
    publisher: LWN.net
    date: "2024"
    accessed: 2026-10-23
  - id: s-r1-criticism-09
    title: "Free-threaded Python: past, present, and future"
    url: https://lwn.net/Articles/1078367/
    publisher: LWN.net
    date: 2026-06-22
    accessed: 2026-10-23
  - id: s-r1-cases-01
    title: Granian README
    url: https://github.com/emmett-framework/granian/blob/master/README.md
    publisher: Emmett framework (GitHub)
    accessed: 2026-10-23
  - id: s-r2-criticism-01
    title: "The GIL and API Performance: Past, Present, and Free-Threaded Future"
    url: https://archive.fosdem.org/2026/schedule/event/ABJMWD-the_gil_and_api_performance_past_present_and_free-threaded_future/
    publisher: FOSDEM 2026
    accessed: 2026-10-23
  - id: s-r2-criticism-02
    title: "The GIL and API Performance: subtitle file (VTT) of the talk recording"
    url: https://video.fosdem.org/2026/ua2220/ABJMWD-the_gil_and_api_performance_past_present_and_free-threaded_future.vtt
    publisher: FOSDEM 2026
    note: Machine-generated transcript
    accessed: 2026-10-23
```
