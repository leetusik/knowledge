"""Fixture formats for the shared conformance suite (``tests/fixtures/native/``).

* ``<case>.json`` - ``json.dumps(tree, indent=2, ensure_ascii=False, sort_keys=True)`` + newline;
* ``<case>.txt`` - ``project.format_sections(project.sections(tree))``;
* ``<case>.err`` - one ``<line> <code>`` line per distinct (line, code) pair among the
  violations, sorted by line then code. (Two raw tags on one line are one row, so a
  parser that reports per tag and one that reports per line agree.)
"""
from __future__ import annotations

import json

from .errors import NativeFormatError


def format_tree(tree: dict) -> str:
    return json.dumps(tree, indent=2, ensure_ascii=False, sort_keys=True) + "\n"


def format_errors(error: NativeFormatError) -> str:
    rows = sorted({(v.line, v.code) for v in error.violations})
    return "".join(f"{line} {code}\n" for line, code in rows)
