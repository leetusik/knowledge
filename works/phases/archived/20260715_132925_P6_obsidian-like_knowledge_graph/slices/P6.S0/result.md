# P6.S0 — Design co-work: knowledge-graph design via Claude Design — result

**Verdict: done.** The graph's visual language was designed and consented in Claude Design before any implementation; this slice records the delivered guide and lands no repo code.

## What the slice did (end to end)

1. **Brief pushed.** The orchestrator wrote `GRAPH_BRIEF.md` into the existing "Knowledge Base Design System" design project (a new file; P5's `BRIEF.md` untouched) describing the P6 knowledge map — data scale (~6 docs / 3 projects / ~26 tags / 3 related + ghosts), node/edge taxonomy, interaction states to spec, deliverable shape, and acceptance criteria (both schemes, contrast, additive `--kb-graph-*` only, no new webfonts). The one open design call — teal-only strength ladder vs. a small categorical set for data-viz — was posed for the operator to resolve consciously.
2. **Operator co-designed** the graph in Claude Design and declared it done ("Strategy A locked; README carries the P6.S0 close block").
3. **Check-up PASS, no gaps** (orchestrator, 2026-07-14; recorded in `plan.md` → "Check-up result"): structural (all deliverables present + `GRAPH_BRIEF.md` intact), token stability (19/19 LOCKED Target-1 values byte-match `docs/stylesheets/extra.css`; additions are `--kb-graph-*` only), contrast (18/18 computed WCAG claims pass — marks ≥3:1, labels ≥4.5:1 on both plates; tightest bronze 4.15:1 light, ghost 3.12:1 dark), and every acceptance criterion met.
4. **Deliverables mirrored** to the scratchpad as the integration source of truth for S1–S3.
5. **Guide recorded** here: `phase.md` now carries the S0 decomposition entry, the "Design guide (P6.S0, locked)" findings subsection, the Doc-impact one-liners, and the resolved/still-open Open Questions.

## Deliverable inventory (the design guide)

Mirror path (integration source of truth for S1–S3):
`/private/tmp/claude-502/-Users-sugang-projects-personal-knowledge/62648e14-5642-42c8-af17-eea4e69b27da/scratchpad/kb-graph-design/`

- `README.md` — the "P6 · Graph — the knowledge map" section + the `**P6.S0 closed (2026-07-14)**` close block (the prose design guide).
- `tokens/graph.css` — the single token source: additive `--kb-graph-*` only, both schemes, names frozen at S0 close (geometry, edge geometry, emphasis, labels, motion; per-scheme project inks + node/edge/label inks + dim alpha).
- `components/graph/graph.css` — the DOM layer around the canvas (map frame, legend + filters + tag switch, zoom stack, tooltip, info panel, empty/loading, reduced-motion) plus the mkdocs-material page-anatomy hooks notes.
- `components/graph/graph-render.js` — the design-reference renderer = the DRAWING SPEC (token access pattern + draw order); engineering keeps the drawing grammar and swaps the hand-placed layout for the real sim.
- `components/graph/graph-nodes.card.html`, `graph-edges.card.html`, `graph-labels.card.html`, `graph-panel.card.html` — the four specimen cards (node states, edge treatments, labels with real EN/KR strings, legend/controls/tooltip/panels).
- `pages/graph.card.html` — the full-page composition, both schemes.

## Locked decisions (summary)

- **Project inks** — small muted categorical set scoped to **data-viz surfaces only**: teal `#0f6f66`/`#62bdb2` (anchor) · bronze `#8a6a2a`/`#c8a15e` · plum `#764f6c`/`#c99bc0` (light/dark). Every interactive accent stays teal — the one-accent rule holds where it is UI.
- **Label Strategy A** + the zoom ladder (`<60%` hub doc labels only [deg ≥6] + tooltip · `60–110%` all doc labels · `>110%`/hover/selected neighborhood tag labels fade ~80ms · reduced motion: no fades, paint at rest). 12.5px doc / 11px tag at 1×.
- **Marks** — docs filled r 6→14px by degree + plate cutout rim; tags hollow rings 4.5px; ghost dashed ring 5.5px; related edges 1.75px + arrowhead ("reads on to"); tag edges 1px; hover/selected neighborhood keeps ink + teal edges + halo, selection adds offset teal ring + top-right panel, rest dims to α .16/.22.
- **Page** — full-bleed `.kb-graph` below header/tabs (the map IS the page), both sidebars suppressed, mounted in `.md-main`, `.md-content__inner` zeroed; overlay cards; plate `--kb-surface-sunken` light / `#16130f` dark.
- **Motion** — settle-then-still ~600ms, no idle drift.
- All `--kb-graph-*` token names frozen.

Full detail (mark grammar, page anatomy, contrast, cautions, data contract) lives in `phase.md` → "Design guide (P6.S0, locked)".

## What the orchestrator should know when planning S1

- **Data-contract change (the only one the design introduces):** `graph.json` should gain a **top-level `projects` list** so the legend can render per-project doc counts and a deterministic project→ink assignment. Node fields already planned (`title`, `url`, `date`, `project`, `tags`, `degree`) fully cover the info panel + legend + degree-sizing needs — **no other node/edge field changes**. Ghost nodes carry the raw unresolved path as `title` and need no `url`; tag nodes need no `url` (not navigation targets).
- S1 stays as scoped (build-time `graph.json` emitter + shape guard); fold in the `projects` list, then S2 implements the renderer **to the design guide** (mirror + `tokens/graph.css` + the `graph-render.js` drawing spec), S3 integrates entry points.
- **Renderer direction remains S2's open call** — the design's drawing spec is renderer-agnostic, so `d3-force` + custom canvas (the lean) is unconstrained by the design.
- **No-CDN caution for S2:** the specimen cards use the Iconify CDN (design-project-only); the live page must use inline SVG or text glyphs for the zoom/close icons to keep the no-CDN guard green.

## Deviations from `plan.md`

None. This slice executed exactly the executor contract (step 6): read the mirror, recorded the design guide + decomposition update + Doc-impact one-liners in `phase.md`, wrote this `result.md`. No repo source touched; no `doc-new-version`; no commits or status transitions.

## Validation

- `python3 scripts/workflow.py validate` — passed (state integrity green; S0 ordered before S1).
