import { describe, expect, it } from "vitest";

import { trendGeometry } from "@/components/usage/trend-chart";

// P12.S3 — the dashboard TrendChart is a faithful port of the design's drawing spec
// `web/design/canvas/components/console/console-trend.js`. This locks the geometry
// against hand-computed values from that spec's exact algorithm (constants W=600
// H=160 PT=12 PB=24 PX=6 GRID=3): innerW=588, innerH=124, baseline=136.

describe("trendGeometry", () => {
  it("reproduces console-trend.js paths for a two-point series", () => {
    // series [0, 10]: min 0, max 10, span 10. Point 0 → (6, 136); point 1 (last) →
    // x = 6 + 588 = 594, y = 12 + 124 − (10/10)*124 = 12.
    const geo = trendGeometry([0, 10]);
    expect(geo).not.toBeNull();
    expect(geo!.line).toBe("M6.0 136.0 L594.0 12.0");
    expect(geo!.area).toBe("M6 136.0 L6.0 136.0 L594.0 12.0 L594.0 136.0 Z");
    // 4 grid lines (g = 0..3): y = 12 + (g/3)*124.
    expect(geo!.gridYs).toEqual(["12.0", "53.3", "94.7", "136.0"]);
    expect(geo!.point).toEqual({ cx: "594.0", cy: "12.0" });
  });

  it("centers a single point and flat-lines a constant series (span→1)", () => {
    // n===1 → x centered at PX + innerW/2 = 6 + 294 = 300; (v−min)/span with span=1
    // and v===min → y at the baseline 136.
    expect(trendGeometry([42])!.point).toEqual({ cx: "300.0", cy: "136.0" });
    // A constant series has span 0 → floored to 1, so every point sits on baseline.
    expect(trendGeometry([5, 5, 5])!.line).toBe("M6.0 136.0 L300.0 136.0 L594.0 136.0");
  });

  it("returns null for an empty series (the component renders the empty state)", () => {
    expect(trendGeometry([])).toBeNull();
  });
});
