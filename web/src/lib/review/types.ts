/**
 * P30.S24 — the review API's shapes (`server/review.py`, `reader_api.py` *Review*), as the
 * surface reads them. Intervals are whole MINUTES (S10, OQ35). Pure types: the browser and the
 * server both import this file.
 */
import type { Inline } from "@/lib/native/tree";

export type CardState = "new" | "learning" | "review" | "relearning";
export type Rating = "again" | "good";
export type LimitReached = "reviews" | "new_highlights" | null;

export interface Preview {
  due: string;
  /** Whole minutes from now. */
  interval: number;
}

export interface Previews {
  again: Preview;
  good: Preview;
}

export interface CardWhere {
  org: string;
  project: string;
  book: string | null;
  book_title: string | null;
  chapter_key: string | null;
  chapter_title: string;
  chapter_index: number | null;
  chapter_count: number | null;
  doc: string;
  lang: string;
  version: number;
  block_id: string | null;
  href: string;
  /** A quiz card. */
  quiz_title?: string | null;
  item_index?: number;
  item_count?: number;
  /** A highlight card. */
  block_title?: string | null;
  annotation_id?: string;
}

export interface ChoiceFront {
  prompt: Inline[] | null;
  options: { id: string; text: Inline[] }[];
  multi: boolean;
}
export interface ClozeFront {
  text: Inline[];
  blanks: number;
}
export interface RecallFront {
  prompt: Inline[] | null;
}
export interface HighlightFront {
  quote: string | null;
  block_title: string | null;
  note: string | null;
  lang?: string;
}

interface CardBase {
  card_id: string;
  status: "active" | "suspended";
  state: CardState;
  /** Item drift reset the card: "Starts over". */
  reset: boolean;
  reps: number;
  lapses: number;
  due: string;
  last_review: string | null;
  created_at: string;
  where: CardWhere;
  previews: Previews;
}

export interface ChoiceCard extends CardBase {
  source: "quiz";
  item_type: "choice";
  front: ChoiceFront;
  back: { answer: string[]; explain: Inline[] | null };
}
export interface ClozeCard extends CardBase {
  source: "quiz";
  item_type: "cloze";
  front: ClozeFront;
  back: { accepted: string[][]; explain: Inline[] | null };
}
export interface RecallCard extends CardBase {
  source: "quiz";
  item_type: "recall";
  front: RecallFront;
  back: { answer: Inline[] | null; explain: Inline[] | null };
}
export interface HighlightCard extends CardBase {
  source: "highlight";
  item_type: "highlight";
  front: HighlightFront;
  back: null;
}
export type ReviewCard = ChoiceCard | ClozeCard | RecallCard | HighlightCard;

export interface BookRow {
  org: string;
  project: string;
  book: string | null;
  book_title: string | null;
  due: number;
  new: number;
}

export interface Counts {
  due: number;
  new_highlights: number;
  done_today: number;
  by_book: BookRow[];
}

export interface Day {
  start: string;
  end: string;
  time_zone: string;
}

export interface Profile {
  time_zone: string | null;
  day_starts_at_hour: number;
  max_reviews_per_day: number;
  new_highlights_per_day: number;
}

export interface ReviewQueue {
  now: string;
  day: Day;
  profile: Profile;
  counts: Counts;
  limit_reached: LimitReached;
  next_due_at: string | null;
  cards: ReviewCard[];
}

/** `POST …/cards/{id}/review` → the rated card's new schedule, the page's counts and the queue head. */
export interface RateReply {
  card: {
    card_id: string;
    state: CardState;
    reps: number;
    lapses: number;
    due: string;
    interval: number;
    due_today: boolean;
    rating: Rating;
    replayed?: boolean;
    previews: Previews | null;
  };
  counts: Counts;
  limit_reached: LimitReached;
  next_due_at: string | null;
  day: Day;
  next: ReviewCard | null;
}

/** `PATCH …/cards/{id} {status}` → counts after the write. */
export interface StatusReply {
  card: { card_id: string; status: "active" | "suspended" };
  counts: Counts;
  limit_reached: LimitReached;
  next_due_at: string | null;
  day: Day;
}

/** The queue as the page holds it (the server's fields, minus the cards, which are `queue`). */
export interface QueueMeta {
  now: string;
  day: Day;
  profile: Profile;
  counts: Counts;
  limit_reached: LimitReached;
  next_due_at: string | null;
}

/** What a server action answers: a plain result, never a throw. */
export type ActionResult<T> =
  { ok: true; data: T } | { ok: false; gone?: boolean; ref: string };
