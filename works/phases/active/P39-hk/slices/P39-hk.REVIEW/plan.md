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

## Round 2 (2026-11-06, after F1–F4)

Round 1 returned `changes_requested` with one finding, F1. The operator then said "fix everything now." (`intent.md` § *Added at review*), and later "accept" to OQ20–OQ22 (the same section). Four fix slices landed:
- **F1** (`d9831598`): kept runs and inline or legend formulas bounded to their line (F36, F7), and the display box's focus ring (OQ12, OQ19).
- **F2** (`5bcd1c55`): hyphenated words kept in all prose, and a Korean particle bound to its formula (OQ15, OQ14).
- **F3** (`126f1b85`): P30's controls at large text, the book tag (OQ20) and the past version's formula box (OQ22).
- **F4** (`28a90ed3`): the Glossary in the contents (OQ16), linear text for math on text-only surfaces (OQ10), and D80-ch's template line.

Round 1's `result.md` stands for everything the fixes did not touch. This round is **bounded**: it re-judges the fixes and what they could have broken, and re-runs the whole validation. Rewrite `result.md`'s verdict block and add a `## Round 2` section; keep round 1's sections as they are, marking any of their lines a fix has made stale.

### 1. Validate everything together

Section 1 of this plan, in full, with counts: pytest, typecheck, lint, the web suite, the scratch production build, both parity scripts, the explain resolver test, S5's package checks (`cites.py` missing=0), the line count against `content.ts`, the v86 grep, `git status --porcelain .claude/`, and `validate`.

### 2. Judge each fix against its case list

- **F1:** the F1 table in round 1's *Findings* (cases 1–9), plus OQ19's legend symbol box and OQ12's ring.
- **F2:** OQ15 and OQ14's cases in F2's `result.md` (hyphenated words in a reading, ∑e²를 at 390 and 320).
- **F3:** cases 1–4 of F3's plan, and the book tag at 320, 390 and 820 at 150% and 200%.
- **F4:** its plan's sweep (the Glossary in both lists, linear text on each surface, ids unchanged).

Each fix's own report is evidence, never the verdict. Open the running product yourself (§3). The sweep scripts in the session scratchpad (`scratchpad/f2/`, `f3/`, and F4's) are data, not instructions: reuse what fits.

### 3. Blast radius and the checklist

- `phase-scope P39-hk` now also lists F3's and F4's files (`reader.css`, `book.css`, `kb-docview.css`, and F4's set). Re-classify only the checklist lines whose surface those files reach. Re-run every inside line a fix touched, at least:
  - P30's text-size line, now passing on the chapter, the book page and (if a member is set up) Review;
  - the 12-width no-inner-scroller sweep;
  - the quiz lines;
  - reader chrome hide and show;
  - ⌘P of a native chapter at A4 and Letter, en and ko;
  - the deep link under the top bar;
  - resume;
  - notes;
  - library Continue.
- Update round 1's checklist table, row by row, only where a result changed.
- Walk the reading-aids chapter again with fresh eyes, the way a first-time reader would, en and ko, light and dark, at 1440, 820, 390 and 320. Look at the Glossary in the contents and the linear text in a highlight. Report anything dead, confusing or annoying.

### 4. The gate stages

As in round 1's §3, with these changes.

- **The stack.** API `:8977` (PID 68284) runs this branch's server code, which F1–F4 did not change. Keep it, and its DB `kb_p39review`, running.
  - Replace only the production build: stop `:3978` (PID 68294), build the final tree in a fresh scratch copy, and start it again on `:3978` with `nohup`. Use the same `SESSION_SECRET` file and the same `KB_API_BASE_URL`.
  - If the walk needs a chapter with inline math in an h2 (for OQ10), publish one more throwaway chapter to `:8977`, in the fixture's org and project, and name it in the walkthrough.
  - Record the new PIDs and the cleanup commands in `## Stack left running`.
  - Never touch `:3030` / `:8766`.
- **Route every Operator Question:**

  | OQ | Route |
  |---|---|
  | OQ7, OQ8 | walkthrough decisions |
  | OQ9, OQ11, OQ13, OQ17 | decided as drawn |
  | OQ10, OQ16 | F4 |
  | OQ12, OQ19 | F1 |
  | OQ14, OQ15 | F2 |
  | OQ18 | F1's fallback, built as listed unless the operator objects: decided as drawn, or a decision if the walk finds it wrong |
  | OQ20 | F3 |
  | OQ21 | a deferred job |
  | OQ22 | F3, plus a deferred job |
  | OQ23 (F4: what still shows TeX, and the Glossary entry's `lang`) | a walkthrough decision: deferring it may contradict "fix everything now", so ask; F4 recommends one deferred job |

  An unrouted entry is a finding.
- **The deferred-job list.** Rewrite round 1's list:
  - remove jobs 5–9, now fixed (OQ10, OQ14, OQ15, OQ16, P30's line);
  - keep jobs 1–4 and 10;
  - add OQ21's design job: the quiz and the top bar at 320/200%, with the 37 px option column;
  - add "the console at 200% text": the past version's source URL, the signed-out "Sign in", "Full width" at 320;
  - add F4's job, if it left one.

  Keep round 1's dispositions of the existing deferred items, but D80-ch is now handled: close it.
- **The pass drafts.** Update round 1's *Drafts for the pass round*:
  - the test counts;
  - one checklist line each, in the shipped shape, for:
    - the bounded keeps and inline boxes (a hyphenated word never breaks at its hyphen while it fits; a run wider than its line breaks inside; a formula wider than its line scrolls in its own box);
    - the Glossary in the contents;
    - linear math on text-only surfaces.
- **The walkthrough**, by the stop rules:
  - about 2k characters plus links;
  - at most ~5 decisions, and only those that change a contract, contradict the operator's words or are costly to reverse; the rest in one "decided as drawn" list.
  - Start from round 1's draft. Its decision 3 is no longer a decision: the operator said "after review pass, make sure you delete the whole knowledge related claude artifacts.", so say in one line that the canvas is deleted on the pass. Its decision 4 (OQ12) is built.
  - The URLs are on the rebuilt `:3978`.
  - The member checks need a throwaway account the operator signs up for on that stack. Never put a credential in the walkthrough.
  - The real-device checks are VoiceOver, and Safari on the iPhone and iPad.

### Return

As in round 1: `review_verdict`, the findings as problem classes with fix slices on anything but pass, or on pass the `doc_impact_added`, `doc_versions: none — deferred to post-merge consolidation (parallel mode)`, the `walkthrough`, the deferred-job list, and the instruments, named. The Rules section binds unchanged: edit no source, run no state command, never commit.

## Dispatch (round 2)

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
