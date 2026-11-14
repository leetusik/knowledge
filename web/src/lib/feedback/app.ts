import "server-only";

import { getJson, getRaw } from "@/lib/knowledge/client";

import { feedbackQueryString } from "./query";
import type { FeedbackDetail, FeedbackPage, FeedbackQuery } from "./types";

// The Feedback module's session-scoped reads (`/app/feedback*`), on the same
// client seam as `@/lib/knowledge/app`: the caller passes the session bearer, the
// client adds the active org, and every call is `no-store`.

/**
 * `GET /app/feedback` → `{records, next_cursor?}`: the active org's feedback,
 * newest first, keyset-paged. `next_cursor`'s ABSENCE means the list is
 * exhausted, so the spread keeps a missing key missing instead of materializing
 * `next_cursor: undefined`.
 */
export async function listFeedback(
  token: string,
  query: FeedbackQuery = {},
  signal?: AbortSignal,
): Promise<FeedbackPage> {
  const page = await getJson<FeedbackPage>(
    `/app/feedback${feedbackQueryString(query)}`,
    { token, signal },
  );
  return { ...page, records: page.records ?? [] };
}

/** The `GET /app/feedback/{id}` envelope: the record is wrapped, unlike the list. */
interface RawFeedbackDetailResponse {
  record: FeedbackDetail;
}

/**
 * `GET /app/feedback/{id}` → `{record}`, unwrapped. 400 (not a UUID) and 404
 * (missing, or another org's) are thrown as `ApiError`; the page maps both to
 * its not-found.
 */
export async function getFeedbackDetail(
  token: string,
  feedbackId: string,
  signal?: AbortSignal,
): Promise<FeedbackDetail> {
  const raw = await getJson<RawFeedbackDetailResponse>(
    `/app/feedback/${encodeURIComponent(feedbackId)}`,
    { token, signal },
  );
  return raw.record;
}

/**
 * `GET /app/feedback/{id}/attachments/{aid}` → the raw bytes, body unread, for
 * the relay route to stream. Throws `ApiError` on a non-2xx.
 */
export async function getFeedbackAttachment(
  token: string,
  feedbackId: string,
  attachmentId: string,
): Promise<Response> {
  return getRaw(
    `/app/feedback/${encodeURIComponent(feedbackId)}/attachments/${encodeURIComponent(attachmentId)}`,
    { token },
  );
}
