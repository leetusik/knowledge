# P29.DECOMP — result

- **status:** done
- **tier:** high
- **model:** opus
- **effort:** high
- **summary:** Cut P29 into three findings-only research slices (S1 book and chapter model, S2 native chapter format and legacy path, S3 reader state and spaced-repetition review) and a `P29.DECOMP2` design re-cut, as bare folders in order 10/20/30/40. The breakdown, the provisional build inventory, the decisions, the deferred-job routing and the verified per-reader notes are recorded in `phase.md`. D27 finding: P28 left no unsettled cross-round drift, so D27 can close as "no sweep".
- **files_changed:**
  - `works/phases/active/P29/phase.md` (new `## Slice breakdown and build inventory` section, plus `## Decisions`, `## Notes for later slices` and `## Now`)
  - `works/phases/active/P29/slices/P29.S1/slice.json`, `P29.S2/slice.json`, `P29.S3/slice.json`, `P29.DECOMP2/slice.json` (created by `new-slice`)
  - this file
  - the engine regenerated `works/backlog.md`, `works/index.json`, `works/events.jsonl` and `works/state.json` as part of `new-slice`
- **validation:** `python3 scripts/workflow.py validate`: passed, with pre-existing warnings only (legacy slice kinds in P22/P26, P28's consolidation debt, stale docs, oversized doc sections). The four new slices appear in the generated `## Slices` table in order: DECOMP, S1, S2, S3, DECOMP2, REVIEW.
- **deviations:** none. The code gave no reason to change the planned cut.
- **doc_impact:** none. A decomposition slice changes no durable truth.
- **D27 finding:** no unsettled cross-round drift. Details are below.

---

## Commands

- `new-slice --phase P29 --slice P29.S1 --name "Research: book and chapter model" --kind research --risk high --order 10`
- `new-slice … P29.S2 "Research: native chapter format and legacy path" --kind research --risk high --order 20 --depends-on P29.S1`
- `new-slice … P29.S3 "Research: reader state and spaced-repetition review" --kind research --risk high --order 30 --depends-on P29.S2`
- `new-slice … P29.DECOMP2 "Re-cut: design waves from the research findings" --kind decomposition --risk high --order 40 --depends-on P29.S3`
- My first attempt put the command in a shell variable. zsh does not word-split variables, so it failed before running and created nothing. I re-ran each command written out in full.

No folder has a `plan.md`.

## Facts verified before recording them as notes

Each "Notes for later slices" entry in `phase.md` was checked on 2026-10-18:

- **Branches:** after `git fetch origin`, `git rev-list --left-right --count main...origin/main` gives `14 11`. Local `main` has no `docs/<project>/` library at all; `docs/glide-ilab/` is absent.
- **The library on `origin/main`:** 42 documents under `docs/<project>/`, not counting each project's `index.md` or the site pages `docs/graph.md`, `README.md` and `tags.md`.
  - By project: changple5 20, glide-ilab 7, knowledge 5, vocky 4, arb_upbit_1 3, and one each in Mijual, bootstrap_agentic_workspace.sh and base.
  - Exactly one is markdown, in `base`.
  - The 41 HTML files total 2,980,119 B, about 72.7 KB each.
  - None of the 41 contains `<img>`.
  - The metadata header is `<!--kb … -->`, for example glide-ilab's p9.
  - The past-version archive is `docs/.versions/<project>/<slug>/vNNNN.*`.
- **Server and MCP files:** every file the plan names exists, and `publish.py` is at `server/publish.py`.
  - `_citation_url` is in `mcp-server/src/knowledge_mcp/server.py` and returns `""`.
  - Non-tenant-#1 writes go under the gitignored `tenants/` tree and are never committed (`server/main.py` around L845).
  - A grep of `server/` for series, collection, attachment and upload found only unrelated "zero-filled series" hits in the usage code.
- **Skill copies:** `plugin/skills/explain/SKILL.md` and `web/public/SKILL.md` are byte-identical (`cmp`).
  - `.claude/skills/explain/SKILL.md` is the only copy that mentions the `general` mode.
  - `.agents/skills/explain/SKILL.md` is missing, but `scripts/skills_parity.py:34` sets `PORTABLE` to that path.
- **Reader code:** all the files named exist, at the paths recorded in the S2 note.
- **Stale docs:** `workflow.py docs` lists api, backend, experience, frontend, product, qa and security as stale. In P28's `phase.md`, `## Doc impact` runs from L608 to L838.

## D27 finding (cross-round drift left by P28)

The question was whether P28 left any cross-round drift unsettled. **It did not.** Evidence:

- **The signed stylesheets match.** The first P28 review (`git show 41b569e:…/P28.REVIEW/result.md`, "Two record-fidelity checks") found all five round stylesheets byte-identical to their signed records under `web/design/rounds/*/output/*.css`.
- **The three `kb-record-fixes.css` corrections repeat values the records already state.** They are the iOS 16px input, the print-only blocks and the dock tag switch. The review judged that none of them invents a value.
  - Only one crosses records: the dock switch restates P22's `graph.css` at a selector inside round 05's dock.
  - Even there, only the placement was a judgment call; its values are copied verbatim.
- **The one prose disagreement between rounds is a ruling, not drift.** Round 04 §9 item 4 says every tap target meets 44px, but round 03 §3's `--sm` controls are 38px. P28 settled it as "stylesheets win" (`P28/phase.md` around L340). The open ruling is D36 (1), which belongs to the operator's console walk, not to a sweep round.
- **Neither later review found drift.** Re-review #1 (`640eb15`) and re-review #2 (the current `result.md`) report no cross-round drift. The "drift" hits in #2 refer to Prettier formatting drift.
- **The redesign makes a sweep moot.** P29 redesigns the reader-first surfaces on drafter, so a round 07 consistency sweep over rounds 01–06 would mostly cover surfaces this pair replaces.

**So D27's trigger did not fire, and the orchestrator can close it as "no sweep".** The remaining items are operator rulings already filed in D36, items (1) and (2).

## Where the outputs live

These are in `works/phases/active/P29/phase.md`, not repeated here:

- `## Slice breakdown and build inventory`: the cut table, what each slice settles, and the provisional build inventory
- `## Decisions`: research first with a DECOMP2 re-cut; drafter and the record location (with `web/design/` read-only); the gate waived by the orchestrator; the deferred-job routing
- `## Notes for later slices`: verified notes tagged for S1, S2, S3 and DECOMP2
- `## Now`: the cut, and where S1 starts

No operator questions were raised.
