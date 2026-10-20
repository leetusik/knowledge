import { readdirSync, readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { NativeChapter, type NativeChapterProps } from "@/lib/native";
import { svgAttrsToProps, validateSvg } from "@/lib/native/svg";

// P30.S12 — the render pipeline's sanitizing core: what the reader can never be
// made to emit, whatever a stored chapter holds. No raw HTML reaches the output,
// the svg allowlist holds twice (validator + mapper), and a link to something the
// reader cannot open never carries its target.

const FIXTURES = fileURLToPath(
  new URL("../../tests/fixtures/native/", import.meta.url),
);
const HEADER = "---\nformat: native\nsyntax: 1\n---\n";
/** The placeholder's hook (its copy is HTML-escaped in the output). */
const UNSHOWABLE = 'class="kb-ch-unshowable"';

function render(
  props: Partial<NativeChapterProps> & { source: string },
): string {
  return renderToStaticMarkup(
    createElement(NativeChapter, { format: "native", ...props }),
  );
}

describe("every conformance case renders", () => {
  const cases = readdirSync(FIXTURES)
    .filter((n) => n.endsWith(".md"))
    .map((n) => n.slice(0, -3));
  for (const name of cases) {
    const rejected = existsSync(`${FIXTURES}${name}.err`);
    it(`${name}: ${rejected ? "refused blocks show the placeholder" : "renders with no placeholder"}`, () => {
      const html = render({
        source: readFileSync(`${FIXTURES}${name}.md`, "utf8"),
        assetUrl: () => "/a.png",
      });
      // The only `style` attributes are the figures' own `--fg-*` numbers (P30.S16), never an author's.
      expect(html).not.toMatch(
        /<script|<iframe|<object|<foreignObject|\son[a-z]+=|\sstyle=(?!"(?:--fg-[a-z]+:[0-9.]+(?:px)?;?)+")|javascript:/i,
      );
      if (rejected) {
        expect(html).toContain(UNSHOWABLE);
      } else {
        expect(html).not.toContain(UNSHOWABLE);
      }
    });
  }
});

describe("charts", () => {
  it("a top-level chart renders as a diagram (its tree type is the chart type, kept for parity)", () => {
    const html = render({
      source: readFileSync(`${FIXTURES}diagrams-rows.md`, "utf8"),
    });
    expect(html).toContain('id="per-day"');
    expect(html.match(/class="kb-ch-chart"/g)?.length).toBe(3);
  });
});

describe("no raw HTML reaches the output", () => {
  it("refuses a native block holding <img onerror> and never echoes it", () => {
    const html = render({
      source: `${HEADER}## A {#a}\n\nSafe paragraph.\n\nHi <img src=x onerror="alert(1)"> there.\n\n<script>alert(2)</script>\n`,
    });
    expect(html).toContain("Safe paragraph.");
    expect(html).toContain(UNSHOWABLE);
    expect(html).not.toMatch(/<img|onerror|<script|alert\(/i);
  });

  it("drops raw HTML from an md document, keeping only its text", () => {
    const html = render({
      format: "md",
      source:
        '# Title\n\nHi <img src=x onerror=alert(1)> <b>bold</b>\n\n<script>alert(2)</script>\n\n<div onclick="x()">block</div>\n',
    });
    expect(html).toContain("bold");
    expect(html).not.toMatch(
      /<img|onerror|<script|onclick|<div onclick|alert\(/i,
    );
  });

  it("renders md typed fences and {#id} as plain code and text (extensions off)", () => {
    const html = render({
      format: "md",
      source:
        "## Heading {#x}\n\n```quiz\nitems: []\n```\n\n> [!NOTE] t\n> b\n",
    });
    expect(html).toContain("Heading {#x}");
    expect(html).toContain('data-lang="quiz"');
    expect(html).toContain("<blockquote>");
    expect(html).not.toContain("kb-ch-callout");
  });
});

describe("the svg allowlist holds twice", () => {
  it("the validator refuses script, on* handlers, javascript: hrefs, foreignObject and style", () => {
    const cases = [
      '<svg viewBox="0 0 1 1"><script>alert(1)</script></svg>',
      '<svg viewBox="0 0 1 1"><rect onload="alert(1)"/></svg>',
      '<svg viewBox="0 0 1 1" xmlns:xlink="http://www.w3.org/1999/xlink"><use xlink:href="javascript:alert(1)"/></svg>',
      '<svg viewBox="0 0 1 1"><foreignObject><div/></foreignObject></svg>',
      '<svg viewBox="0 0 1 1"><rect style="fill:red"/></svg>',
      '<svg viewBox="0 0 1 1"><a href="https://evil.example"><rect/></a></svg>',
    ];
    for (const source of cases) {
      const { tree, violations } = validateSvg(source);
      expect(tree, source).toBeNull();
      expect(violations.length, source).toBeGreaterThan(0);
    }
  });

  it("the mapper drops anything off-list even from an unvalidated tree", () => {
    const props = svgAttrsToProps(
      "use",
      {
        onclick: "alert(1)",
        style: "fill:red",
        href: "javascript:alert(1)",
        fill: "red",
        "marker-end": "url(https://evil.example/x)",
        class: "kb-fill-accent evil",
        id: "dot",
      },
      "blk",
    );
    expect(props).toEqual({ className: "kb-fill-accent", id: "blk-dot" });
  });

  it("renders an svg <title> as its text (React 19 hoists and stringifies titles)", () => {
    const html = render({ source: readFileSync(`${FIXTURES}svg.md`, "utf8") });
    expect(html).toContain("<title>Arrow</title>");
    expect(html).not.toContain("[object Object]");
    expect(html).toContain('href="#arrow-art-dot"');
    expect(html).toContain('marker-end="url(#arrow-art-head)"');
  });

  it("renders a hostile svg tree as nothing executable", () => {
    // A hand-built source the validator would refuse: the whole block is refused.
    const html = render({
      source: `${HEADER}\`\`\`svg #art\nlabel: Art\nsvg: '<svg viewBox="0 0 1 1"><script>alert(1)</script><rect onclick="x()"/></svg>'\n\`\`\`\n`,
    });
    expect(html).toContain(UNSHOWABLE);
    expect(html).not.toMatch(/<svg|<script|onclick|alert\(/i);
  });
});

describe("a missing link never leaks", () => {
  const source = `${HEADER}## Links {#links}\n\nSee [the hidden chapter](chapter:secret-book/hidden-key) and [a doc](doc:private-proj/plans) and [here](#links).\n`;

  it("an unresolved chapter:/doc: target renders as text with no href, path or title", () => {
    const html = render({ source });
    expect(html).toContain("the hidden chapter");
    expect(html).toContain("a doc");
    expect(html).toContain('data-missing-link=""');
    expect(html).not.toMatch(/secret-book|hidden-key|private-proj|plans/);
    expect(html).toContain('href="#links"');
  });

  it("a target the reader can open becomes a link", () => {
    const html = render({
      source,
      resolveRef: (ref) =>
        ref.kind === "doc" ? "/@acme/private-proj/plans" : null,
    });
    expect(html).toContain('href="/@acme/private-proj/plans"');
    expect(html).not.toMatch(/secret-book|hidden-key/);
  });

  it("md: javascript:, data: and vbscript: links are missing links", () => {
    const html = render({
      format: "md",
      source:
        "[a](javascript:alert(1)) [b](data:text/html,x) [c](VBScript:x) [d](https://ok.example) [e](/rel)",
      baseUrl: "https://kb.example/documents/1",
    });
    expect(html).not.toMatch(/javascript:|data:text|vbscript:/i);
    expect(html).toContain('href="https://ok.example"');
    expect(html).toContain('href="https://kb.example/rel"');
  });

  it("an asset the version does not hold renders its alt text, never a broken or external image", () => {
    const html = render({
      source: `${HEADER}\`\`\`figure #fig\nsrc: missing.png\nalt: A diagram of the lock\ncaption: C\n\`\`\`\n`,
      assetUrl: () => "https://evil.example/x.png",
    });
    expect(html).not.toContain("<img");
    expect(html).toContain("A diagram of the lock");
  });
});

describe("code highlighting", () => {
  it("emits token classes, never inline colour", () => {
    const html = render({
      source: `${HEADER}\`\`\`python #code\ndef main():\n    return "x"\n\`\`\`\n`,
    });
    expect(html).toMatch(/class="kb-tok kb-tok-[a-z-]+/);
    expect(html).not.toMatch(/\sstyle=/);
    expect(html).toContain("def");
  });
});
