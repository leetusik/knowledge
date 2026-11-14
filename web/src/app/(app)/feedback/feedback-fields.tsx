import { FEEDBACK } from "@/content";

// The two renderings the Feedback list and its detail page agree on. Colocated in
// the route folder (only page/route/layout files become routes).

/**
 * `"2026-07-16T09:31:02Z"` → `"Jul 16, 2026, 09:31"`; unparseable → as-is.
 * Pinned to UTC (and labelled so on the page): these render on the server, so an
 * unpinned zone would print the server's clock as if it were the reader's.
 */
export function formatUtc(iso: string): string {
  const at = new Date(iso);
  if (Number.isNaN(at.getTime())) return iso;
  return at.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "UTC",
  });
}

/** A UTC timestamp with the machine-readable ISO kept in `dateTime`. */
export function Timestamp({ iso }: { iso: string }) {
  return <time dateTime={iso}>{formatUtc(iso)}</time>;
}

/**
 * One free-form JSON blob (trigger or source metadata, attributes, messages, used
 * context) as indented text, or `null` when it is absent or empty (`null`, `{}`,
 * `[]`): the detail page hides those, as the original page did. The caller renders
 * the result as a text child, never as markup: the values are untrusted.
 */
export function rawJson(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const empty = Array.isArray(value)
    ? value.length === 0
    : typeof value === "object" && Object.keys(value).length === 0;
  if (empty) return null;
  return JSON.stringify(value, null, 2);
}

/**
 * The rating as PLAIN TEXT: `1` liked, `2` disliked, `null` unrated (the common
 * case). The kit's `Badge` carries only the key states, so the rating is a word.
 */
export function ratingLabel(value: 1 | 2 | null): string {
  if (value === 1) return FEEDBACK.list.valueLiked;
  if (value === 2) return FEEDBACK.list.valueDisliked;
  return FEEDBACK.list.valueUnrated;
}
