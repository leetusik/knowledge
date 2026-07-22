// Barrel for the public-landing content module (P14.S2). Section components pull
// typed copy + link targets from "@/content/marketing" — never hardcode copy or
// URLs inline (mirrors the app's @/content pattern).
export { LINKS, MKT_SECTION_IDS } from "./links";
export type { MktSectionId } from "./links";

export {
  HEADER,
  HERO,
  VALUE,
  HOW,
  FEATURE_SAVE,
  FEATURE_CONNECT,
  AGENT_QUICKSTART,
  FEATURE_SKILL,
  FEATURE_GRAPH,
  PRICING,
  FINAL_CTA,
  FOOTER,
  ZSHENV_COMMENT,
  ZSHENV_EXPORT_BASE,
  ZSHENV_TOKEN_VALUE,
  ZSHENV_COPY,
  HEALTH_CHECK_CURL,
} from "./content";
export type {
  MktCta,
  MktNavLink,
  ValueCard,
  HowStep,
  PriceTier,
  SearchResult,
} from "./content";

export { HERO_TERMINAL, CONNECT_TERMINAL } from "./terminals";
export type { Terminal, TermLine, TermSeg, TermTone } from "./terminals";

export { GRAPH_MOTIF } from "./graph-motif";
export type {
  GraphMotif,
  MotifNode,
  MotifEdge,
  MotifInk,
  MotifNodeType,
} from "./graph-motif";
