# Result — P22.S1 "Show labels only for the selected node"

**Status: done.** One file changed, exactly as `plan.md` specified.

## What changed

`web/src/app/(app)/graph/graph-canvas.tsx` (the only file touched):

1. **`labelTarget()` rewritten** — the whole label policy is now three lines:

   ```ts
   if (keep && !keep[n.id]) return 0;                    // lens/neighborhood-dimmed → no label
   if (n.id === selectedId || n.id === focus) return 1;  // selected + hovered/dragged only
   return 0;
   ```

   This drops both the `focus && keep → 1` neighborhood rule (the "wall of titles" on hover)
   and the zoom ladder. Node type no longer matters: a selected/hovered tag or ghost node
   shows its (muted, via `drawLabel(..., n.type !== "doc", ...)`) label, everything else is
   quiet — consistent with the intent recorded in `phase.md`.

2. **`ladder()` deleted** — `labelTarget` was its only caller. `displayZoom()` is still used
   by `updateTooltip()` and the zoom controls, so nothing was orphaned; zoom now has no
   influence on canvas labels at all.

3. **File-header comment block updated** — the "quiet-label ladder" phrase was removed from
   the list of faithfully-ported draw grammar, and an explicit **"DELIBERATE DEVIATION from
   the port (P22 — label focus)"** paragraph was added explaining the new rule, why the
   hovered term is kept (the DOM tooltip bails above 0.6× zoom, so it cannot carry
   hover-to-identify), and what stayed untouched.

Untouched per the plan and `phase.md` constraints: node alpha `aT` in `stepAlphaLabelView`,
`computeKeep()` / `neighborhood()` / `projectKeep()`, halo, selection ring, edge activation,
`drawLabel()`, and `updateTooltip()`. The existing `n.la` easing supplies the fade in/out.

## Open question resolved

`phase.md` → Open Questions is now marked **RESOLVED**: label target 1 for the **selected
node AND the single hovered/dragged node** (`currentFocus()`), never a neighborhood; 0
otherwise. The literal "only the clicked one" variant remains a one-token drop
(`|| n.id === focus`) — flagged there for operator validation at review.

## Validation

| Command | Outcome |
| --- | --- |
| `cd web && npm run typecheck` (`tsc --noEmit`) | **pass**, no output |
| `cd web && npm run lint` (`eslint .`) | **pass**, no output |
| `python3 scripts/workflow.py validate` | **pass** — "Workflow validation passed." |
| `git status --porcelain` (read-only check) | only `web/src/app/(app)/graph/graph-canvas.tsx` plus workspace bookkeeping files modified |

No new test files (workspace test-minimalism rule); no `next build`, per plan.

**Static behavior check** by reading the new `labelTarget` against the caller
(`stepAlphaLabelView` → `frame()` label pass):

- Idle, nothing selected/hovered → `focus === null`, `keep` is `null` (or the project lens),
  no node matches → every label target 0 → all titles fade out. ✅
- Node selected, no hover → `currentFocus()` returns `selectedId`, so `keep =
  neighborhood(selectedId)`; only that node's id matches → exactly one title. ✅
- Hover (or drag) → `focus` is the hovered/dragged node, which is in its own neighborhood
  (`keep[focus]` true) → one title; the selected node, if outside that neighborhood, is
  dimmed by `keep && !keep[n.id]` and drops its label — so still at most one at a time. ✅
- Project lens active, nothing focused → `keep = projectKeep(project)`; excluded nodes → 0,
  and included-but-unselected nodes also → 0 (no `focus`/`selectedId` match). ✅
- Hidden nodes never reach the label pass (`frame()` skips `isHidden(n)`), so no extra guard
  was needed for a selected-then-hidden node. ✅

## Deviations from `plan.md`

None in substance. One judgment call inside the plan's item 3: rather than a one-phrase
swap, the header comment gained a short dedicated deviation paragraph (the plan asked for "a
note that P22 replaced ladder labels…"), because the surrounding block insists the port is
faithful and a future reader would otherwise read the missing ladder as port drift.

## Doc impact

One line appended to `phase.md` → Doc impact (no `doc-new-version` run — that is
`P22.REVIEW`'s job): `frontend` needs a version for the app `GraphCanvas` abandoning the
ported Strategy-A′ label ladder in favor of selection-driven labels, and the review should
judge whether `experience` (`:154`, "Read the map (quiet labels, Strategy A′)") and
`decisions` (`:333`/`:955`, the Strategy-A′ label lock) also need versions for the
app-vs-docs-site divergence. Note the mkdocs `docs/javascripts/graph.js` still has the
ladder — only the `web/` app surface changed.

## Notes for the review

- Both graph surfaces (member `/graph` and public `/graph/[org]`) render this one component,
  so the change lands on both with no second edit — verify both if eyeballing.
- Worth an operator eyeball: hovering a node still **undims** its neighborhood (node alpha /
  `computeKeep` was explicitly out of P22 scope) while only the hovered node gets a title.
  That is intended, but it is the one place where "hover still does something extra" remains.
