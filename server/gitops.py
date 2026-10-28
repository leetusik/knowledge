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

**Private projects (P34).** A tenant #1 project that is not ``public`` never
publishes. The callers gate on visibility (``server/publish_gate.py``); this module
adds a second, caller-independent guard with no database: a managed block in the
checkout's own ``info/exclude`` (never a tracked file, which would publish the names)
lists each private project's footprint, and ``add`` / ``remove`` refuse any path in
it, and a ``docs/index.md`` that links into it, with ``GitError`` (fail closed: the
write stays on disk, ``committed: false``). See the *Private projects* section below.
``server/reconcile.py`` (P34-n0.S2) makes the tree mirror the registry with the
reads and the one guard-bypassing write (``untrack``) in *The reconcile's git
primitives*.
"""
from __future__ import annotations

import os
import posixpath
import re
import subprocess
import tempfile
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


# Chapter images are never committed (P30 A2): ``.assets/`` holds them under every
# tenant root, and tenant #1's public repo must never carry one.
_NEVER_STAGED_DIR = ".assets"


# --- Private projects (P34): the managed info/exclude block + the staging guard ---
#
# The block sits in the checkout's ``info/exclude`` (located with ``git rev-parse
# --git-path info/exclude``, so a linked worktree finds the common one), between two
# fixed marker lines, and holds three lines per private project:
#
#     /docs/<project>/
#     /docs/.versions/<project>/
#     /docs/.books/<project>/
#
# That hides the project's UNTRACKED files from ``git status`` / ``git add``. It cannot
# stop a TRACKED file (git ignores excludes for those), which is why ``add`` and
# ``remove`` refuse every path in a listed footprint themselves. The block is always
# rewritten whole (``write_private_projects``) from a set of names, so it stays
# canonical: sorted, three lines per project, nothing else between the markers.
# Everything outside the markers is the operator's and is kept as it is.

PRIVATE_BLOCK_BEGIN = "# >>> knowledge server: private projects (managed; rewritten whole) >>>"
PRIVATE_BLOCK_END = "# <<< knowledge server: private projects <<<"

# Under docs/: a project's documents, its superseded versions, its book manifests.
_FOOTPRINT_PREFIXES = ("", ".versions/", ".books/")
# The registry/convention project-name shape (``documents._PROJECT_RE``): no glob
# metacharacter, no slash, so a name is safe to write as an exclude pattern verbatim.
_PROJECT_NAME_RE = re.compile(r"^[A-Za-z0-9][A-Za-z0-9._-]*$")
_BLOCK_LINE_RE = re.compile(r"^/docs/(?:\.versions/|\.books/)?([A-Za-z0-9][A-Za-z0-9._-]*)/$")
# Staging any of these would sweep every project's footprint at once.
_FOOTPRINT_ANCESTORS = frozenset({".", "docs", "docs/.versions", "docs/.books"})


def _check_project_name(project: str) -> str:
    if (
        not isinstance(project, str)
        or not _PROJECT_NAME_RE.fullmatch(project)
        or ".." in project
    ):
        raise ValueError("invalid project name for the private-projects block")
    return project


def exclude_path(root) -> Path:
    """The checkout's ``info/exclude`` file (it need not exist yet)."""
    out = _run(["rev-parse", "--git-path", "info/exclude"], root=root).stdout.strip()
    path = Path(out)
    return path if path.is_absolute() else Path(root) / path


def _read_text(path: Path) -> str:
    try:
        return path.read_text(encoding="utf-8")
    except FileNotFoundError:
        return ""


def _split_block(text: str) -> tuple[list[str], list[str]]:
    """``(lines outside the managed block, lines inside it)``, markers dropped."""
    outside: list[str] = []
    inside: list[str] = []
    in_block = False
    for line in text.splitlines():
        if line == PRIVATE_BLOCK_BEGIN:
            in_block = True
        elif line == PRIVATE_BLOCK_END and in_block:
            in_block = False
        elif in_block:
            inside.append(line)
        else:
            outside.append(line)
    return outside, inside


def _block_names(inside: list[str]) -> set[str]:
    names: set[str] = set()
    for line in inside:
        match = _BLOCK_LINE_RE.match(line.strip())
        if match and ".." not in match.group(1):
            names.add(match.group(1))
    return names


def _render(outside: list[str], names: Iterable[str]) -> str:
    lines = list(outside)
    while lines and not lines[-1].strip():
        lines.pop()
    ordered = sorted(set(names))
    if ordered:
        if lines:
            lines.append("")
        lines.append(PRIVATE_BLOCK_BEGIN)
        for name in ordered:
            lines.extend(f"/docs/{prefix}{name}/" for prefix in _FOOTPRINT_PREFIXES)
        lines.append(PRIVATE_BLOCK_END)
    return "\n".join(lines) + "\n" if lines else ""


def _atomic_write(path: Path, text: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    try:
        mode = path.stat().st_mode & 0o777
    except FileNotFoundError:
        mode = 0o644
    fd, tmp = tempfile.mkstemp(dir=str(path.parent), prefix=".exclude-", suffix=".tmp")
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as fh:
            fh.write(text)
        os.chmod(tmp, mode)
        os.replace(tmp, path)
    except BaseException:
        try:
            os.unlink(tmp)
        except FileNotFoundError:
            pass
        raise


def private_projects(root) -> list[str]:
    """The project names in the managed block, sorted (``[]`` when there is none)."""
    _, inside = _split_block(_read_text(exclude_path(root)))
    return sorted(_block_names(inside))


def write_private_projects(projects: Iterable[str], *, root) -> bool:
    """Rewrite the managed block whole so it lists exactly ``projects``.

    The one writer of the block (``mark_private`` goes through it, and a re-sync from
    the registry can call it directly). An empty set removes the block. Lines outside
    the markers are kept; the block moves to the end of the file. Atomic (temp file +
    ``os.replace``). Returns whether the file changed. ``ValueError`` on a name that
    is not a valid project name; ``GitError`` when ``root`` is not a git checkout.
    """
    names = {_check_project_name(p) for p in projects}
    path = exclude_path(root)
    text = _read_text(path)
    outside, _ = _split_block(text)
    new_text = _render(outside, names)
    if new_text == text:
        return False
    _atomic_write(path, new_text)
    return True


def mark_private(project: str, *, root) -> bool:
    """Add ``project``'s three footprint lines to the managed block (idempotent).

    Returns ``False`` when the block already lists it canonically (nothing written).
    """
    _check_project_name(project)
    path = exclude_path(root)
    _, inside = _split_block(_read_text(path))
    return write_private_projects(_block_names(inside) | {project}, root=root)


def unmark_private(project: str, *, root) -> bool:
    """Drop ``project``'s lines from the managed block (idempotent; P34-n0.S2).

    The reverse of ``mark_private``, for a project that turned ``public``: once
    unmarked, the guard lets its footprint stage again. Returns ``False`` when the
    block did not list it (nothing written).
    """
    _check_project_name(project)
    path = exclude_path(root)
    _, inside = _split_block(_read_text(path))
    names = _block_names(inside)
    if project not in names:
        return False
    return write_private_projects(names - {project}, root=root)


# --- The reconcile's git primitives (P34-n0.S2) ---
#
# ``server/reconcile.py`` makes the tree mirror the registry. It needs a few reads
# (what of a footprint is tracked, what would show once unmarked, is anything
# staged) and one write the guard must not stop: untracking a private project's
# footprint. Nothing else calls ``untrack``.


def footprint_dirs(project: str) -> list[str]:
    """A project's three footprint directories, repo-relative (no trailing slash)."""
    _check_project_name(project)
    return [f"docs/{prefix}{project}" for prefix in _FOOTPRINT_PREFIXES]


def _is_footprint_dir(rel: str) -> bool:
    parts = rel.split("/")
    if len(parts) == 2 and parts[0] == "docs":
        name = parts[1]
    elif len(parts) == 3 and parts[0] == "docs" and parts[1] in (".versions", ".books"):
        name = parts[2]
    else:
        return False
    return (
        bool(_PROJECT_NAME_RE.fullmatch(name))
        and ".." not in name
        and name not in (".versions", ".books", _NEVER_STAGED_DIR)
    )


def _nul_list(text: str) -> list[str]:
    return [p for p in text.split("\0") if p]


def _has_head(root) -> bool:
    proc = subprocess.run(
        ["git", "-C", str(root), "rev-parse", "--verify", "--quiet", "HEAD"],
        capture_output=True, text=True, timeout=config.git_timeout_s(),
    )
    return proc.returncode == 0


def tracked_paths(paths: Iterable[str], *, root) -> list[str]:
    """Files under ``paths`` that are in the index **or** in ``HEAD``, sorted.

    ``HEAD`` counts too: a deletion already staged but not yet committed is still
    published until a commit lands, so the reconcile must still treat it as tracked.
    """
    kept = [str(p) for p in paths]
    if not kept:
        return []
    found = set(_nul_list(_run(["--literal-pathspecs", "ls-files", "-z", "--", *kept], root=root).stdout))
    if _has_head(root):
        out = _run(["ls-tree", "-r", "-z", "--name-only", "HEAD", "--", *kept], root=root).stdout
        found.update(_nul_list(out))
    return sorted(found)


def pending_paths(paths: Iterable[str], *, root) -> list[str]:
    """Files under ``paths`` that ``git add`` would stage once the project is unmarked.

    Untracked files (honoring the tree's ``.gitignore`` files but **not**
    ``info/exclude``, the block being exactly what an unmark removes, nor a global
    excludes file) plus tracked files modified or deleted in the work tree. Sorted.
    """
    kept = [str(p) for p in paths]
    if not kept:
        return []
    others = _run(
        ["--literal-pathspecs", "ls-files", "-z", "--others",
         "--exclude-per-directory=.gitignore", "--", *kept],
        root=root,
    ).stdout
    modified = _run(
        ["--literal-pathspecs", "ls-files", "-z", "--modified", "--", *kept], root=root
    ).stdout
    return sorted(set(_nul_list(others)) | set(_nul_list(modified)))


def staged_paths(paths: Iterable[str], *, root) -> list[str]:
    """Files under ``paths`` whose staged state differs from ``HEAD``, sorted."""
    kept = [str(p) for p in paths]
    if not kept:
        return []
    out = _run(
        ["--literal-pathspecs", "diff", "--cached", "--name-only", "-z", "--", *kept],
        root=root,
    ).stdout
    return sorted(set(_nul_list(out)))


def untrack(paths: Iterable[str], *, root) -> None:
    """Remove a private project's footprint from the index, keeping every file on disk.

    ``git --literal-pathspecs rm -r --cached --quiet --ignore-unmatch -- <dirs>``.
    The reconcile's own primitive (P34-n0.S2): it bypasses the private-projects guard
    on purpose (untracking is exactly what the guard cannot do) and never deletes a
    file from the work tree. Narrow by construction: every path must be one of a
    project's three footprint directories (``docs/<p>``, ``docs/.versions/<p>``,
    ``docs/.books/<p>``), else ``ValueError`` before git runs, so it can never untrack
    ``docs/`` as a whole, a top-level page or anything outside ``docs/``.
    """
    rels = [_repo_rel(p, root) for p in paths]
    if not rels:
        return
    if not all(_is_footprint_dir(rel) for rel in rels):
        raise ValueError("untrack takes only a project's footprint directories")
    _run(["--literal-pathspecs", "rm", "-r", "--cached", "--quiet", "--ignore-unmatch",
          "--", *rels], root=root)


def has_staged_changes(*, root) -> bool:
    """Whether the index differs from ``HEAD`` (``git diff --cached --quiet``)."""
    cmd = ["git", "-C", str(root), "diff", "--cached", "--quiet"]
    try:
        proc = subprocess.run(cmd, capture_output=True, text=True, timeout=config.git_timeout_s())
    except subprocess.TimeoutExpired as exc:
        raise GitError(cmd, "timed out") from exc
    if proc.returncode in (0, 1):
        return proc.returncode == 1
    raise GitError(cmd, proc.stderr or proc.stdout)


def show(spec: str, *, root) -> Optional[str]:
    """The text of a blob (``HEAD:<path>``, ``:<path>``), or ``None`` when it is absent."""
    cmd = ["git", "-C", str(root), "show", spec]
    try:
        proc = subprocess.run(cmd, capture_output=True, text=True, timeout=config.git_timeout_s())
    except subprocess.TimeoutExpired as exc:
        raise GitError(cmd, "timed out") from exc
    return proc.stdout if proc.returncode == 0 else None


def index_lock_path(root) -> Path:
    """The checkout's ``index.lock`` (present while another git holds the index)."""
    out = _run(["rev-parse", "--git-path", "index.lock"], root=root).stdout.strip()
    path = Path(out)
    return path if path.is_absolute() else Path(root) / path


def _repo_rel(path, root) -> str:
    """A staged path as a normalized repo-relative POSIX string."""
    text = str(path)
    if os.path.isabs(text):
        try:
            text = Path(text).resolve().relative_to(Path(str(root)).resolve()).as_posix()
        except ValueError:
            pass
    return posixpath.normpath(text)


def _in_private_footprint(rel: str, private: set[str]) -> bool:
    if rel in _FOOTPRINT_ANCESTORS:
        return True
    parts = rel.split("/")
    if len(parts) < 2 or parts[0] != "docs":
        return False
    if parts[1] in (".versions", ".books"):
        return len(parts) >= 3 and parts[2] in private
    return parts[1] in private


def _index_links_private(root, private: set[str]) -> bool:
    text = _read_text(Path(str(root)) / "docs" / "index.md")
    return any(f"]({p}/" in text or f"](./{p}/" in text for p in private)


def _refuse_private(command: list[str], paths: list[str], *, root) -> None:
    """Raise ``GitError`` when staging ``paths`` could publish a private project.

    Refused: a path inside a listed project's footprint, an ancestor that would sweep
    one in (``docs``, ``docs/.versions``, ``docs/.books``, the repo root), and
    ``docs/index.md`` while its text links into a listed project. Fail closed: a block
    that cannot be read raises too. The message names no project and no path.
    """
    private = set(private_projects(root))
    if not private:
        return
    rels = [_repo_rel(p, root) for p in paths]
    if any(_in_private_footprint(rel, private) for rel in rels):
        raise GitError(
            ["git", "-C", str(root), *command],
            "refused: a path is inside a private project's footprint "
            "(info/exclude private-projects block); nothing was staged",
        )
    if "docs/index.md" in rels and _index_links_private(root, private):
        raise GitError(
            ["git", "-C", str(root), *command],
            "refused: docs/index.md links into a private project "
            "(info/exclude private-projects block); nothing was staged",
        )


def add(paths: Iterable[str], *, root) -> None:
    """``git -C <root> add -- <paths...>`` — only the given paths, never ``-A``.

    A path inside an ``.assets/`` tree is dropped before git sees it (P30.S4): the
    images live on the box disk only, whatever a caller passes. ``.assets/`` is also
    gitignored, so this is the second of two guards.

    P34: a path in a private project's footprint, or a ``docs/index.md`` that links
    into one, raises ``GitError`` before anything is staged (``_refuse_private``).
    Pathspecs are literal (``--literal-pathspecs``), so the paths checked are exactly
    the paths git stages: no glob can widen them.
    """
    kept = [p for p in paths if _NEVER_STAGED_DIR not in Path(str(p)).parts]
    if not kept:
        return
    _refuse_private(["add", "--", *kept], kept, root=root)
    _run(["--literal-pathspecs", "add", "--", *kept], root=root)


def remove(paths: Iterable[str], *, root) -> None:
    """Stage the deletion of files already gone from the work tree (P30.S5).

    ``git -C <root> rm --cached --quiet --ignore-unmatch -- <paths...>``: the html ->
    native migration unlinks the old ``.html`` file itself, and this records that
    removal in the same scoped commit. ``--ignore-unmatch`` keeps a never-committed
    path from failing the commit. Refuses private footprints exactly like ``add``.
    """
    kept = [p for p in paths if _NEVER_STAGED_DIR not in Path(str(p)).parts]
    if not kept:
        return
    args = ["rm", "--cached", "--quiet", "--ignore-unmatch", "--", *kept]
    _refuse_private(args, kept, root=root)
    _run(["--literal-pathspecs", *args], root=root)


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
