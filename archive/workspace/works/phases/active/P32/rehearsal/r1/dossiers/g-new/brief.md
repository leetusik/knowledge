# Brief: 20261023-0350-free-threaded-cpython
- subject: Free-threaded CPython (the build without the GIL): what it is, how it works, whether to use it today · mode: general · run: full
- reader: a Python developer who writes web services and data-processing scripts, uses threads, asyncio and multiprocessing, knows the GIL only as "one thread runs Python at a time", has never tried the free-threaded build · purpose: decide whether and how to try the free-threaded build, and know what changes for their own code and their dependencies
- must-cover: what free-threaded CPython is; how it works (how CPython stays safe without the GIL); whether to use it today; how to try it (install/run); what changes for the reader's code (threads, asyncio, multiprocessing); what changes for dependencies (C extensions, wheels, compatibility) · leave-out: none
- trusted sources: docs.python.org, peps.python.org, py-free-threading.github.io · lang: en · placement: loose (project python, subject Python)
- prior: none · open: which Python version the reader runs (assume current: 3.13/3.14); workload mix (I/O-bound web vs CPU-bound data processing)
