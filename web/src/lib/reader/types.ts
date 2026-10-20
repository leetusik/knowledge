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
  book: ReaderBook | null;
  headings: ReaderHeading[];
  settings: ReaderSettings;
}
