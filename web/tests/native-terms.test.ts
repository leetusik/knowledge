import { readFileSync } from "node:fs";

import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { NativeChapter } from "@/lib/native";
import { planTerms } from "@/lib/native/terms";
import type { Block } from "@/lib/native/tree";

// P39-hk.S9 — the core the terms owe the reader (`10-reading-aids` round 01, *The term
// marker*; F33): each term link is numbered per term in render order, across the text AND a
// formula's legend, and the glossary's way back aims at that very occurrence; a link to an id
// the glossary does not hold is plain text, never a marker.

const GLOSSARY = readFileSync(
  new URL("../../tests/fixtures/native/glossary.md", import.meta.url),
  "utf8",
);

function render(source: string, lang?: string): string {
  return renderToStaticMarkup(
    createElement(NativeChapter, { source, format: "native", lang }),
  );
}

const ids = (html: string, re: RegExp) =>
  Array.from(html.matchAll(re), (m) => m[1]);

describe("term markers", () => {
  const html = render(GLOSSARY);

  it("numbers each term's links in render order (a figure caption, a quiz included)", () => {
    expect(ids(html, /<a class="ra-term" id="(tm-[a-z0-9-]+)"/g)).toEqual([
      "tm-token-bucket-1",
      "tm-rate-limit-1",
      "tm-http-429-1",
      "tm-burst-1",
      "tm-token-bucket-2",
      "tm-token-bucket-3",
      "tm-token-bucket-4",
      // tm-rate-limit-2 is the quiz's explanation: the island draws it once answered.
    ]);
    // Paper's copies (the quiz sheet, the answer key) are markers without an id.
    expect(html).toContain('<a class="ra-term" href="#gl-rate-limit"');
    expect(html).toContain('<a class="ra-term" href="#gl-token-bucket"');
    expect(html).toContain(
      'href="#gl-token-bucket" aria-haspopup="dialog" aria-expanded="false" aria-controls="tw-token-bucket"',
    );
  });

  it("draws one window per linked term and the glossary A to Z, without a second id", () => {
    expect(ids(html, /<div class="ra-win" id="(tw-[a-z0-9-]+)"/g)).toEqual([
      "tw-http-429",
      "tw-burst",
      "tw-rate-limit",
      "tw-token-bucket",
    ]);
    expect(ids(html, /<li class="ra-gl__item" id="(gl-[a-z0-9-]+)"/g)).toEqual([
      "gl-http-429",
      "gl-burst",
      "gl-rate-limit",
      "gl-token-bucket",
    ]);
    // Every id on the page is unique (the windows repeat the definitions).
    const all = ids(html, / id="([^"]+)"/g);
    expect(new Set(all).size).toBe(all.length);
    expect(html).toContain('<h2 id="glossary" class="kb-ch-h" data-block="glossary">Glossary</h2>');
  });

  it("aims the way back at the first occurrence until the layer re-aims it", () => {
    expect(html).toMatch(
      /id="gl-burst"[^]*?<p class="ra-gl__back" lang="en" hidden=""><a class="fg-back" href="#tm-burst-1">/,
    );
  });
});

describe("terms in a legend", () => {
  const source = `---
format: native
syntax: 1
---
## One {#one}

A [rate](term:rate), first.

\`\`\`formula #f
tex: 'r = n \\div t'
alt: r equals n over t
reading: 'The rate.'
where:
  - sym: 'r'
    means: 'the [rate](term:rate)'
\`\`\`

After the formula, the [rate](term:rate) again.

\`\`\`glossary #glossary
terms:
  - id: rate
    term: Rate
    short: How often.
\`\`\`
`;
  const html = render(source, "ko");

  it("counts a legend's term between the text's", () => {
    expect(ids(html, /<a class="ra-term" id="(tm-[a-z0-9-]+)"/g)).toEqual([
      "tm-rate-1",
      "tm-rate-2",
      "tm-rate-3",
    ]);
    expect(html.indexOf('id="tm-rate-2"')).toBeGreaterThan(
      html.indexOf("ra-legend"),
    );
  });

  it("draws the chrome in English in a Korean chapter", () => {
    expect(html).toContain('lang="en">Glossary</h2>');
    expect(html).toContain('class="rd-btn rd-btn--quiet ra-close" lang="en">Close</button>');
  });
});

// P39-hk.F2 — F22 in the prose: a hyphenated word is one kept run wherever the chapter's prose
// sits (never code, a link's target or an `md` body), and a Hangul particle written right after
// an inline formula is kept with it (OQ14).
describe("kept runs in the prose", () => {
  const HEAD = "---\nformat: native\nsyntax: 1\n---\n## One {#one}\n\n";

  it("keeps a hyphenated word whole, but not a lone dash, code or a link's target", () => {
    const body =
      "A walk-forward test - not `look-ahead` - ends at [the out-of-sample run](https://x.example/a-b).\n";
    const html = render(HEAD + body);
    expect(html).toContain('A <span class="ra-keep">walk-forward</span> test - not <code>look-ahead</code> - ends');
    expect(html).toContain('href="https://x.example/a-b"');
    expect(html).toContain('the <span class="ra-keep">out-of-sample</span> run');
    const md = renderToStaticMarkup(
      createElement(NativeChapter, { source: body, format: "md" }),
    );
    expect(md).not.toContain("ra-keep");
  });

  it("binds a Hangul particle to the inline formula before it, never one after a space", () => {
    const html = render(`${HEAD}합 $\`x\`$를 계산하며, $\`y\`$ 다음.\n`, "ko");
    expect(html).toMatch(
      /<span class="ra-keep"><span class="ra-mi"><span class="ra-mi__s"><math[^>]*>(?:(?!<\/math>).)*<\/math><\/span><\/span>를<\/span> 계산하며, <span class="ra-mi">/,
    );
    expect(html.match(/class="ra-keep"/g)?.length).toBe(1);
  });
});

describe("planTerms", () => {
  it("numbers no link to an id the glossary does not hold (it renders as plain text)", () => {
    const known = { type: "link", href: "term:rate", title: null, children: [] };
    const ghost = { type: "link", href: "term:ghost", title: null, children: [] };
    const blocks = [
      { type: "paragraph", id: null, content: [known, ghost] },
      {
        type: "glossary",
        id: "glossary",
        terms: [{ id: "rate", term: "Rate", short: [{ type: "text", text: "How often." }] }],
      },
    ] as unknown as Block[];
    const plan = planTerms(blocks);
    expect(plan.byLink.get(known)).toEqual({ id: "rate", n: 1, anchor: "tm-rate-1" });
    expect(plan.byLink.get(ghost)).toBeUndefined();
    expect([...plan.uses.keys()]).toEqual(["rate"]);
  });
});
