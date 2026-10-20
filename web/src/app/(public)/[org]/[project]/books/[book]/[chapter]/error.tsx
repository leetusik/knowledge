"use client";

import { useState, useSyncExternalStore } from "react";

import { ReaderFrame } from "@/components/reader/reader-frame";
import { ReaderStateBlock } from "@/components/reader/reader-state";
import { readReaderCookie } from "@/lib/reader-cookie";
import { stateView } from "@/lib/reader/state-view";

// P30.S13 (`01-reader` §16) — "Something on our side stopped reading." with Try again
// and the request's reference. *Wiring*: "Try again → reloads the chapter", and it
// "shows the skeleton, then the chapter": the skeleton stands in at once and the page
// reloads (a bare `reset()` only re-renders the same failed server payload, and
// `router.refresh()` inside a transition left the dev runtime on the skeleton).
//
// This boundary renders on the client, so the `kb_reader` cookie is read through
// `useSyncExternalStore` (the server snapshot is the default; the frame is keyed on the
// jar so it re-mounts with the reader's own settings).
const subscribe = () => () => {};

export default function ChapterError({
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
    <ReaderFrame
      key={jar}
      view={stateView(readReaderCookie(jar))}
      state={retrying ? "loading" : "failed"}
    >
      <ReaderStateBlock
        kind={retrying ? "loading" : "failed"}
        noun="chapter"
        reference={error.digest ?? null}
        onRetry={retry}
      />
    </ReaderFrame>
  );
}
