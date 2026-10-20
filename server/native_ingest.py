"""Native ingest (P30.S5): what ``POST /api/documents`` and reindex do with a
``format: native`` chapter beyond parsing it.

``server/native/`` is the pure parser (S3). This module adds the parts that need
storage or a policy:

* **The body limit for every format** (P29 *Limits*: "P30 should add one for
  every format"). ``native`` is P29's 512 KB. ``md`` takes the same 512 KB (the
  largest md document in the library is about 17 KB, and an md chapter becomes a
  native one by an ordinary next version). ``html`` takes 1 MB: a legacy explainer
  carries its own CSS, scripts and inline SVG, and the largest one is about 113 KB.
  The limit counts the UTF-8 bytes of the ``markdown`` field.
* **Reference resolution** (P29 *References*): an ``asset:`` name (an inline image,
  a figure's ``src`` or a figure-row image) must name an asset of THIS publish, else
  a 422 (``ref-unknown-asset``); a ``chapter:`` or ``doc:`` miss is a warning
  (``ref-unresolved``), because a series may link forward; ``#id`` is already
  resolved by the parser (``ref-missing-id``).
* **Translations** (P29 *Ids*): a publish with ``translated_from`` must carry the
  same quiz item and option id sets as that source version (else a 422,
  ``translation-quiz-ids``); heading and block id differences are warnings
  (``translation-ids``). A source that cannot be found, or is not native, is a
  ``translation-source-missing`` warning.
* **Retired ids**: every id of every earlier native version of the document, which
  the parser never mints again.
* **The stored projection**: the DB ``markdown`` column of a native document holds
  ``search_text`` (what FTS5 and the embeddings read); ``source`` holds the file.

Every violation and warning has S3's shape: ``{line, col, code, message[, block]}``.
``remap_lines`` turns a file line into a line of the body the caller sent (the
server writes the header, so the caller never saw it); a line inside the header,
or a finding about the whole document, is ``0``.
"""
from __future__ import annotations

import re
import sqlite3
from typing import Iterable, Optional

from server import db
from server.native import NativeFormatError, parse_chapter, search_text
from server.native import schema as native_schema

BODY_LIMITS = {
    "md": 512 * 1024,
    "html": 1024 * 1024,
    "native": native_schema.MAX_BODY_BYTES,
}


def _finding(line: int, code: str, message: str, **extra) -> dict:
    out = {"line": line, "col": 1 if line else 0, "code": code, "message": message}
    out.update({k: v for k, v in extra.items() if v is not None})
    return out


def body_limit_violations(fmt: str, body: Optional[str]) -> list[dict]:
    """``[body-too-large]`` when the body is over its format's limit, else ``[]``."""
    size = len((body or "").encode("utf-8"))
    limit = BODY_LIMITS[fmt]
    if size <= limit:
        return []
    return [{
        "line": 0, "col": 0, "code": "body-too-large",
        "message": f"a {fmt} body is at most {limit // 1024} KB; this one is {size} bytes",
    }]


def remap_lines(items: Iterable[dict], offset: int) -> list[dict]:
    """File lines -> lines of the body as sent (``0`` = the header / the document)."""
    out = []
    for item in items:
        line = int(item.get("line") or 0)
        mapped = line - offset if line > offset else 0
        new = dict(item, line=mapped)
        if mapped == 0 and "col" in new:
            new["col"] = 0
        out.append(new)
    return out


# --- the stored projection (write path + reindex) -----------------------------


def stored_projection(source: str) -> str:
    """The DB ``markdown`` of a stored native file: its search projection.

    A file that no longer parses (a hand edit on disk) still gets indexed, by its
    raw body, so a reindex never drops a document from search over a typo.
    """
    try:
        return search_text(parse_chapter(source).tree)
    except NativeFormatError:
        lines = source.split("\n")
        if lines and lines[0].rstrip() == "---":
            end = next((i for i in range(1, len(lines)) if lines[i].rstrip() == "---"), None)
            if end is not None:
                return "\n".join(lines[end + 1:]).strip("\n")
        return source


def document_ids(source: Optional[str]) -> set[str]:
    """The document-namespace ids of a stored native file (``set()`` if unparsable)."""
    if not source:
        return set()
    try:
        return set(parse_chapter(source).ids)
    except NativeFormatError:
        return set()


def retired_ids(
    conn: sqlite3.Connection, doc: dict, *, tenant_id: Optional[str]
) -> set[str]:
    """Every id the document's earlier native versions used: the current row and
    every archived version. The parser never mints one of them again (P29 *Ids*:
    "a retired id is never reused"); an author may still keep one."""
    ids: set[str] = set()
    if (doc.get("format") or "md") == "native":
        ids |= document_ids(doc.get("source"))
    for row in db.list_document_versions(conn, doc["rel_path"], tenant_id=tenant_id):
        if row.get("format") == "native":
            ids |= document_ids(row.get("source"))
    return ids


# --- references --------------------------------------------------------------

_FENCE_ID_RE = re.compile(r"^\s{0,3}(`{3,}|~{3,}).*\s#([a-z0-9][a-z0-9-]*)\s*$")


def _fence_lines(source: str) -> dict[str, int]:
    """``{block id: file line}`` for every fence line that carries a ``#id``."""
    out: dict[str, int] = {}
    for i, line in enumerate(source.split("\n"), start=1):
        m = _FENCE_ID_RE.match(line)
        if m and m.group(2) not in out:
            out[m.group(2)] = i
    return out


def asset_uses(result) -> list[tuple[str, int, Optional[str]]]:
    """``(name, file line, block id)`` for every asset a parsed chapter names: inline
    ``![](asset:name)`` images, a figure's ``src`` and each figure-row image."""
    uses: list[tuple[str, int, Optional[str]]] = []
    for ref in result.refs:
        if ref.get("kind") == "asset":
            uses.append((ref["name"], int(ref.get("line") or 0), None))
    fences = _fence_lines(result.source)
    for block in result.tree.get("blocks", []):
        line = fences.get(block.get("id") or "", 0)
        if block.get("type") == "figure" and block.get("src"):
            uses.append((block["src"], line, block.get("id")))
        elif block.get("type") == "figures":
            for item in block.get("items") or []:
                if item.get("kind") == "image" and item.get("src"):
                    uses.append((item["src"], line, block.get("id")))
    return uses


def unknown_assets(
    uses: Iterable[tuple[str, int, Optional[str]]], asset_names: set[str]
) -> list[dict]:
    """A ``ref-unknown-asset`` 422 entry for every use of a name this publish lacks."""
    return [
        _finding(
            line, "ref-unknown-asset",
            f"asset {name!r} is not one of this publish's assets "
            "(send it in `assets`; a new version inherits none)",
            block=block,
        )
        for name, line, block in uses
        if name not in asset_names
    ]


def failed_parse_asset_uses(exc: NativeFormatError) -> list[tuple[str, int, Optional[str]]]:
    """The inline ``asset:`` uses a FAILED parse read before it stopped, so their
    misses still join the one 422 list (figure sources need the tree, which a failed
    parse never builds)."""
    return [
        (ref["name"], int(ref.get("line") or 0), None)
        for ref in getattr(exc, "refs", None) or []
        if ref.get("kind") == "asset"
    ]


def resolve_refs(
    conn: sqlite3.Connection,
    result,
    *,
    asset_names: set[str],
    project: str,
    tenant_id: Optional[str],
    self_chapter: Optional[tuple[str, str, str]] = None,
    self_slug: Optional[tuple[str, str]] = None,
) -> tuple[list[dict], list[dict]]:
    """Resolve a parsed chapter's references. Returns ``(errors, warnings)`` in file
    lines. ``self_chapter`` ``(project, book, key)`` and ``self_slug`` ``(project,
    slug)`` are the publish's own identity, which resolves even before it is indexed.
    """
    errors: list[dict] = unknown_assets(asset_uses(result), asset_names)
    warnings: list[dict] = []
    for ref in result.refs:
        kind = ref.get("kind")
        line = int(ref.get("line") or 0)
        if kind == "chapter":
            proj = ref.get("project") or project
            if self_chapter == (proj, ref["book"], ref["key"]):
                continue
            if not db.chapter_variant_exists(
                conn, tenant_id=tenant_id, project=proj, book=ref["book"], key=ref["key"],
                lang=ref.get("lang"),
            ):
                warnings.append(_finding(
                    line, "ref-unresolved",
                    f"{ref['href']} names no chapter yet; it renders as a missing link "
                    "until that chapter is published",
                ))
        elif kind == "doc":
            proj = ref.get("project") or project
            if self_slug == (proj, ref["slug"]):
                continue
            if db.find_latest_document_by_slug(conn, proj, ref["slug"], tenant_id=tenant_id) is None:
                warnings.append(_finding(
                    line, "ref-unresolved",
                    f"{ref['href']} names no document yet; it renders as a missing link "
                    "until that document is published",
                ))
    return errors, warnings


# --- translations --------------------------------------------------------------


def quiz_id_sets(tree: dict) -> dict[str, frozenset]:
    """``{quiz item id: frozenset(option ids)}`` over every quiz in the chapter."""
    out: dict[str, frozenset] = {}
    for block in tree.get("blocks", []):
        if block.get("type") != "quiz":
            continue
        for item in block.get("items") or []:
            out[item["id"]] = frozenset(o["id"] for o in item.get("options") or [])
    return out


def block_ids(tree: dict) -> set[str]:
    """The ids of the chapter's id'd top-level blocks (headings, typed blocks, code)."""
    return {b["id"] for b in tree.get("blocks", []) if b.get("id")}


def _listing(values) -> str:
    return ", ".join(sorted(values)) or "none"


def translation_check(tree: dict, source_tree: dict, *, source_label: str) -> tuple[list[dict], list[dict]]:
    """Compare a translation's ids with its source version's (P29 *Ids*)."""
    errors: list[dict] = []
    warnings: list[dict] = []
    mine, theirs = quiz_id_sets(tree), quiz_id_sets(source_tree)
    if mine != theirs:
        missing = set(theirs) - set(mine)
        extra = set(mine) - set(theirs)
        options = sorted(k for k in set(mine) & set(theirs) if mine[k] != theirs[k])
        errors.append(_finding(
            0, "translation-quiz-ids",
            f"a translation keeps its source's quiz item and option ids ({source_label}): "
            f"missing items {_listing(missing)}; extra items {_listing(extra)}; "
            f"items whose options differ {_listing(options)}",
        ))
    b_mine, b_theirs = block_ids(tree), block_ids(source_tree)
    if b_mine != b_theirs:
        warnings.append(_finding(
            0, "translation-ids",
            f"heading and block ids differ from {source_label}: "
            f"missing {_listing(b_theirs - b_mine)}; extra {_listing(b_mine - b_theirs)}",
        ))
    return errors, warnings


def translation_source(
    conn: sqlite3.Connection, rel_path: Optional[str], version: int, *, tenant_id: Optional[str]
) -> Optional[str]:
    """The stored native source of ``rel_path`` at ``version`` (current or archived),
    or ``None`` when there is no such version or it is not native."""
    if not rel_path:
        return None
    doc = db.get_document_by_path(conn, rel_path, tenant_id=tenant_id)
    if doc is None:
        return None
    if int(doc.get("version") or 1) == int(version):
        row = doc
    else:
        row = db.get_document_version(conn, doc["rel_path"], version, tenant_id=tenant_id)
    if row is None or row.get("format") != "native":
        return None
    return row.get("source")


def translation_findings(
    conn: sqlite3.Connection,
    tree: dict,
    *,
    source_rel_path: Optional[str],
    translated_from: dict,
    tenant_id: Optional[str],
) -> tuple[list[dict], list[dict]]:
    """``translation_check`` against the source variant, or one warning when the
    source version cannot be compared."""
    label = f"{translated_from['lang']} v{translated_from['version']}"
    src = translation_source(conn, source_rel_path, translated_from["version"], tenant_id=tenant_id)
    if src is not None:
        try:
            return translation_check(tree, parse_chapter(src).tree, source_label=label)
        except NativeFormatError:
            pass
    return [], [_finding(
        0, "translation-source-missing",
        f"the translation's source ({label}) is not a stored native version of this "
        "chapter, so its ids were not compared",
    )]
