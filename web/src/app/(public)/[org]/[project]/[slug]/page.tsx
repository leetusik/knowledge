import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { cache } from "react";

import { LegacyReaderPage } from "@/components/reader/legacy-reader-page";
import { ReaderPage } from "@/components/reader/reader-page";
import { DOCUMENTS } from "@/content";
import { optionalIdentity } from "@/lib/auth-guards";
import { resolveDocument } from "@/lib/knowledge/app";
import { ApiError } from "@/lib/knowledge/client";
import type { KbDocument } from "@/lib/knowledge/types";
import { parseReaderCookie, READER_COOKIE } from "@/lib/reader-cookie";
import { loadLooseReader, type ReaderLoad } from "@/lib/reader/load";

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
// Branching mirrors the id page (`optionalIdentity()`): a signed-in member reads with
// their bearer, an anonymous visitor TOKENLESS. Both map a miss to the co-located
// branded not-found. The anonymous branch deliberately does NOT bounce to /login the
// way the id page does: the resolver's 404 already collapses private/unknown/malformed
// into one indistinguishable answer, so a login bounce would leak nothing and only add
// friction on a share surface.
//
// P30.S13 — a native or md document opens in the READER here too (the loose-document
// variant, `01-reader`); `?v=N` reads an older version. P30.S25 — an html explainer (or
// an html version) opens in the LEGACY READER (`09-legacy-and-print`), with no app shell.
//
// The <title> is the document's title (P30.S15), through `generateMetadata`. The
// knowledge client is `cache: "no-store"`, so the page and the metadata share ONE
// resolver read per request (`resolveDocumentOnce`, React `cache`); a miss or a fault
// falls back to the static title and the page handles the miss itself.
const resolveDocumentOnce = cache(
  (
    token: string | undefined,
    org: string,
    project: string,
    slug: string,
  ): Promise<KbDocument> => resolveDocument(token, org, project, slug),
);

export async function generateMetadata({
  params,
}: {
  params: Promise<{ org: string; project: string; slug: string }>;
}): Promise<Metadata> {
  try {
    const p = await params;
    const org = safeDecode(p.org);
    if (org.startsWith("@") && org.length >= 2) {
      const ctx = await optionalIdentity();
      const doc = await resolveDocumentOnce(
        ctx?.token,
        org.slice(1),
        safeDecode(p.project),
        safeDecode(p.slug),
      );
      if (doc.title) return { title: doc.title };
    }
  } catch {
    // the page renders the miss or the failure itself
  }
  return { title: DOCUMENTS.title };
}

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
    return await resolveDocumentOnce(token, org, project, slug);
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
 * The page's one load (reader or legacy reader), deduped per request so the viewport
 * (`viewport-fit=cover` for the legacy reader) and the page read once.
 */
const loadOnce = cache(
  async (
    token: string | undefined,
    org: string,
    project: string,
    slug: string,
    v: number | null,
    cookie: string | undefined,
  ): Promise<ReaderLoad> =>
    loadLooseReader({
      token,
      doc: await resolveDocumentOnce(token, org, project, slug),
      v,
      settings: parseReaderCookie(cookie),
      org,
    }),
);

function versionOf(raw: string | string[] | undefined): number | null {
  const v = Array.isArray(raw) ? raw[0] : raw;
  return v && /^\d{1,6}$/.test(v) ? Number(v) : null;
}

export async function generateViewport({
  params,
  searchParams,
}: {
  params: Promise<{ org: string; project: string; slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}): Promise<Viewport> {
  try {
    const p = await params;
    const org = safeDecode(p.org);
    if (org.startsWith("@") && org.length >= 2) {
      const ctx = await optionalIdentity();
      const loaded = await loadOnce(
        ctx?.token,
        org.slice(1),
        safeDecode(p.project),
        safeDecode(p.slug),
        versionOf((await searchParams).v),
        (await cookies()).get(READER_COOKIE)?.value,
      );
      if (loaded.kind === "legacy") return { viewportFit: "cover" };
    }
  } catch {
    // the page renders the miss or the failure itself
  }
  return {};
}

export default async function PrettyDocumentPage({
  params,
  searchParams,
}: {
  params: Promise<{ org: string; project: string; slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const {
    org: orgParam,
    project: projectParam,
    slug: slugParam,
  } = await params;
  const query = await searchParams;
  const v = versionOf(query.v);

  const org = safeDecode(orgParam);
  const project = safeDecode(projectParam);
  const slug = safeDecode(slugParam);

  // THE GUARD (load-bearing, see ROUTE PRECEDENCE above): our public namespace is
  // `@`-prefixed. Reject before reading the session or calling upstream.
  if (!org.startsWith("@") || org.length < 2) notFound();
  if (project === "" || slug === "") notFound();
  const orgSlug = org.slice(1);

  const ctx = await optionalIdentity();
  const cookie = (await cookies()).get(READER_COOKIE)?.value;
  // A miss is the branded not-found (outside any try, so the throw survives).
  await loadDocument(ctx?.token, orgSlug, project, slug);
  const loaded = await loadOnce(ctx?.token, orgSlug, project, slug, v, cookie);
  return loaded.kind === "reader" ? (
    <ReaderPage reader={loaded.reader} />
  ) : (
    <LegacyReaderPage legacy={loaded.legacy} />
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
