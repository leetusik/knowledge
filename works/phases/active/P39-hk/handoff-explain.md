# Handoff to the bootstrap workspace: explain from the phases, and the research route

For the agent working in the bootstrap repo (`bootstrap_agentic_workspace.sh`). Written 2026-11-03 from the
knowledge repo (`leetusik/knowledge`), phase P39-hk, slice S5. It is an **index**: the detail lives in the
package, and this note says what to read, in what order, what to release, and what the knowledge repo does
afterwards.

**Pinned bootstrap HEAD: `bb525b9` (workspace v91, 2026-11-02).** Every bootstrap line number in the
package was read at that commit, and every quoted find in `PATCHES.md` occurs exactly once there
(`package/checks/finds.py`). If HEAD has moved, find each edit by its quoted text and re-run that check.

## 1. What this changes, and why

The operator's word for the explain (P39-hk's `intent.md`, *Scope Added at Execution*, C): "all of the
explains will cover based on only what the codebase does. no new things. and don't try to research by
explainer self. just embrace the what phases are did. if a subject is in code but no dedicated phase, maybe
you suggest research phase first, and then explain." The knowledge plugin 0.10.0 does that on its side
(P39-hk.S1–S4): one confirmation with a concrete reader and a subject-shaped outline; codebase-only; one
writer who reads the code at one commit and the covering phases' records into `evidence.md`; every sentence
traced; visuals first; a critic on a second model; no research agents. This package is the workspace side:
the explain route, its three references and the executor's carve-out, rewritten for that flow, plus *The
research route* for "research first".

## 2. What it supersedes

- **P31's package**, for the files it introduced: the three explain references are replaced whole, and
  create-phase's `## The explain route` (P31's text as v86 and v89 revised it) is replaced to the end of the
  file. P31's handoff stays as the record of how the explain phase came to be.
- **v86's `## Explain` field set** (seventeen lines with `run:` and `mode:`): now sixteen, with `phases:`.
- **v75's critic rule** (`model: opus` with `same-model: accepted` for every chapter): now the other model
  family from the writer's.
- **The plugin floor 0.6.0**: now **0.10.0**.
- Nothing else: the pointer line, the worktree exception and the merge back, the gates per unit, the
  publish and the privacy proof are unchanged.

## 3. Read next, in this order

All under `works/phases/active/P39-hk/` in the knowledge repo:
1. `package/README.md`: the files, where each goes, the order, the minimums, the citation crosswalk, and
   how the package was checked.
2. `package/PATCHES.md`: every edit to a file you already have (sections 1–8), the release fragment (9), the
   release (10) and the verification (11).
3. The five texts it names: `package/claude/skills/do-whole-phase/reference/explain-{decomposition,chapter,review}.md`
   and `package/claude/skills/create-phase/{explain-route,research-route}.md`.
4. `package/checks/` if you want to re-run the checks (`finds.py <your repo>`, `apply.py <a scratch copy>`,
   `cites.py <the plugin's SKILL.md> <files>`).

## 4. The version handshake

Plugin 0.10.0 writes the new sixteen-line `## Explain` set and cites the renamed plugin headings, so it
needs a workspace whose route accepts that set; a v91 workspace would ask for `run:` and `mode:` and cite 85
plugin sections that no longer exist (measured: `missing=85` of 200).

- **This package targets the next bootstrap release after v91**: **v92** when nothing else lands first.
  `python3 installer/build.py --release` stamps the number; if it stamps another, that number is the one
  the plugin's test below names.
- **The plugin's front-door step 2** (its `SKILL.md` §1, *The front door, step by step*) must test for
  `workspace_version` **92 or later**, **and** a `## The explain route` in create-phase that lists the
  `**phases**` field (a field only this route writes), in place of today's "86 or later" and `**unit**`.
  Its two refusal texts and every "v86 or later" in the plugin's copy name v92. The knowledge repo's
  P39-hk release slice (DECOMP2's) makes that change; this slice edits no plugin file.
- **The workspace's floor** is plugin **0.10.0**: the route refuses an older plugin's proposal (a `run:`
  and `mode:` line and no `phases:`) with the update to make, creating nothing, and a `DECOMP` stops
  `pending operator-action` on an older registry entry.
- **The order: the bootstrap first.** (1) Release v92 on the bootstrap's `main` and **push it**:
  `/update-workspace` clones from GitHub. (2) Then the knowledge repo's P39-hk merges and is pushed, which
  publishes plugin 0.10.0 through the marketplace. (3) Then `/update-workspace` in the knowledge repo.
  The other way round, a 0.10.0 front door would tell every workspace to update to a release that does not
  exist yet. In the bootstrap-first window, a v92 workspace with plugin 0.9.x gets a clean refusal from
  create-phase ("update the plugin"), and nothing is created. The knowledge repo carries this as an
  operator question (OQ8) until the operator confirms the order.

## 5. The release notes

The bootstrap stamps versions only on `main`: write the fragment `changelog.d/explain-from-the-phases.md`
exactly as `PATCHES.md` section 9 gives it (line 1 the summary, then the bullets and the **Migration
notes** line), never a numbered `CHANGELOG.md` section, and never `WORKSPACE_VERSION` by hand. `--release`
folds it into `## v92`. Its migration notes tell adopters to update the plugin to 0.10.0 and what happens
to an explain phase that started on an older plugin.

## 6. The smoke suite and the counts

- **The skill count stays 19:** no skill is added; the research route is a section of create-phase.
- **No file is retired:** `RETIRED_FILES` in `installer/main.py` gains nothing (the three references are
  rewritten in place, and the workspace's own `explain-critic` was already retired at v81).
- **The smoke suite** (`PATCHES.md` 8a–8c): the old pins that held the research run (`0.6.0`, the opus
  critic, `slice: <P>.DECOMP`, `STOPPED: evidence gate`, `run.md`, §3.9, `critique: none (quick)`, "Run
  `/do-whole-phase` to research and write it.") are replaced by pins on the new text, plus one loop that
  keeps the four research agents, `no-research`, the preflight and the search-cap heading out of
  everything that ships. Applied to a scratch copy, the patched explain block passes.
- **Sizes:** the create-phase core grows from 31,474 B to 39,388 B (no cap applies to it); the `do-*` cores
  are untouched.

## 7. What the operator does afterwards

1. In the bootstrap session: apply, release v92, push (sections 3–5 above).
2. Confirm OQ8's order in the knowledge repo; then P39-hk's REVIEW and merge proceed, and its release
   slice ships plugin 0.10.0 with the front-door test of section 4.
3. In the knowledge repo, after the merge: **`/update-workspace`**, which brings v92 into the vendored
   `.claude/` (the route, the references, the carve-out). Then P33-n3's citation check over this repo's
   `.claude/` (`works/phases/active/P33-n3/topics/citations.md`, or `package/checks/cites.py`) should print
   `missing=0`, where it prints `missing=85` today.
4. The deferred overlap: `D85-qk` items (a)–(d) are settled by this package (P39-hk.S5's `result.md` says
   where); (e) a translation as a write slice and (f) explain reviews on the mid row are untouched and stay
   open on it.

## 8. Out of scope here

- Do not edit anything in the knowledge repo from the bootstrap session; the plugin 0.10.0 is its side.
- Do not add an engine flag or an `intent.md` marker for research phases, a critic route-table row, or an
  `explain` stub skill; the package chose to ship without them.
- Do not copy `package/checks/`, `PATCHES.md`, `README.md` or the two route texts into `payload/`: the
  build ships every file under a skill directory.
