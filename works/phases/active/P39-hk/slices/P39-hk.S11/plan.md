# P39-hk.S11 — release plugin 0.10.0, without pushing

## Context

P39-hk changed the `knowledge` plugin's explain skill and the reader:
- **S1–S4 rewrote the explain skill.** It is codebase-only, written from the phases' records with one writer and one critic, and its research agents are retired. It proposes a suggested reader and shape, and offers a research phase when no phase covers the subject.
- **S5 wrote the bootstrap package.** The workspace side ships as v92 in the operator's bootstrap session.
- **S6–S10 added the reading aids:** the glossary, `term:` links and typeset formulas, in the grammar, the reader, print and the skill's text.

This slice cuts the release: plugin **0.10.0**, with the front-door handshake moved to workspace **v92**. It stops before any push. OQ8's order is bootstrap v92 first, then this branch merges and ships.

The slice's pins and set are in `topics/breakdown.md` → `## P39-hk.S11`, plus `## Pins for every skill slice (S1–S4, S10, S11)`. Read both whole; they bind.

## Read first

- `phase-section P39-hk "Notes for later slices"`, the entries for S11, with their pointer blocks in `topics/notes-for-later-slices.md`:
  - 6, R1's stored-sources scan before deploy;
  - 7, S4's items still owed at 0.10.0;
  - 8, S5's plugin side of the handshake;
  - 11, S10's line count.
- `phase-section P39-hk "Doc impact"`: what each slice shipped, for the release notes.
- `topics/breakdown.md` → `## Build inventory` (the temml dependency, the font, the stored-source scan).
- `works/phases/active/P39-hk/handoff-explain.md` and `package/README.md`: the v92 handshake as S5 wrote it.
- The previous release's notes in `plugin/README.md`, and its commit (`git log --oneline -- plugin/.claude-plugin/plugin.json | head -3`), to match their form.

## The work

Each item is located by the breakdown's line numbers. The lines may have shifted since, so find each by its text.

1. **`plugin/.claude-plugin/plugin.json`**: `version` becomes `0.10.0`, and the description moves from v86 to v92.
2. **`.claude-plugin/marketplace.json`**: the description, to match.
3. **`plugin/README.md`**:
   - the 0.10.0 release notes, in the previous releases' form:
     - codebase-only from the phases' records;
     - one writer plus one critic;
     - the suggested reader and shape;
     - the research-phase offer;
     - the glossary and `term:` links;
     - typeset formulas;
     - the v92 handshake.
   - The notes carry the stored-sources scan as a checklist line: before deploying, scan the stored native sources for `$` beside a code span and for `term:` links (R1's note 6).
   - The workspace-version lines (L15 and L46) move to v92.
4. **`plugin/skills/setup/SKILL.md`**: `plugin_version` goes from 0.9.1 to 0.10.0 (L342, L356), and the workspace-version lines (L170, L461) move to v92.
5. **The front door**, in `plugin/skills/explain/SKILL.md` (L3, L25, and step 2 at L283–L294):
   - `workspace_version` **92 or later**;
   - create-phase's `## The explain route` listing `**phases**`, as S5's handshake defines;
   - both refusal texts name v92.

   Then propagate:
   - `.agents/skills/explain/SKILL.md`: the canonical body byte-equal, its frontmatter without `argument-hint:` / `allowed-tools:`;
   - `web/public/SKILL.md`: `cp`.
   - Regenerate `plugin/agents/explain-critic.md` with `python3 scripts/skills_parity.py --write-agents` only if Part B changed.
   - Log any heading change in `topics/skill-headings.md`.
6. **Root `README.md`** (L37) and the KB template page `plugin/templates/kb/docs/getting-started/{{KB_DATE}}-how-your-knowledge-base-works.md` (L71): move them to v92.
7. **`web/src/content/marketing/content.ts`** (L251, L261): the skill's line count, recounted with `wc -l plugin/skills/explain/SKILL.md` **after** items 5's edits. Also anything else S4's note 7 says is owed at 0.10.0.
8. **The commit message.** Do not commit. Put the release notes, as the commit body should read, under a `## Release notes (for the commit)` heading in `result.md`. The orchestrator writes the commit from them.
9. **No push, no tag**, and no `plugin.json` change beyond item 1.

## Validation

- The skill-slice checks:
  - `python3 scripts/skills_parity.py` → PASS;
  - `python3 scripts/plugin_parity.py` → PASS;
  - `uv run pytest tests/test_explain_resolver.py -q` passes;
  - `python3 works/phases/active/P39-hk/package/checks/cites.py plugin/skills/explain/SKILL.md <the five package texts> works/phases/active/P39-hk/handoff-explain.md` → missing=0 (S5's `result.md` has the exact invocation);
  - `git status --porcelain .claude/` shows nothing;
  - P33-n3's citation check: record the count only, never chase it.
- `pnpm --dir web typecheck` passes.
- `wc -l plugin/skills/explain/SKILL.md` equals `content.ts`'s count.
- `grep -rn "v86" plugin README.md .claude-plugin web/public/SKILL.md` shows nothing left of the handshake. List any v86 that remains for another reason and say why it stays.
- **The release gate:**
  - `uv run pytest -q`;
  - `pnpm --dir web lint`;
  - `pnpm --dir web test`;
  - `pnpm --dir web build`, in the worktree's own `web/`.

  First check that no worktree dev server is running: list the listeners, and never touch `:3030` / `:8766`. Report each result with its counts. A failure that predates this slice is named as such, with the evidence (for example, the same failure at `HEAD`), never fixed outside the set.
- `python3 scripts/workflow.py validate` passes.

## Set

- `plugin/.claude-plugin/plugin.json`, `.claude-plugin/marketplace.json`;
- `plugin/README.md`, `plugin/skills/setup/SKILL.md`;
- `plugin/skills/explain/SKILL.md`, `.agents/skills/explain/SKILL.md`, `web/public/SKILL.md`;
- `plugin/agents/explain-critic.md` (regenerated, only if Part B changes);
- `README.md`;
- `plugin/templates/kb/docs/getting-started/{{KB_DATE}}-how-your-knowledge-base-works.md`;
- `web/src/content/marketing/content.ts`;
- `works/phases/active/P39-hk/topics/skill-headings.md` (only on a heading change);
- `works/phases/active/P39-hk/package/**` and `handoff-explain.md` (only if a cited heading moved);
- this slice's `result.md`;
- `phase.md` through `phase-section`.

Any other file needed means `needs_operator`, naming it. Nothing under `.claude/`, and nothing in the bootstrap repo.

## Notebook (alone: write through `phase-section`, under budget)

- **Notes for later slices:**
  - remove the notes this slice consumes: 6, 7, 8 and 11;
  - add one for REVIEW: the release gate's results, and what stays for the integration (the bootstrap v92 order, OQ8).
- **Doc impact:** one line (plugin 0.10.0, the front door at workspace v92).
- **Now:** S11's landing, then "Next: REVIEW (the acceptance gate)".

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
