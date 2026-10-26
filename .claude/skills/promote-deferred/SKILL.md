---
name: promote-deferred
description: Promote a deferred job into an active phase or slice.
allowed-tools: Bash(python3 scripts/workflow.py:*)
disable-model-invocation: true
---

# promote-deferred

Run `python3 scripts/workflow.py promote-deferred $ARGUMENTS` (for example `m3xa --phase 7kq2 --slice P-7kq2.S2 --name "..."`; add `--create-phase --phase-name "..." --phase-objective "..."` to start a new phase, leaving out `--phase` so the engine mints its id, and name the slice by its bare suffix, `--slice S1`).

The job and the phase take any brief form: `m3xa`, `D-m3xa`, `12` or `D12`; `7kq2`, `P-7kq2`, `12` or `P12`. `--slice` is the full new slice id (`P-7kq2.S2`) or its bare suffix (`S2`); in a phase being minted only the suffix can name it.

This moves the job from `works/deferred/open/` to `works/deferred/promoted/`, creates a slice folder, and carries the deferred context into the slice brief.
