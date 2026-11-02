import { notFound, redirect } from "next/navigation";

// P25.S4 gave this route the pretty public graph URL, `/@{org}/graph`; P37-1p retired the
// hosted graph, so it now only forwards old shared links to the org's library, `/@{org}`
// (307, Next's default for a server-component `redirect`). No fetch and no session read:
// the library page owns visibility, and an unknown or private org is its constant 404.
//
// TWO segments, so it does NOT collide with the three-segment pretty document route
// `(public)/[org]/[project]/[slug]`: Next compiles each route to a full-path regex and
// matches static routes before dynamic ones, so `/graph/{uuid}`, `/documents/25` and
// friends all keep winning. Still, `/[org]/graph` is the catch-all for every unmatched
// `/x/graph`, which is why the `@` guard below rejects junk before anything else — a junk
// URL is the branded not-found, never a redirect and never a backend request.
export default async function PrettyPublicGraphPage({
  params,
}: {
  // Next 16: dynamic route params arrive as a Promise.
  params: Promise<{ org: string }>;
}) {
  const { org: orgParam } = await params;
  // Next gives params percent-DECODED already, but decode defensively the way the
  // sibling pretty route does — and `safeDecode` swallows a malformed escape (`%zz`),
  // which would otherwise throw a `URIError` and 500 an anonymous share surface.
  const org = safeDecode(orgParam);

  // THE GUARD. Our public namespace is `@`-prefixed; a UUID belongs on the legacy
  // `/graph/{uuid}` route, never in this one. Outside any try so the `notFound()` throw
  // is never swallowed. `@` alone (empty slug) is rejected too.
  if (!org.startsWith("@") || org.length < 2) notFound();

  // The same segment, `@` included: `/@{org}` is the org's library.
  redirect(`/${encodeURIComponent(org).replace(/^%40/, "@")}`);
}

/** `decodeURIComponent` that returns the input unchanged on a malformed escape. */
function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}
