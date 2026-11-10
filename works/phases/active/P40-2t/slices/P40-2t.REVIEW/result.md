# P40-2t.REVIEW — result (round 2)

## Verdict

- **status:** done
- **route:** high
- **model:** opus
- **effort:** xhigh
- **round:** 2 (round 1: `changes_requested`, F1 and F2; its result is in this file's git history and the phase's Decisions)
- **review_verdict:** pass
- **summary:** Round 2 checked both fixes against their full case lists, their blast radius and the whole validation suite. F1 now offers "research first" whenever the records lack what the reader needs, always honoured on the operator's word. Re-traced through the texts, cases 5–9 pass, and P59-d8's covered-plus-basics shape runs end to end. F2's critic read, `git -C <draft folder> show HEAD:./<file>`, reads committed chapters in a fresh nested scratch pair, where the old form misses. The whole suite is green: parity, pytest, the web gate and a scratch build, finds, apply, the patched smoke suite with 504 PASS, cites and validate. In Claude in Chrome, a scratch production build serves `/SKILL.md` byte-identical to the 0.11.0 skill, and the landing reads 2,722. There is no repeat failure and no new finding.
- **findings:** none. Round 1's F1 and F2 both hold (no `repeat of round 1 finding`).
- **files_changed:**
  - `works/phases/active/P40-2t/slices/P40-2t.REVIEW/result.md` (rewritten for round 2);
  - `works/phases/active/P40-2t/phase.md`, through `phase-section` only: seven gate-section notes appended to `## Doc impact`; the five REVIEW-only `## Notes for later slices` entries this round consumed removed (R1 ×3, S3, REVIEW); `## Now` replaced.
  - No source, package, doc or other-repo file was touched.
  - Scratch only, under `<scratchpad>/r2/`: a fresh `fdb1151` copy, patched and rebuilt; a nested git proof pair; a patched scratch install; a scratch web build; the note drafts.
- **validation:**
  - `python3 scripts/skills_parity.py`: PASS (the web copy is byte-identical; the plugin agent matches Part B). `python3 scripts/plugin_parity.py`: PASS.
  - `uv run pytest -q`: 183 passed, 60 skipped, rc 0. This includes `tests/test_explain_resolver.py`.
  - `pnpm --dir web typecheck`: rc 0. `lint`: rc 0. `test`: 41 files, 589 tests, rc 0.
  - Build: `pnpm exec next build` in a scratch clone of `web/` (no `.next`, P37-1p's recipe): rc 0.
  - `package/checks/finds.py <bootstrap> fdb1151`: `finds checked=33 not-exactly-once=0`. The bootstrap is still at `fdb1151` and clean.
  - `package/checks/apply.py` on a fresh `git archive` of `fdb1151`: `applied finds=33`; smoke explain block L211–316 passed; caps 12,285 / 8,185 / 8,180 B; other pins passed; skill count 21; create-phase core 53,667 B.
  - On that copy: `python3 installer/build.py` and `--check`: OK. `bash tests/retrofit_smoke.sh` alone, the whole patched suite: **504 PASS, 0 FAIL**, `ALL RETROFIT SMOKE TESTS PASSED`, rc 0.
  - `package/checks/cites.py plugin/skills/explain/SKILL.md`:
    - over the package's five texts and four patch files: `citations checked=120 bold parts checked=19 missing=0`;
    - over the patched copy's 64 `payload/claude/**/*.md` plus the seed operations doc: `checked=126 bold parts checked=19 missing=0`.
  - P33-n3's citation check (checklist line 37) on a fresh patched install: `citations checked=231 missing=0`.
  - `python3 scripts/workflow.py validate`: "Workflow validation passed". Its warnings were already there: the Decisions long entries 14 and 16, consolidation debt, stale docs, oversized doc sections. No dangling pointer.
- **deviations:**
  1. The checklist's `claude -p --plugin-dir plugin` front-door lines (28, 29, 33, 34, 35, 54) were **not run**, as in round 1. Plugin 0.11.0 refuses every workspace that exists today, and a headless model session is spend the plan forbids. The readiness half was re-walked on a fresh patched install (§ Checklist). D94-cp should be retargeted to v96 (deferred job 2).
  2. Round 1 counted the outside lines as "44". The correct count is 40: lines 1–3, 5–26, 30, 38–43, 45 and 47–53. Corrected below.
- **doc_impact_added:** none to the durable-truth list, which is complete: F1 and F2 had each appended theirs, and the eight slices are covered (§ Doc impact). The gate-section notes are appended separately, below.
- **gate-section notes appended** (`## Doc impact`, tagged `(gate section — written at merge)`), all `qa.md` *## Regression Checklist*:
  - the v94 front-door line, replaced by a v96 one;
  - two version edits, to the headless line and the refusals line;
  - five new lines: a subject with no code; covered but lacking; chained; `/SKILL.md` and the landing count; the critic's nested sibling read.
  - `## Operator Runtime`: no change.
- **doc_versions:** none — deferred to post-merge consolidation (parallel mode)
- **walkthrough:** § Walkthrough (below), verbatim for `accept-gate --open`.
- **deferred-job candidates:** four (§ Deferred-job candidates): the server grammar deploy; D94-cp retargeted to v96; an on-disk trigger for the chained explain; retire checklist line 30. Plus one observation: D77's trigger fires with this package.
- **explain:** not written — run /knowledge:explain P40-2t for a document, or ask it for a book
- **team-rules check:** n/a (at-root install: the contract's Commit Convention is the only one).
- **instrument:** Claude in Chrome.
  - `list_connected_browsers`, then `select_browser` on `c14e5b18-f250-45f1-b92e-4a08a31197b5` (the one entry, matched by deviceId), then my own tab. That tab, and the empty group tab the context call opened, were closed at the end.
  - The scratch standalone build was served on `:3993` and stopped (`kill`, port free afterwards). `:3030` was never touched (PID 8452 still listening).

## Fix F1 against its case list (re-traced, not taken on the executor's word)

Sources: the plugin skill (`plugin/skills/explain/SKILL.md`), the package's `explain-route.md` (ER) and `research-route.md` (RR), and create-phase step 2 as applied to the fresh patched copy.

| # | Case | Result | What I traced |
|---|---|---|---|
| 1–4 | Uncovered code; uncovered code plus basics; no-code subject with no research; no-code subject covered | pass | Unchanged paths. **None covers it** still holds the uncovered case and its "yes from the code alone". MODE's subject case still offers only "research first" with no research phase, and goes on with one. |
| 5 | Code phases cover, but the reader needs outside basics no covering record states (P58-pm → P59-d8) | pass | **The offer.** Step 6 now ends with "Then check **what the records lack**": one Grep over the covering phases' `intent.md`, `phase.md` and `topics/`. COVERAGE's new **Covered, but the records lack what the reader needs** names the trading-rule-plus-quant case. Step 7's third template keeps `Built by:` naming the phases, names what is lacking, and offers "research first" (`sources:` the web) beside "yes". **The hand-off:** step 8, "**On "research first"**, whatever the coverage". **Create-phase** step 2, applied: "or phases cover it but none of their records states what the reader needs … A covered subject's block is accepted like any other". **RR** opening: the three cases. **The chain:** RR **When it passes**, `P<N>` "beside any phase that covers the code". **The redraw:** step 5's `from=` paragraph, "The coverage still runs over the subject's paths, so a covered subject keeps the phases that built its code on `phases:` … stays kind `codebase`". The redraw's own lack check now Greps the research phase's `topics/` too, so the findings count. **The book:** `explain-decomposition.md` L34 keeps `codebase` "even where it leans on outside basics a research phase recorded". ER *A confirmed proposal* checks "that research phase among its `phases:`". |
| 6 | A covered subject, and the operator replies "research first" or asks in their own words | pass | Step 8: "Anything but a literal yes, a changed line, a picked shape or a "research first" (below) creates nothing", and "**On "research first"**, whatever the coverage: offered or not … never a reply that creates nothing … A confirmation that offered no research has no block yet: fill it now by COVERAGE's rules". COVERAGE **Research first** is "**always honoured**". Step 7's opener "You asked for the research first: …" covers a request that asked, as the upbit operator's words did. Create-phase step 2: "honoured whenever the operator asks for it, whatever the coverage". |
| 7 | Cases 5–6 through the explain route's own confirmation | pass | ER step 1 drafts by the front door's "steps 4–6", which now include the lack check. ER's **When the records lack what the reader needs,** lists the three cases. ER's *A "research first" reply* covers "the front door's, or this route's own confirmation's … whatever the coverage, offered or not", and fills the block first when the route offered none. |
| 8 | A v2 of a covered subject that asks for outside material | pass | COVERAGE: "A v2 that asks for outside material is this case too; its research phase is then one of the phases since (§3.4 *A v2*)". §3.4 *A v2* step 2 reads the covering phases the prior did not read. The citation "(§3.4, step 6)" points at D1's step 6, **The gaps**: correct. |
| 9 | The research route and create-phase step 2 accept a covered subject's block | pass | Applied step 2 (L35 of the patched copy) says so word for word. RR **paths**: "A subject that phases already cover still names its code here". RR **sources**: "usually `web` …, plus `code` when the operator wants its code read again". Nothing in RR's steps or its `DECOMP` cut gates on coverage. |
| 10 | Every prose description agrees | pass | `git grep -i "when no phase covers"` over the repo finds only the skill's step-7 bold (its opening kept, now listing all three triggers), P39-hk's archived-era package and the phase's own logs. These all carry the new rule: the plugin README; the root README; setup; the KB template; `plugin.json`; `marketplace.json`; the skill frontmatter and intro; the package README; ER; RR; patch 1c and 1e's *Why*; `release.md` §2, §3 and §5. The last three are confirmed in the patched copy's `README.en.md` L553, seed `operations.md` L60 and `changelog.d/explain-research-chained.md`. |
| 11 | Readiness test, `**sources**`, the 44 headings, the citations | pass | All checks above are green. The readiness test text is unchanged, and the browser shows it (`**96 or later**`, the `sources` field). |

**The two renamed package bold openings** (ER **When the records lack what the reader needs,**, RR **When the records lack what its reader needs**) are cited nowhere:
- no smoke pin, `apply.py` assert or cites target names them (apply and the suite pass);
- the plugin keeps its own bold **When no phase covers the subject** (opening unchanged), which nothing in the package cites.

The only old-name mention left is `topics/change-list.md` B3, a historical row of the pinned change list, not shipped text.

## Fix F2 against its case list

- **Case 3, re-run by me** (nested, one at a time): a fresh pair under `<scratchpad>/r2/f2/`:
  - `host/` is a git repo with `/workflow/` in `.git/info/exclude` (`git status --ignored` shows `!! workflow/`);
  - `host/workflow/` is its own repo, with `ch1.md` and `ch2.md` committed and `ch3.md` (the draft) untracked.

  From the host root:

  | Command | Result |
  |---|---|
  | Old form: `git show HEAD:workflow/works/phases/active/P1/book/ch1.md` | `fatal: path '…/ch1.md' exists on disk, but not in 'HEAD'`, rc 128: the defect |
  | New form: `git -C workflow/works/phases/active/P1/book show HEAD:./ch1.md` | ch1, rc 0 |
  | The same for `./ch2.md` | ch2, rc 0 |
  | The same for `./ch3.md` | `fatal … not in 'HEAD'`, rc 128: judged by the outline, as the text says |

  The session refuses a bare relative `-C` after a `cd`, so the host root came first as `git -C <host>`. Git resolves the second, relative `-C` against it, exactly as the critic's working folder would.
- **Cases 1, 2, 2b, 4, 5 and 6:** F2's `result.md` evidence, checked against the texts:
  - B5 *Inputs* item 7 says "only as committed, never from the working folder (no Read or Grep of it there)" and gives the one command;
  - *Your rules* allows `-C` only in item 7's form;
  - §3.2 lists `"Bash(git -C <BOOK> show HEAD:./*)"`, with `<BOOK>` defined as relative;
  - the regenerated `plugin/agents/explain-critic.md` carries both (parity PASS);
  - `explain-chapter.md` restates "nothing changes there … in both layouts";
  - `explain-decomposition.md` *Say what the run needs* names the rule for a book;
  - `explain-review.md`'s freeze check is unchanged (`git -C workflow …`).

## Blast radius (everything the two fixes touched)

- **Skill and copies:** 2,722 lines. `web/public/SKILL.md` is byte-identical (sha256 `2f7c4375…`, the same as the served file). The `.agents` copy (2,720 lines) carries the plugin's new `description:` and body. The critic agent was regenerated.
- **Package:**
  - the two create-phase routes: above;
  - `explain-chapter.md` and `explain-decomposition.md`: F2's lines only;
  - `patches/create-phase.md`: 1c's *Becomes* and title, and 1e's *Why*;
  - `patches/release.md` §2, §3 and §5: the same rule in three places;
  - `PATCHES.md`: now correct, since `finds.py`'s list shows only `tests/retrofit_smoke.sh` across two patch files;
  - `README.md`: the trigger bullet and the 53,667 B core, which equals `apply.py`'s print.
- **Prose and manifests:**
  - the plugin README, including the permission line F2 handed to F1;
  - the root README, setup, the KB template, `plugin.json` and `marketplace.json`.

  All carry the same rule. None says "a subject no phase covers" as the only case.
- **`content.ts`:** only the two counts moved (2,665 → 2,722). The lede is OQ2's.
- **Round 1's minor items:**
  - fixed: the `unit` sentence in ER and `PATCHES.md`'s two-files line;
  - still a deferred-job candidate: the chained explain's on-disk trigger.
- **Reused from round 1, untouched by either fix:**
  - the S2–S4 package parts;
  - the wave and engine probes (`parallel-plan` rounds, `finish-slice` on a declared explain `DECOMP`, the outline-gate stop holding every chapter);
  - the `## Explain` hazard probe (a quoted proposal is not an explain phase);
  - S3's extra `wave.md` finds and its `&&` gate line;
  - resume from disk;
  - the subject-1 (no-code) trace.

## The route, end to end, for the covered-plus-basics case ("rule v2 + quant basics", at root as arb_upbit_1 is)

1. **The front door.** MODE is topic: "an idea the code relies on" when the request is about this code. Readiness needs v96 plus `**sources**`. Step 5's coverage finds the rule-v2 phases.
2. **Step 6** drafts the book's chapters. The lack check Greps the covering records for the quant terms and finds none.
3. **Step 7** shows `Built by:` with those phases and the third template: what is lacking, then "research first" (`sources:` the web) or "yes". The book's stops line says the research runs first.
4. **"Research first"**, offered or typed, goes to step 8, which hands create-phase the request, a block (`paths:` the rule-v2 code; `sources: web`; `question:` the lacking parts; `then:` the book for its reader) and the proposal.
5. **Create-phase.** Step 2 sends it to *The research route*, whose one confirmation names the web sources. On the yes:
   - `new-phase`;
   - `intent.md`, with the proposal as a `> ` blockquote, so the hazard holds;
   - the intake commit;
   - a run in `auto` on the default stream.
6. **The research phase.** `DECOMP` cuts the `research` slices under the web rules (a source beside each fact, `unsourced:` lines). The review re-opens at least 2 sources per topic. The gate is waived.
7. **The pass.** The review's pass leads, through the `review.md` chain line, to **When it passes**: `/knowledge:explain <subject> from=<P>`.
8. **The redraw.** The research phase is covering. The coverage still finds the rule-v2 phases, so `phases:` names both and the kind stays `codebase`. `Why:` says what changed. The redraw waits for the literal yes.
9. **Create-phase's explain route** takes it as *A confirmed proposal*, with the research phase among `phases:`. It creates the explain phase, starts its worktree, and runs it in `auto`.
10. **The book `DECOMP`.** D1 holds the code, the records, and the research findings with their `source:`. The outline pins recap lines, names, examples and link ids. The chapters are declared.
11. **The outline gate**, then **the wave**: at most 4 chapters at once, the synthesis chapter last.
12. **The critic** reads committed siblings by F2's command.
13. **The review** runs its consistency pass, then publishes with `--book-kind codebase`.

Nothing breaks.

**The six confirmed points:**

1. **Its own research phase:** holds, now for the covered case too.
2. **Records-only, a no-code subject accepted:** holds.
3. **One request runs both:** holds for every case, including an unoffered "research first".
4. **Checks stay, and a real book:** holds in the text. The live test is P59-d8's publish (below).
5. **Chapters at once:** holds in both layouts.
6. **Checked against P59-d8:** its whole-book review found exactly the class this phase's pinned recap lines and consistency pass target. Chapters 1 and 7 said "judged on G and D", while chapters 6 and 8 teach G alone. That supports the direction.

## Gate stages

1. **The manifest:** `## Operator Runtime` is filled. The deviceId matched the one connected browser and was selected before any other browser tool.
2. **Spot-check** (scratch standalone build of this branch, P37-1p's recipe, `:3993`):
   - `curl /SKILL.md`: 200, `text/markdown; charset=UTF-8`, sha256 equal to `plugin/skills/explain/SKILL.md` and `web/public/SKILL.md`.
   - In the browser, `/SKILL.md` shows:
     - the readiness test (`**96 or later**`, "they need v96 or later");
     - `[from=P<N>]`, "whenever the records lack what the reader needs" and **Covered, but the records lack what the reader needs**;
     - "It is **always honoured**";
     - item 7's `git -C <the draft's folder> show HEAD:./<its file>` and the `<BOOK>` permission line;
     - no "v94".
   - The landing `/`:
     - the lede reads "2,722-line skill" and the pane "2,722 lines · yaml"; "2,665" appears nowhere;
     - "read the whole skill ↓" opens the whole file (2,723 lines with the end newline), holding the new **Covered** paragraph, item 7's read and B12;
     - `scrollWidth` equals `innerWidth` (1728);
     - after a reload, the console has no messages.
3. **Fresh eyes** (the landing's skill band, the pane head, `/SKILL.md`): the pane's "showing the head" now shows the longer description with the new trigger, still complete and readable. The one thing that reads oddly for a subject book is OQ2's "cite every line to the code". Nothing is dead or broken.
4. **Checklist:** the table below.
5. **Questions:**
   - OQ1 is resolved (→ DECOMP2's gate).
   - OQ2 is routed into the walkthrough as decision 1, with the recommendation.
   - No other entry.

### Checklist, classified (`phase-scope P40-2t`: the same 11 files; F1 and F2 added none)

The changed files feed four surfaces:
- the explain plugin: the skill, its copies, the critic, the metadata, setup and the READMEs;
- `/SKILL.md`, through `web/public`;
- the KB template (template-only files, rendered at a user's scaffold, never this repo's site);
- the landing `/`: `content.ts` reaches only the `(marketing)` route group.

| Lines (block order) | Surface | In/out | Result (round 2) |
|---|---|---|---|
| 4 `validate` | workspace | in | pass |
| 27 parity | plugin | in | pass |
| 32 landing count = `wc -l` | `/` | in | pass: live 2,722 ×2, and 2,722 = `wc -l` |
| 36 KB key | plugin | in | pytest half pass. The headless-log half needs `claude -p`: not run |
| 37 P33-n3 citation check | plugin | in | pass: 231/0 on a fresh patched install. This repo's vendored v89 `.claude/` stays 200/85 until `/update-workspace` (pre-existing, round 1) |
| 31 refusals | plugin | in | **Stale text; behaviour hand-walked:** a fresh patched install stamped v95 is refused as too old (the release stamps 96). The rest is reused from round 1: no workspace → refused naming v96; `fdb1151` → too old; stamped 96 → ready. The rewrite is a gate-section note |
| 44 landing: no graph, bands alternate | `/` | in | reused from round 1: pass at 390, 820, 1024 and 1440 via the proxy harness. F1 changed only two numbers in `content.ts`; at 1728, `scrollWidth` equals width |
| 46 graph API gone, template graph kept | template | in | template half pass: `graph_hook.py`, `graph.md` and `graph.js` ship, and the `mkdocs.yml` hook is at L63. The API half was not re-run: `server/` is untouched |
| 28, 29, 33, 34, 35, 54 | plugin under `claude -p` | in | **not run** (deviation 1). Lines 28, 31 and 54 get gate-section rewrites. Lines 28 and 33–35 also still describe the pre-0.10.0 front door (`quick`, `run: full`, research agents, the cost table, a seventeen-line block): that staleness is P39-hk's, folded into deferred job 2 |
| 30 the verifier's same-model guard | `plugin/agents` verifier | out | no verifier ships (`plugin/agents/` holds only `explain-critic.md`): deferred job 4 |
| 1–3, 5–26, 38–43, 45, 47–53 | docs site, reader, console, CLI, server, publish | out (39 lines) | not re-run. No changed file feeds them: `server/`, `cli/`, `web/src/app/(app)`, the reader and this repo's `docs/` are untouched, and the KB template's changed file is template-only (`plugin/templates/manifest.json`) |

That is 54 lines: 14 inside, 40 outside (39 + line 30). The proof is `phase-scope`'s 11-file diff.

## Doc impact — verified

Eight durable-truth notes cover the eight edit and fix slices:
- S1: the front door;
- S2: the routes;
- S3: chapters at once;
- S4: the engine;
- S5: the evidence and the critic;
- S6: the release and its order;
- F2: the critic's read;
- F1: the research-first trigger, superseding "only when no phase covers it".

`docs/current/` holds no other stale mention of this phase's change. `grep` finds `v94` only in qa.md's front-door line (L447–452) and its summary header, which the gate-section notes replace. The other P39-hk-era wording sits in P39-hk's own unconsolidated notes, which F1's note says are superseded.

**The gate-section notes, as appended** (`## Doc impact` entries 9–15):
1. **Replace** P39-hk's v94 front-door line with a v96 line: `Built by:`, the research-first offer "when the records lack what the reader needs", and refusal naming v96 for a v95 workspace or one with no `**sources**`.
2. **Edit** two version floors: the headless line, "in this v86+ workspace" → "in a v96 workspace"; and the refusals line's v85/`**unit**` tail → "in a v95 workspace (or one whose create-phase research route lists no `**sources**`)".
3. **Append** five lines:
   - a subject with no code (offers only "research first");
   - covered but lacking ("research first" beside "yes", `Built by:` kept);
   - chained `from=P<N>`;
   - `/SKILL.md` byte-identical, and the landing counts equal `wc -l`;
   - the critic's nested sibling read.

`## Operator Runtime`: no change.

## OQ2 — the lede's "cite every line to the code" (walkthrough decision 1)

**Recommendation:** "trace every line to the code and its records".
- A subject book has no code at all.
- Even before this phase, each sentence traced to a code range **or a record line**.
- It keeps the voice and the length.

**The alternatives:**
- leave it, since codebase books are still the main case;
- let D78-rq, the landing wording follow-up, batch it.

Any answer is one `content.ts` line.

## P59-d8 now (arb_upbit_1, read-only, 23:33)

Its phase worktree is `phase/P59-d8-…`, head `535498b4`.

- **The chapters:** S1–S8 are `done`.
- **Its review, round 1** (22:41): `changes_requested`. The whole-book read found two classes:
  1. typed blocks the 0.10.0 grammar refuses, in chapters 2–6. Only the plugin's bundled parser saw them, offline: the live server predates the grammar.
  2. the judged set, worded two ways across chapters.
- **The fixes:** F1–F8 are all `done` (22:46–23:07). Each restores first-use `term:` links, and each validates with 0 violations against the bundled grammar.
- **Its REVIEW** has been `pending --stop-kind operator-action` since 23:08: "deploy the knowledge server with the 0.10.0 grammar, then round 2 runs (live check, private publish, reader pass, walkthrough)".

**Nothing is published.** It is still the live test of point 4: the 8 chapter pages on production, each quiz grading, formulas and the glossary, `term:` and `chapter:` links, the anonymous 404. That test now waits on deferred job 1 alone.

## Deferred-job candidates (title · reason · trigger)

None of round 1's four was resolved by a fix. All four are re-listed:

1. **Deploy the knowledge server with plugin 0.10.0's grammar** (the `glossary` block, `term:` links, the formula and inline-math checks).
   - Reason: P59-d8's REVIEW is parked on exactly this deploy, and its fixes F1–F8 restored `term:` links that only that grammar accepts. P8-x9 hit it too (its OQ3 glossary work-around). It is a deploy of `server/`, outside this boundary.
   - Trigger: now. P59-d8's publish waits on it.
2. **Retarget D94-cp to v96:** "Re-run the explain front door under `claude -p` in a workspace on v96".
   - Reason: 0.11.0 refuses every workspace that exists today, so a real `claude -p --plugin-dir plugin` run is still needed for:
     - checklist lines 28, 29, 33, 34, 35 and 54;
     - the five new v96 lines.
     That run should also rewrite or retire lines 28 and 33–35, which still describe the pre-0.10.0 front door (`quick`, `run: full`, research agents, the cost table, a seventeen-line block).
   - Trigger: `/update-workspace` to v96 here, after the bootstrap release and this merge. File it superseding D94-cp, whose trigger names v94.
3. **Give the chained explain an on-disk trigger** (inside the boundary, judged not fix-worthy in round 1).
   - Reason: **When it passes** fires only from the `review.md` line followed at the pass. A compaction in that window loses the confirmation that should come back by itself. The way back is to type `/knowledge:explain <subject> from=<P>`, or to let coverage find the research phase.
   - Trigger: the first chained research run, or a resume that misses it.
4. **Retire checklist line 30**, the verifier's same-model guard.
   - Reason: no `knowledge:verifier` ships since the one-critic run.
   - Trigger: the next docs or QA phase.

**Observation (not a job to file):** D77's trigger, "the next bootstrap update that touches explain-decomposition.md", fires with this package, which edits that file. D77 asks to cap the outline-gate report at about 2k characters, and the package does not fold it in. The orchestrator may tell the operator, or re-point D77's trigger at the next bootstrap update.

## Walkthrough

P40-2t, one way to explain what the records don't cover: review round 2 passed.

**What changed for you:**
1. `/knowledge:explain <subject>` offers "research first" whenever the records lack what the reader needs: no phase covers it, it has no code (a language, your notes), or phases built it but the reader needs outside basics no record states (rule v2 + quant basics). With code, "yes" stays beside it. Your own "research first" always works.
2. One confirmation names what the research reads (code, the web with a source per fact, or your own material). Then it runs at once.
3. When it passes, the explain's confirmation comes back by itself, redrawn from the findings (`from=P<N>`). You say yes.
4. A book: you sign the outline once, then up to 4 chapters are written at once, each with its own critic, which reads earlier chapters as committed (nested installs too). The synthesis chapter goes last, and the review checks the chapters agree.

**The release order you run:**
1. Your bootstrap session applies `works/phases/active/P40-2t/package/` (its README), releases v96, and pushes.
2. Plugin 0.11.0 is pushed with this branch's merge.
3. Run `/update-workspace` here (v89), in arb_upbit_1 and in Note.

**Try:** on this branch, read `plugin/skills/explain/SKILL.md` §1, **Covered, but the records lack what the reader needs**. After the merge and deploy, https://knowledge.hi2vi.com/ reads "2,722-line skill" and /SKILL.md serves that file. I checked both on a scratch production build.

**Decisions:**
1. **OQ2, the lede's "cite every line to the code".** I recommend "trace every line to the code and its records", since a subject book has no code. You can also leave it, or batch it into D78-rq.
2. **P59-d8, the live test of a real book.** Its chapters and fixes F1–F8 are done. Its review is parked until the server is deployed with the 0.10.0 grammar, and nothing is published. File that deploy, or run it now.

**Decided as drawn:** the research route uses the explain-route exception; the cap of 4 is a text rule; Sources list the research-read works (OQ1); a legacy block runs without the chain; the critic's `git -C` read needs one permission line in manual mode.

**Jobs to file:** the server deploy; D94-cp retargeted to v96; an on-disk trigger for the chained explain; retire checklist line 30.

Reply "accept" to clear the gate.

## Scratch

All of it is throwaway, in the session scratchpad under `r2/`:
- `copy/`: `fdb1151`, patched and rebuilt;
- `p40-r2.tar`;
- `smoke.log`, `web.log`, `webbuild.log`;
- `f2/host` (the nested proof pair);
- `inst/patched` (a fresh patched install);
- `webbuild/` (the scratch build; its server is stopped);
- `notes/` (the appended note texts).

A stray `r2/web/` from a mis-ordered copy is unused.

Nothing was written to the bootstrap repo, Note or arb_upbit_1 (read-only `git -C … worktree list` / `log`, and file reads). Nothing was committed or pushed.
