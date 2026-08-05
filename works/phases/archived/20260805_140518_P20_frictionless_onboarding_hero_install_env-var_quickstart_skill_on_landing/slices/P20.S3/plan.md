# P20.S3 — implement the designed onboarding sections (agent quickstart + published skill)

## Context

Round 02 is landed; **`web/design/rounds/02-onboarding/output/build-prompt.md` is the implementation contract** — it pins the page order, full verbatim copy (both sections + the D10 ledes), snippet/copy behaviors, the `/SKILL.md` artifact decision, the copy-control component, and the motion/a11y floor. This slice implements it faithfully in `web/` plus the parity plumbing. Executor: `slice-executor-high` (risk high). **RESPECT THE DESIGN:** ship every designed element as designed — layout, density, hierarchy, tokens, interactions, states; never drop, simplify, restyle, or "improve" a designed element; where an exact value isn't specified, pick the option closest to the designed intent, never a plainer fallback. The bronze `KNOWN TRAP` kicker ships **as returned** (operator raised no objection; it's a literal `#c8a15e`, the terminal `.key` ink — swap later is one value).

## Changes

### 1. The served artifact + parity gate (do this first — the skill section reads it)

- `cp plugin/skills/explain/SKILL.md web/public/SKILL.md` (committed byte-copy; served at `/SKILL.md` — same zero-infra path as `install.sh`).
- Extend `scripts/skills_parity.py` with a third copy: `WEB = web/public/SKILL.md`, **full-file byte-compare against CANONICAL** (it's a published copy, frontmatter included — stricter than the portable body-only rule; a mismatch or missing file FAILs). Update the docstring. CI needs no change (`plugin-ci.yml` already runs the script).

### 2. Content (`web/src/content/marketing/content.ts` + `links.ts`)

- Add `lede` to `FEATURE_SAVE` and `FEATURE_CONNECT` — **verbatim from build-prompt §D10** (this closes D10 in shipped code).
- New copy modules `AGENT_QUICKSTART` and `FEATURE_SKILL` — every string **verbatim from build-prompt §(a)/§(b)** (eyebrow/H2/lede/ticks/CTA), plus the locked snippet strings as exported constants: the two export lines (with trailing comment, exact spacing) for the **copy action**, the comment-above display variant, and the health-check curl line. Byte-exactness of these is part of the contract.
- `links.ts`: `MKT_SECTION_IDS` gains `agents: "agents"`, `skill: "skill"`; add LINKS entries for "Mint an org key →" (the dashboard Org API keys panel — anchor if the panel has an id, else `/dashboard`) and the served artifact (`/SKILL.md`).

### 3. Sections (`web/src/components/marketing/`)

- **`agent-quickstart.tsx`** (server) — dark band continuing Connect (§0: same `--kb-band-dark`, `--kb-border-on-dark` hairline divider between them, scheme-independent); feature-row mirroring `feature-connect.tsx` (Band/Reveal/Eyebrow/Ticks/CtaLink); right column top→bottom (14px gaps): `~/.zshenv` snippet block → trap note (dashed hairline, bronze mono `KNOWN TRAP` kicker) → health-check snippet block with the `200 connected · 401 wrong-or-revoked key` legend.
- **`feature-skill.tsx`** (server) — sunken band (`--kb-surface-sunken` via Band's sunken tone), copy left 1fr / document pane right 1.15fr; actions: **Download SKILL.md** (`<a href="/SKILL.md" download>` styled CVA primary) + **Copy the skill** (copy control at 44px scale). Document pane per §(b): bar (`SKILL.md` · `486 lines · yaml + markdown` · `/knowledge:explain`), body = the **real head of `web/public/SKILL.md` read at build time** (fs read in the server component — never a pasted string), mono 12.5/1.75, `max-height: 430px`, bottom fade; foot bar with "read the whole skill ↓" expand (releases to 70vh scrollable, link flips to "collapse ↑"; **no-JS fallback = the Download link**) and "byte-parity with plugin/skills/explain/SKILL.md".
- **Copy control + snippet block** — one small client island (e.g. `copy-button.tsx` + a server `snippet-block.tsx` around it), states per §(c) mirroring the `copy-link-button.tsx` idiom (`navigator.clipboard.writeText`; idle **Copy** → **Copied** teal accent, 2s revert → **Copy failed** dashed; never log the value; 2px focus ring; reduced-motion: no transition). Copy always copies the **full artifact** (both export lines with comment / whole curl line / whole skill fetched from `/SKILL.md`).
- **`feature-save.tsx` / `feature-connect.tsx`** — render the new ledes (`t-lead`, matching how existing sections render ledes).
- **`page.tsx`** — re-slot per §0: … `FeatureSave` → `FeatureConnect` → `AgentQuickstart` → `FeatureSkill` → `FeatureGraph` → …; update the band-order header comment.
- **`marketing.css`** — append a round-02 block for the snippet/trap/skill-pane/copy-pill vocabulary, following the file's own conventions (Tailwind utilities first; only what utilities can't express; never revalue a locked token; the design project's round-02 CSS is a visual spec, not code to port).

### 4. Tests (terse, per repo rules)

One small vitest file for the copy control (idle→copied transition, failure path, full-artifact payload) following the existing 8-file suite's conventions. Nothing more unless a broken existing test demands it.

## Verification (executor runs; report in result.md)

- `python3 scripts/skills_parity.py` → PASS with the new third copy.
- `cd web && npm run typecheck && npm run lint && npm run test && npm run build` — build proves the build-time fs read + static generation and that `/SKILL.md` + both sections ship.
- Definition-of-done checklist from build-prompt's final section, item by item, in `result.md` (order, D10 ledes, byte-exact snippets, Download + full-text Copy, expand/collapse + no-JS fallback, copy states, both schemes).
- Doc impact one-liners to `phase.md` (expected: `frontend.md`, `experience.md`, `product.md`, `decisions.md`/parity-gate note) + cross-slice notes for S4's live smoke (what to click/copy on prod).

## Out of scope

No deploy/push (S4). No design-record edits (`web/design/rounds/*` read-only). No new tokens. `install.sh`/hero untouched.
