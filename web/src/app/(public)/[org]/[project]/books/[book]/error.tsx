"use client";

import { useState, useSyncExternalStore } from "react";

import { BookFrame } from "@/components/book/book-frame";
import { BookStateBlock } from "@/components/book/book-states";
import { BookTop } from "@/components/book/book-top";
import { readReaderCookie } from "@/lib/reader-cookie";
import { LIBRARY_HREF } from "@/lib/reader-href";

// P30.S23 (`07-book-page` §8) — "Something on our side stopped reading." with Try again
// and the request's reference. Like the chapter's: the skeleton stands in at once and the
// page reloads (a bare `reset()` only re-renders the same failed server payload). This
// boundary renders on the client, so the `kb_reader` cookie is read through
// `useSyncExternalStore` (the server snapshot is the default; the frame is keyed on the
// jar so it re-mounts with the reader's own settings).
const subscribe = () => () => {};

export default function BookError({
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
    <BookFrame
      key={jar}
      settings={readReaderCookie(jar)}
      top={<BookTop libraryHref={LIBRARY_HREF} />}
    >
      <BookStateBlock
        kind={retrying ? "loading" : "failed"}
        reference={error.digest ?? null}
        onRetry={retry}
      />
    </BookFrame>
  );
}
