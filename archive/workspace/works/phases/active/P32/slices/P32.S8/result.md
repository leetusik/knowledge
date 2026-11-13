# P32.S8 result: the bootstrap package

- **status:** done
- **tier:** high
- **model:** opus
- **effort:** xhigh
- **summary:** Wrote the package in `works/phases/active/P32/package/`, text-anchored at bootstrap `main` = `1f4aa7d` (v73). It puts the bootstrap's explain phase on P32's pipeline. The `DECOMP` runs the whole-book research (§9.2) before the outline, and each chapter gets its top-up (§9.3). F1's reader tasks are carried through the outline and the chapters, and the plugin's `knowledge:explain-critic` (`kind: chapter`) judges each chapter. The package also carries the OQ3 handoff, the OQ2 carve-out and the critic's retirement by content. The release is a `changelog.d/` fragment. Every anchor is found exactly once at the five heads `main` passed through.
- **files_changed:**
  - `works/phases/active/P32/package/README.md` (new)
  - `works/phases/active/P32/package/PATCHES.md` (new)
  - `works/phases/active/P32/package/claude/skills/do-whole-phase/reference/explain-decomposition.md` (new)
  - `works/phases/active/P32/package/claude/skills/do-whole-phase/reference/explain-chapter.md` (new)
  - `works/phases/active/P32/package/claude/skills/create-phase/explain-route.md` (new)
  - `works/phases/active/P32/slices/P32.S8/result.md` (this file)
  - `works/phases/active/P32/phase.md` (Decisions: d37 corrected, d63 added; Notes; Now)
  - `works/phases/active/P32/topics/build-decisions.md` (d63 appended)
- **validation:**
  - anchor counts at `86ec6fa`, `22529b4`, `a484241`, `8789a2f` and `1f4aa7d`: every anchor 1, and `must-cover` 0 as expected (table below). PASS
  - blob ids of the patched files at `1f4aa7d`: as `PATCHES.md` names them. PASS
  - the patches applied in memory to `git show 1f4aa7d:` texts, with the smoke suite's existing and new prose pins checked. PASS
  - the README file table matches `find`: True. PASS
  - every skill section the package cites exists in `plugin/skills/explain/SKILL.md`: none missing. PASS
  - bootstrap `git status --short`: empty at the start and at the end. PASS (see *The bootstrap's working tree*)
  - `git diff --stat` / `git status`: my edits are only under `works/phases/active/P32/`. PASS
  - `python3 scripts/workflow.py validate`: "Workflow validation passed" (pre-existing warnings only). PASS
  - not run, because the bootstrap is read-only and the rules forbid running its installer: `build.py`, `--check`, `retrofit_smoke.sh`, a fresh install
- **deviations:**
  1. **Re-anchored to `1f4aa7d`, not `86ec6fa`.** `main` moved four times during the slice: `22529b4`, `a484241`, `8789a2f`, then `1f4aa7d`, the v73 release. The plan says to anchor to the new head; the anchors are counted at all five.
  2. **The release is a `changelog.d/` fragment landed by `build.py --release`**, not a CHANGELOG section with the next free version. This is the bootstrap's own rule since `71a79fa`, released in v73.
  3. **The orchestrator dispatches the critic in the background, not the foreground.** The workspace dispatches every span in the background (`reference/verdicts.md`, pinned by smoke). §4.10's foreground rule belongs to the plugin's lead under `claude -p`, and the reference says so.
  4. **The retired critic moves to a fixture, `tests/fixtures/v73/explain-critic.md`.** It is not deleted outright, because the smoke suite never reads git history (v66's test plants `tests/fixtures/v65/` the same way).
  5. **`RETIRED_FILES` also carries v65's text hashes**, so a host still on v65 is classified by content.
  6. **The minimum bootstrap is v73 (`1f4aa7d`), not `86ec6fa`.** The anchors hold from `86ec6fa`, but sections 8 and 9 need v73's release process.
- **doc_impact:** none. The package is phase material; the durable docs change when the bootstrap ships it.

## Anchor counts

Each anchor is in `PATCHES.md`, counted with `git show <commit>:<file>`. A substring count is used, or a whole-line count where the anchor is a line.

| # | file | 86ec6fa | 22529b4 | a484241 | 8789a2f | 1f4aa7d |
|---|---|---|---|---|---|---|
| 1a | `payload/claude/skills/create-phase/SKILL.md` | 1 | 1 | 1 | 1 | 1 |
| 1b | `payload/claude/skills/create-phase/SKILL.md` | 1 | 1 | 1 | 1 | 1 |
| 1c (`## The explain route`, a line) | `payload/claude/skills/create-phase/SKILL.md` | 1 | 1 | 1 | 1 | 1 |
| 1c `must-cover` (absent before; the route adds it) | `payload/claude/skills/create-phase/SKILL.md` | 0 | 0 | 0 | 0 | 0 |
| 4a | `payload/claude/skills/do-whole-phase/reference/explain-review.md` | 1 | 1 | 1 | 1 | 1 |
| 4b | same | 1 | 1 | 1 | 1 | 1 |
| 4c | same | 1 | 1 | 1 | 1 | 1 |
| 4d | same | 1 | 1 | 1 | 1 | 1 |
| 5a | `payload/claude/agents/slice-executor.md` | 1 | 1 | 1 | 1 | 1 |
| 5b | same | 1 | 1 | 1 | 1 | 1 |
| 6b | `installer/build.py` | 1 | 1 | 1 | 1 | 1 |
| 6c `MANAGED_FILES` | `installer/main.py` | 1 | 1 | 1 | 1 | 1 |
| 6c `NESTED_AGENTS` | same | 1 | 1 | 1 | 1 | 1 |
| 6c comment | same | 1 | 1 | 1 | 1 | 1 |
| 6c `write_text` | same | 1 | 1 | 1 | 1 | 1 |
| 6c print, agent | same | 1 | 1 | 1 | 1 | 1 |
| 6c print, `(plugin 0.5.0+)` | same | 1 | 1 | 1 | 1 | 1 |
| 6c print, book | same | 1 | 1 | 1 | 1 | 1 |
| 6c `RETIRED_FILES` insertion point | same | 1 | 1 | 1 | 1 | 1 |
| 6d | `payload/claude/skills/update-workspace/SKILL.md` | 1 | 1 | 1 | 1 | 1 |
| 6e critic clause | `README.en.md` | 1 | 1 | 1 | 1 | 1 |
| 6e agent count | `README.en.md` | 1 | 1 | 1 | 1 | 1 |
| 6e plugin version | `README.en.md` | 1 | 1 | 1 | 1 | 1 |
| 6e tree | `README.en.md` | 1 | 1 | 1 | 1 | 1 |
| 6e Korean count | `README.md` | 1 | 1 | 1 | 1 | 1 |
| 6e agents path | `installer/README.md` | 1 | 1 | 1 | 1 | 1 |
| 6e no-row clause | `installer/README.md` | 1 | 1 | 1 | 1 | 1 |
| 6f | `installer/payloads/doc_bodies/operations.md` | 1 | 1 | 1 | 1 | 1 |
| 7a start | `tests/retrofit_smoke.sh` | 1 | 1 | 1 | 1 | 1 |
| 7a end | same | 1 | 1 | 1 | 1 | 1 |
| 7b (a line) | same | 1 | 1 | 1 | 1 | 1 |
| 7c (a line) | same | 1 | 1 | 1 | 1 | 1 |

The 7a block is lines 1159–1163 (5 lines) at all five commits.

- **`WORKSPACE_VERSION`:** 72 at the first four commits, 73 at `1f4aa7d`.
- **`changelog.d/`:** at `8789a2f` and `1f4aa7d` it holds only `README.md`; it does not exist before `8789a2f`.
- **`tests/fixtures/`:** only `v65/` at every commit, so `v73/` is free.

`git grep -l explain-critic 1f4aa7d` lists `CHANGELOG.md` (history, untouched) and the built bundle (rebuilt). Every other file it lists is covered by sections 1–3 and 6–7.

## Blob ids at `1f4aa7d`

| File | Blob | PATCHES section |
|---|---|---|
| `payload/claude/skills/do-whole-phase/reference/explain-decomposition.md` | `5ec0227` | 2 (replaced whole) |
| `payload/claude/skills/do-whole-phase/reference/explain-chapter.md` | `1b48cf6` | 3 (replaced whole) |
| `payload/claude/skills/do-whole-phase/reference/explain-review.md` | `1adcdae` | 4 |
| `payload/claude/agents/slice-executor.md` | `74df07a` (was `c3f459c` until `a484241`) | 5 |
| `payload/claude/agents/explain-critic.md` | `474adc9` | 6a |
| `payload/claude/skills/create-phase/SKILL.md` | `7086cc0` | 1 |

## `RETIRED_FILES` hashes

| Text | Plain (at-root) | Nested (`nested_rewrite()`, no renames) |
|---|---|---|
| v66–v73: `8fa6476`, blob `474adc9` | `f82cbdcb86cf9d37356ed6378ccbc5f3b3a83b2ccd90233eba647496bb98cf65` | `7a59c619824460c8532da58fb25943bafd23c3a78b4259977567e779d3a84aff` |
| v65: `d0759a4`, blob `a9f5545` | `2c66e29d087b3ce4990323c9ce3c6d290a7bd38334f9760ef253c15ede6deb58` | `118e9d3b8478b14f237e0216631cfa213c11e0cb12184bdc0fd6a110d60acd53` |

- **Plain hashes:** `git show <c>:payload/claude/agents/explain-critic.md | shasum -a 256`. The v66–v73 hash was re-checked at `1f4aa7d`.
- **Nested hashes:** computed with the three nested regexes copied from `installer/main.py`. Those regexes are identical at `d0759a4` and `1f4aa7d`; the v73 release changed only `WORKSPACE_VERSION` in `main.py`.
- **Cross-check:** the v66–v73 nested hash equals the hash of the bootstrap's own installed `.claude/agents/explain-critic.md`, an untracked file I read but did not change.

## The package's files

Matches `find works/phases/active/P32/package -type f`.

| Package file | Bytes | Goes to |
|---|---|---|
| `README.md` | 13,167 | not shipped |
| `PATCHES.md` | 33,700 | not shipped |
| `claude/skills/do-whole-phase/reference/explain-decomposition.md` | 14,548 | replaces the payload file (shared into `do-next-slice/` by the build) |
| `claude/skills/do-whole-phase/reference/explain-chapter.md` | 12,900 | replaces the payload file (shared the same way) |
| `claude/skills/create-phase/explain-route.md` | 7,875 | not a file: its text replaces `## The explain route` through the end of create-phase's `SKILL.md` (PATCHES 1c) |

## How it was checked, for S9 or a re-pin

All of this was done with throwaway scripts in my scratchpad, which do not survive the slice. They read the bootstrap only through `git show`, `git ls-tree` and `git grep` at a commit.

1. **Anchor counts.** For each "Find" in `PATCHES.md`, count it in `git show <commit>:<file>`. Use the whole-line count where PATCHES says "the line", the substring count otherwise. Each must be 1.
2. **In-memory apply.** Take `git show 1f4aa7d:` of `create-phase/SKILL.md`, `explain-review.md` and `slice-executor.md`, and apply 1a–1c, 4a–4d and 5a–5b as string replacements. The 4a, 4b and 5a blocks come from PATCHES' fenced blocks. Then assert on the results:
   - smoke Test 0's existing pins: `## The explain route`, `## Explain`, the create-phase invocation sentences, no `[--depends-on`, and the slice-executor pins and retired words;
   - the new 7c pins;
   - no `run_in_background: false` and no bare `explain-critic` in the four texts.

   All held.
3. **The README table.** The package's file list from `find` equals the table's first column.
4. **Cited sections.** Every `§N` and `B5` the package cites is a heading in `plugin/skills/explain/SKILL.md`.

## The bootstrap's working tree

- **At the start of the slice:** `git status --short` was empty.
- **Midway:** it showed ` M CHANGELOG.md`, ` M bootstrap_agentic_workspace.sh` and ` M installer/main.py`. Those are exactly the files `build.py --release` writes, so this was another session making the v73 release, which then landed as `1f4aa7d`.
- **At the end:** empty again.

Every command I ran there was read-only: `git show`, `git grep`, `git ls-tree`, `git log`, `git diff` between commits, `git status`, and `shasum` on `git show` output.

## Notes

- **Notebook.** Decisions d37 was corrected in place and d63 added, with the full d63 entry in `topics/build-decisions.md`. In Notes, the three S8 notes were removed and S8→S9 and S8→S10 notes added; the Rules and DECOMP2→S10 pins were updated to `1f4aa7d`. Now was rewritten. `phase.md` is 37,570 B.
- **Known gap, for S10.** The plugin's §1 places a slice's book by phase number (`p<N>`). The bootstrap's minted ids (`P-7kq2`) have no number, so the route suggests `p-7kq2` for the operator to confirm. Teaching §1 minted ids is a plugin change.
- **Open for S9's plan.** Applying the package to a scratch export of the bootstrap would test PATCHES 6–7 live (build, `--check`, smoke, a fresh install, `--update` against the fixture). The Rules note forbids running the bootstrap's installer, so that is the orchestrator's call.
