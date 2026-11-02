# P39-hk.DECOMP — cut "Explain what was built: phase-grounded, suggested shape, glossary, formulas"

## Context

The operator's original P39 was the glossary: term links that open a definition window on hover or tap, plus a glossary section. At execution (2026-11-02) they added three things and confirmed them with a literal "yes" each time. All three are recorded in `intent.md` § *Scope Added at Execution*, which wins over the earlier *Confirmed Intent* wherever they conflict:

- **A.** The confirmation suggests the reader and the shape. No stock "a novice" reader, no fixed Background → Intuition → Code → Best practices → Quiz template. It offers one or two other shapes, and the Quiz is suggested only when the subject earns it.
- **B.** Easy reading and visuals first. Formulas are real typeset math (inline, plus a display block with a plain-words reading and a "where" legend), not raw symbols.
- **C.** The explain covers only what the code does, from the records of the phases that built it. It does no research of its own (no web, no research agents, no fact-check batches, no gap rounds) and is codebase-only, so general mode and subject books are dropped. It offers a research phase first when no phase covers the subject. P38-e1's research sizing is removed. Best practices become **next steps** taken from the workspace. The workspace's explain route changes too.

The phase runs in its own worktree (`phase/P39-hk-explain_what_was_built`). Design style is **`build-after`**, `Mockup: on request`. This slice cuts the phase. It writes no product code and no skill text.

## The executor's job (high row: kind decomposition)

Read `intent.md` whole, `phase.md` through `phase-section` only, and the `design-cowork` skill's slicing rules. Then:

1. **Survey the touch points** (Explore for bulk reads). At least these:
   - **Server native grammar** (`server/native/`: `schema.py`, `parse.py`, `refs.py`, `project.py`, `svg.py`, `README.md`). Also `server/native_ingest.py`, whose `search_text` builds the search projection.
   - **Reader** (`web/src/components/reader/`: `reader-article.tsx`, `print-sheet.tsx`, `print-client.tsx` and their neighbours) and its tokens (`web/src/app/kb-tokens.css`).
   - **Plugin:** `plugin/skills/explain/SKILL.md` (3,347 lines), `plugin/agents/*` (five agents, four of which retire), `plugin/README.md`, `plugin/.claude-plugin/plugin.json` (now 0.9.1) and the plugin changelog.
   - **The copies and their guards:** `web/public/SKILL.md` (the landing's published copy), `.agents/skills/explain/SKILL.md`, the stale vendored `.claude/skills/explain/SKILL.md` (D79-we), `scripts/skills_parity.py`, `scripts/plugin_parity.py`, `scripts/publish_fixture_book.py`, `tests/test_explain_resolver.py`.
   - **The workspace's explain route:** `.claude/skills/create-phase/SKILL.md` *The explain route* and `do-whole-phase` / `do-next-slice` `reference/explain-{decomposition,chapter,review}.md`. These are vendored here; their source is the bootstrap repo's `payload/claude/skills/`.
   - **Product copy** that promises research or general subjects (landing, README, setup skill).
2. **Cut the slices with `new-slice`** as bare folders (never pre-fill a `plan.md`), each with `--kind`, `--risk`, `--order` and `--depends-on`. The shape:
   - **One `co-work` design slice (D1)**, `--kind co-work --risk high`, ordered first after DECOMP. It's one connected group of reading aids inside the chapter view, designed as one job: the term marker and its definition window (hover, tap, keyboard, Esc, short → longer definition, a link to the glossary section), the glossary section, the inline formula, and the display formula block with its plain-words reading and "where" legend. It also covers each one's print form, phone and desktop, light and dark. It extends the reader's existing `kb` design system. Critique level **`critic`**. The canvas waits for the operator's literal sign-off. It comes first because the operator is engaged now, and it is the run's only stop before the acceptance gate.
   - **Groundwork slices that don't depend on the design** (A, C and B's writing rules), ordered after D1 and before DECOMP2. A suggested cut, which the executor may refine from the survey:
     - **(g1) The front door and the confirmation:** A's suggested reader, subject-shaped sections and 1–2 alternative shapes. Codebase-only: a non-code subject is declined plainly. The "no phase covers it → offer a research phase" check. The cost line becomes one writer plus one critic. The quick / full / no-research offer and the price table go.
     - **(g2) The evidence model, writing and check:** the research stage (§3 D1–D5) and the run card are replaced by "read the phases' records and the code, trace every sentence to a code range or a record line". v2 becomes the prior plus the phases since. Translation is kept. Book mode becomes codebase books only. §4's prose rules gain B's visuals-first and short-paragraph rules. §4.2's outline loosens. §4.5 becomes next steps from the workspace. §4.10/B5's critic checks against code and records and flags hard reading, a missing visual and a bare symbol string. This is the phase's open design, so **risk high**.
     - **(g3) Retire the research machinery:** delete the four research agents and Part B's research roles, sync every copy the parity guards check, and update the tests, `plugin/README.md` and the product copy.
     - **(g4) The workspace handoff:** the explain route rewritten for the new flow, plus the research-phase offer, written as a **handoff package in this phase folder** (`package/` mirroring the bootstrap `payload/`, plus `handoff-explain.md`), as P30/P31 did. **This phase does not edit or commit in the bootstrap repo.** The operator's bootstrap session applies the package, and `update-workspace` later brings it here.
     - g1–g3 all edit `SKILL.md`, so they chain. g4 depends on g1–g3.
   - **`P39-hk.DECOMP2`** comes after the last groundwork slice. It cuts the build once D1 is signed: the server grammar first (glossary block, `term:` links, inline and display math, all validated at publish, plus the search projection), then the reader and print built to the signed canvas, then the skill's §4 grammar text for glossary and formulas (translation keeps term ids and formulas verbatim), then the plugin release. **No build slices for the designed surfaces are cut now.**
   - **Optional `research` slice (r1)** before DECOMP2: how formulas are typeset (e.g. KaTeX in the reader) and how the Python server validates TeX at publish, which today has no math engine. Cut it only if the survey can't settle this into one approach for DECOMP2. Findings only, no product code.
3. **Rate risk by the named triggers** (mid is the default: `low` unless open design, a core invariant, an unlocated root cause or a wide blast radius, named beside it). **`spends money: no`** on every slice: no vendor API, no live explain run. A live trial run is a deferred-job candidate, as in P38.
4. **Write `topics/breakdown.md`** whole: `## Passes`, `## Estimate` (time from `dispatch-summary`'s `means`; the workspace mean is thin, so cite P38-e1 as the closest analog), `## Build inventory` (what DECOMP2 builds, not how; D1's one job and its critique level), and one `## <slice id>` block per slice (goal, set, risk and trigger, `spends money:`, depends on). Each **set** lists every file the slice may touch: tests, the changelog, copies, deletions.
5. **Record in `phase.md`** through `phase-section`, as gist lines:
   - `## Decisions`: `Breakdown (DECOMP): …` linking the topic.
   - `## Notes for later slices`:
     - **Merge risk:** P36-1s (Hermes) builds a reader side panel and touches `web/src/components/reader/annotations.tsx` and the reader page on its own branch, so DECOMP2's reader slices will meet it at merge.
     - The bootstrap boundary from g4.
     - `docs/current/` is stale for architecture, decisions, operations, product and qa, so it is evidence only.
   - `## Doc impact` (append-only): one line for the explain contract change (codebase-only, no research, plugin agents retired) and one for the native grammar additions.
   - `## Now`.
6. **Declare every middle slice** (`--depends-on`). D1 and DECOMP2 are barriers and get no declaration. Return the `parallel:` line.
7. **Never** run `accept-gate`, commit, or move phase state beyond the decomposition carve-out. The orchestrator declares the gate after `finish-slice`.

## After the executor returns (orchestrator)

- `record-dispatch`, `finish-slice P39-hk.DECOMP`, then in the same commit `accept-gate P39-hk --require`: the explain confirmation and the reader's term window, glossary and formulas are operator-visible.
- `validate`, then commit `chore(P39-hk): P39-hk.DECOMP cut …`.
- Report the cut and the `parallel:` line. Then the loop reaches D1 (inline co-work, its canvas published, then a `pending` stop for the operator's sign-off).

## Verification

- `python3 scripts/workflow.py validate` passes, `phase-section P39-hk` is under budget, and `finish-slice` accepts the declarations.
- `topics/breakdown.md` has every required section, and every slice carries `spends money:` and a risk with any trigger named.
- No `plan.md` is pre-filled. No file outside `works/phases/active/P39-hk/` and the regenerated `works/` files changed.

## Dispatch

route=high
reason=kind decomposition
subagent_type=slice-executor
model=opus
pass_model=yes
effort=xhigh
pass_effort=yes
attribution=Claude Opus 5.5
explore_model=haiku
explore_effort=xhigh
