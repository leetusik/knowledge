"""The docs/-convention library: slug/validators, path computation, byte-exact
frontmatter (serialize/parse), and Recent-marker insertion.

Every rule that touches an on-disk format lives here so it is unit-tested before
any HTTP or git wraps it. Frontmatter is hand-rolled (never PyYAML-dumped): the
title is emitted via json.dumps — a JSON string is a valid YAML double-quoted
scalar, so colons/quotes/em-dashes are safe — while parsing uses yaml.safe_load.
"""
from __future__ import annotations

import datetime
import json
import re
from pathlib import Path
from typing import Optional, Union

import yaml

# --- errors ---------------------------------------------------------------


class ConventionError(ValueError):
    """A value violates the docs/ naming or frontmatter conventions."""


class FrontmatterError(ConventionError):
    """A file lacks a parseable leading YAML frontmatter header."""


# --- validators / slug ----------------------------------------------------

_PROJECT_RE = re.compile(r"^[A-Za-z0-9][A-Za-z0-9._-]*$")
_TAG_RE = re.compile(r"^[a-z0-9]+(-[a-z0-9]+)*$")  # also the slug charset
_DATE_FMT_RE = re.compile(r"^\d{4}-\d{2}-\d{2}$")
_SLUG_MAX = 80


def slugify(title: str) -> str:
    """Lowercase-kebab: non-alnum runs collapse to a single '-', trimmed, capped."""
    s = re.sub(r"[^a-z0-9]+", "-", (title or "").lower()).strip("-")
    if len(s) > _SLUG_MAX:
        s = s[:_SLUG_MAX].rstrip("-")
    return s or "untitled"


def validate_project(project: str) -> str:
    if (
        not isinstance(project, str)
        or not _PROJECT_RE.match(project)
        or ".." in project
        or "/" in project
    ):
        raise ConventionError(f"invalid project: {project!r}")
    return project


def validate_tags(tags) -> list[str]:
    if not isinstance(tags, (list, tuple)):
        raise ConventionError("tags must be a list")
    tags = list(tags)
    if not (2 <= len(tags) <= 5):
        raise ConventionError(f"tags must have 2-5 items, got {len(tags)}")
    for t in tags:
        if not isinstance(t, str) or not _TAG_RE.match(t):
            raise ConventionError(f"invalid tag: {t!r}")
    return tags


def validate_slug(slug: str) -> str:
    # Same charset as tags.
    if not isinstance(slug, str) or not _TAG_RE.match(slug):
        raise ConventionError(f"invalid slug: {slug!r}")
    return slug


def validate_date(date: str) -> str:
    """Require YYYY-MM-DD and a real calendar date (rejects 2026-13-45, 20260702)."""
    if not isinstance(date, str) or not _DATE_FMT_RE.match(date):
        raise ConventionError(f"invalid date (expected YYYY-MM-DD): {date!r}")
    try:
        datetime.date.fromisoformat(date)
    except ValueError:
        raise ConventionError(f"invalid date (not a real date): {date!r}")
    return date


def rel_path(project: str, date: str, slug: str) -> str:
    return f"{project}/{date}-{slug}.md"


# --- frontmatter ----------------------------------------------------------


def serialize_frontmatter(
    *,
    title: str,
    date: str,
    tags: list[str],
    project: str,
    source_repo: str,
) -> str:
    """Hand-rolled frontmatter block, byte-exact to the docs/ convention.

    Ends with the closing '---\\n'; compose a full document as
    serialize_frontmatter(...) + "\\n" + body.
    """
    lines = ["---"]
    lines.append(f"title: {json.dumps(title, ensure_ascii=False)}")
    lines.append(f"date: {date}")
    lines.append("tags:")
    for t in tags:
        lines.append(f"  - {t}")
    lines.append("source:")
    lines.append(f"  project: {project}")
    lines.append(f"  repo: {source_repo}")
    lines.append("---")
    return "\n".join(lines) + "\n"


def parse_frontmatter(text: str) -> tuple[dict, str]:
    """Split the leading '---' fences and yaml.safe_load the header.

    Returns (meta, body). Raises FrontmatterError for files without a valid
    leading YAML mapping — the caller maps that to a reindex skip reason.
    """
    lines = text.splitlines()
    if not lines or lines[0].strip() != "---":
        raise FrontmatterError("missing opening frontmatter fence")
    end = None
    for i in range(1, len(lines)):
        if lines[i].strip() == "---":
            end = i
            break
    if end is None:
        raise FrontmatterError("missing closing frontmatter fence")
    header = "\n".join(lines[1:end])
    body = "\n".join(lines[end + 1:])
    try:
        meta = yaml.safe_load(header)
    except yaml.YAMLError as exc:  # pragma: no cover - defensive
        raise FrontmatterError(f"invalid YAML frontmatter: {exc}")
    if not isinstance(meta, dict):
        raise FrontmatterError("frontmatter is not a mapping")
    return meta, body


# --- Recent-marker insertion ---------------------------------------------

RECENT_MARKER = "<!-- explain:recent -->"
_RECENT_HEADING = "## Recent"


def format_recent_bullet(
    *, date: str, title: str, rel_path: str, project: str
) -> str:
    """`- <date> · [<title>](<rel_path>) — <project>` (middle-dot + em-dash separators)."""
    return f"- {date} · [{title}]({rel_path}) — {project}"


def insert_recent_bullet(
    index_text: str, *, date: str, title: str, rel_path: str, project: str
) -> tuple[str, str]:
    """Insert the Recent bullet, newest-first. Pure function (no I/O).

    Fallback ladder, returning the mechanism used:
      1. directly after the ``<!-- explain:recent -->`` marker line ("marker")
      2. directly after a ``## Recent`` heading ("heading")
      3. append a new ``## Recent`` section with marker + bullet ("appended")
    """
    bullet = format_recent_bullet(
        date=date, title=title, rel_path=rel_path, project=project
    )
    lines = index_text.split("\n")
    for i, line in enumerate(lines):
        if line.strip() == RECENT_MARKER:
            lines.insert(i + 1, bullet)
            return "\n".join(lines), "marker"
    for i, line in enumerate(lines):
        if line.strip() == _RECENT_HEADING:
            lines.insert(i + 1, bullet)
            return "\n".join(lines), "heading"
    appended = index_text.rstrip("\n")
    appended += f"\n\n{_RECENT_HEADING}\n\n{RECENT_MARKER}\n{bullet}\n"
    return appended, "appended"


# --- write-file + update-index composition (S3 write path) ----------------

_LEADING_BLANKS_RE = re.compile(r"\A(?:[ \t]*\n)+")


def _normalize_body(body: str) -> str:
    """Body starting at the H1: leading blank lines stripped, single trailing newline.

    Mirrors what reindex sees — reindex stores the parsed body ``lstrip("\\n")``,
    so a doc written here round-trips to the same DB ``markdown``.
    """
    stripped = _LEADING_BLANKS_RE.sub("", body or "")
    return stripped.rstrip("\n") + "\n"


def write_document_file(
    *,
    docs_root: Union[str, Path],
    rel_path: str,
    title: str,
    date: str,
    tags: list[str],
    project: str,
    source_repo: Optional[str],
    body: str,
) -> str:
    """Write ``docs/<rel_path>`` as ``serialize_frontmatter(...) + "\\n" + body``.

    Creates parent dirs. Returns the body **as the DB stores it** (identical to
    what reindex derives from the same file: starts at the H1, no trailing
    newline) so the on-disk file and the DB row can't drift on a later reindex.
    """
    content = (
        serialize_frontmatter(
            title=title,
            date=date,
            tags=tags,
            project=project,
            source_repo=source_repo or "",
        )
        + "\n"
        + _normalize_body(body)
    )
    target = Path(docs_root) / rel_path
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(content, encoding="utf-8")
    # Reuse the reindex parse so the stored markdown is byte-identical to a rebuild.
    _meta, parsed_body = parse_frontmatter(content)
    return parsed_body.lstrip("\n")


def update_recent_index(
    docs_root: Union[str, Path],
    *,
    date: str,
    title: str,
    rel_path: str,
    project: str,
) -> bool:
    """Insert the Recent bullet into ``docs/index.md``; suppress duplicates.

    Returns ``recent_updated``: ``False`` (index left untouched) when ``rel_path``
    already appears in the index text — the overwrite case — else ``True`` after
    writing the bullet back via the marker→heading→append ladder.
    """
    index_path = Path(docs_root) / "index.md"
    text = index_path.read_text(encoding="utf-8") if index_path.exists() else ""
    if rel_path in text:
        return False
    new_text, _mechanism = insert_recent_bullet(
        text, date=date, title=title, rel_path=rel_path, project=project
    )
    index_path.write_text(new_text, encoding="utf-8")
    return True
