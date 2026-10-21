/**
 * P30.S21 — the lists of marks (`05-annotations` round 01: the Notes sheet, a row in a
 * list, the per-book list). Pure: it turns what the reads return (highlights, section
 * notes, bookmarks, the orphans, the other languages' marks) into the rows the chapter's
 * Notes sheet and the book's list show, in the signed order, with the signed words.
 *
 * Nothing here ever drops a mark: a highlight whose section is gone is Unanchored, a
 * bookmark whose section is gone and has nowhere to land is Unanchored, and a mark in
 * another language is listed under that language. The tests pin it.
 */
import { READER } from "@/content";

import { clip, langOf } from "./notes";
import type {
  CardStatus,
  ReaderBookmark,
  ReaderNote,
  ReaderNotes,
  ReaderOtherNote,
} from "./types";

const R = READER.notes.row;

/** What a listed mark is, for the view it gets (`AN.view`'s statuses). */
export type ListStatus =
  | "anchored"
  | "block" // Text changed
  | "orphan" // Unanchored
  | "approx" // a bookmark placed from an HTML version
  | "pos" // a position bookmark
  | "other"; // made in another language

export interface ListItem {
  id: string;
  kind: "hl" | "bnote" | "bm";
  status: ListStatus;
  lang: string;
  /** The version it was made on. */
  version: number;
  /** The section it lands on (the chapter on screen), or null. */
  sec: string | null;
  /** The section's label ("Background", "Diagram · The flow"), for the meta line. */
  secTitle: string;
  quote: string;
  note: string;
  label: string;
  snippet: string;
  card: CardStatus;
  review: boolean;
  approx: boolean;
  pos: boolean;
  /** A position's fraction of the text, 0..1. */
  frac: number;
  /** The quote is from a code block (mono, unpainted). */
  code: boolean;
  snapshot: { text: string; block: string; chapter: string } | null;
  /** The chapter's own title (the Unanchored meta in the Notes sheet). */
  chapterTitle: string | null;
  /** The per-book list: the chapter it sits in. */
  chapterKey: string | null;
  order: number;
}

/** A section's place and name, as the lists need them. */
export interface SectionLook {
  n: number;
  label: string;
}

export type SectionIndex = ReadonlyMap<string, SectionLook>;

/** The rank of a mark within its section: bookmark, section note, Text changed, then highlights by offset. */
const RANK = { bm: -3, bnote: -2, block: -1 } as const;

export interface BuildOptions {
  /** Sections by id, in the chapter on screen. */
  sections: SectionIndex;
  /**
   * False when the sections of the chapter are not at hand (the book's list): a bookmark
   * is then placed by what the server said (`at`), not by looking its section up.
   */
  known?: boolean;
  chapterTitle: string;
  /** The quotes that sit in a code block (highlight ids). */
  code: ReadonlySet<string>;
}

const SECTION_SCALE = 1e6;
const UNPLACED = 9e9;

function look(sections: SectionIndex, id: string | null): SectionLook | null {
  return id ? (sections.get(id) ?? null) : null;
}

/** A highlight, a section note: anchored, Text changed or Unanchored. */
export function noteItem(n: ReaderNote, o: BuildOptions): ListItem {
  const orphan = n.status === "orphan";
  const changed = n.status === "block";
  const sec = orphan ? null : (n.sec ?? n.block);
  const where = look(o.sections, sec);
  const status: ListStatus = orphan ? "orphan" : changed ? "block" : "anchored";
  const start = n.start ?? 0;
  const order = where
    ? where.n * SECTION_SCALE +
      (n.kind === "bnote" ? RANK.bnote : changed ? RANK.block : start)
    : UNPLACED;
  return {
    id: n.id,
    kind: n.kind,
    status,
    lang: n.lang,
    version: n.version,
    sec,
    secTitle: where?.label ?? n.snapshot?.block ?? "",
    quote: n.quote?.exact ?? "",
    note: n.note,
    label: "",
    snippet: "",
    card: n.card,
    review: n.review,
    approx: false,
    pos: false,
    frac: 0,
    code: o.code.has(n.id),
    snapshot: n.snapshot,
    chapterTitle: o.chapterTitle,
    chapterKey: null,
    order,
  };
}

/**
 * A bookmark in this chapter. A native bookmark lands on its section (or the nearest
 * preceding one when its own was retired); with nowhere to land it is Unanchored. A
 * position is "pos" in a plain document and "approx" when it came from an HTML version.
 */
export function bookmarkItem(
  b: ReaderBookmark,
  o: BuildOptions,
  total: number,
): ListItem {
  const where = look(o.sections, b.at);
  let status: ListStatus;
  if (b.approx) status = "approx";
  else if (b.pos) status = "pos";
  else status = (o.known === false ? b.at : where) ? "anchored" : "orphan";
  const frac = b.fraction ?? 0;
  let order: number;
  if (status === "anchored" && where) order = where.n * SECTION_SCALE + RANK.bm;
  else if (status === "orphan") order = UNPLACED;
  else if (where && b.at) order = where.n * SECTION_SCALE + RANK.bm;
  else order = frac * SECTION_SCALE * Math.max(1, total);
  return {
    id: b.id,
    kind: "bm",
    status,
    lang: b.lang,
    version: b.version,
    sec: status === "orphan" ? null : b.at,
    secTitle: where?.label ?? b.snippet,
    quote: "",
    note: "",
    label: b.label,
    snippet: b.snippet,
    card: "",
    review: false,
    approx: b.approx,
    pos: b.pos,
    frac,
    code: false,
    snapshot: null,
    chapterTitle: o.chapterTitle,
    chapterKey: null,
    order,
  };
}

/** A mark made in another language: listed under that language, never painted. */
export function otherItem(n: ReaderOtherNote, o: BuildOptions): ListItem {
  const where = look(o.sections, n.at);
  return {
    ...noteItem({ ...n, status: "anchored" }, o),
    status: "other",
    sec: n.at,
    secTitle: where?.label ?? n.snapshot?.block ?? "",
    order: where ? where.n * SECTION_SCALE + (n.start ?? 0) : UNPLACED,
  };
}

export function otherBookmarkItem(
  b: ReaderBookmark,
  o: BuildOptions,
): ListItem {
  const where = look(o.sections, b.at);
  return {
    ...bookmarkItem(b, o, o.sections.size),
    status: "other",
    sec: b.at,
    secTitle: where?.label ?? b.snippet,
    order: where ? where.n * SECTION_SCALE + RANK.bm : UNPLACED,
  };
}

/** The Notes sheet's three groups (the chapter's items, the other languages, the Unanchored). */
export interface Groups {
  items: ListItem[];
  /** One group per other language, in the order their first mark reads. */
  other: { lang: string; items: ListItem[] }[];
  orphans: ListItem[];
  /** "Notes · N": this chapter's items, the other languages' and the unanchored. */
  count: number;
}

const byOrder = (a: ListItem, b: ListItem) =>
  a.order - b.order || a.id.localeCompare(b.id);

/** Build the Notes sheet's groups from the layer's current marks (a deleted mark is left out). */
export function buildGroups(
  notes: Pick<
    ReaderNotes,
    "items" | "unanchored" | "bookmarks" | "other" | "otherBookmarks"
  >,
  o: BuildOptions,
  gone: ReadonlySet<string> = new Set(),
): Groups {
  const alive = <T extends { id: string }>(list: readonly T[]) =>
    list.filter((x) => !gone.has(x.id));
  const total = o.sections.size;
  const items: ListItem[] = [];
  const orphans: ListItem[] = [];
  for (const n of alive(notes.items)) items.push(noteItem(n, o));
  for (const n of alive(notes.unanchored)) orphans.push(noteItem(n, o));
  for (const b of alive(notes.bookmarks)) {
    const it = bookmarkItem(b, o, total);
    (it.status === "orphan" ? orphans : items).push(it);
  }
  items.sort(byOrder);
  orphans.sort(byOrder);
  const langs = new Map<string, ListItem[]>();
  const add = (it: ListItem) =>
    langs.set(it.lang, [...(langs.get(it.lang) ?? []), it]);
  for (const n of alive(notes.other)) add(otherItem(n, o));
  for (const b of alive(notes.otherBookmarks)) add(otherBookmarkItem(b, o));
  const other = [...langs.entries()]
    .map(([lang, list]) => ({ lang, items: list.sort(byOrder) }))
    .sort(
      (a, b) =>
        a.items[0].order - b.items[0].order || a.lang.localeCompare(b.lang),
    );
  const count =
    items.length +
    orphans.length +
    other.reduce((n, g) => n + g.items.length, 0);
  return { items, other, orphans, count };
}

// --- what one row shows (`NoteItem`) ------------------------------------------------------

export interface RowView {
  id: string;
  canGo: boolean;
  /** The mono kind line ("Highlight · note", "Bookmark · position", "Unanchored" …). */
  k: string;
  review: boolean;
  /** The quote in the reading face (painted, or plain for Text changed). */
  quote: string;
  quoteLang: string;
  hasQuote: boolean;
  plainQuote: boolean;
  code: boolean;
  /** The struck-through snapshot of an Unanchored mark. */
  gone: string;
  hasGone: boolean;
  /** A bookmark's label, snippet or section title. */
  title: string;
  titleLang: string;
  titleBold: boolean;
  hasTitle: boolean;
  note: string;
  noteLang: string;
  hasNote: boolean;
  /** The book's list starts the meta with the language's endonym. */
  langName: string;
  langCode: string;
  hasLang: boolean;
  meta: string;
  hasMeta: boolean;
  isBm: boolean;
  labelBtn: string;
  label: string;
  delWord: string;
  delAria: string;
}

/** The kind line, the main text, the note and the meta of one listed mark (`AN.itemVm`). */
export function rowView(
  it: ListItem,
  ctx: "panel" | "book",
  langName: (lang: string) => string,
): RowView {
  const book = ctx === "book";
  const isHl = it.kind === "hl";
  const isB = it.kind === "bnote";
  const isBm = it.kind === "bm";
  const gone = it.status === "orphan";
  const changed = it.status === "block";
  const diagram = /^Diagram/.test(it.secTitle);
  const k = gone
    ? R.kUnanchored
    : changed
      ? R.kChanged
      : isHl
        ? it.note
          ? R.kHighlightNote
          : R.kHighlight
        : isB
          ? diagram
            ? R.kNoteDiagram
            : R.kNoteSection
          : it.approx
            ? R.kApprox
            : it.pos
              ? R.kPosition
              : R.kBookmark;
  const pct = Math.round(it.frac * 100);
  let meta = "";
  if (gone) {
    const sn = it.snapshot;
    meta = R.metaGone(
      sn?.block || it.secTitle || R.metaGoneBlock,
      book ? null : sn?.chapter || it.chapterTitle || "",
    );
  } else if (changed) meta = R.metaChanged(langName(it.lang), it.version);
  else if (it.approx) meta = R.metaApprox(pct);
  else if (it.pos) meta = R.metaPosition(pct);
  else if (isBm) meta = it.label ? it.secTitle : "";
  else meta = it.secTitle;
  const snapText = it.snapshot?.text ?? "";
  // An Unanchored bookmark has no snapshot; its snippet stands in, struck through.
  const goneText = gone ? it.quote || snapText || (isBm ? it.snippet : "") : "";
  const title = isBm
    ? gone
      ? ""
      : it.label || (it.approx || it.pos ? clip(it.snippet, 140) : it.secTitle)
    : "";
  const aria =
    (isBm
      ? READER.notes.aria.removeBookmark
      : isB
        ? READER.notes.aria.deleteNote
        : READER.notes.aria.deleteHighlight) +
    clip(title || it.quote || goneText || it.note || it.secTitle, 60);
  return {
    id: it.id,
    canGo: !gone,
    k,
    review: isHl && it.card === "active" && !gone,
    quote: it.quote,
    quoteLang: it.lang,
    hasQuote: (isHl || changed) && !gone && !!it.quote,
    plainQuote: changed,
    code: it.code,
    gone: goneText,
    hasGone: gone && !!goneText,
    title,
    titleLang: isBm && it.label ? langOf(it.label, "en") : it.lang,
    titleBold: isBm && !!it.label,
    hasTitle: !!title,
    note: it.note,
    noteLang: langOf(it.note, it.lang),
    hasNote: !!it.note,
    langName: langName(it.lang),
    langCode: it.lang,
    hasLang: book,
    meta,
    hasMeta: !!meta || book,
    isBm: isBm && !gone,
    labelBtn: it.label ? READER.notes.bm.editLabel : READER.notes.bm.addLabel,
    label: it.label,
    delWord: isBm ? R.remove : R.del,
    delAria: aria,
  };
}

// --- the per-book list -------------------------------------------------------------------

export type BookFilter = "all" | "bm" | "hl";

export interface BookEntry {
  item: ListItem;
  /** The chapter's place in the book (0-based), and the variant's order within it. */
  chapter: number;
  variant: number;
  /** Where in the chapter: the section's index (null = after every section), then a tie-break. */
  at: number | null;
  rank: number;
}

export interface BookChapter {
  key: string;
  n: number;
  title: string;
  lang: string;
  entries: BookEntry[];
}

export function matches(filter: BookFilter, it: ListItem): boolean {
  if (filter === "all") return true;
  return filter === "bm" ? it.kind === "bm" : it.kind !== "bm";
}

/** The book's list: chapters in book order, each language's marks after the other, in reading order. */
export function groupBook(
  entries: readonly BookEntry[],
  filter: BookFilter,
  chapters: readonly { key: string; n: number; title: string; lang: string }[],
): BookChapter[] {
  const shown = entries.filter((e) => matches(filter, e.item));
  const out: BookChapter[] = [];
  for (const c of chapters) {
    const mine = shown
      .filter((e) => e.item.chapterKey === c.key)
      .sort(
        (a, b) =>
          a.variant - b.variant ||
          (a.at ?? 1e9) - (b.at ?? 1e9) ||
          a.rank - b.rank ||
          a.item.order - b.item.order ||
          a.item.id.localeCompare(b.item.id),
      );
    if (mine.length) out.push({ ...c, entries: mine });
  }
  return out;
}

/** The head's count line, following the filter ("26 items in 5 chapters · 2 approximate · 2 unanchored"). */
export function bookCountLine(
  entries: readonly BookEntry[],
  filter: BookFilter,
  chapters: number,
): string {
  const shown = entries.filter((e) => matches(filter, e.item));
  const approx = shown.filter((e) => e.item.status === "approx").length;
  const gone = shown.filter((e) => e.item.status === "orphan").length;
  return READER.notes.book.count(
    shown.length,
    filter === "bm" ? "bookmarks" : filter === "hl" ? "highlights" : "items",
    chapters,
    approx,
    gone,
  );
}

export function bookCounts(
  entries: readonly BookEntry[],
): Record<BookFilter, number> {
  return {
    all: entries.length,
    bm: entries.filter((e) => e.item.kind === "bm").length,
    hl: entries.filter((e) => e.item.kind !== "bm").length,
  };
}

// --- bookmarks --------------------------------------------------------------------------

/** A position bookmark within this much of the reader's place is "the same place" (±2%). */
export const POSITION_WINDOW = 0.02;

/** The position bookmark near `frac`, if any: pressing the control removes it instead of adding. */
export function positionNear(
  marks: readonly { id: string; fraction: number | null }[],
  frac: number,
): string[] {
  return marks
    .filter(
      (m) =>
        m.fraction !== null &&
        Math.abs(m.fraction - frac) <= POSITION_WINDOW + 1e-9,
    )
    .map((m) => m.id);
}

/** The text under the top bar, clipped at 140 characters on a word boundary with "…". */
export function snippetOf(text: string): string {
  return clip(text.replace(/\s+/g, " ").trim(), 140);
}

/** A word for a count of marks: "1 highlight", "2 notes", "3 highlights and notes" (Text changed, other languages). */
export function marksWord(
  list: readonly { kind: "hl" | "bnote" | "bm" }[],
): string {
  const hl = list.filter((a) => a.kind === "hl").length;
  const nb = list.length - hl;
  const n = (c: number, one: string, many: string) =>
    `${c} ${c === 1 ? one : many}`;
  if (!nb) return n(hl, "highlight", "highlights");
  if (!hl) return n(nb, "note", "notes");
  return n(list.length, "highlight or note", "highlights and notes");
}
