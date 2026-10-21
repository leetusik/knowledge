import { LibraryNotFound } from "@/components/library/library-states";
import { optionalIdentity } from "@/lib/auth-guards";

// P30.S22 — `/@{org}`'s not-found (`06-library` §9, the constant 404): "Library not found", with
// one secondary action: signed out "Sign in", signed in "‹ Back to your library". It renders inside
// the layout's shell, so the shell stays.
export default async function OrgLibraryNotFound() {
  const ctx = await optionalIdentity();
  return <LibraryNotFound signedIn={ctx !== null} />;
}
