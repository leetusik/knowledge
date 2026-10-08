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

---

# Re-review — plan (orchestrator native plan, auto mode, 2026-10-08)

**A re-review after the operator-reported `changes_requested` (the framed-explainer inner scroll).** Executor:
`slice-executor-high`. Everything above is the first review's plan; its verdict and its routed walkthrough
decisions stand and are **not** re-litigated. The gate is still `required: true`. It was cleared on
2026-09-21 and then reset by the `changes_requested` record, so this review returns a fresh `walkthrough`.

Read `phase.md` whole (its `## Now` is the F2 handoff), `intent.md`, `slices/P28.S10/result.md` (§I root cause,
G latch, H beacon) and `slices/P28.F2/result.md`.

## The boundary of this re-review

What changed since the passing review (`41b569e..HEAD`, product files only): exactly
`web/src/lib/explainer-height.ts` (the injected `REPORTER` string) and `web/tests/explainer-reporter.test.ts`.
The reporter is injected into **every framed HTML explainer** by the BFF raw relay, so the surfaces it feeds
are every place an explainer is framed: the member document page, the public document page, the chrome-less
HTML-only / full view, and the print path (round 06 check 19: Blink prints a content-sized iframe in full).
The whole phase's `phase-scope P28` (34 commits, 111 product files) is the context, **not** the re-run list.
Re-run only the `## Regression Checklist` lines that touch those surfaces; record the other lines by count,
with the diff as the proof. Anything outside is a deferred-job candidate, never a finding.

## What to do

1. **Gates:** `pnpm --dir web typecheck · lint · test · build` (never `prettier --write`), and
   `python3 scripts/workflow.py validate`. No server code changed, so pytest is not required. Say so.
2. **Spot-check F2's headline claims yourself**, in the manifest runtime (dev `:3030` and the production
   standalone build), never on F2's report alone:
   - the latch repro: step the frame width through hundreds of values, then narrow, and confirm frame height ==
     the child's `scrollHeight` and that a wheel over the frame moves the **page** (Aside `u1`,
     `page.frames()[1].evaluate`);
   - DPR 2 `maxScrollTop == 0` on a fractional body (Chrome for Testing headless, per F2's harness note);
   - no post below 120 on a slowed cold load.
   Then a quick first-time-user pass over one framed explainer on each surface above: member, public,
   HTML-only view, and print preview via headless print-to-PDF (never `window.print()`). Report anything dead,
   confusing or annoying in the walkthrough, never as silent fixes. Synthetic local fixtures only; remove
   them or name them.
3. **Doc impact:** verify F2's line covers the reporter's contract change, and that S10 rightly left none.
4. **Operator Questions:** route every entry added since the first review into the walkthrough as a decision,
   or into a deferred-job candidate for the orchestrator to file:
   - the S10 Cloudflare beacon / email-obfuscation entry. Recommended route: a walkthrough decision, with a
     deferred-job candidate for the `Cache-Control: no-transform` change;
   - the 70rem / `100dvh` entry, now off the fix's path. Recommended route: strike, or defer;
   - the answered S10 repro question: mark it consumed.
   An unrouted entry is a finding.
5. **Gate section carve-out:** append this fix's headline check to the qa doc's `## Regression Checklist`
   through `doc-new-version --doc qa` (that section only), then run `rebuild-docs`. Something like: "a framed
   explainer has no inner scroll range at DPR 1 and 2, including after many width changes; a wheel over it
   scrolls the page".

## Walkthrough (return it with a passing verdict)

**The operator accepts on production**, so the walkthrough must start with the deploy prerequisite: this fix
reaches `https://knowledge.hi2vi.com` only after the orchestrator pushes `main`, with the operator's
permission, and the Production Deploy run is green. Then, concretely, on the **retina "node" Mac, Chrome
"Work" profile**, which uses classic always-visible scrollbars:
- open `/documents/60` and wait for it to load: no scrollbar inside the document box, and a wheel over the
  document scrolls the page;
- dock DevTools to the side and drag its edge for ~10 s, or drag the window edge, then close it: still no
  inner scrollbar;
- one more long framed explainer, and its HTML-only view.
Plus the two routed decisions (Cloudflare, 70rem). Keep it short; the first review's nine decisions are
already settled.

## Return

`review_verdict` (`pass | changes_requested | blocked`), numbered findings with proposed fix slices if it is
not a pass, the `walkthrough`, the deferred-job candidates (title / reason / trigger / source), `doc_versions`
(the qa carve-out only), and `explain: not written — run /explain for this phase`. Write `result.md` from
scratch, verdict block first (the first review's `result.md` is in git). Edit the notebook per its rules and
rewrite `## Now` last.

---

# Re-review #2 — plan (orchestrator native plan, auto mode, 2026-10-08)

The first re-review (above) returned `changes_requested` with two findings. Both have since landed, as
`P28.F3` (horizontal-scrollbar inner scroll, `be9157d`) and `P28.F4` (print truncation, `e41eb40`). Same
discipline as re-review #1. Its sections *The boundary*, *What to do*, *Walkthrough* and *Return* apply
unchanged, except for what is listed here. Read `slices/P28.F3/result.md` and `slices/P28.F4/result.md`, and
the notebook's `## Now`.

- **Boundary** (`41b569e..HEAD`, product files): `web/src/lib/explainer-height.ts`,
  `web/tests/explainer-reporter.test.ts`, `web/src/app/(public)/documents/[id]/explainer-frame.tsx` and
  `export-pdf-button.tsx`. The surfaces are unchanged: member page, public page, `?view=full`, print and
  Export PDF.
- **Spot-check yourself**, dev and the production build:
  - F3: classic-scrollbar inner range 0 on a sideways-overflowing explainer, with the wheel moving the page;
  - F4: Export PDF and ⌘P both print fixture 70 and a docs-30/33-shaped explainer to the last paragraph or
    question, on A4 and Letter, and the screen is restored exactly after `afterprint`;
  - a quick re-run of F2's latch, DPR 2 and ×20 cold-load checks.
  Then judge F4's design. The new `kb-explainer-print` message makes the child force a reflow at 680px after
  every height post. Is that safe for documents that run their own scripts or animations? Is its cost
  bounded? Could it flicker, or trigger the child's own `ResizeObserver` or resize listeners in a loop? Any
  real risk is a finding.
- **Doc impact:** verify that the F2, F3 and F4 lines together cover the reporter and print contract.
- **Operator Questions:** route F4's new entry (the post-deploy print check, the four limits, the reused
  warning text) into the walkthrough, plus the Cloudflare decision. F4's page-breaking paper-waste
  observation becomes a deferred-job candidate.
- **Pass-only:** the qa `## Regression Checklist` carve-out now covers both checks: no inner scroll range,
  including classic scrollbars and DPR 2, and a framed explainer prints whole from Export PDF and ⌘P.
- **Walkthrough (on pass):**
  1. The deploy prerequisite.
  2. On the retina "node" Mac, Chrome "Work" profile: doc 60 has no inner scrollbar, and the wheel scrolls the
     page.
  3. Side-docked DevTools drag, or a window drag, then close it: still no inner scrollbar.
  4. Doc 30 or 33: one PDF from Export PDF and one from ⌘P on A4. Both end with the last quiz question and the
     colophon.
  5. The Cloudflare decision.
  Keep it short.
