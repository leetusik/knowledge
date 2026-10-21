import "server-only";

import { notFound } from "next/navigation";

import { getBook } from "@/lib/knowledge/app";
import { ApiError } from "@/lib/knowledge/client";
import { getReaderBookNotes } from "@/lib/knowledge/reader";
import type { KbBook } from "@/lib/knowledge/types";
import { bookHref, readerHref } from "@/lib/reader-href";

import { languageName } from "./language";
import {
  bookmarkItem,
  noteItem,
  type BookEntry,
  type BuildOptions,
} from "./note-list";
import { bookmarkOf, noteOf } from "./notes-load";

/**
 * P30.S21 — the per-book list's data (`05-annotations` round 01 *The per-book list*,
 * round 02 §2): every mark the reader made in the book, resolved by S9 against each
 * chapter's current version, orphans included, with the chapters (book order, titles in
 * their own language) and where the back link goes.
 */
export interface BookRow {
  entry: BookEntry;
  /** Where choosing the row goes: the chapter in the row's language at the mark; null = nowhere (Unanchored). */
  href: string | null;
}

export interface BookNotesView {
  org: string;
  project: string;
  bookSlug: string;
  bookTitle: string;
  /** The chapters in book order (those with a live variant). */
  chapters: { key: string; n: number; title: string; lang: string }[];
  rows: BookRow[];
  langNames: Record<string, string>;
  /** "‹ Back to the chapter" returns to the chapter at the reader's section; "‹ Back to the book" to the book page. */
  back: { kind: "chapter" | "book"; href: string };
}

type Chapter = KbBook["chapters"][number];

const defaultVariant = (c: Chapter) =>
  c.variants.find((v) => v.lang === "en") ?? c.variants[0];

/** `?from=` / `ch=` / `lang=` / `v=` / `at=` as the list's opening link carries them. */
export interface NotesOpening {
  from: "chapter" | "book";
  chapter: string | null;
  lang: string | null;
  version: number | null;
  section: string | null;
}

export async function loadBookNotes(args: {
  token: string;
  org: string;
  project: string;
  book: string;
  opening: NotesOpening;
}): Promise<BookNotesView> {
  const { token, project } = args;
  const miss = (error: unknown): never => {
    if (
      error instanceof ApiError &&
      (error.status === 404 || error.status === 400)
    )
      notFound();
    throw error;
  };
  const book: KbBook = await getBook(token, args.org, project, args.book).catch(
    miss,
  );
  // Hrefs are built on the canonical org (the slug when the tenant has one).
  const canonical = /^\/@([^/]+)\//.exec(book.canonical_path ?? "");
  let org = args.org;
  if (canonical) {
    try {
      org = decodeURIComponent(canonical[1]);
    } catch {
      org = canonical[1];
    }
  }
  const live = book.chapters.filter((c) => c.variants.length > 0);
  const chapters = live.map((c, i) => {
    const v = defaultVariant(c)!;
    return { key: c.key, n: i + 1, title: v.title, lang: v.lang };
  });
  const order = new Map(live.map((c, i) => [c.key, i]));
  const variantOrder = (key: string, lang: string): number => {
    const c = live[order.get(key) ?? -1];
    if (!c) return 0;
    const def = defaultVariant(c)!.lang;
    const langs = [
      def,
      ...c.variants.map((v) => v.lang).filter((l) => l !== def),
    ];
    return Math.max(0, langs.indexOf(lang));
  };

  const data = await getReaderBookNotes(token, {
    org,
    project,
    book: book.slug,
  }).catch(miss);
  const opts = (chapterKey: string): BuildOptions => ({
    sections: new Map(),
    known: false,
    chapterTitle: chapters[order.get(chapterKey) ?? 0]?.title ?? "",
    code: new Set(),
  });
  const target = (key: string) => ({
    kind: "chapter" as const,
    org,
    project,
    book: book.slug,
    chapter: key,
  });
  const rows: BookRow[] = [];
  const langs = new Set<string>();
  for (const a of [...data.annotations, ...data.unanchored]) {
    const key = a.chapter_key ?? "";
    if (!order.has(key)) continue;
    const item = noteItem(noteOf(a), opts(key));
    item.chapterKey = key;
    langs.add(a.lang);
    const sec = a.anchor?.block_id ?? a.block_id;
    rows.push({
      entry: {
        item,
        chapter: order.get(key)!,
        variant: variantOrder(key, a.lang),
        at: a.anchor?.section_index ?? null,
        rank:
          item.status === "orphan"
            ? 9e9
            : a.kind === "bnote" || !a.quote
              ? -2
              : item.status === "block"
                ? -1
                : (a.anchor?.start ?? 0),
      },
      href:
        item.status === "orphan"
          ? null
          : readerHref(target(key), { lang: a.lang, section: sec, note: a.id }),
    });
  }
  for (const b of data.bookmarks) {
    const key = b.chapter_key ?? "";
    if (!order.has(key)) continue;
    const item = bookmarkItem(bookmarkOf(b), opts(key), 0);
    item.chapterKey = key;
    langs.add(b.lang);
    const placed = b.place?.block_id ?? null;
    rows.push({
      entry: {
        item,
        chapter: order.get(key)!,
        variant: variantOrder(key, b.lang),
        at: b.place?.section_index ?? null,
        rank:
          item.status === "orphan"
            ? 9e9
            : placed
              ? -3
              : (b.place?.fraction ?? b.anchor?.fraction ?? 0),
      },
      // A position with no section lands at its fraction (the chapter reads it from `?note=`).
      href:
        item.status === "orphan"
          ? null
          : readerHref(target(key), {
              lang: b.lang,
              section: placed,
              note: b.id,
            }),
    });
  }
  for (const c of chapters) langs.add(c.lang);

  const o = args.opening;
  const chapterKnown = !!o.chapter && order.has(o.chapter);
  const back =
    o.from === "chapter" && chapterKnown
      ? {
          kind: "chapter" as const,
          href: readerHref(target(o.chapter!), {
            lang: o.lang,
            version: o.version,
            section: o.section,
          }),
        }
      : {
          kind: "book" as const,
          href: bookHref({ org, project, book: book.slug }),
        };
  return {
    org,
    project,
    bookSlug: book.slug,
    bookTitle: book.title,
    chapters,
    rows,
    langNames: Object.fromEntries([...langs].map((l) => [l, languageName(l)])),
    back,
  };
}
