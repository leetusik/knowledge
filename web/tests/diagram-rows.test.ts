import { describe, expect, it } from "vitest";

import { buildChart, fmt, niceTicks } from "../src/lib/native/diagram-rows";
import { layoutSequence } from "../src/lib/native/diagram-sequence";

// P30.S18: the chart's scale and interval geometry (the very-core math; never the look).
describe("chart scale", () => {
  it("rounds the axis out to about five round ticks", () => {
    expect(niceTicks(0, 97)).toEqual([0, 20, 40, 60, 80, 100]);
    expect(niceTicks(-3, 8)).toEqual([-5, -2.5, 0, 2.5, 5, 7.5, 10]);
  });

  it("starts bars at zero and puts a value at its share of the plot", () => {
    const m = buildChart({
      chart: "bar",
      x: { label: "Day", categories: ["a", "b"] },
      y: { label: "ms" },
      series: [{ name: "p50", values: [50, 100] }],
    });
    expect(m.ticks.map((t) => t.label)).toEqual([
      "0",
      "20",
      "40",
      "60",
      "80",
      "100",
    ]);
    const [a, b] = m.cats.map((c) => c.bars[0]);
    expect(a.h).toBe(50);
    expect(b.h).toBe(100);
    expect(a.b).toBe(0);
  });

  it("hangs a negative bar from the zero line", () => {
    const m = buildChart({
      chart: "bar",
      x: { label: "Q", categories: ["a", "b"] },
      y: { label: "delta" },
      series: [{ name: "s", values: [-10, 30] }],
    });
    expect(m.zero).not.toBeNull();
    const neg = m.cats[0].bars[0];
    const pos = m.cats[1].bars[0];
    expect(neg.neg).toBe(true);
    // both bars start at the zero line or below it, and the negative one ends there
    expect(neg.b + neg.h).toBeCloseTo(m.zero ?? -1, 0);
    expect(pos.b).toBeCloseTo(m.zero ?? -1, 0);
    expect(fmt(-10)).toBe("−10");
    expect(fmt(1250)).toBe("1,250");
  });

  it("lays an interval from low to high with its median inside", () => {
    const m = buildChart({
      chart: "interval",
      x: { label: "Task", categories: ["x"] },
      y: { label: "ms", min: 0, max: 100 },
      series: [{ name: "s", values: [[20, 40, 80]] }],
    });
    const r = m.rows[0].ranges[0];
    expect(r.l).toBe(20);
    expect(r.w).toBe(60);
    // the median sits at (40 - 20) / (80 - 20) of the band
    expect(r.mid).toBeCloseTo(33.3, 1);
    expect(r.text).toBe("20–80 · median 40");
    expect(m.table.rows[0].cells[0]).toBe("20–80, median 40");
  });

  it("is deterministic, and a sequence gives the same geometry for the same source", () => {
    const spec = {
      actors: [
        { id: "a", label: "Browser" },
        { id: "b", label: "API" },
      ],
      steps: [
        { from: "a", to: "b", label: "POST /login" },
        { from: "b", to: "b", label: "check", note: "bcrypt" },
        { from: "b", to: "a", label: "200", style: "dashed" },
      ],
    };
    const one = layoutSequence(spec);
    const two = layoutSequence(structuredClone(spec));
    expect(JSON.stringify(two.prims)).toBe(JSON.stringify(one.prims));
    expect(one.steps.map((s) => s.self)).toEqual([false, true, false]);
  });
});
