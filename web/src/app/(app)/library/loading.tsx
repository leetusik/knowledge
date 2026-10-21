import { LibrarySkeleton } from "@/components/library/library-skeleton";

// P30.S22 — the library's loading state (`06-library` §9): a skeleton that mirrors the page.
export default function LibraryLoading() {
  return <LibrarySkeleton route="library" />;
}
