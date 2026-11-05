/**
 * P39-hk.S8 — TeX to MathML, server-only (R1 §3, `topics/glossary-and-math.md`). Temml
 * (`temml` 0.14.0, pinned exactly) turns allowlisted TeX into a MathML string; this module
 * parses that string with saxes and rebuilds it through an element and attribute allowlist,
 * so what reaches the page is React elements made from a checked tree, never HTML. No raw
 * markup is ever inserted (`render.tsx`'s rule), and nothing here ships to the client.
 *
 * - **Elements:** `MATH_ELEMENTS`. Anything else Temml emitted is dropped with its subtree.
 * - **Attributes:** `MATH_ATTRIBUTES`; `class` keeps only `MATH_CLASSES`. Every `style` is
 *   dropped: the reader's CSS (`reader-aids.css`) carries the look. Where Temml spends a style
 *   on meaning, the rebuild says the same thing without one: `math-depth:N` (an accent drawn
 *   at the base's size) becomes `scriptlevel="N"`, and the two fixed spacings Temml writes
 *   (`\!`'s negative thin space, a 1em gap before an array column) become classes the CSS
 *   draws (`STYLE_CLASSES`). The rest (`display:block math`, a cell's zero padding) is the
 *   CSS's default already.
 * - **F24** (the square of a sum, inline): TeX sets no space between an opening fence and a
 *   large operator (Open–Op = 0); the MathML operator dictionary leaves 0.166em there. So in
 *   inline math a large operator straight after a prefix fence gets `lspace="0"`, the
 *   paren hugging the Σ as the signed `(Σe)²` does. Display math keeps Temml's spacing, which
 *   is the signed display boards' (`MathBlock.dc.html` draws no `lspace` there).
 * - **Linear text** (`linearText`): the inline formula's spoken alternative and the Review
 *   card's text (OQ7, OQ9 on R1's recommendation): token text, `√` before a radicand, scripts
 *   as Unicode superscript or subscript characters where every character has one, else `^`
 *   or `_` (with parentheses around more than one token): `t = s × √n`, `(∑e)² ÷ ∑e²`,
 *   `e^(−λ)`, the canvas's own snippet forms (F12).
 *
 * Temml refusing TeX that publish accepted is a parser drift: `MathError` is thrown and the
 * caller refuses the whole block with the placeholder; raw TeX is never shown.
 */
import "server-only";

import { createElement, type ReactElement, type ReactNode } from "react";
import { SaxesParser } from "saxes";
import temml from "temml";

/** R1's element allowlist, plus `mstyle` (Temml's `\dfrac`, `\tfrac`; a MathML Core element). */
export const MATH_ELEMENTS: ReadonlySet<string> = new Set([
  "math",
  "mrow",
  "mi",
  "mn",
  "mo",
  "mtext",
  "mspace",
  "mfrac",
  "msqrt",
  "mroot",
  "msub",
  "msup",
  "msubsup",
  "munder",
  "mover",
  "munderover",
  "mtable",
  "mtr",
  "mtd",
  "mpadded",
  "mstyle",
]);

/** R1's attribute allowlist (`class` filtered to `MATH_CLASSES`; `alttext` is the rebuild's own). */
export const MATH_ATTRIBUTES: ReadonlySet<string> = new Set([
  "display",
  "displaystyle",
  "scriptlevel",
  "mathvariant",
  "lspace",
  "rspace",
  "stretchy",
  "fence",
  "form",
  "movablelimits",
  "separator",
  "largeop",
  "symmetric",
  "minsize",
  "maxsize",
  "linethickness",
  "width",
  "height",
  "depth",
  "voffset",
  "accent",
  "accentunder",
  "class",
]);

/**
 * Temml's classes the CSS draws: the array cells' alignment and row padding, the italic
 * correction before a superscript (R1's list), and `tml-prime`, the prime's own glyph
 * (Temml's STIX Two rule, `font-feature-settings: "ss04"`), which sits too high without it.
 */
export const MATH_CLASSES: ReadonlySet<string> = new Set([
  "tml-right",
  "tml-left",
  "tml-jot",
  "tml-small",
  "tml-sml-pad",
  "tml-med-pad",
  "tml-lrg-pad",
  "tml-prime",
]);

/** The rebuild's own classes, for Temml's fixed spacings (see `STYLE_CLASSES`). */
export const REBUILD_CLASSES: ReadonlySet<string> = new Set([
  "ra-m-nthin",
  "ra-m-col",
]);

/**
 * What Temml emits that the rebuild drops on purpose, named so a Temml upgrade that emits
 * something new fails `native-math.test.ts` instead of passing unseen. Dropped classes are
 * browser-specific accent nudges (`chr-*`, `wbk-*`, `tml-vec`) and `tml-display`, which the
 * CSS's `.ra-mb__eq math` already is.
 */
export const DROPPED_ATTRIBUTES: ReadonlySet<string> = new Set([
  "style",
  "xmlns",
]);
export const DROPPED_CLASSES: ReadonlySet<string> = new Set([
  "tml-display",
  "tml-vec",
  "chr-sml",
  "chr-med",
  "chr-lrg",
  "chr-sml-vec",
  "chr-med-vec",
  "chr-lrg-vec",
  "wbk-acc",
  "wbk-sml",
  "wbk-med",
  "wbk-lrg",
  "wbk-sml-acc",
  "wbk-med-acc",
  "wbk-lrg-acc",
  "wbk-sml-vec",
  "wbk-med-vec",
  "wbk-lrg-vec",
]);

/** A Temml `style` that means a fixed spacing → the class the CSS draws it with. */
export const STYLE_CLASSES: Readonly<Record<string, string>> = {
  /** `\!` (an empty `mrow`). */
  "margin-left:-0.1667em;": "ra-m-nthin",
  /** The 1em before a `cases` condition, or before an `aligned` column pair. */
  "padding-left:1em;padding-right:0em;": "ra-m-col",
};

/** Temml styles that carry nothing the CSS does not already set. */
export const DEFAULT_STYLES: ReadonlySet<string> = new Set([
  "display:block math;",
  "padding-left:0em;padding-right:0em;",
]);

const MATH_DEPTH = /^math-depth:(\d{1,2});$/;

/** Token elements: the only ones whose text is kept. */
const TOKENS = new Set(["mi", "mn", "mo", "mtext"]);

export interface MathNode {
  name: string;
  attrs: Record<string, string>;
  children: (MathNode | string)[];
}

/** Temml refused TeX that publish accepted (a parser drift): refuse the block, never show TeX. */
export class MathError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MathError";
  }
}

// --- the rebuild ---------------------------------------------------------------------

function keepClasses(value: string, extra: string | null): string | null {
  const kept = value
    .split(/\s+/)
    .filter((c) => MATH_CLASSES.has(c) || REBUILD_CLASSES.has(c));
  if (extra) kept.push(extra);
  return kept.length ? kept.join(" ") : null;
}

function cleanAttrs(raw: Record<string, string>): Record<string, string> {
  const attrs: Record<string, string> = {};
  let extra: string | null = null;
  const style = raw.style;
  if (style !== undefined) {
    const depth = MATH_DEPTH.exec(style);
    if (STYLE_CLASSES[style]) extra = STYLE_CLASSES[style];
    else if (depth) attrs.scriptlevel = depth[1];
  }
  for (const [name, value] of Object.entries(raw)) {
    if (name === "style" || !MATH_ATTRIBUTES.has(name)) continue;
    if (name === "class") continue;
    attrs[name] = value;
  }
  const cls = keepClasses(raw.class ?? "", extra);
  if (cls) attrs.class = cls;
  return attrs;
}

/** Parse Temml's string into an allowlisted tree (anything off-list goes with its subtree). */
function rebuild(xml: string): MathNode {
  const root: MathNode = { name: "#root", attrs: {}, children: [] };
  const stack: (MathNode | null)[] = [root];
  const parser = new SaxesParser({ xmlns: false });
  parser.on("opentag", (tag) => {
    const parent = stack[stack.length - 1];
    if (!parent || !MATH_ELEMENTS.has(tag.name)) {
      stack.push(null);
      return;
    }
    const raw: Record<string, string> = {};
    for (const [k, v] of Object.entries(tag.attributes)) raw[k] = String(v);
    const node: MathNode = {
      name: tag.name,
      attrs: cleanAttrs(raw),
      children: [],
    };
    parent.children.push(node);
    stack.push(node);
  });
  parser.on("closetag", () => {
    stack.pop();
  });
  parser.on("text", (text) => {
    const parent = stack[stack.length - 1];
    if (parent && TOKENS.has(parent.name)) parent.children.push(text);
  });
  parser.write(xml).close();
  const math = root.children[0];
  if (typeof math !== "object" || math.name !== "math")
    throw new MathError("no <math> root");
  return math;
}

// --- F24: a large operator straight after an opening fence ----------------------------

const LARGE_OPS = new Set([..."∑∏∐∫∬∭∮⋀⋁⋂⋃⨀⨁⨂⨄⨆"]);
const OPENERS = new Set([..."([{⟨⌊⌈"]);
const EMBELLISHERS = new Set([
  "msub",
  "msup",
  "msubsup",
  "munder",
  "mover",
  "munderover",
]);

const textOf = (n: MathNode): string =>
  n.children.map((c) => (typeof c === "string" ? c : textOf(c))).join("");

/** The core `mo` of an embellished operator (a large operator with its limits), else null. */
function coreOp(n: MathNode): MathNode | null {
  if (n.name === "mo") return LARGE_OPS.has(textOf(n).trim()) ? n : null;
  if (EMBELLISHERS.has(n.name)) {
    const base = n.children.find((c): c is MathNode => typeof c === "object");
    return base ? coreOp(base) : null;
  }
  return null;
}

function isOpenFence(n: MathNode): boolean {
  if (n.name !== "mo") return false;
  const form = n.attrs.form;
  if (form === "postfix" || form === "infix") return false;
  return (
    (form === "prefix" && n.attrs.fence === "true") ||
    OPENERS.has(textOf(n).trim())
  );
}

/** Apply F24 (inline only): `lspace="0"` on a large operator right after a prefix fence. */
export function hugFences(n: MathNode): void {
  let prev: MathNode | null = null;
  for (const child of n.children) {
    if (typeof child === "string") continue;
    const op = prev && isOpenFence(prev) ? coreOp(child) : null;
    if (op) op.attrs.lspace = "0";
    hugFences(child);
    prev = child;
  }
}

// --- render + cache ------------------------------------------------------------------

const CACHE_MAX = 4000;
const cache = new Map<string, MathNode>();

/**
 * Temml's MathML for `tex`, rebuilt through the allowlist (cached; treat the result as
 * read-only). `display` is the formula block's `tex`; inline math, legend symbols and every
 * `$`…`$` are inline. Throws `MathError` when Temml refuses the TeX.
 */
export function mathTree(tex: string, display: boolean): MathNode {
  const key = `${display ? "D" : "I"}\u0000${tex}`;
  const hit = cache.get(key);
  if (hit) return hit;
  let xml: string;
  try {
    xml = temml.renderToString(tex, {
      displayMode: display,
      wrap: "none",
      throwOnError: true,
      trust: false,
      annotate: false,
    });
  } catch (exc) {
    throw new MathError(exc instanceof Error ? exc.message : String(exc));
  }
  const tree = rebuild(xml);
  if (!display) hugFences(tree);
  if (cache.size >= CACHE_MAX) cache.clear();
  cache.set(key, tree);
  return tree;
}

/**
 * A tree as React elements. `root` goes on the `<math>` element: the reader's own class
 * (joined with Temml's), `alttext` and `data-*` (strings the renderer made, never TeX).
 */
export function mathElement(
  tree: MathNode,
  root: { className?: string; [attr: string]: string | undefined },
  key?: string | number,
): ReactElement {
  const { className, ...rest } = root;
  const props = attrProps(tree.attrs);
  const cls = [className, tree.attrs.class].filter(Boolean).join(" ");
  if (cls) props.className = cls;
  for (const [name, value] of Object.entries(rest))
    if (value !== undefined) props[name] = value;
  if (key !== undefined) props.key = key;
  return createElement("math", props, ...tree.children.map(child));
}

function attrProps(attrs: Record<string, string>): Record<string, unknown> {
  const props: Record<string, unknown> = {};
  for (const [name, value] of Object.entries(attrs))
    props[name === "class" ? "className" : name] = value;
  return props;
}

function child(c: MathNode | string): ReactNode {
  if (typeof c === "string") return c;
  return createElement(c.name, attrProps(c.attrs), ...c.children.map(child));
}

/** A `tex` whose top level is one `aligned` environment: drawn as steps (README *The formula block*). */
export function isSteps(tex: string): boolean {
  return /^\\begin\{aligned\}[\s\S]*\\end\{aligned\}$/.test(tex.trim());
}

// --- linear text -------------------------------------------------------------------------

const SUP: Record<string, string> = {
  "0": "⁰",
  "1": "¹",
  "2": "²",
  "3": "³",
  "4": "⁴",
  "5": "⁵",
  "6": "⁶",
  "7": "⁷",
  "8": "⁸",
  "9": "⁹",
  "+": "⁺",
  "−": "⁻",
  "-": "⁻",
  "=": "⁼",
  "(": "⁽",
  ")": "⁾",
  n: "ⁿ",
  i: "ⁱ",
};
const SUB: Record<string, string> = {
  "0": "₀",
  "1": "₁",
  "2": "₂",
  "3": "₃",
  "4": "₄",
  "5": "₅",
  "6": "₆",
  "7": "₇",
  "8": "₈",
  "9": "₉",
  "+": "₊",
  "−": "₋",
  "-": "₋",
  "=": "₌",
  "(": "₍",
  ")": "₎",
  a: "ₐ",
  e: "ₑ",
  o: "ₒ",
  x: "ₓ",
  h: "ₕ",
  k: "ₖ",
  l: "ₗ",
  m: "ₘ",
  n: "ₙ",
  p: "ₚ",
  s: "ₛ",
  t: "ₜ",
  i: "ᵢ",
  j: "ⱼ",
  r: "ᵣ",
  u: "ᵤ",
  v: "ᵥ",
  β: "ᵦ",
  γ: "ᵧ",
  ρ: "ᵨ",
  φ: "ᵩ",
  χ: "ᵪ",
};
/** An accent `mover` draws → the combining mark that writes it in a line. */
const ACCENTS: Record<string, string> = {
  ˆ: "̂",
  "^": "̂",
  "¯": "̄",
  "‾": "̅",
  "˜": "̃",
  "~": "̃",
  "→": "⃗",
  "˙": "̇",
  "¨": "̈",
  ˇ: "̌",
};
const PRIMES = new Set([..."′″‴"]);
const INVISIBLE = new Set(["⁡", "⁢", "⁣", "⁤"]);
const CLOSERS = new Set([...")]}⟩⌋⌉!"]);
/** Operators read as plain characters in a line (no space around them). */
const PLAIN_OPS = new Set([..."/.|‖…⋯⋮⋱%$"]);
/** A sign that is unary when it opens a row. */
const UNARY = new Set([..."−-+±∓¬"]);
const ROWS = new Set(["mrow", "mstyle", "mpadded", "math", "mtd"]);

type Kind =
  | "ord"
  | "word"
  | "bin"
  | "open"
  | "close"
  | "punct"
  | "op"
  | "prefix"
  | "space"
  | "none";
interface Piece {
  text: string;
  kind: Kind;
}

const elems = (n: MathNode): MathNode[] =>
  n.children.filter((c): c is MathNode => typeof c === "object");

function moPiece(n: MathNode, first: boolean): Piece {
  const t = textOf(n).trim();
  const form = n.attrs.form;
  if (t === "" || INVISIBLE.has(t)) return { text: "", kind: "none" };
  if (LARGE_OPS.has(t)) return { text: t, kind: "op" };
  if (PRIMES.has(t)) return { text: t, kind: "close" };
  if (n.attrs.fence === "true" && form === "prefix")
    return { text: t, kind: "open" };
  if (n.attrs.fence === "true" && form === "postfix")
    return { text: t, kind: "close" };
  if (OPENERS.has(t)) return { text: t, kind: "open" };
  if (CLOSERS.has(t)) return { text: t, kind: "close" };
  if (t === "," || t === ";") return { text: t, kind: "punct" };
  if (PLAIN_OPS.has(t)) return { text: t, kind: "ord" };
  if (form === "prefix" || (first && UNARY.has(t)))
    return { text: t, kind: "prefix" };
  return { text: t, kind: "bin" };
}

/** A single token (or a row holding just one): its script needs no parentheses. */
function single(n: MathNode): boolean {
  if (TOKENS.has(n.name)) return true;
  if (ROWS.has(n.name)) {
    const kids = elems(n).filter((k) => k.name !== "mspace");
    return kids.length === 1 && single(kids[0]);
  }
  return false;
}

/** A script as written in a line: mapped characters, else `^x` / `^(…)`. */
function script(
  base: string,
  n: MathNode | undefined,
  map: Record<string, string>,
  mark: "^" | "_",
): string {
  if (!n) return base;
  const s = row(n);
  if (!s) return base;
  const chars = [...s];
  if (mark === "^" && chars.every((c) => PRIMES.has(c))) return base + s;
  if (chars.every((c) => map[c] !== undefined))
    return base + chars.map((c) => map[c]).join("");
  return base + mark + (single(n) ? s : `(${s})`);
}

/** A radicand or a fraction part: parentheses around anything but one token. */
function group(n: MathNode | readonly MathNode[] | undefined): string {
  if (!n) return "";
  const list = Array.isArray(n) ? (n as MathNode[]) : [n as MathNode];
  const text = rowOf(list);
  const kids = list.filter((k) => k.name !== "mspace");
  return kids.length === 1 && single(kids[0]) ? text : `(${text})`;
}

function piece(n: MathNode, first: boolean): Piece {
  const kids = elems(n);
  switch (n.name) {
    case "mi":
    case "mn": {
      const t = textOf(n);
      return {
        text: t,
        kind: n.name === "mi" && [...t].length > 1 ? "word" : "ord",
      };
    }
    case "mtext":
      return { text: textOf(n), kind: "word" };
    case "mo":
      return moPiece(n, first);
    case "mspace":
      return {
        text: "",
        kind: parseFloat(n.attrs.width ?? "0") >= 0.16 ? "space" : "none",
      };
    case "msup":
    case "msub":
    case "msubsup":
    case "munder":
    case "mover":
    case "munderover": {
      const base = kids[0]
        ? piece(kids[0], first)
        : { text: "", kind: "ord" as Kind };
      const accent =
        n.name === "mover" && kids[1]
          ? ACCENTS[row(kids[1]).trim()]
          : undefined;
      let text: string;
      if (accent)
        text =
          (kids[0] && single(kids[0]) ? base.text : `(${base.text})`) + accent;
      else if (n.name === "msup" || n.name === "mover")
        text = script(base.text, kids[1], SUP, "^");
      else if (n.name === "msub" || n.name === "munder")
        text = script(base.text, kids[1], SUB, "_");
      else
        text = script(script(base.text, kids[1], SUB, "_"), kids[2], SUP, "^");
      const kind: Kind =
        base.kind === "op" || base.kind === "word" ? base.kind : "ord";
      return { text, kind };
    }
    case "msqrt":
      return { text: "√" + group(kids), kind: "ord" };
    case "mroot": {
      const index = kids[1] ? row(kids[1]) : "";
      const sign =
        index === "3"
          ? "∛"
          : index === "4"
            ? "∜"
            : script("", kids[1], SUP, "^") + "√";
      return { text: sign + group(kids[0]), kind: "ord" };
    }
    case "mfrac":
      return { text: `${group(kids[0])}/${group(kids[1])}`, kind: "ord" };
    case "mtable":
      return {
        text: kids
          .map((tr) =>
            elems(tr)
              .map((td) => row(td))
              .join(" "),
          )
          .join("; "),
        kind: "ord",
      };
    default: {
      const solid = kids.filter((k) => k.name !== "mspace");
      if (solid.length === 1 && kids.length === 1)
        return piece(solid[0], first);
      return { text: rowOf(kids), kind: "ord" };
    }
  }
}

function row(n: MathNode): string {
  return ROWS.has(n.name) ? rowOf(elems(n)) : piece(n, true).text;
}

function rowOf(nodes: readonly MathNode[]): string {
  let out = "";
  let prev: Kind | null = null;
  nodes.forEach((n, i) => {
    const p = piece(n, i === 0);
    if (p.kind === "none") return;
    if (p.kind === "space") {
      if (out && !out.endsWith(" ")) out += " ";
      return;
    }
    if (!p.text) return;
    const gap =
      p.kind === "bin" ||
      prev === "bin" ||
      prev === "punct" ||
      (prev === "word" &&
        (p.kind === "word" || p.kind === "ord" || p.kind === "op")) ||
      (prev === "ord" && p.kind === "word");
    if (
      out &&
      gap &&
      !out.endsWith(" ") &&
      prev !== "open" &&
      prev !== "prefix"
    )
      out += " ";
    out += p.text;
    prev = p.kind;
  });
  return out.replace(/\s+/g, " ").trim();
}

/** The formula as written in a line (the inline alttext; the Review card's text). */
export function linearText(tree: MathNode): string {
  return row(tree);
}

/** `linearText` straight from TeX (inline context); null when Temml refuses it. */
export function linearTex(tex: string): string | null {
  try {
    return linearText(mathTree(tex, false));
  } catch (exc) {
    if (exc instanceof MathError) return null;
    throw exc;
  }
}
