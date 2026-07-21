# Plan — P17.S2: Reconcile the old explain-skill copies

Operator-approved at the plan gate (2026-07-21). Read `../../phase.md` first — especially
the **"S1 done — cross-slice notes for the copies (S2)"** section (the derivation rule)
and *Constraints*. The canonical source you derive from is `plugin/skills/explain/SKILL.md`
(v2, landed by S1 — read it in full).

## Job

Propagate the v2 skill into the old copies, resolve the duplicate registration, and add
the missing sync guard. All decisions below are operator-ratified — implement, don't
re-litigate. The `~/.claude` user-level copy is handled by the OPERATOR at a pending
gate, not by you (see "Operator gate" below).

### 1. Delete the project copy

Remove `.claude/skills/explain/` entirely (`git rm`-style delete of the directory
contents; you do not run git — just delete the files). It was a third in-repo duplicate
of the canonical body and caused a double `explain` listing in this repo's sessions.
Grep `.claude/settings.json` / `.claude/settings.local.json` for any reference to the
deleted path (none expected; if found, report in result.md — do NOT edit settings).

### 2. Derive the portable `.agents` copy

Rewrite `.agents/skills/explain/SKILL.md`:
- Frontmatter: `name: explain` + the v2 `description` only (byte-same description value
  as the canonical frontmatter). No `argument-hint`, no `allowed-tools` — that is the
  portable variant's shape.
- Body (everything after frontmatter): **byte-identical to the canonical body** (§1–§8
  including the §2 resolver — do not re-derive or reword anything).

Refresh `.agents/skills/explain/agents/openai.yaml`: update `short_description` to the
v2 description (drop the hardcoded `~/projects/personal/knowledge` path — it is "your own
personal knowledge base" now, interactive HTML explainer with quiz + cited
best-practices). Keep `display_name`, `default_prompt`, `policy` as they are. Check two
or three sibling `.agents/skills/*/agents/openai.yaml` files for any tools/permissions
field pattern; if the schema plainly supports declaring tools, add the v2 tool needs
(web search/fetch + git reads) in that same pattern — otherwise leave policy untouched
and record in result.md that tool policy cannot be expressed there.

### 3. Add the sync guard

New `scripts/skills_parity.py` (root-only, never shipped — same stance as
`plugin_parity.py`; keep it ~40–60 lines, stdlib only, exit 0/1 with a short report):
- Strip YAML frontmatter (the leading `---` block) from `plugin/skills/explain/SKILL.md`
  and `.agents/skills/explain/SKILL.md`; byte-compare the remaining bodies → mismatch =
  FAIL.
- Compare the `description:` frontmatter values of the two files → mismatch = WARN (print,
  still exit 0) unless the body also mismatches.
- FAIL with a clear message if either file is missing.

Wire it into `.github/workflows/plugin-ci.yml` as one extra step after the existing
parity step: `- run: python3 scripts/skills_parity.py`. Touch nothing else in the
workflow. (No `plugin/**` change in this slice ⇒ no plugin version bump.)

### 4. Validation (terse)

- `python3 scripts/skills_parity.py` → exit 0 on your reconciled tree.
- Negative check: run it once against a perturbed TEMP copy (e.g. append a byte to a
  copy of the `.agents` body in /tmp and point a variant invocation at it, or just
  demonstrate via a temporary in-place perturbation you revert) → exit 1. Do not leave
  any perturbation behind.
- Stripped-body diff plugin ↔ `.agents` → empty. `.claude/skills/explain/` gone.
- `python3 scripts/workflow.py validate` → passes.
- Do NOT run `plugin_parity.py` as a gate (red until S4, known).

## Operator gate (how you finish)

The user-level `~/.claude/skills/explain/SKILL.md` must be updated to the v2 canonical
content, but `~/.claude` is an operator-machine path — you never write there. When all
repo-side work above is done and validated, write `result.md` (include the exact staged
command below), append your `phase.md` notes, and return **`needs_operator`** (NOT
`done`), stating:

> Repo-side reconciliation complete. Operator must run:
> `cp plugin/skills/explain/SKILL.md ~/.claude/skills/explain/SKILL.md`
> then the orchestrator verifies with
> `diff ~/.claude/skills/explain/SKILL.md plugin/skills/explain/SKILL.md` and finishes
> the slice.

## Wrap-up

`result.md`: what changed, openai.yaml tools-field finding, guard behavior (positive +
negative run), the staged operator command. `phase.md` appends: cross-slice note for
S5/REVIEW (the post-cutover "dogfood" end-state: operator installs the plugin user-wide
from the public marketplace and deletes the user-level bare copy — flagged, not done in
S2) and Doc impact lines (decisions: dupe resolution = project copy deleted, user-level
kept + updated, plugin+.agents are the two shipped copies, skills-parity CI guard added).
Never commit; never transition status.
