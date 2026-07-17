# Result — Round 01: `knowledge` public landing + marketing webpage

**Phase/slice:** P14.S1 · **Round:** 01-landing · **Returned:** 2026-07-18 · **Author:** Claude Design
**Design system:** *Knowledge Base Design System* — "calm editorial library" (extended, not replaced)

This is the IN half of the round: the card set (visible in the Design System pane), the linked
`tokens.css`, and this `result.md` + `build-prompt.md`. Everything here EXTENDS the locked brand — one
teal accent, warm paper / warm charcoal, Fraunces / Source Sans 3 / JetBrains Mono, hairline structure,
one soft shadow, no emoji, Hangul fallback on every stack. No new brand was invented.

---

## The five open questions — resolved in the design

1. **Wordmark + tagline.** Wordmark stays **`knowledge`** (lowercase, the book-and-spark mark) — it *is*
   the marketing name; `knowledge.hi2vi.com` is the domain, not a second name. Tagline (footer + meta):
   **"Durable knowledge for developers and their coding agents."** Hero promise (the headline, not the
   tagline): **"Knowledge that outlives the conversation."**
2. **Pricing presentation.** **A Free plan card ($0 / forever) beside an "Agent Retrieval API — Coming"
   tier.** The Free card carries the real launch offer (web app · hybrid search · graph · Claude Code +
   CLI · unlimited saves); the API tier is dashed, chip-marked *Coming*, "Join the waitlist", and labelled
   the only metered surface. This is honest about the free-only launch and sets up P15. (Not "no pricing":
   a clear free callout is worth more than silence, and naming the paid tier signals the roadmap.)
3. **Landing at `/`.** **Yes — the landing takes over `/`; the authenticated app moves to `/app`.** "Sign in"
   and every primary CTA route to `/app`. This drives routing in P14.S2/S3 (see build-prompt §Routing).
4. **Hero scheme.** **Dark hero.** It echoes the login's dark "quiet threshold" and the app's dark-gate →
   light-console rhythm, reads as terminal-adjacent for a developer tool, and lets teal sing on charcoal.
   The page then opens into light editorial bands, returning to charcoal for the connect/terminal section
   and the footer. A **light hero is available** by swapping the hero band to the paper tier — the
   *Tonal bands* card shows both treatments side by side so the choice is reversible with one class.
5. **Imagery.** **Type-led, illustration-only — no photography, no invented screenshots.** The two "product"
   moments are drawn from the system's *own* marks: a **terminal block** of real `knowledge` CLI commands
   (the agent-first proof), and a **knowledge-graph motif** built from the real graph grammar (project inks
   teal/bronze/plum, a focused teal neighborhood, the info panel). Both are honest to "the site is
   essentially image-free — it reads like a well-set book." If real app/graph screenshots arrive later,
   they drop into the feature-visual slots without layout change.

---

## Card set delivered (visible in the pane)

**Foundations** (group `Foundations`)
- **Marketing type scale** — the P14 scale (hero-display 68 → micro 11) on warm paper, with lh/tracking/weight specs and mixed EN/KR samples.
- **Tonal bands — light & dark** — the marketing rhythm; on-dark text tiers; the teal contrast-step to `#62bdb2` on dark; band-token swatches.

**Landing** (group `Landing`) — the page, section by section
- **Header & nav** — transparent-over-hero and sticky-paper states; wordmark; CTA → `/app`.
- **Hero — dark** — eyebrow · hero-display promise · lede · primary/secondary CTA · a real one-command onboarding terminal · free callout.
- **What it is — three ways in** — value prop: web app · Claude Code & CLI · agent API, as a triad (free/free/coming).
- **How it works** — save → connect → browse → retrieve, four steps with the real commands.
- **Feature · Save & hybrid search** — copy + a search motif with a highlighted match; grounded, tagged, EN/KR.
- **Feature · Connect your agent** — dark band; day-to-day terminal; agent-first / `--json` / two-token / bundled guide.
- **Feature · The knowledge graph** — copy + the graph motif on the recessed plate; quiet map, hover reveal, drag, zoom, legend-as-lens.
- **Pricing — free launch + the API tier** — the two tiers (decision #2).
- **Final CTA & footer** — closing dark band + editorial footer (nav columns, wordmark + tagline, bilingual meta).

**Components** (group `Components`)
- **Marketing pill button** — `button.tsx` in landing context: primary / secondary / secondaryOnDark / link × sm · default · lg, on paper and on dark.

---

## `tokens.css` — what it carries

One linked file (`marketing/tokens.css`), self-contained so the cards render at true brand values:
- **The locked `--kb-*` palette**, both schemes, copied verbatim from `tokens/colors.css` (LOCKED — unchanged).
- **The marketing type scale** `--text-hero-display … --text-micro` (+ lh/tracking/weight companions) — names
  and values identical to what's already staged in `web/src/app/globals.css` `@theme`, so P14.S2 maps 1:1.
- **The tonal-band system (this round's new tokens)** — `--kb-band-dark / -soft / -deep`, `--kb-border-on-dark(-strong)`,
  `--kb-accent-on-dark(-strong/-soft)`, `--color-on-dark-hint`, alongside the already-staged `--color-on-dark`,
  `--color-on-dark-muted`, `--color-on-primary`.
- **Marketing spacing / containers / radii / motion** — `--spacing-hero`, `--spacing-section*`, `--container-page/-wide`,
  `--radius-lg/-xl`, `--kb-ease-reveal`, `--kb-shadow-card` (a second soft shadow for raised marketing cards).

A supporting **`marketing.css`** (the shared primitive classes — bands, buttons, type helpers, feature rows,
terminal, graph plate, footer) is included as the visual reference the cards share. It is **design reference,
not code to port** — P14.S2 rebuilds these as Tailwind v4 utilities + the existing CVA button.

---

## Departures from the handoff (logged)

- **Group names.** Used the handoff's exact pane headings `Foundations` / `Landing` / `Components`. Note
  `Components` is a **pre-existing** group in this design system (chrome, search, tags, content, cards); the
  marketing pill therefore sits alongside the reading-room components under that shared heading, named
  "Marketing pill button" so it reads as the landing-reserved component the handoff describes.
- **Feature (d) — the retrieval API — has no standalone feature card.** It is represented three times where
  it is truthful (value-prop tier 03, how-it-works step 4, and the Pricing card, where the feature and its
  "coming/paid" status live together). A fourth API-only section would have been redundant for a deferred
  surface. Flag if you want it split back out.
- **Final CTA + Footer combined** into one card (both are page-closers on the same charcoal anchor).
- **Added `marketing.css`** beyond the required `tokens.css` (supporting reference, per above).
- **Copy is drafted real** (the dated §3 exception). All copy is grounded in `docs/current/product.md`,
  `experience.md`, and the CLI surface — never lorem. It is reproduced verbatim in `build-prompt.md` so the
  implementer uses it as-is.

## Not included / owed
- No real imagery was supplied, so none is used (per §7). Screenshot slots are ready if assets arrive.
- Dark-scheme rendering of the *light* bands is specified in tokens (both schemes ship) but the cards show
  the canonical light-scheme marketing look; the *Tonal bands* card demonstrates the dark treatment.
