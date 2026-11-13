# Findings: 20261023-0350-free-threaded-cpython · round 1 · angle cases
- researcher: claude-opus-5-5 · status: partial (Q13 has no independent rung-2 web-serving benchmark; only one server's docs and one conference talk's own measurements) · tool calls: 27

## Questions
- Q13: thin — claims: C-r1-cases-01, C-r1-cases-02, C-r1-cases-03, C-r1-cases-04, C-r1-cases-05, C-r1-cases-06, C-r1-cases-07, C-r1-cases-08 — note: Granian documents experimental free-threaded support (rung 1); one FOSDEM 2026 talk reports 2.5x at 32 threads on a mixed 80% I/O / 20% CPU API benchmark (speaker's own measurement, no published raw numbers in slides); no Gunicorn/Uvicorn/Django/Flask/FastAPI official statement or independent benchmark found after 4 queries.
- Q14: thin — claims: C-r1-cases-09, C-r1-cases-10, C-r1-cases-11, C-r1-cases-12, C-r1-cases-13 — note: ECMWF's Tensogram library publishes paired GIL vs free-threaded throughput tables (rung 1, library-level, not a deployment); Meta employs a core developer on the free-threaded interpreter (LWN); no company deployment report with numbers found at rung 1/2 (only Medium/blog posts, rung 3, listed under Unused leads).
- Q17: answered — claims: C-r1-cases-14, C-r1-cases-15, C-r1-cases-16, C-r1-cases-17, C-r1-cases-18, C-r1-cases-19, C-r1-cases-20, C-r1-cases-21, C-r1-cases-22, C-r1-cases-23, C-r1-cases-24 — note: docs.python.org (3.15.1) describe interpreters and InterpreterPoolExecutor and their trade-offs; docs give no explicit "when to choose free threading vs interpreters vs processes" guidance; Wouters' view (via LWN) covers subinterpreters' current limits, multiprocessing cost and asyncio for network I/O.

## Sources

### S-r1-cases-01
- url: https://raw.githubusercontent.com/emmett-framework/granian/master/README.md · canonical: github.com/emmett-framework/granian/blob/master/README.md
- title: Granian (README) · authors: n/a (project README) · publisher: emmett-framework (GitHub)
- date: master branch as accessed · version: README on master, 2026-10-23; section refers to "Since version 2.0"
- accessed: 2026-10-23 · read-via: curl · quote-match: exact · archive: none
- kind: official docs · peer-review: n/a
- owner: emmett-framework project (Granian maintainers) · upstream: none
- lateral: not searched further; Granian is an open-source Rust-based Python HTTP server from the Emmett framework project; the README is the project describing itself.
- passages:
  - P1 · § "Free-threaded Python": "free-threaded Python support is still experimental and highly discouraged in"
  - P2 · § "Free-threaded Python": "Since version 2.0 Granian supports free-threaded Python. While the installation process remains the same, as wheels for the free-threaded version are published separately, here we list some key differences from the GIL version."
  - P3 · § "Free-threaded Python": "Workers are threads instead of separated processes, so there will always be a single Python interpreter running"
  - P4 · § "Free-threaded Python": "if for any reason the GIL gets enabled on the free-threaded build, Granian will refuse to start."
  - P5 · § "Free-threaded Python": "on synchronous protocols like WSGI every GIL-related limitation is theoretically absent."
  - P6 · § "Free-threaded Python": "at the time being there's not enough data to make suggestions in terms of workers and threads tuning in the free-threaded Python land, and thus you will need to experiment with those values depending on your specific workload."
  - P7 · § "Free-threaded Python": "In asynchronous protocols like ASGI and RSGI each worker runs its own AsyncIO event loop like the GIL version, but the loop will run in the worker thread instead of the Python main thread"

### S-r1-cases-02
- url: https://fosdem.org/2026/events/attachments/ABJMWD-the_gil_and_api_performance_past_present_and_free-threaded_future/slides/266979/the_gil_a_fw7etsx.pdf · canonical: fosdem.org/2026/events/attachments/ABJMWD-the_gil_and_api_performance_past_present_and_free-threaded_future/slides/266979/the_gil_a_fw7etsx.pdf
- title: The GIL and API Performance: The Past, Present, and Free-Threaded Future (slides) · authors: Ruben Hias · publisher: FOSDEM 2026 (Python track)
- date: FOSDEM 2026 (31 Jan–1 Feb 2026; date not printed on the slides) · version: Python 3.14 / 3.14t
- accessed: 2026-10-23 · read-via: pdf → text · quote-match: exact · archive: none
- kind: other (conference talk slides) · peer-review: no (FOSDEM talk selection only)
- owner: Ruben Hias, "Software Engineer at TechWolf" · upstream: none (speaker's own benchmarks)
- lateral: search results show the FOSDEM 2026 schedule entry and speaker page for Ruben Hias (TechWolf); no independent publication of the benchmark found. The slides as extracted contain the benchmark set-up and takeaways but no chart data (raw RPS numbers absent from the text).
- passages:
  - P1 · § "whoami": "Software Engineer at TechWolf"
  - P2 · § "Benchmark Time": "Free-threading: Python 3.14t with threads"
  - P3 · § "Benchmark Time": "Baseline: Multi-process (current best practice)"
  - P4 · § "Benchmark: Mixed Workload": "Testing a realistic API: 80% I/O operations, 20% CPU work"
  - P5 · § "Benchmark: Mixed Workload": "Varies thread/worker count from 1 to 32"
  - P6 · § "Key Takeaways": "Free-threading enables linear scaling: 2.5x improvement at 32 threads"
  - P7 · § "Key Takeaways": "For I/O-heavy APIs: async/Gevent remain excellent choices today"
  - P8 · § "Key Takeaways": "GIL creates a scaling ceiling regardless of server choice"
  - P9 · § "Conclusions": "For new projects: consider free-threading. For existing: async/multi-process work well"
  - P10 · § "Basic multi-threading": "3.14: 2.352 s ± 0.014 s … 3.14t: 768.9 ms ± 11.7 ms … ~3x speedup"
  - P11 · § "Benchmark Time": "Traditional: Gunicorn threads, Granian threads … Async: Uvicorn/Granian ASGI, Gevent"
  - P12 · § "Conclusions": "Free-threading delivers true parallelism without memory overhead"

### S-r1-cases-03
- url: https://docs.python.org/3/library/concurrent.interpreters.html · canonical: docs.python.org/3/library/concurrent.interpreters.html
- title: concurrent.interpreters — Multiple interpreters in the same process · authors: n/a · publisher: Python Software Foundation (Python 3.15.1 documentation)
- date: n/a · version: Python 3.15.1 documentation; module "Added in version 3.14."
- accessed: 2026-10-23 · read-via: curl · quote-match: exact · archive: none
- kind: official docs · peer-review: n/a
- owner: Python Software Foundation / CPython core developers · upstream: PEP 734, PEP 684, PEP 554 (cited on page)
- lateral: official CPython documentation; the trusted source for this run.
- passages:
  - P1 · § "concurrent.interpreters — Multiple interpreters in the same process": "Added in version 3.14."
  - P2 · § "concurrent.interpreters — Multiple interpreters in the same process": "For concurrency, interpreters themselves (and this module) don't provide much more than isolation, which on its own isn't useful. Actual concurrency is available separately through threads – see below."
  - P3 · § "Key details": "not all PyPI packages support use in multiple interpreters yet"
  - P4 · § "Multiple Interpreters and Isolation": "Therefore, do not use multiple interpreters in security-sensitive situations, where they shouldn't have access to each other's data."
  - P5 · § "Concurrency and Parallelism": "That isolation makes them similar to processes, but they still enjoy in-process efficiency, like threads."
  - P6 · § "Concurrency and Parallelism": "As a significant bonus, interpreters are sufficiently isolated that they do not share the GIL, which means combining threads with multiple interpreters enables full multi-core parallelism. (This has been the case since Python 3.12.)"
  - P7 · § "“Sharing” Objects": "By default, most objects are copied with pickle when they are passed to another interpreter."
  - P8 · § "Concurrency and Parallelism": "It's a similar concurrency model to CSP or the actor model, a model which is relatively easy to reason about."

### S-r1-cases-04
- url: https://lwn.net/SubscriberLink/1078367/5800cc051d01e516/ · canonical: lwn.net/Articles/1078367/
- title: Free-threaded Python: past, present, and future · authors: Jake Edge · publisher: LWN.net (Eklektix, Inc.)
- date: 2026-06-22 · version: n/a (talk at PyCon US 2026, mid-May 2026; covers 3.13, 3.14, 3.15)
- accessed: 2026-10-23 · read-via: curl · quote-match: exact · archive: none
- kind: news · peer-review: no (editorial control)
- owner: LWN.net (Eklektix, Inc.); reports a talk by Thomas Wouters, who "works for Meta on the free-threaded interpreter" · upstream: Thomas Wouters' PyCon US 2026 talk (video https://www.youtube.com/watch?v=PZu6LyiZVbM, not opened)
- lateral: LWN is an independent, subscriber-funded Linux/open-source news publication with editorial staff; travel sponsored by the Linux Foundation per the article. The speaker has a stake (Meta employee working on the feature; co-author of PEP 779).
- passages:
  - P1 · § "Free-threaded Python: past, present, and future": "Beyond that, he works for Meta on the free-threaded interpreter and other things."
  - P2 · § "Motivation": "There are other options, such as using multiple processes, but that typically requires more memory and copying data between the processes."
  - P3 · § "Motivation": "Subinterpreters will allow a single process to have multiple interpreters, each with its own GIL, that can be run in separate threads, but there some problems with using that approach."
  - P4 · § "Motivation": "The interaction with third-party libraries, especially those that are not written with Python in mind, … and there is no good way, so far, to copy data between the subinterpreters."
  - P5 · § "Motivation": "He is a big proponent of asyncio and thinks it is the best way to do network I/O"
  - P6 · § "Motivation": "Without the GIL, multi-threaded solutions to those things can offer higher throughput, lower memory use, and lower latency."
  - P7 · § "Future": "He suspects that the Python project will lag behind Linux distributors, such as Red Hat and Debian, and large companies like Meta, that will have already enabled free threading as the default."
  - P8 · § "Status": "Making Python code scale well may require more extensive changes. Having many threads accessing the same objects is a problem that Python cannot solve directly."

### S-r1-cases-05
- url: https://sites.ecmwf.int/docs/tensogram/main/guide/free-threaded-python.html · canonical: sites.ecmwf.int/docs/tensogram/main/guide/free-threaded-python.html
- title: Free-Threaded Python - Tensogram · authors: n/a · publisher: ECMWF (sites.ecmwf.int)
- date: n/a (main-branch docs) · version: Tensogram docs "main"; CPython 3.13/3.13t/3.14/3.14t; NumPy 2.4.4
- accessed: 2026-10-23 · read-via: curl · quote-match: exact · archive: none
- kind: official docs · peer-review: n/a
- owner: ECMWF (European Centre for Medium-Range Weather Forecasts), Tensogram project · upstream: none (own benchmark, rust/benchmarks/python/bench_threading.py)
- lateral: not searched further; hosted on ECMWF's own docs domain, an intergovernmental weather-forecasting organisation; library-level benchmark of its own Rust-backed Python extension, not a service deployment.
- passages:
  - P1 · § "Benchmark Results": "Measured on Linux x86_64 (20 cores), NumPy 2.4.4, release build. Same-version paired comparisons to isolate the GIL effect."
  - P2 · § "Benchmark Results": "The speedups reflect multiple Python threads entering Rust concurrently via py.detach()."
  - P3 · § "Headline: Decode Throughput (1M float32, no codec)": "Headline: Decode Throughput (1M float32, no codec) … 408 op/s … 396 op/s … 293 (0.72x) … 1,841 (4.65x)"
  - P4 · § "Small Messages (16K float32, no codec)": "Small Messages (16K float32, no codec) … 20,174 op/s … 12,951 op/s"
  - P5 · § "Small Messages (16K float32, no codec)": "23,369 (1.16x) … 168,786 (13.03x)"
  - P6 · § "Free-Threaded Python": "Tensogram supports free-threaded Python (CPython 3.13t / 3.14t), which removes the Global Interpreter Lock (GIL) and allows true multi-threaded parallelism from Python."

### S-r1-cases-06
- url: https://docs.python.org/3/library/concurrent.futures.html · canonical: docs.python.org/3/library/concurrent.futures.html
- title: concurrent.futures — Launching parallel tasks · authors: n/a · publisher: Python Software Foundation (Python 3 documentation)
- date: n/a · version: Python 3 documentation as of 2026-10-23 (3.15.x)
- accessed: 2026-10-23 · read-via: curl · quote-match: exact · archive: none
- kind: official docs · peer-review: n/a
- owner: Python Software Foundation / CPython core developers · upstream: none
- lateral: official CPython documentation; the trusted source for this run.
- passages:
  - P1 · § "InterpreterPoolExecutor": "It is a ThreadPoolExecutor subclass, which means each worker is running in its own thread. The difference here is that each worker has its own interpreter, and runs each task using that interpreter."
  - P2 · § "InterpreterPoolExecutor": "The biggest benefit to using interpreters instead of only threads is true multi-core parallelism. Each interpreter has its own Global Interpreter Lock, so code running in one interpreter can run on one CPU core, while code in another interpreter runs unblocked on a different core."
  - P3 · § "InterpreterPoolExecutor": "The tradeoff is that writing concurrent code for use with multiple interpreters can take extra effort."
  - P4 · § "InterpreterPoolExecutor": "Another major benefit is that you don't have to deal with several of the big pain points of using threads, like race conditions."
  - P5 · § "InterpreterPoolExecutor": "Instead, each interpreter must have its own copy, and you will have to synchronize any changes between the copies manually."
  - P6 · § "InterpreterPoolExecutor": "submit() and map() work like normal, except the worker serializes the callable and arguments using pickle when sending them to its interpreter."
  - P7 · § "ProcessPoolExecutor": "ProcessPoolExecutor uses the multiprocessing module, which allows it to side-step the Global Interpreter Lock but also means that only picklable objects can be executed and returned."

## Claims

### C-r1-cases-01
- claim: The Granian README states that Granian has supported free-threaded Python since Granian version 2.0, with free-threaded wheels published separately.
- kind: fact
- questions: Q13 · load-bearing: yes (the only WSGI/ASGI server found with documented free-threaded support)
- support: S-r1-cases-01/P2 · rung 1 · fit direct · upstream self
- scope: Granian README on master, accessed 2026-10-23
- confidence: high · flags: vendor-about-itself
- conflicts: none

### C-r1-cases-02
- claim: The Granian README warns that its free-threaded Python support is still experimental and highly discouraged in production environments.
- kind: fact
- questions: Q13 · load-bearing: yes (decides whether a reader should deploy it)
- support: S-r1-cases-01/P1 · rung 1 · fit direct · upstream self
- scope: Granian README on master, accessed 2026-10-23
- confidence: high · flags: none
- conflicts: none

### C-r1-cases-03
- claim: On the free-threaded build, Granian runs its workers as threads rather than separate processes, so a single Python interpreter serves all workers, and for ASGI and RSGI each worker runs its own asyncio event loop in its worker thread.
- kind: behaviour
- questions: Q13 · load-bearing: yes (what changes in the deployment model)
- support: S-r1-cases-01/P3 · rung 1 · fit direct · upstream self
- support: S-r1-cases-01/P7 · rung 1 · fit direct · upstream self
- scope: Granian 2.0 and later on free-threaded CPython, per README accessed 2026-10-23
- confidence: high · flags: none
- conflicts: none

### C-r1-cases-04
- claim: The Granian README states that Granian refuses to start if the GIL gets enabled on the free-threaded build.
- kind: behaviour
- questions: Q13 · load-bearing: no (operational detail)
- support: S-r1-cases-01/P4 · rung 1 · fit direct · upstream self
- scope: Granian README on master, accessed 2026-10-23
- confidence: high · flags: none
- conflicts: none

### C-r1-cases-05
- claim: The Granian README says that on the free-threaded build GIL-related limitations are theoretically absent for synchronous protocols such as WSGI, but that there is not yet enough data to recommend worker and thread tuning, so users must experiment for their workload.
- kind: fact
- questions: Q13 · load-bearing: yes (no published tuning guidance; WSGI is where the change applies)
- support: S-r1-cases-01/P5 · rung 1 · fit direct · upstream self
- support: S-r1-cases-01/P6 · rung 1 · fit direct · upstream self
- scope: Granian README on master, accessed 2026-10-23; "theoretically" is the README's own hedge
- confidence: high · flags: vendor-about-itself
- conflicts: none

### C-r1-cases-06
- claim: In a FOSDEM 2026 talk, Ruben Hias (TechWolf) benchmarked a mixed-workload API (80% I/O operations, 20% CPU work) varying thread/worker count from 1 to 32, comparing Gunicorn and Granian threads, Uvicorn/Granian ASGI, Gevent, Python 3.14t with threads, and a multi-process baseline.
- kind: fact
- questions: Q13 · load-bearing: yes (the only located web-API benchmark on 3.14t with stated conditions)
- support: S-r1-cases-02/P1 · rung 1 · fit direct · upstream self
- support: S-r1-cases-02/P2 · rung 1 · fit direct · upstream self
- support: S-r1-cases-02/P3 · rung 1 · fit direct · upstream self
- support: S-r1-cases-02/P4 · rung 1 · fit direct · upstream self
- support: S-r1-cases-02/P5 · rung 1 · fit direct · upstream self
- support: S-r1-cases-02/P11 · rung 1 · fit direct · upstream self
- scope: FOSDEM 2026 slides; hardware, server versions and absolute RPS not in the extracted slide text
- confidence: medium · flags: none
- conflicts: none

### C-r1-cases-07
- claim: The FOSDEM 2026 talk by Ruben Hias reports that, in its mixed-workload API benchmark, free-threading gave a 2.5x improvement at 32 threads, and it concludes that async/Gevent remain excellent choices today for I/O-heavy APIs.
- kind: number
- questions: Q13 · load-bearing: yes (the only reported web-API result on the free-threaded build)
- support: S-r1-cases-02/P6 · rung 1 · fit partial (the baseline of the 2.5x is not stated in the slide text) · upstream self
- support: S-r1-cases-02/P7 · rung 1 · fit direct · upstream self
- scope: one speaker's own benchmark, Python 3.14t, 80% I/O / 20% CPU workload, up to 32 threads; not independently reproduced
- confidence: low · flags: exceptional (single unreplicated measurement; "linear scaling" wording is the speaker's)
- conflicts: none found at rung 1–2; a Medium post (rung 3, not opened) reportedly found free-threaded Granian slowest of six ASGI configurations — see Unused leads

### C-r1-cases-08
- claim: The FOSDEM 2026 talk by Ruben Hias advises considering free-threading for new projects while saying async and multi-process approaches work well for existing ones.
- kind: evaluation
- questions: Q13 · load-bearing: no (one practitioner's recommendation; attributed form only)
- support: S-r1-cases-02/P9 · rung 1 · fit direct · upstream self
- scope: speaker's opinion, FOSDEM 2026
- confidence: medium · flags: none
- conflicts: none

### C-r1-cases-09
- claim: ECMWF's Tensogram library documents support for free-threaded CPython 3.13t and 3.14t.
- kind: fact
- questions: Q14 · load-bearing: no (example of a real project adopting the build)
- support: S-r1-cases-05/P6 · rung 1 · fit direct · upstream self
- scope: Tensogram docs, main branch, accessed 2026-10-23
- confidence: high · flags: vendor-about-itself
- conflicts: none

### C-r1-cases-10
- claim: In ECMWF Tensogram's own benchmark (Linux x86_64, 20 cores, NumPy 2.4.4), decoding 1M float32 values with 8 Python threads reached 1,841 op/s on CPython 3.14t (4.65x its single-thread rate of 396 op/s) versus 293 op/s on CPython 3.14 with the GIL (0.72x its single-thread rate of 408 op/s).
- kind: number
- questions: Q14 · load-bearing: no (library-level case, not a service deployment)
- support: S-r1-cases-05/P1 · rung 1 · fit direct · upstream self
- support: S-r1-cases-05/P3 · rung 1 · fit direct · upstream self
- scope: Tensogram decode, 1M float32, no codec, 8 threads, same-version paired comparison; the extension releases the GIL during Rust work
- confidence: high · flags: vendor-about-itself
- conflicts: none

### C-r1-cases-11
- claim: In ECMWF Tensogram's own benchmark of small (16K float32) messages, single-thread throughput was 12,951 op/s on CPython 3.14t versus 20,174 op/s on CPython 3.14, while at 16 threads 3.14t reached 168,786 op/s (13.03x its single-thread rate) versus 3.14's 23,369 op/s (1.16x).
- kind: number
- questions: Q14 · load-bearing: no (shows the single-thread cost and multi-thread gain in one real library)
- support: S-r1-cases-05/P4 · rung 1 · fit direct · upstream self
- support: S-r1-cases-05/P5 · rung 1 · fit direct · upstream self
- scope: Tensogram, small messages, no codec, Linux x86_64 20 cores; per-thread-count ratios are relative to each build's own 1-thread rate
- confidence: high · flags: vendor-about-itself
- conflicts: none

### C-r1-cases-12
- claim: ECMWF's Tensogram docs attribute the free-threaded speedups to multiple Python threads entering Rust concurrently via py.detach(), with each Rust call itself single-threaded.
- kind: interpretation
- questions: Q14 · load-bearing: no (explains why the case scales)
- support: S-r1-cases-05/P2 · rung 1 · fit direct · upstream self
- scope: Tensogram docs, main branch
- confidence: high · flags: none
- conflicts: none

### C-r1-cases-13
- claim: LWN reports that Thomas Wouters, a CPython core developer and steering council member, works for Meta on the free-threaded interpreter and suspects that Linux distributors such as Red Hat and Debian and large companies like Meta will enable free threading as the default before the Python project does.
- kind: prediction
- questions: Q14 · load-bearing: no (industry context, not a deployment report)
- support: S-r1-cases-04/P1 · rung 2 · fit direct · upstream Thomas Wouters, PyCon US 2026 talk
- support: S-r1-cases-04/P7 · rung 2 · fit direct · upstream Thomas Wouters, PyCon US 2026 talk
- scope: talk at PyCon US 2026 (mid-May), reported 2026-06-22; personal prediction, stated "without any authority"
- confidence: medium · flags: speculation, vendor-about-itself (Meta employee on Meta's direction)
- conflicts: none

### C-r1-cases-14
- claim: The concurrent.interpreters module was added in Python 3.14.
- kind: version
- questions: Q17 · load-bearing: no (dates the alternative)
- support: S-r1-cases-03/P1 · rung 1 · fit direct · upstream self
- scope: Python 3.15.1 documentation
- confidence: high · flags: none
- conflicts: none

### C-r1-cases-15
- claim: The Python documentation says interpreters on their own provide little more than isolation for concurrency, and that actual concurrency comes from combining them with threads.
- kind: definition
- questions: Q17 · load-bearing: no
- support: S-r1-cases-03/P2 · rung 1 · fit direct · upstream self
- scope: Python 3.15.1 documentation, concurrent.interpreters
- confidence: high · flags: none
- conflicts: none

### C-r1-cases-16
- claim: The Python documentation says interpreters do not share the GIL, so combining threads with multiple interpreters enables full multi-core parallelism, and that this has been the case since Python 3.12.
- kind: behaviour
- questions: Q17 · load-bearing: no
- support: S-r1-cases-03/P6 · rung 1 · fit direct · upstream self
- support: S-r1-cases-06/P2 · rung 1 · fit direct · upstream self
- scope: CPython 3.12+ (per-interpreter GIL); Python 3 documentation as of 2026-10-23
- confidence: high · flags: none
- conflicts: none

### C-r1-cases-17
- claim: The Python documentation describes interpreters' isolation as making them similar to processes while keeping in-process efficiency like threads, with a concurrency model similar to CSP or the actor model.
- kind: interpretation
- questions: Q17 · load-bearing: no
- support: S-r1-cases-03/P5 · rung 1 · fit direct · upstream self
- support: S-r1-cases-03/P8 · rung 1 · fit direct · upstream self
- scope: Python 3.15.1 documentation (the docs' own characterization; attributed form)
- confidence: high · flags: none
- conflicts: none

### C-r1-cases-18
- claim: The Python documentation says that by default most objects passed to another interpreter are copied with pickle, and that InterpreterPoolExecutor pickles the callable, arguments and return value when sending them between interpreters.
- kind: behaviour
- questions: Q17 · load-bearing: no
- support: S-r1-cases-03/P7 · rung 1 · fit direct · upstream self
- support: S-r1-cases-06/P6 · rung 1 · fit direct · upstream self
- scope: Python 3 documentation as of 2026-10-23
- confidence: high · flags: none
- conflicts: none

### C-r1-cases-19
- claim: The Python documentation describes InterpreterPoolExecutor as a ThreadPoolExecutor subclass in which each worker thread runs tasks in its own interpreter.
- kind: definition
- questions: Q17 · load-bearing: no
- support: S-r1-cases-06/P1 · rung 1 · fit direct · upstream self
- scope: Python 3 documentation as of 2026-10-23
- confidence: high · flags: none
- conflicts: none

### C-r1-cases-20
- claim: The Python documentation says the trade-off of InterpreterPoolExecutor is that concurrent code for multiple interpreters can take extra effort, because mutable data cannot be shared and changes between each interpreter's copies must be synchronized manually, while a benefit is avoiding pain points of threads such as race conditions.
- kind: evaluation
- questions: Q17 · load-bearing: no
- support: S-r1-cases-06/P3 · rung 1 · fit direct · upstream self
- support: S-r1-cases-06/P4 · rung 1 · fit direct · upstream self
- support: S-r1-cases-06/P5 · rung 1 · fit direct · upstream self
- scope: Python 3 documentation (attributed form)
- confidence: high · flags: none
- conflicts: none

### C-r1-cases-21
- claim: The concurrent.interpreters documentation warns that not all PyPI packages support use in multiple interpreters yet and that multiple interpreters should not be used in security-sensitive situations.
- kind: fact
- questions: Q17 · load-bearing: no
- support: S-r1-cases-03/P3 · rung 1 · fit direct · upstream self
- support: S-r1-cases-03/P4 · rung 1 · fit direct · upstream self
- scope: Python 3.15.1 documentation
- confidence: high · flags: none
- conflicts: none

### C-r1-cases-22
- claim: The Python documentation says ProcessPoolExecutor uses multiprocessing to side-step the GIL, which means only picklable objects can be executed and returned.
- kind: behaviour
- questions: Q17 · load-bearing: no
- support: S-r1-cases-06/P7 · rung 1 · fit direct · upstream self
- scope: Python 3 documentation as of 2026-10-23
- confidence: high · flags: none
- conflicts: none

### C-r1-cases-23
- claim: LWN reports Thomas Wouters saying at PyCon US 2026 that subinterpreters give each interpreter its own GIL in separate threads, but that interaction with third-party libraries is not there yet and there is so far no good way to copy data between subinterpreters, while multiple processes typically require more memory and copying data between them.
- kind: evaluation
- questions: Q17 · load-bearing: no
- support: S-r1-cases-04/P2 · rung 2 · fit direct · upstream Thomas Wouters, PyCon US 2026 talk
- support: S-r1-cases-04/P3 · rung 2 · fit direct · upstream Thomas Wouters, PyCon US 2026 talk
- support: S-r1-cases-04/P4 · rung 2 · fit direct · upstream Thomas Wouters, PyCon US 2026 talk
- scope: one core developer's view (Meta, works on free threading), May 2026; attributed form
- confidence: medium · flags: vendor-about-itself (speaker works on the competing free-threading approach)
- conflicts: none (the docs' C-r1-cases-21 also notes PyPI package support gaps, consistent)

### C-r1-cases-24
- claim: LWN reports Thomas Wouters saying asyncio is the best way to do network I/O, and that without the GIL multi-threaded solutions can offer higher throughput, lower memory use and lower latency than the alternatives.
- kind: evaluation
- questions: Q17, Q13 · load-bearing: no
- support: S-r1-cases-04/P5 · rung 2 · fit direct · upstream Thomas Wouters, PyCon US 2026 talk
- support: S-r1-cases-04/P6 · rung 2 · fit direct · upstream Thomas Wouters, PyCon US 2026 talk
- scope: one core developer's view, PyCon US 2026; "can offer" is a hedge; attributed form
- confidence: medium · flags: speculation ("can offer")
- conflicts: none

## Conflicts
- none recorded between opened sources. Tension (not a conflict between opened sources): S-r1-cases-02/P12 claims free-threading "delivers true parallelism without memory overhead"; a Medium post (rung 3, not opened) reportedly measured higher memory for Uvicorn/Hypercorn on the free-threaded build. Not settled.

## Speculation and flags
- C-r1-cases-07: exceptional — a single speaker's unreplicated benchmark; "linear scaling" and "2.5x" without the baseline stated in the slide text.
- S-r1-cases-02/P12: superlative-like claim "without memory overhead"; not claimed.
- C-r1-cases-13: speculation — Wouters' prediction, explicitly "not saying this with any authority whatsoever"; speaker is a Meta employee.
- C-r1-cases-24: speculation — "can offer higher throughput, lower memory use, and lower latency".
- C-r1-cases-01, -05, -09 to -11: vendor-about-itself (project documenting its own support/benchmarks).

## Unused leads
- https://discuss.python.org/t/experimenting-with-free-threaded-python-3-13-for-web-frameworks/106318 — forum (rung 3) report of a pure-Python threaded framework on 3.13t, 1,297 req/s (2.1x) at 16 threads; follow upstream to the project repo if it exists.
- https://python.plainenglish.io/granian-hits-65-mib-on-free-threaded-python-3-15-while-uvicorn-and-hypercorn-fork-10-processes-5b76ee6a4eb8 — Medium (rung 3) ASGI benchmark: free-threaded Granian reportedly slowest of six configs (~4,000–4,700 req/s) but lowest memory; potential counter-evidence to C-r1-cases-07.
- https://python.plainenglish.io/python-3-14-free-threading-made-our-cpu-worker-faster-and-broke-two-c-extensions-18a3e4106247 — Medium (rung 3) first-person production CPU-worker report (6.9s vs 18.4s median batch, two C extensions broke); unverifiable author.
- https://pretalx.com/djangocon-us-2025/talk/P7PMST — DjangoCon US 2025 "Free Threaded Django" (Micah Lyle), live demo with/without free threading; video on pyvideo.org may hold numbers.
- https://www.youtube.com/watch?v=PZu6LyiZVbM — Thomas Wouters PyCon US 2026 talk video (primary for C-r1-cases-13, -23, -24).
- https://adarshd.substack.com/p/goodbye-gil-exploring-free-threaded — blog (rung 3) comparing 3.14 vs 3.14t on Flask endpoints (3.14 RC2).
- https://lwn.net/Articles/1078367/ — the same LWN article also states >50% of the top 360 binary wheels support free threading (evidence angle's ecosystem readiness).

## Queries
- "free-threaded Python web server benchmark granian" → useful (Granian README pointer)
- "free-threading Python production experience Meta Instagram" → nothing new
- "concurrent.interpreters InterpreterPoolExecutor docs when to use" → useful
- "free-threaded Python 3.14 FastAPI Flask benchmark requests per second" → nothing new
- "\"free-threaded\" Python deployment results company blog throughput" → useful (ECMWF, FOSDEM, leads)
- "gunicorn free-threading support gthread Python 3.14t" → nothing new (no official Gunicorn statement found)
- "FOSDEM GIL API performance free-threaded future" → useful (slides, LWN pointer)
- "lwn.net Wouters free-threaded Python PyCon US 2026" → useful
- "Django free-threaded Python benchmark results talk" → nothing new (abstract only)
- "uvicorn OR gunicorn \"free-threaded\" benchmark WSGI threads 3.14t requests" → nothing new
