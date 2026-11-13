# Findings: 20261023-0350-free-threaded-cpython · round 1 · angle practice
- researcher: claude-opus-5-5 · status: partial (hard cap reached; Q7 sub-parts on RuntimeWarning text, cp313t/cp314t wheel tags and pip source-build fallback, and Q10 asyncio.to_thread, not covered) · tool calls: 30

## Questions
- Q3: answered — claims: C-r1-practice-01, C-r1-practice-02, C-r1-practice-03, C-r1-practice-04, C-r1-practice-05, C-r1-practice-06 — note: 3.14 made it supported-but-optional (PEP 779, phase II); 3.15 released 9 Oct 2026, still opt-in build, adds abi3t and macOS installer installs free-threading by default; phase III (default) undecided.
- Q6: answered — claims: C-r1-practice-06, C-r1-practice-07, C-r1-practice-08, C-r1-practice-09, C-r1-practice-10, C-r1-practice-11, C-r1-practice-12, C-r1-practice-13, C-r1-practice-14, C-r1-practice-15 — note: pyenv/conda/Docker/Linux-distro options rest on the community guide only (rung 1 for its own instructions, maintained by Quansight Labs and contributors).
- Q7: thin — claims: C-r1-practice-16, C-r1-practice-17, C-r1-practice-18, C-r1-practice-19, C-r1-practice-20, C-r1-practice-21 — note: Py_mod_gil, GIL re-enable with a warning, "t" suffix and abi3t answered; exact RuntimeWarning text, cp313t/cp314t tags by name and pip's source-build fallback not sourced (budget).
- Q10: thin — claims: C-r1-practice-22, C-r1-practice-23 — note: 3.14 asyncio first-class free-threading support and multi-loop scaling found (vendor-about-itself); nothing found on asyncio.to_thread under free threading (not searched).

## Sources

### S-r1-practice-01
- url: https://peps.python.org/pep-0779/ · canonical: peps.python.org/pep-0779/
- title: PEP 779 – Criteria for supported status for free-threaded Python · authors: Thomas Wouters, Matt Page, Sam Gross · publisher: Python Software Foundation (peps.python.org)
- date: 2025-03-13; resolution 2025-06-16; last modified 2025-10-06 · version: Status Final, Python-Version 3.14
- accessed: 2026-10-23 · read-via: curl · quote-match: exact · archive: none
- kind: spec · peer-review: n/a
- owner: Python Software Foundation / CPython core developers · upstream: none
- lateral: official PEP index of the CPython project; status Final and accepted by the Steering Council per the page's own note.
- passages:
  - P1 · § "Abstract": "Phase I started early in the development of Python 3.13, and includes making the free-threaded (GIL-less) Python build available but explicitly experimental. Phase II would make the free-threaded build officially supported but still optional, and phase III would make the free-threaded build the default."
  - P2 · § "Specification": "With these criteria satisfied, we believe Python 3.14 is the right time frame for phase II of PEP 703."
  - P3 · § "Specification": "The decision to make free-threaded Python the default (phase III) is very different, and we expect it will revolve around community support, willingness, and showing clear benefit. That’s left for a future PEP."
  - P4 · § "Motivation": "Moving to the “officially supported” stage is an important step towards making free-threaded Python the default build, and eventually the only one."

### S-r1-practice-02
- url: https://docs.python.org/3/howto/free-threading-python.html · canonical: docs.python.org/3/howto/free-threading-python.html
- title: Python support for free threading · authors: n/a · publisher: Python Software Foundation (docs.python.org)
- date: last updated 2026-10-22 · version: Python 3.15.1 documentation
- accessed: 2026-10-23 · read-via: curl · quote-match: exact · archive: none
- kind: official docs · peer-review: n/a
- owner: Python Software Foundation · upstream: none
- lateral: official CPython documentation; the "/3/" alias now serves the 3.15.1 docs.
- passages:
  - P1 · § "Python support for free threading": "Some third-party packages, in particular ones with an extension module, may not be ready for use in a free-threaded build, and will re-enable the GIL."
  - P2 · § "Installation": "Starting with Python 3.13, the official macOS and Windows installers optionally support installing free-threaded Python binaries."
  - P3 · § "Installation": "When building CPython from source, the --disable-gil configure option should be used to build a free-threaded Python interpreter."
  - P4 · § "Identifying free-threaded Python": "To check if the current interpreter supports free-threading, python -VV and sys.version contain “free-threading build”. The new sys._is_gil_enabled() function can be used to check whether the GIL is actually disabled in the running process."
  - P5 · § "Identifying free-threaded Python": "The sysconfig.get_config_var("Py_GIL_DISABLED") configuration variable can be used to determine whether the build supports free threading. If the variable is set to 1, then the build supports free threading. This is the recommended mechanism for decisions related to the build configuration."
  - P6 · § "The global interpreter lock in free-threaded Python": "Free-threaded builds of CPython support optionally running with the GIL enabled at runtime using the environment variable PYTHON_GIL or the command-line option -X gil."
  - P7 · § "The global interpreter lock in free-threaded Python": "The GIL may also automatically be enabled when importing a C-API extension module that is not explicitly marked as supporting free threading. A warning will be printed in this case."
  - P8 · page title line: "Python support for free threading — Python 3.15.1 documentation"

### S-r1-practice-03
- url: https://docs.python.org/3/howto/free-threading-extensions.html · canonical: docs.python.org/3/howto/free-threading-extensions.html
- title: C API Extension Support for Free Threading · authors: n/a · publisher: Python Software Foundation (docs.python.org)
- date: last updated 2026-10-22 · version: Python 3.15.1 documentation
- accessed: 2026-10-23 · read-via: curl · quote-match: exact · archive: none
- kind: official docs · peer-review: n/a
- owner: Python Software Foundation · upstream: none
- lateral: official CPython documentation.
- passages:
  - P1 · § "Module Initialization": "Extension modules need to explicitly indicate that they support running with the GIL disabled; otherwise importing the extension will raise a warning and enable the GIL at runtime."
  - P2 · § "Multi-Phase Initialization": "should add a Py_mod_gil slot in the module definition. If your extension supports older versions of CPython, you should guard the slot with a PY_VERSION_HEX check."
  - P3 · § "Multi-Phase Initialization": "{Py_mod_gil, Py_MOD_GIL_NOT_USED},"
  - P4 · § "Single-Phase Initialization": "Extensions that use legacy single-phase initialization (that is, PyModule_Create()) should call PyUnstable_Module_SetGIL() to indicate that they support running with the GIL disabled."
  - P5 · § "Building Extensions for the Free-Threaded Build": "C API extensions need to be built specifically for the free-threaded build. The wheels, shared libraries, and binaries are indicated by a t suffix."
  - P6 · § "Building Extensions for the Free-Threaded Build": "pypa/cibuildwheel supports building wheels for the free-threaded build of Python 3.14 and newer."
  - P7 · § "Limited C API and Stable ABI": "The free-threaded build does not currently support the Limited C API or the stable ABI."
  - P8 · § "Limited C API and Stable ABI": "You will need to build separate wheels specifically for the free-threaded build. If you currently use the stable ABI, you can continue to build a single wheel for multiple non-free-threaded Python versions."

### S-r1-practice-04
- url: https://py-free-threading.github.io/installing-cpython/ · canonical: py-free-threading.github.io/installing-cpython/
- title: Installing Free-Threaded Python · authors: Quansight Labs & open source contributors · publisher: Python Free-Threading Guide
- date: 2024-07-10; updated 2026-04-21 · version: n/a (examples use 3.14.0)
- accessed: 2026-10-23 · read-via: curl · quote-match: exact · archive: none
- kind: official docs (community-maintained guide, linked from docs.python.org as "a community-maintained installation guide") · peer-review: n/a
- owner: Quansight Labs and open-source contributors · upstream: none
- lateral: the CPython HOWTO (S-r1-practice-02) links to this guide for other platforms; not a CPython-owned page.
- passages:
  - P1 · § "Install binaries directly": "The python.org downloads page provides macOS and Windows installers that have experimental support."
  - P2 · § "Install binaries directly": "Currently, you must customize the install - e.g., for Windows there is a Download free-threaded binaries checkbox under "Advanced Options"."
  - P3 · § "Install binaries directly": "if you install both a free-threaded and gil-enabled build of Python 3.13+ using the Python.org installer, both installs will share a site-packages folder. This can very quickly lead to broken environments if packages for both versions are simultaneously installed."
  - P4 · § "Install binaries directly": "On the "Customize Install on Macintosh HD" screen, check the "Free-threaded Python [experimental]" option, and click "install"."
  - P5 · § "Linux distribution installers": "sudo dnf install python3.14-freethreading"
  - P6 · § "Multi-platform Package Managers": "mamba create -n nogil -c conda-forge python-freethreading"
  - P7 · § "Multi-platform Package Managers": "uv venv --python 3.14t"
  - P8 · § "Build from source": "pyenv install --debug --keep 3.14"
  - P9 · § "Use containers": "These images have python3.14t available, along with other commonly used tools that can target it like the latest pip, pipx, and uv."
  - P10 · § "Multi-platform Package Managers": "brew install python-freethreading"

### S-r1-practice-05
- url: https://docs.python.org/3.15/whatsnew/3.15.html · canonical: docs.python.org/3.15/whatsnew/3.15.html
- title: What’s New In Python 3.15 · authors: n/a · publisher: Python Software Foundation (docs.python.org)
- date: n/a (states release 2026-10-09) · version: 3.15
- accessed: 2026-10-23 · read-via: curl · quote-match: exact · archive: none
- kind: official docs (release notes) · peer-review: n/a
- owner: Python Software Foundation · upstream: none
- lateral: official CPython release notes.
- passages:
  - P1 · § "What's new in Python 3.15": "Python 3.15 was released on 9 October 2026."
  - P2 · § "Summary – Release highlights": "The official macOS binaries now install free-threading support by default"
  - P3 · § "PEP 803: Stable ABI for free-threaded builds": "C extensions that target the Stable ABI can now be compiled for the new Stable ABI for Free-Threaded Builds (also known as abi3t), which makes them compatible with free-threaded builds of CPython. This usually requires some non-trivial changes to the source code"
  - P4 · § "PEP 803: Stable ABI for free-threaded builds": "Extensions that cannot switch to abi3t should continue to build for the existing Stable ABI (abi3) and the version-specific ABI for free-threading (cp315t) separately."
  - P5 · § "PEP 803: Stable ABI for free-threaded builds": "Tools with abi3t support include meson-python, scikit-build-core, and Maturin"

### S-r1-practice-06
- url: https://docs.python.org/3.14/whatsnew/3.14.html · canonical: docs.python.org/3.14/whatsnew/3.14.html
- title: What’s New In Python 3.14 · authors: n/a · publisher: Python Software Foundation (docs.python.org)
- date: n/a · version: 3.14
- accessed: 2026-10-23 · read-via: curl · quote-match: exact · archive: none
- kind: official docs (release notes) · peer-review: n/a
- owner: Python Software Foundation · upstream: none
- lateral: official CPython release notes.
- passages:
  - P1 · § "Free-threaded Python is officially supported": "The free-threaded build of Python is now supported and no longer experimental. This is the start of phase II where free-threaded Python is officially supported but still optional."
  - P2 · § "Free-threaded Python is officially supported": "Any decision to transition to phase III, with free-threading as the default or sole build of Python is still undecided, and dependent on many factors both within CPython itself and the community."
  - P3 · § "asyncio": "The module now has first class support for free-threading builds. This enables parallel execution of multiple event loops across different threads, scaling linearly with the number of threads."
  - P4 · § "asyncio": "This enables external introspection tools such as python -m asyncio pstree to introspect the call graph of asyncio tasks running in all threads."
  - P5 · § "Free-threaded mode improvements": "From Python 3.14, when compiling extension modules for the free-threaded build of CPython on Windows, the preprocessor variable Py_GIL_DISABLED now needs to be specified by the build backend"
  - P6 · § "Free-threaded Python is officially supported": "the Python developer community should broadly advertise that free-threading is a supported Python build option now and into the future, and that it will not be removed without a proper deprecation schedule."

### S-r1-practice-07
- url: https://py-free-threading.github.io/running-gil-disabled/ · canonical: py-free-threading.github.io/running-gil-disabled/
- title: Running Python with the GIL Disabled · authors: Quansight Labs & open source contributors · publisher: Python Free-Threading Guide
- date: n/a · version: n/a (examples for 3.14)
- accessed: 2026-10-23 · read-via: curl · quote-match: exact · archive: none
- kind: official docs (community-maintained guide) · peer-review: n/a
- owner: Quansight Labs and open-source contributors · upstream: none
- lateral: same guide as S-r1-practice-04.
- passages:
  - P1 · § "Running Python with the GIL Disabled": "The free-threaded Python executable will always have a python3.14t alias (for Python 3.14); whether python, python3 and/or python3.14 point at the free-threaded executable depends on the installation method used"
  - P2 · § "Running Python with the GIL Disabled": "the Python 3.14 Windows installer from python.org installs the free-threaded binary as python3.14t.exe"
  - P3 · § "Check if the GIL is disabled": "This command will return True on the free-threaded build when the GIL is re-enabled at runtime, and should return False before importing any packages."
  - P4 · § "Force the GIL to be disabled": "To force Python to keep the GIL disabled even after importing a module that does not support running without it, use the PYTHON_GIL environment variable or the -X gil command line option:"
  - P5 · § "Force the GIL to be disabled": "PYTHON_GIL=0 python"

### S-r1-practice-08
- url: https://docs.astral.sh/uv/concepts/python-versions/ · canonical: docs.astral.sh/uv/concepts/python-versions/
- title: Python versions (uv documentation) · authors: n/a · publisher: Astral
- date: n/a · version: current uv docs as of access
- accessed: 2026-10-23 · read-via: curl · quote-match: exact · archive: none
- kind: official docs · peer-review: n/a
- owner: Astral (vendor of uv) · upstream: none
- lateral: Astral is the company that develops uv; rung 1 for uv's own behaviour only.
- passages:
  - P1 · § "Free-threaded Python": "uv supports discovering and installing free-threaded Python variants in CPython 3.13+."
  - P2 · § "Free-threaded Python": "For Python 3.14+, uv will allow use of free-threaded Python 3.14+ interpreters without explicit selection. The GIL-enabled build of Python will still be preferred, e.g., when performing an installation with uv python install 3.14."
  - P3 · § "Free-threaded Python": "For Python 3.13, free-threaded Python versions will not be selected by default. Free-threaded Python versions will only be selected when explicitly requested, e.g., with 3.13t or 3.13+freethreaded."
  - P4 · § "Free-threaded Python": "you can use the +gil variant specifier to require the GIL-enabled variant in a project."

## Claims

### C-r1-practice-01
- claim: PEP 703's plan has three phases: phase I (from Python 3.13) makes the free-threaded build available but explicitly experimental, phase II makes it officially supported but still optional, and phase III makes it the default.
- kind: definition
- questions: Q3 · load-bearing: yes (frames the status question)
- support: S-r1-practice-01/P1 · rung 1 · fit direct · upstream self
- scope: as described in PEP 779 (Final, 2025)
- confidence: high · flags: none
- conflicts: none

### C-r1-practice-02
- claim: In Python 3.14 the free-threaded build became officially supported and no longer experimental, which starts phase II, in which it is supported but still optional.
- kind: fact
- questions: Q3 · load-bearing: yes (the core status fact)
- support: S-r1-practice-06/P1 · rung 1 · fit direct · upstream self
- support: S-r1-practice-01/P2 · rung 1 · fit partial · upstream self
- scope: Python 3.14 and later
- confidence: high · flags: none
- conflicts: S-r1-practice-04/P1 "The python.org downloads page provides macOS and Windows installers that have experimental support." (community guide; see Conflicts)

### C-r1-practice-03
- claim: According to the Python 3.14 release notes, the decision to move to phase III, making free-threading the default or sole build, is still undecided and left to the future.
- kind: fact
- questions: Q3 · load-bearing: yes (answers "any plan to become default")
- support: S-r1-practice-06/P2 · rung 1 · fit direct · upstream self
- support: S-r1-practice-01/P3 · rung 1 · fit direct · upstream self ("That’s left for a future PEP.")
- scope: as of the 3.14 release notes and PEP 779; no 3.15 statement on phase III found in What's New 3.15 (grepped)
- confidence: high · flags: none
- conflicts: none

### C-r1-practice-04
- claim: The Python 3.14 release notes state that free-threading is a supported build option that will not be removed without a proper deprecation schedule.
- kind: fact
- questions: Q3 · load-bearing: no (supporting detail)
- support: S-r1-practice-06/P6 · rung 1 · fit direct · upstream self
- scope: Python 3.14 release notes, quoting the PEP 779 acceptance
- confidence: high · flags: none
- conflicts: none

### C-r1-practice-05
- claim: Python 3.15 was released on 9 October 2026.
- kind: date
- questions: Q3 · load-bearing: yes (establishes 3.15 is current)
- support: S-r1-practice-05/P1 · rung 1 · fit direct · upstream self
- scope: What's New In Python 3.15; the docs.python.org "/3/" pages accessed 2026-10-23 are labelled "Python 3.15.1 documentation" (S-r1-practice-02/P8)
- confidence: high · flags: exceptional (a third-party search summary gave the scheduled date as 1 October 2026; the official page says 9 October; the docs label 3.15.1 within two weeks is also surprising)
- conflicts: none (the schedule date came only from search snippets, not opened)

### C-r1-practice-06
- claim: In Python 3.15, the official macOS binaries install free-threading support by default.
- kind: fact
- questions: Q3, Q6 · load-bearing: yes (changes how macOS users get the build)
- support: S-r1-practice-05/P2 · rung 1 · fit direct · upstream self
- scope: official python.org macOS binaries, Python 3.15; does not say the free-threaded interpreter becomes the default "python"
- confidence: medium (summary line only; the detailed section was not read) · flags: none
- conflicts: none

### C-r1-practice-07
- claim: Since Python 3.13, the official python.org macOS and Windows installers optionally install free-threaded Python binaries.
- kind: fact
- questions: Q6 · load-bearing: yes
- support: S-r1-practice-02/P2 · rung 1 · fit direct · upstream self
- scope: python.org installers, 3.13+
- confidence: high · flags: none
- conflicts: none

### C-r1-practice-08
- claim: The Python Free-Threading Guide says the python.org installers must be customized to get the free-threaded build: on Windows a "Download free-threaded binaries" checkbox under "Advanced Options", and on macOS a "Free-threaded Python [experimental]" option on the Customize screen.
- kind: behaviour
- questions: Q6 · load-bearing: yes
- support: S-r1-practice-04/P2 · rung 1 · fit direct · upstream self
- support: S-r1-practice-04/P4 · rung 1 · fit direct · upstream self
- scope: guide examples for 3.14.0; the macOS step may be superseded for 3.15 by C-r1-practice-06
- confidence: medium · flags: none
- conflicts: S-r1-practice-05/P2 (3.15 macOS binaries install free-threading by default)

### C-r1-practice-09
- claim: The Python Free-Threading Guide warns that installing both the free-threaded and GIL-enabled builds of Python 3.13+ with the python.org Windows installer makes them share one site-packages folder, which can quickly break environments.
- kind: behaviour
- questions: Q6 · load-bearing: no (practical caveat)
- support: S-r1-practice-04/P3 · rung 1 · fit direct · upstream self
- scope: Windows, python.org installer, 3.13+
- confidence: medium · flags: none
- conflicts: none

### C-r1-practice-10
- claim: The free-threaded executable always has a version-plus-"t" name (for Python 3.14, python3.14t; on Windows, python3.14t.exe), while whether python or python3 points at it depends on the installation method.
- kind: behaviour
- questions: Q6 · load-bearing: yes
- support: S-r1-practice-07/P1 · rung 1 · fit direct · upstream self
- support: S-r1-practice-07/P2 · rung 1 · fit direct · upstream self
- scope: Python 3.14, per the community guide
- confidence: medium · flags: none
- conflicts: none

### C-r1-practice-11
- claim: uv can discover and install free-threaded CPython 3.13+ variants; for 3.13 they are used only when requested explicitly (e.g. "3.13t"), and for 3.14+ uv may use a free-threaded interpreter without explicit selection but still prefers the GIL-enabled build (e.g. for `uv python install 3.14`).
- kind: behaviour
- questions: Q6 · load-bearing: yes
- support: S-r1-practice-08/P1 · rung 1 · fit direct · upstream self
- support: S-r1-practice-08/P2 · rung 1 · fit direct · upstream self
- support: S-r1-practice-08/P3 · rung 1 · fit direct · upstream self
- scope: uv docs as accessed 2026-10-23
- confidence: high · flags: vendor-about-itself (descriptive only)
- conflicts: none

### C-r1-practice-12
- claim: The Python Free-Threading Guide lists commands to get a free-threaded interpreter including `uv venv --python 3.14t`, `mamba create -n nogil -c conda-forge python-freethreading`, `brew install python-freethreading`, Fedora's `python3.14-freethreading` package, and pyenv builds from source; manylinux container images ship python3.14t.
- kind: fact
- questions: Q6 · load-bearing: yes
- support: S-r1-practice-04/P7 · rung 1 · fit direct · upstream self
- support: S-r1-practice-04/P6 · rung 1 · fit direct · upstream self
- support: S-r1-practice-04/P10 · rung 1 · fit direct · upstream self
- support: S-r1-practice-04/P5 · rung 1 · fit direct · upstream self
- support: S-r1-practice-04/P8 · rung 1 · fit partial · upstream self (pyenv; the guide pairs it with configure --disable-gil)
- support: S-r1-practice-04/P9 · rung 1 · fit direct · upstream self
- scope: community guide, examples for 3.14
- confidence: medium · flags: none
- conflicts: none

### C-r1-practice-13
- claim: `python -VV` and `sys.version` contain "free-threading build" on a free-threaded interpreter, and `sys._is_gil_enabled()` reports whether the GIL is actually disabled in the running process.
- kind: behaviour
- questions: Q6 · load-bearing: yes
- support: S-r1-practice-02/P4 · rung 1 · fit direct · upstream self
- support: S-r1-practice-07/P3 · rung 1 · fit direct · upstream self (returns True when the GIL is re-enabled at runtime)
- scope: CPython 3.13+
- confidence: high · flags: none
- conflicts: none

### C-r1-practice-14
- claim: The Python docs recommend `sysconfig.get_config_var("Py_GIL_DISABLED")` (value 1 on a free-threaded build) for decisions about the build configuration.
- kind: behaviour
- questions: Q6 · load-bearing: yes
- support: S-r1-practice-02/P5 · rung 1 · fit direct · upstream self
- scope: CPython 3.13+
- confidence: high · flags: none
- conflicts: none

### C-r1-practice-15
- claim: A free-threaded build can run with the GIL enabled or disabled at runtime via the PYTHON_GIL environment variable or the `-X gil` option, and `PYTHON_GIL=0` keeps the GIL disabled even after importing an extension that does not declare support.
- kind: behaviour
- questions: Q6, Q7 · load-bearing: yes
- support: S-r1-practice-02/P6 · rung 1 · fit direct · upstream self
- support: S-r1-practice-07/P4 · rung 1 · fit direct · upstream self
- support: S-r1-practice-07/P5 · rung 1 · fit direct · upstream self
- scope: free-threaded builds only
- confidence: high · flags: none
- conflicts: none

### C-r1-practice-16
- claim: On a free-threaded build, importing a C extension module that is not explicitly marked as supporting free threading prints a warning and enables the GIL at runtime.
- kind: behaviour
- questions: Q7 · load-bearing: yes
- support: S-r1-practice-02/P7 · rung 1 · fit direct · upstream self
- support: S-r1-practice-03/P1 · rung 1 · fit direct · upstream self
- scope: CPython 3.13+ free-threaded build; the warning category (RuntimeWarning) and exact text were not found in these pages
- confidence: high · flags: none
- conflicts: none

### C-r1-practice-17
- claim: An extension using multi-phase initialization declares free-threading support with a `{Py_mod_gil, Py_MOD_GIL_NOT_USED}` slot (guarded by a PY_VERSION_HEX check for older CPython), and one using single-phase initialization calls `PyUnstable_Module_SetGIL()`.
- kind: behaviour
- questions: Q7 · load-bearing: yes
- support: S-r1-practice-03/P2 · rung 1 · fit direct · upstream self
- support: S-r1-practice-03/P3 · rung 1 · fit direct · upstream self
- support: S-r1-practice-03/P4 · rung 1 · fit direct · upstream self
- scope: CPython 3.13+
- confidence: high · flags: none
- conflicts: none

### C-r1-practice-18
- claim: C extensions must be built specifically for the free-threaded build, whose wheels, shared libraries and binaries carry a "t" suffix, and cibuildwheel builds free-threaded wheels for Python 3.14 and newer.
- kind: behaviour
- questions: Q7 · load-bearing: yes
- support: S-r1-practice-03/P5 · rung 1 · fit direct · upstream self
- support: S-r1-practice-03/P6 · rung 1 · fit direct · upstream self
- scope: CPython docs 3.15.1
- confidence: high · flags: none
- conflicts: none

### C-r1-practice-19
- claim: Starting with Python 3.15 (PEP 803), C extensions can target a Stable ABI for free-threaded builds called abi3t, which usually requires non-trivial source changes; extensions that cannot switch should build abi3 and the version-specific free-threaded ABI (cp315t) separately.
- kind: behaviour
- questions: Q7 · load-bearing: yes
- support: S-r1-practice-05/P3 · rung 1 · fit direct · upstream self
- support: S-r1-practice-05/P4 · rung 1 · fit direct · upstream self
- scope: Python 3.15+
- confidence: high · flags: none
- conflicts: S-r1-practice-03/P7 "The free-threaded build does not currently support the Limited C API or the stable ABI." (see Conflicts)

### C-r1-practice-20
- claim: Without abi3t, packages that ship a single stable-ABI (abi3) wheel must also build separate wheels specifically for the free-threaded build.
- kind: behaviour
- questions: Q7 · load-bearing: yes
- support: S-r1-practice-03/P8 · rung 1 · fit direct · upstream self
- support: S-r1-practice-03/P7 · rung 1 · fit partial · upstream self (states it in the present tense, in the 3.15.1 docs)
- scope: 3.13–3.14, and 3.15 extensions that do not adopt abi3t
- confidence: medium · flags: none
- conflicts: S-r1-practice-05/P3 (abi3t in 3.15)

### C-r1-practice-21
- claim: From Python 3.14, the build backend must define Py_GIL_DISABLED when compiling extension modules for the free-threaded build on Windows.
- kind: behaviour
- questions: Q7 · load-bearing: no
- support: S-r1-practice-06/P5 · rung 1 · fit direct · upstream self
- scope: Windows, 3.14+
- confidence: high · flags: none
- conflicts: none

### C-r1-practice-22
- claim: The Python 3.14 release notes state that asyncio has first-class support for free-threading builds, enabling parallel execution of multiple event loops in different threads that scales linearly with the number of threads.
- kind: behaviour
- questions: Q10 · load-bearing: yes
- support: S-r1-practice-06/P3 · rung 1 · fit direct · upstream self
- scope: Python 3.14 (gh-128002); "scaling linearly" is the project's own description, no independent measurement found
- confidence: medium · flags: vendor-about-itself, superlative ("scaling linearly")
- conflicts: none

### C-r1-practice-23
- claim: In Python 3.14, asyncio's task bookkeeping lets `python -m asyncio pstree` inspect the call graph of asyncio tasks running in all threads.
- kind: behaviour
- questions: Q10 · load-bearing: no
- support: S-r1-practice-06/P4 · rung 1 · fit direct · upstream self
- scope: Python 3.14
- confidence: high · flags: none
- conflicts: none

## Conflicts
- C-r1-practice-02: S-r1-practice-06/P1 says the free-threaded build is "now supported and no longer experimental" (3.14); S-r1-practice-04/P1 (community guide, updated 2026-04-21) says the python.org installers "have experimental support", and S-r1-practice-04/P4 names the macOS option "Free-threaded Python [experimental]". Likely stale guide text or installer labels; not settled.
- C-r1-practice-19: S-r1-practice-05/P3 says 3.15 extensions "can now be compiled for the new Stable ABI for Free-Threaded Builds (also known as abi3t)"; S-r1-practice-03/P7, in the 3.15.1 docs, says "The free-threaded build does not currently support the Limited C API or the stable ABI." Nature: version/time (the HOWTO text predates PEP 803, and the same page links "Migrating to Stable ABI for free threading (abi3t)" as its next topic); not settled.
- C-r1-practice-08: the guide's macOS "customize" step (3.14.0 examples) versus S-r1-practice-05/P2, 3.15 macOS binaries install free-threading by default; version/time; not settled.

## Speculation and flags
- C-r1-practice-22: superlative and vendor-about-itself, "scaling linearly with the number of threads" in the CPython release notes; needs an independent benchmark (owned by the evidence angle).
- C-r1-practice-05: surprising: the release-date day (9 October vs a scheduled 1 October seen only in search snippets) and docs already at 3.15.1 on 2026-10-23.
- S-r1-practice-04, S-r1-practice-07: community guide, not CPython-owned; rung 1 only for its own instructions.

## Unused leads
- https://py-free-threading.github.io/porting/ (and "Handling dependencies that don’t support free-threading") — likely covers pip falling back to source builds when no cp31Xt wheel exists; not fetched (budget).
- https://docs.python.org/3.15/howto/ (Migrating to Stable ABI for free threading (abi3t)) — official abi3t migration guide linked from S-r1-practice-03.
- https://peps.python.org/pep-0803/ — abi3t specification, wheel tag details.
- https://docs.python.org/3/library/asyncio-task.html — asyncio.to_thread docs, for Q10's to_thread sub-question.
- https://byteiota.com/python-3-15-rc2-ships-what-free-threaded-python-means-for-your-code/ — rung-3 blog on 3.15 free threading; pointer only.

## Queries
- "Python 3.15.0 released free-threaded" → useful (pointed to PEP 803/abi3t and the 3.15 schedule; official confirmation came from What's New 3.15)
