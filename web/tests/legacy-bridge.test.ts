import { describe, expect, it } from "vitest";

import {
  LEGACY_SANDBOX,
  lookOf,
  navigatePath,
  readBridgeMessage,
  restoreMessage,
} from "@/lib/legacy/messages";

// P30.S25 — the legacy reader's message boundary (very core: explainer html is
// untrusted, and this is the only thing it can hand the parent). A message counts only
// when it comes from THIS frame's window, has exactly the drawn shape, fits the size
// cap, and (for `navigate`) names a reader address on this origin.

const frame = { name: "the frame's contentWindow" };
const other = { name: "some other window" };
const scroll = {
  kb: "legacy",
  v: 1,
  type: "scroll",
  fraction: 0.42,
  anchor: "trees",
};

describe("readBridgeMessage", () => {
  it("accepts the drawn scroll message from this frame", () => {
    expect(readBridgeMessage(frame, frame, scroll)).toEqual({
      type: "scroll",
      fraction: 0.42,
      anchor: "trees",
    });
    expect(
      readBridgeMessage(frame, frame, { ...scroll, anchor: null }),
    ).toEqual({ type: "scroll", fraction: 0.42, anchor: null });
  });

  it("refuses a message from any other window, or when there is no frame", () => {
    expect(readBridgeMessage(other, frame, scroll)).toBeNull();
    expect(readBridgeMessage(null, frame, scroll)).toBeNull();
    expect(readBridgeMessage(frame, null, scroll)).toBeNull();
    expect(readBridgeMessage(undefined, undefined, scroll)).toBeNull();
  });

  it("refuses bad shapes", () => {
    const bad: unknown[] = [
      null,
      "scroll",
      42,
      [scroll],
      { ...scroll, kb: "other" },
      { ...scroll, v: 2 },
      { ...scroll, type: "restore" },
      { ...scroll, type: "height" },
      { ...scroll, fraction: 1.5 },
      { ...scroll, fraction: -0.1 },
      { ...scroll, fraction: Number.NaN },
      { ...scroll, fraction: "0.4" },
      { ...scroll, anchor: 7 },
      { ...scroll, anchor: "" },
      { ...scroll, anchor: "a\nb" },
      { ...scroll, extra: true },
      { kb: "legacy", v: 1, type: "scroll" },
      Object.assign(Object.create({ polluted: true }), scroll),
    ];
    for (const data of bad)
      expect(readBridgeMessage(frame, frame, data)).toBeNull();
  });

  it("refuses oversized messages", () => {
    expect(
      readBridgeMessage(frame, frame, { ...scroll, anchor: "x".repeat(201) }),
    ).toBeNull();
    expect(
      readBridgeMessage(frame, frame, {
        kb: "legacy",
        v: 1,
        type: "navigate",
        href: `/documents/1#${"x".repeat(5000)}`,
      }),
    ).toBeNull();
    const cyclic: Record<string, unknown> = { ...scroll };
    cyclic.anchor = cyclic;
    expect(readBridgeMessage(frame, frame, cyclic)).toBeNull();
  });

  it("routes a navigate only to a reader address on this origin", () => {
    const nav = (href: unknown) =>
      readBridgeMessage(frame, frame, {
        kb: "legacy",
        v: 1,
        type: "navigate",
        href,
      });
    expect(nav("/documents/12")).toEqual({
      type: "navigate",
      path: "/documents/12",
    });
    expect(
      nav("/@quillwork/tide/books/datums/chart-datum?lang=ko#trees"),
    ).toEqual({
      type: "navigate",
      path: "/@quillwork/tide/books/datums/chart-datum?lang=ko#trees",
    });
    for (const href of [
      "https://evil.example/documents/1",
      "//evil.example/documents/1",
      "/\\evil.example",
      "javascript:alert(1)",
      "JavaScript:alert(1)",
      "data:text/html,<script>1</script>",
      "/%2F%2Fevil.example",
      "/api/documents/1/raw",
      "/login",
      "/settings/keys",
      "/library",
      "documents/1",
      "",
      7,
      null,
    ]) {
      expect(nav(href)).toBeNull();
    }
  });
});

describe("navigatePath", () => {
  it("keeps the query and hash of a reader path, normalised", () => {
    expect(navigatePath("/documents/3/versions/2")).toBe(
      "/documents/3/versions/2",
    );
    expect(navigatePath("/@org/proj/a-doc?v=2")).toBe("/@org/proj/a-doc?v=2");
    expect(navigatePath("/@org/proj/books/b")).toBe("/@org/proj/books/b");
    expect(navigatePath("/@org/proj/../proj/x")).toBe("/@org/proj/x");
  });
});

describe("restoreMessage", () => {
  it("builds the drawn restore and drops anything out of range", () => {
    expect(restoreMessage({ anchor: "trees", fraction: 0.3 })).toEqual({
      kb: "legacy",
      v: 1,
      type: "restore",
      anchor: "trees",
      fraction: 0.3,
    });
    expect(restoreMessage({ anchor: null, fraction: 2 })).toEqual({
      kb: "legacy",
      v: 1,
      type: "restore",
    });
  });
});

describe("the sandbox", () => {
  it("runs scripts and opens popups, never with the app's origin or top navigation", () => {
    const tokens = LEGACY_SANDBOX.split(" ");
    expect(tokens).toEqual([
      "allow-scripts",
      "allow-popups",
      "allow-popups-to-escape-sandbox",
    ]);
    expect(tokens).not.toContain("allow-same-origin");
    expect(tokens.some((t) => t.startsWith("allow-top-navigation"))).toBe(
      false,
    );
  });
});

describe("lookOf", () => {
  it("reads a self-darkening document as auto, anything else as light", () => {
    expect(
      lookOf("<style>@media (prefers-color-scheme: dark){body{}}</style>"),
    ).toBe("auto");
    expect(lookOf("<style>:root{color-scheme: light dark}</style>")).toBe(
      "auto",
    );
    expect(lookOf('<meta name="color-scheme" content="light dark">')).toBe(
      "auto",
    );
    expect(lookOf("<style>body{background:#fbfbfa}</style>")).toBe("light");
  });
});
