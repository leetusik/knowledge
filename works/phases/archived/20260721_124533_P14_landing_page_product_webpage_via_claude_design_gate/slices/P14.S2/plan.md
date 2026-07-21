# P14.S2 — Plan (native, orchestrator-written) — Build the public landing page

Build the `knowledge` public marketing landing in the Next.js app at `web/`. You are `slice-executor-high`.
Read `phase.md` (the "Approved design direction" + "Routing resolution" sections) first.

## Source of truth (read these before coding)
- **`web/design/rounds/01-landing/output/build-prompt.md`** — THE implementation contract: section-by-section
  specs + **real copy verbatim** (§4), the band system (§2), tokens to add (§1), motion/a11y (§5).
- `web/design/rounds/01-landing/output/result.md` — what was designed + departures.
- `web/design/rounds/01-landing/output/{tokens.css,marketing.css}` — **read-only visual reference**; rebuild
  as Tailwind v4 utilities + a small namespaced CSS block, **do not port/import them**.

**RESPECT THE DESIGN.** Ship every section as designed — layout, density, hierarchy, tokens, interactions,
both schemes. Never drop, simplify, or "improve" an element to save effort; where a value isn't specified,
pick the option closest to the designed intent, never a plainer fallback.

## Routing (already resolved — do NOT rebase the app)
The landing takes over `/` in this same app. The authenticated app **stays at its current paths**
(`/dashboard`, `/graph`, `/documents`, `/projects`, `/login`, `/signup`). **Do not touch** `(app)/`,
`(auth)/`, `src/lib/`, `src/components/app-shell/`, or the BFF (`src/app/api/auth/*`, `KB_API_BASE_URL`).

## Build

1. **Tokens** — extend `web/src/app/globals.css` `@theme`, **additive only** (values verbatim from
   `build-prompt.md §1`): `--color-on-dark-hint`, `--kb-band-dark/-soft/-deep`,
   `--kb-border-on-dark(-strong)`, `--kb-accent-on-dark(/-strong/-soft)`, `--kb-shadow-card`, data-viz inks
   `--kb-ink-{teal,bronze,plum}(-dark)`. **Rename/revalue no existing token.** The marketing type scale,
   `--color-on-dark(-muted)`, `--color-on-primary`, `--spacing-*`, `--container-*`, `--radius-*`, and the
   `[data-reveal]` layer are already staged — reuse them.
2. **Route** — add a `(marketing)` route group (`web/src/app/(marketing)/{layout,page}.tsx`), public +
   indexable (no auth gate). `page.tsx` composes the sections top→bottom. Replace `web/src/app/page.tsx`'s
   `redirect(...)` so `/` renders the landing (drop the auto-bounce).
3. **Content-as-data** — copy under `web/src/content/` (extend the existing `site.ts`/`nav.ts`/
   `section-ids.ts` typed-data pattern; e.g. `content/marketing/`). **Copy verbatim from `build-prompt.md §4`
   — never lorem.**
4. **Sections** under `web/src/components/marketing/` (separate from `app-shell/`): header/nav, hero (dark +
   onboarding terminal), value triad, how-it-works, feature-save (search motif), feature-connect (dark +
   terminal), feature-graph (graph motif), pricing (Free + waitlist), final-CTA + footer. **Reuse:** the pill
   button `web/src/components/ui/button.tsx` (`buttonVariants`; anchors = `<a className={cn(buttonVariants(
   {variant,size}))}>`; on dark bands use `secondaryOnDark`) — **no second button system**; the `<Reveal>`
   island + `[data-reveal]` layer; fonts via `web/src/lib/fonts.ts` (already wired). Server components by
   default; client islands only for real interaction.
5. **Tonal-band mechanic** (`build-prompt.md §2`) — a dark band is a scoped context (a wrapper re-points
   `--mkt-accent`/text/border; teal steps to `--kb-accent-on-dark*`), NOT a scheme flip. Band order: hero
   (dark) → what-it-is (paper) → how-it-works (sunken) → save & search (paper) → connect (dark) → graph
   (paper, recessed plate) → pricing (paper) → final CTA + footer (dark → deep).
6. **CTA targets** — "Sign in" → `/login`; "Get started" / "Get started — free" → `/signup`. The "Guide" nav
   link + "Read the guide" / "Install the CLI" / "Connect Claude Code" CTAs → the best real CLI-guide
   destination (P13 guide / repo / docs). **Pick a real target and record it in `result.md`; do not drop a
   CTA or ship a dead link.**
7. **Motion/a11y** (`build-prompt.md §5`) — settled state is the CSS default; Reveal only under
   `prefers-reduced-motion: no-preference`; keyboard focus ring on every interactive element; contrast
   ≥ 4.5:1 body / ≥ 3:1 large+marks in both bands.
8. **SEO (light)** — add `web/src/app/{sitemap,robots,manifest}.ts` for the public marketing surface. Keep
   minimal; OG image optional.

## Highest-risk hotspot
**The knowledge-graph motif** (feature-graph). The app renderer is
`web/src/app/(app)/graph/graph-canvas.tsx` (+ `graph-tokens.css`). Reuse its drawing approach for a faithful
motif; a faithful static/simplified render is acceptable **only if it matches the designed composition**
(focused teal neighborhood, bronze/plum dim nodes, info panel, legend) — never a plain placeholder.
**Escalate** (return `escalate` with findings) if the graph motif or anything else exceeds the slice's depth.

## Definition of done
- `cd web && pnpm build` succeeds; `pnpm lint` + `pnpm typecheck` clean. Drive `/` (via `pnpm dev` on
  127.0.0.1:3030 or the run/browser tools): all 9 sections render in band order, real copy, both schemes,
  CTAs to `/login`/`/signup`, Reveal + reduced-motion correct, no horizontal overflow, keyboard focus visible;
  the app (`/dashboard`, `/login`) still works.
- Write `result.md` (what you built, the guide-CTA target chosen, any graph-motif decision, any deviation) and
  append cross-slice notes to `phase.md` (incl. a "Doc impact" line for the landing surface + band tokens).
  Return a structured verdict. **Do not commit, do not transition status, do not version docs.**
