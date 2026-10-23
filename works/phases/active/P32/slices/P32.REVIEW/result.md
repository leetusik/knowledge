# P32.REVIEW result: the phase review

## Round 2 (after P32.F2 and P32.F3)

- **status:** done
- **tier:** high
- **model:** opus
- **effort:** xhigh
- **review_verdict:** changes_requested. Two findings, one proposed fix slice:
  1. A Sonnet lead's self-scheduled wakeup re-ran the finished skill. The result was an unasked second run that skipped D0b, set out to supersede the published v1, and scheduled another wakeup. Fix: **P32.F4** (`fix`, risk `high`).
  2. §4.9, a sentence F2 added, calls a `full` run's correct verifier a defect when the lead is not on Opus. Folded into **P32.F4**.
- **summary:**
  - **F2 holds, in the text and live.** `quick` now plainly keeps the agents, the files and the map.
  - **The one Sonnet `quick` run** (rv2a, a French press):
    - took `path: plugin`, with both haiku probes;
    - ran `knowledge:verifier` on Opus twice;
    - wrote every file of the headline, including `outline.md` with `## Reader's task` and `trace.md`;
    - published to the scratch stack.
  - **F3's two landing strings** equal `wc -l web/public/SKILL.md` (2,608).
  - **`## Doc impact`** carries finding 3's line and F2's three.
  - **The same run then re-ran itself.** Nine minutes after it finished, a wakeup the lead had set re-sent `/knowledge:explain …`. The lead began a second run nobody asked for, with no preflight, aimed at a v2, and set another wakeup. I stopped it before it published.
  - **One new F2 sentence contradicts B4** in `full` runs on a non-Opus lead.
- **files_changed:**
  - `works/phases/active/P32/slices/P32.REVIEW/result.md`: this round, placed above round 1, whose headings moved down one level.
  - `works/phases/active/P32/rehearsal/review/spend.md`: round 2 appended.
  - `works/phases/active/P32/rehearsal/review/r2/`:
    - the run's files: `run.md`, `brief.md`, `plan.md`, `outline.md`, `trace.md`, `report.md`, `gaps-final.md`, `verify-r1-b1.md`, `verify-r1-b2.md`;
    - `chapter.md`, the published source;
    - `files.txt` and `evidence.md`;
    - `rerun/run.md` and `rerun/brief.md`.
  - `works/phases/active/P32/phase.md`: `## Notes for later slices` and `## Now`, via `phase-section`.
- **validation:**
  - `python3 scripts/skills_parity.py`: PASS. The three copies are in body parity, the web copy is byte-identical, and the five agents match Part B.
  - `python3 scripts/plugin_parity.py`: PASS.
  - `claude plugin validate plugin`: passed, with one warning (ICON_MISSING).
  - `python3 scripts/workflow.py validate`: passed. Its only warnings were there before: P22/P26 kinds, consolidation owed by P28/P30/P31, stale docs, oversized sections.
  - Skill size: 155,790 B in the plugin and web copies, 155,164 B in `.agents`, 2,608 lines. This is an observation, not a finding (see *Observations*).
  - `phase-scope P32`: `fc5ff68..bd5346d`, 27 commits, 14 product files. F3 added `web/src/content/marketing/content.ts`.
  - Landing: `grep` finds 2,608 in `lede` (line 251) and `pane.meta` (line 261), which matches `wc -l`. No `775` is left.
  - Live run rv2a: 12 of 14 checks pass under F2's `check.py`. The two failures are F2's routed misses. Cost: **$3.71 of $10**.
  - Leak scan, baseline and after the run: the same six known files. The kept folder: 0 hits.
  - My scratch stack (PID 65620, :8871) and the run (PID 65755) are stopped, and :8871 is free.
  - Aside: `aside repl --account u1` returned "Aside daemon is not reachable". I made no browser run (see deviation 3).
  - Bootstrap: no command was run.
- **deviations:**
  1. **The run's environment had `CLAUDE_CODE_PRINT_BG_WAIT_CEILING_MS=0`.**
     - Why: a single run had to reach the whole headline, and F2's f2a3 lost its background verifier to `claude -p`'s 10-minute idle ceiling. With this setting the session waits for background work, as an interactive one does.
     - Side effect: the same setting kept the session open until the wakeup in finding 1 fired. Finding 1 states this.
  2. **I stopped the run myself at 01:26** (SIGTERM to my own PID) once the unasked second run had started, without waiting for the $6 watchdog. That run was spending on work nobody asked for, and the evidence was already complete. Nothing of it was published.
  3. **No scratch production build of the landing.** Aside was unreachable, so I followed the plan's fallback: I read F3's screenshot and its curl evidence. The instrument was that screenshot plus my own `grep` of the source.
  4. **The qa `## Regression Checklist` version was not written.** That step is pass-only. Its lines, updated for F2 and F3, are below for round 3.
- **doc_versions:** none — deferred to a docs phase. On `changes_requested` the gate section is not written. `## Operator Runtime` needs no version: the runtime did not change.
- **explain:** not written — run /explain for this phase
- **walkthrough:** none, because the verdict is `changes_requested`. The draft for round 3 is below.
- **deferred-job candidates:** seven, listed under *Deferred-job candidates*. Three of them are one-line tidies that P32.F4 may take instead.

### Findings

#### 1. A self-scheduled wakeup re-ran the finished skill → P32.F4

**What happened** (rv2a; `rehearsal/review/r2/evidence.md`):

- **While waiting on its agents,** the Sonnet lead called `ScheduleWakeup` four times (60 s, 120 s, 600 s, 600 s, each `noop: true`). Each time it used the run's own invocation as the prompt: `/knowledge:explain how a French press brews coffee …`.
- **01:15:44:** it published v1, wrote `report.md`, set `run.md` to `state: done`, and ended its turn.
- **01:24:** the pending wakeup fired and re-sent the request. The lead wrote: "The same request is already published as v1. I'll treat this as a re-explain and add v2 with the one gap v1 declared, a verified water temperature."
- **The second run** (`20261024-0124-french-press`):
  - did not re-run D0b ("the previous run's probe … passed 17 minutes earlier"), though the card says never skip a stage and resume says run D0b again;
  - researched into `findings/r1-nca.md`;
  - sent a verifier batch in the background;
  - scheduled **another** wakeup, for 01:36, with the same prompt.
- **01:26:29:** I stopped it. Nothing more was published; the stack held v1 only.

**Why it is a finding:**

- **It is a loop the skill does not bound.** Each finished run can schedule the next. Each one costs money nobody approved, and each supersedes the reader's published document.
- **The skill's own rule is broken.** "Loop safety is the only bound" is in the skill, and the intent asks for caps and loud stops.
- **The phase introduced it.** Before P32 the skill never waited on an agent.
- **The skill says nothing about this.** It says only "End your turn and wait for its notification" (§3.2 step 3; §3.5 sends waves in the background). It has no word on wakeups, crons or timers, and none on a request re-sent after a run is `done`.
- **The host offers the tools.** This host's lead tools include `ScheduleWakeup` and `CronCreate`.
- **It is not rare in our runs.** In the rehearsal transcripts, 2 of 9 Sonnet leads set wakeups: f2b2 once, with the prompt "continue explain run"; rv2a five times, with the skill's invocation.
- **The fix is cheapest now.** Plugin 0.6.0 is unreleased.

**My harness's part.** With the ceiling at 0, `claude -p` stayed open until the wakeup fired, 8 minutes after the last turn. That falls inside the default 10-minute ceiling too, but I did not test whether a default `claude -p` waits for a scheduled wakeup. An interactive session, where the plugin is used, fires one by design.

**Proposed fix slice: P32.F4, kind `fix`, risk `high`.**

- Named trigger: a core invariant, money. An unasked self-re-run spends and supersedes a published document. Guarding against an intermittent model behaviour is also open design.
- The surrounding text is F2's, and F2 was `tier: high`.
- What the slice would do, in all three copies:
  - **(a) A wait rule** where the skill sends background agents (§3.2 step 3, §3.5 step 2, the card's stop rules): wait only by ending your turn, because the notification starts the next one. Never schedule a wakeup, a cron, a monitor or a loop to wait. One that fires after the run re-sends the request.
  - **(b) A repeat guard.** The same request arriving again in the same session, with no new words from the user, after a run of it is `state: done`, is a repeat. Report the done run (url, version, dossier) and stop. A new version needs the user's own new request.
  - **(c) Finding 2's clause.**
- If `wc -l web/public/SKILL.md` moves off 2,608, update the two landing strings in `web/src/content/marketing/content.ts` (F3's widened scope).
- Validation:
  - both guards and `claude plugin validate plugin`;
  - one or two Sonnet `quick` runs under this harness, with the ceiling at 0, each kept open 15 minutes after `state: done`. Each must show no `ScheduleWakeup` or `CronCreate` call by the lead and a single run id. That is about $2–4 a run;
  - a leak scan after each run.

#### 2. §4.9 calls a `full` run's correct verifier a defect on a non-Opus lead → folded into P32.F4

F2 added this to §4.9: "A verifier played by you, or on your model, while `knowledge:verifier` was listed is a defect, stated there as one ('the verifier agent was available and not used')."

**That holds only for `quick`, where you are the researcher.** In `full`:

- the researchers are `knowledge:web-researcher`, on Opus (frontmatter);
- D3v and D5 send `knowledge:verifier` as it is, on Sonnet (§3.6);
- B4 says the verifier runs "on a model different from the researchers'";
- §3.3 makes `same model (degraded)` mean the researchers' model;
- the intent says "a different model re-opens the sources".

**So for a Sonnet lead on the plugin path in `full`** (Claude Code's common setup), the verifier correctly runs on the lead's model, and §4.9 tells the lead to report a defect: "the verifier agent was available and not used". A lead that reads §4.9 ahead may instead send the verifier with `model: opus`, which puts it on the researchers' model. That is the real degradation.

**The fix:** "or on your model" becomes "or on the researchers' model (in `quick`, yours)". §8 item 2 says "the same model", which reads correctly with §3.3, and can stay.

### F2's text, by section (check 2)

| Section | `quick` keeps the agents, files and map? | Contradiction? |
|---|---|---|
| The card | Yes: "no research team … every agent and file §3.9 lists stays"; D8 writes "the dossier line" | None. Its *Stops when* still reads "a probe call is denied"; D0b's one re-send is a refinement, not a conflict |
| §1, the flag line | Yes: the same words | None |
| §3.2 | Step 1: the path is picked "by what you can spawn, never by the run (`quick` too)"; B's calls "as written"; step 4 re-sends a probe once for its own form | The new folder clause ("on `run.md`'s `dossier:` and `tools:` paths") also covers a code researcher's `git` in the working folder and the critic's read of the skill. Those would be "the dispatch's error", where §3.5 step 4 says stop with the block. Each case still ends in a loud stop after one re-send. An observation |
| §3.3 | `mode` (how the research ran) is split from `agents` (D0b's path); `searches:` is the run's total; the `[ · dossier: …]` slot | None |
| §3.9 | Yes, plainly: "cuts the research team, never the agents, the files or the map … 'Alone' means no researchers in waves, not no agents". The list of what it keeps is named once. The `lead (degraded)` escape hatch is gone ("what a full run has there" still covers the sequential path) | None |
| §4.9 | Yes: the dossier line names each run kind's files | **Yes: finding 2** |
| §8 | Item 2 carries the dossier line; a role played by the same model is a defect while its agent was listed | None |
| §9.1 | "write the single document, every stage of its run kept" | None |
| B6 | Each role's second line is `searches: <n>` (the five agents were regenerated; parity PASS) | B2's return still ends with `searches: <the greps and git queries that mattered>`, the same name. An observation |

### The live run (check 3)

**The run:** rv2a, Sonnet lead, `quick`, "how a French press brews coffee … (reader: someone using a French press for the first time)", in an empty scratch folder. This is a new general subject. The isolation is round 1's (`rehearsal/review/spend.md`, round 2).

**The headline held.** `check.py` passed these:

- `path: plugin`;
- the two haiku probes;
- `knowledge:verifier`, `model: opus`, run on `claude-opus-5-5`, twice (9 claims: 7 supported, 2 partial);
- `plan.md`, two findings files, `library.md`, two verify files, `gaps/final.md`, `trace.md`;
- `outline.md` opening `## Reader's task` (three tasks with deliverables), with the published source free of that heading;
- the publish went to :8871 only.

**Its first draft failed `knowledge check`** (`field-unknown`, `id-duplicate`) and passed after the fix.

**The two failed checks are F2's misses, routed and not findings:**

- `run.md` kept `searches: 1 (probe)` against 7 WebSearch calls, and `verifier: pending`;
- neither `run.md` nor the report carries a dossier line.

**New, as an observation:** `plan.md` was written after the first findings file and after the first verifier dispatch, with 3 questions and one angle. §3.4 asks for 8–20. F2's f2b3 wrote its plan first, but with 5. So the file is there, but on Sonnet "planned first" holds in form more than in substance. This goes with deferred-job candidate 1.

**Then the second run** (finding 1).

### The landing (check 4)

- **The strings.** `lede`: "It's a 2,608-line skill: …". `pane.meta`: "2,608 lines · yaml + markdown". `wc -l web/public/SKILL.md` gives 2608. Finding 2 of round 1 is fixed.
- **Instrument.** Aside was not reachable. I looked at F3's screenshot (`scratchpad/f3/skill-crop.png`): the faded lede reads "It's a 2,608-line skill". F3's curl of the scratch production build's HTML shows both strings.
- **F3's other `FEATURE_SKILL` lines, judged as observations:**
  - "the identical skill text ships for Codex under `.agents/`": true of the body. The frontmatter has differed since before P32.
  - "a byte-parity CI gate keeps it from ever forking": true (`skills_parity.py`, the web copy byte-identical).
  - "One markdown file … everything the agent needs, offline": still true of the file, which carries Part B and the converter.
  - The lede's description still fits.
  - None of these needs an edit; the wording is the operator's call.

### `## Doc impact` (check 5)

Finding 3 is fixed. The list now carries:

- finding 3's line (qa.md, operations.md: the AGENTS check);
- F2's product.md line (`quick` keeps the agents, the files and the map);
- F2's two architecture.md lines, the second superseding the D9 part of the first.

F3 changed copy, not durable truth, so it needs no line. P32.F4 will owe its own line (the wait rule, the repeat guard).

### Gate stages 3–5

- **The first-time walk** (stage 3), as a reader:
  - rv2a's chapter is 877 words. It opens on the reader's problem, gives a recipe table and a checklist of mistakes, and states its one gap (no verified water temperature) openly.
  - The report is short and clear.
  - Two things read wrong to a reader:
    - `run.md` still says `verifier: pending` after the run (a routed bookkeeping miss);
    - the session's unasked second run (finding 1).
  - The landing pane reads correctly.
- **The checklist** (stage 4): the boundary is now 14 files. `content.ts` feeds only the marketing landing, which has no line in the checklist. So the classification stands:
  - inside, 1: `python3 scripts/workflow.py validate`, re-run here, passes;
  - outside, 27.
  - The diff behind the classification is `phase-scope P32`: no `server/`, `cli/` or `web/src/` file except `content.ts`.
- **Operator questions** (stage 5):
  - OQ6 and OQ9 are open. They go into the walkthrough as one decision: rotate the token.
  - OQ1–OQ5, OQ7, OQ8, OQ10, OQ11 and OQ12 are resolved, and each collapsed line counts as routed.
  - This round raises no new question.

### The qa lines for round 3's pass

```
- [ ] `python3 scripts/skills_parity.py` and `python3 scripts/plugin_parity.py` PASS: the three explain-skill
      copies in body parity (the web copy byte-identical) and the five `plugin/agents/*.md` bodies equal to
      Part B (P32)
- [ ] A `quick` single document under `claude -p` (scratch `XDG_*`/`KB_*`, a scratch stack,
      `CLAUDE_CODE_PRINT_BG_WAIT_CEILING_MS=0`), on an Opus and on a Sonnet lead: `run.md` shows `path: plugin`;
      the dossier holds `plan.md`, `findings/`, `library.md`, a `verify/` file from `knowledge:verifier` on the
      other model, `gaps/final.md`, `outline.md` opening `## Reader's task` (absent from the published chapter)
      and `trace.md`; the session starts no second run after the report (P32)
- [ ] `/knowledge:explain <a subject> book` under `claude -p` in a folder that is not a workflow workspace:
      one document with every stage of its run kept, and the report carries the book suggestion; no phase or
      book is created (P32)
- [ ] The landing's skill pane: the line count in `web/src/content/marketing/content.ts` (`lede`, `pane.meta`)
      equals `wc -l web/public/SKILL.md` (P32)
```

### Draft walkthrough (for round 3, after P32.F4)

> **P32: explain researches first, verifies on another model, writes for the reader.** "accept" signs everything here.
>
> 1. **Release plugin 0.6.0.** Push `main` (`plugin/**`, version 0.6.0) and deploy the web, so `/SKILL.md` and the landing's line count ship together. Nothing has been pushed or deployed. Your word.
> 2. **Rotate the KB API token** (OQ6 + OQ9). Recommended:
>    - it sits in six old transcripts (two glide-ilab, one glide, one changple5, one knowledge subagent, one bootstrap);
>    - scrubbing them is unreliable, and rotating kills every copy;
>    - mint a new ingest key at knowledge.hi2vi.com, put it in `~/.config/knowledge-kb/config.json`, and revoke the old one.
> 3. **Run it once yourself, interactively,** on a small private subject:
>    - `/knowledge:explain <subject> quick`, then leave the session open 15 minutes after the report (F4's guard: no second run);
>    - `/knowledge:explain <a big subject> book` outside a workspace, to see §9.1's ask.
> 4. **Read one rehearsal pair** (OQ10): `rehearsal/r1/chapters/c-old.md` against `rehearsal/r1b/chapters/c-new-v2.md`.
> 5. **After the release, relay** `works/phases/active/P32/handoff.md` to the bootstrap.
>
> Decided as drawn:
>
> - The skill is 155.8 KB, about 11 KB over OQ5's ≈ 145 KB. F2 added 1.9 KB, within d71's ≈ 2 KB. The shrink is D70.
> - Sonnet leaves `run.md`'s search total and the dossier line unwritten. The files exist; only the bookkeeping is missing. A deferred job proposes a mechanical line.
> - Under `claude -p`, a background verifier batch is stopped at 10 idle minutes. This is a deferred job; interactive runs wait.
> - The landing's ticks and lede stay as written ("identical skill text" means the body).
> - `executors.toml`'s xhigh rows stay (d03).
> - `create-phase` gives a book's cost in words, not dollars (S10).
> - The README's wording nits stay.

### Deferred-job candidates (for the orchestrator to file)

D69–D71 are filed already.

1. **explain: a mechanical dossier and search-total line** (F2's candidate 1).
   - What: a tool the lead already runs prints the line. For example, `pagetext.py --dossier <DOSSIER> <run kind>` would list the missing files, total the `searches:` lines, and flag a `plan.md` older than nothing it plans or under §3.4's 8 questions.
   - Reason: three F2 runs and rv2a never wrote the line, and rv2a wrote its plan after the research.
   - Trigger: the next §4.9 or B12 change, or a report that hides a skipped stage.
2. **explain: verifier batches and waves in the foreground under `claude -p`** (F2's candidate 2).
   - Reason: in f2a3, `claude -p` stopped the background verifier 10 idle minutes after the lead's last turn.
   - Trigger: a headless run whose batch outlasts 10 minutes, or a harness that runs the skill headless.
3. **Landing: derive the skill pane's line count from the served file.**
   - How: `feature-skill.tsx` already reads the file with `fs.readFileSync`.
   - Reason: the literal goes stale at every SKILL.md edit (775 → 2,608 in F3, and F4 may move it).
   - Trigger: the next SKILL.md edit after F4 that changes its line count.
4. **explain: B2's return line `searches: <the greps and git queries>` shares its name with B6's second line `searches: <n>`.**
   - Trigger: the next Part B change, unless F4 takes it.
5. **explain: §3.2's folder clause** reads as making a code researcher's working-folder `git` and the critic's skill read "the dispatch's error".
   - Trigger: the next §3.2 change, unless F4 takes it.
6. **plugin README: the `quick` line** still says "the main session researches alone … with one verifier batch". That is F2's first-suspect wording, and it does not say the agents stay or that the verifier runs on another model.
   - Trigger: the next README change, unless F4 takes it.
7. **explain book: the outline gate's report runs about 3.7k characters, against the ≈ 2k stop rule** (round 1's candidate 2, not yet filed).
   - Trigger: the next bootstrap update that touches `explain-decomposition.md`.

### Observations (not findings)

- **Skill size.**
  - 155,790 B, against OQ5's accepted ≈ 125–145 KB, so about 11 KB (7%) over.
  - F2 added 1,857 B, within d71's ≈ 2 KB limit, which the operator set.
  - The shrink is out of scope (intent) and filed as D70.
  - Not a finding: the growth was operator-directed and is tracked.
- **Sonnet's bookkeeping.** `run.md` was left at `verifier: pending` with an empty `## Log`, as in f2b3. Routed with candidate 1.
- **Sonnet's plan** was written after the research, with 3 questions (above). Routed with candidate 1.
- **rv2a's research was thin.** It has 3 sources plus a maker's manual, after two roasters' guides returned 429. The gate passed with the water temperature (part of the must-cover recipe) declared as a stated gap. That is defensible under §3.8, since the item is answered apart from one stated figure.

## Round 1 (changes_requested, before P32.F2 and P32.F3)
- **status:** done
- **tier:** high
- **model:** opus
- **effort:** xhigh
- **review_verdict:** changes_requested. Three findings and two proposed fix slices, listed under *Findings* below:
  1. A Sonnet lead's `quick` run skipped the research stages while the plugin path was available. Fix: **P32.F2** (`fix`, risk `high`).
  2. The landing still says "775-line skill" for what is now a 2,585-line file. Fix: **P32.F3** (`fix`, risk `low`).
  3. `## Doc impact` does not mention the AGENTS parity check for qa.md and operations.md. Folded into **P32.F2**.
- **summary:**
  - Every guard passes, and so does a new negative test of the AGENTS parity check. The bootstrap package's anchors hold at bootstrap `97e1c38`, and nearly every Confirmed Intent bullet is delivered in the text.
  - Two live runs cost $4.23 of the $25 cap:
    - **Run b** (Opus, `quick`, HSTS) did everything the skill promises.
    - **Run a** (Sonnet, `quick`, a book request outside a workspace) handled §9.1 correctly. But it ran with no verifier agent, no plan, no outline or `## Reader's task`, and no trace, even though `knowledge:verifier` was dispatchable. That breaks the claims "verified on another model" and "quick cuts the research, never the map".
  - The landing still advertises the old skill's 775 lines.
- **files_changed:**
  - `works/phases/active/P32/slices/P32.REVIEW/result.md` (this file)
  - `works/phases/active/P32/rehearsal/review/spend.md`
  - `works/phases/active/P32/rehearsal/review/a/`: run.md, brief.md, ledger.md, report.md, chapter.md
  - `works/phases/active/P32/rehearsal/review/b/`: run.md, brief.md, outline.md, report.md, chapter.md, verify-r1-b1.md
  - `works/phases/active/P32/phase.md`: `## Notes for later slices` and `## Now`, via `phase-section`
- **validation:**
  - `python3 scripts/skills_parity.py`: PASS. The three skill copies are in body parity, the web copy is byte-identical, and the five agents match Part B.
  - Negative test of that guard on a scratch copy of the layout, never the repo (`scratchpad/review/negtest.py`):
    - baseline PASS;
    - one line added to `verifier.md`: FAIL ("plugin agents drifted");
    - Part B of the canonical copy edited alone: FAIL;
    - restored: PASS.
  - `python3 scripts/plugin_parity.py`: PASS.
  - `claude plugin validate plugin`: passed, with one warning (ICON_MISSING).
  - `python3 scripts/workflow.py validate`: passed. Its warnings were already there before this review: P22/P26 kinds, consolidation owed by P28/P30/P31, stale docs, oversized sections.
  - `phase-scope P32`: `fc5ff68..c6918f4`, 22 commits, 13 product files. Nothing under `server/` or `cli/` changed; in `web/`, only `web/public/SKILL.md`.
  - Bootstrap, read-only: 14 anchors, each found exactly once at `97e1c38` (v74) by `git show HEAD:<file> | grep -c -F`. `git status --short` was empty before and after; HEAD and branch are unchanged.
  - Live runs (gate stage 2): run a cost $0.86 and run b $3.37, total **$4.23 of $25**. Details are in `rehearsal/review/spend.md`.
  - Leak scans after each run, and over the kept folder: only the six known files hit, and the kept folder has 0 hits.
  - My scratch stack (PID 40332, :8851) is stopped, and the port is free.
  - What I did not re-run: earlier slices' paid rehearsals (S7, F1, S9). Their records were read. The two runs above replace them as this review's own check of the running product.
- **deviations:**
  1. **Run a was published.** The plan expected "nothing is created or published". Under `claude -p`, §9.1 never asks, by design ("asked only interactively, otherwise reported"; S6's Doc impact line), so the skill writes one document and reports the suggestion. I added `quick` to keep that document cheap. The suggestion part behaved as specified.
  2. **Run b did not go "through the critic".** `quick` skips the critic by the skill's design (the run card, §3.9, §4.10). I checked the critic's `reader` category in critiques already on disk instead:
     - `rehearsal/r1b`, G's v2 critique, C04 (`should-fix`, `reader`);
     - `rehearsal/r2`, the how-wal-works critique, C05 and C11.
  3. **The runs used the review's own copy of the harness.** It is S9's `rehearsal/r2/harness/`, copied to the scratch folder with its paths and token changed (`rv-token`, :8851). It was not run in place.
- **doc_versions:** none, deferred to a docs phase. On `changes_requested` the qa `## Regression Checklist` version is not written, because that is a pass-only step. The proposed lines are below, for the re-review. `## Operator Runtime` needs no version: the runtime did not change.
- **explain:** not written — run /explain for this phase
- **walkthrough:** none, because the verdict is `changes_requested`. A draft for the re-review is below, together with the routing of OQ6 and OQ9.
- **deferred-job candidates** (for the orchestrator to file; full list under *Deferred-job candidates*): the plugin's §1 placement for minted ids, plus four optional ones.

### Findings

#### 1. A Sonnet lead's `quick` run skipped the research stages while the plugin path was available → P32.F2

**What happened.** Run a: Sonnet lead, `/knowledge:explain a book on the history of the Roman Empire … quick`, in an empty scratch folder. The kept files are in `rehearsal/review/a/`.

At init, its tools included `Task`, and its agent types listed all five `knowledge:` roles. Even so, the run did the following:

- **Picked the wrong path.** It recorded `mode: sequential · agents: lead · path: sequential`. D0b's rule is "plugin: your agent types include the `knowledge:` roles".
- **Skipped D0b's two probe agents.** It made the probe calls itself.
- **Wrote no `plan.md`.** D1 runs in `quick` too (§3.9: "D0, D0b and D1 as above").
- **Skipped D2's files.** No `findings/`, no `library.md` (the ledger carries a one-line source list instead), no `verify/`, no `gaps/final.md`.
- **Wrote no `outline.md`, so no `## Reader's task`.** S9 made that binding for `quick`: "quick cuts the research, never the map".
- **Wrote no `trace.md`.** The intent requires one: "every claim in it traces back to a ledger entry".
- **Ran with no independent verifier.** It recorded `verifier: lead (degraded)`, though §3.9 names `knowledge:verifier` with `model: opus` for a Sonnet lead.
- **Matched quotes only approximately.** It recorded `quote-match: approximate`, read every page through WebFetch summaries, and saved no pages. Yet its own probe ran `curl ok, pagetext ok`.
- **Skipped §9.1's working-folder check.** It never read the workspace markers. The outcome was still right: one document written, the suggestion reported.
- **Miscounted searches.** It recorded `searches: 1`; the lead made four.

The report was honest about the degraded verification ("no second model checked the claims"). But it presents that as a limit of the run, not as a choice the run made.

**The same skill on Opus (run b, `rehearsal/review/b/`) did all of it:**

- `path: plugin`, with probes A and B on haiku;
- `plan.md` with 11 questions in two angles;
- two findings files, with 50/50 quotes found;
- `quote-match: exact (5/5)`;
- `knowledge:verifier` on `claude-sonnet-5-5`, 15 claims checked: 14 supported, 1 partial;
- `gaps/final.md`, and the gate passed;
- `outline.md` opening with `## Reader's task` (four tasks, each with a deliverable); the published chapter does not contain that heading;
- `trace.md`, then `knowledge check`: one quiz error found and fixed;
- published to :8851.

F1's `confirm2` (Sonnet, `quick`) did take the plugin path with an Opus verifier. So this failure comes and goes, and one bad run out of two Sonnet runs gives no rate. **The root cause is not located.**

- **First suspect:** the card's `quick` line, "you research alone into the same dossier" (§3.9: "research alone"). A model can read it as "no agents at all".
- **Second suspect:** the book-request branch of §9.1, which frames the run as a fallback.

**Why it is a finding, not an observation:**

- It breaks two headline claims of the phase, live:
  - intent: "Independently verified. A different model re-opens the sources";
  - S9's `quick` keeps D6, and the trace rule.
- Claude Code users often run on Sonnet.
- Plugin 0.6.0 is not released yet, so fixing it now costs one small slice and a few dollars of runs. After release it would cost a version.

**Proposed fix slice: P32.F2, kind `fix`, risk `high`.** The root cause is unlocated, and the fix is in the skill the high tier wrote (S5–S9, F1 all read `tier: high`). The slice would:

- **(a) Make the card's `quick` line and §3.9 explicit.** "Alone" means no research team. D0b's two probe agents, D1's `plan.md`, the findings files, the verifier agent on the other model, D6's `outline.md` with `## Reader's task`, and D7's `trace.md` all stay. The path follows D0b's rule, never the run kind.
- **(b) Add a dossier-completeness check before D9.** Each run kind lists the files it must have. Each must be present, or named in the report as a skipped stage with its reason. A verifier skipped while `knowledge:verifier` was listed then reads as a defect, not a limit.
- **(c) Count the lead's own queries in `searches:`.**
- **(d) Append the Doc impact line from finding 3.**

All three copies change together, through `skills_parity.py`.

**Validation:**

- both parity guards;
- two or three Sonnet-lead `quick` runs under this review's isolation, one of them repeating run a's prompt word for word, about $1–3 each;
- each run must show `path: plugin`, a verifier on Opus, and `plan.md`, `outline.md` (with `## Reader's task`) and `trace.md` present;
- a leak scan after each run.

#### 2. The landing says "775-line skill"; the file it serves is now 2,585 lines → P32.F3

`web/public/SKILL.md` is in the phase's boundary. It feeds the landing's skill pane: `feature-skill.tsx` reads it with `fs.readFileSync`.

The pane's copy in `web/src/content/marketing/content.ts` still says:

- the lede: "It's a 775-line skill: research the topic or the diff, write a native chapter …";
- `pane.meta`: "775 lines · yaml + markdown".

The file was 785 lines at `fc5ff68` and is **2,585 lines (153,933 B)** now.

No slice could fix this: DECOMP2's edit scope left out "the rest of `web/`". Once the operator deploys the new SKILL.md, the public page would carry a figure off by more than three times.

**Proposed fix slice: P32.F3, kind `fix`, risk `low`.** No high trigger: two copy strings in one file. The edit scope needs widening to `web/src/content/marketing/content.ts` only. Two options for the slice:

- correct the two figures; or
- drop the number. A figure derived from the file is the alternative; the slice's plan picks one.

To check it, look at the landing's skill pane in the `## Operator Runtime`'s runtime, with Aside's agent profile.

If the orchestrator would rather not widen the phase, file it as a deferred job with the trigger "before the web deploy that ships the new `/SKILL.md`".

#### 3. `## Doc impact` is incomplete on the parity guard → folded into P32.F2

S4 added `skills_parity.py`'s AGENTS (FAIL) check and `--write-agents`. Only `architecture.md` notes it. Two docs still describe what the guard checks, and neither is named:

- `qa.md`: the three-copy parity gate (P20's acceptance) and *Known Fragile Areas*;
- `operations.md`: "plugin-ci.yml runs two drift gates … the two shipped explain-skill copy bodies".

A docs phase working from the list would leave both stale. The line to append (P32.F2, or the orchestrator):

`- qa.md, operations.md: skills_parity.py also checks the five plugin/agents/*.md bodies against the skill's Part B (AGENTS, FAIL; --write-agents regenerates them), so the parity gate and plugin-ci's drift-gate descriptions name four things, not two copies (P32.S4)`

### Review against intent.md (one line per Confirmed Intent bullet)

| Intent bullet | Verdict | Where |
|---|---|---|
| Planned first: questions, angles that do not overlap | Delivered (text); run a skipped it (finding 1) | §3.4 D1; run b `plan.md`, 11 Q, 2 angles |
| Wide, then deep, in parallel; the general and codebase angle sets | Delivered | §3.4–3.5, B1/B2, B10; rehearsals r1b and r2 (whole-book research, $51.07) |
| Held to source quality: primary first, a blog only points, every page opened and quoted, publisher/date/version | Delivered | B7 ladder, B11 exact text (curl + `pagetext.py`), B9 library; run b exact 5/5 |
| Kept as a dossier: library + ledger, load-bearing support bar, disagreements recorded | Delivered | B9, §3.6 D3; run b |
| Independently verified, on a different model, plus counter-evidence | Delivered (text), **partly in practice** (finding 1) | B4, §3.6 D3v, §3.8 D5; run b on Sonnet; run a none |
| Gap rounds, with a cap, and a run that hits it says so | Delivered | §3.7 D4 (≤ 3, `capped: rounds`), B3; r1b/r2 logs |
| Loud when it fails, never a thinner chapter | Delivered | the card's *Stops when* column, D0b FAILED blocks, D5g, `no-research` never a fallback (§1, §3.9) |
| More thorough must not mean harder to use | Delivered, as accepted | §3.10 the reader's path, §4 prose rules and budgets (d57/d58 match), B5 `reader`; r1b scorecard: new wins Helpfulness, Comprehensiveness, Insight; Readability lost on length, accepted (OQ10), not re-litigated |
| Written only from the dossier; every claim traces to the ledger; the critic checks ledger and coverage | Delivered (text); run a wrote no `trace.md` (finding 1) | §4 D7 `trace.md`, the quiz only on supported claims; B5 rubric; r1b/r2 critiques |
| The single document runs the team and the critic by default; `quick` opts out | Delivered | §1, the card |
| Book: research for the whole book first, a top-up per chapter, a research summary at the outline signature | Delivered | §9.2, §9.3; package `explain-decomposition.md`, `explain-chapter.md`; r2 (research, then the gate at $0.54, chapter 1 to its critique) |
| English by default everywhere; Korean only when asked | Delivered | §1 `LANG=en`, `lang=<xx>`; both runs `lang: en` |
| A book starts from a suggestion, created on a yes, stops; outside a workspace offers one document | Delivered; the no-workspace branch live in run a; the interactive ask not run live | §9.1; package `explain-route.md` |
| `no-research` stays, operator-only, labelled; failed research still stops | Delivered | §1, §3.9; S6's run |
| Agents ship in the plugin; the bootstrap drops its own critic | Delivered | `plugin/agents/` (5, guarded and negative-tested here); PATCHES 6 retires `explain-critic.md` (anchors 6b, 7a found) |
| Prepared in this repo; the bootstrap never edited | Delivered | bootstrap clean, HEAD unchanged |
| Out of scope stays out | Yes | no `server/` or `cli/` change; D67 deferred; no shrink |

### The live runs (gate stages 2 and 3)

The isolation matches S7/F1/S9:

- scratch `XDG_CONFIG_HOME`, `XDG_STATE_HOME`, `KB_ROOT`, `KB_API_BASE_URL` and `KB_API_TOKEN=rv-token`, each checked with §2's resolver first (both `ok`);
- `--setting-sources project`, `--plugin-dir plugin`, `--permission-mode manual --permission-prompts none`, `--no-session-persistence`;
- the §3.2 allow rules, plus a deny on `//Users/sugang/.config/knowledge-kb/**`;
- Claude Code 2.1.309;
- `watchdog2.py` at $6 for a and $14 for b, and no `--max-budget-usd`;
- no permission-skipping flag;
- a scratch stack on :8851 (legacy mode, no Gemini key, not a git repo, so both publishes report `committed=false`).

The instrument was the headless Claude Code CLI. The product is a plugin skill, so no browser was used. I did not view the landing page in a browser: finding 2 was read from the source.

- **Run a** (Sonnet, $0.86, 40 turns): §9.1's no-workspace branch worked in outcome: one overview document published, and the report carries "a real book would need a workflow workspace (the agentic workspace bootstrap) …". The stages it skipped are finding 1.
- **Run b** (Opus, $3.37, 64 turns): everything the skill claims for `quick`, listed under finding 1.
  - The `python3 -c` the lead improvised was correctly denied, and it used Edit instead.
  - This host's `claude -p` has no Grep tool. S7's fallback, `grep -n` via Bash, worked.
- **Gate stage 3, first-time-user walk** (looked at as a reader, not against the design record):
  - Run b's report is clear and short, and its chapter opens on the reader's problem.
  - Run a's report shows the problem behind finding 1: "no second model checked the claims" reads as a limit of the tool, when the agent was there to use.
  - The landing pane's "775 lines" is finding 2.
  - Nothing else read as dead or confusing.

### Package and handoff, read cold

I read `handoff.md`, `package/README.md`, `PATCHES.md` and the three files under `package/claude/` in that order.

**Anchors.** 14 anchors, each found exactly once at `97e1c38`:

- PATCHES 1a, 1b, 1c, 4a, 4b, 4c, 4d, 5a, 5b, 6b, 6d, 6f, 7a;
- the README's `wave.md` quote.

The new field `must-cover` counts 0, as it should before the patch.

**What is consistent:**

- The package cites the skill by section and does not restate it.
- The handoff's numbers match `rehearsal/r2/spend.md`: $51.07, ≈ $48.3, ≈ $101.4, ≈ $350–400, 83 + 13 searches.
- There is no contradiction with P31's `handoff-explain.md` beyond what P32 supersedes.

**Wording nits (observations):**

- The README says "P32's tests ran on 2.1.283 and later". The handoff's two facts are the accurate ones: 2.1.283 is when auto mode became the interactive default, and 2.1.309 is the version the runs used.
- The README says `create-phase` gives "the order of magnitude", but the route gives words only. This is S10's known note.
- The handoff says it "supersedes none of P31's handoff except the plugin minimum". P32 also retires P31's bootstrap critic, which the handoff states elsewhere.

### The `## Regression Checklist` and the boundary (gate stage 4)

`## Regression Checklist` in `docs/current/qa.md` has 28 lines. The boundary is the 13 files `phase-scope P32` prints:

- the three skill copies;
- the five agents;
- `plugin.json` and `plugin/README.md`;
- `scripts/skills_parity.py`;
- `executors.toml` and `.claude/agents/slice-executor-high.md` (d03's xhigh rows).

| Classification | Count | Lines |
|---|---|---|
| Inside | 1 | `python3 scripts/workflow.py validate` (it reads `executors.toml` and the agent files): re-run, passes |
| Outside | 27 | the site build, `site_smoke.py`, the `explain:recent` marker, graph, project, document, print, console, reader, quiz, deep-link, library, resume, annotations, review, visibility, text size, reader chrome, Next, and P31's `knowledge check` |

**Why the 27 are outside.** Their surfaces are the server, the web app, the KB build and the CLI. None of the 13 files feeds them: the range touches no `server/`, `cli/` or `web/src/` file. `web/public/SKILL.md` feeds only the landing's skill pane, which has no checklist line (finding 2).

**Seen in passing.** Both runs had `knowledge check` reject a draft (`line N: [code]`, exit 1) and then pass it after the lead's fix. That is consistent with P31's line, but it is not a re-check of it.

**Lines proposed for the re-review's pass** (the qa version is written only on a pass):

```
- [ ] `python3 scripts/skills_parity.py` and `python3 scripts/plugin_parity.py` PASS: the three explain-skill
      copies in body parity (the web copy byte-identical) and the five `plugin/agents/*.md` bodies equal to
      Part B (P32)
- [ ] A `quick` single document under `claude -p` (scratch `XDG_*`/`KB_*`, a scratch stack), on an Opus and
      on a Sonnet lead: `run.md` shows `path: plugin` and a verifier on another model; `outline.md` opens
      with `## Reader's task`, which the published chapter does not contain; `trace.md` exists (P32)
- [ ] `/knowledge:explain <a subject> book` under `claude -p` in a folder that is not a workflow workspace:
      one document, and the report carries the book suggestion; no phase or book is created (P32)
```

### Operator Questions (gate stage 5)

- **OQ6 and OQ9 are open.** Both are about the KB API token found in transcripts. They go into the walkthrough as one decision: rotate the token. Recommended, for these reasons:
  - The token is in six transcripts that predate this review.
  - Scrubbing old transcripts is not reliable.
  - Rotating makes every copy dead at once.
- **Every other entry (OQ1–OQ5, OQ7, OQ8, OQ10, OQ11) is resolved.** Each collapsed line counts as routed.
- **This review raises no new operator question.** Whether to widen the edit scope for P32.F3 is the orchestrator's call.

### Draft walkthrough (for the re-review, after P32.F2 and P32.F3)

> **P32: explain researches first, verifies on another model, writes for the reader.** "accept" signs everything here.
>
> 1. **Release plugin 0.6.0**: push `main` (`plugin/**`, version 0.6.0) and deploy the web so `/SKILL.md` serves the new skill. Nothing has been pushed or deployed. Your word.
> 2. **Rotate the KB API token** (OQ6 + OQ9). Recommended: it sits in six old transcripts (two glide-ilab, one glide, one changple5, one knowledge subagent, one bootstrap); scrubbing them is unreliable, and rotation kills every copy. Mint a new ingest key at knowledge.hi2vi.com, put it in `~/.config/knowledge-kb/config.json`, revoke the old one.
> 3. **Run it once yourself, interactively**, in auto mode, on a small private subject: `/knowledge:explain <subject> quick`, then `/knowledge:explain <a big subject> book` outside a workspace to see §9.1's ask (the permission posture and the ask executors cannot test).
> 4. **Read one rehearsal pair** (OQ10's readability check): `rehearsal/r1/chapters/c-old.md` against `rehearsal/r1b/chapters/c-new-v2.md`.
> 5. **After the release, relay** `works/phases/active/P32/handoff.md` to the bootstrap.
>
> Decided as drawn:
>
> - The skill is 153.9 KB, about 9 KB over OQ5's ≈ 145, from F1's and S9's fixes; the shrink stays out of scope.
> - `executors.toml`'s research and high rows stay at `xhigh` (d03) until you say revert.
> - `create-phase`'s route gives a book's cost in words, not dollars (S10).
> - The README's minimum and "order of magnitude" wording.

### Observations (not findings)

- **Skill size.** 153,933 B in each copy (`.agents` 153,307 B), against OQ5's accepted ≈ 125–145 KB. That is about 9 KB (6%) over, up from 46,504 B at `fc5ff68`. The growth is tracked in d51/d53/d60 and comes from operator-directed fixes: F1's reader-first rules, and S9's `quick` keeps D6 plus the by-path lead lines. Shrinking the skill is out of scope (intent), so this goes in the decided-as-drawn list.
- **Bookkeeping in run b.** `run.md` says `searches: 0` while the report says `searches: 1 (probe)`, and `caps: prompt-only` is recorded on the plugin path. Both are defensible under §3.3's definitions for a lead researching alone; F2(c) tidies the count.
- **`.claude/agents/slice-executor-high.md` and `executors.toml`** changed in this range: d03's `xhigh` rows. Decided as drawn: they stay until the operator says otherwise.

### Deferred-job candidates (for the orchestrator to file)

1. **explain: teach the plugin's §1 placement minted phase ids (`P-7kq2`).**
   - Reason: §1 counts numbered phases. The bootstrap's route suggests the slug from the id, and the operator confirms it (handoff known limits, README *Known limits*).
   - Trigger: the bootstrap applies the package and makes a book on a minted id, or the next §1 change.
2. **(Optional) explain book: the outline gate's report runs about 3.7k characters, against the ≈ 2k stop rule.**
   - Reason: rehearsal 2's gate (S9); the fix is in the bootstrap's reference, listed in the handoff.
   - Trigger: the next bootstrap update that touches `explain-decomposition.md`.
3. **(Optional, if P32.F3 is not taken in-phase) Landing: the skill pane's line count.**
   - Reason: finding 2.
   - Trigger: before the web deploy that ships the new `/SKILL.md`.
4. **(Optional) Out-of-scope items from the intent, not yet filed:**
   - explain: move the publish plumbing into the CLI and shrink the skill (trigger: the next plugin change to the publish step, or the skill passing about 160 KB);
   - server-side draft state for books and chapters (trigger: the operator asks, or a book rehearsal needs a draft the server holds).
   - D67 (cross-vendor verifier) and D68 (the claude.ai upload) are already filed.
