import { AppShell } from "@/components/app-shell";
import { PublicShell } from "@/components/public-shell";
import { optionalIdentity } from "@/lib/auth-guards";

/**
 * The shell for a `(public)` failure page that mirrors its own page's runtime
 * choice — member → `<AppShell>`, anonymous → `<PublicShell>`.
 *
 * Round 03 §5.1 says two things about the public document 404 that only look
 * contradictory: "**The shell stays.** Topbar, navbar and rail all render.
 * Losing the rail as well as the page is the difference between 'this page
 * failed' and 'the app is gone'", and then, of `documents/[id]/not-found.tsx`,
 * that it "renders inside the anonymous shell, with **Sign in** as the primary".
 * A signed-in member who mistypes a document id would, on the literal second
 * reading, lose the rail they still have — precisely what the first sentence
 * forbids.
 *
 * Both hold at once if the not-found picks its shell the way the PAGE already
 * does: `(public)/documents/[id]/page.tsx` and
 * `(public)/[org]/[project]/[slug]/page.tsx` both branch on `optionalIdentity()`
 * between `<AppShell>` and `<PublicShell>`, so the member keeps the rail and the
 * stranger gets the anonymous shell whose one action IS Sign in. A `not-found.tsx`
 * may be an async server component, so it can make the same call.
 *
 * NOT used by the two public GRAPH not-founds: their pages render `<PublicShell>`
 * unconditionally, signed in or not, so mirroring the page means `<PublicShell>`
 * there too.
 *
 * `optionalIdentity()` is `cache()`d, so when the miss came from a page that had
 * already called it this costs no second `/auth/me`. It reads the session cookie,
 * which makes the segment dynamic — as every route under `(public)` already is.
 */
export async function OptionalShell({
  children,
}: {
  /**
   * Given the branch, because the content differs on one point the record is
   * explicit about: §5.1's anonymous document 404 takes **Sign in** as its
   * primary action, while the member's way forward is the list they came from.
   * A plain `ReactNode` would hide exactly the distinction the section names.
   */
  children: (signedIn: boolean) => React.ReactNode;
}) {
  const ctx = await optionalIdentity();

  return ctx ? (
    <AppShell identity={ctx.identity}>{children(true)}</AppShell>
  ) : (
    <PublicShell>{children(false)}</PublicShell>
  );
}
