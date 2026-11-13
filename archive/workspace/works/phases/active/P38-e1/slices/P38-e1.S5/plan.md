# P38-e1.S5 — a delta mode for a v2 (intent item 1)

## Goal

**The case.** P50-4b was a v2 of a three-day-old document whose code had not changed. It still re-researched from scratch:
- it re-opened 22 of v1's sources;
- it kept 24 of v1's 27 headings, all 4 diagrams and 5 of 6 quiz items;
- about 126 of its 195 used claims rest on unchanged sources (`topics/cost-evidence.md` §1).

**After this slice**, when a v2's prior has a findable dossier:
- the run researches **only what changed** since the prior;
- it **reuses the prior's verified claims** whose sources are unchanged, **checked by content**, without re-proving them.

It is not a new `run:` value: it is how `run: full` behaves when `prior:` names a version and its dossier is found. The operator can decline it at the confirmation. A **v1 is untouched**: with no prior, everything stays exactly as §3.1–§3.10 read now.

## Why high (the trigger)

**Open design.** The intent fixes the goal, but not:
- how the prior's dossier is found;
- how "unchanged" is checked by content;
- how reused claims are identified and enter the new ledger.

## The design (the high row decides; these are the pinned constraints and the starting points)

Read `works/phases/active/P38-e1/topics/breakdown.md` **`## P38-e1.S5`**, **`## The shipped set`** and **`## Pins for every rule slice`**, plus the `(from S3, for S5…)` and `(from S4, for S5)` notes (`phase-section P38-e1 "Notes for later slices"`). Decide and write:

1. **Finding the prior's dossier.** It is committed with its explain phase, `pages/` excepted. Search order:
   - the explain phase whose published `rel_path` (or book/chapter key) and version match `prior:`, found from its `## Explain` `subject` and its review's `## Publish` or `S1` result, under `works/phases/active/*` or `works/phases/archived/**`;
   - else a legacy state-dir dossier a run named.
   - **Not found** (a prior published from another repo, an archived phase pruned, a pre-dossier prior): the run is a plain `full` run that only reads the prior's text as one source (as §3.1 does today), and `run.md` and §8 say "delta: none (no dossier)". Never a stop.
2. **The content check, per source** (no claim re-verification):
   - **Code:** the claim's hashed range (B9 already hashes code ranges) is compared at the prior's commit and at HEAD.
   - **Web:** one fresh fetch per source, and the saved passage must be re-found verbatim. The `pages/` copies are gone after a merge, so the passage text in the findings or verify file is the reference.
   - Decide who runs the fetches: the lead, or one small agent. Keep it to one pass with no new searching.
   - A source that fails the check, or cannot be fetched, is **changed**: its claims become candidates for the delta's research, never reused.
3. **Reuse.** A prior claim is reused when it was verified (`supported`, `partial` with its narrower claim, or `contested` with its disagreement) and every source it rests on is unchanged. It enters the new ledger with:
   - its status;
   - a `reused-from: <prior run-id>/<claim id>` mark;
   - an id that cannot collide with the new run's `r<n>` stems: decide the form (e.g. `C-v<N>-…` or a `p-` stem);
   - its prior verify record linked, so S4's rule holds: a reused `· used` claim whose source is unchanged skips D5, because its ledger line links a record the critic can read.

   The prior's library entries come across the same way.
4. **What is researched** (D1 plans the delta):
   - `git diff <prior commit>..HEAD` over the subject's paths;
   - the work records since the prior's date (for a phase subject);
   - signed sections that are new or changed (S2's `new` and `renamed` marks);
   - new must-cover items;
   - the claims of changed sources.

   It is sized by S3's rule **on the changed share**, so an unchanged-code v2 gets 1–2 code + 0–1 web, and possibly 0 researchers when nothing changed but the sections. Add the delta's form of `plan.md`'s `size:` header line.
5. **With S4:** reused claims enter D5p like any claim and count toward `C`. The swap pool is the unpicked candidates, reused ones included.
6. **The decline word.**
   - Pick it ("from scratch" is suggested).
   - Say in §1 that a v2's confirmation offers it, but write no `Cost:` line: S7 writes that line and shows the word on it.
   - The lead reads the operator's reply under `intent.md`'s *Original Input*. A declined delta is a plain `full` run with the prior read as a source, as today.
7. **§8 report:** `delta: reused <n> claims from v<N> · re-researched <m>` (or `delta: none (<why>)`).
8. **Resume:** the delta's checks are recorded in `run.md` (a `## Log` line, a stage or sub-step name you choose), so a resumed run never redoes or skips them. Add, never rename: D0–D9 and D5p keep their names.

## Must keep

- A v1 run is byte-for-byte the same procedure as now.
- S2's signed sections and D5g rule; S3's cap and ceiling; S4's D5p, D5 and D5s order and its resume walk.
- The run card's "Never skip or shorten a stage" rule. Reuse is a content-checked carry-over, not a skipped verification: if a clause would contradict the rule, add one sentence saying so.
- **Headings, `§` numbers and Part B marker lines** (and their `with=` lists) stay byte for byte. No new `## Explain` field and no new `run:` value.

## The set (touch nothing else)

- The canonical `plugin/skills/explain/SKILL.md`.
- `.agents/skills/explain/SKILL.md`: the canonical file minus the `argument-hint:` and `allowed-tools:` lines, body byte-equal.
- `web/public/SKILL.md`: a full `cp`.
- The five `plugin/agents/*.md`, regenerated with `python3 scripts/skills_parity.py --write-agents` if Part B changes.

**Never** edit `.claude/skills/**`, commit, or move workflow state.

**The notebook:**
- `## Doc impact` (`--append`): `product.md`: a v2 explain runs as a delta of its prior, reusing content-checked verified claims (P38-e1.S5).
- `## Decisions`: one gist line for the design (dossier lookup, check, id form, decline word).
- A note for S7 (the decline word and what the cost line shows for a delta) and for S8 (the hand-run numbers).
- Remove the consumed `for S5` notes (`--entry K --remove`) when nothing else in them is needed, and update `## Now`.

## Validation

- `python3 scripts/skills_parity.py` → PASS
- `python3 scripts/plugin_parity.py` → PASS
- **The heading diff against `14e1cbda`** → empty: save `git show 14e1cbda:plugin/skills/explain/SKILL.md` to the session scratchpad and diff the `^#` lines. The Part B marker lines must be identical too.
- P33-n3's citation check (`works/phases/active/P33-n3/topics/citations.md` L64–85) → `checked=200 missing=2`, no worse
- `uv run pytest tests/test_explain_resolver.py -q` → passes
- **A hand-run on P50-4b in `result.md`**, read-only in `/Users/sugang/projects/personal/arb_upbit_1`:
  - which v1 dossier a delta would find, and how;
  - which sources pass the content check (code ranges by hash; web marked "would re-fetch");
  - how many claims it reuses;
  - what it would research, and the team size (expect 1–2 code + 0–1 web).
- **A walk in `result.md`** showing that a v1 run and a declined delta follow the unchanged procedure.
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
