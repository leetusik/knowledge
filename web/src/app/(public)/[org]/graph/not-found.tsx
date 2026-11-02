import { LibraryNotFound } from "@/components/library/library-states";
import { OptionalShell } from "@/components/states/optional-shell";

// P25.S4 — the branded not-found of `/@{org}/graph`, which P37-1p turned into a redirect
// to the org's library. Reached only by the page's `@`-prefix guard (this route catches
// every unmatched `/x/graph`), so it is the library's own constant 404 ("Library not
// found", `06-library` §9), with the same shell the library's layout gives it: the app
// shell signed in, the public shell signed out. `(public)` has no root layout and the app
// no root `not-found.tsx`, so dropping this file would fall to Next's unbranded 404.
export default function PrettyPublicGraphNotFound() {
  return (
    <OptionalShell>
      {(signedIn) => <LibraryNotFound signedIn={signedIn} />}
    </OptionalShell>
  );
}
