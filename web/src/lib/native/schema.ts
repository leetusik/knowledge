/**
 * Typed-block schemas and limits (mirrors `server/native/schema.py`).
 *
 * Each `check<Type>` takes the block's loaded YAML and a `BlockContext` and
 * returns the normalized block fields (every schema field present, `null` when
 * an optional field is absent), reporting violations through the context.
 * Unknown keys, wrong types, unknown enum values and dangling diagram
 * references are refused; the renderer's fallbacks are defence in depth only.
 */
import type { ViolationExtra } from "./errors";
import { isValidId } from "./ids";
import { pyRepr, pySplitlines, pyStrip } from "./pyutil";
import { isAssetName, parseRef, RefError } from "./refs";
import { TONES, validateSvg, type SvgElement } from "./svg";
import type { Inline } from "./tree";
import { pathKey, type YamlPath, type YamlValue } from "./yamlcore";

export const MAX_BODY_BYTES = 512 * 1024;
export const MAX_TYPED_BLOCKS = 300;
const FIGURES_ITEMS = [2, 3] as const;
const QUIZ_ITEMS = [1, 20] as const;
const QUIZ_OPTIONS = [2, 6] as const;
const CLOZE_BLANKS = [1, 5] as const;
const MAX_NODES = 60;
const MAX_EDGES = 100;
const MAX_LANES = 12;
const MAX_POINTS = 200;

export const TYPED_BLOCKS = [
  "figure",
  "figures",
  "diagram",
  "svg",
  "quiz",
  "sources",
] as const;
export const CALLOUT_TYPES = [
  "NOTE",
  "IMPORTANT",
  "WARNING",
  "CAUTION",
  "SKIP",
  "DEFINITION",
] as const;
const DIAGRAM_KINDS = [
  "flow",
  "state",
  "sequence",
  "stack",
  "timeline",
  "chart",
] as const;
const SHAPES = ["box", "pill", "store", "entity"] as const;
const EDGE_STYLES = ["solid", "dashed"] as const;
const DIRECTIONS = ["down", "right"] as const;
const FIGURE_WIDTHS = ["column", "wide"] as const;
const CHART_TYPES = ["bar", "line", "interval"] as const;
const QUIZ_TYPES = ["choice", "recall", "cloze"] as const;

export const BLANK_OPEN = "\ue000";
export const BLANK_CLOSE = "\ue001";

/** An absent key (Python's `_MISSING`): distinct from an explicit null. */
export const MISSING: unique symbol = Symbol("missing");
type V = YamlValue | typeof MISSING;
type Obj = { [key: string]: YamlValue };
type Out = Record<string, unknown>;

function isDict(value: unknown): value is Obj {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function has(d: Obj, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(d, key);
}
function isNumber(value: unknown): value is number {
  return typeof value === "number";
}
function isInt(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value);
}

export interface BlockContextInit {
  baseLine: number;
  lines: Map<string, number>;
  blockId: string | null;
  bodyLines: string[];
  report: (
    line: number,
    code: string,
    message: string,
    extra?: ViolationExtra,
  ) => void;
  inline: (text: string, line: number) => Inline[];
  claim: (value: string, line: number) => boolean;
}

function where(path: YamlPath): string {
  let out = "";
  for (const part of path) {
    out += typeof part === "number" ? `[${part}]` : out ? `.${part}` : part;
  }
  return out;
}

function kind(value: unknown): string {
  if (value === null) return "null";
  if (typeof value === "boolean") return "a boolean";
  if (typeof value === "number") return "a number";
  if (Array.isArray(value)) return "a list";
  if (isDict(value)) return "a mapping";
  return "a string";
}

function get(d: unknown, key: string): V {
  return isDict(d) && has(d, key) ? d[key] : MISSING;
}
function opt(d: unknown, key: string): YamlValue {
  const value = get(d, key);
  return value === MISSING ? null : value;
}

export class BlockContext {
  readonly baseLine: number;
  readonly lines: Map<string, number>;
  readonly blockId: string | null;
  readonly bodyLines: string[];
  readonly report: BlockContextInit["report"];
  readonly inlineFn: BlockContextInit["inline"];
  private readonly claimFn: BlockContextInit["claim"];

  constructor(init: BlockContextInit) {
    this.baseLine = init.baseLine;
    this.lines = init.lines;
    this.blockId = init.blockId;
    this.bodyLines = init.bodyLines;
    this.report = init.report;
    this.inlineFn = init.inline;
    this.claimFn = init.claim;
  }

  line(path: YamlPath): number {
    let p = [...path];
    while (!this.lines.has(pathKey(p)) && p.length) p = p.slice(0, -1);
    return this.baseLine + (this.lines.get(pathKey(p)) ?? 0);
  }

  err(
    path: YamlPath,
    code: string,
    message: string,
    extra: ViolationExtra = {},
  ): void {
    const w = where(path);
    this.report(this.line(path), code, w ? `${w}: ${message}` : message, {
      block: this.blockId,
      ...extra,
    });
  }

  mapping(
    path: YamlPath,
    value: V,
    required: readonly string[] = [],
    optional: readonly string[] = [],
  ): boolean {
    if (value === MISSING) return false;
    if (!isDict(value)) {
      this.err(path, "field-type", `must be a mapping, not ${kind(value)}`);
      return false;
    }
    for (const key of Object.keys(value)) {
      if (!required.includes(key) && !optional.includes(key)) {
        this.err(
          [...path, key],
          "field-unknown",
          `unknown field ${pyRepr(key)}`,
        );
      }
    }
    for (const key of required) {
      if (!has(value, key))
        this.err(
          path,
          "field-missing",
          `missing required field ${pyRepr(key)}`,
        );
    }
    return true;
  }

  text(path: YamlPath, value: V, required = true): string | null {
    if (value === MISSING || (value === null && !required)) return null;
    if (typeof value !== "string") {
      this.err(
        path,
        "field-type",
        `must be a string (quote it), not ${kind(value)}`,
      );
      return null;
    }
    if (!pyStrip(value)) {
      this.err(path, "field-value", "must not be empty");
      return null;
    }
    return value;
  }

  md(path: YamlPath, value: V, required = true): Inline[] | null {
    const text = this.text(path, value, required);
    if (text === null) return null;
    return this.inlineFn(text, this.line(path));
  }

  number(path: YamlPath, value: V, required = true): number | null {
    if (value === MISSING || (value === null && !required)) return null;
    if (!isNumber(value)) {
      this.err(path, "field-type", `must be a number, not ${kind(value)}`);
      return null;
    }
    return value;
  }

  enumValue(
    path: YamlPath,
    value: V,
    choices: readonly string[],
    required = false,
  ): string | null {
    if (value === MISSING || value === null) {
      if (required) this.err(path, "field-missing", "is required");
      return null;
    }
    if (typeof value !== "string" || !choices.includes(value)) {
      this.err(
        path,
        "field-value",
        `must be one of ${choices.join(", ")}, not ${pyRepr(value)}`,
      );
      return null;
    }
    return value;
  }

  boolean(path: YamlPath, value: V): boolean | null {
    if (value === MISSING || value === null) return null;
    if (typeof value !== "boolean") {
      this.err(path, "field-type", `must be true or false, not ${kind(value)}`);
      return null;
    }
    return value;
  }

  seq(
    path: YamlPath,
    value: V,
    {
      lo = 0,
      hi = null,
      required = true,
      what = "items",
    }: {
      lo?: number;
      hi?: number | null;
      required?: boolean;
      what?: string;
    } = {},
  ): YamlValue[] | null {
    if (value === MISSING || (value === null && !required)) return null;
    if (!Array.isArray(value)) {
      this.err(path, "field-type", `must be a list, not ${kind(value)}`);
      return null;
    }
    if (value.length < lo || (hi !== null && value.length > hi)) {
      const span = hi !== null ? `${lo}-${hi}` : `at least ${lo}`;
      this.err(path, "limit", `must have ${span} ${what}, has ${value.length}`);
    }
    return value;
  }

  localId(path: YamlPath, value: V): string | null {
    if (value === MISSING) return null;
    if (!isValidId(value)) {
      this.err(
        path,
        "id-malformed",
        `malformed id ${pyRepr(value)} (expected [a-z0-9][a-z0-9-]{0,63})`,
      );
      return null;
    }
    return value;
  }

  documentId(path: YamlPath, value: V): string | null {
    const id = this.localId(path, value);
    if (id !== null && !this.claimFn(id, this.line(path))) {
      this.err(path, "id-duplicate", `duplicate id ${pyRepr(id)}`);
    }
    return id;
  }

  tone(path: YamlPath, value: V): string | null {
    return this.enumValue(path, value, TONES);
  }

  asset(path: YamlPath, value: V): string | null {
    const text = this.text(path, value);
    if (text !== null && !isAssetName(text)) {
      this.err(path, "ref-malformed", `malformed asset name ${pyRepr(text)}`);
      return null;
    }
    return text;
  }
}

// --- figure -------------------------------------------------------------------

function checkFigure(data: YamlValue, cx: BlockContext): Out {
  cx.mapping([], data, ["src", "alt", "caption"], ["credit", "width"]);
  return {
    src: cx.asset(["src"], get(data, "src")),
    alt: cx.text(["alt"], get(data, "alt")),
    caption: cx.md(["caption"], get(data, "caption")),
    credit: cx.md(["credit"], opt(data, "credit"), false),
    width: cx.enumValue(["width"], opt(data, "width"), FIGURE_WIDTHS),
  };
}

// --- figures (figure row) -------------------------------------------------------

function checkFigures(data: YamlValue, cx: BlockContext): Out {
  cx.mapping([], data, ["items"], ["caption"]);
  const items =
    cx.seq(["items"], get(data, "items"), {
      lo: FIGURES_ITEMS[0],
      hi: FIGURES_ITEMS[1],
    }) ?? [];
  const out = items.map((item, i) => figuresItem(["items", i], item, cx));
  return {
    caption: cx.md(["caption"], opt(data, "caption"), false),
    items: out,
  };
}

function figuresItem(
  p: YamlPath,
  item: YamlValue,
  cx: BlockContext,
): Out | null {
  if (!isDict(item)) {
    cx.err(p, "field-type", "must be a mapping");
    return null;
  }
  const kinds = ["image", "diagram", "svg", "card"].filter((k) => has(item, k));
  if (kinds.length !== 1) {
    cx.err(
      p,
      "field-value",
      "must have exactly one of image, diagram, svg or card",
    );
    return null;
  }
  const k = kinds[0];
  if (k === "image") {
    cx.mapping(p, item, ["image", "alt"], ["caption"]);
    return {
      kind: "image",
      src: cx.asset([...p, "image"], item.image),
      alt: cx.text([...p, "alt"], get(item, "alt")),
      caption: cx.md([...p, "caption"], opt(item, "caption"), false),
    };
  }
  if (k === "diagram") {
    cx.mapping(p, item, ["diagram"], ["caption"]);
    return {
      kind: "diagram",
      diagram: checkDiagram(item.diagram, cx, [...p, "diagram"], true),
      caption: cx.md([...p, "caption"], opt(item, "caption"), false),
    };
  }
  if (k === "svg") {
    cx.mapping(p, item, ["svg", "label"], ["caption"]);
    return {
      kind: "svg",
      svg: svgSource([...p, "svg"], item.svg, cx),
      label: cx.text([...p, "label"], get(item, "label")),
      caption: cx.md([...p, "caption"], opt(item, "caption"), false),
    };
  }
  cx.mapping(p, item, ["card"]);
  const card = item.card;
  const cp = [...p, "card"];
  cx.mapping(cp, card, ["title", "body"], ["tone"]);
  return {
    kind: "card",
    title: cx.text([...cp, "title"], get(card, "title")),
    body: paragraphs([...cp, "body"], get(card, "body"), cx),
    tone: cx.tone([...cp, "tone"], opt(card, "tone")),
  };
}

/** A card body: paragraphs split at blank lines, inline Markdown in each. */
function paragraphs(
  p: YamlPath,
  value: V,
  cx: BlockContext,
): Inline[][] | null {
  const text = cx.text(p, value);
  if (text === null) return null;
  const line = cx.line(p);
  const out: Inline[][] = [];
  for (const chunk of text.replace(/^\n+|\n+$/g, "").split(/\n[ \t]*\n/)) {
    if (pyStrip(chunk)) out.push(cx.inlineFn(pyStrip(chunk), line));
  }
  return out;
}

// --- svg --------------------------------------------------------------------------

function checkSvg(data: YamlValue, cx: BlockContext): Out {
  cx.mapping([], data, ["svg", "label"], ["caption"]);
  return {
    label: cx.text(["label"], get(data, "label")),
    caption: cx.md(["caption"], opt(data, "caption"), false),
    svg: svgSource(["svg"], get(data, "svg"), cx),
  };
}

function svgSource(p: YamlPath, value: V, cx: BlockContext): SvgElement | null {
  const text = cx.text(p, value);
  if (text === null) return null;
  const { tree, violations } = validateSvg(text);
  const base = svgBaseLine(p, text, cx);
  for (const [line, code, message, element, attribute] of violations) {
    cx.report(base + line - 1, code, message, {
      block: cx.blockId,
      element,
      attribute,
    });
  }
  return tree;
}

/** The file line of the svg source's first line (a block scalar starts on the line after its key). */
function svgBaseLine(p: YamlPath, value: string, cx: BlockContext): number {
  const keyLine = cx.line(p);
  const first =
    pySplitlines(value)
      .map(pyStrip)
      .find((ln) => ln) ?? "";
  const rel = keyLine - cx.baseLine;
  for (let i = rel; i < Math.min(rel + 3, cx.bodyLines.length); i += 1) {
    if (first && cx.bodyLines[i].includes(first)) return cx.baseLine + i;
  }
  return keyLine;
}

// --- diagram ------------------------------------------------------------------------

type KindCheck = (
  data: Obj,
  cx: BlockContext,
  p: YamlPath,
  kind: string,
) => Out;

function checkDiagram(
  data: YamlValue,
  cx: BlockContext,
  p: YamlPath = [],
  nested = false,
): Out | null {
  if (!isDict(data)) {
    cx.err(p, "field-type", "must be a mapping");
    return null;
  }
  const k = cx.enumValue(
    [...p, "kind"],
    get(data, "kind"),
    DIAGRAM_KINDS,
    true,
  );
  const commonReq = ["kind", "title"];
  const commonOpt = nested ? [] : ["caption"];
  const out: Out = {
    kind: k,
    title: cx.text([...p, "title"], get(data, "title")),
  };
  if (!nested)
    out.caption = cx.md([...p, "caption"], opt(data, "caption"), false);
  if (k === null) return out;
  const [req, optional, fn] = DIAGRAM_SPEC[k];
  cx.mapping(p, data, [...commonReq, ...req], [...commonOpt, ...optional]);
  Object.assign(out, fn(data, cx, p, k));
  return out;
}

const graph: KindCheck = (data, cx, p, k) => {
  const nodesIn =
    cx.seq([...p, "nodes"], get(data, "nodes"), {
      lo: 1,
      hi: MAX_NODES,
      what: "nodes",
    }) ?? [];
  const local = new Set<string>();
  const nodeIds = new Set<string>();
  const localUnique = (path: YamlPath, value: V) => {
    const id = cx.localId(path, value);
    if (id !== null) {
      if (local.has(id))
        cx.err(path, "id-duplicate", `duplicate diagram id ${pyRepr(id)}`);
      local.add(id);
    }
    return id;
  };
  const nodes: Out[] = [];
  nodesIn.forEach((node, i) => {
    const np = [...p, "nodes", i];
    if (
      !cx.mapping(
        np,
        node,
        ["id", "label"],
        ["sub", "at", "shape", "fields", "tone"],
      )
    )
      return;
    const nid = localUnique([...np, "id"], get(node, "id"));
    if (nid) nodeIds.add(nid);
    let at: YamlValue = opt(node, "at");
    if (at !== null) {
      if (
        !Array.isArray(at) ||
        at.length !== 2 ||
        !at.every((v) => isInt(v) && v >= 0)
      ) {
        cx.err(
          [...np, "at"],
          "field-value",
          "must be [row, col], two whole numbers from 0",
        );
        at = null;
      }
    }
    let fields: unknown = opt(node, "fields");
    if (fields !== null) {
      const list = cx.seq([...np, "fields"], fields as YamlValue, {
        what: "fields",
      });
      fields =
        list === null
          ? null
          : list.map((f, j) => cx.text([...np, "fields", j], f));
    }
    nodes.push({
      id: nid,
      label: cx.text([...np, "label"], get(node, "label")),
      sub: cx.text([...np, "sub"], opt(node, "sub"), false),
      at,
      shape: cx.enumValue([...np, "shape"], opt(node, "shape"), SHAPES),
      fields,
      tone: cx.tone([...np, "tone"], opt(node, "tone")),
    });
  });

  const nodeRef = (path: YamlPath, value: V) => {
    if (value === MISSING) return null;
    if (typeof value !== "string" || !nodeIds.has(value)) {
      cx.err(
        path,
        "diagram-ref",
        `names no node of this diagram (${pyRepr(value)})`,
      );
      return null;
    }
    return value;
  };

  let groups: Out[] | null = null;
  const groupsIn = opt(data, "groups");
  if (groupsIn !== null) {
    groups = [];
    (
      cx.seq([...p, "groups"], groupsIn, { hi: MAX_LANES, what: "groups" }) ??
      []
    ).forEach((group, i) => {
      const gp = [...p, "groups", i];
      cx.mapping(gp, group, ["id", "label", "nodes"]);
      const members =
        cx.seq([...gp, "nodes"], get(group, "nodes"), {
          lo: 1,
          what: "nodes",
        }) ?? [];
      groups!.push({
        id: localUnique([...gp, "id"], get(group, "id")),
        label: cx.text([...gp, "label"], get(group, "label")),
        nodes: members.map((m, j) => nodeRef([...gp, "nodes", j], m)),
      });
    });
  }

  const edges: Out[] = [];
  const edgesIn = opt(data, "edges");
  (
    cx.seq(
      [...p, "edges"],
      edgesIn === null || isFalsy(edgesIn) ? [] : edgesIn,
      { hi: MAX_EDGES, what: "edges" },
    ) ?? []
  ).forEach((edge, i) => {
    const ep = [...p, "edges", i];
    cx.mapping(ep, edge, ["from", "to"], ["label", "style", "tone"]);
    edges.push({
      from: nodeRef([...ep, "from"], get(edge, "from")),
      to: nodeRef([...ep, "to"], get(edge, "to")),
      label: cx.text([...ep, "label"], opt(edge, "label"), false),
      style: cx.enumValue([...ep, "style"], opt(edge, "style"), EDGE_STYLES),
      tone: cx.tone([...ep, "tone"], opt(edge, "tone")),
    });
  });

  const out: Out = {
    nodes,
    groups,
    edges,
    direction: cx.enumValue(
      [...p, "direction"],
      opt(data, "direction"),
      DIRECTIONS,
    ),
  };
  if (k === "state") {
    const initial = opt(data, "initial");
    out.initial = initial !== null ? nodeRef([...p, "initial"], initial) : null;
    const final = opt(data, "final");
    if (final === null) out.final = null;
    else if (Array.isArray(final))
      out.final = final.map((f, j) => nodeRef([...p, "final", j], f));
    else out.final = [nodeRef([...p, "final"], final)];
  }
  return out;
};

/** Python truthiness, for `value or []`. */
function isFalsy(value: YamlValue): boolean {
  if (value === null || value === false || value === 0 || value === "")
    return true;
  if (Array.isArray(value)) return value.length === 0;
  if (isDict(value)) return Object.keys(value).length === 0;
  return false;
}

const sequence: KindCheck = (data, cx, p) => {
  const ids = new Set<string>();
  const actors: Out[] = [];
  (
    cx.seq([...p, "actors"], get(data, "actors"), {
      lo: 1,
      hi: MAX_LANES,
      what: "actors",
    }) ?? []
  ).forEach((actor, i) => {
    const ap = [...p, "actors", i];
    cx.mapping(ap, actor, ["id", "label"]);
    const aid = cx.localId([...ap, "id"], get(actor, "id"));
    if (aid !== null) {
      if (ids.has(aid))
        cx.err(
          [...ap, "id"],
          "id-duplicate",
          `duplicate diagram id ${pyRepr(aid)}`,
        );
      ids.add(aid);
    }
    actors.push({
      id: aid,
      label: cx.text([...ap, "label"], get(actor, "label")),
    });
  });
  const actorRef = (path: YamlPath, value: V) => {
    if (value === MISSING) return null;
    if (typeof value !== "string" || !ids.has(value)) {
      cx.err(
        path,
        "diagram-ref",
        `names no actor of this diagram (${pyRepr(value)})`,
      );
      return null;
    }
    return value;
  };
  const steps: Out[] = [];
  (
    cx.seq([...p, "steps"], get(data, "steps"), {
      lo: 1,
      hi: MAX_EDGES,
      what: "steps",
    }) ?? []
  ).forEach((step, i) => {
    const sp = [...p, "steps", i];
    cx.mapping(sp, step, ["from", "to", "label"], ["style", "note"]);
    steps.push({
      from: actorRef([...sp, "from"], get(step, "from")),
      to: actorRef([...sp, "to"], get(step, "to")),
      label: cx.text([...sp, "label"], get(step, "label")),
      style: cx.enumValue([...sp, "style"], opt(step, "style"), EDGE_STYLES),
      note: cx.text([...sp, "note"], opt(step, "note"), false),
    });
  });
  return { actors, steps };
};

const stack: KindCheck = (data, cx, p) => {
  const layers: Out[] = [];
  let total = 0;
  (
    cx.seq([...p, "layers"], get(data, "layers"), {
      lo: 1,
      hi: MAX_LANES,
      what: "layers",
    }) ?? []
  ).forEach((layer, i) => {
    const lp = [...p, "layers", i];
    cx.mapping(lp, layer, ["label"], ["items", "tone"]);
    let items: unknown = opt(layer, "items");
    if (items !== null) {
      const list = cx.seq([...lp, "items"], items as YamlValue, {
        what: "items",
      });
      if (list !== null) {
        total += list.length;
        items = list.map((it, j) => cx.text([...lp, "items", j], it));
      } else items = null;
    }
    layers.push({
      label: cx.text([...lp, "label"], get(layer, "label")),
      items,
      tone: cx.tone([...lp, "tone"], opt(layer, "tone")),
    });
  });
  if (total > MAX_NODES)
    cx.err(
      [...p, "layers"],
      "limit",
      `a stack holds at most ${MAX_NODES} items, has ${total}`,
    );
  return { layers, nested: cx.boolean([...p, "nested"], opt(data, "nested")) };
};

const timeline: KindCheck = (data, cx, p) => {
  const ap = [...p, "axis"];
  const axisIn = get(data, "axis");
  let axis: Out | null = null;
  let lo: number | null = null;
  let hi: number | null = null;
  if (
    cx.mapping(ap, axisIn, ["unit", "from", "to"], ["ticks"]) ||
    isDict(axisIn)
  ) {
    lo = cx.number([...ap, "from"], get(axisIn, "from"));
    hi = cx.number([...ap, "to"], get(axisIn, "to"));
    if (lo !== null && hi !== null && !(lo < hi)) {
      cx.err(ap, "field-value", "axis.from must be less than axis.to");
      lo = hi = null;
    }
    let ticks: unknown = opt(axisIn, "ticks");
    if (ticks !== null) {
      const list = cx.seq([...ap, "ticks"], ticks as YamlValue, {
        lo: 1,
        what: "ticks",
      });
      ticks =
        list === null
          ? null
          : list.map((t, j) => cx.number([...ap, "ticks", j], t));
    }
    axis = {
      unit: cx.text([...ap, "unit"], get(axisIn, "unit")),
      from: lo,
      to: hi,
      ticks,
    };
  }
  const within = (path: YamlPath, value: number | null) => {
    if (
      value !== null &&
      lo !== null &&
      !(lo <= value && value <= (hi as number))
    ) {
      cx.err(
        path,
        "field-value",
        `${pyNum(value)} is outside the axis (${pyNum(lo)} to ${pyNum(hi as number)})`,
      );
    }
    return value;
  };
  if (axis !== null && Array.isArray(axis.ticks) && axis.ticks.length) {
    (axis.ticks as (number | null)[]).forEach((t, j) =>
      within([...ap, "ticks", j], t),
    );
  }
  let points = 0;
  const lanes: Out[] = [];
  (
    cx.seq([...p, "lanes"], get(data, "lanes"), {
      lo: 1,
      hi: MAX_LANES,
      what: "lanes",
    }) ?? []
  ).forEach((lane, i) => {
    const lp = [...p, "lanes", i];
    cx.mapping(lp, lane, ["label", "bars"], ["marks"]);
    const bars: Out[] = [];
    (
      cx.seq([...lp, "bars"], get(lane, "bars"), { what: "bars" }) ?? []
    ).forEach((bar, j) => {
      const bp = [...lp, "bars", j];
      cx.mapping(bp, bar, ["from", "to"], ["label", "tone"]);
      const bFrom = within(
        [...bp, "from"],
        cx.number([...bp, "from"], get(bar, "from")),
      );
      const bTo = within(
        [...bp, "to"],
        cx.number([...bp, "to"], get(bar, "to")),
      );
      if (bFrom !== null && bTo !== null && bFrom > bTo)
        cx.err(bp, "field-value", "a bar's from must not be after its to");
      bars.push({
        from: bFrom,
        to: bTo,
        label: cx.text([...bp, "label"], opt(bar, "label"), false),
        tone: cx.tone([...bp, "tone"], opt(bar, "tone")),
      });
    });
    let marks: Out[] | null = null;
    const marksRaw = opt(lane, "marks");
    if (marksRaw !== null) {
      const marksIn =
        cx.seq([...lp, "marks"], marksRaw, { what: "marks" }) ?? [];
      marks = marksIn.map((mark, j) => {
        const mp = [...lp, "marks", j];
        cx.mapping(mp, mark, ["at", "label"]);
        return {
          at: within([...mp, "at"], cx.number([...mp, "at"], get(mark, "at"))),
          label: cx.text([...mp, "label"], get(mark, "label")),
        };
      });
    }
    points += bars.length + (marks ?? []).length;
    lanes.push({
      label: cx.text([...lp, "label"], get(lane, "label")),
      bars,
      marks,
    });
  });
  if (points > MAX_POINTS)
    cx.err(
      [...p, "lanes"],
      "limit",
      `a timeline holds at most ${MAX_POINTS} bars and marks, has ${points}`,
    );
  return { axis, lanes };
};

/** Python's `str()` of an int or float, for messages. */
function pyNum(value: number): string {
  return String(value);
}

const chart: KindCheck = (data, cx, p) => {
  const ctype = cx.enumValue(
    [...p, "type"],
    get(data, "type"),
    CHART_TYPES,
    true,
  );
  const xp = [...p, "x"];
  const xIn = get(data, "x");
  let x: Out | null = null;
  let nCategories: number | null = null;
  if (
    cx.mapping(xp, xIn, ["label"], ["categories", "numeric"]) ||
    isDict(xIn)
  ) {
    const xd = xIn as Obj;
    const hasC = has(xd, "categories");
    const hasN = has(xd, "numeric");
    let categories: unknown = null;
    let numeric: Out | null = null;
    if (hasC === hasN) {
      cx.err(xp, "field-value", "x needs exactly one of categories or numeric");
    } else if (hasC) {
      const cats = cx.seq([...xp, "categories"], xd.categories, {
        lo: 1,
        what: "categories",
      });
      if (cats !== null) {
        categories = cats.map((c, j) => cx.text([...xp, "categories", j], c));
        nCategories = cats.length;
      }
    } else {
      const np = [...xp, "numeric"];
      const num = xd.numeric;
      if (cx.mapping(np, num, ["from", "to"])) {
        const nFrom = cx.number([...np, "from"], get(num, "from"));
        const nTo = cx.number([...np, "to"], get(num, "to"));
        if (nFrom !== null && nTo !== null && !(nFrom < nTo))
          cx.err(
            np,
            "field-value",
            "numeric.from must be less than numeric.to",
          );
        numeric = { from: nFrom, to: nTo };
      }
    }
    x = {
      label: cx.text([...xp, "label"], get(xd, "label")),
      categories,
      numeric,
    };
  }
  const yp = [...p, "y"];
  const yIn = get(data, "y");
  let y: Out | null = null;
  if (cx.mapping(yp, yIn, ["label"], ["min", "max"]) || isDict(yIn)) {
    const yMin = cx.number([...yp, "min"], opt(yIn, "min"), false);
    const yMax = cx.number([...yp, "max"], opt(yIn, "max"), false);
    if (yMin !== null && yMax !== null && !(yMin < yMax))
      cx.err(yp, "field-value", "y.min must be less than y.max");
    y = {
      label: cx.text([...yp, "label"], get(yIn, "label")),
      min: yMin,
      max: yMax,
    };
  }
  let points = 0;
  const series: Out[] = [];
  (
    cx.seq([...p, "series"], get(data, "series"), { lo: 1, what: "series" }) ??
    []
  ).forEach((s, i) => {
    const sp = [...p, "series", i];
    cx.mapping(sp, s, ["name", "values"], ["tone"]);
    const values = cx.seq([...sp, "values"], get(s, "values"), {
      lo: 1,
      what: "values",
    });
    let outValues: unknown = null;
    if (values !== null) {
      points += values.length;
      if (nCategories !== null && values.length !== nCategories)
        cx.err(
          [...sp, "values"],
          "field-value",
          `has ${values.length} values for ${nCategories} categories`,
        );
      outValues = values.map((v, j) =>
        chartValue([...sp, "values", j], v, ctype, cx),
      );
    }
    series.push({
      name: cx.text([...sp, "name"], get(s, "name")),
      values: outValues,
      tone: cx.tone([...sp, "tone"], opt(s, "tone")),
    });
  });
  if (points > MAX_POINTS)
    cx.err(
      [...p, "series"],
      "limit",
      `a chart holds at most ${MAX_POINTS} data points, has ${points}`,
    );
  let rules: Out[] | null = null;
  const rulesRaw = opt(data, "rules");
  if (rulesRaw !== null) {
    const rulesIn = cx.seq([...p, "rules"], rulesRaw, { what: "rules" }) ?? [];
    rules = rulesIn.map((rule, i) => {
      const rp = [...p, "rules", i];
      cx.mapping(rp, rule, ["at", "label"]);
      return {
        at: cx.number([...rp, "at"], get(rule, "at")),
        label: cx.text([...rp, "label"], get(rule, "label")),
      };
    });
  }
  return { chart: ctype, x, y, series, rules };
};

function chartValue(
  path: YamlPath,
  value: YamlValue,
  ctype: string | null,
  cx: BlockContext,
): unknown {
  if (ctype === "interval") {
    if (
      !Array.isArray(value) ||
      (value.length !== 2 && value.length !== 3) ||
      value.some((v) => !isNumber(v))
    ) {
      cx.err(
        path,
        "field-value",
        "an interval value is [low, high] or [low, median, high]",
      );
      return null;
    }
    const nums = value as number[];
    const sorted = [...nums].sort((a, b) => a - b);
    if (nums.some((v, i) => v !== sorted[i])) {
      cx.err(path, "field-value", "an interval value must run low to high");
      return null;
    }
    return value;
  }
  return cx.number(path, value);
}

const DIAGRAM_SPEC: Record<
  string,
  [readonly string[], readonly string[], KindCheck]
> = {
  flow: [["nodes"], ["groups", "edges", "direction"], graph],
  state: [
    ["nodes"],
    ["groups", "edges", "direction", "initial", "final"],
    graph,
  ],
  sequence: [["actors", "steps"], [], sequence],
  stack: [["layers"], ["nested"], stack],
  timeline: [["axis", "lanes"], [], timeline],
  chart: [["type", "x", "y", "series"], ["rules"], chart],
};

// --- quiz ------------------------------------------------------------------------------

function checkQuiz(data: YamlValue, cx: BlockContext): Out {
  cx.mapping([], data, ["items"], ["title"]);
  const items = (
    cx.seq(["items"], get(data, "items"), {
      lo: QUIZ_ITEMS[0],
      hi: QUIZ_ITEMS[1],
    }) ?? []
  ).map((item, i) => quizItem(["items", i], item, cx));
  return { title: cx.text(["title"], opt(data, "title"), false), items };
}

function quizItem(p: YamlPath, item: YamlValue, cx: BlockContext): Out | null {
  if (!isDict(item)) {
    cx.err(p, "field-type", "must be a mapping");
    return null;
  }
  const qtype = cx.enumValue(
    [...p, "type"],
    get(item, "type"),
    QUIZ_TYPES,
    true,
  );
  const out: Out = {
    id: cx.documentId([...p, "id"], get(item, "id")),
    type: qtype,
  };
  if (qtype === "choice") {
    cx.mapping(p, item, [
      "id",
      "type",
      "prompt",
      "options",
      "answer",
      "explain",
    ]);
    const optionIds: string[] = [];
    const options: Out[] = [];
    (
      cx.seq([...p, "options"], get(item, "options"), {
        lo: QUIZ_OPTIONS[0],
        hi: QUIZ_OPTIONS[1],
        what: "options",
      }) ?? []
    ).forEach((o, j) => {
      const op = [...p, "options", j];
      cx.mapping(op, o, ["id", "text"]);
      const oid = cx.localId([...op, "id"], get(o, "id"));
      if (oid !== null) {
        if (optionIds.includes(oid))
          cx.err(
            [...op, "id"],
            "id-duplicate",
            `duplicate option id ${pyRepr(oid)}`,
          );
        optionIds.push(oid);
      }
      options.push({ id: oid, text: cx.md([...op, "text"], get(o, "text")) });
    });
    const answer = cx.seq([...p, "answer"], get(item, "answer"), {
      lo: 1,
      what: "answer ids",
    });
    if (answer !== null) {
      const seen = new Set<unknown>();
      answer.forEach((a, j) => {
        if (typeof a !== "string" || !optionIds.includes(a)) {
          cx.err(
            [...p, "answer", j],
            "quiz-answer",
            `names no option of this item (${pyRepr(a)})`,
          );
        } else if (seen.has(a)) {
          cx.err(
            [...p, "answer", j],
            "quiz-answer",
            `repeats option ${pyRepr(a)}`,
          );
        }
        if (typeof a === "string") seen.add(a);
      });
    }
    Object.assign(out, {
      prompt: cx.md([...p, "prompt"], get(item, "prompt")),
      options,
      answer,
      explain: cx.md([...p, "explain"], get(item, "explain")),
    });
  } else if (qtype === "recall") {
    cx.mapping(p, item, ["id", "type", "prompt", "answer"], ["explain"]);
    Object.assign(out, {
      prompt: cx.md([...p, "prompt"], get(item, "prompt")),
      answer: cx.md([...p, "answer"], get(item, "answer")),
      explain: cx.md([...p, "explain"], opt(item, "explain"), false),
    });
  } else if (qtype === "cloze") {
    cx.mapping(p, item, ["id", "type", "text"], ["explain"]);
    Object.assign(out, {
      text: cloze([...p, "text"], get(item, "text"), cx),
      explain: cx.md([...p, "explain"], opt(item, "explain"), false),
    });
  }
  return out;
}

const BLANK_RE = /\{\{([^{}]*)\}\}/g;

function cloze(p: YamlPath, value: V, cx: BlockContext): Inline[] | null {
  const text = cx.text(p, value);
  if (text === null) return null;
  if (text.includes(BLANK_OPEN) || text.includes(BLANK_CLOSE)) {
    cx.err(p, "field-value", "contains a reserved private-use character");
    return null;
  }
  const blanks: string[][] = [];
  const marked = text.replace(BLANK_RE, (_m, inner: string) => {
    const alternatives = inner.split("|");
    if (alternatives.some((a) => !pyStrip(a)))
      cx.err(p, "cloze-blank", `blank {{${inner}}} has an empty alternative`);
    blanks.push(alternatives);
    return `${BLANK_OPEN}${blanks.length - 1}${BLANK_CLOSE}`;
  });
  if (!(CLOZE_BLANKS[0] <= blanks.length && blanks.length <= CLOZE_BLANKS[1])) {
    cx.err(
      p,
      "cloze-blank",
      `must have ${CLOZE_BLANKS[0]}-${CLOZE_BLANKS[1]} blanks, has ${blanks.length}`,
    );
  }
  if (marked.includes("{{") || marked.includes("}}"))
    cx.err(p, "cloze-blank", "has an unbalanced {{ or }}");
  const nodes = cx.inlineFn(marked, cx.line(p));
  const [out, used] = splitBlanks(nodes, blanks);
  if (used !== blanks.length)
    cx.err(
      p,
      "cloze-blank",
      "a blank sits inside code or a link; blanks must be in plain text",
    );
  return out;
}

function splitBlanks(nodes: Inline[], blanks: string[][]): [Inline[], number] {
  const out: Inline[] = [];
  let used = 0;
  const pattern = new RegExp(`${BLANK_OPEN}(\\d+)${BLANK_CLOSE}`, "g");
  for (const node of nodes) {
    if (node.type === "text") {
      let pos = 0;
      for (const m of node.text.matchAll(pattern)) {
        const start = m.index ?? 0;
        if (start > pos)
          out.push({ type: "text", text: node.text.slice(pos, start) });
        out.push({ type: "blank", accept: blanks[Number(m[1])] });
        used += 1;
        pos = start + m[0].length;
      }
      if (pos < node.text.length)
        out.push({ type: "text", text: node.text.slice(pos) });
    } else if (
      node.type === "em" ||
      node.type === "strong" ||
      node.type === "del"
    ) {
      const [children, n] = splitBlanks(node.children, blanks);
      used += n;
      out.push({ ...node, children });
    } else {
      out.push(node);
    }
  }
  return [out, used];
}

// --- sources -----------------------------------------------------------------------------

function checkSources(data: YamlValue, cx: BlockContext): Out {
  cx.mapping([], data, ["items"]);
  const items = (cx.seq(["items"], get(data, "items"), { lo: 1 }) ?? []).map(
    (item, i) => {
      const p = ["items", i];
      cx.mapping(
        p,
        item,
        ["id", "title", "url"],
        ["publisher", "date", "accessed", "note"],
      );
      const url = cx.text([...p, "url"], get(item, "url"));
      if (url !== null) {
        try {
          const ref = parseRef(url);
          if (ref.kind !== "external")
            cx.err(
              [...p, "url"],
              "ref-scheme",
              `a source url must be http(s), not ${pyRepr(url)}`,
            );
        } catch (exc) {
          if (exc instanceof RefError)
            cx.err([...p, "url"], exc.code, exc.message);
          else throw exc;
        }
      }
      return {
        id: cx.documentId([...p, "id"], get(item, "id")),
        title: cx.text([...p, "title"], get(item, "title")),
        url,
        publisher: cx.text([...p, "publisher"], opt(item, "publisher"), false),
        date: cx.text([...p, "date"], opt(item, "date"), false),
        accessed: cx.text([...p, "accessed"], opt(item, "accessed"), false),
        note: cx.text([...p, "note"], opt(item, "note"), false),
      };
    },
  );
  return { items };
}

export const CHECKS: Record<
  string,
  (data: YamlValue, cx: BlockContext) => Out | null
> = {
  figure: checkFigure,
  figures: checkFigures,
  diagram: (data, cx) => checkDiagram(data, cx),
  svg: checkSvg,
  quiz: checkQuiz,
  sources: checkSources,
};
