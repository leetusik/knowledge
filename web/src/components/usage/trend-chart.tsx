import type { ReactNode } from "react";

import { LineChart } from "lucide-react";

// P12.S3 — the 30-day search-volume trend as a SERVER-rendered inline SVG (no client
// JS): a teal line over a baseline-anchored area fill (the `--kb-trend-*` gradient),
// a faint hairline grid, and an emphasized teal endpoint. The geometry is a faithful
// port of the design's drawing spec `web/design/canvas/components/console/
// console-trend.js` — the exact same constants, min/max/span scaling, `M/L` line
// path, area path, 4 grid lines, and endpoint circle — emitting the same `.kb-trend*`
// class hooks so it re-themes with the scheme. `preserveAspectRatio="none"` lets it
// stretch fluidly to any width.
//
// A11y (ported from vocky's TrendChart): `role="img"` + `aria-label`, plus an
// `sr-only` sentence summarizing total / peak / range so a screen reader gets the
// shape rather than an unlabeled path.

// Drawing constants — identical to console-trend.js (do not retune).
const W = 600;
const H = 160;
const PT = 12;
const PB = 24;
const PX = 6;
const GRID = 3;

export interface TrendGeometry {
  /** The `M…L…` line path. */
  line: string;
  /** The baseline-anchored area path (filled with the gradient). */
  area: string;
  /** The `y` of each of the `GRID + 1` grid lines (as `toFixed(1)` strings). */
  gridYs: string[];
  /** The emphasized endpoint (as `toFixed(1)` strings). */
  point: { cx: string; cy: string };
}

/**
 * Compute the SVG geometry for a series, mirroring `console-trend.js` byte-for-byte
 * (same rounding + path construction). Exported so the port can be locked by a unit
 * test. Returns `null` for an empty series (the component renders the empty state).
 */
export function trendGeometry(series: number[]): TrendGeometry | null {
  if (series.length === 0) return null;

  const min = Math.min(...series);
  const max = Math.max(...series);
  const span = max - min || 1;
  const innerW = W - PX * 2;
  const innerH = H - PT - PB;
  const n = series.length;
  const baseline = PT + innerH;

  const xy = series.map((v, i) => {
    const x = PX + (n === 1 ? innerW / 2 : (i / (n - 1)) * innerW);
    const y = PT + innerH - ((v - min) / span) * innerH;
    return [x, y] as const;
  });

  const line = xy
    .map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)} ${p[1].toFixed(1)}`)
    .join(" ");

  const area =
    `M${PX} ${baseline.toFixed(1)} ` +
    xy.map((p) => `L${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(" ") +
    ` L${(PX + innerW).toFixed(1)} ${baseline.toFixed(1)} Z`;

  const gridYs: string[] = [];
  for (let g = 0; g <= GRID; g++) {
    gridYs.push((PT + (g / GRID) * innerH).toFixed(1));
  }

  const last = xy[xy.length - 1];
  return {
    line,
    area,
    gridYs,
    point: { cx: last[0].toFixed(1), cy: last[1].toFixed(1) },
  };
}

export interface TrendChartProps {
  /** The daily series to draw, e.g. `daily_counts.map(d => d.searches)`. */
  series: number[];
  /** Accessible name + sr-only summary prefix. */
  ariaLabel: string;
  /** Shown (as a `.kb-empty` state) when the series is empty. */
  empty: ReactNode;
}

const GRADIENT_ID = "kb-trend-fill";
const INNER_W = W - PX * 2;

export function TrendChart({ series, ariaLabel, empty }: TrendChartProps) {
  const geometry = trendGeometry(series);

  if (geometry === null) {
    return (
      <div className="kb-empty h-full justify-center !py-0">
        <span className="text-[var(--kb-hint)]">
          <LineChart size={22} aria-hidden />
        </span>
        <p className="kb-empty__sub">{empty}</p>
      </div>
    );
  }

  const total = series.reduce((sum, v) => sum + v, 0);
  const peak = Math.max(...series);
  const n = series.length;
  const summary = `${ariaLabel}: ${total.toLocaleString("en-US")} total across ${n} ${
    n === 1 ? "day" : "days"
  }, peak ${peak.toLocaleString("en-US")}.`;

  return (
    <>
      <p className="sr-only">{summary}</p>
      <svg
        className="kb-trend"
        style={{ width: "100%", height: "100%", display: "block" }}
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        role="img"
        aria-label={ariaLabel}
      >
        <defs>
          <linearGradient id={GRADIENT_ID} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="var(--kb-trend-fill-from)" />
            <stop offset="1" stopColor="var(--kb-trend-fill-to)" />
          </linearGradient>
        </defs>
        {geometry.gridYs.map((gy, i) => (
          <line
            key={i}
            className="kb-trend__grid"
            x1={PX}
            y1={gy}
            x2={PX + INNER_W}
            y2={gy}
          />
        ))}
        <path
          className="kb-trend__area"
          d={geometry.area}
          fill={`url(#${GRADIENT_ID})`}
        />
        <path className="kb-trend__line" d={geometry.line} />
        <circle
          className="kb-trend__point"
          cx={geometry.point.cx}
          cy={geometry.point.cy}
          r={3.5}
        />
      </svg>
    </>
  );
}
