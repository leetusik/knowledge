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
 * `/dashboard` is live in S2 (the tenant dashboard fills in at S3); Documents went
 * live in S5; Graph went live in S6. Project detail (`/projects/[id]`, S4) is
 * deliberately NOT here — a project is reached from the dashboard's project list;
 * the rail carries only top-level surfaces.
 */
export const APP_NAV: AppNavItem[] = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Documents", href: "/documents" },
  { label: "Graph", href: "/graph" },
];

/**
 * P30.S22 (`06-library` §1) — the shell's two groups: Reading (Library, Review) above the
 * Org items. The Review count (`counts.due`) rides on the item flagged `count`. Review is
 * S24's route; until it ships the link is a real `<a href>` to a not-found page.
 */
export interface AppNavGroup {
  /** The rail's eyebrow; the strip and the bar show the groups as one row. */
  heading: string;
  items: (AppNavItem & { count?: boolean })[];
}

export const APP_NAV_GROUPS: AppNavGroup[] = [
  {
    heading: "Reading",
    items: [
      { label: "Library", href: "/library" },
      { label: "Review", href: "/review", count: true },
    ],
  },
  { heading: "Org", items: APP_NAV },
];

/** The Review pill: `counts.due`, "99+" above 99, nothing at 0 (`06-library` §1). */
export function dueText(due: number): string {
  if (!(due > 0)) return "";
  return due > 99 ? "99+" : String(Math.floor(due));
}

export const APP_SHELL = {
  /**
   * Accessible name for the phone/tablet navbar's <nav> landmark (round 03 §4.1
   * and §4.3). Both navs are always in the DOM — only one is ever visible — so
   * they must carry DIFFERENT names; the rail uses `railNavLabel` below.
   */
  navLabel: "Primary",
  /** Accessible name for the rail's <nav> landmark (round 03 §4.1). */
  railNavLabel: "Sections",
  /** Accessible name for the phone topbar's account disclosure (round 03 §4.2). */
  accountMenuLabel: "Account menu",
  /** Mono-uppercase eyebrow heading over the rail's nav section. */
  railHeading: "Org",
  /** The rail's second eyebrow (P30.S22): the first group, above `railHeading`. */
  railReadingHeading: "Reading",
  /**
   * Prefix before the org (tenant) name in the topbar identity. Key name kept
   * (`workspaceLabel`) — code identifiers are not renamed in the P18 copy pass; only
   * the user-facing value moves Workspace → Org.
   */
  workspaceLabel: "Org",
  soonTag: "Soon",
  /**
   * The topbar rail-fold control. The accessible NAME is constant and the state rides
   * on `aria-expanded`; the two `*Title` strings are mouse-only tooltips (`aria-label`
   * wins the name computation, so `title` never reaches the accessibility tree).
   */
  railToggleLabel: "Navigation",
  railShowTitle: "Show navigation",
  railHideTitle: "Hide navigation",
  logoutLabel: "Sign out",
  logoutPendingLabel: "Signing out…",
  /** Fallback when a user somehow has no tenant (signup always provisions one). */
  noTenant: "—",
} as const;
