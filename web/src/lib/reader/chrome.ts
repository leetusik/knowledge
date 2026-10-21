/**
 * The reader's chrome rules (`01-reader` *Behaviour → The chrome*), as a pure step so
 * the thresholds are in one place and testable without a browser.
 *
 * On each scroll event:
 *   - show   the scroll position is under 48px, or within 4px of the bottom;
 *   - hide   the page scrolls DOWN more than 4px;
 *   - show   the page scrolls UP more than 12px.
 *
 * "Since the last event" is read over the current run of scrolling in one direction:
 * the movement accumulates until the direction reverses, then starts over. With the
 * large per-event steps a flick makes, that is the signed rule exactly; with the
 * 1-3px steps of a slow scroll it keeps the thresholds reachable instead of never
 * firing (OQ decided in P30.S13).
 */

export const SHOW_NEAR_TOP = 48;
export const SHOW_NEAR_BOTTOM = 4;
export const HIDE_AFTER_DOWN = 4;
export const SHOW_AFTER_UP = 12;
/** After the reader's own scroll (a jump, a resume, a chapter opening) the rules are ignored. */
export const QUIET_MS = 450;

export interface ChromeScroll {
  /** The previous event's scroll position. */
  last: number;
  /** The signed movement of the current run (positive = down). */
  run: number;
}

export interface ChromeStep extends ChromeScroll {
  /** `true` show, `false` hide, `null` leave as is. */
  want: boolean | null;
}

export function stepChrome(
  state: ChromeScroll,
  top: number,
  max: number,
): ChromeStep {
  const dy = top - state.last;
  const run =
    dy === 0
      ? state.run
      : Math.sign(dy) === Math.sign(state.run)
        ? state.run + dy
        : dy;
  let want: boolean | null = null;
  if (top < SHOW_NEAR_TOP || top >= max - SHOW_NEAR_BOTTOM) want = true;
  else if (run > HIDE_AFTER_DOWN) want = false;
  else if (run < -SHOW_AFTER_UP) want = true;
  return { last: top, run, want };
}

/** Progress is `round(scrollY / (scrollHeight - innerHeight) × 100)`. */
export function progressPercent(top: number, max: number): number {
  if (max <= 0) return 0;
  return Math.round(Math.min(1, Math.max(0, top / max)) * 100);
}

/** A tap or click toggles the chrome unless it lands on one of these. */
export const TAP_IGNORE =
  "a, button, summary, details, pre, table, [tabindex], input, label, [role='region'], .kb-ch-code, .kb-ch-table, .an-layer";
