---
title: "Free-threaded CPython: Python without the GIL, and whether to use it today"
date: 2026-10-23
format: native
syntax: 1
lang: en
subject: "Python"
summary: "What the free-threaded build of CPython is, how it stays safe without the global interpreter lock, and what trying it changes for your threads, asyncio, processes and dependencies."
tags:
  - python
  - free-threading
  - concurrency
  - gil
source:
  project: python
  repo: work
---

You write web services and data scripts, you use threads, asyncio and multiprocessing, and you know the GIL as "one thread runs Python at a time". CPython now ships a build without that rule. This chapter explains what the build is and how it stays safe. It then helps you decide whether to try it, shows how to install it and check it, and lists what changes for your own code and for the packages you depend on.

## Background {#background}

> [!SKIP] Skip this if you already know what the GIL does
> CPython's **global interpreter lock** (GIL) stops more than one thread from running Python code at the same time. PEP 703 calls this an obstacle to using multi-core CPUs efficiently ([PEP 703](#s-r1-foundations-01)). Your threads still help when they wait. The GIL is always released while a thread does I/O, and some extension modules release it during heavy work such as compression or hashing ([Glossary](#s-r2-evidence-03)). That is why the threading docs still call threads a good fit for running several I/O-bound tasks at once, and point CPU-bound work at `multiprocessing` or `ProcessPoolExecutor` ([threading docs](#s-r2-evidence-04)).

**The free-threaded build is a second way to compile CPython, with the GIL removed and the interpreter made thread-safe in other ways.** PEP 703, written by Sam Gross and created in January 2023, proposed it as a configure flag, `--disable-gil`. The GIL build stays the default for CPython builds and for the python.org downloads. A build made this way defines the `Py_GIL_DISABLED` macro, and its ABI tag gains a `t`, for "threading" ([PEP 703](#s-r1-foundations-01)). The ABI (application binary interface) is the binary contract that compiled C extensions are built against, so its tag tells installers which builds an extension fits. That `t` shows up everywhere, in executable names like `python3.14t` and in wheel tags like `cp313t`.

**The rollout is deliberately slow, in phases.** In July 2023 the Steering Council said it intended to accept PEP 703 in three stages. First comes an experimental build. Next comes a supported build that is not the default, once community support makes production use viable. Last, no-GIL becomes the default ([SC notice](#s-r1-foundations-03)).

Python 3.13 shipped the build as experimental, which was phase I ([What's New 3.13](#s-r1-foundations-05)). In Python 3.14 it is officially supported and no longer experimental. That is phase II: supported, but still optional ([What's New 3.14](#s-r1-foundations-06)). Python 3.15 came out on 9 October 2026. Its official macOS binaries install free-threading support by default ([What's New 3.15](#s-r1-practice-05)). The build is still optional there: the move to phase III, making it the default, has not been decided (more below).

```diagram #phases
kind: flow
title: The phases of free-threaded CPython
direction: right
nodes:
  - {id: sc, label: "July 2023", sub: SC intends to accept PEP 703, shape: pill, tone: muted}
  - {id: p1, label: "3.13: phase I", sub: experimental, tone: warn}
  - {id: p2, label: "3.14: phase II", sub: "supported, still optional", tone: ok}
  - {id: v315, label: "3.15 (9 Oct 2026)", sub: "still optional; macOS installers include it by default", tone: ok}
  - {id: p3, label: "Phase III", sub: "default build, undecided", tone: muted}
edges:
  - {from: sc, to: p1}
  - {from: p1, to: p2, label: PEP 779 accepted}
  - {from: p2, to: v315, label: next release}
  - {from: p2, to: p3, label: a future PEP, style: dashed}
```

The last step is open. When the Steering Council accepted PEP 779 in June 2025, the move to phase III, with free threading as the default or only build, was still undecided ([SC acceptance](#s-r1-foundations-07)). PEP 779 leaves that decision to a future PEP ([PEP 779](#s-r1-foundations-02)).

> [!NOTE]- History: earlier attempts, and "not Python 4"
> This was not the first attempt. PEP 703 lists Greg Stein's 1996 patch against Python 1.4 and Larry Hastings's Gilectomy, and points to two reference repositories, `nogil-3.12` and `nogil` ([PEP 703](#s-r1-foundations-01)). In its 2023 notice the Steering Council said it did not want a permanent split between builds or "another Python 3 situation". It also reserved the right to roll the work back before the default changes, if the work proved too disruptive for too little gain ([SC notice](#s-r1-foundations-03)).

## Intuition {#intuition}

**With the GIL, two CPU-bound threads take turns; without it, they run at the same time on two cores.** Picture two threads, each summing its own half of a big list. On the default build only one of them holds the GIL at any moment, so in this picture the work is interleaved and takes as long as one thread doing everything. On the free-threaded build both threads are *attached* to the interpreter at once. Where a thread used to take and release the GIL, it now moves between ATTACHED and DETACHED states, and many threads can be attached together ([PEP 703](#s-r1-foundations-01)).

```diagram #toy-timeline
kind: timeline
title: "Two threads summing a list: an analogy, not a measurement"
caption: An *analogy*. With the GIL the threads alternate; without it they overlap.
axis: {unit: time, from: 0, to: 8}
lanes:
  - label: "GIL build: thread A"
    bars:
      - {from: 0, to: 2, label: runs, tone: series-1}
      - {from: 4, to: 6, label: runs, tone: series-1}
  - label: "GIL build: thread B"
    bars:
      - {from: 2, to: 4, label: runs, tone: series-2}
      - {from: 6, to: 8, label: runs, tone: series-2}
  - label: "Free-threaded: thread A"
    bars:
      - {from: 0, to: 4, label: runs, tone: series-1}
  - label: "Free-threaded: thread B"
    bars:
      - {from: 0, to: 4, label: runs, tone: series-2}
```

One real measurement shows the shape, and also what the shape costs. At PyCon US 2024, Anthony Shaw computed pi to 2,000 digits on a four-core machine with Python 3.13 beta 1, as reported by LWN. The threaded version took 2.41 s with the GIL and 0.75 s without it. Multiprocessing took 1.2 s with the GIL and 1.57 s without it. Of the runs shown here, threads without the GIL were the fastest. Shaw said multiprocessing has the largest start-up time of the four options he compared (threads, coroutines, multiprocessing and subinterpreters). LWN likened his demo of handing work to other cores to the data serialization, such as pickling, needed to send a task to several cores ([LWN, 2024](#s-r1-evidence-08)).

```diagram #shaw-bench
kind: chart
title: "Pi to 2,000 digits on four cores, Python 3.13 beta 1 (Shaw, PyCon US 2024, via LWN)"
caption: A 2024 micro-benchmark on a beta. It shows the shape, not today's numbers.
type: bar
x: {label: Approach, categories: [Threads, Multiprocessing]}
y: {label: Seconds (lower is better), min: 0}
series:
  - {name: With the GIL, values: [2.41, 1.2], tone: series-1}
  - {name: Without the GIL, values: [0.75, 1.57], tone: series-2}
```

**The gain is not automatic.** The HOWTO says that not all software benefits from free threading on its own, but that programs designed with threading in mind run faster on multi-core hardware ([HOWTO 3.15](#s-r2-evidence-01)). Correctness is not automatic either. According to PEP 703, the per-object locks that replace the GIL give weaker protection than the GIL did, with mutual exclusion limited to single objects ([PEP 703](#s-r1-foundations-01)). The next section shows what those locks are.

## How it works {#how-it-works}

**CPython replaces one big lock with several smaller mechanisms, each one guarding something the GIL used to protect.** The first is reference counting, the count every object keeps of the references to it. PEP 703 proposes three techniques to make it thread-safe: biased reference counting, immortalization and a limited form of deferred reference counting ([PEP 703](#s-r1-foundations-01)).

```diagram #safety-stack
kind: stack
title: What replaces the GIL in the free-threaded build
layers:
  - label: Reference counts
    items: [biased reference counting, immortal objects, deferred reference counting]
    tone: series-1
  - label: Containers (list, dict, set)
    items: [a per-object lock, critical sections, lock-free reads]
    tone: series-2
  - label: Memory
    items: [mimalloc allocator, QSBR delayed freeing]
    tone: store
```

- **Biased reference counting.** Most objects are only ever touched by one thread. So each object gets an owning thread, which updates a "local" count with cheap non-atomic instructions, while other threads update a separate "shared" count with atomic ones ([PEP 703](#s-r1-foundations-01)).
- **Immortal objects** are never freed and their counts never change, which avoids contention when many threads use the same objects ([HOWTO](#s-r1-foundations-04)). As of 3.14 this covers code constants and strings interned by `sys.intern()` ([HOWTO](#s-r1-foundations-04)).
- **Deferred reference counting** skips count updates for references on Python function stacks, for selected objects that many threads touch. Such objects can then only be freed by the cyclic garbage collector ([HOWTO](#s-r1-foundations-04)).
- **mimalloc** replaces CPython's own allocator, pymalloc, which is not thread-safe without the GIL ([PEP 703](#s-r1-foundations-01); [HOWTO](#s-r1-foundations-04)).
- **Per-object locks.** Every list, dict and set gets a lightweight lock that all modifying operations must hold ([PEP 703](#s-r1-foundations-01)). Nested locks could deadlock where the GIL could not. So PEP 703 adds "critical sections", which suspend a thread's object locks whenever it would block, at the same points where it used to release the GIL ([PEP 703](#s-r1-foundations-01)).
- **Lock-free reads.** Some dict and list reads, item access and iteration, take an optimistic path without the lock. They fall back to the lock only when another thread is modifying the container ([PEP 703](#s-r1-foundations-01)). To make such lock-free structures safe, the build defers freeing the memory behind structures such as list objects instead of freeing it at once. The scheme is called quiescent state-based reclamation (QSBR) ([HOWTO](#s-r1-foundations-04)).

The 3.14 release notes say the PEP 703 implementation was finished in 3.14, and that the specializing adaptive interpreter (PEP 659) now runs in free-threaded mode ([What's New 3.14](#s-r1-foundations-06)). This matters for speed, as the next section shows. For you, the result is that built-in types aim to behave as they did under the GIL. `dict`, `list` and `set` use internal locks against concurrent modification. The docs still recommend `threading.Lock` or other primitives over relying on those internal locks ([HOWTO](#s-r1-foundations-04)).

> [!NOTE]- Why the build uses more memory
> The docs give several reasons why the free-threaded build typically uses more memory: immortal interned strings, a larger header for non-GC objects (`None` takes 32 bytes instead of 16 on AMD64), freeing delayed by QSBR, and mimalloc in place of pymalloc ([HOWTO](#s-r1-foundations-04)). `gc.collect()` frees memory held by QSBR ([HOWTO](#s-r1-foundations-04)).

## Should you try it today? {#should-you}

**It is supported and it will stay, but it is still optional and young.** The Steering Council said in June 2025 that free threading is a supported build option and will not be removed without a proper deprecation schedule ([SC acceptance](#s-r1-foundations-07)). Python 3.15's highlights add a stable ABI for free-threaded builds, which the dependencies section explains ([What's New 3.15](#s-r1-practice-05)). One label lags behind. The community guide still shows the macOS installer option as "Free-threaded Python [experimental]" ([install guide](#s-r1-practice-04)), while the 3.14 release notes call the build no longer experimental ([What's New 3.14](#s-r1-foundations-06)). The release notes are the project's own statement.

**The single-thread cost is now in the single digits to about 10%, down from about 40% in 3.13.** The figures below come from pyperformance, the benchmark suite the project measures itself with. They differ from page to page, and the HOWTO gives no measurement date, so read each one with its source:

| Source | Version | Single-thread overhead |
|---|---|---|
| 3.13 HOWTO | 3.13 | about 40% on pyperformance |
| PEP 779 (March 2025) | as of its writing | around 10%, about 3% on macOS |
| What's New in 3.14 | 3.14 | roughly 5–10%, by platform and compiler |
| 3.14 and 3.15 HOWTO (no measurement date) | current | about 1% on macOS aarch64 to 8% on x86-64 Linux |
| Thomas Wouters, PyCon US 2026 (via LWN) | 3.14 | 0–10%, usually about 5% on Linux with GCC |

The largest single cause of the 3.13 overhead was that the specializing adaptive interpreter was turned off in the free-threaded build ([HOWTO 3.13](#s-r1-evidence-02)). Thomas Wouters, a Steering Council member, remembers 3.13 as a 20–40% slowdown ([LWN, 2026](#s-r1-criticism-09)). The later rows come from [PEP 779](#s-r1-foundations-02), [What's New 3.14](#s-r1-foundations-06), the [3.14 HOWTO](#s-r1-evidence-01) and the [3.15 HOWTO](#s-r2-evidence-01).

Memory goes up too. PEP 779 reported about 15–20% more memory than the GIL build ([PEP 779](#s-r1-foundations-02)). The Steering Council then set limits for phase II. Slowdown should stay within 10%, with up to 15% to be discussed in advance, and memory growth below 15%, with a hard limit of 20% ([SC acceptance](#s-r1-foundations-07)).

**Threads gain only where several of them have CPU work that the GIL was serializing.** Threads waiting on I/O already overlap under the GIL, and so do calls into extensions that release it ([Glossary](#s-r2-evidence-03)). No independent, dated multi-thread benchmark for the current release was found, so measure your own workload.

One project has published its own numbers for 3.14, ECMWF's Tensogram, an extension that already releases the GIL during its Rust work. Decoding 1M float32 values with 8 threads on 20 cores reached 1,841 op/s on CPython 3.14t, against 293 op/s on 3.14 with the GIL. Its small-message test shows the trade. One thread was slower on 3.14t (12,951 against 20,174 op/s), but at 16 threads 3.14t reached 168,786 op/s against 23,369 ([Tensogram docs](#s-r1-cases-05)).

**For a web service, the evidence is thin.** At FOSDEM 2026 Ruben Hias benchmarked an API with 80% I/O and 20% CPU work, at 1 to 32 threads or workers. He compared Gunicorn and Granian threads, ASGI servers, Gevent, Python 3.14t threads and a multi-process baseline ([FOSDEM slides](#s-r1-cases-02)).

On the GIL build, Gunicorn's gthread workers and Granian rose roughly linearly and then flattened, Granian a little later, and an ASGI framework capped at about the same point. Hias blames the GIL. He says free-threaded Gunicorn broke through a ceiling of about 400 requests per second and came "very close" to the multi-process line, and that free-threaded Granian matched it ([talk transcript](#s-r2-criticism-02)). That is one speaker's benchmark, and no independent replication was found. Granian's own README calls its free-threaded support experimental and "highly discouraged in production" ([Granian README](#s-r1-cases-01)).

> [!NOTE]- What is still open
> Three things could not be settled from the sources. LWN reported in June 2026 that Wouters expected many scalability improvements in 3.15, with no figures ([LWN, 2026](#s-r1-criticism-09)). The 3.15 release notes still call the JIT compiler experimental, and its section says nothing either way about the free-threaded build ([What's New 3.15](#s-r1-practice-05)). The phase III timeline is open too: in 2023 the Steering Council estimated that reaching a no-GIL default may take as much as five years ([SC notice](#s-r1-foundations-03)), and Wouters suspects that Linux distributions and large companies may switch the default before the Python project does ([LWN, 2026](#s-r1-criticism-09)).

**The decision, in one table:**

| Try it now if… | Wait if… |
|---|---|
| Your hot path is CPU-bound Python that you can split across threads | Your service mostly waits on the network or a database: the GIL is already released during I/O |
| You use multiprocessing only to get around the GIL, and pickling or memory per process hurts | You need a dependency that has no free-threaded wheel yet (see [the dependency check](#dependencies)) |
| You can run your test suite on the new build and measure it yourself | You need a production-ready ASGI/WSGI server story today: the server evidence is one talk, and Granian discourages production use |
| | Your CPU time is already inside extension calls that release the GIL: those calls already overlap |

## Trying it {#trying-it}

**Install a second interpreter next to your normal one; its name ends in `t`.** The community guide lists several routes ([install guide](#s-r1-practice-04)):

```bash title="Getting a free-threaded interpreter (Python Free-Threading Guide)"
uv venv --python 3.14t                                   # uv
mamba create -n nogil -c conda-forge python-freethreading   # conda-forge
brew install python-freethreading                         # Homebrew
```

The other routes have their own rules:

- **python.org installers.** Since 3.13 the macOS and Windows installers can install the free-threaded binaries as an option ([HOWTO](#s-r1-foundations-04)). The guide says to customize the install: on Windows, tick "Download free-threaded binaries" under Advanced Options; on macOS, pick the free-threaded option on the Customize screen ([install guide](#s-r1-practice-04)). On 3.15 the macOS binaries install it by default ([What's New 3.15](#s-r1-practice-05)).
- **uv.** It finds and installs the free-threaded 3.13+ variants. For 3.14 and later it may pick one on its own but still prefers the GIL build, so ask for `3.14t` by name ([uv docs](#s-r1-practice-08)).
- **The name.** The executable always has the version plus `t`, like `python3.14t`, while what `python` points to depends on how you installed it ([running with the GIL disabled](#s-r1-practice-07)).

**Then check two things: the build, and whether the GIL is really off right now.**

```bash title="Is this the free-threaded build, and is the GIL off?"
python3.14t -VV                    # contains "free-threading build"
python3.14t -c "import sysconfig; print(sysconfig.get_config_var('Py_GIL_DISABLED'))"   # 1 on the free-threaded build
python3.14t -c "import sys; print(sys._is_gil_enabled())"                               # False when the GIL is off
```

`python -VV` and `sys.version` name the build. `sysconfig.get_config_var("Py_GIL_DISABLED")` is the recommended check for whether the build supports free threading. `sys._is_gil_enabled()` reports whether the GIL is actually off in the running process ([HOWTO](#s-r1-foundations-04)).

The last check matters most, because a free-threaded build can run with the GIL switched on. `PYTHON_GIL=1` or `-X gil=1` forces it on, `PYTHON_GIL=0` or `-X gil=0` forces it off, and `-X gil` wins over the variable ([command-line docs](#s-r3-practice-05)). As the next sections show, an import can also turn the GIL back on, so run the check after your imports.

> [!WARNING] Two docs pages disagree about the default
> The glossary says that after building with `--disable-gil`, "code must be run with -X gil=0 or after setting the PYTHON_GIL=0 environment variable" ([Glossary](#s-r2-evidence-03)). The free-threading HOWTO instead describes a build "where the global interpreter lock (GIL) is disabled", which supports optionally turning the GIL on at runtime ([HOWTO](#s-r1-foundations-04)). Don't rely on either page: `sys._is_gil_enabled()` tells you what your process is doing.

## What changes for your code {#your-code}

### Threads {#threads}

```python title="A race the GIL often hid"
import threading

counter = 0
lock = threading.Lock()

def unsafe():
    global counter
    for _ in range(100_000):
        counter += 1          # read, add, write: never atomic

def safe():
    global counter
    for _ in range(100_000):
        with lock:
            counter += 1
```

**The interpreter guards its own memory, not your program's logic.** It protects against low-level memory unsafety from data races, but not against race conditions in your own code ([porting guide](#s-r1-criticism-02)). `counter += 1` was never safe. Even the FAQ for the GIL build lists `i = i+1` and `D[x] = D[x] + 1` as not atomic, and says "When in doubt, use a mutex!" ([Library FAQ](#s-r1-criticism-10)). Here, an *atomic* operation is one that no other thread can see half done.

Many operations only *looked* thread-safe under the GIL, because of when CPython happened to switch threads ([porting guide](#s-r1-criticism-02)). Wouters puts the consequence plainly: there is no longer a GIL "accidentally protecting you some of the time" ([LWN, 2026](#s-r1-criticism-09)).

**The docs now spell out what is guaranteed.** On the free-threaded build:

- `lst[i]` and `lst.append(x)` are atomic, and writing `lst[i] = x` from several threads will not corrupt the list.
- `d[key]`, `d.get(key)`, `key in d` and `len(d)` are atomic, and setting or removing single items from several threads will not corrupt the dict.
- Anything with more than one step is never atomic and needs your own lock: a read-modify-write, a check-then-act such as `if key in d: del d[key]`, or iteration.
- For dicts, prefer single calls such as `d.pop(key, None)`, and iterate over a copy, `d.copy().items()` ([Thread Safety Guarantees](#s-r1-criticism-04)).

Sharing one iterator between threads is not thread-safe either: threads may see duplicate or missing items ([HOWTO](#s-r1-foundations-04)).

**Look first at module-level and class-level caches.** The porting guide names global mutable state, such as a cache filled from several threads, as the most common source of thread-safety bugs in packages. With a check-then-fill cache, two threads can both miss and both compute the value. A related change: a new `threading.Thread` starts with a copy of the creating thread's `contextvars` context on the free-threaded build, but with each variable's default on the GIL build ([porting guide](#s-r1-criticism-02)). And reading `frame.f_locals` of a frame running in another thread may crash the interpreter ([HOWTO](#s-r1-foundations-04)).

> [!NOTE]- "Pure Python developers shouldn't need to care": a minority view
> Answering a question at FOSDEM 2026, Ruben Hias said the race-condition concern is mainly for C-extension authors and that people writing pure Python "shouldn't need to care about this" ([talk transcript](#s-r2-criticism-02)). The CPython docs and the porting guide say the opposite, as above: multi-step operations are never atomic, and the interpreter does not protect you from race conditions.

### asyncio {#asyncio}

**One event loop still runs one Task at a time, free-threaded or not.** A loop runs all its callbacks and Tasks in its own thread, one at a time, so on one loop the Python code that handles each connection still runs serially. To use more cores, run one loop per thread, each started with `asyncio.run()`. On a free-threaded build, requests handled by different loops then run in parallel ([asyncio and free-threaded Python](#s-r2-practice-06)). The 3.14 release notes describe parallel event loops in different threads "scaling linearly with the number of threads"; that is the project's description, not a published measurement ([What's New 3.14](#s-r1-foundations-06)).

```diagram #loop-per-thread
kind: flow
title: One event loop per thread on the free-threaded build
direction: right
nodes:
  - {id: t1, label: Thread 1, sub: "asyncio.run(serve())", shape: pill}
  - {id: t2, label: Thread 2, sub: "asyncio.run(serve())", shape: pill}
  - {id: l1, label: Event loop 1, sub: one Task at a time}
  - {id: l2, label: Event loop 2, sub: one Task at a time}
  - {id: c, label: CPU cores, shape: store, tone: store}
edges:
  - {from: t1, to: l1}
  - {from: t2, to: l2}
  - {from: l1, to: c, label: runs in parallel}
  - {from: l2, to: c, label: runs in parallel}
```

```python title="One loop per thread (the pattern the asyncio docs show)"
import asyncio, threading

async def serve():
    ...   # this thread's own server or worker

def worker():
    asyncio.run(serve())      # each thread creates and runs its own loop

threads = [threading.Thread(target=worker) for _ in range(4)]
for t in threads: t.start()
for t in threads: t.join()
```

**CPU work you push off the loop can now run in parallel too.** Under the GIL, `asyncio.to_thread()` can typically only make I/O-bound functions non-blocking. Without a GIL it also works for CPU-bound functions ([Coroutines and Tasks](#s-r2-practice-03)).

**The asyncio implementation is safe across threads, but your asyncio objects are not.** The old rules still hold:

- Give each thread its own loop, and don't await or touch one thread's Tasks and futures from another.
- Hand work across threads with `asyncio.run_coroutine_threadsafe()` or `loop.call_soon_threadsafe()`.
- `asyncio.Lock`, `asyncio.Event` and `asyncio.Queue` are not for use across threads: use `threading` primitives and `queue.Queue` there ([asyncio and free-threaded Python](#s-r2-practice-06)).

### Processes {#processes}

**Processes pay for getting around the GIL with pickling and memory.** `ProcessPoolExecutor` uses multiprocessing to side-step the GIL, so only picklable objects can be sent and returned ([concurrent.futures](#s-r1-cases-06)).

In Wouters's view, free threading can now beat them. He lists the costs of processes: more overhead, no shared address space, and usually more memory and copying. Where the alternatives (rewriting in C or Rust, multiple processes, subinterpreters, asyncio) don't give the performance needed, he says threads without the GIL can offer higher throughput, lower memory use and lower latency ([LWN, 2026](#s-r1-criticism-09)).

> [!NOTE]- Two cautions before you swap processes for threads
> Wouters also warns that threads sharing the *same* objects are "still problematic for performance", a problem Python cannot solve directly ([LWN, 2026](#s-r1-criticism-09)). And subinterpreters (`concurrent.interpreters`) are a middle way. They do not share a GIL, so threads plus interpreters give full multi-core parallelism, and have since 3.12 ([concurrent.interpreters](#s-r1-cases-03)). The trade-off is extra effort, because mutable data cannot be shared between them ([concurrent.futures](#s-r1-cases-06)).

**Checklist: before you run your code without the GIL**

- Find every multi-step operation on shared state, such as `x += 1`, check-then-act and iteration while others write, and put a `threading.Lock` around it ([Thread Safety Guarantees](#s-r1-criticism-04)).
- Audit module-level and class-level caches and singletons first ([porting guide](#s-r1-criticism-02)).
- Use locks you own, not the internal locks of `list` or `dict` ([HOWTO](#s-r1-foundations-04)).
- In asyncio code: one loop per thread, no sharing Tasks, futures or `asyncio` primitives across threads ([asyncio and free-threaded Python](#s-r2-practice-06)).
- Run your existing test suite on the free-threaded build, and fix the failures that only appear with the GIL off ([testing guide](#s-r1-criticism-03)).

## What changes for your dependencies {#dependencies}

**Pure-Python wheels install and run as they are; packages with C extensions need a wheel built for the free-threaded build.** Whether a pure-Python package's code is thread-safe is a separate question, the one in [Threads](#threads). The free-threaded build is not ABI compatible with the default build, so C extensions must be rebuilt for it ([PEP 703](#s-r1-foundations-01)). Their wheels and shared libraries carry the `t` suffix ([C API HOWTO](#s-r1-practice-03)).

Pure-Python wheels can already be used ([Free-Threaded Wheels](#s-r1-evidence-05)). Of the 360 most-downloaded PyPI packages with extensions, 219 had free-threaded wheels on 22 October 2026. NumPy, SciPy, pandas, lxml and pydantic-core did. orjson, psycopg-binary and grpcio did not yet ([tracker data](#s-r1-evidence-07)). The guide's tracking table also lists the first supporting version of many packages, such as NumPy 2.1.0 and pandas 2.2.3, and notes that some versions may be projected ([tracking table](#s-r1-evidence-06)).

```diagram #install-flow
kind: flow
title: What happens to a dependency on a free-threaded interpreter
direction: down
nodes:
  - {id: pip, label: pip or uv install, shape: pill}
  - {id: wheel, label: "A wheel for this interpreter?"}
  - {id: ok, label: Wheel installed, tone: ok}
  - {id: sdist, label: Build from the source distribution, sub: needs a compiler, tone: warn}
  - {id: imp, label: import the module}
  - {id: marked, label: "Module declares it can run without the GIL?"}
  - {id: off, label: GIL stays off, tone: ok}
  - {id: on, label: GIL enabled + RuntimeWarning naming the module, tone: bad}
edges:
  - {from: pip, to: wheel}
  - {from: wheel, to: ok, label: "yes"}
  - {from: wheel, to: sdist, label: "no", style: dashed}
  - {from: ok, to: imp}
  - {from: sdist, to: imp}
  - {from: imp, to: marked}
  - {from: marked, to: off, label: "yes"}
  - {from: marked, to: on, label: "no"}
```

**A missing wheel turns into a build from source.** pip prefers wheels, and when none fits it falls back to source archives ([pip user guide](#s-r3-practice-12)). uv likewise tries to build the source distribution ([uv build failures](#s-r3-practice-11)). That build needs a compiler. The guide's FAQ gives an example from 3.13: `pip install jupyter` could fail without a compilation environment, because some dependencies, such as PyYAML, had to be compiled from source ([FAQ](#s-r3-practice-08)). Pass `--only-binary :all:` if you would rather have pip refuse than build ([pip install](#s-r3-practice-09)).

**An extension that has not declared support switches the GIL back on, and tells you.** An extension declares support with a `Py_mod_gil` slot set to `Py_MOD_GIL_NOT_USED` ([C API HOWTO](#s-r1-practice-03)). Import one that has not, and the build enables the GIL and prints a warning ([HOWTO](#s-r1-foundations-04)). In CPython's source the warning names the module ([import.c](#s-r3-practice-07)):

```text title="The warning as printed (assembled from Python/import.c, 3.15 branch; the module name shown as name)"
RuntimeWarning: The global interpreter lock (GIL) has been enabled to load module '<name>', which has not declared that it can run safely without the GIL. To override this behavior and keep the GIL disabled (at your own risk), run with PYTHON_GIL=0 or -Xgil=0.
```

Read "at your own risk" literally. Wouters calls forcing the GIL off in that case "playing with fire", probably only for testing ([LWN, 2026](#s-r1-criticism-09)). The guide presents it for when you do not control the extension or want to test anyway ([FAQ](#s-r3-practice-08)). The guide's workarounds are to move to a newer release (PyYAML 6.0.3+ on 3.14t, CFFI 2.1.1+ on free-threaded 3.15) or use a pure-Python build of a mypyc-compiled package ([dependencies guide](#s-r3-practice-06)). You can also switch to a fork that supports free threading ([porting guide](#s-r1-criticism-02)).

> [!NOTE]- The stable ABI: abi3 and abi3t
> Some packages ship a single stable-ABI (`abi3`) wheel. The free-threaded build is not compatible with that stable ABI ([PEP 703](#s-r1-foundations-01)), so without `abi3t` such packages must also build separate free-threaded wheels ([C API HOWTO](#s-r1-practice-03)). Python 3.15 adds a second stable ABI, `abi3t`, for free-threaded builds, next to `abi3` for the default build ([Stable ABI docs](#s-r3-practice-01)). An extension can be compiled for both at once ([Stable ABI docs](#s-r3-practice-01)). PEP 803, which defines it, specifies that free-threaded 3.15 does not load extensions tagged `abi3` ([PEP 803](#s-r2-practice-01)). It also says an `abi3t` extension will load on free-threaded Python but is not necessarily thread-safe ([PEP 803](#s-r2-practice-01)).

**Steps, when a dependency is in doubt:**

1. Look it up in the [free-threaded wheels tracker](#s-r1-evidence-05) or the guide's [tracking table](#s-r1-evidence-06).
2. Install with `--only-binary :all:` to see at once which packages have no wheel ([pip install](#s-r3-practice-09)).
3. Import your whole app, then check `sys._is_gil_enabled()`, and watch for the `RuntimeWarning` that names the module ([HOWTO](#s-r1-foundations-04)).
4. Upgrade, swap or wait on the module it names. Use `PYTHON_GIL=0` only to test ([running with the GIL disabled](#s-r1-practice-07)).

## Best practices & next steps {#next-steps}

**Where the guidance agrees.** Treat thread safety as your job, not the interpreter's: the CPython docs and the community porting guide both ask for explicit locks around multi-step operations ([Thread Safety Guarantees](#s-r1-criticism-04) — docs.python.org; [porting guide](#s-r1-criticism-02) — py-free-threading.github.io). Test before you trust. The testing guide's first step is to run your existing test suite on the free-threaded build ([testing guide](#s-r1-criticism-03) — py-free-threading.github.io).

**Where you may reasonably differ.** If your service mostly waits on I/O, its threads already overlap on the default build, because the GIL is released during I/O ([Glossary](#s-r2-evidence-03) — docs.python.org). The only web-server measurement found is one talk ([talk transcript](#s-r2-criticism-02) — FOSDEM). Staying on the default build for now is a choice the evidence allows.

**Next steps:**

1. Make a `python3.14t` environment with `uv venv --python 3.14t`, and run the three checks from [Trying it](#trying-it) ([install guide](#s-r1-practice-04) — py-free-threading.github.io).
2. Run your tests in many threads with `pytest-run-parallel` (`--parallel-threads`, `--iterations`). The guide says such tools find bugs from global state, but not from multithreaded use of a library's own data structures ([testing guide](#s-r1-criticism-03); [pytest-run-parallel](#s-r1-criticism-07) — GitHub).
3. Repeat flaky tests with the GIL forced off, for example `PYTHON_GIL=0 pytest --count=100` with pytest-repeat, since a concurrency bug may pass most runs ([debugging guide](#s-r1-criticism-06) — py-free-threading.github.io).
4. Benchmark your own hot path on both builds before you move anything to production. The overhead depends on workload and hardware ([HOWTO 3.15](#s-r2-evidence-01) — docs.python.org), and no independent, dated multi-thread benchmark for the current release was found.

## Quiz {#quiz-section}

```quiz #quiz
title: Check yourself
items:
  - id: q-loop
    type: choice
    prompt: "An asyncio service runs **one** event loop on `python3.14t` with the GIL off. One coroutine runs a long CPU-bound loop. What happens to the other requests on that loop?"
    options:
      - {id: a, text: They run in parallel on the other cores automatically}
      - {id: b, text: "They wait, because one event loop runs one Task at a time in its own thread"}
      - {id: c, text: The interpreter re-enables the GIL to protect the loop}
    answer: [b]
    explain: "Free threading does not change how one event loop works: it runs its Tasks one at a time in its thread. To use more cores, run one loop per thread, or push the CPU work out with `asyncio.to_thread()`."
  - id: q-atomic
    type: choice
    prompt: "On the free-threaded build, which of these are documented as safe on a shared object without your own lock? Select all that apply."
    options:
      - {id: a, text: "`lst.append(x)` from several threads"}
      - {id: b, text: "`d[key] = value` from several threads (the dict is not corrupted)"}
      - {id: c, text: "`lst[i] = lst[i] + 1` from several threads"}
      - {id: d, text: "`if key in d: del d[key]` from several threads"}
    answer: [a, b]
    explain: "Single operations such as `append` and setting one dict item are atomic or will not corrupt the object. A read-modify-write (c) and a check-then-act (d) take several steps and are never atomic, so they need a lock."
  - id: q-import
    type: recall
    prompt: "On a free-threaded interpreter you import a C extension that has not declared free-threading support. What happens, and how do you notice?"
    answer: "The interpreter enables the GIL to load it and prints a RuntimeWarning that names the module. `sys._is_gil_enabled()` then returns True, so check it after your imports."
  - id: q-io
    type: choice
    prompt: "A Flask service with 16 threads spends 90% of each request waiting on its database. You move it to the free-threaded build. What should you expect?"
    options:
      - {id: a, text: "About 16 times the throughput, since 16 threads can now run at once"}
      - {id: b, text: "A modest change at most: the waiting already overlapped under the GIL, which is released during I/O"}
      - {id: c, text: "No change at all, because Flask is a pure-Python package"}
    answer: [b]
    explain: "Under the GIL, threads that wait on I/O already run side by side, because the GIL is released during I/O. Only the slice of CPU work in Python code was serialized, so that slice is all that free threading can speed up."
  - id: q-abi
    type: choice
    prompt: "You maintain a C extension and want **one** stable-ABI build that free-threaded Python 3.15 can use. Which stable ABI do you target?"
    options:
      - {id: a, text: "`abi3`, the stable ABI that has existed since Python 3.2"}
      - {id: b, text: "`abi3t`, the stable ABI added in Python 3.15"}
      - {id: c, text: "Either one: free-threaded builds load both"}
    answer: [b]
    explain: "`abi3` is compatible with the default (non-free-threaded) builds, and `abi3t` with free-threaded builds. You can compile for both at once, so one wheel serves both kinds of build."
  - id: q-check
    type: choice
    prompt: "Which check tells you whether the GIL is **actually off in the running process**?"
    options:
      - {id: a, text: "`sysconfig.get_config_var('Py_GIL_DISABLED')`"}
      - {id: b, text: "`sys._is_gil_enabled()`"}
      - {id: c, text: "The `t` in the executable's name"}
    answer: [b]
    explain: "The config variable and the name tell you about the **build**. A free-threaded build can still run with the GIL on, because of `PYTHON_GIL=1`, `-X gil=1` or an unmarked extension. Only `sys._is_gil_enabled()` reports the running process."
```

## Sources {#sources-heading}

```sources #sources
items:
  - id: s-r1-foundations-01
    title: "PEP 703 – Making the Global Interpreter Lock Optional in CPython"
    url: https://peps.python.org/pep-0703/
    publisher: Python Software Foundation
    accessed: "2026-10-23"
  - id: s-r1-foundations-02
    title: "PEP 779 – Criteria for supported status for free-threaded Python"
    url: https://peps.python.org/pep-0779/
    publisher: Python Software Foundation
    accessed: "2026-10-23"
  - id: s-r1-foundations-03
    title: A Steering Council notice about PEP 703
    url: https://discuss.python.org/t/a-steering-council-notice-about-pep-703-making-the-global-interpreter-lock-optional-in-cpython/30474
    publisher: Discussions on Python.org
    accessed: "2026-10-23"
  - id: s-r1-foundations-07
    title: "PEP 779 acceptance by the Steering Council (post #123)"
    url: https://discuss.python.org/t/pep-779-criteria-for-supported-status-for-free-threaded-python/84319/123
    publisher: Discussions on Python.org
    accessed: "2026-10-23"
  - id: s-r1-foundations-04
    title: Python support for free threading (HOWTO)
    url: https://docs.python.org/3/howto/free-threading-python.html
    publisher: Python Software Foundation
    accessed: "2026-10-23"
  - id: s-r1-evidence-01
    title: Python support for free threading (3.14 HOWTO)
    url: https://docs.python.org/3.14/howto/free-threading-python.html
    publisher: Python Software Foundation
    accessed: "2026-10-23"
  - id: s-r2-evidence-01
    title: Python support for free threading (3.15 HOWTO)
    url: https://docs.python.org/3.15/howto/free-threading-python.html
    publisher: Python Software Foundation
    accessed: "2026-10-23"
  - id: s-r1-evidence-02
    title: Python experimental support for free threading (3.13 HOWTO)
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
  - id: s-r1-practice-03
    title: C API Extension Support for Free Threading
    url: https://docs.python.org/3/howto/free-threading-extensions.html
    publisher: Python Software Foundation
    accessed: "2026-10-23"
  - id: s-r3-practice-01
    title: C API and ABI Stability (Stable Application Binary Interfaces)
    url: https://docs.python.org/3.15/c-api/stable.html
    publisher: Python Software Foundation
    accessed: "2026-10-23"
  - id: s-r2-practice-01
    title: "PEP 803 – \"abi3t\": Stable ABI for Free-Threaded Builds"
    url: https://peps.python.org/pep-0803/
    publisher: Python Software Foundation
    accessed: "2026-10-23"
  - id: s-r3-practice-05
    title: Command line and environment
    url: https://docs.python.org/3/using/cmdline.html
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
    accessed: "2026-10-23"
  - id: s-r1-criticism-10
    title: Library and Extension FAQ
    url: https://docs.python.org/3/faq/library.html
    publisher: Python Software Foundation
    accessed: "2026-10-23"
  - id: s-r2-practice-06
    title: asyncio and free-threaded Python
    url: https://docs.python.org/3/library/asyncio-threading.html
    publisher: Python Software Foundation
    accessed: "2026-10-23"
  - id: s-r2-practice-03
    title: Coroutines and Tasks
    url: https://docs.python.org/3/library/asyncio-task.html
    publisher: Python Software Foundation
    accessed: "2026-10-23"
  - id: s-r1-cases-06
    title: concurrent.futures — Launching parallel tasks
    url: https://docs.python.org/3/library/concurrent.futures.html
    publisher: Python Software Foundation
    accessed: "2026-10-23"
  - id: s-r1-cases-03
    title: concurrent.interpreters — Multiple interpreters in the same process
    url: https://docs.python.org/3/library/concurrent.interpreters.html
    publisher: Python Software Foundation
    accessed: "2026-10-23"
  - id: s-r3-practice-07
    title: Python/import.c (CPython, 3.15 branch at 88b0f7d)
    url: https://github.com/python/cpython/blob/88b0f7da77b44631e2750a8eae6277e54a7ac3cd/Python/import.c
    publisher: python/cpython on GitHub
    accessed: "2026-10-23"
  - id: s-r1-practice-04
    title: Installing Free-Threaded Python
    url: https://py-free-threading.github.io/installing-cpython/
    publisher: Python Free-Threading Guide (Quansight Labs and contributors)
    accessed: "2026-10-23"
  - id: s-r1-practice-07
    title: Running Python with the GIL Disabled
    url: https://py-free-threading.github.io/running-gil-disabled/
    publisher: Python Free-Threading Guide (Quansight Labs and contributors)
    accessed: "2026-10-23"
  - id: s-r1-criticism-02
    title: Porting Python Packages to Support Free-Threading
    url: https://py-free-threading.github.io/porting/
    publisher: Python Free-Threading Guide (Quansight Labs and contributors)
    accessed: "2026-10-23"
  - id: s-r1-criticism-03
    title: Validating thread safety with testing
    url: https://py-free-threading.github.io/testing/
    publisher: Python Free-Threading Guide (Quansight Labs and contributors)
    accessed: "2026-10-23"
  - id: s-r1-criticism-06
    title: Debugging thread safety issues
    url: https://py-free-threading.github.io/debugging/
    publisher: Python Free-Threading Guide (Quansight Labs and contributors)
    accessed: "2026-10-23"
  - id: s-r3-practice-08
    title: Frequently seen errors and how to fix them
    url: https://py-free-threading.github.io/faq/
    publisher: Python Free-Threading Guide (Quansight Labs and contributors)
    accessed: "2026-10-23"
  - id: s-r3-practice-06
    title: Handling dependencies that don't support free-threading
    url: https://py-free-threading.github.io/dependencies/
    publisher: Python Free-Threading Guide (Quansight Labs and contributors)
    accessed: "2026-10-23"
  - id: s-r1-evidence-06
    title: Compatibility Status Tracking
    url: https://py-free-threading.github.io/tracking/
    publisher: Python Free-Threading Guide (Quansight Labs and contributors)
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
  - id: s-r1-criticism-07
    title: pytest-run-parallel (README)
    url: https://github.com/Quansight-Labs/pytest-run-parallel
    publisher: Quansight Labs
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
    publisher: LWN.net (Jake Edge)
    date: "2024"
    accessed: "2026-10-23"
  - id: s-r1-criticism-09
    title: "Free-threaded Python: past, present, and future"
    url: https://lwn.net/Articles/1078367/
    publisher: LWN.net (Jake Edge)
    date: "2026-06-22"
    accessed: "2026-10-23"
  - id: s-r1-cases-02
    title: "The GIL and API Performance: The Past, Present, and Free-Threaded Future (slides)"
    url: https://fosdem.org/2026/events/attachments/ABJMWD-the_gil_and_api_performance_past_present_and_free-threaded_future/slides/266979/the_gil_a_fw7etsx.pdf
    publisher: FOSDEM 2026 (Ruben Hias)
    accessed: "2026-10-23"
  - id: s-r2-criticism-02
    title: "The GIL and API Performance (talk transcript, machine-generated)"
    url: https://video.fosdem.org/2026/ua2220/ABJMWD-the_gil_and_api_performance_past_present_and_free-threaded_future.vtt
    publisher: FOSDEM 2026 (Ruben Hias)
    accessed: "2026-10-23"
  - id: s-r1-cases-01
    title: Granian (README)
    url: https://github.com/emmett-framework/granian/blob/master/README.md
    publisher: emmett-framework
    accessed: "2026-10-23"
  - id: s-r1-cases-05
    title: Free-Threaded Python - Tensogram
    url: https://sites.ecmwf.int/docs/tensogram/main/guide/free-threaded-python.html
    publisher: ECMWF
    accessed: "2026-10-23"
```
