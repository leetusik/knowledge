import { describe, expect, it } from "vitest";

import {
  endKind,
  formatInterval,
  landRating,
  reviewIdFor,
  whenText,
} from "@/lib/review/model";
import type { Counts, RateReply, ReviewCard } from "@/lib/review/types";

// P30.S24 — the review surface's very-core logic (`08-review` round 01): the rating's
// idempotent retry and the interval words. The look is verified live.

const D = 1440;

describe("interval previews (Q4)", () => {
  it("reads minutes, hours, days, months and years, singular at 1", () => {
    expect(formatInterval(10)).toBe("10 minutes");
    expect(formatInterval(1)).toBe("1 minute");
    expect(formatInterval(59)).toBe("59 minutes");
    expect(formatInterval(60)).toBe("1 hour");
    expect(formatInterval(180)).toBe("3 hours");
    expect(formatInterval(D)).toBe("1 day");
    expect(formatInterval(23 * D)).toBe("23 days");
    expect(formatInterval(59 * D)).toBe("59 days");
    expect(formatInterval(60 * D)).toBe("2 months");
    expect(formatInterval(91 * D)).toBe("3 months");
    expect(formatInterval(365 * D)).toBe("1 year");
    expect(formatInterval(475 * D)).toBe("1.3 years");
    expect(formatInterval(730 * D)).toBe("2 years");
  });
  it("never says 24 hours", () => {
    expect(formatInterval(23 * 60 + 40)).toBe("1 day");
  });
});

describe("the review_id (idempotency)", () => {
  let n = 0;
  const make = () => `id-${(n += 1)}`;
  it("Try again sends the SAME id as the rating that failed", () => {
    const first = reviewIdFor(null, "c1", "good", make);
    const failed = { cardId: "c1", rating: "good" as const, reviewId: first };
    expect(reviewIdFor(failed, "c1", "good", make)).toBe(first);
    expect(reviewIdFor(failed, "c1", "good", make)).toBe(first);
  });
  it("any other press is a new rating with a new id", () => {
    const failed = { cardId: "c1", rating: "good" as const, reviewId: "old" };
    expect(reviewIdFor(failed, "c1", "again", make)).not.toBe("old");
    expect(reviewIdFor(failed, "c2", "good", make)).not.toBe("old");
    expect(reviewIdFor(null, "c1", "good", make)).not.toBe("old");
  });
});

const counts = (due: number, nw: number, done: number): Counts => ({
  due,
  new_highlights: nw,
  done_today: done,
  by_book: [],
});
const card = (id: string): ReviewCard =>
  ({
    card_id: id,
    source: "quiz",
    item_type: "recall",
    status: "active",
    state: "review",
    reset: false,
    reps: 2,
    lapses: 0,
    due: "2026-10-20T00:00:00Z",
    last_review: null,
    created_at: "2026-10-01T00:00:00Z",
    where: {} as ReviewCard["where"],
    front: { prompt: [] },
    back: { answer: [], explain: null },
    previews: {
      again: { due: "", interval: 10 },
      good: { due: "", interval: 4 * D },
    },
  }) as ReviewCard;
const reply = (
  over: Partial<RateReply> & { dueToday?: boolean },
): RateReply => ({
  card: {
    card_id: "a",
    state: "relearning",
    reps: 3,
    lapses: 1,
    due: "2026-10-21T01:00:00Z",
    interval: 10,
    due_today: over.dueToday ?? false,
    rating: "again",
    previews: {
      again: { due: "", interval: 10 },
      good: { due: "", interval: D },
    },
  },
  counts: over.counts ?? counts(2, 0, 1),
  limit_reached: over.limit_reached ?? null,
  next_due_at: null,
  day: { start: "", end: "", time_zone: "UTC" },
  next: over.next ?? null,
});

describe("the local queue after a rating", () => {
  const q = [card("a"), card("b"), card("c")];
  it("the rated card leaves; the counts are the server's", () => {
    const out = landRating(q, q[0], reply({}));
    expect(out.queue.map((c) => c.card_id)).toEqual(["b", "c"]);
    expect(out.refetch).toBe(false);
  });
  it("a card due again today goes to the END with the reply's schedule", () => {
    const out = landRating(q, q[0], reply({ dueToday: true }));
    expect(out.queue.map((c) => c.card_id)).toEqual(["b", "c", "a"]);
    expect(out.queue[2].state).toBe("relearning");
    expect(out.queue[2].previews.good.interval).toBe(D);
  });
  it("a daily limit reached ends the session", () => {
    const out = landRating(q, q[0], reply({ limit_reached: "reviews" }));
    expect(out.queue).toEqual([]);
    expect(out.refetch).toBe(false);
  });
  it("the last card with more due asks the server again", () => {
    const out = landRating([q[0]], q[0], reply({ counts: counts(3, 0, 5) }));
    expect(out.queue).toEqual([]);
    expect(out.refetch).toBe(true);
  });
  it("takes the server's queue head when there is one", () => {
    const out = landRating([q[0]], q[0], reply({ next: card("z") }));
    expect(out.queue.map((c) => c.card_id)).toEqual(["z"]);
  });
});

describe("which end state the queue is in", () => {
  const profile = {
    time_zone: "UTC",
    day_starts_at_hour: 4,
    max_reviews_per_day: 200,
    new_highlights_per_day: 20,
  };
  const base = { cards: 0, limit_reached: null, profile, next_due_at: null };
  it("tells a limit from done and from empty", () => {
    expect(endKind({ ...base, counts: counts(0, 0, 0) })).toBe("empty");
    expect(
      endKind({ ...base, counts: counts(0, 0, 6), next_due_at: "x" }),
    ).toBe("done");
    expect(
      endKind({ ...base, counts: counts(5, 1, 200), limit_reached: "reviews" }),
    ).toBe("limit");
    expect(
      endKind({
        ...base,
        counts: counts(0, 3, 31),
        limit_reached: "new_highlights",
      }),
    ).toBe("limitNew");
    expect(
      endKind({
        ...base,
        profile: { ...profile, new_highlights_per_day: 0 },
        counts: counts(0, 3, 31),
        limit_reached: "new_highlights",
      }),
    ).toBe("paused");
    expect(endKind({ ...base, cards: 2, counts: counts(2, 0, 0) })).toBe(
      "card",
    );
  });
});

describe("the next due time, in the reader's zone", () => {
  it("says today, tomorrow or a date, 24-hour", () => {
    const now = "2026-10-20T09:30:00Z";
    expect(whenText("2026-10-20T10:40:00Z", now, "Asia/Kolkata")).toBe(
      "today at 16:10",
    );
    expect(whenText("2026-10-21T01:45:00Z", now, "Asia/Kolkata")).toBe(
      "tomorrow at 07:15",
    );
    expect(whenText("2026-10-23T01:45:00Z", now, "Asia/Kolkata")).toBe(
      "on 23 Oct at 07:15",
    );
  });
});
