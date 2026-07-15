# P6.F3 result — layout spacing, smarter placement, placement survives reloads

**Status: done.** Renderer-only fix (`docs/javascripts/graph.js` the only source file
touched). Three operator-QA items implemented and validated on numeric harnesses + a
pinned-container build. Browser *feel* (spacing is subjective; the settle/mingle, restore,
and lens visuals) is operator-owed — no browser in this harness.

## What changed (all in `docs/javascripts/graph.js`)

### 1 + 2 — roomier spacing + smarter seeding

**Sim constants (final, tuned on the harness — these differ from the plan's anchors; see
Deviations):**
`REST_RELATED 110→150`, `REST_TAG 160→210`, `LAYOUT_RADIUS 340→400`, `COLLIDE_PAD 6→20`.
`REPULSION` kept at `9000` / cutoff `600²`, `CENTER_K` kept at `0.016` (the plan anchored
these to 16000 / 750² / 0.012, but raising them broke convergence — see Deviations).
`K_RELATED 0.9` / `K_TAG 0.2`, the alpha schedule (~600ms / ~37-tick settle), and
`FIT_PAD/FIT_Z_MIN/MAX` are unchanged. Net: the settled map is ~1.3× wider / 1.4× taller and
`related` edges stay shorter/stronger than `tag` (142 vs 193 world px), preserving S2's locked
doc-backbone-tighter-than-spokes relationship.

**Seeding (`buildModel` reorganized; new `seedPositions`/`seedCentroid`/`ghostSourceOf`).**
Edges + adjacency now build *before* seeding so ownership is known. Deterministic (hash01
only — the no-randomness invariant is kept):
- **Docs** — project-sector angle (unchanged) + **degree-aware radius**: `rad = R·(0.35 +
  0.5·(1−degNorm))` with ±0.08·R jitter, `degNorm = clamp((deg−2)/6,0,1)` (same ramp as the
  r 6→14 sizing). High-degree hubs pull toward the center, low-degree leaves push out.
- **Tags** — seeded at their owner docs' seeded **centroid**, on a hub-and-spoke ring at
  ~`REST_TAG·0.9` (±10% hash jitter). Spoke 0 faces **outward** (away from origin); the rest
  are placed on **even angular slots** keyed to the tag's index in its owner's tag list. Even
  slotting (rather than the plan's hash-random narrow fan) is the load-bearing change — see
  Deviations.
- **Ghosts** (`missing`) — ~`REST_RELATED` beyond the doc that links to them (deterministic
  offset). No ghosts in today's corpus, so this path is exercised only by the shape, not the
  live data.

### 3 — placement survives reloads (sessionStorage)

Diagnosis confirmed per the plan: there is **no in-page reset** — what the operator saw as
"auto refreshing to default" is the **mkdocs live-reload dev server** force-reloading the page
on every `docs/` change, which re-boots the map to the default layout. The fix makes placement
+ camera + lens **survive a reload** instead of fighting live-reload.

- New `computeStoreKey` (key `'kb-graph:v1:' + hash01(sorted node ids)`), `persist` (debounced
  ~250ms), `flushPersist` (immediate), `persistNow`, `restoreState`, `syncLegendUI`.
- **Value (JSON):** `{ rest:{id:[x,y] rounded 0.1}, view:{zt,pxt,pyt,auto}, tagsVisible,
  activeProject, selectedId }`. Keyed by corpus signature → a changed corpus lands on a new key
  and stale state is ignored (expires with the tab). `sessionStorage`, not localStorage: a
  fresh visit tomorrow gets the current default layout.
- **Saved at:** drag-commit / pan-end (`endDrag`), wheel + zoom-button + fit (`zoomAbout` /
  fit handler), legend lens toggle, tag-switch toggle, select/deselect, and once from
  `captureRest` (so the first settled layout is restorable). A `pagehide` listener flushes
  immediately.
- **Restore (in `start`, after `buildModel`):** on a key hit, sets each node `x=bx / y=by` to
  the stored rest, seeds `sd`, runs `computeTagAnchors`, marks the layout already settled
  (`restCaptured=true / alpha=0 / simStarted=false`) → the animated settle is **skipped**
  (paint at rest → mingle loop live / event-driven stillness reduced). `fit(true)` reframes;
  if `view.auto` was stored false the stored `zt/pxt/pyt` are **snapped** (targets + current,
  no restore animation) and `view.auto=false`. `tagsVisible` / `activeProject` are reflected in
  the legend DOM (`syncLegendUI`); `selectedId` re-opens the panel via the existing `select`
  path. A node missing from `rest` falls back to its seeded position (belt-and-braces; sig
  matching makes it not happen).
- **Every storage access is in try/catch** — private-mode Safari throws; a storage failure is a
  silent no-op, never an error.

## Validation

| Command | Outcome |
|---|---|
| `node --check docs/javascripts/graph.js` | **OK** |
| Numeric spacing harness (throwaway; loads the *real* graph.js under mocked DOM, settles via `convergeSync`, measures at rest) | **ALL PASS** |
| Persistence round-trip harness (throwaway; in-memory sessionStorage stub) | **ALL PASS** |
| `mkdocs build --clean` in the pinned compose `kb` container (mkdocs-material 9.7.6) | built OK; `site/javascripts/graph.js` carries the F3 changes; `site/graph.json` = v1, 32 nodes, 30 edges, projects `[changple5, bootstrap…, hi2vi_web]` |
| `python3 scripts/site_smoke.py` | **exactly 1 violation** — the KNOWN pre-existing `/Users/` prose leak in `docs/current/{frontend,qa,operations,data}` built pages (out of scope, owned by the reopened re-review). No graph/renderer/guard/landing assertion failed; my graph.js contributes **zero** `/Users/`, and the built graph.js / graph page / landing do not leak. |
| `curl …:8765/knowledge/javascripts/graph.js \| grep -c 'kb-graph:v1'` (live compose `kb`) | **1** (also carries `seedPositions`/`restoreState`) — serve parity holds; live-reload already serves the change |

**Spacing harness numbers (32-node corpus, 1200×700 viewport):** baseline (HEAD/F2) bbox
537×495, fitZoom 1.156, residual |v| 0.163, min-slack 23.6. New: bbox **704×695** (1.31× w /
1.40× h ≥ 1.25×; ≥ 700×450 absolute), **fitZoom 0.823** (< 1.5, no FIT_Z_MAX rail), min
pairwise slack **31.3** (≥ rA+rB+20), every tag **167.6–228.4** from owner-centroid (band
[105,336]), residual |v| **0.139** (converged; < 0.5), two runs **byte-identical**
(determinism), avg related **142** < avg tag **193** (S2 relationship kept). *(Baseline already
reads 1.156 at 1200×700; the FIT_Z_MAX rail the plan diagnosed appears on the wider desktop
viewports where the small bbox drives z past 1.5 — the 1.3–1.4× larger bbox is the real
"more space" lever, and fit drops from 1.156→0.823 even at 1200×700.)*

**Persistence harness:** save writes a `kb-graph:v1` key holding all 32 nodes + camera targets;
restore is byte-equal on `x/y/bx/by` with the settle skipped; a matching key applies stored
positions verbatim (settle skipped), a **mismatched signature is ignored** (fresh settle); the
camera `auto=false` branch snaps stored `zt/pxt/pyt`; `tagsVisible`/`activeProject`/`selectedId`
round-trip; and a private-mode store (get/set throw) is a silent no-op that still settles.

## Deviations from `plan.md`

The plan's constant/seeding values are explicitly "anchors, not gospel — TUNE on the harness."
These are tuning deviations; every HARD requirement (no-randomness, related<tag, the spread
targets, min-pairwise≥20, convergence in the design-locked settle) is met, so no escalation.

1. **Repulsion/centering kept at baseline, not raised.** The plan anchored `REPULSION 16000`,
   cutoff `750²`, `CENTER_K 0.012`. On the harness those **broke convergence**: the outward push
   outran the springs + centering and never reached equilibrium in the design-locked ~37-tick
   settle — bbox exploded to 780×2402…971×4275 with residual |v| 4.4–8.1. Kept `REPULSION 9000`
   / cutoff `600²` / `CENTER_K 0.016` (baseline, proven-stable) and reached the spread target
   instead through the spring rest lengths (150/210), `LAYOUT_RADIUS 400`, and `COLLIDE_PAD`.
2. **`COLLIDE_PAD 20`, not ~14.** The min-pairwise `≥ rA+rB+20` target needs the collision floor
   (a hard, alpha-independent position constraint) to guarantee 20 at settle end when repulsion
   has cooled; pad 14 would leave it to repulsion. 20 makes it robust (measured slack 31.3).
3. **Even-slot tag seeding, not "centroid + outward + hash01 fan".** The plan's hash-random
   narrow fan **stacked two same-owner tags** (`celery` + `self-recovery`, both on the
   daily-ingestion doc) nearly on top of each other → explosive close-range repulsion → those
   two tags flung to r≈1200 with |v|≈4.4 while the weak tag spring couldn't reel them back in 37
   ticks (the exact "stacking → stranded tags" failure the plan set out to avoid). Even angular
   slotting (spoke 0 outward + evenly by the tag's index in its owner's tag list) guarantees a
   minimum sibling separation, so nothing seeds on top of anything — honoring the plan's intent
   ("a doc's tags spread around it instead of stacking") while staying fully deterministic.

Nothing broke the related<tag relationship, so this is a tuned implementation, not an
escalation.

## Not done here (owed to operator / out of scope)
- **Browser visual QA** — roomier spacing feel, the settle→mingle, reload-restore round-trip
  (drag a node → trigger a live-reload → map returns as left), camera/lens/selection restore,
  and the reduced-motion path are all un-eyeballed (no browser in this harness).
- The pre-existing `/Users/` prose leak in `docs/current/{frontend,qa,operations,data}` remains
  (site_smoke's 1 violation) — **not a P6.F3 concern**; owned by the reopened P6.REVIEW.

## Note on the working tree
Per the plan's caveat, I did not touch, revert, or clean the killed re-review run's uncommitted
drafts. My write set is exactly `docs/javascripts/graph.js`, this `result.md`, and appends to
`phase.md`. (`site/` is git-ignored; the container build refreshed it for the smoke check.)
