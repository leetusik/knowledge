# Verification: 20261023-0350-free-threaded-cpython · final-b6
- verifier: claude-sonnet-5-5 · date: 2026-10-23 · claims: 8 · supported 8 · partial 0 · contradicted 0 · not-addressed 0 · passage-not-found 0 · unreachable 0 · needs-rewrite 0
## Records
### V-C-r1-criticism-03-1
- claim: C-r1-criticism-03
- source S-r1-criticism-04 · opened: https://docs.python.org/3/library/threadsafety.html (curl, saved pages/final-b6/S-r1-criticism-04.txt) · quote-match: exact · passage at P2, P3, P15: found verbatim (lines 64, 70, 56)
- looked first: the page opens with "This page documents thread-safety guarantees for built-in types in Python's free-threaded build... apply when using Python with the GIL disabled". Its list section: "Reading a single element from a list is atomic: lst[i]"; "The following methods that only operate on a single element with no shifting required are atomic: lst.append(x) ... lst.pop()"; "Writing a single item via lst[i] = x is safe to call from multiple threads and will not corrupt the list."
- implied: lst[i] read atomic; lst.append(x) atomic; lst[i] = x from multiple threads does not corrupt the list; scope free-threaded/GIL disabled; page is the 3.15.1 docs.
- verdict: supported · reason: all three behaviours are stated on the page. The "append is atomic" sentence is the line just above the lst.append code line (P3 is only the code line); the sentence is on the page.
- bar: met (descriptive, rung 1 official docs) · independence: n/a · currency: page "3.15.1 Documentation", accessed 2026-10-23; no later version seen
- counter: none-found ("free-threaded Python list append dict operations not thread-safe documentation caveats", "Python thread safety guarantees built-in types free-threaded docs changed 3.15 issue")

### V-C-r1-criticism-04-1
- claim: C-r1-criticism-04
- source S-r1-criticism-04 · opened: same page · quote-match: exact · passage at P5, P6: found verbatim (lines 81, 90)
- looked first: the page repeats "Operations that involve multiple accesses, as well as iteration, are never atomic" in the list (line 81), dict (126) and set (182) sections, each with examples and a "Consider external synchronization when sharing ... instances across threads" closing line.
- implied: list/dict/set; read-modify-write examples (lst[i] = lst[i] + 1; d[key] = d[key] + 1) and check-then-act (if key in d: del d[key]) marked NOT atomic; iteration marked NOT thread-safe; external synchronization advised.
- verdict: supported · reason: each part is on the page. "Advises" is the page's "Consider external synchronization".
- bar: met (descriptive, rung 1) · independence: n/a · currency: 3.15.1 docs
- counter: none-found (same two queries as V-C-r1-criticism-03-1)

### V-C-r1-criticism-05-1
- claim: C-r1-criticism-05
- source S-r1-criticism-04 · opened: same page · quote-match: exact · passage at P7, P8: found verbatim (lines 93, 99)
- looked first: the dict section says "The following operations and functions are lock-free and atomic: d[key], d.get(key), key in d, len(d)". Then "Writing or removing a single item is safe to call from multiple threads and will not corrupt the dictionary: d[key] = value, del d[key], d.pop(key), d.popitem(), d.setdefault(key, v)". It also notes that __eq__ comparison of non-built-in keys may let another thread modify the dict.
- implied: the four reads are lock-free and atomic; the five single-item writes do not corrupt the dict.
- verdict: supported · reason: every operation named in the claim is listed. The __eq__ caveat is not in the claim, and the claim does not contradict it.
- bar: met (descriptive, rung 1) · independence: n/a · currency: 3.15.1 docs
- counter: none-found (same two queries)

### V-C-r1-criticism-06-1
- claim: C-r1-criticism-06
- source S-r1-criticism-04 · opened: same page · quote-match: exact · passage at P10, P11: found verbatim (lines 135, 143)
- looked first: after the dict "never atomic" examples, the page says "To avoid time-of-check to time-of-use (TOCTOU) issues, use atomic operations or handle exceptions: d.pop(key, None) ... or try: del d[key] except KeyError". Then "To safely iterate over a dictionary that may be modified by another thread, iterate over a copy: for key, value in d.copy().items()".
- implied: d.pop(key, None) or KeyError handling; iterate over d.copy().items() when another thread may modify the dict.
- verdict: supported · reason: both remedies are stated as advice.
- bar: met (rung 1) · independence: n/a · currency: 3.15.1 docs
- counter: none-found (same two queries)

### V-C-r1-foundations-12-1
- claim: C-r1-foundations-12
- source S-r1-foundations-01 · opened: https://peps.python.org/pep-0703/ (curl, saved pages/final-b6/S-r1-foundations-01.txt) · quote-match: exact · passage at P6: found verbatim (line 159, § "Reference Counting")
- looked first: the PEP section "Reference Counting" says "This PEP proposes a combination of three techniques ... The first is a switch from plain non-atomic reference counting to biased reference counting, which is a thread-safe reference counting technique with lower execution overhead than plain atomic reference counting. The other two techniques are immortalization and a limited form of deferred reference counting". Later sections detail each.
- implied: three techniques (biased RC, immortalization, limited deferred RC); biased RC is cheaper than atomic RC; the techniques make refcounting thread-safe while keeping overhead low.
- verdict: supported · reason: directly stated. The PEP "proposes"; the PEP status is Final, so "makes" is a fair reading. A chapter sentence should say "PEP 703 specifies" or "proposes", not state that the shipped build is identical.
- bar: met (descriptive, rung 1 spec) · independence: n/a · currency: PEP Final (3.13). Later versions may change details: the 3.14 HOWTO limits immortalization to code constants and sys.intern() strings (seen only in a search summary, not opened). The "three techniques" design statement is about the PEP, so it stands.
- counter: none-found ("free-threaded CPython biased reference counting problems replaced 3.14 reference counting changes")

### V-C-r2-practice-02-1
- claim: C-r2-practice-02
- source S-r2-practice-02 · opened: https://docs.python.org/3/library/asyncio-dev.html (curl) · quote-match: exact · passage at P1: found verbatim (line 55, § "Concurrency and Multithreading")
- source S-r2-practice-06 · opened: https://docs.python.org/3/library/asyncio-threading.html (curl) · quote-match: exact · passage at P3: found verbatim (line 33, § "asyncio and free-threaded Python")
- looked first: asyncio-dev says "An event loop runs in a thread ... and executes all callbacks and Tasks in its thread. While a Task is running in the event loop, no other Tasks can run in the same thread." The free-threaded page says "A single event loop on one core can handle many connections concurrently, but the Python code that runs to handle each one still executes serially", and recommends one loop per thread for parallelism.
- implied: one loop runs its callbacks and Tasks in its own thread, one Task at a time; Python code per connection is serial; this holds on the free-threaded page's framing.
- verdict: supported · reason: both pages state it. The free-threaded-build part rests on the asyncio-threading page, which is about free-threaded Python.
- bar: met (descriptive, rung 1) · independence: both are the same owner (PSF docs); that is fine for a rung-1 descriptive claim · currency: 3.15.1 docs (last updated 2026-10-22)
- counter: none-found ("asyncio free-threaded event loop per thread scaling limitations")

### V-C-r2-criticism-03-1
- claim: C-r2-criticism-03
- source S-r2-criticism-02 · opened: https://video.fosdem.org/2026/ua2220/ABJMWD-the_gil_and_api_performance_past_present_and_free-threaded_future.vtt (curl, saved as pages/final-b6/S-r2-criticism-02.txt) · quote-match: exact · passage at P5, P6: found by substance (ASR text at cue 18:20-19:01, lines 531-550). Wording: "run the unicorn if free trade mode mode and it gets very close to this line ... breaks through this barrier of in this case about 400 requests per second ... a gradient ... it's exactly on top of it so actually it matched the full free the full multi processing perfectly"
- looked first: the transcript's benchmark section (16:07-19:01) walks from GIL-bound Gunicorn gthread and Granian saturating at the same point, to multi-process scaling much further, to "does free trading actually follow this line", then free-threaded Gunicorn and Granian ("gradient"). Speaker names: the FOSDEM event page (archive.fosdem.org) lists the speaker as Ruben Hias; the transcript's own ASR renders it "Ruben Hiels".
- implied: speaker Ruben Hias; free-threaded Gunicorn breaks through about 400 RPS; it comes "very close" to the multi-process line; free-threaded Granian matches multi-process "perfectly". Mapping of ASR "junicorn"="Gunicorn", "gradient"="Granian", "free trade mode"="free-threaded" is an inference. The abstract on the FOSDEM page names Granian and free-threading, and the context fits.
- verdict: supported · reason: the content matches by substance. Caveats: ASR text, and "this line" is read as the multi-process line from the preceding cues (18:06-18:20). The claim already says "the only web-server measurement" is a single unreplicated one.
- bar: below (exceptional flag; one source, the speaker's own talk, and S-r1-cases-02 slides are the same speaker, so not independent; no absolute numbers except ~400 RPS; machine unnamed) · independence: single speaker/benchmark · currency: talk dated 31 Jan 2026; no later retraction found
- counter: none-found ("Granian free-threaded Python benchmark slower than GIL", "Gunicorn free-threaded Python gthread benchmark requests per second"). A Medium story (rung 3; seen only as a search excerpt, not opened) reports free-threaded Granian the slowest of six ASGI configurations on 3.15.0rc2, M2; see Leads.

### V-C-r1-cases-01-1
- claim: C-r1-cases-01
- source S-r1-cases-01 · opened: https://raw.githubusercontent.com/emmett-framework/granian/master/README.md (curl, saved pages/final-b6/S-r1-cases-01.txt) · quote-match: exact · passage at P2: found verbatim (line 561, § "Free-threaded Python")
- looked first: the README "Free-threaded Python" section opens with a warning "free-threaded Python support is still experimental and highly discouraged in production environments", then "Since version 2.0 Granian supports free-threaded Python. While the installation process remains the same, as wheels for the free-threaded version are published separately..."
- implied: support since 2.0; free-threaded wheels published separately.
- verdict: supported · reason: stated verbatim. The claim is about what the README states, which is the attributed form.
- bar: met (descriptive, vendor about itself, rung 1) · independence: n/a · currency: README on master fetched 2026-10-23. Release v2.8.0 notes (newreleases.io mirror of the GitHub release) say "Drop free-threaded Python 3.13 support" and add 3.15 support. That narrows which versions are supported, not whether Granian supports free-threaded Python.
- counter: none-found ("Granian free-threaded Python benchmark slower than GIL", "Granian 2.0 release free-threaded Python support notes")

## Counter-evidence
none-found for all eight claims; no counter-source entries. Queries run: "free-threaded Python list append dict operations not thread-safe documentation caveats"; "Python thread safety guarantees built-in types free-threaded docs changed 3.15 issue"; "free-threaded CPython biased reference counting problems replaced 3.14 reference counting changes"; "asyncio free-threaded event loop per thread scaling limitations"; "Granian free-threaded Python benchmark slower than GIL"; "Gunicorn free-threaded Python gthread benchmark requests per second"; "Granian free-threaded ASGI benchmark Medium Python 3.14t slowest configuration"; "Granian 2.0 release free-threaded Python support notes".

## Leads
- https://python.plainenglish.io/granian-hits-65-mib-on-free-threaded-python-3-15-while-uvicorn-and-hypercorn-fork-10-processes-5b76ee6a4eb8 — rung 3, member-only; search excerpt says free-threaded Granian was the slowest of six ASGI configurations (4,037-4,706 RPS, Python 3.15.0rc2, Apple M2, 8 workers). It is not opened and not counter-evidence. It tests a different setup from the FOSDEM talk and shows throughput near parity.
- https://newreleases.io/project/github/emmett-framework/granian/release/v2.8.0 — aggregator of Granian 2.8.0 release notes (opened, saved pages/final-b6/S-v6-01.txt): "Drop free-threaded Python 3.13 support"; "Fix a shared socket bug on free-threaded Python causing crashes on workers respawn". Rung 3; follow upstream to the GitHub release if the chapter needs the version limit.
