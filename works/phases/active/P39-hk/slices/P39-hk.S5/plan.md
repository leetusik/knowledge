# P39-hk.S5 — the workspace handoff: the explain route for the new flow, and the research-phase route

## Context

The plugin's explain skill (`plugin/skills/explain/SKILL.md`) now runs the new flow (S1–S4):
- one confirmation, with a concrete reader and a subject-shaped outline;
- codebase-only, with a coverage lookup and a research-phase offer when no phase covers the subject;
- one writer reads the code at one commit and the covering phases' records into `evidence.md`;
- every sentence traces to that evidence;
- the writing rules are visuals-first;
- a critic checks the draft against the code and the records;
- the research agents are gone.

The **workspace side** of that flow is not in this repo's source. Two route documents carry it:
- `create-phase`'s *The explain route*;
- `do-whole-phase` / `do-next-slice` `reference/explain-{decomposition,chapter,review}.md`.

Two more files belong to it:
- `slice-executor.md`'s explain carve-out;
- the workspace's own `explain-critic` agent.

All of these live in the bootstrap template repo, `/Users/sugang/projects/personal/bootstrap_agentic_workspace.sh`, under `payload/claude/`. The copies in this repo's `.claude/` are vendored, and this phase never edits them.

The operator's addition C (`works/phases/active/P39-hk/intent.md` § *Scope Added at Execution*) names the workspace's explain route as a landing place.

**This slice writes a handoff package, as P31 did.** It edits nothing in the bootstrap repo and commits nothing there. The operator's bootstrap session applies the package, and `/update-workspace` later brings it here. The precedent to follow is `works/phases/active/P31/`: `handoff-explain.md`, `package/README.md`, `package/PATCHES.md` and the mirrored files.

It runs **alone** (no wave). It writes its own `phase.md` entries through `phase-section`.

## Read first

- `python3 scripts/workflow.py phase-section P39-hk Decisions`: every S1–S4 line, especially *The `## Explain` field set*, *Research-phase hand-off*, *The evidence model*, *v2 from phases*, *Books from phases*, *The critic's inputs* and *Research machinery retired*, plus the DECOMP line *The release is plugin 0.10.0*.
- `python3 scripts/workflow.py phase-section P39-hk "Notes for later slices"`: every entry addressed to S5 or S1–S5. The pointer lines lead into `works/phases/active/P39-hk/topics/notes-for-later-slices.md`; read the blocks `(from DECOMP, for S5)`, `(from S1, for S5)`, `(from S2, for S5)`, `(from DECOMP, for S1–S5)` and `(from DECOMP, for S1–S5 and REVIEW)` there. Read S3's and S4's S5 notes inline.
- `works/phases/active/P39-hk/topics/breakdown.md` → `## P39-hk.S5`, which holds the pins.
- `works/phases/active/P39-hk/topics/skill-headings.md`: the crosswalk of every plugin heading S1–S4 changed.
- `works/phases/active/P39-hk/topics/evidence-model.md`: the evidence model to mirror.
- The plugin skill as it stands now, by heading, for every section the route cites.

## The work

1. **Pin the bootstrap.** Record its HEAD (`git -C <bootstrap> log --oneline -1`; it was `bb525b9`, workspace v91, when this plan was written) and its version from `CHANGELOG.md`. Read only. **Never** edit, stage or commit there. Every quoted line and line number in the package is taken at that HEAD.
2. **Survey the payload** for every line the new flow invalidates:
   - `payload/claude/skills/create-phase/SKILL.md` *The explain route*;
   - `payload/claude/skills/do-whole-phase/reference/explain-{decomposition,chapter,review}.md` and how they are shared into `do-next-slice` (P31's README says "shared by the build");
   - `payload/claude/agents/slice-executor.md`'s explain carve-out;
   - `payload/claude/agents/explain-critic.md` (the workspace's critic);
   - any other payload, seed doc, installer or smoke-test line naming the research agents, `run: full|quick|no-research`, a research ledger, gap rounds, the evidence gate, general mode or subject books.

   Use `git -C <bootstrap> grep`.
3. **Write the package** under `works/phases/active/P39-hk/package/`, mirroring `payload/` (`package/<path>` → `payload/<path>`):
   - Rewritten whole files where most of a file changes, e.g. the three explain references if they change wholesale.
   - **`package/PATCHES.md`**: every edit to a file the bootstrap already has, found by **quoted unique text** with line hints at the pinned HEAD.
   - **`package/README.md`**: the files, where each goes, the order, which slice wrote it.
   - What it must carry:
     - **create-phase's explain route:** the one confirmation; S1's 16-line `## Explain` set (no `run:`, no `mode:`, a new `phases:`); the confirmed-proposal check asking for no dropped field; the cost line (one writer plus one critic); the plugin minimum **0.10.0**.
     - **The research-phase route**, which is open design and this slice's to decide, once, in the smallest form. It covers how a research phase offered by the explain's front door is created (S1's `Research: <subject>` block: subject, paths, question, findings-only: yes, then: the explain only when the operator asks again), how it is cut (`research` slices, findings only, into its `topics/`), and how it is recorded so a later explain finds it through `phases:` (the S1 coverage lookup: commit scopes and `intent.md` / `phase.md` mentions). **Prefer no engine change**, as P31 did: if an ordinary phase with research slices and the right `intent.md` lines already meets this, say so and only add the route text.
     - **explain-decomposition:** a book's DECOMP reads the whole subject into `book/research/evidence.md` and writes `book/outline.md`, each chapter naming the phases it draws from. There is no research run, team or gate; the outline gate stays if it exists today.
     - **explain-chapter:** a chapter reads its phases closer into `evidence-ch<k>.md`, then the writer drafts, the critic judges once and the writer revises once. No top-up, and no gap check.
     - **explain-review:** read `## Gaps` (not `gaps/final.md`), and allow a write slice's `evidence.md` additions (D85-qk c). There is no `summary.md`. Publishing and privacy stay as they are.
     - **The executor carve-out:** no research roles. The workspace critic's dispatch drops `scratch:` and returns `trace:` for `ledger:`.
   - **Re-cite every plugin section** the route names by number **and** heading, from `topics/skill-headings.md` and the current plugin skill.
   - Settle `D85-qk`'s items where they sit in these files (the critic-model pin, create-phase's confirmation layout, explain-review step 1), and say which in `result.md`.
4. **The version handshake.** Plugin 0.10.0 writes the new `## Explain` set, so it needs a workspace whose route accepts it. Decide and write down, in the handoff:
   - which bootstrap version the package targets (the next release after the pinned one, named as such);
   - what the plugin's front-door step 2 version test (now "v86 plus a `unit` line") must become;
   - the order of the two releases.

   This slice edits no plugin file: leave a **note for DECOMP2's release slice** with the exact change to make in the plugin.
5. **Write `works/phases/active/P39-hk/handoff-explain.md`**, the index, in P31's form:
   - who it is for;
   - the pinned HEAD;
   - what it supersedes;
   - the files to read next, in order;
   - the release notes to write (CHANGELOG / `changelog.d`, as the bootstrap does it);
   - the smoke-test and skill-count consequences;
   - what the operator does after (`/update-workspace` here).

## Validation

- `git -C /Users/sugang/projects/personal/bootstrap_agentic_workspace.sh status --porcelain` is empty before and after, and its HEAD is unchanged.
- Every `PATCHES.md` quoted string is found exactly once at the pinned HEAD. Check each with `git -C <bootstrap> grep -c -F` or a short script, and report the count in `result.md`.
- Every plugin section the package cites exists in `plugin/skills/explain/SKILL.md` by that number and heading. Check them with a short script, and report the count.
- `git grep -n -E "web-researcher|code-researcher|gap-reviewer|knowledge:verifier|no-research|run: (full|quick)" -- works/phases/active/P39-hk/package` finds no hit, unless it is an instruction to delete that text.
- `git status --porcelain` shows only this slice's set, its `result.md` and the notebook.
- `python3 scripts/workflow.py validate` passes.

## Notebook (through `phase-section`; the Notes section is near its 6 KB budget)

- **Decisions:**
  - the research-phase route (one gist line);
  - the version handshake (one gist line).
- **Notes for later slices:**
  - remove every S5-bound entry it consumed;
  - add one for DECOMP2's release slice: the plugin front-door version test, the workspace minimum and the release order;
  - add one for REVIEW: the package is ready for the operator's bootstrap session, and the merge needs the bootstrap release first if the handshake says so.

  Move older consumed notes to the topic with `--to-topic notes-for-later-slices --entry K` if needed.
- **Doc impact:** one line if the workspace-route contract changes durable truth beyond DECOMP's explain-contract line.
- **Operator Questions:** only for a decision only the operator can take. For example, if the handshake forces the merge to wait on a bootstrap release, the order is the operator's to confirm. Number new entries after the highest existing OQ.
- **Now:** S5's landing, then "Next: DECOMP2 (gated)".

## Set

- `works/phases/active/P39-hk/package/**` (new);
- `works/phases/active/P39-hk/handoff-explain.md` (new);
- this slice's `result.md`;
- `phase.md` through `phase-section`;
- `topics/notes-for-later-slices.md` through `--to-topic`.

Nothing else: no plugin file, nothing under `.claude/`, nothing in the bootstrap repo. Scratch checks go in the session scratchpad.

## Dispatch

route=high
reason=risk high (not low)
subagent_type=slice-executor
model=opus
pass_model=yes
effort=xhigh
pass_effort=yes
attribution=Claude Opus 5.5
explore_model=haiku
explore_effort=xhigh
