# P39-hk.S3 — the writing rules: easy reading, visuals first, next steps, the critic's reading checks

## Context

The operator's addition B, verbatim in `works/phases/active/P39-hk/intent.md` § *Scope Added at Execution*:

> no hard reading, many visual stuff, including looking good formula. don't just shitting around with 수학 기호들. I'm not prohibit them but make them looks good. and easy to understand.

Sections **B** and **A** there are the contract, plus C's "next steps" line. Earlier slices already rewrote parts of `plugin/skills/explain/SKILL.md`:
- S1, the front door. §1 *The reader* and §1 *The shape* now define what the confirmation proposes: the reader's questions in their order, one or two other shapes, an optional Quiz, an optional Next steps part, and no Best practices.
- S2, the evidence model. §3 *Gather the evidence* is one writer reading the code and the covering phases' records into `evidence.md`, with `## Gaps` and `## Open` (`O` ids). §4.6 Sources is a plain `## Sources {#sources-list}` section, and B5 checks every sentence against the code and the records.

This slice rewrites §4's writing rules and the critic's reading checks. It runs **alone** (no wave): it writes its own `phase.md` entries through `phase-section`, under the budget.

**Not this slice:**
- §4.4's grammar text for the glossary block, `term:` links, inline math and the `formula` block. The grammar doesn't exist yet: DECOMP2 builds it, and its skill §4 slice writes that text from `topics/glossary-and-math.md`.
- Deleting the research agents (S4), and the frontmatter and product copy (S4).

## Read first

- `python3 scripts/workflow.py phase-section P39-hk Decisions`: S1's *Reader and shape*; S2's *evidence model*, *No new things* and *The critic's inputs*; R1's grammar entries, for the names only.
- `works/phases/active/P39-hk/topics/notes-for-later-slices.md`: the blocks whose first line is `**(from S1, for S3)**` and `**(from S2, for S3)**`.
- `works/phases/active/P39-hk/topics/breakdown.md`: `## Pins for every skill slice (S1–S4)` and `## P39-hk.S3`. Line numbers there predate S1 and S2; work by heading.
- `works/phases/active/P39-hk/topics/skill-headings.md`: append every heading change.

## The work, by heading of `plugin/skills/explain/SKILL.md`

1. **§4's prose rules** (in `## 4. Write the chapter`, before §4.1).
   - Add **visuals first**: a diagram, chart or figure wherever a picture explains better than a paragraph, using the grammar that exists today (§4.4's diagrams, figures, SVG and charts).
   - Add **short paragraphs**: no dense stretch. Give a concrete bound that the writer can follow and the critic can flag (e.g. a paragraph's length, or a cap on consecutive paragraphs without a visual, list or block). Choose it and state it once.
   - Retire **"novice-friendly by default"** in every place it survives in §4: the reader is §1 *The reader*'s concrete guess.
   - Rewrite the bullets S2 only re-pointed (*Teach, don't report*, *Standalone*) where they conflict with this.
   - Add **formulas that look good**. A formula is typeset, never a bare symbol string in prose ("s = mean ÷ sd and t = s × √n" typed inline is the anti-example, from the operator's own document). Each display formula carries a plain-words reading and a "where" legend. Write the rule now, and point at the formula grammar with one forward line, e.g. "the inline and display forms are in §4.4 once the reader supports them". Don't write the grammar itself.
2. **§4.2 the outline.** It loosens to the signed, subject-shaped sections from §1 *The shape*.
   - The "In one paragraph" box and Sources stay.
   - The Quiz appears only when the confirmation kept it.
   - Next steps appear only when something is open.
   - Remove §4.2 items 4 and 6 (best practices; "the pages you opened"). Rename the heading if its job changes, e.g. "The outline, from the signed shape", and log it.
3. **§4.5.** Best practices go. **Next steps** come from the workspace, as `evidence.md`'s `## Open` entries (`O` ids): open deferred jobs, open operator questions, decisions not yet built.
   - They are suggested only when something is open, and each traces to its record like any sentence.
   - The quiz rules stay, under "only when the shape kept it".
   - Rename the heading (e.g. "Next steps, and the quiz") and log it.
4. **The critic** (§4.10 D8 and **B5**). Add three checks beside *Clarity*: **hard reading** (a dense stretch past the bound), **a missing visual** (a passage a picture would explain better) and **a bare symbol string in prose**.
   - Each gets a category name the verdict reports, consistent with B5's existing category list.
   - Keep B5's rubric and its return block coherent.
   - Regenerate `plugin/agents/explain-critic.md`'s body via `python3 scripts/skills_parity.py --write-agents`. Its frontmatter was hand-edited in S2 and stays as is unless its `description` must name the new checks.
5. **§8 D9's report** and **§9.3**: touch them only where they name best practices or the fixed outline.
6. **Propagate:**
   - `.agents/skills/explain/SKILL.md`: the canonical body, byte-equal; frontmatter without `argument-hint:` / `allowed-tools:`.
   - `web/public/SKILL.md`: `cp`.
   - `plugin/agents/*.md`: `--write-agents`.
7. **Deferred items:** name any D86-sd / D69 / D85-qk item a rewritten passage settles, in `result.md`.

## Validation

- `python3 scripts/skills_parity.py` → PASS.
- `python3 scripts/plugin_parity.py` → PASS.
- `uv run pytest tests/test_explain_resolver.py -q` passes.
- `git status --porcelain .claude/` shows nothing of this slice's.
- `grep -n -i -E "best practice|novice|recommended outline|pages you opened" plugin/skills/explain/SKILL.md`: account in `result.md` for every hit left outside Part B's B1–B4/B6–B12 and the frontmatter (S4's).
- P33-n3's citation check: record the count only.
- `python3 scripts/workflow.py validate` passes.

## Notebook (written by this slice through `phase-section`, never `Edit`/`Write` on `phase.md`)

- **Decisions:** one gist line for the reading rules (the bound chosen), one for next steps, one for the critic's three checks.
- **Notes for later slices:** for S4 (what is left), for DECOMP2's skill §4 slice (where the formula grammar text must land and what the forward line says), and for S5 (headings changed). The section is at its 6 KB budget: move an older consumed note or two to `topics/notes-for-later-slices.md` (`--to-topic notes-for-later-slices --entry K`) before appending. Remove the two S3-bound pointer lines `(from S1, for S3)` and `(from S2, for S3)` once consumed (`--entry K --remove`).
- **Now:** replace it with S3's landing and "Next: S4".

## Set

The shipped set, from the breakdown's pins:
- `plugin/skills/explain/SKILL.md`;
- `.agents/skills/explain/SKILL.md`;
- `web/public/SKILL.md`;
- `plugin/agents/*.md` (regenerated);
- `works/phases/active/P39-hk/topics/skill-headings.md`;
- this slice's `result.md`;
- `phase.md` through `phase-section`, and `topics/notes-for-later-slices.md` through `--to-topic`.

No `plugin.json` version bump. Nothing under `.claude/`.

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
