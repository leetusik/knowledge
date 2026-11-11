import type {
  KbListenPlay,
  KbListenState,
  KbListenTimelineSegment,
} from "@/lib/knowledge/listen";

import type { ListenKey } from "./machine";

// P41-sr.W1 — the carried Listen (`11-listen` F19 + F23) as the client holds it. Types
// only: `@/lib/knowledge/listen` is server-only, and a type import is erased.
// P41-sr.W2 — books: a Listen is a document, or a book from a chapter to its end (B1's
// key), played as one stream whose chapters are the timeline's entries (B2).

/** A document Listen's key (P41-sr.B1 § The Listen key). */
export interface ListenDocKey {
  /** The org slug, or the tenant id for a tenant without one. */
  org: string;
  project: string;
  /** The document stem `<date>-<slug>`. */
  doc: string;
}

/** A book Listen's key: the book from `from_chapter` (default its first) to its end. */
export interface ListenBookKey {
  org: string;
  project: string;
  book: string;
  from_chapter?: string;
  /** Picks each chapter's variant (B1); omitted = the start chapter's `en`, else its first. */
  lang?: string;
}

export type ListenUnitKey = ListenDocKey | ListenBookKey;

/** One chapter of a book, in the book's order (the reader's or the landing's list). */
export interface ListenChapter {
  key: string;
  /** Its place in the book, 1-based. */
  n: number;
  title: string;
  lang: string;
  /** The chapter in the reader. */
  href: string;
}

/** The book a book Listen plays: its title, its landing and every chapter. */
export interface ListenBook {
  title: string;
  href: string;
  chapters: ListenChapter[];
}

/** What a reader page or the landing hands the player: its key, its words and the state read at load. */
export interface ListenSeed {
  key: ListenUnitKey;
  /** The document's title; a book's: the start chapter's title. */
  title: string;
  lang: string;
  /** The state read at load for this key; null = not read (the press reads it). */
  state: KbListenState | null;
  /** The document in the reader (Go to the text); a book's chapters carry their own. */
  href: string;
  /** A book Listen's book; null for a document. */
  book: ListenBook | null;
  /** The chapter this page shows (a chapter page), else null. */
  chapter: string | null;
}

/** One chapter's audio, as the making reports it (B1's entries). */
export interface ListenEntry {
  chapter: string | null;
  state: KbListenState["state"];
  /** Made: the length; making: the playable prefix; null before part 1. */
  len: number | null;
  /** The part being made (1-based). */
  part: { n: number; of: number } | null;
  left: number | null;
}

/** One entry on the stream's own axis (B2's timeline): where a chapter starts and how much plays. */
export interface ListenSpan {
  chapter: string | null;
  start: number;
  len: number;
  complete: boolean;
}

/** The one Listen of the page (null when nothing is docked). */
export interface Listen {
  /** `org/project/doc` or `org/project/books/book`: what a page compares to tell "this unit's Listen" (F27). */
  unit: string;
  key: ListenUnitKey;
  kind: "doc" | "book";
  /** The heard unit's title: the document's, or the chapter being heard. */
  title: string;
  lang: string;
  /** The document in the reader (Go to the text). */
  href: string;
  /** A book Listen's book; null for a document. */
  book: ListenBook | null;
  /** The chapter the Listen started from (a book), else null. */
  from: string | null;
  /** The chapter being heard (a book), else null. */
  ch: string | null;
  /** The position inside that chapter (a book; the document's own position for a document). */
  chPos: number;
  /** The chapter's length: made, or its playable prefix while `chSoFar`. */
  chLen: number | null;
  chSoFar: boolean;
  /** The chapter being made (B1's `part.chapter`), or null. */
  making: string | null;
  /** Per-chapter audio (a book). */
  entries: ListenEntry[];
  /** The stream's chapters on its axis (the timeline), in order. */
  spans: ListenSpan[];
  /** F19's key. */
  state: ListenKey;
  /** Where `offline-start` returns to. */
  back: ListenKey | null;
  /** An earlier version plays (F10 "Earlier version"). */
  old: boolean;
  /** Update audio was pressed, or the current version is being made under an earlier one. */
  updating: boolean;
  /** Not everything is made: `len` is the playable prefix (`2:10 of 9:40 so far`). */
  soFar: boolean;
  /** The playable length in seconds; null while nothing is made (F2: no length). */
  len: number | null;
  /** The position in seconds (audio time on the stream's axis, F3). */
  pos: number;
  /** The part being made, or where the voice stopped. */
  part: { n: number; of: number } | null;
  /** The parts of the playing unit, and how many are made (F9's line). */
  parts: number;
  partsMade: number;
  /** About how long the making still takes, in seconds. */
  left: number | null;
  /** When the runner last called (members only), ISO. */
  seen: string | null;
  /** Seconds buffered ahead of the position (F10 "Offline · 2:40 loaded"). */
  loaded: number;
  /** Where playback stopped (offline, a dropped connection). */
  stoppedAt: number | null;
  /** The listener's own, kept from one Listen to the next (F3). */
  speed: number;
  follow: boolean;
  /** Where it plays (BFF paths); null before the unit exists. */
  play: KbListenPlay | null;
  /** Follow along: the heard chapter's spoken segments (stream axis), and the one being read (-1: none). */
  segs: KbListenTimelineSegment[];
  seg: number;
}

/**
 * The place Stop listening keeps (F17, F33): the unit, the chapter and the position in it,
 * until a Listen starts. The pages offer Continue listening from it.
 */
export interface ListenKept {
  unit: string;
  /** The chapter (a book), else null. */
  ch: string | null;
  /** Its place in the book (a book), else null. */
  n: number | null;
  /** Seconds into the chapter (or the document). */
  pos: number;
  /** The chapter's (or document's) length, when known. */
  len: number | null;
  lang: string;
}
