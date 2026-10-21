/**
 * P30.S24 — the review surface's rules (`08-review` round 01), as pure functions: no React and
 * no network. The island (`components/review/`) calls them to word a preview, reuse a
 * `review_id`, land a rating's reply on the local queue and say which end state the queue is in;
 * the tests pin the ones the product cannot afford to get wrong (the idempotent retry, the
 * interval words).
 */
import { REVIEW } from "@/content/review";

import type {
  BookRow,
  Counts,
  Day,
  HighlightCard,
  LimitReached,
  Profile,
  QueueMeta,
  Rating,
  RateReply,
  ReviewCard,
  StatusReply,
} from "./types";

export const DAY_MIN = 1440;

// --- intervals (Q4, drawn) -------------------------------------------------------------

const unit = (n: number, pair: readonly [string, string]): string =>
  `${n} ${n === 1 ? pair[0] : pair[1]}`;

/**
 * An interval, in whole minutes, as the page words it: under 60 minutes in minutes, under a
 * day in whole hours, under 60 days in whole days, under a year in whole months (days ÷ 30.4),
 * from a year in years to one decimal (".0" dropped). Units are singular at 1. The server sends
 * the interval; the page only formats it.
 */
export function formatInterval(minutes: number): string {
  const I = REVIEW.intervals;
  const min = Math.max(1, Math.round(minutes));
  if (min < 60) return unit(min, I.minute);
  if (min < DAY_MIN) {
    const h = Math.round(min / 60);
    // 23.5 hours rounds to 24: that is a day.
    return h >= 24 ? unit(1, I.day) : unit(h, I.hour);
  }
  const d = Math.round(min / DAY_MIN);
  if (d < 60) return unit(d, I.day);
  if (d < 365) return unit(Math.round(d / 30.4), I.month);
  const y = Math.round((d / 365) * 10) / 10;
  return `${String(y).replace(/\.0$/, "")} ${y === 1 ? I.year[0] : I.year[1]}`;
}

// --- the review_id (idempotency) -------------------------------------------------------

/** A rating that has been sent (or failed to send): the pair a retry must repeat. */
export interface SentRating {
  cardId: string;
  rating: Rating;
  reviewId: string;
}

export function newId(): string {
  const c = typeof crypto !== "undefined" ? crypto : undefined;
  if (c && typeof c.randomUUID === "function") return c.randomUUID();
  // Not a secure context (plain http on a LAN name): build a v4 from random bytes.
  const b = new Uint8Array(16);
  if (c && typeof c.getRandomValues === "function") c.getRandomValues(b);
  else for (let i = 0; i < 16; i += 1) b[i] = Math.floor(Math.random() * 256);
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = Array.from(b, (x) => x.toString(16).padStart(2, "0"));
  return `${h.slice(0, 4).join("")}-${h.slice(4, 6).join("")}-${h.slice(6, 8).join("")}-${h.slice(8, 10).join("")}-${h.slice(10).join("")}`;
}

/**
 * The `review_id` for a press. "Try again" sends the SAME id as the rating that failed, so a
 * rating that did reach the server is never counted twice (the server answers a repeated id
 * with the stored outcome); any other press (another card, or another rating) is a new rating
 * and gets a new id.
 */
export function reviewIdFor(
  failed: SentRating | null,
  cardId: string,
  rating: Rating,
  make: () => string = newId,
): string {
  return failed && failed.cardId === cardId && failed.rating === rating
    ? failed.reviewId
    : make();
}

// --- time, in the reader's own zone ----------------------------------------------------

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

interface Local {
  y: number;
  mo: number;
  d: number;
  h: number;
  mi: number;
}

function formatterFor(tz: string): Intl.DateTimeFormat {
  const opts: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  };
  try {
    return new Intl.DateTimeFormat("en-GB", { ...opts, timeZone: tz });
  } catch {
    return new Intl.DateTimeFormat("en-GB", { ...opts, timeZone: "UTC" });
  }
}

function localParts(iso: string, tz: string): Local {
  const out: Local = { y: 0, mo: 0, d: 0, h: 0, mi: 0 };
  for (const p of formatterFor(tz).formatToParts(new Date(iso))) {
    if (p.type === "year") out.y = Number(p.value);
    else if (p.type === "month") out.mo = Number(p.value);
    else if (p.type === "day") out.d = Number(p.value);
    else if (p.type === "hour") out.h = Number(p.value) % 24;
    else if (p.type === "minute") out.mi = Number(p.value);
  }
  return out;
}

const pad = (n: number): string => (n < 10 ? `0${n}` : String(n));

/** Whole calendar days from `a` to `b`, in `tz`. */
export function dayDiff(a: string, b: string, tz: string): number {
  const x = localParts(a, tz);
  const y = localParts(b, tz);
  return Math.round(
    (Date.UTC(y.y, y.mo - 1, y.d) - Date.UTC(x.y, x.mo - 1, x.d)) / 86_400_000,
  );
}

/** "today at 15:10", "tomorrow at 07:15" or "on 23 Oct at 07:15": `iso` in `tz`, 24-hour. */
export function whenText(iso: string, nowIso: string, tz: string): string {
  const at = localParts(iso, tz);
  const hhmm = `${pad(at.h)}:${pad(at.mi)}`;
  const diff = dayDiff(nowIso, iso, tz);
  if (diff <= 0) return `today at ${hhmm}`;
  if (diff === 1) return `tomorrow at ${hhmm}`;
  return `on ${at.d} ${MONTHS[at.mo - 1] ?? ""} at ${hhmm}`;
}

/** "HH:00": the hour a review day starts. */
export function hourText(hour: number): string {
  return `${pad(hour)}:00`;
}

// --- the card's words ------------------------------------------------------------------

export function isHighlight(card: ReviewCard): card is HighlightCard {
  return card.source === "highlight";
}

/** A highlight never reviewed: it counts in `new_highlights`, not `due`. */
export function isNewHighlight(card: ReviewCard): boolean {
  return card.source === "highlight" && card.state === "new";
}

/** The language the card's text is in (the quiz item's, or the highlight's own). */
export function cardLang(card: ReviewCard): string {
  return card.source === "highlight"
    ? (card.front.lang ?? card.where.lang)
    : card.where.lang;
}

/** The state tag in the card's head; "" for a card in review. */
export function tagFor(
  card: ReviewCard,
  meta: Pick<QueueMeta, "day" | "now">,
): string {
  const T = REVIEW.card.tags;
  if (isNewHighlight(card)) return T.new;
  if (card.reset) return T.reset;
  const tz = meta.day.time_zone;
  if (card.state === "relearning") {
    const overdue =
      new Date(card.due).getTime() < new Date(meta.day.start).getTime();
    const n = dayDiff(card.due, meta.now, tz);
    return overdue && n >= 1 ? T.relearningDue(n) : T.relearning;
  }
  if (card.state === "learning") {
    return new Date(card.created_at).getTime() >=
      new Date(meta.day.start).getTime()
      ? T.learningToday
      : T.learning;
  }
  return "";
}

/** The source line under the card's head, without the language suffix. */
export function sourceText(card: ReviewCard): string {
  const w = card.where;
  if (w.book !== null && w.book_title) {
    return w.chapter_index !== null && w.chapter_count !== null
      ? REVIEW.card.book(w.book_title, w.chapter_index, w.chapter_count)
      : w.book_title;
  }
  return REVIEW.card.loose(w.project);
}

/** The where-block's place line, or "" when a highlight has no section to name. */
export function placeText(card: ReviewCard): string {
  const w = card.where;
  if (card.source === "highlight") {
    const title = card.front.block_title || w.block_title;
    return title ? REVIEW.where.section(title) : "";
  }
  return REVIEW.where.quiz(
    w.quiz_title ?? null,
    w.item_index ?? 1,
    w.item_count ?? 1,
  );
}

// --- the queue's state -----------------------------------------------------------------

export type EndKind =
  "card" | "done" | "limit" | "limitNew" | "paused" | "empty";

/**
 * Which screen the queue is on when there is no card to show: a daily limit holding cards
 * back (they stay in `counts`: S3's due is "due by the end of today"), "done for today", or
 * "no review cards yet". `limit_reached` says which limit; without it the page infers it from
 * the profile.
 */
export function endKind(args: {
  cards: number;
  counts: Counts;
  limit_reached: LimitReached | undefined;
  profile: Profile;
  next_due_at: string | null;
}): EndKind {
  const { cards, counts, profile } = args;
  if (cards > 0) return "card";
  if (counts.due + counts.new_highlights > 0) {
    const which: LimitReached =
      args.limit_reached ??
      (counts.done_today >= profile.max_reviews_per_day
        ? "reviews"
        : "new_highlights");
    if (which === "reviews") return "limit";
    return profile.new_highlights_per_day === 0 ? "paused" : "limitNew";
  }
  if (counts.done_today === 0 && args.next_due_at === null) return "empty";
  return "done";
}

/** The progress line's fill: `done_today ÷ (done_today + due + new_highlights)`, 0 to 100. */
export function progressPct(counts: Counts): number {
  const all = counts.done_today + counts.due + counts.new_highlights;
  return all > 0 ? Math.round((counts.done_today / all) * 100) : 0;
}

/** One By-book row: the title, the counts joined by " · " (a zero part omitted) and the sub-line. */
export function bookRow(row: BookRow): {
  key: string;
  title: string;
  counts: string;
  sub: string;
} {
  const bits: string[] = [];
  if (row.due > 0) bits.push(REVIEW.head.dueN(row.due));
  if (row.new > 0) bits.push(REVIEW.head.newN(row.new));
  return {
    key: `${row.org}/${row.project}/${row.book ?? ""}`,
    title: row.book !== null && row.book_title ? row.book_title : row.project,
    counts: bits.join(" · "),
    sub:
      row.book !== null
        ? REVIEW.head.bookSub(row.project)
        : REVIEW.head.looseSub,
  };
}

/** The note under By book's rows: what the rows are, or why cards wait. */
export function booksNote(args: {
  kind: EndKind;
  profile: Profile;
  heldNew: boolean;
}): string {
  const N = REVIEW.head.notes;
  if (args.kind === "limit")
    return N.limitReviews(args.profile.max_reviews_per_day);
  if (args.kind === "limitNew" || args.kind === "paused")
    return N.limitNew(args.profile.new_highlights_per_day);
  return N.mixed + (args.heldNew ? N.heldNew : "");
}

// --- the local queue, after a write ----------------------------------------------------

export interface Landed {
  queue: ReviewCard[];
  /** The local queue ran out but cards are still due: ask the server for more. */
  refetch: boolean;
}

function settle(
  queue: ReviewCard[],
  counts: Counts,
  limit: LimitReached,
  next: ReviewCard | null,
): Landed {
  if (queue.length > 0) return { queue, refetch: false };
  if (next) return { queue: [next], refetch: false };
  const more = counts.due + counts.new_highlights > 0 && limit === null;
  return { queue: [], refetch: more };
}

/**
 * A rating's reply on the local queue: the rated card leaves; one that is due again today
 * (`due_today`) goes to the END of the queue with the reply's schedule and previews; a daily
 * limit reached ends the session (the cards left are held for tomorrow). The counts are the
 * reply's, never counted here.
 */
export function landRating(
  queue: ReviewCard[],
  rated: ReviewCard,
  reply: RateReply,
): Landed {
  if (reply.limit_reached !== null) return { queue: [], refetch: false };
  const rest = queue.filter((c) => c.card_id !== rated.card_id);
  if (reply.card.due_today && reply.card.previews) {
    const again: ReviewCard = {
      ...rated,
      state: reply.card.state,
      reps: reply.card.reps,
      lapses: reply.card.lapses,
      reset: false,
      due: reply.card.due,
      previews: reply.card.previews,
    };
    rest.push(again);
  }
  return settle(rest, reply.counts, reply.limit_reached, reply.next);
}

/** A suspend's reply: the card has left the local queue already (optimistic). */
export function landSuspend(queue: ReviewCard[], reply: StatusReply): Landed {
  if (reply.limit_reached !== null) return { queue: [], refetch: false };
  return settle(queue, reply.counts, reply.limit_reached, null);
}

/** The header's counts with one card taken out (or put back): replaced by the server's reply. */
export function adjustCounts(
  counts: Counts,
  card: ReviewCard,
  delta: 1 | -1,
): Counts {
  return isNewHighlight(card)
    ? { ...counts, new_highlights: Math.max(0, counts.new_highlights + delta) }
    : { ...counts, due: Math.max(0, counts.due + delta) };
}

// --- review settings -------------------------------------------------------------------

export interface SettingsDraft {
  tz: string;
  max: string;
  maxNew: string;
}

/** A whole number in `[lo, hi]`, as typed (digits only, spaces trimmed). */
export function intIn(
  value: string | null | undefined,
  lo: number,
  hi: number,
): boolean {
  const t = String(value ?? "").trim();
  return /^\d+$/.test(t) && Number(t) >= lo && Number(t) <= hi;
}

export function settingsErrors(d: SettingsDraft): {
  max: boolean;
  maxNew: boolean;
} {
  return { max: !intIn(d.max, 1, 999), maxNew: !intIn(d.maxNew, 0, 999) };
}

/** "{IANA id} · UTC±HH:MM" (a true minus sign), at `at`; "UTC" alone. */
export function zoneLabel(id: string, at: Date): string {
  if (id === "UTC") return "UTC";
  let offset = "";
  try {
    const part = new Intl.DateTimeFormat("en-US", {
      timeZone: id,
      timeZoneName: "longOffset",
    })
      .formatToParts(at)
      .find((p) => p.type === "timeZoneName");
    offset = (part?.value ?? "").replace("GMT", "").replace("-", "−");
  } catch {
    offset = "";
  }
  return `${id} · UTC${offset === "" ? "+00:00" : offset}`;
}

/** The zones the select offers: the browser's list, plus UTC and the zone in use. */
export function zoneIds(current: string): string[] {
  let list: string[] = [];
  try {
    list =
      (
        Intl as unknown as { supportedValuesOf?: (k: string) => string[] }
      ).supportedValuesOf?.("timeZone") ?? [];
  } catch {
    list = [];
  }
  const set = new Set<string>(list);
  set.add("UTC");
  if (current) set.add(current);
  return [...set].sort((a, b) => a.localeCompare(b));
}

/** The browser's own zone, or null where it cannot be told. */
export function browserZone(): string | null {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || null;
  } catch {
    return null;
  }
}

export type { Day };
