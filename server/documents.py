"""The docs/-convention library: slug/validators, path computation, byte-exact
frontmatter (serialize/parse), and Recent-marker insertion.

Every rule that touches an on-disk format lives here so it is unit-tested before
any HTTP or git wraps it. Frontmatter is hand-rolled (never PyYAML-dumped): the
title is emitted via json.dumps — a JSON string is a valid YAML double-quoted
scalar, so colons/quotes/em-dashes are safe — while parsing uses yaml.safe_load.
"""
from __future__ import annotations

import datetime
import html.parser
import json
import re
from pathlib import Path, PurePosixPath
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


def rel_path(project: str, date: str, slug: str, fmt: str = "md") -> str:
    """The docs/-convention rel_path. ``fmt`` picks the extension: ``.html`` for
    an HTML explainer, ``.md`` otherwise. The default keeps every existing caller
    (markdown docs) byte-identical."""
    ext = "html" if fmt == "html" else "md"
    return f"{project}/{date}-{slug}.{ext}"


def validate_related(related) -> list[str]:
    """Optional list of related-doc rel_paths (the cross-link convention, S4).

    Shape-validated like S3's ``reindex_path`` rel_path checks: relative, no
    '..' parts, at least 2 path parts, ends with '.md'. Existence is NOT
    required — dead links are tolerated (a related doc may be written later;
    P6 can surface broken edges). Duplicates are removed, order preserved.
    """
    if not isinstance(related, (list, tuple)):
        raise ConventionError("related must be a list")
    seen: set[str] = set()
    out: list[str] = []
    for r in related:
        if not isinstance(r, str) or not r:
            raise ConventionError(f"invalid related entry: {r!r}")
        p = Path(r)
        if p.is_absolute():
            raise ConventionError(f"related entry must be relative: {r!r}")
        if ".." in p.parts:
            raise ConventionError(f"related entry must not contain '..': {r!r}")
        if len(p.parts) < 2:
            raise ConventionError(
                f"related entry must have at least 2 path parts: {r!r}"
            )
        if not (r.endswith(".md") or r.endswith(".html")):
            raise ConventionError(
                f"related entry must end with .md or .html: {r!r}"
            )
        if r not in seen:
            seen.add(r)
            out.append(r)
    return out


def sanitize_source_repo(value: Optional[str]) -> str:
    """Publish-safe source.repo: local paths collapse to their basename; URLs pass through.

    Known accepted quirk: a bare ``org/repo`` shorthand collapses to ``repo`` —
    the directory name only, not the full path. This is intentional to avoid
    leaking the filesystem hierarchy on the public site.
    """
    v = (value or "").strip()
    if not v:
        return ""
    if v.startswith(("http://", "https://", "git@", "ssh://")):
        return v
    if "/" in v or v.startswith("~"):
        return PurePosixPath(v.rstrip("/")).name
    return v


# --- frontmatter ----------------------------------------------------------


def _frontmatter_inner_lines(
    *,
    title: str,
    date: str,
    tags: list[str],
    project: str,
    source_repo: str,
    related: Optional[list[str]] = None,
) -> list[str]:
    """The YAML field lines shared by the '---' fenced (md) and '<!--kb' comment
    (html) frontmatter serializers — everything BETWEEN the fences. Factored out so
    both wrappers emit byte-identical field content; only the delimiters differ.

    ``related`` (optional list of rel_paths) is emitted between ``tags`` and
    ``source`` only when non-empty — ``None``/``[]`` emits nothing.
    """
    lines = [f"title: {json.dumps(title, ensure_ascii=False)}"]
    lines.append(f"date: {date}")
    lines.append("tags:")
    for t in tags:
        lines.append(f"  - {t}")
    if related:
        lines.append("related:")
        for r in related:
            lines.append(f"  - {r}")
    lines.append("source:")
    lines.append(f"  project: {project}")
    lines.append(f"  repo: {source_repo}")
    return lines


def serialize_frontmatter(
    *,
    title: str,
    date: str,
    tags: list[str],
    project: str,
    source_repo: str,
    related: Optional[list[str]] = None,
) -> str:
    """Hand-rolled frontmatter block, byte-exact to the docs/ convention.

    ``related`` (optional list of rel_paths) is emitted between ``tags`` and
    ``source`` only when non-empty — ``None``/``[]`` emits nothing, so output
    without it stays byte-identical to before S4.

    Ends with the closing '---\\n'; compose a full document as
    serialize_frontmatter(...) + "\\n" + body.
    """
    inner = _frontmatter_inner_lines(
        title=title,
        date=date,
        tags=tags,
        project=project,
        source_repo=source_repo,
        related=related,
    )
    return "---\n" + "\n".join(inner) + "\n---\n"


def serialize_html_frontmatter(
    *,
    title: str,
    date: str,
    tags: list[str],
    project: str,
    source_repo: str,
    related: Optional[list[str]] = None,
) -> str:
    """The HTML-comment frontmatter block for an explainer ``.html`` doc.

    Wraps the SAME inner YAML field lines as ``serialize_frontmatter`` in a leading
    ``<!--kb … -->`` HTML comment so the browser ignores the metadata while
    ``reindex`` can still re-derive title/date/tags/related/source from the file
    alone (disk canonical). Ends with '-->\\n'; compose a full document as
    serialize_html_frontmatter(...) + "\\n" + html_body.
    """
    inner = _frontmatter_inner_lines(
        title=title,
        date=date,
        tags=tags,
        project=project,
        source_repo=source_repo,
        related=related,
    )
    return "<!--kb\n" + "\n".join(inner) + "\n-->\n"


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


def parse_html_frontmatter(text: str) -> tuple[dict, str]:
    """Split a leading ``<!--kb … -->`` comment-frontmatter block off an HTML doc.

    Parallel to ``parse_frontmatter``: the file must start with a bare ``<!--kb``
    line, the header ends at the first bare ``-->`` line, and the inner lines are
    ``yaml.safe_load``ed. Returns (meta, body) where ``body`` is everything after
    the closing ``-->`` (the raw ``<!DOCTYPE html>…`` document — the comment is
    excluded, so the served body never has a comment before the doctype). Raises
    ``FrontmatterError`` for a file without a valid leading comment-frontmatter — the
    caller maps that to a reindex skip reason, exactly like the md path.
    """
    lines = text.splitlines()
    if not lines or lines[0].strip() != "<!--kb":
        raise FrontmatterError("missing opening '<!--kb' comment-frontmatter")
    end = None
    for i in range(1, len(lines)):
        if lines[i].strip() == "-->":
            end = i
            break
    if end is None:
        raise FrontmatterError("missing closing '-->' for comment-frontmatter")
    header = "\n".join(lines[1:end])
    body = "\n".join(lines[end + 1:])
    try:
        meta = yaml.safe_load(header)
    except yaml.YAMLError as exc:  # pragma: no cover - defensive
        raise FrontmatterError(f"invalid YAML comment-frontmatter: {exc}")
    if not isinstance(meta, dict):
        raise FrontmatterError("comment-frontmatter is not a mapping")
    return meta, body


# --- HTML text extraction (for the DB `markdown` column) ------------------

# Tags whose *content* is never readable text (scripts, styling, inert
# templates). HTMLParser puts script/style into CDATA mode and hands their body to
# handle_data, so the skip guard is what keeps quiz JS / CSS out of the index.
_SKIP_TAGS = {"script", "style", "template", "noscript"}
# Block-level tags: a boundary newline before/after so adjacent blocks don't glue
# their text together (coarse — good enough for FTS/snippets/embeddings).
_BLOCK_TAGS = {
    "p", "div", "section", "article", "header", "footer", "main", "aside", "nav",
    "h1", "h2", "h3", "h4", "h5", "h6", "ul", "ol", "li", "table", "tr", "td",
    "th", "blockquote", "pre", "figure", "figcaption", "br", "hr",
}


class _TextExtractor(html.parser.HTMLParser):
    """Collect readable text nodes, dropping script/style/template/noscript."""

    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self._skip = 0
        self.parts: list[str] = []

    def handle_starttag(self, tag: str, attrs) -> None:
        if tag in _SKIP_TAGS:
            self._skip += 1
        elif tag in _BLOCK_TAGS:
            self.parts.append("\n")

    def handle_endtag(self, tag: str) -> None:
        if tag in _SKIP_TAGS:
            if self._skip > 0:
                self._skip -= 1
        elif tag in _BLOCK_TAGS:
            self.parts.append("\n")

    def handle_data(self, data: str) -> None:
        if self._skip == 0:
            self.parts.append(data)


_WS_RUN_RE = re.compile(r"[ \t]+")


def extract_html_text(html_text: str) -> str:
    """Server-side plain-text extraction from an HTML explainer body (stdlib only).

    Feeds the HTML through ``html.parser.HTMLParser``, dropping the content of
    ``script``/``style``/``template``/``noscript`` (so quiz JS and CSS never reach
    the index) and inserting coarse newlines at block boundaries. The result is
    whitespace-normalized (space runs collapsed, per-line trimmed, blank lines
    dropped) and is what fills the DB ``markdown`` column — FTS5 / ``snippet()`` /
    embeddings then work unchanged over HTML docs.
    """
    parser = _TextExtractor()
    parser.feed(html_text)
    parser.close()
    raw = "".join(parser.parts)
    lines = (_WS_RUN_RE.sub(" ", ln).strip() for ln in raw.split("\n"))
    return "\n".join(ln for ln in lines if ln)


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
    related: Optional[list[str]] = None,
    fmt: str = "md",
) -> str:
    """Write ``docs/<rel_path>`` as ``<frontmatter> + "\\n" + body``.

    ``fmt`` picks the frontmatter flavor: ``md`` writes the ``---`` fenced YAML
    block (byte-identical to before); ``html`` writes the leading ``<!--kb … -->``
    HTML-comment block so the browser ignores it. Creates parent dirs. Returns the
    body **as the DB stores it** — reindex derives the identical body from the same
    file with the matching parser, so on-disk and DB can't drift on a rebuild. For
    ``html`` that returned body is the raw HTML (``raw_html``); the caller runs it
    through ``extract_html_text`` for the DB ``markdown`` column (the body rule).
    """
    if fmt == "html":
        header = serialize_html_frontmatter(
            title=title,
            date=date,
            tags=tags,
            project=project,
            source_repo=source_repo or "",
            related=related,
        )
    else:
        header = serialize_frontmatter(
            title=title,
            date=date,
            tags=tags,
            project=project,
            source_repo=source_repo or "",
            related=related,
        )
    content = header + "\n" + _normalize_body(body)
    target = Path(docs_root) / rel_path
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(content, encoding="utf-8")
    # Reuse the reindex parse so the stored body is byte-identical to a rebuild.
    if fmt == "html":
        _meta, parsed_body = parse_html_frontmatter(content)
    else:
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


# --- project landing (auto-created for a project's first document) --------

_PROJECT_LANDING = "# {project}\n\nExplainers about `{project}`, kept in this knowledge base.\n"


def project_landing_content(project: str) -> str:
    """The minimal auto-created ``docs/<project>/index.md`` body.

    An H1 (the project name) plus a one-line description — and deliberately NO
    YAML frontmatter / no ``source:`` mapping, so the landing stays a *non-doc*:
    ``index.md`` is on ``graph_hook``'s skip-list, is excluded from
    ``site_smoke.discover_projects`` doc-counting, and is excluded from
    ``check_graph``'s filesystem doc count. It exists only so mkdocs builds
    ``site/<project>/index.html`` — the per-project landing the deploy gate
    (``site_smoke.check_built``) requires for every discovered project.
    """
    return _PROJECT_LANDING.format(project=project)


def ensure_project_landing(docs_root: Union[str, Path], project: str) -> bool:
    """Create ``docs/<project>/index.md`` when absent; NEVER overwrite an existing one.

    Returns ``True`` when it created the landing (the write path then stages it in
    the same scoped commit), ``False`` when a landing — hand-written or previously
    auto-created — already exists and is left byte-for-byte untouched. Pairs with
    the delete path by design: deleting a project's last document leaves this
    landing behind, but a project dir with only ``index.md`` has zero countable
    docs, so ``discover_projects`` no longer lists it and the gate is unaffected —
    no delete-side cleanup is needed.
    """
    landing = Path(docs_root) / project / "index.md"
    if landing.exists():
        return False
    landing.parent.mkdir(parents=True, exist_ok=True)
    landing.write_text(project_landing_content(project), encoding="utf-8")
    return True


# --- Recent-marker removal (S2 delete path, symmetric to insertion) ------


def remove_recent_bullet(index_text: str, rel_path: str) -> tuple[str, bool]:
    """Drop the Recent bullet line(s) referencing ``rel_path``. Pure function (no I/O).

    Matches any line containing the markdown-link suffix ``](<rel_path>)`` — the
    exact shape `format_recent_bullet` emits — so it also cleans up a bullet left
    by any insertion mechanism (marker/heading/appended). Returns
    ``(new_text, removed)``: ``removed`` is ``False`` (text unchanged) when no
    line references ``rel_path``.
    """
    needle = f"]({rel_path})"
    lines = index_text.split("\n")
    kept = [line for line in lines if needle not in line]
    if len(kept) == len(lines):
        return index_text, False
    return "\n".join(kept), True


def remove_from_recent_index(docs_root: Union[str, Path], rel_path: str) -> bool:
    """Remove the doc's Recent bullet from ``docs/index.md``; returns ``recent_removed``.

    ``False`` (index left untouched, nothing written) when the index file is
    missing or no bullet references ``rel_path`` — symmetric to
    ``update_recent_index``'s no-op case.
    """
    index_path = Path(docs_root) / "index.md"
    if not index_path.exists():
        return False
    text = index_path.read_text(encoding="utf-8")
    new_text, removed = remove_recent_bullet(text, rel_path)
    if removed:
        index_path.write_text(new_text, encoding="utf-8")
    return removed
