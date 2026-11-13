# P39-hk.S1 — the explain's front door: a suggested reader and shape, codebase-only, a research-phase offer

## Context

`plugin/skills/explain/SKILL.md` (3,347 lines) is the plugin's explain skill. Its front door, §1 (L110–426, with *The front door, step by step* at L214), resolves the topic and asks the operator one confirmation. The operator asked for three changes, recorded verbatim in `works/phases/active/P39-hk/intent.md` § *Scope Added at Execution*. Read sections **A** and **C** whole: they are the contract, and they win over the earlier *Confirmed Intent* where the two conflict.

This slice changes only the **front door and the confirmation**:
- the explain run card's research stages go in S2;
- §4's writing rules change in S3;
- the research agents retire in S4, which also rewrites the frontmatter `description:` and the product copy;
- the workspace route is handed off in S5.

Leave every part outside the front door as it is, even where it now reads inconsistently with the new door. Each later slice rewrites its own part, and they chain one after another.

## Read first

- `python3 scripts/workflow.py phase-section P39-hk Decisions`, and `phase-section P39-hk "Notes for later slices"`. These entries bind:
  - the vendored route under `.claude/` is never edited; P33-n3's citation check is expected to regress, so record its count and never chase it;
  - the deferred overlap (D86-sd, D69, D85-qk).
- `works/phases/active/P39-hk/topics/breakdown.md`:
  - `## Pins for every skill slice (S1–S4)`: the shipped set, the validation, the heading crosswalk, no version bump, codebase-only binding the skill only, no new tests;
  - `## P39-hk.S1`: the pins, restated below. Line numbers there are the DECOMP's survey; verify them before editing.

## The work

1. **The reader line.** The confirmation's reader is a concrete guess from the request and the operator's situation: who they are, what they already know, what they are new to. It is never a stock "a novice". The DECOMP survey points at L298 and L571, also L316 and L371. Rewrite each place that fixes or exemplifies the stock reader, in §1. Leave §3's D0 brief (L571) to S2, but write its new reader rule so S2 can point at it.
2. **The sections follow the subject.** The confirmation proposes the questions this reader asks, in the order they ask them, instead of the fixed Background → Intuition → Code → Best practices → Quiz outline.
   - It also offers **one or two other shapes**, one line each. The operator picks or edits; it is still **one** confirmation.
   - Sources and the short "In one paragraph" box stay.
   - The Quiz is suggested only when the subject earns it, and the operator may drop it.
   - Best practices go. S3 writes **next steps** from the workspace, so the confirmation may name a "next steps" part only when something is open (deferred jobs, open questions, decisions not yet built). Phrase it as S3 will build it, without defining S3's rules.
   - Show one worked example of the new confirmation in the skill, replacing the old example if there is one. Its subject must be a codebase subject.
3. **Codebase-only.** General mode goes:
   - §1 L146–164;
   - `mode: general` L161–164;
   - the loose document's subject slug L170–174;
   - book kind `subject` L194–200;
   - every mention the skill map at the top lists.

   A request with no code subject is declined plainly, in one or two sentences, and writes nothing. Codebase books stay; subject books go from the **skill only**. The server, the CLI (`--subject`, `--book-kind subject`) and the reader are unchanged (Decisions: *Codebase-only binds the explain skill only*).
4. **Coverage → a research-phase offer.** The front door finds the phases that cover the subject from the records:
   - the commits that touched the subject's files (`git log --format=%s -- <paths>`, read for the Commit Convention's `(P<N>)` / `(P<N>-<tail>)` scope);
   - the phases whose `intent.md` / `phase.md` name it.

   The confirmation names the covering phases. When **none** covers the subject, the confirmation says so and offers to create a **research phase** first, which reads the code and records findings. The explain then runs from those findings afterwards, on the operator's word, never automatically. Write the hand-off to `create-phase` for that research phase concretely enough for S5 to mirror it in the workspace route. Pin what it passes: subject, paths, the question to answer, and that it is findings-only.
5. **The cost line and the run choice.**
   - The cost line becomes **one writer plus one critic**.
   - The quick / full / no-research offer goes: the card L65–78, flags L123–128, step 6 L294–296, L342, L360–361.
   - The price table goes (L401–411).
   - `argument-hint` (L4) loses `[quick|no-research]`.
   - The `## Explain` field set the hand-off writes into `intent.md` changes: `run:` and general `mode:` go. State the **new field set** as a notebook Decisions entry for S5.
   - Where the card (L40–109) mentions what this slice removes, cut only those mentions. The card's research stages are S2's rewrite.
6. **Propagate and record.**
   - `.agents/skills/explain/SKILL.md`: the canonical body, byte-equal, with frontmatter lacking `argument-hint:` / `allowed-tools:`.
   - `web/public/SKILL.md`: a full-file `cp`.
   - `plugin/agents/*.md` only if Part B changed (it should not here): `python3 scripts/skills_parity.py --write-agents`.
   - Every heading added, renamed, renumbered or deleted goes into `works/phases/active/P39-hk/topics/skill-headings.md`, which this slice creates: a table `old → new` or `→ deleted`, with the slice id.
7. **Deferred items.** If a rewritten passage settles an item of D86-sd or D69, name it in `result.md`. Never widen the slice to reach one.

## Validation

- `python3 scripts/skills_parity.py` → PASS.
- `python3 scripts/plugin_parity.py` → PASS.
- `uv run pytest tests/test_explain_resolver.py -q` passes (or `python3 -m pytest …`).
- `git status --porcelain .claude/` shows nothing of this slice's.
- `grep -n -i -E "novice|general mode|mode: general|no-research|quick" plugin/skills/explain/SKILL.md`: account in `result.md` for each hit left in the front door. Hits in §3/§4/Part B are later slices' and are left.
- P33-n3's citation check (`works/phases/active/P33-n3/topics/citations.md` L64–85): record the count only.

## Wave

- **Set:**
  - `plugin/skills/explain/SKILL.md`;
  - `.agents/skills/explain/SKILL.md`;
  - `web/public/SKILL.md`;
  - `plugin/agents/*.md`;
  - `works/phases/active/P39-hk/topics/skill-headings.md`.

  Plus this slice's own `result.md`.
- **Beside it:** `P39-hk.R1` (research, findings only), set `works/phases/active/P39-hk/topics/glossary-and-math.md`.
- **Commits waiting:** none.
- **Join-rebuilt artifact:** none.
- **Checks scoped to this set:** the validation above. No whole-tree suite, typecheck or build; list any you leave out as `deferred: whole-tree`.
- **Rules:**
  - write no `phase.md` and run no writing engine command; return the notebook entries in the verdict's `notebook` field: Decisions (the new `## Explain` field set; the reader/shape rule; the research-phase hand-off), Notes for later slices (for S2, S3, S5), Now;
  - edit nothing outside the set; any other file needed means `needs_operator`, naming it;
  - no `plugin.json` version bump.

## Dispatch

route=mid
reason=kind implementation rated low
subagent_type=slice-executor
model=opus
pass_model=yes
effort=medium
pass_effort=yes
attribution=Claude Opus 5.5
explore_model=haiku
explore_effort=xhigh
