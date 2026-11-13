# P28.F3 — plan (orchestrator native plan, auto mode, 2026-10-08)

**Fix: when scrollbars take layout space, a framed explainer wider than its frame still gets a vertical inner
scroller.** Executor: `slice-executor-high`. Kind `fix`, risk `high`.

## Why

The re-review (`slices/P28.REVIEW/result.md`, finding 1; `phase.md` → `## Decisions`, the "CLASSIC SCROLLBARS +
A SIDEWAYS-OVERFLOWING EXPLAINER" line) measured it. `measure()` counts the body box but not the root's
**horizontal scrollbar**. With classic scrollbars, on Windows Chrome or a Mac set to "always show" like the
operator's retina "node" Mac, Work profile, a framed document wider than its frame draws a ~15px horizontal
scrollbar inside the frame. That eats the frame's height and leaves a ~14px vertical scroll range, and a wheel
over the frame scrolls the inner document while the page stays put. That is the operator's exact symptom.
Public docs 25/26/27 overflow sideways below a 510/550/640px frame, which a side-docked DevTools reaches
easily. It predates P28.

## Change — `web/src/lib/explainer-height.ts`, the `REPORTER` string only

1. **Count the horizontal scrollbar.** `measure()` adds `max(0, window.innerHeight −
   document.documentElement.clientHeight)` — the root horizontal scrollbar's thickness, 0 with overlay
   scrollbars or no sideways overflow — to F2's ceiling of the fractional body box. It depends on width, not
   height, so there is no ratchet. Verify that claim, and say so in the header comment. Make sure a scrollbar
   that appears or disappears re-triggers a post: when the frame width changes, the existing
   resize/ResizeObserver triggers should cover it. Check that they do, and if a scrollbar appearing does not
   change the body box, add the smallest trigger that catches it.
2. **Fold in F2's residual (sub-2px growth).** The 2px dedupe currently suppresses growth of ≤1px after a post,
   which can leave the frame up to 1px short. Always post when `h > last`, and keep suppressing changes below
   2px only for **shrinks**, which keeps a parent→child→parent oscillation impossible. The budget still bounds
   a runaway. If you find a concrete reason this reopens a feedback loop, do not do it, and say why in
   `result.md`.
3. Update the header comment for both.

**Do not change:** the body-box basis (never `documentElement.scrollHeight`), F2's per-width budget, its 0×0
guard, the request grant, the `setTimeout` debounce, `injectHeightReporter`, `explainer-frame.tsx`, the
parent's clamps, or any CSS. Do **not** suppress the child's horizontal scroll: a wide table or pre that
scrolls sideways inside the document is legitimate content behaviour (the operator's original report even
mentions horizontal inline scroll), and only the *vertical* inner range is the defect.

## Tests — `web/tests/explainer-reporter.test.ts`, small

- With `innerHeight − clientHeight = 15` (a classic horizontal scrollbar), the posted height includes the 15.
- Growth of 1px after a post is posted, and a shrink of 1px is not.
- Existing cases stay green, the runaway guard included.

## Validation

- Standing gate: `pnpm --dir web typecheck · lint · test · build`. Never `prettier --write` on existing files.
- **Live, before/after, in dev and the production build**, with the repro kit in `phase.md` (the note tagged
  `(from P28.F2 + P28.REVIEW, for P28.F3, P28.F4 …)`). Use fixture doc 70 plus the classic-scrollbar
  stand-in (`::-webkit-scrollbar{width:15px;height:15px}` and a wide `nowrap` table injected into the child),
  frame narrowed to 600px. Before: `maxTop 14`, and the wheel moves the inner document. After: `maxTop 0`,
  and the wheel moves the page. Also check the overlay-scrollbar case: no extra 15px, frame == content. If
  you can, run a real classic-scrollbar check in headless Chrome for Testing as well. Say which instrument
  produced each reading.
- Re-run F2's three checks quickly (latch, DPR 2, ×20 cold load) so this does not regress them.
- `python3 scripts/workflow.py validate`.

## Notebook

Append one `## Doc impact` line: the reporter's contract additionally counts the root horizontal scrollbar,
and posts sub-2px growth. Mark the F3 part of the repro note consumed and leave the F4 part. Rewrite
`## Now` last. Keep fixture doc 70 for F4.
