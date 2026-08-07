import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { GraphCanvas } from "@/app/(app)/graph/graph-canvas";
import { PublicShell } from "@/components/public-shell";
import { GRAPH } from "@/content";
import { optionalIdentity } from "@/lib/auth-guards";
import { getGraph } from "@/lib/knowledge/app";
import { ApiError } from "@/lib/knowledge/client";
import type { KbGraph } from "@/lib/knowledge/types";

// P25.S4 — the PRETTY public graph URL, `/@{org}/graph`. Same page as
// `(public)/graph/[org]` (which keeps taking a tenant UUID and now forwards here),
// addressed by the DURABLE org slug from the Postgres accounts plane instead of the
// tenant UUID, so a shared link is readable and survives a full content reindex.
//
// TWO segments, so it does NOT collide with the three-segment pretty document route
// `(public)/[org]/[project]/[slug]`: Next compiles each route to a full-path regex
// and matches static routes before dynamic ones, so `/graph/{uuid}`, `/documents/25`
// and friends all keep winning. Still, `/[org]/graph` is the catch-all for every
// unmatched `/x/graph`, which is why the `@` guard below runs BEFORE the session read
// and before any upstream call — junk URLs must never fire a backend request.
//
// Optional-identity, exactly as the UUID page: an anonymous or cross-org visitor sees
// only the addressed org's PUBLIC projects (nodes/edges/tag-hubs); a member viewing
// their own org sees the full map. knowledge's `GET /app/graph?org=` is the boundary —
// an unknown/reserved/malformed slug and an org with no public projects are one
// indistinguishable 404, so existence never leaks. No `/login` bounce: the graph
// surface has no member-only affordance to gate behind login.
//
// The <title> is STATIC copy (`export const metadata`, never `generateMetadata`): the
// knowledge client is `cache: "no-store"`, so `generateMetadata` would cost a second
// uncached upstream fetch on every render.
export const metadata: Metadata = { title: GRAPH.title };

/**
 * Fetch the org's graph with the caller's (optional) token, mapping a 404 (unknown or
 * malformed org slug / no public projects — 404-never-403, indistinguishable) to the
 * branded not-found. The mapping lives OUTSIDE the render so `notFound()` (which
 * signals by throwing) is never swallowed; any other fault rethrows to the error
 * boundary, so a real outage never masquerades as a missing graph.
 *
 * `org` arrives here WITHOUT its `@`: the prefix is a web-plane routing marker and
 * the backend selector takes the bare slug.
 */
async function loadGraph(
  token: string | undefined,
  org: string,
): Promise<KbGraph> {
  try {
    return await getGraph(token, { org });
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) notFound();
    throw error;
  }
}

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
  // `/graph/{uuid}` route (which forwards here), never in this one. Reject before the
  // session read and before any upstream call, outside any try so the `notFound()`
  // throw is never swallowed. `@` alone (empty slug) is rejected too.
  if (!org.startsWith("@") || org.length < 2) notFound();
  const orgSlug = org.slice(1);

  const ctx = await optionalIdentity();
  const graph = await loadGraph(ctx?.token, orgSlug);

  return (
    <PublicShell>
      {/* .mainhead — org-neutral eyebrow + Fraunces title + sub (no tenant name). */}
      <div className="mb-[1.3rem]">
        <div className="kb-app-eyebrow">{GRAPH.eyebrow}</div>
        <h1 className="kb-app-title" style={{ marginTop: "0.35rem" }}>
          {GRAPH.title}
        </h1>
        <p className="kb-app-sub">{GRAPH.sub}</p>
      </div>

      <GraphCanvas data={graph} />
    </PublicShell>
  );
}

/** `decodeURIComponent` that returns the input unchanged on a malformed escape. */
function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}
