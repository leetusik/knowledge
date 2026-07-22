// Marketing CTA / link targets (P14.S2). Single source for every href the public
// landing points at, so no section hardcodes a URL and there are no dead links.
//
// App CTAs resolve to the app's REAL paths (the operator kept the app at its
// current paths — no /app rebase; see phase.md "Resolution"): "Sign in" → /login,
// "Get started" → /signup. The guide / CLI / Claude-Code CTAs point at the live
// GitHub repo surfaces that actually document each path (the mkdocs docs site at
// knowledge.hi2vi.com/ is being displaced by this landing in P14.S3, so the repo
// is the stable, non-dead destination): the CLI README is the human "guide", its
// Install section installs the CLI, and the plugin README is the Claude Code
// connection. The deferred Agent Retrieval API (P15) has no waitlist form yet, so
// "Join the waitlist" points at the repo home to follow the roadmap.
const REPO = "https://github.com/leetusik/knowledge";

export const LINKS = {
  signup: "/signup",
  login: "/login",
  /** "Open the app →" — the reading-room entry (login bounces signed-in users). */
  appEntry: "/login",
  repo: REPO,
  /** The full CLI guide (renders cli/README.md). */
  guide: `${REPO}/tree/main/cli`,
  /** CLI install instructions. */
  installCli: `${REPO}/tree/main/cli#install`,
  /** The `/knowledge:explain` Claude Code plugin (renders plugin/README.md). */
  connectClaude: `${REPO}/tree/main/plugin`,
  /** Agent Retrieval API — coming (P15); follow the roadmap on the repo. */
  waitlist: REPO,
  /** "Mint an org key →" (P20.S3) — the dashboard Org API keys panel. Anchors to the
   *  panel heading (`id="org-keys-head"`); auth-gated is fine (the panel mints the
   *  org-level key the env-var quickstart uses). */
  mintOrgKey: "/dashboard#org-keys-head",
  /** The explain skill published on the landing (P20.S3) — the canonical
   *  `plugin/skills/explain/SKILL.md` served byte-for-byte from `web/public/` under
   *  the `scripts/skills_parity.py` gate. Download (`<a download>`) + copy-the-skill
   *  (fetch) both point here. */
  skillFile: "/SKILL.md",
} as const;

// In-page anchor ids for the landing sections, in band order. Kept local to the
// marketing module so the shared content/section-ids.ts (app preview ids) is
// untouched.
export const MKT_SECTION_IDS = {
  hero: "top",
  whatItIs: "what-it-is",
  howItWorks: "how-it-works",
  save: "save",
  connect: "connect",
  // P20.S3 — the two onboarding sections, in band order between connect and graph:
  // the env-var agent quickstart continues the Connect dark territory, the published
  // skill follows on a sunken band.
  agents: "agents",
  skill: "skill",
  graph: "graph",
  pricing: "pricing",
  cta: "get-started",
} as const;

export type MktSectionId =
  (typeof MKT_SECTION_IDS)[keyof typeof MKT_SECTION_IDS];
