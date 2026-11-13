# P32.S10 result: the handoff for the bootstrap

- **status:** done
- **tier:** mid
- **model:** sonnet
- **effort:** high
- **summary:** Wrote `works/phases/active/P32/handoff.md` (13,905 B, nine sections in the plan's order), a cold-read index pinned to bootstrap `1f4aa7d` (v73) and re-counted at `97e1c38` (v74). It points into `package/README.md`, `package/PATCHES.md` and `rehearsal/r2/` for the detail and copies none of it. Notebook updated: three S10 notes removed, the REVIEW note updated (OQ11 answered, d69), `## Now` rewritten.
- **files_changed:**
  - `works/phases/active/P32/handoff.md` (new)
  - `works/phases/active/P32/phase.md` (`## Notes for later slices`, `## Now`)
  - `works/phases/active/P32/slices/P32.S10/result.md` (this file)
- **validation:**
  - every path the handoff names exists (`ls` over the package files, `rehearsal/r2/spend.md`, `rehearsal/r1b/scorecard.md`, `topics/*`, `plugin/agents/explain-critic.md`, `plugin/README.md`): PASS
  - every skill section it cites exists in `plugin/skills/explain/SKILL.md` (§3.2, §3.5, §3.9, §3.10, §4, §4.10, §9.2, B5, B11) and in `plugin/README.md` (*Explain: permissions and the search cap*): PASS
  - every PATCHES entry it names exists (1a to 1c, 2, 3, 4a to 4d, 5a, 5b, 6a to 6f, 7a to 7c, 8, 9, 10): PASS
  - pin, counts and costs match `package/README.md`, `PATCHES.md` and `rehearsal/r2/spend.md` (83 + 13 a chapter, ≈ 160; $51.07; ≈ $50 to $58 a chapter; ≈ $350 to $400; `97e1c38` v74, `RETIRED_FILES` 73/74): PASS
  - `python3 scripts/workflow.py validate`: passed (warnings only, other phases' debt)
  - `git status`: only `works/phases/active/P32/` is mine (`handoff.md`, `phase.md`, this folder); `works/{backlog.md,events.jsonl,index.json,state.json}` and `slice.json`/`plan.md` are the orchestrator's. No command ran in the bootstrap repo. PASS
- **deviations:**
  1. **Length:** 13.9 KB against the plan's ≈ 8 to 10 KB model. The plan's nine sections, each with its numbers and pointers, did not fit tighter without dropping a required item; P31's handoff was shorter because it had fewer topics. Not trimmed further.
  2. **Cost at `create-phase` step 2 (the plan asked me to check):** `package/claude/skills/create-phase/explain-route.md` (line 18) says a book "costs several one-shot runs" and names the search cap, in words, and gives **no dollar figure**. The README's "tells the operator the order of magnitude" is the same thing in prose. The handoff says exactly this (section 5) and leaves dollars to the bootstrap's side; no package edit. Also recorded in `## Now` and a REVIEW note.
  3. **Files that differed:** the README's minimum line ("P32's tests ran on 2.1.283 and later" plus "auto mode the interactive default") and DECOMP2's note ("Claude Code with auto mode by default, 2.1.283") run two facts together. `topics/hosts-and-delivery.md` §4.3 and H6 show **2.1.283 is when interactive auto mode became the default**; the README shows **2.1.309 is where depth 2 ran**. No file establishes a depth-2 floor. The handoff states both and claims no other minimum, as the plan said. No other number differed: the README's $/search figures, `spend.md` and the S9 verdict agree.
  4. **PATCHES numbering:** the plan wrote "PATCHES 8-9" for the fragment and release rule; the file agrees (8 = fragment, 9 = release rule, 10 = verification). The README's own step list says "7a-7c" for the smoke suite, which matches.
- **doc_impact:** none. The handoff states no durable truth the earlier `## Doc impact` lines (S8, S9) do not already carry.

## The handoff's sections

| # | Section | Points into |
|---|---|---|
| 1 | What this does | README's lead |
| 2 | Before you apply (plugin 0.6.0 first; the pin and re-count rule) | README, PATCHES top |
| 3 | Apply, in this order (8 steps, the release rule, `RETIRED_FILES` and the update step, no P42/P40 order) | README *The order*; PATCHES 1 to 10 |
| 4 | The minimums (plugin 0.6.0, bootstrap v73, CLI/server, Claude Code as two facts) | README *The minimums*; hosts §4.3 |
| 5 | Permissions, the search cap, the cost | README *Permissions*, *The search cap*, *The cost*; `rehearsal/r2/spend.md` |
| 6 | What a workspace gets afterwards (folders, sequential chapters, background vs foreground critic) | README *Waves*, *Known limits*; PATCHES 3 |
| 7 | What the rehearsals taught (S7/F1 and S9, one line each with where it lives) | skill §3.2, §3.5, §3.9, §3.10, §4, §4.10, §9.2, B5, B11; `r1b/scorecard.md`; build-decisions d62 to d68 |
| 8 | Left for the first real book | README *What the rehearsal checks* |
| 9 | Out of scope, known gaps (minted ids in the plugin's §1; the 3.7k outline-gate report; a pre-release explain phase) | README *Known limits*; PATCHES 6d |

## Notebook edits

`## Notes for later slices`: removed the three S10 entries (from S8, DECOMP2, S9); the REVIEW note now says OQ11 is answered (d69), the review reads the freeze from S9's working-tree check, and `handoff.md` joins the boundary; added one S10 note for the REVIEW. `## Now` rewritten. `## Decisions`, `## Operator Questions` and `## Doc impact` untouched (OQ11 was already resolved by the orchestrator).

## Orchestrator's check

The handoff's section 5 said a chapter measured "≈ $45 up to its critique"; `rehearsal/r2/spend.md` says ≈ $48.3
(executor 27.81, critic 7.43, depth 2 11.11, orchestrator 1.67, searches ≈ 0.3), with the revision's $5–10
estimated. Corrected in `handoff.md` by the orchestrator. The rest of the numbers and every PATCHES section cited
(0–10) checked against the files.
