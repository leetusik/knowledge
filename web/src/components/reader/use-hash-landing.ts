"use client";

import { useEffect, type RefObject } from "react";

/**
 * P30.F4 (X3): land on `location.hash`.
 *
 * The browser's own fragment scroll loses a race with the streamed page, and a client
 * navigation (a chapter link with a section, the sign-in return) never reaches it at
 * all. So once the chapter is on screen, bring the named element into view the way the
 * signed design lands a jump (`01-reader`: instant, `scroll-behavior: auto` under
 * `.rd-root`, the sticky bar cleared by the element's `scroll-margin-top`).
 *
 * The landing is repeated a few times while the page settles (the router resets the
 * scroll after navigating, a late font shifts the layout) and stops for good at the
 * reader's first wheel, touch or key. A hash always wins over the saved resume
 * position (`useReading` stands down for it).
 */
const RETRY_MS = [40, 150, 400, 900];

function target(): HTMLElement | null {
  const raw = window.location.hash.slice(1);
  if (!raw) return null;
  let id = raw;
  try {
    id = decodeURIComponent(raw);
  } catch {
    // keep the raw text
  }
  return document.getElementById(id);
}

export function useHashLanding({
  ready,
  place,
  rootRef,
  quiet,
}: {
  ready: boolean;
  /** Changes when the reader moves to another chapter or version (client navigation). */
  place: string;
  rootRef: RefObject<HTMLElement | null>;
  quiet: () => void;
}) {
  useEffect(() => {
    if (!ready) return;
    let done = false;
    const timers: ReturnType<typeof setTimeout>[] = [];
    const stop = () => {
      done = true;
      timers.forEach(clearTimeout);
    };
    const land = () => {
      if (done) return;
      const el = target();
      if (!el || !rootRef.current?.contains(el)) return;
      quiet();
      el.scrollIntoView({ block: "start", behavior: "instant" });
    };
    const start = () => {
      done = false;
      timers.forEach(clearTimeout);
      timers.length = 0;
      if (!target()) return;
      land();
      RETRY_MS.forEach((ms) => timers.push(setTimeout(land, ms)));
      document.fonts?.ready.then(land).catch(() => {});
    };
    start();
    const input = ["wheel", "touchstart", "keydown", "pointerdown"] as const;
    input.forEach((t) =>
      window.addEventListener(t, stop, { passive: true, capture: true }),
    );
    window.addEventListener("hashchange", start);
    return () => {
      stop();
      input.forEach((t) => window.removeEventListener(t, stop, true));
      window.removeEventListener("hashchange", start);
    };
  }, [ready, place, rootRef, quiet]);
}
