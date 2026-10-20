"""Parse and validate a native chapter into the normalized block tree.

``parse_chapter(source)`` takes a whole ``format: native`` file (the ``---``
YAML header plus the body) and returns a ``ParseResult``; on any violation it
raises ONE ``NativeFormatError`` listing every violation. Nothing is ever
stripped or repaired: what is outside the contract is rejected.

The grammar is CommonMark + GFM (tables, strikethrough, autolinks) plus three
extensions: GFM-alert callouts, typed fenced YAML blocks and trailing ``{#id}``
heading ids. The tree shape is documented in ``server/native/README.md``; S12's
TS parser reproduces it from the shared fixtures in ``tests/fixtures/native/``.
"""
from __future__ import annotations

import re
from dataclasses import dataclass, field
from typing import Optional

from markdown_it import MarkdownIt
from markdown_it.tree import SyntaxTreeNode
from mdit_py_plugins.gfm_autolink import gfm_autolink_plugin

from . import schema
from .errors import Collector, NativeFormatError, Violation
from .ids import IdRegistry, heading_slug, is_valid_id
from .refs import RefError, parse_ref
from .yamlcore import YamlError, load as load_yaml

SYNTAX_VERSION = 1
MAX_INLINE_DEPTH = 32

_HEADING_ID_RE = re.compile(r"[ \t]*\{#([^{}]*)\}[ \t]*$")
_ALERT_RE = re.compile(r"^\[!([A-Za-z]+)\](-?)(?:[ \t]+(.*?))?[ \t]*$")
_INFO_TOKEN_RE = re.compile(r'\s*(title="[^"]*"|\S+)')
_ATX_CLOSE_RE = re.compile(r"^(.*?)([ \t]+#+[ \t]*)?$")


@dataclass
class ParseResult:
    tree: dict  # the normalized block tree (README: "The tree")
    source: str  # the normalized source: LF line endings, assigned ids written in
    assigned_ids: list = field(default_factory=list)  # [{"id", "type", "line"}]
    refs: list = field(default_factory=list)  # every link/image reference, for S5 to resolve
    warnings: list = field(default_factory=list)


def _build_md() -> MarkdownIt:
    md = MarkdownIt("commonmark", {"html": True, "linkify": False, "typographer": False})
    md.enable(["table", "strikethrough"])
    md.options["strikethrough_single_tilde"] = True
    md.use(gfm_autolink_plugin)
    # Every URL becomes a link token and keeps its source spelling, so the
    # reference check below sees (and rejects) javascript:, data:, ... instead
    # of markdown-it silently leaving them as text.
    md.validateLink = lambda url: True
    md.normalizeLink = lambda url: url
    md.normalizeLinkText = lambda url: url
    md.core.ruler.before("inline", "native_extensions", _native_extensions)
    return md


def _native_extensions(state) -> None:
    """Before inline parsing: lift heading ``{#id}`` suffixes and callout markers
    out of the inline content into the opening tokens' ``meta``."""
    tokens = state.tokens
    out = []
    i = 0
    while i < len(tokens):
        tok = tokens[i]
        out.append(tok)
        if tok.type == "heading_open" and i + 1 < len(tokens):
            inline = tokens[i + 1]
            m = _HEADING_ID_RE.search(inline.content)
            if m:
                tok.meta["id_raw"] = m.group(1)
                inline.content = inline.content[: m.start()]
        elif (tok.type == "blockquote_open" and i + 2 < len(tokens)
              and tokens[i + 1].type == "paragraph_open"):
            inline = tokens[i + 2]
            first, _, rest = inline.content.partition("\n")
            m = _ALERT_RE.match(first)
            if m:
                tok.meta["alert"] = {"type": m.group(1), "collapsed": m.group(2) == "-",
                                     "title": m.group(3) or None}
                if rest.strip():
                    inline.content = rest
                    if inline.map:
                        inline.map = [inline.map[0] + 1, inline.map[1]]
                    if tokens[i + 1].map:
                        tokens[i + 1].map = [tokens[i + 1].map[0] + 1, tokens[i + 1].map[1]]
                else:
                    i += 4  # drop paragraph_open, inline, paragraph_close
                    continue
        i += 1
    state.tokens = out


_MD = _build_md()


class _Parser:
    def __init__(self, source: str, reserved_ids=()):
        self.errors = Collector()
        self.ids = IdRegistry(reserved_ids)
        self.refs: list = []
        self.id_refs: list = []  # (id, line, block)
        self.pending: list = []  # (block, kind, slug, body_line, token_map, is_setext)
        self.edits: dict = {}
        self.assigned: list = []
        self.env: dict = {}
        self.source = source
        self.header_lines = 0
        self.body_lines: list[str] = []
        self.typed_count = 0

    def report(self, line, code, message, col=1, **extra):
        self.errors.add(line, code, message, col=col, **extra)

    # --- the whole file ---------------------------------------------------

    def run(self) -> ParseResult:
        text = self.source.replace("\r\n", "\n").replace("\r", "\n")
        if "\x00" in text:
            line = text[: text.index("\x00")].count("\n") + 1
            self.report(line, "control-char", "the source contains a NUL character")
            self.errors.raise_if_any()
        if len(text.encode("utf-8")) > schema.MAX_BODY_BYTES:
            self.report(1, "body-too-large", f"a native chapter is at most {schema.MAX_BODY_BYTES // 1024} KB")
            self.errors.raise_if_any()
        lines = text.split("\n")
        summary = self.header(lines)
        self.errors.raise_if_any()
        self.body_lines = lines[self.header_lines:]
        body = "\n".join(self.body_lines)
        tokens = _MD.parse(body, self.env)
        for tok in tokens:
            if tok.type == "inline" and _too_deep(tok.children):
                at = self.file_line(tok.map[0]) if tok.map else 1
                self.report(at, "limit", f"inline markup nests deeper than {MAX_INLINE_DEPTH} levels")
        self.errors.raise_if_any()  # never build a tree over a nesting bomb
        root = SyntaxTreeNode(tokens)
        blocks = []
        for node in root.children:
            block = self.block(node, depth=0)
            if block is not None:
                blocks.append(block)
        if self.typed_count > schema.MAX_TYPED_BLOCKS:
            self.report(1, "limit", f"a chapter holds at most {schema.MAX_TYPED_BLOCKS} typed blocks, "
                                    f"has {self.typed_count}")
        self.assign()
        for target, line, block in self.id_refs:
            if target not in self.ids:
                self.report(line, "ref-missing-id", f"#{target} names no id in this chapter",
                            **({"block": block} if block else {}))
        self.errors.raise_if_any()
        tree = {"syntax": SYNTAX_VERSION, "summary": summary, "blocks": blocks}
        new_lines = list(lines)
        for body_line, fn in self.edits.items():
            idx = self.header_lines + body_line
            new_lines[idx] = fn(new_lines[idx])
        return ParseResult(tree=tree, source="\n".join(new_lines), assigned_ids=self.assigned,
                           refs=self.refs)

    def header(self, lines: list[str]) -> Optional[str]:
        if not lines or lines[0].rstrip() != "---":
            self.report(1, "header-missing", "a native chapter starts with a --- YAML header")
            return None
        end = next((i for i in range(1, len(lines)) if lines[i].rstrip() == "---"), None)
        if end is None:
            self.report(1, "header-missing", "the --- YAML header is not closed")
            return None
        self.header_lines = end + 1
        try:
            meta, mlines = load_yaml("\n".join(lines[1:end]))
        except YamlError as exc:
            self.report(exc.line + 2, "header-yaml", exc.message)
            return None
        if not isinstance(meta, dict):
            self.report(1, "header-yaml", "the header must be a YAML mapping")
            return None

        def line_of(key):
            return mlines.get((key,), 0) + 2

        if meta.get("format") != "native":
            self.report(line_of("format"), "header-format", "the header must say format: native")
        if "syntax" not in meta:
            self.report(1, "header-syntax", f"the header must say syntax: {SYNTAX_VERSION}")
        elif meta["syntax"] != SYNTAX_VERSION or isinstance(meta["syntax"], bool):
            self.report(line_of("syntax"), "header-syntax",
                        f"unsupported syntax {meta['syntax']!r} (this server reads syntax: {SYNTAX_VERSION})")
        summary = meta.get("summary")
        if summary is not None and (not isinstance(summary, str) or not summary.strip()):
            self.report(line_of("summary"), "header-field", "summary must be a non-empty string")
            summary = None
        return summary

    def file_line(self, body_line: int) -> int:
        return self.header_lines + body_line + 1

    def node_line(self, node) -> int:
        m = node.map
        return self.file_line(m[0]) if m else self.header_lines + 1

    # --- blocks -------------------------------------------------------------

    def block(self, node, depth: int) -> Optional[dict]:
        t = node.type
        line = self.node_line(node)
        if t == "html_block":
            self.report(line, "raw-html", "raw HTML is not allowed in a native chapter")
            return None
        if t == "paragraph":
            return {"type": "paragraph", "id": None, "content": self.inline_node(node.children[0])}
        if t == "heading":
            return self.heading(node, depth, line)
        if t in ("fence", "code_block"):
            return self.fence(node, depth, line)
        if t == "blockquote":
            alert = node.meta.get("alert") if node.meta else None
            children = [b for b in (self.block(c, depth + 1) for c in node.children) if b is not None]
            if alert is None:
                return {"type": "blockquote", "id": None, "blocks": children}
            kind = alert["type"].upper()
            if kind not in schema.CALLOUT_TYPES:
                self.report(line, "callout-type",
                            f"unknown callout type [!{alert['type']}] (use {', '.join(schema.CALLOUT_TYPES)})")
                kind = None
            title = self.inline_text(alert["title"], line) if alert["title"] else None
            return {"type": "callout", "id": None, "kind": kind, "collapsed": alert["collapsed"],
                    "title": title, "blocks": children}
        if t in ("bullet_list", "ordered_list"):
            items = []
            tight = True
            for item in node.children:
                for child in item.children:
                    if child.type == "paragraph" and not child.nester_tokens.opening.hidden:
                        tight = False
                items.append({"blocks": [b for b in (self.block(c, depth + 1) for c in item.children)
                                         if b is not None]})
            start = None
            if t == "ordered_list":
                start = int(node.attrs.get("start", 1))
            return {"type": "list", "id": None, "ordered": t == "ordered_list", "start": start,
                    "tight": tight, "items": items}
        if t == "table":
            return self.table(node)
        if t == "hr":
            return {"type": "hr", "id": None}
        self.report(line, "unsupported", f"unsupported markdown construct {t!r}")  # pragma: no cover
        return None

    def heading(self, node, depth, line) -> Optional[dict]:
        level = int(node.tag[1])
        content = self.inline_node(node.children[0]) if node.children else []
        if level not in (2, 3, 4):
            self.report(line, "heading-level",
                        f"h{level} is not allowed: the title comes from the header, and sections use h2-h4")
            return None
        if depth > 0:
            self.report(line, "heading-nested", "headings must not sit inside a list, quote or callout")
            return None
        block = {"type": "heading", "id": None, "level": level, "content": content}
        raw = node.meta.get("id_raw") if node.meta else None
        if raw is not None:
            self.claim_authored(block, raw, line)
        else:
            text = _plain(content)
            setext = node.markup in ("=", "-")
            self.pending.append((block, "heading", heading_slug(text), node.map, setext))
        return block

    def claim_authored(self, block, raw, line) -> None:
        if not is_valid_id(raw):
            self.report(line, "id-malformed", f"malformed id {raw!r} (expected [a-z0-9][a-z0-9-]{{0,63}})")
            return
        if not self.ids.claim(raw):
            self.report(line, "id-duplicate", f"duplicate id {raw!r}")
        block["id"] = raw

    def fence(self, node, depth, line) -> Optional[dict]:
        text = node.content
        if text.endswith("\n"):
            text = text[:-1]
        if node.type == "code_block":
            return {"type": "code", "id": None, "lang": None, "title": None, "text": text}
        info = node.info.strip()
        tokens = _INFO_TOKEN_RE.findall(info)
        head = tokens[0] if tokens and not tokens[0].startswith(("#", 'title="')) else None
        rest = tokens[1:] if head is not None else tokens
        if head in schema.TYPED_BLOCKS:
            return self.typed(node, head, rest, depth, line)
        lang, title, raw_id = head, None, None
        for tok in rest:
            if tok.startswith('title="') and title is None:
                title = tok[len('title="'):-1]
            elif tok.startswith("#") and raw_id is None:
                raw_id = tok[1:]
            else:
                self.report(line, "fence-info", f"unexpected {tok!r} in a code fence's info "
                                                '(expected: lang title="..." #id)')
        block = {"type": "code", "id": None, "lang": lang, "title": title or None, "text": text}
        if raw_id is not None:
            if depth > 0:
                self.report(line, "id-nested", "an id'd code block must not sit inside a list, quote or callout")
            else:
                self.claim_authored(block, raw_id, line)
        return block

    def typed(self, node, kind, rest, depth, line) -> Optional[dict]:
        self.typed_count += 1
        if depth > 0:
            self.report(line, "typed-block-nested",
                        f"a {kind} block must not sit inside a list, quote or callout")
            return None
        raw_id = None
        for tok in rest:
            if tok.startswith("#") and raw_id is None:
                raw_id = tok[1:]
            else:
                self.report(line, "fence-info", f"unexpected {tok!r} after ```{kind} (expected: ```{kind} #id)")
        block = {"type": kind, "id": None}
        if raw_id is not None:
            self.claim_authored(block, raw_id, line)
        else:
            self.pending.append((block, kind, None, node.map, False))
        try:
            data, ylines = load_yaml(node.content)
        except YamlError as exc:
            self.report(line + 1 + exc.line, exc.code, exc.message, **({"block": raw_id} if raw_id else {}))
            return block
        cx = schema.BlockContext(
            base_line=line + 1, lines=ylines, block_id=raw_id, body_lines=self.body_lines[node.map[0] + 1:],
            report=self.report,
            inline=lambda text, at: self.inline_text(text, at, block=raw_id),
            claim=lambda value, at: self.ids.claim(value),
        )
        if not isinstance(data, dict):
            self.report(line + 1, "field-type", f"a {kind} block's body must be a YAML mapping",
                        **({"block": raw_id} if raw_id else {}))
            return block
        block.update(schema.CHECKS[kind](data, cx))
        return block

    def table(self, node) -> dict:
        align: list = []
        head: list = []
        rows: list = []
        for section in node.children:
            for tr in section.children:
                cells = []
                for cell in tr.children:
                    style = cell.attrs.get("style", "") if cell.attrs else ""
                    m = re.search(r"text-align:(left|center|right)", str(style))
                    if section.type == "thead":
                        align.append(m.group(1) if m else None)
                    cells.append(self.inline_node(cell.children[0]) if cell.children else [])
                if section.type == "thead":
                    head = cells
                else:
                    rows.append(cells)
        return {"type": "table", "id": None, "align": align, "head": head, "rows": rows}

    # --- ids ----------------------------------------------------------------

    def assign(self) -> None:
        for block, kind, slug, tmap, setext in self.pending:
            if kind == "heading":
                new = self.ids.assign_slug(slug) if slug else self.ids.assign_numbered("s")
            else:
                new = self.ids.assign_numbered(kind)
            block["id"] = new
            if kind == "heading":
                body_line = tmap[1] - 2 if setext else tmap[0]
                self.edits[body_line] = _heading_edit(new, setext)
            else:
                body_line = tmap[0]
                self.edits[body_line] = lambda s, new=new: s.rstrip() + f" #{new}"
            self.assigned.append({"id": new, "type": kind, "line": self.file_line(body_line)})

    # --- inline -------------------------------------------------------------

    def inline_text(self, text: str, line: int, block: Optional[str] = None) -> list:
        """Parse an *(md)* string (a YAML field or a callout title) as inline Markdown."""
        tokens = _MD.parseInline(text, self.env)
        if tokens and _too_deep(tokens[0].children):
            self.report(line, "limit", f"inline markup nests deeper than {MAX_INLINE_DEPTH} levels",
                        **({"block": block} if block else {}))
            return []
        root = SyntaxTreeNode(tokens)
        if not root.children:
            return []
        return self.inline_children(root.children[0].children, line, block)

    def inline_node(self, node, block: Optional[str] = None) -> list:
        line = self.node_line(node)
        return self.inline_children(node.children, line, block)

    def inline_children(self, children, line: int, block: Optional[str], depth: int = 0) -> list:
        if depth > MAX_INLINE_DEPTH:
            self.report(line, "limit", f"inline markup nests deeper than {MAX_INLINE_DEPTH} levels",
                        **({"block": block} if block else {}))
            return []
        out: list = []
        state = {"line": line}

        def add_text(value: str):
            if not value:
                return
            if out and out[-1]["type"] == "text":
                out[-1]["text"] += value
            else:
                out.append({"type": "text", "text": value})

        for child in children:
            t = child.type
            if t in ("text", "text_special"):
                add_text(child.content)
            elif t == "softbreak":
                add_text("\n")
                state["line"] += 1
            elif t == "hardbreak":
                out.append({"type": "break"})
                state["line"] += 1
            elif t == "code_inline":
                out.append({"type": "code", "text": child.content})
            elif t in ("em", "strong", "s"):
                name = {"em": "em", "strong": "strong", "s": "del"}[t]
                out.append({"type": name, "children": self.inline_children(child.children, state["line"], block, depth + 1)})
            elif t == "link":
                href = child.attrs.get("href", "")
                self.reference(str(href), state["line"], block, image=False)
                title = child.attrs.get("title")
                out.append({"type": "link", "href": str(href), "title": str(title) if title else None,
                            "children": self.inline_children(child.children, state["line"], block, depth + 1)})
            elif t == "image":
                src = child.attrs.get("src", "")
                self.reference(str(src), state["line"], block, image=True)
                title = child.attrs.get("title")
                alt = _plain(self.inline_children(child.children, state["line"], block, depth + 1))
                out.append({"type": "image", "src": str(src), "alt": alt, "title": str(title) if title else None})
            elif t == "html_inline":
                self.report(state["line"], "raw-html", f"raw HTML is not allowed ({child.content!r})",
                            **({"block": block} if block else {}))
            else:  # pragma: no cover - every enabled inline rule is handled above
                self.report(state["line"], "unsupported", f"unsupported inline construct {t!r}")
        return out

    def reference(self, href: str, line: int, block: Optional[str], *, image: bool) -> None:
        extra = {"block": block} if block else {}
        try:
            ref = parse_ref(href, image=image)
        except RefError as exc:
            self.report(line, exc.code, exc.message, **extra)
            return
        if ref["kind"] == "id":
            self.id_refs.append((ref["id"], line, block))
        self.refs.append({**ref, "href": href, "line": line, "image": image})


def _too_deep(children) -> bool:
    depth = 0
    for child in children or ():
        depth += child.nesting
        if depth > MAX_INLINE_DEPTH:
            return True
    return False


def _heading_edit(new_id: str, setext: bool):
    def edit(line: str) -> str:
        line = line.rstrip()
        if setext:
            return f"{line} {{#{new_id}}}"
        m = _ATX_CLOSE_RE.match(line)
        return f"{m.group(1)} {{#{new_id}}}{m.group(2) or ''}"
    return edit


def _plain(nodes: list) -> str:
    out = []
    for node in nodes:
        t = node["type"]
        if t in ("text", "code"):
            out.append(node["text"])
        elif t == "break":
            out.append("\n")
        elif "children" in node:
            out.append(_plain(node["children"]))
    return "".join(out)


def parse_chapter(source: str, *, reserved_ids=()) -> ParseResult:
    """Parse and validate a whole native chapter (header + body).

    ``reserved_ids``: ids that must never be minted (S5 passes the retired ids
    of earlier versions). Raises ``NativeFormatError`` listing every violation.
    """
    try:
        return _Parser(source, reserved_ids).run()
    except RecursionError:
        # markdown-it's emphasis pairing can nest far past MAX_INLINE_DEPTH before
        # the tree is built; a pathological source is a 422, never a 500.
        raise NativeFormatError([Violation(1, 1, "limit", "the chapter nests too deeply")])


__all__ = ["ParseResult", "parse_chapter", "NativeFormatError", "SYNTAX_VERSION"]
