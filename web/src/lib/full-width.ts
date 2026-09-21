/**
 * The chrome-less document view's URL contract (round 06 §4.4, P28.S7).
 *
 * The view is a QUERY ON THE DOCUMENT'S OWN URL — `?view=full` — and not a route
 * of its own. That is the whole security posture in one sentence: an HTML explainer
 * in the full-width view is the same page framing the same sandboxed opaque-origin
 * relay it already framed, so no new route serves document HTML on the app origin
 * and `next.config.ts` needs no new entry. It also makes the view linkable and makes
 * browser back its primary exit at every width.
 *
 * A plain module, deliberately: the three `page.tsx` read the flag on the SERVER and
 * `full-width-exit.tsx` is a CLIENT island, and a `"use client"` module's exports
 * become client references that a server component cannot call. Nothing here imports
 * anything, so both sides can share one definition.
 */

/** The query key, and the one value that means "chrome off". */
export const VIEW_PARAM = "view";
export const FULL_VIEW = "full";

/**
 * The attribute the "Full width" control carries on all three document surfaces.
 * Leaving the view hands focus back to it (§6), and the exit pill finds it by this.
 */
export const FULL_WIDTH_LINK_ATTR = "data-kb-fullwidth-link";

/** Next's already-parsed `searchParams`, as a page receives them. */
type SearchParams = Record<string, string | string[] | undefined>;

/**
 * Is this request asking for the chrome-less view? A repeated `?view=full&view=x`
 * arrives as an array; any occurrence of the literal value counts, and everything
 * else (including `?view=` and `?view=FULL`) is an ordinary read.
 */
export function isFullWidth(params: SearchParams | undefined): boolean {
  const raw = params?.[VIEW_PARAM];
  if (Array.isArray(raw)) return raw.includes(FULL_VIEW);
  return raw === FULL_VIEW;
}

/** The document's own path, with the view asked for. */
export function fullWidthHref(path: string): string {
  return `${path}?${VIEW_PARAM}=${FULL_VIEW}`;
}
