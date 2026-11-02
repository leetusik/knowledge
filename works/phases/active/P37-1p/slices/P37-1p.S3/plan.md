# P37-1p.S3: delete the graph stylesheets, keeping the public shell's grid rule

## Goal

Delete `web/src/app/(app)/graph/graph-tokens.css`, `graph.css` and `graph-r5.css`. Move the one rule non-graph pages need to `kb-console-r4.css`, verbatim:

```css
.kb-app--public .kb-app-layout { grid-template-columns: minmax(0, 1fr); }
```

Today it sits at `graph-r5.css:169`. It gives every signed-out public page its one-column grid; without it an empty 15rem rail track reappears above 64rem.

The full block is `phase-section P37-1p "P37-1p.S3" --topic breakdown`. Read it first; this plan adds only what follows.

The operator said "just continue w/o my involve. skip everything not necessary". So nothing in this slice may need the operator, and checks stay to what proves the change.

## Steps

1. **Probe before editing.** Use the browser leg below on the current tree and record `gridTemplateColumns` for `.kb-app-layout` on:
   - a public document page;
   - the signed-out `/@p28s2` library.
2. **Search for every other use.** Grep `web/src` for every selector and custom property defined in the three graph sheets. The DECOMP found only the one shared rule, and everything else is `.kb-graph`-scoped or a `--kb-graph-*` token. Confirm that at the cut: anything else used outside the graph also moves, verbatim, and goes in `result.md`.
3. **Move the shared rule** beside `.kb-app--public .kb-app-main` in `web/src/app/kb-console-r4.css` (near line 140), with a one-line comment saying where it came from.
   - Re-check its specificity. At 0,2,0 it must still beat `.kb-app-layout`'s grid in `kb-console.css` and the `kb-console-responsive.css` media rules wherever it now sits.
4. **Delete the three sheets.** Then:
   - `globals.css`: remove their three `@import`s and the P28.S6 comment block.
   - `kb-record-fixes.css`: remove the `.kb-graph-dock .kb-graph-switch` rules (about lines 82–167).
5. **Reword comments only where they now point at deleted files:** `kb-docview.css` (its "beside/after `graph-r5.css`" cascade notes), `app-frame.css`, `public-shell.tsx` and the `globals.css` data-viz ink comment. Keep the ink tokens: `--kb-ink-bronze-dark` is live in `marketing.css`.

## Verification

1. **Scoped checks:**
   - `pnpm --dir web typecheck` (0 errors);
   - `pnpm --dir web lint`;
   - `grep -rn "graph-r5\|graph-tokens\|graph\.css\|kb-graph" web/src` returns no import and no rule. A history comment may stay.
2. **Browser,** Claude in Chrome: `list_connected_browsers`, then `select_browser` on exactly deviceId `c14e5b18-f250-45f1-b92e-4a08a31197b5`, before any other browser tool. Open your own tab and drive only it.
   - **Signed out:** that profile is not signed in to `http://127.0.0.1:3030`, so public pages render `PublicShell` (`.kb-app--public`). Confirm the class is present before trusting a reading.
   - **The window:** it runs maximized at about 1728×963, and `resize_window` does not change it. That width is above the 64rem breakpoint where the rule matters, so one width is enough. Skip the 1024 probe.
   - **After the change:** re-probe both pages. `.kb-app-layout` must compute to one track, matching the before reading, with no empty rail column.
   - **Then:** check that the landing `/` and the login page still render with no unstyled or broken layout. A member page cannot be checked signed out; skip it.
   - Name the instrument in `result.md`.
3. **Deferred: whole-tree:** `pnpm --dir web build` and the full `pnpm --dir web test`. The review runs them.
4. **Workflow state:** `python3 scripts/workflow.py validate` passes.

## Wave

- **Your set:**
  - `web/src/app/(app)/graph/graph-tokens.css`, `graph.css` and `graph-r5.css` (deleted)
  - `web/src/app/globals.css`, `kb-record-fixes.css`, `kb-console-r4.css` and `kb-docview.css`
  - `web/src/components/app-shell/app-frame.css`
  - `web/src/components/public-shell.tsx`
  - `web/src/app/(app)/graph/page.tsx` is S2's committed redirect. Leave it; the folder keeps it.
- **Running beside you: P37-1p.S4** (the graph API). Its set is server, tests, plugin and scripts only:
  - `server/graph_api.py` and `server/main.py`
  - `tests/test_graph_api.py` and `tests/test_public_read.py`
  - each of those under `plugin/templates/kb/`
  - `plugin/templates/manifest.json`
  - `plugin/.claude-plugin/plugin.json`
  - `scripts/onboarding_smoke.py`
  - It touches nothing in `web/`.
- **Waiting commits:** none.
- **Join-rebuilt artifact:** none.
- **Your notebook:** write no `phase.md`. Return your entries in the verdict's `notebook` field:
  - **Now;**
  - **Notes** for REVIEW;
  - **Doc impact:** the public grid rule moved to `kb-console-r4.css`; the graph CSS is gone.
- **Engine commands:** run none that write.

## Dispatch

route=high
reason=risk high (not low)
subagent_type=slice-executor
model=opus
pass_model=yes
effort=xhigh
pass_effort=yes
attribution=Claude Opus 5.5
explore_model=haiku
explore_effort=xhigh
