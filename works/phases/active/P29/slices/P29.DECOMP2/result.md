# P29.DECOMP2 — result

- status: done
- tier: high
- model: opus
- effort: high
- summary: Cut P29's design work into three co-work waves of nine jobs — S4 reader (critic+judge); S5 figures, diagrams (critic+judge), quiz, annotations; S6 library (critic+judge), book-page, review, legacy-and-print — and wrote the final 25-line build inventory, the canvas content rule, Q4–Q8 as working assumptions and the four accepted research amendments (in place) into phase.md. The DECOMP2 notes are split per wave, and S4 gets the operator's verbatim words from rounds 01–06: no standing rule is stated verbatim, so `bar.md` seeds as `none beyond the shipped bar`.
- files_changed: works/phases/active/P29/phase.md; works/phases/active/P29/slices/P29.S4/slice.json, P29.S5/slice.json, P29.S6/slice.json (created by `new-slice`); works/phases/active/P29/slices/P29.DECOMP2/result.md; engine-regenerated works/backlog.md, works/index.json, works/events.jsonl, works/state.json
- validation: `python3 scripts/workflow.py validate` — passed (warnings only, all pre-existing: legacy kinds in P22/P26, P28 consolidation debt, stale docs, oversized doc sections); `## Slices` shows S4, S5, S6 at orders 50/60/70, before REVIEW — passed; phase.md 88,778 B, under the 400 KB budget — passed; `git status --porcelain` shows only the P29 folder plus the engine's generated files — passed
- deviations: none of substance. (1) The "7 kinds" fix is made in the notes; the S2 row's Outcome cell in the generated `## Slices` table still reads "7-kind", because that block is engine-owned (from `finish-slice --outcome`) and not editable. (2) The S4 note also cites the P29 `intent.md` taste lines (`:25`, `:26`, `:29`) beside the rounds, labelled as this phase's own words, because the handoff's collected taste needs them.
- doc_impact: none (a decomposition changes no durable truth)

## What was done

1. **Slices created** (bare folders, `slice.json` only, no `plan.md`):
   - `new-slice --phase P29 --slice P29.S4 --name "Design wave 1 — the reader" --kind co-work --risk high --order 50 --depends-on P29.DECOMP2`
   - `new-slice --phase P29 --slice P29.S5 --name "Design wave 2 — chapter blocks and annotations" --kind co-work --risk high --order 60 --depends-on P29.S4`
   - `new-slice --phase P29 --slice P29.S6 --name "Design wave 3 — library, book page, review, legacy and print" --kind co-work --risk high --order 70 --depends-on P29.S5`
2. **`## Slice breakdown and build inventory` rewritten.** Its contents:
   - one paragraph on the completed research slices;
   - the wave table;
   - each job's scope, as the plan states it;
   - the **final build inventory**: 25 lines, *what* not how, each mapped to one job. Every provisional line 1–9 is covered. Print, the public org library, the sepia theme and typography, and the loading states are added. The "Out" line now names the column-width setting and the JS widgets and math of Q4/Q5.
   
   The old per-research-slice scope text was dropped: those slices are done, and their contracts live in `## Decisions`.
3. **`## Decisions`** — a new subsection, *The design cut (P29.DECOMP2)*, records:
   - the cut and the critique levels, with their reasons;
   - `new visual direction: no`, quoting `intent.md:81-82` and `:26`;
   - the canvas content rule;
   - the inline setup at S4 (system sync, `bar.md`);
   - Q4–Q8 as working assumptions;
   - the four amendments, accepted.

   The D36 routing line was updated in place: (4) and (6) go to `reader`, (6) also to `library`, (9) to `legacy-and-print`, (7) stays a P30 device check, and the rest stay with D36.

   **Amendments written into the contracts in place**, each marked "amended, accepted at P29.DECOMP2":
   - S1 *Legacy → native re-explain*: `md → native` is an ordinary next version.
   - S1 *Compatibility* MCP line: `format` gains `"native"`.
   - S2 *Format flag*: the old "Amendment to S1" text is replaced by a pointer.
   - S2 *Ingest, search and MCP*: marked accepted.
   - S2 *Quiz* saved-result payload: `doc` + `unit`.
   - S3 *Quiz results* and the S3 compatibility line: the amendment wording is replaced, not stacked.
   - S3 *Keys*: the stem + `unit`, not chapter identity.
   - S2 D36 (7): its pointer is re-aimed at the P30 device-check note.

   No decision was dropped.
4. **`## Notes for later slices` reworked.**
   - **Split into per-wave notes:** every note tagged for DECOMP2 (from DECOMP, S1, S2, S3) is now a note for S4, S5 or S6. Only what this slice consumed was removed:
     - "Operator Q1 and Q2 go to your planning gate";
     - the v60 facts that are now Decisions.
   - **"7 kinds" fixed to six.**
   - **The P30 device checks** moved to their own note, tagged for P30's DECOMP.
   - **The P30 note's "Amendment to S2" sub-bullet** was removed: the contract now carries it.
   - **The `origin/main` / stale-docs note** is re-tagged for S4.
   - **New S4 note:** the operator's words from rounds 01–06 (see below).
5. **`## Now`** rewritten.
6. Nothing was appended to `## Operator Questions` or `## Doc impact`. No `plan.md` was written, no state or `design-*` command was run beyond `new-slice`, and no product code was written.

## The rounds 01–06 extraction (detail; the curated list is in phase.md's S4 note)

All six `SIGNOFF.md` files were read in full, along with `handoff.md`, which was searched for operator attributions with the passages around each hit read. `03-foundation/bootstrap.md` was checked too.

- **Standing rules, verbatim: none.**
  - **SIGNOFFs:** rounds 03–06 are signed with the single word "done". Round 02's authorization is process plus one ink flag. Round 01's "operator's words" block is the design session's summary that the operator relayed.
  - **Handoffs:** their **Locked** lists ("calm editorial library", teal the only interactive accent, the three font families, warm paper never pure white/black, no emoji, the a11y floor) are orchestrator-written descriptions of the shipped system, not operator sentences. They reach `bar.md` and the drafter through the system sync, not as quoted rules.
  - **Nearest candidate:** `04-console-surfaces/handoff.md:57-58`, *"need mobile, tablet, and pc view upgrade"*. It is a P27 request, so it is listed under taste with a flag that promoting it to `bar.md` is the operator's call.
- **Taste words and references (verbatim):**
  - `04-console-surfaces/handoff.md:57-58` (2026-09-21);
  - `02-onboarding/SIGNOFF.md:7-9` (2026-07-22, the bronze kicker flag);
  - `01-landing/SIGNOFF.md:8-17` (2026-07-18, relayed summary: "calm editorial library (teal-only, warm paper/charcoal, Fraunces/Source Sans/JetBrains Mono); no new brand", "dark hero opening into light bands · type-led, illustration-only");
  - `06-document-views/SIGNOFF.md:35-36` (2026-09-21, "decide for me" on all ten questions).
- **Paraphrased only** (not quotable): `03-foundation/handoff.md:84,212`; `04-console-surfaces/handoff.md:170-171`; `05-graph/handoff.md:46-52,67-70`; `06-document-views/handoff.md:56-58`.
- **Not taste and not a rule:** `03-foundation/bootstrap.md:3-5` (2026-09-21) is a process instruction ("make knowledge design system on claude design"). It was omitted.

Taste questions: the operator approved with no text, so no taste answer is recorded. The S4 note says the three questions are still open for the orchestrator to ask at S4's opening.

## Validation output (abridged)

```
$ python3 scripts/workflow.py validate
warning: slice P22.S1 has unknown kind 'feature' ...           (pre-existing)
warning: slice P26.S1..S5 have unknown kind 'knowledge' ...     (pre-existing)
warning: consolidation_owed=P28 ...                             (pre-existing)
warning: stale_docs=api, backend, experience, frontend, product, qa, security ...
warning: oversized_doc_sections=11 ...
Workflow validation passed.

$ git status --porcelain
 M works/backlog.md
 M works/events.jsonl
 M works/index.json
 M works/phases/active/P29/phase.md
 M works/phases/active/P29/slices/P29.DECOMP2/slice.json
 M works/state.json
?? works/phases/active/P29/slices/P29.DECOMP2/plan.md
?? works/phases/active/P29/slices/P29.S4/
?? works/phases/active/P29/slices/P29.S5/
?? works/phases/active/P29/slices/P29.S6/
```

(`result.md` itself is added after this snapshot.)
