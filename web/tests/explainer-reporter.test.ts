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
function runReporter(height = 400) {
  const posts: Post[] = [];
  const listeners = new Map<string, ((event: unknown) => void)[]>();
  const on = (type: string, fn: (event: unknown) => void) => {
    listeners.set(type, [...(listeners.get(type) ?? []), fn]);
  };

  const parent = { postMessage: (data: Post) => posts.push(data) };
  const win = {
    parent,
    addEventListener: on,
    setTimeout: (fn: () => void) => (fn(), 0), // synchronous: the debounce is not under test
    getComputedStyle: () => ({ marginTop: "0px", marginBottom: "0px" }),
    scrollY: 0,
    location: { hash: "" },
  };
  const doc = {
    readyState: "complete",
    body: { scrollHeight: height, offsetHeight: height },
    addEventListener: () => {},
    getElementById: () => null,
    getElementsByName: () => [],
  };

  const source = injectHeightReporter("")
    .replace(/^<script>/, "")
    .replace(/<\/script>$/, "");
  new Function("window", "document", source)(win, doc);

  return {
    posts,
    parent,
    fire: (type: string, event: unknown) =>
      (listeners.get(type) ?? []).forEach((fn) => fn(event)),
  };
}

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
});
