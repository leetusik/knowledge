/**
 * The custom-SVG allowlist (mirrors `server/native/svg.py`, P29 *Custom SVG*).
 *
 * Two halves:
 *  - `validateSvg(source)` — the validator: **reject, never strip**. It parses
 *    one `<svg>` with saxes (namespace-aware, no DTD, no external entities) and
 *    returns the normalized element tree, or every violation it found.
 *  - `svgAttrsToProps(...)` / `allowedSvgElement(...)` — the render-time mapping
 *    of an already-validated tree to React props. It applies the allowlist a
 *    SECOND time and drops anything off-list (P29 *Render*: defense in depth),
 *    and scopes the svg's internal ids so two drawings never collide.
 */
import { SaxesParser, type SaxesTagNS } from "saxes";

import { isValidId } from "./ids";
import { pyRepr } from "./pyutil";

export const SVG_NS = "http://www.w3.org/2000/svg";
export const XLINK_NS = "http://www.w3.org/1999/xlink";
const XMLNS_NS = "http://www.w3.org/2000/xmlns/";

export const MAX_BYTES = 64 * 1024;
export const MAX_ELEMENTS = 2000;

export const ALLOWED_ELEMENTS = new Set(
  "svg g defs marker title desc rect circle ellipse line polyline polygon path text tspan use".split(
    " ",
  ),
);
const FORBIDDEN_ELEMENTS = new Set(
  (
    "script foreignObject style image a animate set animateMotion animateTransform animateColor " +
    "filter"
  ).split(" "),
);
export const TEXT_ELEMENTS = new Set(["text", "tspan", "title", "desc"]);

export const ALLOWED_ATTRIBUTES = new Set(
  // geometry and transform
  (
    "x y x1 y1 x2 y2 cx cy r rx ry width height d points viewBox transform " +
    "preserveAspectRatio refX refY markerWidth markerHeight markerUnits orient " +
    // markers
    "marker-start marker-mid marker-end " +
    // presentation
    "fill stroke stroke-width stroke-dasharray stroke-linecap stroke-linejoin opacity " +
    "fill-opacity stroke-opacity font-size font-weight text-anchor dominant-baseline " +
    "letter-spacing vector-effect " +
    // other
    "id class role aria-label aria-hidden"
  ).split(" "),
);
const MARKER_ATTRIBUTES = new Set(["marker-start", "marker-mid", "marker-end"]);

export const TONES = [
  "default",
  "muted",
  "accent",
  "ok",
  "warn",
  "bad",
  "store",
  "series-1",
  "series-2",
  "series-3",
  "series-4",
  "series-5",
  "series-6",
] as const;
const CLASS_RE = new RegExp(`^kb-(?:fill|stroke)-(?:${TONES.join("|")})$`);
const LOCAL_URL_RE = /^url\(#([^)\s]+)\)$/;

export interface SvgElement {
  name: string;
  attrs: Record<string, string>;
  children: SvgChild[];
}
export type SvgChild = SvgElement | { text: string };

/** `(line_in_source, code, message, element, attribute)`, line 1-based in the svg source. */
export type SvgViolation = [
  number,
  string,
  string,
  string | null,
  string | null,
];

interface Building {
  name: string;
  attrs: Record<string, string>;
  children: (Building | { text: string })[];
  ok: boolean;
}

class Abort extends Error {}

function utf8Length(value: string): number {
  return new TextEncoder().encode(value).length;
}

export function validateSvg(source: string): {
  tree: SvgElement | null;
  violations: SvgViolation[];
} {
  const violations: SvgViolation[] = [];
  const bad = (
    line: number,
    code: string,
    message: string,
    element: string | null = null,
    attribute: string | null = null,
  ) => violations.push([line, code, message, element, attribute]);

  if (utf8Length(source) > MAX_BYTES) {
    bad(1, "svg-limit", `the svg source is over ${MAX_BYTES / 1024} KB`);
    return { tree: null, violations };
  }

  const parser = new SaxesParser({ xmlns: true, position: true });
  let root: Building | null = null;
  const stack: Building[] = [];
  let count = 0;
  const ids = new Map<string, number>();
  const localRefs: [number, string, string, string][] = [];
  let tagLine = 1;
  let textLine = 1;

  const xmlError = (message: string) => () => {
    bad(parser.line, "svg-xml", message);
    throw new Abort();
  };
  parser.on("doctype", xmlError("<!DOCTYPE> is not allowed in an svg"));
  parser.on(
    "processinginstruction",
    xmlError("processing instructions are not allowed in an svg"),
  );
  parser.on("comment", xmlError("comments are not allowed in an svg"));
  parser.on("cdata", xmlError("CDATA sections are not allowed in an svg"));
  parser.on("error", (err) => {
    bad(
      parser.line || 1,
      "svg-xml",
      `the svg is not well-formed XML: ${err.message}`,
    );
    throw new Abort();
  });

  const checkAttribute = (
    line: number,
    element: string,
    ans: string | null,
    aname: string,
    value: string,
    node: Building,
  ) => {
    const shown = ans === XLINK_NS ? `xlink:${aname}` : aname;
    if (
      (ans === XLINK_NS && aname === "href") ||
      (ans === null && aname === "href")
    ) {
      if (element !== "use") {
        bad(
          line,
          "svg-attribute",
          `${shown} is only allowed on <use>`,
          element,
          shown,
        );
        return;
      }
      if (!value.startsWith("#") || !isValidId(value.slice(1))) {
        bad(
          line,
          "svg-ref",
          `${shown} must be a local #id, not ${pyRepr(value)}`,
          element,
          shown,
        );
        return;
      }
      localRefs.push([line, element, shown, value.slice(1)]);
      node.attrs.href = value;
      return;
    }
    if (ans !== null) {
      bad(
        line,
        "svg-namespace",
        `attribute ${pyRepr(shown)} is in a foreign namespace (${ans})`,
        element,
        shown,
      );
      return;
    }
    if (aname === "style") {
      bad(
        line,
        "svg-attribute",
        "the style attribute is forbidden",
        element,
        aname,
      );
      return;
    }
    if (aname.toLowerCase().startsWith("on")) {
      bad(
        line,
        "svg-attribute",
        `event handler ${aname} is forbidden`,
        element,
        aname,
      );
      return;
    }
    if (!ALLOWED_ATTRIBUTES.has(aname)) {
      bad(
        line,
        "svg-attribute",
        `attribute ${aname} is not on the svg allowlist`,
        element,
        aname,
      );
      return;
    }
    if (value.toLowerCase().includes("url(") && !MARKER_ATTRIBUTES.has(aname)) {
      bad(
        line,
        "svg-ref",
        `url() is only allowed in marker attributes (${aname}=${pyRepr(value)})`,
        element,
        aname,
      );
      return;
    }
    if (
      (aname === "fill" || aname === "stroke") &&
      value !== "none" &&
      value !== "currentColor"
    ) {
      bad(
        line,
        "svg-value",
        `${aname} may only be none or currentColor (use a kb-${aname}-<tone> class), not ${pyRepr(value)}`,
        element,
        aname,
      );
      return;
    }
    if (MARKER_ATTRIBUTES.has(aname)) {
      const m = LOCAL_URL_RE.exec(value);
      if (!m || !isValidId(m[1])) {
        bad(
          line,
          "svg-ref",
          `${aname} must be url(#local-id), not ${pyRepr(value)}`,
          element,
          aname,
        );
        return;
      }
      localRefs.push([line, element, aname, m[1]]);
    }
    if (aname === "class") {
      for (const token of value.split(/\s+/).filter(Boolean)) {
        if (!CLASS_RE.test(token)) {
          bad(
            line,
            "svg-value",
            `class ${pyRepr(token)} is not a kb-fill-<tone> or kb-stroke-<tone> class`,
            element,
            aname,
          );
          return;
        }
      }
    }
    if (aname === "id") {
      if (!isValidId(value)) {
        bad(
          line,
          "svg-value",
          `malformed svg id ${pyRepr(value)}`,
          element,
          aname,
        );
        return;
      }
      if (ids.has(value)) {
        bad(
          line,
          "svg-value",
          `duplicate svg id ${pyRepr(value)}`,
          element,
          aname,
        );
        return;
      }
      ids.set(value, line);
    }
    if (aname === "aria-hidden" && value !== "true" && value !== "false") {
      bad(
        line,
        "svg-value",
        `aria-hidden must be true or false, not ${pyRepr(value)}`,
        element,
        aname,
      );
      return;
    }
    node.attrs[aname] = value;
  };

  parser.on("opentagstart", () => {
    tagLine = parser.line;
  });
  parser.on("opentag", (tag: SaxesTagNS) => {
    const line = tagLine;
    count += 1;
    const ns = tag.uri ? tag.uri : null;
    const local = tag.local;
    const node: Building = { name: local, attrs: {}, children: [], ok: true };
    if (ns !== null && ns !== SVG_NS) {
      bad(
        line,
        "svg-namespace",
        `element ${pyRepr(local)} is in a foreign namespace (${ns})`,
        local,
      );
      node.ok = false;
    } else if (FORBIDDEN_ELEMENTS.has(local)) {
      bad(line, "svg-element", `<${local}> is forbidden in an svg`, local);
      node.ok = false;
    } else if (!ALLOWED_ELEMENTS.has(local)) {
      bad(line, "svg-element", `<${local}> is not on the svg allowlist`, local);
      node.ok = false;
    }
    if (root === null) {
      if (local !== "svg")
        bad(
          line,
          "svg-root",
          `the root element must be <svg>, not <${local}>`,
          local,
        );
      root = node;
    }
    let sawViewBox = false;
    for (const attr of Object.values(tag.attributes)) {
      if (
        attr.uri === XMLNS_NS ||
        attr.prefix === "xmlns" ||
        attr.name === "xmlns"
      )
        continue;
      if (attr.local === "viewBox") sawViewBox = true;
      checkAttribute(
        line,
        local,
        attr.uri ? attr.uri : null,
        attr.local,
        attr.value,
        node,
      );
    }
    if (
      root === node &&
      local === "svg" &&
      !("viewBox" in node.attrs) &&
      !sawViewBox
    ) {
      bad(line, "svg-root", "the root <svg> needs a viewBox", "svg", "viewBox");
    }
    if (stack.length) stack[stack.length - 1].children.push(node);
    stack.push(node);
    textLine = parser.line;
  });
  parser.on("closetag", () => {
    stack.pop();
    textLine = parser.line;
  });
  parser.on("text", (data: string) => {
    const startLine = textLine;
    textLine += (data.match(/\n/g) ?? []).length;
    if (!stack.length) return;
    const node = stack[stack.length - 1];
    if (!node.ok) return; // already rejected; its text adds nothing new
    if (TEXT_ELEMENTS.has(node.name)) {
      const kids = node.children;
      const last = kids[kids.length - 1];
      if (last && "text" in last) last.text += data;
      else kids.push({ text: data });
      return;
    }
    // expat reports character data line by line; every line holding
    // non-whitespace text is one violation at that line.
    data.split("\n").forEach((segment, i) => {
      if (segment.trim()) {
        bad(
          startLine + i,
          "svg-text",
          `text is only allowed inside text, tspan, title or desc (<${node.name}>)`,
          node.name,
        );
      }
    });
  });

  try {
    parser.write(source).close();
  } catch (err) {
    if (err instanceof Abort) return { tree: null, violations };
    bad(
      parser.line || 1,
      "svg-xml",
      `the svg is not well-formed XML: ${String(err)}`,
    );
    return { tree: null, violations };
  }

  const finalRoot = root as Building | null;
  if (finalRoot === null) {
    bad(1, "svg-root", "the svg block holds no <svg> element");
    return { tree: null, violations };
  }
  if (count > MAX_ELEMENTS)
    bad(
      1,
      "svg-limit",
      `the svg has ${count} elements (at most ${MAX_ELEMENTS})`,
    );
  for (const [line, element, attribute, target] of localRefs) {
    if (!ids.has(target)) {
      bad(
        line,
        "svg-ref",
        `${attribute} points at #${target}, which this svg does not define`,
        element,
        attribute,
      );
    }
  }
  if (violations.length) return { tree: null, violations };
  return { tree: clean(finalRoot) as SvgElement, violations };
}

function clean(node: Building | { text: string }): SvgChild {
  if ("text" in node) return { text: node.text };
  const attrs: Record<string, string> = {};
  for (const key of Object.keys(node.attrs).sort())
    attrs[key] = node.attrs[key];
  return { name: node.name, attrs, children: node.children.map(clean) };
}

// --- the render-time mapping (defense in depth) -------------------------------

/** SVG attribute names whose React prop is camelCased. */
const REACT_PROP: Record<string, string> = {
  class: "className",
  "marker-start": "markerStart",
  "marker-mid": "markerMid",
  "marker-end": "markerEnd",
  "stroke-width": "strokeWidth",
  "stroke-dasharray": "strokeDasharray",
  "stroke-linecap": "strokeLinecap",
  "stroke-linejoin": "strokeLinejoin",
  "fill-opacity": "fillOpacity",
  "stroke-opacity": "strokeOpacity",
  "font-size": "fontSize",
  "font-weight": "fontWeight",
  "text-anchor": "textAnchor",
  "dominant-baseline": "dominantBaseline",
  "letter-spacing": "letterSpacing",
  "vector-effect": "vectorEffect",
};

/** True when `name` may be rendered (the allowlist, applied a second time). */
export function allowedSvgElement(name: string): boolean {
  return ALLOWED_ELEMENTS.has(name) && !FORBIDDEN_ELEMENTS.has(name);
}

/**
 * Map one element's attributes to React props, dropping anything off-list and
 * rewriting internal ids (`id`, `href="#x"`, `url(#x)`) into `scope`, so two
 * drawings in one chapter can never point at each other's markers.
 */
export function svgAttrsToProps(
  element: string,
  attrs: Record<string, string>,
  scope: string,
): Record<string, string> {
  const props: Record<string, string> = {};
  const scoped = (id: string) => `${scope}-${id}`;
  for (const [name, value] of Object.entries(attrs)) {
    if (name === "href") {
      if (
        element === "use" &&
        value.startsWith("#") &&
        isValidId(value.slice(1))
      ) {
        props.href = `#${scoped(value.slice(1))}`;
      }
      continue;
    }
    if (!ALLOWED_ATTRIBUTES.has(name)) continue; // also drops style and on*
    if (name.toLowerCase().startsWith("on")) continue;
    const lower = value.toLowerCase();
    if (MARKER_ATTRIBUTES.has(name)) {
      const m = LOCAL_URL_RE.exec(value);
      if (!m || !isValidId(m[1])) continue;
      props[REACT_PROP[name]] = `url(#${scoped(m[1])})`;
      continue;
    }
    if (lower.includes("url(") || lower.includes("javascript:")) continue;
    if (
      (name === "fill" || name === "stroke") &&
      value !== "none" &&
      value !== "currentColor"
    )
      continue;
    if (name === "class") {
      const tokens = value.split(/\s+/).filter((t) => CLASS_RE.test(t));
      if (tokens.length) props.className = tokens.join(" ");
      continue;
    }
    if (name === "id") {
      if (isValidId(value)) props.id = scoped(value);
      continue;
    }
    if (name === "aria-hidden" && value !== "true" && value !== "false")
      continue;
    props[REACT_PROP[name] ?? name] = value;
  }
  return props;
}
