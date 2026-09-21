// Cross-surface SYSTEM-STATE copy (P28.S3 — round 03 §5): the editorial page
// failure, the in-frame section failure, and the loading skeleton. It is its own
// flat module rather than a block inside `documents.ts` / `project.ts` because
// none of these strings belong to one surface — `app/error.tsx` and
// `(app)/error.tsx` catch throws from every console page at once.
//
// Deliberately NOT folded into the existing `*_ERRORS` dictionaries: those are
// status-keyed INLINE FORM errors ("Please try again." lives in several of them),
// and a page-failure block reading like a field error would be a duplication the
// reader has to disambiguate.
//
// Provenance of every string below, because round 03's §5 ships copy placeholders
// (`{one sentence, Fraunces}`) and the cards themselves live only in the Claude
// Design project P28 cannot reach (see phase.md `## Decisions`):
//   - `notFoundCode` / `errorCode` — the record's own literal `Not found · 404`
//     and its parallel for the 500.
//   - `error.title` — VERBATIM specimen copy, quoted in P27's notebook.
//   - `error.sub` — ORIGINATED here (routed to the operator at the phase review).
//   - `error.retryLabel` / `error.homeLabel` — §5.1 names both buttons literally.
//   - `loading.label` — an accessibility-floor string (§7), not visual copy: the
//     busy region needs an accessible name and `aria-busy` alone gives it none.
//
// The 404 editorials reuse each surface's EXISTING `notFound {title, sub,
// backLabel}` (documents / project / graph), so nothing is re-authored here and
// no key is renamed — six pages and three exported copy types depend on them.

export const STATES = {
  /**
   * The mono `.kb-editorial__code` eyebrow. §5.1 draws `Not found · 404`
   * literally; the 500 line is its parallel.
   */
  notFoundCode: "Not found · 404",

  /**
   * The whole-page 500 (`app/error.tsx` and `(app)/error.tsx`) — the one state in
   * §5 whose copy did not already exist somewhere in `@/content`.
   */
  error: {
    code: "Error · 500",
    title: "Something on our side stopped reading.",
    sub: "The page did not finish loading. Try again — and if it keeps failing, the reference below tells us where it stopped.",
    /** §5.1: "500 → primary is **Try again**, ghost is **Back to dashboard**". */
    retryLabel: "Try again",
    homeLabel: "Back to dashboard",
    /**
     * The `.kb-editorial__detail` line, rendered ONLY when Next gives the boundary
     * a `digest` — in dev there is none, and `ref ·` with nothing after it is a
     * worse artefact than no line at all.
     */
    refPrefix: "ref",
  },

  /** §5.4 — the skeleton region's accessible name; the blocks themselves are decorative. */
  loading: {
    label: "Loading…",
  },
} as const;

export type StatesCopy = typeof STATES;
