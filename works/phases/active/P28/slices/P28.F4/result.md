# P28.F4 — result

- **status:** done
- **summary:** A framed explainer now prints whole by both Export PDF and ⌘P. For print the frame is pinned to the 680px paper column at a height measured at that width, then restored on `afterprint`. Export PDF waits for a real answer from that width (23–48ms). ⌘P uses a paper height the reporter sends after every height message. The sheet changes in nothing but completeness: no CSS, no copy, `kb-print.css` untouched. Measured complete on A4 and Letter in dev and in the production build. Options B (4–6 blank pages) and C (explainer printed at 66.5%) were measured and rejected.
- **files_changed:** `web/src/lib/explainer-height.ts`, `web/src/app/(public)/documents/[id]/explainer-frame.tsx`, `web/src/app/(public)/documents/[id]/export-pdf-button.tsx`, `web/tests/explainer-reporter.test.ts`, `works/phases/active/P28/phase.md`, this file.
- **validation:** `pnpm --dir web typecheck` pass · `lint` pass · `test` pass (17 files, 122 tests, 1 new) · `build` pass · `prettier --check` on the 4 touched files: the reporter and the test are clean, and the two `.tsx` files carry only drift that was already there at HEAD, on lines this slice did not touch (no `--write`) · live print matrix (headless Chrome for Testing 148, `Page.printToPDF`, A4 + Letter) in dev `:3030` **and** the production standalone `:3040`: pass · Aside `u1` lifecycle + wheel checks, dev and prod: pass · F2/F3 regression probes on prod: pass · `python3 scripts/workflow.py validate`: pass (pre-existing advisories only).
- **deviations:** (1) **⌘P is fixed in this slice, not handed to the operator.** The plan expected A plus B, C or "none" for ⌘P, with an operator call. I found a D (the child volunteers its paper height) that changes nothing on the sheet, so the stop rule's "may" clause covers it; it is measured below. (2) Export PDF's timeout prints with the volunteered paper height when one exists, and falls back to the existing `exportUnmeasured` warning only when there is none. The plan said "timeout → the existing honest-failure path". (3) The reporter answers something new: an additive `kb-explainer-print` message. The height message and every F2/F3 rule are unchanged. (4) Fixture doc 70 is **kept**, because the re-review needs it for the print re-check.
- **doc_impact:** "frontend.md + product.md (+ security.md where it describes the handshake): a framed explainer now prints whole …" (P28.F4). One line, appended to `## Doc impact`.
- **operator questions:** one walkthrough entry (a two-PDF print check plus four measured residuals), appended to `## Operator Questions`. It is not a blocking decision.

---

## What changed

- **`web/src/lib/explainer-height.ts`** (the child half).
  - New `PRINT_COLUMN_PX = 680`. It is derived, not chosen: `kb-print.css` has `@page { size: auto; margin: 16mm 15mm 18mm }`, so the A4 column is 180mm = 680.3px and the Letter column is 185.9mm = 702.6px; this is the narrower one, floored.
  - The reporter's `measure()` is split into `box()` + bar, so the result is unchanged.
  - New `measureAt(w)`: it sets `documentElement` `width: <w>px !important` inline, reads the body box (margins, ceiling), then restores the root's `style` attribute exactly, along with any scroll offset the layout clamped. It all runs inside one task, so nothing is painted and no ResizeObserver fires.
  - After every height post the reporter sends `{type:'kb-explainer-print', height, width: innerWidth}`.
  - A Blink quirk was found and handled: a CSSOM-written inline style is serialised lazily, so a bare `removeAttribute('style')` left `style=""` on the child's `<html>`. Reading `getAttribute('style')` first fixes it (verified: `null` afterwards).
  - Header comments document the new message and the emulation's limits.
- **`explainer-frame.tsx`** (the parent half).
  - It parses and clamps `kb-explainer-print`.
  - New state: `pin` (null = screen; otherwise `{width: 680px, height}`). `pinForPaper` uses `flushSync`, because `beforeprint` is followed synchronously by print layout. `releasePaper` restores the saved screen height and re-asks the child.
  - Listeners: `kb-explainer-print-prepare` (Export: pin, re-ask every 250ms or on an answer from the wrong width, settle on `width === 680` or after 2s); `kb-explainer-print-release`; `beforeprint` (⌘P: pin at the volunteered height unless already pinned); `afterprint` (release).
  - Exports `prepareExplainersForPrint()` and `releaseExplainersAfterPrint()`.
  - Unmeasured and relay-failed frames are not pinned and resolve at once.
- **`export-pdf-button.tsx`**.
  - After the existing unmeasured check, the busy state and the hint, it awaits `prepareExplainersForPrint()` and then runs the original timer → rAF → `print()` (`openDialog`).
  - If prepare fails and the reader has not yet been warned, it shows `exportUnmeasured`, releases the frame, and prints on the next click.
  - `fail()` now releases the frame too, because no dialog means no `afterprint`.
- **Test**: one new case. The reporter follows each height with the paper-column height and leaves the root's `style` as it found it. The harness gained an optional `paperBox`; without it the root has no `style` and no paper message is sent, so all 13 older cases are byte-identical in expectation.

## Step 1 — the options, measured (before any product change)

Harness: headless CfT 148 (`--headless=new`, 1440×900 window, DPR 1), raw CDP, `Page.printToPDF` (A4 8.27×11.69in / Letter 8.5×11in, `preferCSSPageSize: true`, no header/footer), then `pdftotext -bbox` per page. Real content was produced without writing anywhere: `Fetch.enable` on `*/api/documents/70/raw*` in the test browser only, fulfilled with the public production HTML of docs 30/33 (read anonymously) plus the local reporter. "Complete" means the last element is on paper: `Paragraph 119.` for fixture 70; for docs 30/33 the final quiz option ("…SQLite is retired" / "…template exactly"). Their quiz explanations are `hidden` and never print.

`Page.printToPDF` **does fire `beforeprint` and `afterprint`** (`before:16918px, after` logged twice), so it is a faithful stand-in for ⌘P.

| option | fixture 70 (1022×16,918) | doc 30 shape (1022×12,707) | doc 33 shape (1022×8,506) |
|---|---|---|---|
| today | **incomplete**, ends ¶101; A4 19 pp, Letter 20 pp | **incomplete** (quiz cut) | **incomplete** |
| A / D, pin 680 at 680-height | **complete** A4+Letter, h 19,893, 23 pp | **complete**, h 13,436, 16 pp, gap 36px | **complete**, h 8,893, 11/12 pp, gap 37px |
| B, pin 680, height = screen h × 1022/680 | complete, est 25,427 → **5–6 blank pages** (gap 5,688px) | complete, est 19,098 → **5–6 blank pp** (5,693px) | complete, est 12,785 → **4 blank pp** (3,926px) |
| C via `zoom` on the iframe | **incomplete** (Chrome re-lays the child out under zoom) | incomplete | incomplete |
| C via `transform: scale(0.6654)` + negative margins | complete, **13 pp**; glyph box 9.07pt vs 13.63pt (**66.5%**), text column x 106→487pt instead of 55→530 | complete, 10 pp | complete, 7 pp |

- **The child's height at the paper width** (true values: frame really pinned, then settled): fixture 70 is 19,893 at both 680 and 703 (its 48rem body hides the difference). Doc 30 is 13,436 at 680 and 13,230 at 703. Doc 33 is 8,893 at 680 and 8,791 at 703.
- **D's emulation** (`measureAt` run in the child at its 1022 viewport): **identical to the true values in all six cells**, 1.8–5.2ms per call.
- **Where the child lays out under print:** at the pinned frame's width. A child probe during printing saw `innerWidth 680`, and the PDF's glyph boxes show no scaling (x starts at 42.75 + 12pt = the `1rem` padding).
- **Pin vs unpinned on Letter:** unpinned, the child lays out at 703 → trailing blank inside the frame of H680 − H703 (206px on doc 30, 102px on doc 33). Pinned, the layout is exact. Pinned was chosen, as the plan's A and B both prescribe; the cost is the explainer laid out 22px narrower than the Letter column.
- **⌘P options:** B's blank pages and C's 66.5% text are both on the stop rule's "must not decide" list. "None" leaves the clip, and the caveat text ("…Its quiz and controls do not work on paper…") does not cover truncation. **D needed no operator decision**, so it was implemented (deviation 1).
- **Viewport-dependent CSS:** the nine public production explainers (25–33) were scanned for viewport media queries, `vw`/`vh` and `@media print`. Only `prefers-color-scheme` appears (docs 29–33), and that changes colours, not layout. So D's emulation is valid for everything readable today.

### Chrome's own slicing artefacts (pre-existing; not F4's, so not fixed)

- An iframe is monolithic, so the frame always starts on page 2. Page 1 holds only the masthead, title and metadata (today and after).
- When the frame ends a few px past a page foot, Chrome emits a near-blank page and pushes the caveat to the next one. Fixture 70 at 680: frame 19,893 → blank p22. A sweep showed tails of ~7–20px trigger it: 19,884 is fine, 19,887–19,900 is odd, 19,910+ is fine. **Reproduced on the unfixed path** (screen frame set to 16,911/16,914 → blank p19), so it is independent of this fix.
- Some docs print a blank page after the colophon (doc 30 shape on A4, before and after).
- These are listed as one deferred-job candidate for the review: *Chrome print slicing of a framed explainer (page-1 gap, near-blank pages) — reason: cosmetic paper waste, pre-existing; trigger: an operator complaint about blank pages in a PDF*.

## After — the matrix (all `complete: true`)

The Export route: `window.print` stubbed to dispatch `beforeprint`, the PDF taken while "open", then `afterprint` dispatched. The ⌘P route: `printToPDF` as-is.

| runtime | route / window | ⌘P A4 / Letter | Export A4 / Letter (prepare ms; style at print) | screen after |
|---|---|---|---|---|
| dev :3030 | anon public, 1440 | ¶119 / ¶119 | ¶119 / ¶119 (29, 34; `height: 19893px; width: 680px`) | `height: 16918px`, child sh 16,918, maxTop 0 |
| dev | `?view=full` (frame 1440) | ✓ / ✓ | ✓ / ✓ (43, 33) | restored |
| dev | **390×844 window** (frame 354×37,797) | ✓ / ✓, **23 pp** | ✓ / ✓ (44, 33) | restored |
| dev | member `/documents/70` (signed in through the real form) | ✓ / ✓ | ✓ / ✓ (30, 41) | restored |
| dev | doc 30 shape | ✓ 16 pp / ✓ | ✓ (37, 42; 13,436) | restored |
| dev | doc 33 shape | ✓ 11 pp / ✓ 12 | ✓ (32, 41; 8,893) | restored |
| prod :3040 | the same six rows | all ✓ | all ✓ (23–48ms) | all restored, child `style` null |

- **The narrow-window side effect:** the unfixed path (paper message stripped) printed fixture 70 at a 390 window as **41 pages (A4) / 43 (Letter), with 18 blank pages**, because the 37,797px phone height went to paper. The fix prints 23.
- **Residual demonstrated (doc 30 + `@media (max-width:700px){body{font-size:19px}}`):** ⌘P printed incomplete, because the emulation gave 13,436 at a 1022 viewport where the query does not match. Export pinned the real frame and printed complete at **18,031**. That is why Export does not trust the emulation.
- **Failure paths (dev, Export):**
  - Unmeasured frame (served without the reporter → `[data-unmeasured]`): the first click shows the existing warning; the second click prints at once (2ms) and nothing is pinned.
  - Frame with no paper message (reporter's `measureAt` stripped): the first click pins and shows "Preparing…"; at 2s it warns `exportUnmeasured` and restores `height: 16918px`. The second click prints after 2,020ms, pinned at the H680 its height messages gave.
  - No console warnings or exceptions in either route (CDP `consoleAPICalled` / `exceptionThrown` empty).
- **Aside `u1`** (the manifest's instrument; member `/documents/70`, dev and prod, 1440×900):
  - ⌘P route: a dispatched `beforeprint` pins `height: 19893px; width: 680px` synchronously; `afterprint` restores `height: 16918px`, 1022 wide.
  - Export: the label is "Preparing…" with the dialog hint; `print()` was reached at 34.5ms (dev) and 48.2ms (prod), with the pin in place; afterwards the label is "Export PDF" and the hint is cleared.
  - After both cycles, a wheel of 500 over the frame moved the **page** 800 → 1300, with the inner scroll at 0 / max 0.
  - An earlier attempt read 592 → 600 because a smooth `scrollTo` was still running; it was re-run with `behavior: 'instant'`.
- **F2/F3 regression on prod (CfT):**
  - Latch: 360 alternating width steps gave 360 posts; released frame 16,918 == child 16,918.
  - F3 stand-in (`::-webkit-scrollbar` 15px + wide `nowrap` table at a 600 frame): `maxTop 0`.
  - A sideways-scrolled child (`scrollLeft 300`) keeps `300` through a post.
  - DPR 2 (`--force-device-scale-factor=2`), body padding 0 / .25 / .5 / .6px: `maxTop 0` in all four.
- **Not exercised:** the past-version route with an explainer. No local explainer has a past version (`/api/documents/{65,66,70}/versions/{1,2}/raw` → 404). It mounts the same `ExplainerFrame` and `ExportPdfButton`. Safari/Firefox were not run: there is no automation for their print dialogs here, so this is in the walkthrough entry.

## Harness essentials (the scratchpad dies with the session)

- **Launch:** `"…/chromium-1223/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing" --headless=new --remote-debugging-port=9555 --user-data-dir=<scratch> --window-size=1440,900 about:blank`.
- **Per page:** `Target.createTarget` → `Target.attachToTarget {flatten:true}` → `Emulation.setDeviceMetricsOverride` → `Page.navigate`. Wait for `.kb-explainer[data-measured]` + 1.5s, then `Page.printToPDF {paperWidth, paperHeight, preferCSSPageSize:true}`.
- **Reaching the child:** `Target.getTargets`, take the `iframe` whose url matches `/raw`, attach flattened, and `Runtime.evaluate` in it.
- **Measuring the PDF:** `pdftotext -bbox`. Words are read per page; "complete" = the final marker's regex over a sliding 7-word window. The gap is the distance from the final marker to the caveat's "This explainer is interactive", converted pt→px.
- **Signing in:** the session cookie ignores the port, so signing in on `:3030` covered `:3040` too.
- **Production standalone:** `ln -sfn ../../static .next/standalone/.next/static`, link each `public/*` into `.next/standalone/public/`, then `set -a; . ./.env.local` and `PORT=3040 HOSTNAME=127.0.0.1 node server.js` in `.next/standalone`. Check the two CSS chunks → 200 and the relay → contains `kb-explainer-print`.

## Runtime left behind

- Up, as found: `kb-p28s2-pg`, uvicorn `:8766`, `next dev :3030`. Stopped: `:3040` and both CfT instances (`:9555`, `:9556`); their profiles are in the session scratchpad only. `web/.next` holds the F4 build.
- The CfT profile's session cookie for `p28s5@example.com` lives only in the scratch profile.
- Dev DB unchanged by this slice. Fixture doc 70 is **kept** for the re-review, and no credential was minted. Production was only read (docs 25–33 raw, anonymously).

## Notebook edits (`phase.md`)

- `## Decisions`: an F4 LANDED half appended to the "PRINT CLIPS…" line.
- `## Doc impact`: one line.
- `## Operator Questions`: one walkthrough entry.
- `## Notes for later slices`: the F4 part of the repro kit consumed, and one "print re-check" note added for the re-review.
- `## Now`: rewritten.
