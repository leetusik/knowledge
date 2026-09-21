import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ChevronLeft } from "lucide-react";

import { DocumentView } from "@/app/(public)/documents/[id]/document-view";
import { VersionHistory } from "@/app/(public)/documents/[id]/version-history";
import { AppShell } from "@/components/app-shell";
import { CopyLinkButton } from "@/components/copy-link-button";
import { PublicShell } from "@/components/public-shell";
import { appButtonClass } from "@/components/ui";
import { DOCUMENTS } from "@/content";
import { optionalIdentity } from "@/lib/auth-guards";
import { fullWidthHref, FULL_WIDTH_LINK_ATTR, isFullWidth } from "@/lib/full-width";
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
// Member-only affordances that live on the id page (delete) stay there. The share
// copy-link is rendered here as of P25.S5 — this is the shareable URL, so it is the
// natural place to copy it from — on the MEMBER branch only, matching the id page (an
// anonymous visitor is already looking at the link).
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
 * a genuine outage fails the read above and surfaces there. And exactly as on the id
 * page, P28.S7 makes the degradation HONEST: `ok: false` distinguishes "this fetch
 * failed" from "this document has no history", which an empty list could not.
 */
async function loadVersions(
  token: string | undefined,
  doc: KbDocument,
): Promise<{
  currentVersion: number;
  versions: KbDocumentVersion[];
  ok: boolean;
}> {
  try {
    const page = await getDocumentVersions(token, doc.id);
    return {
      currentVersion: page.current_version,
      versions: page.versions,
      ok: true,
    };
  } catch {
    // The document itself still renders in full; the panel reports its own fault.
    return { currentVersion: doc.version, versions: [], ok: false };
  }
}

export default async function PrettyDocumentPage({
  params,
  searchParams,
}: {
  // Next 16: dynamic route params arrive as a Promise.
  params: Promise<{ org: string; project: string; slug: string }>;
  /** Round 06 §4.4 — `?view=full`, the chrome-less view on this same URL. */
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const {
    org: orgParam,
    project: projectParam,
    slug: slugParam,
  } = await params;

  // Next gives params percent-DECODED already, but decode defensively the way the
  // sibling routes do — a double-encoded segment must not reach the upstream path.
  const fullWidth = isFullWidth(await searchParams);

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

  // This route's own URL, which `?view=full` is a query ON (§4.4). Built from the
  // segments as they arrived rather than from `canonical_path`, so it is right even
  // for a document whose pretty path is `null` (a superseded duplicate, P25.F1).
  // `@` is a legal path character, so it is left alone — the org segment would
  // otherwise read `%40acme` in the address bar for no gain.
  const seg = (value: string) => encodeURIComponent(value).replaceAll("%40", "@");
  const fullPath = `/${seg(org)}/${seg(project)}/${seg(slug)}`;

  const ctx = await optionalIdentity();

  // ── Member branch — the authenticated chrome, minus the id page's delete. ──────
  if (ctx) {
    const doc = await loadDocument(ctx.token, orgSlug, project, slug);
    const history = await loadVersions(ctx.token, doc);
    return (
      <AppShell identity={ctx.identity} fullWidth={fullWidth}>
        {/* Round 06 §3.1/§4.1 — `.kb-doc`, identical to the id page: the same
            document must read the same on either URL. */}
        <article className="kb-doc" tabIndex={-1}>
          <div className="kb-docbar">
            <div className="kb-docbar__nav">
              <Link href="/documents" className={appButtonClass("ghost", "sm")}>
                <ChevronLeft size={15} aria-hidden />
                {DOCUMENTS.read.backLabel}
              </Link>
            </div>
            <div className="kb-docbar__actions">
              {/* P25.S5 — the share affordance the S3 page deliberately left out. This
                  IS the shareable URL, so it should be the easiest place to share
                  from. `canonical_path` is what the backend built (identical to the
                  path in the address bar, since the document was resolved through it);
                  the id fallback is defensive only. Member branch ONLY, matching the id
                  page's convention — an anonymous visitor already has the URL. */}
              <CopyLinkButton
                path={doc.canonical_path ?? `/documents/${doc.id}`}
              />
              {/* P28.S8 mounts `<ExportPdfButton>` HERE (§4.1's order: Copy link ·
                  Export PDF · Full width). No Delete on this surface, so §4.1's
                  hairline never renders here. */}
              <Link
                href={fullWidthHref(fullPath)}
                className={appButtonClass("ghost", "sm")}
                {...{ [FULL_WIDTH_LINK_ATTR]: "" }}
              >
                {DOCUMENTS.read.fullWidthLabel}
              </Link>
            </div>
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
            ok={history.ok}
          />
        </article>
      </AppShell>
    );
  }

  // ── Anonymous branch — public-only read, no token. A miss is the branded 404. ──
  const doc = await loadDocument(undefined, orgSlug, project, slug);
  const history = await loadVersions(undefined, doc);
  return (
    <PublicShell fullWidth={fullWidth}>
      <article className="kb-doc" tabIndex={-1}>
        {/* §4.1's row, anonymous shape: no nav group (the back link goes to the
            member-gated list) and no Copy link (this IS the URL you would copy),
            but Full width is on every surface — and P28.S8's Export PDF lands in
            this same group. */}
        <div className="kb-docbar">
          <div className="kb-docbar__actions">
            <Link
              href={fullWidthHref(fullPath)}
              className={appButtonClass("ghost", "sm")}
              {...{ [FULL_WIDTH_LINK_ATTR]: "" }}
            >
              {DOCUMENTS.read.fullWidthLabel}
            </Link>
          </div>
        </div>
        <DocumentView doc={doc} id={doc.id} />
        <VersionHistory
          id={doc.id}
          currentVersion={history.currentVersion}
          currentTitle={doc.title}
          versions={history.versions}
          ok={history.ok}
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
