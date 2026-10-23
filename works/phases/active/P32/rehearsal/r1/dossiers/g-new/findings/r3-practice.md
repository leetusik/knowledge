# Findings: 20261023-0350-free-threaded-cpython · round 3 · angle practice
- researcher: claude-opus-5-5 · status: complete (hard cap exceeded: 62 tool calls against a cap of 30; the parallel fetch/convert/grep calls were undercounted while working) · tool calls: 62

## Questions
- Q25: answered — claims: C-r3-practice-01, -02, -03, -04, -05, -06, -07, -08, -09, -10, -11, -12, -13, -14, -15 — note: no primary page says outright that pip/uv "skip" abi3 wheels on a free-threaded interpreter. The skip is inferred from CPython's loader rule (C-r3-practice-03) plus the known tag claims (C-r2-practice-13/-16/-17). The documented fallback is a source build (pip, uv). The warning names the module ('%U'). The glossary's "must be run with -X gil=0" sentence conflicts with the HOWTO and cmdline pages. The current HOWTO does not contain the words "disabled by default".

## Sources

### S-r3-practice-01
- url: https://docs.python.org/3.15/c-api/stable.html · canonical: docs.python.org/3.15/c-api/stable.html
- title: C API and ABI Stability · authors: n/a · publisher: Python Software Foundation (docs.python.org)
- date: not printed on the lines read · version: Python 3.15.1 documentation
- accessed: 2026-10-23 · read-via: curl · quote-match: exact · archive: none
- kind: official docs · peer-review: n/a
- owner: Python Software Foundation / CPython core developers · upstream: PEP 803 (canonical successor per S-r2-practice-01/P2)
- lateral: official CPython documentation; PEP 803 names this page as its canonical documentation.
- passages:
  - P1 · § "Stable Application Binary Interfaces": "abi3, introduced in Python 3.2, is compatible with non-free-threaded builds of CPython."
  - P2 · § "Stable Application Binary Interfaces": "abi3t, introduced in Python 3.15, is compatible with free-threaded builds of CPython. It has stricter API limitations than abi3."
  - P3 · § "Stable Application Binary Interfaces": "It is possible for an extension to be compiled for both abi3 and abi3t at the same time; the result will be compatible with both free-threaded and non-free-threaded builds of Python. Currently, this has no downsides compared to compiling for abi3t only."
  - P4 · § "Stable Application Binary Interfaces": "Free-threaded interpreters only recognize the abi3t tag, while non-free-threaded ones will prefer abi3 but fall back to abi3t. Thus, extensions compatible with both ABIs should use the abi3t tag."
  - P5 · § "Stable Application Binary Interfaces": "Python does not necessarily check that extensions it loads have compatible ABI. Extension authors are encouraged to add a check using the Py_mod_abi slot or the PyABIInfo_Check() function, but the user (or their packaging tool) is ultimately responsible for ensuring that, for example, extensions built for Stable ABI 3.10 are not installed for lower versions of Python."
  - P6 · § "Stable Application Binary Interfaces": "An extension compiled for Stable ABI 3.x is ABI-compatible with Python 3.x and above."

### S-r3-practice-02
- url: https://docs.python.org/3/glossary.html · canonical: docs.python.org/3/glossary.html
- title: Glossary · authors: n/a · publisher: Python Software Foundation (docs.python.org)
- date: not read (current /3/ docs, served as 3.15.1 on 2026-10-23) · version: current (/3/)
- accessed: 2026-10-23 · read-via: curl · quote-match: exact · archive: none
- kind: official docs · peer-review: n/a
- owner: Python Software Foundation / CPython core developers · upstream: none
- lateral: same page as S-r2-evidence-03 (fetched again for new passages; the lead may merge the two).
- passages:
  - P1 · § "free-threaded build": "A build of CPython that supports free threading, configured using the --disable-gil option before compilation."
  - P2 · § "global interpreter lock": "As of Python 3.13, the GIL can be disabled using the --disable-gil build configuration. After building Python with this option, code must be run with -X gil=0 or after setting the PYTHON_GIL=0 environment variable."

### S-r3-practice-03
- url: https://docs.python.org/3/howto/free-threading-python.html · canonical: docs.python.org/3/howto/free-threading-python.html
- title: Python support for free threading · authors: n/a · publisher: Python Software Foundation (docs.python.org)
- date: last updated Oct 22, 2026 · version: Python 3.15.1 documentation
- accessed: 2026-10-23 · read-via: curl · quote-match: exact · archive: none
- kind: official docs · peer-review: n/a
- owner: Python Software Foundation · upstream: none
- lateral: official CPython HOWTO; probably the same page as S-r2-evidence-01 (not checked).
- passages:
  - P1 · § "Python support for free threading": "Starting with the 3.13 release, CPython has support for a build of Python called free threading where the global interpreter lock (GIL) is disabled."
  - P2 · § "The global interpreter lock in free-threaded Python": "Free-threaded builds of CPython support optionally running with the GIL enabled at runtime using the environment variable PYTHON_GIL or the command-line option -X gil."
  - P3 · § "The global interpreter lock in free-threaded Python": "The GIL may also automatically be enabled when importing a C-API extension module that is not explicitly marked as supporting free threading. A warning will be printed in this case."
  - P4 · § "The global interpreter lock in free-threaded Python": "In addition to individual package documentation, the following websites track the status of popular packages support for free threading:"

### S-r3-practice-04
- url: https://py-free-threading.github.io/running-gil-disabled/ · canonical: py-free-threading.github.io/running-gil-disabled/
- title: Running Python with the GIL Disabled · authors: Quansight Labs & open source contributors · publisher: Python Free-Threading Guide
- date: July 10, 2024; updated April 21, 2026 · version: n/a
- accessed: 2026-10-23 · read-via: curl · quote-match: exact · archive: none
- kind: official docs (community-maintained guide, not CPython-owned) · peer-review: no
- owner: Quansight Labs and contributors · upstream: none
- lateral: same page as S-r1-practice-07 (fetched again; the lead may merge). The CPython HOWTO links to this guide.
- passages:
  - P1 · § "Force the GIL to be disabled": "PYTHON_GIL=0 python"
  - P2 · § "Force the GIL to be disabled": "python -Xgil=0"

### S-r3-practice-05
- url: https://docs.python.org/3/using/cmdline.html · canonical: docs.python.org/3/using/cmdline.html
- title: Command line and environment · authors: n/a · publisher: Python Software Foundation (docs.python.org)
- date: not read · version: current (/3/, 3.15.x)
- accessed: 2026-10-23 · read-via: curl · quote-match: exact · archive: none
- kind: official docs · peer-review: n/a
- owner: Python Software Foundation · upstream: none
- lateral: official CPython documentation.
- passages:
  - P1 · § "-X": "-X gil=0,1 forces the GIL to be disabled or enabled, respectively. Setting to 0 is only available in builds configured with --disable-gil."
  - P2 · § "PYTHON_GIL": "If this variable is set to 1, the global interpreter lock (GIL) will be forced on. Setting it to 0 forces the GIL off (needs Python configured with the --disable-gil build option)."
  - P3 · § "PYTHON_GIL": "See also the -X gil command-line option, which takes precedence over this variable"

### S-r3-practice-06
- url: https://py-free-threading.github.io/dependencies/ · canonical: py-free-threading.github.io/dependencies/
- title: Handling dependencies that don't support free-threading · authors: Quansight Labs & open source contributors · publisher: Python Free-Threading Guide
- date: May 6, 2025; updated September 25, 2026 · version: n/a
- accessed: 2026-10-23 · read-via: curl · quote-match: exact · archive: none
- kind: official docs (community guide) · peer-review: no
- owner: Quansight Labs and contributors · upstream: CFFI changelog (not opened)
- lateral: same guide as S-r1-practice-04 and S-r2-practice-07.
- passages:
  - P1 · § "CFFI": "CFFI 2.0.0 added support for free-threaded Python 3.14. Supporting free-threaded Python 3.15 requires CFFI 2.1.1 or newer: CFFI 2.1.0 added abi3t support, and CFFI 2.1.1 adapted to a later ABI change in the Python 3.15 beta releases."
  - P2 · § "CFFI": "The marker distinguishes Python releases, not GIL configuration"
  - P3 · § "Depending on PyYAML": "PyYAML 6.0.3+ supports free-threaded Python starting with Python 3.14t+. If you must support Python 3.13t, you can depend on the PyYAML-ft fork of PyYAML."
  - P4 · § "mypyc": "Usually mypyc is used with projects that can be straightforwardly used in a pure-python mode. If there is no compiled build available, we suggest using a pure-python build instead."
  - P5 · § "Zstandard": "Python 3.14 includes the new compression.zstd module, backports are available under backports.zstd for Python 3.9-3.13 and can replace the zstandard package."

### S-r3-practice-07
- url: https://raw.githubusercontent.com/python/cpython/88b0f7da77b44631e2750a8eae6277e54a7ac3cd/Python/import.c · canonical: github.com/python/cpython/blob/88b0f7da77b44631e2750a8eae6277e54a7ac3cd/Python/import.c
- repo: python/cpython · commit: 88b0f7da77b44631e2750a8eae6277e54a7ac3cd (head of branch 3.15 per the GitHub API on 2026-10-23; commit date not read)
- title: Python/import.c · authors: CPython core developers · publisher: python/cpython on GitHub
- date: not read · version: branch 3.15 at the commit above
- accessed: 2026-10-23 · read-via: curl (raw source; text converted with pagetext.py, which collapses the file to one line) · quote-match: exact · archive: none
- kind: code · peer-review: n/a
- owner: Python Software Foundation / CPython core developers · upstream: none
- lateral: the official CPython repository. Line numbers L1644-L1689 come from reading the branch-head fetch, which was then re-fetched pinned at the sha above. Check by content. No excerpt-sha256 was taken: there is no local git clone, and the sed/shasum pipe is not an allowed command form. In the source, the C string literal is split over four adjacent quoted pieces; the passage below gives the pieces in order.
- passages:
  - P1 · Python/import.c:L1670-L1681 (_PyImport_EnableGILAndWarn): "if (_PyEval_EnableGILPermanent(tstate)) { … PyExc_RuntimeWarning, … The global interpreter lock (GIL) has been enabled to load … module '%U', which has not declared that it can run safely … without the GIL. To override this behavior and keep the GIL … disabled (at your own risk), run with PYTHON_GIL=0 or -Xgil=0. … module_name"
  - P2 · Python/import.c:L1652-L1658 (_PyImport_CheckGILForModule): "((PyModuleObject *)module)->md_requires_gil) … if (_PyImport_EnableGILAndWarn(tstate, module_name) < 0) {"

### S-r3-practice-08
- url: https://py-free-threading.github.io/faq/ · canonical: py-free-threading.github.io/faq/
- title: Frequently seen errors and how to fix them · authors: Quansight Labs & open source contributors · publisher: Python Free-Threading Guide
- date: April 18, 2025; updated September 25, 2026 · version: n/a
- accessed: 2026-10-23 · read-via: curl · quote-match: exact · archive: none
- kind: official docs (community guide) · peer-review: no
- owner: Quansight Labs and contributors · upstream: none
- lateral: same guide as S-r3-practice-06.
- passages:
  - P1 · § "What does RuntimeWarning: The global interpreter lock (GIL) has been enabled mean?": "As a precaution, when the free-threaded Python build imports such an extension, it assumes that the GIL is necessary to run the extension, and enables the GIL at runtime."
  - P2 · § "What does RuntimeWarning: The global interpreter lock (GIL) has been enabled mean?": "If you do not control the extension or simply want to test running with the GIL disabled despite the extension not explicitly supporting it, then you can set either the PYTHON_GIL environment variable or the -X gil command-line flag for the Python interpreter to 0 (i.e. the GIL is disabled). This skips the runtime check for whether extensions support running with the GIL disabled."
  - P3 · § "pip install jupyter fails": "This happens because some of the dependencies of the jupyter project on PyPI do not yet support the free-threaded build. You might see this if you do not have a compilation environment set up, since dependencies like PyYAML do not ship free-threaded binaries and require from-source compilation."
  - P4 · § "pip install jupyter fails": "if you need to use Python 3.13 and Jupyter, we suggest installing a Jupyter kernel for the free-threaded build into a Jupyter installation that is installed using a GIL-enabled interpreter."
  - P5 · § "What does \"Py_LIMITED_API is currently incompatible with Py_GIL_DISABLED\" mean?": "A released build backend without abi3t support may therefore still produce this error on Python 3.15."

### S-r3-practice-09
- url: https://pip.pypa.io/en/stable/cli/pip_install/ · canonical: pip.pypa.io/en/stable/cli/pip_install/
- title: pip install · authors: pip developers · publisher: Python Packaging Authority (pip.pypa.io)
- date: not read · version: pip stable docs (26.2.x per the search listing)
- accessed: 2026-10-23 · read-via: curl · quote-match: exact · archive: none
- kind: official docs · peer-review: n/a
- owner: PyPA / pip maintainers · upstream: none
- lateral: pip's official documentation.
- passages:
  - P1 · § "--only-binary": "Do not use source packages. Can be supplied multiple times, and each time adds to the existing value. Accepts either “:all:” to disable all source packages, “:none:” to empty the set, or one or more package names with commas between them. Packages without binary distributions will fail to install when this option is used on them."

### S-r3-practice-10
- url: https://docs.astral.sh/uv/concepts/python-versions/ · canonical: docs.astral.sh/uv/concepts/python-versions/
- title: Python versions · authors: Astral · publisher: Astral (docs.astral.sh)
- date: not read · version: current uv docs
- accessed: 2026-10-23 · read-via: curl · quote-match: exact · archive: none
- kind: official docs · peer-review: n/a
- owner: Astral (vendor of uv) · upstream: none
- lateral: uv's official documentation (vendor docs, rung 1 for uv's own behaviour).
- passages:
  - P1 · § "Free-threaded Python": "For Python 3.14+, uv will allow use of free-threaded Python 3.14+ interpreters without explicit selection. The GIL-enabled build of Python will still be preferred, e.g., when performing an installation with uv python install 3.14. However, e.g., if a free-threaded interpreter comes before a GIL-enabled build on the PATH, it will be used."
  - P2 · § "Free-threaded Python": "If both free-threaded and GIL-enabled Python versions are available on the system, you can use the +gil variant specifier to require the GIL-enabled variant in a project."

### S-r3-practice-11
- url: https://docs.astral.sh/uv/reference/troubleshooting/build-failures/ · canonical: docs.astral.sh/uv/reference/troubleshooting/build-failures/
- title: Build failures · authors: Astral · publisher: Astral (docs.astral.sh)
- date: not read · version: current uv docs
- accessed: 2026-10-23 · read-via: curl · quote-match: exact · archive: none
- kind: official docs · peer-review: n/a
- owner: Astral · upstream: none
- lateral: uv's official documentation.
- passages:
  - P1 · § "Why does uv build a package?": "When installing, uv needs to have a wheel for the current platform for each package. If no matching wheel exists in the index, uv tries to build the source distribution."

### S-r3-practice-12
- url: https://pip.pypa.io/en/stable/user_guide/ · canonical: pip.pypa.io/en/stable/user_guide/
- title: User Guide · authors: pip developers · publisher: Python Packaging Authority (pip.pypa.io)
- date: not read · version: pip stable docs
- accessed: 2026-10-23 · read-via: curl · quote-match: exact · archive: none
- kind: official docs · peer-review: n/a
- owner: PyPA / pip maintainers · upstream: none
- lateral: pip's official documentation.
- passages:
  - P1 · § "Installing from Wheels": "Pip prefers wheels where they are available. To disable this, use the --no-binary flag for pip install."
  - P2 · § "Installing from Wheels": "If no satisfactory wheels are found, pip will default to finding source archives."

## Claims

### C-r3-practice-01
- claim: The pip user guide states that pip prefers wheels where they are available and, if no satisfactory wheels are found, defaults to finding source archives.
- kind: behaviour
- questions: Q25 · load-bearing: yes (what pip does when no free-threaded wheel exists)
- support: S-r3-practice-12/P1, S-r3-practice-12/P2 · rung 1 · fit direct · upstream self
- scope: pip stable docs as served 2026-10-23; general behaviour, not specific to free-threaded builds
- confidence: high · flags: none
- conflicts: none

### C-r3-practice-02
- claim: The uv docs state that, when installing, uv needs a wheel for the current platform for each package, and if no matching wheel exists in the index, uv tries to build the source distribution.
- kind: behaviour
- questions: Q25 · load-bearing: yes (what uv does when no free-threaded wheel exists)
- support: S-r3-practice-11/P1 · rung 1 · fit direct · upstream self
- scope: current uv docs, 2026-10-23; general behaviour, not specific to free-threaded builds
- confidence: high · flags: none
- conflicts: none

### C-r3-practice-03
- claim: The Python 3.15 "Stable Application Binary Interfaces" documentation states that free-threaded interpreters only recognize the abi3t shared-library tag, while non-free-threaded interpreters prefer abi3 and fall back to abi3t, so extensions compatible with both ABIs should use the abi3t tag.
- kind: behaviour
- questions: Q25 · load-bearing: yes (why an abi3-only wheel is no use on 3.15t)
- support: S-r3-practice-01/P4 · rung 1 · fit direct · upstream self
- scope: Python 3.15 documentation (3.15.1), "on some platforms" per the surrounding sentence
- confidence: high · flags: none
- conflicts: none

### C-r3-practice-04
- claim: The Python 3.15 documentation describes two Stable ABIs: abi3 (introduced in Python 3.2), compatible with non-free-threaded CPython builds, and abi3t (introduced in Python 3.15 by PEP 803), compatible with free-threaded CPython builds and with stricter API limitations than abi3.
- kind: definition
- questions: Q25 · load-bearing: yes
- support: S-r3-practice-01/P1, S-r3-practice-01/P2 · rung 1 · fit direct · upstream self
- scope: Python 3.15.1 documentation
- confidence: high · flags: none
- conflicts: none

### C-r3-practice-05
- claim: The Python 3.15 documentation states that an extension can be compiled for abi3 and abi3t at once, making it compatible with both free-threaded and non-free-threaded builds, and that this currently has no downsides compared to compiling for abi3t only.
- kind: behaviour
- questions: Q25 · load-bearing: no (packaging detail behind abi3.abi3t wheels)
- support: S-r3-practice-01/P3 · rung 1 · fit direct · upstream self
- scope: Python 3.15.1 documentation; "currently"
- confidence: high · flags: none
- conflicts: none

### C-r3-practice-06
- claim: The Python 3.15 documentation states that Python does not necessarily check that the extensions it loads have a compatible ABI, and that the user or their packaging tool is ultimately responsible for ensuring compatibility.
- kind: behaviour
- questions: Q25 · load-bearing: no (context for why installers' tag checks matter)
- support: S-r3-practice-01/P5 · rung 1 · fit direct · upstream self
- scope: Python 3.15.1 documentation
- confidence: high · flags: none
- conflicts: none

### C-r3-practice-07
- claim: In CPython's Python/import.c (branch 3.15 at commit 88b0f7d), a free-threaded build that enables the GIL to load an extension module which has not declared it can run without the GIL issues a RuntimeWarning that names the module: "The global interpreter lock (GIL) has been enabled to load module '<name>', which has not declared that it can run safely without the GIL. To override this behavior and keep the GIL disabled (at your own risk), run with PYTHON_GIL=0 or -Xgil=0."
- kind: behaviour
- questions: Q25 · load-bearing: yes (the exact warning, and whether it names the module)
- support: S-r3-practice-07/P1, S-r3-practice-07/P2 · rung 1 · fit direct · upstream self
- scope: CPython source, branch 3.15, commit 88b0f7da77b44631e2750a8eae6277e54a7ac3cd; code under #ifdef Py_GIL_DISABLED; the warning is emitted only when _PyEval_EnableGILPermanent(tstate) returns true. '%U' is formatted with module_name.
- confidence: high · flags: none
- conflicts: none

### C-r3-practice-08
- claim: The CPython HOWTO (3.15.1 docs) states that the GIL may be enabled automatically when a C-API extension module not explicitly marked as supporting free threading is imported, and that a warning is printed in this case.
- kind: behaviour
- questions: Q25 · load-bearing: yes
- support: S-r3-practice-03/P3 · rung 1 · fit direct · upstream self
- scope: Python 3.15.1 HOWTO, last updated Oct 22, 2026
- confidence: high · flags: none
- conflicts: none

### C-r3-practice-09
- claim: CPython's command-line documentation states that `-X gil=0` and `PYTHON_GIL=0` force the GIL off and are available only in builds configured with --disable-gil, that `-X gil=1` and `PYTHON_GIL=1` force it on, and that the `-X gil` option takes precedence over the PYTHON_GIL variable.
- kind: behaviour
- questions: Q25 · load-bearing: yes (the documented workaround)
- support: S-r3-practice-05/P1, S-r3-practice-05/P2, S-r3-practice-05/P3 · rung 1 · fit direct · upstream self
- scope: current /3/ docs (3.15.x)
- confidence: high · flags: none
- conflicts: none

### C-r3-practice-10
- claim: The Python Free-Threading Guide states that setting PYTHON_GIL or -X gil to 0 skips the runtime check for whether extensions support running with the GIL disabled, and presents this for users who do not control the extension or want to test running with the GIL disabled anyway.
- kind: behaviour
- questions: Q25 · load-bearing: yes (the workaround and what it gives up)
- support: S-r3-practice-08/P2 · rung 1 · fit direct · upstream self
- support: S-r3-practice-07/P1 · rung 1 · fit partial · upstream self (CPython's own warning calls keeping the GIL disabled "at your own risk")
- scope: community guide updated 2026-09-25; the guide is not CPython-owned
- confidence: high · flags: none
- conflicts: none

### C-r3-practice-11
- claim: The Python Free-Threading Guide states that, as a precaution, a free-threaded build that imports a native extension not declaring free-threading support assumes the extension needs the GIL and enables the GIL at runtime.
- kind: behaviour
- questions: Q25 · load-bearing: no (C-r3-practice-07/-08 carry the primary statement)
- support: S-r3-practice-08/P1 · rung 1 · fit direct · upstream self
- scope: community guide updated 2026-09-25
- confidence: high · flags: none
- conflicts: none

### C-r3-practice-12
- claim: The Python Free-Threading Guide reports that `pip install jupyter` can fail on a free-threaded build without a compilation environment, because some Jupyter dependencies, such as PyYAML, do not ship free-threaded binaries and need from-source compilation.
- kind: behaviour
- questions: Q25 · load-bearing: yes (a concrete case of falling back to a source build that needs a compiler)
- support: S-r3-practice-08/P3 · rung 1 · fit direct · upstream self
- scope: community guide page updated 2026-09-25. The PyYAML example may be stale (see conflicts).
- confidence: medium · flags: none
- conflicts: S-r3-practice-06/P3 "PyYAML 6.0.3+ supports free-threaded Python starting with Python 3.14t+." (possible staleness within the same guide; "supports" does not necessarily mean wheels are shipped)

### C-r3-practice-13
- claim: pip's `--only-binary` option (for example `--only-binary :all:`) stops pip from using source packages, so packages without binary distributions fail to install instead of being built from source.
- kind: behaviour
- questions: Q25 · load-bearing: no (a way to fail fast instead of compiling)
- support: S-r3-practice-09/P1 · rung 1 · fit direct · upstream self
- scope: pip stable docs, 2026-10-23
- confidence: high · flags: none
- conflicts: none

### C-r3-practice-14
- claim: The Python Free-Threading Guide documents dependency-specific workarounds: require CFFI 2.1.1 or newer for free-threaded 3.15 (CFFI 2.0.0 for 3.14), use PyYAML 6.0.3+ on 3.14t or the PyYAML-ft fork on 3.13t, use a pure-Python build of a mypyc-compiled package when no compiled build is available, and replace the zstandard package with Python 3.14's compression.zstd or backports.zstd.
- kind: behaviour
- questions: Q25 · load-bearing: no (examples of "pin or swap" workarounds)
- support: S-r3-practice-06/P1, S-r3-practice-06/P3, S-r3-practice-06/P4, S-r3-practice-06/P5 · rung 1 · fit direct · upstream self (CFFI details trace to the CFFI changelog, not opened)
- scope: community guide updated 2026-09-25
- confidence: medium · flags: none
- conflicts: S-r3-practice-08/P3 (PyYAML "do not ship free-threaded binaries"), as in C-r3-practice-12

### C-r3-practice-15
- claim: The current Python glossary (/3/, 3.15.x) states under "global interpreter lock" that after building Python with --disable-gil, "code must be run with -X gil=0 or after setting the PYTHON_GIL=0 environment variable", while the current free-threading HOWTO describes free threading as a build "where the global interpreter lock (GIL) is disabled" that supports "optionally running with the GIL enabled at runtime" via PYTHON_GIL or -X gil.
- kind: fact
- questions: Q25 · load-bearing: yes (the two official pages disagree on whether the flag is required)
- support: S-r3-practice-02/P2 · rung 1 · fit direct · upstream self
- support: S-r3-practice-03/P1, S-r3-practice-03/P2 · rung 1 · fit direct · upstream self
- support: S-r3-practice-05/P1 · rung 1 · fit partial · upstream self (cmdline: gil=0 "forces" the GIL off, which reads as an override, not a requirement)
- scope: docs as served 2026-10-23. The current HOWTO does NOT contain the words "disabled by default"; the lead's quoted phrase was not found on the 3.15.1 HOWTO page (full text read). The glossary entry "free-threaded build" itself (S-r3-practice-02/P1) does not mention -X gil=0; the "must be run with" sentence is in the "global interpreter lock" entry.
- confidence: high · flags: none
- conflicts: S-r3-practice-02/P2 "code must be run with -X gil=0 or after setting the PYTHON_GIL=0 environment variable" vs S-r3-practice-03/P2 "support optionally running with the GIL enabled at runtime" and S-r3-practice-03/P1 "a build of Python called free threading where the global interpreter lock (GIL) is disabled"

## Conflicts
- C-r3-practice-15: S-r3-practice-02/P2 (glossary) says that after a --disable-gil build "code must be run with -X gil=0 or after setting the PYTHON_GIL=0 environment variable"; S-r3-practice-03/P1-P2 (HOWTO) says the GIL is disabled in the free-threaded build and that running with it enabled is the option (PYTHON_GIL / -X gil). S-r1-practice-07/P3 (known: sys._is_gil_enabled() "should return False before importing any packages") is consistent with the HOWTO. Both are rung 1, same owner (PSF docs), so this is an internal documentation inconsistency (version/time nature: the glossary sentence reads like 3.13-era wording). Not settled.
- C-r3-practice-12 / C-r3-practice-14: S-r3-practice-08/P3 says PyYAML does "not ship free-threaded binaries and require from-source compilation"; S-r3-practice-06/P3 says "PyYAML 6.0.3+ supports free-threaded Python starting with Python 3.14t+". Same guide, different pages; possibly stale. Not settled.

## Speculation and flags
- C-r3-practice-07: CPython's own message says overriding is "at your own risk", which is the only primary wording on the risk of PYTHON_GIL=0 found here. No primary page found that spells out the consequence (data races or crashes in the non-declaring extension); that belongs to the criticism angle.
- Q25 inference gap: no pip or uv page opened says in so many words that abi3 wheels are skipped on a free-threaded interpreter. The skip follows from C-r3-practice-03 (the interpreter recognises only abi3t) together with known C-r2-practice-13/-16/-17 (PEP 803 tags). pip's tag logic itself (packaging.tags) was not opened. The chapter should say "installers select by tag; an abi3-only wheel does not match a free-threaded interpreter (per CPython docs and PEP 803)" rather than attributing it to pip docs.
- S-r3-practice-10 (uv) is vendor docs about uv itself: rung 1 for uv's behaviour only.

## Unused leads
- https://packaging.python.org/en/latest/specifications/platform-compatibility-tags/ — may state how abi3t/cp3xxt tags are matched; not opened (cap).
- https://github.com/pypa/packaging (src/packaging/tags.py) — the code pip and uv-adjacent tools use to generate compatible tags for free-threaded interpreters; would settle "skip abi3" from primary code.
- https://redirect.github.com/pypa/pip/issues/12634 — old pip issue: pip 24.0 rejected free-threaded wheels due to vendored packaging; history only.
- https://py-free-threading.github.io/tracking/ and https://hugovk.github.io/free-threaded-wheels/ — named in the HOWTO (S-r3-practice-03/P4) as status trackers; the evidence angle owns counts.
- https://docs.astral.sh/uv/pip/compatibility/ — uv vs pip differences (e.g., --only-binary on direct URLs), not opened.

## Queries
- "free-threaded wheel missing pip builds from source sdist cp314t" → nothing new (pointers only)
- "uv free-threaded Python docs.astral.sh 3.14t" → useful (led to docs.astral.sh/uv/concepts/python-versions/)
- "pip no compatible wheel falls back to source distribution build" (allowed: pip.pypa.io, packaging.python.org, docs.astral.sh) → useful
