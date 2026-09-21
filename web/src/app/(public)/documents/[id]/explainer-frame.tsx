"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { Editorial } from "@/components/states";
import { AppButton } from "@/components/ui";
import { DOCUMENTS, STATES } from "@/content";

/**
 * The explainer height handshake — PARENT half.
 *
 * The one client island on the document read page. Everything around it stays a
 * server component; only the frame needs a listener, so only the frame crosses the
 * boundary. It owns no session and fetches nothing but the relay's own status (see
 * `classifyRelay` below) — it listens for the two messages the injected reporter
 * (`@/lib/explainer-height`) posts from inside the frame and turns them into a frame
 * height and a page scroll.
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
 *
 * ROUND 06 (P28.S7) adds three states around that unchanged handshake, and no new
 * capability inside it:
 *   - the waiting line, which holds the reserved box open while we wait;
 *   - `[data-unmeasured]` after `--kb-explainer-wait`, a STATED tall frame that
 *     scrolls internally (the old pre-handshake behaviour, now a decision) plus an
 *     honest note under it;
 *   - the relay's own two failures, rendered inside the reserved box.
 */

/** Frame height bounds. Below the floor is unreadable; the ceiling caps a rogue doc. */
const MIN_HEIGHT = 120;
const MAX_HEIGHT = 40000;

/** Fallback for `--kb-explainer-wait` if the sheet has not loaded (it always has). */
const DEFAULT_WAIT_MS = 4000;

/**
 * How long after the frame's `load` we give the reporter before asking the relay
 * what it actually served.
 *
 * MEASURED, not guessed (P28.S7, dev runtime): the injected reporter schedules its
 * first post 16ms after the CHILD's `DOMContentLoaded`, which necessarily precedes
 * the child's `load` — so in the healthy case a height is already in hand when this
 * would fire and the probe never runs at all. 200ms is an order of magnitude over
 * that 16ms and still imperceptible on the failure path, where it is the difference
 * between naming the failure at once and spinning for the full four seconds.
 */
const RELAY_PROBE_GRACE_MS = 200;

type ExplainerMessage =
  | { type: "kb-explainer-height"; height: number }
  | { type: "kb-explainer-anchor"; top: number };

/** What the relay answered, as far as this island needs to care. */
type RelayVerdict = "ok" | "notFound" | "upstream";

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

/** `--kb-explainer-wait` (`4s`) in milliseconds, read from the round's own token. */
function waitMs(el: Element | null): number {
  if (!el) return DEFAULT_WAIT_MS;
  const raw = getComputedStyle(el)
    .getPropertyValue("--kb-explainer-wait")
    .trim();
  const match = /^([\d.]+)(ms|s)$/.exec(raw);
  if (!match) return DEFAULT_WAIT_MS;
  const value = Number.parseFloat(match[1]);
  if (!Number.isFinite(value)) return DEFAULT_WAIT_MS;
  return match[2] === "s" ? value * 1000 : value;
}

/**
 * Ask the relay what it actually answered.
 *
 * A sandboxed opaque-origin frame is UNREADABLE from here by construction — the
 * parent can see that it loaded but never WHAT it loaded — and the relay answers a
 * failure with a JSON body (404 / 502), which the frame renders as a page like any
 * other. So the only honest way to tell "an explainer that reports nothing" from
 * "the relay said no" is to ask the relay directly, with a bodyless HEAD.
 *
 * It runs AT MOST ONCE per mount, and only once a frame has already failed to
 * report: a short grace after the iframe's `load`, on the iframe's `error`, or when
 * the wait window closes. Never in the happy path — the relay is `no-store` and
 * buffers the document upstream, so probing on every view would double the upstream
 * read of every explainer ever opened, to classify a failure that has not happened.
 */
async function classifyRelay(src: string): Promise<RelayVerdict> {
  try {
    const res = await fetch(src, { method: "HEAD", cache: "no-store" });
    if (res.ok) return "ok";
    return res.status === 404 ? "notFound" : "upstream";
  } catch {
    // Offline, aborted, blocked: not a 404, so it is the retryable branch.
    return "upstream";
  }
}

export function ExplainerFrame({ src, title }: { src: string; title: string }) {
  const frameRef = useRef<HTMLIFrameElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  // `null` until the first height message: the frame keeps its reserved per-tier
  // height, so a document that never reports is still readable.
  const [height, setHeight] = useState<number | null>(null);
  // What we have decided about a frame that has not reported: nothing yet
  // (`waiting`), the stated tall frame (`unmeasured`), or one of the relay's own
  // two failures.
  const [verdict, setVerdict] = useState<"waiting" | "unmeasured" | RelayVerdict>(
    "waiting",
  );
  // The height as a REF as well, so the timeout and the probe can read the current
  // value without re-arming themselves on every render.
  const heightRef = useRef<number | null>(null);
  const liveRef = useRef(true);
  // The relay's answer, asked for AT MOST ONCE per mount.
  const relayRef = useRef<RelayVerdict | null>(null);

  const measured = height !== null;

  /**
   * Ask the relay what it served, once, and show a FAILURE the moment we know.
   * "ok" changes nothing here: a relay that served the document fine but whose
   * document reported no height is the `unmeasured` state, and that one is the
   * record's own four-second decision, not this probe's.
   */
  const probeRelay = useCallback(async (): Promise<RelayVerdict | null> => {
    if (heightRef.current !== null) return null;
    if (relayRef.current === null) relayRef.current = await classifyRelay(src);
    const answer = relayRef.current;
    // The height can land while the probe is in flight; the document always wins.
    if (!liveRef.current || heightRef.current !== null) return answer;
    if (answer !== "ok") setVerdict(answer);
    return answer;
  }, [src]);

  /** The wait window closed with no height: name what happened. */
  const settle = useCallback(async () => {
    if (heightRef.current !== null) return;
    const answer = relayRef.current ?? (await probeRelay());
    if (!liveRef.current || heightRef.current !== null) return;
    if (answer === "ok" || answer === null) setVerdict("unmeasured");
  }, [probeRelay]);

  useEffect(() => {
    liveRef.current = true;

    function onMessage(event: MessageEvent) {
      const frame = frameRef.current;
      if (!frame || event.source !== frame.contentWindow) return;

      const msg = parseMessage(event.data);
      if (!msg) return;

      if (msg.type === "kb-explainer-height") {
        const next = Math.min(
          MAX_HEIGHT,
          Math.max(MIN_HEIGHT, Math.round(msg.height)),
        );
        heightRef.current = next;
        setHeight(next);
        // A late height beats every verdict: the document answered after all.
        setVerdict("waiting");
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

    // §3.1's `--kb-explainer-wait`: how long we wait before saying so out loud.
    const timer = window.setTimeout(() => {
      void settle();
    }, waitMs(boxRef.current));

    return () => {
      liveRef.current = false;
      window.clearTimeout(timer);
      window.removeEventListener("message", onMessage);
    };
  }, [settle]);

  const failed = verdict === "notFound" || verdict === "upstream";

  return (
    <>
      <div
        ref={boxRef}
        className="kb-explainer"
        // The three states are mutually exclusive, and a FAILED frame deliberately
        // carries neither flag: it keeps the reserved per-tier height, so the page
        // is exactly as long as it was while we waited (§8 check 22).
        data-measured={measured ? "true" : undefined}
        data-unmeasured={verdict === "unmeasured" ? "true" : undefined}
      >
        {/* §4.3 — the waiting line. Not a skeleton: we cannot know the shape of
            what is coming. It is `aria-live` so the reader who cannot see the
            spinner still learns how this ended (§6). */}
        {failed ? null : (
          <div className="kb-explainer__wait" aria-live="polite">
            <i />
            {DOCUMENTS.read.explainerLoading}
          </div>
        )}

        {/* The relay's own failure, INSIDE the frame's box (§5). The iframe stays
            mounted underneath it — it is what reserves the height — and this fills
            the box over it. §3.1 ships no class for this overlay (the record names
            only `.kb-editorial` "inside `.kb-explainer`"), so the four positioning
            declarations are inline, and they are positioning only: the surface, the
            ink and the block itself are the record's. Reported as a §5 record gap. */}
        {failed ? (
          <div
            role="status"
            style={{
              position: "absolute",
              inset: 0,
              overflow: "auto",
              background: "var(--kb-surface)",
            }}
          >
            <Editorial
              variant="inline"
              code={
                verdict === "notFound"
                  ? STATES.notFoundCode
                  : DOCUMENTS.read.explainerError.upstreamCode
              }
              sub={
                verdict === "notFound"
                  ? DOCUMENTS.read.explainerError.notFound
                  : DOCUMENTS.read.explainerError.upstream
              }
              // 404 is final — there is nothing behind the door to retry. 502 is
              // an outage, so it gets the one control that can change the answer.
              actions={
                verdict === "upstream" ? (
                  <AppButton
                    variant="secondary"
                    size="sm"
                    onClick={() => window.location.reload()}
                  >
                    {DOCUMENTS.read.explainerError.reload}
                  </AppButton>
                ) : undefined
              }
            />
          </div>
        ) : null}

        <iframe
          ref={frameRef}
          src={src}
          sandbox="allow-scripts"
          title={title}
          className="kb-explainer__frame"
          referrerPolicy="no-referrer"
          style={height === null ? undefined : { height: `${height}px` }}
          onLoad={(event) => {
            requestHeight(event.currentTarget);
            // §5's "a `load` handler that treats a non-HTML relay answer as a
            // failure". A sandboxed opaque frame cannot be read from here, so the
            // relay is asked directly — after one short grace, so the healthy
            // document's own height message gets there first and no explainer is
            // ever fetched twice. See `RELAY_PROBE_GRACE_MS`.
            window.setTimeout(() => {
              if (heightRef.current === null) void probeRelay();
            }, RELAY_PROBE_GRACE_MS);
          }}
          onError={() => {
            void probeRelay();
          }}
        />
      </div>

      {/* §4.3 — the honest footnote. ALWAYS in the DOM: `kb-docview.css` reveals it
          only for `[data-unmeasured]`, and `kb-print.css` (P28.S8) reveals its own
          second note in the same slot. It must be the IMMEDIATE next sibling of
          `.kb-explainer` — that adjacency is the rule that shows it. */}
      <p className="kb-explainer__note">
        {DOCUMENTS.read.explainerUnmeasured}
      </p>
    </>
  );
}
