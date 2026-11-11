"""The spoken script (P41-sr.S1): what Listen reads aloud from a native chapter.

``spoken_script(tree, lang=...)`` turns a parsed native tree
(``parse_chapter(source).tree``) into the ordered list of spoken segments, each
``{"section", "block", "kind", "lang", "text"}``:

* ``section`` is the id of the nearest id'd top-level block at or before this one
  (the same notion as ``server/native/project.py:sections``), null before the
  first one; ``block`` is the top-level block's own id, when it has one.
* ``text`` is whitespace-collapsed and stripped; empty segments are dropped.

**Read**: the title and summary; headings; paragraphs; one segment per list item
(nested lists flattened in order); a quote's and a callout's paragraphs (the
callout's title first); one segment per table body row (``header: cell; ...``);
a figure's alt then caption; a figure row's items (image alt, svg label, card
title and body, diagram title, each with its caption) then its caption; a
diagram's title and an svg's label, each then its caption; a formula's alt, its
reading, then one ``sym: means`` segment per legend entry.

**Skipped**: code, rules (``hr``), quizzes, sources and the glossary.

**The source list** (P41-sr.F1): a heading whose id is ``sources-list`` opens the
source list, and the whole section is skipped, heading included, up to the next
heading of the same or a higher level. The id decides, never the words: the explain
skill closes every chapter with ``## Sources {#sources-list}`` (an ASCII ``## Sources``
is assigned that id, ``server/native/ids.py``), and a translation keeps the id under
its own words. A ``## Sources`` with another id, and the word in prose, are read.

**Empty headings** (P41-sr.F1): a heading is said only when something in its section
(up to the next heading of the same or a higher level, its subheadings included) is
said, so a heading over only a quiz, code or a glossary is dropped.

Inline content reads as ``project.inline_text`` does, except that inline math
becomes a small language-neutral linear text (``speak_tex``, after the reader's
``linearText``) and an inline image reads its alt. How symbols are *spoken* is
the voice engine's job; this is only the text.
"""
from __future__ import annotations

import re
from typing import Iterable, Optional

# --- inline math's linear text ------------------------------------------------

_GREEK = {
    "alpha": "α", "beta": "β", "gamma": "γ", "delta": "δ", "epsilon": "ε", "varepsilon": "ε",
    "zeta": "ζ", "eta": "η", "theta": "θ", "vartheta": "ϑ", "iota": "ι", "kappa": "κ",
    "lambda": "λ", "mu": "μ", "nu": "ν", "xi": "ξ", "omicron": "ο", "pi": "π", "varpi": "ϖ",
    "rho": "ρ", "varrho": "ϱ", "sigma": "σ", "varsigma": "ς", "tau": "τ", "upsilon": "υ",
    "phi": "φ", "varphi": "φ", "chi": "χ", "psi": "ψ", "omega": "ω",
    "Gamma": "Γ", "Delta": "Δ", "Theta": "Θ", "Lambda": "Λ", "Xi": "Ξ", "Pi": "Π",
    "Sigma": "Σ", "Upsilon": "Υ", "Phi": "Φ", "Psi": "Ψ", "Omega": "Ω",
}
_SYMBOLS = {
    "times": "×", "div": "÷", "cdot": "·", "le": "≤", "leq": "≤", "ge": "≥", "geq": "≥",
    "ne": "≠", "neq": "≠", "approx": "≈", "pm": "±", "sum": "∑",
    # Delimiters and sizing words: a bar is a bar, and \left/\right are only size.
    "lvert": "|", "rvert": "|", "vert": "|", "left": "", "right": "",
}
_KEEP_CONTENT = {"text", "mathrm", "mathbf", "mathit", "mathsf", "mathtt", "operatorname",
                 "mathbb", "mathcal", "boldsymbol", "textbf", "textit"}
_ACCENTS = {"bar": "̄", "overline": "̄", "hat": "̂"}
_SUP = str.maketrans("0123456789+-=()", "⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻⁼⁽⁾")
_SUB = str.maketrans("0123456789+-=()", "₀₁₂₃₄₅₆₇₈₉₊₋₌₍₎")
_SCRIPTABLE = set("0123456789+-=()")


class _Tex:
    """A tiny reader: each ``arg`` is one atom (a group, a command with its
    arguments, or one character) rendered to ``(text, atom_count)``."""

    def __init__(self, tex: str):
        self.s = tex
        self.i = 0

    def seq(self, close: Optional[str] = None) -> tuple[str, int]:
        out: list[str] = []
        atoms = 0
        while self.i < len(self.s):
            c = self.s[self.i]
            if close is not None and c == close:
                self.i += 1
                break
            if c.isspace():
                out.append(" ")
                self.i += 1
                continue
            if c in "^_":
                self.i += 1
                base, n = self.arg()
                out.append(_script(base, n, c))
                continue
            text, _ = self.atom()
            out.append(text)
            atoms += 1
        return "".join(out), atoms

    def arg(self) -> tuple[str, int]:
        while self.i < len(self.s) and self.s[self.i].isspace():
            self.i += 1
        if self.i >= len(self.s):
            return "", 0
        return self.atom()

    def atom(self) -> tuple[str, int]:
        c = self.s[self.i]
        if c == "{":
            self.i += 1
            text, n = self.seq("}")
            return text.strip(), n
        if c == "\\":
            return self.command(), 1
        self.i += 1
        if c == "}":
            return "", 0
        if c == "&":
            return " ", 0
        return c, 1

    def command(self) -> str:
        self.i += 1  # the backslash
        m = re.match(r"[A-Za-z]+", self.s[self.i:])
        if not m:  # a one-character command: \{ \, \\ ...
            ch = self.s[self.i:self.i + 1]
            self.i += 1
            return ch if ch in "{}|%$#&_" else " "
        name = m.group(0)
        self.i += len(name)
        if name in _GREEK:
            return _GREEK[name]
        if name in _SYMBOLS:
            return _SYMBOLS[name]
        if name == "sqrt":
            self.optional()
            text, n = self.arg()
            return "√" + _wrap(text, n)
        if name in _ACCENTS:
            text, n = self.arg()
            return _wrap(text, n) + _ACCENTS[name]
        if name in ("frac", "dfrac", "tfrac"):
            num, a = self.arg()
            den, b = self.arg()
            return f"{_wrap(num, a)} ÷ {_wrap(den, b)}"
        if name in _KEEP_CONTENT:
            text, _ = self.arg()
            return text
        return name

    def optional(self) -> None:
        if self.s[self.i:self.i + 1] == "[":
            end = self.s.find("]", self.i)
            self.i = len(self.s) if end < 0 else end + 1


def _wrap(text: str, atoms: int) -> str:
    return f"({text})" if atoms > 1 else text


def _script(text: str, atoms: int, mark: str) -> str:
    compact = text.replace(" ", "")
    if compact and set(compact) <= _SCRIPTABLE:
        return compact.translate(_SUP if mark == "^" else _SUB)
    return mark + _wrap(text, atoms)


def speak_tex(tex: str) -> str:
    """The linear text of an inline formula: ``t = s \\times \\sqrt{n}`` reads
    ``t = s × √n``; ``e^{-\\lambda}`` reads ``e^(-λ)``."""
    text, _ = _Tex(tex).seq()
    return _collapse(text)


# --- inline content and blocks --------------------------------------------------


def _collapse(text: str) -> str:
    return re.sub(r"\s+", " ", text).strip()


def spoken_inline(nodes: Optional[Iterable[dict]]) -> str:
    """``project.inline_text`` with math spoken and images read by their alt."""
    out: list[str] = []
    for node in nodes or ():
        t = node["type"]
        if t in ("text", "code"):
            out.append(node["text"])
        elif t == "math":
            out.append(speak_tex(node["tex"]))
        elif t == "break":
            out.append(" ")
        elif t == "image":
            out.append(node.get("alt") or "")
        elif t in ("em", "strong", "del", "link"):
            out.append(spoken_inline(node["children"]))
    return "".join(out)


_SKIPPED = {"code", "hr", "quiz", "sources", "glossary"}

# The heading id that opens the source list (``ids.heading_slug`` gives an ASCII
# ``## Sources`` this id; the explain skill writes it, and translations keep it).
SOURCES_LIST_ID = "sources-list"


def _paragraphs(blocks: Iterable[dict]) -> list[str]:
    """Every paragraph's text inside a quote or callout, in order."""
    out: list[str] = []
    for b in blocks:
        t = b["type"]
        if t == "paragraph":
            out.append(spoken_inline(b["content"]))
        elif t == "list":
            for item in b["items"]:
                out.extend(_paragraphs(item["blocks"]))
        elif t == "blockquote":
            out.extend(_paragraphs(b["blocks"]))
        elif t == "callout":
            if b.get("title"):
                out.append(spoken_inline(b["title"]))
            out.extend(_paragraphs(b["blocks"]))
    return out


def _list_items(block: dict) -> list[str]:
    out: list[str] = []
    for item in block["items"]:
        own = [spoken_inline(c["content"]) for c in item["blocks"] if c["type"] == "paragraph"]
        out.append(" ".join(own))
        for child in item["blocks"]:
            if child["type"] == "list":
                out.extend(_list_items(child))
            elif child["type"] in ("blockquote", "callout"):
                out.extend(_paragraphs([child]))
    return out


def _table_rows(block: dict) -> list[str]:
    head = [_collapse(spoken_inline(c)) for c in block.get("head") or []]
    out = []
    for row in block["rows"]:
        parts = []
        for i, cell in enumerate(row):
            text = _collapse(spoken_inline(cell))
            if not text:
                continue
            label = head[i] if i < len(head) else ""
            parts.append(f"{label}: {text}" if label else text)
        out.append("; ".join(parts))
    return out


def _figures_row(block: dict) -> list[str]:
    out: list[str] = []
    for item in block["items"]:
        kind = item["kind"]
        if kind == "image":
            out.append(item["alt"])
        elif kind == "svg":
            out.append(item["label"])
        elif kind == "diagram":
            out.append(item["diagram"]["title"])
        else:  # card
            out.append(item["title"])
            out.extend(spoken_inline(p) for p in item["body"])
            continue
        out.append(spoken_inline(item.get("caption")))
    out.append(spoken_inline(block.get("caption")))
    return out


def _block_segments(block: dict) -> list[tuple[str, str]]:
    t = block["type"]
    if t in _SKIPPED:
        return []
    if t == "heading":
        return [("heading", spoken_inline(block["content"]))]
    if t == "paragraph":
        return [("text", spoken_inline(block["content"]))]
    if t == "list":
        return [("list-item", s) for s in _list_items(block)]
    if t == "blockquote":
        return [("quote", s) for s in _paragraphs(block["blocks"])]
    if t == "callout":
        return [("callout", s) for s in _paragraphs([block])]
    if t == "table":
        return [("table-row", s) for s in _table_rows(block)]
    if t == "figure":
        return [("figure", block["alt"]), ("figure", spoken_inline(block.get("caption")))]
    if t == "figures":
        return [("figure", s) for s in _figures_row(block)]
    if t == "diagram":
        return [("diagram", block["title"]), ("diagram", spoken_inline(block.get("caption")))]
    if t == "svg":
        return [("svg", block["label"]), ("svg", spoken_inline(block.get("caption")))]
    if t == "formula":
        out = [("formula", block["alt"]), ("formula", spoken_inline(block.get("reading")))]
        for w in block.get("where") or []:
            out.append(("formula", f"{speak_tex(w['sym'])}: {_collapse(spoken_inline(w['means']))}"))
        return out
    return []  # an unknown block type says nothing


def spoken_script(tree: dict, *, lang: str, title: str | None = None) -> list[dict]:
    """Segments in reading order: {"section": str|None, "block": str|None,
    "kind": str, "lang": str, "text": str}."""
    out: list[dict] = []

    def emit(section, block_id, kind, text):
        text = _collapse(text or "")
        if text:
            out.append({"section": section, "block": block_id, "kind": kind, "lang": lang, "text": text})

    if title:
        emit(None, None, "title", title)
    if tree.get("summary"):
        emit(None, None, "summary", tree["summary"])
    section = None
    # Headings not said yet, outermost first: each is said just before the first
    # segment of its section, and dropped when its section ends with nothing said.
    held: list[tuple[int, Optional[str], Optional[str], str]] = []
    skip_level: Optional[int] = None  # inside the source list: its heading's level
    for block in tree["blocks"]:
        block_id = block.get("id")
        if block_id:
            section = block_id  # kept through a skip: the section notion is S1's
        if block["type"] == "heading":
            level = block["level"]
            if skip_level is not None and level > skip_level:
                continue
            skip_level = None
            while held and held[-1][0] >= level:
                held.pop()  # its section ended with nothing said
            if block_id == SOURCES_LIST_ID:
                skip_level = level
            else:
                held.append((level, section, block_id, spoken_inline(block["content"])))
            continue
        if skip_level is not None:
            continue
        segments = [(kind, text) for kind, text in _block_segments(block) if _collapse(text or "")]
        if not segments:
            continue
        for _, h_section, h_block, h_text in held:
            emit(h_section, h_block, "heading", h_text)
        held.clear()
        for kind, text in segments:
            emit(section, block_id, kind, text)
    return out
