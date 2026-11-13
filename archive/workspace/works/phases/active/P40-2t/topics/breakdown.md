# P40-2t — breakdown

`P40-2t.DECOMP` wrote this file on 2026-11-10 and `P40-2t.DECOMP2` rewrote it in place the same evening. `intent.md`
is the record of what the operator wants; `topics/change-list.md` (R1) is the record of what changes, passage by
passage (A1–A22, B1–B11, C1–C10, D1–D3, E1–E7); this file says how that work is cut. Line numbers drift, so every
passage is re-found by its heading.

## Passes

- **DECOMP** (2026-11-10), research first: one findings-only slice, R1, then DECOMP2 as a barrier, then REVIEW. The
  edits were not pinned (five open questions, intent point 6's P59-d8 check, four confirmed points contradicted by
  the route text). The detail is in `slices/P40-2t.DECOMP/result.md` and git.
- **DECOMP2** (2026-11-10), the edits, cut from change-list §5–§6 with no change to its shape:
  - **Round 1, a wave of four** (declared `--depends-on none`, disjoint sets): S1 the plugin front door, S2 the
    create-phase routes, S3 the explain references, wave, decomposition, executor and review lines, S4 the engine
    patch notes.
  - **Round 2:** S5, the plugin's evidence and critic, declared on S1 (the same four-file set). It may start beside
    a still-running S2 or S3.
  - **Then S6**, the release, declared on S1–S5. **Then REVIEW**, a barrier.
  - At the operator's gate: **OQ1 is yes** (A15 on, in S5), and **the edits start before P59-d8 publishes**.
  - `parallel-plan`: `DECOMP2 -> S1 + S2 + S3 + S4 -> S5 -> S6 -> REVIEW` (5 rounds for 8 open slices; widest 4).

## Estimate

**Where the figures come from.** This worktree's meter holds no span of this phase yet
(`dispatch-summary --phase P40-2t` reads 0 spans), so the time comes from P39-hk's `means`, the closest earlier
phase (it edited the same explain skill and shipped a payload package):
`dispatch-summary --phase P39-hk --transcripts ~/.claude/projects/-Users-sugang-projects-personal-knowledge`, run on
2026-11-10.
- **By route:** high 42.0 min/span (18 spans, raised by real-browser build and fix work), mid 11.7 (8).
- **By kind:** implementation 22.2 span-min/slice (11 slices), review 155.2 (a gated real-browser review).
- **P39-hk's skill and package spans**, the closest analogues: S1 5.0, S2 24.8, S3 4.9, S4 6.8, S5 (the package)
  29.1, S11 (the release) 4.0 min.
- This phase's own recorded verdicts: DECOMP at 21:06, R1 at 21:32 (about 26 min for R1).

| Slice | Route | Size | Span time |
|---|---|---|---|
| S1 front door | high | L (12 passages, one 157 KB file) | ≈ 20–35 min |
| S2 create-phase routes | mid | L (two route texts, new procedure) | ≈ 20–30 min |
| S3 references | high | L (10 passages in 8 payload files) | ≈ 30–45 min |
| S4 engine | mid | S (2 edits, a probe) | ≈ 10–20 min (a scratch probe run) |
| S5 evidence and critic | mid | M–L (10 passages, Part B) | ≈ 15–25 min |
| S6 release | mid | M (metadata, READMEs, the package's index and checks, the release gate) | ≈ 25–40 min |
| REVIEW | high, gated, no browser | — | ≈ 30–60 min |

- **Total span time:** about **2.5–4 h**.
- **Wall clock:** round 1 is its longest member, S3 (≈ 30–45 min); S5 starts when S1's commit is in and overlaps
  S3; then S6 and REVIEW. About **1 h 45 min–3 h**, plus about 5 min of main-thread planning per slice and the
  operator's acceptance gate.

**Spend.** No slice spends money: every span is the workspace's own dispatch, reading local files and the bootstrap
repo read-only. No live explain run is planned (this repo is v89; the package is applied in the bootstrap session).

## Join-rebuilt artifact

**None.** (A deviation from the DECOMP2 plan's step 4, which asked to name the plugin's four-file set here; the
reason is in `slices/P40-2t.DECOMP2/result.md`.)
- The plugin skill's four files are one unit: `plugin/skills/explain/SKILL.md` (the source),
  `.agents/skills/explain/SKILL.md` (the same body, its own frontmatter), `web/public/SKILL.md` (a full-file copy)
  and `plugin/agents/explain-critic.md` (regenerated from Part B by `python3 scripts/skills_parity.py
  --write-agents`).
- Only S1 and then S5 edit that source, never beside each other (S5 is declared on S1, and a shared set waits for
  S1's commit). So the companions are **generated files inside each slice's own set**: the slice re-derives the
  two copies, runs `--write-agents` and proves parity before it returns, as P39-hk.S10 did.
- Named as a join-rebuilt artifact instead, it would hold every round-1 commit until the wave drains, keep S5 from
  starting beside S2 or S3, and keep S1 from proving parity, with nothing gained.
- The package (`works/phases/active/P40-2t/package/`) has none: each slice owns its own files, and `PATCHES.md`
  (the index) is S6's.

## Pins for every edit slice (S1–S6)

- **The base.** The package targets the bootstrap payload at **`fdb1151`** (v95), never this repo's v89
  `.claude/skills/` (`git status --porcelain .claude/` shows nothing of any slice). Start every package file from
  `fdb1151`'s file, never from P39-hk's package copies (`explain-decomposition.md` already differs).
- **Reading the bootstrap.** Read it only with `git -C /Users/sugang/projects/personal/bootstrap_agentic_workspace.sh
  show fdb1151:<path>`, redirected into the session scratchpad. Write the bootstrap path literally, one plain command
  per call: this worktree-isolated session refuses a `git` command with shell variables or loops. Never its working
  tree, which the operator's bootstrap session may move. Nothing is written there, in Note or in arb_upbit_1.
- **Reading the plugin skill from the package slices (S2, S3, S4).** Read it only as committed, `git show
  HEAD:plugin/skills/explain/SKILL.md` into the scratchpad: S1 or S5 may be editing it beside you.
- **No plugin heading is renamed or added, and no cited bold part's opening words change** (change-list §4). The
  payload cites the skill by number and heading, and `cites.py` checks bold parts too.
- **The two new anchors, pinned by name** (§4): create-phase *The research route*'s bold part **When it passes**
  (S2 writes it; S1 and S3 cite it), and `explain-chapter.md`'s heading *Chapters at once (a wave)* (S3 writes it;
  S2 may cite it). Cite them verbatim.
- **Patch files.** One `package/patches/<area>.md` per set, in P39-hk's `PATCHES.md` form: `**Find** in `<path>``,
  a ```` ```text ```` block holding the find text (exactly once at `fdb1151`), then the replacement block, so S6's
  `checks/` parse every file one way. No slice edits another's patch file; S6 writes the `PATCHES.md` index. Never
  a copy under `package/claude/skills/do-next-slice/` (the build's `SHARED_SKILL_FILES` copies the explain
  references there).
- **Byte caps.** Edit neither `payload/contract.md` (12,285 of 12,288 B) nor the `do-whole-phase` / `do-next-slice`
  `SKILL.md` cores (8,185 and 8,180 of 8,192 B). Keep the smoke suite's pinned literals in `wave.md` and
  `decomposition.md` (`tests/retrofit_smoke.sh` at `fdb1151`, its P42 block).
- **Smoke-suite literals.** Every package slice greps `tests/retrofit_smoke.sh` at `fdb1151` for the strings its
  edit removes or changes, and lists them in its verdict (in a wave, a `Notes for later slices` entry in its
  `notebook` field, for S6): S6's `patches/release.md` updates the suite's explain pin block from that list.
- **Checks in a wave** are the slice's own (its files, scratch copies in the scratchpad); a whole-tree check is
  `deferred: whole-tree`, run by S6 and REVIEW.
- **No test files** (CLAUDE.md): prose and patch notes, verified by the checks named in each block.
- **Doc impact.** Each slice appends the note its block names (in a wave, in its `notebook` field). REVIEW adds the
  gate sections (`qa.md` *Regression Checklist*'s v94 front-door lines) tagged `(gate section — written at merge)`.

## P40-2t.R1

Done: studied P8-x9 and P58-pm → P59-d8; no confirmed point contradicted; pinned (a)–(e) and the change list
(`topics/change-list.md`).

## P40-2t.DECOMP2

This pass: resolved OQ1 (yes), cut S1–S6, rewrote this file. Set: `works/phases/active/P40-2t/**`. A barrier.

## P40-2t.S1 — plugin front door

- **Goal:** change-list A1, A2 and A4–A13: the frontmatter description, the intro, §1's **Arguments** (`from=P<N>`),
  MODE's *subject* case, the book kind `codebase|subject`, COVERAGE and the research block (`paths: … | none`,
  `sources:`, the chained `then:`, verbatim from change-list §3(a)), and the front door's steps 2, 3, 5, 6, 7 and 8
  (the v96 + `**sources**` readiness test and both refusal texts naming v96; no no-code decline; "outside a git
  repository: decline"; the hand-off carrying the block and the proposal as last shown; the confirmation coming
  back by itself through create-phase's research route, **When it passes**, and still waiting for the literal yes).
- **Set:** `plugin/skills/explain/SKILL.md`, `.agents/skills/explain/SKILL.md`, `web/public/SKILL.md`,
  `plugin/agents/explain-critic.md` (regenerated; S1 leaves Part B alone, so expect no change).
- **Validation:** `python3 scripts/skills_parity.py` and `python3 scripts/plugin_parity.py` PASS;
  `uv run pytest tests/test_explain_resolver.py -q` passes; the heading list (`grep -n '^#' …`) is unchanged
  against `HEAD`; `python3 works/phases/active/P39-hk/package/checks/cites.py plugin/skills/explain/SKILL.md
  <fdb1151's create-phase SKILL.md and three explain references, in the scratchpad>` reports missing 0;
  `git status --porcelain .claude/` shows nothing.
- **Risk:** `high`. Trigger: **wide blast radius**. The front door is the interface every explain request enters
  by, and the v96 payload reads it from the other side: the research block's fields, `from=P<N>`, the
  `**sources**` readiness marker and the refusal texts, and the section numbers, headings and bold parts that
  create-phase and the three explain references cite. It is edited in the same wave as those readers (S2, S3), so
  a drift surfaces only at S6 or REVIEW.
- **spends money:** no.
- **Depends on:** none (declared).
- **Doc impact owed:** product.md, decisions.md, qa.md: the explain front door is records-only; a subject with no
  code is offered research first instead of declined; `from=P<N>`; the research block's `sources:` and `then:`; the
  readiness test is v96 plus `**sources**`, both refusals name v96 (qa.md's v94 lines).

## P40-2t.S2 — create-phase routes

- **Goal:** change-list B1–B11. The two route texts replace `## The explain route` to the end of
  `payload/claude/skills/create-phase/SKILL.md` at `fdb1151` (start from that text): records-only, a subject a
  research phase covers, the plugin floor 0.11.0 (B1–B4); a book's chapters as a wave after the outline gate, at
  most 4, a synthesis chapter after (B5); the research block as a bold field list with the new **`sources`** field
  (the v96 marker), `paths: … | none` and `then:` (B6); one confirmation naming the sources (and, for the
  operator's material, the repository and whether it has a git remote), then **run at once in `auto` on the default
  stream** as the explain route's own research (B7); the per-source rules, the eight privacy rules, reader-shaped
  findings and the research review's sample (B8, verbatim from change-list §3(a)); the new bold part **When it
  passes** (B9); the legacy-block sentence (B10). The patch notes cover the intro's one-exception sentence and
  *Procedure* step 2 (B11).
- **Set:** `works/phases/active/P40-2t/package/claude/skills/create-phase/explain-route.md`,
  `…/create-phase/research-route.md`, `works/phases/active/P40-2t/package/patches/create-phase.md`.
- **Validation:** every find in `patches/create-phase.md` occurs exactly once at `fdb1151` (a scratch check on
  P39-hk's `finds.py` logic, kept in the scratchpad); a scratch create-phase `SKILL.md` (fdb1151's head + the two
  route texts + the patch) reads whole, its headings in order, `## The research route` listing the literal
  `**sources**` field line and the bold part **When it passes**; P39-hk's `cites.py` over the two texts against
  the committed plugin skill reports missing 0; the smoke-suite literal list.
- **Risk:** `low`. No trigger: every rule it writes is pinned in change-list §3(a) and (c) (the block, the
  per-source rules, the eight privacy rules, the chain), its anchors are pinned by name (§4), and no engine state
  changes. It is the largest mid slice: escalate if a passage needs a decision §3 did not make (above all in the
  operator-material rules).
- **spends money:** no.
- **Depends on:** none (declared).
- **Doc impact owed:** product.md, decisions.md: one request runs both phases: the research phase (sources code,
  web or the operator's material, with privacy rules) runs at once, and on its pass the explain's confirmation
  appears by itself, waiting for the literal yes.

## P40-2t.S3 — explain references, wave, decomposition, executor and review lines

- **Goal:** change-list C1–C10. The three whole files `explain-{decomposition,chapter,review}.md` (from `fdb1151`):
  the `## Explain` check for a subject explain and the 0.11.0 registry floor (C1); *A book*'s D1 on research
  records, the book kind, the pinned recap lines, names, running examples and link ids, the synthesis chapter, the
  declaration (`--depends-on none`; the synthesis on what it draws on), the sets, warming the code environment,
  `parallel-plan` (C2); the outline gate's stop holding every declared chapter (C3); the new section **Chapters at
  once (a wave)** (C4); span 3's notebook note and the per-chapter commit (C5); the review's consistency pass (C6).
  The patch notes cover `wave.md` (C7), `decomposition.md` (C8), `slice-executor.md` (C9) and the chain step in
  both `review.md` files (C10).
- **Set:** `works/phases/active/P40-2t/package/claude/skills/do-whole-phase/reference/explain-decomposition.md`,
  `…/reference/explain-chapter.md`, `…/reference/explain-review.md`,
  `works/phases/active/P40-2t/package/patches/workflow.md`.
- **Validation:** every find in `patches/workflow.md` occurs exactly once at `fdb1151`; scratch copies of
  `wave.md`, `decomposition.md`, `slice-executor.md` and both `review.md` with the patch applied keep the smoke
  suite's pinned literals; P39-hk's `cites.py` over the three references against the committed plugin skill
  reports missing 0; nothing under `package/claude/skills/do-next-slice/`; the contract and the two SKILL.md cores
  untouched; the smoke-suite literal list.
- **Risk:** `high`. Trigger: **core invariant (concurrency)**. *Chapters at once* is new orchestration of
  concurrent dispatches: up to 4 chapters in flight with three spans each, span-1 and critic returns that are not
  slice returns inside a wave, the outline gate's stop on disk holding declared slices, the critic reading siblings
  only at `HEAD`. It amends `wave.md`'s rules (an exception to "no cap") and the executor's carve-out.
- **spends money:** no.
- **Depends on:** none (declared).
- **Doc impact owed:** product.md, decisions.md: a signed book's chapters run as a wave after the outline gate (at
  most 4 at once, a synthesis chapter last, a critic per chapter, the outline's pinned recap lines and names, the
  review's consistency pass); a research phase with `- then: explain` goes on to **When it passes** at its pass.

## P40-2t.S4 — engine patch

- **Goal:** change-list D1–D3: `finish_slice` drops `and not explain_phase(pdir)` from the v77 forced declaration
  (`explain_phase()` stays, for the detached host worktree), and the comment above it; `cmd_parallel_plan` drops
  its explain note and early `return`; `tests/retrofit_smoke.sh`'s Test 10d probe flips (an explain DECOMP over an
  undeclared chapter is refused, and passes once declared), and the P42 block's comment "explain chapters stay
  undeclared" goes.
- **Set:** `works/phases/active/P40-2t/package/patches/engine.md`.
- **Validation:** every find occurs exactly once at `fdb1151`; on a scratch copy of `fdb1151`'s payload, installer
  and tests (`git -C <bootstrap> archive -o <scratchpad>/…tar fdb1151 …`, then `tar -xf`), the patch applied, the
  flipped probe passes (the patched suite whole if it runs in reasonable time, or Test 10d's probe on a scratch
  install; say which), and `parallel-plan` on an explain phase prints its rounds.
- **Risk:** `low`. No trigger: two located deletions pinned to the line, the refusal's logic unchanged (already
  proven by Test 10d for every other phase), the guard stricter, never looser. Escalate if the probe does not flip
  cleanly.
- **spends money:** no.
- **Depends on:** none (declared).
- **Doc impact owed:** decisions.md: the engine no longer exempts an explain phase from the forced declaration; a
  book's DECOMP declares its chapters like any decomposition (shipped by the bootstrap release).

## P40-2t.S5 — plugin evidence and critic

- **Goal:** change-list A3 and A14–A22: *The evidence* in the run card; §3.4 D1 on a research phase's findings (a
  corpus only at cited record ids, no code with `paths: none`, a finding's outside work carried as `source:`, never
  read, and the standing gap); §4's *The subject, not the records* and **§4.6 Sources with A15 on (OQ1: yes)**:
  Sources also list the outside works the research read, each marked "read by the research, not by this book",
  and the critic checks only that each listed work appears in a cited finding's `source:`; §5's
  `--book-kind <codebase|subject>` and `--book-subject`; §9.2 and §9.3 (codebase or subject, the outline's pins,
  writing beside other chapters); B5's inputs (earlier chapters only at `HEAD`) and *How you check* (a finding
  resting on an outside work; attribution); B9's `source:` field and *The evidence*.
- **Set:** the same four files as S1.
- **Validation:** as S1, after `python3 scripts/skills_parity.py --write-agents` (Part B changes); the Part B
  markers stay well formed.
- **Risk:** `low`. No trigger: every passage is pinned (change-list §3(b) and (d), OQ1 answered), and its readers,
  the writer's sections and the critic agent, are in its own set, regenerated together. Escalate if Part B's
  markers or a critic check need a decision §3 did not make.
- **spends money:** no.
- **Depends on:** `P40-2t.S1` (the same four-file set).
- **Doc impact owed:** product.md, decisions.md: a book's evidence includes a research phase's findings, each
  finding entry carrying its `source:`; the critic checks a finding's record line and `source:`, never the web;
  Sources list the research-read works, marked as such (OQ1: yes); a subject book publishes as
  `--book-kind subject --book-subject`.

## P40-2t.S6 — release

- **Goal:** change-list E1–E7. Plugin **0.11.0** (`plugin.json` version and description, `marketplace.json`
  description, as A1); `plugin/skills/setup/SKILL.md`'s `plugin_version` and its sentences; `plugin/README.md`
  *Explain: flags and the one confirmation*, the root `README.md` and the KB template page (v96, the chained
  research route, `from=`, the subject book, chapters at once); parity; the package's `README.md` on P39-hk's
  shape, with **the release order: bootstrap v96 first, plugin after**; `PATCHES.md` as the ordered index of
  `patches/*.md`, and `patches/release.md` (the `changelog.d` fragment, `README.en.md`'s Knowledge block, the smoke
  suite's explain pin block from S2–S4's literal lists plus the new literals `**sources**`, `0.11.0`,
  `--depends-on none` for chapters and "at most 4", the release, verification after applying); `checks/apply.py`,
  `finds.py` and `cites.py` retargeted to `fdb1151`, the skill count 21, `apply.py` applying `patches/*.md` in index
  order, `cites.py` against the 0.11.0 skill.
- **Added beyond the change list:** `web/src/content/marketing/content.ts` L251 and L261 carry the skill's line count
  ("2,492"), recounted after S1 and S5 (P39-hk.S11's pattern). The count only: the lede's wording is the operator's
  copy, and if a subject book makes it untrue ("cite every line to the code"), that is an Operator Question, never a
  rewrite.
- **Set:** `plugin/.claude-plugin/plugin.json`, `.claude-plugin/marketplace.json`, `plugin/skills/setup/SKILL.md`,
  `plugin/README.md`, `README.md`, `plugin/templates/kb/docs/getting-started/{{KB_DATE}}-how-your-knowledge-base-works.md`,
  `web/src/content/marketing/content.ts`; the four plugin-skill files only if parity regenerates them (S6 writes no
  skill prose); `works/phases/active/P40-2t/package/README.md`, `…/package/PATCHES.md`,
  `…/package/patches/release.md`, `…/package/checks/apply.py`, `…/package/checks/finds.py`,
  `…/package/checks/cites.py`; and, added at S1's return, `…/package/claude/skills/create-phase/research-route.md`
  for one sentence (the `## Explain` hazard, see Decisions: the proposal as last shown is written as a blockquote).
- **Validation:** `skills_parity.py` and `plugin_parity.py` PASS; `checks/finds.py` (every find of every patch file
  exactly once at `fdb1151`); `checks/apply.py` on a fresh scratch copy (all patches applied, the patched suite's
  explain pins pass); `checks/cites.py` against the 0.11.0 skill, missing 0; `grep -rn "v94" plugin README.md
  .claude-plugin web/public/SKILL.md` shows none left of the handshake; `wc -l plugin/skills/explain/SKILL.md`
  equals `content.ts`'s count; the release gate: `uv run pytest -q`, `pnpm --dir web typecheck`, `lint`, `test` and
  `build` (no dev server left running). No push.
- **Risk:** `low`. No trigger: located version strings, copy, a recount, and the package checks retargeted (real
  code, the mid row's normal work), all after every edit has landed.
- **spends money:** no.
- **Depends on:** `P40-2t.S1`, `P40-2t.S2`, `P40-2t.S3`, `P40-2t.S4`, `P40-2t.S5` (it ships them all).
- **Doc impact owed:** product.md, operations.md, qa.md: plugin 0.11.0 released (unpushed); the release order
  (bootstrap v96 first, then the plugin, then `/update-workspace` here, in arb_upbit_1 and in Note); qa.md
  *Test Commands* if the suite's counts change.

## P40-2t.REVIEW — phase review

- **Goal:** review the phase's boundary (`phase-scope P40-2t`): the plugin skill's copies and agent, the release
  files, and the package. Validate every slice together, including the whole-tree checks the wave deferred, and
  `checks/apply.py` on a fresh scratch copy of `fdb1151`.
- **The gate is required** (`acceptance.required: true`). The walkthrough: the route summary and the package; the
  release order (the bootstrap session applies the package and releases v96; then plugin 0.11.0; then
  `/update-workspace` here, in arb_upbit_1 and in Note); OQ1's answer as decided; P59-d8's result if it exists by
  then, or else named as point 4's live test; the deferred-job candidate to deploy the knowledge server with the
  0.10.0 grammar.
- **Parallel mode:** a branch review writes no doc versions; its gate sections go to `## Doc impact`, tagged
  `(gate section — written at merge)`.
- **Risk:** high by kind. **spends money:** no.
