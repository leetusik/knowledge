# P32.S10 — The handoff for the bootstrap: what to apply, in what order, the minimums and the lessons

## Goal

Write `works/phases/active/P32/handoff.md`: the one page the operator relays to the bootstrap workspace, read
cold by a session that has never seen P32. It is an **index**, pinned to the package's anchor: it tells that
session what to do in what order and points into `package/README.md`, `package/PATCHES.md` and the rehearsal
records for the detail, never copying them. P31's `handoff-explain.md` is the model (shape, length ≈ 8–10 KB,
tone). This is a write-up slice: no `claude -p` runs, no spend, no skill or package edits.

## Read first

- `phase.md` `## Notes for later slices`: **Rules for every slice**, the three S10 entries — **(from P32.S8, for
  P32.S10)**, **(from P32.DECOMP2, for P32.S10)** and **(from P32.S9, for P32.S10)** — and the REVIEW entries.
  `## Decisions` d63–d69 (d69: the operator accepted rehearsal 2 as it ran, OQ11).
- `works/phases/active/P31/handoff-explain.md` (the model).
- `package/README.md` (all of it: the order, the minimums, *Permissions*, *The search cap*, *The cost*, *What
  the rehearsal checks*) and `package/PATCHES.md`'s headings (`grep -n '^#'`), only reading a patch where the
  handoff names it.
- `rehearsal/r2/spend.md` and `slices/P32.S9/result.md` (the checks, the depth-2 findings); `rehearsal/r1b/
  scorecard.md`'s summary lines only.
- `topics/hosts-and-delivery.md` §4.9 only.

## Deliver: `handoff.md` (phase folder)

Sections, in this order (adapt the headings, keep the order):

1. **What this does**, in three or four sentences: a book (explain phase) researches the whole subject before
   the outline, each chapter tops the research up, and the knowledge plugin's critic replaces the bootstrap's
   own; a `/knowledge:explain … book` request proposes the phase and creates it on a yes.
2. **Before you apply**: release the knowledge plugin 0.6.0 first (the operator's word; this repo never
   releases it), then the package. The **pin**: anchored at bootstrap `1f4aa7d` (v73), re-counted at `97e1c38`
   (v74), every anchor found exactly once at both; if `main` has moved past `97e1c38`, re-count the anchors the
   way README says before applying.
3. **Apply, in this order**: one numbered line per step pointing at the README's order and the PATCHES entries
   it covers. The release rule: one `changelog.d/` fragment landed by `build.py --release` (PATCHES 8–9), and
   `RETIRED_FILES`' version set to `main`'s `WORKSPACE_VERSION` just before it. **No P42/P40 order**: both are
   merged in `main`. Then the update step that removes a host's installed copy of the old `explain-critic`.
4. **The minimums**: plugin 0.6.0; bootstrap v73 or later; Claude Code that runs subagents of a subagent
   (2.1.309 ran depth 2 in rehearsal 2). Reconcile this with DECOMP2's "2.1.283, auto mode by default" from
   the README and say which number is the minimum and why; do not invent one.
5. **Running a book: permissions, the search cap, the cost.**
   - Permissions: recommend auto mode. In manual mode the book's executor needs the lines the skill's stop
     block prints for a by-path or subagent lead (`Bash(python3 -c *)` among them, which lets any inline Python
     run: say so plainly); `bypassPermissions` in an agent's frontmatter does not cover it.
   - The search cap: ≈ 83 searches for the whole-book research plus ≈ 13 a chapter, ≈ 160 for six chapters in
     one session against the default 200; tell the operator to raise
     `CLAUDE_CODE_MAX_WEB_SEARCHES_PER_SESSION` (the package tells, never sets it; OQ4).
   - The cost: whole-book research ≈ $51 (two chapters, tier 3), a chapter ≈ $50–58 with its revision, a
     six-chapter book ≈ $350–400. Say that `create-phase` tells the operator this at step 2 (check the package's
     `explain-route.md` does; if it does not, say so in `result.md` and in `## Now` — do not edit the package).
6. **What a workspace gets afterwards**: the book's folders (`book/research/` with a git-ignored `pages/`,
   `summary.md` at the outline gate, the freeze of `library.md`/`ledger.md`, each chapter's overlays and
   `trace-<key>.md`), chapters run one after another (never in a wave), and the workspace dispatching
   `knowledge:explain-critic` in the background (d63) while the skill's own §4.10 says foreground for a
   `claude -p` lead: both are right for their caller; say which applies where.
7. **What the rehearsals taught**, one line each with where it now lives (the skill section, the README
   section, the reference file): from S7/F1 (reader-first writing, the critic's `reader` category, the
   foreground critic under `-p`, `maxTurns: 120`) and from S9 (d65–d68: foreground waves for a subagent lead,
   the labelled slice line, the critic's tools folder, `quick` keeps D6–D7, the measured cost).
8. **Left for the first real book** (S9's list plus OQ11's answer): the chapter's revision span and its commit
   under the freeze; the review's freeze check; the critic dispatched in the background by an interactive
   orchestrator; `dispatch-summary` on nested spans; auto mode end to end.
9. **Out of scope here** (intent.md's list) and **known gaps**: the plugin's §1 has no book placement for
   minted ids (a plugin follow-up); the outline gate's report ran 3.7k characters against the ≈ 2k stop rule
   (the package does not enforce it yet).

Write it plain and short: a sentence per point where a sentence does it, the detail behind a link. Every
number above comes from the files named; if a file says otherwise, the file wins and `result.md` says what
differed.

## Verification

- Every path the handoff names exists (`ls` each); every section it cites in the skill exists
  (`grep -n '^#' plugin/skills/explain/SKILL.md`); every PATCHES entry it names exists.
- The pin and the counts match S9's `result.md`. No command in the bootstrap repo is needed; run none.
- `git diff --stat` touches only `works/phases/active/P32/` (`handoff.md`, `phase.md`, this slice's folder);
  `python3 scripts/workflow.py validate` passes.

## Notebook and result

- `phase.md`, one section at a time: remove the three S10 notes; update the REVIEW note (OQ11 is answered:
  accept, d69; the review reads the freeze from S9's working-tree check; `handoff.md` joins the boundary);
  `## Now`. No `## Doc impact` line unless the handoff states a durable truth the earlier lines do not.
- `result.md`: the verdict block first (`status`, `tier`, `model`, `effort` from `## Dispatch`, `summary`,
  `files_changed`, `validation`, `deviations`, `doc_impact`), then the handoff's section list with its size,
  and any number or claim that differed between the files.
- No commit, no push, no state command. Never write to the bootstrap repo.

## Dispatch

slice=P32.S10
phase=P32
kind=docs
risk=low
attempt=1
route=cheap
reason=kind docs rated low
tier=mid
subagent_type=slice-executor-mid
model=sonnet
pass_model=yes
effort=high
pass_effort=yes
attribution=Claude Sonnet 5.5
explore_model=haiku
explore_effort=high
