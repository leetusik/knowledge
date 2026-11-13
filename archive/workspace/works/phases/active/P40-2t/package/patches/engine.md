# P40-2t patch notes: the engine (change list D1–D3)

These notes are for the agent working in the bootstrap repo (`bootstrap_agentic_workspace.sh`). They edit two
files the bootstrap already has: `payload/scripts/workflow.py` and `tests/retrofit_smoke.sh`.

**Pinned to bootstrap `fdb1151` (workspace v95).** Line numbers are **hints**, read at that commit before any
edit. Find each edit by its quoted text, which occurs **exactly once** in its file at `fdb1151` (checked by
script: P40-2t.S4's `result.md`). Within one file, apply bottom-up or by quoted text.

**The quoting form.** Each edit gives `**Find** in <file>` with the exact text in a ` ```text ` block, then
`**Becomes:**` with the whole replacement in a second ` ```text ` block. The find is replaced by the
replacement, nothing else.

## 0. What changes, in one paragraph

A book's `DECOMP` now declares its chapters (`--depends-on none`, a synthesis chapter on the chapters it draws
on), so the chapters run as a wave after the outline gate. The engine drops the one exemption that kept an
explain phase sequential: `finish-slice` on an explain phase's decomposition is refused over an undeclared
middle slice like every other decomposition (v77's forced declaration), and `parallel-plan` prints an explain
phase's rounds and its undeclared check like any phase's, without its "stay undeclared" note and early
`return`. `explain_phase()` **stays**: `explain_unit()`, `parallel-start`'s detached host worktree (v86), the
worktree hint and `loop-init`'s refusal still call it. `new-slice --depends-on`, `set-slice-deps`, `next`'s `ready_slices=` and `start-slice`
have no explain check, so they need no edit. The smoke suite's Test 10d probe flips with it. The guard only
gets stricter: no phase that passed before is let through now.

**Rebuild after applying.** `workflow.py` is under `payload/`, so the root artifact must be reassembled
(`python3 installer/build.py`) before the suite runs: the suite installs from `bootstrap_agentic_workspace.sh`,
and its `build.py --check` fails on a stale artifact. The version bump and changelog entry are the release's
(`patches/release.md`), not this file's.

## 1. `payload/scripts/workflow.py`

**1a. The forced-declaration comment drops the explain exemption (D1).**

**Find** in `payload/scripts/workflow.py` (L3874–L3876, the comment above `def explain_phase`):

```text
# not the decomposition's prose, then determines what may run together (parallel_plan). An explain phase
# (`## Explain` in intent.md) is exempt: its chapters stay undeclared by design, as fix slices do. set-slice-deps
# declares a slice that was cut without the flag.
```

**Becomes:**

```text
# not the decomposition's prose, then determines what may run together (parallel_plan). A fix slice stays
# undeclared by design (undeclared_middle_slices); an explain phase's DECOMP declares its chapters like any
# decomposition. set-slice-deps declares a slice that was cut without the flag. explain_phase() marks the
# explain route for its detached host worktree (v86).
```

- **Why:** the exemption is gone (1b); the comment would otherwise still promise it. `explain_phase()` is kept
  for its other callers (`explain_unit()`, `parallel-start`'s host-branch check, the worktree hint,
  `loop_init_problems`), so the comment now says what it is for.

**1b. `finish_slice` forces the declaration on every decomposition (D1).**

**Find** in `payload/scripts/workflow.py` (L5781, in `finish_slice`):

```text
    if decomposition and not explain_phase(pdir):  # v77: the cut decides parallelism, never the default
```

**Becomes:**

```text
    if decomposition:  # v77: the cut decides parallelism, never the default
```

- **Why:** a book's `DECOMP` declares its chapters like any decomposition; an undeclared chapter now refuses
  the finish, with the same message and nothing written.

**1c. `parallel-plan`'s docstring (D2).**

**Find** in `payload/scripts/workflow.py` (L5692, the docstring of `cmd_parallel_plan`):

```text
    middle slices a decomposition must still declare, and, for an explain phase, that it stays sequential.
```

**Becomes:**

```text
    middle slices a decomposition must still declare.
```

**1d. `parallel-plan` drops the explain note and its early `return` (D2).**

**Find** in `payload/scripts/workflow.py` (L5702–L5705, in `cmd_parallel_plan`):

```text
    if explain_phase(pdir):
        print("note: an explain phase's chapters stay undeclared and run one at a time")
        return
    loose = undeclared_middle_slices(phase)
```

**Becomes:**

```text
    loose = undeclared_middle_slices(phase)
```

- **Why:** an explain phase's chapters are declared and run as a wave; `parallel-plan` prints its rounds and
  its `undeclared=` line like any phase's.

## 2. `tests/retrofit_smoke.sh`

**2a. The P42 block's comment (D3).**

**Find** in `tests/retrofit_smoke.sh` (L425–L426, the comment above `_wave_rel`):

```text
# exact path and a handful of whole strings; the DECOMP rules that make a slice independent live in
# decomposition.md, and explain chapters stay undeclared (explain-decomposition.md drops `--depends-on`).
```

**Becomes:**

```text
# exact path and a handful of whole strings; the DECOMP rules that make a slice independent live in
# decomposition.md.
```

- **Note:** only the comment changes here. The assertion two blocks below it (L440–L441: `"[--depends-on" not
  in` each shipped `explain-decomposition.md`) is the release's (S6's `patches/release.md`) to keep or drop
  against S3's rewritten `explain-decomposition.md`: it forbids only the bracketed optional form, so a
  literal `--depends-on none` passes it.

**2b. Test 10d's comment (D3).**

**Find** in `tests/retrofit_smoke.sh` (L2707):

```text
# one, and finish-slice then prints the engine's parallel plan. An explain phase's chapters stay exempt.
```

**Becomes:**

```text
# one, and finish-slice then prints the engine's parallel plan. An explain phase's DECOMP is held to it too.
```

**2c. Test 10d's probe flips (D3).**

**Find** in `tests/retrofit_smoke.sh` (L2714–L2723, the end of Test 10d):

```text
{ rs new-phase --phase P4 --name "Explain probe" --objective "explain exempt" && printf '\n## Explain\n\n- subject: P3\n' >> "$SW/works/phases/active/P4/intent.md" \
  && rs new-slice --phase P4 --slice P4.S1 --name chapter; } >/dev/null 2>&1 || bad "forced-declaration probe: explain setup failed"
rs finish-slice P4.DECOMP --outcome cut >/dev/null 2>&1; fe_rc=$?
[ "$fr_rc" -ne 0 ] && printf '%s\n' "$fr" | grep -q 'undeclared: P3.S1' && printf '%s\n' "$fr" | grep -q 'set-slice-deps' \
  && [ "$fr_todo" -eq 1 ] \
  && [ "$fp_rc" -eq 0 ] && printf '%s\n' "$fp" | grep -qx 'parallel_plan=P3: S1 + S2 -> S3 -> REVIEW' \
  && printf '%s\n' "$fp" | grep -q '^parallel_rounds=3 rounds for 4 open slices; 2 run beside another' && [ "$fe_rc" -eq 0 ] \
  && ok "a decomposition refuses to finish over an undeclared middle slice (nothing written), set-slice-deps declares it, finish-slice prints the engine's parallel plan, and an explain phase is exempt (v77)" \
  || bad "forced declaration wrong (refuse rc=$fr_rc, pass rc=$fp_rc, explain rc=$fe_rc) -- $fr / $fp"
```

**Becomes:**

```text
{ rs new-phase --phase P4 --name "Explain probe" --objective "explain declared" && printf '\n## Explain\n\n- subject: P3\n' >> "$SW/works/phases/active/P4/intent.md" \
  && rs new-slice --phase P4 --slice P4.S1 --name chapter; } >/dev/null 2>&1 || bad "forced-declaration probe: explain setup failed"
fe=$(rs finish-slice P4.DECOMP --outcome cut 2>&1); fe_rc=$?; fe_todo=$(grep -c '"status": "todo"' "$SW/works/phases/active/P4/slices/P4.DECOMP/slice.json")
rs set-slice-deps P4.S1 --depends-on none >/dev/null 2>&1 || bad "forced-declaration probe: declaring the chapter failed"
ep=$(rs parallel-plan P4 2>&1); fd=$(rs finish-slice P4.DECOMP --outcome cut 2>&1); fd_rc=$?
[ "$fr_rc" -ne 0 ] && printf '%s\n' "$fr" | grep -q 'undeclared: P3.S1' && printf '%s\n' "$fr" | grep -q 'set-slice-deps' \
  && [ "$fr_todo" -eq 1 ] \
  && [ "$fp_rc" -eq 0 ] && printf '%s\n' "$fp" | grep -qx 'parallel_plan=P3: S1 + S2 -> S3 -> REVIEW' \
  && printf '%s\n' "$fp" | grep -q '^parallel_rounds=3 rounds for 4 open slices; 2 run beside another' \
  && [ "$fe_rc" -ne 0 ] && printf '%s\n' "$fe" | grep -q 'undeclared: P4.S1' && [ "$fe_todo" -eq 1 ] \
  && printf '%s\n' "$ep" | grep -q '^parallel_plan=P4: ' && ! printf '%s\n' "$ep" | grep -q -e '^note: ' -e '^undeclared=' \
  && [ "$fd_rc" -eq 0 ] && printf '%s\n' "$fd" | grep -q '^parallel_plan=P4: ' \
  && ok "a decomposition refuses to finish over an undeclared middle slice (nothing written), set-slice-deps declares it, finish-slice prints the engine's parallel plan, and an explain phase's DECOMP is held to it too (v77, v96)" \
  || bad "forced declaration wrong (refuse rc=$fr_rc, pass rc=$fp_rc, explain refuse rc=$fe_rc, explain pass rc=$fd_rc) -- $fr / $fp / $fe / $ep / $fd"
```

- **Why:** the probe proved the exemption; it now proves its removal on the same fixture. An explain phase
  (`## Explain` in `intent.md`) whose `DECOMP` leaves a chapter undeclared is refused, nothing written (the
  `DECOMP` stays `todo`); `parallel-plan` then prints its rounds with neither the old `note:` nor an
  `undeclared=` line; and the finish passes once `set-slice-deps` declares the chapter.
- **Smoke-suite literals this edit removes or changes:** the `ok` line's tail "and an explain phase is exempt
  (v77)" (now "and an explain phase's DECOMP is held to it too (v77, v96)"); the probe objective "explain
  exempt" (now "explain declared"); the comment "explain chapters stay undeclared (explain-decomposition.md
  drops `--depends-on`)" and "An explain phase's chapters stay exempt."; the `bad` line's "explain rc=". The
  engine string the old probe never grepped but `parallel-plan` printed, "note: an explain phase's chapters
  stay undeclared and run one at a time", is gone from `workflow.py`; nothing else in the suite pins it.
