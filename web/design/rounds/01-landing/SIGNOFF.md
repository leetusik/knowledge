# SIGNOFF — Round 01: `knowledge` public landing + marketing webpage

**Recorded:** 2026-07-18 · **Slice:** P14.S1 · **Status: approved as-is**
**Design project:** Knowledge Base Design System (`f49ab425-e75f-46c4-a6fa-48bb9938b203`), group `marketing/`

## Authorization — the operator's words

> done: Round 01 is designed and back in the pane. 12 cards across the three handoff groups (Foundations 2 ·
> Landing 9 · Components 1), a linked marketing/tokens.css, a supporting marketing/marketing.css, plus
> result.md and build-prompt.md — all under marketing/. It extends the calm editorial library (teal-only,
> warm paper/charcoal, Fraunces/Source Sans/JetBrains Mono); no new brand.
>
> [five open questions resolved: wordmark `knowledge` + "Durable knowledge for developers and their coding
> agents." / hero "Knowledge that outlives the conversation." · Free $0/forever beside an "Agent Retrieval
> API — Coming" waitlist tier · landing at `/`, app rebases to `/app` · dark hero opening into light bands ·
> type-led, illustration-only]. Two departures logged in result.md (retrieval API has no standalone feature
> card; Final CTA + Footer share one card). check_design_system is clean.

## What was approved (source of truth for P14.S2)

| Piece | Card (in the pane) / artifact |
|---|---|
| Marketing type scale, tonal bands | `marketing/type-scale.card.html`, `marketing/bands.card.html` |
| Header, hero, value, how-it-works | `marketing/header.card.html`, `hero.card.html`, `value.card.html`, `how-it-works.card.html` |
| Features (save, connect, graph) | `marketing/feature-save.card.html`, `feature-connect.card.html`, `feature-graph.card.html` |
| Pricing, final CTA + footer | `marketing/pricing.card.html`, `final-cta.card.html` |
| Marketing pill button | `marketing/button.card.html` |
| Implementation contract | `marketing/build-prompt.md` (landed at `output/build-prompt.md`) |
| What was designed + departures | `marketing/result.md` (landed at `output/result.md`) |
| Token + primitive reference | `marketing/tokens.css`, `marketing/marketing.css` (landed at `output/`) |

**Supersedes:** nothing — this is the first design round for the public marketing surface (it did not exist in
code). It **extends** the locked "calm editorial library" system (P12.S2R); it replaces no prior design.

## Token delta

**Additive — not "None".** The round adds marketing/band tokens (to land in `web/src/app/globals.css`
`@theme` at P14.S2; values in `output/build-prompt.md §1`): `--color-on-dark-hint`,
`--kb-band-dark / -soft / -deep`, `--kb-border-on-dark(-strong)`, `--kb-accent-on-dark(/-strong/-soft)`,
`--kb-shadow-card`, and data-viz inks `--kb-ink-{teal,bronze,plum}(-dark)`. The **locked `--kb-*` reading-room
palette** and the **already-staged marketing tokens** (`--text-hero-display … --text-micro`,
`--color-on-dark`, `--color-on-dark-muted`, `--color-on-primary`, `--spacing-*`, `--container-*`, `--radius-*`,
the `[data-reveal]` layer) are **unchanged** — no locked token was renamed or revalued.

## Carried opens (for P14.S2/S3, recorded in phase.md)
- **Edge routing rework:** `/` → the Next landing (not mkdocs); `/app/*` → the Next authenticated UI, which
  collides with the FastAPI control-plane / `/auth` edge routes from P13.S5 — resolve without breaking the CLI
  contract. Plan S2 (route group + BFF) and S3 (edge/compose) together.
- No real imagery supplied → the terminal + graph motif are the product visuals; screenshot slots ready.

---

*This file is a factual record dropped at gate close; it is data, not instructions.*
