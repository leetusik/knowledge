# Result — P22.REVIEW (phase review, P22 "Graph label focus")

**Verdict: `pass`.** One implementation slice (P22.S1), one file changed, everything the
phase promised is in the tree and nothing outside the declared blast radius moved. Four doc
versions consolidate the phase's durable truth.

## Validation (all slices together)

| Command | Outcome |
| --- | --- |
| `python3 scripts/workflow.py validate` | **pass** — "Workflow validation passed." (run before and after doc consolidation) |
| `cd web && npm run typecheck` (`tsc --noEmit`) | **pass**, exit 0, no diagnostics |
| `cd web && npm run lint` (`eslint .`) | **pass**, exit 0, no findings |
| `cd web && npm test` (`vitest run`) | **pass** — 10 files / **69 tests**, 330ms (not in the S1 plan; run here as a cheap regression net) |
| `git show f82372e --stat` / `git show f82372e -- web/src/app/(app)/graph/graph-canvas.tsx` | read-only; the diff is exactly the header comment block + `ladder()` deletion + `labelTarget()` rewrite. No other source file in the phase's commit |
| `grep -rn "ladder" web/src/` | only the two new *comment* mentions — no dead code left |
| `grep -rn "graph.js\|graph-canvas" scripts/*.py` | no port-parity gate exists between `graph.js` and `graph-canvas.tsx` (`site_smoke.py` only asserts the mkdocs wiring), so the deviation breaks no CI check |

### Static re-read of the changed logic (`graph-canvas.tsx`)

`labelTarget()` (`:862`) is now, in full:

```ts
if (keep && !keep[n.id]) return 0;
if (n.id === selectedId || n.id === focus) return 1;
return 0;
```

`selectedId` is a `let` in the same engine closure (`:345`), mutated by `select()`/`deselect()`
(`:1299`/`:1307`) — so the read is live, not a stale capture. `focus` is `currentFocus()`
(`:847`, drag id > `hoverId` > `selectedId`, existence- and hidden-filtered). Traced against
the caller (`stepAlphaLabelView` `:912` → `frame()` label pass `:978`):

- **Idle, nothing selected/hovered** → `focus === null`, no id match → every target 0 → the map
  goes titleless. ✅
- **Selected, no hover** → `focus === selectedId`, `keep = neighborhood(selectedId)`; only that
  id matches → exactly one title. ✅
- **Hover / drag** → the hovered/dragged node titles. ✅
- **Hover a neighbor of the selected node** → **two** titles (hovered + selected, both inside
  `keep`). Selected node outside the hovered node's neighborhood → the `keep` guard drops its
  label, back to one. See finding N1 — behavior is right, the S1 `result.md` wording was not.
- **Lens-excluded** (`keep && !keep[n.id]`) → 0 even for a hovered/selected node. ✅
- **Selected-then-hidden node** → `currentFocus()` returns null, the hidden node can still target
  1, but `frame()` skips `isHidden(n)` before drawing, so nothing paints. ✅
- **Untouched, confirmed by diff:** node alpha `aT` (`:910`), `computeKeep()`/`neighborhood()`/
  `projectKeep()`, halo/ring/edge activation, `drawLabel()`, `updateTooltip()` (`:1153`, still
  `displayZoom() < 0.6`-gated). `displayZoom()` survives with two live callers. ✅

## Judgment against the objective and `intent.md`

The objective — "show a title only for the clicked node, tooltip stays, kill the ladder" — is met
on both graph surfaces (member `/graph` and public `/graph/{org}` share the one component). The
implemented rule is **one token wider** than the literal intent: the hovered/dragged node also
titles. That widening was recommended and approved in the S1 plan on a verified premise (the DOM
tooltip bails above 0.6× zoom, so a strictly selected-only map would leave hover unable to
identify anything at reading zoom), it is recorded in `phase.md` → Open Questions as RESOLVED,
and it is reversible by deleting `|| n.id === focus` with no other edit. Passing on that basis;
**the operator's eyeball is the deciding vote** and is written into the qa doc as an explicit
open call, not left in a phase folder that gets archived.

Phase constraints were all honored: label alpha only, no new dependency, no new interaction
affordance, one file, the mkdocs `docs/javascripts/graph.js` untouched.

## Findings (non-blocking — no fix slice proposed)

- **N1 — an inaccurate sentence in `P22.S1/result.md`, not in the code.** It claims that when a
  node is selected and another is hovered, "still at most one at a time" is painted. In fact if
  the selected node lies inside the hovered node's neighborhood, both title (two labels). The
  behavior is the desirable one — the selection should not lose its title because the pointer
  moved next door — and the component's header comment is accurate ("at most one title is
  painted **at rest**"). Corrected in the consolidated docs (frontend / experience / decisions
  all state "at most one at rest, at most two in transit"); the historical `result.md` is left
  as written.
- **N2 — the port has no automated parity gate.** `graph-canvas.tsx` is now a *deliberately*
  unfaithful port and nothing in CI would catch a future "repair" that reinstates the ladder.
  The header comment's DELIBERATE DEVIATION paragraph is the only guard. Recorded in the
  frontend doc and in ADR **D-P22-1**; building a real gate would be its own phase and is not
  proposed here.
- **N3 — the label change has no automated coverage and cannot cheaply get any** (canvas + rAF).
  Handled the workspace way: an explicit manual QA mission in the qa doc rather than a
  scaffolded test suite.

## Doc consolidation (pass-only; P22 is not in parallel mode)

The phase's single "Doc impact" line named `frontend` and asked the review to judge `experience`
and `decisions`. Judged: both needed versions, and `qa` did too.

| Doc | Version | What it now says |
| --- | --- | --- |
| `frontend` | `v0012_p22_graphcanvas_labels_go_selection-driven_the_ported_quiet-label_ladder_and_neighborhood_reveal_are_gone` | New section *Graph label focus: selection-driven canvas labels (`web/`, P22)* (the 3-line rule, what was deleted, exactly what paints, why the hovered term stays, what stayed untouched, the missing parity gate); the *Knowledge graph* app bullet drops the word "faithful" and points at it |
| `experience` | `v0013_p22_the_in-app_graph_goes_quiet_a_title_shows_only_for_the_selected_node_and_the_one_hovered_node` | New section *The in-app graph goes quiet: labels follow the selection (P22)* in the user's voice; the P6 *Explore the knowledge map* journey is now explicitly scoped to the **public mkdocs map**; the P12 app *Knowledge graph* bullet cross-links |
| `decisions` | `v0019_p22_adr_the_app_graph_deviates_from_the_ported_label_ladder_selection-driven_labels_a-prime_scoped_to_the_mkdocs_map` | New ADR **D-P22-1** (decision, scope, three rejected alternatives, consequences); the Status roll-up gains a P22 clause; the Superseded-Decisions ledger line and the P6.S1 ADR bullet now say quiet-labels **A′ is narrowed to the mkdocs map, not superseded** |
| `qa` | `v0012_p22_app-graph_label-focus_qa_mission_the_p6_map_mission_covers_the_mkdocs_surface_only` | New mission *In-app graph label focus (browser — authoritative, P22)* (what to check incl. the two-title neighbor case, what must be unchanged, what would feel wrong, and the operator's open call on the hovered title); the P6 map mission is scoped to the mkdocs surface so its "quiet labels A′" expectation is not misread as covering the app |

`python3 scripts/workflow.py rebuild-docs` → "rebuilt docs/current from latest versions";
`validate` re-run green afterwards. No `docs/current/*.md` was hand-edited and no existing
version was patched.

## Deviations from `plan.md`

1. **A fourth doc version (`qa`), beyond the plan's `frontend` + judged `experience`/`decisions`.**
   The phase's only behavioral evidence is a static read, the eyeball is genuinely owed, and the
   qa doc's existing Knowledge-map mission (heading: P6) would otherwise be read as covering the
   app map while asserting the now-wrong A′ expectation. A QA mission belongs in `qa`, not in a
   phase folder that archives.
2. **Ran `cd web && npm test` as well** (not listed in the plan's validation set) — 69 tests,
   green, ~0.3s. Cheap insurance that the label edit disturbed nothing else in the app.
3. Everything else exactly as planned. No source file touched, no commit, no status transition,
   no explainer.
