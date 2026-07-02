"""Scoped git operations for the API write path.

The API commits the documents it writes, staging **only the touched paths**
(``git add -- docs/<rel_path> docs/index.md`` — never ``git add -A``) and never
pushing. Every failure surfaces as ``GitError`` (carrying the command and stderr)
so the caller can respond ``committed: false`` and keep the on-disk write — a
failed commit never rolls back the file/DB (docs/ stays canonical).
"""
from __future__ import annotations

import subprocess
from pathlib import Path
from typing import Iterable, Optional


class GitError(Exception):
    """A git subprocess failed. Carries the command and its stderr."""

    def __init__(self, command: list[str], stderr: str):
        self.command = command
        self.stderr = (stderr or "").strip()
        super().__init__(f"{' '.join(command)}: {self.stderr}")


def _run(args: list[str], *, root) -> subprocess.CompletedProcess:
    cmd = ["git", "-C", str(root), *args]
    proc = subprocess.run(cmd, capture_output=True, text=True)
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
