import type { KbListenState, KbListenTimeline } from "@/lib/knowledge/listen";

import type { Listen, ListenSpan, ListenUnitKey } from "./types";

// P41-sr.W2 — a book Listen on the one stream (`11-listen` F30, F33; P41-sr.B1, B2): the
// pure parts, so they are tested in node. A book plays as one playlist; its chapters are
// the timeline's entries, so every chapter seek and every chapter boundary comes from the
// timeline's own `start` and `len`, never from the client's arithmetic.

/** The unit a key names: a page compares it with the docked Listen's (F27). A book is one unit, whatever its start chapter. */
export function unitOfKey(key: ListenUnitKey): string {
  return "doc" in key
    ? `${key.org}/${key.project}/${key.doc}`
    : `${key.org}/${key.project}/books/${key.book}`;
}

/** A chapter seek (F30, player-G5): where the chapter starts on the stream, from the timeline; null if it is not on it yet. */
export function chapterStart(
  timeline: Pick<KbListenTimeline, "entries">,
  chapter: string,
): number | null {
  const e = timeline.entries.find((x) => x.chapter === chapter);
  return e ? e.start : null;
}

/** The timeline's entries as spans on the stream's axis. */
export function spansOf(
  timeline: Pick<KbListenTimeline, "entries">,
): ListenSpan[] {
  return timeline.entries.map((e) => ({
    chapter: e.chapter,
    start: e.start,
    len: e.len,
    complete: e.complete,
  }));
}

/**
 * The span heard at `t` seconds: the last one with audio that has started (-1 when there
 * is none). A chapter on the timeline with nothing made yet (`len` 0, the one being made
 * next) is no place to be: its start is the end of the one before.
 */
export function spanAt(spans: readonly ListenSpan[], t: number): number {
  let at = -1;
  for (let i = 0; i < spans.length; i += 1) {
    if (spans[i].start > t + 0.001) break;
    if (spans[i].len > 0) at = i;
  }
  return at;
}

/**
 * Why the stream waits (a stall): `next-waiting` when the chapter being heard is made and
 * the next listenable chapter is not (F10 "Chapter 3 is still preparing", B1's mapping),
 * else `buffering`. The engine asks only at a chapter's end.
 */
export function stallKey(
  state: Pick<KbListenState, "entries">,
  chapter: string | null,
): "next-waiting" | "buffering" {
  const entries = state.entries.filter((e) => e.state !== "unavailable");
  const i = entries.findIndex((e) => e.chapter === chapter);
  if (i < 0 || entries[i].state !== "made") return "buffering";
  const next = entries[i + 1];
  return next && next.state !== "made" ? "next-waiting" : "buffering";
}

/** A chapter's place in the book (1-based), or null. */
export function chapterN(
  l: Pick<Listen, "book">,
  key: string | null,
): number | null {
  if (!l.book || key === null) return null;
  return l.book.chapters.find((c) => c.key === key)?.n ?? null;
}

/** The chapter after `key` in the book, or null on the last. */
export function nextChapter(l: Pick<Listen, "book">, key: string | null) {
  if (!l.book) return null;
  const i = l.book.chapters.findIndex((c) => c.key === key);
  return i >= 0 ? (l.book.chapters[i + 1] ?? null) : null;
}

/** The chapter before `key` in the book, or null on the first. */
export function prevChapter(l: Pick<Listen, "book">, key: string | null) {
  if (!l.book) return null;
  const i = l.book.chapters.findIndex((c) => c.key === key);
  return i > 0 ? l.book.chapters[i - 1] : null;
}
