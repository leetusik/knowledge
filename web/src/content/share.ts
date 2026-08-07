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
  /**
   * P25.F3 — the unclaimed-slug hint shown BESIDE a copy affordance when the
   * signed-in viewer's own org has not claimed a slug yet (`tenant.slug === null`),
   * so the button is correctly handing out the id/UUID fallback. Without it the
   * fallback is silent and reads as "the pretty-URL feature is broken".
   *
   * Split into three parts because the middle one is an inline `<Link>` to the
   * dashboard's Public URL panel — the page composes them, but every character stays
   * here per the copy-as-data convention. ONE short sentence, deliberately: this is a
   * minor affordance, not a callout. Shown only on MEMBER branches (an anonymous
   * visitor cannot claim anything and already has the URL in the address bar), and
   * never when a slug IS claimed — a `null` `canonical_path` then means the document
   * is a superseded duplicate (P25.F1), whose id URL is correct and permanent.
   */
  claimHint: {
    prefix: "This link uses an id until you ",
    linkLabel: "claim a public URL name",
    suffix: ".",
    /** The dashboard's Public URL panel is where a slug is claimed. */
    href: "/dashboard",
  },
} as const;

export type PublicShellCopy = typeof PUBLIC_SHELL;
export type ShareCopy = typeof SHARE;
