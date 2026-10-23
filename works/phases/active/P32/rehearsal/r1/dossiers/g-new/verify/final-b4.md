# Verification: 20261023-0350-free-threaded-cpython · final-b4
- verifier: claude-sonnet-5-5 · date: 2026-10-23 · claims: 9 · supported 7 · partial 2 · contradicted 0 · not-addressed 0 · passage-not-found 0 · unreachable 0 · needs-rewrite 0
## Records
### V-C-r1-evidence-01-1
- claim: C-r1-evidence-01
- source S-r1-evidence-02 · opened: https://docs.python.org/3.13/howto/free-threading-python.html (curl; saved pages/final-b4/S-r1-evidence-02.txt) · quote-match: exact · passage at § "Single-threaded performance": found verbatim
- looked first: the section says the free-threaded build has extra overhead running Python code; in 3.13 about 40% on pyperformance; less for C-extension or I/O-heavy programs; the specializing adaptive interpreter (PEP 659) is disabled in that build; they expect to re-enable it in 3.14; aim of 10% or less.
- implied: 3.13 docs; about 40%; pyperformance suite; "largest impact" is the disabled PEP 659 interpreter (the claim's "mostly because" matches).
- verdict: supported · reason: every item in the claim is stated by the 3.13 docs page.
- bar: met (rung 1, descriptive, vendor docs about itself, attributed form) · independence: n/a · currency: page is the 3.13 series docs; the 3.14 docs and What's New give a later, lower figure (C-r1-evidence-03/04), which the scope "in 3.13" already covers.
- counter: none-found ("free-threaded Python 3.14 single-thread slowdown benchmark independent measurement", "Python 3.13 free-threaded build 40% slower pyperformance claim disputed", "What's New in Python 3.15 free-threaded performance penalty single-threaded"). A lead (Grinberg blog, 3.13 FT at 0.54x on one bubble-sort test) is consistent in direction; see Leads.

### V-C-r1-evidence-03-1
- claim: C-r1-evidence-03
- source S-r1-evidence-04 · opened: https://docs.python.org/3.14/whatsnew/3.14.html (curl; saved pages/final-b4/S-r1-evidence-04.txt) · quote-match: exact · passage at § "Free-threaded mode improvements": found verbatim (line 311)
- looked first: the section says free-threaded mode was significantly improved in 3.14, PEP 703 implementation finished, PEP 659 interpreter now enabled in free-threaded mode, and the single-threaded penalty is "now roughly 5-10%, depending on the platform and C compiler used".
- implied: 3.14 release notes; roughly 5-10%; depends on platform and compiler; PEP 659 enabled in free-threaded mode.
- verdict: supported · reason: direct match. The page names no benchmark suite for the figure; the claim does not name one either.
- bar: met (rung 1, descriptive) · independence: n/a · currency: still present in the 3.14 What's New today; the 3.14 HOWTO and the 3.15 HOWTO give 1-8% (C-r1-evidence-04, C-r2-evidence-01), a standing conflict.
- counter: none-found (same three queries as above). The 3.15 What's New (fetched, pages/final-b4/S-v4-01.txt) has no free-threaded overhead figure.

### V-C-r1-evidence-04-1
- claim: C-r1-evidence-04
- source S-r1-evidence-01 · opened: https://docs.python.org/3.14/howto/free-threading-python.html (curl; saved pages/final-b4/S-r1-evidence-01.txt) · quote-match: exact · passage at § "Single-threaded performance": found verbatim (line 78)
- looked first: the section says the free-threaded build has extra overhead running Python code, that it depends on workload and hardware, and gives the 1%-to-8% pyperformance range.
- implied: 3.14 HOWTO as served 2026-10-23; pyperformance; average overhead about 1% on macOS aarch64 to 8% on x86-64 Linux.
- verdict: supported · reason: verbatim match, scope as claimed.
- bar: met (rung 1, descriptive) · independence: n/a · currency: page carries no measurement date; the 3.14 What's New says 5-10% (conflict recorded in the claim).
- counter: none-found (same queries). Search results show translated 3.15 pages with the same 1-8%; one third-party article says the 1-8% figures describe 3.14 results.

### V-C-r1-evidence-05-1
- claim: C-r1-evidence-05
- source S-r1-evidence-03 · opened: https://peps.python.org/pep-0779/ (curl; saved pages/final-b4/S-r1-evidence-03.txt) · quote-match: exact · passage P1 at § "Rationale": found verbatim (line 46); P4 at § "Specification": found verbatim (line 51)
- looked first: the PEP (Status: Final, Resolution 16-Jun-2025) says the penalty is "currently around 10% (except on macOS, where it's more like 3%)" and, under "Specification", "Specific criteria ... as we propose them": the Steering Council expected 10-15% "although this was not a hard target"; "for phase II (not the default flip), we propose 15% as a hard performance target".
- implied: PEP 779 wording is "propose", not "set". Numbers match (10%, 3% on macOS, 15%, phase II). The PEP also says it expects "comfortably below 10% on Linux and Windows".
- verdict: partial · reason: the reported numbers are verbatim. "Set 15% as the hard performance target" overstates the PEP, which proposes it. The Steering Council's acceptance (S-v4-04, counter-evidence) restates it as: official target within 10% degradation, with changes expected to cause a slowdown of up to 15% to be discussed with the SC in advance. · narrower claim: "PEP 779 reported that the free-threaded build's single-thread penalty on pyperformance was currently around 10% (more like 3% on macOS) and proposed 15% as a hard performance target for phase II; the Steering Council's acceptance on 15 June 2025 stated the official target as within 10% performance degradation, with changes expected to cause a slowdown of up to 15% to be discussed with the SC in advance."
- bar: met for the numbers (rung 1, self-reported by the implementers; vendor-about-itself, attributed form is used) · independence: numbers come from Microsoft Faster CPython and Meta runs named in the PEP; authors are the implementers · currency: PEP is Final; the SC acceptance post refines the targets.
- counter: S-v4-04 (C-v4-01)

### V-C-r1-evidence-06-1
- claim: C-r1-evidence-06
- source S-r1-evidence-03 · opened: https://peps.python.org/pep-0779/ (curl) · quote-match: exact · passage P2 at § "Rationale": found verbatim (line 47); P5 at § "Specification": found verbatim (line 52)
- looked first: the memory item says "free-threaded Python currently sees about 15-20% higher memory use (geometric mean, as measured by pyperformance)" and that the authors "haven't spent a lot of time trying to lower this yet"; under "Specification": "We propose a target of 20% (geometric mean, as measured by pyperformance) for phase II."
- implied: 15-20% higher memory, geometric mean, pyperformance; 20% is a proposed target for phase II. The 20% figure is verbatim; "set" is again "propose".
- verdict: partial · reason: the measurement is verbatim. "Set a 20% memory target" overstates a proposal. The SC acceptance (S-v4-04) says memory increases "must stay below 15%", with a hard limit of 20% for changes needing SC discussion. · narrower claim: "PEP 779 reported that free-threaded Python currently used about 15-20% more memory than the with-GIL build (geometric mean on pyperformance) and proposed a 20% target for phase II; the Steering Council's acceptance says memory increases must stay below 15%, with a hard limit of 20%."
- bar: met for the measurement (rung 1, self-reported, attributed) · independence: single source for the figure; no independent measurement found in this pass (an arXiv preprint on 3.14.2 reports a general memory increase with no percentage, see Leads) · currency: the PEP numbers are 2025, 3.14 development.
- counter: S-v4-04 (C-v4-01)

### V-C-r1-evidence-11-1
- claim: C-r1-evidence-11
- source S-r1-evidence-07 · opened: https://hugovk.github.io/free-threaded-wheels/results.json (curl; raw JSON saved as pages/final-b4/S-r1-evidence-07.html) · quote-match: approximate (JSON lines) · last_update line 2524: found verbatim, "Thursday, 22 October 2026, 10:16:54 UTC"
- source (context) https://hugovk.github.io/free-threaded-wheels/ (curl; pages/final-b4/hugovk-index.txt): "This site shows the top 360 most-downloaded packages with extensions on PyPI".
- looked first: the JSON has a "data" array of entries with name, downloads and a boolean "free_threaded_wheel"; the index page says the site lists the top 360 most-downloaded packages with extensions.
- implied: I re-counted. `"free_threaded_wheel": true` 219; `"free_threaded_wheel": false` 141; `"name":` 360. 219 + 141 = 360. Snapshot date 22 Oct 2026.
- verdict: supported · reason: independent re-count matches 219 of 360. "Had free-threaded wheels" = flag true; the page defines the dark-green flag as offering free-threaded wheels.
- bar: met (rung 1, a dataset about itself; a derived count that the claim already labels as a count) · independence: n/a; one dataset · currency: the page is updated daily, so the count is a snapshot, as the claim states.
- counter: none-found ("free-threaded wheels PyPI top packages support percentage tracker October 2026"). A psutil blog post (2025) cites 128 of 360 at an earlier date, consistent with growth; LWN (S-r2-evidence-05) quotes Wouters saying more than 50% of the top 360, consistent with 219/360 (61%).

### V-C-r1-evidence-15-1
- claim: C-r1-evidence-15
- source S-r1-evidence-08 · opened: https://lwn.net/Articles/985041/ (curl; saved pages/final-b4/S-r1-evidence-08.txt) · quote-match: exact · passages P1, P2 at § "Faster?": found verbatim (line 40)
- looked first: the "Faster?" section reports Shaw's benchmark of pi to 2000 digits on the newly released 3.13 beta 1, with and without the GIL, on a four-core system; he notes regular Python code runs slower without the GIL because specializations are disabled. An earlier paragraph says 3.13 beta 1 had been released in early May.
- implied: threaded 2.41s with the GIL, 0.75s without; multiprocessing 1.2s with the GIL, 1.57s without; four cores; 3.13 beta 1; PyCon US 2024 (index entry "PyCon/2024"). Subinterpreters (0.76s, 0.99s) are not in the claim.
- verdict: supported · reason: all numbers and conditions match the LWN report. Single micro-benchmark, pre-release interpreter, as the claim's scope already says.
- bar: met (rung 2, edited reporting of the speaker's own measurement, attributed) · independence: one reporter, one talk · currency: pre-release 3.13, superseded by 3.14 improvements; the claim names the version.
- counter: none-found ("Anthony Shaw free-threading subinterpreters multiprocessing pi digits benchmark results Python 3.13"); no rerun on 3.13 final or 3.14 turned up. Grinberg's 2025 blog test shows threaded CPU-bound code about 2.2x (3.13) and 3.1x (3.14) faster on free-threading, a different benchmark; see Leads.

### V-C-r2-evidence-01-1
- claim: C-r2-evidence-01
- source S-r2-evidence-01 · opened: https://docs.python.org/3.15/howto/free-threading-python.html (curl; saved pages/final-b4/S-r2-evidence-01.txt) · quote-match: exact · passage P1 at § "Single-threaded performance": found verbatim (line 78) · P6 footer: found by substance (page now reads "Last updated on Oct 22, 2026 (19:57 UTC)", the researcher saw 18:46 UTC; same date, rebuilt later)
- looked first: the section says the free-threaded build has additional overhead executing Python code, that the amount depends on workload and hardware, and gives the 1%-to-8% pyperformance range. No measurement date or Python version is printed for the figure. The header reads "Python 3.15.1 documentation".
- implied: 3.15 HOWTO; last updated 22 Oct 2026; overhead depends on workload and hardware; 1% (macOS aarch64) to 8% (x86-64 Linux); no measurement date.
- verdict: supported · reason: all parts stated. The scope caveat (text identical to the 3.14 HOWTO, so possibly carried over) is the researcher's inference and is confirmed: the two texts are identical.
- bar: met (rung 1, descriptive) · independence: n/a; same text as the 3.14 HOWTO, so not a second measurement · currency: current 3.15.1 docs; the 3.15 What's New has no free-threaded overhead figure.
- counter: none-found ("What's New in Python 3.15 free-threaded performance penalty single-threaded", "free-threaded Python 3.14 single-thread slowdown benchmark independent measurement"). One search summary said an English 3.15 alpha copy showed 5-10%; the current page shows 1-8%.

### V-C-r2-evidence-03-1
- claim: C-r2-evidence-03
- source S-r2-evidence-05 · opened: https://lwn.net/Articles/1078367/ (curl; saved pages/final-b4/S-r2-evidence-05.txt) · quote-match: exact · passages P1, P2 at § "Status": found verbatim (line 54)
- looked first: the article (Jake Edge, June 22, 2026) covers Wouters's PyCon US 2026 talk. For 3.14 it says free-threaded Python was "much safer" and "much faster" with a 0-10% slowdown for single-threaded workloads; the 0% is on Arm hardware in his words; on Linux with GCC it is usually around 5%, up to 10% particularly with older compilers.
- implied: speaker Thomas Wouters; talk at PyCon US 2026; reported by LWN dated 22 June 2026; Python 3.14; 0-10% single-threaded slowdown; about 5% on Linux with GCC; up to 10% with older compilers; no benchmark suite named. The figures are in the reporter's voice about the talk, not direct quotes (apart from the quoted Arm remark).
- verdict: supported · reason: each part matches; attribution to Wouters is through the LWN report, as the claim says.
- bar: met (rung 2, attributed to the speaker, who is a PEP 779 co-author with a stake) · independence: LWN is independent of the PSF docs; Wouters's figure is a separate source from the docs ranges · currency: dated June 2026, about 3.14 (released October 2025).
- counter: none-found (same queries as above); the figure is compatible with the docs ranges.

## Counter-evidence

### S-v4-04
- url: https://discuss.python.org/t/pep-779-criteria-for-supported-status-for-free-threaded-python/84319/123 · canonical: discuss.python.org/t/pep-779-criteria-for-supported-status-for-free-threaded-python/84319/123
- title: PEP 779: Criteria for supported status for free-threaded Python (post 123, Steering Council decision) · authors: Donghee Na, on behalf of the Steering Council · publisher: Python Software Foundation (discuss.python.org)
- date: 2025-06-15 (post date per page; the PEP header gives Resolution 16-Jun-2025) · version: n/a
- accessed: 2026-10-23 · read-via: curl · quote-match: exact · archive: none
- kind: other (official decision announcement posted on the project forum) · peer-review: n/a
- owner: Python Steering Council · upstream: none
- lateral: PEP 779 lists a Discourse thread as its discussions-to; the post is signed "Donghee, on behalf of the Steering Council", and the PEP header gives its resolution date as 16-Jun-2025.
- passages:
  - P1 · § "Performance and memory guard rails": "While the official target is to stay within 10% performance degradation, any changes expected to cause a slowdown of up to 15% should be discussed with the SC in advance."
  - P2 · § "Performance and memory guard rails": "Memory usage increases must stay below 15% compared to the GIL build. Similarly, any changes expected to increase memory above 15% (with a hard limit of 20%) should be discussed with the SC in advance."

### C-v4-01
- claim: The Python Steering Council's June 2025 acceptance of PEP 779 stated that the official target is to stay within 10% performance degradation (changes expected to slow down by up to 15% to be discussed with the Steering Council in advance), and that memory increases must stay below 15% compared to the GIL build, with a hard limit of 20%.
- kind: fact
- questions: Q5 · load-bearing: yes (bears on how C-r1-evidence-05 and C-r1-evidence-06 describe the phase II targets)
- support: S-v4-04/P1, S-v4-04/P2 · rung 1 · fit direct · upstream self
- scope: Steering Council guard rails attached to the approval of PEP 779 for 3.14
- confidence: high · flags: none
- conflicts: S-r1-evidence-03/P4 "we propose 15% as a hard performance target"; S-r1-evidence-03/P5 "We propose a target of 20%" (a refinement: the SC's wording differs from the PEP's proposal)

## Leads
- https://blog.miguelgrinberg.com/post/python-3-14-is-here-how-fast-is-it — blog (rung 3): independent single-thread test with free-threaded 3.14 at about 0.86x and 3.13 at 0.54x (bubble sort, Linux and macOS); text says 3.14 FT ran at "91% of the speed" on the other test; threaded CPU-bound tests about 2.2x (3.13) and 3.1x (3.14) faster. Fetched (pages/final-b4/S-v4-03.txt); useful as a pointer only.
- https://arxiv.org/abs/2603.04782 — preprint (Montoya Salazar, March 2026): measures GIL vs free-threaded 3.14.2 and reports a general memory increase (more in virtual than physical memory) and a 13-43% energy increase for sequential workloads; no memory percentage in the abstract. Not peer-reviewed as far as the page shows. Fetched (pages/final-b4/S-v4-02.txt).
- https://psutil.readthedocs.io/latest/blog/2025/wheels-for-free-threaded-python.html — blog (2025) cites an earlier hugovk snapshot (128 of 360); shows time-dependence of the C-r1-evidence-11 count. Not opened.
