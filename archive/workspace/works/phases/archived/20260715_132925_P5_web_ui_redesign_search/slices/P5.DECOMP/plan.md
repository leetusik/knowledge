# Plan — P5.DECOMP (decompose phase P5: Web UI redesign & search)

Orchestrator's native plan, operator-approved 2026-07-10. Executor: `slice-executor-high`.

## What this phase is

Phase P5: a **Claude-designed visual overhaul of the MkDocs GitHub Pages site** plus an **upgraded search experience**. Hosting stays GitHub Pages — a redesign of the static site, not a hosting change, and not the SaaS/personal web UI (SaaS-someday is noted; keep architecture from precluding it, out of scope). The Obsidian-like knowledge graph is **P6, not here**. Deferred job **D2** (design polish: palette/fonts/logo, optional extra_css — trigger met, site is live) is absorbed into this phase. See `../../intent.md` for the confirmed operator intent.

Your job in this slice: **audit → propose the middle-slice breakdown → create the middle slices (bare folders) → record everything in `phase.md`**. You do NOT implement anything, and you do NOT pre-fill any other slice's `plan.md`.

## Established facts (verified by orchestrator research — spot-check, don't re-derive)

- Site: mkdocs-material **9.7.6** (exact pin; CI `.github/workflows/pages.yml` pip pin and `compose.yml` viewer image must bump together — pin parity). Stock theme: indigo palette, light/dark toggle, features `content.code.copy`, `search.suggest`, `search.highlight`, `toc.follow`; plugins `search` + `tags`; markdown extensions incl. admonition/attr_list/toc-permalink/pymdownx.
- **Auto-nav is load-bearing**: no `nav:`, no `strict:` — ever (lets `/explain` add pages with zero config). `exclude_docs: /versions/` is the only exclusion mechanism.
- **Clean slate for design**: no `overrides/`, no `extra_css`, no `extra_javascript`, no hooks. `site/` is gitignored (stale local build on disk predates exclude_docs — ignore it).
- Publishing: `pages.yml` on push to main (+ dispatch); build = `pip install mkdocs-material==9.7.6` → `mkdocs build` (never `--strict`) → upload/deploy-pages. Manual-push-only deploys. Local CI-parity check: `docker compose run --rm kb build`. No automated site-build tests exist.
- Content (20 published pages): 6 explainer docs in 3 per-project dirs (frontmatter `title/date/tags/related/source{project,repo}`); 11 durable docs `docs/current/*` (different frontmatter: doc_id/version/…); `docs/index.md` (landing page — carries the `<!-- explain:recent -->` marker + strict bullet format parsed by BOTH the server write path (`server/documents.py`) and the /explain skill's API-down fallback — the marker and bullet format MUST stay intact); `docs/tags.md` (`<!-- material/tags -->`); `docs/README.md`.
- Search today: built-in lunr, `lang: ["en"]`, default separator `[\s\-]+`, boosts title 1000 / tags 1000000 — **no CJK support at all** despite Korean-topic content. The P4 hybrid semantic search (BM25+recency+Gemini+RRF) lives in the local FastAPI `server/` — a static Pages site cannot call it; the site upgrade must be client-side-capable.
- `docs/current/frontend.md` and `docs/current/experience.md` are bootstrap placeholders — P5 produces the first real frontend/experience truth (doc versioning happens at P5.REVIEW, not here).
- P4 left "FOR P5" notes in `works/phases/active/P4/phase.md` (tags/projects endpoints, delete-toast contract) — those are API/local-UI affordances; decide what is genuinely in a *static-site* phase vs. noted for later/P6/P7.

## Your tasks

1. **Audit** the current site surface (read-only): `mkdocs.yml`, `.github/workflows/pages.yml`, `docs/index.md`, `docs/tags.md`, `docs/README.md`, content shape, and what stock Material gives vs. what a Claude-designed overhaul needs — theme config (fonts, palette, logo/favicon, features like navigation.instant/tabs/sections, social cards?), `extra_css` design tokens, possible `overrides/` custom_dir. For search: what an upgraded, **CJK-capable client-side** search can be on a static host — Material `search` plugin config (`lang`, `separator` — e.g. the documented CJK separator patterns), lunr segmentation limits for Korean, vs. a custom static index + small JS (e.g. prebuilt JSON + client fuzzy search). Run a small empirical probe only if cheap (e.g. `mkdocs build` locally and inspect `search_index.json`); do not build heavy prototypes.
2. **Propose the middle-slice breakdown** — keep it small and coherent (P4 had 6; this phase likely wants ~3–5). Expected shape (adjust from your audit, this is guidance not prescription):
   - a **design-system slice** (Claude-designed palette/typography/spacing/branding via theme config + `extra_css`, logo/favicon) — this is the slice that absorbs **D2** (see task 4);
   - a **landing-page / UX-structure slice** (index.md redesign preserving the `explain:recent` contract, nav/browse experience, tags page, maybe per-project landing feel);
   - a **search-upgrade slice** (CJK-capable client-side search);
   - optional glue/hygiene the audit surfaces (e.g. a site-build smoke check in CI parity, social cards).
   Set each slice's `--risk` **deliberately** (`low` = fully mechanical plan-following only → haiku executor; `medium` → sonnet; high/unknown → opus). Risk is the phase's main cost lever. Design-judgment slices are NOT `low`.
3. **Create the middle slices** with `python3 scripts/workflow.py new-slice --phase P5 --slice P5.S<n> --name "..." --kind implementation --risk <r> --order <n> [--depends-on ...]` — **bare folders only**; never write their `plan.md`. EXCEPTION for the D2-absorbing design slice: do NOT create it — see task 4.
4. **D2 absorption**: the orchestrator (not you) will run `promote-deferred D2` to create the design slice so the deferred brief attaches. In `phase.md`, state exactly which slice ID/name/risk/order the orchestrator should create via promotion (mirror the P4/D1 pattern: propose, don't create).
5. **Record in `phase.md`** (seed the notebook): the breakdown table (slice, area, kind, risk, order, depends) + per-slice rationale + ordering logic; your audit findings (with file:line pointers where load-bearing); constraints for all later slices — at minimum: pin parity 9.7.6 (bump CI+compose together), never `nav:`/`strict:` (use `exclude_docs` only), preserve the `<!-- explain:recent -->` marker + bullet format, this is a static-site phase (no server/API changes required; if a slice wants one, flag it as scope creep), never hand-edit `docs/current/*` or `docs/versions/*`, doc changes = one-line "Doc impact" notes in `phase.md` consolidated at P5.REVIEW, keep tests lean (prefer `docker compose run --rm kb build` smoke over suites); and doc-impact guidance (likely targets: frontend.md, experience.md, operations.md, decisions.md, maybe product.md).
6. Write your free-form `result.md` in this slice folder (what you did, what you created, key decisions, anything the orchestrator must do next — e.g. the promote-deferred call).

## Hard constraints

- `new-slice` is allowed (this is the decomposition slice). No other workflow.py state changes: no commits, no `start-slice`/`finish-slice`/`set-slice-status`/`set-phase-status`, no `doc-new-version`, no `promote-deferred`.
- Never pre-fill another slice's `plan.md`; new slice folders stay bare (just their `slice.json`).
- Read-only outside: `works/phases/active/P5/` (this slice folder + `phase.md`) is your write surface, plus nothing else.
- Do not edit `mkdocs.yml`, site content, server code, or CI in this slice — audit only.

## Verdict

Return your structured verdict per your agent contract (`done` | `escalate` | `needs_operator` | `blocked`), with the list of slices created and the proposed D2-promotion slice spec.
