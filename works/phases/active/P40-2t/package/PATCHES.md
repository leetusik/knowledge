# P40-2t patch notes: the index

Every edit the bootstrap needs to a file it already has lives in one patch file under `patches/`, one per area.
Apply them **in this order**, after copying the three whole references (`README.md`, *The order to apply it*).
`checks/finds.py` and `checks/apply.py` read this list to find the patch files and their order, so a patch file
not listed here fails both checks.

**Pinned to bootstrap `fdb1151` (workspace v95).** Every find in every file occurs exactly once in its file at
that commit (`checks/finds.py`). Line numbers are hints; find each edit by its quoted text.

1. [`patches/create-phase.md`](patches/create-phase.md) — `payload/claude/skills/create-phase/SKILL.md`: the
   intro, *Who may invoke it*, *Procedure* steps 2 and 5 (1a–1d), and 1e, which replaces `## The explain route`
   to the end of the file with the package's two route texts. Change list B1–B11 (P40-2t.S2). 5 finds.
2. [`patches/workflow.md`](patches/workflow.md) — `wave.md` (an explain book's chapters at once, its two
   exceptions, resume), `decomposition.md`, the slice executor's decomposition bullet and explain carve-out, and
   the chain step in both `review.md` references. Change list C7–C10 (P40-2t.S3). 14 finds.
3. [`patches/engine.md`](patches/engine.md) — `payload/scripts/workflow.py` (the forced declaration holds an
   explain phase's `DECOMP` too; `parallel-plan` prints its rounds) and the smoke suite's P42 comment and
   Test 10d. Change list D1–D3 (P40-2t.S4). 7 finds.
4. [`patches/release.md`](patches/release.md) — the smoke suite's explain pins and the P42 pin,
   `README.en.md`'s Knowledge block, the seed operations doc, the installer's closing line, the
   `changelog.d/explain-research-chained.md` fragment, the release and the verification after applying.
   Change list E6 (P40-2t.S6). 7 finds and one new file.

Two files are edited by two patch files, never in the same place: `payload/claude/agents/slice-executor.md`
(only `patches/workflow.md`) and `tests/retrofit_smoke.sh` (`patches/engine.md` 2a–2c, then
`patches/release.md` 1a–1d).
