# P32.REVIEW — Review "Thorough research and critic in the explain pipeline"

## Re-review (round 2, after P32.F2 and P32.F3)

Round 1 returned `changes_requested` with three findings. P32.F2 fixed findings 1 and 3, in two revisions (d70,
d71, the operator's "(a)"); P32.F3 fixed finding 2. See each slice's `result.md`.

This round is **focused**: re-run only what F2 and F3 changed, plus the guards. Run b and round 1's other checks
stand.

1. **Validate again:**
   - `skills_parity.py`, `plugin_parity.py` and `claude plugin validate plugin`;
   - `python3 scripts/workflow.py validate`;
   - the skill's size: 155,790 B. Say whether it is a finding.
2. **Finding 1 (F2): check the text.** Read F2's edits by section: the card, §1, §3.2, D0b, §3.3, §3.9, §4.9,
   §8, §9.1 and B6. Look for two things:
   - does `quick` now plainly keep the agents, the files and the map;
   - does any new sentence contradict another part of the skill.
3. **Finding 1 (F2): check the running product.** Make one live Sonnet-lead `quick` run yourself, under round 1's
   isolation:
   - your harness copy, and a fresh scratch port of your own;
   - scratch `XDG_*` and `KB_*`, checked with §2's resolver;
   - `--setting-sources project` and the deny rules;
   - `watchdog2.py`, and no permission-skipping flag.

   Use a small general subject not used before. The headline must hold: `path: plugin`, the verifier on another
   model, `plan.md`, `outline.md` with `## Reader's task`, and `trace.md`.

   F2 already found two misses: the dossier line and the `searches:` total, and the background verifier
   stopped after 10 idle minutes under `claude -p`. If they recur, they are routed, not findings.

   Spend and safety:
   - **Cap $10**, kept in `rehearsal/review/spend.md`, appended below round 1.
   - Leak scan after the run. The six known hits are listed in the plan below.
   - Never use `:8766`, `:3030`, `:8777`, `:8797` or production. Stop only your own PIDs.
4. **Finding 2 (F3): check the landing.**
   - `grep` that both strings in `web/src/content/marketing/content.ts` match `wc -l web/public/SKILL.md`.
   - If Aside is reachable (`aside repl --account u1`, never `u0`), view the pane on a scratch production build.
     Use the same method as F3: a scratch copy of `web/`, `next build --webpack`, and `next start` on your own
     port. Never build in `web/`; never touch `:3030`.
   - If Aside is not reachable, look at F3's screenshot and its curl evidence, and name the instrument.
   - F3 listed other `FEATURE_SKILL` lines as candidates; judge them as observations.
5. **Finding 3 (F2): check `## Doc impact`.** It should now carry finding 3's AGENTS line, plus F2's product.md
   and architecture.md lines, the last one superseding the D9 part.
6. **On pass:**
   - **Write the qa `## Regression Checklist` gate-section version.** Round 1's three proposed lines are in
     `result.md`; update them for F2. Use `doc-new-version --doc qa --summary "..." --source P32.REVIEW`, edit
     only the returned `edit_path`, then `rebuild-docs`.
   - **Return the walkthrough.** Round 1's draft, updated, under the stop rules: about 2k characters, at most
     about 5 decisions, and one "decided as drawn" list.
     - OQ6 and OQ9 go in as one decision: rotate the token.
     - The two F2 misses and F3's tick candidates go in "decided as drawn" as deferred jobs or observations.
   - **List the deferred-job candidates** for the orchestrator to file:
     - a mechanical dossier and search-total line;
     - headless verifier batches and waves sent in the foreground;
     - anything else you find.

     D69–D71 are already filed (minted ids, CLI plumbing and skill shrink, server draft state).

Put round 2 above round 1 in `result.md`, its verdict block first. No state command, no commit, and no source
edits; the qa gate-section version is the one exception. Remove the re-review note from `phase.md`, and rewrite
`## Now`.

## Goal

Review P32 as a whole against `intent.md`, with the acceptance gate **required**: validate everything together,
check the product's headline claims yourself (never on the slices' reports alone), read the package and the
handoff cold as the bootstrap agent would, verify the `## Doc impact` list, route every operator question, and
return a `review_verdict` and, on pass, the walkthrough. Findings go in the verdict, never as silent fixes.

## Read first

- `intent.md` whole (the operator's verbatim words and the confirmed intent: that is the bar).
- `phase.md` by section (`phase-section P32 <name>`): `## Now`, `## Notes for later slices` (the three REVIEW
  entries are yours), `## Operator Questions`, `## Doc impact`, `## Decisions` (skim; long material in
  `topics/build-decisions.md`).
- Each slice's `result.md` verdict block only (S1–S10, F1), going deeper only where you check a claim.
- `plugin/skills/explain/SKILL.md` by section (`grep -n '^#'`): never read 150 KB whole.

## Scope (the boundary)

`python3 scripts/workflow.py phase-scope P32`: `fc5ff68..c6918f4`, 22 commits, 13 product files:

- the explain skill in three parity copies (`plugin/skills/explain/SKILL.md`, `.agents/skills/explain/SKILL.md`,
  `web/public/SKILL.md`), `plugin/.claude-plugin/plugin.json` (0.6.0), `plugin/README.md`;
- five new agents `plugin/agents/{web-researcher,code-researcher,gap-reviewer,verifier,explain-critic}.md`;
- `scripts/skills_parity.py`;
- workflow config from `P32.DECOMP` (`executors.toml`, `.claude/agents/slice-executor-high.md`: the research and
  high rows at xhigh), not product;
- workflow material, not product: `works/phases/active/P32/package/**`, `handoff.md`, `rehearsal/**`.

Re-run only the `## Regression Checklist` lines (`docs/current/qa.md`) these files feed (the published skill
and the plugin's parity, if any line covers them), never the whole list. Anything outside the boundary is an
observation for a deferred-job candidate, never a finding. `docs/current/` is STALE for several docs (P28, P30,
P31 owe consolidation): read what you cite against those phases' notes.

## What to do

1. **Validate everything together:**
   - `python3 scripts/skills_parity.py`, `python3 scripts/plugin_parity.py`, `claude plugin validate plugin`,
     `python3 scripts/workflow.py validate`;
   - the skill's size (`wc -c`), against OQ5's accepted ≈ 125–145 KB (F1 reported ≈ 152 KB: say whether that
     is a finding or an observation, and why);
   - no server, CLI or web code changed in the range (confirm from `phase-scope`); no test suite needs a run.
2. **Review against `intent.md`**, one line per Confirmed Intent bullet: delivered, partly, or not, with the
   skill section or file that delivers it. In particular:
   - research planned first, wide then deep, source quality, the dossier (library + ledger), verification on a
     different model, gap rounds with a cap, loud failure (no thinner chapter);
   - written only from the dossier with a trace; the critic checks facts, ledger, coverage **and the reader**;
   - "More thorough must not mean harder to use": the reader-first rules and the r1b scorecard (OQ10 accepted
     the Readability loss on length; do not re-litigate it, but check the rules say what d57/d58 say);
   - the single document runs the full team by default, `quick` opts out, `no-research` is operator-only;
   - English by default everywhere, Korean only when asked;
   - a book starts from a suggestion, creates the phase on a yes, and stops; outside a workflow workspace it
     offers a single document;
   - the agents ship in the plugin; the bootstrap drops its own critic (in the package);
   - out of scope stays out (server draft state, CLI plumbing, skill shrink, cross-vendor verifier D67).
3. **The running product** (the gate stage). The product is the plugin's skill, so open it yourself with two
   small live runs, under exactly the isolation S7/F1/S9 used (reuse `rehearsal/r2/harness/`; scratch
   `XDG_CONFIG_HOME`, `XDG_STATE_HOME`, `KB_ROOT`, `KB_API_BASE_URL` checked with §2's resolver first;
   `--setting-sources project`; the deny rules on `//Users/sugang/.config/knowledge-kb/**`; `--plugin-dir
   plugin`; a scratch stack on your own fresh port; `watchdog2.py`, never a visible `--max-budget-usd`):
   - **a. The book suggestion outside a workspace (§9.1):** `/knowledge:explain <a subject plainly too big for
     one document> book` in a scratch folder that is not a workflow workspace. Expect: it says a book needs a
     workflow workspace and offers a single document; nothing is created or published. ≈ $1–3.
   - **b. One `quick` single document** on a small general subject, Opus lead, through the critic and a
     publish to your scratch stack. Check: `run.md`'s mode block, D6's `## Reader's task` in `outline.md` (not
     in the chapter: S9's §3.9 fix), the verifier on another model, the critic's `reader` category in its
     output, the published page on your scratch stack. ≈ $5–12.
   - **Cap: $25** for both, summed from `total_cost_usd` in `rehearsal/review/spend.md`. It is a loop-safety
     stop (the operator: "I don't care about the token spending for now", d61). At the cap, stop the runs and
     finish the review on what ran; say so in the verdict, do not return `needs_operator` for it.
   - After each run, the leak scan:
     `python3 -I /private/tmp/claude-502/-Users-sugang-projects-personal-knowledge/c2016e8a-14bf-4ba0-89b3-a899f1c9c55e/scratchpad/leakcheck/scan.py <your run dirs> ~/.claude/projects`.
     Six files are known hits (changple5 `4bca8b0c…`; `1eb18f1b…/subagents/agent-a5c22e0e39716ea81.jsonl`;
     bootstrap `1f05045c…`; glide-ilab `ac92989b…` and `e1d150e2…`; glide `0118b617…`). Any other hit: redact
     it if yours, stop, and return `needs_operator`.
   - Never `:8766`, `:3030`, `:8777`, `:8797` or production (knowledge.hi2vi.com); stop only your own PIDs;
     never `--allow-dangerously-skip-permissions` or any permission-skipping flag (d69).
   - Keep `rehearsal/review/` (spend, the two runs' `run.md`, outline, chapter, critique; no `pages/`).
4. **Read the package and the handoff cold**, as the bootstrap agent would: `handoff.md`, then
   `package/README.md`, then `PATCHES.md`, then the three files under `package/claude/`. Check:
   - contradictions between them, or with P31's `handoff-explain.md`;
   - anchors: spot-check at least 6 "Find" texts at the bootstrap's current `main` with read-only `git show`
     (`git -C /Users/sugang/projects/personal/bootstrap_agentic_workspace.sh show HEAD:<file>` piped to
     `grep -c -F`); its `git status --short` must read the same before and after. Never write there or run
     its installer, build or engine;
   - text that restates the skill instead of citing it by section;
   - the handoff's numbers against `rehearsal/r2/spend.md` and README (S10's result notes one correction).
5. **`## Doc impact`:** check the list is complete for every slice that changed durable truth (S4–S9, F1).
   Return `doc_versions: none — deferred to a docs phase` except the two gate sections:
   - `## Regression Checklist` (qa): on pass, add this phase's headline checks as a new version
     (`doc-new-version --doc qa --summary "..." --source P32.REVIEW`, edit only the returned `edit_path`, then
     `rebuild-docs`), for example: the three skill copies and the five agents stay in parity
     (`skills_parity.py`, `plugin_parity.py`); a `quick` run keeps `## Reader's task` in `outline.md`; the
     book suggestion outside a workspace offers a single document. Keep them few and checkable.
   - `## Operator Runtime` (operations): only if the runtime changed. It did not, so no version.
6. **Route every `## Operator Questions` entry.** Open: OQ6 and OQ9 (the KB API token found in transcripts;
   rotate it?) go into the walkthrough as one decision. Every other entry is resolved (a collapsed line counts
   as routed).
7. **The walkthrough** (the stop rules: about 2k characters plus links; at most about 5 decisions; the rest in
   one "decided as drawn" list; one word, "accept", signs it). The candidates (from the REVIEW notes):
   - the operator releases knowledge plugin 0.6.0 (push, and deploy for `web/public/SKILL.md`), their word;
   - the operator runs the new skill once interactively on a small private subject (the permission behaviour
     executors cannot test);
   - the operator reads C's pair: `rehearsal/r1/chapters/c-old.md` against `rehearsal/r1b/chapters/c-new-v2.md`
     (OQ10's readability check);
   - after the release, relay `works/phases/active/P32/handoff.md` to the bootstrap;
   - OQ6/OQ9: rotate the token (recommend, with why);
   - optional, only if it matters: `create-phase`'s route gives the book cost in words, no dollars (S10's note).
8. **Deferred-job candidates** for the orchestrator to file (never file them yourself): at least the plugin's §1
   placement for minted ids, and anything outside the boundary you noticed.

## Return

- `result.md`, the verdict block first: `status`, `tier`, `model`, `effort` (from `## Dispatch`),
  `review_verdict` (`pass | changes_requested | blocked`), `summary`, `files_changed`, `validation`,
  `deviations`, `doc_versions`, the fixed line `explain: not written — run /explain for this phase`, and on pass
  `walkthrough`. On `changes_requested`: numbered findings, each with a proposed fix slice (name, kind `fix`,
  risk; `high` for a defect in work whose `result.md` reads `tier: mid`). Complete validation and judgment
  before returning, so every finding comes in one cycle.
- `phase.md`, one section at a time: remove the three REVIEW notes; `## Now`.
- No state command (no `review-phase`, `accept-gate`, `finish-slice`, `set-*`), no commit, no push, no source
  edits (the qa gate-section version is the one exception).

## Dispatch

slice=P32.REVIEW
phase=P32
kind=review
risk=high
attempt=1
route=high
reason=kind review
tier=high
subagent_type=slice-executor-high
model=opus
pass_model=yes
effort=xhigh
pass_effort=yes
attribution=Claude Opus 5.5
explore_model=haiku
explore_effort=high
