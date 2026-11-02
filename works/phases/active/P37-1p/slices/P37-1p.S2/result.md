# P37-1p.S2 result

- status: needs_operator
- route: mid
- model: opus
- effort: medium
- summary: Retired the member graph. `/graph` is now a redirect-only page to `/library`, behind the `(app)` auth bounce. The canvas, the loading state, the `GRAPH` copy, `getGraph` and the `KbGraph*` types are deleted. The rail drops its Graph item. The dashboard's Public URL panel shows the org's library URL `/@{slug}`, labelled "Public library", where the graph line was. The code and HTTP checks pass. The real-browser leg was not run, because no deviceId for the "sugang" profile arrived.
- files_changed: web/src/app/(app)/graph/page.tsx; web/src/app/(app)/graph/graph-canvas.tsx (deleted); web/src/app/(app)/graph/loading.tsx (deleted); web/src/content/graph.ts (deleted); web/src/content/index.ts; web/src/content/app.ts; web/src/components/app-shell/rail-nav.tsx; web/src/app/(app)/dashboard/page.tsx; web/src/content/dashboard.ts; web/src/components/copy-link-button.tsx; web/src/content/share.ts; web/src/content/states.ts; web/src/content/project.ts; web/src/content/documents.ts; web/src/lib/knowledge/app.ts; web/src/lib/knowledge/types.ts; web/src/lib/reader-href.ts
- validation:
  - eslint on the set's 14 files: pass
  - `pnpm --dir web typecheck`: pass, 0 errors in the whole tree, S5's in-flight edits included
  - vitest `tests/reader-href.test.ts`, `tests/next-path.test.ts`, `tests/session-guards.test.ts`: pass (61 tests)
  - live dev `curl -sI :3030/graph` without a cookie: 307 to `/login?next=%2Fgraph`, the same as `/documents`. Pass
  - signed-in curl: skipped, left to the browser leg
  - `python3 scripts/workflow.py validate`: pass, with the usual stale-doc warnings only
  - deferred (whole tree): `pnpm --dir web build` (confirms `globals.css` still resolves the three graph CSS imports, which were left in place), the full `pnpm --dir web test`, and the production-build browser check
  - not run: the real-browser leg (Claude in Chrome, "sugang" profile), because no deviceId was received
- deviations: The plan names only certain comments to reword. I also reworded the graph mentions in the comments of `types.ts`, `app.ts`, `content/app.ts` and the dashboard. These are comment-only edits inside the set.
- doc_impact: in `notebook` below
- notebook:
  - Now: S2 landed. The member `/graph` redirects to `/library` behind the auth bounce. The rail has no Graph item. The dashboard's Public URL panel shows `/@{slug}` ("Public library"). `getGraph`, the `KbGraph*` types and the `GRAPH` copy are gone. Still open: S2's browser leg (needs the sugang deviceId), and the whole-tree build and tests, which the review runs.
  - Notes for later slices: **(from P37-1p.S2, for P37-1p.S3)** the three graph CSS files in `web/src/app/(app)/graph/` are now orphaned, apart from `globals.css`'s imports. The folder's `page.tsx` is the redirect and stays. **(from P37-1p.S2, for P37-1p.S4)** nothing in `web/` calls `/app/graph` any more (`getGraph` is deleted).
  - Doc impact: product/architecture: the member rail drops its Graph item and `/graph` redirects to `/library`. The dashboard's Public URL panel shows the org's library URL `/@{slug}` ("Public library") instead of the public graph URL. The web client no longer has `getGraph` or the `KbGraph*` types.
  - Operator Questions: none.
- operator_need: browser leg not run: the sugang profile's deviceId

## Detail

**The redirect lives in the page, not `next.config.ts`.** `(app)/graph/page.tsx` calls `requireIdentity()` and then `redirect("/library")`, with no fetch beyond the session check that `requireIdentity`'s `cache()` shares with the layout. A signed-out request gets the same `loginRedirectTarget()` bounce as every other `(app)` route: `/login?next=%2Fgraph`, checked live. This matches S1's page-based redirects.

**The dashboard.** The path is composed with the existing `orgSegment` helper from `lib/reader-href.ts`, and only when a slug is claimed. This gives `/@{slug}`. The row markup (`kb-urlline`), the `CopyLinkButton` and the empty-state lead are unchanged. The key `graphUrlLabel` became `libraryUrlLabel: "Public library"`, the one new string.

**Copy cuts.**
- `project.ts`: "documents and graph." became "documents." in both visibility hints.
- `documents.ts`: the delete JSDoc lost "and graph edges". The verb became "breaks" to agree with the shorter subject.

**Leftovers.** A grep of `web/src` finds no reference to `GRAPH`, `GraphCopy`, `getGraph`, `KbGraph*`, `graphUrlLabel` or `/app/graph`, except S5's marketing files and the CSS header comment. No file outside the set imports a deleted symbol.

**Browser leg.** Not run. The instrument would be Claude in Chrome. No deviceId for the "sugang" profile arrived, so no browser tool was called and no browser was selected. These checks are still owed, at 1440x900 and 390x844:
- the rail has no Graph item;
- `/graph` lands on `/library`;
- the dashboard shows `/@{slug}` with a working copy button.
