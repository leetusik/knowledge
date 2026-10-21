import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";

import { LegacyReaderPage } from "@/components/reader/legacy-reader-page";
import { ReaderPage } from "@/components/reader/reader-page";
import { DOCUMENTS } from "@/content";
import { optionalIdentity } from "@/lib/auth-guards";
import { READER_COOKIE } from "@/lib/reader-cookie";
import { loadChapterReaderOnce } from "@/lib/reader/load";

// P30.S13 — a chapter of a book in the reader (`01-reader`): the URL is
// `/@{org}/{project}/books/{book}/{key}[?lang=&v=]`, with `{org}` the org slug or the
// tenant id (the server's book read resolves both). Optional identity, exactly like
// the pretty document route: a member reads with their bearer, anyone else tokenless
// (public projects only), and every miss — an unknown org, project, book or chapter,
// a private project — is the same constant not-found, with no word about why.
//
// The reader has no app shell. A legacy (html) chapter, or an html version of one, opens
// in the legacy reader here (P30.S25, `09-legacy-and-print`; it used to redirect to its
// document page). Settings come from the `kb_reader` cookie on the server render, so the
// first paint already has the reader's text size and theme.
//
// The <title> is the chapter's title (P30.S15), through `generateMetadata`. The
// knowledge client is `cache: "no-store"`, so the page and the metadata share ONE load
// per request (`loadChapterReaderOnce`, React `cache`) instead of reading twice. A miss or
// a fault falls back to the static title and leaves the page's own handling (not-found,
// the error screen) to the page. The legacy reader's page asks for `viewport-fit=cover`
// (its bars pad themselves by the safe areas); the native reader's does not.

function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function first(value: string | string[] | undefined): string | null {
  const v = Array.isArray(value) ? value[0] : value;
  return v === undefined || v === "" ? null : v;
}

type Params = { org: string; project: string; book: string; chapter: string };
type Query = Record<string, string | string[] | undefined>;

/** The one load both the page and its metadata make. */
async function loadOnce(params: Params, query: Query) {
  const org = safeDecode(params.org);
  const project = safeDecode(params.project);
  const book = safeDecode(params.book);
  const chapter = safeDecode(params.chapter);
  // THE GUARD: our public namespace is `@`-prefixed (the pretty route's rule). Reject
  // before reading the session or calling upstream.
  if (!org.startsWith("@") || org.length < 2) notFound();
  if (project === "" || book === "" || chapter === "") notFound();

  const lang = first(query.lang);
  const rawV = first(query.v);
  const v = rawV !== null && /^\d{1,6}$/.test(rawV) ? Number(rawV) : null;
  const ctx = await optionalIdentity();
  const cookie = (await cookies()).get(READER_COOKIE)?.value;
  return loadChapterReaderOnce(
    ctx?.token,
    org.slice(1),
    project,
    book,
    chapter,
    lang !== null && /^[a-z]{2,3}$/.test(lang) ? lang : null,
    v,
    cookie,
  );
}

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<Params>;
  searchParams: Promise<Query>;
}): Promise<Metadata> {
  try {
    const loaded = await loadOnce(await params, await searchParams);
    const title =
      loaded.kind === "reader"
        ? loaded.reader.view.title
        : loaded.legacy.view.title;
    if (title) return { title };
  } catch {
    // the page renders the miss or the failure itself
  }
  return { title: DOCUMENTS.title };
}

export async function generateViewport({
  params,
  searchParams,
}: {
  params: Promise<Params>;
  searchParams: Promise<Query>;
}): Promise<Viewport> {
  try {
    const loaded = await loadOnce(await params, await searchParams);
    if (loaded.kind === "legacy") return { viewportFit: "cover" };
  } catch {
    // the page renders the miss or the failure itself
  }
  return {};
}

export default async function ChapterPage({
  params,
  searchParams,
}: {
  params: Promise<Params>;
  searchParams: Promise<Query>;
}) {
  const loaded = await loadOnce(await params, await searchParams);
  if (loaded.kind === "legacy") {
    return <LegacyReaderPage legacy={loaded.legacy} />;
  }
  return <ReaderPage reader={loaded.reader} />;
}
