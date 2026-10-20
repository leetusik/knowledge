/**
 * The sequence layout (P30.S18; `03-diagrams` round 01, build prompt "Sequence").
 *
 * A port of the signed canvas's `dggraph.js` `layoutSequence`, rule for rule: one column per actor, one row per step,
 * lifelines under everything, labels knocked out of the lifelines they cross, a step to itself as a loop on the
 * right, a note as a folded card under its step. Text is measured with the faces' advance widths
 * (`diagram-text.ts`), so the same source always gives the same geometry. Output: plain primitives in px at the
 * default text size (`diagram-draw.tsx` draws them, as it draws a flow). Pure: no DOM, no React, no I/O.
 */

import {
  arrow,
  r1,
  rectPath,
  rounded,
  textBlock,
  toneOf,
  type Prims,
  type Pt,
} from "./diagram-layout";
import { LABEL, SMALL, widest, wrapBalanced } from "./diagram-text";

export interface SeqActor {
  id: string;
  label: string;
}
export interface SeqStep {
  from: string;
  to: string;
  label: string;
  style?: string | null;
  note?: string | null;
  tone?: string | null;
}
export interface SeqSpec {
  actors: SeqActor[];
  steps: SeqStep[];
}
export interface SeqLayout {
  W: number;
  H: number;
  prims: Prims;
  /** For the text alternative: the steps that were drawn (an unknown actor id is not drawn), in order. */
  steps: {
    from: string;
    to: string;
    label: string;
    self: boolean;
    note: string | null;
  }[];
}

/** The signed constants (build prompt "Sequence"). */
const S = {
  padX: 12,
  padY: 9,
  actorMax: 128,
  actorMin: 84,
  headMin: 40,
  colMin: 110,
  colPad: 24,
  stepMax: 210,
  stepSelfMax: 150,
  noteMax: 220,
  loopW: 32,
  loopH: 22,
  head: 7,
  headW: 3.6,
  bend: 6,
  numW: 18,
};

const sum = (a: number[], from: number, to: number): number => {
  let s = 0;
  for (let i = from; i < to; i++) s += a[i] || 0;
  return s;
};

export function layoutSequence(spec: SeqSpec): SeqLayout {
  const actors = spec.actors.map((a, i) => {
    const lab = wrapBalanced(String(a.label || a.id), LABEL, S.actorMax);
    return {
      id: String(a.id),
      i,
      lab,
      w: Math.max(S.actorMin, Math.ceil(widest(lab, LABEL) + 2 * S.padX)),
      h: lab.length * LABEL.lh + 2 * S.padY,
    };
  });
  const byId = new Map(actors.map((a) => [a.id, a]));
  const N = actors.length;
  const steps = spec.steps
    .filter((s) => byId.has(String(s.from)) && byId.has(String(s.to)))
    .map((s, i) => {
      const a = byId.get(String(s.from))!;
      const b = byId.get(String(s.to))!;
      const self = a === b;
      const lines = wrapBalanced(
        String(s.label || ""),
        SMALL,
        self ? S.stepSelfMax : S.stepMax,
      );
      const note = s.note
        ? wrapBalanced(String(s.note), SMALL, S.noteMax)
        : null;
      return {
        i,
        a,
        b,
        self,
        dashed: s.style === "dashed",
        tone: toneOf(s.tone),
        lines,
        lw: widest(lines, SMALL),
        note,
        nw: note ? widest(note, SMALL) : 0,
        label: String(s.label || ""),
        noteText: s.note ? String(s.note) : null,
        y0: 0,
        ly: 0,
        ny: 0,
      };
    });
  // column spacing: wide enough for each actor's box and each step's label over the columns it spans
  const sp: number[] = [];
  for (let k = 0; k < N - 1; k++)
    sp[k] = Math.max(S.colMin, (actors[k].w + actors[k + 1].w) / 2 + S.colPad);
  for (const s of steps) {
    if (s.self) {
      const needR = S.loopW + 8 + S.numW + s.lw + 10;
      if (s.a.i < N - 1) sp[s.a.i] = Math.max(sp[s.a.i], needR + 16);
      continue;
    }
    const lo = Math.min(s.a.i, s.b.i);
    const hi = Math.max(s.a.i, s.b.i);
    const have = sum(sp, lo, hi);
    const want = s.lw + S.numW + 28;
    if (have < want) {
      const add = (want - have) / (hi - lo);
      for (let q = lo; q < hi; q++) sp[q] += add;
    }
  }
  const left = Math.max(actors.length ? actors[0].w / 2 : 0, 0) + 4;
  const xs: number[] = [];
  let x = left;
  actors.forEach((a, i) => {
    xs[i] = x;
    if (i < N - 1) x += sp[i];
  });
  let rightNeed = N ? actors[N - 1].w / 2 + 4 : 0;
  for (const s of steps)
    if (s.self && s.a.i === N - 1)
      rightNeed = Math.max(rightNeed, S.loopW + 8 + S.numW + s.lw + 10);
  for (const s of steps) {
    if (s.note) {
      const cx = s.self ? xs[s.a.i] : (xs[s.a.i] + xs[s.b.i]) / 2;
      rightNeed = Math.max(rightNeed, cx + s.nw / 2 + 14 - xs[N - 1]);
    }
  }
  const W = Math.ceil(x + rightNeed);
  const headH = actors.reduce((m, a) => Math.max(m, a.h), S.headMin);
  const out: Prims = {
    regions: [],
    edges: [],
    heads: [],
    shapes: [],
    rules: [],
    knocks: [],
    texts: [],
  };
  let y = headH + 22;
  for (const s of steps) {
    const labH = s.lines.length * SMALL.lh;
    s.y0 = y;
    if (s.self) {
      s.ly = y + 4;
      y += Math.max(labH + 6, S.loopH + 12) + 6;
    } else {
      s.ly = y + labH + 4;
      y = s.ly + 14;
    }
    if (s.note) {
      s.ny = y;
      y += s.note.length * SMALL.lh + 14 + 12;
    }
    y += 4;
  }
  const H = Math.ceil(y + 6);
  actors.forEach((a, i) => {
    // lifelines lie under everything else, so a note covers them
    out.regions.push({
      d: `M${r1(xs[i])} ${r1(headH)} V${r1(H - 2)}`,
      cls: "dg-life",
    });
    out.shapes.push({
      d: rectPath(xs[i] - a.w / 2, (headH - a.h) / 2, a.w, a.h, 4),
      cls: "dg-n dg-tone-default",
    });
    out.texts.push(
      ...textBlock(
        a.lab,
        LABEL,
        xs[i],
        (headH - a.h) / 2 + S.padY,
        "dg-t dg-t--label",
      ),
    );
  });
  for (const s of steps) {
    const xa = xs[s.a.i];
    const xb = xs[s.b.i];
    const tc = s.tone === "default" ? "" : ` dg-st-${s.tone}`;
    const hc = s.tone === "default" ? "" : ` dg-hf-${s.tone}`;
    const ink = s.tone === "default" ? "" : ` dg-ink-${s.tone}`;
    const num = String(s.i + 1);
    if (s.self) {
      const top = s.ly + 2;
      const bot = top + S.loopH;
      const r = xa + S.loopW;
      const pts: Pt[] = [
        [xa, top],
        [r, top],
        [r, bot],
        [xa + S.head - 1.5, bot],
      ];
      out.edges.push({
        d: rounded(pts, S.bend),
        cls: `dg-e${s.dashed ? " dg-e--dash" : ""}${tc}`,
      });
      out.heads.push({
        d: arrow([xa + 1, bot], [r, bot], S.head, S.headW),
        cls: `dg-h${hc}`,
      });
      const tx = r + 8;
      // the step's number and label are knocked out of any line they cross
      out.knocks.push({
        x: r1(tx - 3),
        y: r1(top - 3),
        w: r1(S.numW + s.lw + 6),
        h: r1(s.lines.length * SMALL.lh + 2),
        cls: "dg-knock",
      });
      out.texts.push({
        x: r1(tx),
        y: r1(top + SMALL.lh / 2 + SMALL.size * 0.34 - 2),
        t: num,
        cls: "dg-t dg-t--num dg-t--start",
      });
      out.texts.push(
        ...textBlock(
          s.lines,
          SMALL,
          tx + S.numW,
          top - 2,
          `dg-t dg-t--edge${ink}`,
          "start",
        ),
      );
    } else {
      const dir = xb > xa ? 1 : -1;
      const from: Pt = [xa + dir, s.ly];
      const tip: Pt = [xb - dir, s.ly];
      out.edges.push({
        d: `M${r1(from[0])} ${r1(s.ly)} H${r1(tip[0] - dir * (S.head - 1.5))}`,
        cls: `dg-e${s.dashed ? " dg-e--dash" : ""}${tc}`,
      });
      out.heads.push({
        d: arrow(tip, from, S.head, S.headW),
        cls: `dg-h${hc}`,
      });
      const mid = (xa + xb) / 2;
      const total = S.numW + s.lw;
      const x0 = mid - total / 2;
      const top2 = s.ly - 4 - s.lines.length * SMALL.lh;
      // a label that spans several columns is knocked out of the lifelines it crosses
      out.knocks.push({
        x: r1(x0 - 3),
        y: r1(top2 - 1),
        w: r1(total + 6),
        h: r1(s.lines.length * SMALL.lh + 2),
        cls: "dg-knock",
      });
      out.texts.push({
        x: r1(x0),
        y: r1(top2 + SMALL.lh / 2 + SMALL.size * 0.34),
        t: num,
        cls: "dg-t dg-t--num dg-t--start",
      });
      out.texts.push(
        ...textBlock(
          s.lines,
          SMALL,
          x0 + S.numW,
          top2,
          `dg-t dg-t--edge${ink}`,
          "start",
        ),
      );
    }
    if (s.note) {
      const ncx = s.self ? xa + 30 : (xa + xb) / 2;
      const nw = Math.ceil(s.nw + 24);
      const nh = s.note.length * SMALL.lh + 14;
      let nx = ncx - nw / 2;
      const ny = s.ny;
      if (nx < 2) nx = 2;
      const fold = 8;
      out.shapes.push({
        d: `M${r1(nx)} ${r1(ny)} H${r1(nx + nw - fold)} L${r1(nx + nw)} ${r1(ny + fold)} V${r1(ny + nh)} H${r1(nx)} Z`,
        cls: "dg-note",
      });
      out.rules.push({
        d: `M${r1(nx + nw - fold)} ${r1(ny)} V${r1(ny + fold)} H${r1(nx + nw)}`,
        cls: "dg-line dg-st-warn",
      });
      out.texts.push(
        ...textBlock(
          s.note,
          SMALL,
          nx + 12,
          ny + 7,
          "dg-t dg-t--note",
          "start",
        ),
      );
    }
  }
  return {
    W,
    H,
    prims: out,
    steps: steps.map((s) => ({
      from: s.a.lab.join(" "),
      to: s.b.lab.join(" "),
      label: s.label,
      self: s.self,
      note: s.noteText,
    })),
  };
}
