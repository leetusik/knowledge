import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { letters } from "@/lib/native/cites";
import { documentAssets, NativeChapter } from "@/lib/native";

// P30.S16 — the logic the figures owe the reader: a citation's number and id come from the
// sources list, the list's way back counts them in document order, and an image's box is
// reserved at the asset map's size.

const HEADER = "---\nformat: native\nsyntax: 1\n---\n";
const SOURCES =
  "```sources #sources\nitems:\n  - id: src-a\n    title: Alpha\n    url: https://a.example/x\n  - id: src-b\n    title: Beta\n    url: https://b.example/y\n```\n";

function render(source: string, extra: object = {}): string {
  return renderToStaticMarkup(
    createElement(NativeChapter, { source, format: "native", ...extra }),
  );
}

describe("letters", () => {
  it("runs a..z then aa, ab", () => {
    expect([0, 1, 25, 26, 27, 51, 52].map(letters)).toEqual([
      "a",
      "b",
      "z",
      "aa",
      "ab",
      "az",
      "ba",
    ]);
  });
});

describe("citations", () => {
  const source = `${HEADER}## One {#one}\n\nSee [alpha](#src-a) and [again](#src-a).\n\n## Two {#two}\n\nAlso [1](#src-b) and [x](#one).\n\n## Sources {#sources-list}\n\n${SOURCES}`;
  const html = render(source);

  it("numbers a citation from the list and gives it an id counted per source", () => {
    expect(html).toContain('id="cite-src-a-1"');
    expect(html).toContain('id="cite-src-a-2"');
    expect(html).toContain('id="cite-src-b-1"');
    expect(html).toMatch(/alpha<span class="fg-cite__n"> \[1\]<\/span>/);
    // A link whose words are only a number shows [n] alone; a link to a heading is no citation.
    expect(html).toMatch(
      /id="cite-src-b-1"[^>]*><span class="fg-cite__n">\[2\]<\/span>/,
    );
    expect(html).not.toContain("cite-one");
  });

  it("draws the way back: a lead and letters when cited twice, one link when once, the section named", () => {
    expect(html).toContain("Back to the text:");
    expect(html).toContain('aria-label="Back to citation a of 2, in “One”"');
    expect(html).toContain('href="#cite-src-a-2"');
    expect(html).toContain('aria-label="Back to the text, in “Two”"');
  });
});

describe("images", () => {
  it("reserves the box at the asset map's size", () => {
    const html = render(
      `${HEADER}\`\`\`figure #fig\nsrc: pic\nalt: A picture\ncaption: Cap\n\`\`\`\n`,
      {
        assetInfo: documentAssets(7, {
          pic: {
            file: `${"a".repeat(64)}.png`,
            width: 1440,
            height: 900,
            animated: false,
          },
        }),
      },
    );
    expect(html).toContain('style="--fg-w:1440;--fg-h:900"');
    expect(html).toContain('width="1440" height="900"');
    expect(html).toContain(
      `src="/api/documents/7/assets/${"a".repeat(64)}.png"`,
    );
  });

  it("splits a paragraph around a plain image and gives it img-<name>, -2 for the second", () => {
    const html = render(
      `${HEADER}Before ![x](asset:pic) after ![y](asset:pic).\n`,
      { assetInfo: documentAssets(7, {}) },
    );
    expect(html).toContain('id="img-pic"');
    expect(html).toContain('id="img-pic-2"');
    expect(html).toContain("<p>Before</p>");
    expect(html).toContain("<p>after</p>");
    expect(html).toContain("Image not available");
  });
});
