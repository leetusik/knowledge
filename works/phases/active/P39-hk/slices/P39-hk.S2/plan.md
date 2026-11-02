# P39-hk.S2 — the evidence model: write only from the code and the phases' records

## Context

The operator's addition C, verbatim in `works/phases/active/P39-hk/intent.md` § *Scope Added at Execution*:

> all of the explains will cover based on only what the codebase does. no new things. and don't try to research by explainer self. just embrace the what phases are did.

The confirmed lines (section **C** there) are the contract:
- No research by the explainer: no web search, no research agents, no fact-check batches, no gap rounds.
- **One writer** reads the records of the phases that built the subject (intent, decisions, slice results, research findings) and the code itself.
- Every sentence traces to a code range or a line of those records.
- A critic on a second model checks the draft against them before publish.
- No new things: an idea the code relies on is explained only as far as the code and the records state it.
- v2 is the prior plus the phases since.
- Translation stays.
- Codebase books stay, their chapters drawn from phases.
- Glossary definitions and formulas trace to the code and the records too.

S1 already rewrote the front door (§1 and the confirmation). Its `## Explain` field set (16 lines; `phases:` names the covering phases) and its rules, §1 *The reader* and §1 *The shape*, are in the notebook's Decisions. **This slice rewrites how the chapter's evidence is gathered and checked.** S3 then rewrites §4's writing rules (visuals first, short paragraphs, next steps, the outline). S4 deletes the research agents and Part B's research roles and rewrites the frontmatter and the product copy. S5 hands the workspace route off.

## Read first

- `python3 scripts/workflow.py phase-section P39-hk Decisions`, and `phase-section P39-hk "Notes for later slices"`. Especially:
  - the S1 notes "for S2";
  - the vendored-route note (never edit `.claude/`; P33-n3's citation count is recorded, never chased);
  - the deferred-overlap note.
- `works/phases/active/P39-hk/topics/breakdown.md`: `## Pins for every skill slice (S1–S4)` (the shipped set, the validation, the heading crosswalk, no version bump, no new tests) and `## P39-hk.S2`. **Its line numbers predate S1**, which shifted the file by about +106; work by heading.
- `works/phases/active/P39-hk/topics/skill-headings.md`: S1 changed no heading. Append every heading this slice adds, renames, renumbers or deletes.

## The work, by heading of `plugin/skills/explain/SKILL.md`

1. **The evidence model** (the open design this slice owns; decide it once and write it into §3).
   - **What the writer reads:**
     - the covering phases from `## Explain`'s `phases:` line, under `works/phases/active/<P>/` or `works/phases/archived/<stamp>_<P>_<slug>/`: `intent.md`; the `phase.md` Decisions and Notes, read by section; the slices' `result.md` verdict heads; `topics/*.md` research findings;
     - the code at one pinned commit.

     Nothing else. No web, no other repos, and no library docs beyond what the code and the records say.
   - **How a sentence traces.** Choose the citation form for a code range, and keep the existing hashed code-range form if one exists in §3/B9/B2. Choose the form for a record line (e.g. a repo path plus line range at the pinned commit). Choose the light record the writer keeps (the old dossier/ledger shrinks to what one writer plus one critic need).
   - **"No new things".** An idea the code relies on, e.g. a statistic the code computes, is explained only as far as the code and the records state it. A gap is written as a gap ("the records do not say why…"), never filled from outside.
   - **The glossary and formulas** trace the same way (the grammar itself lands in DECOMP2's build).
2. **The run card** (`## The run, in one card`). Rewrite it around one writer and one critic. Remove the D0b preflight, `run.md` resuming, D1–D5 (plan, waves, merge, D3v/D3s, gap rounds, D5 verification, the evidence gate) and team sizing.
3. **§3** (`## 3. Research`). Rewrite it as the evidence stage, and rename it if its job changes (e.g. "Gather the evidence"); log the rename in the crosswalk.
   - §3.1 D0's brief: point the reader at §1 *The reader*, and drop `mode: … general` and `run:` (S1's note).
   - **v2** = the prior plus the phases since: the delta reshaped around phases. Front-door step 5's prior-dossier lookup is kept or cut to match.
   - **Translation** stays.
   - §3.2–§3.9 go, or fold into the new stage where a job survives.
   - D6 (the reader's path) becomes the outline taken from the signed shape (§1 *The shape*).
4. **§4's evidence rules** (in `## 4. Write the chapter`, before §4.1). **§4.6 Sources**: the sources are code ranges and phase records. **§8 D9's report.** Make each follow the model. Leave §4's other writing rules (§4.2 outline, §4.5 best practices) to S3.
5. **§9 A book.** Codebase books only, chapters drawn from phases. §9.2 / §9.3's research and top-up go, replaced by the same evidence stage per chapter.
6. **The critic.** §4.10 D8 and **B5** (`knowledge:explain-critic`) check the draft against the code and the records, on a second model.
   - Re-scope its inputs, its `with=` list and the shared extracts it keeps. It no longer checks against "opened sources" or a research ledger.
   - B5's `allowed tools` / body regenerate into `plugin/agents/explain-critic.md` via `python3 scripts/skills_parity.py --write-agents`. Never hand-edit an agent file.
   - S3 adds the critic's hard-reading / missing-visual / bare-symbol checks; leave room for them, but don't write them.
7. **Leave for S4:** B1–B4, B6–B12 and the frontmatter. B0 may need a one-line pointer if it names stages that are gone. Their bodies may regenerate if a shared extract changes; that's fine.
8. **`## 2`** (the KB resolver) stays untouched. The resolver test must keep passing.
9. **Propagate:** `.agents/skills/explain/SKILL.md` (the canonical body, byte-equal; frontmatter without `argument-hint:` / `allowed-tools:`), `web/public/SKILL.md` (`cp`), and `plugin/agents/*.md` (`--write-agents`).
10. **Deferred items.** Name any D86-sd / D69 / D85-qk item a rewritten passage settles in `result.md`. Never widen the slice for one. List in `result.md` the deferred jobs whose subject this slice retires (D67, D72, D73, D76, D84-8s concern research machinery) as close/drop candidates for the review.

## Validation

- `python3 scripts/skills_parity.py` → PASS.
- `python3 scripts/plugin_parity.py` → PASS.
- `uv run pytest tests/test_explain_resolver.py -q` passes.
- `git status --porcelain .claude/` shows nothing of this slice's.
- `grep -n -i -E "WebSearch|WebFetch|web search|gap round|verifier|evidence gate|run\.md|D0b|D5|ledger|dossier" plugin/skills/explain/SKILL.md`: account in `result.md` for every hit left outside Part B's B1–B4/B6–B12 (S4's) and the frontmatter (S4's).
- P33-n3's citation check: record the count only.

## Notebook (returned, never written: this runs in a wave)

- **Decisions:**
  - the evidence model, as one gist line: what the writer reads; the citation forms; the record kept;
  - v2 from phases;
  - books from phases;
  - the critic's new inputs.

  Long detail goes to a new `works/phases/active/P39-hk/topics/evidence-model.md`, behind the gist (it is in this slice's set).
- **Notes for later slices:** for S3 (what §4 now assumes), S4 (what is left to delete, the agents to retire) and S5 (what the route's chapter and review references must mirror). Gist-sized: the notes section is at its budget.
- **Doc impact:** none beyond DECOMP's explain-contract line, unless a finding changes durable truth.
- **Now:** one line.

## Wave

- **Set:**
  - `plugin/skills/explain/SKILL.md`;
  - `.agents/skills/explain/SKILL.md`;
  - `web/public/SKILL.md`;
  - `plugin/agents/*.md`;
  - `works/phases/active/P39-hk/topics/skill-headings.md`;
  - `works/phases/active/P39-hk/topics/evidence-model.md` (new).

  Plus this slice's own `result.md`.
- **Beside it:** `P39-hk.R1` (research, findings only), set `works/phases/active/P39-hk/topics/glossary-and-math.md`.
- **Commits waiting:** none (S1 is committed).
- **Join-rebuilt artifact:** none.
- **Checks scoped to this set:** the validation above. List any whole-tree check left out as `deferred: whole-tree`.
- **Rules:**
  - write no `phase.md`, and run no writing engine command;
  - edit nothing outside the set; any other file needed means `needs_operator`, naming it;
  - no `plugin.json` version bump.

## Dispatch

route=high
reason=risk high (not low)
subagent_type=slice-executor
model=opus
pass_model=yes
effort=xhigh
pass_effort=yes
attribution=Claude Opus 5.5
explore_model=haiku
explore_effort=xhigh
