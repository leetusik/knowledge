import { describe, expect, it } from "vitest";

import {
  DEFAULT_NEXT_PATH,
  loginHref,
  MAX_NEXT_PATH_LENGTH,
  safeNextPath,
} from "@/lib/next-path";

// P28.S5 (D18) — the `?next=` guard on /login. "Which redirect targets are
// accepted" is core behaviour on a security boundary (an open redirect on a login
// page hands a just-authenticated, primed user to an attacker's page), so it gets
// the minimal set of cases that pin the rule: what the app really emits, and the
// bypasses that are worth naming. No fixtures, no rendering — a pure function.

describe("safeNextPath — accepts same-origin relative paths", () => {
  it.each([
    ["/dashboard"],
    ["/documents"],
    // What P28.S6's public-graph gate line emits: `{publicBase}/documents/{id}`
    // with publicBase = "/@{org}". The shapes must agree.
    ["/@acme/documents/41"],
    ["/@acme/handbook/onboarding"],
    ["/documents/41?view=full"],
    ["/documents?q=a%20b&project=x#top"],
    // P30.S11 — path, query and hash survive together (a reader place).
    ["/a/b?c#d"],
    ["/@acme/handbook/books/phases/p8?lang=ko&v=2#s-intro"],
    // An encoded slash in the QUERY is data, not a path.
    ["/documents?q=a%2F%2Fb"],
  ])("keeps %s", (path) => {
    expect(safeNextPath(path)).toBe(path);
  });

  it("normalises a traversal instead of passing it through", () => {
    // It cannot escape the origin, but the redirect target should be the resolved
    // path, not the literal one.
    expect(safeNextPath("/documents/../graph")).toBe("/graph");
  });
});

describe("safeNextPath — fails closed", () => {
  it.each([
    // Absolute URLs: a different origin wearing a relative-looking wrapper.
    ["https://evil.example/x"],
    ["http://evil.example"],
    ["//evil.example"],
    ["/\\evil.example"],
    ["/\\/evil.example"],
    // Not a location at all.
    ["javascript:alert(1)"],
    ["mailto:a@b.c"],
    ["documents"],
    // Parsers strip these before resolving, so the string is not the path.
    ["/\tevil"],
    ["/\nevil"],
    [" /dashboard"],
    // Loops back to the gate.
    ["/login"],
    ["/login?next=/login"],
    ["/signup"],
    // Nothing to honour.
    [""],
    // P30.S11 — encoded bypasses: what a decoding layer would see.
    ["/%2F%2Fevil.example"],
    ["/%2f%2fevil.example"],
    ["/%5Cevil.example"],
    ["/%252F%252Fevil.example"],
    ["/%0Aevil"],
    ["/a//evil.example"],
    ["/%E0%A4%A"],
  ])("rejects %j", (raw) => {
    expect(safeNextPath(raw)).toBe(DEFAULT_NEXT_PATH);
  });

  it("rejects a repeated ?next= rather than picking one", () => {
    expect(safeNextPath(["/documents", "https://evil.example"])).toBe(
      DEFAULT_NEXT_PATH,
    );
  });

  it("rejects a missing value", () => {
    expect(safeNextPath(undefined)).toBe(DEFAULT_NEXT_PATH);
    expect(safeNextPath(null)).toBe(DEFAULT_NEXT_PATH);
  });

  it("does not mistake a path that merely starts with /login for the gate", () => {
    expect(safeNextPath("/loginsomething")).toBe("/loginsomething");
  });
});

describe("safeNextPath — length cap (P30.S11)", () => {
  it("keeps a path at the cap and rejects one past it", () => {
    const at = `/${"a".repeat(MAX_NEXT_PATH_LENGTH - 1)}`;
    expect(safeNextPath(at)).toBe(at);
    expect(safeNextPath(`${at}a`)).toBe(DEFAULT_NEXT_PATH);
  });
});

describe("loginHref — the sign-in URL that returns to a path (P30.S11)", () => {
  it("encodes a safe path, hash included, into ?next=", () => {
    const href = loginHref("/documents/41?view=full#s-2");
    expect(href).toBe("/login?next=%2Fdocuments%2F41%3Fview%3Dfull%23s-2");
    const back = new URL(href, "https://kb.test").searchParams.get("next");
    expect(safeNextPath(back)).toBe("/documents/41?view=full#s-2");
  });

  it("is a bare /login for a missing, unsafe or default return address", () => {
    expect(loginHref(undefined)).toBe("/login");
    expect(loginHref("//evil.example")).toBe("/login");
    expect(loginHref("https://evil.example/x")).toBe("/login");
    expect(loginHref(DEFAULT_NEXT_PATH)).toBe("/login");
  });
});

describe("the landing after sign-in (P30.S22)", () => {
  it("is the library, and a safe next still wins", () => {
    expect(DEFAULT_NEXT_PATH).toBe("/library");
    expect(safeNextPath(undefined)).toBe("/library");
    expect(safeNextPath("//evil.example")).toBe("/library");
    expect(safeNextPath("/dashboard")).toBe("/dashboard");
    expect(loginHref("/dashboard")).toBe("/login?next=%2Fdashboard");
  });
});
