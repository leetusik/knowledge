#!/usr/bin/env python3
"""Explain-skill drift guard (P17.S2) — ROOT-ONLY; never shipped in the payload.

The explain skill lives in two shipped copies: the plugin canonical
``plugin/skills/explain/SKILL.md`` and the portable ``.agents/skills/explain/SKILL.md``
(Claude-plugin frontmatter vs. no ``argument-hint``/``allowed-tools``). Their *bodies*
must stay byte-identical — the copies are a structural derivation of the same canonical
prose, differing only in the leading YAML frontmatter block. This proves they cannot
silently diverge (there was no such guard before P17). Sibling to
``scripts/plugin_parity.py``; run in CI via ``.github/workflows/plugin-ci.yml``.

Checks:
  * BODY (FAIL) — strip the leading ``---`` frontmatter block from each file and
    byte-compare the remainder; any mismatch fails.
  * DESCRIPTION (WARN) — compare the ``description:`` frontmatter value of each; a
    mismatch prints a warning but still exits 0 (unless the body also mismatched).
  * MISSING (FAIL) — either file absent fails with a clear message.
"""

from __future__ import annotations

import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
CANONICAL = REPO_ROOT / "plugin" / "skills" / "explain" / "SKILL.md"
PORTABLE = REPO_ROOT / ".agents" / "skills" / "explain" / "SKILL.md"


def split_frontmatter(text: str) -> tuple[str, str]:
    """Return (frontmatter_block, body) splitting the leading ``---`` YAML block."""
    if text.startswith("---\n"):
        end = text.find("\n---\n", 3)
        if end != -1:
            return text[: end + len("\n---\n")], text[end + len("\n---\n") :]
    return "", text


def description_of(frontmatter: str) -> str | None:
    for line in frontmatter.splitlines():
        if line.startswith("description:"):
            return line[len("description:") :].strip()
    return None


def main() -> int:
    for path in (CANONICAL, PORTABLE):
        if not path.is_file():
            try:
                shown = path.relative_to(REPO_ROOT)
            except ValueError:
                shown = path
            print(f"FAIL — explain skill copy missing: {shown}")
            return 1

    canon_fm, canon_body = split_frontmatter(CANONICAL.read_text(encoding="utf-8"))
    port_fm, port_body = split_frontmatter(PORTABLE.read_text(encoding="utf-8"))

    if canon_body.encode() != port_body.encode():
        print(
            "FAIL — explain skill bodies drifted between "
            "plugin/skills/explain/SKILL.md and .agents/skills/explain/SKILL.md."
        )
        return 1

    if description_of(canon_fm) != description_of(port_fm):
        print(
            "WARN — explain skill description values differ between the two copies "
            "(bodies are in sync)."
        )

    print("PASS — explain skill copies are in body parity.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
