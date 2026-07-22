# Build prompt — P20.S3: implement the onboarding sections (agent quickstart + the published skill)

**The implementation contract.** You get no DesignSync — build from this file and the round-02 cards
(`marketing/agent-quickstart.card.html`, `marketing/skill-landing.card.html`,
`marketing/copy-snippet.card.html`) plus the round-02 block at the end of `marketing/marketing.css`
(visual spec, not code to port). Stack: the existing marketing layer in `web/` — `Band`/`Container`/
`Eyebrow`/`RichText`/`Ticks` primitives, the CVA button, `content.ts` copy modules, the `[data-reveal]`
one-shot Reveal. **No new tokens** — everything rides the shipped `--kb-*` / `--text-*` / `--color-*` set;
bronze `#c8a15e` is the same literal the terminal `.key` ink already uses.

---

## 0. Page order (decision — re-slot only, restyle nothing)

hero → what-it-is → how-it-works → save & search → **connect → agent-quickstart** (one continuous dark
territory: same `--kb-band-dark`, separated by a `--kb-border-on-dark` hairline, both scheme-independent)
→ **the-skill** (sunken: `--kb-surface-sunken`) → graph → pricing → final CTA + footer. Give both new
sections ids/anchors in `MKT_SECTION_IDS` (`agents`, `skill`) and apply the standard `Reveal` per column.

## D10 — the two feature ledes (resolves D10; add to `content.ts`, render as `t-lead`)

- `FEATURE_SAVE.lede`: **"Each explainer is grounded in real code and tagged on the way in. Find it again
  with hybrid search — keyword and semantic, together — across a mixed English / Korean corpus."**
  (On the card, "and" is set as a serif-alt emphasis span; plain text is fine in `content.ts`.)
- `FEATURE_CONNECT.lede`: **"A one-shot `knowledge init` runs the whole sequence — sign up, create a
  project, mint a key, write the config, verify — unattended. Your coding agent drives it; you never open
  the website."**

These are the ledes already visible on the shipped round-01 cards — quoted here so `content.ts` finally
carries them. No other round-01 copy changes.

## (a) Agent quickstart — dark band, feature-row (copy left / setup column right)

**Copy (verbatim):**
- Eyebrow: `AGENT QUICKSTART · THE RECOMMENDED PATH`
- H2: **"Two exports, and every agent can save."**
- Lede: *"Set two environment variables once, and every coding agent on the machine — Claude Code, Codex,
  anything that can speak REST — saves into the same knowledge base. No plugin, no config file, nothing
  per-repo."*
- Ticks:
  1. "One org-level key serves every repo — each save's project is derived from the repo directory name
     (`default` outside one)"
  2. "Plain REST underneath: the two variables are the whole contract, fully usable by hand — the
     recommended path is a coding agent driving the skill below"
  3. "Codex only: its workspace-write sandbox blocks outbound network — set
     `[sandbox_workspace_write] network_access = true` in `~/.codex/config.toml`"
- CTA: link-variant **"Mint an org key →"** → the dashboard Org API keys panel (auth-gated is fine).

**Setup column (top → bottom, 14px gaps):**
1. **Snippet block** labeled `~/.zshenv`, copy control top-right. **Display:** the comment on its own
   hint-ink line above the exports (the trailing-comment form clips at column width); `pre-wrap`.
   **Copy action:** EXACTLY the locked two lines (incl. trailing comment and spacing):
   ```
   export KB_API_BASE_URL="https://knowledge.hi2vi.com"
   export KB_API_TOKEN="vk_..."        # org-level key: Dashboard → Org API keys → New key
   ```
   Inks: `export` teal-on-dark; the `"vk_..."` value bronze; the comment hint.
2. **Trap note** (dashed `--kb-border-on-dark-strong` hairline, bronze mono kicker `KNOWN TRAP`):
   *"A repo `.env` is never auto-loaded by Claude Code or Codex. Put the exports in `~/.zshenv`, where
   every agent's shell sees them."*
3. **Snippet block** labeled `HEALTH CHECK · ONE LINE`, copy control; body EXACTLY (wraps, `pre-wrap`):
   ```
   curl -sS --max-time 5 -H "Authorization: Bearer $KB_API_TOKEN" "$KB_API_BASE_URL/api/documents?limit=1"
   ```
   Legend row under a hairline: `200 connected` · `401 wrong-or-revoked key` (codes in teal-strong).

## (b) The skill — sunken band, feature-row (copy left 1fr / pane right 1.15fr)

**Copy (verbatim):**
- Eyebrow: `THE EXPLAIN SKILL · PUBLISHED`
- H2: **"The skill your agent drives — in the open."**
- Lede: *"Saving isn't a form. It's a 486-line skill: research the topic or the diff, write a
  self-contained interactive explainer, cite sources, add a quiz, save over REST. The API works by hand;
  the recommended path is a coding agent following this file. Copy it straight into your agent — or
  download it."*
- Ticks:
  1. "Runs as `/knowledge:explain` in Claude Code; the identical skill text ships for Codex under
     `.agents/`"
  2. "This page serves the canonical file — a byte-parity CI gate keeps it from ever forking"
  3. "One markdown file, YAML frontmatter included — everything the agent needs, offline"
- Actions: **Download SKILL.md** (CVA primary, default size) + **Copy the skill** (the copy control at
  44px section scale).

**Document pane:** `--kb-surface` card, `--kb-shadow-card`. Bar: `SKILL.md` (mono 13/600) ·
`486 lines · yaml + markdown` · right-aligned `/knowledge:explain`. Body: the REAL head of the served
file (frontmatter + `# explain` + opening paragraph), mono 12.5/1.75, `max-height: 430px`, bottom fade to
`--kb-surface`. Inks: `---` fences + prose in hint/secondary; YAML keys teal; headings/emphasis ink-700.
Foot bar: "showing the head · **read the whole skill ↓**" + right "byte-parity with
plugin/skills/explain/SKILL.md". **Expand behavior:** the foot link releases `max-height` to a scrollable
`70vh` reader (same pane, in place; the link becomes "collapse ↑"); no-JS fallback = the Download link.
The pane content is rendered from the served file at build time — never a pasted copy.

**The artifact:** serve the canonical `plugin/skills/explain/SKILL.md` from the static surface
(`web/public/SKILL.md` → `/SKILL.md`) under the existing byte-parity CI gate. Download = `<a href
="/SKILL.md" download>`. Copy-the-skill fetches `/SKILL.md` and copies the full text.

## (c) Copy control (new small client island — see the Components card)

Mono ghost pill (JetBrains Mono 12/600, pill radius, 30px min-height; 44px at section scale). Dark bands:
`--kb-border-on-dark-strong` border, `--color-on-dark-muted` text; light: `--kb-border-strong` /
`--kb-secondary`. States (the `copy-link-button.tsx` idiom): idle **Copy** (double-sheet icon) →
`navigator.clipboard.writeText` success **Copied** (check, teal accent + accent border, revert after 2 s)
→ failure **Copy failed** (hint text, dashed border; clipboard denied / insecure origin — never log the
value). Focus: 2px `--mkt-accent-strong` ring @ 2px offset. Reduced motion: no transition. Copy always
copies the FULL artifact: both export lines (with comment), the whole curl line, the whole skill file.

## Motion · a11y

Same floor as round 01: settled state is the CSS default; `Reveal` per column under
`prefers-reduced-motion: no-preference`; contrast ≥ 4.5:1 body / 3:1 marks in both bands (the snippet
inks and legend meet this on `--kb-band-dark-soft`); every control keyboard-focusable with the ring;
`word-break: keep-all` on headings. No new loops, no typing animations in the snippet blocks.

## Definition of done (P20.S3)

Both sections live in the stated order; D10 ledes in `content.ts`; the exports / trap / Codex toggle /
health check byte-exact; `/SKILL.md` served under the byte-parity gate with working Download + full-text
Copy; the pane expand/collapse + no-JS fallback; copy-control states per (c); both schemes correct (dark
band scheme-independent, sunken band follows the scheme); matches the returned cards section-for-section.
