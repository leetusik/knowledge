import { describe, expect, it } from "vitest";

import {
  DEFAULT_READER_SETTINGS,
  parseReaderCookie,
  readReaderCookie,
  readerCookieString,
  schemeFor,
  serializeReaderCookie,
} from "@/lib/reader-cookie";

// P30.S13 — the `kb_reader` device cookie (P29 *S3 Who keeps state*): the server reads
// it for the first paint, so a missing or tampered value must read as the default and
// never throw, and a field the reader did not write (the library's grouping) must
// survive the reader's own write.
describe("kb_reader", () => {
  it("parses a written value and round-trips it", () => {
    const settings = { size: 5, theme: "sepia" } as const;
    expect(parseReaderCookie(serializeReaderCookie(settings))).toEqual(
      settings,
    );
  });

  it("falls back to the default for absent or tampered values, field by field", () => {
    expect(parseReaderCookie(undefined)).toEqual(DEFAULT_READER_SETTINGS);
    expect(parseReaderCookie("")).toEqual(DEFAULT_READER_SETTINGS);
    expect(parseReaderCookie("size=9&theme=neon")).toEqual(
      DEFAULT_READER_SETTINGS,
    );
    expect(parseReaderCookie("%%%&&&===")).toEqual(DEFAULT_READER_SETTINGS);
    expect(parseReaderCookie("x".repeat(500))).toEqual(DEFAULT_READER_SETTINGS);
    // one bad field does not take the good one down
    expect(parseReaderCookie("size=4&theme=neon")).toEqual({
      size: 4,
      theme: "system",
    });
  });

  it("keeps the library's grouping through a reader write", () => {
    const parsed = parseReaderCookie("size=2&theme=dark&libraryGroup=subject");
    expect(parsed.libraryGroup).toBe("subject");
    expect(serializeReaderCookie({ ...parsed, size: 3 })).toContain(
      "libraryGroup=subject",
    );
  });

  it("reads its own cookie out of a jar that also holds the sealed session", () => {
    const jar =
      "knowledge_session=v1.abc=.def; kb_reader=size=1&theme=light; kb_rail=collapsed";
    expect(readReaderCookie(jar)).toEqual({ size: 1, theme: "light" });
    expect(readReaderCookie("knowledge_session=v1.x")).toEqual(
      DEFAULT_READER_SETTINGS,
    );
  });

  it("writes a Lax, one-year, JS-writable cookie (Secure only on https)", () => {
    const http = readerCookieString(DEFAULT_READER_SETTINGS, false);
    expect(http).toContain("SameSite=Lax");
    expect(http).toContain("Max-Age=31536000");
    expect(http).not.toContain("HttpOnly");
    expect(http).not.toContain("Secure");
    expect(readerCookieString(DEFAULT_READER_SETTINGS, true)).toContain(
      "Secure",
    );
  });

  it("maps a theme choice to the root's color scheme (system is light until the device says dark)", () => {
    expect(schemeFor("system")).toBe("default");
    expect(schemeFor("light")).toBe("default");
    expect(schemeFor("dark")).toBe("slate");
    expect(schemeFor("sepia")).toBe("sepia");
  });
});
