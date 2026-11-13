# Verification: 20261023-0350-free-threaded-cpython · final-b1
- verifier: claude-sonnet-5-5 · date: 2026-10-23 · claims: 15 · supported 14 · partial 1 · contradicted 0 · not-addressed 0 · passage-not-found 0 · unreachable 0 · needs-rewrite 0

All pages were fetched fresh with curl (HTTP 200) and converted to text in `<dossier>/pages/final-b1/` (S-r1-foundations-01, -02, -03, -06, -07; S-r2-evidence-02, -05; S-r2-practice-02, -06). S-r2-criticism-05 is the same URL as S-r2-evidence-02 (docs.python.org/3.15/whatsnew/3.15.html) and was read from that copy. The `--check` run against the findings files found every passage cited below verbatim. No claim in this batch is `main`, so no counter-evidence search was run.

## Records

### V-C-r1-foundations-37-1
- claim: C-r1-foundations-37
- source S-r1-foundations-07 · opened: https://discuss.python.org/t/pep-779-criteria-for-supported-status-for-free-threaded-python/84319/123 (curl) · quote-match: exact · passage P7 at § "PEP 779: Criteria for supported status for free-threaded Python": found verbatim
- looked first: n/a (not load-bearing)
- implied: post dated June 15, 2025, by Donghee Na "on behalf of the Steering Council". The SC says the community "should broadly advertise that free-threading is a supported Python build option now and into the future, and that it will not be removed without following a proper deprecation schedule." The 3.14 What's New (S-r1-foundations-06) repeats this wording in a note.
- verdict: supported · reason: the SC statement is phrased as a recommendation to advertise this; the claim's reading (the SC affirms it) follows directly from that.
- bar: met (non-load-bearing, one rung-1 source) · independence: n/a · currency: no later change found in the 3.15 notes
- counter: not run

### V-C-r1-foundations-38-1
- claim: C-r1-foundations-38
- source S-r1-foundations-01 · opened: https://peps.python.org/pep-0703/ (curl) · quote-match: exact · P38 (§ "Greg Stein's Free-Threading Patch"), P39 (§ "Gilectomy"), P40 (§ "Reference Implementation"): found verbatim
- looked first: n/a
- implied: P38: "In 1996, Greg Stein published a patch against Python 1.4 that removed the GIL". P39: "Gilectomy [18] was a project by Larry Hastings to remove the GIL in CPython." P40: "The nogil repository is based on Python 3.9.10." Both lie under "Related Work" (P38 and P39). In context, the PEP names two repositories, `colesbury/nogil-3.12` (based on 3.12.0a4) and `colesbury/nogil` (based on 3.9.10). It calls nogil-3.12 "a reference implementation for this PEP" and says the 3.9.10 one is "more stable and well tested". The PEP never calls the 3.9.10 repository a "fork".
- verdict: partial · reason: the Stein and Gilectomy parts are supported. "Its own reference implementation, the 'nogil' fork based on Python 3.9.10" presents one of two repositories as the reference implementation; the PEP also names nogil-3.12 (3.12.0a4) as a reference implementation. · narrower claim: "PEP 703 lists earlier GIL-removal efforts, including Greg Stein's 1996 patch against Python 1.4 and Larry Hastings's Gilectomy, and points to two reference repositories, nogil-3.12 (based on Python 3.12.0a4) and nogil (based on Python 3.9.10)."
- bar: met for the narrower claim (rung 1 for descriptive content) · independence: n/a · currency: PEP 703 is Final, 2023
- counter: not run

### V-C-r1-foundations-40-1
- claim: C-r1-foundations-40
- source S-r1-foundations-07 · opened: same URL as above (curl) · quote-match: exact · P9: found verbatim
- source S-r1-foundations-06 · opened: https://docs.python.org/3/whatsnew/3.14.html (curl) · quote-match: exact · P3 at § "Free-threaded Python is officially supported": found verbatim
- looked first: n/a
- implied: the SC post: "any decision to transition to Phase III, with free-threading as the default or sole build of Python is still undecided, and dependent on many factors both within CPython itself and the community. We leave that decision for the future." The 3.14 notes repeat this wording and end with "This decision is for the future." A grep of the 3.15 What's New text found no phase II or phase III statement.
- verdict: supported · reason: both sources say it. The scope "as of June 2025 / 3.14" is respected. I found no later rung-1 statement in the 3.15 notes.
- bar: met (non-load-bearing) · independence: the 3.14 notes derive from the SC post (the claim records this) · currency: nothing newer seen in the 3.15 What's New
- counter: not run

### V-C-r1-foundations-41-1
- claim: C-r1-foundations-41
- source S-r1-foundations-02 · opened: https://peps.python.org/pep-0779/ (curl) · quote-match: exact · P5 at § "Specification": found verbatim; P7 at § "Motivation": found verbatim
- looked first: n/a
- implied: "(Note that these are requirements for entering phase II only. The decision to make free-threaded Python the default (phase III) is very different, and we expect it will revolve around community support, willingness, and showing clear benefit. That's left for a future PEP.)" The speaker is the PEP's authors, who say "we expect".
- verdict: supported · reason: each element (very different, community support, willingness, clear benefit, left for a future PEP) is in the passage.
- bar: met (attributed to the PEP) · independence: n/a · currency: PEP 779 is Final (2025)
- counter: not run

### V-C-r1-foundations-43-1
- claim: C-r1-foundations-43
- source S-r1-foundations-01 · opened: https://peps.python.org/pep-0703/ (curl) · quote-match: exact · P41, P42 at § "Python Build Modes": found verbatim
- looked first: n/a
- implied: the section sits under "Open Issues". It says "The path to this goal remains an open issue, but a possible path might look like the following". Step 2: "After 2–3 releases, (i.e., in 2026–2027), CPython is released with the GIL controlled by a runtime environment variable or flag. The GIL is enabled by default. There is only a single ABI." Step 3: "After another 2–3 release (i.e., 2028–2030), CPython switches to the GIL being disabled by default." The speaker is "The author" (Sam Gross).
- verdict: supported · reason: the claim keeps the hedge ("open issue rather than a plan", "possible path") and the dates. It is attributed speculation from 2023.
- bar: met in attributed form · independence: n/a · currency: a 2023 forecast. The actual path differs (the SC acceptance post sets out phases), but the claim is only about what the PEP sketched.
- counter: not run

### V-C-r1-foundations-44-1
- claim: C-r1-foundations-44
- source S-r1-foundations-03 · opened: https://discuss.python.org/t/a-steering-council-notice-about-pep-703-making-the-global-interpreter-lock-optional-in-cpython/30474 (curl) · quote-match: exact · P8: found verbatim
- looked first: n/a
- implied: post dated July 28, 2023 (Thomas Wouters, "Posting for the whole Steering Council"). The bullet is "Long-term, we want no-GIL to be the default, and to remove any vestiges of the GIL … We think it may take as much as five years to get to this stage."
- verdict: supported · reason: "this stage" is the long-term stage where no-GIL is the default and the GIL's vestiges are removed. This matches the claim's "stage where no-GIL is the default"; the extra "remove vestiges" is a mild narrowing and does not contradict it.
- bar: met in attributed form · independence: n/a · currency: a 2023 estimate, superseded in practice by later SC posts. The claim is dated correctly.
- counter: not run

### V-C-r2-evidence-04-1
- claim: C-r2-evidence-04
- source S-r2-evidence-05 · opened: https://lwn.net/SubscriberLink/1078367/eaa511915870fdb2/ (curl) · quote-match: exact · P3 at § "Status": found verbatim
- looked first: n/a
- implied: LWN, Jake Edge, June 22, 2026, reporting Thomas Wouters's PyCon US 2026 talk. The text reads: "Python 3.13, which was released in October 2024, had experimental free-threading support. It was 'relatively slow, with 20-40% slowdown on single-threaded workloads'. It had thread-safety issues and some scalability problems, where adding more threads could make things go slower." The 20-40% fragment is a direct quote of Wouters. The scalability sentence is LWN's paraphrase of the talk.
- verdict: supported · reason: the range, the scalability problem and the "more threads could slow things" detail are all present, and the section reports Wouters's talk.
- bar: met (rung 2, independent edited reporting; the speaker has a stake as a Meta free-threading developer, which the claim attributes) · independence: single source · currency: historical (3.13)
- counter: not run

### V-C-r2-evidence-05-1
- claim: C-r2-evidence-05
- source S-r2-evidence-05 · opened: same URL (curl) · quote-match: exact · P4 at § "Status": found verbatim
- looked first: n/a
- implied: "Coming in October this year is Python 3.15 … There are also a lot of scalability improvements for free threading coming in 3.15." No numbers are given anywhere in the article for 3.15. The talk was in mid-May 2026 ("held in Long Beach, California in mid-May"). The sentence is LWN's report within the Status section of the talk. Attribution to Wouters comes from the article's structure, not from a "Wouters said" at that sentence.
- verdict: supported · reason: the statement, the date and the absence of figures all check out. The attribution to Wouters is implicit in the article's framing, which is reasonable.
- bar: met (attributed forward-looking statement, rung 2) · independence: single source · currency: 3.15 has since been released (9 October 2026). The 3.15 What's New highlights list gives no free-threading figure.
- counter: not run

### V-C-r2-evidence-06-1
- claim: C-r2-evidence-06
- source S-r2-evidence-02 · opened: https://docs.python.org/3.15/whatsnew/3.15.html (curl) · quote-match: exact · P1 at § "What's new in Python 3.15": found verbatim; P2, P3 at § "Summary – Release highlights": found verbatim
- looked first: n/a
- implied: the full highlights list (lines 154-179) was read. It has a C API bullet "PEP 803, 820, 793: Stable ABI for free-threaded builds and related C API" and a Release changes bullet "The official macOS binaries now install free-threading support by default". The intro text also says "The biggest changes include … a stable ABI for free-threaded builds." No free-threading performance or overhead number appears in the highlights list. The release date is stated as 9 October 2026.
- verdict: supported · reason: the list items match, and I read the whole highlights section, which confirms the absence of a free-threading performance figure there.
- bar: met (rung 1, descriptive) · independence: n/a · currency: page served as the 3.15.1 docs on 2026-10-23
- counter: not run

### V-C-r2-evidence-15-1
- claim: C-r2-evidence-15
- source S-r2-evidence-05 · opened: same URL (curl) · quote-match: exact · P10 at § "Motivation": found verbatim
- looked first: n/a
- implied: "There are some additional reasons, beyond performance, that a language like Python needs threads. For example, continuing to execute the main program while calling into blocking APIs or when interacting with a third-party library that requires using threads to access it, 'commonly databases'." The "commonly databases" fragment is a direct quote of Wouters.
- verdict: supported · reason: the two reasons and the "commonly databases" detail match the claim.
- bar: met (attributed, rung 2) · independence: single source · currency: June 2026 talk report
- counter: not run

### V-C-r2-evidence-16-1
- claim: C-r2-evidence-16
- source S-r2-evidence-05 · opened: same URL (curl) · quote-match: exact · P11 at § "Motivation": found verbatim
- looked first: n/a
- implied: "He is a big proponent of asyncio and thinks it is the best way to do network I/O, 'where threads can easily lead you wrong'." Wouters's words are only the quoted fragment. The rest is LWN's paraphrase, and the claim keeps the attribution.
- verdict: supported · reason: an attributed opinion, correctly marked "he thinks". The "best" superlative is his, as reported by LWN.
- bar: met in attributed form only; it must not be restated in the chapter's own voice · independence: single source · currency: June 2026
- counter: not run

### V-C-r2-criticism-12-1
- claim: C-r2-criticism-12
- source S-r2-criticism-05 · opened: https://docs.python.org/3.15/whatsnew/3.15.html (curl; same page as S-r2-evidence-02, read from that saved copy) · quote-match: exact · P3 at § "Summary – Release highlights": found verbatim (line 179)
- looked first: n/a
- implied: "The official macOS binaries now install free-threading support by default" under "Release changes". The page is 3.15.1 documentation, and 3.15 was released on 9 October 2026.
- verdict: supported · reason: directly stated.
- bar: met (rung 1) · independence: n/a · currency: current release notes
- counter: not run

### V-C-r2-practice-06-1
- claim: C-r2-practice-06
- source S-r2-practice-02 · opened: https://docs.python.org/3/library/asyncio-dev.html (curl) · quote-match: exact · P3: found verbatim (line 68). The converter reports the nearest heading as "Wait for the result:", a code-comment artifact; the actual section is "Concurrency and Multithreading".
- looked first: n/a
- implied: "The loop.run_in_executor() method can be used with a concurrent.futures.ThreadPoolExecutor or InterpreterPoolExecutor to execute blocking code in a different OS thread without blocking the OS thread that the event loop runs in."
- verdict: supported · reason: it matches nearly word for word. The scope note "InterpreterPoolExecutor exists from 3.14" is not in the passage and is not part of the claim text, so I did not check it.
- bar: met (rung 1) · independence: n/a · currency: 3.15.1 docs
- counter: not run

### V-C-r2-practice-10-1
- claim: C-r2-practice-10
- source S-r2-practice-02 · opened: same URL (curl) · quote-match: exact · P4 at § "Debug Mode": found verbatim (line 51)
- looked first: n/a
- implied: under "When the debug mode is enabled:": "Many non-threadsafe asyncio APIs (such as loop.call_soon() and loop.call_at() methods) raise an exception if they are called from a wrong thread."
- verdict: supported · reason: it matches the passage and its context (debug mode).
- bar: met (rung 1) · independence: n/a · currency: 3.15.1 docs
- counter: not run

### V-C-r2-practice-11-1
- claim: C-r2-practice-11
- source S-r2-practice-06 · opened: https://docs.python.org/3/library/asyncio-threading.html (curl) · quote-match: exact · P5: found verbatim (line 35, "See also" under § "asyncio and free-threaded Python")
- looked first: n/a
- implied: "Scaling asyncio on Free-Threaded Python, a blog post by Kumar Aditya which explains the internal changes that make asyncio safe and efficient under free-threaded Python, together with benchmarks of the resulting improvements." The page's HTML link for it points to https://labs.quansight.org/blog/scaling-asyncio-on-free-threaded-python. The claim concerns only what the docs point to, and says no benchmark number is claimed.
- verdict: supported · reason: it matches the passage, and the link target confirms the post.
- bar: met (rung 1, for the attributed pointer only; the blog's own content was not read) · independence: n/a · currency: page last updated Oct 22, 2026
- counter: not run

## Counter-evidence
(none; no claim in this batch was marked `main`)

## Leads
- https://labs.quansight.org/blog/scaling-asyncio-on-free-threaded-python — the post the 3.15.1 docs cite for asyncio scaling benchmarks. The researcher got HTTP 429, and I did not fetch it.
