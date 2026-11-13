# P27.DECOMP — plan (orchestrator native plan, gated for operator approval 2026-09-21)

Decompose P27 "Console visual redesign — design system + responsive surfaces (design)" into its middle slices. Executor: `slice-executor-high`. Style: **`design-only`, design half** — see `works/phases/active/P27/intent.md` `## Design Style` (`Mockup: on request`). The apply phase **P28** already exists; nothing here builds anything.

## Your job (and only this)

1. Create the middle slices as **bare folders** with `python3 scripts/workflow.py new-slice --phase P27 --slice P27.S<n> --name "..." --kind ... --risk ... --order ... [--depends-on ...]`. Never pre-fill any created slice's `plan.md`.
2. Edit `works/phases/active/P27/phase.md` (the bounded notebook): record the slice breakdown (what each slice covers and why, risk rationale per slice), the **build inventory** (one line per candidate — the seed below, verified and extended by your own read of the code), `## Decisions`, `## Notes for later slices` tagged `**(from P27.DECOMP, for P27.S<n>)**`, `## Operator Questions` (only questions that are the operator's to answer — design questions belong in the round handoffs, note them for the orchestrator instead), and rewrite `## Now` (≤ 15 lines). Never touch the generated `## Slices` block.
3. Run `python3 scripts/workflow.py validate`.
4. Write `result.md` (verdict block first) and return the structured verdict.

No product code, no docs versions, no commits, no state transitions beyond `new-slice`. Do **not** run `defer-job` / `promote-deferred` — D25 (server-rendered PDF) is already filed; D18 (login returnTo + public tag surface) is P28's to absorb or promote. Do **not** declare the acceptance gate — the orchestrator runs `accept-gate P27 --waive --note "design-only, no mockup: the operator signed the round on the card set"` right after `finish-slice`, in the same commit.

## Operator-confirmed decisions (fixed — decompose around these, do not relitigate)

1. **`design-only`.** This phase produces signed, immutable design rounds and ends at `REVIEW`; P28 applies them. No build slices, no `DECOMP2`, no apply slices here.
2. **The design system itself comes first, in the operator's new Claude Design account.** The old project (`f49ab425-…`, rounds 01/02 on the landing page) belongs to the previous account. Round 03 re-establishes the system from the real repo (Connect GitHub) and adds the responsive foundation the system never had. The operator creates the new Design project at that round's PENDING #1; its id is recorded in `SIGNOFF.md`.
3. **`Mockup: on request`** — no dispatched span in any design slice unless the operator asks in their own words during a round; each `co-work` slice runs inline and stops `pending` once.
4. **Scope of the sweep:** member console + public shell + auth pages + graph + document views. Landing rounds 01/02 stay untouched (report breakage, never redesign). Server-side PDF is deferred (D25); PDF export is a **browser print pipeline** on the chrome-less HTML-only view, so the design covers the print appearance. A console dark scheme only if round 03 decides it.
5. **Runtime manifest first.** `## Operator Runtime` is absent from `docs/current/operations.md`; the phase's first slice seeds it from the facts in `intent.md` `## Notes` before any browser-verifying work.

## Grounded facts (verified this session — spot-check, then record in `phase.md`)

- **No responsive handling in the console.** `web/src/app/kb-console.css:41` (`.kb-app-layout` grid with a fixed `var(--kb-app-rail-w)` = 15rem column), `:30` (`.kb-topbar` flex, no wrap, full email + org crumb), `web/src/app/(app)/dashboard/page.tsx:298` (hard `grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]`), header rows `flex items-start justify-between gap-4` without `flex-wrap` on dashboard/project/graph pages, `web/src/app/(app)/graph/graph.css:27-28,70-73,204-206,269-273` (plate `calc(100dvh - topbar - 13rem)`, legend 11rem, panel 17rem, absolute corners), `web/src/app/(public)/documents/[id]/explainer.css:41` (same 13rem magic). Only width media query in the app: `min-[720px]:` in `documents/page.tsx`. No hamburger/drawer; the rail folds only via the `kb_rail` cookie toggle (`web/src/components/app-shell/app-frame.tsx`). No `error.tsx` / `loading.tsx` anywhere. Landing (`web/src/components/marketing/*`) is the only surface with `sm:`/`md:`/`lg:`.
- **Design system in code:** `web/src/app/kb-tokens.css` (`--kb-*`, light `default` / dark `slate` schemes keyed on `data-md-color-scheme`), `web/src/app/kb-console.css` (portable `.kb-*` console layer, unlayered — beats Tailwind utilities), `web/src/app/globals.css` (`@theme` bridge, shadcn variable map, no component ever added), primitives under `web/src/components/ui/` (CVA over `.kb-*`: `app-button`, `card`, `badge`, `data-table`, `field`), `web/src/components/usage/` (stat tiles, trend chart). Design record: `web/design/canvas/` (P12 handback: `APP_BRIEF.md`, `tokens/`, `components/console/`, `pages/*.card.html` at `viewport="1280x940"` only) and `web/design/rounds/01-landing/`, `02-onboarding/` (`handoff.md`, read-only `output/`, `SIGNOFF.md`). Next round number is **03**.
- **Graph:** one engine, `web/src/app/(app)/graph/graph-canvas.tsx` (1711 lines, hand-written canvas force sim, no library), mounted by `(app)/graph/page.tsx`, `(public)/[org]/graph/page.tsx`, `(public)/graph/[org]/page.tsx`. Data rides the RSC payload (`getGraph` → `GET /app/graph[?org=]`); nodes are `doc`/`missing`/tag hubs, `projects` is a name list for ink + legend (`.kb-graph-legend`, not clickable). P22 labels: selection/hover only (`labelTarget()` `:862-870`). Operator-reported defect: wires **default** off the frame on member `/graph` and public `/@leetusik/graph` on their Mac; not reproduced via Aside at 1440×900 dpr 1 (fits fresh/settled/tags on-off); hypotheses: persisted session-storage view restores `auto:false` zoom/pan (`:644-700`, `:1618-1630`), Retina/dpr or window size. Other defects (P28 groundwork, design inputs only): node `url` is `/documents/{id}` (`server/graph_api.py:87`), tag pills → session-gated `/documents?tag=` (`:1227`, D18), empty-data path returns before sizing (`:1593-1597`), legend covers a third of the plate at 390px.
- **Project → documents does not exist.** `web/src/app/(app)/projects/[projectId]/page.tsx` = info + credentials + usage; `/documents?project={uuid}` works but nothing links to it; API `GET /app/documents?project=` and client `getDocuments` (`web/src/lib/knowledge/app.ts:387`) exist. Dashboard project rows link only via the "Open" button (`dashboard/page.tsx:100-107`).
- **Document view:** `web/src/app/(public)/documents/[id]/document-view.tsx` + `explainer-frame.tsx` — sandboxed opaque-origin iframe (`sandbox="allow-scripts"`, never `allow-same-origin`) pointed at the BFF relay `web/src/app/api/documents/[id]/raw/route.ts` (five pinned headers, `next.config.ts` per-path X-Frame-Options exemption, height reporter injected from `lib/explainer-height.ts`). No chrome-less view, no raw link, no print CSS, no PDF/export anywhere in the repo. **Constraint for the HTML-only view:** keep the sandbox CSP / opaque origin — never raw HTML on the app origin.
- **Runtime facts for S1** (from `intent.md` `## Notes`): dev `pnpm --dir web dev` → `http://127.0.0.1:3030`, BFF → `KB_API_BASE_URL` (dev default `http://127.0.0.1:8766`, per operations doc *Web app local build/run (P12)*); production + acceptance origin `https://knowledge.hi2vi.com`; devices iPhone (Safari + Chrome), iPad (Safari + Chrome), Mac Chrome; viewports 390×844, 820×1180 / 1024×768, 1280–1440; Aside agent account **`u1`** (`aside repl --account u1 "<js>"`), with the repl sharp edges listed there. The section is the review's named carve-out, so S1 writes it via `doc-new-version --doc operations --summary "..." --source P27.S1`, edits only that section, then `rebuild-docs`.
- **Gates:** `pnpm --dir web typecheck · lint · test · build`; no CI for `web/`; prettier red repo-wide (D22 — never `prettier --write` existing files). Not exercised by this phase (no product code) except as facts for the handoffs.

## Build inventory seed (record in `phase.md`, one line each; verify and extend)

- app shell: topbar + rail (member) and public shell (anonymous) at phone / tablet / desktop — phone navigation pattern, topbar under narrow widths, rail fold vs breakpoint
- dashboard: stat tiles, 30-day trend, projects table, org keys table, create-project, org-slug panel
- project page: info + credentials + usage **plus a documents list** (new), and the dashboard row/name as the click target
- documents: browse, filter, search with snippets, pager, delete
- auth: login, signup (dark gate)
- graph: plate sizing at three viewports; legend / info panel / zoom cluster placement; **legend project click → that project's document list in the panel** (new); node identification given selection-only labels; the off-frame default; tag-pill and node-link behaviour for anonymous viewers
- document view (member, public, past version): metadata strip, copy-link, claim hint, delete, version history; **chrome-less HTML-only view** affordance (new); **Export PDF** affordance + print appearance (new)
- system-wide: error page, empty states, loading, focus/reduced-motion floor, whatever the design-system round finds inconsistent

## Suggested shape (you own the final breakdown — adjust with reasons)

| Slice | kind / risk | order | Name | Why |
|---|---|---|---|---|
| `P27.S1` | `docs` / `low` | 1 | Seed `## Operator Runtime` in the operations doc | Absent manifest halts every browser-verifying slice; few-line docs edit → mid tier |
| `P27.S2` | `co-work` / `high` | 2 | Design round 03: design system re-established in the new account + responsive foundation | Tokens, console components, breakpoints, phone nav, tables/panels on small screens; the operator creates the new Design project here |
| `P27.S3` | `co-work` / `high` | 3, depends on S2 | Design round 04: console surfaces at three viewports | Shell, dashboard, project page + documents list, documents, auth, public shell |
| `P27.S4` | `co-work` / `high` | 4, depends on S3 | Design round 05: graph + document views | Graph at three viewports + legend project click; document view + HTML-only view + Export PDF / print appearance |
| `P27.REVIEW` | exists | — | — | never pre-plan |

Three rounds is the default: the foundation must land before surfaces are designed on it, and one round for all surfaces would be too many cards to review at once. Merge S3/S4 only if your inventory read says the surface list is genuinely small; split further only with a reason. A `co-work` slice is never `low`.

## Notes the notebook must carry for the design slices (`## Notes for later slices`)

- (for S2) The round-03 handoff must ask the operator to create the Design System project in the **new** account and Connect GitHub before the session; the orchestrator writes the handoff and pushes the branch (the one authorized push). Card contract: numbered paths `01-…`, `@dsCard` line-1 marker, `tokens.css`, per-viewport cards for the responsive foundation. Locked: brand spirit, copy, data contracts, a11y/reduced-motion floor. In play: tokens, type, spacing, layout, motion, expression.
- (for S2–S4) Ground every card in real content — real paths and data shapes listed above; never lorem. Design questions to pose back, never answer: keep P22's selection-only labels or revisit; phone navigation pattern; whether the console gets a dark scheme; what the print appearance shows/hides (quiz, interactive blocks); where the HTML-only and Export PDF controls live.
- (for S3–S4) Each later round extends the earlier rounds; a card that supersedes one keeps its path and number.
- (for REVIEW) Gate is waived (design-only, no mockup); the review verifies the three rounds' records are complete (`result`, `build-prompt`, SIGNOFF with the operator's literal words), the `## Doc impact` list (S1 versions operations directly; the rounds change no durable doc until P28), and routes every `## Operator Questions` entry.

## Validation

`python3 scripts/workflow.py validate` must pass with the created slices; the backlog rebuild shows them under P27.
