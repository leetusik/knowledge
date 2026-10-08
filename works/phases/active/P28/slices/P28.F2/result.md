# P28.F2 — result

## Verdict

- **status:** done
- **summary:** Fixed the framed-explainer inner scroll inside `explainer-height.ts`'s `REPORTER` string only. `measure()` now takes the ceiling of the fractional body box, so DPR 2 has no 0.5px inner scroll range. The 300-post runaway latch re-arms on a viewport-width change, so a long drag no longer leaves a stale frame. A 0×0 frame posts nothing, and a parent request grants one post while latched. Five small test cases were added. Before and after were proved live in dev and the production build: latch repro, DPR 2 `maxScrollTop` 0.5 → 0, CPU ×20 cold loads.
- **files_changed:** `web/src/lib/explainer-height.ts`, `web/tests/explainer-reporter.test.ts`, `works/phases/active/P28/phase.md`, this file
- **validation:**
  - `pnpm --dir web typecheck`: pass
  - `pnpm --dir web lint`: pass
  - `pnpm --dir web test`: pass, 118/118. The reporter file has 8 cases. The 4 new behaviour cases fail against the HEAD reporter, and the runaway guard passes on both, as it should.
  - `pnpm --dir web build`: pass
  - `prettier --check` on both touched files: pass. No `--write` was run (D22).
  - Live before/after in dev `:3030` and the production standalone build `:3040`: pass (details below).
  - `python3 scripts/workflow.py validate`: passed (pre-existing advisories only).
- **deviations:**
  - The orchestrator's mid-dispatch amendment added item 0 (the `measure()` change) and was applied as written.
  - The DPR 2 and CPU ×20 checks ran in Chrome for Testing **`--headless=new`**, not a windowed instance. On this machine the windowed instance rendered no frames (see Harness).
  - The fractional body for the DPR check came from sub-pixel `padding-bottom` set inside the child rather than from width steps (same reason).
  - Fixture 66 could not drive the latch, so a synthetic fixture 70 was created and deleted.
- **doc_impact:** one `## Doc impact` line in `phase.md`: frontend.md (+ security.md where it describes the handshake). It covers the reporter's new contract: ceiling of the fractional body box, a per-width 300-post budget, the 0×0 guard, and the request's one-shot grant.

## What changed

All changes are inside the `REPORTER` source string plus its header comment:

- **(0) `measure()`:** `Math.ceil(Math.max(b.getBoundingClientRect().height, b.scrollHeight) + marginTop + marginBottom)`. It is still body-based and viewport-independent, and never `documentElement.scrollHeight`.
- **(1) Per-width budget:** `lastW` is tracked; when `innerWidth !== lastW`, `budget = BUDGET` (300).
- **(2) 0×0 guard:** `if (!(w > 0) || !(vh > 0)) return;` runs before anything else in `post()`. It touches no state.
- **(3) One-shot grant:** the request handler sets `grant = true`. `post()` proceeds while `budget <= 0` only if `grant` is set. Any post clears `grant` and decrements the budget only when it is above 0.
- **Header comment:** rewritten for the new latch semantics, the fractional box, and the 0×0 guard. The debounce comment's *reason* was corrected: hidden or offscreen frames run no rAF, and a visible one does (S10). The `setTimeout` itself is unchanged.

Untouched: the 2px dedupe, the `setTimeout(…, 16)` debounce, `injectHeightReporter`, `explainer-frame.tsx`, the parent's 120/40000 clamps, and all CSS.

Test harness: the fake `body` now has integer-rounded `scrollHeight`/`offsetHeight` beside a fractional `getBoundingClientRect()`. The fake `window` has `innerWidth`/`innerHeight` (default 800×600) and settable margins. The new helpers are `reflow(h)`, `viewport(w, h)` and `margin(top, bottom)`. The new cases are:
- a constant-width runaway still stops at 300;
- a width change after the budget is spent still posts;
- 0×0 posts nothing and spends no budget (proved by returning to the *same* width, which does not re-arm, and still posting);
- a request while latched gives exactly one post, and the next reflow gives none;
- a 1000.3 box with 32px margins reports 1065.

## Live readings

Fixture **70** `p28f2-reflow-probe`: a synthetic explainer, 48rem body, 120 lorem-like paragraphs, ~18.8k px at a 1022px frame. It was published to `p28s5/research` with `commit: false` through org credential `p28f2-repro`. After the run the doc was **deleted** (204; raw now 404) and the credential **revoked** (204). Doc 66 was tried first and rejected: its height only changes between 650 and 700px, so 330 width steps gave 2 posts.

### Latch repro (Aside `u1`, repl over Bash, 1440×900)

Method: 660 width steps on `.kb-explainer`, 470→799→470px, one `page.evaluate` per step with `sleep(35)`. Then release, then narrow to 560px. The child is read with `page.frames().at(-1).evaluate`. Then `mouse.move` over the frame and `mouse.wheel(0, 600)`.

| run | posts | released @1022: frame / child sh | narrowed @558: frame / child sh | wheel over frame |
|---|---|---|---|---|
| dev, HEAD | 298 (latched) | 21,708 / 21,708 (content 18,867, stale tall) | **21,708 / 25,317, stale** | inner `scrollY` 0→**600**, page 557→557 |
| prod, HEAD (old build) | 299 (latched) | 21,811 / 21,811 | **21,811 / 25,317, stale** | inner 0→**600**, page unmoved |
| dev, F2 (before item 0) | 452 | 18,867 / 18,867 | 25,317 / 25,317 | page 557→1157, inner 0 |
| prod, F2 (before item 0) | 451 | 18,867 / 18,867 | 25,317 / 25,317 | page 557→1157, inner 0 |
| dev, **final** | 451 | 18,868 / 18,868 | 25,318 / 25,318 | page 557→**1157**, inner 0 |
| prod, **final** | 453 | 18,868 / 18,868 | 25,318 / 25,318 | page 557→**1157**, inner 0 |

The final heights are 1px taller than the pre-item-0 ones. That is the ceiling of the fractional box, which is the intended effect.

### DPR 2 (Chrome for Testing 148, `--headless=new --force-device-scale-factor=2`, raw CDP)

Method: auto-attach to the sandboxed OOPIF child, then set the child's `body.style.paddingBottom` to 0.5 / 0.6 / 0.25px. Padding also stops the last `<p>`'s margin collapsing, so the body becomes 18,820.32 / .41 / .07. Wait 2.5s, then read `scrollingElement.scrollTop = 1e6` back.

| reporter | frac .3203 | frac .4141 | frac .0703 |
|---|---|---|---|
| HEAD (dev) | frame 18,884, **maxScrollTop 0.5** | 18,884, **0.5** | 18,884, 0 |
| final (dev) | frame 18,885, **0** | 18,885, **0** | 18,885, 0 |
| final (prod) | frame 18,885, **0** | 18,885, **0** | 18,885, 0 |

This matches S10's reading I exactly: a fraction under .5 under-reports, and DPR 2 keeps a 0.5px range.

### CPU ×20 cold loads (Chrome for Testing, raw CDP; 3 cold loads + 1 client-side `next.router.push` from the short explainer)

The child gets the throttle and a diag script through `Target.setAutoAttach`. The diag wraps `getComputedStyle` to log each `measure()` call with `innerWidth`/`innerHeight`/body height, plus `start`/`dcl`/`load`.

- **HEAD, dev, windowed instance (frame-starved, see Harness):** 2 of 3 cold loads ran `measure()` at **`iw 0 ih 0`** with body 201,850 and **posted 201,914**, which the parent clamps to 40,000. This is S10's junk class, the 90,820 shape.
- **Final, prod (headless):** in all 3 cold loads the child reached DCL/`load` at `iw 0 ih 0` (body 0 or 201,851). No `measure()` ran there. Every post was **18,868**. The client-side navigation gave a single post of 18,868.
- **Final, dev (headless):** no measure at 0 width and every post 18,868. The earlier F2-without-item-0 run on the windowed instance (prod) gave the same result: zero-viewport DCL/load, no measure, posts 18,867.
- **HEAD, dev, headless:** no zero-viewport measure occurred, because a promptly rendered frame has its size before the first timer. The junk post therefore needs a frame-starved or unlaid-out child, as S10 found. Nothing posted below 120 in any run.

## Harness notes (what cost time)

- The **windowed** Chrome for Testing produced no rendering frames here: rAF ran once, then nothing, in parent and child alike, even with `Page.bringToFront` and the anti-backgrounding flags. The OOPIF child therefore never saw `.kb-explainer` width changes: `innerWidth` stayed at its first value while the frame rect moved. **`--headless=new` rendered at 63fps** and everything behaved. S10's alternative, `--disable-features=IsolateSandboxedIframes,CalculateNativeWinOcclusion`, was not needed.
- Page-level `Emulation.setCPUThrottlingRate` and `Page.addScriptToEvaluateOnNewDocument` do **not** reach the sandboxed frame, which is out of process. Apply both per child session from the `Target.attachedToTarget` handler, then `Runtime.runIfWaitingForDebugger`.
- In Aside, a single in-page loop of 330 width changes produced only 2 posts. One `page.evaluate` per step produced ~1 post per step.
- A stale `:9333` listener answered `/json/list` and then vanished, so the runs used `127.0.0.1:9444`, and `:9555` for DPR 2.
- The temporary HEAD-reporter swaps (`git show HEAD:… > file`, then copy back) were restored each time. `git diff --stat` was checked after every restore.

The compressed recipe for the review is in `phase.md` → `## Notes for later slices` (from P28.F2).

## Residual, not acted on

- The **2px dedupe** (left unchanged, as the plan says) means a later ≤1px content growth after a post would not be re-sent. The frame could then sit up to 1px short, which at DPR 2 is again a sub-pixel range. It was not observed in any reading. It is pre-existing and only worth revisiting if the operator's acceptance on the "node" Mac still shows a sliver.
- Acceptance on the operator's retina Mac with classic scrollbars (doc 60) is still theirs, after deploy.

## Notebook edits

All in `phase.md`:
- `## Decisions`: one LANDED line (P28.F2).
- `## Doc impact`: one line.
- `## Notes for later slices`: consumed and removed S10's fix-slice note and harness addendum; added one compressed F2 harness note for the review.
- `## Now`: rewritten.
- `## Operator Questions`: the 70rem/`100dvh` "off the fix's path" line already existed from S10, so nothing was added. The Cloudflare and 70rem questions are left for the review to route.

## Runtime left behind

- Still up, as found: `kb-p28s2-pg`, uvicorn `:8766`, `next dev :3030`.
- Stopped: the `:3040` standalone server and every Chrome for Testing instance. Their scratch profiles are in the session scratchpad only.
- `web/.next` holds the final build.
- No production state was touched.
