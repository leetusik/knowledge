# P28.F1 — plan (orchestrator native plan, auto mode, 2026-09-21)

**Fix: the graph dock's tag switch measures 0×0 on a small plate.** Executor: `slice-executor-high`.

`P28.S9` found this in the sweep and correctly did not patch it — it is larger than its one-line allowance and needed a ruling. Here is the ruling.

## The defect

Below 34rem of plate the legend is replaced by `.kb-graph-dock`, and the Tags control moves there. **It renders 0×0 while staying in the tab order** — so on a phone, the only control that hides the corpus's tag hubs (76 of them on the `p28s6` fixture) is invisible, un-clickable, and a keyboard tab-stop that appears to do nothing.

The cause is a record gap, verified in the source this session:

- `graph.css` scopes **all four** of the switch's rules as descendants — `.kb-graph .kb-graph-switch` at `:172`, `:184`, `:196`, `:199`. Those are what give it its box.
- Round 05 §9 says to **render the dock as a sibling** of `.kb-graph`, and `P28.S6` did exactly that.
- Round 05's own sheet **expects the switch to be there** — `graph-r5.css:141` styles `.kb-graph-dock__item .kb-graph-switch` — but it never re-declares the sizing that the move stranded.

So the round moved the element out of the selector that sizes it and did not bring the sizing along.

## Where the fix goes, and why

**`web/src/app/kb-record-fixes.css`.** Not `graph.css` (round 05 §1 declares it and `graph-tokens.css` *do not touch — shipped records*), and not `graph-r5.css` (byte-identical verbatim record). The corrections sheet exists for precisely this and is already imported last.

**Authorisation: granted by the orchestrator, 2026-09-21**, under the operator's standing "do whatever you recommend" and on the same reasoning as the two corrections already in that sheet — a **miss in the record that defeats the record's own intent**, originating no value. Round 05 plainly intends the switch to be usable in the dock; it styles it there. This is the **third and, on current evidence, final** orchestrator-authorised correction in P28. Follow the sheet's charter to the letter: one commented block naming the round and section, the gap, the authorisation and its date.

**Restate, do not redesign.** Re-declare the record's own existing declarations at a selector that reaches the switch inside the dock. Take the values from `graph.css` verbatim — **choose no new number, no new colour, no new size.** If you find you cannot fix it without originating a value, stop and report that instead; that would make it a design question rather than a correction.

Do not widen the blast radius: the switch inside `.kb-graph` (the legend, on a medium or large plate) is **working correctly today** and must render byte-identically after your change. That is the main risk in this slice — a selector loose enough to fix the dock but tight enough not to disturb the legend.

## Validation

1. `pnpm --dir web typecheck` · `lint` · `test` · `build`. **Never** `prettier --write` an existing web file (**D22**).
2. **In a real browser, in the manifest runtime**, with the **`p28s6`** fixture (the only one with a map worth looking at — 33 documents, 100 tag hubs; login in the notebook's fixture note):
   - On a **small plate** (the dock showing): the Tags switch has a real box, is ≥44px on its tap target per round 03's floor, toggles the 76 tag hubs off and on, and shows its `is-on` state correctly.
   - On a **medium and a large plate** (the legend showing): the switch is **unchanged** — measure it before and after and say so with numbers.
   - Keyboard: the switch is reachable and its focus ring is visible in both placements.
3. Confirm the rule is actually **served** before concluding anything — the notebook's deaf-dev-server note has the curl one-liner, and this slice is exactly the kind of small CSS change that trap disguises.
4. Verify in the production build as well as dev.

## Before you finish

- Append **one** `## Doc impact` line only if this changes durable truth beyond the correction itself (it may not — judge it).
- Edit the notebook: mark **S9's finding F1 as fixed here**, with what the fix was; add the `## Decisions` line recording the third authorised correction; add a `## Operator Questions` entry putting it in the gate walkthrough alongside the other two corrections, so the operator can veto it the same way; and rewrite `## Now` (≤ 15 lines).
- Write `result.md` verdict-block-first, with the before/after measurements for both placements.

You never commit and never transition slice or phase status.
