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

**P14.S2 reshape (do at S2 planning):** split S2 at fractional orders along the section seams — e.g. `S2`
tokens + app-rebase-to-`/app` + marketing route group/layout/header/footer + hero; `S2.3` mid sections
(what-it-is, how-it-works, save & search, pricing); `S2.6` the two interactive/visual features (connect
terminal, graph motif) + SEO file routes (`sitemap`/`robots`/`manifest`/OG). Confirm the exact cut when
planning S2 against `build-prompt.md`.

## Doc impact (running list — REVIEW consolidates; do not version docs here)

- `docs/current/frontend.md` — public landing + marketing surface; the additive marketing/band tokens
  (`--kb-band-*`, `--kb-accent-on-dark*`, etc.) in the KB design-system section.
- `docs/current/operations.md` — web Dockerfile / compose service / edge vhost, incl. the reworked edge
  routing (`/` → landing, `/app/*` → Next UI, control-plane JSON relocated) (closes the P14-deferred items).
- `docs/current/decisions.md` — landing lives in the same `web/` app and **takes over `/`**; the
  authenticated app **rebases to `/app`**; the FastAPI control-plane / mkdocs edge routes are relocated to
  make room (ADR).

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
