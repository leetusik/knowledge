/**
 * P30.S11 — the reader's URL builders, one place for S13 onwards to reuse.
 *
 * Every reader and book URL is built here, on the owner's org segment, so the
 * shape cannot drift between the reader, the book page, the library and the
 * "Sign in to save" round trip:
 *
 *   - a chapter: `/@{org}/{project}/books/{book}/{chapter}` (the route S13 adds;
 *     `01-reader` *Wiring*), with `?lang=` and `?v=` and a `#{block-id}`;
 *   - a book page: `/@{org}/{project}/books/{book}` (S2's `canonical_path`);
 *   - a loose document: the server's `canonical_path` when it has one, else
 *     `/documents/{id}` — the existing contract (`documents_api._canonical_path`),
 *     unchanged here.
 *
 * `{org}` is `orgSegment(tenant)`: the org slug, or the tenant id for a tenant
 * that has not claimed one (OQ26, the graph's rule; the server's book and reader
 * routes resolve either). Deliberately NOT `server-only`: the reader's client
 * islands build these links too.
 */

import { DEFAULT_NEXT_PATH, loginHref } from "./next-path";

/** The part of a tenant the org segment is built from. */
export interface OrgOwner {
  id: string;
  slug?: string | null;
}

/**
 * The `{org}` of a reader URL, without the `@`: the tenant's org slug, or its id
 * when the slug is null or empty (`tenants.slug` is nullable with no backfill).
 */
export function orgSegment(tenant: OrgOwner): string {
  const slug = tenant.slug?.trim();
  return slug ? slug : tenant.id;
}

/** Where in the text to land. Each part is optional; omitted parts are omitted. */
export interface ReaderPlace {
  /** `?lang=`, the variant. Omit for the reader's default. */
  lang?: string | null;
  /** `?v=`, an older version. Omit (or pass null) for the newest. */
  version?: number | null;
  /** `#…`, a heading or block id. */
  section?: string | null;
  /**
   * `?note=`, a mark to land on (P30.S21): a highlight, a section note or a bookmark of the
   * reader's own, from the Notes sheet or the book's list. The page lands on it 32 px under
   * the top bar and shows a highlight open; an id it does not hold is ignored.
   */
  note?: string | null;
}

export type ReaderTarget =
  | {
      kind: "chapter";
      /** `orgSegment(owner)`: the slug or the tenant id, without the `@`. */
      org: string;
      project: string;
      book: string;
      chapter: string;
    }
  | {
      kind: "document";
      id: number | string;
      /** The server's `canonical_path` (`/@{org}/{project}/{slug}`), when it has one. */
      canonicalPath?: string | null;
    };

/**
 * One path segment. `@` is a legal path character and is left readable, exactly
 * like the pretty document route (`[org]/[project]/[slug]/page.tsx`).
 */
function seg(value: string): string {
  return encodeURIComponent(value).replaceAll("%40", "@");
}

/** `/@{org}/{project}/books/{book}` — the book page. */
export function bookHref(target: {
  org: string;
  project: string;
  book: string;
}): string {
  return `/@${seg(target.org)}/${seg(target.project)}/books/${seg(target.book)}`;
}

/**
 * The reader URL for a chapter or a loose document, at a language, version and
 * section. The query is `lang` then `v`; the section is the `#hash`.
 */
export function readerHref(
  target: ReaderTarget,
  place: ReaderPlace = {},
): string {
  let path: string;
  if (target.kind === "chapter") {
    path = `${bookHref(target)}/${seg(target.chapter)}`;
  } else {
    const canonical = target.canonicalPath;
    path =
      canonical && canonical.startsWith("/@")
        ? canonical
        : `/documents/${seg(String(target.id))}`;
  }

  const query = new URLSearchParams();
  if (place.lang) query.set("lang", place.lang);
  if (place.version != null) query.set("v", String(place.version));
  if (place.note) query.set("note", place.note);
  const qs = query.toString();
  const search = qs ? `?${qs}` : "";
  const hash = place.section ? `#${encodeURIComponent(place.section)}` : "";
  return `${path}${search}${hash}`;
}

/**
 * "Sign in to save" (`01-reader` §12; *Wiring*: "the existing auth flow,
 * returning to this chapter, language, version and section"): the sign-in URL
 * whose `?next=` is this reader place. The gate launders it with `safeNextPath`
 * and, after sign-in, the browser lands on the same chapter and block.
 */
export function signInToSaveHref(
  target: ReaderTarget,
  place: ReaderPlace = {},
): string {
  return loginHref(readerHref(target, place));
}

/**
 * The library — "the reader's home" (`01-reader` *Wiring*: the logo, and a loose
 * document's "‹ Library" and "‹ Back to the library"). It is the app's landing
 * (`DEFAULT_NEXT_PATH`), so S22 moving the landing to `/library` there moves the
 * reader's links with it; until then it is the dashboard.
 */
export const LIBRARY_HREF = DEFAULT_NEXT_PATH;

/** Where the per-book list was opened from (`05-annotations` round 02, `book-page` 7). */
export type NotesFrom = "chapter" | "book";

/**
 * `/@{org}/{project}/notes/{book}` — the per-book list of marks (P30.S21). It sits beside
 * `books/` rather than under `books/{book}/…` so a chapter keyed `notes` keeps its address
 * (chapter keys are `[a-z0-9-]`, and a static segment would shadow one). `from` is a
 * property of the list: `book` reads "‹ Back to the book"; `chapter` (the default) returns
 * to the chapter named by `chapter`, at the reader's `lang`, `version` and `section`.
 */
export function bookNotesHref(
  target: { org: string; project: string; book: string },
  from: {
    from?: NotesFrom;
    chapter?: string | null;
    lang?: string | null;
    version?: number | null;
    section?: string | null;
  } = {},
): string {
  const path = `/@${seg(target.org)}/${seg(target.project)}/notes/${seg(target.book)}`;
  const query = new URLSearchParams();
  if (from.from === "book") query.set("from", "book");
  if (from.from !== "book" && from.chapter) query.set("ch", from.chapter);
  if (from.from !== "book" && from.lang) query.set("lang", from.lang);
  if (from.from !== "book" && from.version != null)
    query.set("v", String(from.version));
  if (from.from !== "book" && from.section) query.set("at", from.section);
  const qs = query.toString();
  return qs ? `${path}?${qs}` : path;
}
