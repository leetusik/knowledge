import { readdirSync, readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { formatErrors } from "@/lib/native/errors";
import { parseChapter } from "@/lib/native/parse";
import { formatSections, sections } from "@/lib/native/project";

// P30.S12 — core test 4, the TS half: the shared conformance fixtures in
// `tests/fixtures/native/` (the Python half is `tests/test_native_format.py`).
// Every accept case must build exactly the tree Python built (`.json`) and the
// per-block projection the stored annotation offsets are measured against
// (`.txt`, byte for byte); every reject case must be refused at exactly the
// lines and codes Python refuses it (`.err`).

const FIXTURES = fileURLToPath(
  new URL("../../tests/fixtures/native/", import.meta.url),
);
const CASES = readdirSync(FIXTURES)
  .filter((name) => name.endsWith(".md"))
  .map((name) => name.slice(0, -3))
  .sort();

const read = (name: string) => readFileSync(`${FIXTURES}${name}`, "utf8");

describe("native conformance fixtures (core test 4)", () => {
  it("finds the fixture set", () => {
    expect(CASES.length).toBeGreaterThanOrEqual(24);
  });

  for (const name of CASES) {
    const expectsError = existsSync(`${FIXTURES}${name}.err`);
    it(`${name}: ${expectsError ? "refused where Python refuses it" : "same tree and projection"}`, () => {
      const result = parseChapter(read(`${name}.md`));
      if (expectsError) {
        expect(result.violations.length).toBeGreaterThan(0);
        expect(formatErrors(result.violations)).toBe(read(`${name}.err`));
        return;
      }
      expect(result.violations).toEqual([]);
      expect(result.tree).toEqual(JSON.parse(read(`${name}.json`)));
      expect(formatSections(sections(result.tree))).toBe(read(`${name}.txt`));
    });
  }
});
