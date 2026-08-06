import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { ChevronLeft } from "lucide-react";

import { DeleteDocumentButton } from "@/app/(app)/documents/delete-document-button";
import { AppShell } from "@/components/app-shell";
import { CopyLinkButton } from "@/components/copy-link-button";
import { PublicShell } from "@/components/public-shell";
import { appButtonClass } from "@/components/ui";
import { DOCUMENTS } from "@/content";
import { optionalIdentity } from "@/lib/auth-guards";
import { getDocument, getDocumentVersions } from "@/lib/knowledge/app";
import { ApiError } from "@/lib/knowledge/client";
import type { KbDocument, KbDocumentVersion } from "@/lib/knowledge/types";

import { DocumentView } from "./document-view";
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

export default async function DocumentPage({
  params,
}: {
  // Next 16: dynamic route params arrive as a Promise.
  params: Promise<{ id: string }>;
}) {
  const { id: idParam } = await params;
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
      <AppShell identity={ctx.identity}>
        {/* Capped to the reading measure and centered, so folding the rail widens the
            margins symmetrically instead of stretching the column. Identical in both
            branches — the same URL must read the same signed in or out, and the
            anonymous <PublicShell> has no rail at all, so it is the wider case. */}
        <article className="mx-auto w-full max-w-[var(--kb-app-read-w)]">
          {/* Back-link to the list (still member-gated) + the share copy-link. */}
          <div
            className="flex flex-wrap items-center gap-3"
            style={{ marginBottom: "1rem" }}
          >
            <Link href="/documents" className={appButtonClass("ghost", "sm")}>
              <ChevronLeft size={15} aria-hidden />
              {DOCUMENTS.read.backLabel}
            </Link>
            <CopyLinkButton path={`/documents/${id}`} />
            {/* P21 — the member-only delete, trailing (`ml-auto`) and two-step. It
                lives ONLY in this branch: the anonymous branch below and the shared
                `<DocumentView>` stay auth-free. `redirectTo` sends the caller back to
                the list, because this very URL 404s the moment the delete lands.
                A member reading ANOTHER org's public doc also sees it and gets the
                404 copy on submit — there is no client-side tenant signal to hide it
                by, and the backend answers 404-never-403 by design. */}
            <div className="ml-auto">
              <DeleteDocumentButton
                documentId={id}
                documentTitle={doc.title}
                redirectTo="/documents"
              />
            </div>
          </div>
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
          />
        </article>
      </AppShell>
    );
  }

  // ── Anonymous branch — public-only read, no token. A miss bounces to /login. ─
  const doc = await loadDocument(undefined, id, () => redirect("/login"));
  const history = await loadVersions(undefined, doc);
  return (
    <PublicShell>
      <article className="mx-auto w-full max-w-[var(--kb-app-read-w)]">
        <DocumentView doc={doc} id={id} />
        <VersionHistory
          id={id}
          currentVersion={history.currentVersion}
          currentTitle={doc.title}
          versions={history.versions}
        />
      </article>
    </PublicShell>
  );
}
