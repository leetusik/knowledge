import { describe, expect, it } from "vitest";

import {
  activeLimit,
  documentsHref,
  pagerOffsets,
  readActiveParams,
  toQuery,
} from "@/lib/knowledge/documents-query";

// P12.S5 — the documents list's pure `searchParams` round-trip + offset-pager math.
// Locks the two load-bearing behaviors: BLANK-IS-ABSENT (a GET form submits its empty
// fields, and a blank `project` would 422) and the offset pager's clamp arithmetic.

describe("readActiveParams (blank-is-absent)", () => {
  it("drops blank + whitespace-only params and trims the rest", () => {
    const active = readActiveParams({
      q: "  hello  ",
      project: "", // the "All projects" option — must be dropped, not sent
      tag: "   ",
      offset: "20",
    });
    expect(active).toEqual({ q: "hello", offset: "20" });
  });

  it("takes the first value of a repeated key and ignores unknown params", () => {
    const active = readActiveParams({ q: ["a", "b"], bogus: "x" });
    expect(active).toEqual({ q: "a" });
  });
});

describe("toQuery (numeric narrowing)", () => {
  it("passes text through and narrows valid limit/offset to numbers", () => {
    expect(toQuery({ q: "k8s", project: "p-uuid", limit: "25", offset: "50" })).toEqual({
      q: "k8s",
      project: "p-uuid",
      limit: 25,
      offset: 50,
    });
  });

  it("drops a non-numeric limit/offset rather than poisoning the query", () => {
    expect(toQuery({ q: "x", offset: "nope" })).toEqual({ q: "x" });
  });
});

describe("pagerOffsets (clamp to [0, total))", () => {
  it("has no previous on page 1 and a next while more remain", () => {
    expect(pagerOffsets(0, 50, 120)).toEqual({ prev: null, next: 50 });
  });

  it("steps both ways in the middle", () => {
    expect(pagerOffsets(50, 50, 120)).toEqual({ prev: 0, next: 100 });
  });

  it("has no next once offset + limit reaches total", () => {
    expect(pagerOffsets(100, 50, 120)).toEqual({ prev: 50, next: null });
  });

  it("clamps a ragged previous back to 0", () => {
    expect(pagerOffsets(30, 50, 120)).toEqual({ prev: 0, next: 80 });
  });
});

describe("documentsHref (preserve filters, override offset)", () => {
  it("keeps active filters and omits offset 0", () => {
    expect(documentsHref({ q: "k8s", project: "p1", offset: "50" }, 0)).toBe(
      "/documents?q=k8s&project=p1",
    );
  });

  it("sets a non-zero offset and preserves the query", () => {
    expect(documentsHref({ q: "k8s" }, 50)).toBe("/documents?q=k8s&offset=50");
  });

  it("is bare with no params", () => {
    expect(documentsHref({}, 0)).toBe("/documents");
  });
});

describe("activeLimit (search vs. browse default)", () => {
  it("defaults to 10 in search mode and 50 in browse mode", () => {
    expect(activeLimit({ q: "x" })).toBe(10);
    expect(activeLimit({})).toBe(50);
    expect(activeLimit({ limit: "25" })).toBe(25);
  });
});
