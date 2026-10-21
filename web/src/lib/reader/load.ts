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

import { cache } from "react";
import { notFound } from "next/navigation";

import { SITE } from "@/content";
import {
  getBook,
  getDocument,
  getDocumentRaw,
  getDocumentVersion,
  getDocumentVersionRaw,
  getDocumentVersions,
  resolveDocument,
} from "@/lib/knowledge/app";
import { ApiError } from "@/lib/knowledge/client";
import {
  docStem,
  getReaderBook,
  getReaderChapter,
  getReaderDoc,
  type KbReaderBook,
  type KbVariantState,
} from "@/lib/knowledge/reader";
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
import { lookOf } from "@/lib/legacy/messages";
import { plainText } from "@/lib/native/parse";
import { parseReaderCookie, type ReaderSettings } from "@/lib/reader-cookie";
import { bookHref, readerHref, type ReaderTarget } from "@/lib/reader-href";

import { languageName } from "./language";
import { loadNotes } from "./notes-load";
import { loadQuizSaved, type QuizSaved } from "./quiz-saved";
import type {
  ChapterRow,
  LegacyFrame,
  ReaderHeading,
  ReaderLanguage,
  ReaderNotes,
  ReaderProgress,
  ReaderVersions,
  ReaderView,
  TranslationSource,
  VersionRow,
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
  /**
   * A member's saved quiz answers as the blocks show them on return (P30.S19), keyed
   * `<block>--<item>`; empty when signed out or when none was read.
   */
  quiz: QuizSaved;
  /**
   * The annotation layer's data (P30.S20): the sections and a member's highlights and notes
   * resolved for the version on screen; null for a plain Markdown document.
   */
  notes: ReaderNotes | null;
}

/**
 * P30.S25 — an html explainer (or an html version of a document) in the legacy reader
 * (`09-legacy-and-print`): the same view the reader's chrome reads, plus the frame.
 */
export interface LoadedLegacy {
  view: ReaderView;
  frame: LegacyFrame;
  /** The document id the relay and the view are keyed by. */
  docId: number;
}

/** The result of loading: the reader (native and md), or the legacy reader (html). */
export type ReaderLoad =
  | { kind: "reader"; reader: LoadedReader }
  | { kind: "legacy"; legacy: LoadedLegacy };

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

export { languageName };

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
interface NativeBody {
  format: "native" | "md";
  text: string;
  assets: Record<string, KbAsset> | null;
  title: string;
  version: number;
  /** `YYYY-MM-DD`, the version's publication date. */
  date: string;
}

/** An html version: the legacy reader frames it through the raw relay (P30.S25). */
interface HtmlBody {
  format: "html";
  title: string;
  version: number;
  date: string;
}

type Body = NativeBody | HtmlBody;

/**
 * The body at a version. `v` below the current number reads that archived version;
 * the current number, an unreadable one and a bad value all read the current body.
 * An html version is the legacy reader's (`format: "html"`, nothing to render here).
 */
async function readBody(
  token: string | undefined,
  doc: KbDocument,
  v: number | null,
): Promise<Body> {
  if (v !== null && v >= 1 && v < doc.version) {
    const old = await orMiss(() => getDocumentVersion(token, doc.id, v));
    if (old) {
      if (old.format === "html") {
        return { format: "html", title: old.title, version: v, date: old.date };
      }
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
  if (doc.format === "html") {
    return {
      format: "html",
      title: doc.title,
      version: doc.version,
      date: doc.date,
    };
  }
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
): NativeBody {
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

// --- progress, versions, the next chapter's lede (P30.S15) --------------------------

/**
 * A member's saved progress from the variant read. `resume` is offered on the newest
 * version only, and only when it has a place to return to: a mapped section, or a
 * fraction past the very top. A chapter marked unread was reset to the top
 * (`block_id: null`, fraction 0), so it has none and opens at the top. (The pill is
 * for a STARTED chapter; a finished one is landed only by a language switch's link.)
 */
function progressOf(
  state: KbVariantState | null,
  onNewest: boolean,
): ReaderProgress {
  if (!state) {
    return {
      state: "unopened",
      finishedVersion: null,
      maxFraction: 0,
      resume: null,
    };
  }
  const r = state.resume;
  const hasPlace = !!r && (r.block_id !== null || r.fraction > 0.01);
  return {
    state: state.chapter.state,
    finishedVersion: state.chapter.finished_version,
    maxFraction: state.position?.max_fraction ?? 0,
    resume:
      onNewest && r && hasPlace
        ? { block: r.block_id, fraction: r.fraction }
        : null,
  };
}

/**
 * The Version history sheet's rows (§14): the live version first, then the superseded
 * ones newest first. The index does not carry an archived version's `translated_from`,
 * so "Translated from English v1" is shown on the current row only. `ok: false` is the
 * sheet's own "Unavailable" state: a fault here never takes down the chapter.
 */
async function loadVersions(
  token: string | undefined,
  doc: KbDocument,
  lang: string,
  from: { lang: string; version: number } | null,
): Promise<ReaderVersions> {
  const label = languageName(lang);
  const current: VersionRow = {
    n: doc.version,
    date: doc.date,
    from: from
      ? { label: languageName(from.lang), version: from.version }
      : null,
  };
  if (doc.version <= 1) return { ok: true, label, rows: [current] };
  try {
    const page = await getDocumentVersions(token, doc.id);
    const older: VersionRow[] = [...page.versions]
      .sort((a, b) => b.version - a.version)
      .map((v) => ({ n: v.version, date: v.date, from: null }));
    return { ok: true, label, rows: [current, ...older] };
  } catch {
    return { ok: false, label, rows: [] };
  }
}

/** The next chapter's lede (its native header's `summary`), or null; never fails the page. */
async function nextSummary(
  token: string | undefined,
  docId: number,
): Promise<string | null> {
  try {
    const doc = await getDocument(token, docId);
    if (doc.format !== "native" || !doc.source) return null;
    return validateChapter(doc.source, "native").tree.summary || null;
  } catch {
    return null;
  }
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

// --- the legacy frame (P30.S25) --------------------------------------------------------

/** The relay's address for the version on screen. */
function relayOf(docId: number, version: number, newest: number): string {
  return version < newest
    ? `/api/documents/${docId}/versions/${version}/raw`
    : `/api/documents/${docId}/raw`;
}

/** How long the page waits on its own read of the relayed bytes (the `look`) before giving up. */
const RAW_PROBE_MS = 3000;

/**
 * The document's `look`, and whether its file is missing, from one server-side read of
 * the bytes the frame will load (the parent never reads the frame). A 404 for a document
 * the library just listed is "This {noun}'s file is missing"; any other fault or a slow
 * answer leaves `look` at `"light"` and lets the frame find out for itself.
 */
async function probeRaw(
  token: string | undefined,
  docId: number,
  version: number,
  newest: number,
): Promise<{
  look: "auto" | "light";
  missing: boolean;
  /** The document's own `<html lang>` (two or three letters), when it names one. */
  lang: string | null;
}> {
  try {
    const signal = AbortSignal.timeout(RAW_PROBE_MS);
    const res =
      version < newest
        ? await getDocumentVersionRaw(token, docId, version, signal)
        : await getDocumentRaw(token, docId, signal);
    const html = await res.text();
    const lang = /<html\b[^>]*\blang\s*=\s*["']?([a-zA-Z]{2,3})\b/i.exec(html);
    return {
      look: lookOf(html),
      missing: false,
      lang: lang ? lang[1].toLowerCase() : null,
    };
  } catch (error) {
    return {
      look: "light",
      missing: error instanceof ApiError && error.status === 404,
      lang: null,
    };
  }
}

/** A member's position bookmarks on this variant, each placed at its fraction. */
function legacyBookmarks(
  state: KbVariantState | null,
): { id: string; fraction: number }[] {
  const out: { id: string; fraction: number }[] = [];
  for (const b of state?.bookmarks ?? []) {
    const f = b.place?.fraction ?? b.anchor?.fraction;
    if (typeof f === "number" && f >= 0 && f <= 1) out.push({ id: b.id, fraction: f });
  }
  return out;
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

  // An html variant (or an html version of it) opens in the legacy reader (P30.S25).
  const doc = await orMiss(() => getDocument(token, variant.doc_id));
  if (!doc) notFound();
  const body = await readBody(token, doc, args.v);
  const legacy = body.format === "html";

  const target: ReaderTarget = {
    kind: "chapter",
    org,
    project,
    book: book.slug,
    chapter: chapter.key,
  };
  const checked =
    body.format === "html" ? null : validateChapter(body.text, body.format);

  // A member's state: degrade, never fail the chapter over it. The book read fills the
  // chapter list; the variant read carries this chapter's progress and `resume`; the
  // history and the next chapter's lede are read alongside (none can fail the page).
  const nextRow = live[idx + 1];
  const nextPick = nextRow
    ? (nextRow.variants.find((v) => v.lang === variant.lang) ??
      defaultVariant(nextRow))
    : undefined;
  const [state, variantState, versions, nextLede, raw] = await Promise.all([
    token
      ? getReaderBook(token, org, project, book.slug).catch(() => null)
      : Promise.resolve<KbReaderBook | null>(null),
    token
      ? getReaderChapter(
          token,
          { org, project, book: book.slug, key: chapter.key },
          variant.lang,
          undefined,
          // An older version on screen: its annotations resolve for it (P30.S20).
          body.version < doc.version ? body.version : undefined,
        ).catch(() => null)
      : Promise.resolve<KbVariantState | null>(null),
    loadVersions(token, doc, variant.lang, variant.translated_from),
    !legacy && nextPick && nextPick.format !== "html"
      ? nextSummary(token, nextPick.doc_id)
      : Promise.resolve<string | null>(null),
    legacy
      ? probeRaw(token, doc.id, body.version, doc.version)
      : Promise.resolve(null),
  ]);
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

  const neighbour = (row: ChapterRow | undefined, summary?: string | null) =>
    row
      ? {
          title: row.title,
          lang: row.lang,
          href: row.href,
          n: row.n,
          ...(summary ? { summary } : {}),
        }
      : undefined;

  const langs: ReaderLanguage[] = [...chapter.variants]
    .sort((a, b) => a.lang.localeCompare(b.lang))
    .map((v) => ({ lang: v.lang, label: languageName(v.lang) }));

  const view: ReaderView = {
    kind: "chapter",
    member: !!token,
    title: body.title,
    lang: variant.lang,
    langs,
    version: body.version,
    newest: doc.version,
    summary: checked?.tree.summary ?? null,
    date: body.date,
    project,
    staleSource: staleSourceOf(chapter, variant, body.version === doc.version),
    target,
    write: { org, project, doc: docStem(project, variant.rel_path) },
    progress: token
      ? progressOf(variantState, body.version === doc.version)
      : null,
    versions,
    book: {
      title: book.title,
      backHref: bookHref({ org, project, book: book.slug }),
      n: idx + 1,
      total: live.length,
      prev: neighbour(rows[idx - 1]),
      next: neighbour(rows[idx + 1], nextLede),
      chapters: rows,
      finished: state ? state.progress.finished : null,
    },
    headings: checked ? headingsOf(checked) : [],
    settings,
  };

  if (body.format === "html" || !checked) {
    return {
      kind: "legacy",
      legacy: {
        view,
        docId: doc.id,
        frame: {
          src: relayOf(doc.id, body.version, doc.version),
          look: raw?.look ?? "light",
          missing: raw?.missing ?? false,
          bookmarks: token ? legacyBookmarks(variantState) : [],
        },
      },
    };
  }

  const resolveRef = await buildResolver({
    token,
    org,
    project,
    here: book,
    checked,
  });

  const quiz = await loadQuizSaved({
    token,
    attempts: variantState?.quiz ?? [],
    checked,
    project,
    here: {
      stem: docStem(project, variant.rel_path),
      lang: variant.lang,
      version: body.version,
      docId: doc.id,
      newest: doc.version,
    },
    loose: false,
    variants: chapter.variants
      .filter((v) => v.lang !== variant.lang && v.format === "native")
      .map((v) => ({
        stem: docStem(project, v.rel_path),
        docId: v.doc_id,
        version: v.version,
      })),
    langName: languageName,
  }).catch((): QuizSaved => ({}));

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
      quiz,
      notes: loadNotes(checked, variantState, variant.lang),
    },
  };
}

// --- a loose document -------------------------------------------------------------------

/**
 * A loose document that the page has already read (by id or by its pretty URL): native
 * and md in the reader with no book navigation, html (or an html version) in the legacy
 * reader (P30.S25), noun "document", back to the library.
 */
export async function loadLooseReader(args: {
  token: string | undefined;
  doc: KbDocument;
  v: number | null;
  settings: ReaderSettings;
  /** The `{org}` of the URL read through (the pretty route), when it has one. */
  org?: string | null;
}): Promise<ReaderLoad> {
  const { token, doc, settings } = args;
  const body = await readBody(token, doc, args.v);
  const org = orgOfPath(doc.canonical_path) ?? args.org ?? null;
  const stem = docStem(doc.project, doc.rel_path);

  if (body.format === "html") {
    const [variantState, raw] = await Promise.all([
      token && org
        ? getReaderDoc(
            token,
            { org, project: doc.project, doc: stem },
            undefined,
            body.version < doc.version ? body.version : undefined,
          ).catch(() => null)
        : Promise.resolve<KbVariantState | null>(null),
      probeRaw(token, doc.id, body.version, doc.version),
    ]);
    const lang = raw.lang ?? guessLang(body.title);
    const versions = await loadVersions(token, doc, lang, null);
    const view: ReaderView = {
      kind: "loose",
      member: !!token,
      title: body.title,
      lang,
      langs: [],
      version: body.version,
      newest: doc.version,
      summary: null,
      date: body.date,
      project: doc.project,
      staleSource: null,
      target: {
        kind: "document",
        id: doc.id,
        canonicalPath: doc.canonical_path,
      },
      write: org ? { org, project: doc.project, doc: stem } : null,
      progress:
        token && org
          ? progressOf(variantState, body.version === doc.version)
          : null,
      versions,
      book: null,
      headings: [],
      settings,
    };
    return {
      kind: "legacy",
      legacy: {
        view,
        docId: doc.id,
        frame: {
          src: relayOf(doc.id, body.version, doc.version),
          look: raw.look,
          missing: raw.missing,
          bookmarks: token && org ? legacyBookmarks(variantState) : [],
        },
      },
    };
  }

  const checked = validateChapter(body.text, body.format);
  const lang = guessLang(`${body.title}\n${body.text.slice(0, 4000)}`);
  // The member's saved progress and the history, beside the link resolution. A
  // tenant with no org slug has nowhere to address a save (`org` is the slug or the
  // tenant id, and a loose read carries neither): that reader keeps no progress.
  const [resolveRef, variantState, versions] = await Promise.all([
    buildResolver({ token, org, project: doc.project, checked }),
    token && org
      ? getReaderDoc(
          token,
          { org, project: doc.project, doc: stem },
          undefined,
          body.version < doc.version ? body.version : undefined,
        ).catch(() => null)
      : Promise.resolve<KbVariantState | null>(null),
    loadVersions(token, doc, lang, null),
  ]);

  const quiz = await loadQuizSaved({
    token,
    attempts: variantState?.quiz ?? [],
    checked,
    project: doc.project,
    here: {
      stem,
      lang,
      version: body.version,
      docId: doc.id,
      newest: doc.version,
    },
    loose: true,
    variants: [],
    langName: languageName,
  }).catch((): QuizSaved => ({}));

  const view: ReaderView = {
    kind: "loose",
    member: !!token,
    title: body.title,
    lang,
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
    write: org ? { org, project: doc.project, doc: stem } : null,
    progress:
      token && org
        ? progressOf(variantState, body.version === doc.version)
        : null,
    versions,
    book: null,
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
      quiz,
      notes: loadNotes(checked, variantState, lang),
    },
  };
}

/**
 * `loadChapterReader`, deduped per request for `generateMetadata` (the page <title>
 * is the chapter's title) and the page itself: the knowledge client is `no-store`, so
 * without this the title would cost a second set of upstream reads. Every argument is
 * a primitive (React's `cache` keys on identity); the settings arrive as the raw
 * cookie value.
 */
export const loadChapterReaderOnce = cache(
  async (
    token: string | undefined,
    org: string,
    project: string,
    book: string,
    chapter: string,
    lang: string | null,
    v: number | null,
    cookie: string | undefined,
  ): Promise<ReaderLoad> =>
    loadChapterReader({
      token,
      org,
      project,
      book,
      chapter,
      lang,
      v,
      settings: parseReaderCookie(cookie),
    }),
);
