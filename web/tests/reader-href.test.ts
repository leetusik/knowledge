import { describe, expect, it } from "vitest";

import { safeNextPath } from "@/lib/next-path";
import {
  bookHref,
  chapterRedirectHref,
  orgSegment,
  readerHref,
  signInToSaveHref,
} from "@/lib/reader-href";

// P30.S11 — the reader's URL builders. Core because every reader, book and
// "Sign in to save" link is built here: a wrong org segment is a dead link for a
// whole tenant, and the round trip through the gate is what returns a reader to
// their place. Pure functions, no rendering.

const TENANT_ID = "3f1c2b7a-9d4e-4c1a-8b2f-0e6d5a4c3b21";

describe("orgSegment", () => {
  it("is the org slug when the tenant has one", () => {
    expect(orgSegment({ id: TENANT_ID, slug: "acme" })).toBe("acme");
  });

  it("falls back to the tenant id for a null or empty slug (OQ26)", () => {
    expect(orgSegment({ id: TENANT_ID, slug: null })).toBe(TENANT_ID);
    expect(orgSegment({ id: TENANT_ID })).toBe(TENANT_ID);
    expect(orgSegment({ id: TENANT_ID, slug: "" })).toBe(TENANT_ID);
  });
});

describe("readerHref", () => {
  const chapter = {
    kind: "chapter" as const,
    org: "acme",
    project: "handbook",
    book: "phases",
    chapter: "p8",
  };

  it("builds the chapter route on the org segment", () => {
    expect(readerHref(chapter)).toBe("/@acme/handbook/books/phases/p8");
    expect(bookHref(chapter)).toBe("/@acme/handbook/books/phases");
    expect(
      readerHref({
        ...chapter,
        org: orgSegment({ id: TENANT_ID, slug: null }),
      }),
    ).toBe(`/@${TENANT_ID}/handbook/books/phases/p8`);
  });

  it("carries language, version and section", () => {
    expect(
      readerHref(chapter, { lang: "ko", version: 2, section: "s-intro" }),
    ).toBe("/@acme/handbook/books/phases/p8?lang=ko&v=2#s-intro");
  });

  it("uses a loose document's canonical path, else its id URL", () => {
    expect(
      readerHref(
        {
          kind: "document",
          id: 41,
          canonicalPath: "/@acme/handbook/onboarding",
        },
        { section: "b-3" },
      ),
    ).toBe("/@acme/handbook/onboarding#b-3");
    expect(readerHref({ kind: "document", id: 41, canonicalPath: null })).toBe(
      "/documents/41",
    );
  });

  it("encodes segments so none can escape the route", () => {
    expect(readerHref({ ...chapter, project: "a/b", chapter: "../x" })).toBe(
      "/@acme/a%2Fb/books/phases/..%2Fx",
    );
  });
});

describe("Sign in to save — the round trip at the URL level", () => {
  it("returns to the same chapter, language, version and block", () => {
    const place = { lang: "ko", version: 3, section: "callout-2" };
    const target = {
      kind: "chapter" as const,
      org: "acme",
      project: "handbook",
      book: "phases",
      chapter: "p8",
    };
    const href = signInToSaveHref(target, place);
    expect(href.startsWith("/login?next=")).toBe(true);

    // What /login does: read `next` from its query, launder it, and land there.
    const next = new URL(href, "https://kb.test").searchParams.get("next");
    expect(safeNextPath(next)).toBe(readerHref(target, place));
    expect(safeNextPath(next)).toBe(
      "/@acme/handbook/books/phases/p8?lang=ko&v=3#callout-2",
    );
  });

  it("round-trips a slug-less tenant's chapter too", () => {
    const target = {
      kind: "chapter" as const,
      org: orgSegment({ id: TENANT_ID, slug: null }),
      project: "handbook",
      book: "phases",
      chapter: "p8",
    };
    const next = new URL(
      signInToSaveHref(target, { section: "h-1" }),
      "https://kb.test",
    ).searchParams.get("next");
    expect(safeNextPath(next)).toBe(
      `/@${TENANT_ID}/handbook/books/phases/p8#h-1`,
    );
  });
});

// P30.F4 (OQ183) — a bound chapter opened by its loose address goes to its chapter URL.
// Core because a wrong decision either strands a chapter outside its book or sends a
// loose document somewhere it is not; the query must survive (`?v=` is a version).
describe("chapterRedirectHref", () => {
  const bound = {
    project: "tidewater",
    canonical_path: "/@s27org/tidewater/tw-9",
    chapter: { book: "tide", chapter_key: "tw-9", lang: "en" },
  };

  it("sends a bound chapter to its chapter URL, keeping ?v= and ?lang=", () => {
    expect(chapterRedirectHref(bound)).toBe(
      "/@s27org/tidewater/books/tide/tw-9?lang=en",
    );
    expect(chapterRedirectHref(bound, { v: 2, lang: "ko" })).toBe(
      "/@s27org/tidewater/books/tide/tw-9?lang=ko&v=2",
    );
  });

  it("leaves an unbound document, and one with no org to build on, alone", () => {
    expect(chapterRedirectHref({ ...bound, chapter: null })).toBeNull();
    expect(chapterRedirectHref({ ...bound, chapter: undefined })).toBeNull();
    expect(chapterRedirectHref({ ...bound, canonical_path: null })).toBeNull();
  });
});
