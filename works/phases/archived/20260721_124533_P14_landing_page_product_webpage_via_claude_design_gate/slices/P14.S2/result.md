# P14.S2 — Result: build the public `knowledge` landing page

**Status: done.** The public marketing landing ships at `/` in the Next app under `web/`, built from
`web/design/rounds/01-landing/output/build-prompt.md` (the implementation contract) and the phase's approved
design direction. All nine sections render in band order, with real verbatim copy in both schemes, and the
authenticated app stays at its current paths (untouched).

## What I built

**Route / takeover of `/`**
- Added a public, indexable `(marketing)` route group: `web/src/app/(marketing)/{layout,page}.tsx`.
- Deleted `web/src/app/page.tsx` (the old `redirect(token ? /dashboard : /login)` root bounce) so `/` resolves
  to the marketing group — two `page.tsx` cannot both resolve to `/`. This is the plan's "replace page.tsx's
  redirect so `/` renders the landing (drop the auto-bounce)."
- `page.tsx` composes the sections top→bottom; `layout.tsx` carries the scheme root, a skip-to-content link,
  the marketing metadata (indexable title/description/OpenGraph, canonical `/`), and imports the marketing CSS.

**Tokens (additive only — `web/src/app/globals.css` `@theme`)**
- Added verbatim from build-prompt §1: `--color-on-dark-hint`, `--kb-band-dark/-soft/-deep`,
  `--kb-border-on-dark(-strong)`, `--kb-accent-on-dark(/-strong/-soft)`, `--kb-shadow-card`, and the data-viz
  inks `--kb-ink-{teal,bronze,plum}(-dark)`. **No existing token renamed or revalued.** The staged marketing
  scale / `--color-on-dark(-muted)` / `--color-on-primary` / spacing / container / radius / `[data-reveal]`
  layer are reused as-is.

**Content-as-data** (`web/src/content/marketing/`, extends the `@/content` pattern) — `links.ts` (every CTA
target + local section ids), `content.ts` (all section copy, header + footer), `terminals.ts` (the two CLI
terminal scripts), `graph-motif.ts` (the static graph composition + panel/legend copy), `index.ts` barrel.
Copy is verbatim from build-prompt §4.

**Sections** (`web/src/components/marketing/`, separate from `app-shell/`) — `marketing-header` (sticky-scroll
island), `hero` (dark + onboarding terminal + teal radial glow), `value-triad` (what-it-is), `how-it-works`
(sunken, 4 steps), `feature-save` (paper + search motif with `<mark>` highlights), `feature-connect` (dark,
flipped + day-to-day terminal), `feature-graph` (paper recessed plate + graph motif + info panel + legend),
`pricing` (Free + waitlist), `final-cta` (dark), `footer` (deep). Shared `primitives.tsx` (Band / Container /
Eyebrow / Ticks / Chip / CtaLink / RichText) + `terminal.tsx` + `graph-motif.tsx` + `marketing.css`.

**Reuse (no second systems):** the CVA pill `buttonVariants` from `components/ui/button.tsx` for every CTA
(`secondaryOnDark` on dark bands; primary auto-steps to the on-dark teal via the band context — see below); the
existing `<Reveal>` island + `[data-reveal]` layer; the `next/font/local` fonts via `lib/fonts.ts`. Sections
are server components; the only client islands are the header (scroll state), the graph motif (canvas), and
`<Reveal>`.

**Tonal-band mechanic (build-prompt §2).** A dark band is a scoped context, not a scheme flip. `marketing.css`
re-points, *within* `.mkt-band--dark`/`--deep`, the app's **semantic** accent aliases `--color-green*` (+
`--color-on-primary` → dark ink) to the `--kb-accent-on-dark*` tier, and the `--mkt-*` text/border helpers to
the on-dark tiers. No locked `--kb-*` token is renamed/revalued — this is a scoped cascade override, so the
reused pill button's fill + hover + the global focus ring all auto-step on dark bands. Band order verified:
hero (dark) → what-it-is (paper) → how-it-works (sunken) → save (paper) → connect (dark) → graph (paper,
recessed plate) → pricing (paper) → final CTA (dark) → footer (deep).

**SEO (light):** `web/src/app/{sitemap,robots,manifest}.ts` — landing-only sitemap, robots allowing `/` and
disallowing the private app/auth/BFF paths, a minimal manifest (paper/teal, book-spark logo). No OG image
(optional per the prompt).

## Guide-CTA target chosen

The mkdocs docs site currently at `knowledge.hi2vi.com/` is being displaced by this landing (P14.S3), so the
stable, non-dead destinations are the **live GitHub repo** surfaces (`links.ts`, centralized):
- **Guide nav + "Read the guide" + value-card "Connect →"** → `…/leetusik/knowledge/tree/main/cli` (renders
  `cli/README.md`, the full CLI guide).
- **"Install the CLI"** → `…/tree/main/cli#install`.
- **"Connect Claude Code"** → `…/tree/main/plugin` (renders `plugin/README.md`, the `/knowledge:explain`
  plugin).
- **"Join the waitlist" / value-card 03** → the repo home `…/leetusik/knowledge` (the Agent Retrieval API is
  deferred to P15 with no waitlist form yet; the repo is where the roadmap lives).
- App CTAs use the app's **real** paths per the operator's routing resolution: "Sign in"/"Open the app" →
  `/login`, "Get started (— free)" → `/signup`. No `/app` rebase. No dead links (all verified 200 / live).

## Graph-motif decision (the highest-risk hotspot)

Built a **faithful static canvas render** (`graph-motif.tsx`) that reuses `(app)/graph/graph-canvas.tsx`'s
drawing grammar — the same node + cutout-rim, hollow-tag-ring, dashed-ghost, related-edge-with-arrowhead,
focus-halo (radial gradient), offset selection-ring, and haloed-label vocabulary, plus the same **live token
read** (`getComputedStyle` of the scheme-resolved `--mkt-ink-*` / `--mkt-graph-*` inks) — but posed to the ONE
designed composition rather than run through the force sim. It renders the focused teal neighborhood (halo +
offset ring), bronze/plum dim nodes, a hollow tag ring, and a dashed ghost; the floating **info panel**
(project chip · title incl. `요청은 어디로 가는가` · `date · N tags · N links` · tag pills · "Read the
explainer →") and the bottom-left **legend** (project inks + count + tag switch + "Size = connections") are
JSX overlays on the recessed `--kb-surface-sunken` plate. It draws once and redraws on resize + scheme change;
no rAF loop, interaction, or persistence.

Rationale for static over the live force-sim renderer: the live renderer produces a non-deterministic layout
(not the designed composition) and would couple the marketing surface to the `(app)` graph CSS/data types the
plan says not to touch. The plan explicitly permits "a faithful static/simplified render … only if it matches
the designed composition" — it does (teal neighborhood, bronze/plum dim nodes, info panel, legend). Did not
escalate: the drawing grammar port was tractable at this tier.

## Validation (all clean)

| Command | Result |
|---|---|
| `cd web && pnpm build` | ✓ Compiled + TypeScript pass; `/` prerendered **○ Static**; `/dashboard /login /signup` still **ƒ Dynamic**; `/sitemap.xml /robots.txt /manifest.webmanifest` generated |
| `pnpm lint` | ✓ clean (no output) |
| `pnpm typecheck` | ✓ clean (after `next dev`/`build` regenerated the stale `.next/dev/types` validator that referenced the deleted `page.tsx`) |
| `pnpm dev` (127.0.0.1:3030) drive `/` | ✓ all 8 id'd bands in order (`top → what-it-is → how-it-works → save → connect → graph → pricing → get-started`) + footer; every headline + Korean string (`요청은 어디로 가는가`, `지식이 오래 남도록`) present; graph plate/canvas/panel/legend + both terminals + search `<mark>` render |
| CTA hrefs (rendered) | ✓ `/login` ×4, `/signup` ×5, repo `cli`/`cli#install`/`plugin`/home — no dead links |
| App still works | ✓ `/login` 200 (dark slate gate, email/password form), `/dashboard` 307→login (unauth), `/signup` 200 |
| Reveal + reduced-motion | ✓ 0 `data-reveal` in SSR (settled state is the baseline; island arms it only under `no-preference`) |
| Scheme root | ✓ `#mkt-root` SSR `data-md-color-scheme="default"`; pre-paint inline script points it at OS `prefers-color-scheme` (both schemes render for real visitors; dark bands are scheme-independent) |
| Dev server log | ✓ no errors/warnings |

Horizontal overflow: guarded structurally (container `max-w-page` + responsive `px`, grids stack to 1-col on
mobile, `word-break: keep-all` on headings, terminal `overflow-x:auto`, graph plate `overflow:hidden`) — not
pixel-verified without a browser; called out for the review's visual pass.

## Deviations from `plan.md` / build-prompt

1. **CTA link targets** are `/login` / `/signup` (the app's real paths), **not** the build-prompt §0/§7 `/app`
   rebase. This follows the phase's operator Resolution (keep the app at its current paths); it is a non-visual
   routing change only — the landing's visual design is unchanged.
2. **Two mid-feature ledes not shipped as prose.** build-prompt §4 quotes verbatim ledes for hero /
   what-it-is / pricing / final-cta, but only NAMES the *topic* of the feature-save / feature-connect /
   feature-graph ledes ("Lede + three ticks", "Lede on `knowledge init`", "Lede on nodes/edges/`related:`") —
   it quotes no lede text. Per the hard "copy is real, never invented" rule I did **not** fabricate them;
   those three sections render H2 + the verbatim §4 ticks + the visual. The tick phrases and the Free-tier
   5-item list are the real §4 / result.md content, lightly rejoined into tick strings (no new claims). **This
   is a copy-fidelity gap, not a dropped design element** — every designed structural element ships. If the
   operator/reviewer has the exact card lede + how-it-works step sentences, they drop straight into
   `content/marketing/content.ts`.
3. **How-it-works steps** render title + real mono token (+ the step-4 "Coming — the one paid surface" note)
   exactly as §4 specifies; §4 gave no per-step sentence, so none was invented.
4. **Graph info-panel "Read the explainer →"** is styled text, not an anchor — it is part of the illustrated
   info panel and there is no real public doc URL, so this avoids a dead/confusing link. It is not one of the
   plan's routed CTAs.
5. **Both-schemes mechanism:** the app has no in-page theme toggle (per-route fixed scheme is the app's own
   pattern), so the landing follows the OS `prefers-color-scheme` via a pre-paint inline script on `#mkt-root`
   (SSR/no-JS default to the light `default` scheme). The scheme-independent dark bands deliver the light+dark
   rhythm regardless of scheme.

## Files

- Modified: `web/src/app/globals.css` (additive band tokens)
- Deleted: `web/src/app/page.tsx` (root redirect → landing owns `/`)
- New route: `web/src/app/(marketing)/layout.tsx`, `web/src/app/(marketing)/page.tsx`
- New SEO: `web/src/app/sitemap.ts`, `web/src/app/robots.ts`, `web/src/app/manifest.ts`
- New content: `web/src/content/marketing/{index,links,content,terminals,graph-motif}.ts`
- New components: `web/src/components/marketing/{marketing.css, primitives.tsx, band via primitives,
  marketing-header.tsx, hero.tsx, terminal.tsx, value-triad.tsx, how-it-works.tsx, feature-save.tsx,
  feature-connect.tsx, feature-graph.tsx, graph-motif.tsx, pricing.tsx, final-cta.tsx, footer.tsx}`

Untouched (as required): `(app)/`, `(auth)/`, `src/lib/`, `src/components/app-shell/`, the BFF
(`api/auth/*`), `KB_API_BASE_URL`, and `content/{site,nav,section-ids}.ts` (reused their existing exports).
