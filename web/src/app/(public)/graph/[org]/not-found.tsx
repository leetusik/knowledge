import { LibraryNotFound } from "@/components/library/library-states";
import { OptionalShell } from "@/components/states/optional-shell";

// P19 — the branded not-found of `/graph/{org_uuid}`, which P37-1p turned into a redirect
// to the org's library. Reached by the page's `notFound()` for a malformed org id OR the
// library endpoint's one indistinguishable 404 (an unknown org, or one showing this caller
// nothing), so it is the library's own constant 404 ("Library not found", `06-library`
// §9), with the same shell the library's layout gives it: the app shell signed in, the
// public shell signed out. The app has no root `not-found.tsx`, so dropping this file
// would fall to Next's unbranded 404.
export default function PublicGraphNotFound() {
  return (
    <OptionalShell>
      {(signedIn) => <LibraryNotFound signedIn={signedIn} />}
    </OptionalShell>
  );
}
