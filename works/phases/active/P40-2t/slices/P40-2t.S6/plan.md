# P40-2t.S6 — release

Kind `implementation`. Runs alone: S1–S5 are done and committed, nothing else runs. Mode `auto`.

## Goal

Ship what S1–S5 wrote. This covers change-list E1–E7, the `content.ts` recount, and the one-sentence
`## Explain` hazard fix.

1. **Plugin 0.11.0 (E1–E3).**
   - In `plugin/.claude-plugin/plugin.json`, set `version` to 0.11.0 and `description` to the skill's new
     frontmatter description.
   - Set `.claude-plugin/marketplace.json`'s `description` to the same text.
   - In `plugin/skills/setup/SKILL.md`, update `plugin_version` and the sentence about it.
   - Update `plugin/README.md`. This covers *Explain: flags and the one confirmation*, plus the intro at
     L10–15, which S1 found still says "codebase-only", "declined" and v94. Also update the root
     `README.md` ("v94 or later") and `plugin/templates/kb/docs/getting-started/{{KB_DATE}}-how-your-knowledge-base-works.md`
     ("v94 or later"). Each should describe: workspace v96, research first chained to explain,
     `from=P<N>`, the subject book, and chapters written at once.
2. **The count.** `web/src/content/marketing/content.ts` L251 and L261 carry the skill's line count,
   "2,492". Change it to `wc -l plugin/skills/explain/SKILL.md`, which is 2,665 per S5. Change the count
   only. If the lede's wording is no longer true for a subject book ("cite every line to the code"),
   raise an Operator Question; never rewrite the operator's copy.
3. **The `## Explain` hazard** (Decisions, at S1's return). In
   `works/phases/active/P40-2t/package/claude/skills/create-phase/research-route.md`, the step that
   writes the research block and the proposal as last shown under *Original Input (verbatim)* must say
   to write that proposal as a blockquote, `> ` on every line. Then no line of a chained research
   phase's `intent.md` strips to `## Explain`, which the engine's `explain_phase()` would match.
   - This is one sentence.
   - Re-run S2's checks on the file: finds, pins, and `cites.py` against the 0.11.0 skill.
   - If `patches/create-phase.md` quotes that sentence, update it there as well. It is in your set, as
     the release slice.
4. **The package (E5–E7)**, on P39-hk's shape (`works/phases/active/P39-hk/package/`):
   - `package/README.md`. Include:
     - the files table;
     - the order to apply;
     - the minimums: plugin 0.11.0, CLI 0.2.0+, a server with `check`;
     - how it was checked;
     - **the release order: bootstrap v96 first, plugin 0.11.0 after, then `/update-workspace` here,
       in arb_upbit_1 and in Note.**
   - `package/PATCHES.md`, the ordered index of `patches/*.md`.
   - `package/patches/release.md`. It holds:
     - the `changelog.d/<slug>.md` fragment;
     - `README.en.md`'s Knowledge block;
     - the smoke suite's explain pin block, updated from S2–S4's literal lists (in
       `topics/notes-for-later-slices.md` and the S2/S3/S4 `result.md` files). That means the
       `0.10.0` → `0.11.0` pins, the flipped `--depends-on` pin, S4's Test 10d literals, and the new
       literals each slice named;
     - the installer artifact rebuild (`python3 installer/build.py`);
     - the release;
     - verification after applying.
   - `package/checks/apply.py`, `finds.py` and `cites.py`, retargeted to `fdb1151` (v95):
     - the skill count is **21**;
     - `apply.py` applies `patches/*.md` in index order;
     - `cites.py` runs against the 0.11.0 skill.
5. **Parity (E4).** Run `python3 scripts/skills_parity.py --write-agents`, then the check, then
   `python3 scripts/plugin_parity.py`. S6 writes no skill prose, so the four skill files change only
   if parity regenerates them.

## Validation

- `skills_parity.py` and `plugin_parity.py` PASS.
- `checks/finds.py`: every find of every patch file occurs exactly once at `fdb1151`.
- `checks/apply.py` runs on a fresh scratch copy of `fdb1151`:
  - make the copy in the scratchpad with
    `git -C /Users/sugang/projects/personal/bootstrap_agentic_workspace.sh archive -o <scratchpad>/p40-s6.tar fdb1151`,
    then `tar -xf` there (the whole tree, as S4 learned);
  - apply all patches, rebuild the artifact, and run the patched smoke suite whole. Say what passed.
- `checks/cites.py` against the 0.11.0 skill reports missing 0.
- `grep -rn "v94" plugin README.md .claude-plugin web/public/SKILL.md` shows no handshake line left.
- `wc -l plugin/skills/explain/SKILL.md` equals `content.ts`'s count.
- The release gate, with no dev server left running:
  - `uv run pytest -q`;
  - `pnpm --dir web typecheck`, `lint`, `test` and `build`.
- `python3 scripts/workflow.py validate` passes.
- No push, ever.

## Risk

`low`, on the mid row. The work is located version strings, copy text, a recount, and package checks
retargeted after every edit has landed. Return `escalate` if the patched suite fails in a way that
needs a change to S2–S4's patch text beyond the pins. That would be a design decision those slices
pinned, not a release fix.

## Read first

- `topics/breakdown.md`: *Pins for every edit slice (S1–S6)*, and your own `## P40-2t.S6` block, whose
  set includes `research-route.md` for the hazard sentence.
- `topics/change-list.md` §5, Group E, and §4.
- `phase.md` *Notes for later slices* and *Decisions*, through `phase-section`. Also
  `topics/notes-for-later-slices.md`, which holds S1's copy method and README findings, S2/S3/S4's
  smoke literals, and S5's line count. Remove the notes you consume.
- P39-hk's package (`works/phases/active/P39-hk/package/`), as the shape to follow. Start every package
  check from `fdb1151`'s files, never from P39-hk's copies.

## Never

- Write in the bootstrap repo, Note or arb_upbit_1. The scratchpad holds the scratch copy.
- Commit, push, or move workflow state.
- Edit skill prose. The hazard sentence in the package's `research-route.md` is the one route-text edit.
- Search the web, or spend money.
- Write test files.
- Leave a dev server running.

## Return

`result.md`, with the structured verdict block first. Then:

- your block's Doc impact note, in `phase.md` through `phase-section --append`. You run alone, so you
  write the notebook yourself:
  - product.md, operations.md, qa.md: plugin 0.11.0 is released, unpushed;
  - the release order;
  - qa.md *Test Commands*, if the suite's counts change.
- the notes you consumed, removed;
- `## Now` rewritten for REVIEW;
- any Operator Question.

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
