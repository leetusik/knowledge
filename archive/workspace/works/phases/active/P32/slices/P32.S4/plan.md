# P32.S4 — Part B and the five plugin agents

## Goal

Write the method texts every research role runs from, as Part B of the explain skill, and ship them as the
knowledge plugin's five agents: `web-researcher`, `code-researcher`, `gap-reviewer`, `verifier`,
`explain-critic`. The plugin agents' bodies are byte-identical extracts of Part B, so the single-file skill
copies (portable, landing) carry the whole method, and a new parity check holds the extracts to it.
Quality over efficiency: these briefs decide how well every future run researches; write them with care.

## Read first

- `phase.md` `## Notes for later slices`: **Rules for every slice** (edit scope, three copies, who owns which
  part of SKILL.md, the `claude -p` rules) and the **P32.S4** entry, this slice's spec.
- `phase.md` `## Decisions`: the S1, S2, S3 and DECOMP2 lines (roles, models, ladder, verifier, critic,
  agents' frontmatter, single-file copies).
- The topic sections the S4 entry lists, and only those unless one points further:
  - `topics/research-method.md` §3.6–3.8 (brief templates, roles, search rules);
  - `topics/research-evidence.md` §3.1–3.5 (findings file, library and ledger formats, ladder, independence,
    support bar), §3.8 (verifier), §3.9 (counter-evidence and disagreements, as the verifier and researchers
    need it), §3.10 (critic: `ledger` and `coverage`);
  - `topics/hosts-and-delivery.md` §4.1 (each agent's frontmatter and rules), §4.5 (verbatim text: the
    converter and Wayback), §4.6 (the three copies and the parity guard).
- The critic's base: the bootstrap's `payload/claude/agents/explain-critic.md` (read-only; one byte off P31's
  `works/phases/active/P31/package/claude/agents/explain-critic.md`).
- `plugin/skills/explain/SKILL.md`: headings (`grep -n '^#'`), §3 and §8 only; `scripts/skills_parity.py`;
  `scripts/plugin_parity.py`; `.github/workflows/plugin-ci.yml`; `plugin/.claude-plugin/plugin.json`.

## What to build

1. **Part B**, appended after §8 of the canonical `SKILL.md`, as clearly marked sections (a stable heading and
   begin/end markers the parity check can extract by):
   - the five role briefs, each standalone and in English: objective, inputs, the file it writes and its exact
     format, source and tool guidance, boundaries and size; every agent's return opens with the exact model id
     it ran on; `failed: search-limit` when searches stop returning; S3 §4.1's agent rules;
   - the shared sections the briefs need: the source ladder and independence rule, the support bar, the
     claim and passage formats;
   - `pagetext.py`, a standard-library HTML-to-text converter (S3 §4.5) as a fenced block that D0b (S5) writes
     out, and the Wayback commands (`curl`, one retry on HTTP 429);
   - the critic brief: the base critic's rubric kept whole, minus `permissionMode`, plus S2 §3.10's `ledger`
     and `coverage` categories and inputs.
   At most one pointer line goes into §3 ("the role briefs are in Part B"); S5 owns the rest of §3.
2. **`plugin/agents/<name>.md` × 5**, frontmatter per S3 §4.1 (name, description, model, effort, tools,
   `maxTurns`; never `permissionMode`, `hooks`, `mcpServers` or `Agent` in tools). Each body is a byte-identical
   extract of its Part B role section plus the shared sections it needs, in one fixed, documented order.
3. **The copies:** `.agents/skills/explain/SKILL.md` and `web/public/SKILL.md` updated in the same slice
   (portable: same body; landing: full-file byte copy).
4. **`scripts/skills_parity.py` AGENTS check** (a FAIL, like the others): all five agent files present; each
   body equals its extract from the canonical Part B; the forbidden frontmatter fields are absent. Touch
   `plugin-ci.yml` only if a new script is added.
5. **`## Doc impact`** in `phase.md`: one line per durable truth this changes (the plugin ships agents; the
   method's role briefs live in Part B).

## Verification

- `python3 scripts/skills_parity.py` and `python3 scripts/plugin_parity.py` pass.
- A mutated temporary copy of one agent body makes the AGENTS check fail; revert it and confirm it passes.
- `claude plugin validate plugin` passes.
- A smoke run, `claude -p --plugin-dir plugin` with scratch `XDG_*`/`KB_*` env (the `claude -p` rules), lists
  the five `knowledge:*` agents. Spend cap for this slice's `claude -p` runs: **$2** total, summed from each
  run's `total_cost_usd`; at the cap, return `needs_operator`.
- The converter's output for one saved page string-matches a quote taken from that page (work in the session
  scratchpad, `python3 -I`).
- `git diff --stat` touches only the edit scope; `validate` passes.

## Notebook and result

- `phase.md`, one section at a time with `phase-section`: remove the P32.S4 entry from `## Notes for later
  slices`, adding a short `(from P32.S4, for P32.S5)` note with anything S5 needs (the Part B headings and
  markers, the extract order, where the converter block is); `## Decisions` for any choice you settled;
  `## Doc impact`; `## Now`.
- `result.md`: the verdict block first (`status`, `tier`, `model`, `effort` from `## Dispatch`, `summary`,
  `files_changed`, `validation`, `deviations`, `doc_impact`), then the spend on `claude -p`.
- No commit, no state command.

## Dispatch

slice=P32.S4
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
