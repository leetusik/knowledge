# P6.F2 — result

## What changed

One hunk in `docs/stylesheets/extra.css`, exactly as planned. Replaced line 794:

```css
.kb-graph [hidden] { display: none; }
```

with:

```css
/* [hidden] must outrank the overlays' own display rules (.kb-graph .kb-graph-empty
   is (0,2,0) grid, zoom flex, tooltip inline-flex — all beat .kb-graph [hidden] at
   (0,1,1)), or JS can never hide them. */
.kb-graph [hidden],
.kb-graph .kb-graph-empty[hidden],
.kb-graph .kb-graph-zoom[hidden],
.kb-graph .kb-graph-tooltip[hidden],
.kb-graph .kb-graph-legend[hidden],
.kb-graph .kb-graph-panel[hidden] { display: none; }
```

No JS touched, no other CSS section touched, no `graph.md`, no guard, no `mkdocs.yml`.

## Verification (all per plan.md)

1. **`git diff --stat` / `git diff docs/stylesheets/extra.css`** — the CSS change is
   exactly one file, one hunk (+8/-1 lines). (Other files showing as modified in the
   working tree — `works/backlog.md`, `works/deferred.md`, `works/index.json`,
   `works/state.json`, `works/phases/active/P6/slices/P6.REVIEW/*` — were already modified
   before this slice started, per the orchestrator's session state; not touched by this
   slice.) PASS.
2. **Pinned venv build** — created a fresh venv at
   `/private/tmp/.../scratchpad/p6f2-venv`, `pip install mkdocs-material==9.7.6`
   (confirmed version), `mkdocs build` → succeeded ("Documentation built in 0.36
   seconds", only the routine MkDocs-2.0 deprecation banner, no errors). Then
   `grep -c 'kb-graph-empty\[hidden\]' site/stylesheets/extra.css` → **1**. PASS.
3. **`python3 scripts/site_smoke.py`** → exit 1, exactly **1** violation reported:
   `local path leak ('/Users/') in 4 built page(s): current/frontend/index.html,
   current/qa/index.html, current/operations/index.html, current/data/index.html` — this
   is the KNOWN pre-existing `/Users/` prose leak recorded in `phase.md` (P6.F1 section,
   traced to commit `43f4b79`, out of scope here, owned by the P6 re-review). No other
   violation appeared; every graph-related assertion (source wiring, `check_graph`,
   `check_built` graph/landing-card assertions) PASSED. Matches plan expectation exactly.
4. **Optional curl against the already-running compose `kb` server** (confirmed running
   via `docker compose ps kb`, up 7 minutes before this slice touched it — not started or
   stopped by this slice): `curl -s http://localhost:8765/knowledge/stylesheets/extra.css
   | grep -c 'kb-graph-empty\[hidden\]'` → **1** (live-reload rebuilt with the fix). PASS.
5. **`python3 scripts/workflow.py validate`** → "Workflow validation passed." (not
   plan-required but run for good measure; state integrity intact.)

## Browser confirmation

No browser available in this harness. Final visual confirmation — the loading overlay
("Laying out the map… 지도를 배치하는 중 — settles in ~0.6s.") actually disappears after
settle, and canvas hover/drag/wheel respond — is the operator's refresh of `/graph/`
(local `http://localhost:8765/knowledge/graph/` or the deployed site).

## Deviations from plan.md

None. The CSS at line 794 matched the plan's stated before-state exactly; the fix was
applied verbatim; every verification step matched the plan's expected outcome (including
the expected single KNOWN pre-existing smoke violation).

## Doc impact

Recorded in `phase.md` under a new "P6.F2" section, plus one Doc-impact line (see below).
