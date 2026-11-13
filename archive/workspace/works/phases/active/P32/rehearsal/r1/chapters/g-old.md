---
title: "Free-threaded CPython: Python without the GIL"
date: 2026-10-23
format: native
syntax: 1
lang: en
subject: "Python"
summary: "What the free-threaded (no-GIL) CPython build is, how it replaces the GIL, and whether a developer of web services and data scripts should try it today, with what changes for their code and dependencies."
tags:
  - python
  - concurrency
  - free-threading
  - gil
source:
  project: python
  repo: work
---

You already know the one-line version of the GIL: *one thread runs Python at a time*. This chapter takes that sentence apart. What exactly was the lock protecting, what did CPython have to rebuild to remove it, and what does that mean for a web service, a data-processing script, and the pile of packages in your `requirements.txt`? By the end you should be able to decide, with reasons, whether to try the free-threaded build and how.

## Background {#background}

> [!SKIP] Skip this if you already know threads versus processes
> A **process** is a running program with its own memory. A **thread** is a line of execution *inside* a process; all threads of a process share its memory, which makes handing data between them free, and also makes it easy for two of them to trample the same object. Python gives you three ways to do several things at once:
>
> - `threading` (and `concurrent.futures.ThreadPoolExecutor`): several threads, one process, shared memory.
> - `asyncio`: one thread that switches between many tasks whenever a task waits for I/O. Concurrency without parallelism.
> - `multiprocessing` (and `ProcessPoolExecutor`): several processes, each with its own interpreter and memory; data crosses between them by being serialized (pickled) and copied.
>
> **Concurrency** means several tasks are in progress at once; **parallelism** means several are literally executing at the same instant on different CPU cores. Waiting for a database is a concurrency problem; crunching numbers on eight cores is a parallelism problem.

### What the GIL actually protects {#what-the-gil-protects}

The **GIL** (Global Interpreter Lock) is a single lock inside the CPython interpreter. A thread must hold it to execute Python bytecode, so at most one thread runs Python code at any instant. Threads that are waiting on a socket or a disk, or that are inside C code which deliberately releases the lock (NumPy does this for big array operations), let others run in the meantime.

Why would anyone build an interpreter that way? Because every Python object carries bookkeeping that the interpreter updates constantly, without asking you. The most important is the **reference count**: a number on every object saying how many references point at it; when it reaches zero, the object is freed. Every assignment, every function call, every list access bumps these counts up and down. PEP 703 states the GIL's purpose plainly: it "protects against corruption of internal interpreter states when multiple threads concurrently access or modify Python objects" ([PEP 703](#src-pep703) — peps.python.org). Without it, two threads appending to the same list could corrupt the list's length or an element's reference count, and a wrong reference count means an object freed while still in use: a crash, not an exception.

One big lock is a very cheap way to make all of that safe. Its cost is that a CPU-bound Python program cannot use more than one core through threads.

### Why people wanted it gone {#why-remove-it}

The standard workaround is `multiprocessing`, and it is expensive in ways you have probably felt. PEP 703 puts numbers on it: "Starting a thread takes ~100 µs, while spawning a subprocess takes ~50 ms", and every piece of data that crosses a process boundary has to be serialized and copied ([PEP 703](#src-pep703)). The PEP quotes a PyTorch developer: "we often end up with 72 processes in place of one because of the GIL." Libraries such as scikit-learn and NumPy have been shaped around avoiding the lock.

### Where things stand in October 2026 {#status}

The removal has gone in stages, each one reversible:

- **PEP 703** added a `--disable-gil` build option. It shipped in **Python 3.13** as an explicitly *experimental* build; the normal build with a GIL stayed the default ([PEP 703](#src-pep703); [PEP 779](#src-pep779)).
- **PEP 779**, accepted on 16 June 2025, moved the free-threaded build to **"officially supported but still optional"** from **Python 3.14** (phase II). It set targets for that status: at most 15% single-threaded slowdown and about 20% extra memory ([PEP 779](#src-pep779)).
- **Phase III**, making free-threading the *default*, is deliberately left to a future PEP that will depend on community support and clear benefits ([PEP 779](#src-pep779)).
- **Python 3.15.0** was released on 9 October 2026 ([PEP 790](#src-pep790)). The free-threaded build is still a separate, optional build there too: the 3.15 docs describe it the same way ([free-threading how-to](#src-howto)).

So today "Python" still means the GIL build. The free-threaded build is a second, officially supported interpreter that you choose on purpose. It is recognisable by a `t` suffix: `python3.14t`, wheels built for it, and so on ([extension how-to](#src-howto-ext)).

## Intuition {#intuition}

Take a toy job: four chunks of pure-Python number crunching, each needing about one second of CPU, run on four threads on a four-core machine.

```diagram #four-threads
kind: timeline
title: Four one-second CPU-bound tasks on four threads, with and without the GIL (idealised)
caption: An *idealised* picture, not a measurement. With the GIL the threads take turns, so the job takes about four seconds of wall time. Without it they can run on four cores at once. Real numbers are lower because of the free-threaded build's overhead and any contention.
axis: {unit: s, from: 0, to: 4, ticks: [0, 1, 2, 3, 4]}
lanes:
  - label: GIL build
    bars:
      - {from: 0, to: 1, label: T1, tone: series-1}
      - {from: 1, to: 2, label: T2, tone: series-2}
      - {from: 2, to: 3, label: T3, tone: series-3}
      - {from: 3, to: 4, label: T4, tone: series-4}
  - label: Free-threaded, core 1
    bars:
      - {from: 0, to: 1, label: T1, tone: series-1}
  - label: Free-threaded, core 2
    bars:
      - {from: 0, to: 1, label: T2, tone: series-2}
  - label: Free-threaded, core 3
    bars:
      - {from: 0, to: 1, label: T3, tone: series-3}
  - label: Free-threaded, core 4
    bars:
      - {from: 0, to: 1, label: T4, tone: series-4}
```

(In the real GIL build the threads swap in small slices rather than one-second blocks, but the total is the same: one core's worth of work per second.)

That picture is the entire upside. Free-threading does not make any single thread faster; on its own a thread is slightly *slower*. What it buys is that **threads become a way to use several cores for Python code**, with shared memory and no pickling, which until now only processes could do.

> [!IMPORTANT] The key idea
> The GIL protected the **interpreter's** memory, not **your program's** logic. The free-threaded build keeps the interpreter's memory safe by other means, so it still will not crash on a shared list. But anything your code assumed about two threads not running *at the same time* is now tested for real. Removing the GIL makes parallelism possible; it does not make your code thread-safe.

Now map that onto the three tools you use:

| You use… | What the free-threaded build changes |
|---|---|
| `asyncio` | Nothing directly. An event loop is one thread; it was never limited by the GIL for I/O, and it does not gain cores. |
| Threads for I/O (requests, DB calls, a threaded WSGI server) | Little. These threads were mostly waiting, and waiting threads already released the GIL. |
| Threads for CPU work | **Everything.** This is the case that goes from "no speed-up" to "scales with cores". |
| `multiprocessing` for CPU work | It keeps working unchanged. You *may* now replace it with threads, trading process isolation for cheap startup and shared memory. |

For a web-services-and-scripts developer, the honest summary is: your async services are not the target; your CPU-heavy data scripts might be.

## How it works {#how-it-works}

If the GIL was what kept reference counts and containers consistent, removing it means replacing it with something finer-grained that does not make the single-threaded case unbearably slow. PEP 703 is mostly a description of those replacements.

```diagram #what-replaces-the-gil
kind: stack
title: The mechanisms that replace the GIL in the free-threaded build
caption: Each layer answers one job the GIL used to do for free. Reading from the top, most code only ever touches the first two.
layers:
  - label: Your code
    items: [threading.Lock, queue.Queue, contextvars]
    tone: accent
  - label: Built-in containers
    items: [per-object locks, critical sections, optimistic lock-free reads]
  - label: Object lifetime
    items: [biased reference counting, immortal objects, deferred reference counting]
  - label: Memory and GC
    items: [mimalloc allocator, stop-the-world garbage collection]
    tone: store
```

### Reference counting without one big lock {#refcounting}

Making every reference-count update an **atomic** operation (one that the CPU guarantees cannot be torn by another core) would be correct but slow, because atomics are much more expensive than plain increments and almost every line of Python does several. Instead the build uses three tricks ([PEP 703](#src-pep703)):

- **Biased reference counting.** Each object remembers the thread that created it, its *owner*. The owner updates a cheap, non-atomic "local" count; every other thread updates a separate atomic "shared" count. The bet is that most objects are mostly touched by the thread that made them, so the common path stays cheap.
- **Immortal objects.** Objects such as `None`, `True`, `False`, small integers and interned strings are marked *immortal*: their reference-count operations become no-ops, so a thousand threads touching `None` do not fight over one counter. As of 3.14 immortalisation is limited to code constants (numeric, string and constant-tuple literals) and strings interned with `sys.intern()` ([free-threading how-to](#src-howto)).
- **Deferred reference counting.** Very widely shared objects (module-level functions, code objects, modules, methods) skip some reference-count updates altogether and are only freed by the garbage collector, while all threads are paused.

### Containers with their own locks {#container-locks}

The GIL also kept `list`, `dict` and `set` internally consistent. Now each of those objects carries its own lightweight lock. C code takes it with `Py_BEGIN_CRITICAL_SECTION`; operations involving two containers lock both in address order so two threads cannot deadlock on each other ([PEP 703](#src-pep703)). Reads are cheaper still: reading an item of a `list` or `dict` first tries an **optimistic lock-free read** and only falls back to taking the lock if another thread changed the container mid-read.

From Python, the result is described in the docs' thread-safety page. Single operations are safe: `d[key]`, `d.get(key)`, `key in d` and `len(d)` are lock-free and atomic; `d[key] = value`, `del d[key]`, `lst.append(x)` and `lst[i] = x` are safe from several threads and "will not corrupt" the container. But "operations that involve multiple accesses, as well as iteration, are never atomic", so `d[key] = d[key] + 1` is a race, and iterating over a dict that another thread is modifying is not safe ([Thread safety guarantees](#src-threadsafety) — docs.python.org).

### Memory and garbage collection {#memory-gc}

Python's own allocator, pymalloc, relied on the GIL, so it is replaced by **mimalloc**, a thread-safe allocator. The cyclic garbage collector becomes **stop-the-world**: it pauses every thread that is running Python before looking for cycles, and it is non-generational in this mode to avoid pausing often ([PEP 703](#src-pep703)).

### What it costs {#costs}

None of this is free. The 3.14 release notes put "the performance penalty on single-threaded code in free-threaded mode" at "roughly 5-10%, depending on the platform and C compiler used", much better than 3.13 because the specialising adaptive interpreter is now enabled in this build ([What's New in 3.14](#src-whatsnew314)). The current how-to quotes an average pyperformance overhead of about 1% on macOS aarch64 to 8% on x86-64 Linux ([free-threading how-to](#src-howto)).

Memory goes up too. PEP 779 measured about 15–20% at the time, against its 20% target ([PEP 779](#src-pep779)). The how-to lists why: interned strings become immortal, non-GC objects have a bigger header (`None` is 32 bytes on AMD64 instead of 16), the deferred freeing schemes hold memory longer, and mimalloc behaves differently from pymalloc ([free-threading how-to](#src-howto)). If you watch the RSS of a long-running service, you will notice.

## Worked examples {#worked-examples}

The examples below are what you would actually do on day one. They are short on purpose: copy them into a scratch directory.

### 1. Install it next to your normal Python {#install}

The py-free-threading guide lists installers for every platform. The three you are most likely to use ([Installing free-threaded Python](#src-install) — py-free-threading.github.io):

```bash title="three ways to get a free-threaded interpreter"
# uv: create a virtualenv on the free-threaded 3.14 build
uv venv --python 3.14t

# Homebrew (macOS): installs $(brew --prefix)/bin/python3.14t
brew install python-freethreading

# conda-forge
conda create -n nogil --override-channels -c conda-forge python-freethreading
```

The python.org installers for macOS and Windows also offer it as an optional component (on Windows, `Include_freethreaded=1`). Whichever you use, the binary carries the `t` suffix, and your existing `python3.14` is untouched.

### 2. Check which interpreter you are in, and whether the GIL is really off {#detect}

There are two different questions here, and the docs keep them apart ([free-threading how-to](#src-howto); [Running with the GIL disabled](#src-running) — py-free-threading.github.io):

```python title="check_gil.py" #check-gil
import sys
import sysconfig

# Was this interpreter *built* without the GIL? (1 on the free-threaded build)
print("free-threaded build:", sysconfig.get_config_var("Py_GIL_DISABLED") == 1)

# Is the GIL *actually off* in this process right now?
print("GIL enabled before imports:", sys._is_gil_enabled())

import numpy  # replace with your own C-extension dependencies

print("GIL enabled after imports:", sys._is_gil_enabled())
```

Why can the answer change after an import? Because a C extension has to **declare** that it is safe without the GIL (in C, a `Py_mod_gil` slot set to `Py_MOD_GIL_NOT_USED`). If you import one that does not, the interpreter **re-enables the GIL** for the whole process and prints a warning ([extension how-to](#src-howto-ext)). Your free-threaded interpreter then behaves like the normal one, only slightly slower. This is the single most common surprise on day one.

You can override it with `PYTHON_GIL=0` or `-X gil=0`, which keeps the GIL off regardless ([Running with the GIL disabled](#src-running)). Treat that as a test-only switch: you are running a C extension that never claimed it is safe without the lock.

### 3. Measure whether your work actually scales {#benchmark}

A quick experiment tells you more than any article. Run the same script under `python3.14` and `python3.14t`:

```python title="scale.py" #scale
import sys
import time
from concurrent.futures import ThreadPoolExecutor


def work(n):
    total = 0
    for i in range(n):
        total += i * i % 7
    return total


def run(workers, jobs=8, n=3_000_000):
    start = time.perf_counter()
    with ThreadPoolExecutor(max_workers=workers) as pool:
        list(pool.map(work, [n] * jobs))
    return time.perf_counter() - start


if __name__ == "__main__":
    print("GIL enabled:", sys._is_gil_enabled())
    for workers in (1, 2, 4, 8):
        print(f"{workers} threads: {run(workers):.2f}s")
```

What to look for, and what each result means:

- On the GIL build, the four lines come out roughly the same: adding threads does not help pure-Python CPU work.
- On the free-threaded build, the 1-thread line should be a little *slower* than on the GIL build (the overhead from [What it costs](#costs)), and the time should fall as you add threads, until you run out of cores.
- Then swap `work` for a real function from one of your data scripts. If it spends its time inside NumPy or another library that already releases the GIL, you may see little difference between the two builds: those threads were already parallel.

### 4. The bug the GIL was hiding {#races}

Here is the classic shared counter:

```python title="race.py" #race
import threading

counter = 0


def bump(times):
    global counter
    for _ in range(times):
        counter += 1  # read, add, write: three steps, not one


threads = [threading.Thread(target=bump, args=(1_000_000,)) for _ in range(4)]
for t in threads:
    t.start()
for t in threads:
    t.join()
print(counter)  # 4000000 only if no update was lost
```

`counter += 1` reads the value, adds one, and writes it back. If two threads read the same value, one update is lost. This was **always** a race; on the GIL build it just shows up rarely because threads only switch at particular points. The py-free-threading porting guide calls this code that "only appear[s] to be thread-safe in the GIL-enabled build" ([Porting guide](#src-porting) — py-free-threading.github.io). With threads truly running at once, it comes up short far more often.

The same pattern hides in less obvious places, and the porting guide names the most common source: "global mutable state" ([Porting guide](#src-porting)). The typical one in a web service is a module-level cache:

```python title="cache.py" #cache-fix
import threading

_cache = {}
_lock = threading.Lock()


def get_settings(tenant):
    value = _cache.get(tenant)          # a single dict read is atomic
    if value is not None:
        return value
    with _lock:
        value = _cache.get(tenant)      # re-check: another thread may have filled it
        if value is None:
            value = load_settings(tenant)   # your expensive call
            _cache[tenant] = value
        return value
```

Without the lock, the dict itself would not be corrupted (single writes are safe, per [How it works](#container-locks)), but two threads could both miss and both call `load_settings`, which is wasteful at best and wrong if loading has side effects. The fix is the one the porting guide recommends: a `threading.Lock`, used as a context manager, with a re-check after acquiring it. Its other recommendations are `threading.local` for per-thread state, `contextvars.ContextVar` for state scoped to a request or task, and copy-on-write for shared configuration: build a new object and swap the reference rather than mutating the shared one ([Porting guide](#src-porting)).

### 5. Two defaults that differ between builds {#defaults}

Two flags have different defaults on the free-threaded build, and they matter if you use `contextvars` with threads ([free-threading how-to](#src-howto); [What's New in 3.14](#src-whatsnew314)):

- `sys.flags.thread_inherit_context` is **true** on the free-threaded build: a `threading.Thread` starts with a *copy of the caller's* context at `start()`. On the GIL build it starts with an *empty* context. Code that sets a context variable (a request id, a tenant) and then starts a worker thread will see it in that thread on one build and not on the other.
- `sys.flags.context_aware_warnings` is **true**, so `warnings.catch_warnings()` changes a context variable instead of a global filter list, which is what makes it safe to use from several threads.

## What changes for your dependencies {#dependencies}

Pure-Python packages work on the free-threaded build as they are, subject to the same race caveats as your own code. The real constraint is **C extensions**. "C API extensions need to be built specifically for the free-threaded build" ([extension how-to](#src-howto-ext)): a wheel for `python3.14` will not load in `python3.14t`, and an extension that has not declared free-threading support re-enables the GIL (example 2). In 3.14 the free-threaded build also does not support the Limited C API or the stable ABI, so a project that ships one `abi3` wheel for many Python versions must build separate wheels for the free-threaded build ([extension how-to](#src-howto-ext)). The py-free-threading guide now also documents building `abi3t` extensions, a free-threading-compatible stable ABI for newer Pythons ([py-free-threading guide](#src-guide)). Whatever the mechanism, it is the package maintainers' job, and in practice it means: **if a package has no free-threaded wheel for your Python, pip will try to build it from source.**

The community tracker records the state of packages with native code ([Compatibility tracker](#src-tracking) — py-free-threading.github.io, page dated 25 September 2026). For packages a web-and-data developer is likely to use, it lists these versions:

| Area | Package, with the version the tracker lists |
|---|---|
| Data | NumPy 2.1.0, pandas 2.2.3, SciPy 1.15.0, scikit-learn 1.6.0, PyArrow 18.0.0, Matplotlib 3.9.0, Pillow 11.0.0, PyTorch 2.6.0 |
| Web and serialisation | pydantic 2.11.0 / pydantic-core 2.29.0, aiohttp 3.13.0, uvloop 0.22.1, httptools 0.8.0, SQLAlchemy 2.0.45, PyYAML 6.0.3, msgpack 1.2.0, lxml 7.0.0, cryptography 46.0.0 |
| Listed, no version shown | orjson, psycopg, grpcio |
| Caveat noted | greenlet 3.5.2: "fully supported on Python 3.15t and above"; on 3.14t "it may crash at runtime exit" |

Treat that table as a starting point, not a guarantee: it records the tracker's state on one day, and a listed version is not a promise that every wheel you need exists for your platform. Some packages you might use, such as psycopg2 and gevent, do not appear at all. The authoritative test is example 2 run against your own `requirements.txt`.

## Should you use it today? {#decision}

Put the pieces together and the decision mostly falls out of what your program spends its time doing.

```diagram #should-i
kind: flow
title: Deciding whether the free-threaded build is worth trying for a program
direction: down
nodes:
  - {id: start, label: A program you want faster, shape: pill}
  - {id: cpu, label: "Is it CPU-bound in pure Python?"}
  - {id: io, label: Stay on the GIL build, sub: async and I/O threads gain little, tone: muted}
  - {id: deps, label: "Do all C dependencies keep the GIL off?", sub: run check_gil.py}
  - {id: wait, label: Wait or replace the dependency, sub: track it upstream, tone: warn}
  - {id: races, label: Audit shared mutable state, sub: "caches, globals, counters"}
  - {id: bench, label: Benchmark threads vs processes, sub: run scale.py on real work}
  - {id: adopt, label: Adopt for this program, shape: pill, tone: ok}
edges:
  - {from: start, to: cpu}
  - {from: cpu, to: io, label: no}
  - {from: cpu, to: deps, label: yes}
  - {from: deps, to: wait, label: no}
  - {from: deps, to: races, label: yes}
  - {from: races, to: bench}
  - {from: bench, to: adopt, label: it scales}
```

For your situation, that leads to a fairly clear answer:

- **Web services: not yet, and probably not for speed.** An `asyncio` service, or a threaded one that mostly waits on databases and HTTP, gets little out of parallel bytecode, and pays the 5–10% single-thread cost plus extra memory. The stronger reason to run your service's tests on the free-threaded build is to find the races in its shared state *before* free-threading is the default somewhere you deploy.
- **CPU-heavy data scripts: yes, try it.** A script that runs pure-Python transformations in a `ProcessPoolExecutor` mostly because of the GIL is exactly the case free-threading was built for. With threads you skip process startup and the pickling of inputs and results. If the heavy lifting is already inside NumPy or pandas, measure first: those threads may already be parallel.
- **multiprocessing: keep it where isolation is the point.** A crashing worker, or a memory leak you want to throw away with the process, are still good reasons to use processes.

## Best practices & next steps {#best-practices}

**Where the prevailing advice agrees with this chapter.** The official how-to and the community guide both treat the free-threaded build as a separate interpreter you opt into, installed alongside the default one ([free-threading how-to](#src-howto); [Installing free-threaded Python](#src-install)). Both recommend explicit synchronisation over leaning on the built-in containers' internal locks: the docs say to prefer `threading.Lock` and other primitives "where possible", and to use external synchronisation when sharing a `list`, `dict` or `set` across threads ([free-threading how-to](#src-howto); [Thread safety guarantees](#src-threadsafety)). The porting guide singles out global mutable state, and caches in particular, as the main hazard ([Porting guide](#src-porting)).

**Where a reasonable project might diverge.** Running production with `PYTHON_GIL=0` to force the GIL off past an undeclared extension is possible ([Running with the GIL disabled](#src-running)), but it bypasses the one safety signal the extension's author gave you; it belongs in an experiment, not a deployment. Likewise, staying on the GIL build for an I/O-bound service is not lagging behind: PEP 779 keeps the free-threaded build optional and leaves making it the default to a future decision ([PEP 779](#src-pep779)).

**Next steps.**

1. **Make a throwaway environment and check your dependencies.** `uv venv --python 3.14t`, install one project's real requirements, then run `check_gil.py` with your own imports. Note which packages fail to install or turn the GIL back on, and look them up in the [Compatibility tracker](#src-tracking).
2. **Run one CPU-bound data script on threads.** Pick a script that uses `ProcessPoolExecutor` for pure-Python work, swap in `ThreadPoolExecutor`, and time it under both builds with the approach in `scale.py`.
3. **Audit shared state in a service.** Search for module-level dicts, lists and counters, `global` statements and hand-rolled caches, and give each a lock, `threading.local`, a `ContextVar` or a copy-on-write swap, following the [Porting guide](#src-porting).
4. **Add a free-threaded job to CI.** Running your test suite on `3.14t` alongside your normal Python is cheap, and it shows you dependency and race problems early. The py-free-threading guide has sections on CI setup and on improving multithreaded test coverage ([py-free-threading guide](#src-guide)).

## Quiz {#quiz-section}

```quiz #quiz
title: Check yourself
items:
  - id: q-protects
    type: choice
    prompt: What was the GIL primarily protecting?
    options:
      - {id: a, text: "Your program's invariants, such as a counter never losing an update"}
      - {id: b, text: "The interpreter's internal state, such as reference counts and container internals"}
      - {id: c, text: Network sockets from being read by two threads}
      - {id: d, text: The event loop used by asyncio}
    answer: [b]
    explain: PEP 703 describes the GIL as protecting "internal interpreter states". Races in your own logic, such as `counter += 1`, were always possible; the GIL only made them rarer.
  - id: q-which-gain
    type: choice
    prompt: Which of these workloads would you expect to speed up most on the free-threaded build? Select all that apply.
    options:
      - {id: a, text: An asyncio web service waiting on a database}
      - {id: b, text: A ThreadPoolExecutor running pure-Python parsing on eight cores}
      - {id: c, text: A threaded WSGI server whose handlers mostly wait on HTTP calls}
      - {id: d, text: A script that replaces a ProcessPoolExecutor of pure-Python work with threads}
    answer: [b, d]
    explain: Free-threading helps CPU-bound Python code running in several threads at once. I/O-bound threads and a single-threaded event loop were already waiting, not computing, so they gain little.
  - id: q-reenable
    type: recall
    prompt: You start `python3.14t`, `sys._is_gil_enabled()` returns `False`, and after importing a dependency it returns `True`. What happened, and what are your options?
    answer: The dependency is a C extension that has not declared free-threading support (no `Py_MOD_GIL_NOT_USED`), so the interpreter re-enabled the GIL for the whole process and printed a warning. You can upgrade to a version with free-threaded wheels, replace the dependency, or, for testing only, force the GIL off with `PYTHON_GIL=0` or `-X gil=0`.
  - id: q-refcount
    type: cloze
    text: In biased reference counting, the thread that created an object updates a cheap non-atomic {{local}} count, while other threads update an {{atomic}} shared count.
    explain: The bet is that most objects are mostly used by the thread that made them, so the common path avoids expensive atomic operations.
  - id: q-dict
    type: choice
    prompt: On the free-threaded build, which statement about a `dict` shared between threads is true?
    options:
      - {id: a, text: "`d[key] = d[key] + 1` is atomic because each single operation is"}
      - {id: b, text: "Concurrent writes can corrupt the dict, so it must never be shared"}
      - {id: c, text: "Single writes such as `d[key] = value` will not corrupt it, but a read-modify-write can still lose updates"}
      - {id: d, text: Iterating over it while another thread modifies it is safe}
    answer: [c]
    explain: The thread-safety docs say single operations are safe and will not corrupt the dict, but "operations that involve multiple accesses, as well as iteration, are never atomic". Use a lock for read-modify-write and iterate over a copy.
```

## Sources {#sources-heading}

```sources #sources
items:
  - id: src-pep703
    title: "PEP 703 – Making the Global Interpreter Lock Optional in CPython"
    url: https://peps.python.org/pep-0703/
    publisher: Python Software Foundation
    accessed: 2026-10-23
  - id: src-pep779
    title: "PEP 779 – Criteria for supported status for free-threaded Python"
    url: https://peps.python.org/pep-0779/
    publisher: Python Software Foundation
    accessed: 2026-10-23
  - id: src-pep790
    title: "PEP 790 – Python 3.15 Release Schedule"
    url: https://peps.python.org/pep-0790/
    publisher: Python Software Foundation
    accessed: 2026-10-23
  - id: src-howto
    title: Python support for free threading
    url: https://docs.python.org/3/howto/free-threading-python.html
    publisher: Python documentation
    accessed: 2026-10-23
  - id: src-howto-ext
    title: C API extension support for free threading
    url: https://docs.python.org/3/howto/free-threading-extensions.html
    publisher: Python documentation
    accessed: 2026-10-23
  - id: src-threadsafety
    title: Thread Safety Guarantees
    url: https://docs.python.org/3/library/threadsafety.html
    publisher: Python documentation
    accessed: 2026-10-23
  - id: src-whatsnew314
    title: "What's New In Python 3.14"
    url: https://docs.python.org/3/whatsnew/3.14.html
    publisher: Python documentation
    accessed: 2026-10-23
  - id: src-guide
    title: Python free-threading guide
    url: https://py-free-threading.github.io/
    publisher: Quansight Labs and community
    accessed: 2026-10-23
  - id: src-install
    title: Installing a free-threaded Python
    url: https://py-free-threading.github.io/installing-cpython/
    publisher: Python free-threading guide
    accessed: 2026-10-23
  - id: src-running
    title: Running Python with the GIL disabled
    url: https://py-free-threading.github.io/running-gil-disabled/
    publisher: Python free-threading guide
    accessed: 2026-10-23
  - id: src-porting
    title: Porting Python packages to support free-threading
    url: https://py-free-threading.github.io/porting/
    publisher: Python free-threading guide
    accessed: 2026-10-23
  - id: src-tracking
    title: Free-threading Python compatibility status tracker
    url: https://py-free-threading.github.io/tracking/
    publisher: Python free-threading guide
    date: 2026-09-25
    accessed: 2026-10-23
```
