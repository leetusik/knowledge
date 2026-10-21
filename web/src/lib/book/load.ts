import "server-only";

import { cache } from "react";
import { notFound } from "next/navigation";

import { BOOK } from "@/content/book";
import { optionalIdentity } from "@/lib/auth-guards";
import { getBook, getDocument, getDocumentVersions } from "@/lib/knowledge/app";
import { ApiError } from "@/lib/knowledge/client";
import {
  getReaderBook,
  getReaderBookNotes,
  type KbReaderBook,
} from "@/lib/knowledge/reader";
import type {
  KbBook,
  KbBookChapter,
  KbBookVariant,
} from "@/lib/knowledge/types";
import { loginHref } from "@/lib/next-path";
import { sectionTitle } from "@/lib/library/continue";
import { validateChapter } from "@/lib/native";
import { publishedDate } from "@/lib/reader/date";
import { languageName } from "@/lib/reader/language";
import {
  bookHref,
  bookNotesHref,
  LIBRARY_HREF,
  readerHref,
} from "@/lib/reader-href";

import {
  isDone,
  isStale,
  orderChapters,
  planContinue,
  rowState,
  shapeOf,
  shownVariant,
  sourceOf,
  stateWord,
  type RowState,
  type Viewer,
} from "./model";
import type {
  BookView,
  ContView,
  LangLinkView,
  RowView,
  VersionGroupView,
} from "./view";

/**
 * P30.S23 — the book page's data (`07-book-page` *Data the page needs*): S1's manifest
 * (`GET /app/orgs/{org}/{project}/books/{book}`, public-gated) and, signed in, S3's
 * `GET /app/reader/books/…` for the caller's state, plus the reads the page composes from
 * (the per-book marks, a chapter's lede and section, the version dates of a chapter that has
 * more than one). Every miss on the manifest is the constant 404; a fault anywhere else
 * throws, which is the route's "failed" state, except the optional reads (dates, lede,
 * section), which degrade to nothing rather than take the page down.
 */

const miss = (error: unknown): never => {
  if (
    error instanceof ApiError &&
    (error.status === 404 || error.status === 400)
  )
    notFound();
  throw error;
};

/** The org segment of a canonical path (`/@{org}/…`), or the one asked for. */
function canonicalOrg(book: KbBook, asked: string): string {
  const m = /^\/@([^/]+)\//.exec(book.canonical_path ?? "");
  if (!m) return asked;
  try {
    return decodeURIComponent(m[1]);
  } catch {
    return m[1];
  }
}

/** A read that may fail without failing the page. */
async function soft<T>(run: () => Promise<T>): Promise<T | null> {
  try {
    return await run();
  } catch {
    return null;
  }
}

interface DateInfo {
  /** The current version's publication date, formatted. */
  current: string;
  /** Superseded versions, newest first. */
  older: { v: number; date: string }[];
}

export async function loadBook(
  org: string,
  project: string,
  bookSlug: string,
): Promise<BookView> {
  const ctx = await optionalIdentity();
  const token = ctx?.token;
  const [book, state]: [KbBook, KbReaderBook | null] = await Promise.all([
    getBook(token, org, project, bookSlug).catch(miss),
    token
      ? getReaderBook(token, org, project, bookSlug).catch(miss)
      : Promise.resolve(null),
  ]);
  const owner = canonicalOrg(book, org);
  const tenants = ctx ? [ctx.identity.tenant, ...ctx.identity.tenants] : [];
  const member = tenants.some(
    (t) => !!t && (t.slug?.trim() ? t.slug.trim() : t.id) === owner,
  );
  const viewer: Viewer = !ctx ? "anon" : member ? "member" : "other";
  const signedIn = viewer !== "anon";
  const target = { org: owner, project, book: book.slug };

  const chapters = orderChapters(book.chapters);
  const M = chapters.length;
  const byKey = new Map((state?.chapters ?? []).map((c) => [c.key, c]));

  const shown = chapters.map((c) => {
    const st = byKey.get(c.key);
    return {
      chapter: c,
      variant: shownVariant(c, signedIn ? st?.position?.lang : null),
      state: signedIn ? rowState(st) : ("unopened" as RowState),
      pct: Math.round((st?.position?.max_fraction ?? 0) * 100),
    };
  });
  const done = shown.filter((s) => isDone(s.state)).length;
  const touched = shown.filter((s) => s.state !== "unopened").length;
  const marks = state?.counts?.marks ?? 0;

  // The pointer is S3's: the most recently updated position among this book's chapters.
  const ptr = state?.continue ?? null;
  const ptrIndex = ptr
    ? chapters.findIndex((c) => c.key === ptr.chapter_key)
    : -1;
  const plan = planContinue(
    shown.map((s, i) => ({ n: i + 1, state: s.state, summary: "" })),
    signedIn,
    ptr && ptrIndex >= 0
      ? { index: ptrIndex, section: "", pct: Math.round(ptr.fraction * 100) }
      : null,
  );
  const contShown = shown[plan.index] ?? shown[0];

  // The reads the page composes, in parallel.
  const multi = shown.flatMap((s) =>
    s.chapter.variants.filter((v) => v.version > 1),
  );
  const ptrVariant =
    plan.kind === "continue" && ptr
      ? chapters[plan.index].variants.find((v) => v.lang === ptr.lang)
      : undefined;
  const wantsLede = plan.kind === "start" || plan.kind === "next";
  const [dates, sectionAt, lede, notesRead] = await Promise.all([
    Promise.all(multi.map((v) => soft(() => datesOf(token, v)))),
    ptrVariant && ptr?.anchor_id && ptrVariant.format === "native"
      ? soft(() => sectionOf(token, ptrVariant, ptr.anchor_id as string))
      : Promise.resolve(null),
    wantsLede && contShown
      ? soft(() => ledeOf(token, contShown.variant))
      : Promise.resolve(null),
    signedIn && touched > 0
      ? getReaderBookNotes(token as string, {
          org: owner,
          project,
          book: book.slug,
        }).catch(miss)
      : Promise.resolve(null),
  ]);
  const dateOf = new Map<number, DateInfo>();
  multi.forEach((v, i) => {
    const d = dates[i];
    if (d) dateOf.set(v.doc_id, d);
  });

  const chapterHref = (key: string, lang: string | null, v?: number | null) =>
    readerHref(
      { kind: "chapter", ...target, chapter: key },
      { lang, version: v ?? null },
    );
  const notFirst = (c: KbBookChapter, lang: string) =>
    lang === c.variants[0].lang ? null : lang;

  const rows: RowView[] = shown.map((s, i) => {
    const c = s.chapter;
    const langs = c.variants;
    const multiLang = langs.length > 1;
    const multiVer = langs.some((v) => v.version > 1);
    const langLinks: LangLinkView[] = multiLang
      ? langs.map((v) => ({
          code: v.lang,
          label: languageName(v.lang),
          v: v.version,
          stale: isStale(c, v),
          href: chapterHref(c.key, notFirst(c, v.lang)),
        }))
      : [];
    const groups: VersionGroupView[] = multiVer
      ? langs.map((v) => {
          const info = dateOf.get(v.doc_id);
          const name = languageName(v.lang);
          const rowsOf = [
            {
              v: v.version,
              published: info?.current
                ? BOOK.contents.published(info.current)
                : "",
              current: true,
              from: v.translated_from
                ? BOOK.contents.translatedFrom(
                    languageName(v.translated_from.lang),
                    v.translated_from.version,
                  )
                : "",
            },
            ...(info?.older ?? []).map((o) => ({
              v: o.v,
              published: BOOK.contents.published(o.date),
              current: false,
              from: "",
            })),
          ];
          return {
            code: v.lang,
            label: name,
            legacy: v.format === "html",
            rows: rowsOf.map((r) => ({
              ...r,
              aria: BOOK.contents.viewAria(r.v, multiLang ? name : null),
              href: chapterHref(
                c.key,
                notFirst(c, v.lang),
                r.current ? null : r.v,
              ),
            })),
          };
        })
      : [];
    const single =
      !multiLang && multiVer
        ? BOOK.contents.single(
            langs[0].version,
            dateOf.get(langs[0].doc_id)?.current ?? "",
          )
        : "";
    return {
      key: c.key,
      n: i + 1,
      title: c.title || s.variant.title,
      lang: s.variant.lang,
      legacy: s.variant.format === "html",
      state: s.state,
      word: viewer === "anon" ? "" : stateWord(s.state, s.pct),
      slice: sourceOf(c).slice ?? "",
      href: chapterHref(c.key, notFirst(c, s.variant.lang)),
      langLinks,
      single,
      multiVer,
      groups,
    };
  });

  const k = rows[plan.index] ?? rows[0];
  const cont: ContView = {
    kind: plan.kind,
    n: k ? k.n : 1,
    total: M,
    title: k?.title ?? "",
    lang: k?.lang ?? "en",
    legacy: k?.legacy ?? false,
    section: plan.kind === "continue" ? (sectionAt ?? "") : "",
    pct: plan.pct,
    summary: lede ?? "",
    after: plan.after ?? null,
    updatedN: plan.updated.length ? plan.updated[0] : null,
    href: k ? k.href : bookHref(target),
  };

  const shape = shapeOf(book.chapters);
  const noteN = notesRead
    ? notesRead.annotations.length +
      notesRead.unanchored.length +
      notesRead.bookmarks.length
    : 0;
  const noteChapters = notesRead
    ? new Set(
        [
          ...notesRead.annotations,
          ...notesRead.unanchored,
          ...notesRead.bookmarks,
        ]
          .map((m) => m.chapter_key)
          .filter((k): k is string => !!k),
      ).size
    : 0;
  const publicView = viewer !== "member";
  const subject = book.subject ?? "";
  const place =
    book.kind === "subject"
      ? subject
      : (publicView ? BOOK.head.place(owner, project) : project) +
        (subject ? ` · ${subject}` : "");

  return {
    org: owner,
    project,
    slug: book.slug,
    title: book.title,
    viewer,
    kindLabel: book.kind === "subject" ? BOOK.head.subject : BOOK.head.codebase,
    place,
    description: book.description ?? "",
    done,
    total: M,
    pct: M ? Math.round((done / M) * 100) : 0,
    count: BOOK.head.chapters(M),
    topLine: signedIn ? BOOK.head.finished(done, M) : BOOK.head.chapters(M),
    shapeNote:
      shape.kind === "phases"
        ? BOOK.contents.phases
        : shape.kind === "slices"
          ? BOOK.contents.slices(shape.phase)
          : "",
    rows,
    cont,
    notes:
      signedIn && touched > 0
        ? {
            href: bookNotesHref(target, { from: "book" }),
            line: BOOK.notes.count(noteN, noteChapters),
          }
        : null,
    data:
      signedIn && (touched > 0 || marks > 0)
        ? { chapters: touched, marks }
        : null,
    signedIn,
    libraryHref: signedIn ? LIBRARY_HREF : `/@${owner}`,
    signInHref: loginHref(bookHref(target)),
  };
}

/** The dates of one variant's versions: the current's, and the superseded ones. */
async function datesOf(
  token: string | undefined,
  variant: KbBookVariant,
): Promise<DateInfo> {
  const [doc, page] = await Promise.all([
    getDocument(token, variant.doc_id),
    getDocumentVersions(token, variant.doc_id),
  ]);
  return {
    current: doc.date ? publishedDate(doc.date) : "",
    older: [...page.versions]
      .sort((a, b) => b.version - a.version)
      .map((v) => ({ v: v.version, date: publishedDate(v.date) })),
  };
}

/** The heading the saved place is under, in the variant's current text. */
async function sectionOf(
  token: string | undefined,
  variant: KbBookVariant,
  anchorId: string,
): Promise<string> {
  const doc = await getDocument(token, variant.doc_id);
  if (doc.format !== "native" || !doc.source) return "";
  return sectionTitle(doc.source, anchorId);
}

/** A native chapter's lede (its header's `summary`), or "". */
async function ledeOf(
  token: string | undefined,
  variant: KbBookVariant,
): Promise<string> {
  if (variant.format !== "native") return "";
  const doc = await getDocument(token, variant.doc_id);
  if (doc.format !== "native" || !doc.source) return "";
  return validateChapter(doc.source, "native").tree.summary || "";
}

/**
 * One load per request, shared by the page and its metadata (the knowledge client is
 * `no-store`, so two calls would read twice). Primitive arguments: React's `cache` keys
 * on identity.
 */
export const loadBookOnce = cache(loadBook);
