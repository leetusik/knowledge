# Findings: 20261023-0350-free-threaded-cpython · round 1 · angle evidence
- researcher: claude-opus-5-5 · status: partial (hard cap reached; Q11 and the multithreaded-speedup half of Q5 rest on one 2024 pre-release measurement) · tool calls: 30

## Questions
- Q5: thin — claims: C-r1-evidence-01, C-r1-evidence-02, C-r1-evidence-03, C-r1-evidence-04, C-r1-evidence-05, C-r1-evidence-06, C-r1-evidence-07, C-r1-evidence-08, C-r1-evidence-09, C-r1-evidence-15 — note: single-thread overhead (3.13 ~40%, 3.14 ~1-10% by source and date) and memory (~15-20%, PEP 779) are rung-1 answered; multithreaded CPU-bound speedup has only one independent measurement (LWN on Shaw's PyCon 2024 talk, 3.13b1, four cores); nothing found for 3.15.
- Q8: answered — claims: C-r1-evidence-10, C-r1-evidence-11, C-r1-evidence-12, C-r1-evidence-13, C-r1-evidence-14 — note: hugovk tracker JSON dated 22 Oct 2026 gives 219 of the top 360 extension packages with free-threaded wheels (count made by the researcher from the JSON); py-free-threading tracking table gives first-supporting versions.
- Q11: thin — claims: C-r1-evidence-15, C-r1-evidence-16, C-r1-evidence-17 — note: only one rung-2 source (LWN 2024) with measurements and Shaw's attributed advice; no rung-1/2 source found within budget on what still favours processes (crash isolation, non-thread-safe libraries).

## Sources

### S-r1-evidence-01
- url: https://docs.python.org/3.14/howto/free-threading-python.html · canonical: docs.python.org/3.14/howto/free-threading-python.html
- title: Python support for free threading · authors: n/a · publisher: Python Software Foundation (docs.python.org)
- date: not printed; page served as the current 3.14 docs (a search result labels /3/ as "Python 3.14.7 documentation") · version: Python 3.14
- accessed: 2026-10-23 · read-via: curl · quote-match: exact · archive: none
- kind: official docs · peer-review: n/a
- owner: Python Software Foundation / CPython core developers · upstream: none
- lateral: official CPython documentation, maintained in the CPython repository by core developers.
- passages:
  - P1 · § "Single-threaded performance": "On the pyperformance benchmark suite, the average overhead ranges from about 1% on macOS aarch64 to 8% on x86-64 Linux systems."
  - P2 · § "Increased memory usage": "The free-threaded build will typically use more memory compared to the default build. There are multiple reasons for this, mostly due to design decisions."
  - P3 · § "Increased memory usage": "The free-threaded build does not use pymalloc and allocates all Python objects using the “mimalloc” allocator."
  - P4 · § "QSBR can delay freeing of memory": "Running gc.collect() should cause all memory being held by QSBR to be actually freed."
  - P5 · § "Increased memory usage": "You can reduce that delay by setting the environment variable MIMALLOC_PURGE_DELAY to 0. Note that this will likely reduce the performance of the allocator."
  - P6 · § "Free threading": "While not all software will benefit from this automatically, programs designed with threading in mind will run faster on multi-core hardware."

### S-r1-evidence-02
- url: https://docs.python.org/3.13/howto/free-threading-python.html · canonical: docs.python.org/3.13/howto/free-threading-python.html
- title: Python experimental support for free threading · authors: n/a · publisher: Python Software Foundation (docs.python.org)
- date: not printed · version: Python 3.13
- accessed: 2026-10-23 · read-via: curl · quote-match: exact · archive: none
- kind: official docs · peer-review: n/a
- owner: Python Software Foundation / CPython core developers · upstream: none
- lateral: official CPython documentation for the 3.13 series.
- passages:
  - P1 · § "Single-threaded performance": "In 3.13, this overhead is about 40% on the pyperformance suite. Programs that spend most of their time in C extensions or I/O will see less of an impact. The largest impact is because the specializing adaptive interpreter (PEP 659) is disabled in the free-threaded build."
  - P2 · § "Single-threaded performance": "We are aiming for an overhead of 10% or less on the pyperformance suite compared to the default GIL-enabled build."
  - P3 · § "Immortalization": "Because immortal objects are never deallocated, applications that create many objects of these types may see increased memory usage. This is expected to be addressed in the 3.14 release."

### S-r1-evidence-03
- url: https://peps.python.org/pep-0779/ · canonical: peps.python.org/pep-0779/
- title: PEP 779 – Criteria for supported status for free-threaded Python · authors: not read from header (field values not captured by grep) · publisher: Python Software Foundation (peps.python.org)
- date: not read from page header (PEP written during 3.14 development, 2025) · version: n/a
- accessed: 2026-10-23 · read-via: curl · quote-match: exact · archive: none
- kind: spec · peer-review: n/a (PEP process; Steering Council decision)
- owner: CPython core developers (authors overlap with past Steering Council, per the PEP itself) · upstream: pyperformance runs by Microsoft Faster CPython and Meta Python Runtime teams
- lateral: PEP authors are the free-threading implementers, a stake in the result; numbers are self-reported by the project.
- passages:
  - P1 · § "Rationale" (performance item): "Performance: the performance penalty on linear performance, comparing a free-threaded build against a with-GIL build, as measured by the pyperformance benchmarks (for example as run by Microsoft’s Faster CPython team, or Meta’s Python Runtime team), is currently around 10% (except on macOS, where it’s more like 3%)."
  - P2 · § "Rationale" (memory item): "free-threaded Python currently sees about 15-20% higher memory use (geometric mean, as measured by pyperformance)."
  - P3 · § "Rationale" (memory item): "Realistically, though, higher memory use is the cost of having efficient, safe free-threading, and we are unlikely to get this very close to the with-GIL build’s memory use without significant performance cost."
  - P4 · § "Specification": "We are currently around 10% and don’t expect it to get slower, but for phase II (not the default flip), we propose 15% as a hard performance target."
  - P5 · § "Specification": "We propose a target of 20% (geometric mean, as measured by pyperformance) for phase II."

### S-r1-evidence-04
- url: https://docs.python.org/3.14/whatsnew/3.14.html · canonical: docs.python.org/3.14/whatsnew/3.14.html
- title: What’s New In Python 3.14 · authors: n/a · publisher: Python Software Foundation (docs.python.org)
- date: not printed (3.14 series) · version: Python 3.14
- accessed: 2026-10-23 · read-via: curl · quote-match: exact · archive: none
- kind: official docs (release notes) · peer-review: n/a
- owner: Python Software Foundation / CPython core developers · upstream: none
- lateral: official release notes.
- passages:
  - P1 · § "Free-threaded mode improvements": "The specializing adaptive interpreter (PEP 659) is now enabled in free-threaded mode, which along with many other optimizations greatly improves its performance. The performance penalty on single-threaded code in free-threaded mode is now roughly 5-10%, depending on the platform and C compiler used."
  - P2 · § "Free-threaded Python is officially supported": "Free-threaded builds do not support JIT compilation."

### S-r1-evidence-05
- url: https://hugovk.github.io/free-threaded-wheels/ · canonical: hugovk.github.io/free-threaded-wheels/
- title: Free-Threaded Wheels · authors: Hugo van Kemenade (site owner, per URL) · publisher: GitHub Pages (hugovk)
- date: "Updated daily" (date rendered by JavaScript; see S-r1-evidence-07) · version: n/a
- accessed: 2026-10-23 · read-via: curl · quote-match: exact · archive: none
- kind: dataset (automated tracker) · peer-review: no
- owner: Hugo van Kemenade (CPython core developer and release manager) · upstream: PyPI metadata; Top PyPI Packages list
- lateral: maintained by a CPython core developer; derivative of pythonwheels.com, as the page states.
- passages:
  - P1 · § "What is this list?": "This site shows the top 360 most-downloaded packages with extensions on PyPI:"
  - P2 · § "What are free-threaded wheels?": "Pure-Python wheels can already be used in free-threaded builds, but wheels with extensions need to be updated for free-threaded Python."
  - P3 · § "What is this list?": "Free-threaded wheels have an ABI tag ending in t, for example, cp313t"

### S-r1-evidence-06
- url: https://py-free-threading.github.io/tracking/ · canonical: py-free-threading.github.io/tracking/
- title: Compatibility Status Tracking - Python Free-Threading Guide · authors: n/a · publisher: py-free-threading (Quansight-Labs and community)
- date: not printed (manually updated table) · version: n/a
- accessed: 2026-10-23 · read-via: curl · quote-match: exact · archive: none
- kind: official docs (community guide) · peer-review: n/a
- owner: Python Free-Threading Guide maintainers (Quansight Labs, with Meta funding of the work, per general knowledge; not verified this run) · upstream: project issue trackers and PyPI
- lateral: the guide is referenced by PEP 779 (S-r1-evidence-03 cites this tracking page) and by the hugovk tracker.
- note: the converter lost the table's checkmark cells; only project names and "first version with support" cells survive, so passages pair name and version as ordered pieces.
- passages:
  - P1 · § "Compatibility Status Tracking": "Note that pure Python code works without changes by design, hence this page does not aim to track pure Python packages."
  - P2 · § "Compatibility Status Tracking": "There is also an automatically updated tracker that pulls in information for a wider range of packages, but only tracks whether or not they have wheels on PyPI."
  - P3 · § "Compatibility Status Tracking": "A version listed without a PyPI release checkmark is a projected stable release."
  - P4 · § "Compatibility Status Tracking": "NumPy … 2.1.0 … nvidia-cudnn-frontend"
  - P5 · § "Compatibility Status Tracking": "pandas … 2.2.3 … Pillow … 11.0.0"
  - P6 · § "Compatibility Status Tracking": "SciPy … 1.15.0"
  - P7 · § "Compatibility Status Tracking": "Cython … 3.1.0"
  - P8 · § "Compatibility Status Tracking": "pydantic-core … 2.29.0"
  - P9 · § "Compatibility Status Tracking": "lxml … 7.0.0"
  - P10 · § "Compatibility Status Tracking": "cryptography … 46.0.0"
  - P11 · § "Compatibility Status Tracking": "orjson … outlines-core"
  - P12 · § "Compatibility Status Tracking": "psycopg … py-radix"
  - P13 · § "Compatibility Status Tracking": "PyTorch … 2.6.0"

### S-r1-evidence-07
- url: https://hugovk.github.io/free-threaded-wheels/results.json · canonical: hugovk.github.io/free-threaded-wheels/results.json
- title: (JSON data behind S-r1-evidence-05) · authors: Hugo van Kemenade · publisher: GitHub Pages (hugovk)
- date: "last_update": "Thursday, 22 October 2026, 10:16:54 UTC" · version: n/a
- accessed: 2026-10-23 · read-via: curl (raw JSON, saved as pages/S-r1-evidence-07.html; no .txt made) · quote-match: approximate · archive: none
- kind: dataset · peer-review: no
- owner: Hugo van Kemenade · upstream: PyPI
- lateral: same owner as S-r1-evidence-05; not independent of it.
- passages:
  - P1 · line 2524: "\"last_update\": \"Thursday, 22 October 2026, 10:16:54 UTC\""
  - P2 · lines 271-274: "\"name\": \"orjson\" … \"free_threaded_wheel\": false"
  - P3 · lines 369-372: "\"name\": \"psycopg-binary\" … \"free_threaded_wheel\": false"
  - P4 · lines 152-155: "\"name\": \"grpcio\" … \"free_threaded_wheel\": false"
  - P5 · lines 47-50: "\"name\": \"protobuf\" … \"free_threaded_wheel\": false"
  - P6 · researcher's count: grep -c of "\"free_threaded_wheel\": true" returns 219; entries with false number 141 (219 + 141 = 360). numpy, scipy, pandas, lxml and pydantic-core entries are not among the false entries.

### S-r1-evidence-08
- url: https://lwn.net/Articles/985041/ · canonical: lwn.net/Articles/985041/
- title: Python subinterpreters and free-threading · authors: Jake Edge · publisher: LWN.net (Eklektix, Inc.)
- date: August 20, 2024 · version: Python 3.13 beta 1 (as tested in the talk)
- accessed: 2026-10-23 · read-via: curl · quote-match: exact · archive: none
- kind: news (edited reporting of a PyCon US 2024 talk by Anthony Shaw) · peer-review: no (editorial control: yes)
- owner: LWN.net · upstream: Anthony Shaw's PyCon 2024 talk and talk notes
- lateral: LWN is an independent, edited Linux/open-source news site; Shaw is a Python core developer and author of "CPython Internals". The measurements are Shaw's, reported by LWN.
- passages:
  - P1 · § article body: "As would be expected, removing the GIL reduced the threaded numbers; on a four-core system, they went from 2.41s with the GIL to 0.75s without."
  - P2 · § article body: "With the GIL, subinterpreters took 0.76s (and multiprocessing took 1.2s); without it was 0.99s for subinterpreters and 1.57s for multiprocessing. The difference is that regular Python code runs slower without the GIL, Shaw said;"
  - P3 · § article body: "Each has a different amount of start-up time required, Shaw said, with coroutines having the smallest and multiprocessing the largest."
  - P4 · § article body: "Meanwhile, multiprocessing has much higher overhead (0.3s for 200 digits) but is closer to subinterpreters for 2000 (0.89s)."
  - P5 · § article body: "Free-threading will be a better choice for CPU-heavy tasks that can be easily segmented and only need to do a \"quick data exchange between them\"."
  - P6 · § article body: "That is akin to the serialization of data that a computer might need to do (via, say, pickle) to parcel out a task to multiple cores."
  - P7 · § article body: "Something to note is that asyncio does not use threads, he said."

## Claims

### C-r1-evidence-01
- claim: The Python 3.13 documentation states that the free-threaded build's overhead in 3.13 is about 40% on the pyperformance suite, mostly because the specializing adaptive interpreter (PEP 659) is disabled in that build.
- kind: number · questions: Q5 · load-bearing: yes (the baseline cost of the first release)
- support: S-r1-evidence-02/P1 · rung 1 · fit direct · upstream self
- scope: CPython 3.13, pyperformance suite average; programs dominated by C extensions or I/O see less impact
- confidence: high · flags: none
- conflicts: none

### C-r1-evidence-02
- claim: The Python 3.13 documentation states that programs that spend most of their time in C extensions or I/O see less of the free-threaded build's single-thread overhead.
- kind: behaviour · questions: Q5 · load-bearing: no (qualifier on C-01)
- support: S-r1-evidence-02/P1 · rung 1 · fit direct · upstream self
- scope: CPython 3.13
- confidence: high · flags: none
- conflicts: none

### C-r1-evidence-03
- claim: What's New in Python 3.14 states that the single-threaded performance penalty of free-threaded mode in 3.14 is roughly 5-10%, depending on platform and C compiler, after the specializing adaptive interpreter was enabled in free-threaded mode.
- kind: number · questions: Q5 · load-bearing: yes
- support: S-r1-evidence-04/P1 · rung 1 · fit direct · upstream self
- scope: CPython 3.14 release notes; platform- and compiler-dependent
- confidence: high · flags: none
- conflicts: S-r1-evidence-01/P1 "the average overhead ranges from about 1% on macOS aarch64 to 8% on x86-64 Linux systems" (different range, same version line; likely different dates of measurement)

### C-r1-evidence-04
- claim: The current Python 3.14 free-threading HOWTO states that on the pyperformance suite the free-threaded build's average overhead ranges from about 1% on macOS aarch64 to 8% on x86-64 Linux.
- kind: number · questions: Q5 · load-bearing: yes
- support: S-r1-evidence-01/P1 · rung 1 · fit direct · upstream self
- scope: CPython 3.14 docs as served on 2026-10-23; pyperformance average; workload- and hardware-dependent
- confidence: high · flags: none
- conflicts: S-r1-evidence-04/P1 "roughly 5-10%, depending on the platform and C compiler used"

### C-r1-evidence-05
- claim: PEP 779 reported that, at the time of writing, the free-threaded build's single-thread penalty on pyperformance was around 10% (about 3% on macOS), and set 15% as the hard performance target for phase II (supported but not default).
- kind: number · questions: Q5 · load-bearing: yes (the official acceptance threshold)
- support: S-r1-evidence-03/P1 · rung 1 · fit direct · upstream Microsoft Faster CPython / Meta pyperformance runs
- support: S-r1-evidence-03/P4 · rung 1 · fit direct · upstream self
- scope: 3.14 development period, 2025; pyperformance
- confidence: high · flags: vendor-about-itself (the implementers report their own numbers)
- conflicts: none

### C-r1-evidence-06
- claim: PEP 779 reported that free-threaded Python used about 15-20% more memory than the with-GIL build (geometric mean on pyperformance) and set a 20% memory target for phase II.
- kind: number · questions: Q5 · load-bearing: yes (the only quantified memory overhead found)
- support: S-r1-evidence-03/P2 · rung 1 · fit direct · upstream self
- support: S-r1-evidence-03/P5 · rung 1 · fit direct · upstream self
- scope: 3.14 development period, 2025; pyperformance geometric mean
- confidence: high · flags: vendor-about-itself
- conflicts: none

### C-r1-evidence-07
- claim: PEP 779's authors wrote that higher memory use is the cost of efficient, safe free-threading and that they are unlikely to get it very close to the with-GIL build's memory use without significant performance cost.
- kind: prediction · questions: Q5 · load-bearing: no (attributed expectation)
- support: S-r1-evidence-03/P3 · rung 1 · fit direct · upstream self
- scope: attributed view of the PEP authors, 2025
- confidence: high (as attribution) · flags: speculation ("unlikely")
- conflicts: none

### C-r1-evidence-08
- claim: The Python 3.14 documentation states that the free-threaded build typically uses more memory than the default build, partly because it allocates all Python objects with mimalloc instead of pymalloc and because QSBR delays freeing memory.
- kind: behaviour · questions: Q5 · load-bearing: no (explains C-06; mechanism belongs to foundations)
- support: S-r1-evidence-01/P2 · rung 1 · fit direct · upstream self
- support: S-r1-evidence-01/P3 · rung 1 · fit direct · upstream self
- support: S-r1-evidence-01/P4 · rung 1 · fit partial · upstream self
- scope: CPython 3.14
- confidence: high · flags: none
- conflicts: none

### C-r1-evidence-09
- claim: The Python 3.14 documentation states that setting the environment variable MIMALLOC_PURGE_DELAY to 0 reduces mimalloc's delay in returning freed memory to the OS, likely at some cost to allocator performance.
- kind: behaviour · questions: Q5 · load-bearing: no (practical tuning knob)
- support: S-r1-evidence-01/P5 · rung 1 · fit direct · upstream self
- scope: CPython 3.14 free-threaded build
- confidence: high · flags: none
- conflicts: none

### C-r1-evidence-10
- claim: The hugovk "Free-Threaded Wheels" site tracks the top 360 most-downloaded PyPI packages with extensions and marks which offer free-threaded wheels (ABI tag ending in "t", e.g. cp313t); pure-Python wheels already work on free-threaded builds.
- kind: definition · questions: Q8 · load-bearing: yes (where to check)
- support: S-r1-evidence-05/P1 · rung 1 · fit direct · upstream self
- support: S-r1-evidence-05/P2 · rung 1 · fit direct · upstream self
- support: S-r1-evidence-05/P3 · rung 1 · fit direct · upstream self
- scope: site as accessed 2026-10-23; updated daily
- confidence: high · flags: none
- conflicts: none

### C-r1-evidence-11
- claim: In the hugovk tracker's data updated 22 October 2026, 219 of the 360 tracked packages with extensions had free-threaded wheels on PyPI (count made by the researcher from the site's results.json).
- kind: number · questions: Q8 · load-bearing: yes
- support: S-r1-evidence-07/P1 · rung 1 · fit direct · upstream self
- support: S-r1-evidence-07/P6 · rung 1 · fit partial (derived count, not a printed figure) · upstream self
- scope: top 360 extension packages by downloads; snapshot 2026-10-22; "wheel exists" only, not tested correctness
- confidence: medium (derived count; the verifier should re-count) · flags: none
- conflicts: none

### C-r1-evidence-12
- claim: In the hugovk tracker's data updated 22 October 2026, orjson, psycopg-binary, grpcio and protobuf did not yet offer free-threaded wheels, while numpy, scipy, pandas, lxml and pydantic-core did.
- kind: fact · questions: Q8 · load-bearing: yes (names packages the reader likely uses)
- support: S-r1-evidence-07/P2 · rung 1 · fit direct · upstream self
- support: S-r1-evidence-07/P3 · rung 1 · fit direct · upstream self
- support: S-r1-evidence-07/P4 · rung 1 · fit direct · upstream self
- support: S-r1-evidence-07/P5 · rung 1 · fit direct · upstream self
- support: S-r1-evidence-07/P6 · rung 1 · fit partial (positive cases inferred from absence in the false list) · upstream self
- scope: snapshot 2026-10-22; PyPI wheels only (conda-forge and source builds not covered)
- confidence: medium · flags: none
- conflicts: S-r1-evidence-06/P12 lists psycopg without a first-supporting version (consistent, not a conflict)

### C-r1-evidence-13
- claim: The py-free-threading.github.io tracking table lists the first version with free-threading support as NumPy 2.1.0, pandas 2.2.3, SciPy 1.15.0, Cython 3.1.0, pydantic-core 2.29.0, lxml 7.0.0, cryptography 46.0.0, Pillow 11.0.0 and PyTorch 2.6.0, and lists no supporting version for orjson or psycopg.
- kind: version · questions: Q8 · load-bearing: yes
- support: S-r1-evidence-06/P4 · rung 1 · fit direct · upstream self
- support: S-r1-evidence-06/P5 · rung 1 · fit direct · upstream self
- support: S-r1-evidence-06/P6 · rung 1 · fit direct · upstream self
- support: S-r1-evidence-06/P7 · rung 1 · fit direct · upstream self
- support: S-r1-evidence-06/P8 · rung 1 · fit direct · upstream self
- support: S-r1-evidence-06/P9 · rung 1 · fit direct · upstream self
- support: S-r1-evidence-06/P10 · rung 1 · fit direct · upstream self
- support: S-r1-evidence-06/P11 · rung 1 · fit partial (empty cell inferred from adjacency) · upstream self
- support: S-r1-evidence-06/P12 · rung 1 · fit partial · upstream self
- support: S-r1-evidence-06/P13 · rung 1 · fit direct · upstream self
- scope: table as accessed 2026-10-23; per P3 a version without a release checkmark may be a projected release (checkmarks lost in conversion, so some listed versions may be projected)
- confidence: medium (table structure flattened by the converter) · flags: none
- conflicts: none

### C-r1-evidence-14
- claim: The py-free-threading tracking page covers packages with extension modules and build tools under active free-threading work, excludes pure Python packages because pure Python code works without changes by design, and points to an automatic tracker that only checks for wheels on PyPI.
- kind: definition · questions: Q8 · load-bearing: no (where to check, complements C-10)
- support: S-r1-evidence-06/P1 · rung 1 · fit direct · upstream self
- support: S-r1-evidence-06/P2 · rung 1 · fit direct · upstream self
- scope: as accessed 2026-10-23
- confidence: high · flags: none
- conflicts: none

### C-r1-evidence-15
- claim: In Anthony Shaw's PyCon US 2024 benchmark (pi to 2000 digits on a four-core system, Python 3.13 beta 1), as reported by LWN, the threaded version took 2.41s with the GIL and 0.75s without it, while multiprocessing took 1.2s with the GIL and 1.57s without it.
- kind: number · questions: Q5, Q11 · load-bearing: yes (the only independent threads-vs-processes measurement found)
- support: S-r1-evidence-08/P1 · rung 2 · fit direct · upstream Shaw's talk
- support: S-r1-evidence-08/P2 · rung 2 · fit direct · upstream Shaw's talk
- scope: 3.13 beta 1 (2024), before the 3.14 single-thread improvements; one micro-benchmark; four cores
- confidence: medium (single benchmark, pre-release, superseded interpreter) · flags: none
- conflicts: none

### C-r1-evidence-16
- claim: Anthony Shaw (PyCon US 2024, as reported by LWN) said multiprocessing has the largest start-up time of Python's parallelism options and that distributing work to processes requires serializing data, for example with pickle.
- kind: interpretation · questions: Q11 · load-bearing: yes (why threads can replace processes)
- support: S-r1-evidence-08/P3 · rung 2 · fit direct · upstream Shaw's talk
- support: S-r1-evidence-08/P4 · rung 2 · fit partial (overhead number for 200 digits) · upstream Shaw's talk
- support: S-r1-evidence-08/P6 · rung 2 · fit direct · upstream Shaw's talk
- scope: attributed to Shaw; 2024
- confidence: medium · flags: none
- conflicts: none

### C-r1-evidence-17
- claim: Anthony Shaw (as reported by LWN, 2024) judged that free-threading will be the better choice for CPU-heavy tasks that can be easily segmented and need only quick data exchange between them.
- kind: evaluation · questions: Q11 · load-bearing: yes (attributed form only; one source)
- support: S-r1-evidence-08/P5 · rung 2 · fit direct · upstream Shaw's talk
- scope: attributed view; 2024
- confidence: medium · flags: none
- conflicts: none

## Conflicts
- C-r1-evidence-03 / C-r1-evidence-04: S-r1-evidence-04/P1 (What's New 3.14) says the single-thread penalty is "roughly 5-10%, depending on the platform and C compiler used"; S-r1-evidence-01/P1 (3.14 HOWTO, as served 2026-10-23) says "about 1% on macOS aarch64 to 8% on x86-64 Linux"; S-r1-evidence-03/P1 (PEP 779, 2025) says "around 10% (except on macOS, where it’s more like 3%)". Same project, likely different measurement dates; not settled.

## Speculation and flags
- S-r1-evidence-03 (PEP 779): vendor-about-itself; the implementers report their own overhead numbers. The 15-20% memory figure has no independent source in this file.
- C-r1-evidence-07: prediction ("we are unlikely to get this very close").
- C-r1-evidence-11: derived count by the researcher, not a printed figure.
- C-r1-evidence-15: 2024 measurement on 3.13 beta 1; the 3.14 overhead drop (C-03/C-04) means the multiprocessing-gets-slower result may not hold today.

## Unused leads
- https://labs.quansight.org/blog/scaling-numpy-on-free-threaded-python — Quansight post on a NumPy workload where threads were up to 2x slower than processes on the free-threaded build until hidden bottlenecks were fixed; fetch returned HTTP 429; strong Q11 evidence (vendor engineering post).
- https://labs.quansight.org/blog/free-threaded-one-year-recap — Quansight recap; reportedly says spawning processes is expensive and cross-process communication requires copies; not opened.
- https://labs.quansight.org/blog/scaling-asyncio-on-free-threaded-python — asyncio scaling on free-threaded 3.14 (practice angle).
- https://docs.python.org/3.14/whatsnew/3.14.html § asyncio — "scaling linearly with the number of threads" for parallel event loops (practice angle).
- https://dev.to/edgar_montano/python-314-free-threading-true-parallelism-without-the-gil-a12 — rung-3 blog: SHA-256 hashing 0.94x at 1 thread to 7.45x at 8 threads on 3.14t; follow upstream only.
- https://2025.pycon.jp/en/timetable/talk/HADBDX — PyCon JP 2025 talk comparing free-threading and multiprocessing for ML workloads.

## Queries
- "free-threaded Python 3.14 benchmark multithreaded speedup vs multiprocessing" → useful (pointers only, rung 3)
- "free-threaded build threads instead of multiprocessing scaling measurements" (domains: py-free-threading.github.io, docs.python.org, lwn.net, pyfound.blogspot.com, labs.quansight.org, engineering.fb.com) → useful
- direct fetches: docs.python.org 3.14 and 3.13 free-threading HOWTOs, What's New 3.14, PEP 779, hugovk free-threaded-wheels (+ results.json), py-free-threading tracking → useful
- 3.15 overhead: not searched (budget)
