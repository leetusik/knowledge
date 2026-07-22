# P20.S2 — Design round 02: env-var quickstart + skill-on-landing (handoff)

## Context

The two remaining P20 surfaces — an **env-var agent quickstart** section and a **skill-on-landing** section (explain skill, copyable + downloadable) — are new landing sections, i.e. product visual design → the design-cowork gate. S2 is `kind co-work / risk high`, run by me on the main thread (DesignSync is main-thread-only; **never dispatched** — the sanctioned exception to delegation). It produces **one artifact: the handoff**, then goes `pending` while you design in Claude Design (claude.ai/design). Implementation is S3, sized from the returned `build-prompt.md`. I design nothing.

## What I'll write: `web/design/rounds/02-onboarding/handoff.md`

Mirrors the round-01 structure (`web/design/rounds/01-landing/handoff.md`):

1. **Product context** — P20 onboarding: the hero now shows the real one-liner flow (S1 landed it: `curl -fsSL …/install.sh | bash` → honest `init` w/ password prompt → `save` with direct doc URL); these two sections complete the journey: the recommended **agent path** (env vars + skill) and the **published skill** itself.
2. **Scope (one card per reviewable unit)** —
   - (a) **Env-var quickstart**: the recommended agent setup — `export KB_API_BASE_URL` / `KB_API_TOKEN` (org-level `vk_` from the dashboard), with the real blockers surfaced: repo `.env` is never auto-loaded (→ `~/.zshenv`), Codex needs `[sandbox_workspace_write] network_access = true`, plain-REST fallback (`curl POST /api/documents` + Bearer). All commands/facts supplied as **locked data**.
   - (b) **Skill-on-landing**: publish `plugin/skills/explain/SKILL.md` (486 lines, canonical, parity-gated) copyable + downloadable, with agent-first guidance ("the REST API is fully usable by hand; the recommended path is a coding agent driving the skill").
3. **Locked vs in-play** — locked: everything round 01 locked (teal-only accent, three faces, warm paper, no emoji, a11y floor, token names) **plus the shipped round-01 landing design** (this round adds sections, it doesn't redesign the page) **plus all technical facts/commands** (env-var names, exports, sandbox toggle, skill filename — data, not copy). In play: the new sections' layout/composition/band expression/motion, **and copy for the new sections + the D10 feature ledes** (dated exception 2026-07-22, same rationale as round 01: the copy doesn't exist; grounded in real docs, never lorem).
4. **Where to look** — real paths: `web/src/content/marketing/{content.ts,terminals.ts,links.ts}`, `primitives.tsx`, `marketing.css`, `kb-tokens.css`, `globals.css` `@theme`; the real skill file; `web/public/install.sh` (S1); existing copy affordances as data (`copy-link-button.tsx`, `ShowOnceKey` idiom); P20 `intent.md`.
5. **Required outputs** — the card set (**line-1 `@dsCard` marker on every card**; groups `Landing` + `Components` if a copy/download affordance is designed + `Foundations` only on token delta), `tokens.css` only if values change (else say so), `result.md` + `build-prompt.md` (S3's implementer has no DesignSync — completeness matters).
6. **Open questions posed back (I answer none)** — (1) **D10**: the two mid feature sections (`FEATURE_SAVE`, `FEATURE_CONNECT`) shipped with no lede — provide copy or draft it this round? (2) Where do the two new sections slot in the page order (and are they two sections or one "for agents" band)? (3) How is a 486-line skill presented — excerpt + copy/download, full scroll pane, or download-only? (4) Copyable presentation for the quickstart (terminal block vs code block + copy button)? (5) Any imagery/screenshots to attach, or typography-only?
7. **Definition of done** — cards visible in the Design System pane; then clear the gate (`python3 scripts/workflow.py set-slice-status P20.S2 in_progress`) and tell me the **project id**.

## Execution (this run, after approval)

1. Write the handoff above.
2. `start-slice P20.S2` → commit `feat(design): P20.S2 handoff — round 02 onboarding sections`.
3. `set-slice-status P20.S2 pending` → **STOP the loop** and report what you do next in Claude Design, including the connection choice:
   - **Local-dir connection (my recommendation this round)** — no push needed; avoids shipping S1's CLI changes to `git+`/installer users before S4's gated verification.
   - **Connect GitHub (the default)** — needs current `main` pushed first; that push is authorized by the design slice but also un-gates S1's CLI changes early (they're tested and low-risk — your call).

## Later run (after you clear `pending`)

DesignSync read-back inline (`list_files` first; project by **id**), concreteness check (no design decisions left to invent, else `needs_operator`), land the returned `output/` **as-is** + `SIGNOFF.md` + spec into `phase.md`, commit `feat(design): P20.S2 read-back — …`, `finish-slice P20.S2`, validate, commit; close D10 bookkeeping (resolved by the round); then plan S3 from `build-prompt.md`.

## Verification

Handoff exists at `web/design/rounds/02-onboarding/handoff.md`; `validate` green; backlog shows `P20.S2 [~] pending`; `next` prints `WAITING ON OPERATOR`.
