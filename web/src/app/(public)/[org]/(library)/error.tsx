"use client";

import { LibraryFailed } from "@/components/library/library-failed";

// P30.S22 — `/@{org}`'s failed state (`06-library` §9): "This library did not finish loading."
export default function OrgLibraryError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <LibraryFailed route="public" digest={error.digest} reset={reset} />;
}
