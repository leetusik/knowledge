# Plan — P5.S1 (Design system — Claude-designed palette/typography/branding)

Orchestrator's native plan, operator-approved 2026-07-10. Executor: `slice-executor-high`. Absorbs deferred **D2** ("Design polish for the Pages site: palette/fonts/logo, optional extra_css" — deferred at P3 because the operator chose publish-first; its trigger, a live Pages deploy, is long met).

## Operator-chosen visual direction (binding)

**"Calm editorial library"** — warm paper-like neutrals, serif display headings over a clean sans body, generous whitespace and comfortable measure, a **single deep-teal accent**, soft borders, no heavy shadows. The site should read like a well-typeset book; content is long-form educational explainers, mixed EN/KR. Chosen by the operator at the plan gate from four presented directions (over "modern dev-tool", "friendly & colorful", "refined stock").

Within this direction, design judgment (exact hex values, font pairing, scale, mark design) is yours. Aim for distinctive-but-restrained: someone landing on the site should feel "curated personal library", not "stock Material demo".

## Read first

- `works/phases/active/P5/phase.md` — Findings & Notes (site config facts with file:line pointers), Constraints (binding), Doc impact.
- `mkdocs.yml` (repo root), `docs/index.md` (do NOT modify — but know its structure so your card/type styles will suit S2's coming redesign).

## Deliverables

1. **`docs/stylesheets/extra.css`** (new) — the design system:
   - Custom palette over Material's CSS custom properties, both schemes, keeping the existing `prefers-color-scheme` + manual toggle: light `default` → warm ivory surfaces, ink text; dark `slate` → warm-tinted dark (tune `--md-hue` or explicit overrides); deep-teal accent for links/hover/focus/highlights/permalinks. Use `palette.primary: custom`-style overrides per Material **9.7.6** conventions — verify actual behavior against the pinned version with a local build, not from memory.
   - Typography: serif display face for headings, clean sans body, mono code — wired via `theme.font` (Google Fonts) and/or `extra_css` `@import`/`@font-face`, with an explicit **Hangul fallback stack** (e.g. `'Apple SD Gothic Neo', 'Noto Sans KR', sans-serif`) on body and headings (mixed EN/KR content). Keep it light: ≤2 webfont text families + 1 code font.
   - Type scale, line-height/measure, spacing rhythm, and polish for: code blocks, admonitions, tables, tag pills (tags-plugin output), search input, header/footer.
   - A small reusable **card/grid utility** (soft borders, both schemes) documented for S2's landing redesign to consume. Do NOT touch `docs/index.md` itself.
2. **Branding assets** (new, original): `docs/assets/logo.svg` + favicon (SVG, or PNG if compat needs it) — a simple editorial mark (◆/book/spark family), legible at 16px, working in both schemes. Wire `theme.logo` + `theme.favicon`.
3. **`mkdocs.yml` edits (surgical):** palette colors (keep the two-scheme toggle structure), `font:`, `extra_css:`, `logo`/`favicon`. **Never add `nav:`/`strict:`** (auto-nav is load-bearing); keep `exclude_docs`, plugins, and the existing `features:` list unchanged (nav-feature tuning is S2's). **Do NOT bump mkdocs-material** — pin parity 9.7.6 (`pages.yml:25` + `compose.yml:3`) stays untouched.
4. **Optional thin `overrides/` custom_dir** only if genuinely needed (e.g. font preload). Prefer skipping. **Social cards: skip** (CI dependency weight) — add a forward note in phase.md instead.
5. **Doc impact one-liners** appended to `phase.md` → "Doc impact → Actual notes": frontend.md (first real truth: theme config + token architecture), experience.md (visual language, dark/light behavior), decisions.md (palette/typography/branding ADR incl. rejected alternatives), operations.md only if the build gains a real new step.
6. **Cross-slice notes** appended to `phase.md`: what S2/S3 should reuse — token/custom-property names, the card utility's class names and intended markup, accent-usage rules, font stacks.
7. **`result.md`** (free-form, from scratch) in this slice folder.

## Hard constraints

- Touch ONLY: `mkdocs.yml`, `docs/stylesheets/`, `docs/assets/`, optional `overrides/`, and `works/phases/active/P5/` (this slice folder + phase.md). Never: `server/`, `.github/`, `compose.yml`, `docs/index.md`, `docs/tags.md`, `docs/README.md`, `docs/current/*`, `docs/versions/*`, explainer content, the /explain skill.
- No commits, no workflow status transitions, no `doc-new-version`, no `new-slice`.
- Keep tests lean — validation is the CI-parity build below, not a test suite (S4 may add a CI guard later).

## Validation (run before returning)

- `docker compose run --rm kb build` passes (same 9.7.6 image as CI; local mkdocs is NOT installed — docker is the build path).
- Built `site/` contains `stylesheets/extra.css` + the logo/favicon assets; `site/versions/` still absent (exclude_docs intact).
- `git status`/`git diff --stat` shows no out-of-scope files touched; `docs/index.md` byte-identical.
- Inspect built HTML/CSS for both schemes (grep the emitted head for font/palette wiring). Optionally leave `docker compose up -d kb` (port 8765) running and say so in result.md, so the operator can eyeball the design; deploys stay manual-push-only.

## Verdict

Return your structured verdict (`done` | `escalate` | `needs_operator` | `blocked`) with a summary of design decisions made.
