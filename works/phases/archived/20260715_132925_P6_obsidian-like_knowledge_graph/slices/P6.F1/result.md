# P6.F1 result — Graph renderer revision (design P6.S1)

**Status: done.** Ported `kbGraph.mount()`'s live model onto engineering's force
sim in `docs/javascripts/graph.js` and updated `docs/stylesheets/extra.css` §10
to the operator-directed "P6.S1 REVISION" spec. All five spec changes implemented;
§1–§9 of extra.css untouched; one vendored JS file, zero third-party/zero CDN.

One **pre-existing, out-of-scope** `site_smoke.py` failure surfaced during
validation — a `/Users/` prose leak in four `docs/current/*` pages, introduced by
the P6.REVIEW doc consolidation (commit `43f4b79`), NOT by this slice. Details and
required re-review action in "Pre-existing finding" below.

## What changed

### `docs/javascripts/graph.js` (rewritten renderer core; kept boot/data/sim/camera/panel)

Kept verbatim: fetch/boot, `buildModel` (graph.json contract unchanged), the force
sim (`tick`/`convergeSync`, constants untouched), fit/camera math + `toScreen`/
`toWorld`/`displayZoom`, drawing primitives (`drawEdge/drawHalo/drawNode/drawRing/
drawLabel`), the low-zoom tooltip (hover at `displayZoom < 0.6`), the info panel
(real URLs, `esc()`, ✕ text glyph + inline-SVG fit icon — NO Iconify/CDN), legend
markup + counts + tag switch, the scheme `MutationObserver`, resize.

Ported on top (reference: the design mirror's `kbGraph.mount()`):

- **Quiet labels (Strategy A′).** Deleted `tagReveal`/`HUB_DEGREE`/`drawLabelForNode`.
  New `labelTarget(n, keep, focus)`: outside keep → 0; focus && in keep → 1 (whole
  neighborhood incl. tags); doc → `keep ? 1 : ladder()`; missing → `ladder()·0.9`;
  tag → 0. `ladder() = clamp01((displayZoom() − 1.1) / 0.25)` — **relative to fit**
  (S2's locked mapping). Per-node label alpha `la` eases toward the target; draw
  alpha = `al·la` (skip < 0.02), muted for non-doc. Idle map is marks-only.
- **Idle mingle.** New per-node `bx/by` (rest), `sd` (drift seed via the reference's
  `seed()` LCG verbatim), `al`/`la` (eased ink/label alpha). `captureRest()` fires
  when the sim crosses `ALPHA_MIN` (or right after `convergeSync`): snaps `bx/by = x/y`,
  seeds `sd`, computes `tagAnchor[id] = {owners, dx, dy}` off the owners' REST centroid
  (`anchorOf` handles multi-owner tags like the shared `performance`). Non-reduced:
  ONE persistent rAF `loop()` (re-queues first, `if (document.hidden) return;`) that
  ticks the sim while hot, then runs the kinematics; `drift()` amp = `T.drift × (tag
  1.5 / missing 1.2 / doc 1)`, sum-of-sines / 1.5, deterministic per id, → {0,0} under
  reduced motion or zero drift.
- **Pointer zoom + pan.** Added eased view targets `zt/pxt/pyt` alongside current
  `z/panX/panY` (view eases 0.16). `zoomAbout` now computes against the TARGETS so
  successive wheel events compose, clamps `zt` to `fitZoom × [T.zoomMin, T.zoomMax]`
  (replaced the hardcoded `ZOOM_MIN 0.3/ZOOM_MAX 4`). Wheel factor =
  `exp(−deltaY × ((ctrl||meta) ? 0.01 : 0.0024))` (trackpad pinch = ctrl-wheel).
  `clampPan()` bounds pan targets to `±(W·zt)/2, ±(H·zt)/2`. Empty-plate drag pans
  1:1 (writes current = target). Buttons: ×1.3 / ÷1.3 / fit (fit → auto, ease live /
  snap reduced). Escape-to-deselect kept.
- **Node re-placement (sticky).** Kinematic drag — NO sim reheat, no `fx/fy` (the
  `fx/fy` pin is kept ONLY in the pre-rest window while the sim is still hot). Drag
  target clamped to a 12px screen inset, converted to world coords. Tap (< 5px screen
  travel) toggles select; tap on empty plate deselects. Real-drag commit on release:
  `bx/by = x/y − drift(now)`; tag → recompute `dx/dy` vs owners' REST centroid; doc/
  ghost → rest only (spokes follow via live anchors). No plate-fraction `docPos` — world
  coords are resolution-independent, so resize only refits the camera.
- **Legend = lens, never filter.** Removed `offProjects`, the `.is-off` wiring, and
  `isHidden`'s doc branch (`isHidden` now = `type==='tag' && !tagsVisible`; missing
  always visible). New `activeProject: name|null`, single-select toggle, `.is-on` on the
  active row, **NO refit** on toggle. `projectKeep(name)` = the project's doc nodes +
  every edge-neighbor (tags, related docs, ghost targets). Focus (hover/select/drag)
  overrides the lens. Tag-visibility switch keeps its refit-if-auto behavior.
- **Draw restructured** to the reference single-pass grammar (edges → halo behind focus
  → nodes → selection ring → labels): edge alpha = min(endpoint `al`), skip < 0.01,
  active = incident to focus && alpha > `T.dim + 0.05`; each node at its own `al`; hidden
  nodes/edges (tag switch) skipped entirely.
- `readTokens()` adds `drift` (3), `driftPeriod` (`parseFloat('9s')`→9), `zoomMin` (0.5),
  `zoomMax` (2.5) via a `pxf(name, fallback)` helper (honours an explicit `0`).
- Copy: file-header design-mapping block rewritten (Strategy A′, settle-then-mingle,
  pointer spec, reference = `kbGraph.mount()` P6.S1); loading state now
  "settles in ~0.6s." (dropped the now-false "then holds still").

### `docs/stylesheets/extra.css` — §10 only (§1–§9 untouched)

- **§10a**: replaced the "Motion — settle-then-still" comment + lone `--kb-graph-settle`
  with the design's "Motion — settle, then mingle (P6.S1 revision)" block +
  `--kb-graph-settle: 600ms`, `--kb-graph-drift: 3px`, `--kb-graph-drift-period: 9s`,
  the "Pointer zoom" comment + `--kb-graph-zoom-min: 0.5`, `--kb-graph-zoom-max: 2.5`
  — **verbatim** upstream text. Verified: the whole §10a token block is now
  byte-identical to the mirror's `tokens/graph.css` (the ONLY diff before this edit was
  exactly this Motion block; scheme blocks untouched). Added a one-line P6.S1-revision
  note to the §10 intro comment.
- **§10c**: added the two `.kb-graph-legend__item.is-on` lens rules (design-scoped
  `.kb-graph` prefix) after the chip rules and before the `.is-off` rules; the `.is-off`
  rules are KEPT (the engine just no longer sets them).
- **§10d**: reduced-motion comment now states the engine skips the settle AND the idle
  mingle (holds still) and snaps pan/zoom.

## Validation

| Check | Command | Result |
|---|---|---|
| JS syntax | `node --check docs/javascripts/graph.js` | **PASS** |
| Pure-logic harness (throwaway, scratch) | `node harness.js` (33 assertions) | **PASS 33/33** |
| CI-parity build ×2 (pinned mkdocs-material 9.7.6) | `mkdocs build` | **exit 0** both |
| `graph.json` determinism (pipeline untouched) | `cmp site1 site2` | **byte-identical** |
| Built §10a tokens + lens rule landed | grep built `extra.css` | 4 new tokens ×1, `.is-on` ×2, `.is-off` kept, mingle note ×1 |
| Built graph asset carries the revision | grep built `graph.js` | `kb-graph-drift` ×4 |
| `site_smoke.py` (default root) | `python3 scripts/site_smoke.py` | **1 pre-existing failure only** (see below) — every P6.F1-relevant assertion PASSED |
| Serve parity (kb server already up; not started by me) | curl `:8765` | graph.js serves `kb-graph-drift` ×4 + `activeProject` ×4; `/graph/` → 200; extra.css serves `drift-period` |
| Workflow state | `python3 scripts/workflow.py validate` | **PASS** |

Harness assertions (replicated pure functions): drift bounded ≤ amp per type
(doc 3 / tag 4.5 / ghost 3.6px) and deterministic per id; reduced-motion & zero-drift
→ {0,0}; ladder 1.1→0, 1.35→1, ~1.225→0.5, clamps; `labelTarget` A′ (quiet idle, focus
reveals neighborhood incl. tags, lens shows doc titles only, ghost·0.9); `projectKeep`
includes docs + shared tag + ghost target, excludes other projects; wheel factor pinch
vs scroll directions (and pinch stronger per unit); commit-rest math (doc: rest+drift
returns to drop point; tag: centroid+offset+drift returns to drop point).

## Pre-existing finding (REQUIRED re-review action — NOT a P6.F1 defect)

`site_smoke.py` reports exactly **one** violation, unrelated to this slice:

```
local path leak ('/Users/') in 4 built page(s):
  current/frontend/index.html, current/qa/index.html,
  current/operations/index.html, current/data/index.html
```

- The leaking string is **inline-code prose** in the durable docs (e.g. frontend.md:
  ``§1–§9. `graph.json` must stay repo-relative (no `/Users/` leak).``) that renders to
  `<code>/Users/</code>`; `site_smoke`'s bare-substring `/Users/` scan flags it.
- **Origin: commit `43f4b79` (P6.REVIEW doc consolidation).** `git log -S` confirms the
  prose entered `docs/current/{data,frontend,operations,qa}.md` in that commit; the
  review's own `site_smoke` ran **before** it consolidated those docs, so the leak was
  never caught. It is present at HEAD independent of my edits.
- **My change is clean:** `docs/javascripts/graph.js` and `docs/stylesheets/extra.css`
  contain zero `/Users/`; the built graph page, landing page, and `graph.js` asset do
  not leak. site_smoke's single failure is orthogonal to P6.F1 — every graph/renderer/
  guard/landing assertion passed.
- **Out of P6.F1 scope + permissions:** `docs/current/*` are generated (never
  hand-edited), `docs/versions/*` are immutable, `doc-new-version` is review-only, and
  `site_smoke.py` is do-not-touch per this plan. So this slice cannot fix it.
- **Recommended fix at the reopened P6.REVIEW** (which re-validates all slices and
  re-consolidates docs): re-consolidate those 4 durable docs escaping the `/Users/`
  mention (e.g. `/​Users/`, "the local-path", or "`/Users`" without the trailing slash),
  OR refine the `qa` guard so `site_smoke`'s leak scan ignores inline-code prose
  (`<code>…</code>`) and matches only real absolute paths (e.g. `/Users/<name>/`). Either
  is a small `changes_requested`-scoped fix, likely a `qa`/`docs` fix slice.

## Deviations from `plan.md`

- **None to the renderer/CSS spec.** All five behaviors, the token edits, and the
  do-not-touch list were followed exactly.
- **Discovered pre-existing breakage** (the `/Users/` docs leak above): the plan's
  verification step 3 expected a full `site_smoke` PASS, assuming a green tree; the tree
  was already red from the P6.REVIEW consolidation. Reported rather than fixed (fixing is
  outside this slice's scope and permissions).

## Owed to operator (browser visual QA — no browser in this harness)

Un-eyeballed, both schemes: the idle mingle feel (barely-there wander, never fighting
the pointer), quiet→hover/selection label reveal + the >110% doc-title fade-up, trackpad
pinch + wheel zoom toward the pointer and 1:1 plate pan, sticky node re-placement with
spring-following tag spokes, and the legend lens (`.is-on` highlight, dim-not-remove).
Reduced-motion path (paint at rest, hold still, snap) likewise owed. The graph-page
footer-below-the-map note from S2/S3 is unchanged.
