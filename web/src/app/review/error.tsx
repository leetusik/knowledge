"use client";

import { useState, useSyncExternalStore } from "react";

import { ReviewFailed } from "@/components/review/end";
import { ReviewStatic } from "@/components/review/review-static";
import { readReaderCookie } from "@/lib/reader-cookie";

// P30.S24 (`08-review` §6) — "Something on our side stopped reading." with Try again and the
// request's reference, when the page itself could not render. Like the chapter's and the book
// page's: the skeleton stands in at once and the page reloads (a bare `reset()` only re-renders
// the same failed server payload). This boundary renders on the client, so the `kb_reader`
// cookie is read through `useSyncExternalStore` and the frame is keyed on the jar.
const subscribe = () => () => {};

export default function ReviewError({
  error,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [retrying, setRetrying] = useState(false);
  const jar = useSyncExternalStore(
    subscribe,
    () => document.cookie,
    () => "",
  );
  const retry = () => {
    setRetrying(true);
    window.location.reload();
  };
  return (
    <ReviewStatic key={jar} settings={readReaderCookie(jar)} loading={retrying}>
      <ReviewFailed reference={error.digest ?? null} onRetry={retry} />
    </ReviewStatic>
  );
}
