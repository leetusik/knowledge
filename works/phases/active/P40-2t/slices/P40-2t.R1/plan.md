# P40-2t.R1 — study the two research-first book runs and pin the change list

Kind `research` (findings only: no product code, no edit to any route file). Mode `auto`.

## Goal

Before anything in the explain route changes, study the two runs that made books from subjects the
records did not cover. Rule on each of the operator's six confirmed points (`intent.md`, *Confirmed
Intent*). Then pin the change list that DECOMP2 cuts into edit slices.

The contract is `topics/breakdown.md` § `P40-2t.R1`: goal, sources, how, set, stops. The current route
text is mapped against the intent in `topics/route-today.md`; start the change list from that map and
re-find each passage by its heading. The DECOMP's notes for this slice are in `phase.md` *Notes for
later slices*; read them through `phase-section` and remove the ones you consume.

## Sources (read-only)

- **Note's P8-x9** (unmerged worktree):
  `/Users/sugang/projects/personal/Note/.claude/worktrees/P8-x9-english_textbook_from_my_own_words/workflow/works/phases/active/P8-x9/`
- **arb_upbit_1's P58-pm:** `/Users/sugang/projects/personal/arb_upbit_1/works/phases/active/P58-pm/`
- **P59-d8:** its worktree at
  `/Users/sugang/projects/personal/arb_upbit_1/.claude/worktrees/P59-d8-explain_performance_rule_v2_the_bar_ever/works/phases/active/P59-d8/`,
  or `arb_upbit_1/works/phases/…` if it has merged. Read its `book/outline.md`, `book/critique/`,
  the answers files, the heads of the chapters' `result.md`, and the timings from `git log`.
- **The route text:**
  - this repo's `plugin/skills/explain/SKILL.md` (0.10.0) and `plugin/agents/explain-critic.md`;
  - the bootstrap payload at `fdb1151` (v95):
    `/Users/sugang/projects/personal/bootstrap_agentic_workspace.sh/payload/claude/skills/`
    (`create-phase`, `do-whole-phase/reference/explain-*.md`, `decomposition.md`, `wave.md`,
    `do-next-slice`), and its engine, only where it special-cases explain chapters or the research
    route;
  - P39-hk's delivery pattern: `works/phases/active/P39-hk/package/` (`README.md`, `PATCHES.md`,
    `checks/apply.py`).

Use the `Explore` agent at plan's `explore_model`/`explore_effort` for the bulky reads: P8-x9's
129 KB book and its corpus, and the many result files. Upgrade a call to `model: sonnet` when the
lookup needs judgment. Read head-first: the verdict blocks, and `phase.md` by section, never whole.

## What to record

Write into topic files as you go, so nothing lives only in context:

1. **`topics/study-p8-x9.md`** and **`topics/study-p58-p59.md`.** Per run, cover:
   - the slices, in order, with their time (commit times);
   - the operator stops and what each asked;
   - the checks it ran and what they caught (P59-d8's critics' must-fix and should-fix counts per
     chapter and their kinds; P8-x9's quote checks and proofread fixes);
   - the output shape (document or book, quiz placement, size);
   - what went wrong or was improvised: P8-x9 refused by explain; P58-pm stretching "research first"
     to the web; the hand-made chaining; P8-x9's glossary work-around for the hosted server.
2. **The comparison** (head of `topics/change-list.md`): a side-by-side table, then a verdict per
   confirmed point (holds / holds with a change / contradicted) with its evidence.
3. **The answers to (a)–(e)**, each as a pinned decision with its reason:
   - **(a)** The research block's source lines: code, web with a source beside each finding, the
     operator's own material such as chat transcripts. Also the privacy rules for the operator's
     material; P8-x9's corpus rules are the model: only the operator's own words, no secrets or keys,
     pastes left out.
   - **(b)** How explain's MODE and coverage accept a no-code subject that a research phase covers:
     - the book kind `subject` and the placement;
     - what D1 reads, when a research phase's topics are the records;
     - how a sentence traces to a finding that cites a web source;
     - what the critic checks against, given that the critic never searches the web.
   - **(c)** How the explain's confirmation "appears by itself" once the research phase passes:
     which skill or step shows it, what it carries forward (the research block's `then:` line), and
     how it still waits for the operator's literal yes.
   - **(d)** Chapters as a wave after the outline gate:
     - where the outline gate sits so that no chapter starts before the operator signs;
     - each chapter's set: its draft, trace, evidence overlay, critique and answers files;
     - how the orchestrator dispatches critics inside a wave;
     - which engine behaviour changes (the `finish-slice` explain exemption, the `parallel-plan`
       "run one at a time" note);
     - what keeps the book consistent.

     The orchestrator's working proposal, to test against P59-d8's evidence and keep or change with a
     reason:
     - every chapter whose prerequisites are only the signed outline runs in one wave;
     - a synthesis chapter that builds on every earlier chapter (like P59-d8's ch 8) runs after them;
     - the outline pins shared running examples and numbers, beside the taught-terms list P59-d8's
       outline already has;
     - the wave is capped at about 3–4 chapters at once, because each chapter also dispatches a critic
       (usage limits);
     - the review's whole-book read checks the recaps and wording across chapters.
   - **(e)** The version handshake: plugin 0.11.0 against the next bootstrap release (v96 expected),
     on P39-hk's pattern (OQ24/F5). Also: what the front door tests, which refusals name which
     version, and what this v89 workspace needs (`/update-workspace`) before it runs the new route.
4. **The change list** (the body of `topics/change-list.md`). One entry per file, plugin or package
   target:
   - the passage (by heading);
   - what changes, and why (which confirmed point or answer);
   - the size: small, medium or large.

   Group the entries so that DECOMP2 can see disjoint sets: plugin, payload create-phase, payload
   explain references with wave and decomposition, engine, and release (version, parity, README,
   package `checks/apply.py`). Include the DECOMP's finding that do-next-slice's `SKILL.md` points at
   `reference/explain-*.md` it does not have: decide whether the package fixes that pointer.
5. **`phase.md`**, through `phase-section`:
   - one `## Decisions` gist line per pinned answer (a)–(e) and one for the comparison's verdicts,
     each pointing at its topic;
   - `## Now` rewritten;
   - `## Notes for later slices` updated, with the consumed DECOMP notes removed and the new ones for
     DECOMP2 and REVIEW added;
   - an operator-only question, if any, on `## Operator Questions`.

## Stops

- **A confirmed point is contradicted** by the evidence (not merely by today's route text, which is
  expected to differ): return `needs_operator`, naming the point, the evidence and the choice the
  operator faces. Pin everything else first.
- **P59-d8 still unpublished:** not a stop. Under *Notes for later slices*, list the checks that wait
  for its publish (the chapter pages and per-chapter quizzes on production, the book's acceptance),
  for DECOMP2 and REVIEW.

## Never

- Write in Note, arb_upbit_1 or the bootstrap repo, or edit any route file, plugin file or product
  file here.
- Commit, or move workflow state.
- Search the web: the subject is the workspace's own runs.
- Quote a secret, a key or the operator's private material beyond what the study needs. The P8-x9
  corpus holds the operator's words: cite record ids and counts, not long quotes.

## Verification

- The three topic files exist, and `change-list.md` holds the comparison, the six verdicts, the
  answers (a)–(e) and a grouped change list.
- `phase-section P40-2t Decisions` shows the gist lines.
- `python3 scripts/workflow.py validate` passes.
- `git status` shows changes only under `works/phases/active/P40-2t/`.
- `result.md` opens with the verdict block.

## Dispatch

route=research
reason=kind research
subagent_type=slice-executor
model=opus
pass_model=yes
effort=xhigh
pass_effort=yes
attribution=Claude Opus 5.5
explore_model=haiku
explore_effort=xhigh
