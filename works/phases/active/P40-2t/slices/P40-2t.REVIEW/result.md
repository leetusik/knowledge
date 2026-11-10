# P40-2t.REVIEW — result (round 1)

## Verdict

- **status:** done
- **route:** high
- **model:** opus
- **effort:** xhigh
- **review_verdict:** changes_requested
- **summary:** Validated all six edit slices together: parity, pytest, the web gate, the package's finds/apply/cites and the whole patched smoke suite on a fresh `fdb1151` copy (504 PASS) all pass. A live probe on a patched install showed the outline gate holding every declared chapter and the quoted proposal no longer marking a research phase as an explain phase. In Claude in Chrome, a scratch standalone build serves the 0.11.0 `/SKILL.md` and the landing shows 2,665. Read end to end, the route works for a subject no phase covers and for a no-code subject. It has two gaps. (1) **P59-d8's own shape**, code that phases already cover but whose reader needs outside basics, has no way into "research first". (2) In a **nested install** the critic's new rule, read siblings at `HEAD`, reads the wrong repository, so it never sees a committed chapter.
- **files_changed:** `works/phases/active/P40-2t/slices/P40-2t.REVIEW/result.md`; `works/phases/active/P40-2t/phase.md` (through `phase-section`: `## Now` replaced, one `## Notes for later slices` entry appended). No source, package, doc or other-repo file was touched. Scratch only: `<scratchpad>/p40-review*` (a fresh `fdb1151` copy, two scratch installs, a scratch web build, a throwaway viewport proxy, two hand-walk scripts).
- **validation:**
  - `python3 scripts/skills_parity.py`: PASS; `python3 scripts/plugin_parity.py`: PASS.
  - `uv run pytest -q`: 183 passed, 60 skipped: PASS (includes `tests/test_explain_resolver.py`).
  - `pnpm --dir web typecheck`: rc 0; `lint`: rc 0; `test`: 41 files, 589 tests: PASS.
  - Build: `pnpm exec next build` in a scratch clone of `web/` (no `.next`; the same `next build` the `build` script runs, done in a clone so it does not touch S6's `web/.next`): rc 0.
  - `package/checks/finds.py <bootstrap> fdb1151`: `finds checked=33 not-exactly-once=0`: PASS. The bootstrap is still at `fdb1151` and clean.
  - `package/checks/apply.py` on a fresh `git archive` of `fdb1151`: `applied finds=33`, explain block L211–316 passed, caps 12,285/8,185/8,180 of 12,288/8,192/8,192, skill count 21, create-phase core 50,681 B: PASS.
  - On that copy: `python3 installer/build.py` and `--check` OK; `bash tests/retrofit_smoke.sh` alone: `ALL RETROFIT SMOKE TESTS PASSED`, rc 0, **504 PASS, 0 FAIL**.
  - `package/checks/cites.py plugin/skills/explain/SKILL.md` over the package's five texts: 118/17, missing 0. Over the patched copy's 64 `payload/claude/**/*.md` and the seed operations doc: 124/17, missing 0: PASS.
  - P33-n3's citation check (checklist line 37):
    - on a fresh patched install: 229, missing 0;
    - on a fresh `fdb1151` (v95) install against the 0.11.0 skill: 218, missing 0;
    - this repo's vendored v89 `.claude/`: 200, missing 85. That is known and pre-existing: it clears at `/update-workspace`.
  - `python3 scripts/workflow.py validate`: passed. Its warnings were already there (the Decisions long entries 14 and 16, consolidation debt, stale docs, oversized sections) and include no dangling pointer.
- **deviations:**
  1. The checklist's `claude -p --plugin-dir plugin` front-door lines were **not run**. Plugin 0.11.0 refuses every workspace that exists today (this one is v89, the others v95), and a headless model session is spend the plan forbids. Their readiness half was hand-walked on scratch installs instead (§ Checklist). D94-cp should be retargeted to v96 (deferred jobs).
  2. The web build ran in a scratch clone, not as `pnpm --dir web build` in the worktree (above).
  3. Because the verdict is `changes_requested`, I did none of the pass-only duties: no `## Doc impact` append and no gate-section notes. Their drafts are below, for round 2.
- **findings:** two problem classes, F1 and F2 (§ Findings): one fix slice each, both `risk: high`.
- **doc_impact_added:** none (the verdict is not a pass). The list was checked and is complete for what shipped (§ Doc impact).
- **doc_versions:** none — deferred to post-merge consolidation (parallel mode).
- **walkthrough:** none, since the verdict is `changes_requested`. The round-2 draft is under § Walkthrough draft.
- **explain:** not written — run /knowledge:explain P40-2t for a document, or ask it for a book
- **team-rules check:** n/a (at-root install: the contract's Commit Convention is the only one).
- **instrument:** Claude in Chrome. `list_connected_browsers`, then `select_browser` on `c14e5b18-f250-45f1-b92e-4a08a31197b5`, then my own tab, closed at the end. The scratch standalone build was served on `:3991` and a throwaway same-origin viewport proxy on `:3992`; both were stopped. `:3030` was never touched.

## Findings

### F1 — "research first" is offered only when no phase covers the subject, so P59-d8's shape has no route

**The rule that failed.** The operator confirmed the arb_upbit_1 shape as the one standard way: research in its own phase, then an explain from its records, from one request. That run began with a codebase subject whose code phases already covered: "performance rule v2 with basic quant knowledge". The reader needed outside basics that no record held.

The shipped trigger cannot reach that case. Every text gates "research first" on the subject having **no covering phase**:
- the plugin's §1 *The phases that cover the subject*, **None covers it**;
- the front door's step 7, "When no phase covers the subject";
- step 8's *On "research first"*, "(no phase covers the subject: …)";
- the explain route, *When no phase covers the subject* and *A "research first" reply*;
- the research route's opening, "When no phase covers its subject";
- create-phase step 2, patch 1c, "no phase covers the subject yet".

For a covered subject:
- step 5's coverage names the building phases;
- step 7 shows `Built by:` with no research offer;
- the outside basics become a must-cover item the records cannot carry, which ends up a stated gap;
- an operator who replies "research first" anyway gets nothing: step 8 says anything but a literal yes, a changed line or a picked shape creates nothing.

That is the improvisation the intent names ("P58-pm stretched it to web research"), and it is still needed. The downstream half is already in place. **When it passes** carries `P<N>` on `phases:` "beside any phase that covers the code", and §9.2 allows "a research phase that recorded outside basics" in a codebase book. Only the entry is missing.

**Cases (the acceptance matrix):**

| # | Case | Today |
|---|---|---|
| 1 | Code no phase covers, no outside basics: "research first" (sources: code) or "yes" from the code | pass |
| 2 | Code no phase covers, the reader needs outside basics: research first with `sources: code · web` | pass |
| 3 | A no-code subject with no research phase: research first only (web, operator material) | pass |
| 4 | A no-code subject a research phase covers (by coverage or `from=P<N>`): goes on | pass |
| 5 | **Code phases cover, but the reader needs outside basics no covering record states** (P58-pm → P59-d8): the confirmation names what the records lack and offers "research first" beside "yes"; the chain runs; the redraw puts the building phases and the research phase on `phases:`; the book kind stays `codebase` | **fail**: no offer |
| 6 | **A covered subject, and the operator replies "research first"** (or asks for research in their own words) | **fail**: creates nothing |
| 7 | Cases 5–6 through the explain route's own confirmation (a direct "make an explain phase for X") | **fail** |
| 8 | A v2 of a covered subject that asks for outside material | **fail**, as case 5 |
| 9 | The research route and create-phase step 2 accept a block for a covered subject (`paths:` its code; `sources:` web, and code if wanted) | **fail**: both say "no phase covers the subject yet" |
| 10 | Every prose description of the trigger agrees. Today each says "a subject no phase covers": `plugin/README.md`, root `README.md`, setup `SKILL.md`, the KB template, the description in `plugin.json`/`marketplace.json`/the skill frontmatter, and the release fragment, `README.en.md` block and seed operations doc in `patches/release.md` | **fail** |
| 11 | The readiness test, the `**sources**` marker, the 44 headings and the citation checks stay green | must stay pass |

**Proposed fix slice: `P40-2t.F1`, `risk: high`.** The defect spans S1 (high), S2 (mid) and S6 (mid): mid-row work goes to the high row. It is also open design: the plan must pin the new trigger.

- **The simplest rule:** offer "research first" whenever the records do not carry what the reader needs. That is either a subject no phase covers, or a covered subject with a drafted section or must-cover item that no covering record states (a field's terms, a formula). Always honour an operator's "research first", whatever the coverage.
- **What does not change:** the research block (`paths:` names the subject's code), the chain and **When it passes**.
- **Files:**
  - `plugin/skills/explain/SKILL.md`: §1 COVERAGE, steps 7–8 and the frontmatter description. Then its `.agents` and web copies, `skills_parity --write-agents`, and the landing count if the line count moves.
  - Package: `explain-route.md`, `research-route.md`, `patches/create-phase.md` 1c, and `patches/release.md` sections 2, 3 and 5.
  - `plugin/README.md`, root `README.md`, setup `SKILL.md`, the KB template, `plugin.json` and `marketplace.json`.
  - Re-run `finds.py`, `apply.py`, the patched suite and `cites.py`.
- The orchestrator may want the operator's word on the rule first: it changes when the front door offers research, a contract between the plugin and the payload.

### F2 — in a nested install, the critic's "read siblings at `HEAD`" reads the host repo, which never tracks the book

**The rule that failed.** A19 and C5 make the critic read an earlier chapter "only as committed, `git show HEAD:<path>`", with its paths "from the repo root". If a sibling has no file at `HEAD`, the critic judges it by the outline's recap lines instead.

In a **nested** install (Note is one), the book lives under `workflow/works/phases/active/P<N>/book/`:
- `workflow/` is its own git repository and is excluded from the host (`/workflow/` sits in the host's `.git/info/exclude`; the scratch install showed it);
- the critic runs from the host worktree's root, where the dispatch block's paths read `workflow/works/…`.

So `git show HEAD:workflow/works/…` asks the host's `HEAD` for a path the host never tracks. It always misses. Every committed sibling is then judged by the outline alone, silently. That holds even in a sequential run, which contradicts `explain-chapter.md`'s "in a run with one chapter at a time every earlier chapter is committed, so nothing changes there".

Before this phase (0.10.0), the critic read earlier chapters from the working folder, which works when nested. The workspace already knows this trap: `explain-review.md`'s freeze check says "(Nested: run both in the nested repo, `git -C workflow …`, with paths relative to it.)".

**Cases (the acceptance matrix):**

| # | Case | Today |
|---|---|---|
| 1 | At-root install, chapters one at a time: the critic reads each committed earlier chapter | pass |
| 2 | At-root, a wave: committed siblings are read at `HEAD`, and in-flight ones are judged by the outline | pass |
| 3 | **Nested install, one at a time**: the critic reads the committed earlier chapters | **fail**: every sibling is judged by the outline |
| 4 | **Nested, a wave**: the same | **fail** |
| 5 | The texts' claim that a sequential run changes nothing holds in both layouts | **fail** when nested |
| 6 | The review's freeze check (already `git -C workflow`) | pass |

**Proposed fix slice: `P40-2t.F2`, `risk: high`.** The defect is in S5 (mid) and S3 (high).

- **The simplest rule** works in both layouts: read a sibling as `git -C <the draft's folder> show HEAD:./<sibling file>`. `HEAD:./…` resolves against `-C`'s folder, so it reads the nested repo when nested and the host repo at root.
- **Files:**
  - `plugin/skills/explain/SKILL.md` B5 *Inputs*, item 7, then the copies, `--write-agents` (which regenerates `plugin/agents/explain-critic.md`) and parity;
  - the package's `explain-chapter.md`, *What a chapter sees of the others: nothing in flight*;
  - re-run `cites.py` and `apply.py`.

### Minor (no fix slice of their own; F1's slice may correct the first two in passing, since it edits those files)

- `explain-route.md`, under **unit**, says "The literal `unit` line is what the plugin's front door tests for". It is stale. 0.11.0 tests `**sources**` under *The research route*, and 0.10.0 tested `**phases**`. The sentence was inherited verbatim from `fdb1151`.
- `PATCHES.md` says "Two files are edited by two patch files … `payload/claude/agents/slice-executor.md` (only `patches/workflow.md`) and `tests/retrofit_smoke.sh`". Only the smoke suite is edited by two of them (`finds.py`'s list confirms it).
- The chained explain has no on-disk trigger. Its only trigger is the `review.md` line followed at the moment of the pass, so a compaction between the recorded pass and the front-door call loses the "comes back by itself". The way back is documented: `/knowledge:explain <subject> from=<P>`, or coverage. The window is small, so I did not judge it fix-worthy. It is listed as a deferred-job candidate.

## The route, read end to end (step 2)

**Subject 1: no code, "the operator's English"** (a nested install, as Note is):

1. The front door's MODE says **No code behind it: a subject**. Readiness needs v96 plus `**sources**`.
2. The cheap look reads a covering research phase's gists, and the coverage greps the plain name. None covers it.
3. Step 7 shows the subject paragraph, with "research first" only and its sources named. The book's stops line says the research runs first.
4. Step 8 hands create-phase the request, the block and the proposal. Create-phase step 2 routes it to *The research route*.
5. The research route confirms once. The confirmation names the sources, the landing repository and its git remote.
6. On the yes: `new-phase`, then `intent.md` with the proposal as a `> ` blockquote, then the intake commit, then a run in `auto` on the default stream.
7. Its DECOMP cuts a corpus slice first, under the eight privacy rules. The research review samples sources and runs the self-tests, the secret scan and the masking checks. The gate is waived.
8. On the pass, the chain line in `review.md` (both copies) leads to **When it passes**, which runs `/knowledge:explain <subject> from=<P>`.
9. With `from=`, the front door reads the quoted proposal as the starting draft, redraws it, says in `Why:` what changed, and waits for the literal yes.
10. The explain route takes it as *A confirmed proposal*: "covered by a research phase on `phases:`".
11. The book DECOMP:
    - accepts a subject explain only when `phases:` names a research phase;
    - sets the registry floor to 0.11.0;
    - builds D1 from the records, reading a corpus only at the cited ids, with the standing gap;
    - pins recap lines, names, running examples and link ids in the outline;
    - declares the chapters (`--depends-on none`, the synthesis chapter on the chapters it draws on).
12. The outline gate runs as one `&&` line, and a probe showed the stop holding every chapter. Then *Chapters at once (a wave)* runs at most 4, and the synthesis chapter goes last.
13. The review's consistency pass runs, then the publish with `--book-kind subject --book-subject`. The CLI and the server accept both (`cli/…/knowledge.py` `--book-subject`; `server/books.py` `BOOK_KINDS`).

Only the critic's sibling reads break here (F2).

**Subject 2: a codebase subject that needs outside knowledge, "rule v2 + quant basics"** (at root, as arb_upbit_1 is): it breaks at step 1 of the route (F1). The coverage finds the rule v2 phases, the confirmation offers no research, and quant basics become gaps. From a research phase onward, everything traces as for Subject 1, with `kind codebase`.

**Plugin against package** (names, cited headings, bold parts, versions, `**sources**`, `from=`, the `## Explain` hazard, resume):
- **Agree:** *The research route* and **When it passes** are cited the same way in the plugin, both `review.md` files and the release pins. `from=P<N>` and `from=<P>` agree.
- **Versions:** 0.11.0 everywhere: the plugin, setup, the route floor, the DECOMP's registry floor and the legacy-block line. v96 everywhere: the front door, the READMEs and the package README.
- **The hazard is fixed:** `explain_phase()` on a scratch research phase with a quoted `> ## Explain` returns False, and on a real explain phase it returns True.
- **Resume:** the wave's resume reads each chapter from disk (`critic_ready`, `critique: answered`, the critique file's `- verdict:`). That holds.
- **S3's extras:** `wave.md`'s four extra finds (`returned=`, *Rolling starts*, *At each return* opening and step 6, *Resume* step 2 twice) are consistent with *Chapters at once (a wave)*. The outline gate's single `&&` line has the same order `fdb1151` used.
- **The engine probe** (a patched scratch install):
  - `parallel-plan` printed `S1 + S2 -> S3 -> REVIEW`;
  - `finish-slice` took the declared explain DECOMP;
  - after the gate and the stop, `next` printed `ready_slices=none -- stopped by P1.S1`;
  - after "accept", `ready_slices=P1.S2` and `running_slices=P1.S1`, with the synthesis chapter waiting.

**The six confirmed points:**
1. **Own research phase:** holds, except for F1's case 5.
2. **Records-only, no-code subject accepted:** holds.
3. **One request runs both:** holds once research is offered; F1 is its gap.
4. **Checks stay, and a real book:** holds in the text; the live test is P59-d8's publish (below).
5. **Chapters at once:** holds, bar F2 in nested installs.
6. **Checked against P59-d8 first:** done by R1 and re-checked below. Nothing contradicts the direction.

## Gate stages

1. **The manifest:** `## Operator Runtime` is filled. The deviceId matched, and Claude in Chrome was selected first.
2. **Spot-check** (the scratch standalone build of this branch, served by P37-1p's recipe on `:3991`):
   - `/SKILL.md` answers 200 with `text/markdown`, byte-identical (sha256 `9d3354e9…`) to `plugin/skills/explain/SKILL.md` and `web/public/SKILL.md`. In the browser it shows the v96 readiness test (`**96 or later**`, the `**sources**` field), `argument-hint … [from=P<N>]`, the `from=P<N>` → FROM rule, and no "v94".
   - The landing's lede and pane read "2,665-line" and "2,665 lines", which equals `wc -l`. "read the whole skill ↓" expands to the whole file, 2,666 lines with the end newline, holding *Written beside other chapters*.
   - No console errors.
3. **Fresh eyes:** on the landing's skill band at 1728 and 390, the copy fits with no horizontal scroll. The only thing that reads oddly for a subject book is OQ2's "cite every line to the code" (below). The pane's "showing the head" shows the new description, which is long but complete.
4. **Checklist:** the table below.
5. **Questions:**
   - OQ1 is resolved.
   - OQ2 goes into the walkthrough on a pass, with the recommendation below. It could also be asked now, beside F1, since both touch how a subject book is described.

### Checklist, classified (`phase-scope P40-2t`: 11 files)

The changed files feed four surfaces:
- the explain plugin: the skill, its copies, the critic, the metadata, setup and the READMEs;
- `/SKILL.md`, through `web/public`;
- the KB template;
- the landing `/`. `content.ts` reaches only the `(marketing)` route group: `layout.tsx` and `page.tsx`.

| Lines (block order) | Surface | In/out | Result |
|---|---|---|---|
| 4 `validate` | workspace | in | pass |
| 27 parity | plugin | in | pass |
| 32 landing count = `wc -l` | `/` | in | pass (live: 2,665 ×2) |
| 44 landing: no graph, bands alternate | `/` | in | pass at 390, 820, 1024 and 1440 (proxy harness): skill `rgb(239,233,219)`, then pricing `rgb(246,242,232)`; no `#graph`, no graph word; `scrollWidth` equals width |
| 46 graph API gone, template graph kept | template | in | template half pass. The API half was not re-run: `server/` is untouched and no API is up on `:8766` |
| 36 KB key | plugin | in | pytest half pass. The headless-log half needs `claude -p`: not run |
| 37 P33-n3 citation check | plugin | in | 229/0 on a patched install. The vendored v89 copy here is 200/85 until `/update-workspace` |
| 31 refusals (and 54's refusal half) | plugin | in | **stale text, behaviour re-checked by hand walk** (the plugin's steps 1–2 applied to scratch folders): no workspace → refuse naming v96; fresh `fdb1151` v95 → too old (no `**sources**`); patched but v95-stamped → too old; patched and stamped 96 → ready. The line names v85/v86 `**unit**`: rewrite below |
| 28, 29, 33, 34, 35, 54 | plugin under `claude -p` | in | **not run**: 0.11.0 refuses every existing workspace, and a model session is spend. Retarget D94-cp to v96. Lines 28 ("this v86+ workspace"), 33 and 54 ("v94") name the old floor: rewrite below |
| 30 the verifier's same-model guard | `plugin/agents` verifier | out | no verifier agent ships now (`plugin/agents/` holds only `explain-critic.md`): a stale line for the docs phase, not this phase's |
| 1, 2, 3, 5–26, 38–43, 45, 47–53 | docs site, reader, console, CLI, server, publish | out (44 lines) | not re-run. No changed file feeds them: `content.ts` feeds only `(marketing)`, and `server/`, `cli/`, `web/src/app/(app)` and the reader are untouched |

### Drafts for a pass (round 2 appends them; nothing is appended now)

Checklist rewrites and additions, as `## Doc impact` notes tagged `(gate section — written at merge)`:
- **Replace** P39-hk's v94 line (54): `- [ ] Explain front door: in a v96 workspace, /knowledge:explain <subject> under claude -p --plugin-dir plugin prints one confirmation (a guessed Reader, subject-shaped Sections, one or two Other shapes, Built by: or the research-first offer naming its sources, the one-writer, one-critic Cost: line, the sixteen-line ## Explain with phases:) and creates nothing; a v95 workspace, or one whose create-phase research route lists no **sources**, is refused naming v96 (P39-hk; updated P40-2t)`
- **Update** line 31's tail, "in a v85 workspace (or a v86 whose create-phase explain route lists no `**unit**`)", to "in a v95 workspace (or one whose create-phase research route lists no `**sources**`)", and line 28's "this v86+ workspace" to "a v96 workspace".
- **Add:**
  - `- [ ] Explain, a subject with no code: /knowledge:explain <a subject no phase covers> under claude -p in a v96 workspace offers only "research first", naming its sources (web, your own material) and that the confirmation comes back by itself; outside a git repository it declines; nothing is created (P40-2t)`
  - `- [ ] Explain, chained: /knowledge:explain <subject> from=P<N> (a passed research phase) redraws the confirmation from that phase's quoted proposal, puts P<N> on phases:, says in Why: what changed, and waits for the literal yes (P40-2t)`
  - `- [ ] The landing's skill pane and /SKILL.md: /SKILL.md serves the 0.11.0 skill byte-identical to plugin/skills/explain/SKILL.md (the v96 readiness test, from=P<N>), and the lede and pane count equal wc -l (P40-2t)`
- `## Operator Runtime`: no change.

### Doc impact — checked (for round 2)

The six notes cover what shipped:
- product.md and decisions.md: the front door, the routes, the evidence, the critic and the wave;
- decisions.md: the engine;
- operations.md: the release order;
- qa.md: the stale v94 lines.

`docs/current/` has no other stale mention: `grep` finds `v94`, `0.10.0` and `2,492` only in qa.md's three front-door lines. F1 and F2 will each owe one more line when they change the trigger and the critic's read.

## OQ2 — the lede's "cite every line to the code" (walkthrough decision on a pass)

**Recommendation:** change it to "trace every line to the code and its records". Even before 0.11.0 the lede was slightly off: every sentence traces to a code range **or a record line**, and a subject book has no code at all. The change keeps the voice and the length.

The alternative is to leave it, since codebase books are still the main case. D78-rq (the landing wording follow-up) could absorb it if the operator prefers to batch copy. Either answer is one `content.ts` line.

## P59-d8 now (arb_upbit_1, read-only, about 22:30)

**State:** S1–S8 are all `done`, each with its critique answered and none disputed. S8, the synthesis chapter, committed at `9c2763f1`. The REVIEW has been `in_progress` since 22:26:58, with a plan and no `result.md` yet, so there is **no whole-book read and no publish yet**.

**Chapter 7** (`benchmarks-and-tiers`) critic: `pass`, 0 must-fix, 10 should-fix. **Chapter 8** (`the-verdict`) critic: `revise`, 1 must-fix: an order finding (C01) inside the chapter, where a table uses `n_dec` before the chapter teaches it. Neither has an `outside` must-fix.

**All 8 chapters:** 12 must-fix (8 of them facts) and 0 `outside`. That confirms point 2 to the end of the book.

**New cross-chapter recap findings:** ch 7 C07 and ch 8 C08 (should-fix), and ch 8 C15 (a note). They are the class the outline's pinned recap lines and the consistency pass target.

**Still to come**, and the live test of point 4 once its server grammar (its OQ2) is deployed:
- its whole-book read;
- the 8 chapter pages on production;
- each quiz grading;
- formulas and the glossary;
- `chapter:` links;
- the anonymous 404.

S8 shows the cost of waiting: it wrote first uses in italics with no `term:` link, by the dispatch's OQ2 note.

## Deferred-job candidates (title · reason · trigger)

1. **Deploy the knowledge server with plugin 0.10.0's grammar** (the `glossary` block, `term:` links, the formula and inline-math checks).
   - Reason: both books hit it. P8-x9's glossary work-around (its OQ3) and P59-d8's OQ2. P59-d8 S8 already dropped `term:` links for it. Outside the boundary: a deploy of `server/`.
   - Trigger: before the next book publishes. P59-d8's REVIEW is publishing next.
2. **Retarget D94-cp to v96:** "Re-run the explain front door under `claude -p` in a workspace on v96".
   - Reason: checklist lines 28, 29, 33, 34, 35 and 54, and the drafted v96 lines, need a real `claude -p --plugin-dir plugin` run. 0.11.0 refuses every workspace that exists today.
   - Trigger: `/update-workspace` to v96 here, after the bootstrap release and this merge. The orchestrator files it superseding D94-cp.
3. **Give the chained explain an on-disk trigger** (inside the boundary, judged not fix-worthy).
   - Reason: **When it passes** fires only from the `review.md` line followed at the pass, so a compaction in that window loses the confirmation that should "come back by itself". The way back is to type `/knowledge:explain <subject> from=<P>`.
   - Trigger: the first chained research run, or a resume that misses it.
4. **Retire checklist line 30**, the verifier's same-model guard.
   - Reason: no `knowledge:verifier` ships since the one-critic run (`plugin/agents/` holds only `explain-critic.md`). It is outside this phase's boundary, and a stale line for the next docs or QA phase.
   - Trigger: the next docs phase.

## Walkthrough draft (for the pass round; at most ~5 decisions)

**What changed, step by step:**
1. `/knowledge:explain <subject>`: if no phase covers it, or it has no code, you get "research first".
2. One confirmation names what the research reads: code, web with sources, or your own words.
3. The research phase then runs at once.
4. When it passes, the explain's confirmation comes back by itself, redrawn from the findings (`from=P<N>`). You say yes.
5. A book: you sign the outline, then up to 4 chapters are written at once, each with its own critic. The synthesis chapter goes last, and the review checks the chapters agree.

**The release order you run:**
1. Your bootstrap session applies `works/phases/active/P40-2t/package/` (its README), releases v96 and pushes.
2. Plugin 0.11.0 is pushed with this branch's merge.
3. Run `/update-workspace` here (v89), in arb_upbit_1 and in Note.

**Try:** open the landing and `/SKILL.md` on production after the deploy, and check the count (2,665, or the new count after F1) and the v96 test.

**Decisions:**
1. OQ2: the lede wording, recommendation above.
2. P59-d8 is the live test of the book pages. Its publish waits on deferred job 1.

**Decided as drawn:**
- the research route claims the contract's explain-route exception (no contract edit, 3 B of headroom);
- the cap of 4 is a text rule;
- Sources list the research-read works (OQ1);
- a legacy five-line block runs with no chain.

**Deferred jobs:** 1 and 2.
