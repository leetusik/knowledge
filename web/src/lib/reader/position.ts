/**
 * P30.S15 — the reader's position and finish rules (`01-reader` round 02 *Behaviour →
 * Progress, section and finished*; P29 *Resume and progress*), as pure functions so
 * the decisions are testable without a browser. The client frame owns the timers and
 * the DOM; this file owns WHEN to write and WHAT the chapter's state becomes.
 *
 *  - **Cadence.** The position is written 2 s after scrolling stops, and at most 15 s
 *    after the first unsent scroll while the reader keeps moving (a debounce with a
 *    maximum wait); the beacon covers `pagehide`. `finished` and the two marks are
 *    immediate.
 *  - **Finished.** The end sentinel's top within 40 px of the viewport's bottom, or
 *    progress at 95%: written at once, once per time the end comes into view, never
 *    for the signed-out, never while held, never when already finished.
 *  - **Mark as unread** resets: not finished, `max_fraction` 0, and the page HOLDS the
 *    chapter (no position writes, no finish) until the end leaves the viewport. The
 *    hold is page state, never stored.
 *  - **Grow-only / last-write-wins** mirror the server's conflict rules: the client's
 *    `max_fraction` only grows (the one reset is Mark as unread), and a position write
 *    is the latest sample, whatever the earlier one was.
 */

export const QUIET_WRITE_MS = 2000;
export const MAX_WAIT_MS = 15_000;
/** The end sentinel counts as reached this far above the viewport's bottom edge. */
export const END_MARGIN_PX = 40;
/** Progress at or past this percent also counts as the end. */
export const END_PERCENT = 95;

export interface Cadence {
  /** When the first not-yet-written scroll happened, or null when nothing is pending. */
  pendingSince: number | null;
  /** When the last scroll event happened. */
  lastScroll: number;
}

/** Milliseconds until the next cadence write is due, or null when nothing is pending. */
export function writeDelay(c: Cadence, now: number): number | null {
  if (c.pendingSince === null) return null;
  const due = Math.min(
    c.lastScroll + QUIET_WRITE_MS,
    c.pendingSince + MAX_WAIT_MS,
  );
  return Math.max(0, due - now);
}

/** Position as a 0..1 fraction of the scrollable height (not rounded, not a percent). */
export function fractionOf(top: number, max: number): number {
  if (max <= 0) return 0;
  return Math.min(1, Math.max(0, top / max));
}

/**
 * Has the chapter's end come into view? The end sentinel's top is within `END_MARGIN_PX`
 * of the viewport's bottom (or already above it), or progress has reached 95%.
 */
export function endSeen(
  endTop: number,
  viewportHeight: number,
  percent: number,
): boolean {
  return endTop < viewportHeight - END_MARGIN_PX || percent >= END_PERCENT;
}

export interface ReadingState {
  finished: boolean;
  /** The version the chapter was finished on; null when not finished. */
  finishedVersion: number | null;
  /** Held after Mark as unread: no writes, no finish, until the end has left the view. */
  held: boolean;
  /** The end is in view right now (to find the moments it comes and goes). */
  endIn: boolean;
  /** The furthest the reader has got, 0..1. Only grows; Mark as unread resets it. */
  maxFraction: number;
}

export function initialReading(init: {
  finished: boolean;
  finishedVersion: number | null;
  maxFraction: number;
}): ReadingState {
  return {
    finished: init.finished,
    finishedVersion: init.finished ? init.finishedVersion : null,
    held: false,
    endIn: false,
    maxFraction: init.maxFraction,
  };
}

/** "Updated": finished on a version older than the newest. */
export function isUpdated(state: ReadingState, newest: number): boolean {
  return (
    state.finished &&
    state.finishedVersion !== null &&
    state.finishedVersion < newest
  );
}

/**
 * The end came into view, or left it. Returns the next state and whether the chapter
 * is to be finished NOW (written immediately). Coming in finishes a member's chapter
 * that is neither finished nor held; leaving lifts a hold.
 */
export function onEndChange(
  state: ReadingState,
  seen: boolean,
  version: number,
  canFinish: boolean,
): { state: ReadingState; finish: boolean } {
  if (seen === state.endIn) return { state, finish: false };
  if (!seen)
    return { state: { ...state, endIn: false, held: false }, finish: false };
  const finish = canFinish && !state.finished && !state.held;
  return {
    state: finish
      ? {
          ...state,
          endIn: true,
          finished: true,
          finishedVersion: version,
        }
      : { ...state, endIn: true },
    finish,
  };
}

/** The reader pressed Mark as finished (which ends a hold) or Mark as unread (which starts one). */
export function onMark(
  state: ReadingState,
  finished: boolean,
  version: number,
): ReadingState {
  return finished
    ? {
        ...state,
        finished: true,
        finishedVersion: version,
        held: false,
      }
    : {
        ...state,
        finished: false,
        finishedVersion: null,
        held: true,
        maxFraction: 0,
      };
}

/** A new sample of the reader's place: `max_fraction` grows, and never while held. */
export function onSample(state: ReadingState, fraction: number): ReadingState {
  if (state.held || fraction <= state.maxFraction) return state;
  return { ...state, maxFraction: fraction };
}

/**
 * May a position be written? Only a member, on the newest version, with a place to
 * write to, and not while the chapter is held. (Reading an older version writes nothing.)
 */
export function canWritePosition(p: {
  member: boolean;
  hasTarget: boolean;
  version: number;
  newest: number;
  held: boolean;
}): boolean {
  return p.member && p.hasTarget && p.version === p.newest && !p.held;
}

/** The text of the pill, when there is a section; else the place as a percent. */
export function resumePercent(fraction: number): number {
  return Math.round(Math.min(1, Math.max(0, fraction)) * 100);
}

// ---- P30.F6: the landing, and no write before it settles -------------------------------------
//
// A reader page decides once, when it opens, where it lands (`01-reader` *Opening and
// moving*): a `#section` in the address (F4), then a mark asked for by `?note=` (S21),
// then the member's saved place (S15's resume), and otherwise the top. Next's own
// scroll-to-top does not run between chapters (its scroll handler takes the segment's
// first node, which is the reader stylesheet React hoists into <head>, and gives up), so
// without this the next chapter opened at the previous one's scroll position.
//
// Until the landing has settled, the page writes nothing: no cadence position, no beacon
// and no finish. A sample taken before then is the previous chapter's place, and at its
// end it would mark an unread chapter finished.

/** Where a reader page lands when it opens. `stay`: the document's own first load (the
 *  browser opened it at the top, or a reload restores the place). */
export type Landing = "hash" | "note" | "resume" | "top" | "stay";

export function landingFor(p: {
  /** The address's `#id` names an element on this page. */
  hash: boolean;
  /** `?note=` asks for a mark. */
  note: boolean;
  /** The member's saved place applies here (S15's rules) and has somewhere to go. */
  resume: boolean;
  /** A navigation inside the app opened the page (not the document's first load). */
  navigated: boolean;
}): Landing {
  if (p.hash) return "hash";
  if (p.note) return "note";
  if (p.resume) return "resume";
  return p.navigated ? "top" : "stay";
}

/** The landing is still at work this long (F4's hash landing retries until 900 ms). */
export const LANDING_SETTLE_MS = 1000;
/** And never longer than this, whatever the fonts do. */
export const LANDING_MAX_MS = 3000;

/**
 * Has the landing settled? The reader's own first wheel, touch, key or pointer settles it
 * at once (the landings stop there too); otherwise once the fonts are in and the landing's
 * retries are over, and at the latest after `LANDING_MAX_MS`.
 */
export function landingSettled(p: {
  elapsed: number;
  fontsReady: boolean;
  input: boolean;
}): boolean {
  if (p.input) return true;
  if (p.elapsed >= LANDING_MAX_MS) return true;
  return p.fontsReady && p.elapsed >= LANDING_SETTLE_MS;
}

/**
 * A scroll (or the opening) as the cadence sees it: the place becomes a pending position
 * only once the landing has settled, and only where a position may be written.
 */
export function touchCadence(
  c: Cadence,
  p: { settled: boolean; allowed: boolean; now: number },
): Cadence {
  if (!p.settled || !p.allowed) return c;
  return { pendingSince: c.pendingSince ?? p.now, lastScroll: p.now };
}

/**
 * One look at the page (after a scroll, and once at the opening): what the reader's state
 * becomes, whether to finish the chapter now, and whether a hold lifted on this very look
 * (the place counts from there). Before the landing has settled nothing changes, not even
 * the end's in/out, so the first look after it judges the page where it landed.
 */
export function onLook(
  state: ReadingState,
  look: {
    settled: boolean;
    /** The end is in view (`endSeen`). */
    seen: boolean;
    version: number;
    /** `canWritePosition` for this page. */
    allowed: boolean;
  },
): { state: ReadingState; finish: boolean; lifted: boolean } {
  if (!look.settled) return { state, finish: false, lifted: false };
  const r = onEndChange(state, look.seen, look.version, look.allowed);
  return {
    state: r.state,
    finish: r.finish,
    lifted: state.held && !r.state.held,
  };
}
