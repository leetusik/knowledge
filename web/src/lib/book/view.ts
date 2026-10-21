/**
 * P30.S23 — what the book page draws (`07-book-page` *Data the page needs*): the plain,
 * serialisable view model the loader builds from the reads and the components render. Hrefs
 * are already built (`reader-href.ts`); no component computes a URL or a sentence of state.
 */
import type { RowState, Viewer } from "./model";

export interface LangLinkView {
  code: string;
  /** The language in its own name, "English". */
  label: string;
  /** The variant's newest version. */
  v: number;
  stale: boolean;
  href: string;
}

export interface VersionRowView {
  v: number;
  /** "Published 12 Oct 2026", or "" when the history could not be read. */
  published: string;
  current: boolean;
  /** "Translated from English v1", only the current row of a translation. */
  from: string;
  aria: string;
  href: string;
}

export interface VersionGroupView {
  code: string;
  label: string;
  legacy: boolean;
  rows: VersionRowView[];
}

export interface RowView {
  key: string;
  /** The chapter's ordinal in manifest order, 1 to M. */
  n: number;
  title: string;
  lang: string;
  legacy: boolean;
  state: RowState;
  /** The state word, member only ("" signed out). */
  word: string;
  /** "P24.S3" on a per-slice book's row. */
  slice: string;
  href: string;
  langLinks: LangLinkView[];
  /** One language, two or more versions: "v3 · 14 Oct 2026". */
  single: string;
  /** Some language has two or more versions (the Versions button). */
  multiVer: boolean;
  groups: VersionGroupView[];
}

export interface ContView {
  kind: "continue" | "next" | "start" | "finished";
  /** The chapter number the block names. */
  n: number;
  total: number;
  title: string;
  lang: string;
  legacy: boolean;
  section: string;
  pct: number;
  summary: string;
  after: number | null;
  /** The first Updated chapter's number, "Chapter N has been updated since you finished it." */
  updatedN: number | null;
  href: string;
}

export interface BookView {
  org: string;
  project: string;
  slug: string;
  title: string;
  viewer: Viewer;
  kindLabel: string;
  /** "knowledge", "@quillwork / knowledge", or the subject. */
  place: string;
  description: string;
  done: number;
  total: number;
  pct: number;
  /** "5 chapters". */
  count: string;
  /** "2 of 5 finished" signed in, "5 chapters" signed out: the top bar's middle line. */
  topLine: string;
  shapeNote: string;
  rows: RowView[];
  cont: ContView;
  /** The per-book list's entry; null = left out. */
  notes: { href: string; line: string } | null;
  /** The reading-data foot; null = not drawn (signed out, or no data). */
  data: { chapters: number; marks: number } | null;
  /** Whether the viewer may have reading data to clear (signed in). */
  signedIn: boolean;
  libraryHref: string;
  signInHref: string;
}
