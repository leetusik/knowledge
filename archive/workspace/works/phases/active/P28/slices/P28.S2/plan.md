# P28.S2 — plan (orchestrator native plan, auto mode, 2026-09-21)

**Round 03 apply: tokens, the responsive stylesheet, the shell and the shared components.** Executor: `slice-executor-high`.

Scope is round 03's contract **§§0–4, §6, §7**. `web/design/rounds/03-foundation/output/build-prompt.md` is binding — **RESPECT THE DESIGN**. **§5 (the state pages) is `P28.S3`'s and you do not touch it**, including the `.kb-toast-region` that appears in §4.1's tree.

Read `works/phases/active/P28/phase.md` whole first — especially the `(from P28.DECOMP, for P28.S2)` note, the Aside note tagged "for the first browser-verifying slice — S2", and the inventory row for this slice. This plan does not restate them.

## Findings from a read-only survey done while S1 ran

These were verified against the tree at `7f15ca1`. **Spot-check each before relying on it** — none is a licence to skip your own read, and one is explicitly marked unverified.

### Where the contract and the code disagree — decide, record, never silently paper over

1. **`main#content` vs today's `#main-content`.** §4.1 writes `main#content` and `.kb-skip href="#content"`. The id `main-content` is used in four places and is the target of `SKIP_TO_CONTENT.href` in `web/src/content/nav.ts`, **shared with the marketing skip link**. **Keep `id="main-content"` and point `.kb-skip` at it.** Identical behaviour, no forked constant. This is a deviation from the record's literal text but not from a visual decision — record it in `result.md` and as a `## Decisions` line.

2. **§4.8 drops the search form's no-JS mechanism.** The `.kb-searchbar` markup shows only field + filter, but today's form (`documents/page.tsx`, `SearchForm` ~209–279) is a plain `method="GET"` form whose submit/reset pair **and hidden passthrough inputs are the entire non-JS search path**. **Function is non-negotiable: keep the hidden inputs and the submit/reset buttons.** Apply the two cells and delete the `min-[720px]:` utilities as §4.8 orders, and leave the buttons as a third child of `.kb-searchbar`. Round 04 §4.7 gives that third child its `.kb-searchbar__actions` class in **`P28.S5`**, so it will look unfinished between the two slices — transitional, expected, and **not** something you style yourself (the §3 stylesheet is verbatim; add no rule to it). Verify search still round-trips as a plain GET.

3. **`DataTableColumn` has a fifth caller outside your scope** — `web/src/app/(public)/documents/[id]/version-history.tsx`, which belongs to `P28.S7`. Make §4.6's `priority` **optional with a default of 1**, so that file keeps compiling untouched. Do not edit it.

4. **`data-label="{column.header}"` cannot stringify a `ReactNode`** — two action columns pass `header: <span className="sr-only">…</span>`. §4.6 exempts the action column, so implement the exemption on **`column.actions === true`**, not on "last column".

5. **§4.6's priority table covers three tables; the repo has four, and one column is unassigned.** The dashboard's org-keys table is not listed at all, and the credentials table's `Name` column has no priority. **Default anything the record does not assign to priority 1** (always visible) — that preserves exactly today's behaviour and invents nothing. Record it as a `## Decisions` line **and** add a `## Operator Questions` entry noting the record gap, so the review routes it. Do not guess at what the designer would have chosen.

6. **An aria-label collision.** `APP_SHELL.navLabel` is `"Primary"` and the **rail** uses it today (`rail-nav.tsx`). §4.1 assigns rail = `"Sections"` and navbar = `"Primary"`. Add a second content key in `web/src/content/app.ts` and update `rail-nav.tsx`, or you ship two nav landmarks both named "Primary". The two label strings are specified by the contract, so this is not new copy.

7. **The skip copy is not where §4.1 says.** It is `SKIP_TO_CONTENT` in `content/nav.ts`, not `content/app.ts`. Reuse it; do not fork it.

8. **An inline style will defeat the layout.** `app-frame.tsx` sets `style={{ minHeight: "calc(100dvh - var(--kb-app-topbar-h))" }}` on `.kb-app-layout`. Inline beats the unlayered sheet, so with the new `.kb-app { min-height: 100dvh }` and a sticky phone navbar it guarantees a permanent scroll of one navbar height. **Remove it deliberately.**

9. **`explainer-frame.tsx` measures `.kb-topbar` at runtime** (`document.querySelector(".kb-topbar")`) for a sticky offset. The topbar must stay **one** element at 3.5rem, and the tablet navbar must not be mistakable for it.

10. **`components/ui/app-button.tsx` is the minority caller.** Roughly 18 sites write `<button className={appButtonClass(...)} disabled={pending}>` by hand and rely on `disabled` as their double-submit guard. **Build the primitive only** — the `busy` affordance on `AppButton` (`aria-busy`, the leading `.kb-appbtn__spin`, the participle label) — and **leave every hand-written call site alone**. `P28.S4` and `P28.S5` already rewrite exactly those files and will convert them there. Keep `appButtonClass`'s exported signature unchanged; four `(public)` pages and `public-shell.tsx` import it.

### Things that are true and make the slice easier

- **The `@import` must go at line 5 of `globals.css`**, immediately after `@import "./kb-console.css"`. Two reasons, both hard: CSS drops an `@import` that follows another at-rule, and `@theme` begins at line 23 — and among the unlayered sheets plain source order decides at least four equal-specificity ties against `kb-console.css`. Earlier than line 5 and the new sheet loses them.
- **The `kb_rail` fold must not move.** Keep every `[data-rail]` rule in `app-frame.css` and keep `.kb-rail` a **direct child** of `.kb-app-layout` (`app-frame.css` uses `> .kb-rail`). Never write `data-rail` from CSS or from width detection; `writeRail()` is its only writer. Hide the rail with `display: none`, never a conditional render — that would change hydration and drop `aria-controls`' target.
- **Marketing is genuinely decoupled** — no marketing component uses `.kb-app*`, `.kb-appbtn`, `.kb-field__*` or `.kb-dtable`. §2's token append is additive, so the landing page cannot be reached unless you **rename or revalue an existing token**, which the contract forbids anyway.
- **`(public)` is the real blast radius, not marketing.** `public-shell.tsx` also renders `.kb-app` / `.kb-topbar` / `.kb-app-main` and is **not** in §1's file table, so the fluid title ramp, the 88rem cap, the phone gutters and the phone table-stacking all reach it with no markup change. It has no `.kb-app-layout`, so its `.kb-app-main` becomes a flex child with no `flex: 1`. **`public-shell.tsx` is round 04 §4.2's file and belongs to `P28.S4` — do not edit it here.** Look at a public page in the browser, and if the result is merely unpolished, record it as an expected transitional state for S4 (the same pattern the notebook already uses for the S4→S6 graph). If it is genuinely **broken**, stop and raise it rather than patching an out-of-scope file or adding a rule to the verbatim stylesheet.
- **Nothing in `web/tests/` asserts on markup or class names**, so `pnpm --dir web typecheck` plus your own browser pass is the whole net. The one thing typecheck catches is the `DataTableColumn` change.
- **`web/` has no server files**, so the `plugin_parity` mirror rule in `## Decisions` does not apply to this slice.

### Unverified — check it yourself

The survey **inferred** from the module graph that `app-frame.css` (a component import) actually loads **after** the globals chunk, contradicting the new stylesheet's own header comment. It was not observed in a build. It matters only if the two sheets ever need to override each other at equal specificity — which is another reason to leave the `[data-rail]` rules where they are. Confirm it during your `pnpm --dir web build` and record what you find.

## The work

Follow the contract section by section: §1's file table (append §2 verbatim to `kb-tokens.css`; create `kb-console-responsive.css` from §3 **verbatim**; the `globals.css` import; `kb-console.css` and `app-frame.css` **do not touch**), then §4.1–4.9 with the corrections above, then §6 (`data-kb-scheme="auto"` on the `.kb-app` root only — auth keeps `slate` with no such attribute) and §7's accessibility floor.

One §6 consequence to record for later slices rather than fix: `public-shell.tsx` renders `.kb-app` **without** `data-kb-scheme`, so in OS dark mode the console goes slate while the public document shell stays light. That is the contract's scoping, and it is `P28.S4`/`P28.S7` territory.

For §4.4, convert **only the four `(app)` console pages** (dashboard, documents, graph, projects/[projectId]). The identical eyebrow/title/sub triple also appears on four `(public)` pages that are out of scope — **a grep-driven conversion will over-reach**. Drop each page's inline `marginTop: "0.35rem"` on the h1 (the new rule owns the spacing). The project page's eyebrow must be org-first per §4.4, which needs `identity` from its `requireIdentity()` call, not just `token` — the call is `cache()`d, so it is free. Where a page's actions slot is not buttons (dashboard's `CreateProjectForm`, graph's `CopyLinkButton` + hint, the project page's `Badge` + `VisibilityToggle`), wrap it in `.kb-pageframe__actions` as it is; the phone rule reaching only `.kb-appbtn` children is the contract's behaviour, not a defect to work around.

## Tests

**Write no new test file.** This slice is structural and cosmetic surface, which the workspace verifies **live**, not with assertions. `pnpm --dir web typecheck` is the compile net; the browser pass below is the real check. If you find yourself wanting a test, you have probably found a behaviour change that belongs in a different slice — say so instead.

## Validation

1. `pnpm --dir web typecheck` · `pnpm --dir web lint` · `pnpm --dir web test` · `pnpm --dir web build`. **Never** `prettier --write` on an existing web file (**D22**).
2. **Round 03 §8, items 1–8 and 10.** Item 9 is `P28.S3`'s — do not attempt it, and do not create the state pages to satisfy it.
3. **In the operator runtime, in a real browser.** `docs/current/operations.md` → `## Operator Runtime`: `pnpm --dir web dev` → `http://127.0.0.1:3030`, API at `127.0.0.1:8766`; instrument `aside repl --account u1 "<js>"` — **never `u0`**. Item 7 of §8 (resizing a desktop window from 1400 to 1100 with the rail expanded stacks `.kb-app-cols` because `kbmain` crossed 64rem, not because the window did) is the one that proves the container-query premise; do not skip it.
4. **You owe the phase the Aside viewport recipe.** `page` has no `setViewportSize`; reaching 390×844 / 820×1180 / 1024×768 needs device emulation or a real device. Establish what actually works, use it for §8 items 3–6, and **write the recipe into `## Notes for later slices`** so no later slice re-derives it. If you cannot reach the manifest runtime at all, return `needs_operator` rather than verifying somewhere convenient — and if you cannot reach narrow viewports specifically, say exactly that and which checks are therefore unverified. **Never claim a browser run you did not make.**

## Before you finish

- Append **one** `## Doc impact` line (`frontend.md` — the responsive layer, the new stylesheet and its cascade position, the new components). Run **no** `doc-new-version`.
- Edit the notebook: consume the `(from P28.DECOMP, for P28.S2)` note, add the Aside recipe note, add a `## Decisions` line for each deviation above that you acted on, add the §4.6 record-gap `## Operator Questions` entry, add notes for `P28.S4`/`P28.S5` (the public-shell transitional state; the untouched hand-written button call sites; the search bar's unstyled third child), and rewrite `## Now` (≤ 15 lines).
- Write `result.md` verdict-block-first, naming the instrument you actually used and listing which §8 items you verified and how.

You never commit and never transition slice or phase status.
