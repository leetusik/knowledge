"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";

import { Editorial } from "@/components/states";
import { AppButton } from "@/components/ui";
import { DOCUMENTS, STATES } from "@/content";
import { PRINT_COLUMN_PX } from "@/lib/explainer-height";

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
 *
 * P28.F4 adds the PAPER size, because the screen size was printing a truncated
 * document. The inline `height` beats `kb-print.css`'s `height: auto` (and an iframe
 * has no content-auto height anyway), so the frame printed at its SCREEN height while
 * the child re-laid itself out at the narrower paper column — taller — and the rest
 * was cut off silently: fixture 70 lost paragraphs 102–119 of 120, and production
 * docs 30/33 their last quiz questions. For print the frame is therefore PINNED to
 * the paper column (`PRINT_COLUMN_PX`) at a height measured at that width, and put
 * back on `afterprint`. Two routes in, because they can wait for different things:
 *   - Export PDF asks first (`prepareExplainersForPrint`): the frame is pinned on
 *     screen, the child is asked until it answers FROM that width, and only then
 *     does the control call `print()` — a real measurement of the real layout.
 *   - ⌘P (or the browser's menu) gives us `beforeprint` and nothing else: print
 *     layout follows it synchronously, so no answer can be awaited. The frame is
 *     pinned there and then, at the paper-column height the child already
 *     volunteered with its last height message (`kb-explainer-print`).
 * Nothing on the sheet changes but its completeness: no new rule, no copy, the frame
 * still has no border on paper. On US Letter (a 702px column) the explainer is laid
 * out 22px narrower than the column instead of leaving blank space after it.
 */

/** Ask every framed explainer on the page to size itself for paper. */
export const PRINT_PREPARE_EVENT = "kb-explainer-print-prepare";
/** Put every framed explainer back to its screen size (Export PDF gave up). */
export const PRINT_RELEASE_EVENT = "kb-explainer-print-release";

type PrintPrepareDetail = { waitUntil: (ready: Promise<boolean>) => void };

/**
 * How long a frame waits for its document to answer from the paper column.
 *
 * ORIGINATED (P28.F4). Measured: the answer lands in tens of milliseconds — one
 * relayout of the child, its 16ms debounce, one `postMessage` — so this is about
 * two orders of magnitude of headroom, and still short enough that a dead frame
 * costs the reader one brief "Preparing…" rather than a hang.
 */
const PRINT_PREPARE_TIMEOUT_MS = 2000;

/** How often an unanswered frame is asked again while it is pinned for paper. */
const PRINT_REQUEST_INTERVAL_MS = 250;

/**
 * Export PDF's half of the paper handshake: pin every framed explainer to the paper
 * column and resolve once each has a height measured there. Resolves `false` when a
 * frame had nothing to offer within its timeout — neither a real answer nor a
 * paper-column height volunteered earlier — so the caller can warn before printing.
 * A page with no framed explainer resolves `true` at once.
 */
export function prepareExplainersForPrint(): Promise<boolean> {
  const waits: Promise<boolean>[] = [];
  const detail: PrintPrepareDetail = {
    waitUntil: (ready) => waits.push(ready),
  };
  window.dispatchEvent(new CustomEvent(PRINT_PREPARE_EVENT, { detail }));
  return Promise.all(waits).then((all) => all.every(Boolean));
}

/** Undo `prepareExplainersForPrint` without printing. `afterprint` does it otherwise. */
export function releaseExplainersAfterPrint(): void {
  window.dispatchEvent(new Event(PRINT_RELEASE_EVENT));
}

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
  | { type: "kb-explainer-print"; height: number; width: number }
  | { type: "kb-explainer-anchor"; top: number };

/** The parent's clamp, applied to every height the child sends, screen or paper. */
function clampHeight(raw: number): number {
  return Math.min(MAX_HEIGHT, Math.max(MIN_HEIGHT, Math.round(raw)));
}

/** What the relay answered, as far as this island needs to care. */
type RelayVerdict = "ok" | "notFound" | "upstream";

/** Narrow untrusted `event.data` to a message we act on. */
function parseMessage(data: unknown): ExplainerMessage | null {
  if (typeof data !== "object" || data === null) return null;
  const msg = data as Record<string, unknown>;
  if (msg.type === "kb-explainer-height" && Number.isFinite(msg.height)) {
    return { type: "kb-explainer-height", height: msg.height as number };
  }
  if (
    msg.type === "kb-explainer-print" &&
    Number.isFinite(msg.height) &&
    Number.isFinite(msg.width)
  ) {
    return {
      type: "kb-explainer-print",
      height: msg.height as number,
      width: msg.width as number,
    };
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
  // The verdict as a ref too, for the print listeners registered once per mount.
  const verdictRef = useRef(verdict);
  useEffect(() => {
    verdictRef.current = verdict;
  }, [verdict]);

  // ── Paper (P28.F4) ──────────────────────────────────────────────────────
  // The child's latest paper-column height and the width it was sent FROM. Only a
  // `width` equal to `PRINT_COLUMN_PX` is a real measurement of the real layout;
  // any other is the reporter's emulation, good enough for ⌘P.
  const paperRef = useRef<{ height: number; width: number } | null>(null);
  // `null` = screen layout. Otherwise the frame is PINNED to the paper column, at
  // `height` when one is known (else its CSS height stands).
  const [pin, setPin] = useState<{ height: number | null } | null>(null);
  const pinnedRef = useRef(false);
  // The screen height at the moment of pinning, put back on release so the screen
  // returns exactly as it was (the child's posts from the paper width say nothing
  // about the screen).
  const screenHeightRef = useRef<number | null>(null);
  // Export PDF's pending waiters, resolved by a real answer, a timeout or a release.
  const waitersRef = useRef<((ready: boolean) => void)[]>([]);
  const askTimerRef = useRef<number | null>(null);
  const giveUpTimerRef = useRef<number | null>(null);

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

  /** Settle every Export PDF waiter and stop asking. */
  const settleWaiters = useCallback((ready: boolean) => {
    if (askTimerRef.current !== null) {
      window.clearInterval(askTimerRef.current);
      askTimerRef.current = null;
    }
    if (giveUpTimerRef.current !== null) {
      window.clearTimeout(giveUpTimerRef.current);
      giveUpTimerRef.current = null;
    }
    const waiters = waitersRef.current;
    waitersRef.current = [];
    waiters.forEach((resolve) => resolve(ready));
  }, []);

  /**
   * Pin the frame to the paper column. SYNCHRONOUS on purpose (`flushSync`): from
   * `beforeprint` the DOM must carry the new size before this handler returns,
   * because print layout runs right after it — a scheduled render would land on
   * the screen after the sheet had already been laid out at the old size.
   */
  const pinForPaper = useCallback((paperHeight: number | null) => {
    if (!pinnedRef.current) screenHeightRef.current = heightRef.current;
    pinnedRef.current = true;
    flushSync(() => setPin({ height: paperHeight }));
  }, []);

  /** Back to the screen size, and ask the child for its screen height again. */
  const releasePaper = useCallback(() => {
    settleWaiters(false);
    if (!pinnedRef.current) return;
    pinnedRef.current = false;
    const screen = screenHeightRef.current;
    screenHeightRef.current = null;
    setPin(null);
    if (screen !== null) {
      heightRef.current = screen;
      setHeight(screen);
    }
    requestHeight(frameRef.current);
  }, [settleWaiters]);

  useEffect(() => {
    liveRef.current = true;

    function onMessage(event: MessageEvent) {
      const frame = frameRef.current;
      if (!frame || event.source !== frame.contentWindow) return;

      const msg = parseMessage(event.data);
      if (!msg) return;

      if (msg.type === "kb-explainer-height") {
        const next = clampHeight(msg.height);
        heightRef.current = next;
        setHeight(next);
        // A late height beats every verdict: the document answered after all.
        setVerdict("waiting");
        return;
      }
      if (msg.type === "kb-explainer-print") {
        const paper = { height: clampHeight(msg.height), width: msg.width };
        paperRef.current = paper;
        if (!pinnedRef.current) return;
        if (paper.width === PRINT_COLUMN_PX) {
          // The child answered FROM the paper column: this is the height the
          // sheet will have. Applied synchronously so a `print()` queued behind
          // the waiters can never run against the previous size.
          flushSync(() => setPin({ height: paper.height }));
          settleWaiters(true);
        } else if (waitersRef.current.length > 0) {
          // It answered from its old width — the resize had not reached it yet.
          // Ask again; the next answer comes from the pinned width.
          requestHeight(frame);
        }
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

    // Export PDF: pin now, then ask until the child answers from the paper column.
    function onPrepare(event: Event) {
      const detail = (event as CustomEvent<PrintPrepareDetail>).detail;
      // Nothing to measure: a relay failure prints its editorial in the reserved
      // box, and an `unmeasured` frame has already been warned about by the
      // control. Neither is helped by waiting.
      const v = verdictRef.current;
      if (v === "notFound" || v === "upstream" || v === "unmeasured") {
        detail.waitUntil(Promise.resolve(true));
        return;
      }
      detail.waitUntil(
        new Promise<boolean>((resolve) => waitersRef.current.push(resolve)),
      );
      // Already pinned and answered (a second click while the dialog is open)?
      // Settle at once with what we have.
      if (pinnedRef.current && paperRef.current?.width === PRINT_COLUMN_PX) {
        settleWaiters(true);
        return;
      }
      // Pin at the best height in hand so the screen does not jump twice; the
      // real answer replaces it.
      pinForPaper(paperRef.current?.height ?? null);
      requestHeight(frameRef.current);
      if (askTimerRef.current === null) {
        askTimerRef.current = window.setInterval(
          () => requestHeight(frameRef.current),
          PRINT_REQUEST_INTERVAL_MS,
        );
      }
      if (giveUpTimerRef.current === null) {
        giveUpTimerRef.current = window.setTimeout(() => {
          giveUpTimerRef.current = null;
          // No answer from the paper column. A paper height the child sent
          // earlier is still a real offer (the same one ⌘P uses); with none at
          // all, the caller is told so it can warn before printing.
          settleWaiters(paperRef.current !== null);
        }, PRINT_PREPARE_TIMEOUT_MS);
      }
    }

    // ⌘P / the browser's menu: no waiting possible, so use the paper height the
    // child already volunteered. A frame that never reported one keeps today's
    // behaviour — there is nothing better to print it at.
    function onBeforePrint() {
      if (pinnedRef.current) return; // Export PDF already sized it.
      const paper = paperRef.current;
      if (paper === null || heightRef.current === null) return;
      pinForPaper(paper.height);
    }

    window.addEventListener("message", onMessage);
    window.addEventListener(PRINT_PREPARE_EVENT, onPrepare);
    window.addEventListener(PRINT_RELEASE_EVENT, releasePaper);
    window.addEventListener("beforeprint", onBeforePrint);
    window.addEventListener("afterprint", releasePaper);
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
      settleWaiters(false);
      window.removeEventListener("message", onMessage);
      window.removeEventListener(PRINT_PREPARE_EVENT, onPrepare);
      window.removeEventListener(PRINT_RELEASE_EVENT, releasePaper);
      window.removeEventListener("beforeprint", onBeforePrint);
      window.removeEventListener("afterprint", releasePaper);
    };
  }, [settle, settleWaiters, pinForPaper, releasePaper]);

  // Screen: the measured height (or the record's CSS height until one arrives).
  // Paper: the column width, at the paper height when one is known.
  const frameStyle =
    pin !== null
      ? {
          width: `${PRINT_COLUMN_PX}px`,
          ...(pin.height !== null
            ? { height: `${pin.height}px` }
            : height !== null
              ? { height: `${height}px` }
              : {}),
        }
      : height === null
        ? undefined
        : { height: `${height}px` };

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
          style={frameStyle}
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
          only for `[data-unmeasured]`, and it must be the IMMEDIATE next sibling of
          `.kb-explainer` — that adjacency is the rule that shows it.

          `--screen` marks it SCREEN-ONLY: `kb-print.css` re-shows every
          `.kb-explainer__note` on paper and then hides this modifier, and what
          this sentence says ("it scrolls inside its frame") is true of a screen
          and meaningless on a sheet of paper. §4.3's markup block puts the
          modifier on the OTHER note; that is a record slip, and the record's own
          print rules, §11 of the round result ("prints one caveat line under
          it") and acceptance check 19 all read the other way. See `result.md`
          and `phase.md` — P28.S8. */}
      <p className="kb-explainer__note kb-explainer__note--screen">
        {DOCUMENTS.read.explainerUnmeasured}
      </p>

      {/* §4.3's second note — the PAPER caveat, hidden on screen (it carries no
          reveal rule there) and printed under the frame by `kb-print.css`. A
          framed explainer is someone else's interactive page: we cannot suppress
          its quiz for paper, so the sheet says so and points at the address the
          working version lives at. It is in the DOM even when the frame measured
          cleanly — a measured frame prints in full and STILL has controls that do
          nothing on paper. */}
      <p className="kb-explainer__note">
        {DOCUMENTS.read.print.explainerCaveat}
      </p>
    </>
  );
}
