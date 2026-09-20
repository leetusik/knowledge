# P27.S4 — plan (orchestrator native plan, auto mode, 2026-09-21)

**Design round 05 — the graph at phone / tablet / desktop.** `kind: co-work`, `risk: high`.
Runs **inline**; `Mockup: on request` and none was asked for, so there is no dispatched span: two inline
spans around one operator stop (PENDING #1), two commits. No product code. P28 applies it.

## What this round covers

One surface, one engine: `web/src/app/(app)/graph/graph-canvas.tsx` (1711 lines, a hand-written canvas
force simulation, no library) mounted by three routes — member `/graph`, public `/@{org}/graph`, public
`/graph/{org}`. Everything drawn over it is a `.kb-graph__ui` overlay card at a fixed absolute size.

Six things to settle: the **plate** (its height rule predates round 03's navbar), the **overlays** (legend
11rem bottom-left, info panel 17rem top-right, zoom stack bottom-right, tooltip) at widths where they cover
a third of the map, the **legend project click** the operator asked for, **node identification** under P22's
selection-only labels, the **anonymous** graph inside round 04's public shell, and the graph's **states**
including the operator-reported off-frame default.

## Inputs that are settled, and must not be re-posed

- **Round 03** — the container rule, the navbar, the phone topbar, the tap floor, the editorial/empty state
  rule, the OS-following dark scheme. `web/design/rounds/03-foundation/output/build-prompt.md`.
- **Round 04** — the page flow, the panel head, the anonymous shell (`.kb-app--public`, main capped at
  88rem, no navbar, Sign in never hidden), the confirm and disclosure patterns.
  `web/design/rounds/04-console-surfaces/output/build-prompt.md`.
- Cards continue at **27**. A card superseding 01–26 keeps its path and number.

## Two facts this round is handed, not asked

Both verified in the code this session; the handoff states them as inputs, and the design decides what to do
about them:

1. **The plate's height predates the navbar.** `graph.css:27` is `height: calc(100dvh - var(--kb-app-topbar-h) - 13rem)`
   with `min-height: 30rem`. Round 03 added a 3.6rem bottom bar on phones and a sticky strip on tablets;
   neither is in that sum, and `13rem` was a desktop page-header estimate.
2. **In OS dark mode the console goes slate and the graph plate does not.** The graph's own
   `graph-tokens.css` keys its dark values on `[data-md-color-scheme="slate"]`, while round 03's adoption
   deliberately leaves `data-md-color-scheme="default"` and re-declares `--kb-*` under
   `prefers-color-scheme: dark` — and it re-declares **no** `--kb-graph-*` token (verified: zero matches in
   round 03's stylesheet and token block). So the engine's `readTokens()` still resolves light plate ink.

## The operator's request, as the code actually stands

"Need list of documents when clicked a project." Today a legend project row **is** already a
`<button data-project="…">`: clicking it toggles an `activeProject` highlight/filter, sets `is-on`, and
persists to `sessionStorage`. The info panel (17rem, top-right) currently shows a **node**: eyebrow chip +
project, title, `date · n tags · n links`, tag pills, and "Read the document →". So the round has to decide
how a documents list and the existing filter share one click, and where the list lives. Round 04 already
settled the *project page's* documents panel; this is the graph's own answer and may differ.

## Procedure

### Span 1 — inline, now

1. Write `web/design/rounds/05-graph/handoff.md`: the OUT half, same structure as rounds 03 and 04. It
   decides nothing; eight questions go back in §6.
2. Card contract: paths **`27-…` … `32-…`** under `⏳ P27.S4 · Graph`; line-1 `@dsCard` marker with `group`,
   `viewport`, optional `name` / `subtitle`; the map shown as real frames at **390 / 768 / 1180**.
3. **Ask for the screenshot again, as a named attachment.** The off-frame default was never reproduced here
   (Aside, 1440×900, dpr 1, fresh + settled + tags on/off). The handoff says plainly what happens without
   it: the round designs the sizing and fit behaviour and the defect stays an unreproduced report for P28.
4. `start-slice P27.S4`; rewrite `## Now`; `set-slice-status P27.S4 pending`; `validate`; commit
   `feat(design): P27.S4 handoff — round 05 graph`.
5. **STOP at PENDING #1.** Report the ask, the screenshot, and that their "done" signs the round. I do not
   push; the operator pushes `main` or uses a local-directory connection.

### Span 2 — inline, on the operator's return

6. DesignSync read-back: card contract (27–32 present and contiguous, manifest compiled, no monolith) and
   concreteness (every §6 question answered in the design; the contract buildable with no DesignSync).
   Any failure → name the points, `pending` again, STOP, sign nothing.
7. Land `output/` as-is; run the same mechanical checks round 04 got — the contract's embedded stylesheet
   against the landed file, no stray `@media` where a container is meant, every `--kb-*` referenced already
   defined, every class extended already present.
8. `SIGNOFF.md` with the operator's literal words; carry round 04's deferred regroup into this session's
   housekeeping ask if it was done, and record either way.
9. Edit `phase.md` (Decisions, notes retagged for S5, `## Now`), `finish-slice`, `validate`, commit,
   continue into **S5 — round 06** (document views + HTML-only view + print).

## Constraints

- **Never design.** Real routes, real overlay classes, real copy sources; never lorem, never a proposal.
- The graph's bilingual micro-copy lives **in the engine** (`graph-canvas.tsx`), not in `content/graph.ts` —
  a deliberate P12 decision. Copy stays locked either way; a wanted change is an operator question.
- Additive only: no existing `--kb-*` or `--kb-graph-*` name or value changed; `graph.css` and
  `graph-tokens.css` are the shipped record, so a delta is a new marked block or file.
- D18 (anonymous tag surface) is already filed — P28 absorbs or promotes it. Do not duplicate.
- The gate stays waived unless the operator asks for a mockup.
