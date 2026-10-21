/**
 * The reader's view model (`01-reader` round 02, *Data the page needs*), as the shell
 * takes it: plain data only, built on the server and handed to the client frame.
 * Deliberately NOT `server-only`: the client island imports the types and the pure
 * helpers beside them.
 */
import type { ReaderTarget } from "@/lib/reader-href";
import type { ReaderSettings } from "@/lib/reader-cookie";

export type ChapterState = "unopened" | "started" | "finished";

/** One row of the chapter list (§11). */
export interface ChapterRow {
  key: string;
  n: number;
  title: string;
  /** The title's language (the reader's, when that variant exists). */
  lang: string;
  format: "native" | "md" | "legacy";
  href: string;
  current: boolean;
  /** Member only. */
  state?: ChapterState;
  /** Member only: `max_fraction` as a percent; "Started" shows it above 0. */
  percent?: number;
  /** Member only: finished on a version older than the newest. */
  updated?: boolean;
}

export interface NeighbourChapter {
  title: string;
  lang: string;
  href: string;
  /** The chapter's place, 1-based (the chapter end's "Next · Chapter N"). */
  n?: number;
  /** The next chapter's lede, when it has one (the chapter end). */
  summary?: string | null;
}

/** A heading the section tracking and the Contents sheet's section list read. */
export interface ReaderHeading {
  id: string;
  level: 2 | 3;
  text: string;
}

export interface ReaderBook {
  title: string;
  /** The book page. */
  backHref: string;
  /** This chapter's place, 1-based, among the book's chapters with a live variant. */
  n: number;
  total: number;
  prev?: NeighbourChapter;
  next?: NeighbourChapter;
  /** The last chapter's way back: the book page. */
  chapters: ChapterRow[];
  /** "X of M finished" (member), null when signed out or the state is unavailable. */
  finished: number | null;
}

export interface ReaderLanguage {
  lang: string;
  /** "English", "한국어": each language named in itself. */
  label: string;
}

/** The source of a translation whose source has since moved on (the "Older translation" notice). */
export interface TranslationSource {
  lang: string;
  /** "English": the source language named in itself. */
  label: string;
  /** The source version this translation was made from. */
  from: number;
  /** The source's current version. */
  newest: number;
}

/** Where a member's position is written: the document the variant on screen is stored as. */
export interface ReaderWrite {
  /** The org slug, or the tenant id for a tenant without one. */
  org: string;
  project: string;
  /** The document stem `<date>-<slug>`. */
  doc: string;
}

/** The unit's latest position mapped onto this variant (`resume`, S9). */
export interface ReaderResume {
  /** The section id to land on; null = land at `fraction`. */
  block: string | null;
  fraction: number;
}

/** A member's saved progress on this chapter or document, as read at load. */
export interface ReaderProgress {
  state: ChapterState;
  finishedVersion: number | null;
  /** This variant's own furthest-read fraction, 0..1. */
  maxFraction: number;
  /** Set only when the chapter is started and has a place to return to. */
  resume: ReaderResume | null;
}

/** One row of the Version history sheet (§14), newest first. */
export interface VersionRow {
  n: number;
  /** `YYYY-MM-DD`; empty when the index does not carry it. */
  date: string;
  /** "Translated from English v1": known for the current version only. */
  from: { label: string; version: number } | null;
}

export interface ReaderVersions {
  /** False: the history could not be read ("Unavailable"). */
  ok: boolean;
  /** "English", "한국어": the variant's own language name. */
  label: string;
  rows: VersionRow[];
}

/** What the client frame needs; the article itself arrives as `children`. */
export interface ReaderView {
  kind: "chapter" | "loose";
  member: boolean;
  /** The chapter or document title (the top bar's label comes from the book). */
  title: string;
  lang: string;
  langs: ReaderLanguage[];
  version: number;
  newest: number;
  /** The lede: the native header's `summary`. Null for md and when absent. */
  summary: string | null;
  /** `YYYY-MM-DD`: the displayed version's publication date. Empty when unknown. */
  date: string;
  /** The project's name: a loose document's book line. */
  project: string;
  /** Set when this variant's source has been updated since it was translated. */
  staleSource: TranslationSource | null;
  target: ReaderTarget;
  /** Where this reader's position is written; null = nowhere to save (see `progress`). */
  write: ReaderWrite | null;
  /** A member's saved progress; null when signed out or when it could not be read. */
  progress: ReaderProgress | null;
  /** The Version history sheet's rows. */
  versions: ReaderVersions | null;
  book: ReaderBook | null;
  headings: ReaderHeading[];
  settings: ReaderSettings;
}

// --- P30.S20: highlights and notes (`05-annotations`) --------------------------------------

/** What a section's kind is called: the bar's "{word} · {title}" and the popover's place. */
export type SectionWord = "Section" | "Diagram" | "Quiz" | "Figure" | "Sources";

/** A section of a native chapter, as the annotation layer names it and anchors in it. */
export interface NoteSection {
  id: string;
  word: SectionWord;
  /** The heading's text, or the typed block's title or caption. */
  title: string;
  /** The section's text in the shared projection (`project.ts`): what offsets count. */
  text: string;
}

/** A highlight's review card: `active` (Review this on), `suspended` (paused) or none (P30.S21, OQ102). */
export type CardStatus = "" | "active" | "suspended";

/** One of the reader's own highlights or block notes, resolved for the version on screen. */
export interface ReaderNote {
  id: string;
  kind: "hl" | "bnote";
  /** The section it was made in (never rewritten). */
  block: string;
  /** Where it is painted or shown now (the resolved anchor's section), or null. */
  sec: string | null;
  start: number | null;
  end: number | null;
  /** `anchored` | `block` (Text changed) | `orphan` (Unanchored). */
  status: string;
  method: string;
  quote: { exact: string; prefix: string; suffix: string } | null;
  note: string;
  /** "Review this" is on (the card is active). */
  review: boolean;
  /** The caller's own review card on it, as the server holds it (P30.S21). */
  card: CardStatus;
  lang: string;
  /** The version it was made on. */
  version: number;
  created: string;
  /** What it was made on, kept for an orphan's row (the text, its section, its chapter). */
  snapshot: { text: string; block: string; chapter: string } | null;
}

/**
 * A highlight or note made in another language variant of this chapter (P30.S9): its
 * section mapped onto this variant by id, never painted.
 */
export interface ReaderOtherNote extends ReaderNote {
  /** The section on THIS variant it belongs to; null = no mappable section. */
  at: string | null;
}

/**
 * A bookmark (P29 *Anchors*): a native one is a section; a position (plain Markdown, or
 * migrated from an HTML chapter) is a fraction. `place` is where it lands in this variant now.
 */
export interface ReaderBookmark {
  id: string;
  /** The section it was made on (native), or null for a position. */
  block: string | null;
  /** The section it lands on now (the nearest preceding one when its own was retired), or null. */
  at: string | null;
  /** True when `at` is the bookmark's own section. */
  exact: boolean;
  /** A position's fraction of the text read, 0..1. */
  fraction: number | null;
  label: string;
  snippet: string;
  /** A position bookmark (plain document). */
  pos: boolean;
  /** Placed from an HTML version (a migrated bookmark). */
  approx: boolean;
  lang: string;
  version: number;
  created: string;
}

/** A bookmark made in another language variant of this chapter. */
export type ReaderOtherBookmark = ReaderBookmark;

/** The annotation layer's data: present for a native chapter that renders, and a plain document. */
export interface ReaderNotes {
  /** A plain Markdown document: no sections, no highlights; bookmarks are positions. */
  plain: boolean;
  sections: NoteSection[];
  /** Anchored and Text changed, in reading order. */
  items: ReaderNote[];
  /** Orphans: the Unanchored group (S21), never dropped. */
  unanchored: ReaderNote[];
  bookmarks: ReaderBookmark[];
  /** Other languages' highlights and notes (markers, never paint). */
  other: ReaderOtherNote[];
  otherBookmarks: ReaderOtherBookmark[];
  /** Each language on screen or in another variant, named in itself ("English", "한국어"). */
  langNames: Record<string, string>;
}
