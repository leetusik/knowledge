import { describe, expect, it } from "vitest";

import { layoutGraph, type GraphSpec } from "../src/lib/native/diagram-layout";
import { measure, wrapBalanced, LABEL } from "../src/lib/native/diagram-text";

// P30.S17: the layout is deterministic: the same source always gives the same geometry (the very-core rule).
const SPEC: GraphSpec = {
  direction: "right",
  nodes: [
    { id: "a", label: "Client", shape: "pill", at: [0, 0] },
    { id: "b", label: "API gateway", sub: "FastAPI", at: [0, 1] },
    { id: "c", label: "저장소", shape: "store", at: [1, 2], tone: "store" },
    { id: "d", label: "Worker", at: [0, 2] },
  ],
  groups: [{ id: "g", label: "Edge", nodes: ["a", "b"] }],
  edges: [
    { from: "a", to: "b", label: "request" },
    { from: "b", to: "c", label: "한국어 라벨", style: "dashed" },
    { from: "b", to: "d" },
    { from: "d", to: "d", label: "retry" },
    { from: "c", to: "a", tone: "bad" },
  ],
};

describe("diagram layout", () => {
  it("gives the same geometry for the same source", () => {
    const one = layoutGraph(SPEC, "flow");
    const two = layoutGraph(structuredClone(SPEC), "flow");
    expect(JSON.stringify(two.prims)).toBe(JSON.stringify(one.prims));
    expect([two.W, two.H]).toEqual([one.W, one.H]);
    expect(one.W).toBeGreaterThan(200);
    expect(one.H).toBeGreaterThan(100);
  });

  it("never cuts a label: a long Hangul word moves whole, and the node grows to hold it", () => {
    const word = "가나다라마바사아자차카타파하".repeat(2);
    const lines = wrapBalanced(`앞 ${word}`, LABEL, 132);
    expect(lines.some((l) => l.includes(word))).toBe(true);
    expect(measure(word, LABEL)).toBeGreaterThan(132);
  });
});
