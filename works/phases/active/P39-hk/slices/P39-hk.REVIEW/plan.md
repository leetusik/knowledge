# P39-hk.REVIEW — review the phase at its boundary and return the acceptance walkthrough

## Context

P39-hk is "Explain what was built: phase-grounded, suggested shape, glossary, formulas". It runs in its own worktree (`execution.mode: parallel`, branch `phase/P39-hk-explain_what_was_built`). Its acceptance gate is **required**.

What the operator asked for is in `intent.md`: *Confirmed Intent* and *Scope Added at Execution (2026-11-02)*. The contract is three points:
- **A:** the explain suggests a reader and a shape before writing. It is never a fixed template of prefixed sections.
- **B:** easy reading, visuals first, and formulas that look good and are easy to understand, not raw symbols.
- **C:** codebase-only, written from the phases' records with no research of its own. The research agents are retired, and a research phase is offered when no phase covers the subject.

The slices, all done:
- **D1:** the signed design `10-reading-aids`.
- **R1:** the glossary and math approach.
- **S1–S4:** the explain skill rewritten.
- **S5:** the bootstrap package for workspace v92.
- **DECOMP2:** the build cut.
- **S6 and S7:** the glossary and math grammar.
- **S8:** math in the reader and on paper.
- **S9:** terms in the reader and on paper.
- **S10:** the skill's grammar text.
- **S11:** plugin 0.10.0, unpushed.

## Read first

- `.claude/skills/review-phase/SKILL.md`, whole. It binds: the boundary, the gate stages, findings as problem classes, and the parallel-mode doc rule.
- `.claude/skills/design-cowork/reference/build.md`: RESPECT THE DESIGN, the fidelity sweep, Claude in Chrome.
- `works/phases/active/P39-hk/intent.md`, whole.
- `phase-section P39-hk` sections: Decisions, Notes for later slices (every entry naming REVIEW), Operator Questions, Doc impact. Read each pointer line's block in `topics/`.
- `topics/breakdown.md`: `## Pins for every build slice (S6–S9)` and `## Pins for every skill slice (S1–S4, S10, S11)`.
- Every slice's `result.md` verdict block (`slices/*/result.md`). Read in full: S8's and S9's *Live sweep*, *Left to the gate* and *Stack as run*, and S5's checks invocation.
- The signed record: `docs/reference/design/jobs/10-reading-aids/rounds/01-reading-aids/` (`result.md` § Build, `frame.md`, the `canvas/project/` snapshot).

## The boundary

Run `python3 scripts/workflow.py phase-scope P39-hk`. Its file list (`b38ab84..HEAD`, 100 product files) is the boundary. Anything outside it is an observation, never a finding.

## 1. Validate every slice together

- `uv run pytest -q`
- `pnpm --dir web typecheck`, `pnpm --dir web lint` and `pnpm --dir web test`
- the production build in a scratch copy, as `## Operator Runtime` describes (*While `:3030` serves, build a scratch copy*)
- `python3 scripts/skills_parity.py` and `python3 scripts/plugin_parity.py`
- `uv run pytest tests/test_explain_resolver.py -q`
- S5's package checks (`package/checks/{finds,cites,apply}.py`), with the invocations in S5's `result.md`; `cites.py` must report missing=0
- `wc -l plugin/skills/explain/SKILL.md` equals `content.ts`'s count, and a v86 grep over `plugin README.md .claude-plugin web/public/SKILL.md` is empty
- `git status --porcelain .claude/` is empty
- `python3 scripts/workflow.py validate`

Report each with its counts. Run every check before judging; never stop at the first failure.

## 2. Judge the phase

Judge against `intent.md`, A, B and C, and the signed design.
- **A and C, the skill.** Read `plugin/skills/explain/SKILL.md` as its writer and its critic would.
  - Does the confirmation propose a reader and a shape, not a template?
  - Is it codebase-only, from the phases' records?
  - Are the research agents gone? That means their files deleted, nothing citing them, and the plugin shipping only `explain-critic`.
  - Is the research-phase offer there when no phase covers the subject?
  - Does the v92 handshake match S5's package?
- **B, the reader.**
  - Do the formulas and terms in the reader and on paper match the signed record (RESPECT THE DESIGN)?
  - Are they easy to understand, with a plain reading, a "where" legend and a term window?
- **The grammar's invariants.** The four places stay in parity; the anchor invariant holds; the renderer inserts no raw HTML (`render.tsx` and `mathml.ts`); the translation 422s are in place.

## 3. The gate stages (`acceptance.required: true`)

1. **The manifest.** `## Operator Runtime` in `docs/current/operations.md` is filled: the instrument is the "sugang" profile, deviceId `c14e5b18-f250-45f1-b92e-4a08a31197b5`.
2. **Spot-check the running product yourself.**
   - The production origin and `:3030` / `:8766` run `main`'s code, so the gate runs against **this branch's own stack**.
   - **Never touch or restart `:3030` / `:8766`.**
   - Stand the stack up per S8's and S9's *Stack as run*: a scratch DB, the API, and the fixture book with `reading-aids` en/ko. Run both the dev server and the standalone production build on free ports, since the manifest asks for both.
   - Drive it with **Claude in Chrome**: `list_connected_browsers`, then `select_browser` on that deviceId before any other browser tool. Never use another browser. If it is missing, return needs_operator.
   - Use the iframe viewport harness for true viewports, and headless Chrome over CDP for paper, as the manifest's P30 note allows.
   - Check the headline claims end to end:
     - inline and display formulas, with the reading and legend;
     - a term window on desktop and the sheet on a phone;
     - the glossary section and its way back;
     - paper at A4 and letter;
     - Korean and dark.
3. **Walk it with fresh eyes, inside the boundary.**
   - Reach the reading-aids chapter the way a first-time reader would (library or book → chapter), then use it.
   - Report what is dead, confusing or annoying, **not judged against the design record**.
   - Walk also the other surfaces the diff feeds: a chapter with no terms or math (`write-lock`), the old-version page, notes on a formula, and the Review page as far as anonymous allows.
   - Findings go into the walkthrough, never into silent fixes.
4. **Re-run the checklist lines inside the boundary.**
   - Classify every `## Regression Checklist` line (qa doc) by its surface against the phase-scope file list. Re-run the inside lines with the same instrument.
   - Record the table in `result.md`: block, lines, inside/outside, result. Give the outside count with the diff as its proof.
   - **Parallel mode:** write no doc version. Append this phase's headline checks, in the shipped shape `- [ ] <surface>: <one observable behaviour> (P39-hk)`, to `## Doc impact` through `phase-section --append`. Tag each line `(gate section — written at merge)`.
5. **Route every Operator Question**, OQ7 through OQ17. Each one either goes into the walkthrough as a decision or onto the deferred-job list (title, reason, trigger). An unrouted entry is a finding.
6. **The walkthrough**, by the stop rules:
   - about 2k characters plus links;
   - at most ~5 decisions, and only those that change a contract, contradict the operator's words or are costly to reverse;
   - the rest in one "decided as drawn" list.

   It names the URLs on the branch stack. The member-only checks are the Review card with a formula, a highlight across inline math and on a term, and a note beside a term window. For those, the operator signs up a throwaway account on that stack themselves; never put a credential in the walkthrough. It also names the checks only real devices can make: VoiceOver, and Safari on the iPhone and iPad (the √ and MathML, the sheet's fixed placement under WebKit bugs 284945 and 286237).

**Leave the branch stack running for the operator's walk.** Keep the API and the standalone build on their ports, started with `nohup` so they outlive your span. Stop everything else you started. Record in `result.md` the ports, the PIDs, the scratch DB name and the exact stop and cleanup commands. Leave the agent profile as you found it, and close your tabs.

## 4. Deferred-job candidates (list; the orchestrator files them)

- From the notes:
  - the two workspace engine bugs from D1: design-preview's `preview.json` crash, and design-sign mis-parsing a multi-line `open_items:` in `SIGNOFF.md`;
  - `phase-section --to-topic` leaving relative links stale in the moved block;
  - the `kb` Design System Artifact re-sync after S8/S9, which this login cannot open;
  - the deferred-item close/drop candidates in `topics/notes-for-later-slices.md` and in S2's and S4's `result.md` (D67's research half, D72, D73, D76, D84-8s, D75, part of D80-ch). Say which to close, which to drop and why, from what the phase shipped.
- Any routed OQ, and anything noticed outside the boundary.

## Return

- `review_verdict: pass | changes_requested | blocked`.
  - On anything but pass: numbered findings as problem classes, each with its case list and a proposed fix slice (`kind: fix`, risk `high` for a defect in mid-row work).
- On pass:
  - the Doc impact list verified complete, with any missing line appended (`doc_impact_added:`);
  - `doc_versions: none — deferred to post-merge consolidation (parallel mode)`;
  - the `walkthrough`.
- `explain: not written — run /knowledge:explain P39-hk for a document, or ask it for a book`.
- The deferred-job list.
- The instruments, named. Never claim a walk you did not make.

## Rules

- **Edit no source.** Your writes are this slice's `result.md` and `## Doc impact` appends through `phase-section`.
- Never run `accept-gate`, `defer-job`, `doc-new-version`, `review-phase` or any state command, and never commit.
- Nothing under `.claude/`, nothing in the bootstrap repo, and no push.
- Don't trigger JS dialogs. Use only throwaway test data.

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
