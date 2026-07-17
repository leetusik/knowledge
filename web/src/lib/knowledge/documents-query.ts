// P12.S5 — the documents list's `searchParams` round-trip + offset-pager math, as a
// PURE module (no `server-only`, no React) so the server page AND the Node vitest can
// both import it (the S4 `credential-status.ts` precedent). Ported from vocky's
// feedback page (`PARAM_KEYS` → `takeFirst` → `readActiveParams` (drop blanks) →
// `toQuery`), but ADAPTED to knowledge's OFFSET pagination (`{total, …, limit,
// offset}`) rather than vocky's opaque cursor.

import type { KbDocumentsQuery } from "./types";

/**
 * Every `/app/documents` + `/app/search` param, URL-reachable. The form surfaces
 * only `q` + `project`; `tag`/`limit`/`offset` stay reachable (read here, sent to
 * the backend, and preserved across a filter submit + pagination), so a hand-crafted
 * URL survives. `satisfies` ties this to the client query type — adding a param there
 * without adding it here is then a type error, not a silently ignored filter.
 */
export const PARAM_KEYS = [
  "q",
  "project",
  "tag",
  "limit",
  "offset",
] as const satisfies readonly (keyof KbDocumentsQuery)[];

export type ParamKey = (typeof PARAM_KEYS)[number];

/** The active filters as raw URL strings, keyed by the backend's param names. */
export type ActiveParams = Partial<Record<ParamKey, string>>;

/** The params the filter form renders as real inputs (the rest ride as hidden). */
export const FORM_FIELD_KEYS: readonly ParamKey[] = ["q", "project"];

/** Default page sizes — browse is roomier than search's ranked window. */
export const BROWSE_LIMIT = 50;
export const SEARCH_LIMIT = 10;

/**
 * Take the first value of a possibly-repeated param. A query string may legally
 * repeat a key (`?q=a&q=b`), so Next hands a `string[]` for it; FastAPI's
 * `Query(...)` takes the FIRST occurrence, so taking the first here keeps the URL,
 * the form, and the filter the backend applies in agreement.
 */
export function takeFirst(
  value: string | string[] | undefined,
): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/**
 * The active (non-blank) filters from the URL.
 *
 * BLANK IS ABSENT — load-bearing, not tidying: a GET form necessarily submits its
 * empty fields, so an unfiltered submit puts `?q=&project=` in the URL, and the
 * backend 422s a blank `project` (`UUID("")`). Dropping blanks here is what makes the
 * empty form mean "no filter". Values are trimmed to match the backend's own
 * normalization.
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
 * URL strings → the typed client query. `limit`/`offset` are NARROWED to numbers,
 * not validated (the backend owns the bounds `limit ∈ 1–200` and answers 422); a
 * non-numeric value is dropped so it cannot poison the query. `q`/`project`/`tag`
 * pass through as strings.
 */
export function toQuery(active: ActiveParams): KbDocumentsQuery {
  const { limit, offset, ...text } = active;
  return {
    ...text,
    ...numeric("limit", limit),
    ...numeric("offset", offset),
  };
}

/** A `{key: n}` fragment when `raw` parses to a finite ≥0 integer, else `{}`. */
function numeric(key: "limit" | "offset", raw: string | undefined) {
  if (raw === undefined) return {};
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) return {};
  return { [key]: Math.floor(n) };
}

/** The effective page size for the active params (search vs. browse default). */
export function activeLimit(active: ActiveParams): number {
  const parsed = Number(active.limit);
  if (Number.isFinite(parsed) && parsed >= 1) return Math.floor(parsed);
  return active.q ? SEARCH_LIMIT : BROWSE_LIMIT;
}

/** The effective offset for the active params (0 when absent/invalid). */
export function activeOffset(active: ActiveParams): number {
  const parsed = Number(active.offset);
  if (Number.isFinite(parsed) && parsed >= 0) return Math.floor(parsed);
  return 0;
}

/**
 * The prev/next OFFSETS for an offset-paged result, each clamped to `[0, total)` and
 * `null` when there is no such page. Prev steps back one `limit` (never below 0);
 * next steps forward one `limit` only while `offset + limit < total`.
 */
export function pagerOffsets(
  offset: number,
  limit: number,
  total: number,
): { prev: number | null; next: number | null } {
  const prev = offset > 0 ? Math.max(0, offset - limit) : null;
  const next = offset + limit < total ? offset + limit : null;
  return { prev, next };
}

/**
 * A `/documents` href with the active filters preserved and `offset` overridden
 * (omitted when 0, the default). `URLSearchParams` does the escaping; the other
 * active params ride along so paging never widens the filter scope.
 */
export function documentsHref(active: ActiveParams, offset: number): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(active)) {
    if (key === "offset") continue;
    search.set(key, value);
  }
  if (offset > 0) search.set("offset", String(offset));
  const qs = search.toString();
  return qs === "" ? "/documents" : `/documents?${qs}`;
}
