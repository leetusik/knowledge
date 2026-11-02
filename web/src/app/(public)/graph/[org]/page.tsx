import { notFound, redirect } from "next/navigation";

import { optionalIdentity } from "@/lib/auth-guards";
import { getOrgLibrary } from "@/lib/knowledge/app";
import { ApiError } from "@/lib/knowledge/client";
import type { KbOrgLibrary } from "@/lib/knowledge/types";
import { orgSegment } from "@/lib/reader-href";

// P19 gave this route the public org graph at `/graph/{org_uuid}`; P37-1p retired the
// hosted graph, so it now only forwards old shared links to the org's library,
// `/@{orgSegment}` — the org slug, or the tenant UUID for a slug-less org (`/@{uuid}` is a
// working library URL under OQ26). Temporary (307), not permanent, because org slugs are
// mutable: a 308 would be cached past a slug change.
//
// The org resolves through the library endpoint itself (`GET /app/orgs/{org}/library
// ?scope=public`, which tries the UUID first), with the caller's optional token, so the
// redirect adds no gate of its own: the library owns visibility. Its one indistinguishable
// 404 (an unknown org, or one showing this caller nothing) becomes the branded not-found
// here too, so no existence leaks. A malformed id is that not-found before any call.

// The org selector on THIS route is a tenant UUID; the slug form is `/@{org}`.
const ORG_UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Resolve the org through its public library with the caller's (optional) token, mapping
 * a 404 to the branded not-found. The mapping lives OUTSIDE the render so `notFound()`
 * (which signals by throwing) is never swallowed; any other fault rethrows to the error
 * boundary, so a real outage never masquerades as a missing org.
 */
async function loadLibrary(
  token: string | undefined,
  org: string,
): Promise<KbOrgLibrary> {
  try {
    return await getOrgLibrary(token, org, "public");
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) notFound();
    throw error;
  }
}

export default async function PublicGraphPage({
  params,
}: {
  // Next 16: dynamic route params arrive as a Promise.
  params: Promise<{ org: string }>;
}) {
  const { org } = await params;
  // A malformed org can never resolve — 404 before any session read or upstream call.
  if (!ORG_UUID.test(org)) notFound();

  const ctx = await optionalIdentity();
  const library = await loadLibrary(ctx?.token, org);

  // Top level, outside any try, so the redirect's own throw is never swallowed.
  redirect(`/@${encodeURIComponent(orgSegment(library.org))}`);
}
