# P28.S2 — result

- **status:** `done`
- **summary:** Round 03's foundation is applied: §2's tokens appended and §3's `kb-console-responsive.css` created **byte-identical** to the record, imported at `globals.css` line 5; the shell gained the skip link, the one `.kb-navbar` and the phone account disclosure; `.kb-pageframe` / `.kb-app-cols` / `.kb-searchbar` / `data-pri` + `data-label` / the `AppButton` busy affordance landed; and §8 items **1–8 and 10** were verified in the operator runtime with Aside at 390×844 · 768×1024 · 820×1180 · 1024×768 · 1400/1440/1500/1800, plus the production build. Three record-internal gaps are reported, never papered over.
- **files_changed:**
  - `web/src/app/kb-tokens.css` (§2 appended verbatim + the mandated `/* @kind other */` note)
  - `web/src/app/kb-console-responsive.css` (**new**, §3 verbatim)
  - `web/src/app/globals.css` (the import, line 5)
  - `web/src/components/app-shell/app-shell.tsx`, `app-frame.tsx`, `rail-nav.tsx`, `logout-button.tsx`, `index.ts`
  - `web/src/components/app-shell/navbar-nav.tsx` (**new**)
  - `web/src/components/ui/data-table.tsx`, `app-button.tsx`, `field.tsx`
  - `web/src/app/(app)/dashboard/page.tsx`, `documents/page.tsx`, `graph/page.tsx`, `projects/[projectId]/page.tsx`
  - `web/src/content/app.ts`, `web/src/content/project.ts`
  - `works/phases/active/P28/phase.md`, `works/phases/active/P28/slices/P28.S2/result.md`
  - **not touched, as the record orders:** `web/src/app/kb-console.css`, `web/src/components/app-shell/app-frame.css`
- **validation:**
  - `pnpm --dir web typecheck` — **pass**
  - `pnpm --dir web lint` — **pass**
  - `pnpm --dir web test` — **pass** (16 files, 88 tests)
  - `pnpm --dir web build` — **pass** (compiled, TypeScript clean, all 21 routes)
  - `python3 scripts/workflow.py validate` — **pass** (only the pre-existing `unknown kind` / `oversized_doc_sections` warnings)
  - Round 03 §8 items **1–8 and 10** — **pass**, with three reported record gaps (below). Item 9 is `P28.S3`'s and was not attempted.
  - Real browser: **Aside**, `aside repl --account u1` (never `u0`), in the `## Operator Runtime` dev runtime (`pnpm --dir web dev` → `127.0.0.1:3030`, API `127.0.0.1:8766`) **and** the production build (`pnpm --dir web build`).
- **deviations:** five, all recorded as `## Decisions` lines in `phase.md` — see *Deviations from the record* below.
- **doc_impact:** one line appended to `phase.md` (`frontend.md`).
- **no test file written** — this slice is structural/cosmetic surface, verified live (plan's *Tests*). Nothing here was a behaviour change wanting a test.

---

## What landed, section by section

**§1 / §2 / §3 — the files.** Both stylesheet payloads were extracted **programmatically from the contract's own fences**, never retyped:

- `kb-console-responsive.css` is **byte-identical** to §3 (19,768 bytes on both sides, asserted in Python).
- `kb-tokens.css` **ends with** §2 verbatim. `git diff` against `HEAD` shows exactly two hunks: `@@ -82 +82 @@` (the one mandated change, `--kb-ease: 0.15s ease;` → `… /* @kind other */`) and `@@ -191,0 +192,53 @@` (the appended block). **No other line above the block changed** — §8 item 1 proved, not asserted.
- The import sits at `globals.css` **line 5**, immediately after `kb-console.css`, for the two hard reasons in the plan. Confirmed in the running app: everything imported from `globals.css` compiles into **one** sheet, and inside it the `.kb-dtable tbody tr:hover` (kb-console) rule is index **107** while the `@container kbapp` block is index **172** — source order decides, and the responsive layer is later. §8 item 2 proved.

**§4.1 shell.** `.kb-app` now carries `data-kb-scheme="auto"` and opens with `<a class="kb-skip">`; the navbar renders between the topbar and `.kb-app-layout` at every width. Two deliberate readings, both below.

**§4.2 topbar.** `.kb-topbar__signout` is a new class on the existing sign-out button; the phone `<details class="kb-account">` renders at every width (CSS decides) with the email, `Org <b>{name}</b>` and a second sign-out. `LogoutButton` grew `variant` / `className` props so **one** island serves both placements — the logout behaviour is still written once. The Tailwind `sticky top-0 z-20` came off the header: `.kb-topbar` in §3 owns sticky/top/z-index (40), so the topbar and the tablet navbar (z-index 20) now stack from one source.

**§4.3 navbar.** New `components/app-shell/navbar-nav.tsx` — a client island for the same reason the rail is one (`usePathname`), same `APP_NAV` source, no icons, `aria-current="page"`. It never measures a width and never writes `data-rail`.

**§4.4 page frame.** `.kb-pageframe` on the **four `(app)` pages only** — the identical eyebrow/title/sub triple on four `(public)` pages was left alone (a grep-driven conversion would have over-reached). Every `style={{ marginTop: "0.35rem" }}` on the h1 is gone. Where the actions slot is not buttons it is wrapped **as it is** — but in its own child element, because `.kb-pageframe__actions` is unlayered and would beat a Tailwind `flex-col` on the same node.

**§4.5** `.kb-app-cols` replaces the dashboard's inline `1.7fr/1fr` grid.

**§4.6 tables.** `DataTableColumn.priority?: 1 | 2 | 3`, **optional, default 1**; `data-pri` on every `<th>` and `<td>`; `data-label` on `<td>` except the first column and **`column.actions === true`**. Priorities are §4.6's, verbatim, on the three tables it rates.

**§4.7 fields.** The only change needed: `Textarea`'s inline `minHeight`/`resize` pair is gone, so `textarea.kb-field__input` in §3 owns the box instead of losing to an inline style. `<select>` already wears `.kb-field__input` (the new chevron is live and measured). The error paragraph was already always-rendered and `aria-invalid`/`aria-describedby` were already wired by every caller.

**§4.8 search.** The form is `.kb-searchbar` with `.kb-searchbar__field` / `.kb-searchbar__filter` cells; the single `min-[720px]:` (the app's **last** width media query) is deleted — `grep -rn "min-\[720px\]" src/` now matches only a comment.

**§4.9 buttons.** `AppButton` gained `busy` — `aria-busy="true"` plus a leading `.kb-appbtn__spin`, and deliberately **not** `disabled`. The **primitive only**: all ~18 hand-written `appButtonClass(...)` call sites are untouched, and `appButtonClass`'s exported signature is unchanged.

**§6 scheme.** `data-kb-scheme="auto"` on the console root only. Verified with the OS actually in dark mode (flipped via `osascript`, restored immediately — the machine is back to light, asserted).

**§7 floor.** Focus ring, both focus orders and the hidden-rail/hidden-thead techniques verified live (below).

---

## Deviations from the record — each decided, recorded, never silently papered over

1. **`main#main-content`, not `main#content`.** §4.1 writes `main#content` / `href="#content"`. The repo's `<main>` has been `id="main-content"` since P12 and it is the target of `SKIP_TO_CONTENT.href` in `content/nav.ts`, **shared with the marketing header's skip link**. Kept `main-content` and pointed `.kb-skip` at the same constant: identical behaviour, one target, no forked copy string. Verified live — focusing the skip link reveals it at `top: 9.6px` (0.6rem, z-index 60) and activating it sets `location.hash = #main-content` on the real `<main>`.
2. **The search form keeps its non-JS mechanism.** §4.8's snippet draws only the field and the filter. Today's form is a plain `method="GET"` whose hidden passthrough inputs and submit/reset pair **are** the entire no-JS search path. Both cells were applied and the `min-[720px]:` utilities deleted as ordered; the buttons stay as a **third child** of `.kb-searchbar`, unstyled, until round 04 §4.7 gives them `.kb-searchbar__actions` in `P28.S5`. **No rule was added to the verbatim sheet.** Search still round-trips as a plain GET (verified: a live submit navigates and re-renders).
3. **`DataTableColumn.priority` is optional with a default of 1.** `version-history.tsx` (a fifth caller, `P28.S7`'s file) therefore compiles untouched, and any column the record does not rate keeps exactly today's always-visible behaviour.
4. **The `data-label` exemption keys off `column.actions`, not "last column".** Two action columns pass `header: <span className="sr-only">…</span>`, which cannot be stringified. Non-string headers anywhere are skipped for the same reason rather than rendered as `[object Object]`.
5. **A second nav label key.** `APP_SHELL.navLabel` ("Primary") was the **rail's** label. §4.1 gives "Primary" to the navbar and "Sections" to the rail, so `railNavLabel: "Sections"` was added and `rail-nav.tsx` moved to it — otherwise the page would ship two nav landmarks both named "Primary". Both strings are the contract's, so this is not new copy. (`accountMenuLabel: "Account menu"` was added for §4.2's summary, likewise the contract's string.) Verified live: rail `aria-label="Sections"`, navbar `aria-label="Primary"`.
6. **The inline `minHeight` on `.kb-app-layout` is gone** (§3 makes `.kb-app` a `100dvh` flex column with `.kb-app-layout` as its `flex: 1 1 auto` child). Proof it mattered: at 390×844 the document's `scrollHeight` is now **844** — exactly the viewport — with the navbar occupying the 58.6px below `.kb-app-main`. With the old inline `calc(100dvh - var(--kb-app-topbar-h))` the page would have been one navbar taller than the screen, permanently.
7. **The `/` hint in §4.8 was NOT added.** The record says "The `/` hint stays in the DOM", but no `.kb-appsearch__key` span exists in this repo and there is no `/`-focuses-search keybinding (`grep` finds none). Adding the glyph would advertise a shortcut the product does not have — inventing a behaviour claim. Reported, not invented. (`DOCUMENTS.search.hint`, the mono line under the form, is a different, existing element and is untouched.)
8. **The project page's eyebrow.** `PROJECT.header.eyebrow` was the literal `"Org · Project"`. §4.4 requires the **real org first**, so the value is now `"Project"` and the page renders `{tenantName} · {eyebrow}` like every other console page — the same shape, the same words, the literal placeholder replaced by the actual org. `identity` comes from the page's existing `cache()`d `requireIdentity()` call, so it costs no round-trip. Verified live: `default · Project`.

---

## Three record gaps — reported, each on `phase.md`'s `## Operator Questions`

1. **§8 item 3's "every target >=44px" vs §3's own `.kb-account > summary`.** The verbatim stylesheet sizes the phone account avatar at `2.1rem` square = **33.6px**, measured. §7's touch-target row enumerates "buttons, inputs, checkboxes and nav links" — a `<summary>` is none of those — so §7 and §3 agree with each other and only §8's blanket phrasing overreaches. Everything §7 actually lists measures ≥44px (navbar links 57.6, primary buttons 44.0, `.kb-field__input` 45.2, the disclosure's own sign-out 44.0). Raising the avatar would mean editing the verbatim sheet, so it was not done.
2. **iOS zoom on the search box.** §7 says "Inputs are 16px below 40rem. Non-negotiable." §3's phone block raises only `.kb-field__input`; the search field is `.kb-appsearch__input` (0.9rem), measured at **14.4px** at 390. iOS will zoom the page when it is focused. Giving it `.kb-field__input` would repaint it with a border and background — a visual decision. Not made.
3. **§4.6's priority table covers three tables; the repo has four.** The dashboard's **org-keys** table is not rated at all and the credentials table's **Name** column has no priority. Per the plan, everything the record does not assign **defaults to priority 1** (always visible) — exactly today's behaviour, nothing invented.

## Four more findings — reported only, no question attached

4. **§8 item 8's third clause is already false in this repo, and round 03 is not why.** The console does go slate in OS dark (`--kb-paper #1a1815`, `--kb-ink #ece4d7`, `--kb-accent #62bdb2`, primary-button ink `#16130f`) and the auth gate stays slate in **both** OS schemes with no `data-kb-scheme` — both verified with the OS actually in dark mode. But the **landing page does not stay light**: `(marketing)/layout.tsx` carries a pre-existing inline `SCHEME_SCRIPT` that sets `#mkt-root` to `slate` when the OS is dark. That predates round 03 and round 03 cannot reach it — `<html>` stays `default`, the landing renders no `.kb-app`, and the dark block is scoped to `.kb-app[data-kb-scheme="auto"]`. Rounds 01/02 are **reported, never redesigned**.
5. **The survey's unverified inference is confirmed, and the sheet's own header is wrong about it.** In the built app `app-frame.css` is its **own chunk that loads AFTER the globals chunk** (`document.styleSheets[0]` = the globals chunk, `[1]` = `…app-shell_app-frame_0hx-ecg.css`), contradicting §3's header comment "Load order: kb-tokens.css → kb-console.css → app-frame.css → THIS". It is **harmless**: no equal-specificity tie exists between the two sheets — `[data-rail="collapsed"]` is (0,2,0) against the responsive layer's (0,1,0) (container queries add no specificity), the `> .kb-rail` pair sets the same value, and `.kb-appbtn.kb-railtoggle` touches padding/colour where the responsive layer touches `display`. Proved by behaviour: the fold works at 1440 and the rail hides at 390/768. The sheet is verbatim, so the comment stays; **later rounds must know** that every `globals.css` sheet (`kb-console-r4.css`, `graph-r5.css`, `kb-docview.css`, `kb-print.css`) will likewise load **before** `app-frame.css`.
6. **`P28.S3`'s §8 item 9 arithmetic slip, confirmed:** the tree holds **six** `not-found.tsx`, not seven, and **zero** `error.tsx` / `loading.tsx`.
7. **Round 03 adds no unguarded motion, and there was no gap to close.** Three animations exist in the whole console: `.kb-reveal-in`/`kb-rise` and `.kb-appbtn__spin`/`kb-spin` (both inside `@media (prefers-reduced-motion: no-preference)` in the verbatim §3 sheet) and `.kb-skel`/`kb-skel-pulse`, which `kb-console.css:172` already turns off under `(prefers-reduced-motion: reduce)`. So `P28.S3`'s skeletons inherit a working guard.

---

## The browser pass — instrument, runtime, and what each §8 item actually proved

**Instrument: Aside**, `aside repl --account u1 "<js>"` over Bash, executor-driven. `u0` (the operator's signed-in Google profile) was never used. `snapshot()` threw in this build; everything below is `page.evaluate` reading **computed styles and measured rectangles**, plus `page.keyboard` / `page.locator` for the interaction walks and three screenshots I looked at.

**Runtime: the manifest's, brought up from scratch** (there was no `.env.local` and nothing was listening on 3030/8766):

```
docker run -d --name kb-p28s2-pg -e POSTGRES_DB=kb -e POSTGRES_USER=kb \
  -e POSTGRES_PASSWORD=kb -p 55432:5432 postgres:17
DATABASE_URL="postgresql+psycopg://kb:kb@127.0.0.1:55432/kb" uv run alembic upgrade head   # 0001..0005
DATABASE_URL=… KB_ROOT="$PWD" KB_STARTUP_REINDEX=0 TZ=Asia/Seoul \
  uv run uvicorn server.main:app --host 127.0.0.1 --port 8766
web/.env.local  <-  KB_API_BASE_URL=http://127.0.0.1:8766 + a throwaway SESSION_SECRET  (gitignored)
pnpm --dir web dev                       # -> http://127.0.0.1:3030
```

Fixtures: one account (`p28s2@example.com`), four projects, one org key, six ingested documents, an org slug `p28s2` and one public project — so every table under test had real rows and the anonymous public surface was reachable. Signed in through the **real login form**, not by forging a cookie.

**The viewport recipe** (this slice's other deliverable) is written into `phase.md`'s `## Notes for later slices` in full. The short version: Aside's repl runs at a **fixed 1440×900** viewport — `page.viewportSize()` is a getter, there is no `setViewportSize`, no `emulate*`, no reachable CDP handle (`page.cdp` reads `undefined`), `window.resizeTo` is a no-op, and the `chrome` global exposes no extension API — so narrow viewports come from a **same-origin iframe harness behind a throwaway proxy** (`/tmp/p28s2/vpproxy.py`, ~110 lines) that serves both the harness page and the proxied app from `127.0.0.1:3031` and strips the app's global `X-Frame-Options: DENY`. Cookies ignore the port, so the session rides across unchanged. `http://127.0.0.1:3031/__vp?w=390&h=844&path=/dashboard` yields a **true** 390×844 CSS viewport — `dvh`, `@media`, `env()` and container queries all resolve against it — fully readable from the parent via `document.getElementById('vp').contentWindow.document`.

**Its one limitation, found and characterized:** React does not reliably hydrate inside the harness (my proxy does not carry Next dev's HMR websocket). **Layout and computed styles are trustworthy there; interaction is not.** Every interactive claim below was therefore driven at the **top level** on `127.0.0.1:3030` at the native 1440×900.

### Item-by-item

| § | Verified how |
|---|---|
| **1** | `git diff` on `kb-tokens.css`: two hunks only — the mandated `@kind other` note and the 53-line §2 block; Python assert that the tail is byte-equal to the contract fence. |
| **2** | Python assert: the file is byte-identical to §3 (19,768 = 19,768). `globals.css` line 5. In the running app the console rule sits at sheet-0 index 107 and the responsive block at 172. |
| **3** (390×844) | Navbar `display:grid`, `position:sticky`, `bottom:0`, `order:2`, rect bottom **844** = viewport bottom, and **still 785→844 after scrolling to y=766**. Rail `display:none` (out of the a11y tree, not `visibility`), toggle `none`, crumb/user/divider/`__signout` all `none`. Account disclosure `display:block`, avatar "P", `aria-label="Account menu"`, opens **natively with JS absent from the equation**, menu 240px with its right edge at 373 inside a 390 viewport, its sign-out 44.0px tall. Tiles `172.6px 172.6px` (2-up). Tables: wrapper `overflow:visible` + `border:0`, `table{display:block}`, `thead{position:absolute; clip-path:inset(50%)}` (visually hidden, **still in the a11y tree**), `tr{display:block}`, `td{display:flex}`, first `<td>` carries no `data-label`, the second renders `::before` content `"Docs"`. Page-frame `flex-direction:column`, actions **356.4px = full width**, its button 356.4px. Main padding `17.6/16.8/25.6` = 1.1/1.05/1.6rem. Title 22.5px on the fluid ramp. `scrollHeight === innerHeight === 844`, no horizontal overflow on any of the four console pages. Targets: see gap #1. |
| **4** (768×1024, re-run at 820×1180) | Navbar `position:sticky; top:56px` (exactly the topbar height), `grid-auto-flow:column`, `grid-auto-columns:max-content`, `justify-content:start` — the sticky strip. Rail and toggle `none`, account `none`, sign-out `flex`, `.kb-topbar__user` capped at 176px = 11rem. **Every `[data-pri="3"]` header computes `display:none`; every 1 and 2 computes `table-cell`.** Main padding `21.6/22.4/35.2`. |
| **5** (1024×768) | `grid-template-columns: 240px 784px` — the **rail is back** at 15rem — navbar `display:none`, toggle `display:flex`. The `kb_rail` fold itself verified at the native 1440: clicking the toggle flips `data-rail` expanded→collapsed→expanded, the rail's computed `display` follows, the grid collapses to `1440px`, `aria-expanded` flips, and the `kb_rail` cookie is written each time — **exactly as before this round**. |
| **6** (≥1440) | At 1440 and 1500: `max-width: 1408px` (88rem) and padding `32/38.4/48` (2rem / **2.4rem** / 3rem). Centring proved at 1800, where the main track is wide enough to bite: main is **1408px** at `left: 316px` = 240 + (1560−1408)/2. |
| **7** (the container-query proof) | One live resize, rail **expanded** throughout. **1400 →** main 1160px, `.kb-app-cols` = `686.0px 403.6px` (two columns). **1100 →** main 860px, `.kb-app-cols` = `805.6px` (**one** column). The window crossed no breakpoint; `kbmain` crossed 64rem because the 15rem rail is in the way. A viewport `lg` query would have kept two columns in 860px. |
| **8** | OS flipped to dark with `osascript`, three surfaces read, OS restored (asserted back to light). Console: `.kb-app` bg `rgb(26,24,21)`, `--kb-paper #1a1815`, `--kb-ink #ece4d7`, `--kb-accent #62bdb2`, primary-button colour `rgb(22,19,15)`. Auth gate at `/login` (signed out for the read, then signed back in): `data-md-color-scheme="slate"`, **no** `data-kb-scheme`, bg `rgb(26,24,21)` — and identical in OS **light**, i.e. always dark. Landing: see finding #4. |
| **10** | Could **not** force `prefers-reduced-motion: reduce` — `defaults write com.apple.universalaccess reduceMotion -bool true` did not reach the browser live (`matchMedia` stayed `false`); the key was deleted again and the domain is back to not-present. Verified instead by **enumeration + source audit**: across every element on the rendered console, `animation-name` is `none` **everywhere** (0 of ~all elements animating) and the only non-zero transitions are `top | 0.15s`, `color, background, border-color | 0.15s`, `background | 0.15s`, `border-color, box-shadow | 0.15s`. All three console keyframe animations are reduced-motion-guarded in source (finding #7). Nothing can move under `reduce` except those 150ms colour fades. |
| **§7 a11y** | **Desktop tab walk (native 1440):** skip → rail toggle ("Navigation") → brand → Sign out → Dashboard → Documents → Graph → content — §7's desktop order exactly, every stop showing `outline: 2px solid rgb(15,111,102)` at `offset: 2px`. **Phone tab walk (harness 390):** skip → brand → account summary → Dashboard → Documents → Graph → content — §7's phone order exactly; the rail toggle and the wide sign-out are `display:none` and correctly absent. Skip link: `top:-3rem` at rest, `top:0.6rem` focused, z-index 60, targets the real `<main>`. |

### The `(public)` shell, looked at rather than assumed

Viewed anonymously (signed out, then signed back in) at 1440 and 390 on `/@p28s2/research/…`. It is **unpolished, not broken**, exactly as the plan predicted: the fluid ramp, the 88rem cap (main 1408px, centred at `margin-left: 16px`), the 2.4rem wide gutter and the phone gutters all reach it with no markup change, and its "Sign in" button is correctly **not** hidden on a phone (it carries no `.kb-topbar__signout`). The one artefact: with no `.kb-app-layout`, `.kb-app-main` is a flex child at `flex: 0 1 auto` inside the new `min-height: 100dvh` column, so ~250–370px of **paper-coloured** space sits below the content on a short document. Same colour, no gap line, no overflow — cosmetic, and `public-shell.tsx` is round 04 §4.2's file in `P28.S4`. Recorded as an expected transitional state; **no out-of-scope file was edited and no rule was added to the verbatim sheet.**

### Two transitional states handed to `P28.S5`

- The search bar's **third child** (submit + reset) is an unstyled `flex items-center gap-2` row that sits left-aligned under the stacked field and filter on a phone. Round 04 §4.7 gives it `.kb-searchbar__actions`.
- The documents table's **Delete** control does not stretch to the card width at 390: `.kb-dtable tr > td:last-child .kb-appbtn { width: 100% }` resolves against `delete-document-button.tsx`'s own `inline-flex` wrapper form, so it measures 57.7px. That file is `P28.S5`'s under round 04 §4.7; the record's rule is correct and the wrapper is what will change.

### Prettier / D22

`prettier --write` was **never** run on an existing web file. Two files were prettier-**clean** at `HEAD` and my edits made them dirty (`app-shell.tsx`, and the new `navbar-nav.tsx`); each was formatted on a **temp copy** whose diff was inspected first and confirmed to touch only the lines I had just added, then copied back. `graph/page.tsx` got the same treatment for the one block I re-nested. The three files that were already prettier-red at `HEAD` (`dashboard/page.tsx`, `documents/page.tsx`, `projects/[projectId]/page.tsx`, plus `data-table.tsx`, `rail-nav.tsx`, `content/project.ts`) were **left red** — their new blocks were indented by hand instead, so no repo-wide formatting drift entered this commit.

### Runtime left behind

The disposable accounts Postgres (`docker` container **`kb-p28s2-pg`**, host port 55432) and the gitignored `web/.env.local` are **left in place** so `P28.S3` can bring the runtime up in seconds; the uvicorn, `next dev` and harness-proxy processes were stopped. The full recreate recipe — container, migrations, env file, fixtures, harness — is in `phase.md`'s `## Notes for later slices`, together with `/tmp/p28s2/vpproxy.py`'s source shape. Nothing in the repo depends on any of it.
