// Public-surface + share-link copy (P19) — the anonymous PublicShell chrome and the
// copy-link affordance shared by the doc read view and the member graph header.
// Copy-as-data per the S1 convention: no page hardcodes these strings inline.

/**
 * The anonymous `PublicShell` chrome (composed 1:1 from the authenticated app-shell's
 * topbar pieces — brand block + a single "Sign in" action, no rail/crumb/user).
 */
export const PUBLIC_SHELL = {
  /** The topbar sign-in action → `/login`. */
  signIn: "Sign in",
  /** Accessible name for the skip-to-content target (mirrors the app shell's main). */
  mainLabel: "Main content",
} as const;

/**
 * The copy-link island's three-state label. The button copies an absolute URL built
 * client-side from `window.location.origin` + a path, so the same island serves the
 * doc read view (`/documents/{id}`) and the member graph header (`/graph/{org}`).
 */
export const SHARE = {
  copyLabel: "Copy link",
  copiedLabel: "Link copied",
  /** Clipboard denied (insecure origin / permissions) — the URL is still selectable. */
  failedLabel: "Copy failed",
} as const;

export type PublicShellCopy = typeof PUBLIC_SHELL;
export type ShareCopy = typeof SHARE;
