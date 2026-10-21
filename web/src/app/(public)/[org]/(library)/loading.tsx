import { LibrarySkeleton } from "@/components/library/library-skeleton";

// P30.S22 — `/@{org}`'s loading state (`06-library` §9), inside the shell the layout draws.
export default function OrgLibraryLoading() {
  return <LibrarySkeleton route="public" />;
}
