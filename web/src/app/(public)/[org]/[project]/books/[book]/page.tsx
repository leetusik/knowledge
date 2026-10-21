import type { Metadata } from "next";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";

import { BookPage } from "@/components/book/book-page";
import { BOOK } from "@/content/book";
import { loadBookOnce } from "@/lib/book/load";
import { parseReaderCookie, READER_COOKIE } from "@/lib/reader-cookie";

// P30.S23 — the book page (`07-book-page`): `/@{org}/{project}/books/{book}`, with `{org}`
// the org slug or the tenant id (the server's book read resolves both). Optional identity,
// like the chapter route: a member reads with their bearer, anyone else tokenless (public
// projects only), and every miss — an unknown org, project or book, a private project — is
// the same constant not-found, with no word about why.
//
// The page has the reader's chrome and no app shell, and follows the reader's Display
// setting for its theme (the `kb_reader` cookie, read on the server so the first paint has
// it). The <title> is the book's; the page and its metadata share ONE load per request
// (`loadBookOnce`), since the knowledge client is `cache: "no-store"`.

function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

type Params = { org: string; project: string; book: string };

async function loadOnce(params: Params) {
  const org = safeDecode(params.org);
  const project = safeDecode(params.project);
  const book = safeDecode(params.book);
  // THE GUARD: our public namespace is `@`-prefixed (the pretty route's rule). Reject
  // before reading the session or calling upstream.
  if (!org.startsWith("@") || org.length < 2) notFound();
  if (project === "" || book === "") notFound();
  return loadBookOnce(org.slice(1), project, book);
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  try {
    return { title: (await loadOnce(await params)).title };
  } catch {
    // the page renders the miss or the failure itself
    return { title: BOOK.metaTitle };
  }
}

export default async function BookRoute({
  params,
}: {
  params: Promise<Params>;
}) {
  const view = await loadOnce(await params);
  const settings = parseReaderCookie(
    (await cookies()).get(READER_COOKIE)?.value,
  );
  return <BookPage view={view} settings={settings} />;
}
