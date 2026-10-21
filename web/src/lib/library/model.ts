/**
 * P30.S22 — the library's view model and its rules, pure (no I/O) so the page, the client
 * island and the tests read one source. `06-library` round 01 §3–§7 and *Data the page needs*.
 *
 *  - `toCards` / `toRows` turn an org listing (`GET /app/orgs/{org}/library`) and the reader's
 *    own state (`GET /app/reader/library`) into the book cards and document rows;
 *  - `buildShelves` groups them by project or by subject, A to Z, with the folded document
 *    rows and the "nothing to read yet" count.
 */
import type {
  KbLibraryBook,
  KbLibraryDocument,
  KbOrgLibrary,
} from "@/lib/knowledge/types";
import type { KbReaderLibrary } from "@/lib/knowledge/reader";
import { publishedDate } from "@/lib/reader/date";
import { languageName } from "@/lib/reader/language";
import { bookHref, orgSegment, readerHref } from "@/lib/reader-href";

export type LibraryGroup = "project" | "subject";

/** A shelf with more than this many documents shows the newest `FOLD_SHOW` and a button. */
export const FOLD_AT = 6;
export const FOLD_SHOW = 5;

export interface BookCard {
  key: string;
  project: string;
  slug: string;
  title: string;
  subject: string | null;
  total: number;
  /** Finished chapters (Updated counts as finished). */
  done: number;
  /** Any finished chapter has a newer version than the one it was finished on. */
  updated: boolean;
  /** Every chapter's shown variant is a legacy html document. */
  allLegacy: boolean;
  /** The languages the book has, `en` first; the card names them when there are two or more. */
  langs: { lang: string; name: string }[];
  href: string;
}

export interface DocRow {
  key: string;
  project: string;
  title: string;
  lang: string;
  subject: string | null;
  /** `9 Oct 2026`. */
  date: string;
  /** `YYYY-MM-DD`: the sort key. */
  sort: string;
  state: "none" | "started" | "finished";
  pct: number;
  updated: boolean;
  legacy: boolean;
  href: string;
}

export interface Shelf {
  key: string;
  name: string;
  isPublic: boolean;
  books: BookCard[];
  docs: RowDoc[];
}
type RowDoc = DocRow;

export interface ProjectInfo {
  name: string;
  isPublic: boolean;
}

const byText = (a: string, b: string): number =>
  a.localeCompare(b, "en", { sensitivity: "base" }) ||
  (a < b ? -1 : a > b ? 1 : 0);

/** The chapter's shown variant: English, else the first (the reader's default). */
function shownVariant(chapter: KbLibraryBook["chapters"][number]) {
  return chapter.variants.find((v) => v.lang === "en") ?? chapter.variants[0];
}

export function toCards(
  listing: KbOrgLibrary,
  state: KbReaderLibrary | null,
): BookCard[] {
  const org = orgSegment({ id: listing.org.id, slug: listing.org.slug });
  const progress = new Map(
    (state?.books ?? [])
      .filter((b) => b.org === listing.org.label)
      .map((b) => [`${b.project}/${b.book}`, b] as const),
  );
  return listing.books.map((book) => {
    const mine = progress.get(`${book.project}/${book.slug}`);
    const langs = [
      ...new Set(book.chapters.flatMap((c) => c.variants.map((v) => v.lang))),
    ].sort((a, b) => (a === "en" ? -1 : b === "en" ? 1 : byText(a, b)));
    const shown = book.chapters.map(shownVariant);
    return {
      key: `${book.project}/${book.slug}`,
      project: book.project,
      slug: book.slug,
      title: book.title,
      subject: book.subject?.trim() || null,
      total: book.chapters.length,
      done: mine?.progress.finished ?? 0,
      updated: (mine?.updated ?? 0) > 0,
      allLegacy:
        shown.length > 0 &&
        shown.every((v) => v !== undefined && v.format === "html"),
      langs: langs.map((lang) => ({ lang, name: languageName(lang) })),
      href: bookHref({ org, project: book.project, book: book.slug }),
    };
  });
}

export function toRows(
  listing: KbOrgLibrary,
  state: KbReaderLibrary | null,
): DocRow[] {
  const mine = new Map(
    (state?.docs ?? [])
      .filter((d) => d.doc.org === listing.org.label)
      .map((d) => [`${d.doc.project}/${d.doc.doc}`, d.position] as const),
  );
  return listing.documents.map((d: KbLibraryDocument) => {
    const position = mine.get(`${d.project}/${d.doc}`);
    return {
      key: `${d.project}/${d.doc}`,
      project: d.project,
      title: d.title,
      lang: d.lang || "en",
      subject: d.subject?.trim() || null,
      date: publishedDate(d.date),
      sort: d.date,
      state: position ? position.state : "none",
      pct: position ? Math.round(position.max_fraction * 100) : 0,
      updated: !!position?.updated,
      legacy: d.format === "html",
      href: readerHref({
        kind: "document",
        id: d.id,
        canonicalPath: d.canonical_path,
      }),
    };
  });
}

export function projectsOf(listing: KbOrgLibrary): ProjectInfo[] {
  return listing.projects.map((p) => ({
    name: p.name,
    isPublic: p.visibility === "public",
  }));
}

export interface Shelves {
  shelves: Shelf[];
  /** Projects with nothing to read (by project only). */
  emptyProjects: number;
  /** By subject, and no book or document has a subject label at all. */
  noSubjects: boolean;
}

function shelf(
  key: string,
  name: string,
  isPublic: boolean,
  books: BookCard[],
  docs: DocRow[],
): Shelf {
  return {
    key,
    name,
    isPublic,
    books: [...books].sort((a, b) => byText(a.title, b.title)),
    docs: [...docs].sort((a, b) =>
      a.sort < b.sort ? 1 : a.sort > b.sort ? -1 : byText(b.key, a.key),
    ),
  };
}

/** `06-library` §4: by project (default) or by subject, A to Z, then "Without a subject". */
export function buildShelves(
  books: BookCard[],
  docs: DocRow[],
  projects: ProjectInfo[],
  group: LibraryGroup,
  withoutSubject: string,
): Shelves {
  if (group === "project") {
    const names = new Set<string>();
    for (const b of books) names.add(b.project);
    for (const d of docs) names.add(d.project);
    const publicBy = new Map(projects.map((p) => [p.name, p.isPublic]));
    const shelves = [...names].sort(byText).map((name) =>
      shelf(
        `p:${name}`,
        name,
        publicBy.get(name) === true,
        books.filter((b) => b.project === name),
        docs.filter((d) => d.project === name),
      ),
    );
    const empty = projects.filter((p) => !names.has(p.name)).length;
    return { shelves, emptyProjects: empty, noSubjects: false };
  }
  const subjects = new Set<string>();
  for (const b of books) if (b.subject) subjects.add(b.subject);
  for (const d of docs) if (d.subject) subjects.add(d.subject);
  const shelves = [...subjects].sort(byText).map((s) =>
    shelf(
      `s:${s}`,
      s,
      false,
      books.filter((b) => b.subject === s),
      docs.filter((d) => d.subject === s),
    ),
  );
  const restBooks = books.filter((b) => !b.subject);
  const restDocs = docs.filter((d) => !d.subject);
  if (restBooks.length > 0 || restDocs.length > 0) {
    shelves.push(shelf("s:-", withoutSubject, false, restBooks, restDocs));
  }
  return { shelves, emptyProjects: 0, noSubjects: subjects.size === 0 };
}

/** Whether any book or document carries a subject (the public page shows the control then). */
export function hasSubjects(books: BookCard[], docs: DocRow[]): boolean {
  return books.some((b) => b.subject) || docs.some((d) => d.subject);
}

/** The group from the URL's `?by=`, else the device's cookie, else by project. */
export function chooseGroup(
  by: string | string[] | undefined | null,
  remembered: LibraryGroup | undefined,
): LibraryGroup {
  const value = Array.isArray(by) ? by[0] : by;
  if (value === "subject") return "subject";
  if (value === "project") return "project";
  return remembered ?? "project";
}

/** The visible document rows of a shelf: all of them, or the newest few when folded. */
export function visibleDocs(docs: DocRow[], open: boolean): DocRow[] {
  return docs.length > FOLD_AT && !open ? docs.slice(0, FOLD_SHOW) : docs;
}
