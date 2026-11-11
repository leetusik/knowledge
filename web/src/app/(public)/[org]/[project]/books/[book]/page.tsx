import type { Metadata } from "next";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";

import { BookPage } from "@/components/book/book-page";
import { BOOK } from "@/content/book";
import { optionalIdentity } from "@/lib/auth-guards";
import { loadBookOnce } from "@/lib/book/load";
import type { BookView } from "@/lib/book/view";
import { readBookSeed } from "@/lib/listen/seed";
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
//
// P41-sr.W2 — Listen: a signed-in reader gets the landing's Listen seed (the book from its
// first chapter, and the place left part-way), read after the load, which names the
// chapters; any miss is "no Listen here", never a failed page.

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
  const p = await params;
  const view = await loadOnce(p);
  const settings = parseReaderCookie(
    (await cookies()).get(READER_COOKIE)?.value,
  );
  const ctx = await optionalIdentity();
  const listen =
    ctx?.token && view.viewer !== "anon"
      ? await readBookSeed(
          ctx.token,
          { org: view.org, project: view.project, book: view.slug },
          {
            title: view.title,
            href: bookPath(p),
            chapters: chaptersOf(view),
          },
          variantsOf(view),
        )
      : null;
  return <BookPage view={view} settings={settings} listen={listen} />;
}

/** The landing's own path, as asked. */
function bookPath(p: Params): string {
  return `/${p.org}/${p.project}/books/${p.book}`;
}

/** The book's chapters, in its order, as the player and the rows name them. */
function chaptersOf(view: BookView) {
  return view.rows.map((r) => ({
    key: r.key,
    n: r.n,
    title: r.title,
    lang: r.lang,
    href: r.href,
  }));
}

/** Each chapter's variants, by language: the page a Listen opens for the language it reads. */
function variantsOf(view: BookView): Record<string, Record<string, string>> {
  return Object.fromEntries(
    view.rows.map((r) => [
      r.key,
      Object.fromEntries(r.langLinks.map((l) => [l.code, l.href])),
    ]),
  );
}
