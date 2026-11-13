# P38-e1.S4 — verify only what the outline uses (intent item 3)

## Goal

Today a `full` run verifies at two points:
- every round, D3v verifies the round's new or changed load-bearing claims;
- D5 then verifies every mapped `candidate` claim plus the main claims, with counter-evidence.

In P50-4b that came to 259 checks for 195 used claims, many of them never written. After this slice, the outline **picks** its claims first, within S3's claim cap, and **only the picked (`· used`) claims are verified**, the main ones among them with counter-evidence. This binds a v1 run and a v2 alike. Verification is the expensive, second-model step; the researchers' own states are enough to steer the gap rounds.

## Why high (the trigger)

**Core invariant:** a run's stage order and how it resumes.
- §3.3's resume steps 3–4 ("go on from the recorded stage", "Then D5–D5g again").
- The run card's stage table.
- D5g's inputs.

A run stopped at any recorded stage, the new pick point included, must still resume correctly from disk.

## The design (the high row decides; the DECOMP's recommendation is the starting point)

Read `works/phases/active/P38-e1/topics/breakdown.md` **`## P38-e1.S4`**, **`## The shipped set`** and **`## Pins for every rule slice`**. The recommendation:

1. **No per-round D3v.**
   - D3s applies the researchers' own reported states (B8, from their findings files) and keeps each claim `candidate`.
   - The gap reviewer (B3) judges on those states, knowing they are unverified.
   - Decide what D3v's row and text become. Recommended: it survives in name as a no-op for `full`, or folds into D5, and keeps a resume meaning for old `run.md` files. Whatever you choose, keep the heading `### 3.6 D3: the merge, then D3v and D3s` byte for byte. The text under it may say D3v now runs only where you decide it still must.
2. **The pick.** When research stops (§3.7's stop), the lead maps claims to the **signed sections** (S2) within the **cap** (S3) and marks each picked claim `· used` on its ledger line, load-bearing and must-cover first.
   - **Place it** where no heading changes: as the first step of §3.8 or a step named inside §3.10. Pick the place that keeps the stage table honest.
   - **Give it a recorded stage**, so resume knows it happened: a sub-stage name such as `D5p pick`, or a `run.md` log line. Add, never rename: D0–D9 keep their names.
3. **D5 verifies only `· used` claims**, about 15 to a batch, grouped by source, with counter-evidence on the main claims among them, then D5s, then D5g on the verified states.
   - The main-claim marking (`· main`) applies within the used set.
   - Keep: the verifier on another model, one re-verification per claim at most, and the `researchers_model:` field.
4. **D6's swap.** A used claim that fails at D5 is swapped **once** for a candidate covering the same question, verified in one more small batch. Otherwise it is cut, or stated hedged and attributed (B8). S2's section-cut rule then applies. The D6 final outline lists only verified used claims.
5. **The rest of the reach:**
   - §3.9: `quick`'s single batch becomes one batch of the used claims.
   - §4's writer-gap top-up: verified once, as today.
   - **A book** (§9.2, §9.3): the research is frozen at the outline signature, so a chapter's picked claims are verified into its overlay `ledger-ch<k>.md`, never the frozen ledger. State where the book's whole-book research verifies, if anywhere, before its outline gate. Keep the book's gate meaningful.
   - B3 (it reads unverified states).
   - B4 (dispatch form unchanged; only which claims it gets changes).
   - Regenerate the agents.
6. **The critic depends on the verifier records.** S6 makes the critic trust the run's verifier records and sample only a few sources. So every `· used` claim must end with a verifier record the critic can read: a `verify/final-b<k>.md` entry. Say where in §3.8.

## Must keep

- S2's D5g rule: the must-cover rule stands; the two-thirds rule counts over the remaining sections; a section holding a must-cover item is never cut.
- S3's claim cap and ceiling 8 (verifier batches are not counted in it).
- **Resume:**
  - The stage table, §3.3's resume steps and `run.md`'s `## Log` template show the new order.
  - A resume at any stage (mid-wave, after research stopped but before the pick, mid-D5, at the D5g resume note) goes on correctly.
  - The D5g resume note's "Then D5–D5g again" still works, with a `trust` round's new claims re-entering the pick.
- The run card's "Never skip or shorten a stage" rule. If any wording would contradict it, reword only that clause to say verification is sized to the used claims, not skipped.
- **Headings, `§` numbers and Part B marker lines** (and their `with=` lists) stay byte for byte. No new `## Explain` field and no new `run:` value.

## The set (touch nothing else)

- The canonical `plugin/skills/explain/SKILL.md`.
- `.agents/skills/explain/SKILL.md`: the canonical file minus the `argument-hint:` and `allowed-tools:` lines, body byte-equal.
- `web/public/SKILL.md`: a full `cp`.
- The five `plugin/agents/*.md`, regenerated with `python3 scripts/skills_parity.py --write-agents`.

**Never** edit `.claude/skills/**`, commit, or move workflow state.

**The notebook:**
- `## Doc impact` (`--append`): `product.md`: explain verifies only the claims the outline uses, picked before verification (P38-e1.S4).
- `## Decisions`: one gist line for the design you chose (where the pick lives, its stage name, D3v's fate).
- A note for S5, which reuses a prior's verified claims and must fit the pick, and for S6 (the verifier records the critic trusts).
- Update `## Now`.

## Validation

- `python3 scripts/skills_parity.py` → PASS
- `python3 scripts/plugin_parity.py` → PASS
- **The heading diff against `14e1cbda`** → empty: save `git show 14e1cbda:plugin/skills/explain/SKILL.md` to the session scratchpad and diff the `^#` lines (the sandbox refuses `<(…)`). The Part B marker lines must be identical too.
- P33-n3's citation check (`works/phases/active/P33-n3/topics/citations.md` L64–85) → `checked=200 missing=2`, no worse
- `uv run pytest tests/test_explain_resolver.py -q` → passes
- **A read-through in `result.md`:**
  - the card's stage table against §3.3's resume steps, §3.6–§3.10, §9.2 and §9.3;
  - a resume walk at four points: mid-wave, research stopped before the pick, mid-D5, and the D5g `trust` note.
- **A hand-run of P50-4b's counts in `result.md`** (from `topics/cost-evidence.md`): ≈ 195 used claims in ≈ 13–14 batches, against 259 checks in 19. Plus P48-q4's v1 counts, if the evidence file has them.
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
