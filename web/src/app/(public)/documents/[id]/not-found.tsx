import Link from "next/link";

import { Editorial } from "@/components/states";
import { OptionalShell } from "@/components/states/optional-shell";
import { appButtonClass } from "@/components/ui";
import { DOCUMENTS, PUBLIC_SHELL, STATES } from "@/content";

// P12.S5, restated on round 03 §5 (P28.S3) — the read-view branded not-found.
// Reached by the page's non-integer-id short-circuit (before the session is even
// read, so anonymous visitors land here too) and by `loadDocument`'s `notFound()`
// in the member branch — a missing / cross-tenant / non-integer id all map here
// so ids cannot be probed (404-never-403).
//
// Two changes in this slice, both from §5:
//
//  - EDITORIAL, not `.kb-empty` (§5.3: a 404 is a page failure, so the panel
//    empty state and its `FileX` mark are wrong here).
//  - IT NOW BRINGS A SHELL. The `(public)` group has NO `layout.tsx` — its pages
//    wrap themselves — so this file used to render bare on `<body>`, with no
//    topbar at all, and its old header comment claiming it rendered inside the
//    `(app)` shell was simply wrong. §5.1's "the shell stays" was therefore not
//    being honoured on this surface at all.
//
// Which shell, and which primary action, is `<OptionalShell>`'s subject: it
// mirrors the page's own `optionalIdentity()` branch, so a member keeps the rail
// they still have while a stranger gets the anonymous shell and §5.1's literal
// **Sign in** primary.
export default function DocumentNotFound() {
  return (
    <OptionalShell>
      {(signedIn) => (
        <Editorial
          code={STATES.notFoundCode}
          title={DOCUMENTS.notFound.title}
          sub={DOCUMENTS.notFound.sub}
          actions={
            signedIn ? (
              <Link href="/documents" className={appButtonClass("primary")}>
                {DOCUMENTS.notFound.backLabel}
              </Link>
            ) : (
              // The member list is auth-gated, so offering it to a stranger is a
              // bounce to /login with no explanation. §5.1 names the right
              // action for this branch, and `PUBLIC_SHELL.signIn` is already its
              // string (the same one the anonymous topbar uses).
              <Link href="/login" className={appButtonClass("primary")}>
                {PUBLIC_SHELL.signIn}
              </Link>
            )
          }
        />
      )}
    </OptionalShell>
  );
}
