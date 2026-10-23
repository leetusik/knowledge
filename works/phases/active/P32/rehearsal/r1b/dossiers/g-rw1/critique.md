# Critique: 20261023-0350-free-threaded-cpython

- kind: document · slice: none
- draft: body.md (dossier root)
- verdict: revise
- confidence: medium
- must_fix: 3 (facts 1, citations 1, ledger 1, coverage 0, diagrams 0, quiz 0, order 0, reader 0, clarity 0, rules 0)
- should_fix: 7
- notes: 5
- critic_model: claude-sonnet-5-5 · writer_model: not given in the dispatch text available to me (see Not seen)
- checked: about 37 sources read (from the dossier's cached converted pages; my own re-fetches of the same URLs returned HTTP 200 but were not diffed against them), 6 code/text claims grepped (import.c warning text and `RuntimeWarning`, tag recognition in the stable-ABI page, flags in the cmdline page, `--only-binary`, Tensogram figures, `queue.Queue` advice), 6 quiz items answered
- ledger: about 45 sentences spot-checked against passages, 1 untraceable (C08), about 37 sources re-opened (not every ledger id was re-walked; the rest of the trace was read but not re-verified)
- coverage: 21/21 load-bearing questions answered or declared (per gaps/final.md); must-cover 6/6
- skill: plugin/skills/explain/SKILL.md (read §4 to §4.6 and B5/B8/B9)
- open_items: C01, C02, C03, C04, C05, C06, C07, C08, C09, C10

## Findings

### C01 · must-fix · citations
- where: #plan (the "Whether and when phase III comes is open" paragraph) · line 48
- finding: the sentence credits the 3.14 release notes with saying phase III is undecided, but its only citation is the Steering Council post, and the 3.14 notes do not say it in the sections I read.
- evidence: draft: "The Steering Council's acceptance and the 3.14 release notes both say the move to free threading as the default or sole build is still undecided and depends on many factors in CPython and the community ([SC acceptance](#s-r1-foundations-07))". The SC post says: "any decision to transition to Phase III, with free-threading as the default or sole build of Python is still undecided, and dependent on many factors both within CPython itself and the community". What's New 3.14, "Free-threaded Python is officially supported" (page lines 1443-1446), says only: "This is the start of phase II where free-threaded Python is officially supported but still optional", and the "Free-threaded mode improvements" section (lines 310-314) is about performance and flags. Caveat: I read those two sections and grepped the page for "free-threaded"; I did not grep the whole page for "phase III".
- fix: attribute "undecided" to the SC post only, and say the 3.14 notes call the build "supported but still optional".
- confidence: medium

### C02 · must-fix · facts
- where: #decision, row 2 ("Your service mostly waits on the network or a database | Little to gain") · line 200 (against #web, line 183)
- finding: the decision table tells an I/O-heavy service it has "little to gain", but the only measurement the chapter itself reports is an 80% I/O, 20% CPU API where the GIL was the saturation point and free-threaded Gunicorn broke through it.
- evidence: draft line 183: "Ruben Hias ... tested an API with 80% I/O and 20% CPU work ... he attributes the saturation to the GIL ... He says free-threaded Gunicorn broke through that ceiling of about 400 requests per second ... and that free-threaded Granian matched it". Transcript (dossier page for S-r2-criticism-02): "it breaks through this barrier of in this case about 400 requests per second" and "it matched the full free the full multi processing perfectly". Row 2 cites only the glossary ("the GIL is always released when doing I/O"). The verdict is an evaluation in the chapter's own voice. The glossary fact supports only "I/O waits already overlap", not "little to gain" for a service that also spends 20% of each request in Python. The chapter's own sentence at line 172 ("only the Python work between waits is newly parallel") is the accurate version.
- fix: reword the row to the nuance the chapter already states (waits already overlap; the Python work between waits is what becomes parallel; measure), and point to the web section's attributed benchmark.
- confidence: medium (the benchmark is one speaker's machine transcript, which I only grepped)

### C03 · must-fix · ledger
- where: #processes, first paragraph (bold sentence and Shaw sentence) · line 389
- finding: Shaw's comparison was against subinterpreters ("a better choice"), but the chapter reports it as "the better choice" for CPU-heavy tasks, in a section about replacing processes, dropping the qualifier the ledger's narrower claim keeps.
- evidence: draft: "In 2024 Anthony Shaw said free threading will be the better choice for CPU-heavy tasks that can be easily segmented and need only a 'quick data exchange between them'". LWN 2024 (page line 47): "Shaw said, he thinks that 'subinterpreters are a better solution for multiprocessing' using long-running workers; 'I think for a web app, this is a perfect solution.' Free-threading will be a better choice for CPU-heavy tasks that can be easily segmented and only need to do a 'quick data exchange between them'." Ledger narrower claim for C-r1-evidence-17 (load-bearing, partial): "free-threading will be a better choice than subinterpreters for CPU-heavy tasks...". The bold lead-in "Two speakers' advice points the same way: threads suit CPU-heavy work that splits cleanly and shares little" extends this to processes. It also omits that, in the same passage, Shaw called subinterpreters "a perfect solution" for a web app, which is the reader's case.
- fix: keep "a better choice than subinterpreters", say what Shaw said about web apps, and make the bold lead-in match what each speaker actually compared.
- confidence: high

### C04 · should-fix · diagrams
- where: #timeline-phases, "Phase II: 3.14 and 3.15" bar · line 41
- finding: the bar says 3.15 is still in phase II and runs it to the axis end (2027), which no cited source states and the trace does not map.
- evidence: What's New 3.14: "This is the start of phase II". The What's New 3.15 lines I read (146, 150, 174-179, 308-314) do not name a phase. The trace maps the phase bars to C-r1-practice-01, -33 and -36 (all 2025 or earlier), not to 3.15. The bar's right edge implies an end date.
- fix: end the phase II bar at the 3.15 mark with "supported but optional", or label 3.15 as "no phase stated in its notes".
- confidence: medium

### C05 · should-fix · order
- where: #intuition ("The free-threading porting guide's `RaceyCounter` example") and its IMPORTANT callout · lines 96-99; also the timeline mark "SC intends to accept..." · line 35
- finding: the community guide, the "free-threading HOWTO" and "SC" are used as authorities before the chapter says what they are; the guide is not introduced as community-maintained until line 209, yet the chapter later contrasts "the CPython documentation and the porting guide".
- evidence: first use of "porting guide" is line 96; "The community Python Free-Threading Guide" first appears at line 209; the diagram label "SC" at line 35 comes before the text explains the abbreviation (line 18 spells out "Steering Council" without it).
- fix: one clause at first use ("the community-maintained Python Free-Threading Guide"; "the CPython free-threading HOWTO"), and spell out "Steering Council" in the diagram label.
- confidence: low

### C06 · should-fix · clarity
- where: #costs · lines 159, 168
- finding: "pyperformance" and "geometric mean" are used for the slowdown and memory figures without a gloss.
- evidence: line 159 "about 40% on the pyperformance suite"; line 168 "about 15-20% more memory (geometric mean on pyperformance)". The stated reader writes web services and data scripts.
- fix: one clause: "pyperformance, CPython's standard benchmark suite; the geometric mean averages the ratios across its benchmarks".
- confidence: low

### C07 · should-fix · reader
- where: #web (line 183), #install (line 218), #abi (line 298), #asyncio (line 383), #next-steps (line 412)
- finding: these paragraphs run well past about 100 words and each holds several ideas, so a step or caveat is buried in prose (§4 prose rules).
- evidence: line 383 is roughly 190 words and holds three ideas: the thread-safety rules, a reconciliation of two doc statements, and debug mode. Line 218 is roughly 170 words: installer options, the "experimental" label mismatch, the shared `site-packages` hazard and the source build. Line 412 is roughly 160 words: the test-suite advice, three plugins, repeat runs and the switch-interval trick. Line 298 is roughly 150 words on tags, PEP 803's advice and loadable-versus-safe. Line 183 is roughly 140 words, setup plus results.
- fix: split by idea; the Windows shared-`site-packages` warning and the "experimental" label mismatch can be a short list or a collapsed note.
- confidence: medium

### C08 · should-fix · ledger
- where: #install, first sentence · line 209
- finding: "The quickest route is uv." is a comparative evaluation in the chapter's own voice; the trace marks it "framing" and no source ranks install routes.
- evidence: trace `## trying-it / ### install`: "¶1 s1: framing". The uv page says only that uv "supports discovering and installing free-threaded Python variants in CPython 3.13+". B8 requires two independent rung-2 sources for a comparative claim in the chapter's own voice; none exists in the ledger.
- fix: drop the ranking ("uv is one route:") or attribute it.
- confidence: high

### C09 · should-fix · quiz
- where: q-loop (lines 433-442) and q-atomic (lines 443-452)
- finding: some distractors would not tempt a reader who half understood, and q-atomic's wrong options repeat the chapter's own example lines, so they test recall of the examples.
- evidence: I answered q-loop b and q-atomic a, b, both correct. q-loop options c ("The interpreter re-enables the GIL for the loop") and d ("asyncio raises an error because CPU work is not allowed") are implausible. q-atomic options c and d are the guide's `lst[i] = lst[i] + 1` and `if key in d: del d[key]` lines, and the added "as one atomic step" gives the answer away.
- fix: for q-loop, offer plausible wrong beliefs (for example "the loop gets its own core because the build is free-threaded", "asyncio.to_thread parallelizes it automatically"); for q-atomic, use a different read-modify-write case from the reader's own code.
- confidence: medium

### C10 · should-fix · quiz
- where: q-import · lines 453-462
- finding: the question is about 3.14t, but "a RuntimeWarning names the module" is verified only in the 3.15 branch of `Python/import.c`.
- evidence: the draft's own code block title: "The warning text in Python/import.c (3.15 branch)". I confirmed the message text (`...has been enabled to load module '%U', which has not declared that it can run safely without the GIL...`) and the use of `PyExc_RuntimeWarning` in that file at commit 88b0f7d. The HOWTO (3.15.1) says only "A warning will be printed in this case." Nothing I read ties the module-naming warning to 3.14.
- fix: ask about "a free-threaded 3.15 build", or loosen the key to "the GIL is enabled and a warning is printed".
- confidence: medium

### C11 · note · rules
- where: #costs line 166; #asyncio line 383
- finding: citations sit inside sentences in places (an enumerated "The rows come from ... ([..], [..])" sentence, and a quoted pair followed by "are both true"), against "Citations end their sentence".
- evidence: line 383: '"Safe implementation" and "almost all asyncio objects are not thread safe" ([asyncio dev guide](#s-r2-practice-02)) are both true'.
- confidence: medium

### C12 · note · reader
- where: #decision, row 3 · line 201
- finding: "A dependency you need has no free-threaded build" is paired with the reason "Importing an unmarked extension re-enables the GIL", which are different situations; without a free-threaded wheel the package is built from source (#at-install), and the re-enabling happens at import of an undeclared extension (#at-import).
- evidence: draft lines 258 and 264 describe the two steps separately; the row merges them.
- confidence: medium

### C13 · note · diagrams
- where: #install-flow · line 272
- finding: the node "Free-threaded wheel (t tag)?" would answer "no" for a 3.15 `cp315-abi3.abi3t` wheel, which the chapter describes at line 298 and which works. The title restricts the diagram to "one compiled dependency", which partly covers it.
- evidence: PEP 803 (line 236): "a wheel tagged cp315-abi3.abi3t will be compatible with 3.15, 3.16, and later versions".
- confidence: low

### C14 · note · reader
- where: #threads cache example · line 329
- finding: the example holds the lock across `expensive_calculation(key)`, so a CPU-bound fill serializes all threads, which is the cost the free-threaded build is meant to remove; the chapter does not say so.
- evidence: the porting guide's own note on its lock example: "this introduces a scaling bottleneck when SafeCounter instances are concurrently updated". The guide's text I read does not show the draft's exact cache code, so this is the chapter's own illustration.
- fix: one sentence saying correctness first, and that holding a lock during the expensive call limits parallelism.
- confidence: medium

### C15 · note · coverage
- where: #processes · line 387
- finding: the brief asks "what changes for the reader's code (threads, asyncio, multiprocessing)"; the section covers when to replace processes with threads, but never says whether existing multiprocessing code needs any change on the free-threaded build.
- evidence: checklist item 5 (line 404) covers swapping processes for threads and picklability, not unchanged multiprocessing behaviour. I could not tell from the ledger that a claim exists for it.
- confidence: low

## Scorecard

- facts: C02
- citations: C01
- ledger: C03, C08
- coverage: holds (note C15)
- diagrams: C04 (notes C13)
- quiz: C09, C10
- order: C05
- reader: C07 (notes C12, C14)
- clarity: C06
- rules: holds (note C11)

**Holds:**
- The `check_ft.py` block and the three-way check (`python -VV`, `Py_GIL_DISABLED`, `sys._is_gil_enabled()` after imports) match the 3.15.1 HOWTO exactly.
- The warning-text block matches `Python/import.c` at the named commit, and the "do not settle D-09 by reading, ask `sys._is_gil_enabled()`" handling is right.
- The costs table. Every figure I traced (40%, 20-40%, 5-10%, about 10% and 3% macOS, 0-10% and about 5% Linux GCC, 1% to 8%) matches its source, and the chapter says plainly that the sources disagree and that none is the reader's workload.
- The PEP 703 and shipped-build split, the Steering Council paraphrases, and the PEP 779 and Steering Council memory-target contrast.
- The abi3 and abi3t section, including the stale-HOWTO callout, matches the stable-ABI page and PEP 803.
- The thread-safety bullet list and the `d.pop(key, None)` and copy-iteration advice match the Thread Safety Guarantees page.
- The declared gaps (G-r1-03, G-r1-04, G-r1-07) are stated and the "2.5x" figure is absent.
- The Hias "pure Python shouldn't need to care" callout is correctly attributed and set against the documentation.
- The Shaw chart values and caption match LWN (2.41 to 0.75, 1.2 to 1.57; four cores, 3.13 beta 1).
- The Tensogram figures I grepped (1,841 and 4.65x, 20,174, 12,951, 168,786 and 13.03x, 20 cores) match the page.
- Link ids all resolve to sources items, the quiz answers name real option ids, and there are no raw-HTML or heading-level violations.

**Not seen:**
- The dispatch text (including `writer_model:`) was not visible to me, so I could not check that I run on a different model from the writer; the dispatcher should confirm.
- Pages I did not read: asyncio-dev, asyncio-task, concurrent.interpreters, concurrent.futures, the Library FAQ, What's New 3.13, the extension-porting guide, the guide's tracking table, the wheel tracker page and `results.json` (so the 219-of-360 figure, the named packages and the version table are unchecked), and the FOSDEM slides. The asyncio "one Task at a time" and "safe implementation" statements, the Library FAQ quote and the TechWolf affiliation are therefore unchecked. The q-loop key is consistent with the asyncio-threading page I did read but not with the asyncio-dev page.
- The FOSDEM transcript, Tensogram page and `asyncio-threading` page were only grepped for specific phrases. The remaining Tensogram numbers (293, 408, 396, 23,369 and 1.16x, 0.72x) and Hias's test configuration were not checked.
- The reader's render of the `diagram`, `chart` and `quiz` blocks.
- The claim in the import.c block title that commit 88b0f7d is the "3.15 branch".
- Not every trace line was re-verified; I sampled.
- I did not run `knowledge check`.
