# P32.S8 — The bootstrap package: route fields, three explain references, executor carve-out, critic removal

## Goal

Write the ready-to-apply package that brings the bootstrap workspace's explain phase (a book) onto P32's pipeline:
whole-book research before the outline, each chapter's top-up and the plugin's critic, the book suggestion's
handoff to `create-phase`, and the narrow carve-out that lets explain executors dispatch the knowledge plugin's
research agents (OQ2). The operator relays it, as with P31. **This repo never edits the bootstrap**; the package
lives in this phase's folder.

## What changed since DECOMP2 wrote the spec (read this first)

- **The bootstrap moved.** `main` is at `86ec6fa` (workspace v72 or later, 31 commits past `64b2d6f`), and **both**
  `feat/run-loop` (P42) and `feat/multi-repo-host` are merged into it. Anchor against **`main` at `86ec6fa`**,
  not `64b2d6f`; there is no before/after-P42 order any more. Since `64b2d6f`, `explain-decomposition.md`,
  `decomposition.md`, `review.md`, `verdicts.md`, `prep.md` and `co-work.md` changed and `wave.md` (P42's
  several-slices-at-once) was added: read them at `86ec6fa`, and say in the package whether a wave can run
  explain chapter slices, and what that means for the carve-out and the research agents (WebSearch's
  per-session cap is shared by everything in one session).
- **The bootstrap's working tree is dirty** (another session's uncommitted engine changes:
  `bootstrap_agentic_workspace.sh`, `payload/scripts/workflow.py`, `payload/github/workflows/workspace-ci.yml`,
  `tests/retrofit_smoke.sh`). Read committed content only (`git show 86ec6fa:<path>`, `git grep … 86ec6fa`), never
  the working tree, and leave its `git status` exactly as you found it. If `main` moves while you work, anchor to
  the new head and say so.
- **F1 reshaped the writing** (Decisions d57, d58; d62: the operator accepted rules v2): D6 now starts from the
  reader's task (`## Reader's task`, each task's deliverable, `## Not used`, word budgets), D7 runs three passes
  under prose rules, and the critic has a `reader` category, runs in the foreground, with `maxTurns: 120`. §9.3
  item 5 cites §3.10 and §4. The package's chapter reference must carry this: a chapter's reader tasks come
  from the book's outline entry (decide how the book outline records them per chapter, so the chapter
  executor's D6 can start from them).

## Read first

- `phase.md` `## Notes for later slices`: **Rules for every slice**; the three S8 entries **(from P32.S7, for
  P32.S8)**, **(from P32.S6, for P32.S8)** (the names, paths and the suggestion's contract with `create-phase`)
  and **(from P32.DECOMP2, for P32.S8)** (the spec: *From*, *Delivers*, *Verify*). `## Decisions` lines OQ2,
  OQ3, OQ4, d49, d50, d57, d58, d62.
- `topics/hosts-and-delivery.md` §4.9, §2 Q7 and Q9, §4.3, §4.4, §4.7; `topics/research-evidence.md` §4.2. Only
  those, unless one points further.
- P31's package as the model: `works/phases/active/P31/package/` (`README.md`, `PATCHES.md`, `claude/`).
- `plugin/skills/explain/SKILL.md` by section (`grep -n '^#'`): §9 (9.1–9.3), §3.10, §4's opening and §4.10,
  B5's inputs. Cite them by section; never copy their text into the package.
- The bootstrap, read-only, at `86ec6fa`: `payload/claude/skills/create-phase/SKILL.md` (its explain route), the
  `do-whole-phase/reference/explain-{decomposition,chapter,review}.md` files, `wave.md`, `slice-executor.md` and
  wherever the bootstrap's own `explain-critic` is installed, built, documented and smoke-tested
  (`git grep -n explain-critic 86ec6fa`).

## Deliver (in `works/phases/active/P32/package/`)

Everything the DECOMP2 spec's *Delivers* names, against `86ec6fa`:

1. **`PATCHES.md`**, text-anchored (never line numbers), each patch: the file, the anchor text, the exact edit,
   why. For:
   - `create-phase`'s explain route: `must-cover`, `leave-out` and `trusted sources` fields, `lang: en`, plugin
     ≥ 0.6.0, and the confirmed-proposal entry (OQ3). Keep the heading `## The explain route` and the field
     name `must-cover` (the skill's readiness check reads both).
   - `explain-decomposition.md`: research first via §9.2, `book/research/` with a `pages/` `.gitignore`,
     `summary.md` at the outline gate, the freeze of `library.md`/`ledger.md` at the signature, the skill found
     through `installed_plugins.json`, nested prompts starting `slice: <id>`, chapter slices high on an Opus
     lead, and each chapter's reader tasks in the book outline.
   - `explain-chapter.md`: §9.3's top-up, the overlays, `trace-<key>.md`, the writing per §3.10 and §4, and
     `knowledge:explain-critic` with `kind: chapter`.
   - `explain-review.md`: the optional "Sources and further reading" chapter; the indexes stay unedited after
     the signature.
   - The `slice-executor.md` carve-out (OQ2): on an explain phase, the `DECOMP` executor and each chapter
     executor may dispatch the knowledge plugin's research agents; nothing else changes.
   - Removing the bootstrap's own `explain-critic` (the agent file, its installer, build, README and smoke
     entries), plus an update step that deletes the host's installed copy.
   - A CHANGELOG entry, its version left as "the next free number".
2. **Whole files under `package/claude/…`** mirroring `payload/`, wherever a whole file is clearer than a patch
   (P31's choice of patch vs file is the model).
3. **`README.md`**: what the package does, the file table (it must match the files), the order to apply it,
   the minimum versions (knowledge plugin ≥ 0.6.0, the bootstrap at or past `86ec6fa`), the permission notes
   (the rules the preflight prints; no Grep/Glob on some hosts; `$` and comma braces need approval; no
   `git -C`), the search-cap note (`CLAUDE_CODE_MAX_WEB_SEARCHES_PER_SESSION`; OQ4: the package tells the
   operator, never sets it), and the cost note (S7: a `full` single document ≈ $28–44 on an Opus lead, ≈ 12–18×
   `/explain` 0.5.0; a book is several of those, so the operator should expect it).

No contract (`CLAUDE.md`) edit. No `claude -p` runs and no spend in this slice: S9 rehearses the package.

## Verification

- Every anchor in `PATCHES.md` is found **exactly once** at `86ec6fa` (`git show 86ec6fa:<file> | grep -c -F
  '<anchor>'`); list the counts in `result.md`.
- `README.md`'s file table matches `find package -type f`.
- Every section the package cites in the skill exists (`grep -n` the headings).
- The bootstrap's `git status --short` is identical before and after.
- `git diff --stat` touches only `works/phases/active/P32/` (the package, `phase.md`, topics, this slice's
  folder); `python3 scripts/workflow.py validate` passes.

## Notebook and result

- `phase.md`, one section at a time (it is at ≈ 39.5 KB of its 40,960 B budget; move long material to
  `topics/build-decisions.md` first): remove the three S8 notes; add `(from P32.S8, for P32.S9)` (how to apply
  the package to a scratch copy of the bootstrap for the rehearsal, and what to check) and
  `(from P32.S8, for P32.S10)` (what the handoff must say; there is no P42 order now); `## Decisions`;
  `## Doc impact` if any; `## Now`.
- `result.md`: the verdict block first (`status`, `tier`, `model`, `effort` from `## Dispatch`, `summary`,
  `files_changed`, `validation`, `deviations`, `doc_impact`), then the anchor counts and the package's file
  table.
- No commit, no push, no state command. Never write to the bootstrap repo.

## Dispatch

slice=P32.S8
phase=P32
kind=implementation
risk=high
attempt=1
route=high
reason=risk high (not low)
tier=high
subagent_type=slice-executor-high
model=opus
pass_model=yes
effort=xhigh
pass_effort=yes
attribution=Claude Opus 5.5
explore_model=haiku
explore_effort=high
