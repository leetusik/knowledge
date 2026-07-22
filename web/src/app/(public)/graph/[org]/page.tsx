import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { GraphCanvas } from "@/app/(app)/graph/graph-canvas";
import { PublicShell } from "@/components/public-shell";
import { GRAPH } from "@/content";
import { optionalIdentity } from "@/lib/auth-guards";
import { getGraph } from "@/lib/knowledge/app";
import { ApiError } from "@/lib/knowledge/client";
import type { KbGraph } from "@/lib/knowledge/types";

// P19 — the public, org-scoped knowledge graph at `/graph/{org_uuid}`, outside the
// `(app)` auth gate. It renders the SAME ported `<GraphCanvas>` the member `/graph`
// page uses (composition, no new engine), wrapped in <PublicShell>. Optional-
// identity: an anonymous or cross-org visitor sees only the addressed org's PUBLIC
// projects (nodes/edges/tag-hubs); a member viewing their own org id sees the full
// map. knowledge's `GET /app/graph?org=` is the boundary — an org with no public
// projects (which also covers a nonexistent org) is a 404, so existence never leaks.
//
// A malformed org id short-circuits to the branded not-found (never a /login bounce —
// the graph surface has no member-only affordance to gate behind login). A node's
// `url` is `/documents/{id}`, which resolves to the optional-identity doc page.
export const metadata: Metadata = { title: GRAPH.title };

// The org selector is a tenant UUID (an org slug is the deferred vanity-URL nicety).
const ORG_UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Fetch the org's graph with the caller's (optional) token, mapping a 404 (no public
 * projects / nonexistent org — 404-never-403, indistinguishable) to the branded
 * not-found. The mapping lives OUTSIDE the render so `notFound()` (which signals by
 * throwing) is never swallowed; any other fault rethrows to the error boundary.
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
  const graph = await loadGraph(ctx?.token, org);

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
