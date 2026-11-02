# P37-1p breakdown: Drop the knowledge graph

## Passes

- **DECOMP (2026-11-02):** five middle slices, S1 to S5, cut from a map of every hosted graph surface. Rounds: `DECOMP -> S1 + S5 -> S2 -> S3 + S4 -> REVIEW`. No design slice and no DECOMP2.

**Re-cut from the plan's shape, and why.** The plan suggested four slices: web app, public pages, API and landing. The map changed it in two places.
1. **The graph stylesheets get their own slice (S3, high).** `graph-r5.css:169` holds `.kb-app--public .kb-app-layout { grid-template-columns: minmax(0, 1fr); }`, which every `PublicShell` page relies on: the signed-out library, public documents, version pages and the public not-founds. Deleting the sheet without moving that rule brings back an empty 15rem rail track on every public page above 64rem. Every other rule in the three sheets is scoped to `.kb-graph`, and every token they define is a `--kb-graph-*` token. Isolating the move keeps the member-page slice (S2) on the mid row.
2. **The web graph client (`getGraph`, the `KbGraph*` types) goes with its last caller, in S2, not in the API slice.** That keeps S4 server-side only: Python, the plugin template and the smoke script, with no web gate. Its set then stays disjoint from S3's, so the two can run together.

**Order is forced by imports.** Both public graph pages import `GraphCanvas` from `(app)/graph/graph-canvas.tsx`, `GRAPH` from `content/graph.ts` and `getGraph`. So S1, which turns the public pages into redirects, lands before S2, which deletes those files. S3 follows S2, so a live page never loses its CSS in an intermediate commit. S4 follows S1 and S2, so nothing calls `/app/graph` when it goes. S5 shares nothing with the others.

## Estimate

Time comes from `dispatch-summary`'s means block (metered span-minutes; never a $ or token figure):
- S1, S2, S4, S5: implementation on the mid row, 22.1 span-min each (mid row: 15.2 min per span), so about 88 min.
- S3: implementation on the high row. Between 22.1 span-min (the kind mean) and 71.3 (the high row's per-span mean, which leans on decomposition and review spans).
- REVIEW: 218.0 span-min, the main thread included.
- This DECOMP: 10.1.
- **Total: about 330 to 380 span-min (5.5 to 6.3 h).** A wave of S1 + S5 and one of S3 + S4 shortens the wall clock, not the span time.

## Join-rebuilt artifact

None. Nothing committed is regenerated from several slices' sources: `web/.next/` and `*.tsbuildinfo` are git-ignored, and `site/` is untouched.

**Shared runtime resources in a wave:**
- `web/.next/` is one build directory, so in a wave `pnpm --dir web build` and the production-build browser check are `deferred: whole-tree`, and the review runs them.
- The operator's dev server on `:3030` and the API on `:8766` are shared and read-only. No slice restarts them.

## Gates (every web slice)

- **Web gates:** `pnpm --dir web typecheck`, `lint`, `test` and `build`.
- **Python gates:** `uv run pytest -q`, `python3 scripts/plugin_parity.py` and `python3 scripts/skills_parity.py`.
- **Real-browser checks** follow `## Operator Runtime` (see OQ2 on the instrument). An unavailable instrument means `needs_operator`.
- **Never edit the signed design records:** `web/design/rounds/*`, `web/design/canvas/*` and `docs/reference/design/*`. Their graph mentions are history.

## Never touch

- the native renderer's `graph` diagram kind (`web/src/lib/native/diagram-*`, `server/native/schema.py::_graph`, the `diagrams-graph` fixtures);
- `paragraph`, `typography` and OpenGraph matches;
- the mkdocs graph on both sides (`scripts/graph_hook.py`, `docs/javascripts/graph.js`, `docs/graph.md`, the `mkdocs.yml` hook, `scripts/site_smoke.py`'s graph checks);
- `server/accounts/slugs.py`'s reserved `graph` slug;
- the path-normalization test `web/tests/next-path.test.ts` (`/graph` there is a sample path);
- `plugin/README.md`, which describes the template's mkdocs graph, and that graph stays.

## P37-1p.S1

- **Goal:** the two public graph routes become redirects, and a 404 stays a branded 404.
  - **`/@{org}/graph`:** keep the `@` guard, so `/x/graph` stays not-found with no upstream call, then redirect to `/{org}` (the org's library). No fetch is needed.
  - **`/graph/{uuid}`:** a malformed UUID gives `notFound()` before any call. Otherwise resolve the org through the existing resolver, `getOrgLibrary(token, uuid, "public")` (`GET /app/orgs/{org}/library`; `books_api._resolve_org` tries the UUID first). Then redirect, temporarily (307), to `/@{orgSegment(org)}`: the slug, or the tenant UUID for a slug-less org. `/@{tenant-uuid}` is a working library URL under the OQ26 rule. The resolver's 404 becomes `notFound()`, the same answer the library itself gives, so no existence leaks.
  - **The two not-founds:** they import `GRAPH`, which S2 deletes. Re-point them to an existing not-found (`LibraryNotFound` from `components/library/library-states`). Never write new copy. Deleting them would drop to Next's unbranded default, because the app has no root `not-found.tsx`.
  - **Comments:** reword the graph-route comments in the set.
  - **Verification:** with `curl -sI` on dev (`:3030`) and on the production build: each Location header, the 404s for a malformed UUID, a random UUID and a non-`@` org, and an anonymous request with no cookie.
- **Set:**
  - `web/src/app/(public)/[org]/graph/page.tsx`
  - `web/src/app/(public)/[org]/graph/not-found.tsx`
  - `web/src/app/(public)/graph/[org]/page.tsx`
  - `web/src/app/(public)/graph/[org]/not-found.tsx`
  - `web/src/app/robots.ts` (comment)
  - `web/src/app/(public)/[org]/(library)/layout.tsx` and `page.tsx` (comments)
  - `web/src/components/states/optional-shell.tsx` (comment)
  - `web/src/lib/auth-guards.ts` and `web/src/lib/next-path.ts` (comments)
- **Risk:** low. The redirect adds no gate: it reads through the library endpoint, which owns visibility. No auth code is edited.
- **spends money:** no
- **Depends on:** none

## P37-1p.S2

- **Goal:** remove the member graph page and everything that only it used.
  - **The `/graph` redirect:** `/graph` redirects to `/library`, the signed-in landing. Use a redirect-only `(app)/graph/page.tsx` or a `next.config.ts` `redirects()` entry, recorded in `result.md`.
  - **Deletions:** `graph-canvas.tsx`, `loading.tsx`, `content/graph.ts` and its `content/index.ts` export.
  - **Nav:** remove the rail's Graph item (`content/app.ts`; `rail-nav.tsx` carries only a comment).
  - **Dashboard:** remove the dashboard's "Public graph" URL line (`publicGraphPath`, `DASHBOARD.orgSlug.graphUrlLabel`, and the `CopyLinkButton` import if it is left unused). Delete only, as signed. OQ1 asks what goes there.
  - **The web graph client:** `getGraph` in `lib/knowledge/app.ts` and the `KbGraph*` types in `lib/knowledge/types.ts`.
  - **Copy:** drop the graph clauses in `content/project.ts` (the visibility copy) and `content/documents.ts` (the delete-confirm copy).
  - **Comments:** reword the graph comments in `copy-link-button.tsx`, `share.ts`, `states.ts` and `reader-href.ts`.
  - **CSS stays:** the three graph CSS files remain for S3.
  - **Verification:** web gates, and the `/graph` redirect live. The rail and the dashboard are seen in a real browser if the instrument is ready; otherwise the review's spot-check covers them.
- **Set:**
  - `web/src/app/(app)/graph/page.tsx`, `graph-canvas.tsx` and `loading.tsx`
  - `web/next.config.ts` (only if the redirect lives there)
  - `web/src/content/graph.ts`, `index.ts` and `app.ts`
  - `web/src/components/app-shell/rail-nav.tsx`
  - `web/src/app/(app)/dashboard/page.tsx` and `web/src/content/dashboard.ts`
  - `web/src/components/copy-link-button.tsx`
  - `web/src/content/share.ts`, `states.ts`, `project.ts` and `documents.ts`
  - `web/src/lib/knowledge/app.ts` and `types.ts`
  - `web/src/lib/reader-href.ts`
- **Risk:** low. Deletions and copy clauses, with no trigger.
- **spends money:** no
- **Depends on:** S1

## P37-1p.S3

- **Goal:** delete `graph-tokens.css`, `graph.css` and `graph-r5.css`, which empties the `(app)/graph/` folder.
  - **`globals.css`:** remove their three `@import`s and the P28.S6 comment block, and fix the `kb-docview.css` comment's "after `graph-r5.css`".
  - **`kb-record-fixes.css`:** remove the `.kb-graph-dock .kb-graph-switch` rules (lines 82–167).
  - **The one shared rule:** move `.kb-app--public .kb-app-layout { grid-template-columns: minmax(0, 1fr); }` verbatim, beside `.kb-app--public .kb-app-main` in `kb-console-r4.css:140`. It is specificity 0,2,0 and beats `.kb-app-layout`'s 0,1,0 grid at `kb-console.css:41` and the `kb-console-responsive.css` media rules, so its import position does not matter. Re-check that at the cut.
  - **Comments:** reword the graph mentions in `kb-docview.css`, `app-frame.css`, `public-shell.tsx`, and the `globals.css` data-viz ink comment ("(the graph motif)"). The ink tokens stay: `--kb-ink-bronze-dark` is live in `marketing.css`.
  - **Verification:** in a real browser, signed out, at desktop width (1440×900) and at 1024×768.
    - Check a public document and the signed-out `/@{org}` library: `.kb-app-layout` computes to one column, with no empty rail track.
    - Compare with the same probe before the change.
    - Check a member page, such as the dashboard.
    - Headless Chrome over CDP with a fresh profile gives a signed-out view.
- **Set:**
  - `web/src/app/(app)/graph/graph-tokens.css`, `graph.css` and `graph-r5.css`
  - `web/src/app/globals.css`
  - `web/src/app/kb-record-fixes.css`
  - `web/src/app/kb-console-r4.css`
  - `web/src/app/kb-docview.css`
  - `web/src/components/app-shell/app-frame.css`
  - `web/src/components/public-shell.tsx`
- **Risk:** high, for a wide blast radius. The moved rule is the public shell's grid, used by every `PublicShell` page.
- **spends money:** no
- **Depends on:** S2

## P37-1p.S4

- **Goal:** remove the graph API from both sides, per the parity decision signed at the gate.
  - **Delete:** `server/graph_api.py`, its import, router line and comment in `server/main.py`, and `tests/test_graph_api.py`, at the root and under `plugin/templates/kb/`. Drop both entries from `plugin/templates/manifest.json`'s `identical` list.
  - **`test_public_read.py`:** delete `test_public_graph_is_org_scoped` and the docstring's graph clause, on both sides.
  - **`db.py` (both sides):** remove the `projects` allowlist kwarg of `db.list_documents`, `db.count_documents` and `_filtered`. Only `graph_api` passes it; `list_loose_documents` has its own, which stays. If anything else turns out to pass it, keep it.
  - **Docstrings:** reword "the `/app/graph` rule" in `reader_api.py`, `books_api.py` and `reader_state.py` (both sides) so they name the rule without the dead endpoint.
  - **`scripts/onboarding_smoke.py`:** drop the `/app/graph` legs and their docstring lines. Reshape the `/graph/{tenant}` web-page leg to expect S1's redirect to `/@{…}`, or drop it.
  - **Plugin version:** bump `plugin/.claude-plugin/plugin.json` (0.9.0), per the release rule (operations *Plugin distribution*: any `plugin/**` change pairs with a version bump). Run `claude plugin validate` where the CLI is present.
  - **Verification:** `uv run pytest -q`, with the PASS count change recorded, plus `plugin_parity.py` and `skills_parity.py`.
- **Set:**
  - `server/graph_api.py`, `server/main.py`, `server/db.py`, `server/books_api.py`, `server/reader_api.py` and `server/reader_state.py`
  - `tests/test_graph_api.py` and `tests/test_public_read.py`
  - each of those eight under `plugin/templates/kb/`
  - `plugin/templates/manifest.json`
  - `plugin/.claude-plugin/plugin.json`
  - `scripts/onboarding_smoke.py`
- **Risk:** low. The deletion is of code, not data, and no schema changes. The `db.py` kwarg has default `None` and no caller passes it.
- **spends money:** no
- **Depends on:** S1 and S2

## P37-1p.S5

- **Goal:** remove the landing's graph band and every graph clause in the public copy. Delete only, and never write new filler copy or visuals.
  - **The band and motif:** `FeatureGraph` leaves `(marketing)/page.tsx`. Delete `feature-graph.tsx`, `graph-motif.tsx` and `content/marketing/graph-motif.ts`. Remove `FEATURE_GRAPH`, the `GRAPH_MOTIF`/`GraphMotif` exports, `MKT_SECTION_IDS.graph`, and the `.mkt-graph-*` motif block in `marketing.css`, which also defines the `--mkt-ink-*` tokens (lines ~242–333).
  - **Copy clauses:** in `content.ts`, the hero lede, the "What it is" card, the pricing lede and free line, and the two pricing rows. Also the metadata descriptions in `(marketing)/layout.tsx`.
  - **Comments:** the band-order comment in `page.tsx` and the `primitives.tsx` comment.
  - **README.md:** delete the hosted-graph clauses in the body (lines ~21, 80, 97–103), keeping the local mkdocs graph's sentence. The hero (lines 3–12, its link and `.github/knowledge-graph.png`) stays untouched until OQ3 is answered.
  - **No `globals.css`:** S5 does not touch it; S3 owns it, and the inks stay.
  - **Tone check:** after the cut the band order runs skill (sunken) then pricing (paper), so the tones still alternate.
  - **Verification:** check the landing in a real browser at the Operator Runtime viewports (390×844, 820×1180, 1024×768, 1440×900), and in the production build. If it looks bare, add that to `## Operator Questions`; a design round happens only on the operator's word.
- **Set:**
  - `web/src/app/(marketing)/page.tsx` and `layout.tsx`
  - `web/src/components/marketing/feature-graph.tsx`, `graph-motif.tsx`, `primitives.tsx` and `marketing.css`
  - `web/src/content/marketing/content.ts`, `graph-motif.ts`, `links.ts` and `index.ts`
  - `README.md`
- **Risk:** low. Deletions with no trigger.
- **spends money:** no
- **Depends on:** none
