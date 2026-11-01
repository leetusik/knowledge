# P38-e1.S9 — release the knowledge plugin as 0.9.0

## Goal

Ship S1–S7 and F1's rules as plugin **0.9.0** on the plugin's outer surface, in the shape of P35-a4.S2 (commit `364461e7`; `git show --stat 364461e7` lists its files). The desk check (S8) passed, and its findings are fixed (F1). This slice changes no rule.

## The work

Follow `works/phases/active/P38-e1/topics/breakdown.md` **`## P38-e1.S9`**, together with the `(from S7, for S9)` note. Re-find every line by its text: the breakdown's numbers drift.

1. `plugin/.claude-plugin/plugin.json`: `version` 0.8.0 → **0.9.0**.
2. `plugin/skills/setup/SKILL.md`: `plugin_version` 0.8.0 → 0.9.0, at both places.
3. `web/src/content/marketing/content.ts`: both line counts (the `lede`'s "2,793-line" and `pane.meta`'s "2,793 lines") → the value of `wc -l web/public/SKILL.md`, **3,347** now. Recount; use the comma form.
4. `plugin/README.md`:
   - **The run text:** say plainly, for a newcomer:
     - the confirmation proposes the sections and shows a cost line;
     - a document's research team is sized by its length (at most about 4 researchers);
     - a v2 runs as a delta of the earlier version unless you say "from scratch";
     - only the claims the document uses are fact-checked on a second model;
     - a translation is one cheap write, and a loose document's translation is its own document.
   - **The permissions block:** change it only if S1 changed a command form (expected: no; S1 confirmed the curl and `knowledge` patterns are unchanged).
   - **One sentence:** the resolver keeps the API key out of the transcript, in a 0600 header file or inside the `knowledge` CLI.
5. Edit these only where they restate a rule that changed:
   - the explain skill's frontmatter `description`: canonical, then `.agents` (frontmatter differs, body equal), then `web/public/SKILL.md` (`cp`);
   - `.claude-plugin/marketplace.json`: it has no `version`, and its `description` stays byte-identical to `plugin.json`'s, if that changes;
   - the root `README.md`.

   The current descriptions say "research agents (sources opened and quoted, claims verified on a second model, gap rounds, an evidence gate)". Adjust them only if they now mislead, e.g. a team sized to the document, the sections signed at the confirmation, a delta for a v2. Keep them short and plain.

## Constraints

- **The set** (touch nothing else):
  - `plugin/.claude-plugin/plugin.json` and `.claude-plugin/marketplace.json`;
  - `plugin/skills/setup/SKILL.md`;
  - `web/src/content/marketing/content.ts`;
  - `plugin/README.md` and `README.md`;
  - the skill's three copies, frontmatter `description` only.
- If the skill's description changes, the line count does not; recount anyway.
- **Never** edit `.claude/skills/**`, commit, or move workflow state.
- **The notebook:**
  - `## Doc impact` (`--append`): `product.md`: knowledge plugin 0.9.0, and the landing counts the new line total (P38-e1.S9).
  - Consume the `(from S7, for S9)` note.
  - Rewrite `## Now` under 2,048 B (`--replace`) to say the phase is ready for REVIEW.

## Validation

- `python3 scripts/plugin_parity.py` → PASS
- `python3 scripts/skills_parity.py` → PASS
- The landing count equals `wc -l web/public/SKILL.md` (grep both numbers in `content.ts`)
- `grep -rn '0\.8\.0' plugin .claude-plugin` → no current-version mention left (history mentions in prose excepted; quote any hits)
- `uv run pytest tests/test_explain_resolver.py -q` → passes
- The heading diff against `14e1cbda` → empty (unchanged by this slice)
- `git status --porcelain .claude/` → nothing of this slice's

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
