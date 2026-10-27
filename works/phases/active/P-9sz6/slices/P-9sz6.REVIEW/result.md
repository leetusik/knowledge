# P-9sz6.REVIEW — result

## Verdict

- status: done
- route: high
- model: opus
- effort: xhigh
- review_verdict: pass
- summary: Reviewed both deliverables. handoff.md carries every Confirmed Intent decision, stated as decided and not re-argued. I checked about 90 of its line citations against the bootstrap repo at v83, the plugin at 0.6.0 and this repo's server, and all of them hold, including every citation behind the three worktree collisions. prompt.md (1,558 B) matches the bootstrap CLAUDE.md step by step. Nothing changed outside `works/`, and the bootstrap repo and its nested workflow repo are untouched.
- files_changed: works/phases/active/P-9sz6/slices/P-9sz6.REVIEW/result.md (new); works/phases/active/P-9sz6/phase.md (through phase-section: Notes for later slices −2 consumed REVIEW notes, Now rewritten)
- validation: `python3 scripts/workflow.py validate`: passed (pre-existing warnings only, none for P-9sz6). DECOMP and S1 verdict blocks: both `done`, and both ran `validate` (passed). `git status` / `git diff bb36b15..HEAD --stat`: only `works/` paths. `phase-scope P-9sz6`: product_files=0. The bootstrap repo and its `workflow/` repo: `git status --porcelain` empty, HEAD b7fabb7 (v83) and 8d6ebce, both older than this phase.
- deviations: none
- doc_impact_added: none (no durable truth of this repo changed; `## Doc impact` correctly empty)
- doc_versions: none — deferred to a docs phase (nothing owed)
- explain: not written — run /knowledge:explain P-9sz6 for one chapter, or create an explain phase for a book
- walkthrough: see `## Walkthrough` below (returned verbatim to the orchestrator)
- deferred job to file: "Rewrite the knowledge plugin's explain skill as the explain-phase front door (handoff §7)". Reason: the intent leaves the plugin rewrite to a later phase in this repo. Trigger: the new workflow version ships and `/update-workspace` brings it here.

## Boundary

`phase-scope P-9sz6`: range `bb36b15..2c145ad`, 3 commits, `product_files=0`. The phase's output is `handoff.md` (36,973 B) and `prompt.md` (1,558 B) in the phase folder, plus the workflow records. No product surface is in the boundary.

## Validation

| Check | Outcome |
|---|---|
| `python3 scripts/workflow.py validate` | `Workflow validation passed.` 10 output lines, all pre-existing (P22/P26 kinds, P28–P32 consolidation debt, stale and oversized docs); no P-9sz6 line |
| DECOMP `result.md` verdict | done; validate passed; executor-route and parallel-plan recorded |
| S1 `result.md` verdict | done; validate passed; git status clean in both repos |
| `git diff bb36b15..HEAD --stat` | 17 files, all under `works/` |
| `git status --short` | only the REVIEW slice's dispatch files and engine-regenerated `works/` files |
| bootstrap `git status --porcelain` | empty; HEAD `b7fabb7 build(release): workspace v83` |
| bootstrap `workflow/` `git status --porcelain` | empty; HEAD `8d6ebce` (2026-10-27 00:45, before this phase's creation at 11:44) |

## 1. Faithful to the intent

Each Confirmed Intent decision, and where the handoff carries it:

| Decision (intent.md) | handoff.md | Stated as decided? |
|---|---|---|
| A document by default, book or chapter only when asked; placement confirmed once at the start; no mid-run book question; oversized topic scoped down, book suggested in the report | §2 rows 1–2, §3.1 | yes |
| Every explain is a dedicated phase holding the whole process | §1, §3.2, §4 (research in DECOMP, write/critic in S1, publish in REVIEW) | yes |
| In the current repo's workspace; general topics are the operator's matter | §3.2 ("no special case") | yes |
| Workspace required, no fallback | §2, §3.2, §7 "Goes" | yes |
| One phase per publishable unit: document, book with chapter slices, add-a-chapter, v2 as a new phase pointing at v1 | §3.3, §4 *A v2* / *Add a chapter*, §5 `prior:` | yes |
| Own worktree by default, explain phases only; merges back by itself; a book's merge after acceptance | §3.4 rule and lifecycle table (merge-back row) | yes |
| `/knowledge:explain` creates and runs; one confirmation; only quality stops; an exception like `/rotate-backlog` | §3.5 (contract L19 named) | yes |
| Gate waived for a document, required for a book | §3.6 | yes |
| Outline sign-off off by default, on request | §3.6, §5 | yes (book: S1 reading, see below) |
| Dossier committed except downloaded pages | §2 row, §3.6 | yes |
| The ownership split | §6 table and interface | yes |
| Plugin rewrite left to a later phase in this repo | header, §7 "a later phase; not built now" | yes |
| A closing open-items list | §9, ten items, each with a recommendation | yes |

None is re-argued or softened. Additions the operator did not decide:

- **Three S1 readings** (S1's REVIEW note). Reading 1, that a book keeps its signed outline, is stated as decided in §2's table, §3.6 and §5. Reading 2, that an added chapter's gate is waived, is stated as fact in §2's table but as a recommendation in §3.6 and §9 item 9. Reading 3, that a public-project chapter is refused, is a recommendation in §9 item 8. S1 flagged all three for the operator, so the walkthrough puts them as decisions 1–3, and "accept" makes the text right as written. This is not a finding.
- **A fourth reading**, recorded in S1's `result.md` but missing from its REVIEW note: a document's review reads the result in the reader when an agent account can, and falls back to an API read-back otherwise (§4 table, as a recommendation). I routed it to the decided-as-drawn list.
- **Failure stops** in §3.5: a publish failure stops with `operator-action`; permissions or the search limit stop with `needs_operator`; a dead web is `blocked`. These are failures, not designed pauses, and they keep today's behaviour (`explain-decomposition.md` L68–71). They are in the decided-as-drawn list so the operator sees them.
- **`worktree: no`.** The operator's "default" implies an opt-out. Decided-as-drawn list.
- **The three collisions** are framed as "the workflow author's calls" with recommendations, not as decisions. The walkthrough lists them as decision 4.

## 2. Grounded: the citation spot-check

I grepped and range-read each citation and never read the engine whole. Every one checked is accurate.

- **Collision 1 (busy main):** `workflow.py` L469 `BUSY_PHASE_STATUSES = ("in_progress", "in_review", "pending", "blocked")`. L6922–6926 is the loop that skips parallel phases and appends "the default stream is not quiet". Correct.
- **Collision 2 (consolidation):** L5764, at root, and L6081, nested, both stamp `"consolidation": "pending"` in `execution`. `phase_consolidation()` is at L2555–2580 and falls back to `execution.consolidation`. The review pass at L5388–5400 stamps only `if notes:`. Archive blocks read `phase_consolidation(...) == "pending"` (L2634, L9087). `parallel-phase/SKILL.md` L300–306 says `parallel-consolidated` flips the debt and unblocks archiving. Correct.
- **Collision 3 (nested host branch):** L57–60 `NESTED_HOST_BRANCH_REQUIRED`, L13244 the `--host-branch` argument ("required there"), and `parallel-phase/SKILL.md` L141–156 *Starting in a nested install* (the operator confirms the name). Correct.
- **Engine, other:** L3435–3438 `explain_phase()`; L5195 and L5268 skip the explain declaration rule; L356–363 `SLICE_STOP_KINDS` (`decision`, `operator-action` exist); L6357 `_ignored_worktree_files`; `parallel_start` refuses non-`planned` phases and parallel streams (§8's "nothing retrofits"). Correct.
- **Contract:** L13 (create-phase "when instructed"), L19 (*Making a phase ≠ executing it*, "The one exception, `/rotate-backlog`"), and L49 ("A worktree starts only on the operator's word"). Correct.
- **create-phase:** L9, L11, L31 (the sentence "A single chapter is not a phase: that is the operator's own `/knowledge:explain`." is verbatim at the end of L31), L33, L48, L67–72, L74, L103, L108–118 (eleven fields), L109, L118, L140, L142–145, L143, L153. Correct.
- **rotate-backlog:** L11, L35 (`rotate=refused`), the L48 quote verbatim, and L53–55 (step 4 "continue as `resume`"). Correct.
- **parallel-phase:** L10–20, L27, L39–48, L108–121, L134–137, L166–182, L240–244, the §5 sequence (gate → ExitWorktree keep → merge → parallel-merge-finish → teardown), L265–276, L295–306, L329–333 (`--discard-ignored`), L417–418, L423. Correct.
- **References:** `do-whole-phase/reference/worktree.md` L3; `do-next-slice/reference/decomposition.md` L7 ("always takes `--require`"); `review-phase` L110 and `slice-executor.md` L103 (the pointer string); `explain-decomposition.md` L3, L7, L8, L9, L12–62, L18, L19, L23, L62, L68–71, L73–77; `explain-chapter.md` L60, L78–81, L93, L96–149; `explain-review.md` L56–65, L70, L75. `payload/gitattributes` gives events.jsonl `merge=union`. Correct.
- **Installer and docs:** `installer/main.py` L1362–1365 `_is_explain_path` and L3092–3093 (closing message); `README.en.md` L524–538; `doc_bodies/operations.md` L43–59. The Korean `README.md` has no explain section; its only hit is "Slice folder explains". The smoke test has the pointer at L204 and L199–223. Correct.
- **Plugin (0.6.0, `plugin.json` L3):** run card L22, L24–27, L65–66, L92–93; §1 L103 and L107 (resume); L152 *Where it goes*; L176 *A whole book is a suggestion*; L261 dossier; L294 unfinished-run lookup; §3.3 L459 and L495; §3.9 L704; §4.10 L1122, L1124, L1146–1147; §7 L1320–1327 (the `here` flag is at L116); §8 item 8 L1354; §9.1 L1359, L1361–1363, L1365–1366, L1372, L1389–1397; §9.2 L1405–1408; B5 L1815 *Your dispatch* and L1836 *Inputs* (`kind: document | chapter`; brief, outline and critique paths); B9 L2253–2268. Correct.
- **This repo:** `server/documents_api.py` L414–415, `GET /app/orgs/{org}/{project}/{slug}`, whose docstring promises one identical 404 for private or missing documents. Correct.

Approximate but findable: the smoke range "L347–362" spans wave assertions too. The explain lines are the L347 comment and the L361–362 `--depends-on` assertion. This is not a finding.

## 3. Usable by its reader

A capable bootstrap-repo agent can act on the handoff without this conversation:

- §4 gives the document phase's shape (DECOMP leads the research and cuts one write slice; S1 write → critic → revise; REVIEW publishes and proves privacy), a stage-by-stage map from today's run card, and the `doc/` layout, with the installer's `explain` path pitfall named.
- §5 gives the six new fields with defaults and two complete `## Explain` examples.
- §6 gives the ownership table and a four-step interface.
- §8 gives the migration line in the fragment format.

The ~37 KB length does not hurt this use. The handoff has numbered sections, tables, and a "how to read the citations" note with re-locate-by-heading guidance. Most of its bulk is the citations the reader needs to re-check before editing.

## 4. prompt.md

1,558 B (under 2 KB). It names `handoff.md` by absolute path. It frames the decisions as the operator's, confirmed and not to be re-asked, and the handoff as data, not a rule over that repo ("read `CLAUDE.md` first"). Every step it names is real per the bootstrap `CLAUDE.md`:

- intake through the nested `python3 workflow/scripts/workflow.py` (L3);
- edit `payload/`, never the installed `.claude/` or `workflow/` copies (L7, L11);
- `python3 installer/build.py` with the rebuilt `.sh` in the same commit (L15);
- host commits per `nested-convention` (L20) and workflow state with `git -C workflow` (L3);
- one `changelog.d/<slug>.md` fragment, line 1 `# <summary>`, with a `**Migration notes.**` line (L16; `changelog.d/README.md` L16);
- `--release` only on landing on `main` (L16–17);
- `bash tests/retrofit_smoke.sh` alone (L21).

Observation, not a finding: step 2's "Edit only `payload/`, plus the `installer/` and `README.en.md` prose" is narrower than steps 4–5, which also edit `changelog.d/` and `tests/`. A reader resolves this from the numbered steps.

## 5. Gate stages (acceptance required)

1. **Manifest:** not needed. No product surface is in the boundary and nothing runs, so `## Operator Runtime` and a browser are not used (plan; DECOMP's note).
2. **Open the product:** the phase's product is two text files. I read both whole and checked their claims against the real files (§2 above). I did not rely on S1's report.
3. **First-time reader:** I read `handoff.md` as the bootstrap session would (§3 above). One usability point goes in the walkthrough: the prompt's absolute path breaks once P-9sz6 is archived, which moves the folder. The phase owes no consolidation, so `/rotate-backlog` would archive it at once.
4. **Regression Checklist:** `docs/current/qa.md` has 34 lines; 0 are inside the boundary and 34 outside. The proof is `phase-scope P-9sz6` `product_files=0`, so no changed file feeds any surface. I appended none.
5. **Operator Questions:** the section is empty, so nothing needs routing. The S1 note's three readings go into the walkthrough as decisions 1–3; the fourth reading is in the decided-as-drawn list.
6. **Walkthrough:** below.

## 6. Notebook cross-check

- `## Decisions` has one line (DECOMP's breakdown). S1's `result.md` records readings and findings, not settled decisions. They wait on the operator and were carried by S1's REVIEW note, so none was dropped.
- `## Doc impact` is empty, and none is owed: no durable truth of this repo changed (`docs/` is untouched in the range).
- `## Operator Questions` is empty.

## Walkthrough

**Read two files, then accept.** No product changed.

1. Open `/Users/sugang/projects/personal/knowledge/works/phases/active/P-9sz6/handoff.md`: §2 (today vs. new) and §3 restate your decisions, §4 shows the document phase, and §9 is the author's open list.
2. Open `/Users/sugang/projects/personal/knowledge/works/phases/active/P-9sz6/prompt.md`. To use it, start a Claude Code session in `/Users/sugang/projects/personal/bootstrap_agentic_workspace.sh` and paste the text. Paste it **before P-9sz6 is archived**: archiving moves the folder and breaks the path. The prompt then copies the handoff into the new phase.

**Decisions** (S1's readings, then the worktree collisions):

1. A book keeps its signed outline. "Outline sign-off off by default" covers documents and chapters (§3.6, §5).
2. An added chapter's acceptance gate is waived, like a document's (§3.6, §9.9).
3. A chapter for a book in a public project is refused at the confirmation. The refusal offers to make the project private for the run, or to write a standalone private document (§9.8).
4. "Merges back by itself" collides with today's engine three times. Each is left to the workflow author with a recommendation (§3.4, §9.2–4):
   - (a) `parallel-gate` refuses while main is busy → an engine-checked exemption when the branch touches only its phase folder and `works/`;
   - (b) every worktree phase owes consolidation even with no notes → a no-notes pass flips the debt to done;
   - (c) a nested install demands `--host-branch` → a detached host worktree.

"accept" signs 1–4. §9 still lists items 8–9 as the author's call, so hold the bootstrap session's report to decisions 2–3.

**Decided as drawn:**

- create-and-run lives in create-phase's explain route (§9.1)
- a blocked auto-merge leaves the branch unmerged and `next` prints `merge_ready=<P>` (§9.5)
- a document's DECOMP researches, then cuts one write slice (§9.6)
- an explain asked from inside a phase worktree is refused (§9.7)
- executors cite plugin sections by heading too (§9.10)
- a document's review reads it in the reader with an agent account, else through an API read-back (§4)
- `worktree: no` opts a run out
- failure stops stay: publish failure, permissions, search limit, dead web
- older explain phases read `unit: book`
- the minimum plugin stays 0.6.0; until its next release, the plugin keeps writing single documents on its own engine (§8)

**File:** the deferred job "Rewrite the plugin's explain skill as the front door (handoff §7)". Trigger: the new workflow version arrives via `/update-workspace`.

## Notebook entries written

- `## Notes for later slices`: removed the two entries addressed to REVIEW (consumed: DECOMP's "no product files, gate is reading the handoff", and S1's three readings, now in the walkthrough).
- `## Now`: rewritten to describe the review's pass and the open gate.
- No `## Decisions`, `## Doc impact` or `## Operator Questions` entry.
