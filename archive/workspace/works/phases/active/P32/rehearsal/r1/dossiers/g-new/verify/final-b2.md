# Verification: 20261023-0350-free-threaded-cpython · final-b2
- verifier: claude-sonnet-5-5 · date: 2026-10-23 · claims: 15 · supported 13 · partial 2 · contradicted 0 · not-addressed 0 · passage-not-found 0 · unreachable 0 · needs-rewrite 0
## Records
Pages saved in <dossier>/pages/final-b2/ (S-<id>.html/.txt, own fetch, 2026-10-23). No claim in this batch is main; no counter-evidence run.

### V-C-r2-evidence-08-1
- claim: C-r2-evidence-08
- source S-r2-evidence-05 · opened: https://lwn.net/SubscriberLink/1078367/eaa511915870fdb2/ (curl) · quote-match: exact · passage at P9 § "Future": found verbatim
- looked first: n/a (not load-bearing)
- implied: Wouters, answering a question on mixing modules with and without free-threading support, said such modules currently cause the interpreter to emit a warning and re-enable the GIL; a flag can always disable the GIL "but that is playing with fire, so you probably only want to do that for testing". Reported by Jake Edge (LWN).
- verdict: supported · reason: every element (warning, GIL re-enabled, flag, "playing with fire", testing) is in the passage; "probably" is inside the quote.
- bar: met (non-load-bearing, one rung-2 source, attributed) · independence: n/a · currency: LWN article dated June 2026; behaviour itself is confirmed by the 3.15 HOWTO (S-r2-evidence-01/P2-P3)
- counter: not run

### V-C-r2-evidence-11-1
- claim: C-r2-evidence-11
- source S-r2-evidence-04 · opened: https://docs.python.org/3/library/threading.html (curl) · quote-match: exact · passage at P3 § "GIL and performance considerations": found verbatim
- implied: "As of Python 3.13, free-threaded builds can disable the GIL, enabling true parallel execution of threads, but this feature is not available by default (see PEP 703)." Page header 3.15.1.
- verdict: supported · reason: matches; "since 3.13" is a fair reading of "As of Python 3.13".
- bar: met (rung 1) · independence: n/a · currency: page served as 3.15.1 docs
- counter: not run

### V-C-r2-evidence-17-1
- claim: C-r2-evidence-17
- source S-r2-evidence-01 · opened: https://docs.python.org/3.15/howto/free-threading-python.html (curl) · quote-match: exact · passage at P4 § "Python support for free threading": found verbatim
- implied: "While not all software will benefit from this automatically, programs designed with threading in mind will run faster on multi-core hardware." No figure.
- verdict: supported · reason: direct.
- bar: met (rung 1) · independence: n/a · currency: 3.15.1 docs, current
- counter: not run

### V-C-r2-evidence-18-1
- claim: C-r2-evidence-18
- source S-r2-evidence-01 · same page · quote-match: exact · passage at P5 § "Non-GC objects have a larger object header": found verbatim
- implied: AMD64: None 32 bytes (free-threaded) vs 16 bytes (default); GC objects such as dicts and lists the same size on both builds.
- verdict: supported · reason: all numbers and the GC-object statement match.
- bar: met (rung 1) · independence: n/a · currency: 3.15.1 docs
- counter: not run

### V-C-r2-evidence-19-1
- claim: C-r2-evidence-19
- source S-r2-evidence-02 · opened: https://docs.python.org/3.15/whatsnew/3.15.html (curl) · quote-match: exact · passage at P4 § "concurrent.futures": found verbatim
- implied: "Improved error reporting when a child process in a concurrent.futures.ProcessPoolExecutor terminates abruptly. The resulting traceback will now tell you the PID and exit code of the terminated process." (Contributed by Jonathan Berg, gh-139486.)
- verdict: supported · reason: the claim states only what What's New says. It does not support any wider "crash isolation" statement; keep it to this narrow behaviour.
- bar: met (rung 1) · independence: n/a · currency: 3.15 release notes
- counter: not run

### V-C-r2-practice-19-1
- claim: C-r2-practice-19
- source S-r2-practice-01 · opened: https://peps.python.org/pep-0803/ (curl) · quote-match: exact · passage at P10 § "New API": found verbatim
- implied: "Implementing this PEP will make it possible to build extensions that can be successfully loaded on free-threaded Python, but not necessarily ones that are thread-safe without a GIL."
- verdict: supported · reason: direct. Note the PEP is marked historical (canonical docs elsewhere); text is the PEP's own.
- bar: met (rung 1) · independence: n/a · currency: PEP Final for 3.15, now historical
- counter: not run

### V-C-r2-practice-20-1
- claim: C-r2-practice-20
- source S-r2-practice-04 · opened: https://py-free-threading.github.io/porting/ (curl) · quote-match: exact · passage at P1 § "Dependencies that don't support free-threading": found verbatim
- implied: "If one of your package's dependencies does not support free-threading, you might be able to switch to a fork that does." Page dated June 28, 2026 (updated); community guide (Quansight Labs).
- verdict: supported · reason: direct, as the guide's own advice; the chapter must attribute it to the guide.
- bar: met (attributed form, rung 1 for what the guide says) · independence: n/a · currency: updated 2026-06-28
- counter: not run

### V-C-r2-practice-21-1
- claim: C-r2-practice-21
- source S-r2-practice-04 · same page · quote-match: exact · passage at P2 (page line 139; the converter's locator heading is a stray code comment, real section is the context-local state section): found verbatim
- implied: "A newly spawned thread inherits a copy of the spawning thread's context on the free-threaded build, where PYTHON_THREAD_INHERIT_CONTEXT is enabled by default, but starts from each variable's default on the GIL-enabled build, where it is disabled by default."
- extra check: https://docs.python.org/3/using/cmdline.html (curl, own page) says the thread_inherit_context option "defaults to 1 on free-threaded builds and to 0 otherwise" and, when 0, "threads will start with an empty context" (rung 1 corroboration; empty context = variable defaults).
- verdict: supported · reason: the guide says it, and CPython's own docs agree on the behaviour. The "3.14+" scope in the findings is not in either passage and is not part of the claim.
- bar: met (rung 1 for the guide's statement; behaviour corroborated by official docs) · independence: guide and CPython docs are different owners · currency: 3.15.1 docs
- counter: not run

### V-C-r2-criticism-05-1
- claim: C-r2-criticism-05
- source S-r2-criticism-02 · opened: https://video.fosdem.org/2026/ua2220/ABJMWD-the_gil_and_api_performance_past_present_and_free-threaded_future.vtt (curl, saved as .txt) · quote-match: exact · passage at P8 cue 15:23.280-15:40.160: found verbatim
- implied: Speaker said "I created more of a mixed work load ... I looked at some research usually most real production applications have around between a 70-30 or 90 10 split between IO waiting time and actual CPU work." The transcript contains no "80/20" figure (searched for 80, eighty, 80-20, 80/20); the research is not named.
- verdict: partial · reason: the 70-30 to 90-10 research claim is supported; that the benchmark's own mix is "80/20" is not stated in this transcript. · narrower claim: "Ruben Hias says in the FOSDEM 2026 talk that, for his mixed I/O-and-CPU benchmark, he drew on unnamed research suggesting most production applications split between 70-30 and 90-10 between I/O waiting time and CPU work."
- bar: below for the 80/20 part (not found in source); met for the narrower claim (speaker's statement, ASR transcript) · independence: n/a · currency: January 2026 talk
- counter: not run

### V-C-r2-criticism-06-1
- claim: C-r2-criticism-06
- source S-r2-criticism-01 · opened: https://fosdem.org/2026/schedule/event/ABJMWD-.../ (curl, 301 followed to archive.fosdem.org) · quote-match: exact · passage at P1: found verbatim
- implied: abstract: "You'll see how modern servers like Granian, ASGI frameworks, and WSGI stacks behave when threads are no longer serialized by the interpreter."
- verdict: supported · reason: the claim paraphrases the abstract; scope is the abstract only, written by the speaker.
- bar: met (rung 1 for what the abstract says) · independence: n/a · currency: FOSDEM 2026
- counter: not run

### V-C-r2-criticism-07-1
- claim: C-r2-criticism-07
- source S-r2-criticism-02 · same transcript · quote-match: exact · passage at P9 cue 22:09.680-22:24.080: found verbatim
- implied: "I know some libraries still have issues with it I think like UV query for example like there are UV loop implementations still has some issues" (ASR). The speaker hedges ("I think"). Reading "UV loop" as uvloop is an inference from machine transcription.
- verdict: supported · reason: the statement is present; the library name is the transcript's "UV loop", read as uvloop. Keep it attributed and hedged ("says he thinks").
- bar: met for the attributed form (low confidence, ASR) · independence: n/a · currency: Jan 2026, 3.14t
- counter: not run

### V-C-r2-criticism-08-1
- claim: C-r2-criticism-08
- source S-r2-criticism-02 · same transcript · quote-match: exact · passage at P10 cue 26:20.240-26:44.880: found verbatim
- implied: Asked whether enabling free threading runs into race conditions in one's own code, he said "the Python protects you in the Python codes the main issue is if you're writing sea [C] extensions like numpy ... as long as you're writing pure Python you shouldn't need to care about this."
- verdict: supported · reason: the attributed statement is accurately reported. The content conflicts with CPython docs cited in the findings (free threading does not protect against race conditions); use only in the attributed form and never in the chapter's own voice.
- bar: met for the attributed form; the substance is exceptional and against rung-1 docs, so it cannot be stated as fact · independence: n/a · currency: Jan 2026
- counter: not run

### V-C-r2-criticism-09-1
- claim: C-r2-criticism-09
- source S-r2-criticism-02 · same transcript · quote-match: exact · passage at P11 cue 19:52.720-20:02.400: found verbatim
- implied: "I think here this was just a WSGI server one one trep I just enabled G event and it was able to get to 93% of a full ASGI implementation." Speaker adds it "monkey patches a lot of your IO to get to a similar performance". "One one trep" is garbled. The metric is not named in this passage (earlier benchmark text uses requests per second).
- verdict: partial · reason: 93% of a full ASGI implementation is stated. "Single-threaded" rests on the garbled "one one trep", and "throughput" is not said here. · narrower claim: "Ruben Hias reports that in his FOSDEM 2026 benchmark a WSGI server with Gevent enabled reached 93% of a full ASGI implementation's performance (the metric and thread count are not stated clearly in the machine transcript)."
- bar: below for "single-threaded" and "throughput"; met for the narrower claim · independence: n/a · currency: Jan 2026
- counter: not run

### V-C-r3-practice-05-1
- claim: C-r3-practice-05
- source S-r3-practice-01 · opened: https://docs.python.org/3.15/c-api/stable.html (curl) · quote-match: exact · passage at P3 § "Stable Application Binary Interfaces": found verbatim
- implied: "It is possible for an extension to be compiled for both abi3 and abi3t at the same time; the result will be compatible with both free-threaded and non-free-threaded builds of Python. Currently, this has no downsides compared to compiling for abi3t only."
- verdict: supported · reason: direct, "currently" kept.
- bar: met (rung 1) · independence: n/a · currency: 3.15.1 docs
- counter: not run

### V-C-r3-practice-06-1
- claim: C-r3-practice-06
- source S-r3-practice-01 · same page · quote-match: exact · passage at P5: found verbatim
- implied: "Python does not necessarily check that extensions it loads have compatible ABI. ... the user (or their packaging tool) is ultimately responsible for ensuring that ..." Authors are encouraged to add a Py_mod_abi / PyABIInfo_Check() check.
- verdict: supported · reason: direct.
- bar: met (rung 1) · independence: n/a · currency: 3.15.1 docs
- counter: not run

## Counter-evidence
none (no main claims in this batch)

## Leads
- none
