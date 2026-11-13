# Verification: 20261023-0350-free-threaded-cpython · final-b3
- verifier: claude-sonnet-5-5 · date: 2026-10-23 · claims: 15 · supported 14 · partial 1 · contradicted 0 · not-addressed 0 · passage-not-found 0 · unreachable 0 · needs-rewrite 0

Pages saved as exact text in `<dossier>/pages/final-b3/<source id>.html/.txt` (all fetched fresh by curl, HTTP 200). No claim in this batch is `main`, so no counter-evidence search was run. All 15 claims are not load-bearing, so no "looked first" step was required; each source was still read around the passage.

## Records

### V-C-r3-practice-11-1
- claim: C-r3-practice-11
- source S-r3-practice-08 · opened: https://py-free-threading.github.io/faq/ (curl) · quote-match: exact · passage at § "What does RuntimeWarning: The global interpreter lock (GIL) has been enabled mean?" (P1): found verbatim
- looked first: n/a (not load-bearing)
- implied: the guide's FAQ says a native extension that does not explicitly declare support for running without the GIL triggers the warning; "As a precaution, when the free-threaded Python build imports such an extension, it assumes that the GIL is necessary to run the extension, and enables the GIL at runtime." Page updated Sept 25, 2026. Every part of the claim (attribution to the guide, precaution, assumes GIL needed, enables GIL at runtime) is stated.
- verdict: supported · reason: direct statement in the guide, attributed form.
- bar: met (non-load-bearing, one opened rung-1 source for what the guide says) · independence: n/a · currency: page updated 2026-09-25, current at access
- counter: not run

### V-C-r3-practice-13-1
- claim: C-r3-practice-13
- source S-r3-practice-09 · opened: https://pip.pypa.io/en/stable/cli/pip_install/ (curl) · quote-match: exact · passage at § "Options" (--only-binary) (P1): found verbatim
- looked first: n/a (not load-bearing)
- implied: "--only-binary" means "Do not use source packages"; accepts ":all:", ":none:" or package names; "Packages without binary distributions will fail to install when this option is used on them." Matches the claim's `--only-binary :all:` example and the fail-instead-of-build behaviour.
- verdict: supported · reason: pip's own docs state the behaviour directly.
- bar: met (rung 1, official docs) · independence: n/a · currency: pip "stable" docs read 2026-10-23
- counter: not run

### V-C-r3-practice-14-1
- claim: C-r3-practice-14
- source S-r3-practice-06 · opened: https://py-free-threading.github.io/dependencies/ (curl) · quote-match: exact · passages at § "CFFI" (P1), § "Depending on PyYAML" (P3), § "mypyc" (P4), § "Zstandard" (P5): found verbatim
- looked first: n/a (not load-bearing)
- implied: CFFI 2.0.0 added free-threaded 3.14 support and 3.15 needs CFFI 2.1.1 or newer; PyYAML 6.0.3+ supports free-threaded 3.14t+, and for 3.13t one can depend on the PyYAML-ft fork; for mypyc, with no compiled build available "we suggest using a pure-python build instead"; Python 3.14 includes compression.zstd and backports.zstd (3.9-3.13) "can replace the zstandard package". All four workarounds are stated by the guide. The conflict noted by the researcher (FAQ says PyYAML does not ship free-threaded binaries) concerns a different statement (the jupyter FAQ) and does not contradict what this guide says in this section; this claim stays attributed to the guide.
- verdict: supported · reason: every named version and workaround is on the page, attributed to the guide.
- bar: met (rung 1 for what the guide says; CFFI changelog upstream not opened, not needed for the attributed form) · independence: n/a · currency: page updated 2026-09-25
- counter: not run

### V-C-r1-criticism-35-1
- claim: C-r1-criticism-35
- source S-r1-criticism-03 · opened: https://py-free-threading.github.io/testing/ (curl) · quote-match: exact · passage at § "Validating thread safety with testing" (P1): found verbatim
- looked first: n/a (not load-bearing)
- implied: the page opens "Put priority on thread safety issues surfaced by real-world testing. Run the test suite for your project and fix any failures that occur only with the GIL disabled." Read "first" as the guide's "put priority"; the next paragraphs add "also consider constructing multithreaded tests", which confirms existing tests come first. Page updated May 14, 2026.
- verdict: supported · reason: direct. Note that "first" is an inference from "Put priority on" and "also consider", not a literal word on the page.
- bar: met · independence: n/a · currency: page updated 2026-05-14
- counter: not run

### V-C-r1-criticism-37-1
- claim: C-r1-criticism-37
- source S-r1-criticism-03 · opened: https://py-free-threading.github.io/testing/ (curl) · quote-match: exact · passages at § "Validating thread safety with testing" (P3, P4): found verbatim
- looked first: n/a (not load-bearing)
- implied: names pytest-run-parallel and pytest-freethreaded (pytest plugins) running existing tests "simultaneously in many threads"; "unittest-ft offers similar functionality" for unittest; "useful for discovering issues related to use of global state, but cannot discover issues from multithreaded use of data structures defined by your library." All parts match. (The two support lines are the same source; P4 is labelled rung 2 in the findings but the source is the same community guide, rung 1 for what it says.)
- verdict: supported · reason: both halves of the claim are stated in adjacent sentences.
- bar: met · independence: n/a (single source; Quansight, which maintains pytest-run-parallel, owns the guide, so the attributed form is the right one) · currency: page updated 2026-05-14
- counter: not run

### V-C-r1-criticism-38-1
- claim: C-r1-criticism-38
- source S-r1-criticism-07 · opened: https://github.com/Quansight-Labs/pytest-run-parallel (curl) · quote-match: exact · passages at § intro (P1), § "Features" (P2, P3, P4), § "Usage" (P5): found verbatim (P5 confirmed by reading, line 257 of the text)
- looked first: n/a (not load-bearing)
- implied: README says "The main goal of pytest-run-parallel is to discover thread-safety issues that could exist when using C libraries"; "--parallel-threads to run a test suite in parallel"; "--iterations to run multiple times in each thread"; "pytest.mark.thread_unsafe to mark a single test to run in a single thread". Matches each element.
- verdict: supported · reason: all features and the stated main goal appear in the README.
- bar: met (rung 1: project README for what the plugin does) · independence: n/a · currency: README on main at access, unpinned
- counter: not run

### V-C-r1-criticism-40-1
- claim: C-r1-criticism-40
- source S-r1-criticism-06 · opened: https://py-free-threading.github.io/debugging/ (curl) · quote-match: exact · passages at § "Repeated test execution" (P2, P3): found verbatim
- looked first: n/a (not load-bearing)
- implied: "tests for code that has a concurrency issue may still pass most of the time. In order to more reliably reproduce a test failure under concurrency, we recommend using pytest-repeat, which enables the --count flag"; example command `PYTHON_GIL=0 pytest -x -v --count=100 test_concurrent.py`. Matches.
- verdict: supported · reason: recommendation and rationale both stated.
- bar: met · independence: n/a · currency: page updated 2026-04-21
- counter: not run

### V-C-r1-cases-10-1
- claim: C-r1-cases-10
- source S-r1-cases-05 · opened: https://sites.ecmwf.int/docs/tensogram/main/guide/free-threaded-python.html (curl) · quote-match: exact · passages at § "Benchmark Results" (P1) and § "Headline: Decode Throughput (1M float32, no codec)" (P3): found verbatim (P3 is a multi-piece excerpt of the table)
- looked first: n/a (not load-bearing)
- implied: "Measured on Linux x86_64 (20 cores), NumPy 2.4.4, release build. Same-version paired comparisons"; 8-thread row: 3.14 (GIL) 293 op/s (0.72x), 3.14t 1,841 (4.65x); 1-thread row: 3.14 408 op/s, 3.14t 396 op/s. The page also says the GIL is released during the Rust computation. All numbers match.
- verdict: supported · reason: numbers, hardware, NumPy version and scope match the page, and the claim is correctly framed as the vendor's own benchmark.
- bar: met (rung 1 for what the project measured; vendor-about-itself, so attributed form only) · independence: n/a · currency: docs "main" branch, undated
- counter: not run

### V-C-r1-cases-11-1
- claim: C-r1-cases-11
- source S-r1-cases-05 · opened: https://sites.ecmwf.int/docs/tensogram/main/guide/free-threaded-python.html (curl) · quote-match: exact · passages at § "Small Messages (16K float32, no codec)" (P4, P5): found verbatim
- looked first: n/a (not load-bearing)
- implied: 1 thread: 3.14 (GIL) 20,174 op/s, 3.14t 12,951 op/s; 16 threads: 3.14 23,369 (1.16x), 3.14t 168,786 (13.03x). Matches.
- verdict: supported · reason: every figure matches the table; ratios are relative to each build's own 1-thread rate as the claim states.
- bar: met (rung 1, vendor's own benchmark, attributed) · independence: n/a · currency: docs "main" branch, undated
- counter: not run

### V-C-r1-cases-13-1
- claim: C-r1-cases-13
- source S-r1-cases-04 · opened: https://lwn.net/SubscriberLink/1078367/5800cc051d01e516/ (curl) · quote-match: exact · passages at § "Free-threaded Python: past, present, and future" (P1), § "Future" (P7): found verbatim
- looked first: n/a (not load-bearing)
- implied: article by Jake Edge on Thomas Wouters' PyCon US 2026 talk: "longtime CPython core developer (and current steering council member)"; "he works for Meta on the free-threaded interpreter and other things"; "I'm not saying this with any authority whatsoever"; "He suspects that the Python project will lag behind Linux distributors, such as Red Hat and Debian, and large companies like Meta, that will have already enabled free threading as the default." Matches. The claim keeps the hedge ("suspects") and attribution.
- verdict: supported · reason: all elements are stated; it is a reported personal prediction and the claim treats it as one.
- bar: met for the attributed form (rung 2, LWN editorial reporting; speaker has a stake) · independence: n/a · currency: article dated 2026-06-22
- counter: not run

### V-C-r1-cases-15-1
- claim: C-r1-cases-15
- source S-r1-cases-03 · opened: https://docs.python.org/3/library/concurrent.interpreters.html (curl) · quote-match: exact · passage at § intro (P2): found verbatim
- looked first: n/a (not load-bearing)
- implied: "interpreters themselves (and this module) don't provide much more than isolation, which on its own isn't useful. Actual concurrency is available separately through threads". The "combining with threads" wording is also stated in § "Concurrency and Parallelism" ("combining threads with multiple interpreters enables full multi-core parallelism").
- verdict: supported · reason: direct.
- bar: met (rung 1, official docs) · independence: n/a · currency: Python 3.15.1 docs as read 2026-10-23
- counter: not run

### V-C-r1-cases-16-1
- claim: C-r1-cases-16
- source S-r1-cases-03 · opened: https://docs.python.org/3/library/concurrent.interpreters.html (curl) · quote-match: exact · passage at § "Concurrency and Parallelism" (P6): found verbatim
- source S-r1-cases-06 · opened: https://docs.python.org/3/library/concurrent.futures.html (curl) · quote-match: exact · passage at § "InterpreterPoolExecutor" (P2): found verbatim
- looked first: n/a (not load-bearing)
- implied: "interpreters are sufficiently isolated that they do not share the GIL, which means combining threads with multiple interpreters enables full multi-core parallelism. (This has been the case since Python 3.12.)" The futures page adds "Each interpreter has its own Global Interpreter Lock". Matches.
- verdict: supported · reason: direct, including the 3.12 date.
- bar: met (rung 1; the two sources are the same owner, so they count as one) · independence: same owner (PSF docs), one source for bar purposes · currency: current docs
- counter: not run

### V-C-r1-cases-18-1
- claim: C-r1-cases-18
- source S-r1-cases-03 · opened: https://docs.python.org/3/library/concurrent.interpreters.html (curl) · quote-match: exact · passage at § "Sharing" Objects (P7): found verbatim
- source S-r1-cases-06 · opened: https://docs.python.org/3/library/concurrent.futures.html (curl) · quote-match: exact · passage at § "InterpreterPoolExecutor" (P6): found verbatim
- looked first: n/a (not load-bearing)
- implied: "By default, most objects are copied with pickle when they are passed to another interpreter." For the executor: "the worker serializes the callable and arguments using pickle when sending them to its interpreter. The worker likewise serializes the return value when sending it back." The return value is in the sentence right after the cited P6 (not in the quoted passage), and "likewise" makes it pickle serialization. Items all present.
- verdict: supported · reason: direct; the return-value part sits in the sentence immediately following the recorded P6 passage.
- bar: met (rung 1) · independence: same owner, one source for bar purposes · currency: current docs
- counter: not run

### V-C-r1-cases-20-1
- claim: C-r1-cases-20
- source S-r1-cases-06 · opened: https://docs.python.org/3/library/concurrent.futures.html (curl) · quote-match: exact · passages at § "InterpreterPoolExecutor" (P3, P4, P5): found verbatim
- looked first: n/a (not load-bearing)
- implied: "The tradeoff is that writing concurrent code for use with multiple interpreters can take extra effort. However, this is because it forces you to be deliberate about how and when interpreters interact, and to be explicit about what data is shared." Separately, in the next paragraph on isolation: a mutable object "cannot be used by more than one interpreter at the same time ... each interpreter must have its own copy, and you will have to synchronize any changes between the copies manually." Also: "Another major benefit is that you don't have to deal with several of the big pain points of using threads, like race conditions." The page's stated reason for the extra effort is being forced to be deliberate and explicit about interaction and shared data. The claim's causal link ("because mutable data cannot be shared and changes ... must be synchronized manually") joins two separate paragraphs and is not stated as the docs' reason.
- verdict: partial · reason: the extra-effort tradeoff, the manual-synchronization requirement and the race-condition benefit are each on the page, but not the claimed "because" link between them. · narrower claim: "The Python documentation says the tradeoff of InterpreterPoolExecutor is that writing concurrent code for multiple interpreters can take extra effort, because it forces deliberate handling of how interpreters interact and what data is shared; it also says mutable data cannot be shared between interpreters, so each interpreter needs its own copy and changes between copies must be synchronized manually, and names avoiding thread pain points such as race conditions as a benefit."
- bar: met for the narrower claim (rung 1, attributed) · independence: n/a · currency: current docs
- counter: not run

### V-C-r1-cases-22-1
- claim: C-r1-cases-22
- source S-r1-cases-06 · opened: https://docs.python.org/3/library/concurrent.futures.html (curl) · quote-match: exact · passage at § "ProcessPoolExecutor" (P7): found verbatim
- looked first: n/a (not load-bearing)
- implied: "ProcessPoolExecutor uses the multiprocessing module, which allows it to side-step the Global Interpreter Lock but also means that only picklable objects can be executed and returned." Matches.
- verdict: supported · reason: direct.
- bar: met (rung 1) · independence: n/a · currency: current docs
- counter: not run

## Counter-evidence
None run (no claim in this batch is marked main).

## Leads
- none
