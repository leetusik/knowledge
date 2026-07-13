# Phase P6: Obsidian-like knowledge graph

_Intent: see [intent.md](intent.md)._

## Objective

Interactive Obsidian-like knowledge map of the KB — documents as nodes, links/tags as edges — rendered client-side on the static GitHub Pages site.

## Context

Third phase of the knowledge-feature roadmap (after P5's web-UI redesign). The map is a static-site feature: hosting is unchanged (GitHub Pages, mkdocs-material 9.7.6), visual design follows P5's Claude-designed "calm editorial library" language. SaaS-someday and the P7 plugin-packaging must not be precluded, but both are out of scope here.

## Decomposition

Three middle slices (S1 → S2 → S3), then REVIEW consolidates docs. Whole `--order` values, fractional room left between. This follows the DECOMP plan's S1/S2/S3 hypothesis with **one deliberate refinement**: the site-guard changes are split across the slices that cause them rather than pooled into one "guard" slice, because `site_smoke.py` fails the build the moment `extra_javascript:` appears in `mkdocs.yml` — so the JS guard-flip must ship in the same slice that adds `extra_javascript` (S2), and the cleanest seam puts the `graph.json` shape guard with its producer (S1). That leaves S3 as pure integration/entry-point/serve-parity. Every slice is designed to leave the tree green (site_smoke passing).

- **P6.S0 — Design co-work — knowledge-graph design via Claude Design** (risk `medium`, order 0.5)
  - Inserted mid-phase by operator direction (2026-07-14) so the graph is **designed and consented BEFORE implementation** — S1/S2/S3 build to a locked guide instead of inventing the visual language inline.
  - Flow was brief-push (`GRAPH_BRIEF.md` pushed to the "Knowledge Base Design System" project) → operator co-design in Claude Design → check-up **PASS** (structural + token-stability + contrast, no gaps) → mirror the deliverables locally as the integration source of truth.
  - Lands no repo code; the delivered guide reaches code at S1 (data-contract needs) and S2/S3 (renderer, page, integration). S1–S3 implement to the delivered guide (see "Design guide (P6.S0, locked)" below).

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

### Design guide (P6.S0, locked)

_The design S1–S3 plan against. Delivered by operator co-design in Claude Design, check-up PASS 2026-07-14._

**Where the guide lives:**
- Design project **"Knowledge Base Design System"** — README **"P6 · Graph — the knowledge map"** section + the `**P6.S0 closed (2026-07-14)**` close block (locks project inks, label strategy A, all token names).
- Local mirror (integration source of truth for S1–S3): `/private/tmp/claude-502/-Users-sugang-projects-personal-knowledge/62648e14-5642-42c8-af17-eea4e69b27da/scratchpad/kb-graph-design/` — `README.md`, `tokens/graph.css`, `components/graph/{graph.css, graph-render.js, graph-nodes/edges/labels/panel.card.html}`, `pages/graph.card.html`.
- `tokens/graph.css` is the **single token source** — `--kb-graph-*` only, **additive** (no existing token touched), names **frozen at S0 close**.

**Locked decisions:**
- **Project inks** = small muted categorical set scoped to **data-viz surfaces only** (node fills, legend chips): teal `#0f6f66`/`#62bdb2` (anchor) · bronze `#8a6a2a`/`#c8a15e` · plum `#764f6c`/`#c99bc0` (light/dark). Interactive accents (hover, selection ring, halo, active edges, links) stay **teal-only** — the one-accent rule is unchanged where it is UI.
- **Label Strategy A** (B/C explored, rejected): doc titles **always on**; neighborhood **tag labels** fade in on hover/selection/zoom-in; 12.5px doc / 11px tag at 1×. Plus the **zoom ladder**: `<60%` → hub doc labels only (degree ≥6), tooltip carries the rest · `60–110%` → all doc labels · `>110%`/hover/selected → neighborhood tag labels fade in ~80ms · reduced motion → no fades, paint at rest.
- **Motion** = settle-then-still ~600ms (`--kb-graph-settle`), then stop — no idle drift.

**Mark grammar:**
- **docs** = filled circles in project ink, r **6→14px** linear by degree, + plate-colored **cutout rim (1.5px)** to separate overlaps.
- **tags** = hollow rings **4.5px** (secondary tone).
- **ghost/unresolved** = dashed hollow ring **5.5px** (dash `4,4`).
- **related edges** = 1.75px + 5px arrowhead, tip **3px off the target rim** (direction reads "reads on to"); **tag edges** = 1px hairline; edges **into ghosts** dashed in the lighter edge ink.
- **hover/selected** = neighborhood keeps its ink + incident edges turn **teal** + soft radial **halo**; selection adds an **offset teal ring** (2px, 2px gap) + the **top-right info panel**. Everything else dims to alpha **.16 light / .22 dark** with labels hidden.

**Page anatomy (from `components/graph/graph.css` header):**
- full-bleed `.kb-graph` below header/tabs — **the map IS the page** (no content column).
- this page's template **suppresses both sidebars** (`.md-sidebar--primary/--secondary` → `display:none`).
- mount `.kb-graph` in `.md-main`; **zero `.md-content__inner`** margin/padding.
- overlays = quiet surface cards (hairline, `--kb-radius`, **no resting shadow**).
- placement: **legend + tag-switch bottom-left · zoom stack bottom-right · info panel top-right · pointer tooltip at low zoom**.
- canvas plate = `--kb-surface-sunken` (light) / `#16130f` (dark, deeper than paper so it recedes).

**Check-up verification (2026-07-14):**
- **19/19** LOCKED Target-1 values **unedited** (byte-match vs `docs/stylesheets/extra.css`).
- **18/18** contrast claims computed **PASS** (marks ≥3:1, labels ≥4.5:1 on both plates).

**Implementation cautions (S1–S3):**
- Specimen cards use the **Iconify CDN** for icons — **design-project-only**; the live site must **NOT** (no-CDN guard). Zoom/close icons become **inline SVG or text glyphs** on the real page.
- `graph-render.js` is the **DRAWING SPEC**, not the production engine: token access pattern + draw order (**dimmed edges → live edges → halo → dimmed nodes → live nodes → selection ring → labels with a 3px plate-colored halo stroke**). Engineering **replaces its hand-placed layout with the real force sim** but **keeps the drawing grammar**.
- The legend needs **per-project doc counts** + a **deterministic project→ink assignment** → **S1's `graph.json` should carry a top-level `projects` list**.

**Data-contract confirmation for S1:**
- Node fields **`title` / `url` / `date` / `project` / `tags` / `degree`** cover the info panel + legend + degree-sizing needs (confirmed against the panel + legend specimens).
- **Ghost nodes** carry the raw unresolved path as `title` (panel shows it + "linked from …" + a "no document yet" badge, no read-through).
- **Tag nodes need no `url`** — they are not navigation targets.

### P6.S1 — Graph data pipeline (implemented 2026-07-14)

**Mechanism landed:** mkdocs `hooks:` module at `scripts/graph_hook.py` (block-list in
`mkdocs.yml`, PyYAML-only, no `server/*` import). `on_files` reassigns a module-level
`{src_uri: File.url}` map; `on_post_build` walks `config["docs_dir"]`, parses frontmatter
itself, and writes `graph.json` to `config["site_dir"]`. Verified end-to-end via a
CI-parity venv build (mkdocs-material 9.7.6). Full write-up: `slices/P6.S1/result.md`.

**Final emitted schema (locked for S2 — this is the real shape):**
`{version:1, projects, nodes, edges}`, serialized `ensure_ascii=False, indent=2,
sort_keys=True` + trailing newline; two builds byte-identical.
- `projects`: `[{name, docs}]` ordered **(doc-count desc, name asc)** — today
  `[changple5:4, bootstrap_agentic_workspace.sh:1, hi2vi_web:1]`. This order **is** the S2
  ink-assignment order (`i % 3`); the legend reads `docs` counts from it.
- doc node: `{id, type:"doc", title, url, date, project, tags, degree}` — `id` = repo-
  relative path under `docs/` (matches `related:` authoring, e.g. `changple5/…-p35-….md`);
  `url` = directory-style `File.url`, no leading slash (e.g. `changple5/…-p35-…/`); `date`
  = ISO string.
- tag node: `{id:"tag:<t>", type:"tag", title:<t>, degree}` — no `url`.
- missing/ghost node: `{id:<raw path>, type:"missing", title:<raw path>, degree}` — no
  `url`; emitted only for an unresolved `related:` target.
- edge: `{source, target, kind}` (+ `"broken": true` on unresolved `related`); `related`
  directed as authored, `tag` connects doc ↔ `tag:<t>`; self-refs + dup `related:` dropped.
- `degree` = incident edge count over the emitted edge list (drives the r 6→14px ramp).

**Today's numbers (verified):** 6 doc + 26 tag = 32 nodes; 3 `related` + 27 `tag` = 30
edges; 0 broken, 0 ghost. Sparse `related` (one 3-doc changple5 cluster; `performance` the
only shared tag) → the map's connective tissue is tag spokes; hub-and-spoke, not a mesh.

**Hook serve behavior (design intent; live serve NOT yet exercised — that's S3):** writes
to `site_dir` (a temp dir under serve, **never** `docs/` → no watch-rebuild loop) and
**reassigns** the URL map every `on_files` (never appends → no stale URLs across serve
rebuilds). Verified under `mkdocs build` ×2 (byte-identical). S3 owns confirming
`graph.json` actually emits under live `mkdocs serve`.

**Guard (data contract) added to `site_smoke.py`, additive + stdlib-only:** `check_source`
now asserts the `hooks:` wiring + file presence; new `check_graph` locks shape / id
uniqueness / endpoint-resolution / `projects`-sum / no-`/Users/` / doc-count == filesystem
count (`docs/*/*.md` depth-2, excl. `index.md` + reserved dirs — self-adapts to new
docs/projects). The `extra_javascript:`-forbidden assertion is **untouched** (still red for
S2 to flip in the same slice it adds `extra_javascript`). Negative-tested both ways
(missing `graph.json` → FAIL; doctored dead `related:` → ghost + `broken` edge, guard still
PASS).

## Constraints

Binding, mostly enforced by `scripts/site_smoke.py` (runs in CI `pages.yml` after `mkdocs build`, before deploy):
- **Never** add a top-level `nav:` or `strict:` to `mkdocs.yml` — auto-nav is load-bearing (guard fails if present). `theme.font: false` must stay.
- `exclude_docs` keeps `/versions/` and `/README.md` out of the built site — must not regress (`site/versions/` present → guard fail).
- **Zero custom JS today, guard-enforced:** `site_smoke.py` fails if `extra_javascript:` appears in `mkdocs.yml`, and fails on any external `<script src="http…">` in built pages. P6 ships the repo's first custom JS → renderer **must be vendored locally** (no CDN), `extra_javascript` added, and `site_smoke.py` updated **in the same slice that flips it** (S2): allow exactly the vendored entries; keep no-CDN + no-`/Users/`-leak. `graph.json` must carry repo-relative paths/URLs only.
- **Pin parity** (guard-enforced): `mkdocs-material` version must match between `.github/workflows/pages.yml` (`pip install mkdocs-material==9.7.6`) and `compose.yml` (`squidfunk/mkdocs-material:9.7.6`). Don't bump.
- **Landing DOM invariants** (guard-enforced) when touching `index.md`: exactly one `id="__search"` + a `for="__search"` label; `kb-hero` + `kb-grid` present; `<ul>` element-adjacent to `<div id="recent">`; the `<!-- explain:recent -->` marker + a rendered Recent `<li>`. S3's card edit must preserve all of these.
- **No mkdocs `hooks:` exist yet** — the graph-JSON mechanism is a new addition (see Open Questions; lean = hooks module).
- Graph data must be a **build-time static asset** (browser-only site can't call the local API). Deterministic + publish-safe.

## Doc impact

Running list of durable-truth changes for the REVIEW slice to consolidate into doc versions (one per affected doc, once per phase).

- `frontend`: graph design tokens/components delivered via Claude Design (P6.S0) — additive `--kb-graph-*` token set, mark grammar (docs/tags/ghost, related vs tag edges), page anatomy (full-bleed map, both sidebars suppressed, overlay cards).
- `experience`: knowledge-map journey designed (P6.S0) — library-map direction, label Strategy A, zoom ladder, project-ink legend + tag-visibility switch, hover/selection info panel.
- `decisions`: ADR candidate (P6.S0) — project-ink categorical set as a **documented data-viz-only accent extension** (teal-only rule preserved for interactive UI), Claude-Design provenance.
- `operations` (P6.S1): the repo's first mkdocs `hooks:` module — `scripts/graph_hook.py` emits `graph.json` into `site/` at build time, running in both `mkdocs build` (CI/deploy) and `mkdocs serve` (local), zero `pages.yml` changes; browser-only site → graph data must be a static build artifact.
- `qa` (P6.S1): `site_smoke.py` gains `check_graph` (graph.json shape/id-uniqueness/endpoint-resolution/projects-sum/no-`/Users/`/doc-count==filesystem) + a `check_source` hooks-wiring assertion; `--root` supported for doctored-copy negatives.
- `data`/`architecture` (P6.S1): build-time knowledge-graph **data contract** — node-selection rule (frontmatter `source` mapping w/ `project`; `docs/current` + `docs/versions` excluded), `{version, projects, nodes, edges}` schema, tags-as-nodes, ghost nodes + `broken` edges for dead `related:`, deterministic + publish-safe (repo-relative ids/urls, no timestamps).
- `decisions` (P6.S1): ADR — data-generation **mechanism** (mkdocs hooks module over a standalone CI script, so it also runs under serve) + the node/edge **model** (docs + tag nodes, project as color not node, `related` directed with dead-link ghosts, `docs/current` exclusion).

## Open Questions

Direction-setting decisions recorded below; the named slice's own `plan.md` finalizes each.

- **Node/edge model (leaning):** nodes = 6 explainer docs **+ tag nodes** (tags as first-class nodes, ~26). Project = node **color/group**, not a node (colors the doc nodes). Edges = `related:` directed (3) + doc–tag (undirected). Backlinks = inverse of `related:` computed at build time. Dead `related:` → flagged as data. **`docs/current/*.md` EXCLUDED from the v1 graph** (different content class, no tags/related → would be isolated islands); could ship behind a toggle later. → **S1** finalizes.
- **Graph-JSON mechanism (leaning: mkdocs `hooks:` module):** runs in both `mkdocs serve` and CI (live local dev + deploy), PyYAML available via mkdocs. Alternative: standalone `scripts/build_graph.py` CI step (mirrors `site_smoke.py` but dead during local serve). Sub-question: where the hook writes `graph.json` so mkdocs copies it into `site/` (a `docs/` path vs emitting in `on_post_build`). → **S1** finalizes.
- **Renderer direction (STILL OPEN — S2 finalizes; leaning: `d3-force` ~25 KB + custom canvas):** alternatives = full vendored graph lib, or fully hand-rolled canvas force sim. Corpus is tiny (≲ 6 docs + ~26 tag nodes) so all are viable; Obsidian feel = springy force layout + pan/zoom + drag + hover-neighborhood highlight + click-through. Must be vendored (no CDN). **The P6.S0 design's drawing spec (`graph-render.js`) is renderer-agnostic** — it specifies the mark grammar and draw order, not the layout engine — so this choice remains S2's, unconstrained by the design (engineering swaps the hand-placed layout for the real sim, keeps the drawing grammar). → **S2** finalizes.
- **Tag-node visual treatment — RESOLVED by the P6.S0 design.** Tags = hollow rings 4.5px in the secondary tone (distinct from doc filled circles); the tags-as-nodes display is **toggleable** via the legend's tag-visibility switch (bottom-left). No longer an open S2 decision; S2 implements the locked treatment.
- **`docs/current` inclusion behind a toggle** — deferred beyond v1 unless the operator asks.
