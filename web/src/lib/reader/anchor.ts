/**
 * P30.S20 — the captured anchor (`05-annotations` round 01, *Sections and offsets* and
 * *Classifying a selection*; P29 *Anchors*). Pure: it reads a minimal DOM interface, so the
 * browser hands it real nodes and the core test hands it a parsed render of the fixtures.
 *
 * The renderer (`lib/native/render.tsx`) stamps every passage container it shows exactly as
 * the projection (`lib/native/project.ts`, the twin of `server/native/project.py`) has it:
 *
 *  - `data-tx` (`p` | `code`) marks a stamped container (a paragraph, a callout title, a
 *    table cell, one line of a code block);
 *  - `data-sec` is its section (the id'd block it belongs to);
 *  - `data-base` is the offset of its first character in the section's text, in code
 *    points.
 *
 * Inside a container the page's text is the projection's text, except:
 *  - `data-an-skip` elements (a link's " · new tab", a citation's "[n]", an image's alt) are
 *    not the document's text: they count nothing;
 *  - a `data-an-len="N"` element stands for N characters of the projection it does not show
 *    (a citation whose words were only its number): it counts N and is never split;
 *  - a `<br>` is the projection's "\n".
 *
 * So a boundary point (a node and an offset, as a `Range` gives it) maps to
 * `data-base + characters before it`, and back. The quote, its prefix and its suffix are
 * then cut from the section's text itself (passed in from the server's projection), never
 * read off the page, so what is stored is always the projection's text at those offsets.
 */

/** The DOM this module reads: a subset every browser `Node` has. */
export interface ANode {
  nodeType: number;
  nodeName: string;
  nodeValue: string | null;
  parentNode: ANode | null;
  childNodes: ArrayLike<ANode>;
  getAttribute?: (name: string) => string | null;
}

/** A `Range`'s two boundary points. */
export interface Bounds {
  startContainer: ANode;
  startOffset: number;
  endContainer: ANode;
  endOffset: number;
}

/** P29 *Anchors*: `{exact, prefix (≤ 32), suffix (≤ 32), start, end}` in code points. */
export interface Quote {
  exact: string;
  prefix: string;
  suffix: string;
  start: number;
  end: number;
}

/** OQ29: the server's caps, in code points (Python `len`). */
export const QUOTE_MAX = 5000;
export const CONTEXT_MAX = 32;

const TEXT = 3;
const ELEMENT = 1;

/** A string as code points: the unit every offset counts (never UTF-16 units). */
export function cps(text: string): string[] {
  return Array.from(text);
}

// --- word snapping ---------------------------------------------------------------------

/** A word character (`[\p{L}\p{N}_'’-]`): a highlight never splits a word or an eojeol. */
const WORD = /^[\p{L}\p{N}_'’-]$/u;
const SPACE = /^\s$/u;

/**
 * Each end extends outward to a word boundary, then leading and trailing spaces are
 * trimmed. `text` is the section's text as code points; `s`/`e` are offsets in it.
 */
export function snap(
  text: readonly string[],
  s: number,
  e: number,
): { s: number; e: number } {
  let a = Math.max(0, Math.min(s, text.length));
  let b = Math.max(a, Math.min(e, text.length));
  const w = (i: number) => i >= 0 && i < text.length && WORD.test(text[i]);
  while (a > 0 && a < text.length && w(a - 1) && w(a)) a -= 1;
  while (b > 0 && b < text.length && w(b - 1) && w(b)) b += 1;
  while (a < b && SPACE.test(text[a])) a += 1;
  while (b > a && SPACE.test(text[b - 1])) b -= 1;
  return { s: a, e: b };
}

/**
 * The server keeps at most `QUOTE_MAX` characters of a quote (a longer one is refused).
 * A longer selection is cut there, back to a word boundary, so what is saved is what is
 * painted (decided in P30.S20: never a refused save).
 */
export function capEnd(text: readonly string[], s: number, e: number): number {
  if (e - s <= QUOTE_MAX) return e;
  let b = s + QUOTE_MAX;
  const w = (i: number) => i >= 0 && i < text.length && WORD.test(text[i]);
  while (b > s && w(b - 1) && w(b)) b -= 1;
  while (b > s && SPACE.test(text[b - 1])) b -= 1;
  return b > s ? b : s + QUOTE_MAX;
}

/** The stored quote for `[s, e)` of a section's text: the exact text and 32 either side. */
export function quoteAt(text: readonly string[], s: number, e: number): Quote {
  return {
    exact: text.slice(s, e).join(""),
    prefix: text.slice(Math.max(0, s - CONTEXT_MAX), s).join(""),
    suffix: text.slice(e, e + CONTEXT_MAX).join(""),
    start: s,
    end: e,
  };
}

// --- the stamps --------------------------------------------------------------------------

const attr = (n: ANode, name: string): string | null =>
  n.nodeType === ELEMENT && n.getAttribute ? n.getAttribute(name) : null;

const isSkip = (n: ANode) => attr(n, "data-an-skip") !== null;
const atomLen = (n: ANode): number | null => {
  const v = attr(n, "data-an-len");
  if (v === null) return null;
  const k = Number(v);
  return Number.isFinite(k) && k >= 0 ? k : 0;
};
const isBr = (n: ANode) =>
  n.nodeType === ELEMENT && n.nodeName.toUpperCase() === "BR";

/** A stamped passage container. */
export interface Segment {
  el: ANode;
  sec: string;
  base: number;
  kind: "p" | "code";
}

export function segmentOf(n: ANode): Segment | null {
  const kind = attr(n, "data-tx");
  const sec = attr(n, "data-sec");
  const base = Number(attr(n, "data-base"));
  if ((kind !== "p" && kind !== "code") || !sec || !Number.isInteger(base))
    return null;
  return { el: n, sec, base, kind };
}

/** One counted piece of a container: a text node, a `<br>`, or a stand-in element. */
export interface Unit {
  node: ANode;
  kind: "text" | "br" | "atom";
  /** Offset of its first character in the container. */
  at: number;
  len: number;
}

/** The container's counted pieces, in order (skipped elements and comments count nothing). */
export function units(el: ANode): Unit[] {
  const out: Unit[] = [];
  let at = 0;
  const visit = (n: ANode) => {
    if (n.nodeType === TEXT) {
      const len = cps(n.nodeValue ?? "").length;
      if (len) out.push({ node: n, kind: "text", at, len });
      at += len;
      return;
    }
    if (n.nodeType !== ELEMENT) return;
    if (isSkip(n)) return;
    const atom = atomLen(n);
    if (atom !== null) {
      out.push({ node: n, kind: "atom", at, len: atom });
      at += atom;
      return;
    }
    if (isBr(n)) {
      out.push({ node: n, kind: "br", at, len: 1 });
      at += 1;
      return;
    }
    const kids = n.childNodes;
    for (let i = 0; i < kids.length; i += 1) visit(kids[i]);
  };
  const kids = el.childNodes;
  for (let i = 0; i < kids.length; i += 1) visit(kids[i]);
  return out;
}

/** The container's length in the projection. */
export function lengthOf(el: ANode): number {
  const u = units(el);
  return u.length ? u[u.length - 1].at + u[u.length - 1].len : 0;
}

/** The text a container shows, as the projection counts it (for the self-check and tests). */
export function shownText(el: ANode): string | null {
  let out = "";
  for (const u of units(el)) {
    if (u.kind === "text") out += u.node.nodeValue ?? "";
    else if (u.kind === "br") out += "\n";
    else return null; // a stand-in: the page does not show those characters
  }
  return out;
}

function indexIn(parent: ANode, child: ANode): number {
  const kids = parent.childNodes;
  for (let i = 0; i < kids.length; i += 1) if (kids[i] === child) return i;
  return -1;
}

/**
 * The offset (in the container) of a boundary point inside it. A point inside a skipped
 * element, a stand-in or a `<br>` moves to its edge: before it for a start, after it for
 * an end. Returns null when the point is not inside `el`.
 */
export function offsetIn(
  el: ANode,
  container: ANode,
  offset: number,
  edge: "start" | "end",
): number | null {
  let c = container;
  let o = offset;
  let blocker: ANode | null = null;
  let inside = false;
  for (let p: ANode | null = container; p; p = p.parentNode) {
    if (p === el) {
      inside = true;
      break;
    }
    if (isSkip(p) || atomLen(p) !== null || isBr(p)) blocker = p;
  }
  if (!inside) return null;
  if (blocker && blocker.parentNode) {
    c = blocker.parentNode;
    const i = indexIn(c, blocker);
    o = edge === "start" ? i : i + 1;
  }
  let acc = 0;
  let found: number | null = null;
  const visit = (n: ANode): boolean => {
    if (n.nodeType === TEXT) {
      const text = n.nodeValue ?? "";
      if (n === c) {
        found =
          acc +
          cps(text.slice(0, Math.max(0, Math.min(o, text.length)))).length;
        return true;
      }
      acc += cps(text).length;
      return false;
    }
    if (n.nodeType !== ELEMENT) return false;
    if (n !== el) {
      if (isSkip(n)) return false;
      const atom = atomLen(n);
      if (atom !== null) {
        acc += atom;
        return false;
      }
      if (isBr(n)) {
        acc += 1;
        return false;
      }
    }
    const kids = n.childNodes;
    for (let i = 0; i < kids.length; i += 1) {
      if (n === c && i === o) {
        found = acc;
        return true;
      }
      if (visit(kids[i])) return true;
    }
    if (n === c) {
      found = acc;
      return true;
    }
    return false;
  };
  visit(el);
  return found;
}

/** A text node's UTF-16 offset of its `k`-th code point. */
function utf16At(text: string, k: number): number {
  let i = 0;
  let n = 0;
  for (const ch of text) {
    if (n === k) return i;
    i += ch.length;
    n += 1;
  }
  return text.length;
}

/** The part of one text node a range covers, in UTF-16 offsets. */
export interface Slice {
  node: ANode;
  a: number;
  b: number;
  /** The range's offsets (section text) this slice covers. */
  from: number;
  to: number;
}

/** The text-node slices of a container that `[from, to)` (section offsets) covers. */
export function slicesIn(seg: Segment, from: number, to: number): Slice[] {
  const out: Slice[] = [];
  for (const u of units(seg.el)) {
    if (u.kind !== "text") continue;
    const s0 = seg.base + u.at;
    const s1 = s0 + u.len;
    const x = Math.max(from, s0);
    const y = Math.min(to, s1);
    if (x >= y) continue;
    const text = u.node.nodeValue ?? "";
    out.push({
      node: u.node,
      a: utf16At(text, x - s0),
      b: utf16At(text, y - s0),
      from: x,
      to: y,
    });
  }
  return out;
}

/** A boundary point at section offset `off` in a container (for tests and the paint). */
export function pointAt(
  seg: Segment,
  off: number,
): { node: ANode; offset: number } | null {
  const local = off - seg.base;
  const list = units(seg.el);
  for (const u of list) {
    if (u.kind === "text" && local >= u.at && local <= u.at + u.len) {
      return {
        node: u.node,
        offset: utf16At(u.node.nodeValue ?? "", local - u.at),
      };
    }
  }
  return null;
}

// --- the chapter's map ------------------------------------------------------------------

interface Indexed {
  /** Pre-order index of every node under the root. */
  idx: Map<ANode, number>;
  /** The index of each node's last descendant. */
  last: Map<ANode, number>;
  segments: (Segment & { i: number; j: number })[];
  starts: { id: string; i: number; el: ANode }[];
}

function index(root: ANode, sectionIds: ReadonlySet<string>): Indexed {
  const idx = new Map<ANode, number>();
  const last = new Map<ANode, number>();
  const segments: Indexed["segments"] = [];
  const starts: Indexed["starts"] = [];
  const seen = new Set<string>();
  let n = 0;
  const visit = (node: ANode) => {
    const i = n;
    idx.set(node, n);
    n += 1;
    let seg: (Segment & { i: number; j: number }) | null = null;
    if (node.nodeType === ELEMENT) {
      const block = attr(node, "data-block");
      if (block && sectionIds.has(block) && !seen.has(block)) {
        seen.add(block);
        starts.push({ id: block, i, el: node });
      }
      const s = segmentOf(node);
      if (s) {
        seg = { ...s, i, j: i };
        segments.push(seg);
      }
    }
    const kids = node.childNodes;
    for (let k = 0; k < kids.length; k += 1) visit(kids[k]);
    last.set(node, n - 1);
    if (seg) seg.j = n - 1;
  };
  visit(root);
  return { idx, last, segments, starts };
}

/** A boundary point's place in document order (comparable numbers). */
function keyOf(ix: Indexed, c: ANode, o: number): number | null {
  const i = ix.idx.get(c);
  if (i === undefined) return null;
  if (c.nodeType !== ELEMENT) {
    const len = (c.nodeValue ?? "").length;
    return i + ((Math.max(0, Math.min(o, len)) + 1) / (len + 2)) * 0.5;
  }
  const kids = c.childNodes;
  if (o < kids.length) {
    const k = ix.idx.get(kids[o]);
    return k === undefined ? null : k - 0.25;
  }
  return (ix.last.get(c) ?? i) + 0.6;
}

/** What a section is called where the annotation layer names it. */
export interface SectionInfo {
  id: string;
  /** The section's text (the shared projection), as the server computed it. */
  text: string;
}

export type Captured =
  /** A passage: `[s, e)` of section `sec`'s text, snapped; `clipped` = it ran past the section. */
  | {
      mode: "passage";
      sec: string;
      s: number;
      e: number;
      clipped: boolean;
      quote: Quote;
    }
  /** A heading, or a typed block's title or caption: a note on that section. */
  | { mode: "block"; sec: string }
  /** Text before the first section: "Highlights start at the first section." */
  | { mode: "refuse" };

/** Passage-like elements: a start inside one that carries no stamp takes no highlight. */
const PASSAGE = new Set(["P", "TD", "TH", "PRE", "CODE", "LI"]);
const isPassageEl = (n: ANode) =>
  n.nodeType === ELEMENT &&
  (PASSAGE.has(n.nodeName.toUpperCase()) ||
    /\bkb-ch-(code__ln|callout__title)\b/.test(attr(n, "class") ?? ""));

/**
 * Classify a selection inside the chapter body (`root` = the `.kb-ch` element) by where it
 * starts (`05-annotations` *Classifying a selection*). Returns null when it is ignored (it
 * starts in no text a highlight or a note can take, or is empty after snapping).
 *
 * `sections` is the server's projection: the passage's quote is cut from it.
 */
export function capture(
  root: ANode,
  b: Bounds,
  sections: ReadonlyMap<string, readonly string[]>,
): Captured | null {
  const ids = new Set(sections.keys());
  const ix = index(root, ids);
  // Only containers whose shown text is the projection's own take part (the self-check).
  const good = new Set(verified(ix.segments, sections).map((g) => g.el));
  ix.segments = ix.segments.filter((g) => good.has(g.el));
  const S = keyOf(ix, b.startContainer, b.startOffset);
  const E = keyOf(ix, b.endContainer, b.endOffset);
  if (S === null || E === null || E < S) return null;
  const spanOf = (g: { i: number; j: number }) => [g.i - 0.25, g.j + 0.6];
  const within = (k: number) =>
    ix.segments.find((g) => {
      const [a, z] = spanOf(g);
      return k >= a && k <= z;
    }) ?? null;
  const sectionAt = (k: number) => {
    let found: Indexed["starts"][number] | null = null;
    for (const st of ix.starts) if (st.i - 0.25 <= k) found = st;
    return found;
  };

  let sec: string;
  let s: number;
  const startSeg = within(S);
  if (startSeg) {
    // A point on the container's own edge (its parent and child index) is its first or
    // last character.
    const off =
      offsetIn(startSeg.el, b.startContainer, b.startOffset, "start") ??
      (S <= startSeg.i ? 0 : lengthOf(startSeg.el));
    if (!sections.has(startSeg.sec)) return null;
    sec = startSeg.sec;
    s = startSeg.base + off;
  } else {
    // A heading, or a typed block's title or caption: a note on that section.
    for (
      let p: ANode | null = b.startContainer;
      p && p !== root;
      p = p.parentNode
    ) {
      const block = attr(p, "data-block");
      if (block && ids.has(block)) return { mode: "block", sec: block };
    }
    const home = sectionAt(S);
    if (!home) return { mode: "refuse" };
    for (
      let p: ANode | null = b.startContainer;
      p && p !== root;
      p = p.parentNode
    )
      if (isPassageEl(p)) return null;
    // Between blocks: the passage starts at the next container of the same section.
    const next = ix.segments.find((g) => g.sec === home.id && g.i - 0.25 >= S);
    if (!next || next.i - 0.25 > E) return null;
    sec = home.id;
    s = next.base;
  }

  const text = sections.get(sec)!;
  let e: number;
  let clipped = false;
  const endSeg = within(E);
  const endOff =
    endSeg && endSeg.sec === sec
      ? (offsetIn(endSeg.el, b.endContainer, b.endOffset, "end") ??
        (E <= endSeg.i ? 0 : lengthOf(endSeg.el)))
      : null;
  if (endSeg && endSeg.sec === sec && endOff !== null) {
    e = endSeg.base + endOff;
  } else {
    const there = sectionAt(E);
    if (there && there.id !== sec) {
      e = text.length;
      clipped = true;
    } else {
      let prev: Indexed["segments"][number] | null = null;
      for (const g of ix.segments)
        if (g.sec === sec && g.j + 0.6 <= E) prev = g;
      e = prev ? prev.base + lengthOf(prev.el) : s;
    }
  }
  const sn = snap(text, s, e);
  const end = capEnd(text, sn.s, sn.e);
  if (end <= sn.s) return null;
  return {
    mode: "passage",
    sec,
    s: sn.s,
    e: end,
    clipped,
    quote: quoteAt(text, sn.s, end),
  };
}

/** Every stamped container under `root`, in document order. */
export function segments(root: ANode): Segment[] {
  const out: Segment[] = [];
  const visit = (n: ANode) => {
    if (n.nodeType !== ELEMENT) return;
    const s = segmentOf(n);
    if (s) {
      out.push(s);
      return;
    }
    const kids = n.childNodes;
    for (let i = 0; i < kids.length; i += 1) visit(kids[i]);
  };
  visit(root);
  return out;
}

/**
 * The self-check: a container whose shown text is not the projection's text at its
 * offsets is dropped from the map (it then takes no highlight and no paint).
 */
export function verified(
  segs: readonly Segment[],
  sections: ReadonlyMap<string, readonly string[]>,
): Segment[] {
  return segs.filter((g) => {
    const text = sections.get(g.sec);
    if (!text) return false;
    const len = lengthOf(g.el);
    if (g.base < 0 || g.base + len > text.length) return false;
    let at = g.base;
    for (const u of units(g.el)) {
      at = g.base + u.at;
      if (u.kind === "text") {
        if (text.slice(at, at + u.len).join("") !== (u.node.nodeValue ?? ""))
          return false;
      } else if (u.kind === "br" && text[at] !== "\n") return false;
    }
    return true;
  });
}
