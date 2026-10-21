/**
 * P30.S23 — the book page's pure rules (`07-book-page` round 01), no I/O: the shape note,
 * a chapter's shown language and state, the Continue reading block (the table in §3), and
 * the stale-translation test. The loader (`load.ts`) feeds these what the reads returned;
 * the tests pin the Continue table, which is the page's one piece of real logic.
 */

import { BOOK } from "@/content/book";
import type { KbBookChapter, KbBookVariant } from "@/lib/knowledge/types";

export type Viewer = "member" | "other" | "anon";
export type RowState = "unopened" | "started" | "finished" | "updated";

/** A chapter's `source` is a small string map (`server/books.py` `validate_source`). */
export function sourceOf(chapter: KbBookChapter): Record<string, string> {
  const s = chapter.source;
  if (!s || typeof s !== "object" || Array.isArray(s)) return {};
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(s as Record<string, unknown>)) {
    if (typeof v === "string") out[k] = v;
  }
  return out;
}

export type Shape =
  { kind: "plain" } | { kind: "phases" } | { kind: "slices"; phase: string };

/**
 * Which shape the book takes (undrawn how the product tells; `book.js` carries it as data):
 * a chapter with a `source.slice` makes it a per-slice book, of the `source.phase` they
 * share (else the slice id's prefix); every chapter with a `source.phase` and no slice
 * makes it a phases book; anything else is a plain guide.
 */
export function shapeOf(chapters: KbBookChapter[]): Shape {
  const sources = chapters.map(sourceOf);
  const sliced = sources.filter((s) => s.slice);
  if (sliced.length > 0) {
    const phase =
      sliced.find((s) => s.phase)?.phase ?? sliced[0].slice.split(".")[0];
    return { kind: "slices", phase };
  }
  if (sources.length > 0 && sources.every((s) => s.phase))
    return { kind: "phases" };
  return { kind: "plain" };
}

/** Manifest order: `position`, ties broken by `key`; chapters with no live variant are left out. */
export function orderChapters(chapters: KbBookChapter[]): KbBookChapter[] {
  return chapters
    .filter((c) => c.variants.length > 0)
    .map((c, i) => ({ c, i }))
    .sort(
      (a, b) =>
        a.c.position - b.c.position ||
        (a.c.key < b.c.key ? -1 : a.c.key > b.c.key ? 1 : a.i - b.i),
    )
    .map((x) => x.c);
}

/**
 * The shown variant: the language this reader last read the chapter in, else the
 * manifest's first variant.
 */
export function shownVariant(
  chapter: KbBookChapter,
  lastRead: string | null | undefined,
): KbBookVariant {
  return (
    (lastRead
      ? chapter.variants.find((v) => v.lang === lastRead)
      : undefined) ?? chapter.variants[0]
  );
}

/**
 * "Older translation": the newest version of this variant was translated from a source
 * version that has since moved on.
 */
export function isStale(
  chapter: KbBookChapter,
  variant: KbBookVariant,
): boolean {
  const from = variant.translated_from;
  if (!from) return false;
  const source = chapter.variants.find((v) => v.lang === from.lang);
  return !!source && source.version > from.version;
}

export interface ChapterStateIn {
  state: "unopened" | "started" | "finished";
  updated: boolean;
}

/** unopened | started | finished | updated (finished on an older version than the newest). */
export function rowState(s: ChapterStateIn | undefined): RowState {
  if (!s || s.state === "unopened") return "unopened";
  if (s.state === "finished") return s.updated ? "updated" : "finished";
  return "started";
}

/** A row counts as finished once it is finished or Updated. */
export const isDone = (s: RowState): boolean =>
  s === "finished" || s === "updated";

/** Where the saved place is, per chapter (index in book order). */
export interface PointerIn {
  /** Index of the pointer's chapter in book order. */
  index: number;
  /** The heading the saved place is under (native only), "" when none. */
  section: string;
  /** Rounded percent of the way in. */
  pct: number;
}

export interface ContRow {
  n: number;
  state: RowState;
  /** The chapter's lede (its `summary`), "" when none. */
  summary: string;
}

export type ContKind = "continue" | "next" | "start" | "finished";

export interface ContPlan {
  kind: ContKind;
  /** Index (book order) of the chapter the block names. */
  index: number;
  /** `next`: the chapter number finished before it. */
  after?: number;
  /** `finished`: chapter numbers (1-based) that are Updated, in book order. */
  updated: number[];
  /** `continue`: where the reader stopped. */
  section: string;
  pct: number;
}

/**
 * The Continue reading block (§3). The pointer is S3's: the most recently updated position
 * among the book's chapters. `rows` are in book order.
 *
 *  - signed out, or nothing opened → "Start · Chapter 1";
 *  - every chapter finished → "Finished" (one or more Updated offers "Read chapter N again");
 *  - the pointer's chapter is started → "Continue · Chapter N" with the section, if known;
 *  - the pointer's chapter is finished → "Next · Chapter N", the next chapter not finished
 *    after it, else the first not finished.
 */
export function planContinue(
  rows: ContRow[],
  signedIn: boolean,
  pointer: PointerIn | null,
): ContPlan {
  const base = { updated: [] as number[], section: "", pct: 0 };
  if (!signedIn || !pointer || rows.length === 0)
    return { ...base, kind: "start", index: 0 };
  if (rows.every((r) => isDone(r.state))) {
    const updated = rows.filter((r) => r.state === "updated").map((r) => r.n);
    return {
      ...base,
      kind: "finished",
      index: updated.length ? updated[0] - 1 : 0,
      updated,
    };
  }
  const at = rows[pointer.index];
  if (at && !isDone(at.state)) {
    return {
      ...base,
      kind: "continue",
      index: pointer.index,
      section: pointer.section,
      pct: pointer.pct,
    };
  }
  const open = (r: ContRow) => r.state === "unopened" || r.state === "started";
  let j = -1;
  for (let k = pointer.index + 1; k < rows.length; k++)
    if (open(rows[k])) {
      j = k;
      break;
    }
  if (j < 0) j = rows.findIndex(open);
  return { ...base, kind: "next", index: Math.max(j, 0), after: at?.n };
}

/** The meta line's state word (member only). */
export function stateWord(state: RowState, pct: number): string {
  const t = BOOK.contents;
  switch (state) {
    case "unopened":
      return t.notStarted;
    case "started":
      return pct > 0 ? t.startedAt(pct) : t.started;
    default:
      return t.finished;
  }
}
