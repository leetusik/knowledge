# P37-1p.DECOMP — decompose "Drop the knowledge graph"

## Context

The operator finds the knowledge graph noisy and never uses it ("maybe we should drop the graph of the knowledge since it's only looks noisy. never looked."). P37-1p removes it from the hosted product at knowledge.hi2vi.com:

- the member `/graph` page and its rail entry;
- the public `/@{org}/graph` and `/graph/{uuid}` pages;
- the `GET /app/graph` API;
- the landing page's graph feature section and motif.

Old shared graph links redirect to the org's library. The plugin's starter template keeps its graph. `intent.md` is the confirmed record.

This slice is the decomposition: it cuts the middle slices, writes `topics/breakdown.md`, and lands its findings in `phase.md` as gist lines. **It writes no product code.**

## One decision your approval signs (it reads against your words "leave the plugin's starter template alone")

The plugin template mirrors the server byte for byte. `scripts/plugin_parity.py` checks the `identical` list in `plugin/templates/manifest.json`, which holds `server/main.py`, `server/graph_api.py` and `tests/test_graph_api.py`. Its completeness check also ships all of `server/` and `tests/`. So the hosted server cannot drop the graph API while the template keeps it. The parity check, CI's drift gate, would fail.

The template's own graph does not use that API. A scaffolded site's graph is the mkdocs build: `scripts/graph_hook.py` emits `graph.json`, and `docs/javascripts/graph.js` and `docs/graph.md` render it. `server/graph_api.py` only feeds the hosted Next.js `/graph` pages, and the template ships no web app.

**Recommended (planned below):** delete `server/graph_api.py`, its router line in `server/main.py` and `tests/test_graph_api.py` on both sides, the root and `plugin/templates/kb/`. Remove them from the manifest's `identical` list too, so parity stays byte-exact. The template's graph stays exactly as it is: `graph_hook.py`, `graph.js`, `docs/graph.md` and its `mkdocs.yml` hook. The root's `scripts/graph_hook.py` and `mkdocs.yml` also stay, because they mirror the template.

**The alternative:** keep `GET /app/graph` live on both sides and remove only the web surfaces. Nothing under `plugin/templates/` is touched. The cost is that the hosted API keeps an endpoint nobody calls, which falls short of "gone from the API".

## What the executor does

1. **Read** `intent.md` and `phase.md` (through `phase-section`). Read this plan. From `docs/current/`, read only the sections the cut needs: operations' `## Operator Runtime` and *Plugin distribution*, and product's public-URL section. All of these are STALE, so read the code first.
2. **Map every knowledge-graph surface.** Start from the intake list in `intent.md` and these sites found at planning:
   - **Web app:** `web/src/app/(app)/graph/*` (the page, `graph-canvas.tsx` and three CSS files); `rail-nav.tsx` and `content/app.ts`'s nav item; `content/graph.ts` and its `content/index.ts` export; the graph CSS imports in `globals.css`; the `.kb-graph-dock` rules in `kb-record-fixes.css`; the dashboard's "Public graph" URL panel (`dashboard/page.tsx`, `content/dashboard.ts`); and graph mentions in `share.ts`, `project.ts`, `documents.ts`, `copy-link-button.tsx`, `public-shell.tsx`, `states.ts`, `lib/next-path.ts`, `lib/auth-guards.ts`, `lib/reader-href.ts`, `lib/knowledge/app.ts` and `types.ts`.
   - **Public pages:** `web/src/app/(public)/[org]/graph/*`, `web/src/app/(public)/graph/[org]/*` and the comments in `robots.ts`.
   - **API:** `server/graph_api.py` and its router in `server/main.py`; the public-graph predicate helpers in `server/db.py` (around lines 549–591), removed only if nothing else calls them; `tests/test_graph_api.py`; the graph legs of `tests/test_public_read.py` and `scripts/onboarding_smoke.py`. `server/accounts/slugs.py` may reserve `graph` as a slug: keep the reservation, it is harmless.
   - **Landing:** `components/marketing/feature-graph.tsx` and `graph-motif.tsx`; `content/marketing/graph-motif.ts`, `content.ts` (the section, the lede, the pricing rows), `links.ts`' section id and `index.ts`; the motif rules in `marketing.css`; the data-viz inks in `globals.css`, if only the motif uses them; the metadata description in `(marketing)/layout.tsx`.
   - **Not the knowledge graph, so never touch:** the native renderer's `graph` diagram kind (`lib/native/diagram-*`, the `diagrams-graph` fixtures), `paragraph`/`typography`/OpenGraph matches, and the template's mkdocs graph.
   - **Watch the CSS cascade.** `globals.css`'s comment and `kb-docview.css` place other sheets relative to `graph-r5.css`. Check whether `graph-tokens.css`, `graph.css` or `graph-r5.css` define a token or rule that a non-graph surface uses before cutting their deletion. If one does, the slice that deletes them moves that rule, and the risk rating says so.
3. **Cut the slices with `new-slice`**, as bare folders that never pre-fill a `plan.md`, and declare each with `--depends-on`. The shape below is the suggested one. The executor may re-cut it when the map shows a better seam, and it says why in the breakdown:
   - **Web app.** Remove the member graph page, its nav entry, its copy and CSS, and the dashboard's public-graph panel. The member `/graph` redirects to `/library`, the signed-in landing.
   - **Public pages.** Remove both public graph routes. `/@{org}/graph` redirects to `/@{org}`. `/graph/{uuid}` redirects to that org's library: find the existing UUID→slug resolver. If a slug-less org has no library URL, the executor decides the closest honest target as drawn, or files an Operator Question if it cannot.
   - **API.** Delete the graph API, router and tests on both sides with the manifest edit (the decision above), plus the web client's graph fetch and types and the smoke legs. This slice depends on the two web slices, since nothing may still call the API.
   - **Landing.** Remove the graph section, the motif and the graph clauses in the landing copy and metadata. Delete only; never write new filler copy or visuals. The slice verifies the page in a real browser at the Operator Runtime viewports. If the page then looks bare, that goes on `## Operator Questions` for the review's walkthrough: a design round happens only on the operator's word, never improvised.
   - **Sets must be disjoint** for slices that may run together. `globals.css` is the likely overlap (the graph CSS imports and the data-viz inks): give it to one slice or chain the two. List every file each slice may touch, its tests included.
   - **Risk:** `low` for each slice unless a named trigger applies, written beside it. The candidates are a wide blast radius, if the graph CSS holds shared rules, and a core invariant, if the redirects sit on the public-read auth boundary.
   - **Money:** every slice is `spends money: no`.
4. **Write `topics/breakdown.md`** with `## Passes`, `## Estimate`, a `## Join-rebuilt artifact` section (or `none`) and one `## <slice id>` block per slice: goal, set, risk with its trigger, `spends money:` and depends-on.
   - **The estimate:** take time from `dispatch-summary`'s means block (implementation ≈ 22 span-min/slice, review ≈ 218 span-min, the main thread included). Never use a $ or token figure.
   - **The checks:** the slices' gates are web `typecheck · lint · test · build`, `uv run pytest -q`, `scripts/plugin_parity.py` and `scripts/skills_parity.py`. Real-browser checks follow `## Operator Runtime` (Aside `u1`; never `u0`). If the instrument is unavailable, the slice returns `needs_operator`.
5. **Land in `phase.md`** through `phase-section`, one gist line each:
   - `## Decisions`: one `Breakdown (DECOMP): …` line linking the breakdown, and the parity decision above recorded as signed.
   - `## Doc impact` (append-only): the public graph URLs and `GET /app/graph` are gone from product and architecture; the qa regression lines that name the graph; and the fact that the plugin template drops `server/graph_api.py` while its mkdocs graph stays.
   - `## Notes for later slices` and `## Now`.
6. **Return** the verdict with `parallel:`, the rounds `parallel-plan P37-1p` prints, and for a chain, why and what would unlock parallelism. Run `validate` before returning.

## What this slice does not do

- It never runs `accept-gate`. The orchestrator declares `--require` after `finish-slice`, because the nav, landing and links are operator-visible.
- It cuts no design slice. Intent allows a design round only if the landing looks bare, and that question goes to the operator at the review.
- It never commits, edits product code, bumps the plugin version or pushes. Whether the template change needs a plugin version bump is a note for the API slice to check against the repo's release rule.

## Verification

- `python3 scripts/workflow.py validate` is green.
- `finish-slice P37-1p.DECOMP` accepts it, so every middle slice is declared.
- `topics/breakdown.md` holds one block per cut slice, each with a set, a risk and a `spends money:` line.
- The orchestrator then declares `accept-gate P37-1p --require` and commits.

## Dispatch

route=high
reason=kind decomposition
subagent_type=slice-executor
model=opus
pass_model=yes
effort=xhigh
pass_effort=yes
attribution=Claude Opus 5.5
explore_model=haiku
explore_effort=xhigh
