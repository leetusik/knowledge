<!-- design-cowork handoff — OUT. Claude Design returns the card set + result.md + build-prompt.md. -->
# Design handoff — Round 02: onboarding sections (env-var agent quickstart + the explain skill on the landing)

**Phase/slice:** P20.S2 · **Round:** 02-onboarding · **Date:** 2026-07-22 · **Author:** Claude Code (orchestrator)

**You (the operator) + Claude Design make every visual decision here.** This document says *what* to design
and *what to return*; it decides no layout, type, motion, or copy. Every design question is posed back to you
below — I answer none of them.

---

## 1. Product context — what this round completes

P20 makes the landing's onboarding journey real. The hero terminal now depicts the true flow (shipped in
P20.S1, unreleased): `curl -fsSL https://knowledge.hi2vi.com/install.sh | bash` → `knowledge init` with the
real password prompt and real output → `knowledge save` printing a **direct doc URL**. Two journeys remain
undepicted on the page, and they are this round's scope:

- **The agent path — the recommended way in.** A user (or their coding agent) sets two env vars and every
  coding agent on the machine can save into the knowledge base via plain REST — no plugin, no config file.
  This is the product's recommended setup, and today the landing says nothing about it.
- **The skill itself, published.** The whole point of the agent path is that *the agent drives the skill*.
  The explain skill is a real 486-line markdown file; we want it **on the landing page, copyable and
  downloadable**, with agent-first guidance ("the REST API is fully usable by hand; the recommended path is
  a coding agent driving this skill").

**Who uses it:** developers who live inside Claude Code / Codex, and the coding agents acting for them.

**Grounding (real substance — read these, never invent):** `works/phases/active/P20/intent.md` (the
confirmed operator intent), `works/phases/active/P20/phase.md` (decisions + findings),
`docs/current/product.md`, `docs/current/experience.md`, `plugin/skills/setup/SKILL.md` (Connect mode
C1–C5 — the real signup → key → config narration), and the artifacts named in §4.

---

## 2. Scope — the reviewable units to design (one card each)

Two new **Landing** units (whether they are two bands or one combined "for agents" band is yours — see the
posed questions). The existing round-01 sections are not being redesigned.

**(a) Env-var agent quickstart** — the recommended agent setup, presented so a visitor gets from landing to
first saved doc with minimum friction. The technical substance is **locked data** (verbatim, not copy to
rewrite):

```
export KB_API_BASE_URL="https://knowledge.hi2vi.com"
export KB_API_TOKEN="vk_..."        # org-level key: Dashboard → Org API keys → New key
```

- Recommended home for the exports: `~/.zshenv` — a repo `.env` is **never** auto-loaded by Claude Code or
  Codex (verified; this is a known trap worth surfacing).
- One key serves every repo: the key is org-level (P18), and each save's project is derived from the repo
  directory name automatically ("default" outside a repo).
- Codex-only caveat: its workspace-write sandbox blocks outbound network — `~/.codex/config.toml` needs
  `[sandbox_workspace_write] network_access = true`.
- The plain-REST shape agents use (also the by-hand fallback), and the 1-line health check:
  `curl -sS --max-time 5 -H "Authorization: Bearer $KB_API_TOKEN" "$KB_API_BASE_URL/api/documents?limit=1"`
  → 200 connected / 401 wrong-or-revoked key.

**(b) The explain skill, on the landing** — publish `plugin/skills/explain/SKILL.md` (486 lines, YAML
frontmatter + markdown) **copyable and downloadable**, with agent-first guidance. Facts (locked): the
landing-served copy is derived from that canonical file under an existing byte-parity CI gate (never a
fork); the downloadable file will be served from the site's static surface (`web/public/`); in Claude Code
the skill runs as `/knowledge:explain`, and the identical skill text ships for Codex under `.agents/`.

**Components** — if the round designs a copy/download affordance (buttons, "copied" feedback, a code/terminal
block with a copy control), give it its own card so it is reviewable and reusable.

---

## 3. Locked vs. in-play

**In play** (design freely): the new sections' layout & composition, band tone (paper/sunken/dark), type
usage within the existing scale, spacing/rhythm, motion (the one-shot scroll `Reveal` pattern), how code/
terminal content is visually presented, how a 486-line document is made browsable, where the sections sit in
the page order, and whether (a)+(b) are one band or two.

**Copy is in play — this pass only (exception, dated 2026-07-22):** the new sections have no existing copy,
and **D10** (below) reopens the two shipped feature-section ledes. Draft real copy grounded in §1/§4 — never
lorem. (Copy is normally locked; this dated exception mirrors round 01's, for surfaces whose copy does not
exist yet.)

**Locked** (do not change): the **"calm editorial library"** brand spirit; **teal as the only interactive
accent** (`#0f6f66` light / `#62bdb2` dark); the three faces **Fraunces** (display) / **Source Sans 3**
(body) / **JetBrains Mono** (data), each with a Korean fallback; **warm paper, never pure white/black**;
**no emoji**; the a11y / reduced-motion floor (settled state is the CSS default; loops only under
`prefers-reduced-motion: no-preference`; keyboard focus ring); the existing `--kb-*` / `--text-*` /
`--color-*` token **names**; the **shipped round-01 landing design** (hero, value triad, how-it-works,
feature sections, pricing, final CTA, header/footer — this round *adds* sections and may re-slot the page
order, but does not restyle what shipped); and **every technical fact/command in §2** (env-var names, the
export lines, the sandbox toggle, the health check, the skill's filename and length — data, not copy).

---

## 4. Where to look (real paths + shapes — data, not proposals)

- **The live marketing layer this extends:** `web/src/app/(marketing)/page.tsx` (section order),
  `web/src/components/marketing/` (`primitives.tsx` — `Band` tones, `Container`, `Eyebrow`, `RichText`,
  `CtaLink`, `Ticks`, `Chip`; `terminal.tsx` — the `TerminalBlock` used by hero/connect), and
  `web/src/components/marketing/marketing.css` (band mechanics, terminal syntax inks, step connectors).
- **Copy source of truth:** `web/src/content/marketing/content.ts` (all section copy; note its header — the
  two mid features carry **no lede**, which is D10) and `web/src/content/marketing/terminals.ts` (the new
  honest hero terminal from P20.S1 — the sections you design will sit on the same page as this).
- **Tokens:** `web/src/app/kb-tokens.css` (source `--kb-*`, both schemes), `web/src/app/globals.css` (the
  `@theme` bridge + marketing type scale: `--text-hero-display` … `--text-micro`, `--color-on-dark*`,
  `--container-page: 1180px`).
- **The real artifacts the sections present:** `plugin/skills/explain/SKILL.md` (the 486-line skill —
  skim its frontmatter + §1–§2 to see what a visitor would be copying), `web/public/install.sh` (the
  one-liner installer the hero now shows), `cli/README.md` §Install.
- **Existing copy-affordance idioms (data, not a mandate):** `web/src/components/copy-link-button.tsx`
  (idle/copied/failed states) and the `ShowOnceKey` copy control in
  `web/src/app/(app)/projects/[projectId]/mint-credential-form.tsx`.
- **The app's identity, for consistency:** `web/design/canvas/APP_BRIEF.md`; round 01's record at
  `web/design/rounds/01-landing/` (its `output/build-prompt.md` is what the shipped landing was built from).

---

## 5. Required outputs (a round is incomplete without all three)

Return these into the design project (I read them back with DesignSync; I copy nothing down manually):

1. **The card set** — the design made visible in the Design System pane. **Line 1 of every card's preview
   HTML, exactly this shape:**
   ```html
   <!-- @dsCard group="Landing" name="Agent quickstart" subtitle="Env-var setup · two exports · REST fallback" viewport="1280x800" -->
   ```
   Groups as pane headings: **`Landing`** (one card per new section — show light and dark treatments where a
   band uses them), **`Components`** (the copy/download affordance, if designed), **`Foundations`** (only if
   this round changes token values). One card per reviewable unit — never a monolith. **Definition of done =
   the cards appear in the pane** (not "the files exist").
2. **`tokens.css`** — only if this round changes or adds token values; if nothing changes, say "no token
   delta" in `result.md` instead. (Values are yours; I never author them.)
3. **`result.md`** (what was designed; every departure from this handoff logged) **and `build-prompt.md`**
   (the implementation contract — P20.S3 sizes its work from this and its implementer has **no** DesignSync;
   include the final section order, full copy, and exact behaviors of any copy/download affordance).

---

## 6. Open questions — posed back to you (I decide none of these)

1. **D10 — the missing feature ledes.** `FEATURE_SAVE` and `FEATURE_CONNECT` shipped without lede text
   (round 01's build-prompt quoted none, and none was invented). Provide the two ledes, or draft them in
   this round's copy pass — either resolves D10.
2. **Placement & shape.** Where do the new sections slot in the current order (hero → value → how-it-works →
   save → connect → graph → pricing → final CTA)? And are (a)+(b) two sections or one "built for agents"
   band?
3. **Presenting a 486-line skill.** Excerpt + copy/download controls? A scrollable pane? Download/copy-only
   with a short preview? Your call — the constraint is only that "copyable + downloadable" both exist.
4. **Code presentation.** Should the quickstart reuse the terminal-block language (like the hero) or a
   distinct code-block treatment with a copy control? (Both exist as idioms — §4.)
5. **Imagery.** Screenshots (e.g. the Org API keys panel, a saved doc page) or typography-only? If you want
   imagery, attach it — I won't invent any.

---

## 7. Attachments to upload · Definition of done

- **Attach (optional):** any screenshots you want featured (dashboard Org API keys panel, a public doc page,
  a terminal recording still). Nothing to show → typography-only is fine; say so.
- **Done when:** the card set is visible in the Design System pane (`Landing` + any `Components` /
  `Foundations` cards), `result.md` + `build-prompt.md` (+ `tokens.css` on delta) are returned, and you have
  cleared the gate — `python3 scripts/workflow.py set-slice-status P20.S2 in_progress` — and told me the
  **project id** to read back from.

---

*This handoff is the OUT half of the round. The returned card set / `result.md` / `build-prompt.md` are the
IN half — read-only data I land as-is, never edit.*
