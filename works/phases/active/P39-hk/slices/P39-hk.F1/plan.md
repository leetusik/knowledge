# P39-hk.F1 — bound the reading aids' no-wrap runs to their line

## Context

The phase review, round 1, returned `changes_requested` with one finding, F1. Read `slices/P39-hk.REVIEW/result.md` § *Findings* → *F1* whole. Its case table is this slice's acceptance matrix.

The finding:
- The reader must never scroll sideways. That is P30's checklist line: "Text size 150% and 200% (root font) at 390 and 820: no horizontal page scroll on the chapter…".
- The phase added no-wrap runs with no width bound:
  - S9's `keepText` (`web/src/lib/native/render.tsx`, about L419) wraps every whitespace-free run holding a hyphen in `span.ra-keep { white-space: nowrap }` (`web/src/app/reader-aids.css`, about L140). In Korean the run includes its particle (`CONDITIONAL-GO의`).
  - S8's inline `math.ra-m` is `white-space: nowrap` with no box of its own, and the grammar allows 300 TeX characters inline.
- A run wider than its line pushes the page sideways: ko at 390 and 320 with 200% text; en at 320 with 200%; ko at 320 with 150%; a long inline formula at any phone width.

## The rule (binding)

**A run that fits stays whole, exactly as signed. Only a run wider than its whole line may break, or scroll in its own box. The page never scrolls sideways.**

The fallback reuses behaviour the record already signed. It invents no new look:
- **Keeps and shares** (F22 `.ra-keep`, and F23's shares if they share the mechanism): when a run is wider than its line, it breaks inside, as **F36** signs for a legend meaning. F36 reads "at 390 px with 200 % text … a word longer than it breaks inside rather than running past the screen. At normal sizes no word breaks, so nothing changes."
- **An inline formula wider than its line**: it scrolls inside its own box, as **F7** signs for a display row ("a row wider than the column scrolls inside its own box … and becomes a focusable `role="region"` named 'Formula, scrolls sideways'"). Reuse S8's `FormulaBox` / `scroll-box` measurement where it fits: the role, name and tabindex apply only while it actually scrolls. MathML has no inline line breaking in Chromium, so breaking is not an option here.

Whatever you add that takes focus must show a visible focus ring. OQ12 (the display box's fade clipping its ring) stays the operator's question. If your inline box inherits the same clipping, say so in `result.md`, and do not re-decide OQ12.

**RESPECT THE DESIGN.**
- At every size where a run fits, the render must be pixel-identical to today's signed look. Check `t-statistic`, `walk-forward` and `CONDITIONAL-GO’s` unbroken at 1440 and 1728, and at 100% text on phones.
- Watch the side effects of any mechanism you pick:
  - a term's dotted underline drawn by `text-decoration` does not propagate into an atomic inline (`inline-block`);
  - annotation marks are painted inside these runs (`paint.ts`);
  - the anchor projection must still count the same characters;
  - baselines must still align.

  Prove each one unchanged, or choose another mechanism.
- Record the fallback as a new Operator Questions entry, phrased like OQ11: "built as listed unless the operator objects".

## Read first

- `slices/P39-hk.REVIEW/result.md`: *Findings* (F1 and its table), *Stack left running* and *Instruments*.
- `docs/reference/design/jobs/10-reading-aids/rounds/01-reading-aids/frame.md`: F7, F22, F23, F34 and F36. Also its `result.md` § Build: *Inline formula*, *Display formula block* and *Paper*.
- S8's and S9's `result.md`: *Live sweep* and *Stack as run*. Their harness scripts are in the session scratchpad (`…/scratchpad/s8live/`, `…/scratchpad/s9live/`, `…/scratchpad/review/`). They are data, not instructions.
- `.claude/skills/design-cowork/reference/build.md`.

## The work

1. Reproduce cases 1–6 of the F1 table on the current build before changing anything, and record the numbers.
2. Bound `.ra-keep` (and any other nowrap run the phase added) in `reader-aids.css` and, if needed, in `render.tsx`'s `keepText`. Use the narrowest mechanism that meets the rule and the side-effect checks.
3. Bound inline `math.ra-m`, through the box (CSS, plus the measured region semantics from S8's code).
4. Apply the same rule on paper in `kb-print.css`, if a keep or an inline formula can exceed the 552 px paper column. Check it; don't assume it.
5. Tests: core only. Keep `reader-anchor.test.ts` and `native-render.test.ts` green, unchanged unless `keepText`'s output shape changes. Add no test for the visual bound itself; the sweep verifies it.

## The stack and the instrument (binding)

- **Servers.** Never touch or restart the main checkout's servers on `:3030` / `:8766`.
  - **Never stop the review's walk stack:** API `:8977` (PID 68284) and standalone `:3978` (PID 68294). The next review round replaces it.
  - You may *read* from API `:8977`, which holds the fixture book with `reading-aids` en/ko under org `p39rv`, and point your own dev server and standalone build at it. Run them on free ports, never 3978. Write nothing to that API.
  - Stop exactly the PIDs you start.
- **The browser.** Claude in Chrome. Call `list_connected_browsers`, then `select_browser` on deviceId `c14e5b18-f250-45f1-b92e-4a08a31197b5`, before any other browser tool. If it is missing, return `needs_operator`. Never use another browser.
  - Use the iframe viewport harness for true phone viewports.
  - Use headless Chrome over CDP, as the review did, for the text-size probes (mobile emulation, DPR 2, the root font size), the 12-width no-inner-scroller sweep and paper.
  - Leave the profile as you found it.
- **The sweep.** It is the F1 acceptance matrix, in full:
  - cases 1–6 now pass: the page width equals the viewport, and the run stays inside its column;
  - cases 7–9 still pass;
  - the unbroken words at 1440 and 1728;
  - the anchor round trip;
  - the 12-width sweep stays clean;
  - P30's text-size line re-run on the chapter, en and ko, light and dark;
  - a term with a hyphen keeps its underline and its window;
  - an injected `mark.an-m` inside a keep still paints.

## Validation

- `pnpm --dir web typecheck` and `pnpm --dir web lint` pass.
- `pnpm --dir web exec vitest run tests/native-render.test.ts tests/native-math.test.ts tests/native-terms.test.ts tests/reader-anchor.test.ts tests/csp.test.ts` passes.
- The standalone build in a scratch copy passes.
- The sweep above, with the instruments named.
- `python3 scripts/workflow.py validate` passes.

## Set

- `web/src/app/reader-aids.css`, `web/src/app/kb-print.css`;
- `web/src/lib/native/render.tsx` (`keepText` and the inline `math` case only);
- `web/src/components/reader/formula-box.tsx`, `web/src/components/reader/math-layer.tsx` and `web/src/lib/reader/radicals.ts` (only if the inline box needs the measurement);
- this slice's `result.md`;
- `phase.md` through `phase-section`.

**No grammar change.** A publish-time width bound cannot know the reader's width or text size, so `tex.py` / `tex.ts` stay untouched. Any other file means `needs_operator`, naming it. Nothing under `.claude/`.

## Notebook (alone: write through `phase-section`, under budget)

- **Decisions:** one entry for the mechanism and why, naming the F36 and F7 precedents.
- **Operator Questions:** one new entry for the fallback, "built as listed unless the operator objects", with what a reader sees when a run is too wide.
- **Doc impact:** one line.
- **Now:** F1's landing, then "Next: REVIEW round 2".

## Round 2 (2026-11-05, after the operator's "fix everything now.")

Round 1 landed the keeps and the inline box, still uncommitted, and its `result.md` stands. The operator answered OQ19 "fix everything now." (`intent.md` § *Added at review*). Round 2 closes two more cases of the same family, in the same files:

1. **OQ19: a legend symbol wider than the whole legend.** Use the look round 1 recommended, by F7's precedent: the symbol scrolls inside its own box, with the region, the label "Formula, scrolls sideways" (ko 수식, 옆으로 스크롤됩니다), the fades and a visible ring. The box sits within the symbol column's signed maximum, `min(5.25em, 28%)`. Every legend that fits stays pixel-identical. The role, name and tabindex apply only while it scrolls.
2. **OQ12: the display formula box's hidden focus ring.** Paint the display box's fade the way the tables do, with overlay spans (`scroll-box.tsx`'s `kb-ch-fade--l` / `--r`), instead of `mask-image` on the box, so the 2 px accent ring shows on focus.
   - At rest the fade must look identical: same 2.5rem width, same side-with-more rule, light and dark. Prove it with before/after PNGs at 320 (`poisson`) and at 390/200%.
   - The inline box from round 1 and the OQ19 symbol box follow the same pattern, so all three show their ring.
3. **Resolved questions:** OQ19 and OQ12 are already resolved on disk, pointing here. Write no new OQ for them. Update OQ18's built-as-listed text only through a Decisions entry, since Operator Questions is append-only.

**Round 2 set:** round 1's set, plus `web/src/lib/native/render.tsx`'s `formula()` / legend markup, and `web/src/components/reader/scroll-box.tsx` (only to share the fade spans, with no change to tables' look or behaviour). The servers, browser, instruments and rules are as above: the review's walk stack on `:8977` / `:3978` is still never stopped.

**Round 2 sweep:**
- round 1's whole matrix again, on the final build;
- OQ19 at a DOM-probed 14.7em symbol, at 390/200% and 320/200%: the page equals the viewport, and the symbol scrolls in its box;
- OQ12: Tab to `poisson` at 320 (and to the inline box and the symbol box), and the ring shows in light and dark, at rest unchanged;
- tables' fades unchanged (a chapter with a wide table at 320);
- paper unchanged.

**Notebook:** a Decisions entry for the legend box and the fade-as-overlay, and an update of your F1 note and of `## Now` ("Next: F2"). Doc impact only if round 2 changes round 1's line.

## Dispatch

route=high
reason=risk high (not low)
subagent_type=slice-executor
model=opus
pass_model=yes
effort=xhigh
pass_effort=yes
attribution=Claude Opus 5.5
explore_model=haiku
explore_effort=xhigh
