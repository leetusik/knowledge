import type { ReactNode } from "react";

import { DOCUMENTS } from "@/content";
import type { KbDocument } from "@/lib/knowledge/types";

import "./explainer.css";
import { MarkdownBody } from "./markdown-body";

// P19 — the shared document rendering (header + metadata strip + format branch),
// extracted VERBATIM from the P12.S5 read page so the member and public (anonymous)
// doc pages render byte-identical bodies. A SERVER component throughout; NO client
// island and NO auth import — this is READ-ONLY presentation of an already-fetched
// `KbDocument`. The two pages differ only in their surrounding chrome (AppShell vs
// PublicShell) and the member-only back-link/copy-link row, both of which live in the
// page, not here.
//
// The body markdown is rendered XSS-safe by `MarkdownBody` (react-markdown, no
// rehype-raw). HTML explainers (P16) render interactive in a sandboxed opaque-origin
// iframe pointed at the same-origin `/api/documents/{id}/raw` relay (now
// optional-identity), which re-asserts the pinned sandbox headers.

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

/** The header + metadata strip + format branch for one document. */
export function DocumentView({ doc, id }: { doc: KbDocument; id: number }) {
  return (
    <>
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
    </>
  );
}
