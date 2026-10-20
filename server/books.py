"""Books and chapters (P30.S2): the on-disk book manifest and its validators.

The model is P29.S1's: ``Book 1─* Chapter 1─* Variant(lang) = one Document``. A
**book** is an ordered list of **chapters**; a chapter is a thin entry that points
at one document per language. Documents are unchanged — membership lives only in
the manifest, so binding a document never rewrites its file.

**The manifest is canonical, the SQLite rows derived.** One JSON file per book,

    <root>/.books/<project>/<book>.json

under the tenant's content root (``docs/`` for tenant #1 / legacy, which commits it
with its chapter; ``tenants/<uuid>/`` otherwise, uncommitted). Its shape is exactly
P29's *Book* plus *Chapter*::

    {
      "slug": "phases",
      "title": "knowledge, phase by phase",
      "kind": "codebase",                      # codebase | subject
      "subject": null,                         # required for kind=subject
      "description": null,
      "chapters": [
        {"key": "p8", "position": 8, "title": "P8: ...",
         "variants": {"en": "knowledge/2026-...-p8.html", "ko": "knowledge/...-ko.md"},
         "source": {"phase": "P8"}}
      ]
    }

``variants`` maps a BCP-47 primary subtag to the document's ``rel_path`` (relative
to the content root). Chapters are kept sorted by ``position`` (a JSON number;
ties broken by ``key``). ``server/reindex.py`` rebuilds the ``books`` /
``chapters`` / ``chapter_variants`` tables from these files alone, so a DB wipe
loses nothing.

The dot-prefixed ``.books`` directory follows ``.versions`` (P23): the document
walkers skip it (``reindex.RESERVED_DIRS``; it holds no ``*.md`` either) and mkdocs
never builds dot-prefixed paths.
"""
from __future__ import annotations

import json
import math
import os
import re
import tempfile
from pathlib import Path, PurePosixPath
from typing import Any, Iterator, Optional, Union

from server.documents import ConventionError, validate_project

BOOKS_DIR = ".books"

BOOK_KINDS = ("codebase", "subject")

# Book slugs and chapter keys share the doc-slug charset: `[a-z0-9-]`, kebab.
_KEY_RE = re.compile(r"^[a-z0-9]+(-[a-z0-9]+)*$")
_KEY_MAX = 80
# A BCP-47 primary language subtag (`en`, `ko`, `fil`). Lowercase only, so the
# manifest key, the header and the URL `?lang=` never disagree on case.
_LANG_RE = re.compile(r"^[a-z]{2,3}$")
_TITLE_MAX = 300
_SOURCE_MAX_KEYS = 8

DEFAULT_LANG = "en"


# --- validators -----------------------------------------------------------


def validate_book_slug(slug: Any) -> str:
    if not isinstance(slug, str) or len(slug) > _KEY_MAX or not _KEY_RE.fullmatch(slug):
        raise ConventionError(f"invalid book slug: {slug!r}")
    return slug


def validate_chapter_key(key: Any) -> str:
    if not isinstance(key, str) or len(key) > _KEY_MAX or not _KEY_RE.fullmatch(key):
        raise ConventionError(f"invalid chapter key: {key!r}")
    return key


def validate_lang(lang: Any) -> str:
    if not isinstance(lang, str) or not _LANG_RE.fullmatch(lang):
        raise ConventionError(
            f"invalid lang (expected a lowercase BCP-47 primary subtag): {lang!r}"
        )
    return lang


def validate_kind(kind: Any) -> str:
    if kind not in BOOK_KINDS:
        raise ConventionError(f"invalid book kind: {kind!r} (expected codebase|subject)")
    return kind


def validate_text(value: Any, what: str, *, required: bool) -> Optional[str]:
    if value is None:
        if required:
            raise ConventionError(f"{what} is required")
        return None
    if not isinstance(value, str) or not value.strip():
        raise ConventionError(f"invalid {what}: {value!r}")
    if len(value) > _TITLE_MAX:
        raise ConventionError(f"{what} is longer than {_TITLE_MAX} characters")
    return value


def validate_subject(subject: Any) -> Optional[str]:
    """A subject display label (``"Finance"``), or ``None``."""
    return validate_text(subject, "subject", required=False)


def validate_position(position: Any) -> Union[int, float]:
    # bool is an int subclass; a JSON true/false is never a position.
    if isinstance(position, bool) or not isinstance(position, (int, float)):
        raise ConventionError(f"invalid chapter position: {position!r}")
    if isinstance(position, float) and not math.isfinite(position):
        raise ConventionError(f"invalid chapter position: {position!r}")
    # 8.0 and 8 are the same position; keep integral values integral so the
    # manifest stays as written (`"position": 8`).
    if isinstance(position, float) and position.is_integer():
        return int(position)
    return position


def validate_source(source: Any) -> Optional[dict[str, str]]:
    """A chapter's ``source`` (``{"phase": "P8"}``): a small string-to-string map."""
    if source is None:
        return None
    if not isinstance(source, dict) or len(source) > _SOURCE_MAX_KEYS:
        raise ConventionError(f"invalid chapter source: {source!r}")
    out: dict[str, str] = {}
    for k, v in source.items():
        if not isinstance(k, str) or not k or not isinstance(v, str) or not v:
            raise ConventionError(f"invalid chapter source: {source!r}")
        if len(k) > _KEY_MAX or len(v) > _TITLE_MAX:
            raise ConventionError(f"invalid chapter source: {source!r}")
        out[k] = v
    return out


def validate_variant_rel_path(rel_path: Any, project: str) -> str:
    """A bound document's rel_path: ``<project>/<file>.{md,html}``, in this book's
    project (a book never spans projects: visibility is per project)."""
    if not isinstance(rel_path, str) or not rel_path:
        raise ConventionError(f"invalid variant rel_path: {rel_path!r}")
    p = PurePosixPath(rel_path)
    if p.is_absolute() or ".." in p.parts or len(p.parts) < 2:
        raise ConventionError(f"invalid variant rel_path: {rel_path!r}")
    if p.parts[0] != project:
        raise ConventionError(
            f"variant {rel_path!r} is not in project {project!r} "
            "(a book never spans projects)"
        )
    if p.suffix not in (".md", ".html"):
        raise ConventionError(f"invalid variant rel_path: {rel_path!r}")
    return rel_path


def validate_translated_from(value: Any) -> Optional[dict[str, Any]]:
    """``{lang, version}`` — the original a translated variant was made from."""
    if value is None:
        return None
    if not isinstance(value, dict) or set(value) != {"lang", "version"}:
        raise ConventionError(
            f"invalid translated_from (expected {{lang, version}}): {value!r}"
        )
    version = value["version"]
    if isinstance(version, bool) or not isinstance(version, int) or version < 1:
        raise ConventionError(f"invalid translated_from version: {version!r}")
    return {"lang": validate_lang(value["lang"]), "version": version}


# --- manifest normalization ------------------------------------------------


def sort_chapters(chapters: list[dict]) -> list[dict]:
    """Ascending ``position``; ties broken by ``key`` (P29 *Chapter*)."""
    return sorted(chapters, key=lambda c: (c["position"], c["key"]))


def normalize_chapter(raw: Any, project: str) -> dict[str, Any]:
    if not isinstance(raw, dict):
        raise ConventionError(f"invalid chapter: {raw!r}")
    unknown = set(raw) - {"key", "position", "title", "variants", "source"}
    if unknown:
        raise ConventionError(f"unknown chapter field(s): {sorted(unknown)}")
    key = validate_chapter_key(raw.get("key"))
    if "position" not in raw:
        raise ConventionError(f"chapter {key!r}: position is required")
    position = validate_position(raw.get("position"))
    title = validate_text(raw.get("title"), f"chapter {key!r} title", required=False)
    variants_raw = raw.get("variants")
    if not isinstance(variants_raw, dict) or not variants_raw:
        raise ConventionError(f"chapter {key!r}: variants must be a non-empty object")
    variants: dict[str, str] = {}
    for lang in sorted(variants_raw):
        variants[validate_lang(lang)] = validate_variant_rel_path(
            variants_raw[lang], project
        )
    chapter: dict[str, Any] = {"key": key, "position": position}
    if title is not None:
        chapter["title"] = title
    chapter["variants"] = variants
    source = validate_source(raw.get("source"))
    if source is not None:
        chapter["source"] = source
    return chapter


def normalize_manifest(raw: Any, *, project: str) -> dict[str, Any]:
    """Validate a manifest and return it in canonical form, or raise ``ConventionError``.

    Canonical form: the fixed field order of the docstring above, ``subject`` and
    ``description`` always present (``null`` when unset), chapters sorted, each
    chapter's variants sorted by language, absent optional chapter fields omitted.
    Enforces P29's invariants: keys unique in the book, the book's documents all in
    its own project, and **each document in at most one chapter** (no rel_path bound
    twice in one book; across books is the caller's index check).
    """
    validate_project(project)
    if not isinstance(raw, dict):
        raise ConventionError("a book manifest must be a JSON object")
    unknown = set(raw) - {"slug", "title", "kind", "subject", "description", "chapters"}
    if unknown:
        raise ConventionError(f"unknown book field(s): {sorted(unknown)}")
    slug = validate_book_slug(raw.get("slug"))
    title = validate_text(raw.get("title"), "book title", required=True)
    kind = validate_kind(raw.get("kind"))
    subject = validate_subject(raw.get("subject"))
    if kind == "subject" and subject is None:
        raise ConventionError("a subject book needs a subject")
    description = validate_text(raw.get("description"), "book description", required=False)
    chapters_raw = raw.get("chapters", [])
    if not isinstance(chapters_raw, list):
        raise ConventionError("chapters must be a list")
    chapters = [normalize_chapter(c, project) for c in chapters_raw]
    seen_keys: set[str] = set()
    seen_paths: dict[str, str] = {}
    for c in chapters:
        if c["key"] in seen_keys:
            raise ConventionError(f"duplicate chapter key: {c['key']!r}")
        seen_keys.add(c["key"])
        for rel in c["variants"].values():
            if rel in seen_paths:
                raise ConventionError(
                    f"{rel!r} is bound twice (chapters {seen_paths[rel]!r} and "
                    f"{c['key']!r}); a document belongs to at most one chapter"
                )
            seen_paths[rel] = c["key"]
    return {
        "slug": slug,
        "title": title,
        "kind": kind,
        "subject": subject,
        "description": description,
        "chapters": sort_chapters(chapters),
    }


def next_position(manifest: dict) -> int:
    """Where a new chapter with no ``position`` goes: appended at max + 1."""
    positions = [c["position"] for c in manifest.get("chapters", [])]
    return int(math.floor(max(positions))) + 1 if positions else 1


# --- disk -------------------------------------------------------------------


def manifest_rel_path(project: str, slug: str) -> str:
    """``.books/<project>/<slug>.json`` relative to the tenant's content root."""
    return f"{BOOKS_DIR}/{project}/{slug}.json"


def serialize_manifest(manifest: dict) -> str:
    """Deterministic JSON text (2-space indent, UTF-8 kept, trailing newline), so
    re-writing an unchanged manifest is a byte-for-byte no-op in git."""
    return json.dumps(manifest, ensure_ascii=False, indent=2) + "\n"


def read_manifest(root: Union[str, Path], project: str, slug: str) -> Optional[dict]:
    """The canonical manifest of ``(project, slug)``, or ``None`` when absent.

    Raises ``ConventionError`` for a manifest that exists but is malformed — the
    write path then refuses to build on it rather than guessing.
    """
    path = Path(root) / manifest_rel_path(project, slug)
    if not path.is_file():
        return None
    try:
        raw = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, UnicodeDecodeError, json.JSONDecodeError) as exc:
        raise ConventionError(f"unreadable book manifest {path.name}: {exc}")
    manifest = normalize_manifest(raw, project=project)
    if manifest["slug"] != slug:
        raise ConventionError(
            f"book manifest {path.name} names slug {manifest['slug']!r}"
        )
    return manifest


def write_manifest(root: Union[str, Path], project: str, manifest: dict) -> str:
    """Write a (normalized) manifest atomically; return its root-relative path.

    Call inside ``WRITE_LOCK``. Temp file + ``os.replace`` in the same directory,
    so a reader (or a crash) never sees a half-written manifest.
    """
    manifest = normalize_manifest(manifest, project=project)
    rel = manifest_rel_path(project, manifest["slug"])
    target = Path(root) / rel
    target.parent.mkdir(parents=True, exist_ok=True)
    fd, tmp = tempfile.mkstemp(prefix=".tmp-", suffix=".json", dir=str(target.parent))
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as fh:
            fh.write(serialize_manifest(manifest))
        os.replace(tmp, target)
    except BaseException:
        try:
            os.unlink(tmp)
        except OSError:
            pass
        raise
    return rel


def iter_manifest_files(root: Union[str, Path]) -> Iterator[tuple[str, str, Path]]:
    """``(project, slug, path)`` for every ``.books/<project>/<slug>.json``, sorted."""
    books_root = Path(root) / BOOKS_DIR
    if not books_root.is_dir():
        return
    for pdir in sorted(books_root.iterdir()):
        if not pdir.is_dir():
            continue
        for path in sorted(pdir.glob("*.json")):
            if path.is_file() and not path.name.startswith("."):
                yield pdir.name, path.stem, path


def find_chapter(manifest: dict, key: str) -> Optional[dict]:
    for c in manifest.get("chapters", []):
        if c["key"] == key:
            return c
    return None


def find_binding(manifest: dict, rel_path: str) -> Optional[tuple[str, str]]:
    """``(chapter key, lang)`` binding ``rel_path`` in this manifest, or ``None``."""
    for c in manifest.get("chapters", []):
        for lang, rel in c["variants"].items():
            if rel == rel_path:
                return c["key"], lang
    return None
