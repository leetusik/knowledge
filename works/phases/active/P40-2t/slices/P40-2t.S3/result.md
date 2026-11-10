# P40-2t.S3 — result

## Verdict

- **status:** done
- **route:** high
- **model:** opus
- **effort:** xhigh
- **summary:** Wrote the three explain references whole from `fdb1151` (C1–C6). A subject explain is told from a research phase's findings, and the registry floor is 0.11.0. A book's outline pins recap lines, names, running examples and link ids. Its chapters are declared (`--depends-on none`; a synthesis chapter on the chapters it draws on), and the outline stop holds them all. The new *Chapters at once (a wave)* section adds the cap of 4, says that span-1 and critic returns are not slice returns, and lets an orchestrator resume from disk. The review gains a consistency pass. Wrote `patches/workflow.md` with 14 finds, each exactly once at `fdb1151`: wave.md (9), decomposition.md (1), slice-executor.md (2) and both review.md files (1 each).
- **files_changed:**
  - `works/phases/active/P40-2t/package/claude/skills/do-whole-phase/reference/explain-decomposition.md` (new, 34,282 B)
  - `works/phases/active/P40-2t/package/claude/skills/do-whole-phase/reference/explain-chapter.md` (new, 27,298 B)
  - `works/phases/active/P40-2t/package/claude/skills/do-whole-phase/reference/explain-review.md` (new, 22,047 B)
  - `works/phases/active/P40-2t/package/patches/workflow.md` (new, 13,108 B)
  - `works/phases/active/P40-2t/slices/P40-2t.S3/result.md` (this file)
- **validation:**
  - Every find in `patches/workflow.md` occurs exactly once at `fdb1151`: **pass**. 14 finds checked, 0 not exactly once (a scratch check on P39-hk's `finds.py` and `apply.py` logic).
  - The smoke suite's pinned literals on scratch copies of `wave.md`, `decomposition.md`, `slice-executor.md` and both `review.md`, with the patch applied: **pass**, 0 pins lost.
  - The smoke suite's whole static Test 0 block (`tests/retrofit_smoke.sh` L146–L1200 at `fdb1151`, the P42 block included), run on a scratch archive of `fdb1151` with the patch applied and the three references copied in:
    - **fails at exactly one pin**, L250 `"**0.10.0 or later**" in _decomp`. The C1 change makes that failure expected;
    - **passes whole** with that one pin flipped to `**0.11.0 or later**`. The pass covers `SHARED_SKILL_FILES` (the `do-next-slice` copies equal their sources), the `[--depends-on` pin and the byte caps.
  - P39-hk's `checks/cites.py` over the three references: **pass**, 105 citations and 15 bold parts, missing 0.
    - It passes against the committed plugin skill now at `HEAD` (`e8fad0e5`, S1's front door), via `git show HEAD:plugin/skills/explain/SKILL.md`.
    - It also passes against the skill before S1 (0.10.0, as first read). The base files at `fdb1151` checked 99 citations with missing 0.
  - Nothing exists under `package/claude/skills/do-next-slice/`: **pass**.
  - `payload/contract.md` and the two `SKILL.md` cores are untouched: **pass**. No find targets them, and the patched scratch tree still reads 12,285, 8,185 and 8,180 B.
  - `python3 scripts/workflow.py validate`: **pass**. Its warnings were already there, or are the orchestrator's (the notebook move).
  - The whole retrofit suite, with its installs: `deferred: whole-tree`. S6's `checks/apply.py` and REVIEW run it.
- **deviations:**
  1. **`wave.md` gets 9 finds, not only the 3 passages C7 names.** C7 names the opening, *Planning and dispatching a wave* and *Unchanged*. I also patched `returned`, *Rolling starts*, *At each return* (its first line and step 6) and *Resume* step 2 (twice). Reason: resuming from disk. After a compaction, *Resume* and the card's `returned=` would otherwise treat span 1's `done` head as the slice's return, and would start chapters past the cap.
  2. **The outline gate runs `finish-slice <P>.DECOMP && accept-gate --require && set-slice-status <first chapter> pending …` as one command line.** On feedback, `DECOMP` goes back `in_progress` before the chapter goes back to `todo`. Reason: once chapters are declared, `ready_slices=` lists them all the moment `DECOMP` is `done`. A compaction between the finish and the stop would let *Resume* start them before the signature.
  3. **Span 3's final verdict block gains `corrections: <one line each> | none`.** The review's step 1 reads it, and an older chapter falls back to its note. Reason: notes are removed once consumed, and a chapter that runs alone writes `phase.md` directly. The consistency pass (C6) needs every correction on disk where the review reads it.
  4. **Every span's dispatch description names its chapter and span** (`<P>.S<k> span 1 | critic | span 3`). Reason: the resume card lists running spans by agent type and description. Without the name, a waiting critic cannot be told apart from a dead one.
  5. **The intro paragraphs of `explain-decomposition.md` and `explain-chapter.md` now say "records alone"**, with a subject told from a research phase's findings. That is C1/C2's subject case, stated where the files open. No heading was renamed. The one new heading is the pinned *Chapters at once (a wave)*.
- **doc_impact:** (in `notebook` below; wave: no `phase.md` write)
- **notebook:**
  - **Doc impact:**
    - `- product.md, decisions.md: a signed book's chapters are declared and run as a wave after the outline gate (at most 4 in flight, a synthesis chapter after the ones it draws on, a critic per chapter dispatched as its span 1 returns); the outline pins recap lines, names, running examples and link ids; span 3 records corrections; the review adds a consistency pass; a research phase with a "- then: explain" line goes on to create-phase's research route, When it passes, at its recorded pass (P40-2t.S3)`
  - **Notes for later slices:**
    - `- **(from P40-2t.S3, for P40-2t.S6)** Smoke literals: S3 changes one pin and leaves one stale. L250 '"**0.10.0 or later**" in _decomp' becomes '**0.11.0 or later**'. The P42 pin '"[--depends-on" not in LIVE[_rel]' (L441–442) still passes; flip it to '"--depends-on none" in LIVE[_rel]' (checked on a scratch build). All other pins on wave.md, decomposition.md, slice-executor.md, both review.md and the three references hold → patches/workflow.md §5`
    - `- **(from P40-2t.S3, for P40-2t.REVIEW)** Beyond C7's 3 named passages, wave.md is patched where a resume would misread a chapter after its span 1 (returned=, Resume step 2) or start past the cap of 4. The outline gate is one &&-joined command (finish, gate, stop). Span 3's final verdict gains corrections:, which explain-review step 1 reads → slices/P40-2t.S3/result.md, Deviations`
  - **Decisions:**
    - `- **Chapters at once (S3):** the cap of 4 is counted by the orchestrator from running_slices=; the operator's word lifts it as a Decisions line. Span-1 and critic returns take no record-dispatch, set check, finish or commit; only span 3 (critique: answered) takes At each return. Resume reads each chapter from disk: the result.md head, then the critique file's "- verdict:" line. The outline gate's finish, gate and stop are one &&-joined command → package/claude/skills/do-whole-phase/reference/explain-chapter.md`
  - **Operator Questions:** none.
  - **Now:** `S3 landed: the three explain references (C1–C6) and patches/workflow.md (C7–C10, 14 finds, each exactly once at fdb1151); cites missing 0; the smoke Test 0 block passes on fdb1151 + S3 with one pin flipped (for S6).`

## Detail

### What was read

- **Base `fdb1151`.** Read with `git -C /Users/sugang/projects/personal/bootstrap_agentic_workspace.sh show fdb1151:<path>` into the scratchpad, one plain command per file:
  - the three explain references, `wave.md`, both `decomposition.md` and both `review.md`;
  - `slice-executor.md`, `dispatch.md`, both `verdicts.md` and the `do-whole-phase` `SKILL.md`;
  - `create-phase/SKILL.md`, `scripts/workflow.py` (the ready set, `wave_card_lines`, `_card_running_spans`) and `tests/retrofit_smoke.sh`.
- **For the Test 0 run,** one `git archive` of `fdb1151` was unpacked into the scratchpad. The bootstrap's working tree was never touched.
- **The plugin skill,** only as committed: `git show HEAD:plugin/skills/explain/SKILL.md`, at first 0.10.0 and later `e8fad0e5` (S1). Its heading list is unchanged.
- **The siblings' committed package files,** read-only: S2's `explain-route.md` and `research-route.md`, S4's `engine.md`. S2 cites *Chapters at once (a wave)* verbatim and writes the bold part **When it passes.**. Both match what this slice wrote.

### What each change does (by change-list row)

- **C1** (`explain-decomposition.md`, *Before you plan it*):
  - the `## Explain` check gains **a subject explain**: `phases:` must name a research phase, never `none`, and a subject book's `book:` line reads `<slug> — "<title>" (kind subject: <label>)`;
  - a legacy `mode: general` reads as a subject when a research phase covers it, and is otherwise the decision stop;
  - the registry floor is **0.11.0**;
  - the estimate is the chapters' span time, and a wall clock of rounds of at most 4 plus the synthesis chapter.
- **C2** (*A book*):
  - **D1:** a research phase's records (`intent.md`, Decisions gists, `topics/`, `result.md` heads); a corpus read only at cited record ids; `source:` copied and never read; the standing gap; `code 0` for a subject book.
  - **The outline:** the book kind `codebase|subject` with its label, "builds on" as a recap obligation, and **the pins** (taught terms with one-line recaps, names, running examples, link ids). The synthesis chapter is named with the chapters it draws on.
  - **Step 4:** the declaration (`--depends-on none`; the synthesis on each chapter it draws on); each chapter's set into `topics/breakdown.md`; the code environment warmed once, changing no tracked file; `parallel-plan` into `parallel:`.
  - **Steps 5–6:** the Decisions gist and the Notes pointer to the pins.
  - **Each chapter's `plan.md`:** gains the pins and the set.
- **C3:**
  - **The outline gate:** the stop holds every declared chapter. Finish, gate and stop are one command. "accept" starts the first chapter and up to three more. On feedback, `DECOMP` goes `in_progress` before the chapter goes `todo`. A re-cut declares its new chapters, and `set-slice-deps` re-declares the synthesis. Dropped chapters close before `DECOMP` finishes.
  - **A document or a chapter:** `S1` is cut `--depends-on none`, and its sign-off stop rides in the same command line as the finish.
- **C4** (`explain-chapter.md`, new `## Chapters at once (a wave)`):
  - **the cap:** at most 4 in flight, counted from `running_slices=` before every start, *Resume*'s included;
  - **the returns:** span-1 and critic returns are not slice returns, and each critic is dispatched as its span 1 returns. Span 3 resumes by `SendMessage`, or from disk with `## Wave` rewritten. Only span 3 takes *At each return*;
  - **stops:** chapters in flight finish their own spans;
  - **usage limits:** handled by `dispatch.md` (5), with `--stop-kind limit` when no reset time is given;
  - **what a chapter sees:** the pins, and its siblings only at `HEAD` (B5 *Inputs*). The synthesis chapter starts only after its chapters are `done` and committed;
  - **resume from disk:** a state table read from the `result.md` head and the critique file's `- verdict:` line.
  - `/do-next-slice` and a single `S1` run alone.
- **C5:**
  - **Span 3's note:** taught terms, link ids and **corrections**, tagged for the later chapters and `REVIEW`; in a wave it goes in the `notebook` field. The final verdict gains `corrections:`.
  - **The freeze check:** in a wave it is scoped to the chapter's set plus the frozen files.
  - **The commit:** one rolling commit per chapter.
  - **The publish fields:** they carry the book kind and a subject book's label, in the plan and in `## Publish` (§5).
- **C6** (`explain-review.md`):
  - step 1 reads `corrections:`;
  - step 2 gains **the consistency pass**: recaps against the pinned lines, one name per thing, running numbers, and every correction checked in the other chapters. A mismatch is a finding with a fix slice.
- **C7–C10** (`patches/workflow.md`):
  - **`wave.md`, 9 finds:** the opening, `returned`, "no cap", *Rolling starts*, *At each return* (its first line and step 6), *Resume* step 2 (twice) and *Unchanged*;
  - **`decomposition.md`:** the declaration bullet;
  - **`slice-executor.md`:** the decomposition bullet, and the explain carve-out's `notebook` field;
  - **the chain step:** in both `review.md` files, a new bullet: "A research phase that chains an explain … *The research route*, **When it passes**".
  - `do-next-slice/reference/decomposition.md` has no explain exemption, so it needs no edit.

### Commands and outcomes

```
check_workflow_patch.py <bootstrap> fdb1151 package/patches/workflow.md <scratch>/tree2
  finds checked=14 not-exactly-once=0 at fdb1151; pins lost=0
  wave.md 20127 -> 21145 B; decomposition.md 13197 -> 13317 B; slice-executor.md 51244 -> 51447 B;
  do-whole-phase review.md 18661 -> 18998 B; do-next-slice review.md 19918 -> 20255 B
test0.py <scratch>/tree (unmodified fdb1151)          -> BASELINE-PASS
test0.py <scratch>/tree2 (fdb1151 + S3)              -> AssertionError at L105 (= suite L250, "**0.10.0 or later**")
test0-flipped.py <scratch>/tree2 (that pin -> 0.11.0) -> FLIPPED-PASS
build.collect_live_payloads() on tree2: "--depends-on none" in both installed explain-decomposition.md, "[--depends-on" in neither
cites.py <HEAD skill, e8fad0e5> <3 references>        -> citations checked=105 bold parts checked=15 missing=0
cites.py <0.10.0 skill> <3 references>                -> citations checked=105 bold parts checked=15 missing=0
cites.py <0.10.0 skill> <3 fdb1151 references>        -> citations checked=99 bold parts checked=13 missing=0 (baseline)
python3 scripts/workflow.py validate                   -> Workflow validation passed.
```

All scratch files (the check script, the `test0*.py` extracts, the trees) are in the session scratchpad, under `.../scratchpad/s3/`.

### Smoke-suite literal list (for S6's `patches/release.md`)

- **Changed:** L250 `"**0.10.0 or later**" in _decomp` becomes `"**0.11.0 or later**" in _decomp`.
- **Stale but passing:**
  - L441–L442, `"[--depends-on" not in LIVE[_rel]`, for both installed `explain-decomposition.md`. Suggested flip: `"--depends-on none" in LIVE[_rel]`.
  - Its comment L426 ("explain chapters stay undeclared") belongs to S4's D3.
- **Removed from the shipped text, with no pin on any of them:**
  - `wave.md`: "An explain phase declares nothing, so it stays sequential.", "**Every ready slice starts: there is no cap.**" and "the explain references" in *Unchanged*;
  - `decomposition.md`: "an explain phase's chapters stay undeclared and run alone";
  - `slice-executor.md`: "leave an explain phase's chapters undeclared";
  - `explain-decomposition.md`: "explain is codebase-only now", "**Undeclared.**" and "kind `codebase`" as the only kind.
- **New literals S6 may pin:**
  - `## Chapters at once (a wave)`, `**At most 4 chapters in flight.**` and "span 1's `done` with `critic_ready: yes` is not a slice return" (in `explain-chapter.md`);
  - `--depends-on none` and `(kind subject: <label>)` (in `explain-decomposition.md`);
  - `**the consistency pass.**` (in `explain-review.md`);
  - `*The research route*, **When it passes**` (in both `review.md`).
