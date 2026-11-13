# P35-a4.S2 — plan

slice: P35-a4.S2 · kind: implementation · risk: low · depends on: P35-a4.S1 (done, `35bca58d`)

## Goal

Release the knowledge plugin as **0.8.0** on its outer surface. S1 already changed the rules: the explain skill teaches the subject over the work records, documents stand alone, and titles are subject-led. This slice makes the version and the landing say so. The precedent is the 0.7.0 release, `ed9e2b2d` (`git show ed9e2b2d`).

## Edits (the whole set)

1. `plugin/.claude-plugin/plugin.json`: `version` from `0.7.0` to `0.8.0`. Leave `description` unchanged unless it restates a rule S1 changed. It does not at DECOMP, so expect no change.
2. `plugin/skills/setup/SKILL.md`: `plugin_version` from `0.7.0` to `0.8.0` at both places (about L341 and L355), the KB marker's "current plugin version".
3. `web/src/content/marketing/content.ts`: both line counts, from `2,729` to **`2,771`**:
   - the FEATURE_SKILL `lede` ("2,729-line skill", about L251);
   - `pane.meta` ("2,729 lines", about L261).

   Confirm first that `wc -l web/public/SKILL.md` prints 2771. If it does not, use what it prints.
4. **Only where they restate a rule S1 changed:**
   - `.claude-plugin/marketplace.json` (it has no `version` field; its `description` must stay byte-identical to `plugin.json`'s);
   - `plugin/README.md`;
   - the root `README.md`.

   Grep them for a phase-book title (`P<N>: `), for "link", and for a 0.7.0 that names the current version. Expect no change. Report what you checked.

Edit nothing else: nothing under `.claude/`, `docs/` or the explain skill files.

## Validation (paste the outputs in `result.md`)

- `python3 scripts/plugin_parity.py`: PASS.
- `python3 scripts/skills_parity.py`: PASS.
- The landing count equals `wc -l web/public/SKILL.md`: `grep -n '2,771' web/src/content/marketing/content.ts` shows two hits, and no `2,729` is left.
- `grep -rn '0\.7\.0' plugin .claude-plugin`: no mention of the current version is left. Historical mentions ("since 0.7.0", "needs 0.6.0 or later") stay. List each remaining hit and why it stays.
- `git status --porcelain .claude/ docs/`: empty.

## Notebook

- **`## Doc impact`**, one line: product, knowledge plugin 0.8.0 (the explain rules from S1), with the landing counting 2,771 lines.
- Remove the consumed `(from S1, for S2)` note.
- Update `## Now` for the REVIEW.

## Return

`done`, with `files_changed` and the validation outputs. Never commit or move workflow state.

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
