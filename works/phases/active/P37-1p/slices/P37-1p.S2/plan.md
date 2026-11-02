# P37-1p.S2: the member graph page, nav, dashboard line and web graph client

## Goal

Remove the member graph page and everything only it used. The member `/graph` redirects to `/library`.

The dashboard's Public URL panel shows the org's library URL `/@{slug}` where the graph line was. That is the operator's OQ1 answer ("idk whatever", taken as recommended). See `phase-section P37-1p Decisions`, the "Operator answers (2026-11-02)" line.

The full block is `phase-section P37-1p "P37-1p.S2" --topic breakdown`. Read it first: it lists every deletion, and this plan only adds to it.

## Steps

1. **The `/graph` redirect.** Make `web/src/app/(app)/graph/page.tsx` redirect-only: `redirect("/library")`, with no fetch. Prefer the page file over `next.config.ts`, so the redirect stays inside the `(app)` group's own auth behaviour and is consistent with S1's page-based redirects.
   - Check that a signed-out `/graph` still behaves like any other `(app)` route: the auth guard's bounce, with `next` handled the way `lib/next-path.ts` handles it.
   - Record the choice in `result.md`.
2. **Delete** `graph-canvas.tsx`, `loading.tsx`, `content/graph.ts` and its export in `content/index.ts` (`GRAPH`, `GraphCopy`). Also delete `getGraph` in `lib/knowledge/app.ts` and the `KbGraph*` types in `lib/knowledge/types.ts`.
   - Keep `web/src/app/(app)/graph/graph-tokens.css`, `graph.css` and `graph-r5.css`: they are S3's.
   - `globals.css` still imports them, and that file is S3's too. Check the build still resolves those imports: the CSS files must stay where they are.
3. **The nav.** Remove the Graph item from `content/app.ts`'s nav list. Reword the comment in `rail-nav.tsx`.
4. **The dashboard (OQ1).** Remove the "Public graph" URL line: `publicGraphPath` and `DASHBOARD.orgSlug.graphUrlLabel`.
   - In its place, show the org's library URL `/@{slug}` once a slug is claimed, with the same row markup, the same copy button and the same eyebrow pattern.
   - The label becomes `"Public library"`, the one new string. Compose the path with the existing helper if one exists (`orgSegment` in `lib/reader-href.ts`, or how the library links elsewhere), else `` `/@${orgSlug}` `` exactly as the graph line composed its path.
   - Keep the existing `CopyLinkButton` and the panel's layout. Restyle nothing.
5. **Copy and comments.** Drop the graph clauses in `content/project.ts` (the visibility copy) and `content/documents.ts` (the delete-confirm copy). Delete the clause only; never rewrite the sentence beyond the cut.
   - Reword the graph comments in `copy-link-button.tsx`, `share.ts`, `states.ts` and `reader-href.ts`.
6. **Leftovers.** Search the set for any other import of the deleted symbols. Any file outside the set that still imports them is a `needs_operator` naming the file, per the wave rules below.

## Verification

1. **Scoped checks:**
   - `pnpm --dir web exec eslint` on your set's files.
   - Vitest on the test files that cover your set, if any exist.
   - `pnpm --dir web typecheck`, read only for errors in your set's files. An error in another file is S5's work in flight: report it, never fix it.
2. **Deferred: whole-tree:** `pnpm --dir web build`, the full `pnpm --dir web test`, and the production-build browser check. List them as such in `validation`.
3. **Live HTTP on dev** (`:3030` web, `:8766` API, both current; never restart either). `curl -sI /graph` with no cookie gives the `(app)` auth bounce. With a session, it gives a redirect to `/library`. Get a session cookie the way earlier slices did, or skip the signed-in curl if the browser leg covers it.
4. **Real browser.** Claude in Chrome in the operator's "sugang" profile.
   - **Its deviceId is not known yet.** The orchestrator will send it to you by message as soon as the operator connects that profile. Do this leg last.
   - At it, call `list_connected_browsers`, then `select_browser` with exactly that deviceId, never a display name or label, before any other browser tool.
   - **With no deviceId by then,** finish everything else, write `result.md`, and return `needs_operator`. Set `operator_need` to "browser leg not run: the sugang profile's deviceId". Never pick a browser yourself.
   - **Tabs:** open your own tab (`tabs_create_mcp`) and drive only that tab. S5 runs beside you in the same profile; never navigate, close or read a tab you did not open.
   - **Signed-in checks, desktop 1440×900** (use `resize_window`):
     - the rail has no Graph item;
     - `/graph` lands on `/library`;
     - the dashboard's Public URL panel shows `/@{slug}` with a working copy button for an org with a slug. Use one of the local orgs `p28s2`, `p28s5` or `p28s6` if you are a member, or note which org you used.
   - Repeat the rail and dashboard checks at 390×844.
   - **Signing in:** if the profile is not signed in to `http://127.0.0.1:3030`, sign in only with test credentials from the project's own seed, fixture or example-config files for this local app. Never type a real password, and never repeat credentials in `result.md`. If no such credentials exist, skip the signed-in leg and return `needs_operator` for it. The BFF allows about 5 sign-ins per 15 minutes, so sign in once.
   - Name the instrument in `result.md`, and never claim a check you did not make.
5. **Workflow state:** `python3 scripts/workflow.py validate` passes.

## Wave

- **Your set:**
  - `web/src/app/(app)/graph/page.tsx`, `graph-canvas.tsx` and `loading.tsx` (never the three `.css` files there)
  - `web/next.config.ts` (only if the redirect must live there; the plan prefers the page)
  - `web/src/content/graph.ts`, `web/src/content/index.ts` and `web/src/content/app.ts`
  - `web/src/components/app-shell/rail-nav.tsx`
  - `web/src/app/(app)/dashboard/page.tsx` and `web/src/content/dashboard.ts`
  - `web/src/components/copy-link-button.tsx`
  - `web/src/content/share.ts`, `states.ts`, `project.ts` and `documents.ts`
  - `web/src/lib/knowledge/app.ts` and `web/src/lib/knowledge/types.ts`
  - `web/src/lib/reader-href.ts`
  - any test file that covers only these files
- **Running beside you: P37-1p.S5** (the landing and the README). Its set:
  - `web/src/app/(marketing)/page.tsx` and `layout.tsx`
  - `web/src/components/marketing/feature-graph.tsx`, `graph-motif.tsx`, `primitives.tsx` and `marketing.css`
  - `web/src/content/marketing/content.ts`, `graph-motif.ts`, `links.ts` and `index.ts`
  - `README.md` and `.github/knowledge-graph.png`
  - It shares the Chrome profile with you, so keep to your own tab.
- **Waiting commits:** none.
- **Join-rebuilt artifact:** none.
- **Your notebook:** write no `phase.md`. Return your entries in the verdict's `notebook` field, by section:
  - **Now:** what landed.
  - **Notes for later slices:** for S3, the graph CSS is now orphaned except `globals.css`'s imports. For S4, nothing in `web/` calls `/app/graph`.
  - **Doc impact:** the rail drops Graph; the dashboard shows the library URL.
  - **Operator Questions:** only if one arises.
- **Engine commands:** run none that write; `validate` and `phase-section` reads are fine.

## Dispatch

route=mid
reason=kind implementation rated low
subagent_type=slice-executor
model=opus
pass_model=yes
effort=medium
pass_effort=yes
attribution=Claude Opus 5.5
explore_model=haiku
explore_effort=xhigh
