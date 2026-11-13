# P32.S7 result: rehearsal 1, old vs new

## Verdict

- **status:** needs_operator
- **tier:** high
- **model:** opus
- **effort:** xhigh
- **summary:** Rehearsal 1 ran both arms on subject C and judged it blind twice with positions swapped. S1's rule fails on C: old wins Helpfulness and Readability in both orders; new wins Comprehensiveness and Insight and is the only chapter to find real write-path defects. On subject G, the new arm reached its D7 draft before the $80 cap stopped it ($78.71 spent). Five skill fixes (d53) are in all three copies plus the agents, and the guards pass. Finishing G and the confirming run needs about $7 more (OQ7).
- **files_changed:**
  - `plugin/skills/explain/SKILL.md`, `.agents/skills/explain/SKILL.md`, `web/public/SKILL.md`
  - `plugin/agents/{code-researcher,explain-critic,gap-reviewer,verifier,web-researcher}.md` (regenerated; gap-reviewer frontmatter edited)
  - `works/phases/active/P32/rehearsal/r1/**`: subjects.md, rubric.md, brief-G.txt, brief-C.txt, spend.md, scorecard.md, `chapters/` (c-old, c-new, g-old, g-new-draft), `judges/` (C-o1, C-o2 records, key-C.json, judge-rubric.md), `dossiers/c-new/`, `dossiers/g-new/` (both without `pages/`), `harness/`
  - `works/phases/active/P32/phase.md`: Decisions, Doc impact, Operator Questions, Notes for later slices, Now
  - `works/phases/active/P32/topics/build-decisions.md`: d26 updated in place; d53–d55 added
- **validation:**
  - `python3 scripts/skills_parity.py`: PASS
  - `python3 scripts/plugin_parity.py`: PASS
  - `claude plugin validate plugin`: passed
  - `python3 scripts/workflow.py validate`: passed (only the existing warnings)
  - `git diff --stat`: in scope. The skill copies and 5 agents are mine; the `works/*` lines are the orchestrator's pre-existing state changes plus my phase.md sections.
  - Leak scan over `rehearsal/`, the scratch harness and `~/.claude/projects`: only the 3 known older hits.
  - My stacks (PIDs 16031, 16032, 30532) and the watchdogs are stopped. Ports 8821–8823 are free. The operator's 8777, 8797 and 8766 were never touched.
  - Nothing was published outside my scratch APIs.
- **deviations:**
  1. **new-g ran in three sessions.**
     - Session 1 stopped on a real skill defect (`STOPPED: permissions`, fixed as fix 1).
     - Sessions 2–3 resumed on a scratch copy of the plugin with fix 1 only.
     - Session 2's lead read the harness's `--max-budget-usd` and stopped itself. Session 3 ran with no visible budget, under a streamed-usage watchdog.
  2. **Stopped at the cap before finishing.** I stopped session 3 at its D8 critic dispatch to stay under $80. So:
     - G has not been critiqued, published or judged;
     - the confirming run did not happen;
     - R7's `knowledge check` ran on three chapters, not four.
  3. **The old arm ran under the new skill's printed rules and isolation.** Its `/tmp` edits were denied, and it worked around them.
  4. **Two judge errors on C were corrected by my spot-checks at 9978d84:**
     - C-o1's "wrong" quiz key is in fact right;
     - C-o2's two "unconfirmed" entities both exist.
  5. **Fix 3 changed d26's gap-reviewer configuration:** 30 turns, plus Bash.
  6. **`harness/` was kept in `rehearsal/r1/`.** The plan did not list it; I kept it for reproducibility and S9.
- **doc_impact:**
  - `operations.md`: explain agents on hosts without Grep/Glob (plain `grep -n` forms, no `$` or comma braces, `git` without `-C`); `failed: permissions` stops a run only for a call in its brief's form; no `--max-budget-usd` near the cost under `claude -p` (P32.S7)
  - `architecture.md` (*Plugin packaging*): the `gap-reviewer` runs with `maxTurns: 30` and Bash; `quick` dispatches its verifier on a model other than the lead's (P32.S7)
- **operator_need:** answer OQ7.
  - **Approve about $7 more** for S7:
    - resume G from D8, ≈ $3–4;
    - G's two blind judges, ≈ $1.2;
    - the cheap confirming run, ≈ $2–3.
  - **Or close rehearsal 1 on subject C alone.**

  In both cases, read subject C's two chapters at the walkthrough.

## What ran

Isolation held on every `claude -p` run (§2's resolver checked first, `--setting-sources project`, config
deny rules, leak scan after each run). Costs are in `rehearsal/r1/spend.md` (15 runs, $78.71).

| Run | What it showed |
|---|---|
| pf-norules (Opus) | Preflight without rules → `FAILED: permissions` with the printed rules; only the converter written |
| pf-auto (Opus) | Preflight in auto mode → passes, zero denials |
| fail-pub (Sonnet) | `FAILED: publish` on a 401: draft kept, resume line given, nothing published |
| old-g, old-c (Opus, 0.5.0) | Both published in ≈ 6 min for $1.5–2.3, single agent; old-c's attempt to read the real config was denied |
| new-c (Opus, 0.6.0 `full`) | D0–D9 in one session, $27.83, 55 min: 26 dispatches, 2 gap rounds, 140 claims verified, gate 5/5 and 16/16, published |
| new-g (Opus, 0.6.0 `full`) | Three sessions, $43.65, ≈ 100 min to D8: 3 rounds (stop: complete), gate 6/6 and 21/21, D7 draft 9,052 words |
| judge C-o1, C-o2 (Sonnet, blind) | Consistent across orders; see `rehearsal/r1/scorecard.md` |
| probes p0–p3 (Haiku) | Which Bash forms need approval: `$`, comma braces, `git -C`, `sed -i`, a lead's `python3 -I -c`, `git cat-file` |

R7 `knowledge check` against a fresh scratch API (8823): c-old, c-new and g-old exit 0. g-new not yet.

## Scorecard summary (full table: `rehearsal/r1/scorecard.md`)

**C.**

| | old | new |
|---|---|---|
| R1 | 8/8 | 8/8 |
| R2 | 3/4 | 4/4 |
| R3 | 18/18 supported | 28 supported + 1 partial of 29, with ≈ 3× the effective citations |
| R4–R7 | pass | pass |
| R8 | failed once (o1) | pass both orders |
| R9 | minor | minor |

Pairwise (both orders agree): Helpfulness old, Comprehensiveness new, Insight new, Readability old.

S1's rule fails on C:

- rule 3: Helpfulness went to old in both orders;
- rule 2: R3 is short by one partial.

**G.** Unjudged; the new chapter is a D7 draft.

## Fixes (d53; all three copies, `--write-agents`, both guards)

1. **fix1.py** (11 edits; run-tested in new-g's sessions 2–3: 5 subagent denials in 527 Bash calls, none fatal):
   - B6 shell forms: Grep/Glob only where the host has them; otherwise `grep -n -F/-x/-e`; no `$` and no comma braces; `git` in the working folder, never `-C`.
   - B4 entry lookup, B1 known-already lookup, B2's `commit: <sha> (HEAD)` and its boundaries.
   - §3.2, §3.5 and B6: a `failed: permissions` on a call outside the brief's forms is the role's error and is re-dispatched once.
   - §3.9: the `quick` verifier runs on a model other than the lead's.
2. **fix2.py:** the resume lookup is `find <KB_EXPLAIN_STATE> -maxdepth 2 -name run.md` when there is no Glob.
3. **fix3.py:** the gap reviewer gets `maxTurns: 30` and Bash, and writes `gaps/r<n>.md` by its 20th call. It hit 15 turns before writing in both subjects.

Size is now 149,280 B (≈ 4.3 KB above OQ5's band).

Not run-confirmed: fix 1's §3.9 part, fix 2 and fix 3.

## Findings for later

- **F-slice candidate (in `## Now`):** the new chapter is research-dense and loses on helpfulness and readability for a reader whose purpose is to change code. Shape D6–D7 around the reader's stated task. Wait for G's result and the operator's read before cutting it.
- **Small drift:** new-c's `run.md` mode block was left stale (`critic: tbd`, `searches: 1`).
- **Effort** is not observable in the stream.
- **Turn limits:** criticism researchers made 47–48 tool calls against their cap of 30; the critic used 48 of its 60 turns.

## To finish (on OQ7's yes)

The scratch root is `S7=/private/tmp/claude-502/-Users-sugang-projects-personal-knowledge/c2016e8a-14bf-4ba0-89b3-a899f1c9c55e/scratchpad/s7`. The same scripts are in `rehearsal/r1/harness/`.

1. **Restart the two stacks** from the repo, with `env -u DATABASE_URL -u GEMINI_API_KEY -u GOOGLE_API_KEY -u KB_GIT_PUSH`:
   - `KB_ROOT=$S7/stack-old/kb KB_API_TOKEN=s7-token KB_STARTUP_REINDEX=0 HOME=$S7/stack-old/home .venv/bin/python -m uvicorn server.main:app --host 127.0.0.1 --port 8821`
   - `stack-new` the same way on 8822.
2. **Resume G:**
   - Copy `runs-new-g-resume2.json` to a new name, with `plugin` set to the repo's `plugin/` (all fixes) and the same `state`, `config`, `cwd` and prompt `/knowledge:explain resume 20261023-0350-free-threaded-cpython`.
   - Run `harness.py make` on it, then its `cmd.sh` in the background, with `watchdog2.py <name> <usd>`. Pass no `budget`.
3. **Judge G:**
   - `mkjudge.py G http://127.0.0.1:8821 python/2026-10-23-free-threaded-cpython-python-without-the-gil.md http://127.0.0.1:8822 <new-g rel_path>`
   - `mkjudgespec.py G o1` and `G o2`, then `harness.py make` and run each.
   - Spot-check the judges' code and quiz claims.
4. **Run R7** with `r7check.py` on g-new, against a fresh third stack.
5. **Confirming run:**
   - `runs-confirm.json`: a Sonnet lead, `quick`, the CLI hidden by its `PATH`/`ZDOTDIR`, against 8822.
   - It checks the §3.9 verifier on `model: opus`, the curl `--payload` publish and fix 2's lookup.
6. **Finish up:**
   - Copy the G judges into `judges/`, the published G chapter into `chapters/g-new.md`, and the refreshed `dossiers/g-new/`.
   - Update the scorecard.
   - Stop the stacks and leak-scan.

If the scratch dossier's `pages/` is gone, G must be rerun from the start (≈ $40).

## After the verdict (orchestrator, 2026-10-23)

OQ7 answered: "make it new one also helpful and reading easy" (Decisions d56). S7 closes on subject C; "To finish" is not run. G is rewritten from its dossier, judged, and S7's unconfirmed fixes are run-confirmed in P32.F1, after the writing stage is reshaped around the reader's task.
