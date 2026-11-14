import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";

import {
  appButtonClass,
  DataTable,
  type DataTableColumn,
} from "@/components/ui";
import { FEEDBACK } from "@/content";
import { requireIdentity } from "@/lib/auth-guards";
import { getFeedbackDetail } from "@/lib/feedback/app";
import type {
  FeedbackAttachment,
  FeedbackComment,
  FeedbackDetail,
} from "@/lib/feedback/types";
import { listProjects } from "@/lib/knowledge/app";
import { ApiError } from "@/lib/knowledge/client";
import type { KbProject } from "@/lib/knowledge/types";

import { formatUtc, ratingLabel, rawJson, Timestamp } from "../feedback-fields";
import "../feedback.css";

// One feedback record in full, reached from the list's message link. Laid out as
// the Feedback app's detail was (the message, its comment, the details with tags,
// the operator comments, the attachments), drawn in the console kit. READ-ONLY: no
// form and no server action.
//
// EVERY string below is caller-supplied, untrusted text, rendered as a text child
// (React escapes it); nothing goes into an `href` but the record's and the
// attachment's own ids, which the API issued. Attachment bytes download through
// the web app's relay, never inline.
//
// The record's free-form JSON (trigger and source metadata, attributes, messages,
// used context) closes the details strip: one full-width mono field per blob,
// always open, indented text (`rawJson`), and only when non-empty.
export const metadata: Metadata = { title: FEEDBACK.detail.title };

/**
 * Fetch the record and the project list (the record carries only `project_id`),
 * mapping 404 (missing or another org's: 404-never-403) and 400 (not a UUID) to
 * the not-found page. A 401 never reaches here; everything else rethrows.
 * `notFound()` throws, so it stays out of the `try`.
 */
async function loadFeedback(
  token: string,
  feedbackId: string,
): Promise<[FeedbackDetail, KbProject[]]> {
  try {
    return await Promise.all([
      getFeedbackDetail(token, feedbackId),
      listProjects(token),
    ]);
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
 * One `.kb-docmeta` label/value pair (the document view's metadata strip). A
 * `null` or `undefined` value renders as the empty dash.
 */
function Field({
  label,
  children,
  mono,
  wide,
  tags,
}: {
  label: string;
  children?: ReactNode;
  mono?: boolean;
  /** A long-form value: the field spans the whole grid row. */
  wide?: boolean;
  /** The tag list: the strip's full-width tags field. */
  tags?: boolean;
}) {
  const empty = children === null || children === undefined;
  return (
    <div
      className={[
        "kb-docmeta__field",
        tags ? "kb-docmeta__field--tags" : "",
        wide ? "fb-wide" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <span className="kb-docmeta__label">{label}</span>
      <span
        className={[
          "kb-docmeta__value",
          mono && !empty ? "kb-docmeta__value--mono" : "",
          empty ? "kb-docmeta__value--empty" : "",
          wide ? "fb-text" : "",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        {empty ? FEEDBACK.detail.fieldEmpty : children}
      </span>
    </div>
  );
}

/** `1536` → `"1.5 KB"`: binary units, as the stored byte count is. */
function formatBytes(bytes: number): string {
  const units = FEEDBACK.attachments.byteUnits;
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${unit === 0 ? value : value.toFixed(1)} ${units[unit]}`;
}

const commentColumns: DataTableColumn<FeedbackComment>[] = [
  {
    key: "author",
    header: FEEDBACK.detail.commentsColumns.author,
    cell: (comment) =>
      comment.author ?? FEEDBACK.detail.commentAuthorUnknown,
  },
  {
    key: "when",
    header: FEEDBACK.detail.commentsColumns.when,
    className: "mono",
    cell: (comment) => <Timestamp iso={comment.created_at} />,
  },
  {
    key: "body",
    header: FEEDBACK.detail.commentsColumns.body,
    cell: (comment) => <span className="fb-text">{comment.body}</span>,
  },
];

function attachmentColumns(
  feedbackId: string,
): DataTableColumn<FeedbackAttachment>[] {
  return [
    {
      key: "name",
      header: FEEDBACK.attachments.columns.name,
      cell: (attachment) => (
        <span className="kb-dtable__name">
          {attachment.filename ?? FEEDBACK.attachments.unnamed}
        </span>
      ),
    },
    {
      key: "type",
      header: FEEDBACK.attachments.columns.type,
      className: "mono",
      cell: (attachment) => attachment.content_type,
    },
    {
      key: "size",
      header: FEEDBACK.attachments.columns.size,
      className: "mono",
      cell: (attachment) => formatBytes(attachment.byte_size),
    },
    {
      key: "action",
      header: (
        <span className="sr-only">{FEEDBACK.attachments.columns.actions}</span>
      ),
      actions: true,
      // The web app's relay, not `attachment.url`: that path needs the session
      // bearer, which only the server holds. The relay forces a download; the
      // filename is applied here, browser-side, so the relay never needs it.
      cell: (attachment) => (
        <a
          href={`/api/app/feedback/${feedbackId}/attachments/${attachment.id}`}
          download={attachment.filename ?? undefined}
          className={appButtonClass("secondary", "sm")}
        >
          {FEEDBACK.attachments.downloadLabel}
        </a>
      ),
    },
  ];
}

export default async function FeedbackDetailPage({
  params,
}: {
  params: Promise<{ feedbackId: string }>;
}) {
  const { feedbackId } = await params;
  const { token, identity } = await requireIdentity();
  const tenantName = identity.tenant?.name ?? "—";
  const [record, projects] = await loadFeedback(token, feedbackId);

  const projectName =
    (record.project_id &&
      projects.find((p) => p.id === record.project_id)?.name) ||
    null;
  const rating = ratingLabel(record.feedback_value);
  // In the original page's order; empty blobs drop out.
  const rawEntries: [string, string | null][] = [
    [FEEDBACK.detail.raw.triggerMetadata, rawJson(record.trigger_metadata)],
    [FEEDBACK.detail.raw.sourceMetadata, rawJson(record.source_metadata)],
    [FEEDBACK.detail.raw.attributes, rawJson(record.attributes)],
    [FEEDBACK.detail.raw.messages, rawJson(record.messages)],
    [FEEDBACK.detail.raw.usedContext, rawJson(record.used_context)],
  ];
  const rawFields = rawEntries.filter(
    (entry): entry is [string, string] => entry[1] !== null,
  );

  return (
    <div className="kb-page-flow">
      <div className="kb-pageframe">
        <div className="kb-pageframe__title-wrap">
          <div className="kb-app-eyebrow">
            {tenantName} · {FEEDBACK.eyebrow}
          </div>
          <h1 className="kb-app-title">{FEEDBACK.detail.messageHeading}</h1>
          <p className="kb-app-sub">{rating}</p>
        </div>
        <div className="kb-pageframe__actions">
          <Link href="/feedback" className={appButtonClass("ghost", "sm")}>
            {FEEDBACK.detail.backLabel}
          </Link>
        </div>
      </div>

      {/* The end user's own words, line breaks kept. */}
      <section className="kb-panel" aria-label={FEEDBACK.detail.messageHeading}>
        <p className="fb-text">{record.message}</p>
      </section>

      <section className="kb-panel" aria-labelledby="feedback-comment">
        <div className="kb-panel__head">
          <h2 id="feedback-comment" className="kb-app-h2">
            {FEEDBACK.detail.commentHeading}
          </h2>
        </div>
        {record.comment === null ? (
          <p className="kb-panel__lead">{FEEDBACK.detail.commentNone}</p>
        ) : (
          <p className="fb-text">{record.comment}</p>
        )}
      </section>

      <section className="kb-panel" aria-labelledby="feedback-details">
        <div className="kb-panel__head">
          <h2 id="feedback-details" className="kb-app-h2">
            {FEEDBACK.detail.detailsHeading}
          </h2>
          <span className="kb-panel__caption">{FEEDBACK.list.timeNote}</span>
        </div>
        <div className="kb-docmeta">
          <Field label={FEEDBACK.detail.fields.project}>{projectName}</Field>
          <Field label={FEEDBACK.detail.fields.value}>{rating}</Field>
          <Field label={FEEDBACK.detail.fields.sourceProduct} mono>
            {record.source_product}
          </Field>
          <Field label={FEEDBACK.detail.fields.sourceIntegration} mono>
            {record.source_integration}
          </Field>
          <Field label={FEEDBACK.detail.fields.channel}>{record.channel}</Field>
          {/* WHO recorded it; the trigger below is WHY. */}
          <Field label={FEEDBACK.detail.fields.recordedBy}>
            {record.recorded_by}
          </Field>
          <Field label={FEEDBACK.detail.fields.triggerType}>
            {record.trigger_type}
          </Field>
          <Field label={FEEDBACK.detail.fields.targetType}>
            {record.target_type}
          </Field>
          <Field label={FEEDBACK.detail.fields.targetRole}>
            {record.target_role}
          </Field>
          <Field label={FEEDBACK.detail.fields.conversationId} mono>
            {record.conversation_id}
          </Field>
          <Field label={FEEDBACK.detail.fields.sessionId} mono>
            {record.session_id}
          </Field>
          <Field label={FEEDBACK.detail.fields.userId} mono>
            {record.user_id}
          </Field>
          {/* When it HAPPENED (caller-reported) vs when it was stored. */}
          <Field label={FEEDBACK.detail.fields.eventAt} mono>
            {record.event_at === null ? null : formatUtc(record.event_at)}
          </Field>
          <Field label={FEEDBACK.detail.fields.ingestedAt} mono>
            {formatUtc(record.ingested_at)}
          </Field>
          <Field label={FEEDBACK.detail.fields.id} mono>
            {record.id}
          </Field>
          {record.trigger_message !== null ? (
            <Field label={FEEDBACK.detail.fields.triggerMessage} wide>
              {record.trigger_message}
            </Field>
          ) : null}
          {record.target_text !== null ? (
            <Field label={FEEDBACK.detail.fields.targetText} wide>
              {record.target_text}
            </Field>
          ) : null}
          <Field label={FEEDBACK.detail.tagsHeading} tags>
            {record.tags.length === 0 ? null : (
              <span className="kb-taglist">
                {record.tags.map((tag, i) => (
                  // Tags are a list and are not de-duplicated: the index keys a repeat.
                  <span key={`${tag}-${i}`} className="kb-chip">
                    {tag}
                  </span>
                ))}
              </span>
            )}
          </Field>
          {rawFields.map(([label, json]) => (
            <Field key={label} label={label} mono wide>
              {json}
            </Field>
          ))}
        </div>
      </section>

      <section className="kb-panel" aria-labelledby="feedback-comments">
        <div className="kb-panel__head">
          <h2 id="feedback-comments" className="kb-app-h2">
            {FEEDBACK.detail.commentsHeading}
          </h2>
        </div>
        <DataTable
          columns={commentColumns}
          rows={record.comments}
          rowKey={(comment) => comment.id}
          empty={FEEDBACK.detail.commentsNone}
        />
      </section>

      <section className="kb-panel" aria-labelledby="feedback-attachments">
        <div className="kb-panel__head">
          <h2 id="feedback-attachments" className="kb-app-h2">
            {FEEDBACK.attachments.heading}
          </h2>
          {record.attachments.length > 0 ? (
            <span className="kb-panel__caption">
              {FEEDBACK.attachments.downloadNote}
            </span>
          ) : null}
        </div>
        <DataTable
          columns={attachmentColumns(record.id)}
          rows={record.attachments}
          rowKey={(attachment) => attachment.id}
          empty={FEEDBACK.attachments.none}
        />
      </section>
    </div>
  );
}
