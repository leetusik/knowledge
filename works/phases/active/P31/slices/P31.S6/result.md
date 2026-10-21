# P31.S6 result: handoff note for the bootstrap

## Verdict

- status: done
- tier: mid
- model: sonnet
- effort: high
- summary: Wrote `works/phases/active/P31/handoff-explain.md` (119 lines), a cold-read index for the bootstrap agent: retire the old explain via P30's handoff and what P31 supersedes (pointer string, plugin minimum 0.5.0, one CHANGELOG), apply the package in the README's order, what a workspace gets, the minimums, and the rehearsal's lessons as one-line pointers. Pinned to bootstrap HEAD `f207775`; the bootstrap was only read.
- files_changed: `works/phases/active/P31/handoff-explain.md`, `works/phases/active/P31/phase.md` (Now, Notes for later slices), this file.
- validation: `python3 scripts/workflow.py validate` passed (only pre-existing warnings: P26.S5 kind, consolidation debt, stale docs). Path check: every file the note names exists in `package/` or P30. Bootstrap line numbers cited (all re-grepped at `f207775`): `WORKSPACE_VERSION` at `installer/main.py` line 48, smoke `"$nskill" -eq 18` at line 1752. Bootstrap `git status --short` empty and `rev-parse --short HEAD` = `f207775` before and after.
- deviations: none. The note names `PATCHES.md` sections 1c, 6, 9 to 14 and the package files by heading, not line.
- doc_impact: none

## Notes

- P30's handoff was pinned to `7517446`; re-grepping at `f207775` showed small drift (e.g. smoke line 1751 is now 1752, main.py lines 166, 1822, 1829 unchanged), so the note says to find P30's edits by quoted text.
- Plugin manifest is `0.5.0` and CLI `0.2.0` in this repo, matching the minimums stated.
- Contract stays 12,281 B and `do-next-slice` core 8,174 of 8,192 B (from `PATCHES.md`); the note repeats both as warnings.
- Notebook: `## Now` rewritten with REVIEW next; a `for REVIEW` note added (what the gate shows, OQ1 and OQ10 to route); the three consumed `for S6` notes removed. No new OQs.
