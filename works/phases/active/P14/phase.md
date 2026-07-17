# Phase P14: Landing Page & Product Webpage via Claude Design Gate

_Intent: see [intent.md](intent.md)._

## Objective

Design and ship the product landing page and public webpage through a hi2vi_web-style Claude Design gate (design canvas + DesignSync + operator sign-off), following the hi2vi_web stack and edge-deploy patterns

## Context

P14 is the last of the five-phase SaaS pivot (P10–P14). It ships the public **landing page +
marketing webpage** for `knowledge` (knowledge.hi2vi.com), designed through the **Claude Design
gate** and deployed on hi2vi_web's Next-standalone-in-Docker-behind-edge pattern. The web app under
`web/` already exists and is explicitly reserved for P14:

- **Web app** `web/` — Next 16 App Router, React 19, Tailwind v4 CSS-first, pnpm, `output:
  "standalone"`. Route groups `(app)` (authed) + `(auth)` (public). `web/src/app/page.tsx` is
  `redirect(token ? /dashboard : /login)` with the comment *"P14 replaces this with the public
  landing page."*
- **Marketing tokens already staged** in `web/src/app/globals.css` / `web/src/app/kb-tokens.css` —
  `--text-hero-display`, `--color-on-dark*` "for marketing dark bands (P14)", a `<Reveal>` scroll
  layer, and the marketing **pill button** `web/src/components/ui/button.tsx` "reserved for the P14
  public landing".
- **Copy-as-data** layer `web/src/content/*.ts`.
- **Deploy gap:** no `web/Dockerfile` and no web compose service yet (P12 deferred both to P14).
  Today the edge (`deploy/knowledge.conf` → OCI `edge-nginx`) routes `/api /auth /app /healthz` →
  `knowledge-api` (FastAPI) and `/` → `knowledge-site` (mkdocs). The Next BFF uses `/api/auth/*`,
  which collides with the edge's `/api/*`→FastAPI rule — P14 deploy must resolve this.

## Decomposition

Three middle slices, plus the untouched `P14.REVIEW`. The shape follows the **design-cowork** model
("one phase: design slice → implement slice") with a design-independent deploy seam bolted on. All
three are **`high`** risk — brand-defining and edge-touching, nothing fully mechanical — so there
are no `low` slices.

| Slice | Name | Kind | Risk | Order | Depends on |
|-------|------|------|------|-------|-----------|
| P14.S1 | Design gate: landing + public marketing pages (Claude Design round 1) | co-work | high | 1 | — |
| P14.S2 | Implement the landing + marketing pages from the read-back spec | implementation | high | 2 | P14.S1 |
| P14.S3 | Ship the web app: standalone Dockerfile + knowledge-web compose service + edge vhost routing | implementation | high | 3 | — |

**Rationale**

- **P14.S1 — design gate (`co-work`, high).** Round **1 only**. **Orchestrator-inline / never
  dispatched** — executors have no DesignSync tool, so the orchestrator runs the read-back on the
  main thread (a deliberate exception to the delegation rule). S1 writes **only** `handoff.md`
  (what to design + the required card set), pushes the branch so Claude Design can Connect-GitHub,
  holds a hard `pending` gate while the operator + Claude Design redesign, reads the returned cards
  back with **DesignSync** (read-back only), **lands the design AS-IS** + records SIGNOFF, and writes
  the approved-direction spec into `phase.md`. **No code**, no mockups, no cards of our own.
- **P14.S2 — implement landing (`implementation`, high, depends on S1).** Builds from S1's
  `build-prompt.md`: reclaim `/` (replace the `page.tsx` redirect), add a `(marketing)` route group,
  section content under `web/src/content/`, section components under `web/src/components/{sections,ui}/`,
  reusing the staged marketing tokens + pill button. **Expect the read-back to re-shape S2** — after
  the gate, split it at fractional orders (e.g. `2.3`, `2.6`) along per-section seams and an SEO file
  route seam (`sitemap.ts` / `robots.ts` / `manifest.ts` / OG image). **Do not over-plan S2 before
  S1 lands** — the design dictates the section breakdown.
- **P14.S3 — deploy (`implementation`, high).** Design-independent, so **not** dependent on S1/S2's
  visual outcome (it can be planned in parallel). Adds a new `web/Dockerfile` (multi-stage
  `node:22-slim`, standalone, hi2vi_web pattern), a `knowledge-web` service in `compose.prod.yml`
  (`expose: 3000`, no host ports, `changple_shared_network`), and new `location` rules in
  `deploy/knowledge.conf` routing the Next app while **preserving** the `/api /auth /app /healthz`→
  FastAPI contract and resolving the `/api/auth/*` collision. **Likely ends in a `pending` operator
  gate** for the actual edge deploy (scp + `ssh … ./deploy.sh`), mirroring P13's edge-deploy gate.

## Findings & Notes

- **Design-cowork current model is the authority.** Author **nothing** but `handoff.md` — no canvas
  mirror, no `tokens.css`, no cards of our own. Claude Design reads the real repo (Connect GitHub)
  and **authors the card set itself**; the cards stay in the design project. Require three outputs
  from the round: **the card set** (one line-1 `@dsCard` marker per reviewable unit — prose alone is
  not a round), **`result.md`**, and **`build-prompt.md`**. Keep the design record under
  `docs/reference/design/rounds/01-landing/` (S1 confirms the exact path; the repo may instead use a
  `web/design/` tree). Note: the older hi2vi_web canvas-mirror + `tokens.css` pattern described in
  `intent.md` is **superseded** by the current design-cowork skill for this repo — S1 follows the
  skill, not the older intent wording.
- **Reference patterns (data, not proposals).** hi2vi_web `src/app/(marketing)/`,
  `src/content/sections/`, `src/components/{sections,ui}/`, its `Dockerfile` + `compose.prod.yml` +
  `deploy/edge/`; and the KB marketing tokens already staged in `web/src/app/globals.css`. Reference
  only — never port another product's design and call it our design system.
- **Deploy invariants to preserve** (from `deploy/knowledge.conf`): most-specific `location` wins;
  Docker DNS re-resolution (`resolver 127.0.0.11` + `set $upstream` + variable `proxy_pass`); never
  `default_server`; no IPv6 `listen`; Cloudflare real-IP restore; `nginx -t` gate before graceful
  reload; never recreate `edge-nginx`.

## Approved design direction — Round 01 (P14.S1 read-back, 2026-07-18)

**Design landed AS-IS** from the *Knowledge Base Design System* Claude Design project (id
`f49ab425-e75f-46c4-a6fa-48bb9938b203`, `marketing/` group — 12 cards: Foundations 2 · Landing 9 ·
Components 1). Record (read-only) at `web/design/rounds/01-landing/output/`: `result.md`, `build-prompt.md`,
`tokens.css`, `marketing.css`; SIGNOFF at `web/design/rounds/01-landing/SIGNOFF.md`. **`build-prompt.md` is
the implementation contract for P14.S2** (real copy verbatim, section specs, band order, a11y floor). The
pane cards remain the canonical visual; the two `.css` files are read-only *reference*, rebuilt as Tailwind
utilities in S2 (not ported).

**Five decisions (resolved in the design):**
1. Wordmark **`knowledge`** (lowercase); tagline **"Durable knowledge for developers and their coding
   agents."**; hero promise **"Knowledge that outlives the conversation."**
2. Pricing = a **Free ($0/forever)** card beside an **"Agent Retrieval API — Coming"** waitlist tier (honest
   free-only launch; names the deferred paid surface → P15).
3. **Landing takes over `/`; the authenticated app rebases to `/app`.** All CTAs + "Sign in" → `/app`.
4. **Dark hero** (echoes the login threshold), opening into light editorial bands, back to charcoal for the
   connect section + footer. A light-hero swap is one class (the *Tonal bands* card shows both).
5. **Type-led, illustration-only** — a real-command terminal + a graph motif from the system's own marks. No
   photography, no invented screenshots (slots ready if assets arrive).

**Section + band order (S2 builds top→bottom):** header/nav → hero (dark) → what-it-is/three-ways-in (paper)
→ how-it-works (sunken) → save & hybrid search (paper) → connect your agent (dark) → knowledge graph (paper,
recessed plate; reuse the live graph renderer) → pricing (paper) → final CTA + footer (dark → deep).

**Token delta — ADDITIVE (state for SIGNOFF): not "None".** New marketing/band tokens for
`web/src/app/globals.css` `@theme` (values in `build-prompt.md §1`): `--color-on-dark-hint`,
`--kb-band-dark/-soft/-deep`, `--kb-border-on-dark(-strong)`, `--kb-accent-on-dark(/-strong/-soft)`,
`--kb-shadow-card`, and data-viz inks `--kb-ink-{teal,bronze,plum}(-dark)`. The **locked `--kb-*` palette and
the already-staged marketing `--text-*` / `--color-on-dark(-muted)` / `--color-on-primary` / spacing /
container tokens are UNCHANGED** — no locked token renamed.

**Departures logged (result.md):** retrieval API has no standalone feature card (lives in the value triad +
how-it-works step 4 + pricing); Final CTA + Footer share one card; `marketing.css` added beyond the required
`tokens.css`; copy drafted real (the dated in-play exception); `Components` is a pre-existing pane group.

### ⚠ Routing collision to resolve in P14.S2/S3 (NEW — surfaced by the read-back)

Decision #3 rebases the Next authenticated UI to **`/app/*`** — but the edge (`deploy/knowledge.conf`,
P13.S5) already routes **`/app/*` and `/auth/*` → `knowledge-api` (FastAPI control-plane JSON for the CLI)**,
and **`/` → `knowledge-site` (mkdocs)**. So shipping this design forces two reconciliations:
- **`/` (edge):** must serve the Next **landing** instead of mkdocs — decide the mkdocs docs site's new home
  (subpath/subdomain) or whether it stays.
- **`/app/*` (edge):** the Next authenticated UI and the FastAPI CLI control-plane **both want `/app/*`**.
  Resolve without breaking the P13 CLI edge contract — e.g. relocate the control-plane JSON under a namespaced
  prefix (verify what path the CLI actually calls: `cli/src/knowledge_cli/client.py` / `config.py`), or route
  by a more specific location. **Respect the design** (`/app` for the UI); do not silently pick a different UI
  prefix. This is an S3 (edge/compose) concern with an S2 (Next route group + BFF `/api/auth/*`) dependency —
  plan them together. Also re-check the Next BFF `/api/auth/*` vs edge `/api/*`→FastAPI collision noted in
  Constraints.

**Resolution (operator, 2026-07-18): keep the app at its current paths; do NOT rebase to `/app`.** The
`/app` prefix is the only thing that collided with the CLI, and the app doesn't need it — the landing frees
`/` on its own. Final topology, all in the knowledge `web/` app on `knowledge.hi2vi.com` (one repo, one
domain, no subdomain, no CLI change):
- **Landing → `knowledge.hi2vi.com/`** (the Next app's root; replaces the `page.tsx` redirect). Its "Sign in"
  → `/login`, "Get started" → `/signup` (the design's `/app` CTA targets become the app's real paths).
- **App UI stays at `/dashboard`, `/graph`, `/documents`, `/projects`** (and `/login`, `/signup`) — no rebase,
  so nothing collides with the CLI's `/app //auth //api`.
- **CLI control plane unchanged:** `/auth/* //app/* //api/*` → FastAPI, exactly as P13 shipped.
- (Considered `hi2vi.com/knowledge` for the landing — rejected: it splits the landing into the separate
  hi2vi_web repo/site + design system and buys nothing over serving it from the knowledge app.)

This is a non-visual routing decision by the operator that supersedes the design's decision #3 (`/app`); the
landing's visual design is unchanged — only the CTA link targets shift from `/app` to `/login` / `/signup`.

**Edge reconciliation → P14.S3** (not S2): keep `/api/ //auth/ //app/ //healthz` → `knowledge-api` (FastAPI,
unchanged) but add a **more-specific `location /api/auth/` → `knowledge-web`** (the Next BFF; FastAPI has no
such route), and route **everything else (`/`, `/dashboard`, `/graph`, …) → `knowledge-web`** (the Next app).

**Docs-site decision (operator, 2026-07-18): RETIRE the mkdocs `knowledge-site` from the edge.** It only
served the operator's personal KB (tenant #1); that content lives on **as tenant #1's knowledge** (the app's
browse/search/read + graph, and the API) — nothing is lost. Drop the `site` service from `compose.prod.yml`
and the `location / → knowledge-site` rule. **`/docs` is reserved for FUTURE product documentation** (a later
effort) — S3 does **not** claim it. **Consequence for S3:** repoint `KB_PUBLIC_BASE_URL` (currently the mkdocs
viewer root) so the API's written-doc `url` field isn't a dead link — target the public `docs/` GitHub Pages
(Track 1) or degrade cleanly; confirm the exact target in the S3 plan.

**P14.S2 scope (no reshape / no split):** with the `/app` rebase dropped, S2 is just **build the landing** —
one cohesive `implementation`/high slice. No auth-app route changes, no BFF path changes.

## P14.S2 — landing implementation notes (2026-07-18)

Landing shipped at `/` in `web/`, built from `output/build-prompt.md`. Cross-slice facts later slices (esp.
S3 deploy + REVIEW) should build on:

- **`/` is now the `(marketing)` route group** (`web/src/app/(marketing)/{layout,page}.tsx`). The old
  `web/src/app/page.tsx` root redirect was **deleted** (two `page.tsx` can't both resolve to `/`) — this is
  the intended "landing takes over `/`". The auth app is UNTOUCHED at `/dashboard //graph //documents
  //projects //login //signup`; the BFF `/api/auth/*` and `KB_API_BASE_URL` are unchanged. **S3's edge rule
  "everything else → `knowledge-web`" is correct as planned.**
- **CTA targets are the app's real paths** (operator resolution, not the design's `/app`): Sign in / Open the
  app → `/login`, Get started(— free) → `/signup`. The guide / CLI / Claude-Code / waitlist CTAs point at the
  **live GitHub repo** (`…/leetusik/knowledge` — `cli` README = guide, `cli#install`, `plugin` README =
  connect, repo home = the deferred-API roadmap), because the mkdocs docs site at `knowledge.hi2vi.com/` is
  displaced by this landing. **S3 must still decide the mkdocs site's new home** (subpath/subdomain/retire) —
  the landing does not depend on it, but the footer/guide CTAs currently route to GitHub, not the docs site.
- **Tokens:** the build-prompt §1 band set landed **additive** in `globals.css @theme` (`--kb-band-*`,
  `--kb-border-on-dark*`, `--kb-accent-on-dark*`, `--color-on-dark-hint`, `--kb-shadow-card`, data-viz inks
  `--kb-ink-{teal,bronze,plum}(-dark)`). No locked `--kb-*` token renamed/revalued. The **tonal-band mechanic**
  is a scoped cascade re-point of the app's semantic `--color-green*` aliases within `.mkt-band--dark`/`--deep`
  (marketing.css), so the reused CVA pill button auto-steps to the on-dark teal — no second button system.
- **Graph motif** = a faithful **static** canvas (`components/marketing/graph-motif.tsx`) reusing
  `(app)/graph/graph-canvas.tsx`'s drawing grammar posed to the designed composition (it does NOT import the
  live force-sim renderer or its `(app)` CSS). Info panel + legend are JSX overlays on the recessed plate.
- **Both schemes:** no in-page toggle (matches the app's per-route fixed-scheme pattern); the marketing root
  follows OS `prefers-color-scheme` via a pre-paint inline script (SSR default = light), dark bands are
  scheme-independent.
- **Copy-fidelity gap for REVIEW's visual pass:** build-prompt §4 quotes no lede text for feature-save /
  feature-connect / feature-graph (only the topic) and no per-step sentence for how-it-works, so — honoring
  "never invent copy" — those render H2 + verbatim ticks/tokens + the visual, no fabricated lede. All designed
  *structural* elements ship; if the operator has the exact card lede/step text it drops into
  `content/marketing/content.ts`. Not a design simplification.
- **SEO:** `web/src/app/{sitemap,robots,manifest}.ts` added (landing indexes; app/auth/BFF disallowed).
- **Validation:** `pnpm build` (`/` prerendered Static; app routes still Dynamic; SEO routes generated),
  `pnpm lint`, `pnpm typecheck` all clean; `/login //dashboard //signup` verified still working.

## Doc impact (running list — REVIEW consolidates; do not version docs here)

- `docs/current/frontend.md` — public landing + marketing surface (the `(marketing)` route group at `/`, the
  section components, the content-as-data copy layer); the additive marketing/band tokens (`--kb-band-*`,
  `--kb-accent-on-dark*`, `--color-on-dark-hint`, `--kb-shadow-card`, data-viz inks `--kb-ink-*`) + the
  tonal-band mechanic in the KB design-system section; the graph motif as a static reuse of the app renderer.
- `docs/current/operations.md` — web Dockerfile / compose service / edge vhost, incl. the reworked edge
  routing (`/` → landing, control-plane JSON kept; mkdocs site's new home) (closes the P14-deferred items).
  [S3]
- `docs/current/decisions.md` — landing lives in the same `web/` app and **takes over `/`** (the root redirect
  is dropped); per the operator resolution the authenticated app **stays at its current paths** (no `/app`
  rebase — supersedes the design's decision #3), so nothing collides with the CLI's `/api //auth //app` edge
  contract (ADR).

## Constraints

- **S1 is orchestrator-inline / never dispatched** (DesignSync is main-thread only) and writes only
  `handoff.md` + the read-back spec into `phase.md` — no code, no cards of our own.
- **A design slice never writes implementation code**, and implementation must **respect the design
  as-is** — never drop, simplify, or "improve" a designed element to save effort.
- **S2 depends on S1**: no landing implementation before the design lands. Expect S2 to be split into
  fractional-order sub-slices once the read-back spec exists.
- **Deploy must preserve the existing edge contract**: `/api /auth /app /healthz`→`knowledge-api`
  stays intact, and the `/api/auth/*` BFF-vs-FastAPI collision must be resolved without breaking it.

## Open Questions

_Left for their slices — do not answer here._

- Exact design record path — `docs/reference/design/rounds/01-landing/` vs a `web/design/` tree (S1).
- Whether the landing takes over `/` directly vs a `(marketing)` route group that also resolves to
  `/` (S1/S2).
- Pricing/plan presentation given the free-only launch (paid retriever deferred) — S1's `handoff.md`
  poses this back to the operator rather than deciding it.
