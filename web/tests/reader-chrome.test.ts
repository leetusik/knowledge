import { describe, expect, it } from "vitest";

import {
  applyStep,
  atEnd,
  CHROME_SHOWN,
  chromeScroll,
  progressPercent,
  stepChrome,
  tapChrome,
  type Chrome,
  type ChromeScroll,
} from "@/lib/reader/chrome";

// P30.S13, amended by P30.F5 (the operator's decision at the walkthrough): the chrome's
// rules as pure steps, shared by the native and the legacy reader.
const MAX = 10_000;

/** Scroll from `from` by `steps` (each a signed px move, 16ms apart), from `chrome`. */
function run(
  chrome: Chrome,
  from: number,
  steps: number[],
  opts: { held?: boolean; gap?: number } = {},
): { chrome: Chrome; scroll: ChromeScroll } {
  let scroll: ChromeScroll = { ...chromeScroll(from, 0), held: !!opts.held };
  let now = 0;
  for (const dy of steps) {
    now += opts.gap ?? 16;
    const top = scroll.last + dy;
    const step = stepChrome(scroll, top, atEnd(top, MAX), now);
    scroll = step.scroll;
    chrome = applyStep(chrome, step);
  }
  return { chrome, scroll };
}

const HIDDEN: Chrome = { top: false, bottom: false };

describe("chrome rules (P30.F5)", () => {
  it("a 12px or 30px upward nudge shows nothing", () => {
    expect(run(HIDDEN, 5000, [-12]).chrome).toEqual(HIDDEN);
    expect(run(HIDDEN, 5000, [-30]).chrome).toEqual(HIDDEN);
    expect(
      run(HIDDEN, 5000, [-3, -3, -3, -3, -3, -3, -3, -3, -3, -3]).chrome,
    ).toEqual(HIDDEN);
  });

  it("separate small nudges up (a pause between them) never add up to a deliberate scroll", () => {
    expect(run(HIDDEN, 5000, [-30, -30, -30], { gap: 400 }).chrome).toEqual(
      HIDDEN,
    );
  });

  it("a 64px or larger upward run shows the top bar only", () => {
    expect(run(HIDDEN, 5000, [-64]).chrome).toEqual({
      top: true,
      bottom: false,
    });
    expect(run(HIDDEN, 5000, [-2, -20, -20, -30]).chrome).toEqual({
      top: true,
      bottom: false,
    });
    expect(run(HIDDEN, 5000, [-63]).chrome).toEqual(HIDDEN);
    // a reversal starts a fresh run
    expect(run(HIDDEN, 5000, [-40, 1, -40]).chrome).toEqual(HIDDEN);
  });

  it("a tap toggles both", () => {
    expect(tapChrome(HIDDEN)).toEqual(CHROME_SHOWN);
    expect(tapChrome(CHROME_SHOWN)).toEqual(HIDDEN);
    // after a deliberate scroll up (top only), one tap brings the bottom too
    expect(tapChrome({ top: true, bottom: false })).toEqual(CHROME_SHOWN);
    expect(tapChrome({ top: false, bottom: true })).toEqual(CHROME_SHOWN);
    // a page with no bottom bar toggles on the top bar alone
    expect(tapChrome({ top: true, bottom: false }, false)).toEqual(HIDDEN);
  });

  it("the end shows the bottom, and holds it there", () => {
    const end = run(HIDDEN, MAX - 40, [36]);
    expect(end.chrome).toEqual({ top: false, bottom: true });
    expect(end.scroll.held).toBe(true);
    // more scrolling down (the legacy frame growing, a bounce) does not hide it
    expect(
      run(end.chrome, MAX - 40, [10, 10], { held: true }).chrome.bottom,
    ).toBe(true);
    // scrolled back up out of the end, the hold lets go; the next scroll down hides it
    const back = run(end.chrome, MAX, [-20], { held: true });
    expect(back.scroll.held).toBe(false);
    expect(back.chrome.bottom).toBe(true); // scrolling up never changes the bottom
    expect(run(back.chrome, MAX - 20, [-1, 8]).chrome.bottom).toBe(false);
  });

  it("a scroll down hides both, except the bottom held at the end", () => {
    expect(run(CHROME_SHOWN, 5000, [5]).chrome).toEqual(HIDDEN);
    expect(run(CHROME_SHOWN, 5000, [4]).chrome).toEqual(CHROME_SHOWN);
    expect(run(CHROME_SHOWN, 5000, [1, 1, 1, 1, 1]).chrome).toEqual(HIDDEN);
    expect(run(CHROME_SHOWN, MAX - 20, [5], { held: true }).chrome).toEqual({
      top: false,
      bottom: true,
    });
  });

  it("shows both near the top, whatever the direction", () => {
    expect(run(HIDDEN, 100, [-60]).chrome).toEqual(CHROME_SHOWN);
    expect(run(HIDDEN, 0, [40]).chrome).toEqual(CHROME_SHOWN);
  });

  it("counts progress as scrollY over the scrollable height", () => {
    expect(progressPercent(0, MAX)).toBe(0);
    expect(progressPercent(5000, MAX)).toBe(50);
    expect(progressPercent(MAX, MAX)).toBe(100);
    expect(progressPercent(50, 0)).toBe(0);
  });
});
