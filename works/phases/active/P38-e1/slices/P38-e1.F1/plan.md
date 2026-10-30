# P38-e1.F1 — apply the desk check's 15 findings

## Why this slice

S8's paper desk check passed on sizing:
- a v1 sizes to 4 researchers, ≈ $31–49 against $73.97;
- a v2 delta sizes to 2, ≈ $25–42 against $79.22;
- a translation is one write span, ≈ $3.

It also recorded **15 findings** (desk findings **D-F1…D-F15** below, to avoid confusion with this slice's id), each with its exact correction:
- **D-F1…D-F7** are rule and cost-table gaps.
- **D-F8…D-F15** are confirmation lines a newcomer cannot follow. These matter most: the operator asked for the confirmation and the documents to be "easier to understand".

The release (S9) ships only rules the desk check passed, so these land first.

**Risk `high`:** a fix to mid-row work (S2, S6 and S7 ran on the mid row), per the engine's risk rule.

## The work

Apply every correction **exactly as written** in `works/phases/active/P38-e1/topics/desk-check.md` **§8 *Findings***; S8's `result.md` has the same list. Line numbers there are at `af566e54` and still current, but re-find each line by its text. The one choice left open is made here:

- **D-F2:** give the `quick` row a projected price: `≈ $15–25 (projected; not metered yet)`. The narrow-subject Cost line then shows that price. The whole table stays labelled "measured on plugin 0.8.0 runs, projected for 0.9.0", and D-F5 relabels the v1 row as projected.

The rest, in short:
- **D-F1:** `cheaper:` is shown only when one applies.
- **D-F3:** a `- web searches:` line.
- **D-F4:** a book's run line drops quick and no-research.
- **D-F5:** the v1 row is labelled projected.
- **D-F6:** the explain phase around the run appears in the translation row and in the Cost paragraph.
- **D-F7:** the `save` synopsis gains `--slug`.
- **D-F8…D-F15:** the plain-word rewrites of the run line, the Cost line's agent list, "earlier version" in the summary list (the `## Explain` field stays `prior:`), permissions, stops, the book's stops line, must-cover on its own line(s), and `from scratch` said once, on the Cost line.

**Then re-render the three sample confirmations** in `desk-check.md` §4 (v1 document, v2 delta, book), so they match the fixed §1 step 7 exactly. The REVIEW hands them to the operator as the acceptance walkthrough. Mark §8's findings `fixed in P38-e1.F1`, and update the cost-table check in §7 if D-F2 or D-F6 moved a number.

## Constraints

- **Headings, `§` numbers and Part B marker lines** stay byte for byte. No new `## Explain` field (field names unchanged) and no new `run:` value.
- Plain words are the point. Keep each confirmation line short, with no jargon a newcomer would not know. Where a desk finding's wording can be shorter and still exact, shorten it.
- **The set** (touch nothing else):
  - the canonical `plugin/skills/explain/SKILL.md`;
  - `.agents/skills/explain/SKILL.md`: the canonical file minus the `argument-hint:` and `allowed-tools:` lines, body byte-equal;
  - `web/public/SKILL.md`: a full `cp`;
  - the five `plugin/agents/*.md`, regenerated only if Part B changes;
  - `works/phases/active/P38-e1/topics/desk-check.md`.
- **Never** edit `.claude/skills/**`, commit, or move workflow state.
- **The notebook:**
  - Consume the `(from S8, for REVIEW)` note's fixed part, leaving what the REVIEW still needs.
  - Rewrite `## Now` under 2,048 B (`--replace`).
  - No new `## Doc impact` line unless a fix changes a durable rule beyond S2/S6/S7's existing notes.

## Validation

- `python3 scripts/skills_parity.py` → PASS
- `python3 scripts/plugin_parity.py` → PASS
- **The heading diff against `14e1cbda`** → empty: save `git show 14e1cbda:plugin/skills/explain/SKILL.md` to the session scratchpad and diff the `^#` lines. The Part B marker lines must be identical too.
- P33-n3's citation check (`works/phases/active/P33-n3/topics/citations.md` L64–85) → `checked=200 missing=2`, no worse
- `uv run pytest tests/test_explain_resolver.py -q` → passes
- A finding-by-finding table in `result.md` (D-F1…D-F15 → the line now holding the fix)
- `desk-check.md` §4's three samples equal what the fixed §1 step 7 renders
- `git status --porcelain .claude/` → nothing of this slice's

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
