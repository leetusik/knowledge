# P31.REVIEW — Review "Explain phase route"

## Re-review (round 2, after P31.F1)

Round 1 returned `changes_requested` with three findings; **P31.F1** fixed them (`slices/P31.F1/result.md`).
This round is **focused**:
1. Validate everything together again (the same commands as below).
2. Check each finding is fixed:
   - `explain-review.md` step 5: the org-key control plus the anonymous `/app/orgs/...` book probe, matching
     the code in `server/books_api.py`. F1's live table is plausible. Re-run the probe on a fresh scratch
     Postgres DB if cheap (create it and drop it; never `:8766` or `:3030`; never production).
   - PATCHES §3 L37 at `f207775`.
   - The `backend.md` Doc impact line.
   - OQ15 is appended, and OQ10 is untouched.
3. Skim F1's other additions for new problems: the `/app/documents/<id>` fallback, the legacy-url
   `needs_operator`, the org-key warning, the `mode` clause.
4. **On pass:**
   - write the qa gate line as a new version (round 1's draft is in `result.md`);
   - return the walkthrough (round 1's draft, updated);
   - route OQ1, OQ10 and OQ15 into it, with the rest decided as drawn.

Put round 2 above round 1 in `result.md`, with its verdict block first. No state commands, no commit.


## Scope (the boundary)

`python3 scripts/workflow.py phase-scope P31` reports `aedea7a..ad9d6ed`: 8 commits and 16 product files.
- **Server:** `server/main.py`, plus its plugin template mirror, and `tests/test_document_check.py`, plus its
  mirror.
- **CLI:** `cli/src/knowledge_cli/*`, `cli/pyproject.toml`, `cli/uv.lock`, `cli/tests/test_knowledge.py`.
- **The explain skill:** three parity copies (`plugin/skills/explain/SKILL.md`,
  `.agents/skills/explain/SKILL.md`, `web/public/SKILL.md`), plus `plugin/.claude-plugin/plugin.json`.
- **Workflow material (not product):** `works/phases/active/P31/package/**` and `handoff-explain.md`.

Re-run only the `## Regression Checklist` lines these files feed (the API publish path and the CLI), never the
whole list. Anything outside the boundary is an observation, not a finding.

## What to do

1. **Validate everything together:**
   - `KB_TEST_DATABASE_URL=postgresql://kb:kb@127.0.0.1:55432/kb uv run pytest -q`
   - `cd cli && uv run pytest -q`
   - `python3 scripts/plugin_parity.py`, `python3 scripts/skills_parity.py`, `python3 scripts/workflow.py
     validate`
   - The web is unchanged apart from `web/public/SKILL.md`. Run `pnpm --dir web build` only if cheap; it is not
     required.
2. **Review against `intent.md`.** The operator's verbatim words: an explain phase with an outline they sign;
   a critic on every chapter, inside the chapter's slice; private by default; prepared here and relayed.
   - Does the package faithfully deliver that?
   - Is the bootstrap untouched (`git -C /Users/sugang/projects/personal/bootstrap_agentic_workspace.sh status
     --short` empty, HEAD `f207775`)?
3. **The running product** (the gate stage; a fresh scratch stack; never `:8766` or `:3030`; stop only your
   own PIDs; never touch production):
   - `knowledge check` on a valid native chapter: exit 0.
   - On an `err-*` fixture: exit 1, with the list.
   - On a duplicate: the 409.
   - Confirm in the scratch DB and on disk that a check writes nothing.
   - Confirm a real `knowledge save` of the same file still publishes, so the publish path is unchanged.
   - Spot-check the skill's §4.9 text against the CLI's real output and exit codes.
4. **Read the package cold**, as the bootstrap agent would:
   - `package/README.md`, then `PATCHES.md`, then each file;
   - then `handoff-explain.md`.

   Check for:
   - contradictions with P30's handoff;
   - any path or line number that doesn't exist at bootstrap `f207775` (spot-check at least 6);
   - text that restates the plugin skill instead of pointing at it;
   - size caps the PATCHES notes call out (the do-next-slice `SKILL.md` lands about 18 B under 8,192).

   Findings go in the verdict, never as silent fixes.
5. **`## Doc impact`:** check that the list is complete for S1 and S2. Write `doc_versions: none — deferred
   to a docs phase`, except for the two gate sections:
   - add `## Regression Checklist` lines (qa, a new version): "`knowledge check` on a valid chapter exits 0
     and writes nothing; on an invalid one it exits 1 with the line list";
   - update `## Operator Runtime` (operations) only if the runtime changed. It didn't, so no version.
6. **Route every `## Operator Questions` entry:**
   - OQ1 (deploy) and OQ10 (the agent profile signed into the reader) go into the walkthrough;
   - the decided ones go in a "decided as drawn" list.
7. **The walkthrough** (the stop rules: about 2k characters, at most about 5 decisions):
   - **First:** the operator pushes and deploys, so `/api/documents/check` exists on knowledge.hi2vi.com.
   - **Then they run:**
     - `knowledge --version`, expecting 0.2.0 after `uv tool install --reinstall` or upgrading from `cli/`;
     - `knowledge check <a real chapter file>`, expecting exit 0;
     - `knowledge check` on a file with an error, expecting exit 1.
   - **They read:** `package/README.md` and `handoff-explain.md`.
   - **Then:** relay `works/phases/active/P31/handoff-explain.md` to the bootstrap agent.

   Include the decisions worth their eyes.

## Return

`review_verdict`, plus the walkthrough on pass and the deferred-job candidates.
- Write `result.md` with the verdict block first.
- No state commands, no commit, no source edits (the gate-section doc version is the one exception).
- The fixed pointer line stays as the contract demands.

## Dispatch

slice=P31.REVIEW
phase=P31
kind=review
risk=high
attempt=1
route=high
reason=kind review
tier=high
subagent_type=slice-executor-high
model=opus
pass_model=yes
effort=high
pass_effort=yes
attribution=Claude Opus 5.5
explore_model=haiku
explore_effort=high
