# P28.S4 — plan (orchestrator native plan, auto mode, 2026-09-21)

**Round 04 apply: shells, dashboard, project page + the new documents panel — and `graph-r5.css` lands here.** Executor: `slice-executor-high`.

Scope is round 04's contract **§3, §4.1, §4.2, §4.3, §4.5, §4.6** (`web/design/rounds/04-console-surfaces/output/build-prompt.md`). **RESPECT THE DESIGN.** **§4.4 (disclosures), §4.7 (documents page) and §4.8 (auth) are `P28.S5`'s — do not touch them.**

Read `works/phases/active/P28/phase.md` whole first. Four things in it bind you and this plan does not restate them: **the cascade rule** (a Tailwind utility can only *add* a property the `.kb-*` classes do not set — measured, not inferred), **the Aside viewport recipe**, **the local runtime left running** (postgres container, `web/.env.local`, uvicorn on 8766, `next dev` on 3030 — verify before assuming), and the **`graph-r5.css` decision**.

## Two stylesheets land here, both verbatim

1. **`web/src/app/kb-console-r4.css`** from round 04 §3, byte-identical, imported from `globals.css` after `kb-console-responsive.css`.
2. **`web/src/app/(app)/graph/graph-r5.css`** from **round 05 §3**, byte-identical, imported from `globals.css` after `kb-console-r4.css` — **not** from `graph-canvas.tsx`, per the `## Decisions` line. It lands in *this* slice because §4.2's `public-shell.tsx` change is what creates the trap its `.kb-app--public .kb-app-layout { grid-template-columns: minmax(0, 1fr) }` line fixes: round 04 caps and centres public main but leaves the 15rem rail track under it.

Copy both byte-for-byte. Do not reformat, do not "improve" a value, and **do not add a rule to either**. `kb-tokens.css`, `kb-console.css`, `app-frame.css` and `kb-console-responsive.css` are all **do not touch**.

**Named consequence, not a defect:** between this slice and `P28.S6` the graph plate is sized by round 05's rules while the engine is still round 04's, so `/graph` will look transitional (the legend may vanish on a small plate before the dock exists). Expected. Do not fix it, and do not let it fail your own verification.

## Round 04 closes a gap S2 reported — apply the answer

S2 raised that round 03 §4.6 rated three tables and the repo has four. **Round 04 rates both stragglers**: §4.3's Org API keys panel — "Name, Key, Status, Actions = 1 · Last used = 2 · Created = 3" — and §4.5's credentials panel, with the same list. Apply them, replacing the priority-1 defaults S2 set. Then **mark that `## Operator Questions` entry answered in the notebook**, naming the later round as the answer (the same way round 05 corrects round 04). Round 03 §4.6's own three tables keep their ratings, which §4.3 restates for Projects.

## The one mechanism the record leaves open — decide it, do not ship a dead control

§4.6 requires the documents panel's failed fetch to render the in-panel block "with one `sm` Retry", and S3 built `<Editorial variant="panel">` for exactly this but deliberately wired it nowhere, because **Retry's mechanism on a server-rendered panel is undefined** — there is no `reset()` outside an error boundary.

**Make Retry a small client island that calls `router.refresh()`.** It is the only sensible mechanism for a server-rendered panel, it matches what "Retry" means to a user, and it invents no visual decision. Record it as a `## Decisions` line. **A Retry that does nothing is worse than no Retry** — if you conclude `router.refresh()` will not actually re-run the fetch here, say so and raise it rather than shipping a button that lies.

## Fix the 422 on the file you already own

S3 found that the API answers **422** for a non-UUID project id while `loadProject` maps only 404/400 to `notFound()` — so `/projects/not-a-uuid` throws and lands on the 500 editorial instead of the designed 404, contradicting the file's own header comment. `projects/[projectId]/page.tsx` is yours. **Add 422 to the mapping** — one status at one call site, no new copy — and correct the stale comment. (`documents/page.tsx` is the other half and is S5's.)

## Section notes

- **`id="main-content"`, not `#content`.** Both §4.1 and §4.2 write `id="content"`, but S2 kept `main-content` because `SKIP_TO_CONTENT.href` is a single constant shared with the marketing skip link. **Stay consistent with what shipped** — including in `public-shell.tsx` — and do not fork the constant.
- **§4.1** — every page's blocks become direct children of one `.kb-page-flow`, and **every page-level `margin-top` / `mt-[var(--kb-space-md)]` is deleted**; the flow's gap is the rhythm.
- **§4.2 `public-shell.tsx`** — `.kb-app--public`, the skip link, `.kb-topbar__signin` (never `__signout`, which round 03's phone rule hides), no navbar, no rail, **no `data-kb-scheme`** (public surfaces stay light; rounds 05/06 designed no dark graph). Do not add a second sticky context — round 03 already makes `.kb-topbar` sticky. S2 recorded this shell as *unpolished but not broken* under round 03 with a diagnosis (`.kb-app-main` is `flex: 0 1 auto` with no `.kb-app-layout`, leaving paper-coloured space below short documents); §4.2's `.kb-app-layout` wrapper is what closes it — confirm it does. S3 left `PublicShell` without a toast region deliberately; round 04 gives the public surfaces nothing to announce, so **leave it out** and say so.
- **§4.3 dashboard** — the six blocks in one order at every width; delete the trend figure's `h-[120px]` (round 03's `.kb-trend-wrap` clamp owns the height and is inert until something wears the class); the **project name becomes a link** while the row stays unclickable and the ghost Open button stays; `.kb-activity` replaces the inline Tailwind list; the Public URL field is **always visible, not in the head**, with a **visible** label.
- **The §4.3 / §4.4 seam — read this twice.** You own the **panel structure** and the always-visible Public URL field row (`org-slug-form.tsx`'s `.kb-fieldrow` + visible label is §4.3's own markup). **S5 owns every disclosure's placement and the confirm pattern** — so for the Org API keys panel, build the head as §4.3 describes and **leave the "New key" trigger and its form where they are**; S5 moves the form below the head under §4.4. Do not pre-empt it, and do not touch `create-project-form.tsx`, `mint-org-key-form.tsx`, `mint-credential-form.tsx` or the revoke/delete confirm buttons.
- **§4.5 project page** — the page frame with `.kb-pageframe__status` + `__hint`; the block order page frame · tiles · trend · **Documents** · API keys; delete that page's `h-[120px]` too. `visibility-toggle.tsx` is yours: convert it to the busy affordance S2 built (`aria-busy` + `.kb-appbtn__spin` + "Saving…"), and because **`busy` deliberately does not set `disabled`, move that button's double-submit guard into its handler** — do not leave the form unguarded.
- **§4.6 documents panel** — the net-new capability and the operator's literal ask ("list of documents when clicked a project"). A **second parallel fetch** beside `getProjectUsage` via `Promise.all` (`getDocuments`, `lib/knowledge/app.ts:387`), first **5** of `items`; Title (pri 1, links to `/documents/{id}`) · Date (pri 2, mono) · Tags (pri 3); no Project column, no Delete, no snippet, no pager, no head caption; the table's own empty row with `DOCUMENTS.list.emptyNoDocuments`. **Every string already exists** — add none. The failure must not take the page down; a 401 still redirects through the page's existing guard.

## Tests

**Write no new test file.** This is markup and styling over an existing data path, verified live. The one thing worth a thought is the parallel fetch's failure isolation — verify that **in the browser** by making the documents fetch fail while the rest of the page renders, not with a unit test.

## Validation

1. `pnpm --dir web typecheck` · `lint` · `test` · `build`. **Never** `prettier --write` an existing web file (**D22**).
2. **Round 04 §9 items 1–6, 11, 12.** Items 7–10 are S5's — do not attempt them. Item 11 (`grep` finds **no `@media`** in `kb-console-r4.css`) is a one-command check. Item 3 is the load-bearing one: at **1180 with the rail expanded** the dashboard is one column with Keys/Created hidden, and **folding the rail** brings back the 1.7fr/1fr pair and all seven columns — both correct, because the container moved and the window did not.
3. **In the operator runtime, in a real browser**, using S2's recipe and S3's addendum (the harness cannot render a `notFound()`/`error.tsx` page at all; layout there is trustworthy, interaction is not — drive clicks at the top level). Verify the documents panel with real documents, with **none** (the empty row), and with the fetch **failing** (the in-panel block, page still usable). Check a public page at a desktop width to prove the rail-track trap is gone. Name the instrument in `result.md`; never claim a run you did not make.

## Before you finish

- Append **one** `## Doc impact` line (`frontend.md` for the round-04 layer and its cascade position; `experience.md` + `product.md` for the project documents panel as a capability).
- Edit the notebook: consume the notes you used, mark the §4.6 priority question **answered by round 04**, add `## Decisions` for the Retry mechanism and any other reading you acted on, add a note for `P28.S5` (the §4.4 seam — what you left in place for it) and for `P28.S6` (that `graph-r5.css` is already loaded from `globals.css`: verify, do not re-import), and rewrite `## Now` (≤ 15 lines).
- Write `result.md` verdict-block-first.

You never commit and never transition slice or phase status.
