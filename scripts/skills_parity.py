#!/usr/bin/env python3
"""Explain-skill drift guard (P17.S2; P20.S3) — ROOT-ONLY; never shipped in the payload.

The explain skill lives in three shipped copies: the plugin canonical
``plugin/skills/explain/SKILL.md``, the portable ``.agents/skills/explain/SKILL.md``
(Claude-plugin frontmatter vs. no ``argument-hint``/``allowed-tools``), and — new in
P20.S3 — the landing-served copy ``web/public/SKILL.md`` (published at ``/SKILL.md``
for the skill-on-landing section's Download + Copy). The two skill copies' *bodies*
must stay byte-identical — a structural derivation of the same canonical prose,
differing only in the leading YAML frontmatter block; the WEB copy is a straight
publish of the canonical file, so it is held to the stricter **full-file** byte match
(frontmatter included). This proves they cannot silently diverge (there was no such
guard before P17; the WEB gate keeps the landing artifact from ever forking). Sibling
to ``scripts/plugin_parity.py``; run in CI via ``.github/workflows/plugin-ci.yml``.

Checks:
  * BODY (FAIL) — strip the leading ``---`` frontmatter block from the plugin +
    portable copies and byte-compare the remainder; any mismatch fails.
  * WEB (FAIL) — full-file byte-compare ``web/public/SKILL.md`` against the canonical
    (frontmatter included — it is a published copy, not a reframed derivation).
  * DESCRIPTION (WARN) — compare the ``description:`` frontmatter value of the plugin +
    portable copies; a mismatch prints a warning but still exits 0 (unless a body/web
    check also failed).
  * MISSING (FAIL) — any of the three copies absent fails with a clear message.
  * AGENTS (FAIL; P32.S4) — the canonical file's Part B holds the research roles' briefs
    between ``<!-- part-b:begin <name>[ with=<a>,<b>,…] -->`` and
    ``<!-- part-b:end <name> -->`` marker lines (an *extract* is the lines strictly
    between the two). A role's brief is its own extract followed by the shared extracts
    its ``with=`` list names, in that order, joined by one blank line. Each of the five
    ``plugin/agents/<role>.md`` files must exist, carry ``name: <role>``, carry none of
    the fields plugins ignore or forbid (``permissionMode``, ``hooks``, ``mcpServers``)
    and no ``Agent``/``Task`` tool, and have a body (after the frontmatter and one blank
    line) byte-equal to its brief. No other agent file may exist. The markers must be
    well formed (unique, closed, not nested, every ``with=`` name defined), and the
    ``pagetext`` extract (the page converter the skill writes out at run time) must
    compile as Python.

``--write-agents`` regenerates every agent body from the canonical Part B, keeping each
file's frontmatter, then runs the checks. Edit a brief in SKILL.md (all three copies),
then run ``python3 scripts/skills_parity.py --write-agents``.
"""

from __future__ import annotations

import re
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
CANONICAL = REPO_ROOT / "plugin" / "skills" / "explain" / "SKILL.md"
PORTABLE = REPO_ROOT / ".agents" / "skills" / "explain" / "SKILL.md"
WEB = REPO_ROOT / "web" / "public" / "SKILL.md"
AGENTS_DIR = REPO_ROOT / "plugin" / "agents"
AGENT_ROLES = ("web-researcher", "code-researcher", "gap-reviewer", "verifier", "explain-critic")
FORBIDDEN_FIELDS = ("permissionMode", "hooks", "mcpServers")
FORBIDDEN_TOOLS = ("Agent", "Task")
MARK_BEGIN = re.compile(r"^<!-- part-b:begin ([a-z][a-z0-9-]*)(?: with=([a-z0-9-]+(?:,[a-z0-9-]+)*))? -->$")
MARK_END = re.compile(r"^<!-- part-b:end ([a-z][a-z0-9-]*) -->$")


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


def part_b(text: str) -> tuple[dict[str, str], dict[str, list[str]], list[str]]:
    """Return (extracts, with-lists, errors) parsed from the canonical file's markers."""
    extracts: dict[str, str] = {}
    withs: dict[str, list[str]] = {}
    errors: list[str] = []
    current: str | None = None
    buf: list[str] = []
    for no, line in enumerate(text.splitlines(keepends=True), 1):
        bare = line.rstrip("\n")
        if not bare.lstrip().startswith("<!-- part-b:"):
            if current is not None:
                buf.append(line)
            continue
        begin, end = MARK_BEGIN.match(bare), MARK_END.match(bare)
        if begin:
            if current is not None:
                errors.append(f"line {no}: '{begin.group(1)}' begins inside '{current}'")
            elif begin.group(1) in extracts:
                errors.append(f"line {no}: '{begin.group(1)}' is defined twice")
            current, buf = begin.group(1), []
            withs[current] = begin.group(2).split(",") if begin.group(2) else []
        elif end:
            if end.group(1) != current:
                errors.append(f"line {no}: end of '{end.group(1)}' while '{current}' is open")
            elif not buf:
                errors.append(f"line {no}: '{current}' is empty")
            else:
                extracts[current] = "".join(buf)
            current = None
        else:
            errors.append(f"line {no}: malformed Part B marker: {bare.strip()}")
    if current is not None:
        errors.append(f"'{current}' is never closed")
    for name, names in withs.items():
        for shared in names:
            if shared not in extracts:
                errors.append(f"'{name}' lists '{shared}', which no extract defines")
    return extracts, withs, errors


def brief(role: str, extracts: dict[str, str], withs: dict[str, list[str]]) -> str:
    """A role's brief: its extract, then its shared extracts, one blank line apart."""
    return "\n".join([extracts[role]] + [extracts[name] for name in withs[role]])


def frontmatter_fields(frontmatter: str) -> dict[str, str]:
    fields: dict[str, str] = {}
    for line in frontmatter.splitlines()[1:-1]:
        match = re.match(r"^([A-Za-z][A-Za-z0-9_-]*):(.*)$", line)
        if match:
            fields[match.group(1)] = match.group(2).strip()
    return fields


def check_agents(canonical_text: str, write: bool) -> list[str]:
    """The AGENTS check; returns failures (empty = pass). ``write`` regenerates bodies."""
    extracts, withs, failures = part_b(canonical_text)
    if failures:
        return [f"Part B markers: {e}" for e in failures]
    if "pagetext" not in extracts:
        failures.append("Part B has no 'pagetext' extract (the page converter)")
    else:
        code = extracts["pagetext"].split("\n", 1)[-1].rsplit("```", 1)[0]
        try:
            compile(code, "pagetext.py", "exec")
        except SyntaxError as exc:
            failures.append(f"the 'pagetext' extract does not compile: {exc}")
    for role in AGENT_ROLES:
        if role not in extracts:
            failures.append(f"Part B has no '{role}' extract")
    for name, names in withs.items():
        if names and name not in AGENT_ROLES:
            failures.append(f"Part B role '{name}' has no plugin agent (known: {', '.join(AGENT_ROLES)})")
    if failures:
        return failures
    present = sorted(p.stem for p in AGENTS_DIR.glob("*.md")) if AGENTS_DIR.is_dir() else []
    for stray in sorted(set(present) - set(AGENT_ROLES)):
        failures.append(f"plugin/agents/{stray}.md is not a Part B role")
    for role in AGENT_ROLES:
        path = AGENTS_DIR / f"{role}.md"
        shown = f"plugin/agents/{role}.md"
        if not path.is_file():
            failures.append(f"{shown} is missing")
            continue
        frontmatter, body = split_frontmatter(path.read_text(encoding="utf-8"))
        if not frontmatter:
            failures.append(f"{shown} has no frontmatter")
            continue
        fields = frontmatter_fields(frontmatter)
        if fields.get("name") != role:
            failures.append(f"{shown}: name is {fields.get('name')!r}, expected {role!r}")
        for field in FORBIDDEN_FIELDS:
            if field in fields:
                failures.append(f"{shown}: frontmatter carries '{field}' (plugins ignore or forbid it)")
        tools = [t.strip() for t in fields.get("tools", "").split(",")]
        for tool in FORBIDDEN_TOOLS:
            if tool in tools:
                failures.append(f"{shown}: tools list '{tool}' (research agents never spawn)")
        expected = "\n" + brief(role, extracts, withs)
        if body != expected:
            if write:
                path.write_text(frontmatter + expected, encoding="utf-8")
                print(f"wrote {shown}")
            else:
                failures.append(
                    f"{shown}: body is not the Part B brief '{role}' "
                    f"(with={','.join(withs[role])}); run --write-agents"
                )
    return failures


def main() -> int:
    write_agents = "--write-agents" in sys.argv[1:]
    for path in (CANONICAL, PORTABLE, WEB):
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

    # The landing-served copy is a straight publish of the canonical file: hold it to
    # a full-file byte match (frontmatter included), stricter than the body-only rule.
    if CANONICAL.read_bytes() != WEB.read_bytes():
        print(
            "FAIL — landing-served explain skill drifted: web/public/SKILL.md is not a "
            "byte-for-byte copy of plugin/skills/explain/SKILL.md."
        )
        return 1

    if description_of(canon_fm) != description_of(port_fm):
        print(
            "WARN — explain skill description values differ between the two copies "
            "(bodies are in sync)."
        )

    agent_failures = check_agents(CANONICAL.read_text(encoding="utf-8"), write_agents)
    if agent_failures:
        print("FAIL — plugin agents drifted from the explain skill's Part B:")
        for failure in agent_failures:
            print(f"  - {failure}")
        return 1

    print(
        "PASS — explain skill copies are in body parity (web copy byte-identical); "
        f"the {len(AGENT_ROLES)} plugin agents match Part B."
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
