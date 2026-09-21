import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { ChevronLeft } from "lucide-react";

import { DeleteDocumentButton } from "@/app/(app)/documents/delete-document-button";
import { AppShell } from "@/components/app-shell";
import { CopyLinkButton } from "@/components/copy-link-button";
import { PublicShell } from "@/components/public-shell";
import { appButtonClass } from "@/components/ui";
import { DOCUMENTS, SHARE } from "@/content";
import { optionalIdentity } from "@/lib/auth-guards";
import { getDocument, getDocumentVersions } from "@/lib/knowledge/app";
import { ApiError } from "@/lib/knowledge/client";
import type { KbDocument, KbDocumentVersion } from "@/lib/knowledge/types";

import { fullWidthHref, FULL_WIDTH_LINK_ATTR, isFullWidth } from "@/lib/full-width";

import { DocumentView } from "./document-view";
import { ExportPdfButton } from "./export-pdf-button";
import { PrintColophon, PrintMasthead } from "./print-blocks";
import { VersionHistory } from "./version-history";

// P19 — one document in full, now on the OPTIONAL-IDENTITY public route group
// (moved out of the `(app)` auth gate; the URL `/documents/{id}` is unchanged). A
// server component; the ONE write it offers is P21's member delete (a client island
// in the member branch, going through the `"use server"` action to the unmetered
// `/app` plane — never the metered `vk_`-keyed `/api/*` machine surface). It branches
// on `optionalIdentity()`:
//   - a signed-in member → fetched with their bearer, wrapped in <AppShell> with the
//     back-link, the share copy-link, and the delete control (a cross-org member
//     transparently gets a public doc via knowledge's server-side public fallback —
//     and deleting it answers 404, which the island's copy covers);
//   - an anonymous visitor → fetched TOKENLESS and wrapped in <PublicShell>; a
//     private/nonexistent doc 404s server-side and we bounce to /login (uniform for
//     every anonymous miss — no returnTo plumbing, a deferred nicety).
//
// The <title> is STATIC copy, not the document title: the knowledge client is
// `cache: "no-store"`, so `generateMetadata` would cost a second uncached fetch.
export const metadata: Metadata = { title: DOCUMENTS.title };

/**
 * Fetch one document with the caller's (optional) token, mapping knowledge's 404/400
 * to the caller-appropriate miss. The mapping lives OUTSIDE the render so
 * `notFound()`/`redirect()` — which signal by throwing — are never swallowed by a
 * `try`. 404 (missing OR another tenant's private/nonexistent — 404-never-403, ids
 * cannot be probed) and 400 both map the same way; everything else rethrows (an
 * outage must surface).
 */
async function loadDocument(
  token: string | undefined,
  id: number,
  onMiss: () => never,
): Promise<KbDocument> {
  try {
    return await getDocument(token, id);
  } catch (error) {
    if (
      error instanceof ApiError &&
      (error.status === 404 || error.status === 400)
    ) {
      onMiss();
    }
    throw error;
  }
}

/**
 * The document's SUPERSEDED versions (P23), newest first — `[]` when it has never
 * been re-published. Fetched with the same (optional) token as the document, right
 * after it, so the archive is scoped exactly like the read that just succeeded.
 *
 * DEGRADES rather than throws, the one place on this page that does: history is an
 * ADDITIVE panel beside the document, so a fault reading it must not take down a
 * document body that already loaded. There is no silent-outage risk in practice —
 * both calls hit the same upstream, so a real outage fails the document read above
 * and surfaces there. A 404 here is not even an error: it is what an id the caller
 * cannot read answers, and that id could not have got this far.
 *
 * P28.S7 (round 06 §5): it degrades but no longer LIES. The catch used to return an
 * empty list, which is also what a document with no history returns — so a failure
 * rendered as "this document has never been re-published" and nobody was told
 * otherwise. `ok: false` is that distinction, and the panel says it out loud.
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

export default async function DocumentPage({
  params,
  searchParams,
}: {
  // Next 16: dynamic route params arrive as a Promise.
  params: Promise<{ id: string }>;
  // Round 06 §4.4 — `?view=full` is the chrome-less view, a query on this very
  // URL rather than a route of its own, so the explainer keeps framing the same
  // sandboxed relay and no new route serves document HTML on our origin.
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id: idParam } = await params;
  const fullWidth = isFullWidth(await searchParams);
  // Doc ids are integers. A non-integer / non-positive id is effectively not-found
  // for everyone (the backend would 422 it) and leaks nothing regardless of auth, so
  // short-circuit to the branded not-found BEFORE reading the session. Outside any
  // try, so the `notFound()` throw is never swallowed.
  const id = Number(idParam);
  if (!Number.isInteger(id) || id < 1) notFound();

  const ctx = await optionalIdentity();

  // ── Member branch — the unchanged authenticated experience. ────────────────
  if (ctx) {
    const doc = await loadDocument(ctx.token, id, notFound);
    const history = await loadVersions(ctx.token, doc);
    return (
      <AppShell identity={ctx.identity} fullWidth={fullWidth}>
        {/* Round 06 §3.1/§4.1 — `.kb-doc` replaces the utility cap and supplies the
            whole article's vertical rhythm with its own `gap`, so no child carries
            a `marginBottom` any more. `tabIndex={-1}` is §6's focus target when the
            chrome-less view opens. Identical in both branches — the same URL must
            read the same signed in or out. */}
        <article className="kb-doc" tabIndex={-1}>
          {/* §4.1's actions row: TWO groups — where you came from, and what you can
              do with this document — plus the claim hint as the sentence it is, on
              its own line. */}
          <div className="kb-docbar">
            <div className="kb-docbar__nav">
              <Link href="/documents" className={appButtonClass("ghost", "sm")}>
                <ChevronLeft size={15} aria-hidden />
                {DOCUMENTS.read.backLabel}
              </Link>
            </div>
            <div className="kb-docbar__actions">
              {/* P25.S5 — share the PRETTY URL when the document has one. The member
                  stays on the id URL (the anonymous redirect above is anonymous-only),
                  but what they hand to someone else is the durable
                  `/@{org}/{project}/{slug}` path the backend built once as
                  `canonical_path`. `null` (no org slug claimed) falls back to the id
                  URL, which keeps working forever. */}
              <CopyLinkButton path={doc.canonical_path ?? `/documents/${id}`} />
              {/* Round 06 §4.1/§5 — the print pipeline's one control, between
                  Copy link and Full width. It takes no props: it prints the page
                  the reader is already on, and `kb-print.css` drops the chrome,
                  so there is nothing to prepare and no view to switch to first. */}
              <ExportPdfButton />
              <Link
                href={fullWidthHref(`/documents/${id}`)}
                className={appButtonClass("ghost", "sm")}
                {...{ [FULL_WIDTH_LINK_ATTR]: "" }}
              >
                {DOCUMENTS.read.fullWidthLabel}
              </Link>
              {/* The hairline renders only when Delete does (§4.1). */}
              <span className="kb-docbar__sep" />
              {/* P21 — the member-only delete, behind that hairline and, below
                  40rem, on its own full-width row under a rule: it is the one
                  control that ends the page, so it is never a thumb-width from
                  Copy link. `.kb-docbar__danger` is `display: contents` above the
                  phone, so the wrapper is never swapped in JS. */}
              <div className="kb-docbar__danger">
                <DeleteDocumentButton
                  documentId={id}
                  documentTitle={doc.title}
                  redirectTo="/documents"
                />
              </div>
            </div>
            {/* P25.F3 — say WHY the button just handed out an id URL. Shown only
                when the viewer's OWN org has claimed no slug (`tenant.slug === null`,
                free off the session identity), so the fallback stops being silent.
                The extra `canonical_path === null` clause is an ownership proxy: a
                cross-org member reading another org's public doc gets that org's
                pretty path here, and telling them to claim a name would be noise.
                A slug that IS claimed never shows this — a `null` path then means
                the doc is a superseded duplicate (P25.F1) whose id URL is correct
                and permanent, not something the operator can fix. */}
            {ctx.identity.tenant?.slug == null &&
            doc.canonical_path === null ? (
              <p className="kb-docbar__hint">
                {SHARE.claimHint.prefix}
                <Link href={SHARE.claimHint.href}>
                  {SHARE.claimHint.linkLabel}
                </Link>
                {SHARE.claimHint.suffix}
              </p>
            ) : null}
          </div>
          {/* Round 06 §4.1/§4.5 — print-only, and `display: none` on screen. The
              masthead opens the printed sheet (the actions row above it is
              dropped on paper); the colophon closes it, below the version panel
              that paper never gets. */}
          <PrintMasthead
            path={doc.canonical_path ?? `/documents/${id}`}
            version={doc.version}
          />
          <DocumentView doc={doc} id={id} />
          {/* P23 — the version-history panel, below the body and identical in both
              branches (it carries no member-only affordance; knowledge scopes the
              archive to the OWNING document's tenant, so a public doc's history is
              anonymously readable). Renders nothing when there is no history. */}
          <VersionHistory
            id={id}
            currentVersion={history.currentVersion}
            currentTitle={doc.title}
            versions={history.versions}
            ok={history.ok}
          />
          <PrintColophon
            title={doc.title}
            path={doc.canonical_path ?? `/documents/${id}`}
            version={doc.version}
          />
        </article>
      </AppShell>
    );
  }

  // ── Anonymous branch — public-only read, no token. A miss bounces to /login. ─
  const doc = await loadDocument(undefined, id, () => redirect("/login"));
  // P25.S3 — an anonymous visitor who followed an old id link is sent on to the
  // PRETTY URL when the document has one (`canonical_path`, built once in the backend
  // from durable parts; `null` until the owning tenant claims an org slug, and then
  // this page just serves as it always has — no link ever breaks).
  //
  // Anonymous ONLY: a signed-in member keeps the id URL, which carries the
  // member-only affordances (delete) the pretty page deliberately does not have, and
  // the intent explicitly allows internal navigation to stay id-keyed.
  //
  // TEMPORARY (307 via `redirect()`), never permanent: org slugs are mutable in this
  // phase, and a 308 would be cached by browsers past a slug change. One-way only —
  // the pretty page never redirects back here, so there is no loop.
  // Top level, outside any try: `redirect()` signals by throwing.
  if (doc.canonical_path) redirect(doc.canonical_path);
  const history = await loadVersions(undefined, doc);
  return (
    <PublicShell fullWidth={fullWidth}>
      <article className="kb-doc" tabIndex={-1}>
        {/* §4.1's row, anonymous shape: no `.kb-docbar__nav`, because the only
            "where you came from" it draws is the member-gated documents list, and
            no Copy link or Delete. The right-hand group still carries Full width
            (§5: "on every surface") and is where P28.S8 mounts Export PDF. */}
        <div className="kb-docbar">
          <div className="kb-docbar__actions">
            <ExportPdfButton />
            <Link
              href={fullWidthHref(`/documents/${id}`)}
              className={appButtonClass("ghost", "sm")}
              {...{ [FULL_WIDTH_LINK_ATTR]: "" }}
            >
              {DOCUMENTS.read.fullWidthLabel}
            </Link>
          </div>
        </div>
        <PrintMasthead
          path={doc.canonical_path ?? `/documents/${id}`}
          version={doc.version}
        />
        <DocumentView doc={doc} id={id} />
        <VersionHistory
          id={id}
          currentVersion={history.currentVersion}
          currentTitle={doc.title}
          versions={history.versions}
          ok={history.ok}
        />
        <PrintColophon
          title={doc.title}
          path={doc.canonical_path ?? `/documents/${id}`}
          version={doc.version}
        />
      </article>
    </PublicShell>
  );
}
