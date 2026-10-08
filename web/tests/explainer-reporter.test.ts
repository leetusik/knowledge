import { describe, expect, it } from "vitest";

import { injectHeightReporter } from "@/lib/explainer-height";

// P25.F4 — the CHILD half of the explainer height handshake, executed for real.
//
// The reporter is source text spliced into a relayed document, so the only way to
// pin its behaviour is to run it. It touches a small, fixed slice of the DOM, so the
// harness below is a hand-rolled window/document rather than a jsdom dependency (the
// suite is node-environment by design — see vitest.config.ts).
//
// What matters here is the ONE rule the fix turns on: the reporter dedupes every
// height message except the one the parent explicitly asks for. Without that
// exception a parent island that hydrated after the frame loaded never hears a
// height at all and the frame keeps its CSS fallback height forever.

type Post = { type: string; height?: number };

/** Execute the injected reporter against a fake frame; hand back its outbound posts. */
function runReporter(height = 400, viewport: [number, number] = [800, 600]) {
  const posts: Post[] = [];
  const listeners = new Map<string, ((event: unknown) => void)[]>();
  const on = (type: string, fn: (event: unknown) => void) => {
    listeners.set(type, [...(listeners.get(type) ?? []), fn]);
  };

  const parent = { postMessage: (data: Post) => posts.push(data) };
  const margins = { marginTop: "0px", marginBottom: "0px" };
  const win = {
    parent,
    addEventListener: on,
    setTimeout: (fn: () => void) => (fn(), 0), // synchronous: the debounce is not under test
    getComputedStyle: () => margins,
    scrollY: 0,
    location: { hash: "" },
    innerWidth: viewport[0],
    innerHeight: viewport[1],
  };
  // The root's horizontal scrollbar is `innerHeight − clientHeight` (0 = overlay
  // scrollbars, or nothing overflowing sideways). In quirks mode the viewport's
  // `clientHeight` moves to `body`, and the root reports its content height instead.
  let bar = 0;
  let quirks = false;
  const viewportHeight = () => win.innerHeight - bar;
  const root = {
    get clientHeight() {
      return quirks ? 99999 : viewportHeight();
    },
  };
  // `offsetHeight`/`scrollHeight` are integer-rounded in a real browser; the
  // bounding box is not.
  const body = {
    scrollHeight: Math.round(height),
    offsetHeight: Math.round(height),
    getBoundingClientRect: () => ({ height }),
    get clientHeight() {
      return quirks ? viewportHeight() : Math.round(height);
    },
  };
  const doc = {
    readyState: "complete",
    get compatMode() {
      return quirks ? "BackCompat" : "CSS1Compat";
    },
    documentElement: root,
    body,
    addEventListener: () => {},
    getElementById: () => null,
    getElementsByName: () => [],
  };

  const source = injectHeightReporter("")
    .replace(/^<script>/, "")
    .replace(/<\/script>$/, "");
  new Function("window", "document", source)(win, doc);

  const fire = (type: string, event: unknown) =>
    (listeners.get(type) ?? []).forEach((fn) => fn(event));

  return {
    posts,
    parent,
    fire,
    /** Content reflowed to a new height; the reporter hears it as a resize. */
    reflow: (h: number) => {
      height = h;
      body.scrollHeight = Math.round(h);
      body.offsetHeight = Math.round(h);
      fire("resize", {});
    },
    /** The body's collapsed margins (the template's `margin: 2rem auto`). */
    margin: (top: string, bottom: string) => {
      margins.marginTop = top;
      margins.marginBottom = bottom;
    },
    /** A classic scrollbar of `px` appeared (or went) along the root's bottom edge. */
    scrollbar: (px: number, inQuirksMode = false) => {
      bar = px;
      quirks = inQuirksMode;
      fire("resize", {});
    },
    /** The frame's viewport changed (no event fired — pair it with `reflow`). */
    viewport: (w: number, h: number) => {
      win.innerWidth = w;
      win.innerHeight = h;
    },
  };
}

/** The runaway latch's size, mirrored from the reporter source. */
const BUDGET = 300;

describe("the injected explainer height reporter", () => {
  it("reports once and then dedupes an unchanged height", () => {
    const { posts, fire } = runReporter(400);
    expect(posts).toEqual([{ type: "kb-explainer-height", height: 400 }]);

    fire("load", {});
    fire("resize", {});
    expect(posts).toHaveLength(1);
  });

  it("re-posts the unchanged height when the PARENT asks (the hydration-race fix)", () => {
    const { posts, parent, fire } = runReporter(400);
    fire("message", { source: parent, data: { type: "kb-explainer-request" } });

    expect(posts).toEqual([
      { type: "kb-explainer-height", height: 400 },
      { type: "kb-explainer-height", height: 400 },
    ]);
  });

  it("ignores a request that is not from the parent window, or is not a request", () => {
    const { posts, parent, fire } = runReporter(400);
    fire("message", { source: {}, data: { type: "kb-explainer-request" } });
    fire("message", { source: parent, data: "kb-explainer-request" });
    fire("message", { source: parent, data: { type: "kb-explainer-height" } });

    expect(posts).toHaveLength(1);
  });

  // P28.F2 — the runaway latch counted legitimate width-driven reflow, so after a
  // few seconds of window drag the frame was stuck at a stale height for good.

  it("still latches a runaway that grows at a CONSTANT width", () => {
    const { posts, reflow } = runReporter(400);
    for (let i = 1; i <= BUDGET + 50; i++) reflow(400 + i * 10);

    expect(posts).toHaveLength(BUDGET);
  });

  it("re-arms the latch when the viewport WIDTH changes", () => {
    const { posts, reflow, viewport } = runReporter(400);
    for (let i = 1; i < BUDGET; i++) reflow(400 + i * 10);
    expect(posts).toHaveLength(BUDGET);

    reflow(9000); // spent at this width
    expect(posts).toHaveLength(BUDGET);

    viewport(560, 600);
    reflow(12000);
    expect(posts.at(-1)).toEqual({
      type: "kb-explainer-height",
      height: 12000,
    });
  });

  it("posts nothing from a 0x0 viewport and spends no budget there", () => {
    const { posts, reflow, viewport } = runReporter(64, [0, 0]);
    reflow(90820);
    expect(posts).toEqual([]);

    viewport(800, 600);
    for (let i = 1; i <= BUDGET - 1; i++) reflow(400 + i * 10);
    viewport(0, 0);
    for (let i = 1; i <= 20; i++) reflow(64 + i * 10);
    viewport(800, 600); // same width as before: no re-arm
    reflow(7777);

    expect(posts).toHaveLength(BUDGET);
    expect(posts.at(-1)).toEqual({ type: "kb-explainer-height", height: 7777 });
  });

  it("answers a parent request with exactly ONE post while latched", () => {
    const { posts, parent, fire, reflow } = runReporter(400);
    for (let i = 1; i < BUDGET; i++) reflow(400 + i * 10);
    reflow(9000);
    expect(posts).toHaveLength(BUDGET);

    fire("message", { source: parent, data: { type: "kb-explainer-request" } });
    expect(posts).toHaveLength(BUDGET + 1);

    reflow(9500);
    expect(posts).toHaveLength(BUDGET + 1);
  });

  // P28.F2 — integer-rounded offsetHeight/scrollHeight under-reported a fractional
  // body box by up to 0.5px, a real inner scroll range at DPR 2.

  it("rounds the FRACTIONAL body box up, margins included", () => {
    const { posts, margin, reflow } = runReporter(400);
    margin("32px", "32px");
    reflow(1000.3);

    expect(posts.at(-1)).toEqual({ type: "kb-explainer-height", height: 1065 });
  });

  // P28.F3 — with layout-taking (classic) scrollbars, a document wider than its frame
  // draws a horizontal bar INSIDE the frame; uncounted, it left a 14px inner scroll.

  it("adds a classic horizontal scrollbar to the posted height", () => {
    const { posts, scrollbar } = runReporter(400);
    scrollbar(15);
    expect(posts.at(-1)).toEqual({ type: "kb-explainer-height", height: 415 });

    scrollbar(0); // the sideways overflow went away
    expect(posts.at(-1)).toEqual({ type: "kb-explainer-height", height: 400 });
  });

  it("reads the scrollbar off body in quirks mode", () => {
    const { posts, scrollbar } = runReporter(400);
    scrollbar(15, true);
    expect(posts.at(-1)).toEqual({ type: "kb-explainer-height", height: 415 });
  });

  it("posts a 1px growth but not a 1px shrink", () => {
    const { posts, reflow } = runReporter(400);
    reflow(401);
    expect(posts.at(-1)).toEqual({ type: "kb-explainer-height", height: 401 });

    reflow(400);
    expect(posts).toHaveLength(2);

    reflow(399); // 2px below the last post
    expect(posts.at(-1)).toEqual({ type: "kb-explainer-height", height: 399 });
  });
});
