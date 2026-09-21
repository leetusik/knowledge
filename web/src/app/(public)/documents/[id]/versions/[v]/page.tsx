import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { ChevronLeft } from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { PublicShell } from "@/components/public-shell";
import { appButtonClass } from "@/components/ui";
import { DOCUMENTS, SITE } from "@/content";
import { optionalIdentity } from "@/lib/auth-guards";
import { fullWidthHref, FULL_WIDTH_LINK_ATTR, isFullWidth } from "@/lib/full-width";
import { getDocument, getDocumentVersion } from "@/lib/knowledge/app";
import { ApiError } from "@/lib/knowledge/client";
import type { KbDocument, KbDocumentVersion } from "@/lib/knowledge/types";

import { Meta } from "../../document-view";
import { ExplainerFrame } from "../../explainer-frame";
import { ExportPdfButton } from "../../export-pdf-button";
import { MarkdownBody } from "../../markdown-body";
import { PrintColophon, PrintMasthead } from "../../print-blocks";

// P23.S3 — ONE superseded version of a document, read-only, at
// `/documents/{id}/versions/{v}`. Nested under the optional-identity read page and
// branching identically: a signed-in member is served with their bearer inside
// <AppShell>, an anonymous visitor TOKENLESS inside <PublicShell> with every miss
// bouncing to /login. The archive is scoped upstream to the OWNING document's
// tenant, so a public document's history reads anonymously and a private one is an
// indistinguishable 404 (404-never-403) — the same boundary as the document itself.
//
// TWO fetches, deliberately: the version row carries the archived body plus the
// metadata it was archived with, but only the live document knows what the CURRENT
// version is — and that is exactly the fact this page must state. Both go through
// the same optional token; the document is fetched first, so an unreadable id is
// missed before a version is ever requested.
//
// Read-only by construction: no delete, no restore, no copy-link. A past version is
// not a document — it has no stable public URL to share beyond this one, and
// knowledge exposes no rollback (deliberately out of P23's scope).
//
// The <title> is STATIC copy (the read page's rule): the knowledge client is
// `cache: "no-store"`, so `generateMetadata` would buy a second uncached fetch.
export const metadata: Metadata = { title: DOCUMENTS.versions.read.title };

/**
 * Map knowledge's "you can't have this" statuses to the caller-appropriate miss.
 * Lives OUTSIDE the render so `notFound()`/`redirect()` — which signal by throwing —
 * are never swallowed by a `try`. 404 (missing document, missing version, a version
 * the caller may not read, AND the CURRENT version number, which is deliberately not
 * addressable as a version), 400 and 422 (a malformed segment that slipped the
 * pre-checks) all map the same way; anything else rethrows, so an outage surfaces.
 */
async function loadOrMiss<T>(
  fetcher: () => Promise<T>,
  onMiss: () => never,
): Promise<T> {
  try {
    return await fetcher();
  } catch (error) {
    if (
      error instanceof ApiError &&
      (error.status === 404 || error.status === 400 || error.status === 422)
    ) {
      onMiss();
    }
    throw error;
  }
}

/** `"2026-03-12T09:31:02+00:00"` → `"2026-03-12"`; unparseable → its first 10 chars. */
function formatDate(iso: string): string {
  const at = new Date(iso);
  if (Number.isNaN(at.getTime())) return iso.slice(0, 10);
  return at.toISOString().slice(0, 10);
}

/**
 * The whole past-version body — header, superseded banner, metadata strip, content.
 * Identical in both auth branches (they differ only in their surrounding shell), so
 * it is written once here rather than twice in the page.
 */
function PastVersion({
  doc,
  version,
  id,
}: {
  doc: KbDocument;
  version: KbDocumentVersion;
  id: number;
}) {
  const label = DOCUMENTS.versions.label(version.version);
  // This body's OWN address — a past version is only reachable here, so this is
  // the link the printed sheet must carry (the live document's pretty path would
  // hand the reader a different body).
  const path = `/documents/${id}/versions/${version.version}`;
  return (
    <>
      {/* Round 06 §4.1/§4.5 — the masthead opens the printed sheet, above the
          superseded stamp, and carries THIS body's version. */}
      <PrintMasthead path={path} version={version.version} />
      {/* Round 06 §3.1 — the superseded stamp sits ABOVE the header block (§5) and
          is the ONE piece of chrome the chrome-less view keeps: a reader must never
          mistake an archived body for the live document, least of all when every
          other signal has been hidden. `.kb-docnotice` keeps the idle-status inks
          and its `role="status"`, and gains the left rule that makes it read as a
          stamp on the document rather than a notification about the app. */}
      <div className="kb-docnotice" role="status">
        <span className="kb-status__dot" aria-hidden />
        <span>
          {DOCUMENTS.versions.read.notice(version.version, doc.version)}{" "}
          <Link href={`/documents/${id}`}>
            {DOCUMENTS.versions.read.backLabel}
          </Link>
        </span>
      </div>

      {/* §4.1's header block — eyebrow (project) + the title THIS body carried. */}
      <div className="kb-dochead">
        <div className="kb-app-eyebrow">
          {DOCUMENTS.read.eyebrow(doc.project)}
        </div>
        <h1 className="kb-app-title">{version.title}</h1>
        <p className="kb-app-sub">{version.date}</p>
      </div>

      {/* §4.2's strip — the values as archived, not the document's current ones.
          Five fields, in the record's order: Version · Date · Superseded ·
          Archive · Tags, with Archive on `--mono` and the tag list spanning. */}
      <div className="kb-docmeta">
        <Meta label={DOCUMENTS.versions.read.fields.version} mono>
          {label}
        </Meta>
        <Meta label={DOCUMENTS.versions.read.fields.date} mono>
          {version.date}
        </Meta>
        {/* When this body was ARCHIVED (superseded by the next version) — not when
            it was authored. */}
        <Meta label={DOCUMENTS.versions.read.fields.superseded} mono>
          {formatDate(version.created_at)}
        </Meta>
        {/* Provenance: the on-disk archive file. Never a link — the `.versions`
            tree is not served. */}
        <Meta label={DOCUMENTS.versions.read.fields.archive} mono>
          {version.archive_path}
        </Meta>
        <Meta
          label={DOCUMENTS.versions.read.fields.tags}
          tags
          empty={version.tags.length === 0}
        >
          {version.tags.length === 0
            ? DOCUMENTS.list.noTags
            : version.tags.map((tag) => (
                <span key={tag} className="kb-chip">
                  {tag}
                </span>
              ))}
        </Meta>
      </div>

      {/* The body. An archived HTML explainer is exactly as untrusted as the
          current one, so it renders through the same sandboxed opaque-origin
          iframe, pointed at the version-aware BFF relay (which re-asserts the
          pinned sandbox headers). Markdown renders XSS-safe via <MarkdownBody>. */}
      {version.format === "html" ? (
        <ExplainerFrame
          src={`/api/documents/${id}/versions/${version.version}/raw`}
          title={`${version.title} — ${label}`}
        />
      ) : (
        <div className="kb-panel kb-doc__body">
          {(version.markdown ?? "").trim() === "" ? (
            <div className="kb-prose">
              <p className="kb-prose__empty">
                {DOCUMENTS.versions.read.emptyBody}
              </p>
            </div>
          ) : (
            <MarkdownBody
              markdown={version.markdown ?? ""}
              baseUrl={`${SITE.url}/documents/${id}/versions/${version.version}`}
            />
          )}
        </div>
      )}

      {/* §4.5's colophon, in its ARCHIVED shape: `currentVersion` is what turns
          the second line from "this was current when you printed it" into "the
          current version is v{n}". The boxed stamp says the same thing at the top
          of the sheet; the two ends are the two places a separated page can be
          read from. */}
      <PrintColophon
        title={version.title}
        path={path}
        version={version.version}
        currentVersion={doc.version}
      />
    </>
  );
}

export default async function DocumentVersionPage({
  params,
  searchParams,
}: {
  // Next 16: dynamic route params arrive as a Promise.
  params: Promise<{ id: string; v: string }>;
  /** Round 06 §4.4 — `?view=full`, the chrome-less view on this same URL. */
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id: idParam, v: versionParam } = await params;
  const fullWidth = isFullWidth(await searchParams);
  // Both segments are positive integers upstream. A malformed one can never resolve
  // for anyone and leaks nothing regardless of auth, so short-circuit to the branded
  // not-found BEFORE reading the session — outside any try, so the throw survives.
  // `isSafeInteger` (not `isInteger`) also rejects `1e21`-style values, which would
  // otherwise reach the API in exponent notation.
  const id = Number(idParam);
  const version = Number(versionParam);
  if (!Number.isSafeInteger(id) || id < 1) notFound();
  if (!Number.isSafeInteger(version) || version < 1) notFound();

  const ctx = await optionalIdentity();
  const token = ctx?.token;
  // An anonymous miss bounces to /login (uniform for every anonymous miss on this
  // surface, exactly like the document read); a member's miss is the branded 404.
  const onMiss: () => never = ctx ? notFound : () => redirect("/login");

  const doc = await loadOrMiss(() => getDocument(token, id), onMiss);
  const row = await loadOrMiss(
    () => getDocumentVersion(token, id, version),
    onMiss,
  );

  const body = <PastVersion doc={doc} version={row} id={id} />;
  const fullPath = `/documents/${id}/versions/${version}`;
  // §4.1's actions row — read-only, so its right group holds Full width alone
  // (and, from P28.S8, Export PDF beside it): no copy-link and no delete, because
  // a past version is not a document you can share a pretty URL for or delete.
  const actions = (
    <div className="kb-docbar__actions">
      {/* §4.1/§5 — Export PDF on every surface, including this one: an archived
          body is exactly the body a reader is most likely to want on paper. */}
      <ExportPdfButton />
      <Link
        href={fullWidthHref(fullPath)}
        className={appButtonClass("ghost", "sm")}
        {...{ [FULL_WIDTH_LINK_ATTR]: "" }}
      >
        {DOCUMENTS.read.fullWidthLabel}
      </Link>
    </div>
  );

  if (ctx) {
    return (
      <AppShell identity={ctx.identity} fullWidth={fullWidth}>
        {/* Round 06 §3.1 — `.kb-doc`; the same document must read the same signed
            in or out. */}
        <article className="kb-doc" tabIndex={-1}>
          <div className="kb-docbar">
            {/* Back to the live document — the only navigation a past version
                offers. */}
            <div className="kb-docbar__nav">
              <Link
                href={`/documents/${id}`}
                className={appButtonClass("ghost", "sm")}
              >
                <ChevronLeft size={15} aria-hidden />
                {DOCUMENTS.versions.read.backLabel}
              </Link>
            </div>
            {actions}
          </div>
          {body}
        </article>
      </AppShell>
    );
  }

  return (
    <PublicShell fullWidth={fullWidth}>
      <article className="kb-doc" tabIndex={-1}>
        <div className="kb-docbar">{actions}</div>
        {body}
      </article>
    </PublicShell>
  );
}
