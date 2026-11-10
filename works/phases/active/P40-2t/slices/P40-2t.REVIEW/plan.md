# P40-2t.REVIEW — phase review

Kind `review`, high row by kind. Mode `auto`. The acceptance gate is **required**. The phase runs in
its own worktree (`execution.mode: parallel`), so this review writes no doc versions. Its two gate
sections become `## Doc impact` notes tagged `(gate section — written at merge)`.

## What to review

The phase's objective and `intent.md` *Confirmed Intent* set what this review checks against. The
operator asked for one standard way to explain a subject the records don't cover, with six
confirmed points:

1. research runs in its own phase;
2. explain is records-only and accepts a research-covered subject with no code;
3. one request runs both;
4. explain's checks stay and a book is a real book;
5. chapters are written at once after the outline is signed;
6. check against P59-d8 first.

Judge whether the shipped text delivers each point. The pinned answers are in
`topics/change-list.md` §3.

**The boundary** is what `python3 scripts/workflow.py phase-scope P40-2t` prints. That is 11 product
files:
- the explain skill and its two copies, plus the critic agent;
- the plugin and marketplace metadata;
- setup `SKILL.md`, `plugin/README.md`, the root `README.md` and the KB template;
- `web/src/content/marketing/content.ts`.

The bootstrap **package** under `works/phases/active/P40-2t/package/` is also in scope as the
phase's deliverable. Anything outside the boundary is an observation, never a finding.

## Steps

1. **Validate all slices together.** Run:
   - `python3 scripts/skills_parity.py` and `python3 scripts/plugin_parity.py`;
   - `uv run pytest -q`;
   - `pnpm --dir web typecheck`, `lint`, `test` and `build`. The worktree's `web/node_modules` exists
     from S6.
   - the package checks: `python3 works/phases/active/P40-2t/package/checks/finds.py`, `apply.py` on
     a fresh scratch copy of `fdb1151` (`git -C /Users/sugang/projects/personal/bootstrap_agentic_workspace.sh archive -o <scratchpad>/p40-review.tar fdb1151`,
     then `tar -xf` in the scratchpad), the artifact rebuild and the whole patched
     `tests/retrofit_smoke.sh`, and `cites.py` against the 0.11.0 skill;
   - `python3 scripts/workflow.py validate`.

   Keep commands plain and literal: this worktree-isolated session refuses complex `git` commands.
2. **Read the route end to end, fresh, as the next operator would.** Follow a no-code subject (for
   example "the operator's English") and a codebase subject that needs outside knowledge (for
   example P59-d8's "rule v2 + quant basics") through the scratch-patched payload and the 0.11.0
   skill. Trace each through:
   - the front door's "research first";
   - create-phase's research route (one confirmation, run at once, sources and the privacy rules);
   - **When it passes**;
   - `/knowledge:explain <subject> from=<P>`;
   - the redrawn confirmation and the literal yes;
   - the explain route;
   - the book DECOMP with the outline pins;
   - the outline gate holding every chapter;
   - *Chapters at once (a wave)*, at most 4, with the synthesis chapter last;
   - the review's consistency pass.

   Look for contradictions between the plugin and the package: names, cited headings and bold parts,
   version numbers, the `**sources**` marker, `from=`, the `## Explain` hazard (the proposal must be a
   blockquote), and resume from disk after a compaction. Also check S3's extra `wave.md` finds and its
   `&&`-joined outline-gate command (Notes for later slices).
3. **Open the running product** (the gate requires it), by `docs/current/operations.md`
   *## Operator Runtime*:
   - Claude in Chrome, `list_connected_browsers`, then `select_browser` on deviceId
     `c14e5b18-f250-45f1-b92e-4a08a31197b5` before any other browser tool. Open your own tab and close
     it at the end.
   - The `:3030` dev server belongs to the main checkout, so it does not serve this branch. Serve this
     worktree from a **scratch standalone build** (P37-1p's recipe in that section: copy `web/` without
     `.next` to a scratch dir, `pnpm exec next build`, then serve it as the image does). Use a free
     port that is not 3030, and stop it when done. Never restart `:3030`.
   - Check that `/SKILL.md` serves the 0.11.0 skill (the v96 readiness test, `from=P<N>`) and that the
     landing page shows the skill's line count of 2,665.
   - If the instrument is missing or the id does not match, return `needs_operator` (the contract's
     third halt), never a fallback.
4. **The checklist lines inside the boundary.** Re-run only the `docs/current/qa.md`
   *## Regression Checklist* lines that the changed files feed, such as the v94 front-door lines and
   any `/SKILL.md` or landing-count line. Record them as `## Doc impact` notes tagged
   `(gate section — written at merge)`: the rewritten v94 → v96 lines plus this phase's headline
   checks. Do the same for an `## Operator Runtime` change, if any.
5. **Verify the `## Doc impact` list is complete** against the six slices. If a line is missing,
   append it (`doc_impact_added:`). Return `doc_versions: none — deferred to post-merge consolidation (parallel mode)`.
6. **Route every Operator Question:**
   - OQ1 is resolved;
   - **OQ2**, the landing lede "cite every line to the code" for subject books, goes into the
     walkthrough with a recommendation.
7. **Collect the deferred-job candidates**, outside the boundary, for the orchestrator to file:
   - deploying the knowledge server with plugin 0.10.0's grammar (the `glossary` block, `term:` links,
     formulas). Both books hit this (P8-x9's OQ3 and P59-d8's OQ2). Trigger: before the next book
     publishes;
   - anything else the review notices outside the boundary.
8. **P59-d8 now.** It runs in arb_upbit_1. At 22:24, S7 was done, S8 (the synthesis chapter) was in
   progress, and REVIEW was todo. Nothing is published yet. Record what exists by your run: its S7–S8
   critiques and its review's whole-book read, if they are there. If it has not published, name it in
   the walkthrough as the live test of point 4: the chapter pages, the quizzes, and the first real book
   on production.

## The walkthrough (on pass)

Return a `walkthrough` for the operator under the stop rules: about 2k characters plus links, and at
most ~5 decisions. It should cover:

- what changed for them, in plain words (the new flow, step by step);
- **the release order they run**:
  1. their bootstrap session applies `works/phases/active/P40-2t/package/` (its README) and releases
     v96, then pushes;
  2. plugin 0.11.0 is pushed with this branch's merge;
  3. `/update-workspace` here (v89 today), in arb_upbit_1 and in Note;
- OQ2, with a recommendation;
- P59-d8's status;
- the deferred job;
- one line for everything decided as drawn.

## Never

- Edit source or the package (a review). A finding becomes a proposed fix slice.
- Commit, push, or run `accept-gate` / `review-phase` (the orchestrator's).
- Write in the bootstrap repo, Note or arb_upbit_1.
- Leave a server running. Spend money.

## Return

`result.md`, with the structured verdict block first: `review_verdict` (pass / changes_requested /
blocked), numbered findings with proposed fix slices (on a non-pass), `doc_impact_added`,
`doc_versions`, `walkthrough`, the deferred-job candidates, and
`explain: not written — run /knowledge:explain P40-2t for a document, or ask it for a book`.

## Dispatch

route=high
reason=kind review
subagent_type=slice-executor
model=opus
pass_model=yes
effort=xhigh
pass_effort=yes
attribution=Claude Opus 5.5
explore_model=haiku
explore_effort=xhigh

## Round 2 (bounded)

Round 1 returned `changes_requested` with two classes, F1 and F2. Both fix slices are done and committed:

- F2 (`38980a1a`): the critic reads committed siblings with `git -C <draft folder> show HEAD:./<file>`.
- F1 (`6a37b998`): research first is offered whenever the records lack what the reader needs, and an operator's "research first" is always honoured.

This round checks the following:

1. **Each fix against its case list.** Use the acceptance matrices in `slices/P40-2t.F1/plan.md` (11 cases) and `slices/P40-2t.F2/plan.md` (6 cases plus F2's case 2b), with the evidence in each `result.md`. Do not take an executor's word: re-trace F1's cases 5–9 through the texts yourself, and re-run F2's scratch-repo proof for case 3 (nested, one at a time).
2. **Each fix's blast radius.** Check everything the two fixes touched:
   - the plugin skill (front door, §3.2 permissions, B5 item 7), its copies and the critic agent;
   - the package's two create-phase routes, `explain-chapter.md` and `explain-decomposition.md`;
   - `patches/create-phase.md` and `patches/release.md`, `PATCHES.md` and the package `README.md`;
   - the READMEs, setup, the KB template and both manifests;
   - `content.ts` (now 2,722).

   Look for any new contradiction between the plugin and the package, for example the two renamed package bold openings, **When the records lack what the reader needs**. Also check the end-to-end trace from round 1's step 2, now for the covered-plus-basics case.
3. **The validation suite, whole:**
   - parity;
   - `uv run pytest -q`;
   - web typecheck, lint, test and build (build in a scratch clone of `web/`, as round 1 did);
   - the package checks: `finds.py`, `apply.py` on a fresh `fdb1151` archive, the artifact rebuild, the whole patched smoke suite, and `cites.py`;
   - `validate`.
4. **Round 1's other results are reused** wherever no fix touched them: the S2–S4 package parts, the wave and engine probes, the outline-gate probe, and the `## Explain` hazard probe.
5. **The live check, briefly.** Run a scratch standalone build again, because `/SKILL.md` and the landing count changed. On a free port (never `:3030`), confirm with Claude in Chrome (deviceId `c14e5b18-f250-45f1-b92e-4a08a31197b5`) that:
   - `/SKILL.md` equals the skill and carries the new trigger;
   - the landing shows 2,722.

   Stop the server when done.
6. **Mark repeat failures.** If a class fails again, mark it `repeat of round 1 finding <k>` and propose no new fix. The orchestrator then stops for the operator.

**On a pass**, do the pass-only duties from round 1's drafts (`result.md` § *Drafts for a pass*):

- append any missing `## Doc impact` line. F1 and F2 each owe one, and both are already appended.
- add the gate-section notes tagged `(gate section — written at merge)`: the qa.md *Regression Checklist* lines rewritten v94 → v96, with the new counts (2,722), plus this phase's headline checks.
- return `doc_versions: none — deferred to post-merge consolidation (parallel mode)`.
- return the **walkthrough**, updated from round 1's draft: the new research-first trigger, the release order, OQ2 with its recommendation, and P59-d8's status as of your run.
- return the deferred-job candidates, re-listed. Round 1 listed four; drop any a fix resolved.

Rewrite `result.md` for round 2. Round 1's findings stay recorded in this slice's history and in the phase's Decisions.
