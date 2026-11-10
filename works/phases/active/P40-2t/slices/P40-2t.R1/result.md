# P40-2t.R1 — result: study the two research-first book runs and pin the change list

## Verdict

- status: done
- route: research
- model: opus
- effort: xhigh
- summary: Studied Note's P8-x9 and arb_upbit_1's P58-pm → P59-d8, and ruled on the six confirmed points: none is contradicted (4 and 6 hold; 1, 2, 3 and 5 hold with a change). Pinned the answers to (a)–(e) and a change list in five disjoint groups (plugin, create-phase routes, references, engine, release) for DECOMP2, with one operator question (OQ1, Sources listing the research's outside works).
- files_changed:
  - works/phases/active/P40-2t/topics/study-p8-x9.md (new)
  - works/phases/active/P40-2t/topics/study-p58-p59.md (new)
  - works/phases/active/P40-2t/topics/change-list.md (new)
  - works/phases/active/P40-2t/phase.md (through `phase-section` only: Decisions +7, Notes for later slices −3 +5, Operator Questions +1, Now replaced)
  - works/phases/active/P40-2t/slices/P40-2t.R1/result.md (new)
- validation:
  - `python3 scripts/workflow.py validate`: passed. Its warnings are all pre-existing: unknown kinds in P22 and P26, consolidation owed by 11 phases, stale docs, oversized doc sections.
  - `python3 scripts/workflow.py phase-section P40-2t Decisions --list`: 8 entries (DECOMP's breakdown plus R1's 7 gist lines), each under 512 B.
  - `python3 scripts/workflow.py phase-section P40-2t`: 10,412 B of the 40,960 B budget.
  - `git status --short`: only `works/` paths. The changes are R1's three topics, `phase.md` and `result.md`; `backlog.md`, `events.jsonl`, `slice.json` and `plan.md` are the orchestrator's from `start-slice`, there before R1. The bootstrap repo is clean, and nothing was written in Note or arb_upbit_1: arb_upbit_1's dirty `works/backlog.md` and untracked `research/eag3/…` are not R1's, and R1 ran only reads there.
  - The plan's checks: the three topic files exist; `change-list.md` holds the comparison (§1), the six verdicts (§2), the answers (a)–(e) (§3) and the grouped change list (§5).
- deviations:
  - (1) **No `Explore` dispatch.** Every read was head-first and targeted: verdict heads, `slice.json` times, critique header lines, heading greps and counts. The bulky files the plan named for `Explore` (P8-x9's 129 KB book and its 2.7 MB corpus) were not needed beyond their structure and counts. Not reading them also kept the operator's words out of context: no corpus text was read.
  - (2) A seventh `## Decisions` line (*Change list*) beside the six the plan named, because DECOMP2 cuts from it.
  - (3) The orchestrator's wave proposal is kept in all five parts. The cap is pinned at 4, the upper end of "3–4", with the evidence for it; three additions are pinned (recap lines and names in the outline, a corrections channel, the critic reading siblings at `HEAD`).
  - (4) The DECOMP's do-next-slice finding is ruled a false positive: no package fix (below).
- doc_impact: none. A research slice changes no durable truth. The Doc impact the edit slices will owe is named in change-list §5 (Group E note) and in *Notes for later slices*.

## What was read

- **This phase:** `plan.md`, `intent.md`, `phase.json`, `topics/breakdown.md`, `topics/route-today.md`, and `phase.md` by section.
- **P8-x9 (Note, read-only):**
  - `intent.md`, `phase.md` by section, `topics/breakdown.md` (head, S9's block), `topics/writing-rules.md` §8, and the corpus `manifest.md` headings;
  - every slice's `slice.json` (times, outcomes);
  - the verdict heads of S1, S18, S19, DECOMP2 and the REVIEW (round 2);
  - the nested repo's commit log.
- **P58-pm (arb_upbit_1, read-only):** `intent.md`, `phase.md` Decisions and Now, `slice.json` times, the REVIEW's verdict head, and one topic's structure (`curve-and-returns.md` ideas 1 and 4).
- **P59-d8 (arb_upbit_1's worktree, read-only):**
  - `intent.md`, `phase.md` by section, `topics/breakdown.md` and `topics/notes-for-later-slices.md`;
  - `book/outline.md`'s head, the order and taught terms, and chapter 1's entry;
  - every `book/critique/*.md` header and finding headings, plus the order, outside and cross-chapter findings in full;
  - chapter block counts and one Sources section;
  - the heads of DECOMP, S1 and S7's span 1;
  - the worktree's commit log and S7's file times.
- **The route text:**
  - the plugin `SKILL.md`: the intro, the card, §1 and *The front door*, §3.4, §4.10, §9, and B5's *Inputs*, *Nothing from outside* and *Order*, plus B9;
  - the payload at `fdb1151`: create-phase's explain and research routes; `explain-{decomposition,chapter,review}.md`; `wave.md`; the decomposition and review references; `slice-executor.md`; `contract.md`; `do-whole-phase/SKILL.md`;
  - `installer/build.py`'s `SHARED_SKILL_FILES`;
  - the engine's explain special cases (`explain_phase`, `finish_slice`, `cmd_parallel_plan`) and the smoke suite's pins and byte caps.
- **P39-hk's package:** `README.md`, `PATCHES.md` headings and section 8, the `checks/apply.py` head, and a byte comparison of its reference copies against `fdb1151`.
- **This repo:**
  - `server/books.py` and the CLI's `BOOK_KINDS` (the `subject` kind exists);
  - `plugin.json`, `marketplace.json`, `plugin/README.md`;
  - the parity scripts' heads;
  - the version files of this repo (v89), arb_upbit_1 and Note (v95), and the installed plugin (0.10.0).

## Findings beyond the notebook

The findings themselves are in the three topic files and in `phase.md` (Decisions, Notes, OQ1, Now). This log
adds only what supports them.

- **do-next-slice's explain pointer is correct.**
  - `installer/build.py` lines 97–102: `SHARED_SKILL_FILES` maps `.claude/skills/do-next-slice/reference/explain-{chapter,decomposition,review}.md`, and `dispatch.md`, to their `do-whole-phase` sources at build time.
  - `ls` of the installed `do-next-slice/reference/` in arb_upbit_1 (v95) and in this repo (v89) shows all three.
  - The DECOMP read the payload tree, which holds them only under `do-whole-phase`. **Decision: the package fixes nothing there**, and never ships a copy under `do-next-slice/`.
- **Byte caps** (`tests/retrofit_smoke.sh`):
  - `payload/contract.md` ≤ 12,288 B; it is 12,285 B now;
  - the `design-cowork`, `do-whole-phase` and `do-next-slice` `SKILL.md` cores ≤ 8,192 B; the latter two are at 8,185 B and 8,180 B.
  - So the chain step and the research route's run-at-once rule go into references and route text, never into those files.
- **The package must start from `fdb1151`'s files.** `cmp`:
  - P39-hk's `explain-chapter.md` and `explain-review.md` equal the v95 payload's;
  - its `explain-decomposition.md` differs on one line ("v86–v91" against v95's "v86–v93");
  - its two route texts differ from v95's create-phase by one blank line.
- **The engine has exactly two explain-only behaviours** the wave touches:
  - `finish_slice`'s `and not explain_phase(pdir)` on the v77 forced declaration;
  - `cmd_parallel_plan`'s note and early return.
  - `new-slice --depends-on`, `set-slice-deps`, `next`'s ready set and `start-slice` have no explain check.
  - The smoke probe pins the exemption: Test 10d's "explain exempt" lines, and the wave comment "explain chapters stay undeclared".
- **Cross-chapter findings in P59-d8:** 5 of 68 must/should findings (ch 2 C07, ch 3 C05, ch 4 C07, ch 5 C05, ch 6 C07), all should-fix. That is what a wave's critic, no longer reading in-flight siblings, would miss. The review's consistency pass and the outline's pins are built to catch exactly these.
- **Dead end, the KB server's book support:** not probed, since R1 runs no network check beyond the local files. P59-d8 S1's `knowledge check` with the book and chapter flags exited 0 against the hosted server, so `check` accepts a book chapter there. Whether the chapter pages render is P59-d8's publish (§7 of the change list).

## For the next readers

- **DECOMP2:** change-list §5 (the groups and their sizes), §4 (the two parallel-safety rules), §6 (a suggested cut), and OQ1 for its gate. Read the notes tagged for DECOMP2.
- **REVIEW:** the notes tagged for REVIEW: the release order, the v89/v95 updates, P59-d8's waiting checks, and the server-deploy deferred-job candidate. Read change-list §2 to re-test the verdicts against P59-d8's publish if it has happened by then.
