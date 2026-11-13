# Trace: 20261023-0350-free-threaded-cpython (body.md, D7 2026-10-23)
(every checkable sentence → a claim id; exempt lines marked framing / own term / example / analogy / arithmetic)

## (lede, before Background)
- ¶1 s1: C-r1-foundations-01 (GIL prevents parallel Python), C-r2-evidence-11 (free-threaded: true parallel execution)
- ¶1 s2–s3: framing (reader and purpose)

## background
- SKIP callout s1: own term (thread) · s2 (processes do not share address spaces, data copied): C-r2-evidence-12 (Wouters, attributed); "a CPython core developer": C-r1-cases-13 (LWN's description) · s3: own term (race condition)
### the-gil
- ¶1 s1: C-r1-foundations-01 · s2: C-r1-foundations-01 (consequence, framing)
- ¶2 s1 (bold): C-r2-evidence-09 · s2: C-r2-evidence-09 · s3: C-r2-evidence-10
### plan
- ¶1 s1: C-r1-foundations-30 · s2: C-r1-foundations-02
- ¶2 s1: C-r1-foundations-31 · s2: C-r1-foundations-32
- ¶3 s1: C-r1-practice-01 · s2: C-r1-foundations-33 · s3: C-r1-foundations-35, C-r1-foundations-36 · s4: C-r1-practice-05
- diagram timeline-phases: marks C-r1-foundations-31 (Jul 2023), C-r1-foundations-30 (resolution 24 Oct 2023), C-r1-foundations-35 (15 Jun 2025); 3.13 Oct 2024: C-r2-evidence-04 (its passage P3, "released in October 2024"); 3.14 Oct 2025: C-r2-evidence-03 (its passage P1, "For 3.14, from October 2025"); 3.15 9 Oct 2026: C-r1-practice-05; phase bars: C-r1-practice-01, C-r1-foundations-33, C-r1-foundations-36; caption "Phase III undecided": C-r1-foundations-40; mark positions as decimal years: arithmetic
- ¶4 s1: framing · s2: C-r1-foundations-40 · s3: C-r1-foundations-41
- callout (collapsed) ¶1: C-r1-foundations-38 (narrower wording) · ¶2 s1: framing · s2: C-r1-foundations-43 (attributed sketch) · s3: C-r1-foundations-44 · s4: C-r1-cases-13 (attributed, "suspects")

## intuition
- ¶1: framing
- code block "toy": example (the chapter's own illustration)
- ¶2 s1: C-r2-evidence-10 · s2: C-r2-evidence-11
- ¶3 s1: framing · s2: C-r1-evidence-15 · s3: C-r1-evidence-15 scope (3.13 beta 1, 2024); pointer to #today: framing
- chart shaw-bench: C-r1-evidence-15 (all four values, conditions); caption "about three times faster": arithmetic (2.41/0.75); "as reported by LWN": S-r1-evidence-08
- ¶4 s1 (bold): C-r1-criticism-14, C-r1-criticism-11 · s2: C-r1-criticism-14 · s3: C-r1-criticism-11 · s4: C-r1-foundations-09 (narrower, attributed to PEP 703)
- IMPORTANT callout s1: framing summary of C-r1-foundations-08, C-r1-criticism-11 · s2: C-r1-foundations-08, C-r1-criticism-11

## how-it-works
- ¶1 s1: framing · s2: C-r1-foundations-11 · s3: framing · s4: framing (PEP 703 = 2023 design, C-r1-foundations-30; HOWTO = shipped build)
### refcounts
- ¶1: C-r1-foundations-12 ("proposes")
- bullet 1: C-r1-foundations-13 · bullet 2: C-r1-foundations-15 · bullet 3: C-r1-foundations-17 (examples "top-level functions and modules" from its passage S-r1-foundations-01/P11)
### containers
- ¶1: C-r1-foundations-20
- ¶2 s1: C-r1-foundations-22 · s2: C-r1-foundations-23
- ¶3 s1: framing · s2: C-r1-foundations-24 · s3: C-r1-foundations-25
### interpreter
- ¶1 s1: C-r1-foundations-27 · s2: C-r1-foundations-26 · s3: C-r1-foundations-28
- diagram safety-stack: "your code / your locks": C-r1-criticism-11, C-r1-foundations-08; built-in containers: C-r1-foundations-22, -23, -24, -25; object lifetime: C-r1-foundations-13, -15, -17; memory: C-r1-foundations-20; threads: C-r1-foundations-11; caption: framing

## today
### status
- ¶1 s1: C-r1-foundations-36 · s2: C-r1-foundations-37 · s3: C-r2-criticism-11, C-r1-practice-06 · s4: C-r1-practice-06 scope ("does not say the free-threaded interpreter becomes the default python")
### costs
- ¶1 s1 (bold): framing for D-01 (recommendation from C-r2-evidence-01 "depends on the workload and hardware") · s2: D-01 (open), C-r2-evidence-01 ("prints no measurement date")
- table row 1: C-r1-evidence-01 · row 2: C-r2-evidence-04 (D-08) · row 3: C-r1-evidence-03 · row 4: C-r1-evidence-05 (narrower: reported ~10%, ~3% macOS) · row 5: C-r2-evidence-03 · row 6: C-r1-evidence-04, C-r2-evidence-01
- ¶2 s1: citation sentence for the rows (framing) · s2: arithmetic over the 3.14+ rows; "none of them is your workload": framing (C-r2-evidence-01 "depends on the workload")
- ¶3 s1: framing · s2: C-r1-evidence-06 (narrower: reported 15–20%, proposed 20%) · s2 second half: C-v4-01 · s3: C-r1-criticism-24 · s4: C-r2-evidence-18
### gains
- ¶1 s1 (bold): C-r2-evidence-17, C-r2-evidence-10 · s2: C-r2-evidence-17 · s3: C-r2-evidence-09 (inference: the GIL is released during I/O; only the Python work between waits was serialized, C-r1-foundations-01)
- ¶2: gap G-r1-04 stated (gaps/final.md disposition); "from a 2024 pre-release": C-r1-evidence-15 scope
- callout (collapsed) ¶ s1: C-r1-cases-10 (conditions; vendor-about-itself, "measured by its own authors") · s2: C-r1-cases-10 · s3: C-r1-cases-11
### web
- ¶1 s1 (bold): G-r1-03 (stated, thin) · s2: C-r1-cases-01 (only documented server: Q13/Q20 notes, C-r2-criticism-04 absence check; findings r2-criticism Q20 note on Gunicorn and Uvicorn changelogs) · s3: C-r1-cases-01, C-r1-cases-02 · s4: C-r1-cases-03 · s5: C-r1-cases-05, C-r1-cases-04
- ¶2 s1: gap G-r1-03 stated (verbatim disposition) · s2: C-r1-cases-06 · s3: C-r2-criticism-02 (narrower wording) · s4: C-r2-criticism-03 (attributed form only)
### packages
- ¶1 s1: C-r1-evidence-10 · s2: C-r1-evidence-11 (incl. "wheel exists, not tested") · s3: C-r1-evidence-12 (protobuf omitted per the verifier's note) · s4: C-r1-evidence-13 (incl. projected-release warning)
### rough-edges
- ¶1 s1: framing · s2: C-r1-foundations-39 · s2 second half: C-r2-criticism-13, gap G-r1-07 stated ("say nothing either way") · s3: C-r1-criticism-10 (D-04 resolved-by-scope, both editions)
- ¶2 s1: D-05 (open) framing · s2: C-r1-criticism-22 (HOWTO side) and S-r1-criticism-06/P1 (D-05 side A, the debugging guide; attributed) · s3: recommendation from D-05 (framing: both sides given)
### decision
- table row 1: C-r2-evidence-10, C-r2-evidence-11, C-r2-evidence-17 · row 2: C-r2-evidence-09 · row 3: C-r2-evidence-07 · row 4: C-r1-cases-02 · row 5: C-r1-evidence-03 (5–10%), C-r1-evidence-06 (15–20%, narrower: "reported")

## trying-it
### install
- ¶1 s1: framing · s2: C-r1-practice-11 · s3: C-r1-practice-12 (narrower: "lists commands … including")
- code block: C-r1-practice-12 (the four commands verbatim from the guide)
- ¶2 s1: C-r1-practice-07 · s2: C-r1-practice-08 (attributed to the guide) · s3: D-03 (open; both sides attributed: S-r1-practice-04/P4 label, C-r1-foundations-36) · s3 last clause: C-r1-practice-06 · s4: C-r1-practice-09 · s5: C-r1-foundations-02 (current docs: --disable-gil)
- ¶3: C-r1-practice-10 (attributed to the guide)
### check
- ¶1 s1: framing (reason: C-r1-foundations-06) · s2: C-r1-foundations-07
- code block check_ft.py: C-r1-foundations-07 (each comment)
- ¶2: C-r1-foundations-06 (gaps/r3 caution: check after imports)
### control
- ¶1: C-r3-practice-09
- ¶2 s1: framing · s2: C-r3-practice-15 (contested, D-09: both sides attributed; no "disabled by default") · s3: C-r1-foundations-07 (what the function reports)
- checklist 1: C-r1-practice-12 (uv venv), C-r1-practice-09 (why separate) · 2: C-r1-foundations-07 · 3: C-r1-foundations-07, C-r1-foundations-06 · 4: C-r3-practice-07 (RuntimeWarning), framing

## dependencies
- ¶1 s1 (bold): C-r1-evidence-10, C-r1-practice-18 · s2: C-r1-evidence-10 · s3: C-r1-practice-18; cp313t: C-r1-evidence-10, C-r1-foundations-03
### at-install
- ¶1 s1: C-r3-practice-01 · s1 second half: C-r3-practice-02 · s2: inference from C-r3-practice-01, -02 (routine) · s3: C-r3-practice-12 (narrower wording, both pages)
- ¶2: C-r3-practice-13
### at-import
- ¶1 s1 (bold): C-r1-foundations-06, C-r3-practice-07 · s2: C-r1-foundations-06 · s3: C-r3-practice-07
- code block (warning text): C-r3-practice-07 (the literal, pieces joined; %U = module_name)
- ¶2 s1: C-r1-practice-17 · s2: C-r3-practice-10 (attributed), C-r2-evidence-08 (attributed, Wouters)
- diagram install-flow: install → wheel?: C-r3-practice-01, -02, C-r1-practice-18 (t tag); no → build from source, needs a compiler: C-r3-practice-02, C-r3-practice-12; import → declares Py_mod_gil?: C-r1-practice-17; no → GIL enabled + RuntimeWarning: C-r1-foundations-06, C-r3-practice-07; yes → GIL stays off: C-r1-practice-17, C-r1-foundations-06
### abi
- ¶1 s1: C-r1-practice-20 · s2: C-r2-practice-18 (attributed to the guide) · s2 second half: C-r2-practice-14 (scoped "before abi3t")
- ¶2 s1: C-r1-practice-19 · s2: C-r3-practice-04 · s3: C-r3-practice-03 (filenames "on some platforms"; not cited for installers) · s4: C-r2-practice-16 · s5: C-r2-practice-19
- callout (collapsed) s1: C-r1-practice-20 / S-r1-practice-03/P7 (the HOWTO sentence) · s2: D-02 resolved-by-scope (C-r2-practice-18, C-r1-practice-19, C-r3-practice-04)
### workarounds
- ¶1 s1: C-r3-practice-14 (attributed) · s2: C-r2-practice-20 (attributed) · s3: C-r2-criticism-07 (attributed, hedged "I think")
- checklist 1: C-r1-evidence-10, C-r1-evidence-13 · 2: C-r3-practice-13 · 3: C-r3-practice-07, C-r1-foundations-07 · 4: C-r3-practice-14, C-r3-practice-10, C-r2-evidence-08

## your-code
### threads
- ¶1 s1 (bold): C-r1-foundations-08, C-r1-criticism-04, C-r1-criticism-12 · s2: C-r1-foundations-08 · s3: framing (lead-in), S-r1-criticism-04/P1 ("apply when … the GIL disabled")
- bullet Safe: C-r1-criticism-03, C-r1-criticism-05 · Never atomic: C-r1-criticism-04 · Instead: C-r1-criticism-06 · A surprise: C-r1-criticism-09
- ¶2 s1: framing (summary of s2–s4) · s2: C-r1-criticism-12 · s3: C-r1-criticism-13 (guide part, S-r1-criticism-02/P2) · s4: C-r1-criticism-13 (Wouters part, S-r1-criticism-09/P2)
- ¶3 s1: C-r1-criticism-15 (attributed, "most common") · s2: C-r1-criticism-16
- code block cache-with-lock: example of C-r1-criticism-16's lock remedy for C-r1-criticism-15's race
- ¶4 s1: C-r1-criticism-16 (recursive Lock deadlock) · s2: C-r2-practice-21 (attributed to the guide)
- callout (collapsed) s1: framing · s2: C-r2-criticism-08 (attributed, D-06 side A) · s3: C-r1-criticism-04, C-r1-criticism-11 (D-06 side B) · s4: D-06 prominence (the docs and the guide take side B)
### asyncio
- ¶1 s1 (bold): C-r2-practice-02 · s2: C-r2-practice-02 · s3: C-r2-practice-01 (attributed to the docs)
- ¶2 s1: C-r2-practice-03 · s2: C-r1-practice-22 (attributed; "no independent measurement found")
- code block loop-per-thread: example after C-r2-practice-03 (each thread starts its own loop with asyncio.run)
- diagram loop-per-thread: own loop per thread: C-r2-practice-03, C-r2-practice-07; queue.Queue between a plain thread and a loop: C-r2-practice-08; run_coroutine_threadsafe: C-r2-practice-07
- ¶3 s1: framing · s2: C-r2-practice-07 · s3: C-r2-practice-08 · s4: C-r2-practice-09, D-07 resolved-by-scope (C-r2-practice-01 vs C-r2-practice-09) · s5: C-r2-practice-10
- ¶4 s1: framing · s2: C-r2-practice-04 · s3: C-r2-practice-05 (incl. "no measured speedup")
### processes
- ¶1 s1 (bold): framing summary of C-r1-evidence-17 and C-r2-evidence-13, C-r2-evidence-14 (attributed to the two speakers) · s2: C-r1-evidence-17 (narrower, attributed) · s3: C-r2-evidence-13 (narrower, attributed)
- ¶2 s1: framing · s2: C-r1-cases-22 · s2 second clause: C-r1-evidence-16 (narrower, attributed) · s2 third clause: C-r2-evidence-12 (attributed)
- ¶3 s1: framing · s2: C-r2-evidence-14 (attributed) · s3: framing conclusion from C-r2-evidence-14
- callout (collapsed) s1: C-r1-cases-16 · s2: C-r1-cases-18 · s3: C-r1-cases-20 (narrower wording)
- checklist 1: C-r1-criticism-15, C-r1-criticism-16 · 2: C-r1-criticism-06, C-r1-criticism-04 · 3: C-r1-criticism-10 · 4: C-r2-practice-03, C-r2-practice-07, C-r2-practice-08 · 5: C-r1-evidence-17, C-r2-evidence-14 (advice), C-r1-cases-22 (picklable)

## next-steps
- ¶1 s1: C-r1-foundations-08 · s1 second half: C-r1-criticism-16 · s2: C-r1-criticism-11
- ¶2 s1: C-r3-practice-07 (the default enables the GIL and warns) · s2: C-r1-cases-04 · s3: framing summary of C-r3-practice-07 and C-r1-cases-04
- ¶3 s1 (bold): framing · s1: C-r1-criticism-35 · s2: C-r1-criticism-37 · s3: C-r1-criticism-40 · s4: C-r1-criticism-36
- code block: line 1 C-r1-criticism-38 (README usage, verbatim) · line 2 C-r1-criticism-40 (the guide's command, verbatim, S-r1-criticism-06/P3)
- ¶4: C-r1-criticism-38 (flags), C-r1-criticism-40
- next step 1: C-r1-practice-12, C-r1-foundations-07 · 2: C-r1-evidence-10, C-r1-evidence-13, C-r3-practice-13 · 3: C-r1-criticism-37, C-r1-criticism-40 · 4: gap G-r1-04 stated

## quiz
- q-loop key b: C-r2-practice-02 · explain: C-r2-practice-02, C-r2-practice-03 · distractors a, c, d: exempt
- q-atomic key a, b: C-r1-criticism-03 (append), C-r1-criticism-05 (single-item write) · distractors c, d: C-r1-criticism-04 (never atomic) · explain: C-r1-criticism-03, -05, -04, -06, C-r1-foundations-08 (lock)
- q-import key b: C-r3-practice-07, C-r1-foundations-06 · explain: C-r3-practice-07 (override "at your own risk")
- q-io answer: C-r2-evidence-09, C-r1-foundations-01
- q-abi blanks: C-r3-practice-03 (abi3t only), C-r3-practice-04 (abi3 for non-free-threaded) · explain: C-r3-practice-04, C-r2-practice-16, C-r3-practice-05
- q-check answer: C-r1-foundations-06, C-r1-foundations-07

## Revision after critique.md (one revision)
- plan ¶4 s2: now also cites What's New 3.14 → C-r1-foundations-40 (support S-r1-foundations-06/P3) (C01)
- decision row 2: C-r2-evidence-09, C-r1-foundations-01 (only the Python between waits is serialized); pointer to #web: framing (C02) · row 3: C-r3-practice-01 (source build), C-r2-evidence-07 (re-enable at import) (C12)
- processes ¶1 s1 (bold): recommendation from C-r1-evidence-17, C-r2-evidence-13, C-r2-evidence-14 · s2: framing (each speaker's comparison stated in s3–s4) · s3: C-r1-evidence-17 narrower ("a better choice than subinterpreters") (C03)
- timeline: phase II bar now "Phase II starts: 3.14", ends at the 3.15 mark; 3.15 is a mark only; "Steering Council" spelled out (C04, C05)
- intuition ¶4 s2: guide described as community-maintained, by Quansight Labs and open-source contributors (S-r1-criticism-02 source entry: authors, owner) · IMPORTANT callout: "CPython's own free-threading HOWTO" (C05)
- costs ¶1 s3: own term (pyperformance as a benchmark suite, from the passages' "pyperformance benchmark suite") · memory: "geometric mean, a kind of average": own term (C06)
- install ¶1 s1: framing ("One route is uv"), the ranking removed (C08) · install ¶2 split into a list: same claims as before (C-r1-practice-07, C-r1-foundations-02, C-r1-practice-08, D-03, C-r1-practice-06, C-r1-practice-09) (C07)
- web, abi, asyncio, next-steps paragraphs split; sentences and their claims unchanged; asyncio "almost all … not thread safe": C-r2-practice-09, D-07 (C07, C11)
- costs ¶2: citations moved to the end of the sentence (C11)
- install-flow node "Wheel for this interpreter? (a t tag, or abi3t on 3.15)": C-r1-practice-18, C-r2-practice-16, C-r3-practice-03 (C13)
- threads cache example: sentence on the lock held during the fill: mechanism of mutual exclusion, framing for the chapter's own example (C14)
- q-loop distractors rewritten (exempt) (C09) · q-atomic: options from the reader's own code; key a (append, C-r1-criticism-03), b (single write, C-r1-criticism-05); c read-then-write and d iteration: C-r1-criticism-04; explain: C-r1-criticism-03, -05, -04, -06 (C09) · q-import now on 3.15, matching C-r3-practice-07's 3.15 branch (C10)

## sources block
- every item is a library.md source the chapter cites; ids are library ids lowercased; titles, dates and URLs from the source entries (S-v4-04 is the same page as S-r1-foundations-07, cited by that id)
