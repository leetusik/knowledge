"""The custom-SVG allowlist validator (P29 *Custom SVG*): **reject, never strip**.

``validate_svg(source)`` parses one ``<svg>`` element with expat and returns
``(tree, violations)``. ``tree`` is the normalized element tree (only when there
are no violations); each violation is ``(line_in_source, code, message,
element, attribute)`` with a 1-based line inside ``source``. Every violation is
reported, not just the first, so the 422 lists the block id, the element and
the attribute of each.

The normalized tree: ``{"name": <local name>, "attrs": {name: value},
"children": [<element> | {"text": <str>}]}``. ``xlink:href`` is normalized to
``href``. Text is kept only inside ``text``, ``tspan``, ``title`` and ``desc``
(verbatim, whitespace included); whitespace-only text elsewhere is dropped and
any other text elsewhere is rejected.
"""
from __future__ import annotations

import re
from typing import Optional
from xml.parsers import expat

from .ids import is_valid_id

SVG_NS = "http://www.w3.org/2000/svg"
XLINK_NS = "http://www.w3.org/1999/xlink"

MAX_BYTES = 64 * 1024
MAX_ELEMENTS = 2000

ALLOWED_ELEMENTS = frozenset(
    "svg g defs marker title desc rect circle ellipse line polyline polygon path text tspan use".split()
)
FORBIDDEN_ELEMENTS = frozenset(
    "script foreignObject style image a animate set animateMotion animateTransform animateColor "
    "filter".split()
)
TEXT_ELEMENTS = frozenset(("text", "tspan", "title", "desc"))

ALLOWED_ATTRIBUTES = frozenset(
    (
        # geometry and transform
        "x y x1 y1 x2 y2 cx cy r rx ry width height d points viewBox transform "
        "preserveAspectRatio refX refY markerWidth markerHeight markerUnits orient "
        # markers
        "marker-start marker-mid marker-end "
        # presentation
        "fill stroke stroke-width stroke-dasharray stroke-linecap stroke-linejoin opacity "
        "fill-opacity stroke-opacity font-size font-weight text-anchor dominant-baseline "
        "letter-spacing vector-effect "
        # other
        "id class role aria-label aria-hidden"
    ).split()
)
MARKER_ATTRIBUTES = frozenset(("marker-start", "marker-mid", "marker-end"))

TONES = (
    "default", "muted", "accent", "ok", "warn", "bad", "store",
    "series-1", "series-2", "series-3", "series-4", "series-5", "series-6",
)
_CLASS_RE = re.compile(r"^kb-(?:fill|stroke)-(?:" + "|".join(re.escape(t) for t in TONES) + r")$")
_LOCAL_URL_RE = re.compile(r"^url\(#([^)\s]+)\)$")


class _Abort(Exception):
    pass


def validate_svg(source: str):
    violations: list = []

    def bad(line, code, message, element=None, attribute=None):
        violations.append((line, code, message, element, attribute))

    if len(source.encode("utf-8")) > MAX_BYTES:
        bad(1, "svg-limit", f"the svg source is over {MAX_BYTES // 1024} KB")
        return None, violations

    parser = expat.ParserCreate(encoding="utf-8", namespace_separator=" ")
    parser.SetParamEntityParsing(expat.XML_PARAM_ENTITY_PARSING_NEVER)

    root: Optional[dict] = None
    stack: list[dict] = []
    count = 0
    ids: dict[str, int] = {}
    local_refs: list[tuple[int, str, str, str]] = []  # (line, element, attribute, id)

    def where() -> int:
        return parser.CurrentLineNumber

    def xml_error(message):
        def handler(*_args):
            bad(where(), "svg-xml", message)
            raise _Abort()
        return handler

    parser.StartDoctypeDeclHandler = xml_error("<!DOCTYPE> is not allowed in an svg")
    parser.EntityDeclHandler = xml_error("entity declarations are not allowed in an svg")
    parser.ProcessingInstructionHandler = xml_error("processing instructions are not allowed in an svg")
    parser.CommentHandler = xml_error("comments are not allowed in an svg")
    parser.StartCdataSectionHandler = xml_error("CDATA sections are not allowed in an svg")
    parser.ExternalEntityRefHandler = xml_error("external entities are not allowed in an svg")

    def split(name: str) -> tuple[Optional[str], str]:
        if " " in name:
            ns, local = name.split(" ", 1)
            return ns, local
        return None, name

    def start(name, attrs):
        nonlocal root, count
        line = where()
        count += 1
        ns, local = split(name)
        node = {"name": local, "attrs": {}, "children": [], "_ok": True}
        if ns not in (None, SVG_NS):
            bad(line, "svg-namespace", f"element {local!r} is in a foreign namespace ({ns})", element=local)
            node["_ok"] = False
        elif local in FORBIDDEN_ELEMENTS:
            bad(line, "svg-element", f"<{local}> is forbidden in an svg", element=local)
            node["_ok"] = False
        elif local not in ALLOWED_ELEMENTS:
            bad(line, "svg-element", f"<{local}> is not on the svg allowlist", element=local)
            node["_ok"] = False
        if root is None:
            if local != "svg":
                bad(line, "svg-root", f"the root element must be <svg>, not <{local}>", element=local)
            root = node
        for raw_name, value in attrs.items():
            ans, aname = split(raw_name)
            check_attribute(line, local, ans, aname, value, node)
        if root is node and local == "svg" and "viewBox" not in node["attrs"]:
            if not any(split(k)[1] == "viewBox" for k in attrs):
                bad(line, "svg-root", "the root <svg> needs a viewBox", element="svg", attribute="viewBox")
        if stack:
            stack[-1]["children"].append(node)
        stack.append(node)

    def check_attribute(line, element, ans, aname, value, node):
        shown = f"xlink:{aname}" if ans == XLINK_NS else aname
        if ans == XLINK_NS and aname == "href" or (ans is None and aname == "href"):
            if element != "use":
                bad(line, "svg-attribute", f"{shown} is only allowed on <use>", element, shown)
                return
            if not value.startswith("#") or not is_valid_id(value[1:]):
                bad(line, "svg-ref", f"{shown} must be a local #id, not {value!r}", element, shown)
                return
            local_refs.append((line, element, shown, value[1:]))
            node["attrs"]["href"] = value
            return
        if ans is not None:
            bad(line, "svg-namespace", f"attribute {shown!r} is in a foreign namespace ({ans})", element, shown)
            return
        if aname == "style":
            bad(line, "svg-attribute", "the style attribute is forbidden", element, aname)
            return
        if aname.lower().startswith("on"):
            bad(line, "svg-attribute", f"event handler {aname} is forbidden", element, aname)
            return
        if aname not in ALLOWED_ATTRIBUTES:
            bad(line, "svg-attribute", f"attribute {aname} is not on the svg allowlist", element, aname)
            return
        if "url(" in value.lower() and aname not in MARKER_ATTRIBUTES:
            bad(line, "svg-ref", f"url() is only allowed in marker attributes ({aname}={value!r})", element, aname)
            return
        if aname in ("fill", "stroke") and value not in ("none", "currentColor"):
            bad(line, "svg-value",
                f"{aname} may only be none or currentColor (use a kb-{aname}-<tone> class), not {value!r}",
                element, aname)
            return
        if aname in MARKER_ATTRIBUTES:
            m = _LOCAL_URL_RE.match(value)
            if not m or not is_valid_id(m.group(1)):
                bad(line, "svg-ref", f"{aname} must be url(#local-id), not {value!r}", element, aname)
                return
            local_refs.append((line, element, aname, m.group(1)))
        if aname == "class":
            for token in value.split():
                if not _CLASS_RE.match(token):
                    bad(line, "svg-value", f"class {token!r} is not a kb-fill-<tone> or kb-stroke-<tone> class",
                        element, aname)
                    return
        if aname == "id":
            if not is_valid_id(value):
                bad(line, "svg-value", f"malformed svg id {value!r}", element, aname)
                return
            if value in ids:
                bad(line, "svg-value", f"duplicate svg id {value!r}", element, aname)
                return
            ids[value] = line
        if aname == "aria-hidden" and value not in ("true", "false"):
            bad(line, "svg-value", f"aria-hidden must be true or false, not {value!r}", element, aname)
            return
        node["attrs"][aname] = value

    def end(_name):
        stack.pop()

    def chars(data):
        if not stack:
            return
        node = stack[-1]
        if not node["_ok"]:
            return  # already rejected; its text adds nothing new
        if node["name"] in TEXT_ELEMENTS:
            kids = node["children"]
            if kids and "text" in kids[-1]:
                kids[-1]["text"] += data
            else:
                kids.append({"text": data})
        elif data.strip():
            bad(where(), "svg-text", f"text is only allowed inside text, tspan, title or desc (<{node['name']}>)",
                element=node["name"])

    parser.StartElementHandler = start
    parser.EndElementHandler = end
    parser.CharacterDataHandler = chars

    try:
        parser.Parse(source.encode("utf-8"), True)
    except _Abort:
        return None, violations
    except expat.ExpatError as exc:
        bad(exc.lineno or 1, "svg-xml", f"the svg is not well-formed XML: {expat.ErrorString(exc.code)}")
        return None, violations

    if root is None:
        bad(1, "svg-root", "the svg block holds no <svg> element")
        return None, violations
    if count > MAX_ELEMENTS:
        bad(1, "svg-limit", f"the svg has {count} elements (at most {MAX_ELEMENTS})")
    for line, element, attribute, target in local_refs:
        if target not in ids:
            bad(line, "svg-ref", f"{attribute} points at #{target}, which this svg does not define",
                element, attribute)
    if violations:
        return None, violations
    return _clean(root), violations


def _clean(node: dict) -> dict:
    if "text" in node:
        return {"text": node["text"]}
    return {
        "name": node["name"],
        "attrs": dict(sorted(node["attrs"].items())),
        "children": [_clean(child) for child in node["children"]],
    }
