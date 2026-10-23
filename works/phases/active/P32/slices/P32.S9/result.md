# P32.S9 result: rehearsal 2, a small book through the package

- **status:** needs_operator
- **tier:** high
- **model:** opus
- **effort:** xhigh
- **summary:** Ran SQLite's WAL as a two-chapter book through the package's texts in a scratch explain phase (`P90`). Whole-book research, `summary.md` and the outline cost $51.07. The outline gate was signed, and chapter 1 ran with its executor as a subagent and its research at depth 2: top-up, `outline-ch1.md`, draft, trace, `knowledge check` exit 0, and `knowledge:explain-critic` (`revise`). The run passed the $100 cap at about $101.4, before the revision and the commit, so this returns `needs_operator` (OQ11). The package and the skill are fixed where the run showed problems: subagent and by-path leads, the slice line's label, the critic's tools folder, B11's time-out, `quick`'s map, and README's measured cost.
- **files_changed:**
  - `plugin/skills/explain/SKILL.md`, `.agents/skills/explain/SKILL.md`, `web/public/SKILL.md` (§3.2, §3.5, §3.9, §9.2, B5, B11)
  - `plugin/agents/explain-critic.md`, `plugin/agents/verifier.md`, `plugin/agents/web-researcher.md` (regenerated from Part B with `skills_parity.py --write-agents`)
  - `works/phases/active/P32/package/README.md`, `package/PATCHES.md`
  - `package/claude/skills/do-whole-phase/reference/explain-decomposition.md`, `package/claude/skills/do-whole-phase/reference/explain-chapter.md`
  - `works/phases/active/P32/rehearsal/r2/` (new: `spend.md`, `intent.md`, `book/`, `gate.md`, `slices/`, `phase-P90.md`, `engine-log.md`, `decomp-attempt1-result.md`, `harness/`)
  - `works/phases/active/P32/topics/build-decisions.md` (d64–d68)
  - `works/phases/active/P32/phase.md` (Decisions, Notes for later slices, Doc impact, Operator Questions, Now)
  - this file
- **validation:**
  - bootstrap `git status --short`: empty before and after, the same as the baseline. HEAD moved from `1f4aa7d` to `97e1c38` (v74) by another session. Only read-only `git show`, `git rev-parse` and `git diff` were used. PASS
  - anchor counts at `1f4aa7d` and `97e1c38` (S8's method 1): every "Find" is 1, and `must-cover` is 0 as expected. Of the patched files, only `installer/main.py` (`WORKSPACE_VERSION`) and `tests/retrofit_smoke.sh` (Test 10h) changed. PASS
  - PATCHES 7c's smoke pins on the two references: `slice: <P>.DECOMP`, `installed_plugins.json`, `pages/.gitignore`, `knowledge:explain-critic`, `kind: chapter` and `trace-<key>.md` are all present. `run_in_background: false` is absent. PASS
  - `python3 scripts/skills_parity.py`: PASS. `python3 scripts/plugin_parity.py`: PASS. `claude plugin validate plugin`: PASS
  - `python3 scripts/workflow.py validate`: passed (warnings only: other phases' consolidation debt, stale docs, oversized doc sections)
  - leak scans after every run and at the end, over the scratch, the phase folder, `plugin/` and `~/.claude/projects`: only the six known hits. PASS
  - scratch PIDs: the stack (3963, :8841), every `claude -p` run and every watchdog are gone. Only the operator's :8766 remains, not mine. PASS
  - nothing published: the scratch server's log has one write call, `POST /api/documents/check` (a dry run), and its KB holds only its sqlite file. PASS
  - `git diff --stat`: only `plugin/`, `.agents/skills/explain/`, `web/public/SKILL.md` and the phase folder are mine. `works/{backlog.md,events.jsonl,index.json,state.json}`, `P32.S9/slice.json` and `plan.md` are the orchestrator's. PASS
- **deviations:**
  1. **Stopped at the cap (plan decision 4).** The chapter's span 3 (the one revision), its freeze check on the commit, and the commit did not run. The freeze was checked on the working tree instead (check 3).
  2. **The cap was passed by ≈ $1.4.** The transcript watchdog's $1.5 margin did not cover the first request of the executor's resume ($3.44, a cache write of its whole context), which landed between two reads.
  3. **Fixes outside §9.** The problems the run showed live in §3.2, §3.5, B5 and B11, and §9.2 cites them. §3.9 was plan decision 5. Because B5 and B11 are Part B, three agents were regenerated.
  4. **`dispatch-summary` was not run** (the bootstrap is read-only). Attribution was read from the persisted transcripts with the meter's `METER_SLICE_LINE_RE`.
  5. **The `quick` confirm run was not run**, as the plan expected.
- **doc_impact:** three lines appended to `phase.md`:
  - operations.md: the by-path or subagent lead's printed rules, and its foreground probe A and waves;
  - product.md: `quick` keeps D6–D7;
  - architecture.md: the critic's tools folder and B11's time-out.
- **operator_need:** OQ11. Choose (a) or (b):
  - (a) accept rehearsal 2 as it ran, and leave the chapter's revision and the commit-time freeze to the first real book. S9 recommends this;
  - (b) approve about $10 more, so a re-dispatch of S9 runs span 3 from the scratch state, then the freeze check and the commit.

## The book's shape (`rehearsal/r2/`)

- **Subject:** SQLite's write-ahead log, for a backend developer who runs SQLite behind a small web service, in two chapters. The `DECOMP` cut both chapters (`P90.S1`, `P90.S2`), and S1 ran.
- **Whole-book research (§9.2):** `book/research/` holds `brief.md`, `plan.md`, `run.md`, `library.md` (63 sources), `ledger.md` (286 claims), `summary.md`, 10 researchers' `findings/` (r1 ×8, r2 ×2), `gaps/` (r1, r2, final) and 22 verifier batches in `verify/`.
  - Tier 3, 37 questions, one gap round, stopped complete at r2.
  - 84 minutes, 240 turns, 36 dispatches, 83 web searches.
  - `pages/` was git-ignored. Commit `87419ef` tracked only `pages/.gitignore` under it.
- **The outline:** `book/outline.md` (31.7 KB, 2 chapters), with each chapter's reader tasks and expected top-up.
- **The gate:** `gate.md` holds the orchestrator's 3.7k-character report, and the signature "accept" by P32.S9 acting as the operator.
- **Chapter 1, `how-wal-works`:**
  - **Top-up:** `run-ch1.md`, one gap check (`gaps/ch1-r0.md`), 3 researchers (4 of 5 dispatches allowed), 3 verifier batches, and the overlays `library-ch1.md` and `ledger-ch1.md`. The chapter gate passed: must-cover 3/3, load-bearing questions 13/15.
  - **Map:** `outline-ch1.md` with `## Reader's task` and budgets.
  - **Draft:** `book/how-wal-works.md` (44.6 KB) and `trace-how-wal-works.md` (119 claim ids, all found).
  - **Check:** `knowledge --base-url http://127.0.0.1:8841 check` exited 0, with 5 `ref-unresolved` warnings (forward links to chapter 2).
  - **Executor deviation:** the checkpoint sequence diagram follows `walCheckpoint`'s code order at 3.54.1, not the outline's sketch.
- **The critique:** `book/critique/how-wal-works.md`.
  - Verdict `revise`, confidence high. Sonnet critic, Opus writer, `kind: chapter`.
  - Findings: 2 must-fix, 5 should-fix, 6 notes.
    - C01, facts: the -shm frame threshold. The cited page says 4,079 frames, but its own table and the code give 4,062.
    - C02, citations: a sentence is cited to the wrong SQLite page.
  - 12 sources re-fetched, 58 ledger claims traced, coverage 15/15.

## The checks

1. **Nested prompts open with `slice: <id>`.**
   - DECOMP: 36 of 36 dispatches.
   - Chapter: 11 of 11 (the executor, the critic and 9 depth-2 agents).
   - Every span's first prompt in the transcripts matches the meter's pattern for `P90.S1`, depth-2 spans and the critic included. Since d66, the depth-2 prompts carry the label.
2. **`pages/` holds only its `.gitignore` in git.** Yes, at the `DECOMP` commit and in the chapter's working tree. The chapter's pages and the critic's scratch are `!!` (ignored).
3. **The freeze.**
   - The chapter wrote only files named for it: `ch1-…` findings, `gaps/ch1-r0.md`, `final-ch1.md`, `verify/ch1-b1…b3`, `library-ch1.md`, `ledger-ch1.md`, `outline-ch1.md`, `run-ch1.md`, `trace-how-wal-works.md`, the draft, the critique and `slices/P90.S1/`.
   - `git diff` on tracked files shows only `phase.md` (the orchestrator's notebook) and the engine log.
   - `library.md`, `ledger.md`, `outline.md`, `summary.md` and the whole-book findings are unchanged.
   - The executor's own check (`git status --short --untracked-files=all … book`) passed.
   - There is no chapter commit to `show` (deviation 1).
4. **The chapter lead's tier and model.**
   - `slice-executor` at `spawnDepth` 1, foreground, `model: opus`, `effort: xhigh` (its `.meta.json`).
   - The research agents ran without a `model` parameter, so their frontmatter applied:
     - web-researcher and gap-reviewer on Opus;
     - verifier on Sonnet;
     - the preflight probes on Haiku.
5. **Searches against the cap.**
   - `DECOMP`: 83 (`modelUsage` Haiku `webSearchRequests`, equal to its 83 WebSearch calls).
   - Chapter top-up: 13 WebSearch calls.
   - Critic: 0 (it fetched by `curl`).
   - A six-chapter book in one session is about 160 searches against the default 200.
6. **The real costs.** See *Spend* below.

## Decision 2: the depth-2 findings (README items 1–4)

- **Background completions never reach a subagent lead.** Probe p1 showed this (Haiku, $0.01). Ending a subagent's turn returns control to its dispatcher, and the completion goes nowhere.
- **Foreground calls in one message run concurrently.** Seen at depth 1 (probe p2) and at depth 2 (the chapter's waves). The fix in the skill (§3.2, §3.5, §9.2) and both references uses this.
- **Permissions at depth 2.**
  - Agents run on the session's rules, and the deny rules on the operator's config held.
  - A denial reaches the agent as `asyncAgent`, "no approval surface".
  - The `bypassPermissions` frontmatter did not apply under `-p` manual mode, for a subagent or for an `--agent` main thread.
- **The lead's own calls in manual mode.** DECOMP attempt 1 stopped at §2's resolver (`python3 -c` denied). It is kept as `decomp-attempt1-result.md`.
- **The stream.** `claude -p`'s stream has no depth-2 messages. The persisted transcripts hold every span flat under `subagents/`, with `spawnDepth`, `agentType`, `model` and `requestShape` in each `.meta.json`. That is what `dispatch-summary` reads, so it would see them.
- **Resume.** `SendMessage` from a `-p` orchestrator resumed the depth-1 executor for span 3. Its first request cost $3.44, one cache write of the executor's context.
- **Item 4, the critic.** It ran on another model with `kind: chapter`, but in the foreground: a `-p` main thread would otherwise end. The background dispatch from an interactive orchestrator stays the first real book's to see.
- **The critic's own problems.**
  - It could not find `pagetext.py` (its `find` was denied), so it never used the converter and read the fetched raw HTML instead. Fixed in B5.
  - It retried six fetches with `--max-time 60`, each denied, then returned to 30. Fixed in B11.
  - One regex `grep` was denied. This is the known class.

## Spend (`rehearsal/r2/spend.md`)

| Run | Cost (USD) |
|---|---|
| probes p1, p2, p4 (Haiku); p3 refused by the classifier, not run | 0.03 |
| `DECOMP` attempt 1 (stopped at §2) | 1.46 |
| `DECOMP` attempt 2 (Opus 37.65, Sonnet 12.41, Haiku 1.01) | 51.07 |
| outline gate (Opus orchestrator) | 0.54 |
| chapter, up to the critique and span 3's first request: executor 27.81 (span 3: 3.44), critic 7.43, depth 2 11.11, orchestrator 1.67, plus ≈ 0.3 for searches | ≈ 48.3 |
| **total** | **≈ 101.4** |

- **A book.** A chapter is ≈ $50–58 with its revision. A six-chapter book with a tier-3 `DECOMP` is ≈ $350–400, the top of the README's old $170–350 estimate. The executor's context grows across the top-up, the three passes and D6–D7. This is not redesign-sized, but S10's handoff and `create-phase` step 2 must say it.
- **The watchdogs.**
  - The streamed-usage watchdog read 0.87× the real `DECOMP` cost: depth-2 messages are missing from the stream, and 1 h cache writes were priced at the 5 m rate.
  - `watchdog4.py` prices the persisted transcripts instead.

## The fixes

**Skill: `plugin/skills/explain/SKILL.md`, synced to the other two copies.**
- **§3.2:**
  - a by-path lead has no grant;
  - a subagent lead sends probe A in the foreground;
  - the stop block prints `Bash(python3 -c *)`, `Bash(which pdftotext)`, §3.1's `find`, and `Read`/`Edit` on `<BOOK>`.
- **§3.5 step 2:** a subagent lead's waves go in the foreground, in one message.
- **§3.9:** D6 and D7 run in `quick`.
- **§9.2:** both leads are by-path subagents.
- **B5:** where `<tools>` is.
- **B11:** no longer `--max-time`; a time-out is a failed exact text.

**Package.**
- **`explain-decomposition.md`:**
  - the plan-gate report names the by-path lead's rules;
  - the labelled slice line;
  - the foreground bullet;
  - FAILED resumes from `run.md` or from §2.
- **`explain-chapter.md`:** the foreground sentence and the labelled slice line.
- **README:**
  - *Permissions* (four bullets);
  - the depth-2 minimum;
  - *The search cap* and *The cost*, measured;
  - *Known limits* (the headless critic);
  - *What the rehearsal checks*, answered.
- **PATCHES and README:** the v74 re-count.

**Not fixed, observations.**
- The orchestrator's gate report ran 3.7k characters against the ~2k stop rule.
- The DECOMP's general-purpose probe treated the slice line as a task (fixed by the label, d66).

## Kept

`rehearsal/r2/` holds 96 files, 1.6 MB, with no `pages/`:
- `intent.md`, `phase-P90.md`, `engine-log.md`;
- `slices/P90.DECOMP` and `slices/P90.S1` (plan and result);
- `book/` (research, outline, draft, critique);
- `gate.md`, `decomp-attempt1-result.md`, `spend.md`;
- `harness/` (scripts, specs, the `ws/` set-up, the run prompts and commands, `anchor-count.py`, `keep.py`).

The scratch originals are still in the session scratchpad (`…/scratchpad/s9/`) for a resume if OQ11 picks (b).

The notebook carries the rest:
- `phase.md` Decisions d64–d68 (long form in `topics/build-decisions.md`);
- the note for S10 and the REVIEW note update;
- OQ11;
- three Doc impact lines;
- Now.

## Operator answer (OQ11, 2026-10-23)

"accept" (Decisions d69): rehearsal 2 stands as it ran. The chapter's revision span and the commit-time freeze
check are left to the first real book; S9 closes with the run above.
