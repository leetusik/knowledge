import type { Metadata } from "next";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";

import { ReaderPage } from "@/components/reader/reader-page";
import { DOCUMENTS } from "@/content";
import { optionalIdentity } from "@/lib/auth-guards";
import { parseReaderCookie, READER_COOKIE } from "@/lib/reader-cookie";
import { loadChapterReader } from "@/lib/reader/load";

// P30.S13 — a chapter of a book in the reader (`01-reader`): the URL is
// `/@{org}/{project}/books/{book}/{key}[?lang=&v=]`, with `{org}` the org slug or the
// tenant id (the server's book read resolves both). Optional identity, exactly like
// the pretty document route: a member reads with their bearer, anyone else tokenless
// (public projects only), and every miss — an unknown org, project, book or chapter,
// a private project — is the same constant not-found, with no word about why.
//
// The reader has no app shell. A legacy (html) chapter keeps today's frame until S25:
// it redirects to its document page. Settings come from the `kb_reader` cookie on the
// server render, so the first paint already has the reader's text size and theme.
//
// The <title> is STATIC copy, the read pages' rule (the knowledge client is
// `cache: "no-store"`, so `generateMetadata` would cost a second uncached fetch).
export const metadata: Metadata = { title: DOCUMENTS.title };

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

export default async function ChapterPage({
  params,
  searchParams,
}: {
  params: Promise<{
    org: string;
    project: string;
    book: string;
    chapter: string;
  }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const p = await params;
  const query = await searchParams;
  const org = safeDecode(p.org);
  const project = safeDecode(p.project);
  const book = safeDecode(p.book);
  const chapter = safeDecode(p.chapter);

  // THE GUARD: our public namespace is `@`-prefixed (the pretty route's rule). Reject
  // before reading the session or calling upstream, outside any try.
  if (!org.startsWith("@") || org.length < 2) notFound();
  if (project === "" || book === "" || chapter === "") notFound();

  const lang = first(query.lang);
  const rawV = first(query.v);
  const v = rawV !== null && /^\d{1,6}$/.test(rawV) ? Number(rawV) : null;

  const ctx = await optionalIdentity();
  const settings = parseReaderCookie(
    (await cookies()).get(READER_COOKIE)?.value,
  );

  const loaded = await loadChapterReader({
    token: ctx?.token,
    org: org.slice(1),
    project,
    book,
    chapter,
    lang: lang !== null && /^[a-z]{2,3}$/.test(lang) ? lang : null,
    v,
    settings,
  });
  if (loaded.kind === "legacy") redirect(loaded.href);
  return <ReaderPage reader={loaded.reader} />;
}
