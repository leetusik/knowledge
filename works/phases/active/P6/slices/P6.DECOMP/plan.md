# P6.DECOMP — Plan (orchestrator native plan, operator-approved)

## Context

P6's objective (per `phase.json` / `intent.md`): an interactive, Obsidian-like knowledge map of the KB — documents as nodes, links/tags as edges — rendered **client-side on the static GitHub Pages site** (hosting unchanged; visual design follows P5's Claude-designed language; SaaS-someday and P7 plugin-packaging must not be precluded, both out of scope).

This is the phase's decomposition slice, executed by `slice-executor-high`. Its job: **create the phase's middle slices only** (bare folders via `new-slice`, deliberate `--risk`/`--order`) and **seed `phase.md`** with the breakdown, findings, and constraints. It never pre-fills any slice's `plan.md`, never implements, never commits, never transitions status.

## Research findings to seed `phase.md` with (verified by orchestrator exploration)

**Corpus / graph data model:**
- Nodes: **6 explainer docs** — `docs/changple5/` ×4, `docs/hi2vi_web/` ×1, `docs/bootstrap_agentic_workspace.sh/` ×1. Frontmatter: `title`, `date`, `tags`, optional `related` (repo-relative .md paths), `source{project, repo}`.
- `docs/current/*.md` (11 durable docs) are a separate published content class with **no** tags/related/project — include-or-exclude in the graph is a modeling decision (lean: exclude from v1 or ship behind a toggle; they'd be isolated islands).
- Edges available today: exactly **3 directed `related:` edges** (P39→P35, P35→P39, P35→P26, all changple5); **~26 tags** (mostly singletons; only `performance` repeats); **3 projects** (also the directory grouping). Zero body-level links/wikilinks in the corpus.
- Backlinks are **not precomputed anywhere** — P4.S4 explicitly left inversion to P6. Dead `related:` entries are tolerated by design (shape-checked only): broken edges are data to surface, not errors.
- Because `related:` edges are sparse, an Obsidian-like map almost certainly wants **tags as first-class nodes** (doc–tag edges) with project as color/group — otherwise the map is 3 arrows and floating dots. Decide the node/edge model deliberately and record it in `phase.md`.

**Site pipeline & binding constraints (deploy-gated by `scripts/site_smoke.py`):**
- mkdocs-material **9.7.6**, pin parity between `.github/workflows/pages.yml` and `compose.yml` (guard-enforced). Never add `nav:`/`strict:` (auto-nav is load-bearing). `exclude_docs`: `/versions/`, `/README.md`.
- The Pages site is **browser-only** — it cannot call the local FastAPI (the API's related/tags/projects endpoints are local-only groundwork). Graph data must be a **static asset generated at build time** (the way Material search rides `site/search/search_index.json`; any non-`.md` under `docs/` is copied into `site/` verbatim).
- **Zero custom JS today, and the guard enforces it**: `site_smoke.py` fails the build if `extra_javascript:` appears in `mkdocs.yml` and fails on any external `<script src="http…">`. P6 ships the repo's first custom JS: the renderer must be **vendored locally** (no CDN), `extra_javascript` added, and `site_smoke.py` updated **in the same slice that flips it** (allow exactly the vendored entries; keep no-CDN, no-`/Users/`-leak — graph JSON must carry repo-relative paths/URLs only).
- **No mkdocs `hooks:` exist yet.** Graph-JSON generation mechanism is an open decision: mkdocs `hooks:` module (runs in both `mkdocs serve` and CI — local live dev works; PyYAML available via mkdocs) vs standalone `scripts/build_graph.py` CI step (mirrors `site_smoke.py` pattern but dead during local serve). Lean: hooks module. Record as an ADR-bound decision in `phase.md`.
- **Design**: `docs/stylesheets/extra.css` is the single token source (§1 LOCKED teal palette, §2 typography — font budget spent, no new webfonts, §3 shape/motion). The graph UI must consume `--kb-*`/`--md-*` tokens for automatic light/dark parity. Full-canvas page pattern exists: a `docs/graph.md` with `hide: [navigation, toc]` gets a top tab from auto-nav for free; optional `.kb-card` entry on the landing grid (mind the guard's hero/`#recent` DOM invariants when touching `index.md`).
- **Renderer choice open**: vendor a small MIT lib vs hand-rolled canvas force sim vs middle path (vendor `d3-force` ~25 KB for physics + custom canvas rendering). Corpus is tiny (≲20 nodes) so all are viable; Obsidian feel = springy force layout, pan/zoom, drag, hover-neighborhood highlight, click-to-navigate. Lean: d3-force + custom canvas. Record the direction; the implementing slice's plan finalizes it.

## Candidate slice breakdown (hypothesis — refine and decide)

- **S1 — Graph data pipeline** (risk `medium`): build-time `graph.json` emitter (chosen mechanism) — nodes with metadata (title, url, date, tags, project, degree), edges (`related` directed + doc–tag), publish-safe, deterministic, dead-edges flagged; shape smoke-checkable.
- **S2 — Graph renderer & page** (risk `high`): vendored/hand-rolled interactive canvas (force layout, pan/zoom, drag, hover highlight, click-through, tag-node toggle, project coloring), `docs/graph.md` full-bleed page, token-based theming in both schemes, `extra_javascript` wiring.
- **S3 — Guard, CI & entry-point integration** (risk `medium`): `site_smoke.py` new invariants (vendored JS allowlist, `graph.json` present + sane, no-CDN/no-path-leak preserved), landing entry point, compose-serve parity, ops hygiene.
- REVIEW then consolidates doc versions (expected impacts: architecture, frontend, experience, operations, qa, decisions — ADRs for data mechanism, renderer choice, node/edge model).

3–4 middle slices is the right zone — don't over-slice a tiny corpus feature. `--risk` selects the executor tier (low=haiku literal mechanic / medium=sonnet / else opus) and is the phase's cost lever; nothing here looks fully mechanical, so `low` is unlikely unless a truly mechanical chunk is carved out. Use whole `--order` values (1, 2, 3…) leaving fractional room.

## Executor contract for this slice

- Allowed: `python3 scripts/workflow.py new-slice --phase P6 --slice P6.S<n> --name "..." --kind implementation --risk <r> --order <n>` (bare folders only), editing `works/phases/active/P6/phase.md` (Decomposition, Findings & Notes, Constraints, open decisions), writing this slice's own `result.md`.
- Not allowed: feature code, other slices' `plan.md`, `doc-new-version`, commits, status transitions.
- Before returning: `python3 scripts/workflow.py validate` must pass; return a structured verdict.
