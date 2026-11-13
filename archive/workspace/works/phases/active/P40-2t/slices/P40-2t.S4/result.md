# P40-2t.S4 — result

## Verdict

- **status:** done
- **route:** mid
- **model:** opus
- **effort:** medium
- **summary:** Wrote `package/patches/engine.md`, seven Find/Becomes edits covering change-list D1–D3. `finish_slice` loses its explain exemption, and so does its comment. `cmd_parallel_plan` loses its explain note and early `return`. Test 10d's probe flips: an explain DECOMP over an undeclared chapter is refused, `parallel-plan` prints its rounds, and the finish passes once the chapter is declared. The whole patched suite passed on a rebuilt scratch copy of `fdb1151`: 504 PASS, 0 FAIL.
- **files_changed:** `works/phases/active/P40-2t/package/patches/engine.md` (new), `works/phases/active/P40-2t/slices/P40-2t.S4/result.md`
- **validation:**
  - every find is unique at `fdb1151`: a scratch script parsed the patch file and counted each find, 7 of 7 occur exactly once (PASS);
  - whole patched suite, with the root artifact rebuilt (`python3 installer/build.py`) in the scratch copy: `ALL RETROFIT SMOKE TESTS PASSED`, rc=0, 504 PASS (PASS);
  - control run, patch applied but the artifact **not** rebuilt: exactly 3 FAIL, the two DRIFT checks and the flipped probe (`explain refuse rc=0`). That shows the new probe discriminates: it fails on the old engine (expected);
  - scratch install probe: `parallel-plan` on an explain phase prints its rounds (PASS). Undeclared, it prints `parallel_plan=P4: DECOMP -> S1 -> S2 -> S3 -> REVIEW` and `undeclared=P4.S1, P4.S2, P4.S3`, with no `note:`. Declared (S1, S2 none; S3 on both), it prints `parallel_plan=P4: S1 + S2 -> S3 -> REVIEW`, and `next` prints `ready_slices=P4.S1,P4.S2`;
  - `deferred: whole-tree`: this repo's `validate` is the orchestrator's (no whole-tree check here).
- **deviations:** (1) The plan named `payload installer tests` for the archive. The suite also needs the root `bootstrap_agentic_workspace.sh`, which it installs from, so I archived the whole `fdb1151` tree (read-only, into the scratchpad) and rebuilt the artifact there. (2) Beyond D1–D3's two deletions, the patch also edits `cmd_parallel_plan`'s docstring clause ("and, for an explain phase, that it stays sequential") and Test 10d's lead comment ("An explain phase's chapters stay exempt."). Both would otherwise go stale.
- **doc_impact:** none written (wave). See `notebook`.
- **notebook:**
  - *Doc impact:* `- decisions.md: the engine no longer exempts an explain phase from v77's forced declaration; a book's DECOMP declares its chapters like any decomposition, and parallel-plan prints an explain phase's rounds (P40-2t.S4, shipped by the bootstrap release)`
  - *Notes for later slices:* `**(from P40-2t.S4, for P40-2t.S6)** package/patches/engine.md changes these smoke-suite literals. The Test 10d ok-line tail "and an explain phase is exempt (v77)" becomes "and an explain phase's DECOMP is held to it too (v77, v96)". The objective "explain exempt" becomes "explain declared". The bad-line "explain rc=" splits into "explain refuse rc=" and "explain pass rc=". These comments go: "explain chapters stay undeclared (explain-decomposition.md drops `--depends-on`)" and "An explain phase's chapters stay exempt.". The engine string "note: an explain phase's chapters stay undeclared and run one at a time" is gone. Keep or drop the P42 assert '"[--depends-on" not in' explain-decomposition.md against S3's text (a bare `--depends-on none` passes it). The release must rebuild the artifact.`
  - *Decisions:* `- Engine patch (S4): explain_phase() stays (explain_unit, parallel-start's detached host, the worktree hint, loop-init); only finish_slice's exemption and parallel-plan's note and early return go, see package/patches/engine.md`
  - *Operator Questions:* none.

## Detail

### What the patch edits (`package/patches/engine.md`)

`payload/scripts/workflow.py`:
- **1a**, L3874–L3876: drop the exemption sentence from the forced-declaration comment, and say what `explain_phase()` is still for.
- **1b**, L5781: `if decomposition and not explain_phase(pdir):` becomes `if decomposition:`.
- **1c**, L5692: drop the docstring clause.
- **1d**, L5702–L5705: drop the note and the early `return`.

`tests/retrofit_smoke.sh`:
- **2a**, L425–L426: drop the P42 comment.
- **2b**, L2707: update Test 10d's comment.
- **2c**, L2714–L2723: replace the probe. It now asserts all of these:
  - the explain DECOMP is refused (rc≠0, `undeclared: P4.S1`, DECOMP still `todo`);
  - `parallel-plan P4` prints `parallel_plan=P4: ` with no `note:` and no `undeclared=` once S1 is declared;
  - the finish then passes and prints the plan.

The patch also says the artifact must be rebuilt after applying. The version bump and changelog are left to S6's release.

### Callers of `explain_phase()` that keep it

These were checked at `fdb1151`:
- `explain_unit()` (L3888);
- `parallel-start`'s host-branch check (L6309);
- the worktree hint (L7176);
- `loop_init_problems` (L17247).

### Scratch locations (session scratchpad, throwaway)

- `p40-s4-full.tar`, the whole tree at `fdb1151`;
- `p40-s4g/`, patched and rebuilt, where the full suite ran (`smoke-g.log`);
- `p40-s4f/`, patched but not rebuilt (the control run, `smoke.log`);
- `probe2/`, the scratch install for the `parallel-plan` probe;
- `apply_patch.py`, the parser and uniqueness checker.

Nothing was written to the bootstrap repo, Note or arb_upbit_1.
