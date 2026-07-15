# P6.F1 — Graph renderer revision (design P6.S1): quiet labels · idle mingle · pointer zoom · sticky re-place · legend lens

## Why

The operator co-designed a revision of the P6 knowledge map in Claude Design and left a
"P6.S1 REVISION" note at the top of the design project's `GRAPH_BRIEF.md` (2026-07-14,
operator-directed). This is the visual-QA outcome the P6 review left owed; the review has
been reopened (`changes_requested`) and this fix slice implements the revisions. Five spec
changes supersede parts of the locked P6.S0 design:

1. **Quiet labels (Strategy A′)** — the idle map shows MARKS ONLY, no labels. Hover/selection
   reveals the node's title + its neighborhood's; doc titles also fade up past ~110% zoom
   (fully on by ~135%). Replaces "doc titles always on" + the hubs-only low-zoom band.
2. **Idle mingle** — after the ~600ms settle, a barely-there wander (≤ `--kb-graph-drift` 3px
   over ~`--kb-graph-drift-period` 9s; tags ×1.5, ghosts ×1.2). Supersedes "settle-then-still /
   no idle drift". Reduced motion: NO mingle — paint at rest, hold still.
3. **Pointer zoom + pan** — wheel / trackpad-pinch zooms toward the pointer
   (`--kb-graph-zoom-min/max`, 0.5–2.5×); dragging empty plate pans 1:1. Zoom buttons remain.
4. **Node re-placement** — a dragged node STAYS where dropped; a doc's tag spokes follow on a
   soft spring; a dragged tag keeps its new offset.
5. **Legend = lens, never filter** — clicking a project row keeps its docs + spokes in full ink
   (titles on) and dims the rest; click again clears; `.is-on` marks the row. Nothing is
   removed from the map.

## Sources (read these first)

Design mirror (fetched from the design project this session — you have no DesignSync access):
`/private/tmp/claude-502/-Users-sugang-projects-personal-knowledge/7a3b6e1d-58a3-417e-9225-914f76c2e068/scratchpad/kb-graph-design-rev/`

- `BRIEF_REVISION.md` — the note + the design README's revised bullets, verbatim.
- `components/graph/graph-render.js` — **`kbGraph.mount()` is the reference implementation of
  ALL revised behaviors.** Port its live model faithfully. (Its `draw()`, hand-placed
  `layout()`, hardcoded specimen corpus, `docPos` plate-fractions, and iconify close button
  are design-project-only — do NOT copy those.)
- `tokens/graph.css` — revised token file: 4 tokens ADDED (`--kb-graph-drift`,
  `--kb-graph-drift-period`, `--kb-graph-zoom-min`, `--kb-graph-zoom-max`), none changed;
  motion comment rewritten.
- `components/graph/graph.css` — overlay CSS: new `.is-on` legend-row rules; reduced-motion
  comment now mentions the mingle.

Production files to change: `docs/javascripts/graph.js`, `docs/stylesheets/extra.css` (§10 only).
Phase context: `works/phases/active/P6/phase.md` (read "Design guide", "P6.S1", "P6.S2" sections).

## Spec — `docs/javascripts/graph.js`

KEEP: fetch/boot, `buildModel` (graph.json contract unchanged), the force sim + `convergeSync`
(the settle is still engineering's — constants untouched), fit/camera math + `displayZoom()`,
drawing primitives (`drawEdge/drawHalo/drawNode/drawRing/drawLabel`), tooltip (unchanged:
hover at displayZoom < 0.6 — the README keeps "tooltip carries titles at low zoom"), panel
(real URLs, `esc()`, ✕/inline-SVG glyphs), legend markup build + counts + tag switch, scheme
MutationObserver, resize handling. Port `kbGraph.mount()`'s live model on top:

**Per-node state:** `bx, by` (rest position), `sd` (drift seed), `al` (ink alpha, eased),
`la` (label alpha, eased). Tag anchors: `tagAnchor[id] = {owners: adjacent doc ids, dx, dy}`
— offsets from the owners' REST centroid (production tags can have multiple owner docs, e.g.
the shared `performance` tag; the reference's `anchorOf(owners, live)` handles this exactly).

**Lifecycle:** sim settles exactly as today (incl. auto-fit while hot; reduced motion:
`convergeSync` + fit + paint at rest). When alpha ≤ ALPHA_MIN (or right after convergeSync):
**captureRest()** — `bx/by = x/y` for all nodes, seed `sd`, compute tag anchors. Then:
- **Non-reduced:** ONE persistent `requestAnimationFrame` loop (re-queue first;
  `if (document.hidden) return;`). Unify with the settle: while the sim is hot the loop ticks
  it; after captureRest it runs the kinematics below. (`navigation.instant` is off in
  mkdocs.yml, so the loop dies with the page — no leak.)
- **Reduced motion:** NO persistent loop — keep today's event-driven `scheduleDraw`; no
  drift; all eases snap (factor 1).

**Per-frame kinematics (reference `step()`):**
- focus = dragged-node id ‖ hoverId ‖ selectedId (that precedence);
  `keep` = focus ? `neighborhood(focus)` : (activeProject != null ? `projectKeep(activeProject)` : null).
- Position targets: dragged → pointer world pos (ease k 0.55); tag → live centroid of owners
  + stored offset + drift (ease 0.12); everything else → `bx/by` + drift (ease 0.12).
- Drift (deterministic per node): amp = `T.drift` × (tag 1.5 / missing 1.2 / doc 1);
  base = 2π/`T.driftPeriod`; per axis
  `amp·(sin(t·base·w1+p1) + 0.5·sin(t·base·w2+p2))/1.5`; seed via the reference's `seed(id)`
  LCG verbatim (w1,w3 ∈ [0.7,1.3], w2,w4 ∈ [1.4,2.3], phases ∈ [0,2π)). Reduced motion or
  zero drift → {0,0}.
- `al` eases 0.18 toward `keep ? (keep[id] ? 1 : T.dim) : 1`; `la` eases 0.18 toward
  `labelTarget`.
- View eases 0.16 toward `zt/pxt/pyt` targets (pan-drag writes current = target, 1:1).

**Labels (A′)** — DELETE the `tagReveal` machinery and `HUB_DEGREE`.
`labelTarget(n, keep, focus)`: outside keep → 0; focus && in keep → 1 (whole neighborhood
incl. tags); doc → keep ? 1 : ladder; missing → ladder·0.9; tag → 0.
Ladder = `clamp01((displayZoom() − 1.1) / 0.25)` — the ladder stays RELATIVE TO FIT (S2's
locked mapping; the reference's z=1 ≈ its fit). Label draw alpha = `al·la` (skip < 0.02),
muted = type ≠ 'doc'.

**Draw** — restructure to the reference `frame()` single-pass grammar, order preserved
(edges → halo behind focus → nodes → selection ring → labels): edge alpha = min(endpoint
`al`), skip < 0.01, active = incident to focus && alpha > `T.dim` + 0.05; each node at its
own `al`; hidden nodes/edges (tag switch) skipped entirely.

**Pointer** — pointerdown on a node: kinematic drag — NO sim reheat, no fx/fy (keep the
fx/fy pinning ONLY in the pre-rest window while the sim is still hot). Drag target clamped
to the viewport (≈12px screen inset, converted to world coords). Tap (<5px screen movement)
toggles select (same node again → deselect); tap on empty plate → deselect. Real drag commit
on release: `bx/by = x/y − drift(now)`; tag → recompute its `dx/dy` against the owners' REST
centroid; doc/ghost → rest only (its spokes follow via live anchors automatically). No
plate-fraction `docPos` persistence — production positions are world coords and resize only
refits the camera.

**Zoom/pan** — wheel: `factor = Math.exp(−e.deltaY × ((e.ctrlKey||e.metaKey) ? 0.01 : 0.0024))`
(trackpad pinch reports as ctrl-wheel); `zoomAbout` at the pointer, computed against the
TARGETS (zt/pxt/pyt) so successive events compose; clamp zt to
`view.fitZoom × [T.zoomMin, T.zoomMax]` — replaces the hardcoded `ZOOM_MIN 0.3 / ZOOM_MAX 4`.
Buttons stay ×1.3 / ÷1.3 / fit (fit → auto=true, zt=fitZoom, pan targets 0). Port
`clampPan()` (pan targets bounded to ±(W·zt)/2, ±(H·zt)/2). Eased in live mode; snapped
under reduced motion. Escape-to-deselect stays.

**Legend lens** — remove `offProjects`, the `.is-off` wiring, and `isHidden`'s doc branch
(tag branch simplifies to `!tagsVisible`; missing stays visible; drop the now-dead
"tag whose only doc is filtered off" logic). New state `activeProject: name|null`,
single-select toggle; the active row gets `.is-on` (only one at a time); NO refit on toggle
(nothing moves or hides). `projectKeep(name)` = the project's doc nodes, then every
edge-neighbor of those (spokes: tags, related docs, ghosts) — port the reference exactly.
Focus (hover/selected/drag) temporarily overrides the lens. The tag-visibility switch keeps
its current behavior (incl. refit-if-auto).

**readTokens() adds:** `drift` (px, fallback 3), `driftPeriod` (parseFloat of `'9s'` → 9,
fallback 9), `zoomMin` (0.5), `zoomMax` (2.5).

**Copy/comments:** update the file-header design-mapping block (Strategy A′, settle-then-
mingle, pointer spec, reference = `kbGraph.mount()` P6.S1); the loading state's
"settles in ~0.6s, then holds still." drops the now-false "then holds still".

## Spec — `docs/stylesheets/extra.css` (§10 only; §1–§9 untouched)

- **§10a** (verbatim-mirror discipline — compare against the mirror's `tokens/graph.css`):
  replace the "Motion — settle-then-still" comment + lone `--kb-graph-settle` with the
  design's new "Motion — settle, then mingle (P6.S1 revision)" comment block +
  `--kb-graph-settle: 600ms`, `--kb-graph-drift: 3px`, `--kb-graph-drift-period: 9s`, and
  the new "Pointer zoom" comment + `--kb-graph-zoom-min: 0.5`, `--kb-graph-zoom-max: 2.5` —
  exact upstream text. Scheme blocks are byte-identical upstream — do not touch. Add a
  one-line P6.S1-revision note to the §10a intro comment (lines ~574–584).
- **§10c**: add after the chip rules and before the `.is-off` rules (design placement):
  ```
  /* highlighted project (legend click — a lens, never a filter): row keeps full ink */
  .kb-graph .kb-graph-legend__item.is-on { color: var(--kb-ink); background: var(--kb-surface-sunken); font-weight: var(--kb-weight-medium); }
  .kb-graph .kb-graph-legend__item.is-on .kb-graph-legend__count { color: var(--kb-secondary); }
  ```
  KEEP the `.is-off` rules (still in the design mirror; the engine just no longer sets it).
- **§10d**: update the comment to the design's new reduced-motion text (engine skips the
  settle AND the idle mingle; hold still; snap pan/zoom).

## Do not touch

`docs/graph.md` (legend is JS-built), `scripts/graph_hook.py` / the `graph.json` contract,
`scripts/site_smoke.py` (its assertions are presence/wiring-level — verified; no guard
change needed), `docs/index.md`, `mkdocs.yml`, `docs/current/*` (generated), old
`docs/versions/*`. No new files under `docs/` — the renderer stays ONE vendored file.
Zero third-party code, zero CDN references (the reference's iconify close button is
design-project-only).

## Verification (lean — no committed test suite)

1. `node --check docs/javascripts/graph.js`.
2. Throwaway harness in YOUR scratch space (not committed): exercise the pure logic —
   drift bounded ≤ amp and deterministic per id; ladder 1.1→0 / 1.35→1 (and mid ≈ 0.5 at
   ~1.225); `projectKeep` includes tags + related neighbors + ghost targets; wheel factor
   pinch vs scroll directions; commit-rest math (release → bx/by stable, tag offset
   recomputed). Simplest: extract/replicate the functions in a small node script.
3. CI-parity pinned venv (`pip install mkdocs-material==9.7.6`): `mkdocs build` →
   `python3 scripts/site_smoke.py` PASS; `graph.json` byte-identical across two builds
   (pipeline untouched).
4. If the compose `kb` server is already running (it usually is; do NOT start/stop it):
   `curl -s http://localhost:8765/knowledge/javascripts/graph.js | grep -c kb-graph-drift`
   ≥ 1 after a rebuild triggers, and `/knowledge/graph/` → 200. Skip silently if not running.
5. Browser visual QA is NOT possible in this harness — state it as operator-owed in
   `result.md` (both schemes, mingle feel, hover reveal, pinch zoom, sticky drag, lens).

## Executor duties (contract)

- Implement, then write `result.md` (free-form, from scratch) beside this plan.
- Append durable cross-slice notes to `works/phases/active/P6/phase.md` (a "P6.F1" section
  mirroring the S1–S3 pattern) AND these three Doc-impact lines to its "Doc impact" list:
  - `experience` (P6.F1): journey revision — quiet labels A′ (on-demand reveal + >110%
    fade-up), idle mingle after settle, pointer/pinch zoom with token clamps + 1:1 pan,
    sticky node re-placement with spring-following tag spokes, legend lens
    (highlight-not-filter, `.is-on`).
  - `frontend` (P6.F1): §10a +4 tokens (none changed), `.is-on` legend row, renderer
    live-model port from the design's `kbGraph.mount()` (persistent rAF w/ document.hidden
    guard; reduced motion stays event-driven).
  - `decisions` (P6.F1): operator-directed P6.S1 design revision consciously supersedes two
    locked S0 decisions (label Strategy A → A′; settle-then-still/"no idle drift" →
    settle-then-mingle); Claude Design provenance.
- Never commit; never transition slice/phase status; do not run `doc-new-version` (the
  re-review consolidates docs).
