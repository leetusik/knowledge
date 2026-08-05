# Plan — P22.REVIEW (phase review for P22 "Graph label focus")

## Context

P22 shipped one implementation slice, P22.S1: `labelTarget()` in `web/src/app/(app)/graph/graph-canvas.tsx` is now selection-driven (label 1 only for the selected node and the single hovered/dragged `currentFocus()` node, never a neighborhood, never a zoom ladder); `ladder()` deleted; header comment carries a documented deviation-from-port note. Phase context: `phase.md` (findings, constraints, resolved open question, Doc impact list) and `intent.md`. P22 is NOT in parallel mode — a passing review consolidates docs normally.

## Review scope

1. **Validate the phase's slices together** (state + behavior):
   - `python3 scripts/workflow.py validate`
   - `cd web && npm run typecheck && npm run lint`
   - Re-read the changed region of `graph-canvas.tsx` (`labelTarget`, the deleted-`ladder` area, the header block) and statically confirm: idle/no-selection → all label targets 0; selected → exactly that node 1; hover/drag → that single node 1; lens-excluded (`keep && !keep[n.id]`) → 0; tooltip (`updateTooltip`) and node-alpha/keep/halo/ring/edge logic untouched (diff-level check vs. git history is fine via `git log -p -1 -- web/src/app/\(app\)/graph/graph-canvas.tsx` — read-only).
2. **Judge against the objective and `intent.md`**: "show a title only for the clicked one; hover tooltip stays." The implemented rule adds the hovered/dragged node's own label (rationale in phase.md: the tooltip is a low-zoom fallback, absent above 0.6× zoom). Judge whether this honors the confirmed intent; it was operator-approved in the S1 plan. Note for the operator in the review note that dropping `|| n.id === focus` is the one-token literal fallback.
3. **On a passing verdict only — consolidate Doc impact** (you may run `doc-new-version` in this slice only):
   - Read `docs/index.json` and the current `frontend` doc (and `experience` `:154`, `decisions` `:333`/`:955` regions) to judge scope.
   - `frontend` gets a version for the selection-driven label behavior (per the Doc impact line in phase.md).
   - Judge whether `experience` and `decisions` (the Strategy-A′ quiet-label lock) also need versions for the app-surface divergence — the mkdocs-site `docs/javascripts/graph.js` graph is unchanged, so the deviation is app-only; version them only if their current text now misstates the web app's behavior.
   - Run `python3 scripts/workflow.py doc-new-version --doc <name> --summary "..." --source P22.REVIEW` per needed doc, then `rebuild-docs` if the engine doesn't do it automatically, then `python3 scripts/workflow.py validate`.
4. **On `changes_requested` or `blocked`**: finish all validation and judgment first, then STOP before any doc consolidation; return numbered findings and proposed fix slices.

## Output

- Write `result.md` (free-form) in this slice's folder; append review notes to `phase.md`.
- Report `explain: not written — run /explain for this phase` (fixed pointer — you write no explainer).
- Never commit, never run git write commands, never transition slice/phase status (the orchestrator records the verdict via `review-phase`).

Return a structured verdict as your final message, exactly this shape:
review_verdict: pass | changes_requested | blocked
findings: <numbered list, or "none">
proposed_fix_slices: <list, or "none">
doc_versions: <created versions, or "none">
explain: not written — run /explain for this phase
summary: <2-4 sentences>
