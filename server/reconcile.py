"""Make tenant #1's git tree mirror project visibility (P34-n0.S2).

Tenant #1's content root is the git-published ``docs/`` tree, but only its ``public``
registry projects may be in git. Since P34-n0.S1 a private project's writes never
commit; this module repairs the tree for projects that were published before, or
whose visibility changed. One idempotent routine, ``reconcile``, makes the tree match
the registry for the names it is given, and **only** those names: ``docs/`` also
holds directories that are not projects (site assets, the workspace docs, top-level
pages), and nothing outside a named project's footprint is ever touched.

A project's footprint is ``docs/<p>/``, ``docs/.versions/<p>/``, ``docs/.books/<p>/``
and its bullets in ``docs/index.md``.

* **To private** (a non-``public`` project whose footprint is tracked or linked from
  the index, or that is not yet marked):

  1. the checkout's ``info/exclude`` private-projects block is rewritten **first**
     with the full private set (``gitops.write_private_projects``), so the staging
     guard holds even if a later git step fails;
  2. the footprint is untracked (``gitops.untrack``: ``git rm -r --cached``, every
     file stays on disk);
  3. every line linking into a marked project leaves ``docs/index.md``
     (``documents.remove_project_bullets``); this covers marked names outside the
     run's scope too, because the guard refuses an index that links into any of them;
  4. ``docs/index.md`` is staged, which the guard now allows.

* **To public** (a ``public`` project that is marked, or has files ``git add`` would
  stage: untracked, or tracked and modified): it is
  unmarked, its landing is ensured (when it has a directory), its bullets are
  rebuilt from the documents database (tenant #1's rows, oldest first, through
  ``documents.update_recent_index``, whose dedupe keeps existing bullets), and its
  existing footprint dirs plus ``docs/index.md`` are staged through ``gitops.add``
  (the ``.assets`` drop and the guard still apply). If staging or the commit fails,
  the project is marked again, its bullets leave the index, and the failure is
  reported: re-running is the retry.

* **One commit per run**, made only when this run staged something and the index
  differs from ``HEAD`` (never an empty commit). When anything was unpublished the
  message names no project (``docs: unpublish private projects (N)``); a publish-only
  run may name its public projects. A second run with nothing to change commits
  nothing.

The ``Report`` lists per project the action, the paths untracked or staged, the
bullets removed or added, and the commit sha. Only the CLI prints it, on the
operator's terminal; it never goes into a repo file, and no message, log line or
commit message on the unpublish path names a project.

Two entry points share the routine:

* **the visibility toggle** (``PATCH /app/projects/{id}`` in ``server/app_api.py``),
  for one tenant #1 project, under ``WRITE_LOCK`` in a threadpool, after the
  registry update (Postgres first, git second);
* **this module's CLI**, for every tenant #1 registry project::

      python -m server.reconcile [--dry-run] [--push] [--verbose]

  The CLI is another process, so it cannot hold the server's ``WRITE_LOCK``: run it
  only while KB writes are paused. It refuses in legacy mode (no ``DATABASE_URL``),
  exits non-zero with **no change** when tenant #1 or its registry cannot be read
  (an unknown registry never means "unpublish everything"), and waits up to ~10 s
  for ``index.lock`` to clear before any git step. ``--dry-run`` computes the report
  without writing a byte (the exclude file included). ``--push`` runs
  ``gitops.push`` once after a commit (or when ``HEAD`` is already ahead of
  ``origin/main``); without it nothing is pushed and the owed push is printed.
"""
from __future__ import annotations

import argparse
import asyncio
import sqlite3
import sys
import time
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Iterable, Mapping, Optional

from server import config, db, gitops
from server import documents as documents_mod

PUBLIC = "public"

# Per-project actions.
UNPUBLISH = "unpublish"  # private, and its footprint was tracked or linked
MARK = "mark"  # private, nothing published, only the exclude block changes
PUBLISH = "publish"  # public, and it was marked or had untracked files
NONE = "none"  # already mirrors the registry
SKIPPED = "skipped"  # not a name a project directory can have; never touched

INDEX_REL = "docs/index.md"

# ``docs/`` directories that are never a project's footprint, whatever the registry
# holds: the reserved archive/manifest/asset trees, the workspace docs and the site
# chrome. A registry name equal to one of them is skipped, never untracked.
_NOT_PROJECTS = frozenset({
    ".versions", ".books", ".assets",
    "current", "versions", "reference",
    "assets", "stylesheets", "javascripts",
})

INDEX_LOCK_WAIT_S = 10.0


@dataclass
class ProjectReport:
    """What the run did (or, on a dry run, would do) to one registry project."""

    name: str
    visibility: str
    action: str = NONE
    untracked: list[str] = field(default_factory=list)
    staged: list[str] = field(default_factory=list)
    bullets_removed: int = 0
    bullets_added: int = 0
    landing_created: bool = False
    note: Optional[str] = None
    error: Optional[str] = None


@dataclass
class Report:
    """One run's result. ``error`` aborted the run; a project's own error did not."""

    dry_run: bool
    projects: list[ProjectReport] = field(default_factory=list)
    # Lines removed from docs/index.md for marked projects outside the run's scope
    # (counted, never named).
    other_bullets_removed: int = 0
    other_projects_stripped: int = 0
    exclude_changed: bool = False
    commit_sha: Optional[str] = None
    commit_message: Optional[str] = None
    error: Optional[str] = None

    @property
    def committed(self) -> bool:
        return self.commit_sha is not None

    def project(self, name: str) -> Optional[ProjectReport]:
        return next((p for p in self.projects if p.name == name), None)

    def by_action(self, action: str) -> list[ProjectReport]:
        return [p for p in self.projects if p.action == action]


def error_stage(error: Optional[str]) -> Optional[str]:
    """The stage word of a report error (``"untrack: ..."`` -> ``"untrack"``)."""
    if not error:
        return None
    return error.split(":", 1)[0].strip() or None


def _is_project_dir_name(name: str, docs: Path) -> bool:
    try:
        documents_mod.validate_project(name)
    except Exception:  # noqa: BLE001 - any invalid shape is "not a project dir"
        return False
    if name in _NOT_PROJECTS or name.startswith("."):
        return False
    path = docs / name
    return not (path.exists() and not path.is_dir())  # a top-level page is never one


def _links_into(text: Optional[str], name: str) -> bool:
    return bool(text) and documents_mod.remove_project_bullets(text, name)[1] > 0


def _read_index(docs: Path) -> Optional[str]:
    index = docs / "index.md"
    return index.read_text(encoding="utf-8") if index.is_file() else None


def _document_rows(db_conn, tenant_db_id, project: str, docs: Path) -> list[tuple[str, str, str]]:
    """Tenant #1's documents of ``project`` as ``(date, title, rel_path)``, oldest first.

    Tenant #1's ``docs/`` rows carry its uuid string once a tenant-mode reindex or
    write stamped them, and the ``''`` legacy sentinel before that, so both stamps
    count. A row whose file is not on disk is skipped (no dead bullet).
    """
    if db_conn is None:
        return []
    stamps = [""] + ([str(tenant_db_id)] if tenant_db_id else [])
    marks = ",".join("?" for _ in stamps)
    rows = db_conn.execute(
        f"SELECT date, title, rel_path FROM documents WHERE project = ? "
        f"AND tenant_id IN ({marks}) ORDER BY date ASC, id ASC",
        [project, *stamps],
    ).fetchall()
    seen: set[str] = set()
    out: list[tuple[str, str, str]] = []
    for row in rows:
        date, title, rel = row[0], row[1], row[2]
        if rel in seen or not str(rel).startswith(f"{project}/") or not (docs / rel).is_file():
            continue
        seen.add(rel)
        out.append((date, title, rel))
    return out


def _commit_message(unpublished: int, published: list[str]) -> Optional[str]:
    if unpublished and published:
        return (
            f"docs: unpublish private projects ({unpublished}), "
            f"publish public projects ({len(published)})"
        )
    if unpublished:
        return f"docs: unpublish private projects ({unpublished})"
    if published:
        if len(published) <= 3:
            return f"docs: publish {', '.join(sorted(published))}"
        return f"docs: publish public projects ({len(published)})"
    return None


def _classify(
    scope: Mapping[str, str], *, root: Path, docs: Path, marked: set[str]
) -> list[ProjectReport]:
    """Decide each in-scope project's action from the tree as it is (read-only)."""
    index_texts = [
        _read_index(docs),
        gitops.show(f":{INDEX_REL}", root=root),
        gitops.show(f"HEAD:{INDEX_REL}", root=root),
    ]
    reports: list[ProjectReport] = []
    for name in sorted(scope):
        visibility = str(scope[name])
        pr = ProjectReport(name=name, visibility=visibility)
        reports.append(pr)
        if not _is_project_dir_name(name, docs):
            pr.action, pr.note = SKIPPED, "not a name a project directory can have"
            continue
        dirs = gitops.footprint_dirs(name)
        if visibility != PUBLIC:
            pr.untracked = gitops.tracked_paths(dirs, root=root)
            if pr.untracked or any(_links_into(t, name) for t in index_texts):
                pr.action = UNPUBLISH
            elif name not in marked:
                pr.action = MARK
        else:
            pr.staged = gitops.pending_paths(dirs, root=root)
            if name in marked or pr.staged:
                pr.action = PUBLISH
    return reports


def reconcile(
    projects: Mapping[str, str],
    *,
    kb_root,
    db_conn,
    tenant_db_id=None,
    only: Optional[str] = None,
    dry_run: bool = False,
) -> Report:
    """Make the git tree at ``kb_root`` mirror ``projects`` (name -> visibility).

    ``projects`` is tenant #1's registry, read by the caller; ``only`` narrows the run
    to one name (the toggle). ``db_conn`` is the documents database (``None``: no
    bullets are rebuilt); ``tenant_db_id`` is tenant #1's uuid, whose stamp (and the
    ``''`` sentinel) its ``docs/`` rows carry. ``dry_run`` reads only. Never raises for
    a git failure: the ``Report`` carries it. Callers in the server hold
    ``WRITE_LOCK``.
    """
    root = Path(kb_root)
    docs = root / "docs"
    report = Report(dry_run=dry_run)
    scope = {n: v for n, v in projects.items() if only is None or n == only}
    try:
        marked = set(gitops.private_projects(root))
        report.projects = _classify(scope, root=root, docs=docs, marked=marked)
    except (gitops.GitError, OSError, ValueError) as exc:
        report.error = f"read: {exc}"
        return report

    eligible = [p for p in report.projects if p.action != SKIPPED]
    private = {p.name for p in eligible if p.visibility != PUBLIC}
    unpublishing = [p for p in eligible if p.action == UNPUBLISH]
    publishing = [p for p in eligible if p.action == PUBLISH]
    block = (marked | private) - {p.name for p in publishing}
    report.exclude_changed = block != marked

    if dry_run:
        _simulate(report, block=block, docs=docs, db_conn=db_conn, tenant_db_id=tenant_db_id)
        return report

    # 1. The exclude block first, with the full private set: from here on the guard
    #    refuses every private footprint, whatever fails next.
    try:
        gitops.write_private_projects(marked | private, root=root)
    except (gitops.GitError, OSError, ValueError) as exc:
        report.error = f"exclude: {exc}"
        return report

    # 2. Untrack each private footprint (files stay on disk).
    try:
        for pr in unpublishing:
            gitops.untrack(gitops.footprint_dirs(pr.name), root=root)
    except (gitops.GitError, ValueError) as exc:
        report.error = f"untrack: {exc}"
        return report

    # 3. Unmark the projects about to publish, then drop every line linking into a
    #    still-marked project from the index and stage it.
    try:
        for pr in publishing:
            gitops.unmark_private(pr.name, root=root)
        stripped = _strip_index(docs, block)
        for name, count in stripped.items():
            pr = report.project(name) if name in scope else None
            if pr is not None:
                pr.bullets_removed = count
            else:
                report.other_bullets_removed += count
                report.other_projects_stripped += 1
        if (unpublishing or stripped) and (docs / "index.md").is_file():
            gitops.add([INDEX_REL], root=root)
    except (gitops.GitError, OSError, ValueError) as exc:
        report.error = f"index: {exc}"
        _remark(publishing, root=root, docs=docs)
        return report

    # 4. Publish each public project; a failure re-marks only that one.
    published: list[ProjectReport] = []
    for pr in publishing:
        try:
            _publish_one(pr, root=root, docs=docs, db_conn=db_conn, tenant_db_id=tenant_db_id)
        except (gitops.GitError, OSError, ValueError, sqlite3.Error) as exc:
            pr.error = f"publish: {exc}"
            _remark([pr], root=root, docs=docs)
            continue
        if pr.staged:
            published.append(pr)

    # 5. One commit, only when this run staged something.
    unpublished = len(unpublishing) + report.other_projects_stripped
    message = _commit_message(unpublished, [p.name for p in published])
    try:
        if message and gitops.has_staged_changes(root=root):
            report.commit_message = message
            report.commit_sha = gitops.commit(message, root=root)
    except gitops.GitError as exc:
        report.error = f"commit: {exc}"
        report.commit_message = None
        _remark(published, root=root, docs=docs)
    return report


def _strip_index(docs: Path, names: Iterable[str]) -> dict[str, int]:
    """Remove every line linking into each of ``names`` from ``docs/index.md``."""
    index = docs / "index.md"
    if not index.is_file():
        return {}
    text = index.read_text(encoding="utf-8")
    counts: dict[str, int] = {}
    for name in sorted(names):
        text, removed = documents_mod.remove_project_bullets(text, name)
        if removed:
            counts[name] = removed
    if counts:
        index.write_text(text, encoding="utf-8")
    return counts


def _publish_one(pr: ProjectReport, *, root: Path, docs: Path, db_conn, tenant_db_id) -> None:
    name = pr.name
    pr.staged = []  # the classify preview is replaced by what was really staged
    if (docs / name).is_dir():
        pr.landing_created = documents_mod.ensure_project_landing(docs, name)
    for date, title, rel in _document_rows(db_conn, tenant_db_id, name, docs):
        if documents_mod.update_recent_index(
            docs, date=date, title=title, rel_path=rel, project=name
        ):
            pr.bullets_added += 1
    paths = [d for d in gitops.footprint_dirs(name) if (root / d).is_dir()]
    if pr.bullets_added:
        paths.append(INDEX_REL)
    if paths:
        gitops.add(paths, root=root)
    pr.staged = gitops.staged_paths(paths, root=root)


def _remark(prs: Iterable[ProjectReport], *, root: Path, docs: Path) -> None:
    """Fail closed after a failed publish: mark again, and drop its index lines."""
    names = [p.name for p in prs]
    for name in names:
        try:
            gitops.mark_private(name, root=root)
        except (gitops.GitError, OSError, ValueError):
            pass
    try:
        _strip_index(docs, names)
    except OSError:
        pass


def _simulate(report: Report, *, block: set[str], docs: Path, db_conn, tenant_db_id) -> None:
    """Fill a dry run's counts by replaying the run on the index text in memory."""
    text = _read_index(docs) or ""
    in_scope = {p.name for p in report.projects}
    for name in sorted(block):
        text, removed = documents_mod.remove_project_bullets(text, name)
        if not removed:
            continue
        pr = report.project(name) if name in in_scope else None
        if pr is not None:
            pr.bullets_removed = removed
        else:
            report.other_bullets_removed += removed
            report.other_projects_stripped += 1
    published: list[str] = []
    for pr in report.by_action(PUBLISH):
        landing = docs / pr.name / "index.md"
        if (docs / pr.name).is_dir() and not landing.exists():
            pr.landing_created = True
            pr.staged = sorted({*pr.staged, f"docs/{pr.name}/index.md"})
        try:
            rows = _document_rows(db_conn, tenant_db_id, pr.name, docs)
        except sqlite3.Error as exc:
            pr.note = f"documents database unreadable: {exc}"
            rows = []
        for date, title, rel in rows:
            if rel in text:
                continue
            text, _ = documents_mod.insert_recent_bullet(
                text, date=date, title=title, rel_path=rel, project=pr.name
            )
            pr.bullets_added += 1
        if pr.bullets_added:
            pr.staged.append(INDEX_REL)
        if pr.staged:
            published.append(pr.name)
    unpublished = len(report.by_action(UNPUBLISH)) + report.other_projects_stripped
    report.commit_message = _commit_message(unpublished, published)


# --- the CLI ----------------------------------------------------------------


def format_report(report: Report, *, verbose: bool = False) -> str:
    """The operator's terminal view of a run (names allowed here, and only here)."""
    head = "reconcile (dry run: nothing written)" if report.dry_run else "reconcile"
    lines = [f"{head}: {len(report.projects)} registry project(s) in scope"]
    for pr in report.projects:
        bits = []
        if pr.untracked:
            bits.append(f"{'would untrack' if report.dry_run else 'untracked'} {len(pr.untracked)} file(s)")
        if pr.action == PUBLISH and pr.staged:
            bits.append(f"{'would stage' if report.dry_run else 'staged'} {len(pr.staged)} path(s)")
        if pr.bullets_removed:
            bits.append(f"index lines -{pr.bullets_removed}")
        if pr.bullets_added:
            bits.append(f"index bullets +{pr.bullets_added}")
        if pr.landing_created:
            bits.append("landing created" if not report.dry_run else "landing would be created")
        if pr.note:
            bits.append(f"note: {pr.note}")
        if pr.error:
            bits.append(f"ERROR {pr.error}")
        lines.append(f"  {pr.action:<9} {pr.visibility:<8} {pr.name}" + (f"  ({'; '.join(bits)})" if bits else ""))
        if verbose:
            listed = pr.untracked if pr.action == UNPUBLISH else pr.staged if pr.action == PUBLISH else []
            lines.extend(f"      {path}" for path in listed)
    if report.other_projects_stripped:
        lines.append(
            f"  index lines removed for {report.other_projects_stripped} other marked "
            f"project(s): {report.other_bullets_removed}"
        )
    lines.append(
        "  exclude block: "
        + (("would change" if report.dry_run else "changed") if report.exclude_changed else "unchanged")
    )
    if report.error:
        lines.append(f"  ERROR {report.error} (the run stopped; nothing was committed)")
    if report.committed:
        lines.append(f"  committed {report.commit_sha}: {report.commit_message}")
    elif report.dry_run and report.commit_message:
        lines.append(f"  would commit: {report.commit_message}")
    elif not report.error:
        lines.append("  nothing to commit")
    return "\n".join(lines)


def _parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="python -m server.reconcile",
        description=(
            "Make tenant #1's git tree mirror project visibility: untrack and unlist "
            "every private registry project, republish every public one that is "
            "marked or untracked. Run it ONLY while KB writes are paused: it is "
            "another process and cannot hold the server's write lock."
        ),
    )
    parser.add_argument("--dry-run", action="store_true",
                        help="print what would change; write nothing (not even info/exclude)")
    parser.add_argument("--push", action="store_true",
                        help="push once after the commit (fetch, rebase, non-force push)")
    parser.add_argument("--verbose", action="store_true",
                        help="list every path untracked or staged")
    return parser


def _wait_for_index_lock(root: Path, timeout: float = INDEX_LOCK_WAIT_S) -> bool:
    lock = gitops.index_lock_path(root)
    deadline = time.monotonic() + timeout
    while lock.exists():
        if time.monotonic() >= deadline:
            return False
        time.sleep(0.25)
    return True


def _ahead_of_origin(root: Path) -> bool:
    try:
        out = gitops._run(["rev-list", "--count", "origin/main..HEAD"], root=root).stdout
    except gitops.GitError:
        return False
    return out.strip().isdigit() and int(out.strip()) > 0


def _open_documents_db(dry_run: bool) -> Optional[Any]:
    path = config.db_path()
    if dry_run:
        if not path.is_file():
            return None
        return sqlite3.connect(f"file:{path}?mode=ro", uri=True)
    return db.connect(path)


async def _read_registry() -> tuple[Any, dict[str, str]]:
    from server.accounts.service import get_accounts_service
    from server.api_auth import get_tenant_one_id

    tenant_one = await get_tenant_one_id()
    if tenant_one is None:
        return None, {}
    records = await get_accounts_service().list_projects_for_tenant(tenant_one)
    projects: dict[str, str] = {}
    for record in records:  # oldest first; the oldest row wins, like get_project_by_name
        projects.setdefault(record.name, record.visibility)
    return tenant_one, projects


async def _registry_or_none() -> tuple[Any, Optional[dict[str, str]], Optional[str]]:
    from server.persistence.engine import dispose_engine

    try:
        tenant_one, projects = await _read_registry()
    except Exception as exc:  # noqa: BLE001 - unknown is never "unpublish everything"
        return None, None, f"the registry could not be read ({type(exc).__name__})"
    finally:
        await dispose_engine()
    if tenant_one is None:
        return None, None, "tenant #1 could not be resolved (check KB_OPERATOR_EMAIL)"
    return tenant_one, projects, None


def main(argv: Optional[list[str]] = None) -> int:
    args = _parser().parse_args(argv)
    out, err = sys.stdout, sys.stderr
    if not config.database_url():
        print("refused: DATABASE_URL is not set; legacy mode has no project registry",
              file=err)
        return 2
    tenant_one, projects, problem = asyncio.run(_registry_or_none())
    if problem or projects is None:
        print(f"refused: {problem}; nothing was changed", file=err)
        return 3
    root = config.kb_root()
    try:
        if not _wait_for_index_lock(root):
            print("refused: index.lock is still held after "
                  f"{INDEX_LOCK_WAIT_S:g}s; is a write or another git running?", file=err)
            return 4
    except gitops.GitError:
        print("refused: KB_ROOT is not a git checkout", file=err)
        return 4
    conn = _open_documents_db(args.dry_run)
    try:
        report = reconcile(
            projects, kb_root=root, db_conn=conn, tenant_db_id=tenant_one,
            dry_run=args.dry_run,
        )
    finally:
        if conn is not None:
            conn.close()
    print(format_report(report, verbose=args.verbose), file=out)
    if report.error:
        return 1
    if args.dry_run:
        return 0
    if args.push:
        if report.committed or _ahead_of_origin(root):
            try:
                sha = gitops.push(root=root)
            except gitops.GitError as exc:
                print(f"push FAILED: {exc.stderr or exc}; the local commit stays", file=err)
                return 1
            print(f"  pushed: origin/main is now {sha}", file=out)
        else:
            print("  push: nothing to push", file=out)
    elif report.committed:
        print("  push still owed: nothing was pushed (re-run with --push)", file=out)
    return 0


if __name__ == "__main__":
    sys.exit(main())
