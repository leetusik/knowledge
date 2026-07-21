# P14.DECOMP — Plan (native, orchestrator-written)

Decompose **P14: Landing Page & Product Webpage via Claude Design Gate** into its middle slices and seed
`phase.md`. You are `slice-executor-high`. This slice **creates bare slice folders and writes `phase.md`
only** — no source code, no docs, and **do not pre-fill any slice's `plan.md`** (each is planned at its turn).

## Context you can rely on (already verified by the orchestrator)

P14 is the last of the five-phase SaaS pivot. It ships the public **landing page + marketing webpage** for
`knowledge` (knowledge.hi2vi.com), designed through the **Claude Design gate** and deployed on hi2vi_web's
Next-standalone-in-Docker-behind-edge pattern. Read `intent.md` for the confirmed intent.

Everything the landing builds on already exists under `web/` and is explicitly reserved for P14:
- **Web app** `web/` — Next 16 App Router, React 19, Tailwind v4 CSS-first, pnpm, `output: "standalone"`.
  Route groups `(app)` (authed) + `(auth)` (public). `web/src/app/page.tsx` is `redirect(token ? /dashboard :
  /login)` with comment *"P14 replaces this with the public landing page."*
- **Marketing tokens already staged** in `web/src/app/globals.css` / `web/src/app/kb-tokens.css` —
  `--text-hero-display`, `--color-on-dark*` "for marketing dark bands (P14)", a `<Reveal>` scroll layer, and
  the marketing **pill button** `web/src/components/ui/button.tsx` "reserved for the P14 public landing".
- **Copy-as-data** layer `web/src/content/*.ts`.
- **Deploy gap:** no `web/Dockerfile` and no web compose service yet (P12 deferred both to P14). Today the edge
  (`deploy/knowledge.conf` → OCI `edge-nginx`) routes `/api /auth /app /healthz` → `knowledge-api` (FastAPI)
  and `/` → `knowledge-site` (mkdocs). The Next BFF uses `/api/auth/*`, which collides with the edge's
  `/api/*`→FastAPI rule — P14 deploy must resolve this.

## 1. Create three middle slices (bare folders — `new-slice` only)

Run exactly these (adjust nothing but obvious typos):

```
python3 scripts/workflow.py new-slice --phase P14 --slice P14.S1 \
  --name "Design gate: landing + public marketing pages (Claude Design round 1)" \
  --kind co-work --risk high --order 1
python3 scripts/workflow.py new-slice --phase P14 --slice P14.S2 \
  --name "Implement the landing + marketing pages from the read-back spec" \
  --kind implementation --risk high --order 2 --depends-on P14.S1
python3 scripts/workflow.py new-slice --phase P14 --slice P14.S3 \
  --name "Ship the web app: standalone Dockerfile + knowledge-web compose service + edge vhost routing" \
  --kind implementation --risk high --order 3
```

Do **not** create any plan.md in those folders. Leave `P14.REVIEW` untouched.

## 2. Seed `phase.md`

Fill the **Decomposition**, **Findings & Notes**, **Constraints**, and **Open Questions** sections. Include:

**Decomposition + rationale**
- The three-slice table (S1 design gate `co-work`/high; S2 implement landing `implementation`/high dep S1;
  S3 deploy `implementation`/high) with the shape rationale: design-cowork "one phase: design slice →
  implement slice", plus a design-independent deploy seam. All `high` — brand-defining + edge-touching, nothing
  fully mechanical, so no `low` slices.
- **S1 (design gate)** is `co-work`, **round 1 only**, **orchestrator-inline / never dispatched** (executors
  have no DesignSync). Writes **only** `handoff.md`, pushes the branch, holds a hard `pending` gate, reads cards
  back via DesignSync, lands AS-IS + SIGNOFF + writes the approved-direction spec into `phase.md`. No code.
- **S2** implements from S1's `build-prompt.md`: reclaim `/`, add a `(marketing)` route group, section content
  in `web/src/content/`, section components, reusing the staged marketing tokens + pill button. **Expect the
  read-back to re-shape S2** — split at fractional orders (e.g. `2.3`, `2.6`) after the gate (per-section seams;
  SEO file routes `sitemap.ts`/`robots.ts`/`manifest.ts`/OG image). Do not over-plan before S1.
- **S3** deploy: new `web/Dockerfile` (multi-stage `node:22-slim`, standalone, hi2vi_web pattern), a
  `knowledge-web` service in `compose.prod.yml` (`expose: 3000`, no host ports, `changple_shared_network`), new
  `location` rules in `deploy/knowledge.conf` routing the Next app while **preserving** the `/api /auth /app
  /healthz`→FastAPI contract and resolving the `/api/auth/*` collision. Likely ends in a **`pending` operator
  gate** for the actual edge deploy (scp + `ssh … ./deploy.sh`), mirroring P13's edge-deploy gate.

**Findings & Notes**
- **Design-cowork current model is the authority:** author **nothing** but `handoff.md` — no canvas mirror, no
  `tokens.css`, no cards of our own. Claude Design reads the real repo (Connect GitHub) and **authors the card
  set itself**; cards stay in the design project. Require three outputs: **the card set** (one `@dsCard` per
  reviewable unit), **`result.md`**, **`build-prompt.md`**. Design record under `docs/reference/design/rounds/
  01-landing/` (S1 confirms exact path; repo may use its `web/design/` tree). Note the older hi2vi_web
  canvas-mirror+`tokens.css` pattern is superseded by this skill for our repo.
- **Reference patterns (data, not proposals):** hi2vi_web `src/app/(marketing)/`, `src/content/sections/`,
  `src/components/{sections,ui}/`, its `Dockerfile` + `compose.prod.yml` + `deploy/edge/`; and the KB marketing
  tokens already in `web/src/app/globals.css`.
- **Deploy invariants to preserve** (from `deploy/knowledge.conf`): most-specific `location` wins; Docker DNS
  re-resolution (`resolver 127.0.0.11` + `set $upstream` + variable `proxy_pass`); never `default_server`; no
  IPv6 listen; Cloudflare real-IP restore; `nginx -t` gate before graceful reload; never recreate `edge-nginx`.

**Doc impact (running list for REVIEW to consolidate — do not version docs here)**
- `docs/current/frontend.md` — public landing + marketing surface.
- `docs/current/operations.md` — web Dockerfile / compose service / edge vhost (closes the P14-deferred items).
- Possible `docs/current/decisions.md` entry — landing lives in the same `web/` app and takes over `/`.

**Open Questions** — leave for their slices (do not answer): exact design record path (S1); whether the landing
takes over `/` vs a `(marketing)` group both resolving to `/` (S1/S2); pricing/plan presentation given free-only
launch (deferred paid retriever) — S1 handoff poses it back to the operator.

## Definition of done

- `P14.S1`, `P14.S2`, `P14.S3` exist as bare folders (`slice.json` only, no `plan.md`).
- `phase.md` filled as above. `P14.REVIEW` untouched.
- Write `result.md` summarizing what you created. Append any cross-slice notes to `phase.md`.
- Return a structured `done` verdict. Do **not** commit, do **not** transition slice/phase status, do **not**
  version docs.
