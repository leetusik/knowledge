"use client";

import { useEffect, useRef, useState } from "react";

/**
 * The explainer height handshake — PARENT half.
 *
 * The one client island on the document read page. Everything around it stays a
 * server component; only the frame needs a listener, so only the frame crosses the
 * boundary. It owns no session and fetches nothing — it listens for the two messages
 * the injected reporter (`@/lib/explainer-height`) posts from inside the frame and
 * turns them into a frame height and a page scroll.
 *
 * Why the frame grows at all: the explainer used to be pinned to a viewport-derived
 * height and scrolled INTERNALLY, which put a small scrolling window inside an
 * already-scrolling page. Sized to its content, the frame stops scrolling and the
 * page does it — one document, one scrollbar.
 *
 * The trust boundary is unchanged. `sandbox="allow-scripts"` WITHOUT
 * `allow-same-origin` stays verbatim (P16 pinned decision 1), so the framed document
 * keeps its opaque origin. That is exactly why `event.origin` cannot be checked here —
 * it is the literal string `"null"` for every opaque origin, shared by any other
 * sandboxed frame — so the sender is identified by `event.source` window identity
 * instead, and the payload is shape-checked and clamped. The worst a hostile explainer
 * can do through this channel is mis-size or mis-scroll its own frame.
 */

/** Frame height bounds. Below the floor is unreadable; the ceiling caps a rogue doc. */
const MIN_HEIGHT = 120;
const MAX_HEIGHT = 40000;

type ExplainerMessage =
  | { type: "kb-explainer-height"; height: number }
  | { type: "kb-explainer-anchor"; top: number };

/** Narrow untrusted `event.data` to a message we act on. */
function parseMessage(data: unknown): ExplainerMessage | null {
  if (typeof data !== "object" || data === null) return null;
  const msg = data as Record<string, unknown>;
  if (msg.type === "kb-explainer-height" && Number.isFinite(msg.height)) {
    return { type: "kb-explainer-height", height: msg.height as number };
  }
  if (msg.type === "kb-explainer-anchor" && Number.isFinite(msg.top)) {
    return { type: "kb-explainer-anchor", top: msg.top as number };
  }
  return null;
}

/**
 * Ask the framed document to re-send its height.
 *
 * The frame's `src` is in the SSR HTML, so the child can load and post its first
 * height message before this island hydrates and attaches the listener below — and
 * the child dedupes (it only re-posts when the height CHANGES), so a missed first
 * message latches: the frame keeps its CSS fallback height until something moves it,
 * which is why a window resize used to be the only way to un-wedge it. This request
 * makes the handshake deterministic, and it is fired from both sides of the race:
 * on listener attach (covers a frame that already finished loading) and on the
 * iframe's `load` (covers one that had not).
 *
 * `"*"` as targetOrigin is mandatory, not laziness: the framed document has an
 * OPAQUE origin (`sandbox="allow-scripts"` without `allow-same-origin`), so no
 * concrete origin string can ever match it. Nothing leaks — the message is delivered
 * to this one frame's window only, and it carries no data.
 */
function requestHeight(frame: HTMLIFrameElement | null) {
  frame?.contentWindow?.postMessage({ type: "kb-explainer-request" }, "*");
}

export function ExplainerFrame({ src, title }: { src: string; title: string }) {
  const frameRef = useRef<HTMLIFrameElement>(null);
  // `null` until the first height message: the frame keeps its CSS fallback height
  // and scrolls internally, so a document that never reports is still readable.
  const [height, setHeight] = useState<number | null>(null);

  useEffect(() => {
    function onMessage(event: MessageEvent) {
      const frame = frameRef.current;
      if (!frame || event.source !== frame.contentWindow) return;

      const msg = parseMessage(event.data);
      if (!msg) return;

      if (msg.type === "kb-explainer-height") {
        setHeight(
          Math.min(MAX_HEIGHT, Math.max(MIN_HEIGHT, Math.round(msg.height))),
        );
        return;
      }
      // An in-page "Contents" link. A content-height frame has nothing left to
      // scroll, so the jump is replayed against the PAGE at the section's offset
      // inside the frame — inset by the sticky `.kb-topbar`, which both shells
      // render and which would otherwise cover the heading we just scrolled to.
      // The bar is measured rather than read from `--kb-app-topbar-h`, so no rem
      // conversion can drift.
      const bar = document.querySelector(".kb-topbar");
      const inset = (bar ? bar.getBoundingClientRect().height : 0) + 12;
      const top = Math.max(
        0,
        frame.getBoundingClientRect().top + window.scrollY + msg.top - inset,
      );
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      window.scrollTo({ top, behavior: reduced ? "auto" : "smooth" });
    }

    window.addEventListener("message", onMessage);
    // Now that we can hear an answer, ask — the frame may have loaded (and posted
    // its only height message) long before this island hydrated.
    requestHeight(frameRef.current);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  return (
    <div
      className="kb-explainer"
      data-measured={height === null ? undefined : "true"}
    >
      <iframe
        ref={frameRef}
        src={src}
        sandbox="allow-scripts"
        title={title}
        className="kb-explainer__frame"
        referrerPolicy="no-referrer"
        style={height === null ? undefined : { height: `${height}px` }}
        onLoad={(event) => requestHeight(event.currentTarget)}
      />
    </div>
  );
}
