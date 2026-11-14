// The Feedback list's `searchParams` round-trip, as a PURE module (no
// `server-only`, no React) so the server page and the Node tests both import it,
// like `@/lib/knowledge/documents-query`.
//
// The page URL names the project filter `project` (as `/documents?project=` does)
// and the API names it `project_id`; every other param keeps the API's name.

import type { FeedbackQuery } from "./types";

/**
 * Every URL param the page reads, in the API's order, with `project` standing for
 * `project_id`. The form renders `q`, `project` and `feedback_value`; the rest stay
 * URL-reachable and ride along on a submit and on the next-page link. A param not
 * listed here is never read, so it never reaches the API.
 */
export const PARAM_KEYS = [
  "q",
  "project",
  "start_ingested_at",
  "end_ingested_at",
  "source_product",
  "source_integration",
  "recorded_by",
  "conversation_id",
  "session_id",
  "user_id",
  "feedback_value",
  "channel",
  "target_type",
  "trigger_type",
  "tag",
  "limit",
  "cursor",
] as const;

export type ParamKey = (typeof PARAM_KEYS)[number];

/** The active (non-blank) filters as raw URL strings, keyed by the URL's names. */
export type ActiveParams = Partial<Record<ParamKey, string>>;

/** The params the filter form renders as real inputs (the rest ride as hidden). */
export const FORM_FIELD_KEYS: readonly ParamKey[] = [
  "q",
  "project",
  "feedback_value",
];

/** The first value of a possibly repeated param (the API reads the first too). */
export function takeFirst(
  value: string | string[] | undefined,
): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/**
 * The active filters from the URL. BLANK IS ABSENT: a GET form submits its empty
 * fields (`?q=&project=`), and the API answers 400 to a blank `project_id`,
 * `feedback_value`, `tag` or `cursor`. Values are trimmed.
 */
export function readActiveParams(
  raw: Record<string, string | string[] | undefined>,
): ActiveParams {
  const active: ActiveParams = {};
  for (const key of PARAM_KEYS) {
    const value = takeFirst(raw[key])?.trim();
    if (value) active[key] = value;
  }
  return active;
}

/**
 * URL strings → the typed API query: `project` becomes `project_id`; the
 * non-string params are narrowed, not validated (the API owns the rules and
 * answers 400, which the page turns into its not-found).
 */
export function toQuery(active: ActiveParams): FeedbackQuery {
  const {
    project,
    feedback_value,
    limit,
    target_type,
    trigger_type,
    recorded_by,
    ...text
  } = active;
  return {
    ...text,
    ...(project === undefined ? {} : { project_id: project }),
    ...(feedback_value === undefined
      ? {}
      : { feedback_value: Number(feedback_value) as 1 | 2 }),
    ...(limit === undefined ? {} : { limit: Number(limit) }),
    ...(target_type === undefined
      ? {}
      : { target_type: target_type as FeedbackQuery["target_type"] }),
    ...(trigger_type === undefined
      ? {}
      : { trigger_type: trigger_type as FeedbackQuery["trigger_type"] }),
    ...(recorded_by === undefined
      ? {}
      : { recorded_by: recorded_by as FeedbackQuery["recorded_by"] }),
  };
}

/**
 * The API query string: blanks omitted (never sent), values trimmed, no `?` when
 * empty. `URLSearchParams` does all the escaping; encoding on top of it would
 * double-encode (`결제` → `%25EA…`).
 */
export function feedbackQueryString(params: FeedbackQuery): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null) continue;
    const raw = typeof value === "string" ? value.trim() : String(value);
    if (raw === "") continue;
    search.set(key, raw);
  }
  const query = search.toString();
  return query === "" ? "" : `?${query}`;
}

/**
 * The next page's href: every active filter plus the new cursor (replacing the
 * old one). The cursor carries no filters, so dropping them would widen the list.
 */
export function nextPageHref(active: ActiveParams, cursor: string): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(active)) {
    if (key !== "cursor") search.set(key, value);
  }
  search.set("cursor", cursor);
  return `/feedback?${search.toString()}`;
}
