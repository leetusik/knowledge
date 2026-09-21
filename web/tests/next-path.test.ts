import { describe, expect, it } from "vitest";

import { DEFAULT_NEXT_PATH, safeNextPath } from "@/lib/next-path";

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
