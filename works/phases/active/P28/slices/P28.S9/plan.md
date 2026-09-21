# P28.S9 — plan (orchestrator native plan, auto mode, 2026-09-21)

**The cross-surface fidelity + functional sweep.** Executor: `slice-executor-high`. Kind `qa`.

Eight apply slices have landed rounds 03–06. **You are the close, not the first browser run** — every one of them verified its own surfaces against its own round's acceptance checks, in the manifest dev runtime and the production build. Your job is what no single round could see alone.

Read `works/phases/active/P28/phase.md` whole first. It carries **everything you need and a great deal you should not redo**: the Aside viewport recipe and its three addenda, the fixture tenants (`p28s5`, `p28s6`, `p28s6noslug`, `p28s6empty`) with logins and what each is for, the live runtime, the deaf-dev-server and stale-production-server traps, and four notes addressed to you by name (S6 on the graph, S7 on the document fixtures, S8 on paper, DECOMP on your remit).

## Your one licensed code change

**The landmark label floor.** `## Decisions` carries the ruling: round 05 §4.5.1 labels the top eight documents *always* so a stranger can orient, and at the now-correct fit zoom they paint at ~3.7px — noise, not labels, which defeats the round's own intent. Add a **one-line minimum screen-space floor in `drawLabel`, for the landmark tier only** (selection, hover and zoom labelling are unchanged and already legible). **The px value you pick is ORIGINATED** — name it in `result.md`, and put it in your notes as an adjustable number for the gate walkthrough. Do not invent a token, do not restyle the label, do not touch the other label tiers.

Everything else: **land no fix larger than a line.** Anything bigger is a finding for `P28.REVIEW` to turn into a `fix` slice. Report with a repro, not a patch.

## What the sweep is actually for

The rounds each proved their own surface at their own breakpoints. What nobody has checked is **the whole product, at every viewport, as one thing**:

1. **Every changed surface at all four viewports** — 390×844, 820×1180, 1024×768, 1440×900 — in the **dev runtime and the production build**. `python3 scripts/workflow.py phase-scope P28` prints the boundary; the changed files and the surfaces they feed are your list.
2. **The seams between rounds**, which are where a per-round check is blind by construction. Known candidates already in the notebook: the graph page is **not** wrapped in `.kb-page-flow` although round 04 made every other console page one; the graph's CSS now loads on every page (provably inert, but a weight change elsewhere would be the first sign otherwise); the phone actions row is now four cells after S8 added the fourth. Look for more.
3. **The functional pass — this is the half that is easy to skip and the operator will not.** Every visible control does something. Interaction states exist (hover, focus, active, busy, disabled-by-intent). Liveness over time: a busy button that never clears, a skeleton that never resolves, a toast region that nothing ever fills, a spinner still spinning after the action finished. **Click things.** A surface that looks right and does nothing is a failure of this phase, not a cosmetic note.
4. **Rounds 01/02 — the landing page — for breakage only.** It is out of scope by intent: **report, never redesign.** One known pre-existing item is already recorded (its inline scheme script makes it slate in OS dark); do not re-report that one as new.

## Honesty about what you cannot reach

The three things S6, S7 and S8 each flagged as beyond them are beyond you too unless you find a way:

- **Touch.** Nothing in this phase has been driven with a finger — the graph dock's thumb-scroll, the sheet's internal scroll, and pinch/double-tap zoom on the small plate. That last one matters: dropping the +/− buttons on a small plate is justified *by* pinch working. If you cannot drive touch, **say so per affected check** rather than implying coverage.
- **Safari, Mac and iOS.** Every engine claim in this phase is Chromium's, including S8's print findings and the tag-chip-in-dark issue it flagged as Safari-untested.
- **A physical printer.** Every paper claim is a PDF out of the print pipeline.

These are precisely what the operator's gate walk exists to cover, so **name them clearly and route them into the walkthrough material** rather than treating them as failures. Never claim a browser or device run you did not make.

## Validation

1. `pnpm --dir web typecheck` · `lint` · `test` · `build`, and `uv run pytest` once (S1 touched the server; the phase should be green end to end). **Never** `prettier --write` an existing web file (**D22**).
2. `python3 scripts/workflow.py validate`.
3. The sweep itself, per §1–4 above, with the fixtures the notebook names — **`p28s6` for the graph**, `p28s5`'s six documents for the document and print surfaces, `p28s6noslug` for the legacy graph route and the `canonical_path: null` fallback, `p28s6empty` for the empty plate.
4. Do **not** re-run the per-round acceptance lists as your own. They passed; re-running them is the mistake the phase's boundary rule exists to prevent. Spot-check a headline claim per round if you want confidence, and spend the time on the seams and the functional pass instead.

## Before you finish

- Append **one** `## Doc impact` line only if the sweep itself changed durable truth (the label floor does). If nothing durable changed beyond that, say so.
- Edit the notebook: consume the four notes addressed to you, record **the label value you chose**, add a `## Decisions` line for it, and — most importantly — leave `P28.REVIEW` a clear, consolidated account of **what is verified, what is unverified and why, and every defect you found but did not fix**, each with a repro. The review builds the operator's walkthrough out of exactly that.
- Rewrite `## Now` (≤ 15 lines).
- Write `result.md` verdict-block-first, with the four-viewport × surface matrix and an explicit unverified list.

You never commit and never transition slice or phase status.
