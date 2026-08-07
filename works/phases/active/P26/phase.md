# Phase P26: New-maintainer knowledge base

_Intent: see [intent.md](intent.md)._

## Objective

Give a new maintainer full understanding of the knowledge product through a short series of /explain explainers saved to the KB itself (DECOMP surveys docs/current and the codebase and cuts 4-5 substantial knowledge slices), plus a light audit of README.md at the end.

## Context

The corpus a new maintainer must absorb:

- **`docs/current/*.md` — 11 tracks, 5,456 lines**: `decisions.md` 1230 · `frontend.md` 841 ·
  `operations.md` 631 · `api.md` 588 · `qa.md` 551 · `experience.md` 439 · `architecture.md` 345 ·
  `security.md` 339 · `data.md` 229 · `backend.md` 148 · `product.md` 115.
- **Four distribution surfaces, not one product** — a Claude Code **plugin** (`/knowledge:explain` +
  `/knowledge:setup`, marketplace + isolated payload + template-sync), a standalone **CLI**
  (`cli/`, `uv tool install git+…#subdirectory=cli`), an **MCP retrieval service** (`mcp-server/`,
  frozen tool contract v1), and a **hosted multi-tenant web app** (`web/`, live at
  `https://knowledge.hi2vi.com`).
- **~6,550 lines of Python under `server/`** (FastAPI, plus `accounts/`, `persistence/`, `usage/`),
  a Next.js app in `web/src/` with four route groups (`(app)` `(auth)` `(marketing)` `(public)`),
  `cli/src/knowledge_cli/` (8 modules), `mcp-server/src/knowledge_mcp/` (5 modules), the
  `plugin/` payload (two skills + a whole byte-parity mirror of the server under
  `plugin/templates/kb/`), 5 alembic migrations, a 14-file pytest suite, six `scripts/*.py` gates,
  two compose files, `deploy/`, four GitHub workflows, and a ~33KB agentic-workspace contract.
- **A long history** — P1→P25, twenty phases archived, five (P21–P25) still in `active/`,
  16 open deferred jobs. P26 is the first phase whose product is *understanding* rather than code.

## Decomposition

**Five `knowledge` slices** (one `/explain` explainer each, written to be read **in order** as a short
series) plus one docs-only README audit last.

| id | name | kind | risk | order | scope in one line |
|---|---|---|---|---|---|
| `P26.S1` | Knowledge: what it is and how it is used | knowledge | low | 1 | What knowledge is and who it serves: the problem, the four distribution surfaces as *product roles*, the user → org → project → document model, visibility/sharing/pretty links, versioned documents, the HTML explainer as a document type |
| `P26.S2` | Knowledge: system internals - content plane, write path, contracts | knowledge | low | 2 | How it actually works: disk-canonical / DB-disposable, the two planes, the single write path from `/explain` to a committed+published document, the `server/` module map, the schema and migrations, and the wire contracts (`/api`, `/auth`, `/app`, MCP v1) |
| `P26.S3` | Knowledge: the read surfaces - two front ends | knowledge | low | 3 | The two front ends: the MkDocs viewer + "calm editorial library" design system + static knowledge-graph renderer (now the shipped scaffold, retired from prod), and the Next.js app with its sealed-cookie BFF, four route groups, marketing landing, `/@{org}` public namespace, and the sandboxed opaque-origin explainer iframe |
| `P26.S4` | Knowledge: shipping and running it - distribution, deploy, security, QA | knowledge | low | 4 | How it reaches users and stays trustworthy: plugin packaging + template-sync byte parity + the open-core mirror, the CLI/installer/published-skill channels, the production topology behind one nginx edge, publish-on-write, tenancy + 404-never-403 + XSS containment, and the test/CI gates |
| `P26.S5` | Knowledge: why it is this way, and how to change it | knowledge | low | 5 | Why it looks like this and how a maintainer changes it: the `D-*` record across P1→P25, the durable-doc versioning discipline, the honest current state + open questions + 16 deferred jobs, and the phase/slice workspace this repo is driven by |
| `P26.S6` | Audit and refresh README.md | implementation | low | 6 | Audit the 84-line README against current reality; fix what is stale, wrong, or missing — **not** a rewrite |

### Why this cut

Five substantial explainers, each answering one question a new maintainer asks in order —
*what is it and who is it for* (S1) → *how does it work* (S2) → *what does it look like to a reader*
(S3) → *how does it ship and stay safe* (S4) → *why is it like this and how do I change it* (S5).
The series is deliberately short enough to read end-to-end in one sitting.

The shape is borrowed from vocky **P15** (four explainers + a README audit, verdict `pass`), but the
grouping is knowledge's own. Two axes forced a fifth slice that vocky did not need:

1. **A far heavier frontend story.** `frontend.md` alone is 841 lines and covers *two distinct front
   ends* — the MkDocs viewer with its hand-built design system and static graph renderer, and the
   Next.js app with its BFF, four route groups, and sandboxed explainer render. Vocky folded its thin
   web app into the product slice; here that would swamp S1 and leave the design system homeless.
   **S3 is justified** (confirmed against `web/src/` — 12 page routes, 10 `lib/` modules, four
   component families — and `docs/{stylesheets,javascripts}` + `scripts/graph_hook.py`).
2. **A distribution axis with real engineering behind it.** The plugin is not a client; it is an
   independently installable open-core product that ships a **byte-parity mirror of this very
   server** (`plugin/templates/kb/server/*`, one manifest, one renderer, two CI parity gates).

Mapping to the corpus — each `docs/current/*.md` track lands in **exactly one** explainer, so overlap
stays minimal:

- **S1** ← `product.md`, `experience.md`
- **S2** ← `architecture.md` (minus the two packaging sections, see below), `backend.md`, `data.md`, `api.md`
- **S3** ← `frontend.md`
- **S4** ← `operations.md`, `security.md`, `qa.md`, **plus** `architecture.md` §*Plugin packaging (P7)*
  and §*Open-core template mirrors the SaaS server (P17)*
- **S5** ← `decisions.md`

The one deliberate cross-track assignment is those two `architecture.md` sections going to S4; the one
deliberate content overlap is `experience.md` §*Route / screen map* + §*UX states*, which S1 owns as
journeys and S3 re-reads as a screen inventory.

### Judgment calls, recorded

- **The distribution story is split along the product/engineering seam, not kept whole.** The four
  surfaces appear in **S1 as product roles** (who uses which, what each can do, why there are four) and
  the **packaging machinery appears in S4** (marketplace + payload isolation, the three-class template
  manifest, `plugin/setup/render.py`, `plugin_parity.py` + `skills_parity.py`, `plugin-ci.yml`, the
  P17 open-core mirror and its `{{KB_DATABASE_URL}}` dormancy token, the curl installer, the
  full-file-parity `/SKILL.md`). Rationale: the machinery's siblings are release and CI — the parity
  guards *are* CI gates and live beside `operations.md` §*Plugin distribution* and `qa.md` §*Plugin
  acceptance* — while a reader meeting the product for the first time needs the roles, not the
  byte-compare. Vocky's "clients live with the product because they add no backend capability" still
  holds for the CLI (a pure client of existing surfaces) and the MCP service (a proxy over the frozen
  retrieval API); the plugin adds no backend capability either — it *hands out a copy of the backend*,
  which is an engineering problem, hence S4.
- **The `/explain` write path belongs to S2, not S1.** It is both the product's front door and its
  most intricate internal flow. S1 covers it as an experience (run `/knowledge:explain <topic>`, get a
  shareable page); **S2 owns the mechanism** end to end — skill → `POST /api/documents` →
  `documents.py` (disk write, versioned archive, frontmatter sanitization) → FTS index + embedding →
  `gitops.py` commit → `publish.py` push/worker → readable at a URL. Reason: the path only makes sense
  once *disk is canonical, the DB is a disposable projection* has been established, and that is S2's
  opening idea.
- **Self-reference is a feature, not a footnote.** These explainers are written **by** that write path
  **into** the repo that implements it, and published on its own public site. **S2 must say this
  plainly** where it explains the write path (S1 may nod at it).
- **S4 is the heaviest slice** (~1,606 doc lines + the plugin machinery + the deploy kit + four
  workflows). It is kept whole because "how it ships / how it is defended / how we know it works" is
  one argument. If one `/explain` run cannot do it justice, say so in `P26.S4/result.md` rather than
  thinning coverage; the natural re-split is **distribution + release** vs **security + prod topology
  + QA gates** (do not re-split without the operator asking — the confirmed target is 4–5 knowledge
  slices, and this cut already sits at 5).
- **`P26.S6` is placed last on purpose but does not depend on S1–S5**: the pre-recorded staleness list
  below is enough to drive it. S1–S5 are, in effect, the audit that produced that list.

## Findings & Notes

### Execution rule — `knowledge` slices are run INLINE by the orchestrator, never dispatched

`/explain` is a **user-level** Claude Code skill (`~/.claude/skills/explain/`, not in this repo), so it
exists only on the main thread. Every `kind: knowledge` slice here (`P26.S1`–`P26.S5`) is therefore run
**inline by the orchestrator**, like a `co-work` design slice — never handed to a `slice-executor`.
`--risk low` on those five slices is **nominal bookkeeping only**; it does **not** mean "dispatch to
`slice-executor-mid`". Only `P26.S6` (the README audit) is dispatched normally. This rule is inherited
verbatim from vocky `P15`, which recorded the same trap.

`/explain` specifics worth knowing before the first knowledge slice:

- Invoke in **topic mode**: `/explain <topic>` — the topic is everything left after trailing flag words.
- Trailing flags: `here` also writes a copy into this project (**do not use it** — constraint 4 below),
  `research` / `no-research` force the web-research section on/off.
- Output is one self-contained interactive HTML page: Background, Intuition, Code, "Best practices &
  next steps", and a 5-question quiz.
- Because each topic below is a **merged grouping**, name the topic explicitly enough that the skill
  researches the whole grouping — the per-slice source lists below are what each run should cover.
  (This is what made vocky's merged groupings work in one run each.)

### Sources per knowledge topic

**S1 — what knowledge is and how it is used**

- Docs: `product.md` (all of it — Status, Summary, Target Users, Problem, Goals, Non-Goals, and the
  whole *Product Direction* arc P7 → P25, Terminology), `experience.md` (visual language, route/screen
  map, the core user journeys, UX states, copy and tone, and the per-phase journey sections: the
  authenticated app P12, the CLI journey P13, the HTML explainer P16, explain-v2 + hosted onboarding
  P17, the org experience P18, public sharing P19, onboarding P20, delete P21, graph label focus P22,
  version history P23, honest publishing P24, pretty share URLs P25).
- Code/files as *product artifacts*: `plugin/skills/explain/SKILL.md` + `plugin/skills/setup/SKILL.md`
  (what the two commands promise), `plugin/README.md`, `cli/README.md` +
  `cli/src/knowledge_cli/guide.py` (the bundled agent contract) + `knowledge.py`/`main.py` command
  surface, `mcp-server/CONTRACT.md` + `mcp-server/README.md` (the frozen `search` / `fetch_document`
  tool contract v1 as a *product* surface), the repo `README.md`, `web/public/install.sh` +
  `web/public/SKILL.md` (the on-ramp the landing hands out).
- Anchors: the **four surfaces as roles** (plugin = self-host/open-core + the write skill; CLI = hosted
  onboarding for someone living in a terminal; MCP = agent-to-agent retrieval, "search as a service",
  first consumer hi2vi's OpenClaw; web app = the free human UI); **user → org → project** with
  signup auto-provisioning a default org+project, get-or-create projects, and one org-level `vk_` key
  serving every repo; **private by default**, public projects opening docs *and* graph to anonymous
  readers; **pretty share URLs** `/@{org}/{project}/{doc-slug}` and `/@{org}/graph` (P25) with old
  links never breaking; **versioned documents** (re-explaining publishes v2 of the same document, not a
  duplicate post — P23); the **interactive HTML explainer** as a first-class document type; everything
  in the web UI is free, monetization is still future (D12).

**S2 — system internals: the content plane, the write path, the contracts**

- Docs: `architecture.md` (System Shape, API-Owns-Writes Flow, *Two deployments, one codebase* (P8),
  the self-hosted two-service routing (P9), *Two-plane app* (P10), the BFF (P12), the CLI package
  boundary + two-implementation config seam (P13), the MCP proxy-and-forward-bearer surface (P15), the
  HTML explainer doc type + opaque-origin render (P16), Accounts v2 (P18), *Durable public identity*
  (P25), Boundaries/Constraints, the Search Boundary (P5), the Knowledge Graph data contract (P6),
  Extension Points, Roadmap — **excluding** §*Plugin packaging (P7)* and §*Open-core template* (P17),
  which belong to S4), `backend.md` (stack, the `server/` module layout, invariants, error handling),
  `data.md` (storage, entities, indexes/search, the sqlite-vec extension point, migrations,
  reconciliation, retention, the build-time graph data contract), `api.md` (the whole contract
  catalogue: auth, contracts, tenant resolution P10, usage P11, the `/app` read plane P12, the widened
  public contract + `/auth` throttle P13, MCP tool contract v1 P15, HTML format P16, org credentials +
  get-or-create P18, public/anonymous reads P19, member delete P21, versioned publishing + history P23,
  the P25 slug resolver + `canonical_path`, and the **frozen consumer contract** P8).
- Code: `server/main.py`, `documents_api.py`, `documents.py`, `app_api.py`, `auth_api.py`,
  `api_auth.py`, `dashboard_api.py`, `graph_api.py`, `usage_api.py`, `search.py`, `embeddings.py`,
  `gitops.py`, `publish.py`, `reindex.py`, `seed.py`, `db.py`, `config.py`, plus the packages
  `accounts/` (`auth`, `repository`, `security`, `service`, `slugs`, `types`), `persistence/`
  (`base`, `engine`, `models`) and `usage/` (`metering`, `repository`, `service`, `types`);
  `alembic/versions/0001_accounts_tenancy` → `0005_tenant_slug`;
  `mcp-server/src/knowledge_mcp/{server,upstream,config,main}.py`.
- Anchors: **disk is canonical, the DB is a disposable projection** — a full `reindex` re-derives every
  row from `docs/`, which is why document *rowids* are disposable and the org slug had to live in the
  **accounts** plane (P25); the **two planes** (SQLite content plane + async Postgres accounts plane,
  the latter dormant when `DATABASE_URL` is unset → single-tenant); the **single write path** and its
  ordering (write file → FTS index → embed → git commit → optional push, with P24 moving push+embed off
  the response path); **hybrid search** = BM25 + exp-decay recency + Gemini cosine fused by RRF, with
  CJK handled by query-layer prefix expansion, not the tokenizer; **the frozen consumer contract**
  (P8) and **MCP tool contract v1** (P15) as things you may extend but not break; version chains that
  may not change a document's project or format. **Say plainly that this phase's own explainers travel
  this exact path into this exact repo.**

**S3 — the read surfaces: two front ends**

- Docs: `frontend.md` (all 841 lines — stack, `mkdocs.yml` theme configuration, the design system
  `extra.css` §1–§9, the fonts wiring, the landing markup, per-project & tags pages, client-side
  CJK-capable search, the knowledge map renderer + `extra.css` §10, conventions & constraints, then the
  whole `web/` half: the authenticated app P12, the public marketing landing P14, the HTML explainer
  render P16, the height handshake, the Org API keys panel P18, the public route group P19, the
  onboarding landing P20, member delete P21, graph label focus P22, version history P23, and the
  `/@{org}` route namespace P25). Cross-read `experience.md` §*Route / screen map* + §*UX states*
  (owned by S1) as the screen inventory.
- Code: `web/src/app/` — `(app)/{dashboard,documents,projects/[projectId],graph}`,
  `(auth)/{login,signup}`, `(marketing)/page.tsx`, `(public)/{[org]/[project]/[slug],[org]/graph,
  documents/[id],documents/[id]/versions/[v],graph/[org]}`, `app/api/{auth,documents}` (the BFF
  routes); `web/src/lib/` (`session.ts`, `bff.ts`, `env.ts`, `auth-guards.ts`, `rate-limit.ts`,
  `explainer-height.ts`, `rail-cookie.ts`, `client-ip.ts`, `knowledge/*`); `web/src/components/`
  (`ui/`, `marketing/`, `usage/`, `app-shell/`, `copy-link-button.tsx`, `public-shell.tsx`);
  and the MkDocs side — `mkdocs.yml`, `docs/index.md`, `docs/graph.md`, `docs/tags.md`,
  `docs/stylesheets/extra.css`, `docs/javascripts/graph.js`, `docs/assets/`, `scripts/graph_hook.py`.
- Anchors: the **"calm editorial library"** visual language and that the design system is hand-authored
  CSS sections, not a framework; the **sealed-cookie BFF** — the browser never sees a `vk_` key, the
  Next server exchanges a session cookie for upstream calls; the **opaque-origin sandboxed iframe** that
  renders an HTML explainer with its quiz JS alive but no access to the parent origin, plus the
  **height handshake** (and the P25.F4 hydration-race fix); the **404-never-403** rule as it shows up in
  the public routes; the graph's **selection-driven labels** (P22); and the honest status of the MkDocs
  viewer — **retired from production at P14** (the Next app took `/`), surviving as a local tool and as
  the scaffold the plugin ships.

**S4 — shipping and running it: distribution, deploy, security, QA**

- Docs: `operations.md` (local dev, compose deployment, environment variables, reindex as drift repair,
  the P10/P18/P19/P20 cutovers, publishing/live-serve history + the P14 mkdocs retirement, the P8
  production deployment, the manual-dispatch `Production Deploy` P9, site design build assets, the
  graph build hook, **plugin distribution: install, setup, release (P7)**, the web app deploy P14, the
  CLI install + edge change P13, the hosted accounts-plane cutover, the MCP deploy P15, explain-v2
  cutover + deploy hygiene P17, the closing Invariant), `security.md` (auth model, authorization rules,
  multi-tenant isolation P10, per-tenant usage isolation P11, secret handling, the hosted push
  credential P8, *two credentials never conflated* P9, the revised "agent never pushes" rule, publish
  safety P4, plugin config + secrets hygiene P7, the sealed-cookie BFF P12, CLI credential handling +
  the `/auth` throttle P13, HTML explainer XSS containment P16, org-key authorization made honest P18,
  the anonymous public read surface P19, member-only delete P21, version history's wider read surface
  P23, the Security Checklist), `qa.md` (test commands, acceptance-criteria style, site-build
  invariants, manual QA missions, the regression checklist, the negative-test pattern, the CDP geometry
  probe, plugin acceptance P7, hosted publish-on-write E2E P8, CLI smoke P13, hosted skill-path E2E
  P17, accounts-v2 P18, onboarding P20, delete P21, publish-worker P24, pretty-share-URL P25, known
  fragile areas), **plus** `architecture.md` §*Plugin packaging: marketplace + isolated payload +
  template-sync (P7)* and §*Open-core template mirrors the SaaS server (P17)*.
- Code/files: `plugin/.claude-plugin/plugin.json` + repo-root `.claude-plugin/marketplace.json`,
  `plugin/templates/manifest.json` (the three file classes + 8 `{{KB_*}}` placeholders),
  `plugin/templates/kb/**` (the mirrored `server/`, tests, compose, Dockerfile, pages.yml),
  `plugin/setup/render.py`, `scripts/plugin_parity.py`, `scripts/skills_parity.py`,
  `scripts/site_smoke.py`, `scripts/cli_smoke.py`, `scripts/onboarding_smoke.py`;
  `compose.yml`, `compose.prod.yml` (api / knowledge-web / mcp / postgres), `Dockerfile`,
  `web/Dockerfile`, `mcp-server/Dockerfile`, `Makefile`, `deploy/` (`knowledge.conf`, `deploy.sh`,
  `oracle-production-deploy-remote.sh`, `github-actions-production-deploy.sh`, `README.md`,
  `SECRETS.md`), `.github/workflows/` (`deploy-production.yml`, `pages.yml`, `plugin-ci.yml`,
  `workspace-ci.yml`), `tests/` (14 files), `mcp-server/tests/` + `mcp-server/scripts/e2e_smoke.py`,
  `alembic.ini`.
- Anchors: **payload isolation** (`source: "./plugin"` is what keeps the operator's `docs/`, `works/`,
  `data/`, and tokens out of every installer's cache) and **template-sync as a byte-parity snapshot,
  not a fork** — one manifest, one renderer shared by the setup skill and the parity guard, drift fails
  `plugin-ci.yml`; the **P17 open-core mirror** (the whole `server/` tree shipped, with accounts-plane
  dormancy achieved by one render token rather than a code branch) and its recorded exclusions
  (`alembic/`, `cli/`, `onboarding_smoke.py`); the **single nginx edge and its location-order
  footguns** — longest-prefix wins, the regex `^/api/documents/[0-9]+/raw$` beating every prefix, and
  the rule that the first `proxy_set_header` inside a location drops the entire inherited set;
  **publish-on-write** (`KB_GIT_PUSH` false everywhere except the box) and the "agent never pushes"
  rule; **404-never-403** as the tenancy boundary; **XSS containment** by opaque origin rather than
  sanitizing; **deploy ordering** (build → migrate → recreate+gate api → web/mcp) and that
  `alembic upgrade head` runs *inside* the container because Postgres publishes no host port; the
  test/CI gate map and the known fragile areas.

**S5 — why it is this way, and how to change it**

- Docs: `decisions.md` (all 1,230 lines — every `D-*` / ADR entry from P2 through P25), the `## Status`
  header of each `docs/current/*.md`, the `## Open Questions` sections (`architecture.md`,
  `frontend.md`, `security.md`, `qa.md`, `experience.md`), `docs/index.json` (the version trail —
  `product` is at v0013, etc.), `docs/README.md` (the doc-versioning rules).
- Files: `works/backlog.md` + `works/deferred.md` (16 open, 5 promoted, 3 dropped),
  `works/phases/archived/` (phase **names** only — P1→P20; do **not** deep-read the archived slices),
  the five still-active done phases P21–P25, `CLAUDE.md` / `AGENTS.md` (the contract),
  `scripts/workflow.py`, `.claude/skills/` + `.agents/skills/` (16 skills each),
  `.claude/agents/` + `.codex/agents/` (the `slice-executor` tiers), `executors.toml`.
- Anchors: the defining decisions and *what they cost* — disk-canonical/DB-disposable; two deployments,
  one codebase; mirroring rather than narrowing the open-core template; proxy-and-forward-bearer for
  MCP; opaque-origin render instead of sanitizing HTML; a durable org slug in the accounts plane; no
  PyPI publish (D-P13-1) with a curl installer instead. The **honest current state**: live at
  `https://knowledge.hi2vi.com` with a multi-tenant accounts plane, monetization not built (D12), org
  creation/invites deferred (D14), anonymous-read rate limiting deferred (D17), prettier drift (D22),
  two known pre-existing test failures (D15, D21). And the **workspace**: backlog routes, slice folder
  explains, result summarizes, docs are versioned durable truth — phases → slices → review, the
  orchestrator/`slice-executor` split, phase-level doc versioning at the review, parallel mode.

### Already-spotted README staleness (input to `P26.S6`, not an exhaustive list)

`README.md` is 84 lines and was last edited at **P13** (`1fa9bfd feat(cli): P13.S4`). Twelve phases
(P14–P25) have landed since, and the file still describes the P9–P13 regime. Verified findings:

1. **Lines 3–4, the headline links, are both wrong — and one is user-visibly broken.**
   "Live site → `https://knowledge.hi2vi.com/graph/` — the interactive knowledge map; browse from any
   node, or read the [library index](https://knowledge.hi2vi.com/)."
   Verified live: `GET /graph/` → **308 → `/graph` → 200 `https://knowledge.hi2vi.com/login`**
   (`<title>Sign in · knowledge</title>`) — the first link in the README sends an anonymous reader to a
   sign-in wall. And `GET /` → 200 with
   `<title>knowledge — Durable knowledge for developers and their coding agents · knowledge</title>` —
   the **marketing landing**, not a library index. The public graph now lives at `/graph/{org-uuid}`
   and, post-P25, `/@{org}/graph`.
2. **"How it's built → Publish path" (lines 46–52) describes the retired P9 topology.** It says a
   `mkdocs serve` viewer serves `docs/` live "at the domain root, beside the API behind one nginx edge
   (`/` → site, `/api/*` → API)". Since **P14** the mkdocs `knowledge-site` service is removed from
   `compose.prod.yml` and the edge, and `/` proxies to `knowledge-web` (Next). The real edge map is in
   `deploy/knowledge.conf`: `/api/` → api, `/api/auth/` → web BFF, regex `^/api/documents/[0-9]+/raw$`
   → web, `/auth/` + `/app/` + `= /healthz` → api, `/mcp` → the MCP service, `/` → web. The
   *fresh-on-write* property survives in a different form (the api writes the file and indexes it; the
   app serves it immediately) and should be restated, not deleted.
3. **The hosted web app is absent from the README entirely.** No signup/login, dashboard, project
   pages, document browse/search/read, in-app knowledge graph, org API-keys panel, version-history
   panel, delete, or public/private visibility toggle — i.e. the product's **primary human surface**
   (P12 built it, P14 deployed it) is unmentioned. The file still reads as "a personal knowledge base".
4. **P25's org slugs / pretty share URLs are missing** (`/@{org}/{project}/{doc-slug}`, `/@{org}/graph`,
   claimed from the dashboard's Public URL panel) — this is now *the* shared-link story, and the
   README's only sharing content is the two stale links in item 1.
5. **The MCP retrieval service (P15) is missing** — the fourth distribution surface, live at
   `https://knowledge.hi2vi.com/mcp` with a frozen v1 `search` / `fetch_document` tool contract, while
   the README names only the plugin and the CLI.
6. **The CLI section (lines 25–39) omits the P20 on-ramps.** It gives
   `uv tool install git+…#subdirectory=cli` as the only install; P20 shipped
   `curl -fsSL https://knowledge.hi2vi.com/install.sh | bash` as the recommended path (verified live:
   `/install.sh` → 200), the env-var agent quickstart (`KB_API_BASE_URL` + `KB_API_TOKEN`), and the
   canonical explain skill published at `/SKILL.md` (verified live: 200). Also check the
   `knowledge init` line against today's flags and the "web login" hint.
7. **"Write path" understates search and omits the document format.** It says "FastAPI + SQLite (FTS5
   full-text search)"; search is actually **hybrid** — BM25 + exp-decay recency + Gemini embedding
   cosine fused by RRF (`server/search.py`, `data.md` §Indexes/Search) with CJK prefix expansion — and
   the KB's documents are now first-class **self-contained interactive HTML explainers** (P16/P17),
   which the README never mentions.
8. **"Nothing publishes until I push" (line 45) is no longer true of the operator's own KB.**
   `KB_GIT_PUSH` defaults false locally but is `"true"` on the production box (`compose.prod.yml:58`),
   and since P9 a document is public the moment the api writes it. State the local-vs-hosted split
   honestly instead of the flat claim.
9. **"Knowledge map" bullet (lines 60–64)** describes only the *static* MkDocs graph
   (`scripts/graph_hook.py` → build-time `graph.json`, vendored no-CDN JS). That track is retired from
   production; the live graph is the app's `graph_api.py`-backed in-app graph plus the public
   `/@{org}/graph`. Both exist — say which one the link points at.
10. **"Recreating from scratch → Restore this KB"** — `docker compose up -d` now also starts
    `postgres` (the accounts plane) beside `kb` and `api`; verify whether the stated one-command
    restore still holds as written, and whether the accounts plane needs `alembic upgrade head`
    in-container to be usable.
11. **Cross-check the still-plausible claims** before editing — the plugin install lines
    (`/plugin marketplace add leetusik/knowledge` → `/plugin install knowledge@knowledge`), the
    Python 3.12+/Docker/GitHub-repo requirements, the "11 tracks" versioned-docs description (confirmed
    accurate today), and the agentic-workflow paragraph — against `docs/current/product.md` and
    `docs/current/operations.md`.

**The audit is "fix what is stale, wrong, or missing" — not a rewrite.** The README's section
structure (headline link, Install the plugin, Command-line interface, How it's built, Recreating from
scratch, Agentic workflow) should survive intact; widening the audit into `docs/current/` was
explicitly declined by the operator.

### Other survey notes

- **`docs/knowledge/` does not exist yet.** `docs/` today holds `changple5`, `changple_web`, `hi2vi`,
  `hi2vi_web`, `bootstrap_agentic_workspace.sh`, and `vocky` — **no `knowledge/`**. The first save
  creates the project folder, its `index.md` landing, a Recent bullet in `docs/index.md`, and a card in
  the site's Browse grid.
- The KB's most recent Recent entries are vocky's four P15 explainers (2026-08-06) — the direct
  precedent for this series, and worth skimming for house style before S1.
- `.claude/agents/` and `.codex/agents/` still carry a `slice-executor-low` file alongside `mid`/`high`;
  the contract describes only two tiers. Cosmetic workspace drift, noted for S5's accuracy — **not**
  something this phase fixes.
- Five phases (P21–P25) are `done` but still in `works/phases/active/` awaiting a `rotate-backlog`.
  S5 should describe the archive rule rather than assume `active/` means in-flight.

### Cross-slice notes from the knowledge slices

- **S1 (done):** explainer published — "Knowledge: What It Is and How It Is Used", **KB doc id 29
  v1**, `knowledge/2026-08-08-knowledge-what-it-is-and-how-it-is-used.html`, 25,242 chars of
  extracted text. Research section **skipped-by-judgment** (product shape of a private repo — no
  external comparison surface), so the document has four sections and no `#best-practices` ToC
  entry. One run sufficed for the merged grouping.
  - **The first save behaved exactly as predicted:** `landing_created: true` +
    `recent_updated: true` — `docs/knowledge/index.md` and the Recent bullet were created by the
    API, and the project folder now exists.
  - **The org slug is `leetusik`**; the 201 returned the pretty URL
    `/@leetusik/knowledge/<doc-slug>` with no id-URL fallback.
  - **Project `knowledge` is private (the P19 default), so the series is not publicly readable.**
    Anonymous: id URL → **307** (proving a `canonical_path` was emitted), pretty URL → **404**
    (404-never-403 on a private project). Correct default behaviour, **not** a defect. Making the
    series public is an **operator decision** — flip the project to public from its project page —
    and is deliberately *not* required by the confirmed intent, so the loop did not stop for it.
    Worth putting to the operator at `P26.REVIEW`.
  - **For S3:** `canonical_path` is `null` on the `by-path` read projection even though the pretty
    URL resolves — consistent with the recorded P25 scope note, but S3 owns the public routes and
    should glance at it.
  - **For S2:** S1 states the self-reference (this series is written by the write path into the repo
    that implements it) and defers the mechanism. S2 owns that payoff — do not leave it unwritten.

- **S2 (done):** explainer published — "Knowledge System Internals: The Content Plane, the Write
  Path, and the Contracts", **KB doc id 30 v1**,
  `knowledge/2026-08-08-knowledge-system-internals-…-and-the-contracts.html`, 26,037 chars extracted.
  One run sufficed for the merged grouping (four doc tracks + the `server/` tree).
  - **Research section: `included`** — the first in this series. The gate was applied, not skipped by
    reflex: RRF rank fusion, SQLite's single-writer model, and in-process background work vs a task
    queue all have documented prevailing practice. Three pages opened and cited with bare domains in
    plain text: `sqlite.org` (WAL single-writer/concurrent-reader), `elastic.co` (the RRF formula and
    the default rank constant 60, matching `RRF_K = 60`), `fastapi.tiangolo.com` (the
    in-process-vs-Celery boundary). Two earlier fetches failed (`dl.acm.org` 403; `sqlite.org` without
    `www`) and were replaced rather than cited unread — no retry loop.
  - **Verified that citation provenance survives text extraction:** all three domains appear in the
    server-extracted text, so FTS and the MCP surface keep them. This is exactly what the skill's
    "link plus the bare domain" rule exists for, confirmed working end to end.
  - **The self-reference is paid off** (S1's handoff discharged): the Code section walks this
    document's own path through the write path into this repo, and states the `git pull --rebase`
    consequence. **S3–S5 need not repeat it.**
  - **Spine for the series:** framing disk-canonical / DB-disposable as *the* opening idea made three
    separate decisions fall out as consequences (disposable rowid → the P25 slug's home in Postgres;
    version bodies as files; `reindex` as a repair tool). Later slices should lean on it rather than
    re-derive it.
  - **For S4:** deliberately left there — `KB_GIT_PUSH` as a *deployment* flag with its edge/secret
    story, and the publish worker's operator surface (failures reach only the container log, so the
    box's positive assertion is git state, not a log grep).
  - **For S5:** the two-implementations config seam (CLI resolver vs the skill's inline resolver —
    cannot be merged, drift is the standing risk) is named in S2 as a contract; the *why we accepted
    two implementations* telling is a decision-record item S5 owns.

- **S3 (done):** explainer published — "Knowledge's Read Surfaces: Two Front Ends, One Corpus",
  **KB doc id 31 v1**, `knowledge/2026-08-08-knowledge-s-read-surfaces-two-front-ends-one-corpus.html`,
  22,047 chars. One run sufficed (841 doc lines, but one subject).
  - **Research: `included`** — two MDN pages opened (`developer.mozilla.org`): the `<iframe>`
    reference's verbatim warning that `allow-scripts` **plus** `allow-same-origin` lets the framed
    document strip its own sandbox, and the `postMessage` page's "always specify an exact target
    origin, not `*`". The second produced the document's best section: a **justified divergence** —
    the repo's `targetOrigin: "*"` is correct because an opaque origin has no nameable value, the
    message carries no data, it targets one `contentWindow`, and MDN's companion rule (verify the
    sender) *is* honored via `event.source`, since `event.origin` is the literal `"null"`.
  - **S1's `canonical_path` question is RESOLVED — nothing broken.** `grep -n canonical_path
    server/*.py` finds it only in `documents_api.py` (the `/app` plane's two **detail** reads) and
    `graph_api.py`; `main.py` (`/api`) has none. Two stacked causes: P25 was **additive to `/app`
    only** because `/api/*` is the frozen consumer contract, and even on `/app` it rides detail reads
    rather than the shared list projector (to avoid a per-row accounts lookup). The 201's pretty
    `url` is built at a **third** site (`main.py`'s `resolve_org_slug` dependency), which is why a
    save reports a pretty URL that the by-path read appears not to know about. Written into the
    explainer as a callout and a quiz question. **No code change proposed or made.**
  - **The MkDocs viewer is simultaneously dead code and product** — retired from production at P14,
    shipped verbatim to every self-hoster by the plugin. The likeliest maintenance mistake in this
    area is "cleaning up" files a plugin user depends on; proposed as a next step to name that status
    in one place.
  - **For S4:** the browser-QA residuals cluster in this area (quiz rendering, graph feel in both
    schemes, the direct raw-URL sandbox strip) — all owed to the operator because the repo has no
    browser/jsdom tooling. S3 lists them; **S4 owns the gate map** and should say what is
    machine-verified vs. an operator residual.
  - **For S5:** the design-provenance discipline (locked `extra.css` §1, `kb-console.css` copied
    verbatim, three quarantined on-token extensions instead of edits to the canvas) is stated here as
    a *practice*; the ADR behind it — why a design round's record must not be retro-edited — is S5's.

- **S4 (done):** explainer published — "Shipping and Running Knowledge: Distribution, the Edge,
  Security, and the Gates", **KB doc id 32 v1**, 20,566 chars.
  - **The §Open Questions "is S4 too much for one run?" is ANSWERED: one run sufficed to produce a
    coherent explainer, but its coverage is deliberately SELECTIVE — stated out loud, not glossed.**
    S4 has the largest source grouping in the cut yet produced the *shortest* document
    (S1 25,242 · S2 26,037 · S3 22,047 · **S4 20,566**). Real depth went to payload isolation,
    template-sync + the dormancy token, the three edge footguns, deploy ordering, the two-credentials
    split, 404-never-403, the gate map, and the silent-publish failure class. **Recorded gaps** (thin
    or absent): the QA manual missions in detail, the usage-metering plane's security posture,
    per-tenant usage isolation, CLI credential-hygiene specifics, and the P10/P18/P19/P20 cutover
    histories.
  - **Recommendation: do NOT re-split.** A new-maintainer series is meant to read end to end, and a
    sixth document buys completeness at the cost of usability; §Constraints 9 also caps the series at
    five absent an operator ask. The right home for the gaps, if wanted, is a **later targeted
    explainer** (e.g. "Knowledge's credential and usage planes"), not a re-cut of this phase.
    **Flagged for `P26.REVIEW` and the operator.**
  - **Research: `included`** — `cheatsheetseries.owasp.org` (Argon2id as first choice + its minimum
    parameters, which produced an actionable audit suggestion rather than a compliment) and
    `nginx.org` (the `proxy_set_header` inheritance rule, which states the repo's footgun
    **verbatim** — the repo's warning is documented platform semantics, not a discovery).
  - **S3's handoff discharged:** the gate map is an explicit per-layer table followed by the honest
    statement of what no gate covers (the browser-QA residuals) and why (no browser/jsdom tooling).
  - **Structural finding worth reusing:** the security story reads best as a *widening threat model*
    (personal KB → installable → public internet with a write credential → accounts and PII →
    executable untrusted documents → anonymous reads), because each rule then reads as a response to
    a specific expansion. A flat checklist cannot teach that.
  - **For S5:** three decisions are named here as facts and are S5's to justify — **no PyPI publish**,
    the **pinned un-revokable master bearer** as a deliberate concession, and **mirror-don't-narrow**
    for the open-core template. S4 says what they are; S5 owns why and what they cost.

- **S5 (done):** explainer published — "Why Knowledge Is This Way, and How to Change It",
  **KB doc id 33 v1**, 17,730 chars. **The five-explainer series is complete: KB docs 29 → 30 → 31 →
  32 → 33 in reading order** (verified: `GET /api/documents?project=knowledge` → `total: 5`, all v1).
  - **Research: `included`** — two `adr.github.io` pages: the definitions of an ADR and a decision
    log, and the Nygard template's five components. Produced a real comparison: every entry in
    `decisions.md` carries all five **plus two** — an explicit *Alternatives considered* field (making
    the road not taken retrievable rather than inferred) and a *Source* pointer back to the producing
    slice. **Divergence:** standard practice is one immutable numbered file per decision; this project
    keeps one appended log inside a versioned track — giving up a stable per-decision URL, gaining
    lockstep versioning with the ten tracks those decisions constrain.
  - **All three inherited debts discharged.** S2's two-implementations config seam (why two
    unmergeable resolvers is *correct*, and its permanent drift cost), S3's design-provenance rule
    (framed as a truthfulness constraint about who decided what, not tidiness), and S4's three
    decisions — no PyPI, the pinned master bearer, mirror-don't-narrow — each told in the
    alternatives-and-cost shape with what it *bought*.
  - **The joining idea:** the decision record exists *because* of the workspace — doc versioning is a
    required step of the phase review, so `decisions.md` is an artifact the process forces into
    existence rather than a file someone remembered to update.
  - **Accuracy note honored:** the explainer describes **two** executor tiers, not three; the stale
    `slice-executor-low` file is raised as a proposed next step instead of being described or fixed.
  - **For `P26.REVIEW`:** four actionable next steps proposed — archive the five finished phases,
    sweep the deferred triggers (**D17** and **D23** have plausibly already fired), retire the stale
    executor-tier file, and give the config seam a shared conformance fixture.

## Constraints

1. **`knowledge` slices are run INLINE by the orchestrator, never dispatched.** `/explain` is a
   *user-level* Claude Code skill (`~/.claude/skills/explain/`); it exists only on the main thread, so
   no `slice-executor` can run it. `--risk low` on `P26.S1`–`P26.S5` is **nominal bookkeeping, not a
   tier selector** — the same rule vocky P15 recorded. Only `P26.S6` (the README audit) is dispatched
   normally.
2. **Self-hosting: this phase writes into its own repo, over the network.** `/explain` derives
   `project` from the repo-root dirname, so these explainers are project **`knowledge`** and land at
   `docs/knowledge/<date>-<slug>.html` **in this repo** — the KB documenting itself, published on its
   own public site. `~/.config/knowledge-kb/config.json` points at the **hosted** API
   (`https://knowledge.hi2vi.com`), which writes, commits, **and pushes** to `origin/main`
   (`KB_GIT_PUSH: "true"` on the box). Consequence: **each explainer save appears as a `kb-api` commit
   on `origin/main` while local slice commits accumulate on local `main`.** The orchestrator must
   **`git pull --rebase` between explainer slices** to see its own output and to keep the two histories
   from diverging. This is the single biggest operational difference from vocky P15.
3. **KB verification gotcha** (recorded by vocky's `P15.REVIEW`): `https://knowledge.hi2vi.com` answers
   **403 Forbidden** to Python `urllib` (edge user-agent filtering) but **200** to `curl` with the same
   bearer token. Verify published documents with `curl`, as the `/explain` skill itself does.
4. **No `here` flag.** The confirmed intent is KB-only; do not write a `<TOPIC>_EXPLAINED.html` project
   copy into this repo.
5. **`docs/knowledge/` does not exist yet** — see *Other survey notes*. Expect the first save to create
   the project folder, its landing page, a Recent bullet, and a new Browse card.
6. **Repo blast radius.** The explainer slices change **no repo source**. The only intentional
   working-tree change in this phase is `README.md` (`P26.S6`), plus `works/` bookkeeping and whatever
   the KB API pushes into `docs/knowledge/`.
7. **Doc impact.** Explainer slices have **none by construction** (their output is KB content, not this
   repo's durable doc tracks). The README audit **may** surface drift against `docs/current/*.md` — if
   it does, that is a one-line note in the *Doc impact* list below for `P26.REVIEW` to consolidate,
   **not** a `doc-new-version` run by `P26.S6` itself. Widening the audit into `docs/current/` was
   explicitly declined by the operator.
8. **Audience is the new maintainer only.** A public / end-user-facing series (install the plugin, the
   CLI, `/knowledge:setup`, the MCP retriever, self-hosting) is explicitly a **separate later phase**.
   This maintainer series is the research pass that makes that one cheap to write.
9. **Keep the series at five.** Do not re-split a topic into extra slices mid-phase without the
   operator asking; if a grouping is too big for one `/explain` run, say so in that slice's `result.md`
   rather than silently thinning the coverage.

## Open Questions

- **Is `P26.S4` too much for one `/explain` run?** It carries ~1,606 doc lines plus the plugin
  packaging machinery, the deploy kit, and four CI workflows — the heaviest grouping in the cut. If one
  run cannot do it justice, record that in `P26.S4/result.md`; the pre-agreed re-split is
  *distribution + release* vs *security + prod topology + QA gates*.
- **Does the README audit (`P26.S6`) rise to a durable-truth change requiring a doc version at review?**
  `README.md` is not under `docs/`, so probably not on its own — but staleness items 2, 3, 7 and 8
  touch facts that `docs/current/operations.md` and `product.md` already state correctly, so the audit
  is expected to pull the README **up to** the durable docs rather than to surface new truth. `P26.S6`
  should decide explicitly and record it either way.
- **Does any explainer need the web-research section?** The subject is a private repo's own
  architecture, so the default judgment gate will likely skip it (as vocky's S1/S4 did) except where an
  external practice is genuinely being compared (vocky's S2/S3 included it). Leave the call to each run
  and record which way it went.

- **S6 (done):** `README.md` audited and fixed (84 → 118 lines), all six sections kept in order.
  All eleven pre-recorded items addressed:
  - **Item 1 (headline links) fixed** — re-verified live: `/graph/` → 308 → `/graph` → 307 →
    `/login` (sign-in wall, confirmed byte-for-byte as recorded) and `/` → 200 marketing landing
    (not a library index). The headline now points at `https://knowledge.hi2vi.com` (the product,
    described honestly as "sign in to browse") plus the **public** `/@leetusik/graph` (verified
    200, unauthenticated, renders a real `.kb-graph` mount) — a working anonymous entry point,
    unlike the old broken pair.
  - **Item 3 (web app) and item 5 (MCP) added** — a new short paragraph after the lede introduces
    all four distribution surfaces (web app, plugin, CLI, MCP) so a first-time reader gets the
    whole shape immediately; the web app and MCP are also named again in "How it's built" →
    Publish path.
  - **Item 4 (pretty share URLs) added** — a new "Pretty share links" bullet in "How it's built".
  - **Item 6 (CLI on-ramps) added** — the curl installer (verified live 200) replaces the bare
    `uv tool install` as the primary CLI install line (the `uv` form is kept as the "also usable
    directly" canonical channel); the env-var agent quickstart (`KB_API_BASE_URL` + `KB_API_TOKEN`,
    names confirmed against `web/src/content/marketing/content.ts`'s locked snippets) and the
    published `/SKILL.md` (verified live 200) are both new. The `knowledge init` line was already
    correct against `cli/README.md` — untouched.
  - **Item 2 (publish-path topology) fixed** — the retired P9 mkdocs-at-root description is
    replaced with the real three-upstream edge (api / web / mcp, cross-checked against
    `deploy/knowledge.conf` and `compose.prod.yml`); *fresh-on-write* is restated rather than
    deleted, as the plan asked.
  - **Item 7 (search + doc format) fixed** — "FTS5 full-text search" corrected to the real hybrid
    (BM25 + recency decay + Gemini cosine, RRF-fused), and the HTML-explainer document type is
    named.
  - **Item 8 (push claim) fixed** — "Nothing publishes until I push" is now scoped: the hosted box
    pushes every write itself (`KB_GIT_PUSH=true`); locally/plugin nothing pushes until the
    operator does.
  - **Item 9 (knowledge-map bullet) fixed** — now names *both* graphs and which is which: the
    hosted app's live in-app graph (linked) vs. the **local** MkDocs site's still-live static
    `graph_hook.py` build (self-hosters/plugin scaffold only) — confirmed `scripts/graph_hook.py`
    and the `kb` service in `compose.yml` are both still present and wired, i.e. this is not dead
    code, just not what production serves.
  - **Item 10 (restore claim) fixed, with a code-read finding.** `compose.yml` now
    unconditionally sets `DATABASE_URL` (unlike the "may be left empty" operations.md note), so a
    plain `docker compose up -d` restore *does* start Postgres/tenant mode. Traced
    `get_tenant_one_id()` (`server/api_auth.py`): with `KB_OPERATOR_EMAIL` unset (the local
    compose default), it returns `None` before touching Postgres at all — so the P10 cutover's
    documented crash-loop deadlock does **not** apply to a bare local restore, and the content
    plane still self-heals exactly as the old README claimed. The README now says so precisely:
    restore is still one command for browsing/searching; the accounts plane (signup/login) stays
    unmigrated/empty until an explicit `alembic upgrade head`. No code change — this was read-only
    verification, and the finding is now in the README text itself, not left as a gap.
  - **Item 11 (still-plausible claims) cross-checked, left alone where correct.** Plugin install
    lines, the Python/Docker/GitHub requirement list, and the "11 tracks" line all matched
    `docs/current/product.md` / `operations.md` and `plugin/README.md` verbatim — untouched except
    one small accurate addition (Connect vs. Scaffold mode, since Connect needs none of the listed
    requirements and the old text implied all installs need them).
  - **The doc-impact call, decided explicitly: NO durable-truth change.** Every correction in
    `README.md` pulls it up to what `docs/current/product.md` and `operations.md` *already* state
    correctly — no drift was found *in the durable docs themselves* during this audit. `README.md`
    is not under `docs/`, so this is not eligible for `doc-new-version` regardless. See the Doc
    impact line below.
  - **No code changes.** All verification was read-only (`grep`/`Read` of `server/*.py`,
    `compose.yml`, `compose.prod.yml`, `deploy/knowledge.conf`, `Dockerfile`, `Makefile`,
    `cli/README.md`, `plugin/README.md`) plus live `curl` checks — never Python `urllib`, per
    constraint 3. `git diff --stat` confirms the blast radius is exactly one file, `README.md`.

### Cross-slice notes from `P26.REVIEW`

- **Verdict: `pass`.** All seven slices validated together; the phase delivers the confirmed intent.
  Full evidence in `slices/P26.REVIEW/result.md`.
- **The series is verified real, not just reported.** `GET /api/documents?project=knowledge&limit=50`
  → `total: 5`, ids **29–33**, all `version: 1`, `format: html`; extracted-text lengths match every
  `result.md` figure **to the character** (25,242 · 26,037 · 22,047 · 20,566 · 17,730). Section order
  holds in all five (Background → Intuition → Code → [Best practices] → Quiz, 5 quiz questions each),
  doc 29 legitimately has no best-practices section or ToC entry (research `skipped-by-judgment`), and
  every cited domain survives text extraction — 30: `sqlite.org` `elastic.co` `fastapi.tiangolo.com`;
  31: `developer.mozilla.org`; 32: `cheatsheetseries.owasp.org` `nginx.org`; 33: `adr.github.io`.
  The five HTML files are genuinely self-contained (0 external scripts, 0 external stylesheets, one
  inline quiz `<script>` each).
- **It reads as a series, with substantive handoffs** — each part names its position ("Part *n* of a
  five-part series"), recaps what the previous one established, and points at the next. 31 opens
  exactly where 30 stopped ("a document on disk and a row in SQLite"); 33 explains why 1–4 exist.
- **Blast radius confirmed: `README.md` is the only source file in the entire phase.** No
  `docs/current/*.md`, no `docs/versions/`, no `docs/index.json` change anywhere. The five
  `docs(knowledge):` commits are authored by **`kb-api <kb-api@localhost>`** — the hosted API's own
  commits pulled in by rebase, and they sit *below* the decomposition commit in the log, which is what
  `git pull --rebase` between explainer slices is supposed to look like. §Constraints 2 honored; the
  histories never diverged.
- **The README audit's factual claims were re-derived from source, not taken on S6's word** — the
  edge map (`deploy/knowledge.conf`), `KB_GIT_PUSH: "true"` (`compose.prod.yml:58`), hybrid search
  (`server/search.py`, `RRF_K = 60`), the unconditional `DATABASE_URL` (`compose.yml:40`),
  `get_tenant_one_id()`'s early `None` (`server/api_auth.py:88`), and `scripts/graph_hook.py` +
  the `kb` service still being wired. One extra check worth recording: the README's
  `docker compose exec api alembic upgrade head` **is** the exact form `compose.yml`'s own comment
  prescribes, and the `Dockerfile` installs deps `--system` (no venv), so `alembic` is on PATH
  without `uv run` — the command as printed works.
- **S4's "do not re-split" recommendation: agreed, without reservation.** The 4–5 target in
  `intent.md` exists precisely to prevent the over-split vocky's first pass made; S4's enumerated gaps
  (usage metering, per-tenant usage isolation, CLI credential hygiene, the P10/P18/P19/P20 cutover
  histories) are peripheral to "full internal understanding"; and S4 being the *shortest* document
  while carrying the *largest* grouping reads as evidence of selection, not exhaustion. The right home
  for the gaps is one later targeted explainer, not a re-cut of P26.
- **S6's 118 lines: still an audit, not a rewrite.** Six sections survive in order with unchanged
  headings, the lede and the whole "Agentic workflow" section are untouched, and every insertion maps
  to a pre-recorded staleness item — most of the growth is content the intent itself called *missing*
  (web app, MCP, pretty share URLs, P20 CLI on-ramps), which can only be fixed by adding lines.
- **Series accuracy spot-checks all held**, including the two most falsifiable: `canonical_path`
  appears only in `documents_api.py` + `graph_api.py` and never in `main.py` (S3's resolution was
  right), and the in-repo comment at `web/src/app/(public)/documents/[id]/explainer-frame.tsx:61`
  independently states that `targetOrigin: "*"` is mandatory rather than lazy (S3's justified
  divergence was not invented).
- **Minor, pre-existing, not a P26 defect:** `phase.json.status` is still `planned` with
  `started_at: null` although every slice is done — P21–P24 show the identical pattern and all reached
  `done` via `review-phase`. `validate` passes.
- **Deliberately not fixed, surfaced instead:** `docs/current/operations.md:32` ("Locally
  `DATABASE_URL` may be left empty") is stale against `compose.yml:40`. This is drift the phase
  *observed*, not drift it *created*, so it is not the review's to consolidate. Operator's call
  whether it becomes a deferred job or a future doc pass.

## Doc impact

_Running list — one line per durable-truth change; `P26.REVIEW` consolidates these into doc versions._

- `P26.DECOMP`: none (planning only).
- `P26.S1`: **none** — by construction; the output is KB content (doc 29), not this repo's durable
  doc tracks.
- `P26.S2`: **none** — by construction (doc 30).
- `P26.S3`: **none** — by construction (doc 31).
- `P26.S4`: **none** — by construction (doc 32).
- `P26.S5`: **none** — by construction (doc 33).
- `P26.S6`: **none.** The README audit pulled the file up to what `docs/current/product.md` and
  `operations.md` already state correctly; no drift was found in the durable docs. `README.md` is
  not under `docs/` and is not a `doc-new-version` candidate regardless.
- `P26.REVIEW`: **list verified complete and correct — no doc versions created.** `git log --stat`
  over the whole phase shows no change to any `docs/current/*.md`, any `docs/versions/` file, or
  `docs/index.json`. (The `S1`–`S5` lines above were appended by the review: each slice declared
  "none — by construction" in its own `result.md` but had no line here. Bookkeeping completion only;
  no conclusion changed.)
