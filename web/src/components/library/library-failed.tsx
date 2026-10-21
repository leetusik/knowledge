"use client";

import { startTransition, useState } from "react";

import { useRouter } from "next/navigation";

import { LIBRARY } from "@/content";

import { LibrarySkeleton } from "./library-skeleton";
import { LibEditorial } from "./library-states";

/**
 * The failed state (`06-library` §9), the route `error.tsx`'s body. "Try again" shows the
 * skeleton, then the page: it asks the server to render the segment again (`router.refresh`
 * with `reset`) and drops the editorial for the skeleton meanwhile. A result that arrives
 * after the reader moved on is dropped by the router itself. The ref is Next's digest when
 * there is one (it is omitted in development).
 */
export function LibraryFailed({
  route,
  digest,
  reset,
}: {
  route: "library" | "public";
  digest?: string;
  reset: () => void;
}) {
  const router = useRouter();
  const [retrying, setRetrying] = useState(false);
  if (retrying) return <LibrarySkeleton route={route} />;
  return (
    <LibEditorial
      alert
      code={LIBRARY.states.failedCode}
      title={LIBRARY.states.failedTitle}
      sub={
        route === "library"
          ? LIBRARY.states.failedLibrary
          : LIBRARY.states.failedPublic
      }
      actions={
        <button
          type="button"
          className="lib-btn lib-btn--primary"
          onClick={() => {
            setRetrying(true);
            startTransition(() => {
              router.refresh();
              reset();
            });
          }}
        >
          {LIBRARY.states.retry}
        </button>
      }
      refLine={digest ? LIBRARY.states.ref(digest) : undefined}
    />
  );
}
