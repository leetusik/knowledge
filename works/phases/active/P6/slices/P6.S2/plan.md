# P6.S2 — Interactive graph renderer, full-canvas page + JS guard flip (orchestrator plan, auto mode)

## Context

The phase's core slice: the repo's **first custom JS** — an interactive, Obsidian-style knowledge map rendered client-side from `<site>/graph.json` (S1's contract, live and guard-locked), styled exactly to the locked P6.S0 design guide. Risk `high` → `slice-executor-high`.

Sources of truth:
- `works/phases/active/P6/phase.md` → "Design guide (P6.S0, locked)" + S1's cross-slice notes (emitted schema).
- The design mirror: `/private/tmp/claude-502/-Users-sugang-projects-personal-knowledge/62648e14-5642-42c8-af17-eea4e69b27da/scratchpad/kb-graph-design/` — `tokens/graph.css` (all frozen `--kb-graph-*` values), `components/graph/graph.css` (DOM-layer spec + Material hooks notes), `components/graph/graph-render.js` (the drawing grammar: token access, draw order, mark recipes), the 4 specimen cards, `pages/graph.card.html`, README "P6 · Graph".
- `works/phases/active/P6/slices/P6.S1/result.md` — the emitted `graph.json` sample.

## Decision finalized here — renderer

**Hand-rolled force sim + canvas renderer in ONE vendored file, `docs/javascripts/graph.js`** (kb-authored, zero third-party code). Rationale: d3-force's UMD needs three more micro-packages vendored alongside; at this corpus (≤150 nodes at the design's ~50-doc horizon) a pairwise O(n²) sim is trivial per tick; the design's drawing spec (`graph-render.js`) is renderer-agnostic hand-rolled canvas already, so the grammar ports 1:1; and zero third-party files keeps the no-CDN guard surface and the P7 plugin packaging clean. Record as an ADR-bound decision in the Doc impact notes.

## Deliverables

**1. NEW `docs/javascripts/graph.js`** (plain script, strict IIFE, no modules/build step; mkdocs copies it to `site/javascripts/graph.js`):
- **No-op guard**: `extra_javascript` loads on every page — return immediately unless `document.querySelector('.kb-graph')` exists.
- **Data**: fetch from the mount's `data-graph-src` attribute (`../graph.json` — correct relative to `/graph/` under both CI and serve). On fetch failure or zero doc nodes → show the design's empty state; while laying out → loading state.
- **Sim (settle-then-still)**: deterministic initial placement (hash node ids → project-clustered angles; no randomness), then link springs (`related` shorter/stronger than `tag`), pairwise repulsion, mild centering, collision padding; alpha-decay tuned so the map eases to rest in ≈ `--kb-graph-settle` (600ms) and **stops** — no idle drift. Drag re-heats locally with low alpha, settles again. `prefers-reduced-motion`: run the sim to convergence synchronously and paint the settled layout on frame one; snap pan/zoom; no label fades.
- **Drawing (port the grammar from `graph-render.js` exactly)**: token access via `getComputedStyle` per paint (so the Material scheme toggle just works — observe `data-md-color-scheme` changes with a MutationObserver and repaint); draw order dimmed edges → live edges → halo → dimmed nodes → live nodes → selection ring → labels (3px plate-colored halo stroke behind glyphs); mark recipes per the tokens (doc = filled project-ink circle r 6→14px linear by `degree` + 1.5px plate cutout rim; tag = 4.5px hollow ring; ghost = 5.5px dashed ring, dash 4,4; related edge 1.75px + 5px arrowhead tip 3px off target rim; tag edge 1px; edges into ghosts dashed in the lighter edge ink; hover/selected = neighborhood keeps ink + incident edges teal + radial halo; selection ring 2px teal offset 2px; everything else at α `--kb-graph-dim`, labels hidden).
- **Ink assignment**: `projects[i]` (S1's order: doc-count desc, name asc) → `--kb-graph-project-{(i % 3) + 1}`.
- **Labels — Strategy A + zoom ladder (locked)**: doc labels always on at 12.5px w500, tag/ghost 11px w400, `--kb-graph-font`; ladder: <60% zoom → hub doc labels only (degree ≥ 6) with pointer tooltip carrying the rest; 60–110% → all doc labels; >110% or hover/selected → neighborhood tag labels fade in ~80ms. Labels scale with zoom.
- **Interactions**: canvas pan (grab/grabbing cursors per `.kb-graph__canvas` CSS), wheel zoom + zoom-stack buttons (+ / − / fit), node drag, hover → neighborhood highlight + tooltip at low zoom, click doc node → info panel (eyebrow project chip + name, Fraunces title, `date · N tags · N links` meta, `.kb-tag` pills, "Read the explainer →" link to the node's `url` resolved relative to site root), click ghost → panel ghost variant ("no document yet · 문서 없음" badge, "linked from …" meta, no read link), click tag → select/highlight only, click empty plate or ✕ → deselect. Legend (bottom-left): project rows with ink chips + counts from `projects`, click toggles a project off (`is-off` chip + that project's docs, spokes and incident edges hidden/dimmed per design); tag-visibility switch (`.kb-graph-switch`, spokes collapse, related links remain); unresolved row appears only when ghosts exist.
- **Icons**: NO Iconify/CDN (guard). Zoom/close buttons use text glyphs (`+`, `−`, `⤢` or similar) or tiny inline SVG.
- **Chrome plumbing**: DPR-aware canvas sizing, ResizeObserver → resize + re-fit, keyboard focusability for buttons (focus-visible styles come from the component CSS).

**2. NEW `docs/graph.md`** — the page. Frontmatter: `title: Graph`, `hide: [navigation, toc]`. Body = the mount markup (attr_list/raw HTML): `<div class="kb-graph" data-graph-src="../graph.json">` containing `<canvas class="kb-graph__canvas">`, the legend/zoom/panel/tooltip containers the JS populates, the empty/loading state div (design copy: "No documents yet / The map draws itself as explainers land in `docs/` / 문서가 추가되면 지도가 그려집니다"), and a `<noscript>` fallback line. Auto-nav gives it the top tab beside Home/Tags — **no `nav:`**.

**3. EDIT `docs/stylesheets/extra.css`** — append a new **§10 Graph** section (P5.S5 integration pattern): (a) `tokens/graph.css` **verbatim** (the frozen `--kb-graph-*` set, `:root` structure + both scheme blocks); (b) the component layer from the mirror's `graph.css` adapted onto the real page — `.kb-graph` full-bleed under header/tabs **without** an `overrides/` template: suppress the sidebars/content-column framing via CSS scoped to the page (e.g. full-bleed breakout — `width:100vw; margin-left:calc(50% - 50vw)`; height `calc(100vh - header/tabs)`; the graph.css header's `.md-sidebar → display:none`-on-this-page intent achieved with a scoped selector such as `.md-content:has(.kb-graph)` plus the breakout — executor finalizes the cleanest working combination); (c) overlay/legend/switch/zoom/tooltip/panel/empty rules as delivered (`.kb-`-prefixed, both schemes via the tokens, reduced-motion block). **Do not touch §1–§9** beyond appending; no new webfonts; teal-only interactive accents.

**4. EDIT `mkdocs.yml`** — add `extra_javascript:` block-list with exactly `javascripts/graph.js`, with a load-bearing comment (first custom JS; vendored, no CDN; the guard allowlists exactly this entry). Touch nothing else.

**5. EDIT `scripts/site_smoke.py`** — flip + extend, in the same slice as the change that requires it:
- `check_source`: REPLACE the `extra_javascript:`-forbidden assertion with: `extra_javascript:` present and its entries == exactly `["javascripts/graph.js"]`; `docs/javascripts/graph.js` exists; `docs/graph.md` exists with `hide:` frontmatter.
- `check_built` / `check_graph` additions: `site/javascripts/graph.js` shipped; `site/graph/index.html` exists, contains `kb-graph` and the `data-graph-src` mount, and references `javascripts/graph.js`; existing no-CDN scan naturally covers the new page (Iconify must NOT appear); keep all existing assertions (hero/recent/tags/pins/no-`/Users/`).
- Update the module docstring's invariant summary accordingly.

## Verification (lean; no browser available — static + build-level, visual lands with operator + S3/REVIEW)

1. `node --check docs/javascripts/graph.js` if node exists (else skip with a note).
2. CI-parity venv build (mkdocs-material==9.7.6): `mkdocs build` → `site/graph/index.html` + `site/javascripts/graph.js` + `site/graph.json` all present.
3. `python3 scripts/site_smoke.py` → PASS (with the flipped assertions).
4. Negative (copied tree + `--root`): remove `extra_javascript:` from the copy's `mkdocs.yml` → guard FAILs (allowlist assertion); restore. One more: inject a fake `<script src="https://cdn...">` into a copied built page → CDN scan FAILs. Two focused negatives only.
5. Grep the built `site/graph/index.html`: no `iconify`, no `http` script src; `data-graph-src="../graph.json"` present.
6. `python3 scripts/workflow.py validate`.

## Executor contract (slice-executor-high)

- Allowed: create `docs/javascripts/graph.js` + `docs/graph.md`; append §10 to `docs/stylesheets/extra.css`; edit `mkdocs.yml` (`extra_javascript` + comment only) and `scripts/site_smoke.py` (the flip + additions above); scratchpad/venv/`site/` builds; write this slice's `result.md`; append cross-slice notes + Doc-impact one-liners to `phase.md` (`frontend`: renderer/page/§10; `experience`: the live map journey; `qa`: flipped JS guard; `decisions`: ADR — hand-rolled vendored renderer, no third-party/no CDN).
- Not allowed: `docs/index.md` (landing card is S3), `compose.yml`/`pages.yml`, `overrides/` custom_dir, any new webfont or CDN reference, changes to §1–§9 token values, `server/*`, `doc-new-version`, commits, status transitions, other slices' files.
- The design guide is LOCKED: token names/values from the mirror are used as-is; deviations from the mark grammar/anatomy require `escalate` (or an explicit note if trivially cosmetic), not silent improvisation.
- Before returning: verification 1–6 green; structured verdict + summary + notes_for_orchestrator (esp. anything S3's serve-parity/landing work must know) + files_changed + validation evidence.
