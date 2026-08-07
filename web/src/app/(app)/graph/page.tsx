import type { Metadata } from "next";

import { CopyLinkButton } from "@/components/copy-link-button";
import { GRAPH } from "@/content";
import { requireIdentity } from "@/lib/auth-guards";
import { getGraph } from "@/lib/knowledge/app";

import { GraphCanvas } from "./graph-canvas";

// P12.S6 — the in-app knowledge graph: a per-tenant map of the tenant's documents
// (related links + shared tags), the last P12 surface. A SERVER component that
// fetches the graph data ONCE via the S6 `/app/graph` route and passes it as a PROP
// to the `"use client"` `<GraphCanvas>` — the data rides the RSC payload, so the
// browser makes no fetch and needs no BFF proxy. The canvas engine is a faithful
// port of the docs' `graph.js` renderer (see `graph-canvas.tsx`). Rendered inside
// the S2/S2R `(app)` shell, so it draws into `.kb-app-main`; the map is a sized
// in-console card (NOT the mkdocs full-bleed breakout).
//
// The graph route is UNMETERED + tenant-scoped on the backend, so this read moves
// no usage counter (every web-UI feature is free). No error mapping is needed: a
// valid session always resolves (401 → `requireIdentity` already redirected); a
// backend outage surfaces via the route's error boundary rather than a fake-empty
// map.
export const metadata: Metadata = { title: GRAPH.title };

export default async function GraphPage() {
  const { token, identity } = await requireIdentity();
  const tenantName = identity.tenant?.name ?? "—";
  const orgId = identity.tenant?.id ?? null;
  const graph = await getGraph(token);

  return (
    <>
      {/* .mainhead — eyebrow + Fraunces title + sub, with the P19 share copy-link
          when the caller has a tenant. P25.S5: it hands out the PRETTY public graph
          URL (`/@{org-slug}/graph`) whenever the org has claimed a slug — read
          straight off this page's existing `/app/graph` response as `canonical_path`
          (the backend builds it once; the member path gets it for free off the
          session tenant), never re-derived here. A slug-less org falls back to the
          UUID URL `/graph/{org}`, which keeps working forever. */}
      <div className="mb-[1.3rem] flex items-start justify-between gap-4">
        <div>
          <div className="kb-app-eyebrow">
            {tenantName} · {GRAPH.eyebrow}
          </div>
          <h1 className="kb-app-title" style={{ marginTop: "0.35rem" }}>
            {GRAPH.title}
          </h1>
          <p className="kb-app-sub">{GRAPH.sub}</p>
        </div>
        {orgId ? (
          <CopyLinkButton path={graph.canonical_path ?? `/graph/${orgId}`} />
        ) : null}
      </div>

      <GraphCanvas data={graph} />
    </>
  );
}
