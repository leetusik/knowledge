import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";

import { ChevronLeft } from "lucide-react";

import { appButtonClass } from "@/components/ui";
import { DOCUMENTS } from "@/content";
import { requireIdentity } from "@/lib/auth-guards";
import { getDocument } from "@/lib/knowledge/app";
import { ApiError } from "@/lib/knowledge/client";
import type { KbDocument } from "@/lib/knowledge/types";

import "./explainer.css";
import { MarkdownBody } from "./markdown-body";

// P12.S5 — one document in full, reached from the list's title link. A server
// component throughout; NO client island and NO server action — this surface is
// READ-ONLY by design (writes stay on the `vk_`-keyed `/api/*` machine surface). The
// body markdown is rendered XSS-safe by `MarkdownBody` (react-markdown, no
// rehype-raw). Rendered inside the S2/S2R `(app)` shell, so it draws only into
// `.kb-app-main`.
//
// The <title> is STATIC copy, not the document title: the knowledge client is
// `cache: "no-store"`, so `generateMetadata` would cost a second uncached fetch.
export const metadata: Metadata = { title: DOCUMENTS.title };

/**
 * Fetch one document, mapping the backend's rejections to the 404 page. 404 (missing
 * OR another tenant's — 404-never-403 so ids cannot be probed) and 400 both render
 * the SAME branded not-found. A 401 never reaches here (`requireIdentity` already
 * redirected); EVERYTHING ELSE rethrows — an outage must surface, not masquerade as
 * a missing document.
 *
 * The mapping lives here so `notFound()` can never sit inside the `try` that would
 * swallow it (it signals by throwing, like `redirect()`).
 */
async function loadDocument(token: string, id: number): Promise<KbDocument> {
  try {
    return await getDocument(token, id);
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

/** One labeled field in the metadata strip. */
function Meta({
  label,
  children,
  mono,
}: {
  label: string;
  children: ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="flex flex-col gap-[0.15rem]">
      <span className="text-[0.62rem] uppercase tracking-[0.06em] text-[var(--kb-hint)] [font-family:var(--kb-font-mono)]">
        {label}
      </span>
      <span
        className={
          mono
            ? "text-[0.82rem] text-[var(--kb-ink)] [font-family:var(--kb-font-mono)]"
            : "text-[0.85rem] text-[var(--kb-ink)]"
        }
      >
        {children}
      </span>
    </div>
  );
}

export default async function DocumentPage({
  params,
}: {
  // Next 16: dynamic route params arrive as a Promise.
  params: Promise<{ id: string }>;
}) {
  const { id: idParam } = await params;
  // Doc ids are integers. A non-integer / non-positive id is effectively not-found
  // (the backend would 422 it); short-circuit to the branded not-found instead. This
  // sits OUTSIDE any try, so the `notFound()` throw is never swallowed.
  const id = Number(idParam);
  if (!Number.isInteger(id) || id < 1) notFound();

  const { token } = await requireIdentity();
  const doc = await loadDocument(token, id);

  return (
    <article>
      <Link
        href="/documents"
        className={appButtonClass("ghost", "sm")}
        style={{ marginBottom: "1rem" }}
      >
        <ChevronLeft size={15} aria-hidden />
        {DOCUMENTS.read.backLabel}
      </Link>

      {/* .mainhead — eyebrow (project) + Fraunces title + date sub. */}
      <div className="mb-[var(--kb-space-md)]">
        <div className="kb-app-eyebrow">{DOCUMENTS.read.eyebrow(doc.project)}</div>
        <h1 className="kb-app-title" style={{ marginTop: "0.35rem" }}>
          {doc.title}
        </h1>
        <p className="kb-app-sub">{doc.date}</p>
      </div>

      {/* Metadata strip — project / date / tags / source. */}
      <div className="mb-[var(--kb-space-md)] flex flex-wrap items-start gap-x-8 gap-y-3 border-y border-[var(--kb-border)] py-[0.9rem]">
        <Meta label={DOCUMENTS.read.fields.project}>{doc.project}</Meta>
        <Meta label={DOCUMENTS.read.fields.date} mono>
          {doc.date}
        </Meta>
        <Meta label={DOCUMENTS.read.fields.tags}>
          {doc.tags.length === 0 ? (
            <span className="text-[var(--kb-hint)]">{DOCUMENTS.list.noTags}</span>
          ) : (
            <span className="flex flex-wrap gap-[0.3rem]">
              {doc.tags.map((tag) => (
                <span key={tag} className="kb-chip">
                  {tag}
                </span>
              ))}
            </span>
          )}
        </Meta>
        <Meta label={DOCUMENTS.read.fields.source} mono>
          {doc.source_repo ?? DOCUMENTS.read.noSource}
        </Meta>
      </div>

      {/* The body. HTML explainers (P16) render interactive in a sandboxed
          opaque-origin iframe — `sandbox="allow-scripts"` and, crucially, NEVER
          `allow-same-origin` (nor allow-forms/popups/top-navigation/modals): the
          framed doc gets an opaque origin, so its untrusted quiz JS runs but cannot
          read cookies/storage, reach the parent app, or call the API as the user
          (phase P16 pinned decision 1). The `src` is the same-origin BFF relay.
          Markdown docs render XSS-safe via <MarkdownBody> (react-markdown, no
          rehype-raw) exactly as before. */}
      {doc.format === "html" ? (
        <div className="kb-explainer">
          <iframe
            src={`/api/documents/${id}/raw`}
            sandbox="allow-scripts"
            title={doc.title}
            className="kb-explainer__frame"
            referrerPolicy="no-referrer"
          />
        </div>
      ) : (
        <div className="kb-panel">
          {doc.markdown.trim() === "" ? (
            <p className="text-[0.9rem] text-[var(--kb-secondary)]">
              {DOCUMENTS.read.emptyBody}
            </p>
          ) : (
            <MarkdownBody markdown={doc.markdown} />
          )}
        </div>
      )}
    </article>
  );
}
