// Barrel for the typed @/content module. Consumers import structured content +
// types from "@/content" — never hardcode copy or anchor ids inline. S1 exports
// only the design-system-preview symbols; the auth / app-shell / dashboard /
// project / documents copy modules land with their slices (P12.S2–S5).
export { SECTION_IDS } from "./section-ids";
export type { SectionId } from "./section-ids";

export { BRAND, SITE } from "./site";
export { NAV_LINKS, SKIP_TO_CONTENT } from "./nav";

export type { Cta, NavLink, SiteMeta } from "./types";

// Auth surface (P12.S2) — public login/signup copy + the status-keyed errors.
export { AUTH_ERRORS, AUTH_TRUST_ITEMS, LOGIN_PAGE, SIGNUP_PAGE } from "./auth";
export type { AuthPageCopy } from "./auth";

// Authenticated app shell (P12.S2) — chrome labels + rail nav.
export { APP_NAV, APP_SHELL } from "./app";
export type { AppNavItem } from "./app";

// Tenant dashboard (P12.S3) — usage tiles / trend / projects / activity + create.
export { CREATE_PROJECT_ERRORS, DASHBOARD } from "./dashboard";
export type {
  ActivityEmphasis,
  ActivityTemplate,
  DashboardCopy,
} from "./dashboard";
