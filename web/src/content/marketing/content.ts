// Public landing copy (P14.S2), verbatim from
// web/design/rounds/01-landing/output/build-prompt.md §4 (the dated real-copy
// exception). Inline `code` spans keep their backticks — the RichText renderer
// splits on them. Where §4 gives a section's ticks/free-offer as phrases (not a
// single quoted string) the phrases are used verbatim; where §4 names a lede's
// topic but quotes no lede text (the two mid features), no lede was fabricated.
//
// P20.S3 — D10 resolved: the two mid-feature ledes (FEATURE_SAVE / FEATURE_CONNECT)
// are now carried verbatim from round-02 build-prompt.md §D10 (they were already the
// ledes on the shipped round-01 cards, just never quoted into content). Two new copy
// modules — AGENT_QUICKSTART and FEATURE_SKILL — plus the locked env-var snippet
// strings land the round-02 onboarding sections; every string is verbatim from
// web/design/rounds/02-onboarding/output/build-prompt.md §(a)/§(b)/§D10.
import { LINKS, MKT_SECTION_IDS } from "./links";
import type { MktSectionId } from "./links";

export interface MktCta {
  label: string;
  href: string;
  variant: "primary" | "secondary" | "secondaryOnDark";
}
export interface MktNavLink {
  label: string;
  href: string;
}
export interface ValueCard {
  index: string;
  kicker: string;
  title: string;
  body: string;
  chip: { label: string; coming?: boolean };
  cta: MktNavLink;
}
export interface HowStep {
  n: string;
  title: string;
  token: string;
  dimmed?: boolean;
  note?: string;
}
export interface PriceTier {
  name: string;
  featured?: boolean;
  chip: { label: string; coming?: boolean };
  price: string;
  blurb: string;
  ticks: string[];
  cta: MktCta;
}
export interface SearchResult {
  title: string;
  meta: string;
  /** Segments; `mark: true` renders the teal-soft `<mark>` highlight. */
  parts: { text: string; mark?: boolean }[];
}

export const HEADER = {
  wordmark: "knowledge",
  links: [
    { label: "What it is", href: `#${MKT_SECTION_IDS.whatItIs}` },
    { label: "How it works", href: `#${MKT_SECTION_IDS.howItWorks}` },
    { label: "Pricing", href: `#${MKT_SECTION_IDS.pricing}` },
    { label: "Guide", href: LINKS.guide },
  ] satisfies MktNavLink[],
  signIn: { label: "Sign in", href: LINKS.login } satisfies MktNavLink,
  getStarted: {
    label: "Get started",
    href: LINKS.signup,
    variant: "primary",
  } satisfies MktCta,
};

export const HERO = {
  id: MKT_SECTION_IDS.hero as MktSectionId,
  eyebrow: "FOR DEVELOPERS & THEIR CODING AGENTS",
  headline: "Knowledge that outlives the conversation.",
  lede: "A durable, searchable home for what you and your coding agents figure out — saved straight from the terminal, browsed as a living graph, and read like a book. Not a runbook.",
  ctas: [
    { label: "Get started — free", href: LINKS.signup, variant: "primary" },
    {
      label: "Connect Claude Code",
      href: LINKS.connectClaude,
      variant: "secondaryOnDark",
    },
  ] satisfies MktCta[],
  free: "The web app, hybrid search, the graph & the Claude Code connection — all free.",
};

export const VALUE = {
  id: MKT_SECTION_IDS.whatItIs as MktSectionId,
  eyebrow: "WHAT IT IS",
  title: "One knowledge base, three ways in.",
  lede: "Save durable, browsable, searchable knowledge — then reach it from wherever you work. A reading room on the web, a terminal for your agent, and an endpoint for anything else.",
  cards: [
    {
      index: "01",
      kicker: "WEB · The reading room",
      title: "",
      body: "An authenticated workspace: a `docs/`-style tree of explainers, hybrid keyword + semantic search, and an interactive knowledge graph. Read like a book — Recent, Browse, prev/next.",
      chip: { label: "Free" },
      cta: { label: "Open the app →", href: LINKS.appEntry },
    },
    {
      index: "02",
      kicker: "TERMINAL · Claude Code & the CLI",
      title: "",
      body: "Your coding agent writes knowledge with `/explain` as it works — and the `knowledge` CLI runs the whole lifecycle from the terminal. Sign up, connect, save and search. No website required.",
      chip: { label: "Free" },
      cta: { label: "Connect →", href: LINKS.guide },
    },
    {
      index: "03",
      kicker: "API · Agent retrieval",
      title: "",
      body: "A single endpoint to retrieve the right knowledge into any AI agent — the memory layer your workflows read from. Metered, and the one paid surface. Everything above stays free.",
      chip: { label: "Coming", coming: true },
      cta: { label: "Join the waitlist →", href: LINKS.waitlist },
    },
  ] satisfies ValueCard[],
};

export const HOW = {
  id: MKT_SECTION_IDS.howItWorks as MktSectionId,
  eyebrow: "HOW IT WORKS",
  title: "From a session to a second brain.",
  steps: [
    { n: "1", title: "Save", token: "knowledge save" },
    { n: "2", title: "Connect", token: "knowledge init" },
    { n: "3", title: "Browse", token: "knowledge.hi2vi.com" },
    {
      n: "4",
      title: "Retrieve",
      token: "GET /retrieve",
      dimmed: true,
      note: "Coming — the one paid surface",
    },
  ] satisfies HowStep[],
};

export const FEATURE_SAVE = {
  id: MKT_SECTION_IDS.save as MktSectionId,
  eyebrow: "SAVE & HYBRID SEARCH",
  title: "Everything they learn, in one durable place.",
  // D10 (P20.S3) — verbatim from round-02 build-prompt §D10.
  lede: "Each explainer is grounded in real code and tagged on the way in. Find it again with hybrid search — keyword and semantic, together — across a mixed English / Korean corpus.",
  ticks: [
    "Long-form explainers, read like a book",
    "Hybrid keyword + semantic search, Korean typeahead",
    "Browse newest-first, filter, read in-app",
  ],
  search: {
    query: "reverse proxy",
    keyHint: "/",
    results: [
      {
        title: "Reverse Proxy, Explained — 요청은 어디로 가는가",
        meta: "reverse-proxy · 3 tags",
        parts: [
          { text: "A " },
          { text: "reverse proxy", mark: true },
          { text: " sits in front of your services and decides where each request goes." },
        ],
      },
      {
        title: "Nginx location blocks",
        meta: "infra-notes · 2 tags",
        parts: [
          { text: "How the " },
          { text: "proxy", mark: true },
          { text: " matches a path to an upstream pool." },
        ],
      },
    ] satisfies SearchResult[],
  },
};

export const FEATURE_CONNECT = {
  id: MKT_SECTION_IDS.connect as MktSectionId,
  eyebrow: "CONNECT YOUR AGENT",
  title: "Onboarding built for agents, not forms.",
  // D10 (P20.S3) — verbatim from round-02 build-prompt §D10. `knowledge init` renders
  // as an inline code span (RichText splits on the backticks).
  lede: "A one-shot `knowledge init` runs the whole sequence — sign up, create a project, mint a key, write the config, verify — unattended. Your coding agent drives it; you never open the website.",
  ticks: [
    "Idempotent & non-interactive (no password flag)",
    "Every command has a `--json` / exit-code contract",
    "The two-token model — `vk_` outlives the session",
    "Bundled `knowledge guide`, offline",
  ],
  ctas: [
    { label: "Read the guide", href: LINKS.guide, variant: "primary" },
    {
      label: "Install the CLI",
      href: LINKS.installCli,
      variant: "secondaryOnDark",
    },
  ] satisfies MktCta[],
};

// ── Locked env-var snippets (P20.S3) — byte-exact from round-02 build-prompt §(a).
// The COPY payloads are what the clipboard receives; the ~/.zshenv DISPLAY (rendered
// in agent-quickstart.tsx) floats the comment onto its own hint line — the trailing-
// comment form clips at column width — while the copy stays the exact two locked
// lines. Byte-exactness of these strings is part of the design contract: do not
// reflow, re-space, or re-quote them (there are exactly 8 spaces before the comment).
export const ZSHENV_COMMENT =
  "# org-level key: Dashboard → Org API keys → New key";
export const ZSHENV_EXPORT_BASE =
  'export KB_API_BASE_URL="https://knowledge.hi2vi.com"';
export const ZSHENV_TOKEN_VALUE = '"vk_..."';
/** The clipboard payload for the ~/.zshenv block: the two locked export lines,
 *  including the trailing comment and its exact 8-space gap. */
export const ZSHENV_COPY =
  'export KB_API_BASE_URL="https://knowledge.hi2vi.com"\n' +
  'export KB_API_TOKEN="vk_..."        # org-level key: Dashboard → Org API keys → New key';
/** The health-check curl line — the whole line is both the display and the copy. */
export const HEALTH_CHECK_CURL =
  'curl -sS --max-time 5 -H "Authorization: Bearer $KB_API_TOKEN" "$KB_API_BASE_URL/api/documents?limit=1"';

// Agent quickstart — dark band continuing Connect (build-prompt §(a)). Copy left /
// setup column right. Every string verbatim from §(a); ticks carry inline `code`.
export const AGENT_QUICKSTART = {
  id: MKT_SECTION_IDS.agents as MktSectionId,
  eyebrow: "AGENT QUICKSTART · THE RECOMMENDED PATH",
  title: "Two exports, and every agent can save.",
  lede: "Set two environment variables once, and every coding agent on the machine — Claude Code, Codex, anything that can speak REST — saves into the same knowledge base. No plugin, no config file, nothing per-repo.",
  ticks: [
    "One org-level key serves every repo — each save's project is derived from the repo directory name (`default` outside one)",
    "Plain REST underneath: the two variables are the whole contract, fully usable by hand — the recommended path is a coding agent driving the skill below",
    "Codex only: its workspace-write sandbox blocks outbound network — set `[sandbox_workspace_write] network_access = true` in `~/.codex/config.toml`",
  ],
  cta: { label: "Mint an org key →", href: LINKS.mintOrgKey } satisfies MktNavLink,
  zshenvLabel: "~/.zshenv",
  trapKicker: "KNOWN TRAP",
  trap: "A repo `.env` is never auto-loaded by Claude Code or Codex. Put the exports in `~/.zshenv`, where every agent's shell sees them.",
  healthLabel: "HEALTH CHECK · ONE LINE",
  health: {
    ok: "200",
    okLabel: "connected",
    err: "401",
    errLabel: "wrong-or-revoked key",
  },
};

// The explain skill, published — sunken band (build-prompt §(b)). Copy left 1fr /
// document pane right 1.15fr; Download + Copy always take the FULL served file.
export const FEATURE_SKILL = {
  id: MKT_SECTION_IDS.skill as MktSectionId,
  eyebrow: "THE EXPLAIN SKILL · PUBLISHED",
  title: "The skill your agent drives — in the open.",
  lede: "Saving isn't a form. It's a 486-line skill: research the topic or the diff, write a self-contained interactive explainer, cite sources, add a quiz, save over REST. The API works by hand; the recommended path is a coding agent following this file. Copy it straight into your agent — or download it.",
  ticks: [
    "Runs as `/knowledge:explain` in Claude Code; the identical skill text ships for Codex under `.agents/`",
    "This page serves the canonical file — a byte-parity CI gate keeps it from ever forking",
    "One markdown file, YAML frontmatter included — everything the agent needs, offline",
  ],
  downloadLabel: "Download SKILL.md",
  copyLabel: "Copy the skill",
  pane: {
    name: "SKILL.md",
    meta: "486 lines · yaml + markdown",
    cmd: "/knowledge:explain",
    footLead: "showing the head",
    expand: "read the whole skill ↓",
    collapse: "collapse ↑",
    parity: "byte-parity with plugin/skills/explain/SKILL.md",
  },
};

export const FEATURE_GRAPH = {
  id: MKT_SECTION_IDS.graph as MktSectionId,
  eyebrow: "THE KNOWLEDGE GRAPH",
  title: "See how your knowledge connects.",
  ticks: [
    "A quiet map — hover reveals the neighborhood",
    "Drag to re-place, wheel / pinch to zoom",
    "The legend is a lens, not a filter",
    "Project inks (teal · bronze · plum), data-viz only",
  ],
};

export const PRICING = {
  id: MKT_SECTION_IDS.pricing as MktSectionId,
  eyebrow: "PRICING",
  title: "Free while it matters.",
  lede: "The web app, search, the graph, and the whole Claude Code connection are free — and stay free. The one paid surface is a retrieval API for agents, and it isn't here yet.",
  tiers: [
    {
      name: "Free",
      featured: true,
      chip: { label: "Available now" },
      price: "$0 / forever",
      blurb: "Everything you need to build and browse a knowledge base",
      ticks: [
        "The web reading room — tree, search & graph",
        "Hybrid keyword + semantic search",
        "The interactive knowledge graph",
        "Claude Code + the `knowledge` CLI",
        "Unlimited saves",
      ],
      cta: { label: "Get started — free", href: LINKS.signup, variant: "primary" },
    },
    {
      name: "Agent Retrieval API",
      chip: { label: "Coming", coming: true },
      price: "Metered · usage-based",
      blurb: "A single endpoint to retrieve knowledge into any AI agent",
      ticks: [
        "One endpoint — retrieve into any AI agent",
        "The memory layer your workflows read from",
        "Metered — the one paid surface",
        "Deferred to a later release — pricing at launch",
      ],
      cta: { label: "Join the waitlist", href: LINKS.waitlist, variant: "secondary" },
    },
  ] satisfies PriceTier[],
  footnote:
    "No credit card. Nothing in the web UI is plan-gated — the retrieval API is the only metered surface.",
};

export const FINAL_CTA = {
  id: MKT_SECTION_IDS.cta as MktSectionId,
  eyebrow: "GIVE IT A MEMORY THAT LASTS",
  title: "Stop re-explaining the same thing.",
  lede: "Everything you and your agents figure out — saved once, searchable forever, read like a book. Start free; the terminal path takes one command.",
  ctas: [
    { label: "Get started — free", href: LINKS.signup, variant: "primary" },
    {
      label: "Connect Claude Code",
      href: LINKS.connectClaude,
      variant: "secondaryOnDark",
    },
  ] satisfies MktCta[],
};

export const FOOTER = {
  wordmark: "knowledge",
  tagline:
    "Durable knowledge for developers and their coding agents. 지식이 오래 남도록.",
  columns: [
    {
      heading: "Product",
      links: [
        { label: "What it is", href: `#${MKT_SECTION_IDS.whatItIs}` },
        { label: "How it works", href: `#${MKT_SECTION_IDS.howItWorks}` },
        { label: "Pricing", href: `#${MKT_SECTION_IDS.pricing}` },
        { label: "Open the app", href: LINKS.appEntry },
      ],
    },
    {
      heading: "Connect",
      links: [
        { label: "Read the guide", href: LINKS.guide },
        { label: "Install the CLI", href: LINKS.installCli },
        { label: "Connect Claude Code", href: LINKS.connectClaude },
      ],
    },
    {
      heading: "More",
      links: [
        { label: "GitHub", href: LINKS.repo },
        { label: "Sign in", href: LINKS.login },
        { label: "Get started", href: LINKS.signup },
      ],
    },
  ],
  meta: "knowledge · knowledge.hi2vi.com · 창플 / 미라클 · Built on the calm editorial library",
};
