/**
 * P30.S22 — Continue reading (`06-library` §3), composed in the BFF from reads that already
 * exist; no server route is added for it.
 *
 * `GET /app/reader/continue` gives the latest position per book and loose document (newest
 * first, one each). This turns the first few into the items the page draws:
 *
 *  - a STARTED chapter or document resumes where it was saved ("Left off at {section} · n%");
 *  - a FINISHED chapter offers the book's next unfinished chapter ("Up next · you finished
 *    chapter n"); a book with none left, and a finished loose document, are left out;
 *  - a book of another org (a public one the reader opened) appears like any other.
 *
 * It asks for more positions than it shows because the finished ones can drop out. An item
 * whose book or document can no longer be read (a 404) is left out; any other fault is the
 * page's failure.
 */
import "server-only";

import { getBook, getDocument } from "@/lib/knowledge/app";
import { ApiError } from "@/lib/knowledge/client";
import {
  getReaderBook,
  getReaderContinue,
  type KbPosition,
  type KbStateDoc,
} from "@/lib/knowledge/reader";
import type { KbBook, KbBookChapter } from "@/lib/knowledge/types";
import { validateChapter } from "@/lib/native";
import { plainText } from "@/lib/native/parse";
import { languageName } from "@/lib/reader/language";
import { readerHref } from "@/lib/reader-href";

export interface ContinueItem {
  key: string;
  kind: "chapter" | "doc";
  /** An offered next chapter, not a resume. */
  next: boolean;
  legacy: boolean;
  project: string;
  bookTitle: string;
  /** Two listed books share a slug: the book line adds the project. */
  showProject: boolean;
  n: number;
  total: number;
  finishedN: number;
  title: string;
  lang: string;
  /** The language's own name, only when it is not English. */
  langName: string;
  /** The heading the saved place is under; empty for plain Markdown and legacy. */
  section: string;
  pct: number;
  href: string;
}

/** How many items the page draws; `ASK` positions are read to find them. */
export const SHOWN = 4;
const ASK = 12;

/** Skip a miss; rethrow anything else (an outage must surface as the page's failure). */
async function orMiss<T>(run: () => Promise<T>): Promise<T | undefined> {
  try {
    return await run();
  } catch (error) {
    if (
      error instanceof ApiError &&
      (error.status === 404 || error.status === 400)
    ) {
      return undefined;
    }
    throw error;
  }
}

/** The heading text a block id sits under: the nearest heading at or before it. */
export function sectionTitle(source: string, anchorId: string): string {
  const checked = validateChapter(source, "native");
  let heading = "";
  for (const block of checked.tree.blocks) {
    if (block.type === "heading") heading = plainText(block.content);
    if (block.id === anchorId) return heading;
  }
  return "";
}

function chapterVariant(chapter: KbBookChapter, lang: string) {
  return (
    chapter.variants.find((v) => v.lang === lang) ??
    chapter.variants.find((v) => v.lang === "en") ??
    chapter.variants[0]
  );
}

function langParts(lang: string): { lang: string; langName: string } {
  return { lang, langName: lang === "en" ? "" : languageName(lang) };
}

export async function loadContinue(
  token: string,
  /** The `{project}/{slug}` of every book on the page, for the shared-slug rule. */
  listedBooks: { project: string; slug: string }[],
): Promise<ContinueItem[]> {
  const { items } = await getReaderContinue(token, ASK);
  const books = new Map<string, Promise<KbBook | undefined>>();
  const bookOf = (d: KbStateDoc) => {
    const key = `${d.org}/${d.project}/${d.book}`;
    let hit = books.get(key);
    if (!hit) {
      hit = orMiss(() => getBook(token, d.org, d.project, d.book as string));
      books.set(key, hit);
    }
    return hit;
  };

  const out: ContinueItem[] = [];
  for (const { doc, position } of items) {
    if (out.length >= SHOWN) break;
    const item = await build(token, doc, position, bookOf);
    if (item) out.push(item);
  }
  // A shared slug: two books on the page, or among these items, with one slug.
  const slugs = new Map<string, Set<string>>();
  const note = (project: string, slug: string) => {
    const set = slugs.get(slug) ?? new Set<string>();
    set.add(project);
    slugs.set(slug, set);
  };
  for (const b of listedBooks) note(b.project, b.slug);
  for (const it of out) {
    const slug = bookSlugOf(it);
    if (slug) note(it.project, slug);
  }
  return out.map((it) => {
    const slug = bookSlugOf(it);
    return slug && (slugs.get(slug)?.size ?? 0) > 1
      ? { ...it, showProject: true }
      : it;
  });
}

// The slug of an item's book rides in its key (`c:{org}/{project}/{book}/{chapter}`).
function bookSlugOf(it: ContinueItem): string | null {
  if (it.kind !== "chapter") return null;
  const parts = it.key.slice(2).split("/");
  return parts[2] ?? null;
}

async function build(
  token: string,
  doc: KbStateDoc,
  position: KbPosition,
  bookOf: (d: KbStateDoc) => Promise<KbBook | undefined>,
): Promise<ContinueItem | null> {
  const pct = Math.round(position.fraction * 100);
  if (doc.book === null || doc.chapter_key === null) {
    // A loose document: finished ones do not appear.
    if (position.state === "finished") return null;
    return {
      key: `d:${doc.org}/${doc.project}/${doc.doc}`,
      kind: "doc",
      next: false,
      legacy: doc.format === "html",
      project: doc.project,
      bookTitle: "",
      showProject: false,
      n: 0,
      total: 0,
      finishedN: 0,
      title: doc.title,
      ...langParts(position.lang || doc.lang),
      section: await sectionOf(token, doc, position),
      pct,
      href: readerHref({ kind: "document", id: doc.doc_id }),
    };
  }
  const book = await bookOf(doc);
  if (!book) return null;
  const index = book.chapters.findIndex((c) => c.key === doc.chapter_key);
  if (index < 0) return null;
  const base = {
    kind: "chapter" as const,
    project: doc.project,
    bookTitle: book.title,
    showProject: false,
    total: book.chapters.length,
  };
  const lang = position.lang || doc.lang;
  if (position.state !== "finished") {
    return {
      ...base,
      key: `c:${doc.org}/${doc.project}/${book.slug}/${doc.chapter_key}`,
      next: false,
      legacy: doc.format === "html",
      n: index + 1,
      finishedN: 0,
      title: doc.title,
      ...langParts(lang),
      section: await sectionOf(token, doc, position),
      pct,
      href: readerHref(
        {
          kind: "chapter",
          org: doc.org,
          project: doc.project,
          book: book.slug,
          chapter: doc.chapter_key,
        },
        { lang: lang === "en" ? null : lang },
      ),
    };
  }
  // Finished: the next unfinished chapter after it, else the first one before it; none = left out.
  const state = await orMiss(() =>
    getReaderBook(token, doc.org, doc.project, book.slug),
  );
  if (!state) return null;
  const finished = new Set(
    state.chapters.filter((c) => c.state === "finished").map((c) => c.key),
  );
  const order = [
    ...book.chapters.slice(index + 1),
    ...book.chapters.slice(0, index),
  ];
  const target = order.find((c) => !finished.has(c.key));
  if (!target) return null;
  const variant = chapterVariant(target, lang);
  if (!variant) return null;
  return {
    ...base,
    key: `c:${doc.org}/${doc.project}/${book.slug}/${target.key}`,
    next: true,
    legacy: variant.format === "html",
    n: book.chapters.indexOf(target) + 1,
    finishedN: index + 1,
    title: variant.title,
    ...langParts(variant.lang),
    section: "",
    pct: 0,
    href: readerHref(
      {
        kind: "chapter",
        org: doc.org,
        project: doc.project,
        book: book.slug,
        chapter: target.key,
      },
      { lang: variant.lang === "en" ? null : variant.lang },
    ),
  };
}

/** The saved place's heading text (native only); empty when there is none or it cannot be read. */
async function sectionOf(
  token: string,
  doc: KbStateDoc,
  position: KbPosition,
): Promise<string> {
  if (doc.format !== "native" || !position.anchor_id) return "";
  const full = await orMiss(() => getDocument(token, doc.doc_id));
  if (!full || full.format !== "native" || !full.source) return "";
  try {
    return sectionTitle(full.source, position.anchor_id);
  } catch {
    return "";
  }
}
