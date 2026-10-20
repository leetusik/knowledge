/**
 * The flow and state layout (P30.S17; `03-diagrams` round 01, build prompt "Flow and state").
 *
 * A port of the signed canvas's `dggraph.js` `layoutGraph`, rule for rule: nodes on the author's grid (or flowing in
 * `direction`), every column as wide as its widest node and every row as tall as its tallest, edges routed
 * orthogonally through the gaps from a fixed list of route shapes (never across a node), each label set on its own
 * edge, groups as lanes and layers. Text is measured with the faces' advance widths (`diagram-text.ts`), so the same
 * source always gives the same geometry. Output: plain primitives in px at the default text size, which
 * `diagram-draw.tsx` turns into React SVG elements. Pure: no DOM, no React, no I/O.
 */

import {
  LABEL,
  MONO,
  SMALL,
  SMALL_B,
  widest,
  wrap,
  wrapBalanced,
  type Font,
} from "./diagram-text";

// --- input -------------------------------------------------------------------------

export interface GNode {
  id: string;
  label: string;
  sub?: string | null;
  at?: [number, number] | null;
  shape?: string | null;
  fields?: string[] | null;
  tone?: string | null;
}
export interface GEdge {
  from: string;
  to: string;
  label?: string | null;
  style?: string | null;
  tone?: string | null;
}
export interface GGroup {
  id: string;
  label: string;
  nodes: string[];
}
export interface GraphSpec {
  direction?: string | null;
  nodes: GNode[];
  groups?: GGroup[] | null;
  edges?: GEdge[] | null;
  initial?: string | null;
  final?: string[] | null;
}

// --- output ------------------------------------------------------------------------

export interface PathPrim {
  d: string;
  cls: string;
}
export interface KnockPrim {
  x: number;
  y: number;
  w: number;
  h: number;
  cls: string;
}
export interface TextPrim {
  x: number;
  y: number;
  t: string;
  cls: string;
}
export interface Prims {
  regions: PathPrim[];
  edges: PathPrim[];
  heads: PathPrim[];
  shapes: PathPrim[];
  rules: PathPrim[];
  knocks: KnockPrim[];
  texts: TextPrim[];
}
export interface Layout {
  W: number;
  H: number;
  prims: Prims;
  /** For the text alternative: nodes in reading order, with their edges and group. */
  nodes: LNode[];
  edges: LEdge[];
  init: LNode | null;
}

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
];
/** An unknown tone draws as `default`. */
export const toneOf = (t: unknown): string =>
  typeof t === "string" && TONES.includes(t) ? t : "default";

export const r1 = (n: number): number => Math.round(n * 10) / 10;

/** The signed layout constants (build prompt "Node sizing", "Gaps", "Edges"). */
const M = {
  padX: 12,
  padY: 9,
  labelMax: 132,
  subMax: 140,
  minW: 72,
  minH: 40,
  gapC: 40,
  gapR: 36,
  outer: 4,
  head: 7,
  headW: 3.6,
  track: 10,
  bend: 6,
  labMax: 124,
  labPadX: 5,
  labPadY: 2,
  labClear: 8,
  grpPad: 12,
  grpLab: 24,
  entPadX: 12,
  entHeadPad: 8,
  fieldPad: 3,
  fieldMax: 204,
  stateR: 12,
  initLen: 30,
  dotR: 5.5,
  loopH: 22,
};

export type Pt = [number, number];
type Side = "T" | "B" | "L" | "R";

export interface LNode {
  id: string;
  i: number;
  src: GNode;
  tone: string;
  r: number;
  c: number;
  shape: string;
  lab: string[];
  sub: string[];
  head: string[];
  fields: string[][];
  rows: number[];
  ch: number;
  padT: number;
  padB: number;
  headH: number;
  w: number;
  h: number;
  w2: number;
  h2: number;
  x: number;
  y: number;
  cx: number;
  cy: number;
  isFinal: boolean;
  group: LGroup | null;
}
interface LGroup {
  id: string;
  label: string[];
  rmin: number;
  rmax: number;
  cmin: number;
  cmax: number;
  mem: LNode[];
  tone: string;
  x: number;
  y: number;
  w: number;
  h: number;
}
interface Route {
  k: "self" | "sh" | "sv" | "lhv" | "lvh" | "zh" | "zv" | "u";
  g?: number;
  same?: boolean;
}
interface Lab {
  lines: string[];
  w: number;
  h: number;
  x: number;
  y: number;
  cx: number;
  anchor?: "start" | "end";
}
export interface LEdge {
  i: number;
  s: LNode;
  t: LNode;
  src: GEdge;
  tone: string;
  dashed: boolean;
  label: string;
  route: Route;
  ss: Side;
  ts: Side;
  ps: Pt;
  pt: Pt;
  pts: (Pt | null)[];
  gx?: number;
  gy?: number;
  chan: { axis: "c" | "r"; g: number; axis2?: "c"; g2?: number } | null;
  lab: Lab | null;
}
interface Need {
  axis: "c" | "r";
  g: number;
  amount: number;
}
interface Grid {
  dir: "right" | "down";
  nodes: LNode[];
  cells: Map<string, LNode>;
  R: number;
  C: number;
  pairs: Set<string>;
}

const sum = (a: number[], from: number, to: number): number => {
  let s = 0;
  for (let i = from; i < to; i++) s += a[i] || 0;
  return s;
};

// --- node content ------------------------------------------------------------------

function sizeNode(n: GNode, kind: string) {
  const shape =
    kind === "state"
      ? "state"
      : ["box", "pill", "store", "entity"].includes(n.shape ?? "")
        ? (n.shape as string)
        : "box";
  if (shape === "entity") {
    const head = wrapBalanced(n.label, LABEL, 200);
    const fields = (n.fields ?? []).map((f) =>
      wrap(String(f), MONO, M.fieldMax),
    );
    const fw = fields.reduce((m, fl) => Math.max(m, widest(fl, MONO)), 0);
    const w = Math.max(widest(head, LABEL), fw) + 2 * M.entPadX;
    const headH = head.length * LABEL.lh + 2 * M.entHeadPad;
    const rows = fields.map((fl) => fl.length * MONO.lh + 2 * M.fieldPad);
    const h = headH + rows.reduce((s, x) => s + x, 0) + (fields.length ? 6 : 0);
    return {
      shape,
      lab: [] as string[],
      sub: [] as string[],
      head,
      fields,
      rows,
      ch: 0,
      padT: 0,
      padB: 0,
      w: Math.max(M.minW, Math.ceil(w)),
      h: Math.ceil(h),
      headH,
    };
  }
  const lab = wrapBalanced(n.label, LABEL, M.labelMax);
  const sub = n.sub ? wrapBalanced(n.sub, SMALL, M.subMax) : [];
  const cw = Math.max(widest(lab, LABEL), widest(sub, SMALL));
  const ch =
    lab.length * LABEL.lh + (sub.length ? 2 + sub.length * SMALL.lh : 0);
  let padT = M.padY;
  let padB = M.padY;
  if (shape === "store") {
    padT += 8;
    padB += 2;
  }
  const h = Math.max(M.minH, ch + padT + padB);
  let padX = M.padX;
  if (shape === "pill") padX = Math.max(padX, Math.round(h * 0.4));
  if (shape === "state") padX = 16;
  return {
    shape,
    lab,
    sub,
    head: [] as string[],
    fields: [] as string[][],
    rows: [] as number[],
    ch,
    padT,
    padB,
    w: Math.max(M.minW, Math.ceil(cw + 2 * padX)),
    h: Math.ceil(h),
    headH: 0,
  };
}

// --- placement on the grid ---------------------------------------------------------

function place(spec: GraphSpec, kind: string): Grid {
  const dir = spec.direction === "down" ? "down" : "right";
  const cells = new Map<string, LNode>();
  let cur: Pt = dir === "right" ? [0, -1] : [-1, 0];
  const nodes = spec.nodes.map((n, i) => {
    const sized = sizeNode(n, kind);
    const o: LNode = {
      id: String(n.id),
      i,
      src: n,
      tone: toneOf(n.tone),
      r: 0,
      c: 0,
      ...sized,
      w2: 0,
      h2: 0,
      x: 0,
      y: 0,
      cx: 0,
      cy: 0,
      isFinal: false,
      group: null,
    };
    if (Array.isArray(n.at) && n.at.length === 2) {
      o.r = Math.max(0, Math.round(n.at[0]));
      o.c = Math.max(0, Math.round(n.at[1]));
      cur = [o.r, o.c];
    } else {
      do {
        cur = dir === "right" ? [cur[0], cur[1] + 1] : [cur[0] + 1, cur[1]];
      } while (cells.has(`${cur[0]},${cur[1]}`));
      o.r = cur[0];
      o.c = cur[1];
    }
    cells.set(`${o.r},${o.c}`, o);
    return o;
  });
  let R = 0;
  let C = 0;
  for (const n of nodes) {
    R = Math.max(R, n.r + 1);
    C = Math.max(C, n.c + 1);
  }
  return { dir, nodes, cells, R, C, pairs: new Set() };
}

const empty = (G: Grid, r: number, c: number): boolean =>
  !G.cells.has(`${r},${c}`);
function rowFree(G: Grid, r: number, c1: number, c2: number): boolean {
  for (let c = Math.min(c1, c2) + 1; c < Math.max(c1, c2); c++)
    if (!empty(G, r, c)) return false;
  return true;
}
function colFree(G: Grid, c: number, r1_: number, r2: number): boolean {
  for (let r = Math.min(r1_, r2) + 1; r < Math.max(r1_, r2); r++)
    if (!empty(G, r, c)) return false;
  return true;
}

// --- route shapes, picked in order of preference; U is always valid ----------------

function pickRoute(G: Grid, s: LNode, t: LNode): Route {
  if (s === t) return { k: "self" };
  const right = G.dir === "right";
  const dc = t.c - s.c;
  const dr = t.r - s.r;
  const zh = (): Route | null => {
    if (dc === 0) return null;
    const g = dc > 0 ? [t.c, s.c + 1] : [t.c + 1, s.c];
    for (const gap of g) {
      if (
        rowFree(G, s.r, s.c, dc > 0 ? gap : gap - 1) &&
        rowFree(G, t.r, dc > 0 ? gap - 1 : gap, t.c)
      )
        return { k: "zh", g: gap };
    }
    return null;
  };
  const zv = (): Route | null => {
    if (dr === 0) return { k: "zv", g: s.r + 1, same: true };
    const g = dr > 0 ? [t.r, s.r + 1] : [t.r + 1, s.r];
    for (const gap of g) {
      if (
        colFree(G, s.c, s.r, dr > 0 ? gap : gap - 1) &&
        colFree(G, t.c, dr > 0 ? gap - 1 : gap, t.r)
      )
        return { k: "zv", g: gap };
    }
    return null;
  };
  const straightH: Route | null =
    dr === 0 && rowFree(G, s.r, s.c, t.c) ? { k: "sh" } : null;
  const straightV: Route | null =
    dc === 0 && colFree(G, s.c, s.r, t.r) ? { k: "sv" } : null;
  const lhv: Route | null =
    dr !== 0 &&
    dc !== 0 &&
    rowFree(G, s.r, s.c, t.c) &&
    empty(G, s.r, t.c) &&
    colFree(G, t.c, s.r, t.r)
      ? { k: "lhv" }
      : null;
  const lvh: Route | null =
    dr !== 0 &&
    dc !== 0 &&
    colFree(G, s.c, s.r, t.r) &&
    empty(G, t.r, s.c) &&
    rowFree(G, t.r, s.c, t.c)
      ? { k: "lvh" }
      : null;
  const back = right ? dc < 0 : dr < 0;
  // a way back between neighbours runs straight when nothing runs the other way between them; else it goes round
  const paired = G.pairs.has(`${t.id}>${s.id}`);
  if (
    back &&
    !paired &&
    ((straightH && Math.abs(dc) === 1) || (straightV && Math.abs(dr) === 1))
  )
    return (straightH ?? straightV) as Route;
  let tries: (() => Route | null)[];
  if (back)
    tries = right
      ? [zv, zh, () => lvh, () => lhv]
      : [zh, zv, () => lvh, () => lhv];
  else if (right)
    tries = [() => straightH, () => straightV, zh, () => lhv, () => lvh, zv];
  else tries = [() => straightV, () => straightH, zv, () => lvh, () => lhv, zh];
  for (const f of tries) {
    const r = f();
    if (r) return r;
  }
  return { k: "u" };
}

// --- geometry helpers --------------------------------------------------------------

export function rounded(pts: Pt[], rad: number): string {
  if (pts.length < 2) return "";
  let d = `M${r1(pts[0][0])} ${r1(pts[0][1])}`;
  for (let i = 1; i < pts.length - 1; i++) {
    const a = pts[i - 1];
    const b = pts[i];
    const c = pts[i + 1];
    const l1 = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const l2 = Math.hypot(c[0] - b[0], c[1] - b[1]);
    const r = Math.min(rad, l1 / 2, l2 / 2);
    if (r < 0.5) {
      d += ` L${r1(b[0])} ${r1(b[1])}`;
      continue;
    }
    const p1 = [
      b[0] + ((a[0] - b[0]) * r) / l1,
      b[1] + ((a[1] - b[1]) * r) / l1,
    ];
    const p2 = [
      b[0] + ((c[0] - b[0]) * r) / l2,
      b[1] + ((c[1] - b[1]) * r) / l2,
    ];
    d += ` L${r1(p1[0])} ${r1(p1[1])} Q${r1(b[0])} ${r1(b[1])} ${r1(p2[0])} ${r1(p2[1])}`;
  }
  const z = pts[pts.length - 1];
  return `${d} L${r1(z[0])} ${r1(z[1])}`;
}

export function arrow(tip: Pt, from: Pt, len: number, half: number): string {
  let dx = tip[0] - from[0];
  let dy = tip[1] - from[1];
  const l = Math.hypot(dx, dy) || 1;
  dx /= l;
  dy /= l;
  const bx = tip[0] - dx * len;
  const by = tip[1] - dy * len;
  return `M${r1(tip[0])} ${r1(tip[1])} L${r1(bx - dy * half)} ${r1(by + dx * half)} L${r1(bx + dy * half)} ${r1(by - dx * half)} Z`;
}

export function rectPath(
  x: number,
  y: number,
  w: number,
  h: number,
  rad: number,
): string {
  const r = Math.min(rad, w / 2, h / 2);
  return `M${r1(x + r)} ${r1(y)} H${r1(x + w - r)} A${r} ${r} 0 0 1 ${r1(x + w)} ${r1(y + r)} V${r1(y + h - r)} A${r} ${r} 0 0 1 ${r1(x + w - r)} ${r1(y + h)} H${r1(x + r)} A${r} ${r} 0 0 1 ${r1(x)} ${r1(y + h - r)} V${r1(y + r)} A${r} ${r} 0 0 1 ${r1(x + r)} ${r1(y)} Z`;
}

function labelBox(text: string, maxW?: number) {
  const lines = wrapBalanced(text, SMALL, maxW ?? M.labMax);
  return {
    lines,
    w: Math.ceil(widest(lines, SMALL) + 2 * M.labPadX),
    h: lines.length * SMALL.lh + 2 * M.labPadY,
  };
}

export function textBlock(
  lines: string[],
  font: Font,
  x: number,
  top: number,
  cls: string,
  anchor?: "start" | "end",
): TextPrim[] {
  return lines.map((l, i) => ({
    x: r1(x),
    y: r1(top + i * font.lh + font.lh / 2 + font.size * 0.34),
    t: l,
    cls:
      cls +
      (anchor === "start"
        ? " dg-t--start"
        : anchor === "end"
          ? " dg-t--end"
          : ""),
  }));
}

// --- the flow and state layout -----------------------------------------------------

export function layoutGraph(spec: GraphSpec, kind: "flow" | "state"): Layout {
  const G = place(spec, kind);
  const byId = new Map<string, LNode>();
  for (const n of G.nodes) byId.set(n.id, n);
  const finals = (spec.final ?? []).map(String);
  for (const n of G.nodes)
    n.isFinal = kind === "state" && finals.includes(n.id);
  const init =
    kind === "state" && spec.initial != null
      ? (byId.get(String(spec.initial)) ?? null)
      : null;
  const edgeSrc = spec.edges ?? [];
  for (const e of edgeSrc) G.pairs.add(`${String(e.from)}>${String(e.to)}`);
  const edges: LEdge[] = edgeSrc
    .filter((e) => byId.has(String(e.from)) && byId.has(String(e.to)))
    .map((e, i) => {
      const s = byId.get(String(e.from)) as LNode;
      const t = byId.get(String(e.to)) as LNode;
      return {
        i,
        s,
        t,
        src: e,
        tone: toneOf(e.tone),
        dashed: e.style === "dashed",
        label: e.label != null ? String(e.label) : "",
        route: pickRoute(G, s, t),
        ss: "T",
        ts: "T",
        ps: [0, 0],
        pt: [0, 0],
        pts: [],
        chan: null,
        lab: null,
      } as LEdge;
    });

  // groups: the padded box of their cells; a group that owns whole rows (or whole columns) spans the drawing
  const groups: LGroup[] = [];
  for (const g of spec.groups ?? []) {
    const mem = (g.nodes ?? [])
      .map((id) => byId.get(String(id)))
      .filter((n): n is LNode => !!n);
    if (!mem.length) continue;
    let rmin = Infinity;
    let rmax = -1;
    let cmin = Infinity;
    let cmax = -1;
    for (const n of mem) {
      rmin = Math.min(rmin, n.r);
      rmax = Math.max(rmax, n.r);
      cmin = Math.min(cmin, n.c);
      cmax = Math.max(cmax, n.c);
    }
    const ownsRows = G.nodes.every(
      (n) => n.r < rmin || n.r > rmax || mem.includes(n),
    );
    const ownsCols = G.nodes.every(
      (n) => n.c < cmin || n.c > cmax || mem.includes(n),
    );
    if (ownsRows && G.dir === "right") {
      cmin = 0;
      cmax = G.C - 1;
    } else if (ownsCols && G.dir === "down") {
      rmin = 0;
      rmax = G.R - 1;
    } else if (ownsRows) {
      cmin = 0;
      cmax = G.C - 1;
    }
    // a group is always drawn in the muted tone: the contract gives a group no tone
    groups.push({
      id: g.id,
      label: wrapBalanced(String(g.label ?? ""), SMALL_B, 420),
      rmin,
      rmax,
      cmin,
      cmax,
      mem,
      tone: "muted",
      x: 0,
      y: 0,
      w: 0,
      h: 0,
    });
  }
  for (const n of G.nodes) {
    n.group = null;
    for (const g of groups) if (g.mem.includes(n)) n.group = g;
  }

  // column widths and row heights
  const colW: number[] = [];
  const rowH: number[] = [];
  const rowBox: number[] = [];
  for (let c = 0; c < G.C; c++) colW[c] = M.minW;
  for (let r = 0; r < G.R; r++) {
    rowH[r] = M.minH;
    rowBox[r] = M.minH;
  }
  for (const n of G.nodes) {
    colW[n.c] = Math.max(colW[n.c], n.w);
    if (n.shape !== "entity") rowBox[n.r] = Math.max(rowBox[n.r], n.h);
    rowH[n.r] = Math.max(rowH[n.r], n.h);
  }
  for (const n of G.nodes)
    if (n.shape !== "entity") rowH[n.r] = Math.max(rowH[n.r], rowBox[n.r]);

  // gaps: base, then whatever groups, loops, the start dot, channels and labels need. Each gap keeps a free corridor
  // between the group boxes on either side of it: lo is the part a group ending before the gap takes (its padding),
  // hi the part a group starting after it takes (padding, and its label band)
  const gapC: number[] = [];
  const gapR: number[] = [];
  const loC: number[] = [];
  const hiC: number[] = [];
  const loR: number[] = [];
  const hiR: number[] = [];
  for (let g = 0; g <= G.C; g++) {
    loC[g] = 0;
    hiC[g] = 0;
  }
  for (let h = 0; h <= G.R; h++) {
    loR[h] = 0;
    hiR[h] = 0;
  }
  for (const gr of groups) {
    hiC[gr.cmin] = Math.max(hiC[gr.cmin], M.grpPad);
    loC[gr.cmax + 1] = Math.max(loC[gr.cmax + 1], M.grpPad);
    hiR[gr.rmin] = Math.max(hiR[gr.rmin], M.grpPad + M.grpLab);
    loR[gr.rmax + 1] = Math.max(loR[gr.rmax + 1], M.grpPad);
  }
  for (let g = 0; g <= G.C; g++)
    gapC[g] = (g === 0 || g === G.C ? M.outer : M.gapC) + loC[g] + hiC[g];
  for (let h = 0; h <= G.R; h++)
    gapR[h] = (h === 0 || h === G.R ? M.outer : M.gapR) + loR[h] + hiR[h];
  for (const e of edges) {
    if (e.route.k === "self") {
      const lb = e.label ? labelBox(e.label) : { h: 0 };
      gapR[e.s.r] += M.loopH + lb.h + 6;
    }
  }
  if (init) {
    if (G.dir === "right") gapC[init.c] += M.initLen + 2 * M.dotR;
    else gapR[init.r] += M.initLen + 2 * M.dotR;
  }
  const extraC: number[] = [];
  const extraR: number[] = [];
  for (let g = 0; g <= G.C; g++) extraC[g] = 0;
  for (let h = 0; h <= G.R; h++) extraR[h] = 0;

  // buildGeometry places everything from the current gaps and reports where a gap is too tight
  function buildGeometry() {
    const gc = gapC.map((v, i) => v + (extraC[i] || 0));
    const gr = gapR.map((v, i) => v + (extraR[i] || 0));
    const colX: number[] = [];
    const rowY: number[] = [];
    for (let c = 0; c < G.C; c++) colX[c] = sum(gc, 0, c + 1) + sum(colW, 0, c);
    for (let r = 0; r < G.R; r++) rowY[r] = sum(gr, 0, r + 1) + sum(rowH, 0, r);
    const W = sum(gc, 0, G.C + 1) + sum(colW, 0, G.C);
    const H = sum(gr, 0, G.R + 1) + sum(rowH, 0, G.R);
    const gapX = (g: number): number =>
      g === 0 ? 0 : colX[g - 1] + colW[g - 1];
    const gapY = (g: number): number =>
      g === 0 ? 0 : rowY[g - 1] + rowH[g - 1];
    for (const n of G.nodes) {
      n.w2 = n.shape === "entity" ? Math.max(n.w, colW[n.c]) : colW[n.c];
      n.h2 = n.shape === "entity" ? n.h : rowH[n.r];
      n.x = colX[n.c] + (colW[n.c] - n.w2) / 2;
      n.y = rowY[n.r] + (rowH[n.r] - n.h2) / 2;
      n.cx = n.x + n.w2 / 2;
      n.cy = n.y + n.h2 / 2;
    }
    for (const g of groups) {
      g.x = colX[g.cmin] - M.grpPad;
      g.y = rowY[g.rmin] - M.grpPad - M.grpLab;
      g.w = colX[g.cmax] + colW[g.cmax] + M.grpPad - g.x;
      g.h = rowY[g.rmax] + rowH[g.rmax] + M.grpPad - g.y;
    }

    // sides for each end
    interface End {
      e: LEdge;
      n: LNode;
      side: Side;
      other: LNode;
      isS: boolean;
      p: Pt;
    }
    const ends: End[] = [];
    for (const e of edges) {
      const { s, t } = e;
      const k = e.route.k;
      let ss: Side;
      let ts: Side;
      if (k === "self") {
        ss = "T";
        ts = "T";
      } else if (k === "sh") {
        ss = t.c > s.c ? "R" : "L";
        ts = t.c > s.c ? "L" : "R";
      } else if (k === "sv") {
        ss = t.r > s.r ? "B" : "T";
        ts = t.r > s.r ? "T" : "B";
      } else if (k === "lhv") {
        ss = t.c > s.c ? "R" : "L";
        ts = t.r > s.r ? "T" : "B";
      } else if (k === "lvh") {
        ss = t.r > s.r ? "B" : "T";
        ts = t.c > s.c ? "L" : "R";
      } else if (k === "zh") {
        ss = t.c > s.c ? "R" : "L";
        ts = t.c > s.c ? "L" : "R";
      } else if (k === "zv") {
        if (e.route.same) {
          ss = "B";
          ts = "B";
        } else {
          ss = t.r > s.r ? "B" : "T";
          ts = t.r > s.r ? "T" : "B";
        }
      } else {
        ss = "B";
        ts = t.c >= s.c ? "L" : "R";
      }
      e.ss = ss;
      e.ts = ts;
      ends.push({ e, n: s, side: ss, other: t, isS: true, p: [0, 0] });
      ends.push({ e, n: t, side: ts, other: s, isS: false, p: [0, 0] });
    }

    // ports: the ends on one side share it evenly, ordered by where their other end lies
    const bySide = new Map<string, End[]>();
    for (const en of ends) {
      const key = `${en.n.id}:${en.side}`;
      const list = bySide.get(key);
      if (list) list.push(en);
      else bySide.set(key, [en]);
    }
    for (const list of bySide.values()) {
      const n = list[0].n;
      const side = list[0].side;
      const horiz = side === "T" || side === "B";
      list.sort((a, b) => {
        if (a.e === b.e) return a.isS ? 1 : -1;
        let oa = horiz ? a.other.cx : a.other.cy;
        let ob = horiz ? b.other.cx : b.other.cy;
        if (a.e.route.k === "self") oa = horiz ? n.cx + 1 : n.cy;
        if (b.e.route.k === "self") ob = horiz ? n.cx + 1 : n.cy;
        return oa - ob || a.e.i - b.e.i;
      });
      const len = horiz ? n.w2 : n.h2;
      let inset = horiz ? Math.min(18, len / 4) : Math.min(10, len / 4);
      if (n.shape === "pill" && !horiz) inset = len / 2 - 1;
      list.forEach((en, k) => {
        let along =
          list.length === 1
            ? len / 2
            : inset + ((len - 2 * inset) * (k + 0.5)) / list.length;
        if (list.length === 1) along = len / 2;
        const px = side === "L" ? n.x : side === "R" ? n.x + n.w2 : n.x + along;
        let py = side === "T" ? n.y : side === "B" ? n.y + n.h2 : n.y + along;
        if (n.shape === "store" && side === "T") py += 2;
        en.p = [px, py];
        if (en.isS) en.e.ps = en.p;
        else en.e.pt = en.p;
      });
    }
    // a straight edge whose one end is alone on its side moves that end level with the other, so it runs straight
    for (const e of edges) {
      const k = e.route.k;
      if (k !== "sh" && k !== "sv") continue;
      const ns = (bySide.get(`${e.s.id}:${e.ss}`) ?? []).length;
      const nt = (bySide.get(`${e.t.id}:${e.ts}`) ?? []).length;
      const ax = k === "sh" ? 1 : 0;
      const within = (n: LNode, v: number): boolean =>
        ax === 1
          ? v >= n.y + 8 && v <= n.y + n.h2 - 8
          : v >= n.x + 8 && v <= n.x + n.w2 - 8;
      if (ns === 1 && nt > 1 && within(e.s, e.pt[ax])) {
        e.ps = [...e.ps];
        e.ps[ax] = e.pt[ax];
      } else if (nt === 1 && ns > 1 && within(e.t, e.ps[ax])) {
        e.pt = [...e.pt];
        e.pt[ax] = e.ps[ax];
      }
    }

    // polylines, with channel placeholders
    interface Seg {
      e: LEdge;
      lo: number;
      hi: number;
      track: number;
      n: number;
    }
    const chans = new Map<string, Seg[]>();
    const chan = (
      axis: "c" | "r",
      g: number,
      e: LEdge,
      a: number,
      b: number,
    ) => {
      const key = `${axis}${g}`;
      const seg: Seg = {
        e,
        lo: Math.min(a, b),
        hi: Math.max(a, b),
        track: 0,
        n: 0,
      };
      const list = chans.get(key);
      if (list) list.push(seg);
      else chans.set(key, [seg]);
    };
    for (const e of edges) {
      const { ps, pt, s, t } = e;
      const k = e.route.k;
      e.chan = null;
      e.gx = undefined;
      e.gy = undefined;
      if (k === "self") {
        const top = s.y - M.loopH;
        e.pts = [ps, [ps[0], top], [pt[0], top], pt];
      } else if (k === "sh") {
        if (Math.abs(ps[1] - pt[1]) < 0.5) e.pts = [ps, [pt[0], ps[1]]];
        else {
          const gj = t.c > s.c ? s.c + 1 : s.c;
          e.chan = { axis: "c", g: gj };
          chan("c", gj, e, ps[1], pt[1]);
          e.pts = [ps, null, null, pt];
        }
      } else if (k === "sv") {
        if (Math.abs(ps[0] - pt[0]) < 0.5) e.pts = [ps, [ps[0], pt[1]]];
        else {
          const gv = t.r > s.r ? s.r + 1 : s.r;
          e.chan = { axis: "r", g: gv };
          chan("r", gv, e, ps[0], pt[0]);
          e.pts = [ps, null, null, pt];
        }
      } else if (k === "lhv") e.pts = [ps, [pt[0], ps[1]], pt];
      else if (k === "lvh") e.pts = [ps, [ps[0], pt[1]], pt];
      else if (k === "zh") {
        const g = e.route.g as number;
        e.chan = { axis: "c", g };
        chan("c", g, e, ps[1], pt[1]);
        e.pts = [ps, null, null, pt];
      } else if (k === "zv") {
        const g = e.route.g as number;
        e.chan = { axis: "r", g };
        chan("r", g, e, ps[0], pt[0]);
        e.pts = [ps, null, null, pt];
      } else {
        const gRow = s.r + 1;
        const gCol = t.c >= s.c ? t.c : t.c + 1;
        e.chan = { axis: "r", g: gRow, axis2: "c", g2: gCol };
        const gxGuess =
          gapX(gCol) + loC[gCol] + (gc[gCol] - loC[gCol] - hiC[gCol]) / 2;
        chan("r", gRow, e, ps[0], gxGuess);
        chan(
          "c",
          gCol,
          e,
          gapY(gRow) + loR[gRow] + (gr[gRow] - loR[gRow] - hiR[gRow]) / 2,
          pt[1],
        );
        e.pts = [ps, null, null, null, pt];
      }
    }

    // tracks: segments sharing a gap, side by side, 10 px apart
    const need: Need[] = [];
    for (const [key, list0] of chans) {
      const list = list0.sort((a, b) => a.lo - b.lo || a.hi - b.hi);
      const tracks: number[] = [];
      for (const sg of list) {
        let k = 0;
        while (tracks[k] != null && tracks[k] > sg.lo - 6) k++;
        tracks[k] = sg.hi;
        sg.track = k;
      }
      const n = tracks.length;
      for (const sg of list) sg.n = n;
      const axis = key.charAt(0) as "c" | "r";
      const g = Number(key.slice(1));
      const room = (n - 1) * M.track + 20;
      const lo = axis === "c" ? loC[g] : loR[g];
      const hi = axis === "c" ? hiC[g] : hiR[g];
      const have = (axis === "c" ? gc[g] : gr[g]) - lo - hi;
      if (room > have) need.push({ axis, g, amount: room - have });
      for (const sg of list) {
        const mid =
          axis === "c"
            ? gapX(g) + lo + (gc[g] - lo - hi) / 2
            : gapY(g) + lo + (gr[g] - lo - hi) / 2;
        const off = (sg.track - (n - 1) / 2) * M.track;
        if (axis === "c") sg.e.gx = mid + off;
        else sg.e.gy = mid + off;
      }
    }

    // two edges never share a run: where an end's stub in a gap lies on another edge's stub, that end's port moves one
    // track along its side (two edges that must cross then cross once, at a point)
    for (const [key, all] of chans) {
      const axis = key.charAt(0);
      const list = all.filter((sg) => sg.e.route.k !== "u");
      if (list.length < 2) continue;
      const ax = axis === "r" ? 0 : 1;
      const stubs = (e: LEdge) => {
        const g = axis === "r" ? e.gy : e.gx;
        if (g == null) return [];
        return [
          { end: "s", v: e.ps[ax], a: e.ps[1 - ax], b: g },
          { end: "t", v: e.pt[ax], a: g, b: e.pt[1 - ax] },
        ];
      };
      for (let i = 0; i < list.length; i++)
        for (let j = i + 1; j < list.length; j++) {
          const A = list[i].e;
          const B = list[j].e;
          for (const sa of stubs(A))
            for (const sb of stubs(B)) {
              if (Math.abs(sa.v - sb.v) > 1) continue;
              const lo = Math.max(Math.min(sa.a, sa.b), Math.min(sb.a, sb.b));
              const hi = Math.min(Math.max(sa.a, sa.b), Math.max(sb.a, sb.b));
              if (hi - lo < 1) continue;
              const n = sb.end === "s" ? B.s : B.t;
              const p: Pt = [...(sb.end === "s" ? B.ps : B.pt)] as Pt;
              const lim0 = (ax === 0 ? n.x : n.y) + 6;
              const lim1 = (ax === 0 ? n.x + n.w2 : n.y + n.h2) - 6;
              const nv =
                p[ax] + M.track <= lim1 ? p[ax] + M.track : p[ax] - M.track;
              if (nv < lim0) continue;
              p[ax] = nv;
              if (sb.end === "s") B.ps = p;
              else B.pt = p;
            }
        }
    }

    for (const e of edges) {
      const { ps, pt } = e;
      const k = e.route.k;
      if ((k === "sh" || k === "zh") && e.pts[1] === null)
        e.pts = [ps, [e.gx as number, ps[1]], [e.gx as number, pt[1]], pt];
      if ((k === "sv" || k === "zv") && e.pts[1] === null)
        e.pts = [ps, [ps[0], e.gy as number], [pt[0], e.gy as number], pt];
      if (k === "u")
        e.pts = [
          ps,
          [ps[0], e.gy as number],
          [e.gx as number, e.gy as number],
          [e.gx as number, pt[1]],
          pt,
        ];
      // drop zero-length segments
      const out: Pt[] = [e.pts[0] as Pt];
      for (let i = 1; i < e.pts.length; i++) {
        const a = out[out.length - 1];
        const b = e.pts[i] as Pt;
        if (Math.abs(a[0] - b[0]) > 0.2 || Math.abs(a[1] - b[1]) > 0.2)
          out.push(b);
      }
      e.pts = out;
    }

    // labels on their edge's longest segment (the loop's top), knocked out of the line
    const placed: LEdge[] = [];
    type Box = { x: number; y: number; w: number; h: number };
    const labelBlocked = (b: Box, self: LEdge): boolean => {
      const m = 3;
      for (const g of groups) {
        const ov =
          b.x < g.x + g.w + m &&
          b.x + b.w > g.x - m &&
          b.y < g.y + g.h + m &&
          b.y + b.h > g.y - m;
        const ins =
          b.x >= g.x + m &&
          b.x + b.w <= g.x + g.w - m &&
          b.y >= g.y + m &&
          b.y + b.h <= g.y + g.h - m;
        if (ov && !ins) return true;
      }
      for (const n of G.nodes) {
        if (
          b.x < n.x + n.w2 + 2 &&
          b.x + b.w > n.x - 2 &&
          b.y < n.y + n.h2 + 2 &&
          b.y + b.h > n.y - 2
        )
          return true;
      }
      for (const p of placed) {
        const c = p.lab;
        if (
          p !== self &&
          c &&
          b.x < c.x + c.w + 2 &&
          b.x + b.w > c.x - 2 &&
          b.y < c.y + c.h + 2 &&
          b.y + b.h > c.y - 2
        )
          return true;
      }
      return false;
    };
    for (const e of edges) {
      e.lab = null;
      if (!e.label) continue;
      let lb = labelBox(e.label);
      let best = -1;
      let bi = 0;
      for (let i = 1; i < e.pts.length; i++) {
        const a = e.pts[i - 1] as Pt;
        const b = e.pts[i] as Pt;
        const L = Math.hypot(b[0] - a[0], b[1] - a[1]);
        if (e.route.k === "self") {
          if (i === 2) {
            best = L;
            bi = i;
          }
          continue;
        }
        if (L > best + 0.5) {
          best = L;
          bi = i;
        }
      }
      const A = e.pts[bi - 1] as Pt;
      const B = e.pts[bi] as Pt;
      const horiz = Math.abs(A[1] - B[1]) < 0.5;
      const last = bi === e.pts.length - 1;
      let cx = (A[0] + B[0]) / 2;
      let cy = (A[1] + B[1]) / 2;
      if (e.route.k === "self") cy = A[1] - 4 - lb.h / 2;
      else if (last) {
        if (horiz) cx -= ((B[0] > A[0] ? 1 : -1) * M.head) / 2;
        else cy -= ((B[1] > A[1] ? 1 : -1) * M.head) / 2;
      }
      const lab: Lab = {
        lines: lb.lines,
        w: lb.w,
        h: lb.h,
        x: cx - lb.w / 2,
        y: cy - lb.h / 2,
        cx,
      };
      e.lab = lab;
      if (e.route.k === "self") continue;
      // a straight pair between two neighbours, one edge each way, runs as two parallel lines: each label sits beside
      // its own line, on the pair's outer side, so neither label covers the other line
      const twin =
        (e.route.k === "sv" || e.route.k === "sh") && e.pts.length === 2
          ? edges.find(
              (o) =>
                o !== e &&
                o.s === e.t &&
                o.t === e.s &&
                (o.route.k === "sv" || o.route.k === "sh") &&
                o.pts &&
                o.pts.length === 2,
            )
          : undefined;
      if (twin) {
        // beside a line, a label takes width from the drawing, so it wraps narrower (96 px)
        if (!horiz) {
          lb = labelBox(e.label, 96);
          lab.lines = lb.lines;
          lab.w = lb.w;
          lab.h = lb.h;
          lab.y = cy - lb.h / 2;
        }
        const twinP0 = twin.pts[0] as Pt;
        if (!horiz) {
          const onLeft = A[0] < twinP0[0];
          lab.x = onLeft ? A[0] - 6 - lb.w : A[0] + 6;
          lab.anchor = onLeft ? "end" : "start";
        } else {
          const onTop = A[1] < twinP0[1];
          lab.y = onTop ? A[1] - 4 - lb.h : A[1] + 4;
        }
        lab.cx = lab.x + lb.w / 2;
      }
      // a label sits wholly on one ground: where its box would cross a group's border, it slides along its segment
      // (keeping its clear line and the arrowhead) to the nearest place clear of every border, node and earlier
      // label; where the segment has no such place, the gap it crosses grows until it has one
      if (!twin && labelBlocked(lab, e)) {
        const ax = horiz ? 0 : 1;
        const half = (horiz ? lb.w : lb.h) / 2;
        const a0 = Math.min(A[ax], B[ax]);
        const a1 = Math.max(A[ax], B[ax]);
        const lo =
          a0 + M.labClear + half + (last && B[ax] < A[ax] ? M.head : 0);
        const hi =
          a1 - M.labClear - half - (last && B[ax] > A[ax] ? M.head : 0);
        const mid = horiz ? cx : cy;
        let got: number | null = null;
        for (
          let d = 0;
          got == null && (mid + d <= hi || mid - d >= lo);
          d += 1
        ) {
          for (const v of [mid + d, mid - d]) {
            if (got != null || v < lo || v > hi) continue;
            const bx = horiz ? v - lb.w / 2 : cx - lb.w / 2;
            const by = horiz ? cy - lb.h / 2 : v - lb.h / 2;
            if (!labelBlocked({ x: bx, y: by, w: lb.w, h: lb.h }, e)) got = v;
          }
        }
        if (got != null) {
          if (horiz) cx = got;
          else cy = got;
          lab.x = cx - lb.w / 2;
          lab.y = cy - lb.h / 2;
          lab.cx = cx;
        } else {
          const reqd =
            (horiz ? lb.w : lb.h) + 2 * M.labClear + (last ? M.head : 0);
          if (horiz) {
            for (let gq = 0; gq <= G.C; gq++) {
              const qx0 = gapX(gq);
              const qx1 = qx0 + gc[gq];
              if (qx1 > a0 + 0.5 && qx0 < a1 - 0.5) {
                const fq = gc[gq] - loC[gq] - hiC[gq];
                if (reqd > fq)
                  need.push({ axis: "c", g: gq, amount: reqd - fq });
                break;
              }
            }
          } else {
            for (let hq = 0; hq <= G.R; hq++) {
              const qy0 = gapY(hq);
              const qy1 = qy0 + gr[hq];
              if (qy1 > a0 + 0.5 && qy0 < a1 - 0.5) {
                const fr = gr[hq] - loR[hq] - hiR[hq];
                if (reqd > fr)
                  need.push({ axis: "r", g: hq, amount: reqd - fr });
                break;
              }
            }
          }
        }
      }
      placed.push(e);
      // room: the label plus clear line on both sides, along its segment
      const span = horiz ? Math.abs(B[0] - A[0]) : Math.abs(B[1] - A[1]);
      const want =
        (horiz ? lb.w : lb.h) +
        2 * M.labClear +
        (last ? M.head : 0) +
        (bi === 1 ? 2 : 0);
      if (span < want) {
        // grow the gap the segment crosses
        if (horiz) {
          const xa = Math.min(A[0], B[0]);
          const xb = Math.max(A[0], B[0]);
          let gi: number | null = null;
          for (let g = 0; g <= G.C; g++) {
            const gx0 = gapX(g);
            const gx1 = gx0 + gc[g];
            if (gx1 > xa + 0.5 && gx0 < xb - 0.5) {
              gi = g;
              break;
            }
          }
          if (gi != null) need.push({ axis: "c", g: gi, amount: want - span });
        } else {
          const ya = Math.min(A[1], B[1]);
          const yb = Math.max(A[1], B[1]);
          let gj: number | null = null;
          for (let h = 0; h <= G.R; h++) {
            const gy0 = gapY(h);
            const gy1 = gy0 + gr[h];
            if (gy1 > ya + 0.5 && gy0 < yb - 0.5) {
              gj = h;
              break;
            }
          }
          if (gj != null) need.push({ axis: "r", g: gj, amount: want - span });
        }
      }
      // a label beside a vertical line in a column gap, or under a horizontal one in a row gap, needs the gap's breadth
      if (!horiz && e.chan && (e.chan.axis === "c" || e.chan.axis2 === "c")) {
        const gcol = e.chan.axis === "c" ? e.chan.g : (e.chan.g2 as number);
        const freeC = gc[gcol] - loC[gcol] - hiC[gcol];
        if (lb.w + 12 > freeC)
          need.push({ axis: "c", g: gcol, amount: lb.w + 12 - freeC });
      }
      if (
        horiz &&
        e.chan &&
        e.chan.axis === "r" &&
        Math.abs(A[1] - (e.gy as number)) < 0.5
      ) {
        const freeR = gr[e.chan.g] - loR[e.chan.g] - hiR[e.chan.g];
        if (lb.h + 10 > freeR)
          need.push({ axis: "r", g: e.chan.g, amount: lb.h + 10 - freeR });
      }
      if (
        !horiz &&
        (e.route.k === "sv" || e.route.k === "lhv" || e.route.k === "lvh") &&
        lb.w > 0
      ) {
        // a label on a vertical run inside a column: keep it inside the drawing
        const minX = 2;
        const maxX = W - 2;
        if (lab.x < minX) need.push({ axis: "c", g: 0, amount: minX - lab.x });
        if (lab.x + lab.w > maxX)
          need.push({ axis: "c", g: G.C, amount: lab.x + lab.w - maxX });
      }
    }
    // a loop's label must not run past the drawing
    for (const e of edges) {
      if (e.route.k !== "self" || !e.lab) continue;
      if (e.lab.x < 2) need.push({ axis: "c", g: 0, amount: 2 - e.lab.x });
      if (e.lab.x + e.lab.w > W - 2)
        need.push({ axis: "c", g: G.C, amount: e.lab.x + e.lab.w - W + 2 });
    }
    return { W, H, need };
  }

  // the gap grows (up to four passes) until every track, label and loop label has room
  for (let pass = 0; pass < 4; pass++) {
    const geo = buildGeometry();
    const addC: Record<number, number> = {};
    const addR: Record<number, number> = {};
    for (const n of geo.need) {
      if (n.amount <= 0.5) continue;
      if (n.axis === "c") addC[n.g] = Math.max(addC[n.g] || 0, n.amount);
      else addR[n.g] = Math.max(addR[n.g] || 0, n.amount);
    }
    let grew = false;
    for (const g of Object.keys(addC)) {
      extraC[Number(g)] = (extraC[Number(g)] || 0) + Math.ceil(addC[Number(g)]);
      grew = true;
    }
    for (const g of Object.keys(addR)) {
      extraR[Number(g)] = (extraR[Number(g)] || 0) + Math.ceil(addR[Number(g)]);
      grew = true;
    }
    if (!grew) break;
  }
  // draw from the geometry that includes the last growth
  const geo = buildGeometry();

  // --- primitives ---
  const out: Prims = {
    regions: [],
    edges: [],
    heads: [],
    shapes: [],
    rules: [],
    knocks: [],
    texts: [],
  };
  // a group's name sits at its top left, moved right past any edge that crosses its band; where none of the band is
  // free, the name is knocked out of the edge, as an edge label is
  const verts: { x: number; y0: number; y1: number }[] = [];
  for (const e of edges)
    for (let i = 1; i < e.pts.length; i++) {
      const A = e.pts[i - 1] as Pt;
      const B = e.pts[i] as Pt;
      if (Math.abs(A[0] - B[0]) < 0.5)
        verts.push({
          x: A[0],
          y0: Math.min(A[1], B[1]),
          y1: Math.max(A[1], B[1]),
        });
    }
  for (const g of groups) {
    out.regions.push({
      d: rectPath(g.x, g.y, g.w, g.h, 8),
      cls: `dg-grp dg-tone-${g.tone}`,
    });
    const lw = widest(g.label, SMALL_B);
    const top = g.y + 6;
    const bot = top + g.label.length * SMALL_B.lh;
    const hits = verts.filter(
      (v) => v.y1 > top - 2 && v.y0 < bot + 2 && v.x > g.x && v.x < g.x + g.w,
    );
    let x0 = g.x + 10;
    let moved = true;
    let knock = false;
    for (let k = 0; k < 12 && moved; k++) {
      moved = false;
      for (const v of hits) {
        if (v.x > x0 - 6 && v.x < x0 + lw + 6) {
          x0 = v.x + 8;
          moved = true;
        }
      }
    }
    if (x0 + lw > g.x + g.w - 8) {
      x0 = g.x + 10;
      knock = hits.length > 0;
    }
    if (knock)
      out.knocks.push({
        x: r1(x0 - 3),
        y: r1(top - 1),
        w: r1(lw + 6),
        h: r1(bot - top + 2),
        cls: `dg-knock dg-knock--grp dg-tone-${g.tone}`,
      });
    out.texts.push(
      ...textBlock(g.label, SMALL_B, x0, top, "dg-t dg-t--grp", "start"),
    );
  }
  if (init) {
    let dot: Pt;
    let tip: Pt;
    let from: Pt;
    if (G.dir === "right") {
      tip = [init.x, init.cy];
      dot = [init.x - M.initLen - M.dotR, init.cy];
      from = [dot[0] + M.dotR, dot[1]];
    } else {
      tip = [init.cx, init.y];
      dot = [init.cx, init.y - M.initLen - M.dotR];
      from = [dot[0], dot[1] + M.dotR];
    }
    out.edges.push({
      d: rounded(
        [
          from,
          [
            tip[0] - (G.dir === "right" ? M.head - 1 : 0),
            tip[1] - (G.dir === "right" ? 0 : M.head - 1),
          ],
        ],
        0,
      ),
      cls: "dg-e",
    });
    out.heads.push({ d: arrow(tip, from, M.head, M.headW), cls: "dg-h" });
    out.shapes.push({
      d: `M${r1(dot[0] - M.dotR)} ${r1(dot[1])} a${M.dotR} ${M.dotR} 0 1 0 ${2 * M.dotR} 0 a${M.dotR} ${M.dotR} 0 1 0 ${-2 * M.dotR} 0 Z`,
      cls: "dg-start",
    });
  }
  for (const e of edges) {
    const pts = (e.pts as Pt[]).slice();
    const n = pts.length;
    const tipP = pts[n - 1];
    const prev = pts[n - 2];
    const dx = tipP[0] - prev[0];
    const dy = tipP[1] - prev[1];
    const l = Math.hypot(dx, dy) || 1;
    pts[n - 1] = [
      tipP[0] - (dx / l) * (M.head - 1.5),
      tipP[1] - (dy / l) * (M.head - 1.5),
    ];
    const tc = e.tone === "default" ? "" : ` dg-st-${e.tone}`;
    out.edges.push({
      d: rounded(pts, M.bend),
      cls: `dg-e${e.dashed ? " dg-e--dash" : ""}${tc}`,
    });
    out.heads.push({
      d: arrow(tipP, prev, M.head, M.headW),
      cls: `dg-h${e.tone === "default" ? "" : ` dg-hf-${e.tone}`}`,
    });
    if (e.lab) {
      const lab = e.lab;
      let under: LGroup | null = null;
      for (const g of groups) {
        if (
          lab.cx >= g.x &&
          lab.cx <= g.x + g.w &&
          lab.y + lab.h / 2 >= g.y &&
          lab.y + lab.h / 2 <= g.y + g.h
        )
          under = g;
      }
      out.knocks.push({
        x: r1(lab.x),
        y: r1(lab.y),
        w: r1(lab.w),
        h: r1(lab.h),
        cls: `dg-knock${under ? ` dg-knock--grp dg-tone-${under.tone}` : ""}`,
      });
      const tx =
        lab.anchor === "end"
          ? lab.x + lab.w - M.labPadX
          : lab.anchor === "start"
            ? lab.x + M.labPadX
            : lab.x + lab.w / 2;
      out.texts.push(
        ...textBlock(
          lab.lines,
          SMALL,
          tx,
          lab.y + M.labPadY,
          `dg-t dg-t--edge${e.tone === "default" ? "" : ` dg-ink-${e.tone}`}`,
          lab.anchor,
        ),
      );
    }
  }
  for (const n of G.nodes) {
    const cls = `dg-n dg-tone-${n.tone}`;
    if (n.shape === "box")
      out.shapes.push({ d: rectPath(n.x, n.y, n.w2, n.h2, 4), cls });
    else if (n.shape === "pill")
      out.shapes.push({ d: rectPath(n.x, n.y, n.w2, n.h2, n.h2 / 2), cls });
    else if (n.shape === "state") {
      out.shapes.push({ d: rectPath(n.x, n.y, n.w2, n.h2, M.stateR), cls });
      if (n.isFinal)
        out.rules.push({
          d: rectPath(n.x + 3.5, n.y + 3.5, n.w2 - 7, n.h2 - 7, M.stateR - 3),
          cls: `dg-line dg-st-${n.tone === "default" ? "ink" : n.tone}`,
        });
    } else if (n.shape === "store") {
      const rx = n.w2 / 2;
      const ry = 6;
      const { x, y, w2: w, h2: h } = n;
      out.shapes.push({
        d: `M${r1(x)} ${r1(y + ry)} A${r1(rx)} ${ry} 0 0 1 ${r1(x + w)} ${r1(y + ry)} V${r1(y + h - ry)} A${r1(rx)} ${ry} 0 0 1 ${r1(x)} ${r1(y + h - ry)} Z`,
        cls,
      });
      out.rules.push({
        d: `M${r1(x)} ${r1(y + ry)} A${r1(rx)} ${ry} 0 0 0 ${r1(x + w)} ${r1(y + ry)}`,
        cls: `dg-line dg-st-${n.tone}`,
      });
    } else if (n.shape === "entity") {
      out.shapes.push({
        d: rectPath(n.x, n.y, n.w2, n.h2, 4),
        cls: `${cls} dg-n--entity`,
      });
      out.shapes.push({
        d: `M${r1(n.x + 0.5)} ${r1(n.y + 4)} A3.5 3.5 0 0 1 ${r1(n.x + 4)} ${r1(n.y + 0.5)} H${r1(n.x + n.w2 - 4)} A3.5 3.5 0 0 1 ${r1(n.x + n.w2 - 0.5)} ${r1(n.y + 4)} V${r1(n.y + n.headH)} H${r1(n.x + 0.5)} Z`,
        cls: `dg-enthead dg-tone-${n.tone}`,
      });
      out.rules.push({
        d: `M${r1(n.x)} ${r1(n.y + n.headH)} H${r1(n.x + n.w2)}`,
        cls: `dg-line dg-st-${n.tone}`,
      });
    }
    // text
    if (n.shape === "entity") {
      out.texts.push(
        ...textBlock(
          n.head,
          LABEL,
          n.x + M.entPadX,
          n.y + M.entHeadPad,
          "dg-t dg-t--label",
          "start",
        ),
      );
      let fy = n.y + n.headH + 3;
      n.fields.forEach((fl, k) => {
        if (k > 0)
          out.rules.push({
            d: `M${r1(n.x + 8)} ${r1(fy)} H${r1(n.x + n.w2 - 8)}`,
            cls: "dg-hair",
          });
        out.texts.push(
          ...textBlock(
            fl,
            MONO,
            n.x + M.entPadX,
            fy + M.fieldPad,
            "dg-t dg-t--field",
            "start",
          ),
        );
        fy += n.rows[k];
      });
    } else {
      const top = n.y + n.padT + (n.h2 - n.padT - n.padB - n.ch) / 2;
      out.texts.push(
        ...textBlock(
          n.lab,
          LABEL,
          n.cx,
          top,
          `dg-t dg-t--label${n.tone === "muted" ? " dg-t--muted" : ""}`,
        ),
      );
      if (n.sub.length)
        out.texts.push(
          ...textBlock(
            n.sub,
            SMALL,
            n.cx,
            top + n.lab.length * LABEL.lh + 2,
            "dg-t dg-t--sub",
          ),
        );
    }
  }
  return {
    W: Math.ceil(geo.W),
    H: Math.ceil(geo.H),
    prims: out,
    nodes: G.nodes,
    edges,
    init,
  };
}
