import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { ChevronLeft } from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { CopyLinkButton } from "@/components/copy-link-button";
import { PublicShell } from "@/components/public-shell";
import { appButtonClass } from "@/components/ui";
import { DOCUMENTS } from "@/content";
import { optionalIdentity } from "@/lib/auth-guards";
import { getDocument } from "@/lib/knowledge/app";
import { ApiError } from "@/lib/knowledge/client";
import type { KbDocument } from "@/lib/knowledge/types";

import { DocumentView } from "./document-view";

// P19 — one document in full, now on the OPTIONAL-IDENTITY public route group
// (moved out of the `(app)` auth gate; the URL `/documents/{id}` is unchanged). A
// server component throughout; still READ-ONLY (writes stay on the `vk_`-keyed
// `/api/*` machine surface). It branches on `optionalIdentity()`:
//   - a signed-in member → the member experience is unchanged: fetched with their
//     bearer, wrapped in <AppShell> with the back-link (a cross-org member
//     transparently gets a public doc via knowledge's server-side public fallback);
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
    return (
      <AppShell identity={ctx.identity}>
        <article>
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
          </div>
          <DocumentView doc={doc} id={id} />
        </article>
      </AppShell>
    );
  }

  // ── Anonymous branch — public-only read, no token. A miss bounces to /login. ─
  const doc = await loadDocument(undefined, id, () => redirect("/login"));
  return (
    <PublicShell>
      <article>
        <DocumentView doc={doc} id={id} />
      </article>
    </PublicShell>
  );
}
