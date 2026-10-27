# P33-n3.S2 — plan: the plugin's outer surface says it, released as 0.7.0

Mode: `auto`. Kind `implementation`, risk `low`, the mid row. Depends on S1 (done, `8ed4ab3`).

## Goal

The plugin's outer surface states what S1 built: `/knowledge:explain` is the explain phase's front
door and needs a workflow workspace v86 or later. Read first: `topics/breakdown.md` § P33-n3.S2 (the
goal and set, file by file), the notebook's two `## Notes for later slices` entries for S2 (the
README facts S1 settled; landing count **2729**), and S1's `result.md` *only* where you need a
detail behind a note. The new skill (`plugin/skills/explain/SKILL.md`) is the truth: describe it,
never re-decide it.

## The edits (pinned)

1. `plugin/.claude-plugin/plugin.json`: `version` `0.6.0` → `0.7.0`; `description` says explain runs as
   an explain phase in a workflow workspace (v86 or later), one confirmation, then research, write,
   check and a private publish (keep it about as long as today's).
2. `.claude-plugin/marketplace.json`: the same plugin description, byte-identical to plugin.json's.
3. `plugin/README.md`: the intro bullet; *Explain: modes and flags* (flags `quick|no-research|book=<slug>|lang=`;
   no `resume` — resuming is `/do-whole-phase <P>`; no `here`; what the one confirmation does); *Where
   a run's files live* (the phase's `doc/` or `book/research/`, committed except `pages/`; the
   converter at `<KB_EXPLAIN_STATE>/tools/`, fallback `<DOSSIER>/pages/tools/`, never
   `<cwd>/.knowledge-explain/`); *Explain: permissions and the search cap* — **keep that heading byte
   for byte** (create-phase cites it), update `<ROOT>`/`<TOOLS>`/`<SKILL_DIR>`/`<UNIT>` per §3.2;
   a requirements line (a workflow workspace v86 or later; `/knowledge:setup` once).
4. `README.md` (root): the plugin paragraph gains one line: explain needs a workflow workspace v86+.
5. `plugin/skills/setup/SKILL.md`: only where it describes how explain runs; its `.kb-scaffold.json`
   `plugin_version` `0.3.0` → `0.7.0`.
6. `plugin/templates/kb/docs/getting-started/{{KB_DATE}}-how-your-knowledge-base-works.md`: only where it
   says how `/knowledge:explain` is run (check `plugin/templates/kb/server/publish.py` before touching
   its three-things list).
7. `web/src/content/marketing/content.ts`: `FEATURE_SKILL.lede` and `pane.meta` line count → `2,729`
   (format as today's "2,635"), equal to `wc -l web/public/SKILL.md`. **The landing's framing lines
   are OQ1's: do not reword them.**

Match each file's voice and density; no new sections beyond the requirements line.

**Set:** the seven files above and the slice folder. Nothing else (no skill, agent or `.claude/` file).

## Verify

- `python3 -m json.tool` on both manifests; `claude plugin validate .` and `claude plugin validate
  ./plugin` (name it if unavailable).
- `python3 scripts/plugin_parity.py` and `python3 scripts/skills_parity.py` exit 0.
- The landing's counts equal `wc -l web/public/SKILL.md` (grep).
- `pnpm --dir web typecheck` and `pnpm --dir web test`.
- A grep that no shipped text (plugin/, README.md, the landing content) still offers `resume`, `here`
  or the one-shot flow; list each remaining hit and why it stays.
- `python3 scripts/workflow.py validate`. No real-browser claim (the review looks at the landing pane).

## Close

- `result.md`, verdict block first.
- Through `phase-section`: one `## Doc impact` line (product: plugin 0.7.0, README and marketplace say
  explain needs a workspace v86+); consume both S2 notes (`--entry K --remove`); rewrite `## Now` for
  the review.
- No commit, no state moves.

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
