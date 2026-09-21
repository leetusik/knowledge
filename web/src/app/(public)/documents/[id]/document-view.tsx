import type { ReactNode } from "react";

import { DOCUMENTS, SITE } from "@/content";
import type { KbDocument } from "@/lib/knowledge/types";

import { ExplainerFrame } from "./explainer-frame";
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
//
// P28.S7 (round 06 §4.1/§4.2/§5) — every Tailwind utility string here is replaced by
// the round's named classes (`.kb-dochead`, `.kb-docmeta*`, `.kb-doc__body`), the
// per-block `mb-[var(--kb-space-md)]` is gone because `.kb-doc` (the page's article)
// now supplies the rhythm with its own `gap`, and the strip is a GRID rather than a
// wrapping flex. The co-located `prose.css` / `explainer.css` are deleted; both
// bodies live in `kb-docview.css` on the globals chain.

/**
 * One labeled field in the metadata strip. EXPORTED (P23.S3) so the past-version
 * view renders its own strip in the same vocabulary instead of re-inventing one —
 * it is presentation only, with no document coupling.
 *
 * `empty` (P28.S7) marks a field whose value is the em-dash placeholder: §4.2 keeps
 * the field itself — "a strip that changes shape per document is not a strip" — and
 * greys only the value.
 */
export function Meta({
  label,
  children,
  mono,
  empty,
  tags,
}: {
  label: string;
  children: ReactNode;
  mono?: boolean;
  empty?: boolean;
  /** The one field of unknown length: it spans the whole strip (§4.2). */
  tags?: boolean;
}) {
  return (
    <div
      className={
        tags ? "kb-docmeta__field kb-docmeta__field--tags" : "kb-docmeta__field"
      }
    >
      <span className="kb-docmeta__label">{label}</span>
      <span
        className={[
          "kb-docmeta__value",
          mono ? "kb-docmeta__value--mono" : "",
          empty ? "kb-docmeta__value--empty" : "",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        {children}
      </span>
    </div>
  );
}

/** The header + metadata strip + format branch for one document. */
export function DocumentView({ doc, id }: { doc: KbDocument; id: number }) {
  // The document's own absolute URL — what a relative link in the body resolves
  // against (§5). `canonical_path` is the durable public path when the owning org
  // has claimed a slug; the id URL is the permanent fallback.
  const baseUrl = `${SITE.url}${doc.canonical_path ?? `/documents/${id}`}`;

  return (
    <>
      {/* §4.1's header block — mono eyebrow (project) · Fraunces title · date sub. */}
      <div className="kb-dochead">
        <div className="kb-app-eyebrow">{DOCUMENTS.read.eyebrow(doc.project)}</div>
        <h1 className="kb-app-title">{doc.title}</h1>
        <p className="kb-app-sub">{doc.date}</p>
      </div>

      {/* §4.2 — the metadata strip. Source moves AHEAD of Tags so the three short
          fields share the first row and the tag list always starts a row of its
          own. */}
      <div className="kb-docmeta">
        <Meta label={DOCUMENTS.read.fields.project}>{doc.project}</Meta>
        <Meta label={DOCUMENTS.read.fields.date} mono>
          {doc.date}
        </Meta>
        <Meta
          label={DOCUMENTS.read.fields.source}
          mono
          empty={doc.source_repo == null}
        >
          {doc.source_repo ?? DOCUMENTS.read.noSource}
        </Meta>
        <Meta
          label={DOCUMENTS.read.fields.tags}
          tags
          empty={doc.tags.length === 0}
        >
          {doc.tags.length === 0
            ? DOCUMENTS.list.noTags
            : doc.tags.map((tag) => (
                <span key={tag} className="kb-chip">
                  {tag}
                </span>
              ))}
        </Meta>
      </div>

      {/* The body. HTML explainers (P16) render interactive in a sandboxed
          opaque-origin iframe — `sandbox="allow-scripts"` and, crucially, NEVER
          `allow-same-origin` (nor allow-forms/popups/top-navigation/modals): the
          framed doc gets an opaque origin, so its untrusted quiz JS runs but cannot
          read cookies/storage, reach the parent app, or call the API as the user
          (phase P16 pinned decision 1). The `src` is the same-origin BFF relay.

          <ExplainerFrame> is the page's one client island: because the frame is
          opaque-origin, its height can only travel outward over postMessage, so the
          relay injects a reporter into the document and the island sizes the frame to
          it. The frame therefore grows to its content and the PAGE scrolls, instead of
          the old fixed-height frame scrolling inside a scrolling page. The sandbox
          attribute is unchanged — the containment contract is untouched.

          Markdown docs render XSS-safe via <MarkdownBody> (react-markdown, no
          rehype-raw) exactly as before. */}
      {doc.format === "html" ? (
        <ExplainerFrame src={`/api/documents/${id}/raw`} title={doc.title} />
      ) : (
        <div className="kb-panel kb-doc__body">
          {/* §5 — the empty-body line is `.kb-prose__empty` INSIDE `.kb-prose`, not
              beside it: it is a state of the reading column, so it sits on the same
              text track the body would have used. */}
          {doc.markdown.trim() === "" ? (
            <div className="kb-prose">
              <p className="kb-prose__empty">{DOCUMENTS.read.emptyBody}</p>
            </div>
          ) : (
            <MarkdownBody markdown={doc.markdown} baseUrl={baseUrl} />
          )}
        </div>
      )}
    </>
  );
}
