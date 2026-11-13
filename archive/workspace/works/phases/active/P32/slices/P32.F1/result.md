# P32.F1 result: reader-first writing, rehearsal 1b

- **status:** needs_operator
- **tier:** high
- **model:** opus
- **effort:** xhigh
- **summary:** Rewrote the explain skill's writing stage in all three copies (the reader's path at D6, three passes and prose rules at D7, the critic reading as the reader) and finished rehearsal 1b at $54.72 of $75. Under rules v2 the new chapter wins Helpfulness, Comprehensiveness and Insight on both subjects in both blind orders, but old still wins Readability on both (new is about 43% longer). The confirm run (`quick`, the verifier on another model, the curl publish) and the resume lookup with no run id passed live; the last leak scan found a sixth token hit in another project's transcript, moved in today (OQ9).
- **files_changed:**
  - `plugin/skills/explain/SKILL.md`, `.agents/skills/explain/SKILL.md`, `web/public/SKILL.md` (first dispatch; nothing in the continuation)
  - `plugin/agents/explain-critic.md` (regenerated; `maxTurns` 60 → 120)
  - `works/phases/active/P32/phase.md` (Decisions, Doc impact, Operator Questions, Notes, Now)
  - `works/phases/active/P32/topics/build-decisions.md` (d57–d61)
  - `works/phases/active/P32/rehearsal/r1b/` (new: scorecard, spend, resets, chapters, judges, dossiers, harness)
  - `works/phases/active/P32/slices/P32.F1/result.md`
- **validation:**
  - `python3 scripts/skills_parity.py`: PASS
  - `python3 scripts/plugin_parity.py`: PASS
  - `claude plugin validate plugin`: passed
  - `python3 scripts/workflow.py validate`: passed (only the existing warnings: P26 kinds, owed consolidation, stale docs, oversized sections)
  - `git diff --stat`: in scope (three skill copies, `explain-critic.md`, `phase.md`, `topics/build-decisions.md`; `rehearsal/r1b/` and `result.md` are new)
  - R7 `knowledge check` on a fresh scratch API (:8833): exit 0 for `c-new`, `g-new`, `c-new-v2` and `g-new-v2`
  - Blind judges, both orders, both subjects, v1 and v2: eight sessions, every record in `rehearsal/r1b/judges/`
  - Leak scan after every run. The continuation was clean against the five known files through the resume run. After rw-g-v2 there was a sixth file, another project's transcript (OQ9). The repo folders F1 touches are clean (0 files).
  - My PIDs are all stopped (stacks 57881, 59095, 74398 in the continuation); ports 8831–8835 are free; no `claude -p` or watchdog is left
  - Nothing was published anywhere real: only to scratch :8831, :8832, :8834 and :8835
- **deviations:**
  1. Two changes outside the writing stage, forced by the runs: §4.10 dispatches the critic in the foreground (a background one was killed under `claude -p`), and the critic's `maxTurns` went from 60 to 120 (it hit 60 on both subjects).
  2. Old chapters were judged from the stored files in `rehearsal/r1/chapters/`, not from a stack.
  3. The reset also removed `meta.json`, `payload.json`, `response.json` and `check.json`, and emptied `critic/`.
  4. C v1 took two sessions: D6–D8, then a resume at D8 after fix 1.
  5. The first confirm run was lost ($5.05): the lead read "quick" as "quickly" and ran `full`.
  6. The rehearsal stopped once on the leak-scan rule (OQ8) and was continued on d61.
  7. In the continuation, the confirm and resume runs ran alongside G v2, on their own stack (:8835) and state, rather than after G's judges. They are independent, and C v2's judges had already run first.
  8. The resume test went further than "set `run.md` back to `stopped` at D9". It also removed `report.md`, so D9 had work to do, and put a newer finished decoy dossier beside the run, so the lookup's "not `done`" filter was tested.
  9. The sixth hit was found after rw-g-v2, while its two judges were already running (started before the scan). They were let finish: read-only on scratch copies, with the config denied. No run started after the hit, and every planned run had already run.
  10. The size grew +3,059 B, against "about 3 KB".
- **doc_impact:**
  - product.md: chapters are shaped around the reader's stated tasks and deliverables, follow readable-prose rules and word budgets, and are checked by the critic as their reader (P32.F1)
  - architecture.md (*Plugin packaging*): `explain-critic` runs with `maxTurns: 120` and is dispatched in the foreground (P32.F1)
- **operator_need:** two questions, both in `phase.md`'s Operator Questions.
  - **OQ9, the sixth token hit.** The file is `~/.claude/projects/-Users-sugang-projects-KRPD-glide/0118b617-8bf0-4d8e-b80c-4ddda3e726d0.jsonl`, a 2026-10-07 session with cwd `/Users/sugang/projects/glide/base`; the token is in a tool result at line 275. The whole folder was moved in at 11:16:20 today, with the glide-ilab batch's birth time (2026-10-22 11:23:19). Confirm it is yours, then treat it as known, redact it, or rotate the token. F1 needs no more runs either way.
  - **OQ10, the Readability lever.** Accept v2 and go on to S8, or make D6's length budget binding? The recommendation is below, under "OQ10".

## Scorecard summary

Full scorecard: `rehearsal/r1b/scorecard.md`. Each cell reads o1 · o2 → result; a win counts only when both orders agree.

| | Helpfulness | Comprehensiveness | Insight | Readability |
|---|---|---|---|---|
| C, rehearsal 1 (before F1) | old · old → old | new · new → new | new · new → new | old · old → old |
| C, rules v1 | new · new → **new** | new · new → **new** | new · new → **new** | old · old → **old** |
| G, rules v1 | old · new → **tie** | new · new → **new** | new · new → **new** | old · old → **old** |
| **C, rules v2** | new · new → **new** | new · new → **new** | new · new → **new** | old · old → **old** |
| **G, rules v2** | new · new → **new** | new · new → **new** | new · new → **new** | old · old → **old** |

**Mandatory checks.** In all eight sessions new passes R1, R3, R5 (C), R7 and R8, with no traps committed.
- New's effective citations are 9–14, against old's 4–11.
- R7 `knowledge check` exits 0 on all four new chapters.
- The v2 judges failed *old* C's R8 in both orders: it calls "the 201 never waits" settled.

**Against the target:**
- **Helpfulness: met, and better than "tie".** v2 wins it on both subjects in both orders. On C that is rehearsal 1's loss turned into a win; on G, v1's tie.
- **Comprehensiveness and Insight:** kept throughout.
- **Readability: missed on both subjects.**

**What the judges blamed for Readability under v2:**
- **C:** length alone.
  - o1: old is "shorter and tighter, with a clear numbered invariants checklist"; new is "longer but well structured".
  - o2: old is "shorter, with a timeline, a sequence diagram and a tight checklist"; new is "longer but well structured".
  - The clutter complaint is gone: v1's "line-number clutter" and "dense" no longer appear.
- **G:** length plus inline citations.
  - o1: old is "shorter, with a runnable benchmark and worked examples"; new is "denser".
  - o2: new is "dense and long, with many inline citations".

**The surface measures:**

| | Words | Links | Attribution verbs |
|---|---|---|---|
| Old C | 4,118 | 7 | 5 |
| C v1 | 6,395 | 21 | 29 |
| C v2 | 5,881 | 14 | 20 |
| Old G | 4,803 | 44 | 7 |
| G v1 | 8,561 | 177 | 43 |
| G v2 | 6,888 | 125 | 23 |

C v1 also carried 18 inline line references; C v2 has 0. Both v2 chapters are about 43% longer than old and above
D6's own 5,000-word ceiling: the budget is stated, but the reader pass and the critic did not hold the chapter to it.

## OQ10: recommendation

**Accept v2 and go on to S8.**

The operator asked for the new chapter to be "also helpful and reading easy".
- **"Helpful" is now met outright.** New wins Helpfulness in all four v2 sessions, including C, where rehearsal 1
  lost it.
- **"Reading easy" improved.** C's judges call new "well structured" and mention no clutter.
- **What still loses Readability is length.** That length carries what wins the other three criteria: on C the
  lock-wait exception, the GET-before-re-POST rule and the races; on G asyncio, subinterpreters and the dependency
  checks.

**The alternative is to make the budget binding.** The reader pass must land within D6's total, and an overrun
becomes a critic must-fix. That is a small text change.
- **The catch:** it still leaves new near 5,000 words against old's 4,100–4,800, so a Readability flip is unlikely.
  A budget at old's length would cut about 30%, and with it some of the Helpfulness and Insight wins.
- **The cost:** a rerun of both subjects plus four judges, about $22. G alone, about $11, would show whether a
  binding budget keeps the Helpfulness win.

## Spend

`rehearsal/r1b/spend.md`: **$54.72 of $75** (the cap was raised from $45 at OQ8, d61, as a loop-safety stop).

| Run | Cost | Note |
|---|---|---|
| confirm (lost) | 5.05 | watchdog estimate |
| rw-c | 7.17 | estimate; its critic was killed |
| rw-g | 11.41 | |
| judges G v1 | 0.94 | |
| rw-c2 | 7.39 | |
| judges C v1 | 1.08 | |
| rw-c-v2 | 7.55 | |
| judges C v2 | 0.97 | continuation |
| confirm2 (`quick`) | 2.35 | continuation |
| confirm2-resume | 0.51 | continuation |
| rw-g-v2 | 9.55 | continuation; watchdog estimate 11.90 |
| judges G v2 | 0.75 | continuation |

The watchdog overestimated by 1.24–1.43× on these runs.

## The confirm run and the resume lookup

The setup: `quick` on a Sonnet lead, with the `knowledge` CLI off PATH and a fresh stack (:8835). The flag was set
apart: "…(reader: a backend developer who writes API clients) quick". The run is kept in
`rehearsal/r1b/dossiers/confirm2/`.

**What worked:**
- **The mode:** read right, as `run: quick`.
- **The verifier:** §3.9's ran on another model, `knowledge:verifier` on Opus ("I am Sonnet"). Its one batch of 10
  gave 9 supported and 1 partial, narrowed in the chapter.
- **The publish without the CLI:** `knowledge --version` failed, so the lead used `pagetext.py --payload` and
  `curl --json` to the check endpoint, then the documents endpoint. It got a 201, v1, committed, `pushed: false`.
- **The gate held,** and the critic was skipped, as `quick` says.

**The miss: no `outline.md` at all.** The lead went from D5g straight to D7, so it skipped D3's outline and D6's
reader's path. It put a `## Reader's task` section, three tasks, at the top of the chapter itself instead. §3.9
lists D3 but does not say D6 still runs in `quick`. Per d61 this was not changed. It is in the Notes for S9.

**The resume lookup:**
- The setup: the run set back to `stopped` at D9 with `report.md` removed, and a newer decoy beside it, `state: done`.
- `/knowledge:explain resume` with no run id picked the stopped run ("the only unfinished one").
- It re-ran the preflight and read the document back by path (200) rather than publishing again.
- It wrote `report.md` and set `state: done`. No second commit on the stack.

## Rule changes (first dispatch; unchanged in the continuation)

| Where | Change |
|---|---|
| §3.10 (D6) | The reader's path: `## Reader's task` (2–4 tasks, each with a deliverable); the path in the reader's order; each finding in the step it changes; `## Not used`; per-section word budgets (v2: a single document mostly 3,000–5,000 words). Every must-cover point, load-bearing question and `stated` gap stays on the path. |
| §4, D7 | Three passes: skeleton, sections with the trace, then a reader pass that cuts to budget (replaces the coherence pass). Prose rules: one idea per paragraph (about 100 words); show, then tell (v2); a bold takeaway; teach, don't report (v2: own voice, one citation per source per paragraph, code location in the block title); callouts for depth; shorter wins (v2). |
| §4.2 | A starting shape, not a form; a task's own section ends in its deliverable. The tone line cites the prose rules and budgets, replacing "No length cap". |
| B5 | Reads as the stated reader. Input: `## Reader's task`. A task not served or a deliverable missing is a must-fix. Dense paragraphs, buried steps, interrupting caveats, who-said-what facts and over-budget sections are should-fixes. `reader` added to the category list and file template. |
| §4.10 | The critic in the foreground. |
| `explain-critic` | `maxTurns: 120`. |
| §9.3 | Item 5 cites §3.10 and §4. |
| §3.10, §8, §4.10 | The mode block brought up to date (plan item 7). |

## Skill size

**152,339 B**, +3,059 B over 149,280.

| Section | Change (B) |
|---|---|
| §3.10 | +1,860 |
| §4 D7 | +1,169 |
| B5 | +635 |
| §9.3 | +154 |
| §4.10 | +139 |
| §4.2 | +95 |
| §8 and the card | +51 |
| §2 (trim) | −707 |
| §4.3 (trim) | −182 |
| §4.8 (trim) | −119 |
| §5 (trim) | −36 |

## Detail

**Reset.** C's dossier comes from `rehearsal/r1/dossiers/c-new/` (no `pages/`). G's comes from S7's scratch,
with `pages/`. Each was reset to D6 from a fresh copy for every rewrite. What was removed and rewritten is in
`rehearsal/r1b/reset-c.md`, `reset-g.md`, `reset-c2.md` and `reset-g2.md`; the last matches `reset-g.md` but for
its paths. The stale mode-block values were left in place, to test plan item 7.

**Runs.** All used F1's scratch harness (`rehearsal/r1b/harness/`, with the continuation's specs added):
- scratch `XDG_*`/`KB_*`, checked with §2's resolver first (never hi2vi);
- `--setting-sources project` and `--no-session-persistence`;
- deny rules on `~/.config/knowledge-kb`;
- no visible budget; `watchdog2.py` instead;
- C's cwd is a clean clone at 9978d84 with `.claude/settings.json` = `{}`.

Each publish went to a fresh scratch stack: :8831 (v1), :8832 (C v2), :8834 (G v2) and :8835 (confirm).

**Observations for later slices** (also in Notes):
- A headless lead that ends its turn with a background agent running loses it after 600 s. After the fix, all
  three Opus sessions dispatched the critic in the foreground and finished.
- The critic needs more than 60 turns on a 6–9k-word chapter. At 120, both v2 critics finished in one attempt.
- A trailing mode flag must be set apart in a prompt. With it set apart, `quick` was read right.
- G's lead left `searches: 0` in `run.md` in both v1 and v2 (its report says about 60), and so did the confirm run.
  C's runs keep `searches: 1`. Plan item 7 is partly met.
- G v2 published under a slug taken from its title, unlike v1. Each went to its own fresh stack, so nothing was
  overwritten.
- `quick` skipped `outline.md` (above).

**The leak scans.**
- **OQ8:** after rw-c-v2, two glide-ilab transcripts. d61 made them known.
- **The continuation:** clean against those five files through the resume run.
- **After rw-g-v2, a sixth file.** It is `-Users-sugang-projects-KRPD-glide/0118b617….jsonl`. `hitwhere.py` (masked)
  places the token in a tool result, line 275, of a 2026-10-07 session whose cwd is `/Users/sugang/projects/glide/base`.
  - Every file in that folder has a status-change time of 11:16:20 today, after the previous clean scan.
  - Their birth time, 2026-10-22 11:23:19, is the glide-ilab batch's. The folder was moved in from outside.
  - rw-g-v2's own project folder is clean.
  - The file was not redacted: it belongs to another project and is outside the edit scope.
- **Every scan** of F1's scratch, of `rehearsal/r1b/` and of the repo folders F1 edits is clean.

**The bootstrap repo** (read-only to F1) shows uncommitted engine changes: `bootstrap_agentic_workspace.sh`,
`payload/scripts/workflow.py`, `payload/github/workflows/workspace-ci.yml` and `tests/retrofit_smoke.sh`, about
parallel-phase branch ids. They are dated 11:30–11:34 today, from another session. F1 wrote nothing there.

**Kept in `rehearsal/r1b/`:**
- `spend.md`, `scorecard.md` and the four `reset-*.md`;
- `chapters/`: `c-new.md`, `g-new.md`, `c-new-v2.md` and `g-new-v2.md`;
- `judges/`: eight records, the keys and the rubric;
- `dossiers/`: `c-rw1`, `g-rw1`, `c-rw2` and `g-rw2` (outline, trace, critique, run and report; no `pages/`), plus
  `confirm2` (its run, report, brief, trace and body, and the run and report after the resume);
- `harness/`.

**Notebook (`phase.md`):**
- **Decisions:** d57–d61 cut to one line each, the full text in `topics/build-decisions.md`. d61 was added there;
  d59 was updated with v2.
- **Doc impact:** two lines (first dispatch).
- **Operator Questions:** OQ8 (resolved by the orchestrator), then OQ9 and OQ10 appended.
- **Notes:** the consumed continuation note removed; the REVIEW, S8 and S9 notes updated.
- **Now:** rewritten.
- **Size:** 39,446 B, against a 40,960 B budget.

## After the verdict (orchestrator, 2026-10-23)

OQ10 answered: "accept. it's kinda cost for winning the other 3 isn't it" (Decisions d62). Rules v2 stand; F1 closes. OQ9 is routed to the acceptance walkthrough with OQ6.
