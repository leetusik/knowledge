# P28.REVIEW — plan (orchestrator native plan, auto mode, 2026-09-21)

**The phase review, on a phase whose acceptance gate is `required: true`.** Executor: `slice-executor-high`.

Ten slices have landed rounds 03–06 across 109 product files. Your job is judgment plus the gate stages — **not** re-running what already passed.

Read `works/phases/active/P28/phase.md` whole, and `works/phases/active/P28/intent.md`. The notebook carries 12 `## Doc impact` lines, **31 `## Operator Questions` entries**, the fixture tenants with logins, the Aside recipe and its four addenda, and an `S9 → REVIEW` close listing what is verified, what is not, and the findings still open.

## The boundary — review the phase, not the system

`python3 scripts/workflow.py phase-scope P28` prints it: creation commit `a40b47e`, range `abfd312..62c6587`, **26 commits, 109 product files**. The boundary is those files, the surfaces they feed, and this phase's own claims. A shared file widens it to every surface it feeds. **Anything you notice outside the boundary is an observation filed as a deferred-job candidate, never a finding** — `P28.S9`'s F4 (the landing hero clipped at 390) is already one of these and is explicitly **not** caused by this phase.

## Do not re-run the rounds

Each apply slice verified its own round's acceptance list — round 03 §8, round 04 §9, round 05 §8, round 06 §8 — in the dev runtime and the production build, and `P28.S9` swept all four viewports across both. **Re-running those lists is the mistake the boundary rule exists to prevent.** Validate that the phase is green as a whole, then spend your time on judgment and on the gate stages.

Validation you do run: `pnpm --dir web typecheck · lint · test · build`, `uv run pytest` (needs `KB_TEST_DATABASE_URL` against a disposable postgres — the notebook's method note says how, and without it you will "find" ~45 environment failures that are not real), and `python3 scripts/workflow.py validate`.

## The gate stages — the gate is `required: true`

1. **Open the running product yourself** in the `## Operator Runtime` runtime and **spot-check the phase's headline claims**. Never pass on other slices' reports alone. The headline claims are: the off-frame graph is fixed (the phase's centrepiece — use the **`p28s6`** fixture, the only corpus large enough to mean anything); the project documents panel exists and its failure is isolated; the chrome-less `?view=full` view works on all three routes; Export PDF produces the designed page; the console is usable at 390.
2. **Walk the changed surfaces with fresh eyes, as a first-time user** — and report everything **dead, confusing or annoying**, explicitly **not** judged against the design record. These go into the walkthrough, never into silent fixes. This is the stage most likely to find what ten slices working to a contract could not see.
3. **Re-run the `## Regression Checklist` lines inside the boundary.** `docs/current/qa.md` holds **4** lines today, all build/validate-level. Re-run what a changed file feeds; record by count, with the diff as proof, anything that falls outside. Then **append this phase's headline checks** to that section — your carve-out, via `doc-new-version --doc qa --source P28.REVIEW` editing **only** `## Regression Checklist`, then `rebuild-docs`.
3b. `## Operator Runtime` is your other carve-out. It is live and correct as operations v0023, but this phase learned a great deal about the instrument (Aside's fixed viewport, the harness, the print route). **Judge** whether the manifest should absorb any of it; if yes, edit only that section the same way. If no, say so — leaving it alone is a legitimate answer.
4. **Route all 31 `## Operator Questions` entries.** Every one must end up either folded into the acceptance walkthrough as a decision for the operator, or **listed for me to file with `defer-job`** (you list, I file — you do not run it). **An unrouted entry is a review finding and you may not pass with one.** Many will collapse into groups — the phase has a recurring pattern of the record's prose overreaching its own stylesheet (the 44px claim, now four instances), and those can be routed as one item. Say so rather than padding the walkthrough with 31 bullets: **the operator has to read this.**

## What the phase must be judged against

`intent.md`'s confirmed intent, in the operator's own terms:

- overall visual improvement; **mobile, tablet and PC** views
- **the graph was broken** — off-frame default, and a **document list when a project is clicked**
- **HTML-only view** and **PDF export**
- fidelity to the four signed rounds under **RESPECT THE DESIGN** — and the phase made **three orchestrator-authorised corrections** to gaps in those records (the iOS input size, the print blocks' display, the dock switch's box). Each restates the record's own declarations and originates no value; all three are in the walkthrough for veto. **Judge whether that characterisation is honest** — if you think any of the three is really a visual decision in disguise, that is a finding.
- three items are **originated, not recorded**: the 500 editorial's sub line, the 11px landmark floor, and S8's `RELAY_PROBE_GRACE_MS`. They must reach the operator as originated.

Also verify the **12 `## Doc impact` lines cover every durable-truth change the phase made** — an incomplete list is a finding. Do **not** consolidate them: return `doc_versions: none — deferred to a docs phase` (your two carve-out sections excepted).

## Known-open, so you do not rediscover them as findings

- **S9's F2** — the graph page is not a `.kb-page-flow` (21px vs 16px). Cosmetic, unfixed, route it.
- **S9's F3** — `requireSession()` bounces to `/login` with **no `?next=`**, so signing out on `/documents` and back in lands on `/dashboard`. **D18 was recorded as closed on both halves and this shows it is not** — route D18 with it and say plainly whether D18 should be reopened.
- **S9's F4** — the landing hero clipped at 390. Out of boundary, `defer-job` candidate, not caused by P28.
- **D15 / D21** — the same stale job, both now passing (S1 confirmed on a full gated run). Recommend dropping both.

## What you return

A structured verdict carrying `review_verdict`, the fixed pointer `explain: not written — run /explain for this phase`, and — because the gate is required — a **`walkthrough`**.

**Write the walkthrough for a person with a phone, an iPad and a Mac, who has not read any of this.** Concrete: which URLs to open, in which runtime, with which login, what to try, and what to look at. Lead with the thing they asked for and complained about — the graph on a phone. Say explicitly what is **unverified** and therefore theirs to judge: **all touch interaction** (including pinch/double-tap zoom on a small plate, which is the design's own justification for dropping the +/− buttons), **Safari on Mac and iOS** (every engine claim in this phase is Chromium's), a **physical printer**, and real devices at DPR > 1. Put the three vetoable corrections and the three originated values where they can see them.

**If the verdict is not `pass`, stop before every pass-only step** — no doc versions, no walkthrough polish — and return numbered findings with proposed fix slices.

## Before you finish

- Edit the notebook as the contract requires and rewrite `## Now` (≤ 15 lines) as the phase's closing state.
- Write `result.md` verdict-block-first.

You never commit and never transition slice or phase status. **`accept-gate` is mine, not yours** — you return the walkthrough, I open the gate.
