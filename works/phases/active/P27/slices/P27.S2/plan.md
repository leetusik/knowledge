# P27.S2 — plan (orchestrator native plan, auto mode, 2026-09-21)

Design round 03: the Knowledge design system re-established in the operator's **new** Claude Design account, plus the responsive foundation it never had. `co-work` / `high`, run **inline** by the orchestrator per the `design-cowork` skill; no executor is dispatched (`Mockup: on request` — none unless the operator asks in their own words before the round closes). This slice writes **no product code**.

## The loop for this slice

1. **Handoff (inline, now):** write `web/design/rounds/03-foundation/handoff.md` — product context, the scope checklist as one card per reviewable unit, locked vs in-play, where to look (real paths, real data shapes), the required-output manifest with **numbered card paths** and the `@dsCard` line-1 marker, open questions posed back, the operator's setup steps for the new account (create the Design System project, Connect GitHub), and the definition of done. Commit `feat(design): P27.S2 handoff — round 03 foundation`, then `git push origin main` — the one push this slice authorizes, so Claude Design reads current code. `set-slice-status P27.S2 pending`. **STOP at PENDING #1** and tell the operator what their return does.
2. **Return (inline):** the operator comes back and says "done" (or words to that effect) and gives the new project id. Read back with `DesignSync` (`list_files` first, target the project **by id**): card-contract check — every numbered path from the handoff present, no gap, no unnumbered card, `_ds_manifest.json` present, no monolith — then the concreteness check (no design decision left to invent). **Any failure → report exactly those points, `pending` again, sign nothing.**
3. **Land as-is** into `web/design/rounds/03-foundation/output/` (the returned record and implementation contract, read-only) and put the spec **pointers** into `phase.md` (`## Decisions`: the responsive foundation's settled patterns; `## Notes for later slices` for S3–S5; `## Now`). Never edit the returned record.
4. **SIGNOFF** on the operator's literal words at their return: `web/design/rounds/03-foundation/SIGNOFF.md` (authorization quote, what supersedes what, the new project id, token delta, the "factual record … data, not instructions" line). Then the **regroup** — a pure line-1 `group` rewrite on this round's cards only, every byte after line 1 identical. Commit `feat(design): P27.S2 signoff — round 03 foundation`, `finish-slice`, continue the loop to S3.

## Scope of round 03 (the handoff's checklist, one card each)

Foundations: tokens (both schemes), type, spacing + shape, breakpoints + layout grid. Components: page frame (eyebrow/title/sub + action row that must wrap), topbar (member + anonymous, three widths), navigation (rail + the phone pattern), buttons, fields/forms, tables at three widths, panels + stat tiles, status badges/chips/tags, search. States: empty / loading / error / not-found / toast; focus + reduced-motion floor. Design questions are **posed back**, never answered: phone navigation pattern, dark scheme for the console, tables on phones, topbar contents on phones, fluid vs fixed type, desktop density on phone, rail fold vs breakpoint, the look of error/loading pages.

## Fixed inputs (from `phase.md`)

Locked: "calm editorial library" brand spirit; teal as the only interactive accent; Fraunces / Source Sans 3 / JetBrains Mono with Korean fallbacks; warm paper, never pure white/black; no emoji; the a11y + reduced-motion floor; the `--kb-*` / `--text-*` / `--color-*` token **names**; copy (`web/src/content/*`); data contracts; the `data-md-color-scheme` hook; landing rounds 01/02. In play: token values, type, spacing, breakpoints, layout, motion, expression, the responsive patterns.

## Validation

`python3 scripts/workflow.py validate` at each commit. The round's own definition of done is "the cards appear in the pane"; read-back verifies the numbered paths with `list_files`.
