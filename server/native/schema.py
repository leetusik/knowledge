"""Typed-block schemas and limits (P29 *Figure*, *Figure row*, *Diagram*, *Custom
SVG*, *Quiz*, *Sources*, plus the signed rounds' additive details).

Each ``check_<type>`` takes the block's loaded YAML and a ``BlockContext`` and
returns the normalized block fields (every schema field present, ``None`` when
an optional field is absent) - or reports violations through the context.
Unknown keys, wrong types, unknown enum values (tones, shapes, kinds) and
dangling diagram references are rejected at ingest; the renderer's fallbacks
(P29: unknown tone draws as ``default`` ...) are defence in depth only.
"""
from __future__ import annotations

import re
from typing import Any, Callable, Optional

from .ids import is_valid_id
from .refs import RefError, is_asset_name, parse_ref
from .svg import TONES, validate_svg

# --- limits (P29 *Ingest* and the per-block limits) -------------------------

MAX_BODY_BYTES = 512 * 1024
MAX_TYPED_BLOCKS = 300
FIGURES_ITEMS = (2, 3)
QUIZ_ITEMS = (1, 20)
QUIZ_OPTIONS = (2, 6)
CLOZE_BLANKS = (1, 5)
# Diagram limits (P29: 60 nodes, 100 edges, 12 lanes, 200 data points), counted as:
#   nodes  - flow/state ``nodes``; the total of a stack's layer ``items``
#   edges  - flow/state ``edges``; sequence ``steps``
#   lanes  - flow/state ``groups``; timeline ``lanes``; sequence ``actors``; stack ``layers``
#   points - chart ``values`` over all series (an interval is one point);
#            timeline ``bars`` + ``marks`` over all lanes
MAX_NODES = 60
MAX_EDGES = 100
MAX_LANES = 12
MAX_POINTS = 200

TYPED_BLOCKS = ("figure", "figures", "diagram", "svg", "quiz", "sources")
CALLOUT_TYPES = ("NOTE", "IMPORTANT", "WARNING", "CAUTION", "SKIP", "DEFINITION")
DIAGRAM_KINDS = ("flow", "state", "sequence", "stack", "timeline", "chart")
SHAPES = ("box", "pill", "store", "entity")
EDGE_STYLES = ("solid", "dashed")
DIRECTIONS = ("down", "right")
FIGURE_WIDTHS = ("column", "wide")
CHART_TYPES = ("bar", "line", "interval")
QUIZ_TYPES = ("choice", "recall", "cloze")

_MISSING = object()
BLANK_RE = re.compile(r"\{\{([^{}]*)\}\}")
BLANK_OPEN = ""
BLANK_CLOSE = ""


class BlockContext:
    """What a schema check needs from the parser.

    ``base_line`` is the file line (1-based) of the YAML body's first line;
    ``lines`` maps YAML paths to 0-based lines in that body (``yamlcore``);
    ``inline(text, line)`` parses an *(md)* field into inline nodes;
    ``claim(id, line)`` claims a document-namespace id;
    ``report(line, code, message, **extra)`` records a violation.
    """

    def __init__(self, *, base_line: int, lines: dict, block_id: Optional[str], body_lines: list[str],
                 report: Callable, inline: Callable, claim: Callable):
        self.base_line = base_line
        self.lines = lines
        self.block_id = block_id
        self.body_lines = body_lines
        self._report = report
        self._inline = inline
        self._claim = claim

    def line(self, path: tuple) -> int:
        while path not in self.lines and path:
            path = path[:-1]
        return self.base_line + self.lines.get(path, 0)

    def err(self, path: tuple, code: str, message: str, **extra) -> None:
        where = _where(path)
        self._report(self.line(path), code, f"{where}: {message}" if where else message,
                     block=self.block_id, **extra)

    # --- primitive checks -------------------------------------------------

    # A ``_MISSING`` value is never reported by a field check: the parent's
    # ``mapping`` call already reported the missing key (the one exception is
    # ``enum(required=True)``, used for the discriminating ``kind``/``type``).

    def mapping(self, path, value, required=(), optional=()) -> bool:
        """Report unknown and missing keys; True when ``value`` is a mapping."""
        if value is _MISSING:
            return False
        if not isinstance(value, dict):
            self.err(path, "field-type", f"must be a mapping, not {_kind(value)}")
            return False
        for key in value:
            if key not in required and key not in optional:
                self.err(path + (key,), "field-unknown", f"unknown field {key!r}")
        for key in required:
            if key not in value:
                self.err(path, "field-missing", f"missing required field {key!r}")
        return True

    def text(self, path, value, *, required=True) -> Optional[str]:
        if value is _MISSING or (value is None and not required):
            return None
        if not isinstance(value, str):
            self.err(path, "field-type", f"must be a string (quote it), not {_kind(value)}")
            return None
        if not value.strip():
            self.err(path, "field-value", "must not be empty")
            return None
        return value

    def md(self, path, value, *, required=True) -> Optional[list]:
        value = self.text(path, value, required=required)
        if value is None:
            return None
        return self._inline(value, self.line(path))

    def number(self, path, value, *, required=True) -> Any:
        if value is _MISSING or (value is None and not required):
            return None
        if isinstance(value, bool) or not isinstance(value, (int, float)):
            self.err(path, "field-type", f"must be a number, not {_kind(value)}")
            return None
        return value

    def enum(self, path, value, choices, *, required=False) -> Optional[str]:
        if value is _MISSING or value is None:
            if required:
                self.err(path, "field-missing", "is required")
            return None
        if not isinstance(value, str) or value not in choices:
            self.err(path, "field-value", f"must be one of {', '.join(choices)}, not {value!r}")
            return None
        return value

    def boolean(self, path, value) -> Optional[bool]:
        if value is _MISSING or value is None:
            return None
        if not isinstance(value, bool):
            self.err(path, "field-type", f"must be true or false, not {_kind(value)}")
            return None
        return value

    def seq(self, path, value, *, lo=0, hi=None, required=True, what="items") -> Optional[list]:
        if value is _MISSING or (value is None and not required):
            return None
        if not isinstance(value, list):
            self.err(path, "field-type", f"must be a list, not {_kind(value)}")
            return None
        if len(value) < lo or (hi is not None and len(value) > hi):
            span = f"{lo}-{hi}" if hi is not None else f"at least {lo}"
            self.err(path, "limit", f"must have {span} {what}, has {len(value)}")
        return value

    def local_id(self, path, value) -> Optional[str]:
        if value is _MISSING:
            return None
        if not is_valid_id(value):
            self.err(path, "id-malformed", f"malformed id {value!r} (expected [a-z0-9][a-z0-9-]{{0,63}})")
            return None
        return value

    def document_id(self, path, value) -> Optional[str]:
        value = self.local_id(path, value)
        if value is not None and not self._claim(value, self.line(path)):
            self.err(path, "id-duplicate", f"duplicate id {value!r}")
        return value

    def tone(self, path, value) -> Optional[str]:
        return self.enum(path, value, TONES)

    def asset(self, path, value) -> Optional[str]:
        value = self.text(path, value)
        if value is not None and not is_asset_name(value):
            self.err(path, "ref-malformed", f"malformed asset name {value!r}")
            return None
        return value


def _where(path: tuple) -> str:
    out = ""
    for part in path:
        out += f"[{part}]" if isinstance(part, int) else (f".{part}" if out else part)
    return out


def _kind(value) -> str:
    if value is None:
        return "null"
    if isinstance(value, bool):
        return "a boolean"
    if isinstance(value, (int, float)):
        return "a number"
    if isinstance(value, list):
        return "a list"
    if isinstance(value, dict):
        return "a mapping"
    return "a string"


def _get(d, key):
    return d.get(key, _MISSING) if isinstance(d, dict) else _MISSING


def _opt(d, key):
    """An optional field: absent and explicit null both mean absent."""
    value = _get(d, key)
    return None if value is _MISSING else value


# --- figure -----------------------------------------------------------------


def check_figure(data, cx: BlockContext) -> dict:
    p = ()
    cx.mapping(p, data, required=("src", "alt", "caption"), optional=("credit", "width"))
    return {
        "src": cx.asset(("src",), _get(data, "src")),
        "alt": cx.text(("alt",), _get(data, "alt")),
        "caption": cx.md(("caption",), _get(data, "caption")),
        "credit": cx.md(("credit",), _opt(data, "credit"), required=False),
        "width": cx.enum(("width",), _opt(data, "width"), FIGURE_WIDTHS),
    }


# --- figures (figure row) ---------------------------------------------------


def check_figures(data, cx: BlockContext) -> dict:
    cx.mapping((), data, required=("items",), optional=("caption",))
    items = cx.seq(("items",), _get(data, "items"), lo=FIGURES_ITEMS[0], hi=FIGURES_ITEMS[1]) or []
    out = []
    for i, item in enumerate(items):
        out.append(_figures_item(("items", i), item, cx))
    return {
        "caption": cx.md(("caption",), _opt(data, "caption"), required=False),
        "items": out,
    }


def _figures_item(p, item, cx: BlockContext) -> Optional[dict]:
    if not isinstance(item, dict):
        cx.err(p, "field-type", "must be a mapping")
        return None
    kinds = [k for k in ("image", "diagram", "svg", "card") if k in item]
    if len(kinds) != 1:
        cx.err(p, "field-value", "must have exactly one of image, diagram, svg or card")
        return None
    kind = kinds[0]
    if kind == "image":
        cx.mapping(p, item, required=("image", "alt"), optional=("caption",))
        return {"kind": "image", "src": cx.asset(p + ("image",), item["image"]),
                "alt": cx.text(p + ("alt",), _get(item, "alt")),
                "caption": cx.md(p + ("caption",), _opt(item, "caption"), required=False)}
    if kind == "diagram":
        cx.mapping(p, item, required=("diagram",), optional=("caption",))
        return {"kind": "diagram", "diagram": check_diagram(item["diagram"], cx, p + ("diagram",), nested=True),
                "caption": cx.md(p + ("caption",), _opt(item, "caption"), required=False)}
    if kind == "svg":
        cx.mapping(p, item, required=("svg", "label"), optional=("caption",))
        return {"kind": "svg", "svg": _svg_source(p + ("svg",), item["svg"], cx),
                "label": cx.text(p + ("label",), _get(item, "label")),
                "caption": cx.md(p + ("caption",), _opt(item, "caption"), required=False)}
    cx.mapping(p, item, required=("card",))
    card = item["card"]
    cp = p + ("card",)
    cx.mapping(cp, card, required=("title", "body"), optional=("tone",))
    return {"kind": "card", "title": cx.text(cp + ("title",), _get(card, "title")),
            "body": _paragraphs(cp + ("body",), _get(card, "body"), cx),
            "tone": cx.tone(cp + ("tone",), _opt(card, "tone"))}


def _paragraphs(p, value, cx: BlockContext) -> Optional[list]:
    """A card body: paragraphs split at blank lines, inline Markdown in each."""
    value = cx.text(p, value)
    if value is None:
        return None
    line = cx.line(p)
    out = []
    for chunk in re.split(r"\n[ \t]*\n", value.strip("\n")):
        if chunk.strip():
            out.append(cx._inline(chunk.strip(), line))
    return out


# --- svg --------------------------------------------------------------------


def check_svg(data, cx: BlockContext) -> dict:
    cx.mapping((), data, required=("svg", "label"), optional=("caption",))
    return {
        "label": cx.text(("label",), _get(data, "label")),
        "caption": cx.md(("caption",), _opt(data, "caption"), required=False),
        "svg": _svg_source(("svg",), _get(data, "svg"), cx),
    }


def _svg_source(p, value, cx: BlockContext) -> Optional[dict]:
    value = cx.text(p, value)
    if value is None:
        return None
    tree, violations = validate_svg(value)
    base = _svg_base_line(p, value, cx)
    for line, code, message, element, attribute in violations:
        extra = {k: v for k, v in (("element", element), ("attribute", attribute)) if v is not None}
        cx._report(base + line - 1, code, message, block=cx.block_id, **extra)
    return tree


def _svg_base_line(p, value: str, cx: BlockContext) -> int:
    """The file line of the svg source's first line (a block scalar starts on
    the line after its key)."""
    key_line = cx.line(p)
    first = next((ln.strip() for ln in value.splitlines() if ln.strip()), "")
    rel = key_line - cx.base_line
    for i in range(rel, min(rel + 3, len(cx.body_lines))):
        if first and first in cx.body_lines[i]:
            return cx.base_line + i
    return key_line


# --- diagram ----------------------------------------------------------------


def check_diagram(data, cx: BlockContext, p: tuple = (), *, nested: bool = False) -> Optional[dict]:
    if not isinstance(data, dict):
        cx.err(p, "field-type", "must be a mapping")
        return None
    kind = cx.enum(p + ("kind",), _get(data, "kind"), DIAGRAM_KINDS, required=True)
    common_req = ("kind", "title")
    common_opt = () if nested else ("caption",)  # a row's diagram item carries the caption
    out = {"kind": kind, "title": cx.text(p + ("title",), _get(data, "title"))}
    if not nested:
        out["caption"] = cx.md(p + ("caption",), _opt(data, "caption"), required=False)
    if kind is None:
        return out
    req, opt, fn = _DIAGRAM_KINDS[kind]
    cx.mapping(p, data, required=common_req + req, optional=common_opt + opt)
    out.update(fn(data, cx, p, kind))
    return out


def _graph(data, cx, p, kind) -> dict:
    nodes_in = cx.seq(p + ("nodes",), _get(data, "nodes"), lo=1, hi=MAX_NODES, what="nodes") or []
    local: set[str] = set()
    node_ids: set[str] = set()

    def local_unique(path, value):
        value = cx.local_id(path, value)
        if value is not None:
            if value in local:
                cx.err(path, "id-duplicate", f"duplicate diagram id {value!r}")
            local.add(value)
        return value

    nodes = []
    for i, node in enumerate(nodes_in):
        np_ = p + ("nodes", i)
        if not cx.mapping(np_, node, required=("id", "label"),
                          optional=("sub", "at", "shape", "fields", "tone")):
            continue
        nid = local_unique(np_ + ("id",), _get(node, "id"))
        if nid:
            node_ids.add(nid)
        at = _opt(node, "at")
        if at is not None:
            if (not isinstance(at, list) or len(at) != 2
                    or not all(isinstance(v, int) and not isinstance(v, bool) and v >= 0 for v in at)):
                cx.err(np_ + ("at",), "field-value", "must be [row, col], two whole numbers from 0")
                at = None
        fields = _opt(node, "fields")
        if fields is not None:
            fields = cx.seq(np_ + ("fields",), fields, what="fields")
            if fields is not None:
                fields = [cx.text(np_ + ("fields", j), f) for j, f in enumerate(fields)]
        nodes.append({
            "id": nid,
            "label": cx.text(np_ + ("label",), _get(node, "label")),
            "sub": cx.text(np_ + ("sub",), _opt(node, "sub"), required=False),
            "at": at,
            "shape": cx.enum(np_ + ("shape",), _opt(node, "shape"), SHAPES),
            "fields": fields,
            "tone": cx.tone(np_ + ("tone",), _opt(node, "tone")),
        })

    def node_ref(path, value):
        if value is _MISSING:
            return None
        if not isinstance(value, str) or value not in node_ids:
            cx.err(path, "diagram-ref", f"names no node of this diagram ({value!r})")
            return None
        return value

    groups = None
    groups_in = _opt(data, "groups")
    if groups_in is not None:
        groups = []
        for i, group in enumerate(cx.seq(p + ("groups",), groups_in, hi=MAX_LANES, what="groups") or []):
            gp = p + ("groups", i)
            cx.mapping(gp, group, required=("id", "label", "nodes"))
            members = cx.seq(gp + ("nodes",), _get(group, "nodes"), lo=1, what="nodes") or []
            groups.append({
                "id": local_unique(gp + ("id",), _get(group, "id")),
                "label": cx.text(gp + ("label",), _get(group, "label")),
                "nodes": [node_ref(gp + ("nodes", j), m) for j, m in enumerate(members)],
            })

    edges = []
    for i, edge in enumerate(cx.seq(p + ("edges",), _opt(data, "edges") or [], hi=MAX_EDGES, what="edges") or []):
        ep = p + ("edges", i)
        cx.mapping(ep, edge, required=("from", "to"), optional=("label", "style", "tone"))
        edges.append({
            "from": node_ref(ep + ("from",), _get(edge, "from")),
            "to": node_ref(ep + ("to",), _get(edge, "to")),
            "label": cx.text(ep + ("label",), _opt(edge, "label"), required=False),
            "style": cx.enum(ep + ("style",), _opt(edge, "style"), EDGE_STYLES),
            "tone": cx.tone(ep + ("tone",), _opt(edge, "tone")),
        })

    out = {
        "nodes": nodes,
        "groups": groups,
        "edges": edges,
        "direction": cx.enum(p + ("direction",), _opt(data, "direction"), DIRECTIONS),
    }
    if kind == "state":
        initial = _opt(data, "initial")
        out["initial"] = node_ref(p + ("initial",), initial) if initial is not None else None
        final = _opt(data, "final")
        if final is None:
            out["final"] = None
        elif isinstance(final, list):
            out["final"] = [node_ref(p + ("final", j), f) for j, f in enumerate(final)]
        else:
            out["final"] = [node_ref(p + ("final",), final)]
    return out


def _sequence(data, cx, p, kind) -> dict:
    ids: set[str] = set()
    actors = []
    for i, actor in enumerate(cx.seq(p + ("actors",), _get(data, "actors"), lo=1, hi=MAX_LANES, what="actors") or []):
        ap = p + ("actors", i)
        cx.mapping(ap, actor, required=("id", "label"))
        aid = cx.local_id(ap + ("id",), _get(actor, "id"))
        if aid is not None:
            if aid in ids:
                cx.err(ap + ("id",), "id-duplicate", f"duplicate diagram id {aid!r}")
            ids.add(aid)
        actors.append({"id": aid, "label": cx.text(ap + ("label",), _get(actor, "label"))})

    def actor_ref(path, value):
        if value is _MISSING:
            return None
        if not isinstance(value, str) or value not in ids:
            cx.err(path, "diagram-ref", f"names no actor of this diagram ({value!r})")
            return None
        return value

    steps = []
    for i, step in enumerate(cx.seq(p + ("steps",), _get(data, "steps"), lo=1, hi=MAX_EDGES, what="steps") or []):
        sp = p + ("steps", i)
        cx.mapping(sp, step, required=("from", "to", "label"), optional=("style", "note"))
        steps.append({
            "from": actor_ref(sp + ("from",), _get(step, "from")),
            "to": actor_ref(sp + ("to",), _get(step, "to")),
            "label": cx.text(sp + ("label",), _get(step, "label")),
            "style": cx.enum(sp + ("style",), _opt(step, "style"), EDGE_STYLES),
            "note": cx.text(sp + ("note",), _opt(step, "note"), required=False),
        })
    return {"actors": actors, "steps": steps}


def _stack(data, cx, p, kind) -> dict:
    layers = []
    total = 0
    for i, layer in enumerate(cx.seq(p + ("layers",), _get(data, "layers"), lo=1, hi=MAX_LANES, what="layers") or []):
        lp = p + ("layers", i)
        cx.mapping(lp, layer, required=("label",), optional=("items", "tone"))
        items = _opt(layer, "items")
        if items is not None:
            items = cx.seq(lp + ("items",), items, what="items")
            if items is not None:
                total += len(items)
                items = [cx.text(lp + ("items", j), it) for j, it in enumerate(items)]
        layers.append({"label": cx.text(lp + ("label",), _get(layer, "label")), "items": items,
                       "tone": cx.tone(lp + ("tone",), _opt(layer, "tone"))})
    if total > MAX_NODES:
        cx.err(p + ("layers",), "limit", f"a stack holds at most {MAX_NODES} items, has {total}")
    return {"layers": layers, "nested": cx.boolean(p + ("nested",), _opt(data, "nested"))}


def _timeline(data, cx, p, kind) -> dict:
    ap = p + ("axis",)
    axis_in = _get(data, "axis")
    axis = None
    lo = hi = None
    if cx.mapping(ap, axis_in, required=("unit", "from", "to"), optional=("ticks",)) or isinstance(axis_in, dict):
        lo = cx.number(ap + ("from",), _get(axis_in, "from"))
        hi = cx.number(ap + ("to",), _get(axis_in, "to"))
        if lo is not None and hi is not None and not lo < hi:
            cx.err(ap, "field-value", "axis.from must be less than axis.to")
            lo = hi = None
        ticks = _opt(axis_in, "ticks")
        if ticks is not None:
            ticks = cx.seq(ap + ("ticks",), ticks, lo=1, what="ticks")
            if ticks is not None:
                ticks = [cx.number(ap + ("ticks", j), t) for j, t in enumerate(ticks)]
        axis = {"unit": cx.text(ap + ("unit",), _get(axis_in, "unit")), "from": lo, "to": hi, "ticks": ticks}

    def within(path, value):
        if value is not None and lo is not None and not (lo <= value <= hi):
            cx.err(path, "field-value", f"{value} is outside the axis ({lo} to {hi})")
        return value

    if axis is not None and axis["ticks"]:
        for j, t in enumerate(axis["ticks"]):
            within(ap + ("ticks", j), t)

    points = 0
    lanes = []
    for i, lane in enumerate(cx.seq(p + ("lanes",), _get(data, "lanes"), lo=1, hi=MAX_LANES, what="lanes") or []):
        lp = p + ("lanes", i)
        cx.mapping(lp, lane, required=("label", "bars"), optional=("marks",))
        bars = []
        for j, bar in enumerate(cx.seq(lp + ("bars",), _get(lane, "bars"), what="bars") or []):
            bp = lp + ("bars", j)
            cx.mapping(bp, bar, required=("from", "to"), optional=("label", "tone"))
            b_from = within(bp + ("from",), cx.number(bp + ("from",), _get(bar, "from")))
            b_to = within(bp + ("to",), cx.number(bp + ("to",), _get(bar, "to")))
            if b_from is not None and b_to is not None and b_from > b_to:
                cx.err(bp, "field-value", "a bar's from must not be after its to")
            bars.append({"from": b_from, "to": b_to,
                         "label": cx.text(bp + ("label",), _opt(bar, "label"), required=False),
                         "tone": cx.tone(bp + ("tone",), _opt(bar, "tone"))})
        marks = _opt(lane, "marks")
        if marks is not None:
            marks_in = cx.seq(lp + ("marks",), marks, what="marks") or []
            marks = []
            for j, mark in enumerate(marks_in):
                mp = lp + ("marks", j)
                cx.mapping(mp, mark, required=("at", "label"))
                marks.append({"at": within(mp + ("at",), cx.number(mp + ("at",), _get(mark, "at"))),
                              "label": cx.text(mp + ("label",), _get(mark, "label"))})
        points += len(bars) + len(marks or [])
        lanes.append({"label": cx.text(lp + ("label",), _get(lane, "label")), "bars": bars, "marks": marks})
    if points > MAX_POINTS:
        cx.err(p + ("lanes",), "limit", f"a timeline holds at most {MAX_POINTS} bars and marks, has {points}")
    return {"axis": axis, "lanes": lanes}


def _chart(data, cx, p, kind) -> dict:
    ctype = cx.enum(p + ("type",), _get(data, "type"), CHART_TYPES, required=True)
    xp = p + ("x",)
    x_in = _get(data, "x")
    x = None
    n_categories = None
    if cx.mapping(xp, x_in, required=("label",), optional=("categories", "numeric")) or isinstance(x_in, dict):
        has_c, has_n = "categories" in x_in, "numeric" in x_in
        categories = numeric = None
        if has_c == has_n:
            cx.err(xp, "field-value", "x needs exactly one of categories or numeric")
        elif has_c:
            cats = cx.seq(xp + ("categories",), x_in["categories"], lo=1, what="categories")
            if cats is not None:
                categories = [cx.text(xp + ("categories", j), c) for j, c in enumerate(cats)]
                n_categories = len(categories)
        else:
            np_ = xp + ("numeric",)
            num = x_in["numeric"]
            if cx.mapping(np_, num, required=("from", "to")):
                n_from = cx.number(np_ + ("from",), _get(num, "from"))
                n_to = cx.number(np_ + ("to",), _get(num, "to"))
                if n_from is not None and n_to is not None and not n_from < n_to:
                    cx.err(np_, "field-value", "numeric.from must be less than numeric.to")
                numeric = {"from": n_from, "to": n_to}
        x = {"label": cx.text(xp + ("label",), _get(x_in, "label")), "categories": categories, "numeric": numeric}

    yp = p + ("y",)
    y_in = _get(data, "y")
    y = None
    if cx.mapping(yp, y_in, required=("label",), optional=("min", "max")) or isinstance(y_in, dict):
        y_min = cx.number(yp + ("min",), _opt(y_in, "min"), required=False)
        y_max = cx.number(yp + ("max",), _opt(y_in, "max"), required=False)
        if y_min is not None and y_max is not None and not y_min < y_max:
            cx.err(yp, "field-value", "y.min must be less than y.max")
        y = {"label": cx.text(yp + ("label",), _get(y_in, "label")), "min": y_min, "max": y_max}

    points = 0
    series = []
    for i, s in enumerate(cx.seq(p + ("series",), _get(data, "series"), lo=1, what="series") or []):
        sp = p + ("series", i)
        cx.mapping(sp, s, required=("name", "values"), optional=("tone",))
        values = cx.seq(sp + ("values",), _get(s, "values"), lo=1, what="values")
        out_values = None
        if values is not None:
            points += len(values)
            if n_categories is not None and len(values) != n_categories:
                cx.err(sp + ("values",), "field-value",
                       f"has {len(values)} values for {n_categories} categories")
            out_values = [_chart_value(sp + ("values", j), v, ctype, cx) for j, v in enumerate(values)]
        series.append({"name": cx.text(sp + ("name",), _get(s, "name")), "values": out_values,
                       "tone": cx.tone(sp + ("tone",), _opt(s, "tone"))})
    if points > MAX_POINTS:
        cx.err(p + ("series",), "limit", f"a chart holds at most {MAX_POINTS} data points, has {points}")

    rules = _opt(data, "rules")
    if rules is not None:
        rules_in = cx.seq(p + ("rules",), rules, what="rules") or []
        rules = []
        for i, rule in enumerate(rules_in):
            rp = p + ("rules", i)
            cx.mapping(rp, rule, required=("at", "label"))
            rules.append({"at": cx.number(rp + ("at",), _get(rule, "at")),
                          "label": cx.text(rp + ("label",), _get(rule, "label"))})
    return {"chart": ctype, "x": x, "y": y, "series": series, "rules": rules}


def _chart_value(path, value, ctype, cx):
    if ctype == "interval":
        if (not isinstance(value, list) or len(value) not in (2, 3)
                or any(isinstance(v, bool) or not isinstance(v, (int, float)) for v in value)):
            cx.err(path, "field-value", "an interval value is [low, high] or [low, median, high]")
            return None
        if list(value) != sorted(value):
            cx.err(path, "field-value", "an interval value must run low to high")
            return None
        return value
    return cx.number(path, value)


_DIAGRAM_KINDS = {
    "flow": (("nodes",), ("groups", "edges", "direction"), _graph),
    "state": (("nodes",), ("groups", "edges", "direction", "initial", "final"), _graph),
    "sequence": (("actors", "steps"), (), _sequence),
    "stack": (("layers",), ("nested",), _stack),
    "timeline": (("axis", "lanes"), (), _timeline),
    "chart": (("type", "x", "y", "series"), ("rules",), _chart),
}


# --- quiz -------------------------------------------------------------------


def check_quiz(data, cx: BlockContext) -> dict:
    cx.mapping((), data, required=("items",), optional=("title",))
    items = []
    for i, item in enumerate(cx.seq(("items",), _get(data, "items"), lo=QUIZ_ITEMS[0], hi=QUIZ_ITEMS[1]) or []):
        items.append(_quiz_item(("items", i), item, cx))
    return {"title": cx.text(("title",), _opt(data, "title"), required=False), "items": items}


def _quiz_item(p, item, cx: BlockContext) -> Optional[dict]:
    if not isinstance(item, dict):
        cx.err(p, "field-type", "must be a mapping")
        return None
    qtype = cx.enum(p + ("type",), _get(item, "type"), QUIZ_TYPES, required=True)
    out = {"id": cx.document_id(p + ("id",), _get(item, "id")), "type": qtype}
    if qtype == "choice":
        cx.mapping(p, item, required=("id", "type", "prompt", "options", "answer", "explain"))
        option_ids: list[str] = []
        options = []
        for j, opt in enumerate(cx.seq(p + ("options",), _get(item, "options"), lo=QUIZ_OPTIONS[0],
                                       hi=QUIZ_OPTIONS[1], what="options") or []):
            op = p + ("options", j)
            cx.mapping(op, opt, required=("id", "text"))
            oid = cx.local_id(op + ("id",), _get(opt, "id"))
            if oid is not None:
                if oid in option_ids:
                    cx.err(op + ("id",), "id-duplicate", f"duplicate option id {oid!r}")
                option_ids.append(oid)
            options.append({"id": oid, "text": cx.md(op + ("text",), _get(opt, "text"))})
        answer = cx.seq(p + ("answer",), _get(item, "answer"), lo=1, what="answer ids")
        if answer is not None:
            seen = set()
            for j, a in enumerate(answer):
                if not isinstance(a, str) or a not in option_ids:
                    cx.err(p + ("answer", j), "quiz-answer", f"names no option of this item ({a!r})")
                elif a in seen:
                    cx.err(p + ("answer", j), "quiz-answer", f"repeats option {a!r}")
                if isinstance(a, str):  # a non-string (e.g. a nested list) is unhashable: already refused above
                    seen.add(a)
        out.update({"prompt": cx.md(p + ("prompt",), _get(item, "prompt")), "options": options,
                    "answer": answer, "explain": cx.md(p + ("explain",), _get(item, "explain"))})
    elif qtype == "recall":
        cx.mapping(p, item, required=("id", "type", "prompt", "answer"), optional=("explain",))
        out.update({"prompt": cx.md(p + ("prompt",), _get(item, "prompt")),
                    "answer": cx.md(p + ("answer",), _get(item, "answer")),
                    "explain": cx.md(p + ("explain",), _opt(item, "explain"), required=False)})
    elif qtype == "cloze":
        cx.mapping(p, item, required=("id", "type", "text"), optional=("explain",))
        out.update({"text": _cloze(p + ("text",), _get(item, "text"), cx),
                    "explain": cx.md(p + ("explain",), _opt(item, "explain"), required=False)})
    return out


def _cloze(p, value, cx: BlockContext) -> Optional[list]:
    value = cx.text(p, value)
    if value is None:
        return None
    if BLANK_OPEN in value or BLANK_CLOSE in value:
        cx.err(p, "field-value", "contains a reserved private-use character")
        return None
    blanks: list[list[str]] = []

    def mark(m):
        alternatives = m.group(1).split("|")
        if any(not a.strip() for a in alternatives):
            cx.err(p, "cloze-blank", f"blank {{{{{m.group(1)}}}}} has an empty alternative")
        blanks.append(alternatives)
        return f"{BLANK_OPEN}{len(blanks) - 1}{BLANK_CLOSE}"

    marked = BLANK_RE.sub(mark, value)
    if not CLOZE_BLANKS[0] <= len(blanks) <= CLOZE_BLANKS[1]:
        cx.err(p, "cloze-blank", f"must have {CLOZE_BLANKS[0]}-{CLOZE_BLANKS[1]} blanks, has {len(blanks)}")
    if "{{" in marked or "}}" in marked:
        cx.err(p, "cloze-blank", "has an unbalanced {{ or }}")
    nodes = cx._inline(marked, cx.line(p))
    out, used = _split_blanks(nodes, blanks)
    if used != len(blanks):
        cx.err(p, "cloze-blank", "a blank sits inside code or a link; blanks must be in plain text")
    return out


def _split_blanks(nodes: list, blanks: list) -> tuple[list, int]:
    out: list = []
    used = 0
    pattern = re.compile(f"{BLANK_OPEN}(\\d+){BLANK_CLOSE}")
    for node in nodes:
        if node.get("type") == "text":
            pos = 0
            for m in pattern.finditer(node["text"]):
                if m.start() > pos:
                    out.append({"type": "text", "text": node["text"][pos:m.start()]})
                out.append({"type": "blank", "accept": blanks[int(m.group(1))]})
                used += 1
                pos = m.end()
            if pos < len(node["text"]):
                out.append({"type": "text", "text": node["text"][pos:]})
        elif "children" in node and node.get("type") in ("em", "strong", "del"):
            children, n = _split_blanks(node["children"], blanks)
            used += n
            out.append({**node, "children": children})
        else:
            out.append(node)
    return out, used


# --- sources ----------------------------------------------------------------


def check_sources(data, cx: BlockContext) -> dict:
    cx.mapping((), data, required=("items",))
    items = []
    for i, item in enumerate(cx.seq(("items",), _get(data, "items"), lo=1) or []):
        p = ("items", i)
        cx.mapping(p, item, required=("id", "title", "url"),
                   optional=("publisher", "date", "accessed", "note"))
        url = cx.text(p + ("url",), _get(item, "url"))
        if url is not None:
            try:
                ref = parse_ref(url)
                if ref["kind"] != "external":
                    cx.err(p + ("url",), "ref-scheme", f"a source url must be http(s), not {url!r}")
            except RefError as exc:
                cx.err(p + ("url",), exc.code, exc.message)
        items.append({
            "id": cx.document_id(p + ("id",), _get(item, "id")),
            "title": cx.text(p + ("title",), _get(item, "title")),
            "url": url,
            "publisher": cx.text(p + ("publisher",), _opt(item, "publisher"), required=False),
            "date": cx.text(p + ("date",), _opt(item, "date"), required=False),
            "accessed": cx.text(p + ("accessed",), _opt(item, "accessed"), required=False),
            "note": cx.text(p + ("note",), _opt(item, "note"), required=False),
        })
    return {"items": items}


CHECKS = {
    "figure": check_figure,
    "figures": check_figures,
    "diagram": check_diagram,
    "svg": check_svg,
    "quiz": check_quiz,
    "sources": check_sources,
}
