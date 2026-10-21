"use client";

import { LibraryFailed } from "@/components/library/library-failed";

// P30.S22 — the library's failed state (`06-library` §9). It renders inside the `(app)` layout,
// so the shell stays; "Try again" shows the skeleton, then the page.
export default function LibraryError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <LibraryFailed route="library" digest={error.digest} reset={reset} />;
}
