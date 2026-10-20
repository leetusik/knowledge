"""Id syntax, assignment and uniqueness (P29 *Ids*).

* Syntax: ``[a-z0-9][a-z0-9-]{0,63}``.
* The document namespace (unique per document): h2-h4 headings, every typed
  block, an authored code-block id, every quiz item and every sources item.
  Quiz *option* ids are scoped to their item (the signed quiz round's
  ``answer: [b]``), and diagram node/group/actor ids to their diagram.
* Assignment, for a heading or typed block that has no id: the slug of an
  ASCII heading (``## Sources`` takes ``sources-list``, the ``figures`` 9
  detail), else ``s-<n>`` for a heading and ``<type>-<n>`` for a typed block,
  with ``n`` the smallest positive integer whose id is free. A slug collision
  takes ``-2``, ``-3`` ... Ids passed as ``reserved`` (S5: the retired ids of
  earlier versions) are never handed out. Quiz item, option and sources item
  ids are required in the YAML, so ``item-<n>`` is never minted.
"""
from __future__ import annotations

import re
from typing import Iterable, Optional

ID_RE = re.compile(r"^[a-z0-9][a-z0-9-]{0,63}$")
ID_MAX = 64


def is_valid_id(value) -> bool:
    return isinstance(value, str) and bool(ID_RE.fullmatch(value))


def heading_slug(text: str) -> Optional[str]:
    """The assigned id of an ASCII heading, or None (non-ASCII or empty)."""
    if not text.isascii():
        return None
    slug = re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")
    if len(slug) > ID_MAX:
        slug = slug[:ID_MAX].rstrip("-")
    if not slug:
        return None
    if slug == "sources":
        return "sources-list"
    return slug


class IdRegistry:
    """Tracks the document namespace. Authored ids are claimed first, in source
    order; ids are assigned afterwards, in source order, around them."""

    def __init__(self, reserved: Iterable[str] = ()):
        self.taken: set[str] = set(reserved)
        self.document: list[str] = []  # authored + assigned, in claim order
        self._members: set[str] = set()

    def claim(self, value: str) -> bool:
        if value in self._members:
            return False
        self._take(value)
        return True

    def __contains__(self, value: str) -> bool:
        return value in self._members

    def _free(self, candidate: str) -> bool:
        return candidate not in self.taken

    def assign_slug(self, slug: str) -> str:
        if self._free(slug):
            return self._take(slug)
        n = 2
        while True:
            suffix = f"-{n}"
            candidate = slug[: ID_MAX - len(suffix)].rstrip("-") + suffix
            if self._free(candidate):
                return self._take(candidate)
            n += 1

    def assign_numbered(self, prefix: str) -> str:
        n = 1
        while not self._free(f"{prefix}-{n}"):
            n += 1
        return self._take(f"{prefix}-{n}")

    def _take(self, value: str) -> str:
        self.taken.add(value)
        self._members.add(value)
        self.document.append(value)
        return value
