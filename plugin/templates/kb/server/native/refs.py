"""Reference syntax (P29 *References*). Syntax only: S5 resolves ``asset:``,
``chapter:`` and ``doc:`` against storage; the parser itself resolves ``#id``.

Every link or image URL must be one of:

* ``#<id>`` - in-chapter;
* ``http://`` / ``https://`` with a host - external (links only: an external
  image is rejected);
* ``asset:<name>`` - an image only (a link to an asset is rejected);
* ``chapter:[<project>/]<book>/<key>[?lang=<xx>][#<id>]``;
* ``doc:[<project>/]<slug>``.

Anything else (``mailto:``, ``javascript:``, relative paths, ``data:`` ...) is
rejected.
"""
from __future__ import annotations

import re
from urllib.parse import urlsplit

from server.books import validate_book_slug, validate_chapter_key, validate_lang
from server.documents import ConventionError, validate_project, validate_slug

from .ids import is_valid_id

# An asset name: what a figure's ``src`` and ``asset:<name>`` carry (S4 keys the
# version's ``assets`` map by it).
ASSET_NAME_RE = re.compile(r"^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$")

_CHAPTER_RE = re.compile(r"^chapter:([^?#]+)(?:\?lang=([^#]*))?(?:#(.*))?$")
_DOC_RE = re.compile(r"^doc:([^?#]+)$")


class RefError(Exception):
    def __init__(self, code: str, message: str):
        super().__init__(message)
        self.code = code
        self.message = message


def is_asset_name(value) -> bool:
    return isinstance(value, str) and bool(ASSET_NAME_RE.match(value))


def _ok(fn, value) -> bool:
    try:
        fn(value)
        return True
    except ConventionError:
        return False


def parse_ref(href: str, *, image: bool = False) -> dict:
    """Classify ``href``; raise ``RefError`` when it is outside the contract."""
    if href.startswith("#"):
        if image:
            raise RefError("ref-scheme", f"an image must be asset:<name>, not {href!r}")
        target = href[1:]
        if not is_valid_id(target):
            raise RefError("ref-malformed", f"malformed in-chapter reference {href!r}")
        return {"kind": "id", "id": target}
    if href.startswith("asset:"):
        name = href[len("asset:"):]
        if not is_asset_name(name):
            raise RefError("ref-malformed", f"malformed asset name in {href!r}")
        if not image:
            raise RefError("ref-asset-link", f"asset:{name} may only be an image, not a link")
        return {"kind": "asset", "name": name}
    if href.startswith("chapter:"):
        if image:
            raise RefError("ref-scheme", f"an image must be asset:<name>, not {href!r}")
        m = _CHAPTER_RE.match(href)
        if not m:
            raise RefError("ref-malformed", f"malformed chapter reference {href!r}")
        parts = m.group(1).split("/")
        lang, frag = m.group(2), m.group(3)
        project = None
        if len(parts) == 3:
            project, book, key = parts
        elif len(parts) == 2:
            book, key = parts
        else:
            raise RefError("ref-malformed", f"malformed chapter reference {href!r}")
        if (
            (project is not None and not _ok(validate_project, project))
            or not _ok(validate_book_slug, book)
            or not _ok(validate_chapter_key, key)
            or (lang is not None and not _ok(validate_lang, lang))
            or (frag is not None and not is_valid_id(frag))
        ):
            raise RefError("ref-malformed", f"malformed chapter reference {href!r}")
        return {"kind": "chapter", "project": project, "book": book, "key": key,
                "lang": lang, "id": frag}
    if href.startswith("doc:"):
        if image:
            raise RefError("ref-scheme", f"an image must be asset:<name>, not {href!r}")
        m = _DOC_RE.match(href)
        parts = m.group(1).split("/") if m else []
        if len(parts) == 2:
            project, slug = parts
        elif len(parts) == 1:
            project, slug = None, parts[0]
        else:
            raise RefError("ref-malformed", f"malformed doc reference {href!r}")
        if (project is not None and not _ok(validate_project, project)) or not _ok(validate_slug, slug):
            raise RefError("ref-malformed", f"malformed doc reference {href!r}")
        return {"kind": "doc", "project": project, "slug": slug}
    try:
        split = urlsplit(href)
    except ValueError:
        split = None
    if split is not None and split.scheme.lower() in ("http", "https") and split.netloc:
        if image:
            raise RefError("ref-external-image", f"external images are not allowed ({href!r})")
        return {"kind": "external", "url": href}
    if image:
        raise RefError("ref-scheme", f"an image must be asset:<name>, not {href!r}")
    raise RefError("ref-scheme", f"links must be #id, http(s):, chapter: or doc:, not {href!r}")
