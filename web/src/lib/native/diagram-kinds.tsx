/**
 * The drawings of the six diagram kinds and their text alternatives (P30.S18; `03-diagrams` round 01).
 *
 * Flow and state are laid out by `diagram-layout.ts` (S17); sequence by `diagram-sequence.ts`; all three draw as one
 * SVG. Stack, timeline and chart are HTML in `em` of the figure's font size (`diagram-rows.ts` computes their
 * numbers), so they grow with the text size and re-flow with the column. Every element and attribute is written
 * here, and the only inline `style` values are numbers this code computed, set as `--dg-*` custom properties that
 * the stylesheet turns into positions: an author's string reaches the page only as a React text child, escaped.
 * Pure: it runs wherever the renderer runs (the server), and ships nothing to the client.
 */

import { Fragment, type CSSProperties, type ReactNode } from "react";

import { CHAPTER } from "@/content";

import { Drawing, graphAlt, layoutFor } from "./diagram-draw";
import {
  buildChart,
  buildStack,
  buildTimeline,
  fmt,
  type ChartModel,
  type StackModel,
  type TimelineModel,
} from "./diagram-rows";
import { layoutSequence, type SeqLayout } from "./diagram-sequence";

type Rec = Record<string, unknown>;
const isRec = (v: unknown): v is Rec =>
  typeof v === "object" && v !== null && !Array.isArray(v);
const str = (v: unknown): string | null => (typeof v === "string" ? v : null);
const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
const recs = (v: unknown): Rec[] => arr(v).filter(isRec);

export type DiagramKind =
  "flow" | "state" | "sequence" | "stack" | "timeline" | "chart";
const KINDS: readonly string[] = [
  "flow",
  "state",
  "sequence",
  "stack",
  "timeline",
  "chart",
];
/** An unknown kind draws as a flow (the signed fallback; ingest refuses it first). */
export const kindOf = (d: Rec): DiagramKind =>
  KINDS.includes(str(d.kind) ?? "") ? (d.kind as DiagramKind) : "flow";

/** Numbers only, as custom properties: `style={vars({ l: 12.3 })}` is `--dg-l:12.3`. */
const vars = (v: Record<string, number | null | undefined>): CSSProperties => {
  const out: Record<string, number> = {};
  for (const k of Object.keys(v)) {
    const n = v[k];
    if (typeof n === "number" && Number.isFinite(n))
      out[`--dg-${k}`] = Math.round(n * 10) / 10;
  }
  return out as CSSProperties;
};
const cx = (...c: (string | false | null | undefined)[]): string =>
  c.filter(Boolean).join(" ");

// --- sequence ----------------------------------------------------------------------

function seqSpec(d: Rec) {
  return {
    actors: recs(d.actors).map((a) => ({
      id: str(a.id) ?? "",
      label: str(a.label) ?? "",
    })),
    steps: recs(d.steps).map((s) => ({
      from: str(s.from) ?? "",
      to: str(s.to) ?? "",
      label: str(s.label) ?? "",
      style: str(s.style),
      note: str(s.note),
      tone: str(s.tone),
    })),
  };
}

function seqAlt(L: SeqLayout): string[] {
  const A = CHAPTER.diagram.alt;
  return L.steps.map(
    (s) =>
      (s.self ? A.stepSelf(s.from, s.label) : A.step(s.from, s.to, s.label)) +
      (s.note ? A.stepNote(s.note) : ""),
  );
}

// --- stack -------------------------------------------------------------------------

function Items({ items }: { items: StackModel["layers"][number]["items"] }) {
  if (!items.length) return null;
  return (
    <ul className="dgs__items">
      {items.map((it, i) => (
        <li key={i} lang={it.lang}>
          {it.t}
        </li>
      ))}
    </ul>
  );
}

function Stack({ m }: { m: StackModel }): ReactNode {
  if (!m.nested)
    return (
      <ol className="dgs">
        {m.layers.map((l, i) => (
          <li key={i} className={`dgs__layer dg-tone-${l.tone}`}>
            <p className="dgs__label" lang={l.lang}>
              {l.label}
            </p>
            <Items items={l.items} />
          </li>
        ))}
      </ol>
    );
  const N = m.layers.length;
  return (
    <ol className="dgs dgs--nested" style={vars({ n: N })}>
      {m.layers.map((l, k) => (
        <li
          key={`b${k}`}
          className={cx(
            "dgs__layer dgs__box",
            `dg-tone-${l.tone}`,
            l.lift && "dgs__box--lift",
          )}
          style={vars({
            ra: k + 1,
            rb: 2 * N + 1 - k,
            ca: k + 1,
            cb: 2 * N + 2 - k,
          })}
          aria-hidden="true"
        />
      ))}
      {m.layers.map((l, k) => (
        <li
          key={`h${k}`}
          className="dgs__head"
          style={vars({ ra: k + 1, ca: k + 2, cb: 2 * N + 1 - k })}
        >
          <p className="dgs__label" lang={l.lang}>
            {l.inside !== null ? (
              <span className="dg__sr">
                <span>{CHAPTER.diagram.alt.inside(l.inside)}</span>
              </span>
            ) : null}
            {l.label}
          </p>
          <Items items={l.items} />
        </li>
      ))}
    </ol>
  );
}

// --- timeline ----------------------------------------------------------------------

function Timeline({ m }: { m: TimelineModel }): ReactNode {
  return (
    <div className="dgt" style={vars({ lab: m.lab })} aria-hidden="true">
      <div className="dgt__lanes">
        {m.lanes.map((ln, li) => (
          <div key={li} className="dgt__lane">
            <p className="dgt__name" lang={ln.lang}>
              {ln.label}
            </p>
            <div className="dgt__track">
              <div className="dgt__grid">
                {m.ticks.map((t, i) => (
                  <span
                    key={i}
                    className="dgt__gl"
                    style={vars({ l: t.pct })}
                  />
                ))}
              </div>
              {ln.mrows.map((row, ri) => (
                <div key={`m${ri}`} className="dgt__mrow">
                  {row.map((mk, i) => (
                    <Fragment key={i}>
                      <span className="dgt__mark" style={vars({ l: mk.p })}>
                        <span className="dgt__mline" />
                        <span className="dgt__mdot" />
                      </span>
                      <span
                        className={cx("dgt__mlab", mk.end && "is-end")}
                        style={mk.end ? vars({ r: mk.r }) : vars({ l: mk.p })}
                        lang={mk.lang}
                      >
                        {mk.label}
                      </span>
                    </Fragment>
                  ))}
                </div>
              ))}
              {ln.rows.map((row, ri) => (
                <div key={`r${ri}`} className="dgt__row">
                  {row.map((b, i) => (
                    <Fragment key={i}>
                      <span
                        className={`dgt__bar dg-tone-${b.tone}`}
                        style={vars({ l: b.a, w: b.w })}
                      />
                      {b.label ? (
                        <span
                          className={cx("dgt__blab", b.end && "is-end")}
                          style={b.end ? vars({ r: b.r }) : vars({ l: b.a })}
                          lang={b.lang}
                        >
                          {b.label}
                        </span>
                      ) : null}
                    </Fragment>
                  ))}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="dgt__foot">
        <div className="dgt__axis">
          {m.ticks.map((t, i) => (
            <span
              key={i}
              className={cx(
                "dgt__tick",
                t.first && "is-first",
                t.last && !t.first && "is-last",
                t.minor && "is-minor",
              )}
              style={vars({ l: t.pct })}
            >
              {t.label}
            </span>
          ))}
        </div>
        {m.hasUnit ? <p className="dgt__unit">{m.unit}</p> : null}
      </div>
    </div>
  );
}

function timelineAlt(m: TimelineModel): string[] {
  const A = CHAPTER.diagram.alt;
  return m.lanes.map((l) => {
    const bars = l.rows.flatMap((row) =>
      row.map((b) => A.barSpan(b.label, fmt(b.from), fmt(b.to), m.unit)),
    );
    const marks = l.marks.map((mk) => A.markAt(mk.label, fmt(mk.at), m.unit));
    return A.lane(
      l.label,
      bars.length ? bars.join("; ") : A.noBars,
      marks.length ? A.laneMarks(marks.join("; ")) : "",
    );
  });
}

// --- chart -------------------------------------------------------------------------

function Legend({ m }: { m: ChartModel }): ReactNode {
  if (!m.hasLegend) return null;
  return (
    <ul className="dgc__legend">
      {m.series.map((s, i) => (
        <li key={i}>
          {m.type === "line" ? (
            <svg
              className="dgc-swl"
              viewBox="0 0 24 10"
              aria-hidden="true"
              focusable="false"
            >
              <line
                className={`dg-st-${s.tone} dg-dash-${s.pat}`}
                x1="0"
                y1="5"
                x2="24"
                y2="5"
              />
            </svg>
          ) : (
            <span className={`dgc-sw dgc-pat-${s.pat} dg-tone-${s.tone}`} />
          )}
          <span lang={s.lang}>{s.name}</span>
        </li>
      ))}
    </ul>
  );
}

function YAxisTicks({ m }: { m: ChartModel }): ReactNode {
  return (
    <div className="dgc__yt">
      <div className="dgc__yt-sizer">{m.ywide}</div>
      {m.ticks.map((t, i) => (
        <span key={i} className="dgc__ytl" style={vars({ b: t.q })}>
          {t.label}
        </span>
      ))}
    </div>
  );
}

function PlotGrid({ m }: { m: ChartModel }): ReactNode {
  return (
    <>
      {m.ticks.map((t, i) => (
        <span key={i} className="dgc-grid" style={vars({ b: t.q })} />
      ))}
      {m.zero !== null ? (
        <span className="dgc-zero" style={vars({ b: m.zero })} />
      ) : null}
    </>
  );
}

function RuleLines({ m }: { m: ChartModel }): ReactNode {
  return (
    <>
      {m.rules.map((r, i) => (
        <span key={i} className="dgc-rule" style={vars({ b: r.q })} />
      ))}
    </>
  );
}

function VerticalBars({ m }: { m: ChartModel }): ReactNode {
  const one = m.series.length === 1;
  return (
    <div
      className={cx(
        "dgc dgc--v",
        m.neg && "dgc--neg",
        m.endW !== null && "dgc--endrules",
      )}
      style={vars({ mw: m.minW, ew: m.endW })}
      aria-hidden="true"
    >
      <Legend m={m} />
      {m.ylabel ? <p className="dgc__y">{m.ylabel}</p> : null}
      <div className="dgc__frame">
        <YAxisTicks m={m} />
        <div className="dgc__plot">
          <PlotGrid m={m} />
          <div className="dgc__cats" style={vars({ n: m.nCat })}>
            {m.cats.map((cat, ci) => (
              <div key={ci} className="dgc__cat">
                {cat.bars.map((b, bi) => (
                  <Fragment key={bi}>
                    <span
                      className={cx(
                        "dgc-bar",
                        `dgc-pat-${b.pat}`,
                        `dg-tone-${b.tone}`,
                        b.neg && "is-neg",
                      )}
                      style={vars({ l: b.l, w: b.w, b: b.b, h: b.h })}
                    />
                    {one ? (
                      <span
                        className={cx("dgc-val", b.neg && "is-neg")}
                        style={
                          b.neg
                            ? vars({ l: b.vl, t: b.vt })
                            : vars({ l: b.vl, b: b.vb })
                        }
                      >
                        {b.v}
                      </span>
                    ) : null}
                  </Fragment>
                ))}
              </div>
            ))}
          </div>
          <RuleLines m={m} />
          <div className="dgc__ends">
            {m.rules.map((r, i) => (
              <span
                key={i}
                className="dgc-end dgc-end--rule"
                style={vars({ b: Math.round(r.endQ * 10) / 10 })}
              >
                {r.label}
              </span>
            ))}
          </div>
        </div>
        <span />
        <div className="dgc__xl" style={vars({ n: m.nCat })}>
          {m.cats.map((cat, ci) => (
            <span key={ci} className="dgc__xlab" lang={cat.lang}>
              {cat.label}
            </span>
          ))}
        </div>
      </div>
      {m.xlabel ? <p className="dgc__x">{m.xlabel}</p> : null}
    </div>
  );
}

function Lines({ m }: { m: ChartModel }): ReactNode {
  return (
    <div
      className={cx("dgc dgc--line", m.neg && "dgc--neg")}
      style={vars({ mw: m.minW, ew: m.endW })}
      aria-hidden="true"
    >
      <Legend m={m} />
      {m.ylabel ? <p className="dgc__y">{m.ylabel}</p> : null}
      <div className="dgc__frame">
        <YAxisTicks m={m} />
        <div className="dgc__plot">
          <PlotGrid m={m} />
          <svg
            className="dgc__lineplot"
            viewBox="0 0 1000 1000"
            preserveAspectRatio="none"
            aria-hidden="true"
            focusable="false"
          >
            {m.lines.map((l, i) => (
              <polyline
                key={i}
                className={`dgc-line dg-st-${l.tone} dg-dash-${l.pat}`}
                points={l.pts}
              />
            ))}
          </svg>
          <RuleLines m={m} />
          <div className="dgc__ends">
            {m.lines.map((l, i) => (
              <span
                key={i}
                className={`dgc-end dg-ink-${l.tone}`}
                style={vars({ b: Math.round(l.endQ * 10) / 10 })}
                lang={l.lang}
              >
                {l.name}
              </span>
            ))}
            {m.rules.map((r, i) => (
              <span
                key={`r${i}`}
                className="dgc-end dgc-end--rule"
                style={vars({ b: Math.round(r.endQ * 10) / 10 })}
              >
                {r.label}
              </span>
            ))}
          </div>
        </div>
        <span />
        <div className="dgc__xt">
          {m.xticks.map((t, i) => (
            <span
              key={i}
              className={cx(
                "dgc-xt",
                t.first && "is-first",
                t.last && "is-last",
                t.minor && "is-minor",
              )}
              style={vars({ l: t.q })}
            >
              {t.label}
            </span>
          ))}
        </div>
      </div>
      {m.xlabel ? <p className="dgc__x">{m.xlabel}</p> : null}
    </div>
  );
}

function Rows({ m }: { m: ChartModel }): ReactNode {
  const interval = m.type === "interval";
  const head = m.xlabel !== "" || m.rules.length > 0;
  return (
    <div
      className={cx("dgc dgc--h", m.neg && "dgc--neg")}
      style={vars({ mw: m.minW, lab: m.lab })}
      aria-hidden="true"
    >
      <Legend m={m} />
      <div className="dgc__rows">
        {head ? (
          <div className="dgc__row dgc__row--head">
            <span className="dgc__rlab dgc__rlab--head">{m.xlabel}</span>
            <div className="dgc__track">
              <div className="dgc__heads">
                {m.rules.map((r, i) => (
                  <span
                    key={i}
                    className={cx("dgc-vhead", r.end && "is-end")}
                    style={r.end ? vars({ r: 100 - r.q }) : vars({ l: r.q })}
                  >
                    {r.label}
                  </span>
                ))}
              </div>
            </div>
          </div>
        ) : null}
        {m.rows.map((row, ri) => (
          <div key={ri} className="dgc__row">
            <span className="dgc__rlab" lang={row.lang}>
              {row.label}
            </span>
            <div className="dgc__track">
              <div className="dgc__trackin">
                <div className="dgc__hgrid">
                  {m.ticks.map((t, i) => (
                    <span
                      key={i}
                      className={cx(
                        "dgc__hgl",
                        t.zero && m.zero !== null && "is-zero",
                      )}
                      style={vars({ l: t.q })}
                    />
                  ))}
                  {m.rules.map((r, i) => (
                    <span
                      key={`r${i}`}
                      className="dgc-vrule"
                      style={vars({ l: r.q })}
                    />
                  ))}
                </div>
                {interval
                  ? row.ranges.map((b, i) => (
                      <Fragment key={i}>
                        <div className="dgc__hb">
                          <span
                            className={`dgc-range dgc-pat-${b.pat} dg-tone-${b.tone}`}
                            style={vars({ l: b.l, w: b.w })}
                          >
                            {b.mid !== null ? (
                              <span
                                className="dgc-mid"
                                style={vars({ l: b.mid })}
                              />
                            ) : null}
                          </span>
                        </div>
                        <p
                          className={cx("dgc-rtext", b.textRight && "is-r")}
                          style={
                            b.textRight
                              ? vars({ pr: b.pr })
                              : vars({ pl: b.pl })
                          }
                        >
                          {b.text}
                        </p>
                      </Fragment>
                    ))
                  : row.bars.map((b, i) => (
                      <div key={i} className="dgc__hb">
                        <span
                          className={cx(
                            "dgc-hbar",
                            `dgc-pat-${b.pat}`,
                            `dg-tone-${b.tone}`,
                            b.neg && "is-neg",
                          )}
                          style={vars({ l: b.l, w: b.w })}
                        />
                        <span
                          className={cx("dgc-hval", b.neg && "is-neg")}
                          style={b.neg ? vars({ r: b.vr }) : vars({ l: b.vl })}
                        >
                          {b.v}
                        </span>
                      </div>
                    ))}
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="dgc__hfoot">
        <div className="dgc__haxis">
          {m.ticks.map((t, i) => (
            <span
              key={i}
              className={cx(
                "dgt__tick",
                t.q < 0.5 && "is-first",
                t.q > 99.5 && "is-last",
                m.ticks.length > 6 && i % 2 === 1 && "is-minor",
              )}
              style={vars({ l: t.q })}
            >
              {t.label}
            </span>
          ))}
        </div>
        {m.ylabel ? <p className="dgc__x">{m.ylabel}</p> : null}
      </div>
    </div>
  );
}

function Chart({ m }: { m: ChartModel }): ReactNode {
  if (m.horizontal) return <Rows m={m} />;
  if (m.type === "line") return <Lines m={m} />;
  return <VerticalBars m={m} />;
}

/** The chart's data, as a visually hidden table (build prompt "The text alternative"). */
function ChartTable({ m }: { m: ChartModel }): ReactNode {
  const t = m.table;
  return (
    <div className="dg__sr">
      <table>
        <caption>{t.caption}</caption>
        <thead>
          <tr>
            <th scope="col">{t.first}</th>
            {t.head.map((h, i) => (
              <th key={i} scope="col" lang={h.lang}>
                {h.v}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {t.rows.map((r, i) => (
            <tr key={i}>
              <th scope="row" lang={r.lang}>
                {r.k}
              </th>
              {r.cells.map((c, j) => (
                <td key={j}>{c}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// --- the entry point ---------------------------------------------------------------

/**
 * A diagram's drawing and its text alternative. `text` wraps an author string for the page (its Hangul runs in a
 * `lang="ko"` span); `alt` is already a node (a list, or the chart's table), or null when the drawing is itself real
 * text (a stack).
 */
export function diagramParts(
  d: Rec,
  kind: DiagramKind,
  text: (s: string) => ReactNode,
  lead: string,
): { drawing: ReactNode; alt: ReactNode } {
  const list = (lines: string[], ordered: boolean): ReactNode =>
    lines.length ? (
      <div className="dg__sr">
        <p>{lead}</p>
        {ordered ? (
          <ol>
            {lines.map((l, i) => (
              <li key={i}>{text(l)}</li>
            ))}
          </ol>
        ) : (
          <ul>
            {lines.map((l, i) => (
              <li key={i}>{text(l)}</li>
            ))}
          </ul>
        )}
      </div>
    ) : null;
  switch (kind) {
    case "sequence": {
      const L = layoutSequence(seqSpec(d));
      return { drawing: <Drawing layout={L} />, alt: list(seqAlt(L), true) };
    }
    case "stack":
      return { drawing: <Stack m={buildStack(d)} />, alt: null };
    case "timeline": {
      const m = buildTimeline(d);
      return { drawing: <Timeline m={m} />, alt: list(timelineAlt(m), false) };
    }
    case "chart": {
      const m = buildChart(d);
      return { drawing: <Chart m={m} />, alt: <ChartTable m={m} /> };
    }
    default: {
      const L = layoutFor(d, kind);
      return {
        drawing: <Drawing layout={L} />,
        alt: list(graphAlt(L, d), false),
      };
    }
  }
}
