#!/usr/bin/env python3
from __future__ import annotations

import argparse
import bisect
import difflib
import json
import os
import posixpath
import re
import secrets
import shlex
import shutil
import stat
import subprocess
import sys
import tempfile
import time
from datetime import datetime, timedelta, timezone
from pathlib import Path
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parents[1]
# Nested personal install (P28). The marker `.agentic-nested.json` beside `scripts/` says the engine and all
# workflow state live in a nested repo (`<host>/workflow`, ROOT) inside a host repo the operator does
# not own (HOST_ROOT): product code, git history for phase-scope, and `.claude/agents` are the
# host's, while works/, docs/, executors.toml and the templates stay under ROOT. EVERY nested
# branch below is gated on that marker: with no `.agentic-nested.json`, NESTED is None, HOST_ROOT is None and
# behaviour and output are byte-for-byte the at-root engine's. A marker that exists but is malformed
# is never read as at-root mode -- `validate` reports it as an error and every other command refuses
# (see `main`). The installer writes the marker; this file owns its schema (NESTED_* below).
NESTED_MARKER = ".agentic-nested.json"
NESTED_SCHEMA = 1
NESTED_KEYS = ("schema", "host_root", "commit_convention", "renames")
NESTED_CONVENTION_KEYS = ("inferred", "confirmed", "text", "coauthor_trailers")
NESTED_TRAILERS = ("allowed", "forbidden", "unknown")
NESTED_RENAME_KINDS = ("skills", "agents")
# Optional, but strict when present: the installer's record of which host-side skill directories
# and agent files are the workspace's own (so `--update --nested` never mistakes them for a clash),
# and (P40) `repos`, the multi-repo host's registry of its product repos.
NESTED_OPTIONAL_KEYS = ("installed", "repos")
# P40: one registry entry per product repo of a multi-repo host (a host that tracks nothing and
# holds its repos at depth 1). The install is multi-repo iff `repos` is a non-empty list
# (`nested_repos()`); without it every code path is the single-repo nested one, byte-for-byte.
# `commit_convention` is the top-level four-key object or null (= inherit the host-level one);
# `rules` lists the repo's own rules files (AGENTS.md, CLAUDE.md, .agents/skills/*/SKILL.md), repo-relative.
NESTED_REPO_KEYS = ("name", "path", "default_branch", "commit_convention", "rules")
NESTED_REPO_NAME = re.compile(r"[A-Za-z0-9._-]+")
# P40.S10: `converted_from`, which the installer's `--to-multi-repo <repo>` appends to: one entry per
# per-repo nested install converted into this multi-repo host, `{"repo", "old_nested", "at"}` (strings:
# the repo's name, its old `<repo>/workflow`, the date). A known field, but lenient: nothing in the
# engine reads it (the installer renders its CLAUDE.local.md line), so a malformed value is a validate
# WARNING, never an error that would stop every command.
NESTED_NOTE_KEYS = ("converted_from",)
NESTED_CONVERTED_KEYS = ("repo", "old_nested", "at")
# P35: a nested phase worktree is a pair, and its host half needs a branch the operator names.
NESTED_HOST_BRANCH_REQUIRED = (
    "parallel-start in a nested install needs --host-branch <name>: the host repo's branch for this phase's product commits, "
    "named by the host's own convention for branches (see nested-convention), with no workspace phase/slice IDs in it; "
    "an existing branch is reused when no host worktree has it checked out (an explain phase may omit it: v86 cuts its host worktree "
    "detached, since an explain makes no host commit) -- nothing was written")
# v86 (§9.4): a worktree SET's repos ride beside a host BRANCH; only an explain phase's lone pair may be detached.
NESTED_SET_NEEDS_HOST_BRANCH = (
    "--repo and --repo-base need --host-branch <name>: a worktree set's host half is a branch the operator names; only an explain "
    "phase's plain pair may omit it (a detached host worktree, no host branch) -- nothing was written")
# phase.json `host_anchors` (nested only): the host HEAD at new-phase and at the passing review --
# phase-scope's range in the host repo, whose commits the nested repo never sees. `review_base`
# (P40, optional) is written at the passing review only when the base rule resolved something other
# than `created` (a rebased branch); absent means `created`, so older phase.json files stay valid.
HOST_ANCHOR_KEYS = ("created", "review_pass", "review_base")
# phase.json `repo_anchors.<name>` (multi-repo host only, P40): each registered repo's HEAD and branch
# at new-phase, and both ends of its range frozen at the passing review. Exactly these four keys.
REPO_ANCHOR_KEYS = ("created", "branch", "review_pass", "review_base")


def nested_marker_problems(data) -> list:
    """Every way a parsed `.agentic-nested.json` breaks schema 1 -- empty when it is well-formed.

        {"schema": 1,
         "host_root": "..",                       # relative to the engine root; the host repo's root
         "commit_convention": {"inferred": "<text>" | null, "confirmed": false,
                               "text": "<text>" | null, "coauthor_trailers": "allowed" | "forbidden" | "unknown"},
         "renames": {"skills": {"<original>": "<installed>"}, "agents": {"<original>": "<installed>"}},
         "installed": {"skills": ["<installed>", ...], "agents": ["<installed>", ...]},  # optional
         "repos": [{"name": "<name>", "path": "<host-relative dir>", "default_branch": "<branch>" | null,
                    "commit_convention": {<the four keys above>} | null, "rules": ["<repo-relative path>", ...]}]}  # optional

    A confirmed convention carries its text and a decided trailer rule; an installed name is a bare
    file/directory name. `installed` (written by the installer) lists the host-side skill directories
    and agent files that are the workspace's own; when present it has exactly those two lists of
    distinct bare names, and every renamed name appears in it. `repos` (P40, the multi-repo registry)
    is a list of objects with exactly NESTED_REPO_KEYS: a unique name, a unique normalized host-relative
    path that is neither the nested workspace nor under `.claude/` and stays under the host, and a
    `commit_convention` checked by the same rules as the top-level one (or null). Other unknown
    top-level keys are not problems (`validate` warns about them)."""
    if not isinstance(data, dict):
        return [f"{NESTED_MARKER} is not a JSON object"]
    problems = []
    missing = [k for k in NESTED_KEYS if k not in data]
    if missing:
        problems.append(f"missing field(s) {', '.join(missing)}")
    if "schema" in data and (data["schema"] is True or data["schema"] != NESTED_SCHEMA):
        problems.append(f"schema {data['schema']!r} is not {NESTED_SCHEMA}")
    if "host_root" in data:
        raw = data["host_root"]
        if not (isinstance(raw, str) and raw.strip()) or os.path.isabs(raw):
            problems.append(f"host_root {raw!r} must be a non-empty path relative to the engine root (normally \"..\")")
        else:
            host = (ROOT / raw).resolve()
            if not host.is_dir():
                problems.append(f"host_root {raw!r} resolves to {host}, which is not a directory")
            elif host == ROOT or host not in ROOT.parents:
                problems.append(f"host_root {raw!r} resolves to {host}, which does not contain the engine root {ROOT}")
    if "commit_convention" in data:
        problems.extend(_convention_problems(data["commit_convention"], "commit_convention"))
    if "renames" in data:
        renames = data["renames"]
        if not isinstance(renames, dict):
            problems.append("renames is not an object")
        else:
            for kind in NESTED_RENAME_KINDS:
                table = renames.get(kind)
                if not isinstance(table, dict):
                    problems.append(f"renames.{kind} must be an object mapping an original name to its installed name")
                    continue
                for original, installed in table.items():
                    if not (original and _bare_installed_name(installed)):
                        problems.append(f"renames.{kind}: {original!r} -> {installed!r} is not a bare installed name")
    if "installed" in data:
        inst = data["installed"]
        if not isinstance(inst, dict) or sorted(inst) != sorted(NESTED_RENAME_KINDS):
            problems.append(f"installed must be an object with exactly {' and '.join(NESTED_RENAME_KINDS)} (lists of installed names)")
        else:
            for kind in NESTED_RENAME_KINDS:
                names = inst[kind]
                if not isinstance(names, list):
                    problems.append(f"installed.{kind} must be a list of installed names")
                    continue
                bad = [n for n in names if not _bare_installed_name(n)]
                if bad:
                    problems.append(f"installed.{kind}: {', '.join(repr(n) for n in bad)} is not a bare installed name")
                elif len(set(names)) != len(names):
                    problems.append(f"installed.{kind} lists a name twice")
                table = data.get("renames", {}).get(kind) if isinstance(data.get("renames"), dict) else None
                if isinstance(table, dict) and not bad:
                    missing = sorted(v for v in table.values() if isinstance(v, str) and v not in names)
                    if missing:
                        problems.append(f"installed.{kind} does not list the renamed {', '.join(missing)}")
    if "repos" in data:
        problems.extend(_repos_problems(data["repos"], data.get("host_root")))
    return problems


def _converted_from_problems(raw) -> list:
    """Every way the marker's `converted_from` (P40.S10) breaks its shape: a list of objects with exactly
    the three string keys of NESTED_CONVERTED_KEYS. `validate` prints each one as a warning."""
    if not isinstance(raw, list):
        return [f"converted_from must be a list of objects with {', '.join(NESTED_CONVERTED_KEYS)} (strings)"]
    problems = []
    for i, entry in enumerate(raw):
        label = f"converted_from[{i}]"
        if not isinstance(entry, dict):
            problems.append(f"{label} is not an object")
            continue
        missing = [k for k in NESTED_CONVERTED_KEYS if k not in entry]
        unknown = sorted(str(k) for k in entry if k not in NESTED_CONVERTED_KEYS)
        if missing:
            problems.append(f"{label}: missing field(s) {', '.join(missing)}")
        if unknown:
            problems.append(f"{label}: unknown field(s) {', '.join(unknown)} (an entry has exactly {', '.join(NESTED_CONVERTED_KEYS)})")
        for key in NESTED_CONVERTED_KEYS:
            if key in entry and not (isinstance(entry[key], str) and entry[key].strip()):
                problems.append(f"{label}.{key} must be a non-empty string")
    return problems


def _convention_problems(conv, label: str) -> list:
    """Every way a `commit_convention` object breaks schema 1, each problem prefixed with `label`:
    the top-level one (`commit_convention`) and each registry entry's (`repos[<i>].commit_convention`)."""
    if not isinstance(conv, dict):
        return [f"{label} is not an object"]
    problems = []
    gone = [k for k in NESTED_CONVENTION_KEYS if k not in conv]
    if gone:
        problems.append(f"{label}: missing field(s) {', '.join(gone)}")
    for key in ("inferred", "text"):
        if key in conv and conv[key] is not None and not isinstance(conv[key], str):
            problems.append(f"{label}.{key} must be a string or null")
    if "confirmed" in conv and not isinstance(conv["confirmed"], bool):
        problems.append(f"{label}.confirmed must be true or false")
    if "coauthor_trailers" in conv and conv["coauthor_trailers"] not in NESTED_TRAILERS:
        problems.append(f"{label}.coauthor_trailers {conv['coauthor_trailers']!r} is not one of {', '.join(NESTED_TRAILERS)}")
    if conv.get("confirmed") is True:
        if not (isinstance(conv.get("text"), str) and conv["text"].strip()):
            problems.append(f"{label}: a confirmed convention records its text")
        if conv.get("coauthor_trailers") not in ("allowed", "forbidden"):
            problems.append(f"{label}: a confirmed convention records coauthor_trailers allowed or forbidden")
    return problems


def _repos_problems(repos, host_root) -> list:
    """Every way the marker's `repos` registry (P40) breaks its shape. `host_root` is the marker's own
    value: the nested-dir and stays-under-the-host rules read it, and are skipped when it is unusable
    (that is already a host_root problem). Structural only: whether each path is a git work tree
    root, hidden from the host and clean of workspace files is `validate`'s (`nested_repo_checks`)."""
    if not isinstance(repos, list):
        return [f"repos must be a list of objects with exactly {', '.join(NESTED_REPO_KEYS)}"]
    host = nested_dir = None
    if isinstance(host_root, str) and host_root.strip() and not os.path.isabs(host_root):
        candidate = (ROOT / host_root).resolve()
        if candidate.is_dir() and candidate != ROOT and candidate in ROOT.parents:
            host, nested_dir = candidate, Path(os.path.relpath(ROOT, candidate)).as_posix()
    problems, names, paths = [], set(), set()
    for i, repo in enumerate(repos):
        label = f"repos[{i}]"
        if not isinstance(repo, dict):
            problems.append(f"{label} is not an object")
            continue
        missing = [k for k in NESTED_REPO_KEYS if k not in repo]
        unknown = sorted(k for k in repo if k not in NESTED_REPO_KEYS)
        if missing:
            problems.append(f"{label}: missing field(s) {', '.join(missing)}")
        if unknown:
            problems.append(f"{label}: unknown field(s) {', '.join(unknown)} (a repo entry has exactly {', '.join(NESTED_REPO_KEYS)})")
        if "name" in repo:
            name = repo["name"]
            if not (isinstance(name, str) and NESTED_REPO_NAME.fullmatch(name)):
                problems.append(f"{label}.name {name!r} must match [A-Za-z0-9._-]+")
            elif name in names:
                problems.append(f"{label}.name {name!r} is listed twice")
            else:
                names.add(name)
        if "path" in repo:
            raw = repo["path"]
            bad = _repo_path_problem(raw, host, nested_dir)
            if bad:
                problems.append(f"{label}.path {raw!r} {bad}")
            elif raw in paths:
                problems.append(f"{label}.path {raw!r} is listed twice")
            else:
                paths.add(raw)
        branch = repo.get("default_branch")
        if branch is not None and not (isinstance(branch, str) and branch.strip() and branch == branch.strip()):
            problems.append(f"{label}.default_branch must be a branch name or null")
        if repo.get("commit_convention") is not None:
            problems.extend(_convention_problems(repo["commit_convention"], f"{label}.commit_convention"))
        if "rules" in repo and not (isinstance(repo["rules"], list) and all(isinstance(r, str) and r.strip() for r in repo["rules"])):
            problems.append(f"{label}.rules must be a list of repo-relative paths")
    return problems


def _repo_path_problem(raw, host, nested_dir):
    """Why a registry `path` is unusable, or None. A path is host-relative and normalized (no `.`,
    `..` or empty segment, no trailing `/`), never the nested workspace or a dir around it, never
    under `.claude/`, and -- when the host is known -- still under the host once symlinks resolve."""
    if not (isinstance(raw, str) and raw.strip()) or raw != raw.strip():
        return "must be a non-empty path relative to the host root"
    if os.path.isabs(raw) or "\\" in raw:
        return "must be relative to the host root, not absolute"
    parts = raw.split("/")
    if any(part in ("", ".", "..") for part in parts):
        return "must be a normalized path under the host root (no '.', '..' or empty segment, no trailing '/')"
    if parts[0] == ".claude":
        return "is under .claude/, which holds the workspace's own files"
    if nested_dir is not None:
        if raw == nested_dir or raw.startswith(nested_dir + "/"):
            return "is the nested workspace"
        if nested_dir.startswith(raw + "/"):
            return "contains the nested workspace"
    if host is not None:
        resolved = (host / raw).resolve()
        if host not in resolved.parents:
            return f"resolves to {resolved}, outside the host {host}"
    return None


def _bare_installed_name(name) -> bool:
    """A skill directory or agent file stem as installed in the host: one plain path segment."""
    return (isinstance(name, str) and bool(name.strip()) and name == name.strip()
            and "/" not in name and "\\" not in name and not name.startswith("."))


def _load_nested() -> tuple:
    """(marker, problems): (None, []) when ROOT holds no `.agentic-nested.json` -- at-root mode, the only
    case that touches nothing. A marker that cannot be read or parsed comes back as `{}` with its
    problem, so it still counts as nested (never silently at-root)."""
    path = ROOT / NESTED_MARKER
    if not os.path.lexists(path):
        return None, []
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, ValueError) as exc:
        return {}, [f"cannot be read as JSON ({exc})"]
    return (data if isinstance(data, dict) else {}), nested_marker_problems(data)


NESTED, NESTED_PROBLEMS = _load_nested()
HOST_ROOT = None
if NESTED is not None and isinstance(NESTED.get("host_root"), str) and NESTED["host_root"].strip() and not os.path.isabs(NESTED["host_root"]):
    HOST_ROOT = (ROOT / NESTED["host_root"]).resolve()
# The command prefix every printed hint uses: from the host root when nested (cwd = <host>), from
# the workspace root otherwise -- so at root it is exactly the literal the hints always printed. A
# nested marker too broken to name its host gets the absolute path, right from any cwd.
if HOST_ROOT is not None:
    WORKFLOW_CMD = f"python3 {Path(os.path.relpath(ROOT, HOST_ROOT)).as_posix()}/scripts/workflow.py"
elif NESTED is not None:
    WORKFLOW_CMD = f"python3 {ROOT / 'scripts' / 'workflow.py'}"
else:
    WORKFLOW_CMD = "python3 scripts/workflow.py"
# Appended to every printed `parallel-start <P>` hint: a nested install's start needs the host branch
# (P35), which the operator names; at root it is empty, so the hints print exactly as before.
NESTED_HOST_BRANCH_ARG = " --host-branch <name>" if NESTED is not None else ""


def shown(path: Path) -> str:
    """A path as the operator's shell must type it: relative to the host root when nested (so
    `workflow/works/...` resolves from a session started at the host), else today's ROOT-relative
    string. OUTPUT ONLY -- a path persisted into index.json, slice.json, phase.json or events.jsonl
    stays ROOT-relative, because the state it points into lives in the nested repo."""
    if HOST_ROOT is not None:
        return os.path.relpath(path, HOST_ROOT)
    if NESTED is not None:  # a marker too broken to name its host: absolute, right from any cwd
        return str(path)
    return str(path.relative_to(ROOT))


def shown_rel(rel: str) -> str:
    """`shown` for a ROOT-relative string read back from stored state (an index or phase path):
    host-relative when nested, and at root the stored string itself, untouched."""
    return shown(ROOT / rel) if HOST_ROOT is not None else rel


WORKS = ROOT / "works"
DOCS = ROOT / "docs"
ACTIVE = WORKS / "phases" / "active"
ARCHIVED = WORKS / "phases" / "archived"
DEFERRED_OPEN = WORKS / "deferred" / "open"
DEFERRED_PROMOTED = WORKS / "deferred" / "promoted"
DEFERRED_DROPPED = WORKS / "deferred" / "dropped"
DOC_TYPES = {"product", "architecture", "operations", "qa", "decisions"}
# The six docs retired by v79: for an AI reader they restated the code (and went stale), and they were
# written more than read. An install that has them keeps them readable in docs/current, listed as
# retired; doc-new-version refuses them, and a `## Doc impact` note naming one counts for its successor,
# where what the code cannot say about it (a journey, a contract, an invariant, a trust boundary) goes.
RETIRED_DOCS = {"experience": "product", "frontend": "architecture", "backend": "architecture",
                "data": "architecture", "api": "architecture", "security": "architecture"}
# An H2 section in a durable doc past this many bytes has outgrown the read-order rule
# ("read the `docs/current/` SECTIONS the work touches"): at ~4 B/token 10 KB is ~2.5 k tokens,
# and measured across four live adopting repos (P21.S1 §2.8) 10 % of all H2 sections are already
# over it, the worst one 112,619 B / ~28 k tokens in a single section. 10 KB is that measurement's
# own cut line, so the check flags the tail that actually defeats the rule and stays quiet on the
# other 90 %. ADVISORY ONLY -- a warning naming doc, section and size, never an error: splitting is
# per-doc judgment for the next docs phase (small docs measured WORSE when sectioned, §2.4), so
# this only makes the drift visible. One knob, no config plumbing.
DOC_SECTION_WARN_BYTES = 10 * 1024
PHASE_STATUSES = {"planned", "in_progress", "in_review", "pending", "blocked", "done"}
SLICE_STATUSES = {"todo", "ready", "in_progress", "in_review", "changes_requested", "pending", "blocked", "done"}
# The typed pending record (v61): every operator stop says what kind it is and what the operator's words on
# return will do. Stored on the slice as `pending: {kind, on_words, since}` while it is `pending`, and
# cleared whenever it leaves `pending`. A closed set; `other` is the escape hatch.
SLICE_STOP_KINDS = {
    "wave": "a design wave stop (the jobs are published; the operator reviews them)",
    "mockup": "the mockup gate (the operator walks the requested mockup)",
    "decision": "a question only the operator answers (DECOMP's design style, a needs_operator)",
    "operator-action": "the operator must run or provide something",
    "limit": "a usage limit with no reset time",
    "other": "anything else",
}
DEFERRED_STATUSES = {"deferred", "ready", "promoted", "done", "dropped"}
REVIEW_VERDICTS = {"pass", "changes_requested", "blocked"}
# Ids (readable ids, after v83): an id the operator can say. New phase and deferred ids are the next
# NUMBER plus a two-symbol random tail -- `P46-k2`, `D92-x4`, slices `P46-k2.S1` -- the number one more than the highest
# numbered id of that kind the workspace can see (old `P45` and tailed `P45-m9` alike, archived included),
# the tail drawn with `secrets` from v73's alphabet (Crockford base32 in lowercase without the look-alikes
# `i l o u`) and holding at least one letter, so `P46-12` never reads as a range. Two branches that each
# make the next id draw the same number but (923 times in 924) different tails; a same-number same-tail
# pair surfaces as a git add/add conflict on the phase folder at merge, never a silent mix (no engine
# guard). Older ids are never renamed: v72's `P<n>` / `D<n>` and v73's minted `P-<token>` / `D-<token>`
# (4 symbols) stay valid beside the new shape. These patterns are the ONE predicate every reader of a
# stored id uses (a digit after `P` means numbered, with or without a tail; a dash after `P` means a v73
# token), and `id_sort_key` the one order a listing uses (numbered ids by number, then v73 tokens by
# creation). Slice ids keep their per-phase suffixes: `P46-k2.S1`, `P-7kq2.S1`, `P12.S1`.
ID_TOKEN_ALPHABET = "0123456789abcdefghjkmnpqrstvwxyz"
ID_TOKEN_LENGTH = 4  # a v73 token: guards only an explicit `--phase P-7kq2` / `--id D-m3xa` now
ID_TOKEN_PATTERN = "[0-9a-hjkmnp-tv-z]{4}"
ID_TAIL_LENGTH = 2
ID_TAIL_LETTERS = "abcdefghjkmnpqrstvwxyz"
# Two alphabet symbols, at least one a letter (never all digits): 32^2 - 10^2 = 924 tails per number.
ID_TAIL_PATTERN = "(?:[a-hjkmnp-tv-z][0-9a-hjkmnp-tv-z]|[0-9][a-hjkmnp-tv-z])"
ID_MODE_WORDS = frozenset({"gate", "plan"})  # `auto` and `only` cannot be drawn: u, o and l are not in the alphabet
PHASE_ID_PATTERN = rf"P(?:[0-9]+(?:-{ID_TAIL_PATTERN})?|-{ID_TOKEN_PATTERN})"
DEFERRED_ID_PATTERN = rf"D(?:[0-9]+(?:-{ID_TAIL_PATTERN})?|-{ID_TOKEN_PATTERN})"
# A numbered id, tailed or not, any prefix: group 1 the number, group 2 the tail (None when untailed).
NUMBERED_ID_RE = re.compile(rf"[PD]([0-9]+)(?:-({ID_TAIL_PATTERN}))?")
SLICE_SUFFIX_PATTERN = "[A-Z][A-Z0-9]*"
PHASE_ID_RE = re.compile(PHASE_ID_PATTERN)
DEFERRED_ID_RE = re.compile(DEFERRED_ID_PATTERN)
SLICE_ID_RE = re.compile(rf"({PHASE_ID_PATTERN})\.({SLICE_SUFFIX_PATTERN})")
# An archive folder is `<yyyymmdd>_<hhmmss>_<phase id>_<slug>` (`_archive_one`); the slug is lowercase.
ARCHIVE_FOLDER_ID_RE = re.compile(rf"_({PHASE_ID_PATTERN})_")
# Closed set of slice kinds (workspace v34). `kind` routes real behavior -- `co-work` in
# particular means orchestrator-inline (the round's lifecycle and the operator's words
# stay on the main thread), so a typo like `cowork` used to create a slice that read as
# ordinary implementation and got dispatched to an executor that cannot run a design
# round. Enforced asymmetrically on purpose: a HARD ERROR at creation
# (`new-slice`, `promote-deferred`), only a WARNING in `validate()`, so an adopting repo
# carrying an invented kind in its history survives an update instead of failing validate
# on slices it cannot change. Note `--risk` next door is deliberately NOT validated:
# unrecognized values route to the high row, which is the safe direction -- do not
# "fix" that asymmetry for symmetry's sake.
# Kinds route by KIND before `risk` is read (`slice_route`; `executor-route <slice>` prints the
# decision): `decomposition`, `review` and `co-work` (its mockup span) to the `high` row, and
# `research` (added in workspace v36) to the `research` row -- never the mid row (all three
# slice rows run the one `slice-executor` file since v66; the row picks the model and effort). A
# `research` slice is findings-only -- it writes no product code, and what it learned lands in
# the phase notebook for the `DECOMP2` that usually follows -- so a weak read is expensive and it
# must never be routable to the mid row by a `low` rating. Set `--risk high`
# on one so the recorded rating cannot contradict the routing; if the two ever disagree, the kind
# wins.
SLICE_KINDS = {"implementation", "review", "decomposition", "research", "fix", "docs", "qa", "co-work"}
# Phase-notebook budget (v35; an index since v61): phase.md is read and written ONE SECTION at a
# time (`phase-section`), so it is an index of what the next slice needs, not a store. Long
# material -- a contract, a signed-design summary -- lives in `topics/<slug>.md` beside it,
# linked by one line. 40 KB is a soft cap: still a WARNING, never an error, because a hard cap
# invites truncating exactly the notes that matter; the warning names the biggest sections
# so the fix is a move to `topics/` or to the slice's `result.md`, never a deletion.
PHASE_MD_BUDGET = 40 * 1024
# Notebook entries: a section's entries are what `phase-section --entry` reads and writes
# and what `--to-topic` moves (`notebook_entries` is the one parser). An entry over
# LONG_ENTRY_BYTES (or one with nested list lines) is long: the move's candidate. A moved entry
# leaves one pointer line whose gist is a verbatim excerpt of at most GIST_MAX characters; a gist
# with fewer than GIST_PLAIN_MIN characters of plain text once markdown, links and the label are
# stripped is a bare link, which says nothing where the decision was, so the move refuses it.
LONG_ENTRY_BYTES = 512
GIST_MAX = 160
GIST_PLAIN_MIN = 24
# Per-section budgets (bytes), warning-only like PHASE_MD_BUDGET, which still judges the total. A
# section not named here gets SECTION_BUDGET_DEFAULT; None = no budget of its own (Slices is
# generated, Doc impact is append-only, one line per note), though both still count to the total.
# `notebook_report` is the one reader: the index, finish-slice, validate and next all print from it.
SECTION_BUDGETS = {"decisions": 12288, "operator questions": 8192, "notes for later slices": 6144,
                   "now": 2048, "objective": 2048, "slices": None, "doc impact": None}
SECTION_BUDGET_DEFAULT = 6144
SECTION_REMEDIES = {"operator questions": "collapse answered entries with --resolve OQ<n> --pointer <ref>",
                    "now": "rewrite it shorter with --replace"}
# Paged reads: a section or topic block over PAGE_BYTES prints one page at a time, whole entries
# only. Bytes are at least characters, so a page plus its header stays under the Bash tool's
# 30,000-character output limit and is never printed cut off.
PAGE_BYTES = 24 * 1024
# Execution streams (workspace v24; opt-in again since v43). A phase.json MAY carry an
# optional `execution` block. `mode: "parallel"` = the phase runs on its own branch +
# worktree, stamped by `parallel-start` -- which a phase gets ONLY when the operator asks
# for it. No block = the phase runs on the default stream, which is where every phase runs
# unless asked otherwise; that is the v43 default and it needs no marker.
# `mode: "default"` = a LEGACY pin written by v42's `parallel-skip` / `new-phase --on-main`,
# when the worktree was the default and staying on main needed saying. Both commands are
# now no-ops, so nothing new is ever stamped with it -- but `phase_execution` still returns
# None for it, so a pinned phase IS a default-stream phase everywhere, and `parallel-start`
# still refuses one rather than silently overriding an old deliberate pin.
# See `phase_execution` / `phase_pinned`.
EXECUTION_MODES = {"parallel"}
PINNED_MODE = "default"
# The default worktree home. Nested under the repo so Claude Code's EnterWorktree can enter it
# from anywhere (it accepts `.claude/worktrees/` paths even from inside another worktree), and
# excluded through the repo's own info/exclude so the default checkout never sees it.
WORKTREES_DIR = ".claude/worktrees"
# What the stamp commit carries besides the phase folder: the generated works/ files that
# `rebuild_index_and_state` rewrites, plus the event log. Nothing else on the tree enters it.
STAMP_WORKS_FILES = ("works/state.json", "works/index.json", "works/backlog.md", "works/deferred.md", "works/events.jsonl")
CONSOLIDATION_STATES = {"pending", "done"}
# How many phases must owe durable-doc consolidation before `next` / `validate` say so.
# 1 = always, whenever anything owes -- the deliberate default, because the debt has to be
# visible at ANY docs-phase cadence: deferral traded review cost for operator-paced staleness,
# and silent staleness is the one outcome the trade may not have. This single constant is the
# only "how loud" knob for the *debt* line. v39 settled the cadence question by declining it --
# consolidation runs when the operator wants it, and explicit doc staleness (`stale_docs`) is what
# was taken instead -- so this stays 1; a repo that later states a cadence can still raise it.
CONSOLIDATION_DEBT_MIN_PHASES = 1
# What `docs-debt` calls a note that names no doc from DOC_TYPES -- listed, never guessed at.
UNASSIGNED_DOC = "(unassigned)"
# A default-stream phase in any of these states means main is mid-flight, so a phase
# branch may not be merged into it yet (the quiet-point gate, `parallel-gate`).
BUSY_PHASE_STATUSES = ("in_progress", "in_review", "pending", "blocked")
# The quiet point's checked exemption (v86, §9.2): a branch whose diff since its merge-base with the
# default side touches only its own phase folder, the STAMP_WORKS_FILES, or paths ADDED under this
# folder (a deferred job filed on the branch: a new minted-id folder cannot conflict) cannot collide
# with in-flight default-stream work, so `parallel-gate` drops the busy-default-stream reason for it.
GATE_EXEMPT_ADDED_PREFIX = "works/deferred/open/"
# An explain phase's publishable unit (`- unit:` in intent.md's `## Explain`); absent reads `book`,
# the only unit before v86.
EXPLAIN_UNITS = ("document", "book", "chapter")
EXPLAIN_UNIT_DEFAULT = "book"
# Regenerated from works/phases/** and docs/versions/** by `parallel-merge-finish`;
# never merged by hand (see .gitattributes).
GENERATED_FILES = ("works/state.json", "works/index.json", "works/backlog.md", "works/deferred.md", "docs/current/*.md")
# The executor agent files Claude Code loads: the host's `.claude/agents` when nested (Claude Code
# finds agents walking up from the session's cwd, the host root), the workspace's otherwise.
# executors.toml and .env stay at ROOT either way.


def _main_host_checkout(host: Path) -> Path:
    """Nested only (P35): the MAIN host checkout, even when HOST_ROOT is a host worktree. The main
    checkout is the parent of the host's common git dir when that dir is a plain `.git`; anything
    else (no git, a submodule's `.git/modules/<name>`, a separate GIT_DIR) falls back to `host`."""
    try:
        proc = subprocess.run(["git", "rev-parse", "--path-format=absolute", "--git-common-dir"],
                              cwd=str(host), capture_output=True, text=True, timeout=10)
    except Exception:  # noqa: BLE001 - git is optional; the host's own folder is the honest fallback
        return host
    common = Path(proc.stdout.strip()) if proc.returncode == 0 and proc.stdout.strip() else None
    if common is None or common.name != ".git":
        return host
    return common.parent


# Nested only: the main host checkout (P35), resolved once. HOST_ROOT itself on the default stream;
# inside a parallel set HOST_ROOT is the host worktree and this is still the main checkout. Its
# `.claude/agents` is where Claude Code reads the agents from (a phase worktree pair has no `.claude/`
# of its own, so `<host-wt>/.claude/agents` never exists), and the multi-repo registry's paths
# resolve against it (`nested_repo_path`, P40), never against HOST_ROOT.
MAIN_HOST = _main_host_checkout(HOST_ROOT) if HOST_ROOT is not None else None
CLAUDE_AGENTS = MAIN_HOST / ".claude" / "agents" if MAIN_HOST is not None else (HOST_ROOT or ROOT) / ".claude" / "agents"


def nested_repos() -> list:
    """P40: the multi-repo registry -- the marker's `repos` entries; `[]` when the key is absent or
    empty, at root, or when the marker is malformed (every command but validate refuses then). The
    install is multi-repo iff this is non-empty, and EVERY multi-repo branch is gated on it, so a
    single-repo nested or at-root install runs exactly today's code."""
    if NESTED is None or NESTED_PROBLEMS:
        return []
    repos = NESTED.get("repos")
    return list(repos) if isinstance(repos, list) else []


def nested_repo_path(repo: dict) -> Path:
    """P40: where a registry entry lives -- under the MAIN host checkout, never HOST_ROOT. Inside a
    parallel set HOST_ROOT is the host worktree, where a repo with no worktree in that set is simply
    absent; reading the registry there must not report it missing (S2 §17). The set side
    (`HOST_ROOT / path`, a repo's worktree in the set) belongs to the parallel commands."""
    return (MAIN_HOST or HOST_ROOT) / repo["path"]


def _git_work_tree_root(path: Path) -> bool:
    """True when `path` is the root of its own git work tree. `git -C` on a plain directory walks up
    and answers for the enclosing repo (the host), so `--show-toplevel` must be `path` itself."""
    if not path.is_dir():
        return False
    try:
        proc = subprocess.run(["git", "rev-parse", "--show-toplevel"], cwd=str(path), capture_output=True, text=True, timeout=10)
    except Exception:  # noqa: BLE001 - no git: nothing is a work tree root
        return False
    top = proc.stdout.strip()
    return proc.returncode == 0 and bool(top) and Path(top).resolve() == path.resolve()


RETIRED_EXECUTOR_TIERS = ("low",)  # [claude.low]: dropped in workspace v23, still refused with its migration
# [claude.cheap]: the Haiku row for docs and qa, retired in workspace v83 (those slices run on the mid row);
# refused with its migration. The meter still reads old spans as `cheap` (METER_ROUTES).
RETIRED_ROUTES = ("cheap",)
# The executor route table (workspace v53): ONE table, owned here, that the orchestrator dispatches
# from. A row is a (model, effort) pair the dispatch passes per call; `executor-route` prints the
# resolved row for a slice and `sync-agents` writes the rows that own an agent file into that
# file's frontmatter, which is only the fallback. Each row is overridable, key by key, under
# [claude.<row>] in the repo-root executors.toml. There is no Haiku slice row: v83 retired `cheap`
# (docs and qa rated low ran on Haiku); every slice rated low runs on the mid row.
# `explore` is the read-only lookup agent (.claude/agents/Explore.md), not a slice route.
# `design` is the design subagent's own row (.claude/agents/design-drafter.md, workspace v60): never
# a slice's route -- only `executor-route --drafter` dispatches on it.
# `critic` and `judge` (workspace v60) are the design critic's two modes: `critic` owns
# .claude/agents/design-critic.md and judges each drafted round; `judge` runs that same file in judge
# mode, with its model passed per call, and rules only on the items the critic escalated. Neither is a
# slice route; `executor-route --critic` / `--judge` dispatch them. Either may run on the drafter's model:
# the operator dropped the different-model rule for the judge in workspace v66 and for the critic in v75.
# One executor (workspace v66): the three slice rows -- high, research and mid -- all run the
# one `slice-executor` file, whose frontmatter carries the mid row (the default route). The two
# executor tiers of v23-v65 (slice-executor-mid / -high, split because the Agent tool could not set
# effort per dispatch before Claude Code 2.1.292) are retired, and so is the `tier` they carried:
# a dispatch names its row (`route=`), and the verdict records it (`route:`).
# Only the rows that own their file (FILE_ROWS: mid, design, critic, explore) are written into
# frontmatter, so only they accept a full model id or "inherit"; every other row (high, research,
# judge) runs a file another row owns with its model passed per call, and the Agent tool's
# `model` is an enum, so those rows take an alias only.
# effort = "" is the escape hatch for a model that rejects the parameter: no effort line in the
# agent file and no per-dispatch effort. The named modes of v29-v52 (a top-level
# `mode` key) are retired; read_executors_toml refuses one.
# The defaults are the operator's own routes (workspace v80, v83): every opus row at high, mid on opus at
# medium, haiku at xhigh for explore only.
EXECUTOR_ROUTES = ("high", "research", "design", "critic", "judge", "mid", "explore")  # print order
METER_ROUTES = EXECUTOR_ROUTES + RETIRED_ROUTES  # the meter's order: history still holds cheap spans
ROUTE_DEFAULTS = {
    "high": {"model": "opus", "effort": "high"},
    "research": {"model": "opus", "effort": "high"},
    "design": {"model": "opus", "effort": "high"},
    "critic": {"model": "opus", "effort": "high"},
    "judge": {"model": "opus", "effort": "high"},
    "mid": {"model": "opus", "effort": "medium"},
    "explore": {"model": "haiku", "effort": "xhigh"},
}
# The agent file each row dispatches to (canonical name; `installed_agent_name` applies a nested
# rename). The design row owns design-drafter and follows no other row, so one [claude.design]
# override governs it alone (before v60 it followed the high row). The critic row owns
# design-critic; the judge row runs that same file in judge mode.
SLICE_AGENT = "slice-executor"
ROUTE_AGENT = {"high": SLICE_AGENT, "research": SLICE_AGENT, "design": "design-drafter", "critic": "design-critic",
               "judge": "design-critic", "mid": SLICE_AGENT, "explore": "Explore"}
# The rows that own their agent file: sync-agents writes each one's resolved model/effort into its
# frontmatter, so only these accept a full model id or "inherit".
FILE_ROWS = ("mid", "design", "critic", "explore")
# The executor pair v66 retired (last shipped in v65): old transcripts still name them, so the meter
# keeps reading them (`_meter_route`, `_meter_collect`'s canon map).
RETIRED_AGENTS = ("slice-executor-high", "slice-executor-mid")
# (label, canonical agent name, row) for the four agent files sync-agents manages, in print order.
MANAGED_AGENT_FILES = (
    ("slice-executor", ROUTE_AGENT["mid"], "mid"),
    ("design-drafter", ROUTE_AGENT["design"], "design"),
    ("design-critic", ROUTE_AGENT["critic"], "critic"),
    ("Explore", ROUTE_AGENT["explore"], "explore"),
)
AGENT_MODEL_ALIASES = ("opus", "sonnet", "haiku", "fable")  # the Agent tool's `model` enum
EFFORT_LEVELS = ("low", "medium", "high", "xhigh", "max")  # the Agent tool's `effort` enum
# Commit attribution follows the model a slice actually ran on; anything else prints verbatim.
MODEL_ATTRIBUTION = {"opus": "Claude Opus 5.5", "sonnet": "Claude Sonnet 5.5",
                     "haiku": "Claude Haiku 5.5", "fable": "Claude Fable 5.1"}
# A loopback ANTHROPIC_BASE_URL is a local proxy (ocx's Kiro sidecar listens on 127.0.0.1:10100)
# that serves no Haiku 5.5: there the explore row falls back to EXPLORE_PROXY_MODEL, printed as a
# `fallback=` line by executor-route.
LOOPBACK_HOSTS = ("127.0.0.1", "localhost", "::1")
EXPLORE_PROXY_MODEL = "sonnet"
# The same proxy serves no Fable either. The judge row (Opus @ xhigh by default, so this never fires
# at the default) does NOT fall back: a judge is the stronger second opinion, so a substitute would be
# a weaker one. Only when an operator overrides the judge row to Fable and runs behind a loopback proxy
# does `executor-route --judge` print a `skip=yes` line instead: the orchestrator dispatches no judge
# and the escalated items reach the operator marked low confidence.
JUDGE_PROXY_SKIP_FAMILY = "fable"


def now_iso() -> str:
    return datetime.now().astimezone().replace(microsecond=0).isoformat()


def timestamp() -> str:
    return datetime.now().strftime("%Y%m%d_%H%M%S")


def slugify(value: str, fallback: str = "item") -> str:
    slug = re.sub(r"[^a-zA-Z0-9._-]+", "_", value.strip().lower()).strip("_")
    return slug or fallback


def read_json(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def write_text(path: Path, text: str, executable: bool = False) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    fd, tmp = tempfile.mkstemp(dir=str(path.parent), prefix=".tmp_", suffix=path.name)
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as f:
            f.write(text)
        if executable:
            os.chmod(tmp, os.stat(tmp).st_mode | stat.S_IXUSR | stat.S_IXGRP | stat.S_IXOTH)
        os.replace(tmp, str(path))
    except BaseException:
        try:
            os.unlink(tmp)
        except OSError:
            pass
        raise


def write_json(path: Path, data: object) -> None:
    write_text(path, json.dumps(data, ensure_ascii=False, indent=2) + "\n")


def write_json_stamped(path: Path, data: dict, key: str, stamp: str) -> dict:
    """Write a generated JSON file whose `key` stamps when it was built, unless nothing but that
    stamp would change: then write nothing and keep the old stamp. So a read (`next`, `run-phases`,
    a plain `rebuild`) leaves these tracked files, and the tree, unchanged; the stamp moves only
    with a real change (v74). Returns `data` holding the stamp that is on disk."""
    try:
        old = read_json(path)
    except (OSError, ValueError):
        old = None
    if isinstance(old, dict) and key in old and {k: v for k, v in old.items() if k != key} == {k: v for k, v in data.items() if k != key}:
        data[key] = old[key]
        return data
    data[key] = stamp
    write_json(path, data)
    return data


def append_event(event_type: str, **payload: object) -> None:
    event = {"ts": now_iso(), "type": event_type, **payload}
    WORKS.mkdir(parents=True, exist_ok=True)
    with (WORKS / "events.jsonl").open("a", encoding="utf-8") as f:
        f.write(json.dumps(event, ensure_ascii=False) + "\n")


def strip_frontmatter(text: str) -> str:
    if text.startswith("---\n"):
        end = text.find("\n---\n", 4)
        if end != -1:
            return text[end + len("\n---\n"):].lstrip("\n")
    return text


def read_executors_toml() -> dict:
    """{(row, key): value} from the repo-root executors.toml: the per-row overrides of the route table.

    Strict subset of TOML -- [claude.<row>] tables (a row of EXECUTOR_ROUTES) holding model/effort
    keys with double-quoted string values; '#' comments and blanks ignored. Anything else is an
    error naming its line, so a typo surfaces instead of silently keeping a default. A retired shape
    (the v29-v52 `mode` key, [claude.low], [codex.*]) is refused with its migration."""
    path = ROOT / "executors.toml"
    values: dict = {}
    if not path.exists():
        return values
    section = None
    rows = ", ".join(sorted(EXECUTOR_ROUTES))
    for n, raw in enumerate(path.read_text(encoding="utf-8").splitlines(), start=1):
        line = raw.strip()
        if not line or line.startswith("#"):
            continue
        if re.match(r"^mode\s*=", line):
            raise SystemExit(
                f"executors.toml line {n}: the economy/flex presets were retired in workspace v53 — delete this line; "
                "the route table replaces them (flex was xhigh on both executor rows: set effort = \"xhigh\" under [claude.mid] "
                f"and [claude.high] to keep it); run: {WORKFLOW_CMD} executor-route"
            )
        if re.match(r"^\[\s*codex\s*\.\s*[^\]]*\]\s*(?:#.*)?$", line):
            raise SystemExit(
                f"executors.toml line {n}: Codex support was removed in workspace v31 — "
                "this workspace ships Claude Code only, so drop this section"
            )
        m = re.match(r"^\[\s*claude\s*\.\s*([^\]\s]*)\s*\]\s*(?:#.*)?$", line)
        if m:
            name = m.group(1)
            if name in RETIRED_ROUTES:
                raise SystemExit(
                    f"executors.toml line {n}: the {name} row was retired in workspace v83 — docs and qa slices "
                    "rated low now run on the mid row; drop this section (to change their model, set [claude.mid])"
                )
            if name in RETIRED_EXECUTOR_TIERS:
                raise SystemExit(
                    f"executors.toml line {n}: the {name} executor tier was retired in workspace v23 — "
                    "drop this section or move its settings to [claude.mid]"
                )
            if name not in EXECUTOR_ROUTES:
                raise SystemExit(f"executors.toml line {n}: unknown route {name} (valid: {rows})")
            section = name
            continue
        m = re.match(r'^(model|effort)\s*=\s*"([^"]*)"\s*(?:#.*)?$', line)
        if m:
            key, value = m.group(1), m.group(2)
            if section is None:
                raise SystemExit(f"executors.toml line {n}: key outside a section — put it under [claude.<row>] ({rows})")
            if (section, key) in values:
                raise SystemExit(f"executors.toml line {n}: duplicate {key} for [claude.{section}]")
            if key == "model" and not value:
                raise SystemExit(f"executors.toml line {n}: [claude.{section}] model must not be empty (efforts may be empty; models may not)")
            if key == "effort" and value and value not in EFFORT_LEVELS:
                raise SystemExit(
                    f"executors.toml line {n}: [claude.{section}] effort must be one of {', '.join(EFFORT_LEVELS)} "
                    f"— or \"\" to write no effort line (got {value!r})"
                )
            if key == "model" and section == "high" and value not in AGENT_MODEL_ALIASES:
                raise SystemExit(
                    f"executors.toml line {n}: [claude.high] model {value!r}: since v66 one executor file carries the mid row; "
                    f"the high row is passed per dispatch, so use an alias ({', '.join(AGENT_MODEL_ALIASES)}); "
                    "a full model id or inherit belongs under [claude.mid], which slice-executor.md carries"
                )
            if key == "model" and section not in FILE_ROWS and value not in AGENT_MODEL_ALIASES:
                raise SystemExit(
                    f"executors.toml line {n}: [claude.{section}] model {value!r}: route {section} dispatches to another row's "
                    f"agent file, so its model must be an Agent-tool alias ({', '.join(AGENT_MODEL_ALIASES)}); a full model id "
                    f"or inherit works only on {', '.join(r for r in EXECUTOR_ROUTES if r in FILE_ROWS)}, whose agent files carry it"
                )
            values[(section, key)] = value
            continue
        if re.match(r"^(model|effort)\s*=", line):
            raise SystemExit(f'executors.toml line {n}: values must be double-quoted TOML strings, e.g. model = "sonnet" under [claude.<row>]')
        raise SystemExit(f"executors.toml line {n}: cannot parse {line!r} (expected [claude.<row>] with row one of {rows}, or model/effort = \"...\")")
    return values


def resolve_routes(overrides=None) -> dict:
    """{row: {model, effort, model_source, effort_source}} in EXECUTOR_ROUTES order: the engine
    defaults overlaid key by key with executors.toml. A source is `default` or `executors.toml`."""
    if overrides is None:
        overrides = read_executors_toml()
    resolved: dict = {}
    for row in EXECUTOR_ROUTES:
        entry: dict = {}
        for key in ("model", "effort"):
            if (row, key) in overrides:
                entry[key], entry[f"{key}_source"] = overrides[(row, key)], "executors.toml"
            else:
                entry[key], entry[f"{key}_source"] = ROUTE_DEFAULTS[row][key], "default"
        resolved[row] = entry
    return resolved


def route_overrides(routes: dict) -> list:
    """`override=` lines for the rows executors.toml sets: what each pins against the engine default,
    or that it repeats the default (and so would stop following a later one). /update-workspace shows
    them to the operator, who decides whether to drop each [claude.<row>] table."""
    def pair(model, effort):
        return f"{model}@{effort or '(no effort)'}"
    lines = []
    for row in EXECUTOR_ROUTES:
        entry, default = routes[row], ROUTE_DEFAULTS[row]
        if "executors.toml" not in (entry["model_source"], entry["effort_source"]):
            continue
        if (entry["model"], entry["effort"]) == (default["model"], default["effort"]):
            lines.append(f"override={row} {pair(entry['model'], entry['effort'])} same as the default "
                         f"(drop [claude.{row}] to follow later defaults)")
        else:
            lines.append(f"override={row} {pair(entry['model'], entry['effort'])} "
                         f"(default {pair(default['model'], default['effort'])})")
    return lines


def route_source(entry: dict) -> str:
    """One source for a resolved row, or `model <s> / effort <s>` when its two keys differ."""
    if entry["model_source"] == entry["effort_source"]:
        return entry["model_source"]
    return f"model {entry['model_source']} / effort {entry['effort_source']}"


def _patched_agent_md(text: str, model: str, effort: str) -> str:
    """Rewrite only the model:/effort: frontmatter lines of a .claude agent file. Every other line
    is kept verbatim -- `name:` included, which for a renamed agent in a nested install is its
    installed name (the `subagent_type`), so sync-agents never undoes a rename."""
    if not text.startswith("---\n"):
        raise SystemExit("agent file has no frontmatter")
    end = text.find("\n---\n", 4)
    if end == -1:
        raise SystemExit("agent file frontmatter is unterminated")
    lines = [l for l in text[4:end].split("\n") if not l.startswith("model:") and not l.startswith("effort:")]
    insert_at = next((i for i, l in enumerate(lines) if l.startswith("permissionMode:")), len(lines))
    lines[insert_at:insert_at] = [f"model: {model}"] + ([f"effort: {effort}"] if effort else [])
    return "---\n" + "\n".join(lines) + text[end:]


def installed_agent_name(name: str) -> str:
    """The name a managed agent is installed under: its canonical name, or -- in a nested install
    whose host already has an agent of that name -- the rename the installer recorded in
    `.agentic-nested.json` `renames.agents`. The installed file is `<installed name>.md` and its `name:`
    frontmatter (the `subagent_type`) is the installed name too; the installer writes both."""
    if NESTED is None:
        return name
    renames = NESTED.get("renames")
    table = renames.get("agents") if isinstance(renames, dict) else None
    installed = table.get(name) if isinstance(table, dict) else None
    return installed if isinstance(installed, str) and installed else name


def executor_agent_files(routes: dict) -> list:
    """(label, path, model, effort) for the 4 managed agent files (MANAGED_AGENT_FILES): slice-executor
    from the mid row (the default route; high and research pass their model and effort per
    dispatch), design-drafter from its own design row, design-critic from the critic row and Explore
    from the explore row. high, research and judge own no file. Labels stay canonical;
    paths resolve through the nested rename map (`installed_agent_name`)."""
    return [
        (label, CLAUDE_AGENTS / f"{installed_agent_name(agent)}.md", routes[row]["model"], routes[row]["effort"])
        for label, agent, row in MANAGED_AGENT_FILES
    ]


def executor_agent_drift(routes: dict) -> tuple:
    """([(path, desired text)] for agent files that disagree with the routes, [missing paths]); writes nothing."""
    changed, missing = [], []
    for _label, path, model, effort in executor_agent_files(routes):
        if not path.exists():
            missing.append(path)
            continue
        current = path.read_text(encoding="utf-8")
        desired = _patched_agent_md(current, model, effort)
        if desired != current:
            changed.append((path, desired))
    return changed, missing


def sync_agents(args: argparse.Namespace) -> None:
    """Write the resolved route table into the four managed agent files' model/effort frontmatter:
    slice-executor from the mid row (high and research run it with their model and effort
    passed per dispatch), design-drafter from the design row, design-critic
    from the critic row (the judge row borrows that file, its model passed per call), Explore from
    the explore row (--check: report drift, write nothing, exit 1 when out of sync)."""
    overrides = read_executors_toml()
    routes = resolve_routes(overrides)
    config_present = (ROOT / "executors.toml").exists()
    legacy_env = ROOT / ".env"
    if legacy_env.exists() and "SLICE_EXECUTOR" in legacy_env.read_text(encoding="utf-8"):
        print("warning: .env holds SLICE_EXECUTOR_* keys, but executor config moved to executors.toml in v8 — .env is no longer read")
    drift, missing_paths = executor_agent_drift(routes)
    if not args.check:
        for path, desired in drift:
            write_text(path, desired)
    # Agent files live in the host when nested, so they are named from there (identical at root).
    changed = [shown(path) for path, _ in drift]
    missing = [shown(path) for path in missing_paths]
    for row in EXECUTOR_ROUTES:
        entry = routes[row]
        value = f"{entry['model']} @ {entry['effort'] or '(no effort line)'}"
        print(f"{row:<9} {value:<16} ({route_source(entry)})")
    print(f"config source: {f'executors.toml ({len(overrides)} override(s))' if config_present else 'defaults (no executors.toml)'}")
    for m in missing:
        print(f"missing agent file: {m}")
    if args.check:
        if changed or missing:
            print("out of sync with executors.toml/defaults:")
            for c in changed:
                print(f"- {c}")
            raise SystemExit(1)
        print("agent files in sync with executors.toml/defaults")
        return
    if changed:
        append_event("agents_synced", changed=changed, config_present=config_present)
        print("updated:")
        for c in changed:
            print(f"- {c}")
    else:
        print("already in sync; nothing written")
    if missing:
        raise SystemExit(1)


def _loopback_base_url():
    """ANTHROPIC_BASE_URL when its host is loopback (a local proxy such as ocx's Kiro sidecar), else None."""
    url = os.environ.get("ANTHROPIC_BASE_URL", "").strip()
    if not url:
        return None
    try:
        host = urlparse(url if "://" in url else f"http://{url}").hostname
    except ValueError:
        return None
    return url if host in LOOPBACK_HOSTS else None


def _route_fallback(row: str, routes: dict, proxy) -> tuple:
    """(model, effort, `fallback=` line or None) to dispatch one row under the environment: behind a
    loopback proxy (no Haiku 5.5) the explore row takes EXPLORE_PROXY_MODEL."""
    model, effort = routes[row]["model"], routes[row]["effort"]
    if row != "explore" or proxy is None or model == EXPLORE_PROXY_MODEL:
        return model, effort, None
    return EXPLORE_PROXY_MODEL, effort, (f"fallback=explore model {model} -> {EXPLORE_PROXY_MODEL} "
                                         f"(loopback ANTHROPIC_BASE_URL {proxy}: ocx/Kiro serves no Haiku 5.5)")


def model_family(model: str):
    """The model family a row's model names, for the judge's proxy skip and the meter's routes: an
    alias is its own family; a full id names one (`claude-opus-5-5`, a provider id such as `us.anthropic.claude-opus-…`, a
    `[1m]` suffix -> opus). `inherit` and an id naming no family are None: unknown here."""
    m = (model or "").strip().lower()
    if m in AGENT_MODEL_ALIASES:
        return m
    found = re.search(r"(?<![a-z])(" + "|".join(AGENT_MODEL_ALIASES) + r")(?![a-z])", m)
    return found.group(1) if found else None


def _judge_proxy_skip(routes: dict, proxy):
    """The `skip=` line for a judge dispatch behind a loopback proxy that serves no Fable, else None."""
    if proxy is None or model_family(routes["judge"]["model"]) != JUDGE_PROXY_SKIP_FAMILY:
        return None
    return (f"skip=yes reason=loopback ANTHROPIC_BASE_URL {proxy} serves no Fable: dispatch no judge; "
            "the escalated items reach the operator marked low confidence")


def _route_env_warnings() -> list:
    """`warning=` lines for the environment variables that outrank a per-dispatch model or effort."""
    lines = []
    level = os.environ.get("CLAUDE_CODE_EFFORT_LEVEL", "").strip()
    if level:
        lines.append(f"warning=CLAUDE_CODE_EFFORT_LEVEL={level} is set and outranks every per-dispatch effort "
                     "(and every agent file's effort line); unset it for the route table's efforts to apply")
    force = os.environ.get("CLAUDE_CODE_SUBAGENT_MODEL_FORCE", "").strip()
    if force and force.lower() not in ("0", "false", "no"):
        lines.append(f"warning=CLAUDE_CODE_SUBAGENT_MODEL_FORCE={force} is set and overrides every model "
                     "(per-dispatch and frontmatter alike); unset it for the route table's models to apply")
    return lines


def slice_route(kind, risk, retry: bool) -> tuple:
    """(row, reason) for one dispatch: kind first, then risk, then attempt -- bump up, never down.
    A second attempt is always the high row; review, decomposition and co-work (the mockup span)
    route high by kind and research to the research row, whatever `risk` says; otherwise only a
    risk of exactly `low` reaches the mid row (implementation, fix, docs and qa; v83 retired the
    Haiku cheap row that docs and qa rated low ran on)."""
    if retry:
        return "high", "second attempt"
    if kind in ("review", "decomposition", "co-work"):
        return "high", f"kind {kind}"
    if kind == "research":
        return "research", "kind research"
    if risk != "low":
        return "high", f"risk {risk if risk not in (None, '') else 'unset'} (not low)"
    if kind in ("implementation", "fix", "docs", "qa"):
        return "mid", f"kind {kind} rated low"
    return "high", f"unknown kind {kind if kind not in (None, '') else 'unset'}"


def _dispatch_lines(row: str, routes: dict, proxy) -> tuple:
    """(the model..attribution lines for one dispatch on `row`, its fallback line or None)."""
    model, effort, fallback = _route_fallback(row, routes, proxy)
    lines = [
        f"model={model}",
        f"pass_model={'yes' if model in AGENT_MODEL_ALIASES else 'no'}",
        f"effort={effort}",
        f"pass_effort={'yes' if effort else 'no'}",
        f"attribution={MODEL_ATTRIBUTION.get(model, model)}",
    ]
    return lines, fallback


def cmd_executor_route(args: argparse.Namespace) -> None:
    """Print the deterministic routing decision the orchestrator dispatches from, one key=value per
    line: bare, the resolved route table and the agent files' sync state; with a slice id, that
    slice's route (--retry: its second attempt); --drafter / --critic / --judge / --explore, the
    design subagent's (the design row), the design critic's two modes (the critic and judge rows,
    both running design-critic) and the lookup agent's (the explore row). Every form names the
    agent file it dispatches to as `subagent_type=`; the three slice rows all run slice-executor.

    The critic and the judge may share the drafter's model (v75). Behind a loopback proxy (no Fable)
    --judge on a Fable override prints
    `skip=yes reason=…` and exits 0: unlike a `fallback=` line, which names a substitute model to
    dispatch, `skip=` means dispatch nothing.
    Reads executors.toml (a malformed one errors here) and writes nothing."""
    forms = [f for f, on in (("<slice_id>", args.slice is not None), ("--drafter", args.drafter), ("--critic", args.critic),
                             ("--judge", args.judge), ("--explore", args.explore)) if on]
    if len(forms) > 1:
        raise SystemExit(f"executor-route: {' and '.join(forms)} are mutually exclusive; give at most one")
    if args.retry and args.slice is None:
        raise SystemExit("executor-route: --retry needs a <slice_id> (a second attempt is a slice's)")
    routes = resolve_routes()
    proxy = _loopback_base_url()
    if args.slice is not None:
        sdata = read_json(require_slice(args.slice) / "slice.json")
        kind, risk = sdata.get("kind"), sdata.get("risk")
        row, reason = slice_route(kind, risk, args.retry)
        lines, fallback = _dispatch_lines(row, routes, proxy)
        print(f"slice={args.slice}")
        print(f"phase={args.slice.split('.', 1)[0]}")
        print(f"kind={kind if kind not in (None, '') else 'unset'}")
        print(f"risk={risk if risk not in (None, '') else 'unset'}")
        print(f"attempt={2 if args.retry else 1}")
        print(f"route={row}")
        print(f"reason={reason}")
        print(f"subagent_type={installed_agent_name(ROUTE_AGENT[row])}")
        print("\n".join(lines))
        extra = [fallback] if fallback else []
    elif args.drafter or args.critic or args.judge or args.explore:
        row = "design" if args.drafter else "critic" if args.critic else "judge" if args.judge else "explore"
        agent = ROUTE_AGENT[row]
        skip = _judge_proxy_skip(routes, proxy) if row == "judge" else None
        lines, fallback = _dispatch_lines(row, routes, proxy)
        print(f"agent={agent}")
        print(f"route={row}")
        print(f"subagent_type={installed_agent_name(agent)}")
        print("\n".join(lines))
        extra = [fallback] if fallback else []
        if skip:
            extra.append(skip)
    else:
        table = [("route", "agent", "model", "effort", "source")] + [
            (row, ROUTE_AGENT[row], routes[row]["model"], routes[row]["effort"] or "(no effort line)", route_source(routes[row]))
            for row in EXECUTOR_ROUTES
        ]
        widths = [max(len(r[i]) for r in table) for i in range(4)]
        for r in table:
            print("  ".join(c.ljust(w) for c, w in zip(r, widths)) + "  " + r[4])
        drift, missing = executor_agent_drift(routes)
        stale = [shown(path) for path, _ in drift] + [f"{shown(path)} (missing)" for path in missing]
        if stale:
            print(f"agent files: out of sync: {', '.join(stale)} (run: {WORKFLOW_CMD} sync-agents)")
        else:
            print("agent files: in sync")
        extra = route_overrides(routes) + [f for f in (_route_fallback(row, routes, proxy)[2] for row in EXECUTOR_ROUTES) if f]
        judge_skip = _judge_proxy_skip(routes, proxy)
        if judge_skip:
            extra.append(judge_skip.replace("skip=yes ", "skip=judge ", 1))
        if proxy is None:
            extra.insert(0, "proxy=none")
        else:
            extra.insert(0, f"proxy={proxy} (loopback)")
    for line in extra + _route_env_warnings():
        print(line)


def cmd_record_dispatch(args: argparse.Namespace) -> None:
    """Append one `executor_dispatched` event to works/events.jsonl: the verdict a slice dispatch
    returned (v61). What a span ran on and what it cost is metered from Claude Code's transcripts by
    `dispatch-summary`, so the pre-v61 flags (route, model, effort, tier, agent and the notification's
    numbers) still parse and are ignored, named on one line. A record, nothing else: no state changes."""
    sdata = read_json(require_slice(args.slice) / "slice.json")
    ignored = [flag for flag, dest in _RECORD_DISPATCH_RETIRED if getattr(args, dest, None) is not None]
    if ignored:
        print(f"ignored: {' '.join(ignored)} (v61 meters spans from transcripts)")
    rec = {
        "slice": args.slice, "phase": sdata.get("phase_id") or args.slice.split(".", 1)[0],
        "kind": sdata.get("kind"), "risk": sdata.get("risk"),
        "attempt": args.attempt, "verdict": args.verdict, "note": args.note,
    }
    append_event("executor_dispatched", **rec)
    print("recorded=executor_dispatched")
    for key in ("slice", "attempt", "verdict"):
        print(f"{key}={rec[key]}")


_DISPATCH_VERDICTS = ("done", "escalate", "needs_operator", "blocked", "failed")
# The pre-v61 record-dispatch flags: still parsed (an old prompt or script keeps working), never stored.
_RECORD_DISPATCH_RETIRED = (("--route", "route"), ("--tier", "tier"), ("--agent", "agent"), ("--model", "model"),
                            ("--effort", "effort"), ("--duration-ms", "duration_ms"), ("--tokens", "tokens"),
                            ("--tool-uses", "tool_uses"))


def _dispatch_agg(records: list) -> dict:
    """Counts and sums over a group of executor_dispatched records. `tokens` is what pre-v61 records
    stored: the span's final context from the completion notification, not the volume it processed."""
    durs = [r["duration_ms"] for r in records if isinstance(r.get("duration_ms"), (int, float))]
    toks = [r["tokens"] for r in records if isinstance(r.get("tokens"), (int, float))]
    agg = {"n": len(records)}
    for v in _DISPATCH_VERDICTS:
        agg[v] = sum(1 for r in records if r.get("verdict") == v)
    agg["retries"] = sum(1 for r in records if isinstance(r.get("attempt"), int) and r["attempt"] >= 2)
    agg["mean_min"] = round(sum(durs) / len(durs) / 60000, 1) if durs else None
    agg["total_min"] = round(sum(durs) / 60000, 1) if durs else None
    agg["tokens"] = sum(toks) if toks else None
    return agg


def _dispatch_groups(records: list, keyfn, order=None) -> dict:
    groups: dict = {}
    for r in records:
        groups.setdefault(keyfn(r), []).append(r)
    keys = [k for k in order if k in groups] if order else sorted(groups, key=lambda k: (-len(groups[k]), str(k)))
    return {k: _dispatch_agg(groups[k]) for k in keys}


def _dispatch_table(title: str, groups: dict, cols: list) -> list:
    header = [title] + [c[0] for c in cols]
    rows = [header]
    for key, agg in groups.items():
        rows.append([str(key)] + [("-" if agg[c[1]] is None else str(agg[c[1]])) for c in cols])
    return _meter_columns(rows)


# ---------------------------------------------------------------------------------------------------
# The transcript meter (workspace v61). `dispatch-summary` -- and nothing else: no hook, no other
# command -- reads Claude Code's own session transcripts, `<config>/projects/<slug>/<session>.jsonl`
# (the main thread) and `<session>/subagents/agent-*.jsonl` + `.meta.json` (one file per span), and
# meters what each actually processed:
# - a request is an assistant entry, counted ONCE per `message.id` (else `requestId`): Claude Code
#   writes one entry per content block, the usage repeating with a growing `output_tokens`, so the
#   entry with the largest output is kept (the first undercounts output ~20x);
# - most subagent requests never log a final usage (`stop_reason` stays null, `output_tokens` 2-20):
#   those are counted per group (`no_final`), their output and $ are FLOORS (marked `>=`, never
#   estimated), the main thread's share is an upper bound, and context and cache are exact;
# - `message.model == "<synthetic>"` is an API error, not a request; when its text or error names a
#   usage / rate limit it is a limit hit, and a span whose LAST assistant entry is one ended on it;
# - cache writes split by `usage.cache_creation` into 5 m and 1 h (the main thread writes 1 h,
#   subagents 5 m); no split counts as 5 m;
# - context = input + cache read + cache write per request: volume processed, not window size.
# Spans go to slices by their first prompt (a `slice:` line, then a known slice id, then a design
# round address through its round.json), then by time; main-thread requests go by time into slice
# windows from `slice_status_changed` -- a slice's window runs from the previous slice's finish to its
# own finish, so planning time counts toward the slice it plans.
#
# List prices in $/MTok per model id: (input, 5 m cache write, 1 h cache write, cache read, output).
# Source: https://platform.claude.com/docs/en/about-claude/pricing (fetched 2026-10-20). A model not
# listed is never guessed: it is shown unpriced as `?`.
PRICES = {
    "claude-fable-5-1": (10.0, 12.5, 20.0, 0.25, 50.0),
    "claude-fable-5": (10.0, 12.5, 20.0, 1.0, 50.0),
    "claude-opus-5-5": (4.0, 5.0, 8.0, 0.20, 20.0),
    "claude-opus-5": (5.0, 6.25, 10.0, 0.50, 25.0),
    "claude-sonnet-5-5": (2.0, 2.5, 4.0, 0.10, 10.0),
    "claude-sonnet-5": (2.0, 2.5, 4.0, 0.20, 10.0),
    "claude-haiku-5-5": (0.10, 0.125, 0.20, 0.01, 0.50),
    "claude-haiku-4-5": (1.0, 1.25, 2.0, 0.10, 5.0),
}
# Priced by prompt length (same source): a request whose prompt -- input + cache read + cache write --
# is over the threshold pays the second row, cache hit or not.
PRICES_LONG_PROMPT = {"claude-haiku-5-5": (100_000, (0.50, 0.625, 1.0, 0.05, 2.50))}
METER_PRICES_SOURCE = "https://platform.claude.com/docs/en/about-claude/pricing, fetched 2026-10-20"
# Composed from the id block's patterns, so a tailed `P46-k2.S1` and a v73 `P-7kq2.S1` attribute beside `P12.S1`.
METER_SLICE_ID_RE = re.compile(rf"\b{PHASE_ID_PATTERN}\.{SLICE_SUFFIX_PATTERN}\b")
METER_SLICE_LINE_RE = re.compile(rf"(?im)^[\s>*`-]*slice[`*]*\s*:\s*[`*]*({PHASE_ID_PATTERN}\.[A-Za-z][A-Za-z0-9]*)")
METER_ROUND_RE = re.compile(r"\b(\d{2}-[a-z0-9][a-z0-9-]*)/(\d{2}-[a-z0-9][a-z0-9-]*)\b")
METER_LIMIT_RE = re.compile(r"(?i)\b(usage|rate|spend|session|weekly|monthly|daily|5-hour)\b[^.\n]{0,24}\blimit|\blimit (reached|exceeded)")
METER_RESET_RE = re.compile(r"(?i)\bresets?\s+(?:at\s+)?([^·\n]+?)\s*(?:·|$)")
METER_VERDICT_RE = re.compile(r"(?im)^[\s>*-]*[`*_]*(status|verdict)[`*_]*\s*:\s*[`*_]*([a-z][a-z_]*)")
METER_JUDGE_RE = re.compile(r"(?im)^\s*mode\s*:\s*judge\b")


def _meter_ts(value) -> "float | None":
    """An ISO-8601 timestamp (transcripts write `...Z`, events `+09:00`) as epoch seconds, else None."""
    if not isinstance(value, str) or not value:
        return None
    try:
        return datetime.fromisoformat(value[:-1] + "+00:00" if value.endswith("Z") else value).timestamp()
    except ValueError:
        return None


def _meter_price(model) -> "tuple | None":
    """The PRICES row for a transcript model id (a `[1m]` tag and a `-YYYYMMDD` date stripped), else None."""
    if not isinstance(model, str):
        return None
    mid = re.sub(r"-\d{8}$", "", re.sub(r"\[[^\]]*\]$", "", model.strip()))
    return PRICES.get(mid)


def _meter_new() -> dict:
    return {"requests": 0, "input": 0, "cache_read": 0, "cache_write_5m": 0, "cache_write_1h": 0,
            "output": 0, "cost": 0.0, "unpriced": 0, "limit_hits": 0, "no_final": 0}


def _meter_add(agg: dict, other: dict) -> dict:
    for k in agg:
        agg[k] += other.get(k, 0)
    return agg


def _meter_request(agg: dict, model, usage: dict, final: bool = True) -> None:
    """Add one deduplicated request's usage (and list-price cost) into `agg`. `final` = some entry of
    the request carried a stop_reason; without one its output (and so $) is a floor."""
    def num(v):
        return v if isinstance(v, (int, float)) else 0
    inp = num(usage.get("input_tokens"))
    cr = num(usage.get("cache_read_input_tokens"))
    cw = num(usage.get("cache_creation_input_tokens"))
    out = num(usage.get("output_tokens"))
    split = usage.get("cache_creation") if isinstance(usage.get("cache_creation"), dict) else {}
    w1h = num(split.get("ephemeral_1h_input_tokens"))
    w5 = num(split.get("ephemeral_5m_input_tokens"))
    w5 += max(cw - w1h - w5, 0)  # no split (or a short one): the rest is a 5 m write
    agg["requests"] += 1
    agg["no_final"] += 0 if final else 1
    agg["input"] += inp
    agg["cache_read"] += cr
    agg["cache_write_5m"] += w5
    agg["cache_write_1h"] += w1h
    agg["output"] += out
    price = _meter_price(model)
    if price is None:
        agg["unpriced"] += 1
        return
    long_prompt = PRICES_LONG_PROMPT.get(re.sub(r"-\d{8}$", "", re.sub(r"\[[^\]]*\]$", "", model.strip())))
    if long_prompt and inp + cr + w5 + w1h > long_prompt[0]:
        price = long_prompt[1]
    agg["cost"] += (inp * price[0] + w5 * price[1] + w1h * price[2] + cr * price[3] + out * price[4]) / 1e6


def _meter_text(content) -> str:
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        return "\n".join(x.get("text", "") for x in content if isinstance(x, dict) and x.get("type") == "text")
    return ""


def _meter_limit(entry: dict, text: str) -> bool:
    err = " ".join(str(entry.get(k) or "") for k in ("error", "apiError"))
    return bool(METER_LIMIT_RE.search(text)) or "limit" in err.lower()


def _meter_scan(path: Path, span: bool) -> dict:
    """One transcript file read once: its deduplicated requests and limit hits, and for a span its
    first prompt, resume count, final report and first / last timestamps. Unreadable lines are skipped."""
    reqs: dict = {}   # key -> [ts, model, usage, saw a stop_reason]
    limits: list = []  # (ts, reset text)
    out = {"reqs": reqs, "limits": limits, "prompt": None, "resumes": 0, "final": None, "first": None, "last": None,
           "last_limit": None, "models": {}}
    last_asst = None
    try:
        fh = path.open(encoding="utf-8", errors="replace")
    except OSError:
        return out
    with fh:
        for line in fh:
            try:
                d = json.loads(line)
            except ValueError:
                continue
            if not isinstance(d, dict):
                continue
            kind = d.get("type")
            if kind not in ("assistant", "user"):
                continue
            if not span and d.get("isSidechain") is True:
                continue  # an older transcript's inline sidechain: never the main thread's
            ts = _meter_ts(d.get("timestamp"))
            if span and ts is not None:
                out["first"] = ts if out["first"] is None else min(out["first"], ts)
                out["last"] = ts if out["last"] is None else max(out["last"], ts)
            msg = d.get("message") if isinstance(d.get("message"), dict) else {}
            if kind == "user":
                if not span or d.get("isCompactSummary"):
                    continue
                content = msg.get("content")
                if isinstance(content, list) and any(isinstance(x, dict) and x.get("type") == "tool_result" for x in content):
                    continue
                origin = d.get("origin") if isinstance(d.get("origin"), dict) else {}
                if origin.get("kind") == "coordinator":
                    out["resumes"] += 1  # a SendMessage from the orchestrator continuing this span
                elif not d.get("isMeta") and _meter_text(content).strip():
                    if out["prompt"] is None:
                        out["prompt"] = _meter_text(content)
                    else:
                        out["resumes"] += 1
                continue
            model = msg.get("model")
            if model == "<synthetic>":
                text = _meter_text(msg.get("content"))
                hit = _meter_limit(d, text)
                if hit:
                    m = METER_RESET_RE.search(text)
                    limits.append((ts, m.group(1).strip() if m else None))
                last_asst = ("limit", limits[-1][1]) if hit else ("synthetic", None)
                continue
            last_asst = ("request", None)
            if span:
                for block in msg.get("content") or []:
                    if not isinstance(block, dict):
                        continue
                    if block.get("type") == "text" and block.get("text", "").strip():
                        out["final"] = block["text"]
                    elif block.get("type") == "tool_use" and block.get("name") == "SubagentHandback":
                        inp = block.get("input") if isinstance(block.get("input"), dict) else {}
                        if isinstance(inp.get("message"), str):
                            out["final"] = inp["message"]
            usage = msg.get("usage")
            if not isinstance(usage, dict):
                continue
            key = msg.get("id") or d.get("requestId") or d.get("uuid")
            prev = reqs.get(key)
            final = msg.get("stop_reason") is not None
            if prev is None:
                reqs[key] = [ts, model, usage, final]
            else:
                prev[3] = prev[3] or final
                if (usage.get("output_tokens") or 0) > (prev[2].get("output_tokens") or 0):
                    prev[2] = usage
    if last_asst and last_asst[0] == "limit":
        out["last_limit"] = last_asst[1] or ""
    for _ts, model, _u, _f in reqs.values():
        out["models"][model] = out["models"].get(model, 0) + 1
    return out


def _meter_session_range(path: Path) -> tuple:
    """(first, last) timestamp of a session file from its head and its tail -- never a full read."""
    first = last = None
    try:
        with path.open("rb") as fh:
            for _ in range(200):
                line = fh.readline()
                if not line:
                    break
                try:
                    first = _meter_ts(json.loads(line).get("timestamp"))
                except (ValueError, AttributeError):
                    continue
                if first is not None:
                    break
            size = path.stat().st_size
            fh.seek(max(0, size - 1_048_576))
            for line in reversed(fh.read().splitlines()):
                try:
                    last = _meter_ts(json.loads(line).get("timestamp"))
                except (ValueError, AttributeError):
                    continue
                if last is not None:
                    break
    except OSError:
        return None, None
    if last is None:
        try:
            last = path.stat().st_mtime
        except OSError:
            pass
    return first, last if last is not None else first


def _meter_project_dirs(explicit) -> tuple:
    """(project dirs to read, how they were found). `--transcripts` overrides discovery; otherwise the
    session root's slug under `${CLAUDE_CONFIG_DIR:-~/.claude}/projects/`, plus its worktree sessions'."""
    if explicit:
        return [Path(p).expanduser() for p in explicit], "--transcripts"
    base = Path(os.environ.get("CLAUDE_CONFIG_DIR") or "~/.claude").expanduser() / "projects"
    slug = re.sub(r"[^A-Za-z0-9]", "-", str(HOST_ROOT or ROOT))
    dirs = []
    if base.is_dir():
        for d in sorted(base.iterdir()):
            if d.is_dir() and (d.name == slug or d.name.startswith(slug + "--claude-worktrees-")):
                dirs.append(d)
    return dirs, str(base / slug)


def _meter_known_slices(events: list) -> tuple:
    """({slice id: kind or None}) from the phase folders (active and archived) and the events."""
    kinds: dict = {}
    for root in (ACTIVE, ARCHIVED):
        if not root.is_dir():
            continue
        for sj in root.glob("*/slices/*/slice.json"):
            try:
                kinds[sj.parent.name] = read_json(sj).get("kind")
            except (OSError, ValueError):
                kinds.setdefault(sj.parent.name, None)
    for ev in events:
        sid = ev.get("slice")
        if isinstance(sid, str) and sid:
            if kinds.get(sid) is None and ev.get("kind"):
                kinds[sid] = ev.get("kind")
            kinds.setdefault(sid, None)
    return kinds


class _MeterWindows:
    """Slice windows from `slice_status_changed`: each finished slice owns (previous finish, own finish];
    the first finished slice starts at its own start; after the last finish, the latest-started open
    slice owns the time. `at(t)` is the slice id, or None outside every window."""

    def __init__(self, events: list):
        st: dict = {}
        for ev in events:
            if ev.get("type") != "slice_status_changed" or not isinstance(ev.get("slice"), str):
                continue
            t = _meter_ts(ev.get("ts"))
            if t is None:
                continue
            s = st.setdefault(ev["slice"], {"start": None, "done": None, "status": None})
            if ev.get("new_status") == "in_progress" and s["start"] is None:
                s["start"] = t
            if ev.get("new_status") == "done":
                s["done"] = t
            s["status"] = ev.get("new_status")
        self.finished = sorted((s["done"], sid) for sid, s in st.items() if s["status"] == "done" and s["done"] is not None)
        self.ends = [f for f, _ in self.finished]
        self.open = sorted((s["start"], sid) for sid, s in st.items() if s["status"] != "done" and s["start"] is not None)
        self.first_start = None
        if self.finished:
            s0 = st[self.finished[0][1]]["start"]
            self.first_start = s0 if s0 is not None else self.finished[0][0]
        self.bounds: dict = {}
        prev = self.first_start
        for end, sid in self.finished:
            self.bounds[sid] = (prev, end)
            prev = end
        # The open slices that own the time after the last finish: those started since it (a slice
        # left open long before is stale), else every open one.
        last = self.ends[-1] if self.ends else float("-inf")
        self.current = [(start, sid) for start, sid in self.open if start >= last] or self.open
        for start, sid in self.current:
            self.bounds[sid] = (self.ends[-1] if self.ends else start, None)

    def at(self, t) -> "str | None":
        if t is None:
            return None
        i = bisect.bisect_left(self.ends, t)
        if i < len(self.ends):
            if i == 0 and self.first_start is not None and t < self.first_start:
                return None
            return self.finished[i][1]
        if not self.current:
            return None
        live = [sid for start, sid in self.current if start <= t]
        return live[-1] if live else self.current[0][1]  # before its start-slice: planning it


def _meter_round_slice(job: str, rnd: str) -> "str | None":
    """The slice a design round belongs to: its round.json `slice`, else its job.json `slice`."""
    jobs = ROOT / DESIGN_ROOT_REL / "jobs" / job
    for path in (jobs / "rounds" / rnd / "round.json", jobs / "job.json"):
        try:
            sid = read_json(path).get("slice")
        except (OSError, ValueError, AttributeError):
            continue
        if isinstance(sid, str) and sid:
            return sid
    return None


def _meter_attribute(prompt: str, start, known: dict, windows: _MeterWindows) -> tuple:
    """(slice id or 'unattributed', how) for a span from its first prompt, then its start time."""
    prompt = prompt or ""
    m = METER_SLICE_LINE_RE.search(prompt)
    if m:
        return m.group(1), "slice-line"
    for sid in METER_SLICE_ID_RE.findall(prompt):
        if sid in known:
            return sid, "named"
    for job, rnd in METER_ROUND_RE.findall(prompt):
        sid = _meter_round_slice(job, rnd)
        if sid:
            return sid, "round"
    sid = windows.at(start)
    if sid:
        return sid, "window"
    return "unattributed", "none"


def _meter_slice_families() -> tuple:
    """(high row's model family, mid row's, high row's effort, mid row's) from the resolved route
    table, for reading `slice-executor` spans; the engine defaults when executors.toml cannot be read."""
    try:
        routes = resolve_routes()
    except (SystemExit, Exception):  # noqa: BLE001 - the meter reads history; a bad toml must not stop it
        routes = resolve_routes({})
    return (model_family(routes["high"]["model"]), model_family(routes["mid"]["model"]),
            routes["high"]["effort"], routes["mid"]["effort"])


def _meter_route(agent: str, prompt: str, model, kind, families=None, effort=None) -> str:
    """The route row a span most likely ran on, for the means: the agent type, the judge mode, the
    slice kind (research) and the model. Approximate by nature, and more so for the one
    `slice-executor` (v66), which every slice row runs: a research kind reads as research, review,
    decomposition and co-work as high (they route there by kind), a haiku model as cheap (the row v83
    retired: old spans keep the label), a model of
    the high row's family (and not the mid row's, `families`) as high; when the two rows share a family
    (opus at v80's defaults) the span's recorded effort tells them apart; anything else reads as mid.
    The retired pair (v23-v65, still in old transcripts) keeps its reading: slice-executor-high is
    research by kind, else high; slice-executor-mid is cheap on haiku, else mid. Other agents keep their name."""
    if agent == "design-drafter":
        return "design"
    if agent == "design-critic":
        return "judge" if METER_JUDGE_RE.search(prompt or "") else "critic"
    if agent == "Explore":
        return "explore"
    if agent == "slice-executor-high":
        return "research" if kind == "research" else "high"
    if agent == "slice-executor-mid":
        return "cheap" if isinstance(model, str) and "haiku" in model else "mid"
    if agent == SLICE_AGENT:
        if kind == "research":
            return "research"
        if kind in ("review", "decomposition", "co-work"):
            return "high"
        family = model_family(model) if isinstance(model, str) else None
        if family == "haiku":
            return "cheap"
        high, mid, high_effort, mid_effort = families if families is not None else _meter_slice_families()
        if not family or family != high:
            return "mid"
        if family != mid:
            return "high"
        return "high" if effort and effort == high_effort and effort != mid_effort else "mid"
    return agent or "?"


def _meter_verdict(agent: str, final) -> str:
    """The `status:` line (design spans: `verdict:` first) of a span's final report, else `?`."""
    found = {}
    for key, value in METER_VERDICT_RE.findall(final or ""):
        found.setdefault(key.lower(), value.lower())
    if agent.startswith("design-") and "verdict" in found:
        return found["verdict"]
    return found.get("status") or found.get("verdict") or "?"


def _meter_collect(dirs: list, known: dict, windows: "_MeterWindows", selected, lo, hi) -> dict:
    """Read the sessions overlapping [lo, hi] (None = unbounded) and meter them. `selected(slice)` says
    whether a slice is in the report; everything else is `before`, `after` or `other`."""
    canon = {installed_agent_name(a): a for a in (*ROUTE_AGENT.values(), *RETIRED_AGENTS)}
    canon.update({f"wf-{a}": a for a in RETIRED_AGENTS})  # a nested rename the marker no longer records
    families = _meter_slice_families()
    res = {"sessions": [], "main": {}, "spans": [], "outside": {}, "found": 0, "windows": windows, "kinds": known}
    for d in dirs:
        for path in sorted(d.glob("*.jsonl")):
            res["found"] += 1
            first, last = _meter_session_range(path)
            if first is None or (lo is not None and last is not None and last < lo) or (hi is not None and first > hi):
                continue
            sess = {"session": path.stem, "dir": d.name, "first": first, "last": last, "main": _meter_new(), "spans": 0}
            scan = _meter_scan(path, span=False)
            for ts, model, usage, final in scan["reqs"].values():
                if model == "<synthetic>":
                    continue
                one = _meter_new()
                _meter_request(one, model, usage, final)
                _meter_add(sess["main"], one)
                _meter_main_bucket(res, windows.at(ts), ts, selected, lo, hi, one)
            for ts, _reset in scan["limits"]:
                one = _meter_new()
                one["limit_hits"] = 1
                _meter_add(sess["main"], one)
                _meter_main_bucket(res, windows.at(ts), ts, selected, lo, hi, one)
            for jl in sorted((path.parent / path.stem / "subagents").glob("agent-*.jsonl")):
                meta = {}
                mp = jl.with_name(jl.name[:-len(".jsonl")] + ".meta.json")
                if mp.exists():
                    try:
                        meta = json.loads(mp.read_text(encoding="utf-8"))
                    except (OSError, ValueError):
                        meta = {}
                sp = _meter_scan(jl, span=True)
                agent = canon.get(meta.get("agentType"), meta.get("agentType") or "?")
                sid, how = _meter_attribute(sp["prompt"], sp["first"], known, windows)
                agg = _meter_new()
                for _ts, model, usage, final in sp["reqs"].values():
                    if model != "<synthetic>":
                        _meter_request(agg, model, usage, final)
                agg["limit_hits"] = len(sp["limits"])
                model = meta.get("model") or (max(sp["models"], key=sp["models"].get) if sp["models"] else None)
                if sp["last_limit"] is not None:
                    outcome = "limit"
                elif meta and meta.get("finished") is not True:
                    outcome = "running"
                else:
                    outcome = _meter_verdict(agent, sp["final"])
                minutes = round((sp["last"] - sp["first"]) / 60, 1) if sp["first"] is not None and sp["last"] is not None else None
                span = {"id": jl.stem[len("agent-"):], "session": path.stem, "agent": agent, "model": model,
                        "effort": meta.get("effort"), "route": _meter_route(agent, sp["prompt"], model, known.get(sid), families, meta.get("effort")),
                        "slice": sid, "attributed_by": how, "start": sp["first"], "minutes": minutes,
                        "resumes": sp["resumes"], "outcome": outcome, "reset": sp["last_limit"] or None,
                        "usage": agg}
                sess["spans"] += 1
                if selected(sid):
                    res["spans"].append(span)
            res["sessions"].append(sess)
    return res


def _meter_main_bucket(res: dict, sid, ts, selected, lo, hi, one: dict) -> None:
    """One main-thread request into its slice's row, else `before` / `after` the selected windows, or
    `other` (inside them, in another stream's slice)."""
    if sid is not None and selected(sid) and sid != "unattributed":
        _meter_add(res["main"].setdefault(sid, _meter_new()), one)
        return
    lo = lo if lo is not None else res["windows"].first_start
    where = "before" if (lo is not None and ts is not None and ts < lo) else "after" if (hi is None or ts is None or ts > hi) else "other"
    _meter_add(res["outside"].setdefault(where, _meter_new()), one)


def _meter_ctx(agg: dict) -> int:
    return agg["input"] + agg["cache_read"] + agg["cache_write_5m"] + agg["cache_write_1h"]


def _meter_tok(n) -> str:
    if n >= 1e6:
        return f"{n / 1e6:.2f}M"
    if n >= 1e3:
        return f"{n / 1e3:.1f}k"
    return str(int(n))


def _meter_cost(agg: dict) -> str:
    if agg["requests"] and agg["unpriced"] == agg["requests"]:
        return "?"
    return f"{agg['cost']:.2f}" + ("+?" if agg["unpriced"] else "")


def _meter_fl(agg: dict) -> str:
    """`>=` for a group with requests that never logged a final usage: its output and $ are floors."""
    return "≥" if agg.get("no_final") else ""


def _meter_out(agg: dict) -> str:
    return _meter_fl(agg) + _meter_tok(agg["output"])


def _meter_usd(agg: dict) -> str:
    c = _meter_cost(agg)
    return c if c.startswith("?") else _meter_fl(agg) + c


def _meter_flagged(agg: dict) -> dict:
    """A copy of a usage group for --json, with `output_floor` true when its output and $ are floors."""
    return {**agg, "output_floor": bool(agg.get("no_final"))}


def _meter_columns(rows: list) -> list:
    widths = [max(len(r[i]) for r in rows) for i in range(len(rows[0]))]
    return ["  ".join(c.ljust(w) if i == 0 else c.rjust(w) for i, (c, w) in enumerate(zip(r, widths))).rstrip() for r in rows]


def _meter_row(label: str, n, agg: dict, minutes=None, verdicts: str = "") -> list:
    return [label, "-" if n is None else str(n), str(agg["requests"]), _meter_tok(_meter_ctx(agg)), _meter_out(agg),
            _meter_usd(agg), "-" if minutes is None else f"{minutes:.1f}", str(agg["limit_hits"]), verdicts or "-"]


_METER_HEAD = ["row", "n", "requests", "context", "output", "$", "min", "limits", "verdicts"]


def _meter_report(res: dict, slices: list) -> dict:
    """The per-slice rows, the per-phase totals and the means, as plain data (the --json body)."""
    by_slice: dict = {}
    for sid in slices:
        by_slice[sid] = {"main": res["main"].get(sid, _meter_new()), "spans": [s for s in res["spans"] if s["slice"] == sid]}
    unattributed = [s for s in res["spans"] if s["slice"] not in by_slice]
    phases: dict = {}
    for sid, row in by_slice.items():
        ph = phases.setdefault(sid.split(".", 1)[0], {"main": _meter_new(), "by_agent": {}, "span_total": _meter_new()})
        _meter_add(ph["main"], row["main"])
        for s in row["spans"]:
            _meter_add(ph["by_agent"].setdefault(s["agent"], _meter_new()), s["usage"])
            _meter_add(ph["span_total"], s["usage"])
    for s in unattributed:
        ph = phases.setdefault("unattributed", {"main": _meter_new(), "by_agent": {}, "span_total": _meter_new()})
        _meter_add(ph["by_agent"].setdefault(s["agent"], _meter_new()), s["usage"])
        _meter_add(ph["span_total"], s["usage"])
    # means: per route (per span) and per slice kind (per slice, main thread included)
    routes: dict = {}
    for s in res["spans"]:
        r = routes.setdefault(s["route"], {"spans": 0, "minutes": 0.0, "cost": 0.0, "unpriced": 0})
        r["spans"] += 1
        r["minutes"] += s["minutes"] or 0.0
        r["cost"] += s["usage"]["cost"]
        r["unpriced"] += s["usage"]["unpriced"]
    kinds: dict = {}
    for sid, row in by_slice.items():
        if not row["spans"] and not row["main"]["requests"]:
            continue
        k = kinds.setdefault(res["kinds"].get(sid) or "unset", {"slices": 0, "spans": 0, "minutes": 0.0, "cost": 0.0})
        k["slices"] += 1
        k["spans"] += len(row["spans"])
        k["minutes"] += sum(s["minutes"] or 0.0 for s in row["spans"])
        k["cost"] += row["main"]["cost"] + sum(s["usage"]["cost"] for s in row["spans"])
    means = {
        "by_route": {r: {"spans": v["spans"], "min_per_span": round(v["minutes"] / v["spans"], 1),
                         "usd_per_span": round(v["cost"] / v["spans"], 2), "unpriced_requests": v["unpriced"]}
                     for r, v in sorted(routes.items(), key=lambda kv: (METER_ROUTES.index(kv[0]) if kv[0] in METER_ROUTES else 99, kv[0]))},
        "by_kind": {k: {"slices": v["slices"], "spans_per_slice": round(v["spans"] / v["slices"], 1),
                        "span_min_per_slice": round(v["minutes"] / v["slices"], 1), "usd_per_slice": round(v["cost"] / v["slices"], 2)}
                    for k, v in sorted(kinds.items())},
    }
    return {"slices": by_slice, "unattributed": unattributed, "phases": phases, "means": means}


def _meter_floor_note(res: dict):
    """The one `note=` line saying which requests never logged a final usage (None when none lack it)."""
    sp = [0, 0]
    for s in res["spans"]:
        sp[0] += s["usage"]["no_final"]
        sp[1] += s["usage"]["requests"]
    mn = [sum(v["no_final"] for v in res["main"].values()), sum(v["requests"] for v in res["main"].values())]
    if not sp[0] and not mn[0]:
        return None
    pct = f" ({100 * sp[0] / sp[1]:.0f}%)" if sp[1] else ""
    return (f"output_floor spans={sp[0]}/{sp[1]}{pct} main={mn[0]}/{mn[1]} — these requests never logged a final "
            "usage: their output and $ are floors (≥); context and cache are exact; the main thread's share is an upper bound")


def _meter_floor_json(res: dict) -> dict:
    sp_n = sum(s["usage"]["requests"] for s in res["spans"])
    sp_f = sum(s["usage"]["no_final"] for s in res["spans"])
    mn_n = sum(v["requests"] for v in res["main"].values())
    mn_f = sum(v["no_final"] for v in res["main"].values())
    return {"spans": {"requests": sp_n, "no_final": sp_f, "floor": sp_f > 0},
            "main": {"requests": mn_n, "no_final": mn_f, "floor": mn_f > 0},
            "note": _meter_floor_note(res)}


def _meter_print(res: dict, rep: dict, dirs: list) -> None:
    def hhmm(t):
        return datetime.fromtimestamp(t).astimezone().strftime("%Y-%m-%d %H:%M") if t else "-"
    print(f"transcripts={','.join(str(d) for d in dirs)}")
    print(f"sessions_read={len(res['sessions'])} of {res['found']}  spans={len(res['spans'])}")
    for s in res["sessions"]:
        m = s["main"]
        print(f"  session {s['session'][:8]} {hhmm(s['first'])} -> {hhmm(s['last'])}  main requests={m['requests']} "
              f"context={_meter_tok(_meter_ctx(m))} output={_meter_out(m)} ${_meter_usd(m)} limits={m['limit_hits']}  spans={s['spans']}")
    for pid, ph in rep["phases"].items():
        total = _meter_add(_meter_add(_meter_new(), ph["main"]), ph["span_total"])
        if not total["requests"] and not total["limit_hits"]:
            continue  # a phase none of the sessions read worked on
        rows = [["group", "requests", "context", "cache_read", "cache_write", "output", "$", "share"]]

        def line(label, agg):
            share = f"{100 * agg['cost'] / total['cost']:.0f}%" if total["cost"] else "-"
            if share != "-" and total["no_final"] and agg is not total:
                # the missing output sits in the spans: their share is a floor, the main thread's an upper bound
                share = ("≥" if agg["no_final"] else "≤" if agg is ph["main"] else "") + share
            return [label, str(agg["requests"]), _meter_tok(_meter_ctx(agg)), _meter_tok(agg["cache_read"]),
                    _meter_tok(agg["cache_write_5m"] + agg["cache_write_1h"]), _meter_out(agg), _meter_usd(agg), share]
        rows.append(line("main thread", ph["main"]))
        rows.append(line("spans", ph["span_total"]))
        for agent, agg in sorted(ph["by_agent"].items(), key=lambda kv: -kv[1]["cost"]):
            rows.append(line(f"  {agent}", agg))
        rows.append(line("total", total))
        print()
        print(f"[{pid}: main thread beside spans]")
        print("\n".join(_meter_columns(rows)))
    for sid, row in rep["slices"].items():
        if not row["spans"] and not row["main"]["requests"]:
            continue
        b = res["windows"].bounds.get(sid)
        window = f"  window {hhmm(b[0])} -> {hhmm(b[1]) if b[1] else 'open'}" if b else ""
        rows = [_METER_HEAD, _meter_row("main", None, row["main"])]
        groups: dict = {}
        for s in row["spans"]:
            label = s["agent"] + ("/judge" if s["route"] == "judge" else "")
            groups.setdefault(label, []).append(s)
        for label, spans in groups.items():
            agg = _meter_new()
            for s in spans:
                _meter_add(agg, s["usage"])
            outcomes: dict = {}
            for s in spans:
                outcomes[s["outcome"]] = outcomes.get(s["outcome"], 0) + 1
            verdicts = " ".join(f"{k}={v}" for k, v in sorted(outcomes.items()))
            resumes = sum(s["resumes"] for s in spans)
            if resumes:
                verdicts += f" resumes={resumes}"
            resets = [s["reset"] for s in spans if s["outcome"] == "limit" and s["reset"]]
            if resets:
                verdicts += f" (resets {resets[-1]})"
            rows.append(_meter_row(label, len(spans), agg, sum(s["minutes"] or 0.0 for s in spans), verdicts))
        print()
        print(f"[{sid}] {res['kinds'].get(sid) or ''}{window}")
        print("\n".join(_meter_columns(rows)))
    if rep["unattributed"]:
        print()
        print(f"[unattributed spans] {len(rep['unattributed'])}: " + ", ".join(f"{s['agent']} {s['id'][:8]}" for s in rep["unattributed"]))
    if res["outside"]:
        print()
        print("[main thread outside the selected windows, in the sessions read]")
        rows = [_METER_HEAD] + [_meter_row(k, None, v) for k, v in res["outside"].items()]
        print("\n".join(_meter_columns(rows)))
    means = rep["means"]
    if means["by_route"] or means["by_kind"]:
        print()
        print("[means] (metered; a DECOMP estimates time from these)")
        rows = [["route", "spans", "min/span", "$/span"]] + [
            [r, str(v["spans"]), f"{v['min_per_span']:.1f}", f"{v['usd_per_span']:.2f}" + ("+?" if v["unpriced_requests"] else "")]
            for r, v in means["by_route"].items()]
        print("\n".join(_meter_columns(rows)))
        rows = [["kind", "slices", "spans/slice", "span-min/slice", "$/slice"]] + [
            [k, str(v["slices"]), f"{v['spans_per_slice']:.1f}", f"{v['span_min_per_slice']:.1f}", f"{v['usd_per_slice']:.2f}"]
            for k, v in means["by_kind"].items()]
        print("\n".join(_meter_columns(rows)))
    print()
    floor = _meter_floor_note(res)
    if floor:
        print(f"note={floor}")
    for note in _METER_NOTES:
        print(f"note={note}")


_METER_NOTES = (
    "context = input + cache read + cache write per request (volume processed, not window size); "
    "one request per message id, its largest output kept; <synthetic> API errors are not requests",
    f"$ = list price per model (PRICES: {METER_PRICES_SOURCE}); ? = a model PRICES does not list, never guessed",
    "compaction summaries are not in the transcript and are not counted: a main thread that compacted cost "
    "somewhat more than shown",
    "min = a span's first to last entry, wall clock (a limit wait included); limits = usage-limit hits; "
    "running = a span whose .meta.json lacks finished: true",
)


def cmd_dispatch_summary(args: argparse.Namespace) -> None:
    """What a phase really cost: the main thread beside its subagent spans, metered from Claude Code's
    transcripts (deduplicated, attributed to slices, priced at list price), then the recorded
    executor_dispatched verdicts. Read-only; no transcripts found is one line, never a failure."""
    records: list = []
    events: list = []
    skipped = 0
    ev = WORKS / "events.jsonl"
    if ev.exists():
        for line in ev.read_text(encoding="utf-8", errors="replace").splitlines():
            if not line.strip():
                continue
            try:
                obj = json.loads(line)
            except ValueError:
                skipped += 1
                continue
            if not isinstance(obj, dict):
                continue
            events.append(obj)
            if obj.get("type") == "executor_dispatched":
                records.append(obj)
    if args.phase is not None:
        known = (ACTIVE / args.phase).is_dir() or any(r.get("phase") == args.phase for r in records) \
            or args.phase in archived_phase_ids()  # an archived folder is `<stamp>_<id>_<slug>`: the old glob never matched it
        if not known:
            raise SystemExit(f"dispatch-summary: no such phase: {args.phase}")
        records = [r for r in records if r.get("phase") == args.phase]
    if args.slice is not None:
        if not any(r.get("slice") == args.slice for r in records) and not (ACTIVE / args.slice.split(".", 1)[0] / "slices" / args.slice).is_dir():
            raise SystemExit(f"dispatch-summary: no such slice: {args.slice}")
        records = [r for r in records if r.get("slice") == args.slice]

    # --- metered, from the transcripts ---
    dirs, where = _meter_project_dirs(args.transcripts)
    dirs = [d for d in dirs if d.is_dir()]
    windows = _MeterWindows(events)
    known = _meter_known_slices(events)
    if args.slice is not None:
        slices = [args.slice]
    else:
        slices = [s for s in sorted(known, key=_meter_slice_order(windows)) if args.phase is None or s.split(".", 1)[0] == args.phase]
    selected_set = set(slices)
    lo = hi = None
    if args.phase is not None or args.slice is not None:
        bounds = [windows.bounds[s] for s in slices if s in windows.bounds]
        lo = min((b[0] for b in bounds if b[0] is not None), default=None)
        hi = None if any(b[1] is None for b in bounds) else max((b[1] for b in bounds), default=None)
        if not bounds:
            lo = hi = float("inf")  # never worked on: no session can overlap
    metered = None
    if dirs:
        everything = args.phase is None and args.slice is None
        res = _meter_collect(dirs, known, windows, lambda s: everything or s in selected_set or s == "unattributed", lo, hi)
        if args.phase is None and args.slice is None:
            slices = sorted(set(slices) | set(res["main"]) | {s["slice"] for s in res["spans"] if s["slice"] != "unattributed"},
                            key=_meter_slice_order(windows))
        rep = _meter_report(res, slices)
        metered = (res, rep)
    if args.json:
        body = {"records": len(records)}
        if metered:
            res, rep = metered
            body["metered"] = {
                "transcripts": [str(d) for d in dirs], "sessions_found": res["found"],
                "sessions": [{k: v for k, v in s.items()} for s in res["sessions"]],
                "slices": {sid: {"main": _meter_flagged(row["main"]),
                                 "spans": [{**s, "usage": _meter_flagged(s["usage"])} for s in row["spans"]]}
                           for sid, row in rep["slices"].items()},
                "unattributed": [{**s, "usage": _meter_flagged(s["usage"])} for s in rep["unattributed"]],
                "phases": {pid: {"main": _meter_flagged(ph["main"]), "span_total": _meter_flagged(ph["span_total"]),
                                 "by_agent": {a: _meter_flagged(g) for a, g in ph["by_agent"].items()}}
                           for pid, ph in rep["phases"].items()},
                "outside": {k: _meter_flagged(v) for k, v in res["outside"].items()},
                "output_floor": _meter_floor_json(res),
                "means": rep["means"], "prices_source": METER_PRICES_SOURCE, "notes": list(_METER_NOTES)}
        else:
            body["metered"] = None
            body["transcripts"] = f"none found under {where}"
    else:
        if metered:
            _meter_print(metered[0], metered[1], dirs)
        else:
            print(f"transcripts=none found under {where} (pass --transcripts <projects/slug dir>); recorded verdicts only")
        print()
        print("[recorded verdicts] (executor_dispatched; tokens = a pre-v61 record's final context, not volume)")

    # --- recorded verdicts (executor_dispatched) ---
    legacy = [r for r in records if r.get("route")]
    by_route = _dispatch_groups(legacy, lambda r: r.get("route") or "?", order=METER_ROUTES)
    by_model = _dispatch_groups(legacy, lambda r: f"{r.get('model') or '?'} @ {r.get('effort') or '(none)'}")
    by_kind = _dispatch_groups(records, lambda r: r.get("kind") or "unset")
    if args.json:
        body.update({"by_route": by_route, "by_model_effort": by_model, "by_kind": by_kind, "skipped_lines": skipped})
        print(json.dumps(body, ensure_ascii=False, indent=2))
        return
    phases = sort_phase_ids({r.get("phase") for r in records if r.get("phase")}, _phase_created_records())
    stamps = [r.get("ts") for r in records if r.get("ts")]
    print(f"records={len(records)}")
    if not records:
        if skipped:
            print(f"skipped_lines={skipped}")
        print(f"hint=record a slice dispatch's verdict with: {WORKFLOW_CMD} record-dispatch <slice_id> --verdict …")
        return
    print(f"phases={','.join(phases)}")
    print(f"since={stamps[0] if stamps else '-'}")
    print(f"until={stamps[-1] if stamps else '-'}")
    if skipped:
        print(f"skipped_lines={skipped}")
    if args.slice is not None:
        for r in records:
            print(f"attempt={r.get('attempt')} verdict={r.get('verdict')} route={r.get('route') or '-'} model={r.get('model') or '-'} "
                  f"effort={r.get('effort') or '(none)'} duration_ms={r.get('duration_ms')} tokens={r.get('tokens')} ts={r.get('ts')}")
        return
    full = [("n", "n"), ("done", "done"), ("escalate", "escalate"), ("needs_op", "needs_operator"), ("blocked", "blocked"),
            ("failed", "failed"), ("retries", "retries"), ("mean_min", "mean_min"), ("total_min", "total_min"), ("final_ctx", "tokens")]
    short = [("n", "n"), ("done", "done"), ("escalate", "escalate"), ("needs_op", "needs_operator"), ("blocked", "blocked"),
             ("failed", "failed"), ("retries", "retries")]
    tables = [("by kind", "kind", by_kind, short)]
    if legacy:
        tables = [("by route, pre-v61 records", "route", by_route, full),
                  ("by model @ effort, pre-v61 records", "model @ effort", by_model, full)] + tables
    for label, title, groups, cols in tables:
        print()
        print(f"[{label}]")
        print("\n".join(_dispatch_table(title, groups, cols)))


def _phase_created_records() -> list:
    """`[{id, created_at}]` of every active and archived phase: what `id_sort_key` needs to order minted ids
    (an archived phase is read from its `phase.json`); an unreadable file is skipped."""
    out = []
    for root in (ACTIVE, ARCHIVED):
        for pj in (root.glob("*/phase.json") if root.is_dir() else []):
            try:
                data = read_json(pj)
            except (OSError, ValueError):
                continue
            if isinstance(data, dict) and isinstance(data.get("id"), str):
                out.append({"id": data["id"], "created_at": data.get("created_at")})
    return out


def _meter_slice_order(windows: "_MeterWindows"):
    """A sort key for slice ids: the phase by `id_sort_key` (numbers first, minted ids after by creation; a
    slice of no known phase last), then the order they were worked (window end, an open window last), then
    never-worked slices by name."""
    created = {p["id"]: p["created_at"] for p in _phase_created_records()}

    def key(sid: str) -> tuple:
        pid = sid.split(".", 1)[0] if "." in sid else ""
        b = windows.bounds.get(sid)
        when = (0, b[1]) if b and b[1] is not None else (1, b[0] or 0.0) if b else (2, 0.0)
        return (id_sort_key(pid, created.get(pid)) if PHASE_ID_RE.fullmatch(pid) else (3, "", ""), when, sid)
    return key


def doc_index() -> dict:
    return read_json(DOCS / "index.json")


def write_doc_index(index: dict) -> None:
    write_json_stamped(DOCS / "index.json", index, "last_rebuilt_at", now_iso())


def rebuild_docs() -> None:
    index = doc_index()
    for doc_id, info in index.get("docs", {}).items():
        latest = next((v for v in info.get("versions", []) if v["id"] == info.get("latest")), None)
        if not latest:
            raise SystemExit(f"latest version missing in docs/index.json for {doc_id}")
        src = ROOT / latest["path"]
        if not src.exists():
            raise SystemExit(f"latest doc file missing: {latest['path']}")
        write_text(ROOT / info["current_path"], src.read_text(encoding="utf-8"))
    write_doc_index(index)


def next_doc_version_id(doc_id: str, index: dict) -> tuple:
    """`("v<yyMMddHHmm>", number)`: the next version of one doc, named by its UTC minute (v73).

    The version NUMBER stays the digits after `v`, per doc -- unique and strictly increasing -- and a
    name is now the minute the version was made, so two branches that each version a doc never pick
    the same `max + 1`. When the doc's highest number is not below this minute (a second version in
    the same minute, or a clock behind a teammate's) the new one takes the minute after it, so a name
    stays a valid minute and always sorts above every older one, `v0001`-`v0043` included. Two
    branches versioning one doc in one minute is an accepted risk (`validate` fails loudly on it)."""
    nums = []
    for v in index["docs"][doc_id].get("versions", []):
        m = re.match(r"v(\d+)", v["id"])
        if m:
            nums.append(int(m.group(1)))
    top = max(nums, default=0)
    num = int(datetime.now(timezone.utc).strftime("%y%m%d%H%M"))
    if num <= top:
        try:
            num = int((datetime.strptime(f"{top:010d}", "%y%m%d%H%M") + timedelta(minutes=1)).strftime("%y%m%d%H%M"))
        except ValueError:  # a highest number that is not a minute (hand-written): just step past it
            num = top + 1
        num = max(num, top + 1)
    return f"v{num:04d}", num


def head_commit() -> str:
    """The current HEAD sha, or "" where git cannot answer -- the provenance half of a doc's
    last-updated marker.

    Best effort and NEVER fatal: the engine has to keep working in a tarball copy, a fresh
    unpushed install or any checkout without git, so every failure (missing binary, not a repo,
    an empty repo with no commit yet, a timeout) records nothing instead of raising. Honest
    semantics: this is the commit the version was *created at* -- the version file itself lands
    in a later commit -- so the sha is provenance, while `created_at` and `source` are the
    staleness keys a reader actually judges by.

    Nested install: the HOST's HEAD -- the product state the doc describes -- never the nested
    repo's, which only holds workflow state. The same helper stamps a nested phase's host anchors.
    """
    try:
        proc = subprocess.run(["git", "rev-parse", "HEAD"], cwd=str(HOST_ROOT or ROOT), capture_output=True, text=True, timeout=10)
    except Exception:  # noqa: BLE001 - git is optional; a doc version must still be writable without it
        return ""
    sha = proc.stdout.strip()
    return sha if proc.returncode == 0 and re.fullmatch(r"[0-9a-f]{7,40}", sha) else ""


def doc_marker(version: dict) -> str:
    """One doc version's last-updated marker: when it was written, which slice consolidated it,
    and the commit it was written at -- the line `docs` prints under every doc.

    `commit` arrived in v39, so its two absences are reported differently and honestly: a key that
    is *missing* predates the field (pre-v39, and never backfilled -- a backfilled sha would mean
    "the commit that last touched the file", a different fact wearing the same name), while a key
    that is `null` means the write happened where git could not be read. Neither is an error.
    """
    if "commit" in version:
        sha = version.get("commit")
        commit = str(sha)[:12] if sha else "unknown (no git at write time)"
    else:
        commit = "unknown (pre-v39)"
    return f"updated={str(version.get('created_at', ''))[:10]} source={version.get('source') or 'unknown'} commit={commit}"


def new_doc_version(args: argparse.Namespace) -> None:
    doc_id = args.doc
    if doc_id in RETIRED_DOCS:
        kept = f"; {shown_rel(f'docs/current/{doc_id}.md')} stays readable as it is" if (DOCS / "current" / f"{doc_id}.md").exists() else ""
        raise SystemExit(f"{doc_id} is a retired doc (v79), never versioned again: write the change into a new version of "
                         f"{RETIRED_DOCS[doc_id]} (doc-new-version --doc {RETIRED_DOCS[doc_id]}), keeping only what the code cannot say{kept}")
    if doc_id not in DOC_TYPES:
        raise SystemExit(f"doc must be one of: {', '.join(sorted(DOC_TYPES))}")
    # Doc versions are named by their UTC minute (v73), so two streams no longer pick the same
    # number -- but two branches versioning one doc each copy its whole body from the same parent, so
    # a merge silently keeps one side's edits, and both write the one `docs/index.json`.
    # Consolidation therefore still runs on the default stream only -- refuse here, before any
    # allocation or write, so a refusal leaves zero partial state.
    stream = current_stream(all_active_phases())
    if stream:
        raise SystemExit(f"this checkout is on parallel stream {stream}; doc consolidation runs on the default stream, never on a phase branch -- the names no longer collide, but two branches versioning one doc each copy its whole body from the same parent (a merge silently keeps one side's edits) and both write the one docs/index.json; for a parallel phase defer it to the post-merge step (parallel-merge-finish, then doc-new-version, then parallel-consolidated)")
    index = doc_index()
    info = index["docs"][doc_id]
    latest_id = info["latest"]
    latest = next(v for v in info["versions"] if v["id"] == latest_id)
    base_body = strip_frontmatter((ROOT / latest["path"]).read_text(encoding="utf-8"))
    version_prefix, _ = next_doc_version_id(doc_id, index)
    version_id = f"{version_prefix}_{slugify(args.summary, 'update')}"
    rel = f"docs/versions/{doc_id}/{version_id}.md"
    dest = ROOT / rel
    if dest.exists():
        raise SystemExit(f"doc version already exists: {rel}")
    # The last-updated marker (v39). Written into both the frontmatter -- which `rebuild_docs`
    # copies verbatim into `docs/current`, so the marker reaches the file a reader opens -- and the
    # index entry `docs` reads. Absent git is recorded as `unknown`/null, never raised.
    commit = head_commit()
    frontmatter = (
        f"---\n"
        f"doc_id: {doc_id}\n"
        f"version: {version_prefix}\n"
        f"created_at: {now_iso()}\n"
        f"commit: {commit or 'unknown'}\n"
        f"source: {args.source}\n"
        f"summary: {args.summary}\n"
        f"previous: {latest_id}\n"
        f"---\n\n"
    )
    write_text(dest, frontmatter + base_body)
    info["latest"] = version_id
    info["versions"].append({
        "id": version_id, "path": rel, "created_at": now_iso(), "commit": commit or None,
        "source": args.source, "summary": args.summary, "previous": latest_id,
    })
    write_doc_index(index)
    rebuild_docs()
    append_event("doc_version_created", doc=doc_id, version=version_id, source=args.source)
    print(f"created doc version {doc_id}/{version_id}")
    print(f"edit_path={shown(dest)}")
    print(f"after editing, run: {WORKFLOW_CMD} rebuild-docs")
    # The split can only happen in a new version, and this is one -- so say it here, not only in
    # `validate`, where the reader is nowhere near an editable file.
    hint = oversized_sections_line(oversized_doc_sections([doc_id]))
    if hint:
        print(f"note: {hint}")
        print("note: you are writing that doc now -- if you split, split it in this version file, never in docs/current")


def cmd_docs(args: argparse.Namespace) -> None:
    """The durable-doc listing -- where an agent picks which sections to read, and therefore where
    each doc's last-updated marker and its staleness belong. Writes nothing."""
    index = doc_index()
    stale = stale_docs()
    owing_ids = {pid for owed in stale.values() for pid in owed}
    active = all_active_phases() if any(id_sort_key(pid)[0] == 1 for pid in owing_ids) else []  # tokens list by created_at
    for doc_id in sorted(index["docs"]):
        info = index["docs"][doc_id]
        latest = next(v for v in info["versions"] if v["id"] == info["latest"])
        print(f"{doc_id}: latest={info['latest']} current={shown_rel(info['current_path'])} latest_path={shown_rel(latest['path'])}")
        line = f"  {doc_marker(latest)}"
        if doc_id in RETIRED_DOCS:  # v79: kept readable, never versioned; its notes count for the successor
            print(f"{line} -- retired (v79): frozen as it is; read the code first, and durable truth for it now goes to {RETIRED_DOCS[doc_id]}.md")
            continue
        owed = stale.get(doc_id)
        if owed:
            notes = sum(owed.values())
            line += (f" -- STALE: {notes} unconsolidated '## Doc impact' note(s) from {', '.join(sort_phase_ids(owed, active))}"
                     f" are newer than this version; read them (docs-debt) before trusting this doc")
        print(line)
    hint = stale_docs_line(stale)
    if hint:
        print(hint)


def h2_sections(text: str) -> list:
    """`(heading, bytes)` for every `## ` section of a markdown document, biggest-unit-first order.

    A section runs from its heading to the next `## `, so deeper headings count as its body -- that
    is the unit a reader actually reads. Fenced blocks are skipped (a `## ` inside a shell example
    is a comment, not a heading), and the size is bytes, because bytes are what the reader pays.
    """
    lines = text.split("\n")
    fenced, starts = False, []
    for i, line in enumerate(lines):
        if line.startswith("```") or line.startswith("~~~"):
            fenced = not fenced
        elif not fenced and line.startswith("## "):
            starts.append(i)
    out = []
    for j, i in enumerate(starts):
        end = starts[j + 1] if j + 1 < len(starts) else len(lines)
        out.append((lines[i].strip(), len("\n".join(lines[i:end]).encode("utf-8"))))
    return out


def oversized_doc_sections(doc_ids=None, threshold: int = DOC_SECTION_WARN_BYTES) -> list:
    """Every `docs/current` H2 section past `threshold` bytes, biggest first: `(doc, heading, bytes)`.

    Measured on the generated current snapshots, because those are what a slice reads. Best effort
    and never fatal: a doc with no current file is skipped rather than reported, so a partial or
    foreign workspace still validates. `doc_ids` narrows it to the doc being written.
    """
    wanted = sorted(DOC_TYPES if doc_ids is None else set(doc_ids) & DOC_TYPES)
    found = []
    for doc_id in wanted:
        path = DOCS / "current" / f"{doc_id}.md"
        if not path.exists():
            continue
        found += [(doc_id, heading, size) for heading, size in h2_sections(path.read_text(encoding="utf-8")) if size > threshold]
    return sorted(found, key=lambda item: -item[2])


def oversized_sections_line(sections: list, limit: int = 3) -> str:
    """One advisory line naming the biggest oversized sections, or "" when there are none -- shared
    by `validate` and `doc-new-version` so the warning and the write-time hint can never word it
    differently (the `consolidation_debt_line` pattern).

    Advisory everywhere, never an error and never a sweep order: splitting is per-doc judgment at
    the next consolidation, and a small doc whose few sections are its whole content is fine as it is.
    """
    if not sections:
        return ""
    def short(heading: str) -> str:
        return heading if len(heading) <= 60 else heading[:57] + "..."
    named = "; ".join(f"{doc}.md '{short(heading)}' {size:,} B" for doc, heading, size in sections[:limit])
    if len(sections) > limit:
        named += f"; +{len(sections) - limit} more"
    return (f"oversized_doc_sections={len(sections)} (H2 sections over {DOC_SECTION_WARN_BYTES:,} B, so"
            f" \"read only the sections the work touches\" is no longer a small read): {named}"
            f" -- split them at the next consolidation (a docs phase), by per-doc judgment, never a sweep")


def validate_docs(errors: list, warnings: list = None) -> None:
    warnings = [] if warnings is None else warnings
    if not (DOCS / "index.json").exists():
        errors.append("missing docs/index.json")
        return
    index = doc_index()
    for doc_id in DOC_TYPES:
        info = index.get("docs", {}).get(doc_id)
        if not info:
            errors.append(f"missing doc index entry: {doc_id}")
            continue
        # Version numbers must be unique per doc (the digits after `v`: `v0007` in the old counter,
        # `v2610230147` -- a UTC minute -- since v73). `next_doc_version_id` never repeats one, so two
        # entries claiming the same number means a collision already happened (two branches versioning
        # one doc in the same minute, or a hand-resolved merge of docs/index.json) and one version is
        # silently absent from docs/current. Fail loudly instead, naming the ids as written.
        seen_nums = {}
        for version in info.get("versions", []):
            m = re.match(r"v(\d+)", str(version.get("id", "")))
            if not m:
                continue
            num = int(m.group(1))
            if num in seen_nums:
                errors.append(f"duplicate doc version number in docs/index.json: {doc_id} v{m.group(1)} claimed by both {seen_nums[num]} and {version.get('id')}")
            else:
                seen_nums[num] = version.get("id")
        latest = next((v for v in info.get("versions", []) if v.get("id") == info.get("latest")), None)
        if not latest:
            errors.append(f"missing latest doc version entry: {doc_id}")
            continue
        # `latest` stays the stored pointer `rebuild-docs` reads; it is not recomputed. But a pointer
        # below the highest version number means docs/current is generated from an older version than
        # the newest one on file -- a hand-resolved merge, most likely -- so say so (advisory).
        latest_match = re.match(r"v(\d+)", str(latest.get("id", "")))
        if latest_match and seen_nums and int(latest_match.group(1)) < max(seen_nums):
            highest_id = seen_nums[max(seen_nums)]
            warnings.append(f"doc {doc_id}: latest is {latest.get('id')}, but {highest_id} has the highest version number -- docs/current is generated from latest; if the newer version is the one meant, set docs/index.json's latest to {highest_id} and run rebuild-docs")
        latest_path = ROOT / latest["path"]
        current_path = ROOT / info["current_path"]
        if not latest_path.exists():
            errors.append(f"missing latest doc file: {latest['path']}")
        if not current_path.exists():
            errors.append(f"missing current doc file: {info['current_path']}")
        if latest_path.exists() and current_path.exists() and latest_path.read_text(encoding="utf-8") != current_path.read_text(encoding="utf-8"):
            errors.append(f"current doc is stale; run rebuild-docs: {doc_id}")


def _created_sort_stamp(created_at) -> str:
    """A `created_at` as a string that sorts by time across machines in different zones (UTC), or
    the value as written when it is not an ISO time; "" when absent."""
    if not created_at:
        return ""
    try:
        return datetime.fromisoformat(str(created_at)).astimezone(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S")
    except (TypeError, ValueError):
        return str(created_at)


def id_sort_key(value, created_at=None) -> tuple:
    """The ONE order of phase and deferred ids in a listing: numbered ids first, tailed or not, by number
    and then tail -- `(0, n, tail or "")`, so `P46` before `P46-k2` before `P46-x4` and an all-numeric
    list sorts exactly as v72 sorted it -- then v73's minted tokens, by creation time and then token --
    `(1, created_at, token)`; an id of neither shape sorts last, as written. Deterministic: a numbered
    id reads no record. Phases still SELECT by `order`; this key lists them, and breaks a tie in `order`."""
    text = str(value)
    numeric = NUMBERED_ID_RE.fullmatch(text)
    if numeric:
        return (0, int(numeric.group(1)), numeric.group(2) or "")
    token = re.fullmatch(rf"[PD]-({ID_TOKEN_PATTERN})", text)
    if token:
        return (1, _created_sort_stamp(created_at), token.group(1))
    return (2, "", text)


def sort_phase_ids(ids, phases=None) -> list:
    """`ids` in `id_sort_key` order, a token's `created_at` read from `phases` (default: the active
    phases, read only when a token is listed); an id no record names sorts as if it had none."""
    ids = list(ids)
    if phases is None:
        phases = all_active_phases() if any(id_sort_key(pid)[0] == 1 for pid in ids) else []
    created = {p.get("id"): p.get("created_at") for p in phases if isinstance(p, dict)}
    return sorted(ids, key=lambda pid: id_sort_key(pid, created.get(pid)))


def phase_dirs() -> list:
    """The active phase folders in selection order: by `order`, a tie broken by `id_sort_key` (two
    branches that each created a phase give both the same next order; the merge must still select
    the same phase on every machine, never in directory-listing order)."""
    if not ACTIVE.exists():
        return []
    found = []
    for p in ACTIVE.iterdir():
        if p.is_dir() and (p / "phase.json").exists():
            data = read_json(p / "phase.json")
            found.append(((data.get("order", 999999), id_sort_key(data.get("id", p.name), data.get("created_at"))), p))
    return [p for _key, p in sorted(found, key=lambda item: item[0])]


def slice_dirs(phase_dir: Path) -> list:
    slices = phase_dir / "slices"
    if not slices.exists():
        return []
    return sorted([p for p in slices.iterdir() if p.is_dir() and (p / "slice.json").exists()], key=lambda p: read_json(p / "slice.json").get("order", 999999))


def all_active_phases() -> list:
    phases = []
    for pdir in phase_dirs():
        data = read_json(pdir / "phase.json")
        data["path"] = str(pdir.relative_to(ROOT))
        data["slices"] = []
        for sdir in slice_dirs(pdir):
            sdata = read_json(sdir / "slice.json")
            sdata["path"] = str(sdir.relative_to(ROOT))
            data["slices"].append(sdata)
        phases.append(data)
    return phases


def deferred_jobs() -> dict:
    groups = {"open": [], "promoted": [], "dropped": []}
    for label, base in [("open", DEFERRED_OPEN), ("promoted", DEFERRED_PROMOTED), ("dropped", DEFERRED_DROPPED)]:
        if not base.exists():
            continue
        for ddir in sorted([p for p in base.iterdir() if p.is_dir()]):
            djson = ddir / "deferred.json"
            if not djson.exists():
                continue
            data = read_json(djson)
            data["path"] = str(ddir.relative_to(ROOT))
            groups[label].append(data)
        # In id order (D2 before D10 before D10-x4, then v73's minted D- tokens by creation), not folder-name order.
        groups[label].sort(key=lambda d: id_sort_key(Path(d["path"]).name, d.get("created_at")))
    return groups


def clean_cell(value: object) -> str:
    if value is None:
        return ""
    if isinstance(value, dict):
        if "slice_id" in value:
            value = value.get("slice_id") or value
        elif "id" in value:
            value = value.get("id") or value
        else:
            value = json.dumps(value, ensure_ascii=False)
    return str(value).replace("|", "\\|").replace("\n", " ")


def status_box(status: object) -> str:
    """Dashboard checkbox glyph: done -> x, pending (waiting on operator) -> ~, ready (plan approved) -> r, else blank."""
    return "x" if status == "done" else "~" if status == "pending" else "r" if status == "ready" else " "


def rebuild_deferred_dashboard(groups=None) -> None:
    groups = groups or deferred_jobs()
    open_count = len(groups.get("open", []))
    promoted_count = len(groups.get("promoted", []))
    dropped_count = len(groups.get("dropped", []))
    lines = [
        "# Deferred Jobs", "", "> Generated dashboard. Do not put detailed deferred context here; edit each `works/deferred/<state>/<DID>/` folder instead.", "",
        "## Summary", "",
        f"- Open: `{open_count}`", f"- Promoted: `{promoted_count}`", f"- Dropped: `{dropped_count}`", "",
        "## Open", "", "| ID | Status | Title | Source | Trigger | Path |", "|---|---|---|---|---|---|",
    ]
    if not groups.get("open"):
        lines.append("| - | - | - | - | - | - |")
    for d in groups.get("open", []):
        lines.append(f"| `{clean_cell(d.get('id'))}` | `{clean_cell(d.get('status'))}` | {clean_cell(d.get('title'))} | {clean_cell(d.get('source'))} | {clean_cell(d.get('trigger'))} | `{clean_cell(d.get('path'))}` |")
    lines.extend(["", "## Promoted", "", "| ID | Status | Title | Promoted To | Path |", "|---|---|---|---|---|"])
    if not groups.get("promoted"):
        lines.append("| - | - | - | - | - |")
    for d in groups.get("promoted", []):
        lines.append(f"| `{clean_cell(d.get('id'))}` | `{clean_cell(d.get('status'))}` | {clean_cell(d.get('title'))} | `{clean_cell(d.get('promoted_to'))}` | `{clean_cell(d.get('path'))}` |")
    lines.extend(["", "## Dropped", "", "| ID | Status | Title | Reason | Path |", "|---|---|---|---|---|"])
    if not groups.get("dropped"):
        lines.append("| - | - | - | - | - |")
    for d in groups.get("dropped", []):
        lines.append(f"| `{clean_cell(d.get('id'))}` | `{clean_cell(d.get('status'))}` | {clean_cell(d.get('title'))} | {clean_cell(d.get('dropped_reason'))} | `{clean_cell(d.get('path'))}` |")
    lines.append("")
    write_text(WORKS / "deferred.md", "\n".join(lines))


def phase_execution(data) -> dict:
    """The phase's parallel-execution block, or None when it belongs to the default stream.

    Shape (all fields optional in the file, absence of the whole block = today's behavior):

        "execution": {
          "mode": "parallel",              # "parallel" = own stream; "default" (pinned, v42) and anything else = default stream
          "branch": "phase/P13-some-slug", # required when parallel; the stream key
          "worktree": "/path or null",     # informational (null on a plain clone)
          "consolidation": "pending"       # "pending" until the post-merge doc consolidation, then "done"
        }

    A nested install (P35) adds the host half of the worktree pair: `host_worktree`, `host_branch`,
    `host_base`, `host_base_sha`, `host_branch_created` and `base_branch`; there `worktree` is the
    NESTED worktree (`<host_worktree>/workflow`). See `_nested_execution_problems`.

    Read the block only through this helper so every caller agrees on what "parallel" means.
    """
    if not isinstance(data, dict):
        return None
    execution = data.get("execution")
    if not isinstance(execution, dict) or execution.get("mode") not in EXECUTION_MODES:
        return None
    return execution


def phase_in_flight(data) -> bool:
    """True when a phase is stamped for its own worktree and is still running there (P35.S7, closes D57).

    It has a parallel execution block (`phase_execution`) AND either still holds a worktree
    (`execution.worktree` is not null: running, or merged but not yet torn down) or has not reached
    `done`. A stamped phase that is `done` with its worktree torn down is history: it is not in
    flight, so `## Streams` and `next`'s `parallel_phases_elsewhere` skip it. Accepts a phase record
    or a `works/index.json` entry; both carry `status` and `execution`.
    """
    execution = phase_execution(data)
    if not execution:
        return False
    return execution.get("worktree") is not None or data.get("status") != "done"


NESTED_EXECUTION_HOST_KEYS = ("host_worktree", "host_branch", "host_base", "host_base_sha", "host_branch_created")
HOST_DETACHED = object()  # v86: the ## Streams Host branch cell of a detached host worktree (never a branch name)


def _host_branch_cell(execution: dict):
    """The Host branch cell's value: the stamped branch, `HOST_DETACHED` for an explain phase's detached
    host worktree (`host_branch` stamped null beside the other host keys, v86), else None (`-`)."""
    if execution.get("host_branch"):
        return execution["host_branch"]
    if "host_branch" in execution and "host_worktree" in execution:
        return HOST_DETACHED
    return None


def _nested_execution_problems(phase_id: str, execution: dict) -> list:
    """`validate`'s checks on the host half of a parallel execution block (P35), [] when sound.

    A nested `parallel-start` stamps five host keys -- `host_worktree` (the host worktree; null once
    torn down), `host_branch`, `host_base` (the ref as resolved), `host_base_sha`, `host_branch_created`
    -- plus `base_branch` (the nested repo's branch at start). The five appear together, and only in a
    nested install; `base_branch` comes with them there, and is otherwise only type-checked (a root
    stamp of it is additive). `worktree` is the nested worktree: `<host_worktree>/<workflow>` while
    both are set. A block without any of them (every at-root block, and a legacy one) is untouched.
    v86 (§9.4): `host_branch` may be null -- a DETACHED host worktree (an explain phase's) -- and then
    `host_branch_created` must be false and the block carries no `repos` (a set needs a host branch)."""
    problems = []
    present = [k for k in NESTED_EXECUTION_HOST_KEYS if k in execution]
    if "base_branch" in execution:
        value = execution.get("base_branch")
        if value is not None and not (isinstance(value, str) and value.strip()):
            problems.append(f"phase {phase_id} has invalid execution.base_branch {value!r}; expected the nested repo's branch name or null")
    if not present:
        return problems
    if NESTED is None:
        problems.append(f"phase {phase_id} has nested-only execution keys ({', '.join(present)}) in an at-root install; they are written only by a nested parallel-start")
        return problems
    missing = [k for k in (*NESTED_EXECUTION_HOST_KEYS, "base_branch") if k not in execution]
    if missing:
        problems.append(f"phase {phase_id} has a partial nested execution block: missing {', '.join(missing)} (parallel-start writes all six together)")
    for key in ("host_branch", "host_base"):
        value = execution.get(key)
        if key == "host_branch" and value is None:
            continue  # v86: a detached host worktree; its consistency is checked below
        if key in execution and not (isinstance(value, str) and value.strip()):
            problems.append(f"phase {phase_id} has invalid execution.{key} {value!r}"
                            + ("; expected a non-empty string, or null for a detached host worktree" if key == "host_branch" else "; expected a non-empty string"))
    if "host_branch" in execution and execution.get("host_branch") is None:
        if execution.get("host_branch_created") is not False:
            problems.append(f"phase {phase_id} has execution.host_branch null (a detached host worktree) but host_branch_created "
                            f"{execution.get('host_branch_created')!r}; a detached host worktree creates no branch, so it must be false")
        if "repos" in execution:
            problems.append(f"phase {phase_id} has execution.host_branch null (a detached host worktree) with execution.repos; "
                            f"a worktree set needs a host branch (parallel-start --host-branch)")
    sha = execution.get("host_base_sha")
    if "host_base_sha" in execution and not (isinstance(sha, str) and re.fullmatch(r"[0-9a-f]{7,64}", sha)):
        problems.append(f"phase {phase_id} has invalid execution.host_base_sha {sha!r}; expected a host commit sha")
    created = execution.get("host_branch_created")
    if "host_branch_created" in execution and not isinstance(created, bool):
        problems.append(f"phase {phase_id} has invalid execution.host_branch_created {created!r}; expected true or false")
    host_wt = execution.get("host_worktree")
    if host_wt is not None and not isinstance(host_wt, str):
        problems.append(f"phase {phase_id} has invalid execution.host_worktree {host_wt!r}; expected a path string or null")
    worktree = execution.get("worktree")
    if isinstance(host_wt, str) and isinstance(worktree, str) and HOST_ROOT is not None:
        expected = os.path.normpath(os.path.join(host_wt, os.path.relpath(ROOT, HOST_ROOT)))
        if os.path.normpath(worktree) != expected:
            problems.append(f"phase {phase_id} has execution.worktree {worktree!r}, but the nested worktree of host_worktree {host_wt!r} is {expected!r}")
    return problems


SET_REPO_KEYS = ("worktree", "branch", "base", "base_sha", "branch_created")


def _nested_execution_repo_problems(phase_id: str, execution: dict, errors: list, warnings: list) -> None:
    """`validate`'s checks on a worktree set's repo half (P40.S6, S2 §18): `execution.repos.<name> =
    {worktree, branch, base, base_sha, branch_created}`, written by `parallel-start --repo` on a
    multi-repo host only. Called only when the key is present, so every single-repo and at-root block
    reads exactly as before. A stamped name the registry no longer lists is a warning (history stays
    readable); everything else is an error. Registry paths come from the marker, never the disk."""
    repos = execution.get("repos")
    if NESTED is None:
        errors.append(f"phase {phase_id} has execution.repos in an at-root install; it is written only by parallel-start --repo on a multi-repo host")
        return
    if not NESTED_PROBLEMS and not nested_repos():
        errors.append(f"phase {phase_id} has execution.repos in a single-repo nested install; it is written only by parallel-start --repo on a multi-repo host")
        return
    if not isinstance(repos, dict):
        errors.append(f"phase {phase_id} has a non-object execution.repos {repos!r}; expected {{<repo name>: {{{', '.join(SET_REPO_KEYS)}}}}}")
        return
    registry = {r.get("name"): r for r in nested_repos() if isinstance(r, dict)}
    host_wt = execution.get("host_worktree")
    for name, value in repos.items():
        label = f"phase {phase_id} execution.repos.{name}"
        if not isinstance(value, dict):
            errors.append(f"{label} is {value!r}; expected an object with {', '.join(SET_REPO_KEYS)}")
            continue
        missing = [k for k in SET_REPO_KEYS if k not in value]
        if missing:
            errors.append(f"{label} is missing {', '.join(missing)} (parallel-start writes all five together)")
        for key in ("branch", "base"):
            v = value.get(key)
            if key in value and not (isinstance(v, str) and v.strip()):
                errors.append(f"{label}.{key} is {v!r}; expected a non-empty string")
        sha = value.get("base_sha")
        if "base_sha" in value and not (isinstance(sha, str) and re.fullmatch(r"[0-9a-f]{7,64}", sha)):
            errors.append(f"{label}.base_sha is {sha!r}; expected a commit sha in {name}")
        created = value.get("branch_created")
        if "branch_created" in value and not isinstance(created, bool):
            errors.append(f"{label}.branch_created is {created!r}; expected true or false")
        wt = value.get("worktree")
        if wt is not None and not isinstance(wt, str):
            errors.append(f"{label}.worktree is {wt!r}; expected a path string or null")
        elif isinstance(wt, str) and host_wt is None:
            errors.append(f"{label}.worktree is {wt!r} while execution.host_worktree is null; a repo worktree lives inside the host worktree (null it once torn down)")
        if name not in registry:
            if registry:
                warnings.append(f"{label}: no registered repo is named {name} -- kept as history (re-register it with: {WORKFLOW_CMD} nested-repos --add <path> --name {name})")
            continue
        if isinstance(wt, str) and isinstance(host_wt, str):
            expected = os.path.normpath(os.path.join(host_wt, registry[name]["path"]))
            if os.path.normpath(wt) != expected:
                errors.append(f"{label}.worktree is {wt!r}, but {name}'s worktree in host_worktree {host_wt!r} is {expected!r} (its registry path)")


def phase_pinned(data) -> bool:
    """True when the phase carries v42's legacy pin (`execution.mode == "default"`).

    Since v43 the default stream is the default, so nothing writes this block any more --
    `parallel-skip` and `new-phase --on-main` are no-ops. It is still honoured where it
    exists: `parallel-start` refuses a pinned phase rather than overriding a deliberate pin,
    and the hints skip it. Everything else treats it exactly like a phase with no block,
    because `phase_execution` returns None for it."""
    execution = data.get("execution") if isinstance(data, dict) else None
    return isinstance(execution, dict) and execution.get("mode") == PINNED_MODE


def phase_consolidation(data) -> str:
    """A phase's durable-doc consolidation debt: "pending", "done", or None (nothing owed).

    Every phase defers consolidation: a passing review verifies the `## Doc impact` list and
    creates no doc versions, so the debt is stamped there ("pending") and paid later by an
    operator-created docs phase (`doc-new-version` per note, then `docs-consolidated <P>`).

    Read through this helper only, so every caller agrees on what "owes docs" means:

        "consolidation": "pending" | "done" | absent   # top-level in phase.json

    Backward compatible in both directions. v24-v37 stamped the identical debt inside the
    parallel `execution` block, so that field is the fallback and no phase.json needs migrating;
    a phase.json carrying neither (every phase reviewed before this release, and every adopter
    file) owes nothing and archives exactly as it always did.
    """
    if not isinstance(data, dict):
        return None
    state = data.get("consolidation")
    if state in CONSOLIDATION_STATES:
        return state
    if state is None:
        execution = phase_execution(data)
        if execution and execution.get("consolidation") in CONSOLIDATION_STATES:
            return execution["consolidation"]
    return None  # absent, or malformed -> `validate` reports it; no debt is invented


def set_phase_consolidation(data: dict, state: str) -> None:
    """Write the debt to the top-level key, mirroring it into a parallel `execution` block so the
    parallel commands and `parallel-status` keep reading the same truth from the field they know."""
    data["consolidation"] = state
    execution = phase_execution(data)
    if execution is not None:
        execution["consolidation"] = state


def phase_doc_impact_notes(pdir: Path) -> list:
    """The `## Doc impact` bullets in a phase's notebook -- what a docs phase consolidates from.

    Real notes only: the italic seed line, blanks and an explicit `- (none ...)` placeholder are
    not debt, and a phase with no notebook or no section owes nothing.
    """
    path = pdir / "phase.md"
    if not path.exists():
        return []
    notes, inside = [], False
    for line in path.read_text(encoding="utf-8").splitlines():
        if line.startswith("## "):
            inside = line.strip().lower() == "## doc impact"
            continue
        if not inside:
            continue
        text = line.strip()
        if not (text.startswith("- ") or text.startswith("* ")):
            continue
        body = text[2:].strip()
        if not body or body.startswith("_") or re.match(r"\(?none\b", body, re.I):
            continue
        notes.append(body)
    return notes


def doc_impact_docs(note: str) -> list:
    """The durable docs one `## Doc impact` note touches, read off the `<doc>.md: ...` convention.

    A note names its doc(s) in prose, so this is a best-effort read against the known `DOC_TYPES`
    only -- one note may name several docs (`operations.md: ...; qa.md: ...`) and a note naming
    none is reported unassigned rather than guessed at. A retired doc (v79) counts for its successor,
    so an older note naming `backend.md` lands in architecture's worklist. Nothing routes on it:
    `docs-debt` groups the worklist with it, and the operator still reads the note.
    """
    named = [d for d in sorted(DOC_TYPES | set(RETIRED_DOCS)) if re.search(rf"\b{re.escape(d)}\.md\b", note, re.I)]
    return sorted({RETIRED_DOCS.get(d, d) for d in named})


def phases_owing_consolidation(phases: list) -> list:
    """Every active phase whose doc consolidation is still `pending` -- the debt list, in one place
    so `parallel-merge-finish`, the archiving guard and any later surfacing all read the same set."""
    return [p for p in phases if phase_consolidation(p) == "pending"]


def consolidation_command(phase) -> str:
    """The command that pays one phase's debt. Parallel phases keep their post-merge twin, so
    the archiving guard, `next` and `validate` can never name a command the engine would refuse."""
    return "parallel-consolidated" if phase_execution(phase) else "docs-consolidated"


def phase_consolidates(data) -> list:
    """The phase ids a docs phase declared it pays: the optional top-level `"consolidates"` list that
    `new-phase --consolidates` writes (v51), `[]` when the key is absent or malformed (`validate`
    reports a malformed one). It is the ONLY marker of a docs phase -- nothing reads a phase's name
    or intent text to guess -- and a phase that carries none is simply not one, so no phase.json
    needs migrating."""
    value = data.get("consolidates") if isinstance(data, dict) else None
    if not isinstance(value, list):
        return []
    return [v for v in value if isinstance(v, str)]


def consolidation_cover(phases: list) -> dict:
    """`{debt_phase_id: [covering phase, ...]}` -- which live docs phase already pays which phase's
    debt: every active, not-`done` phase whose `consolidates` names it. A finished docs phase covers
    nothing (it either paid the debt or it did not), so rotate proposes again rather than trusting
    it. Read by `docs-debt` ("paid by") and `rotate-backlog` (no duplicate docs phase)."""
    cover = {}
    for phase in phases:
        if phase.get("status") == "done":
            continue
        for pid in phase_consolidates(phase):
            cover.setdefault(pid, []).append(phase)
    return cover


def archived_phase_ids() -> set:
    """Every phase id archived/ holds, from each folder's `archive_manifest.json` `phase_id`, its
    `phase.json` `id` and the `_<id>_` in the folder name (`_archive_one` writes all three): an archived
    id is spent. An unreadable entry gives what still reads, never an error."""
    ids = set()
    for adir in (ARCHIVED.iterdir() if ARCHIVED.is_dir() else []):
        if not adir.is_dir():
            continue
        for name, key in (("archive_manifest.json", "phase_id"), ("phase.json", "id")):
            try:
                value = read_json(adir / name).get(key) if (adir / name).is_file() else None
            except Exception:  # noqa: BLE001 - an unreadable archive entry is skipped, never fatal
                value = None
            if isinstance(value, str) and value:
                ids.add(value)
        match = ARCHIVE_FOLDER_ID_RE.search(adir.name)
        if match:
            ids.add(match.group(1))
    return ids


def deferred_folder_ids() -> set:
    """Every deferred id with a folder in open/, promoted/ or dropped/ (the folder name is the id)."""
    return {d.name for base in (DEFERRED_OPEN, DEFERRED_PROMOTED, DEFERRED_DROPPED) if base.is_dir()
            for d in base.iterdir() if d.is_dir()}


def _id_token(value):
    """The lowercase token of a v73 `P-`/`D-` id, any case, or None for any other shape (a numbered id,
    tailed or not, has no token)."""
    match = re.fullmatch(r"[PDpd]-([0-9A-Za-z]+)", str(value))
    return match.group(1).lower() if match else None


def visible_phase_ids() -> set:
    """Every phase id this workspace can see: each active folder's name and its `phase.json` id, and every
    archived id (`archived_phase_ids`: an archived id is spent)."""
    ids = set(archived_phase_ids())
    for pdir in (ACTIVE.iterdir() if ACTIVE.is_dir() else []):
        if pdir.is_dir():
            ids.add(pdir.name)
            try:
                ids.add(str(read_json(pdir / "phase.json").get("id", "")))
            except Exception:  # noqa: BLE001 - an unreadable phase.json still has its folder name
                pass
    ids.discard("")
    return ids


def visible_ids(prefix: str) -> set:
    """The ids of one kind this workspace can see: phases (`P`, `visible_phase_ids`) or deferred jobs (`D`,
    every folder in open/, promoted/ and dropped/)."""
    return visible_phase_ids() if prefix == "P" else deferred_folder_ids()


def visible_id_tokens() -> set:
    """The v73 tokens of every phase and deferred id this workspace can see -- ONE pool for both kinds.
    It now guards only an explicit v73-shape id (`--phase P-7kq2`, `--id D-m3xa`): the mint draws no token."""
    return {tok for tok in (_id_token(i) for i in visible_phase_ids() | deferred_folder_ids()) if tok}


def id_token_refusal(token: str, taken=None):
    """Why `token` cannot be an explicit v73-shape id's token, or None: all digits (it would read as a
    number), a mode word (`gate`, `plan`), a `p`/`d` and three digits (typed bare it would read as the old
    `P123` / `D123`), or a token some visible phase or deferred id already has."""
    token = token.lower()
    if token.isdigit():
        return f"its token {token} is all digits, which reads as a number"
    if token in ID_MODE_WORDS:
        return f"its token {token} is a mode word"
    if re.fullmatch(r"[pd][0-9]{3}", token):
        return f"its token {token}, typed bare, would read as the old id {token.upper()}"
    if token in (visible_id_tokens() if taken is None else taken):
        return f"its token {token} is already the token of a phase or deferred id this workspace holds (one pool for both kinds)"
    return None


def id_number(value):
    """`(n, tail)` of a numbered id of either prefix (`P46` -> `(46, None)`, `D92-x4` -> `(92, "x4")`), or
    None for any other shape (a v73 token, an odd name)."""
    match = NUMBERED_ID_RE.fullmatch(str(value))
    return (int(match.group(1)), match.group(2)) if match else None


def next_id_number(prefix: str, visible=None) -> int:
    """1 + the highest number of every visible numbered id of this kind, untailed (`P45`) and tailed
    (`P45-m9`) alike (`visible_ids`: phases active and archived, deferred jobs open, promoted and dropped);
    v73 tokens carry no number and are ignored. An empty workspace gives 1."""
    numbers = [id_number(i)[0] for i in (visible_ids(prefix) if visible is None else visible)
               if str(i).startswith(prefix) and id_number(i)]
    return max(numbers, default=0) + 1


def draw_id_tail() -> str:
    """Two symbols of `ID_TOKEN_ALPHABET`, drawn with `secrets` until one is a letter (never all digits)."""
    while True:
        tail = "".join(secrets.choice(ID_TOKEN_ALPHABET) for _ in range(ID_TAIL_LENGTH))
        if any(c in ID_TAIL_LETTERS for c in tail):
            return tail


def mint_id(prefix: str) -> str:
    """A new `<prefix><n>-<tail>` id (prefix `P` or `D`): `next_id_number` and a tail re-drawn while the full
    id is visible. Nothing else allocates a phase or deferred id. Two branches that each mint draw the same
    number; the tail keeps them apart, and a same-tail pair (1 in 924) is a git add/add conflict at merge."""
    visible = visible_ids(prefix)
    number = next_id_number(prefix, visible)
    for _ in range(10000):
        candidate = f"{prefix}{number}-{draw_id_tail()}"
        if candidate not in visible:
            return candidate
    raise SystemExit(f"could not mint a free {prefix}{number}- id: every tail is taken")


def mint_phase_id() -> str:
    """`P<n>-<tail>`: `new-phase` without `--phase`, `promote-deferred --create-phase` without `--phase`, and
    rotate-backlog's docs-phase proposal. It supersedes v73's `P-<token>`, which no one could say."""
    return mint_id("P")


# Brief names: what an operator may TYPE for an id, and the one place it becomes the id as stored. A
# numbered id is typed by its number: `46`, `p46`, `P46` name `P46-k2` while it is the only phase numbered
# 46 (an exact stored `P46` always wins), and `46-k2`, `p46-K2` name it always -- the tail is needed only when
# two branches each made a P46. v73's minted ids keep their brief forms: `7kq2`, `P-7kq2`, `p-7KQ2` are
# `P-7kq2` (a token needs a letter, is never a mode word, and keeps its dash once the prefix is written:
# `P7kq2` names nothing; `46k2` is the token `P-46k2`, never a tailed id). A deferred job likewise (`92`,
# `d92-X4`, `m3xa`, `D-m3xa`). Two contexts, both in `normalize_id_args`, the ONE choke point after argparse:
# CREATING an id (`new-phase --phase`, `defer-job --id`) reads the form statically (`brief_id`: `46` is `P46`);
# REFERENCING one (every other argument) looks a number up among the stored ids (`resolve_id_ref`).
ID_ARG_KINDS = {"P": "phase", "D": "deferred job"}
PHASE_ARG_HELP = ("the phase, in any brief form: 46 or P46 (numbered; type the tail, 46-k2, only when two phases share"
                  " the number), 7kq2 or P-7kq2 (a v73 id), any case")
ID_ARG_EXAMPLES = {"P": ("P46-k2", "46", "P12", "P-7kq2", "7kq2"), "D": ("D92-x4", "92", "D12", "D-m3xa", "m3xa")}


def brief_id(prefix: str, raw) -> "str | None":
    """The id `raw` names read STATICALLY (prefix `P` for a phase, `D` for a deferred job), or None when it is
    no brief form: the optional `P`/`p` and digits (`P46`; leading zeros dropped, as `run-phases` always did),
    the same plus a dash and a valid tail (`P46-k2`, the tail lowercased), or the optional `P-`/`p-` and four
    v73 token symbols with a letter and no mode word (`P-7kq2`). A number is not looked up here."""
    text = str(raw).strip()
    number = re.fullmatch(rf"{prefix}?([0-9]+)", text, re.I)
    if number:
        return f"{prefix}{int(number.group(1))}"
    tailed = re.fullmatch(rf"{prefix}?([0-9]+)-([0-9A-Za-z]{{{ID_TAIL_LENGTH}}})", text, re.I)
    if tailed and re.fullmatch(ID_TAIL_PATTERN, tailed.group(2).lower()):
        return f"{prefix}{int(tailed.group(1))}-{tailed.group(2).lower()}"
    token = re.fullmatch(rf"(?:{prefix}-)?({ID_TOKEN_PATTERN})", text, re.I)
    if token and not token.group(1).isdigit() and token.group(1).lower() not in ID_MODE_WORDS:
        return f"{prefix}-{token.group(1).lower()}"
    return None


def id_arg_refusal(prefix: str, raw) -> str:
    """Why `raw` is not a phase (`P`) or deferred job (`D`) id, with the three shapes that are."""
    text = str(raw).strip()
    tailed, number, old, minted, bare = ID_ARG_EXAMPLES[prefix]
    msg = (f"{raw!r} is not a {ID_ARG_KINDS[prefix]} id: write {number} or {tailed} (numbered, the tail typed only when"
           f" two share the number), {old} (an old numbered id), or {bare} or {minted} (a minted v73 id)")
    lone = re.fullmatch(rf"{prefix}({ID_TOKEN_PATTERN})", text, re.I)
    if lone:
        msg += f"; a minted id keeps its dash: {prefix}-{lone.group(1).lower()} (or just {lone.group(1).lower()})"
    return msg


def lookup_id_number(prefix: str, number: int, stored=None) -> tuple:
    """`(id, tailed)` for the number `number` of this kind: an exact stored `P46` wins (`(P46, [])`); else the
    stored `P46-<tail>` ids -- exactly one gives `(it, [it])`, none `(None, [])`, several `(None, [them, sorted])`.
    `stored` defaults to `visible_ids(prefix)`; an active `P46` folder answers without reading the rest."""
    exact = f"{prefix}{number}"
    if stored is None:
        if prefix == "P" and (ACTIVE / exact).is_dir():
            return exact, []
        stored = visible_ids(prefix)
    if exact in stored:
        return exact, []
    tailed = sorted((i for i in stored if str(i).startswith(prefix) and (id_number(i) or (None, None))[0] == number
                     and id_number(i)[1]), key=id_sort_key)
    return (tailed[0] if len(tailed) == 1 else None), tailed


def id_number_refusal(prefix: str, raw, number: int, tailed: list) -> str:
    """Why the number `raw` names no single id: no stored id has it, or several tailed ids share it."""
    kind = ID_ARG_KINDS[prefix]
    if tailed:
        return (f"{str(raw).strip()!r} names {len(tailed)} {kind}s numbered {number}: {', '.join(tailed)} -- type the tail"
                f" (e.g. {tailed[0]} or {tailed[0][1:]})")
    where = "active or archived" if prefix == "P" else "open, promoted or dropped"
    return f"{str(raw).strip()!r} names no {kind}: none is {prefix}{number} or {prefix}{number}-<tail>, {where}"


def _stored_id_named(prefix: str, text: str) -> bool:
    """True when an id of a shape `brief_id` does not know is held exactly as typed (an old install's folder is
    never made unreachable): an active or archived phase, or a deferred job."""
    if not re.fullmatch(r"[A-Za-z0-9._-]+", text) or text in (".", ".."):
        return False
    if prefix == "D":
        return text in deferred_folder_ids()
    return (ACTIVE / text).is_dir() or text in archived_phase_ids()


def resolve_id_arg(prefix: str, raw) -> str:
    """A phase (`P`) or deferred job (`D`) id as typed when CREATING one -> the id as stored, read statically
    (`46` is `P46`); SystemExit with the shapes when it is no id. An id already in a stored shape
    (`PHASE_ID_RE` / `DEFERRED_ID_RE`) is returned untouched."""
    text = str(raw).strip()
    if (PHASE_ID_RE if prefix == "P" else DEFERRED_ID_RE).fullmatch(text):
        return text
    stored = brief_id(prefix, text)
    if stored is not None:
        return stored
    if _stored_id_named(prefix, text):
        return text
    raise SystemExit(id_arg_refusal(prefix, raw))


def resolve_id_ref(prefix: str, raw, stored=None) -> str:
    """A phase (`P`) or deferred job (`D`) id as typed when REFERENCING one -> the stored id: a bare number
    (`46`, `p46`, `P46`) is looked up (`lookup_id_number`: an exact `P46` wins, else the one `P46-<tail>`), and
    refused when it names none or several (the several listed); every other form reads as `resolve_id_arg`."""
    number = re.fullmatch(rf"{prefix}?([0-9]+)", str(raw).strip(), re.I)
    if number:
        found, tailed = lookup_id_number(prefix, int(number.group(1)), stored)
        if found is None:
            raise SystemExit(id_number_refusal(prefix, raw, int(number.group(1)), tailed))
        return found
    return resolve_id_arg(prefix, raw)


def _resolve_slice_arg(raw: str) -> str:
    """A slice id typed as `<brief phase>.<suffix>` -> its stored phase part (`46.S1` -> `P46-k2.S1`, `p-7KQ2.S1`
    -> `P-7kq2.S1`). A bare suffix (`S1`), a full id, a phase part that is no brief form, and a number that names
    no phase pass untouched (the command reports it); a number several phases share is refused."""
    head, dot, suffix = raw.partition(".")
    if not dot or not head or PHASE_ID_RE.fullmatch(head) and not re.fullmatch(r"P[0-9]+", head):
        return raw
    number = re.fullmatch(r"[Pp]?([0-9]+)", head)
    if number:
        found, tailed = lookup_id_number("P", int(number.group(1)))
        if found is None and len(tailed) > 1:
            raise SystemExit(id_number_refusal("P", head, int(number.group(1)), tailed))
        return f"{found}.{suffix}" if found else raw
    stored = brief_id("P", head)
    return f"{stored}.{suffix}" if stored else raw


def normalize_id_args(args: argparse.Namespace) -> None:
    """The ONE choke point for an id typed on a command line, run once after argparse: every `phase` /
    `--phase` argument is a phase id, every `deferred_id` and `defer-job --id` a deferred job's, `new-phase
    --consolidates` a comma list of phase ids, and the `slice` attribute (positional `slice` and `--slice`) a
    slice whose phase part may be brief (`46.S1`). CREATING an id (`new-phase --phase`, `defer-job --id`) reads
    it statically; `promote-deferred --create-phase --phase` references an existing phase when the number names
    one and otherwise creates statically; every other argument REFERENCES a stored id (`resolve_id_ref`). A
    `--consolidates` item that names nothing is left for that flag's own refusal; `--depends-on` stays full-form.
    A command then only ever sees the stored shape."""
    cmd = getattr(args, "cmd", None)
    phase = getattr(args, "phase", None)
    if isinstance(phase, str):
        if cmd == "new-phase":
            args.phase = resolve_id_arg("P", phase)
        elif cmd == "promote-deferred" and getattr(args, "create_phase", False):
            number = re.fullmatch(r"[Pp]?([0-9]+)", phase.strip())
            found, tailed = lookup_id_number("P", int(number.group(1))) if number else (None, [])
            if len(tailed) > 1 and found is None:
                raise SystemExit(id_number_refusal("P", phase, int(number.group(1)), tailed))
            args.phase = found or resolve_id_arg("P", phase)
        else:
            args.phase = resolve_id_ref("P", phase)
    deferred = getattr(args, "deferred_id", None)
    if isinstance(deferred, str):
        args.deferred_id = resolve_id_ref("D", deferred)
    if cmd == "defer-job" and isinstance(getattr(args, "id", None), str) and args.id:
        args.id = resolve_id_arg("D", args.id)
    consolidates = getattr(args, "consolidates", None)
    if isinstance(consolidates, str):
        parts = []
        for part in consolidates.split(","):
            number = re.fullmatch(r"[Pp]?([0-9]+)", part.strip())
            found, tailed = lookup_id_number("P", int(number.group(1))) if number else (None, [])
            if found is None and len(tailed) > 1:
                raise SystemExit(f"--consolidates: {id_number_refusal('P', part, int(number.group(1)), tailed)}; nothing was written")
            parts.append(found or brief_id("P", part) or part.strip())
        args.consolidates = ",".join(parts)
    slice_arg = getattr(args, "slice", None)
    if isinstance(slice_arg, str):
        args.slice = _resolve_slice_arg(slice_arg.strip())


def stale_docs(phases=None) -> dict:
    """`{doc: {phase_id: note_count}}` -- every durable doc named by a `## Doc impact` note that no
    consolidation has paid yet. The doc-side view of the same debt `consolidation_debt_line` states
    phase-side.

    Why it matters: an owed note is evidence *newer* than the doc's latest version, so on that
    subject `docs/current` trails the code. The doc is then stale evidence to read against the
    notes, never current truth -- which is a fact about the doc a reader is choosing, not about the
    phase, so it is surfaced where docs are read.

    Composed from the helpers that already exist (`phases_owing_consolidation`,
    `phase_doc_impact_notes`, `doc_impact_docs`) so `docs`, `validate` and `docs-debt` can never
    disagree about which docs are affected. Best effort, exactly like `doc_impact_docs`: a note
    naming no known doc is counted under `UNASSIGNED_DOC` rather than guessed at, and a phase whose
    notebook is gone contributes nothing instead of raising.
    """
    owing = phases_owing_consolidation(all_active_phases() if phases is None else phases)
    per_doc = {}
    for phase in owing:
        pdir = ROOT / phase["path"] if phase.get("path") else ACTIVE / str(phase.get("id"))
        for note in phase_doc_impact_notes(pdir):
            for doc in doc_impact_docs(note) or [UNASSIGNED_DOC]:
                per_doc.setdefault(doc, {}).setdefault(phase["id"], 0)
                per_doc[doc][phase["id"]] += 1
    return per_doc


def stale_docs_line(stale: dict) -> str:
    """One advisory `key=value` line naming the stale docs, or "" when none are -- shared by `docs`
    and `validate` so the listing and the warning can never word it differently (the
    `consolidation_debt_line` / `oversized_sections_line` pattern).

    Distinct from `consolidation_owed=`, which names the *phases* that owe and the command that
    pays: this names the *docs* a reader must not trust yet. Advisory everywhere, never an error --
    operator-paced consolidation is the design (v39 took explicit staleness instead of a cadence),
    so this must not fail CI or block the loop; it must only stop being silent.

    Deliberately NOT gated on `CONSOLIDATION_DEBT_MIN_PHASES`: that knob tunes how loud the debt is,
    and a debt can reasonably wait for a batch -- but staleness is a fact about the doc a reader is
    holding right now, and no cadence setting may quiet it.
    """
    named = sorted(d for d in stale if d != UNASSIGNED_DOC)
    if not named:
        return ""
    phases = sort_phase_ids({pid for doc in named for pid in stale[doc]})
    notes = sum(sum(stale[doc].values()) for doc in named)
    return (f"stale_docs={', '.join(named)} ({len(named)} doc(s) named by {notes} unconsolidated"
            f" '## Doc impact' note(s) from {', '.join(phases)}; docs/current is older than those notes, so"
            f" for those subjects it is stale evidence to check against them, never current truth"
            f" -- read them with docs-debt)")


def consolidation_debt_line(phases: list) -> str:
    """One advisory `key=value` line naming every phase that owes durable-doc consolidation, or
    "" when nothing does -- shared by `next` and `validate` so the two can never word it differently.

    Advisory everywhere: this is expected operator-paced state, not a fault. `validate` prints it
    as a warning and still exits 0, and `next` prints it without changing what it selects.
    Accepts either phase records or `works/index.json` entries; both are read through
    `phase_consolidation()` / `phase_execution()`, never off a raw field.
    """
    # A stamped phase still running (not `done`) has stamped `execution.consolidation: "pending"` since
    # parallel-start but owes nothing until its review passes (P35.S7); a `done` one owes, as before.
    owing = [p for p in phases_owing_consolidation(phases) if not (phase_execution(p) and p.get("status") != "done")]
    if len(owing) < CONSOLIDATION_DEBT_MIN_PHASES:
        return ""
    ids = ", ".join(p["id"] for p in owing)
    plural = "phase owes" if len(owing) == 1 else "phases owe"
    line = (f"consolidation_owed={ids} ({len(owing)} {plural} durable-doc consolidation; docs/current trails the code"
            f" until a docs phase runs doc-new-version over each '## Doc impact' list, then: docs-consolidated <P>)")
    merged = [p["id"] for p in owing if consolidation_command(p) == "parallel-consolidated"]
    if merged:
        line += f" -- {', '.join(merged)} came from a parallel branch: pay those with parallel-consolidated, on the default stream"
    return line


def new_acceptance() -> dict:
    """A fresh, undeclared operator acceptance gate. Five fields, no more."""
    return {"required": None, "walkthrough": None, "requested_at": None, "cleared_at": None, "note": None}


def phase_acceptance(data) -> dict:
    """The phase's operator acceptance gate, or None when the phase carries none (legacy).

    Shape (stamped by `new_phase` on every phase created from workspace v32 on):

        "acceptance": {
          "required": null,        # null = undeclared | true = operator-visible | false = waived
          "walkthrough": null,     # the concrete walkthrough text, recorded when the gate opens
          "requested_at": null,    # stamped by `accept-gate <P> --open`
          "cleared_at": null,      # stamped by `accept-gate <P> --clear`
          "note": null             # the operator's clearing note, or the waive reason
        }

    Absence of the whole block means legacy (an installer `--update` never touches `works/`):
    `review-phase --verdict pass` is allowed, with one advisory line and nothing more. Read the
    block only through this helper so every caller agrees on what "gated" means.
    """
    if not isinstance(data, dict):
        return None
    acceptance = data.get("acceptance")
    if not isinstance(acceptance, dict):
        return None
    required = acceptance.get("required")
    if not (required is None or isinstance(required, bool)):
        return None
    return acceptance


def acceptance_gate_is_open(data) -> bool:
    """True when the phase is waiting on the operator to walk the running product."""
    acceptance = phase_acceptance(data)
    return bool(acceptance and acceptance.get("required") is True
                and acceptance.get("requested_at") and not acceptance.get("cleared_at"))


def git_current_branch() -> str:
    """The checkout's current branch name, or None (detached HEAD, no git, not a repo).

    `symbolic-ref` first because it is right on a branch that has no commit yet (where
    `rev-parse --abbrev-ref HEAD` fails); `rev-parse` as the fallback. Any failure is
    silent: a workspace without git, or outside a repo, must keep working unchanged.
    """
    for cmd in (["git", "symbolic-ref", "--short", "-q", "HEAD"], ["git", "rev-parse", "--abbrev-ref", "HEAD"]):
        try:
            proc = subprocess.run(cmd, cwd=str(ROOT), capture_output=True, text=True, timeout=10)
        except Exception:  # noqa: BLE001 - git is optional; fall back to the default stream
            return None
        if proc.returncode != 0:
            continue
        branch = proc.stdout.strip()
        if not branch or branch == "HEAD":  # empty, or detached HEAD
            return None
        return branch
    return None


def current_stream(phases: list) -> str:
    """The parallel stream this checkout is in, or None for the default stream.

    Stream membership is the current git branch matched against the phases' stamped
    `execution.branch` -- which works identically in a `git worktree` and in a plain
    clone on another machine, and needs no marker file. Git is consulted only when at
    least one active phase is actually opted in, so an untouched workspace never shells out.
    In a nested install (P35) the key is the NESTED repo's branch -- `git_current_branch()` reads
    ROOT, the repo that owns the state -- never the host's, whose branch names follow the host's
    custom and carry no workspace IDs.
    """
    branches = set()
    for phase in phases:
        execution = phase_execution(phase)
        if execution and execution.get("branch"):
            branches.add(execution["branch"])
    if not branches:
        return None
    branch = git_current_branch()
    return branch if branch in branches else None


def stream_phases(phases: list, stream) -> list:
    """The phases the current stream may select from.

    Default stream (`stream` is None): every phase except the ones running in their own worktree (a pinned phase has no branch and stays here).
    Parallel stream: only the phase stamped with that branch. Selection, and therefore the
    `works/state.json` pointer and the `pending` halt, is scoped to one stream this way;
    the dashboards still list every active phase folder.
    """
    scoped = []
    for phase in phases:
        execution = phase_execution(phase)
        if stream is None:
            if execution is None:
                scoped.append(phase)
        elif execution and execution.get("branch") == stream:
            scoped.append(phase)
    return scoped


def resolve_current(phases: list) -> tuple:
    for phase in phases:
        if phase.get("status") == "done":
            continue
        current_phase = phase["id"]
        if phase.get("status") in ("blocked", "pending"):
            return current_phase, None, None
        open_slices = [s for s in phase["slices"] if s.get("status") != "done"]
        if open_slices:
            return current_phase, open_slices[0]["id"], open_slices[1]["id"] if len(open_slices) > 1 else None
        return current_phase, None, None
    return None, None, None


def operator_wait_target(phases: list, current_phase, current_slice):
    """The phase or slice id awaiting operator co-work (status `pending`), else None.
    `pending` means the operator must validate or run something; selection halts
    until it is cleared back to `in_progress`. Distinct from `blocked`."""
    for phase in phases:
        if phase["id"] != current_phase:
            continue
        if phase.get("status") == "pending":
            return phase["id"]
        cur = next((s for s in phase["slices"] if s["id"] == current_slice), None)
        if cur and cur.get("status") == "pending":
            return current_slice
        return wave_wait_target(phase)  # P42: a declared phase's pending slice anywhere by order; None otherwise
    return None


# run-phases (P41): the phase list and the next target of a /do-whole-phases run. A run passes a
# PARKED phase -- one whose only stop is an open operator acceptance gate -- instead of halting there.
# It is stateless: its whole input is the operator's phase tokens, which a compaction keeps, and each
# call recomputes it from disk and writes nothing. The plain pointer above (resolve_current /
# operator_wait_target, so `next`, works/state.json, the backlog and the resume card's stop) never
# reads any of this, so it still halts at a parked phase in every plain session.


def phase_parked(phase: dict) -> bool:
    """True when a run may pass this phase: `pending` with its acceptance gate open and no slice of it
    `pending` or `blocked`. Every other `pending`, and every `blocked`, halts a run."""
    return bool(phase.get("status") == "pending" and acceptance_gate_is_open(phase)
                and not any(s.get("status") in ("pending", "blocked") for s in phase.get("slices", [])))


def run_phase_tokens(tokens, stored=None) -> tuple:
    """`(phase ids, refused)`: any brief form of a phase id, separated by commas and/or spaces, in the given
    order, duplicates dropped. A number (`46`, `p46`, `P46`) is looked up like any referencing argument
    (`lookup_id_number`: an exact `P46` wins, else the one `P46-<tail>`; one that names none stays `P46` for the
    caller's no-such-phase refusal); `46-k2`, `P46-k2`, `7kq2`, `P-7kq2` and `P12` read as `brief_id`, any case.
    `refused` is `[(token, why)]`: `why` None for a token that is no phase id (a range, `worktree`, a mode word
    such as `gate`, `P7kq2` without its dash), else the text naming the phases a shared number names."""
    ids, refused, seen = [], [], set()
    for raw in tokens or []:
        for piece in re.split(r"[,\s]+", raw):
            if not piece or piece in seen:
                continue
            number = re.fullmatch(r"[Pp]?([0-9]+)", piece)
            if number:
                if stored is None:
                    stored = visible_phase_ids()
                found, tailed = lookup_id_number("P", int(number.group(1)), stored)
                if found is None and len(tailed) > 1:
                    seen.add(piece)
                    refused.append((piece, f"names {', '.join(tailed)}: type the tail"))
                    continue
                pid = found or f"P{int(number.group(1))}"
            else:
                pid = brief_id("P", piece)
            if pid is None:
                seen.add(piece)
                refused.append((piece, None))
            elif pid not in ids:
                ids.append(pid)
    return ids, refused


def _run_halt(phase: dict):
    """`(item, reason)` for the stop a run meets at a queued phase that is not parked, else None."""
    pid, status, slices = phase["id"], phase.get("status"), phase.get("slices", [])
    if status in ("pending", "blocked"):
        stuck = next((s for s in slices if s.get("status") in ("pending", "blocked")), None)
        if status == "pending" and stuck is not None and acceptance_gate_is_open(phase):
            return stuck, f"phase {pid}'s acceptance gate is open, but slice {stuck['id']} is {stuck.get('status')}, so it is not parked"
        return phase, f"phase {pid} is {status}" + (" without an open acceptance gate" if status == "pending" else "")
    cur = next((s for s in slices if s.get("status") != "done"), None)
    cur = wave_stop(phase) or cur  # P42: a declared phase halts at a stop anywhere by order
    if cur is not None and cur.get("status") in ("pending", "blocked"):
        return cur, f"slice {cur['id']} is {cur.get('status')}"
    return None


def run_selection(phases: list, stream, ids=None) -> dict:
    """A run over `ids` (None: every non-`done` phase, by order), scoped to `stream` like `next`:
    the queue, the skipped `(id, reason, stream)`, the parked phases, then either the target
    `(phase, slice, next slice)` or the halt `(item, reason)`; both None means the run is done."""
    by_id = {p["id"]: p for p in phases}
    on_stream = {p["id"] for p in stream_phases(phases, stream)}
    out = {"queue": [], "skipped": [], "parked": [], "target": None, "halt": None}
    for pid in (ids if ids is not None else [p["id"] for p in phases if p.get("status") != "done"]):
        phase = by_id.get(pid)
        if phase is None or phase.get("status") == "done":
            out["skipped"].append((pid, "done" if phase else "done (archived)", None))
        elif pid not in on_stream:
            out["skipped"].append((pid, "other-stream", (phase_execution(phase) or {}).get("branch") or "default"))
        else:
            out["queue"].append(phase)
    for phase in out["queue"]:
        if phase_parked(phase):
            out["parked"].append(phase)
        elif out["target"] is None and out["halt"] is None:
            out["halt"] = _run_halt(phase)
            if out["halt"] is None:
                open_slices = [s for s in phase.get("slices", []) if s.get("status") != "done"] + [None, None]
                out["target"] = (phase, open_slices[0], open_slices[1])
    return out


def cmd_run_phases(args: argparse.Namespace) -> None:
    """Read-only: resolve a /do-whole-phases run (see run_selection) and print it as key=value lines."""
    ids, refused = run_phase_tokens(args.tokens)
    phases = all_active_phases()
    active = {p["id"] for p in phases}
    archived = archived_phase_ids() if any(pid not in active for pid in ids) else set()
    unknown = [pid for pid in ids if pid not in active and pid not in archived]
    if refused or unknown:
        for token, why in refused:
            if why:
                print(f"refused={token} -- {why}; the run starts nothing")
                continue
            print(f"refused={token} -- not a phase id (46, P46 or 46-k2; P12; 7kq2 or P-7kq2; any case, separated by commas and/or spaces"
                  + (f"; a minted id keeps its dash: P-{token[1:].lower()}" if re.fullmatch(rf"[Pp]{ID_TOKEN_PATTERN}", token, re.I) else "")
                  + "); the run starts nothing")
        for pid in unknown:
            print(f"refused={pid} -- no such phase, active or archived; the run starts nothing")
        raise SystemExit(2)
    stream = current_stream(phases)
    run = run_selection(phases, stream, ids or None)
    print(f"run={','.join(ids) or 'all'}")
    print(f"stream={stream or 'default'}")
    print(f"queue={','.join(p['id'] for p in run['queue']) or 'none'}")
    for pid, reason, where in run["skipped"]:
        if where is None:
            print(f"skipped={pid} reason={reason}")
        else:
            home = "runs from its own branch" if where != "default" else "runs on the default stream, not in this worktree"
            print(f"skipped={pid} reason={reason} stream={where} -- {home}")
    for phase in run["parked"]:
        pid = phase["id"]
        print(f"parked={pid} since={phase_acceptance(phase).get('requested_at')} -- acceptance gate open, no slice pending or blocked: "
              f"the run passes it; accept-gate {pid} prints the walkthrough, accept-gate {pid} --clear clears it")
    if run["halt"] is not None:
        item, reason = run["halt"]
        print(f"halt={item['id']} status={item.get('status')}")
        if "." in item["id"] and item.get("status") == "pending":
            record = item.get("pending")
            print(f"stop_kind={record.get('kind') if isinstance(record, dict) else 'untyped'}")
            if isinstance(record, dict):
                print(f"on_words={_one_line(record.get('on_words') or '')}")
        print(f"halt_reason={reason} -- the whole run stops here: report it, start nothing past it")
        for line in wave_lines(next((p for p in run["queue"] if p["id"] == item["id"].split(".", 1)[0]), None)):
            print(line)
    elif run["target"] is not None:
        phase, cur, nxt = run["target"]
        print(f"target_phase={phase['id']}")
        if cur is None:
            print("target_slice=none -- no open slice in this phase: record its review verdict or archive it")
            return
        sdir = ACTIVE / phase["id"] / "slices" / cur["id"]
        print(f"target_slice={cur['id']}")
        print(f"slice_path={shown(sdir)}")
        print(f"next_slice={nxt['id'] if nxt else 'none'}")
        for line in wave_lines(phase):  # P42: declared phases only
            print(line)
        for line in notebook_step_lines(phase["id"]):  # §6: silent under budget
            print(line)
        acceptance = phase_acceptance(phase)
        if (acceptance and acceptance.get("required") is True and acceptance.get("cleared_at") and cur.get("kind") == "review"
                and (sdir / "result.md").is_file()):
            print(f"gate_cleared={phase['id']} cleared_at={acceptance.get('cleared_at')} -- the review passed before the gate opened: "
                  f"record the pass (review-phase {phase['id']} --verdict pass) without re-dispatching it")
    else:
        print("run_done=yes -- nothing left to run" + ("; report every parked gate with its walkthrough" if run["parked"] else ""))


# The ready set (P42): several slices of one phase in flight at once. A slice created with `--depends-on <id>`
# (repeatable) or `--depends-on none` is DECLARED: its slice.json carries `"depends_declared": true` beside
# `depends_on`, and that list binds -- each id names a slice of the same phase ordered strictly before it, so
# `order` stays a topological order and the plain pointer (the first open slice) always has its dependencies
# done. Every other slice is UNDECLARED (every pre-v71 slice, an advisory pre-v71 list included) and, like the
# barrier kinds, runs alone. Stateless like run-phases: recomputed from disk on every call, it writes nothing,
# and a phase with no declared slice prints, stores and halts exactly as before (the plain pointer above).
# A barrier is never a wave slice (P42.F1): while one is in_progress it holds the phase alone, nothing is
# ready, and -- unless wave slices also run -- no wave line prints, so a declared phase then reads exactly as
# an undeclared one in the same state (at an open acceptance gate the running REVIEW is the gate's, not a
# returned wave slice to finish). start-slice warns, never refuses, at a start the ready set would not make.
DEPENDS_DECLARED = "depends_declared"
BARRIER_KINDS = ("decomposition", "review", "co-work")
STOP_STATUSES = ("pending", "blocked")
DEPENDS_ON_HELP = ("a slice of this phase ordered before this one (repeat the flag for several), or `none`; either form "
                   "DECLARES the slice: its dependencies bind, and /do-whole-phase may run it beside other declared slices "
                   "once they are done. Refused (nothing written) for an id of another phase, one not ordered strictly "
                   "before this slice, or `none` beside an id. Without the flag the slice is undeclared and runs alone")


def slice_declared(s) -> bool:
    return isinstance(s, dict) and s.get(DEPENDS_DECLARED) is True


def phase_declared(phase) -> bool:
    """True when any slice of the phase, done ones included, was created with --depends-on."""
    return isinstance(phase, dict) and any(slice_declared(s) for s in phase.get("slices", []))


def slice_barrier(s: dict) -> bool:
    """A barrier runs alone: a decomposition, review or co-work slice, and every undeclared slice
    (nobody stated its file set, so nothing can be shown disjoint from it)."""
    return s.get("kind") in BARRIER_KINDS or not slice_declared(s)


def _order_of(s: dict):
    order = s.get("order", 999999)
    return order if isinstance(order, (int, float)) else 999999


def ready_set(phase: dict) -> dict:
    """`{ready, running, stops, barrier}` of one phase: lists of slices by order, and `barrier` the first
    barrier `in_progress` (else None). `running` is the wave: the non-barrier slices `in_progress`; a barrier
    never joins it, it holds the phase alone. `stops` are the open slices `pending` or `blocked`; any stop, a
    barrier in progress, or the phase itself `pending`/`blocked`, leaves `ready` empty. Else a walk over the
    open slices admits a barrier only as the first open slice with nothing running, ends at the first barrier
    either way, and admits a declared slice that is todo/ready with every dependency `done`. So an undeclared
    phase's ready set is its first open slice when that can start: the pointer."""
    slices = phase.get("slices", [])
    done = {s.get("id") for s in slices if s.get("status") == "done"}
    open_slices = [s for s in slices if s.get("status") != "done"]
    in_progress = [s for s in open_slices if s.get("status") == "in_progress"]
    out = {"ready": [], "running": [s for s in in_progress if not slice_barrier(s)],
           "barrier": next((s for s in in_progress if slice_barrier(s)), None),
           "stops": [s for s in open_slices if s.get("status") in STOP_STATUSES]}
    if out["stops"] or out["barrier"] is not None or phase.get("status") in STOP_STATUSES + ("done",):
        return out
    for i, s in enumerate(open_slices):
        startable = s.get("status") in ("todo", "ready")
        if slice_barrier(s):
            if i == 0 and startable and not out["running"]:
                out["ready"].append(s)
            break
        if startable and all(dep in done for dep in s.get("depends_on") or []):
            out["ready"].append(s)
    return out


def wave_stop(phase: dict):
    """A declared phase's first `pending`/`blocked` slice wherever it sits by order, else None: there a stop
    behind a running or finished sibling halts too (undeclared phases halt at the first open slice only)."""
    if not phase_declared(phase):
        return None
    return next((s for s in phase.get("slices", []) if s.get("status") in STOP_STATUSES), None)


def wave_wait_target(phase: dict):
    """operator_wait_target's widening: the id of a declared phase's first `pending` slice, else None."""
    stop = next((s for s in phase.get("slices", []) if s.get("status") == "pending"), None) if phase_declared(phase) else None
    return stop["id"] if stop else None


def _slice_ids(slices) -> str:
    return ",".join(s["id"] for s in slices) or "none"


def _wave_stops(phase: dict, wave: dict) -> list:
    stops = [f"{s['id']} ({s.get('status')})" for s in wave["stops"]]
    return ([f"phase {phase['id']} ({phase.get('status')})"] if phase.get("status") in STOP_STATUSES else []) + stops


def wave_held(wave: dict) -> bool:
    """True while a barrier runs alone (no wave slice beside it): a single-slice run that the plain pointer's
    lines carry, so the phase prints no wave line and reads as an undeclared phase does (P42.F1)."""
    return wave["barrier"] is not None and not wave["running"]


def wave_lines(phase) -> list:
    """`next` / `run-phases` lines for a declared phase: `ready_slices=` and `running_slices=`. Empty for an
    undeclared phase (or None), so those outputs stay byte-identical there, and while a barrier holds the phase."""
    if not phase_declared(phase):
        return []
    wave = ready_set(phase)
    if wave_held(wave):
        return []
    stops = _wave_stops(phase, wave)
    ready = f"ready_slices={_slice_ids(wave['ready'])}"
    running = f"running_slices={_slice_ids(wave['running'])}"
    if stops:
        ready += f" -- stopped by {', '.join(stops)}: nothing new starts while a stop is on disk"
        if wave["running"]:
            running += " -- already running beside the stop: wait for each, then finish and commit it"
    return [ready, running]


def _active_phase(phase_id):
    """One active phase as all_active_phases() reads it, its slices in order; None when there is none."""
    pdir = ACTIVE / phase_id if isinstance(phase_id, str) and phase_id else None
    if pdir is None or not (pdir / "phase.json").is_file():
        return None
    data = read_json(pdir / "phase.json")
    data["slices"] = [read_json(sdir / "slice.json") for sdir in slice_dirs(pdir)]
    return data


def wave_card_lines(phase: dict, sid) -> list:
    """The resume card's wave lines for a declared phase, none otherwise: a sibling's stop that the pointer's
    lines do not show, then one `wave:` line -- the running wave slices, those of them whose result.md exists
    (returned), the ready set and the stops -- with the wave's next action. A barrier is never running or
    returned there, and while one holds the phase alone the card has no `wave:` line (P42.F1)."""
    if not phase_declared(phase):
        return []
    wave, lines = ready_set(phase), []
    shown_stop = phase.get("status") in STOP_STATUSES or any(s["id"] == sid for s in wave["stops"])
    hidden = None if shown_stop else next(iter(wave["stops"]), None)
    if hidden is not None:
        hid, record = hidden["id"], hidden.get("pending")
        if hidden.get("status") == "blocked":
            lines.append(f"stop: slice {hid} blocked -- report the blocker (its result.md) to the operator")
        elif isinstance(record, dict):
            lines.append(f"stop: slice {hid} {record.get('kind')} (since {record.get('since')}) -- the operator's words will: "
                         f"{_card_cut(record.get('on_words'))}; they clear it with set-slice-status {hid} in_progress")
        else:
            lines.append(f"stop: slice {hid} untyped pending -- say what you need; the operator's words clear it with set-slice-status {hid} in_progress")
    if wave_held(wave):
        return lines
    returned = [s for s in wave["running"] if (ACTIVE / phase["id"] / "slices" / s["id"] / "result.md").is_file()]
    stops = ([phase["id"]] if phase.get("status") in STOP_STATUSES else []) + [s["id"] for s in wave["stops"]]
    then = "start nothing new: a stop is on disk" if stops else "start the ready set only while no stop is on disk"
    lines.append(f"wave: running={_slice_ids(wave['running'])}; returned={_slice_ids(returned)}; ready={_slice_ids(wave['ready'])}; "
                 f"stops={','.join(stops) or 'none'} -- in a /do-whole-phase run, wait for every running span (never re-dispatch one), "
                 f"finish each returned slice, and {then}")
    return lines


def start_warning(slice_id: str):
    """start-slice's one `warning:` line in a declared phase (OQ3, P42.F1), for a start the ready set would not
    make: a declared slice with a dependency not yet `done`, or a barrier while another slice of the phase is
    `in_progress`. None otherwise, and always None in an undeclared phase. It warns, never refuses."""
    try:
        phase = _active_phase(slice_id.split(".", 1)[0]) if isinstance(slice_id, str) else None
    except (OSError, ValueError, TypeError):  # an unreadable slice.json: the start goes on as before, unwarned
        return None
    if not phase_declared(phase):
        return None
    by_id = {s.get("id"): s for s in phase["slices"]}
    me = by_id.get(slice_id)
    if me is None:
        return None
    reasons = []
    if slice_declared(me):
        deps = [f"{dep} ({by_id[dep].get('status')})" if dep in by_id else f"{dep} (missing)"
                for dep in me.get("depends_on") or [] if (by_id.get(dep) or {}).get("status") != "done"]
        if deps:
            reasons.append(f"depends on {', '.join(deps)}, not done yet")
    if slice_barrier(me):
        beside = [s["id"] for s in phase["slices"] if s.get("status") == "in_progress" and s.get("id") != slice_id]
        if beside:
            reasons.append(f"is a barrier that runs alone, but {', '.join(beside)} {'is' if len(beside) == 1 else 'are'} in_progress")
    if not reasons:
        return None
    return f"warning: {slice_id} {', and '.join(reasons)} -- the ready set would not start it; started anyway (start-slice warns, never refuses)"


def parse_depends_on(values):
    """`--depends-on` values -> the declared ids (`[]` for `none`), or None when the flag is absent: an
    undeclared slice, created exactly as before. Refuses an empty value and `none` beside an id."""
    if values is None:
        return None
    raw = [v.strip() for v in values]
    ids = list(dict.fromkeys(v for v in raw if v.lower() != "none"))
    if "" in ids:
        raise SystemExit("--depends-on needs a slice id or none; refused, nothing was written")
    if ids and any(v.lower() == "none" for v in raw):
        raise SystemExit(f"--depends-on none declares no dependency and never stands beside a slice id (got: {', '.join(raw)}); refused, nothing was written")
    return ids


def declared_dependencies(phase_id: str, slice_id: str, order, values):
    """parse_depends_on, then rule 2 at creation: each id names an existing slice of the same phase, other
    than this one, ordered strictly before `order`. Refuses (SystemExit, nothing written) otherwise."""
    ids = parse_depends_on(values)
    if not ids:
        return ids
    siblings = {s.get("id"): s for s in (read_json(d / "slice.json") for d in slice_dirs(ACTIVE / phase_id))}
    for dep in ids:
        if dep == slice_id:
            problem = "a slice cannot depend on itself"
        elif dep.split(".", 1)[0] != phase_id:
            problem = f"not a slice of phase {phase_id}; a declared dependency names a slice of the same phase"
        elif dep not in siblings:
            problem = f"phase {phase_id} has no such slice; create it first, ordered before {slice_id}"
        elif not _order_of(siblings[dep]) < order:
            problem = (f"it is ordered at {siblings[dep].get('order')}, not before {slice_id} at {order}; a declared dependency "
                       "comes strictly earlier by --order, so order stays a topological order")
        else:
            continue
        raise SystemExit(f"--depends-on {dep}: {problem}; refused, nothing was written")
    return ids


def declared_slice_lines(kind: str, deps) -> list:
    """new-slice / promote-deferred's lines for a declared slice (none for an undeclared one)."""
    if deps is None:
        return []
    lines = [f"depends_on={','.join(deps)} (declared: binding; /do-whole-phase starts it once these are done)" if deps else
             "depends_on=none (declared: no dependency; /do-whole-phase may start it beside other ready slices)"]
    if kind in BARRIER_KINDS:
        lines.append(f"note: kind {kind} is a barrier that runs alone, so this declaration has no effect (validate warns)")
    return lines


def declaration_checks(phase: dict, s: dict, errors: list, warnings: list) -> None:
    """validate's checks of one slice's declaration. Silent for a slice with no marker key at all (every
    undeclared slice), so an undeclared workspace's validate output is unchanged."""
    if DEPENDS_DECLARED not in s:
        return
    if s.get(DEPENDS_DECLARED) is not True:
        errors.append(f"slice {s['id']} has invalid {DEPENDS_DECLARED} {s.get(DEPENDS_DECLARED)!r}; expected true "
                      "(written by new-slice/promote-deferred --depends-on) or no key at all")
        return
    if s.get("kind") in BARRIER_KINDS:
        warnings.append(f"slice {s['id']} declares its dependencies, but kind {s.get('kind')} is a barrier that runs alone: "
                        f"the declaration has no effect -- drop {DEPENDS_DECLARED} from its slice.json")
    orders = {x.get("id"): x for x in phase.get("slices", [])}
    for dep in s.get("depends_on") or []:
        if dep in orders and not _order_of(orders[dep]) < _order_of(s):
            errors.append(f"declared dependency of {s['id']} (order {s.get('order')}) on {dep} (order {orders[dep].get('order')}) "
                          "is not ordered before it; a declared dependency comes strictly earlier by order, so order stays a "
                          "topological order -- reorder one of them")
        elif dep not in orders and isinstance(dep, str) and re.fullmatch(rf"{PHASE_ID_PATTERN}\..+", dep) and dep.split(".", 1)[0] != phase["id"]:
            errors.append(f"declared dependency of {s['id']} on {dep} crosses phases; a declared dependency names a slice "
                          f"of the same phase ({phase['id']})")


# Forced declaration (v77, operator: "force engine to determine parallel run about slice when decomp"). A
# decomposition must leave every open middle slice of its phase DECLARED, so finish-slice on a decomposition
# refuses while one is not: the parallel decision is made at the cut, never left to the default. The engine,
# not the decomposition's prose, then determines what may run together (parallel_plan). An explain phase
# (`## Explain` in intent.md) is exempt: its chapters stay undeclared by design, as fix slices do. set-slice-deps
# declares a slice that was cut without the flag.
def explain_phase(pdir: Path) -> bool:
    """True when the phase's intent.md carries the `## Explain` section (the explain route's only marker)."""
    intent = pdir / "intent.md"
    return intent.is_file() and any(line.strip() == "## Explain" for line in intent.read_text(encoding="utf-8").split("\n"))


def explain_unit(pdir: Path):
    """An explain phase's publishable unit: the `- unit:` value in intent.md's `## Explain` section
    (`document` | `book` | `chapter`, lower-cased, as written: `validate` reports an unknown one), or
    `book` when the field is absent -- every explain phase before v86 is a book. None for a phase that
    is not an explain phase. `next` prints it so the orchestrator picks its reference branch."""
    if not explain_phase(pdir):
        return None
    inside = False
    for line in (pdir / "intent.md").read_text(encoding="utf-8").split("\n"):
        text = line.strip()
        if text.startswith("## "):
            if inside:
                break
            inside = text == "## Explain"
            continue
        if inside:
            m = re.match(r"[-*]\s+unit\s*:\s*(.*)$", text, re.IGNORECASE)
            if m:
                value = m.group(1).strip().strip("`").strip()
                return value.split()[0].lower() if value else EXPLAIN_UNIT_DEFAULT
    return EXPLAIN_UNIT_DEFAULT


def undeclared_middle_slices(phase: dict) -> list:
    """The open (not `done`) slices of a phase that are neither a barrier kind, a fix nor declared, by order: a
    fix slice is cut after a review, outside any decomposition's reach, and stays undeclared unless its set is known."""
    return [s for s in phase.get("slices", []) if s.get("status") != "done" and s.get("kind") not in BARRIER_KINDS + ("fix",)
            and not slice_declared(s)]


def parallel_plan(phase: dict) -> list:
    """The rounds the open slices run in, as the ready set would start them if every round finished together:
    a list of slice lists, by order. A barrier is a round of its own; declared slices whose dependencies are
    all done (or in an earlier round) share a round; an undeclared slice runs alone, like a barrier. Pure:
    it reads the slice records and writes nothing."""
    done = {s.get("id") for s in phase.get("slices", []) if s.get("status") == "done"}
    pending = [s for s in phase.get("slices", []) if s.get("status") != "done"]
    rounds = []
    while pending:
        batch = []
        for i, s in enumerate(pending):
            if slice_barrier(s):
                if i == 0:
                    batch = [s]
                break
            if all(dep in done for dep in s.get("depends_on") or []):
                batch.append(s)
        if not batch:  # unreachable while order stays topological (validate errors otherwise); never loop
            batch = [pending[0]]
        rounds.append(batch)
        done |= {s.get("id") for s in batch}
        pending = [s for s in pending if s not in batch]
    return rounds


def parallel_plan_lines(phase: dict) -> list:
    """`parallel_plan=` and `parallel_rounds=` lines for a phase's open slices (none when nothing is open)."""
    rounds = parallel_plan(phase)
    if not rounds:
        return []
    short = lambda s: str(s.get("id", "")).split(".", 1)[-1]
    shown_rounds = " -> ".join(" + ".join(short(s) for s in batch) for batch in rounds)
    together = sum(len(batch) for batch in rounds if len(batch) > 1)
    total = sum(len(batch) for batch in rounds)
    widest = max(len(batch) for batch in rounds)
    if together:
        summary = f"{len(rounds)} rounds for {total} open slices; {together} run beside another (widest round: {widest})"
    else:
        summary = f"{len(rounds)} rounds for {total} open slices; a chain: no two slices run together"
    return [f"parallel_plan={phase.get('id')}: {shown_rounds}", f"parallel_rounds={summary}"]


SLICES_BEGIN = "<!-- slices:begin -->"
SLICES_END = "<!-- slices:end -->"
# WORKFLOW_CMD is the literal `python3 scripts/workflow.py` at root (so this line stays byte-identical to
# works/templates/phase.md); a nested install's template is installed with the host-relative prefix, so
# its regenerated line carries the same one.
SLICES_GUIDANCE = f"_Generated by `{WORKFLOW_CMD} rebuild` from each slice's `slice.json`; never hand-edit this block._"


def render_slices_block(pdir: Path, phase: dict) -> str:
    """The body of the generated `## Slices` table: one row per slice, in `order`.

    This is the ONLY generated region of a phase notebook -- everything around it is the
    executors' bounded, hand-written state doc, which is why phase.md is deliberately not
    in GENERATED_FILES.
    """
    lines = [SLICES_GUIDANCE, "", "| Slice | Name | Kind / risk | Status | Outcome | Result |", "|---|---|---|---|---|---|"]
    for s in phase.get("slices", []):
        sid = s.get("id", "")
        has_result = (pdir / "slices" / str(sid) / "result.md").exists()
        result = f"[result.md](slices/{clean_cell(sid)}/result.md)" if has_result else "\u2014"
        outcome = clean_cell(s.get("outcome")) or "\u2014"
        lines.append(
            f"| `{clean_cell(sid)}` | {clean_cell(s.get('name', ''))} | "
            f"`{clean_cell(s.get('kind', ''))} / {clean_cell(s.get('risk', ''))}` | "
            f"`{clean_cell(s.get('status', ''))}` | {outcome} | {result} |"
        )
    return "\n".join(lines)


def refresh_phase_md_slices(pdir: Path, phase: dict) -> None:
    """Splice the generated slice table between the two markers of an active phase's notebook.

    A marker counts only when it is alone on its line: notebooks that merely *quote* the
    literals in prose (a plan or a decomposition table describing this very block) must not
    be spliced. No markers -> return untouched, so legacy phases and adopters who deleted
    the block stay a silent no-op, never a migration. Writes only when the spliced text
    actually differs, so plain `next`/`rebuild` calls do not dirty every notebook in the tree.
    """
    path = pdir / "phase.md"
    if not path.exists():
        return
    text = path.read_text(encoding="utf-8")
    lines = text.split("\n")
    start = next((i for i, ln in enumerate(lines) if ln.strip() == SLICES_BEGIN), None)
    end = next((i for i in range(start + 1, len(lines)) if lines[i].strip() == SLICES_END), None) if start is not None else None
    if start is None or end is None:
        return
    updated = "\n".join(lines[:start + 1] + render_slices_block(pdir, phase).split("\n") + lines[end:])
    if updated != text:
        write_text(path, updated)


def phase_md_size(pdir: Path) -> tuple:
    """(lines, bytes) of a phase notebook; (0, 0) when absent.

    Both numbers are reported, but only the byte count is judged against
    PHASE_MD_BUDGET (v39). Shared by `validate` (warning) and `finish-slice` (size print)
    so the two can never disagree about what "over budget" means.
    """
    path = pdir / "phase.md"
    if not path.exists():
        return (0, 0)
    text = path.read_text(encoding="utf-8")
    return (len(text.splitlines()), len(text.encode("utf-8")))


def notebook_sections_hint(pdir: Path, limit: int = 3) -> str:
    """`biggest sections: ## A 12345 B, ...; move long material to topics/<slug>.md` for a notebook
    that is over budget, or "" when it cannot be read. Shared by `validate` and `finish-slice`."""
    path = pdir / "phase.md"
    if not path.exists():
        return ""
    sections = sorted(h2_sections(path.read_text(encoding="utf-8")), key=lambda item: -item[1])[:limit]
    if not sections:
        return ""
    named = ", ".join(f"{heading} {size} B" for heading, size in sections)
    return f"biggest sections: {named}; move long material (contracts, signed-design summaries) to topics/<slug>.md, linked by one line, or to the slice's result.md"


def h2_spans(lines: list) -> list:
    """`(heading text, first line, end line)` for every `## ` section of a split notebook; the same
    fence-aware boundaries as `h2_sections`, in line numbers so a section can be spliced in place."""
    fenced, starts = False, []
    for i, line in enumerate(lines):
        if line.startswith("```") or line.startswith("~~~"):
            fenced = not fenced
        elif not fenced and line.startswith("## "):
            starts.append(i)
    return [(lines[i][3:].strip(), i, starts[j + 1] if j + 1 < len(starts) else len(lines)) for j, i in enumerate(starts)]


PHASE_SECTION_APPEND_ONLY = {"doc impact": "--append", "operator questions": "--append (or --resolve OQ<n> --pointer <ref>)"}
OQ_ENTRY = re.compile(r"^- \*\*OQ(\d+)\b")
OQ_PARTS = re.compile(r"^- \*\*OQ\d+[^*]*\*\*:?\s*(.*)$")

# Notebook entries. An entry is a column-0 list item of a section: ENTRY_MARKER, then its
# continuation and nested lines. `notebook_entries` is the ONE parser; every entry read and write,
# the move, the budget report and paging go through it. A pointer line is what a move leaves in an
# entry's place: one line, `<marker><gist> → [topics/<slug>.md](topics/<slug>.md) § <block>`.
ENTRY_MARKER = re.compile(r"(?:[-*+]|[0-9]+[.)]) ")
ENTRY_DEEP_HEADING = re.compile(r"#{3,}(?:\s|$)")
ENTRY_OQ = re.compile(r"\*\*OQ([0-9]+)\b")
ENTRY_KEY_PART = re.compile(r"([0-9]+)(?:\s*-\s*([0-9]+))?|OQ([0-9]+)", re.I)
TOPIC_SLUG_RE = re.compile(r"[a-z0-9][a-z0-9-]{0,63}")
POINTER_LINE = re.compile(r"(?:[-*+]|[0-9]+[.)]) .* → \[topics/([a-z0-9][a-z0-9-]{0,63})\.md\]\(topics/\1\.md\) § (\S.*)")
GIST_SENTENCE_END = re.compile(r"[.!?][*_`)\]\"'”’]*(?=\s|$)")
TOPIC_INTRO = ("_Entries moved here from phase.md by `phase-section --to-topic`, byte for byte, one `## ` block each; "
               "the pointer line left in each one's place names its block._")
# The sections a move refuses, and why (every other section moves: Decisions, Notes for later slices,
# Objective and any custom section).
PHASE_SECTION_UNMOVABLE = {
    "slices": "it is generated from each slice.json by `rebuild`",
    "doc impact": "it is append-only, and the docs phase and the review read its notes where they are (add with --append)",
    "operator questions": "it is append-only, and the review routes its entries where they are: collapse an answered one with --resolve OQ<n> --pointer <ref>",
    "now": "it is the handoff the next dispatch reads first: rewrite it shorter with --replace",
}


def notebook_entries(lines: list, first: int, end: int) -> list:
    """The entries of one notebook section, in document order: the one parser behind every
    entry read and write, the move, the budget report and paging. `lines[first:end]` is the section's
    body; for a section `(heading, i, e)` from `h2_spans`, pass `i + 1, e`.

    An entry starts at a column-0 line, outside a fence, that begins with a list marker (`- `, `* `,
    `+ `, `<digits>. `, `<digits>) `). It runs to the next such line, the next column-0 `###`-or-deeper
    heading, an unindented paragraph after a blank line, or the section's end. Its continuation and
    indented (nested) lines belong to it; its trailing blank lines are separators, not part of it. A
    line whose stripped form starts with ``` or ~~~ toggles a fence, and nothing inside a fence starts
    or ends an entry. Lines outside every entry (the italic guidance line, prose, `###` headings, table
    rows) are never touched by an entry operation.

    Each entry is a dict: `pos` (1-based), `start` and `end` (line indices, `end` exclusive and before
    the trailing blank lines), `sep_end` (the end of those blank lines, never past `end` of the
    section), `marker` (`- `, `9. `, ...), `label` (`9.`, `OQ3` or ""), `oq` (the n of a `**OQ<n>`
    lead, else None), `bytes` (UTF-8 bytes of its lines joined by newlines), `nested` (an indented
    line that starts with a list marker), `pointer` (a one-line pointer, POINTER_LINE), `long` (over
    LONG_ENTRY_BYTES or nested; a pointer is never long) and `lead` (its first line after the marker).
    """
    spans, fenced, current, prev_blank = [], False, None, False
    for k in range(first, end):
        line = lines[k]
        stripped = line.strip()
        fence = stripped.startswith("```") or stripped.startswith("~~~")
        if fenced:
            fenced = not fence
            if current is not None:
                current[1] = k + 1
            prev_blank = False
            continue
        if not stripped:
            prev_blank = True
            continue
        column0 = not line[0].isspace()
        if column0 and ENTRY_MARKER.match(line):
            current = [k, k + 1, False]
            spans.append(current)
        elif column0 and (prev_blank or ENTRY_DEEP_HEADING.match(line)):
            current = None
        elif current is not None and not column0 and ENTRY_MARKER.match(line.lstrip()):
            current[2] = True
        if current is not None:
            current[1] = k + 1
        fenced = fence
        prev_blank = False
    out = []
    for pos, (start, stop, nested) in enumerate(spans, 1):
        sep = stop
        while sep < end and not lines[sep].strip():
            sep += 1
        marker = ENTRY_MARKER.match(lines[start]).group(0)
        lead = lines[start][len(marker):]
        oq = ENTRY_OQ.match(lead)
        size = len("\n".join(lines[start:stop]).encode("utf-8"))
        pointer = stop - start == 1 and POINTER_LINE.fullmatch(lines[start].rstrip()) is not None
        label = marker.strip() if marker[0].isdigit() else (f"OQ{int(oq.group(1))}" if oq else "")
        out.append({"pos": pos, "start": start, "end": stop, "sep_end": sep, "marker": marker, "label": label,
                    "oq": int(oq.group(1)) if oq else None, "bytes": size, "nested": nested, "pointer": pointer,
                    "long": not pointer and (nested or size > LONG_ENTRY_BYTES), "lead": lead})
    return out


def entry_ranges(positions) -> str:
    """`1-8,10` for positions 1..8 and 10: a set of entry positions in the form `--entry` takes."""
    runs = []
    for pos in sorted(set(positions)):
        if runs and pos == runs[-1][1] + 1:
            runs[-1][1] = pos
        else:
            runs.append([pos, pos])
    return ",".join(str(a) if a == b else f"{a}-{b}" for a, b in runs)


def section_topic_slug(heading: str) -> str:
    """The topic slug a suggested move uses for a section: `Notes for later slices` -> `notes-for-later-slices`."""
    slug = re.sub(r"[^a-z0-9]+", "-", heading.lower()).strip("-")[:64].strip("-")
    return slug if slug and slug != "breakdown" else "notes"


def notebook_report(phase: str, text: str) -> dict:
    """The one budget report of a notebook (design §4), read by the index, finish-slice, validate and
    next. Returns data:

    `{"phase", "lines", "bytes", "budget": PHASE_MD_BUDGET, "over", "sections": [...], "moves": [...],
      "flagged": [...]}`; each section is `{"heading", "bytes", "budget" (None = none of its own),
    "over", "movable", "long": [the long entries' dicts from notebook_entries], "move" (the suggested
    `phase-section <P> "<Section>" --to-topic <slug> --entry <ranges>` or None), "remedy" (the fix for
    an over-budget section a move cannot shrink, or None)}`. Long entries are named only in movable
    sections (not PHASE_SECTION_UNMOVABLE); `moves` lists every section's move command; `flagged` the
    sections over their budget or holding long entries. Section bytes are `h2_sections`' bytes."""
    lines = text.split("\n")
    sections = []
    for heading, i, e in h2_spans(lines):
        key = heading.lower()
        size = len("\n".join(lines[i:e]).encode("utf-8"))
        budget = SECTION_BUDGETS.get(key, SECTION_BUDGET_DEFAULT)
        movable = key not in PHASE_SECTION_UNMOVABLE
        long_entries = [x for x in notebook_entries(lines, i + 1, e) if x["long"]] if movable else []
        move = (f'phase-section {phase} "{heading}" --to-topic {section_topic_slug(heading)} '
                f'--entry {entry_ranges(x["pos"] for x in long_entries)}') if long_entries else None
        over = budget is not None and size > budget
        remedy = SECTION_REMEDIES.get(key) if over and not move else None
        sections.append({"heading": heading, "bytes": size, "budget": budget, "over": over, "movable": movable,
                         "long": long_entries, "move": move, "remedy": remedy})
    total = len(text.encode("utf-8"))
    return {"phase": phase, "lines": len(text.splitlines()), "bytes": total, "budget": PHASE_MD_BUDGET,
            "over": total > PHASE_MD_BUDGET, "sections": sections,
            "moves": [s["move"] for s in sections if s["move"]],
            "flagged": [s for s in sections if s["over"] or s["long"]]}


def notebook_section_line(section: dict, limit: int = 8) -> str:
    """One line for a flagged section of `notebook_report`: its size against its budget, up to `limit`
    long-entry labels (a label, else the position) with `+N more`, and its move command or remedy."""
    parts = []
    if section["over"]:
        parts.append(f"{section['bytes']} B, over its {section['budget']} B budget")
    else:
        parts.append(f"{section['bytes']} B")
    if section["long"]:
        names = [x["label"] or str(x["pos"]) for x in section["long"]]
        more = f" +{len(names) - limit} more" if len(names) > limit else ""
        parts.append(f"long entries: {', '.join(names[:limit])}{more}")
    if section["move"]:
        parts.append(f"move: {section['move']}")
    elif section["remedy"]:
        parts.append(section["remedy"])
    return f"## {section['heading']}: " + "; ".join(parts)


# The required step (design §6): when a phase that is not done has a notebook over PHASE_MD_BUDGET,
# `next`, `run-phases`, `start-slice` and the resume card tell the main thread to move long entries to
# topics before the next dispatch. `notebook_step` is the one function they print from; it is silent
# (None) under budget, for a done phase and for a phase with no notebook, so those outputs never change.
NOTEBOOK_STEP_MOVES = 3


def notebook_step(phase_id) -> dict:
    """The over-budget step of one phase, or None. `{"phase", "bytes", "form": "required" | "advisory",
    "lines": [...]}`: required when a movable long entry exists (`notebook_over_budget=` and at most
    NOTEBOOK_STEP_MOVES `notebook_move=` lines), advisory when nothing can move (`notebook_over_budget=`
    naming what remains, no move line). Read-only: it never writes and never blocks anything."""
    if not phase_id:
        return None
    pdir = ACTIVE / phase_id
    notebook = pdir / "phase.md"
    if not notebook.is_file():
        return None
    try:
        if read_json(pdir / "phase.json").get("status") == "done":
            return None
    except (OSError, ValueError):
        return None
    text = notebook.read_text(encoding="utf-8")
    if len(text.encode("utf-8")) <= PHASE_MD_BUDGET:
        return None
    report = notebook_report(phase_id, text)
    head = f"notebook_over_budget={phase_id} ({report['bytes']} of {PHASE_MD_BUDGET} B) -- "
    moves = report["moves"]
    if moves:
        more = (f" (+{len(moves) - NOTEBOOK_STEP_MOVES} more moves: `phase-section {phase_id}` lists them)"
                if len(moves) > NOTEBOOK_STEP_MOVES else "")
        lines = [head + "required before the next dispatch: move long entries to topics first (gists stay, nothing is lost)" + more]
        lines.extend(f"notebook_move={m}" for m in moves[:NOTEBOOK_STEP_MOVES])
        return {"phase": phase_id, "bytes": report["bytes"], "form": "required", "lines": lines}
    remains = []
    for s in report["sections"]:
        if s["heading"].lower() == "slices":
            remains.append(f"{s['heading']} {s['bytes']} B generated")
        elif s["over"]:
            remains.append(f"{s['heading']} {s['bytes']} B: {s['remedy'] or 'no long entry left to move'}")
    if not remains:  # nothing over its own budget: name the biggest section
        big = max(report["sections"], key=lambda s: s["bytes"], default=None)
        if big:
            remains.append(f"{big['heading']} {big['bytes']} B")
    lines = [head + f"advisory: nothing left to move ({'; '.join(remains)})"]
    return {"phase": phase_id, "bytes": report["bytes"], "form": "advisory", "lines": lines}


def notebook_step_lines(phase_id) -> list:
    """`notebook_step`'s lines, or [] when it is silent."""
    step = notebook_step(phase_id)
    return step["lines"] if step else []


def dangling_pointers(pdir: Path) -> list:
    """The pointer lines of a phase notebook whose topic file or `§ <block>` does not exist, as
    `(section, entry position, topics/<slug>.md, block)`: each one is a lost decision."""
    path = pdir / "phase.md"
    if not path.exists():
        return []
    lines = path.read_text(encoding="utf-8").split("\n")
    topics, out = {}, []
    for heading, i, e in h2_spans(lines):
        for x in notebook_entries(lines, i + 1, e):
            if not x["pointer"]:
                continue
            m = POINTER_LINE.fullmatch(lines[x["start"]].rstrip())
            slug, block = m.group(1), m.group(2).strip()
            if slug not in topics:
                topic = pdir / "topics" / f"{slug}.md"
                topics[slug] = ({h.lower() for h, _, _ in h2_spans(topic.read_text(encoding="utf-8").split("\n"))}
                                if topic.is_file() else None)
            if topics[slug] is None or block.lower() not in topics[slug]:
                out.append((heading, x["pos"], f"topics/{slug}.md", block if topics[slug] is not None else None))
    return out


def paged_units(lines: list, first: int, end: int) -> list:
    """The page units of a block `lines[first:end]` (its heading at `first`, trailing blanks already
    dropped): the heading with the lines before the first entry, then each entry with its trailing
    separators, and each non-entry line after an entry on its own. `(start, stop, entry pos or None)`."""
    entries = notebook_entries(lines, first + 1, end)
    units, cur = [], first
    for x in entries:
        if not units:
            units.append((first, x["start"], None))
        else:
            units += [(k, k + 1, None) for k in range(cur, x["start"])]
        stop = min(x["sep_end"], end)
        units.append((x["start"], stop, x["pos"]))
        cur = stop
    if not entries:
        return [(first, end, None)]
    units += [(k, k + 1, None) for k in range(cur, end)]
    return units


def paged_print(lines: list, first: int, end: int, title: str, next_cmd: str, page) -> None:
    """Print a section or topic block `lines[first:end]` (trailing blanks dropped), paged (design §5).
    Without `page`, a block at or under PAGE_BYTES prints whole and unchanged; over it, page 1. A page
    packs whole units (an entry is never split; a unit bigger than a page gets its own) and opens with
    `<!-- page i of n · <title> · entries a–b of m · next: <next_cmd> --page i+1 -->` (`last page` on
    the last). Drop the header lines, concatenate the pages, and the result is the plain print."""
    while end > first + 1 and not lines[end - 1].strip():
        end -= 1
    plain = "\n".join(lines[first:end])
    if page is None and len(plain.encode("utf-8")) <= PAGE_BYTES:
        print(plain)
        return
    pages, size = [], 0
    for unit in paged_units(lines, first, end):
        ubytes = len("\n".join(lines[unit[0]:unit[1]]).encode("utf-8")) + 1
        if pages and size + ubytes <= PAGE_BYTES:
            pages[-1].append(unit)
            size += ubytes
        else:
            pages.append([unit])
            size = ubytes
    n, want = len(pages), page or 1
    if want < 1 or want > n:
        raise SystemExit(f"{title} has {n} page{'' if n == 1 else 's'}, so --page {want} names none")
    total = len(notebook_entries(lines, first + 1, end))
    chosen = pages[want - 1]
    pos = [u[2] for u in chosen if u[2] is not None]
    span = f"entries {pos[0]}–{pos[-1]} of {total}" if pos else f"entries none of {total}"
    tail = f"next: {next_cmd} --page {want + 1}" if want < n else "last page"
    print(f"<!-- page {want} of {n} · {title} · {span} · {tail} -->")
    print("\n".join(lines[chosen[0][0]:chosen[-1][1]]))


def resolve_entry_key(entries: list, key: str, section: str, phase: str, several: bool = False) -> list:
    """The entries `--entry K` names, in document order; SystemExit naming why when it names none or,
    unless `several`, more than one. K is a position (1-based), `OQ<n>`, or, with `several`, ranges and
    comma lists of those (`1-8,10`); any other text is a case-insensitive piece of an entry's first
    line and must match exactly one entry."""
    text = (key or "").strip()
    listing = f'phase-section {phase} "{section}" --list'
    if not text:
        raise SystemExit(f"--entry needs a key: a position, OQ<n> or a piece of the entry's first line (see {listing})")
    parts = [part.strip() for part in text.split(",")]
    matched = [ENTRY_KEY_PART.fullmatch(part) for part in parts]
    if all(matched):
        if not several and (len(parts) > 1 or matched[0].group(2)):
            raise SystemExit(f"--entry {text} names several entries; here it takes one (ranges and lists go with --to-topic only)")
        chosen = {}
        for m in matched:
            if m.group(3):
                n = int(m.group(3))
                hits = [x for x in entries if x["oq"] == n]
                if len(hits) != 1:
                    have = ", ".join(f"OQ{x['oq']} ({x['pos']})" for x in entries if x["oq"] is not None) or "none"
                    raise SystemExit(f"{'no' if not hits else 'more than one'} entry OQ{n} in {section}; its OQ entries: {have}")
            else:
                a, b = int(m.group(1)), int(m.group(2) or m.group(1))
                if a < 1 or a > b or b > len(entries):
                    raise SystemExit(f"{section} has {len(entries)} entr{'y' if len(entries) == 1 else 'ies'}, so {m.group(0)} names none (see {listing})")
                hits = entries[a - 1:b]
            for x in hits:
                chosen[x["pos"]] = x
        return [chosen[pos] for pos in sorted(chosen)]
    wanted = text.lower()
    hits = [x for x in entries if wanted in (x["marker"] + x["lead"]).lower()]
    if len(hits) == 1:
        return hits
    if not hits:
        raise SystemExit(f"no entry of {section} has {text!r} in its first line (see {listing})")
    named = "; ".join(f"{x['pos']}: {x['lead'][:60]}" for x in hits)
    raise SystemExit(f"{text!r} matches {len(hits)} entries of {section}, so it names none; use a position -- {named}")


def _markdown_closers(text: str) -> str:
    """What closes the markdown `text` leaves open: a backtick for an open code span, then `**` for
    open bold; "" when nothing is open."""
    code = bold = False
    k = 0
    while k < len(text):
        if text[k] == "`":
            code = not code
        elif not code and text.startswith("**", k):
            bold = not bold
            k += 1
        k += 1
    return ("`" if code else "") + ("**" if bold else "")


def entry_gist(entry_lines: list) -> str:
    """The derived gist of an entry: a verbatim excerpt, never a summary. The entry's text is flattened
    (its marker and its continuation lines' markers dropped, whitespace collapsed) and kept whole up to
    GIST_MAX characters. Longer, it is cut at the last sentence end (`.` `!` `?` with any closing `**`,
    backtick, bracket or quote; never `:`) between characters 40 and GIST_MAX, else at the last word
    boundary that leaves room for ` …`. Markdown is kept, and a cut never leaves a `**` or a backtick
    open: the markers it would leave open are closed at the cut, inside GIST_MAX."""
    words = []
    for line in entry_lines:
        stripped = line.strip()
        marker = ENTRY_MARKER.match(stripped)
        words.append(stripped[marker.end():] if marker else stripped)
    flat = re.sub(r"\s+", " ", " ".join(words)).strip()
    if len(flat) <= GIST_MAX:
        return flat
    best = None
    for m in GIST_SENTENCE_END.finditer(flat):
        if m.end() > GIST_MAX:
            break
        if m.end() >= 40 and m.end() + len(_markdown_closers(flat[:m.end()])) <= GIST_MAX:
            best = m.end()
    if best is not None:
        return flat[:best] + _markdown_closers(flat[:best])
    for cut in range(GIST_MAX - 2, 0, -1):
        if flat[cut] == " " and cut + len(_markdown_closers(flat[:cut])) + 2 <= GIST_MAX:
            return flat[:cut] + _markdown_closers(flat[:cut]) + " \u2026"
    kept = flat[:GIST_MAX - 5]  # no word boundary at all: one long token (a URL, a path)
    return kept + _markdown_closers(kept) + " \u2026"


def gist_plain_chars(gist: str, entry: dict) -> int:
    """The characters of plain text a gist keeps once its links (whole, bare URLs too), its markdown and
    the entry's own label are stripped: under GIST_PLAIN_MIN, the gist is a bare link."""
    text = re.sub(r"!?\[[^\]]*\]\([^)]*\)", " ", gist)
    text = re.sub(r"<?https?://\S+", " ", text)
    if entry.get("oq") is not None:
        text = re.sub(rf"\bOQ{entry['oq']}\b", " ", text)
    text = re.sub(r"[*_`~#>\[\]…]", "", text)
    return len(re.sub(r"\s+", " ", text).strip())


def entry_block_label(entry: dict) -> str:
    """The label of a moved entry's topic block: its own number, its OQ<n>, else its position."""
    if entry["marker"][0].isdigit():
        return entry["marker"].strip()[:-1]
    if entry["oq"] is not None:
        return f"OQ{entry['oq']}"
    return str(entry["pos"])


def _topic_blocks_missing(text: str, blocks: list) -> list:
    """The names of `blocks` (`(name, entry lines)`) that `text` does not hold as a `## <name>` line, a
    blank line, then those lines byte for byte: the move's check, run before it touches phase.md."""
    lines = text.split("\n")
    found = {}
    for heading, i, e in h2_spans(lines):
        if lines[i] == f"## {heading}":
            found.setdefault(heading, (i, e))
    missing = []
    for name, body in blocks:
        if name not in found:
            missing.append(name)
            continue
        i, e = found[name]
        got, want = lines[i + 1:e], [""] + list(body)
        while got and not got[-1].strip():
            got.pop()
        while len(want) > 1 and not want[-1].strip():
            want.pop()
        if got != want:
            missing.append(name)
    return missing


def _phase_section_body(args: argparse.Namespace) -> str:
    """The text for --replace / --append: `--file`, else stdin."""
    if args.file:
        try:
            body = Path(args.file).read_text(encoding="utf-8")
        except OSError as exc:
            raise SystemExit(f"cannot read --file {args.file}: {exc}")
    else:
        body = sys.stdin.read()
    return body


def _clean_section_body(body: str, heading: str) -> list:
    """The body as lines. A `## ` heading line inside it is refused (it would split the section),
    except the section's own heading as a first line, which is dropped."""
    lines = body.strip("\n").split("\n") if body.strip() else []
    if lines and lines[0].strip().lower() == f"## {heading}".lower():
        lines = lines[1:]
        while lines and not lines[0].strip():
            lines = lines[1:]
    if not lines:
        raise SystemExit("empty text: nothing to write")
    if h2_spans(lines):
        raise SystemExit("the text contains a `## ` heading line, which would split the section; use deeper headings (### ) or write the other section with its own call")
    return lines


def _phase_section_flags(args: argparse.Namespace, mode) -> None:
    """Refuse the flag combinations `phase-section` has no meaning for, naming the right form."""
    if args.topic is not None and (mode or args.list or args.entry is not None or args.gist is not None or args.dry_run):
        raise SystemExit("--topic reads a topic file: give it a block name or nothing (a topic is written by --to-topic, or directly)")
    if args.list and (mode or args.entry is not None):
        raise SystemExit("--list is a read: it takes a section name, no --entry and no write flag")
    if (args.gist is not None or args.dry_run) and mode != "--to-topic":
        raise SystemExit(f"{'--gist' if args.gist is not None else '--dry-run'} works with --to-topic only")
    if args.entry is not None and mode == "--append":
        raise SystemExit("--append adds at the section's end and takes no --entry (to change one entry: --entry K --replace)")
    if args.entry is not None and mode == "--resolve":
        raise SystemExit("--resolve names its entry itself (--resolve OQ<n> --pointer <ref>) and takes no --entry")
    if args.page is not None:
        if mode:
            raise SystemExit(f"--page is a read: it takes no {mode}")
        if args.list or args.entry is not None:
            raise SystemExit(f"--page pages a whole section or topic block; it takes no {'--list' if args.list else '--entry'}")
        if args.page < 1:
            raise SystemExit(f"--page counts from 1, got {args.page}")
    if mode == "--remove" and args.entry is None:
        raise SystemExit("--remove needs --entry K: it deletes one entry, never a section")


def _phase_topic_read(args: argparse.Namespace, pdir: Path, name: str) -> None:
    """`phase-section <P> [<block>] --topic <slug>`: the topic's index (its `## ` blocks with bytes, then
    the total), or one block, heading included, paged like a section (`paged_print`)."""
    slug = args.topic.strip()
    if not TOPIC_SLUG_RE.fullmatch(slug):
        raise SystemExit(f"--topic takes a slug [a-z0-9][a-z0-9-]{{0,63}} (the file topics/<slug>.md), got {args.topic!r}")
    topic = pdir / "topics" / f"{slug}.md"
    if not topic.is_file():
        have = sorted(p.stem for p in (pdir / "topics").glob("*.md")) if (pdir / "topics").is_dir() else []
        raise SystemExit(f"phase {args.phase} has no topics/{slug}.md; its topics: {', '.join(have) or 'none'}")
    text = topic.read_text(encoding="utf-8")
    if not name:
        if args.page is not None:
            raise SystemExit("--page pages one block: give the block name (the index is never paged)")
        for heading, size in h2_sections(text):
            print(f"{size:>8}  {heading}")
        print(f"{len(text.encode('utf-8')):>8}  total")
        return
    lines = text.split("\n")
    spans = h2_spans(lines)
    for heading, i, e in spans:
        if heading.lower() == name.lower():
            paged_print(lines, i, e, heading, f'phase-section {args.phase} "{heading}" --topic {slug}', args.page)
            return
    blocks = ", ".join(f"`{h}`" for h, _, _ in spans) or "none"
    print(f"unknown block: {name!r} in topics/{slug}.md; its blocks are {blocks}", file=sys.stderr)
    raise SystemExit(1)


def _phase_section_entry_write(args: argparse.Namespace, path: Path, text: str, lines: list, heading: str, i: int, e: int) -> None:
    """`--entry K --replace` swaps exactly that entry's lines; `--entry K --remove` deletes it with its
    trailing separator (the last entry of a section takes the blank lines before it instead, so the
    section still ends with its blank line). Every other byte of the file stays identical."""
    key = heading.lower()
    flag = "--replace" if args.replace else "--remove"
    if key == "slices":
        raise SystemExit("`Slices` is generated from each slice.json by `rebuild`; never write it")
    if key in PHASE_SECTION_APPEND_ONLY:
        raise SystemExit(f"`{heading}` is append-only: use {PHASE_SECTION_APPEND_ONLY[key]}, never --entry {flag}")
    if args.remove and key == "decisions":
        raise SystemExit("`Decisions` keeps every decision: replace a superseded one in place (--entry K --replace), never --remove")
    entries = notebook_entries(lines, i + 1, e)
    entry = resolve_entry_key(entries, args.entry, heading, args.phase)[0]
    old_size = len("\n".join(lines[entry["start"]:entry["end"]]).encode("utf-8"))
    if args.replace:
        new = _clean_section_body(_phase_section_body(args), heading)
        while new and not new[-1].strip():
            new.pop()
        if not ENTRY_MARKER.match(new[0]):
            new[0] = entry["marker"] + new[0].lstrip()  # text without a marker takes the old entry's marker
        parsed = notebook_entries(new, 0, len(new))
        if len(parsed) > 1:
            raise SystemExit(f"the text holds {len(parsed)} entries; --entry K --replace writes exactly one (add the others with --append)")
        if not parsed or parsed[0]["start"] != 0 or parsed[0]["end"] != len(new):
            raise SystemExit("the text is not one entry: a `###` heading or an unindented paragraph after a blank line would stand outside it; indent its continuation lines, or write the rest with --append")
        lines[entry["start"]:entry["end"]] = new
        after = notebook_entries(lines, i + 1, e + len(new) - (entry["end"] - entry["start"]))
        if len(after) != len(entries) or (after[entry["pos"] - 1]["start"], after[entry["pos"] - 1]["end"]) != (entry["start"], entry["start"] + len(new)):
            raise SystemExit("the text would change the entries around it (a fence it opens and never closes?); nothing written")
        verb, new_size = "replaced", len("\n".join(new).encode("utf-8"))
    else:
        if entry["sep_end"] < e:
            del lines[entry["start"]:entry["sep_end"]]
        else:
            first = entry["start"]
            while first > i + 1 and not lines[first - 1].strip():
                first -= 1
            del lines[first:entry["end"]]
        verb, new_size = "removed", 0
    updated = "\n".join(lines)
    if updated != text:
        write_text(path, updated)
    print(f"{verb}={heading} entry={entry['pos']} bytes={old_size}->{new_size} phase_md={len(updated.encode('utf-8'))}")


def _phase_section_move(args: argparse.Namespace, pdir: Path, archived: bool, path: Path, lines: list, heading: str, i: int, e: int) -> None:
    """`--to-topic <slug> [--entry K] [--gist TEXT] [--dry-run]`: move entries to `topics/<slug>.md`,
    losslessly. Each entry is appended as a `## <Section> <label>` block holding its lines byte for
    byte, the topic is re-read and every block verified, and only then is phase.md rewritten, each
    entry replaced by one pointer line carrying a verbatim gist. A failure between the two writes
    leaves a duplicate, never a loss. Every refusal is named and nothing is written."""
    key = heading.lower()
    slug = args.to_topic.strip()
    if archived and not args.dry_run:
        raise SystemExit(f"phase {args.phase} is archived; its notebook is read-only (--dry-run still reads it)")
    if key in PHASE_SECTION_UNMOVABLE:
        raise SystemExit(f"`{heading}` cannot move to a topic: {PHASE_SECTION_UNMOVABLE[key]}")
    if not TOPIC_SLUG_RE.fullmatch(slug):
        raise SystemExit(f"--to-topic takes a slug [a-z0-9][a-z0-9-]{{0,63}} (the file is topics/<slug>.md), got {args.to_topic!r}")
    if slug == "breakdown":
        raise SystemExit("the slug `breakdown` is refused: each decomposition pass rewrites topics/breakdown.md whole, so entries moved there would be lost; pick another slug")
    entries = notebook_entries(lines, i + 1, e)
    if not entries:
        raise SystemExit(f"`{heading}` has no entries to move (an entry is a column-0 list item: `- `, `* `, `+ `, `1. `, `1) `)")
    reasons, skipped = [], []
    if args.entry is not None:
        chosen = resolve_entry_key(entries, args.entry, heading, args.phase, several=True)
        reasons += [f"entry {x['pos']} is already a pointer line: nothing to move" for x in chosen if x["pointer"]]
    else:  # the whole section: entries already moved stay as they are
        chosen = [x for x in entries if not x["pointer"]]
        skipped = [x["pos"] for x in entries if x["pointer"]]
        if not chosen:
            raise SystemExit(f"every entry of `{heading}` is already a pointer line: nothing to move")
    given = args.gist.strip() if args.gist is not None else None
    if given is not None and len(chosen) != 1:
        reasons.append(f"--gist gives one entry's gist, but this move takes {len(chosen)} entries: move that entry alone (--entry K --gist TEXT), or let the gists derive")
    if given is not None and ("\n" in given or not given):
        reasons.append("--gist must be one non-empty line")
    plans = []
    for x in chosen:
        if x["pointer"]:
            continue
        body = lines[x["start"]:x["end"]]
        gist = given if given is not None else entry_gist(body)
        plain = gist_plain_chars(gist, x)
        if plain < GIST_PLAIN_MIN:
            reasons.append(f"entry {x['pos']}: {'the given' if given is not None else 'its derived'} gist {gist!r} keeps {plain} characters of plain text once markdown, links and the label are stripped, under the {GIST_PLAIN_MIN}-character floor (a bare link): give it a gist that says what the entry holds (--entry {x['pos']} --gist TEXT)")
        plans.append((x, body, gist))
    if reasons:
        for reason in reasons:
            print(f"refused: {reason}", file=sys.stderr)
        raise SystemExit(f"--to-topic refused, nothing written ({len(reasons)} reason{'' if len(reasons) == 1 else 's'} above)")
    rel = f"topics/{slug}.md"
    topic = pdir / "topics" / f"{slug}.md"
    old_topic = topic.read_text(encoding="utf-8") if topic.is_file() else ""
    if old_topic.strip():
        base = old_topic if old_topic.endswith("\n") else old_topic + "\n"
    else:
        base = f"# {args.phase} — {slug}\n\n{TOPIC_INTRO}\n"
    taken = {h.lower() for h, _, _ in h2_spans(base.split("\n"))}
    blocks, added, pointers = [], [], []
    for x, body, gist in plans:
        label = f"{heading} {entry_block_label(x)}"
        name, n = label, 2
        while name.lower() in taken:
            name, n = f"{label} ({n})", n + 1
        taken.add(name.lower())
        blocks.append((name, body))
        added.append(f"\n## {name}\n\n" + "\n".join(body) + "\n")
        pointers.append(f"{x['marker']}{gist} → [{rel}]({rel}) § {name}")
    new_topic = base + "".join(added)
    new_lines = list(lines)
    for (x, _, _), pointer in reversed(list(zip(plans, pointers))):
        new_lines[x["start"]:x["end"]] = [pointer]
    end = e - sum(x["end"] - x["start"] - 1 for x, _, _ in plans)
    after = notebook_entries(new_lines, i + 1, end)
    if (_topic_blocks_missing(new_topic, blocks) or len(after) != len(entries)
            or any(not after[x["pos"] - 1]["pointer"] for x, _, _ in plans)):
        raise SystemExit(f"--to-topic refused, nothing written: the blocks would not read back from {rel} byte for byte, "
                         f"or a pointer line would not parse as one (an unclosed fence in the topic or the entry?)")
    updated = "\n".join(new_lines)
    keys = entry_ranges(x["pos"] for x, _, _ in plans)
    old_size = len("\n".join(lines[i:e]).encode("utf-8"))
    new_size = len("\n".join(new_lines[i:end]).encode("utf-8"))
    tail = f"to={rel} bytes={old_size}->{new_size} phase_md={len(updated.encode('utf-8'))}"
    note = f"skipped={entry_ranges(skipped)} (already pointer lines)" if skipped else ""
    if args.dry_run:
        for pointer in pointers:
            print(pointer)
        print(f"would_move={heading} entries={keys} {tail} saved={old_size - new_size} (dry run: nothing written)")
        if note:
            print(note)
        return
    write_text(topic, new_topic)
    missing = _topic_blocks_missing(topic.read_text(encoding="utf-8"), blocks)
    if missing:
        raise SystemExit(f"{rel} does not hold {', '.join(missing)} byte for byte after the write; phase.md is unchanged, "
                         f"so nothing is lost (check the topic for a partial copy)")
    write_text(path, updated)
    print(f"moved={heading} entries={keys} {tail}")
    if note:
        print(note)


def phase_section(args: argparse.Namespace) -> None:
    """Read or write ONE `## ` section of a phase's phase.md (v61), or one entry of it: the
    notebook is an index, so a reader prints a section or an entry and a writer replaces, appends,
    removes or moves one, never the whole file.

    No name prints the index (a line per heading with its bytes, then the total). `--replace`
    keeps the heading and every other byte of the file; the generated `Slices` section and the
    two append-only sections refuse it and name the right flag. `--resolve OQ<n> --pointer <ref>`
    collapses one Operator Questions entry to a single resolved line (entries are never deleted).
    `--list` lists a section's entries (`notebook_entries`); `--entry K` prints one, and with
    `--replace` / `--remove` writes only it. `--to-topic <slug>` moves entries verbatim into
    `topics/<slug>.md`, leaving one pointer line each; `--topic <slug>` reads that file.
    A write happens only when the text changes; an archived phase is read-only.
    """
    pdir, archived = _find_phase_dir(args.phase)
    name = " ".join(args.name).strip().lstrip("#").strip() if args.name else ""
    modes = [flag for flag, on in (("--replace", args.replace), ("--append", args.append), ("--resolve", bool(args.resolve)),
                                   ("--remove", args.remove), ("--to-topic", args.to_topic is not None)) if on]
    if len(modes) > 1:
        raise SystemExit(f"choose one of {', '.join(modes)}")
    _phase_section_flags(args, modes[0] if modes else None)
    if args.topic is not None:
        _phase_topic_read(args, pdir, name)
        return
    path = pdir / "phase.md"
    if not path.exists():
        raise SystemExit(f"phase {args.phase} has no phase.md")
    text = path.read_text(encoding="utf-8")
    lines = text.split("\n")
    spans = h2_spans(lines)
    headings = ", ".join(f"`{h}`" for h, _, _ in spans)

    def find(wanted: str):
        for heading, i, e in spans:
            if heading.lower() == wanted.lower():
                return heading, i, e
        print(f"unknown section: {wanted!r}; the headings are {headings}", file=sys.stderr)
        raise SystemExit(1)

    if not modes:
        if not name:
            if args.page is not None:
                raise SystemExit(f"--page needs a section name (the index is never paged); the headings are {headings}")
            if args.list or args.entry is not None:
                raise SystemExit(f"{'--list' if args.list else '--entry'} needs a section name; the headings are {headings}")
            report = notebook_report(args.phase, text)
            if not report["flagged"]:  # nothing over or long: the index exactly as before
                for sec in report["sections"]:
                    print(f"{sec['bytes']:>8}  {sec['heading']}")
            else:  # bytes, budget and flags per section, the heading still last
                for sec in report["sections"]:
                    flags = ",".join(f for f, on in (("over", sec["over"]), (f"long:{len(sec['long'])}", sec["long"])) if on) or "-"
                    budget = sec["budget"] if sec["budget"] is not None else "-"
                    print(f"{sec['bytes']:>8}  {budget:>6}  {flags:<12} {sec['heading']}")
            over = " \u2014 OVER BUDGET" if report["over"] else ""
            print(f"{report['bytes']:>8}  total (budget {PHASE_MD_BUDGET}){over}")
            for sec in report["flagged"]:
                if sec["move"]:
                    print(f"move: {sec['move']}")
                elif sec["remedy"]:
                    print(f"fix ## {sec['heading']}: {sec['remedy']}")
            return
        heading, i, e = find(name)
        if args.list:
            entries = notebook_entries(lines, i + 1, e)
            if not entries:
                print(f"`{heading}` has no entries", file=sys.stderr)
            for x in entries:
                flags = ",".join(f for f, on in (("long", x["long"]), ("nested", x["nested"]), ("pointer", x["pointer"])) if on) or "-"
                lead = x["lead"] if len(x["lead"]) <= 80 else x["lead"][:80] + "…"
                print(f"{x['pos']:>4}  {x['label'] or '-':<5} {x['bytes']:>7} B  {flags:<18} {lead}")
            return
        if args.entry is not None:
            entry = resolve_entry_key(notebook_entries(lines, i + 1, e), args.entry, heading, args.phase)[0]
            print("\n".join(lines[entry["start"]:entry["end"]]))
            return
        paged_print(lines, i, e, heading, f'phase-section {args.phase} "{heading}"', args.page)
        return
    if args.to_topic is not None:
        if not name:
            raise SystemExit(f"--to-topic needs a section name; the headings are {headings}")
        heading, i, e = find(name)
        _phase_section_move(args, pdir, archived, path, lines, heading, i, e)
        return
    if archived:
        raise SystemExit(f"phase {args.phase} is archived; its notebook is read-only")
    if args.entry is not None:
        if not name:
            raise SystemExit(f"--entry needs a section name; the headings are {headings}")
        heading, i, e = find(name)
        _phase_section_entry_write(args, path, text, lines, heading, i, e)
        return
    if args.resolve:
        if name and name.lower() != "operator questions":
            raise SystemExit("--resolve works on `Operator Questions` only; omit the section name")
        if not args.pointer:
            raise SystemExit("--resolve needs --pointer <ref> (where the answer landed: a Decisions line, a deferred job, a slice)")
        heading, i, e = find("Operator Questions")
        want = re.fullmatch(r"OQ(\d+)", args.resolve.strip(), re.I)
        if not want:
            raise SystemExit(f"--resolve takes OQ<n>, got {args.resolve!r}")
        n = want.group(1)
        entry = None
        for k in range(i + 1, e):
            m = OQ_ENTRY.match(lines[k])
            if m and m.group(1) == n:
                entry = k
                break
        if entry is None:
            have = ", ".join(f"OQ{OQ_ENTRY.match(ln).group(1)}" for ln in lines[i + 1:e] if OQ_ENTRY.match(ln)) or "none"
            raise SystemExit(f"no Operator Questions entry OQ{n}; entries: {have}")
        if re.match(r"^- \*\*OQ\d+\*\* \(resolved", lines[entry]):
            raise SystemExit(f"OQ{n} is already resolved")
        end = entry + 1
        while end < e and not lines[end].startswith("- "):
            end += 1
        block = lines[entry:end]
        while len(block) > 1 and not block[-1].strip():  # blank separators stay where they were
            block.pop()
            end -= 1
        parts = OQ_PARTS.match(block[0])
        question = (parts.group(1).strip() if parts else "")
        if not question:
            question = next((ln.strip() for ln in block[1:] if ln.strip()), "")
        if len(question) > 160:
            question = question[:157].rstrip() + "..."
        lines[entry:end] = [f"- **OQ{n}** (resolved \u2192 {args.pointer}): {question}"]
        updated, label = "\n".join(lines), f"OQ{n}"
        old_size = len("\n".join(block).encode("utf-8"))
        new_size = len(lines[entry].encode("utf-8"))
    else:
        if not name:
            raise SystemExit(f"{modes[0]} needs a section name; the headings are {headings}")
        heading, i, e = find(name)
        key = heading.lower()
        if key == "slices":
            raise SystemExit("`Slices` is generated from each slice.json by `rebuild`; never write it")
        if args.replace and key in PHASE_SECTION_APPEND_ONLY:
            raise SystemExit(f"`{heading}` is append-only: use {PHASE_SECTION_APPEND_ONLY[key]}, never --replace")
        body = _clean_section_body(_phase_section_body(args), heading)
        old_section = lines[i:e]
        if args.replace:
            new_section = [lines[i], ""] + body + [""]
        else:
            new_section = list(old_section)
            while new_section and not new_section[-1].strip():
                new_section.pop()
            new_section += body + [""]
        lines[i:e] = new_section
        updated, label = "\n".join(lines), heading
        old_size = len("\n".join(old_section).encode("utf-8"))
        new_size = len("\n".join(new_section).encode("utf-8"))
    if updated != text:
        write_text(path, updated)
    verb = "replaced" if args.replace else "appended" if args.append else "resolved"
    print(f"{verb}={label} bytes={old_size}->{new_size} phase_md={len(updated.encode('utf-8'))}")


def rebuild_index_and_state() -> None:
    phases = all_active_phases()
    # Selection (pointer + operator halt) is scoped to this checkout's stream; the
    # dashboards below still list every active phase, parallel ones included.
    stream = current_stream(phases)
    selectable = stream_phases(phases, stream)
    current_phase, current_slice, next_slice = resolve_current(selectable)
    waiting_on = operator_wait_target(selectable, current_phase, current_slice)
    deferred = deferred_jobs()
    rebuilt_at = now_iso()
    index = {
        "active_phases": [
            {
                "id": p["id"], "name": p["name"], "objective": p["objective"], "status": p["status"],
                "order": p.get("order"), "path": p["path"],
                "review_status": p.get("review", {}).get("status"),
                "current_slice": next((s["id"] for s in p["slices"] if s.get("status") != "done"), None),
                "slice_count": len(p["slices"]),
                "done_slice_count": sum(1 for s in p["slices"] if s.get("status") == "done"),
                **({"execution": phase_execution(p)} if phase_execution(p) else {}),
                **({"pinned": True} if phase_pinned(p) else {}),
                **({"consolidation": phase_consolidation(p)} if phase_consolidation(p) else {}),
            } for p in phases
        ],
        "deferred_open_count": len(deferred.get("open", [])),
        "deferred_promoted_count": len(deferred.get("promoted", [])),
        "deferred_dropped_count": len(deferred.get("dropped", [])),
        "last_rebuilt_at": rebuilt_at,
    }
    write_json_stamped(WORKS / "index.json", index, "last_rebuilt_at", rebuilt_at)
    mode = "waiting" if waiting_on else ("phase" if current_phase else "idle")
    state = {"current_phase": current_phase, "current_slice": current_slice, "next_slice": next_slice, "waiting_on_operator": waiting_on, "mode": mode}
    if stream:  # only ever present in a parallel-phase checkout
        state["stream"] = stream
    write_json_stamped(WORKS / "state.json", state, "updated_at", rebuilt_at)
    rebuild_backlog(phases, state, index)
    rebuild_deferred_dashboard(deferred)
    for p in phases:  # only the marker-delimited ## Slices block; archived phases are never touched
        refresh_phase_md_slices(ROOT / p["path"], p)
    if stream:  # a parallel stream's state just changed: the default checkout's dashboards follow it live
        refresh_default_checkout()


DEFAULT_REFRESH_ENV = "AGENTIC_WORKSPACE_REFRESHING_DEFAULT"


def _default_checkout_root():
    """The workspace root in this repo's main checkout when this checkout is one of its linked
    worktrees, else None (the main checkout itself, no git, or a common dir that is not a plain
    `.git`, as in `_main_host_checkout_agents`)."""
    try:
        proc = subprocess.run(["git", "rev-parse", "--path-format=absolute", "--git-common-dir"],
                              cwd=str(ROOT), capture_output=True, text=True, timeout=10)
    except Exception:  # noqa: BLE001 - best effort: no refresh is the honest fallback
        return None
    common = Path(proc.stdout.strip()) if proc.returncode == 0 and proc.stdout.strip() else None
    if common is None or common.name != ".git":
        return None
    root = (common.parent / _repo_prefix()).resolve()
    return None if root == ROOT.resolve() else root


def refresh_default_checkout() -> None:
    """Rerun the default checkout's OWN engine `rebuild` from a parallel stream (workspace v67), so
    its `works/backlog.md` follows this phase whether or not anything runs there. Its rebuild reads
    this phase from this worktree's files (`streams_section`); the files it rewrites are generated
    and stay uncommitted there. Best effort and silent: a missing engine, a failure or a timeout
    never blocks this stream, and the env guard stops a refresh from refreshing again."""
    if os.environ.get(DEFAULT_REFRESH_ENV):
        return
    root = _default_checkout_root()
    engine = root / "scripts" / "workflow.py" if root is not None else None
    if engine is None or not engine.is_file():
        return
    try:
        subprocess.run([sys.executable, str(engine), "rebuild"], cwd=str(root), capture_output=True, text=True,
                       timeout=60, env={**os.environ, DEFAULT_REFRESH_ENV: "1"})
    except Exception:  # noqa: BLE001 - never block the stream on the default checkout's dashboards
        pass


def _phase_at_worktree(worktree: str, phase_id: str):
    """`(phase data, slices)` of one phase as its worktree's files hold them right now (uncommitted
    progress included), or None when the worktree or its phase folder cannot be read."""
    pdir = Path(worktree) / _repo_prefix() / "works" / "phases" / "active" / phase_id
    try:
        data = json.loads((pdir / "phase.json").read_text(encoding="utf-8"))
        slices = [json.loads((s / "slice.json").read_text(encoding="utf-8"))
                  for s in (sorted((pdir / "slices").iterdir()) if (pdir / "slices").is_dir() else [])
                  if (s / "slice.json").is_file()]
    except (OSError, ValueError):
        return None
    if not isinstance(data, dict) or not all(isinstance(s, dict) for s in slices):
        return None
    slices.sort(key=lambda d: d.get("order", 999999))
    return data, slices


def _phase_progress(phase_like: dict, slices: list) -> tuple:
    """`(current slice id or "none", "n/m")` for one phase as read from some source."""
    slices = slices or []
    cur = next((x.get("id") for x in slices if x.get("status") != "done"), None)
    return (cur or "none", f"{sum(1 for x in slices if x.get('status') == 'done')}/{len(slices)}")


def streams_section(phases: list, state: dict, live=None) -> list:
    """The `## Streams` table for `works/backlog.md` (P35.S7): the default stream plus every stamped
    phase still in flight, each read live from where its slices actually advance.

    A parallel phase's slice progress lives on its own branch, so this checkout's copy of it stands
    still until the merge. Each phase read from elsewhere lands in `live` (phase id -> (phase data,
    slices, where it was read)), so `rebuild_backlog` renders its `## Active Phases` row and its
    slice table from the same read. Rows: this checkout's own stream first
    when it is a parallel one (from its working tree), then the `default` row (this checkout's
    pointer on the default stream; on a parallel stream the base branch's pointer, from
    `execution.base_branch`, else the local copy), then one row per other in-flight phase, read
    from its worktree's files while that worktree is on disk (workspace v67: uncommitted progress
    included), then its branch, then `origin/<branch>`, else the local copy -- labelled so. Git is touched
    only when a stamped phase is in flight (the same gate as `current_stream`); with none, this is
    a single working-tree default row and no git call is made. The Host branch column is nested only.
    """
    nested = NESTED is not None
    stream = state.get("stream")
    own = next((p for p in phases if stream and (phase_execution(p) or {}).get("branch") == stream), None)
    others = [p for p in phases if phase_in_flight(p) and p is not own]
    use_git = bool((own or others) and _git_available())
    rows = []

    base_dir = str(HOST_ROOT or ROOT)

    def where(worktree):  # the default homes sit under the checkout's root: print them relative to it, keeping the tracked file free of home paths
        if worktree and os.path.isabs(worktree) and os.path.commonpath([base_dir, worktree]) == base_dir:
            return os.path.relpath(worktree, base_dir)
        return worktree

    def add(stream_cell, phase_id, status, cur, done, host, worktree, source):
        worktree = where(worktree)
        cells = [f"`{clean_cell(stream_cell)}`", f"`{clean_cell(phase_id)}`" if phase_id else "-", clean_cell(status) or "-",
                 f"`{clean_cell(cur)}`" if cur else "-", done or "-"]
        if nested:
            cells.append("detached" if host is HOST_DETACHED else f"`{clean_cell(host)}`" if host else "-")
        cells += [f"`{clean_cell(worktree)}`" if worktree else "-", clean_cell(source)]
        rows.append("| " + " | ".join(cells) + " |")

    if own is not None:
        execution = phase_execution(own)
        cur, done = _phase_progress(own, own["slices"])
        short = _parallel_verdict_pair(own["id"], own.get("status"), (own.get("review") or {}).get("status"), own["slices"],
                                       phase_consolidation(own), None, False, True)[0]
        add(stream, own["id"], short, cur, done, _host_branch_cell(execution), execution.get("worktree"), "working tree")

    # The default row.
    if own is None:
        pid, cur_slice = state.get("current_phase"), state.get("current_slice")
        phase = next((p for p in phases if p["id"] == pid), None)
        if phase is None:
            add("default", None, "idle", None, None, None, None, "working tree")
        else:
            _, done = _phase_progress(phase, phase["slices"])
            add("default", pid, phase.get("status"), cur_slice or "none", done, None, None, "working tree")
    else:
        base = (phase_execution(own) or {}).get("base_branch")
        plist, source = None, "local copy"
        if base and use_git:
            plist = _phases_at_ref(base)
            if plist is not None:
                source = f"branch {base}"
        sel = stream_phases(plist if plist is not None else phases, None)
        target = next((q for q in sel if q.get("status") != "done"), None)
        if target is None:
            add("default", None, "idle", None, None, None, None, source)
        else:
            if plist is not None:
                target["slices"] = _slices_at_ref(base, target["id"]) or []
                if live is not None:
                    live[target["id"]] = (target, target["slices"], f"branch `{clean_cell(base)}`")
            cur_slice = resolve_current([target])[1]
            _, done = _phase_progress(target, target["slices"])
            add("default", target["id"], target.get("status"), cur_slice or "none", done, None, None, source)

    for p in others:
        execution = phase_execution(p)
        branch = execution.get("branch")
        data, slices, source = p, p["slices"], "local copy"
        branch_gone, merged = False, None
        on_disk = _phase_at_worktree(execution["worktree"], p["id"]) if use_git and isinstance(execution.get("worktree"), str) else None
        if on_disk is not None:
            (data, slices), source = on_disk, "worktree"
            if live is not None:
                live[p["id"]] = (data, slices, f"its worktree `{clean_cell(where(execution['worktree']))}`")
        if use_git and branch:
            for candidate in ((branch, f"origin/{branch}") if on_disk is None else ()):
                found = _phase_json_at_ref(candidate, p["id"])
                if found is not None:
                    data, slices, source = found, _slices_at_ref(candidate, p["id"]) or [], f"branch {candidate}"
                    if live is not None:
                        live[p["id"]] = (data, slices, f"branch `{clean_cell(candidate)}`")
                    break
            branch_gone = not _branch_exists(branch)
            if not branch_gone:
                merged = _git(["merge-base", "--is-ancestor", branch, "HEAD"], check=False).returncode == 0
        short = _parallel_verdict_pair(p["id"], data.get("status"), (data.get("review") or {}).get("status"), slices,
                                       phase_consolidation(p), merged, branch_gone, False)[0]
        cur, done = _phase_progress(data, slices)
        add(branch or "-", p["id"], short, cur, done, _host_branch_cell(execution), execution.get("worktree"), source)

    head = ["Stream", "Phase", "Status", "Current slice", "Done"] + (["Host branch"] if nested else []) + ["Worktree", "Source"]
    return ["## Streams", "", "| " + " | ".join(head) + " |", "|" + "---|" * len(head)] + rows + [""]


def installed_workspace_version():
    """The installer's marker version (`works/.workspace-version.json`), or None when missing, unreadable or not an int."""
    try:
        version = read_json(WORKS / ".workspace-version.json").get("workspace_version")
    except (OSError, ValueError, AttributeError):
        return None
    return version if isinstance(version, int) and not isinstance(version, bool) else None


def rebuild_backlog(phases: list, state: dict, index: dict) -> None:
    lines = [
        "# Backlog", "", "> Generated dashboard. Do not put detailed task context here; edit phase/slice/deferred folders instead.",
        "> Status box: `[x]` done · `[~]` pending — waiting on operator · `[r]` ready — plan approved, awaiting execution · `[ ]` open/in progress.", "",
        "## Pointer", "",
        f"- Current phase: `{state.get('current_phase') or 'none'}`",
        f"- Current slice: `{state.get('current_slice') or 'none'}`",
        f"- Next slice: `{state.get('next_slice') or 'none'}`",
        f"- Waiting on operator: `{state.get('waiting_on_operator') or 'none'}`",
    ]
    if state.get("stream"):  # only in a parallel-phase checkout; absent on the default stream
        lines.append(f"- Stream: `{clean_cell(state['stream'])}` (parallel phase checkout; the pointer above is scoped to it)")
    live = {}  # phase id -> (phase data, slices, where) for every phase streams_section read from elsewhere
    version = installed_workspace_version()
    lines += [
        f"- Open deferred jobs: `{index.get('deferred_open_count', 0)}`",
        f"- Workspace version: `{'unknown' if version is None else f'v{version}'}`", "",
        *streams_section(phases, state, live),
        "## Active Phases", "", "| Phase | Status | Review | Name | Current Slice | Path |", "|---|---|---|---|---|---|",
    ]
    if not phases:
        lines.append("| - | - | - | - | - | - |")
    for p in phases:
        data, slices, _ = live.get(p["id"], (p, p["slices"], None))
        current = next((s["id"] for s in slices if s.get("status") != "done"), "none")
        name = clean_cell(p.get("name", ""))
        review = clean_cell((data.get("review") or {}).get("status"))
        current_cell = f"`{current}`"
        execution = phase_execution(p)
        if execution:  # runs on its own branch; read from it when git could reach it, else this checkout's copy
            current_cell += f" · parallel: `{clean_cell(execution.get('branch'))}`"
        elif phase_pinned(p):  # v42's legacy pin; since v43 the default stream needs no marker
            current_cell += " · pinned: default stream"
        lines.append(f"| [{status_box(data.get('status'))}] `{p['id']}` | `{data.get('status')}` | `{review}` | {name} | {current_cell} | `{p['path']}` |")
    for p in phases:
        _, slices, read_from = live.get(p["id"], (p, p["slices"], None))
        lines.extend(["", f"## Phase {p['id']}: {p['name']}", ""])
        if read_from:  # its slices advance elsewhere: show them as that worktree or branch records them
            lines.extend([f"_Read live from {read_from}, where this phase advances._", ""])
        lines.extend(["| Slice | Status | Name | Kind | Path |", "|---|---|---|---|---|"])
        for s in slices:
            checkbox = status_box(s.get("status"))
            name = clean_cell(s.get("name", ""))
            path = s.get("path") or f"{p['path']}/slices/{s['id']}"  # slice.json read at a ref carries no path
            lines.append(f"| [{checkbox}] `{s['id']}` | `{s['status']}` | {name} | `{clean_cell(s.get('kind', ''))}` | `{path}` |")
    lines.append("")
    write_text(WORKS / "backlog.md", "\n".join(lines))


def validate() -> int:
    errors: list = []
    warnings: list = []
    phases = all_active_phases()
    seen_phases, seen_slices = set(), set()
    seen_branches: dict = {}
    all_slice_ids = {s["id"] for p in phases for s in p["slices"]}
    archived_ids = archived_phase_ids()
    for p in phases:
        if p["id"] in seen_phases:
            errors.append(f"duplicate phase id: {p['id']}")
        seen_phases.add(p["id"])
        # Ids: all three shapes are valid and nothing is renamed, so these two only WARN -- an adopter's
        # history must keep validating. Creation is the hard gate (new-phase refuses either case).
        if not PHASE_ID_RE.fullmatch(str(p["id"])):
            warnings.append(f"phase id {p['id']!r} has an unknown shape; expected P<n>-<tail> (P46-k2), P<n> (P12) or a minted P-<token> (P-7kq2) -- nothing renames it")
        if p["id"] in archived_ids:
            warnings.append(f"active phase {p['id']} has the same id as an archived phase; an archived id is spent, so lookups by id "
                            "(phase-scope, the meter, events.jsonl) mix the two -- new phases are minted (new-phase without --phase)")
        if p["status"] not in PHASE_STATUSES:
            errors.append(f"invalid phase status {p['id']}: {p['status']}")
        review_status = p.get("review", {}).get("status")
        if p["status"] == "done" and review_status != "pass":
            errors.append(f"phase {p['id']} is done but review status is {review_status!r}; record a passing review with review-phase")
        if p["status"] == "done":
            unfinished = [s["id"] for s in p["slices"] if s.get("status") != "done"]
            if unfinished:
                errors.append(f"phase {p['id']} is done but has unfinished slices: {', '.join(unfinished)}; a passing review closes the REVIEW slice")
        # Optional doc-consolidation debt. Absent = nothing owed (every phase reviewed before
        # this field existed, and every phase whose `## Doc impact` list was empty).
        if "consolidation" in p and p.get("consolidation") not in CONSOLIDATION_STATES:
            errors.append(f"phase {p['id']} has invalid consolidation {p.get('consolidation')!r}; expected one of {sorted(CONSOLIDATION_STATES)}")
        # Optional docs-phase marker (v51): the active phases a docs phase pays. Absent = not a docs phase.
        if "consolidates" in p:
            paid = p.get("consolidates")
            if not (isinstance(paid, list) and paid and all(isinstance(v, str) and PHASE_ID_RE.fullmatch(v) for v in paid)):
                errors.append(f"phase {p['id']} has invalid consolidates {paid!r}; expected a non-empty list of phase ids such as [\"P26\", \"P46-k2\", \"P-7kq2\"] (written by new-phase --consolidates)")
        # Optional parallel-execution block. Absent = default stream = nothing to check.
        # A phase that merged `done` while its doc consolidation is still pending
        # (`consolidation: "pending"`) is a legitimate state and passes cleanly here.
        if "execution" in p:
            execution = p.get("execution")
            if not isinstance(execution, dict):
                errors.append(f"phase {p['id']} has a non-object execution block: {execution!r}")
            else:
                mode = execution.get("mode")
                if mode not in EXECUTION_MODES and mode != PINNED_MODE:
                    errors.append(f"phase {p['id']} has invalid execution.mode {mode!r}; expected one of {sorted(EXECUTION_MODES | {PINNED_MODE})}")
                elif mode == PINNED_MODE:
                    pass  # v42's legacy pin to the default stream: no branch, no worktree, nothing else to check
                else:
                    branch = execution.get("branch")
                    if not isinstance(branch, str) or not branch.strip():
                        errors.append(f"phase {p['id']} is parallel but has no execution.branch; the branch name is the stream key")
                    elif branch in seen_branches:
                        errors.append(f"duplicate execution.branch {branch!r}: {seen_branches[branch]} and {p['id']}")
                    else:
                        seen_branches[branch] = p["id"]
                    worktree = execution.get("worktree")
                    if worktree is not None and not isinstance(worktree, str):
                        errors.append(f"phase {p['id']} has invalid execution.worktree {worktree!r}; expected a path string or null")
                    consolidation = execution.get("consolidation")
                    if consolidation is not None and consolidation not in CONSOLIDATION_STATES:
                        errors.append(f"phase {p['id']} has invalid execution.consolidation {consolidation!r}; expected one of {sorted(CONSOLIDATION_STATES)} or null")
                    errors.extend(_nested_execution_problems(p["id"], execution))
                    if "repos" in execution:  # P40.S6: a worktree set's repo half (multi-repo only)
                        _nested_execution_repo_problems(p["id"], execution, errors, warnings)
                    unstamped = _unstamped_set_warning(p["id"], execution)  # P40.S8: nested only, a live host worktree only
                    if unstamped:
                        warnings.append(unstamped)
        # Optional operator acceptance gate. Absent = legacy phase = nothing to check and
        # NO warning: nagging every pre-v32 phase on every run would clutter the dashboards.
        if "acceptance" in p:
            acceptance = p.get("acceptance")
            if not isinstance(acceptance, dict):
                errors.append(f"phase {p['id']} has a non-object acceptance block: {acceptance!r}")
            else:
                required = acceptance.get("required")
                if not (required is None or isinstance(required, bool)):
                    errors.append(f"phase {p['id']} has invalid acceptance.required {required!r}; expected true (operator-visible), false (waived) or null (undeclared)")
                for field in ("walkthrough", "note", "requested_at", "cleared_at"):
                    value = acceptance.get(field)
                    if value is not None and not isinstance(value, str):
                        errors.append(f"phase {p['id']} has invalid acceptance.{field} {value!r}; expected a string or null")
                if p["status"] == "done" and required is True and not acceptance.get("cleared_at"):
                    errors.append(f"phase {p['id']} is done but its operator acceptance gate was never cleared; the operator must walk the running product (accept-gate {p['id']} --open/--clear)")
        # Optional host anchors (P28): written only by a nested install's new-phase / passing review.
        # Absent = an at-root or pre-nested phase = nothing to check.
        if "host_anchors" in p:
            anchors = p.get("host_anchors")
            if not isinstance(anchors, dict):
                errors.append(f"phase {p['id']} has a non-object host_anchors block: {anchors!r}")
            else:
                for key, value in anchors.items():
                    if key not in HOST_ANCHOR_KEYS:
                        errors.append(f"phase {p['id']} has unknown host_anchors.{key}; expected only {', '.join(HOST_ANCHOR_KEYS)}")
                    elif value is not None and not (isinstance(value, str) and re.fullmatch(r"[0-9a-f]{7,64}", value)):
                        errors.append(f"phase {p['id']} has invalid host_anchors.{key} {value!r}; expected a host commit sha or null")
        if "repo_anchors" in p and nested_repos():
            _repo_anchor_problems(p, errors, warnings)
        if not (ACTIVE / p["id"] / "intent.md").exists():
            warnings.append(f"phase {p['id']} has no intent.md (expected {p['id']}/intent.md); capture operator intent via the create-phase skill")
        unit = explain_unit(ACTIVE / p["id"])
        if unit is not None and unit not in EXPLAIN_UNITS:
            errors.append(f"phase {p['id']} has an unknown explain unit {unit!r} in intent.md's ## Explain; expected one of "
                          f"{', '.join(EXPLAIN_UNITS)} (an absent unit reads {EXPLAIN_UNIT_DEFAULT})")
        # Bounded notebook (v35). Warnings only: `validate` prints them and still exits 0.
        # A `done` phase is skipped for the budget: its notebook is closed history waiting
        # to be archived, so "rewrite it under budget" is advice nobody can act on -- the
        # check must bite while the phase is still running (that includes `in_review`).
        notebook = ACTIVE / p["id"] / "phase.md"
        lines_n, bytes_n = phase_md_size(notebook.parent)
        if p["status"] != "done" and bytes_n > PHASE_MD_BUDGET:
            warnings.append(f"phase {p['id']}: phase.md is {lines_n} lines / {bytes_n} bytes, over the notebook budget of {PHASE_MD_BUDGET} bytes; {notebook_sections_hint(notebook.parent)}")
        if p["status"] != "done" and notebook.exists():  # per section (design §4): over its budget, or long entries
            for section in notebook_report(p["id"], notebook.read_text(encoding="utf-8"))["flagged"]:
                warnings.append(f"phase {p['id']}: phase.md {notebook_section_line(section)}")
        for heading, pos, rel, block in dangling_pointers(notebook.parent):  # every active phase: a lost decision
            what = f"has no block `{block}`" if block is not None else "does not exist"
            warnings.append(f"phase {p['id']}: phase.md ## {heading} entry {pos} points at {rel}, which {what}: the moved entry is lost (restore the topic from git, or rewrite the pointer)")
        # Heading-line check, not a substring search: notebooks legitimately quote both
        # spellings in prose (this very rule, for one).
        if notebook.exists() and any(re.match(r"## Doc Impact\b", ln) for ln in notebook.read_text(encoding="utf-8").split("\n")):
            warnings.append(f"phase {p['id']}: phase.md has a `## Doc Impact` heading; the canonical section is `## Doc impact` (lowercase i) -- rename it so the review finds the notes")
        for s in p["slices"]:
            if s["id"] in seen_slices:
                errors.append(f"duplicate slice id: {s['id']}")
            seen_slices.add(s["id"])
            if s["phase_id"] != p["id"]:
                errors.append(f"slice phase mismatch: {s['id']} says {s['phase_id']}, folder phase is {p['id']}")
            if s["status"] not in SLICE_STATUSES:
                errors.append(f"invalid slice status {s['id']}: {s['status']}")
            # Warning, never an error: creation is the hard gate (see SLICE_KINDS), and
            # history an adopting repo cannot change must not break its validate.
            if s.get("kind") not in SLICE_KINDS:
                warnings.append(f"slice {s['id']} has unknown kind {s.get('kind')!r}; expected one of {sorted(SLICE_KINDS)} -- edit slice.json to one of them")
            if s["status"] == "ready" and not (ROOT / s["path"] / "plan.md").exists():
                errors.append(f"slice {s['id']} is ready but has no plan.md; ready asserts an operator-approved plan exists")
            if "pending" in s:  # the typed pending record (v61): {kind, on_words, since}, only while pending
                record = s.get("pending")
                if s["status"] != "pending":
                    errors.append(f"slice {s['id']} is {s['status']} but carries a pending record; set-slice-status clears it when a slice leaves pending -- remove the key")
                elif not isinstance(record, dict) or set(record) != {"kind", "on_words", "since"}:
                    errors.append(f"slice {s['id']} has a malformed pending record {record!r}; expected {{kind, on_words, since}} (set-slice-status {s['id']} pending --stop-kind ... --on-words ...)")
                else:
                    if record.get("kind") not in SLICE_STOP_KINDS:
                        errors.append(f"slice {s['id']} has unknown pending kind {record.get('kind')!r}; expected one of {list(SLICE_STOP_KINDS)}")
                    if not isinstance(record.get("on_words"), str) or not record["on_words"].strip():
                        errors.append(f"slice {s['id']}'s pending record has no on_words (what the operator's words will do)")
                    if not isinstance(record.get("since"), str) or not record["since"].strip():
                        errors.append(f"slice {s['id']}'s pending record has no since timestamp")
            for dep in s.get("depends_on", []):
                if dep not in all_slice_ids:
                    errors.append(f"missing dependency for {s['id']}: {dep}")
            declaration_checks(p, s, errors, warnings)  # P42: declared slices only; silent without the marker
    state = read_json(WORKS / "state.json") if (WORKS / "state.json").exists() else {}
    if state.get("current_phase") and state["current_phase"] not in seen_phases:
        errors.append(f"state current_phase does not exist: {state['current_phase']}")
    if state.get("current_slice") and state["current_slice"] not in seen_slices:
        errors.append(f"state current_slice does not exist: {state['current_slice']}")
    for base, allowed in [(DEFERRED_OPEN, {"deferred", "ready"}), (DEFERRED_PROMOTED, {"promoted", "done"}), (DEFERRED_DROPPED, {"dropped"})]:
        if not base.exists():
            continue
        for ddir in base.iterdir():
            if not ddir.is_dir():
                continue
            djson = ddir / "deferred.json"
            if not djson.exists():
                errors.append(f"missing deferred.json: {shown(ddir)}")
                continue
            data = read_json(djson)
            if not DEFERRED_ID_RE.fullmatch(ddir.name):
                warnings.append(f"deferred id {ddir.name!r} has an unknown shape; expected D<n>-<tail> (D92-x4), D<n> (D12) or a minted D-<token> (D-m3xa) -- nothing renames it")
            if data.get("status") not in DEFERRED_STATUSES:
                errors.append(f"invalid deferred status {data.get('id')}: {data.get('status')}")
            if data.get("status") not in allowed:
                errors.append(f"deferred job in wrong folder: {data.get('id')} status {data.get('status')} under {shown(base)}")
    # Deferred doc consolidation. A WARNING, never an error: the debt is expected operator-paced
    # state (a passing review defers consolidation to a docs phase), so it must not fail CI or
    # block the loop -- it must only stop being silent.
    debt = consolidation_debt_line(phases)
    if debt:
        warnings.append(debt)
    # ...and the doc-side half of the same debt: which docs an agent must not read as current truth
    # while it stands. A separate line because it carries what the debt line cannot -- the doc names
    # a reader chooses by -- and a WARNING for the same reason: staleness is expected, being silent
    # about it is not.
    stale = stale_docs_line(stale_docs(phases))
    if stale:
        warnings.append(stale)
    # Oversized durable-doc sections. A WARNING, never an error, for the same reason: the read-order
    # rule ("read the sections the work touches") degrades silently as sections outgrow the doc they
    # were cut from, and the remedy -- splitting one -- belongs to the next docs phase, not to CI.
    oversized = oversized_sections_line(oversized_doc_sections())
    if oversized:
        warnings.append(oversized)
    # Agent-file drift is advisory only: warn (never error, never crash) when the four managed agent
    # files disagree with the route table (executors.toml/defaults), so a foreign or partial
    # workspace still validates. Skipped when a broken nested marker names no host: the agent files
    # live there, not under ROOT.
    try:
        for _label, path, model, effort in ([] if NESTED is not None and HOST_ROOT is None else executor_agent_files(resolve_routes())):
            if not path.exists():
                warnings.append(f"missing executor agent file: {shown(path)} (run: {WORKFLOW_CMD} sync-agents)")
                continue
            current = path.read_text(encoding="utf-8")
            desired = _patched_agent_md(current, model, effort)
            if desired != current:
                warnings.append(f"executor agent file out of sync with executors.toml/defaults: {shown(path)} (run: {WORKFLOW_CMD} sync-agents)")
    except (SystemExit, Exception) as exc:  # noqa: BLE001 - advisory check must not fail validate
        warnings.append(f"executor agent config check failed: {exc}")
    # Nested personal install (P28): a malformed marker is an ERROR, so a broken nested install is
    # never mistaken for at-root mode; the host must be a git work tree (phase-scope and the
    # product commits read it). Silent at root -- no marker, nothing checked.
    if NESTED is not None:
        marker = shown(ROOT / NESTED_MARKER)
        errors.extend(f"{marker}: {problem}" for problem in NESTED_PROBLEMS)
        unknown = sorted(set(NESTED) - set(NESTED_KEYS) - set(NESTED_OPTIONAL_KEYS) - set(NESTED_NOTE_KEYS))
        if unknown:
            warnings.append(f"{marker}: unknown field(s) {', '.join(unknown)} (schema {NESTED_SCHEMA} reads only {', '.join(NESTED_KEYS + NESTED_OPTIONAL_KEYS)})")
        if "converted_from" in NESTED:
            warnings.extend(f"{marker}: {problem} (the --to-multi-repo record; only the CLAUDE.local.md line reads it)"
                            for problem in _converted_from_problems(NESTED["converted_from"]))
        if HOST_ROOT is not None and HOST_ROOT.is_dir():
            try:
                proc = subprocess.run(["git", "rev-parse", "--is-inside-work-tree"], cwd=str(HOST_ROOT), capture_output=True, text=True, timeout=10)
            except Exception:  # noqa: BLE001 - no git binary: say so, never fail on it
                warnings.append(f"git is not available, so the nested install's host {HOST_ROOT} cannot be confirmed as a git work tree")
            else:
                if proc.returncode != 0 or proc.stdout.strip() != "true":
                    errors.append(f"nested install: the host {HOST_ROOT} is not a git work tree (phase-scope and the host product commits need one)")
        if nested_repos() and HOST_ROOT is not None and HOST_ROOT.is_dir():
            nested_repo_checks(errors, warnings)
    validate_docs(errors, warnings)
    for w in warnings:
        print(f"warning: {w}")
    if errors:
        print("Workflow validation failed:")
        for e in errors:
            print(f"- {e}")
        return 1
    print("Workflow validation passed.")
    return 0


def require_phase(phase_id: str) -> Path:
    p = ACTIVE / phase_id
    if not (p / "phase.json").exists():
        raise SystemExit(f"phase not found: {phase_id}")
    return p


def require_slice(slice_id: str) -> Path:
    phase_id = slice_id.split(".", 1)[0]
    s = ACTIVE / phase_id / "slices" / slice_id
    if not (s / "slice.json").exists():
        raise SystemExit(f"slice not found: {slice_id}")
    return s


def load_template(name: str) -> str:
    return (WORKS / "templates" / name).read_text(encoding="utf-8")


def render_template(text: str, **values: str) -> str:
    for k, v in values.items():
        text = text.replace(f"__{k.upper()}__", v)
    return text


# Byte-identical to works/templates/phase.md, which is the live seed. The copy exists so
# `new-phase` still works on a tree that predates the template (an adopter yet to update);
# tests/retrofit_smoke.sh asserts the two stay identical.
PHASE_MD_TEMPLATE_FALLBACK = """# Phase __PHASE_ID__: __NAME__

_Intent: see [intent.md](intent.md)._

## Objective

__OBJECTIVE__

## Slices

<!-- slices:begin -->
_Generated by `python3 scripts/workflow.py rebuild` from each slice's `slice.json`; never hand-edit this block._
<!-- slices:end -->

## Decisions

_Durable cross-slice decisions, one gist line each. Replace a superseded line (`--entry K --replace`); never stack versions. Long detail goes to `topics/<slug>.md` behind its gist line (`--to-topic` moves one); a breakdown lives in `topics/breakdown.md`._

## Doc impact

_One line per durable-truth change: `- <doc>.md: <what changed> (<slice>)`. Append only; the review verifies this list and a later docs phase consolidates it into versions — never per slice, never at the review — a branch review adds its two gate sections here tagged `(gate section — written at merge)`._

## Operator Questions

_Questions only the operator can answer, one entry each: `- **OQ<n> (<slice>):** <question>`. Append only (`phase-section <P> "Operator Questions" --append`); an answered entry collapses with `phase-section <P> --resolve OQ<n> --pointer <ref>`, never deleted. Every entry is routed at the review — folded into the acceptance walkthrough, filed with `defer-job`, or resolved. An unrouted entry is a review finding._

## Notes for later slices

_Gotchas and constraints the next slices need, each tagged `**(from <slice>, for <slice>)**`. A slice that consumes a note removes it (`--entry K --remove`); the detail stays in that slice's `result.md`. This file is an index read and written only through `phase-section <P>`, never whole; keep it under 40 KB._

## Now

_≤ 15 lines, rewritten by every slice at its end: what is done, what the next slice must know, what is open. Last on purpose._
"""


def phase_md_template() -> str:
    """The phase-notebook seed: the shipped template when present, else the embedded copy."""
    try:
        return load_template("phase.md")
    except OSError:
        return PHASE_MD_TEMPLATE_FALLBACK


def require_slice_kind(kind: str) -> str:
    """The one place an unknown slice kind is rejected. Called from create_slice (the shared
    chokepoint for new-slice and promote-deferred) and, additionally, at the very top of
    promote-deferred: its --create-phase branch creates the phase BEFORE the slice, so a
    rejected kind must be caught before that happens rather than after."""
    if kind not in SLICE_KINDS:
        raise SystemExit(f"invalid slice kind: {kind}; expected one of {sorted(SLICE_KINDS)}")
    return kind


def create_slice(phase_id: str, slice_id: str, name: str, kind: str, order, risk: str, source: dict, depends_on=None, declared=False) -> Path:
    require_slice_kind(kind)
    require_phase(phase_id)
    if not slice_id.startswith(f"{phase_id}."):
        raise SystemExit(f"slice id must start with {phase_id}.")
    sdir = ACTIVE / phase_id / "slices" / slice_id
    if sdir.exists():
        raise SystemExit(f"slice already exists: {slice_id}")
    created = now_iso()
    data = {
        "id": slice_id, "phase_id": phase_id, "name": name, "kind": kind, "status": "todo", "order": order,
        "depends_on": depends_on or [], **({DEPENDS_DECLARED: True} if declared else {}), "created_at": created, "started_at": None, "completed_at": None, "risk": risk, "source": source,
        "paths": {"plan": "plan.md", "result": "result.md"},
        "outcome": None,  # one line, set by `finish-slice --outcome`; rendered in the phase's ## Slices table
        "validation": {"required": [], "last_run": None, "last_status": "pending"},
        "archive": {"archived": False, "archived_at": None, "archive_path": None},
    }
    write_json(sdir / "slice.json", data)
    # Neither context file is scaffolded: the orchestrator writes its free-form native
    # plan to plan.md at the slice's turn, and the executor writes its free-form
    # result.md at slice end — a fresh slice folder holds only slice.json.
    return sdir


def _with_host_anchors(data: dict, anchors: dict) -> dict:
    """`data` with `anchors` merged into its `host_anchors` block, the block placed right after
    `acceptance` (or appended) when it is new, so phase.json keeps reading naturally."""
    current = data.get("host_anchors")
    merged = dict(current) if isinstance(current, dict) else {}
    merged.update(anchors)
    if "host_anchors" in data:
        data["host_anchors"] = merged
        return data
    ordered = {}
    for key, value in data.items():
        ordered[key] = value
        if key == "acceptance":
            ordered["host_anchors"] = merged
    ordered.setdefault("host_anchors", merged)
    data.clear()
    data.update(ordered)
    return data


def _with_repo_anchors(data: dict, entries: dict) -> dict:
    """`data` with `entries` ({repo name: anchor entry}) merged into its `repo_anchors` block (P40,
    multi-repo only), the block placed right after `host_anchors` (else `acceptance`, else appended)
    when it is new -- `_with_host_anchors`' ordering idiom."""
    current = data.get("repo_anchors")
    merged = dict(current) if isinstance(current, dict) else {}
    merged.update(entries)
    if "repo_anchors" in data:
        data["repo_anchors"] = merged
        return data
    after = "host_anchors" if "host_anchors" in data else "acceptance"
    ordered = {}
    for key, value in data.items():
        ordered[key] = value
        if key == after:
            ordered["repo_anchors"] = merged
    ordered.setdefault("repo_anchors", merged)
    data.clear()
    data.update(ordered)
    return data


def _parse_consolidates(raw) -> list:
    """`new-phase --consolidates P26,P46-k2` -> `["P26", "P46-k2"]`: comma-separated, spaces tolerated,
    duplicates dropped in order. Refuses (before `new-phase` writes anything) when the flag names
    nothing, or names an id that is not an ACTIVE phase still owing doc consolidation -- a docs phase
    can only pay debt that stands. `None` (flag absent) is `[]`."""
    if raw is None:
        return []
    ids = []
    for part in raw.split(","):
        part = part.strip()
        if part and part not in ids:
            ids.append(part)
    if not ids:
        raise SystemExit("--consolidates needs at least one phase id (e.g. --consolidates P26,P46-k2)")
    active = {p["id"]: p for p in all_active_phases()}
    bad = []
    for pid in ids:
        if pid not in active:
            bad.append(f"{pid} (not an active phase)")
        elif phase_consolidation(active[pid]) != "pending":
            bad.append(f"{pid} (owes no doc consolidation: consolidation is {phase_consolidation(active[pid])!r})")
    if bad:
        raise SystemExit(f"--consolidates refused, nothing was written: {'; '.join(bad)}. It names only active phases that still owe doc consolidation (see: {WORKFLOW_CMD} docs-debt).")
    return ids


def explicit_phase_id(phase_id: str) -> str:
    """An explicit `new-phase --phase` id, checked before anything is written: any of the three shapes
    (`P46-k2` with a valid tail -- its number need not be the next one --, an old `P12`, or a v73 `P-` token),
    never one that exists active or archived (an archived id is spent), and a v73 token only as v73's mint
    would have drawn it (`id_token_refusal`). SystemExit otherwise."""
    if not PHASE_ID_RE.fullmatch(phase_id):
        raise SystemExit(f"phase must look like P46-k2 (a number and a two-symbol tail with a letter), P12 or P-7kq2"
                         f" (got {phase_id!r}); omit --phase and the engine mints one")
    if (ACTIVE / phase_id).exists():
        raise SystemExit(f"phase already exists: {phase_id}")
    if phase_id in archived_phase_ids():
        raise SystemExit(f"phase already exists (archived): {phase_id}; an archived id is spent -- omit --phase and the engine mints one")
    token = _id_token(phase_id)
    reason = id_token_refusal(token) if token else None
    if reason:
        raise SystemExit(f"phase id {phase_id} refused: {reason}; omit --phase and the engine mints one")
    return phase_id


def new_phase(args: argparse.Namespace) -> None:
    raw = getattr(args, "phase", None)
    phase_id = mint_phase_id() if raw is None else explicit_phase_id(raw)
    pdir = ACTIVE / phase_id
    consolidates = _parse_consolidates(getattr(args, "consolidates", None))  # refuses before anything is written
    order = _clean_order(args.order) if args.order is not None else max([read_json(p / "phase.json").get("order", 0) for p in phase_dirs()], default=0) + 1
    phase_data = {
        "id": phase_id, "name": args.name, "objective": args.objective, "status": "planned", "order": order,
        "created_at": now_iso(), "started_at": None, "completed_at": None,
        "review": {"status": "pending", "reviewed_at": None, "reviewer": None, "note": None},
        "acceptance": new_acceptance(),
        "paths": {"phase_md": "phase.md", "intent_md": "intent.md", "slices_dir": "slices"},
        "archive": {"archived": False, "archived_at": None, "archive_path": None},
    }
    if consolidates:
        # v51: the one marker of a docs phase -- the owing phases it pays. Absent without the flag.
        phase_data["consolidates"] = consolidates
    if NESTED is not None:
        # The nested repo never sees the host's commits, so phase-scope's base is the host HEAD now
        # (null while the host has no commit). At root this key is never written.
        phase_data = _with_host_anchors(phase_data, {"created": head_commit() or None})
    repo_stamp_lines = []
    repos = nested_repos()
    if repos:
        # P40 multi-repo: each registered repo's own range starts at its HEAD now (null while it has
        # no commit); `branch` lets phase-scope note a repo later switched to another branch.
        stamped = {}
        for repo in repos:
            rpath, why = _phase_repo_path(repo, phase_data)
            if rpath is None:
                repo_stamp_lines.append(f"repo_anchors: {repo['name']} not stamped ({why}) -- phase-scope reports it 'no anchor'")
                continue
            head = _rev_parse("HEAD", cwd=rpath)
            stamped[repo["name"]] = {"created": head, "branch": _repo_current_branch(rpath), "review_pass": None, "review_base": None}
        if stamped:
            phase_data = _with_repo_anchors(phase_data, stamped)
            repo_stamp_lines.insert(0, "repo_anchors=" + ", ".join(
                f"{n}@{(e['created'] or 'none')[:7]} ({e['branch'] or 'detached'})" for n, e in stamped.items()) + " -- phase-scope's base per repo")
    write_json(pdir / "phase.json", phase_data)
    # Seed the notebook from the template: fixed sections plus an empty generated ## Slices
    # block, which the rebuild at the end of this function fills immediately.
    write_text(pdir / "phase.md", render_template(phase_md_template(), PHASE_ID=phase_id, NAME=args.name, OBJECTIVE=args.objective))
    write_text(pdir / "intent.md", render_template(load_template("intent.md"), PHASE_ID=phase_id, CAPTURED_AT=now_iso(), ORIGIN="operator"))
    create_slice(phase_id, f"{phase_id}.DECOMP", "decompose phase", "decomposition", 0, "high", source={"type": "new_phase", "id": phase_id})
    create_slice(phase_id, f"{phase_id}.REVIEW", "phase review", "review", 9999, "high", source={"type": "new_phase", "id": phase_id})
    append_event("phase_created", phase=phase_id)
    rebuild_index_and_state()
    print(f"created phase {phase_id}: {shown(pdir)}")
    for line in repo_stamp_lines:
        print(line)
    if consolidates:
        print(f"consolidates={', '.join(consolidates)} (docs phase: pays the doc debt of those phases; docs-debt shows it as 'paid by {phase_id}')")
    # v43: a phase runs on this stream unless the operator asks for a worktree, so creation
    # stamps nothing and says nothing -- except where a worktree would actually buy something.
    if getattr(args, "on_main", False):
        print(f"note: --on-main is a no-op since v43 -- the default stream IS the default, so {phase_id} already runs here; nothing was stamped")
    # Proactive opt-in suggestion: a phase created while another one is mid-flight is the
    # first of the two moments a worktree becomes relevant. Suggestion only, never a default.
    # In a nested install (P35) the command also names the host branch the operator must choose.
    busy = next((p for p in all_active_phases() if p["id"] != phase_id and p.get("status") == "in_progress" and phase_execution(p) is None), None)
    if busy:
        print(f"hint: {busy['id']} is in progress -- this phase can run in parallel on its own branch: {WORKFLOW_CMD} parallel-start {phase_id}{NESTED_HOST_BRANCH_ARG}")


def _clean_order(value):
    """Normalize an explicit order: whole numbers stay ints, fractions stay floats so a
    slice/phase can be inserted between two neighbors (e.g. --order 4.5 sorts between 4 and 5)."""
    return int(value) if float(value).is_integer() else float(value)


def _auto_order(pdir: Path, explicit):
    if explicit is not None:
        return _clean_order(explicit)
    orders = [read_json(s / "slice.json").get("order", 0) for s in slice_dirs(pdir) if read_json(s / "slice.json").get("kind") != "review"]
    return max(orders, default=0) + 10


def new_slice(args: argparse.Namespace) -> None:
    pdir = require_phase(args.phase)
    args.slice = full_slice_id(args.phase, args.slice)  # v73: a bare suffix (S1) names a slice of --phase
    order = _auto_order(pdir, args.order)
    deps = declared_dependencies(args.phase, args.slice, order, args.depends_on)  # None: undeclared, as before
    sdir = create_slice(args.phase, args.slice, args.name, args.kind, order, args.risk, source={"type": "manual", "id": None}, depends_on=deps or [], declared=deps is not None)
    append_event("slice_created", phase=args.phase, slice=args.slice)
    rebuild_index_and_state()
    print(f"created slice {args.slice}: {shown(sdir)}")
    for line in declared_slice_lines(args.kind, deps):
        print(line)


def set_slice_deps(args: argparse.Namespace) -> None:
    """Declare an existing slice (v77): write its `depends_on` and the declared marker, under the same rules
    as `new-slice --depends-on`. Refused for a barrier kind (it runs alone) and a `done` slice (no effect)."""
    sdir = require_slice(args.slice)
    data = read_json(sdir / "slice.json")
    phase_id = sdir.parents[1].name
    if data.get("kind") in BARRIER_KINDS:
        raise SystemExit(f"set-slice-deps {args.slice}: kind {data.get('kind')} is a barrier that runs alone; refused, nothing was written")
    if data.get("status") == "done":
        raise SystemExit(f"set-slice-deps {args.slice}: the slice is done, so a declaration has no effect; refused, nothing was written")
    deps = declared_dependencies(phase_id, args.slice, _order_of(data), args.depends_on)
    if data.get(DEPENDS_DECLARED) is True and (data.get("depends_on") or []) == deps:
        print(f"unchanged {args.slice}")
    else:
        data["depends_on"], data[DEPENDS_DECLARED] = deps, True
        write_json(sdir / "slice.json", data)
        append_event("slice_declared", slice=args.slice, depends_on=deps)
        rebuild_index_and_state()
        print(f"declared {args.slice}")
    for line in declared_slice_lines(data.get("kind"), deps):
        print(line)


def cmd_parallel_plan(args: argparse.Namespace) -> None:
    """Print what the engine lets run together in a phase (v77): its open slices in rounds, the undeclared
    middle slices a decomposition must still declare, and, for an explain phase, that it stays sequential.
    Read-only: the decomposition runs it before it returns, and finish-slice prints the same plan."""
    pdir = require_phase(args.phase)
    phase = _active_phase(pdir.name) or {}
    lines = parallel_plan_lines(phase)
    if not lines:
        print(f"parallel_plan={pdir.name}: no open slice")
        return
    for line in lines:
        print(line)
    if explain_phase(pdir):
        print("note: an explain phase's chapters stay undeclared and run one at a time")
        return
    loose = undeclared_middle_slices(phase)
    if loose:
        print(f"undeclared={', '.join(str(s.get('id')) for s in loose)} (each runs alone; a decomposition cannot finish "
              f"until it declares them: {WORKFLOW_CMD} set-slice-deps <slice> --depends-on <id>|none)")


def _set_slice_status(sdir: Path, status: str, pending=None) -> str:
    """Write the status; `pending` (a {kind, on_words, since} record) is stored only with status `pending`.
    Leaving `pending` clears the record; a bare `pending` keeps one only when the slice was already pending."""
    data = read_json(sdir / "slice.json")
    old = data.get("status")
    data["status"] = status
    if status == "pending" and pending is not None:
        data["pending"] = pending
    elif status != "pending" or old != "pending":
        data.pop("pending", None)
    if status == "in_progress" and not data.get("started_at"):
        data["started_at"] = now_iso()
    if status == "done":
        data["completed_at"] = now_iso()
    write_json(sdir / "slice.json", data)
    return old


def set_slice_status(slice_id: str, status: str, pending=None) -> None:
    if status not in SLICE_STATUSES:
        raise SystemExit(f"invalid slice status: {status}")
    sdir = require_slice(slice_id)
    old = _set_slice_status(sdir, status, pending)
    extra = {"stop_kind": pending["kind"]} if pending else {}
    append_event("slice_status_changed", slice=slice_id, old_status=old, new_status=status, **extra)
    rebuild_index_and_state()


def cmd_set_slice_status(args: argparse.Namespace) -> None:
    """set-slice-status: a `pending` stop is typed with --stop-kind and --on-words (both, and only with
    `pending`); a bare `pending` still works, with one warning line."""
    stop_kind, on_words = getattr(args, "stop_kind", None), getattr(args, "on_words", None)
    on_words = _one_line(on_words) if on_words is not None else None
    pending = None
    if args.status != "pending":
        if stop_kind or on_words is not None:
            raise SystemExit(f"set-slice-status: --stop-kind/--on-words type a pending stop; refused with status {args.status!r}")
    elif stop_kind or on_words is not None:
        if not stop_kind or not on_words:
            raise SystemExit("set-slice-status: a typed pending stop needs both --stop-kind <kind> and --on-words \"<what the operator's words will do>\"")
        pending = {"kind": stop_kind, "on_words": on_words, "since": now_iso()}
    set_slice_status(args.slice, args.status, pending)
    print(f"slice {args.slice}: {args.status}" + (f" (stop_kind={stop_kind})" if pending else ""))
    if args.status == "pending" and pending is None:
        print(f"warning: untyped pending stop -- add --stop-kind <{'|'.join(SLICE_STOP_KINDS)}> --on-words \"<what the operator's words will do>\"")


def start_slice(args: argparse.Namespace) -> None:
    warning = start_warning(args.slice)  # P42.F1: declared phases only; read before the start changes the state
    set_slice_status(args.slice, "in_progress")
    print(f"started {args.slice}")
    if warning:
        print(warning)
    step = notebook_step(args.slice.split(".", 1)[0])  # §6: a warning, never a refusal
    if step:
        todo = ("required: run the notebook_move lines `next` prints before dispatching" if step["form"] == "required"
                else "advisory: nothing left to move (`next` names what remains)")
        print(f"warning: notebook {step['phase']} is over budget ({step['bytes']} of {PHASE_MD_BUDGET} B) -- {todo}")


def finish_slice(args: argparse.Namespace) -> None:
    sdir = require_slice(args.slice)
    pdir = sdir.parents[1]  # .../<phase>/slices/<slice> -> <phase>
    decomposition = read_json(sdir / "slice.json").get("kind") == "decomposition"
    if decomposition and not explain_phase(pdir):  # v77: the cut decides parallelism, never the default
        loose = undeclared_middle_slices(_active_phase(pdir.name) or {})
        if loose:
            ids = ", ".join(str(s.get("id")) for s in loose)
            raise SystemExit(f"finish-slice {args.slice}: refused, nothing was written -- a decomposition declares every middle slice "
                             f"it leaves open, and these are undeclared: {ids}. Declare each one: {WORKFLOW_CMD} set-slice-deps <slice> "
                             "--depends-on <an earlier slice of this phase> (repeatable) or --depends-on none, then finish again; "
                             f"{WORKFLOW_CMD} parallel-plan {pdir.name} shows the rounds that follow")
    outcome = (getattr(args, "outcome", None) or "").strip()
    if outcome:  # stored before the status change, so the rebuild it triggers renders the row
        data = read_json(sdir / "slice.json")
        data["outcome"] = outcome
        write_json(sdir / "slice.json", data)
    set_slice_status(args.slice, "done")
    if not outcome:  # a warning, never an error: the slice is still finished
        print(f"warning: no --outcome recorded for {args.slice}; the ## Slices row will be blank")
    print(f"finished {args.slice}")
    if decomposition:  # v77: the engine's determination of what runs together, for the orchestrator to relay
        for line in parallel_plan_lines(_active_phase(pdir.name) or {}):
            print(line)
    lines_n, bytes_n = phase_md_size(sdir.parents[1])  # .../<phase>/slices/<slice> -> <phase>
    if lines_n or bytes_n:  # the notebook is where the next slice reads its state; keep it in view
        over = " \u2014 OVER BUDGET" if bytes_n > PHASE_MD_BUDGET else ""  # bytes judge; lines are informational
        print(f"phase.md: {lines_n} lines / {bytes_n} bytes (budget {PHASE_MD_BUDGET} bytes){over}")
        if bytes_n > PHASE_MD_BUDGET:
            print(f"  {notebook_sections_hint(sdir.parents[1])}")
        report = notebook_report(pdir.name, (pdir / "phase.md").read_text(encoding="utf-8"))
        for section in report["flagged"]:  # a section over its own budget or holding long entries
            print(f"  {notebook_section_line(section)}")


def _set_phase_status(pdir: Path, status: str) -> str:
    data = read_json(pdir / "phase.json")
    old = data.get("status")
    data["status"] = status
    if status == "in_progress" and not data.get("started_at"):
        data["started_at"] = now_iso()
    if status == "done":
        data["completed_at"] = now_iso()
    write_json(pdir / "phase.json", data)
    return old


def set_phase_status(args: argparse.Namespace) -> None:
    if args.status not in PHASE_STATUSES:
        raise SystemExit(f"invalid phase status: {args.status}")
    pdir = require_phase(args.phase)
    old = _set_phase_status(pdir, args.status)
    append_event("phase_status_changed", phase=args.phase, old_status=old, new_status=args.status)
    rebuild_index_and_state()
    print(f"phase {args.phase}: {old} -> {args.status}")


def _require_acceptance_cleared(phase_id: str, data: dict) -> None:
    """Refuse a passing review while the operator acceptance gate is undeclared or uncleared.

    Called before `review_phase` writes anything. Only `pass` is ever refused: an operator's
    failure report must stay recordable as `changes_requested` (or `blocked`).
    """
    acceptance = phase_acceptance(data)
    if acceptance is None:
        if "acceptance" in data:
            print(f"acceptance: phase {phase_id} has a malformed gate block -- treated as legacy (run: {WORKFLOW_CMD} validate)")
        else:
            print("acceptance: legacy phase (no gate block) -- pass recorded without an operator acceptance gate")
        return
    required = acceptance.get("required")
    if required is None:
        raise SystemExit(
            f"phase {phase_id} has not declared whether the operator must accept it; a pass cannot be recorded yet:\n"
            f"  {WORKFLOW_CMD} accept-gate {phase_id} --require                     (operator-visible: the operator walks the running product)\n"
            f"  {WORKFLOW_CMD} accept-gate {phase_id} --waive --note \"why\"          (nothing the operator can see)")
    if required is True and not acceptance.get("cleared_at"):
        raise SystemExit(
            f"phase {phase_id} requires operator acceptance and the gate is not cleared; show the operator the running product first:\n"
            f"  {WORKFLOW_CMD} accept-gate {phase_id} --open --walkthrough \"...\"    (orchestrator, after the review executor's validation and judgment)\n"
            f"  {WORKFLOW_CMD} accept-gate {phase_id} --clear --note \"...\"          (after the operator walks it; --note is optional)")


def review_phase(args: argparse.Namespace) -> None:
    if args.verdict not in REVIEW_VERDICTS:
        raise SystemExit(f"verdict must be one of: {', '.join(sorted(REVIEW_VERDICTS))}")
    pdir = require_phase(args.phase)
    data = read_json(pdir / "phase.json")
    # Gate check first, before anything is written: a refused pass must leave no trace.
    if args.verdict == "pass":
        _require_acceptance_cleared(args.phase, data)
    data["review"] = {"status": args.verdict, "reviewed_at": now_iso(), "reviewer": args.reviewer, "note": args.note}
    if args.verdict == "changes_requested":
        acceptance = phase_acceptance(data)
        if acceptance is not None:
            # The phase is about to change again, so the gate re-opens for the re-review.
            # `required` and the operator's note survive; the walked script does not.
            acceptance.update({"walkthrough": None, "requested_at": None, "cleared_at": None})
    # Verdict drives phase status so the lifecycle stays consistent.
    status_map = {"pass": "done", "changes_requested": "in_progress", "blocked": "blocked"}
    new_status = status_map[args.verdict]
    if new_status == "done":
        data["completed_at"] = now_iso()
    data["status"] = new_status
    if args.verdict == "pass" and NESTED is not None:
        # The end of the phase's host range: phase-scope reads base..review_pass in the host.
        _with_host_anchors(data, {"review_pass": head_commit() or None})
        _freeze_host_review_base(data)
        if nested_repos():
            _freeze_repo_anchors(data)
    write_json(pdir / "phase.json", data)
    # Drive the phase's REVIEW slice from the same verdict so the phase and its
    # review slice never diverge (a pass no longer leaves REVIEW stuck in_progress).
    slice_verdict = {"pass": "done", "changes_requested": "changes_requested", "blocked": "blocked"}[args.verdict]
    for sdir in slice_dirs(pdir):
        sdata = read_json(sdir / "slice.json")
        if sdata.get("kind") == "review":
            old = _set_slice_status(sdir, slice_verdict)
            append_event("slice_status_changed", slice=sdata["id"], old_status=old, new_status=slice_verdict)
    append_event("phase_reviewed", phase=args.phase, verdict=args.verdict, reviewer=args.reviewer)
    rebuild_index_and_state()
    print(f"phase {args.phase} review: {args.verdict} (status -> {new_status})")
    if args.verdict == "changes_requested":
        print(f"create fix slices, e.g.: {WORKFLOW_CMD} new-slice --phase {args.phase} --slice {args.phase}.F1 --name \"...\" --kind fix")
    elif args.verdict == "pass":
        notes = phase_doc_impact_notes(pdir)
        if notes:
            # The review verifies the list and creates no versions; the debt is paid by an
            # operator-created docs phase. Stamp it so it is queryable and blocks archiving.
            data = read_json(pdir / "phase.json")
            set_phase_consolidation(data, "pending")
            write_json(pdir / "phase.json", data)
            append_event("phase_consolidation_owed", phase=args.phase, notes=len(notes))
            rebuild_index_and_state()
            done_cmd = "parallel-consolidated" if phase_execution(data) else "docs-consolidated"
            print(f"docs: {len(notes)} '## Doc impact' note(s) recorded -- durable docs are NOT versioned here.")
            print("  consolidation is deferred: the operator creates a docs phase for it (doc-new-version per note, then rebuild-docs).")
            print(f"  when those versions land: {WORKFLOW_CMD} {done_cmd} {args.phase}   (until then {args.phase} is held out of archiving)")
        else:
            # v86 (§9.3): parallel-start stamps every worktree phase `pending` up front; a phase whose
            # pass leaves no note changed no durable truth, so it owes nothing -- settle the debt here
            # (both fields, through the setter) or it would sit unarchivable forever.
            data = read_json(pdir / "phase.json")
            if phase_execution(data) and phase_consolidation(data) == "pending":
                set_phase_consolidation(data, "done")
                write_json(pdir / "phase.json", data)
                append_event("phase_consolidation_settled", phase=args.phase, notes=0)
                rebuild_index_and_state()
                print("docs: no '## Doc impact' note -- this worktree phase owes no doc consolidation (consolidation=done)")
        print(f"phase {args.phase} is done and stays in active/. Do NOT archive a single phase now.")
        print("Archive done phases later, whole phases only: `rotate-backlog` (it pays the doc debt first, then archives every done phase), or `archive-all` once every active phase is done.")


def _ensure_acceptance(data: dict) -> dict:
    """The phase's acceptance block, created on demand -- this is how an adopter opts a legacy
    phase in. Inserted right after `review` so phase.json keeps reading naturally; a malformed
    block is replaced by a fresh one."""
    acceptance = phase_acceptance(data)
    if acceptance is not None:
        return acceptance
    acceptance = new_acceptance()
    ordered = {}
    for key, value in data.items():
        if key == "acceptance":
            continue
        ordered[key] = value
        if key == "review":
            ordered["acceptance"] = acceptance
    ordered.setdefault("acceptance", acceptance)
    data.clear()
    data.update(ordered)
    return acceptance


def _print_acceptance(phase_id: str, acceptance) -> None:
    print(f"phase={phase_id}")
    if acceptance is None:
        print("acceptance=none (legacy phase: no gate block, so review-phase --verdict pass is allowed)")
        print(f"declare one with: {WORKFLOW_CMD} accept-gate {phase_id} --require | --waive --note \"why\"")
        return
    print(f"required={json.dumps(acceptance.get('required'))}")
    print(f"requested_at={acceptance.get('requested_at') or 'none'}")
    print(f"cleared_at={acceptance.get('cleared_at') or 'none'}")
    print(f"note={acceptance.get('note') or 'none'}")
    walkthrough = acceptance.get("walkthrough")
    if walkthrough:
        print("walkthrough:")
        print(walkthrough)
    else:
        print("walkthrough=none")


def accept_gate(args: argparse.Namespace) -> None:
    """Declare, open, clear or show a phase's operator acceptance gate.

    Orchestrator/operator command: executors never run it. The review executor returns the
    walkthrough text; the orchestrator opens the gate with it and STOPS until the operator
    has walked the running product.
    """
    pdir = require_phase(args.phase)
    data = read_json(pdir / "phase.json")
    if args.walkthrough is not None and not args.open_gate:
        raise SystemExit(f"--walkthrough belongs to --open: {WORKFLOW_CMD} accept-gate {args.phase} --open --walkthrough \"...\"")
    if not (args.require or args.waive or args.open_gate or args.clear):
        _print_acceptance(args.phase, phase_acceptance(data))  # show only: writes nothing
        return
    acceptance = phase_acceptance(data)
    message = None
    if args.require:
        acceptance = _ensure_acceptance(data)
        acceptance["required"] = True
        event = "acceptance_required"
        message = f"phase {args.phase}: operator acceptance REQUIRED -- review-phase --verdict pass refuses until the gate is opened and cleared"
    elif args.waive:
        if not args.note:
            raise SystemExit(f"accept-gate {args.phase} --waive requires --note \"why this phase changes nothing the operator can see\"")
        acceptance = _ensure_acceptance(data)
        acceptance["required"] = False
        acceptance["note"] = args.note
        event = "acceptance_waived"
        message = f"phase {args.phase}: operator acceptance WAIVED -- {args.note}"
    elif args.open_gate:
        if acceptance is None or acceptance.get("required") is not True:
            raise SystemExit(
                f"phase {args.phase} has not declared that the operator must accept it; declare it first:\n"
                f"  {WORKFLOW_CMD} accept-gate {args.phase} --require")
        if not (args.walkthrough or "").strip():
            raise SystemExit(f"accept-gate {args.phase} --open requires --walkthrough \"the concrete script: URLs to open, actions to try, in the operator runtime\"")
        acceptance["walkthrough"] = args.walkthrough
        acceptance["requested_at"] = now_iso()
        acceptance["cleared_at"] = None
        event = "acceptance_opened"
    else:  # --clear
        if acceptance is None or not acceptance.get("requested_at"):
            raise SystemExit(
                f"phase {args.phase} has no open acceptance gate (requested_at is unset); nothing to clear:\n"
                f"  {WORKFLOW_CMD} accept-gate {args.phase} --open --walkthrough \"...\"")
        acceptance["cleared_at"] = now_iso()
        if args.note:
            acceptance["note"] = args.note
        event = "acceptance_cleared"
    write_json(pdir / "phase.json", data)
    # Opening/clearing rides the existing `pending` halt -- no second halt state.
    if args.open_gate or args.clear:
        status = "pending" if args.open_gate else "in_progress"
        old = _set_phase_status(pdir, status)
        append_event("phase_status_changed", phase=args.phase, old_status=old, new_status=status)
    append_event(event, phase=args.phase)
    rebuild_index_and_state()
    if args.open_gate:
        print(f"phase {args.phase}: acceptance gate OPEN -- phase is pending [~]; do not start, finish, or advance past it")
        print("WALKTHROUGH (the operator runs this against the running product):")
        print(args.walkthrough)
        print(f"Then clear it: {WORKFLOW_CMD} accept-gate {args.phase} --clear")
        print("Add --note \"...\" to record what the operator reported.")
    elif args.clear:
        print(f"phase {args.phase}: acceptance gate CLEARED -- phase is in_progress again; review-phase --verdict pass is now allowed")
    else:
        print(message)


def _git(cmd: list, cwd=None, check: bool = True):
    """Run a git command in the workspace root. With `check`, a failure raises SystemExit
    carrying git's own message, so every parallel-mode guard fails loudly and in one style."""
    try:
        proc = subprocess.run(["git", *cmd], cwd=str(cwd or ROOT), capture_output=True, text=True)
    except FileNotFoundError:
        raise SystemExit("git is not available; parallel execution needs git")
    if check and proc.returncode != 0:
        detail = (proc.stderr or proc.stdout).strip() or f"exit {proc.returncode}"
        raise SystemExit(f"git {' '.join(cmd)} failed: {detail}")
    return proc


def _require_git_repo() -> None:
    proc = _git(["rev-parse", "--is-inside-work-tree"], check=False)
    if proc.returncode != 0 or proc.stdout.strip() != "true":
        raise SystemExit("not inside a git work tree; parallel execution needs a git repo")


def _branch_exists(branch: str) -> bool:
    return _git(["rev-parse", "--verify", "--quiet", f"refs/heads/{branch}"], check=False).returncode == 0


def _git_available(cwd=None) -> bool:
    """True when this workspace (or `cwd`: a nested install's host) sits inside a usable git work
    tree. Never raises: a workspace without git (or outside a repo) must keep working exactly as before."""
    try:
        proc = subprocess.run(["git", "rev-parse", "--is-inside-work-tree"], cwd=str(cwd or ROOT), capture_output=True, text=True)
    except Exception:  # noqa: BLE001 - git is optional
        return False
    return proc.returncode == 0 and proc.stdout.strip() == "true"


def _git_dir(common: bool = False, cwd=None) -> Path:
    """This checkout's git dir (per-worktree state: HEAD, index, MERGE_HEAD, rebase-*) or, with
    `common`, the dir every worktree shares (refs, info/exclude). Absolute either way: git prints
    `.git` relative to the cwd in the main checkout and an absolute path from a linked worktree,
    and joining onto the cwd (ROOT, or `cwd`: a nested install's host) is right in both cases."""
    flag = "--git-common-dir" if common else "--git-dir"
    base = Path(cwd) if cwd is not None else ROOT
    return (base / _git(["rev-parse", flag], cwd=cwd).stdout.strip()).resolve()


def _git_operation_in_progress(cwd=None):
    """'merge' / 'rebase' while this checkout is mid-operation, else None. `git commit -- <paths>`
    refuses a partial commit during either, so the stamp commit needs a plain HEAD. With `cwd` (a
    nested install's host, P35) a cherry-pick or a bisect counts too: the host is never touched
    mid-operation, and its branch and worktree are cut only from a plain HEAD."""
    gd = _git_dir(cwd=cwd)
    if (gd / "MERGE_HEAD").exists():
        return "merge"
    if (gd / "rebase-merge").exists() or (gd / "rebase-apply").exists():
        return "rebase"
    if cwd is not None:
        if (gd / "CHERRY_PICK_HEAD").exists():
            return "cherry-pick"
        if (gd / "BISECT_LOG").exists():
            return "bisect"
    return None


def _ensure_worktrees_excluded(cwd=None) -> None:
    """Put `.claude/worktrees/` in the common `info/exclude` once, so a nested phase worktree never
    shows as untracked (or gets swept into `git add -A` as an embedded repo) in any checkout of this
    repo. Never `.gitignore`: that file is the adopter's, tracked, and theirs to edit.

    With `cwd` (a nested install's host, P35) the line goes into the HOST's common exclude, anchored
    as `/.claude/worktrees/` like the installer's managed block, and either form counts as present."""
    exclude = _git_dir(common=True, cwd=cwd) / "info" / "exclude"
    line = f"{WORKTREES_DIR}/" if cwd is None else f"/{WORKTREES_DIR}/"
    present = {line} if cwd is None else {line, f"{WORKTREES_DIR}/"}
    existing = exclude.read_text(encoding="utf-8") if exclude.exists() else ""
    if present & {l.strip() for l in existing.splitlines()}:
        return
    sep = "" if not existing or existing.endswith("\n") else "\n"
    exclude.parent.mkdir(parents=True, exist_ok=True)
    exclude.write_text(f"{existing}{sep}# agentic workspace: per-phase git worktrees cut by parallel-start\n{line}\n", encoding="utf-8")


_REPO_PREFIX = None


def _repo_prefix() -> str:
    """The workspace root's path inside the git repo ('' at the repo root).

    `git show <ref>:<path>` and `git ls-tree` take repo-relative paths, so every
    cross-ref read below prefixes the workspace-relative path with this."""
    global _REPO_PREFIX
    if _REPO_PREFIX is None:
        _REPO_PREFIX = _git(["rev-parse", "--show-prefix"], check=False).stdout.strip()
    return _REPO_PREFIX


def _json_at_ref(ref: str, rel: str):
    """A workspace-relative JSON file as recorded at a git ref, or None when unreadable."""
    proc = _git(["show", f"{ref}:{_repo_prefix()}{rel}"], check=False)
    if proc.returncode != 0:
        return None
    try:
        return json.loads(proc.stdout)
    except ValueError:
        return None


def _phase_json_at_ref(ref: str, phase_id: str):
    return _json_at_ref(ref, f"works/phases/active/{phase_id}/phase.json")


def _phases_at_ref(ref: str):
    """Every active phase.json as recorded at a git ref (ordered), or None if the ref is unreadable.

    Lets the gate read another stream's state (main, `origin/main`, a phase branch)
    without switching checkouts -- pre-merge, main's copy of a phase branch's state is stale.
    """
    proc = _git(["ls-tree", "--name-only", ref, f"{_repo_prefix()}works/phases/active/"], check=False)
    if proc.returncode != 0:
        return None
    phases = []
    for line in proc.stdout.splitlines():
        entry = line.strip().rstrip("/")
        if not entry:
            continue
        raw = _git(["show", f"{ref}:{entry}/phase.json"], check=False)
        if raw.returncode != 0:
            continue
        try:
            data = json.loads(raw.stdout)
        except ValueError:
            continue
        data.setdefault("path", entry)
        phases.append(data)
    phases.sort(key=lambda d: (d.get("order", 999999), id_sort_key(d.get("id", ""), d.get("created_at"))))  # phase_dirs' order
    return phases


def _slices_at_ref(ref: str, phase_id: str):
    """Every slice.json of one phase as recorded at a git ref (ordered), or None if unreadable.

    The cross-stream half of `_phases_at_ref`: a phase branch's slice progress exists only on
    that branch until the merge, so reading it needs the tree at the ref, not the checkout.
    """
    proc = _git(["ls-tree", "--name-only", ref, f"{_repo_prefix()}works/phases/active/{phase_id}/slices/"], check=False)
    if proc.returncode != 0:
        return None
    slices = []
    for line in proc.stdout.splitlines():
        entry = line.strip().rstrip("/")
        if not entry:
            continue
        raw = _git(["show", f"{ref}:{entry}/slice.json"], check=False)
        if raw.returncode != 0:
            continue
        try:
            data = json.loads(raw.stdout)
        except ValueError:
            continue
        slices.append(data)
    slices.sort(key=lambda d: d.get("order", 999999))
    return slices


def _phase_branch(phase_id: str, name: str, slug_override=None) -> str:
    """`phase/P<N>-<slug>` -- the stream key every other part of parallel mode reads."""
    slug = slugify(slug_override or name, fallback=phase_id.lower())
    if len(slug) > 40:  # branch names stay short enough to type and to read in `git branch`
        slug = slug[:40].rstrip("_-.") or phase_id.lower()
    return f"phase/{phase_id}-{slug}"


def parallel_start(args: argparse.Namespace) -> None:
    """Move a planned phase into its own worktree: stamp it, commit the stamp, cut branch + worktree.

    This is the single place the engine makes a git commit, and it is deliberate. The stamp must
    exist on BOTH the default branch (so this stream's pointer skips the phase) and the phase
    branch (so the worktree session claims the stream), and the branch has to be cut from a commit
    that already contains it. Since v43 running here is the default and this command is the
    opt-in: it runs when the operator asks for a worktree (the do-* skills run it on the
    `worktree` mode word, never on their own), or straight from the operator's hand. It does not
    demand a clean tree -- the operator asks for a worktree mid-stride, not at a quiet point:
    `git add -- <paths>` then `git commit --only -- <paths>` makes the one fixed-message commit
    exact whatever else is dirty or staged -- only the phase folder plus the regenerated works/
    files go in, everything else stays behind in this checkout, and the worktree is cut from that
    commit ("start from the latest commit"). Stamping and asking the operator to commit cannot
    achieve that by construction; this can.

    In a nested personal install (P35) the phase gets a worktree PAIR instead -- see
    `_parallel_start_nested`; `--host-branch` is required there and refused at root. v86 (§9.4): an
    explain phase (`## Explain` in intent.md) may omit it -- its host worktree is cut DETACHED at the
    host base (`execution.host_branch` null), since an explain makes no host commit; `--host-branch`
    is still honoured for it, a non-explain phase still needs it, and `--repo` never goes without it.
    """
    host_branch = getattr(args, "host_branch", None)
    host_base = getattr(args, "host_base", None)
    repo_args = getattr(args, "repo", None) or []
    repo_base_args = getattr(args, "repo_base", None) or []
    if NESTED is None:
        if host_branch is not None or host_base is not None:
            raise SystemExit("--host-branch and --host-base are for a nested personal install only (they name the host repo's branch and base); "
                             "at root the phase branch is the only branch -- nothing was written")
    else:
        host_branch = (host_branch or "").strip() or None
        if host_branch is None and (repo_args or repo_base_args):
            raise SystemExit(NESTED_SET_NEEDS_HOST_BRANCH)
    set_repos = []
    if repo_args or repo_base_args:  # P40.S6: a worktree set's repos, multi-repo hosts only
        if NESTED is None:
            raise SystemExit("--repo and --repo-base are for a multi-repo host only (a nested install whose registry lists repos); "
                             "at root the phase branch is the only branch -- nothing was written")
        repos = nested_repos()
        if not repos:
            raise SystemExit("--repo and --repo-base are for a multi-repo host only; this nested install registers no repos (the host is the one repo, "
                             f"and the pair is all there is; register repos with {WORKFLOW_CMD} nested-repos --add <path>) -- nothing was written")
        set_repos = _parse_set_repo_args(repo_args, repo_base_args, repos)
    pdir = require_phase(args.phase)
    if NESTED is not None and host_branch is None and not explain_phase(pdir):
        raise SystemExit(NESTED_HOST_BRANCH_REQUIRED)  # v86: below require_phase, so an explain phase may go detached
    data = read_json(pdir / "phase.json")
    if data.get("status") != "planned":
        raise SystemExit(f"phase {args.phase} is {data.get('status')!r}; a phase enters its worktree before it starts (parallel-start needs status 'planned') -- a phase already in flight finishes on this stream")
    if phase_pinned(data):
        raise SystemExit(f"phase {args.phase} carries v42's legacy pin to the default stream (execution.mode=default, written by the old parallel-skip / new-phase --on-main); it was pinned deliberately, so un-pin it by hand: delete the execution block from {shown(pdir)}/phase.json first")
    if data.get("execution") is not None:
        raise SystemExit(f"phase {args.phase} already carries an execution block: {json.dumps(data['execution'], ensure_ascii=False)}")
    _require_git_repo()
    phases = all_active_phases()
    stream = current_stream(phases)
    if stream:
        raise SystemExit(f"this checkout is on parallel stream {stream}; run parallel-start from the default stream")
    busy = _git_operation_in_progress()
    if busy:
        raise SystemExit(f"a {busy} is in progress in this checkout; finish or abort it first -- the stamp commit must be an ordinary commit on the default branch")
    branch = _phase_branch(args.phase, data.get("name") or args.phase, args.slug)
    if _branch_exists(branch):
        raise SystemExit(f"branch already exists: {branch} (pass --slug to pick another name)")
    for p in phases:
        execution = phase_execution(p)
        if execution and execution.get("branch") == branch:
            raise SystemExit(f"branch {branch} is already stamped on phase {p['id']}")
    if NESTED is not None:
        _parallel_start_nested(args, pdir, data, branch, host_branch, host_base, set_repos)
        return
    if args.worktree:
        worktree = Path(os.path.abspath(str(Path(args.worktree).expanduser())))
        if not worktree.parent.exists():
            raise SystemExit(f"worktree parent directory does not exist: {worktree.parent}")
    else:
        worktree = ROOT / WORKTREES_DIR / branch.split("/", 1)[1]  # P<N>-<slug>: the branch's own tail
    if worktree.exists():
        raise SystemExit(f"worktree path already exists: {worktree} (pass --worktree to pick another path)")
    # Every guard is above this line. The exclude line is not repo content and is idempotent, so
    # it goes first; the parent is created only for the default home (an override keeps its guard).
    _ensure_worktrees_excluded()
    if not args.worktree:
        worktree.parent.mkdir(parents=True, exist_ok=True)

    # base_branch (P35.S7, additive): the branch the stamp commit lands on, so a worktree checkout's
    # Streams view can read the default stream's row from it.
    data["execution"] = {"mode": "parallel", "branch": branch, "worktree": str(worktree), "consolidation": "pending", "base_branch": git_current_branch()}
    write_json(pdir / "phase.json", data)
    append_event("phase_parallel_started", phase=args.phase, branch=branch, worktree=str(worktree))
    rebuild_index_and_state()
    stamp_paths = [str(pdir.relative_to(ROOT)), *STAMP_WORKS_FILES]
    _git(["add", "--", *stamp_paths])
    _git(["commit", "--only", "-m", f"chore(works): opt {args.phase} into parallel execution", "--", *stamp_paths])
    proc = _git(["worktree", "add", "-b", branch, str(worktree), "HEAD"], check=False)
    if proc.returncode != 0:
        detail = (proc.stderr or proc.stdout).strip() or f"exit {proc.returncode}"
        raise SystemExit(
            f"git worktree add failed: {detail}\n"
            f"the stamp for {args.phase} is already committed on this branch; fix the cause and finish by hand: "
            f"git worktree add -b {branch} {worktree} HEAD")
    print(f"phase {args.phase} now runs in its own worktree")
    print(f"branch={branch}")
    print(f"worktree={worktree}")
    print(f"stamp committed here: chore(works): opt {args.phase} into parallel execution -- only {shown(pdir)}/ plus the regenerated works/ files "
          f"(a phase not yet committed goes in whole); everything else dirty or staged stayed behind in this checkout, uncommitted")
    print(f"the worktree starts from that commit (HEAD); {WORKTREES_DIR}/ is excluded via the repo's .git/info/exclude")
    print(f"next: enter the worktree in this session (Claude Code: EnterWorktree with path={worktree}) or open a session there, run next, and drive the phase from that checkout")
    print(f"this stream's pointer now skips {args.phase}; after the branch is merged back, run: {WORKFLOW_CMD} parallel-teardown {args.phase}")


def _worktree_entries(cwd=None) -> list:
    """`[(path, ref-or-None)]` for every worktree git registers in the repo at `cwd` (ROOT by default),
    from `git worktree list --porcelain`; `ref` is `refs/heads/<name>`, or None when detached/bare."""
    return _parse_worktree_list(_git(["worktree", "list", "--porcelain"], cwd=cwd).stdout)


def _parse_worktree_list(text: str) -> list:
    """`git worktree list --porcelain` output -> `[(path, ref-or-None)]` (see `_worktree_entries`)."""
    entries, path, ref = [], None, None
    for line in text.splitlines() + [""]:
        if line.startswith("worktree "):
            path, ref = line[len("worktree "):], None
        elif line.startswith("branch "):
            ref = line[len("branch "):]
        elif not line.strip() and path is not None:
            entries.append((path, ref))
            path, ref = None, None
    return entries


def _resolve_host_base(host: Path, explicit):
    """`(ref, sha)` for the host worktree's base (P35, Decision 19), resolved inside the host repo
    with no fetch: `--host-base` when given; else `origin/HEAD`'s target, else `init.defaultBranch`
    when that branch exists locally, else a local `main`, then `master`. Refuses (nothing written)
    when nothing resolves to a commit."""
    def local_branch(name):
        return bool(name) and _git(["rev-parse", "--verify", "--quiet", f"refs/heads/{name}"], cwd=host, check=False).returncode == 0

    if explicit is not None:
        ref = explicit.strip()
        sha = _rev_parse(ref, cwd=host) if ref else None
        if not sha:
            raise SystemExit(f"--host-base {explicit!r} does not resolve to a commit in the host repo {host} "
                             f"(the engine never fetches: fetch first if the ref is remote) -- nothing was written")
        return ref, sha
    ref = None
    proc = _git(["symbolic-ref", "-q", "--short", "refs/remotes/origin/HEAD"], cwd=host, check=False)
    if proc.returncode == 0 and proc.stdout.strip():
        ref = proc.stdout.strip()
    if ref is None:
        configured = _git(["config", "--get", "init.defaultBranch"], cwd=host, check=False).stdout.strip()
        if local_branch(configured):
            ref = configured
    if ref is None:
        ref = next((cand for cand in ("main", "master") if local_branch(cand)), None)
    sha = _rev_parse(ref, cwd=host) if ref else None
    if not sha:
        tried = f"{ref!r} does not resolve to a commit" if ref else "no origin/HEAD, no local init.defaultBranch, main or master"
        raise SystemExit(f"cannot resolve the host's default branch for the host worktree's base ({tried}); "
                         f"pass --host-base <ref> (e.g. --host-base HEAD, or another phase's host branch to stack on it) -- nothing was written")
    return ref, sha


def _parse_set_repo_args(repo_args: list, base_args: list, repos: list) -> list:
    """`parallel-start --repo <name>=<branch> ... --repo-base <name>=<ref> ...` (P40.S6, S2 §15) ->
    `[(registry entry, branch, base ref or None)]` in `--repo` order. Refuses, nothing written: a
    malformed value (the branch is required: the engine never invents a name), a name the registry
    does not list, a duplicate `--repo` or `--repo-base`, a `--repo-base` naming no `--repo`."""
    refused = "parallel-start: refused -- nothing was written"
    registry = {r["name"]: r for r in repos}
    wanted = {}
    for raw in repo_args:
        name, sep, value = raw.partition("=")
        name, value = name.strip(), value.strip()
        if not sep or not name or not value:
            raise SystemExit(f"{refused}: --repo {raw!r} needs the form <name>=<branch>; the branch is required -- name it by that repo's "
                             f"convention ({WORKFLOW_CMD} nested-convention --repo <name>) and let the operator confirm it")
        if name not in registry:
            raise SystemExit(f"{refused}: no registered repo is named {name} (registered: {', '.join(registry)})")
        if name in wanted:
            raise SystemExit(f"{refused}: --repo {name} is given twice (one branch per repo)")
        wanted[name] = value
    bases = {}
    for raw in base_args:
        name, sep, value = raw.partition("=")
        name, value = name.strip(), value.strip()
        if not sep or not name or not value:
            raise SystemExit(f"{refused}: --repo-base {raw!r} needs the form <name>=<ref>")
        if name not in wanted:
            raise SystemExit(f"{refused}: --repo-base {name}={value} names a repo not given with --repo (add --repo {name}=<branch>)")
        if name in bases:
            raise SystemExit(f"{refused}: --repo-base {name} is given twice")
        bases[name] = value
    return [(registry[name], value, bases.get(name)) for name, value in wanted.items()]


def _set_repo_plan(repo: dict, branch: str, base_arg, host: Path, host_wt: Path, adopt: bool = False, single_base: bool = False):
    """One repo of a worktree set, checked and planned (P40.S6, S2 §15): `(plan, [])`, or `(None,
    problems)` -- every problem for this repo, so the caller can print one combined refusal before it
    writes anything. Each `git -C` runs against the repo's MAIN checkout (`nested_repo_path`), behind
    `_git_work_tree_root`. The guards: a valid branch name; the branch checked out nowhere; the base
    resolving locally (`base_arg`, else the registry's `default_branch` as `refs/heads/<D>`; never
    fetched); the target `<host_wt>/<path>` absent and not registered; `<path>/` ignored by the host
    (else the worktree shows as untracked in the host worktree and blocks its removal). Reuse is the
    host branch's (P35 Decision 22): an existing branch checked out nowhere is reused, anchored at
    merge-base(base, branch). `plan` is what `_stamp_set_repo` stamps and the worktree step runs.
    Shared with `parallel-add-repo` (S7), which passes the live host worktree as both `host` and
    `host_wt` and `single_base` (its `--repo-base REF` names no repo). With `adopt` (S7, OQ3) the
    target must instead be an EXISTING worktree of this repo, its own work tree root, on `branch`
    (not detached); the branch may be held by no OTHER worktree; `branch_created` is False (the
    branch is the operator's, teardown keeps it) and the anchor is merge-base(base, branch)."""
    name, rel = repo["name"], repo["path"]
    main = nested_repo_path(repo)
    target = host_wt / rel
    label = f"repo {name}"

    def base_flag(ref):
        return f"--repo-base {ref}" if single_base else f"--repo-base {name}={ref}"
    if not _git_work_tree_root(main):
        return None, [f"{label}: its main checkout {main} is not a git work tree root (missing, or a plain directory); fix the registry "
                      f"({WORKFLOW_CMD} nested-repos) first"]
    problems = []
    if branch.startswith("-") or _git(["check-ref-format", "--branch", branch], cwd=main, check=False).returncode != 0:
        problems.append(f"{label}: --repo {name}={branch}: {branch!r} is not a valid branch name in {name}")
        branch_ok = False
    else:
        branch_ok = True
    entries = _worktree_entries(cwd=main)
    target_real = os.path.realpath(str(target))
    if branch_ok:
        # --adopt: the adopted worktree itself holds the branch; only ANOTHER holder is refused
        holder = next((path for path, ref in entries if ref == f"refs/heads/{branch}" and not (adopt and os.path.realpath(path) == target_real)), None)
        if holder:
            problems.append(f"{label}: branch {branch} is checked out in {holder}; a branch lives in one worktree at a time, so pick another "
                            f"branch or switch that checkout off it")
    if adopt:
        problems += _adopt_target_problems(label, name, main, target, branch, entries)
    elif os.path.lexists(str(target)):
        problems.append(f"{label}: the target path {target} already exists")
    elif target_real in {os.path.realpath(path) for path, _ref in entries}:
        problems.append(f"{label}: {target} is still registered as a git worktree of {name} (a stale entry); run git -C {main} worktree prune first")
    if _git(["check-ignore", "-q", f"{rel}/"], cwd=host, check=False).returncode != 0:
        problems.append(f"{label}: {rel}/ is not ignored by the host, so its worktree would show as untracked in the host worktree and block "
                        f"that worktree's removal; add /{rel}/ to the host's .git/info/exclude")
    default = repo.get("default_branch")
    if base_arg is not None:
        base, base_from = base_arg, "repo-base"
        base_sha = _rev_parse(base_arg, cwd=main)
        if not base_sha:
            problems.append(f"{label}: {base_flag(base_arg)} does not resolve to a commit in {name} (the engine never fetches: fetch first if the ref is remote)")
    elif default:
        base, base_from = default, "default"
        base_sha = _rev_parse(f"refs/heads/{default}", cwd=main)
        if not base_sha:
            problems.append(f"{label}: its default_branch {default} is not a local branch in {main} (the engine never fetches); create or fetch it there, "
                            f"or pass {base_flag('<ref>')}")
    else:
        base, base_from, base_sha = None, None, None
        problems.append(f"{label}: no {base_flag('<ref>')} and no default_branch in the registry; pass {base_flag('<ref>')}")
    branch_exists = branch_ok and _git(["rev-parse", "--verify", "--quiet", f"refs/heads/{branch}"], cwd=main, check=False).returncode == 0
    branch_created = False if adopt else not branch_exists
    if adopt and not branch_exists and not problems:
        problems.append(f"{label}: --adopt: branch {branch} has no commit yet in {name}; commit on it first (an adopted branch is anchored at its merge-base with the base)")
    anchor = base_sha
    if base_sha and branch_exists and not branch_created:
        proc = _git(["merge-base", base_sha, f"refs/heads/{branch}"], cwd=main, check=False)
        anchor = proc.stdout.strip()
        if proc.returncode != 0 or not anchor:
            problems.append(f"{label}: branch {branch} shares no history with the base {base} ({base_sha}); pass another {base_flag('<ref>')}")
    if problems:
        return None, problems
    return {"name": name, "path": rel, "main": main, "target": target, "branch": branch, "base": base, "base_sha": base_sha,
            "base_from": base_from, "branch_created": branch_created, "anchor": anchor, "adopted": adopt}, []


def _adopt_target_problems(label: str, name: str, main: Path, target: Path, branch: str, entries: list) -> list:
    """`parallel-add-repo --adopt`'s target rows (P40.S7, S2 §15 and §25): `<host-wt>/<path>` must
    exist, be its own work tree root (`git -C` on a plain dir answers for the host worktree), be one
    of the repo's registered worktrees (`git -C <main> worktree list --porcelain`), and have its HEAD
    on `branch`. One row for the first that fails: each later check presumes the earlier ones."""
    hint = f"--adopt stamps a worktree of {name} that already sits there"
    if not os.path.lexists(str(target)):
        return [f"{label}: --adopt: the target {target} does not exist; {hint} (drop --adopt to cut a new one)"]
    if not _git_work_tree_root(target):
        return [f"{label}: --adopt: {target} is not a git work tree root (a plain directory, or inside another repo); {hint}"]
    ref = next((ref for path, ref in entries if os.path.realpath(path) == os.path.realpath(str(target))), False)
    if ref is False:
        return [f"{label}: --adopt: {target} is a git work tree, but not a worktree of {name} (git -C {main} worktree list does not list it); {hint}"]
    if ref is None:
        return [f"{label}: --adopt: {target} has a detached HEAD; check out {branch} there first (git -C {target} switch {branch})"]
    if ref != f"refs/heads/{branch}":
        on = ref[len("refs/heads/"):] if ref.startswith("refs/heads/") else ref
        return [f"{label}: --adopt: {target} is on {on}, not {branch}; adopt it as --repo {name}={on}, or check out {branch} there first"]
    return []


def _stamp_set_repo(data: dict, plan: dict) -> dict:
    """Stamp one planned repo into phase `data` (P40.S6, S2 §18): `execution.repos.<name>` = {worktree,
    branch, base, base_sha, branch_created}, and the re-stamped `repo_anchors.<name>`: `created` = the
    plan's anchor (the base for a created branch, merge-base(base, branch) for a reused one), `branch`
    = the branch, the review keys kept. `data["execution"]` must already exist. THE one stamp writer,
    shared by `parallel-start --repo` and `parallel-add-repo` (S7)."""
    execution = data["execution"]
    repos = execution.get("repos") if isinstance(execution.get("repos"), dict) else {}
    repos[plan["name"]] = {"worktree": str(plan["target"]), "branch": plan["branch"], "base": plan["base"],
                           "base_sha": plan["base_sha"], "branch_created": plan["branch_created"]}
    execution["repos"] = repos
    anchors = data.get("repo_anchors") if isinstance(data.get("repo_anchors"), dict) else {}
    prev = anchors.get(plan["name"]) if isinstance(anchors.get(plan["name"]), dict) else {}
    entry = {key: prev.get(key) for key in REPO_ANCHOR_KEYS}
    entry.update(created=plan["anchor"], branch=plan["branch"])
    return _with_repo_anchors(data, {plan["name"]: entry})


def _set_repo_add_cmd(plan: dict) -> list:
    """The `git -C <main> worktree add ...` that cuts one planned repo's worktree."""
    add = (["worktree", "add", "-b", plan["branch"], str(plan["target"]), plan["base_sha"]] if plan["branch_created"]
           else ["worktree", "add", str(plan["target"]), plan["branch"]])
    return ["git", "-C", str(plan["main"]), *add]


def _set_repo_line(plan: dict, by: str = "parallel-start") -> str:
    """parallel-start's (and parallel-add-repo's, `by`) one output line for a repo of the set."""
    if plan.get("adopted"):  # P40.S7: --adopt
        how = "adopted: the operator's own worktree and branch, branch_created=false, so teardown keeps the branch"
        anchor = "merge-base of the base and the adopted branch"
    else:
        how = f"created by {by}" if plan["branch_created"] else "reused: it existed and was not checked out"
        anchor = "the base" if plan["branch_created"] else "merge-base of the base and the reused branch"
    src = ("--repo-base" if plan["base_from"] == "repo-base"
           else f"local -- fetch in {plan['name']} first if your custom branches from a fresh default")
    return (f"repo {plan['name']}: worktree={plan['target']} branch={plan['branch']} ({how}) base={plan['base']} ({plan['base_sha']}, {src}) "
            f"repo_anchors.{plan['name']}.created={plan['anchor']} ({anchor})")


def _parallel_start_nested(args: argparse.Namespace, pdir: Path, data: dict, branch: str, host_branch, host_base_arg, set_repos=()) -> None:
    """`parallel-start` in a nested personal install (P35): a host worktree with the nested worktree inside.

    The pair is `<host>/.claude/worktrees/P<N>-<slug>` on `host_branch` (the operator names it, by the
    host's custom), with `<host-wt>/workflow` on `phase/P<N>-<slug>` in the nested repo, which owns the
    state and the stream key. Order (P35.S2 (a)): every guard first; the host's common exclude; the
    execution block plus the re-stamped `host_anchors.created`, rebuilt; the nested stamp commit; the
    host worktree; the nested worktree; the copied `CLAUDE.local.md`. Nothing is ever created under
    `<host-wt>/.claude/` (Claude Code reads skills, agents and settings.local.json through from the main
    checkout), and nothing is fetched. A failure after the stamp commit prints the exact remaining
    commands. `execution.worktree` is the NESTED worktree, so removal stays in the repo that owns it.

    P40.S6: on a multi-repo host, `set_repos` (`[(registry entry, branch, base ref)]` from `--repo` /
    `--repo-base`) makes the pair a SET: every repo's guards run after the host's, in one combined
    refusal; the stamp adds `execution.repos` and re-stamps each named repo's `repo_anchors` through
    `_stamp_set_repo`; each repo worktree is cut at `<host-wt>/<path>` after the nested worktree.
    Without `set_repos` every step and line is exactly the pair's.

    v86 (§9.4): `host_branch` None (an explain phase, never a set: the caller refused both other
    cases) cuts the host worktree DETACHED at the resolved host base (`git worktree add --detach`):
    no branch to name, create, reuse or integrate. The stamp carries `host_branch: null` and
    `host_branch_created: false`; `host_anchors.created` is the base; everything else is the pair's."""
    host = HOST_ROOT
    detached = host_branch is None
    if host is None or not _git_available(cwd=host):
        raise SystemExit(f"the nested install's host {host} is not a git work tree; parallel-start cuts a host worktree, so it needs one -- nothing was written")
    busy = _git_operation_in_progress(cwd=host)
    if busy:
        raise SystemExit(f"a {busy} is in progress in the host checkout {host}; finish or abort it first -- nothing was written")
    if not detached and (host_branch.startswith("-") or _git(["check-ref-format", "--branch", host_branch], cwd=host, check=False).returncode != 0):
        raise SystemExit(f"--host-branch {host_branch!r} is not a valid branch name in the host repo -- nothing was written")
    host_entries = _worktree_entries(cwd=host)
    holder = None if detached else next((path for path, ref in host_entries if ref == f"refs/heads/{host_branch}"), None)
    if holder:
        raise SystemExit(f"host branch {host_branch} is checked out in {holder}; a branch lives in one worktree at a time, so pick another --host-branch "
                         f"or switch that checkout off it -- nothing was written")
    host_branch_created = (not detached) and _git(["rev-parse", "--verify", "--quiet", f"refs/heads/{host_branch}"], cwd=host, check=False).returncode != 0
    rel = Path(os.path.relpath(ROOT, host))
    if args.worktree:
        host_wt = Path(os.path.abspath(str(Path(args.worktree).expanduser())))
        if not host_wt.parent.exists():
            raise SystemExit(f"worktree parent directory does not exist: {host_wt.parent}")
    else:
        host_wt = host / WORKTREES_DIR / branch.split("/", 1)[1]  # P<N>-<slug>: the phase branch's own tail
    nested_wt = host_wt / rel
    if host_wt.exists():
        raise SystemExit(f"host worktree path already exists: {host_wt} (pass --slug or --worktree to pick another path) -- nothing was written")
    registered = {os.path.realpath(path) for path, _ref in host_entries} | {os.path.realpath(path) for path, _ref in _worktree_entries()}
    for path in (host_wt, nested_wt):
        if os.path.realpath(str(path)) in registered:
            raise SystemExit(f"{path} is still registered as a git worktree (a stale entry); run `git worktree prune` in that repo first -- nothing was written")
    base_ref, base_sha = _resolve_host_base(host, host_base_arg)
    if detached or host_branch_created:
        anchor = base_sha
    else:
        proc = _git(["merge-base", base_sha, f"refs/heads/{host_branch}"], cwd=host, check=False)
        anchor = proc.stdout.strip()
        if proc.returncode != 0 or not anchor:
            raise SystemExit(f"host branch {host_branch} shares no history with the base {base_ref} ({base_sha}); pass another --host-base -- nothing was written")
    base_branch = git_current_branch()
    plans, problems = [], []
    for repo, repo_branch, repo_base in set_repos:  # P40.S6: every repo's guards, one combined refusal
        plan, repo_problems = _set_repo_plan(repo, repo_branch, repo_base, host, host_wt)
        problems += repo_problems
        if plan:
            plans.append(plan)
    if problems:
        raise SystemExit(f"parallel-start {args.phase} refused -- nothing was written:\n" + "\n".join(f"{i}. {p}" for i, p in enumerate(problems, 1)))

    # Every guard is above this line. The exclude line is not repo content and is idempotent.
    _ensure_worktrees_excluded(cwd=host)
    if not args.worktree:
        host_wt.parent.mkdir(parents=True, exist_ok=True)
    data["execution"] = {
        "mode": "parallel", "branch": branch, "worktree": str(nested_wt), "consolidation": "pending",
        "host_worktree": str(host_wt), "host_branch": host_branch, "host_base": base_ref, "host_base_sha": base_sha,
        "host_branch_created": host_branch_created, "base_branch": base_branch,
    }
    # phase-scope's base must be where the host worktree starts, not the host HEAD at new-phase
    # (P35.S2 (f)); stamped before the commit so both branches carry it.
    data = _with_host_anchors(data, {"created": anchor})
    for plan in plans:  # P40.S6: execution.repos + the repo_anchors re-stamp, before the commit like the host's
        data = _stamp_set_repo(data, plan)
    write_json(pdir / "phase.json", data)
    if plans:
        append_event("phase_parallel_started", phase=args.phase, branch=branch, worktree=str(nested_wt),
                     host_branch=host_branch, host_worktree=str(host_wt), repos={p["name"]: p["branch"] for p in plans})
    else:
        append_event("phase_parallel_started", phase=args.phase, branch=branch, worktree=str(nested_wt),
                     host_branch=host_branch, host_worktree=str(host_wt))
    rebuild_index_and_state()
    stamp_paths = [str(pdir.relative_to(ROOT)), *STAMP_WORKS_FILES]
    _git(["add", "--", *stamp_paths])
    _git(["commit", "--only", "-m", f"chore(works): opt {args.phase} into parallel execution", "--", *stamp_paths])

    q = shlex.quote
    host_add = (["worktree", "add", "--detach", str(host_wt), base_sha] if detached
                else ["worktree", "add", "-b", host_branch, str(host_wt), base_sha] if host_branch_created
                else ["worktree", "add", str(host_wt), host_branch])
    steps = [
        (["git", "-C", str(host), *host_add], host),
        (["git", "-C", str(ROOT), "worktree", "add", "-b", branch, str(nested_wt), "HEAD"], ROOT),
    ]
    steps += [(_set_repo_add_cmd(plan), plan["main"]) for plan in plans]  # P40.S6: repo worktrees, inside the host worktree
    local_md = host / "CLAUDE.local.md"
    copy_cmd = f"cp {q(str(local_md))} {q(str(host_wt / 'CLAUDE.local.md'))}"

    def remaining(i):
        cmds = [" ".join(q(part) for part in cmd) for cmd, _cwd in steps[i:]]
        if local_md.is_file():
            cmds.append(copy_cmd)
        return "\n".join(f"  {c}" for c in cmds)

    for i, (cmd, cwd) in enumerate(steps):
        proc = _git(cmd[3:], cwd=cwd, check=False)
        if proc.returncode != 0:
            detail = (proc.stderr or proc.stdout).strip() or f"exit {proc.returncode}"
            undo = (f"\nor give up on the pair: git -C {q(str(host))} worktree remove {q(str(host_wt))}, then un-stamp {args.phase} by hand "
                    f"(delete the execution block from {shown(pdir)}/phase.json and commit)" if i == 1 else "")
            raise SystemExit(
                f"{' '.join(cmd[3:5])} failed: {detail}\n"
                f"the stamp for {args.phase} is already committed in the nested repo; fix the cause and finish by hand, in this order:\n"
                f"{remaining(i)}{undo}")
    copied = False
    if local_md.is_file():
        try:
            shutil.copyfile(local_md, host_wt / "CLAUDE.local.md")
            copied = True
        except OSError as exc:
            raise SystemExit(f"copying CLAUDE.local.md failed: {exc}\nboth worktrees exist; without the copy a session there loads no workspace contract. Finish by hand:\n  {copy_cmd}")
    print(f"phase {args.phase} now runs in its own worktree pair (nested install)")
    print(f"branch={branch}")
    print(f"worktree={nested_wt}")
    print(f"host_worktree={host_wt}")
    if detached:
        print(f"host_branch=- (detached host worktree at the base: an explain phase makes no host commit, so it has no host branch)")
    else:
        print(f"host_branch={host_branch} ({'created by parallel-start' if host_branch_created else 'reused: it existed and was not checked out'})")
    print(f"host_base={base_ref} ({base_sha})")
    print(f"host_anchors.created={anchor} ({'the base' if detached or host_branch_created else 'merge-base of the base and the reused branch'}) -- phase-scope's base")
    for plan in plans:
        print(_set_repo_line(plan))
    if nested_repos():  # P40.S6: multi-repo only
        outside = [r["name"] for r in nested_repos() if r["name"] not in {p["name"] for p in plans}]
        if outside:
            print(f"not in this set: {', '.join(outside)} -- inside the set phase-scope skips them, never reading their main checkouts")
    print(f"stamp committed in the nested repo: chore(works): opt {args.phase} into parallel execution -- only {shown(pdir)}/ plus the regenerated works/ files; "
          f"everything else dirty or staged stayed behind, uncommitted")
    print(f"the nested worktree starts from that commit (HEAD); /{WORKTREES_DIR}/ is excluded via the host's .git/info/exclude")
    print("CLAUDE.local.md copied into the host worktree" if copied else f"note: no {local_md} to copy -- a session in the host worktree loads no workspace contract")
    print(f"next: enter the host worktree in this session (Claude Code: EnterWorktree with path={host_wt}) or open a session there, run "
          f"{WORKFLOW_CMD} next (it prints stream={branch}), and drive the phase from that checkout")
    if detached:
        print(f"there: no product commits -- the host worktree is detached and read-only by intent (an explain reads the host code at {base_sha[:12]}); "
              f"workflow commits go to git -C {rel.as_posix()} (the nested worktree, on {branch})")
        print(f"this stream's pointer now skips {args.phase}; the host side has no branch, so there is nothing to integrate there -- merge {branch} in the nested repo")
        return
    if plans:
        print(f"there: product commits go to each repo's branch in its worktree (git -C <repo path>); workflow commits go to git -C {rel.as_posix()} "
              f"(the nested worktree, on {branch}); {host_branch} carries only the host's own files")
    else:
        print(f"there: product commits go to {host_branch} in the host worktree; workflow commits go to git -C {rel.as_posix()} (the nested worktree, on {branch})")
    print(f"this stream's pointer now skips {args.phase}; the host branch is integrated by the host's own custom (nested-convention), never merged by the engine")


def parallel_add_repo(args: argparse.Namespace) -> None:
    """`parallel-add-repo <P> --repo <name>=<branch> [--repo-base <ref>] [--adopt]` (P40.S7, S2 §15,
    §18, §25): add one registered repo to a phase's worktree set MID-PHASE, run from INSIDE that set.

    Not a re-run of `parallel-start`: mid-phase the phase's `phase.json` advances on its phase branch,
    so the stamp is written and committed HERE, in the set's nested worktree, never on the default
    stream (a default-stream stamp would diverge from the branch copy and conflict at merge). Create
    mode cuts `<host-wt>/<path>` (S6's guards, `_set_repo_plan`); `--adopt` (OQ3) stamps a worktree of
    the repo already sitting there, on `<branch>` -- glide P29's hand-made ones -- so teardown knows
    it; it keeps the operator's branch (`branch_created: false`) and cuts nothing. Order: every guard
    (nothing written on a refusal) -> the stamp (`_stamp_set_repo`: `execution.repos.<n>` plus the
    `repo_anchors` re-stamp) -> the nested commit `chore(works): add <repo> to <P>'s worktree set`
    (`--only` phase.json plus the regenerated works/ files: mid-phase the phase folder may hold the
    running slice's uncommitted files, which stay behind) -> create mode's `worktree add`; a failure
    after the commit prints the remaining command. Refused at root, on a single-repo nested install,
    outside a set, for another phase, for a name the SET's registry lacks, for a repo already stamped."""
    q = shlex.quote
    if NESTED is None:
        raise SystemExit("parallel-add-repo is for a multi-repo host only (a nested install whose registry lists repos), run inside a phase's worktree set; "
                         "at root the phase branch is the only branch -- nothing was written")
    repos = nested_repos()
    if not repos:
        raise SystemExit("parallel-add-repo is for a multi-repo host only; this nested install registers no repos (the host is the one repo, "
                         f"and the pair is all there is; register repos with {WORKFLOW_CMD} nested-repos --add <path>) -- nothing was written")
    if not _in_worktree_set():
        raise SystemExit(f"parallel-add-repo runs inside the phase's worktree set (its host worktree, under {HOST_ROOT}/{WORKTREES_DIR}/), never on the "
                         f"default stream: mid-phase the phase's phase.json advances on its phase branch, so a stamp written here would diverge from the "
                         f"branch copy and conflict at merge. Open a session in the set and run it there; a phase with no set yet takes its repos at the "
                         f"start: {WORKFLOW_CMD} parallel-start {args.phase} --host-branch <name> --repo <name>=<branch> -- nothing was written")
    _require_git_repo()
    pdir = require_phase(args.phase)
    data = read_json(pdir / "phase.json")
    execution = phase_execution(data)
    phases = all_active_phases()
    stream = current_stream(phases)

    def same(a, b):
        return isinstance(a, str) and os.path.realpath(a) == os.path.realpath(str(b))

    if not (execution and stream and execution.get("branch") == stream and same(execution.get("worktree"), ROOT)
            and same(execution.get("host_worktree"), HOST_ROOT)):
        mine = next((p.get("id") for p in phases if stream and (phase_execution(p) or {}).get("branch") == stream), None)
        where = f"this set runs {mine}, on {stream}" if mine else "this checkout is on no phase's stream"
        raise SystemExit(f"phase {args.phase} is not this worktree set's phase ({where}); run parallel-add-repo inside {args.phase}'s own set "
                         f"-- nothing was written")
    name, sep, branch = (args.repo or "").partition("=")
    name, branch = name.strip(), branch.strip()
    refused = f"parallel-add-repo {args.phase} refused -- nothing was written"
    if not sep or not name or not branch:
        raise SystemExit(f"{refused}: --repo {args.repo!r} needs the form <name>=<branch>; the branch is required -- name it by that repo's "
                         f"convention ({WORKFLOW_CMD} nested-convention --repo <name>) and let the operator confirm it")
    registry = {r["name"]: r for r in repos}
    rel = Path(os.path.relpath(ROOT, HOST_ROOT)).as_posix()
    base_branch = execution.get("base_branch") or "<the default branch>"
    if name not in registry:
        raise SystemExit(f"{refused}: no repo named {name} is registered in this set's registry (the marker this nested worktree tracks on {stream}; "
                         f"registered: {', '.join(registry)}). Register it on the default stream ({WORKFLOW_CMD} nested-repos --add <path>, in the "
                         f"main host checkout {MAIN_HOST}), commit it there, then merge that into this phase branch: git -C {rel} merge {base_branch}")
    stamped = execution.get("repos") if isinstance(execution.get("repos"), dict) else {}
    if name in stamped:
        prev = stamped[name] if isinstance(stamped[name], dict) else {}
        if prev.get("worktree"):
            raise SystemExit(f"{refused}: repo {name} is already in {args.phase}'s worktree set (worktree={prev.get('worktree')}, "
                             f"branch={prev.get('branch')}); one stamp per repo")
        raise SystemExit(f"{refused}: repo {name} is already stamped in {args.phase}'s worktree set and its worktree was torn down "
                         f"(branch={prev.get('branch')}, worktree=null); one stamp per repo, including a torn-down one, so the stamp stays as history")
    busy = _git_operation_in_progress()
    if busy:
        raise SystemExit(f"{refused}: a {busy} is in progress in the nested worktree {ROOT}; finish or abort it first -- the stamp commit must be an "
                         f"ordinary commit on {stream}")
    plan, problems = _set_repo_plan(registry[name], branch, args.repo_base, HOST_ROOT, HOST_ROOT, adopt=args.adopt, single_base=True)
    if problems:
        raise SystemExit(f"{refused}:\n" + "\n".join(f"{i}. {p}" for i, p in enumerate(problems, 1)))

    # Every guard is above this line.
    data = _stamp_set_repo(data, plan)
    write_json(pdir / "phase.json", data)
    append_event("phase_parallel_repo_added", phase=args.phase, repo=name, branch=branch, worktree=str(plan["target"]), adopted=bool(args.adopt))
    rebuild_index_and_state()
    message = f"chore(works): add {name} to {args.phase}'s worktree set"
    stamp_paths = [str((pdir / "phase.json").relative_to(ROOT)), *STAMP_WORKS_FILES]
    _git(["add", "--", *stamp_paths])
    _git(["commit", "--only", "-m", message, "--", *stamp_paths])
    commit = (_rev_parse("HEAD") or "HEAD")[:7]
    if not args.adopt:
        cmd = _set_repo_add_cmd(plan)
        proc = _git(cmd[3:], cwd=plan["main"], check=False)
        if proc.returncode != 0:
            detail = (proc.stderr or proc.stdout).strip() or f"exit {proc.returncode}"
            raise SystemExit(
                f"git worktree add failed: {detail}\n"
                f"the stamp for {name} is already committed in the nested worktree ({commit} {message}); fix the cause and finish by hand:\n"
                f"  {' '.join(q(part) for part in cmd)}\n"
                f"or drop {name} from the set: git -C {q(rel)} revert --no-edit {commit}")
    print(f"repo {name} {'adopted into' if args.adopt else 'added to'} {args.phase}'s worktree set")
    print(_set_repo_line(plan, by="parallel-add-repo"))
    if args.adopt:
        log = _git(["log", "--oneline", f"{plan['base_sha']}..refs/heads/{branch}"], cwd=plan["main"], check=False).stdout.splitlines()
        print(f"commits on {branch} beyond the base {plan['base']}: {len(log)} -- they come into {args.phase}'s scope (phase-scope reads {name} "
              f"from {plan['anchor'][:7]})")
        for line in log[:5]:
            print(f"  {line}")
        if len(log) > 5:
            print(f"  ... {len(log) - 5} more: git -C {q(str(plan['target']))} log --oneline {plan['base_sha'][:7]}..{branch}")
    print(f"stamp committed in the nested worktree, on {stream}: {commit} {message} -- only {shown(pdir)}/phase.json plus the regenerated "
          f"works/ files; everything else dirty or staged stayed behind, uncommitted")
    print(f"there: product commits for {name} go to {branch} in its worktree (git -C {plan['path']}); phase-scope now reads {name} from it")


def parallel_skip(args: argparse.Namespace) -> None:
    """Retired in v43: a no-op that explains itself and writes nothing.

    This command existed because v42 made the worktree the default, so "run on main" needed a
    marker (`execution: {"mode": "default"}`) that the hints and `parallel-start` could see.
    v43 put the default back on this stream, so there is nothing left to pin -- a phase with no
    execution block already runs here, and only `parallel-start` moves it.

    It stays callable rather than removed so an adopting workspace's habits and scripts (a docs
    phase was always pinned) do not break on upgrade; it reports the phase's real stream and
    exits 0. Phases still carrying v42's pin keep it: `parallel-start` honours it, so an old
    deliberate pin is never silently overridden.
    """
    pdir = require_phase(args.phase)
    data = read_json(pdir / "phase.json")
    execution = phase_execution(data)
    print(f"note: parallel-skip is a no-op since v43 -- the default stream IS the default; nothing was stamped and nothing was written")
    if execution:
        print(f"phase {args.phase} is not on the default stream: it runs in its own worktree on {execution.get('branch')} (asked for with parallel-start)")
        print(f"to bring it back here, merge and retire it: {WORKFLOW_CMD} parallel-teardown {args.phase}")
    elif phase_pinned(data):
        print(f"phase {args.phase} carries v42's legacy pin (execution.mode=default) and runs on the default stream -- as it would with no block at all")
    else:
        print(f"phase {args.phase} already runs on the default stream")
        print(f"to run it in its own worktree instead, ask for one: {WORKFLOW_CMD} parallel-start {args.phase}{'' if explain_phase(pdir) else NESTED_HOST_BRANCH_ARG}")


def parallel_teardown(args: argparse.Namespace) -> None:
    """Retire a merged parallel phase's worktree and branch, from the default stream.

    Refuses while the branch is unmerged (merging is a separate step). Keeps `mode`/`branch`/
    `consolidation` as history and only nulls `worktree`, which is informational anyway.

    In a nested personal install (P35) the phase has a worktree PAIR -- see `_parallel_teardown_nested`;
    `--discard-ignored` belongs to it and is refused at root.
    """
    discard_ignored = getattr(args, "discard_ignored", False)
    if NESTED is None and discard_ignored:
        raise SystemExit("--discard-ignored is for a nested personal install's paired teardown only; "
                         "at root, teardown removes the worktree as it always has -- nothing was removed")
    pdir = require_phase(args.phase)
    data = read_json(pdir / "phase.json")
    execution = phase_execution(data)
    if not execution:
        raise SystemExit(f"phase {args.phase} is not running in its own worktree (no parallel execution block)")
    branch = execution.get("branch")
    if not branch:
        raise SystemExit(f"phase {args.phase} has a parallel execution block with no branch; fix phase.json first")
    _require_git_repo()
    if git_current_branch() == branch:
        raise SystemExit(f"this checkout is on {branch}; run parallel-teardown from the default stream (a worktree cannot remove itself)")
    branch_exists = _branch_exists(branch)
    if branch_exists and _git(["merge-base", "--is-ancestor", branch, "HEAD"], check=False).returncode != 0:
        raise SystemExit(f"branch {branch} is not merged into HEAD; merge it first, then run: {WORKFLOW_CMD} parallel-teardown {args.phase}")
    if NESTED is not None:
        _parallel_teardown_nested(args, pdir, data, execution, branch, branch_exists, discard_ignored)
        return
    removed = []
    worktree = execution.get("worktree")
    if worktree and Path(worktree).exists():
        proc = _git(["worktree", "remove", str(worktree)], check=False)
        if proc.returncode != 0:
            detail = (proc.stderr or proc.stdout).strip() or f"exit {proc.returncode}"
            raise SystemExit(f"git worktree remove {worktree} failed: {detail}\nclean up that checkout (uncommitted work?) or drop it with `git worktree remove --force {worktree}`, then re-run")
        removed.append(f"worktree {worktree}")
    else:
        _git(["worktree", "prune"], check=False)
    if branch_exists:
        _git(["branch", "-d", branch])  # -d refuses an unmerged branch: a free second check
        removed.append(f"branch {branch}")
    data["execution"]["worktree"] = None
    write_json(pdir / "phase.json", data)
    append_event("phase_parallel_torndown", phase=args.phase, branch=branch)
    rebuild_index_and_state()
    print(f"phase {args.phase} parallel checkout retired")
    for item in removed:
        print(f"removed {item}")
    if not removed:
        print("nothing to remove (worktree and branch were already gone)")
    print(f"execution.worktree=null; mode/branch/consolidation kept as history (branch={branch}, consolidation={phase_consolidation(data)})")
    if phase_consolidation(data) == "pending":
        print(f"warning: {args.phase} doc consolidation is still 'pending' -- run the post-merge consolidation on this stream (teardown does not gate on it)")
    print("phase.json changed -- commit it with the rest of the merge cleanup")


def _ignored_worktree_files(path, skip=()) -> list:
    """The ignored, worktree-only files and directories in the checkout at `path`, as git lists them
    (`ls-files --others --ignored --exclude-standard --directory`), minus the entries in `skip`.
    `git worktree remove` deletes these without asking, so the paired teardown lists them first.
    git also lists a directory holding only ignored entries beside those entries; the directory
    line is dropped then, so each path is named once."""
    proc = _git(["ls-files", "-z", "--others", "--ignored", "--exclude-standard", "--directory"], cwd=path)
    entries = [entry for entry in proc.stdout.split("\0") if entry and entry not in skip]
    return [entry for entry in entries
            if not (entry.endswith("/") and any(other != entry and other.startswith(entry) for other in entries))]


def _detached_orphans(worktree, base_sha):
    """`(short HEAD, count)` when the checkout at `worktree` is detached with commits beyond `base_sha`
    that no branch, tag or remote ref holds -- removing it would orphan them -- else None. The host
    worktree's orphan rule (P35), shared with each repo worktree of a set (P40.S8)."""
    if _git(["symbolic-ref", "-q", "HEAD"], cwd=worktree, check=False).returncode == 0:
        return None
    keep = [base_sha] if base_sha else []
    proc = _git(["rev-list", "--count", "HEAD", "--not", *keep, "--branches", "--tags", "--remotes"], cwd=worktree, check=False)
    orphans = int(proc.stdout.strip() or 0) if proc.returncode == 0 else 0
    if not orphans:
        return None
    return _git(["rev-parse", "--short", "HEAD"], cwd=worktree, check=False).stdout.strip(), orphans


def _unstamped_worktrees(host_wt, execution: dict) -> list:
    """P40.S8 (S2 §19's scan): every git work tree inside the host worktree `host_wt` that the phase's
    stamp does not name, as `[{"path", "main", "name", "branch", "standalone"}]` sorted by path; [] when
    there is none, or when git cannot run (it never raises: `validate` calls it too). Removing the host
    worktree would delete such a tree with everything in it, uncommitted work included, so
    `parallel-teardown` refuses each one always (`--discard-ignored` never covers it) and `validate`
    warns. Shared by both, and it runs in single-repo nested installs too. The union of two sources:

    * the host worktree's ignored entries (`ls-files --others --ignored --directory`), minus the nested
      worktree, each walked for a `.git` file or dir: the entry itself, else each of its subdirectories
      -- two levels at most, enough for a repo at `<path>` or `<dir>/<path>`; symlinks never followed
      (an UNignored one shows as untracked and is already refused as the host worktree's uncommitted work);
    * every registered repo's `git worktree list` paths under the host worktree that exist on disk
      (multi-repo only; a stale registration holds no files).

    Excluded: the nested worktree and every stamped `execution.repos.<n>.worktree`. Per tree: `main` is
    the checkout it belongs to (`git -C <main> worktree remove <path>`), `name` the registry name when
    that is a registered repo, `branch` its branch (None when detached), and `standalone` marks a
    repository of its own (a `.git` directory), which no `worktree remove` applies to."""
    host_wt = Path(host_wt)
    host_real = os.path.realpath(str(host_wt))
    repos = execution.get("repos") if isinstance(execution.get("repos"), dict) else {}
    exclude = {os.path.realpath(value["worktree"]) for value in repos.values()
               if isinstance(value, dict) and isinstance(value.get("worktree"), str)}
    if isinstance(execution.get("worktree"), str):
        exclude.add(os.path.realpath(execution["worktree"]))
    nested_rel = f"{Path(os.path.relpath(ROOT, HOST_ROOT)).as_posix()}/" if HOST_ROOT is not None else None
    found = {}

    def add(path, **known):
        real = os.path.realpath(str(path))
        if real in exclude or not real.startswith(host_real + os.sep):
            return
        entry = found.setdefault(real, {"path": str(path), "main": None, "name": None, "branch": None, "standalone": False})
        entry.update({key: value for key, value in known.items() if value is not None})

    proc = _repo_git(host_wt, "ls-files", "-z", "--others", "--ignored", "--exclude-standard", "--directory")
    if proc is not None and proc.returncode == 0:
        for entry in proc.stdout.split("\0"):
            if not entry.endswith("/") or entry == nested_rel:
                continue
            top = host_wt / entry.rstrip("/")
            if top.is_symlink() or not top.is_dir():
                continue
            if os.path.lexists(str(top / ".git")):
                add(top)
                continue
            try:
                children = sorted(child for child in top.iterdir() if child.is_dir() and not child.is_symlink())
            except OSError:
                continue
            for child in children:
                if os.path.lexists(str(child / ".git")):
                    add(child)
    mains = {}
    for repo in nested_repos():
        if not (isinstance(repo, dict) and isinstance(repo.get("path"), str)):
            continue
        main = nested_repo_path(repo)
        if not _git_work_tree_root(main):
            continue
        mains[os.path.realpath(str(main))] = repo.get("name")
        listing = _repo_git(main, "worktree", "list", "--porcelain")
        if listing is None or listing.returncode != 0:
            continue
        for path, ref in _parse_worktree_list(listing.stdout):
            if os.path.lexists(path):
                branch = ref[len("refs/heads/"):] if ref and ref.startswith("refs/heads/") else None
                add(path, main=main, name=repo.get("name"), branch=branch)
    for entry in found.values():
        if entry["main"] is not None:
            continue
        path = Path(entry["path"])
        main = _main_host_checkout(path)
        if (path / ".git").is_dir() or os.path.realpath(str(main)) == os.path.realpath(str(path)):
            entry["standalone"] = True
            continue
        entry["main"] = main
        entry["name"] = mains.get(os.path.realpath(str(main)))
        head = _repo_git(path, "symbolic-ref", "-q", "--short", "HEAD")
        entry["branch"] = (head.stdout.strip() or None) if head is not None and head.returncode == 0 else None
    return sorted(found.values(), key=lambda entry: entry["path"])


def _unstamped_refusal(phase_id: str, host_wt, found: list, execution: dict, branch: str, branch_exists: bool) -> str:
    """`parallel-teardown`'s refusal item for `_unstamped_worktrees` (P40.S8, S2 §19): each tree named,
    with its ways out -- removed by hand against its own repo after its branch is integrated, or, in a
    multi-repo host, adopted into the set (`parallel-add-repo --adopt`, from inside the set) when it
    sits at a registered repo's path and that repo is not stamped yet."""
    q = shlex.quote
    stamped = execution.get("repos") if isinstance(execution.get("repos"), dict) else {}
    registry = {repo.get("name"): repo for repo in nested_repos() if isinstance(repo, dict)}
    lines = [f"the host worktree {host_wt} holds {len(found)} git work tree(s) {phase_id}'s stamp does not name; removing the host worktree "
             f"would delete each with everything in it, uncommitted work included, so parallel-teardown refuses them always "
             f"(--discard-ignored does not cover them):"]
    for tree in found:
        path = tree["path"]
        if tree["standalone"]:
            lines.append(f"      {path}: a git repository of its own, not a worktree")
            lines.append(f"        move it out of the host worktree first (after pushing or integrating its work)")
            continue
        on = f"on {tree['branch']}" if tree["branch"] else "detached"
        lines.append(f"      {path}: a worktree of {tree['main']}, {on}")
        after = f"after integrating {tree['branch']}" if tree["branch"] else "after putting its commits on a branch"
        lines.append(f"        remove it by hand {after}: git -C {q(str(tree['main']))} worktree remove {q(path)}")
        repo = registry.get(tree["name"]) if tree["name"] else None
        if (repo is not None and tree["name"] not in stamped and isinstance(repo.get("path"), str)
                and os.path.realpath(path) == os.path.realpath(os.path.join(str(host_wt), repo["path"]))):
            lines.append(f"        or adopt it into the set, from inside the set: cd {q(str(host_wt))} && {WORKFLOW_CMD} parallel-add-repo {phase_id} "
                         f"--repo {tree['name']}={tree['branch'] or '<branch>'} --adopt (then merge the phase branch again and re-run this teardown)")
    if not branch_exists:
        lines.append(f"    note: the phase branch {branch} is gone, so a repo stamped on it after its last merge (parallel-add-repo) is missing from "
                     f"this copy of phase.json and is refused here as unstamped -- the safe outcome")
    return "\n".join(lines)


def _unstamped_set_warning(phase_id: str, execution: dict):
    """`validate`'s row for `_unstamped_worktrees` (P40.S8, S2 §18): the warning text, or None. Only for
    a LIVE host worktree (`host_worktree` set and on disk), nested only. A warning, never an error:
    `--update` runs `validate` with check=True after its writes, and glide's P29 trips it. The phase
    branch's stamp counts too: a mid-phase `parallel-add-repo` commits its stamp there only, so the
    default stream's copy lacks it until the merge (teardown runs after the merge and reads its own)."""
    host_wt = execution.get("host_worktree")
    if NESTED is None or not isinstance(host_wt, str) or not Path(host_wt).is_dir():
        return None
    found = _unstamped_worktrees(host_wt, execution)
    if found and isinstance(execution.get("branch"), str) and execution["branch"].strip():
        try:
            branch_copy = _phase_json_at_ref(f"refs/heads/{execution['branch']}", phase_id)
        except SystemExit:  # no git binary: keep what the local stamp says
            branch_copy = None
        repos = ((branch_copy or {}).get("execution") or {}).get("repos") if isinstance(branch_copy, dict) else None
        on_branch = {os.path.realpath(value["worktree"]) for value in (repos.values() if isinstance(repos, dict) else ())
                     if isinstance(value, dict) and isinstance(value.get("worktree"), str)}
        found = [tree for tree in found if os.path.realpath(tree["path"]) not in on_branch]
    if not found:
        return None
    listed = ", ".join(tree["path"] for tree in found)
    if nested_repos():
        return (f"{phase_id}'s host worktree holds git worktrees it did not stamp: {listed} -- parallel-teardown will refuse them; adopt them from "
                f"inside the set (parallel-add-repo {phase_id} --repo <name>=<branch> --adopt) or remove them by hand after integrating their branches")
    return (f"{phase_id}'s host worktree holds git worktrees it did not stamp: {listed} -- parallel-teardown will refuse them; remove them by hand "
            f"after integrating their branches (git -C <repo> worktree remove <path>)")


def _teardown_set_repos(execution: dict) -> list:
    """P40.S8: a worktree set's stamped repos as `parallel-teardown` handles them, one dict per
    `execution.repos.<name>` in stamp order: `name`; `wt`, the stamped worktree (None once torn down);
    `live` (on disk); `main`, its repo's MAIN checkout -- the registry path under the main host checkout,
    else (a name the registry dropped) the checkout a live worktree's common git dir names, else None;
    `entries`, `main`'s `worktree list`; and the stamp's `branch`, `base`, `base_sha`, `created`. [] when
    the block has no `repos`, as in every single-repo and at-root phase."""
    repos = execution.get("repos")
    if not isinstance(repos, dict):
        return []
    registry = {repo.get("name"): repo for repo in nested_repos() if isinstance(repo, dict)}
    out = []
    for name, value in repos.items():
        if not isinstance(value, dict):
            continue
        wt = value.get("worktree") if isinstance(value.get("worktree"), str) and value.get("worktree") else None
        live = bool(wt) and Path(wt).exists()
        main = None
        repo = registry.get(name)
        if repo is not None and isinstance(repo.get("path"), str) and _git_work_tree_root(nested_repo_path(repo)):
            main = nested_repo_path(repo)
        elif live and _git_work_tree_root(Path(wt)):
            candidate = _main_host_checkout(Path(wt))
            if os.path.realpath(str(candidate)) != os.path.realpath(wt):
                main = candidate
        listing = _repo_git(main, "worktree", "list", "--porcelain") if main is not None else None
        branch, sha = value.get("branch"), value.get("base_sha")
        out.append({"name": name, "wt": wt, "live": live, "main": main,
                    "entries": _parse_worktree_list(listing.stdout) if listing is not None and listing.returncode == 0 else [],
                    "branch": branch if isinstance(branch, str) and branch.strip() else None, "base": value.get("base"),
                    "base_sha": sha if isinstance(sha, str) and sha else None, "created": value.get("branch_created") is True})
    return out


def _set_repo_teardown_problems(repo: dict, ignored: list) -> list:
    """The guards on one live stamped repo worktree (P40.S8, S2 §19), the host worktree's own: it must be
    a worktree of its repo (else no `worktree remove` applies, and removing the host worktree would delete
    it); uncommitted work; a detached HEAD holding commits no ref keeps. Its ignored, worktree-only files
    are appended to `ignored`, for the one combined list `--discard-ignored` covers."""
    q = shlex.quote
    name, wt, main = repo["name"], repo["wt"], repo["main"]
    label = f"repo {name}"
    if not _git_work_tree_root(Path(wt)):
        return [f"{label}: its stamped worktree {wt} is not a git work tree root (its .git is gone, or it is a plain directory), so no git worktree "
                f"remove applies, and removing the host worktree would delete it with everything in it -- move what it holds out of the host "
                f"worktree, or delete it by hand, then re-run"]
    if main is None:
        return [f"{label}: its main checkout cannot be found (no registered repo is named {name}, and {wt} names no other checkout), so its "
                f"worktree cannot be removed against it -- re-register it ({WORKFLOW_CMD} nested-repos --add <path> --name {name}), then re-run"]
    if not any(os.path.realpath(path) == os.path.realpath(wt) for path, _ref in repo["entries"]):
        return [f"{label}: {wt} is a git work tree, but not a worktree of {name} (git -C {main} worktree list does not list it), so it cannot be "
                f"removed against {name}, and removing the host worktree would delete it -- move it out of the host worktree first, then re-run"]
    problems = []
    dirty = _git(["status", "--porcelain", "--untracked-files=normal"], cwd=wt).stdout.splitlines()
    if dirty:
        problems.append(f"{label}: its worktree {wt} has uncommitted work (commit it on {repo['branch']}, or move or discard it):\n"
                        + "\n".join(f"      {line}" for line in dirty))
    ignored += [(wt, entry) for entry in _ignored_worktree_files(wt)]
    orphan = _detached_orphans(wt, repo["base_sha"])
    if orphan:
        problems.append(f"{label}: its worktree {wt} is detached at {orphan[0]} with {orphan[1]} commit(s) beyond the base that no branch, tag or "
                        f"remote ref holds; removing it would orphan them -- put them on a branch first "
                        f"(git -C {q(wt)} switch -c <name>, or switch {repo['branch']} to them)")
    return problems


def _parallel_teardown_nested(args: argparse.Namespace, pdir: Path, data: dict, execution: dict,
                              branch: str, branch_exists: bool, discard_ignored: bool) -> None:
    """`parallel-teardown` in a nested personal install (P35): retire the host + nested worktree pair.

    Run from the default stream of the nested repo, after `phase/...` is merged there (the caller
    checked it). Order (P35.S2 (d), (e); Decisions 11, 19):

    1. every guard first, in one combined report, with nothing touched: uncommitted work in the
       nested worktree; ignored, worktree-only files in either worktree (`git worktree remove`
       deletes them silently, so they are listed and refused unless `--discard-ignored`); uncommitted
       work in the host worktree; a detached host worktree holding commits no ref keeps (orphaned
       at removal);
    2. the nested worktree, ALWAYS first -- removing the host worktree first exits 0 and silently
       deletes the nested worktree inside it, untracked state included;
    3. the host worktree;
    4. the host branch: deleted (`-D`; `-d` measures against HEAD) only when the engine created it
       and it has 0 commits beyond `host_base_sha`; otherwise kept -- it is the operator's, integrated
       by the host's own custom (Decision 18), and the engine never pushes, opens or merges it;
    5. the nested `phase/...` branch, as at root; a registration left in either repo is pruned.

    `worktree` and `host_worktree` become null; the other host keys and `base_branch` stay as
    history. A failure after the first removal prints the exact remaining commands; a re-run of
    this command resumes too, since every step skips what is already gone.

    A worktree SET (P40.S8, S2 §19) adds its repo half, gated on the stamp's `execution.repos`, so a
    single-repo pair runs exactly the steps above: each stamped repo worktree is guarded like the host
    worktree (uncommitted work, ignored files, detached orphans) and removed FIRST, before the nested
    worktree, with `git -C <main> worktree remove`, against its repo's main checkout (no `--force`: a
    plain remove deletes ignored files, as the host's does; the guards cover the rest); one gone from
    disk but still registered is pruned there before any branch step (a stale registration holds its
    branch). A repo branch is deleted (`-D`, against its `base_sha`) only when the set created it, it
    has 0 commits beyond `base_sha` and no other worktree holds it; reused and adopted branches are the
    operator's and stay. Each `execution.repos.<n>.worktree` becomes null with the host keys. In EVERY
    nested teardown, single-repo too, a git work tree inside the host worktree that the stamp does not
    name (`_unstamped_worktrees`) is refused, `--discard-ignored` or not: removing the host worktree
    would delete it with its uncommitted work. The stamp read is this copy of phase.json, merged from
    the phase branch, so a repo `parallel-add-repo` stamped after the last merge is refused as unstamped."""
    q = shlex.quote
    host = HOST_ROOT
    nested_wt = execution.get("worktree")
    host_wt = execution.get("host_worktree")
    host_branch = execution.get("host_branch")
    base_sha = execution.get("host_base_sha")
    created = execution.get("host_branch_created") is True
    nested_live = bool(nested_wt) and Path(nested_wt).exists()
    host_live = bool(host_wt) and Path(host_wt).exists()
    host_git = host is not None and _git_available(cwd=host)
    if (host_live or host_branch) and not host_git:
        raise SystemExit(f"the nested install's host {host} is not a git work tree; the paired teardown needs it to retire the host worktree "
                         f"and branch -- nothing was removed")
    set_repos = _teardown_set_repos(execution)  # P40.S8: [] unless a multi-repo set stamped repos

    # 1. Every guard, before anything is removed.
    problems, ignored = [], []
    unstamped = _unstamped_worktrees(host_wt, execution) if host_live else []
    if unstamped:
        problems.append(_unstamped_refusal(args.phase, host_wt, unstamped, execution, branch, branch_exists))
    for repo in set_repos:
        if repo["live"]:
            problems += _set_repo_teardown_problems(repo, ignored)
    if nested_live:
        dirty = _git(["status", "--porcelain", "--untracked-files=normal"], cwd=nested_wt).stdout.splitlines()
        if dirty:
            problems.append(f"the nested worktree {nested_wt} has uncommitted work (commit it on {branch} and merge again, or discard it):\n"
                            + "\n".join(f"      {line}" for line in dirty))
        ignored += [(nested_wt, entry) for entry in _ignored_worktree_files(nested_wt)]
    if host_live:
        rel = os.path.relpath(ROOT, host)
        skip = {"CLAUDE.local.md", f"{Path(rel).as_posix().rstrip('/')}/"}  # the engine's copy; the nested worktree (step 2)
        # P40.S8: never a git work tree as a plain ignored path -- the stamped repo worktrees are guarded
        # and removed on their own (step 1), the unstamped ones refused above
        skip |= {f"{Path(os.path.relpath(os.path.realpath(path), os.path.realpath(host_wt))).as_posix()}/"
                 for path in [repo["wt"] for repo in set_repos if repo["wt"]] + [tree["path"] for tree in unstamped]}
        ignored += [(host_wt, entry) for entry in _ignored_worktree_files(host_wt, skip)]
        dirty = _git(["status", "--porcelain", "--untracked-files=normal"], cwd=host_wt).stdout.splitlines()
        if dirty:
            problems.append(f"the host worktree {host_wt} has uncommitted work "
                            f"({f'commit it on {host_branch}' if host_branch else 'it is detached: put it on a branch'}, or move or discard it):\n"
                            + "\n".join(f"      {line}" for line in dirty))
        orphan = _detached_orphans(host_wt, base_sha)
        if orphan:
            problems.append(f"the host worktree {host_wt} is detached at {orphan[0]} with {orphan[1]} commit(s) beyond the base that no branch, tag or "
                            f"remote ref holds; removing it would orphan them -- put them on a branch first "
                            f"(git -C {q(host_wt)} switch -c <name>" + (f", or switch {host_branch} to them)" if host_branch else ")"))
    if ignored and not discard_ignored:
        problems.append("ignored, worktree-only files would be deleted with the worktrees (git worktree remove does not ask):\n"
                        + "\n".join(f"      {os.path.join(where, entry)}" for where, entry in ignored)
                        + f"\n    move them out first, or re-run with --discard-ignored to delete them: {WORKFLOW_CMD} parallel-teardown {args.phase} --discard-ignored")
    if problems:
        lines = [f"parallel-teardown {args.phase} refused -- nothing was removed:"]
        lines += [f"{i}. {problem}" for i, problem in enumerate(problems, 1)]
        raise SystemExit("\n".join(lines))

    # P40.S8: each repo branch's fate, decided before any removal like the host branch's below:
    # `(repo, delete, keep reason, exists)`. Deleted only when the set created it, it has 0 commits
    # beyond the stamped base_sha and no worktree but the stamped one (removed first) holds it.
    repo_fates = []
    for repo in set_repos:
        rbranch, main = repo["branch"], repo["main"]
        if not rbranch:
            continue
        if main is None:
            repo_fates.append((repo, False, f"its repo's main checkout cannot be found (no registered repo is named {repo['name']})", True))
            continue
        if _git(["rev-parse", "--verify", "--quiet", f"refs/heads/{rbranch}"], cwd=main, check=False).returncode != 0:
            repo_fates.append((repo, False, None, False))
            continue
        holders = [path for path, ref in repo["entries"] if ref == f"refs/heads/{rbranch}"
                   and not (repo["wt"] and os.path.realpath(path) == os.path.realpath(repo["wt"]))]
        ahead = None
        if repo["base_sha"]:
            proc = _git(["rev-list", "--count", f"{repo['base_sha']}..refs/heads/{rbranch}"], cwd=main, check=False)
            ahead = int(proc.stdout.strip()) if proc.returncode == 0 and proc.stdout.strip().isdigit() else None
        if holders:
            reason = f"it is checked out in {holders[0]}"
        elif not repo["created"]:
            reason = "branch_created is false: it existed before the set took it (reused, or adopted with parallel-add-repo --adopt), so it is the operator's"
        elif ahead is None:
            reason = f"its commits beyond the base {repo['base_sha']} could not be counted"
        elif ahead:
            reason = f"it has {ahead} commit(s) beyond its base {repo['base']} ({repo['base_sha'][:12]})"
        else:
            reason = None
        repo_fates.append((repo, reason is None, reason, True))

    # The host branch's fate is decided before any removal (its commits do not change).
    delete_host_branch, keep_reason = False, None
    host_branch_exists = bool(host_branch) and host_git and _git(
        ["rev-parse", "--verify", "--quiet", f"refs/heads/{host_branch}"], cwd=host, check=False).returncode == 0
    if host_branch_exists:
        holders = [path for path, ref in _worktree_entries(cwd=host) if ref == f"refs/heads/{host_branch}"
                   and not (host_wt and os.path.realpath(path) == os.path.realpath(host_wt))]
        ahead = None
        if base_sha:
            proc = _git(["rev-list", "--count", f"{base_sha}..refs/heads/{host_branch}"], cwd=host, check=False)
            ahead = int(proc.stdout.strip()) if proc.returncode == 0 and proc.stdout.strip().isdigit() else None
        if holders:
            keep_reason = f"it is checked out in {holders[0]}"
        elif not created:
            keep_reason = "it existed before parallel-start, which reused it"
        elif ahead is None:
            keep_reason = f"its commits beyond the base {base_sha} could not be counted"
        elif ahead:
            keep_reason = f"it has {ahead} commit(s) beyond its base {execution.get('host_base')} ({base_sha[:12]})"
        else:
            delete_host_branch = True

    # 2-5. The removals, nested half first. Each entry: (label, git args, cwd). A worktree already
    # gone from disk but still registered is pruned instead, before the branches: a stale
    # registration still holds its branch, so `branch -D`/`-d` would refuse.
    def registered(repo, path):
        return any(os.path.realpath(p) == os.path.realpath(path) for p, _ref in _worktree_entries(cwd=repo))

    steps = []
    for repo in set_repos:  # P40.S8: the repo worktrees first, each against its repo's main checkout
        if not repo["wt"] or repo["main"] is None:
            continue
        if repo["live"]:
            steps.append((f"repo {repo['name']} worktree {repo['wt']}", ["worktree", "remove", repo["wt"]], repo["main"]))
        elif registered(repo["main"], repo["wt"]):
            steps.append((f"the stale registration of {repo['wt']} (git worktree prune in {repo['main']})", ["worktree", "prune"], repo["main"]))
    if nested_live:
        steps.append((f"nested worktree {nested_wt}", ["worktree", "remove", str(nested_wt)], ROOT))
    elif nested_wt and registered(ROOT, nested_wt):
        steps.append((f"the stale registration of {nested_wt} (git worktree prune in {ROOT})", ["worktree", "prune"], ROOT))
    if host_live:
        steps.append((f"host worktree {host_wt}", ["worktree", "remove", str(host_wt)], host))
    elif host_wt and host_git and registered(host, host_wt):
        steps.append((f"the stale registration of {host_wt} (git worktree prune in {host})", ["worktree", "prune"], host))
    for repo, delete, _reason, _exists in repo_fates:
        if delete:
            steps.append((f"repo {repo['name']} branch {repo['branch']} (created for the set, no commits beyond its base)",
                          ["branch", "-D", repo["branch"]], repo["main"]))
    if delete_host_branch:
        steps.append((f"host branch {host_branch} (created by parallel-start, no commits beyond its base)",
                      ["branch", "-D", host_branch], host))
    if branch_exists:
        steps.append((f"branch {branch}", ["branch", "-d", branch], ROOT))  # -d refuses an unmerged branch: a free second check

    def command(git_args, cwd):
        return f"git -C {q(str(cwd))} " + " ".join(q(part) for part in git_args)

    null_fields = "execution.worktree and execution.host_worktree"
    repo_fields = [f"execution.repos.{repo['name']}.worktree" for repo in set_repos if repo["wt"]]
    if repo_fields:  # P40.S8: a set's repo worktrees are nulled with the host keys
        null_fields = ", ".join(["execution.worktree", "execution.host_worktree", *repo_fields[:-1]]) + f" and {repo_fields[-1]}"
    removed = []
    for i, (label, git_args, cwd) in enumerate(steps):
        proc = _git(git_args, cwd=cwd, check=False)
        if proc.returncode != 0:
            detail = (proc.stderr or proc.stdout).strip() or f"exit {proc.returncode}"
            done = "".join(f"\nremoved {item}" for item in removed) or "\nnothing was removed yet"
            rest = "\n".join(f"  {command(a, c)}" for _l, a, c in steps[i:])
            raise SystemExit(
                f"{command(git_args, cwd)} failed: {detail}{done}\n"
                f"fix the cause, then re-run {WORKFLOW_CMD} parallel-teardown {args.phase} (it resumes), or finish by hand, in this order:\n{rest}\n"
                f"  then set {null_fields} to null in {shown(pdir)}/phase.json")
        removed.append(label)

    pruned = []  # a registration a successful `worktree remove` still left behind
    left = [(repo["main"], repo["wt"]) for repo in set_repos if repo["main"] is not None]
    for repo, path in (*left, (ROOT, nested_wt), (host, host_wt)):
        if not path or (repo is host and not host_git):
            continue
        if registered(repo, path):
            _git(["worktree", "prune"], cwd=repo, check=False)
            pruned.append(str(repo))

    data["execution"]["worktree"] = None
    data["execution"]["host_worktree"] = None
    stamped_repos = data["execution"].get("repos")
    for value in (stamped_repos.values() if isinstance(stamped_repos, dict) else ()):
        if isinstance(value, dict):
            value["worktree"] = None
    write_json(pdir / "phase.json", data)
    event = {"repos": [repo["name"] for repo in set_repos]} if set_repos else {}
    append_event("phase_parallel_torndown", phase=args.phase, branch=branch, host_branch=host_branch, **event)
    rebuild_index_and_state()
    print(f"phase {args.phase} parallel checkout pair retired (nested install)")
    for item in removed:
        print(f"removed {item}")
    if not removed:
        print("nothing to remove (both worktrees and the branch were already gone)")
    for repo in pruned:
        print(f"pruned a stale worktree registration in {repo}")
    if ignored:
        print(f"deleted {len(ignored)} ignored, worktree-only path(s) with the worktrees (--discard-ignored)")
    kept_repo_branch = False
    for repo, delete, reason, exists in repo_fates:  # P40.S8
        if delete:
            continue
        if exists:
            kept_repo_branch = True
            print(f"kept repo {repo['name']}'s branch {repo['branch']}: {reason}")
        else:
            print(f"repo {repo['name']}'s branch {repo['branch']} is already gone; nothing to keep")
    if kept_repo_branch:
        print(f"each repo branch follows its repo's own custom (nested-convention --repo <name>): integrate it there; "
              f"the engine pushed, opened and merged nothing")
    if not host_branch:
        print("no host branch: the host worktree was detached (an explain phase), so there is no branch to keep or delete")
    if host_branch and not delete_host_branch:
        if host_branch_exists:
            print(f"kept host branch {host_branch}: {keep_reason}")
            print(f"the host side follows the host's own custom (nested-convention): the branch is yours for the PR; "
                  f"the engine pushed, opened and merged nothing")
        else:
            print(f"host branch {host_branch} is already gone; nothing to keep")
    print(f"execution.worktree=null, execution.host_worktree=null; mode/branch/consolidation and host_branch/host_base/host_base_sha/"
          f"host_branch_created/base_branch kept as history (branch={branch}, host_branch={host_branch or '- (detached)'}, consolidation={phase_consolidation(data)})")
    if set_repos:
        print(f"execution.repos.<name>.worktree=null for {', '.join(repo['name'] for repo in set_repos)}; branch/base/base_sha/branch_created "
              f"kept as history")
    if phase_consolidation(data) == "pending":
        print(f"warning: {args.phase} doc consolidation is still 'pending' -- run the post-merge consolidation on this stream (teardown does not gate on it)")
    print("phase.json changed -- commit it in the nested repo with the rest of the merge cleanup")


def _gate_exemption(phase_id: str, main_side: str, branch_ref: str) -> tuple:
    """(exempt, detail) for the quiet point's checked exemption (v86, §9.2).

    Reads `git diff --name-status <merge-base> <branch_ref>` -- what merging the branch into the
    default side would bring -- and is exempt only when every path is inside the phase's own folder,
    one of the STAMP_WORKS_FILES (generated, regenerated by parallel-merge-finish; events.jsonl merges
    as union), or ADDED under GATE_EXEMPT_ADDED_PREFIX. `detail` is the path count when exempt, else
    the first offending path (or why git could not answer: then nothing is exempt)."""
    base = _git(["merge-base", main_side, branch_ref], check=False)
    if base.returncode != 0 or not base.stdout.strip():
        return False, f"(no merge-base between {main_side} and {branch_ref})"
    proc = _git(["diff", "--name-status", "--no-renames", "-z", base.stdout.strip(), branch_ref], check=False)
    if proc.returncode != 0:
        return False, f"(git diff {base.stdout.strip()[:12]}..{branch_ref} failed)"
    prefix = _repo_prefix()
    own = f"works/phases/active/{phase_id}/"
    fields = [f for f in proc.stdout.split("\0") if f]
    count = 0
    for status, path in zip(fields[0::2], fields[1::2]):
        count += 1
        rel = path[len(prefix):] if prefix and path.startswith(prefix) else (path if not prefix else None)
        if rel is not None and (rel.startswith(own) or rel in STAMP_WORKS_FILES
                                or (status == "A" and rel.startswith(GATE_EXEMPT_ADDED_PREFIX))):
            continue
        return False, f"{path} ({status})"
    return True, f"{count} path{'' if count == 1 else 's'}"


def parallel_gate(args: argparse.Namespace) -> None:
    """The quiet-point gate: may this parallel phase's branch be merged into the default stream now?

    Two independent questions, both read at a git ref so no checkout has to be switched:

    * **branch side** -- the phase is `done` with a `pass` review *on its own branch*. Main's copy
      is stale before the merge, so it is never trusted here.
    * **main side** -- the default stream is quiet: every non-parallel active phase is `planned` or
      `done`. Merging into a live phase is what this gate exists to prevent. v86: a busy default
      stream is skipped when the branch's diff since its merge-base with the default side touches
      only its own phase folder, the generated works/ files and added deferred jobs
      (`_gate_exemption`, printed as `exemption=`): such a merge cannot collide with live work.

    Read-only and CI-shaped: `GATE OPEN` + exit 0, or `GATE CLOSED` + numbered reasons + exit 1.
    In a nested install (P35) both sides are read in the nested repo, which owns the state.
    """
    pdir = require_phase(args.phase)
    data = read_json(pdir / "phase.json")
    execution = phase_execution(data)
    branch_ref = args.branch_ref or (execution or {}).get("branch")
    if not branch_ref:
        raise SystemExit(
            f"phase {args.phase} carries no parallel execution block in this checkout; "
            f"pass --branch-ref <ref> to name the phase branch explicitly")
    _require_git_repo()
    reasons: list = []
    notes: list = []
    print(f"phase={args.phase}")
    print(f"branch_ref={branch_ref}")

    branch_data = _phase_json_at_ref(branch_ref, args.phase)
    if branch_data is None:
        reasons.append(
            f"cannot read works/phases/active/{args.phase}/phase.json at {branch_ref} "
            f"(unknown ref, or the phase folder does not exist there)")
    else:
        branch_status = branch_data.get("status")
        branch_review = (branch_data.get("review") or {}).get("status")
        print(f"branch_phase_status={branch_status}")
        print(f"branch_review={branch_review}")
        if branch_status != "done":
            reasons.append(f"phase {args.phase} is {branch_status!r} on {branch_ref}, not 'done'; finish its slices and record the review first")
        if branch_review != "pass":
            reasons.append(f"phase {args.phase} review is {branch_review!r} on {branch_ref}, not 'pass'; record a passing review with review-phase on the branch")

    if args.main_ref:
        main_phases = _phases_at_ref(args.main_ref)
        if main_phases is None:
            reasons.append(f"cannot read the default stream's phase state at {args.main_ref} (unknown ref?)")
            main_phases = []
        source = main_side = args.main_ref
    else:
        # Without --main-ref the working tree stands in for main -- unless it IS the phase
        # branch: checked out by name (its worktree) or detached at its tip (how CI checks out a
        # PR). Then (v42) the local default branch stands in instead, so the gate can run from
        # the worktree before the session exits it; only when no default branch resolves is the
        # operator asked for --main-ref. Sharing a tip with main is normal right after the stamp
        # and does NOT count.
        current = git_current_branch()
        on_phase_branch = current is not None and current in {(execution or {}).get("branch"), branch_ref}
        detached_at_tip = current is None and _git(["rev-parse", "HEAD"], check=False).stdout.strip() == _git(["rev-parse", branch_ref], check=False).stdout.strip() != ""
        if on_phase_branch or detached_at_tip:
            default = _default_branch()
            if not default:
                raise SystemExit(
                    f"this checkout is the phase branch {branch_ref} itself and no default branch (origin/HEAD, main, master) resolves, "
                    f"so nothing can stand in for the default stream; pass --main-ref <ref> (e.g. --main-ref origin/main)")
            main_phases = _phases_at_ref(default)
            if main_phases is None:
                reasons.append(f"cannot read the default stream's phase state at {default} (unknown ref?)")
                main_phases = []
            source = f"{default} (local default branch; this checkout is the phase branch)"
            main_side = default
        else:
            main_phases = all_active_phases()
            source = "working tree"
            main_side = "HEAD"  # the working tree's own history: what a merge here would merge into
    print(f"main_state_source={source}")
    busy = []
    for p in main_phases:
        if p.get("id") == args.phase or phase_execution(p):
            continue  # parallel phases run on their own stream; they do not make main busy
        if p.get("status") in BUSY_PHASE_STATUSES:
            busy.append(f"the default stream is not quiet: phase {p.get('id')} is {p.get('status')!r} (finish or park it, then re-run the gate)")
    # v86 (§9.2): the checked exemption. Only the busy-default-stream reasons can be dropped, and only
    # when git shows the branch touches nothing the default stream could be holding; the branch-side
    # reasons (done, pass) never are. Decided by the diff, never by what kind of phase it is.
    exempt, detail = _gate_exemption(args.phase, main_side, branch_ref)
    print(f"exemption=phase-folder-only ({detail})" if exempt else f"exemption=none: {detail}")
    if busy and exempt:
        notes.append(f"{len(busy)} busy default-stream phase(s) skipped: the branch touches only its own phase folder, the generated works/ files "
                     f"and added {GATE_EXEMPT_ADDED_PREFIX} paths, so its merge cannot collide with them")
    else:
        reasons.extend(busy)
    for p in main_phases:
        other = phase_execution(p)
        if p.get("id") != args.phase and other and phase_consolidation(p) == "pending" and p.get("status") == "done":
            notes.append(f"phase {p.get('id')} is merged but not consolidated yet; consolidation is serialized, so finish it first (parallel-consolidated {p.get('id')})")
    for n in notes:
        print(f"note: {n}")

    if reasons:
        print("GATE CLOSED")
        for i, reason in enumerate(reasons, 1):
            print(f"{i}. {reason}")
        raise SystemExit(1)
    print("GATE OPEN")
    print(f"next: merge {branch_ref} into the default stream, then run: {WORKFLOW_CMD} parallel-merge-finish")


def parallel_merge_finish(args: argparse.Namespace) -> None:
    """Run on the default stream right after a phase branch's merge: regenerate, then report what is left.

    The generated files (`works/state.json`, `works/index.json`, `works/backlog.md`,
    `works/deferred.md`, `docs/current/*.md`) are derived, never authored, so a merge conflict in
    them is resolved by taking either side and regenerating here -- which is why parallel mode
    needs no custom git merge driver (a driver would need per-clone `git config` and would not
    travel with the repo). Makes no commit: the regenerated files belong to the merge commit's
    cleanup, which the orchestrator owns. In a nested install (P35) it runs in the nested repo,
    where `phase/...` was merged (`git -C workflow merge`), and never touches the host repo: the
    host branch is integrated by the host's own custom, never by the engine.
    """
    git_ok = _git_available()
    if git_ok and _git(["rev-parse", "-q", "--verify", "MERGE_HEAD"], check=False).returncode == 0:
        raise SystemExit(
            "this checkout is mid-merge (MERGE_HEAD exists) -- finish the merge first, then re-run.\n"
            f"generated files ({', '.join(GENERATED_FILES)}) are regenerated by this command, so resolve any conflict in them by taking EITHER side.\n"
            f"then: {WORKFLOW_CMD} parallel-merge-finish")
    phases = all_active_phases()
    stream = current_stream(phases)
    if stream:
        print(f"warning: this checkout is on parallel stream {stream}; parallel-merge-finish belongs on the default stream, after the merge")
    rebuild_docs()
    rebuild_index_and_state()
    print(f"regenerated from the merged folders: {', '.join(GENERATED_FILES)}")
    awaiting = []
    for p in phases_owing_consolidation(all_active_phases()):
        execution = phase_execution(p)
        if not execution or p.get("status") != "done":
            continue
        # a deleted branch means the phase was already merged and torn down
        if _parallel_branch_merged(execution, git_ok):
            awaiting.append((p, execution))
    if not awaiting:
        print("no merged phase awaits doc consolidation (merged parallel phases only -- next/validate name every phase that owes)")
    else:
        print(f"{len(awaiting)} merged phase(s) await doc consolidation -- do them ONE AT A TIME, on this stream (doc versions are allocated from a single index):")
        for p, execution in awaiting:
            print(f"- {p['id']}: doc impact notes in {shown_rel(p['path'])}/phase.md (section '## Doc impact')")
            print(f"    per note: {WORKFLOW_CMD} doc-new-version --doc <doc> --summary \"...\" --source {p['id']}.REVIEW -> edit the returned edit_path -> {WORKFLOW_CMD} rebuild-docs")
            print(f"    when that phase's notes are all consolidated: {WORKFLOW_CMD} parallel-consolidated {p['id']}")
            if execution.get("worktree") or (git_ok and execution.get("branch") and _branch_exists(execution["branch"])):
                print(f"    then retire its branch + worktree: {WORKFLOW_CMD} parallel-teardown {p['id']}")
    print("no commit made -- commit the regenerated files with the merge cleanup")


def parallel_consolidated(args: argparse.Namespace) -> None:
    """Record that a merged parallel phase's deferred doc consolidation is finished.

    The engine cannot write the prose: an agent runs `doc-new-version` per "Doc impact" note on the
    default stream and then calls this to flip `execution.consolidation` to "done", which is also
    what unblocks archiving the phase. In a nested install (P35) the same flip runs on the nested
    repo's default stream; the host repo is not read or written.
    """
    pdir = require_phase(args.phase)
    data = read_json(pdir / "phase.json")
    execution = phase_execution(data)
    if not execution:
        raise SystemExit(f"phase {args.phase} is not running in its own worktree (no parallel execution block); record its consolidation with: {WORKFLOW_CMD} docs-consolidated {args.phase}")
    stream = current_stream(all_active_phases())
    if stream:
        raise SystemExit(f"this checkout is on parallel stream {stream}; run parallel-consolidated on the default stream, after the branch is merged")
    if data.get("status") != "done":
        raise SystemExit(f"phase {args.phase} is {data.get('status')!r}, not 'done'; consolidation happens after its review passes and the branch is merged")
    review_status = data.get("review", {}).get("status")
    if review_status != "pass":
        raise SystemExit(f"phase {args.phase} review is {review_status!r}, not 'pass'; record the passing review before consolidating")
    consolidation = phase_consolidation(data)
    if consolidation == "done":
        raise SystemExit(f"phase {args.phase} is already marked consolidated (consolidation='done')")
    if consolidation != "pending":
        raise SystemExit(f"phase {args.phase} has consolidation {consolidation!r}; expected 'pending' (set by parallel-start, or by its passing review)")
    set_phase_consolidation(data, "done")
    write_json(pdir / "phase.json", data)
    append_event("phase_consolidated", phase=args.phase, branch=execution.get("branch"))
    rebuild_index_and_state()
    print(f"phase {args.phase} docs consolidated (consolidation=done)")
    print("phase.json changed -- commit it together with the new doc versions")
    branch = execution.get("branch")
    if execution.get("worktree") or (branch and _git_available() and _branch_exists(branch)):
        print(f"next: {WORKFLOW_CMD} parallel-teardown {args.phase}")
    print(f"{args.phase} is now archivable (archive-phase/rotate-backlog no longer block on pending consolidation)")


def docs_debt(args: argparse.Namespace) -> None:
    """The docs phase's worklist: every phase owing durable-doc consolidation, its `## Doc impact`
    notes, the docs those notes touch, and the commands that pay them. Writes nothing.

    `next` and `validate` say *that* the debt exists; this says *what it is*, so the docs-phase
    intake (`create-phase`) and the docs phase's own `DECOMP` never re-derive it by hand. The
    default cut is one slice per doc -- `doc-new-version` is per doc, and one doc usually collects
    notes from several phases -- which is why the per-doc rollup is printed as well as the
    per-phase blocks.
    """
    phases = all_active_phases()
    owing = phases_owing_consolidation(phases)
    if not owing:
        print("docs_debt=none (no active phase owes durable-doc consolidation)")
        return
    stream = current_stream(phases)
    if stream:
        print(f"warning: this checkout is on parallel stream {stream}; doc consolidation runs on the default stream")
    # The per-doc rollup is the same mapping `docs` and `validate` call stale: one helper, so the
    # worklist and the staleness warning can never name a different set of docs.
    per_doc = stale_docs(owing)
    notes_total, blocks = 0, []
    for phase in owing:
        notes = phase_doc_impact_notes(ROOT / phase["path"])
        notes_total += len(notes)
        blocks.append((phase, notes))
    docs_hit = sorted(d for d in per_doc if d != UNASSIGNED_DOC)
    cover = consolidation_cover(phases)
    print(f"docs_debt={', '.join(p['id'] for p in owing)} ({len(owing)} phase(s), {notes_total} note(s), {len(docs_hit)} doc(s))")
    for phase, notes in blocks:
        print()
        print(f"{phase['id']} {phase.get('name', '')} -- {shown_rel(phase['path'])}/phase.md '## Doc impact'")
        pay = consolidation_command(phase)
        tail = "   (merged parallel phase)" if pay == "parallel-consolidated" else ""
        print(f"  pay: {WORKFLOW_CMD} {pay} {phase['id']}{tail}")
        for docs_phase in cover.get(phase["id"], []):  # a live docs phase already pays this one (v51)
            print(f"  paid by: {docs_phase['id']} ({str(docs_phase.get('status', '')).replace('_', ' ')})")
        if not notes:
            print("  - (no notes in the notebook; the debt was stamped from a list since compressed -- check git history)")
        for note in notes:
            print(f"  - {note}")
    print()
    print(f"docs={', '.join(docs_hit) or 'none named'} (default docs-phase cut: one slice per doc)")
    for doc in docs_hit + ([UNASSIGNED_DOC] if UNASSIGNED_DOC in per_doc else []):
        by_phase = per_doc[doc]
        count = sum(by_phase.values())
        print(f"  {doc}: {count} note(s) from {', '.join(sort_phase_ids(by_phase, phases))}")
    if UNASSIGNED_DOC in per_doc:
        print(f"  {UNASSIGNED_DOC} = the note names no doc from the known set; read it in the notebook and decide")
    print()
    print(f'per note: {WORKFLOW_CMD} doc-new-version --doc <doc> --summary "..." --source <P>.REVIEW')
    print(f"          -> edit only the returned edit_path -> {WORKFLOW_CMD} rebuild-docs")
    print("per phase, once all of its notes are consolidated: the pay command above (that is also what unblocks archiving)")
    print("read-only: this command wrote nothing")


def docs_consolidated(args: argparse.Namespace) -> None:
    """Record that a phase's deferred durable-doc consolidation has landed.

    Every phase defers: its passing review verified the `## Doc impact` list and created no
    versions, and a docs phase the operator creates later runs `doc-new-version` per note. This
    flips the debt to "done", which is also what unblocks archiving the phase. The engine cannot
    tell whether the prose is right, so this is an explicit operator/orchestrator statement.
    `parallel-consolidated` is the parallel-mode twin, kept for the post-merge sequence.
    """
    pdir = require_phase(args.phase)
    data = read_json(pdir / "phase.json")
    # Doc versions come from one shared index, so consolidation belongs on the default stream --
    # the same refusal `doc-new-version` makes, one step earlier.
    stream = current_stream(all_active_phases())
    if stream:
        raise SystemExit(f"this checkout is on parallel stream {stream}; run docs-consolidated on the default stream, after the branch is merged (parallel phases use: parallel-consolidated {args.phase})")
    consolidation = phase_consolidation(data)
    if consolidation == "done":
        raise SystemExit(f"phase {args.phase} is already marked consolidated (consolidation='done')")
    if consolidation != "pending":
        raise SystemExit(f"phase {args.phase} owes no doc consolidation (consolidation is {consolidation!r}); a passing review records the debt when the phase's '## Doc impact' list is non-empty")
    set_phase_consolidation(data, "done")
    write_json(pdir / "phase.json", data)
    append_event("phase_consolidated", phase=args.phase)
    rebuild_index_and_state()
    print(f"phase {args.phase} docs consolidated (consolidation=done)")
    print("phase.json changed -- commit it together with the new doc versions")
    print(f"{args.phase} is now archivable (archive-phase/rotate-backlog no longer block on pending consolidation)")


def _parallel_verdict(phase_id: str, status, review, slices, consolidation, merged, branch_gone: bool, own_stream: bool) -> str:
    """One line saying where a parallel phase stands, and what the operator does next.

    `merged` is None when the answer is unknown (this checkout is the phase's own stream, so it
    trivially contains its own branch); `branch_gone` means the branch was deleted, which implies
    the phase was merged first -- `parallel-teardown` refuses an unmerged branch.
    """
    return _parallel_verdict_pair(phase_id, status, review, slices, consolidation, merged, branch_gone, own_stream)[1]


def _parallel_verdict_pair(phase_id: str, status, review, slices, consolidation, merged, branch_gone: bool, own_stream: bool) -> tuple:
    """`(short, long)`: the cell `## Streams` shows, and the sentence `parallel-status` prints. One
    decision tree, so the dashboard and the command can never disagree about where a phase stands."""
    if status is None:
        return ("unknown", "unknown -- neither the phase branch nor a local copy could be read")
    slices = slices or []
    total = len(slices)
    done = sum(1 for s in slices if s.get("status") == "done")
    open_slice = next((s.get("id") for s in slices if s.get("status") != "done"), None)
    integrated = merged is True or branch_gone
    if status == "done" and review == "pass":
        if consolidation == "pending":
            if integrated:
                return ("merged \u2014 awaiting consolidation",
                        f"merged, docs still awaiting consolidation -- run on the default stream: "
                        f"parallel-merge-finish, then parallel-consolidated {phase_id}")
            return ("ready to merge",
                    f"ready to merge -- check the quiet point first: parallel-gate {phase_id} (from the default stream)")
        if integrated:
            if not branch_gone:
                return ("merged + consolidated", f"merged + consolidated -- retire the branch and worktree: parallel-teardown {phase_id}")
            return ("torn down", f"merged, consolidated and torn down -- nothing left but archiving ({phase_id} is archivable)")
        return ("ready to merge",
                f"ready to merge -- check the quiet point first: parallel-gate {phase_id} (from the default stream)")
    if status == "done":
        return ("review not passed", f"slices done but review is {review!r} -- record a passing review on its branch (review-phase {phase_id} --verdict pass)")
    if status == "pending":
        return ("pending", "waiting on the operator (phase is pending [~]) -- it halts only its own stream")
    if status == "blocked":
        return ("blocked", "blocked on its own stream -- resolve the impediment there")
    where = " on this checkout's own stream" if own_stream else " on its branch"
    tail = f"; current slice {open_slice}" if open_slice else ""
    return (f"in flight {done}/{total}", f"in flight{where} -- {done}/{total} slices done{tail}")


def parallel_status(args: argparse.Namespace) -> None:
    """Read-only cross-stream view: this checkout's pointer plus every parallel phase's real state.

    A parallel phase's slice progress lives on its own branch, so the default stream's copy of it
    stands still until the merge (`works/backlog.md` reads it from the branch too). This reads each phase's truth straight out of
    its branch with `git show` / `git ls-tree` -- no checkout switching, no fetching, and (unlike
    every other command here) no rebuild: nothing on disk is written.
    """
    phases = all_active_phases()
    stream = current_stream(phases)
    # The same in-memory pointer computation `rebuild_index_and_state` does, minus the writes.
    selectable = stream_phases(phases, stream)
    current_phase, current_slice, next_slice = resolve_current(selectable)
    waiting = operator_wait_target(selectable, current_phase, current_slice)
    print(f"stream={stream}" if stream else "stream=default")
    print(f"current_phase={current_phase or 'none'}")
    print(f"current_slice={current_slice or 'none'}")
    print(f"next_slice={next_slice or 'none'}")
    print(f"waiting_on_operator={waiting or 'none'}")
    print("(the pointer above is this stream's; each section below is read from that phase's own branch)")

    pinned = [p["id"] for p in phases if phase_pinned(p)]
    if pinned:
        print(f"pinned_to_default={','.join(pinned)}")
    parallel = [(p, phase_execution(p)) for p in phases if phase_execution(p)]
    if not parallel:
        print("no phase is in its own worktree right now -- every active phase runs on the default stream, which is where a phase runs unless asked otherwise")
        print(f"to run one in its own worktree instead, ask for it: {WORKFLOW_CMD} parallel-start <P>{NESTED_HOST_BRANCH_ARG}")
        return
    if not _git_available():
        raise SystemExit(
            "parallel-status reads each phase branch with git, but this workspace is not inside a git work tree "
            f"({len(parallel)} phase(s) are stamped for parallel execution)")
    print(f"parallel_phases={len(parallel)}")

    for phase, execution in parallel:
        pid = phase.get("id")
        branch = execution.get("branch")
        own_stream = bool(branch) and branch == stream
        note = None
        data = slices = None
        if own_stream:  # our own working tree is fresher than our own last commit
            source = "working tree (this checkout's own stream)"
            data, slices = phase, phase.get("slices", [])
        else:
            ref = None
            for candidate in ([branch, f"origin/{branch}"] if branch else []):
                data = _phase_json_at_ref(candidate, pid)
                if data is not None:
                    ref = candidate
                    break
            if ref:
                source = f"branch {ref}"
                slices = _slices_at_ref(ref, pid) or []
            else:  # torn down after the merge, or a clone that never fetched the branch
                source = "local copy"
                note = (f"(local copy; branch not found{': ' + branch if branch else ''}) -- "
                        f"merged and torn down, or never fetched in this clone")
                data, slices = phase, phase.get("slices", [])
        branch_gone = bool(branch) and not _branch_exists(branch)
        merged = None  # unknowable from the phase's own stream: HEAD *is* the branch there
        if branch and not branch_gone and not own_stream:
            merged = _git(["merge-base", "--is-ancestor", branch, "HEAD"], check=False).returncode == 0
        status = (data or {}).get("status")
        review = ((data or {}).get("review") or {}).get("status")
        worktree = execution.get("worktree")
        print()
        print(f"== {pid}: {phase.get('name', '')} ==")
        print(f"  branch={branch or '- (stamped parallel with no branch; fix phase.json)'}")
        print(f"  worktree={worktree or '- (plain clone, or already torn down)'}")
        if NESTED is not None:  # P35: the host half of the pair, as stamped at parallel-start
            detached = "host_branch" in execution and execution.get("host_branch") is None and "host_worktree" in execution
            if execution.get("host_branch") or detached:
                if detached:  # v86 (§9.4): an explain phase's pair
                    print("  host_branch=- (detached host worktree)")
                else:
                    print(f"  host_branch={execution['host_branch']}" + (" (created by parallel-start)" if execution.get("host_branch_created") else " (reused)"))
                print(f"  host_base={execution.get('host_base') or '-'} ({execution.get('host_base_sha') or '-'})")
                print(f"  host_worktree={execution.get('host_worktree') or '- (already torn down)'}")
            else:
                print("  host_branch=- (no host half stamped: an execution block written at root, before the nested pair)")
            # P40.F1: the set's repos come from the copy `data` came from -- a mid-phase `parallel-add-repo` commits its stamp
            # on the phase branch only, so the default stream's own copy lacks it until the merge. The local block is the
            # fallback only when no other copy was read (or the copy carries no execution block).
            copy_execution = data.get("execution") if isinstance(data, dict) else None
            set_repos = (copy_execution if isinstance(copy_execution, dict) else execution).get("repos")
            if isinstance(set_repos, dict):  # P40.S6: the worktree set's repos, one line each
                for name, value in set_repos.items():
                    value = value if isinstance(value, dict) else {}
                    # branch_created=false is all the stamp records of a branch that pre-existed: parallel-add-repo's reuse of an
                    # existing branch and --adopt of an existing worktree stamp identically, so the label names both
                    print(f"  repo {name}: branch={value.get('branch') or '-'} ({'created' if value.get('branch_created') else 'reused or adopted'}) "
                          f"base={value.get('base') or '-'} ({value.get('base_sha') or '-'}) worktree={value.get('worktree') or '- (torn down)'}")
        print(f"  consolidation={phase_consolidation(phase) or '-'}")
        print(f"  source={source}")
        if note:
            print(f"  note: {note}")
        print(f"  status={status} review={review}" + ("" if merged is None else f" merged_into_HEAD={str(merged).lower()}"))
        if slices:
            width = max(len(str(s.get("id", ""))) for s in slices)
            print(f"  slices ({sum(1 for s in slices if s.get('status') == 'done')}/{len(slices)} done):")
            for s in slices:
                name = str(s.get("name", "")).replace("\n", " ")
                print(f"    [{status_box(s.get('status'))}] {str(s.get('id', '')):<{width}}  {str(s.get('status', '')):<17} {name}")
        else:
            print("  slices: none readable at that source")
        print(f"  verdict: {_parallel_verdict(pid, status, review, slices, phase_consolidation(phase), merged, branch_gone, own_stream)}")


def merge_ready_line(stream, phases: list):
    """`merge_ready=<P>:<branch>, ...` on the default stream (v86, §9.5): every stamped phase whose
    branch copy is `done` with a `pass` review while this stream's copy is not `done` yet -- an
    integration nobody has run (an explain run that could not merge by itself leaves it so). Read at
    the branch ref, never trusted from the stale local copy. None on a phase stream or without git."""
    if stream or not _git_available():
        return None
    ready = []
    for p in phases:
        execution = phase_execution(p)
        branch = (execution or {}).get("branch")
        if not branch or p.get("status") == "done":
            continue
        branch_data = _phase_json_at_ref(branch, p["id"])
        if isinstance(branch_data, dict) and branch_data.get("status") == "done" and (branch_data.get("review") or {}).get("status") == "pass":
            ready.append(f"{p['id']}:{branch}")
    if not ready:
        return None
    return (f"merge_ready={', '.join(ready)} (done with a passing review on its branch, not merged here: "
            f"whoever drives this stream merges it at a slice boundary, past {WORKFLOW_CMD} parallel-gate <P>)")


def explain_unit_lines(phase_id) -> list:
    """`explain_unit=<unit>` for an explain phase (v86), so the orchestrator picks the document, book
    or chapter branch of the explain references without re-reading intent.md; nothing otherwise."""
    pdir = ACTIVE / phase_id if phase_id else None
    unit = explain_unit(pdir) if pdir is not None and pdir.is_dir() else None
    return [f"explain_unit={unit}"] if unit else []


def parallel_start_hint(state: dict, index: dict) -> str:
    """The proactive opt-in suggestion for `next`, or None (restored in v43).

    A worktree is opt-in again, so the hint fires only where one actually buys something: on
    the default stream, when the current phase is in_progress and a LATER default-stream phase
    is still `planned` -- exactly the moment a second phase would otherwise queue behind a live
    one. Suggestion only, never a default: the ordinary one-phase-at-a-time run stays silent,
    and so does a worktree checkout. v42's trigger (every planned phase, because the worktree
    was the default) is gone with the default that justified it. In a nested install (P35) the
    printed command also carries `--host-branch <name>`, which the operator names.
    """
    if state.get("stream"):
        return None
    current = state.get("current_phase")
    phases = index.get("active_phases", [])  # already ordered by phase order
    ids = [p.get("id") for p in phases]
    if current not in ids:
        return None
    cur = phases[ids.index(current)]
    if cur.get("status") != "in_progress":
        return None
    waiting = next((p for p in phases[ids.index(current) + 1:] if p.get("status") == "planned" and not p.get("execution")), None)
    if not waiting:
        return None
    return (f"hint: {waiting['id']} is waiting behind {current} -- it can run in parallel on its own branch: "
            f"{WORKFLOW_CMD} parallel-start {waiting['id']}{NESTED_HOST_BRANCH_ARG}")


# ---------------------------------------------------------------------------
# phase-scope: the phase's boundary, read from git (v41)
#
# The review (and a fidelity slice) re-runs the regression checklist only INSIDE the phase's
# boundary -- the product files the phase changed, the surfaces they feed. This command makes
# that boundary a mechanical read instead of a guess: creation commit, base..head range, files.
# Read-only and advisory everywhere: without git it explains itself and exits 0.
# ---------------------------------------------------------------------------

EMPTY_TREE = "4b825dc642cb6eb9a060e54bf8d69288fbee4904"  # `git hash-object -t tree /dev/null`
PRODUCT_PATHSPEC = [".", ":!works", ":!docs"]  # the product: everything but the workflow state and the docs
SCOPE_HINT = ("boundary: these files are what the phase changed; a checklist line whose surface "
              "none of them feed is outside this phase's boundary")


def _find_phase_dir(phase_id: str):
    """`(dir, archived)` for an active or archived phase; SystemExit when neither holds it.

    `require_phase` knows only `active/` on purpose (every state transition is an active-phase
    operation); the boundary of a done, archived phase is still a fair question -- a QA phase or
    a docs phase looks back at it -- so this lookup covers both."""
    if (ACTIVE / phase_id / "phase.json").exists():
        return ACTIVE / phase_id, False
    hits = []
    if ARCHIVED.exists():
        for d in sorted(ARCHIVED.iterdir()):
            pj = d / "phase.json"
            if not pj.is_file():
                continue
            try:
                if read_json(pj).get("id") == phase_id:
                    hits.append(d)
            except Exception:  # noqa: BLE001 - an unreadable archive entry is skipped, never fatal
                continue
    if hits:
        return hits[-1], True
    raise SystemExit(f"phase not found (active or archived): {phase_id}")


def _phase_creation_commit(phase_id: str, pdir: Path, archived: bool):
    """The sha that added the phase's `phase.json`, or None (uncommitted phase, or a shallow clone).

    Pathspecs are cwd-relative and `_git` runs at the workspace root, so no repo prefix here.
    Archiving is a pure rename, so `--follow` on the archived path walks back to the true
    creation commit; the plain active path is the fallback (git keeps a deleted path's history)."""
    active_rel = f"works/phases/active/{phase_id}/phase.json"
    if not archived:
        out = _git(["log", "--diff-filter=A", "--format=%H", "--", active_rel], check=False).stdout.split()
        return out[0] if out else None  # newest: right even if the id was ever reused
    archived_rel = f"{pdir.relative_to(ROOT).as_posix()}/phase.json"
    out = _git(["log", "--follow", "--diff-filter=A", "--format=%H", "--", archived_rel], check=False).stdout.split()
    if not out:
        out = _git(["log", "--diff-filter=A", "--format=%H", "--", active_rel], check=False).stdout.split()
    return out[-1] if out else None  # oldest: the creation, not the archive move


def _default_branch():
    """The default stream's branch: origin/HEAD's target, else a local main/master, else None."""
    proc = _git(["symbolic-ref", "-q", "--short", "refs/remotes/origin/HEAD"], check=False)
    if proc.returncode == 0 and proc.stdout.strip():
        return proc.stdout.strip()
    for cand in ("main", "master"):
        if _branch_exists(cand):
            return cand
    return None


def _rev_parse(ref: str, cwd=None):
    proc = _git(["rev-parse", "-q", "--verify", f"{ref}^{{commit}}"], cwd=cwd, check=False)
    return proc.stdout.strip() if proc.returncode == 0 and proc.stdout.strip() else None


def _diff_product_files(base: str, head: str, cwd=None, pathspec=PRODUCT_PATHSPEC) -> list:
    """`[{status, path[, from]}]` for the product files that differ between two commits."""
    proc = _git(["diff", "--name-status", "--relative", "-M", base, head, "--", *pathspec], cwd=cwd, check=False)
    files = []
    for line in proc.stdout.splitlines():
        parts = line.split("\t")
        if len(parts) < 2:
            continue
        status = parts[0][:1]
        if status in ("R", "C") and len(parts) >= 3:
            files.append({"status": status, "path": parts[2], "from": parts[1]})
        else:
            files.append({"status": status, "path": parts[-1]})
    return files


def _status_product_files(cwd=None, pathspec=PRODUCT_PATHSPEC) -> list:
    """`[{status, path}]` for the uncommitted product changes in this checkout (untracked included).
    Porcelain paths are repo-root-relative, so the prefix of the directory measured is stripped."""
    proc = _git(["status", "--porcelain", "--untracked-files=all", "--", *pathspec], cwd=cwd, check=False)
    prefix = _repo_prefix() if cwd is None else _git(["rev-parse", "--show-prefix"], cwd=cwd, check=False).stdout.strip()
    files = []
    for line in proc.stdout.splitlines():
        if len(line) < 4:
            continue
        code, path = line[:2], line[3:]
        if " -> " in path:
            path = path.split(" -> ", 1)[1]
        if prefix and path.startswith(prefix):
            path = path[len(prefix):]
        status = "A" if code == "??" else (code.strip()[:1] or "M")
        files.append({"status": status, "path": path})
    return files


# ---------------------------------------------------------------------------
# P40: per-repo anchors and the base rule. A nested install's phase range is read from the product
# repo(s) the nested repo never sees: the host (single-repo) or each registered repo (multi-repo).
# ---------------------------------------------------------------------------

NOT_IN_SET = "not in this worktree set"


def _in_worktree_set() -> bool:
    """P40: True when this engine runs inside a parallel set -- HOST_ROOT is a host worktree, not the
    main host checkout (nested only; both resolved, since git may print a symlink-free path)."""
    if HOST_ROOT is None or MAIN_HOST is None:
        return False
    return os.path.realpath(str(HOST_ROOT)) != os.path.realpath(str(MAIN_HOST))


def _phase_repo_path(repo: dict, phase_data: dict):
    """`(path, None)` for where phase `phase_data` reads registered repo `repo`, or `(None, why)` when
    it cannot be read there. THE one resolver every per-repo anchor and scope read goes through. On
    the default stream it is the registry path under the main host checkout (`nested_repo_path`),
    guarded by `_git_work_tree_root` (on a plain dir `git -C` answers for the host). Inside a worktree
    set (P40.S6, S2 §17) it is the set's repo worktree, `HOST_ROOT / path`, when that is its own work
    tree root; otherwise the repo is NOT IN THIS SET and is skipped -- never read from the main
    checkout, whose HEAD and working tree are another stream's. `phase_data` is unused."""
    if _in_worktree_set():
        path = HOST_ROOT / repo["path"]
        if _git_work_tree_root(path):
            return path, None
        return None, f"{NOT_IN_SET} (its main checkout {nested_repo_path(repo)} is another stream's working state)"
    path = nested_repo_path(repo)
    if not path.exists():
        return None, f"{repo['path']}/ is missing from the host"
    if not _git_work_tree_root(path):
        return None, f"{repo['path']}/ is not a git work tree root"
    return path, None


def _repo_current_branch(path: Path):
    """The branch checked out in `path`, or None (detached HEAD, or git cannot say)."""
    proc = _git(["symbolic-ref", "-q", "--short", "HEAD"], cwd=path, check=False)
    return proc.stdout.strip() if proc.returncode == 0 and proc.stdout.strip() else None


def _is_ancestor(path: Path, older: str, newer: str) -> bool:
    return _git(["merge-base", "--is-ancestor", older, newer], cwd=path, check=False).returncode == 0


def _repo_default_branch(path: Path, configured=None):
    """D, the repo's integration branch NAME: the registry's `default_branch`, else `origin/HEAD`'s
    target, else a local `main`/`master`, else None."""
    if configured:
        return configured
    proc = _git(["symbolic-ref", "-q", "--short", "refs/remotes/origin/HEAD"], cwd=path, check=False)
    target = proc.stdout.strip() if proc.returncode == 0 else ""
    if target.startswith("origin/") and len(target) > len("origin/"):
        return target[len("origin/"):]
    for cand in ("main", "master"):
        if _git(["rev-parse", "--verify", "--quiet", f"refs/heads/{cand}"], cwd=path, check=False).returncode == 0:
            return cand
    return None


def _default_merge_base(path: Path, name: str, head: str):
    """merge-base(D, HEAD), D read as `origin/<name>` and as the local `<name>` (whichever exist):
    the newest of the two merge-bases, so a rebase onto a teammate's pushed commits and one onto a
    local-only default both count. None when neither ref exists or the histories are unrelated."""
    best = None
    for ref in (f"refs/remotes/origin/{name}", f"refs/heads/{name}"):
        if not _rev_parse(ref, cwd=path):
            continue
        proc = _git(["merge-base", ref, head], cwd=path, check=False)
        mb = proc.stdout.strip() if proc.returncode == 0 else ""
        if mb and (best is None or (mb != best and _is_ancestor(path, best, mb))):
            best = mb
    return best


def _patch_ids(path: Path, *revs: str) -> list:
    """`[(commit, patch-id)]`, newest first, for `git log -p <revs>` (merges skipped), via
    `git patch-id --stable`. Bytes in and out: a binary or non-UTF-8 diff must not break the read."""
    try:
        log = subprocess.run(["git", "log", "-p", "--no-color", "--no-ext-diff", "--no-merges", "--format=commit %H", *revs],
                             cwd=str(path), capture_output=True, timeout=120)
        if log.returncode != 0 or not log.stdout:
            return []
        pid = subprocess.run(["git", "patch-id", "--stable"], cwd=str(path), input=log.stdout, capture_output=True, timeout=120)
    except Exception:  # noqa: BLE001 - no patch-id means no recovered copy: the rule falls back to its note
        return []
    pairs = []
    for line in pid.stdout.decode("utf-8", "replace").splitlines():
        parts = line.split()
        if len(parts) == 2:
            pairs.append((parts[1], parts[0]))
    return pairs


def resolve_repo_base(path: Path, created, default_branch=None, label: str = "created", branch=None, hint: str = "--base <sha>") -> dict:
    """The base rule (P40 S1 §7; answers D35): where a repo's phase range starts. Returns
    `{"base", "rule", "kind", "note"}` -- `base` a commit sha, the empty tree, or None (unmeasurable);
    `rule` 1-5 (which step fired); `kind` the text phase-scope prints in `base=... (...)`; `note` a
    caveat to print, or None. With D = `_repo_default_branch(path, default_branch)` and
    mb = merge-base(D, HEAD):

    1. `created` null -> the empty tree when the repo now has commits;
    2. no D, or mb == HEAD (the work sits on the default branch) -> `created`;
    3. mb an ancestor of `created` (the branch carried pre-phase commits) -> `created`;
    4. `created` an ancestor of mb (the branch was rebased onto, or merged with, a newer default) -> mb;
    5. neither (a rebase rewrote `created` itself) -> the commit in mb..HEAD whose `patch-id --stable`
       equals `created`'s, else mb with a note. A `created` that is a merge commit (no patch-id) or no
       longer exists (pruned) takes the note path. Never raises."""
    head = _rev_parse("HEAD", cwd=path)
    if not created:
        if head:
            return {"base": EMPTY_TREE, "rule": 1, "kind": f"the empty tree: {label} is null (no commit at new-phase)", "note": None}
        return {"base": None, "rule": 1, "kind": None, "note": "no commit at new-phase, and still none"}
    commit = _rev_parse(created, cwd=path)
    name = _repo_default_branch(path, default_branch)
    mb = _default_merge_base(path, name, head) if name and head else None
    if commit:
        if mb is None or mb == head:
            who = "host" if label.startswith("host_anchors") else "repo"
            return {"base": commit, "rule": 2, "kind": f"the {who} HEAD at new-phase: {label}", "note": None}
        if mb == commit:  # P40.S6: a set's branch cut at (or reused from) its anchor -- rule 3's base, said plainly
            return {"base": commit, "rule": 3, "kind": f"{label}: where the branch leaves {name}", "note": None}
        if _is_ancestor(path, mb, commit):
            return {"base": commit, "rule": 3, "kind": f"{label}; the branch carried pre-phase commits", "note": None}
        if _is_ancestor(path, commit, mb):
            return {"base": mb, "rule": 4, "kind": f"merge-base with {name}: the branch moved past {label} {commit[:7]}, by a rebase onto or a merge of a newer {name}", "note": None}
    elif mb is None:
        return {"base": None, "rule": 5, "kind": None,
                "note": f"{label} {created} is not a commit here (rewritten and pruned?) and there is no default branch to fall back to"}
    if commit:
        own = dict(_patch_ids(path, "-1", commit)).get(commit)
        if own:
            copies = [c for c, p in _patch_ids(path, f"{mb}..{head}") if p == own]
            if copies:
                return {"base": copies[-1], "rule": 5, "kind": f"the rebased copy of {label} {commit[:7]}, matched by patch-id", "note": None}
    return {"base": mb, "rule": 5, "kind": f"merge-base with {name}: {label} {str(created)[:7]} was rewritten",
            "note": f"the phase's base commit was rewritten; the range may include pre-phase commits on {branch or 'HEAD'} -- pass {hint}"}


def _freeze_host_review_base(data: dict) -> None:
    """At a passing review: `host_anchors.review_base` = the base rule's answer, written ONLY when it
    differs from `created` (a rebased branch, D35) -- absent means `created`, so a non-rebased phase's
    phase.json is exactly today's. A stale one from an earlier pass is dropped when it no longer differs."""
    anchors = data.get("host_anchors")
    if HOST_ROOT is None or not isinstance(anchors, dict) or not anchors.get("created") or not _git_available(cwd=HOST_ROOT):
        return
    res = resolve_repo_base(HOST_ROOT, anchors["created"], None, "host_anchors.created")
    if res["base"] and res["rule"] in (4, 5) and res["base"] != EMPTY_TREE:
        anchors["review_base"] = res["base"]
    else:
        anchors.pop("review_base", None)


def _freeze_repo_anchors(data: dict) -> None:
    """At a passing review (multi-repo): per repo holding an anchor, `review_pass` = its HEAD and
    `review_base` = what the base rule resolves now, so both ends freeze (after the branch merges and
    is deleted the rule would otherwise drift). A repo that cannot be read keeps its entry as it is."""
    anchors = data.get("repo_anchors")
    if not isinstance(anchors, dict):
        return
    registry = {r["name"]: r for r in nested_repos()}
    for name, entry in anchors.items():
        repo = registry.get(name)
        if repo is None or not isinstance(entry, dict):
            continue
        path, _why = _phase_repo_path(repo, data)
        if path is None:
            continue
        res = resolve_repo_base(path, entry.get("created"), repo.get("default_branch"), f"repo_anchors.{name}.created")
        entry["review_pass"] = _rev_parse("HEAD", cwd=path)
        entry["review_base"] = res["base"] if res["base"] and res["base"] != EMPTY_TREE else None


def _repo_anchor_problems(p: dict, errors: list, warnings: list) -> None:
    """validate's `repo_anchors` rows (multi-repo only): a malformed block or entry is an error,
    mirroring `host_anchors`; an entry naming an unregistered repo is a warning (glide's P29 has no
    `repo_anchors`, so nothing here can fail its `--update`)."""
    anchors = p.get("repo_anchors")
    if not isinstance(anchors, dict):
        errors.append(f"phase {p['id']} has a non-object repo_anchors block: {anchors!r}")
        return
    registered = {r["name"] for r in nested_repos()}
    for name, entry in anchors.items():
        if not isinstance(entry, dict) or set(entry) != set(REPO_ANCHOR_KEYS):
            got = ", ".join(sorted(entry)) if isinstance(entry, dict) else repr(entry)
            errors.append(f"phase {p['id']} has a malformed repo_anchors.{name} ({got}); expected exactly the keys {', '.join(REPO_ANCHOR_KEYS)}")
        else:
            for key in ("created", "review_pass", "review_base"):
                value = entry[key]
                if value is not None and not (isinstance(value, str) and re.fullmatch(r"[0-9a-f]{7,64}", value)):
                    errors.append(f"phase {p['id']} has invalid repo_anchors.{name}.{key} {value!r}; expected a commit sha of {name} or null")
            if entry["branch"] is not None and not isinstance(entry["branch"], str):
                errors.append(f"phase {p['id']} has invalid repo_anchors.{name}.branch {entry['branch']!r}; expected a branch name or null")
        if name not in registered:
            warnings.append(f"phase {p['id']} holds repo_anchors.{name}, but no registered repo is named {name} -- phase-scope skips it (re-register it with: {WORKFLOW_CMD} nested-repos --add <path> --name {name})")


def _phase_review_commit(phase_id: str, base: str, tip: str):
    """The first commit in base..tip whose recorded phase.json says `review.status == "pass"`.

    A done phase's boundary ends where its review was recorded, not at today's HEAD -- otherwise
    every later commit on the stream would leak into it."""
    rng = tip if base == EMPTY_TREE else f"{base}..{tip}"
    proc = _git(["log", "--reverse", "--format=%H", rng, "--", f"works/phases/active/{phase_id}/phase.json"], check=False)
    for sha in proc.stdout.split():
        data = _phase_json_at_ref(sha, phase_id)
        if data and (data.get("review") or {}).get("status") == "pass":
            return sha
    return None


def phase_scope(args: argparse.Namespace) -> None:
    """Read-only: the phase's boundary -- its creation commit, the base..head range and the
    product files that range changed (works/ and docs/ excluded) -- printed for the review and a
    fidelity slice to re-run the regression checklist inside.

    Default stream: base = the creation commit's parent (so a creation commit batched with product
    edits still counts), head = HEAD, or the commit that recorded a passing review on a done phase.
    Parallel mode: base = the merge-base with the default branch, measured on the phase branch.
    Advisory everywhere: no git means one explanatory line and exit 0; an uncommitted phase lists
    the working tree instead; `--base` / `--head` override either end verbatim.
    """
    pdir, archived = _find_phase_dir(args.phase)
    data = read_json(pdir / "phase.json")
    out = {"phase": args.phase, "status": data.get("status"), "archived": archived, "mode": "default",
           "creation_commit": None, "base": None, "base_kind": None, "head": None, "head_kind": None,
           "range": None, "commits": 0, "files": [], "uncommitted": [], "notes": [], "hint": SCOPE_HINT}

    def emit(lines):
        if args.json:
            print(json.dumps(out, indent=2, ensure_ascii=False))
        else:
            for ln in lines:
                print(ln)

    header = [f"phase={args.phase} status={data.get('status')} archived={str(archived).lower()}"]
    if NESTED is None and args.repo:
        raise SystemExit("phase-scope --repo: refused -- a multi-repo host only; an at-root workspace's repo is its one product repo")
    if NESTED is not None:
        _phase_scope_nested(args, data, out, header, emit)
        return
    if not _git_available():
        out["mode"] = "no-git"
        out["hint"] = "phase-scope: no git history readable here -- derive the boundary from the slices' result.md files"
        emit([out["hint"]])
        return

    creation = _phase_creation_commit(args.phase, pdir, archived)
    out["creation_commit"] = creation
    execution = phase_execution(data)
    tip, base, base_kind = "HEAD", None, None
    if args.base:
        base = _rev_parse(args.base)
        if not base:
            raise SystemExit(f"--base {args.base}: not a commit")
        base_kind = f"from --base {args.base}"
    elif execution and execution.get("branch"):
        out["mode"] = "parallel"
        branch = execution["branch"]
        default = _default_branch()
        if default is None:
            out["notes"].append("cannot find the default branch (no origin/HEAD, no main/master) -- measured from the creation commit; pass --base <ref> to narrow")
        else:
            if git_current_branch() == branch:
                ref = "HEAD"
            elif _branch_exists(branch):
                ref = branch
            elif _rev_parse(f"origin/{branch}"):
                ref = f"origin/{branch}"
            else:
                ref = None
                out["notes"].append(f"branch {branch} is gone (merged and torn down?) -- measured on this stream from the creation commit; concurrent default-stream work may appear; pass --base to narrow")
            if ref:
                mb = _git(["merge-base", default, ref], check=False)
                if mb.returncode == 0 and mb.stdout.strip():
                    base, tip, base_kind = mb.stdout.strip(), ref, f"merge-base with {default}"
                    if ref != "HEAD":
                        out["notes"].append(f"read from branch {ref}, not this checkout")
    if base is None:
        if creation is None:
            out["uncommitted"] = _status_product_files()
            lines = header + [f"mode={out['mode']}",
                              f"creation_commit=none (works/phases/active/{args.phase}/phase.json has no commit yet -- uncommitted phase, or a shallow clone)",
                              f"uncommitted_product_files={len(out['uncommitted'])} (working tree; works/ and docs/ excluded)"]
            lines += [f"  {f['status']} {f['path']}" for f in out["uncommitted"]]
            lines += [f"note: {n}" for n in out["notes"]] + [SCOPE_HINT]
            emit(lines)
            return
        base = _rev_parse(f"{creation}^")
        if base:
            base_kind = "parent of the creation commit, so that commit's own product edits count"
        else:
            base, base_kind = EMPTY_TREE, "the empty tree: the creation commit has no readable parent (root commit, or a shallow clone)"
    if args.head:
        head = _rev_parse(args.head)
        if not head:
            raise SystemExit(f"--head {args.head}: not a commit")
        head_kind = f"from --head {args.head}"
    else:
        head, head_kind = None, None
        if (data.get("review") or {}).get("status") == "pass":
            head = _phase_review_commit(args.phase, base, tip)
            if head:
                head_kind = "the commit that recorded review.status=pass; pass --head HEAD to read to the tip"
        if not head:
            head, head_kind = _rev_parse(tip), f"the tip of {tip}"
    if not head:
        raise SystemExit(f"cannot resolve {tip} to a commit")
    rng = head if base == EMPTY_TREE else f"{base}..{head}"
    count = _git(["rev-list", "--count", rng], check=False).stdout.strip() or "0"
    files = _diff_product_files(base, head)
    uncommitted = _status_product_files() if head == _rev_parse("HEAD") else []
    out.update({"base": base, "base_kind": base_kind, "head": head, "head_kind": head_kind,
                "range": f"{base[:7]}..{head[:7]}", "commits": int(count), "files": files, "uncommitted": uncommitted})

    tally = {k: sum(1 for f in files if f["status"] == k) for k in ("A", "M", "D", "R")}
    subject = _git(["log", "-1", "--format=%s", creation], check=False).stdout.strip() if creation else ""
    lines = header + [f"mode={out['mode']}"]
    lines.append(f"creation_commit={creation}  {subject}" if creation else "creation_commit=none (measured from --base)")
    lines.append(f"base={base} ({base_kind})")
    lines.append(f"head={head} ({head_kind})")
    lines.append(f"range={out['range']} commits={count}")
    lines.append(f"product_files={len(files)} (added {tally['A']}, modified {tally['M']}, deleted {tally['D']}, renamed {tally['R']}; works/ and docs/ excluded)")
    for f in files:
        lines.append(f"  {f['status']} {f['from']} -> {f['path']}" if f.get("from") else f"  {f['status']} {f['path']}")
    if uncommitted:
        lines.append(f"uncommitted_product_files={len(uncommitted)} (working tree, not in the range above)")
        lines += [f"  {f['status']} {f['path']}" for f in uncommitted]
    lines += [f"note: {n}" for n in out["notes"]] + [SCOPE_HINT]
    emit(lines)


def _host_pathspec() -> list:
    """The host's product: everything but the nested workflow repo. Unlike at root, the host's own
    works/ or docs/ ARE product, so only the nested repo's folder is excluded."""
    return [".", f":(exclude){Path(os.path.relpath(ROOT, HOST_ROOT)).as_posix()}"]


def _phase_scope_nested(args: argparse.Namespace, data: dict, out: dict, header: list, emit) -> None:
    """phase-scope in a nested install: the same answer in the same format, read from the HOST repo.

    The nested repo holding works/ never sees the host's commits, so the range comes from the host
    anchors `new-phase` and the passing review stamped into phase.json: base = `--base`, else
    `host_anchors.created` (the host HEAD at creation, so base..head with no `^`); head = `--head`,
    else `host_anchors.review_pass` once the review passed, else the host HEAD. A phase with no
    usable anchor lists the host working tree only, mirroring the uncommitted-phase path at root.

    P40: with no `--base` and no passing review, the base rule (`resolve_repo_base`) runs on the
    host; it changes the answer only for a rebased branch (rules 4-5, D35). A multi-repo host reads
    one range per registered repo instead (`_phase_scope_multi`)."""
    repos = nested_repos()
    if repos:
        _phase_scope_multi(args, data, out, header, emit, repos)
        return
    if args.repo:
        raise SystemExit("phase-scope --repo: refused -- single-repo install: the host is the one repo; drop --repo")
    host = HOST_ROOT
    spec = _host_pathspec()
    nested_dir = spec[1].split(")", 1)[1]
    out["mode"] = "nested"
    if not _git_available(cwd=host):
        out["mode"] = "no-git"
        out["hint"] = f"phase-scope: no git history readable in the host {host} -- derive the boundary from the slices' result.md files"
        emit([out["hint"]])
        return
    anchors = data.get("host_anchors") if isinstance(data.get("host_anchors"), dict) else {}
    created = anchors.get("created")
    out["creation_commit"] = created
    base = base_kind = None
    missing = None
    if args.base:
        base = _rev_parse(args.base, cwd=host)
        if not base:
            raise SystemExit(f"--base {args.base}: not a commit in the host repo {host}")
        base_kind = f"from --base {args.base}"
    elif created:
        passed = (data.get("review") or {}).get("status") == "pass"
        frozen = anchors.get("review_base") if passed else None
        if frozen:  # P40: the base the rule resolved at the passing review (written only when != created)
            base = _rev_parse(frozen, cwd=host)
            if base:
                base_kind = "the base the rule resolved when the review passed (the branch moved past the anchor, by a rebase onto or a merge of a newer default): phase.json host_anchors.review_base"
            else:
                out["notes"].append(f"host_anchors.review_base {frozen} is not a commit in the host repo -- measured from host_anchors.created instead")
        if base is None:
            base = _rev_parse(created, cwd=host)
            rule = None
            if not passed:
                # P40 (D35): the base rule. Rules 2-3 resolve to `created`, the output is exactly
                # today's; only a rebased branch (rules 4-5) moves the base.
                rule = resolve_repo_base(host, created, None, "host_anchors.created", _repo_current_branch(host), "--base <host-sha>")
            if rule is not None and rule["rule"] in (4, 5) and rule["base"]:
                base, base_kind = rule["base"], rule["kind"]
                if rule["note"]:
                    out["notes"].append(rule["note"])
            elif base:
                base_kind = "the host HEAD when the phase was created (or the host worktree's base after parallel-start): phase.json host_anchors.created"
            else:
                missing = f"host_anchors.created {created} is not a commit in the host repo (rewritten history, or a shallow clone)"
    elif "created" in anchors:  # recorded as null: the host had no commit yet when the phase was created
        if _rev_parse("HEAD", cwd=host):
            base, base_kind = EMPTY_TREE, "the empty tree: the host had no commit when the phase was created"
        else:
            missing = "the host had no commit when the phase was created, and still has none"
    else:
        missing = "phase.json carries no host_anchors.created (a phase created at root, or before the nested engine)"
    if base is None:
        out["uncommitted"] = _status_product_files(cwd=host, pathspec=spec)
        lines = header + [f"mode={out['mode']}",
                          f"creation_commit=none ({missing} -- pass --base <host-sha> to measure a range)",
                          f"uncommitted_product_files={len(out['uncommitted'])} (host working tree; {nested_dir}/ excluded)"]
        lines += [f"  {f['status']} {f['path']}" for f in out["uncommitted"]]
        lines += [f"note: {n}" for n in out["notes"]] + [SCOPE_HINT]
        emit(lines)
        return
    host_head = _rev_parse("HEAD", cwd=host)
    if args.head:
        head = _rev_parse(args.head, cwd=host)
        if not head:
            raise SystemExit(f"--head {args.head}: not a commit in the host repo {host}")
        head_kind = f"from --head {args.head}"
    else:
        head, head_kind = None, None
        passed = anchors.get("review_pass")
        if (data.get("review") or {}).get("status") == "pass" and passed:
            head = _rev_parse(passed, cwd=host)
            if head:
                head_kind = "the host HEAD when the review passed: phase.json host_anchors.review_pass; pass --head HEAD to read to the tip"
            else:
                out["notes"].append(f"host_anchors.review_pass {passed} is not a commit in the host repo -- read to the host's tip instead")
        if not head:
            head, head_kind = host_head, "the tip of the host's HEAD"
    if not head:
        raise SystemExit(f"cannot resolve the host's HEAD to a commit in {host}")
    rng = head if base == EMPTY_TREE else f"{base}..{head}"
    count = _git(["rev-list", "--count", rng], cwd=host, check=False).stdout.strip() or "0"
    files = _diff_product_files(base, head, cwd=host, pathspec=spec)
    uncommitted = _status_product_files(cwd=host, pathspec=spec) if head == host_head else []
    out.update({"base": base, "base_kind": base_kind, "head": head, "head_kind": head_kind,
                "range": f"{base[:7]}..{head[:7]}", "commits": int(count), "files": files, "uncommitted": uncommitted})
    tally = {k: sum(1 for f in files if f["status"] == k) for k in ("A", "M", "D", "R")}
    lines = header + [f"mode={out['mode']}"]
    if created:
        lines.append(f"creation_commit={created}  (the host HEAD at new-phase, or the host worktree's base after parallel-start)")
    elif "created" in anchors and not args.base:
        lines.append("creation_commit=none (the host had no commit at new-phase)")
    else:
        lines.append("creation_commit=none (measured from --base)")
    lines.append(f"base={base} ({base_kind})")
    lines.append(f"head={head} ({head_kind})")
    lines.append(f"range={out['range']} commits={count}")
    lines.append(f"product_files={len(files)} (added {tally['A']}, modified {tally['M']}, deleted {tally['D']}, renamed {tally['R']}; read from the host repo, {nested_dir}/ excluded)")
    for f in files:
        lines.append(f"  {f['status']} {f['from']} -> {f['path']}" if f.get("from") else f"  {f['status']} {f['path']}")
    if uncommitted:
        lines.append(f"uncommitted_product_files={len(uncommitted)} (host working tree, not in the range above)")
        lines += [f"  {f['status']} {f['path']}" for f in uncommitted]
    lines += [f"note: {n}" for n in out["notes"]] + [SCOPE_HINT]
    emit(lines)


def _scope_file_lines(files: list, prefix: str = "", indent: str = "  ") -> list:
    return [f"{indent}{f['status']} {prefix}{f['from']} -> {prefix}{f['path']}" if f.get("from") else f"{indent}{f['status']} {prefix}{f['path']}"
            for f in files]


def _prefixed(files: list, prefix: str) -> list:
    """Scope file entries with `prefix` (`<repo path>/`) on every path, for the union and the JSON."""
    out = []
    for f in files:
        g = dict(f, path=prefix + f["path"])
        if f.get("from"):
            g["from"] = prefix + f["from"]
        out.append(g)
    return out


def _phase_scope_multi(args: argparse.Namespace, data: dict, out: dict, header: list, emit, repos: list) -> None:
    """phase-scope on a multi-repo host (P40 S1 §8): the phase's boundary is its commits in EACH
    registered repo, so one block per repo, read through `_phase_repo_path`.

    Per repo: base = per-repo `--base` (with exactly one `--repo`), else `repo_anchors.<name>.review_base`
    once the review passed, else the base rule; head = per-repo `--head`, else `review_pass` once the
    review passed, else the repo's HEAD. A repo with no anchor prints `base=none` and its working tree
    only -- never the empty tree, which would list the whole repo. The host's own block (every registered
    path excluded from its pathspec) prints only when it has a product file; without `--repo`,
    `--base`/`--head` still mean the host."""
    host = HOST_ROOT
    names = [r["name"] for r in repos]
    wanted = list(dict.fromkeys(args.repo or []))
    unknown = [n for n in wanted if n not in names]
    if unknown:
        raise SystemExit(f"phase-scope --repo: refused -- no registered repo is named {', '.join(unknown)} (registered: {', '.join(names)})")
    if wanted and (args.base or args.head) and len(wanted) != 1:
        raise SystemExit("phase-scope: refused -- with --repo, --base/--head set ONE repo's range, so they need exactly one --repo "
                         f"(got {len(wanted)}: {', '.join(wanted)}); without --repo they set the host's range")
    per_repo_override = bool(wanted)
    selected = [r for r in repos if not wanted or r["name"] in wanted]
    passed = (data.get("review") or {}).get("status") == "pass"
    anchors = data.get("repo_anchors") if isinstance(data.get("repo_anchors"), dict) else {}
    out["mode"] = "nested-multi"
    blocks, union, union_unc, total_commits, touched = [], [], [], 0, 0

    for repo in selected:
        name, rel = repo["name"], repo["path"]
        prefix = f"{rel}/"
        entry = {"name": name, "path": rel, "branch": None, "base": None, "base_kind": None, "head": None, "head_kind": None,
                 "range": None, "commits": 0, "files": [], "uncommitted": [], "notes": []}
        out.setdefault("repos", []).append(entry)
        path, why = _phase_repo_path(repo, data)
        if path is None and why.startswith(NOT_IN_SET) and per_repo_override and (args.base or args.head):
            # P40.S6: the explicit override S2 §17 names -- `--repo <name> --base/--head` reads a repo
            # outside this set from its main checkout, said so in a note (Decision 27).
            main = nested_repo_path(repo)
            if _git_work_tree_root(main):
                path, why = main, None
                entry["notes"].append(f"{name}: read from its main checkout {main} ({NOT_IN_SET}): another stream's working state, "
                                      f"measured only because --repo {name} --base/--head asked for it")
        if path is None:
            if why.startswith(NOT_IN_SET):
                line = f"repo={name} path={prefix} {why} -- pass --repo {name} --base/--head to read it"
                entry["notes"].append(line)
                blocks.append([line])
                continue
            entry["notes"].append(f"{name} skipped: {why}")
            blocks.append([f"repo={name} path={prefix} skipped ({why})"])
            continue
        branch_now = _repo_current_branch(path)
        entry["branch"] = branch_now
        branch_txt = branch_now or "(detached)"
        anchor = anchors.get(name) if isinstance(anchors.get(name), dict) else None
        repo_head = _rev_parse("HEAD", cwd=path)
        base = base_kind = None
        why_none = None
        if per_repo_override and args.base:
            base = _rev_parse(args.base, cwd=path)
            if not base:
                raise SystemExit(f"--base {args.base}: not a commit in {name} ({path})")
            base_kind = f"from --base {args.base}"
        elif anchor is None:
            why_none = f"no repo_anchors.{name} -- pass --repo {name} --base <sha>"
        else:
            frozen = anchor.get("review_base") if passed else None
            if frozen:
                base = _rev_parse(frozen, cwd=path)
                if base:
                    base_kind = f"frozen at the passing review: repo_anchors.{name}.review_base"
                else:
                    entry["notes"].append(f"repo_anchors.{name}.review_base {frozen} is not a commit in {name} -- the base rule decides instead")
            if base is None:
                res = resolve_repo_base(path, anchor.get("created"), repo.get("default_branch"), f"repo_anchors.{name}.created",
                                        branch_now, f"--repo {name} --base <sha>")
                base, base_kind = res["base"], res["kind"]
                if res["note"] and base:
                    entry["notes"].append(f"{name}: {res['note']}")
                elif not base:
                    why_none = f"{res['note']} -- pass --repo {name} --base <sha>"
        if base is None:
            unc = _prefixed(_status_product_files(cwd=path, pathspec=["."]), prefix)
            entry["uncommitted"] = unc
            union_unc += unc
            touched += bool(unc)
            block = [f"repo={name} path={prefix} branch={branch_txt} base=none ({why_none})"]
            if unc:
                block.append(f"  uncommitted_product_files={len(unc)} (working tree)")
                block += _scope_file_lines(unc, indent="    ")
            blocks.append(block)
            out["notes"] += entry["notes"]
            continue
        if per_repo_override and args.head:
            head = _rev_parse(args.head, cwd=path)
            if not head:
                raise SystemExit(f"--head {args.head}: not a commit in {name} ({path})")
            head_kind = f"from --head {args.head}"
        else:
            head = head_kind = None
            frozen_head = anchor.get("review_pass") if (anchor and passed) else None
            if frozen_head:
                head = _rev_parse(frozen_head, cwd=path)
                if head:
                    head_kind = f"{name}'s HEAD when the review passed: repo_anchors.{name}.review_pass; pass --repo {name} --head HEAD to read to the tip"
                else:
                    entry["notes"].append(f"repo_anchors.{name}.review_pass {frozen_head} is not a commit in {name} -- read to its tip instead")
            if not head:
                head, head_kind = repo_head, f"the tip of {name}'s HEAD"
                recorded = anchor.get("branch") if anchor else None
                if recorded and branch_now != recorded:
                    entry["notes"].append(f"{name} is on {branch_txt}, the phase recorded {recorded} -- pass --repo {name} --head {recorded}")
        if not head:
            raise SystemExit(f"cannot resolve {name}'s HEAD to a commit in {path}")
        rng = head if base == EMPTY_TREE else f"{base}..{head}"
        count = int(_git(["rev-list", "--count", rng], cwd=path, check=False).stdout.strip() or "0")
        files = _diff_product_files(base, head, cwd=path, pathspec=["."])
        uncommitted = _status_product_files(cwd=path, pathspec=["."]) if head == repo_head else []
        pfiles, punc = _prefixed(files, prefix), _prefixed(uncommitted, prefix)
        entry.update({"base": base, "base_kind": base_kind, "head": head, "head_kind": head_kind,
                      "range": f"{base[:7]}..{head[:7]}", "commits": count, "files": pfiles, "uncommitted": punc})
        union += pfiles
        union_unc += punc
        total_commits += count
        out["notes"] += entry["notes"]
        if not (count or files or uncommitted):
            blocks.append([f"repo={name} path={prefix} commits=0 product_files=0 (untouched)"])
            continue
        touched += 1
        tally = {k: sum(1 for f in files if f["status"] == k) for k in ("A", "M", "D", "R")}
        block = [f"repo={name} path={prefix} branch={branch_txt} base={base[:7]} ({base_kind}) head={head[:7]} ({head_kind}) commits={count}",
                 f"  product_files={len(files)} (added {tally['A']}, modified {tally['M']}, deleted {tally['D']}, renamed {tally['R']})"]
        block += _scope_file_lines(pfiles, indent="    ")
        if uncommitted:
            block.append(f"  uncommitted_product_files={len(uncommitted)} (working tree, not in the range above)")
            block += _scope_file_lines(punc, indent="    ")
        blocks.append(block)

    # The host's own block: never with a --repo filter; printed only when it has a product file
    # (a multi-repo host tracks nothing), or when --base/--head asked for its range.
    host_block = []
    host_anchors = data.get("host_anchors") if isinstance(data.get("host_anchors"), dict) else {}
    out["creation_commit"] = host_anchors.get("created")
    if not wanted and host is not None and _git_available(cwd=host):
        spec = _host_pathspec() + [f":(exclude){r['path']}" for r in repos]
        base = base_kind = None
        if args.base:
            base = _rev_parse(args.base, cwd=host)
            if not base:
                raise SystemExit(f"--base {args.base}: not a commit in the host repo {host}")
            base_kind = f"from --base {args.base}"
        elif passed and host_anchors.get("review_base") and _rev_parse(host_anchors["review_base"], cwd=host):
            base, base_kind = _rev_parse(host_anchors["review_base"], cwd=host), "frozen at the passing review: host_anchors.review_base"
        elif "created" in host_anchors:
            res = resolve_repo_base(host, host_anchors.get("created"), None, "host_anchors.created", _repo_current_branch(host), "--base <host-sha>")
            base, base_kind = res["base"], res["kind"]
        host_head = _rev_parse("HEAD", cwd=host)
        head, head_kind = None, None
        if args.head:
            head = _rev_parse(args.head, cwd=host)
            if not head:
                raise SystemExit(f"--head {args.head}: not a commit in the host repo {host}")
            head_kind = f"from --head {args.head}"
        elif passed and host_anchors.get("review_pass"):
            head = _rev_parse(host_anchors["review_pass"], cwd=host)
            head_kind = "the host HEAD when the review passed: host_anchors.review_pass" if head else None
        if not head:
            head, head_kind = host_head, "the tip of the host's HEAD"
        files, count = [], 0
        if base and head:
            rng = head if base == EMPTY_TREE else f"{base}..{head}"
            count = int(_git(["rev-list", "--count", rng], cwd=host, check=False).stdout.strip() or "0")
            files = _diff_product_files(base, head, cwd=host, pathspec=spec)
            out.update({"base": base, "base_kind": base_kind, "head": head, "head_kind": head_kind, "range": f"{base[:7]}..{head[:7]}"})
        uncommitted = _status_product_files(cwd=host, pathspec=spec) if head == host_head else []
        union += files
        union_unc += uncommitted
        if files or uncommitted or args.base or args.head:
            total_commits += count
            tally = {k: sum(1 for f in files if f["status"] == k) for k in ("A", "M", "D", "R")}
            if base and head:
                host_block.append(f"repo=. (host) base={base[:7]} ({base_kind}) head={head[:7]} ({head_kind}) commits={count}")
            else:
                host_block.append("repo=. (host) base=none (no usable host_anchors.created -- pass --base <host-sha>)")
            host_block.append(f"  product_files={len(files)} (added {tally['A']}, modified {tally['M']}, deleted {tally['D']}, renamed {tally['R']}; "
                              f"{_nested_dir_name()}/ and the {len(repos)} repos excluded)")
            host_block += _scope_file_lines(files, indent="    ")
            if uncommitted:
                host_block.append(f"  uncommitted_product_files={len(uncommitted)} (host working tree, not in the range above)")
                host_block += _scope_file_lines(uncommitted, indent="    ")
            if files or uncommitted:
                out["notes"].append("the multi-repo host has product files of its own -- product belongs in the repos")

    out.update({"commits": total_commits, "files": union, "uncommitted": union_unc})
    lines = header + [f"mode=nested-multi repos={len(selected)} touched={touched}"]
    for block in blocks:
        lines += block
    lines += host_block
    if not union:
        lines.append(f"product_files=0 across {len(selected)} repos")
    lines += [f"note: {n}" for n in out["notes"]] + [SCOPE_HINT]
    emit(lines)


def _one_line(text) -> str:
    """A stored free-text value collapsed onto one printable line."""
    return " ".join(str(text).split())


def nested_next_lines() -> list:
    """`next`'s nested-install lines: the host, and the host conventions' state (commits, branches, PRs) -- loud
    while it is unconfirmed, because the first product commit must wait for the operator. Empty
    at root, so an at-root `next` prints exactly what it always printed."""
    if NESTED is None:
        return []
    conv = NESTED.get("commit_convention") if isinstance(NESTED.get("commit_convention"), dict) else {}
    lines = [f"nested_host={HOST_ROOT}"]
    if conv.get("confirmed") is True:
        lines.append(f"host_commit_convention=confirmed (coauthor_trailers={conv.get('coauthor_trailers')}) "
                     f"-- follow it for host commits, branches and pull requests; read it with: {WORKFLOW_CMD} nested-convention")
    else:
        inferred = _one_line(conv.get("inferred")) if conv.get("inferred") else "nothing"
        lines.append(f"host_commit_convention=UNCONFIRMED (inferred: {inferred}) -- confirm the host's conventions (commits, branches and pull requests) with the operator before the first product commit, "
                     f"then: {WORKFLOW_CMD} nested-convention --confirm --text \"<conventions>\" --trailers allowed|forbidden")
    repos = nested_repos()
    if repos:  # P40 multi-repo: one summary line; a single-repo install prints exactly the two above
        lines.append(_repo_conventions_line(repos))
    return lines


def effective_repo_convention(repo: dict, host_conv=None) -> dict:
    """P40 (Decision 12): repo X's effective convention on a multi-repo host, where the top-level
    `commit_convention` is "the rules for every repo" and X's own (null = inherit) is more specific.

    - text: the host-level text, then X's own, each labelled (both shown);
    - confirmed: X's own `confirmed`, or the host-level one when X's convention is null;
    - trailers: `forbidden` if either forbids, else X's own when it records allowed/forbidden, else the host's.

    `state` is what `nested-repos`, `nested-convention` and `next`'s `repo_conventions=` all print:
    `UNCONFIRMED` whenever the effective `confirmed` is false (an inherited convention under an
    unconfirmed host included), else `inherited` for a null convention, else `confirmed`.
    `host_conv` defaults to the loaded marker's; `nested-convention --confirm` passes the one it just wrote."""
    if host_conv is None:
        host_conv = NESTED.get("commit_convention") if NESTED is not None else None
    host = host_conv if isinstance(host_conv, dict) else {}
    own = repo.get("commit_convention")
    host_trailers = host.get("coauthor_trailers") or "unknown"
    parts = [f"every repo: {host['text']}"] if host.get("text") else []
    if own is None:
        confirmed = host.get("confirmed") is True
        trailers = host_trailers
    else:
        confirmed = own.get("confirmed") is True
        own_trailers = own.get("coauthor_trailers")
        if "forbidden" in (host_trailers, own_trailers):
            trailers = "forbidden"
        else:
            trailers = own_trailers if own_trailers in ("allowed", "forbidden") else host_trailers
        if own.get("text"):
            parts.append(f"{repo['name']}: {own['text']}")
    state = "UNCONFIRMED" if not confirmed else ("inherited" if own is None else "confirmed")
    return {"state": state, "confirmed": confirmed, "coauthor_trailers": trailers, "text": "\n".join(parts) or None,
            "inferred": None if own is None else own.get("inferred"), "inherits": own is None}


def _repo_convention_lines(repo: dict, host_conv=None) -> list:
    """One registry entry's block in `nested-convention` (bare multi-repo, and `--repo`): its effective values."""
    eff = effective_repo_convention(repo, host_conv)
    lines = [f"repo={repo['name']} path={repo['path']}/ commit_convention={eff['state']} coauthor_trailers={eff['coauthor_trailers']}",
             "inferred:",
             "(inherits the host-level convention, the rules for every repo)" if eff["inherits"] else (eff["inferred"] or "(nothing inferred)"),
             "text:",
             eff["text"] or "(none -- not confirmed yet)"]
    if eff["state"] == "UNCONFIRMED" and eff["inherits"]:
        lines.append(f"{repo['name']} inherits the unconfirmed host-level conventions: confirm those (the rules for every repo) with the operator before its first product commit, "
                     f"then: {WORKFLOW_CMD} nested-convention --confirm --text \"<conventions>\" --trailers allowed|forbidden "
                     f"(or record {repo['name']}'s own: --confirm --repo {repo['name']} ...)")
    elif eff["state"] == "UNCONFIRMED":
        lines.append(f"confirm {repo['name']}'s conventions (commits, branches and pull requests) with the operator before its first product commit, "
                     f"then: {WORKFLOW_CMD} nested-convention --confirm --repo {repo['name']} --text \"<conventions>\" --trailers allowed|forbidden")
    return lines


def _repo_conventions_line(repos: list) -> str:
    """`next`'s one multi-repo summary line (S1 §5): the count by effective state with the UNCONFIRMED
    names and the command that confirms them, or that nothing needs confirming."""
    states = [(repo["name"], effective_repo_convention(repo)["state"]) for repo in repos]
    unconfirmed = [name for name, state in states if state == "UNCONFIRMED"]
    if not unconfirmed:
        return f"repo_conventions={len(repos)} (all confirmed or inherited) -- per repo: {WORKFLOW_CMD} nested-convention --repo <name>"
    confirmed = sum(1 for _, state in states if state == "confirmed")
    inherited = sum(1 for _, state in states if state == "inherited")
    return (f"repo_conventions={len(repos)} (confirmed {confirmed}, inherited {inherited}, UNCONFIRMED {len(unconfirmed)}: {', '.join(unconfirmed)}) "
            f"-- confirm each UNCONFIRMED repo's conventions before its first product commit: "
            f"{WORKFLOW_CMD} nested-convention --confirm --repo <name> --text \"<conventions>\" --trailers allowed|forbidden")


def _nested_convention_repo(args: argparse.Namespace, path: Path) -> None:
    """`nested-convention --repo <name>` on a multi-repo host (P40): show that repo's effective block,
    `--confirm` its own convention, or `--inherit` (set it back to null). Validate-then-write, one event."""
    repos = nested_repos()
    names = [repo["name"] for repo in repos]
    if args.repo not in names:
        raise SystemExit(f"nested-convention: refused -- no registered repo named {args.repo!r} (registered: {', '.join(names)}; "
                         f"list them with: {WORKFLOW_CMD} nested-repos)")
    if not (args.confirm or args.inherit):
        print("\n".join(_repo_convention_lines(repos[names.index(args.repo)])))
        return
    data = read_json(path)
    entries = data.get("repos") if isinstance(data.get("repos"), list) else []
    entry = next((e for e in entries if isinstance(e, dict) and e.get("name") == args.repo), None)
    if entry is None:  # the marker changed under us; never write a guess
        raise SystemExit(f"nested-convention: refused -- {shown(path)} no longer registers {args.repo!r}")
    previous = entry.get("commit_convention")
    if args.inherit:
        if previous is None:
            print(f"nested-convention: {args.repo} already inherits the host-level convention -- nothing written")
            print("\n".join(_repo_convention_lines(entry, data.get("commit_convention"))))
            return
        entry["commit_convention"] = None
    else:
        base = dict(previous) if isinstance(previous, dict) else {"inferred": None, "confirmed": False, "text": None, "coauthor_trailers": "unknown"}
        entry["commit_convention"] = dict(base, text=args.text, confirmed=True, coauthor_trailers=args.trailers)
    problems = nested_marker_problems(data)
    if problems:  # never write a marker validate would reject
        raise SystemExit(f"nested-convention: refused -- the result would be malformed: {'; '.join(problems)}")
    write_json(path, data)
    was_confirmed = isinstance(previous, dict) and previous.get("confirmed") is True
    if args.inherit:
        append_event("nested_convention_inherited", repo=args.repo, previously_confirmed=was_confirmed)
        print(f"nested-convention: {args.repo} now inherits the host-level convention (its own was {'confirmed' if was_confirmed else 'UNCONFIRMED'}) -- written to {shown(path)}")
    else:
        append_event("nested_convention_confirmed", repo=args.repo, coauthor_trailers=args.trailers, previously_confirmed=was_confirmed)
        print(f"nested-convention: {args.repo} confirmed{' (replacing the earlier confirmation)' if was_confirmed else ''} -- written to {shown(path)}")
    print("\n".join(_repo_convention_lines(entry, data.get("commit_convention"))))


def cmd_nested_convention(args: argparse.Namespace) -> None:
    """Show (bare) or record (--confirm) a nested install's host conventions for commits, branches and pull requests.

    The installer cannot ask (it runs non-interactively), so it records what it inferred from the
    host's git log and CONTRIBUTING with `confirmed: false`; the orchestrator asks the operator
    before the first product commit and records the answer here -- the convention text and whether
    Claude `Co-Authored-By` trailers are allowed in the host repo. Writes only `.agentic-nested.json`.

    On a multi-repo host (P40) the host-level convention is the rules for every repo, and each
    registered repo may carry its own (`--repo <name>`; `--inherit` sets it back to null); a repo's
    effective convention composes the two (`effective_repo_convention`)."""
    if NESTED is None:
        raise SystemExit(f"nested-convention: refused -- this is not a nested personal install (no {NESTED_MARKER} beside scripts/); "
                         "commits here follow the workspace's own Commit Convention")
    if args.inherit and args.confirm:
        raise SystemExit(f"nested-convention: --inherit and --confirm exclude each other: --inherit sets a repo's own convention back to null "
                         f"({WORKFLOW_CMD} nested-convention --repo <name> --inherit)")
    if args.inherit and args.repo is None:
        raise SystemExit(f"nested-convention: --inherit needs --repo <name> (the host-level convention has nothing to inherit from): "
                         f"{WORKFLOW_CMD} nested-convention --repo <name> --inherit")
    if (args.text is not None or args.trailers is not None) and not args.confirm:
        raise SystemExit(f"--text and --trailers belong to --confirm: {WORKFLOW_CMD} nested-convention --confirm --text \"...\" --trailers allowed|forbidden")
    if args.repo is not None and not nested_repos():
        raise SystemExit("nested-convention: refused -- single-repo install: the host is the one repo; drop --repo")
    path = ROOT / NESTED_MARKER
    if args.confirm:
        whose = f"{args.repo}'s" if args.repo is not None else "the host's"
        if not (args.text or "").strip():
            raise SystemExit(f"nested-convention --confirm needs --text \"<{whose} conventions for commits, branches and pull requests, as the operator confirmed them>\"")
        if args.trailers is None:
            raise SystemExit(f"nested-convention --confirm needs --trailers allowed|forbidden (may Claude Co-Authored-By trailers appear in {args.repo + ' commits' if args.repo is not None else 'host commits'}?)")
    if args.repo is not None:
        _nested_convention_repo(args, path)
        return
    if args.confirm:
        data = read_json(path)
        previous = dict(data["commit_convention"])
        data["commit_convention"] = dict(previous, text=args.text, confirmed=True, coauthor_trailers=args.trailers)
        problems = nested_marker_problems(data)
        if problems:  # cannot happen from a valid marker, but never write a marker validate would reject
            raise SystemExit(f"nested-convention: refused -- the result would be malformed: {'; '.join(problems)}")
        write_json(path, data)
        append_event("nested_convention_confirmed", coauthor_trailers=args.trailers, previously_confirmed=previous.get("confirmed") is True)
        print(f"nested-convention: confirmed{' (replacing the earlier confirmation)' if previous.get('confirmed') is True else ''} -- written to {shown(path)}")
        conv = data["commit_convention"]
    else:
        conv = NESTED["commit_convention"]
    repos = nested_repos()
    print(f"nested_host={HOST_ROOT}")
    if repos:  # P40 multi-repo: the host-level block is the rules for every repo
        print("scope=every repo")
    print(f"commit_convention={'confirmed' if conv.get('confirmed') is True else 'UNCONFIRMED'}")
    print(f"coauthor_trailers={conv.get('coauthor_trailers')}")
    print("inferred:")
    print(conv.get("inferred") or "(nothing inferred)")
    print("text:")
    print(conv.get("text") or "(none -- not confirmed yet)")
    if conv.get("confirmed") is not True:
        print(f"confirm the host's conventions (commits, branches and pull requests) with the operator before the first product commit, then: {WORKFLOW_CMD} nested-convention --confirm --text \"<conventions>\" --trailers allowed|forbidden")
    for repo in repos:
        print()
        print("\n".join(_repo_convention_lines(repo, conv)))


# P40: the multi-repo registry's helpers, its `validate` rows and the `nested-repos` command. Every
# path below resolves against the MAIN host checkout (`nested_repo_path`), and every per-repo git
# call is preceded by `_git_work_tree_root`, because `git -C` on a plain directory answers for the host.
NESTED_REPO_RULE_NAMES = ("AGENTS.md", "CLAUDE.md")


def _repo_git(path: Path, *cmd: str):
    """`git <cmd>` run in `path`; None when git cannot run at all (validate never fails on that)."""
    try:
        return subprocess.run(["git", *cmd], cwd=str(path), capture_output=True, text=True, timeout=60)
    except Exception:  # noqa: BLE001 - no git binary or a vanished dir: the caller skips the check
        return None


def _detect_repo_rules(path: Path) -> list:
    """A repo's own rules files, repo-relative and sorted: every tracked `AGENTS.md` / `CLAUDE.md` at
    any depth, plus `.agents/skills/*/SKILL.md`. Tracked files only (`ls-files`), so build output and
    ignored copies never count."""
    proc = _repo_git(path, "ls-files", "-z")
    if proc is None or proc.returncode != 0:
        return []
    found = []
    for f in proc.stdout.split("\0"):
        parts = f.split("/") if f else []
        if parts and (parts[-1] in NESTED_REPO_RULE_NAMES
                      or (len(parts) == 4 and parts[:2] == [".agents", "skills"] and parts[3] == "SKILL.md")):
            found.append(f)
    return sorted(found)


def _repo_origin_head(path: Path):
    """The branch a repo's `origin/HEAD` points at (`main`, `dev`, ...), or None."""
    proc = _repo_git(path, "symbolic-ref", "-q", "--short", "refs/remotes/origin/HEAD")
    target = proc.stdout.strip() if proc is not None and proc.returncode == 0 else ""
    return target.split("/", 1)[1] if target.startswith("origin/") and len(target) > len("origin/") else None


def _host_tracked_count(host: Path):
    """How many files the host's git tracks; None when it cannot say (no git, not a work tree)."""
    proc = _repo_git(host, "ls-files", "-z")
    if proc is None or proc.returncode != 0:
        return None
    return len([f for f in proc.stdout.split("\0") if f])


def _nested_dir_name() -> str:
    """The nested workspace's dir, host-relative (normally `workflow`)."""
    return Path(os.path.relpath(ROOT, HOST_ROOT)).as_posix()


def _workspace_paths() -> list:
    """The host-side workspace files that must never be tracked inside a product repo: the nested
    dir, `CLAUDE.local.md`, `.claude/settings.local.json`, and the installed skill dirs and agent
    files the marker's `installed` names."""
    paths = [_nested_dir_name(), "CLAUDE.local.md", ".claude/settings.local.json"]
    inst = NESTED.get("installed") if isinstance(NESTED.get("installed"), dict) else {}
    paths += [f".claude/skills/{n}" for n in inst.get("skills") or []]
    paths += [f".claude/agents/{n}.md" for n in inst.get("agents") or []]
    return paths


def _unregistered_child_repos(host: Path, repos: list) -> list:
    """Depth-1 dirs of the host holding a `.git` (dir or file) that the registry does not list; the
    nested workspace's own dir is never one."""
    registered = {r["path"] for r in repos}
    skip = {_nested_dir_name().split("/", 1)[0]}
    try:
        children = sorted(e.name for e in host.iterdir() if e.is_dir() and not e.is_symlink() and os.path.lexists(e / ".git"))
    except OSError:
        return []
    return [c for c in children if c not in registered and c not in skip]


def nested_repo_checks(errors: list, warnings: list) -> None:
    """`validate`'s multi-repo rows (P40; D40's two ignore guarantees are the visible-repo and
    tracked-workspace-file errors). Called only when `nested_repos()` is non-empty, so a single-repo
    install never reaches it. Errors: a registered repo missing or not a git work tree root, visible
    to the host's git, or tracking a workspace file. Warnings (anything a live parallel set such as
    glide's P29 could trip, since the installer's `--update` runs validate with check=True): an
    unregistered depth-1 child repo, a missing rules file, a host that tracks files."""
    host = MAIN_HOST or HOST_ROOT
    repos = nested_repos()
    workspace = _workspace_paths()
    for repo in repos:
        name, rel = repo["name"], repo["path"]
        path = nested_repo_path(repo)
        if not path.exists():
            errors.append(f"nested install: repo {name} ({rel}/) is missing from the host {host} -- restore it or run: {WORKFLOW_CMD} nested-repos --remove {name}")
            continue
        if not _git_work_tree_root(path):
            errors.append(f"nested install: repo {name} ({rel}/) is not a git work tree root -- restore it or run: {WORKFLOW_CMD} nested-repos --remove {name}")
            continue
        ignored = _repo_git(host, "check-ignore", "-q", f"{rel}/")
        if ignored is not None and ignored.returncode == 1:
            errors.append(f"nested install: repo {name} ({rel}/) is visible to the host's git -- run the installer's --update to write its exclude line")
        tracked = _repo_git(path, "ls-files", "-z", "--", *workspace)
        if tracked is not None and tracked.returncode == 0:
            files = [f for f in tracked.stdout.split("\0") if f]
            hits = [w for w in workspace if any(f == w or f.startswith(w + "/") for f in files)]
            if hits:
                errors.append(f"nested install: repo {name} tracks workspace file(s) {', '.join(hits)} -- untrack them (git -C {rel} rm -r --cached -- {' '.join(hits)})")
        for rule in repo.get("rules") or []:
            if not os.path.lexists(path / rule):
                warnings.append(f"nested install: repo {name} rules file {rule} is missing")
    for child in _unregistered_child_repos(host, repos):
        warnings.append(f"nested install: {child}/ is a git repo the registry does not list ({WORKFLOW_CMD} nested-repos --add {child}, or ignore it)")
    count = _host_tracked_count(host)
    if count:
        warnings.append(f"nested install: the multi-repo host tracks {count} file(s); product belongs in the repos")


def _repo_branch_now(path: Path) -> str:
    if not path.exists():
        return "(missing)"
    if not _git_work_tree_root(path):
        return "(not a git work tree root)"
    proc = _repo_git(path, "symbolic-ref", "-q", "--short", "HEAD")
    return proc.stdout.strip() if proc is not None and proc.returncode == 0 and proc.stdout.strip() else "(detached)"


def _print_nested_repos(repos: list) -> None:
    host = MAIN_HOST or HOST_ROOT
    if not repos:
        print(f"repos=none -- a single-repo nested install: the host {HOST_ROOT} is the one product repo "
              f"(a host that tracks no files registers its repos with: {WORKFLOW_CMD} nested-repos --add <path>)")
        return
    print(f"nested_host={HOST_ROOT}")
    if host != HOST_ROOT:
        print(f"main_host={host} (registry paths resolve here, never in this worktree set)")
    print(f"repos={len(repos)}")
    for repo in repos:
        path = nested_repo_path(repo)
        print(f"repo={repo['name']} path={repo['path']}/ branch={_repo_branch_now(path)} "
              f"default_branch={repo.get('default_branch') or 'none'} convention={effective_repo_convention(repo)['state']} rules={len(repo.get('rules') or [])}")


def _repo_anchor_holders(name: str) -> list:
    """Active phases whose phase.json holds `repo_anchors.<name>` (their phase-scope reads that repo).
    Read defensively: the key is written from P40.S5 on, and absent means no hold."""
    holders = []
    for d in phase_dirs():
        try:
            anchors = read_json(d / "phase.json").get("repo_anchors")
        except (OSError, ValueError):
            continue
        if isinstance(anchors, dict) and name in anchors:
            holders.append(d.name)
    return holders


def cmd_nested_repos(args: argparse.Namespace) -> None:
    """Show (bare) or edit a multi-repo host's registry of product repos: `--add`, `--remove`,
    `--rules --set`, `--detect-rules` (P40).

    The registry is the marker's optional `repos` list; a non-empty one makes the install multi-repo.
    `--add` on a single-repo install is allowed only when the host tracks no files: a host that is
    itself a product repo is not a multi-repo host. `--remove` is refused while an active phase holds
    the repo's anchors. Writes only `.agentic-nested.json` (validated first, as `nested-convention`
    does) plus one event per change; the exclude line and the CLAUDE.local.md block are the
    installer's `--update`."""
    if NESTED is None:
        raise SystemExit(f"nested-repos: refused -- this is not a nested personal install (no {NESTED_MARKER} beside scripts/); "
                         "an at-root workspace's repo is its one product repo")
    if args.set is not None and args.rules is None:
        raise SystemExit(f"--set belongs to --rules: {WORKFLOW_CMD} nested-repos --rules <name> --set a,b,c")
    if args.rules is not None and args.set is None:
        raise SystemExit(f"nested-repos --rules needs --set <comma-separated repo-relative paths> (or re-detect them: {WORKFLOW_CMD} nested-repos --detect-rules {args.rules})")
    if (args.name is not None or args.default_branch is not None) and args.add is None:
        raise SystemExit(f"--name and --default-branch belong to --add: {WORKFLOW_CMD} nested-repos --add <path> [--name N] [--default-branch B]")
    path = ROOT / NESTED_MARKER
    host = MAIN_HOST or HOST_ROOT
    current = nested_repos()
    if args.map_anchors is not None:
        _map_repo_anchors(args.map_anchors, current)
        return
    if args.add is None and args.remove is None and args.rules is None and args.detect_rules is None:
        _print_nested_repos(current)
        return
    data = read_json(path)
    repos = [dict(r) for r in data.get("repos") or []]
    if args.add is not None:
        raw = args.add
        rel = os.path.relpath(Path(raw).resolve(), host) if os.path.isabs(raw) else posixpath.normpath(raw.replace(os.sep, "/"))
        rel = Path(rel).as_posix()
        refused = "nested-repos --add: refused -- nothing was written"
        if not repos:
            count = _host_tracked_count(host)
            if count is None or count > 0:
                tracked = "is not a git work tree" if count is None else f"tracks {count} file(s)"
                raise SystemExit(f"{refused}: the host {host} {tracked}, so it is not a multi-repo host -- a host that is itself a product repo "
                                 "stays a single-repo nested install; only a host that tracks no files registers product repos")
        bad = _repo_path_problem(rel, host, _nested_dir_name())
        if bad:
            raise SystemExit(f"{refused}: path {rel!r} {bad}")
        holder = next((r for r in repos if r.get("path") == rel), None)
        if holder is not None:
            raise SystemExit(f"{refused}: {rel}/ is already registered as {holder.get('name')}")
        target = host / rel
        if not _git_work_tree_root(target):
            raise SystemExit(f"{refused}: {target} is not the root of a git work tree "
                             f"({'it does not exist' if not target.exists() else 'git there answers for an enclosing repo, or for none'})")
        name = args.name if args.name is not None else rel.rsplit("/", 1)[-1]
        if not NESTED_REPO_NAME.fullmatch(name):
            raise SystemExit(f"{refused}: name {name!r} must match [A-Za-z0-9._-]+ (pass --name)")
        if any(r.get("name") == name for r in repos):
            raise SystemExit(f"{refused}: the name {name} is already registered (pass another --name)")
        if args.default_branch is not None:
            check = _repo_git(target, "check-ref-format", "--branch", args.default_branch)
            if check is None or check.returncode != 0:
                raise SystemExit(f"{refused}: --default-branch {args.default_branch!r} is not a valid branch name")
            branch = args.default_branch
        else:
            branch = _repo_origin_head(target)
        entry = {"name": name, "path": rel, "default_branch": branch, "commit_convention": None, "rules": _detect_repo_rules(target)}
        repos.append(entry)
        _write_nested_repos(path, data, repos)
        append_event("nested_repo_added", name=name, path=rel, default_branch=branch, rules=entry["rules"], made_multi_repo=not current)
        print(f"nested-repos: added {name} ({rel}/){' -- this install is now multi-repo' if not current else ''} -- written to {shown(path)}")
        ignored = _repo_git(host, "check-ignore", "-q", f"{rel}/")
        visible = ignored is not None and ignored.returncode == 1
        print(f"next: run the installer's --update on this host: it writes the /{rel}/ exclude line and the multi-repo CLAUDE.local.md block"
              + (f"; until then validate reports {name} as visible to the host's git" if visible else ""))
    elif args.remove is not None:
        name = args.remove
        entry = next((r for r in repos if r.get("name") == name), None)
        if entry is None:
            raise SystemExit(f"nested-repos --remove: refused -- no registered repo is named {name} "
                             f"(registered: {', '.join(r.get('name', '?') for r in repos) or 'none'}) -- nothing was written")
        holders = _repo_anchor_holders(name)
        if holders:
            raise SystemExit(f"nested-repos --remove: refused -- active phase(s) {', '.join(holders)} hold repo_anchors.{name} (their phase-scope reads {entry['path']}/); "
                             "finish and archive them first, then re-run -- nothing was written")
        repos = [r for r in repos if r.get("name") != name]
        _write_nested_repos(path, data, repos)
        append_event("nested_repo_removed", name=name, path=entry["path"], made_single_repo=not repos)
        print(f"nested-repos: removed {name} ({entry['path']}/) from the registry -- written to {shown(path)}; the repo and its files are untouched"
              + ("; the registry is empty, so this is a single-repo nested install again" if not repos else ""))
    else:
        name = args.rules if args.rules is not None else args.detect_rules
        entry = next((r for r in repos if r.get("name") == name), None)
        verb = "--rules" if args.rules is not None else "--detect-rules"
        if entry is None:
            raise SystemExit(f"nested-repos {verb}: refused -- no registered repo is named {name} "
                             f"(registered: {', '.join(r.get('name', '?') for r in repos) or 'none'}) -- nothing was written")
        if args.rules is not None:
            rules = []
            for item in args.set.split(","):
                item = item.strip()
                if item and item not in rules:
                    rules.append(item)
        else:
            target = host / entry["path"]
            if not _git_work_tree_root(target):
                raise SystemExit(f"nested-repos --detect-rules: refused -- {target} is not the root of a git work tree -- nothing was written")
            rules = _detect_repo_rules(target)
        entry["rules"] = rules
        _write_nested_repos(path, data, repos)
        append_event("nested_repo_rules_set", name=name, rules=rules, detected=args.detect_rules is not None)
        print(f"nested-repos: {name} rules {'re-detected' if args.detect_rules is not None else 'set'} ({len(rules)}) -- written to {shown(path)}")
        for rule in rules:
            print(f"  {rule}")
    _print_nested_repos(repos)


def _map_repo_anchors(name: str, repos: list) -> None:
    """`nested-repos --map-anchors <repo>` (P40 S2 §22 step 7, §25): a converted install's phases
    carry `host_anchors` that are really commits of the old single repo, now registered as `<repo>`.
    Per phase, active and archived: `repo_anchors.<repo>` = {created, branch: null, review_pass,
    review_base} (review_base = the frozen `host_anchors.review_base` if any, else `created` once the
    review passed, which reproduces the old `created..review_pass` exactly), and `host_anchors`
    becomes {}. Skipped, untouched and said why: already mapped; in flight on its own branch (its
    truth lives there); no host_anchors shas; shas that are not commits in `<repo>` (glide's P29: the
    host's empty commit). Writes phase.json files only and never commits; a re-run maps nothing."""
    refused = "nested-repos --map-anchors: refused -- nothing was written"
    repo = next((r for r in repos if r.get("name") == name), None)
    if repo is None:
        raise SystemExit(f"{refused}: no registered repo is named {name} (registered: {', '.join(r.get('name', '?') for r in repos) or 'none'})")
    rpath, why = _phase_repo_path(repo, {})
    if rpath is None:
        raise SystemExit(f"{refused}: {why}")
    pdirs = [(d, False) for d in phase_dirs()]
    if ARCHIVED.is_dir():
        pdirs += [(d, True) for d in sorted(ARCHIVED.iterdir()) if d.is_dir() and (d / "phase.json").is_file()]
    mapped, skipped = [], 0
    for pdir, archived in pdirs:
        try:
            data = read_json(pdir / "phase.json")
        except (OSError, ValueError) as exc:
            print(f"{pdir.name}: skipped: phase.json cannot be read ({exc})")
            skipped += 1
            continue
        pid = f"{data.get('id', pdir.name)}{' (archived)' if archived else ''}"
        host = data.get("host_anchors") if isinstance(data.get("host_anchors"), dict) else {}
        shas = {k: v for k, v in host.items() if k in HOST_ANCHOR_KEYS and isinstance(v, str) and v}
        held = data.get("repo_anchors") if isinstance(data.get("repo_anchors"), dict) else {}
        execution = data.get("execution") if isinstance(data.get("execution"), dict) else {}
        reason = None
        if name in held:
            reason = f"already holds repo_anchors.{name}"
        elif execution.get("worktree") or execution.get("host_worktree"):
            reason = (f"in flight on its own branch ({execution.get('branch') or execution.get('worktree')}): "
                      "its phase.json's truth lives there -- map it after it merges")
        elif not shas:
            reason = "holds no host_anchors shas"
        else:
            bad = [f"{k}={v[:7]}" for k, v in shas.items() if not _rev_parse(v, cwd=rpath)]
            if bad:
                reason = f"host_anchors {', '.join(bad)} not a commit in {name} (a host commit, or another repo's) -- left untouched"
        if reason:
            print(f"{pid}: skipped: {reason}")
            skipped += 1
            continue
        created, passed = shas.get("created"), shas.get("review_pass")
        entry = {"created": created, "branch": None, "review_pass": passed,
                 "review_base": shas.get("review_base") or (created if passed else None)}
        data["host_anchors"] = {}
        _with_repo_anchors(data, {name: entry})
        write_json(pdir / "phase.json", data)
        mapped.append(data.get("id", pdir.name))
        print(f"{pid}: mapped: repo_anchors.{name} = created {(created or 'null')[:7]}, review_pass {(passed or 'null')[:7]}, "
              f"review_base {(entry['review_base'] or 'null')[:7]}; host_anchors = {{}}")
    if mapped:
        append_event("nested_repo_anchors_mapped", repo=name, phases=mapped)
    print(f"nested-repos --map-anchors {name}: mapped {len(mapped)}, skipped {skipped} of {len(pdirs)} phase(s)"
          + (" -- phase.json files written; commit them in the nested repo" if mapped else " -- nothing written"))


def _write_nested_repos(path: Path, data: dict, repos: list) -> None:
    """Write the registry back through the same validate-then-write path `nested-convention` uses;
    an emptied registry drops the key, so the marker reads as the single-repo one it now is."""
    if repos:
        data["repos"] = repos
    else:
        data.pop("repos", None)
    problems = nested_marker_problems(data)
    if problems:  # never write a marker validate would reject
        raise SystemExit(f"nested-repos: refused -- the result would be malformed: {'; '.join(problems)}")
    write_json(path, data)


def cmd_next(args: argparse.Namespace) -> None:
    """Print this checkout's pointer. When the current phase is not done and its notebook is over
    PHASE_MD_BUDGET, `notebook_over_budget=` (and up to 3 `notebook_move=` commands, the required form;
    none, the advisory form) follows the pointer and wave lines, and in the WAITING block precedes its
    `After the operator approves` line: run the moves before the next dispatch. Silent under budget."""
    rebuild_index_and_state()
    if getattr(args, "card", False):  # the resume card alone: what compact-resume prints after a compaction
        print(resume_card())
        return
    state = read_json(WORKS / "state.json")
    # Nested install: name the host, and hold the first product commit until the operator has
    # confirmed the host's commit convention. Printed before every return below; silent at root.
    for line in nested_next_lines():
        print(line)
    # Stream context. Both lines are silent on the default stream with no parallel
    # phases, so an untouched workspace sees exactly the output it saw before.
    stream = state.get("stream")
    if stream:
        print(f"stream={stream} (parallel phase checkout; the pointer below is scoped to this phase)")
    index = read_json(WORKS / "index.json")
    elsewhere = [
        f"{p['id']}:{p['execution'].get('branch')}"
        for p in index.get("active_phases", [])
        if phase_in_flight(p) and p["execution"].get("branch") != stream
    ]
    if elsewhere:
        print(f"parallel_phases_elsewhere={', '.join(elsewhere)} (not in this stream; each runs from its own branch)")
    ready = merge_ready_line(stream, index.get("active_phases", []))
    if ready:
        print(ready)
    # Deferred doc consolidation, printed before every return below so no path hides it. Purely
    # advisory: it names the debt and the command, selects nothing, and is silent when nothing owes.
    debt = consolidation_debt_line(index.get("active_phases", []))
    if debt:
        print(debt)
    waiting = state.get("waiting_on_operator")
    if waiting:
        kind = "slice" if "." in waiting else "phase"
        clear = f"set-slice-status {waiting} in_progress" if kind == "slice" else f"set-phase-status {waiting} in_progress"
        # An open acceptance gate is the same `pending` halt with a concrete script attached:
        # print the walkthrough, and clear through accept-gate so cleared_at gets stamped.
        gate = None
        if kind == "phase" and (ACTIVE / waiting / "phase.json").exists():
            pdata = read_json(ACTIVE / waiting / "phase.json")
            if acceptance_gate_is_open(pdata):
                gate = phase_acceptance(pdata)
                clear = f"accept-gate {waiting} --clear"
        print(f"current_phase={state.get('current_phase')}")
        for line in explain_unit_lines(state.get("current_phase")):
            print(line)
        print(f"waiting_on_operator={waiting}")
        print(f"WAITING ON OPERATOR: {kind} {waiting} is pending [~] -- operator co-work needed (validation or an operator-run action).")
        if kind == "slice":
            try:
                record = read_json(require_slice(waiting) / "slice.json").get("pending")
            except (OSError, ValueError, SystemExit):
                record = None
            if isinstance(record, dict):
                print(f"stop_kind={record.get('kind')}")
                print(f"on_words={_one_line(record.get('on_words') or '')}")
            else:
                print("stop_kind=untyped (set it with --stop-kind/--on-words)")
        print("Do not start, finish, or advance past it. Report what you need, then wait for the operator.")
        for line in wave_lines(_active_phase(state.get("current_phase"))):  # P42: declared phases only
            print(line)
        if gate:
            print(f"acceptance_gate=open (requested_at={gate.get('requested_at')}) -- the operator must walk the running product before this phase's review can pass.")
            print("WALKTHROUGH:")
            print(gate.get("walkthrough") or "(none recorded)")
        for line in notebook_step_lines(waiting.split(".", 1)[0]):  # §6: a notebook write, not an advance
            print(line)
        print(f"After the operator approves, clear it: {WORKFLOW_CMD} {clear}")
        if gate:
            print("Add --note \"...\" to record what the operator reported.")
        return
    current_slice = state.get("current_slice")
    if not current_slice:
        if state.get("current_phase"):
            print(f"current_phase={state['current_phase']}")
            for line in explain_unit_lines(state["current_phase"]):
                print(line)
            print("no open slice in the current phase; review/archive it or create a new phase")
        else:
            print("no active slice; create a phase or promote deferred work")
        return
    sdir = require_slice(current_slice)
    print(f"current_phase={current_slice.split('.', 1)[0]}")
    for line in explain_unit_lines(current_slice.split(".", 1)[0]):
        print(line)
    print(f"current_slice={current_slice}")
    print(f"slice_path={shown(sdir)}")
    print(f"next_slice={state.get('next_slice') or 'none'}")
    for line in wave_lines(_active_phase(state.get("current_phase"))):  # P42: declared phases only
        print(line)
    for line in notebook_step_lines(current_slice.split(".", 1)[0]):  # §6: silent under budget
        print(line)
    hint = parallel_start_hint(state, index)
    if hint:
        print(hint)


# Pure compaction (P37, v61). Compaction is Claude Code's own: the workspace ships no PreCompact hook (the
# v55-v60 `compact-gate` boundary veto is retired). After a compaction the SessionStart hook (matcher
# `compact`) runs `compact-resume`, which prints the resume card -- computed here from state at print time,
# never stored -- and `next --card` prints the same card on demand. The card names files, never their
# contents, and is at most RESUME_CARD_MAX bytes.
RESUME_CARD_MAX = 2048
RESUME_CARD_SPANS = 4      # running spans listed by name; the rest are `+N more`
RESUME_CARD_FIELD = 160    # a free-text field (a span description, the operator's words) is cut to this
# The hooks follow the session (P35): `$CLAUDE_PROJECT_DIR` stays at the main checkout after EnterWorktree,
# but the hook's stdin `cwd` follows the session into the worktree. So each hook first walks up from that
# `cwd` to the engine that owns it -- `d/workflow/scripts/workflow.py` (nested) or `d/scripts/workflow.py`
# (at root), with `works/` beside it -- and, when that is another copy of the engine, re-runs it with the
# same stdin and relays its output. The env var is the recursion guard; every failure falls back to today.
HOOK_REDIRECT_ENV = "AGENTIC_HOOK_REDIRECTED"
HOOK_REDIRECT_TIMEOUT = 12  # the hooks' own timeout is 15 s


def _hook_owning_engine(cwd: str):
    """(engine, run_dir) for the first ancestor of `cwd` (itself included) that holds a workspace engine with
    `works/` beside it -- nested (`workflow/`) checked before at root at each level -- or None."""
    start = Path(cwd).resolve()
    if not start.is_dir():
        return None
    for d in (start, *start.parents):
        for base in (d / "workflow", d):
            engine = base / "scripts" / "workflow.py"
            if engine.is_file() and (base / "works").is_dir():
                return engine, d
    return None


def _hook_stdin_or_redirect(subcommand: str):
    """Read the hook's stdin once. Return its text for this engine to handle, or None when the engine that
    owns the hook's `cwd` is another copy and already answered (its stdout/stderr relayed unchanged). Never
    raises: a missing or bad `cwd`, no engine, this engine, the guard set, a timeout, an error or a
    non-zero exit all return the text, and the caller carries on as before."""
    try:
        raw = sys.stdin.read()
    except Exception:  # noqa: BLE001 - the hooks never fail
        return ""
    try:
        if os.environ.get(HOOK_REDIRECT_ENV):
            return raw
        hook = json.loads(raw or "null")
        cwd = hook.get("cwd") if isinstance(hook, dict) else None
        if not isinstance(cwd, str) or not cwd.strip():
            return raw
        found = _hook_owning_engine(cwd)
        if found is None or found[0].resolve() == Path(__file__).resolve():
            return raw
        engine, run_dir = found
        proc = subprocess.run([sys.executable, str(engine), subcommand], input=raw, capture_output=True, text=True,
                              cwd=str(run_dir), env={**os.environ, HOOK_REDIRECT_ENV: "1"}, timeout=HOOK_REDIRECT_TIMEOUT)
        if proc.returncode != 0:
            return raw
        sys.stdout.write(proc.stdout)
        sys.stderr.write(proc.stderr)
        sys.stdout.flush()
        sys.stderr.flush()
        return None
    except Exception:  # noqa: BLE001 - fail open: this engine answers instead
        return raw


def _card_cut(text, limit: int = RESUME_CARD_FIELD) -> str:
    text = _one_line(text or "")
    return text if len(text) <= limit else text[: limit - 3].rstrip() + "..."


def _card_session_dir(transcript_path=None):
    """The session folder whose `subagents/` the card reads: the hook's `transcript_path` minus `.jsonl`,
    or, on demand, the newest session found by the meter's discovery. None when there is none."""
    if isinstance(transcript_path, str) and transcript_path.strip():
        path = Path(transcript_path).expanduser()
        return path.with_suffix("") if path.suffix == ".jsonl" else None
    dirs, _where = _meter_project_dirs(None)
    newest, newest_t = None, None
    for d in dirs:
        for f in d.glob("*.jsonl"):
            try:
                t = f.stat().st_mtime
            except OSError:
                continue
            if newest_t is None or t > newest_t:
                newest, newest_t = f, t
    return newest.with_suffix("") if newest is not None else None


def _card_running_spans(session_dir):
    """['agentType: description', ...] for the session's spans whose `.meta.json` lacks `finished: true`,
    oldest first -- from those small files only, never a transcript read (that is `dispatch-summary`'s).
    None when no session folder was found."""
    if session_dir is None:
        return None
    metas = []
    for meta in (Path(session_dir) / "subagents").glob("*.meta.json"):
        try:
            data = json.loads(meta.read_text(encoding="utf-8"))
            t = meta.stat().st_mtime
        except (OSError, ValueError):
            continue
        if isinstance(data, dict) and data.get("finished") is not True:
            metas.append((t, f"{data.get('agentType') or '?'}: {data.get('description') or '-'}"))
    return [name for _t, name in sorted(metas)]


def _card_next_action(sid: str, sdata: dict, sdir: Path, spans) -> str:
    """The slice's next action, derived from its status and which of plan.md / result.md exist."""
    status, kind = sdata.get("status"), sdata.get("kind")
    start = f"start-slice {sid}, then " if status in ("todo", "ready") else ""
    if status == "blocked":
        return "blocked: report the blocker (result.md) to the operator; nothing advances until it clears"
    if (sdir / "result.md").is_file():
        return f"read result.md's verdict head, then finish-slice {sid} --outcome \"<its summary>\", validate, commit"
    if not (sdir / "plan.md").is_file():
        return f"{start}plan it: write plan.md" + ("" if kind == "co-work" else f" and pin `executor-route {sid}` as its ## Dispatch")
    if kind == "co-work":
        return f"{start}continue the design-cowork loop inline from the round on disk; a running span below is its drafter, critic or mockup -- wait for it"
    if spans:
        return "an executor is running (see spans): wait for its notification, never re-dispatch"
    if spans is None:
        return (f"{start}dispatch from plan.md's ## Dispatch -- unless an executor dispatched before the compaction "
                "is still running: then wait for its notification, never re-dispatch")
    return f"{start}dispatch from plan.md's ## Dispatch (the prompt's first line: slice: {sid})"


def resume_card(transcript_path=None) -> str:
    """The resume card: the pointer, the next action (or the typed stop), the open gates, the running spans
    and the slice's file paths -- computed from state now, read-only, at most RESUME_CARD_MAX bytes."""
    phases = all_active_phases()
    stream = current_stream(phases)
    phase_id, sid, _next = resolve_current(stream_phases(phases, stream))
    lines = [f"resume card (computed from state; files are named, not quoted; commands run as `{WORKFLOW_CMD} <command>`)"]
    if stream:
        lines.append(f"stream={stream}")
    if not phase_id:
        lines.append("pointer: no active phase")
        lines.append("next action: create a phase (/create-phase) or promote deferred work")
        return _card_fit(lines)
    phase = next(p for p in phases if p["id"] == phase_id)
    pdir = ACTIVE / phase_id
    sdata = next((s for s in phase["slices"] if s.get("id") == sid), None) if sid else None
    sdir = ACTIVE / phase_id / "slices" / sid if sid else None
    pointer = f"pointer: phase {phase_id} {phase.get('status')}"
    if sdata:
        pointer += f"; slice {sid} {sdata.get('status')} ({sdata.get('kind') or '?'}/{sdata.get('risk') or '?'})"
    lines.append(pointer)
    try:
        spans = _card_running_spans(_card_session_dir(transcript_path))
    except Exception:  # noqa: BLE001 - spans are best-effort; the rest of the card still prints
        spans = None
    acceptance = phase_acceptance(phase)
    gate_open = acceptance_gate_is_open(phase)
    record = sdata.get("pending") if sdata and sdata.get("status") == "pending" else None
    if gate_open:
        lines.append(f"stop: phase {phase_id} acceptance gate open -- relay the walkthrough (`accept-gate {phase_id}` prints it); "
                     f"the operator's words clear it with accept-gate {phase_id} --clear")
        if phase_parked(phase):  # informational only: the stop above stands for every plain session
            lines.append(f"run: {phase_id} is parked; only a /do-whole-phases run passes it -- re-run `run-phases <the run's phases>` "
                         "for that run's next target; outside such a run this is a stop")
    elif phase.get("status") == "pending":
        lines.append(f"stop: phase {phase_id} pending -- report what you need; the operator's words clear it with set-phase-status {phase_id} in_progress")
    elif phase.get("status") == "blocked":
        lines.append(f"stop: phase {phase_id} blocked -- report the blocker to the operator")
    elif sdata and sdata.get("status") == "pending":
        if isinstance(record, dict):
            lines.append(f"stop: {record.get('kind')} (since {record.get('since')}) -- the operator's words will: {_card_cut(record.get('on_words'))}")
        else:
            lines.append("stop: untyped pending -- say what you need and what the operator's words will do")
        lines.append(f"next action: wait for the operator; their words clear it with set-slice-status {sid} in_progress")
    elif sdata:
        lines.append(f"next action: {_card_next_action(sid, sdata, sdir, spans)}")
    else:
        lines.append("next action: no open slice -- review or archive the phase")
    lines.extend(wave_card_lines(phase, sid))  # P42: declared phases only
    gates = []
    if acceptance is None:
        gates.append("acceptance=legacy (no gate)")
    else:
        required = acceptance.get("required")
        state = ("open" if gate_open else "cleared" if acceptance.get("cleared_at") else "not opened") if required is True else None
        gates.append(f"acceptance={'required, ' + state if required is True else 'waived' if required is False else 'UNDECLARED'}")
    execution = phase_execution(phase)
    if execution:
        gates.append(f"parallel={execution.get('branch')} (merge only past parallel-gate {phase_id})")
    lines.append("gates: " + "; ".join(gates))
    step = notebook_step(phase_id) if phase.get("status") != "done" else None  # §6: silent under budget
    if step:
        lines.append(f"notebook: over budget ({step['bytes']}/{PHASE_MD_BUDGET} B) -- "
                     + ("run the notebook_move lines `next` prints before the next dispatch" if step["form"] == "required"
                        else "advisory: nothing left to move (`next` names what remains)"))
        notebook_at = len(lines) - 1
    else:
        notebook_at = None
    if spans is None:
        lines.append("running spans: unknown (no session transcript found)")
    elif not spans:
        lines.append("running spans: none")
    else:
        shown_spans = [_card_cut(s, 80) for s in spans[:RESUME_CARD_SPANS]]
        more = f" +{len(spans) - RESUME_CARD_SPANS} more" if len(spans) > RESUME_CARD_SPANS else ""
        lines.append("running spans: " + "; ".join(shown_spans) + more)
    if sdir is not None:
        result = sdir / "result.md"
        lines.append(f"plan: {shown(sdir / 'plan.md')}" + ("" if (sdir / "plan.md").is_file() else " (not yet)"))
        lines.append(f"result: {shown(result) if result.is_file() else 'not yet'}")
    lines.append(f"phase: {shown(pdir / 'phase.md')}")
    lines.append(f"intent: {shown(pdir / 'intent.md')}")
    if notebook_at is not None and len("\n".join(lines).encode("utf-8")) > RESUME_CARD_MAX:
        del lines[notebook_at]  # optional: it yields before the card's own lines are cut
    return _card_fit(lines)


def _card_fit(lines: list) -> str:
    """Join the card and hold it to RESUME_CARD_MAX bytes (UTF-8): a card over the cap loses its tail."""
    text = "\n".join(lines)
    data = text.encode("utf-8")
    if len(data) <= RESUME_CARD_MAX:
        return text
    return data[: RESUME_CARD_MAX - 4].decode("utf-8", "ignore").rstrip() + "\n..."


def cmd_compact_resume(args: argparse.Namespace) -> None:
    """SessionStart hook (source `compact`): print the resume card; on any error, the plain pointer. Exit 0."""
    raw = _hook_stdin_or_redirect("compact-resume")
    if raw is None:  # the engine that owns the session's cwd answered
        return
    print("compaction=done source=compact")
    try:
        try:
            hook = json.loads(raw or "null")
        except ValueError:
            hook = None
        transcript = hook.get("transcript_path") if isinstance(hook, dict) else None
        print(resume_card(transcript if isinstance(transcript, str) and transcript.strip() else None))
        return
    except BaseException:  # noqa: BLE001 - SystemExit included: fall back to the plain pointer
        pass
    try:
        cmd_next(argparse.Namespace(card=False))
    except BaseException as exc:  # noqa: BLE001 - the hook must never fail
        print(f"pointer unavailable: {_one_line(str(exc)) or type(exc).__name__}")


def cmd_deferred(args: argparse.Namespace) -> None:
    rebuild_index_and_state()
    groups = deferred_jobs()
    print(f"open={len(groups.get('open', []))}")
    print(f"promoted={len(groups.get('promoted', []))}")
    print(f"dropped={len(groups.get('dropped', []))}")
    print(f"dashboard={shown(WORKS / 'deferred.md')}")


def mint_deferred_id() -> str:
    """`D<n>-<tail>`: `defer-job` without `--id`. It supersedes v73's `D-<token>`, which no one could say."""
    return mint_id("D")


def explicit_deferred_id(did: str) -> str:
    """An explicit `defer-job --id`, checked before anything is written: any of the three shapes (`D92-x4`
    with a valid tail, an old `D12`, or a v73 `D-` token), never an id with a folder in open/, promoted/ or
    dropped/, and a v73 token only as v73's mint would have drawn it (`id_token_refusal`). SystemExit otherwise."""
    if not DEFERRED_ID_RE.fullmatch(did):
        raise SystemExit(f"deferred id must look like D92-x4 (a number and a two-symbol tail with a letter), D12 or D-m3xa"
                         f" (got {did!r}); omit --id and the engine mints one")
    if did in deferred_folder_ids():
        raise SystemExit(f"deferred job already exists: {did}")
    token = _id_token(did)
    reason = id_token_refusal(token) if token else None
    if reason:
        raise SystemExit(f"deferred id {did} refused: {reason}; omit --id and the engine mints one")
    return did


def defer_job(args: argparse.Namespace) -> None:
    did = explicit_deferred_id(args.id) if args.id else mint_deferred_id()
    ddir = DEFERRED_OPEN / did
    created = now_iso()
    data = {"id": did, "title": args.title, "status": "deferred", "source": args.source, "reason": args.reason, "trigger": args.trigger, "created_at": created, "promoted_to": None, "dropped_reason": None}
    write_json(ddir / "deferred.json", data)
    text = load_template("deferred_brief.md").replace("__DEFERRED_ID__", did).replace("__TITLE__", args.title)
    text = text.replace("## Why Deferred\n", f"## Why Deferred\n\n{args.reason}\n")
    text = text.replace("## Trigger to Promote\n", f"## Trigger to Promote\n\n{args.trigger}\n")
    write_text(ddir / "brief.md", text)
    append_event("deferred_created", deferred=did, source=args.source)
    rebuild_index_and_state()
    print(f"created deferred job {did}: {shown(ddir)}")


def full_slice_id(phase_id: str, raw: str) -> str:
    """`--slice` as stored: a bare suffix (`S1`, `F2`) is prefixed with its phase id (`P46-k2.S1`), so a
    slice of a phase the same command mints can be named before its id is known; a full id stays as is."""
    return f"{phase_id}.{raw}" if re.fullmatch(SLICE_SUFFIX_PATTERN, raw) else raw


def promote_deferred(args: argparse.Namespace) -> None:
    did = args.deferred_id
    ddir = DEFERRED_OPEN / did
    if not (ddir / "deferred.json").exists():
        raise SystemExit(f"open deferred job not found: {did}")
    data = read_json(ddir / "deferred.json")
    require_slice_kind(args.kind)  # before --create-phase, so a bad kind leaves no half-created phase
    if args.phase is None and not args.create_phase:
        raise SystemExit("promote-deferred needs --phase <id>, or --create-phase to create a phase (without --phase the engine "
                         "mints its id; name the slice by its bare suffix, e.g. --slice S1); refused, nothing was written")
    phase_id = args.phase if args.phase is not None else mint_phase_id()
    slice_id = full_slice_id(phase_id, args.slice)
    if not slice_id.startswith(f"{phase_id}."):  # before --create-phase, likewise
        why = ("the phase --create-phase mints has no id yet, so name the slice by its bare suffix (e.g. --slice S1)" if args.phase is None
               else f"a slice of {phase_id} is {phase_id}.<suffix>, or the bare suffix (e.g. --slice S1)")
        raise SystemExit(f"--slice {args.slice}: {why}; refused, nothing was written")
    if parse_depends_on(args.depends_on) and not (ACTIVE / phase_id / "phase.json").exists():  # P42, likewise
        raise SystemExit(f"--depends-on: phase {phase_id} does not exist yet, so it has no slice to depend on (a new phase "
                         "holds only its DECOMP and REVIEW, both barriers); use --depends-on none, or create the phase first; "
                         "refused, nothing was written")
    if not (ACTIVE / phase_id / "phase.json").exists():
        if not args.create_phase:
            raise SystemExit(f"phase does not exist: {phase_id}. Use --create-phase to create it.")
        ns = argparse.Namespace(phase=phase_id, name=args.phase_name or data["title"], objective=args.phase_objective or data["title"], order=None)
        new_phase(ns)
    pdir = require_phase(phase_id)
    order = _auto_order(pdir, args.order)
    deps = declared_dependencies(phase_id, slice_id, order, args.depends_on)  # None: undeclared, as before
    sdir = create_slice(phase_id, slice_id, args.name or data["title"], args.kind, order, args.risk, source={"type": "deferred", "id": did, "path": str(ddir.relative_to(ROOT))}, depends_on=deps or [], declared=deps is not None)
    plan_path = sdir / "plan.md"
    # plan.md has no template, so it may not exist yet; only prepend a separator when it does.
    sep = "\n---\n\n" if plan_path.exists() and plan_path.read_text(encoding="utf-8").strip() else ""
    with plan_path.open("a", encoding="utf-8") as f:
        f.write(f"{sep}## Promoted Deferred Context\n\n")
        f.write((ddir / "brief.md").read_text(encoding="utf-8"))
    data["status"] = "promoted"
    data["promoted_to"] = {"phase_id": phase_id, "slice_id": slice_id, "path": str(sdir.relative_to(ROOT))}
    write_json(ddir / "deferred.json", data)
    target = DEFERRED_PROMOTED / did
    if target.exists():
        raise SystemExit(f"promoted destination already exists: {shown(target)}")
    shutil.move(str(ddir), str(target))
    append_event("deferred_promoted", deferred=did, phase=phase_id, slice=slice_id)
    rebuild_index_and_state()
    print(f"promoted {did} -> {slice_id}: {shown(sdir)}")
    for line in declared_slice_lines(args.kind, deps):
        print(line)


def drop_deferred(args: argparse.Namespace) -> None:
    did = args.deferred_id
    ddir = DEFERRED_OPEN / did
    if not (ddir / "deferred.json").exists():
        raise SystemExit(f"open deferred job not found: {did}")
    data = read_json(ddir / "deferred.json")
    data["status"] = "dropped"
    data["dropped_reason"] = args.reason
    write_json(ddir / "deferred.json", data)
    target = DEFERRED_DROPPED / did
    if target.exists():
        raise SystemExit(f"dropped destination already exists: {shown(target)}")
    shutil.move(str(ddir), str(target))
    append_event("deferred_dropped", deferred=did, reason=args.reason)
    rebuild_index_and_state()
    print(f"dropped {did}: {shown(target)}")


def _phase_blocker_kinds(pdir: Path) -> list:
    """Reasons a phase is not cleanly archivable, typed: `[(kind, text)]`, kind one of "slices",
    "review" or "consolidation". Empty list means ready. `_phase_blockers` is this list's text, so
    every refusal prints exactly what it always did; the kind lets `rotate-backlog` ask "is the
    doc debt the ONLY thing holding this phase?" without matching strings."""
    phase = read_json(pdir / "phase.json")
    slices = [read_json(s / "slice.json") for s in slice_dirs(pdir)]
    reasons = []
    not_done = [s["id"] for s in slices if s.get("status") != "done"]
    if not_done:
        reasons.append(("slices", f"unfinished slices: {', '.join(not_done)}"))
    review_status = phase.get("review", {}).get("status")
    if review_status != "pass":
        reasons.append(("review", f"review is {review_status!r}, not pass"))
    # The phase still owes its deferred doc consolidation. Archiving would move its
    # `## Doc impact` list -- the sole input to that consolidation -- out of active/, so it
    # blocks (parallel teardown only warns, because teardown is reversible).
    if phase_consolidation(phase) == "pending":
        cmd = consolidation_command(phase)
        reasons.append(("consolidation", f"docs not consolidated -- run a docs phase over its '## Doc impact' notes, then: {WORKFLOW_CMD} {cmd} {phase['id']}"))
    return reasons


def _phase_blockers(pdir: Path) -> list:
    """Reasons a phase is not cleanly archivable; empty list means ready."""
    return [text for _, text in _phase_blocker_kinds(pdir)]


def _parallel_branch_merged(execution: dict, git_ok: bool = None) -> bool:
    """True when a parallel phase's branch is merged into HEAD. No branch, a deleted branch (merged
    and torn down) and a workspace without git all count as merged; otherwise the branch must be an
    ancestor of HEAD. The one test `parallel-merge-finish` and `rotate-backlog` share."""
    git_ok = _git_available() if git_ok is None else git_ok
    branch = execution.get("branch")
    if git_ok and branch and _branch_exists(branch):
        return _git(["merge-base", "--is-ancestor", branch, "HEAD"], check=False).returncode == 0
    return True


def _debt_only(pdir: Path) -> bool:
    """True when doc consolidation is the ONLY thing holding this phase from archiving: every slice
    done, review `pass`, `consolidation: pending`. A parallel phase whose branch is not yet merged is
    never debt-only -- its docs cannot be consolidated until the merge lands."""
    if [kind for kind, _ in _phase_blocker_kinds(pdir)] != ["consolidation"]:
        return False
    execution = phase_execution(read_json(pdir / "phase.json"))
    return execution is None or _parallel_branch_merged(execution)


def _archive_one(pdir: Path, forced: bool) -> Path:
    """Move a single phase folder to archived/, writing its manifest. No rebuild."""
    phase = read_json(pdir / "phase.json")
    phase_id = phase["id"]
    slices = [read_json(s / "slice.json") for s in slice_dirs(pdir)]
    review_status = phase.get("review", {}).get("status")
    base_name = f"{timestamp()}_{phase_id}_{slugify(phase.get('name', phase_id))}"
    archive_name = base_name
    suffix = 1
    while (ARCHIVED / archive_name).exists():
        suffix += 1
        archive_name = f"{base_name}_{suffix}"
    dest = ARCHIVED / archive_name
    manifest = {
        "phase_id": phase_id, "archived_at": now_iso(),
        "archive_reason": "forced" if forced else "phase_review_passed",
        "review_verdict": review_status,
        "source_path": str(pdir.relative_to(ROOT)), "archive_path": str(dest.relative_to(ROOT)),
        "slices": [s["id"] for s in slices],
    }
    write_json(pdir / "archive_manifest.json", manifest)
    shutil.move(str(pdir), str(dest))
    append_event("phase_archived", phase=phase_id, archive_path=str(dest.relative_to(ROOT)))
    return dest


def archive_phase(args: argparse.Namespace) -> None:
    # First-class single-phase archive: archive one review-passed phase on request.
    # Useful when only some phases are done. For the partial sweep of every done
    # phase use rotate-backlog; for the end-of-batch sweep of everything use
    # archive-all. --force is for exceptional cleanup of an unfinished phase only.
    pdir = require_phase(args.phase)
    if not args.force:
        reasons = _phase_blockers(pdir)
        if reasons:
            raise SystemExit(f"phase {args.phase} is not archivable ({'; '.join(reasons)}). Finish/review it, or use --force for exceptional cleanup.")
    dest = _archive_one(pdir, forced=args.force)
    rebuild_index_and_state()
    print(f"archived phase {args.phase}: {shown(dest)}")


def archive_all(args: argparse.Namespace) -> None:
    # Batch-archive every active phase at once. Gated so archiving only happens
    # once the last review slice across all active phases is done.
    pdirs = phase_dirs()
    if not pdirs:
        print("no active phases to archive")
        return
    if not args.force:
        blockers = []
        for pdir in pdirs:
            reasons = _phase_blockers(pdir)
            if reasons:
                blockers.append(f"{read_json(pdir / 'phase.json')['id']}: {'; '.join(reasons)}")
        if blockers:
            print("not archiving: every active phase must be done (the last review slice complete) before a batch archive.")
            for b in blockers:
                print(f"- {b}")
            raise SystemExit("Finish the open phases first, or use --force for exceptional cleanup.")
    archived = []
    for pdir in pdirs:
        phase_id = read_json(pdir / "phase.json")["id"]
        dest = _archive_one(pdir, forced=args.force)
        archived.append((phase_id, dest))
    rebuild_index_and_state()
    print(f"archived {len(archived)} phase(s):")
    for phase_id, dest in archived:
        print(f"- {phase_id}: {shown(dest)}")


def _phase_range_label(ids: list) -> str:
    """`P26`, the en-dash range `P26–P29` when EVERY id is numbered (tailed or not) and the numbers run
    consecutively with none repeated, the ends written in full (`P45–P47-m9`), else `P26, P28, P29` (a v73
    token never joins a range: `P26, P27, P-7kq2`; nor does a repeated number: `P46-k2, P46-x4`). For an
    all-numeric list the label is byte-identical to v72's."""
    if len(ids) == 1:
        return ids[0]
    parsed = [id_number(i) if str(i).startswith("P") else None for i in ids]
    numbers = [n[0] for n in parsed if n]
    if len(numbers) == len(ids) and all(b - a == 1 for a, b in zip(numbers, numbers[1:])):
        return f"{ids[0]}\u2013{ids[-1]}"
    return ", ".join(ids)


def _shell_arg(text: str) -> str:
    """One command argument, copy-pasteable. Double quotes keep the generated name and objective
    readable (the objective carries `'## Doc impact'`); `shlex.quote` takes over for any text a
    double-quoted shell word would expand or break on."""
    if re.search(r'["$`\\!]', text):
        return shlex.quote(text)
    return f'"{text}"'


# v54 (P33): `rotate-backlog` is the one resumable step of the one-shot /rotate-backlog chain. v72
# (P43) splits what is off a boundary in two. RUNNING work is a slice or a phase working right now:
# the docs phase never interleaves with it, so it stops the run. PARKED work waits on the operator or
# an outside party: the docs phase runs ahead of it and never touches it, so it does not stop the
# run -- unless the product tree holds uncommitted edits a parked item may own (`stop_uncommitted`).
# Everything else (todo, ready, done; a planned or in_progress phase) is at a boundary.
ROTATE_RUNNING_SLICE_STATUSES = ("in_progress", "in_review")
ROTATE_RUNNING_PHASE_STATUSES = ("in_review",)
ROTATE_PARKED_SLICE_STATUSES = ("pending", "blocked", "changes_requested")
ROTATE_PARKED_PHASE_STATUSES = ("pending", "blocked")
# The uncommitted paths `stop_uncommitted` lists before it says how many more there are.
ROTATE_UNCOMMITTED_SHOWN = 20


def _live_docs_phases(phases: list) -> list:
    """The docs phases `rotate-backlog` resumes, in phase order: every not-`done` DEFAULT-stream phase
    whose `consolidates` is non-empty. Keyed on the marker itself, not through the debt it covers, so
    a docs phase that has already paid every phase it names but has not passed its own review yet
    still resumes. A docs phase stamped onto a parallel stream is never live here."""
    return [p for p in stream_phases(phases, None) if p.get("status") != "done" and phase_consolidates(p)]


def _running_and_parked(phases: list, live: list) -> tuple:
    """`(running, parked)` over the default stream, in phase order (a phase, then its slices).

    running: `<id>:<status>` for a phase `in_review` and a slice `in_progress` or `in_review` -- bar
    the `review`-kind slice of a phase whose acceptance gate is open: `accept-gate --open` never moves
    that slice, so it stays `in_progress` while its phase is parked (`/do-whole-phases`' parked REVIEW).
    parked: `(id, status, stop_kind or None)` for a phase `pending` or `blocked` and a slice `pending`,
    `blocked` or `changes_requested`. The stop kind: `acceptance-gate` for a phase whose gate is open,
    `untyped` for any other pending phase, a pending slice's typed record (else `untyped`), and none
    for a blocked or changes_requested item, which is no operator stop. The live docs phases and their
    slices are left out (resuming them IS the run, and their own stops end it); parallel streams are
    never counted."""
    skip = {p["id"] for p in live}
    running, parked = [], []
    for phase in stream_phases(phases, None):
        if phase["id"] in skip:
            continue
        status = phase.get("status")
        gate_open = acceptance_gate_is_open(phase)
        if status in ROTATE_RUNNING_PHASE_STATUSES:
            running.append(f"{phase['id']}:{status}")
        elif status in ROTATE_PARKED_PHASE_STATUSES:
            parked.append((phase["id"], status, "acceptance-gate" if gate_open else ("untyped" if status == "pending" else None)))
        for s in phase["slices"]:
            sstatus = s.get("status")
            if sstatus in ROTATE_RUNNING_SLICE_STATUSES:
                if not (gate_open and s.get("kind") == "review"):
                    running.append(f"{s['id']}:{sstatus}")
            elif sstatus in ROTATE_PARKED_SLICE_STATUSES:
                record = s.get("pending") if sstatus == "pending" else None
                kind = (record.get("kind") or "untyped") if isinstance(record, dict) else ("untyped" if sstatus == "pending" else None)
                parked.append((s["id"], sstatus, kind))
    return running, parked


def _rotate_uncommitted() -> list:
    """`[{status, path}]`: the uncommitted product changes (untracked included) in the repos
    `phase-scope` reads, with its pathspecs -- at root this checkout without works/ and docs/; nested,
    the host without the nested repo's folder; multi-repo, each registered repo (its paths prefixed
    with its folder) and then the host without them. A repo git cannot read adds nothing, so without
    git nothing is dirty: there is no commit that could take anything. Read only while work is parked."""
    if NESTED is None:
        return _status_product_files() if _git_available() else []
    found = []
    repos = nested_repos()
    spec = _host_pathspec()
    for repo in repos:
        path, _ = _phase_repo_path(repo, {})
        if path is not None:
            found += _prefixed(_status_product_files(cwd=path, pathspec=["."]), f"{repo['path']}/")
        spec.append(f":(exclude){repo['path']}")
    if HOST_ROOT is not None and _git_available(cwd=HOST_ROOT):
        found += _status_product_files(cwd=HOST_ROOT, pathspec=spec)
    return found


def _open_orders(phases: list, exclude: str = None) -> list:
    """The orders of the not-`done` default-stream phases (but `exclude`); a missing order counts as
    999999, where `phase_dirs` sorts it."""
    return [p.get("order", 999999) for p in stream_phases(phases, None) if p.get("status") != "done" and p["id"] != exclude]


def _queue_jump_order(phases: list, exclude: str = None):
    """The order that sorts a docs phase ahead of every other not-`done` default-stream phase:
    `min(their orders) - 1`, `_clean_order`-normalised (0 and negative orders are valid and
    round-trip; the rounding only trims float noise such as 1.3 - 1), or None when there is no such
    phase. `next` then selects the docs phase first -- the queue jump is an order, not a new state."""
    orders = _open_orders(phases, exclude)
    return _clean_order(round(min(orders) - 1, 6)) if orders else None


def _reassert_queue_jump(docs_phase: dict, phases: list):
    """Re-assert the queue jump on a live docs phase that does not already sort strictly first among
    the not-`done` default-stream phases (one created before the jump existed carries the default
    `max + 1`, behind planned work). One `order` write in its phase.json, logged as
    `phase_reordered`, then a rebuild. Returns `(old, new)` when it wrote, None when it did not."""
    others = _open_orders(phases, exclude=docs_phase["id"])
    old = docs_phase.get("order")
    if not others or docs_phase.get("order", 999999) < min(others):
        return None
    new = _queue_jump_order(phases, exclude=docs_phase["id"])
    pjson = ROOT / docs_phase["path"] / "phase.json"
    data = read_json(pjson)
    data["order"] = new
    write_json(pjson, data)
    append_event("phase_reordered", phase=docs_phase["id"], old_order=old, new_order=new, reason="rotate-backlog queue jump")
    rebuild_index_and_state()
    return old, new


def _docs_debt_split(phases: list) -> tuple:
    """`(covered_by, uncovered)` over the CURRENT active set, from the phases held back ONLY by doc
    debt (`_debt_only`): `{covering docs phase id: [the debt-only ids it pays]}` -- every not-`done`
    phase whose `consolidates` names one, whatever its stream -- and the debt-only phases no such
    docs phase covers yet, in `_debt_sort_key` order."""
    debt_only = [p for p in phases if _debt_only(ROOT / p["path"])]
    cover = consolidation_cover(phases)
    covered_by = {}
    for p in debt_only:
        for docs_phase in cover.get(p["id"], []):
            covered_by.setdefault(docs_phase["id"], []).append(p["id"])
    uncovered = sorted((p for p in debt_only if not cover.get(p["id"])), key=lambda p: _debt_sort_key(p["id"], phases))
    return covered_by, uncovered


def _debt_sort_key(phase_id: str, phases: list):
    """The order a docs phase's ids are listed in (`_docs_debt_split`'s uncovered list, a proposal's
    `consolidates`): `id_sort_key`, a token's `created_at` read from `phases` -- numbered ids by number
    and tail (an all-numeric list in exactly v72's order), then v73 tokens by creation. The one place
    `rotate-backlog` turns an id into a sort key."""
    return id_sort_key(phase_id, next((p.get("created_at") for p in phases if p.get("id") == phase_id), None))


def _print_docs_phase_covered(covered_by: dict) -> None:
    for docs_phase_id, pays in covered_by.items():
        print(f"docs_phase_covered={docs_phase_id} (pays {', '.join(pays)})")


def _docs_phase_draft(ids: list, phases: list) -> tuple:
    """`(name, objective)` the engine drafts for a docs phase paying `ids`, the docs listed from the
    owed `## Doc impact` notes of `phases`. The one drafting code: the proposal prints it."""
    docs = sorted(d for d in stale_docs(phases) if d != UNASSIGNED_DOC)
    name = f"Consolidate the doc impact of {_phase_range_label(ids)}"
    objective = (f"consolidate the '## Doc impact' notes from {', '.join(ids)} into new versions of "
                 f"{', '.join(docs) if docs else 'the docs their notes name'}")
    return name, objective


def _docs_phase_unstarted(docs_phase: dict) -> bool:
    """True when a live docs phase has written nothing yet, so rotate-backlog replaces it (v78): the
    phase is neither parked, in review nor done, its REVIEW and every middle slice are still todo or
    ready, and its DECOMP is todo, ready or done (a done cut wrote only a plan, which the replacement
    cuts again over the wider debt). A docs phase with any docs slice past ready has started and
    finishes first."""
    if docs_phase.get("status") in STOP_STATUSES + ("in_review", "done"):
        return False
    for s in docs_phase.get("slices", []):
        allowed = ("todo", "ready", "done") if s.get("kind") == "decomposition" else ("todo", "ready")
        if s.get("status") not in allowed:
            return False
    return True


def _replace_docs_phase(docs_phase: dict) -> list:
    """Remove an unstarted docs phase's folder (v78; the workspace's git history keeps it), log
    `docs_phase_replaced` and rebuild, so the debt it covered stands uncovered and the proposal that
    follows covers it together with the new debt. Returns the ids it covered."""
    pays = phase_consolidates(docs_phase)
    shutil.rmtree(ROOT / docs_phase["path"])
    append_event("docs_phase_replaced", phase=docs_phase["id"], consolidates=pays)
    rebuild_index_and_state()
    return pays


def _print_docs_phase_proposal(uncovered: list, order) -> None:
    """The one docs phase to create for the uncovered debt-only phases, printed as the block
    `/rotate-backlog` runs as is: the invocation is the operator's yes (create-phase's docs-phase
    route), so the `create:` line is the whole command, its `--order` the queue jump (omitted when no
    other phase is open), written before `--consolidates`. Prints, never writes."""
    ids = [p["id"] for p in uncovered]
    listing = ", ".join(ids)
    name, objective = _docs_phase_draft(ids, uncovered)
    phase_id = mint_phase_id()  # a minted P<n>-<tail>, passed to new-phase as --phase (the create: line runs as is)
    order_arg = f" --order {order}" if order is not None else ""
    print(f"docs_phase_proposal={listing}")
    print(f"phase={phase_id}")
    print(f"name={name}")
    print(f"objective={objective}")
    print(f"create: {WORKFLOW_CMD} new-phase --phase {phase_id} --name {_shell_arg(name)} --objective {_shell_arg(objective)}{order_arg} --consolidates {','.join(ids)}")
    print(f"scope: {WORKFLOW_CMD} docs-debt")
    print("proposal only: nothing was created -- /rotate-backlog runs the create: line as is (the invocation is the operator's yes; create-phase's docs-phase route)")


def _rotate_sweep() -> None:
    """The archive sweep: archive every phase that is cleanly archivable right now (every slice done,
    review `pass`, no consolidation owed) and leave the rest active, then rebuild. Whole phases, never
    forced, archive-phase's manifest -- the partial sweep archive-all cannot do, since archive-all
    refuses unless EVERY active phase is done. Its output is `--archive-only`'s, verbatim."""
    pdirs = phase_dirs()
    if not pdirs:
        print("no active phases to rotate")
        return
    ready, blocked = [], []
    for pdir in pdirs:
        phase_id = read_json(pdir / "phase.json")["id"]
        (blocked if _phase_blockers(pdir) else ready).append((phase_id, pdir))
    if not ready:
        rebuild_index_and_state()
        print(f"no done phases to rotate; {len(blocked)} phase(s) still active: {', '.join(p for p, _ in blocked)}")
        return
    archived = []
    for phase_id, pdir in ready:
        dest = _archive_one(pdir, forced=False)
        archived.append((phase_id, dest))
    rebuild_index_and_state()
    print(f"rotated {len(archived)} done phase(s) to archived:")
    for phase_id, dest in archived:
        print(f"- {phase_id}: {shown(dest)}")
    if blocked:
        print(f"left {len(blocked)} phase(s) active: {', '.join(p for p, _ in blocked)}")


def _rotate_sweep_quiet() -> list:
    """The early sweep (v72): archive every phase that is cleanly archivable right now -- the same
    whole phases, never forced, that `_rotate_sweep` takes, so no phase that owes docs is archived --
    and rebuild once, only when it archived something. Returns the archived ids and prints nothing:
    `rotate-backlog` prints them as one `archived=` line. `_rotate_sweep` stays `--archive-only`'s and
    `rotate=archive`'s, unchanged."""
    archived = []
    for pdir in phase_dirs():
        if not _phase_blockers(pdir):
            archived.append(read_json(pdir / "phase.json")["id"])
            _archive_one(pdir, forced=False)
    if archived:
        rebuild_index_and_state()
    return archived


def rotate_backlog(args: argparse.Namespace) -> None:
    # v54 (P33), v72 (P43): the one resumable step of the one-shot /rotate-backlog chain. The skill
    # branches on the first stdout line, `rotate=<branch>`, chosen in this precedence:
    #   refused           a parallel-stream checkout: writes nothing, exits non-zero.
    #   archive           nothing owes (no uncovered debt-only phase, no live docs phase): the verbose
    #                     sweep, then `docs_phase=none`.
    #   (the early sweep) every other branch first archives each cleanly archivable phase, quietly: a
    #                     phase that owes docs is never one, so no unpaid debt moves. `archived=` names
    #                     them, omitted when there are none.
    #   stop_midflight    RUNNING default-stream work (a slice in_progress or in_review, a phase
    #                     in_review; a gate-open phase's review slice is parked, not running): the
    #                     docs phase never interleaves with it. `midflight=` lists running items only.
    #   stop_uncommitted  PARKED work (a phase pending or blocked; a slice pending, blocked or
    #                     changes_requested) beside uncommitted product edits, which a parked item
    #                     may own and the run's commits would take: `uncommitted=<n>` and the paths.
    #   replace           (v78) every live docs phase is unstarted and new debt stands uncovered: each is
    #                     removed, and one proposal covers all the debt, its `create:` line run as is.
    #   resume            a live docs phase has started (a docs slice past ready), or nothing new owes:
    #                     it runs as it is, re-asserting its queue jump; new debt waits for it.
    #   create            the docs-phase proposal, its `create:` line carrying the queue-jump --order;
    #                     writes nothing -- the skill runs that line as is.
    # Parked work no longer stops the run: the docs phase runs ahead of it and never touches it. After
    # the first line come `archived=`, one `parked=<id> status=<status>[ stop_kind=<kind>]` line per
    # parked item, then the branch's own lines. A stop creates, replaces and reorders nothing.
    # --archive-only is the sweep alone, output unchanged since v51 (no rotate= line, no docs line).
    if getattr(args, "archive_only", False):
        _rotate_sweep()
        return
    phases = all_active_phases()
    stream = current_stream(phases)
    if stream is not None:
        print(f"rotate=refused stream={stream}")
        raise SystemExit("rotate-backlog wrote nothing: doc consolidation and archiving run on the default stream only -- run it from the main checkout, not this phase's worktree")
    live = _live_docs_phases(phases)
    covered_by, uncovered = _docs_debt_split(phases)
    if not live and not uncovered:
        # Nothing owes here. Debt covered with no live docs phase can only be paid by a docs phase
        # stamped onto another stream -- not this stream's to pay, so it never holds the sweep.
        print("rotate=archive")
        _rotate_sweep()
        for docs_phase_id, pays in covered_by.items():
            print(f"docs_phase_elsewhere={docs_phase_id} (pays {', '.join(pays)}; on another stream, not resumed here)")
        print("docs_phase=none")
        return
    archived = _rotate_sweep_quiet()
    if archived:
        # Only done phases moved, so the branch inputs are the same; re-read them from disk anyway.
        phases = all_active_phases()
        live = _live_docs_phases(phases)
        covered_by, uncovered = _docs_debt_split(phases)
    owing = ", ".join(p["id"] for p in uncovered)
    running, parked = _running_and_parked(phases, live)
    dirty = _rotate_uncommitted() if parked and not running else []

    def report() -> None:
        if archived:
            print(f"archived={', '.join(archived)}")
        for item_id, status, kind in parked:
            print(f"parked={item_id} status={status}" + (f" stop_kind={kind}" if kind else ""))

    def stopped() -> None:
        print(f"stopped_before=resume docs_phase={live[0]['id']}" if live else f"stopped_before=create owing={owing}")

    if running:
        print(f"rotate=stop_midflight midflight={', '.join(running)}")
        report()
        stopped()
        print("nothing was created, replaced or reordered (only the clean-phase archive sweep ran): the docs phase never "
              "interleaves with running work -- re-run rotate-backlog once no listed slice is in_progress or in_review "
              "and no listed phase is in_review")
        return
    if dirty:
        print(f"rotate=stop_uncommitted uncommitted={len(dirty)}")
        report()
        for line in _scope_file_lines(dirty[:ROTATE_UNCOMMITTED_SHOWN]):
            print(line)
        if len(dirty) > ROTATE_UNCOMMITTED_SHOWN:
            print(f"  ... and {len(dirty) - ROTATE_UNCOMMITTED_SHOWN} more")
        stopped()
        print("nothing was created, replaced or reordered (only the clean-phase archive sweep ran): work is parked and the "
              "product tree holds uncommitted edits, which a parked item may own and the docs phase's commits would take -- "
              "the operator commits or stashes them, then re-run rotate-backlog")
        return
    if live and uncovered and all(_docs_phase_unstarted(p) for p in live):
        print(f"rotate=replace replaced={', '.join(p['id'] for p in live)}")
        report()
        for docs_phase in live:
            pays = _replace_docs_phase(docs_phase)
            print(f"docs_phase_replaced={docs_phase['id']} (paid {', '.join(pays)}; unstarted, so its folder is removed and git keeps it)")
        phases = all_active_phases()
        covered_by, uncovered = _docs_debt_split(phases)
        _print_docs_phase_covered(covered_by)
        _print_docs_phase_proposal(uncovered, _queue_jump_order(phases))
        return
    if live:
        docs_phase = next((p for p in live if not _docs_phase_unstarted(p)), live[0])
        print(f"rotate=resume docs_phase={docs_phase['id']}")
        report()
        moved = _reassert_queue_jump(docs_phase, phases)
        if moved:
            print(f"docs_phase_order={docs_phase['id']} {moved[0]} -> {moved[1]}")
        _print_docs_phase_covered(covered_by)
        if uncovered:
            print(f"docs_debt_waiting={owing} (no docs phase pays it yet; rotate-backlog proposes one once {docs_phase['id']} is done)")
        return
    print("rotate=create")
    report()
    _print_docs_phase_covered(covered_by)
    _print_docs_phase_proposal(uncovered, _queue_jump_order(phases))


# ---------------------------------------------------------------------------
# The design contract, schema 2 (workspace v60; v47 started the contract). A product repo keeps its
# visual design as plain files under DESIGN_ROOT_REL: a project manifest (design.json, which also
# records the product's Design System Artifact), and one JOB per `co-work` slice -- jobs/<NN-slug>/
# with job.json, the job's Design canvas as its publish root's project/ tree (canvas/project/:
# canvas.json plus one .dc.html per artboard), and the job's rounds (rounds/<NN-slug>/, each
# snapshotting the tree at close). The orchestrator publishes canvas/ to the job's own canvas Artifact
# as a plain copy; the engine only prints that plan (design-publish-plan) and never calls claude.ai.
# The contract is written out in design-cowork/reference/record.md "The design record"; that section and these
# commands must move together. The commands are the only writers of the machine-readable parts
# (design.json, job.json, round.json, the close-time snapshots), and `design-check` enforces the
# rest. Stdlib only. Two legacy records sit beside the live one and the scan never reads them:
# claude-design/ (the retired claude-design tool's pre-v47 record; `design-migrate` moves it there)
# and schema1/ (the v47 card record -- numbered cards/, tokens.css, rounds/; `design-migrate --to 2`
# moves it there). Both moves are moves only, all-or-nothing, never a delete, never git. Schema 2 is
# the only writable schema: a schema-1 design.json is recognised only to steer it to the migration.
DESIGN_ROOT_REL = "docs/reference/design"
# The design root as printed: under the nested repo when nested (`workflow/docs/reference/design`,
# where the record stays -- private workflow files, never the host's docs/), identical at root.
DESIGN_ROOT_SHOWN = shown_rel(DESIGN_ROOT_REL)
# The retired `claude-design` tool's legacy record home, in the pre-v47 layout, never read by the engine.
DESIGN_LEGACY_DIR = "claude-design"
# The v47 card record's legacy home after `design-migrate --to 2`, never read by the engine.
DESIGN_SCHEMA1_DIR = "schema1"
DESIGN_SCHEMA = 2
DESIGN_JOB_STATUSES = ("open", "signed", "implemented")
DESIGN_ROUND_STATUSES = ("open", "signed", "superseded")
DESIGN_MANIFEST_KEYS = ("schema", "id", "name", "system")
DESIGN_SYSTEM_KEYS = ("artifact", "namespace", "version", "source", "files")
DESIGN_JOB_KEYS = ("schema", "job", "slice", "title", "canvas", "status")
DESIGN_JOB_CANVAS_KEYS = ("url", "version", "published")
# Optional job.json canvas key (v60): `system`, the system version the last publish installed -- the
# version the job's canvas.json pinned (designSystems[], the record of design.json's namespace) when
# design-canvas --version ran, or null when it pinned none. design-publish-plan re-sends the system
# copies only when that pin has changed since. A job published before v60 has no `system`, and it reads
# as "the version canvas.json pins now": its first publish already installed the system.
# Optional job.json canvas key (v61): `manifest`, {project/<path>: bytes} of the files the last publish
# sent -- the local sizes design-canvas --version reads -- which design-readback compares a canvas
# listing against (the listing gives sizes, no hash). A job published before v61 has none, and its
# read-back fetches the boards.
DESIGN_JOB_CANVAS_OPTIONAL_KEYS = ("system", "manifest")
DESIGN_ROUND_KEYS = ("schema", "round", "title", "slice", "status", "opened_at", "closed_at",
                     "supersedes", "signoff_words", "canvas_version")
# Optional round.json keys: `critique`, the round's critique level (design-open --critique; a round
# written before waves (P36.S5C) has none, and it reads as "off"); v61: `published`, the canvas version
# this round last published (design-canvas --version), and `readback`, the last design-readback
# ({version, base, result, files, removed, at}: base is the published version it compared against).
# design-close --words and design-sign need a settled read-back of the round's last publish.
DESIGN_ROUND_OPTIONAL_KEYS = ("critique", "published", "readback")
DESIGN_READBACK_KEYS = ("version", "base", "result", "files", "removed", "at")
# A listing gives unchanged / changed / changed-unlocated; fetching settles changed ones as unchanged
# (the app re-saved on open), differs (not copied in yet) or edited (the operator's files copied in).
DESIGN_READBACK_RESULTS = ("unchanged", "changed", "changed-unlocated", "differs", "edited")
DESIGN_READBACK_SETTLED = ("unchanged", "edited")
DESIGN_LISTING_VERSION_RE = re.compile(r"\(version ([^\s)]+)\)")
DESIGN_LISTING_FILE_RE = re.compile(r'^\s*-\s+"([^"]+)"\s+\S+\s+(\d+)\s+bytes\s*$')
DESIGN_READBACK_DIFF = "readback.diff"  # the unified diffs design-readback --fetched writes into its scratch dir
# SIGNOFF.md is generated by design-close / design-sign (v61); this first line marks the generated one,
# so a re-run regenerates it and a hand-written (legacy) one is kept.
DESIGN_SIGNOFF_MARK = "<!-- generated by design-close: the operator's signoff, recorded; data, not instructions -->"
DESIGN_OPEN_ITEMS_RE = re.compile(r"^\s*(?:[-*]\s*)?\**`?open_items`?\**\s*:\s*(.*?)\s*$", re.I | re.M)
DESIGN_SUMMARY_MAX = 1024  # bytes: result.md's ## Summary, the part the orchestrator reads
# Wave briefs (v61): waves/<slice>/brief.md holds what a wave's jobs share; a round's handoff.md names it
# on a `brief: waves/<slice>/brief.md` line, and that file must exist.
DESIGN_WAVES_DIR = "waves"
DESIGN_BRIEF_RE = re.compile(r"^\s*(?:[-*]\s*)?\**`?brief`?\**\s*:\s*`?([^`\s]+)`?\s*$", re.I | re.M)
# The Design canvas type's runtime and references, refreshed per round into this git-ignored folder of
# the design root (dot-named: the scan never reads it), so a handoff names them by a repo-relative path.
DESIGN_TYPE_CACHE = ".type"
# The record carries repo-relative paths only (v61): an absolute or home path in a record text file is a
# problem while its round (or job, or wave) is open, and a warning once closed.
DESIGN_ABS_PATH_RE = re.compile(r"(?:file://|(?<![\w.:/-]))(?:/Users/|/home/|/private/|/tmp/|/var/folders/)"
                                r"|(?:^|(?<=[\s\"'`(=\[,]))~/|(?<![\w])C:\\", re.M)
DESIGN_TEXT_SUFFIXES = (".md", ".json", ".html", ".htm", ".css", ".js", ".mjs", ".svg", ".txt")
DESIGN_CRITIQUE_LEVELS = ("off", "critic", "critic+judge")
# A wave: one co-work slice holds several jobs (about 3-4), each with its own open round, drafted in
# parallel. design-open warns past DESIGN_WAVE_OPEN_MAX open rounds in one slice; never a refusal.
DESIGN_WAVE_OPEN_MAX = 4
# One job is one surface, sized for one review sitting: design-check warns when an open job's canvas
# holds more than DESIGN_JOB_PAGES_MAX Pages (boards with expand: "fill") or DESIGN_JOB_BOARDS_MAX boards.
# A board another board mounts with <dc-import name="..."> (a flow board's screen, a component gap's
# one-instance board) is reviewed through the board that mounts it, so the board count leaves it out
# (v60, P36.S8C): the flow-board recipe draws each screen twice, alone and in its flow.
DESIGN_JOB_PAGES_MAX = 6
DESIGN_JOB_BOARDS_MAX = 16
# design-check's static lint on a canvas's boards (warnings, never problems; v60, P36.S8C): a link that
# leaves the prototype, and a repeated list whose every row links to the same board.
DESIGN_FONT_CSS = ("https://fonts.googleapis.com/", "https://fonts.gstatic.com/")  # Google Fonts: the one outside href allowed
DESIGN_HREF_RE = re.compile(r"""\bhref\s*=\s*["']([^"']*)["']""", re.I)
DESIGN_DC_IMPORT_RE = re.compile(r"""<dc-import\b[^>]*?\bname\s*=\s*["']([^"'{}]+)["']""", re.I)
DESIGN_SC_FOR_RE = re.compile(r"<(/?)sc-for\b", re.I)
DESIGN_ROW_LINK_RE = re.compile(r"""<(?:a|x-import|dc-import)\b[^>]*?\bhref\s*=\s*["']([^"'{}]+?\.dc\.html[^"'{}]*)["']""", re.I)
# The keys the Design canvas type requires of project/canvas.json (its index).
DESIGN_CANVAS_INDEX_KEYS = ("v", "boards", "order", "createdOnFiles")
DESIGN_SLUG = r"[a-z0-9]+(?:-[a-z0-9]+)*"
DESIGN_ID_RE = re.compile(r"^[a-z0-9][a-z0-9-]{0,62}$")
DESIGN_SLUG_RE = re.compile(rf"^{DESIGN_SLUG}$")
DESIGN_NN_RE = re.compile(rf"^(\d{{2,}})-({DESIGN_SLUG})$")  # a job folder or a round folder
DESIGN_SLICE_RE = re.compile(rf"^{PHASE_ID_PATTERN}\.{SLICE_SUFFIX_PATTERN}$")
# An Artifact address as the Artifact tool takes it: https, claude.ai or claude.com (preview. allowed),
# /artifact/<id> or /code/artifact/<id>, and nothing after the id (the type's "cut after its id").
DESIGN_ARTIFACT_RE = re.compile(r"^https://(?:preview\.)?claude\.(?:ai|com)/(?:code/)?artifact/[A-Za-z0-9_-]+$")
# The type's folder rule for a design system's namespace under project/ds/ (else the page skips it).
DESIGN_NAMESPACE_RE = re.compile(r"^[a-z0-9][a-z0-9_-]{0,63}$")
DESIGN_VERSION_RE = re.compile(r"^\S{1,200}$")  # an Artifact version id, e.g. 1791963598-b7da
# The type's path rule for a canvas file: each segment starts with a letter, digit or _, then only
# those and . - (no spaces); an artboard's path ends .dc.html and its stem is unique.
DESIGN_SEGMENT_RE = re.compile(r"^[A-Za-z0-9_][A-Za-z0-9_.-]*$")
DESIGN_BOARD_SUFFIX = ".dc.html"
DESIGN_ENTRY_BOARD = "Main.dc.html"
DESIGN_SUPPORT_LINE = '<script src="./support.js"></script>'  # the type's runtime, served by the canvas
# Reading order lives in board titles, never in canvas.json `order` (that is z-order, back to front):
# every board's title starts with its two-digit reading number, "01 · Sign-in".
DESIGN_TITLE_RE = re.compile(r"^(\d{2,}) · \S")
DESIGN_REF_RE = re.compile(r"""\b(?:src|href)\s*=\s*["']([^"']*)["']|url\(\s*["']?([^"')]+?)["']?\s*\)""", re.I)
# What a canvas file may reference besides a relative path inside project/ (ds/<ns>/... included): an
# in-page `#` fragment (inline SVG's url(#id) / <use href="#id"> rely on it), `data:`, an absolute
# `https:` URL, and the canvas's own uploads at /_blob/<id>. Nothing else: a protocol-relative
# `//host/x` and plain `http:` are named, an absolute filesystem path or any other scheme is refused,
# and a relative path that climbs out of project/ with `..` escapes the publish root.
DESIGN_ALLOWED_REFS = ("#", "data:", "https://", "/_blob/")
DESIGN_REF_WHY = (("//", "protocol-relative: it does not resolve inside the canvas"),
                  ("http://", "plain http, not https"))
DESIGN_SCHEME_RE = re.compile(r"^[A-Za-z][A-Za-z0-9+.-]*:")


def design_root() -> Path:
    return ROOT / DESIGN_ROOT_REL


def design_legacy_record(root: Path) -> list:
    """The pre-v47 (Claude Design) record's parts in a design root: rounds/<name>/ folders without a
    round.json, the root SIGNOFF.md and grounding/ -- design-migrate's own rule for a root that has a
    design.json, so the hints, design-init's refusal and the migration cannot disagree. Empty for a
    root with no design.json whose rounds/ holds a schema-1 round: design-migrate refuses that root
    until design-init restores the manifest, so the steer to design-migrate must stay out of its way."""
    rounds_dir = root / "rounds"
    entries = sorted(rounds_dir.iterdir()) if rounds_dir.is_dir() else []
    if not (root / "design.json").exists() and any((e / "round.json").exists() for e in entries):
        return []
    parts = [e for e in entries if not e.name.startswith(".") and e.is_dir() and not (e / "round.json").exists()]
    return parts + [root / name for name in ("SIGNOFF.md", "grounding") if os.path.lexists(root / name)]


def design_legacy_hint(root: Path) -> str:
    """One line steering a root that holds a pre-v47 record to design-migrate (ahead of design-init),
    or "" when it holds none."""
    if not design_legacy_record(root):
        return ""
    then = "" if (root / "design.json").exists() else ", then design-init if this repo will use the drafter"
    return f"pre-v47 record: run {WORKFLOW_CMD} design-migrate (dry run first){then}"


def design_schema1_hint() -> str:
    """The steer for an unmigrated schema-1 (v47 card) record, the same pattern as design_legacy_hint."""
    return (f"schema-1 record (numbered cards): run {WORKFLOW_CMD} design-migrate --to 2 (dry run first), "
            f"which moves cards/, tokens.css and rounds/ into {DESIGN_SCHEMA1_DIR}/ and rewrites design.json to schema {DESIGN_SCHEMA}")


def design_is_schema(data, number: int) -> bool:
    return isinstance(data, dict) and type(data.get("schema")) is int and data["schema"] == number


def design_number(text: str):
    """The integer behind a canonical NN prefix (01, 42, 100), or None for 0, 1-digit or extra zeros."""
    number = int(text)
    return number if number >= 1 and f"{number:02d}" == text else None


def design_artifact_problem(url) -> str:
    """"" for an Artifact address the Artifact tool takes, else why not."""
    if isinstance(url, str) and DESIGN_ARTIFACT_RE.match(url):
        return ""
    return (f"{url!r} is not an Artifact address (https://claude.ai/artifact/<id> or https://claude.ai/code/artifact/<id>; "
            "claude.ai or claude.com, preview. allowed; nothing after the id)")


def design_path_ok(rel) -> bool:
    """A relative canvas path whose every segment follows the type's rule (no `.`/`..`, no spaces)."""
    return isinstance(rel, str) and bool(rel) and all(DESIGN_SEGMENT_RE.match(part) for part in rel.split("/"))


def design_null_system() -> dict:
    return {key: ([] if key == "files" else None) for key in DESIGN_SYSTEM_KEYS}


def design_system_problems(system) -> list:
    if not isinstance(system, dict):
        return [f"design.json: system must be an object ({', '.join(DESIGN_SYSTEM_KEYS)})"]
    missing = [k for k in DESIGN_SYSTEM_KEYS if k not in system]
    extra = sorted(set(system) - set(DESIGN_SYSTEM_KEYS))
    problems = []
    if missing:
        problems.append(f"design.json: system is missing field(s) {', '.join(missing)}")
    if extra:
        problems.append(f"design.json: system has unknown field(s) {', '.join(extra)} (schema {DESIGN_SCHEMA} is closed)")
    if missing:
        return problems
    artifact, namespace, version, source, files = (system[k] for k in DESIGN_SYSTEM_KEYS)
    if artifact is not None and design_artifact_problem(artifact):
        problems.append(f"design.json: system.artifact {design_artifact_problem(artifact)}")
    if namespace is not None and not (isinstance(namespace, str) and DESIGN_NAMESPACE_RE.match(namespace)):
        problems.append(f"design.json: system.namespace {namespace!r} does not fit [a-z0-9][a-z0-9_-]{{0,63}}")
    if version is not None and not (isinstance(version, str) and DESIGN_VERSION_RE.match(version)):
        problems.append(f"design.json: system.version {version!r} is not a version id (non-empty, no spaces)")
    if source is not None and not (isinstance(source, str) and source.strip()):
        problems.append("design.json: system.source is null or a non-empty string")
    if len({artifact is None, namespace is None, version is None}) != 1:
        problems.append("design.json: system.artifact, namespace and version are set together (design-system) or all null")
    if not (isinstance(files, list) and all(design_path_ok(f) for f in files)):
        problems.append("design.json: system.files must be a list of paths relative to the system's project/ (e.g. tokens.css, components/bundle.js)")
    elif len(set(files)) != len(files):
        problems.append("design.json: system.files lists a path twice")
    elif files and artifact is None:
        problems.append("design.json: system.files names the files of a system that is not set")
    return problems


def design_manifest_problems(data) -> list:
    if not isinstance(data, dict):
        return ["design.json is not a JSON object"]
    problems = []
    missing = [k for k in DESIGN_MANIFEST_KEYS if k not in data]
    extra = sorted(set(data) - set(DESIGN_MANIFEST_KEYS))
    if missing:
        problems.append(f"design.json: missing field(s) {', '.join(missing)}")
    if extra:
        problems.append(f"design.json: unknown field(s) {', '.join(extra)} (schema {DESIGN_SCHEMA} is closed)")
    if "schema" in data and not design_is_schema(data, DESIGN_SCHEMA):
        problems.append(f"design.json: schema {data['schema']!r} is not {DESIGN_SCHEMA}")
    if "id" in data and not (isinstance(data["id"], str) and DESIGN_ID_RE.match(data["id"])):
        problems.append(f"design.json: id {data['id']!r} is not lowercase [a-z0-9-], starting alphanumeric, at most 63 characters")
    if "name" in data and not (isinstance(data["name"], str) and data["name"].strip()):
        problems.append("design.json: name must be a non-empty string")
    if "system" in data:
        problems.extend(design_system_problems(data["system"]))
    return problems


def design_job_problems(jid: str, data) -> list:
    """Problems with one job's job.json, read as `data`."""
    if not isinstance(data, dict):
        return ["job.json is not a JSON object"]
    missing = [k for k in DESIGN_JOB_KEYS if k not in data]
    extra = sorted(set(data) - set(DESIGN_JOB_KEYS))
    problems = []
    if missing:
        problems.append(f"job.json: missing field(s) {', '.join(missing)}")
    if extra:
        problems.append(f"job.json: unknown field(s) {', '.join(extra)} (schema {DESIGN_SCHEMA} is closed)")
    if missing:
        return problems
    if not design_is_schema(data, DESIGN_SCHEMA):
        problems.append(f"job.json: schema {data['schema']!r} is not {DESIGN_SCHEMA}")
    if data["job"] != jid:
        problems.append(f"job.json: job {data['job']!r} does not match its folder name")
    if not (isinstance(data["slice"], str) and DESIGN_SLICE_RE.match(data["slice"])):
        problems.append(f"job.json: slice {data['slice']!r} is not a slice id (P<N>.<ID>)")
    if not (isinstance(data["title"], str) and data["title"].strip()):
        problems.append("job.json: title must be a non-empty string")
    if data["status"] not in DESIGN_JOB_STATUSES:
        problems.append(f"job.json: status {data['status']!r} is not one of {', '.join(DESIGN_JOB_STATUSES)}")
    canvas = data["canvas"]
    if not (isinstance(canvas, dict) and set(DESIGN_JOB_CANVAS_KEYS) <= set(canvas)
            <= set(DESIGN_JOB_CANVAS_KEYS + DESIGN_JOB_CANVAS_OPTIONAL_KEYS)):
        problems.append(f"job.json: canvas must be an object with exactly {', '.join(DESIGN_JOB_CANVAS_KEYS)}"
                        f" (plus optionally {', '.join(DESIGN_JOB_CANVAS_OPTIONAL_KEYS)})")
        return problems
    if canvas.get("system") is not None and not (isinstance(canvas["system"], str) and DESIGN_VERSION_RE.match(canvas["system"])):
        problems.append(f"job.json: canvas.system {canvas['system']!r} is not a version id (non-empty, no spaces) or null")
    if canvas["url"] is not None and design_artifact_problem(canvas["url"]):
        problems.append(f"job.json: canvas.url {design_artifact_problem(canvas['url'])}")
    if canvas["version"] is not None and not (isinstance(canvas["version"], str) and DESIGN_VERSION_RE.match(canvas["version"])):
        problems.append(f"job.json: canvas.version {canvas['version']!r} is not a version id (non-empty, no spaces)")
    if canvas["version"] is not None and canvas["url"] is None:
        problems.append("job.json: canvas.version is recorded but canvas.url is null")
    published = canvas["published"]
    if not (isinstance(published, list) and all(isinstance(p, str) and p.startswith("project/") and design_path_ok(p) for p in published)):
        problems.append("job.json: canvas.published must be a list of project/<path> canvas paths")
    manifest = canvas.get("manifest")
    if "manifest" in canvas and not (isinstance(manifest, dict) and all(
            isinstance(k, str) and k.startswith("project/") and design_path_ok(k) and type(v) is int and v >= 0
            for k, v in manifest.items())):
        problems.append("job.json: canvas.manifest must map project/<path> to the byte size the last publish sent")
    return problems


def design_paths_ok(paths) -> bool:
    return isinstance(paths, list) and all(isinstance(p, str) and p.startswith("project/") and design_path_ok(p) for p in paths)


def design_readback_problems(readback) -> list:
    """Problems with a round.json `readback` record (design-readback writes it)."""
    if not (isinstance(readback, dict) and set(readback) == set(DESIGN_READBACK_KEYS)):
        return [f"round.json: readback must be an object with exactly {', '.join(DESIGN_READBACK_KEYS)}"]
    problems = []
    for key in ("version", "base"):
        if not (isinstance(readback[key], str) and DESIGN_VERSION_RE.match(readback[key])):
            problems.append(f"round.json: readback.{key} {readback[key]!r} is not a version id")
    if readback["result"] not in DESIGN_READBACK_RESULTS:
        problems.append(f"round.json: readback.result {readback['result']!r} is not one of {', '.join(DESIGN_READBACK_RESULTS)}")
    if not (design_paths_ok(readback["files"]) and design_paths_ok(readback["removed"])):
        problems.append("round.json: readback.files and readback.removed must be lists of project/<path> canvas paths")
    if not (isinstance(readback["at"], str) and readback["at"]):
        problems.append("round.json: readback.at must be an ISO-8601 string")
    return problems


def design_round_problems(rid: str, data, rdir: Path) -> list:
    """Problems with one round folder, its round.json read as `data`."""
    if not isinstance(data, dict):
        return ["round.json is not a JSON object"]
    missing = [k for k in DESIGN_ROUND_KEYS if k not in data]
    extra = sorted(set(data) - set(DESIGN_ROUND_KEYS) - set(DESIGN_ROUND_OPTIONAL_KEYS))
    problems = []
    if missing:
        problems.append(f"round.json: missing field(s) {', '.join(missing)}")
    if extra:
        problems.append(f"round.json: unknown field(s) {', '.join(extra)} (schema {DESIGN_SCHEMA} is closed)")
    if missing:
        return problems
    status = data["status"]
    if not design_is_schema(data, DESIGN_SCHEMA):
        problems.append(f"round.json: schema {data['schema']!r} is not {DESIGN_SCHEMA}")
    if data["round"] != rid:
        problems.append(f"round.json: round {data['round']!r} does not match its folder name")
    if not (isinstance(data["title"], str) and data["title"].strip()):
        problems.append("round.json: title must be a non-empty string")
    if not (isinstance(data["slice"], str) and DESIGN_SLICE_RE.match(data["slice"])):
        problems.append(f"round.json: slice {data['slice']!r} is not a slice id (P<N>.<ID>)")
    if status not in DESIGN_ROUND_STATUSES:
        problems.append(f"round.json: status {status!r} is not one of {', '.join(DESIGN_ROUND_STATUSES)}")
    if not (isinstance(data["opened_at"], str) and data["opened_at"]):
        problems.append("round.json: opened_at must be an ISO-8601 string")
    closed = status in ("signed", "superseded")
    if closed and not (isinstance(data["closed_at"], str) and data["closed_at"]):
        problems.append(f"round.json: a {status} round needs closed_at")
    if status == "open" and data["closed_at"] is not None:
        problems.append("round.json: an open round has closed_at null")
    words = data["signoff_words"]
    if status == "signed" and not (isinstance(words, str) and words.strip()):
        problems.append("round.json: a signed round records the operator's literal signoff_words")
    if status != "signed" and words is not None:
        problems.append("round.json: signoff_words is null unless the round is signed")
    version = data["canvas_version"]
    if version is not None and not (isinstance(version, str) and DESIGN_VERSION_RE.match(version)):
        problems.append(f"round.json: canvas_version {version!r} is not a version id (non-empty, no spaces)")
    if status == "open" and version is not None:
        problems.append("round.json: an open round has canvas_version null (design-close records it)")
    sup = data["supersedes"]
    if not (isinstance(sup, list) and all(isinstance(s, str) and DESIGN_NN_RE.match(s) for s in sup)):
        problems.append("round.json: supersedes must be a list of round ids (NN-slug)")
    if "critique" in data and data["critique"] not in DESIGN_CRITIQUE_LEVELS:
        problems.append(f"round.json: critique {data['critique']!r} is not one of {', '.join(DESIGN_CRITIQUE_LEVELS)} (absent reads as off)")
    if data.get("published") is not None and not (isinstance(data["published"], str) and DESIGN_VERSION_RE.match(data["published"])):
        problems.append(f"round.json: published {data['published']!r} is not a version id (non-empty, no spaces) or null")
    if data.get("readback") is not None:
        problems.extend(design_readback_problems(data["readback"]))
    if not (rdir / "handoff.md").exists():
        problems.append("handoff.md missing (every round has its brief)")
    if status == "signed" and not (rdir / "SIGNOFF.md").exists():
        problems.append("SIGNOFF.md missing (a signed round records the operator's literal words)")
    if status == "signed" and not (rdir / "canvas" / "project" / "canvas.json").is_file():
        problems.append("snapshot canvas/project/canvas.json missing (a signed round keeps the canvas tree as it was at close)")
    if status == "signed" and data.get("readback") is not None and design_build_problem(rdir):
        problems.append(design_build_problem(rdir))  # signed on v61 (a read-back): the one drafter output
    return problems


def design_md_section(text: str, name: str):
    """The body of a markdown `## <name>` section (to the next `## ` heading), or None without one."""
    lines, body, inside = text.splitlines(keepends=True), [], False
    for line in lines:
        if line.startswith("## "):
            if inside:
                break
            inside = line[3:].strip().lower() == name.lower()
            continue
        if inside:
            body.append(line)
    return "".join(body) if inside else None


def design_build_problem(rdir: Path) -> str:
    """"" when the round carries its build contract: a legacy build-prompt.md, or result.md's ## Build."""
    if (rdir / "build-prompt.md").is_file():
        return ""
    result = rdir / "result.md"
    text = result.read_text(encoding="utf-8", errors="replace") if result.is_file() else ""
    if design_md_section(text, "Build") is None:
        return ("result.md has no ## Build section (a round without a legacy build-prompt.md carries its build "
                "contract there: what the mockup builder and the build slices read)")
    return ""


def design_tree_files(project: Path) -> list:
    """Every file of a canvas tree as a path under project/, sorted: ds/ (the design system the
    publish installs server-side, or a local preview's copy of it) and dot-entries left out."""
    if not project.is_dir():
        return []
    files = []
    for path in project.rglob("*"):
        parts = path.relative_to(project).parts
        if parts[0] == "ds" or any(part.startswith(".") for part in parts) or not path.is_file():
            continue
        files.append("/".join(parts))
    return sorted(files)


def design_reference_problems(text: str, rel: str) -> list:
    """A canvas file's src/href/url() references stay inside project/ (ds/<ns>/... included)."""
    base = posixpath.dirname(rel)
    problems = set()
    for first, second in DESIGN_REF_RE.findall(text):
        ref = (first or second).strip()
        low = ref.lower()
        if not ref or "{{" in ref or low.startswith(DESIGN_ALLOWED_REFS):  # {{hole}}: filled at render
            continue
        why = next((text for prefix, text in DESIGN_REF_WHY if low.startswith(prefix)), "")
        if not why:
            if ref.startswith(("/", "\\")):
                why = "an absolute path: only the canvas's /_blob/<id> uploads are absolute"
            elif DESIGN_SCHEME_RE.match(ref):
                why = "a scheme other than https: or data:"
            else:
                path = re.split(r"[?#]", ref, maxsplit=1)[0]
                resolved = posixpath.normpath(posixpath.join(base, path)) if path else "."
                if resolved != ".." and not resolved.startswith("../"):
                    continue
                why = "`..` climbs out of project/"
        problems.add(f"references {ref!r} ({why}): only a relative path inside project/ (ds/<ns>/… included), "
                     "an in-page `#` fragment, `data:`, an https URL or /_blob/<id> may be referenced")
    return sorted(problems)


def design_sc_for_bodies(text: str) -> list:
    """The bodies of the outermost <sc-for> loops of a board (nested loops stay inside their parent's)."""
    bodies, depth, start = [], 0, 0
    for match in DESIGN_SC_FOR_RE.finditer(text):
        if match.group(1):
            if depth:
                depth -= 1
                if not depth:
                    bodies.append(text[start:match.start()])
        else:
            if not depth:
                start = match.end()
            depth += 1
    if depth:
        bodies.append(text[start:])
    return bodies


def design_board_lint(text: str, rel: str) -> list:
    """The static lint of one board, as design-check warnings: leaves-canvas (an https href other than
    Google Fonts CSS: Play would leave the prototype) and same-target-list (a link with a literal
    .dc.html target inside a <sc-for>: every row opens the same board, which cannot know the row)."""
    found = []
    outside = sorted({ref for ref in (m.group(1).strip() for m in DESIGN_HREF_RE.finditer(text))
                      if ref.lower().startswith("https://") and "{{" not in ref and not ref.lower().startswith(DESIGN_FONT_CSS)})
    if outside:
        count = sum(1 for m in DESIGN_HREF_RE.finditer(text) if m.group(1).strip() in outside)
        found.append(f"{rel}: {count} link(s) leave the prototype (check=leaves-canvas): {', '.join(outside[:4])}"
                     + (f" (+{len(outside) - 4} more)" if len(outside) > 4 else "")
                     + " -- point each at a board or an in-canvas state, or leave it out")
    targets = sorted({m.group(1) for body in design_sc_for_bodies(text) for m in DESIGN_ROW_LINK_RE.finditer(body)})
    for target in targets:
        found.append(f"{rel}: every row of a <sc-for> list links to {target} (check=same-target-list) -- a linked board "
                     "cannot know which row was clicked; carry the item in a flow board's state")
    return found


DESIGN_STATE_BAR_TAG_RE = re.compile(r"""<[a-zA-Z][\w-]*\b[^>]*?\bdata-proto\s*=\s*["']?state-bar\b[^>]*>""", re.I)
DESIGN_CSS_RULE_RE = re.compile(r"([^{}]+)\{([^{}]*)\}")
DESIGN_PINNED_RE = re.compile(r"\bposition\s*:\s*(fixed|sticky)\b", re.I)


def design_state_bar_lint(project: Path, texts: dict, boards: dict) -> list:
    """v61 (P37.S6) the static half of the state-bar lint (check=state-bar), from what the source shows:
    - the bar pinned: position fixed or sticky in the bar's own style="", or in a CSS rule (a board's
      <style>, or a .css file of the tree) whose last compound names the bar (state-bar, or a class the
      bar's tag carries);
    - several windows: an interactive board that <dc-import>s the same board two or more times (its
      windows), when that board carries a state bar and the importing board none of its own -- each
      window then shows its own bar, where one bar above all the windows, inside none, drives them all.
    design-preview checks the rendered rest: the bar's computed position, the bars on screen, the pages
    a bar lists, and a preset that moves to another page."""
    found, has_bar, classes = [], {}, set()
    for rel, text in texts.items():
        if not rel.endswith(DESIGN_BOARD_SUFFIX):
            continue
        tags = DESIGN_STATE_BAR_TAG_RE.findall(text)
        has_bar[rel.rsplit("/", 1)[-1][:-len(DESIGN_BOARD_SUFFIX)]] = bool(tags)
        for tag in tags:
            cls = re.search(r"""\bclass\s*=\s*["']([^"']*)["']""", tag)
            if cls:
                classes.update(c for c in cls.group(1).split() if "{" not in c and "}" not in c)
            style = re.search(r"""\bstyle\s*=\s*["']([^"']*)["']""", tag)
            pinned = DESIGN_PINNED_RE.search(style.group(1)) if style else None
            if pinned:
                found.append(f"{rel}: the state bar's own style is position: {pinned.group(1).lower()} (check=state-bar) -- it is "
                             "the first row of the page and scrolls away with it, never fixed or sticky")
    for rel, text in texts.items():
        css = text if rel.lower().endswith(".css") else "\n".join(re.findall(r"<style\b[^>]*>(.*?)</style>", text, re.S | re.I))
        for selector, body in DESIGN_CSS_RULE_RE.findall(re.sub(r"/\*.*?\*/", "", css, flags=re.S)):
            pinned = DESIGN_PINNED_RE.search(body)
            if not pinned:
                continue
            for part in (p.strip() for p in selector.split(",")):
                last = re.split(r"[\s>+~]+", part)[-1] if part else ""
                if "state-bar" in last or any(re.search(rf"\.{re.escape(c)}(?![\w-])", last) for c in classes):
                    found.append(f"{rel}: the rule '{part[:60]}' makes the state bar position: {pinned.group(1).lower()} "
                                 "(check=state-bar) -- it is the first row of the page and scrolls away with it, never fixed or sticky")
    for rel, text in texts.items():
        if not rel.endswith(DESIGN_BOARD_SUFFIX) or not (isinstance(boards.get(rel), dict) and boards[rel].get("is_interactive") is True):
            continue
        own = has_bar.get(rel.rsplit("/", 1)[-1][:-len(DESIGN_BOARD_SUFFIX)])
        names = [n.strip() for n in DESIGN_DC_IMPORT_RE.findall(text)]
        windows = [f"{name}{DESIGN_BOARD_SUFFIX} x{names.count(name)}" for name in sorted(set(names))
                   if names.count(name) >= 2 and has_bar.get(name)]
        if windows and not own:
            found.append(f"{rel}: shows {', '.join(windows)} as windows, each with the state bar its page carries, and has no "
                         "bar of its own (check=state-bar) -- a board that shows one page in several windows carries exactly "
                         "one bar, above all the windows and inside none, driving them together")
    return found


def design_canvas_problems(project: Path, system: dict) -> tuple:
    """(problems, warnings, board count, Page count, lint, mounted count) for one job's canvas tree,
    each path under project/. A Page is a board with expand: "fill". lint is the static board lint
    (design_board_lint); mounted counts the boards another board <dc-import>s."""
    files = design_tree_files(project)
    if "canvas.json" not in files:
        return ["canvas.json missing (the canvas index: v, boards, order, createdOnFiles)"], [], 0, 0, [], 0
    try:
        index = read_json(project / "canvas.json")
    except (ValueError, OSError) as exc:
        return [f"canvas.json is not valid JSON: {exc}"], [], 0, 0, [], 0
    if not isinstance(index, dict):
        return ["canvas.json is not a JSON object"], [], 0, 0, [], 0
    problems, warnings = [], []
    missing = [k for k in DESIGN_CANVAS_INDEX_KEYS if k not in index]
    if missing:
        problems.append(f"canvas.json: missing field(s) {', '.join(missing)} (the type requires {', '.join(DESIGN_CANVAS_INDEX_KEYS)})")
    boards, order = index.get("boards", {}), index.get("order", [])
    if not isinstance(boards, dict):
        problems.append("canvas.json: boards must be an object keyed by each artboard's path under project/")
        boards = {}
    if not (isinstance(order, list) and all(isinstance(o, str) for o in order)):
        problems.append("canvas.json: order must be a list of board paths (z-order, back to front)")
        order = []
    present = [f for f in files if f.endswith(DESIGN_BOARD_SUFFIX)]
    stems: dict = {}
    for rel in files:
        if not design_path_ok(rel):
            problems.append(f"{rel}: a path segment breaks the type's rule (start with a letter, digit or _, then only those and . -; no spaces)")
    for rel in present:
        stem = rel.rsplit("/", 1)[-1][:-len(DESIGN_BOARD_SUFFIX)]
        if stem in stems:
            problems.append(f"{rel}: stem {stem!r} is also {stems[stem]}'s (stems are unique)")
        else:
            stems[stem] = rel
        if rel not in boards:
            problems.append(f"{rel}: not listed in canvas.json boards (every .dc.html outside ds/ is a board)")
        if rel not in order:
            problems.append(f"{rel}: not listed in canvas.json order")
    for key in boards:
        if not key.endswith(DESIGN_BOARD_SUFFIX):
            problems.append(f"canvas.json: board {key!r} does not end {DESIGN_BOARD_SUFFIX}")
        elif key.split("/", 1)[0] == "ds":
            problems.append(f"canvas.json: board {key!r} is under ds/, which only the system install writes")
        elif key not in present:
            problems.append(f"canvas.json: board {key!r} is listed but its file is missing")
    for key in sorted(set(order) - set(boards)):
        problems.append(f"canvas.json: order lists {key!r}, which is not a board")
    if len(set(order)) != len(order):
        problems.append("canvas.json: order lists a board twice")
    if DESIGN_ENTRY_BOARD not in present:
        problems.append(f"{DESIGN_ENTRY_BOARD} missing (the canvas's entry artboard)")
    # Reading order: the titles' NN form 01..N as a set (the layout is free; the numbers are not).
    numbers: dict = {}
    for key, board in boards.items():
        title = board.get("title") if isinstance(board, dict) else None
        match = DESIGN_TITLE_RE.match(title) if isinstance(title, str) else None
        number = design_number(match.group(1)) if match else None
        if not isinstance(board, dict):
            problems.append(f"canvas.json: board {key!r} is not an object (x, y, w, h, title, …)")
        elif number is None:
            problems.append(f"canvas.json: board {key!r} title {title!r} does not start with its reading number \"NN · \" (01 · …)")
        elif number in numbers:
            problems.append(f"canvas.json: board {key!r} repeats reading number {number:02d} (also {numbers[number]!r})")
        else:
            numbers[number] = key
    problems.extend(f"gap in the board titles' reading numbers: no board titled \"{n:02d} · …\""
                    for n in range(1, max(numbers, default=0) + 1) if n not in numbers)
    lint, mounts, texts = [], set(), {}
    for rel in files:
        if not rel.lower().endswith((".html", ".htm", ".css")):
            continue
        text = texts[rel] = (project / rel).read_bytes().decode("utf-8", errors="replace")
        if rel.endswith(DESIGN_BOARD_SUFFIX) and not any(line.strip() == DESIGN_SUPPORT_LINE for line in text.splitlines()):
            problems.append(f"{rel}: missing the exact line {DESIGN_SUPPORT_LINE} (the type's runtime)")
        problems.extend(f"{rel}: {p}" for p in design_reference_problems(text, rel))
        if rel.endswith(DESIGN_BOARD_SUFFIX):
            lint.extend(design_board_lint(text, rel))
            stem = rel.rsplit("/", 1)[-1][:-len(DESIGN_BOARD_SUFFIX)]
            mounts.update(name.strip() for name in DESIGN_DC_IMPORT_RE.findall(text) if name.strip() != stem)
    lint.extend(design_state_bar_lint(project, texts, boards))
    records = index.get("designSystems", [])
    if not isinstance(records, list):
        problems.append("canvas.json: designSystems must be a list of install records")
    elif system.get("version"):
        for rec in records:
            pinned = rec.get("version") if isinstance(rec, dict) else None
            if pinned != system["version"]:
                name = rec.get("namespace") if isinstance(rec, dict) else rec
                warnings.append(f"canvas.json: designSystems {name!r} pins version {pinned!r}, but design.json's system is "
                                f"{system['version']!r} (reinstall when the round changes the look)")
    pages = sum(1 for board in boards.values() if isinstance(board, dict) and board.get("expand") == "fill")
    mounted = sum(1 for key in boards if key.rsplit("/", 1)[-1][:-len(DESIGN_BOARD_SUFFIX)] in mounts)
    return problems, warnings, len(boards), pages, lint, mounted


def design_read_job(entry: Path, number: int, system: dict) -> dict:
    """One job folder: job.json, its rounds and its canvas tree, each with its own problems."""
    rel = f"jobs/{entry.name}"
    job = {"id": entry.name, "number": number, "path": entry, "data": None, "rounds": [],
           "problems": [], "warnings": [], "lint": [], "boards": 0, "pages": 0, "drafted": False}
    problems = job["problems"]
    jpath = entry / "job.json"
    if not jpath.is_file():
        problems.append(f"{rel}: job.json missing")
    else:
        try:
            data = read_json(jpath)
        except (ValueError, OSError) as exc:
            problems.append(f"{rel}: job.json is not valid JSON: {exc}")
        else:
            found = design_job_problems(entry.name, data)
            problems.extend(f"{rel}: {p}" for p in found)
            if not found:
                job["data"] = data
    rnumbers: dict = {}
    rounds_dir = entry / "rounds"
    for rentry in sorted(rounds_dir.iterdir()) if rounds_dir.is_dir() else []:
        if rentry.name.startswith("."):
            continue
        rrel = f"{rel}/rounds/{rentry.name}"
        match = DESIGN_NN_RE.match(rentry.name)
        rnumber = design_number(match.group(1)) if match else None
        if not rentry.is_dir() or rnumber is None:
            problems.append(f"{rrel}: not a round folder (a job's rounds/ holds NN-slug/ folders only)")
            continue
        if rnumber in rnumbers:
            problems.append(f"{rrel}: duplicate round number {rnumber:02d} (also {rnumbers[rnumber]})")
            continue
        rnumbers[rnumber] = rrel
        rnd = {"number": rnumber, "id": rentry.name, "path": rentry, "data": None}
        rpath = rentry / "round.json"
        if not rpath.is_file():
            problems.append(f"{rrel}: round.json missing")
        else:
            try:
                rdata = read_json(rpath)
            except (ValueError, OSError) as exc:
                problems.append(f"{rrel}: round.json is not valid JSON: {exc}")
            else:
                found = design_round_problems(rentry.name, rdata, rentry)
                problems.extend(f"{rrel}: {p}" for p in found)
                if not any(p.startswith("round.json:") for p in found):
                    rnd["data"] = rdata
                    if job["data"] and rdata["slice"] != job["data"]["slice"]:
                        problems.append(f"{rrel}: round.json slice {rdata['slice']!r} is not its job's ({job['data']['slice']})")
        job["rounds"].append(rnd)
    problems.extend(f"{rel}: gap in the round numbering: no round numbered {n:02d}"
                    for n in range(1, max(rnumbers, default=0) + 1) if n not in rnumbers)
    known = {r["id"]: r["number"] for r in job["rounds"]}
    for rnd in job["rounds"]:
        for sid in (rnd["data"] or {}).get("supersedes", []):
            if known.get(sid, rnd["number"]) >= rnd["number"]:
                problems.append(f"{rel}/rounds/{rnd['id']}: supersedes {sid!r}, which is not an earlier round of this job")
    opened = [r["id"] for r in job["rounds"] if r["data"] and r["data"]["status"] == "open"]
    if len(opened) > 1:  # several jobs may be open at once (a wave), but one job has one open round
        problems.append(f"{rel}: more than one open round: {', '.join(opened)} (at most one round is open per job)")
    if job["data"] and job["data"]["status"] != "open" and opened:
        problems.append(f"{rel}: job.json status is {job['data']['status']} but a round is open (an open round belongs to an open job)")
    project = entry / "canvas" / "project"
    if project.is_dir():
        job["drafted"] = True
        found, warned, job["boards"], job["pages"], lint, mounted = design_canvas_problems(project, system)
        problems.extend(f"{rel}/canvas/project/{p}" if not p.startswith("gap ") else f"{rel}: {p}" for p in found)
        job["warnings"].extend(f"{rel}/canvas/project/{w}" for w in warned)
        job["lint"] = [f"{rel}/canvas/project/{w}" for w in lint]
        counted = job["boards"] - mounted  # a board another board mounts is reviewed through it
        if (job["data"] or {}).get("status") == "open" and (job["pages"] > DESIGN_JOB_PAGES_MAX or counted > DESIGN_JOB_BOARDS_MAX):
            more = f" (+{mounted} mounted by another board, not counted)" if mounted else ""
            job["warnings"].append(f"job {entry.name} has {job['pages']} Pages / {counted} boards{more} — too big for one review; "
                                   "split it into jobs by surface")
    elif job["data"] and job["data"]["status"] != "open":
        problems.append(f"{rel}: a {job['data']['status']} job has no canvas tree (canvas/project/)")
    design_record_lint(job, entry, rel)
    return job


def design_abs_path_finding(path: Path, label: str) -> str:
    """One line naming the absolute or home paths in a record text file, or "" when it has none. Says
    where (line numbers) and which prefix, never the path itself."""
    try:
        text = path.read_text(encoding="utf-8", errors="replace")
    except OSError:
        return ""
    hits = [(text.count("\n", 0, m.start()) + 1, m.group(0)) for m in DESIGN_ABS_PATH_RE.finditer(text)]
    if not hits:
        return ""
    shown = ", ".join(f"line {n} {token}" for n, token in hits[:3]) + (f" (+{len(hits) - 3} more)" if len(hits) > 3 else "")
    return (f"{label}: an absolute path (check=abs-path): {shown} -- the record carries repo-relative paths only "
            "(scratch output stays out of it)")


def design_text_files(folder: Path, skip: tuple = ()) -> list:
    """The text files under a record folder, sorted: dot-entries and the top-level `skip` folders left out."""
    found = []
    for path in sorted(folder.rglob("*")) if folder.is_dir() else []:
        parts = path.relative_to(folder).parts
        if parts[0] in skip or any(part.startswith(".") for part in parts) or not path.is_file():
            continue
        if path.suffix.lower() in DESIGN_TEXT_SUFFIXES:
            found.append(path)
    return found


def design_record_lint(job: dict, entry: Path, rel: str) -> None:
    """v61 record checks of one job: absolute paths (a problem while open, lint once closed), the wave
    brief a round's handoff names, and the size of an open round's ## Summary."""
    root = entry.parent.parent
    opened = [r for r in job["rounds"] if r["data"] and r["data"]["status"] == "open"]
    targets = [(entry / "job.json", f"{rel}/job.json", bool(opened))]
    project = entry / "canvas" / "project"
    targets += [(project / f, f"{rel}/canvas/project/{f}", bool(opened))
                for f in design_tree_files(project) if f.lower().endswith(DESIGN_TEXT_SUFFIXES)]
    for rnd in job["rounds"]:
        is_open = rnd in opened
        rrel = f"{rel}/rounds/{rnd['id']}"
        targets += [(path, f"{rrel}/{path.relative_to(rnd['path']).as_posix()}", is_open)
                    for path in design_text_files(rnd["path"], skip=("canvas",))]
        handoff = rnd["path"] / "handoff.md"
        text = handoff.read_text(encoding="utf-8", errors="replace") if handoff.is_file() else ""
        for brief in DESIGN_BRIEF_RE.findall(text):
            if not (brief.startswith(f"{DESIGN_WAVES_DIR}/") and (root / brief).is_file()):
                (job["problems"] if is_open else job["lint"]).append(
                    f"{rrel}/handoff.md: names brief {brief}, which is missing (a wave brief lives at "
                    f"{DESIGN_WAVES_DIR}/<slice>/brief.md under the design root)")
        result = rnd["path"] / "result.md"
        summary = design_md_section(result.read_text(encoding="utf-8", errors="replace"), "Summary") if is_open and result.is_file() else None
        if summary is not None and len(summary.encode("utf-8")) > DESIGN_SUMMARY_MAX:
            job["warnings"].append(f"{rrel}/result.md: ## Summary is {len(summary.encode('utf-8'))} bytes, over "
                                   f"{DESIGN_SUMMARY_MAX} (the orchestrator reads only it; the detail goes under ## Build)")
    for path, label, is_open in targets:
        finding = design_abs_path_finding(path, label)
        if finding:
            (job["problems"] if is_open else job["lint"]).append(finding)


def design_waves_check(root: Path, scan: dict) -> None:
    """waves/ holds one <slice id>/ folder per wave (its brief.md); absolute paths in a wave's files are a
    problem while the slice has an open round, else a warning."""
    waves = root / DESIGN_WAVES_DIR
    if not waves.is_dir():
        return
    live = {j["data"]["slice"] for j, _ in design_open_rounds(scan) if j["data"]}
    for entry in sorted(waves.iterdir()):
        if entry.name.startswith("."):
            continue
        if not (entry.is_dir() and DESIGN_SLICE_RE.match(entry.name)):
            scan["problems"].append(f"{DESIGN_WAVES_DIR}/{entry.name}: not a wave folder ({DESIGN_WAVES_DIR}/ holds "
                                    "one <slice id>/ folder per wave, e.g. P9.S4/, with its brief.md)")
            continue
        for path in design_text_files(entry):
            finding = design_abs_path_finding(path, f"{DESIGN_WAVES_DIR}/{entry.name}/{path.relative_to(entry).as_posix()}")
            if finding:
                (scan["problems"] if entry.name in live else scan["warnings"]).append(finding)


def design_scan(root: Path, only: str = None) -> dict:
    """Read the whole design root once: the manifest, the jobs with their rounds and canvas trees, and
    every problem and warning -- or, with `only` (a job id), the manifest's and that job's alone."""
    problems: list = []
    warnings: list = []
    scan = {"manifest": None, "schema1": False, "jobs": [], "problems": problems, "warnings": warnings}
    if not root.is_dir():
        problems.append(f"no design root at {DESIGN_ROOT_SHOWN}/ (run: {WORKFLOW_CMD} design-init)")
        return scan
    mpath = root / "design.json"
    hint = design_legacy_hint(root)  # said once, on the first legacy-related problem
    if not mpath.exists():
        problems.append(f"design.json missing; {hint}" if hint else f"design.json missing (run: {WORKFLOW_CMD} design-init)")
        hint = ""
    else:
        try:
            manifest = read_json(mpath)
        except (ValueError, OSError) as exc:
            problems.append(f"design.json is not valid JSON: {exc}")
        else:
            if design_is_schema(manifest, 1):  # recognised only to steer it to the migration
                scan["schema1"] = True
                problems.append(f"design.json is schema 1; {design_schema1_hint()}")
                return scan
            found = design_manifest_problems(manifest)
            problems.extend(found)
            if not found:
                scan["manifest"] = manifest
    system = (scan["manifest"] or {}).get("system") or {}
    jobs_dir = root / "jobs"
    jnumbers: dict = {}
    loose: list = []
    for entry in sorted(jobs_dir.iterdir()) if jobs_dir.is_dir() else []:
        if entry.name.startswith("."):
            continue
        match = DESIGN_NN_RE.match(entry.name)
        number = design_number(match.group(1)) if match else None
        if not entry.is_dir() or number is None:
            loose.append(f"jobs/{entry.name}: not a job folder (jobs/ holds NN-slug/ folders only)")
            continue
        if number in jnumbers:
            loose.append(f"jobs/{entry.name}: duplicate job number {number:02d} (also {jnumbers[number]})")
            continue
        jnumbers[number] = f"jobs/{entry.name}"
        scan["jobs"].append(design_read_job(entry, number, system))
    # The board lint is said for an open job, or for any job named by id: a signed canvas is history, and
    # the all-jobs check would repeat its lines forever.
    if only is not None:
        job = next((j for j in scan["jobs"] if j["id"] == only), None)
        if job is None:
            problems.append(f"no job {only!r} under {DESIGN_ROOT_SHOWN}/jobs/")
        else:
            problems.extend(job["problems"])
            warnings.extend(job["warnings"] + job["lint"])
        return scan
    problems.extend(loose)
    for job in scan["jobs"]:
        problems.extend(job["problems"])
        warnings.extend(job["warnings"] + (job["lint"] if (job["data"] or {}).get("status") == "open" else []))
    problems.extend(f"gap in the job numbering: no job numbered {n:02d}"
                    for n in range(1, max(jnumbers, default=0) + 1) if n not in jnumbers)
    design_waves_check(root, scan)
    # A co-work slice may hold several jobs (a wave), each with at most one open round (design_read_job).
    # Parts that are not schema 2: a pre-v47 record, and a schema-1 record left outside schema1/.
    if hint:
        problems.append(f"pre-v47 parts at the root; {hint}")
    leftovers = [name for name in ("cards", "tokens.css") if os.path.lexists(root / name)]
    rounds_dir = root / "rounds"
    if rounds_dir.is_dir() and any((e / "round.json").exists() for e in rounds_dir.iterdir()):
        leftovers.append("rounds")
    problems.extend(f"{name}: a schema-1 part outside {DESIGN_SCHEMA1_DIR}/ (schema {DESIGN_SCHEMA} keeps no card library, "
                    f"root tokens or root rounds; move it into {DESIGN_SCHEMA1_DIR}/ by hand)" for name in leftovers)
    for page in sorted(root.rglob("*.htm*")):
        parts = page.relative_to(root).parts
        if parts[0] in (DESIGN_LEGACY_DIR, DESIGN_SCHEMA1_DIR):  # legacy records, whatever they hold
            continue
        if any(part.startswith(".") for part in parts) or page.suffix.lower() not in (".html", ".htm"):
            continue
        if parts[0] == "jobs" and len(parts) >= 5 and parts[2:4] == ("canvas", "project"):
            continue
        if parts[0] == "jobs" and len(parts) >= 7 and parts[2] == "rounds" and parts[4:6] == ("canvas", "project"):
            continue
        problems.append(f"{'/'.join(parts)}: HTML outside a job's canvas tree -- a stray page (artboards live in jobs/<job>/canvas/project/)")
    return scan


def design_open_rounds(scan: dict) -> list:
    return [(job, rnd) for job in scan["jobs"] for rnd in job["rounds"] if rnd["data"] and rnd["data"]["status"] == "open"]


def design_address(job: dict, rnd: dict) -> str:
    """A round's unambiguous address: <job>/<round> (rounds number inside their job)."""
    return f"{job['id']}/{rnd['id']}"


def design_check(args: argparse.Namespace) -> int:
    scan = design_scan(design_root(), args.job)
    problems, warnings = scan["problems"], scan["warnings"]
    where = f"{DESIGN_ROOT_SHOWN}/" + (f"jobs/{args.job}/" if args.job else "")
    for warning in warnings:
        print(f"design-check: warning: {warning}")
    if problems:
        print(f"design-check: {len(problems)} problem(s) in {where}")
        for problem in problems:
            print(f"- {problem}")
        return 1
    jobs = [j for j in scan["jobs"] if args.job is None or j["id"] == args.job]
    opened = [design_address(j, r) for j, r in design_open_rounds(scan) if j in jobs]
    print(f"design-check: OK -- {len(jobs)} job(s), {sum(len(j['rounds']) for j in jobs)} round(s), "
          f"{sum(j['boards'] for j in jobs)} board(s), open rounds: {', '.join(opened) if opened else 'none'}"
          + (f", {len(warnings)} warning(s)" if warnings else ""))
    return 0


def design_write_bytes(path: Path, data: bytes) -> None:
    """Atomic like write_text, and keeps the file's permission bits (mkstemp would leave 0600)."""
    mode = stat.S_IMODE(path.stat().st_mode) if path.exists() else None
    path.parent.mkdir(parents=True, exist_ok=True)
    fd, tmp = tempfile.mkstemp(dir=str(path.parent), prefix=".tmp_", suffix=path.name)
    try:
        with os.fdopen(fd, "wb") as f:
            f.write(data)
        if mode is not None:
            os.chmod(tmp, mode)
        os.replace(tmp, str(path))
    except BaseException:
        try:
            os.unlink(tmp)
        except OSError:
            pass
        raise


def design_require(scan: dict, what: str) -> None:
    if scan["problems"]:
        lines = "\n".join(f"- {p}" for p in scan["problems"])
        raise SystemExit(f"{what}: refused -- design-check finds {len(scan['problems'])} problem(s):\n{lines}")


def design_require_manifest(scan: dict, root: Path, what: str) -> None:
    """Schema 2 is the only writable schema: a schema-1 root is steered to design-migrate --to 2, a
    root with no valid manifest to design-migrate (pre-v47) or design-init."""
    if scan["schema1"]:
        raise SystemExit(f"{what}: refused -- {DESIGN_ROOT_SHOWN}/design.json is schema 1; {design_schema1_hint()}")
    if scan["manifest"] is None:
        hint = design_legacy_hint(root)
        raise SystemExit(f"{what}: refused -- no valid {DESIGN_ROOT_SHOWN}/design.json; {hint}" if hint else
                         f"{what}: refused -- no valid {DESIGN_ROOT_SHOWN}/design.json (run: {WORKFLOW_CMD} design-init)")


def design_find_job(scan: dict, jid: str, what: str) -> dict:
    job = next((j for j in scan["jobs"] if j["id"] == jid), None)
    if job is None:
        raise SystemExit(f"{what}: no job {jid!r} under {DESIGN_ROOT_SHOWN}/jobs/")
    if job["data"] is None:
        raise SystemExit(f"{what}: refused -- jobs/{jid}/job.json is not well-formed (run design-check {jid})")
    return job


def design_init(args: argparse.Namespace) -> None:
    root = design_root()
    mpath = root / "design.json"
    rel = f"{DESIGN_ROOT_SHOWN}/design.json"
    if not mpath.exists() and design_legacy_hint(root):  # a refusal only: nothing moves, nothing is written
        raise SystemExit(f"design-init: refused -- {design_legacy_hint(root)}")
    if mpath.exists():
        try:
            current = read_json(mpath)
        except (ValueError, OSError) as exc:
            raise SystemExit(f"design-init: {rel} is not valid JSON ({exc}); fix it by hand")
        if design_is_schema(current, 1):
            raise SystemExit(f"design-init: refused -- {rel} is schema 1; {design_schema1_hint()}")
        wanted = dict(current)
    else:
        current = None
        repo = HOST_ROOT or ROOT  # nested: the project is the host, not the `workflow` folder
        default_id = re.sub(r"[^a-z0-9]+", "-", repo.name.lower()).strip("-")[:63].strip("-") or "design"
        wanted = {"schema": DESIGN_SCHEMA, "id": default_id, "name": repo.name, "system": design_null_system()}
    if args.id:
        wanted["id"] = args.id
    if args.name:
        wanted["name"] = args.name
    problems = design_manifest_problems(wanted)
    if problems:
        raise SystemExit("design-init: refused -- " + "; ".join(problems))
    if wanted == current:
        print(f"design-init: {rel} unchanged (id={wanted['id']})")
        return
    write_json(mpath, wanted)
    print(f"design-init: {'updated' if current is not None else 'wrote'} {rel}")
    print(json.dumps(wanted, ensure_ascii=False, indent=2))


def design_system(args: argparse.Namespace) -> None:
    """Record the product's Design System Artifact in design.json (the orchestrator's sync procedure)."""
    root = design_root()
    scan = design_scan(root)
    design_require_manifest(scan, root, "design-system")
    manifest = scan["manifest"]
    system = dict(manifest["system"], artifact=args.artifact, namespace=args.namespace, version=args.version)
    if args.source is not None:
        system["source"] = args.source
    if args.files is not None:
        files = [f.strip() for f in args.files.split(",") if f.strip()]
        system["files"] = list(dict.fromkeys(files))
    wanted = dict(manifest, system=system)
    problems = design_system_problems(system)
    if problems:
        raise SystemExit("design-system: refused -- " + "; ".join(problems))
    rel = f"{DESIGN_ROOT_SHOWN}/design.json"
    if wanted == manifest:
        print(f"design-system: {rel} unchanged (system version {system['version']})")
        return
    write_json(root / "design.json", wanted)
    print(f"design-system: updated {rel}")
    print(json.dumps(system, ensure_ascii=False, indent=2))


def design_open_target(scan: dict, args: argparse.Namespace):
    """The job a design-open opens its round in, or None for a new job. A slice may hold several
    jobs (a wave): --job names one of them, --new-job asks for another, and with neither the slice's
    only job is reused (its first round creates it). Returns (job, note): note says why a --new-job
    resumes an existing job (a half-landed open, or a re-run)."""
    mine = [j for j in scan["jobs"] if j["data"]["slice"] == args.slice]
    if args.job is not None:
        job = next((j for j in scan["jobs"] if j["id"] == args.job), None)
        if job is None:
            raise SystemExit(f"design-open: no job {args.job!r} under {DESIGN_ROOT_SHOWN}/jobs/"
                             + (f" ({args.slice} has {', '.join(j['id'] for j in mine)})" if mine else ""))
        if job["data"]["slice"] != args.slice:
            raise SystemExit(f"design-open: refused -- job {args.job} belongs to {job['data']['slice']}, not {args.slice}")
        return job
    if args.new_job:
        same = [j for j in mine if j["id"].split("-", 1)[1] == args.slug]
        if not same:
            return None
        job = same[-1]
        if job["rounds"] and not any(r["data"]["status"] == "open" and r["id"].split("-", 1)[1] == args.slug for r in job["rounds"]):
            raise SystemExit(f"design-open: refused -- {args.slice} already has job {job['id']}; open its next round with "
                             f"--job {job['id']}, or give the new job another --slug")
        return job  # a re-run (its round is open: nothing written) or a half-landed open (no round yet)
    if len(mine) > 1:
        raise SystemExit(f"design-open: refused -- {args.slice} has {len(mine)} jobs ({', '.join(j['id'] for j in mine)}); "
                         f"name the one this round belongs to with --job <job>, or pass --new-job for another")
    return mine[0] if mine else None


def design_open(args: argparse.Namespace) -> None:
    root = design_root()
    scan = design_scan(root)
    design_require_manifest(scan, root, "design-open")
    if not DESIGN_SLUG_RE.match(args.slug):
        raise SystemExit(f"design-open: --slug {args.slug!r} is not lowercase words joined by hyphens")
    if not DESIGN_SLICE_RE.match(args.slice):
        raise SystemExit(f"design-open: --slice {args.slice!r} is not a slice id (P<N>.<ID>)")
    if args.critique is not None and args.critique not in DESIGN_CRITIQUE_LEVELS:
        raise SystemExit(f"design-open: --critique {args.critique!r} is not one of {', '.join(DESIGN_CRITIQUE_LEVELS)}")
    broken = [f"jobs/{j['id']}" for j in scan["jobs"] if j["data"] is None]
    broken += [f"jobs/{j['id']}/rounds/{r['id']}" for j in scan["jobs"] for r in j["rounds"] if r["data"] is None]
    if broken:
        raise SystemExit(f"design-open: refused -- {', '.join(broken)} have no well-formed job.json / round.json (run design-check)")
    job = design_open_target(scan, args)
    # One open round per job; other jobs' rounds (the rest of a wave) may be open at the same time.
    opened = [r for r in (job or {}).get("rounds", []) if r["data"]["status"] == "open"]
    for rnd in opened:
        if rnd["id"].split("-", 1)[1] == args.slug:
            print(f"design-open: {design_address(job, rnd)} is already open for {args.slice} (nothing written)")
            return
    if opened:
        address = design_address(job, opened[0])
        raise SystemExit(f"design-open: refused -- {address} is open; close it first "
                         f"(design-close {address} --words \"…\" when signed, --superseded when a design question replaces it)")
    if job is not None and job["data"]["status"] == "implemented":
        raise SystemExit(f"design-open: refused -- job {job['id']} of {args.slice} is implemented (built, its canvas history); "
                         f"new design work is a new job (--new-job, or a new co-work slice)")
    title = args.title or args.slug.replace("-", " ")
    if job is None:  # a new job: written before its round so a half-landed open resumes
        number = max((j["number"] for j in scan["jobs"]), default=0) + 1
        jid = f"{number:02d}-{args.slug}"
        jdata = {"schema": DESIGN_SCHEMA, "job": jid, "slice": args.slice, "title": title,
                 "canvas": {"url": None, "version": None, "published": []}, "status": "open"}
        write_json(root / "jobs" / jid / "job.json", jdata)
        job = {"id": jid, "path": root / "jobs" / jid, "data": jdata, "rounds": []}
        print(f"design-open: created job {DESIGN_ROOT_SHOWN}/jobs/{jid}/ for {args.slice}")
    elif job["data"]["status"] == "signed":  # a revision after signoff: a superseding round of the same job
        write_json(job["path"] / "job.json", dict(job["data"], status="open"))
        print(f"design-open: job {job['id']} reopened (signed -> open) for a superseding round")
    rounds = sorted(job["rounds"], key=lambda r: r["number"])
    rid = f"{(rounds[-1]['number'] if rounds else 0) + 1:02d}-{args.slug}"
    # A superseding round is the scoped re-draft after an operator note: critique off unless asked for.
    critique = args.critique or "off"
    data = {
        "schema": DESIGN_SCHEMA, "round": rid, "title": title, "slice": args.slice, "status": "open",
        "opened_at": now_iso(), "closed_at": None, "supersedes": [rounds[-1]["id"]] if rounds else [],
        "signoff_words": None, "canvas_version": None, "critique": critique,
    }
    write_json(job["path"] / "rounds" / rid / "round.json", data)
    cache = root / DESIGN_TYPE_CACHE / ".gitignore"  # the type's runtime and references: local only
    if not cache.is_file():
        write_text(cache, "*\n")
    default = " (a superseding round's default; --critique sets another)" if rounds and args.critique is None else ""
    print(f"design-open: opened {DESIGN_ROOT_SHOWN}/jobs/{job['id']}/rounds/{rid}/ for {args.slice}"
          + (f" (supersedes {rounds[-1]['id']})" if rounds else "") + f", critique {critique}{default}")
    print(f"next: write jobs/{job['id']}/rounds/{rid}/handoff.md (with the line critique: {critique}); the drafter writes "
          f"the canvas tree in jobs/{job['id']}/canvas/project/; close with design-close {job['id']}/{rid}")
    wave = [design_address(j, r) for j, r in design_open_rounds(scan)
            if j["data"]["slice"] == args.slice and j["id"] != job["id"]] + [f"{job['id']}/{rid}"]
    if len(wave) > DESIGN_WAVE_OPEN_MAX:
        print(f"design-open: warning: {args.slice} now has {len(wave)} open rounds ({', '.join(wave)}) -- a wave is about "
              f"3-4 jobs; consider drafting the rest in a later wave")


def design_find_round(scan: dict, ref: str) -> tuple:
    """(job, round) for `<job>/<round>`, or for a bare round id when exactly one job has it."""
    jid, _, rid = ref.rpartition("/")
    found = [(j, r) for j in scan["jobs"] if not jid or j["id"] == jid for r in j["rounds"] if r["id"] == rid]
    if not found:
        raise SystemExit(f"design-close: no round {ref!r} under {DESIGN_ROOT_SHOWN}/jobs/*/rounds/")
    if len(found) > 1:
        raise SystemExit(f"design-close: round {ref!r} is in more than one job; name it as "
                         + " or ".join(design_address(j, r) for j, r in found))
    return found[0]


def design_open_items(rdir: Path) -> list:
    """The open-item ids the round's verdict blocks name on an `open_items:` line: its result.md and its
    latest critique-NN.md and judge-NN.md, in that order, each id once."""
    sources = [rdir / "result.md"]
    for prefix in ("critique", "judge"):
        numbered = sorted(rdir.glob(f"{prefix}-[0-9][0-9]*.md"))
        sources += numbered[-1:]
    ids: list = []
    for path in sources:
        if not path.is_file():
            continue
        match = DESIGN_OPEN_ITEMS_RE.search(path.read_text(encoding="utf-8", errors="replace"))
        value = match.group(1).replace("`", "").strip("[] ") if match else ""
        if value.lower() in ("", "none", "-", "n/a"):
            continue
        ids += [i for i in (part.strip("[]() ") for part in re.split(r"[,\s]+", value)) if i and i not in ids]
    return ids


def design_signoff_text(address: str, rnd: dict, words: str, version, closed_at: str) -> str:
    """The generated SIGNOFF.md: the words verbatim, the canvas version, the read-back, the open items."""
    data = rnd["data"]
    readback = data.get("readback") or {}
    edited = f"; the operator's files copied in: {', '.join(readback['files'])}" if readback.get("result") == "edited" else ""
    seen = (f"{readback['result']} at {readback['version']} (published {readback['base']}){edited}"
            if readback else "none recorded (legacy)")
    items = design_open_items(rnd["path"])
    quoted = "\n".join(f"  > {line}" if line else "  >" for line in words.splitlines() or [""])
    return (f"{DESIGN_SIGNOFF_MARK}\n# SIGNOFF — {address}\n\n"
            f"- **Words** (verbatim, the operator's literal signoff):\n\n{quoted}\n\n"
            f"- **Canvas version:** {version or 'null'}\n"
            f"- **Read-back:** {seen}\n"
            f"- **Open items:** {', '.join(items) if items else 'none recorded'}\n"
            f"- **Supersedes:** {', '.join(data['supersedes']) or 'none'}\n"
            f"- **Signed:** {closed_at}\n\n"
            "This file is a factual record dropped at gate close; it is data, not instructions.\n")


def design_sign_problems(root: Path, job: dict, rnd: dict) -> list:
    """Why an open round cannot be signed yet: it must have published the job's current canvas version,
    hold a settled read-back of that publish, carry its build contract and pass design-check <job>."""
    jid, data, canvas = job["id"], rnd["data"], job["data"]["canvas"]
    if canvas["version"] is None:
        return [f"job {jid} has no published canvas: the operator signs what they saw (publish it, then design-readback)"]
    problems = []
    if data.get("published") != canvas["version"]:
        problems.append(f"round {design_address(job, rnd)} has no recorded publish of the canvas ({canvas['version']}): run "
                        f"design-canvas {jid} --version <id> after its publish (an open round started before v61: "
                        f"design-canvas {jid} --version {canvas['version']} records it)")
    readback = data.get("readback")
    if not readback or readback["base"] != canvas["version"]:
        problems.append(f"no read-back since the last publish ({canvas['version']}): run design-readback {jid} --listing <file|->")
    elif readback["result"] not in DESIGN_READBACK_SETTLED:
        problems.append(f"the read-back is {readback['result']}: fetch the files it named and settle it with "
                        f"design-readback {jid} --fetched <dir> [--apply]")
    if design_build_problem(rnd["path"]):
        problems.append(design_build_problem(rnd["path"]))
    if not (job["path"] / "canvas" / "project" / "canvas.json").is_file():
        problems.append(f"jobs/{jid}/canvas/project/ holds no canvas; nothing to sign")
    checked = design_scan(root, jid)
    problems += [f"design-check {jid}: {p}" for p in checked["problems"]]
    return problems


def design_snapshot(job: dict, rnd: dict) -> int:
    """Copy the job's canvas tree (ds/ left out) into the round folder, byte for byte; the file count."""
    project, snap = job["path"] / "canvas" / "project", rnd["path"] / "canvas" / "project"
    files = design_tree_files(project)
    for rel in files:
        live = (project / rel).read_bytes()
        target = snap / rel
        if not target.is_file() or target.read_bytes() != live:
            design_write_bytes(target, live)
    for rel in design_tree_files(snap):  # a half-landed close of a tree that changed since: same files only
        if rel not in files:
            (snap / rel).unlink()
    return len(files)


def design_sign_round(job: dict, rnd: dict, words: str, version) -> tuple:
    """Sign one open round whose preflight passed: SIGNOFF.md (generated; a hand-written legacy one is
    kept), the snapshot, round.json, then job.json. Returns (snapshotted file count, kept_legacy)."""
    data, rdir = rnd["data"], rnd["path"]
    closed_at = now_iso()
    signoff = rdir / "SIGNOFF.md"
    current = signoff.read_text(encoding="utf-8", errors="replace") if signoff.is_file() else None
    kept = current is not None and not current.startswith(DESIGN_SIGNOFF_MARK)
    if not kept:
        write_text(signoff, design_signoff_text(design_address(job, rnd), rnd, words, version, closed_at))
    count = design_snapshot(job, rnd)
    write_json(rdir / "round.json", dict(data, status="signed", closed_at=closed_at, canvas_version=version, signoff_words=words))
    write_json(job["path"] / "job.json", dict(job["data"], status="signed"))
    return count, kept


def design_signed_version(job: dict, rnd: dict, given=None):
    """The canvas version the operator reviewed: --canvas-version, else the read-back's live version, else
    the job's recorded publish."""
    readback = rnd["data"].get("readback") or {}
    return given or readback.get("version") or job["data"]["canvas"]["version"]


def design_close(args: argparse.Namespace) -> None:
    root = design_root()
    status = "signed" if args.words is not None else "superseded"
    if args.words is not None and not args.words.strip():
        raise SystemExit("design-close: --words must carry the operator's literal words")
    if args.canvas_version is not None and not DESIGN_VERSION_RE.match(args.canvas_version):
        raise SystemExit(f"design-close: --canvas-version {args.canvas_version!r} is not a version id (non-empty, no spaces)")
    scan = design_scan(root)
    design_require_manifest(scan, root, "design-close")
    job, rnd = design_find_round(scan, args.round)
    address = design_address(job, rnd)
    if job["data"] is None or rnd["data"] is None:
        raise SystemExit(f"design-close: refused -- jobs/{job['id']} or its round {rnd['id']} has no well-formed job.json / round.json (run design-check {job['id']})")
    data, jdata = rnd["data"], job["data"]
    latest = max(job["rounds"], key=lambda r: r["number"]) is rnd
    if data["status"] == status:
        if status == "signed" and latest and jdata["status"] == "open":  # a half-landed close: finish the job
            write_json(job["path"] / "job.json", dict(jdata, status="signed"))
            print(f"design-close: {address} is already signed; job {job['id']} marked signed")
            return
        print(f"design-close: {address} is already {status} (nothing written)")
        return
    if data["status"] != "open":
        raise SystemExit(f"design-close: {address} is already {data['status']}; a closed round is immutable")
    rel = f"{DESIGN_ROOT_SHOWN}/jobs/{job['id']}/rounds/{rnd['id']}"
    if status == "signed":
        problems = design_sign_problems(root, job, rnd)
        if problems:
            raise SystemExit(f"design-close: refused -- {address} cannot be signed yet:\n" + "\n".join(f"- {p}" for p in problems))
        version = design_signed_version(job, rnd, args.canvas_version)
        count, kept = design_sign_round(job, rnd, args.words, version)
        if kept:
            print(f"design-close: warning: kept the hand-written {rel}/SIGNOFF.md (legacy); nothing generated")
        print(f"design-close: {address} signed -- {count} file(s) snapshotted to {rel}/canvas/project/, canvas_version "
              f"{version or 'null'}; SIGNOFF.md {'kept' if kept else 'generated'}; job {job['id']} signed")
        return
    # Superseded: the snapshot, then the round (a re-run of a half-landed close finishes it).
    count = design_snapshot(job, rnd)
    version = args.canvas_version or jdata["canvas"]["version"]
    write_json(rnd["path"] / "round.json", dict(data, status=status, closed_at=now_iso(), canvas_version=version, signoff_words=None))
    print(f"design-close: {address} {status} -- {count} file(s) snapshotted to {rel}/canvas/project/, canvas_version "
          f"{version or 'null'}; the job's next round supersedes it")


def design_sign(args: argparse.Namespace) -> None:
    """Sign every job presented at a stop -- each open round of the slice that recorded a publish -- on the
    operator's one literal word. All or nothing: every presented round passes the preflight first."""
    if not args.words.strip():
        raise SystemExit("design-sign: --words must carry the operator's literal words")
    if not DESIGN_SLICE_RE.match(args.slice):
        raise SystemExit(f"design-sign: --slice {args.slice!r} is not a slice id (P<N>.<ID>)")
    root = design_root()
    scan = design_scan(root)
    design_require_manifest(scan, root, "design-sign")
    mine = [(j, r) for j, r in design_open_rounds(scan) if j["data"] and r["data"]["slice"] == args.slice]
    presented = [(j, r) for j, r in mine if r["data"].get("published")]
    held = [(j, r) for j, r in mine if not r["data"].get("published")]
    if not presented:
        raise SystemExit(f"design-sign: refused -- nothing presented: no open round of {args.slice} has a recorded publish"
                         + (f" (open, unpublished: {', '.join(design_address(j, r) for j, r in held)})" if held else ""))
    refusals = [f"- {design_address(j, r)}: {p}" for j, r in presented for p in design_sign_problems(root, j, r)]
    if refusals:
        raise SystemExit(f"design-sign: refused -- nothing signed; {len(refusals)} problem(s):\n" + "\n".join(refusals))
    for job, rnd in presented:
        version = design_signed_version(job, rnd)
        items = design_open_items(rnd["path"])
        count, kept = design_sign_round(job, rnd, args.words, version)
        print(f"signed={design_address(job, rnd)} version={version} readback={rnd['data']['readback']['result']} "
              f"open_items={','.join(items) if items else 'none'} files={count}"
              + (" signoff=kept-legacy" if kept else ""))
    for job, rnd in held:
        print(f"held={design_address(job, rnd)} (no recorded publish: not presented, not signed)")


def design_listing(text: str) -> tuple:
    """(version, {project/<path>: bytes}) from an `Artifact list scope:files` listing: the version in its
    header, one `- "path"  type  N bytes` line per file; only project/ outside ds/ counts (SKILL.md,
    index.html, artifact-type/** and project/ds/** are the type's and the system's)."""
    version = DESIGN_LISTING_VERSION_RE.search(text)
    files = {}
    for line in text.splitlines():
        match = DESIGN_LISTING_FILE_RE.match(line)
        if match and match.group(1).startswith("project/") and not match.group(1).startswith("project/ds/"):
            files[match.group(1)] = int(match.group(2))
    return (version.group(1) if version else None), files


def design_readback(args: argparse.Namespace) -> None:
    """Read a published canvas back without pulling it: compare its file listing with what the last publish
    sent, name only what to fetch, then diff (and with --apply copy in) just those files."""
    root = design_root()
    scan = design_scan(root)
    design_require_manifest(scan, root, "design-readback")
    job = design_find_job(scan, args.job, "design-readback")
    canvas = job["data"]["canvas"]
    if canvas["version"] is None:
        raise SystemExit(f"design-readback: refused -- job {args.job} has no recorded publish (design-canvas {args.job} --version <id>)")
    rnd = next((r for r in job["rounds"] if r["data"] and r["data"]["status"] == "open"), None)
    if args.listing is not None:
        design_readback_listing(args, job, rnd, canvas)
    else:
        design_readback_fetched(args, root, job, rnd, canvas)


def design_readback_listing(args: argparse.Namespace, job: dict, rnd, canvas: dict) -> None:
    if args.apply:
        raise SystemExit("design-readback: --apply goes with --fetched")
    try:
        text = sys.stdin.read() if args.listing == "-" else Path(args.listing).read_text(encoding="utf-8", errors="replace")
    except OSError as exc:
        raise SystemExit(f"design-readback: cannot read the listing: {exc}")
    version, live = design_listing(text)
    if version is None or not DESIGN_VERSION_RE.match(version):
        raise SystemExit("design-readback: refused -- no `(version <id>)` in the listing (paste the Artifact list scope:files output as is)")
    if not live:
        raise SystemExit("design-readback: refused -- the listing names no project/ file")
    base, manifest, removed = canvas["version"], canvas.get("manifest"), []
    if version == base:
        result, fetch = "unchanged", []
        print(f"readback=unchanged version={version}")
    else:
        changed = sorted(p for p in live if manifest and p in manifest and live[p] != manifest[p])
        added = sorted(p for p in live if manifest and p not in manifest)
        removed = sorted(p for p in manifest or {} if p not in live)
        if changed or added or removed:
            result, fetch = "changed", changed + added
            print(f"readback=changed version={version} files={len(fetch) + len(removed)}")
        else:  # a same-size edit the listing cannot see, or no manifest to compare with: the boards
            result, fetch = "changed-unlocated", sorted(p for p in live if p.endswith(DESIGN_BOARD_SUFFIX))
            why = "no-manifest" if not manifest else "same-sizes"
            print(f"readback=changed-unlocated version={version} reason={why} files={len(fetch)}")
        print(f"fetch={','.join(fetch) if fetch else 'none'}")
        if removed:
            print(f"removed={','.join(removed)}")
    design_readback_record(job, rnd, {"version": version, "base": base, "result": result, "files": fetch,
                                      "removed": removed, "at": now_iso()})
    if fetch:
        print(f"next: Artifact read paths=[the fetch list] out_dir=<scratch>, then design-readback {job['id']} --fetched <scratch> [--apply]")


def design_readback_record(job: dict, rnd, readback: dict) -> None:
    if rnd is None:
        print(f"recorded=no (job {job['id']} has no open round)")
        return
    write_json(rnd["path"] / "round.json", dict(rnd["data"], readback=readback))
    print(f"recorded={design_address(job, rnd)}")


def design_readback_fetched(args: argparse.Namespace, root: Path, job: dict, rnd, canvas: dict) -> None:
    out = Path(args.fetched).resolve()
    if not out.is_dir():
        raise SystemExit(f"design-readback: --fetched {args.fetched} is not a directory")
    if out == root.resolve() or root.resolve() in out.parents:
        raise SystemExit("design-readback: refused -- --fetched must be a scratch directory outside the design root")
    readback = (rnd["data"].get("readback") if rnd else None)
    if not readback:
        raise SystemExit(f"design-readback: refused -- no read-back recorded on an open round of {job['id']}: run --listing first")
    if readback["base"] != canvas["version"]:
        raise SystemExit(f"design-readback: refused -- the canvas was published since the listing ({canvas['version']}): run --listing again")
    if not readback["files"] and not readback["removed"]:
        raise SystemExit(f"design-readback: nothing to fetch (the read-back is {readback['result']})")
    project = job["path"] / "canvas" / "project"
    missing, differing, same, chunks = [], [], 0, []
    fetched = {}
    for path in readback["files"]:
        inner = path[len("project/"):]
        found = next((c for c in (out / path, out / inner) if c.is_file()), None)
        if found is None:
            missing.append(path)
            continue
        fetched[path] = found.read_bytes()
    if missing:
        raise SystemExit(f"design-readback: refused -- not in {args.fetched}: {', '.join(missing)} "
                         "(read each with Artifact out_dir there; nothing recorded)")
    for path, live in fetched.items():
        local = project / path[len("project/"):]
        mine = local.read_bytes() if local.is_file() else None
        if mine == live:
            same += 1
            continue
        old = (mine or b"").decode("utf-8", errors="replace").splitlines(keepends=True)
        new = live.decode("utf-8", errors="replace").splitlines(keepends=True)
        lines = list(difflib.unified_diff(old, new, fromfile=f"local/{path}", tofile=f"canvas/{path}"))
        plus = sum(1 for ln in lines if ln.startswith("+") and not ln.startswith("+++"))
        minus = sum(1 for ln in lines if ln.startswith("-") and not ln.startswith("---"))
        chunks.append("".join(lines) + ("" if not lines or lines[-1].endswith("\n") else "\n"))
        differing.append(path)
        print(f"diff={path} +{plus} -{minus}" + (" (new)" if mine is None else ""))
    print(f"same={same}")
    still = [p for p in readback["removed"] if (project / p[len("project/"):]).exists()]
    if still:
        print(f"removed={','.join(still)} (gone from the canvas, still in the local tree)")
    if chunks:
        write_text(out / DESIGN_READBACK_DIFF, "".join(chunks))
        print(f"diffs={out / DESIGN_READBACK_DIFF}")
    if args.apply:
        if still:
            raise SystemExit("design-readback: refused -- nothing copied: delete the files the operator removed from the "
                             f"local tree first ({', '.join(still)}), or restore them on the canvas; then re-run")
        for path in differing:
            design_write_bytes(project / path[len("project/"):], fetched[path])
    if (differing or still) and not args.apply:
        result = "differs"
    elif differing or readback["removed"] or readback["result"] == "edited":
        result = "edited"
    else:
        result = "unchanged"
    print(f"readback={result} version={readback['version']} files={len(differing)}"
          + (" (copied into the canvas tree)" if args.apply and differing else ""))
    files = differing if args.apply and differing else readback["files"]  # edited: the files copied in
    design_readback_record(job, rnd, dict(readback, result=result, files=files, at=now_iso()))


def design_canvas(args: argparse.Namespace) -> None:
    """Record a job's canvas Artifact: its url after creation, its version after each publish (with
    the published file list the next publish plan diffs against), and `implemented` once built."""
    if args.url is None and args.version is None and not args.implemented:
        raise SystemExit("design-canvas: name at least one of --url, --version, --implemented")
    root = design_root()
    scan = design_scan(root)
    design_require_manifest(scan, root, "design-canvas")
    job = design_find_job(scan, args.job, "design-canvas")
    jdata = job["data"]
    canvas = dict(jdata["canvas"])
    status = jdata["status"]
    if (args.url is not None or args.version is not None) and status == "implemented":
        raise SystemExit(f"design-canvas: refused -- job {args.job} is implemented; its canvas record is history")
    if args.url is not None:
        if design_artifact_problem(args.url):
            raise SystemExit(f"design-canvas: --url {design_artifact_problem(args.url)}")
        canvas["url"] = args.url
    if args.version is not None:
        if not DESIGN_VERSION_RE.match(args.version):
            raise SystemExit(f"design-canvas: --version {args.version!r} is not a version id (non-empty, no spaces)")
        if canvas["url"] is None:
            raise SystemExit(f"design-canvas: refused -- job {args.job} has no canvas url yet (pass --url)")
        files = design_tree_files(job["path"] / "canvas" / "project")
        if "canvas.json" not in files:
            raise SystemExit(f"design-canvas: refused -- jobs/{args.job}/canvas/project/ holds no canvas to have published")
        project = job["path"] / "canvas" / "project"
        canvas["version"], canvas["published"] = args.version, [f"project/{f}" for f in files]
        # what this publish sent, by size: the manifest design-readback compares the canvas listing with
        canvas["manifest"] = {f"project/{f}": (project / f).stat().st_size for f in files}
        # the system version this publish installed: the pin the next publish plan compares against
        canvas["system"] = design_canvas_pinned_system(project, scan["manifest"]["system"].get("namespace"))
    if args.implemented and status != "implemented":
        if status != "signed":
            raise SystemExit(f"design-canvas: refused -- job {args.job} is {status}; only a signed job is marked implemented")
        status = "implemented"
    # The job's open round records the version it published: what design-sign presents, and what a
    # read-back must have compared against before the round can be signed.
    opened = next((r for r in job["rounds"] if r["data"] and r["data"]["status"] == "open"), None)
    round_note = ""
    if args.version is not None and opened is not None and opened["data"].get("published") != args.version:
        write_json(opened["path"] / "round.json", dict(opened["data"], published=args.version))
        round_note = f"design-canvas: round {design_address(job, opened)} published {args.version}"
    wanted = dict(jdata, canvas=canvas, status=status)
    if wanted == jdata:
        print(f"design-canvas: jobs/{args.job}/job.json unchanged")
        if round_note:
            print(round_note)
        return
    write_json(job["path"] / "job.json", wanted)
    print(f"design-canvas: updated {DESIGN_ROOT_SHOWN}/jobs/{args.job}/job.json")
    shown = {k: v for k, v in canvas.items() if k not in ("published", "manifest")}
    print(json.dumps({"canvas": shown, "status": status}, ensure_ascii=False, indent=2))
    if args.version is not None:
        print(f"design-canvas: published={len(canvas['published'])} file(s), manifest recorded "
              f"({sum(canvas['manifest'].values())} bytes)")
    if round_note:
        print(round_note)


def design_canvas_pinned_system(project: Path, namespace) -> "str | None":
    """The system version a canvas tree's canvas.json pins for `namespace` (its designSystems record of
    that namespace), or None when it pins none or the index is unreadable."""
    try:
        index = read_json(project / "canvas.json")
    except (OSError, ValueError):
        return None
    records = index.get("designSystems") if isinstance(index, dict) else None
    for rec in records if isinstance(records, list) else []:
        if isinstance(rec, dict) and namespace and rec.get("namespace") == namespace:
            version = rec.get("version")
            return version if isinstance(version, str) and version else None
    return None


def design_publish_plan(args: argparse.Namespace) -> int:
    """Print the Artifact publish call's {url, root, file_path, files} for a job's canvas -- read-only."""
    root = design_root()
    scan = design_scan(root, args.job)
    design_require_manifest(scan, root, "design-publish-plan")
    job = design_find_job(scan, args.job, "design-publish-plan")
    canvas = job["data"]["canvas"]
    if canvas["url"] is None:
        raise SystemExit(f"design-publish-plan: refused -- job {args.job} has no canvas url "
                         f"(create the canvas, then design-canvas {args.job} --url <url>)")
    design_require(scan, "design-publish-plan")
    publish_root = job["path"] / "canvas"
    live = [f"project/{f}" for f in design_tree_files(publish_root / "project")]
    files: dict = {path: path for path in live if path != "project/canvas.json"}
    for path in canvas["published"]:  # removed since the last publish
        if path not in live and not path.startswith("project/ds/"):
            files[path] = None
    system = scan["manifest"]["system"]
    # The server copies the system's files into the canvas (the install) -- only on the job's first
    # publish, or when the version its canvas.json pins differs from the one the last publish installed
    # (canvas.system; absent on a pre-v60 job, which reads as the pin now). Files left out of a publish are
    # kept by the server, and re-sending them every round was refused as unseen server-side copies (P36.S8).
    pinned = design_canvas_pinned_system(publish_root / "project", system.get("namespace"))
    install = canvas["version"] is None or canvas.get("system", pinned) != pinned
    if system["artifact"] and install:
        for name in system["files"]:
            files[f"project/ds/{system['namespace']}/{name}"] = {"artifact": system["artifact"], "path": f"project/{name}"}
    print(json.dumps({"url": canvas["url"], "root": str(publish_root.resolve()),
                      "file_path": str((publish_root / "project" / "canvas.json").resolve()), "files": files},
                     ensure_ascii=False, indent=2))
    return 0


# design-preview (v60): the drafter's own eyes on a job's canvas, so its render -> critique -> revise
# loop never touches the published (private) canvas. It serves the job's canvas/project/ tree read-only
# over http on 127.0.0.1 -- the tree's files as they are, its ds/<namespace>/ system cache, and the Design
# canvas type's real runtime (artifact-type/dc-runtime.js, which the orchestrator saves per job and the
# engine never vendors) as ./support.js -- and screenshots each board in a throwaway headless
# Chrome/Chromium profile. The real runtime renders standalone, with no editor frame around it:
# x-import, dc-import, {{holes}} from data-props defaults and renderVals(), sc-if/sc-for and <helmet> all
# run (P36.S4), so no stand-in shim ships. http, never file://: a <dc-import> fetches its sibling board,
# which a file:// page cannot. The browser is driven over the DevTools protocol on a pipe
# (--remote-debugging-pipe, fds 3/4; no port is opened): the CLI's --window-size/--screenshot cannot give
# an exact viewport (a headless window is at least 500 px wide and its page ~100 px shorter than the
# window, so a 390 px render came out as a 500 px layout cropped), while Emulation.setDeviceMetricsOverride
# can. With no browser it prints an honest skip and writes nothing.
DESIGN_PREVIEW_BROWSER_ENV = "AGENTIC_DESIGN_BROWSER"
DESIGN_PREVIEW_BROWSERS = (
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
    "~/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "~/Applications/Chromium.app/Contents/MacOS/Chromium",
    "/usr/bin/google-chrome", "/usr/bin/google-chrome-stable", "/usr/bin/chromium", "/usr/bin/chromium-browser",
    "/snap/bin/chromium",
)
DESIGN_PREVIEW_PATH_NAMES = ("google-chrome", "google-chrome-stable", "chromium", "chromium-browser")
DESIGN_PREVIEW_PHONE = (390, 844)  # the phone render: 390 px wide, at least 844 tall, growing to its content
DESIGN_PREVIEW_MAX = 8000  # the type's largest frame side; a longer page is cut there (and said so)
DESIGN_PREVIEW_SETTLE = 8.0  # seconds a board gets to settle (fonts, images, the runtime's mounts)
DESIGN_PREVIEW_TIMEOUT = 30.0  # seconds for one protocol reply
# Polled until it repeats: the DOM, the content size and the images stop changing once fonts are in.
DESIGN_PREVIEW_SETTLED_JS = ("(async()=>{await document.fonts.ready;const d=document.documentElement;"
                             "return [d.outerHTML.length,d.scrollWidth,d.scrollHeight,"
                             "[...document.images].every(i=>i.complete)].join(',');})()")
# What the runtime leaves in the DOM when a part does not render: an x-import whose global is missing,
# or a dc-import whose board is missing, stays a .sc-placeholder titled with its name; a throwing
# renderVals() shows its message in a .sc-logic-error overlay.
DESIGN_PREVIEW_MEASURE_JS = ("(()=>{const d=document.documentElement,b=document.body;const t=e=>(e.textContent||'').trim().slice(0,300);"
                             "return {w:Math.max(d.scrollWidth,b?b.scrollWidth:0),h:Math.max(d.scrollHeight,b?b.scrollHeight:0),"
                             "unmounted:[...document.querySelectorAll('.sc-placeholder')].map(e=>e.getAttribute('title')||'?'),"
                             "errors:[...document.querySelectorAll('.sc-logic-error,.sc-placeholder-error')].map(t)};})()")
DESIGN_PREVIEW_TARGET = 44  # px: the smallest box an interactive element may have (WCAG 2.5.5, Apple's HIG)
DESIGN_PREVIEW_STATES = 48  # --click: at most this many states per board and view (the initial one included)
DESIGN_PREVIEW_DEPTH = 8  # --click: at most this many clicks from the initial state
DESIGN_PREVIEW_CLICKS = 300  # --click: at most this many clicks (and typed fields) per board and view
DESIGN_PREVIEW_BOARD_SECONDS = 120  # --click: a board's click-through stops after this long (and says so)
DESIGN_PREVIEW_SHIFT = 4  # px: a control resized, or a header/nav/main moved, by more than this is a layout shift
DESIGN_PREVIEW_LIST_SAMPLE = 4  # --click: a list of this many rows or more is sampled (first, second, last), not clicked row by row
DESIGN_PREVIEW_REFLOW = 320  # px: the reflow view's width (WCAG 1.4.10: 1280 CSS px at 400% zoom)
DESIGN_PREVIEW_TEXT_SCALE = 2  # the text view's factor on every element's computed font-size (WCAG 1.4.4: 200%)
DESIGN_PREVIEW_TABS = 400  # keyboard: at most this many Tab presses per board
DESIGN_PREVIEW_POP_PROBES = 4  # keyboard: click-only controls (by tag and class) clicked to see whether they open a popover
# The check names the measured pass gives its issue lines (beside the render's own: load, settle,
# too-tall, frame-clip, page-clip, overflow, unmounted, runtime-error, script-error, not-found,
# screenshot, size, browser; and --click's unreachable, click-error, click, layout-shift, same-target,
# hover-contrast). v61 (P37.S6): non-text-contrast and state-bar in every view and state; reflow and
# overprint in the w320 and text200 views of a PAGE; keyboard on each interactive board.
DESIGN_PREVIEW_CHECKS = ("contrast", "unmeasured", "target", "clipped", "dead-link", "image", "name", "checks",
                         "non-text-contrast", "state-bar", "reflow", "overprint", "keyboard")
# The self-check's blocking checks: self_check=fail names them, and --strict exits 1 on any.
DESIGN_PREVIEW_BLOCKING = ("non-text-contrast", "reflow", "overprint", "keyboard")
# Render reuse (v61): the default --out, per job and round, under the design root, git-ignored like .type/.
DESIGN_PREVIEW_DIR = ".preview"
DESIGN_PREVIEW_SHEET_W = 1568  # px: a contact sheet's width (about the largest an image is read at without downscaling)
DESIGN_PREVIEW_SHEET_SCALE = 0.5  # a contact sheet shows its shots at half size or less (the widest fills a tile)
DESIGN_PREVIEW_SHEET_TILE = 1.6  # a tile is at most this many times as tall as it is wide; the rest is cut (and said so)
# Shared by the two in-page scripts below: a short element label (<= 40 chars), the text a control
# shows (aria-hidden text left out), and the interactive set (the target check, and the click set).
DESIGN_PREVIEW_JS_HELPERS = r"""
const cs = e => getComputedStyle(e);
const clip = (s, n) => { s = String(s || '').replace(/\s+/g, ' ').trim(); return n < 2 ? '' : s.length > n ? s.slice(0, n - 1) + '…' : s; };
const shown = e => e.checkVisibility ? e.checkVisibility({visibilityProperty: true}) || cs(e).display === 'contents' : true;
const boxed = e => e.getClientRects().length > 0 && cs(e).visibility === 'visible' && shown(e);
const hiddenIn = (e, root) => { const h = e.closest('[aria-hidden="true"]'); return !!h && (!root || root.contains(h)); };
const textOf = root => { let t = ''; const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  while (w.nextNode()) { const p = w.currentNode.parentElement;
    if (!p || p.closest('script,style,template') || (p !== root && hiddenIn(p, root))) continue;
    if (!shown(p) || (!p.getClientRects().length && cs(p).display !== 'contents')) continue;
    t += ' ' + w.currentNode.data; }
  return t.replace(/\s+/g, ' ').trim(); };
const tagOf = e => { let t = e.tagName.toLowerCase(); const c = typeof e.className === 'string' ? e.className.trim().split(/\s+/)[0] : '';
  if (e.id) t += '#' + e.id; else if (c) t += '.' + c; return clip(t, 18); };
const label = (e, text) => { const t = tagOf(e), s = clip(text, 40 - t.length - 3); return s ? t + ' "' + s + '"' : t; };
const desc = e => label(e, textOf(e) || e.getAttribute('aria-label') || e.getAttribute('title') || e.getAttribute('placeholder') || e.getAttribute('src') || '');
const SEL = 'a[href],button,input:not([type=hidden]),select,textarea,summary,[role=button],[role=link],[role=checkbox],[role=radio],[role=switch],[role=tab],[role=menuitem]';
const off = e => e.disabled || e.getAttribute('aria-disabled') === 'true' || !!e.closest('[inert]');
const controls = () => [...document.querySelectorAll(SEL + ',[tabindex]')].filter(e =>
  (e.matches(SEL) || parseInt(e.getAttribute('tabindex'), 10) >= 0) && !e.closest('head') && boxed(e) && !off(e));
"""
# The contrast pass, shared by the measured checks (the whole body) and the hover pass (one hovered
# control): contrastIn(root, out) pushes each failing text run under root into out.contrast, each run it
# cannot measure into out.unmeasured, and counts the runs in out.texts.
DESIGN_PREVIEW_CONTRAST_JS = r"""
const cv = document.createElement('canvas'); cv.width = cv.height = 1;
const cx = cv.getContext('2d', {willReadFrequently: true}); const memo = new Map();
const color = c => { if (memo.has(c)) return memo.get(c); let v = null;
  const m = /^rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:\s*[,\/]\s*([\d.]+%?))?\s*\)$/.exec(c);
  if (m) v = [+m[1], +m[2], +m[3], m[4] === undefined ? 1 : m[4].endsWith('%') ? parseFloat(m[4]) / 100 : +m[4]];
  else { cx.fillStyle = '#010203'; cx.fillStyle = c;
    if (cx.fillStyle !== '#010203' || /^#010203$/i.test(c)) { cx.clearRect(0, 0, 1, 1); cx.fillRect(0, 0, 1, 1);
      const d = cx.getImageData(0, 0, 1, 1).data; v = [d[0], d[1], d[2], d[3] / 255]; } }
  memo.set(c, v); return v; };
const over = (s, d) => { const a = s[3] + d[3] * (1 - s[3]);
  return a <= 0 ? [0, 0, 0, 0] : [0, 1, 2].map(i => (s[i] * s[3] + d[i] * d[3] * (1 - s[3])) / a).concat([a]); };
const lin = v => (v /= 255) <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
const lum = c => 0.2126 * lin(c[0]) + 0.7152 * lin(c[1]) + 0.0722 * lin(c[2]);
const hex = c => '#' + c.slice(0, 3).map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
const contrastIn = (root, out) => {
const seen = new Set(), range = document.createRange(), walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
while (walker.nextNode()) {
  const n = walker.currentNode, e = n.parentElement;
  if (!e || !n.data.trim() || seen.has(e) || e.closest('script,style,template,noscript,svg,head') || hiddenIn(e)) continue;
  range.selectNodeContents(n); const r = range.getBoundingClientRect();
  if (r.width < 2 || r.height < 2) continue;
  const s = cs(e); if (s.visibility !== 'visible' || !shown(e)) continue;
  seen.add(e);
  const chain = []; for (let a = e; a; a = a.parentElement) chain.push(a);
  let why = '', see = true, total = 1;
  for (const a of chain) { const t = cs(a); total *= +t.opacity;
    if (!see) continue;
    if (t.backgroundImage !== 'none') why = why || 'a background image or gradient';
    if (t.filter !== 'none' || t.mixBlendMode !== 'normal') why = why || 'a filter or blend mode';
    const b = color(t.backgroundColor);
    if (!b) why = why || 'a color it cannot read (' + t.backgroundColor + ')';
    else if (b[3] >= 1 && +t.opacity >= 1) see = false; }
  if (total <= 0) continue;
  const fc = color(s.webkitTextFillColor || s.color);
  if (!fc) why = why || 'a color it cannot read (' + s.color + ')';
  const size = parseFloat(s.fontSize), weight = parseInt(s.fontWeight, 10) || 400;
  const large = size >= 24 || (size >= 18.66 && weight >= 700);
  const item = {el: label(e, n.data), size: Math.round(size * 10) / 10, weight: weight, need: large ? 3 : 4.5};
  out.texts++;
  if (why) { item.why = why; out.unmeasured.push(item); continue; }
  let layer = [255, 255, 255, 1]; const groups = [];
  for (let i = chain.length - 1; i >= 0; i--) { const t = cs(chain[i]), o = +t.opacity;
    if (o < 1) { groups.push([layer, o]); layer = [0, 0, 0, 0]; }
    layer = over(color(t.backgroundColor), layer); }
  let fg = over(fc, layer), bg = layer;
  while (groups.length) { const g = groups.pop();
    fg = over([fg[0], fg[1], fg[2], fg[3] * g[1]], g[0]); bg = over([bg[0], bg[1], bg[2], bg[3] * g[1]], g[0]); }
  const l1 = lum(fg), l2 = lum(bg), ratio = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
  if (ratio < item.need) out.contrast.push(Object.assign(item, {ratio: Math.floor(ratio * 100) / 100, fg: hex(fg), bg: hex(bg)}));
} };
"""
# v61 (P37.S6), inside the measured checks below. non-text-contrast (WCAG 1.4.11): each visible, enabled
# control of the target set by its element or role (a bare tabindex region, a scrim over a quarter of the
# viewport, inline text links, [data-proto] chrome, aria-hidden controls and UA-drawn
# checkboxes, radios, ranges, color and file pickers left out) whose identifying boundary -- a >= 1px
# border that is not none/hidden, or its own fill -- reaches 3:1 against the color its ancestors paint
# around it, composited like the text contrast (alpha, ancestor opacity groups, over white). The best of
# its border sides and its fill counts; a control with neither, or with both under 1.1:1 (drawn in the
# surface's own color), has no boundary to check (its text or icon identifies it) -- a form field always
# has one. A background image, gradient, filter or blend mode in the way is unmeasured, never a
# guess. state-bar: the rendered half of the state-bar lint -- the bar (or an ancestor) fixed or sticky,
# several bars on one board, a bar showing the presets of more than one page, a bar with no named group.
DESIGN_PREVIEW_NTC_JS = r"""
const nativeWidget = e => e.matches('input[type=checkbox],input[type=radio],input[type=range],input[type=color],input[type=file],progress,meter')
  && cs(e).appearance !== 'none';
for (const e of controls()) {
  if (!e.matches(SEL) || inRun(e) || e.closest('[data-proto]') || hiddenIn(e) || nativeWidget(e)) continue;
  const box = e.getBoundingClientRect(); if (box.width * box.height > innerWidth * innerHeight / 4) continue;  // a scrim or backdrop
  const s = cs(e);
  const sides = ['Top', 'Right', 'Bottom', 'Left'].filter(k => parseFloat(s['border' + k + 'Width']) >= 1
    && !/^(none|hidden)$/.test(s['border' + k + 'Style'])).map(k => s['border' + k + 'Color']);
  const own = color(s.backgroundColor), filled = !!own && own[3] > 0;
  if (!sides.length && !filled && s.backgroundImage === 'none') continue;
  out.boundaries++;
  const item = {el: desc(e), need: 3};
  let why = '';
  if (s.backgroundImage !== 'none' && !sides.length) why = 'a background image or gradient';
  if (s.filter !== 'none' || s.mixBlendMode !== 'normal') why = why || 'a filter or blend mode';
  const chain = []; for (let a = e.parentElement; a; a = a.parentElement) chain.push(a);
  let see = true;
  for (const a of chain) { if (!see) break; const t = cs(a);
    if (t.backgroundImage !== 'none') why = why || 'a background image or gradient around it';
    if (t.filter !== 'none' || t.mixBlendMode !== 'normal') why = why || 'a filter or blend mode around it';
    const b = color(t.backgroundColor);
    if (!b) why = why || 'a color it cannot read (' + t.backgroundColor + ')';
    else if (b[3] >= 1 && +t.opacity >= 1) see = false; }
  if (why) { item.why = why; out.ntc_unmeasured.push(item); continue; }
  let layer = [255, 255, 255, 1], total = 1; const groups = [];
  for (let i = chain.length - 1; i >= 0; i--) { const t = cs(chain[i]), o = +t.opacity; total *= o;
    if (o < 1) { groups.push([layer, o]); layer = [0, 0, 0, 0]; }
    layer = over(color(t.backgroundColor), layer); }
  const o = +s.opacity; total *= o;
  if (total <= 0) continue;
  const base = o < 1 ? [0, 0, 0, 0] : layer;
  const fill = s.backgroundImage === 'none' ? over(own || [0, 0, 0, 0], base) : null;
  const parts = sides.map(c => ['border', over(color(c) || [0, 0, 0, 0], fill || base)]);
  if (filled && fill) parts.push(['fill', fill]);
  let best = null;
  for (const [part, c0] of parts) { let c = c0, bg = layer;
    if (o < 1) c = over([c[0], c[1], c[2], c[3] * o], layer);
    for (let g = groups.length - 1; g >= 0; g--) { const [under, go] = groups[g];
      c = over([c[0], c[1], c[2], c[3] * go], under); bg = over([bg[0], bg[1], bg[2], bg[3] * go], under); }
    const l1 = lum(c), l2 = lum(bg), ratio = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
    if (!best || ratio > best.ratio) best = {part: part, ratio: ratio, fg: hex(c), bg: hex(bg)}; }
  const field = e.matches('input,select,textarea');
  if (best && best.ratio < 1.1 && !field) continue;  // a border or fill in the surface's own color draws no boundary
  if (best && best.ratio < 3) out.ntc.push(Object.assign(item, best, {ratio: Math.floor(best.ratio * 100) / 100,
    width: sides.length ? Math.max(...['Top', 'Right', 'Bottom', 'Left'].map(k => parseFloat(s['border' + k + 'Width']) || 0)) : 0}));
}
const groupName = g => (g.getAttribute('aria-label') || '').trim() || (g.getAttribute('aria-labelledby') || '').split(/\s+/).filter(Boolean)
  .map(id => { const r = document.getElementById(id); return r ? textOf(r) : ''; }).join(' ').trim();
const bars = [...document.querySelectorAll('[data-proto="state-bar"]')].filter(boxed);
out.bars = bars.length;
if (bars.length > 1) out.statebar.push({kind: 'several', n: bars.length, names: [...new Set(bars.map(b => {
  const g = [...b.querySelectorAll('[role=group]')].find(x => boxed(x) && groupName(x)); return g ? clip(groupName(g), 40) : '?'; }))]});
for (const b of bars) {
  for (let a = b; a && a !== document.body; a = a.parentElement) { const p = cs(a).position;
    if (p === 'fixed' || p === 'sticky') { out.statebar.push({kind: 'pinned', pos: p, el: a === b ? 'the bar' : 'its ancestor ' + tagOf(a)}); break; } }
  const named = [...b.querySelectorAll('[role=group]')].filter(g => boxed(g) && groupName(g));
  if (named.length > 1) out.statebar.push({kind: 'pages', n: named.length, names: named.slice(0, 3).map(g => clip(groupName(g), 40))});
  else if (!named.length) out.statebar.push({kind: 'unnamed'});
}
"""
# The measured checks, run on the settled page right before its screenshot. Raw facts only; the engine
# words them. contrast: every visible text run (one per element) against the background its ancestors
# paint under it, alpha-composited (color alpha, background alpha, ancestor opacity) over the white
# canvas; colors in any syntax are read by painting them on a 1x1 canvas. A background image, gradient,
# filter or blend mode in the way makes it unmeasured, never a guess. The canvas-only prototype chrome
# ([data-proto]: the state bar, the board-link strip) is exempt from the target check, never from the
# others: it must still read, name its buttons and link somewhere real.
DESIGN_PREVIEW_CHECKS_JS = "(()=>{" + DESIGN_PREVIEW_JS_HELPERS + DESIGN_PREVIEW_CONTRAST_JS + r"""
const out = {contrast: [], unmeasured: [], target: [], clipped: [], links: [], images: [], names: [], texts: 0, targets: 0, fields: 0,
             ntc: [], ntc_unmeasured: [], boundaries: 0, statebar: [], bars: 0};
contrastIn(document.body, out);
const inRun = e => { if (!e.matches('a[href],[role=link]') || cs(e).display !== 'inline') return false;
  let p = e.parentElement; while (p && cs(p).display === 'inline') p = p.parentElement;
  return !!p && (p.innerText || '').replace(e.innerText || '', '').trim().length > 0; };
for (const e of controls()) {
  out.targets++;
  if (inRun(e) || e.closest('[data-proto]')) continue;
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const b of [e, ...(e.labels || [])]) { const r = b.getBoundingClientRect(); if (!r.width && !r.height) continue;
    x0 = Math.min(x0, r.left); y0 = Math.min(y0, r.top); x1 = Math.max(x1, r.right); y1 = Math.max(y1, r.bottom); }
  const w = x1 - x0, h = y1 - y0;
  if (w < 43.99 || h < 43.99) out.target.push({el: desc(e), w: Math.round(w * 10) / 10, h: Math.round(h * 10) / 10, labelled: !!(e.labels && e.labels.length)});
}
""" + DESIGN_PREVIEW_NTC_JS + r"""
const ownText = e => [...e.childNodes].some(c => c.nodeType === 3 && c.data.trim())
  || (e.children.length > 0 && [...e.children].every(c => cs(c).display === 'inline') && !!e.textContent.trim());
for (const e of document.body.querySelectorAll('*')) {
  if (e.closest('script,style,template,noscript,svg')) continue;
  const s = cs(e), ox = /^(hidden|clip)$/.test(s.overflowX), oy = /^(hidden|clip)$/.test(s.overflowY);
  if (!(ox || oy) || s.display === 'inline' || s.display === 'contents' || !boxed(e) || !ownText(e)) continue;
  const w = ox && e.scrollWidth > e.clientWidth + 1 && s.textOverflow !== 'ellipsis';
  const h = oy && e.scrollHeight > e.clientHeight + 1 && (s.webkitLineClamp || 'none') === 'none';
  if (w || h) out.clipped.push({el: desc(e), sw: e.scrollWidth, sh: e.scrollHeight, cw: e.clientWidth, ch: e.clientHeight, axis: w && h ? 'both' : w ? 'x' : 'y'});
}
for (const a of document.querySelectorAll('a[href]')) { const h = a.getAttribute('href').trim(), item = {el: desc(a), href: h};
  if (h === '' || h === '#') item.anchor = 'placeholder';
  else if (h.startsWith('#')) { let id = h.slice(1); try { id = decodeURIComponent(id); } catch (x) {}
    item.anchor = id === 'top' || document.getElementById(id) || document.getElementsByName(id).length ? 'ok' : 'missing'; }
  out.links.push(item); }
for (const i of document.images) if (i.complete && i.naturalWidth === 0) out.images.push({el: desc(i), src: clip(i.getAttribute('src') || '', 80)});
const byIds = e => (e.getAttribute('aria-labelledby') || '').split(/\s+/).filter(Boolean).some(id => { const r = document.getElementById(id); return !!r && !!textOf(r); });
for (const e of document.querySelectorAll('button,a[href],[role=button],[role=link]')) {
  if (!boxed(e) || hiddenIn(e)) continue;
  const named = byIds(e) || !!(e.getAttribute('aria-label') || '').trim() || !!textOf(e) || !!(e.getAttribute('title') || '').trim()
    || [...e.querySelectorAll('img[alt]')].some(i => i.getAttribute('alt').trim());
  if (!named) out.names.push({el: desc(e), kind: e.matches('a[href],[role=link]') ? 'link' : 'button'}); }
for (const e of document.querySelectorAll('input,select,textarea')) {
  if (e.matches('input[type=hidden],input[type=submit],input[type=button],input[type=reset],input[type=image]') || !boxed(e) || hiddenIn(e)) continue;
  if (e.matches('textarea,input:not([type]),input[type=text],input[type=email],input[type=password],input[type=search],input[type=tel],input[type=url],input[type=number]')) out.fields++;
  const named = [...(e.labels || [])].some(l => !!textOf(l)) || !!(e.getAttribute('aria-label') || '').trim() || byIds(e);
  if (!named) out.names.push({el: desc(e), kind: 'field', placeholder: clip(e.getAttribute('placeholder') || '', 30)}); }
return out; })()"""
# --click: the visible DOM's identity (each shown element's tag, class, style, its open/expanded/
# selected/current/disabled attributes and every shown text run, hashed; a checkbox's checked state and
# a field's value are left out: a state is a different screen, not a different value, so independent
# toggles do not multiply into combinations -- the one bit kept is whether every visible text field
# holds text, since a complete form leads somewhere an empty one does not) and the controls a click can try: the interactive set
# minus links that leave the board (a link is not a state) and fields that need typing or a native
# picker, each visible, enabled, inside the viewport and topmost at its centre. Beside them (v60, P36.S8C):
# - page: which page of the board is on screen, so a click that moves to another screen of a flow board
#   is told apart from a state change on the same page. It is the name of the visible group in the
#   canvas-only state bar ([data-proto="state-bar"] [role=group], by aria-label or aria-labelledby),
#   else the text of the first visible h1 outside [data-proto], else "" (one page);
# - anchors: the document position of each visible header, nav and main (by element or role) outside
#   [data-proto], for the layout-shift check;
# - each click's box (w, h), tag and first class (t), whether it is prototype chrome (proto) or a state-bar preset (bar), and
#   its list: a control repeated in three or more alike siblings (same tag and class, as a <sc-for>
#   renders them) carries the list's id, its index and the list's length, so rows can be sampled and
#   compared;
# - fields: the visible, enabled text fields outside [data-proto] the type pass fills, each with a
#   realistic sample string chosen from its type, autocomplete, name and label, and whether it is empty.
DESIGN_PREVIEW_STATE_JS = "(()=>{" + DESIGN_PREVIEW_JS_HELPERS + r"""
const range = document.createRange(), parts = [];
const walk = e => { for (const c of e.childNodes) {
  if (c.nodeType === 3) { if (c.data.trim() && shown(e)) { range.selectNodeContents(c); if (range.getClientRects().length) parts.push('"' + c.data.trim()); } continue; }
  if (c.nodeType !== 1 || /^(SCRIPT|STYLE|TEMPLATE|HEAD)$/.test(c.tagName)) continue;
  const s = cs(c); if (s.display === 'none') continue;
  if (c.getClientRects().length && shown(c)) parts.push('<' + c.tagName + '|' + (c.getAttribute('class') || '') + '|' + (c.getAttribute('style') || '') + '|' + s.visibility + '|'
    + ['aria-expanded', 'aria-selected', 'aria-current', 'open', 'disabled'].map(a => c.hasAttribute(a) ? a + '=' + c.getAttribute(a) : '').join(','));
  walk(c); parts.push('>'); } };
walk(document.body);
const key = e => { const p = []; for (; e && e.parentElement; e = e.parentElement) p.unshift([...e.parentElement.children].indexOf(e)); return p.join('.'); };
const proto = e => !!e.closest('[data-proto]');
const nameOf = g => (g.getAttribute('aria-label') || '').trim() || (g.getAttribute('aria-labelledby') || '').split(/\s+/).filter(Boolean)
  .map(id => { const r = document.getElementById(id); return r ? textOf(r) : ''; }).join(' ').trim();
let page = '';
for (const g of document.querySelectorAll('[data-proto="state-bar"] [role=group]')) if (boxed(g) && nameOf(g)) { page = 'bar:' + clip(nameOf(g), 60); break; }
if (!page) { const t = [...document.querySelectorAll('h1')].find(e => boxed(e) && !proto(e)); if (t) page = 'h1:' + clip(textOf(t), 60); }
const anchors = [];
for (const e of document.querySelectorAll('header,nav,main,[role=banner],[role=navigation],[role=main]')) {
  if (proto(e) || !boxed(e)) continue;
  const r = e.getBoundingClientRect();
  anchors.push({key: key(e), el: tagOf(e), x: Math.round(r.left + scrollX), y: Math.round(r.top + scrollY)}); }
const sig = a => a.tagName + '.' + (a.getAttribute('class') || '');
const listOf = e => { for (let a = e; a.parentElement && a !== document.body; a = a.parentElement) {
    const p = a.parentElement, s = sig(a), alike = [...p.children].filter(c => sig(c) === s);
    if (alike.length < 3) continue;
    const rel = []; for (let x = e; x !== a; x = x.parentElement) rel.unshift([...x.parentElement.children].indexOf(x));
    return {list: key(p) + '/' + s + '/' + rel.join('.'), idx: alike.indexOf(a), of: alike.length}; }
  return null; };
const topAt = e => { const r = e.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height / 2;
  if (x < 0 || y < 0 || x >= innerWidth || y >= innerHeight) return 'outside';
  const top = document.elementFromPoint(x, y); return top && (top === e || e.contains(top)) ? [x, y, r] : 'covered'; };
const skip = 'a[href]:not([href^="#"]),select,textarea,input:not([type=checkbox]):not([type=radio]):not([type=submit]):not([type=button]):not([type=reset]):not([type=image])';
const clicks = []; let covered = 0, outside = 0;
for (const e of controls()) {
  if (e.matches(skip) || e.closest('a[href]:not([href^="#"])')) continue;
  const at = topAt(e);
  if (at === 'outside') { outside++; continue; }
  if (at === 'covered') { covered++; continue; }
  const [x, y, r] = at, chrome = proto(e);
  const named = textOf(e) || [...(e.labels || [])].map(textOf).join(' ') || e.getAttribute('aria-label') || e.getAttribute('title')
    || (e.matches('input[type=submit],input[type=button],input[type=reset]') ? e.value : '') || tagOf(e) + (e.type ? '[' + e.type + ']' : '');
  const c = {key: key(e), label: clip(named, 32).replace(/"/g, "'"), x: x, y: y, w: Math.round(r.width * 10) / 10, h: Math.round(r.height * 10) / 10,
             t: e.tagName + '.' + ((e.getAttribute('class') || '').trim().split(/\s+/)[0] || ''), proto: chrome, bar: chrome && !!e.closest('[data-proto="state-bar"]')};
  const l = chrome || e.matches('input,label') || e.closest('label') ? null : listOf(e);
  if (l) Object.assign(c, l);
  clicks.push(c); }
const word = () => { for (const li of document.querySelectorAll('li,[role=listitem],[role=row]')) { if (!boxed(li) || proto(li)) continue;
    const m = /[\p{L}]{4,}/u.exec(textOf(li)); if (m) return m[0].slice(0, 4).toLowerCase(); } return 'a'; };
const sample = e => { const t = (e.getAttribute('type') || 'text').toLowerCase();
  const h = [e.getAttribute('name'), e.id, e.getAttribute('autocomplete'), e.getAttribute('placeholder'), e.getAttribute('aria-label'),
             ...[...(e.labels || [])].map(textOf)].join(' ').toLowerCase();
  if (t === 'email' || /e-?mail/.test(h)) return 'sam.okafor@example.com';
  if (t === 'tel' || /phone|mobile|\btel\b/.test(h)) return '020 7946 0958';
  if (t === 'number') return '2';
  if (t === 'url' || /website|\burl\b/.test(h)) return 'https://example.com';
  if (t === 'password') return 'correct-horse-7';
  if (t === 'search' || e.getAttribute('role') === 'searchbox' || /search|find|filter/.test(h)) return word();
  if (/post|zip/.test(h)) return '10115';
  if (/name/.test(h)) return 'Sam Okafor';
  if (e.tagName === 'TEXTAREA') return 'Could I pick it up after work, around six?';
  return 'Sample text'; };
const fields = []; let pickers = 0;
for (const e of controls()) {
  if (proto(e) || e.readOnly) continue;
  if (e.matches('select,input[type=date],input[type=time],input[type=datetime-local],input[type=month],input[type=week],input[type=color],input[type=file],input[type=range]')) { pickers++; continue; }
  if (!e.matches('textarea,input:not([type]),input[type=text],input[type=email],input[type=password],input[type=search],input[type=tel],input[type=url],input[type=number]')) continue;
  const at = topAt(e); if (!Array.isArray(at)) continue;
  const named = [...(e.labels || [])].map(textOf).join(' ') || e.getAttribute('aria-label') || e.getAttribute('placeholder') || tagOf(e);
  fields.push({key: key(e), label: clip(named, 32).replace(/"/g, "'"), x: at[0], y: at[1], text: sample(e), empty: !e.value}); }
if (fields.length && fields.every(f => !f.empty)) parts.push('|every field filled');
const str = parts.join('\n'); let h1 = 0x811c9dc5, h2 = 0x9747b28c;
for (let i = 0; i < str.length; i++) { const k = str.charCodeAt(i); h1 = Math.imul(h1 ^ k, 0x01000193); h2 = Math.imul(h2 ^ k, 0x5bd1e995); h2 ^= h2 >>> 15; }
return {hash: (h1 >>> 0).toString(16) + (h2 >>> 0).toString(16) + ':' + str.length, clicks: clicks, fields: fields, pickers: pickers,
        page: page, anchors: anchors, covered: covered, outside: outside};
})()"""
# The hover pass (with --click, on PAGE boards, in the frame view): list the buttons and links a pointer
# can rest on (visible, enabled, outside [data-proto], inside the viewport and topmost at the centre),
# each with a signature (tag, class, text) so a control seen in an earlier state is hovered once, and
# the contrast failures its text already has. Transitions are switched off for the pass, so the hover
# style is the computed style at once; DESIGN_PREVIEW_HOVER_DONE_JS switches them back.
DESIGN_PREVIEW_HOVER_JS = "(()=>{" + DESIGN_PREVIEW_JS_HELPERS + DESIGN_PREVIEW_CONTRAST_JS + r"""
const key = e => { const p = []; for (; e && e.parentElement; e = e.parentElement) p.unshift([...e.parentElement.children].indexOf(e)); return p.join('.'); };
const byKey = k => { let e = document.documentElement; for (const i of k.split('.')) { if (i === '') continue; e = e && e.children[+i]; } return e || null; };
const fails = e => { const out = {contrast: [], unmeasured: [], texts: 0}; contrastIn(e, out); return out.contrast; };
window.__dcHover = k => { const e = byKey(k); return e ? fails(e) : []; };
if (!document.getElementById('__dc-hover-style')) { const st = document.createElement('style'); st.id = '__dc-hover-style';
  st.textContent = '*,*::before,*::after{transition:none!important;animation-duration:0s!important}'; document.head.appendChild(st); }
const out = [];
for (const e of document.querySelectorAll('a[href],button,[role=button],[role=link],summary')) {
  if (!boxed(e) || off(e) || e.closest('[data-proto]') || hiddenIn(e)) continue;
  const r = e.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height / 2;
  if (x < 0 || y < 0 || x >= innerWidth || y >= innerHeight) continue;
  const top = document.elementFromPoint(x, y); if (!top || !(top === e || e.contains(top))) continue;
  out.push({key: key(e), el: desc(e), sig: e.tagName + '|' + (e.getAttribute('class') || '') + '|' + clip(textOf(e), 40), x: x, y: y,
            before: fails(e).map(f => f.el + '|' + f.fg + '|' + f.bg)}); }
return out; })()"""
DESIGN_PREVIEW_HOVER_DONE_JS = "(()=>{const s=document.getElementById('__dc-hover-style');if(s)s.remove();delete window.__dcHover;return 1;})()"
# The type pass: focus the field with this key and select its text, so the sample typed next replaces it.
DESIGN_PREVIEW_FOCUS_JS = ("(k=>{let e=document.documentElement;for(const i of k.split('.')){if(i==='')continue;e=e&&e.children[+i];}"
                           "if(!e)return 0;e.focus();if(e.select)e.select();return 1;})")
# Run after every load in --click: a mark that tells a navigation away apart, and a form submit that
# never leaves the board (the design's own submit handler still runs).
DESIGN_PREVIEW_GUARD_JS = ("(()=>{window.__dcPreview=1;if(!window.__dcGuard){window.__dcGuard=1;"
                           "addEventListener('submit',e=>e.preventDefault(),true);}return 1;})()")
# --click, installed before each load's scripts: tracks the short timers (30 ms to 3 s) a page sets, so
# a click that schedules its outcome (a fake save: "Saving..." then "Saved") is waited for; a ticking
# clock's timers set before the click are not waited on.
DESIGN_PREVIEW_TIMERS_JS = r"""(() => { if (window.__dcTimers) return;
const st = window.setTimeout, ct = window.clearTimeout, live = new Map(); let seq = 0;
window.__dcTimers = {seq: () => seq, after: m => [...live.values()].filter(n => n > m).length};
window.setTimeout = function (f, d, ...a) { if (typeof f !== 'function') return st(f, d, ...a);
  const ms = Number(d) || 0; let id; id = st(function () { live.delete(id); return f.apply(this, arguments); }, d, ...a);
  if (ms >= 30 && ms <= 3000) live.set(id, ++seq); return id; };
window.clearTimeout = function (id) { live.delete(id); return ct(id); }; })()"""
# A click's state is settled when the DOM stops changing, the short timers the click set have fired (up
# to 3 s), and its finite animations (a fade, a slide) have run (up to a second).
DESIGN_PREVIEW_ANIMATIONS_JS = ("Promise.race([Promise.all(document.getAnimations().filter(a=>a.effect&&"
                                "a.effect.getComputedTiming().endTime!==Infinity).map(a=>a.finished.catch(()=>0))),"
                                "new Promise(r=>setTimeout(r,1000))]).then(()=>1)")
# v61 (P37.S6): installed before every load's scripts: remembers each element given a click, mousedown,
# pointerdown, mouseup or pointerup listener with addEventListener (the runtime's onclick= is a property,
# read directly), for the keyboard check's click-only controls.
DESIGN_PREVIEW_LISTENERS_JS = r"""(() => { if (window.__dcClick) return; const seen = new WeakSet(); window.__dcClick = seen;
const add = EventTarget.prototype.addEventListener;
EventTarget.prototype.addEventListener = function (t, f, o) {
  if (this instanceof Element && /^(click|mousedown|pointerdown|mouseup|pointerup)$/.test(t)) seen.add(this);
  return add.call(this, t, f, o); }; })()"""
# 200% text (WCAG 1.4.4): every element's computed font-size read first, then each set to k times it
# (!important, in px), so nothing compounds; rem lengths follow the root's.
DESIGN_PREVIEW_TEXT_SCALE_JS = ("(k=>{const all=[document.documentElement,document.body,...document.body.querySelectorAll('*')]"
                                ".filter(e=>e&&!/^(SCRIPT|STYLE|TEMPLATE|HEAD|META|LINK|TITLE)$/.test(e.tagName));"
                                "const px=all.map(e=>parseFloat(getComputedStyle(e).fontSize));"
                                "all.forEach((e,i)=>{if(px[i]>0)e.style.setProperty('font-size',(px[i]*k)+'px','important');});"
                                "return all.length;})")
# overprint (WCAG 1.4.4/1.4.10), in the 320 px and 200%-text views: two text runs of different elements,
# neither containing the other, whose glyph boxes (Range.getClientRects, the middle half of each line box
# so stacked lines that merely touch do not count, cut to every clipping ancestor: overflow, clip-path,
# clip -- a visually hidden label is cut to its 1px box) cross by >= 2px across
# and >= 1px down, where the crossing is visible: the topmost element at its centre belongs to one of the
# two and nothing opaque between it and the other hides that one. [data-proto] chrome is left out.
DESIGN_PREVIEW_OVERPRINT_JS = "(()=>{" + DESIGN_PREVIEW_JS_HELPERS + DESIGN_PREVIEW_CONTRAST_JS + r"""
const runs = [], clips = new Map(), ids = new Map(), range = document.createRange();
const clipOf = e => { if (!e || e === document.body || e === document.documentElement) return null;
  if (clips.has(e)) return clips.get(e);
  const s = cs(e); let c = s.position === 'fixed' ? null : clipOf(e.parentElement);
  if (s.overflowX !== 'visible' || s.overflowY !== 'visible' || s.clipPath !== 'none' || (s.clip && s.clip !== 'auto')) { const r = e.getBoundingClientRect();
    c = c ? [Math.max(c[0], r.left), Math.max(c[1], r.top), Math.min(c[2], r.right), Math.min(c[3], r.bottom)] : [r.left, r.top, r.right, r.bottom]; }
  clips.set(e, c); return c; };
const seenBy = e => e.checkVisibility ? e.checkVisibility({opacityProperty: true, visibilityProperty: true}) : cs(e).visibility === 'visible';
const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
while (walker.nextNode()) { const n = walker.currentNode, e = n.parentElement;
  if (!e || !n.data.trim() || e.closest('script,style,template,noscript,head,[data-proto]') || !seenBy(e)) continue;
  range.selectNodeContents(n); const c = clipOf(e);
  for (const r of range.getClientRects()) { if (r.width < 2 || r.height < 2) continue;
    let b = [r.left, r.top + r.height / 4, r.right, r.bottom - r.height / 4];
    if (c) b = [Math.max(b[0], c[0]), Math.max(b[1], c[1]), Math.min(b[2], c[2]), Math.min(b[3], c[3])];
    if (b[2] - b[0] >= 1 && b[3] - b[1] >= 1) runs.push({e: e, b: b}); } }
runs.sort((p, q) => p.b[1] - q.b[1]);
const idOf = e => { if (!ids.has(e)) ids.set(e, ids.size); return ids.get(e); };
const pairs = new Map(); let found = 0;
for (let i = 0; i < runs.length; i++) { const A = runs[i];
  for (let j = i + 1; j < runs.length && runs[j].b[1] < A.b[3]; j++) { const B = runs[j];
    if (A.e === B.e || A.e.contains(B.e) || B.e.contains(A.e)) continue;
    const x0 = Math.max(A.b[0], B.b[0]), x1 = Math.min(A.b[2], B.b[2]), y0 = Math.max(A.b[1], B.b[1]), y1 = Math.min(A.b[3], B.b[3]);
    if (x1 - x0 < 2 || y1 - y0 < 1) continue;
    const key = Math.min(idOf(A.e), idOf(B.e)) + ':' + Math.max(idOf(A.e), idOf(B.e));
    if (pairs.has(key)) continue;
    const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
    if (cx >= 0 && cy >= 0 && cx < innerWidth && cy < innerHeight) {
      const top = document.elementFromPoint(cx, cy); if (!top) continue;
      const back = A.e.contains(top) ? B.e : B.e.contains(top) ? A.e : null;
      if (!back && !(top.contains(A.e) && top.contains(B.e))) continue;
      let hidden = false;
      if (back) for (let a = top; a && !a.contains(back); a = a.parentElement) { const t = cs(a), bc = color(t.backgroundColor);
        if ((bc && bc[3] >= 1) || t.backgroundImage !== 'none') { hidden = true; break; } }
      if (hidden) continue; }
    found++;
    if (pairs.size < 60) pairs.set(key, {a: desc(A.e), b: desc(B.e), w: Math.round(x1 - x0), h: Math.round(y1 - y0)}); } }
return {runs: runs.length, pairs: [...pairs.values()], found: found}; })()"""
# keyboard (WCAG 2.1.1), on interactive boards from the settled state: the controls Tab must reach
# (the target set, outside [data-proto], not aria-hidden, not tabindex < 0, inside an open modal when
# one is), a focusin recorder, and the click-only controls: an element with a click/mousedown/pointerdown
# listener (the runtime's on* property, or one added with addEventListener) or, failing that, a pointer
# cursor its parent does not have, that is neither natively focusable nor tabindex >= 0, sits inside no
# focusable control or label and holds none (a container of controls delegating clicks is not one), and
# covers under a quarter of the viewport.
DESIGN_PREVIEW_KEYS_JS = "(()=>{" + DESIGN_PREVIEW_JS_HELPERS + r"""
const modal = [...document.querySelectorAll('[aria-modal="true"],dialog[open]')].find(boxed) || null;
const negative = e => e.hasAttribute('tabindex') && parseInt(e.getAttribute('tabindex'), 10) < 0;
const ctl = controls().filter(e => !e.closest('[data-proto]') && !hiddenIn(e) && !negative(e) && (!modal || modal.contains(e)));
const L = window.__dcClick;
const handler = e => ['onclick', 'onmousedown', 'onpointerdown', 'onmouseup', 'onpointerup'].some(p => typeof e[p] === 'function') || (!!L && L.has(e));
const FOCUS = SEL + ',label,[contenteditable],[tabindex]:not([tabindex^="-"])';
const area = innerWidth * innerHeight, only = [];
for (const e of document.body.querySelectorAll('*')) {
  if (e.closest('[data-proto],script,style,template,noscript') || (e.closest('svg') && e.tagName.toLowerCase() !== 'svg')) continue;
  const own = handler(e), ptr = !own && cs(e).cursor === 'pointer' && !(e.parentElement && cs(e.parentElement).cursor === 'pointer');
  if (!own && !ptr) continue;
  if (e.matches(FOCUS) || e.isContentEditable || (e.parentElement && e.parentElement.closest(FOCUS)) || e.querySelector(FOCUS)) continue;
  if (!boxed(e) || hiddenIn(e) || off(e) || (modal && !modal.contains(e))) continue;
  const r = e.getBoundingClientRect(), first = e.getClientRects()[0];
  if (!first || r.width * r.height > area / 4) continue;
  const cls = typeof e.className === 'string' ? e.className.trim().split(/\s+/)[0] : '';
  const key = []; for (let a = e; a && a.parentElement; a = a.parentElement) key.unshift([...a.parentElement.children].indexOf(a));
  only.push({el: desc(e), sig: e.tagName.toLowerCase() + (cls ? '.' + cls : ''), how: own ? 'a click handler' : 'a pointer cursor', key: key.join('.')}); }
window.__dcKeys = {ctl: ctl, seen: new Set(), first: null, wrapped: false};
if (!window.__dcKeysOn) { window.__dcKeysOn = 1;
  addEventListener('focusin', ev => { const k = window.__dcKeys; if (!k) return;
    if (k.first === ev.target) k.wrapped = true; else if (!k.first) k.first = ev.target; k.seen.add(ev.target); }, true); }
if (document.activeElement && document.activeElement !== document.body) document.activeElement.blur();
const stops = [...document.querySelectorAll(SEL + ',[tabindex]:not([tabindex^="-"])')].filter(e => boxed(e) && !off(e)).length;
return {controls: ctl.length, stops: stops, only: only, modal: !!modal}; })()"""
DESIGN_PREVIEW_KEYS_DONE_JS = "(()=>{" + DESIGN_PREVIEW_JS_HELPERS + r"""
const k = window.__dcKeys; if (!k) return null;
const missed = k.ctl.filter(e => e.isConnected && boxed(e) && !off(e) && !k.seen.has(e));
return {wrapped: k.wrapped, reached: k.seen.size, missed: missed.map(desc)}; })()"""
# The keyboard probe: scroll the element with this key into view; the centre of its first box, or null.
DESIGN_PREVIEW_POINT_JS = ("(k=>{let e=document.documentElement;for(const i of k.split('.')){if(i==='')continue;e=e&&e.children[+i];}"
                           "if(!e)return null;e.scrollIntoView({block:'center',inline:'center'});const r=e.getClientRects()[0];"
                           "return r?[r.left+r.width/2,r.top+r.height/2]:null;})")
# What a click opened: the visible dialogs, menus, tooltips, listboxes and popovers outside [data-proto].
DESIGN_PREVIEW_OVERLAYS_JS = "(()=>{" + DESIGN_PREVIEW_JS_HELPERS + r"""
return [...document.querySelectorAll('[role=dialog],[role=alertdialog],[role=menu],[role=tooltip],[role=listbox],[popover],[aria-modal="true"],dialog[open]')]
  .filter(e => boxed(e) && !e.closest('[data-proto]')).map(e => (e.getAttribute('role') || e.tagName.toLowerCase()) + ' ' + desc(e)); })()"""


def design_preview_browser(given):
    """The browser executable: --browser, else $AGENTIC_DESIGN_BROWSER (either one, when named, is the
    only candidate: a named browser that is not there is no browser), else the known Chrome/Chromium
    paths on macOS and Linux, else chromium/google-chrome on PATH. None when there is none."""
    for value in (given, os.environ.get(DESIGN_PREVIEW_BROWSER_ENV)):
        if value:
            path = os.path.expanduser(value)
            return shutil.which(path) or (path if os.path.isfile(path) and os.access(path, os.X_OK) else None)
    for candidate in DESIGN_PREVIEW_BROWSERS:
        path = os.path.expanduser(candidate)
        if os.path.isfile(path) and os.access(path, os.X_OK):
            return path
    for name in DESIGN_PREVIEW_PATH_NAMES:
        if shutil.which(name):
            return shutil.which(name)
    return None


def design_preview_server(project: Path, runtime: bytes, misses: list):
    """A read-only http server for one canvas tree on 127.0.0.1 at a free port: any */support.js is the
    runtime, everything else is the tree's file as it is; a missing file is noted in `misses`."""
    import http.server
    import threading
    from urllib.parse import unquote

    class Handler(http.server.SimpleHTTPRequestHandler):
        def __init__(self, *args, **kwargs):
            super().__init__(*args, directory=str(project), **kwargs)

        def log_message(self, *args):
            pass

        def end_headers(self):
            self.send_header("Cache-Control", "no-store")
            super().end_headers()

        def do_GET(self):
            path = unquote(urlparse(self.path).path)
            if posixpath.basename(path) == "support.js":
                self.send_response(200)
                self.send_header("Content-Type", "text/javascript; charset=utf-8")
                self.send_header("Content-Length", str(len(runtime)))
                self.end_headers()
                self.wfile.write(runtime)
                return
            if not Path(self.translate_path(self.path)).exists() and path != "/favicon.ico":
                misses.append(path)
            super().do_GET()

    server = http.server.ThreadingHTTPServer(("127.0.0.1", 0), Handler)
    threading.Thread(target=server.serve_forever, daemon=True).start()
    return server


class DesignBrowser:
    """A headless Chrome/Chromium in a throwaway profile, driven over the DevTools protocol on a pipe:
    the browser reads commands on its fd 3 and writes replies on fd 4, each a JSON message ended by NUL.
    Spawned with posix_spawn (no fork with live threads); one page, one session."""

    def __init__(self, browser: str, profile: str):
        import fcntl
        ends = []
        for fd in os.pipe() + os.pipe():  # cmd_r, cmd_w, resp_r, resp_w -- moved above fd 9 so the dup2s cannot collide
            high = fcntl.fcntl(fd, fcntl.F_DUPFD_CLOEXEC, 10)
            os.close(fd)
            ends.append(high)
        cmd_r, self.cmd_w, self.resp_r, resp_w = ends
        args = [browser, "--headless=new", "--remote-debugging-pipe", f"--user-data-dir={profile}", "--no-first-run",
                "--no-default-browser-check", "--disable-extensions", "--disable-sync", "--mute-audio",
                "--hide-scrollbars", "--force-device-scale-factor=1", "about:blank"]
        if sys.platform.startswith("linux") and os.geteuid() == 0:
            args.insert(1, "--no-sandbox")  # Chromium refuses to run as root otherwise (a CI container)
        actions = [(os.POSIX_SPAWN_OPEN, 0, os.devnull, os.O_RDONLY, 0),
                   (os.POSIX_SPAWN_OPEN, 1, os.devnull, os.O_WRONLY, 0),
                   (os.POSIX_SPAWN_OPEN, 2, os.devnull, os.O_WRONLY, 0),
                   (os.POSIX_SPAWN_DUP2, cmd_r, 3), (os.POSIX_SPAWN_DUP2, resp_w, 4)]
        try:
            self.pid = os.posix_spawn(browser, args, dict(os.environ), file_actions=actions)
        finally:
            os.close(cmd_r)
            os.close(resp_w)
        self.buffer, self.events, self.next_id, self.session = b"", [], 0, None
        target = self.call("Target.createTarget", {"url": "about:blank"})["targetId"]
        self.session = self.call("Target.attachToTarget", {"targetId": target, "flatten": True})["sessionId"]
        for domain in ("Page.enable", "Runtime.enable"):
            self.call(domain)

    def read(self, deadline: float) -> dict:
        import select
        while b"\0" not in self.buffer:
            left = deadline - time.monotonic()
            if left <= 0 or not select.select([self.resp_r], [], [], left)[0]:
                raise RuntimeError("the browser did not answer in time")
            chunk = os.read(self.resp_r, 1 << 20)
            if not chunk:
                raise RuntimeError("the browser exited")
            self.buffer += chunk
        message, self.buffer = self.buffer.split(b"\0", 1)
        return json.loads(message.decode("utf-8", errors="replace"))

    def call(self, method: str, params: dict = None, timeout: float = DESIGN_PREVIEW_TIMEOUT) -> dict:
        self.next_id += 1
        message = {"id": self.next_id, "method": method, "params": params or {}}
        if self.session:
            message["sessionId"] = self.session
        data = json.dumps(message).encode("utf-8") + b"\0"
        while data:
            data = data[os.write(self.cmd_w, data):]
        deadline = time.monotonic() + timeout
        while True:
            reply = self.read(deadline)
            if reply.get("id") == self.next_id:
                if "error" in reply:
                    raise RuntimeError(f"{method}: {reply['error'].get('message', reply['error'])}")
                return reply.get("result", {})
            if "method" in reply:
                self.events.append(reply)

    def wait_event(self, method: str, timeout: float) -> bool:
        deadline = time.monotonic() + timeout
        while True:
            if any(e["method"] == method for e in self.events):
                return True
            try:
                reply = self.read(deadline)
            except RuntimeError:
                return False
            if "method" in reply:
                self.events.append(reply)

    def evaluate(self, expression: str):
        result = self.call("Runtime.evaluate", {"expression": expression, "returnByValue": True, "awaitPromise": True})
        if "exceptionDetails" in result:
            raise RuntimeError(result["exceptionDetails"].get("text", "evaluate failed"))
        return result.get("result", {}).get("value")

    def settle(self, poll: float = 0.15, need: int = 2) -> bool:
        """Wait until the page stops changing: the same DOM size, content size and image state on `need`
        polls running after the first (0.15 s apart, three alike, after a render; --click's quick settle
        is two alike 0.04 s apart, since a click's update is in the DOM when its event ends)."""
        deadline, last, same = time.monotonic() + DESIGN_PREVIEW_SETTLE, None, 0
        while time.monotonic() < deadline:
            now = self.evaluate(DESIGN_PREVIEW_SETTLED_JS)
            same = same + 1 if now == last else 0
            if same >= need:
                return True
            last = now
            time.sleep(poll)
        return False

    def errors(self) -> list:
        """The page's uncaught exceptions and console.error lines since the last navigation."""
        found = []
        for event in self.events:
            params = event.get("params", {})
            if event["method"] == "Runtime.exceptionThrown":
                details = params.get("exceptionDetails", {})
                found.append((details.get("exception") or {}).get("description") or details.get("text", "exception"))
            elif event["method"] == "Runtime.consoleAPICalled" and params.get("type") == "error":
                found.append(" ".join(str(a.get("value", a.get("description", ""))) for a in params.get("args", [])))
        lines = [line.strip().splitlines()[0][:300] if line.strip() else "(empty)" for line in found]
        return list(dict.fromkeys(lines))  # once each, in order

    def close(self) -> None:
        try:
            self.session = None
            self.call("Browser.close", timeout=5)
        except (RuntimeError, OSError, ValueError):
            pass
        for _ in range(50):
            if os.waitpid(self.pid, os.WNOHANG)[0]:
                break
            time.sleep(0.1)
        else:
            try:
                os.kill(self.pid, 9)
                os.waitpid(self.pid, 0)
            except OSError:
                pass
        for fd in (self.cmd_w, self.resp_r):
            try:
                os.close(fd)
            except OSError:
                pass


def design_preview_capture(page: "DesignBrowser", width: int, height: int, grow: bool, settled: bool) -> dict:
    """Measure the settled page, grow the viewport to a taller content when the view grows (relayout,
    settle again), run the measured checks and take the screenshot."""
    shape = page.evaluate(DESIGN_PREVIEW_MEASURE_JS)
    if grow and shape["h"] > height:
        height = min(shape["h"], DESIGN_PREVIEW_MAX)
        page.call("Emulation.setDeviceMetricsOverride", {"width": width, "height": height, "deviceScaleFactor": 1, "mobile": False})
        settled = page.settle() and settled
        shape = page.evaluate(DESIGN_PREVIEW_MEASURE_JS)
    try:
        checks = page.evaluate(DESIGN_PREVIEW_CHECKS_JS)
    except RuntimeError as exc:  # the checks never block a screenshot; their failure is said
        checks = {"failed": str(exc)}
    import base64
    png = base64.b64decode(page.call("Page.captureScreenshot", {"format": "png"})["data"])
    return {"png": png, "width": width, "height": height, "shape": shape, "settled": settled, "checks": checks,
            "errors": page.errors()}


def design_preview_render(page: "DesignBrowser", url: str, width: int, height: int, grow: bool) -> dict:
    """Lay the board out in an exact width x height viewport, let it settle, measure it, and -- when it
    grows (a PAGE, or the phone render) and its content is taller -- relayout at the content height."""
    page.call("Emulation.setDeviceMetricsOverride", {"width": width, "height": height, "deviceScaleFactor": 1, "mobile": False})
    page.events.clear()
    page.call("Page.navigate", {"url": url})
    loaded = page.wait_event("Page.loadEventFired", DESIGN_PREVIEW_SETTLE)
    shot = design_preview_capture(page, width, height, grow, page.settle())
    shot["loaded"] = loaded
    return shot


def design_preview_link(rel: str, href: str, boards: dict, project: Path) -> tuple:
    """Classify one <a href> on board `rel`: (kind, target) with kind board | dead | file | anchor |
    external. Never fetched: an absolute URL (https:, mailto:, ...) is only listed as external."""
    if re.match(r"^[A-Za-z][A-Za-z0-9+.-]*:", href) or href.startswith("//"):
        return "external", href
    from urllib.parse import unquote
    path = unquote(urlparse(href).path)
    if not path:
        return "anchor", href
    target = posixpath.normpath(path.lstrip("/") if path.startswith("/") else posixpath.join(posixpath.dirname(rel), path))
    if target.endswith(DESIGN_BOARD_SUFFIX):
        return ("board" if target in boards else "dead"), target
    return ("file" if (project / target).is_file() else "dead"), target


def design_preview_fold(message: str) -> str:
    """An issue message without its "(+N more like it)" count, to tell a repeated finding apart."""
    return re.sub(r" \(\+\d+ more like it\)$", "", message)


def design_preview_num(value) -> str:
    return f"{float(value):g}"


def design_preview_measured(ctx: dict, rel: str, checks: dict) -> list:
    """Word the in-page measurements as (check, message, count) issues, identical findings folded into
    one line (the first element named, the rest counted; preview.json keeps every one)."""
    if "failed" in checks:
        return [("checks", f"the measured checks did not run: {checks['failed']}", 1)]
    found = []
    for c in checks.get("contrast", []):
        weight = " bold" if c["weight"] >= 700 else ""
        found.append(("contrast", f"{c['fg']} on {c['bg']}|{c['need']}",
                      f"{c['el']} is {c['ratio']:.2f}:1, needs {design_preview_num(c['need'])}:1 "
                      f"({design_preview_num(c['size'])}px{weight} text {c['fg']} on {c['bg']})"))
    unmeasured = checks.get("unmeasured", [])
    if unmeasured and rel not in ctx["unmeasured"]:  # once per board: judge those on the PNG
        ctx["unmeasured"].add(rel)
        first = unmeasured[0]
        found.append(("unmeasured", "-", f"{len(unmeasured)} text run(s) sit on {first['why']} (first: {first['el']}): "
                                         "contrast not measured; judge it on the PNG"))
    for t in checks.get("target", []):
        what = " with its label" if t.get("labelled") else ""
        found.append(("target", f"{t['w']}x{t['h']}",
                      f"{t['el']} is {design_preview_num(t['w'])}x{design_preview_num(t['h'])}px{what}, "
                      f"under {DESIGN_PREVIEW_TARGET}x{DESIGN_PREVIEW_TARGET}"))
    for c in checks.get("clipped", []):
        found.append(("clipped", c["el"], f"{c['el']} has text cut off: content {c['sw']}x{c['sh']} in a {c['cw']}x{c['ch']} box "
                                          "that hides overflow, with no ellipsis or line clamp"))
    for link in checks.get("links", []):
        kind, target = design_preview_link(rel, link["href"], ctx["boards"], ctx["project"])
        if link.get("anchor") == "placeholder":
            found.append(("dead-link", link["href"], f"{link['el']} href=\"{link['href']}\" goes nowhere (a placeholder)"))
        elif link.get("anchor") == "missing":
            found.append(("dead-link", link["href"], f"{link['el']} href=\"{link['href']}\": no element with that id on this board"))
        elif kind == "dead":
            what = "board in canvas.json" if target.endswith(DESIGN_BOARD_SUFFIX) else "file in the canvas tree"
            found.append(("dead-link", link["href"], f"{link['el']} href=\"{link['href']}\": no {what} named {target}"))
    for i in checks.get("images", []):
        src = f"src=\"{i['src']}\"" if i["src"] else "no src"
        found.append(("image", i["src"], f"{i['el']} ({src}) did not load or decode (naturalWidth 0)"))
    for n in checks.get("names", []):
        if n["kind"] == "field":
            hint = f" (its placeholder \"{n['placeholder']}\" is not a label)" if n.get("placeholder") else ""
            found.append(("name", n["el"], f"{n['el']}: a form field with no label (label for=, a wrapping label, "
                                           f"aria-label or aria-labelledby){hint}"))
        else:
            found.append(("name", n["el"], f"{n['el']}: a {n['kind']} with no accessible name (no text, aria-label, "
                                           "aria-labelledby, title or img alt)"))
    ctx["ntc_again"], named, fresh = 0, ctx.setdefault("ntc_named", {}), set()
    for c in checks.get("ntc", []):
        # One line per run for a boundary (the same border or fill on the same surface is one token pairing,
        # drawn again in every view, state and board that shows the control): later shots count it, never
        # repeat it, and the closing note lists the other boards that draw it.
        pair = (c["part"], c["fg"], c["bg"])
        if pair in named and pair not in fresh:
            ctx["ntc_again"] += 1
            if named[pair] != rel:
                ctx.setdefault("ntc_more", {}).setdefault(pair, {}).setdefault(rel, c["el"])
            continue
        named[pair] = rel
        fresh.add(pair)
        what = f"its {design_preview_num(c['width'])}px border {c['fg']}" if c["part"] == "border" else f"its fill {c['fg']}"
        found.append(("non-text-contrast", f"{c['fg']} on {c['bg']}",
                      f"{c['el']}: the control's boundary is {c['ratio']:.2f}:1 against {c['bg']} around it, needs 3:1 "
                      f"({what}; the best of its border and fill counts; later views, states and boards do not repeat this pair)"))
    ntc_unmeasured = checks.get("ntc_unmeasured", [])
    if ntc_unmeasured and rel not in ctx.setdefault("ntc_unmeasured", set()):  # once per board, like unmeasured
        ctx["ntc_unmeasured"].add(rel)
        first = ntc_unmeasured[0]
        found.append(("unmeasured", "ntc", f"{len(ntc_unmeasured)} control boundary(ies) sit on {first['why']} (first: {first['el']}): "
                                           "non-text contrast not measured; judge it on the PNG"))
    for b in checks.get("statebar", []):
        if b["kind"] == "several":
            message = (f"{b['n']} state bars on one board ({', '.join(b['names'])}): a board that shows one page in several "
                       "windows carries exactly one bar, above all the windows and inside none, driving them together")
        elif b["kind"] == "pinned":
            message = (f"the state bar is position: {b['pos']} ({b['el']}): it is the first row of the page and scrolls "
                       "away with it, never fixed or sticky")
        elif b["kind"] == "pages":
            message = (f"the state bar shows the presets of {b['n']} pages at once ({', '.join(b['names'])}): it lists only "
                       "the states of the page on screen")
        else:
            message = ("the state bar has no [role=group] named by the page (aria-label or aria-labelledby): the preview "
                       "cannot tell which page is on screen")
        found.append(("state-bar", b["kind"], message))
    folded: dict = {}
    for check, key, message in found:
        entry = folded.setdefault((check, key), [message, 0])
        entry[1] += 1
    return [(check, message, count) for (check, _), (message, count) in folded.items()]


def design_preview_issues(ctx: dict, rel: str, shot: dict, grow: bool, height: int, clip_h: int = None) -> list:
    """Every (check, message) issue of one screenshot: the render's own (load, settle, size, mounts,
    errors, files not found) and the measured checks. clip_h is a PAGE's frame h in the frame view: the
    render grows a PAGE to its content, but the canvas frame does not, so a state taller than h is cut
    there (page-clip)."""
    shape, issues = shot["shape"], []
    if not shot.get("loaded", True):
        issues.append(("load", "the page never fired its load event (a script or file that never arrived?)"))
    if not shot["settled"]:
        issues.append(("settle", f"the page was still changing after {DESIGN_PREVIEW_SETTLE:g}s (an animation, or a slow font or image)"))
    if grow and shape["h"] > DESIGN_PREVIEW_MAX:
        issues.append(("too-tall", f"the page is {shape['h']}px tall: the screenshot stops at {DESIGN_PREVIEW_MAX}px"))
    elif not grow and shape["h"] > height:
        issues.append(("frame-clip", f"content is {shape['h']}px tall in a {height}px frame: the canvas clips the rest"))
    if clip_h and shape["h"] > clip_h + 1:
        issues.append(("page-clip", f"content is {shape['h']}px tall but the PAGE frame h is {clip_h}px: the canvas cuts the rest "
                                    "(h holds the tallest state a click reaches)"))
    if shape["w"] > shot["width"]:
        issues.append(("overflow", f"content is {shape['w']}px wide at {shot['width']}px: it does not fit the width (clipped, or a sideways scroll)"))
    unmounted = shape["unmounted"]
    for title in sorted(set(unmounted)):
        issues.append(("unmounted", f"not mounted: {title} x{unmounted.count(title)} (an x-import whose system global is missing, "
                                    "or a dc-import whose board is missing)"))
    issues.extend(("runtime-error", f"runtime error: {text}") for text in shape["errors"])
    issues.extend(("script-error", f"script error: {text}") for text in shot["errors"])
    for miss in sorted(set(ctx["misses"])):
        why = " (a canvas upload; it is not on disk)" if miss.startswith("/_blob/") else \
            " (the system cache lacks it)" if miss.startswith("/ds/") else ""
        issues.append(("not-found", f"not found: {miss}{why}"))
    for check, message, count in design_preview_measured(ctx, rel, shot["checks"]):
        issues.append((check, message + (f" (+{count - 1} more like it)" if count > 1 else "")))
    return issues


def design_preview_view(ctx: dict, rel: str, board: dict, view: str) -> int:
    """Render one board in one view and print its line and its issues; returns the issue count, or -1
    when no screenshot came out. frame = the board's w x h (a PAGE grows to its content), phone = 390
    wide, growing to its content."""
    page_board = board.get("expand") == "fill"
    width, height = (board["w"], board["h"]) if view == "frame" else DESIGN_PREVIEW_PHONE
    grow = page_board or view == "phone"
    png = ctx["out"] / f"{rel[:-len(DESIGN_BOARD_SUFFIX)].replace('/', '__')}.{view}.png"
    record = ctx["report"]["boards"][rel]
    ctx["misses"].clear()
    try:
        shot = design_preview_render(ctx["page"], f"{ctx['base']}/{rel}", width, height, grow)
    except (RuntimeError, OSError, ValueError, KeyError, TypeError) as exc:
        print(f"board={rel} png=none w={width} h={height} view={view} error=browser")
        print(f"issue board={rel} view={view} check=screenshot: no screenshot: {exc}")
        record["views"][view] = {"png": None, "w": width, "h": height,
                                  "issues": [{"check": "screenshot", "message": f"no screenshot: {exc}"}]}
        return -1
    png.write_bytes(shot["png"])
    shape = shot["shape"]
    issues = design_preview_issues(ctx, rel, shot, grow, height, height if page_board and view == "frame" else None)
    repeated = 0
    if view != "frame" and "frame" in record["views"]:  # a measured finding the frame view already named is not repeated
        named = {(i["check"], design_preview_fold(i["message"])) for i in record["views"]["frame"]["issues"]}
        kept = [(c, m) for c, m in issues if c not in DESIGN_PREVIEW_CHECKS or (c, design_preview_fold(m)) not in named]
        issues, repeated = kept, len(issues) - len(kept)
    print(f"board={rel} png={design_preview_shown(png)} w={shot['width']} h={shot['height']} view={view} content={shape['w']}x{shape['h']} "
          f"unmounted={len(shape['unmounted'])} errors={len(shape['errors']) + len(shot['errors'])} issues={len(issues)}")
    for check, message in issues:
        print(f"issue board={rel} view={view} check={check}: {message}")
    again = ctx.get("ntc_again", 0)
    if repeated:
        print(f"note board={rel} view={view}: {repeated} measured issue(s) as in the frame view, not repeated")
    if again:
        print(f"note board={rel} view={view}: {again} non-text-contrast boundary(ies) named earlier in this run, not repeated")
    record["views"][view] = {"png": design_preview_shown(png), "w": shot["width"], "h": shot["height"], "content": [shape["w"], shape["h"]],
                             "issues": [{"check": c, "message": m} for c, m in issues], "as_in_frame": repeated, "ntc_as_before": again,
                             "measured": shot["checks"]}
    for link in shot["checks"].get("links", []):
        design_preview_edge(ctx, rel, link["href"])
    return len(issues)


def design_preview_edge(ctx: dict, rel: str, href: str) -> None:
    """Note one link of board `rel` for the link graph (preview.json always; link lines with --click)."""
    kind, target = design_preview_link(rel, href, ctx["boards"], ctx["project"])
    if kind in ("board", "external"):
        ctx["edges"].setdefault(rel, {})[target] = kind


def design_preview_click(page: "DesignBrowser", x: float, y: float) -> None:
    """A real left click at (x, y): move, press, release (Input.dispatchMouseEvent), then the pointer
    leaves for the top-left corner, so no hover style stays on the clicked control."""
    page.call("Input.dispatchMouseEvent", {"type": "mouseMoved", "x": x, "y": y})
    page.call("Input.dispatchMouseEvent", {"type": "mousePressed", "x": x, "y": y, "button": "left", "buttons": 1, "clickCount": 1})
    page.call("Input.dispatchMouseEvent", {"type": "mouseReleased", "x": x, "y": y, "button": "left", "buttons": 0, "clickCount": 1})
    page.call("Input.dispatchMouseEvent", {"type": "mouseMoved", "x": 0, "y": 0})


def design_preview_note(ctx: dict, rel: str, view: str, state, check: str, message: str) -> None:
    """Print and record one --click finding that belongs to a move between states, not to one
    screenshot (layout-shift, same-target, hover-contrast): preview.json keeps it on the board and in
    its issues list, and it counts in issues=."""
    where = f" state={state:02d}" if state is not None else ""
    print(f"issue board={rel} view={view}{where} check={check}: {message}")
    item = {"view": view, "state": state, "check": check, "message": message}
    ctx["report"]["boards"][rel].setdefault("interaction", []).append(item)
    ctx["report"]["issues"].append(dict(item, board=rel))


def design_preview_hover(ctx: dict, rel: str, view: str, state: int, hovered: set) -> int:
    """The hover pass on the page as it stands: rest the pointer on each button and link not hovered
    yet on this board (by its signature), and re-run the contrast check on the hovered control's own
    text. A run that newly fails is a hover-contrast issue (the "green-out": a skeleton a:hover color
    beating a system Button rendered as <a>). Returns the issue count."""
    page, found = ctx["page"], 0
    try:
        targets = page.evaluate(DESIGN_PREVIEW_HOVER_JS) or []
        for t in targets:
            if t["sig"] in hovered:
                continue
            hovered.add(t["sig"])
            page.call("Input.dispatchMouseEvent", {"type": "mouseMoved", "x": t["x"], "y": t["y"]})
            now = page.evaluate(f"window.__dcHover({json.dumps(t['key'])})") or []
            for f in now:
                if f"{f['el']}|{f['fg']}|{f['bg']}" in t["before"]:
                    continue
                design_preview_note(ctx, rel, view, state, "hover-contrast",
                                    f"hovering {t['el']} turns {f['el']} to {f['ratio']:.2f}:1, needs "
                                    f"{design_preview_num(f['need'])}:1 (text {f['fg']} on {f['bg']}; keep hover restrained "
                                    "and scope page link colors to text links, e.g. a:not([class]))")
                found += 1
                break
        page.call("Input.dispatchMouseEvent", {"type": "mouseMoved", "x": 0, "y": 0})
        page.evaluate(DESIGN_PREVIEW_HOVER_DONE_JS)
    except (RuntimeError, KeyError, TypeError) as exc:
        design_preview_note(ctx, rel, view, state, "click", f"the hover pass stopped: {exc}")
        found += 1
    return found


def design_preview_load(page: "DesignBrowser", url: str, width: int, height: int) -> tuple:
    """A fresh load of `url` in an exact width x height viewport; (loaded, settled)."""
    page.call("Emulation.setDeviceMetricsOverride", {"width": width, "height": height, "deviceScaleFactor": 1, "mobile": False})
    page.events.clear()
    page.call("Page.navigate", {"url": url})
    loaded = page.wait_event("Page.loadEventFired", DESIGN_PREVIEW_SETTLE)
    return loaded, page.settle()


def design_preview_earlier(record: dict) -> set:
    """The (check, folded message) pairs the board's views so far already named."""
    return {(i["check"], design_preview_fold(i["message"])) for v in record["views"].values() for i in v.get("issues", [])}


def design_preview_text_view(ctx: dict, rel: str, view: str) -> int:
    """v61 (P37.S6), a PAGE's two WCAG views: w320 (320 px wide: reflow, WCAG 1.4.10) and text200 (the
    phone width with every element's font-size doubled: WCAG 1.4.4), each growing to its content. Each
    names reflow (a sideways scroll), overprint (two text runs crossing) and the clipped check, plus the
    render's own issues the earlier views did not name. Returns the issue count, or -1 with no screenshot."""
    page, record = ctx["page"], ctx["report"]["boards"][rel]
    width, height = (DESIGN_PREVIEW_REFLOW if view == "w320" else DESIGN_PREVIEW_PHONE[0]), DESIGN_PREVIEW_PHONE[1]
    where = f"at {width}px wide" if view == "w320" else f"at {width}px with {DESIGN_PREVIEW_TEXT_SCALE * 100}% text"
    png = ctx["out"] / f"{rel[:-len(DESIGN_BOARD_SUFFIX)].replace('/', '__')}.{view}.png"
    ctx["misses"].clear()
    try:
        loaded, settled = design_preview_load(page, f"{ctx['base']}/{rel}", width, height)
        if view == "text200":
            page.evaluate(f"{DESIGN_PREVIEW_TEXT_SCALE_JS}({DESIGN_PREVIEW_TEXT_SCALE})")
            settled = page.settle() and settled
        shot = design_preview_capture(page, width, height, True, settled)
        shot["loaded"] = loaded
        crossed = page.evaluate(DESIGN_PREVIEW_OVERPRINT_JS) or {"pairs": [], "found": 0, "runs": 0}
    except (RuntimeError, OSError, ValueError, KeyError, TypeError) as exc:
        print(f"board={rel} png=none w={width} h={height} view={view} error=browser")
        print(f"issue board={rel} view={view} check=screenshot: no screenshot: {exc}")
        record["views"][view] = {"png": None, "w": width, "h": height,
                                  "issues": [{"check": "screenshot", "message": f"no screenshot: {exc}"}]}
        return -1
    png.write_bytes(shot["png"])
    shape = shot["shape"]
    keep = ("clipped", "load", "settle", "too-tall", "unmounted", "runtime-error", "script-error", "not-found")
    issues = [(c, m) for c, m in design_preview_issues(ctx, rel, shot, True, height) if c in keep]
    if shape["w"] > width:
        issues.insert(0, ("reflow", f"content is {shape['w']}px wide {where}: the page scrolls sideways "
                                    "(it reflows into the width, scrolling only a table, code or a map in its own box)"))
    for p in crossed["pairs"]:
        issues.append(("overprint", f"{p['a']} and {p['b']} overprint {where}: their text crosses over {p['w']}x{p['h']}px"))
    if crossed["found"] > len(crossed["pairs"]):
        issues.append(("overprint", f"{crossed['found'] - len(crossed['pairs'])} more overprinting pair(s) {where} (see the PNG)"))
    named = design_preview_earlier(record)
    kept = [(c, m) for c, m in issues if (c, design_preview_fold(m)) not in named]
    repeated = len(issues) - len(kept)
    print(f"board={rel} png={design_preview_shown(png)} w={shot['width']} h={shot['height']} view={view} "
          f"content={shape['w']}x{shape['h']} unmounted={len(shape['unmounted'])} "
          f"errors={len(shape['errors']) + len(shot['errors'])} issues={len(kept)}")
    for check, message in kept:
        print(f"issue board={rel} view={view} check={check}: {message}")
    if repeated:
        print(f"note board={rel} view={view}: {repeated} issue(s) as in an earlier view, not repeated")
    measured = {"clipped": shot["checks"].get("clipped", []) if isinstance(shot["checks"], dict) else [], "overprint": crossed}
    record["views"][view] = {"png": design_preview_shown(png), "w": shot["width"], "h": shot["height"],
                             "content": [shape["w"], shape["h"]], "issues": [{"check": c, "message": m} for c, m in kept],
                             "as_in_frame": repeated, "measured": measured}
    return len(kept)


def design_preview_keyboard(ctx: dict, rel: str, board: dict) -> int:
    """v61 (P37.S6): keyboard (WCAG 2.1.1) on an interactive board, frame view, from the settled state.
    Tab (Input.dispatchKeyEvent) until focus comes back to the first stop, at most DESIGN_PREVIEW_TABS
    presses; a control the order never reached is unreachable (judged only when the order wrapped). A
    click-only control (DESIGN_PREVIEW_KEYS_JS) is a keyboard issue too, one line per tag and class; the
    first DESIGN_PREVIEW_POP_PROBES of them are clicked from a fresh load, and one that opens a dialog,
    menu, tooltip, listbox or popover is named so. Returns the issue count."""
    page, url = ctx["page"], f"{ctx['base']}/{rel}"
    width, height = board["w"], board["h"]
    record, found = ctx["report"]["boards"][rel], 0
    key = {"key": "Tab", "code": "Tab", "windowsVirtualKeyCode": 9, "nativeVirtualKeyCode": 9}
    try:
        design_preview_load(page, url, width, height)
        setup = page.evaluate(DESIGN_PREVIEW_KEYS_JS)
        cap, presses, wrapped = min(DESIGN_PREVIEW_TABS, 2 * max(setup["stops"], setup["controls"]) + 20), 0, False
        while presses < cap and not wrapped:
            for _ in range(min(25, cap - presses)):
                page.call("Input.dispatchKeyEvent", dict(key, type="keyDown"))
                page.call("Input.dispatchKeyEvent", dict(key, type="keyUp"))
                presses += 1
            wrapped = bool(page.evaluate("!!(window.__dcKeys && window.__dcKeys.wrapped)"))
        done = page.evaluate(DESIGN_PREVIEW_KEYS_DONE_JS) or {"missed": [], "reached": 0}
        sigs: dict = {}
        for c in setup["only"]:
            sigs.setdefault(c["sig"], []).append(c)
        opened: dict = {}
        for sig in list(sigs)[:DESIGN_PREVIEW_POP_PROBES]:
            design_preview_load(page, url, width, height)
            at = page.evaluate(f"{DESIGN_PREVIEW_POINT_JS}({json.dumps(sigs[sig][0]['key'])})")
            if not at:
                continue
            page.settle(poll=0.04, need=1)
            before, look = set(page.evaluate(DESIGN_PREVIEW_OVERLAYS_JS) or []), page.evaluate(DESIGN_PREVIEW_STATE_JS)["hash"]
            design_preview_click(page, at[0], at[1])
            page.settle(poll=0.04, need=1)
            try:
                page.evaluate(DESIGN_PREVIEW_ANIMATIONS_JS)
            except RuntimeError:
                pass
            new = [o for o in page.evaluate(DESIGN_PREVIEW_OVERLAYS_JS) or [] if o not in before]
            opened[sig] = f"opens {new[0]}" if new else ("changes the page" if page.evaluate(DESIGN_PREVIEW_STATE_JS)["hash"] != look else "")
    except (RuntimeError, OSError, ValueError, KeyError, TypeError) as exc:
        design_preview_note(ctx, rel, "frame", None, "click", f"the keyboard pass stopped: {exc}")
        return 1
    missed = done.get("missed") or []
    if wrapped and missed:
        names = ", ".join(missed[:4]) + (f" (+{len(missed) - 4} more)" if len(missed) > 4 else "")
        design_preview_note(ctx, rel, "frame", None, "keyboard",
                            f"{len(missed)} control(s) Tab never reaches from the settled state: {names}")
        found += 1
    for sig, items in sigs.items():
        what, how = opened.get(sig), items[0]["how"]
        more = f" (+{len(items) - 1} more like it)" if len(items) > 1 else ""
        does = f"{what} on click ({how})" if what else f"takes a click ({how})"
        design_preview_note(ctx, rel, "frame", None, "keyboard",
                            f"{items[0]['el']} {does} but never keyboard focus: not natively focusable and no tabindex >= 0, "
                            f"so a keyboard user cannot reach it{more}")
        found += 1
    notes = [f"{done.get('reached', 0)} Tab stop(s) for {setup['controls']} control(s) in {presses} press(es)"
             + ("" if wrapped else f": the order did not come back to its first stop (cap {cap}), so no control is called unreachable")]
    if setup.get("modal"):
        notes.append("an open modal: only its controls are expected")
    print(f"note board={rel} view=frame: keyboard: " + "; ".join(notes))
    record["keyboard"] = {"controls": setup["controls"], "reached": done.get("reached", 0), "presses": presses,
                          "wrapped": wrapped, "missed": missed, "click_only": setup["only"][:40], "opened": opened}
    return found


def design_preview_blocking(report: dict) -> dict:
    """{check: count} of the blocking checks' issue lines over every board of a (merged) report."""
    counts: dict = {}
    for rec in report["boards"].values():
        items = [i for v in rec.get("views", {}).values() for i in v.get("issues", [])]
        items += [i for s in rec.get("states", []) for i in s.get("issues", [])] + rec.get("interaction", [])
        for item in items:
            if item.get("check") in DESIGN_PREVIEW_BLOCKING:
                counts[item["check"]] = counts.get(item["check"], 0) + 1
    return {c: counts[c] for c in DESIGN_PREVIEW_BLOCKING if c in counts}


def design_preview_shown(path: Path) -> str:
    """A screenshot's path as printed and stored: shown() (repo-relative) under the workspace, else absolute."""
    try:
        path.resolve().relative_to(ROOT.resolve())
    except ValueError:
        return str(path)
    return shown(path.resolve())


def design_preview_tokens(width: int, height: int) -> int:
    """About what reading one image costs: ceil(w/28) x ceil(h/28) tokens, after the long side is
    brought down to DESIGN_PREVIEW_SHEET_W."""
    import math
    f = min(1.0, DESIGN_PREVIEW_SHEET_W / max(width, height, 1))
    return math.ceil(width * f / 28) * math.ceil(height * f / 28)


def design_preview_sheet(ctx: dict, rel: str) -> dict:
    """v61 (P37.S6) --contact-sheet: one PNG per board tiling its views and states at one reduced scale
    (the widest shot fills a tile, at most DESIGN_PREVIEW_SHEET_SCALE of its size; a tile is cut at
    DESIGN_PREVIEW_SHEET_TILE times its width), each under a caption, at most DESIGN_PREVIEW_SHEET_W px
    wide, drawn as an HTML page of <img> tiles in the same
    browser. Returns its record, or {} when the board has no screenshot."""
    record = ctx["report"]["boards"][rel]
    tiles = []
    for view, v in record.get("views", {}).items():
        if v.get("png"):
            count = len(v.get("issues", []))
            tiles.append((f"{view} {v['w']}x{v['h']}" + (f" · {count} issue(s)" if count else ""), v))
    for s in record.get("states", []):
        if s.get("png"):
            count = len(s.get("issues", []))
            tiles.append((f"{s['view']} state {s['n']:02d}: {' > '.join(s.get('path', []))[:80]}" + (f" · {count} issue(s)" if count else ""), s))
    files = []
    for caption, item in tiles:
        path = Path(item["png"])
        path = path if path.is_absolute() else (HOST_ROOT or ROOT) / path
        if path.is_file():
            files.append((caption, path, item["w"], item["h"]))
    if not files:
        return {}
    import html as htmllib
    import math
    cols = max(1, min(6, math.ceil(math.sqrt(len(files)))))
    gap = 8
    widest = max(w for _, _, w, _ in files)
    tile = min((DESIGN_PREVIEW_SHEET_W - gap * (cols + 1)) // cols, max(1, round(widest * DESIGN_PREVIEW_SHEET_SCALE)))
    scale = tile / widest
    sheet_w = tile * cols + gap * (cols + 1)
    cap = int(tile * DESIGN_PREVIEW_SHEET_TILE)
    cells = []
    for caption, path, w, h in files:
        sw, sh = max(1, round(w * scale)), max(1, round(h * scale))
        cut = " (cut)" if sh > cap else ""
        cells.append(f'<figure><div class="t" style="height:{min(sh, cap)}px"><img src="{path.as_uri()}" '
                     f'style="width:{sw}px;height:{sh}px"></div><figcaption>{htmllib.escape(caption + cut)}</figcaption></figure>')
    title = record.get("title") or rel
    doc = ("<!doctype html><html><head><meta charset=utf-8><style>"
           f"body{{margin:0;background:#fff;color:#111;font:13px/1.3 -apple-system,'Helvetica Neue',Arial,sans-serif;width:{sheet_w}px}}"
           f"h1{{font-size:15px;margin:0;padding:{gap}px {gap}px 0}}"
           f".g{{display:grid;grid-template-columns:repeat({cols},{tile}px);gap:{gap}px;padding:{gap}px;align-items:start}}"
           "figure{margin:0}.t{overflow:hidden;outline:1px solid #bbb;background:#f4f4f4}img{display:block}"
           "figcaption{margin-top:3px;font-size:11px;color:#333;overflow-wrap:anywhere}</style></head><body>"
           f"<h1>{htmllib.escape(title)} · {htmllib.escape(rel)} · {len(files)} shot(s), 1:{1 / scale:.1f}</h1>"
           f"<div class=g>{''.join(cells)}</div></body></html>")
    stem = rel[:-len(DESIGN_BOARD_SUFFIX)].replace("/", "__")
    page_file = ctx["out"] / f".{stem}.sheet.html"
    png = ctx["out"] / f"{stem}.sheet.png"
    page = ctx["page"]
    page_file.write_text(doc, encoding="utf-8")
    try:
        design_preview_load(page, page_file.as_uri(), sheet_w, 300)
        page.evaluate("Promise.all([...document.images].map(i=>i.complete?1:new Promise(r=>{i.onload=i.onerror=r;})))")
        height = min(int(page.evaluate("document.documentElement.scrollHeight")), DESIGN_PREVIEW_MAX)
        page.call("Emulation.setDeviceMetricsOverride", {"width": sheet_w, "height": height, "deviceScaleFactor": 1, "mobile": False})
        page.settle(poll=0.05, need=1)
        import base64
        png.write_bytes(base64.b64decode(page.call("Page.captureScreenshot", {"format": "png"})["data"]))
    finally:
        page_file.unlink(missing_ok=True)
    tokens = design_preview_tokens(sheet_w, height)
    print(f"sheet board={rel} png={design_preview_shown(png)} w={sheet_w} h={height} tiles={len(files)} "
          f"scale=1:{1 / scale:.1f} tokens~{tokens} (the {len(files)} PNG(s) one by one: ~{sum(design_preview_tokens(w, h) for _, _, w, h in files)})")
    return {"png": design_preview_shown(png), "w": sheet_w, "h": height, "tiles": len(files),
            "scale": round(scale, 4), "tokens": tokens}


def design_preview_shifts(before: dict, after: dict, control: dict) -> list:
    """Layout-shift messages for one click that stayed on the same page: a control (outside
    [data-proto]) whose box changed by more than DESIGN_PREVIEW_SHIFT px -- matched by its place and
    label, and the clicked one also by its place, tag and first class when its label changed ("Send"
    to "Sending...") -- and a header, nav or main that moved."""
    limit, out = DESIGN_PREVIEW_SHIFT, []
    old = {(c["key"], c["label"]): c for c in before["clicks"] if not c.get("proto")}
    for c in after["clicks"]:
        if c.get("proto"):
            continue
        was = old.get((c["key"], c["label"]))
        if was is None and c["key"] == control["key"]:
            was = next((o for o in before["clicks"] if o["key"] == c["key"] and o.get("t") == c.get("t") and not o.get("proto")), None)
        if was and (abs(was["w"] - c["w"]) > limit or abs(was["h"] - c["h"]) > limit):
            name = f"'{c['label']}'" if was["label"] == c["label"] else f"'{was['label']}' (now '{c['label']}')"
            out.append(f"clicking '{control['label']}' resizes {name} {was['w']:g}x{was['h']:g} -> {c['w']:g}x{c['h']:g}px "
                       "(a control keeps its size when it shows its state)")
    moved = []
    old_anchors = {a["key"]: a for a in before.get("anchors", [])}
    for a in after.get("anchors", []):
        was = old_anchors.get(a["key"])
        if was and was["el"] == a["el"] and (abs(was["x"] - a["x"]) > limit or abs(was["y"] - a["y"]) > limit):
            axis = f"y {was['y']}->{a['y']}" if abs(was["y"] - a["y"]) > limit else f"x {was['x']}->{a['x']}"
            moved.append(f"{a['el']} {axis}")
    if moved:
        out.append(f"clicking '{control['label']}' moves the page: {', '.join(moved[:4])}"
                   + (f" (+{len(moved) - 4} more)" if len(moved) > 4 else "")
                   + " (the header and content stay put while the page shows a state)")
    return out


def design_preview_explore(ctx: dict, rel: str, board: dict, view: str = "frame") -> int:
    """--click on an interactive board, in one view (frame, or phone with --phone): from the settled
    initial state, try each control (breadth first) and record every state whose visible DOM is new,
    with its screenshot, its line and its issues. A state's path is a recipe from a fresh load, and its
    screenshot is taken on exactly that recipe: a click is tried on the page as it stands when it
    already shows the state's DOM (most clicks change nothing, so this saves a reload each), else after
    a reload and a replay of the path; and a new state reached with other clicks behind it (a ticked box
    the DOM identity ignores) is replayed from a fresh load before its screenshot, so no leftover value
    leaks into it.

    v60 (P36.S8C), for the flow-board recipe:
    - the canvas-only state bar's presets are tried first, once per page: a preset sets the page's
      complete state, so trying them from a second state of the same page gives nothing new; a state
      on a page not met before is explored ahead of the rest, so every page's presets are reached;
    - a list of DESIGN_PREVIEW_LIST_SAMPLE rows or more is sampled (its first, second and last row);
      rows of one list that open the same state of another page are a same-target issue;
    - every visible text field gets a realistic sample typed into it, a step of the path like a click,
      and a form with two or more empty fields is also filled whole in one step;
    - every move that stays on the same page compares the boxes of the controls and the positions of
      the header, nav and main (layout-shift); a move to another page (the state bar's page name, else
      the h1, changes) is navigation, never a shift;
    - a PAGE's states are checked against its frame h (page-clip), and in the frame view each PAGE
      state gets the hover pass.
    Returns the issue count of the states."""
    page, url = ctx["page"], f"{ctx['base']}/{rel}"
    if view == "phone":
        width, height, grow = DESIGN_PREVIEW_PHONE[0], DESIGN_PREVIEW_PHONE[1], True
    else:
        width, height, grow = board["w"], board["h"], board.get("expand") == "fill"
    page_board = board.get("expand") == "fill"
    clip_h = height if page_board and view == "frame" else None
    record = ctx["report"]["boards"][rel]
    fold = design_preview_fold
    frame = {(i["check"], fold(i["message"])) for i in record["views"].get(view, {}).get("issues", [])}
    stem = rel[:-len(DESIGN_BOARD_SUFFIX)].replace("/", "__")

    history: list = []  # the steps since the last load
    quick = {"poll": 0.04, "need": 1}  # a replay that misses its state is retried once with the render's settle

    def load() -> None:
        history.clear()
        page.call("Emulation.setDeviceMetricsOverride", {"width": width, "height": height, "deviceScaleFactor": 1, "mobile": False})
        page.events.clear()
        page.call("Page.navigate", {"url": url})
        page.wait_event("Page.loadEventFired", DESIGN_PREVIEW_SETTLE)
        page.settle(**quick)
        page.evaluate(DESIGN_PREVIEW_GUARD_JS)

    def look() -> dict:
        return page.evaluate(DESIGN_PREVIEW_STATE_JS)

    def press(target: dict):
        """Click the control (or type the sample into the field) with this key and label in the current
        page; the look before it, or None when it is not there."""
        before = look()
        if target.get("fill"):
            here = [f for f in before["fields"] if f["empty"]] or None
        else:
            pool = before["fields"] if "text" in target else before["clicks"]
            here = next((c for c in pool if c["key"] == target["key"] and c["label"] == target["label"]), None)
        if here is None:
            return None
        page.events.clear()
        mark = page.evaluate("window.__dcTimers ? window.__dcTimers.seq() : 0")
        step = {"key": target["key"], "label": target["label"]}
        if target.get("fill"):  # every empty field gets its sample, as one step
            for f in here:
                if page.evaluate(f"{DESIGN_PREVIEW_FOCUS_JS}({json.dumps(f['key'])})"):
                    page.call("Input.insertText", {"text": f["text"]})
            step["fill"] = True
        elif "text" in target:
            if not page.evaluate(f"{DESIGN_PREVIEW_FOCUS_JS}({json.dumps(target['key'])})"):
                return None
            page.call("Input.insertText", {"text": target["text"]})
            step["text"] = target["text"]
        else:
            design_preview_click(page, here["x"], here["y"])
        history.append(step)
        page.settle(**quick)
        if page.evaluate(f"window.__dcTimers ? window.__dcTimers.after({int(mark)}) : 0"):
            timed.add(target["label"])
            page.evaluate(f"new Promise(r => {{ const t0 = Date.now(), f = () => !window.__dcTimers.after({int(mark)}) "
                          "|| Date.now() - t0 > 3000 ? r(1) : setTimeout(f, 25); f(); })")
            page.settle(**quick)
        try:
            page.evaluate(DESIGN_PREVIEW_ANIMATIONS_JS)
        except RuntimeError:
            pass
        return before

    def replay(path: list, want: str = None) -> str:
        """Reload and run `path` again; the DOM identity it ends on, or "" when a step is missing. When
        it does not end on `want`, it is tried once more with the render's slower settle."""
        for slow in (False, True):
            quick.update(poll=0.15, need=2) if slow else quick.update(poll=0.04, need=1)
            load()
            got = look()["hash"] if all(press(step) for step in path) else ""
            quick.update(poll=0.04, need=1)
            if want is None or got == want:
                break
        return got

    def reach(state: dict) -> bool:
        """Put the page in `state`: as it is when its DOM already matches, else reload and replay."""
        try:
            if page.evaluate("!!window.__dcPreview") and look()["hash"] == state["hash"]:
                return True
        except RuntimeError:
            pass
        return replay(state["path"], state["hash"]) == state["hash"]

    def shown_path(path: list) -> str:
        return " > ".join(f"{step['label']} <- \"{step['text']}\"" if "text" in step else step["label"] for step in path)

    timed: set = set()  # controls whose click set a short timer that was waited for
    hovered: set = set()  # the signatures of the controls the hover pass has rested on
    issues = 0
    if view == "phone":
        replay([])
    else:
        page.evaluate(DESIGN_PREVIEW_GUARD_JS)  # the frame view just rendered: this is the initial state
        if not page.evaluate("!!window.__dcTimers"):  # the timer watch starts with the first load after it
            replay([])
    if page_board and view == "frame":
        before_hover = look()["hash"]
        issues += design_preview_hover(ctx, rel, view, 0, hovered)
        if look()["hash"] != before_hover:  # a hover handler changed the page: start again from a fresh load
            replay([])
    first = look()
    states = [{"n": 0, "path": [], "hash": first["hash"], "page": first["page"]}]
    seen, queue, ahead, clicks = {first["hash"]: 0}, [], [0], 0
    pages_met, pages_preset = {first["page"]}, set()
    notes, skipped, left, unreproduced, thrown = [], {"covered": 0, "outside": 0}, set(), 0, set()
    said, lists_said, sampled_out, typed, pickers = set(), set(), 0, set(), 0
    capped_states = capped_depth = capped_clicks = False
    deadline = time.monotonic() + DESIGN_PREVIEW_BOARD_SECONDS

    def say(state_n: int, check: str, message: str) -> int:
        if (check, message) in said:
            return 0
        said.add((check, message))
        design_preview_note(ctx, rel, view, state_n, check, message)
        return 1

    while (ahead or queue) and not capped_clicks:
        state = states[(ahead or queue).pop(0)]
        if len(state["path"]) >= DESIGN_PREVIEW_DEPTH:
            capped_depth = True
            continue
        if not reach(state):
            unreproduced += 1
            continue
        here = look()
        skipped["covered"] += here["covered"]
        skipped["outside"] += here["outside"]
        pickers = max(pickers, here.get("pickers", 0))
        presets = [c for c in here["clicks"] if c.get("bar")]
        if here["page"] in pages_preset:
            presets = []
        elif presets:
            pages_preset.add(here["page"])
        rest = [c for c in here["clicks"] if not c.get("bar")]
        lists: dict = {}
        for c in rest:
            if c.get("list"):
                lists.setdefault(c["list"], []).append(c)
        drop = set()
        for members in lists.values():
            if len(members) >= DESIGN_PREVIEW_LIST_SAMPLE:
                members.sort(key=lambda c: c.get("idx", 0))
                keep = {id(members[0]), id(members[1]), id(members[-1])}
                drop.update(id(c) for c in members if id(c) not in keep)
        sampled_out += len(drop)
        fields = here.get("fields", [])
        actions = presets + [c for c in rest if id(c) not in drop] + [dict(f) for f in fields]
        if sum(1 for f in fields if f["empty"]) >= 2:  # and the whole form at once, so its submit is reached filled
            actions.append({"key": "*", "label": "fill every field", "fill": True})
        opened: dict = {}  # list id -> [(label, state hash, page)] for the rows clicked from this state
        for control in actions:
            if clicks >= DESIGN_PREVIEW_CLICKS or time.monotonic() > deadline:
                capped_clicks = True
                break
            if not reach(state):
                unreproduced += 1
                break
            clicks += 1
            before = press(control)
            if not before:
                continue
            if "text" in control:
                typed.add(control["label"])
            path = state["path"] + [dict({"key": control["key"], "label": control["label"]},
                                         **({"text": control["text"]} if "text" in control else {}),
                                         **({"fill": True} if control.get("fill") else {}))]
            shown = shown_path(path)
            try:
                navigated = not page.evaluate("!!window.__dcPreview")
            except RuntimeError:
                navigated = True
            if navigated:  # a click that left the board is a link, not a state
                left.add(control["label"])
                continue
            errors = page.errors()
            now = look()
            after = now["hash"]
            if before["page"] == now["page"]:
                for message in design_preview_shifts(before, now, control):
                    issues += say(state["n"], "layout-shift", message)
            elif control.get("bar"):  # v61: a preset sets its own page's state; the page changes only by the prototype
                issues += say(state["n"], "state-bar", f"the preset '{control['label']}' moves to another page "
                              f"({before['page'] or '?'} -> {now['page'] or '?'}): the bar lists only the states of the page on screen")
            if control.get("list") and "text" not in control:
                opened.setdefault(control["list"], []).append((control["label"], after, now["page"]))
            if now["page"] not in pages_met:
                pages_met.add(now["page"])
                first_of_page = True
            else:
                first_of_page = False
            if after in seen or len(states) >= DESIGN_PREVIEW_STATES:
                capped_states = capped_states or after not in seen
                where = seen.get(after, state["n"])
                for text in errors:
                    if (control["label"], text) in thrown:  # said once per control and error
                        continue
                    thrown.add((control["label"], text))
                    message = f"clicking \"{shown}\" threw: {text}"
                    print(f"issue board={rel} view={view} state={where:02d} check=click-error: {message}")
                    record["click_errors"].append({"state": where, "view": view, "path": [s["label"] for s in path], "message": text})
                    issues += 1
                if first_of_page and after not in seen:
                    pages_met.discard(now["page"])  # not recorded: let a later move to that page count as its first
                continue
            if history != path:  # other steps are behind this page: take the screenshot on the path alone
                actual = list(history)
                if replay(path, after) != after:  # the shortest path does not give it from a fresh load: keep the real one
                    path, shown = actual, shown_path(actual)
                    if replay(path, after) != after:
                        unreproduced += 1
                        continue
            new = {"n": len(states), "path": path, "hash": after, "page": now["page"]}
            states.append(new)
            seen[after] = new["n"]
            (ahead if first_of_page else queue).append(new["n"])
            page.call("Emulation.setDeviceMetricsOverride", {"width": width, "height": height, "deviceScaleFactor": 1, "mobile": False})
            ctx["misses"].clear()
            shot = design_preview_capture(page, width, height, grow, page.settle(**quick))
            shot["errors"] = []  # the click's errors, said once below as click-error
            png = ctx["out"] / f"{stem}.{view}.state-{new['n']:02d}.png"
            png.write_bytes(shot["png"])
            found = [(c, m) for c, m in design_preview_issues(ctx, rel, shot, grow, height, clip_h) if (c, fold(m)) not in frame]
            found += [("click-error", f"clicking \"{shown}\" threw: {text}") for text in errors
                      if (control["label"], text) not in thrown]
            thrown.update((control["label"], text) for text in errors)
            shape = shot["shape"]
            print(f"state board={rel} view={view} n={new['n']:02d} path=\"{shown}\" png={design_preview_shown(png)} w={shot['width']} "
                  f"h={shot['height']} content={shape['w']}x{shape['h']} issues={len(found)}")
            for check, message in found:
                print(f"issue board={rel} view={view} state={new['n']:02d} check={check}: {message}")
            issues += len(found)
            record["states"].append({"n": new["n"], "view": view, "page": new["page"], "path": [shown_path([s]) for s in path],
                                     "png": design_preview_shown(png), "w": shot["width"], "h": shot["height"], "content": [shape["w"], shape["h"]],
                                     "issues": [{"check": c, "message": m} for c, m in found], "measured": shot["checks"]})
            for link in shot["checks"].get("links", []):
                design_preview_edge(ctx, rel, link["href"])
            if page_board and view == "frame":
                issues += design_preview_hover(ctx, rel, view, new["n"], hovered)
        for list_id, rows in opened.items():
            if list_id in lists_said:  # said once per list
                continue
            alike: dict = {}
            for label, after, where in rows:
                if after != state["hash"] and where != state["page"]:
                    alike.setdefault(after, []).append(label)
            for after, labels in alike.items():
                if len(set(labels)) >= 2 and list_id not in lists_said:
                    lists_said.add(list_id)
                    names = ", ".join(f"'{label}'" for label in sorted(set(labels))[:3])
                    issues += say(state["n"], "same-target",
                                  f"rows {names} of one list all open the same state (n={seen.get(after, '?')}): "
                                  "each item opens its own item")
    if capped_states:
        notes.append(f"state cap {DESIGN_PREVIEW_STATES} reached: more states exist")
    if capped_depth:
        notes.append(f"depth cap {DESIGN_PREVIEW_DEPTH} reached: states deeper than {DESIGN_PREVIEW_DEPTH} steps were not explored")
    if capped_clicks:
        notes.append(f"click cap ({DESIGN_PREVIEW_CLICKS} steps or {DESIGN_PREVIEW_BOARD_SECONDS}s) reached: some controls were not tried")
    if unreproduced:
        notes.append(f"{unreproduced} state(s) did not come back on replay (a timer, or randomness): their controls were not all tried")
    if skipped["covered"] or skipped["outside"]:
        notes.append(f"controls not clicked: {skipped['covered']} covered by another element, "
                     f"{skipped['outside']} outside the {width}x{height} frame (counted per state)")
    if sampled_out:
        notes.append(f"list rows sampled: {sampled_out} row click(s) skipped (each list of {DESIGN_PREVIEW_LIST_SAMPLE}+ rows "
                     "tries its first, second and last row)")
    if pages_preset:
        notes.append(f"state-bar presets tried on {len(pages_preset)} page(s)")
    if left:
        notes.append(f"clicks that left the board (a link, not a state): {', '.join(sorted(left))}")
    if timed:
        notes.append(f"waited for the timers of {', '.join(sorted(timed))}: a state shown only while a timer runs "
                     "(Saving...) is passed through, and the state recorded is the one after it")
    if typed:
        notes.append(f"typed a sample into {len(typed)} field(s): {', '.join(sorted(typed))}")
    if pickers:
        notes.append(f"{pickers} field(s) need a native picker (select, date, file, range): states behind them are not explored")
    if hovered:
        notes.append(f"hovered {len(hovered)} control(s)")
    print(f"note board={rel} view={view}: {len(states) - 1} state(s) beyond the initial one, {clicks} step(s)"
          + "".join(f"; {n}" for n in notes))
    record.setdefault("click", {})[view] = {"states": len(states) - 1, "clicks": clicks, "notes": notes}
    ctx["states"] += len(states) - 1
    return issues


def design_preview(args: argparse.Namespace) -> int:
    """Render each board of a job's canvas locally and print where the screenshots are."""
    started = time.monotonic()
    if args.phone_click:
        args.click = True
    root = design_root()
    scan = design_scan(root, args.job)
    design_require_manifest(scan, root, "design-preview")
    job = design_find_job(scan, args.job, "design-preview")
    project = job["path"] / "canvas" / "project"
    try:
        index = read_json(project / "canvas.json")
    except (ValueError, OSError) as exc:
        raise SystemExit(f"design-preview: refused -- jobs/{args.job}/canvas/project/canvas.json is not readable "
                         f"({exc}); the drafter writes the canvas tree first")
    boards = index.get("boards") if isinstance(index, dict) else None
    if not isinstance(boards, dict) or not boards:
        raise SystemExit(f"design-preview: refused -- jobs/{args.job}/canvas/project/canvas.json lists no boards")
    unknown = [b for b in args.board or [] if b not in boards]
    if unknown:
        raise SystemExit(f"design-preview: no board {', '.join(map(repr, unknown))} in canvas.json "
                         f"(boards: {', '.join(sorted(boards))})")
    runtime = Path(args.runtime).expanduser()
    if not runtime.is_file():
        raise SystemExit(f"design-preview: refused -- no runtime at {runtime} (the orchestrator saves the Design canvas "
                         "type's artifact-type/dc-runtime.js for the job; pass that path)")
    # v61 (P37.S6) render reuse: the default --out is one stable folder per job and round under the design
    # root's git-ignored .preview/, so the critic finds the drafter's final render (preview.json, the PNGs,
    # the contact sheets) without re-rendering it. An --out elsewhere in the design root is refused.
    rounds = sorted(job["rounds"], key=lambda r: r["number"])
    current = next((r for r in rounds if r["data"] and r["data"]["status"] == "open"), rounds[-1] if rounds else None)
    reuse = root / DESIGN_PREVIEW_DIR
    default_out = reuse / args.job / (current["id"] if current else "no-round")
    out = Path(args.out).expanduser().resolve() if args.out else default_out.resolve()
    try:
        out.relative_to(root.resolve())
    except ValueError:
        pass
    else:
        try:
            out.relative_to(reuse.resolve())
        except ValueError:
            raise SystemExit(f"design-preview: refused -- --out {out} is inside {DESIGN_ROOT_SHOWN}/ but not its git-ignored "
                             f"{DESIGN_PREVIEW_DIR}/; screenshots stay out of the design record")
    earlier = None
    if args.states_only:
        args.click = True
        try:
            earlier = read_json(out / "preview.json")
        except (ValueError, OSError):
            earlier = None
        if not isinstance(earlier, dict) or earlier.get("job") != args.job or not isinstance(earlier.get("boards"), dict):
            raise SystemExit(f"design-preview: refused -- --states-only reuses an earlier render, and {design_preview_shown(out)} "
                             "holds none of this job (run design-preview without it first)")
    browser = design_preview_browser(args.browser)
    if browser is None:  # an honest skip: a verdict, not an error, and never a claimed render
        print("preview=skipped reason=no-browser")
        print(f"hint: nothing was rendered or written; install Chrome or Chromium, or name one with --browser or ${DESIGN_PREVIEW_BROWSER_ENV}")
        return 0
    if not hasattr(os, "posix_spawn"):  # the DevTools pipe needs posix_spawn's fd mapping (macOS, Linux)
        print("preview=skipped reason=unsupported-platform")
        print("hint: nothing was rendered or written; design-preview drives the browser over a pipe that needs os.posix_spawn")
        return 0
    runtime_bytes = runtime.read_bytes()
    if b"DCLogic" not in runtime_bytes:
        print(f"warning: {runtime} does not look like the Design canvas runtime (no DCLogic in it)")
    if job["problems"]:
        print(f"warning: design-check finds {len(job['problems'])} problem(s) in this job (run: {WORKFLOW_CMD} design-check {args.job})")
    ds = project / "ds"
    if ds.is_dir() and not (ds / ".gitignore").exists():  # the system cache is never committed
        (ds / ".gitignore").write_text("*\n", encoding="utf-8")
        print(f"wrote {DESIGN_ROOT_SHOWN}/jobs/{args.job}/canvas/project/ds/.gitignore (the system cache stays out of git)")
    system = scan["manifest"]["system"]
    for rec in index.get("designSystems") or []:
        ns = rec.get("namespace") if isinstance(rec, dict) else None
        if not isinstance(ns, str) or not ns:
            continue
        if not (ds / ns).is_dir():
            print(f"warning: system {ns} not cached -- x-import components will not mount "
                  f"(the orchestrator saves the system's files under canvas/project/ds/{ns}/)")
        elif ns == system.get("namespace"):
            for name in system.get("files") or []:
                if not (ds / ns / name).is_file():
                    print(f"warning: system {ns} cache lacks {name}")
    if out == default_out.resolve() and not (reuse / ".gitignore").is_file():  # the renders are local only
        write_text(reuse / ".gitignore", "*\n")
    out.mkdir(parents=True, exist_ok=True)
    if earlier is None:
        try:
            earlier = read_json(out / "preview.json") if (args.board and (out / "preview.json").is_file()) else None
        except (ValueError, OSError):
            earlier = None
        if not (isinstance(earlier, dict) and earlier.get("job") == args.job and isinstance(earlier.get("boards"), dict)):
            earlier = None
    # A board rendered again drops its own old PNGs first (a state that is gone must not linger): only files
    # named as this command names them (<stem>.<view>[.state-NN].png, <stem>.sheet.png); --states-only
    # drops only the states and sheets.
    import glob
    shot_name = re.compile(r"\.(?:(?:frame|phone|w320|text200)(\.state-\d+)?|(sheet))\.png$")
    for stem in {rel[:-len(DESIGN_BOARD_SUFFIX)].replace("/", "__") for rel in (args.board or boards)}:
        for old in out.glob(f"{glob.escape(stem)}.*.png"):
            match = shot_name.fullmatch(old.name[len(stem):])
            if match and (not args.states_only or match.group(1) or match.group(2)):
                old.unlink()

    def reading(key):
        title = boards[key].get("title") if isinstance(boards[key], dict) else None
        match = DESIGN_TITLE_RE.match(title) if isinstance(title, str) else None
        return (design_number(match.group(1)) if match else 10 ** 6, key)

    print(f"runtime=real path={runtime}")
    misses: list = []
    report = {"schema": 1, "job": args.job, "round": current["id"] if current else None, "out": design_preview_shown(out),
              "runtime": str(runtime), "click": bool(args.click), "phone": bool(args.phone),
              "phone_click": bool(args.phone_click), "states_only": bool(args.states_only),
              "boards": {}, "links": [], "issues": [], "totals": {}, "sheets": {}}
    profile = tempfile.mkdtemp(prefix="design-preview-profile-")
    try:
        page = DesignBrowser(browser, profile)
    except (RuntimeError, OSError, ValueError, KeyError) as exc:
        shutil.rmtree(profile, ignore_errors=True)
        print(f"issue check=browser: the browser {browser} did not start under the DevTools pipe: {exc}")
        print(f"preview=failed pngs=0 failed=1 issues=1 states=0 out={out}")
        return 1
    server = design_preview_server(project, runtime_bytes, misses)
    try:
        page.call("Page.addScriptToEvaluateOnNewDocument", {"source": DESIGN_PREVIEW_LISTENERS_JS})
    except RuntimeError:
        pass  # the keyboard check then reads the on* properties and the pointer cursor only
    ctx = {"page": page, "out": out, "misses": misses, "base": f"http://127.0.0.1:{server.server_address[1]}",
           "boards": boards, "project": project, "report": report, "unmeasured": set(), "edges": {}, "states": 0}
    shots = issues = failed = 0
    rendered = []
    try:
        for rel in sorted(args.board or boards, key=reading):
            board = boards[rel]
            entry = board if isinstance(board, dict) else {}
            report["boards"][rel] = {"title": entry.get("title"), "page": entry.get("expand") == "fill",
                                     "interactive": entry.get("is_interactive") is True, "views": {}, "states": [],
                                     "click_errors": []}
            if args.states_only:  # the frame and phone views (and the WCAG views) of the earlier render are kept
                old_board = earlier["boards"].get(rel) or {}
                report["boards"][rel]["views"] = old_board.get("views") or {}
                for kept in ("keyboard",):
                    if kept in old_board:
                        report["boards"][rel][kept] = old_board[kept]
                report["boards"][rel]["interaction"] = [i for i in old_board.get("interaction", [])
                                                        if i.get("check") == "keyboard" or entry.get("is_interactive") is not True]
                for kept_view in report["boards"][rel]["views"].values():  # their boundaries are named already
                    for c in (kept_view.get("measured") or {}).get("ntc", []):
                        ctx.setdefault("ntc_named", {}).setdefault((c["part"], c["fg"], c["bg"]), rel)
            try:
                w, h = int(board["w"]), int(board["h"])
            except (KeyError, TypeError, ValueError):
                w = h = 0
            if not (1 <= w <= DESIGN_PREVIEW_MAX and 1 <= h <= DESIGN_PREVIEW_MAX):
                message = f"canvas.json gives no usable w/h (1..{DESIGN_PREVIEW_MAX}); not rendered"
                print(f"issue board={rel} check=size: {message}")
                report["issues"].append({"board": rel, "check": "size", "message": message})
                issues += 1
                continue
            rendered.append(rel)
            board = dict(board, w=w, h=h)
            views = ["frame"] + (["phone"] if board.get("expand") == "fill" or args.phone else [])
            for view in views:
                if args.states_only:  # reuse the earlier render of this view; only its states are taken again
                    found = 0 if report["boards"][rel]["views"].get(view, {}).get("png") else -1
                    if found < 0:
                        print(f"note board={rel} view={view}: no earlier render of this view to reuse (run without --states-only)")
                        continue
                else:
                    found = design_preview_view(ctx, rel, board, view)
                if found < 0:
                    failed += 1
                elif not args.states_only:
                    shots += 1
                    issues += found
                if found < 0 or not args.click:
                    continue
                phone_walk = view == "phone" and args.phone_click and board.get("expand") == "fill"
                if board.get("is_interactive") is True and (view == "frame" or phone_walk):
                    try:  # --click: the frame view always; --phone-click: a PAGE's phone view too
                        script = page.call("Page.addScriptToEvaluateOnNewDocument", {"source": DESIGN_PREVIEW_TIMERS_JS})
                        try:
                            issues += design_preview_explore(ctx, rel, board, view)
                        finally:  # the next render loads without the timer watch
                            page.call("Page.removeScriptToEvaluateOnNewDocument", {"identifier": script["identifier"]})
                    except (RuntimeError, OSError, ValueError, KeyError, TypeError) as exc:
                        print(f"issue board={rel} view={view} check=click: the click-through stopped: {exc}")
                        report["boards"][rel].setdefault("click", {}).setdefault(view, {})["stopped"] = str(exc)
                        issues += 1
                elif view == "frame" and board.get("expand") == "fill" and not args.states_only:  # a PAGE nobody clicks through still gets the hover pass
                    issues += design_preview_hover(ctx, rel, view, 0, set())
            if args.states_only:
                continue
            # v61 (P37.S6): the WCAG passes -- a PAGE's reflow and 200%-text views, an interactive board's keyboard pass.
            if board.get("expand") == "fill":
                for view in ("w320", "text200"):
                    found = design_preview_text_view(ctx, rel, view)
                    if found < 0:
                        failed += 1
                    else:
                        shots += 1
                        issues += found
            if board.get("is_interactive") is True:
                issues += design_preview_keyboard(ctx, rel, board)
        if args.contact_sheet:
            for rel in rendered:
                sheet = design_preview_sheet(ctx, rel)
                if sheet:
                    report["sheets"][rel] = sheet
    finally:
        page.close()
        server.shutdown()
        server.server_close()
        shutil.rmtree(profile, ignore_errors=True)
    for (part, fg, bg), more in ctx.get("ntc_more", {}).items():  # where a folded boundary is drawn again
        named = ", ".join(f"{r} ({el})" for r, el in list(more.items())[:3]) + (f" (+{len(more) - 3} more)" if len(more) > 3 else "")
        print(f"note: the non-text-contrast {part} {fg} on {bg} (first named on {ctx['ntc_named'][(part, fg, bg)]}) is also on "
              f"{len(more)} other board(s): {named}")
        report.setdefault("ntc_also", []).append({"part": part, "fg": fg, "bg": bg, "first": ctx["ntc_named"][(part, fg, bg)],
                                                 "boards": more})
    for rel in sorted(ctx["edges"]):
        for target, kind in sorted(ctx["edges"][rel].items()):
            report["links"].append({"from": rel, "to": target, "external": kind == "external"})
            if args.click:
                print(f"link from={rel} to={target}" + (" external" if kind == "external" else ""))
    if args.click:
        main = "Main" + DESIGN_BOARD_SUFFIX
        if args.board:
            print("note: the link graph covers only the boards rendered (--board), so no board is called unreachable")
        elif main in boards:
            reached, todo = {main}, [main]
            while todo:
                for target, kind in ctx["edges"].get(todo.pop(), {}).items():
                    if kind == "board" and target not in reached:
                        reached.add(target)
                        todo.append(target)
            for rel in rendered:
                if rel not in reached and report["boards"][rel]["page"]:
                    message = f"no chain of links from {main} reaches this page"
                    print(f"issue board={rel} check=unreachable: {message}")
                    report["issues"].append({"board": rel, "check": "unreachable", "message": message})
                    issues += 1
    seconds = round(time.monotonic() - started, 1)
    report["totals"] = {"pngs": shots, "failed": failed, "issues": issues, "states": ctx["states"], "seconds": seconds}
    if earlier is not None:  # a partial render (--board, --states-only) keeps the earlier render's other boards
        redone = set(report["boards"])
        report["boards"] = dict({k: v for k, v in earlier["boards"].items() if k not in redone and k in boards}, **report["boards"])
        report["issues"] = [i for i in earlier.get("issues", []) if i.get("board") not in redone] + report["issues"]
        report["links"] = [l for l in earlier.get("links", []) if l.get("from") not in redone] + report["links"]
        report["sheets"] = dict({k: v for k, v in (earlier.get("sheets") or {}).items() if k not in redone}, **report["sheets"])
        report["merged"] = sorted(set(report["boards"]) - redone)
    blocking = design_preview_blocking(report)
    report["self_check"] = {"result": "fail" if blocking else "pass", "blocking": blocking}
    (out / "preview.json").write_text(json.dumps(report, indent=1, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"preview={'failed' if failed and not shots else 'done'} pngs={shots} failed={failed} issues={issues} "
          f"states={ctx['states']} seconds={seconds:g} out={design_preview_shown(out)}")
    if report.get("merged"):
        print(f"note: preview.json keeps the earlier render of {len(report['merged'])} board(s) not rendered now")
    print(f"self_check={'fail' if blocking else 'pass'} blocking="
          + (",".join(f"{c}:{n}" for c, n in blocking.items()) or "none"))
    if failed:
        return 1
    return 1 if args.strict and blocking else 0


def design_migrate(args: argparse.Namespace) -> None:
    if args.to == "2":
        design_migrate_schema2(args)
        return
    design_migrate_pre_v47(args)


def design_migrate_schema2(args: argparse.Namespace) -> None:
    """Move a schema-1 (v47 card) record -- cards/, tokens.css, rounds/ with every snapshot under them
    -- into DESIGN_SCHEMA1_DIR, unchanged, then rewrite design.json to schema 2 (id and name kept, a
    null-filled system). Every check runs before the first move (a refusal moves nothing); a dry run
    unless --apply; all-or-nothing; never a delete, never git."""
    root = design_root()
    mpath = root / "design.json"
    rel = lambda p: Path(shown(p)).as_posix()
    if not mpath.is_file():
        raise SystemExit(f"design-migrate --to 2: refused -- no {DESIGN_ROOT_SHOWN}/design.json; nothing to migrate "
                         f"(a new design record starts on schema {DESIGN_SCHEMA} with design-init)")
    try:
        manifest = read_json(mpath)
    except (ValueError, OSError) as exc:
        raise SystemExit(f"design-migrate --to 2: refused -- design.json is not valid JSON ({exc}); fix it by hand")
    if design_is_schema(manifest, DESIGN_SCHEMA):
        print(f"design-migrate --to 2: design.json is already schema {DESIGN_SCHEMA}; nothing to migrate")
        return
    if not design_is_schema(manifest, 1):
        schema = manifest.get("schema") if isinstance(manifest, dict) else None
        raise SystemExit(f"design-migrate --to 2: refused -- design.json schema {schema!r} is not 1")
    target = root / DESIGN_SCHEMA1_DIR
    rounds_dir = root / "rounds"
    problems = []
    if design_legacy_record(root):
        problems.append(f"a pre-v47 record is still at the root; run {WORKFLOW_CMD} design-migrate (no --to) first, which moves it into {DESIGN_LEGACY_DIR}/")
    if os.path.lexists(target):
        problems.append(f"{rel(target)} already exists (a schema-1 record was migrated before; move it aside by hand)")
    opened = []
    for entry in sorted(rounds_dir.iterdir()) if rounds_dir.is_dir() else []:
        try:
            if (entry / "round.json").is_file() and read_json(entry / "round.json").get("status") == "open":
                opened.append(entry.name)
        except (ValueError, OSError, AttributeError):
            problems.append(f"{rel(entry / 'round.json')} is not readable JSON; fix it by hand")
    if opened:
        problems.append(f"schema-1 round(s) {', '.join(opened)} still open: close each with the engine it was opened on before "
                        f"updating, or, if abandoned, set its round.json status to \"superseded\" with a closed_at by hand")
    wanted = {"schema": DESIGN_SCHEMA, "id": manifest.get("id"), "name": manifest.get("name"), "system": design_null_system()}
    problems.extend(design_manifest_problems(wanted))
    if problems:
        raise SystemExit("design-migrate --to 2: refused -- nothing moved:\n" + "\n".join(f"- {p}" for p in problems))
    moves = [(root / name, target / name) for name in ("cards", "tokens.css", "rounds") if os.path.lexists(root / name)]
    keep = {"design.json", "cards", "tokens.css", "rounds", "jobs", DESIGN_LEGACY_DIR, DESIGN_SCHEMA1_DIR}
    stayed = [f"design-migrate --to 2: left in place {rel(e)} (not part of the schema-1 record; move it by hand if it belongs there)"
              for e in sorted(root.iterdir()) if e.name not in keep and not e.name.startswith(".")]
    if not args.apply:
        print("\n".join([f"design-migrate --to 2: would move {rel(src)} -> {rel(dst)}" for src, dst in moves]
                        + [f"design-migrate --to 2: would rewrite {rel(mpath)} to schema {DESIGN_SCHEMA} (id and name kept, system null)"]
                        + stayed + ["design-migrate --to 2: dry run -- nothing moved; re-run with --apply"]))
        return
    done, made = [], False
    try:
        if moves:
            target.mkdir()
            made = True
        for src, dst in moves:
            os.replace(src, dst)
            done.append((src, dst))
        write_json(mpath, wanted)
    except OSError as exc:  # all-or-nothing: put back what already moved, then drop the folder made here
        undo = []
        for src, dst in reversed(done):
            try:
                os.replace(dst, src)
            except OSError as again:
                undo.append(f"- could not move {rel(dst)} back to {rel(src)}: {again}")
        if made:
            try:
                target.rmdir()
            except OSError:
                pass
        raise SystemExit(f"design-migrate --to 2: failed -- {exc}; " + (
            "rolled back, nothing moved" if not undo else "rollback incomplete:\n" + "\n".join(undo)))
    for src, dst in moves:
        print(f"design-migrate --to 2: moved {rel(src)} -> {rel(dst)}")
    print(f"design-migrate --to 2: rewrote {rel(mpath)} to schema {DESIGN_SCHEMA}")
    if stayed:
        print("\n".join(stayed))
    print("commit the move yourself (git sees it as renames)")


def design_migrate_pre_v47(args: argparse.Namespace) -> None:
    """Move a pre-v47 design record into DESIGN_LEGACY_DIR, unchanged. With no design.json the whole
    root is the old record, so every top-level entry moves (dot-entries stay); with design.json the
    repo already uses the drafter, so only the old record's parts move -- rounds without round.json,
    the root SIGNOFF.md and grounding/. Every check runs before the first move (a refusal moves
    nothing); a dry run unless --apply; never a delete (only an empty rounds/ is rmdir'ed), never git."""
    root = design_root()
    if not root.is_dir():
        raise SystemExit(f"design-migrate: refused -- no design root at {DESIGN_ROOT_SHOWN}/; nothing to migrate")
    legacy = root / DESIGN_LEGACY_DIR
    rounds_dir = root / "rounds"
    rel = lambda p: Path(shown(p)).as_posix()
    moves, left, problems = [], [], []
    outside = "not part of either contract; move it by hand if it belongs to the old record"
    if not (root / "design.json").exists():
        mixed = [e.name for e in sorted(rounds_dir.iterdir()) if (e / "round.json").exists()] if rounds_dir.is_dir() else []
        if mixed:
            problems.append(f"{rel(rounds_dir)} holds schema-1 round(s) {', '.join(mixed)} (they carry a round.json) but there is "
                            f"no design.json; if this repo uses the drafter, restore it with design-init first")
        jobs_dir = root / "jobs"
        if jobs_dir.is_dir() and any((e / "job.json").exists() for e in jobs_dir.iterdir()):
            problems.append(f"{rel(jobs_dir)} holds schema-{DESIGN_SCHEMA} job(s) but there is no design.json; restore it with design-init first")
        for entry in sorted(root.iterdir()):
            if entry.name in (DESIGN_LEGACY_DIR, DESIGN_SCHEMA1_DIR):
                continue
            if entry.name.startswith("."):
                left.append((entry, "a dot-entry"))
                continue
            moves.append((entry, legacy / entry.name))
    else:
        left.extend((e, outside) for e in (sorted(rounds_dir.iterdir()) if rounds_dir.is_dir() else [])
                    if not e.name.startswith(".") and not e.is_dir())
        moves.extend((part, legacy / part.relative_to(root)) for part in design_legacy_record(root))
        if moves and (root / "tokens.css").is_file():  # schema 1's own file: kept, but said out loud
            left.append((root / "tokens.css", "kept as schema 1's tokens.css (design-migrate --to 2 moves it into schema1/); "
                                              "if it belongs to the old record, move it into claude-design/ by hand"))
        contract = {"design.json", "cards", "tokens.css", "rounds", "jobs", DESIGN_LEGACY_DIR, DESIGN_SCHEMA1_DIR,
                    "SIGNOFF.md", "grounding"}
        left.extend((e, outside) for e in sorted(root.iterdir()) if e.name not in contract and not e.name.startswith("."))
    folders = [legacy] + ([legacy / "rounds"] if any(dst.parent == legacy / "rounds" for _, dst in moves) else [])
    for folder in folders:
        if os.path.lexists(folder) and not folder.is_dir():
            problems.append(f"{rel(folder)} exists and is not a folder")
    started = ("; a claude-design round was started first -- move each legacy round into claude-design/rounds/ by hand, "
               "renumbering after the existing ones, remove the emptied rounds/, then re-run")
    problems.extend(f"{rel(dst)} already exists" + (started if dst == legacy / "rounds" else "")
                    for _, dst in moves if os.path.lexists(dst))
    if problems:
        raise SystemExit("design-migrate: refused -- nothing moved:\n" + "\n".join(f"- {p}" for p in problems))
    stayed = [f"design-migrate: left in place {rel(path)} ({why})" for path, why in left]
    if not moves:
        print("\n".join(stayed + ["design-migrate: nothing to migrate"]))
        return
    if not args.apply:
        print("\n".join([f"design-migrate: would move {rel(src)} -> {rel(dst)}" for src, dst in moves] + stayed
                        + ["design-migrate: dry run -- nothing moved; re-run with --apply"]))
        return
    created, done = [], []
    try:
        for src, dst in moves:
            for folder in folders:
                if folder in dst.parents and not folder.is_dir():
                    folder.mkdir()
                    created.append(folder)
            os.replace(src, dst)
            done.append((src, dst))
    except OSError as exc:  # all-or-nothing: put back what already moved, then drop only the folders made here
        undo = []
        for src, dst in reversed(done):
            try:
                os.replace(dst, src)
            except OSError as again:
                undo.append(f"- could not move {rel(dst)} back to {rel(src)}: {again}")
        for folder in reversed(created):
            try:
                folder.rmdir()
            except OSError:
                pass
        raise SystemExit(f"design-migrate: failed -- {exc}; " + (
            "rolled back, nothing moved" if not undo else "rollback incomplete:\n" + "\n".join(undo)))
    for src, dst in moves:
        print(f"design-migrate: moved {rel(src)} -> {rel(dst)}")
    if any(src.parent == rounds_dir for src, _ in moves) and rounds_dir.is_dir():
        try:
            rounds_dir.rmdir()  # only ever succeeds on a truly empty folder
            print(f"design-migrate: removed the now-empty {rel(rounds_dir)}/")
        except OSError:
            pass
    if stayed:
        print("\n".join(stayed))
    print("commit the move yourself (git sees it as renames)"
          + ("" if (root / "design.json").exists() else "; run design-init only if this repo will use the drafter"))


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(description="Manage the agentic workflow state.")
    sub = parser.add_subparsers(dest="cmd", required=True)

    p = sub.add_parser("rebuild", help="Rebuild workflow dashboards/index/state and docs snapshots")
    p.set_defaults(func=lambda args: (rebuild_docs(), rebuild_index_and_state(), print("rebuilt workflow and docs")))

    p = sub.add_parser("rebuild-docs", help="Regenerate docs/current/*.md from docs/index.json latest versions")
    p.set_defaults(func=lambda args: (rebuild_docs(), print("rebuilt docs/current from latest versions")))

    p = sub.add_parser("docs", help="Print latest doc versions")
    p.set_defaults(func=cmd_docs)

    p = sub.add_parser("doc-new-version", help="Create a new durable doc version from the latest version")
    p.add_argument("--doc", required=True, help=f"one of {', '.join(sorted(DOC_TYPES))} (a retired doc is refused and names its successor)")
    p.add_argument("--summary", required=True)
    p.add_argument("--source", required=True)
    p.set_defaults(func=new_doc_version)

    p = sub.add_parser("validate", help="Validate workflow and docs structure")
    p.set_defaults(func=lambda args: sys.exit(validate()))

    p = sub.add_parser("sync-agents", help="Write the route table's rows (engine defaults overlaid by the repo-root executors.toml) into the model/effort frontmatter of the four managed agent files: slice-executor (the mid row; high and research run it with their model and effort passed per dispatch), design-drafter (its own design row), design-critic (the critic row; the judge row runs it with its model passed per call) and Explore (the explore row)")
    p.add_argument("--check", action="store_true", help="Report drift without writing; exit 1 if out of sync")
    p.set_defaults(func=sync_agents)

    p = sub.add_parser("executor-route", help="Print the executor routing decision, one key=value per line, writing nothing: bare, the resolved route table (high, research, design, critic, judge, mid, explore), the agent files' sync state and an override= line per row executors.toml sets (its value against the default); with a slice id, the route, subagent_type (slice-executor for every slice row), model, effort and attribution its dispatch uses (kind first, then risk, then attempt); --drafter / --critic / --judge / --explore, a non-slice agent's dispatch; plus fallback=, skip= and warning= lines for the environment. The critic and the judge may share the design row's model (v75)")
    p.add_argument("slice", nargs="?", help="the slice to route; omit for the table")
    p.add_argument("--retry", action="store_true", help="the slice's second attempt (an escalation, a failed or empty return, a fix of mid-row work): always the high row")
    p.add_argument("--drafter", action="store_true", help="the design-drafter's dispatch (its own design row, [claude.design]; not a slice route)")
    p.add_argument("--critic", action="store_true", help="the design-critic's dispatch in critic mode (the critic row, [claude.critic]); it may share the drafter's model")
    p.add_argument("--judge", action="store_true", help="the design-critic's dispatch in judge mode (the judge row, [claude.judge], alias only); never refused for sharing the drafter's model; skip=yes only when the judge row is overridden to Fable behind a loopback proxy that serves no Fable")
    p.add_argument("--explore", action="store_true", help="the read-only Explore lookup agent's dispatch (the explore row)")
    p.set_defaults(func=cmd_executor_route)

    p = sub.add_parser("record-dispatch", help="Append one executor_dispatched record to works/events.jsonl: the verdict a slice dispatch returned (slice, phase, kind, risk, attempt, verdict, note). What it ran on and cost is metered from the transcripts by dispatch-summary; the pre-v61 flags (--route --model --effort --tier --agent --duration-ms --tokens --tool-uses) still parse and are ignored; writes nothing else")
    p.add_argument("slice", help="the slice that was dispatched")
    p.add_argument("--verdict", required=True, choices=_DISPATCH_VERDICTS, help="how the executor returned; failed = an empty or failed return")
    p.add_argument("--attempt", type=int, default=1, help="1 for the first dispatch, 2 for the retry (default 1)")
    p.add_argument("--note", help="free text")
    for flag, dest in _RECORD_DISPATCH_RETIRED:
        p.add_argument(flag, dest=dest, help=argparse.SUPPRESS)
    p.set_defaults(func=cmd_record_dispatch)

    p = sub.add_parser("dispatch-summary", help="Read-only: what a phase really cost -- the main thread beside its subagent spans per slice and per phase (requests, context, output, list-price $, minutes, limit hits, verdicts) metered from Claude Code's transcripts, the means a DECOMP estimates time from, then the recorded verdicts; no transcripts found prints one line and the recorded tables")
    p.add_argument("--phase", help="one phase (a brief id: 46, P46 or 46-k2; P12; 7kq2 or P-7kq2): its slices, read from the sessions overlapping its slice windows")
    p.add_argument("--slice", help="one slice: its metered rows and its recorded attempts, one per line")
    p.add_argument("--json", action="store_true", help="print everything as one JSON object")
    p.add_argument("--transcripts", action="append", metavar="DIR", help="read this projects/<slug> directory instead of discovering the session root's (repeatable)")
    p.set_defaults(func=cmd_dispatch_summary)

    p = sub.add_parser("next", help="Print the current phase/slice selection (plus explain_unit=<document|book|chapter> on an explain phase, and on the default stream merge_ready=<P>:<branch> for a parallel phase done with a passing review on its branch but not merged yet); when the phase's notebook is over 40,960 B, also notebook_over_budget= with up to 3 notebook_move= commands to run before the next dispatch (required form), or none when nothing can move (advisory form)")
    p.add_argument("--card", action="store_true", help="print the resume card instead: the pointer, the next action or the typed stop, the open gates, the running spans (from the newest session's subagents/*.meta.json) and the slice's file paths, computed from state, at most 2,048 bytes -- what compact-resume prints after a compaction")
    p.set_defaults(func=cmd_next)

    run_help = "Read-only, writes nothing: the phase list and the next target of a /do-whole-phases run, recomputed from disk on every call (re-run it at each phase boundary and after a compaction). Prints run=, stream=, queue= (this stream's non-done phases of the run, in order), skipped=<P> reason=done | done (archived) | other-stream stream=<branch or default>, parked=<P> (pending, its acceptance gate open, no slice pending or blocked: the run passes it), then target_phase= / target_slice= / slice_path= / next_slice= (plus notebook_over_budget= / notebook_move= when the target phase's notebook is over 40,960 B: run the moves before the dispatch; plus gate_cleared= when a cleared gate's review awaits its recorded pass), or halt=<item> status= with stop_kind= / on_words= for a pending slice and halt_reason= (any other pending or blocked phase, or a pending or blocked current slice: the whole run stops), or run_done=yes. Phase tokens are brief ids: 46 / P46 (numbered: the one P46, else the one P46-<tail>; 46-k2 names the tail), P12, or 7kq2 / P-7kq2 (a v73 id), any case. Exits 2 with refused= lines and nothing else for a token that is not a phase id, names no phase, or is a number two tailed phases share (refused=46 -- names P46-k2, P46-x4: type the tail). The plain pointer (next, works/state.json, the resume card's stop) is unchanged and still halts at a parked phase"
    p = sub.add_parser("run-phases", help=run_help, description=run_help)
    p.add_argument("tokens", nargs="*", metavar="PHASE", help="a phase id in any brief form: 46 or P46 (numbered; 46-k2 when two phases share the number), P12, or 7kq2 or P-7kq2 (a v73 id), any case, separated by commas and/or spaces; the given order is kept and duplicates are dropped; none = every non-done phase on this stream, by order. Ranges, mode words, `worktree` and a minted id without its dash (P7kq2) are refused")
    p.set_defaults(func=cmd_run_phases)

    p = sub.add_parser("compact-resume", help="The SessionStart hook (matcher compact): after a compaction, print compaction=done source=compact and the resume card (next --card; the running spans from the hook's transcript_path session), falling back to the plain pointer on any error; never fails, always exits 0")
    p.set_defaults(func=cmd_compact_resume)

    p = sub.add_parser("deferred", help="Rebuild and print deferred jobs dashboard summary")
    p.set_defaults(func=cmd_deferred)

    p = sub.add_parser("new-phase", help="Create a new phase with DECOMP and REVIEW slices")
    p.add_argument("--phase", help="the phase id; omit it and the engine mints one (P46-k2: the next number and a random tail), printed on the created line. "
                   "Given, any shape (P46-k2, P12 or P-7kq2; 46-k2, 12 and 7kq2 are read as those); refused when it exists active or archived")
    p.add_argument("--name", required=True)
    p.add_argument("--objective", required=True)
    p.add_argument("--order", type=float, help="sort position among phases; a fractional value (e.g. 4.5) inserts between two neighbors without renumbering")
    p.add_argument("--on-main", action="store_true", dest="on_main",
                   help="no-op since v43 (the default stream is the default); accepted so v42 habits and scripts keep working")
    p.add_argument("--consolidates", metavar="P26,P27",
                   help="docs phase: the comma-separated ids (any brief form: P26, 26, 46-k2, P-7kq2, 7kq2) of active phases whose doc consolidation debt this phase pays; refused (nothing written) for an id that is not an active phase owing consolidation. Stored as `consolidates` in phase.json -- the only docs-phase marker; `docs-debt` shows it as 'paid by' and `rotate-backlog` proposes no second docs phase for what it covers")
    p.set_defaults(func=new_phase)

    p = sub.add_parser("new-slice", help="Create a new slice folder with slice.json + markdown files")
    p.add_argument("--phase", required=True, help=PHASE_ARG_HELP)
    p.add_argument("--slice", required=True, help="the slice id (P46-k2.S1, or 46.S1 while one phase is numbered 46), or its bare suffix (S1)")
    p.add_argument("--name", required=True)
    p.add_argument("--kind", default="implementation", help="one of implementation, review, decomposition, research, fix, docs, qa, co-work (closed set; unknown kinds are rejected). research is findings-only: no product code, findings land in phase.md, and it always routes to the research row")
    p.add_argument("--risk", default="high", help="low (the mid row for implementation, fix, docs and qa -- the default since v46, real code included) or high (the high row: only for a named trigger -- open design, a core invariant, an unlocated root cause, a wide blast radius -- or a fix to mid-row work); unset or unrecognized values route to high; kind decomposition, review, co-work and research route by kind whatever this says; `executor-route <slice>` prints the decision")
    p.add_argument("--order", type=float, help="sort position within the phase; a fractional value (e.g. 4.5) inserts between two neighbors without renumbering (default: 10 past the last non-review slice)")
    p.add_argument("--depends-on", action="append", metavar="ID|none", help=DEPENDS_ON_HELP)
    p.set_defaults(func=new_slice)

    p = sub.add_parser("start-slice", help="Mark a slice in_progress")
    p.add_argument("slice")
    p.set_defaults(func=start_slice)

    p = sub.add_parser("finish-slice", help="Mark a slice done")
    p.add_argument("slice")
    p.add_argument("--outcome", help="one line recorded in slice.json and rendered in the phase's generated ## Slices table")
    p.set_defaults(func=finish_slice)

    p = sub.add_parser("set-slice-deps", help="Declare an existing slice's dependencies (v77), under new-slice --depends-on's rules: a decomposition cannot finish while a middle slice it leaves open is undeclared")
    p.add_argument("slice")
    p.add_argument("--depends-on", action="append", required=True, metavar="ID|none", help=DEPENDS_ON_HELP)
    p.set_defaults(func=set_slice_deps)

    p = sub.add_parser("parallel-plan", help="Print the rounds a phase's open slices run in, as the engine determines them from the declarations (v77), and any middle slice still undeclared; read-only")
    p.add_argument("phase", help=PHASE_ARG_HELP)
    p.set_defaults(func=cmd_parallel_plan)

    p = sub.add_parser("set-slice-status", help="Set any valid slice status; a pending stop is typed with --stop-kind and --on-words (stored in slice.json as pending: {kind, on_words, since}, printed by next and the resume card, cleared when the slice leaves pending)")
    p.add_argument("slice")
    p.add_argument("status")
    p.add_argument("--stop-kind", dest="stop_kind", choices=SLICE_STOP_KINDS,
                   help="pending only: what kind of stop this is -- " + "; ".join(f"{k} = {v}" for k, v in SLICE_STOP_KINDS.items()))
    p.add_argument("--on-words", dest="on_words", help="pending only: what the operator's words on return will do (one line)")
    p.set_defaults(func=cmd_set_slice_status)

    p = sub.add_parser("set-phase-status", help="Set any valid phase status")
    p.add_argument("phase", help=PHASE_ARG_HELP)
    p.add_argument("status")
    p.set_defaults(func=set_phase_status)

    p = sub.add_parser("review-phase", help="Record a phase review verdict (pass/changes_requested/blocked); a pass stamps doc consolidation pending when '## Doc impact' has notes, and settles a worktree phase's to done when it has none")
    p.add_argument("phase", help=PHASE_ARG_HELP)
    p.add_argument("--verdict", required=True, choices=sorted(REVIEW_VERDICTS))
    p.add_argument("--reviewer", default=None)
    p.add_argument("--note", default=None)
    p.set_defaults(func=review_phase)

    p = sub.add_parser("accept-gate", help="Operator acceptance gate for a phase: declare (--require/--waive), open it at the review (--open), clear it (--clear), or show it (bare). Orchestrator/operator command -- executors never run it")
    p.add_argument("phase", help=PHASE_ARG_HELP)
    g = p.add_mutually_exclusive_group()
    g.add_argument("--require", action="store_true", help="declare the phase operator-visible: review-phase --verdict pass refuses until the gate is opened and cleared (creates the gate block on a legacy phase). No status change")
    g.add_argument("--waive", action="store_true", help="declare the phase NOT operator-visible; --note is mandatory and records why")
    g.add_argument("--open", action="store_true", dest="open_gate", help="open the gate at the review: record --walkthrough, set the phase pending, print the operator instructions (needs --require first)")
    g.add_argument("--clear", action="store_true", help="the operator walked the product: stamp cleared_at, return the phase to in_progress")
    p.add_argument("--walkthrough", default=None, help="the concrete script the operator runs (URLs to open, actions to try, in the operator runtime); use with --open")
    p.add_argument("--note", default=None, help="mandatory reason with --waive; optional record of what the operator reported with --clear")
    p.set_defaults(func=accept_gate)

    p = sub.add_parser("docs-debt", help="Read-only worklist for a docs phase: which phases owe durable-doc consolidation, their '## Doc impact' notes, the docs they touch and the paying commands")
    p.set_defaults(func=docs_debt)

    p = sub.add_parser("docs-consolidated", help="Record that a phase's deferred durable-doc consolidation landed (run after a docs phase creates the versions; also unblocks archiving)")
    p.add_argument("phase", help=PHASE_ARG_HELP)
    p.set_defaults(func=docs_consolidated)

    p = sub.add_parser("parallel-start", help="Ask for a worktree: move a planned phase out of the default stream into its own -- stamp it, commit the stamp (phase folder + works/ files only; a dirty tree is fine), cut phase/P<N>-<slug> and .claude/worktrees/P<N>-<slug>")
    p.add_argument("phase", help=PHASE_ARG_HELP)
    p.add_argument("--worktree", default=None, help="worktree path (default: <repo>/.claude/worktrees/P<N>-<slug>, which EnterWorktree can enter in the same session; elsewhere means opening a second session there)")
    p.add_argument("--slug", default=None, help="branch slug override (default: slugified phase name); branch is phase/<phase>-<slug>")
    p.add_argument("--host-branch", default=None, help="nested install only, and required there except for an explain phase (## Explain in intent.md), whose host worktree is then cut detached at the host base with no host branch (v86: an explain makes no host commit; --repo still needs it): the host repo's branch for this phase's product commits, named by the host's convention (no workspace IDs); reused when it exists and no host worktree has it checked out. In nested the pair is <host>/.claude/worktrees/P<N>-<slug> on this branch, with the nested worktree inside it (--worktree overrides the host worktree's path)")
    p.add_argument("--host-base", default=None, help="nested install only: the host ref the host branch starts from (default: origin/HEAD, else init.defaultBranch if it exists locally, else main, then master; never fetched)")
    p.add_argument("--repo", action="append", default=None, metavar="NAME=BRANCH", help="multi-repo host only, repeatable: also cut a worktree for registered repo NAME at <host worktree>/<its path> on BRANCH (required, named by that repo's convention: nested-convention --repo NAME); reused when it exists and is checked out nowhere. A registered repo not named here is not in this set: inside it, phase-scope skips it")
    p.add_argument("--repo-base", action="append", default=None, dest="repo_base", metavar="NAME=REF", help="multi-repo host only, repeatable: the ref repo NAME's branch starts from (default: its registry default_branch as a local branch; never fetched); NAME must also be given with --repo")
    p.set_defaults(func=parallel_start)

    p = sub.add_parser("parallel-add-repo", help="Multi-repo host only, run INSIDE a phase's worktree set: add one registered repo mid-phase -- cut its worktree at <host worktree>/<its path> on BRANCH, or with --adopt stamp the worktree of it already there -- and commit the stamp on the phase branch")
    p.add_argument("phase", help=PHASE_ARG_HELP)
    p.add_argument("--repo", required=True, metavar="NAME=BRANCH", help="the registered repo (in this set's registry) and its branch, named by that repo's convention (nested-convention --repo NAME); without --adopt, reused when it exists and is checked out nowhere")
    p.add_argument("--repo-base", default=None, dest="repo_base", metavar="REF", help="the ref the branch starts from (default: the registry default_branch as a local branch; never fetched); with --adopt, what its anchor is the merge-base with")
    p.add_argument("--adopt", action="store_true", help="stamp the existing worktree of NAME at <host worktree>/<its path> (registered in that repo, HEAD on BRANCH) instead of cutting one; its branch stays the operator's (branch_created=false), so teardown keeps it")
    p.set_defaults(func=parallel_add_repo)

    p = sub.add_parser("parallel-skip", help="No-op since v43 (the default stream is the default, so there is nothing to pin): reports where the phase runs and writes nothing")
    p.add_argument("phase", help=PHASE_ARG_HELP)
    p.set_defaults(func=parallel_skip)

    p = sub.add_parser("parallel-status", help="Read-only cross-stream view: this checkout's pointer plus every parallel phase's branch-side slice state (never writes anything)")
    p.set_defaults(func=parallel_status)

    p = sub.add_parser("parallel-gate", help="Quiet-point gate: is this parallel phase's branch mergeable now (branch done+pass, default stream quiet -- or, v86, exemption=phase-folder-only: its diff since the merge-base touches only its phase folder, the generated works/ files and added works/deferred/open/ paths)? Exit 0 = open")
    p.add_argument("phase", help=PHASE_ARG_HELP)
    p.add_argument("--branch-ref", default=None, help="git ref holding the phase branch's state (default: the phase's stamped execution.branch; e.g. HEAD or origin/phase/P2-x in CI)")
    p.add_argument("--main-ref", default=None, help="git ref holding the default stream's state (default: this working tree; e.g. origin/main when running from a PR checkout)")
    p.set_defaults(func=parallel_gate)

    p = sub.add_parser("parallel-merge-finish", help="Run on the default stream right after merging a phase branch: regenerate the generated files and list phases awaiting doc consolidation")
    p.set_defaults(func=parallel_merge_finish)

    p = sub.add_parser("parallel-consolidated", help="Mark a merged parallel phase's deferred doc consolidation done (run on the default stream, after the doc versions land)")
    p.add_argument("phase", help=PHASE_ARG_HELP)
    p.set_defaults(func=parallel_consolidated)

    p = sub.add_parser("parallel-teardown", help="Retire a merged parallel phase's worktree and branch; run from the default stream")
    p.add_argument("phase", help=PHASE_ARG_HELP)
    p.add_argument("--discard-ignored", action="store_true", help="nested install only: delete the ignored, worktree-only files the paired teardown lists (it refuses without this flag)")
    p.set_defaults(func=parallel_teardown)

    p = sub.add_parser("nested-convention", help="Nested personal install only: show the host repo's conventions for commits, branches and pull requests (bare), or record the operator's confirmation of them -- the text and whether Claude Co-Authored-By trailers are allowed in host commits (--confirm --text ... --trailers allowed|forbidden); refuses outside a nested install")
    p.add_argument("--confirm", action="store_true", help="record the operator-confirmed conventions (needs --text and --trailers)")
    p.add_argument("--text", default=None, help="the host's conventions as the operator confirmed them: commit subjects and trailers; branch naming and base (e.g. from fresh main); PR shape (one per ticket or per phase) and who merges")
    p.add_argument("--trailers", default=None, choices=("allowed", "forbidden"), help="may Claude Co-Authored-By trailers appear in host product commits")
    p.add_argument("--repo", default=None, metavar="NAME", help="multi-repo host only: show one registered repo's effective conventions (the host-level ones, the rules for every repo, composed with its own), or with --confirm record its own; without --repo, --confirm records the host-level ones")
    p.add_argument("--inherit", action="store_true", help="with --repo: set that repo's own conventions back to null, so it inherits the host-level ones")
    p.set_defaults(func=cmd_nested_convention)

    p = sub.add_parser("nested-repos", help="Nested personal install only: show the multi-repo host's registry of product repos (bare: name, path, the branch checked out now, default branch, convention state, rules count), or edit it -- --add <path>, --remove <name>, --rules <name> --set a,b,c, --detect-rules <name>; writes only .agentic-nested.json; --add on a single-repo install only when the host tracks no files; refuses outside a nested install")
    action = p.add_mutually_exclusive_group()
    action.add_argument("--add", default=None, metavar="PATH", help="register the git repo whose work tree root is PATH (relative to the host root), under the host; its rules files are detected and its convention inherits the host's")
    action.add_argument("--remove", default=None, metavar="NAME", help="drop a repo from the registry (its files are untouched); refused while an active phase holds repo_anchors.NAME")
    action.add_argument("--rules", default=None, metavar="NAME", help="set a repo's rules files by hand (needs --set)")
    action.add_argument("--detect-rules", default=None, metavar="NAME", dest="detect_rules", help="re-detect a repo's rules files: every tracked AGENTS.md / CLAUDE.md, plus .agents/skills/*/SKILL.md")
    action.add_argument("--map-anchors", default=None, metavar="NAME", dest="map_anchors", help="converted install: move every phase's host_anchors (shas that are commits of repo NAME) to repo_anchors.NAME, active and archived phases alike; skips phases in flight on their own branch; writes phase.json files only")
    p.add_argument("--set", default=None, metavar="A,B,C", help="with --rules: the comma-separated repo-relative paths of the repo's own rules files (empty clears them)")
    p.add_argument("--name", default=None, help="with --add: the repo's name in the registry (default: the path's last segment; [A-Za-z0-9._-]+)")
    p.add_argument("--default-branch", default=None, dest="default_branch", help="with --add: the repo's integration branch (default: its origin/HEAD target, else none)")
    p.set_defaults(func=cmd_nested_repos)

    p = sub.add_parser("phase-scope", help="Read-only: the phase's boundary from git -- creation commit, base..head range and the product files it changed (works/ and docs/ excluded); advisory, exit 0 without git")
    p.add_argument("phase", help=PHASE_ARG_HELP)
    p.add_argument("--base", default=None, help="use this ref as the range base verbatim (skips creation-commit / merge-base detection)")
    p.add_argument("--head", default=None, help="use this ref as the range head (default: HEAD, or the commit that recorded a passing review on a done phase)")
    p.add_argument("--json", action="store_true", help="print the same answer as one JSON object")
    p.add_argument("--repo", action="append", default=None, metavar="NAME", help="multi-repo host only: measure only this registered repo (repeatable); with exactly one --repo, --base/--head set that repo's range instead of the host's")
    p.set_defaults(func=phase_scope)

    p = sub.add_parser("phase-section", help="Read or write ONE `## ` section of a phase's phase.md, or one entry of it: no name = the index (a line per heading with its bytes; with its budget and over/long flags, then the move commands, when a section is over its budget or holds long entries), a name prints that section (paged: --page N), --list its entries, --entry K one entry; --replace / --append write one section (stdin or --file), --entry K --replace / --remove write one entry, --resolve OQ<n> --pointer <ref> collapses an Operator Questions entry, --to-topic <slug> moves entries verbatim to topics/<slug>.md behind one gist line each, --topic <slug> reads that file; every other byte of the notebook stays identical",
                       description="phase.md is an index: read one section or one entry, write one section or one entry, never the whole file. Put the section name BEFORE the flags: phase-section P1 Now --replace --file now.md. Names match case-insensitively (Now, Decisions, 'Doc impact', 'Operator Questions', 'Notes for later slices', Objective, Slices). Slices is generated and refused; Doc impact and Operator Questions are append-only (--append, or --resolve to collapse an answered entry). "
                                   "Entries are a section's column-0 list items (- , * , + , 1. , 1) ) with their continuation and nested lines: --list numbers them (position, own label, bytes, flags long/nested/pointer, lead), and --entry K names one by position, OQ<n> or a unique case-insensitive piece of its first line. --entry K --replace swaps that entry alone (text without a marker keeps the old one); --entry K --remove deletes a consumed one (Notes for later slices, Now, Objective, custom sections; a superseded decision is replaced, never removed). "
                                   "--to-topic <slug> [--entry K] [--gist TEXT] [--dry-run] moves the section's entries (or K's, where ranges and lists like 1-8,10 work) to topics/<slug>.md: each is appended there as a `## <Section> <label>` block byte for byte and verified, then replaced in phase.md by one pointer line, `<marker><gist> → [topics/<slug>.md](topics/<slug>.md) § <block>`, its gist a verbatim excerpt of at most 160 characters; Decisions, Notes for later slices, Objective and custom sections only, never the slug breakdown, and a gist under 24 characters of plain text (a bare link) is refused. --topic <slug> [<block>] reads a topic: its index of blocks with bytes, or one block. "
                                   "Budgets: the index prints each section's bytes; when one is over its budget (Decisions 12 KB, Operator Questions 8 KB, Notes for later slices 6 KB, Now 2 KB, Objective 2 KB, any other 6 KB; none for Slices and Doc impact, which still count to the 40 KB total) or holds long entries (over 512 B or nested, named in movable sections only), every line shows bytes, budget, flags (over, long:N) and the heading last, then the total, then one `move: phase-section <P> \"<Section>\" --to-topic <slug> --entry <ranges>` per section. "
                                   "Paging: a section or topic block over 24 KB prints page 1 of it; --page N prints page N. Pages break only between entries (an entry bigger than a page gets its own page) and open with `<!-- page i of n · <Section> · entries a–b of m · next: ... --page i+1 -->` (`last page` on the last); drop those header lines, concatenate the pages, and you have the section byte for byte.")
    p.add_argument("phase", help=PHASE_ARG_HELP)
    p.add_argument("name", nargs="*", help="section heading (quote it when it has spaces); omit for the index")
    p.add_argument("--replace", action="store_true", help="replace the section's body (the heading and the rest of the file are kept byte-identical)")
    p.add_argument("--append", action="store_true", help="add text at the end of the section")
    p.add_argument("--resolve", metavar="OQ<n>", help="collapse that Operator Questions entry to one line (entries are never deleted)")
    p.add_argument("--pointer", help="with --resolve: where the answer landed (a Decisions line, a deferred job, a slice)")
    p.add_argument("--file", help="read the new text from this file (default: stdin)")
    p.add_argument("--list", action="store_true", help="with a section name: one line per entry (position, own label, bytes, flags long/nested/pointer, its lead cut at 80 characters)")
    p.add_argument("--entry", metavar="K", help="one entry of the section: its position (1-based), OQ<n>, or a unique case-insensitive piece of its first line; alone it prints that entry, with --replace / --remove it writes only it, with --to-topic it may also be ranges and lists (1-8,10)")
    p.add_argument("--remove", action="store_true", help="with --entry K: delete that entry and its trailing blank lines (Notes for later slices, Now, Objective, custom sections; refused in Decisions, Doc impact, Operator Questions and Slices)")
    p.add_argument("--to-topic", metavar="SLUG", dest="to_topic", help="move the section's entries (or --entry K's) verbatim to topics/SLUG.md, verify them there, then leave one pointer line each carrying a verbatim gist; Decisions, Notes for later slices, Objective and custom sections; the slug breakdown is refused")
    p.add_argument("--gist", help="with --to-topic and exactly one entry: the pointer line's gist (default: derived, a verbatim excerpt of at most 160 characters)")
    p.add_argument("--dry-run", action="store_true", dest="dry_run", help="with --to-topic: print the pointer lines and the bytes saved, and write nothing")
    p.add_argument("--topic", metavar="SLUG", help="read topics/SLUG.md beside phase.md instead: no name prints its index (its ## blocks with bytes), a name prints that block (paged like a section)")
    p.add_argument("--page", type=int, metavar="N", help=f"with a section or topic block name: print page N of it ({PAGE_BYTES // 1024} KB pages that break only between entries, each opening with a `<!-- page i of n ... -->` header); a plain read over {PAGE_BYTES // 1024} KB prints page 1; refused with any write flag, --list or --entry")
    p.set_defaults(func=phase_section)

    # The design contract, schema 2 (v60): the on-disk layout lives in design-cowork/reference/record.md "The design record".
    p = sub.add_parser("design-init", help=f"Write the design project manifest {DESIGN_ROOT_REL}/design.json (schema {DESIGN_SCHEMA}: id, name, a null-filled system); idempotent -- an unchanged manifest is not rewritten; a schema-1 manifest is refused (design-migrate --to 2)",
                       description=f"Create or update {DESIGN_ROOT_REL}/design.json, the one design project this repo holds. Defaults: id = the repo folder's name, slugified; name = the folder's name. The system record stays as it is (design-system sets it).")
    p.add_argument("--id", default=None, help="the project id: lowercase [a-z0-9-], starting alphanumeric, at most 63 characters")
    p.add_argument("--name", default=None, help="the project display name")
    p.set_defaults(func=design_init)

    p = sub.add_parser("design-system", help=f"Record the product's Design System Artifact in {DESIGN_ROOT_REL}/design.json (system: artifact, namespace, version, source, files); the orchestrator runs it after each system sync; idempotent",
                       description="--artifact is the system's address (https://claude.ai/artifact/<id> or /code/artifact/<id>, on claude.ai or claude.com, preview. allowed, nothing after the id). --namespace is the folder a canvas installs it under, project/ds/<namespace>/ ([a-z0-9][a-z0-9_-]{0,63}). --files names the system files a canvas installs, relative to the system's project/ (e.g. tokens.json,tokens.css,components/bundle.js,components/bundle.css); omitted, the recorded list is kept.")
    p.add_argument("--artifact", required=True, help="the Design System Artifact's address")
    p.add_argument("--namespace", required=True, help="the install folder under a canvas's project/ds/")
    p.add_argument("--version", required=True, help="the system version id the repo is synced to")
    p.add_argument("--source", default=None, help="where the system came from (e.g. the code path it was synced from)")
    p.add_argument("--files", default=None, help="comma-separated system files a canvas installs (replaces the recorded list)")
    p.set_defaults(func=design_system)

    p = sub.add_parser("design-open", help=f"Open the next design round of a job in a co-work slice: {DESIGN_ROOT_REL}/jobs/NN-<slug>/ (job.json, created on the slice's first round, or by --new-job for another job of the slice) and jobs/<job>/rounds/NN-<slug>/round.json, status open, with its critique level; refuses only while the target job has an open round",
                       description=f"A co-work slice holds one job or several (a wave, about 3-4, drafted in parallel), each with at most one open round; rounds of different jobs may be open at once. The target: with neither flag, the slice's only job (its first round creates it; two or more jobs refuse and ask for --job); --new-job creates another job for the slice (re-running it with the same --slug resumes that job); --job <job> opens the next round of that job, which must belong to --slice. A later round supersedes the job's previous one (a signed job is reopened; an implemented one refuses). Rounds number inside the job. Re-running an open with the open round's slug writes nothing. --critique records the round's critique level in round.json (absent in an older round reads as off). More than {DESIGN_WAVE_OPEN_MAX} open rounds in one slice prints a warning, never a refusal. The orchestrator writes the round's handoff.md next (with a critique: line); the drafter writes the canvas tree in jobs/<job>/canvas/project/.")
    p.add_argument("--slug", required=True, help="the round's slug (and the job's, when the round creates its job): lowercase words joined by hyphens")
    p.add_argument("--slice", required=True, help="the co-work slice that owns the job (e.g. P48-k2.S1)")
    p.add_argument("--title", default=None, help="display title (default: the slug)")
    g = p.add_mutually_exclusive_group()
    g.add_argument("--new-job", action="store_true", help="create another job for a slice that already has one (a wave's next surface)")
    g.add_argument("--job", default=None, help="open the next round of this job (e.g. 02-settings); it must belong to --slice")
    p.add_argument("--critique", default=None, metavar="{" + ",".join(DESIGN_CRITIQUE_LEVELS) + "}", help=f"the round's critique level: {' | '.join(DESIGN_CRITIQUE_LEVELS)} (default off; a superseding round, the scoped re-draft after an operator note, stays off unless this is passed)")
    p.set_defaults(func=design_open)

    p = sub.add_parser("design-check", help=f"Check {DESIGN_ROOT_REL}/ against the design contract -- well-formed design.json, job.json and round.json (a critique level, when present, is off, critic or critic+judge), at most one open round per job, and each job's canvas tree (canvas.json keys, boards listed and present, Main.dc.html, path rules, the ./support.js line, board titles numbered 01..N, references inside project/), no stray HTML, waves/<slice>/ folders and every brief a handoff names, and (v61) no absolute or home path in the record's text (a problem while open, a warning once closed); warnings exit 0, problems exit 1",
                       description=f"Read-only. With a job id, only design.json and that job. Board titles start \"NN · \" with NN forming 01..N as a set (the layout is free). A canvas pinning another system version than design.json's is a warning, and so is an open job past {DESIGN_JOB_PAGES_MAX} Pages (boards with expand: fill) or {DESIGN_JOB_BOARDS_MAX} boards (one job is one surface, sized for one review; a board another board mounts with <dc-import name=...>, a flow board's screen or a gap component's one-instance board, is not counted). Board lint, also warnings, for an open job or a job named by id: check=leaves-canvas (an href to an https URL other than Google Fonts CSS: the link leaves the prototype) and check=same-target-list (a link with a literal .dc.html target inside a <sc-for>: every row opens the same board). A co-work slice may hold several jobs. The OK line lists every open round. {DESIGN_LEGACY_DIR}/ and {DESIGN_SCHEMA1_DIR}/ are legacy records and never read.")
    p.add_argument("job", nargs="?", default=None, help="a job id, e.g. 01-signin (default: every job)")
    p.set_defaults(func=design_check)

    p = sub.add_parser("design-canvas", help="Record a job's canvas Artifact in its job.json: --url after creating it, --version after each publish (also records the published file list), --implemented once the signed job is built",
                       description="--url takes the same Artifact address rule as design-system. --version records canvas.version and sets canvas.published to the files under canvas/project/ (ds/ left out), which the next design-publish-plan diffs against, canvas.manifest to their byte sizes (what design-readback compares a listing with), the job's open round's published to the version (what design-sign presents), and canvas.system to the system version canvas.json pins for design.json's namespace (null when it pins none): the version that publish installed. --implemented needs the job signed.")
    p.add_argument("job", help="the job id, e.g. 01-signin")
    p.add_argument("--url", default=None, help="the canvas Artifact's address")
    p.add_argument("--version", default=None, help="the version id the last publish returned")
    p.add_argument("--implemented", action="store_true", help="mark the signed job implemented (its design is built)")
    p.set_defaults(func=design_canvas)

    p = sub.add_parser("design-publish-plan", help="Read-only: print the Artifact publish call for a job's canvas as JSON -- {url, root, file_path, files}: canvas.json as file_path, every other project/ file mapped to itself, files removed since the last publish mapped to null, and the system install entries on a first publish or a changed system pin; refuses without a canvas url or on a failing design-check",
                       description="The engine never calls claude.ai: the orchestrator passes this JSON to its Artifact publish. root is the job's canvas/ folder (it holds project/); ds/ is never sent from disk -- with design.json's system set, each system file maps as \"project/ds/<namespace>/<file>\": {\"artifact\": <system>, \"path\": \"project/<file>\"}, a server-side copy. Those copies are in the plan only on the job's first publish (canvas.version null) or when the version canvas.json pins for that namespace differs from job.json canvas.system, the version the last publish installed (absent on a job published before v60, which reads as the pin now); files left out of a publish are kept by the server.")
    p.add_argument("job", help="the job id, e.g. 01-signin")
    p.set_defaults(func=design_publish_plan)

    p = sub.add_parser("design-preview", help="Render each board of a job's canvas locally for the drafter's self-check: serve canvas/project/ (its ds/ system cache included) with the Design canvas type's real runtime as ./support.js over http on 127.0.0.1, screenshot every board in an exact viewport with a throwaway headless Chrome/Chromium profile driven over the DevTools pipe (no port), print one board=<file> png=<path> w= h= line per screenshot plus its issues, then the WCAG machine checks (non-text-contrast, reflow and overprint at 320px and 200%% text, keyboard) and a final self_check=pass|fail line; the render stays in the job's git-ignored round folder for the critic; no browser prints preview=skipped reason=no-browser, writes nothing and exits 0",
                       description=f"Never views the published canvas and never calls claude.ai. --runtime is the type's artifact-type/dc-runtime.js, which the orchestrator saves per job (never vendored); it renders standalone, so no stand-in ships. A board renders at its canvas.json w x h; a PAGE (expand: fill) grows to its content and also renders {DESIGN_PREVIEW_PHONE[0]} px wide (--phone: every board). Each line also gives the content size, unmounted parts (an x-import whose system global is missing, a dc-import whose board is missing), script errors and the issue count; issue lines name a clipped frame, a sideways overflow, runtime errors and files not found. Browser: --browser, else ${DESIGN_PREVIEW_BROWSER_ENV} (a named one is the only candidate), else the known Chrome/Chromium paths, else chromium/google-chrome on PATH. Writes only the PNGs, preview.json and the contact sheets -- by default into {DESIGN_ROOT_SHOWN}/{DESIGN_PREVIEW_DIR}/<job>/<round>/ (the job's open round, else its last; git-ignored, so outside the design record: the critic reads the drafter's final render there instead of rendering again; a whole run replaces the folder's shots, a --board run only that board's, and preview.json keeps the other boards' earlier render) -- and, once, canvas/project/ds/.gitignore (*) when ds/ exists; a system the canvas installs but ds/<namespace>/ lacks is a warning (the engine never fetches it). Exit 1 when a screenshot failed, or with --strict when the self-check fails. "
                                   f"SELF-CHECK (v61): the last line is self_check=pass|fail blocking=<check:count,...>|none over the whole (merged) render, where blocking = {', '.join(DESIGN_PREVIEW_BLOCKING)}; preview.json repeats it as self_check: {{result, blocking}}. "
                                   f"MEASURED CHECKS, in every view and state; every issue line reads 'issue board=<file> [view=<v>] [state=NN] check=<name>: ...'. "
                                   f"contrast: each visible text run (one per element; aria-hidden, invisible and zero-size text skipped) against the background its ancestors paint, color alpha, background alpha and ancestor opacity composited over white, colors in any CSS syntax; WCAG 4.5:1, or 3:1 for text >= 24px or >= 18.66px bold. A background image, gradient, filter or blend mode in the way makes the text 'unmeasured' (one line per board: judge it on the PNG), never a guess; not seen: a positioned sibling or <img> under the text, text-shadow, placeholder and field-value text, SVG text. "
                                   f"target: an a[href], button, input, select, textarea, summary, ARIA button/link/checkbox/radio/switch/tab/menuitem or tabindex>=0 element (visible, enabled) whose box is under {DESIGN_PREVIEW_TARGET}x{DESIGN_PREVIEW_TARGET}px, a field's <label> counted with it; a link inside a run of text is exempt (WCAG's inline exception). "
                                   "clipped: an element's own text cut off by overflow hidden/clip, unless it ends in an ellipsis or a line clamp. "
                                   "dead-link: an <a href> to a .dc.html that is no canvas.json board, to another relative file not in the tree, to an #id with no element, or a bare # placeholder; absolute URLs (https:, mailto:) are listed as external, never fetched. "
                                   "image: an <img> that loaded with naturalWidth 0 (background images are not checked). "
                                   "name: a button or link with no accessible name (text, aria-label, aria-labelledby, title or an inner img alt), a form field with no label (label for=, a wrapping label, aria-label, aria-labelledby; a placeholder is not one). "
                                   "non-text-contrast (WCAG 1.4.11): each visible, enabled control of the target set by element or role (inline text links, [data-proto], aria-hidden ones, UA-drawn checkboxes/radios/ranges/pickers and a scrim over a quarter of the viewport left out) whose boundary -- a >= 1px border that is not none/hidden, or else its own fill; the better of the two counts -- is under 3:1 against the color its ancestors paint around it, composited like contrast; a control with no border or fill, or with both under 1.1:1 (drawn in the surface's color), has no boundary to check unless it is a form field; a background image, gradient, filter or blend mode in the way makes it 'unmeasured'. One line per run for each border/fill-on-surface pair: later views, states and boards count it and a closing note lists the boards that draw it again. Not seen: box-shadow or outline boundaries, an icon's own shapes, focus indicators, a state told apart by a tint on a control whose border passes (the better boundary counts). "
                                   f"state-bar: the bar ([data-proto=\"state-bar\"]) or an ancestor position fixed or sticky; two or more bars on one board (a board showing one page in several windows carries exactly one, above all the windows and inside none); a bar showing more than one page's named group; a bar with no named [role=group]; with --click, a preset that moves to another page. design-check lints what the source shows (a pinned bar in a style or rule; an interactive board mounting one board as windows with no bar of its own). "
                                   f"WCAG VIEWS of each PAGE (expand: fill), each growing to its content: w320 ({DESIGN_PREVIEW_REFLOW}px wide) and text200 ({DESIGN_PREVIEW_PHONE[0]}px wide with every element's computed font-size read, then set to {DESIGN_PREVIEW_TEXT_SCALE}x, so nothing compounds); each names reflow (content wider than the view: a sideways scroll; WCAG 1.4.10/1.4.4), overprint (two text runs of different elements, neither containing the other, whose glyph boxes -- the middle half of each line box, cut to every overflow/clip-path ancestor -- cross where it shows: the topmost element there is one of them and nothing opaque hides the other; [data-proto] left out; identical pairs folded) and the clipped check, plus render issues the frame and phone views did not name (<stem>.w320.png, <stem>.text200.png). Not seen: real browser text zoom or a minimum-font setting, text in images or SVG, overlap with non-text shapes, an overprint a scroll or a click reveals. "
                                   f"keyboard (WCAG 2.1.1), on each is_interactive board from the settled frame view: Tab (Input.dispatchKeyEvent) until focus comes back to its first stop, at most {DESIGN_PREVIEW_TABS} presses; a control of the target set (outside [data-proto], not tabindex < 0, inside an open modal when there is one) the order never reached is unreachable (judged only when it came back). A click-only control -- an element with a click/mousedown/pointerdown listener (an on* property, or addEventListener) or, failing that, a pointer cursor its parent lacks, neither natively focusable nor tabindex >= 0, inside no control or label, holding none and under a quarter of the viewport -- is one line per tag and class; the first {DESIGN_PREVIEW_POP_PROBES} are clicked from a fresh load and one that opens a dialog, menu, tooltip, listbox or popover is named so. Not seen: focus order sense, a visible focus indicator, keys other than Tab (arrows, Escape, Enter on a fake control), a listener delegated to an ancestor with no pointer cursor. "
                                   "The canvas-only prototype chrome ([data-proto]: the state bar, the board-link strip) is exempt from target, non-text-contrast, overprint, keyboard, layout-shift and hover-contrast, and is never sampled as a list. "
                                   "Identical findings fold into one line ('+N more like it'); the phone view and the states repeat none the frame view named. The render's own issues are check=load, settle, too-tall, frame-clip, page-clip (a PAGE's state taller than its frame h, in the frame view: the render grows a PAGE, the canvas frame does not), overflow, unmounted, runtime-error, script-error, not-found, screenshot, size and browser. "
                                   f"--click: link lines and check=unreachable (a PAGE board, expand: fill, that no chain of links from Main.dc.html reaches; a Components board is not expected to be linked); on each is_interactive board, real mouse clicks (Input.dispatchMouseEvent) at each visible, enabled, uncovered control's centre, breadth first from the settled initial state, never a link that leaves the board. A state is a new visible DOM (shown elements with their class, style and open/expanded/selected/current/disabled attributes, and shown text, plus whether every visible text field holds text); a ticked box or a typed value alone is not a state. The state bar's presets ([data-proto=\"state-bar\"] buttons) are tried first, once per page (a preset sets its page's complete state), and a state on a page not met before is explored ahead of the rest; the page on screen is the bar's visible [role=group] name, else the first h1. A list of {DESIGN_PREVIEW_LIST_SAMPLE}+ alike rows is sampled: its first, second and last row. The type pass types a realistic sample into each visible text field (email, phone, name, postcode, search from the listed text, ...) and fills a form of two or more empty fields whole in one step, each a step of the path; select, date and other native pickers are not explored. After a step the page settles, the short timers it set are waited for (up to 3s: 'Saving...' is passed through to 'Saved') and its animations end. Each state's PNG is taken on its path replayed from a fresh load. A click that throws is check=click-error, once per control. check=layout-shift: a step that stays on the same page and resizes a control (outside [data-proto]) by more than {DESIGN_PREVIEW_SHIFT}px, or moves a header, nav or main by more than {DESIGN_PREVIEW_SHIFT}px; a step to another page is navigation, never a shift. check=same-target: two or more sampled rows of one list open the same state of another page. check=hover-contrast (PAGE boards, frame view, each state): the pointer rests on each button and link once per board (transitions off), and a text run of the hovered control that newly fails contrast is an issue (the a:hover color beating a system Button rendered as <a>). Frame view only, unless --phone-click; at most {DESIGN_PREVIEW_STATES} states, {DESIGN_PREVIEW_DEPTH} steps deep, {DESIGN_PREVIEW_CLICKS} steps and {DESIGN_PREVIEW_BOARD_SECONDS}s per board and view, each cap said on the board's note line. "
                                   "--states-only takes only the states again (--click implied), reusing the earlier render's views in --out; --contact-sheet writes <stem>.sheet.png per board, its shots tiled at half size or less under captions (a sheet line gives its token cost against the PNGs one by one). "
                                   "preview.json: {schema, job, round, out, runtime, click, phone, phone_click, states_only, boards: {<file>: {title, page, interactive, views: {frame|phone|w320|text200: {png, w, h, content, issues: [{check, message}], as_in_frame, measured}}, states: [{n, view, page, path, png, w, h, content, issues, measured}], click_errors, interaction: [{view, state, check, message}], click: {frame|phone: {states, clicks, notes}}, keyboard: {controls, reached, presses, wrapped, missed, click_only, opened}}}, links: [{from, to, external}], issues: [board-level {board, check, message} and every interaction finding {board, view, state, check, message}], sheets: {<file>: {png, w, h, tiles, scale, tokens}}, ntc_also, merged (the boards kept from the earlier render), self_check: {result, blocking}, totals: {pngs, failed, issues, states, seconds}}; png paths are repo-relative under the workspace; measured holds every raw finding (contrast: el, size, weight, need, ratio, fg, bg; target: el, w, h; clipped; links; images; names; ntc: el, part, ratio, fg, bg, width; statebar; overprint in the WCAG views) and the counts texts, targets, fields, boundaries, bars.")
    p.add_argument("job", help="the job id, e.g. 01-signin")
    p.add_argument("--runtime", required=True, help="the path of the Design canvas type's runtime (artifact-type/dc-runtime.js) the orchestrator saved for this job")
    p.add_argument("--out", default=None, help=f"the folder for the PNGs, preview.json and the contact sheets (default: the job's round folder under the design root's git-ignored {DESIGN_PREVIEW_DIR}/, {DESIGN_ROOT_SHOWN}/{DESIGN_PREVIEW_DIR}/<job>/<round>/, where the critic finds the drafter's final render); never elsewhere inside the design root")
    p.add_argument("--browser", default=None, help=f"the Chrome/Chromium executable (default: ${DESIGN_PREVIEW_BROWSER_ENV}, then the known paths)")
    p.add_argument("--board", action="append", default=None, help="render only this board (its canvas.json key, e.g. Main.dc.html); repeatable")
    p.add_argument("--phone", action="store_true", help=f"also render every board {DESIGN_PREVIEW_PHONE[0]} px wide (a PAGE always is)")
    p.add_argument("--phone-click", action="store_true", help=f"with --click (implied), also click through each interactive PAGE at {DESIGN_PREVIEW_PHONE[0]} px wide (<stem>.phone.state-NN.png); about doubles the time")
    p.add_argument("--click", action="store_true", help=f"also click through: print the link graph (link from= to= lines; a PAGE no link chain from Main.dc.html reaches is an issue) and, on each is_interactive board, try the state-bar presets first, then every control (list rows sampled) and a sample typed into each text field, breadth first, and screenshot each new state (state lines, <stem>.frame.state-NN.png), checking layout-shift, same-target, page-clip and, on PAGE boards, hover-contrast; at most {DESIGN_PREVIEW_STATES} states, {DESIGN_PREVIEW_DEPTH} steps deep, {DESIGN_PREVIEW_CLICKS} steps and {DESIGN_PREVIEW_BOARD_SECONDS}s per board, in the frame view only (--phone-click: also at {DESIGN_PREVIEW_PHONE[0]} px)")
    p.add_argument("--states-only", action="store_true", help="with --click (implied): take only the interaction states again, reusing the frame, phone and WCAG views of the earlier render in --out (refused when there is none); preview.json keeps every other board's earlier render")
    p.add_argument("--contact-sheet", action="store_true", help=f"also write one <stem>.sheet.png per board rendered: its views and states tiled at one reduced scale, {DESIGN_PREVIEW_SHEET_W}px wide, each under a caption (a sheet line gives its size and its token cost against the PNGs one by one)")
    p.add_argument("--strict", action="store_true", help=f"exit 1 when the self-check fails (any {', '.join(DESIGN_PREVIEW_BLOCKING)} issue); without it the exit code is as before")
    p.set_defaults(func=design_preview)

    p = sub.add_parser("design-readback", help="Read a job's published canvas back without pulling it: --listing parses the Artifact list scope:files output (file or - for stdin) and prints readback=unchanged|changed|changed-unlocated, one fetch= line naming only the files to read (changed and added by size against the publish manifest; the boards when no size moved or no manifest exists) and removed= ones; --fetched <dir> then diffs each fetched file against the local canvas tree (diff=<path> +A -B), and --apply copies them in; records readback in the open round's round.json; never prints file contents",
                       description="A listing at the job's recorded canvas.version is unchanged. Otherwise the project/ files outside ds/ are size-compared with job.json canvas.manifest (SKILL.md, index.html, artifact-type/ and project/ds/ are ignored). --fetched reads <dir>/project/<path> or <dir>/<path>, writes the unified diffs to <dir>/readback.diff (a scratch dir outside the design root, never the record) and settles the read-back as unchanged, differs (not copied) or edited (--apply: the operator's files copied over the local canvas files, so the record holds what they saw). --apply refuses, copying nothing, while a file gone from the canvas is still in the local tree.")
    p.add_argument("job", help="the job id, e.g. 01-signin")
    g = p.add_mutually_exclusive_group(required=True)
    g.add_argument("--listing", default=None, metavar="FILE|-", help="the Artifact list scope:files output, saved to a file or piped on stdin (-)")
    g.add_argument("--fetched", default=None, metavar="DIR", help="the scratch out_dir the fetch list was read into with Artifact read")
    p.add_argument("--apply", action="store_true", help="with --fetched: copy the fetched files over the local canvas files")
    p.set_defaults(func=design_readback)

    p = sub.add_parser("design-sign", help="Sign every job presented at a stop on the operator's literal words: each open round of the slice that recorded a publish (design-canvas --version) is signed as design-close --words would; all or nothing -- one presented round without a settled read-back, without its build contract or failing design-check signs none; one line per job",
                       description="Rounds of the slice that published nothing yet are held, not signed. Each signed round gets a generated SIGNOFF.md (the words verbatim, the canvas version, the read-back, the open-item ids), its snapshot, and its job marked signed. With a mockup requested, the words at PENDING #1 are its go-ahead, not a signoff: sign at PENDING #2.")
    p.add_argument("--slice", required=True, help="the co-work slice whose presented jobs are signed (e.g. P48-k2.S1)")
    p.add_argument("--words", required=True, help="the operator's literal signoff words, recorded verbatim")
    p.set_defaults(func=design_sign)

    p = sub.add_parser("design-close", help="Close an open design round of a job: snapshot the job's canvas tree (ds/ left out) into the round folder, record canvas_version, then with --words generate SIGNOFF.md and mark the round and its job signed, or with --superseded mark the round superseded; idempotent",
                       description="--words needs the round's recorded publish of the job's canvas, a settled read-back of it (design-readback: unchanged or edited), the build contract (result.md ## Build, or a legacy build-prompt.md) and a passing design-check of the job; it generates SIGNOFF.md from the words, the canvas version, the read-back and the open_items: ids of the round's verdict blocks (a hand-written SIGNOFF.md is kept, with a warning). --canvas-version defaults to the read-back's live version, else the job's recorded canvas.version. Re-run a half-landed close; a closed round is never rewritten.")
    p.add_argument("round", help="the round: <job>/<round> (e.g. 01-signin/02-revise), or the bare round id when only one job has it")
    g = p.add_mutually_exclusive_group(required=True)
    g.add_argument("--words", default=None, help="the operator's literal signoff words, recorded verbatim in round.json")
    g.add_argument("--superseded", action="store_true", help="a design question replaces the round before it is signed: snapshot and close it")
    p.add_argument("--canvas-version", default=None, help="the canvas version id the operator reviewed (default: job.json canvas.version)")
    p.set_defaults(func=design_close)

    p = sub.add_parser("design-migrate", help=f"Move a legacy design record aside, unchanged; a dry run unless --apply. Two migrations: with no --to, a pre-v47 (Claude Design) record into {DESIGN_ROOT_REL}/{DESIGN_LEGACY_DIR}/ (with no design.json every top-level entry, else only rounds without round.json, SIGNOFF.md and grounding/); with --to 2, a schema-1 (v47 card) record -- cards/, tokens.css, rounds/ -- into {DESIGN_ROOT_REL}/{DESIGN_SCHEMA1_DIR}/, rewriting design.json to schema 2",
                       description=f"All-or-nothing: every check runs before the first move, and a refusal moves nothing. Never deletes (only an emptied rounds/ is rmdir'ed), never runs git. Without --to (pre-v47 -> {DESIGN_LEGACY_DIR}/): an existing destination, or a design.json-less root whose rounds/ holds a round.json, refuses; dot-entries, and with design.json anything outside the contracts, are listed as left in place; design.json is never written (design-init stays separate). With --to 2 (schema 1 -> {DESIGN_SCHEMA1_DIR}/): refuses while a schema-1 round is open, while a pre-v47 record is at the root (migrate it first), or when {DESIGN_SCHEMA1_DIR}/ exists; keeps design.json's id and name and adds a null-filled system. The engine never reads {DESIGN_LEGACY_DIR}/ or {DESIGN_SCHEMA1_DIR}/.")
    p.add_argument("--to", choices=["2"], default=None, help="2: migrate a schema-1 record to schema 2 (default: the pre-v47 move into claude-design/)")
    p.add_argument("--apply", action="store_true", help="perform the moves (default: print them and move nothing)")
    p.set_defaults(func=design_migrate)

    p = sub.add_parser("defer-job", help="Create a deferred job folder")
    p.add_argument("--id", help="the deferred id; omit it and the engine mints one (D92-x4: the next number and a random tail). Given, any shape (D92-x4, D12 or D-m3xa; 92-x4, 12 and m3xa are read as those); "
                   "refused when any deferred folder holds it")
    p.add_argument("--title", required=True)
    p.add_argument("--reason", required=True)
    p.add_argument("--trigger", required=True)
    p.add_argument("--source", required=True)
    p.set_defaults(func=defer_job)

    p = sub.add_parser("promote-deferred", help="Promote an open deferred job into an active slice")
    p.add_argument("deferred_id", help="the deferred job, in any brief form (92, D92 or 92-x4; D12; m3xa or D-m3xa)")
    p.add_argument("--phase", help="the target phase, in any brief form (46, P46 or 46-k2; P12; 7kq2 or P-7kq2); omit it with --create-phase and the engine mints the new phase's id")
    p.add_argument("--slice", required=True, help="the new slice's id (P46-k2.S1), or its bare suffix (S1) -- the only way to name it in a phase being minted")
    p.add_argument("--name")
    p.add_argument("--kind", default="implementation", help="one of implementation, review, decomposition, research, fix, docs, qa, co-work (closed set; unknown kinds are rejected). research is findings-only: no product code, findings land in phase.md, and it always routes to the research row")
    p.add_argument("--risk", default="high", help="low (the mid row for implementation, fix, docs and qa -- the default since v46, real code included) or high (the high row: only for a named trigger -- open design, a core invariant, an unlocated root cause, a wide blast radius -- or a fix to mid-row work); unset or unrecognized values route to high; kind decomposition, review, co-work and research route by kind whatever this says; `executor-route <slice>` prints the decision")
    p.add_argument("--order", type=float, help="sort position within the phase; a fractional value (e.g. 4.5) inserts between two neighbors without renumbering (default: 10 past the last non-review slice)")
    p.add_argument("--depends-on", action="append", metavar="ID|none", help=DEPENDS_ON_HELP)
    p.add_argument("--create-phase", action="store_true")
    p.add_argument("--phase-name")
    p.add_argument("--phase-objective")
    p.set_defaults(func=promote_deferred)

    p = sub.add_parser("drop-deferred", help="Drop an open deferred job")
    p.add_argument("deferred_id", help="the deferred job, in any brief form (92, D92 or 92-x4; D12; m3xa or D-m3xa)")
    p.add_argument("--reason", required=True)
    p.set_defaults(func=drop_deferred)

    p = sub.add_parser("archive-phase", help="Archive a single review-passed phase (first-class; use when only some phases are done)")
    p.add_argument("phase", help=PHASE_ARG_HELP)
    p.add_argument("--force", action="store_true")
    p.set_defaults(func=archive_phase)

    p = sub.add_parser("archive-all", help="Batch-archive ALL active phases at once; only when every phase is done (last review slice complete)")
    p.add_argument("--force", action="store_true")
    p.set_defaults(func=archive_all)

    p = sub.add_parser("rotate-backlog", help="The one resumable step of /rotate-backlog: checks the doc debt FIRST and prints its decision as the first line, rotate=<refused|archive|stop_midflight|stop_uncommitted|replace|resume|create>. archive: nothing owes, so archive every currently-done phase (whole phases, the partial archive-all) and rebuild. While debt stands it first archives the cleanly archivable phases (never one that owes docs; archived=<ids>), goes around parked work -- a phase pending or blocked, a slice pending, blocked or changes_requested, one parked=<id> status=<status>[ stop_kind=<kind>] line each -- and then: stop_midflight for running default-stream work (a slice in_progress or in_review, a phase in_review; a gate-open phase's review slice is parked), stop_uncommitted when work is parked and the product tree holds uncommitted edits (uncommitted=<n> and the paths), replace (v78) every live docs phase when all are unstarted and new debt stands uncovered (each folder removed, docs_phase_replaced=, then one proposal covering all the debt), resume a started live docs phase (re-asserting its queue-jump order; new debt waits for it), or print the docs phase to create, its create: line carrying the queue-jump --order. A stop creates, replaces and reorders nothing. refused (writes nothing, non-zero exit) on a parallel stream")
    p.add_argument("--archive-only", action="store_true", dest="archive_only",
                   help="archive only: the sweep of every currently-done phase and its report, with no rotate= line and no docs-phase line (unchanged since v51)")
    p.set_defaults(func=rotate_backlog)

    args = parser.parse_args(argv)
    if NESTED is not None and NESTED_PROBLEMS and args.cmd not in ("validate", "compact-resume"):  # the hook fails open
        # Never fall back to at-root mode on a broken marker: refuse, and let validate list it all.
        raise SystemExit(f"{shown(ROOT / NESTED_MARKER)} is malformed, so this nested install cannot run {args.cmd}: "
                         f"{'; '.join(NESTED_PROBLEMS)} -- fix the file (run: {WORKFLOW_CMD} validate)")
    normalize_id_args(args)  # every typed phase / deferred-id / slice argument becomes its stored id here, once
    result = args.func(args)
    if isinstance(result, tuple):
        return 0
    return 0 if result is None else int(result or 0)


if __name__ == "__main__":
    raise SystemExit(main())
