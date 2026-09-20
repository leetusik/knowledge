# P27.DECOMP — result

- **status:** done
- **summary:** Cut P27 (`design-only`) into five bare middle slices — `P27.S1` (docs, seed `## Operator Runtime`) plus **four** design rounds `P27.S2`–`P27.S5` (rounds 03 foundation, 04 console surfaces, 05 graph, 06 document views + print) — and recorded the verified build inventory, breakdown, decisions, notes and two operator questions in `phase.md`.
- **files_changed:** `works/phases/active/P27/phase.md`; `works/phases/active/P27/slices/P27.{S1,S2,S3,S4,S5}/slice.json` (new bare folders); `works/phases/active/P27/slices/P27.DECOMP/result.md`; engine-regenerated `works/backlog.md`, `works/index.json`, `works/state.json`, `works/events.jsonl`, `docs/index.json` (timestamp only)
- **validation:** `python3 scripts/workflow.py rebuild` → OK; `python3 scripts/workflow.py validate` → **passed** (only pre-existing warnings from P22/P26 unknown kinds and the repo-wide oversized-doc-sections advisory)
- **deviations:** one — **four** design rounds instead of the plan's suggested three (S4/S5 split); reasons below
- **doc_impact:** none — this slice changed no durable truth (S1 or `P27.REVIEW` records the operations-doc note; see the authority note in `phase.md`)

## What was created

| Slice | kind / risk | order | depends_on |
|---|---|---|---|
| `P27.S1` | `docs` / `low` | 1 | — |
| `P27.S2` | `co-work` / `high` | 2 | — |
| `P27.S3` | `co-work` / `high` | 3 | `P27.S2` |
| `P27.S4` | `co-work` / `high` | 4 | `P27.S3` |
| `P27.S5` | `co-work` / `high` | 5 | `P27.S4` |

All five are **bare folders** (`slice.json` only — verified by `ls`); no `plan.md` was pre-filled. No `DECOMP2`, no build/apply slices (`design-only`, per the plan's fixed decision 1). The full breakdown with per-slice rationale and risk reasoning is in `works/phases/active/P27/phase.md` → `## Slice breakdown`; the build inventory is in the same file → `## Build inventory`. Neither is restated here.

## The one deviation: four rounds, not three

The seed suggested `S4 = graph + document views` as one round. I split it because:

1. They are the phase's **two net-new capability areas** (legend project click → panel document list; chrome-less HTML-only view + Export PDF), each carrying its own open design questions — the merged card set would have been the phase's largest and least coherent.
2. **Different media.** Round 06 has to design a *print* appearance, which is not the screen pattern language of rounds 04/05, and it must cover **both** document rendering paths (see below).
3. Round 04 was deliberately left whole for the opposite reason: once round 03 fixes the responsive patterns, the console pages are largely composition of one pattern language, so splitting them would cost an operator session and buy little.

I did **not** create a closing consistency-sweep round — its content (empty/loading/error/not-found states, focus, reduced motion) is foundation work and sits in round 03. Whether a round 07 sweep is wanted after round 06 is on `## Operator Questions` with a stated default of "no".

## Grounded facts: spot-checked, and what my read added

Every fact in the plan's *Grounded facts* section that I checked held:

- **No responsive handling in the console** — `kb-console.css:30` (`.kb-topbar` flex, no wrap) and `:41` (`.kb-app-layout` grid with the fixed `var(--kb-app-rail-w)` column) confirmed verbatim; `dashboard/page.tsx:298` hard `grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]` confirmed, plus non-wrapping header rows at `:263,349,390`.
- **One width media query in the whole app** — a repo-wide grep for `min-[`, `@media`, `sm:`/`md:`/`lg:` across `src/app` + `src/components` (marketing excluded) returned exactly one: `min-[720px]:` at `documents/page.tsx:229`. Every other `@media` hit is `prefers-reduced-motion` (`globals.css:313,331`, `kb-console.css:172`, `graph.css:421`); every other `-sm/-md/-lg` hit is a token name, not a breakpoint.
- **`## Operator Runtime` is absent** from `docs/current/operations.md` (H2 grep lists 20 sections, none of them it).
- **Next round number is 03** — `web/design/rounds/` holds `01-landing` and `02-onboarding` only.

Three additions my own read made, all folded into the inventory:

1. **`not-found.tsx` exists in six places** (`(app)/documents`, `(app)/projects/[projectId]`, and four `(public)` routes) and is undesigned — the plan's "no `error.tsx`/`loading.tsx` anywhere" is correct, but "not-found" is a real, already-shipped, undesigned surface, not a blank slate. It belongs in round 03's system-wide states.
2. **The public shell is composed 1:1 from the member shell** — `web/src/components/public-shell.tsx` reuses the same `.kb-app` / `.kb-topbar` / `.kb-app-main` with no new CSS or tokens. So any topbar or narrow-width decision in rounds 03/04 lands on the anonymous shell simultaneously; the handoff should say so rather than ask for the shell twice.
3. **The document view has two rendering paths, not one** — `document-view.tsx:109` renders HTML explainers through the sandboxed opaque-origin `ExplainerFrame`, and `:117` renders markdown docs through `MarkdownBody` + `prose.css`. The plan described only the iframe path. This is load-bearing for round 06: the **print appearance must be designed for both**, and printing a cross-origin sandboxed iframe from the parent page is a real constraint on what a `window.print()` pipeline can produce — stated as an input to the round, not resolved here.

## One conflict raised, not resolved (needs the orchestrator at S1 planning)

The approved plan instructs `P27.S1` to seed the manifest with `doc-new-version --doc operations --source P27.S1` + `rebuild-docs`. `CLAUDE.md` and both executor contracts forbid a **non-review** slice from versioning docs, and name the `## Operator Runtime` carve-out as the **review's**. An executor dispatched on that plan as written will refuse or escalate, and `--risk` cannot fix it (the ban is by slice kind, not tier). Two clean routes, both recorded in `phase.md` `## Notes for later slices`:

- **(a)** authorize the exception explicitly in `P27.S1`'s `plan.md`, so the executor knows it is sanctioned; or
- **(b)** have S1 draft the manifest text into `phase.md` `## Doc impact` and let `P27.REVIEW` write the section under its carve-out on a pass — which still lands before P28 starts.

I did not pick one: it is a workflow-authority call for the orchestrator, not a decomposition call, and S1's folder stays bare either way. I created S1 as `docs / low` per the plan.

## Boundaries honored

No commits, no `git add`. No state transitions other than `new-slice` ×5. No `defer-job` / `promote-deferred` / `accept-gate` (the gate waive is the orchestrator's, in the `finish-slice` commit). No product code, no doc versions, no `plan.md` written for any created slice, and no edit inside `phase.md`'s generated `## Slices` block (the block after my write matches the engine's `rebuild` output exactly — `rebuild` ran after and changed nothing in it).

`phase.md` is 18,152 B — far under the ~400 KB budget.
