# P37-1p.S5: the landing and the README drop the graph

## Goal

Remove the landing's graph band, its motif and every graph clause in the public copy and metadata. Delete only: never write new filler copy or visuals.

The README's hero points at the library, per the operator's OQ3 answer ("as your recommendation"). See `phase-section P37-1p Decisions`, the "Operator answers (2026-11-02)" line.

The full block is `phase-section P37-1p "P37-1p.S5" --topic breakdown`. Read it first: it lists every site, and this plan only adds to it.

## Steps

1. **The band and motif.** As the breakdown lists them:
   - `FeatureGraph` leaves `(marketing)/page.tsx`.
   - Delete `components/marketing/feature-graph.tsx`, `graph-motif.tsx` and `content/marketing/graph-motif.ts`.
   - Remove `FEATURE_GRAPH`, the `GRAPH_MOTIF`/`GraphMotif` exports, `MKT_SECTION_IDS.graph` and the `.mkt-graph-*` motif block in `marketing.css`, with the `--mkt-ink-*` tokens it defines.
   - Before deleting those tokens, grep the whole `web/src` for each `--mkt-ink-*` name. If anything outside the motif block uses one, keep that token and say so.
   - Leave `globals.css` alone: it is S3's, and its data-viz inks stay.
2. **Copy clauses.** In `content/marketing/content.ts`, cut the graph clause from:
   - the hero lede;
   - the "What it is" card;
   - the pricing lede and the free line;
   - the two pricing rows.
   - Also cut it from the two metadata descriptions in `(marketing)/layout.tsx`.
   - **Cut the clause, not the sentence.** For example, "saved straight from the terminal, browsed as a living graph, and read like a book" becomes "saved straight from the terminal and read like a book". A list item that is nothing but the graph goes whole.
   - Never add a replacement feature or reword beyond what the cut needs to stay grammatical.
3. **Comments.** Update the band-order comment in `page.tsx` and the `primitives.tsx` comment.
4. **`README.md` (OQ3).**
   - **Hero, lines 3 to 12:** the heading link becomes the library, `https://knowledge.hi2vi.com/@leetusik`, with library wording in place of "knowledge graph". Delete the screenshot line (line 8) and the `.github/knowledge-graph.png` file it shows.
   - **Line 12's "knowledge map … above":** reword or cut it so it no longer points at a graph.
   - **Body:** delete the hosted-graph clauses (around lines 21, 80 and 97–103). Line 97's `/@{org}/graph` example goes, and line 98's "links keep resolving" now holds by redirect. Keep the sentence about the local mkdocs graph (`scripts/graph_hook.py`): the plugin template keeps that graph.
   - Keep the README's existing voice.
5. **Tone check.** After the cut the bands run skill (sunken) then pricing (paper). Confirm the tones still alternate down the page.

## Verification

1. **Scoped checks:**
   - `pnpm --dir web exec eslint` on your set's files.
   - Vitest on test files covering your set, if any.
   - `pnpm --dir web typecheck`, read only for errors in your set's files. An error elsewhere is S2's work in flight: report it, never fix it.
   - `grep -n -i graph` over your set shows no hosted-graph mention left, bar the README's local mkdocs graph sentence.
2. **Deferred: whole-tree:** `pnpm --dir web build`, the full `pnpm --dir web test`, and the production-build browser check.
3. **Real browser.** Claude in Chrome in the operator's "sugang" profile.
   - **Its deviceId is not known yet.** The orchestrator will send it to you by message once the operator connects that profile. Do this leg last.
   - At it, call `list_connected_browsers`, then `select_browser` with exactly that deviceId, never a label, before any other browser tool.
   - **With no deviceId by then,** finish everything else, write `result.md`, and return `needs_operator`. Set `operator_need` to "browser leg not run: the sugang profile's deviceId".
   - **Tabs:** open your own tab (`tabs_create_mcp`) and drive only it. S2 runs beside you in the same profile; never navigate, close or read a tab you did not open.
   - **The landing:** open `http://127.0.0.1:3030/` at 390×844, 820×1180, 1024×768 and 1440×900 (`resize_window`). Check:
     - no graph band, no motif, and no broken anchor (`#graph` links: check `links.ts` users);
     - the bands' tones alternate;
     - nothing overlaps or leaves a hole.
   - Screenshot each viewport.
   - **If the page looks bare** without the band, add an `## Operator Questions` entry in your `notebook`, with the screenshot's description, for the review's walkthrough. Never fill it with something new: a design round happens only on the operator's word.
   - Name the instrument in `result.md`, and never claim a check you did not make.
4. **Workflow state:** `python3 scripts/workflow.py validate` passes.

## Wave

- **Your set:**
  - `web/src/app/(marketing)/page.tsx` and `web/src/app/(marketing)/layout.tsx`
  - `web/src/components/marketing/feature-graph.tsx`, `graph-motif.tsx`, `primitives.tsx` and `marketing.css`
  - `web/src/content/marketing/content.ts`, `graph-motif.ts`, `links.ts` and `index.ts`
  - `README.md` and `.github/knowledge-graph.png`
  - any test file that covers only these files
- **Running beside you: P37-1p.S2** (the member graph page). Its set:
  - `web/src/app/(app)/graph/page.tsx`, `graph-canvas.tsx` and `loading.tsx`
  - `web/next.config.ts`
  - `web/src/content/graph.ts`, `index.ts` and `app.ts`
  - `web/src/components/app-shell/rail-nav.tsx`
  - `web/src/app/(app)/dashboard/page.tsx` and `web/src/content/dashboard.ts`
  - `web/src/components/copy-link-button.tsx`
  - `web/src/content/share.ts`, `states.ts`, `project.ts` and `documents.ts`
  - `web/src/lib/knowledge/app.ts` and `types.ts`
  - `web/src/lib/reader-href.ts`
  - It shares the Chrome profile with you, so keep to your own tab.
  - **A boundary to respect:** `web/src/content/index.ts` is S2's, and `web/src/content/marketing/index.ts` is yours. If the marketing exports are re-exported from `content/index.ts`, that is a `needs_operator` naming the file, never an edit.
- **Waiting commits:** none.
- **Join-rebuilt artifact:** none.
- **Your notebook:** write no `phase.md`. Return your entries in the verdict's `notebook` field, by section:
  - **Now:** what landed.
  - **Notes for later slices:** for S3, whether any graph-motif CSS or tokens live in `globals.css`.
  - **Doc impact:** the landing drops the graph band and the README hero points at the library.
  - **Operator Questions:** only the bare-page question, if it arises.
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

## Browser leg (resumed 2026-11-02, after the operator connected the profile)

deviceId=c14e5b18-f250-45f1-b92e-4a08a31197b5 — `list_connected_browsers`, then `select_browser` on exactly this id, before any other browser tool. Run only the browser leg of `## Verification`, in your own tab; update `result.md`'s verdict block and return the new verdict.
