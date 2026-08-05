"""After-response publish worker (P24.S1): git push + embed off the request path.

Why this exists. ``POST /api/documents`` used to do two *network* stages between
the durable save (file + DB commit) and the 201 it writes: ``gitops.push``
(``git fetch`` → ``git rebase`` → ``git push`` — two SSH round-trips to GitHub,
and until P24 with no subprocess timeout at all) and the Gemini embed. Both are
publish/side-effect work whose result never appears in the response, yet both
spent the caller's timeout budget — so a client with a short deadline (``/explain``
posts with ``curl --max-time 5``) saw a transport failure for a write that had
already landed. This module moves that work behind the response.

Shape: **one process-wide daemon worker thread + a FIFO queue**, started lazily on
the first submit. Deliberate properties:

* **The request thread never waits on it.** ``submit`` only appends to a queue;
  the handler returns its 201 immediately. (Starlette ``BackgroundTasks`` would
  also run after the handler, but ordering against the ``BaseHTTPMiddleware``
  metering in the stack is subtle — a queue makes "the response never waits" a
  property of the code, not of the ASGI stack.)
* **Pushes stay serialized.** One worker, FIFO — never two concurrent rebases,
  and one push per write in submit order (coalescing is a possible future
  optimization, not needed for correctness).
* **The worker re-takes ``WRITE_LOCK``** (in the task body, in ``server/main.py``)
  because a rebase mutates the work tree and must not race a write's file write.
  ``WRITE_LOCK`` is NOT reentrant, so tasks are always submitted *outside* it.
  Every git subprocess is bounded by ``KB_GIT_TIMEOUT_S`` (``server/gitops.py``),
  so a wedged network can never hold that lock forever.
* **Failures never reach the caller** (the response is long gone): a task's
  exception is logged to stdout — the container log is the operator's surface —
  and kept in ``last_error()`` for tests. The write itself is already durable;
  a failed push republishes on the next successful one.

``drain()`` blocks until the queue is empty (tests, and the app's shutdown hook).
It is the only synchronization point; nothing in a request path may call it.
"""
from __future__ import annotations

import queue
import threading
import traceback
from typing import Callable, Optional

_QUEUE: "queue.Queue[tuple[str, Callable[[], None]]]" = queue.Queue()
_WORKER: Optional[threading.Thread] = None
_WORKER_START_LOCK = threading.Lock()

# Own counter + condition (rather than Queue.unfinished_tasks/all_tasks_done,
# which are CPython internals) so drain() can wait with a real timeout.
_COND = threading.Condition()
_PENDING = 0
_LAST_ERROR: Optional[str] = None


def _log(message: str) -> None:
    print(f"[kb-api] publish: {message}", flush=True)


def _loop() -> None:
    global _PENDING, _LAST_ERROR
    while True:
        name, task = _QUEUE.get()
        try:
            task()
        except BaseException as exc:  # noqa: BLE001 — the worker must never die
            _LAST_ERROR = f"{name}: {exc}"
            _log(f"{name} FAILED: {exc}")
            traceback.print_exc()
        finally:
            with _COND:
                _PENDING -= 1
                _COND.notify_all()


def _ensure_worker() -> None:
    global _WORKER
    if _WORKER is not None and _WORKER.is_alive():
        return
    with _WORKER_START_LOCK:
        if _WORKER is None or not _WORKER.is_alive():
            _WORKER = threading.Thread(
                target=_loop, name="kb-publish", daemon=True
            )
            _WORKER.start()


def submit(name: str, task: Callable[[], None]) -> None:
    """Queue ``task`` to run after the response. Returns immediately.

    ``name`` is a short human label used in the log line / ``last_error()``.
    Never raises: enqueuing is the only work done on the request thread.
    """
    global _PENDING
    _ensure_worker()
    with _COND:
        _PENDING += 1
    _QUEUE.put((name, task))


def pending() -> int:
    """How many submitted tasks have not finished yet (queued + in flight)."""
    with _COND:
        return _PENDING


def drain(timeout: float = 30.0) -> bool:
    """Block until every submitted task has finished. ``False`` on timeout.

    For tests (deterministic assertions on the side effect) and the app's
    shutdown hook. Never call this from a request path, and never while holding
    ``WRITE_LOCK`` — a queued push takes that lock.
    """
    with _COND:
        return _COND.wait_for(lambda: _PENDING == 0, timeout=timeout)


def last_error() -> Optional[str]:
    """The most recent failed task as ``"<name>: <error>"`` (tests/diagnostics)."""
    return _LAST_ERROR


def reset_last_error() -> None:
    """Clear :func:`last_error` (test hygiene between cases)."""
    global _LAST_ERROR
    _LAST_ERROR = None
