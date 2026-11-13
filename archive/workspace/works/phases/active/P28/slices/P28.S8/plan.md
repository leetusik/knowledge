# P28.S8 — plan (orchestrator native plan, auto mode, 2026-09-21)

**Round 06 apply, print half: the print layer and the Export PDF control.** Executor: `slice-executor-high`.

Scope is round 06's contract **§3.2 (`kb-print.css`), §4.5 (the print-only blocks), §5's print half (`export-pdf-button.tsx`, `print-blocks.tsx`), and §7's four remaining `print.*` strings** (`web/design/rounds/06-document-views/output/build-prompt.md`). **RESPECT THE DESIGN.** The screen half landed in `P28.S7`.

Read `works/phases/active/P28/phase.md` whole first. **S7 left you an unusually precise handoff** — the exact mount point on each of the three routes (a `{/* P28.S8 MOUNTS … HERE */}` comment marks the line), what the print layer must not disturb, and **six fixture documents built specifically for your checks**, with ids, slugs and measured heights. Read that note and use those fixtures; do not build your own.

Also binding and not restated: the cascade rule, the Aside recipe, the live runtime, and the deaf-dev-server trap.

## This is the phase's first paper medium — and the operator's "pdf export also needed"

PDF export here is a **browser print pipeline**, deliberately: a print stylesheet plus an Export PDF control that calls `window.print()` on the document. Server-rendered PDF stays deferred (**D25**) and is not yours to build. The designed print appearance *is* the spec.

`kb-print.css` goes `@import "./kb-print.css";` immediately after the `kb-docview.css` line in `globals.css`, still **before** `kb-record-fixes.css`. Byte-identical to §3.2. Every other stylesheet in the chain is a verbatim record — **do not touch any of them**.

## Do not call `window.print()` in the automated browser

A print dialog is a **modal that blocks the browser session** — it will freeze Aside and cost you the run. Verify the *control's* behaviour (its busy state, its dialog hint, its `afterprint` clearing, its `exportUnmeasured` branch, its error path) by driving the component's state, not by opening a real dialog. If you must confirm `print()` is actually reached, stub or spy on it rather than letting it open.

## How to verify paper without an emulator — decide this early

Aside **cannot emulate print media**: the recipe note is explicit that there is no `emulateMedia`, no `setDeviceMetricsOverride` and no CDP hatch. So `@media print` rules will not render by asking the page nicely.

The route that actually produces paper is **headless Chrome's print-to-PDF over Bash** — render a fixture URL to a real PDF and inspect it (page count, text extraction, whether the framed explainer came through whole). That exercises the genuine print pipeline rather than a simulation of it, and it is how check 19 can be answered honestly. Work out what is available on this machine and use it.

If you cannot get a real PDF out, the fallback is to read the rules you shipped — enumerate `document.styleSheets` for the `@media print` block and assert the declarations — **and to say plainly in `result.md` that the paper output itself is unverified**, naming which checks are therefore claims about CSS rather than about pages. A temporary probe that flips the media query to `screen` is acceptable to *see* the layout, provided it is reverted and byte-diffed like S6's and S7's were. **Never describe a check as passing on paper when you only read a stylesheet.**

## The checks that carry real questions

- **Check 19 — find out, do not assume: does the engine print a tall content-sized iframe in full?** Chromium and WebKit are reported to; Gecko has been seen clipping. Fixture `66` (`round-06-long-explainer`, measuring **8,698px**) exists for exactly this. **If it clips, the caveat line and the full-width fallback are the documented behaviour, not a CSS bug to chase** — record the engine and the result.
- **Check 20** — grep for exactly **one** `@page` rule with `size: auto`. Page numbers are deliberately left to the browser because `@page` margin boxes are not implemented; do not try to add them.
- **Checks 16 and 17** (links printing their targets, tables repeating header rows) have fixture `64` built for them; **check 18**'s archived stamp has fixture `67` at v3.
- **Check 24 and the run generally: A4 *and* US Letter, in light *and* dark OS schemes.** §5 says print is **always light** — that is the point of testing it with the OS in dark mode. Flip the OS with `osascript` and **restore it** (S2's note).

## The two pieces of markup S7 left you

- **`export-pdf-button.tsx`** (new, client) — per §5: set `aria-busy`, wait one animation frame, call `window.print()` inside a `try`; render the dialog hint with the iOS variant chosen by the platform test; clear on `afterprint`; render `.kb-docexport__error` if `print()` throws or `beforeprint` has not fired within 1500ms. **If the page holds a `[data-unmeasured]` explainer, show `exportUnmeasured` *before* calling `print()` and require a second click** — that is the honesty rule: the user is told the frame has not measured before they get a possibly-truncated page.
- **The second explainer note** — `<p class="kb-explainer__note kb-explainer__note--screen">{print.explainerCaveat}</p>` in `explainer-frame.tsx`, immediately **after** the existing note. The first note must stay the immediate next sibling of `.kb-explainer`, because `[data-unmeasured] + .kb-explainer__note` is the selector that reveals it — moving it silently breaks S7's unmeasured state.

`.kb-docexport__error` is already styled in §3.1 and the control is an ordinary `.kb-appbtn`. The four `print.*` strings are the only §7 copy left; adopt them **verbatim** (D30's recorded default). Watch the phone row: a fourth 44px cell in ~356px is tight — **if it is too tight that is a REPORT, not a restyle**.

## Tests

**Write no new test file.** Print output has no automated harness in this repo and building one is out of scope; the sweep and the operator's gate walk are the check.

## Validation

1. `pnpm --dir web typecheck` · `lint` · `test` · `build`. **Never** `prettier --write` an existing web file (**D22**).
2. **Round 06 §8, checks 14–20 and 24.** Checks 1–13 and 21–22 were S7's and pass; 23 is an open record gap S7 reported — do not silently implement it.
3. **In the operator runtime**, with the six fixtures. The screen-side behaviour of the export control (busy, hint, error, the unmeasured second-click rule) is ordinary browser work; the paper side follows the route you chose above.
4. State explicitly in `result.md`, per check: what you verified **on paper**, what you verified **as CSS**, and what you could not verify at all. The operator prints from a real browser at the gate — your job is to make their walk short and to be exact about the seam, not to imply coverage you did not get.

## Before you finish

- Append **one** `## Doc impact` line (`frontend.md` for the print layer; `product.md` for PDF export as a capability and its browser-pipeline nature; note that **D25** stays deferred).
- Edit the notebook: consume the notes addressed to you, **record the engine finding for check 19** (this is the phase's second "find out" item and the next reader needs the answer, not the question), add `## Decisions` for anything you read into the record, leave `P28.S9` a note on what to re-check on paper and what you could not reach, and rewrite `## Now` (≤ 15 lines).
- Write `result.md` verdict-block-first.

You never commit and never transition slice or phase status.
