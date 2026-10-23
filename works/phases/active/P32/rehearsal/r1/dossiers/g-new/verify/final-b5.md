# Verification: 20261023-0350-free-threaded-cpython · final-b5
- verifier: claude-sonnet-5-5 · date: 2026-10-23 · claims: 8 · supported 8 · partial 0 · contradicted 0 · not-addressed 0 · passage-not-found 0 · unreachable 0 · needs-rewrite 0
## Records
### V-C-r1-foundations-36-1
- claim: C-r1-foundations-36
- source S-r1-foundations-06 · opened: https://docs.python.org/3/whatsnew/3.14.html (curl, saved pages/final-b5/S-r1-foundations-06.txt) · quote-match: exact · passage at § "Free-threaded Python is officially supported": found verbatim (line 1444)
- looked first: the 3.14 What's New says the free-threaded build "is now supported and no longer experimental", names this the start of phase II, and says the move to phase III (free-threading as default or sole build) "is still undecided". PEP 779 (S-v5-05) says the same about phases and targets Python 3.14.
- implied: version 3.14; free-threaded build officially supported; no longer experimental; start of phase II; phase II = officially supported but still optional. All stated.
- verdict: supported · reason: the passage states every element of the claim.
- bar: met (descriptive, rung 1: PSF release notes about its own release; PEP 779 Final, Python-Version 3.14, agrees) · independence: n/a (descriptive, one rung-1 source suffices; PEP 779 is a second PSF document, not an independent party) · currency: 3.15.1 What's New has no phase III decision or reversal (grep for "phase III", "experimental" found only the JIT as experimental); search found no Steering Council phase III decision.
- counter: none-found ("free-threaded Python phase III default build decision PEP 779 2026", "free-threaded Python 3.14 officially supported experimental still caveats single-thread slowdown limitations"). Results only add caveats (opt-in, C-extension compatibility, 5-10% single-thread cost), not a different status. Lateral read: PEP 779 (S-v5-05) is the Steering Council-accepted source of the phase II criteria; it agrees.

### V-C-r1-foundations-07-1
- claim: C-r1-foundations-07
- source S-r1-foundations-04 · opened: https://docs.python.org/3/howto/free-threading-python.html (curl) · quote-match: exact · passage at § "Identifying free-threaded Python" P5: found verbatim (line 54); P6: found verbatim (line 55)
- source S-r1-foundations-05 · opened: https://docs.python.org/3/whatsnew/3.13.html (curl) · quote-match: exact · passage at § "Free-threaded CPython" P3: found verbatim (line 229)
- looked first: the howto's "Identifying free-threaded Python" section gives three tools: the "free-threading build" text in python -VV and sys.version, sys._is_gil_enabled(), and the Py_GIL_DISABLED config var. It calls the last "the recommended mechanism for decisions related to the build configuration". The 3.13 notes give "experimental free-threading build".
- implied: python -VV and sys.version contain "free-threading build" (3.13: "experimental free-threading build"); sys._is_gil_enabled() checks whether the GIL is actually disabled in the running process; sysconfig.get_config_var("Py_GIL_DISABLED") == 1 means the build supports free threading and is the recommended check for build configuration. All stated. The 3.15.1 howto header is current.
- verdict: supported · reason: each of the three checks and the 3.13 wording appear in the cited passages.
- bar: met (descriptive, rung 1 official docs) · independence: n/a · currency: howto is the 3.15.1 docs; sys docs (WebFetch) say sys._is_gil_enabled() was added in 3.13 and is a CPython implementation detail, which does not conflict.
- counter: none-found ("sysconfig Py_GIL_DISABLED Windows returns None free-threaded issue"). The result (CPython issue 143423, search-result summary only, not opened) concerns code using `is not None` on a variable that is 0 on non-free-threaded Windows builds; it agrees that the test is "== 1"/truthiness, as the claim says.

### V-C-r1-practice-05-1
- claim: C-r1-practice-05
- source S-r1-practice-05 · opened: https://docs.python.org/3.15/whatsnew/3.15.html (curl) · quote-match: exact · passage at § "What's new in Python 3.15" P1: found verbatim (line 146)
- source S-v5-01 · opened: https://www.python.org/downloads/release/python-3150/ (webfetch) · quote-match: approximate · passage: found by substance ("Release date: Oct. 9, 2026")
- looked first: the What's New page header is "Python 3.15.1 documentation" and says "Python 3.15 was released on 9 October 2026". The python.org release page for 3.15.0 gives the same release date. A search summary says PEP 790 scheduled 1 October 2026 and an rc3 delay moved it to 9 October (not opened; explains the date the researcher saw in snippets).
- implied: Python 3.15 (3.15.0 final) released 9 October 2026. Stated by both pages.
- verdict: supported · reason: two separate PSF pages give the same date; the 1 October figure is the superseded schedule, not a release date.
- bar: met (exceptional flag: two sources, each rung 1; both PSF-owned, so independence is limited to different pages, but a release date is the organization's own fact) · independence: What's New (docs.python.org) and release page (python.org) are separate documents with the same owner; neither is a copy of the other as far as seen · currency: 3.15.1 docs exist, consistent with a release two weeks earlier.
- counter: none-found ("Python 3.15.0 final release date October 2026"). The search surfaced the PEP 790 date of 1 October and the rc3 postponement to 9 October; this is a superseded plan, not a counter.

### V-C-r2-criticism-10-1
- claim: C-r2-criticism-10
- source S-r2-criticism-05 · opened: https://docs.python.org/3.15/whatsnew/3.15.html (same URL as S-r1-practice-05, fetched again as pages/final-b5/S-r1-practice-05.txt) · quote-match: exact · passage at § "What's new in Python 3.15" P1: found verbatim (line 146)
- looked first: same page and checks as V-C-r1-practice-05-1.
- implied: Python 3.15 was released on 9 October 2026. Stated.
- verdict: supported · reason: identical claim and identical passage to C-r1-practice-05.
- bar: met (descriptive, rung 1; python.org release page S-v5-01 agrees) · independence: as for C-r1-practice-05 · currency: as for C-r1-practice-05.
- counter: none-found (same queries as for C-r1-practice-05; no new query run).

### V-C-r2-practice-12-1
- claim: C-r2-practice-12
- source S-r2-practice-01 · opened: https://peps.python.org/pep-0803/ (curl) · quote-match: exact · P1 (header fields): found verbatim (lines 13-14, 21-22, 25-26); P2 § "Important": found verbatim (line 72)
- looked first: the PEP header gives Status Final, Python-Version 3.15, Resolution 30-Mar-2026; the Important box says it is a historical document and names "Stable Application Binary Interfaces" and "Migrating to Stable ABI for free threading (abi3t)" as the canonical docs. Both named docs exist at docs.python.org (S-v5-03, S-v5-02) and say abi3t is supported from 3.15.
- implied: PEP 803 title; status Final; Python 3.15; resolution date 30-Mar-2026; self-described historical document; canonical docs named. All stated.
- verdict: supported · reason: header and note match the claim item by item.
- bar: met (descriptive, rung 1: the PEP itself) · independence: n/a · currency: search results showed older Draft copies (mirror sites); the live PEP page says Final, and the 3.15 docs implement it.
- counter: S-v5-08 (C-v5-01). The 3.15.1 "C API Extension Support for Free Threading" howto still says the free-threaded build does not currently support the Limited C API or the stable ABI. This is the known D-02 tension. It does not contradict C-r2-practice-12, which is about the PEP's status. Search "PEP 803 abi3t criticism limitations problems adoption free-threaded stable ABI" found only design discussion on discuss.python.org (rung 3, lead).

### V-C-r2-practice-13-1
- claim: C-r2-practice-13
- source S-r2-practice-01 · opened: https://peps.python.org/pep-0803/ (curl) · quote-match: exact · P6 § "The abi3t wheel and filename tags": found verbatim (line 219); P7: found verbatim (line 222)
- source S-v5-03 · opened: https://docs.python.org/3/c-api/stable.html (curl) · P: found verbatim (§ "Stable Application Binary Interfaces")
- source S-v5-06 / S-v5-07 · opened: https://raw.githubusercontent.com/python/cpython/3.15/Python/dynload_shlib.c and .../3.14/Python/dynload_shlib.c (curl; branch heads as fetched 2026-10-23, not commit-pinned) · found verbatim
- looked first: for the loading rules the PEP says all builds load abi3t, free-threaded builds "unlike in 3.14" do not load abi3, and lists python3.15t suffixes ['.cpython-315-x86_64-linux-gnu.so', '.abi3t.so', '.so']. The 3.15 docs say "Free-threaded interpreters only recognize the abi3t tag, while non-free-threaded ones will prefer abi3 but fall back to abi3t". In CPython source, the 3.15 file-suffix table wraps the `.abi3.so` entries in `#ifndef Py_GIL_DISABLED` and always lists `.abi3t.so`; the 3.14 table lists `.abi3.so` with no such guard.
- implied: in 3.15 GIL-enabled and free-threaded builds both load abi3t; free-threaded builds do not load the abi3 tag, unlike 3.14; python3.15t suffixes on x86_64 Linux are the three listed (as given by the PEP). All stated; the 3.14 contrast is confirmed by the 3.14 source. Source also has optional SOABI_PLATFORM-prefixed entries, so a real 3.15t list may carry extra platform-specific entries; the claim attributes the list to the PEP and says it was not checked on a real 3.15t, so this is in scope.
- verdict: supported · reason: the PEP states it verbatim, and the 3.15.1 docs and the 3.15 and 3.14 source tables independently agree.
- bar: met (exceptional flag: three rung-1 artifacts (spec, docs, code); they share an owner (PSF) and lineage (docs and code implement the PEP), so strict independence is not met, but docs and code are separate artifacts checked against the same behaviour; no rung-2 source exists for loader behaviour) · independence: PEP vs docs vs source tables are different documents, same owner · currency: PEP is Final; docs are 3.15.1.
- counter: none-found ("PEP 803 abi3t criticism limitations problems adoption free-threaded stable ABI", "Migrating to Stable ABI for free threading abi3t docs.python.org"). One discuss.python.org participant (search summary, rung 3) calls free-threaded builds loading .abi3.so a bug, which agrees with the 3.14 behaviour. No source says 3.15t loads abi3.

### V-C-r2-practice-16-1
- claim: C-r2-practice-16
- source S-r2-practice-01 · opened: https://peps.python.org/pep-0803/ (curl) · quote-match: exact · P3 § "Abstract": found verbatim (line 78); P9 § "Recommendations for build tools": found verbatim (line 236); P8 § "Recommendations for installers": found verbatim (line 225)
- source S-v5-02 · opened: https://docs.python.org/3/howto/abi3t-migration.html (curl) · P: found verbatim (§ "Tagging and distribution")
- looked first: the Abstract encourages compiling for both ABIs at once and tagging abi3.abi3t; the build-tools section gives cp315-abi3.abi3t as compatible with 3.15, 3.16 and later; the installers section recommends allowing abi3t wheels for free-threaded builds wherever abi3 wheels are allowed for otherwise equal non-free-threaded builds. The 3.15.1 migration howto gives the ABI tag abi3.abi3t and the example wheel name myproject-1.0-cp315-abi3.abi3t-macosx_11_0_arm64.whl.
- implied: PEP 803 encourages dual compile and the abi3.abi3t tag; a cp315-abi3.abi3t wheel is compatible with 3.15, 3.16 and later; installers should allow abi3t wheels for free-threaded builds where they allow abi3 wheels for non-free-threaded builds. All stated. Installer adoption not claimed.
- verdict: supported · reason: three PEP passages match the three parts; the howto confirms the tag.
- bar: met (descriptive, rung 1) · independence: n/a · currency: PEP Final; howto is 3.15.1.
- counter: none-found ("cp315-abi3.abi3t wheel tag pip packaging support", "PEP 803 abi3t criticism limitations problems adoption free-threaded stable ABI"). The first search found no source on whether pip or packaging handles the abi3t tag; this does not bear on what the PEP recommends (scope note: "installer adoption not verified" stands). An early critic of the PEP (search summary, rung 3) found the dual-tag scheme cumbersome; that is criticism of the design, not a contradiction.

### V-C-r3-practice-07-1
- claim: C-r3-practice-07
- source S-r3-practice-07 · opened: https://raw.githubusercontent.com/python/cpython/88b0f7da77b44631e2750a8eae6277e54a7ac3cd/Python/import.c (curl, pinned at the sha; saved as pages/final-b5/S-r3-practice-07.c) · quote-match: exact · passage at Python/import.c:L1670-L1681: found verbatim (P1, all pieces found in order); L1652-L1658: found verbatim (P2)
- looked first: in the file, the GIL-related code under `#ifdef Py_GIL_DISABLED` is `_PyImport_CheckGILForModule` (lines 1644-1667) and `_PyImport_EnableGILAndWarn` (1670-1689). The check calls the warn function when the module is not a module object or `md_requires_gil` is set; otherwise it disables the GIL.
- implied: the warning is `PyErr_WarnFormat(PyExc_RuntimeWarning, 1, "The global interpreter lock (GIL) has been enabled to load " "module '%U', which has not declared that it can run safely " "without the GIL. To override this behavior and keep the GIL " "disabled (at your own risk), run with PYTHON_GIL=0 or -Xgil=0.", module_name)`, issued only if `_PyEval_EnableGILPermanent(tstate)` returns true; otherwise a verbose-only stderr line. The four literals concatenate to the claim's message; %U takes module_name, so the module is named. Not verified: that this sha is the head of branch 3.15 (the fetch of the sha returned 200; the claim's content depends only on the commit).
- verdict: supported · reason: the code at the commit matches the claim's text, type, condition and module-name formatting. No excerpt hash was taken (no local clone, as the researcher noted); checked by content.
- bar: met (descriptive, rung 1: source code at a commit) · independence: n/a · currency: the same message text is present on `main` (S-v5-04, lines 1673-1674).
- counter: none-found ("has been enabled to load module GIL RuntimeWarning free-threaded not declared"). The results (ONNX Runtime commit, PyO3 and mod_wsgi docs, rung 3) reproduce the same warning and the PYTHON_GIL=0 / -Xgil=0 override. Currency: main branch import.c carries the same text (S-v5-04).

## Counter-evidence
(Only S-v5-08 is a conflicting source. S-v5-01 to S-v5-07 are opened corroborating or currency sources, listed so their passages can be checked.)

### S-v5-01
- url: https://www.python.org/downloads/release/python-3150/ · canonical: python.org/downloads/release/python-3150/
- title: Python 3.15.0 | Python.org · authors: n/a · publisher: Python Software Foundation
- date: n/a · version: 3.15.0
- accessed: 2026-10-23 · read-via: webfetch (curl returned a compressed body that did not convert) · quote-match: approximate · archive: none
- kind: official docs · peer-review: n/a
- owner: Python Software Foundation · upstream: none
- lateral: the official python.org download page for the release.
- passages:
  - P1 · release header: "Release date: Oct. 9, 2026"

### S-v5-02
- url: https://docs.python.org/3/howto/abi3t-migration.html · canonical: docs.python.org/3/howto/abi3t-migration.html
- title: Migrating to Stable ABI for free threading (abi3t) · authors: n/a · publisher: Python Software Foundation
- date: n/a · version: Python 3.15.1 documentation
- accessed: 2026-10-23 · read-via: curl · quote-match: exact · archive: none
- kind: official docs · peer-review: n/a
- owner: Python Software Foundation · upstream: none (the PEP names this page as canonical)
- lateral: named by PEP 803 as the canonical migration documentation.
- passages:
  - P1 · § "Migrating to Stable ABI for free threading (abi3t)": "Starting with the 3.15 release, CPython supports a variant of the Stable ABI that supports free-threaded Python: the Stable ABI for Free-Threaded Builds, or abi3t for short."
  - P2 · § "Tagging and distribution": "ABI tag: abi3.abi3t. This is a compressed tag set that indicates support for both non-free-threaded and free-threaded builds."

### S-v5-03
- url: https://docs.python.org/3/c-api/stable.html · canonical: docs.python.org/3/c-api/stable.html
- title: C API and ABI Stability · authors: n/a · publisher: Python Software Foundation
- date: n/a · version: Python 3.15.1 documentation
- accessed: 2026-10-23 · read-via: curl · quote-match: exact · archive: none
- kind: official docs · peer-review: n/a
- owner: Python Software Foundation · upstream: none
- lateral: official CPython C API docs, named by PEP 803 as canonical.
- passages:
  - P1 · § "Stable Application Binary Interfaces": "Free-threaded interpreters only recognize the abi3t tag, while non-free-threaded ones will prefer abi3 but fall back to abi3t."

### S-v5-04
- repo: python/cpython · commit: branch main as fetched 2026-10-23 (sha not recorded)
- url: https://raw.githubusercontent.com/python/cpython/main/Python/import.c · canonical: github.com/python/cpython/blob/main/Python/import.c
- title: Python/import.c · authors: CPython core developers · publisher: python/cpython on GitHub
- date: n/a · version: branch main
- accessed: 2026-10-23 · read-via: curl (converted with pagetext.py, one line) · quote-match: exact · archive: none
- kind: code · peer-review: n/a
- owner: Python Software Foundation · upstream: none
- lateral: official CPython repository.
- passages:
  - P1 · Python/import.c (main, around L1673-L1674): "The global interpreter lock (GIL) has been enabled to load " "module '%U', which has not declared that it can run safely "

### S-v5-05
- url: https://peps.python.org/pep-0779/ · canonical: peps.python.org/pep-0779/
- title: PEP 779 – Criteria for supported status for free-threaded Python · authors: Thomas Wouters, Matt Page, Sam Gross · publisher: Python Software Foundation
- date: created 13-Mar-2025 · version: Status Final, Python-Version 3.14
- accessed: 2026-10-23 · read-via: curl · quote-match: exact · archive: none
- kind: spec · peer-review: n/a (PEP process, Steering Council acceptance)
- owner: Python Software Foundation · upstream: none
- lateral: PEP accepted by the Steering Council; defines the phases and the criteria for phase II.
- passages:
  - P1 · § "PEP 779 – Criteria for supported status for free-threaded Python": "Phase II would make the free-threaded build officially supported but still optional, and phase III would make the free-threaded build the default."

### S-v5-06
- repo: python/cpython · commit: branch 3.15 as fetched 2026-10-23 (sha not recorded)
- url: https://raw.githubusercontent.com/python/cpython/3.15/Python/dynload_shlib.c · canonical: github.com/python/cpython/blob/3.15/Python/dynload_shlib.c
- title: Python/dynload_shlib.c · authors: CPython core developers · publisher: python/cpython on GitHub
- date: n/a · version: branch 3.15
- accessed: 2026-10-23 · read-via: curl (converted with pagetext.py, one line) · quote-match: exact · archive: none
- kind: code · peer-review: n/a
- owner: Python Software Foundation · upstream: none
- lateral: official CPython repository.
- passages:
  - P1 · Python/dynload_shlib.c:L47-L52 (_PyImport_DynLoadFiletab): "#ifndef Py_GIL_DISABLED #ifdef SOABI_PLATFORM ".abi" PYTHON_ABI_STRING "-" SOABI_PLATFORM ".so", #endif /* SOABI_PLATFORM */ ".abi" PYTHON_ABI_STRING ".so", #endif /* Py_GIL_DISABLED */"
  - P2 · Python/dynload_shlib.c:L56: ".abi" PYTHON_ABI_STRING "t.so",

### S-v5-07
- repo: python/cpython · commit: branch 3.14 as fetched 2026-10-23 (sha not recorded)
- url: https://raw.githubusercontent.com/python/cpython/3.14/Python/dynload_shlib.c · canonical: github.com/python/cpython/blob/3.14/Python/dynload_shlib.c
- title: Python/dynload_shlib.c · authors: CPython core developers · publisher: python/cpython on GitHub
- date: n/a · version: branch 3.14
- accessed: 2026-10-23 · read-via: curl (converted with pagetext.py, one line) · quote-match: exact · archive: none
- kind: code · peer-review: n/a
- owner: Python Software Foundation · upstream: none
- lateral: official CPython repository.
- passages:
  - P1 · Python/dynload_shlib.c:L47: ".abi" PYTHON_ABI_STRING ".so",

### S-v5-08
- url: https://docs.python.org/3/howto/free-threading-extensions.html · canonical: docs.python.org/3/howto/free-threading-extensions.html
- title: C API Extension Support for Free Threading · authors: n/a · publisher: Python Software Foundation
- date: n/a · version: Python 3.15.1 documentation
- accessed: 2026-10-23 · read-via: curl · quote-match: exact · archive: none
- kind: official docs · peer-review: n/a
- owner: Python Software Foundation · upstream: none
- lateral: official CPython docs; the same page has a link to the abi3t migration howto (lines 24-29 of the converted text), so the sentence below may be stale rather than intended as current.
- passages:
  - P1 · § "Limited C API and Stable ABI": "The free-threaded build does not currently support the Limited C API or the stable ABI."

### C-v5-01
- claim: The 3.15.1 documentation page "C API Extension Support for Free Threading" says the free-threaded build does not currently support the Limited C API or the stable ABI, while PEP 803 and the 3.15.1 abi3t migration howto describe the abi3t Stable ABI for free-threaded builds as supported from 3.15.
- kind: fact
- questions: Q23 · load-bearing: no (a note on D-02; it is a conflict between pages, and the claim says what each page says)
- support: S-v5-08/P1 · rung 1 · fit direct · upstream self; S-v5-02/P1 · rung 1 · fit direct · upstream self
- scope: docs.python.org/3 pages labelled 3.15.1, accessed 2026-10-23; the sentence can be read as about abi3, not abi3t
- confidence: high · flags: none
- conflicts: S-r2-practice-01/P2 (PEP 803 Final for 3.15)

## Leads
- https://github.com/python/cpython/issues/143423 — CPython issue on `sysconfig.get_config_var("Py_GIL_DISABLED") is not None` giving the wrong answer on a non-free-threaded Windows build (value is 0); seen only in a search summary, not opened; rung 3.
- https://discuss.python.org/t/pep-803-stable-abi-for-free-threaded-builds-packaging-thread/104976 — PEP 803 packaging thread, including a remark that free-threaded 3.14 loading .abi3.so is a bug; rung 3, not opened.
- https://peps.python.org/pep-0790/ — 3.15 release schedule (planned 1 October 2026), the source for the superseded date; not opened.
