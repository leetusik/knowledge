/**
 * The row kinds' numbers (P30.S18; `03-diagrams` round 01, build prompt "Stack", "Timeline", "Chart" and "Size").
 *
 * A port of the signed canvas's `dgrows.js` (`buildStack`, `buildTimeline`, `buildChart`): which layer is lifted,
 * where each timeline bar and mark sits and in which row, the chart's y range and round ticks, where each bar, line
 * point and interval lies as a percentage of its plot, which end labels are pushed apart, and the data table that
 * stands in for the drawing. Plain numbers and strings out; `diagram-kinds.tsx` turns them into HTML. Pure: no DOM, no
 * React, no I/O. Text widths are the faces' advance widths (`diagram-text.ts`), so the same source always gives the
 * same numbers.
 */

import { CHAPTER } from "@/content";

import { r1, TONES } from "./diagram-layout";
import { isKo, measure, SMALL, SMALL_B } from "./diagram-text";

type Rec = Record<string, unknown>;
const isRec = (v: unknown): v is Rec =>
  typeof v === "object" && v !== null && !Array.isArray(v);
const str = (v: unknown): string | null => (typeof v === "string" ? v : null);
const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
const recs = (v: unknown): Rec[] => arr(v).filter(isRec);
const finite = (n: number): number => (Number.isFinite(n) ? n : 0);
const rr = (n: number): number => r1(finite(n));

/** A tone, or `fallback` (a chart series falls back to `series-<n>` by its position). */
export function toneOr(t: unknown, fallback: string = "default"): string {
  return typeof t === "string" && TONES.includes(t) ? t : fallback;
}
/** Hangul text carries `lang="ko"`, so it takes keep-all and the Hangul face. */
export const langOf = (t: string): "ko" | undefined =>
  isKo(t) ? "ko" : undefined;

/** A value as drawn: a minus is U+2212, thousands take a comma, other values keep one decimal at most. */
export function fmt(v: unknown): string {
  if (v === null || v === undefined || typeof v === "boolean") return "";
  const n = Number(v);
  if (!Number.isFinite(n)) return "";
  const s =
    Math.abs(n) >= 1000
      ? Math.round(n).toLocaleString("en-US")
      : String(Math.round(n * 10) / 10);
  return s.replace("-", "−");
}

function niceStep(span: number, count: number): number {
  const raw = span / Math.max(1, count);
  const p = Math.pow(10, Math.floor(Math.log10(raw)));
  const n = raw / p;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * p;
}
/** About `count` round ticks that cover `[lo, hi]`. */
export function niceTicks(lo: number, hi: number, count: number = 5): number[] {
  if (!(hi > lo)) hi = lo + 1;
  const st = niceStep(hi - lo, count);
  const a = Math.floor(lo / st) * st;
  const b = Math.ceil(hi / st) * st;
  const out: number[] = [];
  for (let v = a; v <= b + st / 1e6; v += st) out.push(Math.round(v / st) * st);
  return out;
}

/**
 * Labels at the plot's right end, by height (`endQ`, % of the plot): pushed apart top down so no two overlap (1.1em
 * at the default size is 7.5% of a 13em plot, so 9.5% leaves a gap), then pulled back inside the plot's height.
 */
export function nudge<T extends { endQ: number }>(list: T[]): void {
  const ends = list.slice().sort((a, b) => b.endQ - a.endQ);
  const gap = 9.5;
  for (let k = 1; k < ends.length; k++)
    if (ends[k - 1].endQ - ends[k].endQ < gap)
      ends[k].endQ = ends[k - 1].endQ - gap;
  const low = ends.length ? ends[ends.length - 1].endQ : 0;
  if (low < 0) for (const e of ends) e.endQ -= low;
}

// --- stack -------------------------------------------------------------------------

export interface StackLayer {
  label: string;
  lang: "ko" | undefined;
  tone: string;
  items: { t: string; lang: "ko" | undefined }[];
  /** A muted layer inside a layer of a hue tone draws its border in the default line. */
  lift: boolean;
  /** Nested only: the outer layer's name, for the visually hidden "Inside {outer}: ". */
  inside: string | null;
}
export interface StackModel {
  layers: StackLayer[];
  nested: boolean;
}

export function buildStack(d: Rec): StackModel {
  const nested = d.nested === true;
  const layers: StackLayer[] = recs(d.layers).map((l) => ({
    label: str(l.label) ?? "",
    lang: langOf(str(l.label) ?? ""),
    tone: toneOr(l.tone),
    items: arr(l.items)
      .filter((x): x is string => typeof x === "string")
      .map((t) => ({ t, lang: langOf(t) })),
    lift: false,
    inside: null,
  }));
  layers.forEach((l, k) => {
    // nested, a layer sits on its parent's tint; a muted layer inside a coloured one draws its border in the default
    // line, because the muted line measures under 3:1 on a coloured tint in dark and sepia
    const parent = nested && k > 0 ? layers[k - 1].tone : null;
    l.lift =
      l.tone === "muted" &&
      parent !== null &&
      parent !== "default" &&
      parent !== "muted";
    l.inside = nested && k > 0 ? layers[k - 1].label : null;
  });
  return { layers, nested };
}

// --- timeline ----------------------------------------------------------------------

/** The track's width at the timeline's narrowest (its minimum width), px at the default size. */
const TL_MIN_TRACK = 280;

export interface TlBar {
  from: number;
  to: number;
  label: string;
  lang: "ko" | undefined;
  tone: string;
  /** Start and width, % of the axis. */
  a: number;
  w: number;
  /** The label ends at the bar's end instead of starting at its start. */
  end: boolean;
  /** Distance of the bar's end from the axis end, % (for an `end` label). */
  r: number;
  x0: number;
  x1: number;
}
export interface TlMark {
  at: number;
  label: string;
  lang: "ko" | undefined;
  p: number;
  end: boolean;
  r: number;
  x0: number;
  x1: number;
}
export interface TlLane {
  label: string;
  lang: "ko" | undefined;
  rows: TlBar[][];
  mrows: TlMark[][];
  /** Bars in reading order (row by row) and marks, for the text alternative. */
  marks: TlMark[];
}
export interface TlTick {
  pct: number;
  label: string;
  first: boolean;
  last: boolean;
  minor: boolean;
}
export interface TimelineModel {
  ticks: TlTick[];
  lanes: TlLane[];
  unit: string;
  hasUnit: boolean;
  /** The lane-name column at the wide layout, em: as wide as the longest name, 5 to 9. */
  lab: number;
}

export function buildTimeline(d: Rec): TimelineModel {
  const ax = isRec(d.axis) ? d.axis : {};
  const lo = Number(typeof ax.from === "number" ? ax.from : 0);
  let hi = Number(typeof ax.to === "number" ? ax.to : 1);
  if (!(hi > lo)) hi = lo + 1;
  const span = hi - lo;
  const pct = (v: unknown): number =>
    finite(Math.max(0, Math.min(100, ((Number(v) - lo) / span) * 100)));
  const given = arr(ax.ticks).filter((v): v is number => typeof v === "number");
  const tickValues = given.length
    ? given
    : niceTicks(lo, hi, 6).filter((v) => v >= lo && v <= hi);
  const ticks: TlTick[] = tickValues.map((v, i, all) => {
    const p = pct(v);
    return {
      pct: rr(p),
      label: fmt(v),
      first: p < 0.5,
      last: p > 99.5,
      minor: i % 2 === 1 && all.length > 6,
    };
  });
  const lanes: TlLane[] = recs(d.lanes).map((ln, li) => {
    const bars: TlBar[] = recs(ln.bars).map((b) => {
      const a = pct(b.from);
      const z = pct(b.to);
      let tone = toneOr(b.tone, `series-${(li % 6) + 1}`);
      if (b.tone === null || b.tone === undefined) tone = "accent";
      const label = str(b.label) ?? "";
      const lw = label ? (measure(label, SMALL) / TL_MIN_TRACK) * 100 + 1.5 : 0;
      const end = label !== "" && a + lw > 100;
      return {
        from: Number(b.from),
        to: Number(b.to),
        label,
        lang: langOf(label),
        tone,
        a: rr(a),
        w: rr(z - a),
        end,
        r: rr(100 - z),
        x0: end ? Math.max(0, z - lw) : a,
        x1: end ? z : Math.max(z, a + lw),
      };
    });
    bars.sort((p, q) => p.x0 - q.x0);
    const rows: { end: number; bars: TlBar[] }[] = [];
    for (const b of bars) {
      let k = 0;
      while (rows[k] && rows[k].end > b.x0 - 1.5) k++;
      if (!rows[k]) rows[k] = { end: -10, bars: [] };
      rows[k].end = Math.max(rows[k].end, b.x1);
      rows[k].bars.push(b);
    }
    const marks: TlMark[] = recs(ln.marks).map((m) => {
      const p = pct(m.at);
      const label = str(m.label) ?? "";
      const lw = label ? (measure(label, SMALL) / TL_MIN_TRACK) * 100 + 3 : 2;
      const end = p + lw > 100;
      return {
        at: Number(m.at),
        label,
        lang: langOf(label),
        p: rr(p),
        end,
        r: rr(100 - p),
        x0: end ? p - lw : p,
        x1: end ? p : p + lw,
      };
    });
    const mrows: { end: number; marks: TlMark[] }[] = [];
    for (const m of marks.slice().sort((p, q) => p.x0 - q.x0)) {
      let k = 0;
      while (mrows[k] && mrows[k].end > m.x0 - 1) k++;
      if (!mrows[k]) mrows[k] = { end: -10, marks: [] };
      mrows[k].end = m.x1;
      mrows[k].marks.push(m);
    }
    const label = str(ln.label) ?? "";
    return {
      label,
      lang: langOf(label),
      rows: rows.map((r) => r.bars),
      mrows: mrows.map((r) => r.marks),
      marks: mrows.flatMap((r) => r.marks),
    };
  });
  const longest = lanes.reduce(
    (m, l) => Math.max(m, measure(l.label, SMALL_B)),
    0,
  );
  return {
    ticks,
    lanes,
    unit: str(ax.unit) ?? "",
    hasUnit: str(ax.unit) !== null,
    lab: r1(Math.max(5, Math.min(9, longest / 15 + 0.3))),
  };
}

// --- chart -------------------------------------------------------------------------

export type ChartType = "bar" | "line" | "interval";

export interface ChartSeries {
  name: string;
  lang: "ko" | undefined;
  tone: string;
  /** 1 to 6: the series' pattern (bars, swatches) and dash (lines), by position. */
  pat: number;
  values: unknown[];
}
export interface ChartTick {
  label: string;
  /** Position along the value axis, % of the plot. */
  q: number;
  zero: boolean;
}
export interface ChartRule {
  label: string;
  q: number;
  /** Where the label sits, % (pushed apart from the others at the plot's end). */
  endQ: number;
  /** Past 70% of the axis (rows): the label is right-aligned to the line. */
  end: boolean;
}
export interface VBar {
  v: string;
  l: number;
  w: number;
  b: number;
  h: number;
  neg: boolean;
  /** The value label: shown with one series only. */
  vl: number;
  vb: number;
  vt: number;
  tone: string;
  pat: number;
}
export interface HBar {
  v: string;
  l: number;
  w: number;
  /** The value label's offset: from the left (a positive value) or the right (a negative one), %. */
  vl: number;
  vr: number;
  neg: boolean;
  tone: string;
  pat: number;
}
export interface IBar {
  l: number;
  w: number;
  tone: string;
  pat: number;
  mid: number | null;
  text: string;
  name: string;
  /** The values text: left-offset, or (past 55%) right-aligned to the range's end. */
  textRight: boolean;
  pl: number;
  pr: number;
}
export interface ChartLine {
  pts: string;
  tone: string;
  pat: number;
  name: string;
  lang: "ko" | undefined;
  endQ: number;
}
export interface ChartModel {
  type: ChartType;
  vertical: boolean;
  horizontal: boolean;
  neg: boolean;
  series: ChartSeries[];
  hasLegend: boolean;
  ylabel: string;
  xlabel: string;
  ticks: ChartTick[];
  /** The y tick label that sets the column's width. */
  ywide: string;
  zero: number | null;
  rules: ChartRule[];
  /** The root's minimum width, em; the room kept past the plot for end names, em. */
  minW: number;
  endW: number | null;
  /** Horizontal rows: the category-name column, em. */
  lab: number;
  // vertical bars
  nCat: number;
  cats: { label: string; lang: "ko" | undefined; bars: VBar[] }[];
  // horizontal bars and intervals
  rows: {
    label: string;
    lang: "ko" | undefined;
    bars: HBar[];
    ranges: IBar[];
  }[];
  // lines
  lines: ChartLine[];
  xticks: {
    label: string;
    q: number;
    first: boolean;
    last: boolean;
    minor: boolean;
  }[];
  table: {
    caption: string;
    first: string;
    head: { v: string; lang: "ko" | undefined }[];
    rows: { k: string; lang: "ko" | undefined; cells: string[] }[];
  };
}

export function buildChart(d: Rec): ChartModel {
  const type: ChartType =
    d.chart === "line" || d.chart === "interval" ? d.chart : "bar";
  const x = isRec(d.x) ? d.x : {};
  const y = isRec(d.y) ? d.y : {};
  const series: ChartSeries[] = recs(d.series).map((s, i) => ({
    name: str(s.name) ?? "",
    lang: langOf(str(s.name) ?? ""),
    tone: toneOr(s.tone, `series-${(i % 6) + 1}`),
    pat: (i % 6) + 1,
    values: arr(s.values),
  }));
  const S = series.length;
  const cats = Array.isArray(x.categories)
    ? x.categories.map((c) => String(c))
    : null;
  const numeric = cats === null;
  const rawRules = recs(d.rules);
  const vals: number[] = [];
  for (const s of series)
    for (const v of s.values) {
      if (Array.isArray(v)) for (const u of v) vals.push(Number(u));
      else if (v !== null && v !== undefined) vals.push(Number(v));
    }
  for (const r of rawRules) vals.push(Number(r.at));
  const finiteVals = vals.filter((v) => Number.isFinite(v));
  let dmin = Math.min(0, ...finiteVals);
  let dmax = Math.max(0, ...finiteVals);
  if ((type === "line" || type === "interval") && finiteVals.length) {
    dmin = Math.min(...finiteVals);
    dmax = Math.max(...finiteVals);
  }
  const yMin = typeof y.min === "number" ? y.min : null;
  const yMax = typeof y.max === "number" ? y.max : null;
  let lo = yMin !== null ? yMin : type === "bar" ? Math.min(0, dmin) : dmin;
  let hi = yMax !== null ? yMax : dmax;
  let ticks = niceTicks(lo, hi, 5);
  if (yMin === null) lo = Math.min(lo, ticks[0]);
  else ticks = ticks.filter((v) => v >= lo);
  if (yMax === null) hi = Math.max(hi, ticks[ticks.length - 1]);
  else ticks = ticks.filter((v) => v <= hi);
  if (yMin === null) lo = ticks[0];
  if (yMax === null) hi = ticks[ticks.length - 1];
  const span = hi - lo || 1;
  const p = (v: unknown): number => finite(((Number(v) - lo) / span) * 100);
  const zero = lo < 0 && hi > 0 ? p(0) : null;
  const nCat = cats ? cats.length : 0;
  const longest = cats ? Math.max(0, ...cats.map((c) => measure(c, SMALL))) : 0;
  const horizontal =
    type === "interval" || (type === "bar" && (nCat > 7 || longest > 64));
  const ylabel = str(y.label) ?? "";
  const xlabel = str(x.label) ?? "";
  const m: ChartModel = {
    type,
    vertical: !horizontal && type === "bar",
    horizontal,
    neg: lo < 0,
    series,
    hasLegend: S > 1 || type === "line",
    ylabel,
    xlabel,
    ticks: ticks.map((v) => ({ label: fmt(v), q: rr(p(v)), zero: v === 0 })),
    ywide: "",
    zero,
    rules: rawRules.map((r) => {
      const q = p(r.at);
      return {
        label: str(r.label) ?? fmt(r.at),
        q: rr(q),
        endQ: q,
        end: q > 70,
      };
    }),
    minW: 0,
    endW: null,
    lab: 9,
    nCat,
    cats: [],
    rows: [],
    lines: [],
    xticks: [],
    table: { caption: "", first: "", head: [], rows: [] },
  };
  m.ywide = m.ticks.reduce(
    (w, t) => (t.label.length > w.length ? t.label : w),
    "",
  );

  if (type === "bar" && !horizontal) {
    m.cats = (cats ?? []).map((c, ci) => ({
      label: c,
      lang: langOf(c),
      bars: series.map((s, si) => {
        const v = Number(s.values[ci]);
        let a =
          zero !== null ? p(Math.min(0, v)) : p(Math.max(lo, Math.min(0, v)));
        let b = p(Math.max(0, v));
        if (zero === null) {
          a = 0;
          b = p(v);
        }
        const w = 100 / S;
        return {
          v: fmt(v),
          l: rr(si * w + 6 / S),
          w: rr(w - 12 / S),
          b: rr(a),
          h: rr(Math.max(0.6, b - a)),
          neg: v < 0,
          vl: rr(si * w + w / 2),
          vb: rr(b),
          vt: rr(100 - a),
          tone: s.tone,
          pat: s.pat,
        };
      }),
    }));
    // a rule's label sits past the plot's right edge, level with its line, so no bar ever covers it
    const rw = m.rules.reduce(
      (w, r) => Math.max(w, measure(r.label, SMALL_B)),
      0,
    );
    nudge(m.rules);
    m.minW = r1(
      Math.max(18, nCat * Math.max(1, S) * 1.5 + 3) + (rw ? rw / 15 + 0.9 : 0),
    );
    m.endW = rw ? r1((rw / 13) * 0.8667 + 0.9) : null;
  }
  if (type === "bar" && horizontal) {
    m.rows = (cats ?? []).map((c, ci) => ({
      label: c,
      lang: langOf(c),
      ranges: [],
      bars: series.map((s) => {
        const v = Number(s.values[ci]);
        const a = zero !== null ? p(Math.min(0, v)) : 0;
        const b = zero !== null ? p(Math.max(0, v)) : p(v);
        return {
          v: fmt(v),
          l: rr(a),
          w: rr(Math.max(0.4, b - a)),
          vl: rr(b),
          vr: rr(100 - a),
          neg: v < 0,
          tone: s.tone,
          pat: s.pat,
        };
      }),
    }));
  }
  if (type === "interval") {
    m.rows = (cats ?? []).map((c, ci) => ({
      label: c,
      lang: langOf(c),
      bars: [],
      ranges: series.map((s) => {
        const v = arr(s.values[ci]);
        const a = Number(v[0]);
        const b = Number(v[v.length - 1]);
        const mid = v.length === 3 ? Number(v[1]) : null;
        const pa = p(a);
        const pb = p(b);
        const w = Math.max(0.4, pb - pa);
        return {
          l: rr(pa),
          w: rr(w),
          tone: s.tone,
          pat: s.pat,
          mid: mid !== null ? rr(((p(mid) - pa) / w) * 100) : null,
          text: CHAPTER.diagram.chart.range(
            fmt(a),
            fmt(b),
            mid !== null ? fmt(mid) : null,
          ),
          name: s.name,
          textRight: pa > 55,
          pl: rr(pa),
          pr: rr(100 - pb),
        };
      }),
    }));
  }
  let xAt: ((i: number) => string) | null = null;
  if (type === "line") {
    let n = 0;
    for (const s of series) n = Math.max(n, s.values.length);
    const nx = isRec(x.numeric) ? x.numeric : x;
    let x0 = numeric && typeof nx.from === "number" ? nx.from : 1;
    let x1 = numeric && typeof nx.to === "number" ? nx.to : cats ? nCat : n;
    if (cats) {
      x0 = 0;
      x1 = Math.max(1, nCat - 1);
    }
    const xspan = x1 - x0 || 1;
    const px = (i: number): number =>
      finite(
        (((cats ? i : x0 + (i * (x1 - x0)) / Math.max(1, n - 1)) -
          (cats ? 0 : x0)) /
          xspan) *
          1000,
      );
    m.lines = series.map((s) => {
      const last = s.values[s.values.length - 1];
      return {
        pts: s.values
          .map((v, i) => `${r1(px(i))},${r1(1000 - p(v) * 10)}`)
          .join(" "),
        tone: s.tone,
        pat: s.pat,
        name: s.name,
        lang: s.lang,
        endQ: p(last),
      };
    });
    // end labels: each line's name and each rule's label past the plot's right edge, nudged apart so none overlaps
    nudge([...m.lines, ...m.rules]);
    let xt: { label: string; q: number }[];
    if (cats) {
      xt = cats.map((c, i) => ({ label: c, q: px(i) / 10 }));
    } else {
      const vs = niceTicks(x0, x1, 5).filter((v) => v >= x0 && v <= x1);
      // a numeric axis always names where it starts: the first value is a tick when the round ticks begin later
      if (vs.length && vs[0] > x0 && (vs[0] - x0) / xspan > 0.08)
        vs.unshift(x0);
      xt = vs.map((v) => ({ label: fmt(v), q: ((v - x0) / xspan) * 100 }));
      xAt = (i) => fmt(x0 + (i * (x1 - x0)) / Math.max(1, n - 1));
    }
    m.xticks = xt.map((t, i, all) => ({
      label: t.label,
      q: rr(t.q),
      first: t.q < 1,
      last: t.q > 99,
      minor: all.length > 6 && i % 2 === 1,
    }));
    const endW = [
      ...series.map((s) => s.name),
      ...m.rules.map((r) => r.label),
    ].reduce((w, t) => Math.max(w, measure(t, SMALL_B)), 0);
    m.minW = r1(18 + endW / 15);
    m.endW = r1((endW / 13) * 0.8667 + 0.9);
  }
  if (horizontal) {
    const lw = (cats ?? []).reduce((w, c) => Math.max(w, measure(c, SMALL)), 0);
    m.lab = r1(Math.max(5, Math.min(11, lw / 15 + 0.4)));
    // a bar chart re-flows down to its labels plus 6em of bar, never under 12em (a ~180 px figure-row item at size 3)
    m.minW = r1(Math.max(12, m.lab + 6));
  }
  // the chart's data, as a table for assistive technology
  const rowsN = cats
    ? nCat
    : Math.max(0, ...series.map((s) => s.values.length));
  const body: ChartModel["table"]["rows"] = [];
  for (let ri = 0; ri < rowsN; ri++) {
    const k = cats ? cats[ri] : xAt ? xAt(ri) : String(ri + 1);
    body.push({
      k,
      lang: langOf(k),
      cells: series.map((s) => {
        const v = s.values[ri];
        if (!Array.isArray(v)) return fmt(v);
        return v.length >= 3
          ? CHAPTER.diagram.chart.cell(
              fmt(v[0]),
              fmt(v[v.length - 1]),
              fmt(v[1]),
            )
          : v.map(fmt).join("–");
      }),
    });
  }
  m.table = {
    caption: xlabel
      ? CHAPTER.diagram.chart.by(ylabel || CHAPTER.diagram.chart.values, xlabel)
      : ylabel || CHAPTER.diagram.chart.values,
    first: cats ? xlabel : xlabel || CHAPTER.diagram.chart.point,
    head: series.map((s) => ({ v: s.name, lang: s.lang })),
    rows: body,
  };
  return m;
}
