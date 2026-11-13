# P28.F4 — plan (orchestrator native plan, auto mode, 2026-10-08)

**Fix: printing, or Export PDF, silently cuts off the end of a framed explainer.** Executor:
`slice-executor-high`. Kind `fix`, risk `high`. This slice has a decision point built in. Read *Stop rule* before
starting.

## Why

Re-review finding 2 (`slices/P28.REVIEW/result.md`; `phase.md` → `## Decisions`, "PRINT CLIPS A FRAMED
EXPLAINER'S END SILENTLY"). The island's inline `height: <measured>px` beats `kb-print.css`'s
`.kb-explainer__frame { height: auto }`. An iframe has no content-auto height anyway, so even without the
inline style it would print at 150px. The frame therefore prints at its **screen**-measured height. The paper
column is narrower than a desktop frame, so the child reflows taller and the rest is cut off with no warning.
Measured: fixture 70 printed paragraphs 0–101 of 0–119 (A4, Letter, `?view=full`). **Live production** doc 30
stops in the middle of quiz question 3 of 5, and doc 33 stops at question 4 of 5. Control: a frame measured at
600px prints complete. This is a P28 defect, in round 06's print half. S8's check 19 passed only because its
fixture barely changes height with width.

## The hard part, stated so you do not rediscover it

The child reports its height asynchronously (`postMessage` from its own process). `beforeprint` is
synchronous, and Chrome lays the page out for print right after it, so **⌘P cannot wait for a fresh height**.
Export PDF *can*: it already has a "Preparing…" busy state and an animation-frame gap before
`window.print()`.

## Step 1 — the options, measured (headless `Page.printToPDF`, the repro kit in `phase.md`)

Measure each of these on fixture 70 **and** a real long public explainer (docs 30 and 33 are public, so read
them anonymously on production, or copy their shape synthetically for local runs; never write to production):

- **A · Export PDF pre-sizes.** On click: set the frame to the paper column's width (the narrower of the
  record's A4 and Letter `@page` columns), send `kb-explainer-request`, await the new height (with a timeout →
  the existing honest-failure path), apply it, then `print()`; restore on `afterprint`. No visual change to the
  sheet. It fixes only the button.
- **B · ⌘P over-provisions in `beforeprint`.** Synchronously set the frame to the column width and to a
  height upper bound derived from the measured screen height and the width ratio, capped at the parent's
  clamp; restore on `afterprint`. Quantify the trailing blank space and any blank pages it adds.
- **C · ⌘P keeps the screen layout and scales it.** Print the frame at its screen width with its measured
  height and scale it to the column (`zoom`, or a transform), so the child does not reflow and the measured
  height stays valid. Verify that Chrome lays out the out-of-process child at the unscaled width under print.
  Quantify the resulting text size on paper. A 48rem body inside a 1022px frame scaled into a ~650px column
  is ~64%.
- **D ·** anything better you find, measured the same way.

The likely shape is A for the button, plus one of B/C/none for ⌘P. "None" means ⌘P keeps the printed honest
note, if the record's note text actually covers this case. Check its wording in `kb-print.css` and the content
strings.

## Stop rule — what you may decide, and what you may not

- **You may implement without asking:** anything that changes **no visible part of the printed sheet**
  except making it complete. Option A qualifies. So does B if it adds no blank page, or at most a trailing
  blank area inside the last page.
- **You must not decide:** anything that changes how the sheet looks, such as C's scaled-down text, blank
  pages, or new note copy, or that needs a new CSS correction. `kb-print.css` is a verbatim record. CSS
  corrections live only in `kb-record-fixes.css`, and `P28.F1` was recorded as the phase's "third and final
  authorised correction". If ⌘P needs such a change, implement A (and anything else in the "may" list),
  then return `needs_operator` with the measured options, the consequence of each on paper, and your
  recommendation, so the operator can choose at the gate. Add the question to `## Operator Questions`.
- If even A cannot be made reliable, say so with the evidence, and return `needs_operator` or `blocked`.

## Where

`web/src/app/(public)/documents/[id]/export-pdf-button.tsx`, `explainer-frame.tsx` (the island owns the
frame's inline height, and probably the print-time sizing/restore and the request-and-await), and possibly
`web/src/lib/explainer-height.ts` only if the child must answer something new. Keep F2/F3's reporter
contract intact. `kb-print.css` stays untouched. `kb-record-fixes.css` only under the stop rule.

## Tests and validation

- At most one or two small core tests, if the await-the-height logic is unit-testable without scaffolding.
  Otherwise verify live; no fixture sprawl.
- Standing gate: `pnpm --dir web typecheck · lint · test · build`. Never `prettier --write` on existing files.
- Live, dev and the production build: `Page.printToPDF` on A4 and Letter, normal and `?view=full`, member and
  anonymous public routes, before and after; with `pdftotext`, the last paragraph or quiz question on paper is
  the document's last. Drive the Export PDF island by stubbing `window.print` to fire
  `beforeprint`/`afterprint`; never call the real `window.print()` in an automated browser. Confirm the
  screen view after `afterprint` is restored exactly: frame height == content, no inner scroll (F2/F3's checks
  still pass).
- `python3 scripts/workflow.py validate`.

## Notebook

One `## Doc impact` line for whatever print contract changed. Consume the F4 part of the repro note. Rewrite
`## Now` last. Delete fixture doc 70 at the end **only if** you are confident the next re-review does not
need it. Otherwise leave it and say so.
