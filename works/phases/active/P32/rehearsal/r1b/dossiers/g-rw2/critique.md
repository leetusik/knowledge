# Critique: 20261023-0350-free-threaded-cpython

- kind: document · slice: none
- draft: dossier:body.md
- verdict: revise
- confidence: medium
- must_fix: 2 (facts 0, citations 1, ledger 1, coverage 0, diagrams 0, quiz 0, order 0, reader 0, clarity 0, rules 0)
- should_fix: 12
- notes: 6
- critic_model: claude-sonnet-5-5 · writer_model: claude-opus-5-5
- checked: 45 sources opened (36 as saved pages read with grep/Read, 9 through WebFetch), 6 code/data claims grepped (import.c warning and its `_PyEval_EnableGILPermanent` path, the `Py_mod_gil` slot sample, results.json counts 219/129/12), 6 quiz items answered
- ledger: about 125 claims traced, 2 untraceable (C02 and the inference in C10), 45 sources re-opened
- coverage: 21/21 load-bearing questions answered or declared; must-cover 6/6
- skill: plugin/skills/explain/SKILL.md (read §4, §4.1, §4.2, §4.4, §4.5, §4.6 and Part B)
- open_items: C01, C02, C03, C04, C05, C06, C07, C08, C09, C10, C11, C12, C13, C14

## Findings

### C01 · must-fix · citations
- where: #background, the paragraph "The free-threaded build is a second way to compile CPython…" · line 8
- finding: "A build made this way defines the `Py_GIL_DISABLED` macro, and its ABI tag gains a `t`, for 'threading'" is cited to What's New 3.13, which does not say it.
- evidence: I searched the opened 3.13 notes for `Py_GIL_DISABLED`, "ABI tag" and "macro": the free-threaded section (the "Free-threaded CPython" subsection) has neither. The only related text is in the build-changes list: "the free-threaded build generates `python-3.13t.pc`". The sentence is in PEP 703 § "Build Configuration Changes": "When built with `--disable-gil`, CPython will define the `Py_GIL_DISABLED` macro in Python/patchlevel.h. The ABI tag will include the letter 't' (for 'threading')." (ledger C-r1-foundations-03: PEP 703/P4 is the direct support, What's New 3.13/P6 is `fit partial` and only for the `.pc` name.) It is a definition, so it is load-bearing.
- fix: cite PEP 703 (`s-r1-foundations-01`) here; keep What's New 3.13 for the `python3.13t` executable name.
- confidence: high

### C02 · must-fix · ledger
- where: #should-you, the bold lead of the paragraph before the Tensogram numbers · line 123
- finding: "**The speed-up only comes from running your own Python code in several threads at once.**" is traced as "framing", has no ledger claim, and is an overstated behaviour claim that the paragraph's own example contradicts.
- evidence: trace.md `should-you ¶4 s1: framing`. No claim in ledger.md says what the gain "only" comes from. The cited Tensogram page (`s-r1-cases-05`) says: "Tensogram already releases the GIL during Rust computation (`py.detach()`), which helps, but the GIL is still re-acquired for numpy array construction and Python object creation", and "GIL-enabled stays near 1.0x because numpy array construction dominates and serializes under the GIL." So the 1,841 vs 293 op/s gain comes from extension and NumPy glue code that held the GIL, not from "your own Python code". The ledger scope for C-r1-cases-10 also says "the extension releases the GIL during Rust work", and the chapter drops it. The sentence is the deciding rule of the T1 section.
- fix: state what the sources support (for example: threads gain only where several of them have CPU work that the GIL was serializing; I/O waits and GIL-releasing extension calls already overlapped), trace it to the glossary and HOWTO claims, and add the Tensogram scope.
- confidence: medium

### C03 · should-fix · clarity
- where: #background (first use) and #should-you / #threads · lines 8, 115, 121, 187
- finding: Three terms the reader needs are never defined: "ABI" ("its ABI tag gains a `t`"), "pyperformance" (table row "about 40% on pyperformance"; "15–20% more memory") and "atomic" ("are atomic", "never atomic", used about ten times and tested in the quiz).
- evidence: `grep`-style read of the draft: none of the three has a definition or a gloss anywhere. The brief's reader knows the GIL "only as 'one thread runs Python at a time'". "Atomic" carries the whole #threads section and q-atomic; "ABI" is the reason C extensions need new wheels.
- fix: one clause each on first use (for example "atomic: no other thread can see it half done").
- confidence: medium

### C04 · should-fix · reader
- where: multiple (first #background) · lines 10, 121, 123, 125, 148, 187, 229, 233, 245, 279
- finding: Many paragraphs run well past 100 words and hold two or three ideas, and one deliverable step is buried in prose, so the reader trips at each.
- evidence: Approximate word counts: line 121 about 170 (3.13 cause, Wouters's recollection, the sources of later figures, memory, the Steering Council rules); line 125 about 170 (benchmark set-up, GIL result, free-threaded result, replication gap, Granian warning); line 233 about 170 (pickle cost, Wouters's costs, shared-object warning, GIL re-enable, subinterpreters, their effort); lines 148, 187, 229 each 150–165; line 10 about 125. In #trying-it (T2), the python.org installer steps (Windows "Download free-threaded binaries" under Advanced Options, macOS Customize) sit inside the 150-word line 148 paragraph, with the uv rule and the naming rule. #should-you runs about 900 words against its 750 budget in the outline.
- fix: split at the idea boundaries; put the installer steps and the uv rule in a short list under the commands; move the Wouters sub-points of line 233 into a collapsed callout.
- confidence: medium

### C05 · should-fix · ledger
- where: #intuition · line 60
- finding: "Shaw also noted … that handing work to other processes needs data serialization, for example with pickle" states as Shaw's remark what the ledger holds only as LWN's description of his demo.
- evidence: ledger C-r1-evidence-16 is `partial`, narrower: "LWN describes his demo of passing work to other 'cores' as akin to the data serialization (for example via pickle) needed to parcel out a task to multiple cores." LWN 2024 (opened): Shaw "compared distributing work to cores with passing data through 'the serialization of data that a computer might need to do,' which is like pickling." The start-up claim is also scoped in the narrower claim: largest "among threads, coroutines, multiprocessing and subinterpreters"; the draft drops the comparison set.
- fix: write it as LWN's comparison, and keep "largest of the four options Shaw compared".
- confidence: high

### C06 · should-fix · citations
- where: #how-it-works, the mimalloc bullet · line 98
- finding: "pymalloc, which is not thread-safe without the GIL" is cited to the HOWTO, which does not say it.
- evidence: HOWTO § "mimalloc allocator vs pymalloc" (opened) says only: "The free-threaded build does not use pymalloc and allocates all Python objects using the 'mimalloc' allocator." The clause is in PEP 703 § on the allocator: "The pymalloc implementation is not thread-safe without the GIL." (ledger C-r1-foundations-20 lists both sources.)
- fix: add the PEP 703 citation for the clause, or drop the clause.
- confidence: high

### C07 · should-fix · ledger
- where: #should-you, above the overhead table · line 111 (and the bold lead)
- finding: "The project's own figures differ by when they were measured" asserts the cause of an open disagreement (D-01) as fact, and the table row labelled "no measurement date" shows the draft cannot know it.
- evidence: ledger D-01: "prominence: all three are the project's own figures, likely measured at different times · status: open"; "would settle it: a dated pyperformance comparison for the current release". What's New 3.14 ("roughly 5-10%") and the 3.14 HOWTO ("about 1% on macOS aarch64 to 8% on x86-64 Linux") describe the same release, and the HOWTO figure carries no date. The table itself is a fair attributed presentation; only the explaining sentence overreaches.
- fix: "The project's own figures differ, and the HOWTO gives no measurement date" (or "probably measured at different times").
- confidence: medium

### C08 · should-fix · ledger
- where: #should-you, the web-service paragraph · line 125
- finding: "Gunicorn's gthread workers, Granian and an ASGI framework rise roughly linearly and then flatten at the same point" drops the qualifier in the narrower claim: Granian went further.
- evidence: ledger C-r2-criticism-02 is `partial`; narrower: "Gunicorn gthread and Granian on the GIL build rising roughly linearly and then saturating (Granian going a bit further, as it does some network I/O in Rust), and an ASGI framework capping at the same point". Transcript (opened, 16:21–16:54): "…if you compare that to [Granian] we see basically the same characteristics except [Granian] can go a bit further because it does some of this network IO stuff in the [Rust] world … [the async framework] basically caps at the exact same point." The "linear rise" was said of Gunicorn and Granian, not of the ASGI framework.
- fix: "Gunicorn and Granian rose roughly linearly and saturated (Granian a little later); an ASGI framework capped at about the same point."
- confidence: high

### C09 · should-fix · citations
- where: #threads · line 185
- finding: "free threading makes those latent bugs more likely to show" is cited only to the porting guide, which does not say it; the second source the ledger relies on is not cited.
- evidence: porting guide § "Thread Safety of Pure Python Code" (opened) says only that "Many pure Python operations are not atomic and are susceptible to race conditions, or only appear to be thread-safe in the GIL-enabled build because of details of how CPython releases the GIL in a round-robin fashion." I searched the page for "likely", "expose", "reveal", "mask": no sentence says free threading makes them more likely to show. LWN 2026 (Wouters): "you no longer have the GIL accidentally protecting you some of the time." Ledger C-r1-criticism-13 rests on guide + LWN ("moderate independence") and is an interpretive claim in the chapter's voice (B8 needs two sources).
- fix: cite LWN 2026 for that clause too, or attribute it to Wouters.
- confidence: high

### C10 · should-fix · ledger
- where: #processes · line 233
- finding: The section opens with an evaluative claim in the chapter's own voice that the ledger holds only in attributed form, and one sentence is an inference with no claim behind it.
- evidence: Bold lead: "Threads can now replace processes for CPU work, when the pieces share data or are expensive to pickle." Ledger: Q11 "answered (partial and attributed: C-r1-evidence-15, -16, -17, C-r2-evidence-12, -13)"; C-r2-evidence-12 "bar met for the attributed form (Wouters)"; the draft itself says "No independent, dated multi-thread benchmark for the current release was found." Also: "Processes keep one advantage while your dependencies catch up: an extension that is not ready can switch the GIL back on in a free-threaded process." The cited HOWTO only says importing an unmarked extension "may automatically enable the GIL" (C-r2-evidence-07); that processes therefore keep an advantage is the writer's comparison, traced to nothing.
- fix: attribute the lead ("Wouters's view is that…") or hedge it; either trace the "advantage" sentence or drop it.
- confidence: medium

### C11 · should-fix · ledger
- where: #dependencies, bold lead · line 245
- finding: "**Pure-Python packages just work**" raises certainty beyond the claim ("pure-Python wheels can already be used") and sits against the chapter's own thread-safety advice.
- evidence: Wheels tracker (opened): "Pure-Python wheels can already be used in free-threaded builds, but wheels with extensions need to be updated for free-threaded Python." Ledger C-r1-evidence-10 is about wheels being usable. The porting guide, cited at line 189, says "The most common source of thread safety issues in Python packages is use of global mutable state", which applies to pure-Python packages. A reader who skims the bold lead would skip checking pure-Python dependencies.
- fix: "Pure-Python wheels install and run on the free-threaded build; whether their code is thread-safe is a separate question (see Threads)."
- confidence: medium

### C12 · should-fix · facts
- where: #dependencies, code block titled `Python/import.c (CPython 3.15 branch)` · lines 275–277
- finding: The block is titled as a source file, but its content is the rendered warning message, not lines of that file.
- evidence: `Python/import.c` at 88b0f7d lines 1673–1680 (opened at that commit): `PyErr_WarnFormat(PyExc_RuntimeWarning, 1, "The global interpreter lock (GIL) has been enabled to load " "module '%U', which has not declared that it can run safely " "without the GIL. To override this behavior and keep the GIL " "disabled (at your own risk), run with PYTHON_GIL=0 or -Xgil=0.", module_name)`. The block shows `RuntimeWarning: … module '<name>' …` as one line. The wording is faithful; the title promises file text (B9: a block titled `path` must match that file, with marked elisions).
- fix: title it "Warning text (assembled from Python/import.c, 3.15 branch, `%U` shown as `<name>`)".
- confidence: high

### C13 · should-fix · quiz
- where: #quiz · q-io (lines 332–340) and q-abi (341–344)
- finding: q-io has two distractors no reader would pick and a key that restates the decision table; q-abi is a cloze on a name given in the text.
- evidence: q-io key b ("The GIL is already released while a thread does I/O…") is the sentence in the table and the Skip callout. Distractors a ("Free-threaded builds cannot do network I/O in threads") and c ("…re-enables the GIL for sockets") are implausible to anyone who read the chapter. q-abi asks for "abi3t", which the callout states in one sentence; the item tests recall of a phrase, and the callout is collapsed (a reader who skipped it cannot answer). I answered all six items: q-loop b, q-atomic a+b, q-import (recall, correct), q-io b, q-abi abi3t, q-check b; all keys are right and rest on supported claims.
- fix: for q-io, make the distractors tempting (for example "it releases the GIL only for `asyncio` code" or "I/O-bound threads gain more because there are more cores"); turn q-abi into a predict item (which tag does a free-threaded 3.15 interpreter load?).
- confidence: medium

### C14 · should-fix · reader
- where: multiple (first line 6; also 36, 102, 187, 229, 233) · §4 prose rules
- finding: The prose reports who said what and repeats one source several times a paragraph, against "teach, don't report" and "one citation per source a paragraph".
- evidence: line 187 cites `[Thread Safety Guarantees]` four times in one paragraph; line 229 cites `[asyncio and free-threaded Python]` five times; line 233 cites `[LWN, 2026]` three times. Sentences open with "The porting guide puts it this way", "The HOWTO says", "According to PEP 703", "The docs say", where the fact itself (for example "reading `lst[i]` is atomic") could be stated in the chapter's voice because the ledger holds it as `supported` rung 1.
- fix: cite each source once at the end of the paragraph; keep attribution only for contested or attributed claims (Hias, Wouters, the guide's "most common source").
- confidence: medium

### C15 · note · facts
- where: #intuition, Shaw benchmark · lines 60–72
- finding: The benchmark leaves out the subinterpreter run, so "threads were the fastest of the four runs" is true only within the two approaches shown.
- evidence: LWN 2024 (opened): "With the GIL, subinterpreters took 0.76s (and multiprocessing took 1.2s)"; without it, subinterpreters took 0.99 s. On the GIL build, subinterpreters (0.76 s) matched free-threaded threads (0.75 s). The chapter later calls subinterpreters "a middle way", so the omission matters for the T1 decision. The ledger claim C-r1-evidence-15 covers only threads and multiprocessing, so the draft is faithful to it.
- confidence: medium

### C16 · note · coverage
- where: #should-you, "What is still open" · line 128
- finding: The callout says the 3.15 JIT status is unknown, but What's New 3.14 (opened and cited) states that free-threaded builds did not support the JIT in 3.14.
- evidence: What's New 3.14, JIT section: "Free-threaded builds do not support JIT compilation." The ledger holds this only as C-r1-foundations-39 (candidate), and gaps/final.md declares the 3.15 question as stated-open, so the draft honours the gap. A reader may still read "unsettled" as "unknown for 3.14 too".
- confidence: medium

### C17 · note · facts
- where: #should-you, "What is still open" · line 128
- finding: "Wouters said in June 2026 that many scalability improvements were coming in 3.15" dates the talk by the article.
- evidence: ledger C-r2-evidence-05 scope: "stated May 2026 about the then-upcoming 3.15"; LWN's report is dated 22 June 2026. The claim sentence in the ledger says "LWN, June 2026".
- confidence: medium

### C18 · note · facts
- where: #asyncio · line 196
- finding: "scales linearly" is put in quotation marks, but the notes read "scaling linearly with the number of threads".
- evidence: What's New 3.14 § asyncio: "This enables parallel execution of multiple event loops across different threads, scaling linearly with the number of threads."
- confidence: high

### C19 · note · reader
- where: #should-you, decision table · lines 130–136
- finding: The table does not cover the data-script reader whose CPU time is already inside extensions that release the GIL (the NumPy-style case), where the gain is smaller.
- evidence: Glossary (cited at line 6): "some extension modules … are designed so as to release the GIL when doing computationally intensive tasks such as compression or hashing." Tensogram releases the GIL during Rust work. The brief's open item names the workload mix "I/O-bound web vs CPU-bound data processing"; the "Wait if" column covers only I/O waits. No ledger claim covers NumPy itself, so this is a gap in coverage, not an error.
- confidence: low

### C20 · note · clarity
- where: #background phases diagram and line 148 · lines 12–27, 148
- finding: The diagram puts 3.15 between phase II and phase III, and "On 3.15 the macOS binaries install it by default" can read as "python on macOS is free-threaded by default".
- evidence: What's New 3.15: "The official macOS binaries now install free-threading support by default" (an installed component, not the default interpreter); 3.15 is still phase II (the PEP 779 text says the phase III decision is left to a future PEP). The dashed edge helps, but the chain suggests 3.15 leads on to phase III.
- confidence: low

## Scorecard

- facts: C12 open (notes C15, C17, C18)
- citations: C01, C06, C09
- ledger: C02, C05, C07, C08, C10, C11
- coverage: holds (21/21 load-bearing questions and 6/6 must-cover items are answered or declared; declared gaps G-r1-03, G-r1-04, G-r1-07 are stated as written; the "2.5x" figure and the words "disabled by default" and "permanently" are absent as required; note C16)
- diagrams: holds (every node and edge I checked matches the text and sources; the toy timeline is marked an analogy; note C20)
- quiz: C13 open (keys all correct and supported)
- order: holds apart from the undefined terms in C03
- reader: C04, C14 open (notes C19)
- clarity: C03 open (note C20)
- rules: holds (§4.1 read by hand: no raw HTML, headings `##`/`###` only, unique ids, every `#s-…` link resolves to a `sources` item, YAML strings quoted, typed blocks top-level, 6 quiz items)

**Holds** (must survive the revision):
- The numbers all check against the sources: PEP 779 (about 10%, 3% on macOS, 15–20% memory), the Steering Council limits (10%/15%, memory below 15% with a 20% hard limit), HOWTO 1–8% and 3.13's 40%, What's New 3.14's 5–10%, Wouters's 0–10% and about 5%, Shaw's four timings, Tensogram's 1,841/293 and 12,951/20,174 and 168,786/23,369, the tracker's 219 of 360 on 22 October 2026 with the five named packages that have wheels and orjson/psycopg-binary/grpcio that do not, NumPy 2.1.0 and pandas 2.2.3.
- The Thread Safety Guarantees paragraph (line 187) matches the docs list item by item, and q-atomic's key and distractors follow from it.
- The asyncio section (one loop per thread, `asyncio.to_thread`, the cross-thread rules) matches the docs page, and q-loop works as a predict item.
- The WARNING callout on the glossary/HOWTO disagreement (D-09) is attributed and ends in a check the reader can run.
- The three-check install block, the `-X gil` over `PYTHON_GIL` precedence, and q-check with its build-versus-process explain.
- The attributed treatment of the FOSDEM talk, Granian's README warning and the Tensogram numbers ("one project's own numbers"), and the stated gaps.
- The collapsed abi3/abi3t callout matches the 3.15 stable-ABI page and PEP 803.

**Not seen**:
- The reader's render of the diagrams, chart, quiz and callouts.
- No `tools:` folder was given and my copy of the converter was not allowed to run, so I read saved pages as raw HTML with grep and Read; nine sources were read through WebFetch and are approximate: both Steering Council posts, both LWN articles, the two uv pages, the two pip pages, and the pytest-run-parallel README.
- The Medium lead (rung 3) that found free-threaded Granian slowest was not opened (the ledger leaves it unused).
- The pages are as served on 23 October 2026; I did not check them against the dates of the dossier's own snapshots beyond the tracker's "Last updated 22 October 2026".
- verify/ files were not re-read; statuses were taken from ledger.md, and each load-bearing sentence I checked was re-read in the source itself.
