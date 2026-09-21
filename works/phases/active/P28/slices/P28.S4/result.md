# P28.S4 — result

- **status:** done
- **summary:** Round 04 §§3, 4.1, 4.2, 4.3, 4.5, 4.6 applied and round 05's `graph-r5.css` landed: both stylesheets copied byte-identical and imported from `globals.css`, the public shell got `.kb-app--public` + `.kb-app-layout` + the skip link, the dashboard and project page became one `.kb-page-flow` each, and the project page gained the new Documents panel on a second parallel fetch with a working `router.refresh()` Retry. Verified with Aside (`--account u1`) in the manifest dev runtime **and** the production standalone build; §9 items 1-6, 11 and 12 all pass, with one record-arithmetic slip and one round-03 tap-target overreach reported rather than fixed.
- **validation:**
  - `pnpm --dir web typecheck` — PASS (run twice: after the edits, and again after the temporary failure probe was reverted)
  - `pnpm --dir web lint` — PASS (twice, same)
  - `pnpm --dir web test` — PASS, 16 files / 88 tests (twice, same)
  - `pnpm --dir web build` — PASS (standalone; all 21 routes) — re-run last, after every edit
  - Round 04 §9 items **1, 2, 3, 4, 5, 6, 11, 12** — PASS, with the two qualifications below. Items 7-10 are `P28.S5`'s and were not attempted.
  - Real-browser verification — **Aside, `aside repl --account u1`**, in the manifest runtime (`pnpm --dir web dev` → `http://127.0.0.1:3030`, API on `127.0.0.1:8766`) **and** in the production standalone build (`node .next/standalone/server.js` on 3040). Narrow viewports through S2's same-origin iframe harness behind a throwaway proxy recreated at `/tmp/p28s4/vpproxy.py` (deleted-server, file left on /tmp).
- **deviations:** four, all recorded below — (1) two `loading.tsx` skeleton heights outside the plan's file list, (2) `org-slug-form.tsx`'s Save converted to the busy affordance, (3) two container utilities on `visibility-toggle.tsx` that the record's markup sketch does not draw, (4) the failure block reuses `STATES.error` copy whose last clause does not fit a panel.
- **doc_impact:** one line appended to `phase.md` (`frontend.md` + `experience.md` + `product.md`).

---

## What landed

### The two stylesheets, byte-identical

| File | Source | Bytes | Check |
|---|---|---|---|
| `web/src/app/kb-console-r4.css` | round 04 §3 | 14,464 | extracted programmatically from the fenced block and diffed back against it — **IDENTICAL** |
| `web/src/app/(app)/graph/graph-r5.css` | round 05 §3 | 17,869 | same — **IDENTICAL** |

`globals.css` now reads (lines 1-7): `tailwindcss · tw-animate-css · kb-tokens · kb-console · kb-console-responsive · kb-console-r4 · (app)/graph/graph-r5`. No rule was added to either file, and no earlier sheet was touched.

**§9 item 11:** `grep -nE '^[[:space:]]*@media' kb-console-r4.css` → **0**. (The word appears once, in the file's own header comment saying there are none.)

**A trap for anyone who edits CSS in this phase, and it cost ~20 minutes here.** The `next dev` server P28.S2 left running had been orphaned (its `pnpm` parent was gone, `ppid 1`) and **had stopped rebuilding CSS entirely** — the new imports produced no new rules in the served sheet, and removing them changed nothing either, which is how it was diagnosed. It was killed and restarted; both sheets appeared immediately. Nothing was wrong with the imports, including the parenthesised `./(app)/graph/graph-r5.css` path, which Turbopack resolves fine.

### The surfaces

- **`public-shell.tsx` (§4.2)** — `.kb-app--public`, the shared `SKIP_TO_CONTENT` skip link, `.kb-topbar__signin` on the Sign in anchor, and the `.kb-app-layout` wrapper it never had. The Tailwind `sticky top-0 z-20` utilities are gone (round 03 already makes `.kb-topbar` sticky at `z-index: 40`; §4.2 forbids a second sticky context). No `data-kb-scheme`, and **no toast region** — `AppShell` mounts one, but round 04 gives the public surfaces nothing to announce, so the shell stays a single root. Kept `id="main-content"` (S2's reading; `SKIP_TO_CONTENT.href` is one shared constant).
- **`dashboard/page.tsx` (§4.1, §4.3)** — one `.kb-page-flow` with the six blocks in the record's order; every page-level `margin-top` deleted; the trend figure's `h-[120px]` replaced by `.kb-trend-wrap`; `.kb-panel__head` / `__headmain` / `__lead` / `__caption` heads; the **project name is a link** (`kb-dtable__name`) with the ghost Open button kept and the row still unclickable; `.kb-activity` replaces the inline Tailwind list; `.kb-urlline` for the public graph URL; and the **org-keys table is rated** (see below).
- **`dashboard/org-slug-form.tsx` (§4.3)** — the field is a `.kb-fieldrow` row under the head with a **visible** `Org slug` label, Save beside it, and the hint moved from `.kb-field__hint` to `.kb-hintline`. The `<form>` is a transparent wrapper so `.kb-fieldrow`'s direct-child selectors (`> .kb-field`, `> .kb-appbtn`) still match.
- **`projects/[projectId]/page.tsx` (§4.1, §4.5, §4.6)** — one `.kb-page-flow`, block order page frame · tiles · trend · **Documents** · API keys; `.kb-pageframe__status` (chip + toggle + `.kb-pageframe__hint`) replaces the generic actions slot, and the hint copy (`PROJECT.visibility.hint.*`, authored in P19) renders for the first time; `h-[120px]` deleted; credentials head rebuilt on `__headmain`/`__lead`; **422 added to the not-found mapping**.
- **`projects/[projectId]/visibility-toggle.tsx` (§4.5)** — `busy` instead of `disabled`, the double-submit guard moved into the form's `onSubmit`, and `size="sm"` dropped (§4.5's markup draws a plain `.kb-appbtn--secondary`).
- **`projects/[projectId]/documents-retry.tsx`** — new client island, the §4.6 Retry.

### The §4.3 / §4.4 seam — what was deliberately left for `P28.S5`

The org-keys and credentials panel **heads** were rebuilt as §4.3 describes (`.kb-panel__head--start` + `.kb-panel__headmain` + `.kb-panel__lead` + the trigger). `<MintOrgKeyForm>` and `<MintCredentialForm>` were left **whole, inside the head** — they are fragments that render either the trigger or the revealed form in the same slot. §4.4's move (the revealed form out of the head into a `.kb-inlineform` block below it, `.kb-form-actions--end`, focus management) is S5's, and nothing here pre-empts it. `create-project-form.tsx`, `revoke-org-key-button.tsx`, `mint-credential-form.tsx` and `revoke-credential-button.tsx` were not touched.

Verified live that the seam is not broken: clicking "New key" in the new head opens the form **inside the head**, focus lands on the name input, and Cancel closes it and restores the trigger.

## The answered question: round 04 rates the two tables round 03 left out

P28.S2 recorded that round 03 §4.6 rates three tables while the repo has four, and defaulted everything unrated to priority 1. **Round 04 answers it in two places, with the same list**: §4.3 for the dashboard's Org API keys panel and §4.5 for the project credentials panel — *Name, Key, Status, Actions = 1 · Last used = 2 · Created = 3*.

- Org API keys — applied (was all-1): measured live `Name=1 Key=1 Status=1 Created=3 Last used=2 Actions=1`.
- Credentials — S2's defaults turn out to be **exactly** what the later round rates, so no value changed; only the comment, which now cites §4.5 instead of calling them defaults.
- Round 03 §4.6's own three tables keep their ratings; §4.3 restates Projects verbatim and the live table reads `Project=1 Docs=2 Keys=3 Visibility=2 Created=3 Last used=2 Action=1`.

The `## Operator Questions` entry is marked **ANSWERED** in the notebook, naming round 04 as the answer (the same pattern round 05 uses to correct round 04).

## The one mechanism the record left open — decided, and proved live

§4.6 requires "one `sm` Retry" on a failure block that §5.2 designs for a panel, where no `reset()` exists. **Retry is a small client island calling `router.refresh()`** (`documents-retry.tsx`): the panel is server-rendered, so "retry" can only mean "render this route again", and the knowledge client is `cache: "no-store"`, so the refetch really re-hits the API. `useTransition` supplies the busy affordance and the double-submit guard.

**It was not shipped on trust.** A temporary probe made the documents fetch throw whenever a flag file existed. With the flag set: the panel alone became `.kb-panel` at `padding: 0` wrapping `.kb-editorial` with an `<h2>` at **18.4px** (= 1.15rem, §5.2's literal), eyebrow `Error · 500`, one `kb-appbtn--sm` "Try again", **no** `ref` line — while the page frame, all four tiles, the trend and the credentials table stayed up. The flag was then cleared and **Retry alone** brought the five rows back, same URL, `scrollY` unchanged, no navigation. The probe was removed and the file diffed byte-for-byte against its pre-probe copy (`PROBE FULLY REVERTED`).

## The 422

`/projects/not-a-uuid` now renders the **designed 404** — `Not found · 404` / "Project not found" / "Back to dashboard", inside the console shell — instead of the 500 editorial. One status added at one call site; the header comment that claimed "a missing / cross-tenant / **non-UUID** id all map here" was corrected to say what actually happens and why (FastAPI answers 422, not 400, for a malformed UUID path param). `documents/page.tsx` still carries the other half and is S5's.

## Validation detail — round 04 §9

| # | Check | Result |
|---|---|---|
| 1 | `kb-console-r4.css` verbatim, imported after `kb-console-responsive.css`, no token changed | **PASS** — byte-diff clean, `globals.css` line 6, `kb-tokens.css` untouched |
| 2 | Every console page's blocks are children of one `.kb-page-flow`; no page-level `margin-top` | **PASS for the two pages this slice owns.** Dashboard: 6 children, all `margin-top: 0px`. Project: 5 children, all `0px`. `documents/page.tsx` still has two `mt-[var(--kb-space-md)]` and is §4.7 = **S5's**; `graph/page.tsx` has none |
| 3 | 1180 + rail expanded → one column, Keys/Created hidden; folded → 1.7fr/1fr + all seven | **PASS.** Expanded: main **940px**, `.kb-app-cols` = `885.6px` (single track), `Keys=HIDDEN Created=HIDDEN`. Folded: main 1180px, `698.641px 410.984px` (= **1.700**), all seven shown. The window never moved |
| 4 | 390: same six blocks in the same order; trend 96px, not distorted; tables are cards; targets ≥44px; inputs 16px | **PASS with one qualification.** Order identical to 1180; trend exactly **96px**; `tr { display: block }`; `.kb-fieldrow` stacks with Save **321×46**; slug input **16px** / 45px; Copy link and "New key" full width; no horizontal scroll. **Qualification below** on "every target ≥44px" and on "not distorted" |
| 5 | A project row reachable by name **and** by Open; the row itself is not a link | **PASS** — name is an `<a href="/projects/{id}">`, Open kept, `tr { cursor: auto }`, clicking the name navigates |
| 6 | Documents panel with five rows between trend and API keys, linking to `/documents?project={id}`; empty → the one-sentence row | **PASS** — `research` (6 docs) shows exactly **5** rows at flow index 3 of 5; `Title=1 Date=2 Tags=3`; rows link to `/documents/{id}`; the head link navigates to `/documents?project=259228d3-…`; `default` (0 docs) shows the `kb-dtable__empty` row with `DOCUMENTS.list.emptyNoDocuments` |
| 11 | No `@media` rule in `kb-console-r4.css` | **PASS** — 0 |
| 12 | OS dark: console slate, auth gate slate, landing light, nothing written twice | **PASS for what is reachable.** With macOS in dark: console panel surface `rgb(35,32,25)` (slate) at `data-kb-scheme="auto"`; **public shell stays light** (`kb-scheme` absent, surface `rgb(246,242,232)`) — exactly §4.2's requirement; landing light. The **auth gate could not be reached** while signed in (`/login` redirects to `/dashboard`), and its markup is §4.8 = **S5's**; no rule in this round is written twice for dark. OS appearance restored to light immediately |

Items **7-10** belong to `P28.S5` and were not attempted.

### Qualification 1 — "every target ≥44px" (§9 item 4) overreaches the record, again

At 390 the following measure **38px**: the four `Open` buttons, `Copy link`, and `Revoke`. All are `.kb-appbtn--sm`, and round 03 §3 sizes them at `2.4rem` below 40rem on purpose (`kb-console-responsive.css:118`, beside `.kb-appbtn { min-height: var(--kb-tap) }` at 44px on the same line-pair). Round 04 §6 says "Everything Round 03 set at 44px below 40rem still applies" — which these were never set at. So this is §9 item 4's blanket sentence overreaching a verbatim signed stylesheet, exactly as §8 item 3 did for the 33.6px account avatar that P28.S2 reported. **Nothing was changed**: raising it means editing a verbatim record. Filed as an operator question.

### Qualification 2 — the trend's aspect arithmetic at 390 is the record's, and it is off

§4.3 predicts "at 390 the box is 3.7:1 against its native 3.75:1". Measured: **321 × 96 = 3.34:1**. The height is exactly right (the clamp's 96px) — the record's ratio assumed a ~355px-wide box, but the real box is 321px (390 − 2×`--kb-app-gutter-phone` − 2× phone panel padding). With `preserveAspectRatio="none"` that is ~11% of horizontal compression rather than the ~1% the record expected. Visible only as slightly steeper slopes. **Not fixed** — the height is the record's own clamp and nothing else was specified. Reported.

## The finding that matters for `P28.S6`: `graph-r5.css` does **not** win over `graph.css`

Round 05 §3's header states the load order `… → graph-tokens.css → graph.css → THIS`. Loading it from `globals.css` cannot deliver that, and the consequence is now measured rather than predicted. In the running app:

```
0: src_1lezih-._.css        rules=418   ← globals: tokens, console, responsive, r4, graph-r5
1: …app-frame….css          rules=4     ← component-imported
2: …(app)_graph_….css       rules=60    ← component-imported: graph-tokens.css + graph.css
```

Everything in `globals.css` compiles into **one** sheet at index 0, and the component chunks are **later** documents — so `graph.css` out-orders `graph-r5.css` at equal specificity. A source scan finds **9 same-selector/same-property collisions**, and the two top-level ones are the plate's sizing:

- `.kb-graph { height }` — computed **636px** = `calc(100dvh - topbar - 13rem)` from sheet 2, **not** round 05's `clamp(22rem, 100dvh - topbar - 11.5rem, 52rem)` from sheet 0.
- `.kb-graph { min-height }` — computed **480px** (30rem, graph.css), not round 05's 22rem.

The other seven (`.kb-graph-panel` width/padding/top/right, `.kb-graph-legend` width, `.kb-graph-zoom__btn` width/height/font-size, `.kb-graph-tooltip` display, and three font-sizes) sit inside `@container` blocks in round 05 and so are conditional rather than flatly shadowed — but they are in the same position and will lose wherever both apply.

**What DOES work, which is what the phase decision was actually for:** the new `:root` tokens are live (`--kb-graph-h-phone` reads `26rem` off `document.documentElement`), and `.kb-app--public .kb-app-layout { grid-template-columns: minmax(0, 1fr) }` **applies** — that selector exists nowhere in `graph.css`, so the round-04 rail-track trap is closed and reaches the non-graph public pages too. Measured on `/@p28s2/graph` at 1440: `grid-template-columns: 1440px` (one track), main **1408px** (88rem) centred with a 16px gutter each side, no rail, no navbar, no crumb.

So the "transitional graph" this slice was told to expect is **less** transitional than predicted — the plate keeps its round-04 geometry rather than taking round 05's. Nothing here is a defect to fix in S4, and S6 owns the resolution (the obvious one — adding `import "./graph-r5.css"` to `graph-canvas.tsx` after `graph.css`, which is the record's own stated load site — would place a second copy in sheet 2 and restore the order; it is S6's file and S6's call). A note is in `phase.md`.

`kb-console-r4.css` has **no** collision of this kind: checked against `app-frame.css` (the only other component-imported console sheet) — zero same-selector/same-property overlaps.

## Deviations from `plan.md`

1. **Two files outside the plan's list: `dashboard/loading.tsx` and `projects/[projectId]/loading.tsx`** (one line each). Both skeletons drew the trend placeholder at a hard `h-[120px]`, with a comment saying "the real figure is `h-[120px]`". After this slice the real figure is `.kb-trend-wrap` (136px desktop / 96px at 390), so the skeleton would have handed back a 16-24px jump on arrival at exactly the moment the page appears. They now wear `.kb-trend-wrap` too. No new class, no new rule. The rest of those files (their `margin-top`s, which equal the flow's 16px gap anyway) was left alone — the four skeletons are round 03 §5.4's and are not this round's to restructure.
2. **`org-slug-form.tsx`'s Save converted to the busy affordance.** The plan names only `visibility-toggle.tsx` for this, but round 04 §6 states the rule for the round's controls ("Busy controls: `aria-busy`, never `disabled`") and this slice rewrites that form anyway for §4.3. It is now `<AppButton busy={pending}>` with the double-submit guard in the form's `onSubmit`. The input keeps its `disabled={pending}` (§6's rule is about controls that stay in the tab order mid-action; the record says nothing about the field, and nothing was invented for it).
3. **Two container utilities on the visibility toggle.** §4.5's phone rule is `.kb-pageframe__status > .kb-appbtn { flex: 1 1 auto }` — a **direct-child** selector — but this island's button is one level down inside its own `<form>` (which it needs, for the server action). Rather than write a rule or fork the record, the form takes `@max-[40rem]:flex-auto` and the button `@max-[40rem]:w-full`. Both only **add** properties the `.kb-*` classes never set (`.kb-appbtn` declares neither `width` nor `flex`), which is the phase's cascade rule, and both compile to `@container` queries against `kbmain` — the same container §4.5's own rule uses. Measured at 390: chip 57px left, toggle **291×44** taking the rest of a 356px row, hint `order: 3`, `flex: 1 0 100%`, left-aligned, on its own line. Exactly the designed layout.
4. **The failure block's copy.** Round 04 §7 forbids adding a string and §5.2 ships none of its own, so the block reuses `STATES.error` (round 03's, originated by P28.S3) verbatim. Its last clause — "…the reference below tells us where it stopped" — refers to a `ref` line that a **panel** never renders (there is no `digest` for a caught fetch error). Rather than author a panel-specific sentence, the existing copy stands and the mismatch is an operator question.

## Observations, not findings

- **The status column's hint sits ~30px below the toggle, not tight under it.** `.kb-pageframe__status` has a `0.5rem` gap, but the toggle island always renders `.kb-field__error` (min-height 1.1rem, reserved so an error moves nothing) between its button and the hint. The record draws the hint directly under the toggle. Visible in the desktop screenshot; the fix would be to unreserve the error slot, which would reintroduce the layout jump the reservation exists to prevent. Left alone.
- **`Tags` disappears from the project documents panel at 390.** It is priority 3, and round 03's rule hides priority 3 below **64rem** of `kbmain` — including in the stacked card form, where `data-label` would otherwise have shown it. That is round 03's rule applying exactly as it does on the documents page, not anything this panel does.
- The busy affordance was caught mid-flight by polling at 15ms: `aria-busy="true"` + `.kb-appbtn__spin` + "Saving…" + `disabled=false`, with focus still on the button — on both the visibility toggle and the slug Save. The project's visibility was toggled to Public and **restored to Private**; the slug was re-saved with its own unchanged value.

## Commands

```
pnpm --dir web typecheck            PASS   (×2)
pnpm --dir web lint                 PASS   (×2)
pnpm --dir web test                 PASS   16 files / 88 tests (×2)
pnpm --dir web build                PASS   standalone, 21 routes
grep -nE '^[[:space:]]*@media' web/src/app/kb-console-r4.css   → 0
aside repl --account u1 …           dev :3030 and production standalone :3040
```

## Notes recorded elsewhere

- `phase.md` `## Doc impact` — one line (frontend / experience / product).
- `phase.md` `## Decisions` — the Retry mechanism, the sheet-order finding, the tap-target reading.
- `phase.md` `## Operator Questions` — the §4.6 priority entry marked **ANSWERED**; three new entries (the `sm` tap floor, the trend's 390 aspect arithmetic, the panel failure sub-line).
- `phase.md` `## Notes for later slices` — for `P28.S5` (the §4.4 seam, what is left in place) and for `P28.S6` (the measured sheet-order collision).
- Two notes were **consumed** and removed: P28.S3's "two things waiting for you" and the DECOMP+S2 note for S4.
