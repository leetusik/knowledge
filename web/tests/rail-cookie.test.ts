import { describe, expect, it } from "vitest";

import {
  isRailCollapsed,
  RAIL_COOKIE,
  railCookieString,
  readRailCookie,
} from "@/lib/rail-cookie";

// The rail-fold preference is WRITTEN by the browser and READ by the server, so the two
// sides agree only because they share this module. These lock its contract: the name,
// the two sentinels, the attribute string, and "unknown ⇒ expanded" — a new visitor, a
// cleared jar, or a tampered value must never yield a hidden rail with no way back.

describe("rail preference cookie", () => {
  it("treats anything but the collapsed sentinel as expanded", () => {
    expect(isRailCollapsed("collapsed")).toBe(true);
    expect(isRailCollapsed("expanded")).toBe(false);
    expect(isRailCollapsed(undefined)).toBe(false);
    expect(isRailCollapsed("1")).toBe(false);
  });

  it("writes a path-wide, year-long, Lax preference (Secure only on https)", () => {
    expect(railCookieString(true, false)).toBe(
      `${RAIL_COOKIE}=collapsed; Path=/; Max-Age=31536000; SameSite=Lax`,
    );
    expect(railCookieString(false, true)).toBe(
      `${RAIL_COOKIE}=expanded; Path=/; Max-Age=31536000; SameSite=Lax; Secure`,
    );
  });

  it("reads its own write back out of a jar that also holds the session", () => {
    expect(
      readRailCookie("knowledge_session=v1.a.b.c; kb_rail=collapsed"),
    ).toBe(true);
    expect(readRailCookie("kb_rail=expanded; knowledge_session=v1.a.b.c")).toBe(
      false,
    );
    expect(readRailCookie("knowledge_session=v1.a.b.c")).toBe(null);
  });
});
