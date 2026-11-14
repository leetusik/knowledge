import { describe, expect, it } from "vitest";

import { rawJson } from "@/app/(app)/feedback/feedback-fields";

// The Feedback detail shows each free-form JSON blob as indented text, and hides
// an empty one.
describe("rawJson", () => {
  it("indents an object and an array", () => {
    expect(rawJson({ a: 1, b: ["x"] })).toBe(
      '{\n  "a": 1,\n  "b": [\n    "x"\n  ]\n}',
    );
    expect(rawJson([{ role: "user" }])).toBe(
      '[\n  {\n    "role": "user"\n  }\n]',
    );
  });

  it("hides null, {} and []", () => {
    expect(rawJson(null)).toBeNull();
    expect(rawJson({})).toBeNull();
    expect(rawJson([])).toBeNull();
  });
});
