import { describe, expect, it } from "vitest";

import {
  canWritePosition,
  endSeen,
  fractionOf,
  initialReading,
  isUpdated,
  onEndChange,
  onMark,
  onSample,
  writeDelay,
} from "@/lib/reader/position";

// P30.S15 — the position cadence and the finish / hold rules (`01-reader` round 02
// *Progress, section and finished*; P29 *Resume and progress*). Decision logic only.
const fresh = () =>
  initialReading({ finished: false, finishedVersion: null, maxFraction: 0 });

describe("position cadence", () => {
  it("writes 2s after scrolling stops", () => {
    expect(writeDelay({ pendingSince: null, lastScroll: 0 }, 5000)).toBeNull();
    expect(writeDelay({ pendingSince: 1000, lastScroll: 1000 }, 1000)).toBe(
      2000,
    );
    expect(writeDelay({ pendingSince: 1000, lastScroll: 1900 }, 2500)).toBe(
      1400,
    );
  });

  it("does not wait more than 15s from the first unsent scroll while reading goes on", () => {
    // scrolling every second since t=0: the quiet window never opens, the 15s cap does
    expect(writeDelay({ pendingSince: 0, lastScroll: 14_500 }, 14_500)).toBe(
      500,
    );
    expect(writeDelay({ pendingSince: 0, lastScroll: 16_000 }, 16_000)).toBe(0);
  });
});

describe("the end of the chapter", () => {
  it("is reached 40px above the viewport bottom, or at 95%", () => {
    expect(endSeen(860, 900, 40)).toBe(false); // exactly 40px above: not yet
    expect(endSeen(861, 900, 40)).toBe(false);
    expect(endSeen(859, 900, 40)).toBe(true);
    expect(endSeen(2000, 900, 95)).toBe(true);
    expect(endSeen(2000, 900, 94)).toBe(false);
  });

  it("finishes a member's unfinished chapter once, when it comes into view", () => {
    const a = onEndChange(fresh(), true, 3, true);
    expect(a.finish).toBe(true);
    expect(a.state.finished).toBe(true);
    expect(a.state.finishedVersion).toBe(3);
    // already in view: nothing more
    expect(onEndChange(a.state, true, 3, true).finish).toBe(false);
    // leaves and comes back on a finished chapter: still no second finish
    const left = onEndChange(a.state, false, 3, true);
    expect(onEndChange(left.state, true, 3, true).finish).toBe(false);
  });

  it("never finishes for the signed-out", () => {
    const a = onEndChange(fresh(), true, 1, false);
    expect(a.finish).toBe(false);
    expect(a.state.finished).toBe(false);
  });
});

describe("Mark as unread and the hold", () => {
  const atEnd = () => {
    const done = onEndChange(fresh(), true, 2, true).state; // finished, end in view
    return onMark(done, false, 2); // pressed at the end
  };

  it("resets the chapter and holds it", () => {
    let s = onSample(fresh(), 0.6);
    s = onMark(onEndChange(s, true, 2, true).state, false, 2);
    expect(s.finished).toBe(false);
    expect(s.finishedVersion).toBeNull();
    expect(s.maxFraction).toBe(0);
    expect(s.held).toBe(true);
  });

  it("does not finish again on the spot, and counts no reading, while held", () => {
    const s = atEnd();
    expect(onEndChange(s, true, 2, true).finish).toBe(false); // end still in view
    expect(onSample(s, 0.97).maxFraction).toBe(0);
    expect(
      canWritePosition({
        member: true,
        hasTarget: true,
        version: 2,
        newest: 2,
        held: s.held,
      }),
    ).toBe(false);
  });

  it("lifts when the end leaves the view; reaching it again finishes with no press", () => {
    const left = onEndChange(atEnd(), false, 2, true);
    expect(left.state.held).toBe(false);
    expect(onSample(left.state, 0.4).maxFraction).toBe(0.4); // grows again from 0
    const back = onEndChange(left.state, true, 2, true);
    expect(back.finish).toBe(true);
    expect(back.state.finished).toBe(true);
  });

  it("is ended by Mark as finished, held or not", () => {
    const s = onMark(atEnd(), true, 2);
    expect(s.held).toBe(false);
    expect(s.finished).toBe(true);
  });
});

describe("max_fraction and the write gate", () => {
  it("only grows", () => {
    let s = onSample(fresh(), 0.5);
    s = onSample(s, 0.3);
    expect(s.maxFraction).toBe(0.5);
    expect(onSample(s, 0.8).maxFraction).toBe(0.8);
  });

  it("is the fraction of the scrollable height", () => {
    expect(fractionOf(500, 1000)).toBe(0.5);
    expect(fractionOf(-5, 1000)).toBe(0);
    expect(fractionOf(2000, 1000)).toBe(1);
    expect(fractionOf(10, 0)).toBe(0);
  });

  it("writes only for a member on the newest version with a target", () => {
    const base = {
      member: true,
      hasTarget: true,
      version: 3,
      newest: 3,
      held: false,
    };
    expect(canWritePosition(base)).toBe(true);
    expect(canWritePosition({ ...base, member: false })).toBe(false);
    expect(canWritePosition({ ...base, hasTarget: false })).toBe(false);
    expect(canWritePosition({ ...base, version: 2 })).toBe(false); // an older version
  });

  it("calls a finish on an older version Updated", () => {
    const done = initialReading({
      finished: true,
      finishedVersion: 1,
      maxFraction: 1,
    });
    expect(isUpdated(done, 2)).toBe(true);
    expect(isUpdated(done, 1)).toBe(false);
    expect(isUpdated(fresh(), 2)).toBe(false);
  });
});
