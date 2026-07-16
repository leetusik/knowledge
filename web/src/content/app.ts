// Authenticated app-shell copy + nav (P12.S2). The shell is the light "workspace"
// console chrome S3–S6 render inside; this is the single source for its labels and
// rail links.

export interface AppNavItem {
  label: string;
  href: string;
  /**
   * True when the destination route does not exist yet — rendered as a muted,
   * non-interactive rail item with a "Soon" tag instead of a link that 404s. The
   * slice that ships the route drops this flag.
   */
  soon?: boolean;
}

/**
 * Rail navigation — the shell shows the full intended surface set from the start.
 * `/dashboard` is live in S2 (the tenant dashboard fills in at S3). Documents (S5)
 * and Graph (S6) are announced as `soon` so the rail reads as complete without ever
 * linking to a route that 404s; the slice that ships each surface drops its flag.
 * Project detail (`/projects/[id]`, S4) is deliberately NOT here — a project is
 * reached from the dashboard's project list; the rail carries only top-level
 * surfaces.
 */
export const APP_NAV: AppNavItem[] = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Documents", href: "/documents", soon: true },
  { label: "Graph", href: "/graph", soon: true },
];

export const APP_SHELL = {
  /** Accessible name for the rail's <nav> landmark. */
  navLabel: "Primary",
  /** Mono-uppercase eyebrow heading over the rail's nav section. */
  railHeading: "Workspace",
  /** Prefix before the tenant name in the topbar identity. */
  workspaceLabel: "Workspace",
  soonTag: "Soon",
  logoutLabel: "Sign out",
  logoutPendingLabel: "Signing out…",
  /** Fallback when a user somehow has no tenant (signup always provisions one). */
  noTenant: "—",
} as const;
