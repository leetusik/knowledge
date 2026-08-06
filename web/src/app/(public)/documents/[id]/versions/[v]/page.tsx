import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { ChevronLeft } from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { PublicShell } from "@/components/public-shell";
import { appButtonClass } from "@/components/ui";
import { DOCUMENTS } from "@/content";
import { optionalIdentity } from "@/lib/auth-guards";
import { getDocument, getDocumentVersion } from "@/lib/knowledge/app";
import { ApiError } from "@/lib/knowledge/client";
import type { KbDocument, KbDocumentVersion } from "@/lib/knowledge/types";

import "../../explainer.css";
import { Meta } from "../../document-view";
import { ExplainerFrame } from "../../explainer-frame";
import { MarkdownBody } from "../../markdown-body";

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
  return (
    <>
      {/* .mainhead — eyebrow (project) + the title THIS body carried + its date. */}
      <div className="mb-[var(--kb-space-md)]">
        <div className="kb-app-eyebrow">
          {DOCUMENTS.read.eyebrow(doc.project)}
        </div>
        <h1 className="kb-app-title" style={{ marginTop: "0.35rem" }}>
          {version.title}
        </h1>
        <p className="kb-app-sub">{version.date}</p>
      </div>

      {/* The superseded banner — the one thing a reader must not miss. Built from
          the existing idle-status tokens (no new visual language, F6); the link is
          the way back to what the document says today. */}
      <p
        className="mb-[var(--kb-space-md)] flex flex-wrap items-baseline gap-x-2 gap-y-1 rounded-[var(--kb-radius-sm)] border border-[var(--kb-border)] bg-[var(--kb-status-idle-soft)] px-[0.9rem] py-[0.7rem] text-[0.85rem] text-[var(--kb-status-idle-ink)]"
        role="status"
      >
        <span>
          {DOCUMENTS.versions.read.notice(version.version, doc.version)}
        </span>
        <Link
          href={`/documents/${id}`}
          className="underline underline-offset-2"
        >
          {DOCUMENTS.versions.read.backLabel}
        </Link>
      </p>

      {/* Metadata strip — the values as archived, not the document's current ones. */}
      <div className="mb-[var(--kb-space-md)] flex flex-wrap items-start gap-x-8 gap-y-3 border-y border-[var(--kb-border)] py-[0.9rem]">
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
        <Meta label={DOCUMENTS.versions.read.fields.tags}>
          {version.tags.length === 0 ? (
            <span className="text-[var(--kb-hint)]">
              {DOCUMENTS.list.noTags}
            </span>
          ) : (
            <span className="flex flex-wrap gap-[0.3rem]">
              {version.tags.map((tag) => (
                <span key={tag} className="kb-chip">
                  {tag}
                </span>
              ))}
            </span>
          )}
        </Meta>
        {/* Provenance: the on-disk archive file. Never a link — the `.versions`
            tree is not served. */}
        <Meta label={DOCUMENTS.versions.read.fields.archive} mono>
          {version.archive_path}
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
        <div className="kb-panel">
          {(version.markdown ?? "").trim() === "" ? (
            <p className="text-[0.9rem] text-[var(--kb-secondary)]">
              {DOCUMENTS.versions.read.emptyBody}
            </p>
          ) : (
            <MarkdownBody markdown={version.markdown ?? ""} />
          )}
        </div>
      )}
    </>
  );
}

export default async function DocumentVersionPage({
  params,
}: {
  // Next 16: dynamic route params arrive as a Promise.
  params: Promise<{ id: string; v: string }>;
}) {
  const { id: idParam, v: versionParam } = await params;
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

  if (ctx) {
    return (
      <AppShell identity={ctx.identity}>
        {/* Capped to the reading measure and centered, so folding the rail widens the
            margins symmetrically instead of stretching the column. Identical in both
            branches — the same URL must read the same signed in or out. */}
        <article className="mx-auto w-full max-w-[var(--kb-app-read-w)]">
          {/* Back to the live document — the only navigation a past version
              offers. No copy-link and no delete: this is a read-only view of a
              superseded body. */}
          <div style={{ marginBottom: "1rem" }}>
            <Link
              href={`/documents/${id}`}
              className={appButtonClass("ghost", "sm")}
            >
              <ChevronLeft size={15} aria-hidden />
              {DOCUMENTS.versions.read.backLabel}
            </Link>
          </div>
          {body}
        </article>
      </AppShell>
    );
  }

  return (
    <PublicShell>
      <article className="mx-auto w-full max-w-[var(--kb-app-read-w)]">
        {body}
      </article>
    </PublicShell>
  );
}
