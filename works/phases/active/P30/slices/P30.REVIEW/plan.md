# P30.REVIEW — Phase review, with the acceptance gate required

## What is reviewed

P30, "Learning reader — apply": the apply half of P29. Review against:
- `works/phases/active/P30/intent.md` (the confirmed intent);
- P29's contracts (`phase-section P29 Decisions`);
- the signed design rounds under `docs/reference/design/jobs/`.

**Boundary:** `python3 scripts/workflow.py phase-scope P30`, which lists the 634 product files P30 changed
(range `26ae440..HEAD`). Anything outside it is an observation for a deferred job, never a finding.

## Read first (just in time)

- `intent.md`, then `phase.md` section by section (`phase-section P30`).
- Each slice's `result.md` verdict block (S1–S28, F1–F4).
- `topics/notes-later.md` → *The QA sweep's defects* and each slice's REVIEW notes.
- `topics/operator-questions-decided.md` and `topics/doc-impact-detail.md`.
- `docs/current/operations.md` → `## Operator Runtime`, and `docs/current/qa.md` → `## Regression
  Checklist`.
- The `review-phase` skill (`.claude/skills/review-phase/SKILL.md`) for the gate stages and the verdict
  block.

## Do

1. **Validate everything together:**
   - `KB_TEST_DATABASE_URL=postgresql://kb:kb@127.0.0.1:55432/kb uv run pytest -q`;
   - `cd cli && uv run pytest -q`;
   - `pnpm --dir web typecheck`, `lint`, `test` and `build`;
   - `python3 scripts/plugin_parity.py` and `python3 scripts/skills_parity.py`;
   - `uv run alembic upgrade head` on a scratch database;
   - `python3 scripts/workflow.py validate`.
2. **Review against the intent:** the server backing, the web surfaces at phone, iPad and desktop, exactly
   one scroller (native renders without an iframe; legacy is full-screen; the handshake is retired),
   `/explain` and the CLI, the migration (built, proved locally, not run on production), the sweep, and the
   handoff. RESPECT THE DESIGN: spot-check each surface against its signed round.
3. **Gate stages (the gate is required):**
   - **Open the running product yourself** in the manifest runtime. Use a fresh scratch stack (API on a
     spare port with a scratch `KB_ROOT` and a scratch database, the fixture book, the production build
     with `next start`, and a dev clone). **Never use or stop `:8766` or `:3030`**; stop only your own
     PIDs. Spot-check the headline claims, walking as a first-time user:
     - library → book → chapter;
     - resume after a reload;
     - a highlight and a note;
     - a quiz;
     - review;
     - a legacy explainer as the only scroller;
     - the sign-in return;
     - print.

     Never pass on other slices' reports alone.
   - **Re-run the `## Regression Checklist` lines inside the boundary** (the reader and document pages,
     inner-scroller lines, auth return, the CSP). Append P30's headline checks, the S27 lines from
     `topics/doc-impact-detail.md` → *P30.S27*, to `docs/current/qa.md`'s `## Regression Checklist`
     through `doc-new-version` (the review's own gate section). Write `## Operator Runtime` only if the
     runtime changed (instrument notes such as CDP versus Aside, and the login limiter).
   - **Route every `## Operator Questions` entry.** OQ1–OQ184 are decided under the operator's
     unattended-run word ("do as your recommendations for all…"). Fold them into the walkthrough as one
     "decided as drawn / decided by recommendation" list naming the few worth the operator's eye, at most
     about five: the ones that change a contract, or are costly to reverse. Candidates:
     - OQ21 (merge on migration);
     - OQ27 (purge fails closed);
     - OQ46 (the chart key, fixed in F2);
     - OQ183 (redirect bound chapters);
     - OQ184 (the legacy bar scrolls on a tight page);
     - S28's ownership move.
4. **Deferred-job bookkeeping** (list these for the orchestrator to run; never run them yourself):
   - close D37 (S25 shipped `no-transform`) and D18 and D32 (S11 shipped);
   - drop D38–D40 (S25 retired the measured box, frame print slicing and the reporter);
   - candidates S10/S15/S18/S23 raised for REVIEW:
     - no single-card delete route (P29 *Privacy*);
     - Mark as unread resets only one language variant;
     - the timeline lane `bars` requirement (OQ90);
     - not-found answering HTTP 200;
     - the stored-`unit` lag after a hand-edited manifest;
     - the search text of charts after F2.

     File each as a deferred job, or fold it into the walkthrough. Note that D49, D50 and D51 already exist.
   - Note that all nine P29 design canvases are now deletable, since their surfaces shipped. Raise this in
     the walkthrough for the operator's yes. Never delete them.
5. **Doc impact:** verify that `## Doc impact` covers every slice that changed durable truth (S2–S28,
   F1–F4). Return `doc_versions` naming only the two gate sections you wrote. Everything else is deferred
   to a docs phase.
6. **The walkthrough** (the stop rules: about 2k characters plus links, at most about 5 decisions, the rest
   "decided as drawn"). It must include:
   - **Before the walkthrough, operator actions in order**, all on the operator's word:
     1. push `main` after integrating the `kb-api` commits from `origin/main`;
     2. wait for a green Production Deploy (the nginx `knowledge.conf` changes from S4 and S25 take effect
        then);
     3. the orchestrator runs S6's production migration per `topics/migration-runbook.md`;
     4. then walk.
   - **What to walk** on iPhone, iPad and Mac (Safari and Chrome): library → book → chapter, reading
     settings, resume, highlights and notes, a quiz, review, a legacy explainer as the only scroller, print,
     and the operator-run device checks from S27.
   - **The handoff note** `works/phases/active/P30/handoff-explain.md`, to give to the bootstrap agent.
   - The words that clear the gate: "accept" (→ `accept-gate P30 --clear`), or the failures to fix.

## Verdict

Return `review_verdict` (`pass` | `changes_requested` | `blocked`) with:
- numbered findings and proposed fix slices if it isn't `pass`, after completing all validation first;
- `walkthrough` on `pass`;
- `explain: not written — run /explain for this phase`.

Never run `accept-gate`, `review-phase` or any state command.

## Re-review (round 3, after P30.F6)

Round 2 returned `changes_requested` on R3. **P30.F6** fixed it (`slices/P30.F6/result.md`), and D64 is filed
for the same Next bug on other pages. This round is **narrower** than round 2:
1. All gates together: the server suite, CLI, the web gates, both parity checks and `validate`.
2. **F6 live**, in a fresh scratch stack (production build; never `:8766` or `:3030`; stop only your own
   PIDs; as few sign-ins as possible). Signed in and out:
   - Next, Previous, the end section's Next and Contents land at the top or the resume;
   - the new chapter's DB row is never `finished`;
   - a hash, `?note=`, the sign-in return and a reload keep their landing;
   - F5's chrome is still as round 2 found it.
3. **Write the qa gate line** "Next opens the next chapter at its top, not Finished" (and F5's chrome rules,
   if round 1's section lacks them) as a new qa version of `## Regression Checklist` (`doc-new-version`,
   never patch the old one).
4. **The walkthrough:** finalise round 2's draft (in `result.md`) for the gate. Keep it short, at most about
   5 decisions, and include F6. Name the open decisions: the chrome as built (OQ186, OQ188), S28 handoff,
   OQ184, OQ21/OQ27, the nine P29 canvases. Add the production note on wrongly Finished chapters.

Return `review_verdict` and, on `pass`, the walkthrough. Put round 3 above round 2 in `result.md`, verdict
block first. No state commands, no commit.

## Re-review (round 2, after the operator's walkthrough)

The first pass returned `pass` (see `result.md` round 1). At the walkthrough the operator reported the reader
chrome (`review-phase … changes_requested`, quoted in `slices/P30.F5/plan.md`), and **P30.F5** fixed it.
This round is **focused**. Don't redo the whole first pass.

1. **Validate everything together again:** the server suite, the CLI tests, the web gates, both parity
   checks and `workflow.py validate`.
2. **F5 against the operator's words:**
   - read `slices/P30.F5/plan.md` (the verbatim words and the rules) and `result.md`;
   - in a fresh scratch stack (production build; never `:8766` or `:3030`; stop only your own PIDs; one
     sign-in), check the rules on a native and a legacy chapter at 1440, 820 and 390;
   - confirm nothing else in the reader regressed: Display, sheets, resume pill, keyboard reach, chapter
     end, print, and the legacy bridge messages, including the spoofing refusals.
3. **Review the post-gate commits:** the production deploy record, the migration run and its reports, the
   redaction republish, D60–D62, and F5. Check that `## Doc impact` has F5, and that OQ185–OQ190 are routed
   (decided; fold the two F5 flagged into the walkthrough).
4. **The walkthrough:** return a short one covering only what changed since the operator's first walk:
   - the chrome rules, to re-walk on PC, iPhone and iPad;
   - the items from the first walkthrough the operator hasn't confirmed;
   - the decisions still open from round 1 (S28 handoff, OQ184, OQ21, OQ27, the canvases).

   Note that F5 must be deployed before the operator re-walks; the orchestrator does that.

Return `review_verdict`, with the walkthrough on `pass`. Write the round-2 result above the round-1 text in
`result.md`, verdict block first, and keep round 1 below it. No state commands, no commit.

## Dispatch

slice=P30.REVIEW
phase=P30
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
