import { describe, expect, it } from "vitest";

import { progressPercent, stepChrome } from "@/lib/reader/chrome";

// P30.S13 — the chrome's rules (`01-reader` *Behaviour → The chrome*), as a pure step.
const MAX = 10_000;

describe("chrome rules", () => {
  it("shows near the top and within 4px of the bottom, whatever the direction", () => {
    expect(stepChrome({ last: 0, run: 0 }, 40, MAX).want).toBe(true);
    expect(stepChrome({ last: 9000, run: 0 }, MAX - 4, MAX).want).toBe(true);
    expect(stepChrome({ last: 9000, run: 0 }, MAX - 5, MAX).want).toBe(false);
  });

  it("hides on a scroll down of more than 4px, shows on a scroll up of more than 12px", () => {
    expect(stepChrome({ last: 500, run: 0 }, 505, MAX).want).toBe(false);
    expect(stepChrome({ last: 500, run: 0 }, 504, MAX).want).toBeNull();
    expect(stepChrome({ last: 500, run: 0 }, 487, MAX).want).toBe(true);
    expect(stepChrome({ last: 500, run: 0 }, 489, MAX).want).toBeNull();
  });

  it("reads slow scrolling as one run, so the thresholds stay reachable", () => {
    let s = { last: 500, run: 0 };
    let want: boolean | null = null;
    for (let i = 0; i < 6; i++) {
      const step = stepChrome(s, s.last + 1, MAX);
      s = { last: step.last, run: step.run };
      want = step.want ?? want;
    }
    expect(want).toBe(false); // six 1px steps down pass 4px
    // a reversal starts a fresh run
    const up = stepChrome(s, s.last - 5, MAX);
    expect(up.run).toBe(-5);
    expect(up.want).toBeNull();
  });

  it("counts progress as scrollY over the scrollable height", () => {
    expect(progressPercent(0, MAX)).toBe(0);
    expect(progressPercent(5000, MAX)).toBe(50);
    expect(progressPercent(MAX, MAX)).toBe(100);
    expect(progressPercent(50, 0)).toBe(0);
  });
});
