# P6.F3 — layout spacing, smarter placement, placement survives reloads

## Why (operator browser QA, verbatim intent)

Operator: "give them more space for each node by default, and smart location for better
visibility. also it time to time auto refreshing it's location to default, don't do that."

Three changes to `docs/javascripts/graph.js` (the ONLY file this slice may change):

1. **More space per node by default** — the settled map is cramped; today's rest bbox is
   small enough that `fit()` hits its `FIT_Z_MAX 1.5` clamp (a clump in the middle of the
   viewport). Spread it so the map breathes and fills the plate.
2. **Smarter placement for visibility** — today's initial seeding puts every tag at a
   hash-random angle on an outer ring (graph.js:213-215), IGNORING where its owner doc is;
   the weak tag springs (K_TAG 0.2) then have only ~37 ticks to drag them across the map →
   crossings and stranded tags. Seed tags AT their owners; make doc placement degree-aware.
3. **Stop the "time to time reset to default"** — DIAGNOSED, read carefully:
   there is NO in-page reset (verified: no sim reheat exists; `restCaptured` never clears;
   `resize()` refits only the camera; drag-commit is the only bx/by writer). What the
   operator experienced is **mkdocs live-reload**: any `docs/` change makes the dev server
   rebuild and force-reload the page, and the map re-boots to the default layout. The fix
   is NOT to fight live-reload — it is to make placement + camera **survive reloads** via
   `sessionStorage`, so a reload restores the map exactly as left. (Also correct on the
   deployed site: placement survives leaving to read a doc and coming back, same tab.)

## Change 1 + 2 — sim constants and seeding (graph.js lines ~55-64 and ~205-219)

Starting values (TUNE on the harness; these are anchors, not gospel):
- `REST_TAG 160 → ~210`, `REST_RELATED 110 → ~150` (keep related < tag: doc backbone
  tighter than spokes — S2's locked relationship, preserved).
- `REPULSION 9000 → ~16000`, `REPULSION_MAX_D2 600² → 750²`.
- `COLLIDE_PAD 6 → ~14` (this is the per-pair "personal space" floor).
- `CENTER_K 0.016 → ~0.012` (let it breathe outward), `LAYOUT_RADIUS 340 → ~400`.
- Keep: `K_RELATED 0.9`, `K_TAG 0.2` (raise K_TAG to ≤0.25 ONLY if the harness shows tags
  under-converged at settle end), alpha schedule (the ~600ms settle budget is design-locked),
  `FIT_PAD 64`, `FIT_Z_MIN/MAX 0.5/1.5`.

Seeding (deterministic, hash01-based — the no-randomness invariant is HARD):
- Docs: keep the project-sector angle; make radius DEGREE-AWARE — high-degree docs nearer
  the center, leaves outward: e.g. `rad = LAYOUT_RADIUS * (0.35 + 0.5 * (1 − degNorm) )`
  with a small hash jitter (±0.08·R), where degNorm = clamp((deg−2)/6, 0, 1) (same ramp as
  the radius sizing).
- Tags: seed at the CENTROID of their owner docs' seeded positions, pushed OUTWARD (away
  from the origin) by ~REST_TAG·0.8, fanned by a deterministic per-tag angle offset
  (hash01(id)) so a doc's tags spread around it instead of stacking. Owners come from
  `adjacency` (doc-type neighbors) — same rule as `ownerDocsOf()`, but note tagAnchor does
  not exist yet at seeding time; compute owners inline from the raw edges.
- Ghosts (`missing`): seed near the doc that links to them (the related-edge source) at
  ~REST_RELATED beyond it, deterministic offset — not on a random outer ring.

## Change 3 — sessionStorage persistence

- Key: `'kb-graph:v1:' + sig`, sig = a hash over the SORTED node id list (reuse `hash01`;
  e.g. hash01(ids.join('\n')) stringified). Corpus changes → different key → stored state
  ignored (stale entries just expire with the tab).
- Value (JSON): `{ rest: {id: [x, y] (rounded 0.1)}, view: {zt, pxt, pyt, auto},
  tagsVisible, activeProject, selectedId }`. Keep it minimal; versioned by the key prefix.
- Save via ONE debounced `persist()` (~250ms) called at: drag-commit (endDrag after a real
  move), wheel/zoom-button/fit use, pan end, legend lens toggle, tag-switch toggle,
  select/deselect; plus a `pagehide` listener that flushes immediately. EVERY storage
  access in try/catch (private-mode Safari throws) — storage failure must be a silent
  no-op, never an error.
- Restore in `start()` after `buildModel()`: if a stored blob parses and its key matched:
  set each stored node's `x=bx=stored.x`, `y=by=stored.y`, seed `sd`, run
  `computeTagAnchors()`, set `restCaptured = true`, `alpha = 0`, `simStarted = false` —
  i.e. SKIP the animated settle: paint at rest and go straight to the mingle loop
  (non-reduced) / event-driven stillness (reduced). Then `fit(true)` to compute
  center/fitZoom from the restored positions, and if `view.auto` was stored false, apply
  the stored `zt/pxt/pyt` (targets AND current — snap; don't animate a restore) and set
  `view.auto = false`. Restore `tagsVisible` (sync the switch's `.is-on`/aria-pressed),
  `activeProject` (sync the legend row's `.is-on`), `selectedId` (call the existing select
  path so the panel opens). A node id present in the graph but missing from `rest` (should
  not happen with sig matching — belt-and-braces): fall back to its seeded position.
- No store / mismatch / parse failure → today's path (settle → captureRest), and make
  `captureRest()` call `persist()` once so the first settled layout is also restorable.
- `sessionStorage`, NOT localStorage: tab-scoped is the right conservatism — a fresh visit
  tomorrow gets the (now smarter) default layout.

## Verification (lean, no committed suite)

1. `node --check docs/javascripts/graph.js`.
2. Extend/adapt the throwaway numeric harness (scratch space, not committed) — stub
   getComputedStyle/canvas as F1's harness did, load the REAL graph.json (build it or use
   `python3 scripts/graph_hook.py`-emitted data from a venv build), run the seeding + full
   settle (converge to ALPHA_MIN), then assert AT REST:
   - min pairwise node distance ≥ rA + rB + 20 (world px), across ALL pairs;
   - every tag within [0.5, 1.6] × REST_TAG of its owner-centroid;
   - bbox spread: width AND height ≥ 1.25× the pre-change baseline (run the harness once
     on the OLD constants first to record the baseline — or assert absolutely: bbox ≥
     ~700×450 world px for today's 32-node corpus);
   - fit() no longer rails at FIT_Z_MAX for a ~1200×700 viewport (fitZoom < 1.5);
   - all positions finite; two runs byte-identical (determinism);
   - residual motion at settle end small (max |v| < 0.5 world px/tick).
   - persistence: round-trip a fake sessionStorage stub — save → restore → positions
     byte-equal, settle skipped (restCaptured true, alpha 0), sig mismatch → ignored.
3. Pinned venv (`mkdocs-material==9.7.6`): `mkdocs build` → built `graph.js` carries the
   changes; `python3 scripts/site_smoke.py` → expect exactly **1** violation, the KNOWN
   pre-existing `/Users/` prose leak (docs/current, out of scope; the re-review owns it).
   Any OTHER violation → stop and report.
4. IMPORTANT — working-tree caveat: `git status` will show `docs/current/*.md`,
   `docs/index.json`, `docs/versions/*` (untracked), `works/.../P6/phase.md`, and
   P6.REVIEW files as dirty. Those are a killed re-review run's uncommitted drafts,
   pending the operator's decision — DO NOT touch, revert, clean, or commit them; do not
   include them in any diff you make. Your write set is exactly: `docs/javascripts/graph.js`,
   your `result.md`, and appends to `phase.md` (which is dirty — append anyway, at the end
   of the existing "Doc impact" list / notes sections).
5. If the compose `kb` server is already up (do NOT start/stop):
   `curl -s http://localhost:8765/knowledge/javascripts/graph.js | grep -c 'kb-graph:v1'` → ≥1.
6. Browser feel (spacing subjective) is operator-owed — say so in result.md.

## Executor duties (contract)

- Implement, verify, write `result.md` beside this plan.
- Append to `phase.md`: a "P6.F3" section (what changed + the live-reload diagnosis so it
  isn't re-investigated) and these Doc-impact lines:
  - `experience` (P6.F3): map layout revision from operator QA — roomier default spacing
    (spread constants), degree-aware doc seeding + owner-anchored tag/ghost seeding for a
    cleaner first layout, and placement/camera/lens state now survives page reloads within
    the tab (sessionStorage; fresh tab = fresh default layout).
  - `frontend` (P6.F3): renderer-only change — retuned sim constants, deterministic
    smarter seeding (no randomness invariant kept), sessionStorage persistence keyed by a
    corpus signature with try/catch-silent storage access; settle skipped on restore.
- Never commit; never transition slice/phase status; no doc-new-version.
- Surprises beyond this plan's anchors (e.g. the harness cannot hit the spread targets
  without breaking the related<tag relationship, or persistence conflicts with something
  unforeseen) → return `escalate` with findings rather than improvising a redesign.
