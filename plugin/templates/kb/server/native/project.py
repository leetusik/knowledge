"""The per-block plain-text projection: the text annotation offsets (S9) are
measured against, and the search text (S5).

**Sections** (the signed ``05-annotations`` round, *Sections and offsets*): a
section is an id'd top-level block - an h2-h4 heading, a typed block, or a code
block with an authored id - together with every block after it, up to the next
id'd block. Content before the first id'd block belongs to no section and takes
no highlight (``annotations`` 5).

A section's **text** is its *passage containers'* text, joined by ``"\\n"``.
The passage containers, in document order, are:

* a paragraph (top level, or inside a list item, quote or callout);
* a callout's title;
* a table cell (header row first, then each row, left to right; an empty cell
  is an empty container);
* a code block: its text verbatim (lines joined by ``"\\n"``, no final newline).

Headings and every typed block's text (captions, titles, labels, quiz text) are
``head``/``cap`` containers: they take a note or a bookmark, never a highlight,
so they contribute nothing. A container's text is the concatenation of its
inline nodes: ``text`` and ``code`` verbatim (a soft line break is already the
``"\\n"`` inside a text node), ``break`` as ``"\\n"``, an image as nothing, and
emphasis, strong, strikethrough and links as their children's text. No
whitespace is collapsed and nothing is normalized. Offsets count Unicode code
points of that text.
"""
from __future__ import annotations

from typing import Iterable


def inline_text(nodes: Iterable[dict]) -> str:
    out = []
    for node in nodes:
        t = node["type"]
        if t in ("text", "code"):
            out.append(node["text"])
        elif t == "break":
            out.append("\n")
        elif t in ("em", "strong", "del", "link"):
            out.append(inline_text(node["children"]))
        # image, blank: nothing
    return "".join(out)


def _containers(block: dict) -> list[str]:
    t = block["type"]
    if t == "paragraph":
        return [inline_text(block["content"])]
    if t == "code":
        return [block["text"]]
    if t == "table":
        cells = [inline_text(c) for c in block["head"]]
        for row in block["rows"]:
            cells.extend(inline_text(c) for c in row)
        return cells
    if t == "list":
        out = []
        for item in block["items"]:
            for child in item["blocks"]:
                out.extend(_containers(child))
        return out
    if t == "blockquote":
        return [c for child in block["blocks"] for c in _containers(child)]
    if t == "callout":
        out = [inline_text(block["title"])] if block["title"] else []
        return out + [c for child in block["blocks"] for c in _containers(child)]
    return []  # heading, hr, typed blocks


def sections(tree: dict) -> list[dict]:
    """``[{"id": <section id>, "text": <section text>}]`` in document order."""
    out: list[dict] = []
    current = None
    for block in tree["blocks"]:
        if block.get("id"):
            current = {"id": block["id"], "parts": []}
            out.append(current)
        if current is not None:
            current["parts"].extend(_containers(block))
    return [{"id": s["id"], "text": "\n".join(s["parts"])} for s in out]


def section_map(tree: dict) -> dict[str, str]:
    return {s["id"]: s["text"] for s in sections(tree)}


def format_sections(secs: list[dict]) -> str:
    """The language-neutral ``.txt`` fixture form: for each section, a line
    ``=== <id>``, then its text, then a newline."""
    return "".join(f"=== {s['id']}\n{s['text']}\n" for s in secs)


# --- search text (P29 *Ingest, search and MCP*) -------------------------------


def search_text(tree: dict) -> str:
    """The FTS/embedding text: prose, plus figure captions and alt text, diagram
    titles, labels and captions, SVG labels, quiz prompts, options and
    explanations (never the answer keys), and source titles."""
    parts: list[str] = []
    if tree.get("summary"):
        parts.append(tree["summary"])
    for block in tree["blocks"]:
        parts.extend(_search_block(block))
    return "\n".join(p for p in parts if p)


def _md(value) -> str:
    return inline_text(value) if value else ""


def _search_block(block: dict) -> list[str]:
    t = block["type"]
    if t == "heading":
        return [inline_text(block["content"])]
    if t == "figure":
        return [block["alt"], _md(block["caption"]), _md(block["credit"])]
    if t == "figures":
        out = []
        for item in block["items"]:
            kind = item["kind"]
            if kind == "image":
                out += [item["alt"], _md(item["caption"])]
            elif kind == "diagram":
                out += _search_diagram(item["diagram"]) + [_md(item["caption"])]
            elif kind == "svg":
                out += [item["label"], _md(item["caption"])]
            else:
                out += [item["title"]] + [inline_text(p) for p in item["body"]]
        return out + [_md(block["caption"])]
    if t == "diagram":
        return _search_diagram(block) + [_md(block["caption"])]
    if t == "svg":
        return [block["label"], _md(block["caption"])]
    if t == "quiz":
        out = [block["title"] or ""]
        for item in block["items"]:
            if item["type"] == "choice":
                out += [_md(item["prompt"])] + [_md(o["text"]) for o in item["options"]] + [_md(item["explain"])]
            elif item["type"] == "recall":
                out += [_md(item["prompt"]), _md(item["explain"])]
            else:
                out += [_md(item["text"]), _md(item["explain"])]
        return out
    if t == "sources":
        return [item["title"] for item in block["items"]]
    return _containers(block)


def _search_diagram(d: dict) -> list[str]:
    out = [d["title"]]
    kind = d["kind"]
    if kind in ("flow", "state"):
        for n in d["nodes"]:
            out += [n["label"], n["sub"] or ""] + list(n["fields"] or [])
        out += [g["label"] for g in d["groups"] or []]
        out += [e["label"] or "" for e in d["edges"]]
    elif kind == "sequence":
        out += [a["label"] for a in d["actors"]]
        for s in d["steps"]:
            out += [s["label"], s["note"] or ""]
    elif kind == "stack":
        for layer in d["layers"]:
            out += [layer["label"]] + list(layer["items"] or [])
    elif kind == "timeline":
        for lane in d["lanes"]:
            out.append(lane["label"])
            out += [b["label"] or "" for b in lane["bars"]]
            out += [m["label"] for m in lane["marks"] or []]
    elif kind == "chart":
        out += [d["x"]["label"]] + list(d["x"]["categories"] or []) + [d["y"]["label"]]
        out += [s["name"] for s in d["series"]]
        out += [r["label"] for r in d["rules"] or []]
    return out
