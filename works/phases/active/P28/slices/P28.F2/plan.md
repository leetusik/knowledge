# P28.F2 — plan (orchestrator native plan, auto mode, 2026-10-08)

**Fix: a framed HTML explainer can get stuck at a stale height, so the document scrolls inside its own box
instead of the page scrolling.** Executor: `slice-executor-high`. Kind `fix`, risk `high`.

## Why

Operator's report (P28 reopen, then 2026-10-08 on `/documents/60`, Mac Chrome): with the pointer over the
document, the wheel scrolls an inner scroller and the page does not move. Their screenshot shows the frame
with its own long scrollbar thumb, so the frame is shorter than its content. `P28.S10` (second pass) found the
cause and reproduced it. Read the four `(P28.S10)` lines in `phase.md` → `## Decisions` and the note tagged
`(from P28.S10, for the scroll fix slice, recommended P28.F2 …)` in `## Notes for later slices`: they are this
plan's spec. The detail and readings are in `slices/P28.S10/result.md` (readings A–H, G is the repro).

In short: the child reporter injected by `web/src/lib/explainer-height.ts` stops posting for good after
`budget = 300` posts. Ordinary width-change reflow (dragging the window, side-docked DevTools) uses that up in
seconds when the frame is under ~800px, and every later width change leaves the frame at a stale height until
a reload. Separately, the reporter can measure a not-yet-laid-out frame (`innerWidth 0`) and post junk (64,
90,820), and those posts count against the budget too.

## Change — `web/src/lib/explainer-height.ts`, the `REPORTER` string only

1. **Re-arm the runaway latch on a width change.** Track the viewport width the last post was measured at
   (`lastW`). When `innerWidth` differs from it, reset `budget` to its full value before posting. A runaway
   (content that grows with the viewport height) grows at a **constant** width, so it is still latched.
2. **Ignore an unlaid-out frame.** When `innerWidth` or `innerHeight` is 0, post nothing and leave `last`,
   `lastW` and `budget` untouched. A later trigger (resize / ResizeObserver / load) measures for real.
3. **Give the parent an un-wedge lever.** `kb-explainer-request` already resets `last`. Also let it allow
   **one** post even when `budget` is spent. Do not refill the budget: a runaway stays bounded, because the
   parent sends at most two requests per mount.
4. Update the header comment so it states the new latch semantics (per-width budget, zero-viewport guard,
   the request's one-shot grant). Correct the debounce comment's *reason* if S10's transient-windows decision
   says it is wrong (hidden tabs run no rAF). Keep the `setTimeout` itself.

**Do not change:** the body-box `measure()` (switching to `documentElement.scrollHeight` reintroduces the
ratchet the header warns about), the `setTimeout` debounce, the 2px dedupe, `injectHeightReporter`, the
parent's `120 / 40000` clamps, `explainer-frame.tsx`, or any CSS (`[data-unmeasured]` is not on this path, so
round 06 is untouched). No parent-side re-sync in this slice.

## Tests — `web/tests/explainer-reporter.test.ts` (it already runs the reporter string against a fake window)

Add exactly the core cases, kept small:
- after the budget is spent at one width, a width change followed by a height change still posts;
- a runaway at a constant width still stops at the budget (guards that (1) did not remove the latch);
- a 0×0 viewport posts nothing and does not consume the budget;
- (if cheap in the existing harness) a `kb-explainer-request` while latched produces exactly one post.

## Validation

- Standing web gate: `pnpm --dir web typecheck`, `lint`, `test`, `build`. Never `prettier --write` on
  existing files (D22).
- **Live repro, before and after, in dev and the production build**, per `## Operator Runtime` and S10's
  harness addendum (`docker ps` first, since `kb-p28s2-pg` may have stopped). Use any long local framed
  explainer fixture you create in the **dev** DB (synthetic content only; never doc 60's text; remove it or
  name it in `result.md`). Step `.kb-explainer`'s width through ~330 values under 800px, release, then
  narrow to 560px. Before the fix: the frame is stale. After the fix: frame height == the child's
  `documentElement.scrollHeight`, and a wheel over the frame moves the **page**. Read the child via Aside
  `page.frames()[1].evaluate`. Also do a CPU ×20 cold load (Chrome for Testing over CDP, as S10 did) and show
  nothing below 120 is posted.
- `python3 scripts/workflow.py validate`.
- Name the instrument per reading in `result.md`, and do not claim a browser run you did not make.

## Notebook

Append one `## Doc impact` line (the reporter's latch semantics changed: per-width budget, zero-viewport
guard, the request's one-shot grant; the docs that describe the explainer handshake). Consume S10's
fix-slice note. Leave the Cloudflare beacon question and the earlier 70rem/`100dvh` question in
`## Operator Questions` for the review to route; add a line saying the second is now off the fix's path if
S10 did not already. Rewrite `## Now` last.

## Afterwards (orchestrator, not you)

The orchestrator re-checks doc 60 on production in the operator's Chrome after deploy, and the review then
re-runs.

## Amendment (orchestrator, 2026-10-08, mid-dispatch) — the screenshot's actual cause, now item 0

`P28.S10` kept working after this plan was written and proved the cause of the operator's screenshot
(`slices/P28.S10/result.md` §I; `phase.md` → `## Decisions`, the corrected S10 lines). `measure()` uses
integer-rounded `offsetHeight` / `scrollHeight`. When the body box has a fractional height under .5, it
reports up to 0.5 CSS px less than the content. At DPR 1 Chrome snaps that away. At **DPR 2** (the operator's
retina "node" Mac) it leaves a real **0.5px scroll range** inside a correctly measured frame. Doc 60 at DPR 2:
body 13,200.4766 → reported 13,264 → content ends at 13,264.48 → `maxScrollTop 0.5`. A classic scrollbar draws
it with a full-height thumb, which is exactly the screenshot, and a wheel gesture can latch onto it.

**Item 0, highest priority:** `measure()` returns
`Math.ceil(Math.max(b.getBoundingClientRect().height, b.scrollHeight) + marginTop + marginBottom)`, the
ceiling of the **fractional** body box. It is still viewport-independent, so no ratchet. Still never
`documentElement.scrollHeight`. The "do not change `measure()`" line above is relaxed for exactly this and
nothing else. Update the header comment to say why (fractional box, DPR 2 half-pixel scroll range).

**Extra test case:** a body box of `1000.3` with 32px margins reports `1065`, not `1064`.
**Extra live check:** at DPR 2 (Chrome for Testing `--force-device-scale-factor=2`, per S10's harness note),
the frame's maximum `scrollTop` reads 0 on a fixture with a fractional body height. Not recommended, so do not
do it: `scrolling="no"` or `overflow: hidden` from the reporter.
