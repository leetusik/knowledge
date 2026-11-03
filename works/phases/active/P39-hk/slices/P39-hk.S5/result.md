# P39-hk.S5 — result

## Verdict

- status: done
- route: high
- model: opus
- effort: xhigh
- summary: Wrote the bootstrap handoff package for the workspace side of the new explain flow, pinned to bootstrap `bb525b9` (v91): the three explain references rewritten whole; create-phase's explain route rewritten for the sixteen-line `## Explain` set plus a new research route (an ordinary phase, no engine change); patch notes for the executor's carve-out (the writer dispatches no agent), the seed doc, README, installer line and smoke pins; and `handoff-explain.md` with the version handshake (bootstrap v92 first, then plugin 0.10.0). Applied on a scratch copy, the patched smoke pins pass and every cited plugin section exists.
- files_changed:
  - works/phases/active/P39-hk/package/README.md (new)
  - works/phases/active/P39-hk/package/PATCHES.md (new)
  - works/phases/active/P39-hk/package/claude/skills/do-whole-phase/reference/explain-decomposition.md (new)
  - works/phases/active/P39-hk/package/claude/skills/do-whole-phase/reference/explain-chapter.md (new)
  - works/phases/active/P39-hk/package/claude/skills/do-whole-phase/reference/explain-review.md (new)
  - works/phases/active/P39-hk/package/claude/skills/create-phase/explain-route.md (new)
  - works/phases/active/P39-hk/package/claude/skills/create-phase/research-route.md (new)
  - works/phases/active/P39-hk/package/checks/finds.py, cites.py, apply.py (new)
  - works/phases/active/P39-hk/handoff-explain.md (new)
  - works/phases/active/P39-hk/phase.md (through phase-section only)
  - works/phases/active/P39-hk/topics/notes-for-later-slices.md (through --to-topic only)
  - works/phases/active/P39-hk/slices/P39-hk.S5/result.md (this file)
- validation:
  - `git -C <bootstrap> status --porcelain` empty before and after (0 lines); HEAD `bb525b9` before and after: pass
  - `package/checks/finds.py <bootstrap> bb525b9`: finds checked=18, not-exactly-once=0: pass
  - `package/checks/cites.py plugin/skills/explain/SKILL.md <the five package texts> handoff-explain.md`: citations checked=113, bold parts 15, missing=0: pass
  - `cites.py` over a fresh scratch install built from the patched copy (`.claude/**/*.md`, `docs/current/operations.md`): citations 218, bold parts 28, missing=0: pass (baseline: this repo's vendored v91 `.claude/` against the 0.10.0 skill, missing=85 of 200)
  - `package/checks/apply.py <scratch copy of bootstrap payload/, installer/, README.en.md, tests/retrofit_smoke.sh>`: the patched smoke explain block (L206–L297) and the unchanged pins on the same files pass; skill count 19: pass
  - scratch `python3 installer/build.py`: artifact written; fresh `--at-root` install: the three references byte-identical in both do-* skills and equal to the package's, both routes in create-phase, the new carve-out, no explain-critic.md, `validate` passed: pass
  - `git grep -n -E "web-researcher|code-researcher|gap-reviewer|knowledge:verifier|no-research|run: (full|quick)" -- works/phases/active/P39-hk/package` (run as `grep -rn`, the files are untracked): 0 hits in the five shipped texts; hits only in PATCHES.md (Find blocks of text to delete, the smoke's absence asserts, a Why line, the release note's "Gone:", the verification grep), README.md L49 (the crosswalk's deleted heading) and handoff-explain.md L89 (the loop that keeps them out): pass under the plan's "instruction to delete" rule
  - `git status --porcelain`: only this slice's set, its result.md, phase.md and the notes topic (plus the orchestrator's start-slice files: backlog.md, events.jsonl, slice.json, plan.md): pass
  - `python3 scripts/workflow.py validate`: passed (warnings pre-existing: Decisions entry 5 long, consolidation_owed, stale_docs, oversized sections)
  - deferred: the bootstrap's full `bash tests/retrofit_smoke.sh` and `build.py --check` run in the bootstrap session (PATCHES.md 10–11); this slice may not touch that repo
- deviations:
  - The plan's "workspace's own `explain-critic` agent" does not exist at `bb525b9` (retired in v81; the critic is the plugin's). Its changes (no `scratch:`, `trace:` for `ledger:`) land in explain-chapter.md's dispatch blocks; no file for it.
  - Added `package/checks/` (three scripts, not shipped) so REVIEW and the bootstrap session can re-run the checks; scratch dies with the slice.
  - A third `## Decisions` gist (D85-qk's settlements) beside the plan's two, so the critic-model reversal is in the notebook, not only here.
  - D85-qk (d) settled too (the plan named a, b, c).
  - The smoke suite was validated by running its patched explain block on a scratch copy, not the whole bootstrap suite.
- doc_impact: `- **(P39-hk.S5)** qa.md, decisions.md, operations.md: the plugin's front-door readiness test becomes workspace v92 plus a **phases** field (qa.md's v86 and **unit** lines); the workspace's explain critic runs on the other model family, reversing v75's opus pin; plugin 0.10.0 and bootstrap v92 need each other, released bootstrap-first; a subject no phase covers gets a research phase whose findings a later explain reads`

## The bootstrap pin

`git -C /Users/sugang/projects/personal/bootstrap_agentic_workspace.sh log --oneline -1` →
`bb525b9 test(smoke): give the loop probe's repo a git identity of its own`; `CHANGELOG.md` top section
`## v91 — 2026-11-02`; `installer/main.py` `WORKSPACE_VERSION = 91`. Read only: snapshots via
`git show HEAD:<path>` and plain `cp -R` copies into the session scratchpad; nothing edited, staged or
committed there. `status --porcelain` was empty at the start and at the end.

## The survey (what the new flow invalidates at `bb525b9`)

- `payload/claude/skills/create-phase/SKILL.md` L121–L210, *The explain route*: the 17-line set with `run:`
  and `mode:`, the `general` mode, subject books, the 0.6.0 floor, the cost line "tens of research agents",
  §3.2 *D0b: the preflight*, the search cap, the evidence-gate stop, *A confirmed proposal*'s no-`unit`
  0.6.0 branch, what DECOMP cuts (§9.2/§9.3 old headings, `summary.md`, top-ups). L33 needs a research
  pointer. Steps 3, 4.2, 4.4, 5 unaffected.
- `payload/claude/skills/do-whole-phase/reference/explain-{decomposition,chapter,review}.md`: the research
  run throughout (the lead, waves, probes, `run.md`, D0b–D5g, gap rounds, `library.md`/`ledger.md`, the
  freeze of those, the `sources` chapter, `run:` branches, the evidence gate, `gaps/final.md`,
  `summary.md`, the opus + `same-model: accepted` critic, `scratch:`). Shared into `do-next-slice/` by
  `SHARED_SKILL_FILES` (build.py L96–L99), never sourced there.
- `payload/claude/agents/slice-executor.md` L33 (the carve-out naming the four research agents and probes)
  and L78 (the Never item).
- `payload/claude/skills/do-whole-phase/reference/worktree.md` L5 ("long full run", research permissions,
  the preflight's rules) and L8 (pages cache "whose passages the committed findings quote");
  `parallel-phase/SKILL.md` L81 and L382 (the same two).
- `installer/payloads/doc_bodies/operations.md` L55–L60 and `README.en.md` L541–L545 ("researched", 0.6.0,
  preflight, search cap, *Explain: permissions and the search cap*, the stale "until the plugin's next
  release"); `installer/main.py` L3112–L3113 (0.6.0+, the same stale clause).
- `tests/retrofit_smoke.sh` L229–L238, L250, L266–L273: pins on the 0.6.0 floor, the opus critic,
  `slice: <P>.DECOMP`, `STOPPED: evidence gate`, `run.md`, §3.9, `critique: none (quick)`, "Run
  `/do-whole-phase` to research and write it.", §9.2's old heading.
- Not affected: `payload/scripts/workflow.py` (reads only `- unit:`; `explain_unit`, `explain_phase`), both
  `do-*` cores (they name the three references), both decomposition and review twins (per-unit gates and
  the pointer), `review-phase`, `contract.md`, `wave.md`, `update-workspace` (its v65–v80 migration note
  is history), `installer/README.md`, `README.md` (no explain block). `RETIRED_FILES` gains nothing.

## Decisions taken here

- **The research-phase route** (open design, this slice's): an ordinary phase, no engine change and no new
  `intent.md` section. The plugin's `Research: <subject>` block is confirmed (name `Research: <subject>`,
  an objective) at step 3, recorded verbatim under *Original Input* and line by line under *Confirmed
  Intent*; its `DECOMP` cuts `--kind research --risk high` slices that read only this repository (code,
  comments, `git log`/`git blame`, never the web) and record findings as `## Decisions` gists naming the
  paths plus `topics/` detail cited `path:L<a>-L<b>@<sha>` (B9's form) with `Not found:` lines; gate
  waived; no Doc impact unless a finding shows a current doc wrong. **Why no marker:** the plugin's
  coverage lookup (§1 *The phases that cover the subject*) greps `intent.md`/`phase.md` for the subject's
  files and names, which the `paths:` line and the gists already carry; its commit-scope half cannot find a
  research phase (its commits touch only its phase folder), and a marker would add nothing either half
  reads. The `## Explain`-style marker would also be a second thing the engine might one day need to know.
- **The version handshake:** the package targets the next bootstrap release after v91 (v92 expected;
  `--release` stamps it). Plugin 0.10.0's front-door step 2 tests `workspace_version` **92 or later** and a
  create-phase `## The explain route` listing `**phases**` (a field only this route writes). The workspace's
  floor is plugin 0.10.0 (create-phase refuses an older plugin's proposal, recognised by `run:`/`mode:` and
  no `phases:`, creating nothing; `DECOMP` stops `operator-action` on an older registry entry). **Order:**
  bootstrap v92 released and pushed first, then P39-hk merges and pushes 0.10.0, then `/update-workspace`
  here; the reverse would have 0.10.0 tell every workspace to update to a release that does not exist.
  Raised as OQ8 for the operator to confirm.
- **Legacy `## Explain` sections** are read, never refused: v86–v91 (`run:` ignored, `mode: general` a
  decision stop, `phases:` found by DECOMP and written in), no `unit` line (a book, as before).
- **A document's DECOMP keeps D0 + D1 + D6** (brief, evidence, outline) and `S1` keeps D7–D8, so the outline
  sign-off (`on`) still signs D6 before the write, the smoke pins on the document branch hold, and the
  plugin's §3.3 resume table works on one dossier.
- **Answers live in the plugin's record** (`answers.md`, `answers-<key>.md`, B9), not in `result.md`'s old
  `## Critique answers`; the review reads disputes there.
- **Dropped:** the optional `sources` chapter (it listed `library.md`, which is gone; each chapter has its
  own `## Sources {#sources-list}`), `summary.md`, the chapter gate, the top-up, `run: quick`.

## D85-qk, item by item

- **(a) the critic-model pin: settled** in `explain-chapter.md` *The critic's model*: `model: sonnet` for
  an Opus writer, `model: opus` otherwise, never `same-model: accepted` (replaces v75's opus pin; matches
  plugin §4.10 step 1 and B5 *Your model*, and intent C's "a critic on a second model").
- **(b) create-phase's confirmation layout: settled** in `explain-route.md` step 2: the route shows the
  front door's step-7 shape (plain summary, reader, sections, other shapes, `Built by:`, `Cost:`, the
  block, `Why:`), drawn from the installed skill, with a head-and-tail skeleton for orientation.
- **(c) explain-review step 1: settled** in `explain-review.md` (and the chapter file's freeze check):
  `evidence.md` may grow by appended entries (a writer gap at D7, a fix at D8), checked as "only added
  lines, bar the counts line"; `ledger.md`/`verify/` no longer exist.
- **(d) the B5 *Your dispatch* citation: settled**: cited as "B5 *Critic (`knowledge:explain-critic`)*, its
  *Your dispatch*", so the citation check finds the heading (the old `missing=2` baseline).
- **(e) a translation as a write slice** and **(f) explain reviews on the mid row: not touched**; they stay
  open on D85-qk.

## Notebook (phase.md, through phase-section)

- `## Decisions`: three gists appended (*The research-phase route (S5)*, *The version handshake (S5)*,
  *D85-qk in the package (S5)*).
- `## Notes for later slices`: removed the consumed S5-bound entries (from DECOMP for S5; from DECOMP for
  S1–S5; from S1, S2, S3, S4 for S5); added one for DECOMP2's release slice (moved whole to
  `topics/notes-for-later-slices.md` § *Notes for later slices 16 (2)*, pointer left) and one for REVIEW.
  Kept *(from DECOMP, for S1–S5 and REVIEW)* (D86-sd/D85-qk), which REVIEW still needs.
- `## Doc impact`: one line (above). `## Operator Questions`: **OQ8** (the release order). `## Now`:
  rewritten, "Next: DECOMP2 (gated)". Budgets after: Decisions 11,249/12,288 (entry 5, pre-existing, is
  the only long one), Notes 4,993/6,144, Now 1,094/2,048, total 25,410/40,960.

## Notes

- The P33-n3 citation check regresses on this repo's vendored `.claude/` since S2 (expected; recorded,
  not chased): `missing=85` of 200 against the current skill. `/update-workspace` to v92 clears it.
- If DECOMP2's skill §4 slice renames a heading the package cites, re-run `package/checks/cites.py` before
  the operator applies the package; in §4 it cites §4 itself, §4.2 and §4.6–§4.10 (and §4's bold
  *Standalone*).
