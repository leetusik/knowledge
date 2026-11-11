/**
 * P41-sr.W1 — the pages Listen lives on: a reader page or a book landing. The persistent
 * player (`ListenRoot`, in the root layout) renders and loads nothing anywhere else.
 *
 *  - `/documents/{id}`: a document by id;
 *  - `/@{org}/{project}/{slug}`: a document by its pretty URL;
 *  - `/@{org}/{project}/books/{book}` and `…/books/{book}/{chapter}`: a book and a chapter.
 *
 * Not the library (`/@{org}`), the graphs, a book's notes (`…/notes/{book}`) or a version
 * page. Every one of these is also a reader-CSP path (`isReaderPath`, `@/lib/csp`).
 */
export function isListenPath(pathname: string | null): boolean {
  if (!pathname) return false;
  const parts = pathname.split("/").filter(Boolean);
  if (parts[0] === "documents") return parts.length === 2;
  const org = parts[0]?.replace(/^%40/i, "@") ?? "";
  if (!org.startsWith("@") || org.length < 2) return false;
  if (parts.length === 3) return true;
  if (parts[2] === "books") return parts.length === 4 || parts.length === 5;
  return false;
}
