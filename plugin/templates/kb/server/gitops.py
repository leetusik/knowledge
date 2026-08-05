"""Scoped git operations for the API write path.

The API commits the documents it writes, staging **only the touched paths**
(``git add -- docs/<rel_path> docs/index.md`` — never ``git add -A``). It pushes
the commit to ``origin/main`` only when ``KB_GIT_PUSH`` is enabled (the hosted
deployment; local/plugin deployments never push), via a fetch + rebase-onto-remote
+ non-force ``push`` — **never** ``git push --force``. Every failure surfaces as
``GitError`` (carrying the command and stderr) so the caller can respond
``committed: false`` / ``pushed: false`` and keep the on-disk write — a failed
commit or push never rolls back the file/DB (docs/ stays canonical), and a failed
push aborts any in-progress rebase so the local commit survives intact.

Every subprocess here is bounded by ``KB_GIT_TIMEOUT_S`` (``config.git_timeout_s``,
default 60s): a git that exceeds it is killed and surfaces as ``GitError`` like any
other failure. That cap is load-bearing since P24 — the push runs on the
after-response publish worker while holding ``WRITE_LOCK``, so an unbounded network
stage there would wedge every later write in the process.
"""
from __future__ import annotations

import subprocess
from pathlib import Path
from typing import Iterable, Optional

from server import config


class GitError(Exception):
    """A git subprocess failed (non-zero exit, or exceeded the timeout)."""

    def __init__(self, command: list[str], stderr: str):
        self.command = command
        self.stderr = (stderr or "").strip()
        super().__init__(f"{' '.join(command)}: {self.stderr}")


def _run(args: list[str], *, root, timeout: Optional[float] = None) -> subprocess.CompletedProcess:
    cmd = ["git", "-C", str(root), *args]
    limit = config.git_timeout_s() if timeout is None else timeout
    try:
        proc = subprocess.run(cmd, capture_output=True, text=True, timeout=limit)
    except subprocess.TimeoutExpired as exc:
        # subprocess.run kills the child before re-raising, so nothing is left
        # running. Same GitError channel as a non-zero exit: callers already
        # treat that as "not published, keep the write".
        raise GitError(cmd, f"timed out after {limit:g}s") from exc
    if proc.returncode != 0:
        # "nothing to commit" and identity/safe.directory failures all land here
        # as a GitError with the reason, never an unhandled crash.
        raise GitError(cmd, proc.stderr or proc.stdout)
    return proc


def add(paths: Iterable[str], *, root) -> None:
    """``git -C <root> add -- <paths...>`` — only the given paths, never ``-A``."""
    _run(["add", "--", *list(paths)], root=root)


def commit(message: str, *, root, co_authored_by: Optional[str] = None) -> str:
    """Commit the staged changes and return the resulting HEAD sha.

    Adds a second ``-m "Co-Authored-By: <value>"`` when ``co_authored_by`` is
    given. "Nothing to commit" surfaces as ``GitError`` (with that reason), not a
    crash. Never pushes.
    """
    args = ["commit", "-m", message]
    if co_authored_by:
        args += ["-m", f"Co-Authored-By: {co_authored_by}"]
    _run(args, root=root)
    return _run(["rev-parse", "HEAD"], root=root).stdout.strip()


def push(*, root, remote: str = "origin", branch: str = "main") -> str:
    """Publish local commit(s) to ``<remote>/<branch>`` and return the pushed HEAD.

    Discipline (best-effort publish, like ``commit`` is a best-effort record):
    ``git fetch <remote> <branch>`` → ``git rebase <remote>/<branch>`` (replays
    our commit(s) onto the latest remote tip — a no-op when it did not move, a
    clean replay when the operator added commits) → ``git push <remote>
    HEAD:<branch>``. **Never** ``--force``, never ``add -A`` — the box only lands
    its scoped commit on top of the operator's work, never clobbers it.

    Because a rebase may rewrite the commit, the returned sha is the **final,
    published** HEAD. Since P24 this runs on the after-response publish worker,
    so it is a log/diagnostic value, no longer the response's ``commit_sha``
    (that is the pre-rebase local commit the request itself made).

    Every step is bounded by ``KB_GIT_TIMEOUT_S`` — a hung fetch/push raises
    ``GitError`` instead of blocking the worker (and its ``WRITE_LOCK``) forever.

    On any step failing (fetch/rebase/push/timeout): abort an in-progress rebase
    so the repo is never left mid-rebase (its own failure is ignored — nothing to
    abort), then re-raise ``GitError``. The local commit is preserved intact
    (never ``--force``, never a reset) — the caller keeps it and the doc publishes
    on the next successful push.
    """
    try:
        _run(["fetch", remote, branch], root=root)
        _run(["rebase", f"{remote}/{branch}"], root=root)
        _run(["push", remote, f"HEAD:{branch}"], root=root)
    except GitError:
        # Best-effort: leave no rebase-in-progress behind. When there is nothing
        # to abort (e.g. fetch failed before any rebase), this is a harmless no-op
        # — swallow its own non-zero exit (and its own timeout) rather than mask
        # the real GitError.
        try:
            subprocess.run(
                ["git", "-C", str(root), "rebase", "--abort"],
                capture_output=True,
                text=True,
                timeout=config.git_timeout_s(),
            )
        except subprocess.TimeoutExpired:
            pass
        raise
    return _run(["rev-parse", "HEAD"], root=root).stdout.strip()
