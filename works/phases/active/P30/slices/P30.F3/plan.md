# P30.F3 — Sweep fixes: X1, X2, X5, X6

## Why

S27's sweep (`works/phases/active/P30/slices/P30.S27/result.md` → *Defects*, with evidence and repro scripts
in `slices/P30.S27/evidence/`) found these. Each one breaks the signed design, so the fix restores it
exactly as drawn. No restyling.

## Do

1. **X1 (High), the quiz foot shows every state sentence:** glued template class lists in
   `web/src/components/reader/quiz.tsx` (around lines 273, 326, 565 and 586) produce `qz-stis-off`. Use the
   `cx()` helper S24 added (`web/src/lib/review/cx.ts`; move it to a shared `web/src/lib/cx.ts` if that's
   cleaner, and update S24's imports).
   - Then grep **every** `className={\`` template across `web/src/` for the same missing-space pattern, and
     fix every instance.
   - Add one tiny test of `cx()`.
2. **X2 (High), the page is 564 px wide for a signed-in quiz reader on a phone:** `.kb-ch .qz-vh`
   (`web/src/app/reader.css` around line 1316) is a visually hidden element with `white-space: nowrap` but no
   clip.
   - Give it the full sr-only box (`position: absolute; width: 1px; height: 1px; overflow: hidden;
     clip-path: inset(50%); white-space: nowrap`), matching the visually-hidden pattern round 03 uses.
   - Grep `reader.css`, `library.css`, `book.css`, `review.css` and `legacy.css` for other visually-hidden
     classes missing `overflow: hidden`, and fix them.
   - Re-test at a 150% and 200% root font, where the sweep saw 844 and 1123 px.
3. **X5 (Low), the book page overflows at a 200% root font on a 390 phone** (`scrollWidth` 481): find the
   element and fix it, so the drawn layout holds without sideways scroll (wrap or `min-width: 0`, as the
   nearest drawn pattern does).
4. **X6 (Low), `lg-bottom__bar` scrolls 35 px vertically at 335×581** (DPR 2, classic scrollbars), a second
   scroller beside the legacy frame. Make the bar never scroll (`overflow: hidden` or a fixed height),
   per the signed bar's drawn size. The legacy frame stays the only scroller.

## Verify

- Re-run S27's repro scripts for X1, X2, X5 and X6 (`slices/P30.S27/evidence/repro/`) on the production
  build in a scratch stack. Everything must pass:
  - `scrollWidth` equals the viewport at 390, 360 and 430, signed in with answered quizzes, at 100%, 150% and
    200%;
  - the foot shows exactly one sentence.
- Spot-check that nothing else moved: quiz states, review foot, book page and legacy bar at 1440.
- Follow `topics/surface-slice-rules.md` for the runtime, gates, D22 and PIDs.

## Notebook

- `phase.md`: mark X1, X2, X5 and X6 as fixed in the S27 note, and update `## Now`. No Doc impact unless a
  durable truth changes.
- `result.md`: verdict block first.

## Dispatch

slice=P30.F3
phase=P30
kind=fix
risk=low
attempt=1
route=mid
reason=kind fix rated low
tier=mid
subagent_type=slice-executor-mid
model=sonnet
pass_model=yes
effort=high
pass_effort=yes
attribution=Claude Sonnet 5.5
explore_model=haiku
explore_effort=high
