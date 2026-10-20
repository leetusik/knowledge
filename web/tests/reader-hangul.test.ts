import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { hangulParts, hangulRuns, joinHyphens } from "@/lib/reader/hangul";

// P30.S14 — `01-reader` §6a and §5: the two text rules the renderer applies at render time.

describe("Hangul runs (§6a)", () => {
  it("one run is Hangul with the spaces between its words; punctuation ends it", () => {
    expect(hangulParts("the 지식 시스템의 내부 is; 쓰기 경로;")).toEqual([
      { text: "the ", ko: false },
      { text: "지식 시스템의 내부", ko: true },
      { text: " is; ", ko: false },
      { text: "쓰기 경로", ko: true },
      { text: ";", ko: false },
    ]);
  });

  it("a run joined by a no-break space is one run; Latin or digits end it", () => {
    expect(hangulParts("가 나 x 다1라").map((p) => p.text)).toEqual([
      "가 나",
      " x ",
      "다",
      "1",
      "라",
    ]);
  });

  it("wraps in lang=ko only when the text is not Korean, and never touches plain text", () => {
    const html = (wrap: boolean) =>
      renderToStaticMarkup(
        createElement("p", null, hangulRuns("about 지식 시스템", wrap)),
      );
    expect(html(true)).toBe('<p>about <span lang="ko">지식 시스템</span></p>');
    expect(html(false)).toBe("<p>about 지식 시스템</p>");
    expect(hangulRuns("plain English", true)).toBe("plain English");
  });
});

describe("Display titles (§5)", () => {
  it("never break at the hyphen of a compound: U+2060 after a hyphen between two letters", () => {
    expect(joinHyphens("SQLite's write-ahead log")).toBe(
      "SQLite's write-⁠ahead log",
    );
    expect(joinHyphens("a - b, 2-3, x-")).toBe("a - b, 2-3, x-");
  });
});
