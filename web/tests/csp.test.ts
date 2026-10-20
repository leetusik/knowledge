import { describe, expect, it } from "vitest";

import { APP_CSP, isReaderPath, newNonce, readerCsp } from "@/lib/csp";

// P30.S12 — the app CSP (defense in depth). Core because a wrong policy either
// silently disables the defense or blanks every reader page in production.

describe("app CSP", () => {
  it("blocks plugins, <base> hijack, foreign frames and third-party images everywhere", () => {
    expect(APP_CSP).toBe(
      "object-src 'none'; base-uri 'none'; frame-src 'self'; frame-ancestors 'none'; img-src 'self' data:",
    );
  });

  it("gives the reader routes a nonce'd script-src on top of the app policy", () => {
    const nonce = newNonce();
    expect(nonce).toMatch(/^[A-Za-z0-9+/]{22}==$/);
    expect(newNonce()).not.toBe(nonce);
    const policy = readerCsp(nonce);
    expect(policy.startsWith(`${APP_CSP}; `)).toBe(true);
    expect(policy).toContain(
      `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`,
    );
    expect(policy).not.toContain("unsafe-eval");
    expect(policy).not.toContain("unsafe-inline");
    // dev: React needs eval, and Next's dev server leaves its chunk tags un-nonced, so
    // same-origin scripts are trusted instead of 'strict-dynamic' (P30.S13)
    const dev = readerCsp(nonce, true);
    expect(dev).toContain("'unsafe-eval'");
    expect(dev).toContain(`script-src 'self' 'nonce-${nonce}'`);
    expect(dev).not.toContain("strict-dynamic");
  });

  it("scopes the nonce policy to the pages that render document bodies", () => {
    expect(isReaderPath("/documents/12")).toBe(true);
    expect(isReaderPath("/documents/12/versions/2")).toBe(true);
    expect(isReaderPath("/@acme/proj/books/b/c")).toBe(true);
    expect(isReaderPath("/documents")).toBe(false);
    expect(isReaderPath("/dashboard")).toBe(false);
    expect(isReaderPath("/")).toBe(false);
  });
});
