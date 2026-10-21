import { existsSync, readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { SaxesParser } from "saxes";
import { describe, expect, it } from "vitest";

import { NativeChapter } from "@/lib/native";
import { parseChapter } from "@/lib/native/parse";
import { formatSections, sections } from "@/lib/native/project";
import {
  capEnd,
  capture,
  cps,
  lengthOf,
  pointAt,
  QUOTE_MAX,
  segments,
  slicesIn,
  snap,
  verified,
  type ANode,
  type Segment,
} from "@/lib/reader/anchor";

// P30.S20 — the core invariant of annotations: the anchor the browser captures is
// measured in the SAME projection the server re-anchors against. For every accept case of
// the shared fixtures, the renderer's page is parsed back into a DOM; the offsets a
// selection captures must slice exactly Python's projection (`<case>.txt`, written by
// `server/native/project.py`), and painting stored offsets must land on exactly those
// characters (the paint round trip).

const FIXTURES = fileURLToPath(
  new URL("../../tests/fixtures/native/", import.meta.url),
);
const CASES = readdirSync(FIXTURES)
  .filter(
    (n) => n.endsWith(".md") && !existsSync(`${FIXTURES}${n.slice(0, -3)}.err`),
  )
  .map((n) => n.slice(0, -3))
  .sort();

/** Python's projection: `=== <id>\n<text>\n` per section. */
function pythonSections(txt: string): Map<string, string[]> {
  const out = new Map<string, string[]>();
  const re = /^=== (\S+)\n/gm;
  const marks = [...txt.matchAll(re)];
  marks.forEach((m, i) => {
    const from = (m.index ?? 0) + m[0].length;
    const to =
      i + 1 < marks.length ? (marks[i + 1].index ?? 0) - 1 : txt.length - 1;
    out.set(m[1], cps(txt.slice(from, to)));
  });
  return out;
}

/** A small DOM from the renderer's markup (React's static markup is well-formed XML). */
interface FakeNode extends ANode {
  childNodes: FakeNode[];
  parentNode: FakeNode | null;
  attrs: Record<string, string>;
}

function parse(html: string): FakeNode {
  const root: FakeNode = mk(1, "ROOT", null, {});
  const stack: FakeNode[] = [root];
  const p = new SaxesParser({ xmlns: false });
  p.on("opentag", (tag) => {
    const attrs: Record<string, string> = {};
    for (const [k, v] of Object.entries(tag.attributes)) attrs[k] = String(v);
    const el = mk(1, tag.name.toUpperCase(), stack[stack.length - 1], attrs);
    stack[stack.length - 1].childNodes.push(el);
    stack.push(el);
  });
  p.on("closetag", () => {
    stack.pop();
  });
  p.on("text", (t) => {
    const parent = stack[stack.length - 1];
    parent.childNodes.push(mk(3, "#text", parent, {}, t));
  });
  p.write(`<root>${html}</root>`).close();
  return root.childNodes[0];
}

function mk(
  type: number,
  name: string,
  parent: FakeNode | null,
  attrs: Record<string, string>,
  value: string | null = null,
): FakeNode {
  return {
    nodeType: type,
    nodeName: name,
    nodeValue: value,
    parentNode: parent,
    childNodes: [],
    attrs,
    getAttribute: (n: string) => (n in attrs ? attrs[n] : null),
  };
}

function render(name: string): FakeNode {
  const html = renderToStaticMarkup(
    createElement(NativeChapter, {
      source: readFileSync(`${FIXTURES}${name}.md`, "utf8"),
      format: "native",
      assetUrl: () => "/a.png",
    }),
  );
  return parse(html);
}

/** A deterministic sequence, so a failure reproduces. */
function rng(seed: number) {
  let x = seed >>> 0 || 1;
  return (n: number) => {
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;
    return (x >>> 0) % Math.max(1, n);
  };
}

function find(root: FakeNode, pred: (n: FakeNode) => boolean): FakeNode | null {
  if (pred(root)) return root;
  for (const c of root.childNodes) {
    const f = find(c, pred);
    if (f) return f;
  }
  return null;
}

describe("the captured anchor equals the shared projection (core)", () => {
  it("finds the fixture set", () => {
    expect(CASES.length).toBeGreaterThanOrEqual(10);
  });

  for (const name of CASES) {
    describe(name, () => {
      const py = pythonSections(readFileSync(`${FIXTURES}${name}.txt`, "utf8"));
      const root = render(name);
      const segs = segments(root);

      it("every stamped container shows exactly the projection's text at its offsets", () => {
        expect(verified(segs, py)).toHaveLength(segs.length);
      });

      it("every character of every section is on the page, in a stamped container", () => {
        for (const [id, text] of py) {
          const mine = segs.filter((g) => g.sec === id);
          const covered = new Array<boolean>(text.length).fill(false);
          for (const g of mine) {
            const len = lengthOf(g.el);
            for (let k = g.base; k < g.base + len; k += 1) covered[k] = true;
          }
          const missing = text
            .map((ch, k) => (covered[k] || /\s/.test(ch) ? null : k))
            .filter((k) => k !== null);
          expect({ id, missing }).toEqual({ id, missing: [] });
        }
      });

      it("a selection captures the offsets Python's projection gives for the same text", () => {
        const next = rng(name.length * 7919 + 17);
        const bySec = new Map<string, Segment[]>();
        for (const g of segs)
          bySec.set(g.sec, [...(bySec.get(g.sec) ?? []), g]);
        let checked = 0;
        for (const [id, list] of bySec) {
          const text = py.get(id)!;
          for (let n = 0; n < 40; n += 1) {
            const a = list[next(list.length)];
            const b = list[next(list.length)];
            const [ga, gb] = a.base <= b.base ? [a, b] : [b, a];
            const la = lengthOf(ga.el);
            const lb = lengthOf(gb.el);
            let s = ga.base + next(la + 1);
            let e = gb.base + next(lb + 1);
            if (e < s) [s, e] = [e, s];
            const pa = pointAt(ga.base <= s && s <= ga.base + la ? ga : gb, s);
            const pb = pointAt(gb.base <= e && e <= gb.base + lb ? gb : ga, e);
            if (!pa || !pb) continue;
            const got = capture(
              root,
              {
                startContainer: pa.node,
                startOffset: pa.offset,
                endContainer: pb.node,
                endOffset: pb.offset,
              },
              py,
            );
            const want = snap(text, s, e);
            if (want.e <= want.s) {
              expect(got).toBeNull();
              continue;
            }
            expect(got).not.toBeNull();
            if (!got || got.mode !== "passage")
              throw new Error("not a passage");
            expect([got.sec, got.s, got.e]).toEqual([id, want.s, want.e]);
            expect(got.quote.exact).toBe(text.slice(want.s, want.e).join(""));
            expect(got.quote.prefix).toBe(
              text.slice(Math.max(0, want.s - 32), want.s).join(""),
            );
            expect(got.quote.suffix).toBe(
              text.slice(want.e, want.e + 32).join(""),
            );
            expect(got.clipped).toBe(false);
            checked += 1;
          }
        }
        if (bySec.size) expect(checked).toBeGreaterThan(0);
      });

      it("element boundary points (a parent and a child index) capture the same offsets", () => {
        for (const g of segs.slice(0, 30)) {
          const len = lengthOf(g.el);
          if (!len) continue;
          const parent = g.el.parentNode as FakeNode;
          const i = parent.childNodes.indexOf(g.el as FakeNode);
          const got = capture(
            root,
            {
              startContainer: parent,
              startOffset: i,
              endContainer: parent,
              endOffset: i + 1,
            },
            py,
          );
          const text = py.get(g.sec)!;
          const want = snap(text, g.base, g.base + len);
          if (want.e <= want.s) continue;
          expect(got && got.mode === "passage" ? [got.s, got.e] : got).toEqual([
            want.s,
            want.e,
          ]);
        }
      });

      it("painting stored offsets lands on exactly those characters (round trip)", () => {
        const next = rng(name.length * 104729 + 3);
        for (const [id, text] of py) {
          const mine = segs.filter((g) => g.sec === id);
          if (!mine.length || !text.length) continue;
          for (let n = 0; n < 25; n += 1) {
            let s = next(text.length);
            let e = next(text.length + 1);
            if (e < s) [s, e] = [e, s];
            const sn = snap(text, s, e);
            if (sn.e <= sn.s) continue;
            const slices = mine.flatMap((g) => slicesIn(g, sn.s, sn.e));
            for (const sl of slices) {
              expect((sl.node.nodeValue ?? "").slice(sl.a, sl.b)).toBe(
                text.slice(sl.from, sl.to).join(""),
              );
            }
            if (!slices.length) continue;
            const first = slices[0];
            const last = slices[slices.length - 1];
            const back = capture(
              root,
              {
                startContainer: first.node,
                startOffset: first.a,
                endContainer: last.node,
                endOffset: last.b,
              },
              py,
            );
            // What the page paints is what was stored, minus only the characters the page
            // does not show (line joins, a bare citation's stand-in).
            expect(back && back.mode === "passage" ? back.sec : null).toBe(id);
            if (back && back.mode === "passage") {
              expect(back.s).toBeGreaterThanOrEqual(sn.s);
              expect(back.e).toBeLessThanOrEqual(sn.e);
              expect(text.slice(sn.s, back.s).join("").trim()).toBe("");
              expect(text.slice(back.e, sn.e).join("").trim()).toBe("");
            }
          }
        }
      });
    });
  }
});

// Constructs the shared fixtures barely hold (an image mid-paragraph, a citation whose words
// are only its number, a missing link, Hangul inside English, a highlighted code block, an
// image in a table cell, a folded callout). `tests/fixtures/anchor-mixed.txt` is Python's
// projection of MIXED (`server/native/project.py` → `format_sections`); regenerate it with
// that function whenever MIXED changes.
const MIXED = `---
format: native
syntax: 1
---
Opening words before any section.

## Mixed {#mixed}

Before the image ![a box](asset:pic.png) after it, and **bold** text.
A cited claim [1](#src-a) and [the report](#src-a) here.
An [external](https://example.com) link and a [missing](chapter:nowhere/none) one.
A hard break\\
then 한국어 문장 inside English, and 😀 emoji.

| Col | Pic |
|---|---|
| left ![p](asset:pic.png) right | x |

> [!NOTE] A [titled](https://example.com) note
> Body *text* with \`code\`.

> [!WARNING]- Folded
> Hidden words here.

\`\`\`ts #snippet
const x = "y"; // comment
let z = 1;
\`\`\`

After the code, a closing paragraph.

## Sources {#sources-list}

\`\`\`sources #src
items:
  - id: src-a
    title: A report
    url: https://example.com/report
\`\`\`
`;

describe("constructs beyond the fixtures keep the invariant", () => {
  const html = renderToStaticMarkup(
    createElement(NativeChapter, {
      source: MIXED,
      format: "native",
      assetUrl: () => "/a.png",
    }),
  );
  const root = parse(html);
  const pyTxt = readFileSync(
    fileURLToPath(new URL("./fixtures/anchor-mixed.txt", import.meta.url)),
    "utf8",
  );
  const ref = pythonSections(pyTxt);
  const segs = segments(root);

  it("the TS projection of this chapter is Python's", () => {
    expect(formatSections(sections(parseChapter(MIXED).tree))).toBe(pyTxt);
  });

  it("renders the stand-ins and skips it needs", () => {
    expect(html).toContain("data-an-len");
    expect(html).toContain("data-an-skip");
    expect(segs.length).toBeGreaterThan(8);
  });

  it("every stamped container matches the projection, and covers every character", () => {
    expect(verified(segs, ref)).toHaveLength(segs.length);
    for (const [id, text] of ref) {
      const covered = new Array<boolean>(text.length).fill(false);
      for (const g of segs.filter((x) => x.sec === id))
        for (let k = g.base; k < g.base + lengthOf(g.el); k += 1)
          covered[k] = true;
      const missing = text
        .map((ch, k) => (covered[k] || /\s/.test(ch) ? null : k))
        .filter((k) => k !== null);
      expect({ id, missing }).toEqual({ id, missing: [] });
    }
  });

  it("every pair of points captures the projection's own offsets", () => {
    for (const [id, text] of ref) {
      const mine = segs.filter((g) => g.sec === id);
      const points: { seg: Segment; off: number }[] = [];
      for (const g of mine)
        for (let k = 0; k <= lengthOf(g.el); k += 3)
          points.push({ seg: g, off: g.base + k });
      for (let i = 0; i < points.length; i += 2) {
        for (let j = i; j < points.length; j += 5) {
          const a = pointAt(points[i].seg, points[i].off);
          const b = pointAt(points[j].seg, points[j].off);
          if (!a || !b) continue;
          const got = capture(
            root,
            {
              startContainer: a.node,
              startOffset: a.offset,
              endContainer: b.node,
              endOffset: b.offset,
            },
            ref,
          );
          const want = snap(text, points[i].off, points[j].off);
          if (want.e <= want.s) {
            expect(got).toBeNull();
            continue;
          }
          expect(
            got && got.mode === "passage"
              ? [got.sec, got.s, got.e, got.quote.exact]
              : got,
          ).toEqual([id, want.s, want.e, text.slice(want.s, want.e).join("")]);
        }
      }
    }
  });
});

describe("classifying a selection", () => {
  const py = pythonSections(readFileSync(`${FIXTURES}prose.txt`, "utf8"));
  const root = render("prose");
  const segs = segments(root);

  it("text before the first section is refused", () => {
    const p = find(root, (n) => n.nodeName === "P" && !n.attrs["data-tx"]);
    expect(p).not.toBeNull();
    const t = p!.childNodes[0];
    expect(
      capture(
        root,
        { startContainer: t, startOffset: 0, endContainer: t, endOffset: 4 },
        py,
      ),
    ).toEqual({ mode: "refuse" });
  });

  it("a heading is a note on its section", () => {
    const h = find(root, (n) => n.nodeName === "H2" && !!n.attrs["data-block"]);
    const t = h!.childNodes[0];
    expect(
      capture(
        root,
        { startContainer: t, startOffset: 1, endContainer: t, endOffset: 3 },
        py,
      ),
    ).toEqual({ mode: "block", sec: h!.attrs["data-block"] });
  });

  it("a selection that runs into the next section stops at the end of its own", () => {
    const first = segs[0];
    const other = segs.find((g) => g.sec !== first.sec)!;
    const a = pointAt(first, first.base)!;
    const b = pointAt(other, other.base + 1)!;
    const got = capture(
      root,
      {
        startContainer: a.node,
        startOffset: a.offset,
        endContainer: b.node,
        endOffset: b.offset,
      },
      py,
    );
    const text = py.get(first.sec)!;
    const want = snap(text, first.base, text.length);
    expect(
      got && got.mode === "passage"
        ? [got.sec, got.s, got.e, got.clipped]
        : got,
    ).toEqual([first.sec, want.s, want.e, true]);
  });
});

describe("word snapping and the caps", () => {
  const t = (s: string) => cps(s);
  it("extends each end to a word boundary and trims spaces", () => {
    const text = t("The quick brown fox");
    expect(snap(text, 5, 12)).toEqual({ s: 4, e: 15 }); // "quick brown"
    expect(snap(text, 3, 4)).toEqual({ s: 4, e: 4 }); // only a space: empty
  });
  it("keeps a Korean eojeol whole, and apostrophes inside a word", () => {
    const ko = t("작은 서버가 한 번에 씁니다");
    // "버가" inside "서버가": snaps to the whole eojeol
    expect(snap(ko, 4, 5)).toEqual({ s: 3, e: 6 });
    const en = t("the reader’s note");
    expect(snap(en, 6, 8)).toEqual({ s: 4, e: 12 });
  });
  it("counts code points, never UTF-16 units", () => {
    const text = t("😀 word here");
    expect(snap(text, 3, 4)).toEqual({ s: 2, e: 6 });
  });
  it("cuts a quote past the server's cap at a word boundary", () => {
    const text = t("word ".repeat(1200));
    const e = capEnd(text, 0, text.length);
    expect(e).toBeLessThanOrEqual(QUOTE_MAX);
    expect(text.slice(0, e).join("").endsWith("word")).toBe(true);
  });
});
