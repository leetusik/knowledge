<!-- design-cowork handoff — OUT. Claude Design returns the card set + result.md + build-prompt.md. -->
# Design handoff — Round 01: `knowledge` public landing + marketing webpage

**Phase/slice:** P14.S1 · **Round:** 01-landing · **Date:** 2026-07-18 · **Author:** Claude Code (orchestrator)

**You (the operator) + Claude Design make every visual decision here.** This document says *what* to design
and *what to return*; it decides no colors, type, layout, or copy. Every design question is posed back to you
below — I answer none of them.

---

## 1. Product context — what this is, who it's for

**`knowledge`** is a knowledge base for developers and their coding agents (live at `knowledge.hi2vi.com`).
You save durable, browsable, searchable knowledge — then reach it from wherever you work:

- **Save & browse** — a `docs/`-style tree of explainer documents with hybrid (keyword + semantic) search and
  an interactive **knowledge graph**, all in an authenticated web app.
- **Connect Claude Code / Codex** — a `/explain`-style skill writes knowledge into your base; a standalone
  **`knowledge` CLI** lets you sign up, log in, set credentials, and `save`/`search`/`read` **from the
  terminal, driven by your coding agent, without ever visiting the website** (agent-first onboarding).
- **Retrieve via an agent API** — a retriever endpoint for AI-agent use (the one **paid, and deferred**,
  feature — everything in the web UI and the Claude Code connection is **free**).

**Who uses it:** developers who live inside Claude Code / Codex, and the coding agents acting for them.
**What the landing is for:** a real marketing front door — explain the product, show the three ways in (web
app, Claude Code plugin/CLI, agent API), and route visitors to sign up / connect. Even though onboarding is
agent-first, the product deserves a proper public webpage.

**Grounding (real substance — read these, never invent):** `works/phases/active/P14/intent.md`,
`docs/current/product.md`, `docs/current/experience.md`, and the CLI at `cli/src/knowledge_cli/` (esp.
`guide.py`, `main.py`) for the real onboarding flow and command surface.

---

## 2. Scope — the reviewable units to design (one card each)

Design the **public marketing surface**. At minimum, one card per unit below (add/split cards as the design
needs — one card per reviewable unit, never a monolith):

**Foundations**
- Marketing type scale in use (hero display → body → micro/eyebrow) on warm paper.
- Light **and** dark band treatments (the site mixes tonal bands; see `--color-on-dark*`).

**Landing (the page, section by section)**
- Site header / nav (wordmark + primary CTA; the authenticated app lives behind it).
- **Hero** — the headline promise + primary/secondary CTA.
- What-it-is / value proposition.
- **How it works** — save → connect Claude Code → browse the graph → retrieve.
- Feature sections — (a) knowledge saving + hybrid search, (b) the Claude Code / CLI connection
  (agent-first onboarding, terminal-driven), (c) the **knowledge graph**, (d) the agent retrieval API.
- **Pricing / plans** — free-only launch; the paid retriever is "coming" (see the posed question).
- Final CTA.
- Footer.

**Components**
- The **marketing pill button** in its designed states — `primary`, `secondary`, `secondaryOnDark`, `link`,
  sizes `sm / default / lg` (this component already exists and is reserved for this landing; design its
  landing-context appearance, don't invent a second button system).

---

## 3. Locked vs. in-play

**In play** (design freely): section layout & composition, use of the marketing type scale, spacing/rhythm,
hero composition, dark/light band expression, motion (the one-shot scroll `Reveal`), illustration/imagery
style, how the graph is depicted.

**Copy is in play — this pass only (exception, dated 2026-07-18):** the landing has no existing copy, so this
round **drafts real marketing copy** grounded in §1 and the grounding docs. Never lorem. (Copy is normally
locked; this is the documented exception because the surface doesn't exist yet.)

**Locked** (do not change): the existing **"calm editorial library"** brand spirit; **teal as the only
interactive accent** (`#0f6f66` light / `#62bdb2` dark); the three font families **Fraunces** (display) /
**Source Sans 3** (body) / **JetBrains Mono** (data), each with a Korean fallback; **warm paper, never pure
white/black**; **no emoji**; the a11y / reduced-motion floor (settled state is the CSS default; loops only
under `prefers-reduced-motion: no-preference`; keyboard focus ring); the existing `--kb-*` / `--text-*` /
`--color-*` token **names**; and the **authenticated web app** (dashboard/graph/etc.) — it is *not* being
redesigned here, only the public marketing surface.

---

## 4. Where to look (real paths + shapes — data, not proposals)

- **Live design system (extend this):** `web/src/app/kb-tokens.css` (the `--kb-*` source tokens, both
  schemes), `web/src/app/globals.css` (the `@theme` mapping + the **marketing type scale already staged for
  P14**: `--text-hero-display: 68px` … `--text-micro`, `--color-on-dark*`, `--spacing-hero`,
  `--container-page: 1180px`, the `[data-reveal]` scroll layer).
- **The marketing button:** `web/src/components/ui/button.tsx` (`buttonVariants`, the 4 variants + 3 sizes).
- **The app's identity, for consistency:** `web/design/canvas/APP_BRIEF.md` (the "calm editorial library"
  invariants and the dark-gate → light-console rhythm) — the landing should feel of a piece with the app.
- **Assets:** `web/design/canvas/assets/logo.svg`, `favicon.svg`.
- **REFERENCE — data, not a proposal (do NOT port its design):** `~/projects/personal/hi2vi_web/src/app/
  (marketing)/` and `src/components/{sections,ui}/` show the *structure* of a section-per-card marketing site
  on the same Next 16 / Tailwind v4 stack. Structure only; the look is ours, per the locked brand above.

---

## 5. Required outputs (a round is incomplete without all three)

Return these into the design project (I read them back with DesignSync; I copy nothing down manually):

1. **The card set** — the design made visible in the Design System pane. **Line 1 of every card's preview
   HTML, exactly this shape:**
   ```html
   <!-- @dsCard group="Landing" name="Hero" subtitle="Headline promise · primary + secondary CTA" viewport="1280x800" -->
   ```
   Groups to use as pane headings: **`Foundations`**, **`Landing`**, **`Components`**. One card per reviewable
   unit from §2 (a monolithic "design system" page is not reviewable — split it). Show both light and dark
   where a section uses dark bands. **Definition of done = the cards appear in the pane** (not "the files exist").
2. **A `tokens.css`** the cards link — authored by Claude Design, carrying this round's real values (any new
   marketing surface/band tokens included). The palette *is* the design; I don't author it.
3. **`result.md`** (what was designed; every departure from this handoff logged) **and `build-prompt.md`**
   (the implementation contract — the apply slice P14.S2 sizes its work from this; be complete, since the
   implementer gets no DesignSync).

---

## 6. Open questions — posed back to you (I decide none of these)

Please resolve these *in the design* (or tell me in the read-back):

1. **Wordmark + tagline.** The current wordmark is "knowledge"; the domain is `knowledge.hi2vi.com`. Is that
   the marketing name, and what's the one-line tagline?
2. **Pricing presentation.** The launch is free-only; the paid retriever API is deferred (P15). Show a
   "Free" plan card + an "Agent retrieval API — coming / join the waitlist" tier? A single free callout with a
   "paid API later" note? Or no pricing section at all this launch?
3. **Landing at `/`.** Should the landing **take over `/`** (pushing the authenticated app to `/app` or
   `/dashboard`)? This also shapes routing in P14.S2/S3 — your call drives it.
4. **Hero scheme.** Light or dark hero? (The app uses a dark-gate → light-console rhythm; a dark hero would
   echo it — your decision.)
5. **Imagery.** Do you have brand imagery / app + graph screenshots to feature, or should it be
   illustration/typography-only? If you have assets, attach them (below).

---

## 7. Attachments to upload · Definition of done

- **Attach:** any logo/brand assets, app or knowledge-graph screenshots, and any reference imagery you want
  considered. (Nothing real to show → say so; I won't invent imagery.)
- **Done when:** the card set (Foundations + Landing + Components) is visible in the Design System pane, a
  linked `tokens.css` carries the round's values, and `result.md` + `build-prompt.md` are returned. Then clear
  the gate (`python3 scripts/workflow.py set-slice-status P14.S1 in_progress`) and tell me the **project id**.

---

*This handoff is the OUT half of the round. The returned card set / `result.md` / `build-prompt.md` are the IN
half — read-only data I land as-is, never edit.*
