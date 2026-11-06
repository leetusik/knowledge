import { describe, expect, it } from "vitest";

import { validateChapter } from "@/lib/native";
import { displayQuote, quoteBasis } from "@/lib/native/display-text";
import { headingSlug } from "@/lib/native/ids";
import { plainText } from "@/lib/native/parse";
import { sections } from "@/lib/native/project";
import { headingsOf } from "@/lib/reader/load";
import { sectionLabel } from "@/lib/reader/notes-load";

// P39-hk.F4 — the core the contents and the text-only surfaces owe the reader (OQ10, OQ16): a
// heading with inline math keeps the id its plain text gives (the anchors and links hold it) and
// is listed with the formula as its linear text; the generated Glossary h2 is listed at the
// glossary block's place; a highlight's shown quote is mapped from its own offsets, never found.

const CHAPTER = [
  "---",
  "format: native",
  "syntax: 1",
  "---",
  "## Scoring a run",
  "",
  "The scorer computes $`t = s \\times \\sqrt{n}`$ over n events, $`n`$ of them.",
  "",
  "## When $`e^{-\\lambda}`$ is near one",
  "",
  "No event at all has probability $`e^{-\\lambda}`$ [1](#src-a).",
  "",
  "```glossary",
  "terms:",
  "  - id: tstat",
  "    term: t-statistic",
  "    short: How far the mean sits from zero, in standard errors.",
  "```",
  "",
  "## Sources",
  "",
  "```sources",
  "items:",
  "  - id: src-a",
  "    title: A source",
  "    url: https://example.com/a",
  "```",
  "",
].join("\n");

describe("the headings list (Contents, In this chapter)", () => {
  const checked = validateChapter(CHAPTER, "native");

  it("keeps a math heading's id and lists it with the formula's linear text", () => {
    expect(checked.violations).toEqual([]);
    const head = checked.tree.blocks[2];
    expect(head.type === "heading" && headingSlug(plainText(head.content))).toBe(
      "when-e-lambda-is-near-one",
    );
    expect(head.id).toBe("when-e-lambda-is-near-one");
    expect(headingsOf(checked)[1]).toEqual({
      id: "when-e-lambda-is-near-one",
      level: 2,
      text: "When e^(−λ) is near one",
    });
  });

  it("lists the Glossary h2 at the glossary block's place, with its id", () => {
    expect(headingsOf(checked).map((h) => `${h.level} ${h.id} ${h.text}`)).toEqual([
      "2 scoring-a-run Scoring a run",
      "2 when-e-lambda-is-near-one When e^(−λ) is near one",
      "2 glossary-1 Glossary",
      "2 sources-list Sources",
    ]);
  });

  it("names the Glossary in the annotation layer and gives its entry the h2's lang (F6)", () => {
    expect(sectionLabel(checked.tree, "glossary-1", plainText)).toBe("Glossary");
    expect(headingsOf(checked, "ko").map((h) => h.lang)).toEqual([
      undefined,
      undefined,
      "en",
      undefined,
    ]);
    expect(headingsOf(checked, "en").some((h) => "lang" in h)).toBe(false);
  });
});

describe("a highlight's shown quote", () => {
  const { tree } = validateChapter(CHAPTER, "native");
  const basis = quoteBasis(tree);
  const text = Array.from(
    sections(tree).find((s) => s.id === "scoring-a-run")?.text ?? "",
  );
  const quote = (from: string, to: string) => {
    const all = text.join("");
    const s = all.indexOf(from);
    const exact = all.slice(s, all.indexOf(to, s) + to.length);
    const start = Array.from(all.slice(0, s)).length;
    return { start, end: start + Array.from(exact).length, exact };
  };

  it("maps each whole formula from the offsets, never a word that reads like one", () => {
    const q = quote("computes", "of them");
    expect(displayQuote(basis, "scoring-a-run", q.start, q.end, q.exact)).toBe(
      "computes t = s × √n over n events, n of them",
    );
    // An offset inside a formula, or text that is not the stored quote: the stored quote shows.
    expect(displayQuote(basis, "scoring-a-run", q.start + 12, q.end, q.exact.slice(12))).toBeNull();
    expect(displayQuote(basis, "scoring-a-run", q.start, q.end, "something else")).toBeNull();
    // No formula in it: the stored quote shows.
    const w = quote("over n", "events");
    expect(displayQuote(basis, "scoring-a-run", w.start, w.end, w.exact)).toBeNull();
  });
});
