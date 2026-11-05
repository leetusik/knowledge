import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { SaxesParser } from "saxes";
import temml from "temml";
import { describe, expect, it } from "vitest";

import {
  DEFAULT_STYLES,
  DROPPED_ATTRIBUTES,
  DROPPED_CLASSES,
  linearText,
  MATH_ATTRIBUTES,
  MATH_CLASSES,
  MATH_ELEMENTS,
  mathTree,
  STYLE_CLASSES,
  type MathNode,
} from "@/lib/native/mathml";

// P39-hk.S8 — the loop between publish and the reader (R1 §3 *Tests (core)*): every TeX the
// allowlist accepts (`tex-allowlist.tsv`, one sample per command, in its context) renders
// through Temml, and everything Temml emits for it is either rebuilt or dropped by name,
// so a Temml upgrade that emits something new fails here instead of passing unseen.

const TSV = fileURLToPath(
  new URL("../../tests/fixtures/native/tex-allowlist.tsv", import.meta.url),
);
const ROWS = readFileSync(TSV, "utf8")
  .trim()
  .split("\n")
  .slice(1)
  .map((line) => {
    const [command, context, arity, sample] = line.split("\t");
    return { command, context, arity, sample };
  });

const OPTIONS = {
  wrap: "none",
  throwOnError: true,
  trust: false,
  annotate: false,
} as const;

function emitted(xml: string) {
  const out = {
    elements: new Set<string>(),
    attributes: new Set<string>(),
    classes: new Set<string>(),
    styles: new Set<string>(),
  };
  const p = new SaxesParser({ xmlns: false });
  p.on("opentag", (tag) => {
    out.elements.add(tag.name);
    for (const [name, value] of Object.entries(tag.attributes)) {
      out.attributes.add(name);
      if (name === "class")
        for (const c of String(value).split(/\s+/)) if (c) out.classes.add(c);
      if (name === "style") out.styles.add(String(value));
    }
  });
  p.write(xml).close();
  return out;
}

describe("every allowlisted command renders through Temml in its context", () => {
  it("the fixture holds rows in both contexts", () => {
    expect(ROWS.length).toBeGreaterThan(100);
    expect(new Set(ROWS.map((r) => r.context))).toEqual(
      new Set(["inline", "display"]),
    );
  });
  for (const row of ROWS) {
    it(`${row.command} (${row.context}): ${row.sample}`, () => {
      const display = row.context === "display";
      const xml = temml.renderToString(row.sample, {
        ...OPTIONS,
        displayMode: display,
      });
      const seen = emitted(xml);
      for (const el of seen.elements) expect(MATH_ELEMENTS, el).toContain(el);
      for (const a of seen.attributes)
        expect(
          MATH_ATTRIBUTES.has(a) || DROPPED_ATTRIBUTES.has(a),
          `attribute ${a}`,
        ).toBe(true);
      for (const c of seen.classes)
        expect(
          MATH_CLASSES.has(c) || DROPPED_CLASSES.has(c),
          `class ${c}`,
        ).toBe(true);
      for (const s of seen.styles)
        expect(
          s in STYLE_CLASSES ||
            DEFAULT_STYLES.has(s) ||
            /^math-depth:\d{1,2};$/.test(s),
          `style ${s}`,
        ).toBe(true);
      // The rebuild keeps nothing off-list and no style at all.
      const tree = mathTree(row.sample, display);
      const walk = (n: MathNode) => {
        expect(MATH_ELEMENTS).toContain(n.name);
        for (const a of Object.keys(n.attrs)) {
          expect(a).not.toBe("style");
          expect(MATH_ATTRIBUTES).toContain(a);
        }
        for (const k of n.children) if (typeof k !== "string") walk(k);
      };
      walk(tree);
    });
  }
});

/** Every `mo` in document order, with its text and its attributes. */
function ops(n: MathNode, out: MathNode[] = []): MathNode[] {
  if (n.name === "mo") out.push(n);
  for (const k of n.children) if (typeof k !== "string") ops(k, out);
  return out;
}
const text = (n: MathNode): string =>
  n.children.map((k) => (typeof k === "string" ? k : text(k))).join("");

describe("F24: a large operator straight after an opening fence hugs it (inline)", () => {
  const tex = String.raw`(\sum e)^2 \div \sum e^2`;
  it("lspace 0 on the Σ inside the paren, not on the one after ÷", () => {
    const sums = ops(mathTree(tex, false)).filter((o) => text(o) === "∑");
    expect(sums.map((o) => o.attrs.lspace ?? null)).toEqual(["0", null]);
  });
  it("display math keeps Temml's spacing, as the signed display boards draw it", () => {
    const sums = ops(
      mathTree(String.raw`N = \frac{(\sum_i e_i)^2}{\sum_i e_i^2}`, true),
    ).filter((o) => text(o) === "∑");
    expect(sums.map((o) => o.attrs.lspace ?? null)).toEqual([null, null]);
  });
});

describe("the inline alttext is the formula written in a line (OQ7; F12's snippets)", () => {
  const cases: [string, string][] = [
    [String.raw`s = \mathrm{mean} \div \mathrm{sd}`, "s = mean ÷ sd"],
    [String.raw`t = s \times \sqrt{n}`, "t = s × √n"],
    [String.raw`t \approx 2.19`, "t ≈ 2.19"],
    [String.raw`(\sum e)^2 \div \sum e^2`, "(∑e)² ÷ ∑e²"],
    [
      String.raw`\lambda = \mathrm{rate} \times \mathrm{time}`,
      "λ = rate × time",
    ],
    [String.raw`e^{-\lambda}`, "e^(−λ)"],
    [String.raw`P(\text{no event}) = e^{-\lambda}`, "P(no event) = e^(−λ)"],
    [String.raw`\lvert x \rvert \le 2`, "|x| ≤ 2"],
  ];
  for (const [tex, want] of cases)
    it(tex, () => expect(linearText(mathTree(tex, false))).toBe(want));
});
