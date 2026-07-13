# Phase P6: Obsidian-like knowledge graph

_Intent: see [intent.md](intent.md)._

## Objective

Interactive Obsidian-like knowledge map of the KB — documents as nodes, links/tags as edges — rendered client-side on the static GitHub Pages site.

## Context

Third phase of the knowledge-feature roadmap (after P5's web-UI redesign). The map is a static-site feature: hosting is unchanged (GitHub Pages, mkdocs-material 9.7.6), visual design follows P5's Claude-designed "calm editorial library" language. SaaS-someday and the P7 plugin-packaging must not be precluded, but both are out of scope here.

## Decomposition

Three middle slices (S1 → S2 → S3), then REVIEW consolidates docs. Whole `--order` values, fractional room left between. This follows the DECOMP plan's S1/S2/S3 hypothesis with **one deliberate refinement**: the site-guard changes are split across the slices that cause them rather than pooled into one "guard" slice, because `site_smoke.py` fails the build the moment `extra_javascript:` appears in `mkdocs.yml` — so the JS guard-flip must ship in the same slice that adds `extra_javascript` (S2), and the cleanest seam puts the `graph.json` shape guard with its producer (S1). That leaves S3 as pure integration/entry-point/serve-parity. Every slice is designed to leave the tree green (site_smoke passing).

- **P6.S1 — Graph data pipeline + data-contract guard** (risk `medium`, order 1)
  - Build-time `graph.json` emitter via the chosen mechanism (lean: mkdocs `hooks:` module — see Findings). Parses explainer-doc frontmatter, produces nodes + edges, writes a static asset copied verbatim into `site/`.
  - Nodes: the 6 explainer docs + tag nodes (see node/edge model below). Node metadata: `title`, `url` (repo-relative site URL), `date`, `tags`, `project`, `degree`.
  - Edges: `related:` directed (3 today) + doc–tag. Backlinks computed by inverting `related:` at build time (P4.S4 left inversion to P6). Dead `related:` entries flagged as data (a broken-edge marker), never build errors.
  - Publish-safe: repo-relative paths/URLs only (no `/Users/` leak). Deterministic ordering (stable node/edge order across builds).
  - Adds `graph.json` presence + shape assertions to `site_smoke.py` — additive only (no `extra_javascript` yet), tree stays green.
  - **Risk = medium (opus):** logic is bounded and the data model is pre-decided here, but this is the repo's first mkdocs hook, determinism + dead-edge handling need judgment, and it locks the data contract the whole feature rests on. Not fully mechanical → not `low`.

- **P6.S2 — Interactive graph renderer, full-canvas page + JS guard flip** (risk `high`, order 2)
  - Vendored (no-CDN) interactive renderer. Lean direction: `d3-force` (~25 KB, MIT) for physics + custom canvas rendering (see renderer direction below). Force layout, pan/zoom, drag, hover-neighborhood highlight, click-to-navigate, tag-node toggle, project coloring.
  - `docs/graph.md` full-bleed page with `hide: [navigation, toc]` — auto-nav gives it a top tab for free.
  - Token-based theming: consumes `--kb-*`/`--md-*` from `docs/stylesheets/extra.css` for automatic light/dark parity. No new webfonts (font budget spent).
  - Adds `extra_javascript:` to `mkdocs.yml` **and** updates `site_smoke.py` in the same slice: allow exactly the vendored entries, preserve no-CDN + no-`/Users/`-leak invariants.
  - **Risk = high (opus):** the phase's heaviest slice — the repo's first custom JS, canvas interaction + force physics + dual-scheme theming, plus the guard-flip its own change requires. Deliberately kept as one slice: the vendored lib and the renderer are tightly coupled (you vendor d3-force *because* the renderer uses it); splitting would force a throwaway placeholder-JS seam just to stage the guard flip — over-slicing a tiny feature.

- **P6.S3 — Landing entry point + serve parity + ops hygiene** (risk `medium`, order 3)
  - Add a graph `.kb-card` to the landing `.kb-grid` in `docs/index.md` (4 cards today) — respecting the guard's hero / `#recent` / single `#__search` DOM invariants.
  - Verify `mkdocs serve` (compose `kb`) parity: the hooks module + vendored JS + `graph.json` all work under live-reload local dev, not just CI.
  - Final ops hygiene and any remaining Doc-impact notes.
  - **Risk = medium (opus):** touches the guarded `index.md`, and serve-parity verification of the novel hooks mechanism (does it emit under `mkdocs serve`, not only CI `mkdocs build`?) needs judgment. Bounded but not fully mechanical → not `low`. Could be reconsidered `low` if the S2 result proves the hook already emits cleanly under serve, leaving only a mechanical card edit.

REVIEW then validates all three slices together and consolidates doc versions. Expected doc impacts: `architecture` (build-time graph-data pipeline + browser-only rendering seam), `frontend` (renderer, page, theming), `experience` (the knowledge-map journey), `operations` (hooks mechanism + guard invariants in the build), `qa` (new site_smoke assertions), `decisions` (ADRs: data-generation mechanism, renderer choice, node/edge model incl. tags-as-nodes and docs/current exclusion).

### Tier mapping note (for risk-as-cost-lever)

`executors.toml` is all defaults → `flex` mode: **low = sonnet@xhigh, mid = opus@xhigh, high = opus@xhigh**. So the real cost split is `low` (sonnet) vs `medium`/`high` (both opus). Nothing here is fully mechanical, so no slice is rated `low`; `medium` vs `high` here signals judgment depth (both run opus), and the orchestrator may still bump one tier up.

## Findings & Notes

_Verified against the repo during DECOMP (spot-checks, not re-derivation)._

**Corpus / graph data model (verified):**
- Nodes today: **6 explainer docs** — `docs/changple5/` ×4, `docs/hi2vi_web/` ×1, `docs/bootstrap_agentic_workspace.sh/` ×1. Each dir also has an `index.md` section-landing page (not a graph node). Explainer frontmatter: `title`, `date`, `tags` (list), optional `related` (list of repo-relative `.md` paths), `source: {project, repo}`. Confirmed by reading the changple5 P39/P35 and hi2vi_web docs.
- `docs/current/*.md` = **11 durable docs** (`api, architecture, backend, data, decisions, experience, frontend, operations, product, qa, security`) with a *different* frontmatter class: `doc_id, version, created_at, source, summary, previous` — **no** tags/related/project. Separate published content class.
- Edges available today: exactly **3 directed `related:` edges** — P39→P35, P35→P39, P35→P26 (all changple5). Verified: `measure-first` has 1 `related` (→p35); `p35` has 2 (→measure-first, →prompt-injection); the daily-ingestion, prompt-injection(P26), hi2vi_web, and bootstrap docs have **no** `related`. So the `related:` graph is a single 3-doc cluster + 3 isolated docs.
- Tags: **26 distinct** tags across the corpus; only `performance` repeats (appears twice: P39 + P35). All others are singletons. So tag co-occurrence gives few doc–doc bridges but many doc–tag spokes.
- **3 projects** = the 3 directory groupings (`changple5`, `hi2vi_web`, `bootstrap_agentic_workspace.sh`), hard-coded as `PROJECTS` in `site_smoke.py`.
- Backlinks are **not precomputed anywhere** (P4.S4 left inversion to P6). Zero body-level links / wikilinks in the corpus. Dead `related:` entries are tolerated by design (shape-checked only) → broken edges are data to surface, not errors.
- Because `related:` is sparse (3 arrows + isolated dots), an Obsidian-like map wants **tags as first-class nodes**; otherwise the map is nearly empty.

**API groundwork (verified, and why the build can't use it):**
- `server/main.py` exposes `/api/tags`, `/api/projects`, `/api/documents`, `/api/search` etc. — these are **DB-backed and local-only** (require the FastAPI + SQLite running). The GitHub Pages site is **browser-only** and CI installs only `mkdocs-material==9.7.6` — no server, no DB. So the graph data **cannot** come from the API; it must be a **static asset generated at build time** (the way Material search rides `site/search/search_index.json`; any non-`.md` under `docs/` is copied into `site/` verbatim).
- `server/documents.py` has a reusable `parse_frontmatter(text)` (uses PyYAML). **Do not import it into the build** — that would drag the whole `server` package into the mkdocs build. The graph hook should parse frontmatter itself (PyYAML ships with mkdocs). Note for S1.

**Design system (verified):**
- `docs/stylesheets/extra.css` is the single token source (loaded via `extra_css`). Custom teal palette + two-scheme (light `default` / dark `slate`) toggle. `theme.font: false` (no Google Fonts) — the graph UI must reuse `--kb-*`/`--md-*` tokens and add no new webfonts.
- Full-canvas page pattern exists: `docs/index.md` uses `hide: [navigation, toc]`; a `docs/graph.md` with the same gets a top tab from auto-nav for free.
- Landing `docs/index.md` structure (verified): guarded `<div class="kb-hero">` (contains the single `for="__search"` label), then `<div class="kb-sec" id="recent">` immediately followed by `<!-- explain:recent -->` + Recent bullets, then a `<div class="kb-grid">` with **4** `.kb-card` links (changple5, hi2vi_web, bootstrap, Tags). S3's graph card slots into that grid.

## Constraints

Binding, mostly enforced by `scripts/site_smoke.py` (runs in CI `pages.yml` after `mkdocs build`, before deploy):
- **Never** add a top-level `nav:` or `strict:` to `mkdocs.yml` — auto-nav is load-bearing (guard fails if present). `theme.font: false` must stay.
- `exclude_docs` keeps `/versions/` and `/README.md` out of the built site — must not regress (`site/versions/` present → guard fail).
- **Zero custom JS today, guard-enforced:** `site_smoke.py` fails if `extra_javascript:` appears in `mkdocs.yml`, and fails on any external `<script src="http…">` in built pages. P6 ships the repo's first custom JS → renderer **must be vendored locally** (no CDN), `extra_javascript` added, and `site_smoke.py` updated **in the same slice that flips it** (S2): allow exactly the vendored entries; keep no-CDN + no-`/Users/`-leak. `graph.json` must carry repo-relative paths/URLs only.
- **Pin parity** (guard-enforced): `mkdocs-material` version must match between `.github/workflows/pages.yml` (`pip install mkdocs-material==9.7.6`) and `compose.yml` (`squidfunk/mkdocs-material:9.7.6`). Don't bump.
- **Landing DOM invariants** (guard-enforced) when touching `index.md`: exactly one `id="__search"` + a `for="__search"` label; `kb-hero` + `kb-grid` present; `<ul>` element-adjacent to `<div id="recent">`; the `<!-- explain:recent -->` marker + a rendered Recent `<li>`. S3's card edit must preserve all of these.
- **No mkdocs `hooks:` exist yet** — the graph-JSON mechanism is a new addition (see Open Questions; lean = hooks module).
- Graph data must be a **build-time static asset** (browser-only site can't call the local API). Deterministic + publish-safe.

## Open Questions

Direction-setting decisions recorded below; the named slice's own `plan.md` finalizes each.

- **Node/edge model (leaning):** nodes = 6 explainer docs **+ tag nodes** (tags as first-class nodes, ~26). Project = node **color/group**, not a node (colors the doc nodes). Edges = `related:` directed (3) + doc–tag (undirected). Backlinks = inverse of `related:` computed at build time. Dead `related:` → flagged as data. **`docs/current/*.md` EXCLUDED from the v1 graph** (different content class, no tags/related → would be isolated islands); could ship behind a toggle later. → **S1** finalizes.
- **Graph-JSON mechanism (leaning: mkdocs `hooks:` module):** runs in both `mkdocs serve` and CI (live local dev + deploy), PyYAML available via mkdocs. Alternative: standalone `scripts/build_graph.py` CI step (mirrors `site_smoke.py` but dead during local serve). Sub-question: where the hook writes `graph.json` so mkdocs copies it into `site/` (a `docs/` path vs emitting in `on_post_build`). → **S1** finalizes.
- **Renderer direction (leaning: `d3-force` ~25 KB + custom canvas):** alternatives = full vendored graph lib, or fully hand-rolled canvas force sim. Corpus is tiny (≲ 6 docs + ~26 tag nodes) so all are viable; Obsidian feel = springy force layout + pan/zoom + drag + hover-neighborhood highlight + click-through. Must be vendored (no CDN). → **S2** finalizes.
- **Tag-node visual treatment** (distinct color/shape/size from doc nodes; whether tag-node display is toggleable) — **S2** design detail.
- **`docs/current` inclusion behind a toggle** — deferred beyond v1 unless the operator asks.
