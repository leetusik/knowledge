# P37-1p.S3 result: graph stylesheets out, public grid rule kept

## Verdict

- **status:** done
- **route:** high
- **model:** opus
- **effort:** xhigh
- **summary:** Deleted the three graph stylesheets (`graph-tokens.css`, `graph.css`, `graph-r5.css`) and their `globals.css` imports, plus `kb-record-fixes.css`'s dock-switch correction. The public shell's one-column grid rule moved verbatim to `kb-console-r4.css`. Claude in Chrome readings, signed out at a 1440px shell, are the same before and after: `.kb-app-layout` is one track (`1440px`) on a public document version and on `/@p28s2`.
- **files_changed:**
  - deleted: `web/src/app/(app)/graph/graph-tokens.css`, `web/src/app/(app)/graph/graph.css`, `web/src/app/(app)/graph/graph-r5.css`
  - edited: `web/src/app/globals.css`, `web/src/app/kb-console-r4.css`, `web/src/app/kb-record-fixes.css`, `web/src/app/kb-docview.css`, `web/src/components/app-shell/app-frame.css`, `web/src/components/public-shell.tsx`
  - created: `works/phases/active/P37-1p/slices/P37-1p.S3/result.md`
- **validation:**
  - `pnpm --dir web typecheck`: pass (exit 0, 0 errors)
  - `pnpm --dir web lint`: pass (exit 0)
  - `grep -rn "graph-r5\|graph-tokens\|graph\.css\|kb-graph" web/src`: pass. No import and no rule; 5 history comments remain.
  - Browser (Claude in Chrome, deviceId `c14e5b18-…`): pass. The before and after readings match, the control proves the probe is sensitive, and the landing and login render styled.
  - `python3 scripts/workflow.py validate`: pass ("Workflow validation passed"; existing warnings only)
  - deferred, whole-tree: `pnpm --dir web build` and the full `pnpm --dir web test` (the review runs them)
- **deviations:**
  1. **Viewport.** The window ran at 500×757, not the expected ~1728×963. `resize_window` reported success at 1440×900 and 1500×950, but `innerWidth` stayed 500. To get the ≥64rem shell, I set an inline `width: 1440px` on `.kb-app`, the `kbapp` container. Round 03's rail-track collapse is a container query on `kbapp`, not viewport media, so this exercises exactly the branch where the moved rule matters.
  2. **Public document page.** The canonical `/@p28s2/research/<slug>` (and `/documents/21`) renders the reader (`.rd-root`), not `PublicShell`, so it has no `.kb-app-layout`. I used `/documents/67/versions/2` instead: a past version of public doc 67 in `p28s5`, which renders inside `PublicShell`.
- **doc_impact:** none written to `phase.md` (wave); see `notebook`.
- **notebook:**
  - **Now (replace):** S3 landed in the tree, not yet committed. The three graph sheets are gone, `globals.css` no longer imports them, and `kb-record-fixes.css`'s dock-switch block is gone. The public shell's one-column grid rule (`.kb-app--public .kb-app-layout`) now sits in `kb-console-r4.css` beside `.kb-app--public .kb-app-main`. Signed-out Claude in Chrome readings match before and after. S4 (graph API) runs beside it; REVIEW comes next.
  - **Notes for later slices (append):** **(from P37-1p.S3, for P37-1p.REVIEW):** two whole-tree checks are deferred from S3: `pnpm --dir web build` and the full `pnpm --dir web test`. For the browser: the agent's Claude in Chrome tab ran at 500×757 and `resize_window` had no effect. S3 forced the ≥64rem shell with an inline `width:1440px` on `.kb-app`, because the grid collapse is an `@container kbapp` rule. Canonical public doc URLs render the reader, not `PublicShell`. `PublicShell` doc surfaces are `/documents/{id}/versions/{v}` (e.g. `/documents/67/versions/2`, p28s5) and the doc not-founds.
  - **Notes for later slices (remove, consumed by S3):** the entry `(from P37-1p.DECOMP, for P37-1p.S3)` about the anonymous view and probing. The entry `(from P37-1p.S5, for P37-1p.S3)` about `globals.css` holding no motif CSS. The entry `(from P37-1p.S2, for P37-1p.S3)` about the graph CSS files used only by `globals.css`.
  - **Doc impact (append):** frontend: the web graph CSS is deleted, and `globals.css` no longer imports it (~29 KB less CSS on every page). That covers `graph-tokens.css`, `graph.css`, `graph-r5.css`, and `kb-record-fixes.css`'s `.kb-graph-dock .kb-graph-switch` correction. The public shell's one-column grid rule `.kb-app--public .kb-app-layout { grid-template-columns: minmax(0, 1fr); }` now lives in `kb-console-r4.css`. See § The authenticated web app (P12) and § The public route group (P19, `PublicShell`).
  - **Decisions:** none new. This implements the existing **CSS (DECOMP)** line exactly.
  - **Operator Questions:** none.

## What was done

1. **Probe before editing.** Readings are in the table below.
2. **Search for every other use.** I extracted every selector, custom property and keyframe from the three sheets and grepped `web/src` and `web/` (excluding `node_modules`, `.next` and `design`) for them.
   - Outside the sheets, only `kb-record-fixes.css`'s `.kb-graph-dock .kb-graph-switch` block (removed per plan) and comments use them.
   - Every non-`.kb-graph` construct in the sheets is graph-only:
     - the `:root` and `[data-md-color-scheme]` blocks declare only `--kb-graph-*` tokens;
     - `.kb-app[data-kb-scheme="auto"]` under `prefers-color-scheme: dark` declares only `--kb-graph-*`, plus `.kb-graph a.kb-appbtn--*`;
     - the `@container kbapp`/`kbmain` rules target `.kb-graph`/`.kb-graph-dock`;
     - the keyframes are `kb-graph-*`.
   - The one shared rule is `graph-r5.css:169`, as the DECOMP found. Nothing else moved.
3. **Moved the shared rule** to `kb-console-r4.css:142`, right after `.kb-app--public .kb-app-main` and before `.kb-topbar__signin`, with a one-line origin comment.
   - It is byte-identical to the original line, checked with `git show HEAD:…graph-r5.css | sed -n 169p` against the new line.
   - **Specificity check.** The rule is 0,2,0. It beats `kb-console.css:41` `.kb-app-layout` (0,1,0, the 15rem rail track) and `kb-console-responsive.css`'s `@container kbapp` rules (0,1,0, and they set the same value anyway).
   - The other rules that reach `.kb-app-layout` all set the same value: `app-frame.css` `.kb-app-layout[data-rail="collapsed"]` (0,2,0; `PublicShell` renders no `data-rail`) and `kb-docview.css:257` `.kb-app[data-kb-view="full"] .kb-app-layout` (0,3,0).
   - `kb-print.css`'s print blocks set `display: block`.
   - Nothing imported between the old and new positions sets this property at ≥0,2,0, so moving the rule earlier in the cascade changes nothing.
   - The browser confirmed the served stylesheet carries the rule at the new position: the `prev` selector is `.kb-app--public .kb-app-main` and the `next` is `.kb-topbar__signin`.
4. **Deleted the three sheets.** The `(app)/graph/` folder keeps S2's `page.tsx` redirect.
   - `globals.css`: removed the three `@import`s and the P28.S6 comment block.
   - `kb-record-fixes.css`: removed lines 82–167, the whole P28.F1 dock-switch correction, through the end of the file. The file now ends at the `@media print` block.
5. **Reworded comments** that pointed at deleted files:
   - `kb-docview.css`: the "beside graph-r5.css" note, the never-edited list and the load-order line.
   - `globals.css`: the docview cascade note and the data-viz ink comment. The inks stay, and the comment now notes that `--kb-ink-bronze-dark` is read by `marketing.css` (lines 208, 288 and 374).
   - `app-frame.css`: the `--kb-graph-*` token-layer mention.
   - `public-shell.tsx`: the `graph-r5.css` rule pointer, the "doc + graph pages" line, and the two "graph engine reads" remarks. `graph-canvas.tsx` was deleted by S2.
   - History references to "round 05" without a file pointer, such as `kb-docview.css:37` and `:212`, were left as they are.

## Browser leg

**Instrument:** Claude in Chrome.
- I called `list_connected_browsers` first: one entry, deviceId `c14e5b18-f250-45f1-b92e-4a08a31197b5`, named "Browser 1".
- I then ran `select_browser` on that exact deviceId, before any other browser tool.
- I used my own new tab (1503946383), drove only it, and closed it at the end.
- Runtime: dev at `http://127.0.0.1:3030`, signed out. `.kb-app.kb-app--public` was present on both probe pages before any reading was trusted.
- The window was 500×757 at DPR 1 (screen 1920×1050), and `resize_window` had no effect. Deviation 1 above covers that.

**Probe:** load the page and wait 1–1.5s. Then:
1. Read `getComputedStyle(.kb-app-layout).gridTemplateColumns` natively.
2. Set `.kb-app` to `width:1440px` and read it again.
3. **Control:** remove `.kb-app--public` at 1440 and read it again.
4. Restore the class and read it again.

`.kb-app-layout`'s only child is `MAIN.kb-app-main`, with no `.kb-rail` and no `data-rail`.

| page | when | native (500) | `.kb-app` at 1440 | control: no `.kb-app--public`, 1440 | restored |
|---|---|---|---|---|---|
| `/documents/67/versions/2` (public doc, past version) | before | `500px` | `1440px` (main 1408, capped at 88rem) | `240px 1200px` (main squeezed into the 240px rail track) | `1440px` |
| `/documents/67/versions/2` | after | `500px` | `1440px` (main 1408) | `240px 1200px` | `1440px` |
| `/@p28s2` (signed-out library) | before | `500px` | `1440px` (main 1408) | `240px 1200px` | `1440px` |
| `/@p28s2` | after | `500px` | `1440px` (main 1408) | `240px 1200px` | `1440px` |

- **After equals before.** At a ≥64rem shell there is one track and no empty rail column.
- **The control is sensitive.** Without the rule, the empty 15rem track comes back and `<main>` falls into it. The rule is what prevents that.
- **The graph CSS is no longer served.** After the change, no loaded stylesheet contains a `kb-graph` rule.

**Landing and login (after):**
- `/`: styled, with a Fraunces 68px h1 ("Knowledge that outlives the conversation."), 9 sections, no horizontal overflow and no `[class*=graph]` elements. Screenshot viewed.
- `/login`: the auth gate card renders styled, with 2 inputs and no horizontal overflow. Screenshot viewed.
- Skipped per plan: the member page (it cannot be checked signed out) and the 1024 probe.

## Notes

- **`kb-docview.css` header.** It says round 06 never edits `console-r4.css`. That stays true of round 06. This slice adds one moved rule to `kb-console-r4.css`, as the DECOMP decided, and the rule's comment states its origin.
- **No other web sheet is affected.** Nothing outside `web/src` references the deleted sheets (excluding `node_modules`, `.next` and the signed `web/design/*` records, which were not touched). `docs/current/frontend.md`'s `tokens/graph.css` mention is the mkdocs graph, which stays.
