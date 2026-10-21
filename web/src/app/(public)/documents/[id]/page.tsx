import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { cache } from "react";

import { LegacyReaderPage } from "@/components/reader/legacy-reader-page";
import { ReaderPage } from "@/components/reader/reader-page";
import { DOCUMENTS } from "@/content";
import { optionalIdentity } from "@/lib/auth-guards";
import { getDocument } from "@/lib/knowledge/app";
import { ApiError } from "@/lib/knowledge/client";
import { loginHref } from "@/lib/next-path";
import { parseReaderCookie, READER_COOKIE } from "@/lib/reader-cookie";
import { loadLooseReader, type ReaderLoad } from "@/lib/reader/load";
import type { KbDocument } from "@/lib/knowledge/types";

// P19 — one document in full, on the OPTIONAL-IDENTITY public route group (the URL
// `/documents/{id}` is unchanged). It branches on `optionalIdentity()`:
//   - a signed-in member → fetched with their bearer (a cross-org member transparently
//     gets a public doc via knowledge's server-side public fallback);
//   - an anonymous visitor → fetched TOKENLESS; a private/nonexistent doc 404s
//     server-side and we bounce to /login with `?next=` back here.
//
// P30.S13 — a native or md document opens in the READER (`01-reader`, the loose-
// document variant: no book navigation, no app shell) from this id URL and from its
// pretty URL; `?v=N` reads an older version. P30.S25 — an html explainer (or an html
// version) opens in the LEGACY READER (`09-legacy-and-print`): the full-screen
// sandboxed frame, the document bar, no app shell. The older frame's copy-link / Export
// PDF / Full width / Delete row is gone with it (delete stays on the console's list).
//
// The <title> is the document's title (P30.S15), through `generateMetadata`. The
// knowledge client is `cache: "no-store"`, so the page and the metadata share ONE
// document read per request (`getDocumentOnce`, React `cache`). A miss or a fault falls
// back to the static title; the page handles the miss itself.
const getDocumentOnce = cache(
  (token: string | undefined, id: number): Promise<KbDocument> =>
    getDocument(token, id),
);

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  try {
    const id = Number((await params).id);
    if (Number.isInteger(id) && id >= 1) {
      const ctx = await optionalIdentity();
      const doc = await getDocumentOnce(ctx?.token, id);
      if (doc.title) return { title: doc.title };
    }
  } catch {
    // the page renders the miss or the failure itself
  }
  return { title: DOCUMENTS.title };
}

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
    return await getDocumentOnce(token, id);
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
 * The page's one load (reader or legacy reader), deduped per request so the viewport
 * (`viewport-fit=cover` for the legacy reader) and the page read once. Every argument is
 * a primitive; the settings arrive as the raw cookie value.
 */
const loadOnce = cache(
  async (
    token: string | undefined,
    id: number,
    v: number | null,
    cookie: string | undefined,
  ): Promise<ReaderLoad> =>
    loadLooseReader({
      token,
      doc: await getDocumentOnce(token, id),
      v,
      settings: parseReaderCookie(cookie),
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
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}): Promise<Viewport> {
  try {
    const id = Number((await params).id);
    if (Number.isInteger(id) && id >= 1) {
      const ctx = await optionalIdentity();
      const doc = await getDocumentOnce(ctx?.token, id);
      // An anonymous visit to a document with a pretty URL is redirected there.
      if (!ctx && doc.canonical_path) return {};
      const loaded = await loadOnce(
        ctx?.token,
        id,
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

function render(loaded: ReaderLoad) {
  return loaded.kind === "reader" ? (
    <ReaderPage reader={loaded.reader} />
  ) : (
    <LegacyReaderPage legacy={loaded.legacy} />
  );
}

export default async function DocumentPage({
  params,
  searchParams,
}: {
  // Next 16: dynamic route params arrive as a Promise.
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id: idParam } = await params;
  const query = await searchParams;
  // Doc ids are integers. A non-integer / non-positive id is effectively not-found
  // for everyone (the backend would 422 it) and leaks nothing regardless of auth, so
  // short-circuit to the branded not-found BEFORE reading the session. Outside any
  // try, so the `notFound()` throw is never swallowed.
  const id = Number(idParam);
  if (!Number.isInteger(id) || id < 1) notFound();

  const ctx = await optionalIdentity();
  const v = versionOf(query.v);
  const cookie = (await cookies()).get(READER_COOKIE)?.value;

  // ── Member branch. ─────────────────────────────────────────────────────────
  if (ctx) {
    await loadDocument(ctx.token, id, notFound);
    return render(await loadOnce(ctx.token, id, v, cookie));
  }

  // ── Anonymous branch — public-only read, no token. A miss bounces to /login. ─
  // P30.S11 (D18) — with `?next=` back to this document, so signing in finishes
  // the trip the visitor started (a private document then reads as a member's).
  const doc = await loadDocument(undefined, id, () =>
    redirect(loginHref(`/documents/${id}`)),
  );
  // P25.S3 — an anonymous visitor who followed an old id link is sent on to the
  // PRETTY URL when the document has one (`canonical_path`, built once in the backend
  // from durable parts; `null` until the owning tenant claims an org slug, and then
  // this page just serves as it always has — no link ever breaks).
  //
  // Anonymous ONLY: a signed-in member keeps the id URL, and the intent explicitly
  // allows internal navigation to stay id-keyed.
  //
  // TEMPORARY (307 via `redirect()`), never permanent: org slugs are mutable in this
  // phase, and a 308 would be cached by browsers past a slug change. One-way only —
  // the pretty page never redirects back here, so there is no loop.
  // Top level, outside any try: `redirect()` signals by throwing.
  if (doc.canonical_path) {
    redirect(v !== null ? `${doc.canonical_path}?v=${v}` : doc.canonical_path);
  }
  return render(await loadOnce(undefined, id, v, cookie));
}
