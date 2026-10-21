import { describe, expect, it } from "vitest";

import {
  canWritePosition,
  endSeen,
  fractionOf,
  initialReading,
  isUpdated,
  LANDING_MAX_MS,
  LANDING_SETTLE_MS,
  landingFor,
  landingSettled,
  onEndChange,
  onLook,
  onMark,
  onSample,
  touchCadence,
  writeDelay,
  type Cadence,
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

// P30.F6 — a chapter opened from another lands once (hash, then `?note=`, then the
// resume, then the top), and nothing is written until that landing has settled.
describe("the landing", () => {
  const all = { hash: true, note: true, resume: true, navigated: true };

  it("is the hash, then the note, then the resume, then the top", () => {
    expect(landingFor(all)).toBe("hash");
    expect(landingFor({ ...all, hash: false })).toBe("note");
    expect(landingFor({ ...all, hash: false, note: false })).toBe("resume");
    expect(
      landingFor({ hash: false, note: false, resume: false, navigated: true }),
    ).toBe("top");
  });

  it("leaves the document's own first load to the browser", () => {
    expect(
      landingFor({ hash: false, note: false, resume: false, navigated: false }),
    ).toBe("stay");
    // a first load still lands on its hash, its note or the resume
    expect(landingFor({ ...all, navigated: false })).toBe("hash");
    expect(
      landingFor({ hash: false, note: false, resume: true, navigated: false }),
    ).toBe("resume");
  });

  it("settles on the reader's first input, else after the fonts and the retries", () => {
    const at = (elapsed: number, fontsReady: boolean, input = false) =>
      landingSettled({ elapsed, fontsReady, input });
    expect(at(0, false)).toBe(false);
    expect(at(LANDING_SETTLE_MS - 1, true)).toBe(false); // the hash landing may retry
    expect(at(LANDING_SETTLE_MS, false)).toBe(false); // a late font may still move it
    expect(at(LANDING_SETTLE_MS, true)).toBe(true);
    expect(at(LANDING_MAX_MS, false)).toBe(true); // never longer than this
    expect(at(10, false, true)).toBe(true); // the reader took over
  });
});

describe("no write before the landing settles", () => {
  const idle: Cadence = { pendingSince: null, lastScroll: 0 };

  it("queues no position for a scroll, however allowed", () => {
    const c = touchCadence(idle, { settled: false, allowed: true, now: 500 });
    expect(c).toBe(idle);
    expect(writeDelay(c, 5000)).toBeNull();
    // once settled, the same scroll is a position, 2 s later
    const s = touchCadence(idle, { settled: true, allowed: true, now: 1200 });
    expect(writeDelay(s, 1200)).toBe(2000);
    // and never where writing is not allowed
    expect(
      touchCadence(idle, { settled: true, allowed: false, now: 1200 }),
    ).toBe(idle);
  });

  it("does not finish an unread chapter opened at the previous one's end", () => {
    const st = fresh();
    // The page opened at the old scroll position, which shows the end.
    const early = onLook(st, {
      settled: false,
      seen: true,
      version: 1,
      allowed: true,
    });
    expect(early.finish).toBe(false);
    expect(early.state).toBe(st); // not even the end's in/out moves
    // It lands at the top: the end is out of view, nothing to finish.
    const landed = onLook(early.state, {
      settled: true,
      seen: false,
      version: 1,
      allowed: true,
    });
    expect(landed.finish).toBe(false);
    expect(landed.state.finished).toBe(false);
    // Read to the end: now it finishes, once.
    const end = onLook(landed.state, {
      settled: true,
      seen: true,
      version: 1,
      allowed: true,
    });
    expect(end.finish).toBe(true);
    expect(end.state.finished).toBe(true);
  });

  it("still finishes a short chapter whose end shows where it landed", () => {
    const r = onLook(fresh(), {
      settled: true,
      seen: true,
      version: 2,
      allowed: true,
    });
    expect(r.finish).toBe(true);
    expect(r.state.finishedVersion).toBe(2);
  });

  it("lifts a hold only after the landing", () => {
    const held = { ...onMark(fresh(), false, 1), endIn: true };
    expect(
      onLook(held, { settled: false, seen: false, version: 1, allowed: false })
        .lifted,
    ).toBe(false);
    const r = onLook(held, {
      settled: true,
      seen: false,
      version: 1,
      allowed: false,
    });
    expect(r.lifted).toBe(true);
    expect(r.state.held).toBe(false);
  });
});
