#!/usr/bin/env python3
"""Merge vocky's Feedback data into the platform and apply an org and project mapping.

One idempotent tool for the move from two products to one. It reads vocky's tables
from a database restored from a vocky dump, and changes the platform in four places:

1. **Postgres (the accounts plane), in one transaction**: tenant #1 (the operator's
   first org) is renamed in place; a new org is created with the operator as owner and
   ``created_at`` = now (never a copied date, so tenant #1 stays the oldest); the mapped
   projects move to the new org or are renamed, carrying every row keyed by tenant and
   project name (reader positions, bookmarks, annotations, quiz attempts, review cards,
   Listen positions) and their usage events; vocky's ``feedback_events``,
   ``feedback_comments`` and ``feedback_attachments`` are copied **by column name**,
   ids kept, only ``project_id`` remapped. A row whose id is already present is
   skipped, so a later run copies only what was added since.
2. **The SQLite content plane** (``KB_DB_PATH``): each moved or renamed document's row
   is re-keyed in place (tenant, project, rel_path; its versions, books, chapters and
   variants with it), so its id, its ``/documents/<id>`` URL and its embedding survive
   the next reindex, which would otherwise insert it again under a new id.
3. **The content root**: each project's folder moves or is renamed with everything
   inside, ``.versions``, ``.books`` and ``.assets`` included (tenant #1's root is
   ``<KB_ROOT>/docs``, every other org's ``<KB_ROOT>/tenants/<uuid>``); a renamed
   project's book manifests get their variant paths rewritten. Each move is checked
   file by file (sha256) before the source is gone.
4. **Attachment files**: copied from a source folder into
   ``KB_FEEDBACK_ATTACHMENTS_DIR`` when attachment rows are copied.

5. **The private-projects block**: when the content root is a git checkout, each
   renamed private project is marked under its new name in the checkout's
   ``info/exclude`` block (``server.gitops.mark_private``, the call a private write
   makes), so ``git status`` stays clean and the staging guard covers its new folders.
   The old name's lines stay, as they do when the server's reconcile sees a name leave
   the registry (it only ever adds names; it removes one only when that project turns
   public). Moved projects land under the gitignored ``tenants/`` tree.

**Run it with the API stopped.** No write and no reindex may run between its steps (a
reindex between the SQLite re-key and the folder moves gives every moved document a new
id); the code offers no reliable way to see that from here, so this is the operator's
precondition. ``--apply`` first writes a journal, ``<KB_ROOT>/data/merge_vocky_journal.json``
(gitignored, beside the SQLite file): every moved or renamed document's id, keyed by its
pre-run tenant and path, with its post-run place. A re-run continues from it (it never
re-journals a path already in it), and the verify compares the live ids against it, so a
renumbered document fails the verify by name. Keep the file with the run's backup.

Steps 2-5 come after the Postgres commit; each step reads the state it finds, so a run
interrupted between them is finished by running again. A built-in verify runs at the
end of ``--apply`` and alone with ``--verify``.

The mapping is given at run time, never hard-coded: a JSON file (``--mapping FILE``, or
``--mapping -`` to read it from stdin, e.g. through ``docker compose exec -T``) and/or
flags (flags win). Example, with invented names::

    {
      "operator_email": "owner@example.com",
      "tenant_one": {"name": "Home", "id": "<optional: tenant #1's uuid, checked>"},
      "new_org": {"name": "Acme", "projects": ["alpha", "alpha-lab"]},
      "renames": {"old-name": "new-name"},
      "feedback": {"vocky-project": "target-project", "other": "Acme/target"}
    }

``renames`` apply inside tenant #1. A ``feedback`` target names a project **as it is
called after the run**: ``<project>`` (tenant #1's, or the new org's when only it has
that name after the run, e.g. a moved project) or ``<org name>/<project>`` naming
tenant #1 or the new org. A target that names a project this run renames or moves by
its old place (``old-name``, ``<tenant #1>/alpha`` above), or a bare name both orgs
will have, is refused, saying which name to use. A target nobody has after the run is
created in its org. The dry run, the apply and the verify resolve targets through one
function, and the dry run prints the org and project id the apply will use.
Flags: ``--operator-email``, ``--tenant-one-name``, ``--tenant-one-id``,
``--new-org``, ``--move NAME`` (repeat), ``--rename OLD=NEW`` (repeat),
``--feedback SRC=DST`` (repeat).

Modes::

    # dry run (the default): the whole plan and every count; writes nothing
    python scripts/merge_vocky.py --mapping map.json --vocky-db vocky_src

    # apply, then verify
    python scripts/merge_vocky.py --mapping map.json --vocky-db vocky_src --apply

    # verify only
    python scripts/merge_vocky.py --mapping map.json --vocky-db vocky_src --verify

Connections: the platform's ``DATABASE_URL`` (or ``--database-url``); vocky's database
by ``--vocky-dsn`` or, on the same server as ``DATABASE_URL``, by name
(``--vocky-db``, so no password is typed). Content: ``KB_ROOT`` (or
``--kb-root``), ``KB_DB_PATH`` (or ``--sqlite``), ``KB_FEEDBACK_ATTACHMENTS_DIR`` (or
``--attachments-dir``); ``--attachments-source`` is the folder holding vocky's
attachment files (required only when attachment rows are to be copied).

It refuses, changing nothing (exit 2), when: the operator's email is missing on either
side; a target project name is already taken (Postgres, reader rows, SQLite rows or
the folder on disk); attachment rows are to be copied and no source folder was given;
tenant #1 would not stay the oldest; a ``feedback`` target is a pre-run or ambiguous
name; on a git checkout, any file under a project's folders that it would move or
rename is tracked by git, or a public project would be renamed (make the project
private in the app first: only the app's publish path may change tracked library
content), or the content root is not the checkout's top level, or the journal's path is
not ignored; the journal belongs to another run; and on any other state it cannot map
safely (listed in its output). The dry run shows the git check for every project and
lists every ``related:``, ``doc:`` and ``chapter:`` reference that names a renamed
project's old name (the verify lists them again; the tool never edits a document's
text). Exit 1 is a failed write or verify; 0 is success. It never selects or prints a
password hash, token or key, and masks passwords in DSNs.
"""
from __future__ import annotations

import argparse
import asyncio
import errno
import hashlib
import json
import os
import re
import shutil
import sqlite3
import subprocess
import sys
import tempfile
from dataclasses import dataclass, field
from datetime import UTC, datetime
from pathlib import Path
from typing import Any, Optional
from uuid import UUID

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

import psycopg  # noqa: E402
from psycopg.rows import dict_row  # noqa: E402
from sqlalchemy import make_url, text  # noqa: E402
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine  # noqa: E402

from server import books as books_mod  # noqa: E402
from server import documents as documents_mod  # noqa: E402
from server import gitops  # noqa: E402
from server.accounts.repository import AccountsRepository  # noqa: E402
from server.accounts.types import CreateProject  # noqa: E402
from server.documents import ConventionError, validate_project  # noqa: E402

EXIT_OK, EXIT_FAILED, EXIT_REFUSED = 0, 1, 2
FEEDBACK_TABLES = ("feedback_events", "feedback_comments", "feedback_attachments")
SUBTREES = ("", ".versions", ".books", ".assets")  # "" = the project folder itself
SQLITE_TABLES = ("documents", "document_versions", "books", "chapters", "chapter_variants")
JOURNAL_NAME = "merge_vocky_journal.json"  # under <KB_ROOT>/data/, gitignored
PRECONDITION = ("precondition for --apply: the API is stopped (no write and no reindex may "
                "run between the steps)")


class Refused(Exception):
    """A reason to stop before any write."""


def out(line: str = "") -> None:
    print(line, flush=True)


def mask(url: str) -> str:
    try:
        return make_url(url).render_as_string(hide_password=True)
    except Exception:  # pragma: no cover - a DSN that is not a URL
        return "<dsn>"


# --- the mapping ----------------------------------------------------------------


@dataclass
class Mapping:
    operator_email: str
    tenant_one_name: str
    new_org: str
    tenant_one_id: Optional[UUID] = None
    moves: list[str] = field(default_factory=list)
    renames: dict[str, str] = field(default_factory=dict)
    # vocky project name -> (the org named in the target, or None for a bare name, target
    # project name by its post-run name)
    feedback: dict[str, tuple[Optional[str], str]] = field(default_factory=dict)


def _pairs(values: list[str], what: str) -> dict[str, str]:
    result: dict[str, str] = {}
    for raw in values or []:
        if "=" not in raw:
            raise Refused(f"{what} {raw!r}: expected OLD=NEW")
        old, new = raw.split("=", 1)
        result[old.strip()] = new.strip()
    return result


def load_mapping(args: argparse.Namespace) -> Mapping:
    data: dict[str, Any] = {}
    if args.mapping:
        try:
            raw = sys.stdin.read() if args.mapping == "-" else \
                Path(args.mapping).read_text(encoding="utf-8")
            data = json.loads(raw)
        except (OSError, json.JSONDecodeError) as exc:
            raise Refused(f"unreadable mapping file: {exc}")
    t1 = data.get("tenant_one") or {}
    new_org = data.get("new_org") or {}
    email = (args.operator_email or data.get("operator_email") or "").strip().lower()
    t1_name = args.tenant_one_name or t1.get("name") or ""
    t1_id_raw = args.tenant_one_id or t1.get("id")
    org_name = args.new_org or new_org.get("name") or ""
    moves = list(args.move or new_org.get("projects") or [])
    renames = dict(data.get("renames") or {})
    renames.update(_pairs(args.rename, "--rename"))
    fb_raw = dict(data.get("feedback") or {})
    fb_raw.update(_pairs(args.feedback, "--feedback"))
    if not email or not t1_name or not org_name:
        raise Refused("the mapping needs operator_email, tenant_one.name and new_org.name")
    if t1_name == org_name:
        raise Refused("tenant #1's new name and the new org's name must differ")
    try:
        t1_id = UUID(str(t1_id_raw)) if t1_id_raw else None
    except ValueError:
        raise Refused(f"tenant_one.id is not a uuid: {t1_id_raw!r}")
    feedback: dict[str, tuple[Optional[str], str]] = {}
    for src, dst in fb_raw.items():
        org, _, proj = dst.rpartition("/")
        if org and org not in (t1_name, org_name):
            raise Refused(f"feedback target {dst!r}: the org must be {t1_name!r} or {org_name!r}")
        feedback[src] = (org or None, proj)
    names = [*moves, *renames.keys(), *renames.values(), *(p for _, p in feedback.values())]
    for name in names:
        try:
            validate_project(name)
        except ConventionError:
            raise Refused(f"invalid project name in the mapping: {name!r}")
    if set(moves) & set(renames):
        raise Refused("a project may be moved or renamed, not both")
    if len(set(renames.values())) != len(renames):
        raise Refused("two renames share a target name")
    # Targets use post-run names: a name this run takes away is never a target.
    for src, (org, proj) in feedback.items():
        shown = f"{org}/{proj}" if org else proj
        if proj in renames:
            new = f"{org}/{renames[proj]}" if org == t1_name else renames[proj]
            raise Refused(f"feedback target {shown!r} for {src!r}: this run renames {proj!r} "
                          f"to {renames[proj]!r}; name the target {new!r} (targets use the "
                          "names projects have after the run)")
        if proj in moves and org == t1_name:
            raise Refused(f"feedback target {shown!r} for {src!r}: this run moves {proj!r} to "
                          f"{org_name!r}; name the target {org_name + '/' + proj!r} (targets "
                          "use the names projects have after the run)")
    return Mapping(email, t1_name, org_name, t1_id, moves, renames, feedback)


# --- the plan --------------------------------------------------------------------


@dataclass
class DiskMove:
    label: str
    src: Path
    dst: Path
    state: str  # todo | done | absent | conflict
    files: int = 0
    nbytes: int = 0


@dataclass
class ProjectOp:
    kind: str  # move | rename
    src_name: str
    dst_name: str
    src_tid: UUID
    dst_tid: Optional[UUID]  # None while the new org does not exist yet
    dst_org: str
    project_id: Optional[UUID] = None
    pg_state: str = "todo"  # todo | done
    visibility: Optional[str] = None
    reader: dict[str, int] = field(default_factory=dict)  # rows left at the source
    reader_dst: dict[str, int] = field(default_factory=dict)  # rows at the destination
    usage_events: int = 0
    sqlite_src: dict[str, int] = field(default_factory=dict)
    sqlite_dst: dict[str, int] = field(default_factory=dict)
    disk: list[DiskMove] = field(default_factory=list)
    manifests_to_fix: list[Path] = field(default_factory=list)
    tracked: Optional[list[str]] = None  # git-tracked files under its folders; None = no git

    @property
    def pending(self) -> bool:
        """Whether any step is still to do for this project."""
        return (self.pg_state == "todo" or any(self.sqlite_src.values())
                or any(d.state in ("todo", "conflict") for d in self.disk))

    @property
    def marks_private(self) -> bool:
        """Whether its new name belongs in the private-projects block (a private rename)."""
        return self.kind == "rename" and self.visibility != "public"


@dataclass
class FeedbackTarget:
    vocky_name: str
    vocky_project_id: str
    dst_org: str
    dst_tid: Optional[UUID]  # None while the new org does not exist yet
    dst_name: str
    dst_project_id: Optional[UUID]  # None = created by the apply
    in_new_org: bool = False
    events: int = 0
    events_null_event_at: int = 0
    to_copy: dict[str, int] = field(default_factory=dict)
    present: dict[str, int] = field(default_factory=dict)


@dataclass
class Plan:
    operator_kb_id: UUID
    operator_vocky_id: str
    t1_id: UUID
    t1_name: str
    t1_slug: Optional[str]
    t1_created: datetime
    org_id: Optional[UUID]
    org_created: Optional[datetime]
    ops: list[ProjectOp]
    feedback: list[FeedbackTarget]
    reader_tables: list[str]
    vocky_rows: dict[str, list[dict[str, Optional[str]]]]  # rows of mapped projects, as text
    kb_types: dict[str, list[tuple[str, str]]]  # table -> [(column, type)]
    present_ids: dict[str, set[str]]  # table -> ids already on the platform
    attachments_to_copy: list[dict[str, Optional[str]]]
    unlinked_attachments: int
    warnings: list[str]
    refusals: list[str]
    git_top: Optional[Path] = None  # the content root, when it is a git checkout
    journal: Optional[dict] = None  # the journal of an earlier --apply, when there is one


@dataclass
class Context:
    mapping: Mapping
    kb_url: str
    vocky_dsn: str
    kb_root: Path
    sqlite_path: Path
    attachments_dir: Path
    attachments_source: Optional[Path]

    def root_of(self, tid: Optional[UUID], t1: UUID) -> Path:
        if tid == t1:
            return self.kb_root / "docs"
        return self.kb_root / "tenants" / (str(tid) if tid else "<new org id>")

    @property
    def journal_path(self) -> Path:
        return self.kb_root / "data" / JOURNAL_NAME


def _subtree(root: Path, sub: str, project: str) -> Path:
    return root / sub / project if sub else root / project


def _tree_stats(path: Path) -> tuple[int, int]:
    files = [p for p in path.rglob("*") if p.is_file()] if path.is_dir() else []
    return len(files), sum(p.stat().st_size for p in files)


def _tree_hashes(path: Path) -> dict[str, str]:
    result: dict[str, str] = {}
    if not path.is_dir():
        return result
    for p in sorted(path.rglob("*")):
        if p.is_file():
            result[p.relative_to(path).as_posix()] = hashlib.sha256(p.read_bytes()).hexdigest()
    return result


async def _columns(session: AsyncSession, table: str) -> list[tuple[str, str]]:
    rows = await session.execute(text(
        "SELECT a.attname, format_type(a.atttypid, a.atttypmod) FROM pg_attribute a "
        "JOIN pg_class c ON c.oid = a.attrelid JOIN pg_namespace n ON n.oid = c.relnamespace "
        "WHERE c.relname = :t AND n.nspname = current_schema() AND a.attnum > 0 "
        "AND NOT a.attisdropped ORDER BY a.attnum"), {"t": table})
    return [(r[0], r[1]) for r in rows]


def _vocky_columns(vconn: psycopg.Connection, table: str) -> list[tuple[str, str]]:
    rows = vconn.execute(
        "SELECT a.attname, format_type(a.atttypid, a.atttypmod) FROM pg_attribute a "
        "JOIN pg_class c ON c.oid = a.attrelid JOIN pg_namespace n ON n.oid = c.relnamespace "
        "WHERE c.relname = %s AND n.nspname = current_schema() AND a.attnum > 0 "
        "AND NOT a.attisdropped ORDER BY a.attnum", (table,)).fetchall()
    return [(r["attname"], r["format_type"]) for r in rows]


def _text_select(cols: list[str]) -> str:
    return ", ".join(f'"{c}"::text AS "{c}"' for c in cols)


async def _reader_tables(session: AsyncSession) -> list[str]:
    rows = await session.execute(text(
        "SELECT table_name FROM information_schema.columns "
        "WHERE table_schema = current_schema() AND column_name IN ('tenant_id', 'project') "
        "GROUP BY table_name HAVING count(*) = 2 ORDER BY table_name"))
    return [r[0] for r in rows]


async def first_memberships(session: AsyncSession) -> dict[str, str]:
    """``{user id: the tenant of their first membership}`` for every platform user:
    ordered by the membership's ``created_at``, then the tenant's, then its id (the
    order ``list_tenants_for_user`` uses to pick tenant #1 and the default org)."""
    rows = await session.execute(text(
        "SELECT DISTINCT ON (m.user_id) m.user_id::text, m.tenant_id::text "
        "FROM tenant_members m JOIN tenants t ON t.id = m.tenant_id "
        "ORDER BY m.user_id, m.created_at, t.created_at, t.id"))
    return {r[0]: r[1] for r in rows}


async def _count(session: AsyncSession, sql: str, params: dict) -> int:
    return int((await session.execute(text(sql), params)).scalar_one())


def _sqlite_counts(conn: Optional[sqlite3.Connection], tid: Optional[UUID], name: str) -> dict:
    if conn is None or tid is None:
        return {}
    t, pfx = str(tid), name + "/"
    q = {
        "documents": ("SELECT count(*) FROM documents WHERE tenant_id = ? "
                      "AND substr(rel_path, 1, ?) = ?", (t, len(pfx), pfx)),
        "document_versions": ("SELECT count(*) FROM document_versions WHERE tenant_id = ? "
                              "AND substr(rel_path, 1, ?) = ?", (t, len(pfx), pfx)),
        "books": ("SELECT count(*) FROM books WHERE tenant_id = ? AND project = ?", (t, name)),
        "chapters": ("SELECT count(*) FROM chapters WHERE tenant_id = ? AND project = ?",
                     (t, name)),
        "chapter_variants": ("SELECT count(*) FROM chapter_variants WHERE tenant_id = ? "
                             "AND project = ?", (t, name)),
    }
    return {k: int(conn.execute(sql, p).fetchone()[0]) for k, (sql, p) in q.items()}


def _open_sqlite(path: Path) -> Optional[sqlite3.Connection]:
    if not path.is_file():
        return None
    conn = sqlite3.connect(str(path), timeout=30)
    names = {r[0] for r in conn.execute("SELECT name FROM sqlite_master WHERE type='table'")}
    if not set(SQLITE_TABLES) <= names:
        conn.close()
        return None
    return conn


# --- git: tracked files and the private-projects block ---------------------------


def git_checkout(root: Path) -> Optional[Path]:
    """``root`` when it is a git checkout's top level; ``None`` when it is in no checkout.

    Refused when it is inside a checkout but not its top level (the block's
    ``/docs/<project>/`` lines are anchored at the top level, as the server writes them),
    or when git cannot read it."""
    try:
        proc = subprocess.run(["git", "-C", str(root), "rev-parse", "--show-toplevel"],
                              capture_output=True, text=True, timeout=60)
    except FileNotFoundError:
        if (root / ".git").exists():
            raise Refused(f"{root} is a git checkout but git is not installed")
        return None
    if proc.returncode != 0:
        if (root / ".git").exists() or "dubious ownership" in proc.stderr:
            raise Refused(f"git cannot read the checkout at {root}: {proc.stderr.strip()[:300]}")
        return None  # not a git checkout
    top = Path(proc.stdout.strip()).resolve()
    if top != root.resolve():
        raise Refused(f"the content root {root} is inside the git checkout {top} but is not "
                      "its top level: the private-projects block could not cover it")
    return top


def _git_ignored(root: Path, rel: str) -> bool:
    """Whether git ignores ``rel`` (a tracked path never counts as ignored)."""
    proc = subprocess.run(["git", "-C", str(root), "check-ignore", "-q", "--", rel],
                          capture_output=True, text=True, timeout=60)
    if proc.returncode not in (0, 1):
        raise Refused(f"git check-ignore failed: {proc.stderr.strip()[:300]}")
    return proc.returncode == 0


def _op_paths(ctx: Context, op: "ProjectOp") -> list[str]:
    """Every folder the op reads or writes, relative to the content root."""
    paths = [_rel(d.src, ctx.kb_root) for d in op.disk]
    if op.dst_tid is not None:
        paths += [_rel(d.dst, ctx.kb_root) for d in op.disk]
    return paths


def apply_git(ctx: Context, plan: "Plan") -> list[str]:
    """Mark each renamed private project under its new name (idempotent); the marked."""
    if plan.git_top is None:
        return []
    return [op.dst_name for op in plan.ops
            if op.marks_private and gitops.mark_private(op.dst_name, root=ctx.kb_root)]


def _git_status(root: Path, paths: list[str]) -> list[str]:
    if not paths:
        return []
    proc = subprocess.run(
        ["git", "--no-optional-locks", "-C", str(root), "--literal-pathspecs", "status",
         "--porcelain", "--untracked-files=all", "--", *paths],
        capture_output=True, text=True, timeout=120)
    if proc.returncode != 0:
        return [f"(git status failed: {proc.stderr.strip()[:200]})"]
    return [line for line in proc.stdout.splitlines() if line.strip()]


# --- feedback targets: one resolution, by post-run names -------------------------


def resolve_targets(m: Mapping, ops: list["ProjectOp"], t1_names: dict[str, UUID],
                    org_names: dict[str, UUID]
                    ) -> tuple[dict[str, tuple[bool, Optional[UUID]]], list[str]]:
    """Each ``feedback`` target by the name it has after the run.

    ``t1_names`` / ``org_names`` are the projects of tenant #1 and the new org as they
    are now; the run's pending project steps are applied to them, so the answer is the
    same before, during and after the run. Returns ``{vocky name: (in the new org?,
    project id or None = to create)}`` and the refusals. The dry run, the apply and the
    verify all resolve through this one function."""
    post_t1, post_org = dict(t1_names), dict(org_names)
    for op in ops:
        if op.pg_state == "todo" and op.project_id is not None:
            post_t1.pop(op.src_name, None)
            (post_org if op.kind == "move" else post_t1)[op.dst_name] = op.project_id
    resolved: dict[str, tuple[bool, Optional[UUID]]] = {}
    refusals: list[str] = []
    for vname, (org, name) in m.feedback.items():
        if org == m.new_org:
            resolved[vname] = (True, post_org.get(name))
        elif org == m.tenant_one_name:
            resolved[vname] = (False, post_t1.get(name))
        elif name in post_t1 and name in post_org:
            refusals.append(f"feedback {vname} -> {name}: after the run both "
                            f"{m.tenant_one_name!r} and {m.new_org!r} have a project {name!r}; "
                            f"name the target {m.tenant_one_name + '/' + name!r} or "
                            f"{m.new_org + '/' + name!r}")
        elif name in post_org:
            resolved[vname] = (True, post_org[name])
        else:
            resolved[vname] = (False, post_t1.get(name))
    return resolved, refusals


# --- the id journal ----------------------------------------------------------------


def load_journal(path: Path) -> Optional[dict]:
    if not path.is_file():
        return None
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
        if not isinstance(data, dict) or not isinstance(data.get("documents"), list):
            raise ValueError("no documents list")
        for e in data["documents"]:
            int(e["id"]), str(e["pre"][0]), str(e["pre"][1]), str(e["post"])
            if e["post_org"] not in ("tenant_one", "new_org"):
                raise ValueError(f"post_org {e['post_org']!r}")
    except (OSError, ValueError, KeyError, IndexError, TypeError) as exc:
        raise Refused(f"the journal {path} is unreadable: {exc}; move it aside only if it "
                      "belongs to no run")
    return data


def _journal_rows(ctx: Context, plan: "Plan") -> list[dict]:
    """Each document still at a pending op's pre-run place, as a journal entry."""
    conn = _open_sqlite(ctx.sqlite_path)
    entries: list[dict] = []
    if conn is None:
        return entries
    try:
        for op in plan.ops:
            pfx = op.src_name + "/"
            rows = conn.execute("SELECT id, rel_path FROM documents WHERE tenant_id = ? "
                                "AND substr(rel_path, 1, ?) = ? ORDER BY id",
                                (str(op.src_tid), len(pfx), pfx)).fetchall()
            for doc_id, rel in rows:
                entries.append({
                    "id": int(doc_id), "pre": [str(op.src_tid), rel],
                    "post_org": "new_org" if op.kind == "move" else "tenant_one",
                    "post": op.dst_name + rel[len(op.src_name):]})
    finally:
        conn.close()
    return entries


def write_journal(ctx: Context, plan: "Plan") -> tuple[int, int]:
    """Write (or extend) the journal before any other write: ``(entries, added)``.

    An entry already journalled (by its pre-run place or its id) is never replaced, so
    a re-run keeps the first run's ids as the truth."""
    path = ctx.journal_path
    journal = load_journal(path) or {
        "tool": "merge_vocky", "version": 1, "created_at": datetime.now(UTC).isoformat(),
        "tenant_one": str(plan.t1_id), "new_org": ctx.mapping.new_org, "documents": []}
    have_keys = {tuple(e["pre"]) for e in journal["documents"]}
    have_ids = {int(e["id"]) for e in journal["documents"]}
    added = [e for e in _journal_rows(ctx, plan)
             if tuple(e["pre"]) not in have_keys and e["id"] not in have_ids]
    if added or not path.is_file():
        journal["documents"] += added
        journal["updated_at"] = datetime.now(UTC).isoformat()
        path.parent.mkdir(parents=True, exist_ok=True)
        fd, tmp = tempfile.mkstemp(dir=path.parent, prefix=".tmp-journal-")
        with os.fdopen(fd, "w", encoding="utf-8") as fh:
            json.dump(journal, fh, indent=1)
            fh.write("\n")
            fh.flush()
            os.fsync(fh.fileno())
        os.replace(tmp, path)
    plan.journal = journal
    return len(journal["documents"]), len(added)


def check_journal(ctx: Context, plan: "Plan") -> tuple[list[str], list[str], int]:
    """The live ids against the journal: ``(failures, notes, kept)``.

    A failure: a journalled document whose post-run place holds another id (renumbered),
    or that is not at its post-run place (the run is unfinished, or the index lost it
    while its file is on disk). A note: a journalled document whose row and files are all
    gone (deleted since the run)."""
    bad: list[str] = []
    notes: list[str] = []
    kept = 0
    journal = plan.journal
    if journal is None:
        return bad, notes, kept
    conn = _open_sqlite(ctx.sqlite_path)
    if conn is None:
        return [f"the journal lists {len(journal['documents'])} documents but there is no "
                f"SQLite content plane at {ctx.sqlite_path}"], notes, kept
    try:
        for e in journal["documents"]:
            doc_id, (pre_t, pre_rel), post = int(e["id"]), e["pre"], e["post"]
            post_tid = plan.t1_id if e["post_org"] == "tenant_one" else plan.org_id
            label = f"document {doc_id} ({pre_rel})"
            at_post = None
            if post_tid is not None:
                row = conn.execute("SELECT id FROM documents WHERE tenant_id = ? AND "
                                   "rel_path = ?", (str(post_tid), post)).fetchone()
                at_post = int(row[0]) if row else None
            if at_post == doc_id:
                kept += 1
                continue
            if at_post is not None:
                bad.append(f"{label} was renumbered: {post} now has id {at_post}")
                continue
            row = conn.execute("SELECT tenant_id, rel_path FROM documents WHERE id = ?",
                               (doc_id,)).fetchone()
            if row is not None:
                bad.append(f"{label} is at {row[1]} (tenant {row[0]}), not yet at {post}")
                continue
            pre_file = ctx.root_of(UUID(pre_t), plan.t1_id) / pre_rel \
                if pre_t == str(plan.t1_id) else None
            post_file = ctx.root_of(post_tid, plan.t1_id) / post if post_tid else None
            if any(p is not None and p.is_file() for p in (pre_file, post_file)):
                bad.append(f"{label} is missing from the index while its file is on disk: "
                           "a reindex will give it a new id")
            else:
                notes.append(f"{label}: no row and no file (deleted since the run)")
    finally:
        conn.close()
    return bad, notes, kept


# --- references to a renamed project's old name (listed, never rewritten) -----------

_REF_RE = re.compile(r"(?<![A-Za-z0-9_])(doc|chapter):([^\s\"'()<>\[\]{}`|]+)")


def old_name_refs(ctx: Context, plan: "Plan") -> list[tuple[str, int, int]]:
    """``[(file, related entries, doc:/chapter: refs)]`` naming a renamed project's old name.

    Scans tenant #1's content (and the new org's, where moved projects land) for
    ``related:`` front-matter entries (``<project>/<file>``) and ``doc:<project>/<slug>``
    / ``chapter:<project>/<book>/<key>`` refs whose project is an old name. Reads only."""
    old = {op.src_name for op in plan.ops if op.kind == "rename"}
    if not old:
        return []
    roots = [ctx.root_of(plan.t1_id, plan.t1_id)]
    if plan.org_id is not None:
        roots.append(ctx.root_of(plan.org_id, plan.t1_id))
    hits: list[tuple[str, int, int]] = []
    for root in roots:
        if not root.is_dir():
            continue
        for p in sorted(root.rglob("*")):
            if p.suffix not in (".md", ".html") or not p.is_file():
                continue
            if any(part in (".assets", ".audio") for part in p.relative_to(root).parts):
                continue
            try:
                body = p.read_text(encoding="utf-8")
            except (OSError, UnicodeDecodeError):
                continue
            related = 0
            try:
                parse = (documents_mod.parse_html_frontmatter if p.suffix == ".html"
                         else documents_mod.parse_frontmatter)
                meta, _ = parse(body)
                raw = meta.get("related") if isinstance(meta, dict) else None
                if isinstance(raw, list):
                    related = sum(1 for r in raw if str(r).split("/", 1)[0] in old)
            except Exception:  # noqa: BLE001 - no front matter, or not one we can read
                pass
            refs = 0
            for match in _REF_RE.finditer(body):
                parts = re.split(r"[?#]", match.group(2), maxsplit=1)[0].split("/")
                if parts[0] in old and len(parts) == (2 if match.group(1) == "doc" else 3):
                    refs += 1
            if related or refs:
                hits.append((_rel(p, ctx.kb_root), related, refs))
    return hits


def _print_refs(ctx: Context, plan: "Plan", prefix: str) -> None:
    hits = old_name_refs(ctx, plan)
    total = sum(r + d for _, r, d in hits)
    out(f"{prefix}references to a renamed project's old name (listed, never rewritten): "
        f"{total} in {len(hits)} file(s)")
    for rel, related, refs in hits[:200]:
        out(f"    {rel}: related {related}, doc/chapter refs {refs}")


async def _project_names(session: AsyncSession, tid: Optional[UUID]) -> dict[str, UUID]:
    if tid is None:
        return {}
    rows = await session.execute(text("SELECT name, id FROM projects WHERE tenant_id = :t"),
                                 {"t": tid})
    return {r[0]: r[1] for r in rows}


async def build_plan(ctx: Context, session: AsyncSession, vconn: psycopg.Connection,
                     snapshot: Optional[dict[str, list[dict[str, Optional[str]]]]] = None
                     ) -> Plan:
    """Read both sides and plan every step; ``snapshot`` reuses vocky rows read earlier
    (``--apply`` verifies what it copied, not events captured since)."""
    m = ctx.mapping
    refusals: list[str] = []
    warnings: list[str] = []
    repo = AccountsRepository(session)

    # Identity: the operator on both sides, by lowercased email.
    kb_user = await repo.get_user_by_email(m.operator_email)
    vrow = vconn.execute("SELECT id::text AS id FROM users WHERE lower(email) = %s",
                         (m.operator_email,)).fetchone()
    if kb_user is None or vrow is None:
        missing = [n for n, v in (("platform", kb_user), ("vocky", vrow)) if v is None]
        raise Refused(f"the operator's email is missing in: {', '.join(missing)}")
    tenants = await repo.list_tenants_for_user(kb_user.id)
    if not tenants:
        raise Refused("the operator has no org on the platform")
    t1 = tenants[0]
    if m.tenant_one_id and t1.id != m.tenant_one_id:
        raise Refused(f"the operator's first org is {t1.id}, not the mapping's {m.tenant_one_id}")
    t1_created = (await session.execute(
        text("SELECT created_at FROM tenants WHERE id = :i"), {"i": t1.id})).scalar_one()
    org_rows = (await session.execute(text(
        "SELECT t.id, t.created_at FROM tenants t JOIN tenant_members m ON m.tenant_id = t.id "
        "WHERE m.user_id = :u AND m.role = 'owner' AND t.name = :n AND t.id <> :t1 "
        "ORDER BY t.created_at"), {"u": kb_user.id, "n": m.new_org, "t1": t1.id})).all()
    if len(org_rows) > 1:
        raise Refused(f"the operator owns {len(org_rows)} orgs named {m.new_org!r}")
    org_id = org_rows[0][0] if org_rows else None
    org_created = org_rows[0][1] if org_rows else None
    if org_created is not None and org_created <= t1_created:
        refusals.append(f"tenant #1 would not stay the oldest: {m.new_org!r} is older")
    if org_id is None and datetime.now(UTC) <= t1_created:
        refusals.append("tenant #1 would not stay the oldest: the clock is behind its created_at")
    # Tenant #1 is the org the operator JOINED first (tenant_members.created_at): the
    # one membership this tool may create is stamped now, so it must sort after it.
    first_join = (await session.execute(text(
        "SELECT created_at FROM tenant_members WHERE user_id = :u AND tenant_id = :t"),
        {"u": kb_user.id, "t": t1.id})).scalar_one()
    if org_id is None and datetime.now(UTC) <= first_join:
        refusals.append("tenant #1 would not stay the operator's first membership: the "
                        "clock is behind its created_at")

    reader_tables = await _reader_tables(session)
    git_top = git_checkout(ctx.kb_root)
    journal = load_journal(ctx.journal_path)
    if journal is not None and (journal.get("tenant_one") != str(t1.id)
                                or journal.get("new_org") != m.new_org):
        refusals.append(f"the journal {ctx.journal_path} belongs to another run (tenant #1 "
                        f"{journal.get('tenant_one')}, new org {journal.get('new_org')!r})")
    if git_top is not None and not _git_ignored(git_top, _rel(ctx.journal_path, git_top)):
        refusals.append(f"the journal's path {ctx.journal_path} is not ignored by git: it must "
                        "never be tracked")
    sconn = _open_sqlite(ctx.sqlite_path)
    if sconn is None:
        warnings.append(f"no SQLite content plane at {ctx.sqlite_path}: nothing to re-key")

    # Projects: the moves to the new org, then the renames inside tenant #1.
    ops: list[ProjectOp] = []
    specs = [("move", n, n, org_id, m.new_org) for n in m.moves]
    specs += [("rename", o, n, t1.id, m.tenant_one_name) for o, n in m.renames.items()]
    try:
        for kind, src, dst, dst_tid, dst_org in specs:
            op = ProjectOp(kind, src, dst, t1.id, dst_tid, dst_org)
            src_row = (await session.execute(text(
                "SELECT id, visibility FROM projects WHERE tenant_id = :t AND name = :n"),
                {"t": t1.id, "n": src})).first()
            dst_row = None
            if dst_tid is not None:
                dst_row = (await session.execute(text(
                    "SELECT id, visibility FROM projects WHERE tenant_id = :t AND name = :n"),
                    {"t": dst_tid, "n": dst})).first()
            if src_row is not None and dst_row is not None:
                refusals.append(f"{kind} {src} -> {dst_org}/{dst}: the target name is taken")
            elif src_row is None and dst_row is None:
                refusals.append(f"{kind} {src}: no such project in tenant #1 or at the target")
            row = src_row or dst_row
            if row is not None:
                op.project_id, op.visibility = row[0], row[1]
            op.pg_state = "todo" if src_row is not None else "done"
            for table in reader_tables:
                op.reader[table] = await _count(
                    session, f'SELECT count(*) FROM "{table}" WHERE tenant_id = :t AND project = :n',
                    {"t": t1.id, "n": src})
                if dst_tid is not None:
                    op.reader_dst[table] = await _count(
                        session,
                        f'SELECT count(*) FROM "{table}" WHERE tenant_id = :t AND project = :n',
                        {"t": dst_tid, "n": dst})
            if any(op.reader.values()) and any(op.reader_dst.values()):
                refusals.append(f"{kind} {src}: reader rows already exist at {dst_org}/{dst}")
            if op.project_id is not None and kind == "move":
                op.usage_events = await _count(
                    session, "SELECT count(*) FROM usage_events WHERE project_id = :p "
                    "AND tenant_id = :t", {"p": op.project_id, "t": t1.id})
                keys = await _count(session, "SELECT count(*) FROM project_credentials "
                                    "WHERE project_id = :p AND revoked_at IS NULL",
                                    {"p": op.project_id})
                if keys and op.pg_state == "todo":
                    refusals.append(f"move {src}: {keys} live key(s) are bound to it")
                units = op.reader.get("listen_units", 0)
                if units:
                    refusals.append(f"move {src}: {units} Listen unit(s); their audio does not move")
            if op.visibility == "public" and kind == "move":
                warnings.append(f"move {src}: the project is public; outside tenant #1 it is "
                                "no longer git-published")
            op.sqlite_src = _sqlite_counts(sconn, t1.id, src)
            op.sqlite_dst = _sqlite_counts(sconn, dst_tid, dst)
            if any(op.sqlite_src.values()) and any(op.sqlite_dst.values()):
                refusals.append(f"{kind} {src}: SQLite rows already exist at {dst_org}/{dst}")
            if sconn is not None and op.pg_state == "todo":
                stray = int(sconn.execute(
                    "SELECT count(*) FROM documents WHERE tenant_id = '' AND "
                    "substr(rel_path, 1, ?) = ?", (len(src) + 1, src + "/")).fetchone()[0])
                if stray:
                    warnings.append(f"{kind} {src}: {stray} SQLite row(s) carry the legacy '' "
                                    "tenant and are not re-keyed (the reindex re-stamps them)")
            src_root, dst_root = ctx.root_of(t1.id, t1.id), ctx.root_of(dst_tid, t1.id)
            for sub in SUBTREES:
                s, d = _subtree(src_root, sub, src), _subtree(dst_root, sub, dst)
                d_exists = dst_tid is not None and d.exists()
                state = ("conflict" if s.exists() and d_exists else "todo" if s.exists()
                         else "done" if d_exists else "absent")
                files, nbytes = _tree_stats(s if s.exists() else d)
                op.disk.append(DiskMove(sub or "folder", s, d, state, files, nbytes))
                if state == "conflict":
                    refusals.append(f"{kind} {src}: both {s} and {d} exist on disk")
            if git_top is not None:
                try:
                    op.tracked = gitops.tracked_paths(_op_paths(ctx, op), root=ctx.kb_root)
                except gitops.GitError as exc:
                    raise Refused(f"git cannot list tracked files: {exc}")
                if op.tracked and op.pending:
                    refusals.append(
                        f"{kind} {src}: {len(op.tracked)} file(s) under its folders are tracked "
                        f"by git (e.g. {op.tracked[0]}); make the project private in the app "
                        "first (its publish path untracks them), then run again")
                elif kind == "rename" and op.visibility == "public" and op.pending:
                    refusals.append(
                        f"rename {src}: the project is public, and only the app's publish "
                        "path may change tracked library content; make the project private "
                        "in the app first, then run again")
            if kind == "rename":
                for root, name in ((src_root, src), (dst_root, dst)):
                    for p in sorted((root / ".books" / name).glob("*.json")):
                        raw = json.loads(p.read_text(encoding="utf-8"))
                        if any(str(v).startswith(src + "/") for c in raw.get("chapters", [])
                               for v in (c.get("variants") or {}).values()):
                            op.manifests_to_fix.append(p)
            ops.append(op)
    finally:
        if sconn is not None:
            sconn.close()

    # Feedback: the column sets must match by name and type on both sides.
    kb_types: dict[str, list[tuple[str, str]]] = {}
    for table in FEEDBACK_TABLES:
        kcols, vcols = await _columns(session, table), _vocky_columns(vconn, table)
        if not vcols:
            raise Refused(f"vocky's database has no {table}")
        if sorted(kcols) != sorted(vcols):
            diff = sorted(set(kcols) ^ set(vcols))
            raise Refused(f"{table}: the columns differ by name or type: {diff}")
        kb_types[table] = kcols

    vprojects = vconn.execute(
        "SELECT p.id::text AS id, p.name, t.name AS org FROM projects p "
        "JOIN tenants t ON t.id = p.tenant_id JOIN tenant_members m ON m.tenant_id = t.id "
        "WHERE m.user_id = %s::uuid ORDER BY p.name", (vrow["id"],)).fetchall()
    feedback: list[FeedbackTarget] = []
    mapped_ids: dict[str, FeedbackTarget] = {}
    resolved, target_refusals = resolve_targets(
        m, ops, await _project_names(session, t1.id), await _project_names(session, org_id))
    refusals += target_refusals
    for vname, (_, dst_name) in m.feedback.items():
        hits = [p for p in vprojects if p["name"] == vname]
        if len(hits) != 1:
            refusals.append(f"feedback {vname}: {len(hits)} vocky projects of the operator "
                            "carry that name (need exactly 1)")
            continue
        if vname not in resolved:
            continue  # refused above (an ambiguous name)
        in_new_org, dst_pid = resolved[vname]
        target = FeedbackTarget(vname, hits[0]["id"], m.new_org if in_new_org
                                else m.tenant_one_name, org_id if in_new_org else t1.id,
                                dst_name, dst_pid, in_new_org)
        feedback.append(target)
        mapped_ids[target.vocky_project_id] = target

    ids = list(mapped_ids)
    ev_cols = [c for c, _ in kb_types["feedback_events"]]
    vocky_rows: dict[str, list[dict[str, Optional[str]]]] = {}
    if snapshot is not None:
        vocky_rows = snapshot
    else:
        vocky_rows["feedback_events"] = vconn.execute(
            f"SELECT {_text_select(ev_cols)} FROM feedback_events "
            "WHERE project_id::text = ANY(%s) ORDER BY id", (ids,)).fetchall()
        for table in ("feedback_comments", "feedback_attachments"):
            cols = [c for c, _ in kb_types[table]]
            vocky_rows[table] = vconn.execute(
                f"SELECT {_text_select(cols)} FROM {table} WHERE feedback_id IN "
                "(SELECT id FROM feedback_events WHERE project_id::text = ANY(%s)) ORDER BY id",
                (ids,)).fetchall()
    unmapped = vconn.execute(
        "SELECT coalesce(p.name, '(no project)') AS name, coalesce(t.name, '') AS org, "
        "count(*) AS n FROM feedback_events e LEFT JOIN projects p ON p.id = e.project_id "
        "LEFT JOIN tenants t ON t.id = p.tenant_id "
        "WHERE e.project_id IS NULL OR NOT (e.project_id::text = ANY(%s)) "
        "GROUP BY 1, 2 ORDER BY 1", (ids,)).fetchall()
    for row in unmapped:
        refusals.append(f"feedback: {row['n']} vocky event(s) in an unmapped project "
                        f"{row['org']}/{row['name']}")
    unlinked = int(vconn.execute(
        "SELECT count(*) AS n FROM feedback_attachments WHERE feedback_id IS NULL"
    ).fetchone()["n"])
    if unlinked:
        warnings.append(f"feedback: {unlinked} unlinked vocky attachment(s) (no event) "
                        "are not copied")

    # What is already on the platform (a re-run, or the delta after a first run).
    present: dict[str, dict[str, Optional[str]]] = {}
    for table in FEEDBACK_TABLES:
        want = [r["id"] for r in vocky_rows[table]]
        col = "project_id" if table == "feedback_events" else "id"
        rows = await session.execute(text(
            f"SELECT id::text, {col}::text FROM {table} WHERE id = ANY(CAST(:ids AS uuid[]))"),
            {"ids": want})
        present[table] = {r[0]: r[1] for r in rows}
    for r in vocky_rows["feedback_events"]:
        target = mapped_ids[r["project_id"]]
        target.events += 1
        target.events_null_event_at += r["event_at"] is None
        have = r["id"] in present["feedback_events"]
        key = "feedback_events"
        target.present[key] = target.present.get(key, 0) + have
        target.to_copy[key] = target.to_copy.get(key, 0) + (not have)
        if have and target.dst_project_id is not None and \
                present["feedback_events"][r["id"]] != str(target.dst_project_id):
            refusals.append(f"feedback event {r['id']} exists on the platform in another project")
    ev_target = {r["id"]: mapped_ids[r["project_id"]] for r in vocky_rows["feedback_events"]}
    for table in ("feedback_comments", "feedback_attachments"):
        for r in vocky_rows[table]:
            target = ev_target[r["feedback_id"]]
            have = r["id"] in present[table]
            target.present[table] = target.present.get(table, 0) + have
            target.to_copy[table] = target.to_copy.get(table, 0) + (not have)
    attachments_to_copy = [r for r in vocky_rows["feedback_attachments"]
                           if r["id"] not in present["feedback_attachments"]]
    pending_files = [r for r in vocky_rows["feedback_attachments"]
                     if not (ctx.attachments_dir / str(r["storage_key"])).is_file()]
    if pending_files and ctx.attachments_source is None:
        refusals.append(f"feedback: {len(pending_files)} attachment file(s) to copy and no "
                        "--attachments-source")
    elif pending_files:
        for r in pending_files:
            src = _safe_join(ctx.attachments_source, str(r["storage_key"]))
            if src is None or not src.is_file():
                refusals.append(f"feedback: attachment file {r['storage_key']!r} is missing "
                                "in the source folder")

    return Plan(kb_user.id, vrow["id"], t1.id, t1.name, t1.slug, t1_created, org_id,
                org_created, ops, feedback, reader_tables, vocky_rows, kb_types,
                {t: set(v) for t, v in present.items()}, attachments_to_copy, unlinked,
                warnings, refusals, git_top, journal)


def _safe_join(root: Optional[Path], key: str) -> Optional[Path]:
    if root is None or not key or os.path.isabs(key):
        return None
    base = root.resolve()
    candidate = (base / key).resolve()
    if not candidate.is_relative_to(base) or candidate == base:
        return None
    return candidate


def _rel(path: Path, root: Path) -> str:
    try:
        return path.relative_to(root).as_posix()
    except ValueError:
        return str(path)


def print_plan(ctx: Context, plan: Plan, mode: str = "dry-run") -> None:
    m = ctx.mapping
    out(f"platform database: {mask(ctx.kb_url)}")
    out(f"vocky database:    {mask(ctx.vocky_dsn)}")
    out(f"content root:      {ctx.kb_root}")
    out(f"sqlite:            {ctx.sqlite_path}")
    out(f"attachments:       {ctx.attachments_dir}"
        f" (source: {ctx.attachments_source or 'none given'})")
    out(f"git:               " + (
        f"{plan.git_top} is a checkout: tracked files are checked, renamed private projects "
        "are marked in its private-projects block (old names' lines stay)"
        if plan.git_top is not None else
        "the content root is not a git checkout: no tracked-file check, no private block"))
    if plan.journal is None:
        out(f"journal:           {ctx.journal_path} (none yet; --apply writes it first)")
    else:
        bad, notes, kept = check_journal(ctx, plan)
        out(f"journal:           {ctx.journal_path}: {len(plan.journal['documents'])} "
            f"documents, {kept} at their post-run place, {len(bad)} not, {len(notes)} gone")
    out(PRECONDITION)
    out()
    out(f"operator: {m.operator_email} (platform user {plan.operator_kb_id}, "
        f"vocky user {plan.operator_vocky_id})")
    rename = ("already named" if plan.t1_name == m.tenant_one_name
              else f"rename {plan.t1_name!r} ->")
    out(f"tenant #1: {plan.t1_id} slug={plan.t1_slug} created {plan.t1_created.isoformat()}: "
        f"{rename} {m.tenant_one_name!r}")
    if plan.org_id is None:
        out(f"new org {m.new_org!r}: create (owner: the operator; created_at: now)")
    else:
        out(f"new org {m.new_org!r}: exists {plan.org_id} created "
            f"{plan.org_created.isoformat() if plan.org_created else '?'}")
    out()
    out("projects:")
    for op in plan.ops:
        head = (f"  {op.kind} {op.src_name} -> {op.dst_org}/{op.dst_name} "
                f"[postgres: {op.pg_state}] visibility={op.visibility}")
        out(head)
        reader = op.reader if op.pg_state == "todo" else op.reader_dst
        where = "to move" if op.pg_state == "todo" else "at the target"
        rows = ", ".join(f"{t} {n}" for t, n in reader.items() if n) or "none"
        out(f"    reader rows {where}: {rows}")
        if op.kind == "move":
            out(f"    usage events to re-tenant: {op.usage_events}")
        src = ", ".join(f"{t} {n}" for t, n in op.sqlite_src.items() if n) or "none"
        dst = ", ".join(f"{t} {n}" for t, n in op.sqlite_dst.items() if n) or "none"
        out(f"    sqlite rows to re-key: {src}; at the target: {dst}")
        for d in op.disk:
            out(f"    disk {d.label}: {d.state} ({d.files} files, {d.nbytes} B) "
                f"{_rel(d.src, ctx.kb_root)} -> {_rel(d.dst, ctx.kb_root)}")
        if op.manifests_to_fix:
            out(f"    book manifests to rewrite: {len(op.manifests_to_fix)}")
        if op.tracked is None:
            out("    git: not a checkout (no check)")
        else:
            out(f"    git: {len(op.tracked)} tracked file(s) under its folders"
                + (f", e.g. {op.tracked[0]}" if op.tracked else ""))
            if op.marks_private:
                listed = op.dst_name in gitops.private_projects(ctx.kb_root)
                out(f"    private block: {'already names' if listed else 'mark'} "
                    f"{op.dst_name!r}")
            elif op.kind == "move":
                out("    private block: none needed (it lands under the gitignored tenants/)")
    out()
    out("feedback (targets by their post-run names):")
    for t in plan.feedback:
        org_id = str(t.dst_tid) if t.dst_tid else "to create"
        target = str(t.dst_project_id) if t.dst_project_id else "create"
        out(f"  {t.vocky_name} -> {t.dst_org}/{t.dst_name} (org {org_id}; project {target}): "
            f"events {t.events} (event_at NULL {t.events_null_event_at})")
        for table in FEEDBACK_TABLES:
            out(f"    {table}: copy {t.to_copy.get(table, 0)}, "
                f"already present {t.present.get(table, 0)}")
    out(f"  attachment files to copy: {len(plan.attachments_to_copy)}")
    out()
    _print_refs(ctx, plan, "")
    if plan.warnings:
        out()
        out("warnings:")
        for w in plan.warnings:
            out(f"  - {w}")
    if plan.refusals:
        out()
        out("an apply would refuse:" if mode == "verify" else "REFUSED (nothing changed):")
        for r in plan.refusals:
            out(f"  - {r}")


# --- apply -----------------------------------------------------------------------


def _insert_sql(table: str, types: list[tuple[str, str]]) -> str:
    cols = ", ".join(f'"{c}"' for c, _ in types)
    vals = ", ".join(f"CAST(:v{i} AS {t})" for i, (_, t) in enumerate(types))
    return f"INSERT INTO {table} ({cols}) VALUES ({vals}) ON CONFLICT (id) DO NOTHING"


async def apply_postgres(ctx: Context, session: AsyncSession, plan: Plan) -> dict[str, int]:
    """The accounts-plane writes, in the caller's one transaction."""
    m = ctx.mapping
    repo = AccountsRepository(session)
    done: dict[str, int] = {}
    if plan.t1_name != m.tenant_one_name:
        await session.execute(text("UPDATE tenants SET name = :n WHERE id = :i"),
                              {"n": m.tenant_one_name, "i": plan.t1_id})
        done["tenant #1 renamed"] = 1
    org_id = plan.org_id
    if org_id is None:
        org = await repo.create_tenant(m.new_org)
        await repo.add_tenant_member(tenant_id=org.id, user_id=plan.operator_kb_id, role="owner")
        org_id = org.id
        done["org created"] = 1
    for op in plan.ops:
        if op.pg_state != "todo":
            continue
        dst_tid = org_id if op.kind == "move" else op.dst_tid
        await session.execute(text(
            "UPDATE projects SET tenant_id = :d, name = :n WHERE id = :p"),
            {"d": dst_tid, "n": op.dst_name, "p": op.project_id})
        for table in plan.reader_tables:
            res = await session.execute(text(
                f'UPDATE "{table}" SET tenant_id = :d, project = :n '
                "WHERE tenant_id = :s AND project = :o"),
                {"d": dst_tid, "n": op.dst_name, "s": op.src_tid, "o": op.src_name})
            done[table] = done.get(table, 0) + (res.rowcount or 0)
        if dst_tid != op.src_tid:
            res = await session.execute(text(
                "UPDATE usage_events SET tenant_id = :d WHERE project_id = :p AND tenant_id = :s"),
                {"d": dst_tid, "p": op.project_id, "s": op.src_tid})
            done["usage_events"] = done.get("usage_events", 0) + (res.rowcount or 0)
        done[f"projects {op.kind}d"] = done.get(f"projects {op.kind}d", 0) + 1

    # Feedback targets, as ``resolve_targets`` resolved them for the dry run: by post-run
    # name, so a resolved project is checked to be there now, and only a target nobody
    # has after the run is created.
    target_pid: dict[str, UUID] = {}
    for t in plan.feedback:
        tid = org_id if t.in_new_org else plan.t1_id
        if t.dst_project_id is not None:
            row = (await session.execute(text(
                "SELECT tenant_id, name FROM projects WHERE id = :p"),
                {"p": t.dst_project_id})).first()
            if row is None or row[0] != tid or row[1] != t.dst_name:
                raise RuntimeError(f"feedback {t.vocky_name}: project {t.dst_project_id} is not "
                                   f"{t.dst_org}/{t.dst_name} after the project step")
            target_pid[t.vocky_project_id] = t.dst_project_id
            continue
        if await repo.get_project_by_name(tid, t.dst_name) is not None:
            raise RuntimeError(f"feedback {t.vocky_name}: {t.dst_org}/{t.dst_name} exists, but "
                               "the plan resolved it as new")
        proj = await repo.create_project(CreateProject(tenant_id=tid, name=t.dst_name))
        done["feedback projects created"] = done.get("feedback projects created", 0) + 1
        target_pid[t.vocky_project_id] = proj.id
    for table in FEEDBACK_TABLES:
        types = plan.kb_types[table]
        rows = []
        for r in plan.vocky_rows[table]:
            if r["id"] in plan.present_ids[table]:
                continue  # copied by an earlier run: ids are the idempotence key
            values = dict(r)
            if table == "feedback_events":
                values["project_id"] = str(target_pid[r["project_id"]])
            rows.append({f"v{i}": values[c] for i, (c, _) in enumerate(types)})
        if rows:
            await session.execute(text(_insert_sql(table, types)), rows)
            done[table] = done.get(table, 0) + len(rows)
    return done


def apply_sqlite(ctx: Context, plan: Plan) -> dict[str, int]:
    """Re-key each moved or renamed document in place: its id survives the reindex."""
    conn = _open_sqlite(ctx.sqlite_path)
    done: dict[str, int] = {}
    if conn is None:
        return done
    try:
        conn.execute("BEGIN IMMEDIATE")
        for op in plan.ops:
            if not any(op.sqlite_src.values()) or op.dst_tid is None:
                continue
            st, dt, o, n = str(op.src_tid), str(op.dst_tid), op.src_name, op.dst_name
            po, pn = o + "/", n + "/"
            ao, an = f".versions/{o}/", f".versions/{n}/"
            mo, mn = f".books/{o}/", f".books/{n}/"
            stmts = {
                "documents": (
                    "UPDATE documents SET tenant_id = ?, "
                    "project = CASE WHEN project = ? THEN ? ELSE project END, "
                    "rel_path = ? || substr(rel_path, ?) "
                    "WHERE tenant_id = ? AND substr(rel_path, 1, ?) = ?",
                    (dt, o, n, pn, len(po) + 1, st, len(po), po)),
                "document_versions": (
                    "UPDATE document_versions SET tenant_id = ?, "
                    "rel_path = ? || substr(rel_path, ?), "
                    "archive_path = CASE WHEN substr(archive_path, 1, ?) = ? "
                    "THEN ? || substr(archive_path, ?) ELSE archive_path END "
                    "WHERE tenant_id = ? AND substr(rel_path, 1, ?) = ?",
                    (dt, pn, len(po) + 1, len(ao), ao, an, len(ao) + 1, st, len(po), po)),
                "books": (
                    "UPDATE books SET tenant_id = ?, project = ?, "
                    "manifest_path = CASE WHEN substr(manifest_path, 1, ?) = ? "
                    "THEN ? || substr(manifest_path, ?) ELSE manifest_path END "
                    "WHERE tenant_id = ? AND project = ?",
                    (dt, n, len(mo), mo, mn, len(mo) + 1, st, o)),
                "chapters": ("UPDATE chapters SET tenant_id = ?, project = ? "
                             "WHERE tenant_id = ? AND project = ?", (dt, n, st, o)),
                "chapter_variants": (
                    "UPDATE chapter_variants SET tenant_id = ?, project = ?, "
                    "rel_path = CASE WHEN substr(rel_path, 1, ?) = ? "
                    "THEN ? || substr(rel_path, ?) ELSE rel_path END "
                    "WHERE tenant_id = ? AND project = ?",
                    (dt, n, len(po), po, pn, len(po) + 1, st, o)),
            }
            for table, (sql, params) in stmts.items():
                cur = conn.execute(sql, params)
                done[table] = done.get(table, 0) + cur.rowcount
        conn.commit()
    except BaseException:
        conn.rollback()
        raise
    finally:
        conn.close()
    return done


def _move_tree(src: Path, dst: Path) -> None:
    """Move ``src`` to ``dst`` (a missing path), checked file by file before the source goes."""
    before = _tree_hashes(src) if src.is_dir() else None
    dst.parent.mkdir(parents=True, exist_ok=True)
    try:
        os.rename(src, dst)
    except OSError as exc:
        if exc.errno != errno.EXDEV:
            raise
        shutil.copytree(src, dst, copy_function=shutil.copy2)
        if _tree_hashes(dst) != before:
            raise RuntimeError(f"copy of {src} to {dst} differs; the source is kept")
        shutil.rmtree(src)
    if before is not None and _tree_hashes(dst) != before:
        raise RuntimeError(f"moved tree {dst} differs from its source")
    if src.exists():
        raise RuntimeError(f"{src} is still there after the move")


def _fix_manifests(root: Path, old: str, new: str) -> int:
    fixed = 0
    for p in sorted((root / ".books" / new).glob("*.json")):
        raw = json.loads(p.read_text(encoding="utf-8"))
        changed = False
        for chapter in raw.get("chapters", []):
            variants = chapter.get("variants") or {}
            for lang, rel in list(variants.items()):
                if isinstance(rel, str) and rel.startswith(old + "/"):
                    variants[lang] = new + rel[len(old):]
                    changed = True
        if changed:
            books_mod.write_manifest(root, new, raw)  # validates, then writes atomically
            fixed += 1
    return fixed


def apply_disk(ctx: Context, plan: Plan) -> dict[str, int]:
    done: dict[str, int] = {}
    for op in plan.ops:
        if op.dst_tid is None:
            raise RuntimeError(f"{op.src_name}: the target org has no id yet")
        for d in op.disk:
            if d.state == "conflict":
                raise RuntimeError(f"both {d.src} and {d.dst} exist")
            if d.state == "todo":
                _move_tree(d.src, d.dst)
                done[f"disk {d.label}"] = done.get(f"disk {d.label}", 0) + 1
        if op.kind == "rename" or op.src_name != op.dst_name:
            dst_root = ctx.root_of(op.dst_tid, plan.t1_id)
            n = _fix_manifests(dst_root, op.src_name, op.dst_name)
            if n:
                done["book manifests rewritten"] = done.get("book manifests rewritten", 0) + n
    return done


def apply_attachment_files(ctx: Context, plan: Plan) -> int:
    copied = 0
    for r in plan.vocky_rows["feedback_attachments"]:
        key = str(r["storage_key"])
        dst = _safe_join(ctx.attachments_dir, key)
        if dst is None:
            raise RuntimeError(f"attachment key {key!r} escapes the attachments folder")
        if dst.is_file():
            continue
        src = _safe_join(ctx.attachments_source, key)
        if src is None or not src.is_file():
            raise RuntimeError(f"attachment file {key!r} is missing in the source folder")
        dst.parent.mkdir(parents=True, exist_ok=True)
        fd, tmp = tempfile.mkstemp(dir=dst.parent, prefix=".tmp-")
        os.close(fd)
        shutil.copyfile(src, tmp)
        os.replace(tmp, dst)
        copied += 1
    return copied


# --- verify ----------------------------------------------------------------------


async def verify(ctx: Context, session: AsyncSession, vconn: psycopg.Connection,
                 plan: Plan) -> list[str]:
    """Every check of the built-in verify; returns the mismatches (empty = pass)."""
    m = ctx.mapping
    bad: list[str] = []
    repo = AccountsRepository(session)
    tenants = await repo.list_tenants_for_user(plan.operator_kb_id)
    first = tenants[0] if tenants else None
    if first is None or first.id != plan.t1_id:
        bad.append(f"tenant #1 changed: the operator's first org is {first.id if first else None}")
    if m.tenant_one_id and plan.t1_id != m.tenant_one_id:
        bad.append(f"tenant #1 is {plan.t1_id}, not {m.tenant_one_id}")
    if first is not None and first.name != m.tenant_one_name:
        bad.append(f"tenant #1 is named {first.name!r}, not {m.tenant_one_name!r}")
    firsts = await first_memberships(session)
    if firsts.get(str(plan.operator_kb_id)) != str(plan.t1_id):
        bad.append("the operator's first membership (tenant_members.created_at) is not "
                   f"tenant #1's: {firsts.get(str(plan.operator_kb_id))}")
    if plan.org_id is not None:
        joined = (await session.execute(text(
            "SELECT m.created_at FROM tenant_members m WHERE m.user_id = :u AND "
            "m.tenant_id = :t"), {"u": plan.operator_kb_id, "t": plan.org_id})).scalar()
        t1_joined = (await session.execute(text(
            "SELECT m.created_at FROM tenant_members m WHERE m.user_id = :u AND "
            "m.tenant_id = :t"), {"u": plan.operator_kb_id, "t": plan.t1_id})).scalar()
        if joined is None or t1_joined is None or joined <= t1_joined:
            bad.append(f"the operator's membership of {m.new_org!r} is missing or not newer "
                       "than tenant #1's")
    if plan.org_id is None:
        bad.append(f"the org {m.new_org!r} does not exist")
    elif plan.org_created is None or plan.org_created <= plan.t1_created:
        bad.append(f"the org {m.new_org!r} is not newer than tenant #1")
    out(f"verify: tenant #1 {plan.t1_id} named {first.name if first else None!r}; "
        f"{m.new_org!r} {plan.org_id} created "
        f"{plan.org_created.isoformat() if plan.org_created else None}; operator's orgs "
        f"oldest first: {', '.join(t.name for t in tenants)}")

    sconn = _open_sqlite(ctx.sqlite_path)
    try:
        for op in plan.ops:
            label = f"{op.kind} {op.src_name} -> {op.dst_org}/{op.dst_name}"
            if op.pg_state != "done":
                bad.append(f"{label}: the project row is still at the source")
            left = {t: n for t, n in op.reader.items() if n}
            if left:
                bad.append(f"{label}: reader rows left at the source: {left}")
            left = {t: n for t, n in op.sqlite_src.items() if n}
            if left:
                bad.append(f"{label}: SQLite rows left at the source: {left}")
            for d in op.disk:
                if d.state in ("todo", "conflict"):
                    bad.append(f"{label}: {d.src} is still on disk")
            if op.dst_tid is not None:
                dst_root = ctx.root_of(op.dst_tid, plan.t1_id)
                for p in sorted((dst_root / ".books" / op.dst_name).glob("*.json")):
                    try:
                        books_mod.read_manifest(dst_root, op.dst_name, p.stem)
                    except ConventionError as exc:
                        bad.append(f"{label}: book manifest {p.name} is invalid: {exc}")
            folder = next((d for d in op.disk if d.label == "folder"), None)
            docs = op.sqlite_dst.get("documents", 0)
            out(f"verify: {label}: postgres {op.pg_state}; reader rows at the target "
                f"{sum(op.reader_dst.values())}; sqlite documents at the target {docs}; "
                f"folder {folder.state if folder else '?'} ({folder.files if folder else 0} files)")
    finally:
        if sconn is not None:
            sconn.close()

    # Ids: the live index against the journal written before the first write.
    if plan.journal is None:
        out("verify: ids: no journal (no --apply has run here): ids not checked")
    else:
        jbad, notes, kept = check_journal(ctx, plan)
        bad += jbad
        out(f"verify: ids kept: {kept} of {len(plan.journal['documents'])} journalled documents "
            f"at their post-run place; {len(jbad)} not; {len(notes)} gone since the run")
        for note in notes[:50]:
            out(f"    {note}")

    # Git: nothing under the touched folders shows, and the block names the new names.
    if plan.git_top is None:
        out("verify: git: the content root is not a git checkout: nothing to check")
    else:
        paths = sorted({p for op in plan.ops for p in _op_paths(ctx, op)})
        entries = _git_status(ctx.kb_root, paths)
        if entries:
            bad.append(f"git status is not clean under the touched folders: {entries[:20]}")
        block = set(gitops.private_projects(ctx.kb_root))
        want = sorted(op.dst_name for op in plan.ops if op.marks_private)
        unmarked = [n for n in want if n not in block]
        if unmarked:
            bad.append(f"the private-projects block does not name {unmarked}")
        out(f"verify: git: {len(entries)} status entr(y/ies) under {len(paths)} touched "
            f"folder(s); the private-projects block names {len(want) - len(unmarked)} of "
            f"{len(want)} renamed private project(s)")

    _print_refs(ctx, plan, "verify: ")

    # Feedback, column by column against vocky; targets as ``resolve_targets`` has them.
    target_pid: dict[str, Optional[UUID]] = {}
    for t in plan.feedback:
        pid = t.dst_project_id
        target_pid[t.vocky_project_id] = pid
        if pid is None:
            bad.append(f"feedback {t.vocky_name}: no project {t.dst_org}/{t.dst_name}")
    for table in FEEDBACK_TABLES:
        cols = [c for c, _ in plan.kb_types[table]]
        src_rows = plan.vocky_rows[table]
        kb = await session.execute(text(
            f"SELECT {_text_select(cols)} FROM {table} WHERE id = ANY(CAST(:ids AS uuid[]))"),
            {"ids": [r["id"] for r in src_rows]})
        kb_rows = {r["id"]: r for r in kb.mappings()}
        mismatches = 0
        for r in src_rows:
            got = kb_rows.get(r["id"])
            if got is None:
                bad.append(f"{table} {r['id']}: missing on the platform")
                mismatches += 1
                continue
            for c in cols:
                want = r[c]
                if table == "feedback_events" and c == "project_id":
                    pid = target_pid.get(r["project_id"])
                    want = str(pid) if pid else None
                if got[c] != want:
                    bad.append(f"{table} {r['id']}: column {c} differs")
                    mismatches += 1
        out(f"verify: {table}: {len(src_rows)} vocky rows, {len(kb_rows)} on the platform, "
            f"{mismatches} mismatch(es) over {len(cols)} columns")
    for t in plan.feedback:
        pid = target_pid.get(t.vocky_project_id)
        if pid is None:
            continue
        n = await _count(session, "SELECT count(*) FROM feedback_events WHERE project_id = :p "
                         "AND id = ANY(CAST(:ids AS uuid[]))",
                         {"p": pid, "ids": [r["id"] for r in plan.vocky_rows["feedback_events"]
                                            if r["project_id"] == t.vocky_project_id]})
        nulls = await _count(session, "SELECT count(*) FROM feedback_events WHERE project_id = :p "
                             "AND event_at IS NULL AND id = ANY(CAST(:ids AS uuid[]))",
                             {"p": pid, "ids": [r["id"] for r in plan.vocky_rows["feedback_events"]
                                                if r["project_id"] == t.vocky_project_id]})
        out(f"verify: feedback {t.vocky_name} -> {t.dst_org}/{t.dst_name}: vocky {t.events}, "
            f"platform {n} (event_at NULL: vocky {t.events_null_event_at}, platform {nulls})")
        if n != t.events or nulls != t.events_null_event_at:
            bad.append(f"feedback {t.vocky_name}: vocky {t.events} events, platform {n}")
    missing_files = 0
    for r in plan.vocky_rows["feedback_attachments"]:
        dst = _safe_join(ctx.attachments_dir, str(r["storage_key"]))
        if dst is None or not dst.is_file() or dst.stat().st_size != int(r["byte_size"]):
            bad.append(f"attachment {r['id']}: file missing or of another size")
            missing_files += 1
    out(f"verify: attachment files: {len(plan.vocky_rows['feedback_attachments'])} expected, "
        f"{missing_files} missing or wrong")
    return bad


# --- the run ---------------------------------------------------------------------


async def run(ctx: Context, mode: str) -> int:
    url = make_url(ctx.kb_url)
    if url.drivername in ("postgresql", "postgres"):
        url = url.set(drivername="postgresql+psycopg")
    engine = create_async_engine(url)
    writing = False
    try:
        with psycopg.connect(ctx.vocky_dsn, row_factory=dict_row, autocommit=True) as vconn:
            vconn.execute("SET TIME ZONE 'UTC'")
            vconn.execute("SET default_transaction_read_only = on")
            async with AsyncSession(engine, expire_on_commit=False) as session:
                await session.execute(text("SET TIME ZONE 'UTC'"))
                plan = await build_plan(ctx, session, vconn)
                firsts_before = await first_memberships(session)
                await session.rollback()
            out(f"merge_vocky: {mode.upper()}" + (" (nothing is written)" if mode != "apply"
                                                    else ""))
            print_plan(ctx, plan, mode)
            if mode == "verify":
                return await _verify_report(ctx, engine, vconn)
            if plan.refusals:
                return EXIT_REFUSED
            if mode == "dry-run":
                return EXIT_OK

            # apply: hashes and the id journal first, then Postgres in one transaction.
            snapshot = plan.vocky_rows
            hashes = {(op.src_name, d.label): _tree_hashes(d.src)
                      for op in plan.ops for d in op.disk if d.state == "todo"}
            reader_before = {op.src_name: sum(op.reader.values()) for op in plan.ops
                             if op.pg_state == "todo"}
            out()
            out("apply:")
            writing = True
            n, added = write_journal(ctx, plan)
            out(f"  journal: {ctx.journal_path}: {n} documents ({added} added by this run)")
            async with AsyncSession(engine, expire_on_commit=False) as session:
                async with session.begin():
                    await session.execute(text("SET LOCAL TIME ZONE 'UTC'"))
                    done = await apply_postgres(ctx, session, plan)
            out(f"  postgres committed: {done or 'nothing to do'}")
            async with AsyncSession(engine, expire_on_commit=False) as session:
                await session.execute(text("SET TIME ZONE 'UTC'"))
                plan = await build_plan(ctx, session, vconn, snapshot)
                await session.rollback()
            done = apply_sqlite(ctx, plan)
            out(f"  sqlite re-keyed: {done or 'nothing to do'}")
            done = apply_disk(ctx, plan)
            out(f"  disk moved: {done or 'nothing to do'}")
            if plan.git_top is not None:
                marked = apply_git(ctx, plan)
                out(f"  private-projects block: marked {marked or 'nothing new'}")
            out(f"  attachment files copied: {apply_attachment_files(ctx, plan)}")

            bad: list[str] = []
            async with AsyncSession(engine, expire_on_commit=False) as session:
                await session.execute(text("SET TIME ZONE 'UTC'"))
                plan = await build_plan(ctx, session, vconn, snapshot)
                firsts_after = await first_memberships(session)
                await session.rollback()
            moved = sorted(u for u, t in firsts_before.items() if firsts_after.get(u) != t)
            if moved:
                bad.append(f"{len(moved)} user(s) now have another first membership: "
                           f"{', '.join(moved[:10])}")
            out(f"  first memberships unchanged: {len(firsts_before) - len(moved)} of "
                f"{len(firsts_before)} users")
            for op in plan.ops:
                for d in op.disk:
                    key = (op.src_name, d.label)
                    if key in hashes:
                        got = _tree_hashes(d.dst)
                        if d.label == ".books" and op.kind == "rename":
                            got = {k: v for k, v in got.items() if k in hashes[key]}
                            if set(got) != set(hashes[key]):
                                bad.append(f"{d.dst}: files differ from the source")
                        elif got != hashes[key]:
                            bad.append(f"{d.dst}: files differ from the source")
                if op.src_name in reader_before and \
                        sum(op.reader_dst.values()) != reader_before[op.src_name]:
                    bad.append(f"{op.src_name}: {reader_before[op.src_name]} reader rows "
                               f"before, {sum(op.reader_dst.values())} at the target")
            out()
            return await _verify_report(ctx, engine, vconn, extra=bad, snapshot=snapshot)
    except Refused as exc:
        if writing:
            out(f"FAILED after the run began writing (run again to finish): {exc}")
            return EXIT_FAILED
        out(f"REFUSED (nothing changed): {exc}")
        return EXIT_REFUSED
    finally:
        await engine.dispose()


async def _verify_report(ctx: Context, engine, vconn, extra: Optional[list[str]] = None,
                         snapshot=None) -> int:
    async with AsyncSession(engine, expire_on_commit=False) as session:
        await session.execute(text("SET TIME ZONE 'UTC'"))
        plan = await build_plan(ctx, session, vconn, snapshot)
        bad = (extra or []) + await verify(ctx, session, vconn, plan)
        await session.rollback()
    if bad:
        out("VERIFY FAILED:")
        for b in bad[:200]:
            out(f"  - {b}")
        return EXIT_FAILED
    out("VERIFY OK")
    return EXIT_OK


def parse_args(argv: Optional[list[str]] = None) -> argparse.Namespace:
    p = argparse.ArgumentParser(
        description=__doc__.split("\n", 1)[0],
        epilog=(f"{PRECONDITION}. On a git checkout, every project it moves or renames must "
                "have no tracked file (make a public project private in the app first). "
                f"--apply first writes the id journal <KB_ROOT>/data/{JOURNAL_NAME}; keep it "
                "with the run's backup. feedback targets use the names projects have after "
                "the run. The module docstring has the whole contract."))
    mode = p.add_mutually_exclusive_group()
    mode.add_argument("--dry-run", action="store_true", help="print the plan (default)")
    mode.add_argument("--apply", action="store_true", help="make the changes, then verify")
    mode.add_argument("--verify", action="store_true", help="only run the verify")
    p.add_argument("--mapping", help="the mapping as a JSON file, or - for stdin")
    p.add_argument("--operator-email")
    p.add_argument("--tenant-one-name", help="tenant #1's new name")
    p.add_argument("--tenant-one-id", help="tenant #1's uuid, checked when given")
    p.add_argument("--new-org", help="the org to create (or find) for the moved projects")
    p.add_argument("--move", action="append", help="a tenant #1 project to move (repeat)")
    p.add_argument("--rename", action="append", help="OLD=NEW inside tenant #1 (repeat)")
    p.add_argument("--feedback", action="append",
                   help="VOCKY_PROJECT=[ORG/]PROJECT (repeat)")
    p.add_argument("--database-url", help="the platform's database (default DATABASE_URL)")
    src = p.add_mutually_exclusive_group()
    src.add_argument("--vocky-dsn", help="vocky's database DSN")
    src.add_argument("--vocky-db", help="vocky's database name on the platform's server")
    p.add_argument("--kb-root", help="the content root (default KB_ROOT, else the cwd)")
    p.add_argument("--sqlite", help="the SQLite content plane (default KB_DB_PATH)")
    p.add_argument("--attachments-dir", help="default KB_FEEDBACK_ATTACHMENTS_DIR")
    p.add_argument("--attachments-source", help="the folder holding vocky's attachment files")
    return p.parse_args(argv)


def make_context(args: argparse.Namespace) -> Context:
    kb_url = args.database_url or os.environ.get("DATABASE_URL") or ""
    if not kb_url:
        raise Refused("no platform database: set DATABASE_URL or --database-url")
    if args.vocky_dsn:
        vocky = args.vocky_dsn
    elif args.vocky_db:
        vocky = make_url(kb_url).set(database=args.vocky_db).render_as_string(hide_password=False)
    else:
        raise Refused("no vocky database: give --vocky-dsn or --vocky-db")
    vurl = make_url(vocky)
    vocky = vurl.set(drivername="postgresql").render_as_string(hide_password=False)
    kb_root = Path(args.kb_root or os.environ.get("KB_ROOT") or os.getcwd()).resolve()
    sqlite_path = Path(args.sqlite or os.environ.get("KB_DB_PATH")
                       or kb_root / "data" / "kb.sqlite3")
    att = Path(args.attachments_dir or os.environ.get("KB_FEEDBACK_ATTACHMENTS_DIR")
               or kb_root / "data" / "feedback-attachments")
    source = Path(args.attachments_source) if args.attachments_source else None
    return Context(load_mapping(args), kb_url, vocky, kb_root, sqlite_path, att, source)


def main(argv: Optional[list[str]] = None) -> int:
    args = parse_args(argv)
    mode = "apply" if args.apply else "verify" if args.verify else "dry-run"
    try:
        ctx = make_context(args)
    except Refused as exc:
        out(f"REFUSED (nothing changed): {exc}")
        return EXIT_REFUSED
    return asyncio.run(run(ctx, mode))


if __name__ == "__main__":
    raise SystemExit(main())
