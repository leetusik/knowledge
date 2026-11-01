# P38-e1.REVIEW — result

## Verdict

- status: done
- route: high
- model: opus
- effort: xhigh
- review_verdict: **pass**
- summary: The phase ships what the intent asked: all 11 items are in the final skill. The suite passes across all slices, and walking a v1 `full` run and a v2 delta from D0 to D9 on paper finds no blocking contradiction. Eight headless front-door runs (`claude -p`, plugin 0.9.0 loaded inline) printed the new confirmation (`In plain words:`, `Sections`, `Cost:`, plain lines), leaked no key and created nothing. The gate is required, so the walkthrough follows. Nothing proves the cost figures until a live explain run is metered: that trial is job J1.
- files_changed:
  - `works/phases/active/P38-e1/slices/P38-e1.REVIEW/result.md` (new);
  - `works/phases/active/P38-e1/phase.md`, through `phase-section` only: `## Doc impact` +8, `## Notes for later slices` −5 (all consumed), `## Now` replaced.
  - No source and no doc version. The scratch artifacts are under `/private/tmp/claude-502/-Users-sugang-projects-personal-knowledge/8b492f48-3646-42a0-a801-793c63ebc3ce/scratchpad/review/`.
- validation:
  - `python3 scripts/skills_parity.py` → PASS (the three copies in body parity, the web copy byte-identical, 5 agents = Part B)
  - `python3 scripts/plugin_parity.py` → PASS
  - `uv run pytest tests/test_explain_resolver.py -q` → 2 passed
  - heading diff (`^#` lines) against `14e1cbda` (base saved to the scratchpad) → empty, 57 lines; Part B marker lines (`<!-- part-b`) → identical, 27 lines
  - P33-n3's citation check (`topics/citations.md` L64–85) → `citations checked=200 missing=2` (exit 1). These are the two workspace-side `B5 *Your dispatch*` misses (`explain-chapter.md:89` in `do-whole-phase` and `do-next-slice`); the same check against the base skill prints `checked=200 missing=2`, so this is the baseline, no worse.
  - `python3 scripts/workflow.py validate` → passed (exit 0). Warnings are workspace-wide only: stale docs, consolidation owed, oversized sections, legacy slice kinds. None is a dangling pointer, and none concerns P38-e1 beyond its owed Doc impact.
  - front door, headless: 8 runs, each with the main checkout's (or fixture's) state recorded before and after → unchanged every time (§5)
  - landing count: `wc -l web/public/SKILL.md` = 3347; `content.ts` L251 "3,347-line" and L261 "3,347 lines"; `cmp` web copy = canonical → match
  - B4 (the verifier's same-model guard) is byte-identical to the merge base `4d04d94` → the live guard call was skipped, as the plan says
  - `phase-scope P38-e1` → 14 product files, all the knowledge plugin's surface plus the landing's `content.ts`
- deviations:
  1. **Front-door state capture without `git -C`.** This session is isolated to the worktree and refuses any git command aimed at the main checkout (`git -C …` and `cd … && git status` were both refused). Before and after each call I recorded a file-level snapshot of the main checkout instead (`snap.py`: every file's path, size and mtime outside `.git`, `node_modules` and `.claude/worktrees`; HEAD and its ref; `.git/worktrees`; `works/phases/active/`; the explain state folder), plus `git worktree list` run from this worktree. It is stricter than `git status`, since it also sees ignored files.
  2. **Guarded calls.** Every `claude -p` ran with `--setting-sources project --settings guard.json` (deny `Skill`, `Write`, `Edit`, `NotebookEdit`, `workflow.py`, `git commit`/`add`/`worktree`, `mkdir`, P33-n3's guard), `--no-session-persistence`, `--output-format stream-json --verbose` and a `--max-budget-usd` cap. The guard prevents damage and the stream shows every attempted call. The front door never writes anyway.
  3. **Call (d) ran live.** The KB lists 5 html v1 documents in project `knowledge`, so the v2 call ran against one of them. No prior here has a saved dossier, so it exercised the "v2 with no dossier" case. The dossier-found delta is checked against desk-check §4.2's rendering.
  4. **Refusal, repeat and resume** ran in fixtures I built in the scratchpad (no workspace; a v85 workspace; a v89 workspace with a live explain phase `P99-x1`), on Sonnet like P33-n3's.
  5. **The plan treats any mismatch as a finding.** I classified the live mismatches as observations (§5.3). None contradicts step 7's rules or desk-check §4's fixed lines, each is wording that costs nothing to fix later, and each is in job J3. The one expectation that was wrong, F1's note that `quick` shows no web-searches line, I corrected in `## Doc impact`.
- doc_impact_added:
  - `security.md` (*Plugin config model + secrets hygiene*): the resolver never prints the KB key; it writes the 0600 `auth.header`, curls pass `-H @<file>` or use the CLI, and no role may read the file (P38-e1.S1)
  - `architecture.md` (*Plugin packaging*, the explain run): D1d; D3v sends no batch (supersedes P32's note that D3v dispatches the verifier); D5p before D5; document sizing by `W`; the critic samples ≤ 5 sources (P38-e1.S3–S6)
  - `qa.md`: S2's, S7's and F1's checklist notes are carried by the two replacement lines; F1's narrowing is withdrawn (`quick` printed the web-searches line live)
  - `qa.md` `## Regression Checklist`, tagged `(gate section — written at merge)`: replace the headless line; replace the book line; append "a v2", "a full v1", "Explain KB key" (verbatim in `phase.md`)
- doc_versions: none — deferred to post-merge consolidation (parallel mode)
- team-rules check: n/a (an at-root install: `nested-repos` refuses, so the Commit Convention is the only one)
- explain: not written — run /knowledge:explain P38-e1 for a document, or ask it for a book
- walkthrough: see *The walkthrough* below (about 2k characters; one decision, OQ1)
- deferred jobs to file (title · reason · trigger): J1–J4, see *Deferred jobs* below

## The walkthrough

**P38-e1, right-sized explain runs (plugin 0.9.0), on its branch; nothing pushed.** No live explain run proves this: the costs are projections from metered 0.8.0 runs. I ran the front door headless 8 times: the new confirmation each time, no key, nothing created.

Try it from the main checkout:
1. `claude --plugin-dir .claude/worktrees/P38-e1-right-size_explain_runs_plugin_0.9.0/plugin`, then `/knowledge:explain how the workflow engine plans which slices of a phase can run together`. Expect `In plain words:`, `Sections`, `Cost: 4 research agents … ≈ $35–45 …`, a run line offering "quick" and "no-research", then `## Explain`. Reply **no**: nothing is created.
2. Optional: `/knowledge:explain P34-n0, as a book` (chapters, no dollar figure, "stops twice for your yes"), or `/knowledge:explain the knowledge server's read surfaces` (a v2: "earlier version: v1", "no research saved from v1 to reuse").

Compare: [desk-check §4](../../topics/desk-check.md) and §5 below.

Projected, at list price: v1 ≈ $35–45 (metered $73.97); v2 delta ≈ $25–38 ($79.22); translation ≈ $3 plus ≈ $5 for the phase ($7.84); `quick` $15–25, unmetered.

**Decision:**
1. **OQ1, the critic's model in explain phases.** The workspace pins Opus (`same-model: accepted`), about $4–5 a critic instead of $2–3 on Sonnet, so item 4 lands only as sampling. Recommended: Sonnet for an Opus writer, in J2.

**Decided as drawn:**
- `## Explain` stays machine-facing.
- A document's budget is 4,800 words unless you state one: 4 researchers, `quick` offered for a narrow subject.
- The skill grew 2,793 → 3,347 lines: about $1–2 a run, against $25–50 saved.
- Wording drifts go to J3.
- Headless runs end on "Reply yes…" (D78-rq).

**Jobs to file:**
- J1: a live 0.9.0 trial run (yours to start);
- J2: the workspace follow-ups;
- J3: explain wording (with P39-hk);
- J4: setup's verify curl shows the pasted key.

"accept" signs the recommendation and files J1–J4.

## Deferred jobs (for the orchestrator to file)

- **J1. A live 0.9.0 explain trial, metered.**
  - What: one v1 `full` document on a codebase subject, metered with `dispatch-summary --phase`, to confirm the cost table ($35–45) and the sizing (4 researchers, about 14 batches).
  - Reason: the cost line and the sizing are proven on paper only (`topics/desk-check.md`). No 0.9.0 run has been metered, and `quick`'s row passes the desk check only by construction.
  - Trigger: the operator's word, once the phase has merged and the installed plugin is updated to 0.9.0.
- **J2. Workspace follow-ups for 0.9.0 explain runs (bootstrap repo).**
  - What, in one job:
    - (a) `explain-chapter.md` *The critic's model* passes `model: opus` and `same-model: accepted`; give an Opus writer a Sonnet critic (OQ1);
    - (b) create-phase's own copy of the confirmation layout (`.claude/skills/create-phase/SKILL.md` around L42 and L140–148) still lacks the sections, the plain summary and the `Cost:` line, and keeps the old run and stops wording;
    - (c) `explain-review.md` step 1 counts the writer gap's `ledger.md` and `verify/` writes in the write slice as a finding (S4's note; the old top-up had the same clash);
    - (d) the `B5 *Your dispatch*` citation in both `explain-chapter.md` copies (L89), which keeps P33-n3's citation check at `missing=2`;
    - (e) a translation as a write slice in the same explain phase;
    - (f) explain reviews on the mid row.
  - Reason: these live in the workspace template, outside this phase (the intent's *Clarifications Resolved*).
  - Trigger: the operator's answer to OQ1, or the next `/update-workspace`.
- **J3. Explain skill wording follow-up.**
  - What:
    - (a) step 7's template shows `- web searches:` unconditionally while its prose names a `full` run. Live, `quick` printed it too. Mark its scope: `full` and `quick`, never `no-research` or a translation;
    - (b) a book's closing line under `Sections` (live: "each chapter's own sections are signed later…"; desk §4.3: "Quiz and Sources close each chapter…");
    - (c) §3.4 step 4 defines `W` as "the sum of the signed sections' budgets (D0)", but sections get budgets only at D6. D5p's per-section estimate has the same gap;
    - (d) the cost table's "at most 1 extra round to fill gaps" is a projection, not the rule's bound (3 rounds, ceiling 8: a 2-researcher delta can run 2);
    - (e) on a narrow subject, `quick` is offered on both the run line and the `Cost:` line, the class F15 fixed for "from scratch";
    - (f) §8 and §4.9 name no translation shape (no research, no critic, no `outline.md`);
    - (g) the front door's cheap look ran read-only shell reads (`git log`, a `workflow.py … --help`) beyond Read, Glob and Grep;
    - (h) fold in D78-rq's headless note.
  - Reason: wording only; none breaks a run, and every skill edit moves the landing's line count.
  - Trigger: P39-hk's start (it edits the same skill), or the next plugin release.
- **J4. Setup's connect-mode verify puts the pasted key on the command line.**
  - What: `plugin/skills/setup/SKILL.md` §C5 substitutes the `vk_` key into `curl … -H "Authorization: Bearer <vk_>"`, so it enters the transcript.
  - Reason: an observation outside the phase's scope. Item 6 is the explain skill's, and this phase touched setup only for its `plugin_version`.
  - Trigger: the next touch of the setup skill, or the operator's word.

Not new jobs, but noted for the orchestrator:
- **D70** (shrink the skill; trigger "the skill passing about 160 KB") has fired: the skill was 170 KB before this phase and is 212 KB now.
- **D78-rq**'s trigger ("the next plugin release (0.7.1)") has passed twice: 0.8.0 and 0.9.0 shipped without it.

## 1. Validation, all slices together

Every slice's commands, run once over the finished branch (`f0179a7b`), from the worktree root. The outcomes are listed in the verdict block above.

- **S1–S7 and F1** each ran: both parity checks, the heading and Part B marker diff against `14e1cbda`, P33-n3's citation check, the resolver test and `validate`. All pass at the baseline.
- **S8**'s checks (the parity checks; a desk check that leaves the skill untouched) still hold.
- **S9**'s checks pass: the landing count, and no stray `0.8.0` outside the cost table's provenance line.

Sizes:
- the canonical skill: 3,347 lines and 212,072 B;
- the merge base `4d04d94`: 2,793 lines and 169,774 B;
- `.agents/`: 3,345 lines (the canonical file minus its two frontmatter lines);
- the web copy: byte-identical to the canonical file.

## 2. The intent, item by item

| Item | Delivered by (final `plugin/skills/explain/SKILL.md`) | Verdict |
|---|---|---|
| 1 delta for a v2 | §3.1 *The delta* L660–670 and D1d L671–722 (dossier lookup, `prior/` copy, sources checked by content, carry, log), the recheck L724–739; §3.4 L929–931, L942–953, L972–981; §3.6 L1098–1105, L1131–1132; §3.8 L1171, L1175–1177, L1199; §8 L1988–1991; decline word `from scratch` (L382–384, L584–587) | delivered |
| 2 team sized by the document | §3.4 step 4 L960–997: `W`, wave 1 ≤ 4, 2 code + 2 web, gap rounds ≤ 2, ceiling 8, `C = W ÷ 25`; tiers for books only (L999–1013); the card L94–96 | delivered (see J3c on `W`) |
| 3 verify only what is used | card L57–58, L67–69; D3v sends no batch (L1121–1127); D5p L1158–1172; D5 L1174–1184; the swap L1197–1206 | delivered |
| 4 cheaper, independent critic | §4.10 L1750–1775 (another model: Sonnet on Opus; trusts verify records; samples ≤ 5 sources); B5 *How you check* (trusted claims, sample, widen on a failure) | delivered in the plugin; in explain phases the model half waits on the workspace pin (OQ1) |
| 5 writer held to budget | D7 pass 2 L1335–1372 (the word-count form, cut over 10% before the next section); pass 3 cuts nothing (L1373–1377); trace append-only (L1379–1380, L1782–1787, B9 *The trace*) | delivered |
| 6 no secret leakage | §2 L434–437, L480–507 (prints `KB_API_TOKEN_SET` and `KB_AUTH_HEADER`, 0600 file); every KB curl `-H @<KB_AUTH_HEADER>` (L595–599, L603, L620, L636, L1740, L1880, L1933); B6 *Never touch the KB key*; the test; live: no key in 8 logs | delivered |
| 7 honest confirmation | step 7 `Cost:` L338, L370–399; the cost table L401–411 ("projected for 0.9.0"); offers, never chooses (L375–376, L389–390) | delivered (projected, not metered: J1) |
| 8 translations cheap | §3.1 *Translation* L741–759 (a loose document's own `<slug>-<xx>`, never `--new-version`); §4.10 L1748; §5 L1821, L1833–1835; step 7 L393–399 | delivered |
| 9 a v1 is cheap too | §3.4 L960–961 ("this holds for a v1 exactly as for a v2"). The pick, writer budget, critic sampling, key handling and cost line carry no v2 condition. Live (b) priced a v1 at 4 agents and $35–45 | delivered |
| 10 easier to understand | the plain summary first (step 6 L325–327, L332); plain run, stops and permissions lines (F1); §4 prose rules L1382–1396; B5 clarity and `reader` should-fixes. Live: every confirmation opened with plain sentences | delivered; the `Phase:` line and `## Explain` block stay as drawn (machine-facing, S8) |
| 11 sections up front | step 5's cheap look L276–284; step 6 L313–323; step 7 L333–337; D0 L575–583; D1 skeleton L956–959; D5g L1221–1226; D6 path L1282–1289; §8 L1993–1994; book: chapters at the confirmation, sections at the one outline gate (§9.2 L2035–2054), no stop per chapter. Live: (a), (b), (d) proposed sections, (c) chapters | delivered |

## 3. Internal consistency: two runs on paper

**A v1 `full` document**, a codebase subject with no prior:
- **Front door.** Step 5: the resolver, then the lookup miss (`prior: none`, "earlier version: none found") and the cheap look. Step 6 drafts the sections and the summary. Step 7 prints the confirmation with the v1 row ($35–45), the phase clause, and the run line with the offers. The yes hands it to create-phase, which writes it verbatim under *Original Input* (create-phase L49, L82).
- **D0** reads the signed sections from there (L579–583). **D0b** runs the preflight. **D1d** does not run: "A v1 … run no D1d" (L666), and the card marks it "(a v2 only)".
- **D1.** The skeleton is the signed sections. `W` = 4,800, so 4 researchers (2 + 2), `C` = 192 and a ceiling of 8.
- **D2** sends 4, each with `claims: ≤ share`. **D3** merges. **D3v** sends no batch. **D3s** marks the states `(reported)`.
- **D4.** The gap reviewer runs; at most 2 a round; the ceiling binds first.
- **D5p** picks the used claims within `C`; must-cover and load-bearing questions come first, and `· main` is marked here.
- **D5** verifies only the used claims (`final-b<k>`), with counter-evidence on the main ones. **D5s** swaps a failure once. Then `gaps/final.md`.
- **D5g** counts over the remaining sections. **D6**: the path is the signed sections, with budgets summing to `W`; an uncarriable section is cut, never a stop.
- **D7** holds each section to its budget while drafting; the trace is appended. **D8**: the critic on Sonnet samples ≤ 5 sources, then one revision. **§5** publishes. **D9** reports `used <n> of <m>` and `sections: <n> signed · <m> delivered`.
- Resume (§3.3 step 3) re-runs a pick that has no `D5p` line, whole, and re-sends only the used claims that have no record. It agrees.

**A v2 delta**, the dossier found (desk §4.2):
- **Front door.** Step 5's hit also finds the dossier (Glob and Grep, as D1d step 1). Live (d) did exactly this and found none. Step 7's run line reads "as a delta of v<N>", and the `Cost:` line offers "from scratch" once.
- **D0** checks the request and the reply for `from scratch`; the confirmation's own words never count (L584–587).
- **D1d** finds the dossier (the explain phase's `## Published`, else a legacy `response.json`), copies it to `prior/`, checks code by diff and then a same-line hash and web by a haiku re-find, carries the claims as `C-p<N>-…` with `reused-from:`, and logs last. On resume, D1d runs again whole if it left no line, and never after (§3.3).
- **D1** is sized by `W_Δ`, with carried questions marked `angle: carried`. **D2** gives leads in `known already`. **D3** lists the carried lines first, keeps their statuses and remaps their questions. **D3s** leaves carried states unmarked.
- **D5p** picks carried claims like any others and counts them toward `C`. **D5** skips carried claims, except a used main claim with no counter-search. The **D5s** swap pool includes the carried claims. Under *The records*, a carried claim's record sits under `prior/verify/`.
- **D7** reads carried passages under their prior ids in `prior/`. **B5** trusts carried records. **§5**: `--new-version --rel-path` (a loose document). **§8**: `delta: reused <n> … · re-researched <m> questions`. It agrees.

**What the walks found** (none blocks a run; all are in J3):
1. §3.4 step 4's `W` is "the sum of the signed sections' budgets (D0)", but the signed sections carry no budgets: §1 step 6 gives `<Heading> — <what it answers>`, and budgets arrive at D6 (§3.10 step 2). So `W` always falls to "4,800 when no budget is stated", and the 2- and 3-researcher rungs fire only for a request that states a word count. Item 2 asked for a cap ("at most about 4"), and the cap holds. D5p's "a section of 800 words carries about 32" has the same timing gap: the lead estimates.
2. The cost table's "at most 1 extra round to fill gaps" is a projection. The rule's bound is 3 gap rounds or the ceiling of 8. A v1 with 4 researchers hits the ceiling after one 2-researcher round, but a 2-researcher delta can run 2.
3. §8 item 5 names `none (quick)` but not a translation, and §4.9's "every run has `outline.md`… `trace.md`" does not fit a translation, which skips D6. The §4.9 half predates this phase.

## 4. The skill's size (plan step 3): an observation, not a finding

- **The skill:** 169,774 → 212,072 B (+42,298 B, +24.9%; lines +19.8%), about +11k tokens at ~3.8 B a token.
- **The agent bodies** grew too (Part B's shared B6, B8 and B9 changed): code-researcher +3,214 B, web-researcher +3,235, verifier +3,037, gap-reviewer +3,549, explain-critic +4,638. That is about 0.8–1.25k tokens each.

**Who loads it, in one v1 explain phase:**
- the operator's main thread, once: the slash-command expansion, which stays in context while create-phase runs the phase in the same session;
- the research lead (`DECOMP`, by path: §0–§3 and Part B);
- the write lead (§3.10–§5, B9);
- the critic and the review, partially;
- each resume, again.

So about 2–3 whole-file loads plus partial ones. A book adds one load per chapter executor.

**Extra cost per v1 run at list price** (Opus $4/Mtok input, cache write ~$5, cache read $0.40; Sonnet half):
- each added token is written once, read from cache on every later turn, and rewritten after each wait longer than 5 minutes;
- a research lead (about 100 turns, about 6 wakes): about $0.5–0.8;
- the write lead: about $0.2–0.3;
- the main thread: about $0.3–0.5;
- the agent bodies (4 researchers, about 14 verifier batches on Sonnet, ≤ 2 gap reviews, the critic): about $0.15;
- **total: about $1–2 a run** (an upper bound).

**Against the savings:** v1 $73.97 → ≈ $35–45 (≈ $25–35 saved); v2 $79.22 → ≈ $25–38 (≈ $40–50 saved). The growth eats about 3–6% of the saving, so it is not material.

The shrink path already exists: D70 (move the publish plumbing into the CLI and shrink the skill), whose 160 KB trigger has fired. No heading change is needed for this phase.

## 5. The running product: the front door, headless

**Instrument.** The Claude Code CLI 2.1.314, headless: `claude -p "/knowledge:explain …" --plugin-dir <worktree>/plugin --setting-sources project --settings guard.json --no-session-persistence --output-format stream-json --verbose --max-budget-usd <2–4>`.
- The `init` event of every run showed `knowledge@inline` version **0.9.0**, which replaces the installed 0.8.0, and no `AskUserQuestion` or `Skill` tool.
- Models: Opus 5.5 for the four repo calls, Sonnet 5.5 for the four fixture calls.
- **No browser was driven.** The phase's operator-visible surface is the plugin. The landing's change is two numbers, checked by its checklist line's own file comparison. `## Operator Runtime` names Aside and records no Chrome `deviceId`, and I claim no browser run.
- The 8 calls cost $6.28 together.

### 5.1 The calls, and the state before and after each

Main-checkout state before every repo call:
- HEAD `ref: refs/heads/main` at `14e1cbda`;
- `.git/worktrees` = {P36-1s, P38-e1};
- `works/phases/active/` = 21 phases;
- 4,446 files, digest `5af695858aaa1fc0`.

`git worktree list` (from this worktree), before and after: main `14e1cbda`, P36-1s `170b7018`, P38-e1 `f0179a7b`.

| Call | Where · model | Request | Turns · $ | State after |
|---|---|---|---|---|
| (a) | main · Opus | `how phase-section edits one notebook entry quick` | 9 · $1.18 | unchanged: same HEAD, ref, worktrees, 21 phases, 4,446 files and digest; the state folder gained `auth.header` 0600 |
| (b) | main · Opus | `how the workflow engine plans which slices of a phase can run together (parallel-plan)` | 10 · $1.21 | unchanged; `auth.header` rewritten (0600) |
| (c) | main · Opus | `P34-n0, as a book` | 11 · $1.16 | unchanged; `auth.header` rewritten |
| (d) | main · Opus | `the knowledge server's read surfaces: the two front ends over one corpus` (a v2 of an html v1) | 13 · $1.21 | unchanged; `auth.header` rewritten |
| refusal, no workspace | fixture `fx/nows` · Sonnet | `how add works in this repo` | 2 · $0.36 | fixture digest unchanged (30 entries) |
| refusal, v85 | fixture `fx/v85` · Sonnet | `how add works in this repo` | 4 · $0.38 | unchanged |
| repeat | fixture `fx/live` (live `P99-x1`) · Sonnet | `how the add function works` | 6 · $0.41 | unchanged |
| resume | fixture `fx/live` · Sonnet | `resume` | 3 · $0.37 | unchanged |

`git worktree list` and `works/phases/active/` after the last call matched the snapshot before the first call. **No key in any log.** The scan reports zero tokens after `Bearer`, zero `vk_` keys and zero `KB_API_TOKEN=<value>` lines. The resolver printed `KB_API_TOKEN_SET=yes` and `KB_AUTH_HEADER=…/auth.header`, and every KB call passed `-H @…/auth.header` (a–c) or used the `knowledge` CLI (d: `list --json`, `read`).

Permission denials, all from the guard or the harness and none from the product:
- compound Bash commands with `$(…)` or `cd … &&`, each retried in a plain form;
- (b)'s `python3 scripts/workflow.py parallel-plan --help` during the cheap look (J3g).

### 5.2 What each printed, against step 7 and desk-check §4

- **(a) `quick`.**
  - Printed: `In plain words:` (3 sentences); 5 `Sections` plus "Quiz and Sources close it"; `Cost: one agent researches alone, 1 fact-check batch on a second model, no reviewer · ≈ $15–25 at list price (projected; not metered yet), plus a few dollars for the explain phase around it (the explain skill's cost table)`; `run: quick (…) · or say "full" (…) or "no-research" (this repository only, no web)`; the stops line without the reviewer clause; permissions; `- web searches:` (without the fresh-session advice); the 17-line block; `Why:`.
  - It matches step 7 and the table's `quick` row. The run line is improvised sensibly: the template has only a `full` run line.
- **(b) a `full` v1.**
  - It matches desk §4.1 line for line: the v1 `Cost:` agents and $35–45 with the phase clause; the run line with the plain offers; `earlier version: none found`; `- web searches: … start a long run in a fresh session`; 6 sections ending in "Best practices & next steps"; the 17-line block.
  - It adds `· cheaper: say "quick" ≈ $15–25 (projected)`, step 7's narrow-subject case (L387–389). The model judged the subject one function, which the rule allows.
- **(c) a book.**
  - Printed: 5 chapters as `Sections`; `Cost: research agents for the whole book, then for each chapter more research, a writer and a reviewer · several runs' worth, not metered yet (the explain skill's cost table)`; no dollar figure or phase clause; a run line with no offer; "stops twice for your yes: once to sign every chapter's sections together, once to accept the finished book; otherwise only if …"; `book: p34-n0 — "How the knowledge server keeps private documents off the public repo (P34)" (kind codebase)` (the title rule, not "P34-n0: <phase name>"); `outline sign-off: on`; `depth: about 5 chapters`.
  - It matches desk §4.3, except the closing line under `Sections` (J3b).
- **(d) a v2, no dossier.**
  - Printed: `earlier version: v1`; sections marked `renamed from "Background"`, `renamed from "Intuition"`, `new`, `renamed from "Code"`, `new`, `kept`; `Cost: about 4 research agents … ≈ $35–45 … · no research saved from v1 to reuse`; a plain `full` run line with offers; `prior: knowledge/2026-08-08-…-one-corpus.html v1`; a `Why:` that names the html-to-native migration.
  - It matches step 7's "v2 with no dossier" case (L385–386). The dossier lookup ran as step 5 says: a grep of the phases' records and the legacy state folder.
- **Refusals.** No workspace: "Explain runs as an explain phase in a workflow workspace (v86 or later)… bootstrap (`bootstrap_agentic_workspace.sh`)". v85: "`workspace_version: 85` … Run `/update-workspace` … I haven't run it myself". Both ran nothing and wrote nothing.
- **Repeat.** Named `P99-x1` (`in_progress`) and offered `/do-whole-phase P99-x1` or a new version. It drafted no confirmation.
- **Resume.** Listed `P99-x1` and pointed at `/do-whole-phase P99-x1`.

### 5.3 Mismatches and walk findings (observations, in the walkthrough's decided-as-drawn list)

1. (a) A `quick` confirmation printed the `- web searches:` line. F1's Doc impact narrowing said it would not, but step 7's prose names only a `full` run and its template shows the line unconditionally. The line is true for `quick`, which searches the web, so I withdrew the narrowing (`## Doc impact`), and J3a marks the scope.
2. (c) The closing line under the book's `Sections` differed from desk §4.3 (J3b).
3. Every headless run ended on "Reply yes, or change any line." None said that an interactive session asks it (D78-rq, open since P33-n3; step 7's headless text is unchanged by this phase). (a) did say "Nothing has been created yet".
4. In all four repo calls the model weighed the `Cost:` line against the `--max-budget-usd` cap of my harness ("this session has about $1.90 left…"). That is an artifact of the flag, not a product defect, though a capped headless harness would see the same note.
5. The cheap look used read-only shell reads (`git log --since`, `git grep`, a denied `workflow.py … --help`) besides Read, Glob and Grep. This CLI build had no Grep tool, so `grep` ran through Bash. It is read-only and the snapshots prove nothing was written (J3g).

### 5.4 Fresh-eyes walk of the front door (first-time reader)

What reads well:
- the plain summary;
- section lines that say what each answers;
- the `Cost:` line in words a newcomer follows;
- the run line explaining `quick` and `no-research`;
- the book's two stops;
- the v2's kept, renamed and new marks.

What slows a newcomer:
- the confirmation is about 50 lines, and the 17-line `## Explain` block repeats most of the list above it (machine-facing, decided as drawn by S8);
- the `Phase:` line is a workflow term;
- the book's `subject: P34-n0` and `Phase: Explain: P34-n0` are ids, not words (the title rule covers only the title).

Nothing is dead or broken. These go to the operator as drawn and are not findings.

## 6. Regression checklist inside the boundary

The boundary is `phase-scope P38-e1`, 14 files: the explain skill (3 copies), the 5 agent bodies, `plugin.json`, the setup skill, `plugin/README.md`, `manifest.json`, `tests/test_explain_resolver.py` and `web/src/content/marketing/content.ts`. They feed the plugin (the front door, the run, the agents, setup), the root test suite and the marketing landing's skill pane, nothing else.

| Block (qa.md line) | Lines | Inside / outside | Result |
|---|---|---|---|
| Site build, smoke, recent marker (L237–241) | 3 | outside | no changed file feeds the MkDocs site or the server |
| `workflow.py validate` (L242) | 1 | inside (works/ changed) | pass |
| P28/P30 console, graph, reader, print, library, quiz, annotations, review, visibility, chrome, next (L243–322) | 23 | outside | `content.ts` feeds only the marketing landing; no `web/src` reader or console file changed |
| CLI/API publish dry run (L323) | 1 | outside | `cli/` and `server/` are unchanged |
| Explain skill parity (L326) | 1 | inside | pass |
| Explain front door, headless (L330) | 1 | inside | pass (call a), under the new expectations: replacement line written at merge |
| Explain front door, a repeat (L337) | 1 | inside | pass (fixture: repeat and resume) |
| The verifier's same-model guard (L343) | 1 | inside (verifier body regenerated) | B4 is byte-identical to the merge base, so the guard text is unchanged; the live call was skipped per the plan |
| Explain front door, refusals (L350) | 1 | inside | pass (both fixtures) |
| The landing's skill pane (L355) | 1 | inside | pass: 3347 = "3,347-line" = "3,347 lines" (file check; not walked in a browser) |
| Explain front door, a book (L358) | 1 | inside | pass (call c), under the new expectations (stops wording, title rule): replacement line written at merge |
| Explain skill interface, citation check (L363) | 1 | inside | **not clean:** `missing=2`, against the line's `missing=0`. Both are pre-existing workspace-side `B5 *Your dispatch*` citations, unchanged by this phase (the base also gives 2); J2d |
| Reader wide step and wide table (L368–377) | 2 | outside | the reader is unchanged |
| Private publish gate, visibility toggle, public repo (L378–388) | 3 | outside | the server is unchanged |

That is 41 lines: 9 inside, 32 outside. The proof for the outside count is the diff. `phase-scope` lists no file under `server/`, `cli/`, `docs/` (the site), `web/src/app`, `web/src/components` or `web/src/lib`.

Appended as gate sections (`## Doc impact`, tagged `(gate section — written at merge)`):
- the replacement headless line;
- the replacement book line;
- three new P38-e1 lines: a v2, a full v1, and the explain KB key.

## 7. The `## Doc impact` list

The list covered S1–S9 and F1 in product, operations and qa. Two durable truths were missing, and I appended both:
- **security.md**: the key now sits at rest in a second 0600 file, and the transcript-hygiene rule;
- **architecture.md**: the stage map (D1d, D3v without a batch, D5p before D5, `W` sizing, critic sampling). It supersedes P32's unconsolidated note that D3v dispatches the verifier.

A qa note records that S2's, S7's and F1's checklist notes are carried by the replacement lines, and withdraws F1's `quick` narrowing.

Checked with nothing to add:
- decisions.md: no recorded decision is reversed;
- docs/current: no stale "2,793", plugin version or resolver-output text;
- qa `## Test Commands`: `uv run pytest -q` states no count, and the new test is S1's note.

## 8. Notebook against the logs, and the Operator Questions

- **Decisions.** Every cross-slice decision a `result.md` records is in `## Decisions` or its topic:
  - DECOMP's breakdown, the "no new field", the heading rule and the calibration;
  - S1's header file and `--json` lookup;
  - S4's pick;
  - S5's delta;
  - S6's writer and critic;
  - S7's `Cost:` line and translation.

  The slice-level glosses (S2's uncarriable-section definition, S3's pinned budget, F1's D-F1 to D-F15 wordings) are in the shipped text and their `result.md`, not cross-slice constraints. `validate` reports no dangling pointer.
- **Operator Questions:** one entry, OQ1, routed into the walkthrough as its decision. None is unrouted.
- **Notes for later slices:** all five were for this review. I consumed and removed them; each one's content is routed here (front door: §5; writer gap and create-phase layout: J2; desk check: §2 and §5; F1's class cases: §5.3 and J3).

## 9. Notebook writes (through `phase-section` only)

- `## Doc impact` `--append` ×8: the security and architecture notes, the qa carry and withdraw note, and five gate-section notes (two replacements, three appends).
- `## Notes for later slices` `--entry 5…1 --remove`.
- `## Now` `--replace`.

No Decisions or Operator Questions entry: the review settles no cross-slice decision and raises no new question beyond the walkthrough's OQ1.
