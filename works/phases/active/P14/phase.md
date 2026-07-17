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

## Doc impact (running list — REVIEW consolidates; do not version docs here)

- `docs/current/frontend.md` — public landing + marketing surface.
- `docs/current/operations.md` — web Dockerfile / compose service / edge vhost (closes the
  P14-deferred deploy items).
- Possible `docs/current/decisions.md` entry — landing lives in the same `web/` app and takes over `/`.

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
