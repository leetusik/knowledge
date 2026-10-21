import type { Metadata } from "next";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";

import { BookNotes } from "@/components/reader/book-notes";
import { READER } from "@/content";
import { requireIdentity } from "@/lib/auth-guards";
import { parseReaderCookie, READER_COOKIE } from "@/lib/reader-cookie";
import { loadBookNotes } from "@/lib/reader/book-notes-load";

// P30.S21 — the per-book list of marks (`05-annotations` round 01 *The per-book list*,
// round 02 §2): `/@{org}/{project}/notes/{book}`, beside `books/` so a chapter keyed
// `notes` keeps its address. It is the reader's own marks, so it needs a session: a
// signed-out visitor is sent to sign in and back here (`requireIdentity`). Every miss, an
// unknown org, project or book, a private project, is the same constant not-found.
//
// `?from=book` is the opening link's property (the book page's "Notes in this book →"): the
// back link then reads "‹ Back to the book". Otherwise it is opened from a chapter's Notes
// sheet, which names the chapter, language, version and section to return to.

export const metadata: Metadata = {
  title: READER.notes.book.title,
  robots: { index: false },
};

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

export default async function BookNotesPage({
  params,
  searchParams,
}: {
  params: Promise<{ org: string; project: string; book: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const p = await params;
  const org = safeDecode(p.org);
  const project = safeDecode(p.project);
  const book = safeDecode(p.book);
  // THE GUARD: our public namespace is `@`-prefixed. Reject before the session is read.
  if (!org.startsWith("@") || org.length < 2) notFound();
  if (project === "" || book === "") notFound();
  const q = await searchParams;
  const { token } = await requireIdentity();
  const lang = first(q.lang);
  const rawV = first(q.v);
  const ch = first(q.ch);
  const at = first(q.at);
  const view = await loadBookNotes({
    token,
    org: org.slice(1),
    project,
    book,
    opening: {
      from: first(q.from) === "book" ? "book" : "chapter",
      chapter: ch !== null && /^[a-z0-9]+(-[a-z0-9]+)*$/.test(ch) ? ch : null,
      lang: lang !== null && /^[a-z]{2,3}$/.test(lang) ? lang : null,
      version: rawV !== null && /^\d{1,6}$/.test(rawV) ? Number(rawV) : null,
      section: at !== null && /^[a-z0-9][a-z0-9-]{0,63}$/.test(at) ? at : null,
    },
  });
  const settings = parseReaderCookie(
    (await cookies()).get(READER_COOKIE)?.value,
  );
  return <BookNotes view={view} settings={settings} />;
}
