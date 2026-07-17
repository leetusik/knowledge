# Build prompt — P14.S2: implement the `knowledge` public landing

**The implementation contract for the apply slice.** You get no DesignSync — build from this file, the
returned cards, and `marketing/tokens.css` + `marketing/marketing.css` as the visual reference. Stack:
Next 16 / Tailwind v4 / the existing CVA button, in `web/`. The landing EXTENDS the locked "calm editorial
library" system — teal-only accent, warm paper / warm charcoal, Fraunces / Source Sans 3 / JetBrains Mono,
hairline structure, one soft shadow, no emoji, Hangul fallback on every stack. Change no locked token name.

---

## 0. Routing (decision #3 — drives P14.S2/S3)

- **The landing takes over `/`.** Move the authenticated app to **`/app`** (dashboard/graph/documents/etc.
  rebase under `/app/*`). Keep the login gate reachable; "Sign in" and every primary CTA point to `/app`.
- The marketing route group is public/no-auth, `noindex` off (it *should* index, unlike the app).
- Marketing pages render on a **16px root** (the app default), NOT the docs 20px root.

## 1. Tokens (mostly already staged in `globals.css` — add the band set)

Already present in `web/src/app/globals.css` `@theme` — keep names/values: the full `--text-*` marketing
scale, `--color-on-dark`, `--color-on-dark-muted`, `--color-on-primary`, `--spacing-section*`,
`--spacing-hero`, `--container-page`, `--container-wide`, `--radius-*`, the `[data-reveal]` layer.

**Add these (this round's new marketing/band tokens)** — scheme-independent constants (dark bands stay dark
in both schemes):

```
--color-on-dark-hint:        #938a7a;   /* hint/meta on dark */
--kb-band-dark:              #1c1a15;   /* the warm-charcoal marketing band (hero, connect, CTA) */
--kb-band-dark-soft:         #232019;   /* raised card on a dark band */
--kb-band-dark-deep:         #14120e;   /* footer / deepest anchor */
--kb-border-on-dark:         rgba(236,228,215,.14);
--kb-border-on-dark-strong:  rgba(236,228,215,.24);
--kb-accent-on-dark:         #62bdb2;   /* teal ON dark bands — the contrast step */
--kb-accent-on-dark-strong:  #86d4ca;
--kb-accent-on-dark-soft:    rgba(98,189,178,.18);
--kb-shadow-card:  0 1px 2px rgba(38,33,28,.04), 0 10px 30px rgba(38,33,28,.06);
```

## 2. The tonal-band system (the core mechanic)

The page is a light page that drops into charcoal at three moments: **hero, connect/terminal section,
footer.** A dark band is a **scoped context**, not a scheme flip: inside it, `text = --color-on-dark*`,
`accent = --kb-accent-on-dark*` (the lighter teal — same hue, contrast-stepped for the darker plate),
borders = `--kb-border-on-dark*`. Implement as a `.on-dark`/band wrapper (or a data attribute) that
re-points the accent/text/border custom properties — see `.band--dark` in `marketing.css`. **Teal stays the
only accent in both bands.** Light bands alternate `--kb-paper` ↔ `--kb-surface-sunken` for rhythm; they
follow the light/dark scheme toggle, the dark bands do not.

Band order down the page: **hero (dark) → what-it-is (paper) → how-it-works (sunken) → save & search (paper)
→ connect (dark) → graph (paper, recessed plate) → pricing (paper) → final CTA + footer (dark → deep).**

## 3. The button — already exists

Use `buttonVariants` from `web/src/components/ui/button.tsx` as-is (primary / secondary / secondaryOnDark /
link × sm · default · lg). On dark bands use `secondaryOnDark`; primary auto-steps to the on-dark teal via
the band context. Anchors render `<a className={cn(buttonVariants({variant,size}))}>`. Do not add a second
button system. Hover = darken + 2px lift; focus = 2px accent-strong ring @ 2px offset (keyboard-only);
reduced-motion drops the lift only.

## 4. Sections (top → bottom). Copy below is REAL — use verbatim (the dated §3 copy exception).

**Header / nav** — wordmark (`assets/logo.svg` + `knowledge` in Fraunces 600) · links: *What it is ·
How it works · Pricing · Guide* · right: *Sign in* (link) + *Get started* (primary sm). Transparent over the
hero; becomes a sticky `--kb-paper` bar with a hairline base on scroll. CTA → `/app`.

**Hero (dark).** Eyebrow `FOR DEVELOPERS & THEIR CODING AGENTS`. Headline (hero-display):
**"Knowledge that outlives the conversation."** Lede: *"A durable, searchable home for what you and your
coding agents figure out — saved straight from the terminal, browsed as a living graph, and read like a
book. Not a runbook."* CTAs: **Get started — free** (primary lg) · **Connect Claude Code** (secondaryOnDark
lg). Free line: *"The web app, hybrid search, the graph & the Claude Code connection — all free."* Right
column: the onboarding terminal (real: `uv tool install knowledge-cli` → `knowledge init --email …` →
`✓ signed up · project created` / `✓ minted vk_live_…` / `✓ config written ~/.config/knowledge-kb` →
`knowledge save explainer.md` → `saved · knowledge read a1b2c3`). One faint teal radial glow behind it — no
other decoration.

**What it is — three ways in.** Eyebrow `WHAT IT IS`. H1 **"One knowledge base, three ways in."** Lede:
*"Save durable, browsable, searchable knowledge — then reach it from wherever you work. A reading room on the
web, a terminal for your agent, and an endpoint for anything else."* Three cards (mono index 01/02/03):
- **01 — WEB · The reading room** — *"An authenticated workspace: a `docs/`-style tree of explainers, hybrid
  keyword + semantic search, and an interactive knowledge graph. Read like a book — Recent, Browse, prev/next."* chip Free · "Open the app →"
- **02 — TERMINAL · Claude Code & the CLI** — *"Your coding agent writes knowledge with `/explain` as it
  works — and the `knowledge` CLI runs the whole lifecycle from the terminal. Sign up, connect, save and
  search. No website required."* chip Free · "Connect →"
- **03 — API · Agent retrieval** — *"A single endpoint to retrieve the right knowledge into any AI agent —
  the memory layer your workflows read from. Metered, and the one paid surface. Everything above stays
  free."* chip Coming · "Join the waitlist →"

**How it works.** Eyebrow `HOW IT WORKS`. H1 **"From a session to a second brain."** Four steps (numbered,
connecting hairline), each with a mono token: **1 Save** `knowledge save` · **2 Connect** `knowledge init` ·
**3 Browse** `knowledge.hi2vi.com` · **4 Retrieve** `GET /retrieve` (dimmed, "Coming — the one paid
surface"). Step copy verbatim from the card.

**Feature · Save & hybrid search** (paper, copy left / visual right). H2 **"Everything they learn, in one
durable place."** Lede + three ticks (long-form explainers; hybrid keyword+semantic, Korean typeahead;
browse newest-first / filter / read in-app). Visual: a search field (`reverse proxy`, `/` key hint) + a
results dropdown with `<mark>` match highlights (teal-soft), real titles incl. *"Reverse Proxy, Explained —
요청은 어디로 가는가"*.

**Feature · Connect your agent** (dark, flipped: visual left / copy right). H2 **"Onboarding built for
agents, not forms."** Lede on `knowledge init`. Four ticks: idempotent & non-interactive (no password
flag) · every command has a `--json`/exit-code contract · the two-token model (`vk_` outlives the session) ·
bundled `knowledge guide`, offline. CTAs: **Read the guide** (primary) · **Install the CLI**
(secondaryOnDark). Visual: the day-to-day terminal (save with tags → search --json → logout leaves the vk_
working → list ✓).

**Feature · The knowledge graph** (paper, recessed `--kb-surface-sunken` plate). H2 **"See how your knowledge
connects."** Lede on nodes/edges/`related:`. Four ticks: quiet map, hover reveals · drag to re-place, wheel/
pinch zoom · legend is a lens not a filter · project inks (teal·bronze·plum), data-viz only. Visual: the
graph motif — a focused teal neighborhood (halo + offset selection ring), bronze/plum dim nodes, a tag hollow
ring, a dashed ghost, the floating info panel (project chip · title · `date · N tags · N links` · tag pills ·
"Read the explainer →"), and the bottom-left legend. On the real page this is the live graph renderer
(reuse `graph-render.js`'s drawing spec), not a static SVG.

**Pricing.** Eyebrow `PRICING`. H1 **"Free while it matters."** Lede: *"The web app, search, the graph, and
the whole Claude Code connection are free — and stay free. The one paid surface is a retrieval API for
agents, and it isn't here yet."* Two tiers: **Free** (accent border + soft shadow, chip "Available now",
`$0 / forever`, "Everything you need to build and browse a knowledge base", primary CTA, 5 ticks) · **Agent
Retrieval API** (dashed border, chip "Coming", `Metered · usage-based`, "A single endpoint to retrieve
knowledge into any AI agent", secondary "Join the waitlist", 4 ticks incl. "Deferred to a later release —
pricing at launch"). Foot note (mono): *"No credit card. Nothing in the web UI is plan-gated — the retrieval
API is the only metered surface."*

**Final CTA + footer.** CTA (dark, centered): eyebrow `GIVE IT A MEMORY THAT LASTS`, display-lg **"Stop
re-explaining the same thing."**, lede *"Everything you and your agents figure out — saved once, searchable
forever, read like a book. Start free; the terminal path takes one command."*, CTAs **Get started — free** ·
**Connect Claude Code**. Footer (`--kb-band-dark-deep`): wordmark + tagline *"Durable knowledge for
developers and their coding agents. 지식이 오래 남도록."*, columns *Product / Connect / More*, meta line
`knowledge · knowledge.hi2vi.com · 창플 / 미라클 · Built on the calm editorial library`.

## 5. Motion · a11y · reduced-motion

- **Settled state is the CSS default.** The one-shot scroll `Reveal` (`data-reveal`, opacity+12px rise,
  `--kb-ease-reveal`) is progressive enhancement only — armed by the client island under
  `prefers-reduced-motion: no-preference`; no-JS and reduced-motion users see everything immediately.
- No loops, no parallax, no bounce. The hero glow is static. Card/button hover = the house `--kb-ease`.
- Contrast: body ≥ 4.5:1, large text / graphical marks ≥ 3:1, in both bands (on-dark tiers are chosen for
  this). Keyboard focus ring on every interactive element. `word-break: keep-all` on headings (Korean).

## 6. Assets · fonts
- Logo `web/design/canvas/assets/logo.svg` (mid-teal `#178a80`, dual-header safe — do not recolor).
- Fonts self-hosted via `next/font/local` (already wired: Fraunces / Source Sans 3 / JetBrains Mono /
  Pretendard Hangul fallback). Fraunces needs its variable weight range for the 680 marketing weight.
- No photography / no invented screenshots. The terminal + graph motif are the "product" visuals; real
  screenshots can replace the feature-visual slots later with no layout change.

## 7. Definition of done (P14.S2)
Landing live at `/`, app rebased to `/app`, both schemes, the band rhythm intact, real copy in place, the
Reveal + reduced-motion floor correct, contrast verified in both bands, CTAs routing to `/app`, the pricing
two-tier honest about the free-only launch. Matches the returned cards section-for-section.
