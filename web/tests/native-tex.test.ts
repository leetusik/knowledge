import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { TEX_ALLOWLIST, validateTex } from "@/lib/native/tex";

// P39-hk.S7 — the TeX allowlist (R1 §4), core: `tex.ts`'s constant is the shared
// fixture `tests/fixtures/native/tex-allowlist.tsv` row for row (the Python twin
// asserts the same in `tests/test_native_tex.py`), and every row's sample passes
// the validator in its own context. That Temml renders every sample is S8's
// `native-math.test.ts`; the refusal codes are the conformance fixtures'.

const TSV = fileURLToPath(
  new URL("../../tests/fixtures/native/tex-allowlist.tsv", import.meta.url),
);

function rows(): string[][] {
  const lines = readFileSync(TSV, "utf8").split("\n");
  expect(lines[0]).toBe("command\tcontext\tarity\tsample");
  expect(lines[lines.length - 1]).toBe("");
  const out = lines.slice(1, -1).map((line) => line.split("\t"));
  for (const row of out) expect(row).toHaveLength(4);
  return out;
}

describe("the TeX allowlist (core)", () => {
  it("equals the shared fixture, row for row", () => {
    expect(rows().map((row) => row.slice(0, 3))).toEqual(
      TEX_ALLOWLIST.map((row) => [...row]),
    );
  });

  it("passes every sample in its own context", () => {
    for (const [command, context, , sample] of rows()) {
      expect([command, validateTex(sample, context === "display")]).toEqual([
        command,
        null,
      ]);
    }
  });
});
