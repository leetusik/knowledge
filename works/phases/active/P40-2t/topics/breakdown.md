# P40-2t — breakdown

`P40-2t.DECOMP` wrote this file on 2026-11-10. `DECOMP2` rewrites it in place. `intent.md` is the record of what the
operator wants, and this file says how the work is cut. `topics/route-today.md` maps where the current route text
says something the confirmed intent changes. Line numbers drift, so re-find every passage by its heading.

## Passes

- **DECOMP** (2026-11-10), research first:
  - **What it cut.** One research slice, R1: findings only, high by kind, declared `--depends-on none`. R1 studies the
    two runs, checks the six confirmed points, answers (a)–(e) and pins the change list. Then `P40-2t.DECOMP2`, a
    barrier ordered after R1, which cuts the edit slices from that list. Then REVIEW.
  - **What the phase is not.** It is not a design phase: there is no product visual design and no `co-work` slice.
    It is not an explain phase, since `intent.md` has no `## Explain`. It is not a loop.
  - **Why research first, and not a direct cut.** The edits are not pinned:
    - five open design questions, (a)–(e), are unanswered;
    - intent point 6 requires the check against P59-d8 before anything changes;
    - the route text today contradicts four of the six confirmed points (1, 2, 3 and 5), each in several places
      across the plugin, the payload's routes and references, and the engine (`topics/route-today.md`).
  - **`parallel-plan`:** `DECOMP -> R1 -> DECOMP2 -> REVIEW`, a chain. It is one research slice between barriers,
    with nothing to run beside it. Nothing would unlock a wave at this pass: the parallel work lives in DECOMP2's
    cut, where the plugin and the package have disjoint sets.
  - **R1 stays one slice.** R1 could have been split by run: one slice for P8-x9, one for P58-pm→P59-d8, then a
    synthesis. It was not, because:
    - the plan names one R1;
    - the deliverable is a comparison, and the comparison needs both runs in one judgment;
    - the bulk is read head-first, with `Explore` for the large files;
    - findings are written to topic files as R1 goes, so none of them lives only in its context.

## Estimate

**Where the figures come from.**
- This worktree's meter holds only this DECOMP's own running span. So the time comes from `dispatch-summary`'s
  `means` for P39-hk, the closest earlier phase: it also edited the explain skill and shipped a payload package.
- Command: `dispatch-summary --phase P39-hk --transcripts ~/.claude/projects/-Users-sugang-projects-personal-knowledge`,
  run on 2026-11-10.
- **By route:** high 42.0 min/span (18 spans, raised by real-browser build and fix work); research 33.0 (1);
  mid 11.7 (8).
- **By kind** (span-min per slice): decomposition 21.7, research 33.0, implementation 22.2, review 155.2 (a gated
  real-browser review).
- **P39-hk's skill and package spans**, the closest analogue: S1 5.0, S2 24.8, S3 4.9, S4 6.8 and S5 29.1 min;
  S11, the release, 4.0; DECOMP2 17.7.

| Slice | Route | Span time |
|---|---|---|
| R1 | research | ≈ 45–75 min: two runs, the route text and five design questions. P39-hk's R1, a narrower study, took 33 |
| DECOMP2 | high | ≈ 15–25 min (P39-hk's took 17.7) |
| edit slices (DECOMP2 cuts them; likely 4–6) | high or mid, by the normal rule | ≈ 5–30 min each, about 1–2 h together. A plugin-and-package wave saves about 30–45 min of wall clock |
| REVIEW | high; the gate leans `--require` | ≈ 30–60 min: no browser. Parity checks, `checks/apply.py` against a scratch copy of the v95 payload, and the route read whole. P39-hk's 155 min included a real-browser walk of the reader |

- **Total:** about **2.5–4 h of span time**, or about **2–3.5 h of wall clock**.
- **On top of that:**
  - about 5 min of main-thread planning per slice;
  - the operator's stops: DECOMP2's plan gate, a `needs_operator` from R1 if the study contradicts a confirmed
    point, and the acceptance gate.

**Spend.**
- No slice spends money. R1 reads local files only. Every span is the workspace's own dispatch, with no vendor API
  and no paid service.
- No live explain run is planned. This repo is installed at v89, and the package is applied in the bootstrap
  session, not here. So the new route cannot run end to end inside this phase.

## Join-rebuilt artifact

- **None at this pass.**
- **For DECOMP2 to place:** the plugin skill has generated companions:
  - `plugin/agents/explain-critic.md`, which `python3 scripts/skills_parity.py --write-agents` regenerates from
    SKILL.md's Part B;
  - the copies `.agents/skills/explain/SKILL.md` (the same body) and `web/public/SKILL.md` (the whole file).
  - So every edit to the plugin skill holds all four files in one set, and two plugin-skill slices never run
    together.
- The payload package (`works/phases/active/P40-2t/package/`) shares no file with the plugin.

## P40-2t.R1 — study the two research-first book runs and pin the change list

- **Goal:** the DECOMP plan's R1 (`slices/P40-2t.DECOMP/plan.md`, *The slice*, item 2).
  - A side-by-side comparison: time, operator stops, checks run, what the critics and the proofread caught, and the
    output shape.
  - A verdict on each of the six confirmed points: holds, holds with a change, or contradicted.
  - The change list, one entry per file (plugin or payload), saying what changes and why.
  - Answers to the open design questions:
    - **(a)** the research sources and the privacy rules for the operator's material;
    - **(b)** how MODE and coverage accept a no-code subject: the `subject` kind, D1, and what the critic traces
      against;
    - **(c)** how the explain's confirmation "appears by itself";
    - **(d)** chapters as a wave after the outline gate: the gate, the sets, critic dispatch, the engine's
      refusals, and consistency;
    - **(e)** the version handshake, plugin 0.11.0 against v96.
- **Sources** (all read-only):
  - Note's P8-x9: `/Users/sugang/projects/personal/Note/.claude/worktrees/P8-x9-english_textbook_from_my_own_words/workflow/works/phases/active/P8-x9/`
    (unmerged; 3.8 MB, 20 slices);
  - arb_upbit_1's P58-pm: `/Users/sugang/projects/personal/arb_upbit_1/works/phases/active/P58-pm/` (572 KB, 6 slices);
  - P59-d8 in its worktree: `/Users/sugang/projects/personal/arb_upbit_1/.claude/worktrees/P59-d8-explain_performance_rule_v2_the_bar_ever/works/phases/active/P59-d8/`
    (1.4 MB), or under `arb_upbit_1/works/phases/` if it has merged by then. Read its `book/` (the outline, the
    critiques, the answers), the heads of the chapters' `result.md` files, and the timings from `git log`;
  - the route text, starting from `topics/route-today.md`.
- **How:**
  - head-first: each `result.md`'s verdict block, and each `phase.md` by section, never whole;
  - `Explore` for the bulk (P8-x9's 129 KB document, its corpus);
  - findings go into topic files as R1 goes: `topics/study-p8-x9.md`, `topics/study-p58-p59.md`, then the synthesis
    `topics/change-list.md`. Gist lines go in `phase.md`.
- **Set:** its own new `topics/` files, its `result.md`, and its `phase.md` entries. Nothing in Note, arb_upbit_1
  or the bootstrap repo, and no product file here.
- **Risk:** high by kind (the research row). Trigger: open design, (a)–(e).
- **spends money: no.** It reads local files; the web is not needed, since the subject is the workspace's own runs.
- **Depends on:** none (declared `--depends-on none`).
- **When it stops:**
  - **A confirmed point is contradicted:** `needs_operator`, with the point and the evidence.
  - **P59-d8 is still unpublished:** list the checks that wait for its publish under *Notes for later slices*, for
    REVIEW and DECOMP2.

## P40-2t.DECOMP2 — cut the edit slices from R1's change list

- **Goal:** cut the edit slices from `topics/change-list.md`, and rewrite this file in place.
  - **Likely shape** (the DECOMP plan):
    - plugin edits: the front door and coverage, then the evidence and the critic for research findings;
    - the payload package: the research route's sources and chaining, chapters as a wave, and `PATCHES.md`,
      `README.md` and `checks/apply.py`;
    - a release slice: the plugin version bump, the parity checks and the README.
  - Rate the slices by the normal rule. A wave is likely, since the plugin and the package have disjoint sets.
  - Plan it at the operator's gate, like this one.
- **Pins:**
  - **The package** lives in `works/phases/active/P40-2t/package/`, on P39-hk's pattern
    (`works/phases/active/P39-hk/package/`).
  - **It targets** the v95 payload at `fdb1151`, never this repo's v89 `.claude/skills/`.
  - **Nothing writes** to the bootstrap repo.
  - **Every plugin-skill edit** keeps its three copies and the regenerated critic agent in one set (*Join-rebuilt
    artifact*).
- **Risk:** high by kind. **spends money:** no. **Depends on:** nothing declared (a barrier). It runs after R1 by
  order.

## P40-2t.REVIEW — phase review

- **Goal:** review the phase's boundary (`phase-scope P40-2t`): the plugin skill's copies and agent, the release
  files, and the package. It validates every slice together. It inherits R1's checks that wait on P59-d8's
  publish.
- **The gate leans `--require`.** The operator-facing explain flow changes: a new confirmation, and research
  chained to the explain. The walkthrough would be the route summary plus the package for the bootstrap session.
- **Parallel mode:** a branch review writes no doc versions. Its gate sections go to `## Doc impact`, tagged
  `(gate section — written at merge)`.
- **Risk:** high by kind. **spends money:** no.
