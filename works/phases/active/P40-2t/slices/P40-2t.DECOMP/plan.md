# P40-2t.DECOMP — decompose "One way to explain what the records don't cover"

## Context

Two books were made recently from subjects the workspace's records did not cover well enough, and the
two runs went very differently:

- **Note's P8-x9 (English textbook).** Explain refused it because there is no code behind it, so the
  session ran an ordinary phase: corpus → sort wave → merge → DECOMP2 → 6 parallel part writers →
  assemble → proofread → publish. The result is one 129 KB document with one quiz, made in about 3 h
  with home-made checks.
- **arb_upbit_1's P58-pm → P59-d8 (rule v2 book).** The research phase ran first (findings-only, web
  allowed, 37 min). Then the explain book phase ran with a signed outline, writing chapters one at a
  time, each with a critic on a second model. It is still running: at intake it was on chapter 7 of 8
  after about 5 h, and nothing is published yet.

The operator confirmed one standard way (`intent.md`, *Confirmed Intent*):
1. Research always runs in its own findings-only phase. It can read code, the web (with sources) or
   the operator's own material.
2. Explain writes only from records, and it accepts a subject with no code once a research phase
   covers it.
3. One request runs both phases: when the research phase passes, the explain's confirmation appears
   by itself.
4. Explain's checks stay. A book is always a real book.
5. After the outline is signed, the chapters are written in parallel.
6. Before changing anything, check this direction against P59-d8's run. If the run contradicts it,
   ask the operator.

**Where the change lands.** There are two places:
- The knowledge plugin's explain skill, in this repo: `plugin/skills/explain/SKILL.md`, at 0.10.0,
  plus its parity copies (`scripts/skills_parity.py`, `scripts/plugin_parity.py`).
- The workspace's explain and research routes, in the bootstrap repo `payload/claude/skills/`. Its
  HEAD is `fdb1151`, released as v95. The routes live in `create-phase/SKILL.md` (*The explain
  route*, *The research route*) and `do-whole-phase/reference/explain-{decomposition,chapter,review}.md`,
  plus `decomposition.md` and `wave.md`, where "an explain phase's chapters stay undeclared and run
  alone" is stated. `do-next-slice` has twins of those references.

The bootstrap side is delivered as P39-hk did it: a **package in this phase's folder**
(`works/phases/active/P39-hk/package/`: `claude/`, `PATCHES.md`, `README.md`, `checks/apply.py`).
The operator's bootstrap session applies it and releases it, and nothing in this phase writes to the
bootstrap repo itself. Note that this knowledge workspace is still installed at **v89**, so its own
`.claude/skills` are older than the payload. The package targets the v95 payload, never this repo's
installed copies.

## The slice: what the DECOMP executor does

Dispatch `slice-executor` on the high row (decomposition). The executor:

1. **Reads** `intent.md`, then the current route text:
   - the plugin's front door: §1 *The phases that cover the subject*, the "research first" block and
     *The front door, step by step*;
   - §3.4 D1, §9 *A book* and B5 *Critic* inputs;
   - the bootstrap payload's create-phase routes and its explain references;
   - the wave/decomposition rules on explain chapters;
   - `workflow.py` behaviour, only where the engine special-cases explain chapters or the research
     route.
   It does not read the two runs in full: that is the research slice's job.
2. **Cuts the phase.** It should cut a research slice first and then a `P40-2t.DECOMP2`, because the
   exact rule changes depend on the study, and the intent requires the check against P59-d8 before
   anything changes. The executor may cut differently if its reading shows the edits are already
   fully pinned, but it records why. The recommended cut:
   - **R1 — study the two runs and pin the change list** (`--kind research --risk high`, findings
     only). Sources:
     - Note's P8-x9 records, at `../Note/.claude/worktrees/P8-x9-english_textbook_from_my_own_words/workflow/works/phases/active/P8-x9/`
       (unmerged);
     - arb_upbit_1's `works/phases/active/P58-pm/`;
     - P59-d8 in its worktree `../arb_upbit_1/.claude/worktrees/P59-d8-explain_performance_rule_v2_the_bar_ever/`,
       or merged if it has merged by then: its outline, chapter results, critiques, and timings from
       `git log`.

     It records:
     - a side-by-side comparison: time, operator stops, checks run, what the critics and the
       proofread caught, the output shape;
     - a verdict on each of the six confirmed points (holds / holds with a change / contradicted);
     - the **change list**: one entry per file (plugin or payload), stating what changes and why.

     It must answer these open design questions:
     - **(a)** the research block's new lines: which sources it may use (code, web with a source
       beside each finding, the operator's material), and the privacy rules for the operator's
       material. P8-x9's rules are the model: only the operator's own words, no secrets, pastes left
       out;
     - **(b)** how explain's MODE and coverage accept a subject with no code when a research phase
       covers it: the book kind `subject`, what D1 reads, and what the critic traces against;
     - **(c)** how "appears by itself" works. Which step shows the explain confirmation once the
       research phase passes, still asking for the operator's literal yes?
     - **(d)** how chapters run as a wave after the outline gate. Where does the gate sit? What is each
       chapter's set? What happens to critic dispatch in a wave, and which engine refusals need a
       change? What keeps the chapters consistent (for example, the review's whole-book read)?
     - **(e)** the version handshake: plugin 0.11.0 against the next bootstrap release (v96 expected),
       on P39-hk's pattern.

     If P59-d8 has not published by then, R1 records which checks wait for its publish and hands them
     to `REVIEW` in *Notes for later slices*. If the study **contradicts** a confirmed point, R1
     returns `needs_operator`, with the point and the evidence.
   - **`P40-2t.DECOMP2`**, ordered after R1, which cuts the edit slices from R1's change list. Their
     likely shape:
     - plugin edits: the front door and coverage, then the evidence and critic for research findings;
     - the payload package: the research route's sources and chaining, chapters as a wave, the
       package's `PATCHES.md` / `README.md` / `checks/apply.py`;
     - a release slice: the plugin version bump, the parity checks and the README.

     DECOMP2 rates them by the normal rule. A wave is likely: plugin edits and package edits have
     disjoint sets.
3. **Declares** R1 `--depends-on none`. `DECOMP2` and `REVIEW` are barriers and stay undeclared.
4. **Writes** `topics/breakdown.md` (`## Passes`, `## Estimate` from `dispatch-summary`'s `means`,
   and one block per slice: goal, set, risk and trigger, `spends money: no`, depends on). It also
   writes a `Breakdown (DECOMP): …` gist line under `## Decisions`, and any operator-only question
   under `## Operator Questions`.
5. **Never** runs `new-phase` or `accept-gate`. It never fills a cut slice's `plan.md`, and never writes
   outside this repo: the bootstrap repo, Note and arb_upbit_1 are read only.

No slice spends money. The study reads local files only.

## After the executor returns (orchestrator)

- `record-dispatch`, then `finish-slice P40-2t.DECOMP`, then `validate`.
- Declare the acceptance gate in the same commit. The leaning is `accept-gate P40-2t --require`,
  because the operator-facing explain flow changes: they see a new confirmation and the research
  chaining. The walkthrough would be the route summary plus the package for the bootstrap session.
- Relay the `parallel:` rounds line. Then continue in `auto` to R1, which runs on the high row by
  kind. `DECOMP2` plans at the gate like this one.

## Verification

- `python3 scripts/workflow.py validate` passes.
- `next` shows R1 as the next slice and lists DECOMP2 and REVIEW.
- `topics/breakdown.md` holds a block for each cut slice, with its set and `spends money:` line.
- `git status` shows changes only under `works/` in this worktree, and nothing in the bootstrap, Note
  or arb_upbit_1 repos.

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
