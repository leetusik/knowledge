# P30.F6: result

## Verdict

- **status:** done
- **tier:** high
- **model:** opus
- **effort:** high
- **summary:** Fixed R3. Next's scroll handler never scrolled between chapters: it picks the hoisted reader stylesheet in `<head>` as the segment's first node and gives up. The reader now decides one landing per page (hash, then `?note=`, then resume, then top) and sends no position, beacon or finish until that landing settles. Checked live on the production build, signed in and out. Every chapter-to-chapter path lands at y 0, or at the resume. The next chapter's server row is `started` at fraction 0, never `finished`.
- **files_changed:**
  - `web/src/lib/reader/position.ts`
  - `web/src/components/reader/use-reading.ts`
  - `web/tests/reader-position.test.ts`
  - `works/phases/active/P30/phase.md`: Now, Decisions, Doc impact, and Notes for later slices
  - `works/phases/active/P30/slices/P30.F6/result.md`
- **validation:**
  - `pnpm --dir web typecheck`: PASS
  - `pnpm --dir web lint`: PASS
  - `pnpm --dir web test`: PASS (37 files, 395 tests: 388 + 7 new)
  - `pnpm --dir web build`: PASS
  - `python3 scripts/plugin_parity.py`: PASS
  - `python3 scripts/skills_parity.py`: PASS
  - `python3 scripts/workflow.py validate`: passed (pre-existing warnings only)
  - the server is unchanged, so the server suite was not run
- **deviations:**
  1. More than one sign-in. There were 4 BFF sign-ins over CDP: one was spent on a run that a script bug broke, and the session cookie did not survive a Chrome restart. Aside signed in once more. I restarted my own `next start` before the Aside sign-in, so the BFF's 5-per-process limit was never hit. The scratch API ran with `KB_AUTH_RATE_LIMIT=200`. No 429 was seen.
  2. I published one extra chapter to the scratch book: a 12-part `long-legacy` html chapter, so the legacy reader actually scrolls. It was needed for the legacy ↔ native checks.
  3. The dev-clone check ran signed out only. The signed-in run used the production build.
- **doc_impact:** `frontend.md, qa.md: P30.F6 — the reader lands once when a page opens (#section, ?note=, resume, top; on a navigation inside the app; the document's own first load keeps the browser's place) and sends no position, beacon or finish until that landing settles (first input, or fonts in and 1 s, at most 3 s); qa.md gets one checklist line, "Next opens the next chapter at its top, not Finished", which the review writes (P30.F6)`

## The real cause

The probe was the unfixed production build (`next start :3994`) driven by headless Chrome over CDP. I wrapped `getComputedStyle`, `scrollIntoView`, the `scrollTop` setter and `window.scrollTo`, then clicked Next from `all-blocks` at y 1500:
- Next's `InnerScrollAndFocusHandlerOld` (`next/dist/client/components/layout-router.js`, Next 16.2.10; the `appNewScrollHandler` flag is off by default) calls `findDOMNode` on the `[chapter]` segment.
- What it gets back is the segment's `<link rel=stylesheet data-precedence=next>`, which React 19 hoisted into `<head>`. That is the reader CSS imported by `reader-frame.tsx`.
- It skips zero-size nodes and walks `nextElementSibling` through `<head>`: `gcs LINK… SCRIPT… META… TITLE… LINK in HEAD`. At the end of `<head>` it returns without scrolling. There was no `scrollTop = 0` and no `scrollIntoView`.
- `write-lock` opened at y 1500. The loading skeleton briefly clamps the scroll to y 50 on some paths.

So the page opened at the old position, and the opening `touch(); measure()` in `useReading` sampled it:
- from the old chapter's end, the end sentinel was in view, so `finished: true` and fraction 1 were written for the new chapter;
- from mid-way, an inflated `max_fraction` was written.

`use-reading.ts` itself never scrolled to the top: its resume effect returned early for a chapter that was not `started`. Neither `loading.tsx` nor the fixed `.rd-line` / `.rd-skip` is the cause. Next never reaches `.rd-root`, because the stylesheet comes first.

The same Next behaviour hits any page whose segment brings its own CSS. **The book page does it too**: from a chapter at y 3800, the top bar's back link opened the book page at its clamped end (168/168 at 1440×420). That is outside F6's scope, so it is listed under *Deferred-job candidate* below.

## The fix

- **`web/src/lib/reader/position.ts`** (pure):
  - `landingFor({hash, note, resume, navigated})` returns `hash`, `note`, `resume`, `top`, or `stay`. `stay` means the document's own first load, so the browser keeps its place on a reload.
  - `landingSettled({elapsed, fontsReady, input})`:
    - settled at the reader's first wheel, touch, key or pointer;
    - otherwise once the fonts are in and `LANDING_SETTLE_MS` = 1000 has passed (F4's hash retries end at 900 ms);
    - at the latest after `LANDING_MAX_MS` = 3000.
  - `touchCadence(c, {settled, allowed, now})`: a scroll becomes a pending position only once the landing has settled.
  - `onLook(state, {settled, seen, version, allowed})`: before settling it changes nothing, not even the end's in/out. After settling it is `onEndChange`, plus whether a hold lifted.
- **`web/src/components/reader/use-reading.ts`**:
  - S15's resume effect became the one-shot landing effect (`decided` ref, so a `router.refresh()` no longer re-lands).
    - Resume eligibility is S15's: a member on the newest version, `started` or a hash whose section is missing, and a block or a fraction to go to. The pill rule is unchanged.
    - On a navigation inside the app it first resets to y 0 with `quiet()`, so F5's 450 ms ignore applies. The owner then lands: F4's `useHashLanding` and S21's `?note=` landing run after it in the same commit; the resume lands here, with S15's font re-land.
    - `openedByNavigation`: the first reader page at the address of the document's `PerformanceNavigationTiming` entry is the first load. Every later page is a navigation. The claim is held by a per-instance ref, so StrictMode's double effects give the same answer.
  - A settle watcher (input listeners, two timers, `document.fonts.ready`) sets `settled`, then runs the cadence's opening `touch(); measure()` where the page actually landed.
  - `onScroll`, `measure`, `touch` and `beacon` are all gated on `settled`, so before it nothing is queued, sampled, finished or beaconed. The unmount beacon has nothing pending, and `last` is never sampled early.
  - Mark as finished / unread stay immediate: they are the reader's own action.
- Not changed:
  - `reader-frame.tsx`, `use-hash-landing.ts`, `annotations.tsx`;
  - the legacy reader: its window does not scroll, and the bridge's restore lands inside a fresh frame;
  - the chrome rules (F5).
- I fixed it in the reader, not by turning on `experimental.appNewScrollHandler`. The rule says the reader decides its own landing, and an experimental flag would change scroll and focus handling for every page in the app. That is recorded on `## Decisions`.

## Tests (core: saved reading state)

`web/tests/reader-position.test.ts` has 7 new tests:
- the landing order (hash, then note, then resume, then top) and `stay` for a first load;
- settling: input, fonts plus 1 s, the 3 s cap;
- `touchCadence`: no pending position before settling;
- `onLook`: an unread chapter opened at the previous chapter's end is not finished before settling, and its state does not move. Landed at the top, it is not finished. Read to the end, it finishes once.
- a short chapter whose end shows where it landed still finishes;
- a hold lifts only after the landing.

## Live check

**Runtime:** see `topics/surface-slice-rules.md`. `:8766` and `:3030` were never used or stopped.
- scratch API `:8792` (PID 72832), with:
  - `KB_ROOT` = a scratchpad git repo;
  - `DATABASE_URL` = the database `kb_f6live` in `kb-p28s2-pg`, migrated 0001 → 0006;
  - `KB_GIT_COMMIT=false`, `KB_STARTUP_REINDEX=false`;
  - no Gemini keys.
- Member `f6-member@example.com`, signed up with `POST /auth/signup`. Its org has no slug, so the URLs use `@65160eb1-…`.
- The org-level `vk_` key came from `POST /app/credentials`. `scripts/publish_fixture_book.py --base-url http://127.0.0.1:8792 --token <vk_>` published the book.
- `PATCH /app/projects/<fixtures id> {"visibility":"public"}`.
- An extra 12-part `long-legacy` html chapter at position 4 (`knowledge save … --format html --chapter long-legacy`).
- A block note on `write-lock` / `lock-quiz` (`POST /app/reader/annotations`) for `?note=`.
- Servers:
  - the unfixed production build `next start :3994` (PID 72967) for the probe;
  - the fixed build `next start :3992` (PIDs 73683, then 75325);
  - a dev clone (`rsync` of `web/` minus `.next` into the scratchpad) running `next dev localhost:3993` (PIDs 74990/74997);
  - `next start` used `KB_API_BASE_URL=http://127.0.0.1:8792` and a scratch `SESSION_SECRET`.

**Instruments:**
- Headless Chrome over CDP, with a minimal driver written for this slice: true 1440×900 metrics (1440×420 for the book page), DOM clicks and `Input.dispatchMouseEvent` wheels into the legacy frame. It captured Network POST bodies carrying `fraction`, plus console, log and exception output.
- Aside `aside repl --account u1` at 1440×900, with real `mouse.wheel`, clicks, the `End` key, and a real form sign-in.
- `psql` against the scratch database for the position rows.

**Cleanup:**
- I stopped exactly my PIDs: 72967, 73683, 75325, 74990 and 74997, 72832, and the kept Chrome 74713 with its children. The per-run Chromes exited with their scripts.
- I dropped `kb_f6live`.
- Afterwards `:3030` (8452) and `:8766` (66506) were still listening.

### Before the fix (unfixed build, CDP, signed out)

`all-blocks` at y 1500, then Next: `write-lock` at **y 1500** of 2201. This matches R3's table (end → 2248, Contents → 1500, signed-in `finished: true`).

### After the fix: production build, CDP, 1440×900

Each row is one navigation from `all-blocks` (max 8816 signed out, 8856 signed in) to `write-lock`. In signed-in runs the positions table is cleared before each row. "Posts" are the position writes sent after the click.

| from | via | signed out lands | signed in lands | signed in: posts after the click | signed in: `write-lock` row after |
|---|---|---|---|---|---|
| top (0) | bar Next | 0 / 2201 | 0 / 2241 | `fraction 0, max_fraction 0` | `0.000 / 0.000 started` |
| top | end section's Next | 0 | 0 | same | `0.000 / 0.000 started` |
| top | Contents link | 0 | 0 | same | `0.000 / 0.000 started` |
| y 1500 | bar Next | 0 | 0 | same | `0.000 / 0.000 started` |
| y 1500 | end section's Next | 0 | 0 | same | `0.000 / 0.000 started` |
| y 1500 | Contents link | 0 | 0 | same | `0.000 / 0.000 started` |
| end (8816 / 8856) | bar Next | 0 | 0 | same | `0.000 / 0.000 started` |
| end | end section's Next | 0 | 0 | same | `0.000 / 0.000 started` |
| end | Contents link | 0 | 0 | same | `0.000 / 0.000 started` |

Other navigations:
- `write-lock` y 1500 → bar Previous: `all-blocks` 0. Signed in, the `all-blocks` row is `0.000 started`.
- `write-lock` end (2201 / 2241) → bar Previous: `all-blocks` 0. Signed in, `0.000 started`.
- Book page → `write-lock` chapter row: 0 at 1440×900 (the book page does not scroll there). At 1440×420, from the book page's end (126 / 126 signed in, 168 / 168 signed out), it lands at 0. Signed in, the row is `0.000 started`.
- A chapter with a saved place: `write-lock` read to y 1200 (row `0.535 started how-it-works`). Then from `all-blocks` at its end, bar Next lands at **1183**, on the section, with the pill "Picked up where you left off · How it works". The row stays `started` (0.528 / 0.535). That is S15's resume, unchanged.

In every signed-in row the only write for the new chapter is the post-landing `fraction 0` ("started"). **No `finished: true` and no inflated `max_fraction` was sent for the chapter that was opened.** The old chapter's rows (for example `every-block-once 1.000 finished` when the reader really scrolled to its end) are that chapter's own cadence, written before the click.

**Owners still land** (CDP; signed in unless marked):

| check | result |
|---|---|
| `all-blocks` y 1500 → router push `write-lock#how-it-works`, with a saved resume elsewhere (y 1800) | y 1186, the block's top at 72 (bar 59 + scroll-margin). The hash wins over the resume. Same signed out. |
| hard load `write-lock#how-it-works` | y 1186, block top 72 |
| `all-blocks` y 1500 → router push `write-lock?note=<id>` (a note on `lock-quiz`) | y 1508, block top 91 (bar 59 + 32) |
| hard load `write-lock?note=<id>` | y 1508, block top 91 |
| language switch en → ko at y 1200 | `write-lock?lang=ko#how-it-works` y 1126. It carries the place, by design. Rows: `en 0.535 started`, `ko 0.516 started`. |
| reload of `all-blocks` at y 3000 (signed out; the first load keeps the browser's place) | y 3000 |
| then Next, scroll to 900, history Back | `write-lock` 0, then `all-blocks` 3000 (the browser restores the place on a traversal) |

**Legacy ↔ native** (CDP, signed in; the legacy reader's window never scrolls, `max 0`):
- `write-lock` end → Contents → `long-legacy`: window y 0. Row `long-legacy 0.000 started`, not finished. After real wheels inside the frame the row moved to 0.313 started.
- `long-legacy` → Contents → `write-lock` (legacy → native): y 0. The row's `fraction` is 0.000, and its state stays the `finished` it earned in the step before.
- `long-legacy` deep (0.376) → Contents → `legacy` (legacy → legacy): it lands, and the short `legacy` explainer is `1.000 finished`. That chapter is 1.8 KB, its whole text fits in the frame on opening, and the bridge reports fraction 1. This is the existing short-chapter rule, not R3.
- Back to `long-legacy`: the bridge restore lands on its resume, with the pill "Picked up where you left off · 38%".

**Dev clone** (`next dev`, StrictMode, CDP, signed out): the same 13-row matrix. Every navigation lands at y 0, and the book page row from 168 / 168 at 1440×420 also lands at 0.

**Real browser: Aside `u1`, production build, 1440×900**:
- Signed out:
  - real wheel to y 1500, then bar Next: `write-lock` y 0;
  - `End` (2248), then bar Previous: `all-blocks` 0;
  - `End` (8863), then the end section's Next: `write-lock` 0;
  - wheel to 2100, a tap on the text (F5: the chapter bar is hidden mid-chapter), Contents, then `write-lock`: 0.
- Sign-in return: on `write-lock` at y 1200 I scrolled up a little, and the top bar's Sign in linked `…/write-lock?lang=en#background`. I signed in through the form, which returned to `#background` at y 547 with the heading at 72.
- Signed in: `all-blocks`, then `End` (8923), then bar Next. `write-lock` opened on its resume at y 544, saved by the landing just before. The scratch database then held `every-block-once 1.000 / 1.000 finished` (really read to the end) and **`write-lock 0.236 / 0.237 started background`, not finished**.

**Console and CSP** (CDP: load, Next, Previous, a hash load): no errors or warnings.

**Not run:** real iPhone, iPad, Safari and Firefox, which stay the operator's; Aside at narrow widths. The landing code does not depend on the viewport, and the CDP matrix covered 1440×900 and 1440×420.

## Deferred-job candidate (for the orchestrator; I filed nothing)

- **Title:** Pages with their own CSS keep the previous page's scroll position on a client navigation.
- **Reason:** Next 16's scroll handler takes a hoisted segment stylesheet as the segment's first node and gives up (see *The real cause*). F6 fixed it for the reader only. From a chapter at y 3800, the book page opened at its clamped end (168 / 168 at 1440×420). The library and the other app pages were not checked.
- **Trigger:** the next book-page or library slice, or a decision to try `experimental.appNewScrollHandler` app-wide (that needs its own regression pass, because it also changes focus handling).

## Production note (for the orchestrator)

Members who pressed Next on production may have chapters marked Finished that they never read. Mark as unread clears them. I did not touch production.

## Notebook

`phase.md`:
- `## Doc impact`: the line above.
- `## Decisions`: *The reader owns its landing (P30.F6)*.
- `## Notes for later slices`: the F6 note is consumed, and a round-3 pointer was added.
- `## Now`: rewritten.

`phase.md` is 39,489 B, under the 40 KB budget.
