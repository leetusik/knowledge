# P28.F3 — result

## Verdict

- **status:** done
- **summary:** The explainer reporter now adds the root's horizontal scrollbar (`innerHeight − clientHeight`) to `measure()`, so an explainer wider than its frame no longer keeps a vertical inner scroller under classic scrollbars. It also posts any growth while still dropping sub-2px shrinks, and its `ResizeObserver` watches `documentElement` too, which catches a bar that appears at a constant width. Live before and after, in dev and the production build: `maxTop 14 → 0` with the stand-in, `15 → 0` with a real classic scrollbar, and the wheel now moves the page. F2's three checks still pass.
- **files_changed:** `web/src/lib/explainer-height.ts` (the `REPORTER` string and its header comment), `web/tests/explainer-reporter.test.ts`, `works/phases/active/P28/phase.md`, this file
- **validation:**
  - `pnpm --dir web typecheck`: pass
  - `pnpm --dir web lint`: pass
  - `pnpm --dir web test`: pass, 121/121. The reporter file has 11 cases. The 3 new ones fail against the HEAD reporter (checked by swapping it in), and the 8 existing ones pass, the runaway guard included.
  - `pnpm --dir web build`: pass
  - `prettier --check` on both touched files: pass. No `--write` was run (D22).
  - Live before/after, dev `:3030` and the production standalone build `:3040`: pass (tables below)
  - F2 regression re-runs (latch, DPR 2, CPU ×20), dev and prod: pass
  - `python3 scripts/workflow.py validate`: passed (pre-existing advisories only)
- **deviations:**
  1. **One more trigger: the `ResizeObserver` also observes `documentElement`.** The plan allowed this ("add the smallest trigger that catches it"). The measured reason: under a fixed-width body (the default 1022 frame, 768px body), a bar that appears without the body box changing left `maxTop 14`. Observing the root fixes that, because the vertical bar the overflow forces narrows the root.
  2. **The root is `body` in quirks mode.** In quirks mode, `documentElement.clientHeight` is the content height (measured 5,016 for a 5,000px quirks page), so the plan's literal `documentElement` term would be 0 there and the bug would stay. `body.clientHeight` is the viewport minus the bar (885 of 900). That is one ternary, and it has one test case.
  3. **Prod "before":** I did not build a HEAD-reporter production build just to re-measure the defect. The review had already measured it there (Aside, prod `/documents/70`, `maxTop 14`). The before readings here are dev with HEAD (Aside and CfT); prod readings are after only.
- **doc_impact:** one `## Doc impact` line in `phase.md` for frontend.md (+ security.md where it describes the handshake). The reporter additionally counts the root's horizontal scrollbar (body in quirks mode), observes `documentElement`, and posts any growth while dropping sub-2px shrinks.

## What changed (`REPORTER` string only)

- `measure()` returns `ceil(fractional body box + margins) + bar`. Here `bar = max(0, innerHeight − root.clientHeight)` and `root = compatMode === 'BackCompat' ? body : documentElement`. The body-box basis, the ceiling and `scrollHeight` in the `max` are unchanged.
- Dedupe: `Math.abs(h − last) >= 2` became `h > last || last − h >= 2`.
- `ResizeObserver`: one instance now observes `body` and `documentElement`.
- Header comment: a new paragraph covers the scrollbar term, the no-ratchet argument, the two-post coupling, the documentElement trigger and the disappearing-bar residual. The request/dedupe paragraph was rewritten for growth vs shrink.

Untouched: the per-width budget, the 0×0 guard, the request grant, the `setTimeout` debounce, `injectHeightReporter`, `explainer-frame.tsx`, the parent clamps, all CSS, and the child's horizontal scrolling.

Tests: the harness gains a fake root whose `clientHeight` is `innerHeight − bar`, a body `clientHeight` (the viewport in quirks mode, the content height otherwise), a `compatMode` getter and a `scrollbar(px, quirks?)` helper. New cases: a bar of 15 posts 415, and removing it posts 400; quirks mode reads the bar off `body`; 1px growth is posted, a 1px shrink is not, and a 2px shrink is.

## Live readings

Fixture 70 at a 600px `.kb-explainer` (598 iframe viewport). An 8-column `nowrap` table is injected at the top of the child. The child is read with `scrollingElement.scrollTop = 1e6`, then the page is scrolled to 600 and a 300px wheel is sent over the frame.

### Classic-scrollbar stand-in (Aside `u1`, repl over Bash, signed in, `/documents/70`)

| run | frame | child ih / clientHeight / scrollHeight | maxTop | wheel: page | inner scrollY |
|---|---|---|---|---|---|
| dev, HEAD, stand-in | 22,950 | 22,950 / 22,935 / 22,949 | **14** | 600 → **600** | **14** |
| dev, HEAD, overlay (no stand-in) | 22,950 | 22,950 / 22,950 / 22,950 | 0 | 600 → 900 | 0 |
| dev, F3, stand-in | 22,965 | 22,965 / 22,950 / 22,950 | **0** | 600 → **900** | 0 |
| dev, F3, overlay | 22,950 | 22,950 / 22,950 / 22,950 | 0 | 600 → 900 | 0 |
| prod, F3, stand-in | 22,965 | 22,965 / 22,950 / 22,950 | **0** | 600 → **900** | 0 |
| prod, F3, overlay | 22,950 | 22,950 / 22,950 / 22,950 | 0 | 600 → 900 | 0 |

In the overlay case the frame equals the content and there is no extra 15px.

### Real classic scrollbar (Chrome for Testing 148, `--headless=new -AppleShowScrollBars Always`, raw CDP, anonymous public route, no stand-in styling)

The macOS default is passed as the last command-line argument (NSArgumentDomain). A 100px `overflow:scroll` div then measures a **15px** native scrollbar inside the child, so these are real layout-taking bars, not the stand-in.

| run | frame | ih / clientHeight | maxTop | wheel: page | inner |
|---|---|---|---|---|---|
| dev, HEAD (reporter swapped in, then restored; `git diff --stat` checked) | 22,921 | 22,921 / 22,906 | **15** | 600 → **600** | **15** |
| dev, F3 | 22,936 | 22,936 / 22,921 | **0** | 600 → 900 | 0 |
| prod, F3 (unstyled and stand-in, identical) | 22,936 | 22,936 / 22,921 | **0** | 600 → 900 | 0 |

### Trigger coverage (Aside, stand-in, a `position:absolute` 3000×1px div so the body box cannot change)

| case | before the documentElement observe | after |
|---|---|---|
| 600 frame (body follows viewport width), div added | covered: frame 22,869 → 22,884, `maxTop 0` (the vertical bar narrows the body, so the body RO fires) | same |
| default 1022 frame, **fixed 768px body**, div added | **not covered: frame stays 16,918, `maxTop 14`** | frame 16,933, `maxTop 0`, dev and prod |
| div removed again | frame stays one bar tall (16,933 / 22,884), `maxTop 0`: blank space, no scroll range | same (the accepted residual) |

A width change (resize event) was always covered. That is the review's DevTools-drag path, and the first table exercises it.

### No-loop check (the vertical/horizontal coupling)

The bar was 15px, the frame 600 (598 viewport), with a sideways overflow of 590px, which overflows only while a vertical bar exists. A 100px block was appended so the frame was briefly short. Parent-side posts recorded: **`[23000, 22985]`**. That is +15 while the vertical bar forced the sideways overflow, then −15 once the taller frame dropped it. It ended stable at `maxTop 0` in both dev and prod.

### F2 regression re-runs

- **Latch** (Aside, alternating 500–506 ↔ 780, one `page.evaluate` per step, `sleep(70)`, 360 steps, then released, then 560): prod **359** posts, dev **361** (past the 300 budget). Released: frame 16,918 == child 16,918. Narrowed (558): 22,869 == 22,869, `maxTop 0`. Wheel: page 557 → 1157, inner 0.
- **DPR 2** (CfT `--force-device-scale-factor=2`, also with real classic scrollbars; child `body.paddingBottom` 0.5 / 0.6 / 0.25px → body 16,869.66 / .75 / .41): `maxTop 0` in all three, dev and prod. The frame was 16,934.
- **CPU ×20 cold loads** (CfT, throttle applied to the OOPIF child via `setAutoAttach {waitForDebuggerOnStart}`, cache disabled, 3 loads each): posts `[16918, 16918]` every time, dev and prod. The second post is the parent request's answer. Nothing was posted below 120, and the frame equals the child, `maxTop 0`.

## Why the sub-2px-growth change does not reopen a loop

Every sub-2px change that gets posted moves the frame up, never down. So two nearly equal heights cannot alternate. A 1px-per-post creep needs content whose height follows the viewport height. That is the runaway class the per-width budget already latches (300 posts), and it is no faster than a `100vh` runaway, which already passed the old 2px gate on every post. Under the old rule a cycle with steps of 2px or more was just as possible. The only measured coupling, the scrollbar one, settles in two posts. I found no concrete counter-case, so the change was made.

## Harness notes

- `-AppleShowScrollBars Always` must be the **last** argument with no URL after it. Headless rejects "multiple targets", and the default opens a harmless `http://always/` tab. It needs no `defaults write`, so it changes no machine state.
- A zero-height wide div adds no scrollable overflow in Chrome, and a negative-margin one changes the body box through margin collapse. Use `position:absolute; height:1px` to test "width only".
- After the `next build`, `.next/static` and each `public/` entry were linked into `standalone/`, and both CSS chunks answered 200 before any reading.

## Runtime left behind

- Up, as found: `kb-p28s2-pg`, uvicorn `:8766`, `next dev :3030`.
- Stopped: the `:3040` standalone server and both Chrome for Testing instances (`:9555`, `:9556`). Their profiles are in the session scratchpad only. `web/.next` holds the F3 build.
- Fixture doc 70 is kept for F4. No credential was minted, and nothing on production was touched.

## Notebook edits (`phase.md`)

- `## Decisions`: the review's CLASSIC SCROLLBARS line was corrected in place with its LANDED half (P28.F3).
- `## Doc impact`: one line (P28.F3).
- `## Notes for later slices`: the repro-kit note now marks the F3 part consumed (kept as the re-review's probe), adds the real-classic-scrollbar CfT recipe, keeps the F4 part, and adds a one-line heads-up for F4.
- `## Now`: rewritten.
- `## Operator Questions`: nothing added. This slice raised no operator decision.
