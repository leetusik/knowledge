// Barrel for the typed @/content module. Consumers import structured content +
// types from "@/content" — never hardcode copy or anchor ids inline. S1 exports
// only the design-system-preview symbols; the auth / app-shell / dashboard /
// project / documents copy modules land with their slices (P12.S2–S5).
export { SECTION_IDS } from "./section-ids";
export type { SectionId } from "./section-ids";

export { SITE } from "./site";
export { NAV_LINKS, SKIP_TO_CONTENT } from "./nav";

export type { Cta, NavLink, SiteMeta } from "./types";
