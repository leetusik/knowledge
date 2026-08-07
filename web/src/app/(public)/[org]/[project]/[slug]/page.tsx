import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ChevronLeft } from "lucide-react";

import { DocumentView } from "@/app/(public)/documents/[id]/document-view";
import { VersionHistory } from "@/app/(public)/documents/[id]/version-history";
import { AppShell } from "@/components/app-shell";
import { PublicShell } from "@/components/public-shell";
import { appButtonClass } from "@/components/ui";
import { DOCUMENTS } from "@/content";
import { optionalIdentity } from "@/lib/auth-guards";
import { getDocumentVersions, resolveDocument } from "@/lib/knowledge/app";
import { ApiError } from "@/lib/knowledge/client";
import type { KbDocument, KbDocumentVersion } from "@/lib/knowledge/types";

// P25.S3 — the PRETTY public document URL, `/@{org}/{project}/{doc-slug}`. Same page
// as `(public)/documents/[id]`, addressed by DURABLE parts instead of the disposable
// `documents.id` rowid: the org slug lives in the Postgres accounts plane and the
// project + doc slug are `rel_path`'s own components, so a shared link survives a full
// content reindex. Nothing here re-derives that URL — the backend hands it back as
// `canonical_path`, and this route only consumes it.
//
// ROUTE PRECEDENCE (phase.md Q1, verified empirically against the built
// `routes-manifest.json`): this is the catch-all for EVERY unmatched three-segment
// URL. Next compiles each route to a full-path regex and matches static routes before
// dynamic ones, so `/documents/{id}/versions/{v}` and `/api/documents/{id}/versions/{v}/raw`
// keep winning — but `/anything/at/all` lands here. That is why the `@` guard below is
// load-bearing rather than cosmetic: without it this page would happily fetch upstream
// for arbitrary junk paths.
//
// Branching mirrors the id page exactly (`optionalIdentity()`):
//   - a signed-in member → fetched with their bearer, wrapped in <AppShell> with the
//     back-link to the (member-gated) list;
//   - an anonymous visitor → fetched TOKENLESS, wrapped in <PublicShell>.
// Both branches map a miss to the co-located branded not-found. The anonymous branch
// deliberately does NOT bounce to /login the way the id page does: the resolver's 404
// already collapses private/unknown/malformed into one indistinguishable answer, so a
// login bounce would leak nothing and only add friction on a share surface.
//
// Member-only affordances that live on the id page (delete) stay there; the share
// affordances (copy-link) are P25.S5's job wholesale, so neither is rendered here.
//
// The <title> is STATIC copy, not the document title: the knowledge client is
// `cache: "no-store"`, so `generateMetadata` would cost a second uncached upstream
// fetch on every render. Per-document SEO titles are the explicitly out-of-scope SEO
// expansion, not an oversight.
export const metadata: Metadata = { title: DOCUMENTS.title };

/**
 * Resolve one document by its durable `(org, project, slug)` triple with the caller's
 * (optional) token, mapping knowledge's 404/400 to the branded not-found. The mapping
 * lives OUTSIDE the render so `notFound()` — which signals by throwing — is never
 * swallowed by the `try` (the repo-wide convention; see the id page's `loadDocument`).
 *
 * `org` arrives here WITHOUT its `@`: the prefix is a web-plane routing marker and the
 * resolver route takes the bare slug.
 *
 * A 404 covers every miss the resolver has (unknown org / project / doc slug, a
 * private project, legacy mode) — they are indistinguishable by design. Anything else
 * rethrows, so a real outage surfaces instead of masquerading as a missing page.
 */
async function loadDocument(
  token: string | undefined,
  org: string,
  project: string,
  slug: string,
): Promise<KbDocument> {
  try {
    return await resolveDocument(token, org, project, slug);
  } catch (error) {
    if (
      error instanceof ApiError &&
      (error.status === 404 || error.status === 400)
    ) {
      notFound();
    }
    throw error;
  }
}

/**
 * The document's superseded versions (P23), newest first — `[]` when it has never been
 * re-published. Keyed by the resolved `id`: the resolver hands back the ordinary detail
 * projection, so `/versions*` stays id-keyed and completely unchanged.
 *
 * DEGRADES rather than throws, exactly as on the id page: history is an ADDITIVE panel
 * beside a document body that already loaded, and both calls hit the same upstream, so
 * a genuine outage fails the read above and surfaces there.
 */
async function loadVersions(
  token: string | undefined,
  doc: KbDocument,
): Promise<{ currentVersion: number; versions: KbDocumentVersion[] }> {
  try {
    const page = await getDocumentVersions(token, doc.id);
    return { currentVersion: page.current_version, versions: page.versions };
  } catch {
    // No history to show; the document itself still renders in full.
    return { currentVersion: doc.version, versions: [] };
  }
}

export default async function PrettyDocumentPage({
  params,
}: {
  // Next 16: dynamic route params arrive as a Promise.
  params: Promise<{ org: string; project: string; slug: string }>;
}) {
  const {
    org: orgParam,
    project: projectParam,
    slug: slugParam,
  } = await params;

  // Next gives params percent-DECODED already, but decode defensively the way the
  // sibling routes do — a double-encoded segment must not reach the upstream path.
  const org = safeDecode(orgParam);
  const project = safeDecode(projectParam);
  const slug = safeDecode(slugParam);

  // THE GUARD. Our public namespace is `@`-prefixed; anything else is not ours, and
  // this route is the catch-all for every unmatched three-segment URL. Reject before
  // reading the session and before any upstream call, outside any try so the
  // `notFound()` throw is never swallowed. `@` alone (empty slug) is rejected too.
  if (!org.startsWith("@") || org.length < 2) notFound();
  if (project === "" || slug === "") notFound();
  // The resolver takes the BARE slug — the `@` is ours, not the backend's.
  const orgSlug = org.slice(1);

  const ctx = await optionalIdentity();

  // ── Member branch — the authenticated chrome, minus the id page's delete. ──────
  if (ctx) {
    const doc = await loadDocument(ctx.token, orgSlug, project, slug);
    const history = await loadVersions(ctx.token, doc);
    return (
      <AppShell identity={ctx.identity}>
        {/* Capped to the reading measure and centered, identical to the id page —
            the same document must read the same on either URL. */}
        <article className="mx-auto w-full max-w-[var(--kb-app-read-w)]">
          <div
            className="flex flex-wrap items-center gap-3"
            style={{ marginBottom: "1rem" }}
          >
            <Link href="/documents" className={appButtonClass("ghost", "sm")}>
              <ChevronLeft size={15} aria-hidden />
              {DOCUMENTS.read.backLabel}
            </Link>
          </div>
          <DocumentView doc={doc} id={doc.id} />
          {/* Version history stays id-keyed: its links point at
              `/documents/{id}/versions/{v}`, which is the exact-row addressing the
              dateless pretty URL deliberately does not replace. */}
          <VersionHistory
            id={doc.id}
            currentVersion={history.currentVersion}
            currentTitle={doc.title}
            versions={history.versions}
          />
        </article>
      </AppShell>
    );
  }

  // ── Anonymous branch — public-only read, no token. A miss is the branded 404. ──
  const doc = await loadDocument(undefined, orgSlug, project, slug);
  const history = await loadVersions(undefined, doc);
  return (
    <PublicShell>
      <article className="mx-auto w-full max-w-[var(--kb-app-read-w)]">
        <DocumentView doc={doc} id={doc.id} />
        <VersionHistory
          id={doc.id}
          currentVersion={history.currentVersion}
          currentTitle={doc.title}
          versions={history.versions}
        />
      </article>
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
