# P28.S6 — plan (orchestrator native plan, auto mode, 2026-09-21)

**Round 05 apply: the graph engine.** Executor: `slice-executor-high`.

Scope is round 05's contract **§§4.1–4.9, §5, §6, §7** (`web/design/rounds/05-graph/output/build-prompt.md`). §3's stylesheet already landed verbatim in `P28.S4` — **do not re-create it, do not edit it.** **RESPECT THE DESIGN.**

This is the phase's largest single job: a 687-line contract over a 1711-line hand-written canvas engine. `P28.DECOMP` deliberately refused to split it, because §4.2's persisted `sessionStorage` record carries `legendOpen` (§4.3), `activeProject` (§4.4) and the tag lens (§4.6) — a split would write a record shape for behaviour it does not implement. Work in that order-aware way.

Read `works/phases/active/P28/phase.md` whole first. **Four notes are addressed to you** — the `canonical_path` contract (S1), the accepted `?next=` shape (S5), the stylesheet-order finding (S4), and the D26 diagnostic note with the operator's screenshots. Plus the phase-wide cascade rule, the Aside recipe and its addenda, the live runtime, and the **deaf dev server** trap. None of it is restated here.

## Do these two things before you touch the engine

### 1. Fix the cascade, and measure it

S4 measured that `graph-r5.css` is loaded but **loses** to `graph.css`: `globals.css` compiles to document sheet index 0, the component-imported `graph-tokens.css + graph.css` chunk is index 2, so at equal specificity the old sheet out-orders the new one. `.kb-graph` still computes `height: 636px` / `min-height: 480px` from `graph.css` instead of round 05's clamp. Nine same-selector/same-property collisions. **If you skip this you will debug the fit against the wrong plate.**

**Recommended resolution: move `graph-tokens.css` and `graph.css` into the `globals.css` chain**, immediately before the existing `graph-r5.css` line, and drop the two component imports from `graph-canvas.tsx`. Reasons: it puts all three in one sheet in the record's stated order with **no duplicated rules**; it changes only *where the imports live*, never the files, which stay verbatim; and it is what the later signed round already assumes — **round 06 §1 writes the chain as "`@import` both, in that order, after `kb-console-r4.css` / `graph.css`"**, i.e. round 06 expects `graph.css` to be in the globals chain. The cost is that the graph's CSS now loads on every page; it is a few KB and round 06 priced it in.

The alternative S4 floated (re-importing `graph-r5.css` from the component after `graph.css`) also works but ships two copies of the sheet. Choose with reasons, **measure the collisions before and after** — `.kb-graph`'s computed `height` and `min-height` are the two-second check — and confirm the rules are actually *served* before concluding anything (the deaf-dev-server note gives the curl one-liner). Record what you chose in `## Decisions`.

### 2. Reproduce the off-frame defect before you fix it

**D26 is satisfied and the evidence is in the repo**: `works/phases/active/P28/diagnostics/D26-desktop-graph-mac-chrome.png` and `D26-mobile-graph-iphone.jpeg`, both pre-P28 production. **Open them.** The symptom is the **periphery, not the centre** — the cluster reads fine while long edges run out to outliers that reach or cross the plate boundary — and it degrades sharply as the plate gets shorter (mild on the Mac, bad on the phone).

**The local fixture will not reproduce it as it stands.** `p28s5` has six documents; the operator's graph has roughly thirty across six projects with a hundred tags and several weakly-connected outliers. **Seed a corpus shaped like theirs** — a dense related-linked core plus a handful of nodes connected by one long edge each — and confirm you can see the defect **before** changing engine code. A fix you cannot watch fail first is a fix you cannot claim.

The ranked hypotheses are in the D26 note; the leading one is that **the fit runs before the force simulation settles** and nothing re-fits, which predicts exactly "centre fine, periphery out". **If that is right, §4.2's "first paint always fits" does not fix it on its own** — a graph that spreads *after* first paint needs a re-fit, or a fit deferred until settle. That is engine behaviour the record does not forbid; implement whatever makes the map actually contain its nodes, and **record what you found and what you changed**. Capture the stored `sessionStorage` view record and the plate's **measured** size at first paint as your baseline either way.

Round 05 also names a real unreported case: **landscape on a 390-tall viewport** puts the Fit control below the fold (acceptance check 2).

## The engine work

Follow §§4.1–4.9 as itemised, then §6's markup reference, then §7. The pieces that carry the most meaning:

- **§4.4 project mode** is the operator's own ask on this surface — a project control lights the lens *and* opens that project's five newest documents in the panel, drawn from the payload the page already has. No new endpoint, no new fetch.
- **§4.6 the anonymous graph** — a `publicBase` prop from the two public pages; member pages pass nothing. **Read links:** member keeps `/documents/{id}`; the public graph **prefers `canonical_path`** per the phase decision, falling back to `url` when it is null. It is already `/@{org}/…` — **never prefix `publicBase` onto it.** The non-public gate line emits `/login?next={publicBase}/documents/{id}`, exactly the shape S5's acceptor takes. Tag pills become **lenses**, not links into member routes (this is D18's other half).
- **§4.5 landmark labels** supersede P22's selection-only rule **here and only here**.
- **§4.3 / §4.7** — on a small plate the legend leaves the map for a dock of 44px pills, the zoom stack keeps only Fit, and the panel becomes a bottom sheet with the selected node parked above it.
- **§4.9 dark** — no engine change beyond adding `matchMedia("(prefers-color-scheme: dark)")` to the existing scheme re-read so the map re-inks when the OS flips while the tab is open.
- **§5 copy (D29)** — the five keyed `GRAPH.*` strings into `web/src/content/graph.ts` and the three bilingual inline ones, **adopted verbatim including the Korean halves** (the recorded default; the operator has not overridden it). Copy lives in `content/*`, never inline in the engine, except the three the contract itself keeps inline beside existing micro-copy.

## Tests

**Write no new test file for the engine.** Canvas force-simulation behaviour has no automated coverage in this repo by design, and the sweep is the check. The one exception is `web/tests/next-path.test.ts`: if round 05 needs a `next` shape the existing 25 cases do not cover, add that case there.

## Validation

1. `pnpm --dir web typecheck` · `lint` · `test` · `build`. **Never** `prettier --write` an existing web file (**D22**).
2. **Round 05 §8, acceptance checks 1–10** — all of them are yours.
3. **In the operator runtime, in a real browser**, on **all three routes** the one engine serves: member `/graph`, public `/@{org}/graph`, and the legacy `/graph/{org}`. Prove, at minimum: the plate takes round 05's sizing (the number changed — say what it was and what it is); **the seeded off-frame corpus now fits on first paint** at desktop *and* at 390, and in **390-tall landscape** with the Fit control reachable; a stored view is restored only into a plate of the size it was saved in; a project click both lights the lens and fills the panel; the public graph's read link goes to the pretty path and the gated one to a `?next=` that actually returns you to the document after login; tag pills lens rather than navigate; the map re-inks when the OS scheme flips mid-session.
4. Narrow viewports through S2's harness — **layout there is trustworthy, interaction is not**, and the graph is almost entirely interaction. Drive the interactive checks at the top level (1440×900 native) and, where a check is inherently phone-*and*-interactive, say plainly in `result.md` that it is unverified rather than implying otherwise. The operator walks the real devices at the gate; your job is to be honest about the seam, not to paper it.

## Before you finish

- Append **one** `## Doc impact` line (`frontend.md` for the graph layer and the engine's new behaviours; `experience.md` for project mode, the dock and the anonymous surface; `product.md` if you judge the public tag lens a capability change).
- Edit the notebook: consume the four notes addressed to you, record **what the off-frame defect actually was** (this is the phase's headline finding and the next reader needs it in the notebook, not only in `result.md`), add `## Decisions` for the cascade resolution and any reading of the record you acted on, add a note for `P28.S9`'s sweep about what to re-check on the graph, and rewrite `## Now` (≤ 15 lines).
- Write `result.md` verdict-block-first, naming the instrument and listing the ten acceptance checks with how each was verified.

You never commit and never transition slice or phase status.
