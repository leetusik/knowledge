# Findings: 20261023-0350-free-threaded-cpython · round 2 · angle criticism
- researcher: claude-opus-5-5 · status: partial (hard cap of 30 tool calls reached; Q20 independent measurement and Q24 crash-class issues not reached) · tool calls: 31

## Questions
- Q20: thin — claims: C-r2-criticism-01, -02, -03, -04, -05, -06, -07, -08, -09 — note: the FOSDEM 2026 recording's transcript (auto-generated VTT) clarifies the benchmark story: GIL-bound Gunicorn gthread, Granian and ASGI configurations saturate at about 400 RPS, free-threaded Gunicorn gets "very close" to the multi-process line and free-threaded Granian "matched" it; the speaker never names the baseline of "2.5x" beyond "in this case on this machine" (C-04). Still one speaker, no independent measurement found. Gunicorn's 2026 changelog (gunicorn.org/2026-news/, read via WebFetch) has no mention of free threading, GIL or 3.14t; Uvicorn's release notes for 0.47.0 to 0.54.0 (May–September 2026, read in full for that range) mention none either; neither is written as a claim (an absence, unquotable). Granian remains the only server with documented support (C-r1-cases-01, -02).
- Q24: thin — claims: C-r2-criticism-10, -11, -12, -13 — note: What's New in 3.15 (3.15.1 docs) confirms the 9 October 2026 release, a stable ABI for free-threaded builds (PEP 803) and macOS installers shipping free-threading support by default; its JIT section (read in full, lines 696–721) still calls the JIT "experimental" and says nothing about the free-threaded build either way, so "JIT unsupported on free-threaded" stays rung-1 only for 3.14 (C-r1-foundations-39). Crash classes and contention symptoms remain as in round 1 (C-r1-criticism-10, -22, -27, -28, D-05); CPython issues 126907/132713/133932 not opened (cap).

## Sources

### S-r2-criticism-01
- url: https://fosdem.org/2026/schedule/event/ABJMWD-the_gil_and_api_performance_past_present_and_free-threaded_future/ · canonical: archive.fosdem.org/2026/schedule/event/ABJMWD-the_gil_and_api_performance_past_present_and_free-threaded_future/
- title: The GIL and API Performance: Past, Present, and Free-Threaded Future · authors: Ruben Hias (speaker) · publisher: FOSDEM 2026
- date: talk Saturday 31 January 2026, 15:30–16:00 (UTC+1) · version: n/a
- accessed: 2026-10-23 · read-via: curl (301 to archive.fosdem.org, followed) · quote-match: exact · archive: none
- kind: other (conference schedule page) · peer-review: no
- owner: FOSDEM (volunteer-run conference); abstract by the speaker · upstream: none
- lateral: FOSDEM is a non-commercial volunteer conference; the page says "All content such as talks and biographies is the sole responsibility of the speaker." Links the slides, the video and a VTT subtitle file (S-r2-criticism-02).
- passages:
  - P1 · § "The GIL and API Performance: Past, Present, and Free-Threaded Future": "We'll investigate the often overlooked effect of freethreading on webservers. You’ll see how modern servers like Granian, ASGI frameworks, and WSGI stacks behave when threads are no longer serialized by the interpreter."
  - P2 · § "The GIL and API Performance: Past, Present, and Free-Threaded Future": "Room: UA2.220 (Guillissen)"

### S-r2-criticism-02
- url: https://video.fosdem.org/2026/ua2220/ABJMWD-the_gil_and_api_performance_past_present_and_free-threaded_future.vtt · canonical: video.fosdem.org/2026/ua2220/ABJMWD-the_gil_and_api_performance_past_present_and_free-threaded_future.vtt
- title: subtitle file (VTT) of the talk recording · authors: Ruben Hias (speaker); transcript machine-generated · publisher: FOSDEM video team
- date: talk 31 January 2026 · version: n/a
- accessed: 2026-10-23 · read-via: curl (plain-text VTT saved directly as .txt) · quote-match: exact · archive: none
- kind: other (talk transcript) · peer-review: no
- owner: FOSDEM (recording); content is the speaker's · upstream: the talk itself (speaker's own benchmarks)
- lateral: linked as "Video recording subtitle file (VTT)" from S-r2-criticism-01. The transcript is clearly automatic speech recognition: "junicorn"/"unicorn" = Gunicorn, "grainy"/"gradient" = Granian, "guild" = GIL, "threats" = threads, "free trade"/"free-treading" = free-threading. Quotes keep the ASR wording; the glossed reading is the researcher's and should be checked against the video if load-bearing. Same speaker and benchmark as S-r1-cases-02 (slides); not an independent source for it.
- passages:
  - P1 · cue 16:07.920–16:21.120: "so this is where we start this is the very baseline we see … junicorn with some G threats which is the basic trading implementation in junicorn"
  - P2 · cue 16:21.760–16:40.720: "initially we see that it can is basically increasing linearly until it clearly reaches some … saturation point if you compare that to grainy and we see basically the same characteristics"
  - P3 · cue 16:48.400–17:02.400: "it basically caps up caps at the exact same … point which is what the which is where you see you or like the guild gets saturated"
  - P4 · cue 17:57.120–18:06.960: "so once we add once we add our our workers we see that we can scale quite a lot"
  - P5 · cue 18:20.160–18:47.840: "first I tried it I run the unicorn … if free trade mode mode and it gets very close to this line the one thing you can clearly see … is that it breaks through this barrier of in this case about 400 requests per second which is where … the guild gives up or at least the guild becomes the main bottleneck of your API"
  - P6 · cue 18:47.840–19:01.200: "this to a gradient you might think oh there is a purple angle well it's exactly on top of it so … actually it matched the full free the full multi processing perfectly"
  - P7 · cue 21:07.920–21:21.520: "free dreading enable this linear scaling for example in this case on this machine … which is the 2.5x improvement at 32 threats"
  - P8 · cue 15:23.280–15:40.160: "some research usually most real production applications have around between a 70-30 or 90 … 10 split between IO waiting time and actual CPU work"
  - P9 · cue 22:09.680–22:24.080: "I know some libraries still have issues with it I think like … UV query for example like there are UV loop implementations still has some issues"
  - P10 · cue 26:20.240–26:44.880: "so the Python protects you in the Python codes the main issue is … if you're writing sea extensions like a numpy … but as long as you're writing pure Python you shouldn't need to care about this"
  - P11 · cue 19:52.720–20:02.400: "server one one trep I just enabled G event and it was able to get to 93% of a full ASGI implementation"

### S-r2-criticism-05
- url: https://docs.python.org/3.15/whatsnew/3.15.html · canonical: docs.python.org/3.15/whatsnew/3.15.html
- title: What’s new in Python 3.15 · authors: Editor: Hugo van Kemenade · publisher: Python Software Foundation (docs.python.org)
- date: n/a (page states release 9 October 2026) · version: Python 3.15.1 documentation
- accessed: 2026-10-23 · read-via: curl · quote-match: exact · archive: none
- kind: official docs (release notes) · peer-review: n/a
- owner: Python Software Foundation / CPython core developers · upstream: none
- lateral: official release notes; trusted source for this run.
- passages:
  - P1 · § "What’s new in Python 3.15¶": "Python 3.15 was released on 9 October 2026."
  - P2 · § "Summary – Release highlights¶": "PEP 803, 820, 793: Stable ABI for free-threaded builds and related C API"
  - P3 · § "Summary – Release highlights¶": "The official macOS binaries now install free-threading support by default"
  - P4 · § "Summary – Release highlights¶": "The experimental JIT compiler has been significantly upgraded"
  - P5 · § "Upgraded experimental JIT compiler¶": "Results from the pyperformance benchmark suite report a 7-8% geometric mean performance improvement for the JIT over the standard CPython interpreter built with all optimizations enabled on x86-64 Linux."

## Claims

### C-r2-criticism-01
- claim: In the recording of his FOSDEM 2026 talk, Ruben Hias calls Gunicorn with gthread workers "the very baseline" of his mixed-workload API benchmark.
- kind: fact · questions: Q20 · load-bearing: yes (identifies the starting configuration the 2.5x is read against)
- support: S-r2-criticism-02/P1 · rung 1 · fit direct · upstream self
- scope: FOSDEM 2026 talk, machine-generated transcript ("junicorn" = Gunicorn, "G threats" = gthreads)
- confidence: medium (ASR wording) · flags: none
- conflicts: none

### C-r2-criticism-02
- claim: In the FOSDEM 2026 talk recording, Ruben Hias says that in his mixed-workload benchmark on the GIL-enabled build, Gunicorn gthread, Granian and an ASGI framework all rise roughly linearly and then saturate at the same point, which he attributes to the GIL.
- kind: behaviour · questions: Q20 · load-bearing: yes (why threads on the GIL build hit a ceiling for a web API)
- support: S-r2-criticism-02/P2 · rung 1 · fit direct · upstream self
- support: S-r2-criticism-02/P3 · rung 1 · fit direct · upstream self
- scope: one speaker's benchmark, Python 3.14 vs 3.14t, 80% I/O / 20% CPU simulated API, 1–32 threads/workers; transcript wording
- confidence: medium · flags: none
- conflicts: none

### C-r2-criticism-03
- claim: In the FOSDEM 2026 talk recording, Ruben Hias says that free-threaded Gunicorn broke through a GIL ceiling of about 400 requests per second in his benchmark and came "very close" to the multi-process line, and that free-threaded Granian matched the multi-process results.
- kind: number · questions: Q20 · load-bearing: yes (the only web-server measurement on the free-threaded build)
- support: S-r2-criticism-02/P5 · rung 1 · fit direct · upstream self
- support: S-r2-criticism-02/P6 · rung 1 · fit direct · upstream self
- support: S-r2-criticism-02/P4 · rung 1 · fit partial · upstream self (multi-process scales further than GIL threads)
- scope: one speaker's own benchmark on one unnamed machine; absolute numbers other than ~400 RPS not stated in the transcript; not independently reproduced
- confidence: low (single unreplicated measurement, ASR text) · flags: exceptional
- conflicts: none at rung 1–2 (round 1's Medium lead reporting free-threaded Granian slowest of six ASGI configurations is rung 3, unopened)

### C-r2-criticism-04
- claim: In the FOSDEM 2026 talk recording, Ruben Hias presents the "2.5x improvement at 32 threads" as holding "in this case on this machine" and does not name the configuration it is measured against.
- kind: fact · questions: Q20 · load-bearing: yes (answers the open baseline question for C-r1-cases-07: the baseline is not stated; context suggests the GIL-saturated threaded servers, but that is the researcher's reading, not the speaker's words)
- support: S-r2-criticism-02/P7 · rung 1 · fit direct · upstream self
- support: S-r2-criticism-02/P5 · rung 1 · fit partial · upstream self (the ~400 RPS GIL ceiling is the only reference level named)
- scope: FOSDEM 2026 talk; transcript and slides (S-r1-cases-02/P6) both lack an explicit baseline
- confidence: medium · flags: none
- conflicts: none

### C-r2-criticism-05
- claim: Ruben Hias says in the FOSDEM 2026 talk that he based the 80/20 I/O-to-CPU mix of his benchmark on research suggesting most production applications have between a 70-30 and a 90-10 split between I/O waiting time and CPU work.
- kind: fact · questions: Q20 · load-bearing: no (workload assumption behind the benchmark)
- support: S-r2-criticism-02/P8 · rung 1 · fit direct · upstream self (the research is not named)
- scope: speaker's statement; the cited research is unidentified
- confidence: medium · flags: none
- conflicts: none

### C-r2-criticism-06
- claim: The FOSDEM 2026 talk abstract says the talk examines how Granian, ASGI frameworks and WSGI stacks behave when threads are no longer serialized by the interpreter.
- kind: fact · questions: Q20 · load-bearing: no (scope of the talk)
- support: S-r2-criticism-01/P1 · rung 1 · fit direct · upstream self
- scope: FOSDEM 2026 schedule page
- confidence: high · flags: none
- conflicts: none

### C-r2-criticism-07
- claim: Ruben Hias says in the FOSDEM 2026 talk that some libraries still have issues with free threading, naming uvloop implementations as an example.
- kind: fact · questions: Q20, Q24 · load-bearing: no (one practitioner's report of an ASGI-relevant dependency gap)
- support: S-r2-criticism-02/P9 · rung 1 · fit direct · upstream self
- scope: January 2026, Python 3.14t; ASR renders uvloop as "UV loop"; not verified against uvloop's own tracker
- confidence: low · flags: none
- conflicts: none

### C-r2-criticism-08
- claim: Answering a question at FOSDEM 2026, Ruben Hias said the main race-condition concern under free threading is for authors of C extensions and that developers writing pure Python "shouldn't need to care about this".
- kind: evaluation · questions: Q20, Q24 · load-bearing: no (attributed view; conflicts with CPython and guide sources, see Conflicts)
- support: S-r2-criticism-02/P10 · rung 1 · fit direct · upstream self
- scope: Q&A at FOSDEM 2026; attributed form only
- confidence: medium (that he said it) · flags: exceptional (contradicts rung-1 docs on pure-Python races)
- conflicts: S-r1-criticism-02/P1 "It does not protect you from introducing thread safety issues due to race conditions."; S-r1-criticism-04/P5 "Operations that involve multiple accesses, as well as iteration, are never atomic."

### C-r2-criticism-09
- claim: Ruben Hias reports that in his FOSDEM 2026 benchmark a single-threaded WSGI server with Gevent enabled reached 93% of a full ASGI implementation's throughput.
- kind: number · questions: Q20 · load-bearing: no (alternative to free threading for I/O-heavy WSGI)
- support: S-r2-criticism-02/P11 · rung 1 · fit direct · upstream self
- scope: one speaker's benchmark; configuration details not stated
- confidence: low · flags: none
- conflicts: none

### C-r2-criticism-10
- claim: Python 3.15 was released on 9 October 2026.
- kind: date · questions: Q24 · load-bearing: yes (dates "today's" maturity)
- support: S-r2-criticism-05/P1 · rung 1 · fit direct · upstream self
- scope: What's New in Python 3.15, 3.15.1 docs
- confidence: high · flags: none
- conflicts: none

### C-r2-criticism-11
- claim: The Python 3.15 release highlights list a stable ABI for free-threaded builds (PEP 803, with PEP 820 and PEP 793 for related C API).
- kind: fact · questions: Q24 · load-bearing: yes (maturity marker for extension support)
- support: S-r2-criticism-05/P2 · rung 1 · fit direct · upstream self
- scope: Python 3.15
- confidence: high · flags: none
- conflicts: none

### C-r2-criticism-12
- claim: According to the Python 3.15 release notes, the official macOS binaries for 3.15 install free-threading support by default.
- kind: fact · questions: Q24 · load-bearing: no (availability; overlaps practice angle)
- support: S-r2-criticism-05/P3 · rung 1 · fit direct · upstream self
- scope: Python 3.15, official macOS installers
- confidence: high · flags: none
- conflicts: none

### C-r2-criticism-13
- claim: The Python 3.15 release notes still describe the JIT compiler as experimental, reporting a 7-8% geometric-mean pyperformance improvement over the standard interpreter on x86-64 Linux, and the JIT section does not mention the free-threaded build.
- kind: fact · questions: Q24 · load-bearing: yes (whether "JIT unsupported on free-threaded" can be stated for 3.15: it cannot, from this page; C-r1-foundations-39 covers 3.14 only)
- support: S-r2-criticism-05/P4 · rung 1 · fit direct · upstream self
- support: S-r2-criticism-05/P5 · rung 1 · fit direct · upstream self
- scope: Python 3.15 What's New, JIT section lines 696–721 of the saved text; the absence statement is the researcher's reading of that whole section
- confidence: medium (absence claim) · flags: none
- conflicts: none

## Conflicts
- C-r2-criticism-08: S-r2-criticism-02/P10 (speaker at FOSDEM 2026) says "as long as you're writing pure Python you shouldn't need to care about this"; S-r1-criticism-02/P1 (porting guide) says the interpreter "does not protect you from introducing thread safety issues due to race conditions", and S-r1-criticism-04/P5 (CPython docs) says multi-access operations "are never atomic". Nature: factual/scope; not settled.

## Speculation and flags
- C-r2-criticism-03: exceptional; a single speaker's unreplicated benchmark on one machine, from a machine-generated transcript.
- C-r2-criticism-04: the baseline of "2.5x" is not stated by the speaker; any reading of it (for example "vs. GIL-bound threads at ~400 RPS") is interpretation.
- S-r2-criticism-02: ASR transcript; misrecognised names (Gunicorn, Granian, GIL, threads) are glossed by the researcher in claims.
- C-r2-criticism-08: exceptional; contradicts official docs.

## Unused leads
- https://video.fosdem.org/2026/ua2220/ABJMWD-the_gil_and_api_performance_past_present_and_free-threaded_future.mp4 — the video would show the chart axes and the RPS values behind 2.5x; not watched.
- https://github.com/benoitc/gunicorn/pull/3440 — gthread lock-free refactor PR (January 2026); does not state free-threading as its aim per search snippet; unopened.
- https://gunicorn.org/2026-news/ — Gunicorn 2026 changelog; WebFetch found no mention of free threading, GIL or 3.14t (absence only, not a claim).
- https://raw.githubusercontent.com/Kludex/uvicorn/main/docs/release-notes.md — Uvicorn release notes; no free-threading mention in 0.47.0–0.54.0 (lines 1–140 read); older entries unread (Uvicorn 0.38.0 added Python 3.14 support per a search snippet).
- https://github.com/python/cpython/issues/126907, /132713, /133932 — crash-report leads from round 1, still unopened.
- https://docs.python.org/3/howto/free-threading-python.html — saved as S-r1-criticism-01; a "Known limitations"/single-threaded-performance section may hold 3.15 JIT status; not re-read.

## Queries
- "FOSDEM 2026 Ruben Hias GIL API performance benchmark repository" → useful (led to event page and VTT)
- "uvicorn free-threaded Python 3.14t support changelog" → nothing new
- "gunicorn changelog free-threading python 3.14" → nothing new
- "gunicorn \"free-threaded\" gthread worker 2026 release notes" → useful (2026 changelog URL; no free-threading entry)
