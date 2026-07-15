# P6.S2 result — Interactive graph renderer, full-canvas page + JS guard flip

Status: **done**. The repo's first custom JS shipped — a vendored, hand-rolled,
zero-third-party / zero-CDN interactive knowledge map, drawn client-side from
`<site>/graph.json` and styled exactly to the locked P6.S0 design. `extra_javascript`
is now wired in `mkdocs.yml` and the `site_smoke.py` guard was flipped in the same
slice (forbidden → exact allowlist) so the tree stays green. All five deliverables
landed; verification 1–6 are green. Visual fidelity lands with the operator + S3/REVIEW
(no browser here — everything below is static + build-level + a numeric sim check).

## What landed

**1. NEW `docs/javascripts/graph.js`** (~640 lines, strict IIFE, no modules/build step).
- **No-op guard first**: returns immediately unless `document.querySelector('.kb-graph')`
  exists — `extra_javascript` loads on every page, so every page but `/graph/` pays nothing.
- **Data**: `fetch()` from the mount's `data-graph-src` (`../graph.json`, correct relative to
  `/graph/` under CI's `/knowledge/` base **and** local serve). Fetch failure or zero doc
  nodes → the design empty state; during fetch → the loading state; on success → hide it.
- **Sim (settle-then-still)**: deterministic hash-seeded initial placement (FNV-1a on node
  ids → project-clustered angles + radius; **no `Math.random` anywhere**), then a hand-rolled
  force sim — pairwise repulsion (O(n²), trivial at ≤150 nodes), link springs, mild centering,
  collision padding. Alpha cools `×0.9`/tick from 1 → 0.02 in ~37–38 ticks ≈ the 600ms
  `--kb-graph-settle` budget, then the rAF loop **stops** (no idle drift). Node drag pins the
  node (`fx/fy`) and re-heats alpha to 0.35 locally, then re-settles.
- **Drawing grammar ported 1:1 from `graph-render.js`**: token access via `getComputedStyle`
  per paint; draw order **dimmed edges → live edges → halo → dimmed nodes → live nodes →
  selection ring → labels**; mark recipes — doc = filled project-ink circle `r 6→14px` by
  `(deg−2)/6` + 1.5px plate cutout rim; tag = 4.5px hollow ring; ghost = 5.5px dashed ring
  (dash 4,4); related edge 1.75px + 5px arrowhead, tip 3px off the target rim; tag edge 1px;
  edges into ghosts dashed in the lighter edge ink; hover/selected neighborhood keeps ink +
  incident edges teal (`--kb-graph-edge-active`) + radial halo; selection ring 2px teal, 2px
  gap; everything else at α `--kb-graph-dim` with labels hidden; the **3px plate-colored label
  halo** stroke behind glyphs. Marks/labels scale linearly with zoom (per the token header).
- **Ink assignment**: `projectInk[projects[i].name] = i % 3`, in S1's emitted order (doc-count
  desc, name asc) → `--kb-graph-project-{(i%3)+1}`. Legend reads `docs` counts from the same list.
- **Labels — Strategy A + the locked zoom ladder** (`displayZoom = z / fitZoom`, so fit = 100%):
  `<60%` → hub doc labels only (`degree ≥ 6`) + pointer tooltip carries the rest; `60–110%` →
  all doc labels; `>110%` **or** hover/selected → neighborhood tag labels fade in over ~80ms
  (a single eased `tagReveal` 0→1). Doc 12.5px w500 / tag·ghost 11px w400, `--kb-graph-font`.
- **Interactions**: canvas pan (grab/grabbing via the CSS cursor), wheel zoom toward the
  cursor, zoom stack `+ / − / fit`, node drag, hover → neighborhood highlight + tooltip at low
  zoom; click doc → info panel (project chip + name eyebrow, Fraunces title, `date · N tags ·
  N links` meta, `.kb-tag` pills, "Read the explainer →" to `../` + node.url); click ghost →
  panel `--ghost` variant ("no document yet · 문서 없음" badge, "linked from …" meta, no read
  link); click tag → select/highlight only (no panel); click empty plate or ✕ / Escape →
  deselect. Legend (bottom-left): project rows with ink chips + counts, click toggles `is-off`
  and hides that project's docs + incident edges (+ tags orphaned by it); tag-visibility switch
  (`.kb-graph-switch`, spokes collapse, related links remain); the Unresolved row renders only
  when ghosts exist.
- **Icons**: NO Iconify / CDN. `+` and `−` are text glyphs; **fit** and the panel **close (✕)**
  are inline SVG / a Unicode glyph. Confirmed zero external `<script src>` and zero `iconify`
  in the vendored file and the built page.
- **Chrome plumbing**: DPR-aware canvas sizing, `ResizeObserver` → resize + re-fit (falls back
  to a window resize listener), `MutationObserver` on `data-md-color-scheme` (body +
  documentElement) → re-read tokens + repaint so the Material scheme toggle just works, buttons
  are real `<button>`s (focusable; focus-visible from §10c). Render is event-driven: a
  self-terminating rAF loop runs only while the sim is hot, a label fade is in flight, or a
  drag is active — otherwise the last frame just holds (no idle loop).
- **prefers-reduced-motion**: `convergeSync()` solves the layout synchronously and paints it at
  rest on frame one (no animated settle); pan/zoom snaps; label reveal snaps (no fades).

**2. NEW `docs/graph.md`** — `title: Graph`, `hide: [navigation, toc]` (auto-nav gives it the
top tab beside Home/Tags — no `nav:`). Body = the `.kb-graph` mount with
`data-graph-src="../graph.json"`, the `<canvas>`, the JS-populated legend/zoom/tooltip/panel
containers (each `hidden` until filled), the empty/loading state div (design EN/KR copy incl.
`<code>docs/</code>`), and a `<noscript>` fallback pointing to Home.

**3. EDIT `docs/stylesheets/extra.css`** — appended **§10** only (§1–§9 untouched; verified by
diff of the append boundary). §10a = `tokens/graph.css` **verbatim** (`:root` geometry/labels/
motion + both scheme blocks). §10b = the full-bleed page: scoped **only** via
`:has(.kb-graph)` so it touches nothing else on the site — neutralizes `.md-main__inner`
margin, `.md-content__inner` margin/padding + its `::before` spacer, visually-hides the
auto-injected `<h1>Graph</h1>` (kept in the a11y tree), and breaks `.kb-graph` out to
`width:100vw; margin-left:calc(50% − 50vw); height:calc(100dvh − var(--kb-graph-chrome))` with
`--kb-graph-chrome: 4.8rem` (header 2.4rem + tabs 2.4rem, both measured from the pinned
Material CSS). The `hide:[navigation,toc]` already drops both sidebars (`[hidden]`); the
`:has()` `.md-sidebar { display:none }` is belt-and-braces. §10c = the overlay layer from the
mirror's `graph.css`, **scoped under `.kb-graph`** so `.md-typeset` element styles (list
bullets, link underlines, heading margins) can't bleed into the cards, plus a `.kb-tag` panel
pill matching §7's `.md-tag`. §10d = the reduced-motion block.

**4. EDIT `mkdocs.yml`** — added an `extra_javascript:` block-list with exactly
`javascripts/graph.js` + a load-bearing comment (first custom JS; vendored, no CDN; guard
allowlists exactly this entry). Nothing else touched (`nav:`/`strict:` still absent,
`theme.font:false`, hooks, search `lang:[en,ko]`, `exclude_docs`, pin all unchanged).

**5. EDIT `scripts/site_smoke.py`** — flipped + extended, stdlib-only, all existing assertions
kept:
- `check_source`: **replaced** the `extra_javascript:`-forbidden assertion with: `extra_javascript`
  present and its entries `== ["javascripts/graph.js"]` exactly; `docs/javascripts/graph.js`
  exists; `docs/graph.md` exists with `hide:` frontmatter.
- `check_built`: `site/javascripts/graph.js` shipped; `site/graph/index.html` exists, contains
  `kb-graph` + `data-graph-src`, and references `javascripts/graph.js`. The pre-existing
  all-`*.html` CDN scan already covers the new page (Iconify cannot reappear); `site/graph.json`
  no-`/Users/` unchanged.
- Module docstring updated with the custom-JS invariant summary.

## How the sim/ladder/interactions map to the locked design

- **Marks & draw order & label halo**: ported verbatim from `graph-render.js` (the design's
  "drawing spec, not engine") — same token names, same order, same 3px halo technique, same
  arrowhead geometry, same α-dim of the non-neighborhood. Only the *layout* was swapped from
  the design's hand-placed composition to the real force sim, exactly as the design's
  "Implementation cautions" instruct.
- **Motion**: settle-then-still — the numeric harness (below) confirms the sim reaches rest in
  ~38 ticks ≈ 630ms (the 600ms `--kb-graph-settle` budget) and then the loop stops. No idle drift.
- **Zoom ladder**: implemented against `displayZoom` (zoom relative to the fit baseline), so
  the idle/fit view is "100%" → all doc labels (the 60–110% band, matching the design's idle
  page card), zooming out past 60% collapses to hub labels + tooltip, zooming in past 110%
  fades in neighborhood tag labels. This is the one interpretation choice the design left to
  engineering (the ladder is defined in *relative* zoom terms).
- **Project inks stay data-viz-only**; every interactive accent (hover edges, halo, selection
  ring, links, focus outlines) is teal — the one-accent rule is preserved.

## Verification evidence (steps 1–6, all green)

1. **`node --check docs/javascripts/graph.js`** → `SYNTAX OK` (node v24.3.0 present).
2. **CI-parity build** — scratchpad venv, `mkdocs-material==9.7.6` (→ mkdocs 1.6.1),
   `mkdocs build` at repo root: built in 0.32s; `site/graph/index.html` (26.5 KB),
   `site/javascripts/graph.js` (35 KB), and `site/graph.json` (11.5 KB) all present. (The red
   "MkDocs 2.0" banner is Material's advisory, not a build error — same as S1.)
3. **`python3 scripts/site_smoke.py`** → `PASS — all site invariants hold`. Exit 0.
4. **Two focused negatives** (copied tree + `--root`, in scratchpad):
   - Remove the `extra_javascript:` block from the copy's `mkdocs.yml` → **FAIL, exactly one
     violation**: `extra_javascript: missing (must list exactly javascripts/graph.js)`. Exit 1.
   - Inject `<script src="https://cdn.example.com/evil.min.js">` into the copy's built
     `site/graph/index.html` → **FAIL**: `CDN <script src="http…"> found in 1 built page(s):
     graph/index.html`. Exit 1.
5. **Grep built `site/graph/index.html`**: `iconify` count 0; no `http(s)` `<script src>`;
   `data-graph-src="../graph.json"` present; `<script src="../javascripts/graph.js">` present.
   The vendored `site/javascripts/graph.js` has **no** real URLs (the only `CDN`/`Iconify`
   hits are the words in comments documenting their absence); no CDN `<script src>` anywhere
   across `site/`.
6. **`python3 scripts/workflow.py validate`** → `Workflow validation passed`. Exit 0.

**Extra diligence — numeric sim check** (no browser, so I validated the physics headlessly by
mirroring the exact `graph.js` constants + token defaults against the real `graph.json`):
32 nodes / 30 edges settle in 38 ticks; **all positions finite** (no NaN/blow-up); settled
bbox ≈ 537×494 world units; min pairwise distance 45 (> collision target, no overlaps);
**avg related-edge length 105 < avg tag-edge length 182** (the plan's "related shorter/stronger
than tag" honored — related is the tight backbone, tags nestle in a hub-and-spoke); fit zoom
lands ≈ 0.99–1.37 across a 1200×620 → 1440×804 plate (marks near their nominal 6–14px). Sim
constants were tuned on this harness (final: `REST_RELATED 110 / K 0.9`, `REST_TAG 160 / K 0.2`,
`REPULSION 9000` cutoff 600², `CENTER_K 0.016`, `LAYOUT_RADIUS 340`).

## Deviations from `plan.md`

- **None material.** Sim force constants are engineering's call (the design's `graph-render.js`
  is a drawing spec, not a layout engine — explicitly stated in the guide); I tuned them on the
  numeric harness to honor "related shorter/stronger than tag" while filling the plate calmly.
- **Trivially cosmetic, noted**: the auto-nav-injected `<h1>Graph</h1>` is visually hidden
  (sr-only, kept in the DOM for a11y/SEO) so the map truly IS the page with no title bar — the
  design page card shows the map directly below the tabs. Not a design-grammar change.
- Fit zoom is clamped to `[0.5, 1.5]` and the ladder is expressed in zoom **relative to fit**
  (`displayZoom`) — the one place the design specified the ladder in relative terms and left
  the baseline to engineering; idle/fit = 100% → all doc labels, matching the design's idle card.

## What S3 must know (landing entry + serve parity)

- **Landing card (S3's job)**: add a graph `.kb-card` to the `.kb-grid` in `docs/index.md`
  (currently 4 cards — changple5, hi2vi_web, bootstrap, Tags), linking to `graph/` (directory
  URL, no leading slash, same style as the sibling cards so the `#recent`/hero/`#__search`
  guard invariants stay intact). I did **not** touch `docs/index.md` (out of scope, S3 owns it).
- **Serve parity**: the renderer fetches `data-graph-src="../graph.json"`, which resolves to
  the site-root `graph.json` under both CI (`/knowledge/graph/` → `/knowledge/graph.json`) and
  local serve (`/graph/` → `/graph.json`). S1 verified the hook emits under `mkdocs build` but
  flagged live-`serve` emission as S3's explicit check — **so S3 must confirm `graph.json`
  actually appears under `mkdocs serve` (compose `kb`) and that the map fetches + renders it
  live**, not just in a static build. The read-through links (`../` + node.url) and tag pills
  (`../tags/`) are relative, so they work under both bases.
- **Full-bleed offset**: `--kb-graph-chrome: 4.8rem` (header 2.4rem + tabs 2.4rem) is defined
  in §10b and is the one knob to tweak if the header/tabs height ever moves. On viewports where
  `navigation.footer` is enabled, the footer sits just below the fold (a small scroll reveals
  it) — expected for a viewport-height map; flag for operator visual QA if undesired.
- **Visual QA is still owed** (no browser here): the operator/REVIEW should eyeball both
  schemes, the settle animation, hover/selection dimming + panel, the zoom ladder transitions,
  legend project-filter + tag switch, and the reduced-motion path.
