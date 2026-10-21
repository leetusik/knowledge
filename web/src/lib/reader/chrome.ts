/**
 * The reader's chrome rules, as pure steps so the thresholds are in one place and
 * testable without a browser. Both readers use them: the native reader feeds the
 * window's scroll, the legacy reader the bridge's `scroll` messages (`y`, the
 * document's own scroll position in CSS px).
 *
 * P30.F5 — the operator's decision at the P30 walkthrough (2026-10-21) supersedes the
 * signed hide/show tables (`01-reader` round 02 *Behaviour → The chrome*;
 * `09-legacy-and-print` round 01 *Hide and show*). At every width, desktop included:
 *
 * The top bar (`top`):
 *   - hides   when the page scrolls DOWN more than 4px (over the current run);
 *   - shows   on a deliberate scroll UP: an upward run of at least 64px within one
 *             gesture, so a nudge or the bounce at the end of a flick never brings it;
 *   - shows   under 48px from the top;
 *   - toggles on a tap or click on the page (`tapChrome`).
 *
 * The bottom chrome (`bottom`):
 *   - is never shown by scrolling up;
 *   - shows   within 4px of the end, and is HELD there: a scroll down does not hide it
 *             until the reader has scrolled back up out of the end (an upward run of
 *             more than 12px away from it);
 *   - shows   under 48px from the top (on opening);
 *   - hides   when the page scrolls DOWN more than 4px, unless held at the end;
 *   - toggles on a tap or click on the page, with the top bar (one tap brings both).
 *
 * "The current run" is the movement in one direction: it accumulates until the
 * direction reverses, or the scrolling pauses for longer than `GESTURE_GAP_MS` (a new
 * gesture), then starts over. With the 1-3px steps of a slow scroll that keeps the
 * thresholds reachable (OQ decided in P30.S13); the pause keeps separate small nudges
 * from adding up to a deliberate scroll.
 */

export const SHOW_NEAR_TOP = 48;
export const SHOW_NEAR_BOTTOM = 4;
export const HIDE_AFTER_DOWN = 4;
/** A deliberate scroll up: the upward run that brings the top bar back. */
export const SHOW_TOP_AFTER_UP = 64;
/** The upward run that lets the end's hold on the bottom chrome go. */
export const RELEASE_END_AFTER_UP = 12;
/** A pause longer than this between scroll events starts a new gesture (a new run). */
export const GESTURE_GAP_MS = 300;
/** After the reader's own scroll (a jump, a resume, a chapter opening) the rules are ignored. */
export const QUIET_MS = 450;

/** Which bars are shown. */
export interface Chrome {
  top: boolean;
  bottom: boolean;
}

export const CHROME_SHOWN: Chrome = { top: true, bottom: true };

export interface ChromeScroll {
  /** The previous event's scroll position. */
  last: number;
  /** The signed movement of the current run (positive = down). */
  run: number;
  /** When the previous event came (ms). */
  at: number;
  /** The bottom chrome is held at the end. */
  held: boolean;
}

export function chromeScroll(top: number, now: number): ChromeScroll {
  return { last: top, run: 0, at: now, held: false };
}

export interface ChromeStep {
  scroll: ChromeScroll;
  /** For each bar: `true` show, `false` hide, `null` leave as is. */
  top: boolean | null;
  bottom: boolean | null;
}

/** Within 4px of the end (the native reader; the legacy reader reads `fraction >= 0.995`). */
export function atEnd(top: number, max: number): boolean {
  return top >= max - SHOW_NEAR_BOTTOM;
}

/**
 * One scroll event: `top` is the scroll position, `end` whether it is at the end,
 * `now` the time in ms.
 */
export function stepChrome(
  state: ChromeScroll,
  top: number,
  end: boolean,
  now: number,
): ChromeStep {
  const dy = top - state.last;
  const fresh = now - state.at > GESTURE_GAP_MS;
  const run =
    dy === 0
      ? fresh
        ? 0
        : state.run
      : !fresh && Math.sign(dy) === Math.sign(state.run)
        ? state.run + dy
        : dy;
  let held = state.held;
  let t: boolean | null = null;
  let b: boolean | null = null;
  if (end) {
    held = true;
    b = true;
  } else if (held && run < -RELEASE_END_AFTER_UP) {
    held = false;
  }
  if (top < SHOW_NEAR_TOP) {
    t = true;
    b = true;
  } else if (run > HIDE_AFTER_DOWN) {
    t = false;
    if (!held) b = false;
  } else if (run <= -SHOW_TOP_AFTER_UP) {
    t = true;
  }
  return { scroll: { last: top, run, at: now, held }, top: t, bottom: b };
}

/** The bars after a step (the same object when nothing changes). */
export function applyStep(chrome: Chrome, step: ChromeStep): Chrome {
  const top = step.top ?? chrome.top;
  const bottom = step.bottom ?? chrome.bottom;
  return top === chrome.top && bottom === chrome.bottom
    ? chrome
    : { top, bottom };
}

/**
 * A tap or click on the page: anything hidden → both shown; both shown → both hidden.
 * A page without a bottom bar (`hasBottom` false) toggles on the top bar alone.
 */
export function tapChrome(chrome: Chrome, hasBottom = true): Chrome {
  const anyHidden = !chrome.top || (hasBottom && !chrome.bottom);
  return anyHidden
    ? { top: true, bottom: true }
    : { top: false, bottom: false };
}

/** Progress is `round(scrollY / (scrollHeight - innerHeight) × 100)`. */
export function progressPercent(top: number, max: number): number {
  if (max <= 0) return 0;
  return Math.round(Math.min(1, Math.max(0, top / max)) * 100);
}

/** A tap or click toggles the chrome unless it lands on one of these. */
export const TAP_IGNORE =
  "a, button, summary, details, pre, table, [tabindex], input, label, [role='region'], .kb-ch-code, .kb-ch-table, .an-layer";
