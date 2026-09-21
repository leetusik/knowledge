# P28.S10 — plan (orchestrator native plan, auto mode, 2026-09-21)

**Research: why some framed explainers never report a height — and therefore which fix is the right one.** Executor: `slice-executor-high`. Kind `research`: **you write no product code.** What you learn *is* the product of this slice.

## Why this slice exists

The phase was reviewed, passed, closed and **deployed to production** (`41b569e`, run 35583977122, green). Then the operator reported, against the live site:

> "you just remove a documents inline scroll for both vertical and horizontal. not all the docs has one but some of them does."

It is recorded as `review-phase P28 --verdict changes_requested`. This is the acceptance gate's finding arriving one message late, and it is the only thing standing between P28 and done.

## The orchestrator's diagnosis — treat it as a hypothesis to kill, not a conclusion

I traced it before cutting this slice, and you should try to disprove it rather than confirm it.

A framed HTML explainer is sandboxed **without `allow-same-origin`** (P16 pinned decision 1), so the parent cannot measure it. A height handshake covers that: `@/lib/explainer-height` injects a reporter into the child, `explainer-frame.tsx` listens, the frame grows to content, the **page** gets the only scrollbar. When no height ever arrives, a fallback sizes the frame.

**P28 changed that fallback, and nothing else about scrolling.** I diffed every `overflow` declaration across the whole phase (`70e8eae..HEAD -- web/src`): exactly two were removed, and both were re-declared in `kb-docview.css`. Nothing lost an overflow rule. What changed is a **height**:

| | before P28 (`explainer.css`, deleted by S7) | now (`kb-docview.css:224`, round 06 §3.1) |
|---|---|---|
| selector | `.kb-explainer:not([data-measured]) .kb-explainer__frame` | `.kb-explainer[data-unmeasured] .kb-explainer__frame` |
| height | `calc(100dvh - var(--kb-app-topbar-h) - 13rem)`, `min-height: 30rem` | `--kb-explainer-h-unmeasured: 70rem` |
| when | immediately, and **permanently** for a document that never reports | only after `--kb-explainer-wait` (4s); before that, the flat tier box 26/32/40rem |
| effect | a **window-sized box, the iframe scrolling internally on both axes** | a 1120px slab taller than the window — the box edge and its scrollbar are off-screen, so you scroll the page through it |

The old file's own header says the fallback was "exactly the old sizing … the iframe scrolling INTERNALLY"; round 06's comment claims 70rem is "exactly the pre-handshake behaviour". **Both cannot be true at a 900px window**, and that discrepancy is the whole bug. It also explains "not all the docs has one" — a document whose handshake *succeeds* is content-sized and has been since P17, unchanged by this phase.

**What would disprove it:** the operator's documents turn out to be measuring fine (so the 70rem never applies and the symptom is something else); or the symptom is really a wide `<table>` / `<pre>` that stopped scrolling sideways; or the reporter is being injected and answering, but a P28 change drops the message.

## What to find out — in this order

1. **Reproduce it on the operator's own production documents.** This is the point of the slice; the local fixtures measure fine, which is exactly why nine slices never saw this. Production is `https://knowledge.hi2vi.com` and it is serving `41b569e` right now. The operator's real corpora are the projects `changple5` (20 documents), `arb_upbit_1` (4) and `Mijual` (1) — all **`.html`**, i.e. all framed explainers. Find a reachable URL: try the public shape `/@<org>/<project>/<slug>` and the member shape `/documents/{id}`; I probed `/@leetusik/<project>/graph` and got 404, so the org slug and/or the route shape is not what I guessed — **find the real one** rather than assuming. If every one of those documents turns out to need a login you do not have, **stop and return `needs_operator`** naming exactly what you need (a URL that reproduces it, or a session) — do not fabricate a local stand-in and call it the operator's case.
2. **On a document that shows it, answer the mechanical question:** does `.kb-explainer` carry `data-measured`, `data-unmeasured`, or neither? Measure the frame's computed height, the window height, and the child's real content height. That single reading decides everything downstream.
3. **If it is unmeasured: why?** The reporter is injected by `web/src/lib/explainer-height.ts` into the relayed HTML. Candidate causes worth separating — the reporter never reaches the child (injection point, the relay route, a CSP on the child response); it reaches it but cannot post (sandbox flags); it posts but the parent rejects it (origin check, the 120–40000px clamp, the `kb-explainer-request` re-post race); or the document's own HTML defeats measurement (`height: 100%`, a full-height flex body — a document that is *itself* a scrolling app has no content height to report, which would make the fallback the permanent and CORRECT answer for these documents). **Say which, with evidence.** Do not fix it — report it.
4. **Does this predate P28?** Check a pre-P28 build of the same document (`git stash`-free: build from `70e8eae` in a scratch worktree, or reason from the CSS). If those documents never measured *before* either, the handshake failure is old and only the fallback regressed — which makes the fallback the urgent fix and the handshake a separate job. If they measured before and do not now, a P28 change broke the handshake and that is the real fix. **This distinction decides the fix slice, so do not leave it open.**
5. **Rule the alternatives in or out** while you are in there: a wide `<table>` (`.kb-prose__wide`) and a long `<pre>` in a *markdown* document, both of which should still scroll sideways. One reading each; if they scroll, say so and move on.

## Constraints

- **No product code.** Not a one-line fix, not a tuned token, not a "while I was there". If you find the fix is one line, that is a finding — write it down and let the fix slice make it.
- Read-only against production. **Do not sign in as the operator, do not create or publish documents, do not change server state.** If you need an authenticated view and cannot get one read-only, that is `needs_operator`.
- Instrument: **Aside, `aside repl --account u1`** over Bash — never `u0`, the operator's own signed-in profile. The notebook carries the recipe, the harness and the traps (the deaf dev server, the stale production server); the local dev runtime at `127.0.0.1:3030` and `kb-p28s2-pg` are still up if you want a control.
- `window.print()` is still forbidden in an automated browser.

## What you return

Findings, in `phase.md`, for the fix slice to be planned from — that is the reason this slice is dispatched at all, since your context dies with you. Specifically:

- the verdict on the hypothesis: **confirmed / refuted / something else**, with the reading that decides it;
- the answer to (4): **did this predate P28** — old handshake failure + regressed fallback, or newly broken handshake;
- a **recommended fix**, concrete enough to plan from, and explicitly split into what restores the operator's scroll now and what fixes the cause. Note where each lands, and flag if a fix would contradict round 06's signed "never a viewport sum" — that is the operator's call, not ours, and it belongs on `## Operator Questions`;
- the repro: the exact URL and what to look at.

`result.md` keeps your log — the dead ends, the commands, the measurements. `phase.md` keeps what the next slice needs. Neither restates the other.

## Validation

`python3 scripts/workflow.py validate`. Nothing else — this slice writes no code.

## Before you finish

- Edit the notebook: your findings under a clear heading, a `## Decisions` line for anything you settled, a `## Notes for later slices` entry tagged for the fix slice, and rewrite `## Now` (≤ 15 lines).
- `result.md` verdict-block-first.

You never commit and never transition slice or phase status.
