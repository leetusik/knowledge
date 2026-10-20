/**
 * P30.S13 — loading what the reader shell shows: a chapter of a book
 * (`/@{org}/{project}/books/{book}/{chapter}`) or a loose native / md document
 * (`/documents/{id}` and its pretty URL), as a `ReaderView` plus the checked chapter.
 *
 * Reads go through the existing BFF seams with the reader's OPTIONAL token, so a
 * private or missing target is the same constant 404 for everyone (404-never-403):
 * every miss ends in `notFound()` with no word about why.
 *
 *  - the book (`getBook`, S2) names the chapters and each chapter's live variants;
 *  - the variant's document (`getDocument`) is the source, and `?v=` reads an older
 *    version (`getDocumentVersion`, which 404s for the CURRENT number — an unreadable
 *    or unknown `?v=` falls back to the newest, not to an error);
 *  - a member's per-chapter state (`getReaderBook`, S8) fills the Contents sheet's
 *    "Started · 38%" lines. It DEGRADES: a fault there never takes down the chapter.
 *
 * Links: `chapter:` and `doc:` references are pre-resolved here with the reader's
 * token and handed to the pipeline as `resolveRef` (OQ50), so a target the reader
 * cannot open stays a missing link and nothing about it leaks.
 */
import "server-only";

import { notFound } from "next/navigation";

import { SITE } from "@/content";
import {
  getBook,
  getDocument,
  getDocumentVersion,
  resolveDocument,
} from "@/lib/knowledge/app";
import { ApiError } from "@/lib/knowledge/client";
import { getReaderBook, type KbReaderBook } from "@/lib/knowledge/reader";
import type {
  KbAsset,
  KbBook,
  KbBookChapter,
  KbBookVariant,
  KbDocument,
} from "@/lib/knowledge/types";
import {
  validateChapter,
  type ChapterRef,
  type CheckedChapter,
  type DocRef,
} from "@/lib/native";
import { plainText } from "@/lib/native/parse";
import type { ReaderSettings } from "@/lib/reader-cookie";
import { bookHref, readerHref, type ReaderTarget } from "@/lib/reader-href";

import type {
  ChapterRow,
  ReaderHeading,
  ReaderLanguage,
  ReaderView,
  TranslationSource,
} from "./types";

/** The most `chapter:` / `doc:` targets one page resolves; past it a link stays "missing". */
const MAX_RESOLVED_REFS = 40;

export interface LoadedReader {
  view: ReaderView;
  /** The checked chapter, rendered with `<ChapterView>`. */
  checked: CheckedChapter;
  /** The chapter or document id the asset relay and the links are keyed by. */
  docId: number;
  assets: Record<string, KbAsset> | null;
  /** `md` only: the document's absolute URL, which a relative link resolves against. */
  baseUrl?: string;
  resolveRef: (ref: ChapterRef | DocRef) => string | null;
}

/** The result of loading: a reader, or the older frame that still owns this document. */
export type ReaderLoad =
  { kind: "reader"; reader: LoadedReader } | { kind: "legacy"; href: string };

/** Map knowledge's miss statuses to `undefined`; anything else (an outage) rethrows. */
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

/** "English", "한국어": a language named in itself. */
export function languageName(lang: string): string {
  if (lang === "en") return "English";
  if (lang === "ko") return "한국어";
  try {
    const name = new Intl.DisplayNames([lang], { type: "language" }).of(lang);
    if (name && name !== lang)
      return name.charAt(0).toUpperCase() + name.slice(1);
  } catch {
    // an unknown tag: show the code
  }
  return lang;
}

/**
 * A loose document carries no language (only a chapter's variants do), and the page
 * root is `lang="ko"`, so an English document would inherit Korean typography. Hangul
 * as a fifth or more of the letters in the title and the opening says `ko`; else `en`.
 */
export function guessLang(sample: string): string {
  const letters = sample.match(/\p{L}/gu)?.length ?? 0;
  const hangul = sample.match(/\p{Script=Hangul}/gu)?.length ?? 0;
  return letters > 0 && hangul / letters >= 0.2 ? "ko" : "en";
}

/** A chapter's default variant: English, else the first. */
function defaultVariant(chapter: KbBookChapter): KbBookVariant | undefined {
  return chapter.variants.find((v) => v.lang === "en") ?? chapter.variants[0];
}

/** The `{org}` of a canonical path `/@{org}/…`, or null. */
function orgOfPath(path: string | null | undefined): string | null {
  const m = /^\/@([^/]+)\//.exec(path ?? "");
  if (!m) return null;
  try {
    return decodeURIComponent(m[1]);
  } catch {
    return m[1];
  }
}

/**
 * "Older translation": this variant was translated from a source version, and the source
 * has since moved on. Only on the translation's CURRENT version (`translated_from`
 * describes that version, so an archived one cannot be judged).
 */
function staleSourceOf(
  chapter: KbBookChapter,
  variant: KbBookVariant,
  current: boolean,
): TranslationSource | null {
  const from = variant.translated_from;
  if (!current || !from) return null;
  const source = chapter.variants.find((v) => v.lang === from.lang);
  if (!source || source.version <= from.version) return null;
  return {
    lang: source.lang,
    label: languageName(source.lang),
    from: from.version,
    newest: source.version,
  };
}

function headingsOf(checked: CheckedChapter): ReaderHeading[] {
  const out: ReaderHeading[] = [];
  for (const block of checked.tree.blocks) {
    if (
      block.type === "heading" &&
      block.id &&
      (block.level === 2 || block.level === 3)
    ) {
      out.push({
        id: block.id,
        level: block.level,
        text: plainText(block.content),
      });
    }
  }
  return out;
}

/** The pieces of one document the reader renders. */
interface Body {
  format: "native" | "md";
  text: string;
  assets: Record<string, KbAsset> | null;
  title: string;
  version: number;
  /** `YYYY-MM-DD`, the version's publication date. */
  date: string;
}

/**
 * The body at a version. `v` below the current number reads that archived version;
 * the current number, an unreadable one and a bad value all read the current body.
 * `null` when the body is an html version, which the older frame owns.
 */
async function readBody(
  token: string | undefined,
  doc: KbDocument,
  v: number | null,
): Promise<Body | null> {
  if (v !== null && v >= 1 && v < doc.version) {
    const old = await orMiss(() => getDocumentVersion(token, doc.id, v));
    if (old) {
      if (old.format === "html") return null;
      return toBody(
        old.format,
        old.source,
        old.markdown,
        old.assets,
        old.title,
        v,
        old.date,
      );
    }
  }
  if (doc.format === "html") return null;
  return toBody(
    doc.format,
    doc.source,
    doc.markdown,
    doc.assets,
    doc.title,
    doc.version,
    doc.date,
  );
}

function toBody(
  format: "md" | "native",
  source: string | null | undefined,
  markdown: string | undefined,
  assets: Record<string, KbAsset> | null | undefined,
  title: string,
  version: number,
  date: string,
): Body {
  // A native document is rendered from its stored file; if the read carried none
  // (an older backend), its plain-text projection is shown as md rather than nothing.
  if (format === "native" && source) {
    return {
      format: "native",
      text: source,
      assets: assets ?? null,
      title,
      version,
      date,
    };
  }
  return {
    format: "md",
    text: markdown ?? "",
    assets: null,
    title,
    version,
    date,
  };
}

// --- links: chapter: and doc: pre-resolved with the reader's token ------------------

function refKey(ref: ChapterRef | DocRef): string {
  return ref.kind === "chapter"
    ? `c|${ref.project ?? ""}|${ref.book}|${ref.key}|${ref.lang ?? ""}|${ref.id ?? ""}`
    : `d|${ref.project ?? ""}|${ref.slug}`;
}

async function buildResolver(opts: {
  token: string | undefined;
  /** The org segment hrefs are built on; null = no way to address another document. */
  org: string | null;
  project: string;
  /** The book already in hand, so a link into it needs no second read. */
  here?: KbBook;
  checked: CheckedChapter;
}): Promise<(ref: ChapterRef | DocRef) => string | null> {
  const { token, org, project, here, checked } = opts;
  const resolved = new Map<string, string | null>();
  if (!org) return () => null;

  const wanted = new Map<string, ChapterRef | DocRef>();
  for (const rec of checked.parse.refs) {
    if (rec.image) continue;
    if (rec.ref.kind !== "chapter" && rec.ref.kind !== "doc") continue;
    const key = refKey(rec.ref);
    if (!wanted.has(key) && wanted.size < MAX_RESOLVED_REFS) {
      wanted.set(key, rec.ref);
    }
  }

  const books = new Map<string, Promise<KbBook | undefined>>();
  if (here) books.set(`${here.project}/${here.slug}`, Promise.resolve(here));
  const bookOf = (p: string, b: string) => {
    const k = `${p}/${b}`;
    let hit = books.get(k);
    if (!hit) {
      hit = orMiss(() => getBook(token, org, p, b)).catch(() => undefined);
      books.set(k, hit);
    }
    return hit;
  };

  await Promise.all(
    [...wanted.entries()].map(async ([key, ref]) => {
      try {
        if (ref.kind === "chapter") {
          const p = ref.project ?? project;
          const found = await bookOf(p, ref.book);
          const chapter = found?.chapters.find((c) => c.key === ref.key);
          if (!found || !chapter || chapter.variants.length === 0) {
            resolved.set(key, null);
            return;
          }
          const lang = ref.lang
            ? (chapter.variants.find((v) => v.lang === ref.lang)?.lang ?? null)
            : null;
          resolved.set(
            key,
            readerHref(
              {
                kind: "chapter",
                org,
                project: p,
                book: found.slug,
                chapter: chapter.key,
              },
              { lang, section: ref.id },
            ),
          );
        } else {
          const p = ref.project ?? project;
          const target = await orMiss(() =>
            resolveDocument(token, org, p, ref.slug),
          );
          resolved.set(
            key,
            target
              ? readerHref({
                  kind: "document",
                  id: target.id,
                  canonicalPath: target.canonical_path,
                })
              : null,
          );
        }
      } catch {
        // Any fault is a missing link: the page never fails over a link.
        resolved.set(key, null);
      }
    }),
  );
  return (ref) => resolved.get(refKey(ref)) ?? null;
}

// --- a chapter of a book --------------------------------------------------------------

export async function loadChapterReader(args: {
  token: string | undefined;
  /** The `{org}` of the URL, without its `@`. */
  org: string;
  project: string;
  book: string;
  chapter: string;
  lang: string | null;
  v: number | null;
  settings: ReaderSettings;
}): Promise<ReaderLoad> {
  const { token, project, settings } = args;
  const book = await orMiss(() => getBook(token, args.org, project, args.book));
  if (!book) notFound();

  // Hrefs are built on the canonical org (the slug when the tenant has one), even
  // when the reader arrived on the tenant-id path.
  const org = orgOfPath(book.canonical_path) ?? args.org;
  const live = book.chapters.filter((c) => c.variants.length > 0);
  const idx = live.findIndex((c) => c.key === args.chapter);
  if (idx < 0) notFound();
  const chapter = live[idx];
  const fallback = defaultVariant(chapter);
  const variant =
    (args.lang && chapter.variants.find((v) => v.lang === args.lang)) ||
    fallback;
  if (!variant) notFound();

  // html stays on today's frame until S25.
  if (variant.format === "html") {
    return { kind: "legacy", href: `/documents/${variant.doc_id}` };
  }

  const doc = await orMiss(() => getDocument(token, variant.doc_id));
  if (!doc) notFound();
  const body = await readBody(token, doc, args.v);
  if (!body) {
    return { kind: "legacy", href: `/documents/${doc.id}` };
  }

  const target: ReaderTarget = {
    kind: "chapter",
    org,
    project,
    book: book.slug,
    chapter: chapter.key,
  };
  const checked = validateChapter(body.text, body.format);

  // A member's state: degrade, never fail the chapter over it.
  let state: KbReaderBook | null = null;
  if (token) {
    try {
      state = await getReaderBook(token, org, project, book.slug);
    } catch {
      state = null;
    }
  }
  const stateOf = new Map((state?.chapters ?? []).map((c) => [c.key, c]));

  const rows: ChapterRow[] = live.map((c, i) => {
    const pick =
      c.variants.find((v) => v.lang === variant.lang) ?? defaultVariant(c)!;
    const own = defaultVariant(c)!;
    const st = stateOf.get(c.key);
    return {
      key: c.key,
      n: i + 1,
      title: pick.title,
      lang: pick.lang,
      format: pick.format === "html" ? "legacy" : pick.format,
      href: readerHref(
        {
          kind: "chapter",
          org,
          project,
          book: book.slug,
          chapter: c.key,
        },
        { lang: pick.lang === own.lang ? null : pick.lang },
      ),
      current: i === idx,
      ...(st
        ? {
            state: st.state,
            percent: st.position
              ? Math.round(st.position.max_fraction * 100)
              : 0,
            updated: st.updated,
          }
        : {}),
    };
  });

  const neighbour = (row: ChapterRow | undefined) =>
    row ? { title: row.title, lang: row.lang, href: row.href } : undefined;

  const langs: ReaderLanguage[] = [...chapter.variants]
    .sort((a, b) => a.lang.localeCompare(b.lang))
    .map((v) => ({ lang: v.lang, label: languageName(v.lang) }));

  const resolveRef = await buildResolver({
    token,
    org,
    project,
    here: book,
    checked,
  });

  const view: ReaderView = {
    kind: "chapter",
    member: !!token,
    title: body.title,
    lang: variant.lang,
    langs,
    version: body.version,
    newest: doc.version,
    summary: checked.tree.summary,
    date: body.date,
    project,
    staleSource: staleSourceOf(chapter, variant, body.version === doc.version),
    target,
    book: {
      title: book.title,
      backHref: bookHref({ org, project, book: book.slug }),
      n: idx + 1,
      total: live.length,
      prev: neighbour(rows[idx - 1]),
      next: neighbour(rows[idx + 1]),
      chapters: rows,
      finished: state ? state.progress.finished : null,
    },
    headings: headingsOf(checked),
    settings,
  };

  return {
    kind: "reader",
    reader: {
      view,
      checked,
      docId: doc.id,
      assets: body.assets,
      baseUrl:
        body.format === "md"
          ? `${SITE.url}${doc.canonical_path ?? `/documents/${doc.id}`}`
          : undefined,
      resolveRef,
    },
  };
}

// --- a loose document -------------------------------------------------------------------

/**
 * A loose native / md document that the page has already read (by id or by its pretty
 * URL), in the reader with no book navigation. An html document returns `null`: it
 * keeps today's frame until S25.
 */
export async function loadLooseReader(args: {
  token: string | undefined;
  doc: KbDocument;
  v: number | null;
  settings: ReaderSettings;
}): Promise<LoadedReader | null> {
  const { token, doc, settings } = args;
  const body = await readBody(token, doc, args.v);
  if (!body) return null;

  const org = orgOfPath(doc.canonical_path);
  const checked = validateChapter(body.text, body.format);
  const resolveRef = await buildResolver({
    token,
    org,
    project: doc.project,
    checked,
  });

  const view: ReaderView = {
    kind: "loose",
    member: !!token,
    title: body.title,
    lang: guessLang(`${body.title}\n${body.text.slice(0, 4000)}`),
    langs: [],
    version: body.version,
    newest: doc.version,
    summary: checked.tree.summary,
    date: body.date,
    project: doc.project,
    staleSource: null,
    target: {
      kind: "document",
      id: doc.id,
      canonicalPath: doc.canonical_path,
    },
    book: null,
    headings: headingsOf(checked),
    settings,
  };
  return {
    view,
    checked,
    docId: doc.id,
    assets: body.assets,
    baseUrl:
      body.format === "md"
        ? `${SITE.url}${doc.canonical_path ?? `/documents/${doc.id}`}`
        : undefined,
    resolveRef,
  };
}
